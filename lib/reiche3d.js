// Schach der 6 Reiche – 3D-Figuren: gedrechselte Schachfiguren, Sternfiguren, Raumschiffe; Weltraum-Hintergrund und Explosionen.
// Jede Figur besteht aus wenigen Teilen nach Materialart: 'w' Körper in Spielerfarbe, 'd' dunkel, 'g' Gold, 'e' leuchtend (Triebwerke).
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
// ---------- Raumschiffe (Nase zeigt nach +z) ----------
function shipParts(t){
  const g=[],W=x=>g.push([x,'w']),D=x=>g.push([x,'d']),E=x=>g.push([x,'e']),G=x=>g.push([x,'g']);
  const cone=(r,len,seg=10)=>new T.ConeGeometry(r,len,seg).rotateX(Math.PI/2);
  const cyl=(r1,r2,len,seg=10)=>new T.CylinderGeometry(r1,r2,len,seg).rotateX(Math.PI/2);
  const wings=(span,z=0,y=0,sweep=0.25,th=0.025)=>{const s=new T.Shape();s.moveTo(0,0.12);s.lineTo(span,-sweep);s.lineTo(span,-sweep-0.08);s.lineTo(0,-0.12);s.closePath();
    for(const m of[1,-1]){const e=new T.ExtrudeGeometry(s,{depth:th,bevelEnabled:false});e.rotateX(-Math.PI/2);e.scale(m,1,1);e.translate(0,y,z);W(e);}};
  const engine=(x,y,z,r=0.05)=>{D(at(cyl(r*1.25,r*1.25,0.12),x,y,z));E(at(new T.SphereGeometry(r,8,6),x,y,z-0.07));};
  const fighter=()=>{W(at(cone(0.11,0.62),0,0,0.08));W(at(cyl(0.11,0.09,0.2),0,0,-0.32));D(at(new T.SphereGeometry(0.07,10,8),0,0.07,0.08));wings(0.32,-0.15,0,0.22);engine(0,0,-0.45,0.07);};
  const needle=()=>{W(at(cone(0.075,0.8),0,0,0.05));for(let i=0;i<4;i++){const f=new T.BoxGeometry(0.02,0.16,0.18);f.translate(0,0.08,0);f.rotateZ(i*Math.PI/2);D(at(f,0,0,-0.28));}engine(0,0,-0.38,0.055);};
  const cruiser=()=>{W(at(new T.BoxGeometry(0.34,0.2,0.7),0,0,0));W(at(cone(0.17,0.2,4).rotateZ(Math.PI/4),0,0,0.45));D(at(new T.BoxGeometry(0.16,0.12,0.22),0,0.15,-0.12));
    for(const x of[-0.22,0.22]){D(at(cyl(0.07,0.07,0.5),x,-0.02,-0.08));E(at(new T.SphereGeometry(0.06,8,6),x,-0.02,-0.35));}};
  const battle=()=>{W(at(cone(0.2,0.7),0,0,0.12));W(at(cyl(0.2,0.16,0.3),0,0,-0.35));wings(0.42,-0.15,0,0.3,0.03);D(at(new T.BoxGeometry(0.12,0.14,0.3),0,0.17,-0.05));
    for(const x of[-0.12,0,0.12])engine(x,0,-0.52,0.05);G(at(new T.TorusGeometry(0.2,0.015,6,20),0,0,-0.2));};
  switch(t){
    case'P':W(new T.SphereGeometry(0.16,12,10));D(at(new T.TorusGeometry(0.2,0.03,6,16),0,0,0).rotateX(Math.PI/2));E(at(new T.SphereGeometry(0.06,8,6),0,0,-0.17));G(at(cone(0.04,0.12),0,0,0.2));break;
    case'N':fighter();break;
    case'B':needle();break;
    case'R':cruiser();break;
    case'Q':battle();break;
    case'K':{const s=new T.SphereGeometry(0.38,24,12);s.scale(1,0.28,1);W(s);D(at(new T.SphereGeometry(0.15,12,8,0,Math.PI*2,0,Math.PI/2),0,0.06,0));
      for(let i=0;i<10;i++){const a=i/10*Math.PI*2;E(at(new T.SphereGeometry(0.035,6,5),Math.cos(a)*0.33,-0.02,Math.sin(a)*0.33));}
      for(let i=0;i<5;i++){const a=i/5*Math.PI*2;G(at(new T.ConeGeometry(0.03,0.12,6),Math.cos(a)*0.09,0.25,Math.sin(a)*0.09));}break;}
    case'U':needle();G(at(cone(0.03,0.38),0,0,0.6));break;                       // Einhorn: Nadel mit goldenem Horn
    case'W':fighter();wings(0.26,-0.05,0.08,0.18);E(at(new T.SphereGeometry(0.04,6,5),0.3,0,-0.25));E(at(new T.SphereGeometry(0.04,6,5),-0.3,0,-0.25));break;   // Nachtreiter
    case'H':cruiser();G(at(cone(0.04,0.4),0,0,0.72));break;
    case'V':needle();G(at(cone(0.03,0.32),0,0,0.58));wings(0.18,-0.1,0,0.15);break;
    case'A':needle();wings(0.3,-0.12,0,0.2);break;
    case'C':cruiser();wings(0.36,-0.1,0,0.15);break;
    case'M':battle();wings(0.3,0.15,0.1,0.2,0.02);break;
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
  else if(kind==='e')m=new T.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.6,roughness:0.4});
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
    SPACE=new T.CubeTextureLoader().load(f);SPACE.encoding=T.sRGBEncoding;}
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
