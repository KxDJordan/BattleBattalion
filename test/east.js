// East test (phase 8a): the Eastern region, the Shogunate, eastern gear and soldiers, the Eastern War, saves.
// Plain node, no browser:  node test/east.js [--seed N]
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261114,TURNCAP=6000,SRC=path.join(__dirname,'..','src');
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
const HOOKED={gen:/eastGen/.test(String(X.genWorld)),init:/eastInit/.test(String(X.factionsInit))||/eastInit/.test(String(X.createCampaign)),day:/eastDay/.test(String(X.worldDay))};
const fresh=s=>{X.seedRng(s);X.newGame(true);closeAll(X);if(!HOOKED.init)X.eastInit(X.G);return X.G};
const keepAlive=G=>{G.crowns=1e7;G.food=1e5;G.roster.forEach(m=>m.hp=X.calc(m).hp)};
// a day of the world; hosts near the company march too (the real-time march only runs while the company travels)
const day=G=>{keepAlive(G);X.advanceTime(24);if(!HOOKED.day)X.eastDay();closeAll(X);
 for(const p of G.parties)if(p.ew&&p.siege==null&&Math.hypot(p.x-G.p.x,p.y-G.p.y)<=X.WSIM.live*X.TS)X.wsStep(p)};
console.log('hooks in place:',JSON.stringify(HOOKED));

section('the eastern region');
{ for(const s of [SEED,SEED+1,SEED+2,SEED+3]){const w1=X.genWorld(s),a=Array.from(X.eastRegion(w1).mask).join('');X.eastGen(w1);
   const w2=X.genWorld(s);X.eastGen(w2);ok(Array.from(w2.east).join('')===a,'the region is deterministic '+s);
   ok(w2.eastT.length>=1&&!w2.eastT.includes(0),'eastern towns, never the starting town '+s+': '+w2.eastT);
   const xs=w2.towns.map(t=>t.x),cut=Math.min(...w2.eastT.map(i=>xs[i]));ok(w2.towns.every((t,i)=>i===0||w2.eastT.includes(i)||t.x<=cut),'the eastern towns are the east-most '+s);
   let n=0,sx=0;for(let i=0;i<w2.east.length;i++)if(w2.east[i]){n++;sx+=i%X.WN;ok(w2.tiles[i]!==0,'only land is eastern')}ok(n>30,'the region has room: '+n+' tiles');ok(sx/n>X.WN*.55,'the region lies in the east: mean x '+(sx/n).toFixed(1));
   for(const i of w2.eastT)ok(X.EASTN.towns.includes(w2.towns[i].name),'eastern town name '+w2.towns[i].name)}
  console.log('region deterministic, east-most towns, land only, eastern names: ok') }

section('a new game: the Shogunate');
let G0;
{ const G=G0=fresh(SEED);ok(G.east&&G.east.n&&G.east.lord&&X.BANNERC[G.east.c1]&&X.BANNERC[G.east.c2]&&X.EMBLEMS[G.east.emblem],'G.east shape '+JSON.stringify(G.east));
  const E=X.eastTowns();ok(E.length>=1&&E.every(i=>G.towns[i].own==='east'&&X.townEast(i)),'eastern towns belong to the East: '+E);
  ok(X.isEast(G.towns[E[0]].x,G.towns[E[0]].y)&&!X.isEast(G.towns[0].x,G.towns[0].y),'isEast');
  ok(G.houses.every(h=>!G.towns[h.seat].east&&G.towns[h.seat].own===h.id),'no house seat inside the East');
  ok(X.repTier('east').k==='neutral'&&G.rep.east===0,'standing with the East starts neutral');ok(X.humanFact('east')&&X.factName('east')===G.east.n,'east is a human faction');
  X.repGain('east',30,'test');ok(X.repTier('east').k==='friendly','repGain east');G.rep.east=0;
  ok(!X.factionPool({prog:1}).some(e=>e.f==='east'),'the Shogunate never roams as a monster band');
  ok(!X.townHostile(E[0]),'eastern markets are open');
  const pic=JSON.stringify([G.east,G.towns.map(t=>[t.own,t.east||0,t.name])]);const G2=fresh(SEED);ok(JSON.stringify([G2.east,G2.towns.map(t=>[t.own,t.east||0,t.name])])===pic,'the East is deterministic');
  console.log(`${G.east.n} (${G.east.lord}), towns ${E.map(i=>G.towns[i].name).join(', ')}: ok`) }

