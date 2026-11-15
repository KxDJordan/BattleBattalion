// World test (phase 7: factions, reputation, towns that change, roaming parties with goals, nests, wars).
// Plain node, no browser:  node test/world.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the vm approach and DOM stubs of test/company.js) and checks:
// the factions and town state of a new world and their APIs (rep tiers, prices with reasons, closed markets, buildings' services),
// a deterministic 30-day simulation from one seed along two player choice paths (same path twice: identical; the two paths: different),
// that the world on day 30 differs from day 1, the daily simulation's cost for 300 parties (< 5 ms), the save round trip, and the
// v9 -> v10 migration (deterministic from the seed).
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


const X=makeContext();
const fresh=s=>{X.seedRng(s);X.newGame(true);closeAll(X);return X.G};
const keepAlive=G=>{G.crowns=1e7;G.food=1e5;G.roster.forEach(m=>m.hp=X.calc(m).hp)};
const day=G=>{keepAlive(G);X.advanceTime(24);closeAll(X)};
// a compact picture of the world (what the player could see change)
const snap=G=>JSON.stringify({own:G.towns.map(t=>t.own),sit:G.towns.map(t=>t.sit.map(s=>s.k+s.days).join(',')),pros:G.towns.map(t=>Math.round(t.pros)),rep:G.rep,wars:G.wars,
  nests:G.nests.map(n=>[n.id,n.f,n.str]),parties:G.parties.map(p=>[p.id,p.goal,p.f,Math.round(p.x),Math.round(p.y)]),hrel:G.hrel});

section('factions and towns of a new world');
{ const G=fresh(SEED);
  ok(Array.isArray(G.houses)&&G.houses.length===2,'two houses in the small world: '+(G.houses&&G.houses.length));
  const ids=G.houses.map(h=>h.id);ok(ids.join()==='h0,h1','house ids');
  for(const h of G.houses){ok(h.n&&h.short&&X.BANNERC[h.c1]&&X.BANNERC[h.c2]&&h.c1!==h.c2&&X.EMBLEMS[h.emblem]&&X.HPERS[h.pers],'house shape '+JSON.stringify(h));
   ok(G.towns[h.seat].own===h.id,'a house owns its seat');ok(X.FACT[h.id]&&X.FACT[h.id].house&&X.FACT[h.id].units.length,'house registered as a fighting faction')}
  ok(new Set(G.houses.map(h=>h.c1)).size===G.houses.length&&new Set(G.houses.map(h=>h.emblem)).size===G.houses.length,'houses look different');
  const owners=G.towns.map(t=>t.own);ok(owners.every(o=>o==='free'||ids.includes(o)||(o==='east'&&!!G.east)),'every town has an owner key');
  ok(owners.filter(o=>o!=='free').length>=G.towns.length*.5,'houses own most towns: '+owners.join(','));
  for(const t of G.towns){ok(['notice','tavern','market','inn'].every(k=>t.bld.includes(k))&&t.bld.every(k=>X.BLD[k]),'buildings of '+t.name+': '+t.bld);
   ok(t.spec.length>=1&&t.spec.every(k=>X.GOODS[k]),'specialties of '+t.name);ok(Array.isArray(t.sit)&&t.pros>=0&&t.pros<=100,'situations and prosperity of '+t.name)}
  for(const k of ['armorer','college','hall','weaponsmith','fletcher'])ok(G.towns.some(t=>t.bld.includes(k)),'some town has a '+k);
  ok(Object.keys(G.rep).filter(k=>k!=='east').sort().join()==='free,h0,h1'&&Object.values(G.rep).every(v=>v===0),'rep starts neutral: '+JSON.stringify(G.rep));
  ok(G.nests.length>=2&&G.nests.every(n=>X.FACT[n.f]&&n.str===1),'a new world has nests');
  ok(!X.factionPool({}).some(e=>X.FACT[e.f].house),'houses never roam as monster bands');
  // the same seed gives the same factions, whatever the game stream did before
  const pic=JSON.stringify([G.houses,G.towns.map(t=>[t.own,t.bld,t.spec,t.pros])]);const G2=fresh(SEED);ok(JSON.stringify([G2.houses,G2.towns.map(t=>[t.own,t.bld,t.spec,t.pros])])===pic,'factions are deterministic');
  for(const s of [SEED+1,SEED+2]){const g=fresh(s);ok(g.houses.length===2,'houses '+s)}
  X.setWorldSize('medium');X.seedRng(SEED);X.createCampaign({wsize:'medium'});ok(X.G.houses.length===3&&Object.keys(X.G.rep).filter(k=>k!=='east').length===4,'three houses in a larger world');X.setWorldSize('small');
  console.log(G.houses.map(h=>`${h.n} (${h.pers}, ${X.houseTowns(h.id).length} towns)`).join(', ')+`, ${owners.filter(o=>o==='free').length} free towns, ${G.nests.length} nests: ok`) }

