// Klasifikátor: rozhodovacia matica G1–G5 nad POTVRDENÝMI tvrdeniami (pilot, VC v SR).
// Vstupy: data/registrar_decisions.csv (G1, G2), data/claims.csv, logs/usage.csv (časy).
// Výstupy: data/decisions.csv, data/investors.json
// Režim --merge <subor>: spracuje iba subjekty zo zadaného súboru registrátora (napr. data/registrar_navrat.csv)
// a výsledky zlúči do existujúcich výstupov (nahradí riadky s rovnakým IČO). Používa sa po očistení dát.
const fs = require('fs');
const path = require('path');
const { ROOT, readCsv, writeCsv, inWindow } = require('./lib');

const mergeArg = process.argv.indexOf('--merge');
const mergeFile = mergeArg > 0 ? process.argv[mergeArg + 1] : '';
const claims = readCsv('data/claims.csv');
const registrar = readCsv(mergeFile || 'data/registrar_decisions.csv');
// G4 s negatívnym dôkazom: ORSR (spätné vyhľadávanie) a RÚZ zo scripts/footprint.js
const { decideG4 } = require('./g4_rules');
const footprint = Object.fromEntries(readCsv('data/footprint.csv').map(f => [f.ico, f]));
const holdings = {};
readCsv('data/orsr_podiely.csv').forEach(h => (holdings[h.investor_ico] ||= []).push(h));
const g4 = (ico, investedEver, lastInvestment) => decideG4({ fp: footprint[ico], holdings: holdings[ico] || [], investedEver, lastInvestment });
const usage = readCsv('logs/usage.csv');
const ok = claims.filter(c => c.verifier_verdict === 'potvrdene');
const screen = {};
for (const f of fs.existsSync(path.join(ROOT, 'data/screen')) ? fs.readdirSync(path.join(ROOT, 'data/screen')).filter(f => /^B\d\d\.csv$/.test(f)) : [])
  for (const s of readCsv(`data/screen/${f}`)) if (s.ico) screen[s.ico] = s;
const triage = Object.fromEntries(readCsv('data/triage.csv').map(t => [t.ico, t.tier]));

const PHASE_MAP = {
  'pre-seed': 'rana', seed: 'rana', series_a: 'rana',
  series_b: 'rastova', series_c_plus: 'rastova', growth: 'rastova',
  buyout: 'zrela', take_private: 'zrela', vacsinovy_podiel_zavedena: 'zrela',
};
const SIZE_MAP = { mikro: 'rana', mala: 'rastova', stredna: 'zrela', velka: 'zrela' };
const LEVEL_RANK = { A: 3, B: 2, C: 1, D: 0 };
const CONF_RANK = { vysoka: 2, stredna: 1, neiste: 0 };

function parseJson(v) { try { return JSON.parse(v); } catch { return null; } }
function domain(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }
function minConf(a, b) { return CONF_RANK[a] <= CONF_RANK[b] ? a : b; }

function timesFor(ico) {
  const rows = usage.filter(u => (u.ico || '').split('|').includes(ico));
  const starts = rows.map(r => r.started_at).filter(Boolean).sort();
  const ends = rows.map(r => r.finished_at).filter(Boolean).sort();
  return { start: starts[0] || '', end: ends[ends.length - 1] || '' };
}

const decisions = [];
const investors = [];

