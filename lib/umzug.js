// Geräte verbinden: alles von einem Gerät auf ein anderes übertragen – Spielername, Fernpartien, Online-Partien,
// gesicherte Partien, Einstellungen. Das sendende Gerät verschlüsselt die Daten mit einem kurzen Code (AES-GCM,
// Schlüssel aus dem Code abgeleitet) und legt nur den verschlüsselten Block auf dem Server ab; der Server bekommt
// nur einen Hash des Codes. Der Block liegt höchstens 15 Minuten bereit und wird beim Abholen gelöscht.
// Beim Übernehmen wird zusammengeführt: Partien und Plätze kommen dazu, nichts Vorhandenes geht verloren.
// Läuft im Fenster des Spielernamens (lib/spieler.js). © 2026 Guido Suchsland
(function(){
'use strict';
const T=s=>(window.I18N&&window.I18N[s])||s;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ROOT=(()=>{const s=document.currentScript&&document.currentScript.src||'';return s.replace(/lib\/umzug\.js.*$/,'');})();
const ABC='abcdefghjkmnpqrstuvwxyz23456789';
const PRE=['dreiSchach.','reiche.','raum.','stern.','grenz.','kit.'];
const SKIP=new Set(['dreiSchach.pushKey','dreiSchach.lang','dreiSchach.reloadFor','dreiSchach.host']);   // gehören zu diesem Gerät
const KEEP=k=>/\.(t|tok|fv)\./.test(k)||/(^dreiSchach\.autosave$|\.auto$|^dreiSchach\.opp$|^kit\.opp(\.prof)?$)/.test(k);   // nur übernehmen, wenn hier noch nicht vorhanden
let HOST=null;
async function base(){if(HOST)return HOST;const q=new URLSearchParams(location.search).get('fernhost');
  if(q){HOST=(/^(localhost|127\.)/.test(q)?'http://':'https://')+q;return HOST;}
  const r=await fetch(ROOT+'server.json?'+Date.now(),{cache:'no-store'});const j=await r.json();
  HOST='https://'+String(j.host||'').replace(/^https?:\/\//,'').replace(/\/+$/,'');return HOST;}
async function call(act,body){const r=await fetch((await base())+'/umzug/'+act,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(r.status===404?T('Code unbekannt oder abgelaufen.'):(j.error||('HTTP '+r.status)));return j;}

// ---------- Code und Verschlüsselung ----------
const newCode=()=>{const b=crypto.getRandomValues(new Uint8Array(8));let s='';for(const x of b)s+=ABC[x%ABC.length];return s;};
const okCode=c=>c.length===8&&[...c].every(ch=>ABC.includes(ch));
const show=c=>c.toUpperCase().slice(0,4)+'-'+c.toUpperCase().slice(4);
const enc=new TextEncoder(),dec=new TextDecoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function idOf(code){return hex(await crypto.subtle.digest('SHA-256',enc.encode('dps-umzug:'+code)));}
async function keyOf(code){const k=await crypto.subtle.importKey('raw',enc.encode(code),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('dps-umzug-salz'),iterations:150000,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
const b64=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function pipe(bytes,Stream,mode){const s=new Blob([bytes]).stream().pipeThrough(new Stream(mode));return new Uint8Array(await new Response(s).arrayBuffer());}
async function seal(code,obj){let raw=enc.encode(JSON.stringify(obj)),z=0;
  if(window.CompressionStream){try{raw=await pipe(raw,CompressionStream,'gzip');z=1;}catch(e){}}
  const iv=crypto.getRandomValues(new Uint8Array(12)),ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await keyOf(code),raw));
  const out=new Uint8Array(13+ct.length);out[0]=z;out.set(iv,1);out.set(ct,13);return b64(out);}
async function open_(code,data){const u=unb64(data),iv=u.subarray(1,13);let raw;
  try{raw=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv},await keyOf(code),u.subarray(13)));}catch(e){throw new Error(T('Die Daten ließen sich nicht entschlüsseln.'));}
  if(u[0]===1){if(!window.DecompressionStream)throw new Error(T('Dieser Browser ist zu alt für die Übertragung.'));raw=await pipe(raw,DecompressionStream,'gzip');}
  return JSON.parse(dec.decode(raw));}

// ---------- Daten einsammeln und zusammenführen ----------
function collect(){const items={};
  try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&PRE.some(p=>k.startsWith(p))&&!SKIP.has(k))items[k]=localStorage.getItem(k);}}catch(e){}
  return{v:1,at:Date.now(),items};}
