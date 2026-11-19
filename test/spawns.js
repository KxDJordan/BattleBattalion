// Spawns test: habitats, the night and the wilds (40s-spawns.js).   node test/spawns.js [--seed N] [--dump file.json]
// Loads src/*.js like test/world.js (vm context, DOM stubs) and checks, over many seeded spawns from many places on the map:
//   habitat weights are kept (webspinners mostly in forests; serpents only in forests, deserts and fens, both forests and deserts used;
//   wolves rarely in deserts; goblins favour the hills; brigands the roads), the dead never form by day, rise at dusk and are gone after
//   dawn (chasing or not), while bands bound to a crisis, a contract or an event stay; band strength rises with the distance from
//   civilization (monotone on average) and stays gentle near the towns; the battle is fought on the band's own ground with the family's
//   own warband; p.fam / p.wild survive a save and bad values are repaired; the same seed spawns the same bands.
// --dump writes the samples (and the world's tiles) for the pictures (tools: see the report).
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261119,SRC=path.join(__dirname,'..','src');
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

const DUMP=ARGV.includes('--dump')?ARGV[ARGV.indexOf('--dump')+1]:null;
const X=makeContext();
const fresh=s=>{X.seedRng(s);X.newGame(true);closeAll(X);const G=X.G;G.grace=0;return G};
const TS=()=>X.TS,WN=()=>X.WN;
const tileOf=(x,y)=>Math.floor(y/X.TS)*X.WN+Math.floor(x/X.TS);
const bio=(x,y)=>X.TERRN[X.W.tiles[tileOf(x,y)]];
const P0=X.companyPower;
/* n spawns from n places on the mainland (a local stream picks the places, the game's rnd() does the rest) at hour h and company power pw */
function sample(G,n,h,pw,seed){const W=X.W,okT=[];for(let i=0;i<W.ok.length;i++)if(W.ok[i])okT.push(i);let s=seed>>>0;const r=()=>(s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296;
 X.companyPower=()=>pw;const out=[];try{for(let k=0;k<n;k++){const i=okT[Math.floor(r()*okT.length)];G.p={x:(i%X.WN+.5)*X.TS,y:(((i/X.WN)|0)+.5)*X.TS};G.hour=h;G.parties.length=0;
  const p=X.spawnParty();if(!p)continue;const ti=tileOf(p.x,p.y),H=X.habFields();out.push({f:p.f,fam:p.fam||p.f,i:ti,x:Math.round(p.x),y:Math.round(p.y),b:bio(p.x,p.y),cd:H.cd[ti],fd:H.fd[ti],md:X.worldFields().md[ti],mult:p.mult,wild:p.wild||0,h})}}
 finally{X.companyPower=P0}G.parties.length=0;return out}
const share=(L,pred)=>L.length?L.filter(pred).length/L.length:0;
const pct=x=>(100*x).toFixed(0)+'%';

section('habitats');
const G=fresh(SEED);
const N=1500;
const day=sample(G,N,13,120,SEED^1),night=sample(G,N,23,120,SEED^2),young=sample(G,600,13,6,SEED^3);
{ const fams={};for(const s of day.concat(night))(fams[s.fam]||(fams[s.fam]=[])).push(s);
  const tab=Object.keys(fams).sort().map(k=>{const L=fams[k],by={};for(const s of L)by[s.b]=(by[s.b]||0)+1;return k+' '+L.length+': '+Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([b,n])=>b+' '+pct(n/L.length)).join(', ')});
  console.log(tab.join('\n'));
  const land={};let tot=0;for(let i=0;i<X.W.ok.length;i++)if(X.W.ok[i]){const b=X.TERRN[X.W.tiles[i]];land[b]=(land[b]||0)+1;tot++}
  console.log('the land: '+Object.entries(land).sort((a,b)=>b[1]-a[1]).map(([b,n])=>b+' '+pct(n/tot)).join(', '));
  const sp=fams.spider||[],sn=fams.serpent||[],wo=fams.wolf||[],gb=fams.gob||[],ob=fams.owlbear||[],ud=(fams.undead||[]),bd=fams.bandit||[];
  ok(sp.length>=40,'webspinner bands are met: '+sp.length);ok(share(sp,s=>s.b==='forest')>=.75,'webspinners mostly in forests: '+pct(share(sp,s=>s.b==='forest')));
  ok(share(sp,s=>s.b==='forest')>2.5*(land.forest/tot),'webspinners favour the forest far beyond its share of the land');
  ok(sn.length>=30&&sn.every(s=>['forest','desert','swamp'].includes(s.b)),'serpents only in forests, deserts and fens: '+sn.filter(s=>!['forest','desert','swamp'].includes(s.b)).map(s=>s.b));
  ok(sn.some(s=>s.b==='forest')&&sn.some(s=>s.b==='desert'),'serpents in both forests and deserts');
  ok(ob.length>=5&&share(ob,s=>s.b==='forest')===1&&share(ob,s=>s.fd>=2)>=.7,'owlbears in the deep forest: '+pct(share(ob,s=>s.fd>=2)));
  ok(share(wo,s=>s.b==='desert')<.05,'wolves rarely in deserts: '+pct(share(wo,s=>s.b==='desert')));
  const hillLand=(land.hills||0)/tot;ok(share(gb,s=>s.b==='hills')>1.5*hillLand,'goblins favour the hills: '+pct(share(gb,s=>s.b==='hills'))+' of goblin bands, '+pct(hillLand)+' of the land');
  ok(bd.length&&bd.reduce((a,s)=>a+s.cd,0)/bd.length<day.reduce((a,s)=>a+s.cd,0)/day.length,'brigands keep nearer the roads than the average band');
  ok(young.every(s=>X.FACT[s.f].tier==='early'||s.f==='undead'),'a new company still meets only early bands: '+[...new Set(young.map(s=>s.f))].join());
  for(const s of day.concat(night)){const T=X.FACT[s.f].tier;if(T!=='early'&&T!=='crisis')ok(X.biomeHas(s.i,X.FACT[s.f].biomes),s.f+' band off its biomes ('+s.b+')')}
  console.log('habitats: ok') }

