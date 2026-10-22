// Schach der 6 Reiche – 3D-Figuren: gedrechselte Schachfiguren, Sternfiguren, Raumschiffe; Weltraum-Hintergrund und Explosionen.
// Jede Figur besteht aus wenigen Teilen nach Materialart: 'w' Körper in Spielerfarbe, 'd' dunkel, 'g' Gold, 'e' leuchtend (Triebwerke), 'm' Metall, 'c' Glas, 'l' Lichter.
// Alle Teile einer Art sind zu einer Geometrie zusammengefasst, damit gleiche Figuren gebündelt gezeichnet werden können.
// © 2026 Guido Suchsland
(function(){
'use strict';
const T=THREE;
const LSEG=20;
const BASE=[[0,0],[0.315,0],[0.315,0.03],[0.295,0.045],[0.305,0.065],[0.285,0.085],[0.24,0.105],[0.25,0.12],[0.21,0.135]];
const lathe=(pts,base=true)=>new T.LatheGeometry((base?BASE.concat(pts):pts).map(([r,h])=>new T.Vector2(r,h)),LSEG);
const at=(g,x,y,z)=>{g.translate(x,y,z);return g;};

// mehrere Geometrien zu einer (ohne Index) zusammenfügen
function merge(list){
  const pos=[],nor=[];
  for(let g of list){g=g.index?g.toNonIndexed():g;if(!g.attributes.normal)g.computeVertexNormals();
    pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array);}
  const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(pos,3));out.setAttribute('normal',new T.Float32BufferAttribute(nor,3));
  return out;
}
// Teile [[geo,kind],…] → {kind: geo}
function group(parts){const by={};for(const[g,k]of parts)(by[k]=by[k]||[]).push(g);const out={};for(const k in by)out[k]=merge(by[k]);return out;}

