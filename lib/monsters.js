// Monster-Avatare für die Schachvarianten – Zeichnungen aus dem Drei-Personen-Schach (Blob, Oger, Flamme, Mensch).
// MON.paint(ctx,p,kind,col,emo,t,line,lineAge) zeichnet ein 320 × 240-Bild. © 2026 Guido Suchsland
(function(){
const AV_W=320,AV_H=240;
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=(n>>8)&255,b=n&255;
  const m=f<0?0:255,k=Math.abs(f);r=Math.round(r+(m-r)*k);g=Math.round(g+(m-g)*k);b=Math.round(b+(m-b)*k);return`rgb(${r},${g},${b})`;}
function roundRect(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}
function drawBubble(x,txt,col,age){
  if(age>3.2&&!/!$/.test(txt)&&age>6)return;
  x.font='bold 17px sans-serif';const w=Math.min(AV_W-20,x.measureText(txt).width+22),h=30;
  const bx=AV_W-w-10,by=10,pop=Math.min(1,age*6);
  x.save();x.translate(bx+w/2,by+h/2);x.scale(pop,pop);x.translate(-(bx+w/2),-(by+h/2));
  x.fillStyle='#fff';roundRect(x,bx,by,w,h,12);x.fill();
  x.beginPath();x.moveTo(bx+24,by+h);x.lineTo(bx+12,by+h+12);x.lineTo(bx+38,by+h);x.fill();
  x.fillStyle='#111';x.textBaseline='middle';x.fillText(txt,bx+11,by+h/2+1,w-18);x.textBaseline='alphabetic';
  x.restore();
}
function drawSparkles(x,t,confetti){
  for(let i=0;i<(confetti?22:9);i++){
    const k=i*137.5,px=(Math.sin(k)*0.5+0.5)*AV_W,py=((t/1000*(confetti?90:40)+k*3)%AV_H);
    x.save();x.translate(px,confetti?py:30+((k*7)%120));x.rotate(t/400+i);
    x.fillStyle=confetti?['#ffd23f','#ff5bd0','#4fe0ff','#7dff6a','#fff'][i%5]:'#ffe35c';
    if(confetti)x.fillRect(-4,-2,8,4);
    else{x.globalAlpha=0.5+0.5*Math.sin(t/150+i);x.beginPath();for(let j=0;j<5;j++){const an=j*Math.PI*2/5-Math.PI/2;x.lineTo(Math.cos(an)*8,Math.sin(an)*8);x.lineTo(Math.cos(an+0.63)*3.4,Math.sin(an+0.63)*3.4);}x.fill();}
    x.restore();
  }
}
function drawSteam(x,t){
  for(let i=0;i<4;i++){const ph=((t/700)+i/4)%1;x.fillStyle=`rgba(255,255,255,${0.5*(1-ph)})`;
    x.beginPath();x.arc(AV_W/2+(i%2?52:-52)+Math.sin(ph*6)*6,70-ph*55,8+ph*10,0,Math.PI*2);x.fill();}
}
function drawSweat(x,t){
  const ph=(t/900)%1;x.fillStyle='rgba(140,210,255,.9)';
  x.beginPath();const sx=AV_W/2+62,sy=78+ph*40;x.moveTo(sx,sy-10);x.quadraticCurveTo(sx+8,sy+2,sx,sy+6);x.quadraticCurveTo(sx-8,sy+2,sx,sy-10);x.fill();
}
// ---------- Realistischere Darstellung: Licht von oben links, Schattierung, Haut/Fell/Flammen ----------
const RND=(()=>{let s=48271;const a=[];for(let i=0;i<800;i++){s=(s*16807)%2147483647;a.push(s/2147483647);}return a;})();
// Kugel-Licht: heller Fleck oben links, dunkle Ränder
function volFill(x,col,cx,cy,r,hi=0.42,lo=-0.6){
  const g=x.createRadialGradient(cx-r*0.38,cy-r*0.45,r*0.04,cx,cy,r*1.2);
  g.addColorStop(0,shade(col,hi));g.addColorStop(0.42,col);g.addColorStop(0.85,shade(col,lo*0.6));g.addColorStop(1,shade(col,lo));
  return g;
}
// Randlicht unten rechts und Schattenkante oben – aufrufen, solange der Körperpfad aktuell ist
function rimLight(x,w,h,alpha=0.28){
  x.save();x.clip();
  const g=x.createLinearGradient(-w*0.5,-h*0.5,w*0.5,h*0.5);
  g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(0.7,'rgba(255,255,255,0)');g.addColorStop(1,`rgba(255,240,220,${alpha})`);
  x.strokeStyle=g;x.lineWidth=14;x.stroke();
  x.restore();
}
// Auge: Augapfel mit Schattierung, farbige Iris, Pupille, Glanzlichter, Lidschatten
function eye(x,cx,cy,r,emo,t,blink,look=0,iris='#6b4a1e'){
  x.save();x.translate(cx,cy);
  if(emo==='happy'||emo==='cheer'){
    x.strokeStyle='rgba(0,0,0,.25)';x.lineWidth=r*0.5;x.lineCap='round';x.beginPath();x.arc(0,r*0.3,r*0.75,Math.PI*1.1,Math.PI*1.9);x.stroke();
    x.strokeStyle='#1a1010';x.lineWidth=r*0.3;x.beginPath();x.arc(0,r*0.25,r*0.75,Math.PI*1.1,Math.PI*1.9);x.stroke();x.restore();return;}
  if(emo==='cry'){x.strokeStyle='#1a1010';x.lineWidth=r*0.3;x.lineCap='round';x.beginPath();x.arc(0,-r*0.35,r*0.7,Math.PI*0.15,Math.PI*0.85);x.stroke();
    const ph=(t/600)%1;
    for(const s of [-1,1]){const tx=s*r*0.55,ty=r*0.4+ph*r*2.4;
      const tg=x.createRadialGradient(tx-r*0.06,ty-r*0.1,0,tx,ty,r*0.32);tg.addColorStop(0,'rgba(255,255,255,.95)');tg.addColorStop(0.4,'rgba(150,215,255,.9)');tg.addColorStop(1,'rgba(70,150,230,.85)');
      x.fillStyle=tg;x.beginPath();x.ellipse(tx,ty,r*0.18,r*0.3,0,0,Math.PI*2);x.fill();}
    x.restore();return;}
  const big=emo==='fear'||emo==='excited'?1.15:1,R=r*big;
  // Augenhöhle
  x.fillStyle='rgba(0,0,0,.28)';x.beginPath();x.ellipse(0,R*0.08,R*1.22,R*1.15,0,0,Math.PI*2);x.fill();
  if(blink){x.fillStyle=x.__lid||'rgba(0,0,0,.4)';x.beginPath();x.ellipse(0,0,R,R*0.95,0,0,Math.PI*2);x.fill();
    x.strokeStyle='#1a1010';x.lineWidth=r*0.18;x.lineCap='round';x.beginPath();x.moveTo(-R*0.85,R*0.1);x.quadraticCurveTo(0,R*0.35,R*0.85,R*0.1);x.stroke();x.restore();return;}
  // Augapfel
  const wg=x.createRadialGradient(-R*0.3,-R*0.35,R*0.1,0,0,R);
  wg.addColorStop(0,'#ffffff');wg.addColorStop(0.6,'#efe9df');wg.addColorStop(1,'#a99f92');
  x.fillStyle=wg;x.beginPath();x.arc(0,0,R,0,Math.PI*2);x.fill();
  x.save();x.clip();
  // feine Äderchen
  x.strokeStyle='rgba(200,60,60,.22)';x.lineWidth=Math.max(0.6,R*0.03);
  for(let i=0;i<5;i++){const a=RND[i*3]*Math.PI*2;x.beginPath();x.moveTo(Math.cos(a)*R,Math.sin(a)*R);x.quadraticCurveTo(Math.cos(a+0.3)*R*0.75,Math.sin(a+0.3)*R*0.75,Math.cos(a)*R*0.55,Math.sin(a)*R*0.55);x.stroke();}
  // Iris
  const ir=emo==='fear'?R*0.38:R*0.58,lx=Math.sin(t/1700)*R*0.18+look*R*0.2,ly=R*0.05;
  const ig=x.createRadialGradient(lx,ly,ir*0.1,lx,ly,ir);
  ig.addColorStop(0,shade(iris,0.45));ig.addColorStop(0.55,iris);ig.addColorStop(1,shade(iris,-0.65));
  x.fillStyle=ig;x.beginPath();x.arc(lx,ly,ir,0,Math.PI*2);x.fill();
  x.strokeStyle=shade(iris,-0.3);x.globalAlpha=0.45;x.lineWidth=Math.max(0.6,ir*0.06);
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2;x.beginPath();x.moveTo(lx+Math.cos(a)*ir*0.42,ly+Math.sin(a)*ir*0.42);x.lineTo(lx+Math.cos(a)*ir*0.92,ly+Math.sin(a)*ir*0.92);x.stroke();}
  x.globalAlpha=1;
  // Pupille
  const pr=ir*(emo==='fear'?0.32:0.45);
  x.fillStyle='#070707';x.beginPath();x.arc(lx,ly,pr,0,Math.PI*2);x.fill();
  if(emo==='excited'){x.fillStyle='#ffd23f';x.beginPath();for(let j=0;j<5;j++){const an=j*Math.PI*2/5-Math.PI/2;x.lineTo(lx+Math.cos(an)*pr*1.3,ly+Math.sin(an)*pr*1.3);x.lineTo(lx+Math.cos(an+0.63)*pr*0.55,ly+Math.sin(an+0.63)*pr*0.55);}x.fill();}
  // Lidschatten oben
  const lg=x.createLinearGradient(0,-R,0,-R*0.1);lg.addColorStop(0,'rgba(40,20,10,.55)');lg.addColorStop(1,'rgba(40,20,10,0)');
  x.fillStyle=lg;x.fillRect(-R,-R,R*2,R*0.9);
  x.restore();
  // Glanzlichter
  x.fillStyle='rgba(255,255,255,.95)';x.beginPath();x.ellipse(lx-ir*0.38,ly-ir*0.42,ir*0.22,ir*0.16,-0.5,0,Math.PI*2);x.fill();
  x.fillStyle='rgba(255,255,255,.6)';x.beginPath();x.arc(lx+ir*0.3,ly+ir*0.32,ir*0.08,0,Math.PI*2);x.fill();
  // Lidrand
  x.strokeStyle='rgba(30,15,10,.75)';x.lineWidth=Math.max(1.2,R*0.09);x.beginPath();x.arc(0,0,R,Math.PI*1.08,Math.PI*1.92);x.stroke();
  x.strokeStyle='rgba(0,0,0,.3)';x.lineWidth=1.2;x.beginPath();x.arc(0,0,R,0,Math.PI*2);x.stroke();
  x.restore();
}
function brows(x,pts,r,emo,col){
  x.lineCap='round';
  for(const[cx,cy,s]of pts){
    let a=0,dy=-r*1.35;
    if(emo==='angry'){a=0.45*s;dy=-r*1.05;}
    if(emo==='fear'||emo==='cry'){a=-0.35*s;dy=-r*1.5;}
    if(emo==='excited'||emo==='cheer')dy=-r*1.6;
    x.save();x.translate(cx,cy+dy);x.rotate(a);
    // buschige Braue aus einzelnen Haaren
    x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=r*0.42;x.beginPath();x.moveTo(-r*0.85,r*0.06);x.lineTo(r*0.85,r*0.06);x.stroke();
    x.strokeStyle=col;x.lineWidth=Math.max(1,r*0.09);
    for(let i=0;i<14;i++){const u=-0.9+i/13*1.8,q=RND[100+i]-0.5;x.beginPath();x.moveTo(u*r,r*0.14);x.lineTo(u*r+r*0.22,-r*0.16+q*r*0.12);x.stroke();}
    x.restore();
  }
}
function mouth(x,cx,cy,w,emo,t,teeth){
  x.save();x.translate(cx,cy);x.lineCap='round';x.lineJoin='round';
  const mg=x.createLinearGradient(0,-w*0.2,0,w*0.6);mg.addColorStop(0,'#1a0303');mg.addColorStop(1,'#5a1414');
  x.fillStyle=mg;x.strokeStyle='rgba(20,5,5,.85)';x.lineWidth=3;
  const tongue=(y,ww)=>{const tg=x.createRadialGradient(-ww*0.2,y-ww*0.1,0,0,y,ww);tg.addColorStop(0,'#ff9aa8');tg.addColorStop(1,'#b8394f');x.fillStyle=tg;x.beginPath();x.ellipse(0,y,ww,ww*0.5,0,0,Math.PI*2);x.fill();};
  if(emo==='happy'){x.beginPath();x.moveTo(-w/2,0);x.quadraticCurveTo(0,w*0.55,w/2,0);x.closePath();x.fill();x.save();x.clip();tongue(w*0.32,w*0.2);x.restore();x.stroke();}
  else if(emo==='excited'||emo==='cheer'){const o=0.75+0.15*Math.sin(t/90);x.beginPath();x.moveTo(-w/2,-2);x.quadraticCurveTo(0,w*o,w/2,-2);x.closePath();x.fill();
    x.save();x.clip();tongue(w*o*0.42,w*0.22);x.restore();x.stroke();}
  else if(emo==='angry'){x.beginPath();x.moveTo(-w/2,w*0.12);x.quadraticCurveTo(0,-w*0.25,w/2,w*0.12);x.lineTo(w/2,w*0.25);x.quadraticCurveTo(0,-w*0.05,-w/2,w*0.25);x.closePath();x.fill();x.stroke();
    for(let i=-2;i<=2;i++){const tx=i*w*0.14,ty=-w*0.02-Math.abs(i)*1.5;const tg=x.createLinearGradient(0,ty,0,ty+7);tg.addColorStop(0,'#fffdf2');tg.addColorStop(1,'#cfc4a4');x.fillStyle=tg;x.fillRect(tx-3,ty,6,7);}}
  else if(emo==='fear'){const o=w*0.18+Math.sin(t/60)*2;x.beginPath();x.ellipse(0,4,w*0.22,o,0,0,Math.PI*2);x.fill();x.stroke();}
  else if(emo==='cry'){x.lineWidth=4;x.strokeStyle='#2a0a0a';x.beginPath();x.moveTo(-w/2,w*0.25);x.quadraticCurveTo(0,-w*0.25,w/2,w*0.25);x.stroke();}
  else{x.lineWidth=4;x.strokeStyle='#2a0a0a';x.beginPath();x.moveTo(-w/2,0);x.quadraticCurveTo(0,w*0.2,w/2,0);x.stroke();
    x.strokeStyle='rgba(255,255,255,.18)';x.lineWidth=2;x.beginPath();x.moveTo(-w*0.35,w*0.14);x.quadraticCurveTo(0,w*0.26,w*0.35,w*0.14);x.stroke();}
  if(teeth&&emo!=='fear'){   // Hauer aus Elfenbein
    for(const s of [-1,1]){
      const bx=s*w*0.24,by=emo==='angry'?w*0.18:4,tip=emo==='angry'?-w*0.16:-w*0.26;
      const tg=x.createLinearGradient(bx-s*w*0.08,0,bx+s*w*0.08,0);tg.addColorStop(0,'#fffbea');tg.addColorStop(0.6,'#e9dcb6');tg.addColorStop(1,'#a8946a');
      x.fillStyle=tg;x.strokeStyle='rgba(60,40,20,.7)';x.lineWidth=1.5;
      x.beginPath();x.moveTo(bx-s*w*0.09,by);x.quadraticCurveTo(bx-s*w*0.06,tip*0.5,bx+s*w*0.01,tip);x.quadraticCurveTo(bx+s*w*0.05,tip*0.4,bx+s*w*0.09,by);x.closePath();x.fill();x.stroke();
      x.fillStyle='rgba(255,255,255,.7)';x.beginPath();x.ellipse(bx-s*w*0.03,(by+tip)/2,w*0.012,Math.abs(by-tip)*0.25,0,0,Math.PI*2);x.fill();
    }}
  x.restore();
}
function arms(x,col,emo,t,spread,yy){
  for(const s of [-1,1]){
    let ang=0.5;   // hängend
    if(emo==='cheer')ang=-1.2+Math.sin(t/120+s)*0.35;
    else if(emo==='excited')ang=-0.6+Math.sin(t/100+s)*0.3;
    else if(emo==='happy')ang=0.1+Math.sin(t/150+s)*0.25;
    else if(emo==='angry')ang=0.9;
    else if(emo==='fear')ang=-0.4;
    else if(emo==='cry')ang=1.1;
    const sx=s*spread,dx=s*Math.cos(ang),dy=Math.sin(ang),L=44,ex=sx+dx*L,ey=yy+dy*L,nx=-dy,ny=dx;
    // Arm: verjüngt, seitlich schattiert
    const ag=x.createLinearGradient(sx+nx*10,yy+ny*10*s,sx-nx*10,yy-ny*10*s);
    ag.addColorStop(0,shade(col,0.2));ag.addColorStop(0.5,shade(col,-0.15));ag.addColorStop(1,shade(col,-0.55));
    x.fillStyle=ag;x.beginPath();
    x.moveTo(sx+nx*9,yy+ny*9);x.quadraticCurveTo((sx+ex)/2+nx*9,(yy+ey)/2+ny*9,ex+nx*6.5,ey+ny*6.5);
    x.lineTo(ex-nx*6.5,ey-ny*6.5);x.quadraticCurveTo((sx+ex)/2-nx*8,(yy+ey)/2-ny*8,sx-nx*9,yy-ny*9);x.closePath();x.fill();
    // Hand mit Krallen
    const hg=x.createRadialGradient(ex-4,ey-4,1,ex,ey,12);hg.addColorStop(0,shade(col,0.25));hg.addColorStop(1,shade(col,-0.5));
    x.fillStyle=hg;x.beginPath();x.arc(ex,ey,11,0,Math.PI*2);x.fill();
    x.fillStyle='#efe4c8';x.strokeStyle='rgba(60,40,20,.6)';x.lineWidth=1;
    for(let k=-1;k<=1;k++){const a=Math.atan2(dy,dx)+k*0.55,cx=ex+Math.cos(a)*10,cy=ey+Math.sin(a)*10;
      x.beginPath();x.moveTo(cx+Math.cos(a+1.6)*2.6,cy+Math.sin(a+1.6)*2.6);x.lineTo(cx+Math.cos(a)*7,cy+Math.sin(a)*7);x.lineTo(cx+Math.cos(a-1.6)*2.6,cy+Math.sin(a-1.6)*2.6);x.closePath();x.fill();x.stroke();}
  }
}
function foot(x,col,cx,cy,rx,ry){
  const g=x.createRadialGradient(cx-rx*0.3,cy-ry*0.5,1,cx,cy,rx);g.addColorStop(0,shade(col,0.1));g.addColorStop(1,shade(col,-0.6));
  x.fillStyle=g;x.beginPath();x.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);x.fill();
}
// Blubbo: runder, flauschiger Zyklop mit Hörnern
function drawBlob(x,col,emo,t,blink){
  arms(x,col,emo,t,62,6);
  // Hörner aus Horn/Knochen mit Rillen
  for(const s of [-1,1]){
    const hg=x.createLinearGradient(s*28,-66,s*52,-108);hg.addColorStop(0,'#8a7350');hg.addColorStop(0.5,'#e8d9b4');hg.addColorStop(1,'#fff6de');
    x.fillStyle=hg;x.strokeStyle='rgba(60,40,20,.55)';x.lineWidth=1.2;
    x.beginPath();x.moveTo(s*24,-68);x.quadraticCurveTo(s*36,-100,s*52,-110);x.quadraticCurveTo(s*48,-88,s*50,-64);x.closePath();x.fill();x.stroke();
    for(let k=1;k<4;k++){x.beginPath();x.moveTo(s*(26+k*5),-70-k*8);x.lineTo(s*(44+k*1),-68-k*7);x.stroke();}
  }
  // Körper mit flauschigem Rand
  const body=()=>{x.beginPath();for(let i=0;i<=72;i++){const a=i/72*Math.PI*2,r=76+(i%2?4:-1)+Math.sin(t/300+i)*1.2;x.lineTo(Math.cos(a)*r,Math.sin(a)*r*0.93);}x.closePath();};
  body();x.fillStyle=volFill(x,col,0,0,80);x.fill();
  x.save();body();x.clip();
  // Bauch heller
  const bg=x.createRadialGradient(-6,18,4,0,28,52);bg.addColorStop(0,shade(col,0.45));bg.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=bg;x.beginPath();x.ellipse(0,28,50,42,0,0,Math.PI*2);x.fill();
  // Fell: viele kurze Haare, Richtung nach außen
  x.lineCap='round';
  x.lineWidth=1.3;const sway=Math.sin(t/700)*0.08;
  for(const[lo,hi,st]of[[0.25,9,'rgba(255,255,255,.26)'],[-0.05,0.25,'rgba(255,255,255,.1)'],[-0.3,-0.05,'rgba(0,0,0,.12)'],[-9,-0.3,'rgba(0,0,0,.24)']]){
    x.strokeStyle=st;x.beginPath();   // Haare nach Helligkeit gebündelt (Licht von oben links)
    for(let i=0;i<220;i++){
      const a=RND[i]*Math.PI*2,rr=Math.sqrt(RND[i+220])*74,px=Math.cos(a)*rr,py=Math.sin(a)*rr*0.93,lit=(px*-0.6+py*-0.8)/80;
      if(lit<lo||lit>=hi)continue;
      const len=5+RND[i+440]*6,dir=a+0.4*(RND[i+660]-0.5)+sway;
      x.moveTo(px,py);x.lineTo(px+Math.cos(dir)*len,py+Math.sin(dir)*len);
    }
    x.stroke();
  }
  x.restore();
  body();rimLight(x,160,150,0.3);
  // abstehende Haare am Rand
  x.strokeStyle=shade(col,-0.1);x.lineWidth=1.6;x.beginPath();
  for(let i=0;i<60;i++){const a=i/60*Math.PI*2+RND[i+30]*0.08,r0=74,len=6+RND[i+90]*7+Math.sin(t/250+i)*1.5;
    x.moveTo(Math.cos(a)*r0,Math.sin(a)*r0*0.93);x.lineTo(Math.cos(a+0.12)*(r0+len),Math.sin(a+0.12)*(r0+len)*0.93);}
  x.stroke();
  brows(x,[[0,-18,1]],30,emo,shade(col,-0.6));
  eye(x,0,-18,30,emo,t,blink,0,'#c98a12');
  mouth(x,0,34,44,emo,t,false);
  for(const s of [-1,1])foot(x,col,s*30,70,20,10);
}
// Grumbo: kantiger Brummbär mit Hauern, Warzen und derber Haut
function drawOgre(x,col,emo,t,blink){
  arms(x,col,emo,t,70,0);
  // Ohren mit dunklem Inneren
  for(const s of [-1,1]){
    const eg=x.createLinearGradient(s*66,-40,s*100,-60);eg.addColorStop(0,shade(col,-0.35));eg.addColorStop(1,shade(col,0.1));
    x.fillStyle=eg;x.beginPath();x.moveTo(s*66,-44);x.quadraticCurveTo(s*104,-74,s*100,-58);x.quadraticCurveTo(s*96,-30,s*70,-10);x.closePath();x.fill();
    x.fillStyle='rgba(60,20,20,.45)';x.beginPath();x.moveTo(s*72,-38);x.quadraticCurveTo(s*94,-58,s*92,-52);x.quadraticCurveTo(s*88,-34,s*74,-20);x.closePath();x.fill();
  }
  const body=()=>roundRect(x,-72,-78,144,150,34);
  body();x.fillStyle=volFill(x,col,-4,-12,108,0.38,-0.62);x.fill();
  x.save();body();x.clip();
  // Stirnwulst
  const fg=x.createLinearGradient(0,-78,0,-30);fg.addColorStop(0,shade(col,-0.35));fg.addColorStop(0.75,shade(col,-0.1));fg.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=fg;x.fillRect(-72,-78,144,48);
  x.strokeStyle='rgba(0,0,0,.18)';x.lineWidth=2;for(let k=0;k<3;k++){x.beginPath();x.moveTo(-34,-62+k*6);x.quadraticCurveTo(0,-68+k*6,34,-62+k*6);x.stroke();}
  // Hautporen und Flecken
  for(const dark of [true,false]){x.fillStyle=dark?'rgba(0,0,0,.14)':'rgba(255,255,255,.08)';x.beginPath();
    for(let i=0;i<120;i++){if((RND[i+360]>0.5)!==dark)continue;const px=-70+RND[i]*140,py=-76+RND[i+120]*148,rr=0.8+RND[i+240]*1.8;x.moveTo(px+rr,py);x.arc(px,py,rr,0,Math.PI*2);}
    x.fill();}
  for(let i=0;i<6;i++){const px=-58+RND[i+500]*116,py=-50+RND[i+520]*100;if(Math.abs(px)<40&&py>-36&&py<60)continue;
    const sg=x.createRadialGradient(px,py,0,px,py,9);sg.addColorStop(0,shade(col,-0.35));sg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=sg;x.beginPath();x.arc(px,py,9,0,Math.PI*2);x.fill();}
  // Warzen
  for(const[wx,wy,wr]of[[-52,8,4.5],[48,-44,3.5],[56,30,4]]){const wg=x.createRadialGradient(wx-wr*0.4,wy-wr*0.4,0,wx,wy,wr);wg.addColorStop(0,shade(col,0.35));wg.addColorStop(1,shade(col,-0.45));x.fillStyle=wg;x.beginPath();x.arc(wx,wy,wr,0,Math.PI*2);x.fill();}
  // Schnauze heller
  const mz=x.createRadialGradient(-8,22,4,0,36,58);mz.addColorStop(0,shade(col,0.32));mz.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=mz;x.beginPath();x.ellipse(0,36,52,36,0,0,Math.PI*2);x.fill();
  // Bartstoppeln
  x.fillStyle='rgba(0,0,0,.28)';for(let i=0;i<70;i++){const a=RND[i+600]*Math.PI,rr=40+RND[i+680]*14;x.fillRect(Math.cos(a)*rr*1.1,30+Math.sin(a)*rr*0.75,1.4,1.4);}
  x.restore();
  body();rimLight(x,150,150,0.25);
  brows(x,[[-26,-24,1],[26,-24,-1]],17,emo,shade(col,-0.7));
  eye(x,-26,-24,15,emo,t,blink,0,'#d4a017');eye(x,26,-24,15,emo,t,blink,0,'#d4a017');
  // Nase mit Nasenlöchern
  const ng=x.createRadialGradient(-4,-6,1,0,0,16);ng.addColorStop(0,shade(col,0.3));ng.addColorStop(1,shade(col,-0.45));
  x.fillStyle=ng;x.beginPath();x.ellipse(0,0,16,11,0,0,Math.PI*2);x.fill();
  x.fillStyle='rgba(20,5,5,.7)';for(const s of [-1,1]){x.beginPath();x.ellipse(s*6,4,3.4,2.4,s*0.3,0,Math.PI*2);x.fill();}
  x.fillStyle='rgba(255,255,255,.35)';x.beginPath();x.ellipse(-5,-5,4,2,-0.4,0,Math.PI*2);x.fill();
  mouth(x,0,32,58,emo,t,true);
  for(const s of [-1,1])foot(x,col,s*30,74,17,8);
}
// Flammo: zappelige Flamme mit drei Augen – Glut, Flammenschichten, Funken
function drawFlame(x,col,emo,t,blink){
  const fl=emo==='angry'?1.35:1;
  // Leuchten
  const glow=x.createRadialGradient(0,-10,10,0,-10,150);glow.addColorStop(0,'rgba(255,170,40,.45)');glow.addColorStop(1,'rgba(255,90,0,0)');
  x.fillStyle=glow;x.beginPath();x.arc(0,-10,150,0,Math.PI*2);x.fill();
  arms(x,col,emo,t,52,14);
  // Flammenzungen in drei Schichten (außen rot, Mitte orange, innen gelb)
  const layers=[[1,'rgba(220,40,0,.9)','rgba(255,120,0,.0)'],[0.78,'rgba(255,120,0,.95)','rgba(255,190,40,.2)'],[0.55,'rgba(255,220,90,.95)','rgba(255,255,220,.3)']];
  layers.forEach(([k,c1,c2],li)=>{
    const g=x.createLinearGradient(0,-10,0,-150*k*fl);g.addColorStop(0,c1);g.addColorStop(1,c2);
    x.fillStyle=g;x.beginPath();x.moveTo(-62*k,-6);
    for(let i=0;i<=8;i++){const ax=(-66+i*16.5)*k,h=(i%2?70:128)*fl*k+Math.sin(t/(80+li*15)+i*1.7+li)*9*fl*k;
      const top=-28-h*(1-Math.abs(i-4)/7);x.quadraticCurveTo(ax-4*k,top+18,ax,top);}
    x.lineTo(62*k,-6);x.closePath();x.fill();
  });
  // Körper: heißer Kern unten, glühend
  const body=()=>{x.beginPath();x.moveTo(-64,0);x.bezierCurveTo(-74,-60,-30,-96,0,-120-Math.sin(t/120)*6*fl);x.bezierCurveTo(30,-96,74,-60,64,0);x.bezierCurveTo(64,52,-64,52,-64,0);x.closePath();};
  body();const bg=x.createRadialGradient(0,28,6,0,-10,110);
  bg.addColorStop(0,'#fff6c8');bg.addColorStop(0.25,'#ffd24a');bg.addColorStop(0.55,shade(col,0.2));bg.addColorStop(0.85,col);bg.addColorStop(1,shade(col,-0.45));
  x.fillStyle=bg;x.fill();
  x.save();body();x.clip();
  // flackernde Hitzeschlieren
  x.globalCompositeOperation='lighter';
  for(let i=0;i<7;i++){const ph=((t/900)+RND[i])%1,px=-40+RND[i+10]*80+Math.sin(t/200+i)*6,py=40-ph*150;
    const hg=x.createRadialGradient(px,py,0,px,py,22);hg.addColorStop(0,`rgba(255,230,120,${0.35*(1-ph)})`);hg.addColorStop(1,'rgba(255,120,0,0)');
    x.fillStyle=hg;x.beginPath();x.arc(px,py,22,0,Math.PI*2);x.fill();}
  x.globalCompositeOperation='source-over';
  x.restore();
  body();rimLight(x,140,170,0.35);
  // Funken steigen auf
  for(let i=0;i<14;i++){const sp=0.6+RND[i+40]*0.8,ph=((t/1000)*sp*(emo==='angry'?1.8:1)+RND[i+60])%1;
    const px=(-50+RND[i+80]*100)+Math.sin(t/300+i)*8,py=-60-ph*110,r=1.2+RND[i+100]*1.8;
    x.fillStyle=`rgba(255,${180+Math.round(RND[i+120]*70)},80,${1-ph})`;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();}
  brows(x,[[-34,-22,1],[0,-34,1],[34,-22,-1]],12,emo,'#3a1205');
  eye(x,-34,-22,12,emo,t,blink,-1,'#b3260a');eye(x,0,-34,13,emo,t,blink,0,'#b3260a');eye(x,34,-22,12,emo,t,blink,1,'#b3260a');
  mouth(x,0,18,40,emo,t,true);
}
function drawHuman(x,col,emo,t,blink){
  x.fillStyle=shade(col,-0.25);roundRect(x,-62,40,124,60,28);x.fill();   // Schultern
  x.fillStyle='#f1c9a5';x.beginPath();x.ellipse(0,-10,52,60,0,0,Math.PI*2);x.fill();
  x.fillStyle=col;x.beginPath();x.ellipse(0,-50,56,30,0,Math.PI,0);x.fill();x.fillRect(-56,-52,14,30);x.fillRect(42,-52,14,30);
  brows(x,[[-20,-8,1],[20,-8,-1]],10,emo,'#5a3b26');
  eye(x,-20,-8,10,emo,t,blink);eye(x,20,-8,10,emo,t,blink);
  mouth(x,0,26,32,emo,t,false);
  if(emo==='happy'||emo==='cheer'||emo==='excited'){x.fillStyle='rgba(255,110,110,.35)';for(const s of [-1,1]){x.beginPath();x.arc(s*34,12,9,0,Math.PI*2);x.fill();}}
}
window.MON={paint(x,kind,col,emo,t,blink,line,age,opt){opt=opt||{};
  const g=x.createRadialGradient(AV_W/2,AV_H*0.55,20,AV_W/2,AV_H/2,AV_W*0.7);
  g.addColorStop(0,shade(col,-0.55));g.addColorStop(1,shade(col,-0.85));x.fillStyle=g;x.fillRect(0,0,AV_W,AV_H);
  x.globalAlpha=0.07;x.fillStyle='#fff';for(let yy=0;yy<AV_H;yy+=4)x.fillRect(0,yy,AV_W,1);x.globalAlpha=1;
  const sp=opt.speed||1,bo=opt.bounce||1,sh=opt.shake||1;let bob=Math.sin(t/1000*2.2*sp)*4,dx=0,sc=1,rot=0;
  if(emo==='happy'){bob=-Math.abs(Math.sin(t/1000*8*sp))*14*bo;}
  if(emo==='excited'){bob=-Math.abs(Math.sin(t/1000*10*sp))*24*bo;rot=Math.sin(t/1000*12)*0.06;}
  if(emo==='cheer'){bob=-Math.abs(Math.sin(t/1000*7*sp))*30*bo;rot=Math.sin(t/1000*6)*0.08;}
  if(emo==='angry'){dx=Math.sin(t/1000*60)*4*sh;bob=0;}
  if(emo==='fear'){dx=Math.sin(t/1000*45)*2.2;sc=0.92;bob=4;}
  if(emo==='cry'){bob=6+Math.sin(t/1000*3)*2;sc=0.96;}
  x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(AV_W/2,212,70*sc*(1+bob/120),10,0,0,Math.PI*2);x.fill();
  x.save();x.translate(AV_W/2+dx,150+bob);x.rotate(rot);x.scale(sc,sc);
  if(emo==='angry'){x.shadowColor='rgba(255,40,0,.6)';x.shadowBlur=18;}
  if(kind==='human')drawHuman(x,col,emo,t,blink);else if(kind==='blob')drawBlob(x,col,emo,t,blink);else if(kind==='ogre')drawOgre(x,col,emo,t,blink);else drawFlame(x,col,emo,t,blink);
  x.restore();x.shadowBlur=0;
  if(emo==='excited'||emo==='cheer')drawSparkles(x,t,emo==='cheer');
  if(emo==='angry')drawSteam(x,t);
  if(emo==='fear')drawSweat(x,t);
  if(line)drawBubble(x,line,col,age||0);}};
})();
