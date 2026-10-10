// Uzavretie návratu na výskum (2026-10-10): rozhodnutia plne skúmaných subjektov (classify.js --merge)
// sa premietnu do dát rovnako ako pri očistení (cleanup_excluded.js):
//  - ponechané (zaradeny, typ_nerozhodnuty, neiste) ostávajú v data/decisions.csv, data/claims.csv, data/investors.json,
//  - vyradení (vyradeny_*, mimo_rozsahu) idú do data/vyradene.csv s dôvodom a kľúčovým dôkazom; ich tvrdenia,
//    výskum, overenie a kópie zdrojov sa zmažú,
//  - data/na_vyskum.csv sa odstráni (všetci sú preskúmaní), data/review_key.csv dostane konečné stavy.
// Záloha pred spustením: scratchpad/backup_pred_finalize_navrat.tar.gz
const fs = require('fs');
const path = require('path');
const { ROOT, readCsv, writeCsv } = require('./lib');

const KEEP = new Set(['zaradeny', 'typ_nerozhodnuty', 'neiste']);
const dec = readCsv('data/decisions.csv');
const claims = readCsv('data/claims.csv');
const queue = Object.fromEntries(readCsv('data/na_vyskum.csv').map(r => [r.ico, r]));
const vyr = readCsv('data/vyradene.csv');
const H = Object.keys(vyr[0]);
const ok = claims.filter(c => c.verifier_verdict === 'potvrdene');
const short = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 300);

const out = dec.filter(d => !KEEP.has(d.status));
const outIco = new Set(out.map(d => d.ico));
const rows = [];
for (const d of out) {
  const mine = ok.filter(c => c.ico === d.ico);
  const g = d.failed_gate === 'G3' ? mine.find(c => c.field === 'g3_cinnost' && c.value !== 'investuje_do_podielov')
    : mine.find(c => c.field === 'typ_podielu' && /kontroln/.test(c.value)) || mine.find(c => c.field === 'investicia');
  const q = queue[d.ico] || vyr.find(v => v.ico === d.ico) || {};
  rows.push({ ...Object.fromEntries(H.map(h => [h, q[h] || ''])), ico: d.ico, nazov: d.name, status: d.status, brana: d.failed_gate,
    kategoria: d.category || (d.type ? `typ ${d.type}` : ''), dovod: short(d.reason), sila_negativneho_dokazu: '',
    poznamka: q.povodny_status ? 'vrátený na plný výskum kontrolou registrov (2026-10-10)' : 'zmena pravidla G5 (kontrolný podiel), 2026-10-10',
    dokaz_url: g ? g.source_url : '', dokaz: g ? short(`${g.field}: ${g.value}`) : '', sposob_spracovania: 'plny_vyskum' });
}
const vyrNew = vyr.filter(v => !outIco.has(v.ico)).concat(rows).sort((a, b) => (a.status + a.nazov).localeCompare(b.status + b.nazov, 'sk'));
writeCsv('data/vyradene.csv', H, vyrNew);
writeCsv('data/decisions.csv', Object.keys(dec[0]), dec.filter(d => KEEP.has(d.status)));
writeCsv('data/claims.csv', Object.keys(claims[0]), claims.filter(c => !outIco.has(c.ico)));
const inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/investors.json'), 'utf8')).filter(i => !outIco.has(i.ico));
fs.writeFileSync(path.join(ROOT, 'data/investors.json'), JSON.stringify(inv, null, 2) + '\n', 'utf8');

let del = 0;
const rm = p => { const f = path.join(ROOT, p); if (fs.existsSync(f)) { fs.rmSync(f, { recursive: true, force: true }); del++; } };
for (const f of fs.readdirSync(path.join(ROOT, 'raw'))) { const m = f.match(/^(?:REG|RES)-(\d{8})-/); if (m && outIco.has(m[1])) rm(`raw/${f}`); }
for (const dir of ['data/research', 'data/verify'])
  for (const f of fs.readdirSync(path.join(ROOT, dir))) { const m = f.match(/^(\d{8})/); if (m && outIco.has(m[1])) rm(`${dir}/${f}`); }
rm('data/na_vyskum.csv');

// kľúč ručnej kontroly: konečný stav algoritmu
const now = Object.fromEntries(vyrNew.filter(v => v.ico).map(v => [v.ico, v.status]).concat(dec.filter(d => KEEP.has(d.status)).map(d => [d.ico, d.status])));
const key = readCsv('data/review_key.csv'); let ch = 0;
for (const k of key) if (now[k.ico] && k.agent_status !== now[k.ico]) { k.agent_status = now[k.ico]; ch++; }
writeCsv('data/review_key.csv', Object.keys(key[0]), key);
const sample = readCsv('data/review_sample.csv');
for (const s of sample) if (/na_vyskum\.csv/.test(s.claim_ids)) s.claim_ids = s.claim_ids.replace('data/na_vyskum.csv', 'data/vyradene.csv');
for (const s of sample) if (KEEP.has(now[s.ico]) && /vyradene\.csv/.test(s.claim_ids)) s.claim_ids = 'viď data/claims.csv (ico)';
writeCsv('data/review_sample.csv', Object.keys(sample[0]), sample);
console.log(JSON.stringify({ vyradenych: rows.length, ponechanych: dec.filter(d => KEEP.has(d.status)).length, zmazanych_poloziek: del, review_key: ch }));
