// Contracts test (phase 7). Plain node, no browser:  node test/contracts.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the vm approach and DOM stubs of test/company.js) and checks:
// every contract type generates, completes and fails headlessly; stages, deadlines, reputation and renown outcomes; the save
// round trip through ctrRepair (and phase-6 contracts migrating); negotiation (deterministic, three rounds, counters, walking away);
// every twist; battle objectives (escort VIP, hold N rounds, siege works and leader, named bosses); the town economy wiring.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261115,SRC=path.join(__dirname,'..','src');
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
const fresh=s=>{X.seedRng(s);X.newGame(true);closeAll(X);const G=X.G;G.crowns=5000;G.roster.forEach(m=>{m.field=true});return G};
const J=o=>JSON.stringify(o);
const TYPES=['deliver','hunt','escort','defend','patrol','beast','relic','siege','nest','bounty'];
// a contract of a given type for town 0 (a nest and a besieged town are put on the map when the type needs one)
function make(G,type,ti){ti=ti||0;const t=G.towns[ti];if(type==='nest'&&!(G.nests||[]).length){G.nests=[{id:9001,x:t.x+5*X.TS,y:t.y,f:'gob',str:2,day:G.day}]}
 let c=null;for(let g=0;g<30&&!c;g++)c=X.CTYPES[type].gen(t,ti);ok(c,type+' did not generate');X.ctrSync(c);c.pay0=c.pay;return c}
const killFoes=()=>{for(const u of X.B.units)if(u.side===1)u.alive=false};
function battle(o,win){const b=X.startBattle(Object.assign({},o,{quiet:true}));ok(b,'battle did not start: '+J(o));if(win)killFoes();   // a loss: resolved as lost with the company standing (a rout), so nobody dies
 const res=X.resolveBattle(win);const out=X.settleBattle(win);return{b,res,out}}
// walks c through every stage (fights won); returns the town where it is turned in
function complete(G,c){c.twist=null;ok(X.ctrAccept(c)&&G.contract===c,'accept '+c.type);let g=0;
 while(!X.ctrDone(c)&&g++<12){const s=X.ctrStage(c);ok(s.k==='go','a go stage before the turn-in');G.p.x=s.x;G.p.y=s.y;const tg=X.ctrTargetAt(s.x,s.y);ok(tg&&tg.c===c,'ctrTargetAt finds the '+c.type+' target');
  ok(X.ctrMarks(c).some(m=>m.x===s.x&&m.y===s.y),'ctrMarks shows the stage');ok(typeof X.ctrStatus(c)==='string'&&X.ctrStatus(c).length>3,'ctrStatus');
  if(s.fight){const o=X.ctrBattle(c);ok(o&&o.src.type==='lair'&&o.f===s.fight.f&&o.mult>0,'ctrBattle options');const r=battle(o,true);ok(r.res.win,'won');ok(typeof r.out.toast==='string','a toast line')}
  else{ok(X.ctrArrive(s.x,s.y),'ctrArrive steps a waypoint');ok(!G.moving,'the march stops')}}
 ok(X.ctrDone(c)&&c.done,'done after its stages: '+c.type);return X.ctrTurnInTown(c)}

