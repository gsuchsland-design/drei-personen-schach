# Felder im Zwischenraum oben (Achse +z). Jedes Viertel ist in den Koordinaten (a,b,c) des benachbarten Spitzen-Rhomboeders
# die Eckpyramide 0 <= a,b <= c <= 4 (ein Drittel eines 4x4x4-Rhomboeders, 21 1/3 Felder).
import numpy as np, itertools, json
from scipy.spatial import ConvexHull
QS=[(1,1),(-1,1),(-1,-1),(1,-1)]
def phys(q,abc):
  sx,sy=q;a,b,c=abc;return np.array([sx*(c-b),sy*(c-a),8-a-b],float)
def pieces_quadrant(split):
  P=[]   # (kind,label,vertices abc)
  for k in range(1,5):
    for i in range(k):
      for j in range(k):
        V=[(a,b,c) for a in(i,i+1) for b in(j,j+1) for c in(k-1,k)]
        if i<=k-2 and j<=k-2: P.append(('cube',(i,j,k),V))
        elif i==k-1 and j<=k-2: P.append(('pA',(j,k),[v for v in V if v[0]<=v[2]]))
        elif j==k-1 and i<=k-2: P.append(('pB',(i,k),[v for v in V if v[1]<=v[2]]))
        else:
          m=(k-.5,k-.5,k-.5)
          if split=='80' and k==4:
            P.append(('axA',k,[(3,3,3),(3,3,4),(4,4,4),(4,3,4)]))   # Hälfte a>=b -> zum Knickfeld pA (j=2)
            P.append(('axB',k,[(3,3,3),(3,3,4),(4,4,4),(3,4,4)]))
          elif split=='80':
            P.append(('ax',k,[v for v in V if max(v[0],v[1])<=v[2]]))
          elif split:
            P.append(('axU',k,[(k-1,k-1,k-1),(k-1,k-1,k),(k,k-1,k),(k-1,k,k),m]))
            P.append(('axL',k,[(k,k-1,k),(k-1,k,k),(k,k,k),m]))
          else: P.append(('ax',k,[v for v in V if max(v[0],v[1])<=v[2]]))
  return P
def build(split):
  nodes={};flags={}
  def nid(p,abc):
    key=tuple(np.round(p,4));
    if key not in nodes:nodes[key]=len(nodes);flags[nodes[key]]=set()
    n=nodes[key];a,b,c=abc
    if abs(c-4)<1e-9:flags[n].add('fix')
    sx,sy=CURQ[0]
    # Sternoberfläche: a=0 bzw. b=0 -> Ebene mit Normale (Ableitung der Abbildung)
    if abs(a)<1e-9:flags[n].add(('pl',tuple(np.round(np.cross([-sx,0,-1],[sx,sy,0]),6))))
    if abs(b)<1e-9:flags[n].add(('pl',tuple(np.round(np.cross([0,-sy,-1],[sx,sy,0]),6))))
    return n
  pieces=[]
  global CURQ
  for q in QS:
    CURQ=[q]
    for kind,lab,V in pieces_quadrant(split):
      A=np.array(V,float);ids=[nid(phys(q,v),v) for v in V]
      h=ConvexHull(A);  # Facetten zu Polygonen zusammenfassen
      faces={}
      for s,eq in zip(h.simplices,h.equations):
        k=tuple(np.round(eq,6));faces.setdefault(k,set()).update(s)
      F=[]
      for eq,S in faces.items():
        S=list(S);n=np.array(eq[:3]);ctr=A[S].mean(0)
        u=A[S[0]]-ctr;u/=np.linalg.norm(u);w=np.cross(n,u)
        S.sort(key=lambda s:np.arctan2((A[s]-ctr)@w,(A[s]-ctr)@u))   # gegen den Uhrzeigersinn um die Außennormale (in abc)
        F.append([ids[s] for s in S])
      # Orientierung physikalisch: Spiegelung (sx*sy<0) dreht die Orientierung
      if q[0]*q[1]<0: F=[f[::-1] for f in F]
      pieces.append({'kind':kind,'lab':lab,'q':q,'F':F})
  X=np.zeros((len(nodes),3))
  for k,i in nodes.items():X[i]=k
  return X,pieces,flags
def cellkey(p,variant):
  k,lab,q=p['kind'],p['lab'],p['q']
  if k=='cube':
    i,j,kk=lab
    if variant=='80' and i==j==kk-2 and kk-1<=3: pass
    return ('cube',q,lab)
  if k=='pA': return ('pA',q[0],lab)        # Spiegelpaar über y=0: gleiches sx
  if k=='pB': return ('pB',q[1],lab)        # über x=0: gleiches sy
  if k=='ax': return ('ax',lab)
  if k=='axU': return ('axU',lab)
  if k=='axL': return ('axL',lab)
def cells_for(pieces,variant):
  C={}
  for i,p in enumerate(pieces):
    ck=cellkey(p,variant)
    if variant=='80':
      if p['kind']=='ax': k=p['lab'];ck=('cube',p['q'],(k-1,k-1,k+1))      # Eckpyramide zum Würfel direkt darüber
      if p['kind']=='axA': ck=('pA',p['q'][0],(2,4))
      if p['kind']=='axB': ck=('pB',p['q'][1],(2,4))
    C.setdefault(ck,[]).append(i)
  if variant=='80':   # Eckpyramiden der Schicht 4 je zur Hälfte an die beiden angrenzenden Knickfelder
    pass
  return C
def vol_poly(X,F):
  v=0.
  for f in F:
    P=X[f];c=P.mean(0)
    for t in range(len(f)):v+=np.dot(c,np.cross(P[t],P[(t+1)%len(f)]))
  return v/6
if __name__=='__main__':
  for v,split in(('84',False),('88',True),('80','80')):
    X,P,fl=build(split);C=cells_for(P,v)
    cv=sorted(round(sum(vol_poly(X,P[i]['F']) for i in L)/2,4) for L in C.values())
    from collections import Counter
    print(v,'cells',len(C),Counter(cv))