function summary(items){const s={name:'',spieler:'',fern:0,online:0};
  try{const sp=JSON.parse(items['dreiSchach.spieler']||'null');if(sp)s.spieler=sp.nick;}catch(e){}
  s.name=items['dreiSchach.name']||'';
  try{s.fern=Object.keys(JSON.parse(items['dreiSchach.fern']||'{}')).length;}catch(e){}
  s.online=Object.keys(items).filter(k=>/^(raum|stern|grenz)\.t\./.test(k)).length;
  return s;}
function sumText(s){const a=[];
  if(s.spieler)a.push(T('Spielername')+': '+s.spieler);else if(s.name)a.push(T('Name')+': '+s.name);
  a.push(T('Fernpartien im Drei-Personen-Schach')+': '+s.fern);
  a.push(T('Online-Partien in den anderen Spielen')+': '+s.online);
  a.push(T('Einstellungen, Farben und gesicherte Partien'));
  return a;}
function merge(items){const get=k=>{try{return localStorage.getItem(k);}catch(e){return null;}},set=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
  for(const k in items){const v=items[k],cur=get(k);
    if(k==='dreiSchach.fern'){let a={},b={};try{a=JSON.parse(cur||'{}')||{};}catch(e){}try{b=JSON.parse(v||'{}')||{};}catch(e){}
      for(const c in b)if(!a[c]||(b[c].at||0)>(a[c].at||0))a[c]=b[c];set(k,JSON.stringify(a));continue;}
    if(k==='dreiSchach.gemeldet'){let a=[],b=[];try{a=JSON.parse(cur||'[]');}catch(e){}try{b=JSON.parse(v||'[]');}catch(e){}
      set(k,JSON.stringify([...new Set(a.concat(b))].slice(-400)));continue;}
    if(KEEP(k)&&cur!=null)continue;
    set(k,v);}}

// ---------- Fenster (im Kasten des Spielernamens) ----------
let TIMER=null,CUR=null;
function box(){if(window.SPIELER)SPIELER.open();return document.getElementById('spBox');}
function frame(inner){const b=box();if(!b)return;clearInterval(TIMER);
  b.innerHTML=`<button class="x" onclick="SPIELER.close()" aria-label="${esc(T('Schließen'))}">✕</button><h3>📲 ${esc(T('Geräte verbinden'))}</h3>`+inner;}
function home(msg){CUR=null;
  frame(`<p>${esc(T('Überträgt alles von einem Gerät auf ein anderes: Spielername, Fernpartien, Online-Partien, gesicherte Partien und Einstellungen. Danach spielst du auf beiden Geräten als dieselbe Person.'))}</p>
<p><b>${esc(T('Dieses Gerät hat die Daten?'))}</b><br><button class="go" onclick="UMZUG.send()">📤 ${esc(T('Von diesem Gerät senden'))}</button></p>
<p><b>${esc(T('Die Daten sollen auf dieses Gerät?'))}</b></p>
<input id="umCode" placeholder="${esc(T('Code vom anderen Gerät, z. B. ABCD-EFGH'))}" autocomplete="off" autocapitalize="characters" maxlength="12">
<p><button class="go" onclick="UMZUG.fetch()">📥 ${esc(T('Auf dieses Gerät holen'))}</button></p>
<p class="n">${esc(T('Die Daten werden mit dem Code verschlüsselt und liegen höchstens 15 Minuten auf dem Server. Der Server kann sie nicht lesen.'))}</p>
${msg?`<p class="${msg.err?'err':'n'}">${esc(msg.t)}</p>`:''}<p><button onclick="SPIELER.open()">◀ ${esc(T('Zurück'))}</button></p>`);}
const linkOf=code=>location.origin+location.pathname.replace(/[^/]*$/,'').replace(/\/(en|fr|es|it|pt|nl|pl|tr|ru|uk|zh|ja|ko|th|ar|is|da)\/$/,'/')+'spiel.html?umzug='+code;
async function qr(el,text){if(!window.qrcode){await new Promise((ok,no)=>{const s=document.createElement('script');s.src=ROOT+'lib/qrcode.js';s.onload=ok;s.onerror=no;document.head.appendChild(s);}).catch(()=>{});}
  try{const q=qrcode(0,'M');q.addData(text);q.make();el.innerHTML=q.createSvgTag({cellSize:4,margin:2});}catch(e){}}