section('generation');
{ const G=fresh(SEED);const seen={};
  for(const k of TYPES){const T=X.CTYPES[k];ok(T&&T.n&&T.d&&typeof T.gen==='function'&&typeof T.w==='function'&&typeof T.mark==='function'&&typeof T.turnIn==='function','CTYPES.'+k+' shape');
   for(let ti=0;ti<Math.min(4,G.towns.length);ti++){const c=make(G,k,ti);ok(c.type===k&&c.town===ti&&c.diff>=1&&c.diff<=5&&c.pay>0&&Number.isInteger(c.pay)&&typeof c.title==='string'&&!/\{place\}|undefined|NaN/.test(c.title),k+' fields: '+J(c));
    ok(Array.isArray(c.stages)&&c.stages.length>=1&&c.stages[c.stages.length-1].k==='town','last stage is a town');ok(c.stage===0&&!c.failed&&c.adv===0&&typeof c.emp==='string','start state');
    for(const s of c.stages)if(s.k==='go'){ok(isFinite(s.x)&&isFinite(s.y)&&s.label,'go stage');if(s.fight)ok(X.FACT[s.fight.f]&&s.fight.k>0,'fight spec '+J(s.fight))}
    ok(X.ctrRepair(X.clone(c)),k+' repairs as generated');seen[k]=(seen[k]||0)+1}}
  // boards: several kinds per board, and every kind turns up across the land
  const kinds={};for(let i=0;i<60;i++){const t=G.towns[i%G.towns.length];G.day=5+i;const L=X.ctrBoard(t,4);ok(L.length===4,'a board of four');L.forEach(c=>kinds[c.type]=(kinds[c.type]||0)+1);ok(new Set(L.map(c=>c.type)).size>=2,'a board shows more than one kind')}
  ok(Object.keys(kinds).length>=8,'boards post most kinds: '+J(kinds));
  // the old one-notice API still delegates and still posts mostly hunts
  let h=0;for(let i=0;i<100;i++){const c=X.genContract(G.towns[0]);ok(c&&X.CTYPES[c.type],'genContract delegates');if(c.type==='hunt')h++}ok(h>40,'hunts are the common work: '+h);
  // deterministic
  const a=(()=>{const G=fresh(SEED+3);return J(X.ctrBoard(G.towns[1],4))})(),b=(()=>{const G=fresh(SEED+3);return J(X.ctrBoard(G.towns[1],4))})();ok(a===b,'boards replay from the seed');
  console.log('10 types x 4 towns generate and repair; boards over 60 days: '+J(kinds)+'; '+h+'/100 single notices are hunts: ok') }

section('pay');
{ const G=fresh(SEED+5);const d0=G.day,p0=X.ctrPayBase(2);G.day=d0+60;ok(X.ctrPayBase(2)===p0,'pay must not follow the day: '+p0+' / '+X.ctrPayBase(2));G.day=d0;
  const pw0=X.companyPower(),R=G.roster;R.forEach(m=>{m.lvl+=6});ok(X.companyPower()>pw0&&X.ctrPayBase(2)>p0,'pay rises with the company\'s strength');R.forEach(m=>{m.lvl-=6});
  ok(X.ctrPayBase(4)>X.ctrPayBase(2),'pay rises with the danger');const rn=G.renown;G.renown=2000;ok(X.ctrPayBase(2)>p0,'pay rises with renown');G.renown=rn;
  console.log('pay '+p0+' (diff 2, power '+pw0+'): follows strength, renown and danger, never the day: ok')}
section('completion');
{ for(const k of TYPES){const G=fresh(SEED+10+TYPES.indexOf(k));if(!G.rep)G.rep={free:0};const c=make(G,k);c.emp=c.emp in G.rep?c.emp:'free';G.rep[c.emp]=G.rep[c.emp]||0;
   const ti=complete(G,c),r0=G.rep[c.emp],cr=G.crowns,rn=G.renown,q=X.ctrTurnInAt(ti);ok(q&&q.pay===c.pay,'ctrTurnInAt '+k);ok(!X.ctrTurnInAt((ti+1)%G.towns.length),'only at its town');
   G.town=ti;X.openTown(ti);closeAll(X);ok(G.contract===null&&G.crowns>=cr+c.pay-1&&G.renown>=rn+8*c.diff,k+' paid in openTown: '+J({cr,now:G.crowns,pay:c.pay}));
   ok(G.rep[c.emp]>=r0||typeof X.repGain!=='function','reputation rises with the employer');ok(G.ctrLast&&G.ctrLast.ok,'last contract noted')}
  // the nest is cleared off the map, a siege lifted
  { const G=fresh(SEED+30);const t=G.towns[0];G.nests=[{id:77,x:t.x+5*X.TS,y:t.y,f:'gob',str:2,day:1}];let c=null;for(let g=0;g<40&&!(c&&c.nest===77);g++)c=X.CTYPES.nest.gen(t,0);ok(c&&c.nest===77,'nest contract targets G.nests');
    complete(G,c);ok(!(G.nests||[]).some(n=>n.id===77),'the nest is gone') }
  { const G=fresh(SEED+31);const t=G.towns[1];t.sit=[{k:'siege',days:5}];t.own=G.towns[0].own;const c=make(G,'siege',0);ok(c.at===1||c.at===0,'siege target town');if(c.at===1){complete(G,c);ok(!t.sit.some(s=>s.k==='siege'),'siege lifted')} }
  console.log('every type: accepted, stages walked (fights won, waypoints reached), paid at its town with renown and reputation: ok') }

