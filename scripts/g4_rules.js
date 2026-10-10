// Brána G4 s negatívnym dôkazom (plan.md 2.3). Rozlišuje:
//  - na_vyskum: registre ukazujú investíciu v okne, ktorú skríning alebo výskum nenašiel => späť do plného výskumu,
//  - vyradeny_neaktivny: subjekt investoval, ale posledná investícia je pred oknom 36 mesiacov,
//  - vyradeny_bez_investicii: subjekt existuje, ale verejné zdroje neukazujú žiadnu investíciu do cudzej firmy
//    (nanajvýš vlastné účelové dcéry).
// Sila negatívneho dôkazu: silna = ORSR aj tabuľková závierka v RÚZ; stredna = iba ORSR; slaba = iba web.
// Vstup: riadok z data/footprint.csv, riadky z data/orsr_podiely.csv a to, či výskum potvrdil nejakú investíciu.
const { WINDOW_START } = require('./lib');

const eur = n => Math.round(n).toLocaleString('sk-SK') + ' €';
const list = hs => hs.map(h => `${h.ciel_nazov} (${h.ciel_ico}, od ${h.od}${h.navysenie_vkladu_v_okne ? ', navýšenie ' + h.navysenie_vkladu_v_okne : ''})`).join('; ');

function ruzGrowth(fp) {
  let s; try { s = JSON.parse(fp.ruz_rady || '{}'); } catch { s = {}; }
  const out = [];
  for (const y of Object.keys(s).sort()) {
    const p = s[String(+y - 1)];
    // iba celé roky v okne: rast za rok, ktorý do okna patrí len čiastočne (2023), nedokazuje investíciu v okne
    if (!p || `${y}-01-01` < WINDOW_START) continue;
    // iba podielové cenné papiere: rast ostatného dlhodobého finančného majetku sú pôžičky alebo dlhové
    // papiere, nie podiel podľa R1 (zistené pri iea capital, 2026-10-10)
    out.push({ rok: y, polozka: 'podiely', delta: s[y].podiely - p.podiely, hodnota: s[y].podiely });
  }
  const last = Object.keys(s).sort().pop();
  return { growth: out, last: last ? { rok: last, ...s[last] } : null };
}

function decideG4({ fp, holdings = [], investedEver = false, lastInvestment = '' }) {
  const orsrOk = fp && fp.orsr_stav === 'ok';
  const ruzTab = fp && fp.ruz_stav === 'tabulka';
  const own = holdings.filter(h => +h.vlastna_dcera === 1);
  const ext = holdings.filter(h => +h.vlastna_dcera !== 1);
  const extWin = ext.filter(h => +h.vstup_v_okne === 1 || h.navysenie_vkladu_v_okne);
  const { growth, last } = fp ? ruzGrowth(fp) : { growth: [], last: null };
  const ownWinCapital = own.filter(h => +h.vstup_v_okne === 1 || h.navysenie_vkladu_v_okne).reduce((a, h) => a + (+h.vklad_eur || 0), 0);
  const unexplained = growth.filter(g => g.delta > Math.max(10000, ownWinCapital));
  const url = h => String(h.vypis_url).split(' ')[0];
  const sila = !orsrOk ? 'slaba' : ruzTab ? 'silna' : 'stredna';

  if (extWin.length)
    return { status: 'na_vyskum', category: 'orsr_podiel_v_okne', sila: 'n/a',
      reason: `ORSR: podiel v cudzej firme vstúpený alebo navýšený v okne: ${list(extWin)}`, url: url(extWin[0]), evidence: list(extWin) };
  if (unexplained.length) {
    const g = unexplained[unexplained.length - 1];
    return { status: 'na_vyskum', category: 'ruz_rast_podielov', sila: 'n/a',
      reason: `RÚZ: ${g.polozka === 'podiely' ? 'podielové cenné papiere vzrástli' : 'dlhodobý finančný majetok vzrástol'} v roku ${g.rok} o ${eur(g.delta)}; ORSR rast nevysvetľuje (podiely v a. s., v zahraničí alebo konvertibilné nástroje)`,
      url: fp.ruz_url, evidence: JSON.stringify(unexplained) };
  }
  const lastExt = ext.map(h => h.od).sort().pop() || '';
  const lastAny = [lastExt, lastInvestment].filter(Boolean).sort().pop() || '';
  if (ext.length || investedEver)
    return { status: 'vyradeny_neaktivny', category: 'investicie_pred_oknom', sila,
      reason: `investoval, posledná doložená investícia ${lastAny || 'bez dátumu'} je pred oknom 36 mesiacov` + (ext.length ? `; ORSR: ${ext.length} podielov v cudzích firmách, žiadny vstup ani navýšenie v okne` : ''),
      url: ext.length ? url(ext[ext.length - 1]) : '', evidence: ext.length ? list(ext.slice(-3)) : '' };
  // žiadna investícia do cudzej firmy
  const parts = [];
  if (orsrOk) parts.push(own.length ? `ORSR: iba vlastné účelové dcéry (100 %, rovnaké sídlo, založené alebo kúpené ako ready-made): ${list(own)}` : 'ORSR: nie je spoločníkom, komanditistom ani jediným akcionárom žiadnej firmy');
  else parts.push(fp ? `ORSR: nepodarilo sa overiť (${fp.orsr_stav})` : 'ORSR: neoverené (subjekt nie je v data/footprint.csv)');
  if (ruzTab && last) parts.push(`RÚZ ${last.rok}: podielové cenné papiere ${eur(last.podiely)}, dlhodobý finančný majetok ${eur(last.dfm)}${growth.length ? ', bez rastu v okne' : ''}`);
  else if (fp && fp.ruz_stav === 'bez_tabulky') parts.push('RÚZ: závierka iba v PDF, finančný majetok sa automaticky neoveril');
  else if (fp && fp.ruz_stav === 'bez_zavierky') parts.push('RÚZ: bez riadnej závierky');
  parts.push('web: bez dôkazu investície');
  // drží podiely, ktoré ORSR neukazuje a vlastné dcéry ich nevysvetľujú => investoval niekedy, nie v okne
  if (ruzTab && last && last.podiely > 0 && !own.length)
    return { status: 'vyradeny_neaktivny', category: 'podiely_mimo_orsr_bez_rastu', sila: 'stredna',
      reason: 'drží podiely, ktoré ORSR neukazuje, bez rastu v okne; ' + parts.join('; '), url: fp.ruz_url, evidence: parts.join('; ') };
  return { status: 'vyradeny_bez_investicii', category: own.length ? 'iba_vlastne_dcery' : 'bez_podielov', sila,
    reason: 'subjekt existuje, verejné zdroje neukazujú investíciu do cudzej firmy; ' + parts.join('; '),
    url: own.length ? url(own[0]) : (fp && fp.orsr_vypis_investora) || '', evidence: parts.join('; ') };
}

module.exports = { decideG4, ruzGrowth };
