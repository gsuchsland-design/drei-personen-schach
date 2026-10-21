// Sternschach-Brett: ein 8 × 8 × 8-Würfel, zum Sterntetraeder gefaltet.
// Würfelecke → Spitze des Sterns, Würfelmitte → Sternmitte, Flächenmitte → Ecke des inneren Oktaeders (Mulde zwischen 4 Spitzen),
// Kantenmitte → Mitte einer Kehle. Jedes Achtel wird in 6 Keile entlang seiner Raumdiagonale zerlegt und gleichmäßig gestreckt;
// danach werden die inneren Gitterpunkte geglättet (die Oberfläche bleibt exakt der Stern).
// Jedes Feld hat 6 Flächen; an jeder inneren Kante liegen 4 Felder, an jeder inneren Ecke 8 – die Zugregeln sind die des Raumschachs.
// Felder: 8 Ecken mit Index-Bits a|b<<1|c<<2 (a, b, c = +1 entlang x, y, z). Alle Züge sind als Strahlen (Listen von Feldnummern) vorberechnet:
//  Turm    – durch die Flächen geradeaus        Läufer – über die Kanten (2 Achsen)      Einhorn – über die Ecken (3 Achsen)
//  Springer – 2 + 1 quer                         Nachtreiter – Springersprünge in einer Linie
//  Wurmloch (Option des Gastgebers, SB.setWorm): Wer auf einer Raumdiagonale eines der 8 Mittelfelder erreicht, darf durch den
//  Mittelpunkt in jede der anderen Raumdiagonalen weiterziehen – bis in jede Spitze.
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
// Glätten: innere Punkte zum Mittel ihrer 6 Nachbarn, mit 25 % Rückbindung an die gleichmäßige Faltung (sonst werden die Felder zu ungleich)
const X=PL.map(p=>p.slice()),BETA=0.25;
for(let it=0;it<600;it++)for(let x=1;x<N;x++)for(let y=1;y<N;y++)for(let z=1;z<N;z++){const i=GI(x,y,z),nb=[GI(x+1,y,z),GI(x-1,y,z),GI(x,y+1,z),GI(x,y-1,z),GI(x,y,z+1),GI(x,y,z-1)];
  for(let k=0;k<3;k++){let s=0;for(const j of nb)s+=X[j][k];X[i][k]=(1-BETA)*s/6+BETA*PL[i][k];}}
const VP=X.map(p=>p.map(v=>v*S));
// Felder
const CELLS=[],CID=new Int32Array(N*N*N).fill(-1);
const at=(i,j,k)=>(i<0||j<0||k<0||i>=N||j>=N||k>=N)?-1:CID[(i*N+j)*N+k];
for(let ti=0;ti<8;ti++){const s=SIGNS[ti];
  for(let i=0;i<N;i++)for(let j=0;j<N;j++)for(let k=0;k<N;k++){const g=[i,j,k];if(!g.every((v,a)=>(v>=H?1:-1)===s[a]))continue;
    const loc=g.map((v,a)=>s[a]>0?N-1-v:v),v=[];for(let q=0;q<8;q++)v.push(GI(i+(q&1),j+((q>>1)&1),k+((q>>2)&1)));
    const ctr=[0,1,2].map(a=>v.reduce((t,x)=>t+VP[x][a],0)/8);
    const id=CELLS.length;CID[(i*N+j)*N+k]=id;CELLS.push({id,g,v,ctr,tip:ti,loc,d:loc[0]+loc[1]+loc[2]});}}
const NC=CELLS.length;
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
function unicornRays(c,worm){const rays=[];
  for(const d of DU){const out=[];let cur=c,done=false;
    for(;;){const nx=step(cur,d,1);if(nx<0)break;
      if(worm&&isMid(cur)&&isMid(nx)){// durch den Mittelpunkt: in jede Raumdiagonale weiter
        for(const y of MID){if(y===cur||y===c||out.includes(y))continue;rays.push(out.concat([y],ray(y,outward(y))));}
        done=true;break;}
      out.push(nx);cur=nx;}
    if(!done&&out.length)rays.push(out);}
  return rays;}
let RAY_U=CELLS.map((x,c)=>unicornRays(c,false));
// Abstand (Flächenschritte) von der Spitze jeder Ecke – für die Bauern
const DIST=TIPS.map((_,ti)=>{const d=new Array(NC).fill(1e9);const st=CELLS.findIndex(x=>x.tip===ti&&x.d===0);d[st]=0;const qu=[st];
  for(let i=0;i<qu.length;i++){const c=qu[i];for(const nb of NB[c])if(nb&&d[nb.c]>d[c]+1){d[nb.c]=d[c]+1;qu.push(nb.c);}}return d;});
// Bauern je Spitze: Schritte (mit Doppelschritt-Fortsetzung) und Schlagfelder (schräg vorwärts über eine Kante)
const PSTEP=TIPS.map((_,ti)=>CELLS.map((cl,c)=>{const D=DIST[ti],out=[];
  for(let f=0;f<6;f++){const nb=NB[c][f];if(!nb||D[nb.c]!==D[c]+1)continue;const n2=NB[nb.c][nb.e^1];out.push([nb.c,n2&&D[n2.c]===D[c]+2?n2.c:-1]);}
  return out;}));
const PCAP=TIPS.map((_,ti)=>CELLS.map((cl,c)=>{const D=DIST[ti];return RAY_B[c].map(r=>r[0]).filter(x=>D[x]===D[c]+2);}));
// Rückwärts-Tabellen für die Schachprüfung: Feld → [Angreiferfeld, Strahl, Position]
function rev(R){const out=CELLS.map(()=>[]);R.forEach((rays,c)=>rays.forEach(r=>r.forEach((x,i)=>out[x].push([c,r,i]))));return out;}
const revL=L=>{const out=CELLS.map(()=>[]);L.forEach((l,c)=>l.forEach(x=>out[x].push(c)));return out;};
const SB={n,m,N,S,SIGNS,TIPS,GAPS:[],CELLS,NC,VP,NB,FV,MID,RAY_R,RAY_B,RAY_U,KN,NR,KG,DIST,PSTEP,PCAP,
  REV_R:rev(RAY_R),REV_B:rev(RAY_B),REV_U:rev(RAY_U),REV_W:rev(NR),REV_N:revL(KN),REV_K:revL(KG),REV_P:PCAP.map(revL),worm:false,badFaces:0};
// Wurmloch ein- oder ausschalten (Einhorn, Dame und alle Figuren mit Einhorn-Zügen)
SB.setWorm=function(on){on=!!on;if(on===SB.worm)return;SB.worm=on;SB.RAY_U=CELLS.map((x,c)=>unicornRays(c,on));SB.REV_U=rev(SB.RAY_U);};
G.SB=SB;
})(typeof window!=='undefined'?window:globalThis);