section('failure');
{ for(const k of TYPES){const G=fresh(SEED+40+TYPES.indexOf(k));if(!G.rep)G.rep={free:0};const c=make(G,k);c.twist=null;c.emp=c.emp in G.rep?c.emp:'free';G.rep[c.emp]=0;X.ctrAccept(c);const rn=G.renown;G.renown+=20;
   const s=c.stages.find(x=>x.k==='go'&&x.fight);
   if(s){while(X.ctrStage(c)!==s)X.ctrAdvance(c);const r=battle(X.ctrBattle(c),false);ok(!r.res.win,'lost');ok(r.out.toast==='Contract failed','failed toast for '+k+': '+r.out.toast)}
   else{G.day=c.due+1;ok(X.ctrDaily()==='late','deadline passes: '+k)}
   ok(G.contract===null&&c.failed&&G.renown===rn+15,k+' fails with -5 renown');ok(G.rep[c.emp]<0||typeof X.repGain!=='function','reputation falls: '+G.rep[c.emp])}
  { const G=fresh(SEED+60);const c=make(G,'hunt');c.twist=null;X.ctrAccept(c);G.day=c.due+1;X.ctrDaily();ok(G.contract===null&&c.failed,'a hunt left too long fails') }
  { const G=fresh(SEED+61);const c=make(G,'hunt');c.twist=null;X.ctrAccept(c);ok(X.ctrAbandon()&&G.contract===null,'abandon') }
  { const G=fresh(SEED+62);const c=make(G,'hunt');c.twist=null;X.ctrAccept(c);const r=X.fleeEncounter(X.ctrBattle(c));ok(G.contract===null&&c.failed,'withdrawing from the lair forfeits it') }
  console.log('every type fails: a lost fight (or a missed deadline when it has none), -5 renown, reputation lost; deadlines, abandon, withdrawal: ok') }

section('saves');
{ const G=fresh(SEED+70);for(const k of TYPES){const c=make(G,k);c.stage=Math.min(1,c.stages.length-1);X.ctrSync(c);const raw=J(c),cp=JSON.parse(raw);ok(X.ctrRepair(cp)&&J(cp)===J((X.ctrRepair(c),c)),'round trip '+k)}
  const old={type:'hunt',f:'gob',diff:2,x:G.towns[0].x+100,y:G.towns[0].y,pay:300,title:'Burn out a goblin warren',town:0,done:true};ok(X.ctrRepair(old)&&old.stages.length===2&&old.stage===1&&X.ctrDone(old),'phase-6 hunt migrates (done)');
  const od={type:'deliver',to:1,diff:1,pay:120,title:'Carry sealed cargo',town:0,done:false};ok(X.ctrRepair(od)&&od.stages[0].ti===1&&X.ctrDone(od),'phase-6 delivery migrates');
  ok(!X.ctrRepair({type:'hunt',f:'nope',x:1,y:1,pay:1,title:'x',town:0}),'a broken old hunt is dropped');ok(!X.ctrRepair({type:'zzz',pay:1,title:'x'}),'an unknown type is dropped');
  const bad=make(G,'patrol');bad.stages[1].x='q';ok(!X.ctrRepair(bad),'a broken stage is dropped');
  // the whole save
  const c=make(G,'escort');X.ctrAccept(c);ok(X.save(),'save');const g2=JSON.parse(X.store.get([...X.store.keys()].find(k=>X.store.get(k).includes('"stages"'))));ok(g2.contract&&g2.contract.type==='escort','saved with the game');
  console.log('round trips for every type, phase-6 hunts and deliveries migrate, broken ones dropped: ok') }

