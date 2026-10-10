// Metriky pilotu po ručnej kontrole (plan.md 2.6, 4.1, 4.10). Výstup: logs/metrics.md
// Vstupy: data/review_sample.csv + data/review_key.csv (M2–M4), data/review_claims.csv (M1),
// data/holdout.csv (M5), logs/traceability.md (M0), data/decisions.csv (M8), logs/usage.csv (M6, M7).
const fs = require('fs');
const path = require('path');
const { ROOT, readCsv } = require('./lib');

const Z = { P90: 1.6449, P95: 1.96, P98: 2.3263 };
function wilson(k, n, z) {
  if (!n) return null;
  const p = k / n, d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
const pct = x => (100 * x).toFixed(1) + ' %';
function verdict(k, n, thr, dir) { // dir '>=' alebo '<='
  return Object.fromEntries(Object.entries(Z).map(([lvl, z]) => {
    const w = wilson(k, n, z); if (!w) return [lvl, 'n/a'];
    const [lo, hi] = w;
    if (dir === '>=') return [lvl, lo >= thr ? 'splnené' : hi < thr ? 'nesplnené' : 'nerozhodnuteľné'];
    return [lvl, hi <= thr ? 'splnené' : lo > thr ? 'nesplnené' : 'nerozhodnuteľné'];
  }));
}
function row(name, k, n) {
  if (!n) return `| ${name} | – | 0 | n/a | n/a | n/a |`;
  const iv = Object.values(Z).map(z => wilson(k, n, z).map(pct).join(' – '));
  return `| ${name} | ${k}/${n} = ${pct(k / n)} | ${n} | ${iv.join(' | ')} |`;
}

const sample = readCsv('data/review_sample.csv');
const key = Object.fromEntries(readCsv('data/review_key.csv').map(k => [k.review_id, k]));
const reviewed = sample.filter(s => s.human_status);
const R = reviewed.map(s => ({ ...s, ...key[s.review_id] }));

// M2: zaradené, ktoré človek potvrdí ako aktívneho VC
const z = R.filter(r => r.agent_status === 'zaradeny');
const m2k = z.filter(r => r.human_status === 'zaradeny').length;
// M3: rovnaký typ aj podtyp
const m3k = z.filter(r => r.human_status === 'zaradeny' && (r.human_subtype || 'VC') === (r.agent_subtype || 'VC')).length;
// M4: vyradené, ktoré sú podľa človeka aktívny investor v rozsahu
const v = R.filter(r => (r.agent_status || '').startsWith('vyradeny_'));
const m4k = v.filter(r => r.human_status === 'zaradeny').length;
// M1: tvrdenia
const rc = readCsv('data/review_claims.csv').filter(c => c.human_verdict);
const m1k = rc.filter(c => c.human_verdict === 'potvrdene').length;
// M0
const tr = fs.existsSync(path.join(ROOT, 'logs/traceability.md')) ? fs.readFileSync(path.join(ROOT, 'logs/traceability.md'), 'utf8') : '';
const m0 = (tr.match(/dohľadateľnosť: ([\d.]+) %/) || [])[1];
// M8
const dec = readCsv('data/decisions.csv');
const vyr = Object.fromEntries(readCsv('data/vyradene.csv').filter(v => v.ico).map(v => [v.ico, v]));
const researched = new Set(fs.readdirSync(path.join(ROOT, 'data/research')).filter(f => /^\d{8}\.csv$/.test(f)).map(f => f.slice(0, 8)));
// po očistení sú vo decisions iba ponechané; vyradení z G4 sú vo vyradene.csv
const passedG3 = dec.concat(Object.values(vyr).filter(v => v.brana === 'G4').map(v => ({ ico: v.ico, status: v.status }))).filter(d => !['vyradeny_register', 'mimo_rozsahu', 'vyradeny_typ'].includes(d.status) || (d.status === 'mimo_rozsahu' && d.failed_gate === 'G5'));
const unsure = dec.filter(d => d.status === 'neiste' || d.status === 'typ_nerozhodnuty');
const passedG3R = passedG3.filter(d => researched.has(d.ico));
// M5: holdout
const hold = readCsv('data/holdout.csv');
const holdIco = [...new Set(hold.map(h => h.ico))];
// po očistení (2026-10-10): Scout našiel IČO, ak je v decisions.csv alebo vo vyradene.csv
const scoutIco = new Set(readCsv('data/decisions.csv').map(d => d.ico).concat(readCsv('data/vyradene.csv').map(v => v.ico)).filter(Boolean));

const humanByIco = Object.fromEntries(R.map(r => [r.ico, r.human_status]));
const decByIco = Object.fromEntries(dec.map(d => [d.ico, d]));
const inScope = holdIco.filter(i => (humanByIco[i] || (decByIco[i] || vyr[i] || {}).status) === 'zaradeny');
const foundScout = inScope.filter(i => scoutIco.has(i)).length;
const foundEnd = inScope.filter(i => (decByIco[i] || {}).status === 'zaradeny').length;
// capture-recapture medzi EIF a SLOVCA (iba subjekty v rozsahu)
const eif = new Set(hold.filter(h => h.holdout_source === 'EIF').map(h => h.ico).filter(i => inScope.includes(i)));
const slo = new Set(hold.filter(h => h.holdout_source === 'SLOVCA').map(h => h.ico).filter(i => inScope.includes(i)));
const both = [...eif].filter(i => slo.has(i)).length;
// Scout × holdout
const scoutInScope = dec.filter(d => d.status === 'zaradeny').length;
// M6, M7
const usage = readCsv('logs/usage.csv');
const tok = usage.reduce((a, u) => a + (Number(u.input_tokens) || 0), 0);
const hm = reviewed.map(r => Number(r.human_minutes)).filter(x => x > 0);
const kappaNote = 'Cohenova kappa: vyžaduje dvoch kontrolórov (double_review = 1); ak druhý nie je, „nemerané“.';

const L = ['# Metriky pilotu', '', `Čas výpočtu: ${new Date().toISOString()}`, `Skontrolovaných záznamov: ${reviewed.length} / ${sample.length}; tvrdení: ${rc.length}`, '',
  '| metrika | hodnota | n | P90 | P95 | P98 |', '|---|---|---|---|---|---|',
  row('M1 presnosť polí (tvrdení)', m1k, rc.length),
  row('M2 presnosť záznamov (zaradení)', m2k, z.length),
  row('M3 presnosť typu', m3k, z.length),
  row('M4 chybné vyradenia', m4k, v.length),
  row('M5 pokrytie holdoutu – Scout', foundScout, inScope.length),
  row('M5 pokrytie holdoutu – výsledná databáza', foundEnd, inScope.length),
  row('M8 podiel neistých (všetci, ktorí prešli G3)', unsure.length, passedG3.length),
  row('M8 podiel neistých (iba plne skúmaní)', unsure.filter(d => researched.has(d.ico)).length, passedG3R.length),
  '', `M0 dohľadateľnosť: ${m0 || 'n/a'} % (logs/traceability.md)`,
  `M6 čas človeka: ${hm.length ? (hm.reduce((a, b) => a + b, 0) / hm.length).toFixed(1) + ' min/záznam (n=' + hm.length + ')' : 'nevyplnené'}`,
  `M7 výpočtové náklady: spolu ${tok} tokenov (podrobne logs/run_summary_stats.md)`,
  `Capture-recapture (EIF × SLOVCA, v rozsahu): n1=${eif.size}, n2=${slo.size}, m=${both}${both ? ', N̂ = ' + (eif.size * slo.size / both).toFixed(1) : ', nedá sa (m = 0)'}. Zoznamy nie sú nezávislé (EIF ⊂ SLOVCA), odhad je iba ilustračný.`,
  `Zaradených v databáze: ${scoutInScope}.`, kappaNote, '',
  '## Kritériá úspechu (plan.md 4.10)', '', '| KU | kritérium | hranica | P90 | P95 | P98 |', '|---|---|---|---|---|---|'];
const ku = [
  ['KU0', 'dohľadateľnosť', '100 %', m0 ? (Number(m0) === 100 ? { P90: 'splnené', P95: 'splnené', P98: 'splnené' } : { P90: 'nesplnené', P95: 'nesplnené', P98: 'nesplnené' }) : null],
  ['KU1', 'presnosť záznamov (M2)', '≥ 95 %', z.length ? verdict(m2k, z.length, 0.95, '>=') : null],
  ['KU2', 'presnosť polí (M1)', '≥ 90 %', rc.length ? verdict(m1k, rc.length, 0.90, '>=') : null],
  ['KU3', 'pokrytie holdoutu (M5, výsledná databáza)', '≥ 80 %', inScope.length ? verdict(foundEnd, inScope.length, 0.80, '>=') : null],
  ['KU4', 'chybné vyradenia (M4)', '≤ 10 %', v.length ? verdict(m4k, v.length, 0.10, '<=') : null],
  ['KU5', 'podiel neistých (M8, plne skúmaní)', '≤ 25 %', passedG3R.length ? verdict(unsure.filter(d => researched.has(d.ico)).length, passedG3R.length, 0.25, '<=') : null],
];
ku.forEach(([id, n, t, vv]) => L.push(`| ${id} | ${n} | ${t} | ${vv ? vv.P90 : 'n/a'} | ${vv ? vv.P95 : 'n/a'} | ${vv ? vv.P98 : 'n/a'} |`));
L.push('', `KU1: na štatistické potvrdenie 95 % treba aspoň P90 52, P95 73, P98 103 kontrolovaných zaradených záznamov (všetky správne). Kontrolovaných: ${z.length}.`);
fs.writeFileSync(path.join(ROOT, 'logs/metrics.md'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
