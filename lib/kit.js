// Baukasten für die Schachvarianten (Schach der 6 Reiche, Schach ohne Grenzen, …)
// Farbwahl, Uhr, Tisch (Monitore, Bild & Ton, Chat, Übersetzung, Untertitel), Auswertung mit Psychologie und KI-Bericht, Einführung.
// Jede Seite ruft KIT.init(cfg) auf und liefert dabei Zugriff auf ihren Spielzustand. © 2026 Guido Suchsland
(function(){
'use strict';
const K=window.KIT={};
let C=null;
const esc=K.esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
K.myLang=()=>(ls.get('dreiSchach.lang',navigator.language||'de')||'de').slice(0,2).toLowerCase();
K.myName=()=>ls.get('dreiSchach.name','')||'Ich';
const GM=()=>C.gm(),ON=()=>C.on();
const cur=()=>{const g=GM();return g&&g.order[g.idx];};
const isAI=p=>{const g=GM();if(!g)return false;const o=ON();if(g.online&&o.seats&&o.seats[p])return o.seats[p].kind==='ai';const c=g.ctrl[p];return c&&c!=='human'&&c!=='open';};
K.isAI=isAI;
K.LVL={easy:'leicht',medium:'mittel',hard:'stark',master:'Meister'};

// ================= Oberfläche einhängen =================
K.init=function(cfg){
  C=cfg;C.DEF=Object.assign({},C.PCOL);
  const css=document.createElement('style');css.textContent=`
.kModal{position:fixed;inset:0;z-index:30;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center}
.kModal.show{display:flex}
.kBox{background:#1f2330;border:1px solid #4a5060;border-radius:14px;padding:16px 18px;max-width:640px;width:94%;max-height:88vh;overflow:auto;position:relative;color:#e6e6e6}
.kBox h3{margin:0 0 10px}.kBox h4{margin:14px 0 6px;color:#cfd6e4}
.kX{position:absolute;right:10px;top:10px}
.kNote{color:#9aa1ad;font-size:12px}
.kBar{height:8px;background:#333;border-radius:4px;overflow:hidden}.kBar i{display:block;height:100%;background:#3cc463}
.kGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px}
.kCard{border:2px solid #555;border-radius:10px;padding:6px 10px;background:#191c26}.kCard ul{margin:4px 0;padding-left:18px}
.kList{padding-left:18px}.kList a{color:#8fb6ff;cursor:pointer}
.c-blunder{color:#ff5a4a;font-weight:700}.c-mistake{color:#ff9a3a}.c-inacc{color:#f2d24a}
.kAI{background:#151822;border-radius:10px;padding:8px 12px;margin-top:8px}
#kChat{display:none;position:fixed;right:8px;bottom:8px;width:min(340px,94vw);max-height:46vh;z-index:12;background:rgba(28,30,38,.96);border:1px solid #444;border-radius:12px;flex-direction:column}
#kMons{position:fixed;right:8px;top:56px;z-index:4;display:none;flex-direction:column;gap:6px;pointer-events:none}
@media (orientation:landscape) and (max-height:520px){#ui{width:250px!important;right:auto!important;bottom:8px!important;max-height:none!important;font-size:12px}#ui button,#ui select{padding:3px 6px;font-size:12px}#kMons{top:8px!important;bottom:auto!important;flex-direction:column!important}#kMons canvas{width:96px!important;height:72px!important}#turn{font-size:12px;padding:4px 10px}#kChat{max-height:70vh}}
#kMons canvas{width:168px;height:126px;border-radius:8px;border:3px solid #444;background:#14161c}
@media (max-width:700px){#kMons{top:auto;bottom:130px;flex-direction:row;right:4px}#kMons canvas{width:96px;height:72px}}
#kTour{position:fixed;z-index:40;left:50%;bottom:24px;transform:translateX(-50%);width:min(460px,94vw);background:#22283a;border:2px solid #f2c418;border-radius:14px;padding:14px 16px;display:none;color:#eee;box-shadow:0 6px 30px rgba(0,0,0,.6)}
#kTour h4{margin:0 0 6px}#kTour .row{display:flex;gap:8px;margin-top:10px;justify-content:flex-end}
.kHi{outline:3px solid #f2c418!important;outline-offset:2px;border-radius:8px}
.kClk{font:600 12px ui-monospace,monospace;margin-left:6px}.kClk.low{color:#ff6a50}
`;document.head.appendChild(css);
  const div=document.createElement('div');div.innerHTML=`
<div id="kChat"><div style="display:flex;align-items:center;padding:6px 10px;border-bottom:1px solid #333"><b>💬 Chat</b><span class="kNote" style="margin-left:8px">wird bei Bedarf übersetzt</span><button style="margin-left:auto" onclick="KIT.chatToggle()">✕</button></div>
 <div id="kChatLog" class="notr" style="flex:1;overflow:auto;padding:6px 10px;font-size:13px;min-height:80px"></div>
 <div style="display:flex;gap:4px;padding:4px 6px 0;flex-wrap:wrap">${['👍','👏','😂','😮','😱','😡','🤝','🙏','🤔','😎'].map(e=>`<button style="padding:2px 6px;font-size:18px" onclick="KIT.emo('${e}')">${e}</button>`).join('')}</div>
 <div style="display:flex;gap:6px;padding:6px"><button id="kHearBtn" onclick="KIT.hearToggle()" title="Mit den Computergegnern sprechen (Mikrofon)" style="background:#444">🎤</button><input type="text" id="kChatIn" maxlength="200" placeholder="Nachricht …" style="flex:1" onkeydown="if(event.key==='Enter')KIT.chatSend()"><button onclick="KIT.chatSend()">➤</button></div></div>
<div id="kMons"></div>
<div id="kCol" class="kModal" onclick="if(event.target===this)KIT.colClose()"><div class="kBox"><button class="kX" onclick="KIT.colClose()">✕</button><h3>🎨 Farben</h3>
 <p class="kNote" style="margin-top:0">Wähle für jeden Spieler die Farbe, die du am besten unterscheiden kannst. Das gilt nur auf deinem Gerät.</p><div id="kColRows"></div>
 <label style="display:block;margin-top:8px"><input type="checkbox" id="kSymChk" onchange="KIT.symSet(this.checked)"> zusätzlich Zeichen ■ ▲ ● ◆ ★ ✚ für die Spielerfarben (z. B. bei Farbsehschwäche)</label>
 <div style="margin-top:10px;display:flex;gap:8px"><button onclick="KIT.colReset()">Standard</button><button onclick="KIT.colClose()">Fertig</button></div></div></div>
<div id="kAna" class="kModal" onclick="if(event.target===this)KIT.anaClose()"><div class="kBox" style="max-width:760px"><button class="kX" onclick="KIT.anaClose()">✕</button><h3>🔬 Auswertung</h3><div id="kAnaBody"></div></div></div>
<div id="kTour"><h4 id="kTourT"></h4><div id="kTourX"></div><div class="row"><span class="kNote" id="kTourN" style="margin-right:auto;align-self:center"></span><button onclick="KIT.tourEnd()">Beenden</button><button onclick="KIT.tourGo(-1)">◀</button><button id="kTourNext" onclick="KIT.tourGo(1)">Weiter ▶</button></div></div>`;
  document.body.appendChild(div);
  K.colLoad();
  setInterval(clockTick,250);
  setInterval(()=>{if(GM()&&K.TB.monOn&&document.visibilityState==='visible'){if(C.mon3d)C.mon3d();else monDom();}},150);
};

// ================= Farbwahl =================
K.colLoad=function(){let o={};try{o=JSON.parse(ls.get(C.game+'.colors','{}'))||{};}catch(e){}
  for(const p in C.DEF)C.PCOL[p]=/^#[0-9a-f]{6}$/i.test(o[p]||'')?o[p]:C.DEF[p];};
K.colOpen=function(){const box=document.getElementById('kColRows');
  box.innerHTML=Object.keys(C.DEF).filter(p=>!C.colShow||C.colShow().includes(p)).map(p=>`<div style="display:flex;align-items:center;gap:10px;margin:6px 0"><input type="color" value="${C.PCOL[p]}" data-p="${p}" style="width:48px;height:32px;border:0;background:none;cursor:pointer"><b style="color:${C.PCOL[p]}">${esc(C.PNAME[p])}</b>${GM()?'<span class="kNote">'+esc(C.seatName(p))+'</span>':''}</div>`).join('');
  for(const i of box.querySelectorAll('input'))i.oninput=()=>{const o=K.colGet();o[i.dataset.p]=i.value;ls.set(C.game+'.colors',JSON.stringify(o));K.colLoad();i.nextElementSibling.style.color=i.value;C.onColors&&C.onColors();};
  document.getElementById('kSymChk').checked=K.symOn;document.getElementById('kCol').classList.add('show');};
K.colGet=()=>{try{return JSON.parse(ls.get(C.game+'.colors','{}'))||{};}catch(e){return{};}};
K.colReset=()=>{ls.set(C.game+'.colors','{}');K.colLoad();C.onColors&&C.onColors();K.colOpen();};
K.colClose=()=>document.getElementById('kCol').classList.remove('show');

// ================= Uhr =================
// GM.tc={move:Sekunden je Zug, game:Minuten je Partie}; GM.clock[p]=Restzeit ms; GM.turnAt=Beginn des aktuellen Zuges (ms)
K.TC_MOVE=[[0,'ohne'],[30,'30 s'],[60,'1 Min.'],[120,'2 Min.'],[300,'5 Min.']];
K.TC_GAME=[[0,'ohne'],[5,'5 Min.'],[10,'10 Min.'],[20,'20 Min.'],[30,'30 Min.'],[60,'60 Min.']];
K.tcHTML=function(){return `<div class="row">⏱ Zeit pro Zug: <select id="kTcM">${K.TC_MOVE.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div>
 <div class="row">⌛ Zeit pro Partie: <select id="kTcG">${K.TC_GAME.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div>
 <div class="kNote">Läuft die Zugzeit ab, verfällt der Zug. Ist die Partiezeit verbraucht, scheidet man aus. Bei Fernpartien läuft keine Uhr.</div>`;};
K.tcRead=function(){const m=+(document.getElementById('kTcM')||{}).value||0,g=+(document.getElementById('kTcG')||{}).value||0;return m||g?{move:m,game:g}:null;};
K.clockInit=function(g){K.feelReset&&K.feelReset();g.turnAt=Date.now();g.used={};g.clock={};for(const p of g.order){g.used[p]=0;if(g.tc&&g.tc.game)g.clock[p]=g.tc.game*60000;}};
// nach einem Zug: verbrauchte Zeit buchen, Bedenkzeit zurückgeben
K.clockSpend=function(p){const g=GM();if(!g)return null;const now=Date.now(),ms=Math.max(0,now-(g.turnAt||now));
  if(g.used)g.used[p]=(g.used[p]||0)+ms;if(g.tc&&g.tc.game&&g.clock)g.clock[p]=Math.max(0,(g.clock[p]||0)-ms);return ms;};
K.clockTurn=function(){const g=GM();if(g)g.turnAt=Date.now();};
K.clockLeft=function(p){const g=GM();if(!g||!g.tc)return null;const run=!g.over&&cur()===p?Date.now()-(g.turnAt||Date.now()):0;
  return{move:g.tc.move&&cur()===p?g.tc.move*1000-run:null,game:g.tc.game?(g.clock[p]||0)-run:null};};
const fmt=ms=>{ms=Math.max(0,ms);const s=Math.ceil(ms/1000),m=Math.floor(s/60);return m+':'+String(s%60).padStart(2,'0');};
K.fmt=fmt;
K.clockHTML=function(p){const l=K.clockLeft(p);if(!l)return'';let t='';
  if(l.game!=null)t+=`<span class="kClk${l.game<30000&&cur()===p?' low':''}">⌛${fmt(l.game)}</span>`;
  if(l.move!=null)t+=`<span class="kClk${l.move<10000?' low':''}">⏱${fmt(l.move)}</span>`;return t;};
let lastShown=0;
function clockTick(){const g=GM();if(!g||g.over||!g.tc||C.busyAna||g.paused)return;const p=cur(),l=K.clockLeft(p);if(!l)return;
  if(g.online){const o=ON();if(o.seats&&g.order.some(q=>o.seats[q]&&o.seats[q].kind==='open')){g.turnAt=Date.now();return;}}
  const now=Date.now();if(now-lastShown>900){lastShown=now;C.clockShow&&C.clockShow();}
  const kind=l.game!=null&&l.game<=0?'game':l.move!=null&&l.move<=0?'move':null;
  {const left=Math.min(l.move!=null?l.move:1e9,l.game!=null?l.game:1e9),sec=Math.ceil(left/1000),mine=g.online?p===ON().seat:!isAI(p);
    if(mine&&left>0&&sec<=10&&sec!==g._lowSec){g._lowSec=sec;K.snd('low');}}
  if(!kind)return;
  // online meldet der Spieler am Zug (oder wer die Computer steuert) – ist er weg, nach 5 s jeder andere Mitspieler
  if(g.online){const o=ON();if(!o.seat)return;const over=-(kind==='game'?l.game:l.move);
    if(!(p===o.seat||(isAI(p)&&g.lastBy===o.seat)||over>5000))return;}
  if(g._toFor===p+'@'+g.turnAt)return;g._toFor=p+'@'+g.turnAt;
  C.timeout(p,kind);}

// ================= Tisch: Monitore, Bild & Ton, Chat, Übersetzung =================
const TB=K.TB={emo:{},peer:null,conns:{},calls:{},streams:{},vids:{},cam:null,mic:null,subs:{},names:{},langs:{},av:{},chat:[],unread:0,monOn:true,readOn:false,subOn:false,recog:null};
K.tbHTML=function(){return `<div class="row"><label><input type="checkbox" id="kMonChk" checked onchange="KIT.monSet(this.checked)"> 🖥️ Monitore</label><button onclick="KIT.colOpen()">🎨 Farben</button><button id="kSndBtn" onclick="KIT.sndToggle()">${K.sndOn?'🔊':'🔇'} Ton</button></div>
 <div class="row"><button onclick="KIT.chatToggle()" title="Chat mit den Computergegnern – und in Online-Partien mit den Mitspielern">💬 Mit den Computergegnern reden</button><button id="kHearBtn2" onclick="KIT.hearToggle()" title="Mit den Computergegnern sprechen (Mikrofon)">🎤 Sprechen</button></div>
 <div class="row"><button id="kPauseBtn" onclick="KIT.pauseToggle()">⏸ Pause</button><button onclick="KIT.replayStart()">⏮ Nachspielen</button><button onclick="KIT.varStart()">🔬 Analysebrett</button></div>
 <div class="row"><button class="notr" onclick="KIT.langOpen()">🌐 Sprache · Language</button><button onclick="KIT.fullscreen()">⛶ Vollbild</button><button class="kInstall" style="display:${K.canInstall&&K.canInstall()?'':'none'}" onclick="KIT.install()">📲 Als App installieren</button></div>
 <div class="row"><button onclick="KIT.save()">💾 Speichern</button><button onclick="KIT.exportMoves()">📄 Zugliste</button><button onclick="KIT.myGames()">📋 Meine Partien</button></div>
 <div id="kTb" style="display:none">
  <div class="row"><button id="kCamBtn" onclick="KIT.tbCam()">📷 Kamera</button><button id="kMicBtn" onclick="KIT.tbMic()">🎤 Mikrofon</button><button onclick="KIT.chatToggle()">💬 Chat <span id="kChatBadge"></span></button></div>
  <div class="row"><label><input type="checkbox" id="kSubChk" onchange="KIT.subSet(this.checked)"> 🗣️ Gesprochenes als Untertitel</label></div>
  <div class="row"><label><input type="checkbox" onchange="KIT.TB.readOn=this.checked"> 🔊 Übersetzungen vorlesen</label></div>
  <div class="row"><button onclick="KIT.pushOn(true)">🔔 Benachrichtigen, wenn ich dran bin</button></div>
  <div class="row"><button onclick="KIT.tbRenew()">🔄 Verbindung erneuern</button><button onclick="KIT.tbTest()">🔧 Verbindung testen</button></div>
  <div class="kNote" id="kTbState"></div><div class="kNote" id="kTbTest"></div></div>`;};
K.monSet=on=>{TB.monOn=on;if(C.mon3d)C.mon3d();else monDom();C.render&&C.render();};
function wrap(x,text,w){const words=String(text).split(/\s+/),lines=[];let l='';for(const wd of words){const t=l?l+' '+wd:wd;if(x.measureText(t).width>w&&l){lines.push(l);l=wd;}else l=t;}if(l)lines.push(l);return lines.slice(-3);}
// ein Monitorbild (320 × 240) zeichnen: Video oder Bild, Name, am Zug, Uhr, Untertitel
K.monPaint=function(x,p){const g=GM(),o=ON(),now=Date.now(),PC=C.PCOL[p];
  x.fillStyle='#14161c';x.fillRect(0,0,320,240);
  const v=TB.vids[p],live=v&&v.readyState>=2&&v.videoWidth&&(p===o.seat?!!TB.cam:TB.streams[p]&&TB.streams[p].getVideoTracks().some(t=>t.readyState==='live'&&!t.muted)&&!(TB.av[p]&&TB.av[p].cam===false));
  if(live){const r=Math.max(320/v.videoWidth,240/v.videoHeight),w=v.videoWidth*r,h=v.videoHeight*r;x.save();if(p===o.seat){x.translate(320,0);x.scale(-1,1);}x.drawImage(v,(320-w)/2,(240-h)/2,w,h);x.restore();}
  else if(K.monAvatar&&K.monAvatar(x,p,performance.now())){}
  else{const gr=x.createRadialGradient(160,105,10,160,105,120);gr.addColorStop(0,PC);gr.addColorStop(1,'#14161c');x.fillStyle=gr;x.fillRect(0,0,320,240);
    x.font='88px "Segoe UI Emoji","Noto Color Emoji",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';
    x.fillText(isAI(p)?'🤖':(String(C.seatName(p))[0]||'?').toUpperCase(),160,105);}
  if(g.out.includes(p)){x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,0,320,240);x.fillStyle='#ccc';x.font='bold 26px sans-serif';x.textAlign='center';x.fillText(K.tr('ausgeschieden'),160,110);}
  x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,200,320,40);x.fillStyle=PC;x.font='bold 22px sans-serif';x.textAlign='left';x.textBaseline='middle';
  x.fillText(K.tr(C.PNAME[p]+' · '+C.seatName(p)).slice(0,28),10,220);
  const l=K.clockLeft(p);
  if(!g.over&&cur()===p){x.fillStyle=PC;x.fillRect(0,0,320,30);x.fillStyle='#000';x.font='bold 18px sans-serif';x.textAlign='center';
    x.fillText(K.tr('am Zug')+(l&&l.move!=null?' · ⏱ '+fmt(l.move):''),160,15);}
  if(l&&l.game!=null){x.font='bold 18px ui-monospace,monospace';x.textAlign='right';x.textBaseline='middle';x.fillStyle=l.game<30000?'#ff6a50':'#fff';x.fillText('⌛'+fmt(l.game),314,46);}
  const em=TB.emo[p];if(em&&now-em.t<4000){x.font='72px "Segoe UI Emoji","Noto Color Emoji",sans-serif';x.textAlign='left';x.textBaseline='top';x.fillText(em.e,8,36);}
  if(K.symOn){x.font='bold 30px sans-serif';x.textAlign='right';x.textBaseline='bottom';x.lineWidth=4;x.strokeStyle='#000';x.strokeText(K.SYM[p]||'',312,196);x.fillStyle='#fff';x.fillText(K.SYM[p]||'',312,196);}
  if(TB.av[p]&&TB.av[p].mic){x.font='22px sans-serif';x.textAlign='right';x.fillStyle='#fff';x.fillText('🎤',312,220);}
  const sb=TB.subs[p];if(sb&&now-sb.t<7000){x.font='17px sans-serif';x.textAlign='center';const lsn=wrap(x,sb.text,300);
    x.fillStyle='rgba(0,0,0,.75)';x.fillRect(0,196-lsn.length*22,320,lsn.length*22+2);x.fillStyle='#fff';lsn.forEach((t,i)=>x.fillText(t,160,196-(lsn.length-i)*22+12));}
  return !g.over&&cur()===p;};
// 2D-Seiten: Monitore als Kacheln am rechten Rand
const MONS={};
function monDom(){const box=document.getElementById('kMons');if(!box)return;const g=GM();
  if(!g||!TB.monOn){box.style.display='none';return;}box.style.display='flex';
  for(const p in MONS)if(!g.order.includes(p)){MONS[p].remove();delete MONS[p];}
  for(const p of g.order){let cv=MONS[p];if(!cv){cv=document.createElement('canvas');cv.width=320;cv.height=240;box.appendChild(cv);MONS[p]=cv;}
    const act=K.monPaint(cv.getContext('2d'),p);cv.style.borderColor=act?'#fff':C.PCOL[p];}}
K.monDom=monDom;
// ---------- Übersetzen: zuerst im Browser (Chrome), sonst über den freien Dienst MyMemory ----------
const trCache=new Map(),trApis={};
K.translate=async function(text,from,to){
  if(!text||!from||from===to)return null;const key=from+'|'+to+'|'+text;if(trCache.has(key))return trCache.get(key);let out=null;
  try{if(window.Translator&&Translator.create){const k=from+'>'+to,tmo=(pr,ms)=>Promise.race([pr,new Promise(r=>setTimeout(()=>r(null),ms))]);
    if(trApis[k]===undefined){trApis[k]=false;const av=await tmo(Translator.availability({sourceLanguage:from,targetLanguage:to}),1500);if(av==='available')trApis[k]=await tmo(Translator.create({sourceLanguage:from,targetLanguage:to}),3000)||false;}
    if(trApis[k])out=await tmo(trApis[k].translate(text),4000);}}catch(e){}
  if(!out){try{const ctl=new AbortController(),tt=setTimeout(()=>ctl.abort(),6000);
    const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0,480))}&langpair=${from}|${to}`,{signal:ctl.signal});clearTimeout(tt);
    if(r.ok){const j=await r.json();const t=j&&j.responseData&&j.responseData.translatedText;if(t&&!/MYMEMORY WARNING|INVALID/i.test(t))out=t.replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&');}}catch(e){}}
  if(out)trCache.set(key,out);return out;};
function speak(text,lang){try{if(!window.speechSynthesis)return;const u=new SpeechSynthesisUtterance(text);u.lang=lang;speechSynthesis.speak(u);}catch(e){}}
// ---------- Verbindungen zu den Mitspielern (PeerJS, Kennungen vom Server) ----------
const QS=new URLSearchParams(location.search);
function loadPeerJS(){return window.Peer?Promise.resolve(true):new Promise(r=>{const sc=document.createElement('script');sc.src='lib/peerjs.min.js';sc.onload=()=>r(true);sc.onerror=()=>r(false);document.head.appendChild(sc);});}
async function tbIce(){const list=[{urls:['stun:stun.l.google.com:19302','stun:stun.cloudflare.com:3478']}];
  const ph=QS.get('peerhost'),base=ph?`http://${ph}:${QS.get('peerport')||9000}`:'https://dreischach.g-suchsland.workers.dev';
  try{const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),4000);const r=await fetch(base+'/turn',{signal:ctl.signal,cache:'no-store'});clearTimeout(t);if(r.ok){const j=await r.json();list.push(...(j.iceServers||[]).filter(x=>x&&x.urls));}}catch(e){}
  return list;}
