// Banner test. Plain node (+ an optional browser part with Playwright):  node test/banners.js [--seed N] [--no-browser]
// Checks the company banner options of 46-banner.js: bannerFix defaults and repair (old banner objects keep their exact pixel flag),
// every colour / emblem / division / shape draws a valid pixel flag in PAL keys, the vector emblems rasterise to 16x16 rows,
// houses and rivals of a new world get a division and shape from a hash (the game stream untouched), old saves keep theirs, the
// setup dialog and the banner sheet offer the new choices, and the save round trip. The browser part (built index.html) paints
// every emblem, division, shape and colour at Detail High, checks the painted rules, and that Detail Low switches them off live.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261116,SRC=path.join(__dirname,'..','src');
function fail(msg){console.error('\nFAIL: '+msg);process.exit(1)}
function ok(c,msg){if(!c)fail(msg)}
process.on('uncaughtException',e=>fail('uncaught exception: '+(e&&e.stack||e)));
process.on('unhandledRejection',e=>fail('unhandled rejection: '+(e&&e.stack||e)));
const section=n=>console.log('\n== '+n+' ==');
/* ---------- DOM stubs (as in test/headless.js) ---------- */
function hole(props){const store=Object.assign(Object.create(null),props||{});
 return new Proxy(function(){},{get(t,k){if(k in store)return store[k];if(k==='then'||k==='toJSON')return undefined;if(k===Symbol.toPrimitive)return h=>h==='number'?0:'';
   if(k===Symbol.iterator)return function*(){};if(typeof k==='symbol')return undefined;if(k==='length')return 0;return store[k]=hole()},
  set(t,k,v){store[k]=v;return true},has(){return true},deleteProperty(t,k){delete store[k];return true},apply(){return hole()},construct(){return hole()}})}
function element(id){const cls=new Set();
 return hole({id:id||'',tagName:'DIV',innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,children:[],childNodes:[],dataset:{},parentNode:null,
  scrollTop:0,scrollLeft:0,scrollHeight:0,offsetTop:0,offsetLeft:0,offsetWidth:0,offsetHeight:0,clientWidth:0,clientHeight:0,width:300,height:150,
  classList:{add(...a){a.forEach(x=>cls.add(x))},remove(...a){a.forEach(x=>cls.delete(x))},toggle(x,f){const on=f===undefined?!cls.has(x):!!f;on?cls.add(x):cls.delete(x);return on},contains:x=>cls.has(x)},
  style:hole({setProperty(){},removeProperty(){},getPropertyValue:()=>''}),getBoundingClientRect:()=>({x:0,y:0,top:0,left:0,right:0,bottom:0,width:0,height:0}),
  getContext:()=>hole({measureText:()=>({width:10}),getImageData:()=>({data:[]})}),
  addEventListener(){},removeEventListener(){},dispatchEvent:()=>true,setAttribute(){},removeAttribute(){},getAttribute:()=>null,hasAttribute:()=>false,
  appendChild:x=>x,insertBefore:x=>x,removeChild:x=>x,remove(){},focus(){},blur(){},click(){},scrollIntoView(){},scrollTo(){},
  setPointerCapture(){},releasePointerCapture(){},hasPointerCapture:()=>false,contains:()=>false,closest:()=>null,matches:()=>false,
  querySelector:()=>null,querySelectorAll:()=>[],getElementsByClassName:()=>[],getElementsByTagName:()=>[],animate:()=>hole()})}
