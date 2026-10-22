// Vorlesen: Jeder Text der Seite lässt sich vorlesen – mit einer ruhigen, seriösen Stimme.
// Auf Textseiten liest der Knopf ab der sichtbaren Stelle, im Spiel das gerade offene Fenster (Einführung, Regeln, Auswertung …).
// Markierter Text wird bevorzugt vorgelesen. Der gerade gelesene Absatz wird hervorgehoben.
// © 2026 Guido Suchsland
(function(){
'use strict';
if(!('speechSynthesis' in window))return;
const S=window.speechSynthesis;
const BCP={de:'de-DE',en:'en-US',fr:'fr-FR',es:'es-ES',it:'it-IT',pt:'pt-PT',nl:'nl-NL',pl:'pl-PL',tr:'tr-TR',ru:'ru-RU',uk:'uk-UA',zh:'zh-CN',ja:'ja-JP',ko:'ko-KR',th:'th-TH',ar:'ar-SA',is:'is-IS',da:'da-DK'};
const LBL={de:['Vorlesen','Vorlesen beenden'],en:['Read aloud','Stop reading'],fr:['Lire à voix haute','Arrêter la lecture'],es:['Leer en voz alta','Detener la lectura'],it:['Leggi ad alta voce','Interrompi la lettura'],pt:['Ler em voz alta','Parar a leitura'],nl:['Voorlezen','Stoppen met voorlezen'],pl:['Czytaj na głos','Zatrzymaj czytanie'],tr:['Sesli oku','Okumayı durdur'],ru:['Читать вслух','Остановить чтение'],uk:['Читати вголос','Зупинити читання'],zh:['朗读','停止朗读'],ja:['読み上げ','読み上げを停止'],ko:['소리 내어 읽기','읽기 중지'],th:['อ่านออกเสียง','หยุดอ่าน'],ar:['قراءة بصوت عالٍ','إيقاف القراءة'],is:['Lesa upphátt','Hætta lestri'],da:['Læs højt','Stop oplæsning']};
const lang=()=>{const l=(document.documentElement.lang||'').slice(0,2).toLowerCase();if(BCP[l])return l;try{const s=localStorage.getItem('dreiSchach.lang');if(BCP[s])return s;}catch(e){}return'de';};

// ---------- seriöse Stimme wählen ----------
// Spaß- und Effektstimmen (vor allem auf Apple-Geräten) nie verwenden
const SILLY=/bad news|good news|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox|albert|bahh|deranged|hysterical|pipe organ|ralph|junior|grandpa|grandma|eddy|flo|reed|rocko|sandy|shelley/i;
function score(v,l){let s=0;const n=v.name||'';
  if(SILLY.test(n))return -1;
  if(/natural|neural|online|premium|enhanced|wavenet|studio/i.test(n))s+=40;   // hochwertige Stimmen
  if(/google/i.test(n))s+=25;if(/microsoft/i.test(n))s+=15;
  if(v.localService===false)s+=5;
  if((v.lang||'').toLowerCase()===BCP[l].toLowerCase())s+=10;
  if(v.default)s+=3;return s;}
function voice(l){const vs=S.getVoices().filter(v=>(v.lang||'').toLowerCase().replace('_','-').startsWith(l));
  let best=null,bs=-1;for(const v of vs){const s=score(v,l);if(s>bs){bs=s;best=v;}}return best;}
try{S.getVoices();S.addEventListener&&S.addEventListener('voiceschanged',()=>{});}catch(e){}

// ---------- was vorgelesen wird ----------
// im Spiel: das oberste offene Textfenster
const OVER=['#tour.show #tourCard','#kTour','#rulesModal.show','#anaModal.show','#kAna.show','#kMy.show','#setupModal.show','#langModal.show','#fernModal.show','#joinModal.show','#lobbyModal.show','#pubModal.show','#colModal.show','#promoModal.show'];
const shown=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
function overlay(){for(const s of OVER){const e=document.querySelector(s);if(shown(e))return e;}return null;}
const BLOCK='h1,h2,h3,h4,h5,p,li,figcaption,summary,dt,dd,label,th,td,blockquote,.lead';
function blocks(root,fromVisible){
  let els=[...root.querySelectorAll(BLOCK)].filter(e=>shown(e)&&!e.closest('nav,script,style,.vlBtn,[aria-hidden="true"]')&&!e.querySelector(BLOCK));
  if(!els.length&&root.innerText.trim())els=[root];
  if(fromVisible){const i=els.findIndex(e=>e.getBoundingClientRect().bottom>70);if(i>0)els=els.slice(i);}
  return els.map(e=>({el:e,text:clean(e)})).filter(x=>x.text);}
function clean(e){const c=e.cloneNode(true);for(const x of c.querySelectorAll('select,button,script,style,svg,.tryBadge'))x.remove();
  return(c.innerText||c.textContent||'').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu,'').replace(/\s+/g,' ').trim();}
// lange Absätze in Sätze teilen (Browser brechen lange Äußerungen sonst ab)
function chunks(t){const out=[];for(const s of t.match(/[^.!?。！？]+[.!?。！？]*\s*/g)||[t]){
  if(s.length<=220){out.push(s);continue;}for(let i=0;i<s.length;i+=200)out.push(s.slice(i,i+200));}return out;}

// ---------- Vorlesen ----------
let on=false,queue=[],cur=null,watch=null,lastText='',btn=null,mode='';
function mark(el){if(cur&&cur!==el)cur.classList.remove('vlNow');cur=el;if(el){el.classList.add('vlNow');try{el.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(e){}}}
function speakNext(){
  if(!on)return;const x=queue.shift();
  if(!x){mark(null);if(mode==='page')stop();return;}   // im Spiel: weiter beobachten, ob neuer Text erscheint
  mark(x.el);const l=lang(),v=voice(l),parts=chunks(x.text);let k=0;
  const say=()=>{if(!on)return;if(k>=parts.length){speakNext();return;}
    const u=new SpeechSynthesisUtterance(parts[k++]);u.lang=v?v.lang:BCP[l];if(v)u.voice=v;
    u.rate=0.95;u.pitch=1;u.volume=1;u.onend=say;u.onerror=say;S.speak(u);};
  say();}
function readFrom(root,fromVisible){S.cancel();queue=blocks(root,fromVisible);lastText=root.innerText;speakNext();}
function start(){
  on=true;ui();
  const sel=(getSelection&&String(getSelection()).trim())||'';
  if(sel){mode='page';S.cancel();queue=[{el:null,text:sel}];speakNext();return;}
  const ov=overlay();
  if(ov){mode='overlay';readFrom(ov,false);
    // Inhalt des Fensters ändert sich (z. B. nächster Schritt der Einführung): neuen Text vorlesen
    watch=setInterval(()=>{const o=overlay();if(!o){stop();return;}const t=o.innerText;if(t!==lastText){readFrom(o,false);}},400);
    return;}
  const main=document.querySelector('main')||document.querySelector('article')||document.body;
  mode='page';readFrom(main,true);}
function stop(){on=false;queue=[];clearInterval(watch);watch=null;try{S.cancel();}catch(e){}mark(null);ui();}
function ui(){if(!btn)return;const L=LBL[lang()]||LBL.de;btn.textContent=on?'⏹':'🔊';btn.title=btn.ariaLabel=on?L[1]:L[0];btn.classList.toggle('on',on);
  btn.style.display=(on||document.body.dataset.vlPage==='1'||overlay())?'':'none';}
window.VORLESEN={start,stop,toggle(){on?stop():start();},speakText(t){stop();on=true;mode='page';ui();queue=[{el:null,text:t}];speakNext();}};

// ---------- Knopf ----------
function init(){
  const st=document.createElement('style');st.textContent=`
.vlBtn{position:fixed;z-index:2147483000;left:12px;bottom:12px;width:46px;height:46px;border-radius:50%;border:2px solid #ffd23f;background:rgba(28,30,38,.94);color:#fff;font-size:21px;line-height:1;cursor:pointer;box-shadow:0 3px 14px rgba(0,0,0,.5);padding:0}
.vlBtn.on{background:#7a6420}.vlBtn:focus-visible{outline:3px solid #8fb6ff}
.vlNow{background:rgba(255,210,63,.16)!important;border-radius:6px;box-shadow:0 0 0 3px rgba(255,210,63,.16)}
@media print{.vlBtn{display:none}}`;
  document.head.appendChild(st);
  btn=document.createElement('button');btn.type='button';btn.className='vlBtn';btn.onclick=()=>window.VORLESEN.toggle();
  document.body.appendChild(btn);
  // Textseiten (mit <main>) zeigen den Knopf immer, Spielseiten nur bei offenem Textfenster
  if(document.querySelector('main'))document.body.dataset.vlPage='1';
  ui();setInterval(()=>{if(!on)ui();},600);
  addEventListener('pagehide',()=>{try{S.cancel();}catch(e){}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
