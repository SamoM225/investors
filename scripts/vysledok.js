// Konečný výsledok pilotu po overení všetkých 34 subjektov v databáze (data/review_db_filled.csv, 2026-10-11).
// Overenie robil používateľ nad zozbieranými dôkazmi (nie slepá kontrola vzorky). Rozhodnutie overenia je konečné.
// Výstupy: data/databaza_vysledok.csv (konečný stav každého subjektu), logs/vysledok.md (súhrn a presnosť algoritmu).
const fs = require('fs');
const path = require('path');
const { ROOT, readCsv, writeCsv } = require('./lib');

const Z = { P90: 1.6449, P95: 1.96, P98: 2.3263 };
function wilson(k, n, z) {
  const p = k / n, d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
const pct = x => (100 * x).toFixed(1).replace('.', ',') + ' %';
const iv = (k, n) => Object.entries(Z).map(([l, z]) => { const [a, b] = wilson(k, n, z); return `${l}: ${pct(a)} – ${pct(b)}`; }).join(' · ');
const verdikt = (k, n, thr) => Object.entries(Z).map(([l, z]) => { const [a, b] = wilson(k, n, z); return `${l} ${a >= thr ? 'splnené' : b < thr ? 'nesplnené' : 'nerozhodnuteľné'}`; }).join(', ');

const rev = readCsv('data/review_db_filled.csv');
const dec = Object.fromEntries(readCsv('data/decisions.csv').map(d => [d.ico, d]));
const hold = readCsv('data/holdout.csv');
const STAV = { 'potvrdzujem: aktívny investor v rozsahu (VC)': 'aktivny_investor', 'existuje, ale iný typ (PE, angel, holding)': 'iny_typ',
  'neinvestuje / nie je investor': 'neinvestuje', 'nedá sa overiť z verejných zdrojov': 'neoveritelne' };

const rows = rev.map(r => {
  const d = dec[r.ico] || {};
  const stav = STAV[r.human_verdict];
  if (!stav) throw new Error(`neznámy verdikt: ${r.human_verdict}`);
  const algTyp = d.status === 'zaradeny' ? (d.type || 'VC') : d.status === 'typ_nerozhodnuty' ? 'typ_nerozhodnuty' : '';
  return { ico: r.ico, nazov: r.nazov, konecny_stav: stav, konecny_typ: stav === 'aktivny_investor' ? r.human_type : '',
    poznamka: r.human_note, algoritmus_status: d.status, algoritmus_typ: algTyp, algoritmus_podtyp: d.subtype || '',
    zhoda: (stav === 'aktivny_investor') === (d.status === 'zaradeny' || d.status === 'typ_nerozhodnuty') &&
      (stav !== 'aktivny_investor' || r.human_type === algTyp) ? 'áno' : 'nie' };
});
writeCsv('data/databaza_vysledok.csv', Object.keys(rows[0]), rows);

const cnt = (arr, f) => arr.reduce((a, x) => (a[f(x)] = (a[f(x)] || 0) + 1, a), {});
const zar = rows.filter(r => r.algoritmus_status === 'zaradeny');
const zarOk = zar.filter(r => r.konecny_stav === 'aktivny_investor');
const zarTyp = zarOk.filter(r => r.konecny_typ === r.algoritmus_typ);
const nerozh = rows.filter(r => r.algoritmus_status === 'typ_nerozhodnuty');
const neiste = rows.filter(r => r.algoritmus_status === 'neiste');
const holdIco = [...new Set(hold.map(h => h.ico))];
const holdIn = holdIco.filter(i => (rows.find(r => r.ico === i) || {}).konecny_stav === 'aktivny_investor');
const aktiv = rows.filter(r => r.konecny_stav === 'aktivny_investor');
// Výťažnosť regulačného zoznamu (podklad pre globálne škálovanie): SK subjekty v registri NBS so správcom AIF, AIF alebo EuVECA.
const scopes = l => (l || []).flatMap(x => [x.scope].concat(scopes(x.licenses)));
const nbsList = JSON.parse(fs.readFileSync(path.join(ROOT, '.cache/nbs/subjekty-nbs-sk.json'), 'utf8')).institutions
  .filter(i => i.country === 'SK' && /^\d{8}$/.test(i.id) && scopes(i.licenses).some(s => /registrovaný správca alternatívnych|registrovaný alternatívny|samosprávny alternatívny|EuVECA/i.test(s)))
  .map(i => i.id);
const vyrIco = new Set(readCsv('data/vyradene.csv').map(v => v.ico));
const nbsAktiv = nbsList.filter(i => (rows.find(r => r.ico === i) || {}).konecny_stav === 'aktivny_investor');
const nbsDb = nbsList.filter(i => rows.find(r => r.ico === i));
const nbsMimo = nbsList.filter(i => !rows.find(r => r.ico === i) && !vyrIco.has(i));

const L = ['# Konečný výsledok pilotu (VC fondy v SR)', '', `Čas výpočtu: ${new Date().toISOString()}. Zdroj overenia: data/review_db_filled.csv (${rev.length} subjektov, ${rev[0].reviewer_id}).`, '',
  '## Konečný stav databázy', '', '| stav | počet |', '|---|---|',
  ...Object.entries(cnt(rows, r => r.konecny_stav)).map(([k, v]) => `| ${k} | ${v} |`), '',
  '**Aktívni investori podľa typu**', '', '| typ | počet |', '|---|---|', ...Object.entries(cnt(aktiv, r => r.konecny_typ)).map(([k, v]) => `| ${k} | ${v} |`), '',
  '## Presnosť algoritmu', '',
  `- **KU1 presnosť záznamov** (zaradený algoritmom je aktívny investor): ${zarOk.length}/${zar.length} = ${pct(zarOk.length / zar.length)}. Intervaly: ${iv(zarOk.length, zar.length)}. Hranica ≥ 95 %: ${verdikt(zarOk.length, zar.length, 0.95)}.`,
  `- **M3 presnosť typu** (medzi správne zaradenými rovnaký typ): ${zarTyp.length}/${zarOk.length} = ${pct(zarTyp.length / zarOk.length)}.`,
  `- **Nerozhodnutý typ (${nerozh.length})**: aktívny investor ${nerozh.filter(r => r.konecny_stav === 'aktivny_investor').length}, z toho typ určený pri overení ${nerozh.filter(r => r.konecny_stav === 'aktivny_investor' && r.konecny_typ !== 'typ_nerozhodnuty').length}; neinvestuje ${nerozh.filter(r => r.konecny_stav === 'neinvestuje').length}.`,
  `- **Neistí (${neiste.length})**: ${Object.entries(cnt(neiste, r => r.konecny_stav)).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
  `- **Zhoda algoritmu s overením (investor áno/nie aj typ)**: ${rows.filter(r => r.zhoda === 'áno').length}/${rows.length}.`,
  `- **KU3 pokrytie holdoutu**: holdout IČO, ktoré overenie potvrdilo ako aktívneho investora: ${holdIn.length}; všetky sú v databáze. Holdoutové subjekty mimo databázy (vyradené algoritmom) overenie nezahŕňalo.`,
  '', '## Výťažnosť regulačného zoznamu (register NBS: správca AIF, AIF, EuVECA)', '',
  `- V zozname ${nbsList.length} SK subjektov; medzi kandidátmi chýbalo ${nbsMimo.length}.`,
  `- Aktívny investor po overení: ${nbsAktiv.length}/${nbsList.length} = ${pct(nbsAktiv.length / nbsList.length)} (${iv(nbsAktiv.length, nbsList.length)}).`,
  `- V databáze (na ručné overenie): ${nbsDb.length}/${nbsList.length} = ${pct(nbsDb.length / nbsList.length)} (${iv(nbsDb.length, nbsList.length)}).`,
  `- Pokrytie aktívnych investorov zoznamom: ${nbsAktiv.length}/${aktiv.length} = ${pct(nbsAktiv.length / aktiv.length)} (${iv(nbsAktiv.length, aktiv.length)}). Mimo zoznamu: ${aktiv.filter(r => !nbsList.includes(r.ico)).map(r => r.nazov).join('; ')}`,
  '', '## Nezhody', '', '| subjekt | algoritmus | overenie | poznámka |', '|---|---|---|---|',
  ...rows.filter(r => r.zhoda === 'nie').map(r => `| ${r.nazov} (${r.ico}) | ${r.algoritmus_status}${r.algoritmus_podtyp ? ' / ' + r.algoritmus_podtyp : ''} | ${r.konecny_stav}${r.konecny_typ ? ' / ' + r.konecny_typ : ''} | ${r.poznamka} |`),
  '', '## Čo overenie nemeria', '',
  '- **KU4 chybné vyradenia:** 1 296 vyradených subjektov overenie nezahŕňalo.',
  '- **KU2 presnosť polí:** jednotlivé tvrdenia sa ručne neoverovali.',
  '- Overenie prebehlo nad dôkazmi, ktoré zozbierali agenti. Nemeria, či agenti nejakú investíciu neprehliadli.',
];
fs.writeFileSync(path.join(ROOT, 'logs/vysledok.md'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
