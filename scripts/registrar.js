// Registrátor (brány G1 a G2) nad RPO API pre kandidátov s jednoznačným IČO.
// Kandidátov bez jednoznačného IČO zapíše do data/registrar_todo.csv (dorieši agent).
// Výstupy: data/claims.csv (doplní), data/registrar_decisions.csv, logs/usage.csv (doplní), raw/<claim_id>.json
const fs = require('fs');
const path = require('path');
const { ROOT, readCsv, writeCsv } = require('./lib');

const API = 'https://api.statistics.sk/rpo/v1';
const UA = { 'User-Agent': 'investor-research research@example.org' };

const LEGAL = /\b(s\.?\s?r\.?\s?o\.?|spol\.?\s?s\s?r\.?\s?o\.?|a\.?\s?s\.?|správ\.?\s?spol\.?|správcovská spoločnosť|sicav|o\.?\s?c\.?\s?p\.?|k\.?\s?s\.?|v\.?\s?o\.?\s?s\.?|j\.?\s?s\.?\s?a\.?|se)\b/gi;
function norm(n) {
  return String(n).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(LEGAL, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}
async function getJson(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: UA }); if (r.ok) return await r.json(); } catch (e) { /* opakuj */ }
    await new Promise(res => setTimeout(res, 1500));
  }
  return null;
}
const current = arr => (arr || []).filter(x => !x.validTo).slice(-1)[0] || (arr || []).slice(-1)[0];

