"""Baut fehlende Übersetzungen (tools/i18n_fix_de.json + tools/i18n_fix/<sprache>.txt) in lib/lang/<sprache>.js ein.
Eine Zeile je Text in derselben Reihenfolge; endet der deutsche Text auf ein Leerzeichen, wird es übernommen. Mehrfach ausführbar."""
import os,json,re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
de=json.load(open(os.path.join(ROOT,'tools','i18n_fix_de.json'),encoding='utf-8'));MARK='// i18n_fix (tools/build_i18n_fix.py)'
bad=0
for f in sorted(os.listdir(os.path.join(ROOT,'tools','i18n_fix'))):
    lg=f[:-4];L=open(os.path.join(ROOT,'tools','i18n_fix',f),encoding='utf-8').read().rstrip('\n').split('\n')
    if len(L)!=len(de):print(lg,'Zeilen',len(L),'statt',len(de));bad=1;continue
    d={}
    for k,v in zip(de,L):
        if sorted(re.findall(r'\{\d\}',k))!=sorted(re.findall(r'\{\d\}',v)):print(lg,'Platzhalter',k[:40],'|',v[:40]);bad=1
        d[k]=v.rstrip()+(' ' if k.endswith(' ') else '')
    for nm in (lg+'.js','v-'+lg+'.js'):   # Drei-Personen-Schach lädt beide, die anderen Spiele nur v-*.js
        P=os.path.join(ROOT,'lib','lang',nm);s=open(P,encoding='utf-8').read()
        s=re.sub(r'\n'+re.escape(MARK)+r'\n.*?\n(?=\n|$)','',s,flags=re.S).rstrip('\n')+'\n'
        s+='\n'+MARK+'\nObject.assign(window.I18N,'+json.dumps(d,ensure_ascii=False)+');\n'
        open(P,'w',encoding='utf-8').write(s)
print('fertig' if not bad else 'FEHLER')