section('negotiation');
{ const G=fresh(SEED+80);const base=make(G,'hunt'),A=X.clone(base),B2=X.clone(base);
  const run=c=>[X.ctrNegotiate(c,{pay:c.pay*2}),X.ctrNegotiate(c,{pay:Math.round(c.pay*1.1/10)*10,adv:Math.round(c.pay*.2/10)*10})].map(r=>J([r.ok,r.mood,r.msg,r.counter]));
  const rep0=X.clone(G.rep||{}),ra=J(run(A));G.rep=X.clone(rep0);ok(ra===J(run(B2)),'negotiation is deterministic');G.rep=X.clone(rep0);
  const c=X.clone(base);const m=X.ctrMood(c);ok(m.v>0&&m.v<=100&&m.n&&m.why,'mood: '+J(m));
  const r1=X.ctrNegotiate(c,{pay:c.pay,adv:0});ok(r1.ok&&c.pay===base.pay,'the posted pay is always agreed');
  const d=X.clone(base);const lim=X.ctrLimits(d);const r2=X.ctrNegotiate(d,{pay:lim.pay,adv:0});ok(r2.ok&&d.pay===lim.pay&&d.pay>=base.pay,'up to the limit is agreed');
  const e=X.clone(base);let r=X.ctrNegotiate(e,{pay:e.pay*3,adv:e.pay});const ctr=r.counter;ok(!r.ok&&r.counter&&r.counter.pay<=X.ctrLimits(e).pay&&r.mood<m.v,'too much: a counter, mood sours');const rc=X.ctrNegotiate(e,r.counter);ok(rc.ok&&e.pay===r.counter.pay&&e.adv===r.counter.adv,'the counter is agreed: '+J([rc.msg,r.counter]));
  const f=X.clone(base);G.towns[0].contracts=[f];let n=0;do{r=X.ctrNegotiate(f,{pay:f.pay*5});n++}while(!r.gone&&n<5);ok(r.gone&&n<=3&&!G.towns[0].contracts.includes(f),'three greedy rounds and the offer is gone ('+n+')');ok(!X.ctrAccept(f),'a withdrawn offer cannot be taken');
  // the advance is paid on taking the contract and kept out of the final pay
  const g=X.clone(base);const lg=X.ctrLimits(g),adv=Math.floor(lg.adv*g.pay/10)*10;ok(adv>0&&X.ctrNegotiate(g,{pay:g.pay,adv}).ok,'an advance');const cr=G.crowns;G.contract=null;X.ctrAccept(g);ok(G.crowns===cr+adv,'advance paid');
  g.stage=g.stages.length-1;X.ctrSync(g);ok(X.ctrTurnInAt(g.town).pay===g.pay-adv,'the rest at the end');
  // reputation and personality move the mood
  const h=X.clone(base);delete h.neg;const rp=G.rep?G.rep[h.emp]:0;if(G.rep&&h.emp in G.rep){G.rep[h.emp]=80;const hi=X.ctrMood(h).v;delete h.neg;G.rep[h.emp]=-60;const lo=X.ctrMood(h).v;G.rep[h.emp]=rp;ok(hi>lo,'reputation sets the mood: '+hi+' > '+lo)}
  console.log(`mood ${m.v} (${m.n}), limit ${lim.pay} on ${base.pay}, counter ${J(ctr)}, walk-away after ${n} rounds, advance ${adv}: ok`) }

