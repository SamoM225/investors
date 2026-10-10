// Vygeneruje lokálnu stránku data/review.html na ručnú kontrolu.
// Záložky:
//  - Záznamy, Tvrdenia: slepá kontrola vzorky (kontrolór nevidí status, typ ani verdikty agentov),
//  - Reálne záznamy, Porovnanie (doplnené 2026-10-10 na pokyn používateľa): obsah databázy s rozhodnutiami
//    algoritmu a všetkými dôkazmi (tvrdenia, citáty, články, registre, lokálne kópie zdrojov, poznámky výskumníka).
//    Porovnanie: vľavo zaradení, vpravo neistí a typ_nerozhodnuty na ručné overenie. Tieto záložky rušia slepotu,
//    preto sa otvoria až po potvrdení.
// Výsledky sa ukladajú v prehliadači a exportujú do CSV (review_sample_filled.csv, review_claims_filled.csv,
// review_db_filled.csv).
// Tvrdenia vyradených subjektov zo vzorky boli pri očistení zmazané; generátor ich preberá z doterajšej review.html.
const fs = require('fs');
const path = require('path');
const { ROOT, readCsv } = require('./lib');

const sample = readCsv('data/review_sample.csv');
const claimSample = readCsv('data/review_claims.csv');
const claims = readCsv('data/claims.csv');
const byId = Object.fromEntries(claims.map(c => [c.claim_id, c]));
const pick = c => c && ({ claim_id: c.claim_id, field: c.field, value: c.value, target_ico: c.target_ico, flags: c.flags,
  level: c.source_level, url: c.source_url, published: c.source_published_at, quote: c.quote });

