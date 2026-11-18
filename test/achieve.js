// Achievements and the origins they unlock (28-achieve.js). Plain node, no browser:  node test/achieve.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the vm harness of test/slayer.js) and checks: the ACH catalog (20-30, every icon
// drawn, every unlock a real origin); the store ('wyrdmarch_ach_v1': granted achievements survive a new company, a burned book and a
// reload of the page, and are never in the save); every achievement's trigger fires from the real hook (battles, contracts, crises,
// the Eastern War, dungeons, rifts, caravans, the temple, the day); the notice; locked origins greyed and not selectable in the setup
// dialog until unlocked; each new origin starts as its rule says, plays a few days and a battle headless, and saves; achievements never
// touch the game stream (a seed replays the same with and without them).
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
function makeContext(store){const els=new Map();store=store||new Map();
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

const STORE=new Map();
let X=makeContext(STORE);
const fresh=(s,origin,o)=>{X.seedRng(s);X.newGame(true,Object.assign({},origin?{origin}:{},o||{}));closeAll(X);return X.G};
const fightOnce=o=>{const b=X.startBattle(Object.assign({f:'gob',mult:1,src:{type:'sim'},quiet:true},o));ok(b,'battle did not start');
 for(const u of b.units)if(u.side===1)u.alive=false;const res=X.resolveBattle(true);X.B=null;X.mode='world';closeAll(X);return res};
const stored=()=>JSON.parse(STORE.get('wyrdmarch_ach_v1')||'null');
const has=k=>X.achHas(k);
const NEWOR=['necro','corsairs','cultists','sworn','plague','ronin'];
function valid(G,why){ok(Array.isArray(G.roster)&&G.roster.length>=1,why+': roster');for(const k of ['crowns','food','tools','renown'])ok(Number.isFinite(G[k])&&G[k]>=0,why+': '+k+' = '+G[k]);
 for(const id of G.stash)ok(!!X.ITEMS[id],why+': unknown stash item '+id);for(const m of G.roster){ok(Number.isFinite(m.hp)&&m.hp>=1&&m.hp<=X.calc(m).hp,why+': hp of '+m.name+' '+m.hp);
  for(const s of ['w','b','s','a','h'])ok(m.eq[s]==null||!!X.ITEMS[m.eq[s]],why+': gear '+m.eq[s])}
 if(G.rep)for(const f in G.rep)ok(Number.isFinite(G.rep[f])&&G.rep[f]>=-100&&G.rep[f]<=100,why+': rep '+f)}

section('the catalog');
{ const K=X.ACHK,A=X.ACH;ok(K.length>=20&&K.length<=34,'20 to 34 achievements ('+K.length+')');
  const cats=new Set(X.ACHCAT.map(c=>c[0]));
  for(const k of K){const a=A[k];ok(a.n&&a.d&&a.icon&&cats.has(a.cat)&&typeof a.check==='function',k+': n d icon cat check');
   const ik=X.iconKind(a.icon);ok(ik.icon!=='none'&&ik.kind!=='generic',k+': icon '+a.icon+' is drawn ('+JSON.stringify(ik)+')');
   if(a.unlock)ok(X.ORIGINS[a.unlock]&&X.ORIGINS[a.unlock].lock.ach===k,k+' unlocks '+a.unlock)}
  for(const c of cats)ok(K.some(k=>A[k].cat===c),'category '+c+' has achievements');
  ok(NEWOR.every(k=>X.ORIGINS[k]&&X.ORIGINS[k].lock&&A[X.ORIGINS[k].lock.ach]),'six new origins, each locked by an achievement');
  ok(Object.keys(X.ORIGINS).filter(k=>!X.ORIGINS[k].lock).length===8,'the seven old origins and The Isekai stay open');
  for(const k of NEWOR){const O=X.ORIGINS[k];ok(O.n&&O.d&&O.rule&&O.roster.length===4&&O.roster.every(b=>X.BG[b])&&typeof O.setup==='function'&&O.crowns>0,k+': n d rule roster setup crowns');
   ok(X.icHas(O.icon)&&typeof X.PAINT[O.icon]==='function',k+': icon '+O.icon+' has pixel and painted art')}
  for(const n of ['ach','ach-lock'])ok(X.icHas(n)&&typeof X.PAINT[n]==='function',n+' icon');
  console.log('  '+K.length+' achievements, '+NEWOR.length+' new origins')}

section('locked origins in the setup dialog');
{ fresh(SEED);ok(X.achCount()===0&&!stored(),'a new player: nothing earned, nothing stored');
  X.achReset();ok(X.achCount()===0,'reset');
  for(const k of NEWOR)ok(!X.originUnlocked(k),k+' starts locked');ok(X.originUnlocked('free')&&X.originUnlocked('slayer'),'the old origins are open');
  X.NCS.origin='free';let h=X.ncOriginHTML();ok((h.match(/ncs-lock/g)||[]).length===NEWOR.length,'six greyed buttons');
  for(const k of NEWOR){const a=X.ACH[X.ORIGINS[k].lock.ach];ok(h.includes(X.htmlEsc(a.n))&&h.includes(`achLockedTap('${k}')`)&&!h.includes(`ncSet('origin','${k}')`),k+': shows how to unlock, cannot be chosen')}
  X.NCS.origin='necro';h=X.ncOriginHTML();ok(X.NCS.origin==='free','a locked origin falls back to the free company');
  X.achLockedTap('necro');
  X.achGrant('deadmarch',true);ok(X.originUnlocked('necro'),'the Dead March opens the necromancers');X.NCS.origin='necro';h=X.ncOriginHTML();
  ok(X.NCS.origin==='necro'&&h.includes(`ncSet('origin','necro')`)&&(h.match(/ncs-lock/g)||[]).length===NEWOR.length-1,'unlocked: selectable, five still locked');
  X.newCompanySetup();X.NCS.origin='necro';X.ncBegin();closeAll(X);ok(X.G.origin==='necro','Begin raises a necromancer company');
  console.log('  locked, then open')}

section('the store survives new companies and reloads');
{ X.achReset();X.achGrant('renowned');const s=stored();ok(s&&s.got.renowned&&s.got.renowned.co===X.companyName(),'granted into wyrdmarch_ach_v1 with the company name');
  ok(!JSON.stringify(X.G).includes('wyrdmarch_ach')&&X.G.ach===undefined,'not in the save');
  fresh(SEED+1);ok(has('renowned'),'a new company keeps it');X.mode='world';X.save();
  X=makeContext(STORE);ok(X.achHas('renowned')&&X.originUnlocked('sworn')&&!X.originUnlocked('necro'),'a reload keeps it (and only it)');
  X.continueGame();closeAll(X);ok(X.achHas('renowned'),'and so does continuing');
  STORE.set('wyrdmarch_ach_v1','{bad json');X=makeContext(STORE);ok(X.achCount()===0,'a damaged store reads as empty, no crash');
  STORE.set('wyrdmarch_ach_v1',JSON.stringify({v:1,got:{rich:{day:3,co:'A'},bogus:{}},n:{wins:'7',ctr:-3}}));X=makeContext(STORE);
  ok(X.achHas('rich')&&!X.achHas('bogus')&&X.achLoad().n.wins===7&&!X.achLoad().n.ctr,'unknown keys and bad counters dropped');
  X.achReset();console.log('  persisted')}

section('every trigger, from the real hook');
{ const S=()=>X.achLoad();
  // battles
  let G=fresh(SEED+2);X.achReset();
  let r=fightOnce();ok(r.win&&has('first')&&S().n.wins===1,'first blood: a won battle, through runOnBattle');
  for(let i=0;i<9;i++)fightOnce();ok(has('wins10')&&S().n.wins===10,'ten wins');
  S().n.wins=49;fightOnce();ok(has('wins50'),'fifty wins');S().n.wins=149;fightOnce();ok(has('wins150'),'150 wins');
  G.diff='normal';r=fightOnce({f:'bandit',mult:1.6});ok(!has('clean'),'a clean win on Normal does not count');
  G.diff='hard';r=fightOnce({f:'bandit',mult:1.6});ok(r.foes>=5&&!r.dead.length&&has('clean'),'a clean win on Hard against '+r.foes+' foes');
  G.diff='normal';
  r=fightOnce({f:'bandit',fabled:[Object.keys(X.FABLED)[0]]});ok((r.fabled||[]).some(x=>x.fate==='dead')&&has('fabled'),'a fabled warrior killed');
  r=fightOnce({f:'bandit',foes:['wyvern']});ok(r.slain.includes('wyvern')&&has('wyvern'),'a wyvern killed');
  ok(!has('slayogre'),'an ogre with a company is no slayer feat');fightOnce({f:'bandit',foes:['ogre']});ok(!has('slayogre'),'still not');
  G=fresh(SEED+3,'slayer');r=fightOnce({f:'bandit',foes:['ogre']});ok(r.slain.includes('ogre')&&has('slayogre'),'the lone slayer kills an ogre');
  r=fightOnce({f:'bandit',foes:['elder']});ok(r.slain.includes('elder')&&has('slayent'),'the lone slayer fells an elder ent');
  // contracts
  G=fresh(SEED+4);const before=S().n.ctr||0;X.runOnContract({});ok(S().n.ctr===before+1,'runOnContract counts a contract');
  {const c=X.ctrNew('patrol',G.towns[0],0,1,'A test patrol');c.pay=100;c.stages=[{k:'town',ti:0}];c.stage=0;G.contract=c;const n0=S().n.ctr;const r=X.ctrTurnIn(0);ok(r&&S().n.ctr===n0+1,'a real turn-in counts (ctrTurnIn -> runOnContract)')}
  S().n.ctr=9;X.runOnContract({});ok(has('ctr10'),'ten contracts');S().n.ctr=49;X.runOnContract({});ok(has('ctr50'),'fifty contracts');
  // the day: wealth, renown, roster, levels, the long road, ironman
  G=fresh(SEED+5);const day=()=>{X.advanceTime(24);closeAll(X)};
  G.crowns=5200;day();ok(has('rich')&&!has('hoard'),'5,000 crowns');G.crowns=10500;day();ok(has('hoard'),'10,000 crowns');
  G.renown=X.RENOWN.find(t=>t.n==='Renowned').min;day();ok(has('renowned')&&!has('legendary'),'Renowned');G.renown=1000;day();ok(has('legendary'),'Legendary');
  while(G.roster.length<12){const m=X.newMerc('sellsword');m.field=false;G.roster.push(m)}day();ok(has('swords12'),'twelve swords');
  X.gainXP(G.roster[0],X.XPT[11]-G.roster[0].xp);ok(G.roster[0].lvl>=11,'level 11');day();ok(has('lvl11'),'a sword at level 11');
  G.day=99;day();ok(G.day>=100&&has('day100'),'day 100');
  ok(!has('iron30'),'no ironman yet');G=fresh(SEED+6,null,{ironman:true});ok(G.ironman,'an ironman march');G.day=29;day();ok(has('iron30'),'ironman day 30');
  G.run.won=10;day();ok(has('iron10w'),'ironman ten wins');
  // crises (and ironman)
  for(const k of ['sunder','deadmarch','horde','barbarian']){G=fresh(SEED+7+k.length,null,{ironman:k==='horde'});G.crisisKind=k;G.crisis=null;X.startCrisis();ok(G.crisis&&G.crisis.k===k,k+' begins');
   ok(!has(k),k+': not before it ends');X.crisisEnd(false);ok(!has(k),k+': not when lost');G.crisis.ended=false;X.crisisEnd(true);ok(has(k),k+': earned by ending it (crisisEnd)')}
  ok(has('ironcrisis'),'an ironman crisis ended');
  ok(!has('isekaicrisis'),'the Isekai feat: not for another origin');G=fresh(SEED+40,'isekai');ok(G.isekai,'an Isekai run');G.crisis=null;X.startCrisis();X.crisisEnd(true);ok(has('isekaicrisis'),'the Isekai hero ends the crisis');
  // the Eastern War
  G=fresh(SEED+20);ok(G.east,'the East');let w=X.eastStart();ok(w,'the war begins');closeAll(X);X.eastWarChoose('out');X.eastEnd();ok(!has('eastwar'),'staying out earns nothing');
  G=fresh(SEED+20);w=X.eastStart();closeAll(X);X.eastWarChoose('houses');X.eastEnd();ok(w.outcome==='houses'&&has('eastwar'),'the houses side won: earned (eastEnd)');
  // dungeons and rifts
  G=fresh(SEED+21);const dk=Object.keys(X.DUNGEONS)[0],d=X.dungeonOpen(dk,[]);ok(d,'a dungeon opens');
  for(let i=0;i<10&&!d.cleared;i++){ok(!has('dungeon'),'not before the last hall');X.dungeonSettle({id:d.id},true,{men:[]})}ok(d.cleared&&has('dungeon'),'a dungeon cleared (dungeonSettle)');
  G.portals.push({id:9999,x:G.p.x,y:G.p.y,realm:'hollow'});G.dun={id:9999,stage:2,realm:'hollow'};X.B={opts:{src:{type:'dun'}},units:[]};X.settleBattle(true,{type:'dun'});closeAll(X);
  ok(has('rift'),'a rift closed (settleBattle, the old three-battle rift)');
  // caravans
  G=fresh(SEED+22);S().n.cv=4;{const c=X.wsSpawnCaravan(0,1);c.x=G.p.x+40;c.y=G.p.y;c.tx=c.x;c.ty=c.y;const p={id:G.nid++,x:c.x+20,y:c.y,tx:c.x,ty:c.y,f:'bandit',mult:3,goal:'roam'};G.parties.push(p);X.cvHour();
   const cl=X.cvOf(c);ok(cl,'a clash');const out={rep:[]};X.cvBattleEnd({id:cl.id},true,{cv:{alive:2,dead:1,n0:3,turned:false,wagon:true,by:null,gh:1,rh:0}},out);ok(out.cv.k==='saved'&&S().n.cv===5&&has('cv5'),'five caravans saved (cvBattleEnd)')}
  // the temple
  G=fresh(SEED+23);S().n.treat=9;const m=G.roster[0];m.inj=[{id:'cutarm',days:3}];G.crowns=5000;const t=X.cpTreat(m,'cutarm');ok(t.ok&&S().n.treat===10&&has('treat10'),'ten injuries treated (cpTreat -> treatInjury)');
  // the colosseum (29-colosseum.js colSettle -> achEvent('arena'))
  G=fresh(SEED+24);{const c=G.colos[0],src={id:c.id,i:0,ep:-1,purse:100,fee:10,ren:1,prize:null};for(let i=0;i<5;i++){ok(!has('arena5'),'not before five wins');X.colSettle(src,true,{})}ok(has('arena5')&&has('arenachamp'),'five arena wins in a row (colSettle)')}
  const missing=X.ACHK.filter(k=>!has(k));ok(!missing.length,'every achievement fired: missing '+missing.join(', '));
  console.log('  all '+X.ACHK.length+' fired from their hooks')}

section('the notice');
{ fresh(SEED+30);X.achReset();X.ACHQ.length=0;X.achQT=0;X.achGrant('deadmarch');const e=X.document.getElementById('achNote');
  ok(/Back to the grave/.test(e.innerHTML)&&/Unlocks the Necromancers origin/.test(e.innerHTML)&&e.classList.contains('on'),'the card: name and what it unlocks');
  ok(X.achGrant('deadmarch')===false,'granted once only');
  X.achSheet();const h=X.document.getElementById('sheetBody').innerHTML;ok(/1 of \d+ earned/.test(h)&&(h.match(/class="ach-c/g)||[]).length===X.ACHK.length&&/ach-c on/.test(h),'the sheet: every achievement, the earned one lit');
  ok(/Unlocks: Corsairs/.test(h)&&/ach-pr/.test(h),'the sheet shows unlocks and progress');closeAll(X);
  X.mode='world';X.menuSheet();ok(/achSheet\(\)/.test(X.document.getElementById('sheetBody').innerHTML),'the field menu has the entry');closeAll(X);
  X.mode='title';X.renderTitle();ok(/achSheet\(\)/.test(X.document.getElementById('titleBox').innerHTML),'so does the title');X.mode='world';
  console.log('  shown')}

section('the new origins start as their rules say, and play');
{ X.achGrantAll();ok(NEWOR.every(k=>X.originUnlocked(k)),'all unlocked');
  const days=n=>{for(let i=0;i<n;i++){X.advanceTime(24);closeAll(X)}};
  const play=(k,G)=>{valid(G,k+' at the start');const res=fightOnce({f:'bandit'});ok(res&&res.win,k+': wins a battle');days(4);valid(X.G,k+' after a battle and four days');
   X.mode='world';ok(X.save(),k+': saves');const r=X.readSave();ok(r.state==='ok'&&r.g.origin===k&&JSON.stringify(r.g.evt.flags)===JSON.stringify(X.G.evt.flags),k+': loads with its origin and flags');
   X.continueGame();closeAll(X);ok(X.G.origin===k,k+': continues')};
  let G=fresh(SEED+40,'necro');ok(G.origin==='necro'&&G.crowns===700&&G.roster.length===4,'necro: four swords, 700 crowns');
  ok(G.roster.every(m=>m.gift&&X.mercRes(m)==='mana'&&X.giftAwake(m)&&!(m.traits||[]).includes('superstitious')),'necro: every sword has the mana gift awake, none superstitious');
  ok(X.originK('xp')===1.25&&X.originK('temple')===2,'necro: xp x1.25, temples x2');ok((G.rep.free||0)<=-15,'necro: free towns distrust ('+G.rep.free+')');
  {const m=G.roster[0];m.inj=[{id:'cutarm',days:2}];ok(X.injuryCost(m,'cutarm')===2*(40+20*2),'necro: treatment costs double');m.inj=[]}
  {const xp0=G.roster.map(m=>m.xp),res=fightOnce({f:'bandit'});ok(res.xpK===1.25,'necro: battle XP x1.25 ('+res.xpK+')')}
  play('necro',G);
  G=fresh(SEED+41,'corsairs');{const port=G.evt.flags.port;ok(port!=null&&G.towns[port].bld.includes('harbour'),'corsairs: start at a harbour town ('+(port!=null?G.towns[port].name:'none')+')');
   const t=G.towns[port];ok(Math.hypot(G.p.x-t.x,G.p.y-t.y)<1*X.TS,'corsairs: the company stands at it');const wf=G.evt.flags.wanted;ok(wf&&X.evTier(wf)==='hostile','corsairs: '+wf+' hostile');
   const p={id:G.nid++,x:G.p.x+30,y:G.p.y,tx:G.p.x,ty:G.p.y,f:'bandit',mult:1,goal:'roam'};G.parties.push(p);const o=X.partyBattle(p);const b=X.startBattle(Object.assign(o,{quiet:true}));
   ok(b.opts.ambush&&b.units.filter(u=>u.side===1).every(u=>u.unready),'corsairs: a band on the road is ambushed (foes unready)');X.B=null;X.mode='world';closeAll(X);
   const b2=X.startBattle({f:'bandit',mult:1,src:{type:'sim'},quiet:true});ok(!b2.opts.ambush,'corsairs: not a fixed or other fight');X.B=null;X.mode='world';closeAll(X)}
  play('corsairs',G);
  {const G2=fresh(SEED+41);const p={id:G2.nid++,x:G2.p.x+30,y:G2.p.y,tx:G2.p.x,ty:G2.p.y,f:'bandit',mult:1,goal:'roam'};G2.parties.push(p);const b=X.startBattle(Object.assign(X.partyBattle(p),{quiet:true}));ok(!b.opts.ambush,'a free company does not ambush');X.B=null;X.mode='world';closeAll(X)}
  G=fresh(SEED+42,'cultists');ok(G.roster.every(m=>m.gift&&X.giftAwake(m)),'cultists: every gift awake');ok(new Set(G.roster.map(m=>X.mercRes(m))).size>=1&&X.originK('temple')===3,'cultists: temples x3');
  ok((G.rep.free||0)<=-25,'cultists: the free towns shun them');ok(!G.roster.some(m=>(m.traits||[]).includes('fragile')),'cultists: not fragile (unlike the academy)');play('cultists',G);
  G=fresh(SEED+43,'sworn');{const F=G.evt.flags;ok(G.crowns===4000&&F.debt===6000&&F.debtNext===G.day+10,'sworn: 4,000 crowns, 6,000 owed, first payment in ten days');
   ok(G.roster[0].eq.a==='mail','sworn: good armor');const c0=G.crowns;G.day=F.debtNext-1;X.advanceTime(24);closeAll(X);ok(F.debt===6000-750,'sworn: 750 paid on the day ('+F.debt+')');
   G.crowns=100;const h=F.debtH,r0=G.rep[h]||0;G.day=F.debtNext-1;X.advanceTime(24);closeAll(X);ok(F.debt===6000-750+250&&F.missed===1,'sworn: a missed payment grows the debt');
   if(h!=='free')ok((G.rep[h]||0)<r0,'sworn: and costs standing with '+h);
   F.debt=500;G.crowns=2000;G.day=F.debtNext-1;X.advanceTime(24);closeAll(X);ok(F.debt===0&&F.debtDone,'sworn: paid off')}
  play('sworn',G);
  G=fresh(SEED+44,'plague');ok(G.grace>=200&&X.originK('temple')===.5,'plague: grace for ten days, temples at half');
  // march straight into a hostile band (worldTick, as in play): a free company is caught, the doctors walk past
  const walkInto=G=>{const T=X.TS,pos=[[2,0],[-2,0],[0,2],[0,-2],[1.5,1.5]].map(([a,b])=>({x:G.p.x+a*T,y:G.p.y+b*T})).find(q=>X.okAt(q.x,q.y));ok(pos,'room for a band');
   const p={id:G.nid++,x:pos.x,y:pos.y,tx:pos.x,ty:pos.y,f:'bandit',mult:1,goal:'roam',ch:1,hunt:1};G.parties.push(p);let hit=0;const e0=X.engage;X.engage=o=>{hit++;return null};
   try{X.goTo(pos.x,pos.y);for(let i=0;i<3000&&!hit&&G.moving;i++){X.worldTick(.05);closeAll(X)}}finally{X.engage=e0}G.parties=G.parties.filter(q=>q!==p);G.moving=false;return{hit,p}};
  {const F=fresh(SEED+44);F.grace=0;ok(walkInto(F).hit,'a free company that walks into a band is caught')}
  G=fresh(SEED+44,'plague');{const r=walkInto(G);let fought=r.hit>0;ok(!fought&&G.grace>0,'plague: the masks keep the band off in the first days')
   const i=X.nearestTown(G.p.x,G.p.y),t=G.towns[i];X.townSitAdd(i,'plague',20);G.p={x:t.x,y:t.y};const c0=G.crowns,r0=G.renown;X.advanceTime(24);closeAll(X);
   ok(G.evt.flags.cures>=1&&G.renown>=r0+3,'plague: a day at a plague town pays ('+(G.crowns-c0)+' crowns net of wages, +'+(G.renown-r0)+' renown)')}
  play('plague',G);
  G=fresh(SEED+45,'ronin');ok(G.roster.every(m=>['w','a','h'].some(s=>m.eq[s]&&X.ITEMS[m.eq[s]].east)),'ronin: eastern gear on every sword');ok(G.roster[0].eq.w==='katana','ronin: a katana');
  ok((G.rep.east||0)>=40&&(G.houses||[]).every(h=>(G.rep[h.id]||0)<=-10),'ronin: the Shogunate +40, the houses wary');ok(X.originK('wage')===.85,'ronin: wages x0.85');play('ronin',G);
  console.log('  six origins raised and played')}

section('achievements never touch the game stream');
{ const run=grant=>{X.achReset();if(grant)X.achGrantAll();const G=fresh(SEED+50);for(let i=0;i<3;i++)fightOnce({f:'bandit'});for(let d=0;d<6;d++){X.advanceTime(24);closeAll(X)}
   return JSON.stringify({c:G.crowns,r:G.renown,d:G.day,h:G.hour,ro:G.roster.map(m=>[m.id,m.xp,m.hp]),p:G.parties.map(p=>[p.id,Math.round(p.x),Math.round(p.y)]),rng:X.rngState()})};
  const a=run(false),b=run(true),c=run(false);ok(a===b&&a===c,'same seed, same march, with or without achievements');console.log('  replay identical')}

console.log('\nOK');