section('reputation, prices, closed markets, relations');
{ const G=fresh(SEED),i=G.towns.findIndex(t=>t.own==='h0'),f='h0';
  ok(X.repTier(f).k==='neutral'&&X.repTier('gob').k==='hostile','tiers');
  const b0=X.townPriceK(i,'buy');X.repGain(f,30,'test');ok(G.rep[f]===30*(X.houseById(f).pers==='proud'?1:1)&&X.repTier(f).k==='friendly','repGain up');
  ok(X.townPriceK(i,'buy')<b0&&X.townPriceK(i,'sell')>1*0,'friendly: cheaper');ok(G.repLog.length===1&&G.repLog[0].why==='test','repLog');
  X.repGain(f,500,'more');ok(G.rep[f]===100,'clamped at 100');X.repGain(f,-1000,'less');ok(G.rep[f]===-100&&X.repTier(f).k==='hostile','clamped at -100');
  ok(X.townHostile(i)&&!X.bldServe(i,'market',{op:'stock'}).ok,'a hostile house closes its markets');
  ok(X.repGain('gob',10,'x')===0,'monsters keep no rep');
  for(let k=0;k<40;k++)X.repGain('free',1,'k'+k);ok(G.repLog.length===30,'repLog keeps 30');
  G.rep[f]=0;const p0=X.townPriceK(i,'food');X.townSitAdd(i,'famine',5);ok(X.townPriceK(i,'food')>p0*1.8&&X.townPriceWhy(i,'food').some(w=>w.why==='Famine'),'famine doubles food and says why');
  ok(X.townRecruitK(i)<1,'famine: fewer recruits');ok(X.townCtrK(i,'deliver')>1,'famine: more deliveries');X.townSitDel(i,'famine');
  const spec=G.towns[i].spec[0],S=X.GOODS[spec];if(S.kind!=='buy'&&S.kind!=='sell')ok(X.townPriceWhy(i,S.kind).some(w=>/Specialty/.test(w.why)),'specialty counts');
  ok(X.houseRelation('h0','h0')==='self'&&X.houseRelation('h0','gob')==='war'&&['peace','tense','ally'].includes(X.houseRelation('h0','h1')),'relations');
  G.wars.push({a:'h0',b:'h1',day:1});ok(X.houseRelation('h1','h0')==='war'&&X.atWar('h0','h1'),'at war');G.wars=[];
  const pat=X.wsSpawnPatrol(G.houses[0],false);ok(pat&&pat.goal==='patrol'&&!X.partyHostile(pat),'a patrol is neutral while the house is');G.rep.h0=-90;ok(X.partyHostile(pat),'...and hostile once the house is');G.rep.h0=0;
  const a=G.towns.findIndex((t,j)=>j!==0),car=X.wsSpawnCaravan(0,a);ok(car&&car.goal==='caravan'&&car.pts.length&&!X.partyHostile(car)&&X.partyLabel(car).startsWith('Caravan'),'caravans');
  console.log('tiers, repGain clamps and logs, price reasons, famine, specialties, closed markets, relations, neutral patrols: ok') }

