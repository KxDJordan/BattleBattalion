// Caravans test (caravan guards, ambushes and clashes, 42-caravans.js; world agent).
// Plain node, no browser:  node test/caravans.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the vm harness of test/rivals.js) and checks: guard strength by the home town's economy
// (a poor village's militia against a rich city's sellswords and captain), the ambush rule (a raiding band attacks a caravan iff the guards
// are no stronger), the deterministic auto-resolve (seeded per clash, no game randomness drawn, replayed: identical; both outcomes happen;
// prosperity as wsArrive's opposite), joining a clash (the guards fight on the company's side: ally units, AI-played, outside deployment and
// the company's dead), killing a guard turns every guard hostile (side 2, foes of the company and still of the raiders), the outcomes and
// standing (saved with a reward, no guard left and the escort, the wagon burned, robbed, the fight going on after a lost battle), raiders'
// plunder, the map figure keys, a 45-day world (caravans mostly arrive, and never leave the road), the roads (every route on road tiles,
// link by link, in every world size; only towns the roads join trade; an old caravan off the road is put back on it), and the save round
// trip with a clash in progress (and v15 -> v16).
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
const TS=X.TS;
const canon=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((a,q)=>(a[q]=v[q],a),{}):v);
// a caravan out of town a toward b standing at (x,y), and a band of faction f, strength m, standing dx world units from it
const caravanAt=(G,a,b,x,y)=>{const c=X.wsSpawnCaravan(a,b);c.x=x;c.y=y;c.tx=x;c.ty=y;return c};
const bandBy=(G,c,f,m,dx)=>{const p={id:G.nid++,x:c.x+(dx==null?20:dx),y:c.y,tx:c.x,ty:c.y,f,mult:m,goal:'roam'};G.parties.push(p);return p};
const clashNear=(G,m,gm)=>{const c=caravanAt(G,0,1,G.p.x+40,G.p.y),g=c.guard;g.t=Math.min(g.t,3);g.cap=0;g.n=Math.min(g.n,5);c.mult=gm!=null?gm:Math.min(X.cvGuardMult(g),(m==null?1:m)-.05);const r=bandBy(G,c,'bandit',m==null?1:m);X.cvHour();return{c,r,cl:X.cvOf(c)}};
const battle=o=>X.autoBattle(Object.assign(o,{turnCap:1500}));

