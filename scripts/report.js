// Záverečné výstupy pilotu: logs/agent_errors.md a štatistická časť logs/run_summary_stats.md.
const fs = require('fs');
const path = require('path');
const { ROOT, readCsv } = require('./lib');

const claims = readCsv('data/claims.csv');
const byId = Object.fromEntries(claims.map(c => [c.claim_id, c]));
const decisions = readCsv('data/decisions.csv');
const cand = readCsv('data/candidates.csv');
const reg = readCsv('data/registrar_decisions.csv');
const usage = readCsv('logs/usage.csv');

// --- log chýb agentov (zamietnutia Overovateľom) ---
const verifyRows = [];
for (const f of fs.readdirSync(path.join(ROOT, 'data/verify')).filter(f => f.endsWith('.csv')))
  for (const v of readCsv(`data/verify/${f}`)) if (v.verifier_verdict && v.verifier_verdict !== 'potvrdene') verifyRows.push(v);
const regRejected = claims.filter(c => c.claim_id.startsWith('REG-') && c.verifier_verdict && c.verifier_verdict !== 'potvrdene');
const cats = {};
const lines = ['# Log chýb agentov', '', 'Každé zamietnutie tvrdenia Overovateľom (`nepotvrdene` / `rozporne`). Zdroj: `data/verify/*.csv`.', ''];
for (const v of verifyRows) cats[v.error_category || 'neuvedene'] = (cats[v.error_category || 'neuvedene'] || 0) + 1;
lines.push('## Počty podľa kategórie', '', '| kategória | počet |', '|---|---|');
Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => lines.push(`| ${k} | ${n} |`));
lines.push('', `Registrové tvrdenia (skript): zamietnuté ${regRejected.length} (po oprave overovacieho skriptu 0).`, '');
lines.push('## Zamietnutia', '', '| claim_id | pole | tvrdil výskumník | verdikt | kategória | dôvod |', '|---|---|---|---|---|---|');
for (const v of verifyRows) {
  const c = byId[v.claim_id] || {};
  const esc = s => String(s || '').replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 220);
  lines.push(`| ${v.claim_id} | ${c.field || ''} | ${esc(c.value)} | ${v.verifier_verdict} | ${v.error_category || ''} | ${esc(v.verifier_note)} |`);
}
fs.writeFileSync(path.join(ROOT, 'logs/agent_errors.md'), lines.join('\n') + '\n', 'utf8');

// --- štatistiky ---
const count = (arr, f) => arr.reduce((a, x) => { const k = f(x); a[k] = (a[k] || 0) + 1; return a; }, {});
const st = count(decisions, d => d.status);
const gate = count(decisions.filter(d => d.failed_gate), d => d.failed_gate);
const srcRows = count(cand, c => c.discovery_source);
const srcByStatus = {};
const statusByCand = Object.fromEntries(reg.map(r => [r.candidate_id, (decisions.find(d => d.ico && d.ico === r.ico) || {}).status || r.status]));
for (const c of cand) { const s = statusByCand[c.candidate_id] || '?'; (srcByStatus[c.discovery_source] ||= {})[s] = ((srcByStatus[c.discovery_source] || {})[s] || 0) + 1; }
const verdicts = count(claims.filter(c => !c.claim_id.startsWith('REG-')), c => c.verifier_verdict || 'neoverené');
const passedG3 = decisions.filter(d => ['zaradeny', 'neiste', 'typ_nerozhodnuty', 'vyradeny_neaktivny'].includes(d.status) || (d.status === 'mimo_rozsahu' && d.failed_gate === 'G5'));
const unsure = decisions.filter(d => d.status === 'neiste' || d.status === 'typ_nerozhodnuty');
const types = count(decisions.filter(d => d.status === 'zaradeny'), d => d.subtype || d.type);