section('old saves: the East is assigned deterministically');
{ const G=fresh(SEED),want=JSON.stringify(X.eastTowns()),names=G.towns.map(t=>t.name);
  const old=X.clone(G);delete old.east;delete old.rep.east;old.towns.forEach(t=>{if(t.own==='east')t.own=t.eastPrev0||'free';delete t.east;delete t.eastPrev0});
  X.eastRepair(old);ok(old.east&&JSON.stringify(old.towns.map((t,i)=>t.east?i:-1).filter(i=>i>=0))===want,'old save: the same eastern towns');
  ok(old.towns.every((t,i)=>t.name===names[i]),'old save keeps its town names');ok(old.rep.east===0,'old save: neutral standing');
  const again=X.clone(old);X.eastRepair(again);ok(JSON.stringify(again.east)===JSON.stringify(old.east),'repair is idempotent');
  const bad=X.clone(G);bad.east.war={stage:'nonsense'};X.eastRepair(bad);ok(bad.east.war===null,'a broken war record is dropped');
  console.log('migration and repair: ok') }

section('eastern gear');
{ const AB=X.AB,I=X.ITEMS;let n=0;
  for(const id of X.EASTITEMS){const it=I[id];ok(it&&['w','a','h'].includes(it.k)&&it.n&&it.price>0&&it.tier>=1&&it.tier<=5&&it.east===1&&it.look,'item shape '+id);n++;
   if(it.k==='w'){ok(Array.isArray(it.d)&&it.d[0]<it.d[1]&&it.ap>=3&&it.wt&&Array.isArray(it.sk)&&it.sk.length&&it.sk.every(a=>AB[a]&&(!AB[a].needs||[].concat(AB[a].needs).includes(it.wt))),'weapon skills '+id+': '+it.sk);
    ok(X.isRangedW(it)===(it.wt==='bow'),'ranged '+id)}else ok(it.arm>0&&it.fat>=0,'armor '+id);
   ok(typeof X.itemDesc(id)==='string'&&X.itemDesc(id).length>5,'desc '+id);
   const ic=X.iconRows('it-'+id);ok(ic&&ic.length===16&&ic.every(r=>r.length===16),'an icon for '+id);
   ok(X.marketPool(5).includes(id)||X.FACT.east.loot.includes(id),'reachable '+id)}
  for(const t of [1,2,3,4,5])for(const k of ['w','a','h'])ok(X.EASTITEMS.some(id=>I[id].tier===t&&I[id].k===k)||(k==='h'&&t===2)||(k==='a'&&t===1),'tier '+t+' '+k);
  ok(X.FACT.east.loot.every(id=>I[id]),'loot ids');
  for(const a of ['iaido','nsweep'])ok(AB[a]&&AB[a].d&&AB[a].n,'ability '+a);
  // eastern markets stock eastern gear; western ones do not (eastStock)
  const G=fresh(SEED);keepAlive(G);G.day=20;const E=X.eastTowns(),west=G.towns.findIndex((t,i)=>!t.east&&t.size>=2);
  let ea=0,we=0;for(let k=0;k<12;k++){X.stockTown(G.towns[E[0]]);if(!/eastStock/.test(String(X.stockTown)))G.towns[E[0]].stock=X.eastStock(G.towns[E[0]],G.towns[E[0]].stock,X.marketTier(G.towns[E[0]].size,G.day));ea+=G.towns[E[0]].stock.filter(id=>I[id].east).length;
   X.stockTown(G.towns[west]);if(!/eastStock/.test(String(X.stockTown)))G.towns[west].stock=X.eastStock(G.towns[west],G.towns[west].stock,X.marketTier(G.towns[west].size,G.day));we+=G.towns[west].stock.filter(id=>I[id].east).length}
  ok(ea>=24,'eastern stalls are full of eastern gear: '+ea);ok(we<=ea/6,'western stalls rarely: '+we);
  console.log(n+' items with skills, icons, tiers and markets ('+ea+' eastern / '+we+' western stall slots): ok') }