const seatOfId=id=>{const o=ON();return Object.keys(o.rtc||{}).find(k=>o.rtc[k]===id);};
function humans(){const g=GM(),o=ON();return g?g.order.filter(q=>q!==o.seat&&o.seats&&o.seats[q]&&o.seats[q].kind==='human'):[];}
K.tbStart=async function(){const g=GM(),o=ON();
  if(TB.peer||TB.starting||!g||!g.online||!o.seat||!o.rtc)return;TB.starting=true;
  document.getElementById('kTb').style.display='block';
  if(!await loadPeerJS()){tbState('⚠️ Verbindungsbaustein nicht geladen.');TB.starting=false;return;}
  const ice=await tbIce(),ph=QS.get('peerhost'),opts={config:{iceServers:ice},debug:0};
  Object.assign(opts,ph?{host:ph,port:+(QS.get('peerport')||9000),path:'/',secure:QS.get('peersecure')==='1'}:{host:'dreischach.g-suchsland.workers.dev',port:443,path:'/',secure:true});
  TB.peer=new Peer(o.rtc[o.seat],opts);TB.starting=false;
  TB.peer.on('open',()=>{K.tbTick();tbUI();});
  TB.peer.on('connection',c=>tbConn(c));
  TB.peer.on('call',c=>{c.answer(tbOut());tbCall(c);});
  TB.peer.on('disconnected',()=>{try{TB.peer.reconnect();}catch(e){}});
  TB.peer.on('error',()=>{});
  clearInterval(TB.tick);TB.tick=setInterval(K.tbTick,5000);};
K.tbStop=function(){try{TB.peer&&TB.peer.destroy();}catch(e){}TB.peer=null;TB.conns={};TB.calls={};clearInterval(TB.tick);const e=document.getElementById('kTb');if(e)e.style.display='none';};
K.tbTick=function(){if(!TB.peer||TB.peer.disconnected||!TB.peer.open)return;const o=ON();
  for(const q of humans()){const c=TB.conns[q];if(c&&(c.open||Date.now()-c._t<8000))continue;
    if(o.seat<q){try{c&&c.close();}catch(e){}const n=TB.peer.connect(o.rtc[q],{reliable:true});n._t=Date.now();tbConn(n,q);}}
  tbUI();};
function tbConn(c,q){q=q||seatOfId(c.peer);if(!q)return;TB.conns[q]=c;c._t=c._t||Date.now();
  c.on('open',()=>{c.send({t:'hi',name:K.myName(),lang:K.myLang(),av:tbAv()});if(ON().seat<q)tbDial(q);tbUI();});
  c.on('data',d=>tbData(q,d));c.on('close',()=>{if(TB.conns[q]===c)delete TB.conns[q];tbUI();});c.on('error',()=>{});}
function tbAv(){return{cam:!!TB.cam,mic:!!(TB.mic&&TB.mic.getAudioTracks().some(t=>t.enabled))};}
let DUMMY=null;
function tbOut(){if(!DUMMY){const c=document.createElement('canvas');c.width=64;c.height=48;c.getContext('2d').fillRect(0,0,64,48);DUMMY={v:c.captureStream(1).getVideoTracks()[0]};
    try{const a=new (window.AudioContext||window.webkitAudioContext)();DUMMY.a=a.createMediaStreamDestination().stream.getAudioTracks()[0];}catch(e){}}
  const v=TB.cam?TB.cam.getVideoTracks()[0]:DUMMY.v,a=TB.mic?TB.mic.getAudioTracks()[0]:DUMMY.a;return new MediaStream([v,a].filter(Boolean));}
function tbDial(q){const o=ON();if(!TB.peer||!o.rtc[q])return;try{TB.calls[q]&&TB.calls[q].close();}catch(e){}tbCall(TB.peer.call(o.rtc[q],tbOut()),q);}
function hiddenVid(muted){const v=document.createElement('video');v.muted=!!muted;v.autoplay=true;v.playsInline=true;v.style.cssText='position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none';document.body.appendChild(v);return v;}
function tbCall(call,q){q=q||seatOfId(call.peer);if(!q||!call)return;TB.calls[q]=call;
  call.on('stream',st=>{TB.streams[q]=st;let v=TB.vids[q];if(!v)v=TB.vids[q]=hiddenVid(false);v.srcObject=st;v.play().catch(()=>{});tbUI();});
  call.on('close',()=>{if(TB.calls[q]===call)delete TB.calls[q];});call.on('error',()=>{});}