function guard(f){return async(...a)=>{const bs=[...document.querySelectorAll('#spBox button')];bs.forEach(b=>b.disabled=true);
  try{await f(...a);}catch(e){home({err:true,t:e.message||String(e)});}finally{bs.forEach(b=>b.disabled=false);}};}
const send=guard(async()=>{
  frame(`<p class="n">${esc(T('Daten werden verschlüsselt …'))}</p>`);
  const data=collect(),code=newCode(),j=await call('put',{id:await idOf(code),data:await seal(code,data)});
  CUR=code;const link=linkOf(code),s=summary(data.items);
  frame(`<p>${esc(T('Gib auf dem anderen Gerät diesen Code ein – oder scanne den QR-Code bzw. öffne den Link dort:'))}</p>
<code style="font-size:28px;text-align:center;letter-spacing:3px">${show(code)}</code><div class="qr" id="umQr"></div>
<p><button onclick="UMZUG.copy()">📋 ${esc(T('Link kopieren'))}</button>${navigator.share?`<button onclick="UMZUG.share()">📤 ${esc(T('Teilen'))}</button>`:''}</p>
<p class="n">${esc(T('Am anderen Gerät: 👤 oben in der Leiste → 📲 Geräte verbinden → Code eingeben.'))}</p>
<p class="n" id="umLeft"></p><p class="n">${esc(T('Übertragen wird:'))}<br>${sumText(s).map(esc).join('<br>')}</p>
<p class="n">${esc(T('Der Code ist wie ein Passwort – zeig ihn niemandem.'))}</p><p><button onclick="UMZUG.open()">◀ ${esc(T('Zurück'))}</button></p>`);
  qr(document.getElementById('umQr'),link);
  const tick=()=>{const left=Math.max(0,j.until-Date.now()),el=document.getElementById('umLeft');if(!el)return clearInterval(TIMER);
    el.textContent=left?T('Gültig noch {0} Minuten.').replace('{0}',Math.ceil(left/60000)):T('Der Code ist abgelaufen.');if(!left)clearInterval(TIMER);};
  tick();TIMER=setInterval(tick,15000);});
const fetch_=guard(async(given)=>{const raw=given||((document.getElementById('umCode')||{}).value||'');
  const code=String(raw).toLowerCase().replace(/[^a-z0-9]/g,'');
  if(!okCode(code))throw new Error(T('Der Code hat 8 Zeichen, zum Beispiel ABCD-EFGH.'));
  frame(`<p class="n">${esc(T('Daten werden geholt …'))}</p>`);
  const j=await call('get',{id:await idOf(code)}),data=await open_(code,j.data);
  if(!data||!data.items)throw new Error(T('Die Daten sind unvollständig.'));
  const s=summary(data.items);let me=null;try{me=JSON.parse(localStorage.getItem('dreiSchach.spieler')||'null');}catch(e){}
  let other=null;try{other=JSON.parse(data.items['dreiSchach.spieler']||'null');}catch(e){}
  if(me&&other&&me.id!==other.id&&!confirm(T('Auf diesem Gerät ist schon der Spielername „{0}“ angelegt. Durch „{1}“ vom anderen Gerät ersetzen?').replace('{0}',me.nick).replace('{1}',other.nick)))delete data.items['dreiSchach.spieler'];
  merge(data.items);
  frame(`<p><b>✅ ${esc(T('Übernommen!'))}</b></p><p>${sumText(s).map(esc).join('<br>')}</p>
<p class="n">${esc(T('Partien, die es hier schon gab, bleiben erhalten. Fernpartien und Online-Partien laufen jetzt auf beiden Geräten.'))}</p>
<p><button class="go" onclick="location.reload()">🔄 ${esc(T('Seite neu laden'))}</button></p>`);});