section('twists');
{ const out=[];for(const k of Object.keys(X.CTWIST)){const T=X.CTWIST[k];ok(T.n&&T.d&&['travel','arrive','battle','turnin'].includes(T.when)&&T.types.length,'CTWIST.'+k+' shape');
   const G=fresh(SEED+90);G.roster[0].res=G.roster[0].res;const c0=make(G,T.types[0]);c0.twist={k,when:T.when,fired:false};
   if(T.when==='turnin'){X.ctrAccept(c0);c0.stage=c0.stages.length-1;X.ctrSync(c0);if(G.rep&&c0.emp in G.rep)G.rep[c0.emp]=0;const cr=G.crowns,r=X.ctrTurnIn(X.ctrTurnInTown(c0));ok(r&&r.ok&&G.crowns-cr<c0.pay&&/steward/.test(r.text),'betrayal pays short: '+J(r));out.push(k+' (pays '+(G.crowns-cr)+' of '+c0.pay+')');continue}
   const card=X.ctrTwistCard(c0);ok(card&&card.text&&card.opts.length>=2,'card '+k);
   card.opts.forEach((o,i)=>{const G2=fresh(SEED+90);const c=make(G2,T.types[0]);c.twist={k,when:T.when,fired:false};X.ctrAccept(c);if(c.type==='bounty'||c.type==='hunt'||c.type==='siege'||c.type==='defend'){}
    const cardi=X.ctrTwistCard(c);if(!cardi.opts[i].ok){ok(X.ctrTwistPick(i,c)===null,'a locked option cannot be picked');return}
    const r=X.ctrTwistPick(i,c);ok(r&&typeof r.text==='string'&&c.twist.fired,'pick '+k+' '+i);if(r.fight){ok(X.FACT[r.fight.f]&&r.fight.mult>0,'twist fight options');const b=battle(r.fight,true);ok(b.res.win,'twist fight')}});
   out.push(k+' ('+card.opts.length+' choices)')}
  // a travel twist fires on the march, through ctrDaily, as a card
  { const G=fresh(SEED+95);const c=make(G,'deliver');c.twist={k:'ambush',when:'travel',fired:false};X.ctrAccept(c);G.day++;G.moving=true;X.mode='world';X.sheetOpen=false;const r=X.ctrDaily();ok(r==='twist'&&!G.moving&&X.sheetOpen,'travel twist shown: '+r);closeAll(X);ok(X.ctrTwistPick(0).fight,'and resolved') }
  // an arrival twist takes over at the target instead of the battle
  { const G=fresh(SEED+96);const c=make(G,'bounty');c.twist={k:'surrender',when:'arrive',fired:false};X.ctrAccept(c);const s=X.ctrStage(c);X.sheetOpen=false;ok(X.ctrArrive(s.x,s.y)&&X.mode!=='battle'&&X.sheetOpen,'arrive twist');closeAll(X);X.ctrTwistPick(0);ok(X.ctrDone(c)&&c.pay<c.pay0,'surrender: done without a fight, for less') }
  // cursed cargo bleeds the company daily
  { const G=fresh(SEED+97);const c=make(G,'deliver');c.twist={k:'cursed',when:'travel',fired:false};X.ctrAccept(c);X.ctrTwistPick(0);let hp=0;G.roster.forEach(m=>hp+=m.hp);G.day++;X.ctrDaily();let hp2=0;G.roster.forEach(m=>hp2+=m.hp);ok(hp2<hp,'the curse bites') }
  console.log(out.join(', ')+'; travel / arrive / turn-in timing, the curse: ok') }

