// Sternschach-Brett: exakter Sterntetraeder aus Feldern.
// In jeder der 8 Spitzen steckt ein Rhomboeder (60°) aus n × n × n gleichen Rhomboeder-Feldern; die 8 treffen sich in der Mitte.
// Die Lücken um die 6 Oktaederecken füllen je 4 „Kissen“ aus n × n × m Feldern, die zur Sternoberfläche hin keilförmig werden.
// Felder sind Sechsflächner mit 8 Ecken (Index-Bits a|b<<1|c<<2). Alle Züge werden als Strahlen (Listen von Feldnummern) vorberechnet:
//  Turm   – durch eine Fläche hinein, durch die gegenüberliegende hinaus
//  Läufer – über eine Kante in das gegenüberliegende Feld, weiter über die gegenüberliegende Kante
//  Einhorn– über eine Ecke in das gegenüberliegende Feld, weiter über die gegenüberliegende Ecke
//  Springer – zwei Schritte in eine Richtung, einer quer dazu (Richtungen werden von Feld zu Feld mitgeführt)
(function(G){
'use strict';
const n=3,m=3,S=5;
const SIGNS=[[1,1,1],[-1,-1,-1],[1,-1,-1],[-1,1,-1],[-1,-1,1],[-1,1,1],[1,-1,1],[1,1,-1]];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],len=a=>Math.sqrt(dot(a,a)),nrm=a=>{const l=len(a)||1;return mul(a,1/l);};
const lerp=(a,b,t)=>add(a,mul(sub(b,a),t));
const E3=[[1,0,0],[0,1,0],[0,0,1]];
const VK=new Map(),VP=[];
function vid(p){const k=p.map(v=>Math.round(v*1e5)).join(',');let i=VK.get(k);if(i===undefined){i=VP.length;VP.push(p);VK.set(k,i);}return i;}
const CELLS=[];
function addCell(X,i,j,k,info){const v=[];for(let q=0;q<8;q++)v.push(vid(X(i+(q&1),j+((q>>1)&1),k+((q>>2)&1))));
  info.v=v;info.ctr=X(i+0.5,j+0.5,k+0.5);info.id=CELLS.length;CELLS.push(info);}
// 8 Spitzen
const TIPS=SIGNS.map(s=>s.join());
SIGNS.forEach((s,ti)=>{const T=mul(s,S),h=[0,1,2].map(i=>mul(sub(mul(E3[i],S*s[i]),T),0.5));
  const X=(a,b,c)=>add(T,add(add(mul(h[0],a/n),mul(h[1],b/n)),mul(h[2],c/n)));
  for(let a=0;a<n;a++)for(let b=0;b<n;b++)for(let c=0;c<n;c++)addCell(X,a,b,c,{tip:ti,loc:[a,b,c],d:a+b+c});});
// 6 Zwischenräume zu je 4 Kissen
const GAPS=[];
for(let ax=0;ax<3;ax++)for(const sg of[1,-1]){const gi=GAPS.length;GAPS.push([ax,sg]);const V=mul(E3[ax],S*sg),[p,q]=[0,1,2].filter(i=>i!==ax);
  for(const sp of[1,-1])for(const sq of[1,-1]){const s=[0,0,0];s[ax]=sg;s[p]=sp;s[q]=sq;const T=mul(s,S);
    const Ba=mul(add(V,mul(E3[p],S*sp)),0.5),Bb=mul(add(V,mul(E3[q],S*sq)),0.5),M=mul(add(T,V),0.5);
    const R=(u,v)=>add(mul(Ba,u),mul(Bb,v));
    const Q=(u,v)=>u>=v?add(add(V,mul(sub(Ba,V),u-v)),mul(sub(M,V),v)):add(add(V,mul(sub(Bb,V),v-u)),mul(sub(M,V),u));
    const X=(i,j,k)=>lerp(R(i/n,j/n),Q(i/n,j/n),k/m);
    for(let i=0;i<n;i++)for(let j=0;j<n;j++)for(let k=0;k<m;k++)addCell(X,i,j,k,{gap:gi,pil:TIPS.indexOf(s.join()),loc:[i,j,k]});}}
const NC=CELLS.length;
// ---------- Nachbarschaft über Flächen ----------
const FV=[];for(let f=0;f<6;f++){const ax=f>>1,sd=f&1;FV.push([0,1,2,3,4,5,6,7].filter(q=>((q>>ax)&1)===sd));}
const fkey=(c,f)=>{const s=[...new Set(FV[f].map(q=>CELLS[c].v[q]))].sort((a,b)=>a-b);return s.length>=3?s.join(','):null;};
const FM=new Map();
for(let c=0;c<NC;c++)for(let f=0;f<6;f++){const k=fkey(c,f);if(!k)continue;if(!FM.has(k))FM.set(k,[]);FM.get(k).push([c,f]);}
const NB=CELLS.map(()=>new Array(6).fill(null));let bad=0;
for(const l of FM.values()){if(l.length>2){bad++;continue;}if(l.length===2){const[[a,fa],[b,fb]]=l;NB[a][fa]={c:b,e:fb};NB[b][fb]={c:a,e:fa};}}
// Ecke → Felder
const VC=VP.map(()=>[]);for(let c=0;c<NC;c++)for(const g of new Set(CELLS[c].v))VC[g].push(c);
const faceAdj=(a,b)=>NB[a].some(x=>x&&x.c===b);
// ---------- Strahlen ----------
function rookRay(c,f){const out=[];let cur=c,d=f;const seen=new Set([c]);
  for(;;){const nb=NB[cur][d];if(!nb||seen.has(nb.c))break;out.push(nb.c);seen.add(nb.c);cur=nb.c;d=nb.e^1;if(fkey(cur,d)===null)break;}
  return out;}
// gegenüberliegendes Feld über die Kante (A,B) von Feld c aus
function acrossEdge(c,A,B){const PA=VP[A],PB=VP[B],mid=mul(add(PA,PB),0.5),e=nrm(sub(PB,PA));
  const perp=x=>{const d=sub(x,mid);return nrm(sub(d,mul(e,dot(d,e))));};
  const dc=mul(perp(CELLS[c].ctr),-1);let best=null,bs=0.5;
  for(const x of VC[A]){if(x===c||!CELLS[x].v.includes(B)||faceAdj(c,x))continue;if(!hasEdge(x,A,B))continue;const s=dot(perp(CELLS[x].ctr),dc);if(s>bs){bs=s;best=x;}}
  return best;}
function localEdge(c,A,B){const v=CELLS[c].v;for(let q=0;q<8;q++)for(const b of[1,2,4]){if(q&b)continue;const r=q|b;if((v[q]===A&&v[r]===B)||(v[q]===B&&v[r]===A))return[q,r,b];}return null;}
const hasEdge=(c,A,B)=>!!localEdge(c,A,B);
function bishopRay(c,q,r,b){const out=[];const seen=new Set([c]);let cur=c,A=CELLS[c].v[q],B=CELLS[c].v[r];
  for(;;){if(A===B)break;const x=acrossEdge(cur,A,B);if(x===null||seen.has(x))break;out.push(x);seen.add(x);
    const le=localEdge(x,A,B);if(!le)break;const fl=7^le[2];A=CELLS[x].v[le[0]^fl];B=CELLS[x].v[le[1]^fl];cur=x;}
  return out;}
function acrossVertex(c,Gv){const PG=VP[Gv],dir=nrm(sub(PG,CELLS[c].ctr)),vc=new Set(CELLS[c].v);let best=null,bs=0.75;
  for(const x of VC[Gv]){if(x===c)continue;if(CELLS[x].v.some(g=>g!==Gv&&vc.has(g)))continue;const s=dot(nrm(sub(CELLS[x].ctr,PG)),dir);if(s>bs){bs=s;best=x;}}
  return best;}
function unicornRay(c,q){const out=[];const seen=new Set([c]);let cur=c,Gv=CELLS[c].v[q];
  for(;;){const x=acrossVertex(cur,Gv);if(x===null||seen.has(x))break;out.push(x);seen.add(x);
    const lq=CELLS[x].v.indexOf(Gv);const G2=CELLS[x].v[lq^7];if(G2===Gv)break;Gv=G2;cur=x;}
  return out;}
// Richtung über eine Fläche mitführen: Richtung g von Feld c → Fläche im Nachbarfeld (Eintritt über Fläche e)
function transport(c,f,g,x,e){const ed=FV[f].filter(q=>FV[g].includes(q)).map(q=>CELLS[c].v[q]);
  for(let h=0;h<6;h++){if((h>>1)===(e>>1))continue;const fs=FV[h].map(q=>CELLS[x].v[q]);if(ed.every(v=>fs.includes(v)))return h;}return -1;}
function stepF(c,dirs,k){const nb=NB[c][dirs[k]];if(!nb)return null;const nd=dirs.map((d,j)=>j===k?nb.e^1:transport(c,dirs[k],d,nb.c,nb.e));if(nd.some(d=>d<0))return null;return{c:nb.c,dirs:nd};}
function walk(c,dirs,seq){let st={c,dirs};for(const k of seq){st=stepF(st.c,st.dirs,k);if(!st)return null;}return st;}
const RAY_R=[],RAY_B=[],RAY_U=[],KN=[],NR=[],KG=[];
for(let c=0;c<NC;c++){
  RAY_R.push([0,1,2,3,4,5].map(f=>rookRay(c,f)).filter(r=>r.length));
  const br=[];for(let q=0;q<8;q++)for(const b of[1,2,4]){if(q&b)continue;const r=bishopRay(c,q,q|b,b);if(r.length)br.push(r);}RAY_B.push(br);
  const ur=[];for(let q=0;q<8;q++){const r=unicornRay(c,q);if(r.length)ur.push(r);}RAY_U.push(ur);
  const kn=new Set(),nr=[];
  for(let f1=0;f1<6;f1++)for(let f2=0;f2<6;f2++){if((f1>>1)===(f2>>1))continue;
    for(const seq of[[0,0,1],[1,0,0],[0,1,0]]){const st=walk(c,[f1,f2],seq);if(st&&st.c!==c)kn.add(st.c);}
    // Nachtreiter: Sprung (2,1) wiederholt, Richtungen mitgeführt
    const ch=[];let st={c,dirs:[f1,f2]};const seen=new Set([c]);for(;;){st=walk(st.c,st.dirs,[0,0,1]);if(!st||seen.has(st.c))break;ch.push(st.c);seen.add(st.c);}if(ch.length)nr.push(ch);}
  KN.push([...kn]);NR.push(nr);
  KG.push([...new Set([].concat(RAY_R[c].map(r=>r[0]),RAY_B[c].map(r=>r[0]),RAY_U[c].map(r=>r[0])))]);}
// Abstand (Flächenschritte) von der Spitze jeder Ecke – für die Bauern
const DIST=TIPS.map((_,ti)=>{const d=new Array(NC).fill(1e9);const st=CELLS.findIndex(x=>x.tip===ti&&x.d===0);d[st]=0;const qu=[st];
  for(let i=0;i<qu.length;i++){const c=qu[i];for(const nb of NB[c])if(nb&&d[nb.c]>d[c]+1){d[nb.c]=d[c]+1;qu.push(nb.c);}}return d;});
// Bauern je Spitze: Schritte (mit Doppelschritt-Fortsetzung) und Schlagfelder
const PSTEP=TIPS.map((_,ti)=>CELLS.map((cl,c)=>{const D=DIST[ti],out=[];
  for(let f=0;f<6;f++){const nb=NB[c][f];if(!nb||D[nb.c]!==D[c]+1)continue;const n2=NB[nb.c][nb.e^1];out.push([nb.c,n2&&D[n2.c]===D[c]+2?n2.c:-1]);}
  return out;}));
const PCAP=TIPS.map((_,ti)=>CELLS.map((cl,c)=>{const D=DIST[ti];return[...new Set(RAY_B[c].map(r=>r[0]))].filter(x=>D[x]>=D[c]+2);}));
// Rückwärts-Tabellen für die Schachprüfung: Feld → [Angreiferfeld, Strahl, Position]
function rev(R){const out=CELLS.map(()=>[]);R.forEach((rays,c)=>rays.forEach(r=>r.forEach((x,i)=>out[x].push([c,r,i]))));return out;}
const REV_R=rev(RAY_R),REV_B=rev(RAY_B),REV_U=rev(RAY_U),REV_W=rev(NR);
const revL=L=>{const out=CELLS.map(()=>[]);L.forEach((l,c)=>l.forEach(x=>out[x].push(c)));return out;};
const REV_N=revL(KN),REV_K=revL(KG),REV_P=PCAP.map(revL);
G.SB={n,m,S,SIGNS,TIPS,GAPS,CELLS,NC,VP,NB,FV,RAY_R,RAY_B,RAY_U,KN,NR,KG,DIST,PSTEP,PCAP,REV_R,REV_B,REV_U,REV_W,REV_N,REV_K,REV_P,badFaces:bad};
})(typeof window!=='undefined'?window:globalThis);
