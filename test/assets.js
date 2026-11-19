// Asset hygiene test:  node test/assets.js
// Every art / data file committed under assets/ (images, JSON, fonts) must be used by something: named in a build script
// (assets/*.py, *.js), in src/, build.js, a test or a tool. Scripts are entry points and are not checked. A few files are
// read under a composed name or kept for their licence; they are listed in KEEP with the reason. Fails on an unused file.
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),A=path.join(ROOT,'assets');
const KEEP={
 'icon-16.png':'build.js inlines icon-<size>.png (written by assets/make-icons.js)','icon-32.png':'build.js icon','icon-180.png':'build.js icon',
 'icon-192.png':'written by assets/make-icons.js (store / home-screen sizes; not embedded)','icon-512.png':'written by assets/make-icons.js (not embedded)',
 'OFL-alegreya-sans.txt':'font licence (SIL OFL 1.1 must travel with the font)','OFL-fredoka.txt':'font licence','OFL-lilita-one.txt':'font licence'};
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const isScript=f=>/\.(py|js)$/.test(f);
const files=walk(A).filter(f=>!isScript(f));
// the text that can name an asset: scripts, src, build.js, tests, tools (not the generated index.html, not the assets themselves)
const texts=[...walk(A).filter(isScript),...walk(path.join(ROOT,'src')),path.join(ROOT,'build.js'),...walk(path.join(ROOT,'test')).filter(f=>f!==__filename),
 ...(fs.existsSync(path.join(ROOT,'tools'))?walk(path.join(ROOT,'tools')).filter(isScript):[])];
const corpus=texts.map(f=>fs.readFileSync(f,'utf8')).join('\n');
const bad=[];let n=0;
for(const f of files){n++;const b=path.basename(f),stem=b.replace(/\.[^.]+$/,'');
 if(KEEP[b])continue;
 if(corpus.includes(b))continue;
 if(/\.woff2$/.test(b)&&corpus.includes("'"+stem+"'"))continue;   // build.js FONTS lists the stems
 bad.push(path.relative(ROOT,f)+' ('+fs.statSync(f).size+' bytes) is referenced by nothing')}
for(const k in KEEP)if(!files.some(f=>path.basename(f)===k))bad.push('KEEP lists '+k+', which is not in assets/ any more');
console.log(n+' asset files checked');
if(bad.length){console.log('FAIL:\n'+bad.join('\n'));process.exit(1)}else console.log('OK');