section('buildings');
{ const G=fresh(SEED);keepAlive(G);let n=0;
  for(const key of ['armorer','college','hall','weaponsmith','fletcher','harbour']){const i=G.towns.findIndex(t=>t.bld.includes(key));if(i<0)continue;n++;
   const info=X.bldServe(i,key);ok(info.ok&&info.offers.length,'info '+key);
   if(key!=='hall'&&key!=='harbour'){const st=X.bldServe(i,key,{op:'stock'});ok(st.ok&&st.items.length&&st.items.every(id=>X.ITEMS[id]),'stock '+key+' '+JSON.stringify(st))}
   if(key==='armorer'){const m=G.roster[0];if(m.eq.a){m.cond={a:1};const c0=G.crowns,r=X.bldServe(i,key,{op:'repair'});ok(r.ok&&G.crowns<c0&&!m.cond,'armorer repair '+JSON.stringify(r))}}
   if(key==='hall'){const m=G.roster[0],x0=m.xp,r=X.bldServe(i,key,{op:'train',m:m.id});ok(r.ok&&m.xp>x0,'hall train');const r2=X.bldServe(i,key,{op:'train',m:m.id});ok(r2.ok,'no daily cap')}
   if(key==='college'){const m=G.roster[3];ok(X.bldServe(i,key,{op:'hint',m:m.id}).text,'college hint');if(m.perks.length){const P=X.perkById(m.perks[0]),pp=m.pp,r=X.bldServe(i,key,{op:'respec',m:m.id,tree:P.key});ok(r.ok&&m.pp>pp,'respec')}}
   if(key==='harbour'){const L=X.bldServe(i,key,{op:'list'}).list;if(L.length){const d0=G.day,r=X.bldServe(i,key,{op:'sail',to:L[0].to});ok(r.ok&&G.day>d0&&Math.hypot(G.p.x-G.towns[L[0].to].x,G.p.y-G.towns[L[0].to].y)<TS(),'sail');closeAll(X)}}}
  ok(!X.bldServe(0,'nothing').ok,'unknown building');ok(n>=5,'most service buildings exist in this world');console.log(n+' service buildings tried: ok') }
function TS(){return X.TS*1.5}

section('30 days, two choice paths');
const run=(seed,path)=>{const G=fresh(seed);const d1=snap(G),h=[];
  for(let d=0;d<29;d++){
   if(path==='B'&&d===2){X.repGain('h0',-70,'the company sacked a village');}
   if(path==='B'&&d===4&&G.nests.length){X.worldBattleEnd({type:'nest',id:G.nests[0].id},true)}
   if(path==='B'&&d===6){const c=G.parties.find(p=>p.goal==='caravan');if(c)X.worldBattleEnd({type:'party',id:c.id},true)}
   day(G);h.push(G.news.length)}
  return{G,d1,d30:snap(G),news:G.news.slice()}};
{ const A=run(SEED,'A'),A2=run(SEED,'A'),Bp=run(SEED,'B');
  ok(A.d30===A2.d30,'the same seed and choices give the same world on day 30');
  ok(A.d30!==Bp.d30,'different choices give a different world');
  ok(A.d1!==A.d30,'the world on day 30 differs from day 1');
  const G=A.G;ok(G.day===30,'day 30: '+G.day);ok(G.wsim.day===30,'the world ran every day');
  const goals={};G.parties.forEach(p=>goals[p.goal]=(goals[p.goal]||0)+1);
  ok(goals.caravan>0,'caravans on the roads: '+JSON.stringify(goals));
  ok(G.nests.some(n=>n.str>1.5),'nests grew');ok(A.news.length>0,'the world made news');
  const B=Bp.G;ok(B.parties.some(p=>p.hunt&&p.f==='h0')||B.rep.h0>-40,'a hostile house hunts the company');
  // over a handful of seeds: wars, sieges, raids, booms and towns changing hands all happen somewhere
  const seen={war:0,take:0,raided:0,siege:0,boom:0,famine:0,festival:0,plague:0};
  // every headline of the run, not only the last WSIM.news kept in G.news (a war declared early scrolls out of it by day 30)
  const told=[],wn0=X.ctx.worldNews;X.ctx.worldNews=function(t){told.push(String(t));return wn0.apply(this,arguments)};
  for(let s=0;s<8;s++){told.length=0;const R=run(SEED+100+s,'A'),g=R.G,d1own=JSON.parse(R.d1).own;if(told.some(t=>/at war/.test(t))||g.news.some(n=>/at war/.test(n.t)))seen.war++;if(g.towns.some((t,i)=>t.own!==d1own[i]))seen.take++;
   for(const n of g.news){if(/raided/.test(n.t))seen.raided++;if(/besieges/.test(n.t))seen.siege++}
   for(const k of ['boom','famine','festival','plague'])if(g.towns.some(t=>t.sit.some(x=>x.k===k))||g.news.some(n=>n.t.indexOf(X.SITS[k].n)>=0))seen[k]++}
  X.ctx.worldNews=wn0;
  console.log('over 8 seeds (runs with something):',JSON.stringify(seen));
  ok(seen.war>=1&&seen.raided>=2&&seen.siege>=1,'wars, sieges and raids happen within 30 days');ok(seen.take>=1,'some town changes hands within 30 days on some seed');
  console.log(`day 30: ${JSON.stringify(goals)}, ${G.nests.length} nests (str ${G.nests.map(n=>n.str).join(', ')}), ${G.wars.length} wars, news: ${A.news.slice(-3).map(n=>n.t).join(' | ')}: ok`) }

