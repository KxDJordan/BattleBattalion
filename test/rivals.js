// Rivals test (caravan cargo and rival mercenary companies, world agent).
// Plain node, no browser:  node test/rivals.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the vm harness of test/world.js) and checks: rival generation (deterministic from the
// seed, real mercs, banners, no game randomness drawn), a 60-day simulation (rivals take board work, race the company, fight nests, grow,
// lose men, get wiped out, new ones form; replayed twice: identical), caravan cargo (rolls, text, cargoTake, the caravan battle, trade
// prices), the parley options and outcomes, battles against rivals (worldBattleEnd), a hostile house hiring hunters, the save round
// trip and the v10 -> v11 migration, and the daily simulation's cost.
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
const rsnap=G=>JSON.stringify({rv:G.rivals.map(r=>[r.id,r.n,r.alive,Math.round(r.renown),r.crowns,r.stance,r.roster.map(m=>[m.id,m.lvl,m.eq.w,m.eq.a]),r.ctr&&r.ctr.title,r.hired,r.deeds.length]),
  news:G.news.map(e=>e.t),parties:G.parties.filter(p=>p.goal==='merc').map(p=>[p.id,p.f,Math.round(p.x),Math.round(p.y)]),c:G.contract&&[G.contract.id,G.contract.rival],rng:X.rngState()});
const canon=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((a,q)=>(a[q]=v[q],a),{}):v);
const near=(G,r,d)=>{const p=X.rivalParty(r)||X.rvSpawn(r);p.x=G.p.x+(d||.2)*X.TS;p.y=G.p.y;p.tx=p.x;p.ty=p.y;p.pts=[{x:Math.round(p.x),y:Math.round(p.y)}];p.idle=1;return p};

section('generation');
{ const G=fresh(SEED),a=X.clone(G.rivals),G2=fresh(SEED),b=X.clone(G2.rivals);
  ok(JSON.stringify(a)===JSON.stringify(b),'the same seed gives the same rivals');
  ok(G2.rivals.length===2,'two rivals in the small world: '+G2.rivals.length);
  const ids=new Set(G2.roster.map(m=>m.id));
  for(const r of G2.rivals){ok(/^r\d+$/.test(r.id)&&r.n==='The '+r.short&&X.BANNERC[r.c1]&&X.BANNERC[r.c2]&&r.c1!==r.c2&&X.EMBLEMS[r.emblem]&&X.RVPERS[r.pers],'rival shape '+r.n);
   ok(r.alive&&r.roster.length>=5&&r.roster.length<=12&&r.home>=0&&r.home<G2.towns.length&&r.renown>0&&r.crowns>0,'a fighting company: '+r.roster.length+' swords');
   for(const m of r.roster){ok(X.BG[m.bg]&&X.calc(m).hp>0&&X.repairMerc(X.clone(m))&&!ids.has(m.id)&&!G2.roster.includes(m),'a real merc, not of the company: '+m.name);ids.add(m.id)}
   ok(X.FACT[r.id]&&X.FACT[r.id].rival&&X.FACT[r.id].house,'registered in FACT');ok(X.isRival(r.id)&&X.rivalById(r.id)===r&&X.factName(r.id)===r.n,'lookups');
   ok(X.repTier(r.id).k==='neutral'||X.repTier(r.id).k==='cold','standing through repTier: '+X.repTier(r.id).k);
   const s0=r.stance,d=X.repGain(r.id,-20,'test');ok(d===-20&&r.stance===s0-20&&G2.repLog.some(e=>e.f===r.id),'repGain moves a rival\'s stance');r.stance=s0}
  ok(new Set(G2.rivals.map(r=>r.c1).concat(G2.houses.map(h=>h.c1))).size===G2.rivals.length+G2.houses.length,'rivals fly their own colours');
  ok(!X.factionPool({power:200,day:80}).some(e=>X.FACT[e.f].rival),'rivals never spawn as monster bands');
  // generation draws no game randomness
  const g=X.clone(G2);delete g.rivals;const s0=X.rngState();X.rivalsInit(g);ok(X.rngState()===s0,'rivalsInit leaves the game stream alone');ok(JSON.stringify(g.rivals.map(r=>r.n))===JSON.stringify(G2.rivals.map(r=>r.n)),'the same rivals from the seed');
  { X.setWorldSize('medium');X.seedRng(SEED);X.newGame(true,{wsize:'medium'});closeAll(X);ok(X.G.rivals.length===3,'three rivals in a larger world');X.setWorldSize('small') }
  // levels and gear grow with renown and the day
  const r=G2.rivals[0],lo=X.rvNewMerc({renown:0,roster:[]},1),hi=X.rvNewMerc({renown:600,roster:[]},60);ok(hi.lvl>lo.lvl&&X.gearPower(hi)>=X.gearPower(lo),`a famous company's recruit is better: L${lo.lvl} vs L${hi.lvl}`);
  console.log(`rivals: ${G2.rivals.map(r=>`${r.n} (${r.pers}, ${r.roster.length} swords, L${Math.round(r.roster.reduce((a,m)=>a+m.lvl,0)/r.roster.length)}, renown ${r.renown})`).join('; ')}: ok`) }