// ---------- gedrechselte Schachfiguren (Grundformen wie im Drei-Personen-Schach) ----------
function horseHead(){
  const P=[[-0.16,0.22],[0.14,0.22],[0.1,0.3],[0.12,0.36],[0.22,0.42],[0.3,0.47],[0.315,0.52],[0.28,0.565],[0.2,0.58],[0.16,0.63],[0.1,0.71],[0.075,0.82],[0.035,0.73],[-0.01,0.84],[-0.06,0.72],[-0.13,0.62],[-0.18,0.46],[-0.18,0.3]];
  const sh=new T.Shape();sh.moveTo(P[0][0],P[0][1]);for(const q of P.slice(1))sh.lineTo(q[0],q[1]);sh.closePath();
  const e=new T.ExtrudeGeometry(sh,{depth:0.13,bevelEnabled:true,bevelSize:0.035,bevelThickness:0.035,bevelSegments:2,curveSegments:4});
  e.translate(0,0,-0.065);return e;
}
const horn=(y,len=0.26,r=0.035)=>at(new T.ConeGeometry(r,len,10),0,y+len/2,0);
function chessParts(t){
  const g=[],W=x=>g.push([x,'w']),G=x=>g.push([x,'g']),D=x=>g.push([x,'d']);
  const pawn=()=>{W(lathe([[0.17,0.15],[0.12,0.22],[0.095,0.29],[0.15,0.31],[0.155,0.33],[0.1,0.345],[0,0.345]]));W(at(new T.SphereGeometry(0.125,14,10),0,0.44,0));};
  const rook=()=>{W(lathe([[0.2,0.15],[0.175,0.22],[0.16,0.44],[0.2,0.47],[0.24,0.5],[0.24,0.64],[0.17,0.64],[0.17,0.58],[0,0.58]]));
    for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6,b=new T.BoxGeometry(0.075,0.09,0.06);b.rotateY(-a);W(at(b,Math.cos(a)*0.205,0.685,Math.sin(a)*0.205));}
    G(at(new T.TorusGeometry(0.205,0.012,6,LSEG).rotateX(Math.PI/2),0,0.47,0));};
  const bishop=(tip=true)=>{W(lathe([[0.17,0.15],[0.12,0.25],[0.085,0.42],[0.075,0.5],[0.15,0.52],[0.155,0.545],[0.1,0.56],[0,0.56]]));
    W(lathe([[0,0.56],[0.09,0.575],[0.135,0.63],[0.14,0.69],[0.115,0.76],[0.07,0.82],[0.02,0.85],[0,0.855]],false));
    const k=new T.BoxGeometry(0.03,0.16,0.3);k.rotateZ(-0.6);D(at(k,0.035,0.73,0));
    if(tip)G(at(new T.SphereGeometry(0.04,10,8),0,0.89,0));G(at(new T.TorusGeometry(0.15,0.012,6,LSEG).rotateX(Math.PI/2),0,0.535,0));};
  const queen=(crownTop=true)=>{W(lathe([[0.2,0.15],[0.13,0.26],[0.095,0.5],[0.18,0.54],[0.185,0.565],[0.11,0.59],[0.12,0.64],[0.22,0.76],[0.17,0.75],[0.12,0.73],[0,0.75]]));
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9;G(at(new T.SphereGeometry(0.032,8,6),Math.cos(a)*0.205,0.785,Math.sin(a)*0.205));}
    if(crownTop){W(lathe([[0,0.74],[0.08,0.76],[0.07,0.8],[0,0.83]],false));G(at(new T.SphereGeometry(0.055,10,8),0,0.86,0));}
    G(at(new T.TorusGeometry(0.18,0.012,6,LSEG).rotateX(Math.PI/2),0,0.553,0));};
  const king=()=>{W(lathe([[0.21,0.15],[0.14,0.27],[0.1,0.56],[0.2,0.6],[0.205,0.625],[0.12,0.65],[0.13,0.7],[0.2,0.8],[0.18,0.83],[0.08,0.84],[0.07,0.87],[0,0.87]]));
    G(at(new T.TorusGeometry(0.2,0.013,6,LSEG).rotateX(Math.PI/2),0,0.612,0));
    G(at(new T.BoxGeometry(0.075,0.3,0.05),0,1.0,0));G(at(new T.BoxGeometry(0.22,0.075,0.05),0,1.05,0));};
  const knight=(s=1,y=0)=>{if(s===1)W(lathe([[0.2,0.15],[0.18,0.2],[0.16,0.24],[0,0.24]]));
    const h=horseHead();h.scale(s,s,s);h.translate(0,y,0);W(h);
    for(const z of[-0.105,0.105])D(at(new T.SphereGeometry(0.022,6,5),0.15*s,0.56*s+y,z*s));
    for(let i=0;i<5;i++){const u=i/4;D(at(new T.SphereGeometry(0.035*s,6,5),(-0.07-0.11*u)*s,(0.7-0.42*u)*s+y,0));}};
  switch(t){
    case'P':pawn();break;
    case'R':rook();break;
    case'B':bishop();break;
    case'Q':queen();break;
    case'K':king();break;
    case'N':knight();break;
    case'U':knight();G(at(horn(0,0.28,0.032).rotateZ(-0.9),0.2,0.72,0));break;           // Einhorn: Pferdekopf mit goldenem Horn
    case'W':knight();for(const z of[-1,1]){const w=new T.BoxGeometry(0.02,0.22,0.34);w.rotateX(z*0.6);G(at(w,-0.12,0.55,z*0.18));}break;   // Nachtreiter: Flügel
    case'H':rook();G(horn(0.72,0.3,0.05));break;       // Herzogin: Turm mit Horn
    case'V':bishop(false);G(horn(0.86,0.24,0.035));break;   // Gouverneur: Läufer mit Horn
    case'A':bishop(false);knight(0.42,0.62);break;     // Erzbischof: Läufer mit Pferdekopf
    case'C':rook();knight(0.42,0.6);break;              // Kanzler: Turm mit Pferdekopf
    case'M':queen(false);knight(0.42,0.66);break;       // Amazone: Dame mit Pferdekopf
  }
  for(const p of g)p[0].translate(0,-0.45,0);   // auf den Boden des Feldes stellen
  return g;
}
// ---------- Sternfiguren: sechs kleine Figuren, Füße in der Mitte, in alle sechs Raumrichtungen ----------
function starParts(t){
  const out=[];const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  for(const d of dirs){const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...d));
    const m=new T.Matrix4().compose(new T.Vector3(),q,new T.Vector3(0.5,0.5,0.5));
    for(const[g,k]of chessParts(t)){const c=g.clone();c.translate(0,0.45,0);c.applyMatrix4(m);out.push([c,k]);}}
  return out;
}
// ---------- Raumschiffe (Nase zeigt nach +z, oben ist +y) ----------
// Eigene Entwürfe: glatte Rümpfe und Antriebsgondeln wie im klassischen Raumfahrt-Film, kantige Panzerplatten und Aufbauten wie im Weltraum-Märchen.
// Teile: 'w' Rumpf in Spielerfarbe, 'm' Metall, 'd' dunkle Technik, 'e' Triebwerksglühen, 'c' Cockpitglas, 'l' Fensterlichter, 'g' Gold (Abzeichen).
function shipParts(t){
  const g=[],P=k=>x=>g.push([x,k]),W=P('w'),M=P('m'),D=P('d'),E=P('e'),C=P('c'),L=P('l'),G=P('g');
  const box=(w,h,d,x=0,y=0,z=0)=>at(new T.BoxGeometry(w,h,d),x,y,z);
  const sph=(r,x,y,z,sx=1,sy=1,sz=1,seg=12)=>{const q=new T.SphereGeometry(r,seg,Math.max(6,Math.round(seg*0.6)));q.scale(sx,sy,sz);return at(q,x,y,z);};
  const cyl=(r1,r2,len,x=0,y=0,z=0,seg=12)=>at(new T.CylinderGeometry(r1,r2,len,seg).rotateX(Math.PI/2),x,y,z);   // r1 vorn
  const cone=(r,len,x=0,y=0,z=0,seg=12)=>at(new T.ConeGeometry(r,len,seg).rotateX(Math.PI/2),x,y,z);
  const ring=(r,tube,x=0,y=0,z=0,flat=false)=>{const q=new T.TorusGeometry(r,tube,6,28);if(flat)q.rotateX(Math.PI/2);return at(q,x,y,z);};
  // flache Platte aus einem Umriss in der x-z-Ebene (von oben gesehen), Dicke th, Mitte auf Höhe y
  const plate=(pts,th,y=0,bev=0.01)=>{const sh=new T.Shape();sh.moveTo(pts[0][0],pts[0][1]);for(const p of pts.slice(1))sh.lineTo(p[0],p[1]);sh.closePath();
    const e=new T.ExtrudeGeometry(sh,{depth:th,bevelEnabled:bev>0,bevelThickness:bev,bevelSize:bev,bevelSegments:1,curveSegments:6});e.rotateX(Math.PI/2);e.translate(0,y+th/2,0);return e;};
  // symmetrischer Rumpf: halber Umriss von der Nase (x = 0) über die rechte Seite zum Heck (x = 0)
  const hull=(half,th,y=0,bev=0.012)=>plate(half.concat(half.slice(1,-1).reverse().map(([x,z])=>[-x,z])),th,y,bev);
  const both=f=>{f(1);f(-1);};
  const nozzle=(x,y,z,r)=>{D(cyl(r*0.95,r*1.2,0.06,x,y,z));E(sph(r*0.9,x,y,z-0.035,1,1,0.45));};
  // Antriebsgondel: Körper, glühende Kappe vorn, Leuchtstreifen innen, Düse hinten
  const nacelle=(x,y,z,len,r,side)=>{M(cyl(r,r*1.08,len,x,y,z,14));E(sph(r*0.98,x,y,z+len/2,1,1,0.75));D(ring(r*1.07,0.008,x,y,z+len/2-0.03));
    E(box(0.01,r*0.5,len*0.7,x-side*r*0.95,y,z-0.02));nozzle(x,y,z-len/2-0.02,r*0.85);};
  // nach vorn gepfeilte Jägerflügel mit Waffen an den Spitzen
  const fwings=(sc=1,y=0,z=0)=>both(s=>{const k=v=>v*sc;
    W(plate([[s*k(0.07),z+k(-0.04)],[s*k(0.36),z+k(0.12)],[s*k(0.41),z+k(0.1)],[s*k(0.39),z+k(0.0)],[s*k(0.08),z+k(-0.24)]],0.026*sc,y,0.006));
    D(box(0.012*sc,0.012*sc,0.18*sc,s*k(0.22),y+0.017*sc,z+k(-0.03)));
    M(box(0.02*sc,0.1*sc,0.13*sc,s*k(0.4),y-0.04*sc,z+k(0.05)));
    D(cyl(0.017*sc,0.017*sc,0.3*sc,s*k(0.4),y+0.012*sc,z+k(0.2)));E(sph(0.014*sc,s*k(0.4),y+0.012*sc,z+k(0.355)));});
  const pawn=()=>{
    W(sph(0.15,0,0,0,1,0.78,1.35,16));C(sph(0.085,0,0.05,0.12,1,0.7,1.15));M(ring(0.152,0.022,0,0,-0.02));
    both(s=>{M(cyl(0.045,0.052,0.2,s*0.19,-0.02,-0.06));D(box(0.07,0.025,0.06,s*0.135,-0.02,-0.04));E(sph(0.04,s*0.19,-0.02,-0.165,1,1,0.5));
      L(sph(0.012,s*0.19,-0.02,0.045));});
    nozzle(0,0,-0.2,0.07);D(box(0.13,0.02,0.04,0,-0.06,0.15));
    M(box(0.012,0.14,0.012,0,0.17,-0.06));E(sph(0.018,0,0.245,-0.06));};
  const fighter=()=>{
    W(hull([[0,0.5],[0.055,0.32],[0.085,0.06],[0.1,-0.25],[0.075,-0.37],[0,-0.37]],0.1));
    M(hull([[0,0.26],[0.04,0.06],[0.05,-0.3],[0,-0.3]],0.05,0.07,0.006));C(sph(0.055,0,0.08,0.16,1,0.75,1.9));
    D(box(0.012,0.012,0.16,0,0.04,0.36));fwings();
    both(s=>{M(cyl(0.05,0.056,0.2,s*0.075,0,-0.34));nozzle(s*0.075,0,-0.46,0.048);D(box(0.05,0.05,0.09,s*0.11,-0.025,-0.1));
      D(box(0.03,0.014,0.1,s*0.05,0.075,-0.16));});};
  const needle=()=>{
    W(cone(0.075,0.5,0,0,0.27,14));W(cyl(0.075,0.088,0.42,0,0,-0.19,14));C(sph(0.04,0,0.055,0.12,1,0.6,2.2));
    M(ring(0.17,0.02,0,0,-0.12));E(ring(0.17,0.009,0,0,-0.095));
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const sp=box(0.014,0.095,0.03,0,0.125,-0.12);sp.rotateZ(a);M(sp);
      const f=box(0.012,0.15,0.17,0,0.11,-0.33);f.rotateZ(a+Math.PI/3);W(f);}
    for(const z of[-0.02,-0.22])both(s=>L(sph(0.011,s*0.083,0.02,z)));
    M(cone(0.012,0.12,0,0,0.57));nozzle(0,0,-0.43,0.07);};
  const cruiser=()=>{
    W(hull([[0,0.46],[0.12,0.4],[0.2,0.15],[0.22,-0.3],[0.18,-0.42],[0,-0.42]],0.15));
    M(hull([[0,0.3],[0.1,0.22],[0.15,-0.05],[0.15,-0.32],[0,-0.32]],0.06,0.11,0.006));
    W(box(0.13,0.08,0.11,0,0.18,-0.2));L(box(0.1,0.016,0.012,0,0.19,-0.143));C(box(0.06,0.02,0.02,0,0.215,-0.15));
    D(at(new T.CylinderGeometry(0.07,0.08,0.05,14),0,0.165,0.08));D(box(0.09,0.05,0.07,0,0.2,0.09));
    both(s=>{M(cyl(0.014,0.014,0.24,s*0.028,0.2,0.22,8));
      M(cyl(0.065,0.072,0.36,s*0.28,-0.01,-0.14,14));E(sph(0.05,s*0.28,-0.01,0.04,1,1,0.4));nozzle(s*0.28,-0.01,-0.35,0.06);D(box(0.08,0.03,0.14,s*0.22,-0.01,-0.14));
      for(let i=0;i<4;i++)D(box(0.02,0.045,0.06,s*0.215,0,0.06-i*0.11));
      D(box(0.12,0.07,0.04,s*0.08,0,-0.43));E(sph(0.045,s*0.08,0,-0.455,1.2,0.7,0.4));});
    D(box(0.08,0.05,0.5,0,-0.1,-0.05));};
  const battle=()=>{
    W(hull([[0,0.56],[0.27,-0.3],[0.25,-0.4],[0,-0.4]],0.1));
    M(hull([[0,0.3],[0.1,-0.1],[0.1,-0.34],[0,-0.34]],0.08,0.09,0.006));
    W(box(0.11,0.07,0.12,0,0.165,-0.26));L(box(0.09,0.015,0.01,0,0.175,-0.198));
    both(s=>{M(sph(0.022,s*0.035,0.21,-0.27));
      for(let i=0;i<3;i++)D(box(0.035,0.018,0.05,s*(0.07+i*0.035),0.06,0.1-i*0.13));
      nacelle(s*0.21,-0.13,-0.12,0.42,0.048,s);const py=box(0.03,0.14,0.08,s*0.15,-0.075,-0.16);py.rotateZ(0);
      const q=box(0.03,0.14,0.08,0,0,0);q.rotateZ(s*0.7);q.translate(s*0.15,-0.08,-0.16);D(q);});
    for(const x of[-0.1,0,0.1])nozzle(x,0,-0.43,0.045);D(box(0.012,0.012,0.18,0,0.035,0.42));};
  const flagship=()=>{
    W(sph(0.34,0,0,0.08,1,0.2,1,32));M(ring(0.335,0.02,0,0,0.08,true));
    for(let i=0;i<18;i++){const a=i/18*Math.PI*2;L(box(0.03,0.012,0.012,Math.cos(a)*0.28,0.035,0.08+Math.sin(a)*0.28).rotateY(0));}
    M(sph(0.11,0,0.06,0.08,1,0.55,1,18));C(sph(0.05,0,0.115,0.08,1,0.5,1));E(sph(0.075,0,-0.06,0.08,1,0.35,1));
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2;G(at(new T.ConeGeometry(0.022,0.08,6),Math.cos(a)*0.055,0.15,0.08+Math.sin(a)*0.055));}
    W(cyl(0.085,0.07,0.36,0,-0.09,-0.24,14));E(sph(0.055,0,-0.09,-0.06,1,1,0.5));
    both(s=>{nacelle(s*0.24,-0.03,-0.33,0.36,0.04,s);D(box(0.2,0.025,0.07,s*0.13,-0.06,-0.3));});
    nacelle(0,0.15,-0.37,0.34,0.04,0);D(box(0.025,0.16,0.07,0,0.06,-0.32));};
  switch(t){
    case'P':pawn();break;
    case'N':fighter();break;
    case'B':needle();break;
    case'R':cruiser();break;
    case'Q':battle();break;
    case'K':flagship();break;
    case'U':needle();G(cone(0.026,0.4,0,0,0.62));G(ring(0.08,0.012,0,0,0.0));break;          // Einhorn: Nadel mit goldener Lanze
    case'W':fighter();both(s=>{const w=plate([[s*0.06,-0.1],[s*0.3,-0.02],[s*0.34,-0.08],[s*0.07,-0.28]],0.02,0,0.005);w.rotateZ(s*0.6);w.translate(0,0.06,0);W(w);
      E(sph(0.02,s*0.28,0.22,-0.05));});break;                                                 // Nachtreiter: zweites Flügelpaar
    case'H':cruiser();G(cone(0.035,0.36,0,0.2,0.48));break;                                    // Herzogin
    case'V':needle();G(cone(0.026,0.32,0,0,0.6));fwings(0.55,0,-0.12);break;                   // Gouverneur
    case'A':needle();fwings(0.75,-0.02,-0.08);break;                                           // Erzbischof
    case'C':cruiser();fwings(0.85,-0.06,0.06);break;                                           // Kanzler
    case'M':battle();fwings(0.7,0.06,0.18);break;                                              // Amazone
  }
  return g;
}
const CACHE={};
function geo(style,t){const k=style+t;if(!CACHE[k])CACHE[k]=group(style==='star'?starParts(t):style==='ship'?shipParts(t):chessParts(t));return CACHE[k];}

