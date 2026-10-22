// Selbsteinschätzung nach der Partie (freiwillig): erst sich selbst einschätzen, dann mit der Auswertung vergleichen.
// Die Antworten gehen – wenn vorhanden – in den KI-Bericht ein (Selbstbild und tatsächliches Spiel).
// © 2026 Guido Suchsland
(function(){
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let X=null;            // Kontext der aktuellen Auswertung
const ANS={};
let REC=null;   // laufende Spracheingabe          // Antworten je Platz
const tr=s=>(X&&X.T?X.T(s):s);

// tatsächliches Verhalten aus den Kennzahlen ableiten (null = zu wenig Daten)
function actual(p){
  const s=X.st[p];if(!s)return{};const A={};
  const opps=X.opps(p);
  const hit=q=>((s.capOn||{})[q]||0)+((s.chkOn||{})[q]||0);
  const tot=opps.reduce((a,o)=>a+hit(o.p),0);
  if(tot>=3){const so=opps.slice().sort((a,b)=>hit(b.p)-hit(a.p));
    A.target=(so.length<2||hit(so[0].p)>=1.5*hit(so[1].p))?so[0].p:'none';}
  // wer hat mich am meisten angegriffen?
  const by=q=>{const o=X.st[q]||{};return((o.capOn||{})[p]||0)+((o.chkOn||{})[p]||0);};
  const totB=opps.reduce((a,o)=>a+by(o.p),0);
  if(totB>=3){const so=opps.slice().sort((a,b)=>by(b.p)-by(a.p));
    A.victim=(so.length<2||by(so[0].p)>=1.5*by(so[1].p))?so[0].p:'none';}
  const avg=s.moves?s.loss/s.moves:0;
  if(s.tiltN>=3){const t=s.tiltLoss/s.tiltN;A.tilt=t>avg*1.6+0.3?'tilt':'calm';}
  const n=(s.fastN||0)+(s.slowN||0);
  if(n>=6){const f=s.fastN/n;A.tempo=f>0.6?'fast':f<0.3?'slow':'mixed';}
  if(s.moves>=10){const c=s.caps/s.moves;A.style=c<0.12?'careful':c>0.3?'aggressive':'balanced';}
  if(opps.length>=2){const al=new Set();
    for(const x of X.silent)if(x.a===p)al.add(x.b);else if(x.b===p)al.add(x.a);
    for(const x of X.pacts)if(x.a===p)al.add(x.b);else if(x.b===p)al.add(x.a);
    A.ally=al.size?[...al]:'none';}
  if(X.hasTalk){const v=X.talk.filter(t=>t.p===p).map(t=>t.verdict).filter(v=>v!=='none');
    A.words=!v.length?'nothing':v.every(x=>x==='kept')?'yes':v.some(x=>x==='kept')?'partly':'no';}
  return A;
}
function qs(p){
  const opps=X.opps(p),nm=o=>o.name;
  return[
    {k:'target',q:'Wen hast du am meisten angegriffen?',o:[...opps.map(o=>[o.p,nm(o)]),['none',tr('niemanden besonders')]]},
    ...(opps.length>=2?[{k:'victim',q:'Wer hat dich am meisten angegriffen?',o:[...opps.map(o=>[o.p,nm(o)]),['none',tr('niemand besonders')]]}]:[]),
    {k:'tilt',q:'Wie hast du nach eigenen Verlusten gespielt?',o:[['calm',tr('ruhig wie vorher')],['tilt',tr('unruhiger, mit mehr Fehlern')]]},
    {k:'tempo',q:'Hast du eher schnell oder eher überlegt gezogen?',o:[['fast',tr('eher schnell')],['slow',tr('eher überlegt')],['mixed',tr('mal so, mal so')]]},
    {k:'style',q:'Wie würdest du deinen Stil beschreiben?',o:[['careful',tr('vorsichtig')],['balanced',tr('ausgewogen')],['aggressive',tr('angriffslustig')]]},
    ...(opps.length>=2?[{k:'ally',q:'Hattest du – abgesprochen oder stillschweigend – einen Verbündeten?',o:[...opps.map(o=>[o.p,nm(o)]),['none',tr('nein')]]}]:[]),
    ...(X.hasTalk?[{k:'words',q:'Hast du deine Ankündigungen eingehalten?',o:[['yes',tr('ja')],['partly',tr('teilweise')],['no',tr('nein')],['nothing',tr('ich habe nichts angekündigt')]]}]:[])
  ];
}
function label(p,k,v){if(v==null)return'';if(Array.isArray(v))return v.map(q=>label(p,k,q)).join(', ');
  const q=qs(p).find(x=>x.k===k);const o=q&&q.o.find(x=>x[0]===v);return o?o[1]:String(v);}
function form(){
  const me=document.getElementById('slfWho').value;const a=ANS[me]||{};
  let h='';
  for(const q of qs(me)){h+=`<label class="slfQ"><span>${esc(tr(q.q))}</span><select data-k="${q.k}" onchange="SELBST.set(this)"><option value="">${esc(tr('– keine Angabe –'))}</option>`+
    q.o.map(o=>`<option value="${esc(o[0])}"${a[q.k]===o[0]?' selected':''}>${esc(o[1])}</option>`).join('')+'</select></label>';}
  h+=`<label class="slfQ slfWide"><span>${esc(tr('Was ist dir an deinem eigenen Spiel aufgefallen? (freiwillig)'))}</span><textarea data-k="note" rows="2" maxlength="400" oninput="SELBST.set(this)">${esc(a.note||'')}</textarea>${(window.SpeechRecognition||window.webkitSpeechRecognition)?`<button type="button" id="slfMic" class="slfMic" onclick="SELBST.mic()" title="${esc(tr('Einsprechen statt tippen'))}">🎤 ${esc(tr('Einsprechen'))}</button><span id="slfMicTxt" class="slfNote"></span>`:''}</label>`;
  document.getElementById('slfForm').innerHTML=h;
  document.getElementById('slfCmp').innerHTML=a._cmp?cmpHTML(me):'';
}
// welche Verzerrung zu einer Abweichung passt
const RANK={yes:3,partly:2,no:1,nothing:0};
function biasFor(k,self,act){if(k==='victim')return'feindseligkeit';
  if(k==='words')return(RANK[self]||0)>(RANK[act]||0)?'selbstwert':'introspektion';
  return'introspektion';}
function cmpHTML(p){const a=ANS[p]||{},A=actual(p);let rows='',n=0;
  for(const q of qs(p)){if(!a[q.k])continue;n++;const act=A[q.k];
    let v;if(act==null)v=`<span class="slfNa">– ${esc(tr('zu wenig Daten für einen Vergleich'))}</span>`;
    else{const ok=Array.isArray(act)?act.includes(a[q.k]):act===a[q.k];
      v=(ok?'✅ ':'↔ ')+esc(tr('laut Auswertung'))+': <b>'+esc(label(p,q.k,act))+'</b>'+(!ok&&window.BIAS?BIAS.tag(biasFor(q.k,a[q.k],act)):'');}
    rows+=`<li>${esc(tr(q.q))} ${esc(tr('Du'))}: <b>${esc(label(p,q.k,a[q.k]))}</b> · ${v}</li>`;}
  if(!n)return`<p class="slfNote">${esc(tr('Wähle oben mindestens eine Antwort aus.'))}</p>`;
  return`<ul class="slfList">${rows}</ul><p class="slfNote">${esc(tr('Abweichungen sind kein Fehler, sondern der spannendste Teil: Hier unterscheiden sich Selbstbild und Spiel. Die Auswertung kann sich auch irren – sie sieht nur Züge und Zeiten.'))}</p>`;}

window.SELBST={
  // ctx: {T, humans:[{p,name,col}], me, opps(p)->[{p,name}], st, silent:[{a,b}], pacts:[{a,b}], talk:[{p,verdict}], hasTalk, cls:{box,note}}
  html(ctx){X=ctx;if(!ctx.humans.length)return'';
    const me=ctx.humans.some(h=>h.p===ctx.me)?ctx.me:ctx.humans[0].p;
    const who=ctx.humans.length>1?`<label class="slfQ"><span>${esc(tr('Ich war:'))}</span><select id="slfWho" onchange="SELBST.form()">${ctx.humans.map(h=>`<option value="${h.p}"${h.p===me?' selected':''}>${esc(h.name)}</option>`).join('')}</select></label>`
      :`<input type="hidden" id="slfWho" value="${me}">`;
    return`<details id="slfBox" class="slfBox"><summary>🪞 ${esc(tr('Selbsteinschätzung (freiwillig)'))}</summary>
<p class="slfNote">${esc(tr('Wie hast du gespielt? Schätze dich zuerst selbst ein und vergleiche dann mit der Auswertung. Deine Antworten fließen auch in den KI-Bericht ein. Alles ist freiwillig – jede Frage lässt sich überspringen.'))}</p>
${who}<div id="slfForm"></div><button type="button" class="slfBtn" onclick="SELBST.compare()">🔍 ${esc(tr('Mit der Auswertung vergleichen'))}</button><div id="slfCmp"></div></details>`;},
  init(){if(document.getElementById('slfWho'))form();},
  form,
  set(el){const p=document.getElementById('slfWho').value;(ANS[p]=ANS[p]||{})[el.dataset.k]=el.value;},
  compare(){const p=document.getElementById('slfWho').value;(ANS[p]=ANS[p]||{})._cmp=true;document.getElementById('slfCmp').innerHTML=cmpHTML(p);},
  // Spracheingabe für das freie Feld: das Gesagte wird angehängt und lässt sich danach korrigieren
  mic(){const C=window.SpeechRecognition||window.webkitSpeechRecognition,b=document.getElementById('slfMic'),info=document.getElementById('slfMicTxt'),ta=document.querySelector('#slfForm textarea');if(!C||!ta)return;
    if(REC){try{REC.stop();}catch(e){}return;}
    const BCP={de:'de-DE',en:'en-US',fr:'fr-FR',es:'es-ES',it:'it-IT',pt:'pt-PT',nl:'nl-NL',pl:'pl-PL',tr:'tr-TR',ru:'ru-RU',uk:'uk-UA',zh:'zh-CN',ja:'ja-JP',ko:'ko-KR',th:'th-TH',ar:'ar-SA',is:'is-IS',da:'da-DK'};
    let l='de';try{l=localStorage.getItem('dreiSchach.lang')||'de';}catch(e){}
    const r=new C();REC=r;r.lang=BCP[l]||'de-DE';r.interimResults=true;r.continuous=true;const base=ta.value?ta.value.replace(/\s*$/,' '):'';let fin='';
    r.onresult=e=>{let tmp='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)fin+=t+' ';else tmp+=t;}
      ta.value=(base+fin+tmp).slice(0,400);SELBST.set(ta);};
    const end=()=>{REC=null;b.textContent='🎤 '+tr('Einsprechen');b.classList.remove('on');info.textContent='';ta.value=ta.value.trim();SELBST.set(ta);};
    r.onend=end;r.onerror=ev=>{end();info.textContent=ev.error==='not-allowed'?tr('Kein Zugriff auf das Mikrofon.'):tr('Die Spracherkennung hat nicht geklappt – bitte noch einmal versuchen.');};
    try{r.start();b.textContent='⏹ '+tr('Fertig');b.classList.add('on');info.textContent=tr('Ich höre zu …');}catch(e){end();}},
  reset(){for(const k in ANS)delete ANS[k];},
  // Text für den KI-Bericht ('' wenn nichts angegeben)
  facts(){if(!X)return'';let f='';
    for(const h of X.humans){const a=ANS[h.p];if(!a)continue;const A=actual(h.p),L=[];
      for(const q of qs(h.p)){if(!a[q.k])continue;const act=A[q.k];
        const ok=act!=null&&(Array.isArray(act)?act.includes(a[q.k]):act===a[q.k]);
        L.push(`- ${q.q} Selbst: ${label(h.p,q.k,a[q.k])} | laut Auswertung: ${act==null?'zu wenig Daten':label(h.p,q.k,act)}`+(act!=null&&!ok&&window.BIAS?` (Abweichung, passt zu: ${BIAS.N[biasFor(q.k,a[q.k],act)]})`:''));}
      if(a.note&&a.note.trim())L.push(`- Eigene Beobachtung: ${a.note.trim()}`);
      if(L.length)f+=`\nSelbsteinschätzung von ${h.name} (freiwillig angegeben):\n${L.join('\n')}\n`;}
    return f?'\n'+f:'';}
};
// Aussehen (passt zu beiden Auswertungsfenstern)
const st=document.createElement('style');st.textContent=`
.slfBox{margin:10px 0;padding:8px 12px;border:1px solid #8a7bd6;border-radius:10px;background:rgba(138,123,214,.08)}
.slfBox summary{cursor:pointer;font-weight:bold;color:#c9bfff}
.slfQ{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;margin:6px 0}.slfQ span{flex:1 1 220px}
.slfQ select{flex:0 1 auto;max-width:100%}.slfWide textarea{flex:1 1 100%;width:100%;box-sizing:border-box;font:inherit}
.slfBtn{margin:6px 0}.slfList{margin:6px 0;padding-left:18px}.slfList li{margin:3px 0}
.slfMic{margin-top:4px}.slfMic.on{background:#a33;color:#fff}
.slfNote,.slfNa{color:#9a9aa8;font-size:13px}`;
document.head.appendChild(st);
})();