section('the night');
{ ok(day.every(s=>s.f!=='undead'&&s.f!=='dead')&&young.every(s=>s.f!=='undead'),'the dead never form by day: '+day.filter(s=>s.f==='undead').length);
  const un=night.filter(s=>s.f==='undead');ok(un.length>=N*.08,'the dead walk at night: '+un.length+' of '+night.length);
  ok(share(un,s=>s.b==='swamp')>share(night,s=>s.b==='swamp'),'the dead favour the fens');
  // the dusk rising, the dawn and the exempt
  const G2=fresh(SEED+7);G2.hour=19.5;G2.parties.length=0;for(let i=0;i<6;i++)X.spawnParty();ok(!G2.parties.some(p=>p.f==='undead'),'no dead before dusk');
  X.advanceTime(1);ok(X.isNight()&&G2.parties.filter(p=>X.nightBound(p)).length>=1,'the dead rise at dusk: '+G2.parties.map(p=>p.f).join());
  const t=G2.towns[1]||G2.towns[0];
  const host=X.wsAdd({x:G2.p.x+3*X.TS,y:G2.p.y,f:'undead',goal:'raid',to:0,mult:1,pts:[{x:t.x,y:t.y}],cr:'host'}),quest=X.wsAdd({x:G2.p.x,y:G2.p.y+3*X.TS,f:'undead',goal:'roam',mult:1,quest:1}),
   ev=X.wsAdd({x:G2.p.x,y:G2.p.y-3*X.TS,f:'undead',goal:'roam',mult:1,ev:1}),chase=X.wsAdd({x:G2.p.x+1.5*X.TS,y:G2.p.y,f:'undead',goal:'roam',mult:1,ch:1}),free=X.wsAdd({x:G2.p.x-2*X.TS,y:G2.p.y,f:'undead',goal:'nest',mult:1});
  ok(X.nightBound(chase)&&X.nightBound(free)&&!X.nightBound(host)&&!X.nightBound(quest)&&!X.nightBound(ev),'who is night-bound');
  const before=G2.parties.length;let msg=null;const T0=X.toast;X.toast=m=>{msg=m};
  for(let h=0;h<11;h++)X.advanceTime(1);X.toast=T0;
  ok(!X.isNight()&&G2.hour>=5&&G2.hour<8,'morning: '+G2.hour);ok(!G2.parties.some(p=>X.nightBound(p)),'every free band of the dead is gone after dawn: '+JSON.stringify(G2.parties.filter(p=>X.nightBound(p))));
  ok(!G2.parties.includes(chase)&&!G2.parties.includes(free),'the chasing band and the nest band sank too');
  ok(G2.parties.includes(host)&&G2.parties.includes(quest)&&G2.parties.includes(ev),'crisis hosts, quest and event bands persist');
  ok(msg==='The dead return to their graves at dawn','the dawn toast when the company sees them go: '+msg);
  ok(X.SINKS.length>=1,'the sinking bands are drawn going down');
  ok(G2.parties.filter(p=>(!p.goal||p.goal==='roam')&&!p.quest&&!p.ev).length>=X.worldBands()-2,'the land is refilled with day bands: '+G2.parties.length+' (was '+before+')');
  // a battle under way is untouched: time does not move in battle, and nightTick refuses to run there
  const G3=fresh(SEED+8);G3.hour=4.9;const b0=X.wsAdd({x:G3.p.x+X.TS,y:G3.p.y,f:'undead',goal:'roam',mult:1});const m0=X.mode;X.mode='battle';X.G.hour=6;X.nightTick(4.9+G3.day*24);ok(G3.parties.includes(b0),'a battle under way keeps its foes');X.mode=m0;
  X.nightTick(G3.day*24+4.9);ok(!G3.parties.includes(b0),'and they go at the first tick after it');
  // an old save loaded by day: its dead go at the next tick
  const G4=fresh(SEED+9);G4.hour=12;const old=X.wsAdd({x:G4.p.x+4*X.TS,y:G4.p.y,f:'undead',goal:'roam',mult:.9});const sv=X.clone(G4);X.repairSave(sv);ok(sv.parties.some(p=>p.id===old.id),'the save keeps it');
  X.advanceTime(.05);ok(!G4.parties.includes(old),'a daytime save loses its dead at the next tick');
  // nests of the dead send bands only by night
  const G5=fresh(SEED+10);G5.nests=[{id:G5.nid++,x:G5.p.x+12*X.TS,y:G5.p.y,f:'undead',str:2.5,day:1,n:9}];G5.parties.length=0;G5.hour=12;X.wsNests([]);ok(!G5.parties.some(p=>p.f==='undead'),'no nest band of the dead by day');
  G5.hour=0;G5.nests[0].n=9;X.wsNests([]);ok(G5.parties.some(p=>p.f==='undead'),'a nest of the dead sends a band at midnight');
  console.log('the night: ok') }

