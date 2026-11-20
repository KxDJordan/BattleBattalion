// Run modifiers test (replayability round: 27-runmods.js, "twists"). Plain node, no browser:  node test/runmods.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the vm approach and DOM stubs of test/world.js) and checks: the table, rolling
// from the seed (deterministic, conflict-free, no draws on the game stream), the new-game options (random / none / chosen), the save
// round trip and repair (unknown keys dropped, old saves get []), that every twist's effects are real and measurable against the same
// company without it, 30 days with each twist forced (sane, deterministic), and the setup section, the ledger entry and the sheet.
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
const fresh=(s,o)=>{X.seedRng(s);X.newGame(true,o);closeAll(X);return X.G};
const keepAlive=G=>{G.crowns=1e7;G.food=1e5;G.roster.forEach(m=>m.hp=X.calc(m).hp)};
const day=G=>{keepAlive(G);X.advanceTime(24);closeAll(X)};
const K=X.RUNMODK,R=X.RUNMODS;
// runs fn on a copy of the base company with no twists and with twists L, from the same stream: [plain, twisted]
const base=fresh(SEED);const snapBase=X.clone(base);
function cmp(L,fn,s){const out=[];for(const mods of [[],L]){X.G=X.clone(snapBase);X.G.mods=mods.slice();X.seedRng(s||7);out.push(fn(X.G))}X.G=X.clone(snapBase);return out}
const near=(a,b,e)=>Math.abs(a-b)<=(e||.02)*Math.max(1,Math.abs(b));

section('the table');
{ ok(K.length>=12&&K.length<=16,'12..16 twists ('+K.length+')');
  for(const k of K){const M=R[k];ok(typeof M.n==='string'&&M.n&&typeof M.d==='string'&&M.d.length>20,k+': name and story');ok(['good','bad','mixed'].includes(M.tone),k+': tone');
   ok(Array.isArray(M.good)&&Array.isArray(M.bad)&&M.good.length+M.bad.length>=2,k+': effect lines');ok(X.icHas?X.icHas(M.icon)||X.pkHas&&X.pkHas(M.icon):true,k+': icon '+M.icon)}
  for(const [a,b] of X.RUNMOD_CONFLICTS)ok(R[a]&&R[b],'conflict pair is known: '+a+' / '+b);
  console.log('  '+K.length+' twists: '+K.map(k=>R[k].n).join(', '))}

section('rolling from the seed');
{ const seen={};for(let s=1;s<=800;s++){const a=X.rollRunMods(s*7919,2),b=X.rollRunMods(s*7919,2);ok(JSON.stringify(a)===JSON.stringify(b),'deterministic');ok(a.length===2&&a[0]!==a[1],'two different');
   ok(!X.runModClash(a[0],a[1]),'conflict-free: '+a);for(const k of a)seen[k]=(seen[k]||0)+1;const c=X.rollRunMods(s,3);ok(c.length===3&&c.every((k,i)=>c.slice(0,i).every(j=>!X.runModClash(j,k))),'three conflict-free')}
  ok(K.every(k=>seen[k]>=30),'every twist comes up ('+JSON.stringify(seen)+')');
  const r0=X.rngState();X.rollRunMods(5,2);ok(X.rngState()===r0,'rolling draws nothing from the game stream');
  let G=fresh(SEED,{mods:'random'});ok(JSON.stringify(G.mods)===JSON.stringify(X.rollRunMods(G.seed,2)),'Random: the two rolled from the world seed ('+G.mods+')');
  const s1=G.seed;G=fresh(SEED,{mods:'random'});ok(G.seed===s1&&JSON.stringify(G.mods)===JSON.stringify(X.rollRunMods(s1,2)),'the same seed, the same twists');
  G=fresh(SEED);ok(Array.isArray(G.mods)&&!G.mods.length,'no options: no twists');
  G=fresh(SEED,{mods:['winter','harvest','bogus','winter','goldrush','iron','trade']});ok(JSON.stringify(G.mods)===JSON.stringify(['winter','goldrush','iron']),'chosen: unknown, repeats and conflicts dropped, three at most ('+G.mods+')');
  // twists do not move the world or the game stream at new game (except for what they do)
  const a=fresh(SEED),ra=X.rngState(),b=fresh(SEED,{mods:['heroes']}),rb=X.rngState();ok(a.seed===b.seed&&JSON.stringify(a.towns.map(t=>t.name))===JSON.stringify(b.towns.map(t=>t.name))&&ra===rb,'a twist without a start draws nothing more')}

