// Einführung: Beispielseiten im Hintergrund (Startseite, Regelseite, „👆 ▶“-Bilder)
// © 2026 Guido Suchsland
(function(){
'use strict';
// Sprachen mit übersetzten Regelseiten (Sternschach-Regeln gibt es bisher nur auf Deutsch)
const RL=['en','fr','es','it','pt','nl','pl','tr','ru','uk','zh','ja','ko','th','ar','is','da'];
const lang=()=>{try{return localStorage.getItem('dreiSchach.lang')||'de';}catch(e){return'de';}};
function rulesUrl(page){const l=lang();return(l!=='de'&&RL.includes(l)&&page!=='stern-regeln.html')?l+'/'+page:page;}
function mark(doc,el){if(!el)return;el.style.outline='4px solid #ffd23f';el.style.outlineOffset='3px';el.style.borderRadius='8px';
  try{el.scrollIntoView({block:'center'});}catch(e){}}
const PREP={
  // Startseite: das Menü „Spiele“ aufgeklappt zeigen
  home:doc=>{const dd=doc.querySelector('nav.main details.dd');if(dd){dd.open=true;mark(doc,dd.querySelector('summary'));}try{doc.defaultView.scrollTo(0,0);}catch(e){}},
  // Regelseite: oben, das Menü „Regeln“ markiert
  rules:doc=>{const dd=doc.querySelectorAll('nav.main details.dd')[1];if(dd)mark(doc,dd.querySelector('summary'));try{doc.defaultView.scrollTo(0,0);}catch(e){}},
  // Ausprobieren: zum ersten Bild mit „👆 ▶“ in einer Bildergruppe springen
  try:doc=>{mark(doc,doc.querySelector('.tryGrid a.try')||doc.querySelector('a.try'));}
};
let box=null,frame=null,cur='';
function ensure(z){
  if(box){box.style.zIndex=z;return;}
  box=document.createElement('div');box.id='tourBg';
  box.style.cssText='position:fixed;display:none;border-radius:10px;overflow:hidden;background:#16181d;box-shadow:0 0 0 9999px rgba(0,0,0,.6),0 0 0 2px #ffd23f;z-index:'+z;
  frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
  frame.style.cssText='border:0;width:100%;height:100%;display:block;pointer-events:none;background:#16181d';
  frame.onload=()=>{const k=box.dataset.kind;try{const d=frame.contentDocument;if(d&&PREP[k])PREP[k](d);}catch(e){}};
  box.appendChild(frame);document.body.appendChild(box);
}
// kind: 'home' | 'rules' | 'try'; page: Regelseite des Spiels; rect: {left,top,width,height}; z: Ebene
window.TourBg={
  show(kind,page,rect,z){ensure(z||39);
    const url=kind==='home'?'index.html#start':rulesUrl(page||'regeln.html');
    box.style.left=rect.left+'px';box.style.top=rect.top+'px';box.style.width=rect.width+'px';box.style.height=rect.height+'px';box.style.display='block';
    box.dataset.kind=kind;
    if(cur!==url){cur=url;frame.src=url;}
    else{try{const d=frame.contentDocument;if(d&&d.readyState!=='loading'){for(const e of d.querySelectorAll('[style*="outline"]'))e.style.outline='';
      for(const e of d.querySelectorAll('nav.main details.dd'))e.open=false;PREP[kind](d);}}catch(e){}}
  },
  hide(){if(box)box.style.display='none';},
  // Aufteilung: Vorschau und Karte (Breite cw, Höhe ch). Breite Bildschirme: Karte rechts daneben, sonst darunter.
  layout(cw,ch){const W=innerWidth,H=innerHeight,m=W<600?8:Math.max(12,Math.round(Math.min(W,H)*0.03));
    if(W>=900){const w=W-cw-3*m;return{left:m,top:m,width:w,height:H-2*m,cx:W-cw-m,cy:Math.max(m,(H-ch)/2)};}
    const h=Math.max(160,H-ch-3*m);return{left:m,top:m,width:W-2*m,height:h,cx:Math.max(8,(W-cw)/2),cy:Math.min(H-ch-8,m+h+m)};}
};
})();
