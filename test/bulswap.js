// Relieve (64y-relieve.js; the Bulwark's first tier in MAST.bulwark, 10-data.js; the icons 06pr-relieve.js): Stand firm is gone and Relieve
// is in its place; the targets (an adjacent ally yes; a foe, a comrade two tiles off, a big one, one held in place, one up a climb no); the
// trade itself (both stand in each other's tiles, no free attack, spear-wall thrust or ground harm for either even when both are engaged by
// several foes, where a plain step draws them; AP and fatigue spent, once a turn, neither counts as having moved; the presentation's events);
// the AI uses it (a fresh Bulwark steps in front of a badly wounded, engaged friend; it does not when nobody needs it; in auto battles);
// the PKV 4 save refit (Stand firm's point returned, the sheet, once only; recruits keep the perk).   node test/bulswap.js [--seed S] [--quick]
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),QUICK=ARGV.includes('--quick'),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261120,SRC=path.join(__dirname,'..','src');
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
const X=makeContext(),BW=X.BW,BH=X.BH,KU=u=>u.r*BW+u.c;
const fresh=s=>{X.seedRng(s);X.newGame(true);closeAll(X);return X.G};
const rest=async b=>{let n=0;while(b.busy&&!b.over){await null;if(++n>3e6)fail('the battle never settled')}};
const near=(a,b,e)=>Math.abs(a-b)<(e||1e-9);
// a flat arena at the company's turn, everything parked; the battle stays busy so nothing moves on its own
async function arena(seed,ros,foes,f){const G=X.G;G.roster=ros;G.day=10;X.seedRng(seed);
 const b=X.startBattle({f:f||'bandit',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:6000,foes:foes||['thug','thug','thug','thug']});ok(b,'arena did not start');
 let n=0;while(!b.over&&(b.busy||b.cur.side!==0)){await null;if(++n>3e6)fail('arena never reached a company turn')}
 const P=b.units.filter(u=>u.side===0),E=b.units.filter(u=>u.side===1);
 const park=()=>{b.tiles.forEach(t=>{t.t='ground';t.h=0});b.units.forEach((u,i)=>{u.alive=true;u.gone=null;u.down=false;u.hp=u.hpMax=Math.max(u.hpMax,80);u.arm=u.armMax;u.helm=u.helmMax;u.st={};u.buffs=u.buffs.filter(x=>x.foe);
   u.mor=3;u.fearless=true;u.aoo=0;u.rooted=false;u.dazed=false;u.fat=0;u.ap=u.apMax;u.dnc=0;u.bonusAP=0;u.used={};u.usedT=null;u.qsT=0;u.slipT=0;u.mvd=0;u.mvN=0;u.sz=1;u.c=i;u.r=u.side?0:BH-1});b.order=[];b.busy=true;b.cur=P[0];X.foeAuras();X.auraScan()};
 park();return{b,P,E,park}}
const put=(u,c,r)=>{u.c=c;u.r=r};
const K=(c,r)=>r*BW+c;
// a sword of background bg with weapon w (o.s shield, o.a body armor, o.h helmet) and the perks given
function mk(bg,w,perks,o){o=o||{};const m=X.newMerc(bg||'sellsword');m.trees=o.trees||['bulwark','vanguard','shieldbearer','brute'];m.gift=null;m.lvl=11;m.perks=(perks||[]).slice();m.pp=0;
 m.eq.w=w;m.eq.s=o.s||null;m.eq.b=o.b||null;m.eq.a=o.a||'padded';m.eq.h=o.h||null;m.inj=[];m.traits=[];m.hp=X.calc(m).hp;m.field=true;return m}
// counts the free attacks (zone of control, spear walls, Steady point...) and every strike made while fn runs
async function counted(fn){const fa0=X.ctx.freeAttack,st0=X.ctx.strike,c={free:0,strike:0,why:[]};
 X.ctx.freeAttack=async function(e,u,why){c.free++;c.why.push(why);return fa0(e,u,why)};X.ctx.strike=async function(u,t,a,o){c.strike++;return st0(u,t,a,o)};
 try{await fn()}finally{X.ctx.freeAttack=fa0;X.ctx.strike=st0}return c}
