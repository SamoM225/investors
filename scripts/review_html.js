// Vygeneruje lokálnu stránku data/review.html na slepú ručnú kontrolu.
// Kontrolór nevidí status, typ ani verdikty agentov – iba tvrdenia so zdrojmi.
// Výsledky sa ukladajú v prehliadači a exportujú do CSV (review_sample_filled.csv, review_claims_filled.csv).
const fs = require('fs');
const path = require('path');
const { ROOT, readCsv } = require('./lib');

const sample = readCsv('data/review_sample.csv');
const claimSample = readCsv('data/review_claims.csv');
const claims = readCsv('data/claims.csv');
const byId = Object.fromEntries(claims.map(c => [c.claim_id, c]));
const pick = c => c && ({ claim_id: c.claim_id, field: c.field, value: c.value, target_ico: c.target_ico, flags: c.flags,
  level: c.source_level, url: c.source_url, published: c.source_published_at, quote: c.quote });

const records = sample.map(r => ({ review_id: r.review_id, ico: r.ico, name: r.name,
  claims: r.claim_ids.split('|').filter(Boolean).map(id => pick(byId[id])).filter(Boolean) }));
const claimRows = claimSample.map(r => ({ ...pick(byId[r.claim_id]), ico: (byId[r.claim_id] || {}).ico }));