section('caravan cargo');
{ const G=fresh(SEED);
  for(const k in X.GOODS){const c=X.cargoRoll(k);ok(c.good===k&&c.crowns>=0&&Array.isArray(c.items)&&Array.isArray(c.trade)&&c.items.every(id=>X.ITEMS[id]&&!X.ITEMS[id].uniq)&&c.trade.every(t=>X.ITEMS[t.id]&&X.ITEMS[t.id].k==='t'&&t.v>0),'cargo of '+k+': '+JSON.stringify(c));
   ok(Object.keys(c.parts).every(p=>X.PARTS[p]),'parts of '+k);const t=X.cargoText(c);ok(typeof t==='string'&&t.length>3&&!/undefined|NaN/.test(t),'cargo text '+t)}
  ok(X.cargoRoll('grain').food>0&&X.cargoRoll('ore').tools>0&&X.cargoRoll('herbs').salves>0&&X.cargoRoll('furs').parts.pelt>0&&X.cargoRoll('spice').trade.length>0&&X.cargoRoll('steel').items.length>=2,'each good carries its own kind of load');
  ok(X.cargoRoll('steel').items.every(id=>X.ITEMS[id].k==='w'),'steel caravans carry weapons');
  // trade goods never reach a stall
  ok(!X.marketPool(5).some(id=>X.ITEMS[id].k==='t'),'trade goods are never on the stalls');
  // caravans on the road carry it, and the band sheet's text reads it
  let car=G.parties.find(p=>p.goal==='caravan');for(let d=0;d<6&&!car;d++){day(G);car=G.parties.find(p=>p.goal==='caravan')}ok(car&&car.cargo&&Array.isArray(car.cargo.items)&&Array.isArray(car.cargo.trade),'caravans set out with a full cargo');
  // robbing one: the whole load, the old reputation cost
  car.cargo=X.cargoRoll('spice');car.cargo.food=12;car.cargo.tools=3;car.cargo.salves=1;car.cargo.parts={pelt:2};car.cargo.items=['spear'];
  const want=X.clone(car.cargo),c0=G.crowns,f0=G.food,t0=G.tools,s0=G.salve|0,p0=G.parts.pelt|0,st0=G.stash.length,rep0=G.rep[car.f];
  X.repGain(car.f,-18,'Attacked a caravan');const out=X.worldBattleEnd({type:'party',id:car.id},true);
  ok(G.crowns===c0+want.crowns&&G.food===f0+12&&G.tools===t0+3&&(G.salve|0)===s0+1&&(G.parts.pelt|0)===p0+2&&G.stash.length===st0+1+want.trade.length,'cargoTake puts it all into the company');
  ok(out.crowns===want.crowns&&out.cargo&&out.cargo.trade.length===want.trade.length&&/crowns/.test(out.cargo.text),'worldBattleEnd reports the cargo: '+out.cargo.text);
  ok(!G.parties.some(p=>p.id===car.id),'the caravan is gone');ok(G.rep[car.f]<rep0,'robbing a caravan still costs reputation');
  // trade prices: full where the good is not made, half where it is
  const sp=G.stash.find(id=>X.ITEMS[id].k==='t');const mk=G.towns.findIndex(t=>t.spec.includes(X.ITEMS[sp].good)),ot=G.towns.findIndex(t=>!t.spec.includes(X.ITEMS[sp].good)&&!X.townHostile(G.towns.indexOf(t)));
  ok(ot>=0,'a town that does not make '+sp);const full=X.tradePrice(sp,ot);ok(full.v===Math.floor(X.ITEMS[sp].price*X.twK('sell',ot,sp))&&!full.made,'full price where it is not made');
  if(mk>=0){const half=X.tradePrice(sp,mk);ok(half.made&&half.v<full.v,'half where it is made')}
  G.town=ot;const n=G.stash.filter(id=>X.ITEMS[id].k==='t').length,c1=G.crowns,got=X.sellTrade();ok(n>0&&got>0&&G.crowns===c1+got&&!G.stash.some(id=>X.ITEMS[id].k==='t'),'sellTrade sells every trade good');G.town=null;closeAll(X);
  // an old cargo is filled from its good, deterministically, keeping its purse
  const a=X.cargoFix({good:'ore',crowns:170},42,G.seed),b=X.cargoFix({good:'ore',crowns:170},42,G.seed);ok(JSON.stringify(a)===JSON.stringify(b)&&a.crowns===170&&a.tools>0,'cargoFix fills an old cargo from its good');
  console.log('every good rolls its load; cargoTake, the caravan battle, trade prices, old cargo: ok') }