function tbBroadcast(m){for(const q in TB.conns){const c=TB.conns[q];try{if(c.open)c.send(m);}catch(e){}}}
function tbRedial(){const o=ON();for(const q in TB.conns){const c=TB.conns[q];if(!c.open)continue;if(o.seat<q)tbDial(q);else c.send({t:'recall'});}tbBroadcast({t:'av',av:tbAv()});}
function tbData(q,d){if(!d||typeof d!=='object')return;
  if(d.t==='hi'){TB.names[q]=String(d.name||'').slice(0,18);TB.langs[q]=d.lang;TB.av[q]=d.av||{};tbUI();}
  else if(d.t==='av'){TB.av[q]=d.av||{};}
  else if(d.t==='recall'){if(ON().seat<q)tbDial(q);}
  else if(d.t==='chat')chatIn(d.mon&&C.PNAME[d.mon]?d.mon:q,d);
  else if(d.t==='sub')subIn(q,d);
  else if(d.t==='emo')emoIn(q,d.e);}
function tbState(t){const e=document.getElementById('kTbState');if(e)e.textContent=t;}
function tbUI(){const hs=humans(),on=hs.filter(q=>TB.conns[q]&&TB.conns[q].open);
  tbState(!hs.length?'Noch keine Mitspieler am Tisch.':on.length?'Verbunden mit: '+on.map(q=>C.PNAME[q]).join(', ')+'.':'Mitspieler sind gerade nicht online – Chat, Bild und Ton gehen, sobald jemand da ist.');
  const cb=document.getElementById('kCamBtn'),mb=document.getElementById('kMicBtn');if(cb)cb.classList.toggle('on',!!TB.cam);if(mb)mb.classList.toggle('on',!!TB.mic);}
K.tbCam=async function(){const o=ON();if(TB.cam){TB.cam.getTracks().forEach(t=>t.stop());TB.cam=null;}
  else{try{TB.cam=await navigator.mediaDevices.getUserMedia({video:{width:320,height:240,facingMode:'user'}});}catch(e){alert('Die Kamera ist nicht verfügbar oder wurde nicht erlaubt.');return;}
    let v=TB.vids[o.seat];if(!v)v=TB.vids[o.seat]=hiddenVid(true);v.srcObject=TB.cam;v.play().catch(()=>{});}
  tbRedial();tbUI();};
K.tbMic=async function(){if(TB.mic){TB.mic.getTracks().forEach(t=>t.stop());TB.mic=null;}
  else{try{TB.mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});}catch(e){alert('Das Mikrofon ist nicht verfügbar oder wurde nicht erlaubt.');return;}}
  tbRedial();tbUI();};
// ---------- Chat ----------
K.chatToggle=function(){const b=document.getElementById('kChat');const on=b.style.display!=='flex';b.style.display=on?'flex':'none';if(on){TB.unread=0;chatBadge();setTimeout(()=>document.getElementById('kChatIn').focus(),50);}};
function chatBadge(){const e=document.getElementById('kChatBadge');if(e)e.textContent=TB.unread?'('+TB.unread+')':'';}
const meSeat=()=>{const o=ON(),g=GM();return o.seat||(g&&g.order.find(q=>!isAI(q)))||'B';};
// Allein gegen Monster: Mikrofon an – die Monster hören zu (Spracherkennung des Browsers)
K.hearToggle=function(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert(K.tr('Dein Browser kann leider keine Sprache erkennen – schreib den Computergegnern im Chat.'));return;}
  const on=!TB.subOn;K.subSet(on);const c=document.getElementById('kSubChk');if(c)c.checked=on;K.hearUI();
  if(on){const g=GM(),q=g&&g.order.find(x=>isAI(x));if(q){TB.chat.push({q:'',name:'🎤',text:K.tr('🎤 Die Computergegner hören zu. Sprich sie mit Namen an, z. B. „{0}, greif Rot an!“').replace('{0}',K.monName(q)),n:(g.rec||[]).length});if(document.getElementById('kChat').style.display!=='flex')K.chatToggle();else chatRender();}}};
K.hearUI=function(){const b2=document.getElementById('kHearBtn2');if(b2)b2.style.background=TB.subOn?'#c0392b':'';const b=document.getElementById('kHearBtn');if(b){b.style.background=TB.subOn?'#c0392b':'#444';b.title=K.tr(TB.subOn?'Die Computergegner hören zu – antippen zum Ausschalten':'Mit den Computergegnern sprechen (Mikrofon)');}};
K.chatSend=function(){const i=document.getElementById('kChatIn'),text=(i.value||'').trim().slice(0,200);if(!text)return;i.value='';
  const m={t:'chat',text,lang:K.myLang(),name:K.myName(),id:Date.now()};tbBroadcast(m);chatIn(meSeat(),m);};
K.chatIn2=(q,m)=>chatIn(q,m);
async function chatIn(q,m){const me=meSeat();
  const line={q,name:m.mon?m.name:q===me?K.myName():(TB.names[q]||C.seatName(q)),text:String(m.text||'').slice(0,300),tr:null,n:(GM().rec||[]).length,offer:m.offer||null,mon:!!m.mon};TB.chat.push(line);if(TB.chat.length>200)TB.chat.shift();
  if(q!==me||m.mon){TB.subs[q]={text:line.text,t:Date.now()};if(document.getElementById('kChat').style.display!=='flex'){TB.unread++;chatBadge();if(m.offer&&(m.offer.to===me))K.chatToggle();}}
  chatRender();
  if(m.mon&&(!m.lang||m.lang===K.myLang()))K.speakMon&&K.speakMon(q,line.text);
  if(!m.mon&&K.dipBoss&&K.dipBoss())K.dipHear({p:q,text:line.text,ans:m.ans});
  if((q!==me||m.mon)&&m.lang&&m.lang!==K.myLang()){const t=await K.translate(line.text,m.lang,K.myLang());if(t){line.tr=t;TB.subs[q]={text:t,t:Date.now()};chatRender();if(m.mon)K.speakMon(q,t);else if(TB.readOn)speak(t,K.myLang());}}}
function emoIn(q,e){e=String(e||'').slice(0,4);TB.emo[q]={e,t:Date.now()};TB.chat.push({q,name:TB.names[q]||C.seatName(q),text:e,n:(GM().rec||[]).length});chatRender();}
K.chatRefresh=()=>chatRender();
function chatRender(){const el=document.getElementById('kChatLog');
  const me=meSeat();
  el.innerHTML=TB.chat.map(l=>`<div><b style="color:${C.PCOL[l.q]||'#ccc'}">${l.mon?'🤖 ':''}${esc(l.name)}:</b> ${esc(l.text)}${l.tr?`<br><i style="color:#9fd09f">🌐 ${esc(l.tr)}</i>`:''}${l.offer&&l.offer.to===me&&!l.answered?`<br><button onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.remove());KIT.dipAnswer('${esc(l.offer.id)}',true)">🤝 Einverstanden</button> <button onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.remove());KIT.dipAnswer('${esc(l.offer.id)}',false)">✋ Nein</button>`:''}</div>`).join('');el.scrollTop=el.scrollHeight;}
// ---------- Gesprochenes als Untertitel (Spracherkennung im Browser), bei Bedarf übersetzt ----------
const LOCALE={de:'de-DE',en:'en-US',fr:'fr-FR',es:'es-ES',it:'it-IT',pt:'pt-PT',nl:'nl-NL',pl:'pl-PL',ru:'ru-RU',tr:'tr-TR',uk:'uk-UA',zh:'zh-CN',ja:'ja-JP',ko:'ko-KR',th:'th-TH',ar:'ar-SA',is:'is-IS',da:'da-DK'};
K.subSet=function(on){TB.subOn=on;const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(on&&!SR){alert('Dein Browser kann Gesprochenes nicht in Text umwandeln (am besten Chrome verwenden).');document.getElementById('kSubChk').checked=false;TB.subOn=false;return;}
  if(!on){try{TB.recog&&TB.recog.stop();}catch(e){}TB.recog=null;return;}
  const r=new SR();r.lang=LOCALE[K.myLang()]||'de-DE';r.continuous=true;r.interimResults=false;
  r.onresult=ev=>{for(let i=ev.resultIndex;i<ev.results.length;i++)if(ev.results[i].isFinal){const text=ev.results[i][0].transcript.trim();if(!text)continue;
    if(!ON().seat){if(TB.speaking)continue;chatIn(meSeat(),{t:'chat',text:text.slice(0,200),lang:K.myLang(),name:K.myName(),id:Date.now()});if(document.getElementById('kChat').style.display!=='flex')K.chatToggle();continue;}
    const me=ON().seat;TB.subs[me]={text,t:Date.now()};TB.chat.push({q:me,name:K.myName(),text,spoken:true,n:(GM().rec||[]).length});tbBroadcast({t:'sub',text,lang:K.myLang()});if(K.dipBoss&&K.dipBoss())K.dipHear({p:me,text});}};
  r.onend=()=>{if(TB.subOn&&TB.recog===r)setTimeout(()=>{if(TB.subOn&&TB.recog===r)try{r.start();}catch(e){}},300);};r.onerror=e=>{if(e&&(e.error==='not-allowed'||e.error==='service-not-allowed')){TB.subOn=false;K.hearUI&&K.hearUI();}};
  TB.recog=r;try{r.start();}catch(e){}};
async function subIn(q,m){const text=String(m.text||'').slice(0,300);TB.subs[q]={text,t:Date.now()};
  const line={q,name:TB.names[q]||C.seatName(q),text,spoken:true,n:(GM().rec||[]).length};TB.chat.push(line);
  if(m.lang&&m.lang!==K.myLang()){const t=await K.translate(text,m.lang,K.myLang());if(t){line.tr=t;TB.subs[q]={text:t,t:Date.now()};if(TB.readOn)speak(t,K.myLang());}}}

// ================= Auswertung =================
// GM.rec: je Zug {p,f,t,pc,cap,capP,ms,chk:[…],mat:{p:Material nach dem Zug}} oder {p,to:'move'|'game'} bei Zeitablauf.
// Die Seite liefert: C.anaPos(i) stellt die Stellung vor Zug i her, C.anaScores(p) bewertet alle Züge (Bauerneinheiten), C.anaRestore().
const CLS=[[3,'blunder'],[1.2,'mistake'],[0.5,'inacc']];
let ANA=null;
K.anaOpen=function(){const g=GM();if(!g||!g.rec||!g.rec.length){alert('Noch keine Züge zum Auswerten.');return;}
  if(g.online&&!g.over&&ON().seat){alert('Die Auswertung ist in laufenden Online-Partien erst nach dem Spiel möglich – sonst könnte man sich Hilfe holen.');return;}
  const rec=g.rec,n=rec.length,res=new Array(n).fill(null);ANA={rec,res,i:0,n,order:g.order.slice(),over:g.over,winner:g.winner};
  document.getElementById('kAna').classList.add('show');anaProg(0);C.busyAna=true;
  const step=()=>{if(!ANA)return;const t0=performance.now();
    try{while(ANA.i<n&&performance.now()-t0<60){const i=ANA.i++,e=rec[i];if(e.to||!e.f)continue;
        C.anaPos(i);const sc=C.anaScores(e.p);if(!sc.length)continue;
        let best=null,bv=-1e9,bv2=-1e9,pv=null;
        for(const s of sc){if(s.v>bv){bv2=bv;bv=s.v;best=s;}else if(s.v>bv2)bv2=s.v;if(String(s.f)===String(e.f)&&String(s.t)===String(e.t))pv=s.v;}
        if(pv==null)continue;const loss=Math.max(0,bv-pv);
        res[i]={p:e.p,loss,cls:(CLS.find(c=>loss>=c[0])||[])[1]||'',best:loss>=0.6?best:null};
        if(!isAI(e.p)&&sc.length>=3&&bv-bv2<1.5)res[i].eng=pv>=bv-1e-9;}}
    finally{C.anaRestore();}
    anaProg(ANA.i/n);if(ANA.i<n)setTimeout(step,0);else{C.busyAna=false;anaRender();}};
  setTimeout(step,30);};
K.anaClose=()=>{document.getElementById('kAna').classList.remove('show');if(ANA&&ANA.i<ANA.n){ANA=null;C.busyAna=false;}};
function anaProg(f){document.getElementById('kAnaBody').innerHTML=`<p>Analysiere die Partie … ${Math.round(f*100)} %</p><div class="kBar"><i style="width:${Math.round(f*100)}%"></i></div>`;}
const nm=p=>{const n=C.seatName(p);return n===C.PNAME[p]?n:C.PNAME[p]+' ('+n+')';};
function stats(){const{rec,res,order}=ANA,st={};
  for(const p of order)st[p]={moves:0,loss:0,good:0,blunder:0,mistake:0,inacc:0,ms:[],capOn:{},chkOn:{},leadCaps:0,caps:0,revOpp:0,revHit:0,tiltLoss:0,tiltN:0,fastErr:0,fastN:0,slowErr:0,slowN:0,timeouts:0,promo:0};
  const lastHurt={},big={};let prevMat=null;
  rec.forEach((e,i)=>{const s=st[e.p];if(!s)return;if(e.to){if(e.to==='move'||e.to==='game')s.timeouts++;return;}const r=res[i];
    if(r){s.moves++;s.loss+=Math.min(r.loss,6);if(!r.cls)s.good++;else s[r.cls]++;if(big[e.p]>0){s.tiltLoss+=Math.min(r.loss,6);s.tiltN++;big[e.p]--;}}
    if(e.ms!=null){s.ms.push(e.ms);if(r){const bad=r.cls==='blunder'||r.cls==='mistake';if(e.ms<4000){s.fastN++;if(bad)s.fastErr++;}else{s.slowN++;if(bad)s.slowErr++;}}}
    if(e.promo)s.promo++;
    if(e.cap&&e.capP){s.capOn[e.capP]=(s.capOn[e.capP]||0)+1;s.caps++;
      if(prevMat){const others=order.filter(q=>q!==e.p&&prevMat[q]!=null),lead=others.reduce((a,q)=>prevMat[q]>prevMat[a]?q:a,others[0]);
        if(lead===e.capP&&others.some(q=>q!==lead&&prevMat[q]<prevMat[lead]))s.leadCaps++;}
      if(lastHurt[e.p]){s.revOpp++;if(lastHurt[e.p]===e.capP)s.revHit++;lastHurt[e.p]=null;}
      lastHurt[e.capP]=e.p;if((C.VAL[e.cap]||0)>=3)big[e.capP]=2;}
    for(const q of e.chk||[])s.chkOn[q]=(s.chkOn[q]||0)+1;
    if(e.mat)prevMat=e.mat;});
  return st;}
