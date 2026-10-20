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
#kMons canvas{width:168px;height:126px;border-radius:8px;border:3px solid #444;background:#14161c}
@media (max-width:700px){#kMons{top:auto;bottom:130px;flex-direction:row;right:4px}#kMons canvas{width:96px;height:72px}}
#kTour{position:fixed;z-index:40;left:50%;bottom:24px;transform:translateX(-50%);width:min(460px,94vw);background:#22283a;border:2px solid #f2c418;border-radius:14px;padding:14px 16px;display:none;color:#eee;box-shadow:0 6px 30px rgba(0,0,0,.6)}
#kTour h4{margin:0 0 6px}#kTour .row{display:flex;gap:8px;margin-top:10px;justify-content:flex-end}
.kHi{outline:3px solid #f2c418!important;outline-offset:2px;border-radius:8px}
.kClk{font:600 12px ui-monospace,monospace;margin-left:6px}.kClk.low{color:#ff6a50}
`;document.head.appendChild(css);
  const div=document.createElement('div');div.innerHTML=`
<div id="kChat"><div style="display:flex;align-items:center;padding:6px 10px;border-bottom:1px solid #333"><b>💬 Chat</b><span class="kNote" style="margin-left:8px">wird bei Bedarf übersetzt</span><button style="margin-left:auto" onclick="KIT.chatToggle()">✕</button></div>
 <div id="kChatLog" style="flex:1;overflow:auto;padding:6px 10px;font-size:13px;min-height:80px"></div>
 <div style="display:flex;gap:6px;padding:6px"><input type="text" id="kChatIn" maxlength="200" placeholder="Nachricht …" style="flex:1" onkeydown="if(event.key==='Enter')KIT.chatSend()"><button onclick="KIT.chatSend()">➤</button></div></div>
<div id="kMons"></div>
<div id="kCol" class="kModal" onclick="if(event.target===this)KIT.colClose()"><div class="kBox"><button class="kX" onclick="KIT.colClose()">✕</button><h3>🎨 Farben</h3>
 <p class="kNote" style="margin-top:0">Wähle für jeden Spieler die Farbe, die du am besten unterscheiden kannst. Das gilt nur auf deinem Gerät.</p><div id="kColRows"></div>
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
  document.getElementById('kCol').classList.add('show');};
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
K.clockInit=function(g){g.turnAt=Date.now();g.used={};g.clock={};for(const p of g.order){g.used[p]=0;if(g.tc&&g.tc.game)g.clock[p]=g.tc.game*60000;}};
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
function clockTick(){const g=GM();if(!g||g.over||!g.tc||C.busyAna)return;const p=cur(),l=K.clockLeft(p);if(!l)return;
  if(g.online){const o=ON();if(o.seats&&g.order.some(q=>o.seats[q]&&o.seats[q].kind==='open')){g.turnAt=Date.now();return;}}
  const now=Date.now();if(now-lastShown>900){lastShown=now;C.clockShow&&C.clockShow();}
  const kind=l.game!=null&&l.game<=0?'game':l.move!=null&&l.move<=0?'move':null;if(!kind)return;
  // online meldet der Spieler am Zug (oder wer die Computer steuert) – ist er weg, nach 5 s jeder andere Mitspieler
  if(g.online){const o=ON();if(!o.seat)return;const over=-(kind==='game'?l.game:l.move);
    if(!(p===o.seat||(isAI(p)&&g.lastBy===o.seat)||over>5000))return;}
  if(g._toFor===p+'@'+g.turnAt)return;g._toFor=p+'@'+g.turnAt;
  C.timeout(p,kind);}

// ================= Tisch: Monitore, Bild & Ton, Chat, Übersetzung =================
const TB=K.TB={peer:null,conns:{},calls:{},streams:{},vids:{},cam:null,mic:null,subs:{},names:{},langs:{},av:{},chat:[],unread:0,monOn:true,readOn:false,subOn:false,recog:null};
K.tbHTML=function(){return `<div class="row"><label><input type="checkbox" id="kMonChk" checked onchange="KIT.monSet(this.checked)"> 🖥️ Monitore</label><button onclick="KIT.colOpen()">🎨 Farben</button></div>
 <div id="kTb" style="display:none">
  <div class="row"><button id="kCamBtn" onclick="KIT.tbCam()">📷 Kamera</button><button id="kMicBtn" onclick="KIT.tbMic()">🎤 Mikrofon</button><button onclick="KIT.chatToggle()">💬 Chat <span id="kChatBadge"></span></button></div>
  <div class="row"><label><input type="checkbox" id="kSubChk" onchange="KIT.subSet(this.checked)"> 🗣️ Gesprochenes als Untertitel</label></div>
  <div class="row"><label><input type="checkbox" onchange="KIT.TB.readOn=this.checked"> 🔊 Übersetzungen vorlesen</label></div>
  <div class="kNote" id="kTbState"></div></div>`;};
K.monSet=on=>{TB.monOn=on;if(C.mon3d)C.mon3d();else monDom();C.render&&C.render();};
function wrap(x,text,w){const words=String(text).split(/\s+/),lines=[];let l='';for(const wd of words){const t=l?l+' '+wd:wd;if(x.measureText(t).width>w&&l){lines.push(l);l=wd;}else l=t;}if(l)lines.push(l);return lines.slice(-3);}
// ein Monitorbild (320 × 240) zeichnen: Video oder Bild, Name, am Zug, Uhr, Untertitel
K.monPaint=function(x,p){const g=GM(),o=ON(),now=Date.now(),PC=C.PCOL[p];
  x.fillStyle='#14161c';x.fillRect(0,0,320,240);
  const v=TB.vids[p],live=v&&v.readyState>=2&&v.videoWidth&&(p===o.seat?!!TB.cam:TB.streams[p]&&TB.streams[p].getVideoTracks().some(t=>t.readyState==='live'&&!t.muted)&&!(TB.av[p]&&TB.av[p].cam===false));
  if(live){const r=Math.max(320/v.videoWidth,240/v.videoHeight),w=v.videoWidth*r,h=v.videoHeight*r;x.save();if(p===o.seat){x.translate(320,0);x.scale(-1,1);}x.drawImage(v,(320-w)/2,(240-h)/2,w,h);x.restore();}
  else{const gr=x.createRadialGradient(160,105,10,160,105,120);gr.addColorStop(0,PC);gr.addColorStop(1,'#14161c');x.fillStyle=gr;x.fillRect(0,0,320,240);
    x.font='88px "Segoe UI Emoji","Noto Color Emoji",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';
    x.fillText(isAI(p)?'🤖':(String(C.seatName(p))[0]||'?').toUpperCase(),160,105);}
  if(g.out.includes(p)){x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,0,320,240);x.fillStyle='#ccc';x.font='bold 26px sans-serif';x.textAlign='center';x.fillText('ausgeschieden',160,110);}
  x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,200,320,40);x.fillStyle=PC;x.font='bold 22px sans-serif';x.textAlign='left';x.textBaseline='middle';
  x.fillText((C.PNAME[p]+' · '+C.seatName(p)).slice(0,26),10,220);
  const l=K.clockLeft(p);
  if(!g.over&&cur()===p){x.fillStyle=PC;x.fillRect(0,0,320,30);x.fillStyle='#000';x.font='bold 18px sans-serif';x.textAlign='center';
    x.fillText('am Zug'+(l&&l.move!=null?' · ⏱ '+fmt(l.move):''),160,15);}
  if(l&&l.game!=null){x.font='bold 18px ui-monospace,monospace';x.textAlign='right';x.textBaseline='middle';x.fillStyle=l.game<30000?'#ff6a50':'#fff';x.fillText('⌛'+fmt(l.game),314,46);}
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
  else if(d.t==='chat')chatIn(q,d);
  else if(d.t==='sub')subIn(q,d);}
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
K.chatSend=function(){const i=document.getElementById('kChatIn'),text=(i.value||'').trim().slice(0,200);if(!text)return;i.value='';
  const m={t:'chat',text,lang:K.myLang(),name:K.myName(),id:Date.now()};tbBroadcast(m);chatIn(ON().seat,m);};