section('60 days of rivals');
const run60=(seed,log)=>{const G=fresh(seed);const st={took:0,race:0,raceLost:0,raceWon:0,renown0:G.rivals.map(r=>r.renown),max:G.rivals.map(r=>r.roster.length),min:G.rivals.map(r=>r.roster.length),recruit:0,wiped:0,formed:0,nestBurn:0};const seen=new Set(),ids0=new Set(G.rivals.map(r=>r.id));
  for(let d=0;d<60;d++){
   // the company holds a hunt where it can (the rivals race for those)
   if(!G.contract){for(const t of G.towns){const c=t.contracts.find(c=>['hunt','beast','bounty','nest'].includes(c.type)&&!c.rtook);if(c){X.ctrAccept(c);G.contract.due=null;G.contract.twist=null;break}}}
   if(d===30){const r=G.rivals.find(r=>r.alive);r.roster.length=0}   // a company bled white: the next day wipes it out
   day(G);
   for(const t of G.towns)for(const c of t.contracts)if(c.rtook&&!seen.has('t'+c.id)){seen.add('t'+c.id);st.took++}
   if(G.contract&&G.contract.rival&&!seen.has('r'+G.contract.id)){seen.add('r'+G.contract.id);st.race++}
   if(G.ctrLast&&G.ctrLast.rival&&!seen.has('l'+G.ctrLast.id)){seen.add('l'+G.ctrLast.id);st.raceLost++}
   G.rivals.forEach((r,i)=>{if(i<st.max.length){st.max[i]=Math.max(st.max[i],r.roster.length);if(r.alive)st.min[i]=Math.min(st.min[i],r.roster.length)}})}
  st.wiped=G.rivals.filter(r=>!r.alive).length;st.formed=G.rivals.filter(r=>!ids0.has(r.id)).length;st.renown=G.rivals.map(r=>Math.round(r.renown));
  st.deeds=G.rivals.reduce((a,r)=>a+r.deeds.length,0);st.news=G.news.filter(e=>G.rivals.some(r=>e.t.includes(r.short))).length;st.raceWon=G.rivals.reduce((a,r)=>a+r.deeds.filter(e=>/^Beaten to/.test(e.t)).length,0);
  st.nestBurn=G.rivals.reduce((a,r)=>a+r.deeds.filter(e=>/nest/.test(e.t)&&/done/.test(e.t)).length,0);st.lost=G.rivals.reduce((a,r)=>a+r.deeds.filter(e=>/fell|deserted/.test(e.t)).length,0);
  st.grew=G.rivals.some(r=>r.alive&&r.roster.some(m=>m.lvl>=4));if(log)log.push(rsnap(G));return st};
{ const L1=[],L2=[];const st=run60(SEED,L1);run60(SEED,L2);ok(L1[0]===L2[0],'60 days replayed twice give the same rivals');
  // over a few seeds every behaviour shows up
  const tot={took:st.took,race:st.race,raceLost:st.raceLost,raceWon:st.raceWon,wiped:st.wiped,formed:st.formed,lost:st.lost,nestBurn:st.nestBurn,grew:st.grew?1:0};
  for(const s of [SEED+1,SEED+2,SEED+3]){const q=run60(s);for(const k in tot)tot[k]+=typeof q[k]==='boolean'?(q[k]?1:0):q[k]}
  console.log('seed '+SEED+': '+JSON.stringify({took:st.took,race:st.race,raceLost:st.raceLost,raceWon:st.raceWon,wiped:st.wiped,formed:st.formed,renown:st.renown0.map((v,i)=>v+'->'+st.renown[i]).join(' '),max:st.max,min:st.min,deeds:st.deeds,news:st.news}));
  console.log('4 seeds: '+JSON.stringify(tot));
  ok(st.took>0&&tot.took>=4,'rivals take work from the boards');ok(tot.race>=1,'rivals race the company for its target');ok(tot.raceLost+tot.raceWon>=1,'a race is decided (won or lost)');
  ok(st.wiped>=1&&tot.formed>=1,'a company with no men is wiped out, and new ones form');ok(tot.lost>=1,'rivals lose men');ok(tot.grew>=1,'rivals grow');ok(st.deeds>4&&st.news>=1,'deeds and news report them') }
