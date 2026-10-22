// Spielername (freiwillig): Spitzname mit Spielerkennung, ohne E-Mail und Passwort.
// Auf dem Gerät liegen Kennung und geheimer Schlüssel; mit dem Wiederherstellungscode (Text, Link oder QR-Code)
// zieht man auf ein anderes Gerät um. Grundlage für spätere Bestenlisten und Turniere. © 2026 Guido Suchsland
(function(){
'use strict';
const KEY='dreiSchach.spieler';
const ls={get(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;}},set(v){try{v?localStorage.setItem(KEY,JSON.stringify(v)):localStorage.removeItem(KEY);}catch(e){}}};
const T=s=>(window.I18N&&window.I18N[s])||s;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ROOT=(()=>{const s=document.currentScript&&document.currentScript.src||'';return s.replace(/lib\/spieler\.js.*$/,'');})();   // Hauptordner der Seite
let HOST=null;
async function base(){
  if(HOST)return HOST;const q=new URLSearchParams(location.search).get('fernhost');
  if(q){HOST=(/^(localhost|127\.)/.test(q)?'http://':'https://')+q;return HOST;}
  const r=await fetch(ROOT+'server.json?'+Date.now(),{cache:'no-store'});const j=await r.json();
  HOST='https://'+String(j.host||'').replace(/^https?:\/\//,'').replace(/\/+$/,'');return HOST;}
async function call(act,body){const r=await fetch((await base())+'/spieler/'+act,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j;}
const codeOf=me=>me.id+'-'+me.secret;
const parseCode=c=>{const m=String(c||'').trim().toLowerCase().match(/([a-z0-9]{10})-([a-z0-9]{24})/);return m?{id:m[1],secret:m[2]}:null;};
const linkOf=me=>location.origin+location.pathname.replace(/[^/]*$/,'').replace(/\/(en|fr|es|it|pt|nl|pl|tr|ru|uk|zh|ja|ko|th|ar|is|da)\/$/,'/')+'spiel.html?ich='+codeOf(me);
function useName(nick){try{if(!localStorage.getItem('dreiSchach.name'))localStorage.setItem('dreiSchach.name',nick);}catch(e){}
  const f=document.getElementById('olName');if(f&&!f.value)f.value=nick;}

// ---------- Fenster ----------
let box=null;
function ensure(){if(box)return;
  const st=document.createElement('style');st.textContent=`
#spModal{position:fixed;inset:0;z-index:2147482000;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:12px}
#spModal.show{display:flex}#spBox{background:#1f232c;color:#e8e8ee;border:2px solid #8fb6ff;border-radius:14px;max-width:440px;width:100%;max-height:92vh;overflow:auto;padding:16px 18px;font:15px/1.45 system-ui,sans-serif;position:relative}
#spBox h3{margin:0 0 8px;color:#cfe0ff}#spBox p{margin:8px 0}#spBox .n{color:#9aa3b5;font-size:13px}#spBox input{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid #444b5c;background:#14161c;color:#fff;font:inherit}
#spBox button{padding:8px 12px;border-radius:8px;border:1px solid #444b5c;background:#2b3140;color:#fff;font:inherit;cursor:pointer;margin:4px 6px 0 0}#spBox button.go{background:#1f8f4a;border-color:#1f8f4a}#spBox button.warn{background:none;color:#ff8a70;border-color:#6a3a30}
#spBox .x{position:absolute;top:8px;right:10px;margin:0;background:none;border:0;font-size:18px}#spBox code{display:block;word-break:break-all;background:#14161c;padding:8px;border-radius:8px;font-size:14px;margin:6px 0;user-select:all}
#spBox .err{color:#ff8a70}#spBox .qr svg{background:#fff;border-radius:8px;display:block;margin:6px 0;max-width:180px;height:auto}`;
  document.head.appendChild(st);
  box=document.createElement('div');box.id='spModal';box.innerHTML='<div id="spBox"></div>';box.onclick=e=>{if(e.target===box)SPIELER.close();};
  document.body.appendChild(box);}
function render(msg){
  const me=ls.get(),b=document.getElementById('spBox');
  let h=`<button class="x" onclick="SPIELER.close()" aria-label="${esc(T('Schließen'))}">✕</button><h3>👤 ${esc(T('Mein Spielername'))}</h3>`;
  if(!me){
    h+=`<p>${esc(T('Mit einem Spielernamen kannst du später in Bestenlisten und Turnieren mitspielen. Du brauchst weder E-Mail noch Passwort. Bitte nimm einen Spitznamen, nicht deinen echten Namen.'))}</p>
<input id="spNick" maxlength="20" placeholder="${esc(T('Spitzname (3–20 Zeichen)'))}" autocomplete="nickname">
<p><button class="go" onclick="SPIELER.create()">${esc(T('Spielernamen anlegen'))}</button></p>
<p class="n">${esc(T('Schon einen Spielernamen auf einem anderen Gerät? Gib hier deinen Wiederherstellungscode ein:'))}</p>
<input id="spCode" placeholder="${esc(T('Wiederherstellungscode'))}" autocomplete="off"><p><button onclick="SPIELER.restore()">${esc(T('Übernehmen'))}</button></p>`;
  }else{
    h+=`<p>${esc(T('Du spielst als'))} <b>${esc(me.nick)}</b>.</p>
<input id="spNick" maxlength="20" value="${esc(me.nick)}"><p><button onclick="SPIELER.rename()">${esc(T('Namen ändern'))}</button></p>
<details><summary>🔑 ${esc(T('Auf ein anderes Gerät umziehen'))}</summary>
<p class="n">${esc(T('Mit diesem Code, Link oder QR-Code übernimmst du deinen Spielernamen auf einem anderen Gerät. Behandle ihn wie ein Passwort und gib ihn niemandem.'))}</p>
<code>${esc(codeOf(me))}</code><div class="qr" id="spQr"></div>
<p><button onclick="SPIELER.copy()">📋 ${esc(T('Link kopieren'))}</button><button onclick="SPIELER.rekey()">${esc(T('Neuen Code erzeugen'))}</button></p>
<p class="n">${esc(T('„Neuen Code erzeugen“ macht den alten Code ungültig – zum Beispiel, wenn ihn jemand anderes gesehen hat.'))}</p></details>
<p><button class="warn" onclick="SPIELER.remove()">${esc(T('Spielernamen löschen'))}</button></p>`;
  }
  h+=`<p class="n">${esc(T('Gespeichert werden nur der Spitzname, eine zufällige Kennung und wann der Name angelegt und zuletzt benutzt wurde.'))} <a href="${ROOT}datenschutz.html#spielername" target="_blank" style="color:#8fb6ff">${esc(T('Datenschutz'))}</a></p>`;
  if(msg)h+=`<p class="${msg.err?'err':'n'}">${esc(msg.t)}</p>`;
  b.innerHTML=h;
  if(me){const d=b.querySelector('details');d.addEventListener('toggle',()=>{if(d.open)qr(me);});}
}
async function qr(me){const el=document.getElementById('spQr');if(!el||el.innerHTML)return;
  if(!window.qrcode){await new Promise((ok,no)=>{const s=document.createElement('script');s.src=ROOT+'lib/qrcode.js';s.onload=ok;s.onerror=no;document.head.appendChild(s);}).catch(()=>{});}
  try{const q=qrcode(0,'M');q.addData(linkOf(me));q.make();el.innerHTML=q.createSvgTag({cellSize:4,margin:2});}catch(e){}}
const busy=f=>async(...a)=>{const bs=[...document.querySelectorAll('#spBox button')];bs.forEach(b=>b.disabled=true);
  try{await f(...a);}catch(e){render({err:true,t:e.message||String(e)});}finally{bs.forEach(b=>b.disabled=false);}};

window.SPIELER={
  get:()=>ls.get(),
  nick:()=>{const m=ls.get();return m?m.nick:'';},
  open(msg){ensure();render(msg);box.classList.add('show');},
  close(){if(box)box.classList.remove('show');},
  create:busy(async()=>{const n=document.getElementById('spNick').value;const j=await call('neu',{nick:n});ls.set(j);useName(j.nick);render({t:T('Geschafft! Dein Spielername ist angelegt.')});}),
  rename:busy(async()=>{const me=ls.get(),n=document.getElementById('spNick').value;const j=await call('name',{id:me.id,secret:me.secret,nick:n});ls.set(Object.assign(me,{nick:j.nick}));render({t:T('Der Name wurde geändert.')});}),
  restore:busy(async(code)=>{const c=parseCode(code||document.getElementById('spCode').value);if(!c)throw new Error(T('Das ist kein gültiger Wiederherstellungscode.'));
    const j=await call('ich',c);ls.set({id:j.id,secret:c.secret,nick:j.nick});useName(j.nick);render({t:T('Willkommen zurück! Dein Spielername wurde übernommen.')});}),
  rekey:busy(async()=>{const me=ls.get();const j=await call('neuerschluessel',{id:me.id,secret:me.secret});ls.set(j);render({t:T('Neuer Code erzeugt. Der alte gilt nicht mehr.')});}),
  remove:busy(async()=>{if(!confirm(T('Spielernamen wirklich löschen? Das lässt sich nicht rückgängig machen.')))return;const me=ls.get();await call('loeschen',{id:me.id,secret:me.secret});ls.set(null);render({t:T('Dein Spielername wurde gelöscht.')});}),
  copy(){const me=ls.get();const l=linkOf(me);try{navigator.clipboard.writeText(l);render({t:T('Link kopiert.')});}catch(e){prompt(T('Link kopieren:'),l);}}
};
// Link mit ?ich=… : Spielernamen übernehmen (nach Rückfrage) und den Code aus der Adresszeile entfernen
function fromLink(){const q=new URLSearchParams(location.search),c=q.get('ich');if(!c)return;
  q.delete('ich');history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:'')+location.hash);
  const me=ls.get(),p=parseCode(c);if(!p||(me&&me.id===p.id))return;
  if(me&&!confirm(T('Auf diesem Gerät ist schon ein Spielername angelegt. Durch den aus dem Link ersetzen?')))return;
  SPIELER.open();SPIELER.restore(c);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fromLink);else fromLink();
})();