// ---------- Materialien ----------
const MATS={};
function mat(col,kind,faded){
  const k=col+kind+(faded?'f':'');if(MATS[k])return MATS[k];
  let m;
  if(kind==='g')m=new T.MeshStandardMaterial({color:'#ffd23f',metalness:0.5,roughness:0.3,emissive:'#6a4a00',emissiveIntensity:0.5});
  else if(kind==='d')m=new T.MeshStandardMaterial({color:'#20232b',metalness:0.4,roughness:0.5});
  else if(kind==='e')m=new T.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.05,roughness:0.4});
  else if(kind==='m')m=new T.MeshStandardMaterial({color:'#a9b2bf',metalness:0.6,roughness:0.32});
  else if(kind==='c')m=new T.MeshStandardMaterial({color:'#9fe8ff',emissive:'#1b6f92',emissiveIntensity:0.8,metalness:0.2,roughness:0.08});
  else if(kind==='l')m=new T.MeshStandardMaterial({color:'#fff1c4',emissive:'#ffe7a0',emissiveIntensity:1.3,roughness:0.5});
  else m=new T.MeshStandardMaterial({color:col,metalness:0.25,roughness:0.38});
  if(faded){m.transparent=true;m.opacity=0.14;m.depthWrite=false;}
  return MATS[k]=m;
}
// einzelne Figur als Gruppe (für Animationen)
function object(style,t,col,dir){
  const g=new T.Group(),parts=geo(style,t);
  for(const k in parts){const m=new T.Mesh(parts[k],mat(col,k,false).clone());g.add(m);}
  if(style==='ship'&&dir)g.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...dir).normalize());
  return g;
}