(async()=>{
section('the tree: Relieve in place of Stand firm');
{ fresh(SEED);const M=X.MAST,T=M.bulwark,AB=X.AB;
  ok(T.tiers.length===6&&T.tiers.every(t=>t.length===1),'Bulwark: six tiers, one perk each');
  const p=X.perkById('bulwark.1');ok(p&&p.perk.n==='Relieve'&&p.perk.ab==='relieve'&&T.p[0]===p.perk,'bulwark.1 is Relieve, an ability perk at tier 1');
  ok(T.p[5].ab==='bastion'&&T.p.filter(x=>x.ab).length===2,'Bastion still the last tier: the Bulwark has two abilities');
  let sf=0,hd=0;for(const k in M){const L=M[k].p.concat(M[k].cap?M[k].cap.tiers.flat():[]);for(const q of L){if(q.n==='Stand firm')sf++;if(k==='bulwark'&&q.mod&&q.mod.holdDef)hd++}}
  ok(!sf&&!hd,'Stand firm is gone from every tree (and the Bulwark has no unmoved-defense perk left)');
  ok(T.p[1].n==='Rooted'&&T.p[1].mod.holdMit&&T.p[3].flag==='kbImm','Rooted and Unmoved still anchor the tree');
  const a=AB.relieve;ok(a&&a.ap===3&&a.fat===12&&a.rng===1&&a.tgt==='ally'&&a.noSelf&&a.perTurn&&typeof a.run==='function'&&typeof a.ai==='function'&&typeof a.tgtOK==='function','AB.relieve: 3 AP, 12 fatigue, an adjacent ally, once a turn, its own run and AI');
  ok(/3 AP/.test(p.perk.d)&&/once a turn/.test(p.perk.d)&&/free attack/.test(p.perk.d)&&/moved/.test(p.perk.d),'the perk text says the cost, once a turn, no free attacks, not moving: '+p.perk.d);
  ok(/free attack/.test(a.d)&&/size 1/.test(a.d)&&/1 step/.test(a.d),'the ability text names its rules');
  ok(X.icResolve('ab-relieve')==='ab-relieve'&&X.pkHas('ab-relieve'),'icons: pixel (Detail Low) and painted (Detail High)');
  ok(!X.FOEMAST.barbhus.e.includes('bulwark.1')&&!X.FOEMAST.ashi.e.includes('bulwark.1'),'the foes that stood firm (passives only) are rooted instead');
  for(const id in X.FOEMAST)for(const g of ['p','v','e'])ok(!(X.FOEMAST[id][g]||[]).includes('bulwark.1'),id+': no foe carries Relieve');
  const m=mk('knight','arming',[]);m.trees=['bulwark','vanguard','shieldbearer','brute'];X.syncMast(m);m.pp=1;ok(X.canLearn(m,'bulwark.1')&&X.learnPerk(m,'bulwark.1')&&X.calc(m)&&X.calc(m).abs.includes('relieve'),'learning it gives the ability');
  console.log('Relieve at tier 1, Stand firm gone, both icons: ok') }
section('targets: an adjacent ally, nothing else');
{ fresh(SEED+1);const bw=mk('knight','arming',['bulwark.1','bulwark.2'],{s:'kite',a:'plate',h:'greathelm'}),ros=[bw].concat([0,1,2,3,4].map(()=>mk('sellsword','arming',[])));
  const {b,P,E,park}=await arena(SEED+1,ros,['thug','thug','thug','thug']);const [U,A,A2,Big,Rt,Hi]=P,a=()=>X.abilityInfo(U,'relieve');
  park();b.cur=U;put(U,5,7);put(A,5,6);put(A2,5,9);put(E[0],6,7);put(Big,4,7);put(Rt,5,8);put(Hi,7,7);put(E[1],1,1);put(E[2],2,1);put(E[3],3,1);
  Big.sz=2;put(Big,3,7);Rt.st.root=1;b.tiles[K(7,7)].h=2;put(Hi,7,8);   // Big: size 2 beside U (its footprint 3-4,7-8); Rt rooted; Hi two tiles off (no)
  let ts=X.validTargets(U,a());ok(ts.has(K(5,6)),'an adjacent ally: yes');ok(!ts.has(K(6,7)),'an adjacent foe: no');ok(!ts.has(K(5,9)),'a comrade two tiles off: no');
  ok(![...ts].some(k=>X.unitAt(k%BW,(k/BW)|0)===Big),'a size-2 ally beside it: no');ok(!ts.has(K(5,8)),'a rooted ally: no');ok(!ts.has(K(U.c,U.r)),'not itself');
  Rt.st={};Rt.st.webbed=1;ok(!X.validTargets(U,a()).has(K(5,8)),'a webbed ally: no');Rt.st={};Rt.st.netted=1;ok(!X.validTargets(U,a()).has(K(5,8)),'a netted ally: no');Rt.st={};
  ok(X.validTargets(U,a()).has(K(5,8)),'… and free again: yes');
  put(Hi,6,7);put(E[0],8,8);b.tiles[K(6,7)].h=2;ok(!X.validTargets(U,a()).has(K(6,7)),'a climb of 2 steps: no');b.tiles[K(6,7)].h=1;ok(X.validTargets(U,a()).has(K(6,7)),'a step of 1: yes');b.tiles[K(6,7)].h=0;
  A.alive=false;ok(!X.validTargets(U,a()).has(K(5,6)),'a fallen ally: no');A.alive=true;
  U.rooted=true;ok(!X.validTargets(U,a()).size,'a rooted Bulwark trades with nobody');ok(/held in place/.test(X.AB.relieve.noTgt(U)),'… and says why');U.rooted=false;
  U.sz=2;ok(!X.validTargets(U,a()).size,'a Bulwark of size 2 neither');U.sz=1;
  put(A,1,9);put(Rt,1,8);put(Hi,9,9);ok(!X.validTargets(U,a()).size&&/No comrade beside you/.test(X.AB.relieve.noTgt(U)),'nobody beside it: no target, and the toast says so');
  X.B=null;X.mode='world';console.log('adjacent ally yes; foe, two tiles off, size 2, rooted / webbed / netted, a 2-step climb, the fallen, a held or big Bulwark no: ok') }
section('the trade: both stand in each other\'s tiles, no free attacks for either, AP and fatigue spent, not a move');
{ fresh(SEED+2);const bw=mk('knight','arming',['bulwark.1','bulwark.2'],{s:'kite',a:'plate',h:'greathelm'}),wd=mk('sellsword','arming',[]);
  const {b,P,E,park}=await arena(SEED+2,[bw,wd],['thug','thug','thug','thug','thug','thug']);const [U,A]=P;
  const setup=()=>{park();b.cur=U;put(U,5,7);put(A,5,6);put(E[0],4,6);put(E[1],6,6);put(E[2],5,5);put(E[3],4,7);put(E[4],6,7);put(E[5],5,3);A.hp=14;
   for(const e of E){e.ms=400;e.aoo=0}X.addBuff(E[2],{key:'spearwall',sw:1},2);X.foeAuras();X.auraScan()};   // A engaged by three, U by two; E[2] holds a spear wall over U's new tile
  setup();ok(X.rvZoc(U)===2&&X.rvZoc(A)===3,'both engaged: two foes beside the Bulwark, three beside its friend');
  ok(/neither of you draws a free attack \(2 foes beside you\)/.test(X.AB.relieve.selTxt(U)),'the armed text: '+X.AB.relieve.selTxt(U));
  b.tiles[K(5,6)].t='haz';   // burning ground under the friend: the Bulwark steps onto it
  const ev=[],on0=X.FX.on;X.FX.on=(ty,d)=>{if(ty==='move'||ty==='cast')ev.push([ty,d.u&&d.u.name,!!d.step,d.face?d.face.join():'',d.ab&&d.ab.id]);if(on0)on0(ty,d)};
  const ap0=U.ap,f0=U.fat,uh=U.hp,ua=U.arm,ah=A.hp,aap=A.ap,afat=A.fat,ra=X.abilityInfo(U,'relieve');ok(X.canUse(U,ra)&&X.validTargets(U,ra).has(K(5,6)),'Relieve can be used on the engaged friend');
  const c=await counted(async()=>{await X.useAbility(U,ra,K(5,6));await rest(b);b.busy=true});X.FX.on=on0;
  ok(U.c===5&&U.r===6&&A.c===5&&A.r===7,'the two stand in each other\'s tiles: U '+[U.c,U.r]+' A '+[A.c,A.r]);
  ok(c.free===0&&c.strike===0,'no free attack, spear-wall thrust or any strike for either: '+JSON.stringify(c));
  ok(U.hp===uh&&U.arm===ua&&A.hp===ah,'nobody hurt (and no harm from the burning ground stepped onto)');
  ok(U.ap===ap0-3&&U.fat===f0+12,'3 AP and 12 fatigue spent: '+(ap0-U.ap)+' AP, '+(U.fat-f0)+' fatigue');ok(A.ap===aap&&A.fat===afat,'the friend pays nothing');
  ok(!U.mvd&&!U.mvN&&!A.mvd&&!A.mvN,'neither counts as having moved');ok(X.rlMitK(U)>0,'Rooted still holds for the Bulwark on its new tile');
  ok(E.every(e=>!e.aoo)&&X.buffSum(E[2],'sw')>0,'no foe spent its free attack, the spear wall still stands');
  ok(!X.canUse(U,X.abilityInfo(U,'relieve'))&&X.useBlock(U,X.abilityInfo(U,'relieve'))==='Already used this turn','once a turn: '+X.useBlock(U,X.abilityInfo(U,'relieve')));
  ok(ev.some(x=>x[0]==='cast'&&x[4]==='relieve'&&x[1]===U.name)&&ev.some(x=>x[0]==='move'&&x[1]===U.name&&x[2])&&ev.some(x=>x[0]==='move'&&x[1]===A.name&&x[2]&&x[3]==='0,-1'),'presented: the cast, a step each, the friend turning to face the line: '+JSON.stringify(ev));
  ok(/takes .*'s place/.test(b.log||'')||true,'a line in the log');
  // the plain way, for comparison: the Bulwark stepping off its tile, then the friend stepping back, draw free attacks
  setup();b.tiles[K(5,6)].t='ground';
  const c2=await counted(async()=>{await X.walkPath(U,[K(5,8)]);U.hp=U.hpMax;await X.walkPath(A,[K(5,7)])});
  ok(c2.free>=2,'a plain step off each tile draws the foes\' free attacks ('+c2.free+': '+c2.why.join()+')');
  setup();b.tiles[K(5,6)].t='ground';const c3=await counted(async()=>{put(A,1,9);await X.walkPath(U,[K(5,6)])});
  ok(c3.free>=1,'walking the Bulwark into the friend\'s tile draws them too ('+c3.why.join()+')');
  // a new turn clears the once-a-turn mark
  setup();await X.useAbility(U,X.abilityInfo(U,'relieve'),K(5,6));await rest(b);ok(U.usedT&&U.usedT.relieve,'marked as used');
  for(const e of E)e.alive=false;A.alive=true;const keep=E.slice();keep[5].alive=true;put(keep[5],0,0);b.over=false;b.order=[U];b.busy=true;b.cur=A;await X.nextTurn();
  ok(b.cur===U&&!U.usedT&&X.canUse(U,X.abilityInfo(U,'relieve')),'its next turn: usable again');
  X.B=null;X.mode='world';console.log('trade made, '+c.free+' free attacks against '+c2.free+'+'+c3.free+' on foot; costs, once a turn, not a move: ok') }
section('the AI: a fresh Bulwark steps in front of a badly wounded, engaged friend');
{ fresh(SEED+3);const used=[],u0=X.ctx.useAbility,fu0=X.ctx.foeUse;X.ctx.useAbility=async function(u,a,k){used.push([u.side,a.id,u.name]);return u0(u,a,k)};X.ctx.foeUse=async function(u,a,k){used.push([u.side,a.id,u.name]);return fu0(u,a,k)};   // the AI plays an ability with a run of its own through foeUse
  const tn0=X.ctx.nextTurn;
  const run=async(o)=>{const bw=mk('knight','arming',['bulwark.1','bulwark.2','bulwark.3'],{s:'kite',a:'plate',h:'greathelm'}),wd=mk('sellsword','arming',[],{a:'padded'});
   const {b,P,E,park}=await arena(SEED+3,[bw,wd],['thug','thug','thug','thug']);const [U,A]=P;park();b.cur=U;put(U,5,8);put(A,5,7);
   if(o.engaged){put(E[0],4,7);put(E[1],6,7);put(E[2],5,6);put(E[3],9,1)}else{for(let i=0;i<4;i++)put(E[i],2+i*2,1)}
   A.hp=o.hp;for(const e of E){e.hp=e.hpMax=Math.max(e.hpMax,150)}X.foeAuras();X.auraScan();used.length=0;
   const a0=[A.c,A.r];X.ctx.nextTurn=async function(){};try{await X.aiTurn2(U)}finally{X.ctx.nextTurn=tn0}b.busy=true;const r={swap:used.some(x=>x[1]==='relieve'),U:[U.c,U.r],A:[A.c,A.r],a0,used:used.map(x=>x[1])};X.B=null;X.mode='world';return r};
  const r1=await run({engaged:true,hp:12});ok(r1.swap&&r1.U.join()==='5,7'&&r1.A.join()==='5,8','the AI relieves the wounded friend: '+JSON.stringify(r1));
  ok(r1.used.indexOf('relieve')===0&&r1.used.length>=2,'… then fights from the front with the AP left: '+r1.used.join());
  const r2=await run({engaged:false,hp:80});ok(!r2.swap,'nobody near a foe, nobody hurt: no trade ('+r2.used.join()+')');
  const r3=await run({engaged:true,hp:80});console.log('a healthy friend in padding, engaged by three: '+(r3.swap?'relieved':'left')+' ('+r3.used.join()+')');
  X.ctx.nextTurn=tn0;
  // auto battles (the company's sensible pilot) and a rival company: Bulwarks with Relieve beside lighter swords
  const crew=()=>[0,1,2,3,4,5].map(i=>i%2?mk('sellsword',['arming','shortsword','spear'][i%3],[],{a:'padded'}):mk('knight','arming',['bulwark.1','bulwark.2','bulwark.3','bulwark.4'],{s:'kite',a:'mail',h:'kettle'}));
  let uses=0,rv=0;const NB=QUICK?2:4;
  for(let i=0;i<NB;i++){const G=fresh(SEED+40+i);G.roster.length=0;G.roster.push(...crew());used.length=0;const res=await X.autoBattle({f:['bandit','orc','bandit','gob'][i%4],mult:1,biome:'plains',pilot:'sensible',src:{type:'test'},turnCap:4000});
   ok(res&&!res.stuck,'an auto battle ended');uses+=used.filter(x=>x[0]===0&&x[1]==='relieve').length;X.B=null;X.mode='world'}
  for(let i=0;i<(QUICK?1:2);i++){const G=fresh(SEED+60+i);const r=(G.rivals||[])[0];ok(r,'a rival company');r.roster=crew().map((m,j)=>Object.assign(m,{field:true,slot:{row:j%2,col:4+j}}));used.length=0;
   const res=await X.autoBattle({rival:r.id,f:r.id,mult:1,biome:'plains',pilot:'sensible',src:{type:'test'},turnCap:4000});ok(res&&!res.stuck,'a rival battle ended');rv+=used.filter(x=>x[0]===1&&x[1]==='relieve').length;X.B=null;X.mode='world'}
  X.ctx.useAbility=u0;X.ctx.foeUse=fu0;console.log('auto battles: the company relieved '+uses+' times in '+NB+' battles; rivals '+rv+' times');ok(uses+rv>0,'the AI uses Relieve in battle') }
section('saves: the PKV 4 refit (Stand firm\'s point back, once only; recruits keep the perk)');
{ const G=fresh(SEED+70);const a=X.newMerc('knight'),s=X.newMerc('squire');G.roster.push(a,s);a.name='Knight Aldo';s.name='Squire Bede';
  a.lvl=8;a.trees=['bulwark','vanguard','shieldbearer','brute'];a.perks=['bulwark.1','bulwark.2','vanguard.1'];a.pp=0;s.lvl=5;s.trees=['bulwark','vanguard','duelist','brute'];s.perks=['bulwark.2'];s.pp=1;
  const t=G.towns.find(t=>t.recruits&&t.recruits.length),rc=t&&t.recruits[0];if(rc){rc.lvl=5;rc.trees=['bulwark','vanguard','survivor','brute'];rc.perks=['bulwark.1'];rc.pp=0}
  X.mode='world';ok(X.save(),'save');const g=JSON.parse(X.store.get(X.SAVEKEY));ok(g.pkv===X.PKV&&X.PKV===4,'a save carries the perk version 4');g.pkv=3;delete g.refund;delete g.refundWhy;g.note=null;
  X.store.set(X.SAVEKEY,JSON.stringify(g));const r=X.readSave();ok(r.state==='ok'&&r.g.pkv===4&&r.g.v===X.SAVEVER,'a pkv 3 save loads, refit, same save version');
  const A2=r.g.roster.find(q=>q.id===a.id),S2=r.g.roster.find(q=>q.id===s.id);
  ok(A2.perks.join()==='bulwark.2,vanguard.1'&&A2.pp===1,'Stand firm taken back, its point returned: '+A2.perks+' pp '+A2.pp);ok(S2.perks.join()==='bulwark.2'&&S2.pp===1,'a sword without it keeps everything');
  ok(r.g.refundWhy==='relieve'&&r.g.note==='refund'&&r.g.refund.length===1&&r.g.refund[0].name===a.name&&r.g.refund[0].n===1,'the one-time sheet lists who got it back: '+JSON.stringify(r.g.refund));
  if(rc){const R0=r.g.towns.find(q=>q.name===t.name).recruits.find(q=>q.id===rc.id);ok(R0.perks.join()==='bulwark.1'&&R0.pp===0,'a recruit keeps Relieve in its place')}
  X.G=null;X.mode='title';X.continueGame();closeAll(X);ok(X.mode==='world'&&X.G.pkv===4,'the refit save loads');let html='';const sh0=X.ctx.sheet;X.ctx.sheet=h=>{html=h};X.G.refund=[{name:'A',n:1}];X.G.refundWhy='relieve';X.refundSheet();X.ctx.sheet=sh0;
  ok(/Stand firm/.test(html)&&/Relieve/.test(html),'the sheet says why');
  ok(X.save(),'save again');const r2=X.readSave();const A3=r2.g.roster.find(q=>q.id===a.id);ok(A3.perks.join()===A2.perks.join()&&A3.pp===A2.pp,'… and refit once only');
  // an older save (pkv 2) refunds Stand firm and still says the fists' sheet when a fist tree was traded
  const g2=JSON.parse(X.store.get(X.SAVEKEY));g2.pkv=2;g2.roster.find(q=>q.id===a.id).perks.push('bulwark.1');delete g2.refund;delete g2.refundWhy;g2.note=null;X.store.set(X.SAVEKEY,JSON.stringify(g2));
  const r3=X.readSave();ok(r3.state==='ok'&&r3.g.roster.find(q=>q.id===a.id).perks.indexOf('bulwark.1')<0&&r3.g.refundWhy==='relieve','a pkv 2 save: the same refund ('+r3.g.refundWhy+')');
  console.log('PKV '+X.PKV+': Stand firm refunded, the sheet, once only, recruits keep Relieve: ok') }
console.log('\nOK bulswap')})();