section('save round trip, old saves');
{ let G=fresh(SEED,{mods:['feud','trade']});X.save();let r=X.readSave();ok(r.state==='ok'&&JSON.stringify(r.g.mods)===JSON.stringify(['feud','trade']),'saved and read back');
  const raw=JSON.parse(X.store.get(X.slotKey(0)));raw.mods=['trade','nope',7,'trade','iron','winter'];X.store.set(X.slotKey(0),JSON.stringify(raw));r=X.readSave();ok(r.state==='ok'&&JSON.stringify(r.g.mods)===JSON.stringify(['trade','winter']),'repair drops unknown keys, repeats and conflicts ('+r.g.mods+')');
  delete raw.mods;X.store.set(X.slotKey(0),JSON.stringify(raw));r=X.readSave();ok(r.state==='ok'&&Array.isArray(r.g.mods)&&!r.g.mods.length,'an old save gets []');
  raw.mods='winter';X.store.set(X.slotKey(0),JSON.stringify(raw));r=X.readSave();ok(r.state==='ok'&&Array.isArray(r.g.mods)&&!r.g.mods.length,'garbage gets []');
  X.continueGame();closeAll(X);ok(X.G&&Array.isArray(X.G.mods),'continues')}

section('every twist does what it says');
const T0=0,buy=id=>X.townPriceK(T0,'buy',id),gear=Object.keys(X.ITEMS).find(id=>X.ITEMS[id].k==='a'&&!X.ITEMS[id].uniq),tg=Object.keys(X.ITEMS).find(id=>X.ITEMS[id].k==='t');
const pool=f=>{const e=X.factionPool({power:60,day:20}).find(x=>x.f===f);return e?e.w:0};
const meanPay=(n)=>{let s=0;const t=X.G.towns[0];for(let i=0;i<n;i++){const c=X.genContract2(t,0);s+=c.pay}return s/n};
const LOG=[],okn=(c,m)=>{ok(c,m);LOG.push(m)};
const checks={
 winter:()=>{const [a,b]=cmp(['winter'],()=>X.townPriceK(T0,'food'));okn(near(b/a,1.4),'winter: food x1.4 ('+a+' -> '+b+')');
  X.G.mods=['winter'];const tab=X.runModWeather('plains');okn(tab.some(e=>e[0]==='snow'),'winter: snow on the plains');okn(!X.runModWeather('desert').some(e=>e[0]==='snow'),'winter: not in the desert');
  let sn=0;X.seedRng(3);for(let i=0;i<400;i++){X.rollWeather();if(X.G.weather.kind==='snow')sn++}okn(sn>60,'winter: snowfall rolled often ('+sn+'/400)');X.G.mods=[];
  const [f0,f1]=cmp(['winter'],G=>{G.food=100;G.foodAcc=0;let s=0;for(let d=0;d<4;d++){const f=G.food;X.newDay();s+=f-G.food}closeAll(X);return s});okn(f1>f0*1.15,'winter: rations x1.25 ('+f0+' -> '+f1+')');
  okn(X.RUNMODS.winter.k.march===.92,'winter: march factor');X.G.mods=['winter'];X.G.weather={kind:'snow',t:0,dur:9};const o={f:'gob',mult:1};X.runModBattle(o);
  const bk=X.BIOKEY[X.tileAt(X.G.p.x,X.G.p.y)];okn(['plains','forest','hills'].includes(bk)?o.biome==='snow':!o.biome,'winter: a fight in a snowfall is on snow ('+bk+' -> '+o.biome+')');X.G.mods=[]},
 goldrush:()=>{const [a,b]=cmp(['goldrush'],()=>meanPay(30));okn(near(b/a,1.15,.03),'goldrush: pay x1.15 ('+Math.round(a)+' -> '+Math.round(b)+')');
  const [p0,p1]=cmp(['goldrush'],()=>buy(gear));okn(near(p1/p0,1.2),'goldrush: prices x1.2');const [w0,w1]=cmp(['goldrush'],()=>pool('bandit'));okn(near(w1/w0,2),'goldrush: brigands x2');
  const [c0,c1]=cmp(['goldrush'],()=>X.cargoRoll('ale',X.mulberry(5)).crowns);okn(c1>=c0*1.3,'goldrush: cargo coin ('+c0+' -> '+c1+')')},
 migration:()=>{const [w0,w1]=cmp(['migration'],()=>pool('beast'));okn(near(w1/w0,2),'migration: beasts x2');const [n0,n1]=cmp(['migration'],G=>{let n=0;for(let i=0;i<300;i++){G.nests=[];X.wsNests([]);n+=G.nests.length}return n});okn(n1>n0*1.5,'migration: nests ('+n0+' -> '+n1+')');
  const [d0,d1]=cmp(['migration'],G=>{let s=0;for(let i=0;i<300;i++)s+=X.partsDrop({win:true,slain:['wolf']}).reduce((n,x)=>n+x.n,0);return s});okn(d1>d0*1.3,'migration: parts ('+d0+' -> '+d1+')');
  X.G.mods=['migration'];okn(X.runModPayK({f:'ogre'})>1.19&&X.runModF('ctr','beast')===1.8,'migration: monster pay and notices');X.G.mods=[]},
 feud:()=>{const g0=fresh(SEED),g1=fresh(SEED,{mods:['feud']});okn(g1.wars.length>g0.wars.length&&g1.wars.length>=1,'feud: a war from day 1');okn(Object.values(g1.hrel).every(v=>v<=-30),'feud: the houses hate each other');
  X.G=X.clone(snapBase);const [h0,h1]=cmp(['feud'],G=>{G.hrel={};G.wars=[];X.wsHouses([]);return Object.values(G.hrel).reduce((a,b)=>a+b,0)});okn(h1<h0,'feud: feelings sour faster ('+h0+' -> '+h1+')');
  const [s0,s1]=cmp(['feud'],G=>X.ctrTypeW(G.towns[0],0,'defend'));okn(s0>0&&near(s1/s0,1.8),'feud: gate defences x1.8 ('+s0.toFixed(2)+' -> '+s1.toFixed(2)+')');const [x0,x1]=cmp(['feud'],()=>X.townPriceK(T0,'hire'));okn(near(x1/x0,1.1),'feud: hiring +10%')},
 plague:()=>{const [r0,r1]=cmp(['plague'],G=>{X.stockTown(G.towns[0]);return G.towns[0].recruits.length});okn(r1===r0-2,'plague: two fewer recruits ('+r0+' -> '+r1+')');
  const [h0,h1]=cmp(['plague'],G=>{const m=G.roster[0];m.inj=[{id:Object.keys(X.INJ).find(k=>!X.INJ[k].perm),days:30}];let s=0;for(let d=0;d<6;d++){G.day=30+d;X.healInjuriesDaily()}return 30-m.inj[0].days});okn(h1===h0-2,'plague: injuries heal a third slower ('+h0+' -> '+h1+' days in 6)');
  const [t0,t1]=cmp(['plague'],G=>{const m=G.roster[0],id=Object.keys(X.INJ).find(k=>!X.INJ[k].perm);m.inj=[{id,days:5}];return X.injuryCost(m,id)});okn(near(t1/t0,.6),'plague: temple x0.6');
  const [w0,w1]=cmp(['plague'],()=>X.companyWages());okn(near(w1/w0,.9,.03),'plague: wages -10%');
  const [p0,p1]=cmp(['plague'],G=>{let n=0;for(let d=0;d<200;d++){for(const t of G.towns)t.sit=[];X.wsTowns([]);n+=G.towns.filter(t=>t.sit.some(s=>s.k==='plague')).length}return n});okn(p1>p0*2,'plague: plague in towns ('+p0+' -> '+p1+')')},
 heroes:()=>{const [r0,r1]=cmp(['heroes'],G=>{const c={diff:3,pay:100,stages:[{k:'town',ti:0}],stage:0,town:0,type:'hunt'};G.contract=c;const q=X.ctrTurnInAt(0);return q?q.renown:Math.round(8*3*X.runModK('renown',1))});okn(near(r1/r0,1.5,.05),'heroes: renown x1.5 ('+r0+' -> '+r1+')');
  const [m0,m1]=cmp(['heroes'],()=>X.spawnParty('gob').mult);okn(near(m1/m0,1.06,.001),'heroes: bands 6% stronger');const id=Object.keys(X.FABLED||{})[0];if(id){const [f0,f1]=cmp(['heroes'],()=>X.fabledCost(id));okn(near(f1/f0,.75,.02),'heroes: fabled cost x0.75')}},
 bandits:()=>{const [w0,w1]=cmp(['bandits'],()=>pool('bandit'));okn(near(w1/w0,2),'bandits: brigands x2');const [m0,m1]=cmp(['bandits'],()=>X.spawnParty('bandit').mult);okn(near(m1/m0,1.2,.001),'bandits: 20% stronger');
  const [r0,r1]=cmp(['bandits'],G=>{let n=0;for(let i=0;i<400;i++){const k=G.parties.length;X.wsRaiders([]);if(G.parties.length>k)n++}return n});okn(r1>r0*1.5,'bandits: raids ('+r0+' -> '+r1+')');
  const [b0,b1]=cmp(['bandits'],G=>X.ctrTypeW(G.towns[0],0,'bounty'));okn(b0===0?X.RUNMODS.bandits.f.ctr.bounty===2.2:near(b1/b0,2.2),'bandits: bounties x2.2 ('+b0.toFixed(2)+' -> '+b1.toFixed(2)+')');X.G.mods=['bandits'];okn(near(X.runModPayK({f:'bandit'}),1.3),'bandits: pay vs brigands');X.G.mods=[]},
 harvest:()=>{const [a,b]=cmp(['harvest'],()=>X.townPriceK(T0,'food'));okn(b<a*.6,'harvest: food cheap ('+a+' -> '+b+')');const g0=fresh(SEED),g1=fresh(SEED,{mods:['harvest']});
  const pr=g=>g.towns.reduce((s,t)=>s+t.pros,0)/g.towns.length;okn(pr(g1)>pr(g0)+8,'harvest: richer towns ('+pr(g0).toFixed(1)+' -> '+pr(g1).toFixed(1)+')');X.G=X.clone(snapBase);
  const [r0,r1]=cmp(['harvest'],G=>{X.stockTown(G.towns[0]);return G.towns[0].recruits.length});okn(r1===r0+1,'harvest: a recruit more')},
 dead:()=>{const [w0,w1]=cmp(['dead'],()=>pool('undead'));okn(w0>0&&near(w1/w0,2.5),'dead: the dead x2.5');const [m0,m1]=cmp(['dead'],()=>X.spawnParty('undead').mult);okn(near(m1/m0,1.1,.001),'dead: 10% stronger');
  X.G.mods=['dead'];okn(near(X.runModPayK({f:'undead'}),1.3)&&X.runModNestFs([]).includes('undead'),'dead: pay and nests');X.G.mods=[]},
 trade:()=>{const [c0,c1]=cmp(['trade'],G=>{G.parties=G.parties.filter(p=>p.goal!=='caravan');for(let i=0;i<20;i++)X.wsTrade();return G.parties.filter(p=>p.goal==='caravan').length});okn(c1>c0*1.5,'trade: caravans ('+c0+' -> '+c1+')');
  const [s0,s1]=cmp(['trade'],()=>X.townPriceK(T0,'sell',tg));okn(near(s1/s0,1.15),'trade: trade goods sell higher')},
 iron:()=>{const [p0,p1]=cmp(['iron'],()=>buy(gear));okn(near(p1/p0,1.35),'iron: gear x1.35');const fd=cmp(['iron'],()=>X.townPriceK(T0,'food'));okn(fd[0]===fd[1],'iron: food untouched');
  const [t0,t1]=cmp(['iron'],()=>X.townPriceK(T0,'tools'));okn(near(t1/t0,1.6),'iron: tools x1.6');const [s0,s1]=cmp(['iron'],G=>{(X.mkRestock?X.mkRestock(G.towns[0],true):X.stockTown(G.towns[0]));return G.towns[0].stock.length});okn(s1===s0-2,'iron: two fewer items ('+s0+' -> '+s1+')')},
 glut:()=>{const [h0,h1]=cmp(['glut'],()=>X.townPriceK(T0,'hire'));okn(near(h1/h0,.7),'glut: hiring x0.7');const g0=fresh(SEED),g1=fresh(SEED,{mods:['glut']});okn(g1.rivals.length===g0.rivals.length+1,'glut: a rival more ('+g0.rivals.length+' -> '+g1.rivals.length+')');
  X.G=X.clone(snapBase);const [r0,r1]=cmp(['glut'],G=>{X.stockTown(G.towns[0]);return G.towns[0].recruits.length});okn(r1===r0+2,'glut: two recruits more')},
 omens:()=>{const g0=fresh(SEED),g1=fresh(SEED,{mods:['omens']});okn(g1.crisisDay===Math.round(g0.crisisDay*.82),'omens: the crisis day ('+g0.crisisDay+' -> '+g1.crisisDay+')');X.G=X.clone(snapBase);X.G.mods=['omens'];okn(X.runModK('crisisPay',1)===1.6,'omens: crisis pay');X.G.mods=[]},
 elites:()=>{X.G.mods=['elites'];okn(X.runMod('elites')&&X.runModK('elites',1)===2,'elites: the flag the elite system reads');X.G.mods=[];const [a,b]=cmp(['elites'],()=>meanPay(20));okn(near(b/a,1.1,.03),'elites: pay x1.1')},
 patron:()=>{const g0=fresh(SEED),g1=fresh(SEED,{mods:['patron']});okn(g1.crowns===g0.crowns+800,'patron: +800 crowns');X.G=X.clone(snapBase);const [w0,w1]=cmp(['patron'],()=>X.companyWages());okn(near(w1/w0,1.12,.03),'patron: wages +12%')}
};
{ for(const k of K){ok(typeof checks[k]==='function','a check for '+k);X.G=X.clone(snapBase);checks[k]();X.G=X.clone(snapBase)}
  // the market shows the twist's name as a price reason
  X.G.mods=['winter'];ok(X.townPriceWhy(0,'food').some(x=>x.why===R.winter.n),'price reasons name the twist');X.G.mods=[];console.log(LOG.map(x=>'  '+x).join('\n'));console.log('  '+K.length+' twists checked')}