// ---------- Umzug von der alten Adresse (gsuchsland-design.github.io) ----------
// Die Brückenseite gsuchsland-design.github.io/dps-umzug/ liegt noch unter der alten Adresse, liest dort die Daten
// und schickt sie im #-Teil der Adresse hierher (der #-Teil geht nie über das Netz). Hier wird zusammengeführt.
let OLD=null;
const b64u=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return unb64(s);};
async function decodeOld(txt){const u=b64u(txt);let raw=u.subarray(1);
  if(u[0]===1){if(!window.DecompressionStream)throw new Error(T('Dieser Browser ist zu alt für die Übertragung.'));raw=await pipe(raw,DecompressionStream,'gzip');}
  return JSON.parse(dec.decode(raw));}
const fromOld=guard(async(txt)=>{const data=await decodeOld(txt);if(!data||!data.items)throw new Error(T('Die Daten sind unvollständig.'));
  OLD=data;const s=summary(data.items);
  frame(`<p><b>${esc(T('Willkommen auf dreipersonenschach.de!'))}</b></p><p>${esc(T('Von der alten Adresse hast du diese Daten mitgebracht:'))}</p><p>${sumText(s).map(esc).join('<br>')}</p>
<p><button class="go" onclick="UMZUG.oldApply()">✅ ${esc(T('Übernehmen'))}</button><button onclick="SPIELER.close()">${esc(T('Nicht übernehmen'))}</button></p>
<p class="n">${esc(T('Partien, die es hier schon gab, bleiben erhalten.'))}</p>`);});
function oldApply(){if(!OLD)return;const items=Object.assign({},OLD.items);
  let me=null,other=null;try{me=JSON.parse(localStorage.getItem('dreiSchach.spieler')||'null');}catch(e){}try{other=JSON.parse(items['dreiSchach.spieler']||'null');}catch(e){}
  if(me&&other&&me.id!==other.id&&!confirm(T('Auf diesem Gerät ist schon der Spielername „{0}“ angelegt. Durch „{1}“ vom anderen Gerät ersetzen?').replace('{0}',me.nick).replace('{1}',other.nick)))delete items['dreiSchach.spieler'];
  const lang=items['dreiSchach.lang'];delete items['dreiSchach.lang'];
  merge(items);try{if(lang&&!localStorage.getItem('dreiSchach.lang'))localStorage.setItem('dreiSchach.lang',lang);localStorage.setItem('dreiSchach.altUmzug','1');}catch(e){}
  OLD=null;frame(`<p><b>✅ ${esc(T('Übernommen!'))}</b></p><p class="n">${esc(T('Du kannst jetzt hier weiterspielen. Die alte Adresse brauchst du nicht mehr.'))}</p>
<p><button class="go" onclick="location.reload()">🔄 ${esc(T('Seite neu laden'))}</button></p>`);}

window.UMZUG={open:()=>home(),send,fetch:fetch_,fromOld,oldApply,
  copy(){if(!CUR)return;const l=linkOf(CUR);try{navigator.clipboard.writeText(l);}catch(e){prompt(T('Link kopieren:'),l);}},
  share(){if(!CUR)return;try{navigator.share({title:T('Geräte verbinden'),text:T('Code')+': '+show(CUR),url:linkOf(CUR)});}catch(e){}},
  fromLink(code){home();const i=document.getElementById('umCode');if(i)i.value=show(String(code).toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,8));
    if(confirm(T('Daten von deinem anderen Gerät auf dieses Gerät übernehmen?')))fetch_(code);}};
})();
