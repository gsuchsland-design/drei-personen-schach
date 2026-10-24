# Erzeugt das Sternschach-Brett „Variante A“ mit 1016 Feldern (bzw. 1017 mit Zentralfeld) als lib/sternbrett1016.js / lib/sternbrett1016z.js.
# 8 Spitzen-Rhomboeder (je 4×4×4) + 6 Zwischenräume mit je 84 Feldern (56 Rhomboeder, 24 geknickte Felder, 4 Achsenfelder).
# Zugregeln: Turm durch die Flächen geradeaus (Achsenfelder sind Kreuzungen), Läufer über die Kanten, Einhorn über die Ecken,
# Mitte als Punkt (Einhorn geradeaus in die gegenüberliegende Spitze) oder als Zentralfeld; Wurmloch als Option.
# Aufruf: python3 tools/stern1016.py   (braucht numpy und scipy)
import sys,os,json,itertools,numpy as np
from collections import defaultdict
sys.path.insert(0,os.path.dirname(__file__))
from stern1016_mesh import build,cells_for
SIGNS=[(1,1,1),(-1,-1,-1),(1,-1,-1),(-1,1,-1),(-1,-1,1),(-1,1,1),(1,-1,1),(1,1,-1)]   # Reihenfolge wie lib/sternbrett.js
SC=5/8   # Spitzen bei ±5 wie im 512er-Brett
NK={};NP=[]
def nid(p):
  k=tuple(int(round(v*2)) for v in p)
  if k not in NK:NK[k]=len(NP);NP.append([v/2 for v in k])
  return NK[k]
C=[]
for ti,t in enumerate(SIGNS):
  V=np.array(t)*8.;E=[np.array([0 if m==0 else -v for m,v in zip(mk,V)])/8 for mk in [(0,1,1),(1,0,1),(1,1,0)]]
  for a,b,c in itertools.product(range(4),repeat=3):
    P=lambda i,j,k:nid(V+(a+i)*E[0]+(b+j)*E[1]+(c+k)*E[2])
    F=[[P(0,0,0),P(0,1,0),P(0,1,1),P(0,0,1)],[P(1,0,0),P(1,0,1),P(1,1,1),P(1,1,0)],
       [P(0,0,0),P(0,0,1),P(1,0,1),P(1,0,0)],[P(0,1,0),P(1,1,0),P(1,1,1),P(0,1,1)],
       [P(0,0,0),P(1,0,0),P(1,1,0),P(0,1,0)],[P(0,0,1),P(0,1,1),P(1,1,1),P(1,0,1)]]
    C.append({'kind':'tip','tip':ti,'gap':-1,'loc':[a,b,c],'faces':F})
X0,PIE,fl=build(False);CC0=cells_for(PIE,'84')
GAPS=[(0,1),(0,-1),(1,1),(1,-1),(2,1),(2,-1)]
def gmap(g,s,p):r=[0,0,0];r[g]=s*p[2];r[(g+1)%3]=p[0];r[(g+2)%3]=p[1];return r
for gi,(g,s) in enumerate(GAPS):
  M=lambda i:nid(gmap(g,s,X0[i]))
  for ck,L in CC0.items():
    faces={}
    for pi in L:
      for f in PIE[pi]['F']:
        k=frozenset(f);faces[k]=None if k in faces else f
    glue=[k for k,v in faces.items() if v is None];F=[v for v in faces.values() if v is not None]
    gedges=set()
    for pi in L:
      for f in PIE[pi]['F']:
        if frozenset(f) in glue:
          for t in range(len(f)):gedges.add(frozenset((f[t],f[(t+1)%len(f)])))
    tris=[f for f in F if len(f)==3];rest=[f for f in F if len(f)!=3];used=set()
    for i,a in enumerate(tris):
      if i in used:continue
      for j,b in enumerate(tris):
        if j<=i or j in used:continue
        sh=set(a)&set(b)
        if len(sh)==2 and frozenset(sh) in gedges:
          oa=[v for v in a if v not in sh][0];ob=[v for v in b if v not in sh][0]
          k=a.index(oa);a2=a[k:]+a[:k];rest.append([a2[0],a2[1],ob,a2[2]]);used|={i,j};break
    rest+=[t for i,t in enumerate(tris) if i not in used]
    kind={'cube':'rh','pA':'knick','pB':'knick','ax':'achse'}[ck[0]]
    C.append({'kind':kind,'tip':-1,'gap':gi,'faces':[[M(i) for i in f] for f in rest]})
N=len(C);NP=np.array(NP)
assert N==1016
FK=defaultdict(list)
for ci,c in enumerate(C):
  c['fk']=[frozenset(f) for f in c['faces']]
  for k in c['fk']:FK[k].append(ci)
assert all(len(v)<=2 for v in FK.values())
VC=defaultdict(set)
for ci,c in enumerate(C):
  c['V']=set().union(*c['fk'])
  for v in c['V']:VC[v].add(ci)