const data = JSON.stringify({ records, claimRows }).replace(/</g, '\\u003c');
const html = `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ručná kontrola pilotu</title><style>
:root{--bg:#fafaf8;--fg:#1d1d1b;--mut:#6b6b66;--line:#ddddd6;--card:#fff;--acc:#2f5d8a;--ok:#2e7d4f}
@media (prefers-color-scheme:dark){:root{--bg:#1a1a19;--fg:#ececea;--mut:#a0a09a;--line:#3a3a37;--card:#232322;--acc:#7fb0e0;--ok:#6fc38f}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}
header{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;z-index:2}
main{max-width:1000px;margin:0 auto;padding:16px}
button,select,input,textarea{font:inherit;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:5px 8px}
button{cursor:pointer}button.on{border-color:var(--acc);color:var(--acc)}
details{background:var(--card);border:1px solid var(--line);border-radius:8px;margin:8px 0;padding:8px 12px}
summary{cursor:pointer;font-weight:600}summary .done{color:var(--ok);font-weight:400}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:13px}td,th{border-top:1px solid var(--line);padding:5px;vertical-align:top;text-align:left}
td.q{font-family:ui-monospace,monospace;font-size:12px;word-break:break-word}a{color:var(--acc)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:8px}
label{display:flex;flex-direction:column;font-size:13px;color:var(--mut)}.mut{color:var(--mut);font-size:13px}
.wrap{overflow-x:auto}
</style></head><body>
<header><strong>Ručná kontrola</strong>
<button id="t1" class="on">Záznamy</button><button id="t2">Tvrdenia</button>
<label style="flex-direction:row;gap:6px;align-items:center">Kontrolór <input id="rev" size="8"></label>
<span id="prog" class="mut"></span><button id="exp">Exportovať CSV</button></header>
<main id="m"></main>
<script>
const D=${data};
const KEY='pilot-review-v1';let S={r:{},c:{}};try{S=JSON.parse(localStorage.getItem(KEY))||S}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}prog()};
const esc=s=>String(s??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const rev=document.getElementById('rev');rev.value=S.reviewer||'';rev.oninput=()=>{S.reviewer=rev.value;save()};
const STAT=['','zaradeny','neiste','typ_nerozhodnuty','vyradeny_register','vyradeny_typ','vyradeny_neaktivny','mimo_rozsahu'];
const TYP=['','VC','PE','typ_nerozhodnuty','iny'];const SUB=['','VC','korporatne_VC','statny_fond','akcelerator_investujuci'];
const VER=['','potvrdene','nepotvrdene','rozporne'];
const sel=(o,v,a)=>'<select '+a+'>'+o.map(x=>'<option'+(x===v?' selected':'')+'>'+x+'</option>').join('')+'</select>';
const links=ico=>'<a target=_blank href="https://www.orsr.sk/hladaj_ico.asp?ICO='+ico+'&SID=0">ORSR</a> · <a target=_blank href="https://api.statistics.sk/rpo/v1/search?identifier='+ico+'">RPO</a> · <a target=_blank href="https://www.registeruz.sk/cruz-public/domain/accountingentity/simplesearch?ico='+ico+'">RÚZ</a> · <a target=_blank href="https://www.google.com/search?q=%22'+ico+'%22+OR+investícia">vyhľadať</a>';
const ctable=cs=>cs.length?'<div class=wrap><table><tr><th>pole</th><th>hodnota</th><th>úroveň</th><th>zdroj</th><th>citát</th></tr>'+cs.map(c=>'<tr><td>'+esc(c.field)+(c.target_ico?'<br><span class=mut>cieľ '+esc(c.target_ico)+'</span>':'')+'</td><td>'+esc(c.value)+(c.flags?'<br><span class=mut>'+esc(c.flags)+'</span>':'')+'</td><td>'+esc(c.level)+'</td><td><a target=_blank href="'+esc(c.url)+'">otvoriť</a><br><span class=mut>'+esc(c.published)+'</span></td><td class=q>'+esc(c.quote)+'</td></tr>').join('')+'</table></div>':'<p class=mut>Bez tvrdení (subjekt bol vyradený skôr). Rozhodni sám podľa registrov a webu.</p>';
function recs(){const m=document.getElementById('m');m.innerHTML='<p class=mut>Pre každý subjekt sám urč status a typ podľa brán G1–G5 (plan.md, bod 2). Zdroje otvor naživo. Rozhodnutia agentov tu zámerne nie sú.</p>'+D.records.map(r=>{const s=S.r[r.review_id]||{};return '<details data-id="'+r.review_id+'"><summary>'+r.review_id+' · '+esc(r.name)+' <span class=mut>('+r.ico+')</span> '+(s.status?'<span class=done>✓ '+s.status+'</span>':'')+'</summary><p class=mut>'+links(r.ico)+'</p>'+ctable(r.claims)+'<div class=grid><label>Status'+sel(STAT,s.status,'data-k=status')+'</label><label>Typ'+sel(TYP,s.type,'data-k=type')+'</label><label>Podtyp'+sel(SUB,s.subtype,'data-k=subtype')+'</label><label>Minúty<input type=number min=0 data-k=minutes value="'+esc(s.minutes)+'"></label></div><label style="margin-top:8px">Poznámka (prečo, zdroj)<textarea rows=2 data-k=note>'+esc(s.note)+'</textarea></label></details>'}).join('');
m.querySelectorAll('details').forEach(d=>{const id=d.dataset.id;d.addEventListener('toggle',()=>{if(d.open&&!(S.r[id]||{}).t0){(S.r[id]=S.r[id]||{}).t0=Date.now();save()}});d.querySelectorAll('[data-k]').forEach(el=>el.onchange=()=>{const o=S.r[id]=S.r[id]||{};o[el.dataset.k]=el.value;if(el.dataset.k==='status'&&!o.minutes&&o.t0){o.minutes=Math.max(1,Math.round((Date.now()-o.t0)/60000));d.querySelector('[data-k=minutes]').value=o.minutes}save();d.querySelector('summary').innerHTML=d.querySelector('summary').innerHTML.replace(/<span class="done">.*<\\/span>$/,'')+(o.status?'<span class=done>✓ '+o.status+'</span>':'')})})}
function cl(){const m=document.getElementById('m');m.innerHTML='<p class=mut>Pri každom tvrdení otvor zdroj a over: citát tam je, dokladá tvrdenie, ide o správne IČO, dátum sedí, úroveň A–D je správna.</p>'+D.claimRows.map(c=>{const s=S.c[c.claim_id]||{};return '<details data-id="'+esc(c.claim_id)+'"><summary>'+esc(c.claim_id)+' · '+esc(c.field)+' '+(s.verdict?'<span class=done>✓ '+s.verdict+'</span>':'')+'</summary>'+ctable([c])+'<div class=grid><label>Verdikt'+sel(VER,s.verdict,'data-k=verdict')+'</label></div><label style="margin-top:8px">Poznámka<textarea rows=2 data-k=note>'+esc(s.note)+'</textarea></label></details>'}).join('');
m.querySelectorAll('details').forEach(d=>{const id=d.dataset.id;d.querySelectorAll('[data-k]').forEach(el=>el.onchange=()=>{(S.c[id]=S.c[id]||{})[el.dataset.k]=el.value;save()})})}
function prog(){const a=D.records.filter(r=>(S.r[r.review_id]||{}).status).length,b=D.claimRows.filter(c=>(S.c[c.claim_id]||{}).verdict).length;document.getElementById('prog').textContent='Záznamy '+a+'/'+D.records.length+' · Tvrdenia '+b+'/'+D.claimRows.length}
const csv=rows=>rows.map(r=>r.map(v=>{v=String(v??'');return /[",\\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(',')).join('\\n')+'\\n';
const dl=(n,t)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download=n;a.click()};
document.getElementById('exp').onclick=()=>{dl('review_sample_filled.csv',csv([['review_id','human_status','human_type','human_subtype','human_note','human_minutes','reviewer_id'],...D.records.map(r=>{const s=S.r[r.review_id]||{};return [r.review_id,s.status,s.type,s.subtype,s.note,s.minutes,S.reviewer]})]));dl('review_claims_filled.csv',csv([['claim_id','human_verdict','human_note','reviewer_id'],...D.claimRows.map(c=>{const s=S.c[c.claim_id]||{};return [c.claim_id,s.verdict,s.note,S.reviewer]})]))};
const t1=document.getElementById('t1'),t2=document.getElementById('t2');t1.onclick=()=>{t1.className='on';t2.className='';recs()};t2.onclick=()=>{t2.className='on';t1.className='';cl()};
recs();prog();
</script></body></html>`;
fs.writeFileSync(path.join(ROOT, 'data/review.html'), html, 'utf8');
console.log(`data/review.html: ${records.length} záznamov, ${claimRows.length} tvrdení`);