section('daily simulation cost');
{ const G=fresh(SEED);keepAlive(G);for(let d=0;d<3;d++)day(G);
  // fill the world to 300 parties: caravans between every pair, patrols, raiders, plain bands
  let k=0;while(G.parties.length<300){const a=k%G.towns.length,b=(k*7+3)%G.towns.length;k++;if(a===b)continue;const r=k%4;
   if(r===0)X.wsSpawnCaravan(a,b);else if(r===1)X.wsSpawnPatrol(G.houses[k%G.houses.length],false);else if(r===2){const t=G.towns[b];X.wsSpawnRaid('bandit',t.x+5*X.TS,t.y,b,.8)}else X.spawnParty()}
  for(const p of G.parties)if(p.goal==='raid'||p.goal==='caravan')p.pi=0;
  X.WSIM.cap=1000;const N=20;let tot=0,worst=0;
  for(let d=0;d<N;d++){while(G.parties.length<300)X.spawnParty();G.day++;const t0=process.hrtime.bigint();X.worldDay();const ms=Number(process.hrtime.bigint()-t0)/1e6;tot+=ms;worst=Math.max(worst,ms)}
  X.WSIM.cap=300;const avg=tot/N;console.log(`worldDay with ~300 parties: ${avg.toFixed(2)} ms average, ${worst.toFixed(2)} ms worst`);ok(avg<5,'daily simulation under 5 ms: '+avg.toFixed(2));
  // the frame step stays cheap too (far parties are not moved per frame)
  const t0=process.hrtime.bigint();for(let f=0;f<60;f++)X.moveParties(1/60);const fm=Number(process.hrtime.bigint()-t0)/1e6/60;console.log(`moveParties per frame: ${fm.toFixed(3)} ms`);ok(fm<2,'per-frame party step '+fm) }

