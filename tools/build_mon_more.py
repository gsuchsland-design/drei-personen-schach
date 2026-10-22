"""Baut die zusätzlichen Monstersprüche (tools/mon_more_de.py) in alle Sprachdateien ein.
Übersetzungen: tools/mon_more_tr/<sprache>.txt – eine Zeile je Spruch, gleiche Reihenfolge wie FLAT()."""
import sys,os,json,re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0,os.path.join(ROOT,'tools'));from mon_more_de import MORE
def FLAT():
    de=[]
    for id in 'BGRYLTOI':
        for e in ['happy','angry','excited','fear']: de+=MORE[id]['lines'][e]
        for k in ['propose','accept','decline','betray','betrayed','pactEnd','revenge','bluff']: de+=MORE[id]['dl'][k]
    return de
de=FLAT();MARK='// mon_more (tools/build_mon_more.py)'
for f in sorted(os.listdir(os.path.join(ROOT,'tools','mon_more_tr'))):
    lg=f[:-4];L=open(os.path.join(ROOT,'tools','mon_more_tr',f),encoding='utf-8').read().rstrip('\n').split('\n')
    assert len(L)==len(de),lg
    P=os.path.join(ROOT,'lib','lang',lg+'.js');s=open(P,encoding='utf-8').read()
    s=re.sub(r'\n'+re.escape(MARK)+r'\n.*?\n(?=\n|$)','',s,flags=re.S).rstrip('\n')+'\n'
    s+='\n'+MARK+'\nObject.assign(window.I18N,'+json.dumps(dict(zip(de,L)),ensure_ascii=False)+');\n'
    open(P,'w',encoding='utf-8').write(s)
    print(lg,len(L))
