// Verejná stopa investovania (negatívny dôkaz pre G4), plan.md 2.3.
// Pre každý subjekt zistí z registrov úrovne A:
//  1. ORSR, spätné vyhľadávanie: v ktorých firmách je (alebo bol) subjekt spoločníkom, komanditistom
//     alebo jediným akcionárom, od kedy, s akým vkladom a či ide o vlastnú účelovú dcéru.
//  2. RÚZ: dlhodobý finančný majetok a podielové cenné papiere z posledných troch riadnych závierok
//     (iba tabuľkové výkazy; fondy, ktoré podávajú iba PDF, majú ruz_stav = bez_tabulky).
// Vstup: G4 riadky z data/vyradene.csv a ponechané subjekty z data/decisions.csv, alebo --ico a,b,c.
// Výstup: data/orsr_podiely.csv, data/footprint.csv. Odpovede registrov sa ukladajú do .cache/ (mimo git).
// Kontakt v hlavičke User-Agent je iba fiktívny (R15).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ROOT, readCsv, writeCsv, inWindow } = require('./lib');

const UA = 'investor-research research@example.org';
const CACHE = path.join(ROOT, '.cache/http');
fs.mkdirSync(CACHE, { recursive: true });
const TODAY = new Date().toISOString().slice(0, 10);
const ROLES = { p1: 'spolocnik', p2: 'komanditista', p5: 'akcionar' };
const W1250 = new TextDecoder('windows-1250');

// ---- HTTP s cache, obmedzením rýchlosti a opakovaním ----
const lastCall = {};
async function throttle(host, ms) {
  const wait = (lastCall[host] || 0) + ms - Date.now();
  lastCall[host] = Math.max(Date.now(), (lastCall[host] || 0) + ms);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
}
let requests = 0;
async function get(url, { binary = false } = {}) {
  const f = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex'));
  if (fs.existsSync(f)) { const b = fs.readFileSync(f); return binary ? b : b.toString('utf8'); }
  const host = new URL(url).hostname;
  for (let i = 0; i < 4; i++) {
    await throttle(host, host.includes('orsr') ? 600 : 250);
    try {
      requests++;
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const b = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(f, b);
      return binary ? b : b.toString('utf8');
    } catch (e) {
      if (i === 3) throw e;
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
    }
  }
}