def nbr(ci,fi):
  L=FK[C[ci]['fk'][fi]];o=[x for x in L if x!=ci];return o[0] if o else None
def fidx(ci,k):return C[ci]['fk'].index(k)
def opp(ci,fi):
  f=C[ci]['fk'][fi];r=[j for j,g in enumerate(C[ci]['fk']) if not(g&f)];return r[0] if len(r)==1 else None
FN=[set(x for fi in range(len(C[ci]['fk'])) for x in [nbr(ci,fi)] if x is not None) for ci in range(N)]
def ctr(ci):return NP[list(C[ci]['V'])].mean(0)
def axtype(ci,fi):
  n=nbr(ci,fi);return 'q' if n is not None and C[n]['kind'] in('rh','tip') else 'k'
def faces_with(ci,S):return [j for j,g in enumerate(C[ci]['fk']) if S<=g]
def edges(ci):
  E=set()
  for f in C[ci]['faces']:
    for t in range(len(f)):E.add(frozenset((f[t],f[(t+1)%len(f)])))
  return E
for ci in range(N):C[ci]['E']=edges(ci)
O=NK[(0,0,0)];MID=[i for i in range(N) if O in C[i]['V']]
CEN={i:ctr(i) for i in MID};REF={i:min(MID,key=lambda j:np.linalg.norm(CEN[j]+CEN[i])) for i in MID}
AX4=[i for i in MID if C[i]['kind']=='achse'];TIPC=[i for i in MID if C[i]['kind']=='tip']
CCi=N   # Zentralfeld (nur Variante z)
def diag_edge(x,e):
  cand=set.intersection(*[VC[v] for v in e])-{x}-FN[x];return cand.pop() if len(cand)==1 else None
def diag_vert(x,v):
  cand=VC[v]-{x}-FN[x];cand={z for z in cand if len(C[z]['V']&C[x]['V'])<2};return cand.pop() if len(cand)==1 else None
def far_vertex(z,v):
  fs=faces_with(z,{v})
  if len(fs)!=3:return None
  o=[opp(z,j) for j in fs]
  if None in o:return None
  w=C[z]['fk'][o[0]]&C[z]['fk'][o[1]]&C[z]['fk'][o[2]];return next(iter(w)) if len(w)==1 else None
# ---------- Strahlen ----------
def rook_rays(ci,zent):
  rays=[]
  def go(x,f,path,seen):
    y=nbr(x,f)
    if y is None or y in seen:
      if path:rays.append(path)
      return
    p2=path+[y];s2=seen|{y};ent=fidx(y,C[x]['fk'][f])
    if C[y]['kind']=='achse':
      t=axtype(y,ent);br=[g for g in range(len(C[y]['fk'])) if g!=ent and axtype(y,g)==t]
      for g in br:go(y,g,p2,s2)
      if zent and y in AX4 and CCi not in s2:
        a=REF[y];q=p2+[CCi,a]
        sq=[g for g in range(len(C[a]['fk'])) if axtype(a,g)=='q']
        for g in sq:go(a,g,q,s2|{CCi,a})
      if not br:rays.append(p2)
    else:
      o=opp(y,ent)
      if o is None:rays.append(p2)
      else:go(y,o,p2,s2)
  if ci==CCi:
    for a in AX4:
      for g in range(len(C[a]['fk'])):
        if axtype(a,g)=='q':go(a,g,[a],{CCi,a})
  else:
    for fi in range(len(C[ci]['fk'])):go(ci,fi,[],{ci})
  return rays
def bishop_rays(ci):
  if ci==CCi or C[ci]['kind']=='achse':return []
  rays=[]
  for e in C[ci]['E']:
    x=ci;path=[];seen={ci}
    while True:
      z=diag_edge(x,e)
      if z is None or z in seen:break
      seen.add(z);path.append(z)
      if C[z]['kind']=='achse':break
      fs=faces_with(z,e)
      if len(fs)!=2:break
      o=[opp(z,j) for j in fs]
      if None in o:break
      e2=C[z]['fk'][o[0]]&C[z]['fk'][o[1]]
      if len(e2)!=2:break
      x,e=z,e2
    if path:rays.append(path)
  return rays
def outward(t):   # vom Eckfeld t an der Mitte nach außen bis zur Spitze
  path=[t];x=t;v=far_vertex(t,O)
  while v is not None:
    z=diag_vert(x,v)
    if z is None or z in path:break
    path.append(z)
    if C[z]['kind']=='achse':break
    v=far_vertex(z,v);x=z
  return path
def unicorn_rays(ci,zent,worm):
  if ci==CCi:return [outward(t) for t in TIPC]
  if C[ci]['kind']=='achse':return []
  rays=[]
  for v in C[ci]['V']:
    x=ci;path=[];seen={ci};vv=v;done=False
    while True:
      if vv==O and x in REF:
        pre=path+([CCi] if zent else [])
        if worm:
          for t in TIPC:
            if t!=x:rays.append(pre+outward(t))
          done=True;break
        z=REF[x]
        if zent:path.append(CCi)
      else:z=diag_vert(x,vv)
      if z is None or z in seen:break
      seen.add(z);path.append(z)
      if C[z]['kind']=='achse':break
      w=far_vertex(z,vv)
      if w is None:break
      x,vv=z,w
    if not done and path:rays.append(path)
  return [r for r in rays if r]