section('twist events');
{ const EV={rm_frost:'winter',rm_claim:'goldrush',rm_herd:'migration',rm_levy:'feud',rm_sick:'plague',rm_graves:'dead',rm_wagons:'trade',rm_swords:'glut'};
  for(const id in EV){const D=X.EVENTS[id];ok(D,'event '+id);const kind=D.kind[0],c=X.evCtx(kind,kind==='town'?{town:X.G.towns.findIndex(t=>t.own&&t.own!=='free')}:{});c.m=X.G.roster[0];c.biome='plains';
   X.G.mods=[];ok(+D.when(c)===0,id+': never without its twist');X.G.mods=[EV[id]];ok(+D.when(c)>0,id+': comes under '+EV[id])}
  X.G.mods=[];console.log('  '+Object.keys(EV).length+' twist events, each only under its twist')}

section('30 days with every twist');
{ const run=(L,s)=>{const G=fresh(s,{mods:L});for(let d=0;d<30;d++)day(G);
   ok(G.parties.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.mult)&&p.mult>0),L+': bands sane');ok(G.towns.every(t=>Number.isFinite(t.pros)),L+': towns sane');
   return JSON.stringify([G.parties.map(p=>[p.id,p.f,Math.round(p.x)]),G.towns.map(t=>[t.own,Math.round(t.pros)]),G.wars,G.weather,G.nests.length])};
  for(const k of K){const a=run([k],SEED+3),b=run([k],SEED+3);ok(a===b,k+': the same seed plays the same')}
  const a=run(['winter','goldrush','dead'],SEED+4);ok(a===run(['winter','goldrush','dead'],SEED+4),'three twists together: deterministic');console.log('  each twist ran 30 days twice, identical')}

