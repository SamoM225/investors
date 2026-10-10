// Lacné predtriedenie subjektov z data/na_vyskum.csv pred plným výskumom (2026-10-10, schválené používateľom).
// Plný výskum iba pre subjekty podobné VC. Ostatné sa rozhodnú zo zdrojov úrovne A s príznakom `predtriedenie`.
// Zdroje (A): RPO (vlastníci subjektu; vznik, činnosť, základné imanie a vklady cieľových firiem), ORSR (data/orsr_podiely.csv),
//   register NBS (subjekty.nbs.sk/api/json, stav 2026-10-08, kópia v .cache/nbs/).
// Pravidlá (plan.md 1.1: registrácia v NBS je iba bonus, korporátne VC je podtyp VC; 1.0: osobný holding je vehicle osoby):
//   plny_vyskum  – NBS: registrovaný fond alebo správca AIF, alebo aspoň jeden podiel v okne je menšinový (< 50 %)
//                  v mladej firme (≤ 5 rokov pri vstupe) mimo činností, ktoré VC nefinancuje (nehnuteľnosti, stavebníctvo,
//                  ambulancie, doprava, obchod, ubytovanie, energetika, poľnohospodárstvo),
//                  alebo iba rast podielov v RÚZ a vlastníkom je právnická osoba (možné korporátne VC),
//   vyradeny_typ (G3) – všetky podiely v okne sú väčšinové alebo vo firmách mimo VC => holding vlastných prevádzok / iné,
//   mimo_rozsahu (G2) – iba rast podielov v RÚZ, subjekt nie je v NBS a vlastnia ho iba fyzické osoby => osobný holding
//                  (vehicle osoby pre typy angel a súkromný investor; pilot spracúva iba VC).
// Výstup: data/predtriedenie.csv; vyradení sa presunú z data/na_vyskum.csv do data/vyradene.csv.
// Mená fyzických osôb sa neukladajú, iba ich počet.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ROOT, readCsv, writeCsv } = require('./lib');

const UA = 'investor-research research@example.org';
const CACHE = path.join(ROOT, '.cache/http');
fs.mkdirSync(CACHE, { recursive: true });
const NON_VC = /^(01|02|03|10|11|35|41|42|43|45|46|47|49|50|51|52|55|56|68|77|81|86|87|88|93|96)/;
const NON_VC_TEXT = 'nehnuteľnosti, stavebníctvo, zdravotné ambulancie a sociálna starostlivosť, doprava, obchod, ubytovanie a stravovanie, energetika, poľnohospodárstvo, potraviny, prenájom, služby';

let last = 0;
async function getJson(url) {
  const f = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex'));
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let i = 0; i < 4; i++) {
    const wait = last + 300 - Date.now(); last = Math.max(Date.now(), last + 300);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const t = await r.text(); fs.writeFileSync(f, t); return JSON.parse(t);
    } catch (e) { if (i === 3) throw e; await new Promise(r => setTimeout(r, 3000 * (i + 1))); }
  }
}
const RPO = 'https://api.statistics.sk/rpo/v1/';
async function rpo(ico) {
  const s = await getJson(`${RPO}search?identifier=${ico}`);
  const id = (s.results || [])[0]?.id;
  if (!id) return null;
  return { url: `${RPO}entity/${id}?showHistoricalData=true`, e: await getJson(`${RPO}entity/${id}?showHistoricalData=true`) };
}
const at = (arr, date) => (arr || []).filter(x => (!x.validFrom || x.validFrom <= date) && (!x.validTo || x.validTo >= date));
const years = (a, b) => (new Date(b) - new Date(a)) / (365.25 * 864e5);

const nbs = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, '.cache/nbs/subjekty-nbs-sk.json'), 'utf8')).institutions.map(i => [i.id, i]));
const scopes = l => (l || []).flatMap(x => [x.scope].concat(scopes(x.licenses)));

