// Nové pravidlo G4 (scripts/g4_rules.js) nad už vyradenými subjektmi (2026-10-10, po pripomienke k PC19 Capital).
// Vstupy: data/vyradene.csv, data/footprint.csv, data/orsr_podiely.csv (scripts/footprint.js).
// Výstupy: data/vyradene.csv (G4 riadky prehodnotené, pôvodný dôvod v stĺpci povodny_dovod),
//          data/na_vyskum.csv (subjekty, ktoré treba vrátiť do plného výskumu), data/review_key.csv (agent_status).
// Opakovateľné: vždy vychádza z povodny_dovod.
const { readCsv, writeCsv } = require('./lib');
const { decideG4 } = require('./g4_rules');

const H = ['ico', 'nazov', 'status', 'brana', 'kategoria', 'dovod', 'sila_negativneho_dokazu', 'poznamka', 'dokaz_url', 'dokaz',
  'sposob_spracovania', 'zdroje_kandidata', 'candidate_ids', 'povodny_status', 'povodny_dovod', 'povodny_dokaz_url', 'povodny_dokaz'];
const vyr = readCsv('data/vyradene.csv').concat(readCsv('data/na_vyskum.csv'));
const fp = Object.fromEntries(readCsv('data/footprint.csv').map(f => [f.ico, f]));
const hold = {};
readCsv('data/orsr_podiely.csv').forEach(h => (hold[h.investor_ico] ||= []).push(h));

const keep = [], back = [], cnt = {};
for (const r of vyr) {
  if (r.brana !== 'G4' || !r.ico) { keep.push(r); continue; }
  r.povodny_status ||= r.status;
  r.povodny_dovod ||= r.dovod;
  if (!r.povodny_dokaz_url && !r.povodny_dokaz) { r.povodny_dokaz_url = r.dokaz_url; r.povodny_dokaz = r.dokaz; }
  const inv = /^investicia:/.test(r.povodny_dokaz) ? r.povodny_dokaz : '';
  const last = (inv.match(/"datum":"([\d-]+)"/) || [])[1] || '';
  const d = decideG4({ fp: fp[r.ico], holdings: hold[r.ico] || [], investedEver: !!inv, lastInvestment: last });
  Object.assign(r, { status: d.status, kategoria: d.category, dovod: d.reason, sila_negativneho_dokazu: d.sila });
  // dôkaz z registra prepíše pôvodný iba vtedy, keď ho pravidlo má (inak ostáva dôkaz z výskumu)
  if (d.url) { r.dokaz_url = d.url; r.dokaz = d.evidence; }
  cnt[`${r.povodny_status} -> ${d.status}/${d.category}/${d.sila}`] = (cnt[`${r.povodny_status} -> ${d.status}/${d.category}/${d.sila}`] || 0) + 1;
  (d.status === 'na_vyskum' ? back : keep).push(r);
}
const order = (a, b) => (a.status + a.nazov).localeCompare(b.status + b.nazov, 'sk');
writeCsv('data/vyradene.csv', H, keep.sort(order));
writeCsv('data/na_vyskum.csv', H, back.sort(order));

// kľúč ručnej kontroly: stav, ktorý pri subjekte teraz tvrdí algoritmus
const key = readCsv('data/review_key.csv');
const now = Object.fromEntries(keep.concat(back).map(r => [r.ico, r.status]));
let changed = 0;
for (const k of key) if (now[k.ico] && k.agent_status !== now[k.ico] && /^(vyradeny_neaktivny|vyradeny_bez_investicii|na_vyskum)$/.test(k.agent_status + '') ) { k.agent_status = now[k.ico]; changed++; }
if (key.length) writeCsv('data/review_key.csv', Object.keys(key[0]), key);
console.log(JSON.stringify({ prehodnotenych: Object.values(cnt).reduce((a, b) => a + b, 0), na_vyskum: back.length, review_key_zmenenych: changed, prechody: cnt }, null, 1));
