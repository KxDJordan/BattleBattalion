// Map variety test (replay round): world shapes and biome mixes (39-mapshapes.js, 40-world.js genWorldBase).
// Plain node, no browser:  node test/mapshapes.js [--quick]
// Checks: 'continent' + 'temperate' is the old generator byte for byte (md5 of the base world for fixed seeds); every shape and every
// climate, over several seeds and sizes: deterministic, all towns on the mainland and reachable, all on the road net, enough ground of
// each kind, ruins placed, the East region placed; the climates skew the ground as they claim; campaigns of every shape: seeded
// 'Random', caravan routes between every pair of towns, patrols, four days marched, save and load regenerate the same world; old
// saves (no shape) read as continent and bad keys are repaired; the setup section renders. Prints the generation time per shape.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261114,SRC=path.join(__dirname,'..','src');
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



/* ---------- map variety ---------- */
const crypto=require('crypto');
const hashBase=b=>{const h=crypto.createHash('md5');for(const k of ['tiles','ok','river','road','spd'])h.update(Buffer.from(b[k].buffer));h.update(JSON.stringify(b.towns)+JSON.stringify(b.sites)+b.size);return h.digest('hex')};
const X=makeContext(),SH=Object.keys(X.MAPSHAPES),BI=Object.keys(X.MAPBIOMES),QUICK=ARGV.includes('--quick');
const SEEDS=QUICK?[1,42,12345]:[1,7,42,12345,987654321,-5,555,20261114];

section('continent: the generator of before, byte for byte');
// md5 of the base world (tiles, ok, river, road, spd, towns, sites, size) made by the generator before this change
const BEFORE={'small:1':'e684bfccaa42ad9a18c670c8d645cf22','small:7':'777ac4fb104d286e93042e0a89b6f647','small:42':'d7ed26693d8e8933864aca80546faea8','small:12345':'051769c803d5093e64e5065850f21d2e',
 'medium:42':'08df9d4916d9fab3fcaf2f5045b706c6','large:7':'f506820a445365d971d56a9015e7bbf1','vast:1':'83770d589d536f1d5d0b403d778c9171'};
for(const k in BEFORE){const [sz,seed]=k.split(':');X.setWorldSize(sz);X.setWorldShape('continent','temperate');ok(hashBase(X.genWorldBase(+seed))===BEFORE[k],'continent '+k+' differs from the old generator')}
X.setWorldShape(undefined,undefined);ok(X.WSHK==='continent'&&X.WBMK==='temperate','defaults');ok(X.msGen(1,1,1)===null,'continent + temperate takes the old code path');
console.log('  continent matches the old generator for '+Object.keys(BEFORE).length+' size/seed pairs');

section('every shape and climate: deterministic, connected, roads, ground, the East');
const tileCount=w=>{const c=new Array(8).fill(0);for(let i=0;i<w.tiles.length;i++)if(w.ok[i])c[w.tiles[i]]++;return c};
const timing={};
function checkWorld(s,b,sz,seed){X.setWorldSize(sz);X.setWorldShape(s,b);const t0=Date.now(),base=X.genWorldBase(seed),ms=Date.now()-t0;(timing[s+'/'+sz]=timing[s+'/'+sz]||[]).push(ms);
 const tag=`${s}/${b}/${sz}/${seed}`,AK=X.worldK(),WN=X.WN,NT=X.WORLDSZ[sz].towns;
 X.setWorldShape('continent','temperate');X.genWorldBase(seed+1);X.setWorldShape(s,b);ok(hashBase(X.genWorldBase(seed))===hashBase(base),tag+': not deterministic');
 const w=X.genWorld(seed);X.W=w;
 ok(w.towns.length>=NT-3,tag+': only '+w.towns.length+' towns');
 // every town on the mainland and reachable on foot from the first
 const T=w.towns.map(t=>[Math.floor(t.x/32),Math.floor(t.y/32)]);
 for(let i=0;i<T.length;i++){ok(w.ok[T[i][1]*WN+T[i][0]],tag+': town '+i+' off the mainland');if(i)ok(X.findPath(T[0][0],T[0][1],T[i][0],T[i][1]),tag+': town '+i+' unreachable')}
 // the road net joins every town (flood along road links)
 const seen=new Uint8Array(WN*WN),q=[T[0][1]*WN+T[0][0]];seen[q[0]]=1;while(q.length){const k=q.pop(),m=w.road[k];for(let j=0;j<4;j++)if(m&1<<j){const n=k+[-WN,1,WN,-1][j];if(!seen[n]){seen[n]=1;q.push(n)}}}
 T.forEach((t,i)=>ok(seen[t[1]*WN+t[0]],tag+': town '+i+' not on the road net'));
 // enough ground of each kind for battles (on the mainland); sites placed; land enough
 const c=tileCount(w),land=c.reduce((a,v)=>a+v,0);
 ok(c[1]+c[2]+c[3]>=land*.25,tag+': too little plains/forest/hills '+c);ok(c[3]>=20*AK,tag+': too few hills '+c[3]);
 ok(w.sites.length>=Math.round(8*Math.pow(AK,.9))-3,tag+': only '+w.sites.length+' ruins');ok(w.size>=900*AK,tag+': mainland '+w.size);
 for(const st of w.sites){const i=Math.floor(st.y/32)*WN+Math.floor(st.x/32);ok(w.ok[i],tag+': a ruin off the mainland')}
 // the East: a region of its own with towns in it
 ok(w.east&&w.eastT&&w.eastT.length>=1,tag+': no East');let ne=0;for(const v of w.east)ne+=v;ok(ne>=60*AK,tag+': East region small '+ne);
 return c}