function chart(){const{rec,order}=ANA,W=560,H=150,pad=24,pts=rec.map(e=>e.mat).filter(Boolean);if(pts.length<2)return'';
  const all=pts.flatMap(o=>order.map(q=>o[q]||0)),mx=Math.max(...all),mn=Math.min(...all),n=pts.length;
  const X=i=>pad+(W-pad*2)*i/(n-1),Y=v=>H-pad-(H-pad*2)*(v-mn)/Math.max(1,mx-mn);
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#151822;border-radius:8px" role="img" aria-label="Material im Verlauf">`;
  for(const q of order)s+=`<polyline fill="none" stroke="${C.PCOL[q]}" stroke-width="2" points="${pts.map((o,i)=>X(i).toFixed(1)+','+Y(o[q]||0).toFixed(1)).join(' ')}"/>`;
  s+=`<text x="${pad}" y="14" fill="#999" font-size="11">Material im Verlauf</text><text x="${W-pad}" y="${H-6}" fill="#999" font-size="11" text-anchor="end">Zug ${rec.length}</text></svg>`;return s;}
// Mitschrift: angekündigte Angriffe („greif Rot an“) mit den folgenden Zügen vergleichen
const ATT=/(angr|greif|schlag|attack|kill|vernicht|platt|jagen|go for|let'?s get|gegen )/i;
function talk(){const out=[];
  for(const x of TB.chat){if(!x.q||!ATT.test(x.text))continue;
    const named=Object.keys(C.PNAME).filter(q=>q!==x.q&&ANA.order.includes(q)&&new RegExp('\\b'+C.PNAME[q]+'\\b','i').test(x.text));if(!named.length)continue;
    const target=named[0];let own=0,onT=0,onO=0;
    for(let i=x.n;i<ANA.rec.length&&own<6;i++){const e=ANA.rec[i];if(e.p!==x.q||e.to)continue;own++;
      if(e.capP)(e.capP===target?onT++:onO++);for(const q of e.chk||[])(q===target?onT++:onO++);}
    out.push({x,target,verdict:own===0?'none':onT&&onT>=onO?'kept':onO>onT?'bluff':'words'});}
  return out;}
function silent(st){const out=[],o=ANA.order;if(o.length<3)return out;
  for(let i=0;i<o.length;i++)for(let j=i+1;j<o.length;j++){const a=o[i],b=o[j];
    const mutual=(st[a].capOn[b]||0)+(st[b].capOn[a]||0);
    for(const c of o){if(c===a||c===b)continue;const third=(st[a].capOn[c]||0)+(st[b].capOn[c]||0);
      if(third>=4&&mutual<=Math.floor(third/4)&&(st[a].capOn[c]||0)>=2&&(st[b].capOn[c]||0)>=2)out.push({a,b,c,mutual,third});}}
  return out;}
function anaRender(){const st=stats(),{rec,res,order}=ANA,pct=(a,b)=>b?Math.round(100*a/b):0;
  let h=`<div id="kAIWrap"><button id="kAIBtn" onclick="KIT.anaAI()">📝 Professionelle Auswertung (KI-Bericht)</button>
    <div class="kNote" style="margin-top:4px">Für den Bericht werden die Auswertung und – falls vorhanden – die Gesprächsmitschrift an den KI-Dienst von Cloudflare geschickt.</div><div id="kAIOut"></div></div>`;
  h+=chart();
  h+=`<h4>Spieler im Vergleich</h4><div class="kGrid">`;
  for(const p of order){const s=st[p];if(!s.moves&&!s.caps&&!s.timeouts)continue;const avg=s.moves?s.loss/s.moves:0,L=[];
    L.push(`Genauigkeit: ${pct(s.good,s.moves)} % der Züge ohne Fehler`);
    L.push(`Patzer ${s.blunder} · Fehler ${s.mistake} · Ungenauigkeiten ${s.inacc}`);
    if(s.ms.length)L.push(`Bedenkzeit im Schnitt: ${Math.round(s.ms.reduce((a,b)=>a+b,0)/s.ms.length/1000).toLocaleString('de-DE')} s`);
    if(s.timeouts)L.push(`Zeit abgelaufen: ${s.timeouts}×`);
    const tg=order.filter(q=>q!==p);L.push('Geschlagen bei: '+tg.map(q=>`${esc(C.PNAME[q])} ${s.capOn[q]||0}`).join(' · ')+(tg.some(q=>s.chkOn[q])?' · Schach gegen: '+tg.map(q=>`${esc(C.PNAME[q])} ${s.chkOn[q]||0}`).join(' · '):''));
    if(!isAI(p)){const ev=res.filter(r=>r&&r.p===p&&r.eng!==undefined),hit=ev.filter(r=>r.eng).length;
      if(ev.length>=8){const q=Math.round(100*hit/ev.length);L.push(`Übereinstimmung mit dem Computer: ${q} % (bei ${ev.length} nicht eindeutigen Zügen)`+(ev.length>=15&&q>=70?' – <b class="c-blunder">auffällig hoch</b>':''));}}
    h+=`<div class="kCard" style="border-color:${C.PCOL[p]}"><b style="color:${C.PCOL[p]}">${esc(nm(p))}</b>${isAI(p)?' 🤖':''}<ul>${L.map(l=>`<li>${l}</li>`).join('')}</ul></div>`;}
  h+='</div>';
  // psychologische Auswertung: Spielverhalten unter Druck
  h+=`<h4>🧠 Psychologische Auswertung</h4><ul class="kList">`;let any=false;
  for(const p of order){const s=st[p];if(!s.moves)continue;const avg=s.loss/s.moves,T=[];
    if(s.caps>=4&&s.leadCaps/s.caps>=0.6)T.push('greift bevorzugt den Führenden an');
    if(s.revOpp>=3&&s.revHit/s.revOpp>=0.6)T.push('nachtragend: schlägt oft zurück, wer ihn zuletzt geschlagen hat');
    else if(s.revOpp>=3&&s.revHit/s.revOpp<=0.2)T.push('lässt sich nicht provozieren: schlägt selten direkt zurück');
    if(s.tiltN>=3&&s.tiltLoss/s.tiltN>avg*1.6+0.3)T.push('nach eigenen Verlusten deutlich unruhiger (mehr Fehler)');
    else if(s.tiltN>=3&&s.tiltLoss/s.tiltN<avg*0.7)T.push('bleibt nach Verlusten ruhig');
    if(s.fastN>=5&&s.slowN>=5&&s.fastErr/s.fastN>s.slowErr/s.slowN*1.8+0.05)T.push('schnelle Züge sind deutlich fehleranfälliger – Ungeduld kostet');
    if(s.caps===0&&s.moves>=15)T.push('sehr vorsichtig: hat nichts geschlagen');
    if(s.caps>=s.moves*0.35&&s.moves>=10)T.push('angriffslustig: schlägt, wann immer es geht');
    const tg=order.filter(q=>q!==p).sort((a,b)=>(s.capOn[b]||0)+(s.chkOn[b]||0)-(s.capOn[a]||0)-(s.chkOn[a]||0));
    if(tg.length>1){const a=(s.capOn[tg[0]]||0)+(s.chkOn[tg[0]]||0),b=(s.capOn[tg[1]]||0)+(s.chkOn[tg[1]]||0);if(a>=4&&a>=2*b+1)T.push(`hat es vor allem auf ${C.PNAME[tg[0]]} abgesehen`);}
    if(s.timeouts>=2)T.push('gerät oft in Zeitnot');
    if(T.length){any=true;h+=`<li><b style="color:${C.PCOL[p]}">${esc(nm(p))}</b>: ${T.join('; ')}</li>`;}}
  for(const x of silent(st)){any=true;h+=`<li>🤝 Stilles Bündnis? ${esc(nm(x.a))} und ${esc(nm(x.b))} haben sich weitgehend geschont (${x.mutual}× geschlagen) und gemeinsam ${esc(nm(x.c))} angegriffen (${x.third}×).</li>`;}
  if(!any)h+='<li class="kNote">Noch keine auffälligen Verhaltensmuster – dafür braucht es meist eine längere Partie.</li>';
  h+='</ul>';
  {const dl=K.dipLog?K.dipLog():[];if(dl.length)h+='<h4>🤝 Bündnisse und Verrat</h4><ul class="kList">'+dl.map(x=>`<li>nach Zug ${x.n}: ${esc(K.dipText(x))}</li>`).join('')+'</ul>';}
  {const rows=order.filter(p=>!isAI(p)).map(p=>{const d=K.oppDescribe&&K.oppDescribe(p);return d?`<li><b style="color:${C.PCOL[p]}">${esc(nm(p))}</b>: ${d.map(esc).join(' · ')}</li>`:'';}).join('');
    if(rows)h+=`<h4>🧠 Was die Computergegner über eure Spielweise gelernt haben</h4><ul class="kList">${rows}</ul>`;}
  if(TB.chat.length){const tk=talk();h+=`<h4>Gesagt und getan</h4>`;
    if(!tk.length)h+='<p class="kNote">In der Mitschrift gibt es keine erkennbaren Ankündigungen von Angriffen.</p>';
    else{const V={kept:'✅ hielt Wort',bluff:'🎭 Bluff? – griff stattdessen andere an',words:'💬 nur Worte – keine Taten gegen das Ziel',none:'⏳ danach nicht mehr gezogen'};
      h+='<ul class="kList">'+tk.map(t=>`<li>nach Zug ${t.x.n}: <b style="color:${C.PCOL[t.x.q]}">${esc(t.x.name)}</b>: „${esc(t.x.text)}“ → Ziel ${esc(C.PNAME[t.target])}: ${V[t.verdict]}</li>`).join('')+'</ul>';}}
  const key=res.map((r,i)=>r&&r.cls?{i,r}:null).filter(Boolean).sort((a,b)=>b.r.loss-a.r.loss).slice(0,10).sort((a,b)=>a.i-b.i);
  if(key.length){const L={blunder:'Patzer',mistake:'Fehler',inacc:'Ungenauigkeit'};h+='<h4>Schlüsselmomente</h4><ul class="kList">';
    for(const k of key){const e=rec[k.i];h+=`<li>${k.i+1}. <b style="color:${C.PCOL[e.p]}">${esc(nm(e.p))}</b> ${esc(C.moveText(e))} – <span class="c-${k.r.cls}">${L[k.r.cls]}</span> `+
      (k.r.loss>=50?'(lässt ein Matt zu oder verpasst eines)':`(−${k.r.loss.toLocaleString('de-DE',{maximumFractionDigits:1})})`)+(k.r.best?` · besser: ${esc(C.moveText({p:e.p,f:k.r.best.f,t:k.r.best.t,pc:k.r.best.pc}))}`:'')+'</li>';}
    h+='</ul>';}else h+='<p class="kNote">Keine groben Fehler gefunden.</p>';
  h+='<p class="kNote">Bewertet wird mit der Stellungsbewertung des Computers (eine Ebene tief; bei mehreren Gegnern gibt es keinen objektiv besten Zug). Die Angaben sind Hinweise, keine Urteile. Fair Play: Menschen stimmen bei nicht eindeutigen Zügen meist deutlich unter 50 % mit dem Computer überein.</p>';
  document.getElementById('kAnaBody').innerHTML=h;}
function facts(){const body=document.getElementById('kAnaBody').cloneNode(true);const w=body.querySelector('#kAIWrap');if(w)w.remove();for(const s of body.querySelectorAll('svg'))s.remove();
  const tmp=document.createElement('div');tmp.style.cssText='position:fixed;left:-9999px;top:0;width:800px';tmp.appendChild(body);document.body.appendChild(tmp);const t=body.innerText;tmp.remove();
  let f=`Spiel: ${C.title} (${C.descr})\nSpieler: ${ANA.order.map(p=>`${C.PNAME[p]}: ${nm(p)}${isAI(p)?' (Computer)':''}`).join(', ')}\nErgebnis: ${ANA.over?(ANA.winner?C.PNAME[ANA.winner]+' gewinnt':'Remis'):'Partie läuft noch'}\nZüge: ${ANA.rec.length}\n\n`+t.replace(/\n{3,}/g,'\n\n');
  if(TB.chat.length)f+='\n\nGesprächsmitschrift:\n'+TB.chat.slice(-80).map(x=>`[nach Zug ${x.n}] ${x.name}: ${x.text}`).join('\n');
  return f.slice(0,9000);}
function mdLite(t){return esc(t).replace(/^#{1,4}\s*(.+)$/gm,'<h4>$1</h4>').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>');}
K.anaAI=async function(){const out=document.getElementById('kAIOut'),btn=document.getElementById('kAIBtn');btn.disabled=true;
  out.innerHTML='<p class="kNote">⏳ Der Bericht wird geschrieben … (bis zu 30 Sekunden)</p>';
  try{const base=await C.srvBase(),ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),60000);
    const r=await fetch(base+'/ai/bericht',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lang:K.myLang(),game:C.game,facts:facts()}),signal:ctl.signal});clearTimeout(to);
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.text)throw new Error(r.status===429?'Das kostenlose Tageskontingent für KI-Berichte ist aufgebraucht – morgen geht es wieder.':(j.error||('HTTP '+r.status)));
    out.innerHTML=`<div class="kAI"><p>${mdLite(j.text)}</p></div><p class="kNote">Von einer KI geschrieben – kann sich irren.</p>`;btn.style.display='none';}
  catch(e){out.innerHTML=`<p style="color:#ff8a70">${esc('Der KI-Bericht konnte nicht erstellt werden: '+(e.name==='AbortError'?'Zeitüberschreitung':e.message||e))}</p>`;btn.disabled=false;}};

