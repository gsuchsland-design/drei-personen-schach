// Merkmale der Computergegner je Partie mitschreiben (nur über die Computergegner, nie über die Menschen).
// Vorbereitung für spätere Auswertungen, z. B. ob gegen einen „alten“ Avatar anders gespielt wird als gegen einen „jungen“.
// Heute sind alle Gegner Monster; Alter, Geschlecht und Aussehen bleiben leer, bis es menschenähnliche Avatare gibt.
// © 2026 Guido Suchsland
(function(){
'use strict';
const GESTALT={blob:'Glibber-Wesen',ogre:'Oger',flame:'Flammenwesen',spark:'Blitzwesen',ghost:'Gespenst',octo:'Krake',sun:'Sonne',fluff:'Flauschwesen'};
const LEVEL={easy:'leicht',medium:'mittel',hard:'stark',master:'Meister'};
function profile(monId,level,voiceOn){
  const M=window.MONDATA&&MONDATA.M,m=M&&M[monId];if(!m)return null;
  const v=(m.per&&m.per.voice)||{};
  return{typ:'monster',id:monId,name:m.name,gestalt:GESTALT[m.kind]||m.kind||null,
    alter:m.alter||null,geschlecht:m.geschlecht||null,aussehen:m.aussehen||null,   // erst bei menschenähnlichen Avataren belegt
    charakter:m.persona||null,staerke:LEVEL[level]||level||null,
    stimme:voiceOn?{an:true,hoehe:v.pitch||1,tempo:v.rate||1}:{an:false},
    neigung:m.per?{buendnis:m.per.propose,annahme:m.per.accept,verrat:m.per.betray,nachtragend:m.per.grudge,bluff:m.per.bluff}:null};
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
window.GEGNER={
  profile,
  // log: Array der Partie; seats: [{p, monId, level}] nur Computerplätze; n: Zugnummer
  record(log,seats,n,voiceOn){
    for(const s of seats){const pr=profile(s.monId,s.level,voiceOn);if(!pr)continue;
      let last=null;for(let i=log.length-1;i>=0;i--)if(log[i].p===s.p){last=log[i];break;}
      if(!last||!same(last.prof,pr))log.push({n,p:s.p,prof:pr});}
    return log;},
  // Text für Auswertung und KI-Bericht
  html(log,nameOf,colOf){
    if(!log||!log.length)return'';const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const rows=log.map(e=>{const p=e.prof,bits=[p.gestalt,p.staerke&&('Spielstärke '+p.staerke),p.stimme&&p.stimme.an?'spricht laut':'stumm'];
      if(p.alter)bits.push('Alter '+p.alter);if(p.geschlecht)bits.push(p.geschlecht);if(p.aussehen)bits.push(p.aussehen);
      return`<li>${e.n?esc('ab Zug '+(e.n+1)+': '):''}<b style="color:${colOf(e.p)}">${esc(p.name)}</b> (${esc(nameOf(e.p))}) – ${esc(bits.filter(Boolean).join(' · '))}${p.charakter?' – <i>'+esc(p.charakter)+'</i>':''}</li>`;});
    return`<h4>🤖 Computergegner in dieser Partie</h4><ul class="anaList kList">${rows.join('')}</ul>`;}
};
})();
