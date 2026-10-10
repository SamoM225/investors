// Zlúči výstupy výskumníkov (data/research/<ico>.csv) a overovateľov (data/verify/<ico>.csv) do data/claims.csv.
// Verdikty overovateľa sa zapíšu k tvrdeniam podľa claim_id. Nové tvrdenia sa pridajú, existujúce sa neprepíšu.
const fs = require('fs');
const path = require('path');
const { ROOT, readCsv, writeCsv } = require('./lib');

const HEADER = ['claim_id', 'ico', 'target_ico', 'field', 'value', 'flags', 'source_url', 'source_level',
  'source_published_at', 'accessed_at', 'quote', 'raw_file', 'verifier_verdict', 'verifier_note'];
const claims = readCsv('data/claims.csv');
const byId = Object.fromEntries(claims.map(c => [c.claim_id, c]));

const list = dir => fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.csv')) : [];
let added = 0, verdicts = 0;
for (const f of list('data/research')) {
  for (const r of readCsv(`data/research/${f}`)) {
    if (!r.claim_id || byId[r.claim_id]) continue;
    const row = Object.fromEntries(HEADER.map(h => [h, r[h] || '']));
    claims.push(row); byId[r.claim_id] = row; added++;
  }
}
for (const f of list('data/verify')) {
  for (const v of readCsv(`data/verify/${f}`)) {
    const c = byId[v.claim_id];
    if (!c || !v.verifier_verdict) continue;
    c.verifier_verdict = v.verifier_verdict; c.verifier_note = v.verifier_note; verdicts++;
  }
}
writeCsv('data/claims.csv', HEADER, claims);
console.log(JSON.stringify({ claims: claims.length, added, verdicts }));
