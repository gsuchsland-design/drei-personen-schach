// Prüft, welche Texte aus T('…') in einer Sprache fehlen. Aufruf: node tools/i18n_check.js <sprache> [--list]
const fs=require('fs'),lg=process.argv[2]||'en';global.window={};
require('../lib/lang/'+lg+'.js');try{require('../lib/lang/v-'+lg+'.js');}catch(e){}
const I=window.I18N,all=new Set();
for(const f of ['spiel.html','raum.html','stern.html','grenzenlos.html','lib/kit.js','lib/sternbrett.js','lib/reiche3d.js','lib/varnav.js']){
  const s=fs.readFileSync(__dirname+'/../'+f,'utf8');const re=/\b(?:T|K\.tr|tr)\(\s*(['`"])((?:\\.|(?!\1).)*?)\1/g;let m;
  while((m=re.exec(s))){const k=m[2].replace(/\\'/g,"'").replace(/\\n/g,'\n');if(k.includes('${'))continue;if(!I[k]&&/[a-zäöüß]/i.test(k))all.add(k);}
}
if(process.argv.includes('--list'))console.log(JSON.stringify([...all],null,0));else console.log(lg,all.size);