// ---- pomocné funkcie pre text ----
const strip = s => String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const LEGAL = /[\s,]*(spol\.?\s*s\s*r\.?\s*o\.?|s\.?\s*r\.?\s*o\.?|a\.?\s*s\.?|j\.?\s*s\.?\s*a\.?|k\.?\s*s\.?|v\.?\s*o\.?\s*s\.?|o\.?\s*c\.?\s*p\.?\s*,?\s*a\.?\s*s\.?|správ\.?\s*spol\.?.*|investičný fond.*|v likvidácii)\s*$/i;
function stem(name) {
  let s = String(name).split(',')[0].trim();
  for (let i = 0; i < 3; i++) s = s.replace(LEGAL, '').trim();
  return s.length >= 3 ? s : String(name).trim();
}
const skDate = d => { const m = String(d).match(/(\d{2})\.(\d{2})\.(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
const days = (a, b) => Math.abs((new Date(a) - new Date(b)) / 864e5);
// ORSR očakáva dopyt v kódovaní windows-1250
const ENC = {};
for (let b = 128; b < 256; b++) ENC[W1250.decode(Buffer.from([b]))] = b;
function q1250(s) {
  return [...s].map(ch => {
    const c = ch.charCodeAt(0);
    if (/[A-Za-z0-9]/.test(ch)) return ch;
    const b = c < 128 ? c : ENC[ch];
    return b === undefined ? '%3F' : '%' + b.toString(16).toUpperCase().padStart(2, '0');
  }).join('');
}

// ---- ORSR ----
const ORSR = 'https://www.orsr.sk/';
async function orsrHtml(rel) { return W1250.decode(await get(ORSR + rel, { binary: true })); }

// Výpis rozdelený na sekcie: { 'Spoločníci': [{ text, od, do }], ... }
function parseVypis(html) {
  const out = {};
  const parts = html.split(/<span class="tl">/).slice(1);
  for (const p of parts) {
    const label = strip(p.slice(0, p.indexOf('</span>'))).replace(/:$/, '').trim();
    const entries = [];
    for (const m of p.matchAll(/<td width="67%">([\s\S]*?)<\/td>\s*<td width="33%"[^>]*>([\s\S]*?)<\/td>/g)) {
      const dt = strip(m[2]);
      entries.push({ text: strip(m[1]), od: skDate((dt.match(/od:\s*([\d.]+)/) || [])[1]), do: skDate((dt.match(/do:\s*([\d.]+)/) || [])[1]) });
    }
    out[label] = (out[label] || []).concat(entries);
  }
  return out;
}
const sect = (v, re) => Object.entries(v).filter(([k]) => re.test(k)).flatMap(([, e]) => e);
const icoIn = t => (String(t).match(/IČO:\s*([\d ]{8,11})/) || [])[1]?.replace(/\s/g, '') || '';

async function ownExtract(ico) {
  const html = await orsrHtml(`hladaj_ico.asp?ICO=${ico}&SID=0`);
  const link = (html.match(/href="(vypis\.asp\?ID=\d+&amp;SID=\d+)&amp;P=0"/) || [])[1];
  if (!link) return null;
  const rel = link.replace(/&amp;/g, '&') + '&P=1';
  return { url: ORSR + rel, v: parseVypis(await orsrHtml(rel)) };
}

async function searchHoldings(name, T) {
  const rows = [];
  for (let page = 1; page <= 20; page++) {
    const html = await orsrHtml(`hladaj_osoba.asp?PR=${q1250(name)}&MENO=&SID=0&T=${T}&STR=${page}`);
    for (const tr of html.split(/<tr/i).slice(1)) {
      const sbj = (tr.match(/<div class="sbj">([\s\S]*?)<\/div>/) || [])[1];
      const link = (tr.match(/href="(vypis\.asp\?ID=\d+&amp;SID=\d+)&amp;P=0"/) || [])[1];
      if (!sbj || !link) continue;
      rows.push({ holder: strip(sbj), target: strip((tr.match(/title="Aktuálny výpis">([\s\S]*?)<\/a>/) || [])[1] || ''), rel: link.replace(/&amp;/g, '&') });
    }
    const pg = html.match(/Stránka:(?:&nbsp;|\s)*<b>(\d+)(?:&nbsp;|\s)*\/(?:&nbsp;|\s)*(\d+)<\/b>/);
    if (!pg || +pg[1] >= +pg[2]) break;
  }
  return rows;
}

// zodpovedá meno v zozname výsledkov (môže byť skrátené „...“) hľadanému subjektu?
function holderMatches(displayed, names) {
  const trunc = /\.\.\.$/.test(displayed);
  const d = norm(stem(displayed.replace(/\.\.\.$/, '')));
  return names.some(n => { const s = norm(stem(n)); return d === s || (trunc && s.startsWith(d)) || norm(displayed) === norm(n); });
}

const addrKey = a => norm(a);
const sameAddr = (a, b) => { const x = addrKey(a), y = addrKey(b); return !!x && !!y && (x === y || (x.slice(0, 14) === y.slice(0, 14) && (a.match(/\d{3} ?\d{2}/) || [])[0]?.replace(' ', '') === (b.match(/\d{3} ?\d{2}/) || [])[0]?.replace(' ', ''))); };

async function orsr(ico, fallbackName) {
  const own = await ownExtract(ico);
  const names = own ? sect(own.v, /^Obchodné meno/).map(e => e.text) : [];
  if (!names.length) names.push(fallbackName);
  const seats = own ? sect(own.v, /^Sídlo/).map(e => e.text) : [];
  const stems = [...new Set(names.map(stem))];
  const hits = new Map();
  let queries = 0;
  for (const s of stems) for (const T of Object.keys(ROLES)) {
    queries++;
    for (const r of await searchHoldings(s, T)) if (holderMatches(r.holder, names)) {
      const k = r.rel + '|' + T; if (!hits.has(k)) hits.set(k, { ...r, T });
    }
  }
  const out = [];
  const seenTarget = new Set();
  for (const h of hits.values()) {
    const rel = h.rel + '&P=1';
    if (seenTarget.has(rel + h.T)) continue; seenTarget.add(rel + h.T);
    const html = await orsrHtml(rel);
    const v = parseVypis(html);
    // výpis súdu, ktorý spis odstúpil inému súdu, je zmrazený: jeho „otvorené“ zápisy neplatia
    const stary = /Spis odstúpený na iný registrový súd/.test(html);
    const tIco = (sect(v, /^IČO/)[0] || {}).text?.replace(/\s/g, '') || '';
    const holders = sect(v, /Spoločníci|Akcionár|Komanditist/i);
    const mine = holders.filter(e => icoIn(e.text) === ico || (!icoIn(e.text) && names.some(n => norm(e.text).startsWith(norm(n)))));
    if (!mine.length || tIco === ico) continue;
    const od = mine.map(e => e.od).filter(Boolean).sort()[0] || '';
    const doo = mine.some(e => !e.do) ? '' : mine.map(e => e.do).sort().pop();
    const current = holders.filter(e => !e.do);
    const deposits = sect(v, /Výška vkladu/).filter(e => names.some(n => norm(e.text).startsWith(norm(n).slice(0, 12))));
    const vklad = deposits.filter(e => !e.do).map(e => (e.text.match(/Vklad:\s*([\d ]+)\s*EUR/) || [])[1]).filter(Boolean).map(x => +x.replace(/\s/g, ''))[0] || '';
    const zapis = (sect(v, /^Deň zápisu/)[0] || {}).text ? skDate(sect(v, /^Deň zápisu/)[0].text) : '';
    const tSeats = sect(v, /^Sídlo/).map(e => e.text);
    const renames = sect(v, /^Obchodné meno/).map(e => e.od).filter(Boolean);
    const before = holders.filter(e => e.do && e.do <= od);
    const jediny = h.T === 'p5' || (current.length === 1 && mine.includes(current[0]));
    const zalozenie = !!zapis && !!od && days(zapis, od) <= 3;
    const readyMade = !!zapis && !!od && !zalozenie && days(zapis, od) <= 365 && renames.some(r => days(r, od) <= 14) &&
      before.length > 0 && before.every(e => days(e.do, od) <= 14);
    const rovnakeSidlo = tSeats.some(a => seats.some(b => sameAddr(a, b)));
    // navýšenie vkladu: zápis s vyššou sumou ako všetky predchádzajúce (nový zápis tej istej sumy, napr. po zmene adresy, sa neráta)
    const amt = e => +((e.text.match(/Vklad:\s*([\d ]+)\s*EUR/) || [])[1] || '').replace(/\s/g, '') || 0;
    const dep = deposits.filter(e => e.od && amt(e)).sort((a, b) => a.od.localeCompare(b.od));
    const navysenia = dep.filter((e, i) => i > 0 && amt(e) > Math.max(...dep.slice(0, i).map(amt))).map(e => e.od);
    out.push({ investor_ico: ico, ciel_ico: tIco, ciel_nazov: (sect(v, /^Obchodné meno/).find(e => !e.do) || {}).text || h.target,
      rola: ROLES[h.T], od, do: doo, vklad_eur: vklad, ciel_den_zapisu: zapis,
      jediny_spolocnik: jediny ? 1 : 0, rovnake_sidlo: rovnakeSidlo ? 1 : 0, zalozenie: zalozenie ? 1 : 0, ready_made: readyMade ? 1 : 0,
      vlastna_dcera: jediny && (rovnakeSidlo || zalozenie || readyMade) ? 1 : 0,
      vstup_v_okne: inWindow(od) ? 1 : 0, navysenie_vkladu_v_okne: navysenia.filter(d => inWindow(d)).pop() || '',
      zhoda: mine.some(e => icoIn(e.text) === ico) ? 'ico' : 'nazov', vypis_url: ORSR + rel, datum_dopytu: TODAY, stary });
  }
  // firma presunutá k inému registrovému súdu má v ORSR dva výpisy: zlúčiť podľa IČO cieľa
  const merged = new Map();
  for (const h of out) {
    const k = h.ciel_ico || h.vypis_url, m = merged.get(k);
    if (!m) { merged.set(k, { ...h }); continue; }
    m.od = [m.od, h.od].filter(Boolean).sort()[0] || '';
    // stav (do, vklad) berie z aktuálneho výpisu; zmrazený výpis pôvodného súdu rozhoduje, iba keď iný nie je
    if (m.stary && !h.stary) { m.do = h.do; m.vklad_eur = h.vklad_eur; m.jediny_spolocnik = h.jediny_spolocnik; m.stary = false; }
    else if (m.stary === h.stary) { m.do = !m.do || !h.do ? '' : [m.do, h.do].sort().pop(); if (!m.do && h.vklad_eur) m.vklad_eur = h.vklad_eur; }
    for (const f of ['rovnake_sidlo', 'zalozenie', 'ready_made']) m[f] = Math.max(m[f], h[f]);
    m.vlastna_dcera = m.jediny_spolocnik && (m.rovnake_sidlo || m.zalozenie || m.ready_made) ? 1 : 0;
    m.navysenie_vkladu_v_okne = [m.navysenie_vkladu_v_okne, h.navysenie_vkladu_v_okne].filter(Boolean).sort().pop() || '';
    m.vstup_v_okne = inWindow(m.od) ? 1 : 0;
    if (h.zhoda === 'ico') m.zhoda = 'ico';
    m.vypis_url += ' ' + h.vypis_url;
  }
  return { holdings: [...merged.values()].map(({ stary, ...h }) => h), queries, names: names.length, own_url: own ? own.url : '' };
}

// ---- RÚZ ----
const RUZ = 'https://www.registeruz.sk/cruz-public/api/';
const ruzJson = async rel => JSON.parse(await get(RUZ + rel));
const templates = {};
async function template(id) { return templates[id] ||= await ruzJson(`sablona?id=${id}`); }

async function ruz(ico) {
  const l = await ruzJson(`uctovne-jednotky?zmenene-od=2000-01-01&ico=${ico}`);
  const zav = [];
  for (const id of l.id || []) {
    const u = await ruzJson(`uctovna-jednotka?id=${id}`);
    if (u.ico !== ico) continue;
    for (const zid of u.idUctovnychZavierok || []) zav.push({ zid, ...(await ruzJson(`uctovna-zavierka?id=${zid}`)) });
  }
  const riadne = zav.filter(z => /riadna/i.test(z.typ || '')).sort((a, b) => String(b.obdobieDo).localeCompare(String(a.obdobieDo)));
  if (!riadne.length) return { ruz_stav: 'bez_zavierky', series: {} };
  const series = {}; let anyTable = false, url = '', lastYear = '';
  for (const z of riadne.slice(0, 3)) {
    for (const vid of z.idUctovnychVykazov || []) {
      const v = await ruzJson(`uctovny-vykaz?id=${vid}`);
      const tabs = (v.obsah || {}).tabulky || [];
      if (!tabs.length || !v.idSablony) continue;
      const s = await template(v.idSablony);
      const ti = s.tabulky.findIndex(t => /aktív/i.test(t.nazov?.sk || ''));
      if (ti < 0 || !tabs[ti]) continue;
      const st = s.tabulky[ti], k = st.pocetDatovychStlpcov, data = tabs[ti].data || [];
      const [cur, prev] = k === 4 ? [2, 3] : k === 2 ? [0, 1] : [null, null];
      if (cur === null) continue;
      const val = (row, c) => { const x = data[(row.cisloRiadku - 1) * k + c]; return x === '' || x === undefined ? 0 : Number(x); };
      const dfmRow = st.riadky.find(r => /^Dlhodobý finančný majetok/i.test(r.text?.sk || ''));
      const podRows = st.riadky.filter(r => /^(Podielové cenné papiere|Ostatné realizovateľné cenné papiere a podiely)/i.test(r.text?.sk || ''));
      if (!dfmRow) continue;
      const y = String(z.obdobieDo).slice(0, 4), yp = String(+y - 1);
      series[y] ||= { dfm: val(dfmRow, cur), podiely: podRows.reduce((a, r) => a + val(r, cur), 0) };
      series[yp] ||= { dfm: val(dfmRow, prev), podiely: podRows.reduce((a, r) => a + val(r, prev), 0) };
      anyTable = true; if (!url) { url = RUZ + `uctovny-vykaz?id=${vid}`; lastYear = y; }
      break;
    }
  }
  return { ruz_stav: anyTable ? 'tabulka' : 'bez_tabulky', series, url, lastYear, posledna_zavierka: riadne[0].obdobieDo };
}

// ---- hlavný beh ----
(async () => {
  const arg = process.argv.indexOf('--ico');
  let subjects;
  if (arg > 0) subjects = process.argv[arg + 1].split(',').map(ico => ({ ico, nazov: '' }));
  else {
    const g4 = readCsv('data/vyradene.csv').filter(v => v.brana === 'G4' && v.ico).map(v => ({ ico: v.ico, nazov: v.nazov }));
    const kept = readCsv('data/decisions.csv').filter(d => d.ico).map(d => ({ ico: d.ico, nazov: d.name }));
    subjects = [...new Map(g4.concat(kept).map(s => [s.ico, s])).values()];
  }
  const prevHold = readCsv('data/orsr_podiely.csv').filter(h => !subjects.some(s => s.ico === h.investor_ico));
  const prevFp = readCsv('data/footprint.csv').filter(f => !subjects.some(s => s.ico === f.ico));
  const holdings = [], fp = [];
  let done = 0;
  const work = subjects.slice();
  async function worker() {
    for (let s; (s = work.shift());) {
      const row = { ico: s.ico, nazov: s.nazov, datum_dopytu: TODAY };
      try {
        const o = await orsr(s.ico, s.nazov);
        holdings.push(...o.holdings);
        Object.assign(row, { orsr_stav: 'ok', orsr_dopytov: o.queries, orsr_podielov: o.holdings.length,
          orsr_vlastne_dcery: o.holdings.filter(h => h.vlastna_dcera == 1).length, orsr_vypis_investora: o.own_url });
      } catch (e) { row.orsr_stav = 'chyba: ' + e.message; }
      try {
        const r = await ruz(s.ico);
        Object.assign(row, { ruz_stav: r.ruz_stav, ruz_posledna_zavierka: r.posledna_zavierka || '', ruz_rady: JSON.stringify(r.series), ruz_url: r.url || '' });
      } catch (e) { row.ruz_stav = 'chyba: ' + e.message; }
      fp.push(row);
      if (++done % 25 === 0) console.error(`${done}/${subjects.length} (požiadaviek ${requests})`);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  const H = ['investor_ico', 'ciel_ico', 'ciel_nazov', 'rola', 'od', 'do', 'vklad_eur', 'ciel_den_zapisu', 'jediny_spolocnik', 'rovnake_sidlo',
    'zalozenie', 'ready_made', 'vlastna_dcera', 'vstup_v_okne', 'navysenie_vkladu_v_okne', 'zhoda', 'vypis_url', 'datum_dopytu'];
  writeCsv('data/orsr_podiely.csv', H, prevHold.concat(holdings).sort((a, b) => (a.investor_ico + a.od).localeCompare(b.investor_ico + b.od)));
  writeCsv('data/footprint.csv', ['ico', 'nazov', 'orsr_stav', 'orsr_dopytov', 'orsr_podielov', 'orsr_vlastne_dcery', 'orsr_vypis_investora',
    'ruz_stav', 'ruz_posledna_zavierka', 'ruz_rady', 'ruz_url', 'datum_dopytu'], prevFp.concat(fp).sort((a, b) => a.ico.localeCompare(b.ico)));
  console.log(JSON.stringify({ subjektov: subjects.length, podielov: holdings.length, poziadaviek: requests,
    orsr_chyby: fp.filter(f => f.orsr_stav !== 'ok').length, ruz: fp.reduce((a, f) => (a[f.ruz_stav] = (a[f.ruz_stav] || 0) + 1, a), {}) }));
})();