// a race the rival wins: the company's contract fails with a clear notice and no reputation cost
{ const G=fresh(SEED);day(G);const t=G.towns[0];let c=t.contracts.find(c=>c.type==='hunt');if(!c){c=X.CTYPES.hunt.gen(t,0);t.contracts.push(c)}X.ctrAccept(c);c.due=null;c.twist=null;
  const r=G.rivals[0],s=X.rvGoStage(c),rep0=X.repOf(c.emp),ren0=G.renown;r.ctr=X.rvJobFrom(c,s,0);r.ctr.race=c.id;r.ctr.eta=1;c.rival=r.id;r.roster.forEach(m=>{m.lvl=12;m.base.ms+=50});
  ok(X.ctrRace(c)&&/race you/.test(X.ctrRace(c).text),'ctrRace says who races and how far: '+(X.ctrRace(c)&&X.ctrRace(c).text));
  const p=X.rivalParty(r)||X.rvSpawn(r);p.x=s.x;p.y=s.y;X.seedRng(7);const keep=X.rvFight;X.rvFight=()=>({win:true,dead:[]});const news=[];X.rvResolve(r,news);X.rvFight=keep;
  ok(!G.contract&&c.failed&&c.rivalWon===r.id&&G.ctrLast.rival===r.id,'the contract fails to the rival');ok(new RegExp(r.short).test(X.ctrRivalTook(c))&&/first/.test(X.ctrRivalTook(c)),'ctrRivalTook: '+X.ctrRivalTook(c));
  ok(X.repOf(c.emp)===rep0&&G.renown===ren0,'losing a race costs no reputation or renown');ok(news.some(n=>/Contract lost/.test(n)),'a notice says so');
  // a notice a rival took is marked on the board and cannot be accepted
  const t2=G.towns[1];const c2=X.CTYPES.hunt.gen(t2,1);t2.contracts.push(c2);c2.rtook=G.day;c2.rival=r.id;ok(X.ctrTakenBy(c2)===r&&/Taken by/.test(X.ctrRivalTook(c2))&&!X.ctrAccept(c2)&&!G.contract,'a taken notice is theirs');
  G.town=1;const v=X.twCtrDetail(c2,t2);ok(/Taken by/.test(v.detail)&&/disabled/.test(v.foot)&&/Taken by/.test(X.twCtrSub(c2)),'the board shows it as taken');G.town=null;
  console.log('race lost: notice, no reputation cost; a taken notice cannot be accepted: ok') }
// the company beats the rival to the target
{ const G=fresh(SEED+5);day(G);const t=G.towns[0];const c=X.CTYPES.hunt.gen(t,0);t.contracts.push(c);X.ctrAccept(c);c.due=null;c.twist=null;const r=G.rivals[0],s=X.rvGoStage(c);
  r.ctr=X.rvJobFrom(c,s,0);r.ctr.race=c.id;r.ctr.eta=9;c.rival=r.id;const st0=r.stance;X.ctrBattleEnd(c,true,null);day(G);
  ok(!(r.ctr&&r.ctr.race===c.id)&&r.deeds.some(e=>/^Beaten to/.test(e.t))&&r.stance<st0,'beaten to the prize: the rival gives up and minds it');console.log('race won by the company: ok') }