section('the wilds');
{ const all=day.concat(night).filter(s=>X.FACT[s.f].tier!=='end'),bins=[[0,3],[4,7],[8,11],[12,15],[16,99]],L=[];
  for(const [a,b] of bins){const S=all.filter(s=>s.cd>=a&&s.cd<=b);const m=S.reduce((x,s)=>x+s.mult,0)/Math.max(1,S.length);L.push({a,b,n:S.length,m,mid:share(S,s=>X.FACT[s.f].tier!=='early')})}
  console.log(L.map(o=>`cd ${o.a}-${o.b}: ${o.n} bands, mult ${o.m.toFixed(3)}, not early ${pct(o.mid)}`).join('\n'));
  const used=L.filter(o=>o.n>=25);ok(used.length>=3,'bands at several distances');for(let i=1;i<used.length;i++)ok(used[i].m>used[i-1].m-.005,'strength rises with distance: '+used.map(o=>o.m.toFixed(3)));
  ok(used[used.length-1].m>used[0].m*1.2,'the wilds are clearly stronger');
  ok(L[0].m<=.9*1.0,'near the towns bands are no harder than before (old mean .9): '+L[0].m.toFixed(3));
  ok(X.wildK(0)===X.WILD.near&&X.wildK(1)===X.WILD.far&&X.wildOf(X.WILD.d0)===0&&X.wildOf(X.WILD.d1)===1,'the curve');
  const mid=used.map(o=>o.mid);ok(mid[mid.length-1]>=mid[0],'stronger kinds further out: '+mid.map(pct));
  // elites: a wild band carries more
  const G6=fresh(SEED+11);G6.roster.forEach(m=>{m.lvl=6;m.field=true});const o={f:'orc',mult:1,src:{type:'sim'}},w={f:'orc',mult:1,wild:1,src:{type:'sim'}};
  ok(X.eliteShare(w)>X.eliteShare(o)*1.8,'a band from the wilds brings more elites: '+X.eliteShare(o)+' -> '+X.eliteShare(w));
  G6.roster.forEach(m=>{m.lvl=1});ok(X.eliteShare(o)===0&&X.eliteShare(w)>0,'even a young company meets the odd elite deep in the wilds');
  console.log('the wilds: ok') }