(async()=>{
section('guards by economy');
{ const G=fresh(SEED),t=G.towns;
  // the same town, poor and rich: a village of 25 prosperity in famine against a great city of 90 in a boom under a greedy house
  const poor=Object.assign(X.clone(t[1]),{size:1,pros:25,sit:[{k:'famine',days:5}],own:'free'}),rich=Object.assign(X.clone(t[1]),{size:3,pros:90,sit:[{k:'boom',days:5}]});
  t.push(poor,rich);const ip=t.length-2,ir=t.length-1;const hg=G.houses.find(h=>X.HPERS[h.pers].gold);if(hg)rich.own=hg.id;
  const gp=X.cvGuardFor(ip,.5),gr=X.cvGuardFor(ir,.5);
  ok(gp.t===1&&gp.n<=3&&!gp.cap,'a poor village hires a few militia: '+JSON.stringify(gp));
  ok(gr.t===5&&gr.n===8&&gr.cap===1,'a rich city fields eight veteran sellswords under a captain: '+JSON.stringify(gr));
  ok(X.cvGuardMult(gp)<.4&&X.cvGuardMult(gr)>1.3,`strength ${X.cvGuardMult(gp)} vs ${X.cvGuardMult(gr)}`);
  // monotone in prosperity and size
  let last=0;for(let pr=0;pr<=100;pr+=10){const x=Object.assign(X.clone(t[1]),{size:2,pros:pr,sit:[],own:'free'});t.push(x);const m=X.cvGuardMult(X.cvGuardFor(t.length-1,.5));ok(m>=last,'richer towns never hire weaker guards ('+pr+')');last=m;t.pop()}
  for(const sz of [1,2,3]){const x=Object.assign(X.clone(t[1]),{size:sz,pros:60,sit:[],own:'free'});t.push(x);const g=X.cvGuardFor(t.length-1,.5);console.log(`  size ${sz}, prosperity 60: ${X.cvGuardLine({guard:g})} -> strength ${X.cvGuardMult(g)}`);t.pop()}
  console.log(`  poor village: ${X.cvGuardLine({guard:gp})} -> ${X.cvGuardMult(gp)}; rich city: ${X.cvGuardLine({guard:gr})} -> ${X.cvGuardMult(gr)}`);
  // the composition: militia spears and a bow; sellswords, crossbows, a captain
  ok(X.cvGuardIds(gp).every(id=>id==='thug'||id==='bmark'),'militia: spears and bows '+X.cvGuardIds(gp));
  const ri=X.cvGuardIds(gr);ok(ri[0]==='blead'&&ri.includes('bxbow')&&ri.filter(id=>id==='braid').length>=3,'sellswords with crossbows and a captain '+ri);
  // a caravan sets out with its home town's guards, on the one rnd draw it always took
  t.length=t.length-2;const s0=X.rngState();const c=X.wsSpawnCaravan(0,1);const s1=X.rngState();X.setRngState(s0);X.rnd();const g0=X.cvGuardFor(0,.5);
  ok(c&&c.guard&&c.guard.t===g0.t&&c.guard.n===g0.n&&c.mult===X.cvGuardMult(c.guard),'a caravan carries the guards of its home town: '+JSON.stringify(c.guard));
  X.setRngState(s0);X.rnd();X.cargoRoll(t[0].spec&&t[0].spec.length?t[0].spec[0]:'ale');ok(X.rngState()===s1,'a caravan draws from the game stream as before (one draw, then its cargo)');
  ok(/^Guarded by \d+ .+ \((weak|light|fair|strong|very strong)\)$/.test(X.cvGuardLine(c)),'the guard line: '+X.cvGuardLine(c));
  ok(X.cvFigKey(Object.assign({},c,{guard:gp}))!==X.cvFigKey(Object.assign({},c,{guard:gr}))&&X.cvFigKey({guard:gr})==="g531",'the map figure shows the guards: '+X.cvFigKey({guard:gp})+' / '+X.cvFigKey({guard:gr}));
  // attacking a caravan outright: its own guards, named so
  const o=X.partyBattle(c);ok(Array.isArray(o.foes)&&o.foes.length===c.guard.n&&o.mult===c.mult&&o.src.goal==='caravan','the caravan battle fields its guards: '+o.foes);
  console.log('guards by economy: ok') }

section('the ambush rule');
{ const G=fresh(SEED);
  const c=caravanAt(G,0,1,G.p.x+40,G.p.y),s=X.cvStr(c);
  const weak=bandBy(G,c,'bandit',Math.round((s-.01)*100)/100);X.cvHour();ok(!c.clash&&!weak.clash,'a band weaker than the guards lets the caravan pass');
  weak.gone=1;G.parties=G.parties.filter(p=>!p.gone);
  const even=bandBy(G,c,'bandit',s);X.cvHour();ok(c.clash&&even.clash&&c.clash===even.clash,'a band as strong as the guards attacks ('+s+' vs '+even.mult+')');
  const cl=X.cvOf(c);ok(cl&&cl.c===c.id&&cl.r===even.id&&Math.abs(cl.x-(c.x+even.x)/2)<1&&Math.abs(even.x-c.x)>40&&Math.abs(even.x-c.x)<60,'they stand side by side');
  // the clashing pair stands still while the world moves
  const x0=c.x,y0=c.y,ex=even.x;for(let i=0;i<20;i++)X.moveParties(.5);X.wsStep(c);ok(c.x===x0&&c.y===y0&&even.x===ex,'a clash does not move');
  const c2=caravanAt(G,1,0,G.p.x+40,G.p.y+8*TS);
  for(const [f,why] of [['void','rift spawn do not raid caravans'],['ent','ents keep to their groves']]){const b=bandBy(G,c2,f,5);X.cvHour();ok(!c2.clash,why);b.gone=1;G.parties=G.parties.filter(p=>!p.gone)}
  const far=bandBy(G,c2,'orc',5,2*TS);X.cvHour();ok(!c2.clash,'a band two tiles off does not see it');far.gone=1;G.parties=G.parties.filter(p=>!p.gone);
  const chase=bandBy(G,c2,'orc',5);chase.ch=1;X.cvHour();ok(!c2.clash,'a band chasing the company has other business');chase.ch=0;
  const cool=chase;cool.cvCd=G.day;X.cvHour();ok(!c2.clash,'a band that just fought rests');delete cool.cvCd;X.cvHour();ok(c2.clash&&cool.clash,'orcs fall on a caravan');
  ok(X.partyHostile(even)&&!X.partyHostile(c),'raiders stay hostile, caravans neutral');
  console.log('the ambush rule: ok') }

section('auto-resolve');
{ const G=fresh(SEED);const {c,r,cl}=clashNear(G,1);ok(cl,'a clash');
  const g1=X.clone(G),s0=X.rngState();const run=()=>{const L=[];for(let i=0;i<30&&X.cvList().length;i++){X.cvHour();const q=X.cvList()[0];L.push(q?[q.gh,q.rh,q.h].join('/'):'end')}return L};
  const a=run();ok(X.rngState()===s0,'the clash draws no game randomness');const ea={c:G.parties.some(p=>p.id===c.id),r:G.parties.find(p=>p.id===r.id)};
  X.G=g1;const b=run();ok(JSON.stringify(a)===JSON.stringify(b),'replayed from the same state: the same fight '+a.slice(0,4).join(' '));
  ok(a[a.length-1]==='end'&&a.length>=3&&a.length<=22,'it ends by itself within a day ('+a.length+' hours)');
  // both outcomes happen, by strength
  const tally={guards:0,raiders:0},hrs=[];let gW=0,gL=0;
  for(let k=0;k<60;k++){const G2=fresh(SEED+k),rm=.5+(k%6)*.12,gm=Math.round(rm*(.6+(k%5)*.1)*100)/100,{c:c2,cl:q}=clashNear(G2,rm,gm);if(!q){ok(false,'no clash '+rm+' '+gm);continue}
   const A=G2.towns[c2.from],T=G2.towns[c2.to],pa=A.pros,pt=T.pros;let h=0;while(X.cvList().length&&h<30){X.cvHour();h++}hrs.push(h);
   const alive=G2.parties.some(p=>p.id===c2.id);tally[alive?'guards':'raiders']++;
   if(alive){gW++;ok(!c2.clash&&c2.guard.n<=X.cvGuardOf(c2).n,'the guards beat them off and go on')}else{gL++;ok(A.pros<pa||pa===0,'a lost caravan costs its home town');const rr=G2.parties.find(p=>p.id===q.r);ok(!rr||rr.loot,'the band carries the plunder')}}
  ok(tally.guards>=5&&tally.raiders>=15,'both outcomes: '+JSON.stringify(tally));
  console.log(`  60 clashes: ${JSON.stringify(tally)}, ${Math.min(...hrs)}..${Math.max(...hrs)} hours`);
  console.log('auto-resolve: ok') }

section('intervene: the guards fight on the company\'s side');
{ const G=fresh(SEED);keepAlive(G);const {c,cl}=clashNear(G,1.1);const o=X.cvBattle(cl);
  ok(o&&o.src.type==='clash'&&o.cv&&o.cv.n>=1&&o.cv.c===c.id,'battle options with the guards: '+JSON.stringify(o.cv));
  ok(o.mult<=1.1&&o.mult>=.35,'the band is as worn as the fight left it: '+o.mult);
  const roster0=G.roster.map(m=>m.id).join(),b=X.startBattle(Object.assign({},o,{auto:true,quiet:true,turnCap:1}));
  const gu=b.units.filter(u=>u.grd),wg=b.units.find(u=>u.cvw);
  ok(gu.length===o.cv.n&&gu.every(u=>u.side===0&&u.ally&&!u.m&&/Caravan|Guard|Militia/.test(u.name)),'the guards stand on the company\'s side as allies: '+gu.map(u=>u.name).join(', '));
  ok(wg&&wg.side===0&&wg.vip,'the wagon is there');ok(G.roster.map(m=>m.id).join()===roster0,'the guards are not the company\'s');
  ok(gu.every(u=>u.r<X.DEPLOY.p.front-1),'they stand ahead of the company, outside its deployment rows');
  // a fight to the end with the AI
  const res=await battle(Object.assign({},o));ok(res&&!res.stuck,'the battle ends');
  const B=X.B;ok(B.units.filter(u=>u.grd).every(u=>u.side===0||B.cv.turned),'the guards stayed allies');
  ok(!res.dead.some(n=>B.units.some(u=>u.grd&&u.name===n)),'fallen guards are not the company\'s dead');
  ok(res.cv&&res.cv.n0===o.cv.n&&!res.cv.turned,'the result knows the guards: '+JSON.stringify(res.cv));
  const r0=G.rep[c.f]||0,cr0=G.crowns,out=X.settleBattle(res.win);
  if(res.win){ok(out.world.cv&&(out.world.cv.k==='saved'||out.world.cv.k==='alone'||out.world.cv.k==='burned'),'outcome '+out.world.cv.k);
   if(out.world.cv.k!=='burned'){ok((G.rep[c.f]||0)>r0,'saving the caravan earns standing');ok(G.crowns>cr0&&out.world.cv.crowns>=40,'and a reward from the caravan master: '+out.world.cv.crowns);ok(G.parties.some(p=>p.id===c.id&&!p.clash),'the caravan goes on')}
   ok(!X.cvList().length,'the clash is over')}
  else ok(X.cvList().length<=1,'lost: the clash goes on or ends');
  console.log(`  ${res.win?'won':'lost'} in ${res.rounds} rounds; ${res.cv.alive}/${res.cv.n0} guards stand; ${out.world.cv&&out.world.cv.k}`);
  console.log('intervene: ok') }

section('killing a guard turns the caravan');
{ const G=fresh(SEED+1);keepAlive(G);const {c,cl}=clashNear(G,1);const o=X.cvBattle(cl);
  const b=X.startBattle(Object.assign({},o,{quiet:true,turnCap:0}));const me=b.units.find(u=>u.side===0&&u.m),gu=b.units.filter(u=>u.grd);ok(gu.length>=2,'guards');
  // a stray blow from an ally does not count; a company sword's does
  X.killUnit(gu[gu.length-1],b.units.find(u=>u.side===1));ok(!b.cv.turned&&gu.slice(0,-1).every(u=>u.side===0&&u.ally),'a guard killed by a raider is only lost');
  X.killUnit(gu[0],me);ok(b.cv.turned&&gu.filter(u=>u.alive).every(u=>u.side===2&&!u.ally),'every guard turns hostile at once');
  ok(/killed a caravan guard: the caravan turns on you/.test(String(b.log||'')),'the log says so: '+b.log);ok(b.floats.some(f=>f.txt==='Hostile!'),'and each guard shows it');
  const g2=gu.find(u=>u.alive);if(g2){ok(X.validTargets(me,X.abilityInfo(me,'attack')).size>=0,'targets');
   const R=b.units.find(u=>u.side===1&&u.alive);ok(R&&R.side!==g2.side&&g2.side!==me.side,'guards, raiders and the company: three sides, all foes')}
  ok(!X.checkEnd(),'the battle goes on while turned guards stand');
  // finish it: everyone not of the company falls
  for(const u of b.units)if(u.alive&&u.side!==0&&!u.vip)X.killUnit(u,me);b.over=false;ok(X.checkEnd(),'and ends when guards and raiders are down');
  await new Promise(r=>setTimeout(r,5));const res=b.result||X.endBattle(true);ok(res.cv&&res.cv.turned&&res.cv.by===me.name,'the result: turned by '+me.name);
  const r0=G.rep[c.f]||0,cr0=G.crowns,out=X.settleBattle(true);ok((G.rep[c.f]||0)<r0,'turning on a caravan costs standing: '+((G.rep[c.f]||0)-r0));
  ok(out.world.cv.k==='robbed'&&!G.parties.some(p=>p.id===c.id)&&out.world.cargo,'the cargo is taken, the caravan gone');ok(!X.cvList().length,'the clash is over');
  console.log('killing a guard: ok') }

section('outcomes');
{ // no guard left standing: escort it or let it go
  let G=fresh(SEED+2);keepAlive(G);let q=clashNear(G,1);let b=X.startBattle(Object.assign({},X.cvBattle(q.cl),{quiet:true,turnCap:0}));
  for(const u of b.units)if(u.grd)X.killUnit(u,b.units.find(x=>x.side===1));for(const u of b.units)if(u.side===1)X.killUnit(u,b.units.find(x=>x.m));
  let res=b.result||X.endBattle(true),out=X.settleBattle(true);ok(out.world.cv.k==='alone'&&out.world.cv.alive===0,'won, every guard dead: '+out.world.cv.k);
  const C=G.parties.find(p=>p.id===q.c.id);ok(C&&C.guard.n===0,'the caravan has no guards left');ok(X.cvEscort(C.id,1)&&C.esc&&C.esc.pay>0,'the company takes over the escort');
  const T=G.towns[C.to],pay=C.esc.pay;G.p.x=T.x;G.p.y=T.y;const cr0=G.crowns,r0=G.rep[C.f]||0;X.cvEscArrive(C);ok(G.crowns===cr0+pay&&!C.esc,'paid at the gate: '+pay);ok((G.rep[C.f]||0)>r0,'and remembered');
  // the wagon burns
  G=fresh(SEED+3);keepAlive(G);q=clashNear(G,1);b=X.startBattle(Object.assign({},X.cvBattle(q.cl),{quiet:true,turnCap:0}));X.killUnit(b.cv.wagon,b.units.find(x=>x.side===1));
  for(const u of b.units)if(u.side===1)X.killUnit(u,b.units.find(x=>x.m));res=b.result||X.endBattle(true);out=X.settleBattle(true);ok(out.world.cv.k==='burned'&&!G.parties.some(p=>p.id===q.c.id),'the wagon burned: the caravan is lost');
  // lost (the company fled): the clash goes on with what is left
  G=fresh(SEED+4);keepAlive(G);q=clashNear(G,1);const gh0=q.cl.gh;b=X.startBattle(Object.assign({},X.cvBattle(q.cl),{quiet:true,turnCap:0}));
  const g0=b.units.find(u=>u.grd);g0.hp=Math.round(g0.hp/2);for(const u of b.units)if(u.side===0&&u.m)X.leaveField(u,'retreat');ok(X.checkEnd(),'the company has left');
  res=b.result||X.endBattle(false);out=X.settleBattle(false);const cl2=X.cvById(q.cl.id);ok(out.world.cv.k==='left'&&cl2&&cl2.gh<gh0&&cl2.bo,'the fight goes on without the company: '+(cl2&&cl2.gh));
  ok(G.parties.find(p=>p.id===q.c.id).clash===cl2.id,'still locked in it');
  // beating a band that carries a caravan's plunder hands it over
  G=fresh(SEED+5);keepAlive(G);q=clashNear(G,1.2,.2);let h=0;while(X.cvList().length&&h<30){X.cvHour();h++}const band=G.parties.find(p=>p.id===q.r.id);
  ok(band&&band.loot&&!G.parties.some(p=>p.id===q.c.id),'the band plundered the caravan');const w=X.worldBattleEnd({type:'party',id:band.id,goal:'roam',pf:band.f},true);ok(w.cargo&&w.crowns>=0&&!G.parties.some(p=>p.id===band.id),'the plunder is the company\'s: '+(w.cargo&&w.cargo.text));
  console.log('outcomes: ok') }

section('the tap on a guard');
{ const G=fresh(SEED+6);keepAlive(G);const {cl}=clashNear(G,1);const b=X.startBattle(Object.assign({},X.cvBattle(cl),{quiet:true,turnCap:0}));
  const g=b.units.find(u=>u.grd),me=b.units.find(u=>u.side===0&&u.m);me.c=g.c;me.r=g.r+1;if(X.unitAt(me.c,me.r)!==me){const o=X.unitAt(me.c,me.r);if(o)o.c=(o.c+3)%X.BW}
  b.cur=me;b.busy=false;me.ap=me.apMax;const hp0=g.hp;X.cvTapGuard(me,g,X.key(g.c,g.r));ok(g.hp===hp0&&b.cvArm,'the first tap only warns');
  X.cvTapGuard(me,g,X.key(g.c,g.r));await new Promise(r=>setTimeout(r,5));ok(me.ap<me.apMax,'the second tap strikes');
  console.log('the tap on a guard: ok') }

section('a world of caravans');
{ const G=fresh(SEED);let seen=new Set(),cl=new Set(),lost=0;const E0=X.cvEnd;X.cvEnd=function(q,who,qu){if(who==='raiders')lost++;return E0(q,who,qu)};
  const t0=Date.now();let offRoad=0,looks=0;for(let d=0;d<45;d++){keepAlive(G);for(let i=0;i<60;i++){X.advanceTime(.4);X.moveParties(.5);closeAll(X);for(const p of G.parties)if(p.goal==='caravan'){seen.add(p.id);looks++;if(!X.onRoad(p.x,p.y))offRoad++}for(const q of X.cvList())cl.add(q.id)}
   if(d%3===0)for(let k=0;k<6;k++){G.p.x=G.towns[(d+k)%G.towns.length].x;G.p.y=G.towns[(d+k)%G.towns.length].y;X.moveParties(.5)}}   // the company stands in different places: caravans near and far
  ok(!offRoad,`every caravan stays on the road: ${offRoad} of ${looks} positions off it`);
  X.cvEnd=E0;ok(seen.size>=40,'caravans on the roads: '+seen.size);ok(lost<=seen.size*.3,`most caravans arrive: ${lost} of ${seen.size} lost`);ok(cl.size>=1,'and some are ambushed: '+cl.size);
  ok(G.towns.every(t=>t.pros>=0&&t.pros<=100),'prosperity stays in range');console.log(`  45 days: ${seen.size} caravans, ${cl.size} ambushed, ${lost} lost (${Date.now()-t0} ms)`);
  console.log('a world of caravans: ok') }

section('the roads');
{ // every route a caravan can take runs on road tiles, link by link, in every world size; towns the roads do not join have none
  const sizes=['small','medium','large','vast'];let pairs=0,linked=0,worlds=0;const t0=Date.now();
  for(const sz of sizes)for(let k=0;k<(sz==='small'?6:2);k++){X.setWorldSize(sz);X.seedRng(SEED+31*k+sizes.indexOf(sz));X.newGame(true,{wsize:sz});closeAll(X);const G=X.G,W=X.W,WN=X.WN;worlds++;
   for(let a=0;a<G.towns.length;a++)for(let b=0;b<G.towns.length;b++){if(a===b)continue;pairs++;const r=X.wsRoute(a,b),A=G.towns[a],B=G.towns[b];
    const L=X.rdTiles(X.rdTile(A.x,A.y),X.rdTile(B.x,B.y));ok(!r===!L,'a route exactly when the roads join the towns');if(!r)continue;linked++;
    ok(r[0].x===A.x&&r[0].y===A.y&&r[r.length-1].x===B.x&&r[r.length-1].y===B.y,'from town to town');
    for(let i=1;i<r.length;i++){const p=r[i-1],q=r[i];ok(p.x===q.x||p.y===q.y,'straight runs along the road');const n=Math.round(Math.hypot(q.x-p.x,q.y-p.y)/X.TS);
     for(let j=0;j<=n;j++){const x=p.x+(q.x-p.x)*j/Math.max(1,n),y=p.y+(q.y-p.y)*j/Math.max(1,n);ok(X.onRoad(x,y),`${sz} world: route ${a}->${b} leaves the road at ${Math.floor(x/X.TS)},${Math.floor(y/X.TS)}`)}
     if(n>=1){const k0=X.rdTile(p.x,p.y),k1=X.rdTile(q.x,q.y),d=k1-k0,st=Math.sign(d)*(Math.abs(d)>=WN?WN:1);for(let t=k0;t!==k1;t+=st){const j=st===-WN?0:st===1?1:st===WN?2:3;ok(W.road[t]&(1<<j),'and follows the road\'s own links')}}}}
   // a caravan sets out only between towns the roads join
   for(let i=0;i<30;i++)X.wsTrade();for(const p of G.parties)if(p.goal==='caravan')ok(X.wsLinked(p.from,p.to)&&p.rd,'trade runs on linked roads only')}
  X.setWorldSize('small');ok(linked>=pairs*.9,`the road net joins most towns: ${linked} of ${pairs} pairs`);
  console.log(`  ${worlds} worlds (small, medium, large, vast): ${linked}/${pairs} town pairs joined by road, every route on road tiles (${Date.now()-t0} ms)`);
  // an old caravan off the road (a save from before the road rule): it is put back on the nearest road to its town, the same way every time
  const G=fresh(SEED);const c=X.wsSpawnCaravan(0,1);const P=X.findPath(Math.floor(c.x/TS),Math.floor(c.y/TS),Math.floor(G.towns[1].x/TS),Math.floor(G.towns[1].y/TS));
  const off=X.randOk(G.towns[0].x,G.towns[0].y,2,3);let spot=off;for(let i=0;i<40&&X.onRoad(spot.x,spot.y);i++)spot=X.randOk(G.towns[0].x,G.towns[0].y,2,4);
  delete c.rd;c.pts=X.wsThin(P);c.pi=0;c.x=spot.x;c.y=spot.y;const c2=X.clone(c);ok(!X.onRoad(c.x,c.y),'off the road');G.p.x=c.x+TS*3;G.p.y=c.y;
  X.moveParties(.05);ok(c.rd===1&&X.onRoad(c.x,c.y)&&c.pts.every(q=>X.onRoad(q.x,q.y))&&c.pts[c.pts.length-1].x===G.towns[1].x,'re-routed onto the road to its town');
  ok(Math.hypot(c.x-spot.x,c.y-spot.y)<=4*TS,'from the road nearest to it: '+(Math.hypot(c.x-spot.x,c.y-spot.y)/TS).toFixed(1)+' tiles');
  const r3=Object.assign({},c2),r4=Object.assign({},c2);X.wsReroad(r3);X.wsReroad(r4);ok(JSON.stringify(r3.pts)===JSON.stringify(r4.pts)&&r3.x===r4.x,'the same way every time');
  // far from the company the daily step keeps it on the road too
  const c5=X.wsSpawnCaravan(0,1);G.p.x=G.towns[0].x+60*TS;for(let d=0;d<4&&!c5.gone;d++){X.wsStep(c5);ok(c5.gone||X.onRoad(c5.x,c5.y),'the daily step stays on the road')}
  console.log('the roads: ok') }

section('saves');
{ const G=fresh(SEED);keepAlive(G);const {c,r,cl}=clashNear(G,1);X.cvHour();cl.bo=1;r.loot=X.cargoRoll('ale',()=>.5,1);
  X.mode='world';ok(X.save(),'save');const rd=X.readSave();ok(rd.state==='ok','read back: '+rd.state+' '+(rd.why||''));
  const g=rd.g,cl2=g.clashes&&g.clashes.find(q=>q.id===cl.id);ok(cl2&&canon(cl2)===canon(cl),'the clash round trips: '+JSON.stringify(cl2)+' '+JSON.stringify(cl));
  const c2=g.parties.find(p=>p.id===c.id),r2=g.parties.find(p=>p.id===r.id);ok(c2.clash===cl.id&&r2.clash===cl.id&&JSON.stringify(c2.guard)===JSON.stringify(c.guard),'the parties keep their clash and guards');
  ok(r2.loot&&r2.loot.good==='ale','the plunder round trips');
  // the loaded game goes on with the fight
  X.G=g;X.setRngState(g.rng);let h=0;while(X.cvList().length&&h<30){X.cvHour();h++}ok(!X.cvList().length,'and it is fought out after loading');
  // damaged clash records are dropped, never fatal
  const bad=X.clone(G);bad.clashes.push({id:'x'},{id:5,c:-1,r:-2},{id:6,c:c.id,r:r.id});bad.parties.push({id:9997,x:1,y:1,tx:1,ty:1,f:'bandit',mult:1,goal:'roam',clash:777});bad.parties.find(p=>p.id===c.id).guard={n:'a'};
  ok(X.repairSave(bad)==='','repaired');ok(bad.clashes.length===1&&!bad.parties.find(p=>p.id===9997).clash,'only the good clash is kept');ok(!bad.parties.find(p=>p.id===c.id).guard||Number.isInteger(bad.parties.find(p=>p.id===c.id).guard.n),'guards repaired');
  // v15 -> v16: guards for the caravans on the road, from their home town, no randomness
  const old=X.clone(G);old.v=15;delete old.clashes;for(const p of old.parties){delete p.clash;if(p.goal==='caravan'){delete p.guard;p.mult=.7}}
  const raw=JSON.stringify(old);X.store.set(X.SAVEKEY,raw);const m1=X.readSave();X.store.set(X.SAVEKEY,raw);const m2=X.readSave();ok(m1.state==='ok'&&m1.v===15,'v15 save reads: '+m1.state+' '+(m1.why||''));
  ok(m1.g.v===X.SAVEVER&&X.SAVEVER===16&&Array.isArray(m1.g.clashes)&&!m1.g.clashes.length,'migrated: no clashes');
  ok(m1.g.parties.filter(p=>p.goal==='caravan').every(p=>p.guard&&p.mult===X.cvGuardMult(p.guard)),'old caravans get their guards');ok(JSON.stringify(m1.g.parties)===JSON.stringify(m2.g.parties),'migrating twice: the same');
  console.log('saves: ok') }

console.log('\nALL CARAVAN TESTS PASSED');process.exit(0)
})().catch(e=>fail(e&&e.stack||e));
