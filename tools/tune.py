"""Abstimmen der Bewertungsgewichte (AIW) durch Selbstspiel im Browser.

Aufruf:  python3 tools/tune.py spsa  <iterationen>   – SPSA-Abstimmung mit Stufe „mittel“
         python3 tools/tune.py match <stufe> <spiele> – neue Gewichte gegen die alten (1 neu gegen 2 alt)
Benötigt: Playwright mit Chromium; startet selbst einen kleinen Webserver auf Port 8766.
"""
import asyncio, json, random, subprocess, sys, time, os, math
from playwright.async_api import async_playwright

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.environ.get('TUNE_OUT',os.path.join(ROOT,'tools','tune-result.json'))
CHROME=os.environ.get('CHROME','/opt/google/chrome/chrome')
BASE={"opp":0.5,"lead":0,"chk":0.3,"l1":0.9,"l2":0.45,"pchk":0.4,"p0":0.15,"p1":0.6,"castle":0.35,"kmove":0.25,"dev":0.15,
      "pOwn":0.03,"pX":0.12,"pXr":0.04,"earlyQ":0.15,"N":3,"B":3,"R":4,"Q":6}
# abgestimmte Größen und ihre Schrittweite (Rest bleibt fest)
STEP={"opp":0.08,"lead":0.08,"chk":0.12,"l1":0.12,"l2":0.1,"castle":0.12,"kmove":0.1,"dev":0.08,"pX":0.06,"pXr":0.03,"earlyQ":0.08,
      "N":0.3,"B":0.3,"R":0.4,"Q":0.5}
LIMITS={"opp":(0.15,0.9),"lead":(-0.3,0.4),"chk":(0,1.2),"l1":(0.3,1.4),"l2":(0,1),"castle":(0,1),"kmove":(0,0.8),"dev":(0,0.6),
        "pX":(0,0.5),"pXr":(0,0.2),"earlyQ":(0,0.6),"N":(2,4.5),"B":(2,4.5),"R":(3,6.5),"Q":(4.5,9)}

JS_SETUP="""()=>{
  for(const f of ['draw','snd','renderLog','updateCaptured','renderClocks','ask','toast','resizeCanvas'])window[f]=function(){};
  const oe=endGame;endGame=function(w,l){window._win=w;return oe(w,l);};
  window.selfPlay=(ws,lvl,cap,seed)=>{
    let x=seed>>>0||1;const R=Math.random;Math.random=()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};
    try{
      window._win=null;initGame();for(const p of TURN_ORDER)aiPlayers[p]=lvl;paused=true;waitingStart=false;setupOpen=false;
      let n=0;
      while(!gameOver&&n<cap){const p=cur();AIW=ws[p];const m=aiChoose(p,lvl);if(!m)break;castleMap=m.castles||{};doMove(m.from,m.to);if(promoPending)finishPromotion('Q');n++;}
      const res={B:0,G:0,R:0};
      if(window._win)res[window._win]=1;
      else{const sc=TURN_ORDER.map(p=>score(p)),top=Math.max(...sc),w=TURN_ORDER.filter((p,i)=>sc[i]===top);for(const p of w)res[p]=1/w.length;}
      return{res,n,mate:!!window._win};
    }finally{Math.random=R;}
  };
}"""

async def mkpage(b):
    pg=await b.new_page()
    await pg.add_init_script("localStorage.setItem('dreiSchach.lang','de');localStorage.setItem('dreiSchach.tour','1');localStorage.setItem('dreiSchach.diplo','0');")
    await pg.goto('http://127.0.0.1:8766/index.html');await pg.wait_for_timeout(1500)
    await pg.evaluate(JS_SETUP);return pg

PERMS=[('B','G','R'),('B','R','G'),('G','B','R'),('G','R','B'),('R','B','G'),('R','G','B')]

