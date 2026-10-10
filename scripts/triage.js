// Triedenie po Registrátorovi (odchýlka od zadania, zapísaná v logs/run_summary.md):
// 1) G3 podľa hlavnej činnosti v RPO pri kandidátoch nájdených IBA hľadaním podľa názvu (rpo_nazov):
//    nefinančná hlavná činnosť => vyradeny_typ (dôkaz A: statisticalCodes.mainActivity).
// 2) Úroveň výskumu: T1 = plný výskum, T2 = rýchly skríning (postup do T1 len pri dôkaze investície).
// Výstup: data/triage.csv; registrar_decisions.csv sa doplní o vyradenia z G3.
const { readCsv, writeCsv } = require('./lib');

// Ponechané činnosti (SK NACE): 64, 66, 70.10 a navyše 70.20, 82.99, 82.10 – tieto kódy majú v RPO aj
// skutoční VC správcovia (Neulogy, Zero Gravity, Vision Ventures, CB IM). Ostatné kódy => vyradeny_typ (G3).
const FIN = /^(64|66|7010|7020|8299|8210)/;

const cand = readCsv('data/candidates.csv');
const reg = readCsv('data/registrar_decisions.csv');
const claims = readCsv('data/claims.csv');

const sources = {};
cand.forEach(c => { (sources[c.candidate_id] ||= new Set()).add(c.discovery_source); });
const nbsManager = new Set(cand.filter(c => c.discovery_source === 'nbs' && /správca|spravcovsk|správcovsk/i.test(c.discovery_url + ' ' + c.name)).map(c => c.candidate_id));
// ORSR, spätné vyhľadávanie (scripts/footprint.js, beží pred triedením): podiel v cudzej firme vstúpený
// alebo navýšený v okne je silný signál (A) => T1, aj keď by NACE subjekt vyradilo.
const orsrWin = new Set(readCsv('data/orsr_podiely.csv').filter(h => +h.vlastna_dcera !== 1 && (+h.vstup_v_okne === 1 || h.navysenie_vkladu_v_okne)).map(h => h.investor_ico));
const nace = Object.fromEntries(claims.filter(c => c.field === 'sektor_investora' && c.verifier_verdict === 'potvrdene')
  .map(c => [c.ico, { code: c.value.split(' ')[0], text: c.value, claim_id: c.claim_id }]));

const triage = [];
for (const d of reg) {
  if (d.status !== 'pokracuj') continue;
  const src = sources[d.candidate_id] || new Set();
  const n = nace[d.ico];
  // T1 iba pri silnom signále aktivity (SIH, články, SAPIE, označenie EuVECA); registre NBS/ESMA AIF bez stratégie => T2
  const euveca = new Set(['53527798', '55387845']); // G-Force, Occam (register ESMA EuVECA, zdroj Scouta)
  const strong = ['sih', 'clanok', 'saia'].some(s => src.has(s)) || euveca.has(d.ico) || orsrWin.has(d.ico);
  let tier, note = '';
  if (strong) { tier = 'T1'; if (orsrWin.has(d.ico)) note = 'ORSR: podiel v cudzej firme v okne'; }
  else if (src.size === 1 && src.has('rpo_nazov') && n && !FIN.test(n.code)) {
    tier = 'G3_vyradeny';
    d.status = 'vyradeny_typ'; d.failed_gate = 'G3';
    d.reason = `hlavná činnosť v RPO: ${n.text} (triedenie podľa NACE, claim ${n.claim_id})`;
  } else { tier = 'T2'; note = n ? n.text : 'bez kódu činnosti v RPO'; }
  triage.push({ candidate_id: d.candidate_id, ico: d.ico, name: d.name, sources: [...src].join('|'), nace: n ? n.text : '', tier, note });
}

writeCsv('data/triage.csv', ['candidate_id', 'ico', 'name', 'sources', 'nace', 'tier', 'note'], triage);
writeCsv('data/registrar_decisions.csv', ['candidate_id', 'ico', 'name', 'status', 'failed_gate', 'reason'], reg);
const cnt = triage.reduce((a, t) => (a[t.tier] = (a[t.tier] || 0) + 1, a), {});
console.log(JSON.stringify(cnt));