function makeContext(){const els=new Map(),store=new Map();
 const doc={getElementById(id){if(!els.has(id))els.set(id,element(id));return els.get(id)},createElement:()=>element(),createElementNS:()=>element(),createTextNode:()=>element(),createDocumentFragment:()=>element(),
  body:element('body'),documentElement:element('html'),head:element('head'),addEventListener(){},removeEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],
  hidden:false,visibilityState:'visible',fullscreenElement:null,activeElement:null,fonts:hole(),exitFullscreen(){}};
 const sb={document:doc,console:{log(){},info(){},debug(){},warn(){},error(...a){fail('console.error from game code: '+a.join(' '))}},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem(k,v){store.set(k,String(v))},removeItem(k){store.delete(k)},clear(){store.clear()}},
  setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},queueMicrotask,
  innerWidth:667,innerHeight:375,devicePixelRatio:1,addEventListener(){},removeEventListener(){},dispatchEvent:()=>true,
  matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}),
  getComputedStyle:()=>hole({getPropertyValue:()=>''}),navigator:{userAgent:'node',maxTouchPoints:0,vibrate(){}},screen:hole(),location:{href:'',reload(){}},
  performance:{now:()=>0},ResizeObserver:function(){return{observe(){},disconnect(){},unobserve(){}}},MutationObserver:function(){return{observe(){},disconnect(){}}},
  IntersectionObserver:function(){return{observe(){},disconnect(){}}},Image:function(){return element()},Audio:function(){return hole()},CSS:{supports:()=>false,escape:s=>s}};
 sb.window=sb;sb.self=sb;sb.globalThis=sb;sb.top=sb;sb.parent=sb;
 const ctx=vm.createContext(sb),js=fs.readdirSync(SRC).filter(f=>f.endsWith('.js')).sort().map(f=>`/* ---- ${f} ---- */\n`+fs.readFileSync(path.join(SRC,f),'utf8')).join('\n');
 vm.runInContext("'use strict';\n"+js,ctx,{filename:'wyrdmarch-src.js'});
 const getters=new Map(),setters=new Map(),extra={ctx,store};
 const X=new Proxy(extra,{get(t,k){if(k in t)return t[k];if(typeof k!=='string')return undefined;if(k in ctx)return ctx[k];
   if(!getters.has(k))getters.set(k,vm.runInContext(`(()=>typeof ${k}==='undefined'?undefined:${k})`,ctx));return getters.get(k)()},
  set(t,k,v){if(k in t){t[k]=v;return true}if(!setters.has(k))setters.set(k,vm.runInContext(`(v=>{${k}=v})`,ctx));setters.get(k)(v);return true}});
 X.SPEEDF=0;X.clone=vm.runInContext('(o=>JSON.parse(JSON.stringify(o)))',ctx);return X}
function closeAll(X){for(let i=0;i<6&&X.sheetOpen;i++)X.closeSheet(true);if(X.sheetOpen)X.sheetOpen=false;if(X.G)X.G.townOpen=false}


const X=makeContext();
const OLDC=['5','c','g','x','D','l','G','B','E','j','y','p'],OLDE=['swords','wolf','lion','tower','skull','sun','moon','stag','raven','oak','anchor','crown','boar','rose','fleur'];