section('eastern soldiers');
(async()=>{
{ const E=X.EN;for(const [id] of X.FACT.east.units){const d=E[id];ok(d&&d.n&&d.hp>0&&d.d&&d.xp>0&&d.east,'unit '+id);if(d.w)ok(X.ITEMS[d.w]&&X.ITEMS[d.w].k==='w','weapon of '+id);for(const a of d.abs||[])ok(X.AB[a]||(X.FOE_AB&&X.FOE_AB[a]),'ability '+a+' of '+id)}
  const G=fresh(SEED);keepAlive(G);G.roster.forEach(m=>{m.lvl=6;m.hp=X.calc(m).hp});const R0=X.clone(G.roster);let wins=0;const seen=new Set();
  for(let k=0;k<4;k++){X.seedRng(SEED+40+k);G.roster=X.clone(R0);const res=await X.autoBattle({f:'east',mult:.8+k*.2,biome:'plains',src:{type:'sim'},turnCap:TURNCAP});ok(res&&!res.stuck,'an eastern battle ran to the end: '+(res&&res.stuck)+' fielded '+X.fielded().length+' mode '+X.mode);
   for(const u of X.B.units)if(u.side===1&&u.eid)seen.add(u.eid);if(res.win)wins++;X.settleBattle(res.win);closeAll(X);keepAlive(G)}
  ok(seen.size>=3,'several kinds of eastern soldier took the field: '+[...seen]);
  for(const id of ['samurai','sohei','onna','shinobi','ashi','ashiy','taisho']){const u=X.mkEnemy(id,'east');const s=X.unitSpritePx?X.unitSpritePx(u,0,'idle',0):null;ok(s!==undefined,'sprite '+id)}
  for(const [id] of X.FACT.east.units){const o=X.eastPortraitSpec(id);ok(o,'portrait spec '+id);o.seed=7;const r=X.ptBust(o);ok(r.length===32&&r.every(q=>q.length===32),'portrait rows '+id)}
  { const w=X.W||X.genWorld(G.seed);X.W=w;const a=JSON.stringify(X.eastProps());ok(X.eastProps().length>3,'eastern scenery on the map: '+X.eastProps().length);ok(X.eastProps().every(p=>X.isEast(p.x,p.y)),'scenery stays in the East');ok(JSON.stringify(X.eastProps())===a,'scenery is stable');
    for(const o of [{k:'town',size:1},{k:'town',size:3,night:1},{k:'band',n:1.4},{k:'prop',v:'torii'}]){const b=X.eastBoxPx(o);ok(b.w>0&&b.h>0&&X.eastSpriteKey(o),'east art box '+o.k)} }
  console.log(`4 eastern battles (${wins} won), soldiers: ${[...seen].join(', ')}: ok`) }

section('the Eastern War');
const war=(side,seed)=>{const G=fresh(seed||SEED);keepAlive(G);ok(!G.east.war,'no war at the start');
  for(let d=0;d<8;d++)day(G);ok(!G.east.war,'no war in the first week');
  G.renown=1200;G.roster.forEach(m=>{m.lvl=12});ok(X.eastStrength()>=X.EW.thr,'strong enough: '+X.eastStrength());
  while(G.day<X.EW.minDay-1)day(G);ok(!G.east.war,'not before day '+X.EW.minDay);
  let n=0;while(!G.east.war&&n++<5)day(G);const v=G.east.war;ok(v&&v.stage==='war'&&v.hosts.length>=1,'the war starts at the threshold: '+JSON.stringify(v&&{day0:v.day0,hosts:v.hosts}));
  ok(G.parties.filter(p=>p.ew).every(p=>p.f==='east'&&X.isEast(v.land.x,v.land.y)),'hosts land on the eastern coast');
  ok(G.note==='east'||G.note===null,'the war asks for a side');X.eastWarSheet();closeAll(X);G.note=null;
  ok(X.eastWarChoose(side)&&v.side===side&&!X.eastWarChoose('houses'),'side chosen once: '+side);
  if(side==='houses')ok(X.repTier('east').k==='hostile','fighting for the houses makes the East hostile');
  if(side==='east')ok(X.repTier('east').k==='friendly'||X.repTier('east').k==='allied','eastern coin makes the East a friend');
  let sieged=0,ctr=0;for(let d=0;d<X.EW.cap+4&&v.stage==='war';d++){day(G);sieged=Math.max(sieged,v.sieges.length);ctr+=G.towns.reduce((a,t)=>a+(t.contracts||[]).filter(c=>c.ew).length,0)}
  ok(v.stage==='over'&&(v.outcome==='east'||v.outcome==='houses'),'the war ends: '+v.outcome+' on day '+v.end);ok(sieged>=1,'the hosts laid siege to towns');ok(ctr>=1,'war contracts were posted');
  ok(!G.parties.some(p=>p.ew),'no host remains');ok(X.eastWarStatus().length>5,'status line');X.eastWarSheet();closeAll(X);
  if(v.outcome==='houses')ok(G.towns.every(t=>t.own!=='east'||t.east),'the houses got their towns back');
  else ok(G.towns.some(t=>t.own==='east'&&!t.east),'the East keeps western towns');
  return{G,v}};
{ const res={};for(const side of ['houses','east','out']){const r=war(side);res[side]=r.v.outcome+' (day '+r.v.day0+'-'+r.v.end+', '+r.v.taken.length+' taken)'}
  // the same seed and side give the same war
  const a=war('out',SEED+7),b=war('out',SEED+7);ok(JSON.stringify(a.v)===JSON.stringify(b.v),'the war is deterministic');
  // a won siege contract lifts the siege
  { const G=fresh(SEED+3);keepAlive(G);G.renown=1200;G.roster.forEach(m=>{m.lvl=12});while(!G.east.war)day(G);const v=G.east.war;X.eastWarChoose('houses');let d=0;while(!v.sieges.length&&d++<20)day(G);
    if(v.sieges.length){const s=v.sieges[0];let c=null;for(const t of G.towns)for(const q of t.contracts||[])if(q.ew&&q.ew.k==='siege'&&q.ew.i===s.i)c=q;ok(c,'a contract to break the siege');
     G.contract=c;c.stage=1;X.eastBattleEnd({type:'contract'},true);ok(!v.sieges.includes(s)&&!X.townSit(s.i,'siege'),'breaking it lifts the siege');G.contract=null}}
  // a natural strength curve: when would the war land? (renown and levels by day, roughly a normal run)
  { const G=fresh(SEED+9);keepAlive(G);let at=null;for(let d=1;d<70&&!G.east.war;d++){G.renown=Math.round(d*d*.22+d*2);const lv=Math.min(11,1+Math.floor(d/5));G.roster.forEach(m=>m.lvl=lv);while(G.roster.length<Math.min(12,6+d/6)){const m=X.newMerc('sellsword');m.field=true;m.lvl=lv;G.roster.push(m)}day(G);if(G.east.war)at=G.day}
    ok(at&&at>=25&&at<=45,'a normal run meets the war mid-game: day '+at);console.log('a normal curve meets the Eastern War on day '+at)}
  console.log(JSON.stringify(res)) }

section('save round trip');
{ const G=fresh(SEED);keepAlive(G);G.renown=1200;G.roster.forEach(m=>{m.lvl=12});while(!G.east.war)day(G);X.eastWarChoose('out');for(let d=0;d<4;d++)day(G);
  const before=JSON.stringify([G.east,G.rep.east,G.towns.map(t=>[t.own,t.east||0]),G.parties.filter(p=>p.ew).map(p=>[p.id,p.siege])]);
  ok(X.save(),'save');const s=X.store.get(X.SAVEKEY);ok(s,'stored');X.G=null;X.continueGame();closeAll(X);ok(X.G,'load');
  const G2=X.G;ok(JSON.stringify([G2.east,G2.rep.east,G2.towns.map(t=>[t.own,t.east||0]),G2.parties.filter(p=>p.ew).map(p=>[p.id,p.siege])])===before,'the East and its war survive a save\n'+before+'\n'+JSON.stringify([G2.east,G2.rep.east,G2.towns.map(t=>[t.own,t.east||0]),G2.parties.filter(p=>p.ew).map(p=>[p.id,p.siege])]));
  for(let d=0;d<3;d++)day(G2);ok(G2.east.war,'the war goes on after a load');
  console.log('save round trip: ok') }
console.log('\nEAST: ALL OK');process.exit(0)
})().catch(e=>fail(e&&e.stack||e));