// ================= Einführung =================
let TOUR=null;
K.tour=function(steps){TOUR={steps,i:0};document.getElementById('kTour').style.display='block';tourShow();};
function tourShow(){const s=TOUR.steps[TOUR.i];for(const e of document.querySelectorAll('.kHi'))e.classList.remove('kHi');
  document.getElementById('kTourT').textContent=s.t;document.getElementById('kTourX').innerHTML=s.x;
  document.getElementById('kTourN').textContent=`${TOUR.i+1} / ${TOUR.steps.length}`;
  document.getElementById('kTourNext').textContent=TOUR.i===TOUR.steps.length-1?'Fertig ✓':'Weiter ▶';
  if(s.el){const e=document.querySelector(s.el);if(e){const dd=e.closest('details');if(dd)dd.open=true;e.classList.add('kHi');try{e.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(_){}}}
  if(s.run)try{s.run();}catch(e){}}
K.tourGo=function(d){if(!TOUR)return;const n=TOUR.i+d;if(n>=TOUR.steps.length){K.tourEnd();return;}TOUR.i=Math.max(0,n);tourShow();};
K.tourEnd=function(){for(const e of document.querySelectorAll('.kHi'))e.classList.remove('kHi');document.getElementById('kTour').style.display='none';
  const s=TOUR&&TOUR.steps;TOUR=null;ls.set(C.game+'.tourDone','1');C.tourEnd&&C.tourEnd();};
K.tourSeen=()=>ls.get(C.game+'.tourDone','')==='1';
})();

// ================= Hilfspflicht (Option ab 3 Spielern) =================
// Steht ein Spieler im Schach, muss jeder, der vor ihm zieht, ihm helfen: Ist er matt, muss der Zug ihn befreien;
// ist er nicht matt, darf der Zug ihn nicht mattsetzen. A = {alive, inCheck(q), hasMoves(q), moves:[{m,k}], tryM(m,fn)}
KIT.helpDuty=function(p,A){
  const vic=A.alive.filter(q=>q!==p&&A.inCheck(q));if(!vic.length)return null;
  const mated=vic.filter(q=>!A.hasMoves(q)),fail=new Set(mated),ok=[];
  for(const x of A.moves){let good=true;
    A.tryM(x.m,()=>{for(const q of vic){const hm=A.hasMoves(q);if(mated.includes(q)){if(hm)fail.delete(q);else good=false;}else if(!hm)good=false;}});
    if(good)ok.push(x.k);}
  return{vic,mated,fail:[...fail],allowed:ok.length?new Set(ok):null};};

(function(){
const K=window.KIT;
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}},del(k){try{localStorage.removeItem(k);}catch(e){}}};
const esc=K.esc;
let C=null;const _init=K.init;
K.init=function(cfg){_init(cfg);C=cfg;
  const div=document.createElement('div');div.innerHTML=`
<div id="kRp" style="display:none;position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:25;background:rgba(28,30,38,.97);border:2px solid #8fb6ff;border-radius:14px;padding:8px 12px;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:96vw">
 <b>⏮ Nachspielen</b><button onclick="KIT.rpGo(0)">⏮</button><button onclick="KIT.rpGo(KIT.rpI()-1)">◀</button><span id="kRpN" style="min-width:7em;text-align:center"></span><button onclick="KIT.rpGo(KIT.rpI()+1)">▶</button><button onclick="KIT.rpGo(1e9)">⏭</button>
 <button onclick="KIT.varStart()">🔬 Analysebrett ab hier</button><button onclick="KIT.replayEnd()">✕ Zurück zum Spiel</button><div id="kRpTxt" class="kNote" style="flex-basis:100%;text-align:center"></div></div>
<div id="kVar" style="display:none;position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:25;background:rgba(28,30,38,.97);border:2px solid #f2c418;border-radius:14px;padding:8px 12px;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:96vw">
 <b>🔬 Analysebrett</b><span class="kNote" id="kVarFrom"></span><button onclick="KIT.suggest()">💡 Vorschläge</button><button onclick="KIT.varAI()">🤖 Computerzug</button><button onclick="KIT.varUndo()">↶</button><button onclick="KIT.varEnd()">✕ Variante verwerfen</button>
 <div id="kVarTxt" class="kNote" style="flex-basis:100%;text-align:center">Alle Farben ziehen von Hand – probiere Züge aus. Das echte Spiel bleibt unverändert.</div></div>
<div id="kMy" class="kModal" onclick="if(event.target===this)this.classList.remove('show')"><div class="kBox"><button class="kX" onclick="document.getElementById('kMy').classList.remove('show')">✕</button><h3>📋 Meine Partien</h3><div id="kMyBody"></div></div></div>
<input type="file" id="kFile" accept=".json,application/json" style="display:none">`;
  document.body.appendChild(div);
  document.getElementById('kFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(d.game!==C.game)throw new Error('Die Datei gehört zu einem anderen Spiel.');C.load(d.data);}catch(err){alert('Laden nicht möglich: '+(err.message||err));}};r.readAsText(f);e.target.value='';};
  addEventListener('keydown',e=>{if(!RP||/input|select|textarea/i.test((e.target.tagName||'')))return;if(e.key==='ArrowLeft')K.rpGo(RP.i-1);else if(e.key==='ArrowRight')K.rpGo(RP.i+1);else if(e.key==='Escape')K.replayEnd();});
  if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',()=>{C.poll&&C.poll();});
};
const GM=()=>C.gm(),ON=()=>C.on();
K.busy=()=>!!(C&&(C.busyAna||RP));

// ================= Geräusche (Klangsynthese) =================
K.sndOn=ls.get('kit.snd','1')==='1';
let AC=null;
function tone(f,d,type,vol,at,f2){const t=AC.currentTime+(at||0),o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||0.15,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+0.02);}
K.snd=function(kind){if(!K.sndOn)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
  if(kind==='move'){tone(520,0.07,'triangle',0.12);tone(390,0.09,'triangle',0.1,0.05);}
  else if(kind==='cap'){tone(220,0.16,'sawtooth',0.12,0,110);tone(660,0.06,'square',0.06,0.02);}
  else if(kind==='check'){tone(880,0.12,'square',0.08);tone(880,0.12,'square',0.08,0.16);}
  else if(kind==='over'){[523,659,784,1047].forEach((f,i)=>tone(f,0.25,'triangle',0.13,i*0.13));}
  else if(kind==='low')tone(1200,0.04,'square',0.05);
  else if(kind==='to'){tone(300,0.3,'sawtooth',0.12,0,150);}}catch(e){}};
K.sndToggle=function(){K.sndOn=!K.sndOn;ls.set('kit.snd',K.sndOn?'1':'0');const b=document.getElementById('kSndBtn');if(b)b.textContent=(K.sndOn?'🔊':'🔇')+' Ton';if(K.sndOn)K.snd('move');};
// nach einem Zug (eigen oder empfangen): passendes Geräusch
K.fx=function(e){const g=GM();if(!e)return;K.afterMoveHooks&&K.afterMoveHooks(e);if(g&&g.over){K.snd('over');return;}K.snd(e.to?'to':e.chk&&e.chk.length?'check':e.cap?'cap':'move');};
// ================= Zeichen für Farbenblinde =================
K.SYM={B:'■',G:'▲',R:'●',Y:'◆',L:'★',T:'✚',O:'⬟',I:'♥'};
K.symOn=ls.get('kit.sym','')==='1';
K.symSet=function(on){K.symOn=on;ls.set('kit.sym',on?'1':'0');C.onColors&&C.onColors();};
// ================= Pause (Partien an einem Gerät) =================
K.pauseToggle=function(){const g=GM();if(!g||g.over)return;if(g.online){alert('In Online-Partien läuft die Uhr für alle weiter – eine Pause gibt es nur bei Partien an einem Gerät.');return;}
  if(!g.paused){g.paused=true;g.pauseAt=Date.now();}else{g.paused=false;if(g.turnAt)g.turnAt+=Date.now()-(g.pauseAt||Date.now());}
  const b=document.getElementById('kPauseBtn');if(b)b.textContent=g.paused?'▶ Weiter':'⏸ Pause';C.resume&&C.resume();};
// ================= Emoji-Reaktionen =================
K.emo=function(e){const o=ON(),me=o.seat||(GM()&&GM().order.find(q=>!K.isAI(q)))||'B';K.TB.emo[me]={e,t:Date.now()};
  K.TB.chat.push({q:me,name:K.myName(),text:e,n:(GM()&&GM().rec||[]).length});for(const q in K.TB.conns){const c=K.TB.conns[q];try{if(c.open)c.send({t:'emo',e});}catch(_){}}
  K.chatRefresh&&K.chatRefresh();};
// ================= Verbindung erneuern / testen =================
K.tbRenew=function(){K.tbStop();setTimeout(K.tbStart,300);};
K.tbTest=async function(){const out=document.getElementById('kTbTest'),L=[];const say=()=>out.innerHTML=L.join('<br>');L.push('🔧 Teste …');say();L.length=0;
  const t=async(url,ms)=>{const ctl=new AbortController(),tt=setTimeout(()=>ctl.abort(),ms||5000);try{const r=await fetch(url,{signal:ctl.signal,cache:'no-store'});clearTimeout(tt);return r.ok;}catch(e){return false;}};
  let base='';try{base=await C.srvBase();}catch(e){}
  L.push((base&&await t(base+'/'))?'✅ Spielserver erreichbar':'❌ Spielserver nicht erreichbar – Züge kommen erst an, wenn er wieder da ist');say();
  L.push((base&&await t(base+'/turn'))?'✅ Vermittlung für Bild & Ton erreichbar':'⚠️ Vermittlung für Bild & Ton nicht erreichbar – Bild und Ton gehen evtl. nur im selben Netz');say();
  L.push(window.RTCPeerConnection?'✅ Browser kann Direktverbindungen':'❌ Dieser Browser kann keine Direktverbindungen (WebRTC)');
  L.push(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia?'✅ Kamera und Mikrofon möglich':'⚠️ Kamera/Mikrofon in diesem Browser nicht verfügbar');
  const on=Object.keys(K.TB.conns).filter(q=>K.TB.conns[q].open);L.push(K.TB.peer&&K.TB.peer.open?'✅ Am Tisch angemeldet'+(on.length?' · verbunden mit '+on.map(q=>C.PNAME[q]).join(', '):''):'⚠️ Noch nicht am Tisch angemeldet – „Verbindung erneuern“ hilft oft');say();};
// ================= Benachrichtigungen (Web-Push) =================
K.pushOn=async function(test){const o=ON(),st=document.getElementById('kTbTest'),say=t=>{if(st)st.textContent=t;};
  if(!o.code||!o.seat)return;
  if(!('serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window)){say(/iPhone|iPad/.test(navigator.userAgent)?'iPhone/iPad: Benachrichtigungen gibt es nur, wenn das Spiel als App auf dem Home-Bildschirm liegt (Safari → Teilen → „Zum Home-Bildschirm“).':'Dieser Browser kann leider keine Benachrichtigungen empfangen.');return;}
  try{const reg=await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;
    const perm=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(perm!=='granted'){say('Benachrichtigungen sind blockiert. Erlaube sie in den Website-Einstellungen und tippe noch einmal.');return;}
    const base=await C.srvBase(),k=await (await fetch(base+'/fern/key',{cache:'no-store'})).json();if(!k.key)throw new Error(k.error||'kein Schlüssel');
    let sub=await reg.pushManager.getSubscription();const old=ls.get('dreiSchach.pushKey','');
    if(sub&&old&&old!==k.key){try{await sub.unsubscribe();}catch(e){}sub=null;}
    if(!sub){const raw=Uint8Array.from(atob(k.key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-k.key.length%4)%4)),c=>c.charCodeAt(0));sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:raw});}
    ls.set('dreiSchach.pushKey',k.key);
    const url=location.origin+location.pathname+'?g='+o.code;
    const r=await fetch(base+'/fern/g/'+o.code+'/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({t:o.token,sub:sub.toJSON(),url,
      msgs:{title:C.title,turn:'♟ Du bist dran! {0}',over:'🏁 Die Partie ist zu Ende. {0}',join:'👋 {0} spielt jetzt mit.'},test:test?'🔔 So sieht deine Benachrichtigung aus, wenn du dran bist.':false})});
    const j=await r.json();if(!j.ok)throw new Error(j.error||'Fehler');say('✓ Du bekommst eine Nachricht, wenn du dran bist.');}
  catch(e){say('Benachrichtigungen konnten nicht eingeschaltet werden: '+(e.message||e));}};
// ================= Speichern, Laden, automatisch sichern =================
K.save=function(){const g=GM();if(!g){alert('Es läuft keine Partie.');return;}
  const blob=new Blob([JSON.stringify({game:C.game,v:1,saved:new Date().toISOString(),data:C.snap()})],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${C.game}-${new Date().toISOString().slice(0,16).replace(/[T:]/g,'-')}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);};
