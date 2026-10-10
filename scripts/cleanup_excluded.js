// Očistenie dát od vyradených subjektov (2026-10-10, na pokyn používateľa).
// Ponechá: zaradeny, typ_nerozhodnuty, neiste. Vyradené (vyradeny_*, mimo_rozsahu) zhrnie do
// data/vyradene.csv (dôvod + kľúčový dôkaz) a zmaže ich podrobné dáta (tvrdenia, kópie zdrojov,
// výskum, overenie) aj medzivýstupy registrátora, triedenia a skríningu.
// Záloha stavu pred čistením: scratchpad/backup_pred_cistenim_2026-10-10.tar.gz
const fs = require('fs');
const path = require('path');
const { ROOT, readCsv, writeCsv } = require('./lib');

const KEEP = new Set(['zaradeny', 'typ_nerozhodnuty', 'neiste']);
const dec = readCsv('data/decisions.csv');
const claims = readCsv('data/claims.csv');
const cand = readCsv('data/candidates.csv');
const reg = readCsv('data/registrar_decisions.csv');
const resolved = readCsv('data/registrar_resolved.csv');
const triage = Object.fromEntries(readCsv('data/triage.csv').map(t => [t.ico, t]));
const screen = {};
for (const f of fs.readdirSync(path.join(ROOT, 'data/screen')).filter(f => /^B\d\d\.csv$/.test(f)))
  for (const s of readCsv(`data/screen/${f}`)) screen[s.ico || s.candidate_id] = s;

const srcByCand = {};
cand.forEach(c => (srcByCand[c.candidate_id] ||= new Set()).add(c.discovery_source));
const candByIco = {};
reg.forEach(r => { if (r.ico) (candByIco[r.ico] ||= []).push(r.candidate_id); });
const namesByCand = {};
cand.forEach(c => { namesByCand[c.candidate_id] ||= c.name; });

const keepIco = new Set(dec.filter(d => KEEP.has(d.status)).map(d => d.ico));
const okClaims = claims.filter(c => c.verifier_verdict === 'potvrdene');
const short = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 300);

const rows = [];
const seenCand = new Set();
for (const d of dec) {
  if (KEEP.has(d.status)) continue;
  const cids = d.ico ? (candByIco[d.ico] || []) : reg.filter(r => !r.ico && r.name === d.name).map(r => r.candidate_id);
  cids.forEach(c => seenCand.add(c));
  const src = new Set(); cids.forEach(c => (srcByCand[c] || []).forEach(s => src.add(s)));
  const researched = d.ico && fs.existsSync(path.join(ROOT, `data/research/${d.ico}.csv`));
  const t = triage[d.ico];
  const level = researched ? 'plny_vyskum' : t && t.tier === 'T2' ? 'skrining' : t && t.tier === 'G3_vyradeny' ? 'triedenie_NACE' : 'registrator';
  let url = '', quote = '';
  const mine = okClaims.filter(c => c.ico === d.ico && d.ico);
  if (d.failed_gate === 'G1') {
    const st = mine.find(c => c.field === 'stav'); if (st) { url = st.source_url; quote = st.value; }
    const rs = cids.map(c => resolved.find(r => r.candidate_id === c)).find(Boolean); if (rs && !url) { url = rs.source_url; quote = short(rs.reason); }
  } else if (d.failed_gate === 'G2') {
    const rs = cids.map(c => resolved.find(r => r.candidate_id === c)).find(Boolean); if (rs) { url = rs.source_url; quote = `krajina: ${rs.country}`; }
  } else if (level === 'skrining') {
    const s = screen[d.ico]; if (s) { url = s.url; quote = short(s.quote || s.note); }
  } else if (level === 'triedenie_NACE') {
    const n = mine.find(c => c.field === 'sektor_investora'); if (n) { url = n.source_url; quote = n.value; }
  } else if (researched) {
    const g = mine.find(c => c.field === 'g3_cinnost' && c.value !== 'investuje_do_podielov') || mine.find(c => c.field === 'investicia');
    if (g) { url = g.source_url; quote = short(`${g.field}: ${g.value}`); }
  }
  rows.push({ ico: d.ico, nazov: d.name, status: d.status, brana: d.failed_gate, kategoria: d.category || '',
    dovod: short(d.reason), dokaz_url: url, dokaz: quote, sposob_spracovania: level,
    zdroje_kandidata: [...src].join('|'), candidate_ids: cids.join('|') });
}
// kandidáti bez rozhodnutia v decisions (napr. duplicitné candidate_id k rovnakému IČO) – iba evidencia
for (const r of reg) if (!seenCand.has(r.candidate_id) && !keepIco.has(r.ico)) {
  const d = dec.find(x => x.ico && x.ico === r.ico);
  if (d && KEEP.has(d.status)) continue;
  rows.push({ ico: r.ico, nazov: r.name || namesByCand[r.candidate_id], status: r.status === 'pokracuj' ? 'duplicita' : r.status, brana: r.failed_gate,
    kategoria: '', dovod: short(r.reason || 'duplicitný kandidát k rovnakému IČO'), dokaz_url: '', dokaz: '', sposob_spracovania: 'registrator',
    zdroje_kandidata: [...(srcByCand[r.candidate_id] || [])].join('|'), candidate_ids: r.candidate_id });
}
rows.sort((a, b) => (a.status + a.nazov).localeCompare(b.status + b.nazov, 'sk'));
writeCsv('data/vyradene.csv', ['ico', 'nazov', 'status', 'brana', 'kategoria', 'dovod', 'dokaz_url', 'dokaz', 'sposob_spracovania', 'zdroje_kandidata', 'candidate_ids'], rows);

// --- mazanie ---
let delFiles = 0;
const rm = p => { const f = path.join(ROOT, p); if (fs.existsSync(f)) { fs.rmSync(f, { recursive: true, force: true }); delFiles++; } };
const exclIco = new Set(rows.map(r => r.ico).filter(i => i && !keepIco.has(i)));
for (const f of fs.readdirSync(path.join(ROOT, 'raw'))) {
  const m = f.match(/^(?:REG|RES)-(\d{8})-/);
  if (m && exclIco.has(m[1])) rm(`raw/${f}`);
}
for (const dir of ['data/research', 'data/verify'])
  for (const f of fs.readdirSync(path.join(ROOT, dir))) { const m = f.match(/^(\d{8})/); if (m && exclIco.has(m[1])) rm(`${dir}/${f}`); }
['data/screen', 'data/triage.csv', 'data/registrar_decisions.csv', 'data/registrar_todo.csv', 'data/registrar_resolved.csv', 'raw/registrar'].forEach(rm);

writeCsv('data/claims.csv', Object.keys(claims[0]), claims.filter(c => keepIco.has(c.ico)));
writeCsv('data/decisions.csv', Object.keys(dec[0]), dec.filter(d => KEEP.has(d.status)));
writeCsv('data/candidates.csv', Object.keys(cand[0]), cand.filter(c => reg.some(r => r.candidate_id === c.candidate_id && keepIco.has(r.ico))));

console.log(JSON.stringify({ vyradene: rows.length, ponechane: keepIco.size, zmazanych_poloziek: delFiles,
  claims_ponechane: claims.filter(c => keepIco.has(c.ico)).length }));
