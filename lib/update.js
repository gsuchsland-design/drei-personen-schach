// Neue Version? Vergleicht den Stand dieser Seite (data-v am Skript-Tag) mit version.json auf dem Server.
// Ist der Server neuer, erscheint unten „🆕 Neue Version“ (pulsierend); ein Klick lädt die Seite frisch.
// Den Stand setzt tools/release.py bei jeder Veröffentlichung. © 2026 Guido Suchsland
(function(){
'use strict';
const me=document.currentScript,MINE=me&&me.dataset.v||'',ROOT=(me&&me.src||'').replace(/lib\/update\.js.*$/,'');
const LBL={de:'Neue Version',en:'New version',fr:'Nouvelle version',es:'Nueva versión',it:'Nuova versione',pt:'Nova versão',nl:'Nieuwe versie',pl:'Nowa wersja',tr:'Yeni sürüm',ru:'Новая версия',uk:'Нова версія',zh:'新版本',ja:'新しいバージョン',ko:'새 버전',th:'เวอร์ชันใหม่',ar:'إصدار جديد',is:'Ný útgáfa',da:'Ny version'};
const TIP={de:'Antippen, um die neueste Version zu laden',en:'Tap to load the latest version'};
const lang=()=>{const l=(document.documentElement.lang||'').slice(0,2);if(LBL[l])return l;try{const s=localStorage.getItem('dreiSchach.lang');if(LBL[s])return s;}catch(e){}return'de';};
let latest='';
function reload(){try{if(window.NET&&NET.on&&NET.host&&typeof hostSave==='function')hostSave();}catch(e){}
  const q=new URLSearchParams(location.search);q.set('v',latest||Date.now().toString(36));location.replace(location.pathname+'?'+q.toString()+location.hash);}
function show(){
  if(document.querySelector('.updLink'))return;
  if(!document.getElementById('updCss')){const st=document.createElement('style');st.id='updCss';
    st.textContent='.updLink{color:#6fa8ff!important;font-weight:700;cursor:pointer;text-decoration:none;animation:updPulse 1.6s ease-in-out infinite;white-space:nowrap}@keyframes updPulse{0%,100%{opacity:1;text-shadow:0 0 0 rgba(111,168,255,0)}50%{opacity:.45;text-shadow:0 0 10px rgba(111,168,255,.9)}}@media (prefers-reduced-motion:reduce){.updLink{animation:none;text-decoration:underline}}';
    document.head.appendChild(st);}
  const make=()=>{const a=document.createElement('a');a.href='#';a.className='updLink';a.textContent='🆕 '+LBL[lang()];a.title=TIP[lang()]||TIP.en;a.onclick=e=>{e.preventDefault();reload();};return a;};
  // ganz unten: Fußzeile der Textseiten, Zeile im Startfenster des Spiels, Leiste der anderen Spiele
  const spots=[...document.querySelectorAll('footer.bottom .in')];
  for(const el of document.querySelectorAll('.hint'))if(/©\s*2026 Guido Suchsland/.test(el.textContent))spots.push(el);
  const vn=document.getElementById('varNav');if(vn)spots.push(vn);
  for(const s of spots){const a=make();if(s.classList.contains('hint')){s.appendChild(document.createTextNode(' · '));}s.appendChild(a);}
}
async function check(){
  if(!MINE)return;
  try{const r=await fetch(ROOT+'version.json?'+Date.now(),{cache:'no-store'});if(!r.ok)return;const j=await r.json();
    if(j&&j.v&&String(j.v)>MINE){latest=String(j.v);show();}}catch(e){}
}
const go=()=>{setTimeout(check,1500);setInterval(check,10*60000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(check,1000);});};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
})();
