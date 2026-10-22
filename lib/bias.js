// Kognitive Verzerrungen: Namen und Links zur Erklärung auf der Seite „Psychologie“
// © 2026 Guido Suchsland
(function(){
'use strict';
const N={
  'sunk-cost':'Sunk-Cost-Effekt',
  'verlustaversion':'Verlustaversion',
  'vergeltung':'Vergeltungsimpuls',
  'impulsivitaet':'Impulsives Schnelldenken',
  'feindseligkeit':'Feindseligkeitsverzerrung',
  'introspektion':'Introspektionsillusion',
  'selbstwert':'Selbstwertdienliche Verzerrung'
};
const tr=s=>(window.I18N&&window.I18N[s])||s;
// Seite liegt im Hauptordner; Spiele und Auswertung ebenfalls
window.BIAS={
  N,
  name:k=>tr(N[k]||k),
  // kleiner blauer Link hinter einer Beobachtung (öffnet die Erklärung in neuem Tab, die Partie bleibt offen)
  tag:k=>N[k]?` <a class="biasTag" href="psychologie.html#${k}" target="_blank" rel="noopener" title="${tr('Kognitive Verzerrung – Erklärung öffnen')}">→ ${tr(N[k])}</a>`:''
};
const st=document.createElement('style');
st.textContent='.biasTag{color:#6fa8ff!important;font-size:.82em;text-decoration:none;white-space:nowrap;border-bottom:1px dotted #6fa8ff;margin-left:2px}.biasTag:hover{color:#9cc3ff!important}';
document.head.appendChild(st);
})();
