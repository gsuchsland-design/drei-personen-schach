// Bestenliste: Ergebnis einer beendeten Partie an den Server melden (nur mit Spielername).
// Online- und Fernpartien zählen, sobald zwei Mitspieler mit Spielernamen dasselbe Ergebnis melden.
// Partien allein gegen den Computer zählen als Rekord je Spielstärke. © 2026 Guido Suchsland
(function(){
'use strict';
const T=s=>(window.I18N&&window.I18N[s])||s;
const LV=['easy','medium','hard','master'];
async function sha(s){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');}
const done=k=>{try{const a=JSON.parse(localStorage.getItem('dreiSchach.gemeldet')||'[]');if(a.includes(k))return true;a.push(k);localStorage.setItem('dreiSchach.gemeldet',JSON.stringify(a.slice(-200)));}catch(e){}return false;};
function toast(t){let el=document.getElementById('wtToast');if(!el){el=document.createElement('div');el.id='wtToast';
  el.style.cssText='position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:2147483100;background:rgba(28,30,38,.96);color:#fff;border:2px solid #ffd23f;border-radius:12px;padding:8px 14px;font:14px/1.4 system-ui,sans-serif;max-width:92vw;box-shadow:0 4px 18px rgba(0,0,0,.5);transition:opacity .4s';
  document.body.appendChild(el);}el.textContent=t;el.style.opacity='1';clearTimeout(toast.t);toast.t=setTimeout(()=>{el.style.opacity='0';},6000);}
async function post(act,body){const me=SPIELER.get();const h=await (async()=>{const q=new URLSearchParams(location.search).get('fernhost');if(q)return(/^(localhost|127\.)/.test(q)?'http://':'https://')+q;
  const r=await fetch('server.json?'+Date.now(),{cache:'no-store'});const j=await r.json();return'https://'+String(j.host||'').replace(/^https?:\/\//,'').replace(/\/+$/,'');})();
  const r=await fetch(h+'/spieler/'+act,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({id:me.id,secret:me.secret},body))});
  return r.json().catch(()=>({}));}
window.WERTUNG={
  // d: {spiel:'3ps'|'raum'|'grenz'|'stern', rang:[[…],…] (beste zuerst; gleiche Gruppe = kein Vergleich), zuege:'…' (Zugfolge als Text),
  //     online:{code,seat} oder null, humans:[Plätze der Menschen], ai:{Platz:Stufe}, start:Zeitpunkt der Partie}
  async melden(d){
    try{
      if(!window.SPIELER||!d||!d.rang||!d.rang.length)return;
      const me=SPIELER.get();
      if(d.online&&d.online.code&&d.online.seat){
        if(!me){if(!done('hinweis'))toast(T('Tipp: Mit einem Spielernamen (👤) zählen deine Online-Partien für die Bestenliste.'));return;}
        const key=await sha(d.spiel+'|'+d.online.code+'|'+d.zuege);if(done(key))return;
        const j=await post('ergebnis',{spiel:d.spiel,key,seat:d.online.seat,rang:d.rang});
        if(j.status==='gezaehlt'&&j.elo!=null)toast(T('🏆 Bestenliste: {0} Punkte ({1})').replace('{0}',(j.aenderung>0?'+':'')+j.aenderung).replace('{1}',j.elo));
        else if(j.status==='wartet')toast(T('🏆 Ergebnis gemeldet – es zählt, sobald ein Mitspieler mit Spielernamen es bestätigt.'));
        return;}
      // allein gegen den Computer: Rekord, wenn der Mensch allein gewonnen hat
      if(!me||!d.humans||d.humans.length!==1)return;
      const h=d.humans[0],lv=Object.values(d.ai||{}).filter(x=>LV.includes(x));
      if(!lv.length||d.rang[0].length!==1||d.rang[0][0]!==h)return;
      const stufe=lv.sort((a,b)=>LV.indexOf(b)-LV.indexOf(a))[0];
      const key=await sha(d.spiel+'|lokal|'+(d.start||'')+'|'+d.zuege);if(done(key))return;
      const j=await post('rekord',{spiel:d.spiel,stufe,zuege:d.zuegeMensch||1,key});
      if(j.status==='gezaehlt')toast(T('🏆 Sieg gegen den Computer in die Rekordliste eingetragen.'));
    }catch(e){}
  }
};
})();
