// Overovateľ pre registrové tvrdenia (REG-*): nezávisle znova stiahne zdroj (RPO API)
// a overí, že citát v ňom je, že ide o rovnaké IČO a že hodnota stavu sedí.
const { readCsv, writeCsv } = require('./lib');

const UA = { 'User-Agent': 'investor-research research@example.org' };
async function getText(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: UA }); if (r.ok) return await r.text(); } catch (e) { /* opakuj */ }
    await new Promise(res => setTimeout(res, 1500));
  }
  return null;
}

async function main() {
  const claims = readCsv('data/claims.csv');
  const cache = {};
  let n = 0;
  for (const c of claims) {
    if (!c.claim_id.startsWith('REG-') || c.verifier_verdict) continue;
    if (!(c.source_url in cache)) {
      const t = await getText(c.source_url);
      cache[c.source_url] = t ? JSON.stringify(JSON.parse(t)) : null;
    }
    const t = cache[c.source_url];
    n++;
    if (!t) { c.verifier_verdict = 'nepotvrdene'; c.verifier_note = 'zdroj sa pri overení nepodarilo otvoriť'; continue; }
    const j = JSON.parse(t);
    const icoOk = (j.identifiers || []).some(i => i.value === c.ico);
    const quoteOk = t.includes(c.quote);
    let valueOk = true;
    if (c.field === 'stav') {
      const term = !!(j.termination || j.terminationDate);
      const names = (j.fullNames || []).filter(f => !f.validTo).map(f => f.value).join(' ');
      const liq = /likvid/i.test(names);
      valueOk = c.value === 'aktivny' ? (!term && !liq) : c.value.startsWith('zanikol') ? term : c.value === 'likvidacia' ? liq : false;
    }
    if (icoOk && quoteOk && valueOk) {
      c.verifier_verdict = 'potvrdene';
      c.verifier_note = [c.verifier_note, 'overené opätovným stiahnutím: citát je v zdroji, IČO sedí'].filter(Boolean).join('; ');
    } else {
      c.verifier_verdict = 'nepotvrdene';
      c.verifier_note = `ico:${icoOk} citat:${quoteOk} hodnota:${valueOk}`;
    }
  }
  writeCsv('data/claims.csv', Object.keys(claims[0]), claims);
  console.log(`overených REG tvrdení: ${n}`);
}
main();