K.loadFile=()=>document.getElementById('kFile').click();
K.autosave=function(){const g=GM();if(!g||g.online||VAR)return;if(g.over){ls.del(C.game+'.auto');return;}try{ls.set(C.game+'.auto',JSON.stringify(C.snap()));}catch(e){}};
K.autoData=function(){try{return JSON.parse(ls.get(C.game+'.auto','null'));}catch(e){return null;}};
K.autoClear=()=>ls.del(C.game+'.auto');
K.exportMoves=function(){const g=GM();if(!g||!g.rec.length){alert('Noch keine Züge.');return;}
  const txt=`${C.title} – ${new Date().toLocaleString('de-DE')}\nSpieler: ${g.order.map(p=>C.PNAME[p]+' ('+C.seatName(p)+')').join(', ')}\n${g.over?'Ergebnis: '+(g.winner?C.PNAME[g.winner]+' gewinnt':'Remis')+'\n':''}\n`+C.moveList().map((m,i)=>`${i+1}. ${m}`).join('\n');
  try{navigator.clipboard&&navigator.clipboard.writeText(txt);}catch(e){}
  const blob=new Blob([txt],{type:'text/plain'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=C.game+'-zugliste.txt';document.body.appendChild(a);a.click();a.remove();};
// ================= Meine Partien (online) =================
K.myGames=async function(){const box=document.getElementById('kMyBody');document.getElementById('kMy').classList.add('show');box.innerHTML='<p class="kNote">Lade …</p>';
  const pre=C.game+'.t.',codes=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(pre))codes.push(k.slice(pre.length));}}catch(e){}
  const auto=K.autoData();let h='';
  if(auto)h+=`<div class="kCard" style="margin-bottom:8px">💻 Partie an diesem Gerät (automatisch gesichert) <button onclick="document.getElementById('kMy').classList.remove('show');KIT.resume()">▶ Fortsetzen</button></div>`;
  if(!codes.length){box.innerHTML=h+'<p class="kNote">Noch keine Online-Partien auf diesem Gerät. Online-Partien erscheinen hier, sobald du eine eröffnest oder einer beitrittst.</p>'+'<p><button onclick="KIT.loadFile()">📂 Partie aus Datei laden</button></p>';return;}
  let base;try{base=await C.srvBase();}catch(e){box.innerHTML=h+'<p>⚠️ Server nicht erreichbar.</p>';return;}
  const rows=await Promise.all(codes.map(async code=>{const t=ls.get(pre+code,'');try{const st=await (await fetch(`${base}/fern/g/${code}/state?t=${t}`,{cache:'no-store'})).json();return{code,st};}catch(e){return{code,st:null};}}));
  rows.sort((a,b)=>((b.st&&b.st.next===b.st.seat)?1:0)-((a.st&&a.st.next===a.st.seat)?1:0)||((a.st&&a.st.age)||9e15)-((b.st&&b.st.age)||9e15));
  h+=rows.map(({code,st})=>{if(!st||!st.order)return `<div class="kCard" style="margin:6px 0;border-color:#555">${esc(code)} – nicht mehr vorhanden <button onclick="KIT.myForget('${esc(code)}')">entfernen</button></div>`;
    const me=st.seat,turn=!st.over&&st.next===me,names=st.order.map(p=>`<span style="color:${C.PCOL[p]}">${esc(st.seats[p].kind==='human'?st.seats[p].name:st.seats[p].kind==='ai'?'🤖':'frei')}</span>`).join(' · ');
    const stat=st.over?'🏁 beendet':turn?'<b style="color:#3cc463">♟ Du bist dran!</b>':st.next?'wartet auf '+esc(C.PNAME[st.next]):'';
    return `<div class="kCard" style="margin:6px 0;border-color:${me?C.PCOL[me]:'#555'}">${names}<br><span class="kNote">${st.order.length} Spieler · ${Math.round((st.age||0)/3600000)} Std. seit dem letzten Zug</span> · ${stat}
      <div style="margin-top:4px"><button onclick="location.href=location.pathname+'?g=${esc(code)}'+(new URLSearchParams(location.search).get('fernhost')?'&fernhost='+encodeURIComponent(new URLSearchParams(location.search).get('fernhost')):'')">▶ Öffnen</button> <button onclick="KIT.myForget('${esc(code)}')">entfernen</button></div></div>`;}).join('');
  box.innerHTML=h+'<p><button onclick="KIT.loadFile()">📂 Partie aus Datei laden</button></p>';};
K.myForget=function(code){if(!confirm('Diese Partie aus deiner Liste entfernen? (Sie läuft für die anderen weiter.)'))return;ls.del(C.game+'.t.'+code);K.myGames();};
K.resume=function(){const d=K.autoData();if(d)C.load(d);};
// ================= Nachspielen =================
let RP=null;
K.rpI=()=>RP?RP.i:0;
K.replayStart=function(){const g=GM();if(!g||!g.rec||!g.rec.length){alert('Noch keine Züge zum Nachspielen.');return;}if(VAR){alert('Erst das Analysebrett verlassen.');return;}
  RP={i:g.rec.length,n:g.rec.length,wasPaused:g.paused};if(!g.online&&!g.over&&!g.paused){g.paused=true;g.pauseAt=Date.now();}
  C.busyAna=true;document.getElementById('kRp').style.display='flex';K.rpGo(RP.n);};
K.rpGo=function(i){if(!RP)return;const g=GM();RP.n=g.rec.length;RP.i=Math.max(0,Math.min(RP.n,Math.round(i)));
  C.anaPos(RP.i);C.replayShow(RP.i);
  document.getElementById('kRpN').textContent=`Zug ${RP.i} / ${RP.n}`;
  const e=g.rec[RP.i-1];document.getElementById('kRpTxt').innerHTML=e?`<span style="color:${C.PCOL[e.p]}">${esc(C.PNAME[e.p])}</span>: ${esc(C.moveText(e))}`:'Ausgangsstellung';};
K.replayEnd=function(){if(!RP)return;const g=GM();C.anaRestore();C.busyAna=false;document.getElementById('kRp').style.display='none';
  if(g&&!g.online&&!RP.wasPaused&&g.paused){g.paused=false;g.turnAt+=Date.now()-(g.pauseAt||Date.now());}
  RP=null;C.replayShow(null);C.resume&&C.resume();C.poll&&C.poll();};
// ================= Analysebrett (Variante) =================
let VAR=null;
K.varOn=()=>!!VAR;
K.varStart=function(){const g=GM();if(!g){alert('Es läuft keine Partie.');return;}
  if(g.online&&!g.over&&ON().seat){alert('Das Analysebrett ist in laufenden Online-Partien erst nach dem Spiel möglich – sonst könnte man sich Hilfe holen.');return;}
  let i=g.rec.length;if(RP){i=RP.i;K.replayEnd();}
  VAR={i};C.varEnter(i);document.getElementById('kVar').style.display='flex';document.getElementById('kVarFrom').textContent=`ab Zug ${i}`;
  document.getElementById('kVarTxt').textContent='Alle Farben ziehen von Hand – probiere Züge aus. Das echte Spiel bleibt unverändert.';};
K.varEnd=function(){if(!VAR)return;VAR=null;document.getElementById('kVar').style.display='none';C.varExit();};
K.varUndo=()=>C.varUndo&&C.varUndo();
K.varAI=()=>C.varAI&&C.varAI();
K.suggest=function(){const g=GM();if(!g||g.over)return;const p=g.order[g.idx];const sc=C.anaScores(p).sort((a,b)=>b.v-a.v).slice(0,3);
  document.getElementById('kVarTxt').innerHTML=sc.length?'💡 '+sc.map((s,i)=>`<a style="color:#8fb6ff;cursor:pointer" onclick="KIT.showMove(${i})">${i+1}. ${esc(C.moveText({p,f:s.f,t:s.t,pc:s.pc}))}</a>`).join(' · '):'Keine Züge möglich.';K._sug=sc;};
K.showMove=function(i){const s=K._sug&&K._sug[i];if(s)C.showMove(s.f,s.t);};
})();

// ================= Monster: Gefühle, Diplomatie, Gespräch, Lernen =================
(function(){
const K=window.KIT,esc=K.esc;
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
let C=null;const _init=K.init;K.init=function(cfg){_init(cfg);C=cfg;};
const GM=()=>C.gm(),ON=()=>C.on(),PN=p=>C.PNAME[p];
const M=window.MONDATA.M;
K.MONS=M;
// Welches Monster spielt auf welchem Platz? Standard: das Monster der eigenen Farbe. Jede Farbe kann jedes Monster spielen.
K.MONIDS=['B','G','R','Y','L','T','O','I'];
const SEATMON={};
K.setMons=function(map){for(const k in SEATMON)delete SEATMON[k];for(const k in(map||{}))if(M[map[k]])SEATMON[k]=map[k];};
K.getMons=()=>Object.assign({},SEATMON);
K.monId=p=>{const g=C&&C.gm&&C.gm();if(g&&g.mons&&M[g.mons[p]])return g.mons[p];return SEATMON[p]||(M[p]?p:'B');};
// Auswahl im Startfenster: hinter jede Stärke-Auswahl (id gS+Farbe) ein Monster-Feld (id gM+Farbe); gemerkt pro Gerät
const MONKEY='kit.mons';
K.monSaved=()=>{try{return JSON.parse(localStorage.getItem(MONKEY)||'{}')||{};}catch(e){return{};}};
K.monPicks=order=>{const m={};for(const p of order){const s=document.getElementById('gM'+p);if(s&&s.style.display!=='none'&&M[s.value])m[p]=s.value;}return m;};
K.monAttach=function(order){const saved=K.monSaved(),map={},used=new Set();
  for(const p of order){let m=M[saved[p]]?saved[p]:p;if(used.has(m))m=K.MONIDS.find(x=>!used.has(x))||m;map[p]=m;used.add(m);}
  const isAI=v=>v&&v!=='human'&&v!=='open';
  let hint=document.getElementById('monHint');
  const upd=()=>{const lines=[];for(const p of order){const lv=document.getElementById('gS'+p);if(!lv)continue;let s=document.getElementById('gM'+p);
      if(!s){s=document.createElement('select');s.id='gM'+p;s.className='monsel';s.title=K.tr('Welcher Computergegner spielt diesen Platz?');lv.after(s);
        s.onchange=()=>{window.MONDATA.assign(map,p,s.value,order);try{localStorage.setItem(MONKEY,JSON.stringify(Object.assign(K.monSaved(),map)));}catch(e){}upd();};
        lv.addEventListener('change',upd);}
      s.innerHTML=window.MONDATA.options(map[p]);s.style.display=isAI(lv.value)?'':'none';
      if(isAI(lv.value)){const m=M[map[p]];lines.push(`${m.icon} <b>${esc(m.name)}</b>: ${esc(K.tr(m.sty.desc))}`);}}
    const box=document.getElementById('gSeatRows');if(!hint&&box){hint=document.createElement('div');hint.id='monHint';hint.className='hint';box.after(hint);}
    if(lines.length)lines.push(`<a href="computergegner.html" target="_blank" style="color:#8fb6ff">${esc(K.tr('Mehr über die Computergegner'))} ›</a>`);
    if(hint)hint.innerHTML=lines.join('<br>');};
  upd();};
const mo=p=>M[K.monId(p)];
K.mon=mo;
// Spielstil des Monsters auf Platz p als Faktoren für die Zugbewertung (1 = neutral)
K.monStyle=p=>window.MONDATA.factors(K.monId(p),C&&C.material,alive());
const HUMAN={happy:['Schön!','Erwischt!'],angry:['Ärgerlich!','Mist!'],excited:['Schach!'],cheer:['Gewonnen!'],cry:['Verloren…'],fear:['Oh je!']};
K.monName=p=>mo(p)?mo(p).name:p;
// ---------- Gefühle ----------
const AV={};
K.feelSet=function(p,emo,dur,force){const a=AV[p]||(AV[p]={emo:'neutral',since:0,until:0,line:''}),now=performance.now();
  if(!force&&(a.emo==='cheer'||a.emo==='cry'))return;const L=(K.isAI(p)&&mo(p)?mo(p).lines:HUMAN)[emo]||[''];
  a.emo=emo;a.since=now;a.until=dur===0?Infinity:now+(dur||3600);a.line=emo==='neutral'?'':K.tr(L[Math.floor(Math.random()*L.length)]||'');};
K.feelOf=function(p){const a=AV[p];if(!a)return{emo:'neutral',line:'',age:0};if(performance.now()>a.until&&a.emo!=='neutral'){a.emo='neutral';a.line='';}return{emo:a.emo,line:a.line,age:(performance.now()-a.since)/1000};};
K.feelReset=()=>{for(const p in AV)delete AV[p];};
function feel(e){const g=GM();if(!g)return;
  if(g.over){for(const q of g.order)K.feelSet(q,!g.winner?'happy':q===g.winner?'cheer':'cry',0,true);return;}
  if(e.to){K.feelSet(e.p,'fear');return;}
  if(e.chk&&e.chk.length){K.feelSet(e.p,'excited');for(const q of e.chk)K.feelSet(q,'fear');}
  else if(e.cap)K.feelSet(e.p,'happy');
  if(e.capP&&(C.VAL[e.cap]||0)>=3)K.feelSet(e.capP,'angry');
  for(const q of e.elim||[])K.feelSet(q,'cry',0,true);
  // ein Monstergeräusch: wer Schach gibt oder schlägt – sonst wer eine wichtige Figur verliert
  if(K.voiceOn&&window.MV){const who=e.chk&&e.chk.length?[e.p,'excited']:e.cap?[e.p,'happy']:null,hurt=e.capP&&(C.VAL[e.cap]||0)>=3?[e.capP,'angry']:null;
    const s=[who,hurt].find(x=>x&&K.isAI(x[0])&&mo(x[0]));if(s)MV.sound(K.monId(s[0]),s[1]);}}
// Monitorbild: Monster bzw. Mensch zeichnen (statt Anfangsbuchstabe), wenn kein Kamerabild läuft
K.monAvatar=function(x,p,t){if(!window.MON)return false;const f=K.feelOf(p),ai=K.isAI(p),m=mo(p)||{};
  const blink=(f.emo==='neutral'||f.emo==='fear')&&((t/1000*(m.speed||1))%3.3<0.12);
  MON.paint(x,ai?m.kind||'blob':'human',C.PCOL[p],f.emo,t,blink,f.line,f.age,ai?m:{});return true;};
// ---------- Diplomatie: Bündnisse, Verrat, Bluffs, Rache ----------
K.dipOn=ls.get('kit.diplo','1')==='1';K.voiceOn=ls.get('kit.aivoice','1')==='1';
K.dipSet=on=>{K.dipOn=!!on;ls.set('kit.diplo',on?'1':'0');};
K.voiceSet=on=>{K.voiceOn=!!on;ls.set('kit.aivoice',on?'1':'0');if(!on&&window.speechSynthesis)try{speechSynthesis.cancel();}catch(e){}};
const DL=window.MONDATA.DL;
const fill=(t,a)=>String(t||'').replace(/\{(\d)\}/g,(_,i)=>a[i]||'');
function nameOf(p){if(K.isAI(p)&&mo(p))return mo(p).name;const s=String(C.seatName(p)||'');return !s||s==='Ich'||s==='Mensch'?PN(p):s;}
function dip(){const g=GM();if(!g)return null;return g.dip||(g.dip={pacts:[],offers:[],grudge:{},betray:{},lastTalk:-9,log:[]});}
function n(){const g=GM();return g&&g.rec?g.rec.length:0;}
const alive=()=>{const g=GM();return g.order.filter(q=>!g.out.includes(q));};
K.dipBoss=function(){const g=GM();if(!g||g.over||!K.dipOn||K.busy()||K.varOn())return false;if(!g.order.some(q=>K.isAI(q)))return false;
  return !g.online||(ON().seat&&g.lastBy===ON().seat);};
function say(p,k,args,extra){const tpl=(DL[k]||{})[K.monId(p)];if(!tpl)return;const d=dip();d.lastTalk=n();
  const text=fill(K.tr(tpl),(args||[]).map(q=>K.tr(nameOf(q))));K.monMsg(p,text,Object.assign({lang:K.myLang()},extra||{}));}
K.monMsg=function(p,text,extra){const m=Object.assign({t:'chat',text,lang:'de',name:mo(p).name,mon:p,id:Date.now()},extra||{});
  for(const q in K.TB.conns){const c=K.TB.conns[q];try{if(c.open)c.send(m);}catch(e){}}K.chatIn2(p,m);};
K.speakMon=function(p,text){if(!K.voiceOn||!window.speechSynthesis||!text)return;
  if(window.MV){MV.speak(K.monId(p),text,K.myLang(),{onstart:()=>{K.TB.speaking=true;},onend:()=>{setTimeout(()=>{K.TB.speaking=false;},400);}});return;}
  try{const u=new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu,''));const lang=K.myLang();u.lang=lang;const v=(mo(p)&&mo(p).per.voice)||{pitch:1,rate:1};u.pitch=v.pitch;u.rate=v.rate;speechSynthesis.speak(u);}catch(e){}};
