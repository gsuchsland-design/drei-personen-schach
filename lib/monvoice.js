// Monsterstimmen: eigenes Geräusch (Web Audio, synthetisch) vor jedem Satz und deutlich verschiedene Sprechweisen.
// MV.speak(p,text,lang)  – Geräusch + Sprachausgabe für Monster p (Farbbuchstabe B G R Y L T O I)
// MV.sound(p,emo)        – nur das Geräusch (z. B. beim Schlagen oder Schachgeben)
// © 2026 Guido Suchsland
(function(G){
'use strict';
let AC=null,MASTER=null;
function ac(){if(!AC){try{AC=new(G.AudioContext||G.webkitAudioContext)();MASTER=AC.createGain();MASTER.gain.value=0.28;MASTER.connect(AC.destination);}catch(e){AC=null;}}
  if(AC&&AC.state==='suspended')AC.resume().catch(()=>{});return AC;}
try{G.addEventListener('pointerdown',()=>ac(),{once:true});G.addEventListener('keydown',()=>ac(),{once:true});}catch(e){}
let NOISE=null;
function noise(a){if(NOISE)return NOISE;const b=a.createBuffer(1,a.sampleRate,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return NOISE=b;}
// Ton: Typ, Frequenz von f0 nach f1, Start t, Dauer d, Lautstärke v
function tone(a,out,type,f0,f1,t,d,v,att){const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+d);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+(att||0.01));g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(out);o.start(t);o.stop(t+d+0.02);return o;}
function hiss(a,out,ftype,f0,f1,q,t,d,v,att){const s=a.createBufferSource();s.buffer=noise(a);const f=a.createBiquadFilter();f.type=ftype;f.Q.value=q;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+d);
  const g=a.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+(att||0.01));g.gain.exponentialRampToValueAtTime(0.0001,t+d);s.connect(f);f.connect(g);g.connect(out);s.start(t,Math.random()*0.5);s.stop(t+d+0.02);}
function lfo(a,param,rate,depth,t,d){const l=a.createOscillator(),g=a.createGain();l.frequency.value=rate;g.gain.value=depth;l.connect(g);g.connect(param);l.start(t);l.stop(t+d+0.05);}
// Geräusche je Monster; Rückgabe: Dauer in Sekunden
const SND={
  B(a,o,t,k){for(let i=0;i<3;i++)tone(a,o,'sine',260+i*60,720+i*90,t+i*0.1*k,0.09,0.55);return 0.32*k;},                       // Blubbo: blubb-blubb-blubb
  G(a,o,t,k){const d=0.75*k,x=tone(a,o,'sawtooth',72,58,t,d,0.5,0.08);const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=420;
    x.disconnect();const g=a.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.7,t+0.08);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
    x.connect(f);f.connect(g);g.connect(o);lfo(a,g.gain,17,0.35,t,d);hiss(a,o,'lowpass',500,200,1,t,d,0.18,0.1);return d;},       // Grumbo: tiefes Grollen
  R(a,o,t,k){hiss(a,o,'bandpass',300,3200,0.8,t,0.45*k,0.5,0.15);for(let i=0;i<6;i++)hiss(a,o,'highpass',2500,4000,1,t+Math.random()*0.4*k,0.03,0.6);return 0.48*k;}, // Flammo: Fauchen und Knistern
  Y(a,o,t,k){for(let i=0;i<3;i++){const x=tone(a,o,'square',140+Math.random()*80,90,t+i*0.09*k,0.07,0.35);}const z=tone(a,o,'sawtooth',180,240,t+0.28*k,0.3*k,0.25);lfo(a,z.frequency,55,60,t+0.28*k,0.3*k);return 0.6*k;}, // Zappo: Bzzzt
  L(a,o,t,k){const d=1.0*k,x=tone(a,o,'sine',430,640,t,d,0.45,0.35);lfo(a,x.frequency,6,28,t,d);hiss(a,o,'bandpass',900,700,4,t,d,0.08,0.4);return d;}, // Spuki: Huuuu
  T(a,o,t,k){for(let i=0;i<4;i++)tone(a,o,'sine',110+i*25,300+i*40,t+i*0.13*k,0.12,0.6);hiss(a,o,'lowpass',300,150,1,t,0.55*k,0.1,0.05);return 0.58*k;}, // Kraki: tiefe Luftblasen
  O(a,o,t,k){[784,988,1175,1568].forEach((f,i)=>tone(a,o,'triangle',f,f,t+i*0.08*k,0.5,0.32,0.005));return 0.6*k;},            // Sonno: Glockenspiel
  I(a,o,t,k){tone(a,o,'sine',1100,1900,t,0.12,0.4);tone(a,o,'sine',1300,2300,t+0.15*k,0.14,0.4);return 0.32*k;}               // Fluffi: Quietschen
};
// Sprechweise: Höhe, Tempo und welche der vorhandenen Stimmen (damit nicht alle gleich klingen)
const VOX={B:{pitch:1.9,rate:1.15,pick:0},G:{pitch:0.15,rate:0.72,pick:1},R:{pitch:1.25,rate:1.45,pick:2},Y:{pitch:1.65,rate:1.7,pick:3},
  L:{pitch:1.1,rate:0.62,pick:4},T:{pitch:0.45,rate:0.82,pick:5},O:{pitch:1.05,rate:1.0,pick:6},I:{pitch:2,rate:1.08,pick:7}};
function sound(p,emo){const a=ac();if(!a||!SND[p])return 0;const k=emo==='cry'||emo==='fear'?1.25:emo==='cheer'||emo==='excited'?0.85:1;
  try{return SND[p](a,MASTER,a.currentTime+0.02,k);}catch(e){return 0;}}
let VOICES=[];function loadVoices(){try{VOICES=speechSynthesis.getVoices()||[];}catch(e){VOICES=[];}}
try{if(G.speechSynthesis){loadVoices();speechSynthesis.addEventListener&&speechSynthesis.addEventListener('voiceschanged',loadVoices);}}catch(e){}
function voiceFor(p,lang){if(!VOICES.length)loadVoices();const l=String(lang||'de').toLowerCase();const vs=VOICES.filter(v=>v.lang&&v.lang.toLowerCase().replace('_','-').startsWith(l.slice(0,2)));
  if(!vs.length)return null;const v=VOX[p]||{pick:0};return vs[v.pick%vs.length];}
function speak(p,text,lang,opt){opt=opt||{};if(!G.speechSynthesis||!text)return;
  const clean=String(text).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,'').trim();if(!clean)return;
  const d=opt.noSound?0:sound(p,opt.emo);
  setTimeout(()=>{try{const u=new SpeechSynthesisUtterance(clean),v=VOX[p]||{pitch:1,rate:1};u.lang=opt.bcp||lang||'de';u.pitch=v.pitch;u.rate=v.rate;
    const vo=voiceFor(p,lang);if(vo)u.voice=vo;if(opt.onstart)u.onstart=opt.onstart;if(opt.onend)u.onend=u.onerror=opt.onend;speechSynthesis.speak(u);}catch(e){}},Math.round(d*800));}
G.MV={speak,sound,VOX,_SND:SND,_noiseReset:()=>{NOISE=null;}};
})(window);