async function chatIn(q,m){const me=ON().seat;
  const line={q,name:q===me?K.myName():(TB.names[q]||C.seatName(q)),text:String(m.text||'').slice(0,200),tr:null,n:(GM().rec||[]).length};TB.chat.push(line);if(TB.chat.length>200)TB.chat.shift();
  if(q!==me){TB.subs[q]={text:line.text,t:Date.now()};if(document.getElementById('kChat').style.display!=='flex'){TB.unread++;chatBadge();}}
  chatRender();
  if(q!==me&&m.lang&&m.lang!==K.myLang()){const t=await K.translate(line.text,m.lang,K.myLang());if(t){line.tr=t;TB.subs[q]={text:t,t:Date.now()};chatRender();if(TB.readOn)speak(t,K.myLang());}}}
function chatRender(){const el=document.getElementById('kChatLog');
  el.innerHTML=TB.chat.map(l=>`<div><b style="color:${C.PCOL[l.q]||'#ccc'}">${esc(l.name)}:</b> ${esc(l.text)}${l.tr?`<br><i style="color:#9fd09f">🌐 ${esc(l.tr)}</i>`:''}</div>`).join('');el.scrollTop=el.scrollHeight;}
// ---------- Gesprochenes als Untertitel (Spracherkennung im Browser), bei Bedarf übersetzt ----------
const LOCALE={de:'de-DE',en:'en-US',fr:'fr-FR',es:'es-ES',it:'it-IT',pt:'pt-PT',nl:'nl-NL',pl:'pl-PL',ru:'ru-RU',tr:'tr-TR',uk:'uk-UA',zh:'zh-CN'};
K.subSet=function(on){TB.subOn=on;const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(on&&!SR){alert('Dein Browser kann Gesprochenes nicht in Text umwandeln (am besten Chrome verwenden).');document.getElementById('kSubChk').checked=false;TB.subOn=false;return;}
  if(!on){try{TB.recog&&TB.recog.stop();}catch(e){}TB.recog=null;return;}
  const r=new SR();r.lang=LOCALE[K.myLang()]||'de-DE';r.continuous=true;r.interimResults=false;
  r.onresult=ev=>{for(let i=ev.resultIndex;i<ev.results.length;i++)if(ev.results[i].isFinal){const text=ev.results[i][0].transcript.trim();if(!text)continue;
    const me=ON().seat;TB.subs[me]={text,t:Date.now()};TB.chat.push({q:me,name:K.myName(),text,spoken:true,n:(GM().rec||[]).length});tbBroadcast({t:'sub',text,lang:K.myLang()});}};
  r.onend=()=>{if(TB.subOn&&TB.recog===r)try{r.start();}catch(e){}};r.onerror=()=>{};
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
  rec.forEach((e,i)=>{const s=st[e.p];if(!s)return;if(e.to){s.timeouts++;return;}const r=res[i];
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
  let f=`Spiel: ${C.title} (${C.descr})\nSpieler: ${ANA.order.map(p=>`${C.PNAME[p]}: ${nm(p)}${isAI(p)?' (Computer)':''}`).join(', ')}\nErgebnis: ${ANA.over?C.PNAME[ANA.winner]+' gewinnt':'Partie läuft noch'}\nZüge: ${ANA.rec.length}\n\n`+t.replace(/\n{3,}/g,'\n\n');
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
  if(s.el){const e=document.querySelector(s.el);if(e){e.classList.add('kHi');try{e.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(_){}}}
  if(s.run)try{s.run();}catch(e){}}
K.tourGo=function(d){if(!TOUR)return;const n=TOUR.i+d;if(n>=TOUR.steps.length){K.tourEnd();return;}TOUR.i=Math.max(0,n);tourShow();};
K.tourEnd=function(){for(const e of document.querySelectorAll('.kHi'))e.classList.remove('kHi');document.getElementById('kTour').style.display='none';
  const s=TOUR&&TOUR.steps;TOUR=null;ls.set(C.game+'.tourDone','1');C.tourEnd&&C.tourEnd();};
K.tourSeen=()=>ls.get(C.game+'.tourDone','')==='1';
})();