function pactOf(p){return dip().pacts.find(x=>x.a===p||x.b===p)||null;}
function allyOf(p){const x=pactOf(p);return x?(x.a===p?x.b:x.a):null;}
function leader(){const g=GM(),r=alive().map(q=>({q,s:C.material(q)})).sort((a,b)=>b.s-a.s);return r.length>=2&&r[0].s-r[1].s>=3?r[0].q:null;}
function makePact(a,b,t){const d=dip();d.pacts=d.pacts.filter(x=>![x.a,x.b].some(y=>y===a||y===b));d.pacts.push({a,b,target:t,since:n(),until:n()+3*alive().length+Math.floor(Math.random()*4)});d.log.push({n:n(),k:'pact',a,b,t});}
// Zuschlag in der Zugbewertung (Zehntel-Bauern wie aiEval): Bündnis, Verrat, Groll
K.dipBias=function(p,owner,val,chkd){if(!K.dipBoss())return 0;const d=dip(),pact=pactOf(p),ally=allyOf(p);let b=0;
  if(owner&&owner!==p){if(pact&&pact.target===owner)b+=5*val+3;if(ally===owner)b+=d.betray[p]?3*val:-(12*val+10);
    b+=Math.min(4,(d.grudge[p]||{})[owner]||0)*1.2*val*(mo(p)?mo(p).per.grudge:1);}
  for(const q of chkd||[]){if(pact&&q===pact.target)b+=4;if(ally===q&&!d.betray[p])b-=6;}
  return b;};
// vor einem Computerzug: Bündnisse anbieten, bluffen, auflösen
K.dipTurn=function(p){if(!K.dipBoss()||!mo(p))return;const d=dip(),k=n(),P=mo(p).per;d.betray[p]=false;
  for(const x of d.pacts.slice())if(k>=x.until){d.pacts=d.pacts.filter(y=>y!==x);d.log.push({n:k,k:'expire',a:x.a,b:x.b});const sp=K.isAI(x.a)?x.a:x.b;if(K.isAI(sp))say(sp,'pactEnd',[sp===x.a?x.b:x.a]);}
  d.offers=d.offers.filter(o=>k-o.at<=2*alive().length);
  if(pactOf(p)){if(Math.random()<P.betray)d.betray[p]=true;return;}
  if(k-d.lastTalk<alive().length||k<alive().length)return;
  const L=leader();
  if(L&&L!==p&&Math.random()<P.propose){const cands=alive().filter(q=>q!==p&&q!==L&&!pactOf(q));if(!cands.length)return;const partner=cands[Math.floor(Math.random()*cands.length)];
    if(K.isAI(partner)){say(p,'propose',[partner,L]);
      setTimeout(()=>{if(!K.dipBoss())return;const yes=Math.random()<mo(partner).per.accept&&((d.grudge[partner]||{})[p]||0)<3;
        if(yes){makePact(p,partner,L);say(partner,'accept',[p,L]);}else{d.log.push({n:n(),k:'decline',a:partner,b:p});say(partner,'decline',[p]);}},1600);}
    else{const id='o'+k+p;d.offers.push({id,from:p,to:partner,target:L,at:k});say(p,'propose',[partner,L],{offer:{id,to:partner}});}
    return;}
  if(Math.random()<P.bluff){const o=alive().filter(q=>q!==p);const q=o[Math.floor(Math.random()*o.length)];if(q)say(p,'bluff',[q]);}};
// nach jedem Zug: Verrat erkennen, Groll merken
function dipAfter(e){if(!K.dipBoss()||!e||e.to||!e.capP)return;const d=dip(),victim=e.capP,mover=e.p,val=C.VAL[e.cap]||0;
  d.grudge[victim]=d.grudge[victim]||{};d.grudge[victim][mover]=(d.grudge[victim][mover]||0)+val/3;
  const x=pactOf(mover);
  if(x&&allyOf(mover)===victim){d.pacts=d.pacts.filter(y=>y!==x);d.log.push({n:n(),k:'betray',a:mover,b:victim});
    if(K.isAI(mover)&&d.betray[mover])say(mover,'betray',[victim]);
    if(K.isAI(victim)){d.grudge[victim][mover]+=3;setTimeout(()=>say(victim,'betrayed',[mover]),K.isAI(mover)?1500:300);}return;}
  if(K.isAI(victim)&&val>=3&&n()-d.lastTalk>=2&&Math.random()<0.3*mo(victim).per.grudge)setTimeout(()=>say(victim,'revenge',[mover]),500);}
// Menschen reden mit: Antwort auf ein Angebot oder eigener Vorschlag („Grumbo, greif Rot an“); sonst antwortet die KI im Charakter
const YES=/\b(ja|jo|jep|ok|okay|einverstanden|deal|abgemacht|gerne|gern|klar|machen wir|yes|sure)\b/i,NO=/\b(nein|nö|ne|niemals|vergiss es|no|nope|never)\b/i,
  ATT=/(angreif|greif|gegen|stopp|vorknöpf|nehmen uns|fertig ?mach|jag|schlag|bündnis|zusammen|team|attack|against|ally)/i;
function seatsIn(text){const t=text.toLowerCase(),g=GM(),out=[];
  for(const p of g.order){const words=[C.PNAME[p].toLowerCase()].concat(mo(p)&&K.isAI(p)?[mo(p).name.toLowerCase()]:[],!K.isAI(p)?[String(C.seatName(p)).toLowerCase()]:[]);
    const i=Math.min(...words.filter(w=>w.length>2).map(w=>{const j=t.indexOf(w);return j<0?1e9:j;}));if(i<1e9)out.push({p,i});}
  return out.sort((a,b)=>a.i-b.i).map(x=>x.p);}
K.dipHear=function(m){if(!K.dipBoss()||!m||!m.p||K.isAI(m.p))return;const d=dip(),from=m.p,text=String(m.text||'');
  const o=(m.ans&&d.offers.find(x=>x.id===m.ans.id))||d.offers.slice().reverse().find(x=>x.to===from);
  if(o&&o.to===from){const ok=m.ans?m.ans.ok:(YES.test(text)?true:NO.test(text)?false:null);
    if(ok!==null){d.offers=d.offers.filter(x=>x!==o);setTimeout(()=>{if(ok){makePact(o.from,from,o.target);say(o.from,'accept',[from,o.target]);}else{d.log.push({n:n(),k:'decline',a:from,b:o.from});say(o.from,'humanNo',[from]);}},700);return;}}
  if(!ATT.test(text)){monChat(m);return;}
  const named=seatsIn(text).filter(q=>q!==from),ais=alive().filter(q=>K.isAI(q)&&q!==from);if(!ais.length)return;
  let partner=named.find(q=>K.isAI(q)&&named.length>1&&named.indexOf(q)===0)||null,target=named.find(q=>q!==partner)||null;
  if(!partner)partner=ais.find(q=>q!==target)||null;
  if(!partner||!target){monChat(m);return;}
  if(partner===target){setTimeout(()=>say(partner,'noAlly',[]),600);return;}
  setTimeout(()=>{if(!K.dipBoss())return;const lead=leader(),sensible=target===lead||C.material(target)>=C.material(partner);
    const yes=!pactOf(partner)&&((d.grudge[partner]||{})[from]||0)<3&&Math.random()<mo(partner).per.accept*(sensible?1:0.45);
    if(yes){makePact(partner,from,target);say(partner,'accept',[from,target]);}else{d.log.push({n:n(),k:'decline',a:partner,b:from});say(partner,'decline',[from]);}},900);};
const MCH={last:{},n:0,busy:false};
function addressed(text){const ais=alive().filter(q=>K.isAI(q)&&mo(q));if(!ais.length)return null;const t=text.toLowerCase();
  const flat=t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]/g,'');
  const byName=ais.find(q=>{const n=mo(q).name.toLowerCase();return t.includes(n)||flat.includes(n)||flat.includes(n.slice(0,4));});if(byName)return byName;
  const byCol=ais.filter(q=>new RegExp('(^|\\W)'+C.PNAME[q].toLowerCase()+'(\\W|$)').test(t));
  if(byCol.length===1&&/[?!]|\b(du|dir|dich|you)\b/i.test(t))return byCol[0];
  if(ais.length===1)return ais[0];
  // nicht namentlich angesprochen: wer zuletzt geredet hat, sonst (allein am Gerät) ein zufälliges Monster
  const last=K.TB.chat.slice().reverse().find(x=>x.mon&&ais.includes(x.q));if(last)return last.q;
  return ON().seat?null:ais[Math.floor(Math.random()*ais.length)];}
async function monChat(m){const q=addressed(String(m.text||''));if(!q||q===m.p)return;const now=Date.now();
  if(MCH.busy||now-(MCH.last[q]||0)<4000||MCH.n>=80)return;MCH.busy=true;MCH.last[q]=now;MCH.n++;
  try{const base=await C.srvBase(),L=leader(),pact=pactOf(q),ally=allyOf(q);
    const sit=`Material: ${alive().map(x=>`${nameOf(x)} (${PN(x)}): ${C.material(x)}`).join(', ')}. ${L?'Es führt: '+nameOf(L)+'.':''} ${pact?`Du bist verbündet mit ${nameOf(ally)} gegen ${nameOf(pact.target)}.`:'Du hast gerade kein Bündnis.'} Am Zug: ${nameOf(GM().order[GM().idx])}.`;
    const hist=K.TB.chat.slice(-8).map(x=>({name:x.name,text:x.tr||x.text}));
    const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),20000);
    const r=await fetch(base+'/ai/monster',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,body:JSON.stringify({lang:K.myLang(),game:C.game,monster:mo(q).name,persona:mo(q).persona,situation:sit,history:hist,from:nameOf(m.p),text:m.text})});
    clearTimeout(to);const j=await r.json().catch(()=>null);if(!r.ok||!j||!j.reply||!K.dipBoss())return;
    if(j.deal==='accept'&&j.target){const tl=j.target.toLowerCase(),t=GM().order.find(x=>x!==q&&x!==m.p&&(nameOf(x).toLowerCase().includes(tl)||tl.includes(nameOf(x).toLowerCase())||tl.includes(PN(x).toLowerCase())));
      if(t&&!pactOf(q)&&!pactOf(m.p))makePact(q,m.p,t);}else if(j.deal==='decline')dip().log.push({n:n(),k:'decline',a:q,b:m.p});
    dip().lastTalk=n();K.monMsg(q,j.reply,{lang:K.myLang()});}catch(e){}finally{MCH.busy=false;}}
// Antwort auf ein Angebot per Knopf
K.dipAnswer=function(id,ok){const g=GM(),me=g.online?ON().seat:g.order.find(q=>!K.isAI(q));const text=ok?'🤝 Einverstanden!':'✋ Nein danke.';
  const m={t:'chat',text,lang:K.myLang(),name:K.myName(),id:Date.now(),ans:{id,ok}};for(const q in K.TB.conns){const c=K.TB.conns[q];try{if(c.open)c.send(m);}catch(e){}}
  K.chatIn2(me,m);};