section('meeting rivals on the road');
{ const G=fresh(SEED);day(G);const r=G.rivals.find(x=>x.pers!=='honour')||G.rivals[0],p=near(G,r);r.stance=0;r.hired=null;r.calm=G.day+5;
  const P=X.rivalParley(p);ok(P&&P.r===r&&P.opts.map(o=>o.k).join()==='news,hire,challenge,attack,leave','parley options: '+P.opts.map(o=>o.k));
  ok(P.opts.every(o=>typeof o.n==='string'&&typeof o.d==='string'&&typeof o.ok==='boolean'&&typeof o.cost==='number'),'every option says what it costs');
  const s0=r.stance,n=X.rivalParleyDo(p,'news');ok(/say they are/.test(n.text)&&r.stance===s0+2,'news: '+n.text);ok(!X.rivalParley(p).opts.find(o=>o.k==='news').ok,'news once a day');
  const h=X.rivalParley(p).opts.find(o=>o.k==='hire'),n0=r.roster.length,g0=G.roster.length,c0=G.crowns;ok(h.ok&&h.cost>0,'a sword for hire: '+h.n);const hr=X.rivalParleyDo(p,'hire');
  ok(r.roster.length===n0-1&&G.roster.length===g0+1&&G.crowns===c0-h.cost&&G.roster.includes(hr.m)&&!r.roster.includes(hr.m),'hire moves the merc for the fee');
  const ch=X.rivalParleyDo(p,'challenge');ok(ch.fight&&ch.fight.rival===r.id&&ch.fight.f===r.id&&ch.fight.src.type==='party'&&ch.fight.src.goal==='merc'&&ch.fight.src.duel,'challenge: a fight against their roster');
  const b=X.partyBattle(p);ok(b.f===r.id&&b.rival===r.id&&b.mult>0&&b.src.id===p.id&&b.src.goal==='merc','partyBattle for a rival');
  // a hired hunter: hostile, can be bought off
  r.calm=null;r.hired={by:G.houses[0].id,until:G.day+5};p.hunt=1;ok(X.partyHostile(p),'a hired company is hostile');const P2=X.rivalParley(p),bo=P2.opts.find(o=>o.k==='buyoff');
  ok(bo&&bo.ok&&!P2.opts.find(o=>o.k==='news').ok,'hostile: no talk, but a price');const bc=G.crowns;X.rivalParleyDo(p,'buyoff');ok(!r.hired&&!p.hunt&&!X.partyHostile(p)&&G.crowns===bc-bo.cost,'bought off: the hunt is over');
  // the honourable cannot be ambushed
  const hon=G.rivals.find(x=>x.pers==='honour')||(G.rivals[1].pers='honour',G.rivals[1]);const ph=near(G,hon,.3);const at=X.rivalParley(ph).opts.find(o=>o.k==='attack');ok(!at.ok&&X.rivalParleyDo(ph,'attack').fight===undefined,'the honourable keep a watch');
  hon.stance=0;ok(!X.partyHostile(ph),'the honourable never ambush');
  // a cutthroat falls on a weaker company
  const cut=r;cut.pers='cutthroat';cut.stance=0;cut.calm=null;p.mult=2;ok(X.partyHostile(p),'cutthroats attack the weak');p.mult=.5;ok(!X.partyHostile(p),'but not the strong');
  // ambushing a company that is not hostile costs standing with the town's owner
  p.mult=.5;const own=G.towns[X.nearestTown(p.x,p.y)].own,ro=X.repOf(own),at2=X.rivalParleyDo(p,'attack');ok(at2.fight&&at2.fight.src.ambush&&X.repOf(own)<ro,'an ambush costs standing in the land');
  console.log('parley: news, hire, buy off, challenge, ambush rules: ok') }