def knight_t(ci):
  out=set()
  if ci==CCi or C[ci]['kind']=='achse':return []
  for fi in range(len(C[ci]['fk'])):
    y=nbr(ci,fi)
    if y is None or C[y]['kind']=='achse':continue
    ent=fidx(y,C[ci]['fk'][fi]);o=opp(y,ent)
    if o is not None:
      w=nbr(y,o)
      if w is not None and C[w]['kind']!='achse':
        e2=fidx(w,C[y]['fk'][o]);oo=opp(w,e2)
        for g in range(len(C[w]['fk'])):
          if g not in(e2,oo):
            t=nbr(w,g)
            if t is not None:out.add(t)
    for g in range(len(C[y]['fk'])):
      if g in(ent,o):continue
      y2=nbr(y,g)
      if y2 is None or C[y2]['kind']=='achse':continue
      e2=fidx(y2,C[y]['fk'][g]);oo=opp(y2,e2)
      if oo is not None:
        t=nbr(y2,oo)
        if t is not None:out.add(t)
  out.discard(ci);return sorted(out)
def king_t(ci,zent):
  if ci==CCi:return sorted(MID)
  s=set().union(*[VC[v] for v in C[ci]['V']])-{ci}
  if zent and ci in MID:s={y for y in s if not(y in MID and (C[ci]['V']&C[y]['V'])=={O})}|{CCi}
  return sorted(s)
def face_nb(ci,zent):
  if ci==CCi:return list(MID)
  s=list(FN[ci])
  if zent and ci in MID:s.append(CCi)
  return s
def make(zent):
  n=N+(1 if zent else 0)
  R=[rook_rays(c,zent) for c in range(n)];B=[bishop_rays(c) for c in range(n)]
  U=[unicorn_rays(c,zent,False) for c in range(n)];UW=[unicorn_rays(c,zent,True) for c in range(n)]
  KN=[knight_t(c) for c in range(n)];KG=[king_t(c,zent) for c in range(n)]
  # Bauern: Abstand (Flächenschritte) von der Spitze, Schritt vorwärts (+1), Doppelschritt geradeaus (+2), Schlagen schräg über eine Kante (+2)
  DIST=[];PS=[];PC=[]
  for ti in range(8):
    st=[i for i in range(N) if C[i]['tip']==ti and C[i]['loc']==[0,0,0]][0]
    D=[10**6]*n;D[st]=0;qu=[st]
    for c in qu:
      for y in face_nb(c,zent):
        if D[y]>D[c]+1:D[y]=D[c]+1;qu.append(y)
    ps=[];pc=[]
    for c in range(n):
      st_=[]
      if c!=CCi:
        for fi in range(len(C[c]['fk'])):
          y=nbr(c,fi)
          if y is None or D[y]!=D[c]+1:continue
          y2=-1
          if C[y]['kind']!='achse':
            o=opp(y,fidx(y,C[c]['fk'][fi]))
            if o is not None:
              w=nbr(y,o)
              if w is not None and D[w]==D[c]+2:y2=w
          st_.append([y,y2])
      ps.append(st_);pc.append([r[0] for r in B[c] if D[r[0]]==D[c]+2])
    DIST.append(D);PS.append(ps);PC.append(pc)
  cells=[]
  for i in range(N):
    c=C[i];x={'k':c['kind'],'t':c['tip'],'g':c['gap'],'f':c['faces'],'c':[round(v*SC,4) for v in ctr(i)]}
    if c['tip']>=0:x['l']=c['loc']
    cells.append(x)
  if zent:cells.append({'k':'zentral','t':-1,'g':-1,'f':[],'c':[0,0,0]})
  return {'VP':[[round(v*SC,4) for v in p] for p in NP],'CELLS':cells,'MID':MID,'R':R,'B':B,'U':U,'UW':UW,'KN':KN,'KG':KG,'PS':PS,'PC':PC}
root=os.path.join(os.path.dirname(__file__),'..','lib')
for zent,name in((False,'sternbrett1016.js'),(True,'sternbrett1016z.js')):
  d=make(zent)
  s='// Sternschach-Brett „Variante A“ ('+('1017 Felder mit Zentralfeld' if zent else '1016 Felder')+'), erzeugt von tools/stern1016.py – nicht von Hand ändern.\nwindow.SB1016='+json.dumps(d,separators=(',',':'))+';\n'
  open(os.path.join(root,name),'w').write(s)
  print(name,len(s)//1024,'KB','Felder',len(d['CELLS']),'Strahlen R',sum(len(r) for r in d['R']),'B',sum(len(r) for r in d['B']),'U',sum(len(r) for r in d['U']))