async function main() {
  const cand = readCsv('data/candidates.csv');
  const byId = {};
  for (const c of cand) {
    const e = (byId[c.candidate_id] ||= { candidate_id: c.candidate_id, names: new Set(), icos: new Set() });
    e.names.add(c.name);
    const h = (c.ico_hint || '').replace(/\s/g, '');
    if (/^\d{6,8}$/.test(h)) e.icos.add(h.padStart(8, '0'));
  }
  // IČO doplnené agentom Registrátora pre kandidátov bez zhody
  for (const x of readCsv('data/registrar_resolved.csv')) {
    if (byId[x.candidate_id] && /^d{8}$/.test(x.ico)) { byId[x.candidate_id].icos = new Set([x.ico]); byId[x.candidate_id].fromAgent = true; }
  }
  const only = process.argv.includes('--resolved-only');
  if (only) for (const k of Object.keys(byId)) if (!byId[k].fromAgent) delete byId[k];
  const claims = readCsv('data/claims.csv');
  const existing = new Set(claims.map(c => c.claim_id));
  const usage = readCsv('logs/usage.csv');
  const decisions = [], todo = [];

  for (const e of Object.values(byId)) {
    const started = new Date().toISOString();
    let calls = 0;
    const name = [...e.names][0];
    let hits = [];
    if (e.icos.size === 1) {
      const ico = [...e.icos][0];
      const j = await getJson(`${API}/search?identifier=${ico}`); calls++;
      hits = (j && j.results) || [];
    } else if (e.icos.size === 0) {
      for (const n of e.names) {
        const j = await getJson(`${API}/search?fullName=${encodeURIComponent(n)}`); calls++;
        const res = ((j && j.results) || []).filter(r => (r.fullNames || []).some(f => norm(f.value) === norm(n)));
        hits.push(...res);
      }
      const seen = new Set(); hits = hits.filter(h => !seen.has(h.id) && seen.add(h.id));
      const alive = hits.filter(h => !h.termination);
      if (alive.length === 1) hits = alive;
    }
    if (hits.length !== 1) {
      todo.push({ candidate_id: e.candidate_id, name, icos: [...e.icos].join('|'), rpo_hits: hits.length,
        reason: hits.length ? 'viac zhôd v RPO' : (e.icos.size > 1 ? 'viac IČO v zdrojoch' : 'žiadna zhoda v RPO podľa IČO/názvu') });
      continue;
    }
    const ent = await getJson(`${API}/entity/${hits[0].id}?showHistoricalData=true`); calls++;
    if (!ent) { todo.push({ candidate_id: e.candidate_id, name, icos: '', rpo_hits: 1, reason: 'RPO entita nedostupná' }); continue; }
    const raw = JSON.stringify(ent);
    const idf = current(ent.identifiers) || {};
    const ico = idf.value;
    const fn = current(ent.fullNames) || {};
    const addr = current(ent.addresses) || {};
    const lf = current(ent.legalForms) || {};
    const url = `${API}/entity/${ent.id}?showHistoricalData=true`;
    const accessed = new Date().toISOString();
    const mk = (field, value, quote, note) => {
      const claim_id = `REG-${ico}-${field}`;
      fs.writeFileSync(path.join(ROOT, 'raw', `${claim_id}.json`), raw, 'utf8');
      if (!existing.has(claim_id)) claims.push({ claim_id, ico, target_ico: '', field, value, flags: '', source_url: url,
        source_level: 'A', source_published_at: ent.dbModificationDate || '', accessed_at: accessed, quote,
        raw_file: `raw/${claim_id}.json`, verifier_verdict: '', verifier_note: note || '' });
      existing.add(claim_id);
    };
    mk('existencia', JSON.stringify({ nazov: fn.value, ico, sidlo: [addr.street, addr.buildingNumber, addr.municipality && addr.municipality.value].filter(Boolean).join(' '),
      pravna_forma: lf.value && lf.value.value, krajina: 'SR', register: ent.sourceRegister && ent.sourceRegister.value && ent.sourceRegister.value.value }),
      JSON.stringify(idf));
    const terminated = ent.termination || ent.terminationDate;
    const liq = /likvid/i.test(fn.value || '');
    const stav = terminated ? `zanikol:${typeof terminated === 'string' ? terminated : JSON.stringify(terminated)}` : (liq ? 'likvidacia' : 'aktivny');
    mk('stav', stav, terminated ? JSON.stringify(terminated) : JSON.stringify(fn),
      terminated ? '' : 'záznam RPO neobsahuje údaj o zániku (termination)');
    const ma = ent.statisticalCodes && ent.statisticalCodes.mainActivity;
    if (ma) mk('sektor_investora', `${ma.code} ${ma.value}`, JSON.stringify(ma));

    let status = 'pokracuj', gate = '', reason = '';
    if (stav !== 'aktivny') { status = 'vyradeny_register'; gate = 'G1'; reason = stav; }
    decisions.push({ candidate_id: e.candidate_id, ico, name: fn.value || name, status, failed_gate: gate, reason });
    usage.push({ candidate_id: e.candidate_id, ico, agent_role: 'registrator_skript', started_at: started,
      finished_at: new Date().toISOString(), pages_opened: calls, tool_calls: calls, input_tokens: 0, output_tokens: 0 });
  }

  // zlúčenie s existujúcimi rozhodnutiami (agentove riešenia todo sa pridávajú do toho istého súboru)
  const prev = readCsv('data/registrar_decisions.csv');
  const seenC = new Set(decisions.map(d => d.candidate_id));
  const merged = prev.filter(d => !seenC.has(d.candidate_id)).concat(decisions);
  // jeden subjekt (IČO) môže prísť pod viacerými candidate_id; ponechá sa prvý
  const seenIco = new Set();
  const dedup = merged.filter(d => !d.ico || !seenIco.has(d.ico) && seenIco.add(d.ico));

  writeCsv('data/registrar_decisions.csv', ['candidate_id', 'ico', 'name', 'status', 'failed_gate', 'reason'], dedup);
  if (!only) writeCsv('data/registrar_todo.csv', ['candidate_id', 'name', 'icos', 'rpo_hits', 'reason'], todo);
  writeCsv('data/claims.csv', ['claim_id', 'ico', 'target_ico', 'field', 'value', 'flags', 'source_url', 'source_level',
    'source_published_at', 'accessed_at', 'quote', 'raw_file', 'verifier_verdict', 'verifier_note'], claims);
  writeCsv('logs/usage.csv', ['candidate_id', 'ico', 'agent_role', 'started_at', 'finished_at', 'pages_opened', 'tool_calls',
    'input_tokens', 'output_tokens'], usage);
  console.log(JSON.stringify({ resolved: decisions.length, todo: todo.length, dedup_entities: dedup.length }));
}
main();