const sums={};
for(const s of SH)for(const seed of SEEDS){const c=checkWorld(s,'temperate','small',seed);if(s==='continent'){}}
for(const b of BI)for(const seed of SEEDS){const c=checkWorld('continent',b,'small',seed);const S=sums[b]=sums[b]||new Array(8).fill(0);c.forEach((v,i)=>S[i]+=v)}
for(const s of SH)checkWorld(s,QUICK?'mixed':'wild','medium',7);
if(!QUICK){for(const s of SH){checkWorld(s,'frozen','large',3);checkWorld(s,'dry','vast',11)}}
// mixes skew the ground the way they say
const frac=(b,ix)=>{const S=sums[b],t=S.reduce((a,v)=>a+v,0);return ix.reduce((a,i)=>a+S[i],0)/t};
ok(frac('frozen',[7])>frac('temperate',[7])*1.8,'frozen north: not snowy enough');ok(frac('dry',[6])>frac('temperate',[6])*1.8,'dry south: not dry enough');
ok(frac('dry',[7])<frac('temperate',[7])*.5,'dry south: too much snow');ok(frac('wild',[2,5])>frac('temperate',[2,5])*1.3,'wild: not wild enough');
for(const b of BI)console.log('  '+b.padEnd(10)+' plains '+(frac(b,[1])*100|0)+'% forest '+(frac(b,[2])*100|0)+'% hills '+(frac(b,[3])*100|0)+'% swamp '+(frac(b,[5])*100|0)+'% desert '+(frac(b,[6])*100|0)+'% snow '+(frac(b,[7])*100|0)+'%');
for(const k in timing){const L=timing[k];console.log('  gen '+k.padEnd(18)+' '+Math.round(L.reduce((a,v)=>a+v,0)/L.length)+' ms avg ('+L.length+')')}

section('campaigns: random choice, caravans and patrols, save round trip, old saves');
X.setWorldSize('small');X.setWorldShape('continent','temperate');
const keepAlive=G=>{G.crowns=1e7;G.food=1e5;G.roster.forEach(m=>m.hp=X.calc(m).hp)};
const raise=(seed,o)=>{X.seedRng(seed);X.newGame(true,Object.assign({},o));closeAll(X);return X.G};
let g=raise(9,{shape:'random',biomes:'random'});const r1=[g.seed,g.shape||'continent',g.biomes||'temperate'].join();g=raise(9,{shape:'random',biomes:'random'});
ok([g.seed,g.shape||'continent',g.biomes||'temperate'].join()===r1,'random shape is seeded');
const got=new Set();for(let s=1;s<=14;s++){X.seedRng(s);got.add(X.rollShape(X.rnd))}ok(got.size>=4,'random shape varies: '+[...got]);
g=raise(9,{});ok(g.shape===undefined&&g.biomes===undefined,'default campaign stores no shape');
for(const s of SH){const b=BI[SH.indexOf(s)%BI.length];g=raise(31+SH.indexOf(s),{shape:s,biomes:b});
 ok((g.shape||'continent')===s&&(g.biomes||'temperate')===b,s+': stored '+g.shape+'/'+g.biomes);
 const n=g.towns.length;let bad=0;for(let a=0;a<n;a++)for(let c=0;c<n;c++)if(a!==c&&!X.wsRoute(a,c))bad++;ok(!bad,s+': '+bad+' town pairs without a caravan route');
 for(const h of g.houses){const p=X.wsSpawnPatrol(h,false);ok(!X.houseTowns(h.id).length||p,s+': house '+h.id+' cannot send a patrol')}
 for(let d=0;d<4;d++){keepAlive(g);X.advanceTime(24);closeAll(X)}
 const tiles=Buffer.from(X.W.tiles).toString('base64'),towns=JSON.stringify(g.towns.map(t=>[t.name,t.x,t.y]));
 X.mode='world';ok(X.save(),s+': save');X.setWorldShape('continent','temperate');X.W=null;X.G=null;X.continueGame();closeAll(X);
 ok(X.G&&(X.G.shape||'continent')===s,s+': shape after load');ok(Buffer.from(X.W.tiles).toString('base64')===tiles,s+': the world regenerates the same');
 ok(JSON.stringify(X.G.towns.map(t=>[t.name,t.x,t.y]))===towns,s+': towns after load');ok(X.okAt(X.G.p.x,X.G.p.y),s+': company on land')}
console.log('  '+SH.length+' shapes raised, marched 4 days, saved and loaded');
// an old save (no shape) and a broken one
g=raise(12,{shape:'inland',biomes:'wild'});X.mode='world';X.save();const raw=JSON.parse(X.store.get(X.SAVEKEY));
delete raw.shape;delete raw.biomes;X.store.set(X.SAVEKEY,JSON.stringify(raw));let r=X.readSave();ok(r.state==='ok'&&r.g.shape===undefined,'old save reads as continent');
raw.shape='moon';raw.biomes=7;X.store.set(X.SAVEKEY,JSON.stringify(raw));r=X.readSave();ok(r.state==='ok'&&r.g.shape==='continent'&&r.g.biomes==='temperate','bad keys repaired: '+r.g.shape+'/'+r.g.biomes);
ok(X.WSHK==='inland'&&X.WBMK==='wild','readSave restores the running shape');

section('setup section');
X.NCS.shape='archipelago';X.NCS.biomes='random';const html=X.ncShapeHTML();ok(/Archipelago/.test(html)&&/Random/.test(html)&&/Frozen north/.test(html),'setup html');
ok((html.match(/data-msp=/g)||[]).length===SH.length+BI.length,'one preview per choice');
console.log('\nmapshapes: all OK');