section('save round trip');
{ const G=fresh(SEED);for(let d=0;d<12;d++)day(G);G.towns[1].sit.push({k:'siege',days:3,by:'h0'});X.repGain('h1',-25,'x');
  X.mode='world';ok(X.save(),'save');const r=X.readSave();ok(r.state==='ok','read back: '+r.state+' '+(r.why||''));const g=r.g;
  const pick=o=>JSON.stringify({h:o.houses,rep:o.rep,log:o.repLog,hrel:o.hrel,wars:o.wars,nests:o.nests,news:o.news,wsim:o.wsim,t:o.towns.map(t=>[t.own,t.bld,t.spec,t.sit,t.pros]),p:o.parties.map(p=>[p.id,p.goal,p.f,p.from,p.to,p.home,p.siege,p.hunt,p.cargo,p.pts&&p.pts.length,p.pi])});
  {const a=pick(g),b=pick(G);if(a!==b){let i=0;while(a[i]===b[i])i++;fail('world fields differ after load near: '+a.slice(Math.max(0,i-120),i+80)+' VS '+b.slice(Math.max(0,i-120),i+80))}}ok(g.v===X.SAVEVER&&X.SAVEVER>=12,'save version 12');
  // a damaged world record is repaired, never fatal
  const bad=X.clone(G);bad.houses[0].pers='nonsense';bad.towns[0].sit=[{k:'nope',days:2},{k:'raided',days:'x'}];bad.towns[1].own='h9';bad.nests.push({id:'x'});bad.parties.push({id:9999,x:100,y:100,tx:100,ty:100,f:'h0',mult:1,goal:'caravan'});bad.rep.h0='x';
  ok(X.repairSave(bad)==='','damaged world fields repaired');ok(bad.houses[0].pers==='proud'&&bad.towns[0].sit.length===0&&typeof bad.towns[1].own==='string'&&bad.nests.every(n=>typeof n.id==='number')&&bad.rep.h0===0,'repairs');
  ok(bad.parties.find(p=>p.id===9999).goal==='roam','a caravan without a route roams');
  console.log('houses, rep, log, relations, wars, nests, news, town state and party goals round trip: ok') }

section('v9 save migrates');
{ const G=fresh(SEED);for(let d=0;d<4;d++)day(G);const ref={h:X.clone(G.houses),own:G.towns.map(t=>t.own),bld:G.towns.map(t=>t.bld.join())};
  const old=X.clone(G);old.v=9;for(const k of ['houses','rep','repLog','hrel','wars','nests','news','wsim','evt','origin','trav','travNext'])delete old[k];
  for(const t of old.towns)for(const k of ['own','spec','bld','sit','pros'])delete t[k];old.parties=old.parties.filter(p=>!X.humanFact(p.f)).map(p=>{const q=Object.assign({},p);delete q.goal;delete q.home;delete q.from;delete q.to;delete q.cargo;delete q.siege;delete q.hunt;return q});
  if(old.contract&&old.contract.type!=='deliver'&&old.contract.type!=='hunt')old.contract=null;old.towns.forEach(t=>t.contracts=(t.contracts||[]).filter(c=>c.type==='deliver'||c.type==='hunt'));
  const raw=JSON.stringify(old);X.store.set(X.SAVEKEY,raw);const r1=X.readSave();ok(r1.state==='ok','v9 save reads: '+r1.state+' '+(r1.why||''));X.store.set(X.SAVEKEY,raw);const r2=X.readSave();
  const g=r1.g;ok(g.v===X.SAVEVER&&Array.isArray(g.houses)&&g.houses.length===2&&g.nests.length===0&&(g.evt&&typeof g.evt==='object')&&g.origin==='free','migrated fields');
  ok(JSON.stringify(g.houses)===JSON.stringify(ref.h)&&JSON.stringify(g.towns.map(t=>t.own))===JSON.stringify(ref.own),'migration gives the houses the seed gives');
  ok(JSON.stringify([r1.g.houses,r1.g.towns,r1.g.rep])===JSON.stringify([r2.g.houses,r2.g.towns,r2.g.rep]),'migrating twice gives the same world');
  ok(g.parties.every(p=>p.goal==='roam'),'old bands roam');ok(Object.values(g.rep).every(v=>v===0),'rep neutral');
  // and the migrated company plays on
  X.G=g;X.setRngState(g.rng);X.W=X.genWorld(g.seed);X.mode='world';for(let d=0;d<5;d++)day(X.G);ok(X.G.wsim.day===X.G.day,'the migrated world simulates');
  console.log('v9 -> v10: houses from the seed, no nests, neutral rep, old bands roam, plays on: ok') }

console.log('\nworld test passed');
