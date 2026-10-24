// Sternschach-Brett: ein 8 × 8 × 8-Würfel, zum Sterntetraeder gefaltet.
// Würfelecke → Spitze des Sterns, Würfelmitte → Sternmitte, Flächenmitte → Ecke des inneren Oktaeders (Mulde zwischen 4 Spitzen),
// Kantenmitte → Mitte einer Kehle. Jedes Achtel wird in 6 Keile entlang seiner Raumdiagonale zerlegt und gleichmäßig gestreckt
// (ohne Glättung: alle Felder gleich groß, die Oberfläche ist exakt der Stern).
// Jedes Feld hat 6 Flächen; an jeder inneren Kante liegen 4 Felder, an jeder inneren Ecke 8 – die Zugregeln sind die des Raumschachs.
// Felder: 8 Ecken mit Index-Bits a|b<<1|c<<2 (a, b, c = +1 entlang x, y, z). Alle Züge sind als Strahlen (Listen von Feldnummern) vorberechnet:
//  Turm    – durch die Flächen geradeaus        Läufer – über die Kanten (2 Achsen)      Einhorn – über die Ecken (3 Achsen)
//  Springer – 2 + 1 quer                         Nachtreiter – Springersprünge in einer Linie
//  Wurmloch (Option des Gastgebers, SB.setWorm): Wer auf einer Raumdiagonale eines der 8 Mittelfelder erreicht, darf durch den
//  Mittelpunkt in jede der anderen Raumdiagonalen weiterziehen – bis in jede Spitze.
// Brettwahl (window.SB_BRETT, vor diesem Skript gesetzt): '512' gefalteter Würfel · '512z' dazu ein Zentralfeld in der Mitte ·
//  '1016' / '1016z' Variante A (8 Spitzen-Rhomboeder + 6 Zwischenräume), Daten aus lib/sternbrett1016(z).js (tools/stern1016.py).
// Jedes Feld hat F (Flächen als Listen von VP-Indizes) zum Zeichnen; Felder außerhalb der Spitzen haben tip = −1 und d = 99.
(function(G){
'use strict';
const n=4,m=4,N=8,H=4,S=5;          // n, m nur noch für alte Verweise; N Felder je Kante; S = Abstand Mitte–Spitze je Achse
const SIGNS=[[1,1,1],[-1,-1,-1],[1,-1,-1],[-1,1,-1],[-1,-1,1],[-1,1,1],[1,-1,1],[1,1,-1]];
const TIPS=SIGNS.map(s=>s.join());
// Faltung eines Gitterpunkts g ∈ {0..8}³ in den Stern (Spitzen bei ±1)
function fold(g){const s=g.map(v=>v>=H?1:-1),u=g.map(v=>Math.abs(v-H)/H);
  const o=[0,1,2].sort((a,b)=>u[b]-u[a]);const a=u[o[0]],b=u[o[1]],c=u[o[2]];
  const r=[c,c,c];r[o[0]]+=(b-c)*0.5+(a-b);r[o[1]]+=(b-c)*0.5;return r.map((v,k)=>v*s[k]);}
const GI=(x,y,z)=>(x*(N+1)+y)*(N+1)+z;
const PL=[];for(let x=0;x<=N;x++)for(let y=0;y<=N;y++)for(let z=0;z<=N;z++)PL.push(fold([x,y,z]));
// Keine Glättung: Die Faltung ist in jedem Keil affin, darum sind alle 512 Felder exakt gleich groß.
// Die Linien knicken dafür an den Keilgrenzen (Ebenen durch die Raumdiagonale eines Achtels).
const VP=PL.map(p=>p.map(v=>v*S));
// Felder
const CELLS=[],CID=new Int32Array(N*N*N).fill(-1);
const at=(i,j,k)=>(i<0||j<0||k<0||i>=N||j>=N||k>=N)?-1:CID[(i*N+j)*N+k];
for(let ti=0;ti<8;ti++){const s=SIGNS[ti];
  for(let i=0;i<N;i++)for(let j=0;j<N;j++)for(let k=0;k<N;k++){const g=[i,j,k];if(!g.every((v,a)=>(v>=H?1:-1)===s[a]))continue;
    const loc=g.map((v,a)=>s[a]>0?N-1-v:v),v=[];for(let q=0;q<8;q++)v.push(GI(i+(q&1),j+((q>>1)&1),k+((q>>2)&1)));
    const ctr=[0,1,2].map(a=>v.reduce((t,x)=>t+VP[x][a],0)/8);
    const id=CELLS.length;CID[(i*N+j)*N+k]=id;CELLS.push({id,g,v,ctr,tip:ti,loc,d:loc[0]+loc[1]+loc[2]});}}
const NC=CELLS.length;
for(const x of CELLS){const o=[[0,2,6,4],[1,5,7,3],[0,4,5,1],[2,3,7,6],[0,1,3,2],[4,6,7,5]];x.F=o.map(f=>f.map(q=>x.v[q]));}
// Flächen: f = 2·Achse + Seite (0 = −, 1 = +); FV[f] = Ecken-Indizes dieser Fläche
const FV=[];for(let f=0;f<6;f++){const ax=f>>1,sd=f&1;FV.push([0,1,2,3,4,5,6,7].filter(q=>((q>>ax)&1)===sd));}
const DF=[[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]];
const step=(c,d,k)=>{const g=CELLS[c].g;return at(g[0]+d[0]*k,g[1]+d[1]*k,g[2]+d[2]*k);};
const NB=CELLS.map((x,c)=>DF.map((d,f)=>{const y=step(c,d,1);return y<0?null:{c:y,e:f^1};}));
// Richtungen
const DR=[],DB=[],DU=[],DN=[],DK=[];
for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++){const a=[x,y,z].map(Math.abs),nz=a.filter(v=>v).length,mx=Math.max(...a),d=[x,y,z];
  if(mx===1){DK.push(d);if(nz===1)DR.push(d);else if(nz===2)DB.push(d);else DU.push(d);}
  if(mx===2&&nz===2&&a.includes(1))DN.push(d);}
const ray=(c,d)=>{const out=[];for(let k=1;;k++){const y=step(c,d,k);if(y<0)break;out.push(y);}return out;};
const RAY_R=[],RAY_B=[],KN=[],NR=[],KG=[];
for(let c=0;c<NC;c++){
  RAY_R.push(DR.map(d=>ray(c,d)).filter(r=>r.length));
  RAY_B.push(DB.map(d=>ray(c,d)).filter(r=>r.length));
  KN.push(DN.map(d=>step(c,d,1)).filter(y=>y>=0));
  NR.push(DN.map(d=>ray(c,d)).filter(r=>r.length));
  KG.push(DK.map(d=>step(c,d,1)).filter(y=>y>=0));}
// Einhorn – ohne und mit Wurmloch
const isMid=c=>CELLS[c].g.every(v=>v===H-1||v===H);
const MID=CELLS.filter(x=>isMid(x.id)).map(x=>x.id);
const outward=c=>CELLS[c].g.map(v=>v>=H?1:-1);
const ZENT=String(G.SB_BRETT||'')==='512z',CC=ZENT?NC:-1;   // Zentralfeld (nur '512z') bekommt die Nummer 512
function unicornRays(c,worm){const rays=[];
  if(c===CC){for(const y of MID)rays.push([y].concat(ray(y,outward(y))));return rays;}
  for(const d of DU){const out=[];let cur=c,done=false;
    for(;;){const nx=step(cur,d,1);if(nx<0)break;
      const thru=isMid(cur)&&isMid(nx);   // dieser Schritt geht genau durch den Mittelpunkt
      if(worm&&thru){// durch den Mittelpunkt: in jede Raumdiagonale weiter
        const pre=ZENT?out.concat([CC]):out;
        for(const y of MID){if(y===cur||y===c||out.includes(y))continue;rays.push(pre.concat([y],ray(y,outward(y))));}
        done=true;break;}
      if(ZENT&&thru)out.push(CC);
      out.push(nx);cur=nx;}
    if(!done&&out.length)rays.push(out);}
  return rays;}
if(ZENT){   // Zentralfeld: kleines Oktaeder um den Mittelpunkt, grenzt an die 8 Mittelfelder
  const r=0.16,b=VP.length;for(const ax of[0,1,2])for(const sg of[1,-1]){const p=[0,0,0];p[ax]=sg*r*S;VP.push(p);}
  const F=[];for(const sx of[0,1])for(const sy of[2,3])for(const sz of[4,5])F.push([b+sx,b+sy,b+sz]);
  CELLS.push({id:CC,g:null,v:null,F,ctr:[0,0,0],tip:-1,loc:[0,0,0],d:99,center:true});
  RAY_R.push([]);RAY_B.push([]);KN.push([]);NR.push([]);KG.push(MID.slice());
  for(const m of MID){const opp=MID.find(y=>CELLS[y].g.every((v,a)=>v+CELLS[m].g[a]===2*H-1));KG[m]=KG[m].filter(y=>y!==opp);KG[m].push(CC);}}
let RAY_U=CELLS.map((x,c)=>unicornRays(c,false));
// Abstand (Flächenschritte) von der Spitze jeder Ecke – für die Bauern
const DIST=TIPS.map((_,ti)=>{const d=new Array(CELLS.length).fill(1e9);const st=CELLS.findIndex(x=>x.tip===ti&&x.d===0);d[st]=0;const qu=[st];
  for(let i=0;i<qu.length;i++){const c=qu[i];for(const nb of NB[c])if(nb&&d[nb.c]>d[c]+1){d[nb.c]=d[c]+1;qu.push(nb.c);}}return d;});
// Bauern je Spitze: Schritte (mit Doppelschritt-Fortsetzung) und Schlagfelder (schräg vorwärts über eine Kante)
const PSTEP=TIPS.map((_,ti)=>CELLS.map((cl,c)=>{const D=DIST[ti],out=[];if(c===CC)return out;
  for(let f=0;f<6;f++){const nb=NB[c][f];if(!nb||D[nb.c]!==D[c]+1)continue;const n2=NB[nb.c][nb.e^1];out.push([nb.c,n2&&D[n2.c]===D[c]+2?n2.c:-1]);}
  return out;}));
const PCAP=TIPS.map((_,ti)=>CELLS.map((cl,c)=>{const D=DIST[ti];if(c===CC)return[];return RAY_B[c].map(r=>r[0]).filter(x=>D[x]===D[c]+2);}));
// Rückwärts-Tabellen für die Schachprüfung: Feld → [Angreiferfeld, Strahl, Position]
function rev(R){const out=CELLS.map(()=>[]);R.forEach((rays,c)=>rays.forEach(r=>r.forEach((x,i)=>out[x].push([c,r,i]))));return out;}
const revL=L=>{const out=CELLS.map(()=>[]);L.forEach((l,c)=>l.forEach(x=>out[x].push(c)));return out;};
let SB={n,m,N,S,SIGNS,TIPS,GAPS:[],CELLS,NC:CELLS.length,BRETT:ZENT?'512z':'512',CC,VP,NB,FV,MID,RAY_R,RAY_B,RAY_U,KN,NR,KG,DIST,PSTEP,PCAP,
  REV_R:rev(RAY_R),REV_B:rev(RAY_B),REV_U:rev(RAY_U),REV_W:rev(NR),REV_N:revL(KN),REV_K:revL(KG),REV_P:PCAP.map(revL),worm:false,badFaces:0};
// Wurmloch ein- oder ausschalten (Einhorn, Dame und alle Figuren mit Einhorn-Zügen)
SB.setWorm=function(on){on=!!on;if(on===SB.worm)return;SB.worm=on;SB.RAY_U=CELLS.map((x,c)=>unicornRays(c,on));SB.REV_U=rev(SB.RAY_U);};
// ---------- Variante A: 1016 (bzw. 1017) Felder aus den vorberechneten Daten ----------
const D16=G.SB1016;
if(/^1016/.test(String(G.SB_BRETT||''))&&D16){
  const CL=D16.CELLS.map((c,id)=>{const loc=c.l||[0,0,0],tip=c.t;
    return{id,g:null,v:null,F:c.f,ctr:c.c,tip,gap:c.g,kind:c.k,loc,d:tip>=0?loc[0]+loc[1]+loc[2]:99,center:c.k==='zentral'};});
  const n16=CL.length,CC16=CL.findIndex(c=>c.center);
  // Zentralfeld zeichnen: kleiner Oktaederstumpf um den Mittelpunkt (14 Flächen)
  const VP16=D16.VP.slice();
  if(CC16>=0){const r=0.16*S,b=VP16.length,P=[];for(const p of[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]])for(const s1 of[1,-1])for(const s2 of[1,-1]){const v=[0,0,0];v[p[0]]=0;v[p[1]]=s1*r*0.5;v[p[2]]=s2*r;P.push(v.map(x=>+x.toFixed(4)));}
    const uniq=[];for(const q of P)if(!uniq.some(u=>u.every((x,i)=>Math.abs(x-q[i])<1e-6)))uniq.push(q);VP16.push(...uniq);
    const F=[],face=(test,nv)=>{const idx=uniq.map((q,i)=>i).filter(i=>test(uniq[i]));if(idx.length!==nv)return;
      const c=[0,1,2].map(k=>idx.reduce((t,i)=>t+uniq[i][k],0)/idx.length),u=uniq[idx[0]].map((x,k)=>x-c[k]);
      const nrm=Math.hypot(...c),nn=c.map(x=>x/nrm),w=[nn[1]*u[2]-nn[2]*u[1],nn[2]*u[0]-nn[0]*u[2],nn[0]*u[1]-nn[1]*u[0]];
      idx.sort((i,j)=>{const a=uniq[i].map((x,k)=>x-c[k]),bb=uniq[j].map((x,k)=>x-c[k]);
        return Math.atan2(a[0]*w[0]+a[1]*w[1]+a[2]*w[2],a[0]*u[0]+a[1]*u[1]+a[2]*u[2])-Math.atan2(bb[0]*w[0]+bb[1]*w[1]+bb[2]*w[2],bb[0]*u[0]+bb[1]*u[1]+bb[2]*u[2]);});
      F.push(idx.map(i=>b+i));};
    for(const ax of[0,1,2])for(const sg of[1,-1])face(q=>Math.abs(q[ax]-sg*r)<1e-6,4);                       // 6 Quadrate zu den Zwischenräumen
    for(const sx of[1,-1])for(const sy of[1,-1])for(const sz of[1,-1])face(q=>Math.abs(sx*q[0]+sy*q[1]+sz*q[2]-1.5*r)<1e-6,6);   // 8 Sechsecke zu den Spitzen
    CL[CC16].F=F;}
  const KG16=D16.KG,KN16=D16.KN,NR16=KN16.map(l=>l.map(x=>[x]));
  const NB16=CL.map(()=>[]);
  const MID16=D16.MID.slice();
  SB={n,m,N,S,SIGNS,TIPS,GAPS:[],CELLS:CL,NC:n16,BRETT:CC16>=0?'1016z':'1016',CC:CC16,VP:VP16,NB:NB16,FV,MID:MID16,
    RAY_R:D16.R,RAY_B:D16.B,RAY_U:D16.U,KN:KN16,NR:NR16,KG:KG16,DIST:null,PSTEP:D16.PS,PCAP:D16.PC,
    REV_R:rev2(D16.R,n16),REV_B:rev2(D16.B,n16),REV_U:rev2(D16.U,n16),REV_W:rev2(NR16,n16),REV_N:revL2(KN16,n16),REV_K:revL2(KG16,n16),REV_P:D16.PC.map(l=>revL2(l,n16)),worm:false,badFaces:0};
  SB.setWorm=function(on){on=!!on;if(on===SB.worm)return;SB.worm=on;SB.RAY_U=on?D16.UW:D16.U;SB.REV_U=rev2(SB.RAY_U,n16);};
}
function rev2(R,n){const out=Array.from({length:n},()=>[]);R.forEach((rays,c)=>rays.forEach(r=>r.forEach((x,i)=>out[x].push([c,r,i]))));return out;}
function revL2(L,n){const out=Array.from({length:n},()=>[]);L.forEach((l,c)=>l.forEach(x=>out[x].push(c)));return out;}
G.SB=SB;
})(typeof window!=='undefined'?window:globalThis);