K.dipLog=()=>{const g=GM();return g&&g.dip?g.dip.log:[];};
K.dipText=function(x){if(x.k==='pact')return `${nameOf(x.a)} und ${nameOf(x.b)} verbünden sich gegen ${nameOf(x.t)}`;if(x.k==='betray')return `${nameOf(x.a)} verrät ${nameOf(x.b)}`;
  if(x.k==='expire')return `Bündnis ${nameOf(x.a)} + ${nameOf(x.b)} endet`;if(x.k==='decline')return `${nameOf(x.a)} lehnt das Bündnis mit ${nameOf(x.b)} ab`;return'';};
// ---------- Lernen: Wie spielen die Menschen? ----------
K.oppOn=ls.get('kit.opp','1')==='1';
K.oppSet=on=>{K.oppOn=!!on;ls.set('kit.opp',on?'1':'0');};
const OKEY='kit.opp.prof';let PROF={};try{PROF=JSON.parse(ls.get(OKEY,'{}'))||{};}catch(e){PROF={};}
K.oppForget=()=>{PROF={};ls.set(OKEY,'{}');alert('🧠 Das Gelernte über die Spielweise wurde gelöscht.');};
const okey=p=>String(C.seatName(p)||PN(p)).trim().slice(0,18);
const rate=(c,a)=>(c+1)/(a+2);
let OG={hurt:{}};
function oppLearn(e){if(!K.oppOn||!e||e.to||K.isAI(e.p))return;const g=GM();if(!g||g.order.filter(q=>!K.isAI(q)).length<1)return;
  const k=okey(e.p),P=PROF[k]||(PROF[k]={moves:0,caps:0,ldA:0,ldC:0,aiA:0,aiC:0,rvA:0,rvC:0,tgt:{}});P.moves++;
  const prev=g.rec[g.rec.length-2],mat=prev&&prev.mat;
  if(e.capP){P.caps++;const others=g.order.filter(q=>q!==e.p&&!g.out.includes(q));
    if(mat&&others.length>=2){const lead=others.reduce((a,q)=>(mat[q]||0)>(mat[a]||0)?q:a,others[0]);if(others.some(q=>q!==lead&&(mat[q]||0)<(mat[lead]||0))){P.ldA++;if(e.capP===lead)P.ldC++;}}
    if(others.some(q=>K.isAI(q))&&others.some(q=>!K.isAI(q))){P.aiA++;if(K.isAI(e.capP))P.aiC++;}
    if(OG.hurt[e.p]){P.rvA++;if(OG.hurt[e.p]===e.capP)P.rvC++;}}
  if(e.capP)OG.hurt[e.capP]=e.p;
  if(P.moves%3===0)ls.set(OKEY,JSON.stringify(PROF));}
// Wie wahrscheinlich greift Mensch q eher p an als die anderen? → Gewichtung der eigenen Drohungen (0,7 … 1,3)
K.oppThreat=function(p){if(!K.oppOn)return 1;const g=GM();if(!g)return 1;let f=1;
  for(const q of g.order){if(q===p||K.isAI(q)||g.out.includes(q))continue;const P=PROF[okey(q)];if(!P||P.caps<4)continue;
    const others=g.order.filter(x=>x!==q&&!g.out.includes(x));if(others.length<2)continue;
    let w=1;const lead=others.reduce((a,x)=>C.material(x)>C.material(a)?x:a,others[0]);
    if(lead===p)w*=rate(P.ldC,P.ldA)/0.5;if(K.isAI(p)&&P.aiA>=3)w*=rate(P.aiC,P.aiA)/0.5;if(OG.hurt[q]===p&&P.rvA>=3)w*=rate(P.rvC,P.rvA)/0.5;
    f*=Math.max(0.7,Math.min(1.3,w));}
  return Math.max(0.7,Math.min(1.3,f));};
K.oppDescribe=function(p){const P=PROF[okey(p)];if(!P||P.moves<10)return null;const pct=(c,a)=>Math.round(100*rate(c,a)),o=[`beobachtet: ${P.moves} Züge`];
  if(P.ldA>=3)o.push(`schlägt bei der Wahl in ${pct(P.ldC,P.ldA)} % der Fälle den Führenden`);if(P.aiA>=3)o.push(`schlägt bei der Wahl Computer oder Mensch zu ${pct(P.aiC,P.aiA)} % den Computer`);
  if(P.rvA>=3)o.push(`schlägt in ${pct(P.rvC,P.rvA)} % der Fälle den zurück, der ihn zuletzt geschlagen hat`);o.push(`schlägt in ${Math.round(100*P.caps/P.moves)} % seiner Züge`);return o;};
// in jeden Zug eingehängt (KIT.fx ruft das auf)
K.afterMoveHooks=function(e){try{feel(e);dipAfter(e);oppLearn(e);}catch(err){}};
K.monUI=function(){return `<div class="row"><label title="Die Computergegner schmieden Bündnisse, verraten und rächen sich"><input type="checkbox" ${K.dipOn?'checked':''} onchange="KIT.dipSet(this.checked)"> 🤝 Bündnisse</label>
 <label><input type="checkbox" ${K.voiceOn?'checked':''} onchange="KIT.voiceSet(this.checked)"> 🗣️ Computergegner sprechen</label></div>
 <div class="row"><label title="Die Computergegner merken sich, wie Menschen spielen"><input type="checkbox" ${K.oppOn?'checked':''} onchange="KIT.oppSet(this.checked)"> 🧠 Computer lernen</label><button onclick="KIT.oppForget()">Gelerntes vergessen</button><button onclick="KIT.chatToggle()">💬 Chat</button></div>`;};
})();

// ================= App installieren, Vollbild =================
(function(){const K=window.KIT;let evt=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();evt=e;document.querySelectorAll('.kInstall').forEach(b=>b.style.display='');});
K.install=async function(){if(evt){evt.prompt();try{await evt.userChoice;}catch(e){}evt=null;document.querySelectorAll('.kInstall').forEach(b=>b.style.display='none');}
  else alert(/iPhone|iPad/.test(navigator.userAgent)?'In Safari unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen.':'Im Browsermenü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.');};
K.fullscreen=function(){const d=document;try{if(d.fullscreenElement||d.webkitFullscreenElement)(d.exitFullscreen||d.webkitExitFullscreen).call(d);else{const el=d.documentElement;(el.requestFullscreen||el.webkitRequestFullscreen).call(el);try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{});}catch(e){}}}catch(e){}};
K.canInstall=()=>!!evt||(/iPhone|iPad/.test(navigator.userAgent)&&!navigator.standalone);
})();

// ================= Sprachen (12): Texte der Seite und des Baukastens übersetzen =================
// Übersetzungen stehen in lib/lang/v-xx.js (window.I18N). Feste Texte werden direkt ersetzt, zusammengesetzte Texte über Muster mit {0}, {1} …
(function(){const K=window.KIT;
K.LANGS=[['de','Deutsch','🇩🇪'],['en','English','🇬🇧'],['fr','Français','🇫🇷'],['es','Español','🇪🇸'],['it','Italiano','🇮🇹'],['pt','Português','🇵🇹'],['nl','Nederlands','🇳🇱'],['pl','Polski','🇵🇱'],['tr','Türkçe','🇹🇷'],['ru','Русский','🇷🇺'],['uk','Українська','🇺🇦'],['zh','中文','🇨🇳'],['ja','日本語','🇯🇵'],['ko','한국어','🇰🇷'],['th','ไทย','🇹🇭'],['ar','العربية','🇸🇦'],['is','Íslenska','🇮🇸'],['da','Dansk','🇩🇰']];
const LG=(()=>{let l='';try{l=localStorage.getItem('dreiSchach.lang')||'';}catch(e){}if(!l)l=(navigator.language||'de').slice(0,2).toLowerCase();return K.LANGS.some(x=>x[0]===l)?l:'de';})();
K.lang=LG;K.myLang=()=>LG;
const D=()=>window.I18N||{};
// Muster: deutsche Vorlagen mit Platzhaltern → reguläre Ausdrücke
let PATS=null;
function pats(){if(PATS)return PATS;PATS=[];for(const k of Object.keys(D()))if(/\{\d\}/.test(k)){const re=new RegExp('^'+k.replace(/[.*+?^$()|[\]\\]/g,'\\$&').replace(/\{(\d)\}/g,'(.+?)')+'$');PATS.push([re,k]);}
  PATS.sort((a,b)=>b[1].length-a[1].length);return PATS;}
K.T=function(s,a){if(LG==='de'||s==null)return a?String(s).replace(/\{(\d+)\}/g,(m,i)=>a[i]==null?'':a[i]):s;let r=D()[s]||s;if(a)r=r.replace(/\{(\d+)\}/g,(m,i)=>a[i]==null?'':a[i]);return r;};
// beliebigen deutschen Text übersetzen: genau, sonst Muster (Teile rekursiv), sonst Satzzeichen am Rand abtrennen
K.tr=function tr(s,depth){if(LG==='de'||!s)return s;const d=D();if(d[s])return d[s];if((depth||0)>3)return s;
  for(const[re,k]of pats()){const m=s.match(re);if(m){return d[k].replace(/\{(\d)\}/g,(x,i)=>tr(m[+i+1],(depth||0)+1));}}
  const m=s.match(/^([^\p{L}\p{N}„“]*)(.*?)([^\p{L}\p{N}„“.!?]*)$/su);if(m&&m[2]&&m[2]!==s&&(d[m[2]]||pats().some(p=>p[0].test(m[2]))))return m[1]+tr(m[2],(depth||0)+1)+m[3];
  const parts=s.split(/(?<=[.!?])\s+(?=\S)/);if(parts.length>1){const t=parts.map(x=>tr(x,(depth||0)+1));if(t.some((x,i)=>x!==parts[i]))return t.join(' ');}
  return s.replace(/[A-Za-zÄÖÜäöüß]+/g,w=>WORDS.has(w)&&d[w]?d[w]:w);};
const WORDS=new Set(['Blau','Grün','Rot','Gelb','Lila','Türkis','König','Dame','Turm','Läufer','Springer','Bauer','Einhorn','Herzogin','Gouverneur','Erzbischof','Kanzler','Amazone','Nachtreiter','Rochade','Computer','Mensch','leicht','mittel','stark','Meister','frei','Würfel','Quader','Ich','Spieler','Zug','Züge']);
function trNode(n){if(n.nodeType===3){const v=n.nodeValue,t=v.trim();if(!t||t.length>600)return;const r=K.tr(t);if(r!==t)n.nodeValue=v.replace(t,r);return;}
  if(n.nodeType!==1||n.tagName==='SCRIPT'||n.tagName==='STYLE'||n.classList&&n.classList.contains('notr'))return;
  for(const at of['title','placeholder','aria-label']){const v=n.getAttribute&&n.getAttribute(at);if(v){const r=K.tr(v.trim());if(r!==v.trim())n.setAttribute(at,r);}}
  for(const c of n.childNodes)trNode(c);}
K.trDOM=trNode;
if(LG!=='de'){document.documentElement.lang=LG;
  const go=()=>{trNode(document.body);document.title=K.tr(document.title);
    new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData')trNode(m.target);else for(const n of m.addedNodes)trNode(n);if(m.type==='attributes')trNode(m.target);}})
      .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','placeholder']});};
  if(document.body)go();else addEventListener('DOMContentLoaded',go);
  const A=window.alert.bind(window),Cf=window.confirm.bind(window);window.alert=m=>A(K.tr(String(m)));window.confirm=m=>Cf(K.tr(String(m)));}
K.langOpen=function(){let box=document.getElementById('kLang');if(!box){box=document.createElement('div');box.id='kLang';box.className='kModal';box.onclick=e=>{if(e.target===box)box.classList.remove('show');};
    box.innerHTML='<div class="kBox notr" style="max-width:360px"><h3>🌐 Sprache · Language</h3>'+K.LANGS.map(([c,n,f])=>`<button style="display:block;width:100%;margin:4px 0;text-align:left${c===LG?';border-color:#3cc463':''}" onclick="KIT.langSet('${c}')">${f} ${n}</button>`).join('')+'</div>';document.body.appendChild(box);}
  box.classList.add('show');};
K.langSet=function(c){try{localStorage.setItem('dreiSchach.lang',c);}catch(e){}location.reload();};
})();
// ================= Ausprobieren: von den Bildern der Regelseiten aus (?try=…) =================
(function(){
const K=window.KIT;
// d={t,x} · again() baut die Stellung neu auf · end() beendet das Ausprobieren · rules = Regelseite, falls man nicht von dort kam
K.tryBar=function(d,again,end,rules){let b=document.getElementById('tryBar');
  if(!b){b=document.createElement('div');b.id='tryBar';
    b.style.cssText='position:fixed;left:50%;bottom:calc(12px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:40;width:min(560px,94vw);background:rgba(20,24,34,.96);border:2px solid #ffd23f;border-radius:12px;padding:10px 14px;color:#eee;font:14px/1.45 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.55)';
    document.body.appendChild(b);}
  let back=rules;try{if(document.referrer&&new URL(document.referrer).origin===location.origin&&/regeln/.test(document.referrer))back=document.referrer;}catch(e){}
  const bs='background:#2a2e38;color:#eee;border:1px solid #4a5060;border-radius:8px;padding:5px 10px;font-size:13px;cursor:pointer;text-decoration:none';
  b.innerHTML=`<div style="display:flex;gap:8px;align-items:flex-start"><div style="flex:1"><b>🎓 ${K.esc(K.tr('Ausprobieren'))}: ${K.esc(K.tr(d.t))}</b><br>${K.tr(d.x)}</div><button id="tryX" style="${bs}" title="${K.esc(K.tr('Schließen'))}">✕</button></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button id="tryAgain" style="${bs}">↺ ${K.esc(K.tr('Nochmal'))}</button><a href="${K.esc(back)}" style="${bs}">📖 ${K.esc(K.tr('Zurück zu den Regeln'))}</a><button id="tryEnd" style="${bs}">▶ ${K.esc(K.tr('Richtige Partie'))}</button></div>`;
  b.querySelector('#tryAgain').onclick=again;b.querySelector('#tryEnd').onclick=()=>{b.remove();end();};b.querySelector('#tryX').onclick=()=>b.remove();};
})();