section('the battle');
{ const G7=fresh(SEED+12);X.companyPower=()=>120;
  for(const [fam,b] of [['spider','forest'],['wolf','snow'],['serpent','desert'],['gob','hills']]){
   let i=-1;for(let k=0;k<X.W.ok.length;k++)if(X.W.ok[k]&&X.TERRN[X.W.tiles[k]]===b){i=k;break}if(i<0){console.log('no '+b+' on this map');continue}
   const H=X.HABF[fam],p=X.wsAdd({x:(i%X.WN+.5)*X.TS,y:(((i/X.WN)|0)+.5)*X.TS,f:H.f,goal:'roam',mult:1,fam:fam===H.f?undefined:fam});if(fam===H.f)delete p.fam;
   const o=X.partyBattle(p);ok(o.biome===b,fam+' fights on its own ground: '+o.biome);const pv=X.battlePreview(o);ok(pv.bk===b,'the battle map is '+b+': '+pv.bk);
   if(H.units){const ids=X.previewEnemies(o);ok(ids.length&&ids.every(id=>H.units.some(u=>u[0]===id))&&ids.filter(id=>id===H.units[0][0]).length>=ids.length/2,fam+' bring their own: '+ids.join())}}
  X.companyPower=P0;console.log('the battle: ok') }

section('saves and determinism');
{ const G8=fresh(SEED+13);G8.hour=23;G8.parties.length=0;X.companyPower=()=>120;for(let i=0;i<30;i++)X.spawnParty();X.companyPower=P0;
  ok(G8.parties.some(p=>p.fam)&&G8.parties.some(p=>p.wild>0),'bands carry their family and their wildness');
  const sv=X.clone(G8);sv.parties[0].fam='dragon';sv.parties[1].wild='x';sv.parties[2].wild=7;X.repairSave(sv);
  ok(sv.parties.find(p=>p.id===G8.parties[0].id).fam===undefined&&sv.parties.find(p=>p.id===G8.parties[1].id).wild===undefined&&sv.parties.find(p=>p.id===G8.parties[2].id).wild===1,'bad family or wildness repaired');
  ok(sv.parties.filter(p=>p.fam).every(p=>X.HABF[p.fam].f===p.f),'families match their faction');
  const run=s=>{const G=fresh(s);G.hour=22;G.parties.length=0;for(let i=0;i<25;i++)X.spawnParty();return JSON.stringify(G.parties.map(p=>[p.f,p.fam,Math.round(p.x),Math.round(p.y),p.mult.toFixed(4),p.wild]))};
  ok(run(SEED+14)===run(SEED+14),'the same seed spawns the same bands');ok(run(SEED+14)!==run(SEED+15),'another seed, other bands');
  console.log('saves and determinism: ok') }

if(DUMP){const W=X.W;fs.writeFileSync(DUMP,JSON.stringify({WN:X.WN,TS:X.TS,tiles:Array.from(W.tiles),ok:Array.from(W.ok),road:Array.from(W.road),towns:G.towns.map(t=>({x:t.x,y:t.y,n:t.name})),cd:Array.from(X.habFields().cd),day,night,
 curve:Array.from({length:25},(_,d)=>({d,k:X.wildK(X.wildOf(d))}))}));console.log('dumped '+DUMP)}
console.log('\nspawns test passed');