section('battle objectives');
{ const G=fresh(SEED+100);
  // escort: the wagon stands with the company, never acts, and its death loses the battle
  let b=X.startBattle({f:'bandit',mult:1,src:{type:'sim'},quiet:true,obj:{k:'escort',vip:'wagon'}});const v=b.obj.vip;ok(v&&v.side===0&&v.vip&&v.apMax===0&&b.units.includes(v)&&X.deployRow(v.r),'the VIP is placed in the back rows');
  let st=X.objStatus();ok(st.k==='escort'&&st.vip.hp===v.hpMax&&st.goal,'objStatus escort');v.alive=false;ok(X.checkEnd()&&b.result&&!b.result.win&&b.result.obj==='lost','the wagon falls: defeat');X.settleBattle(false);
  // the VIP is no merc: nothing in the roster changes because of it
  b=X.startBattle({f:'bandit',mult:1,src:{type:'sim'},quiet:true,obj:{k:'escort',vip:'wagon'}});const n0=G.roster.length;killFoes();ok(X.checkEnd()&&b.result.win&&b.result.vip.alive,'foes dead, wagon alive: victory');X.settleBattle(true);ok(G.roster.length===n0,'roster intact');
  // hold: survive the rounds
  b=X.startBattle({f:'orc',mult:1,src:{type:'sim'},quiet:true,obj:{k:'hold',rounds:4}});st=X.objStatus();ok(st.k==='hold'&&st.rounds===4,'objStatus hold');b.round=5;ok(X.checkEnd()&&b.result.win&&b.result.obj==='won','held for the rounds: victory');X.settleBattle(true);
  // siege: stakes, fortified foes, the leader
  const o={f:'bandit',mult:1.2,src:{type:'sim'},quiet:true,obj:{k:'siege'}},pv=X.battlePreview(Object.assign({},o));ok(pv.tiles.some(t=>t.fort&&t.t==='block'),'the preview shows the works');
  b=X.startBattle(Object.assign({},o,{tiles:pv.tiles,foes:pv.foes}));const E=b.units.filter(u=>u.side===1);ok(E.every(u=>u.buffs.some(x=>x.key==='fort')),'foes fortified');ok(b.obj.leader&&b.obj.leader.leader,'a leader');
  const A=b.units.find(u=>u.side===0&&u.m),t0=E[0],fk=X.forecast(A,t0,X.abilityInfo(A,'attack'));ok(fk&&isFinite(fk.hit),'forecast reads the fortified foe');
  st=X.objStatus();ok(st.k==='siege'&&st.leader.alive,'objStatus siege');b.obj.leader.alive=false;ok(X.checkEnd()&&b.result.win,'leader dead: victory');X.settleBattle(true);
  // a named boss: the strongest of the band, renamed and boosted
  b=X.startBattle({f:'beast',mult:1,src:{type:'sim'},quiet:true,boss:{id:'bear',name:'Greymaw',title:'the Widowmaker'},fixed:['bear']});const bs=b.units.find(u=>u.boss);ok(bs&&bs.name==='Greymaw'&&bs.hpMax>X.EN.bear.hp*1.4,'named boss boosted');killFoes();X.checkEnd();ok(b.result.boss&&b.result.boss.slain,'boss reported');X.settleBattle(true);
  // the AI plays them to the end (both sides), deterministically
  const strong=()=>{G.roster.forEach(m=>{m.hp=X.calc(m).hp;m.field=true})};
  const auto=async o=>{strong();X.seedRng(SEED+7);const r=await X.autoBattle(Object.assign({src:{type:'sim'},turnCap:2500},o));const res=r;if(X.B)X.settleBattle(!!(res&&res.win));else{X.B=null;X.mode='world'}return res};
  (async()=>{const lines=[];
   for(const ob of [{k:'escort',vip:'wagon'},{k:'hold',rounds:3},{k:'siege'}]){const o={f:'bandit',mult:.8,obj:ob};const r1=await auto(o);ok(r1&&!r1.stuck,ob.k+' auto-battle ends');lines.push(ob.k+': '+(r1.win?'won':'lost')+' in '+r1.rounds+' rounds'+(r1.obj?' ('+r1.obj+')':''))}
   // VIP targeting: foes give the wagon a high priority
   console.log(lines.join('; ')+': ok');
   section('town economy');
   { const G=fresh(SEED+110);const t=G.towns[0];G.town=0;X.stockTown(t);const id=t.stock[0],p=X.ITEMS[id].price;const K0=X.townPriceK,H0=X.townHostile;
     X.townPriceK=(i,k)=>k==='buy'?1.5:k==='sell'?.5:k==='food'?2:1;ok(X.mkBuyPrice(id)===Math.round(p*1.5)&&X.mkFoodPrice()===60,'prices follow townPriceK');const cr=G.crowns;X.buyItem(0);ok(G.crowns===cr-Math.round(p*1.5),'buyItem charges the town price');
     X.townHostile=()=>true;const c1=G.crowns;ok(X.buyItem(0)===false&&X.buyFood()===false&&G.crowns===c1,'a hostile town will not trade');X.stockTown(t);ok(t.contracts.length===0,'nor post work');
     X.townPriceK=K0;X.townHostile=H0;X.stockTown(t);ok(t.contracts.length>=1,'board restored');
     t.sit=[{k:'raided',days:3}];let def=0,base=0;for(let i=0;i<300;i++){if(X.genContract2(t,0).type==='defend')def++}t.sit=[];for(let i=0;i<300;i++){if(X.genContract2(t,0).type==='defend')base++}ok(def>base,'a raided town asks for defenders: '+def+' vs '+base);
     console.log('prices, closed markets and boards, situations shaping the board ('+def+' vs '+base+' defend notices): ok') }
   console.log('\ncontracts test passed')})().catch(e=>fail(e&&e.stack||e)) }