section('the dialog and the sheets');
{ X.NCS.open=true;for(const m of ['random','none','pick']){X.NCS.mods=m;X.NCS.modPick=m==='pick'?['winter','feud']:[];const h=X.ncModsHTML();ok(typeof h==='string'&&h.includes('Twists'),'section renders ('+m+')');
   if(m==='pick'){ok(h.includes('Not with '+R.winter.n)||h.includes('Not with Harsh winter'),'a conflicting twist is shut');ok((h.match(/rm-card/g)||[]).length>=2,'the chosen twists are described')}}
  X.NCS.mods='pick';X.NCS.modPick=['winter'];X.ncModsTog('harvest');ok(X.NCS.modPick.length===1,'cannot pick a conflict');X.ncModsTog('feud');X.ncModsTog('trade');X.ncModsTog('dead');ok(X.NCS.modPick.length===3,'three at most');
  ok(JSON.stringify(X.ncModsOpt())===JSON.stringify(['winter','feud','trade']),'the dialog passes its choice');X.NCS.mods='random';ok(X.ncModsOpt()==='random','random passes random');X.NCS.mods='none';ok(Array.isArray(X.ncModsOpt())&&!X.ncModsOpt().length,'none passes []');
  const G=fresh(SEED,{mods:['feud','trade']});ok(X.menuExtra().includes('Twists'),'the ledger lists Twists');X.runModsSheet();ok(X.sheetOpen,'the twists sheet opens');closeAll(X);ok(X.runModsLine().includes(R.feud.n),'the raise sheet names them');
  X.G.mods=[];ok(X.runModsLine()==='','no line without twists')}
console.log('\nrunmods test passed');
