// Kontrola dohľadateľnosti (KU0): každá hodnota v investors.json musí mať potvrdené
// tvrdenie, URL, kópiu zdroja v raw/ a citát, ktorý sa v kópii naozaj nachádza.
// Použitie: node scripts/trace.js [--claims-only]   (--claims-only kontroluje všetky potvrdené tvrdenia)
const fs = require('fs');
const path = require('path');
const { ROOT, readCsv, normalizeText } = require('./lib');

const claims = readCsv('data/claims.csv');
const byId = Object.fromEntries(claims.map(c => [c.claim_id, c]));
const claimsOnly = process.argv.includes('--claims-only');

function collectClaimIds(node, out) {
  if (Array.isArray(node)) node.forEach(n => collectClaimIds(n, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === 'claim_id' && typeof v === 'string') out.push(v);
      else if (k === 'claim_ids' && Array.isArray(v)) v.forEach(x => out.push(x));
      else collectClaimIds(v, out);
    }
  }
  return out;
}

let ids;
if (claimsOnly) ids = claims.filter(c => c.verifier_verdict === 'potvrdene').map(c => c.claim_id);
else {
  const p = path.join(ROOT, 'data/investors.json');
  ids = fs.existsSync(p) ? collectClaimIds(JSON.parse(fs.readFileSync(p, 'utf8')), []) : [];
}

const rawCache = {};
function rawText(rel) {
  if (!(rel in rawCache)) {
    const p = path.join(ROOT, rel);
    rawCache[rel] = fs.existsSync(p) ? normalizeText(fs.readFileSync(p, 'utf8')) : null;
  }
  return rawCache[rel];
}

const failures = [];
for (const id of ids) {
  const c = byId[id];
  const reasons = [];
  if (!c) reasons.push('claim_id neexistuje v claims.csv');
  else {
    if (c.verifier_verdict !== 'potvrdene') reasons.push(`verdikt overovateľa: ${c.verifier_verdict || 'prázdny'}`);
    for (const f of ['source_url', 'source_level', 'accessed_at', 'quote', 'raw_file'])
      if (!c[f]) reasons.push(`prázdne pole ${f}`);
    if (c.raw_file) {
      const t = rawText(c.raw_file);
      if (t === null) reasons.push(`súbor ${c.raw_file} neexistuje`);
      else if (c.quote && !c.quote.split(' [...] ').every(q => t.includes(normalizeText(q)))) reasons.push('citát sa v kópii zdroja nenachádza');
    }
  }
  if (reasons.length) failures.push({ id, reasons });
}

const total = ids.length, ok = total - failures.length;
const pct = total ? (100 * ok / total).toFixed(2) : 'n/a';
const lines = [
  '# Kontrola dohľadateľnosti (KU0)', '',
  `Čas: ${new Date().toISOString()}`,
  `Rozsah: ${claimsOnly ? 'všetky potvrdené tvrdenia v claims.csv' : 'hodnoty v data/investors.json'}`, '',
  `- hodnôt (claim_id): ${total}`, `- úspešných: ${ok}`, `- dohľadateľnosť: ${pct} %`, '',
];
if (failures.length) {
  lines.push('## Neúspešné', '', '| claim_id | dôvod |', '|---|---|');
  failures.forEach(f => lines.push(`| ${f.id} | ${f.reasons.join('; ')} |`));
}
fs.writeFileSync(path.join(ROOT, 'logs/traceability.md'), lines.join('\n') + '\n', 'utf8');
console.log(`traceability ${pct}% (${ok}/${total})`);
if (failures.length) { console.log(JSON.stringify(failures.slice(0, 20), null, 1)); process.exitCode = 2; }