section('options');
{ const C=Object.keys(X.BANNERC),E=Object.keys(X.EMBLEMS),D=Object.keys(X.BNDIV),S=Object.keys(X.BNSHAPE);
  ok(C.length>=22&&OLDC.every(k=>C.includes(k)),'22+ colours, the old twelve kept: '+C.length);
  ok(E.length>=33&&OLDE.every(k=>E.includes(k)),'33+ emblems, the old fifteen kept: '+E.length);
  ok(D.length>=13&&D.includes('plain')&&['pale','fess','bend','quarter','chevron','saltire','cross','bordure','chief','canton','barry','paly'].every(k=>D.includes(k)),'divisions: '+D.join(' '));
  ok(['swallow','banner','pennon','gonfalon'].every(k=>S.includes(k)),'shapes: '+S.join(' '));
  for(const k of C){const c=X.BANNERC[k];ok(c.n&&Array.isArray(c.r)&&c.r.length===3&&c.r.every(p=>/^#[0-9a-f]{6}$/i.test(X.PAL[p])),'colour '+k+' ramp in PAL')}
  ok(new Set(C.map(k=>X.BANNERC[k].n)).size===C.length,'colour names distinct');
  ok(X.BNORDER.length===C.length&&new Set(X.BNORDER).size===C.length&&X.BNORDER.every(k=>X.BANNERC[k]),'BNORDER lists every colour once');
  const pal=k=>k==='.'||X.PAL[k]!==undefined,rowsOK=(r,w,h)=>Array.isArray(r)&&r.length===h&&r.every(s=>[...s].length===w&&[...s].every(pal));
  for(const e of E){const r=X.EMBLEMS[e].r;ok(Array.isArray(r)&&r.length===16&&r.every(s=>s.length===16&&/^[.#+\-=l]+$/.test(s)),'emblem rows '+e);
   const n=r.join('').replace(/\./g,'').length;ok(n>=40&&n<=230,'emblem '+e+' fills a sensible part of its box: '+n);ok(rowsOK(X.emblemRows(e,'c','5'),16,16),'emblemRows '+e)}
  const sig=new Set(E.map(e=>X.EMBLEMS[e].r.join('')));ok(sig.size===E.length,'every emblem is a different drawing');
  for(const e of E)ok(X.BNEP[e]||X.BNVEC[e],'emblem '+e+' has a painted (vector) drawing');
  console.log(C.length+' colours, '+E.length+' emblems, '+D.length+' divisions, '+S.length+' shapes: ok') }

section('pixel flags: every colour, emblem, division and shape');
{ const C=Object.keys(X.BANNERC),E=Object.keys(X.EMBLEMS),D=Object.keys(X.BNDIV),S=Object.keys(X.BNSHAPE),pal=k=>k==='.'||X.PAL[k]!==undefined;let n=0;const keys=new Set();
  const chk=b=>{const r=X.bannerRows(b);ok(r.length===32&&r.every(s=>[...s].length===24&&[...s].every(pal)),'bannerRows '+JSON.stringify(b));n++;keys.add(X.bannerKey(b)+'|'+r.join(''));return r};
  for(const c1 of C)for(const c2 of C)if(c1!==c2)chk({c1,c2,emblem:E[(n*7)%E.length]});
  for(const e of E)chk({c1:'λ',c2:'c',emblem:e});
  for(const d of D)for(const s of S)for(const c3 of ['l','g','ρ'])chk({c1:'5',c2:'c',emblem:'tower',div:d,c3,shape:s});
  // each division and shape changes the flag; each shape keeps the flag's 24 x 32 box
  const base=X.bannerRows({c1:'5',c2:'c',c3:'g',emblem:'tower'}).join('');
  for(const d of D)if(d!=='plain')ok(X.bannerRows({c1:'5',c2:'c',c3:'g',emblem:'tower',div:d}).join('')!==base,'division '+d+' shows');
  for(const s of S)if(s!=='swallow')ok(X.bannerRows({c1:'5',c2:'c',emblem:'tower',shape:s}).join('')!==base,'shape '+s+' shows');
  ok(X.bannerRows({c1:'5',c2:'c',emblem:'tower',div:'pale',c3:'g'}).join('').includes(X.BANNERC.g.r[1]),'per pale paints the second colour');
  ok(X.bannerRows({c1:'5',c2:'c',emblem:'tower'},true).join('')!==base,'a flag without its emblem (picker previews)');
  console.log(n+' pixel flags: ok') }

section('old banners keep their look');
{ // the hash of every old colour pair x old emblem, as the 24x32 pixel flag before this change (commit "Round 2 contract")
  const h=crypto.createHash('sha1');for(const a of OLDC)for(const b of OLDC)for(const e of OLDE)h.update(X.bannerRows({c1:a,c2:b,emblem:e}).join('|'));
  ok(h.digest('hex')==='a9648a98c9d44406391d37d07d978b2c4a4623e8','old banners draw pixel for pixel as before');
  const h2=crypto.createHash('sha1');for(const a of OLDC)for(const b of OLDC)for(const e of OLDE)h2.update(X.emblemRows(e,a,b).join('|'));
  ok(h2.digest('hex')==='e37e9b5da2682640b21c577490af1888566d8453','old emblems unchanged');
  const f=X.bannerFix(null);ok(f.c1==='5'&&f.c2==='c'&&f.emblem==='swords'&&f.div==='plain'&&f.shape==='swallow'&&f.c3&&f.c3!==f.c1&&f.c3!==f.c2,'defaults '+JSON.stringify(f));
  const o=X.bannerFix({name:'Old',c1:'g',c2:'y',emblem:'boar'});ok(o.div==='plain'&&o.shape==='swallow'&&o.c3==='l'&&o.c1==='g'&&o.c2==='y'&&o.emblem==='boar'&&o.name==='Old','an old banner object gets the old look');
  ok(X.bannerKey({c1:'g',c2:'y',emblem:'boar'})==='bn:gyboar','old banner keys unchanged');
  const j=X.bannerFix({c1:'zz',c2:'zz',emblem:'nope',div:'<x>',c3:'q',shape:9,name:'  '},'Fallback');ok(j.c1==='5'&&j.c2==='c'&&j.emblem==='swords'&&j.div==='plain'&&j.shape==='swallow'&&j.c3==='q'&&j.name==='Fallback','junk repaired: '+JSON.stringify(j));
  const k=X.bannerFix({c1:'g',c2:'y',c3:'g',div:'pale'});ok(k.c3!=='g'&&k.c3!=='y','c3 differs from c1 and c2');
  const n=X.bannerFix({c1:'β',c2:'q',emblem:'dragon',div:'saltire',c3:'λ',shape:'pennon'});ok(n.c1==='β'&&n.c2==='q'&&n.emblem==='dragon'&&n.div==='saltire'&&n.c3==='λ'&&n.shape==='pennon','new options kept');
  ok(X.bnOf({n:'House X',c1:'g',c2:'y',emblem:'oak'}).name==='House X'&&X.bannerFix(X.bnOf({n:'House X',c1:'g',c2:'y',emblem:'oak'})).name==='House X','bnOf names a house banner');
  const ex={c1:'g',c2:'y',div:'bogus',c3:'g',shape:'pennon'};X.bnExtraFix(ex);ok(ex.div===undefined&&ex.c3===undefined&&ex.shape==='pennon','bnExtraFix drops only invalid fields');
  console.log('old look, defaults, repair: ok') }

section('houses and rivals');
{ X.seedRng(SEED);const r0=X.rnd(),r1=X.rnd();X.seedRng(SEED);for(let i=0;i<5;i++)X.bnVariety('house'+i+':'+SEED,'g','y');ok(X.rnd()===r0&&X.rnd()===r1,'bnVariety leaves the game stream alone');
  const v1=X.bnVariety('house0:5','g','y'),v2=X.bnVariety('house0:5','g','y');ok(JSON.stringify(v1)===JSON.stringify(v2)&&X.BNDIV[v1.div]&&X.BNSHAPE[v1.shape]&&v1.c3!=='g'&&v1.c3!=='y','deterministic');
  const seen={d:new Set(),s:new Set()};for(let i=0;i<200;i++){const v=X.bnVariety('s'+i,'g','y');seen.d.add(v.div);seen.s.add(v.shape)}ok(seen.d.size>=10&&seen.s.size===4,'variety spread');
  X.seedRng(SEED);X.newGame(true);closeAll(X);const G=X.G;
  ok(Array.isArray(G.houses)&&G.houses.every(h=>X.BNDIV[h.div]&&X.BNSHAPE[h.shape]&&X.BANNERC[h.c3]&&h.c3!==h.c1&&h.c3!==h.c2),'new houses carry a division and shape '+JSON.stringify(G.houses.map(h=>[h.div,h.shape])));
  ok(Array.isArray(G.rivals)&&G.rivals.every(r=>X.BNDIV[r.div]&&X.BNSHAPE[r.shape]),'new rivals carry a division and shape');
  const lb=X.lkRivalBn(G.rivals[0]);ok(lb.div===G.rivals[0].div&&lb.shape===G.rivals[0].shape,'lkRivalBn passes them on');
  // the same seed gives the same houses (looks included)
  const H=JSON.stringify(G.houses),R=JSON.stringify(G.rivals.map(r=>[r.c1,r.c2,r.emblem,r.div,r.c3,r.shape]));X.seedRng(SEED);X.newGame(true);closeAll(X);
  ok(JSON.stringify(X.G.houses)===H&&JSON.stringify(X.G.rivals.map(r=>[r.c1,r.c2,r.emblem,r.div,r.c3,r.shape]))===R,'same seed, same banners');
  // an old save: houses without the fields stay plain swallowtails after repair
  const g=X.clone(X.G);for(const h of g.houses){delete h.div;delete h.c3;delete h.shape}for(const r of g.rivals){delete r.div;delete r.c3;delete r.shape}g.banner={name:g.name,c1:'g',c2:'y',emblem:'boar'};
  X.repairSave(g);ok(g.houses.every(h=>h.div===undefined&&h.shape===undefined&&X.bannerFix(X.bnOf(h)).div==='plain'&&X.bannerFix(X.bnOf(h)).shape==='swallow'),'old houses keep the old look');
  ok(g.rivals.every(r=>r.div===undefined&&X.bannerFix(X.lkRivalBn(r)).div==='plain'),'old rivals keep the old look');
  ok(g.banner.div==='plain'&&g.banner.shape==='swallow'&&g.banner.c1==='g'&&g.banner.emblem==='boar','an old company banner is filled with the old look');
  const g2=X.clone(X.G);g2.houses[0].div='nope';g2.houses[0].c3=g2.houses[0].c1;g2.houses[0].shape='gonfalon';X.repairSave(g2);ok(g2.houses[0].div===undefined&&g2.houses[0].c3===undefined&&g2.houses[0].shape==='gonfalon','junk house fields repaired');
  console.log('houses '+JSON.stringify(G.houses.map(h=>h.div+'/'+h.shape))+', rivals '+JSON.stringify(G.rivals.map(r=>r.div+'/'+r.shape))+': ok') }

section('setup dialog and banner sheet');
{ X.newCompanySetup();ok(X.NCS.bn&&X.NCS.bn.div==='plain'&&X.NCS.bn.shape==='swallow','setup starts plain');
  const html=X.bnPickHTML(X.NCS.bn,'ncBn','ncShuffle');ok(/Division/.test(html)&&/Shape/.test(html)&&/Emblem/.test(html)&&/ncShuffle\(\)/.test(html)&&!/Second colour/.test(html),'pickers (no second colour while plain)');
  ok((html.match(/class="ncs-sw[ "]/g)||[]).length===2*Object.keys(X.BANNERC).length,'field and charge swatches for every colour');
  ok((html.match(/class="ncs-em[ "]/g)||[]).length===Object.keys(X.EMBLEMS).length&&(html.match(/class="ncs-dv[ "]/g)||[]).length===Object.keys(X.BNDIV).length+Object.keys(X.BNSHAPE).length,'every emblem, division and shape offered');
  X.ncBn('div','quarter');X.ncBn('shape','pennon');X.ncBn('emblem','owl');X.ncBn('c3','β');ok(X.NCS.bn.div==='quarter'&&X.NCS.bn.shape==='pennon'&&X.NCS.bn.emblem==='owl'&&X.NCS.bn.c3==='β','ncBn sets them');
  ok(X.NCS.shape!=='pennon','the map shape is its own choice');ok(/Second colour/.test(X.bnPickHTML(X.NCS.bn,'ncBn','ncShuffle')),'second colour shown for a division');
  X.ncBn('c1','β');ok(X.NCS.bn.c1==='β'&&X.NCS.bn.c3!=='β'&&X.NCS.bn.c2!=='β','colours stay distinct');
  for(let i=0;i<40;i++){X.ncShuffle();const b=X.NCS.bn,f=X.bannerFix(b);ok(f.c1===b.c1&&f.c2===b.c2&&f.c3===b.c3&&f.div===b.div&&f.shape===b.shape&&f.emblem===b.emblem,'roll gives a valid banner '+JSON.stringify(b))}
  X.NCS.bn={c1:'λ',c2:'c',emblem:'eagle',div:'bordure',c3:'g',shape:'gonfalon'};X.ncBegin();closeAll(X);const G=X.G;
  ok(G.banner.c1==='λ'&&G.banner.emblem==='eagle'&&G.banner.div==='bordure'&&G.banner.c3==='g'&&G.banner.shape==='gonfalon','Begin raises the chosen banner '+JSON.stringify(G.banner));
  X.bannerEditSheet(null);ok(X.BNE&&X.BNE.div==='bordure','the banner sheet opens on the company banner');X.bneSet('div','saltire');X.bneSet('shape','banner');X.bneSet('c3','x');X.bneSet('emblem','ship');
  ok(G.banner.div==='bordure','nothing changes before Save');X.bneSave();ok(X.G.banner.div==='saltire'&&X.G.banner.shape==='banner'&&X.G.banner.c3==='x'&&X.G.banner.emblem==='ship'&&X.G.banner.name,'Save raises it '+JSON.stringify(X.G.banner));
  X.mode='world';ok(X.save(),'save');const r=X.readSave();ok(r.state==='ok','read back: '+r.state);ok(JSON.stringify(r.g.banner)===JSON.stringify(X.G.banner),'banner survives the save round trip');
  ok(r.g.houses.every((h,i)=>h.div===X.G.houses[i].div&&h.shape===X.G.houses[i].shape),'house looks survive the round trip');
  ok(/class="bnr /.test(X.bannerHTML(X.G.banner,32))&&/class="bnr em /.test(X.emblemHTML('owl','c','5',32)),'bannerHTML / emblemHTML in node (pixel only)');
  console.log('setup, Roll, banner sheet, save: ok') }

/* ---------- browser: painted flags ---------- */
let pw=null;if(!ARGV.includes('--no-browser'))try{pw=require('playwright')}catch(e){pw=null}
const HTML=path.join(__dirname,'..','index.html');
if(!pw||!fs.existsSync(HTML)){console.log('\n(browser part skipped: '+(pw?'no index.html, run node build.js index.html':'no Playwright')+')\n\nbanners: ok');process.exit(0)}
section('painted flags (browser)');
(async()=>{const b=await pw.chromium.launch(),p=await b.newPage({viewport:{width:800,height:600},deviceScaleFactor:2}),errs=[];p.on('pageerror',e=>errs.push(String(e)));
 p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
 await p.goto('file://'+HTML);await p.waitForTimeout(300);
 const r=await p.evaluate(()=>{const out={bad:[],n:0};const C=Object.keys(BANNERC),E=Object.keys(EMBLEMS),D=Object.keys(BNDIV),S=Object.keys(BNSHAPE);
  const opaque=c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>200)n++;return n/(c.width*c.height)};
  const test=(b,lab)=>{const c=bnPaintCanvas(b,96);out.n++;if(!c||c.width!==72||c.height!==96){out.bad.push(lab+': no canvas');return}const o=opaque(c);if(o<.45||o>.97)out.bad.push(lab+': coverage '+o.toFixed(2))};
  for(const e of E){test({c1:'g',c2:'l',emblem:e},'emblem '+e);const c=bnEmCanvas(e,'c','5',64);out.n++;if(!c||opaque(c)<.08)out.bad.push('emblem alone '+e)}
  for(const d of D)for(const s of S)test({c1:'λ',c2:'c',c3:'l',emblem:'lion',div:d,shape:s},d+'/'+s);
  for(const c of C)test({c1:c,c2:c==='c'?'l':'c',emblem:'tower'},'colour '+c);
  // the painted rules: classes in the HTML, rules in <style id="bnr-hd">, disabled at Detail Low and back at High
  const host=document.createElement('div');document.body.appendChild(host);host.innerHTML=bannerHTML({c1:'β',c2:'q',emblem:'owl',div:'pale',c3:'λ',shape:'pennon'},64)+emblemHTML('dragon','c','5',32);
  const st=document.getElementById('bnr-hd'),i=host.querySelector('.bnr');out.rules=st&&st.sheet?st.sheet.cssRules.length:0;out.hdBg=getComputedStyle(i).backgroundImage.slice(0,30);out.hdRender=getComputedStyle(i).imageRendering;
  SET.detail='low';artChanged();out.lowBg=getComputedStyle(i).backgroundImage.slice(0,30);out.lowRender=getComputedStyle(i).imageRendering;out.lowDisabled=st.disabled;
  SET.detail='high';artChanged();out.highAgain=getComputedStyle(i).backgroundImage===out.hdBgFull||!st.disabled;
  out.ms=0;const t0=performance.now();for(let k=0;k<10;k++)bnPaintCanvas({c1:C[k],c2:'c',emblem:E[k+10],div:D[k],shape:S[k%4]},256);out.ms=(performance.now()-t0)/10;return out});
 ok(!r.bad.length,'painted flags: '+r.bad.slice(0,8).join('; '));
 ok(r.rules>=2,'painted rules written: '+r.rules);ok(/data:image\/png/.test(r.hdBg)&&r.hdRender==='auto','Detail High shows the painted image '+r.hdBg+' '+r.hdRender);
 ok(r.lowDisabled&&r.lowRender!=='auto','Detail Low switches the painted flags off live ('+r.lowRender+')');ok(r.highAgain,'and back on');
 ok(r.ms<40,'a 256 px painted flag in '+r.ms.toFixed(1)+' ms');
 ok(!errs.length,'page errors: '+errs.join('\n'));
 console.log(r.n+' painted renders, '+r.rules+' rules, '+r.ms.toFixed(1)+' ms per 256 px flag: ok');
 await b.close();console.log('\nbanners: ok')})();