// doterajšia stránka: tvrdenia, ktoré už v claims.csv nie sú
let prev = { records: [], claimRows: [] };
const prevFile = path.join(ROOT, 'data/review.html');
if (fs.existsSync(prevFile)) {
  const s = fs.readFileSync(prevFile, 'utf8');
  const m = s.match(/const D=(\{[\s\S]*?\});\/\*D_END\*\//) || s.match(/const D=(\{[\s\S]*?\});\nconst /);
  if (m) try { prev = JSON.parse(m[1]); } catch (e) { /* stará stránka bez dát */ }
}
const prevRec = Object.fromEntries((prev.records || []).map(r => [r.review_id, r.claims]));
const prevClaim = Object.fromEntries((prev.claimRows || []).map(c => [c.claim_id, c]));

const records = sample.map(r => {
  const ids = r.claim_ids.split('|').filter(id => byId[id]);
  const own = claims.filter(c => c.ico === r.ico && c.verifier_verdict === 'potvrdene' && /^REG-/.test(c.claim_id));
  const cs = ids.length ? ids.map(id => pick(byId[id])) : (prevRec[r.review_id] && prevRec[r.review_id].length ? prevRec[r.review_id] : own.map(pick));
  return { review_id: r.review_id, ico: r.ico, name: r.name, claims: cs };
});
const claimRows = claimSample.map(r => byId[r.claim_id] ? { ...pick(byId[r.claim_id]), ico: byId[r.claim_id].ico } : prevClaim[r.claim_id]).filter(Boolean);

// databáza: ponechané subjekty so všetkými dôkazmi
const dec = readCsv('data/decisions.csv');
const hold = readCsv('data/orsr_podiely.csv');
const fp = Object.fromEntries(readCsv('data/footprint.csv').map(f => [f.ico, f]));
const verify = {};
for (const f of fs.readdirSync(path.join(ROOT, 'data/verify')).filter(f => f.endsWith('.csv')))
  for (const v of readCsv(`data/verify/${f}`)) verify[v.claim_id] = v;
const notesOf = ico => fs.readdirSync(path.join(ROOT, 'data/research')).filter(f => f.startsWith(ico) && f.endsWith('.md')).sort()
  .map(f => ({ file: f, text: fs.readFileSync(path.join(ROOT, 'data/research', f), 'utf8') }));
const parse = v => { try { return JSON.parse(v); } catch { return null; } };

const db = dec.map(d => {
  const mine = claims.filter(c => c.ico === d.ico);
  const full = c => ({ ...pick(c), raw: c.raw_file, verdict: c.verifier_verdict, vnote: c.verifier_note || (verify[c.claim_id] || {}).verifier_note || '' });
  const ok = mine.filter(c => c.verifier_verdict === 'potvrdene');
  const inv = ok.filter(c => c.field === 'investicia').map(c => {
    const v = parse(c.value) || {};
    const by = f => ok.filter(x => x.field === f && x.target_ico === c.target_ico).map(x => x.value);
    return { ...full(c), target: v.target || '', datum: v.datum || '', forma: v.forma || '',
      faza: by('faza'), velkost: by('velkost_firmy').map(x => (parse(x) || {}).kategoria || x), typ: by('typ_podielu') };
  }).sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
  return {
    ico: d.ico, name: d.name, status: d.status, subtype: d.subtype, confidence: d.confidence, flags: d.flags, reason: d.reason,
    last: d.last_investment_date, candidate_types: d.candidate_types,
    inv, claims: mine.filter(c => c.field !== 'investicia').map(full),
    holdings: hold.filter(h => h.investor_ico === d.ico).map(h => ({ ciel: h.ciel_nazov, ico: h.ciel_ico, od: h.od, do: h.do, vklad: h.vklad_eur,
      vlastna: h.vlastna_dcera, okno: h.vstup_v_okne === '1' || !!h.navysenie_vkladu_v_okne, url: String(h.vypis_url).split(' ')[0] })),
    ruz: fp[d.ico] ? { stav: fp[d.ico].ruz_stav, rady: parse(fp[d.ico].ruz_rady) || {}, url: fp[d.ico].ruz_url } : null,
    notes: notesOf(d.ico),
  };
});

const data = JSON.stringify({ records, claimRows, db }).replace(/</g, '\\u003c');

const CSS = String.raw`
:root{--bg:#fafaf8;--fg:#1d1d1b;--mut:#6b6b66;--line:#ddddd6;--card:#fff;--acc:#2f5d8a;--ok:#2e7d4f;--warn:#9a6700;--bad:#b42318;--soft:#f1f0ea}
@media (prefers-color-scheme:dark){:root{--bg:#1a1a19;--fg:#ececea;--mut:#a0a09a;--line:#3a3a37;--card:#232322;--acc:#7fb0e0;--ok:#6fc38f;--warn:#e3b341;--bad:#f97066;--soft:#2a2a28}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}
header{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;z-index:2}
main{max-width:1000px;margin:0 auto;padding:16px}main.wide{max-width:1500px}
button,select,input,textarea{font:inherit;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:5px 8px}
button{cursor:pointer}button.on{border-color:var(--acc);color:var(--acc)}
details{background:var(--card);border:1px solid var(--line);border-radius:8px;margin:8px 0;padding:8px 12px}
details details{background:var(--soft)}
summary{cursor:pointer;font-weight:600}summary .done{color:var(--ok);font-weight:400}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:13px}td,th{border-top:1px solid var(--line);padding:5px;vertical-align:top;text-align:left}
td.q{font-family:ui-monospace,monospace;font-size:12px;word-break:break-word}a{color:var(--acc);word-break:break-word}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:8px}
label{display:flex;flex-direction:column;font-size:13px;color:var(--mut)}.mut{color:var(--mut);font-size:13px}
.wrap{overflow-x:auto}
.cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}.cols>div{min-width:0}
.qq{font-family:ui-monospace,monospace;font-size:12px;word-break:break-word;overflow-wrap:anywhere}.mut{overflow-wrap:anywhere}.pill{white-space:nowrap}
table.inv td:nth-child(1){width:24%}table.inv td:nth-child(2){width:92px}table.inv td:nth-child(3){width:20%}@media (max-width:900px){.cols{grid-template-columns:1fr}}
.colh{position:sticky;top:58px;background:var(--bg);padding:6px 0;margin:0;font-size:16px;z-index:1}
.pill{display:inline-block;font-size:12px;font-weight:500;border:1px solid var(--line);border-radius:99px;padding:1px 8px;margin-left:4px}
.pill.ok{color:var(--ok);border-color:var(--ok)}.pill.warn{color:var(--warn);border-color:var(--warn)}.pill.bad{color:var(--bad);border-color:var(--bad)}
.box{border-left:3px solid var(--warn);padding:6px 10px;margin:8px 0;background:var(--soft);font-size:14px}
pre{white-space:pre-wrap;word-break:break-word;font-size:12px;background:var(--soft);padding:8px;border-radius:6px;max-height:420px;overflow:auto}
ul.src{margin:4px 0;padding-left:18px;font-size:13px}
`;

const CLIENT = String.raw`
const KEY='pilot-review-v1';let S={r:{},c:{},d:{}};try{S=Object.assign(S,JSON.parse(localStorage.getItem(KEY))||{})}catch(e){}S.d=S.d||{};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}prog()};
const esc=s=>String(s??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const rev=document.getElementById('rev');rev.value=S.reviewer||'';rev.oninput=()=>{S.reviewer=rev.value;save()};
const STAT=['','zaradeny','neiste','typ_nerozhodnuty','vyradeny_register','vyradeny_typ','vyradeny_neaktivny','vyradeny_bez_investicii','mimo_rozsahu'];
const TYP=['','VC','PE','typ_nerozhodnuty','iny'];const SUB=['','VC','korporatne_VC','statny_fond','akcelerator_investujuci'];
const VER=['','potvrdene','nepotvrdene','rozporne'];
const DBV=['','potvrdzujem: aktívny investor v rozsahu (VC)','existuje, ale iný typ (PE, angel, holding)','neinvestuje / nie je investor','nedá sa overiť z verejných zdrojov'];
const sel=(o,v,a)=>'<select '+a+'>'+o.map(x=>'<option'+(x===v?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select>';
const links=ico=>'<a target=_blank href="https://www.orsr.sk/hladaj_ico.asp?ICO='+ico+'&SID=0">ORSR</a> · <a target=_blank href="https://www.orsr.sk/hladaj_osoba.asp?PR=&T=p1">ORSR podiely (hľadať podľa názvu)</a> · <a target=_blank href="https://api.statistics.sk/rpo/v1/search?identifier='+ico+'">RPO</a> · <a target=_blank href="https://www.registeruz.sk/cruz-public/domain/accountingentity/simplesearch?ico='+ico+'">RÚZ</a> · <a target=_blank href="https://www.google.com/search?q=%22'+ico+'%22">vyhľadať IČO</a>';
const ctable=cs=>cs.length?'<div class=wrap><table><tr><th>pole</th><th>hodnota</th><th>úroveň</th><th>zdroj</th><th>citát</th></tr>'+cs.map(c=>'<tr><td>'+esc(c.field)+(c.target_ico?'<br><span class=mut>cieľ '+esc(c.target_ico)+'</span>':'')+'</td><td>'+esc(c.value)+(c.flags?'<br><span class=mut>'+esc(c.flags)+'</span>':'')+'</td><td>'+esc(c.level)+'</td><td><a target=_blank href="'+esc(c.url)+'">otvoriť</a><br><span class=mut>'+esc(c.published)+'</span></td><td class=q>'+esc(c.quote)+'</td></tr>').join('')+'</table></div>':'<p class=mut>Bez tvrdení (subjekt bol vyradený skôr). Rozhodni sám podľa registrov a webu.</p>';

/* ---------- slepá kontrola ---------- */
function recs(){wide(false);const m=document.getElementById('m');m.innerHTML='<p class=mut>Vzorka je náhodná a obsahuje zaradené aj vyradené subjekty: väčšinu tvoria vyradené. Kontroluje sa aj to, či algoritmus nevyradil skutočného investora (KU4). To, že je subjekt v tomto zozname, teda neznamená, že ho algoritmus zaradil. Pre každý subjekt sám urč status a typ podľa brán G1–G5 (plan.md, bod 2). Ak subjekt existuje, ale verejné zdroje neukazujú investíciu do cudzej firmy, zvoľ vyradeny_bez_investicii. Zdroje otvor naživo. Rozhodnutia agentov tu zámerne nie sú.</p>'+D.records.map(r=>{const s=S.r[r.review_id]||{};return '<details data-id="'+r.review_id+'"><summary>'+r.review_id+' · '+esc(r.name)+' <span class=mut>('+r.ico+')</span> '+(s.status?'<span class=done>✓ '+s.status+'</span>':'')+'</summary><p class=mut>'+links(r.ico)+'</p>'+ctable(r.claims)+'<div class=grid><label>Status'+sel(STAT,s.status,'data-k=status')+'</label><label>Typ'+sel(TYP,s.type,'data-k=type')+'</label><label>Podtyp'+sel(SUB,s.subtype,'data-k=subtype')+'</label><label>Minúty<input type=number min=0 data-k=minutes value="'+esc(s.minutes)+'"></label></div><label style="margin-top:8px">Poznámka (prečo, zdroj)<textarea rows=2 data-k=note>'+esc(s.note)+'</textarea></label></details>'}).join('');
m.querySelectorAll('details').forEach(d=>{const id=d.dataset.id;d.addEventListener('toggle',()=>{if(d.open&&!(S.r[id]||{}).t0){(S.r[id]=S.r[id]||{}).t0=Date.now();save()}});d.querySelectorAll('[data-k]').forEach(el=>el.onchange=()=>{const o=S.r[id]=S.r[id]||{};o[el.dataset.k]=el.value;if(el.dataset.k==='status'&&!o.minutes&&o.t0){o.minutes=Math.max(1,Math.round((Date.now()-o.t0)/60000));d.querySelector('[data-k=minutes]').value=o.minutes}save();d.querySelector('summary').innerHTML=d.querySelector('summary').innerHTML.replace(/<span class="done">.*<\/span>$/,'')+(o.status?'<span class=done>✓ '+o.status+'</span>':'')})})}
function cl(){wide(false);const m=document.getElementById('m');m.innerHTML='<p class=mut>Pri každom tvrdení otvor zdroj a over: citát tam je, dokladá tvrdenie, ide o správne IČO, dátum sedí, úroveň A–D je správna.</p>'+D.claimRows.map(c=>{const s=S.c[c.claim_id]||{};return '<details data-id="'+esc(c.claim_id)+'"><summary>'+esc(c.claim_id)+' · '+esc(c.field)+' '+(s.verdict?'<span class=done>✓ '+s.verdict+'</span>':'')+'</summary>'+ctable([c])+'<div class=grid><label>Verdikt'+sel(VER,s.verdict,'data-k=verdict')+'</label></div><label style="margin-top:8px">Poznámka<textarea rows=2 data-k=note>'+esc(s.note)+'</textarea></label></details>'}).join('');
m.querySelectorAll('details').forEach(d=>{const id=d.dataset.id;d.querySelectorAll('[data-k]').forEach(el=>el.onchange=()=>{(S.c[id]=S.c[id]||{})[el.dataset.k]=el.value;save()})})}

/* ---------- databáza s rozhodnutiami ---------- */
const STLABEL={zaradeny:['zaradený','ok'],neiste:['neistý','warn'],typ_nerozhodnuty:['typ nerozhodnutý','warn']};
const pill=(t,c)=>'<span class="pill '+(c||'')+'">'+esc(t)+'</span>';
function why(x){
  if(x.status==='zaradeny')return 'Algoritmus ho zaradil: '+esc(x.reason)+'. Over, že investície v okne (2023-10-09 až 2026-10-09) naozaj existujú a že ide o menšinové podiely v mladých firmách (VC).';
  if(x.status==='typ_nerozhodnuty')return 'Investuje (doložená investícia v okne), ale typ VC/PE sa nedá určiť automaticky: '+esc(x.reason)+'. Over zrelosť cieľových firiem a typ podielov.';
  if(/registre_nevysvetlene/.test(x.flags))return 'Výskum nenašiel konkrétnu investíciu v okne, ale registre ukazujú investičnú aktivitu ('+esc(x.reason.replace(/^výskum nenašiel investíciu v okne, ale registre ukazujú aktivitu: /,''))+'). Over, či ide o investície do cudzích firiem, alebo o vlastné dcéry, pôžičky či presuny v skupine.';
  return 'Neistý: '+esc(x.reason)+'.';
}
function srcList(x){const all=x.inv.concat(x.claims).filter(c=>c.url);const seen={};const out=[];
  for(const c of all){if(seen[c.url])continue;seen[c.url]=1;let host='';try{host=new URL(c.url).hostname.replace(/^www\./,'')}catch(e){}out.push({c,host})}
  const art=out.filter(o=>/^[BC]$/.test(o.c.level)),reg=out.filter(o=>!/^[BC]$/.test(o.c.level));
  const li=o=>'<li>'+pill(o.c.level)+' <a target=_blank href="'+esc(o.c.url)+'">'+esc(o.host||o.c.url)+'</a> <span class=mut>'+esc(o.c.published)+' · '+esc(o.c.field)+'</span>'+(o.c.raw?' · <a target=_blank href="../'+esc(o.c.raw)+'">lokálna kópia</a>':'')+'</li>';
  return '<p><b>Články a weby (úroveň B/C)</b> '+(art.length?'':'<span class=mut>žiadne</span>')+'</p>'+(art.length?'<ul class=src>'+art.map(li).join('')+'</ul>':'')+
    '<p><b>Registre (úroveň A)</b> '+(reg.length?'':'<span class=mut>žiadne</span>')+'</p>'+(reg.length?'<ul class=src>'+reg.map(li).join('')+'</ul>':'')}
function invTable(x){if(!x.inv.length)return '<p class=mut>Žiadna potvrdená investícia.</p>';
  return '<div class=wrap><table class=inv><tr><th>cieľová firma</th><th>dátum</th><th>podiel / zrelosť</th><th>zdroj a citát</th></tr>'+x.inv.map(i=>{const okno=i.datum>='2023-10-09';return '<tr><td>'+esc(i.target)+'<br><span class=mut>IČO '+esc(i.target_ico)+'</span><br><a target=_blank href="https://www.orsr.sk/hladaj_ico.asp?ICO='+esc(i.target_ico)+'&SID=0">ORSR</a> · <a target=_blank href="https://www.google.com/search?q=%22'+encodeURIComponent(i.target)+'%22">hľadať</a></td><td>'+esc(i.datum)+'<br>'+(okno?pill('v okne','ok'):pill('pred oknom'))+'</td><td>'+esc(i.forma)+(i.typ.length?'<br>'+esc(i.typ.join(', ')):'')+(i.velkost.length?'<br><span class=mut>veľkosť: '+esc(i.velkost.join(', '))+'</span>':'')+(i.faza.length?'<br><span class=mut>fáza: '+esc(i.faza.join(', '))+'</span>':'')+'</td><td>'+pill(i.level)+' <a target=_blank href="'+esc(i.url)+'">otvoriť</a>'+(i.raw?' · <a target=_blank href="../'+esc(i.raw)+'">kópia</a>':'')+'<div class=qq>'+esc(i.quote)+'</div>'+(i.flags?'<span class=mut>'+esc(i.flags)+'</span>':'')+'</td></tr>'}).join('')+'</table></div>'}
function holdTable(x){if(!x.holdings.length)return '<p class=mut>ORSR: subjekt nie je spoločníkom žiadnej firmy (alebo spätné vyhľadávanie neprebehlo).</p>';
  return '<div class=wrap><table><tr><th>firma (ORSR)</th><th>od – do</th><th>vklad</th><th></th></tr>'+x.holdings.map(h=>'<tr><td><a target=_blank href="'+esc(h.url)+'">'+esc(h.ciel)+'</a><br><span class=mut>'+esc(h.ico)+'</span></td><td>'+esc(h.od)+' – '+esc(h.do||'trvá')+'</td><td>'+esc(h.vklad)+'</td><td>'+(h.vlastna==='1'?pill('vlastná dcéra'):'')+(h.okno?pill('v okne','ok'):'')+'</td></tr>').join('')+'</table></div>'}
function ruzBox(x){if(!x.ruz)return '';const r=x.ruz.rady,ys=Object.keys(r).sort();if(!ys.length)return '<p class=mut>RÚZ: '+esc(x.ruz.stav)+' (bez tabuľkového výkazu).</p>';
  return '<p class=mut>RÚZ, podielové cenné papiere k 31. 12.: '+ys.map(y=>y+': '+Number(r[y].podiely||0).toLocaleString('sk-SK')+' €').join(' · ')+(x.ruz.url?' · <a target=_blank href="'+esc(x.ruz.url)+'">výkaz</a>':'')+'</p>'}
function form(x){const s=S.d[x.ico]||{};return '<div class=grid><label>Ručné rozhodnutie'+sel(DBV,s.verdict,'data-k=verdict')+'</label><label>Typ'+sel(TYP,s.type,'data-k=type')+'</label><label>Minúty<input type=number min=0 data-k=minutes value="'+esc(s.minutes)+'"></label></div><label style="margin-top:8px">Doložené zdroje (URL článkov, výpisov), ktoré si našiel<textarea rows=2 data-k=sources>'+esc(s.sources)+'</textarea></label><label style="margin-top:8px">Poznámka<textarea rows=2 data-k=note>'+esc(s.note)+'</textarea></label>'}
function card(x,open){const s=S.d[x.ico]||{};const L=STLABEL[x.status]||[x.status,''];
  const others=x.claims.filter(c=>c.verdict==='potvrdene'),rej=x.claims.filter(c=>c.verdict&&c.verdict!=='potvrdene').concat(x.inv.filter(c=>c.verdict&&c.verdict!=='potvrdene'));
  return '<details class=db data-ico="'+x.ico+'"'+(open?' open':'')+'><summary>'+esc(x.name)+' <span class=mut>('+x.ico+')</span>'+pill(L[0],L[1])+(x.subtype?pill(x.subtype):'')+(x.confidence?pill('dôvera '+x.confidence):'')+(s.verdict?' <span class=done>✓ '+esc(s.verdict.split(':')[0])+'</span>':'')+'</summary>'+
  '<div class=box>'+why(x)+'</div><p class=mut>'+links(x.ico)+'</p>'+
  '<p><b>Investície ('+x.inv.length+')</b>'+(x.last?' <span class=mut>posledná v okne: '+esc(x.last)+'</span>':'')+'</p>'+invTable(x)+
  srcList(x)+
  '<details><summary>Podiely podľa ORSR ('+x.holdings.length+') a RÚZ</summary>'+holdTable(x)+ruzBox(x)+'</details>'+
  '<details><summary>Ostatné potvrdené tvrdenia ('+others.length+')</summary>'+ctable(others)+'</details>'+
  (rej.length?'<details><summary>Tvrdenia, ktoré Overovateľ zamietol ('+rej.length+')</summary><div class=wrap><table><tr><th>pole</th><th>hodnota</th><th>verdikt</th><th>dôvod</th></tr>'+rej.map(c=>'<tr><td>'+esc(c.field)+'</td><td>'+esc(c.value)+'</td><td>'+esc(c.verdict)+'</td><td>'+esc(c.vnote)+'</td></tr>').join('')+'</table></div></details>':'')+
  x.notes.map(n=>'<details><summary>Poznámky výskumníka: '+esc(n.file)+'</summary><pre>'+esc(n.text)+'</pre></details>').join('')+
  form(x)+'</details>'}
function bind(m){m.querySelectorAll('details.db').forEach(d=>{const ico=d.dataset.ico;d.addEventListener('toggle',()=>{if(d.open&&!(S.d[ico]||{}).t0){(S.d[ico]=S.d[ico]||{}).t0=Date.now();save()}});
  d.querySelectorAll(':scope > .grid [data-k], :scope > label > [data-k]').forEach(el=>el.onchange=()=>{const o=S.d[ico]=S.d[ico]||{};o[el.dataset.k]=el.value;if(el.dataset.k==='verdict'&&!o.minutes&&o.t0){o.minutes=Math.max(1,Math.round((Date.now()-o.t0)/60000));const mm=d.querySelector(':scope > .grid [data-k=minutes]');if(mm)mm.value=o.minutes}save()})})}
function unblind(){if(S.unblind)return true;if(confirm('Tieto záložky ukazujú rozhodnutia algoritmu. Ak ešte robíš slepú kontrolu (Záznamy, Tvrdenia), dokonči ju najprv, inak meranie presnosti (KU1, KU4) stratí hodnotu. Pokračovať?')){S.unblind=true;save();return true}return false}
const ZAR=()=>D.db.filter(x=>x.status==='zaradeny'),NEI=()=>D.db.filter(x=>x.status!=='zaradeny');
function real(){wide(false);const m=document.getElementById('m');m.innerHTML='<p class=mut>Iba subjekty, ktoré algoritmus zaradil do databázy ('+ZAR().length+'). Pri každom sú investície s citátom, články, registre, lokálne kópie zdrojov a poznámky výskumníka.</p>'+ZAR().map(x=>card(x,false)).join('');bind(m)}
function cmp(){wide(true);const m=document.getElementById('m');m.innerHTML='<p class=mut>Vľavo zaradení ('+ZAR().length+'), vpravo subjekty na ručné overenie ('+NEI().length+': neistí a typ nerozhodnutý). Pri každom subjekte vpravo je uvedené, čo treba overiť, a všetky dôkazy, ktoré sa našli. Rozhodnutie zapíš do formulára a exportuj CSV.</p><div class=cols><div><h3 class=colh>Reálne (zaradené)</h3>'+ZAR().map(x=>card(x,false)).join('')+'</div><div><h3 class=colh>Na overenie</h3>'+NEI().sort((a,b)=>a.status.localeCompare(b.status)).map(x=>card(x,false)).join('')+'</div></div>';bind(m)}

function wide(w){document.getElementById('m').className=w?'wide':''}
function prog(){const a=D.records.filter(r=>(S.r[r.review_id]||{}).status).length,b=D.claimRows.filter(c=>(S.c[c.claim_id]||{}).verdict).length,c=D.db.filter(x=>(S.d[x.ico]||{}).verdict).length;document.getElementById('prog').textContent='Záznamy '+a+'/'+D.records.length+' · Tvrdenia '+b+'/'+D.claimRows.length+' · Databáza '+c+'/'+D.db.length}
const csv=rows=>rows.map(r=>r.map(v=>{v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(',')).join('\n')+'\n';
const dl=(n,t)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download=n;a.click()};
document.getElementById('exp').onclick=()=>{dl('review_sample_filled.csv',csv([['review_id','human_status','human_type','human_subtype','human_note','human_minutes','reviewer_id'],...D.records.map(r=>{const s=S.r[r.review_id]||{};return [r.review_id,s.status,s.type,s.subtype,s.note,s.minutes,S.reviewer]})]));dl('review_claims_filled.csv',csv([['claim_id','human_verdict','human_note','reviewer_id'],...D.claimRows.map(c=>{const s=S.c[c.claim_id]||{};return [c.claim_id,s.verdict,s.note,S.reviewer]})]));
  if(D.db.some(x=>(S.d[x.ico]||{}).verdict))dl('review_db_filled.csv',csv([['ico','nazov','agent_status','human_verdict','human_type','human_sources','human_note','human_minutes','reviewer_id'],...D.db.map(x=>{const s=S.d[x.ico]||{};return [x.ico,x.name,x.status,s.verdict,s.type,s.sources,s.note,s.minutes,S.reviewer]})]))};
const T=[['t1',recs],['t2',cl],['t3',real,1],['t4',cmp,1]];
T.forEach(([id,fn,ub])=>document.getElementById(id).onclick=()=>{if(ub&&!unblind())return;T.forEach(([j])=>document.getElementById(j).className=j===id?'on':'');fn()});
recs();prog();
`;

const html = `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ručná kontrola pilotu</title><style>${CSS}</style></head><body>
<header><strong>Ručná kontrola</strong>
<button id="t1" class="on">Záznamy</button><button id="t2">Tvrdenia</button>
<span class="mut">|</span><button id="t3">Reálne záznamy</button><button id="t4">Porovnanie</button>
<label style="flex-direction:row;gap:6px;align-items:center">Kontrolór <input id="rev" size="8"></label>
<span id="prog" class="mut"></span><button id="exp">Exportovať CSV</button></header>
<main id="m"></main>
<script>
const D=${data};/*D_END*/
${CLIENT}
</script></body></html>`;
fs.writeFileSync(path.join(ROOT, 'data/review.html'), html, 'utf8');
console.log(`data/review.html: ${records.length} záznamov (${records.filter(r => r.claims.length).length} s tvrdeniami), ${claimRows.length} tvrdení, databáza ${db.length} (zaradení ${db.filter(x => x.status === 'zaradeny').length})`);