// ---------- Weltraum ----------
// Sternenhimmel: Himmelskarte der NASA (Tycho-2-Sternkatalog mit Milchstraße, NASA Goddard SVS / JPL), aufgehellt
let SPACE=null,PREV=null;
function space(scene,on){
  if(on&&!SPACE){const f=['px','mx','py','my','pz','mz'].map(x=>'img/space/sky_'+x+'.webp');
    SPACE=new T.CubeTextureLoader().load(f,()=>{try{window.dispatchEvent(new Event('r3space'));}catch(e){}});SPACE.encoding=T.sRGBEncoding;}
  if(on){if(scene.background!==SPACE)PREV=scene.background;scene.background=SPACE;}
  else if(SPACE&&scene.background===SPACE)scene.background=PREV;
}
// ---------- Explosion: Funken fliegen auseinander, Lichtblitz ----------
function explosion(scene,pos,col){
  const n=90,g=new T.BufferGeometry(),p=new Float32Array(n*3),v=[];
  for(let i=0;i<n;i++){p.set([pos.x,pos.y,pos.z],i*3);const d=new T.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize().multiplyScalar(0.6+Math.random()*1.8);v.push(d);}
  g.setAttribute('position',new T.BufferAttribute(p,3));
  const pts=new T.Points(g,new T.PointsMaterial({color:'#ffcf6a',size:0.16,transparent:true,opacity:1,blending:T.AdditiveBlending,depthWrite:false}));
  const fc=document.createElement('canvas');fc.width=fc.height=64;const fx=fc.getContext('2d');const gr=fx.createRadialGradient(32,32,2,32,32,32);
  gr.addColorStop(0,'rgba(255,255,220,1)');gr.addColorStop(0.3,'rgba(255,170,60,.8)');gr.addColorStop(1,'rgba(255,60,0,0)');fx.fillStyle=gr;fx.fillRect(0,0,64,64);
  const flash=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(fc),color:col||'#ffffff',transparent:true,blending:T.AdditiveBlending,depthWrite:false}));flash.position.copy(pos);
  scene.add(pts,flash);
  const t0=performance.now(),dur=900;
  return{update(now){const k=Math.min(1,(now-t0)/dur);for(let i=0;i<n;i++){const d=v[i];p[i*3]=pos.x+d.x*k*1.6;p[i*3+1]=pos.y+d.y*k*1.6;p[i*3+2]=pos.z+d.z*k*1.6;}
      g.attributes.position.needsUpdate=true;pts.material.opacity=1-k;const s=0.4+2.6*Math.sin(Math.min(1,k*2.2)*Math.PI/2);flash.scale.set(s,s,1);flash.material.opacity=Math.max(0,1-k*1.4);
      if(k>=1){scene.remove(pts,flash);return false;}return true;}};
}
window.R3={geo,mat,object,space,explosion};
})();