section('battles against rivals');
{ const G=fresh(SEED);day(G);const r=G.rivals[0],p=near(G,r);r.stance=0;const c0=G.crowns,ren0=G.renown,rr0=r.renown,war=r.crowns;
  const out=X.worldBattleEnd({type:'party',id:p.id,goal:'merc',pf:r.id},true);
  ok(out.crowns===Math.round(war*.35)&&G.crowns===c0+out.crowns&&out.renown>0&&G.renown===ren0+out.renown&&r.renown<rr0&&r.stance<0&&out.rival&&out.rival.win,'a beaten rival: purse, renown, standing');
  ok(!X.rivalParty(r)&&r.rest>0&&r.alive,'it falls back to lick its wounds');ok(G.news.some(e=>e.t.includes(r.n)),'news of it');
  for(let d=0;d<5;d++)day(G);ok(X.rivalParty(r),'and takes the road again');
  // the battle agent took its dead: nobody left = wiped out
  const p2=X.rivalParty(r);r.roster.length=0;const o2=X.worldBattleEnd({type:'party',id:p2.id,goal:'merc',pf:r.id},true);ok(!r.alive&&o2.rival.wiped&&!G.parties.some(q=>q.f===r.id),'a rival with nobody left is wiped out');
  // a lost battle: the rival's renown grows, a hunt is paid
  const q=G.rivals.find(x=>x.alive),pq=near(G,q),qr=q.renown;q.hired={by:G.houses[0].id,until:G.day+9};X.worldBattleEnd({type:'party',id:pq.id,goal:'merc',pf:q.id},false);ok(q.renown>qr&&!q.hired&&q.deeds.some(e=>/^Beat /.test(e.t)),'a rival that wins');
  // declined before the first blow (the deploy screen's withdraw: no result record): nothing changes but a deed, the party stays
  const q2=G.rivals.find(x=>x.alive),pq2=near(G,q2),rn2=q2.renown,o3=X.worldBattleEnd({type:'party',id:pq2.id,goal:'merc',pf:q2.id},false,null);ok(o3.rival.fled&&q2.renown===rn2&&X.rivalParty(q2),'a withdrawal is no defeat');
  console.log('worldBattleEnd: win, wipe-out, loss: ok') }

section('a hostile house hires a hunter');
{ const G=fresh(SEED);const h=G.houses[0];G.rep[h.id]=-100;G.rivals.forEach(r=>{r.pers='greedy';r.stance=0});let hired=null;
  for(let d=0;d<40&&!hired;d++){G.rep[h.id]=-100;day(G);hired=G.rivals.find(r=>r.alive&&r.hired&&r.hired.by===h.id)}
  ok(hired,'a hostile house hired a rival');const p=X.rivalParty(hired);ok(p&&p.hunt&&X.partyHostile(p),'the hired party hunts the company');ok(G.news.some(e=>e.t.includes('pays '+hired.n)),'the news says so');
  G.rivals.forEach(r=>{if(r!==hired)r.pers='honour'});const hon=G.rivals.find(r=>r!==hired&&r.alive);if(hon){hon.hired=null;for(let d=0;d<10;d++){G.rep[h.id]=-100;day(G)}ok(!hon.hired,'the honourable never hire out to hunt')}
  G.rep[h.id]=0;hired.hired&&(hired.hired.until=G.day-1);day(G);ok(!hired.hired,'the hunt ends');console.log(`${h.n} hired ${hired.n}: ok`) }

