// Escort test (live escorts, 42-caravans.js "LIVE ESCORTS"; 16-contracts.js CTYPES.escort).
// Plain node, no browser:  node test/escort.js [--seed N]
// Checks: accepting an escort sends a real caravan out of the employer town (its guards from that town's purse, the road to the
// destination) and ties the company to it; the company cannot march elsewhere (the notice); the march keeps beside the wagons on
// the road; the raid rule on the whole escort (guards + the company's 1); the band of the contract's foe waiting ahead; the battle
// beside the allied guards with the wagon to keep alive; outcomes (beaten off, the wagon burned, a guard killed, a flight: the clash);
// arrival completes the delivery and the pay is collected there; abandoning releases the company; save and load mid-escort; an old
// escort (before live escorts) converted; the due date from the road.
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
const toasts=[];{const t0=X.ctx.toast;X.ctx.toast=function(t){toasts.push(String(t));return t0(t)}}
const onRoad=(x,y)=>X.onRoad(x,y);
// an escort contract for town ti (one with a route the roads join), accepted at that town
function escortAt(G,ti){ti=ti||0;const t=G.towns[ti];let c=null;for(let g=0;g<40&&!c;g++)c=X.CTYPES.escort.gen(t,ti);ok(c,'an escort is posted');c.twist=null;
 G.p.x=t.x;G.p.y=t.y;G.town=ti;ok(X.ctrAccept(c)&&G.contract===c,'accepted');return c}
// world frames until cond() (or n frames); sheets are closed as they come unless keep
function run(cond,n,keep){for(let i=0;i<(n||200000);i++){if(cond&&cond())return true;if(X.mode!=='world')return cond?!!cond():true;if(X.sheetOpen){if(keep)return false;closeAll(X)}X.worldTick(.05)}return cond?!!cond():true}
const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)/TS;
const battle=o=>X.autoBattle(Object.assign(o,{turnCap:1500}));