(async () => {
  const queue = readCsv('data/na_vyskum.csv');
  const hold = readCsv('data/orsr_podiely.csv');
  const out = [];
  for (const r of queue) {
    const nb = [...new Set(scopes((nbs[r.ico] || {}).licenses))].filter(s => /alternatívn|investičn\w* fond|správc/i.test(s) && !/agent/i.test(s));
    const subj = await rpo(r.ico);
    const today = new Date().toISOString().slice(0, 10);
    const owners = subj ? at(subj.e.stakeholders, today) : [];
    const ownFO = owners.filter(o => o.personName).length, ownPO = owners.filter(o => !o.personName).length;
    const win = hold.filter(h => h.investor_ico === r.ico && +h.vlastna_dcera !== 1 && (+h.vstup_v_okne === 1 || h.navysenie_vkladu_v_okne));
    const targets = [];
    for (const h of win) {
      const t = await rpo(h.ciel_ico);
      const d = h.navysenie_vkladu_v_okne && h.navysenie_vkladu_v_okne > h.od ? h.navysenie_vkladu_v_okne : h.od;
      if (!t) { targets.push({ ico: h.ciel_ico, nazov: h.ciel_nazov, datum: d, chyba: 'nenájdené v RPO' }); continue; }
      const e = t.e;
      const eq = at(e.equities, d).map(x => x.value)[0] || (e.equities || []).map(x => x.value).pop() || 0;
      const dep = at(e.deposits, d).filter(x => x.fullName && (x.identifier === r.ico || x.fullName.replace(/\W/g, '').toLowerCase().startsWith(r.nazov.replace(/\W/g, '').toLowerCase().slice(0, 10))))
        .reduce((a, x) => a + (+x.amount || 0), 0) || +h.vklad_eur || 0;
      const podiel = eq ? dep / eq : null;
      const nace = e.statisticalCodes?.mainActivity?.code || '';
      const vek = e.establishment ? years(e.establishment, d) : null;
      const vc = podiel !== null && podiel < 0.5 && vek !== null && vek <= 5 && !NON_VC.test(nace);
      targets.push({ ico: h.ciel_ico, nazov: h.ciel_nazov, datum: d, nace: `${nace} ${e.statisticalCodes?.mainActivity?.value || ''}`.trim(),
        vek_pri_vstupe: vek === null ? '' : vek.toFixed(1), podiel: podiel === null ? '' : (100 * podiel).toFixed(1) + ' %', vc_podobny: vc, url: t.url });
    }
    let rozhodnutie, dovod, kategoria = '';
    const vcT = targets.filter(t => t.vc_podobny);
    if (nb.length) { rozhodnutie = 'plny_vyskum'; dovod = `NBS: ${nb.join(', ')}`; }
    else if (vcT.length) { rozhodnutie = 'plny_vyskum'; dovod = `menšinový podiel v mladej firme v okne: ${vcT.map(t => `${t.nazov} (${t.podiel}, ${t.vek_pri_vstupe} r., NACE ${t.nace.split(' ')[0]})`).join('; ')}`; }
    else if (targets.length) {
      const maj = targets.filter(t => t.podiel && parseFloat(t.podiel) >= 50);
      rozhodnutie = 'vyradeny_typ';
      kategoria = maj.length === targets.length ? 'holding vlastných prevádzok' : 'iné: podiely mimo VC (zrelé firmy alebo činnosti mimo VC)';
      dovod = `predtriedenie: podiely v okne nie sú VC (menšinový podiel v mladej firme mimo ${NON_VC_TEXT}): ` +
        targets.map(t => `${t.nazov} (podiel ${t.podiel || '?'}, vek ${t.vek_pri_vstupe || '?'} r., NACE ${t.nace || '?'})`).join('; ');
    } else if (ownPO > 0) { rozhodnutie = 'plny_vyskum'; dovod = `iba rast podielov v RÚZ; vlastník je právnická osoba (${ownPO}), možné korporátne VC`; }
    else if (ownFO > 0) {
      rozhodnutie = 'mimo_rozsahu'; kategoria = 'osobný holding fyzickej osoby (vehicle pre typ angel alebo súkromný investor)';
      dovod = `predtriedenie: iba rast podielov v RÚZ (${r.dovod.replace(/^RÚZ: /, '').split(';')[0]}), subjekt nie je v NBS, vlastníci iba fyzické osoby (${ownFO}); pilot spracúva iba VC`;
    } else { rozhodnutie = 'plny_vyskum'; dovod = 'iba rast podielov v RÚZ; vlastníci v RPO neuvedení (a. s.)'; }
    out.push({ ico: r.ico, nazov: r.nazov, dovod_navratu: r.kategoria, nbs: nb.join('; '), vlastnici_FO: ownFO, vlastnici_PO: ownPO,
      podiely_v_okne: JSON.stringify(targets), rozhodnutie, kategoria, dovod, rpo_url: subj ? subj.url : '' });
    process.stderr.write('.');
  }
  writeCsv('data/predtriedenie.csv', ['ico', 'nazov', 'dovod_navratu', 'nbs', 'vlastnici_FO', 'vlastnici_PO', 'rozhodnutie', 'kategoria', 'dovod', 'podiely_v_okne', 'rpo_url'], out);

  // presun rozhodnutých do vyradene.csv
  const byIco = Object.fromEntries(out.map(o => [o.ico, o]));
  const stay = [], moved = [];
  for (const r of queue) {
    const o = byIco[r.ico];
    if (o.rozhodnutie === 'plny_vyskum') { stay.push(r); continue; }
    const t = JSON.parse(o.podiely_v_okne)[0];
    moved.push({ ...r, status: o.rozhodnutie, brana: o.rozhodnutie === 'vyradeny_typ' ? 'G3' : 'G2', kategoria: o.kategoria, dovod: o.dovod,
      sila_negativneho_dokazu: '', poznamka: 'predtriedenie (bez plného výskumu a Overovateľa), scripts/pretriage.js',
      dokaz_url: t ? t.url : o.rpo_url, dokaz: t ? `${t.nazov}: podiel ${t.podiel}, vek ${t.vek_pri_vstupe} r., NACE ${t.nace}` : `vlastníci FO: ${o.vlastnici_FO}, PO: ${o.vlastnici_PO}`,
      sposob_spracovania: 'predtriedenie' });
  }
  const H = Object.keys(readCsv('data/vyradene.csv')[0]);
  const vyr = readCsv('data/vyradene.csv').filter(v => !byIco[v.ico]).concat(moved);
  writeCsv('data/vyradene.csv', H, vyr.sort((a, b) => (a.status + a.nazov).localeCompare(b.status + b.nazov, 'sk')));
  writeCsv('data/na_vyskum.csv', H, stay);
  const key = readCsv('data/review_key.csv'); let ch = 0;
  for (const k of key) if (byIco[k.ico] && byIco[k.ico].rozhodnutie !== 'plny_vyskum' && k.agent_status === 'na_vyskum') { k.agent_status = byIco[k.ico].rozhodnutie; ch++; }
  if (key.length) writeCsv('data/review_key.csv', Object.keys(key[0]), key);
  const c = out.reduce((a, o) => (a[`${o.dovod_navratu} -> ${o.rozhodnutie}`] = (a[`${o.dovod_navratu} -> ${o.rozhodnutie}`] || 0) + 1, a), {});
  console.log('\n' + JSON.stringify({ spolu: out.length, plny_vyskum: stay.length, presunute: moved.length, review_key: ch, c }, null, 1));
})();