section('saves');
{ const G=fresh(SEED);for(let d=0;d<10;d++)day(G);X.mode='world';ok(X.save(),'save');const r=X.readSave();ok(r.state==='ok','read back: '+r.state+' '+(r.why||''));
  ok(canon(r.g.rivals)===canon(G.rivals),'rivals round trip');ok(r.g.parties.filter(p=>p.goal==='merc').length===G.parties.filter(p=>p.goal==='merc').length,'rival parties round trip');
  ok(JSON.stringify(r.g.parties.filter(p=>p.cargo).map(p=>p.cargo))===JSON.stringify(G.parties.filter(p=>p.cargo).map(p=>p.cargo)),'cargo round trips');
  // damaged rival records are repaired, never fatal
  const bad=X.clone(G);bad.rivals[0].pers='x';bad.rivals[0].roster.push({junk:1});bad.rivals[0].ctr={x:'a'};bad.rivals[1].hired={by:'h9',until:3};bad.rivals.push({id:'zz'});bad.parties.push({id:9998,x:100,y:100,tx:100,ty:100,f:'r77',mult:1,goal:'merc'});
  ok(X.repairSave(bad)==='','damaged rival fields repaired');ok(bad.rivals.length===2&&bad.rivals[0].pers==='greedy'&&bad.rivals[0].ctr===null&&bad.rivals[1].hired===null&&!bad.parties.some(p=>p.id===9998),'repairs');
  // v10 -> v11: rivals from the seed, caravans' cargo filled, the outbid house moves to c.outbid
  const old=X.clone(G);old.v=10;delete old.rivals;delete old.rvn;old.parties=old.parties.filter(p=>p.goal!=='merc');for(const p of old.parties)if(p.cargo)p.cargo={good:p.cargo.good,crowns:p.cargo.crowns};
  if(old.towns[0].contracts[0])old.towns[0].contracts[0].rival='h1';
  const raw=JSON.stringify(old);X.store.set(X.SAVEKEY,raw);const m1=X.readSave();X.store.set(X.SAVEKEY,raw);const m2=X.readSave();ok(m1.state==='ok'&&m1.v===10,'v10 save reads: '+m1.state+' '+(m1.why||''));
  const g=m1.g;ok(g.v===X.SAVEVER&&Array.isArray(g.rivals)&&g.rivals.length===2&&g.rivals.every(r=>r.alive&&r.roster.length>=5),'migrated rivals');ok(JSON.stringify(g.rivals)===JSON.stringify(m2.g.rivals),'migrating twice gives the same rivals');
  ok(g.parties.filter(p=>p.goal==='caravan').every(p=>Array.isArray(p.cargo.items)&&Array.isArray(p.cargo.trade))&&g.parties.filter(p=>p.cargo).every(p=>p.cargo.crowns===old.parties.find(q=>q.id===p.id).cargo.crowns),'old caravans carry a full cargo, purse kept');
  if(old.towns[0].contracts[0])ok(g.towns[0].contracts[0].outbid==='h1'&&!g.towns[0].contracts[0].rival,'outbid house moved to c.outbid');
  const ids=new Set(g.roster.map(m=>m.id));ok(g.rivals.every(r=>r.roster.every(m=>!ids.has(m.id))),'rival merc ids do not clash');
  X.G=g;X.setRngState(g.rng);X.W=X.genWorld(g.seed);X.mode='world';for(let d=0;d<8;d++)day(X.G);ok(X.G.rivals.some(r=>r.deeds.length),'the migrated rivals live');
  console.log('round trip, repair, v10 -> v11 migration (deterministic, cargo filled): ok') }

section('daily simulation cost');
{ const G=fresh(SEED);for(let d=0;d<3;d++)day(G);let k=0;while(G.parties.length<300){k++;if(k%3===0)X.wsSpawnCaravan(k%G.towns.length,(k*7+3)%G.towns.length);else X.spawnParty()}
  X.WSIM.cap=1000;const N=20;let tot=0,worst=0,rv=0;for(let d=0;d<N;d++){while(G.parties.length<300)X.spawnParty();G.day++;keepAlive(G);const t0=process.hrtime.bigint();X.worldDay();const ms=Number(process.hrtime.bigint()-t0)/1e6;tot+=ms;worst=Math.max(worst,ms);
   const t1=process.hrtime.bigint();X.rvDay([]);rv+=Number(process.hrtime.bigint()-t1)/1e6}
  X.WSIM.cap=300;console.log(`worldDay with rivals and ~300 parties: ${(tot/N).toFixed(2)} ms average, ${worst.toFixed(2)} ms worst; rvDay alone ${(rv/N).toFixed(3)} ms`);ok(tot/N<5,'daily simulation under 5 ms');ok(rv/N<2,'rivals under 2 ms a day');
  const t0=process.hrtime.bigint();for(let f=0;f<60;f++)X.moveParties(1/60);const fm=Number(process.hrtime.bigint()-t0)/1e6/60;console.log(`moveParties per frame: ${fm.toFixed(3)} ms`);ok(fm<2,'per-frame party step '+fm) }

console.log('\nrivals test passed');
