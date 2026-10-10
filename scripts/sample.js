// Výber vzorky na slepú ručnú kontrolu (variant P98 ±10 p. b. s korekciou na konečnú populáciu).
// Výstupy: data/review_sample.csv (bez rozhodnutí agentov), data/review_key.csv, data/review_claims.csv
const { readCsv, writeCsv } = require('./lib');

const SEED = 20261009;
let s = SEED;
function rand() { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }
function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function nPrime(N) { return Math.min(N, Math.ceil(136 / (1 + 135 / N))); }

const decisions = readCsv('data/decisions.csv');
const claims = readCsv('data/claims.csv');

const strata = {
  zaradeny: decisions.filter(d => d.status === 'zaradeny'),
  vyradeny: decisions.filter(d => d.status.startsWith('vyradeny_')),
  mimo_rozsahu: decisions.filter(d => d.status === 'mimo_rozsahu'),
  vzdy: decisions.filter(d => d.status === 'neiste' || d.status === 'typ_nerozhodnuty'),
};

const picked = [];
for (const [name, rows] of Object.entries(strata)) {
  const take = name === 'vzdy' ? rows : shuffle(rows).slice(0, nPrime(rows.length));
  take.forEach(d => picked.push({ d, stratum: name, N: rows.length }));
}

const ordered = shuffle(picked); // poradie nezávislé od vrstvy, aby kontrolór nevedel vrstvu
const nDouble = Math.round(ordered.length * 0.2);
const sample = [], key = [];
ordered.forEach((p, i) => {
  const id = `R${String(i + 1).padStart(3, '0')}`;
  const cids = claims.filter(c => c.ico && c.ico === p.d.ico).map(c => c.claim_id);
  sample.push({ review_id: id, ico: p.d.ico, name: p.d.name, claim_ids: cids.join('|'),
    human_status: '', human_type: '', human_subtype: '', human_note: '', human_minutes: '', reviewer_id: '' });
  key.push({ review_id: id, ico: p.d.ico, stratum: p.stratum, agent_status: p.d.status, agent_type: p.d.type,
    agent_subtype: p.d.subtype, agent_confidence: p.d.confidence, double_review: i < nDouble ? 1 : 0 });
});

writeCsv('data/review_sample.csv', ['review_id', 'ico', 'name', 'claim_ids', 'human_status', 'human_type', 'human_subtype',
  'human_note', 'human_minutes', 'reviewer_id'], sample);
writeCsv('data/review_key.csv', ['review_id', 'ico', 'stratum', 'agent_status', 'agent_type', 'agent_subtype',
  'agent_confidence', 'double_review'], key);

const confirmed = claims.filter(c => c.verifier_verdict === 'potvrdene');
const cl = shuffle(confirmed).slice(0, nPrime(confirmed.length));
writeCsv('data/review_claims.csv', ['claim_id', 'human_verdict', 'human_note'], cl.map(c => ({ claim_id: c.claim_id })));

console.log(JSON.stringify({ seed: SEED,
  strata: Object.fromEntries(Object.entries(strata).map(([k, v]) => [k, { N: v.length, n: k === 'vzdy' ? v.length : nPrime(v.length) }])),
  review_records: sample.length, double_review: nDouble, review_claims: cl.length, confirmed_claims: confirmed.length }));