for (const r of registrar) {
  const ico = r.ico;
  const base = { ico, name: r.name, failed_gate: '', type: '', subtype: '', candidate_types: '',
    confidence_activity: '', confidence_type: '', confidence: '', flags: '', reason: '', last_investment_date: '' };
  const t = timesFor(ico || r.candidate_id);
  base.processing_started_at = t.start; base.processing_finished_at = t.end;

  // G1, G2: rozhodol Registrátor (tvrdenia existencie a stavu musia byť potvrdené)
  if (r.status && r.status !== 'pokracuj') {
    decisions.push({ ...base, status: r.status, failed_gate: r.failed_gate, reason: r.reason,
      category: r.status === 'vyradeny_typ' ? 'ine: nefinančná hlavná činnosť (NACE)' : '' });
    continue;
  }
  const mine = ok.filter(c => c.ico === ico);
  const ex = mine.find(c => c.field === 'existencia');
  const st = mine.find(c => c.field === 'stav');
  if (!ex || !st || st.value !== 'aktivny') {
    decisions.push({ ...base, status: 'vyradeny_register', failed_gate: 'G1',
      reason: !ex ? 'existencia nepotvrdená overovateľom' : `stav: ${st ? st.value : 'nepotvrdený'}` });
    continue;
  }

  // Kandidáti, ktorí prešli iba rýchlym skríningom (T2) a nepostúpili do plného výskumu
  const hasResearch = mine.some(c => c.claim_id.startsWith('RES-'));
  const scr = screen[ico];
  if (!hasResearch && scr) {
    if (scr.result === 'ina_cinnost') {
      decisions.push({ ...base, status: 'vyradeny_typ', failed_gate: 'G3', category: scr.category || 'ine',
        reason: `skríning T2 (neoverené Overovateľom): ${scr.category || ''} ${scr.url || ''}`.trim() });
      continue;
    }
    if (scr.result === 'bez_dokazu') {
      // web nič nenašiel; o vyradení rozhodnú registre (na_vyskum = registre ukazujú investíciu v okne)
      const d = g4(ico, false, '');
      decisions.push({ ...base, status: d.status, failed_gate: 'G4', category: d.category, flags: `sila_negativneho_dokazu:${d.sila}`,
        reason: `skríning T2: bez dôkazu investície na webe; ${d.reason}` });
      continue;
    }
  }
  if (!hasResearch && triage[ico] === 'G3_vyradeny') {
    decisions.push({ ...base, status: 'vyradeny_typ', failed_gate: 'G3', category: 'ine: nefinančná hlavná činnosť (NACE)', reason: 'triedenie podľa NACE' });
    continue;
  }

  // G2 doplnkovo: fyzická osoba / family office podľa tvrdenia o činnosti
  const g3 = mine.filter(c => c.field === 'g3_cinnost').map(c => c.value);
  if (g3.includes('fyzicka_osoba') || g3.includes('family_office')) {
    decisions.push({ ...base, status: 'mimo_rozsahu', failed_gate: 'G2', reason: g3.join(', ') });
    continue;
  }

  // investície (potvrdené), zrelosť a typ podielu podľa cieľovej firmy
  // vlastné účelové dcéry podľa ORSR (scripts/footprint.js) nie sú investície podľa R1 (doplnené 2026-10-10)
  const ownVehicles = new Set((holdings[ico] || []).filter(h => +h.vlastna_dcera === 1).map(h => h.ciel_ico));
  const inv = mine.filter(c => c.field === 'investicia' && !ownVehicles.has(c.target_ico)).map(c => ({ c, v: parseJson(c.value) || {} }));
  const hasInvest = inv.length > 0;

  // G3: vyradí pozitívny dôkaz inej činnosti. Ak je dôkaz inej činnosti (A/B) a žiadny dôkaz
  // investovania do podielov, subjekt sa vyradí aj vtedy, keď má zapísané podiely (napr. vo vlastných
  // dcérach). Ak sú doložené oboje, pokračuje s príznakom g3_sporne.
  const g3claims = mine.filter(c => c.field === 'g3_cinnost');
  const otherStrong = g3claims.find(c => c.value !== 'investuje_do_podielov' && LEVEL_RANK[c.source_level] >= 2);
  const otherAny = g3.find(v => v !== 'investuje_do_podielov');
  const investsClaim = g3.includes('investuje_do_podielov');
  if ((otherStrong && !investsClaim) || (otherAny && !investsClaim && !hasInvest)) {
    const cat = otherStrong ? otherStrong.value : otherAny;
    decisions.push({ ...base, status: 'vyradeny_typ', failed_gate: 'G3', category: cat, reason: `činnosť: ${cat}` });
    continue;
  }
  const g3Flag = otherAny && investsClaim ? 'g3_sporne' : '';

  // G4: aktivita v okne s dôkazom A alebo B
  const inWin = inv.filter(x => inWindow(x.v.datum));
  const winAB = inWin.filter(x => LEVEL_RANK[x.c.source_level] >= 2);
  const lastDate = inWin.map(x => x.v.datum).sort().pop() || '';
  base.last_investment_date = lastDate;
  if (!winAB.length) {
    if (inWin.length) {
      decisions.push({ ...base, status: 'neiste', failed_gate: 'G4', confidence_activity: 'neiste', reason: 'investícia v okne doložená iba úrovňou C' });
      continue;
    }
    // bez investície v okne: rozlíšiť „investoval pred oknom“ a „verejne neinvestoval“; registre môžu vrátiť na výskum
    const d = g4(ico, hasInvest, inv.map(x => x.v.datum).filter(Boolean).sort().pop() || '');
    // po plnom výskume už „na_vyskum“ neexistuje: signál z registrov, ktorý výskum nepriradil ku konkrétnej
    // investícii, je nevysvetlený => neiste a ručná kontrola
    if (d.status === 'na_vyskum') {
      decisions.push({ ...base, status: 'neiste', failed_gate: 'G4', confidence_activity: 'neiste', category: d.category,
        flags: 'registre_nevysvetlene', reason: `výskum nenašiel investíciu v okne, ale registre ukazujú aktivitu: ${d.reason}` });
      continue;
    }
    decisions.push({ ...base, status: d.status, failed_gate: 'G4', category: d.category, flags: `sila_negativneho_dokazu:${d.sila}`, reason: d.reason });
    continue;
  }

  // dôvera aktivity
  let confAct = 'neiste';
  const targetsA = new Set(winAB.filter(x => x.c.source_level === 'A').map(x => x.c.target_ico));
  if (targetsA.size) confAct = 'vysoka';
  else {
    const byTarget = {};
    winAB.forEach(x => { (byTarget[x.c.target_ico || x.v.target] ||= new Set()).add(domain(x.c.source_url)); });
    confAct = Object.values(byTarget).some(s => s.size >= 2) ? 'vysoka' : 'stredna';
  }

  // G5: typ podľa zrelosti cieľových firiem
  const flags = g3Flag ? [g3Flag] : [];
  const regul = mine.find(c => c.field === 'regulacna_klasifikacia' && /euveca/i.test(c.value));
  const targets = [...new Set(inv.map(x => x.c.target_ico).filter(Boolean))];
  const signals = [];
  for (const tg of targets) {
    const ph = mine.filter(c => c.field === 'faza' && c.target_ico === tg && LEVEL_RANK[c.source_level] >= 2)
      .map(c => PHASE_MAP[c.value]).filter(Boolean);
    const sz = mine.filter(c => c.field === 'velkost_firmy' && c.target_ico === tg)
      .map(c => SIZE_MAP[(parseJson(c.value) || {}).kategoria]).filter(Boolean);
    let z = 'nedolozena';
    if (ph.length) {
      z = ph[0];
      if (sz.length && sz[0] !== z && !(z !== 'zrela' && sz[0] !== 'zrela')) flags.push(`zrelost_sporna:${tg}`), z = 'sporna';
    } else if (sz.length) z = sz[0];
    // typ podielu (plan.md 1.1 a 2.3): VC investuje do menšinových podielov; kúpa kontrolného podielu je znak
    // zrelej transakcie (PE), nie VC, aj keď je cieľová firma malá (doplnené 2026-10-10, Fund Rating)
    // Pri firme bez doloženej zrelosti (zvyčajne založenej v deň vstupu) kontrolný podiel zrelosť neurčí: ostáva
    // nedoložená a subjekt ide na ručnú kontrolu (napr. vlastné SPV, ktoré ORSR neodhalilo).
    const ctrl = mine.some(c => c.field === 'typ_podielu' && c.target_ico === tg && /kontroln/.test(c.value));
    if (ctrl && z !== 'zrela' && z !== 'nedolozena') { flags.push(`kontrolny_podiel:${tg}`); z = 'zrela'; }
    else if (ctrl && z === 'nedolozena') flags.push(`kontrolny_podiel_bez_zrelosti:${tg}`);
    signals.push({ tg, z });
  }
  const vc = signals.filter(s => s.z === 'rana' || s.z === 'rastova').length;
  const pe = signals.filter(s => s.z === 'zrela').length;
  const undetermined = signals.length - vc - pe;

  let type = '', confType = 'neiste', candidateTypes = '';
  if (regul) { type = 'VC'; confType = 'vysoka'; }
  else if (vc + pe === 0 || undetermined > vc + pe || vc === pe) { type = 'typ_nerozhodnuty'; candidateTypes = 'VC|PE'; }
  else {
    type = vc > pe ? 'VC' : 'PE';
    if (vc && pe) flags.push('hranicny_typ');
    const n = Math.max(vc, pe);
    confType = n >= 2 ? 'vysoka' : 'stredna';
  }

  const conf = type === 'typ_nerozhodnuty' ? 'neiste' : minConf(confAct, confType);
  const sub = mine.find(c => c.field === 'podtyp');
  const common = { ...base, confidence_activity: confAct, confidence_type: confType, confidence: conf, flags: flags.join('|') };

  if (type === 'PE') {
    decisions.push({ ...common, status: 'mimo_rozsahu', failed_gate: 'G5', type: 'PE', reason: `PE: investície do zrelých firiem alebo kontrolné podiely (zrelosť: VC ${vc}, PE ${pe}, neurčená ${undetermined})` });
  } else if (type === 'typ_nerozhodnuty') {
    decisions.push({ ...common, status: 'typ_nerozhodnuty', failed_gate: 'G5', type: '', candidate_types: candidateTypes,
      reason: `zrelosť: VC ${vc}, PE ${pe}, neurčená ${undetermined}` });
  } else {
    const d = { ...common, status: 'zaradeny', type: 'VC', subtype: sub ? sub.value : 'VC',
      reason: regul ? 'regulačná klasifikácia EuVECA' : `zrelosť: VC ${vc}, PE ${pe}, neurčená ${undetermined}` };
    decisions.push(d);
    // investors.json: každá hodnota s odkazom na claim_id
    const val = c => ({ value: c.value, claim_id: c.claim_id });
    const pick = f => mine.filter(c => c.field === f).map(val);
    investors.push({
      ico, name: r.name, subtype: d.subtype, confidence: conf, confidence_activity: confAct, confidence_type: confType,
      existencia: pick('existencia'), stav: pick('stav'), licencia: pick('licencia'), sektor_investora: pick('sektor_investora'),
      regulacna_klasifikacia: pick('regulacna_klasifikacia'),
      deklarovany_sektor: pick('deklarovany_sektor'), deklarovana_faza: pick('deklarovana_faza'),
      ticket_size: pick('ticket_size'), velkost_fondu: pick('velkost_fondu'), celkove_aktiva: pick('celkove_aktiva'),
      investicie: inv.map(x => ({
        target_ico: x.c.target_ico, ...x.v, claim_id: x.c.claim_id,
        faza: mine.filter(c => c.field === 'faza' && c.target_ico === x.c.target_ico).map(val),
        velkost_firmy: mine.filter(c => c.field === 'velkost_firmy' && c.target_ico === x.c.target_ico).map(val),
        typ_podielu: mine.filter(c => c.field === 'typ_podielu' && c.target_ico === x.c.target_ico).map(val),
        vyska_investicie: mine.filter(c => c.field === 'vyska_investicie' && c.target_ico === x.c.target_ico).map(val),
      })),
    });
  }
}

const header = ['ico', 'name', 'status', 'failed_gate', 'type', 'subtype', 'candidate_types', 'confidence_activity',
  'confidence_type', 'confidence', 'flags', 'reason', 'last_investment_date', 'processing_started_at', 'processing_finished_at', 'category'];
if (mergeFile) {
  const done = new Set(decisions.map(d => d.ico));
  decisions.unshift(...readCsv('data/decisions.csv').filter(d => !done.has(d.ico)));
  investors.unshift(...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/investors.json'), 'utf8')).filter(i => !done.has(i.ico)));
}
writeCsv('data/decisions.csv', header, decisions);
fs.writeFileSync(path.join(ROOT, 'data/investors.json'), JSON.stringify(investors, null, 2) + '\n', 'utf8');
const counts = decisions.reduce((a, d) => (a[d.status] = (a[d.status] || 0) + 1, a), {});
console.log(JSON.stringify(counts));