async def play(pg,wa,wb,wc,lvl,cap,seed):
    """drei Gewichtssätze, alle 6 Sitzordnungen → Punkte je Satz"""
    tot=[0,0,0];mates=0;moves=0
    for perm in PERMS:
        ws={perm[0]:wa,perm[1]:wb,perm[2]:wc}
        r=await pg.evaluate("([ws,l,c,s])=>selfPlay(ws,l,c,s)",[ws,lvl,cap,seed]);seed+=7919
        for i,p in enumerate(perm):tot[i]+=r['res'][p]
        mates+=r['mate'];moves+=r['n']
    return tot,mates,moves

def clip(t):
    for k,(lo,hi) in LIMITS.items():t[k]=min(hi,max(lo,t[k]))
    return t

async def spsa(iters):
    srv=subprocess.Popen(['python3','-m','http.server','8766'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
    try:
        async with async_playwright() as pw:
            b=await pw.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
            pages=[await mkpage(b),await mkpage(b)]
            th=dict(BASE);hist=[];t0=time.time();rng=random.Random(42)
            for k in range(iters):
                a=2.0/(k+1+10)**0.6;c=1/(k+1)**0.1   # Lernrate / Störgröße nehmen langsam ab
                d={q:rng.choice([-1,1]) for q in STEP}
                tp=clip({**th,**{q:th[q]+c*STEP[q]*d[q] for q in STEP}})
                tm=clip({**th,**{q:th[q]-c*STEP[q]*d[q] for q in STEP}})
                seed=1000+k*101
                res=await asyncio.gather(play(pages[0],tp,tm,th,'medium',300,seed),play(pages[1],tm,tp,th,'medium',300,seed))
                sp=res[0][0][0]+res[1][0][1];sm=res[0][0][1]+res[1][0][0];sb=res[0][0][2]+res[1][0][2]
                g=(sp-sm)/12   # Punktedifferenz je Partie
                for q in STEP:th[q]+=a*g*STEP[q]*d[q]/(c*STEP[q])*STEP[q]
                clip(th)
                hist.append({'k':k,'plus':sp,'minus':sm,'base':sb,'mates':res[0][1]+res[1][1],'moves':res[0][2]+res[1][2]})
                if k%5==4 or k==iters-1:
                    json.dump({'theta':th,'hist':hist,'secs':time.time()-t0},open(OUT,'w'),indent=1)
                    print(k+1,f'{time.time()-t0:.0f}s',{q:round(v,3) for q,v in th.items() if q in STEP},flush=True)
            await b.close()
    finally:srv.terminate()

async def match(lvl,games):
    th=json.load(open(OUT))['theta']
    srv=subprocess.Popen(['python3','-m','http.server','8766'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
    try:
        async with async_playwright() as pw:
            b=await pw.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
            pages=[await mkpage(b),await mkpage(b)]
            tot_new=tot_old=n=0;mates=0;t0=time.time();seed=int(os.environ.get('SEED','777'))
            while n<games:
                res=await asyncio.gather(*[play(pg,th,BASE,BASE,lvl,300,seed+i*99991) for i,pg in enumerate(pages)])
                seed+=3
                for (t,m,mv) in res:tot_new+=t[0];tot_old+=t[1]+t[2];n+=6;mates+=m
                print(f'{n} Partien, {time.time()-t0:.0f}s: neu {tot_new:.1f} Punkte = {tot_new/n:.3f} je Partie (Gleichstand wäre 0,333), Matt-Ende {mates}/{n}',flush=True)
            json.dump({'level':lvl,'games':n,'new_share':tot_new/n,'mates':mates},open(OUT.replace('.json',f'-match-{lvl}.json'),'w'))
            await b.close()
    finally:srv.terminate()

if __name__=='__main__':
    if sys.argv[1]=='spsa':asyncio.run(spsa(int(sys.argv[2])))
    else:asyncio.run(match(sys.argv[2],int(sys.argv[3])))