// zrelosť: spôsob určenia (výslovne / MSP / sporná / nedoložená) pri potvrdených investíciách
const ok = claims.filter(c => c.verifier_verdict === 'potvrdene');
const zr = { vyslovne: 0, MSP: 0, sporna: 0, nedolozena: 0 };
const seen = new Set();
for (const c of ok.filter(c => c.field === 'investicia')) {
  const k = c.ico + '|' + c.target_ico; if (seen.has(k)) continue; seen.add(k);
  const ph = ok.some(x => x.ico === c.ico && x.target_ico === c.target_ico && x.field === 'faza' && ['A', 'B'].includes(x.source_level));
  const sz = ok.some(x => x.ico === c.ico && x.target_ico === c.target_ico && x.field === 'velkost_firmy');
  const sp = decisions.some(d => d.ico === c.ico && (d.flags || '').includes(`zrelost_sporna:${c.target_ico}`));
  if (sp) zr.sporna++; else if (ph) zr.vyslovne++; else if (sz) zr.MSP++; else zr.nedolozena++;
}

// spotreba
const sum = (rows, f) => rows.reduce((a, r) => a + (Number(r[f]) || 0), 0);
const byRole = {};
for (const u of usage) { const r = (byRole[u.agent_role] ||= { n: 0, tokens: 0, calls: 0, pages: 0 }); r.n++; r.tokens += Number(u.input_tokens) || 0; r.calls += Number(u.tool_calls) || 0; r.pages += Number(u.pages_opened) || 0; }

const out = ['# Štatistiky behu (generované scripts/report.js)', '', `Čas: ${new Date().toISOString()}`, '',
  '## Statusy', '', '| status | počet |', '|---|---|', ...Object.entries(st).map(([k, v]) => `| ${k} | ${v} |`), '',
  '## Brána vyradenia', '', '| brána | počet |', '|---|---|', ...Object.entries(gate).map(([k, v]) => `| ${k} | ${v} |`), '',
  '## Zaradení podľa podtypu', '', '| podtyp | počet |', '|---|---|', ...Object.entries(types).map(([k, v]) => `| ${k} | ${v} |`), '',
  '## Zdroje kandidátov (riadky kandidát × zdroj) a výsledný status', '', '| zdroj | riadkov | statusy |', '|---|---|---|',
  ...Object.entries(srcRows).map(([k, v]) => `| ${k} | ${v} | ${Object.entries(srcByStatus[k] || {}).map(([s, n]) => `${s} ${n}`).join(', ')} |`), '',
  '## Tvrdenia výskumníkov podľa verdiktu', '', '| verdikt | počet |', '|---|---|', ...Object.entries(verdicts).map(([k, v]) => `| ${k} | ${v} |`),
  '', `Miera zamietnutí overovateľom: ${((verdicts.nepotvrdene || 0) + (verdicts.rozporne || 0))} / ${Object.values(verdicts).reduce((a, b) => a + b, 0)}`, '',
  '## Zrelosť cieľových firiem (potvrdené investície)', '', '| spôsob | počet |', '|---|---|', ...Object.entries(zr).map(([k, v]) => `| ${k} | ${v} |`), '',
  '## Podiel neistých (KU5, M8)', '', `(neiste + typ_nerozhodnuty) / kandidáti, ktorí prešli G3 = ${unsure.length} / ${passedG3.length} = ${passedG3.length ? (100 * unsure.length / passedG3.length).toFixed(1) : 'n/a'} %`, '',
  '## Spotreba podľa roly', '', '| rola | záznamov | tokeny | volania nástrojov | stránky |', '|---|---|---|---|---|',
  ...Object.entries(byRole).map(([k, r]) => `| ${k} | ${r.n} | ${r.tokens} | ${r.calls} | ${r.pages} |`),
  '', `Spolu tokeny: ${sum(usage, 'input_tokens')}`];
fs.writeFileSync(path.join(ROOT, 'logs/run_summary_stats.md'), out.join('\n') + '\n', 'utf8');
console.log(JSON.stringify({ errors: verifyRows.length, cats, st, unsure: unsure.length, passedG3: passedG3.length, zr }));