(async()=>{
section('accepting an escort');
{ const G=fresh(SEED);keepAlive(G);const c=escortAt(G,0),C=X.escParty(c),T=G.towns[c.to];
  ok(C&&C.goal==='caravan'&&C.ctr===c.id&&c.live===1&&c.cv===C.id&&C.from===c.town&&C.to===c.to,'a real caravan sets out: '+JSON.stringify({id:C&&C.id,from:C&&C.from,to:C&&C.to}));
  const g0=X.cvGuardFor(c.town,.5);ok(C.guard&&C.guard.t===g0.t&&C.guard.n===g0.n&&C.mult===X.cvGuardMult(C.guard),'with its own guards, hired by the employer town: '+X.cvGuardLine(C));
  ok(C.pts.every(p=>onRoad(p.x,p.y))&&C.pts[C.pts.length-1].x===T.x&&C.pts[C.pts.length-1].y===T.y,'bound for '+T.name+' along the road');
  ok(G.moving&&X.escOn()&&X.escOn().p===C,'the company is tied to it');
  const len=X.rdLen(C.pts,C.x,C.y,0);ok(c.due>=G.day+Math.ceil(len/X.ESC.day)+X.ESC.slack-1,'the due date follows the road: '+c.due+' for '+Math.round(len)+' leagues');
  const st=X.ctrStatus(c);ok(new RegExp('^Escorting the caravan to '+T.name+' — \\d+ leagues? left, by day '+c.due).test(st),'the status line: '+st);
  ok(X.ctrMarks(c).length===1&&X.ctrMarks(c)[0].town===c.to,'the map marks the destination');ok(X.ctrTargetAt(T.x,T.y)===null,'walking there alone does nothing');
  // the band of the contract's foe waits ahead, at least a match for the whole escort
  const A=G.parties.find(p=>p.ambE===c.id);ok(A&&A.id===c.amb&&A.f===c.f,'a band of '+c.f+' lies in wait');const es=X.escStr(C);
  ok(A.mult>=es&&A.mult<=es*1.07+.01,'strength '+A.mult+' against the escort\'s '+es);
  let best=1e9,at=0,tot=0;{let px=C.x,py=C.y;for(const q of C.pts){const L=Math.hypot(q.x-px,q.y-py);for(let k=0;k<=8;k++){const x=px+(q.x-px)*k/8,y=py+(q.y-py)*k/8,d=Math.hypot(A.x-x,A.y-y);if(d<best){best=d;at=tot+L*k/8}}tot+=L;px=q.x;py=q.y}}
  ok(best<=1.9*TS&&!onRoad(A.x,A.y)||best<.2*TS,'beside the road: '+(best/TS).toFixed(2)+' tiles off it');ok(at/tot>.4&&at/tot<.7,'ahead, about half way: '+(at/tot).toFixed(2));
  // deterministic: the same seed, the same caravan and band
  const sig=JSON.stringify([C.pts,C.guard,A.x,A.y,A.mult]);const G2=fresh(SEED);keepAlive(G2);const c2=escortAt(G2,0),C2=X.escParty(c2),A2=G2.parties.find(p=>p.ambE===c2.id);ok(JSON.stringify([C2.pts,C2.guard,A2.x,A2.y,A2.mult])===sig,'replayed from the seed: the same');
  console.log(`  ${G.towns[c.town].name} -> ${T.name}: ${Math.round(len)} leagues, due day ${c.due} (day ${G.day}); ${X.cvGuardLine(C)}; ${c.f} band ${A.mult} vs escort ${es}`);
  console.log('accepting an escort: ok') }

section('the march');
{ const G=fresh(SEED+1);keepAlive(G);const c=escortAt(G,0),C=X.escParty(c),T=G.towns[c.to];
  for(const p of G.parties)if(p!==C&&X.partyHostile(p))p.gone=1;G.parties=G.parties.filter(p=>!p.gone);   // a quiet road: the march alone
  let far=0,off=0,frames=0,h0=G.day*24+G.hour,x0=G.p.x;
  for(let i=0;i<4000&&G.contract===c&&X.escParty(c);i++){X.worldTick(.05);if(X.sheetOpen)closeAll(X);frames++;if(X.mode!=='world')break;if(near(G.p,C)>X.ESC.tie)far++;if(!onRoad(C.x,C.y))off++;if(i===120)break}
  ok(X.mode==='world'&&!far,'the company keeps beside the wagons');ok(!off,'the wagons keep to the road');ok(G.day*24+G.hour>h0+1,'the hours pass as they roll');ok(Math.hypot(G.p.x-x0,1)>TS,'the company has marched');
  // halting: the caravan halts too
  X.camp();ok(!G.moving,'the camp button halts the march');const cx=C.x,cy=C.y,hh=G.hour;for(let i=0;i<50;i++)X.worldTick(.05);ok(C.x===cx&&C.y===cy&&G.hour===hh,'halted: the wagons wait, the world waits');
  // marching elsewhere: the notice, and the march stays the caravan's
  const n0=toasts.length,o=G.towns.find((t,i)=>i!==c.to&&i!==c.town);ok(X.goTo(o.x,o.y,{type:'town',i:G.towns.indexOf(o)})===true,'goTo is answered');
  ok(toasts.length===n0+1&&new RegExp('You are escorting the caravan to '+T.name).test(toasts[n0]),'the notice: '+toasts[n0]);ok(G.moving&&!G.path.length&&!G.dest,'the company does not leave: it marches on with the wagons');
  for(let i=0;i<200;i++)X.worldTick(.05);ok(near(G.p,C)<=X.ESC.tie&&near(G.p,o)>2,'still beside the caravan');
  {const n1=toasts.length;X.worldTap(G.towns[c.to].x,G.towns[c.to].y);ok(toasts.length===n1,'a tap on the destination (or the caravan) needs no notice: '+JSON.stringify(toasts.slice(n1)))}
  console.log(`  ${frames} frames beside the wagons, ${near(G.p,G.towns[c.town]).toFixed(1)} leagues out`);
  console.log('the march: ok') }


// a quiet road: every hostile band but the escort's own taken off the map (keep: also keep the waiting band)
const quiet=(G,c,keep)=>{for(const p of G.parties)if(X.partyHostile(p)&&!(keep&&p.ambE===c.id))p.gone=1;G.parties=G.parties.filter(p=>!p.gone)};
section('the raid rule: the whole escort');
{ const G=fresh(SEED+2);keepAlive(G);const c=escortAt(G,0),C=X.escParty(c);quiet(G,c);const es=X.escStr(C),e=X.escOn();
  const sh=X.escGuardShare(C);let cost=0;for(const id of X.cvGuardIds(C.guard))cost+=X.cvCost(id);const bud=X.battleBudget({f:'bandit',mult:1})/X.runK('budget');
  ok(Math.abs(sh-Math.min(1.5,cost/bud))<.006&&es===Math.round((1+.5*sh)*100)/100&&e.s===es,'the escort\'s strength: the company\'s 1 + half the guards\' share ('+cost+' crowns of guards / '+Math.round(bud)+' budget = '+sh+'): '+es);
  // a stronger company: the same guards are a smaller share of the escort
  {const G2=fresh(SEED+2),mil={guard:{n:3,t:1,cap:0,k:1}},s1=X.escGuardShare(mil);G2.roster.forEach(m=>X.gainXP(m,Math.max(0,X.XPT[5]-m.xp)));const s2=X.escGuardShare(mil);
   ok(s1>0&&s2<s1,'the same guards weigh less beside a stronger company: '+s1+' -> '+s2);X.G=G}
  const band=m=>({id:-1,f:'bandit',mult:m,x:0,y:0});
  ok(X.escSpare(band(es-.01),e)&&!X.escSpare(band(es),e)&&!X.escSpare(band(es+.5),e),'weaker bands leave it alone; a match for it or stronger try');
  ok(!X.escSpare(Object.assign(band(.3),{hunt:1}),e),'a band hunting the company comes anyway');
  // in the world: a weak band beside the road lets the wagons pass
  for(let i=0;i<20;i++)X.worldTick(.05);const ahead=k=>{const q=C.pts[Math.min(C.pts.length-1,(C.pi|0)+k)];return{x:q.x,y:q.y}};
  const q1=ahead(1),wk={id:G.nid++,x:q1.x+TS*.3,y:q1.y+TS*.3,tx:q1.x,ty:q1.y,f:'bandit',mult:Math.round((es-.3)*100)/100,goal:'roam',pts:[{x:q1.x,y:q1.y}],pi:0};G.parties.push(wk);
  const n0=toasts.length;let met=false;for(let i=0;i<300&&X.mode==='world'&&G.contract===c;i++){X.worldTick(.05);if(X.sheetOpen)closeAll(X);if(wk.ch)met=true}
  ok(X.mode==='world'&&!met&&!C.clash&&!toasts.slice(n0).some(t=>/move to raid/.test(t)),'a band weaker than the escort ('+wk.mult+' < '+es+') leaves it alone');
  wk.gone=1;G.parties=G.parties.filter(p=>!p.gone);
  // a band that is a match for it moves to raid, and the battle starts at once
  const q2=ahead(1),st={id:G.nid++,x:q2.x+TS,y:q2.y+TS*.5,tx:q2.x,ty:q2.y,f:'orc',mult:Math.round((es+.1)*100)/100,goal:'roam',pts:[{x:q2.x+TS,y:q2.y+TS*.5}],pi:0};G.parties.push(st);
  const n1=toasts.length;run(()=>X.mode==='battle'||G.contract!==c,3000);
  ok(X.mode==='battle','a band that is a match for the escort ('+st.mult+' >= '+es+') attacks');ok(toasts.slice(n1).some(t=>/move to raid the caravan/.test(t)),'with a notice: '+toasts.slice(n1).find(t=>/raid/.test(t)));
  ok(G.news.some(n=>/moved to raid a caravan/.test(n.t)),'and the news');
  const B=X.B,o=B.opts;ok(o.src.type==='escort'&&o.src.r===st.id&&o.src.c===C.id&&o.src.id===c.id&&B.obj&&B.obj.k==='escort','the escort battle: '+JSON.stringify(o.src));
  const gu=B.units.filter(u=>u.grd),wg=B.units.filter(u=>u.cvw||u.vip);ok(gu.length===C.guard.n&&gu.every(u=>u.side===0&&u.ally&&!u.m),'the caravan\'s '+gu.length+' guards fight beside the company');
  ok(wg.length===1&&wg[0]===B.obj.vip&&wg[0].cvw&&B.cv.wagon===wg[0],'one wagon: the objective is the caravan\'s');
  ok(B.units.filter(u=>u.side===1).length>0&&o.f==='orc','against the band');
  const res=await battle(Object.assign({},o));ok(res&&!res.stuck,'the battle is fought out');const out=X.settleBattle(res.win);
  console.log(`  the battle: ${res.win?'won':'lost'} in ${res.rounds} rounds, ${res.cv.alive}/${res.cv.n0} guards stand, wagon ${res.cv.wagon?'whole':'lost'} -> ${out.world.cv.k}`);
  ok(['held','esclost','escfled'].includes(out.world.cv.k),'an escort outcome');
  if(out.world.cv.k==='held')ok(G.contract===c&&X.escParty(c)===C&&!G.parties.some(p=>p.id===st.id)&&G.moving,'won: the band is gone and the march goes on');
  console.log('the raid rule: ok') }

section('the band that waits for it');
{ let fought=0,tries=0;for(let k=0;k<4;k++){const G=fresh(SEED+20+k);keepAlive(G);const c=escortAt(G,k%3),C=X.escParty(c),A=G.parties.find(p=>p.ambE===c.id);quiet(G,c,true);tries++;
   // other caravans pass it by: it waits for the escort
   ok(!X.cvRaider(A),'it does not fall on other caravans');const ax=A.x,ay=A.y;
   run(()=>X.mode==='battle'||G.contract!==c,20000);
   if(X.mode==='battle'){fought++;const o=X.B.opts;ok(o.src.type==='escort'&&o.src.r===A.id&&o.f===c.f,'the contract\'s foe attacks the escort: '+o.f);
    ok(Math.hypot(A.x-ax,A.y-ay)<5*TS,'it came from where it waited');X.B=null;X.mode='world'}
   else ok(false,'the waiting band never attacked ('+(G.contract===c?'still escorting':'contract '+(G.ctrLast&&G.ctrLast.why))+')')}
  ok(fought===tries,'every escort meets its band: '+fought+'/'+tries);
  console.log(`  ${fought} of ${tries} escorts met the band of the contract's foe on the road`);
  console.log('the band that waits: ok') }

// an escort battle started by hand: the waiting band attacks now
function raidNow(G,c){const C=X.escParty(c),A=G.parties.find(p=>p.ambE===c.id);const o=X.escBattle(c,C,A);const b=X.startBattle(Object.assign({},o,{quiet:true,turnCap:0}));return{C,A,o,b}}
section('outcomes');
{ // beaten off: the caravan rolls on
  let G=fresh(SEED+3);keepAlive(G);let c=escortAt(G,0),q=raidNow(G,c);const me=q.b.units.find(u=>u.side===0&&u.m);
  for(const u of q.b.units)if(u.side===1)X.killUnit(u,me);ok(X.checkEnd(),'over');let res=q.b.result||X.endBattle(true),out=X.settleBattle(true);
  ok(out.world.cv.k==='held'&&G.contract===c&&X.escParty(c)===q.C&&!G.parties.some(p=>p.id===q.A.id),'beaten off: '+out.world.cv.k);ok(G.moving&&c.raids===1,'the march goes on');
  // the wagon destroyed: the contract is failed
  G=fresh(SEED+4);keepAlive(G);c=escortAt(G,0);q=raidNow(G,c);X.killUnit(q.b.obj.vip,q.b.units.find(u=>u.side===1));ok(X.checkEnd()&&!q.b.result.win&&q.b.result.obj==='lost','the wagon falls: the battle is lost');
  out=X.settleBattle(false);ok(out.world.cv.k==='esclost'&&G.contract===null&&c.failed&&G.ctrLast.why==='The caravan was lost'&&!G.parties.some(p=>p.id===q.C.id),'the caravan was lost: '+G.ctrLast.why);
  // a guard killed by the company: the guards turn, the contract fails, standing lost as for attacking a caravan
  G=fresh(SEED+5);keepAlive(G);c=escortAt(G,0);q=raidNow(G,c);const me2=q.b.units.find(u=>u.side===0&&u.m),gu=q.b.units.filter(u=>u.grd);ok(gu.length>=1,'guards');const r0=G.rep[q.C.f]||0;
  X.killUnit(gu[0],me2);ok(q.b.cv.turned&&gu.filter(u=>u.alive).every(u=>u.side===2),'the guards turn on the company');ok(!X.checkEnd()||gu.length===1,'the fight goes on');
  for(const u of q.b.units)if(u.alive&&u.side!==0)X.killUnit(u,me2);q.b.over=false;ok(X.checkEnd(),'ends');res=q.b.result||X.endBattle(true);out=X.settleBattle(true);
  ok(out.world.cv.k==='robbed'&&G.contract===null&&G.ctrLast.why==='Turned on the caravan','turned: the contract failed: '+G.ctrLast.why);ok((G.rep[q.C.f]||0)<r0,'and the caravan\'s owner remembers: '+((G.rep[q.C.f]||0)-r0));
  // the company flees: the caravan fights on alone (a clash); the company is free to come back
  G=fresh(SEED+6);keepAlive(G);c=escortAt(G,0);{const C=X.escParty(c),A=G.parties.find(p=>p.ambE===c.id);out=X.fleeEncounter(X.escBattle(c,C,A));
   ok(out.world.cv.k==='escfled'&&C.clash&&X.cvOf(C)&&X.cvOf(C).r===A.id&&G.contract===c,'fled: the caravan and the band fight it out');ok(!X.escOn()&&/under attack/.test(X.ctrStatus(c)),'the company is released while they fight: '+X.ctrStatus(c));
   const o=G.towns.find((t,i)=>i!==c.to&&i!==c.town);ok(X.goTo(o.x,o.y)&&G.path.length>0,'it may march where it likes');X.clearRoute();
   let h=0;while(X.cvList().length&&h<40){X.cvHour();h++}const alive=G.parties.some(p=>p.id===C.id);
   if(alive)ok(G.contract===c&&!C.clash,'the guards held: the escort goes on');else ok(G.contract===null&&G.ctrLast.why==='The caravan was lost','the guards fell: the contract with them');
   console.log(`  fled: the caravan alone ${alive?'beat them off':'was lost'} in ${h} hours`)}
  console.log('outcomes: ok') }

section('the battle\'s measure');
{ // the waiting band (a match for the company + half the guards' share) against the company, the guards as hired and the wagon:
  // a hard fight but a fair one. The same companies against a plain even band (mult 1) for comparison.
  let ew=0,pw=0,wag=0;const N=8,L=[];for(let k=0;k<N;k++){let G=fresh(SEED+40+k);keepAlive(G);const c=escortAt(G,k%4),C=X.escParty(c),A=G.parties.find(p=>p.ambE===c.id),o=X.escBattle(c,C,A);
   ok(o.cv.gm===X.escGuardShare(C)&&o.obj.hpK===X.ESC.wagon,'the guards fight as hired, the wagon stands for the train');
   const r=await battle(Object.assign({},o,{quiet:true,auto:true}));X.settleBattle(r.win);if(r.win)ew++;if(r.cv&&r.cv.wagon)wag++;L.push(A.f+' '+A.mult+(r.win?' W':' L'));
   G=fresh(SEED+40+k);keepAlive(G);const r2=await battle({f:A.f,mult:1,src:{type:'sim'},quiet:true,auto:true});X.settleBattle(r2.win);if(r2.win)pw++}
  console.log(`  escort raids won ${ew}/${N} (wagon kept ${wag}), plain even fights ${pw}/${N}: ${L.join(', ')}`);ok(ew>=N/2-1,'an escort raid is winnable: '+ew+'/'+N) }
section('arrival, abandon');
{ const G=fresh(SEED+7);keepAlive(G);const c=escortAt(G,1),C=X.escParty(c),T=G.towns[c.to],ti=c.to;quiet(G,c);const cr=G.crowns,rn=G.renown,pay=c.pay-(c.adv||0);
  run(()=>G.contract!==c,40000);closeAll(X);
  ok(G.ctrLast&&G.ctrLast.ok&&G.ctrLast.id===c.id,'arrived and paid: '+JSON.stringify(G.ctrLast));ok(near(G.p,T)<.1&&G.town===ti,'the company walked into '+T.name+' beside the wagons');
  ok(G.crowns>=cr+pay-200&&G.renown>=rn+8*c.diff,'the pay: '+(G.crowns-cr)+' of '+pay);ok(!G.parties.some(p=>p.id===C.id),'the caravan is in');
  ok(G.news.some(n=>new RegExp('safe to '+T.name).test(n.t)),'the news') }
{ const G=fresh(SEED+8);keepAlive(G);const c=escortAt(G,0),C=X.escParty(c);for(let i=0;i<40;i++)X.worldTick(.05);const rn=G.renown;
  ok(X.ctrAbandon()&&G.contract===null&&G.ctrLast.why==='Contract abandoned'&&G.renown===Math.max(0,rn-5),'abandoned with the usual price');
  ok(G.parties.some(p=>p.id===C.id&&!p.ctr),'the caravan goes on alone');ok(!G.parties.some(p=>p.ambE===c.id),'the waiting band is an ordinary band again');
  const o=G.towns[c.town];ok(X.goTo(o.x,o.y,{type:'town',i:c.town})&&G.path.length>0,'the company is free to go');run(()=>!G.moving,20000);closeAll(X);ok(near(G.p,o)<1,'and goes') }
console.log('arrival, abandon: ok');

section('saves');
{ const G=fresh(SEED+9);keepAlive(G);const c=escortAt(G,0);quiet(G,c,true);for(let i=0;i<60;i++)X.worldTick(.05);const C=X.escParty(c);X.mode='world';ok(X.save(),'save');
  const rd=X.readSave();ok(rd.state==='ok','read back: '+rd.state+' '+(rd.why||''));const g=rd.g,c2=g.contract,C2=g.parties.find(p=>p.id===C.id);
  ok(c2&&c2.live===1&&c2.cv===C.id&&C2&&C2.ctr===c.id&&C2.rd===1&&JSON.stringify(C2.pts)===JSON.stringify(C.pts),'the escort round trips');ok(g.parties.some(p=>p.ambE===c.id),'and the band waiting for it');
  X.G=g;X.setRngState(g.rng);ok(X.escParty(g.contract)===C2&&!g.moving&&X.escOn(),'loaded: tied to its caravan, halted');ok(X.goTo(0,0)===true&&g.moving,'any march resumes the escort');
  run(()=>g.contract!==c2||X.mode==='battle',40000);ok(X.mode==='battle'||g.ctrLast&&g.ctrLast.id===c.id,'the loaded escort goes on');if(X.mode==='battle'){X.B=null;X.mode='world'}
  // a save that lost the caravan: it joins the company again rather than failing on load
  X.G=G;const bad=X.clone(G);bad.parties=bad.parties.filter(p=>p.id!==C.id);ok(X.repairSave(bad)===''&&!bad.contract.live,'repaired: the escort is set up again');
  X.G=bad;X.worldTick(.05);const C3=X.escParty(bad.contract);ok(bad.contract.live&&C3&&C3.ctr===c.id&&onRoad(C3.x,C3.y),'the caravan rejoins it on the road') }
section('old saves');
{ const G=fresh(SEED+12);   // a world where no band falls on the caravan before the company reaches it (that follows the seeded stream)
keepAlive(G);const t=G.towns[0];let c=null;for(let g=0;g<40&&!c;g++)c=X.CTYPES.escort.gen(t,0);c.twist={k:'ambush',when:'travel',fired:false};
  // the escort as it was: an ambush ground half way, then deliver the caravan
  const o=G.towns[c.to],ax=(t.x+o.x)/2,ay=(t.y+o.y)/2;c.stages=[{k:'go',x:ax,y:ay,kind:'road',label:'Ambush ground',fight:{f:c.f,k:.95,obj:{k:'escort',vip:'wagon'}}},X.ctrHome(c.to,'Deliver the caravan')];delete c.len0;
  c.due=G.day+3;c.taken=G.day;c.tickDay=G.day;G.contract=c;const far=X.randOk(t.x,t.y,3,5);G.p.x=far.x;G.p.y=far.y;
  X.mode='world';ok(X.save(),'save');const raw=X.store.get(X.SAVEKEY);X.store.set(X.SAVEKEY,raw);const rd=X.readSave();ok(rd.state==='ok','an old escort loads');X.G=rd.g;const g=rd.g;
  ok(!g.contract.live&&g.contract.stages[0].kind==='road','as it was until the world turns');X.worldTick(.05);const c2=g.contract,C=X.escParty(c2);
  ok(c2.live&&c2.stages[0].kind==='escort'&&c2.stages.length===2&&c2.stages[1].ti===c.to&&C&&C.to===c.to,'converted: a live escort to '+o.name);
  ok(onRoad(C.x,C.y)&&near(C,g.p)<6,'the caravan joins the company on the nearest road: '+near(C,g.p).toFixed(1)+' leagues off');ok(c2.twist===null,'its ambush twist is the band now');
  ok(g.parties.some(p=>p.ambE===c2.id&&p.f===c2.f),'one band of '+c2.f+' waits ahead');ok(c2.due>=g.day+Math.ceil(X.rdLen(C.pts,C.x,C.y,C.pi)/X.ESC.day),'the due date fits the road');
  // the company walks over to the wagons first
  ok(X.goTo(0,0)&&g.moving,'a march goes to the caravan first');run(()=>!!X.escOn(),20000);ok(X.escOn()&&X.escOn().p===C,'and joins it');
  // an old escort past its ambush is only a turn-in, as before
  const G2=fresh(SEED+11);let d=null;for(let k=0;k<40&&!d;k++)d=X.CTYPES.escort.gen(G2.towns[0],0);d.stages=[{k:'go',x:1,y:1,kind:'road',label:'Ambush ground',fight:null},X.ctrHome(d.to,'Deliver the caravan')];d.stage=1;X.ctrSync(d);G2.contract=d;
  X.worldTick(.05);ok(!d.live&&X.ctrDone(d)&&X.ctrTurnInAt(d.to),'past its ambush: only the turn-in is left') }
console.log('saves and old saves: ok');

console.log('\nALL ESCORT TESTS PASSED');process.exit(0)
})().catch(e=>fail(e&&e.stack||e));
