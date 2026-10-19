"""Misst das Gegner-Lernen: Ein simulierter Mensch (Rot) mit fester Gewohnheit spielt gegen zwei Computer.
Blau (stark) spielt einmal mit, einmal ohne Lernen – gleiche Zufallsfolgen, Punkte von Blau werden verglichen.

Aufruf: python3 tools/opp_test.py <partien> [leader|computer]
Gewohnheit „leader“: Rot schlägt bevorzugt den Führenden. (Bei zwei Computern als Gegner greift nur dieses Merkmal.)
"""
import asyncio, json, subprocess, sys, time, os
from playwright.async_api import async_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME=os.environ.get('CHROME','/opt/google/chrome/chrome')
JS="""()=>{
  for(const f of ['draw','snd','renderLog','updateCaptured','renderClocks','ask','toast','resizeCanvas','speakMonster'])window[f]=function(){};
  const oe=endGame;endGame=function(w,l){window._win=w;return oe(w,l);};
  window.runGames=(learn,n,seed0,cap)=>{
    OPP.on=learn;OPP.prof={};DIPLO.on=false;
    let pts=0,mates=0,moves=0;
    for(let g=0;g<n;g++){
      let x=(seed0+g*7919)>>>0||1;const R=Math.random;Math.random=()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};
      try{
        window._win=null;initGame();aiPlayers={B:'hard',G:'medium',R:null};paused=true;waitingStart=false;setupOpen=false;
        let k=0;
        while(!gameOver&&k<cap){
          const p=cur();let m;
          if(p==='R'){   // simulierter Mensch: Bewertung „mittel“ + Jagd auf den Führenden
            const ms=allLegalMoves('R');if(!ms.length)break;
            const sc=q=>scoreIn(gameState,q),lead=sc('B')>=sc('G')?'B':'G';
            let bv=-1e9;
            for(const mv of ms){const ns=mv.castle?applyCastle(gameState,mv.from,mv.castle):applyMove(gameState,mv.from,mv.to,epTarget);
              let v=evalAfter('R',ns,mv)+Math.random()*0.12;const vic=gameState[mv.to];
              if(vic&&vic.player!=='R')v+=vic.player===lead?1.2*VALUE[vic.piece]:-0.6*VALUE[vic.piece];
              if(v>bv){bv=v;m=mv;}}
          }else m=aiChoose(p,aiPlayers[p]);
          if(!m)break;castleMap=m.castles||{};doMove(m.from,m.to);if(promoPending)finishPromotion('Q');k++;
        }
        moves+=k;
        if(window._win){mates++;if(window._win==='B')pts+=1;}
        else{const s=TURN_ORDER.map(q=>score(q)),t=Math.max(...s),w=TURN_ORDER.filter((q,i)=>s[i]===t);if(w.includes('B'))pts+=1/w.length;}
      }finally{Math.random=R;}
    }
    return{pts,mates,moves,prof:OPP.prof};
  };
}"""
async def main(n):
    srv=subprocess.Popen(['python3','-m','http.server','8767'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
    try:
        async with async_playwright() as pw:
            b=await pw.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
            async def page():
                pg=await b.new_page()
                await pg.add_init_script("localStorage.setItem('dreiSchach.lang','de');localStorage.setItem('dreiSchach.tour','1');localStorage.setItem('dreiSchach.diplo','0');localStorage.setItem('dreiSchach.name','Testmensch');")
                await pg.goto('http://127.0.0.1:8767/index.html');await pg.wait_for_timeout(1500);await pg.evaluate(JS);return pg
            p1,p2=await page(),await page()
            t0=time.time()
            on,off=await asyncio.gather(p1.evaluate("([n])=>runGames(true,n,4242,300)",[n]),p2.evaluate("([n])=>runGames(false,n,4242,300)",[n]))
            print(json.dumps({'games':n,'secs':round(time.time()-t0),'blue_points_with_learning':on['pts'],'blue_points_without':off['pts'],
              'mates':[on['mates'],off['mates']],'profile':on['prof']},ensure_ascii=False))
    finally:srv.terminate()
asyncio.run(main(int(sys.argv[1]) if len(sys.argv)>1 else 40))
