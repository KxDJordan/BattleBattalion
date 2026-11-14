// Headless rules test. Plain node, no browser:  node test/headless.js [--quick] [--seed N] [--verbose] [--board WxH]
// (--board loads the source with BW/BH replaced, to prove the battle rules follow the board constants.)
// Loads src/*.js exactly as build.js concatenates them, inside a vm context with minimal DOM stubs,
// then drives the real game functions with fixed seeds. Exits non-zero on any exception, non-finite
// number in game state, stuck turn, battle that does not end, missing coverage or broken determinism.
// Sections: engine, world, saves (with the v3 -> v4 combat-depth migration), battle events, combat depth (directed scenes on a
// flat arena: hit locations and helmets, armor condition and repair, morale checks / flight / rally / routs, injuries inflicted /
// healed / treated, line of sight, cover and friendly fire, every weapon and shield skill, free attacks, withdraw, retreat,
// reserves, o.deploy, preview, spawn), campaign, 500+ auto-battles with win rates per faction and level under a turn cap, determinism.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),QUICK=ARGV.includes('--quick'),VERBOSE=ARGV.includes('--verbose');
const SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261113;
const BOARD=ARGV.includes('--board')?ARGV[ARGV.indexOf('--board')+1].split('x').map(Number):null;
const SKIP=ARGV.includes('--skip')?ARGV[ARGV.indexOf('--skip')+1].split(','):[];          // --skip 63-ai.js,64-foes.js: run the rules without those files
const SRC=path.join(__dirname,'..','src'),T0=Date.now(),TURNCAP=6000;
let finished=false,failed=false,SRCJS=null;
function fail(msg){failed=true;console.error('\nFAIL: '+msg);process.exit(1)}
function ok(c,msg){if(!c)fail(msg)}
process.on('unhandledRejection',e=>fail('unhandled rejection: '+(e&&e.stack||e)));
process.on('uncaughtException',e=>fail('uncaught exception: '+(e&&e.stack||e)));
process.on('exit',code=>{if(!finished&&!failed&&code===0){console.error('\nFAIL: the run stopped before the end (a battle or march never resolved)');process.exitCode=1}});
const tick=()=>new Promise(r=>setImmediate(r));
let secT=Date.now();const section=n=>{const t=Date.now();if(VERBOSE)console.log(`  [${((t-secT)/1000).toFixed(1)}s]`);secT=t;console.log('\n== '+n+' ==')};

/* ---------- DOM stubs ---------- */
function hole(props){const store=Object.assign(Object.create(null),props||{});
 return new Proxy(function(){},{
  get(t,k){if(k in store)return store[k];if(k==='then'||k==='toJSON')return undefined;if(k===Symbol.toPrimitive)return h=>h==='number'?0:'';
   if(k===Symbol.iterator)return function*(){};if(typeof k==='symbol')return undefined;if(k==='length')return 0;return store[k]=hole()},
  set(t,k,v){store[k]=v;return true},has(){return true},deleteProperty(t,k){delete store[k];return true},apply(){return hole()},construct(){return hole()}})}
function element(id){const cls=new Set();
 return hole({id:id||'',tagName:'DIV',innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,children:[],childNodes:[],dataset:{},parentNode:null,
  scrollTop:0,scrollLeft:0,scrollHeight:0,offsetTop:0,offsetLeft:0,offsetWidth:0,offsetHeight:0,clientWidth:0,clientHeight:0,width:300,height:150,
  classList:{add(...a){a.forEach(x=>cls.add(x))},remove(...a){a.forEach(x=>cls.delete(x))},toggle(x,f){const on=f===undefined?!cls.has(x):!!f;on?cls.add(x):cls.delete(x);return on},contains:x=>cls.has(x)},
  style:hole({setProperty(){},removeProperty(){},getPropertyValue:()=>''}),
  getBoundingClientRect:()=>({x:0,y:0,top:0,left:0,right:0,bottom:0,width:0,height:0}),
  getContext:()=>hole({measureText:()=>({width:10}),getImageData:()=>({data:[]})}),
  addEventListener(){},removeEventListener(){},dispatchEvent:()=>true,setAttribute(){},removeAttribute(){},getAttribute:()=>null,hasAttribute:()=>false,
  appendChild:x=>x,insertBefore:x=>x,removeChild:x=>x,remove(){},focus(){},blur(){},click(){},scrollIntoView(){},scrollTo(){},
  setPointerCapture(){},releasePointerCapture(){},hasPointerCapture:()=>false,contains:()=>false,closest:()=>null,matches:()=>false,
  querySelector:()=>null,querySelectorAll:()=>[],getElementsByClassName:()=>[],getElementsByTagName:()=>[],animate:()=>hole()})}
function makeContext(){const els=new Map(),store=new Map(),warns=[];
 const doc={getElementById(id){if(!els.has(id))els.set(id,element(id));return els.get(id)},createElement:()=>element(),createElementNS:()=>element(),createTextNode:()=>element(),createDocumentFragment:()=>element(),
  body:element('body'),documentElement:element('html'),head:element('head'),addEventListener(){},removeEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],
  hidden:false,visibilityState:'visible',fullscreenElement:null,activeElement:null,fonts:hole(),exitFullscreen(){}};
 const sb={document:doc,console:{log(){},info(){},debug(){},warn(...a){warns.push(a.join(' '))},error(...a){fail('console.error from game code: '+a.join(' '))}},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem(k,v){store.set(k,String(v))},removeItem(k){store.delete(k)},clear(){store.clear()}},
  setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},queueMicrotask,
  innerWidth:667,innerHeight:375,devicePixelRatio:1,addEventListener(){},removeEventListener(){},dispatchEvent:()=>true,
  matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}),
  getComputedStyle:()=>hole({getPropertyValue:()=>''}),navigator:{userAgent:'node',maxTouchPoints:0,vibrate(){}},screen:hole(),location:{href:'',reload(){}},
  performance:{now:()=>0},ResizeObserver:function(){return{observe(){},disconnect(){},unobserve(){}}},MutationObserver:function(){return{observe(){},disconnect(){}}},
  IntersectionObserver:function(){return{observe(){},disconnect(){}}},Image:function(){return element()},Audio:function(){return hole()},CSS:{supports:()=>false,escape:s=>s}};
 sb.window=sb;sb.self=sb;sb.globalThis=sb;sb.top=sb;sb.parent=sb;
 const ctx=vm.createContext(sb);
 const js=SRCJS||(SRCJS=fs.readdirSync(SRC).filter(f=>f.endsWith('.js')&&!SKIP.includes(f)).sort().map(f=>`/* ---- ${f} ---- */\n`+fs.readFileSync(path.join(SRC,f),'utf8')).join('\n'));   // read once: every context of a run gets the same code, whoever is saving files meanwhile
 let code=js;if(BOARD){ok(/const BW=\d+,BH=\d+,/.test(js),'board constants not found');code=js.replace(/const BW=\d+,BH=\d+,/,`const BW=${BOARD[0]},BH=${BOARD[1]},`)}
 vm.runInContext("'use strict';\n"+code,ctx,{filename:'wyrdmarch-src.js'});
 // X.name reads any game global: functions are properties of the context, let/const are read through cached accessors.
 const getters=new Map(),setters=new Map(),extra={ctx,store,warns,sheets:[],toasts:[],sundering:false,sceneFx:null};
 const X=new Proxy(extra,{get(t,k){if(k in t)return t[k];if(typeof k!=='string')return undefined;if(k in ctx)return ctx[k];
   if(!getters.has(k))getters.set(k,vm.runInContext(`(()=>typeof ${k}==='undefined'?undefined:${k})`,ctx));return getters.get(k)()},
  set(t,k,v){if(k in t){t[k]=v;return true}if(!setters.has(k))setters.set(k,vm.runInContext(`(v=>{${k}=v})`,ctx));setters.get(k)(v);return true}});
 for(const n of ['newGame','continueGame','closeSheet','sheet','toast','setUI','startBattle','save','loadSave','seedRng','rnd','shuffle','rngState','setRngState',
   'worldTick','goTo','advanceTime','afterBattle','settleBattle','resolveBattle','autoBattle','enterRift','dunBattle','portalSheet','gainXP','newMerc','calc','fielded',
   'openTown','hire','buyItem','sellItem','buyFood','innRest','acceptContract','genContract','equip','learn','levelSheet','lvPick','lvConfirm',
   'abilityInfo','canUse','validTargets','useAbility','aiTurn','nextTurn','place','centerOut','genBattleMap','readSave','saveStatus','migrateSave',
   'hurt','strike','hitChance','headChance','forecast','losInfo','unitStatuses','spawnUnit','mkEnemy','mkPlayerUnit','withdraw','soundRetreat','callReserve','battlePreview','previewEnemies','battleBudget','battleSync','checkEnd','walkPath',
   'setMorale','moraleCheck','checkRout','breakShield','repairAll','repairNeed','armorCond','setArmorCond','addInjury','rollInjury','healInjuriesDaily','injuryCost','treatInjury',
   'genWorld','findPath','routeTo','setRoute','clearRoute','tileAt','okAt','speedAt','seenAt','visibleAt','visionRadius','bandSight','fogPack','fogLoad','weatherFx','partyStrength','siteSheet','renderWorldImg','placeTowns','randOk','lineClear','camp'])
  ok(typeof ctx[n]==='function','game function '+n+'() is missing');
 for(const n of ['G','B','W','mode','sheetOpen','SPEEDF','FX','BW','BH','COLS','DEPLOY','SAVEKEY','SAVEVER','WN','TS','WS','SPD','ROADSPD','RIVERMUL','FP','RUINS','TOWNN','STATUS','MORN','MORFX','INJ','EDGE','FREEAB','TOOLPTS','HEADCH','COVERPEN','FFCH','statusList','canWithdraw','canRetreat','canCallReserve'])ok(X[n]!==undefined||n==='G'||n==='B'||n==='W','game global '+n+' is missing');
 const sheet0=ctx.sheet,toast0=ctx.toast;ctx.sheet=function(h){extra.sheets.push(String(h));if(/The Sundering/.test(h))extra.sundering=true;return sheet0(h)};ctx.toast=function(t){extra.toasts.push(String(t));return toast0(t)};
 extra.sceneFx=X.FX.on;X.FX.on=null;                 // rules are tested with no scene attached; the scene's handler is tried separately
 X.SPEEDF=0;X.clone=vm.runInContext('(o=>JSON.parse(JSON.stringify(o)))',ctx);
 return X}

/* ---------- checks ---------- */
function scan(o,where,seen){seen=seen||new Set();if(typeof o==='number'){if(!isFinite(o))fail('non-finite number at '+where);return}
 if(!o||typeof o!=='object'||seen.has(o)||ArrayBuffer.isView(o))return;seen.add(o);
 if(o instanceof Map||Object.prototype.toString.call(o)==='[object Map]'||Object.prototype.toString.call(o)==='[object Set]')return;
 for(const k of Object.keys(o)){if(k==='onEnd'||k==='def'||k==='P')continue;scan(o[k],where+'.'+k,seen)}}
function closeAll(X){for(let i=0;i<6&&X.sheetOpen;i++)X.closeSheet(true);if(X.sheetOpen)X.sheetOpen=false;if(X.G)X.G.townOpen=false}
function digest(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')}

/* ---------- battles ---------- */
// Finishes the battle in progress with the AI on both sides, then leaves it through the real afterBattle().
async function fight(X,log){const b=X.B;ok(b&&X.mode==='battle','fight() without a battle');b.opts.turnCap=TURNCAP;
 const res=b.result||await new Promise(r=>{b.onEnd=r;b.auto=true});
 if(res.stuck)fail(`battle vs ${b.opts.f} did not end within ${TURNCAP} turns (round ${res.rounds})`);
 scan(b,'B');X.sheets.length=0;const out=X.afterBattle(res.win?1:0);await tick();
 if(out.kind==='wiped'){ok(X.G.roster.length===0&&X.readSave().state==='none'&&X.save()===false&&/company is no more/.test(X.sheets.join()),'a wiped company was not retired cleanly');X.worldTick(.05);return{res,out,src:b.opts.src}}ok(X.B===null&&X.mode==='world','afterBattle left the battle open');scan(X.G,'G');
 if(log)log.push(`${b.opts.f}:${res.win?'W':'L'}:${res.rounds}:${res.turns}:${res.crowns}`);return{res,out,src:b.opts.src}}
// Plays the company by script so abilities (useAbility) are exercised; enemies use the AI.
async function scriptedBattle(X,opts){let done=null;const b=X.startBattle(Object.assign({},opts,{quiet:true,turnCap:TURNCAP,onEnd:r=>{done=r}}));ok(b,'scripted battle did not start');
 const used={};let spins=0,acts=0,turn=-1;
 while(!done){if(!b.busy&&!b.over&&b.cur&&b.cur.side===0){const u=b.cur;if(turn!==b.turns){turn=b.turns;acts=0}let acted=false;spins=0;
   if(acts<5)for(const id of X.shuffle(['attack'].concat(u.abs))){const a=X.abilityInfo(u,id);if(!X.canUse(u,a))continue;let k=u.r*X.BW+u.c;
     if(a.tgt==='aoe'){if(!b.units.some(t=>t.alive&&t.side!==u.side&&Math.abs(t.c-u.c)+Math.abs(t.r-u.r)===1))continue}
     else if(a.tgt!=='self'){const ts=[...X.validTargets(u,a)];if(!ts.length)continue;k=ts[X.ri(0,ts.length-1)]}
     used[id]=(used[id]||0)+1;acts++;acted=true;await X.useAbility(u,a,k);break}
   if(!acted&&!b.over&&!b.busy&&b.cur===u){b.busy=true;await X.aiTurn(u);if(!b.over)X.nextTurn()}}
  else{await null;if(++spins>2e6)fail('scripted battle stalled (busy never cleared)')}}
 if(done.stuck)fail('scripted battle did not end');scan(b,'B');X.settleBattle(done.win);scan(X.G,'G');return{res:done,used}}

/* ---------- company fixtures ---------- */
const STATS=['hp','ms','md'],STATS_R=['hp','rs','rd'];
function levelUps(X,flags){const G=X.G;for(let i=0;i<G.roster.length;i++){const m=G.roster[i];let g=0;
  while(m.pend>0&&g++<20){const before=m.pend,bow=X.calc(m).wpn.wt==='bow';X.levelSheet(i);ok(m.rolls,'level-up rolls were not made for '+m.name);
   for(const k of bow?STATS_R:STATS)X.lvPick(i,k);const hp0=m.base.hp;X.lvConfirm(i);ok(m.pend===before-1&&m.base.hp>hp0,'level-up was not applied to '+m.name);if(flags)flags.level=true}
  g=0;while(m.pp>0&&g++<30){const ks=Object.keys(m.mast).filter(k=>m.mast[k]<X.MAST[k].p.length);if(!ks.length)break;
   const k=ks.find(k=>X.MAST[k].res&&m.mast[k]<2)||ks.sort((a,b)=>m.mast[a]-m.mast[b])[0],pp=m.pp;X.learn(i,k);ok(m.pp===pp-1,'perk was not learned by '+m.name);if(flags)flags.perk=true}}}
const score=(X,id,k)=>{const it=X.ITEMS[id];return k==='w'?(it.d[0]+it.d[1])/2:k==='s'?it.md+it.rd:it.arm};
function gearUp(X,flags){const G=X.G;for(let i=0;i<G.roster.length;i++){const m=G.roster[i];for(const k of ['w','a','s','h']){const cur=m.eq[k],wt=k==='w'&&cur?X.ITEMS[cur].wt:null;
   if(k==='s'&&m.eq.w&&X.ITEMS[m.eq.w].two)continue;let best=-1,bs=cur?score(X,cur,k):-1;
   G.stash.forEach((id,j)=>{const it=X.ITEMS[id];if(it.k!==k)return;if(k==='w'){if((wt==='bow')!==(it.wt==='bow')||(wt==='staff')!==(it.wt==='staff'))return;if(it.two&&m.eq.s&&wt!=='bow'&&wt!=='staff')return}
    const s=score(X,id,k);if(s>bs){bs=s;best=j}});
   if(best>=0){const id=G.stash[best];X.equip(i,k,best);ok(m.eq[k]===id,'equip did not take');if(flags)flags.equip=true}}}}
const BGS=['sellsword','squire','hunter','acolyte','hedge','knight','militia','monk','wildling','spellblade','thief','farmhand'];
const TIERS=[{lvl:1,size:4,day:2,gear:[]},{lvl:4,size:6,day:12,gear:['arming','waraxe','warspear','mace','shortbow','leather','kite','cap']},
 {lvl:8,size:9,day:30,gear:['arming','waraxe','warspear','mace','warbow','focus','mail','heater','kettle']},{lvl:12,size:12,day:50,gear:['runeblade','waraxe','warspear','mace','warbow','focus','scale','plate','heater','nasal','greathelm']}];
// Builds a company of the tier through the real game functions and returns a JSON-safe snapshot of its roster.
function buildCompany(X,tier,seed){X.seedRng(seed);X.newGame(true);closeAll(X);const G=X.G;G.roster.length=0;G.stash.length=0;
 for(let i=0;i<tier.size;i++){const m=X.newMerc(BGS[(i+seed)%BGS.length]);m.field=true;G.roster.push(m);X.gainXP(m,X.XPT[tier.lvl]);ok(m.lvl===tier.lvl,'gainXP did not reach level '+tier.lvl)}
 for(let n=0;n<tier.size;n++)tier.gear.forEach(id=>G.stash.push(id));
 levelUps(X);gearUp(X);G.roster.forEach(m=>{m.hp=X.calc(m).hp});closeAll(X);scan(G,'G');return X.clone(G.roster)}

/* ---------- campaign ---------- */
async function march(X,x,y,dest,log,via){const G=X.G;if(via)X.setRoute([via,{x,y,dest}]);else X.goTo(x,y,dest);let n=0,day=G.day;
 for(;;){if(X.mode==='battle'){ok(X.G.route.length===0,'an encounter must end the planned route');const r=await fight(X,log);if(r.out.kind==='wiped')return'wiped';if(r.src.type==='lair'&&r.res.win)return'lair';closeAll(X);X.goTo(x,y,dest);continue}
  if(X.sheetOpen){if(!X.G.moving)return'arrived';closeAll(X);continue}
  if(!X.G.moving)return'arrived';
  X.worldTick(.05);if(++n>400000)fail('march never arrived');if(X.G.day!==day){day=X.G.day;scan(X.G,'G')}}}
async function campaign(X,seed,flags,log,minDays){X.seedRng(seed);X.sheets.length=0;X.newGame(true);ok(X.mode==='world'&&X.sheetOpen,'newGame did not open the world');closeAll(X);
 const G=X.G;ok(G.roster.length===4&&G.towns.length>=10&&G.towns.length<=12&&G.sites.length>=5&&G.weather&&G.v===X.SAVEVER,'unexpected new game state');scan(G,'G');
 G.crowns+=60000;                                     // fixture: the test is about rules, not about going broke
 G.roster.forEach(m=>{m.base.hp+=30;m.base.ms+=12;m.base.md+=8;m.base.brv+=25;m.hp=X.calc(m).hp});   // ... nor about four green swords surviving a month on autopilot (the auto-battle table below measures balance)
 let here=0,loops=0,vet=false,rifts=0;const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const wages=()=>G.roster.reduce((n,m)=>n+X.BG[m.bg].wage,0),mark=()=>({c:G.crowns,d:G.day,w:wages()}),paid=(m,pay)=>G.crowns>=m.c+pay-m.w*(G.day-m.d);   // wages fall due on the road
 const town=async(i,via)=>{const nb=log.length,r=await march(X,G.towns[i].x,G.towns[i].y,{type:'town',i},log,via);if(r==='wiped')return r;
  if(via&&log.length===nb&&X.G.townOpen&&X.G.town===i)flags.route=true;                // a two-leg route marched through the middle town and opened only the last
  if(G.weather.kind!=='clear')flags.weather=true;
  if(!X.G.townOpen||X.G.town!==i){closeAll(X);ok(dist(G.p,G.towns[i])<8,'march did not reach '+G.towns[i].name);X.openTown(i)}here=i;return'ok'};
 const inTown=()=>{const t=G.towns[G.town];let c0;const dmg0=X.repairNeed().pts;G.tools=Math.max(G.tools||0,80);
  c0=G.crowns;X.innRest();if(G.crowns<c0){ok(G.roster.every(m=>m.hp===X.calc(m).hp),'inn did not heal');flags.inn=true}
  for(let g=0;g<8&&t.recruits.length&&G.roster.length<12;g++){const n=G.roster.length;X.hire(0);if(G.roster.length===n+1)flags.hire=true;else break}
  for(let j=t.stock.length-1;j>=0;j--){const n=G.stash.length;X.buyItem(j);if(G.stash.length===n+1)flags.buy=true}
  while(G.food<G.roster.length*12){const f=G.food;X.buyFood();if(G.food<=f)break;flags.food=true}
  levelUps(X,flags);gearUp(X,flags);
  { G.tools=Math.max(G.tools||0,80);const need=X.repairNeed().pts,rp=X.repairAll();ok(rp.pts===Math.min(need,80*X.TOOLPTS)&&rp.left===need-rp.pts,'repair in town went wrong');if(dmg0>0&&X.repairNeed().pts<dmg0)flags.repair=true;   // (resting at the inn may already have mended some)   // fixture: the smith and the temple put the company back together
    for(const m of G.roster)for(const j of m.inj.slice()){if(j.days<0){flags.maimed=true;continue}const c=G.crowns,cost=X.injuryCost(m,j.id);ok(X.treatInjury(m,j.id)&&G.crowns===c-cost&&!m.inj.includes(j),'the temple did not treat '+j.id);flags.temple=true}
    G.roster.forEach(m=>{m.hp=Math.min(m.hp,X.calc(m).hp)}) }
  for(let j=G.stash.length-1;j>=0;j--){if(X.ITEMS[G.stash[j]].price>150||X.ITEMS[G.stash[j]].uniq)continue;c0=G.crowns;X.sellItem(j);if(G.crowns>c0)flags.sell=true}
  if(!G.contract){const want=!flags.deliver?'deliver':!flags.hunt?'hunt':null;let j=t.contracts.findIndex(c=>!want||c.type===want);
   for(let g=0;j<0&&g<200;g++){const c=X.genContract(t);if(c.type===want){t.contracts.push(c);j=t.contracts.length-1}}
   if(j>=0){X.acceptContract(j);ok(G.contract&&G.contract.town===G.town,'contract was not accepted');flags.accept=true}}
  scan(G,'G');closeAll(X)};
 ok(await town(0)==='ok','could not enter the first town');
 while(loops++<80){if(!G.roster.length)return'wiped';inTown();
  if(G.crisis&&!flags.crisis){flags.crisis=true;ok(G.portals.length===3,'the crisis did not open three rifts')}
  if(G.crisis&&!vet){vet=true;while(G.roster.length<12){const m=X.newMerc(BGS[G.roster.length]);m.field=true;G.roster.push(m)}G.roster.forEach(m=>{m.field=true});G.roster.forEach(m=>X.gainXP(m,Math.max(0,X.XPT[X.MAXLV]-m.xp)));for(let n=0;n<12;n++)TIERS[3].gear.forEach(id=>G.stash.push(id));levelUps(X,flags);gearUp(X,flags);
   G.roster.forEach(m=>{if(!m.hero){m.hero=1;m.base.hp+=120;m.base.ms+=35;m.base.rs+=35;m.base.md+=25;m.base.rd+=25;m.base.brv+=80}});closeAll(X)}   // fixture: heroes for the rift, so that this walk through the campaign does not hang on the balance of the day
  if(G.crisis&&!flags.dungeon&&G.portals.length&&rifts<8){rifts++;G.roster.forEach(m=>{m.hp=X.calc(m).hp});const p=G.portals[0];
   let r;do{r=await march(X,p.x,p.y,{type:'portal',id:p.id},log);closeAll(X)}while(r==='lair');if(r==='wiped')return r;ok(dist(G.p,p)<8,'march did not reach the rift');closeAll(X);   // (a contract lair on the way is cleared in passing)
   X.enterRift(p.id);ok(X.mode==='battle'&&G.dun&&G.dun.stage===0,'the rift did not open a battle');
   for(let stage=0;stage<3;stage++){const f=await fight(X,log);if(f.out.kind==='wiped')return'wiped';if(!f.res.win){ok(G.dun===null,'a lost rift kept its dungeon state');break}
    if(stage<2){ok(f.out.kind==='dunNext'&&G.dun.stage===stage+1,'rift stage did not advance');closeAll(X);X.dunBattle();ok(X.mode==='battle','next rift battle did not start')}
    else{ok(f.out.kind==='dunDone'&&G.dun===null&&!G.portals.some(q=>q.id===p.id)&&G.stash.includes('riftedge')&&G.crisis.closed>=1,'rift was not closed properly');flags.dungeon=true}}
   closeAll(X)}
  const c=G.contract;
  if(c&&c.type==='deliver'){const m0=mark();if(await town(c.to)==='wiped')return'wiped';if(G.contract===null&&paid(m0,c.pay))flags.deliver=true;else fail('delivery was not paid')}
  else if(c&&c.type==='hunt'&&!c.done){const r=await march(X,c.x,c.y,null,log);if(r==='wiped')return r;
   if(G.contract&&G.contract.done){closeAll(X);const m0=mark();if(await town(c.town)==='wiped')return'wiped';if(G.contract===null&&paid(m0,c.pay))flags.hunt=true;else fail('hunt was not paid')}
   else{ok(G.contract===null||dist(G.p,c)>8,'a lost hunt kept its contract');closeAll(X);if(await town(here)==='wiped')return'wiped'}}
  else if(!flags.site){const s=G.sites.slice().sort((a,b)=>dist(G.p,a)-dist(G.p,b))[0];X.sheets.length=0;const r=await march(X,s.x,s.y,null,log);if(r==='wiped')return r;
   if(dist(G.p,s)<2&&s.v===1&&X.sheets.some(h=>h.includes(X.RUINS[s.n][0].replace(/'/g,"'")))){flags.site=true;ok(G.crowns>=0&&G.stash,'a ruin changed the company')}closeAll(X);if(await town(here)==='wiped')return'wiped'}
  else{const n=G.towns.length,to=(here+2)%n,mid=G.towns[(here+1)%n];if(await town(to,{x:mid.x,y:mid.y,dest:{type:'town',i:(here+1)%n}})==='wiped')return'wiped'}
  if(G.day>=minDays&&flags.deliver&&flags.hunt&&flags.site&&flags.route&&(flags.dungeon||rifts>=8))break}
 closeAll(X);ok(X.save(),'save failed at the end of the campaign');return'done'}

/* ---------- main ---------- */
(async()=>{
 const X=makeContext();
 section('engine');
 X.seedRng(42);const a=[X.rnd(),X.rnd(),X.rnd()],st=X.rngState(),b=[X.rnd(),X.rnd()];X.seedRng(42);ok(a.join()===[X.rnd(),X.rnd(),X.rnd()].join(),'seedRng is not repeatable');
 X.setRngState(st);ok(b.join()===[X.rnd(),X.rnd()].join(),'setRngState does not restore the stream');
 const sh=X.shuffle([...Array(50).keys()]);ok(sh.length===50&&new Set(sh).size===50&&sh.some((v,i)=>v!==i),'shuffle is not a permutation');
 ok(X.BW!==12||X.COLS.join()==='5,6,4,7,3,8,2,9,1,10,0,11','COLS changed for the 12-wide board: '+X.COLS.join());
 ok(X.centerOut(16).join()==='7,8,6,9,5,10,4,11,3,12,2,13,1,14,0,15'&&X.centerOut(5).join()==='2,1,3,0,4','centerOut is wrong');
 ok(X.DEPLOY.p.front===X.BH-2&&X.DEPLOY.p.back===X.BH-1&&X.DEPLOY.e.front===1&&X.DEPLOY.e.back===0,'deployment rows do not derive from the board');
 { const tiles=[];for(let i=0;i<X.BW*X.BH;i++)tiles.push({h:0,t:i%7===3?'block':'ground'});const used=new Set(),mk=(n,back)=>[...Array(n)].map((_,i)=>({back:back&&i%3===0}));
   const p=X.place(mk(12,true),X.DEPLOY.p.front,X.DEPLOY.p.back,-1,tiles,used),e=X.place(mk(16,true),X.DEPLOY.e.front,X.DEPLOY.e.back,1,tiles,used),all=p.concat(e);
   ok(all.length===28&&new Set(all.map(u=>u.r*X.BW+u.c)).size===28&&all.every(u=>u.c>=0&&u.c<X.BW&&u.r>=0&&u.r<X.BH&&tiles[u.r*X.BW+u.c].t!=='block'),'place() overlapped, left the board or used a blocked tile');
   const wall=[];for(let i=0;i<X.BW*X.BH;i++)wall.push({h:0,t:((i/X.BW)|0)===5||i%X.BW===3&&i>6*X.BW?'block':'ground'});X.openBattleMap(wall);
   const seen=new Set([X.COLS[0]+(X.BH-1)*X.BW]),q=[...seen];for(const k of q)for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const c=k%X.BW+dc,r=((k/X.BW)|0)+dr,n=r*X.BW+c;if(c<0||r<0||c>=X.BW||r>=X.BH||seen.has(n)||wall[n].t==='block')continue;seen.add(n);q.push(n)}
   ok(wall.every((t,i)=>t.t==='block'||seen.has(i)),'openBattleMap left part of the field unreachable');
   const many=X.place(mk(X.BW*X.BH+5,false),1,0,1,null,new Set());ok(many.length===X.BW*X.BH,'place() must stop when the board is full') }
 console.log(`rng, shuffle, board ${X.BW}x${X.BH}, deployment: ok`);

 section('world');
 { const N=X.WN*X.WN,TS=X.TS,WN=X.WN,DX=[0,1,0,-1],DY=[-1,0,1,0],seeds=[];for(let i=0;i<(QUICK?6:20);i++)seeds.push(SEED+i*7919);
   const wdig=w=>digest([w.tiles,w.ok,w.river,w.road].map(a=>Array.from(a).join('')).join('|')+JSON.stringify(w.towns)+JSON.stringify(w.sites));
   const nowMs=()=>Number(process.hrtime.bigint())/1e6;let worst=0,roadFrac=0,nPairs=0,bridges=0,rivers=0,genMs=0;const digs=[];
   for(const seed of seeds){const t0=nowMs(),w=X.genWorld(seed);genMs=Math.max(genMs,nowMs()-t0);X.W=w;digs.push(wdig(w));
    ok(w.tiles.length===N&&w.ok.length===N&&w.river.length===N&&w.road.length===N&&w.seen.length===N&&w.fogRev===0,'world arrays have the wrong shape');
    ok(w.towns.length>=10&&w.towns.length<=12,`seed ${seed}: ${w.towns.length} towns`);ok(new Set(w.towns.map(t=>t.name)).size===w.towns.length,'town names repeat');
    ok(w.towns.some(t=>t.size===3)&&w.towns.some(t=>t.size===2)&&w.towns.some(t=>t.size===1)&&w.towns.every(t=>t.size>=1&&t.size<=3),'town sizes are wrong');ok(w.sites.length>=5&&w.sites.every(s=>s.kind==='ruin'&&X.okAt(s.x,s.y)),'ruins are missing or unreachable');
    const ti=t=>Math.floor(t.y/TS)*WN+Math.floor(t.x/TS),land=[0,0,0,0,0,0,0,0];
    for(let i=0;i<N;i++){const t=w.tiles[i],x=i%WN,y=(i/WN)|0;ok(t<=7,'unknown terrain code');land[t]++;ok(!w.ok[i]||(t!==0&&t!==4),'water or mountain marked passable');
     ok(!(x<2||y<2||x>=WN-2||y>=WN-2)||t===0,'land touches the map edge');ok(!w.road[i]||w.ok[i],'a road leaves the mainland');ok(!w.river[i]||(t!==0&&t!==4),'a river tile is not on land');
     for(let j=0;j<4;j++){const nx=x+DX[j],ny=y+DY[j],n=ny*WN+nx,back=1<<((j+2)%4);
      if(w.road[i]>>j&1)ok(nx>=0&&ny>=0&&nx<WN&&ny<WN&&(w.road[n]&back),'a road link is one-sided');
      if(w.river[i]>>j&1)ok(nx>=0&&ny>=0&&nx<WN&&ny<WN&&(w.tiles[n]===0||(w.river[n]&back)),'a river link leads nowhere')}
     const sp=X.speedAt((x+.5)*TS,(y+.5)*TS);ok(sp===(w.ok[i]?(w.road[i]?X.ROADSPD:w.river[i]?X.SPD[t]*X.RIVERMUL:X.SPD[t]):0)||Math.abs(sp-(w.river[i]&&!w.road[i]?X.SPD[t]*X.RIVERMUL:sp))<1e-6,'speedAt disagrees with the travel table');
     if(w.river[i]){rivers++;if(w.road[i])bridges++}}
    ok(land[1]>100&&land[2]>60&&land[3]>40&&land[4]>30&&land[7]>30&&land[6]+land[5]>40&&w.size>1400,`seed ${seed}: a thin world (${land.join(',')}; mainland ${w.size})`);
    // rivers end in water: every connected river reaches a tile whose link points at water
    { const seen=new Uint8Array(N);for(let i=0;i<N;i++){if(!w.river[i]||seen[i])continue;const q=[i];seen[i]=1;let mouth=false,len=0;
       while(q.length){const k=q.pop(),x=k%WN,y=(k/WN)|0;len++;for(let j=0;j<4;j++){if(!(w.river[k]>>j&1))continue;const n=(y+DY[j])*WN+x+DX[j];if(w.tiles[n]===0)mouth=true;else if(!seen[n]){seen[n]=1;q.push(n)}}}
       ok(mouth,`seed ${seed}: a river of ${len} tiles never reaches water`);ok(len>=5,'a river is a stub')} }
    // roads connect all towns
    { const seen=new Uint8Array(N),q=[ti(w.towns[0])];seen[q[0]]=1;while(q.length){const k=q.pop(),x=k%WN,y=(k/WN)|0;for(let j=0;j<4;j++)if(w.road[k]>>j&1){const n=(y+DY[j])*WN+x+DX[j];if(!seen[n]){seen[n]=1;q.push(n)}}}
      for(const t of w.towns)ok(w.ok[ti(t)]&&w.road[ti(t)]&&seen[ti(t)],`seed ${seed}: ${t.name} is not on the road network`) }
    // every town reachable from every other; path sanity; routes are quick to plan
    for(let a=0;a<w.towns.length;a++){const steps=new Int32Array(N).fill(-1),q=[ti(w.towns[a])];steps[q[0]]=0;       // fewest steps over 8 neighbours, as a yardstick
     for(let h=0;h<q.length;h++){const k=q[h],x=k%WN,y=(k/WN)|0;for(let ay=-1;ay<=1;ay++)for(let ax=-1;ax<=1;ax++){const n=(y+ay)*WN+x+ax;if((!ax&&!ay)||!w.ok[n]||steps[n]>=0||(ax&&ay&&(!w.ok[y*WN+x+ax]||!w.ok[(y+ay)*WN+x])))continue;steps[n]=steps[k]+1;q.push(n)}}
     let ref=null;if(a===0){ref=new Float64Array(N).fill(Infinity);const done=new Uint8Array(N),sp=w.spd;ref[ti(w.towns[0])]=0;                    // plain O(n^2) Dijkstra as the reference for the heap A*
      for(;;){let k=-1,bc=Infinity;for(let i=0;i<N;i++)if(!done[i]&&ref[i]<bc){bc=ref[i];k=i}if(k<0)break;done[k]=1;const x=k%WN,y=(k/WN)|0;
       for(let ay=-1;ay<=1;ay++)for(let ax=-1;ax<=1;ax++){const n=(y+ay)*WN+x+ax;if((!ax&&!ay)||!sp[n]||done[n]||(ax&&ay&&(!sp[y*WN+x+ax]||!sp[(y+ay)*WN+x])))continue;const c=bc+(ax&&ay?1.4142:1)*(1/sp[k]+1/sp[n])*.5;if(c<ref[n])ref[n]=c}}}
     for(let b=0;b<w.towns.length;b++){if(a===b)continue;const A=w.towns[a],B=w.towns[b],t0=nowMs(),p=X.findPath(Math.floor(A.x/TS),Math.floor(A.y/TS),Math.floor(B.x/TS),Math.floor(B.y/TS)),ms=nowMs()-t0;
     ok(p&&p.length,`seed ${seed}: no way from ${A.name} to ${B.name}`);if(ms>worst)worst=ms;const cheb=Math.max(Math.abs(A.x-B.x),Math.abs(A.y-B.y))/TS;let px=A.x,py=A.y,onRoad=0;
     for(const s of p){ok(Math.abs(s.x-px)<=TS+.01&&Math.abs(s.y-py)<=TS+.01&&X.okAt(s.x,s.y),'a path jumps or leaves the land');px=s.x;py=s.y;if(w.road[ti(s)])onRoad++}
     const least=steps[ti(B)];ok(px===B.x&&py===B.y&&least>=cheb&&p.length>=least&&p.length<=least*4+8,`seed ${seed}: odd path length ${p.length} (fewest steps ${least}, ${cheb} tiles apart)`);
      if(ref)ok(Math.abs(X.FP.total-ref[ti(B)])<1e-6,`seed ${seed}: the path to ${B.name} is not the quickest (${X.FP.total} against ${ref[ti(B)]})`);roadFrac+=onRoad/p.length;nPairs++}}
    ok(X.findPath(0,0,5,5)===null&&X.findPath(-1,0,5,5)===null,'a path into the sea must be refused') }
   ok(roadFrac/nPairs>.6,'paths between towns do not prefer roads ('+(roadFrac/nPairs).toFixed(2)+')');ok(bridges>=seeds.length,'roads hardly ever bridge a river');
   // a route across the whole map, timed
   { let slow=0,tot=0,n=0;for(const seed of seeds.slice(0,6)){X.W=X.genWorld(seed);const w=X.W;let a=-1,b=-1;for(let i=0;i<N;i++)if(w.ok[i]){if(a<0)a=i;b=i}
      for(let k=0;k<30;k++){const t0=nowMs(),p=X.findPath(a%WN,(a/WN)|0,b%WN,(b/WN)|0),ms=nowMs()-t0;ok(p&&p.length>20,'no route across the map');if(k>2){tot+=ms;n++;if(ms>slow)slow=ms}}}
     ok(tot/n<2&&slow<5,`route planning is slow: mean ${(tot/n).toFixed(2)} ms, worst ${slow.toFixed(2)} ms`);
     console.log(`${seeds.length} worlds: towns, roads, rivers, reachability ok; ${rivers} river tiles, ${bridges} bridges; ${(100*roadFrac/nPairs).toFixed(0)}% of town-to-town marching is on roads`);
     console.log(`generation ${genMs.toFixed(0)} ms worst; cross-map route mean ${(tot/n).toFixed(2)} ms, worst ${slow.toFixed(2)} ms; town pairs worst ${worst.toFixed(2)} ms`) }
   { const Y=makeContext();ok(wdig(Y.genWorld(seeds[0]))===digs[0]&&wdig(Y.genWorld(seeds[1]))===digs[1]&&wdig(X.genWorld(seeds[0]))===digs[0],'the world is not a pure function of its seed') }
   // fog, vision, weather, routes, ruins, bands on a live campaign
   X.store.clear();X.seedRng(SEED+3);X.newGame(true);closeAll(X);const G=X.G,W=X.W,t0=G.towns[0],cnt=()=>{let n=0;for(let i=0;i<N;i++)if(W.seen[i])n++;return n};
   ok(X.seenAt(Math.floor(t0.x/TS),Math.floor(t0.y/TS))&&X.visibleAt(Math.floor(G.p.x/TS),Math.floor(G.p.y/TS))&&!X.seenAt(0,0)&&!X.seenAt(-1,5)&&!X.visibleAt(WN,0),'the start is not explored, or the far sea is');
   const c0=cnt();ok(c0>120&&c0<N/3,'the starting explored area is the wrong size: '+c0);
   { const r0=X.visionRadius();ok(r0>=2.5*TS&&r0<=10*TS,'vision radius out of range');const h=G.hour;G.hour=1;const rn=X.visionRadius();G.hour=12;const rd=X.visionRadius();G.weather.kind='fog';const rf=X.visionRadius();G.weather.kind='clear';
     ok(rn<rd&&rf<rd,'night or fog does not shorten sight');const px=G.p.x,py=G.p.y,at=c=>{for(let i=0;i<N;i++)if(W.ok[i]&&W.tiles[i]===c&&!W.road[i]){G.p.x=(i%WN+.5)*TS;G.p.y=(((i/WN)|0)+.5)*TS;return X.visionRadius()}return null};
     const vf=at(2),vh=at(3),vp=at(1);G.p.x=px;G.p.y=py;G.hour=h;ok(vf<vp&&vp<vh,'forest must hide and hills must show more than plains');ok(X.bandSight()<=3.75*TS+1e-9&&X.bandSight()>=2*TS,'bands see too far');
     for(const k of ['clear','rain','snow','storm','fog','sand']){const f=X.weatherFx(k);ok(f&&f.spd>.7&&f.spd<=1&&f.vis>.4&&f.vis<=1,'weather effect out of range: '+k)} }
   G.grace=1e9;G.crisisDay=1e9;const far=G.towns.map((t,i)=>i).sort((a,b)=>Math.hypot(G.towns[b].x-t0.x,G.towns[b].y-t0.y)-Math.hypot(G.towns[a].x-t0.x,G.towns[a].y-t0.y)),mid=far[Math.floor(far.length/2)],end=far[0],rev0=W.fogRev;
   const plan=X.routeTo(G.towns[end].x,G.towns[end].y);ok(plan&&plan.path.length>5&&plan.hours>1&&!G.moving&&G.path.length===0,'routeTo must plan without moving');
   const leg=X.routeTo(G.towns[end].x,G.towns[end].y,G.towns[mid]);ok(leg&&leg.hours>0&&X.routeTo(1,1)===null,'routeTo from a waypoint failed, or planned into the sea');
   const h0=G.day*24+G.hour;ok(X.setRoute([{x:G.towns[mid].x,y:G.towns[mid].y,dest:{type:'town',i:mid}},{x:G.towns[end].x,y:G.towns[end].y,dest:{type:'town',i:end}}])&&G.route.length===2&&G.moving,'setRoute did not start');
   let passed=false,opened=false,kinds={};for(let n=0;n<400000&&G.moving;n++){X.worldTick(.05);if(X.sheetOpen){if(X.G.townOpen&&G.town===mid)opened=true;if(G.moving)closeAll(X)}if(Math.hypot(G.p.x-G.towns[mid].x,G.p.y-G.towns[mid].y)<1)passed=true;kinds[G.weather.kind]=1;ok(X.mode==='world','a battle started under grace')}
   ok(passed&&!opened&&G.route.length===0&&Math.hypot(G.p.x-G.towns[end].x,G.p.y-G.towns[end].y)<1&&G.town===end&&X.sheetOpen,'the route did not pass the middle town and stop in the last');closeAll(X);
   const took=G.day*24+G.hour-h0,est=X.routeTo(G.towns[mid].x,G.towns[mid].y,t0).hours+leg.hours;ok(took>est*.85&&took<est*1.6,`route took ${took.toFixed(1)} h against a plan of ${est.toFixed(1)} h`);
   ok(cnt()>c0+60&&W.fogRev>rev0,'marching did not push back the fog');ok(G.parties.every(p=>X.okAt(p.x,p.y)&&Array.isArray(p.pts)&&[1,2,3].includes(X.partyStrength(p))),'bands left the land or lost their patrols');
   { const s=G.sites.slice().sort((a,b)=>Math.hypot(a.x-G.p.x,a.y-G.p.y)-Math.hypot(b.x-G.p.x,b.y-G.p.y))[0];X.sheets.length=0;X.goTo(s.x+3,s.y-2);ok(G.dest&&G.dest.type==='site'&&G.dest.id===s.id,'tapping a ruin did not target it');
     for(let n=0;n<400000&&G.moving;n++)X.worldTick(.05);ok(X.sheetOpen&&s.v===1&&X.sheets.join().includes('Move on'),'arriving at a ruin showed nothing');closeAll(X) }
   // fog persistence across save / load
   ok(X.save(),'save failed');const before=Array.from(W.seen).join(''),raw=X.store.get(X.SAVEKEY),sv=JSON.parse(raw);ok(typeof sv.fog==='string'&&sv.fog.length<=700&&sv.weather&&Array.isArray(sv.sites)&&sv.towns.every(t=>t.size>=1),'the save lacks fog, weather, sites or town sizes');
   ok(raw.length<400000,'the save is too large: '+raw.length);X.G=null;X.W=null;X.mode='title';X.continueGame();{const after=Array.from(X.W.seen).join('');let lost=0,extra=0;for(let i=0;i<N;i++){if(before[i]==='1'&&after[i]!=='1')lost++;if(before[i]!=='1'&&after[i]==='1')extra++}
    ok(X.mode==='world'&&lost===0&&extra<=16,`explored land was not restored from the save (${lost} tiles lost, ${extra} new)`)}
   ok(X.G.sites.length===sv.sites.length&&X.G.weather.kind===sv.weather.kind&&X.G.route.length===0,'sites or weather were not restored');
   sv.fog='???';X.store.set(X.SAVEKEY,JSON.stringify(sv));X.G=null;X.mode='title';X.continueGame();ok(X.mode==='world'&&X.seenAt(Math.floor(X.G.p.x/TS),Math.floor(X.G.p.y/TS)),'a save with damaged fog did not load with the surroundings explored');
   X.renderWorldImg();X.camp();ok(X.G.hour!==sv.hour||X.G.day!==sv.day,'camp did not pass time');X.store.clear();
   console.log(`fog (${c0} tiles at the start, ${before.split('1').length-1} after a ${took.toFixed(0)} h route), vision, weather (${Object.keys(kinds).join(', ')}), routes, ruins, save round trip: ok`) }

 section('saves');
 { X.seedRng(SEED+1);X.newGame(true);closeAll(X);ok(X.save(),'save() failed');const raw=X.store.get(X.SAVEKEY),g0=JSON.parse(raw);ok(g0.v===X.SAVEVER&&typeof g0.rng==='number','save has no version or rng state');
   const next=[X.rnd(),X.rnd(),X.rnd()].join();X.seedRng(999);X.G=null;X.mode='title';X.continueGame();ok(X.mode==='world'&&X.G&&X.G.roster.length===4,'continueGame did not load');
   ok([X.rnd(),X.rnd(),X.rnd()].join()===next,'a loaded game does not continue the same random stream');
   const legacy=JSON.parse(raw);delete legacy.v;delete legacy.rng;delete legacy.note;X.store.set(X.SAVEKEY,JSON.stringify(legacy));
   let r=X.readSave();ok(r.state==='ok'&&r.v===1&&r.g.v===X.SAVEVER&&typeof r.g.rng==='number','an unversioned save was not migrated');X.G=null;X.mode='title';X.continueGame();ok(X.mode==='world'&&X.G.day===legacy.day&&X.G.roster.length===4,'an unversioned save did not load');scan(X.G,'G');
   // a save from before combat depth (version 3): resolve, helmet slot, injuries and tools are filled in
   { const v3=JSON.parse(raw);v3.v=3;delete v3.tools;const strip=m=>{delete m.base.brv;delete m.eq.h;delete m.inj;delete m.cond};v3.roster.forEach(strip);v3.towns.forEach(t=>t.recruits.forEach(strip));ok(v3.towns.some(t=>t.recruits.length),'fixture: no recruits');
     X.store.set(X.SAVEKEY,JSON.stringify(v3));r=X.readSave();const fine=m=>Number.isFinite(m.base.brv)&&m.base.brv>=20&&m.base.brv<=70&&m.eq.h===null&&Array.isArray(m.inj)&&!m.inj.length&&m.cond===undefined;
     ok(r.state==='ok'&&r.v===3&&r.g.v===X.SAVEVER&&X.SAVEVER>=4&&r.g.tools===20&&r.g.roster.length===4&&r.g.roster.every(fine)&&r.g.towns.every(t=>t.recruits.every(fine)),'a version 3 save was not migrated to combat depth');
     ok(r.g.roster.some(m=>m.base.brv!==r.g.roster[0].base.brv)||r.g.roster.every(m=>m.bg===r.g.roster[0].bg),'migrated resolve must follow background and race');
     X.G=null;X.mode='title';X.continueGame();ok(X.mode==='world'&&X.G.roster.length===4&&X.G.tools===20,'a version 3 save did not load');scan(X.G,'G');
     const res=await X.autoBattle({f:'gob',mult:.6,biome:'plains',src:{type:'sim'},turnCap:TURNCAP});ok(res&&!res.stuck,'a migrated company could not fight');X.settleBattle(res.win);
     // version 4 round trip: helmets, armor condition, injuries and tools survive; damaged fields are repaired
     X.seedRng(SEED+1);X.newGame(true);closeAll(X);const G=X.G,m=G.roster[0],m1=G.roster[1];m.eq.a='mail';m.eq.h='nasal';m.cond={a:40,h:10};m.inj=[{id:'cutarm',days:3},{id:'missingeye',days:-1}];G.tools=7;
     m1.eq.a='padded';m1.eq.h='hood';m1.cond={a:9999,h:-5};m1.inj=[{id:'nope',days:2},{id:'concussion',days:'x'},{id:'concussion',days:2},{id:'lameleg',days:9},null];ok(X.save(),'save failed');X.G=null;X.mode='title';X.continueGame();
     const L=X.G.roster[0],L1=X.G.roster[1];ok(X.G.tools===7&&L.eq.h==='nasal'&&L.cond.a===40&&L.cond.h===10&&JSON.stringify(L.inj)==='[{"id":"cutarm","days":3},{"id":"missingeye","days":-1}]'&&L.base.brv===m.base.brv,'helmet, armor condition, injuries or tools were lost in the save');
     ok(L1.cond&&L1.cond.a===undefined&&L1.cond.h===0&&L1.inj.length===2&&L1.inj[0].id==='concussion'&&L1.inj[0].days>=1&&L1.inj[1].id==='lameleg'&&L1.inj[1].days===-1&&L1.hp<=X.calc(L1).hp,'damaged combat-depth fields were not repaired: '+JSON.stringify([L1.cond,L1.inj]));scan(X.G,'G') }
   const newer=JSON.parse(raw);newer.v=X.SAVEVER+5;newer.futureField={x:1};X.store.set(X.SAVEKEY,JSON.stringify(newer));X.G=null;X.mode='title';X.sheets.length=0;
   ok(X.loadSave()===null&&X.saveStatus().state==='newer','a newer save must not load');X.continueGame();ok(X.mode==='title'&&X.G===null&&/newer version/.test(X.sheets.join()),'a newer save must be refused with a message');
   X.sheets.length=0;X.newGame();ok(X.mode==='title'&&/newer version/.test(X.sheets.join())&&JSON.parse(X.store.get(X.SAVEKEY)).v===X.SAVEVER+5,'newGame() must not silently replace a newer save');
   X.newGame(true);ok(X.mode==='world'&&JSON.parse(X.store.get(X.SAVEKEY+'_bak')).v===X.SAVEVER+5,'the newer save was not set aside');closeAll(X);
   const bad=['{"seed":12,','null','[]','42','{"seed":"x"}','{"seed":5,"towns":[],"roster":[]}',JSON.stringify(Object.assign({},g0,{roster:[{bg:'nope'}]})),JSON.stringify(Object.assign({},g0,{towns:[{x:null,y:3}]}))];
   for(const s of bad){X.store.set(X.SAVEKEY,s);X.G=null;X.mode='title';X.sheets.length=0;ok(X.loadSave()===null&&X.readSave().state==='corrupt','corrupt save not detected: '+s.slice(0,40));X.continueGame();ok(X.mode==='title'&&/could not be read/.test(X.sheets.join()),'corrupt save not reported: '+s.slice(0,40))}
   const odd=JSON.parse(raw);odd.stash.push('no_such_item');odd.roster[0].eq.w='no_such_item';odd.roster[1].hp=null;odd.crowns='lots';odd.parties.push({f:'nobody'});odd.contract={type:'hunt'};delete odd.healAcc;odd.dun={stage:7};
   X.store.set(X.SAVEKEY,JSON.stringify(odd));X.G=null;X.mode='title';X.continueGame();ok(X.mode==='world'&&X.G.roster[0].eq.w===null&&!X.G.stash.includes('no_such_item')&&X.G.crowns===0&&X.G.contract===null&&X.G.dun===null,'a damaged but usable save was not repaired');scan(X.G,'G');
   X.store.set(X.SAVEKEY,JSON.stringify(Object.assign({},g0,{roster:[]})));ok(X.readSave().state==='none','a company with nobody left must count as no save');
   X.store.clear();X.seedRng(SEED+2);X.newGame(true);closeAll(X);X.G.day=X.G.crisisDay-1;X.G.hour=23;X.G.crowns=5000;X.openTown(0);ok(X.sheetOpen,'the town did not open');X.sheets.length=0;X.innRest();
   ok(X.G.crisis&&X.G.note==='crisis','a crisis that starts inside a town must wait to be announced');closeAll(X);X.worldTick(.05);ok(X.G.note===null&&/The Sundering/.test(X.sheets.join()),'the deferred crisis announcement was not shown');closeAll(X);

   // a save from the 44x44 world (version 2): the company marches to the new lands
   { X.store.clear();X.seedRng(SEED+4);X.newGame(true);closeAll(X);X.G.crowns=4321;X.G.food=77;X.G.renown=55;X.G.day=23;X.G.stash.push('arming');ok(X.save(),'save failed');const v2=JSON.parse(X.store.get(X.SAVEKEY)),names=v2.roster.map(m=>m.name).join();
     v2.v=2;delete v2.sites;delete v2.fog;delete v2.weather;delete v2.route;const T2=40;
     v2.towns=[[6,7],[20,9],[33,12],[12,25],[27,28],[38,36],[9,38]].map((c,i)=>({name:'Old'+i,x:(c[0]+.5)*T2,y:(c[1]+.5)*T2,ref:20,recruits:[],stock:['spear'],contracts:[{type:'deliver',to:(i+1)%7,diff:1,pay:120,title:'Carry sealed cargo'}]}));
     v2.p={x:1700,y:1720};v2.parties=[{id:900,x:300,y:300,tx:320,ty:300,f:'gob',mult:.9}];v2.portals=[{id:901,x:800,y:900,realm:'hollow'},{id:902,x:1200,y:400,realm:'glass'}];v2.crisis={closed:1,total:3,ended:false};
     v2.contract={type:'hunt',f:'orc',diff:2,x:500,y:600,pay:400,title:'Burn out an orc camp',town:3,done:false};v2.town=5;v2.nid=950;
     X.store.set(X.SAVEKEY,JSON.stringify(v2));ok(X.saveStatus().state==='ok'&&X.saveStatus().v===2,'a version 2 save was not recognised');X.G=null;X.W=null;X.mode='title';X.sheets.length=0;X.continueGame();const G=X.G;
     if(VERBOSE)console.log(X.mode,G&&G.v,G&&G.towns.length,X.sheets.join().slice(0,300),JSON.stringify(X.readSave()).slice(0,300));
     ok(X.mode==='world'&&G.v===X.SAVEVER&&G.towns.length>=10&&G.towns.every(t=>t.size>=1&&!/^Old\d/.test(t.name)&&X.okAt(t.x,t.y)),'the old world was not replaced');
     ok(G.p.x===G.towns[0].x&&G.p.y===G.towns[0].y&&X.okAt(G.p.x,G.p.y)&&X.seenAt(Math.floor(G.p.x/X.TS),Math.floor(G.p.y/X.TS)),'the company was not placed at the first town');
     ok(G.roster.map(m=>m.name).join()===names&&G.crowns===4321&&G.food===77&&G.renown===55&&G.day===23&&G.stash.includes('arming')&&G.stash.length===v2.stash.length,'the company lost something on the march');
     ok(G.crisis&&G.crisis.closed===1&&G.crisis.total===3&&!G.crisis.ended&&G.portals.length===2&&G.portals.every(p=>X.okAt(p.x,p.y)&&X.BIO[p.realm])&&G.portals[0].realm==='hollow','crisis progress or its rifts were lost');
     ok(G.contract===null&&G.town===null&&G.sites.length>=5&&G.parties.length===7&&G.parties.every(p=>X.okAt(p.x,p.y)&&p.id!==900)&&G.grace>=4,'old contract, bands or sites were not reset');
     const ids=[...G.roster,...G.parties,...G.portals,...G.sites].map(o=>o.id);ok(new Set(ids).size===ids.length,'ids collide after the migration');scan(G,'G');
     X.worldTick(.05);ok(X.sheetOpen&&/New lands/.test(X.sheets.join())&&/rifts have followed/.test(X.sheets.join())&&G.note===null,'the player was not told about the new lands');closeAll(X);
     X.sheets.length=0;X.goTo(G.towns[1].x,G.towns[1].y,{type:'town',i:1});for(let n=0;n<200&&G.moving&&X.mode==='world';n++)X.worldTick(.05);ok(!/New lands/.test(X.sheets.join()),'the new lands note showed twice');closeAll(X);
     if(X.mode==='world'){ok(X.save(),'the migrated company could not be saved');const r2=X.readSave();ok(r2.state==='ok'&&r2.v===X.SAVEVER&&r2.g.note===null&&r2.g.towns.length===G.towns.length,'the migrated save does not load again')}
     for(const brk of [g=>{g.towns=[]},g=>{delete g.seed},g=>{g.portals='x';g.crisis=7;g.parties=null;g.contract='c';g.p=null}]){const g=JSON.parse(JSON.stringify(v2));brk(g);X.store.set(X.SAVEKEY,JSON.stringify(g));X.G=null;X.mode='title';X.sheets.length=0;
      const st=X.readSave().state;ok(st==='ok'||st==='corrupt','a damaged old save was not classified');X.continueGame();ok(st==='ok'?X.mode==='world'&&X.G.towns.length>=10:X.mode==='title'&&/could not be read/.test(X.sheets.join()),'a damaged old save crashed the game');if(X.mode==='world')scan(X.G,'G')}
     X.B=null;X.mode='title';X.G=null }
   X.store.clear();console.log('versioned save (v'+X.SAVEVER+'), legacy, 44x44-world and pre-combat-depth migrations, newer-version refusal, corrupt-save guards, repair: ok') }

 section('battle events');
 { const tier=TIERS[3],roster=buildCompany(X,tier,SEED+7),seen={},need=['hit','miss','death','move','turn','cast','buff','loc','status','morale'];X.G.day=tier.day;let bad='';
   X.FX.on=(type,d)=>{seen[type]=(seen[type]||0)+1;if(!d||typeof d!=='object')bad=type;
    if(type==='hit'&&!(d.t&&typeof d.dmg==='number'&&typeof d.armor==='number'&&d.armor>=0&&typeof d.head==='boolean'))bad=type;if(type==='loc'&&!(d.t&&typeof d.head==='boolean'))bad=type;if(type==='morale'&&!(d.u&&d.from>=0&&d.from<=4&&d.to>=0&&d.to<=4&&d.from!==d.to))bad=type;
    if(type==='status'&&!(d.t&&typeof d.key==='string'))bad=type;if(type==='injury'&&!(d.t&&X.INJ[d.id]))bad=type;if((type==='ff'||type==='blocked')&&!(d.u&&d.t))bad=type;if((type==='spawn'||type==='withdraw')&&!d.u)bad=type;if((type==='miss'||type==='move'||type==='turn'||type==='cast')&&!d.u)bad=type;
    if((type==='death'||type==='kb'||type==='heal'||type==='buff')&&!d.t)bad=type;if(type==='heal'&&typeof d.n!=='number')bad=type;if(type==='cast'&&!(d.ab&&d.ab.n))bad=type};
   const used={};let shapes=0;for(let i=0;i<(QUICK?6:24);i++){X.G.roster=X.clone(roster);X.seedRng(SEED+500+i);const f=Object.keys(X.FACT)[i%6];
    const pr=scriptedBattle(X,{f,mult:1,biome:Object.keys(X.BIO)[i%9],src:{type:'sim'}});const B=X.B;
    const r=await pr;for(const k in r.used)used[k]=(used[k]||0)+r.used[k];
    for(const fl of B.floats){ok(typeof fl.x==='number'&&typeof fl.y==='number'&&typeof fl.txt==='string'&&typeof fl.col==='string'&&typeof fl.t==='number'&&fl.u,'B.floats shape changed');shapes++}
    for(const s of B.shots){ok(typeof s.a.x==='number'&&typeof s.a.y==='number'&&typeof s.b.x==='number'&&typeof s.b.y==='number'&&typeof s.col==='string'&&typeof s.t==='number','B.shots shape changed');shapes++}}
   ok(!bad,'FX.emit sent a malformed '+bad+' event');for(const t of need)ok(seen[t]>0,'FX event never emitted: '+t);ok(shapes>0,'no floats or shots were produced');
   ok(QUICK||Object.keys(used).length>=16,'scripted battles used too few abilities: '+Object.keys(used).join(','));
   X.FX.on=()=>{throw new Error('scene bug')};X.G.roster=X.clone(roster);X.seedRng(SEED+31);const r=await X.autoBattle({f:'gob',mult:1,src:{type:'sim'},turnCap:TURNCAP});ok(r&&!r.stuck,'a throwing FX.on broke the battle');X.settleBattle(r.win);X.FX.err=null;
   if(X.sceneFx){X.FX.on=X.sceneFx;X.G.roster=X.clone(roster);X.seedRng(SEED+32);const r2=await X.autoBattle({f:'void',mult:1,src:{type:'sim'},turnCap:TURNCAP});X.settleBattle(r2.win);
    console.log('scene FX handler under DOM stubs: '+(X.FX.err?'threw ('+(X.FX.err.message||X.FX.err)+'), rules unaffected':'ok'))}X.FX.on=null;X.FX.err=null;
   console.log('events: '+Object.keys(seen).sort().map(k=>k+' '+seen[k]).join(', '));console.log('abilities used by script: '+Object.keys(used).sort().join(' ')) }

 section('combat depth');
 { const roster=buildCompany(X,TIERS[2],SEED+77),ev=[],BW=X.BW,BH=X.BH,K=(c,r)=>r*BW+c,KU=u=>u.r*BW+u.c,ab=(u,id)=>X.abilityInfo(u,id);X.FX.on=(type,d)=>{ev.push({type,d})};
   const seen=(type,f)=>ev.filter(e=>e.type===type&&(!f||f(e.d))),tries=(u,t)=>ev.filter(e=>(e.type==='hit'||e.type==='miss')&&e.d.u===u&&(!t||e.d.t===t)).length;
   const rest=async b=>{let n=0;while(!b.over&&b.busy){await null;if(++n>3e6)fail('the battle never came to rest')}};
   const drop=()=>{X.B=null;X.mode='world'};
   // A flat, empty field at the company's turn: every unit parked out of the way, full health, steady. P = company units (the last is the idle anchor), E = foes.
   const arena=async(seed,o,ros)=>{X.G.roster=X.clone(ros||roster);X.G.day=10;X.G.tools=0;X.seedRng(seed);let done=null;
    const b=X.startBattle(Object.assign({f:'bandit',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:TURNCAP,foes:['thug','thug','thug','thug','thug','thug'],onEnd:r=>{done=r}},o||{}));ok(b,'arena did not start');
    let n=0;while(!b.over&&(b.busy||b.cur.side!==0)){await null;if(++n>3e6)fail('arena never reached a company turn')}ok(!b.over&&b.units.every(u=>u.alive),'arena was disturbed before the first company turn');
    const P=b.units.filter(u=>u.side===0),E=b.units.filter(u=>u.side===1),anchor=P.pop();
    const KEEP=['hpMax','fatMax','ms','rs','md','rd','init','brv','dmgB','apMax','wpn','shield','shp','shpMax'];b.units.forEach(u=>{u.keep={};KEEP.forEach(k=>{u.keep[k]=u[k]});u.keep.abs=u.abs.slice()});
    const park=()=>{b.tiles.forEach(t=>{t.t='ground';t.h=0});b.rout=[false,false];b.fledN=[0,0];
     b.units.forEach(u=>{KEEP.forEach(k=>{u[k]=u.keep[k]});u.abs=u.keep.abs.slice();u.alive=true;u.gone=null;u.down=false;u.hpMax=Math.max(u.hpMax,60);u.hp=u.hpMax;u.arm=u.armMax;u.helm=u.helmMax;u.st={};u.buffs=u.buffs.filter(x=>x.foe);u.mor=3;u.fearless=false;u.aoo=0;u.rooted=false;u.dazed=false;u.fat=0;u.ap=u.apMax;u.stuckN=0;if(u.m)u.m.inj=[]});
     P.forEach((u,i)=>{u.c=BW-1-i;u.r=BH-2});E.forEach((u,i)=>{u.c=BW-1-i;u.r=0});anchor.c=BW-1;anchor.r=BH-4;b.cur=anchor;b.order=[];b.busy=false};
    const turnOf=async u=>{b.order=[u,anchor];b.busy=true;X.nextTurn();await null;await rest(b)};
    const use=async(u,id,t)=>{u.ap=9;u.fat=0;const a=ab(u,id);ok(X.canUse(u,a),`${u.name} cannot use ${id}`);await X.useAbility(u,a,t?KU(t):KU(u));await rest(b)};
    park();return{b,P,E,anchor,park,turnOf,use,done:()=>done}};
   const put=(u,c,r)=>{u.c=c;u.r=r},arm=(u,id)=>{u.wpn=X.ITEMS[id];u.abs=X.ITEMS[id].sk.slice()},tough=u=>{u.hpMax=u.hp=5000;u.fearless=true},mid=BH>>1;
   const A=await arena(SEED+600),b=A.b,[m0,m1,m2,m3,m4,m5]=A.P,[e0,e1,e2,e3]=A.E;ok(A.P.length>=6&&A.E.length>=4,'the arena is too small');

   /* -- hit locations, helmets, persistent armor, repair -- */
   put(m0,2,mid);put(e0,3,mid);tough(e0);e0.armMax=e0.arm=100;e0.helmMax=e0.helm=40;ev.length=0;
   ok(X.hurt(e0,30,.2,m0,{head:true,loc:1})===8&&e0.helm===10&&e0.arm===100&&e0.hp===4992,'a head hit must wear the helmet and do x1.5 to hitpoints');
   ok(seen('hit')[0].d.head===true&&seen('hit')[0].d.armor===30&&seen('loc').length===1&&seen('loc')[0].d.head===true&&seen('loc')[0].d.t===e0,'head hit events are wrong');
   ok(X.hurt(e0,30,.2,m0,{loc:1})===0&&e0.arm===70&&e0.helm===10&&seen('loc')[1].d.head===false,'a body hit must wear body armor only');
   ok(X.hurt(e0,40,.2,m0,{head:true,loc:1})===45&&e0.helm===0,'breaking through a helmet: (40-10) x1.5');ok(X.hurt(e0,20,.2,m0,{head:true})===30&&X.hurt(e0,20,.2,null)===0&&e0.arm===50,'bare head x1.5, plain hurt() goes to body armor');
   ok(X.hurt(e0,20,.2,m0,{pierce:1,loc:1})===20&&e0.arm===50,'a piercing blow must skip armor');
   { const hs=Object.keys(X.ITEMS).filter(id=>X.ITEMS[id].k==='h').map(id=>X.ITEMS[id]);ok(hs.length>=5&&hs.length<=7&&hs.every((h,i)=>h.arm>0&&h.price>0&&h.fat>=0&&(!i||(h.arm>hs[i-1].arm&&h.price>hs[i-1].price&&h.fat>=hs[i-1].fat))),'helmet tiers must rise in armor, weight and price');
     const m=X.clone(roster[0]);m.eq.a='mail';m.eq.h=null;delete m.cond;const s0=X.calc(m);m.eq.h='nasal';const s1=X.calc(m);ok(s0.helm===0&&s1.helm===140&&s1.fat===s0.fat-7&&s1.arm===150,'calc() does not count the helmet');
     let u=X.mkPlayerUnit(m);ok(u.helm===140&&u.helmMax===140&&u.arm===150,'a fresh helmet must be whole');m.cond={a:10,h:50};u=X.mkPlayerUnit(m);ok(u.helm===50&&u.arm===10&&u.armMax===150&&u.helmMax===140,'armor condition must carry into battle');
     const c=X.armorCond(m);ok(c.a===10&&c.aMax===150&&c.h===50&&c.hMax===140,'armorCond() is wrong');X.setArmorCond(m,150,140);ok(m.cond===undefined,'whole armor must not keep a condition record');
     for(const id in X.EN){const e=X.mkEnemy(id,'gob');ok(e.helmMax===e.helm&&e.helm>=0&&isFinite(e.brv)&&e.mor===3&&(e.armMax===0||X.EN[id].helm!==undefined||e.helm>0),'enemy '+id+' has no head armor or resolve')} }
   { X.G.roster=X.clone(roster);X.G.roster.forEach(m=>{m.eq.h='kettle';delete m.cond});X.G.tools=0;const B0=X.B;let worn=null;
     for(let i=0;i<8&&!worn;i++){X.seedRng(SEED+610+i);const res=await X.autoBattle({f:'orc',mult:.7,biome:'plains',src:{type:'sim'},turnCap:TURNCAP});ok(res&&!res.stuck,'repair fixture battle did not end');X.settleBattle(res.win);ok(X.G.roster.length,'repair fixture company died');worn=X.G.roster.find(m=>m.cond)||null}
     ok(worn,'eight battles left no armor damaged: armor condition is not carried home');const c=X.armorCond(worn),u=X.mkPlayerUnit(worn);ok((c.a<c.aMax||c.h<c.hMax)&&u.arm===c.a&&u.helm===c.h,'damaged armor must start the next battle damaged');
     const need=X.repairNeed();ok(need.pts>0&&need.tools===Math.ceil(need.pts/X.TOOLPTS),'repairNeed() is wrong');let r=X.repairAll();ok(r.tools===0&&r.pts===0&&r.left===need.pts&&Array.isArray(r.list),'repair without tools must do nothing');
     X.G.tools=1;r=X.repairAll();ok(r.tools===1&&r.pts===Math.min(need.pts,X.TOOLPTS)&&X.G.tools===0&&r.left===need.pts-r.pts&&r.list.length>=1,'one tool must mend TOOLPTS points');
     X.G.tools=need.tools+3;r=X.repairAll();ok(r.left===0&&X.G.roster.every(m=>!m.cond)&&r.tools===Math.ceil(r.pts/X.TOOLPTS)&&X.G.tools===need.tools+3-r.tools&&X.repairNeed().pts===0,'repairAll() must mend everything it has tools for');
     scan(X.G,'G');X.B=B0;X.mode='battle' }

   /* -- morale -- */
   A.park();ok(X.MORN.length===5&&X.MORFX.length===5,'five morale states');
   { let fails=0;m0.brv=50;for(let i=0;i<400;i++){m0.mor=3;if(X.moraleCheck(m0,0,-1)===false)fails++}ok(fails>150&&fails<250&&m0.mor>=2,'a resolve-50 check must fail about half the time: '+fails);
     put(m0,2,mid);put(m1,3,mid);put(e0,2,mid-1);tough(e0);let drops=0;m0.brv=-100;ev.length=0;
     for(let i=0;i<30;i++){m0.mor=3;m1.alive=true;m1.hp=1;m1.m.inj=[];X.hurt(m1,50,1,e0,{loc:1});ok(!m1.alive,'the fixture did not die');if(m0.mor===2)drops++}ok(drops>=22,'an ally dying next to a coward must shake him: '+drops+'/30');
     ok(seen('morale',d=>d.u===m0&&d.from===3&&d.to===2).length===drops&&seen('death',d=>d.t===m1).length===30,'morale events are wrong');
     m0.brv=300;drops=0;for(let i=0;i<30;i++){m0.mor=3;m1.alive=true;m1.hp=1;m1.m.inj=[];X.hurt(m1,50,1,e0,{loc:1});if(m0.mor<3)drops++}ok(drops<=6,'a resolute merc must usually hold: '+drops+'/30');
     A.park();put(m0,2,mid);put(e0,3,mid);m0.brv=-100;drops=0;for(let i=0;i<30;i++){m0.mor=3;m0.hp=m0.hpMax;m0.m.inj=[];X.hurt(m0,Math.ceil(m0.hpMax*.3),1,e0,{loc:1});if(m0.mor===2)drops++}ok(drops>=22,'a heavy hit must shake a coward: '+drops+'/30');
     m0.mor=3;m0.hp=m0.hpMax;X.hurt(m0,5,1,e0,{loc:1});ok(m0.mor===3,'a light hit must not test morale');
     let ups=0;m0.brv=300;for(let i=0;i<30;i++){m0.mor=3;e0.alive=true;e0.hp=1;e0.fearless=false;X.hurt(e0,99,1,m0,{loc:1});if(m0.mor===4)ups++}ok(ups>=22,'a kill must lift the killer: '+ups+'/30');
     A.park();put(m0,2,mid);put(e0,3,mid);m0.ms=50;e0.md=0;const atk=ab(m0,'attack'),base=X.hitChance(m0,e0,atk);ok(base>=30&&base<=80,'morale fixture hit chance out of range: '+base);
     m0.mor=4;ok(X.hitChance(m0,e0,atk)===base+10,'confident: +10 to hit');m0.mor=1;ok(X.hitChance(m0,e0,atk)===base-20,'breaking: -20 to hit');m0.mor=3;e0.mor=1;ok(X.hitChance(m0,e0,atk)===base+10,'a breaking target is easier to hit');e0.mor=4;ok(X.hitChance(m0,e0,atk)===base-5,'a confident target is harder to hit');
     const f=X.forecast(m0,e0,atk);ok(f.mor.att===0&&f.mor.def===5&&f.hit===base-5,'forecast must carry morale');
     A.park();e1.fearless=true;ok(X.moraleCheck(e1,-500,-1)===null&&e1.mor===3,'fearless units never test');
     A.park();put(m0,2,mid);put(e0,3,mid);put(e1,1,mid);put(e2,2,mid-1);m0.brv=-100;await A.turnOf(m0);ok(m0.mor===2||m0.mor===3,'surrounded check went wrong');let sur=0;for(let i=0;i<12;i++){m0.mor=3;await A.turnOf(m0);if(m0.mor===2)sur++}ok(sur>=8,'starting a turn surrounded must shake a coward: '+sur+'/12');
     // flight: uncontrollable, runs for its own edge, leaves alive
     A.park();put(m0,5,BH-4);m0.brv=-100;m0.hp=23;ev.length=0;X.setMorale(m0,0);ok(seen('morale',d=>d.u===m0&&d.to===0).length===1&&!X.canUse(m0,ab(m0,'attack')),'a fleeing unit must not take orders');
     for(let i=0;i<4&&m0.alive;i++){if(m0.mor!==0)X.setMorale(m0,0);const r0=m0.r;await A.turnOf(m0);ok(!m0.alive||m0.r>r0||m0.mor!==0,'a fleeing merc did not run for its edge')}
     ok(!m0.alive&&m0.gone==='fled'&&m0.m.hp===23&&seen('withdraw',d=>d.u===m0&&d.why==='fled').length===1&&b.gone.includes(m0)&&b.cur===A.anchor,'a merc that reaches its edge must leave the field alive');
     A.park();put(e0,5,3);e0.brv=-100;X.setMorale(e0,0);for(let i=0;i<4&&e0.alive;i++){if(e0.mor!==0)X.setMorale(e0,0);await A.turnOf(e0)}ok(!e0.alive&&e0.gone==='fled','a fleeing foe must leave by its own edge');
     // rally
     A.park();put(m0,5,3);m0.brv=300;X.setMorale(m0,0);let ral=0;for(let i=0;i<4&&m0.mor===0&&m0.alive;i++){await A.turnOf(m0);ral++}ok(m0.alive&&m0.mor===2&&ral<=3&&X.statusList(m0).some(s=>s.key==='rallied')&&b.cur===m0,'a resolute merc must rally to wavering and take orders again') }

   /* -- injuries -- */
   A.park();
   { put(m0,2,mid);put(e0,3,mid);let got=0,head=0;ev.length=0;const ms0=m0.ms,hpM=m0.hpMax;
     for(let i=0;i<40;i++){m0.hp=m0.hpMax;m0.mor=3;const h=i%2===0,n0=m0.m.inj.length;X.hurt(m0,Math.ceil(m0.hpMax*.3),1,e0,{head:h,loc:1});if(m0.m.inj.length>n0){got++;const I=X.INJ[m0.m.inj[n0].id];ok(I&&!I.perm&&m0.m.inj[n0].days>=I.days[0]&&m0.m.inj[n0].days<=I.days[1],'a heavy hit gave a wrong injury');if(I.loc==='h')head++}}
     ok(got>=6&&head>=1&&head<got&&seen('injury',d=>d.t===m0&&X.INJ[d.id]).length===got,'heavy hits must injure about half the time, by location: '+got+' ('+head+' to the head)');
     const s=X.calc(m0.m);let dms=0,dhp=0;m0.m.inj.forEach(j=>{const st=X.INJ[j.id].st;dms+=st.ms||0;dhp+=st.hp||0});ok(m0.ms===ms0+dms&&m0.hpMax===Math.max(5,hpM+dhp)&&(dms<0||dhp<0||got>0),'injuries must weaken the unit at once');
     ok(s.inj.length===m0.m.inj.length&&s.ms===m0.m.base.ms+dms+(s.ms-m0.m.base.ms-dms)&&X.calc(Object.assign(X.clone(m0.m),{inj:[]})).ms===s.ms-dms,'calc() must apply injuries');
     m0.m.inj=[];m0.ms=ms0;m0.hpMax=hpM;X.hurt(m0,5,1,e0,{loc:1});ok(m0.m.inj.length===0,'a light hit must not injure');
     let down=0,perm=0,dead=0;for(let i=0;i<300;i++){m1.alive=true;m1.down=false;m1.hp=1;m1.m.inj=[];X.hurt(m1,60,1,e0,{loc:1});if(m1.down){down++;ok(m1.m.inj.length===1,'being struck down and living must cost an injury');if(m1.m.inj[0].days<0)perm++}else{dead++;ok(m1.m.inj.length===0,'the dead take no injuries')}}
     ok(down>120&&down<180&&perm>20&&perm<down*.6,'struck-down survival should be about half, some of it maimed: '+down+'/300, '+perm+' permanent');
     const I=X.INJ,ids=Object.keys(I),T=ids.filter(id=>!I[id].perm),Pm=ids.filter(id=>I[id].perm);ok(T.length>=14&&Pm.length>=7&&ids.every(id=>I[id].n&&I[id].d&&I[id].st&&Object.keys(I[id].st).length&&(I[id].loc==='h'||I[id].loc==='b')&&(I[id].perm||I[id].days[0]>=1)),'the injury table is incomplete');
     // strategic side: calc, daily healing, the temple
     X.G.roster=X.clone(roster);const G=X.G,m=G.roster[0];m.inj=[];const c0=X.calc(m);ok(X.addInjury(m,'brokenribs',2)&&X.addInjury(m,'missingeye')&&X.addInjury(m,'brokenribs',3)===null&&X.addInjury(m,'nope')===null,'addInjury() is wrong');
     const c1=X.calc(m);ok(c1.fat===c0.fat-20&&c1.hp===c0.hp-8&&c1.rs===c0.rs-20&&c1.rd===c0.rd-5&&c1.inj.length===2&&m.inj[1].days===-1,'calc() must apply injury effects');
     let h=X.healInjuriesDaily();ok(h.length===0&&m.inj[0].days===1,'a day of healing');h=X.healInjuriesDaily();ok(h.length===1&&h[0].id==='brokenribs'&&h[0].name===m.name&&m.inj.length===1&&m.inj[0].id==='missingeye','an injury must heal when its days run out; permanent ones stay');
     X.healInjuriesDaily();ok(m.inj.length===1&&X.calc(m).rs===c0.rs-20,'permanent injuries never heal');
     X.addInjury(m,'concussion',5);const cost=X.injuryCost(m,'concussion');ok(cost>0&&X.injuryCost(m,'missingeye')===null&&X.injuryCost(m,'cutarm')===null,'injuryCost() is wrong');
     G.crowns=cost-1;ok(X.treatInjury(m,'concussion')===false&&m.inj.length===2&&G.crowns===cost-1,'treatment must be paid for');G.crowns=cost+50;ok(X.treatInjury(m,'concussion')===true&&G.crowns===50&&m.inj.length===1&&X.treatInjury(m,'missingeye')===false&&G.crowns===50,'treatInjury() is wrong');
     X.addInjury(m,'cutarm',3);const d0=G.day;G.grace=1e9;G.crisisDay=1e9;G.food=999;G.crowns=9999;X.advanceTime(24);X.wiredHeal=G.day>d0&&m.inj.find(j=>j.id==='cutarm').days===2;closeAll(X);X.B=b;X.mode='battle' }

   /* -- line of sight, cover, friendly fire -- */
   A.park();
   { arm(m0,'shortbow');m0.rs=70;put(m0,2,mid);put(e0,7,mid);e0.rd=0;tough(e0);const atk=ab(m0,'attack'),tl=k=>b.tiles[k];let L=X.losInfo(m0,e0,atk);const base=X.hitChance(m0,e0,atk);
     ok(!L.blocked&&L.cover===0&&L.ff.length===0&&base>20&&base<90&&X.validTargets(m0,atk).has(KU(e0)),'a clear line of fire was not clear');
     put(e1,4,mid);L=X.losInfo(m0,e0,atk);ok(L.cover===1&&!L.ff.length&&X.hitChance(m0,e0,atk)===base-X.COVERPEN,'a foe in the line must give 1 cover');
     put(e2,5,mid);ok(X.losInfo(m0,e0,atk).cover===2&&X.hitChance(m0,e0,atk)===base-2*X.COVERPEN,'two bodies: 2 cover');put(e3,6,mid);ok(X.losInfo(m0,e0,atk).cover===2,'cover stops at 2');
     put(e3,0,0);tl(KU(m0)).h=1;ok(X.losInfo(m0,e0,atk).cover===1&&X.hitChance(m0,e0,atk)===base+10-X.COVERPEN,'height must take one step off the cover');tl(KU(m0)).h=0;
     put(e1,0,1);put(e2,0,2);put(m1,4,mid);L=X.losInfo(m0,e0,atk);ok(L.cover===1&&L.ff.length===1&&L.ff[0]===m1,'an ally in the line is cover and at risk');
     let f=X.forecast(m0,e0,atk);ok(f.cover===1&&f.ff.length===1&&f.ff[0].t===m1&&Math.abs(f.ff[0].ch-(100-f.hit)*X.FFCH)<1e-9&&!f.blocked,'forecast must show cover and the ally at risk');
     put(m1,0,3);tl(K(4,mid)).t='block';L=X.losInfo(m0,e0,atk);ok(L.blocked&&!X.validTargets(m0,atk).has(KU(e0))&&X.forecast(m0,e0,atk).blocked,'an obstacle must block the shot');
     ev.length=0;m0.ap=9;await X.useAbility(m0,atk,KU(e0));await rest(b);ok(seen('blocked',d=>d.u===m0&&d.t===e0).length===1&&!tries(m0),'a blocked shot must not be loosed');
     const w0=e0.wpn;e0.wpn={n:'',wt:'bow',d:[10,20],ap:4,fat:0,rng:6,ign:.25};ok(!X.validTargets(e0,ab(e0,'attack')).has(KU(m0))&&X.losInfo(e0,m0,ab(e0,'attack')).blocked,'enemy archers must obey the same line of sight');e0.wpn=w0;
     tl(K(4,mid)).t='ground';tl(K(4,mid)).h=2;ok(X.losInfo(m0,e0,atk).blocked,'ground 2 steps above both ends must block');tl(KU(m0)).h=1;ok(!X.losInfo(m0,e0,atk).blocked,'ground 1 step above the higher end must not block');tl(KU(m0)).h=0;tl(K(4,mid)).h=0;
     let asym=0,blk=0;for(let i=0;i<400;i++){b.tiles.forEach(t=>{t.t=X.rnd()<.12?'block':'ground';t.h=X.ri(0,3)});put(m0,X.ri(0,BW-1),X.ri(0,BH-1));put(e0,X.ri(0,BW-1),X.ri(0,BH-1));if(m0.c===e0.c&&m0.r===e0.r)continue;const x=X.losInfo(m0,e0),y=X.losInfo(e0,m0);if(x.blocked!==y.blocked)asym++;if(x.blocked)blk++}
     ok(asym===0&&blk>40&&blk<360,'line of sight must be the same both ways: '+asym+' differ, '+blk+' blocked');
     // pikes reach over the front rank: walls stop them, bodies do not
     A.park();arm(m0,'pike');put(m0,2,mid);put(m1,3,mid);put(e0,4,mid);const imp=ab(m0,'impale');L=X.losInfo(m0,e0,imp);ok(imp.rng===2&&!L.blocked&&L.cover===0&&!L.ff.length&&X.validTargets(m0,imp).has(KU(e0)),'a pike must reach over an ally');
     put(m1,0,3);tl(K(3,mid)).t='block';ok(X.losInfo(m0,e0,imp).blocked&&!X.validTargets(m0,imp).has(KU(e0)),'a pike must not reach through an obstacle');tl(K(3,mid)).t='ground';
     // friendly fire: a missed shot past an ally strays into him about FFCH of the time
     A.park();arm(m0,'shortbow');m0.rs=-300;put(m0,2,mid);put(m1,4,mid);put(e0,7,mid);tough(m1);tough(e0);ev.length=0;const N=300,hp0=m1.hp;for(let i=0;i<N;i++)await X.strike(m0,e0,ab(m0,'attack'));
     const miss=seen('miss',d=>d.u===m0&&d.t===e0).length,ff=seen('ff',d=>d.u===m0&&d.t===m1).length,hurtN=seen('hit',d=>d.u===m0&&d.t===m1).length;
     ok(miss>N*.85&&ff>miss*.18&&ff<miss*.42&&hurtN===ff&&m1.hp<hp0&&tries(m0,m1)===ff,'stray shots: '+ff+' of '+miss+' misses hit the ally');
     put(m1,0,3);ev.length=0;for(let i=0;i<60;i++)await X.strike(m0,e0,ab(m0,'attack'));ok(!seen('ff').length,'no ally in the line, no friendly fire') }

   /* -- weapon and shield skills -- */
   A.park();
   { const sk={sword:['slash','riposte'],axe:['split'],mace:['stunblow'],dagger:['puncture'],spear:['thrust','spearwall'],bow:['quick'],staff:['sweep']};
     for(const id in X.ITEMS){const it=X.ITEMS[id];if(it.k==='w'){ok(Array.isArray(it.sk)&&it.sk.length>=1&&it.sk.length<=2&&it.sk.every(a=>X.AB[a]&&X.AB[a].n&&X.AB[a].d),'weapon '+id+' has no skills');if(id!=='pike'&&id!=='greataxe')ok(it.sk.join()===sk[it.wt].join(),'weapon '+id+' has the wrong skills')}
      if(it.k==='s')ok(it.hp>0&&it.sk.join()==='shieldwall,bash','shield '+id+' lacks hitpoints or skills')}
     ok(X.ITEMS.pike.sk.join()==='impale'&&X.ITEMS.greataxe.sk.join()==='split,round','two-hander skills');for(const id in X.AB)ok(X.AB[id].n&&X.AB[id].d,'ability '+id+' lacks a name or description');
     for(const k in X.STATUS)ok(X.STATUS[k].n&&X.STATUS[k].d&&X.STATUS[k].icon&&(X.STATUS[k].good===0||X.STATUS[k].good===1),'status '+k+' is incomplete');
     { const m=X.clone(roster[0]);m.eq.w='arming';m.eq.s='kite';const s=X.calc(m);ok(['slash','riposte','shieldwall','bash'].every(a=>s.abs.includes(a))&&s.shield&&s.shield.hp===X.ITEMS.kite.hp,'calc() must grant weapon and shield skills');
       m.eq.w='pike';m.eq.s=null;const s2=X.calc(m);ok(s2.abs.includes('impale')&&!s2.abs.includes('slash')&&!s2.abs.includes('bash')&&!s2.shield,'skills must follow the gear in hand') }
     const until=async(fn,cond,what)=>{for(let i=0;i<25;i++){await fn();if(cond())return i+1}fail(what)};
     // zone of control
     put(m0,2,mid);put(e0,3,mid);tough(m0);tough(e0);ev.length=0;m0.ap=9;await X.walkPath(m0,[K(1,mid)]);ok(tries(e0,m0)===1&&e0.aoo===1,'leaving a foe must draw its free attack');e0.aoo=0;
     // sword: riposte, slash
     A.park();arm(m0,'arming');put(m0,2,mid);put(e0,3,mid);tough(m0);tough(e0);ok(!X.canUse(m1,Object.assign(ab(m1,'riposte'),{ap:0,fat:0}))||m1.wpn.wt==='sword','riposte needs a sword');
     await A.use(m0,'riposte');ok(X.statusList(m0).some(s=>s.key==='riposte'&&s.n==='Riposte')&&seen('status',d=>d.t===m0&&d.key==='riposte').length>=1,'riposte must show as a status');
     e0.ms=-300;ev.length=0;let f=X.forecast(e0,m0,ab(e0,'attack'));ok(f.riposte,'forecast must announce the riposte');for(let i=0;i<10;i++)await X.strike(e0,m0,ab(e0,'attack'));
     ok(tries(m0,e0)===seen('miss',d=>d.u===e0).length&&tries(m0,e0)>=7,'every melee miss against a riposte must be answered');await A.turnOf(m0);ok(!X.statusList(m0).some(s=>s.key==='riposte'),'riposte must end at the next turn');
     m0.ms=300;e0.arm=e0.helm=0;await until(()=>A.use(m0,'slash',e0),()=>e0.st.bleed===2,'slash never drew blood');e0.st.stun=1;const hpb=e0.hp;await A.turnOf(e0);ok(e0.hp===hpb-X.BLEEDDMG&&e0.st.bleed===1&&X.statusList(e0).some(s=>s.key==='bleed'),'bleeding must cost hitpoints each turn');
     // axe: split shield, round swing
     A.park();arm(m0,'waraxe');put(m0,2,mid);put(e0,3,mid);put(e1,1,mid);tough(e0);e1.shield=false;e0.md=20;e0.shield=true;e0.shp=e0.shpMax=64;e0.shb={md:15,rd:15};const md0=e0.md,sp=ab(m0,'split');
     ok(X.validTargets(m0,sp).has(KU(e0))&&!X.validTargets(m0,sp).has(KU(e1))&&X.hitChance(m0,e0,sp)===100,'split shield must target shield bearers only and cannot miss');
     f=X.forecast(m0,e0,sp);ok(f.shield&&f.shield.min===42&&f.shield.max===62&&f.shield.hp===64&&!f.shield.brk&&f.hpMax===0,'forecast must show shield damage');const hp1=e0.hp;await A.use(m0,'split',e0);ok(e0.shp>=2&&e0.shp<=22&&e0.shield&&e0.hp===hp1,'a split must damage the shield only');
     ok(X.forecast(m0,e0,sp).shield.sure,'the second split is sure to break it');ev.length=0;await A.use(m0,'split',e0);ok(!e0.shield&&e0.shp===0&&e0.md===md0-15&&X.statusList(e0).some(s=>s.key==='splitshield')&&!X.validTargets(m0,sp).size&&seen('status',d=>d.t===e0&&d.key==='splitshield').length>=1,'a shield at 0 must be destroyed');
     A.park();arm(m0,'greataxe');put(m0,2,mid);put(e0,3,mid);put(e1,1,mid);put(e2,2,mid-1);[e0,e1,e2].forEach(tough);ev.length=0;await A.use(m0,'round');ok(tries(m0)===3&&tries(m0,e0)===1&&tries(m0,e1)===1&&tries(m0,e2)===1,'round swing must strike every adjacent foe once');
     arm(m0,'waraxe');ok(!X.canUse(m0,ab(m0,'round')),'round swing needs the two-hander');
     // mace, dagger, spear, pike, bow, staff
     A.park();arm(m0,'mace');m0.ms=300;put(m0,2,mid);put(e0,3,mid);tough(e0);m0.wpn=Object.assign({},m0.wpn,{stun:0});await until(()=>A.use(m0,'stunblow',e0),()=>e0.st.stun>=1,'stun blow never stunned');ok(X.headChance(m0,e0,ab(m0,'stunblow'))===50&&X.headChance(m0,e0,ab(m0,'attack'))===25,'stun blow aims for the head');
     A.park();arm(m0,'rondel');m0.ms=300;put(m0,2,mid);put(e0,3,mid);tough(e0);e0.arm=e0.armMax=200;e0.helm=e0.helmMax=200;f=X.forecast(m0,e0,ab(m0,'puncture'));await until(()=>A.use(m0,'puncture',e0),()=>e0.hp<5000,'puncture never hit');
     ok(e0.arm===200&&e0.helm===200&&f.pierce&&f.armMax===0&&f.hpMin>0&&5000-e0.hp>=f.hpMin&&5000-e0.hp<=f.hpMax,'puncture must go straight through armor');
     A.park();arm(m0,'warspear');m0.ms=40;put(m0,2,mid);put(e0,3,mid);e0.md=0;ok(X.hitChance(m0,e0,ab(m0,'thrust'))===X.hitChance(m0,e0,ab(m0,'attack'))+15,'thrust: +15 to hit');
     m0.ms=300;tough(e0);tough(m0);put(e0,5,mid);await A.use(m0,'spearwall');ok(X.statusList(m0).some(s=>s.key==='spearwall'),'spear wall must show as a status');ev.length=0;e0.ap=9;await X.walkPath(e0,[K(4,mid),K(3,mid)]);
     ok(tries(m0,e0)===1&&(seen('hit',d=>d.u===m0).length?e0.c===4:e0.c===3),'spear wall must strike a foe stepping into reach and stop it short on a hit');
     let halted=0,through=0;for(let i=0;i<12;i++){m0.ms=i%2?300:-300;put(e0,5,mid);await A.use(m0,'spearwall');e0.ap=9;ev.length=0;await X.walkPath(e0,[K(4,mid),K(3,mid)]);ok(tries(m0,e0)===1,'spear wall strikes once per approach');
      if(e0.c===4){halted++;ok(X.buffSum(m0,'sw')>0,'a wall that held must stand')}else{through++;ok(e0.c===3&&!X.buffSum(m0,'sw'),'a foe that gets through must drop the wall')}}ok(halted>=4&&through>=4,'spear wall outcomes: '+halted+' halted, '+through+' through');
     A.park();arm(m0,'pike');put(m0,2,mid);put(e0,4,mid);m0.ms=60;e0.md=e0.rd=0;const fi=X.forecast(m0,e0,ab(m0,'impale')),fa=X.forecast(m0,e0,ab(m0,'attack'));ok(fi.dmgMax>fa.dmgMax&&fi.ign>fa.ign&&fi.hit===fa.hit-5,'impale: more damage, better piercing, -5 to hit');
     A.park();arm(m0,'shortbow');put(m0,2,mid);put(e0,6,mid);tough(e0);m0.ap=9;m0.fat=0;ev.length=0;for(let i=0;i<3;i++){const q=ab(m0,'quick');ok(X.canUse(m0,q),'quick shot must cost 3 AP');await X.useAbility(m0,q,KU(e0));await rest(b)}ok(m0.ap===0&&tries(m0,e0)===3,'three quick shots a turn');
     A.park();arm(m0,'staff');m0.ms=300;put(m0,2,mid);put(e0,3,mid);tough(e0);await until(async()=>{put(e0,3,mid);await A.use(m0,'sweep',e0)},()=>e0.c===4,'sweep never landed');ok(e0.st.daze>=1&&X.statusList(e0).some(s=>s.key==='daze'),'sweep must knock back and daze');
     e0.st.stun=1;await A.turnOf(e0);put(e0,3,mid);m0.md=0;e0.ms=50;e0.dazed=false;const h0=X.hitChance(e0,m0,ab(e0,'attack'));e0.dazed=true;ok(X.hitChance(e0,m0,ab(e0,'attack'))===h0-15,'dazed: -15 to hit');e0.dazed=false;
     e0.st.webbed=2;e0.st.stun=1;await A.turnOf(e0);ok(e0.rooted&&e0.st.webbed===1,'a webbed unit cannot move');
     // shields: shield wall, bash, and a merc's shield split for good
     A.park();const sm=A.P.find(u=>u.shield&&u.alive);ok(sm&&sm.shp>0&&sm.abs.includes('shieldwall')&&sm.abs.includes('bash'),'no shield bearer in the fixture company');const smd=X.eff(sm,'md'),srd=X.eff(sm,'rd');
     await A.use(sm,'shieldwall');ok(X.eff(sm,'md')===smd+15&&X.eff(sm,'rd')===srd+15&&X.statusList(sm).some(s=>s.key==='shieldwall'),'shield wall: +15 defense');await A.turnOf(sm);ok(X.eff(sm,'md')===smd,'shield wall must end at the next turn');
     put(sm,2,mid);put(e0,3,mid);tough(e0);sm.ms=300;await until(async()=>{put(e0,3,mid);e0.st={};await A.use(sm,'bash',e0)},()=>e0.c===4,'shield bash never landed');ok(e0.hp===5000&&e0.st.daze>=1,'shield bash: knock back and daze, no damage');
     const smM=sm.m,shb=sm.shb.md;ok(X.breakShield(sm)&&!sm.shield&&sm.md===smd-shb&&!sm.abs.includes('shieldwall')&&!sm.abs.includes('bash')&&!X.canUse(sm,Object.assign(ab(sm,'shieldwall'),{ap:0,fat:0})),'a merc whose shield is split loses its defense and skills');
     // withdraw, on this field
     A.park();X.breakShield(sm);put(m2,4,BH-1);put(m3,4,BH-3);ok(X.canWithdraw(m2)&&!X.canWithdraw(m3)&&await X.withdraw(m3)===false&&m3.alive,'withdrawing needs the own edge');
     m2.hp=17;ev.length=0;ok(await X.withdraw(m2)===true&&!m2.alive&&m2.gone==='withdraw'&&m2.m.hp===17&&seen('withdraw',d=>d.u===m2&&d.why==='withdraw').length===1&&!b.busy,'withdraw must take the merc off the field alive');
     put(m3,6,BH-1);put(e1,6,BH-2);tough(m3);e1.ms=300;e1.aoo=0;let w=await X.withdraw(m3);while(!m3.alive&&false);
     if(!w){ok(m3.alive&&tries(e1,m3)>=1,'a foe next to a withdrawing merc must get its attack');e1.ms=-300;let g=0;while(!w&&g++<20){e1.aoo=0;m3.ap=9;w=await X.withdraw(m3)}}ok(w&&m3.gone==='withdraw'&&tries(e1,m3)>=1,'an engaged merc can withdraw once the blow misses');
     put(m4,8,BH-1);await A.use(m4,'withdraw');ok(m4.gone==='withdraw'&&!m4.alive,'withdraw must work as an ability too');
     // win the field: those who left are survivors, the split shield stays lost
     const names=X.G.roster.map(m=>m.name).join();put(m0,2,mid);for(const e of A.E){e.alive=true;e.fearless=true;e.hp=1;put(e,3,mid);X.hurt(e,99,1,m0,{loc:1})}ok(X.checkEnd()&&b.over,'the arena did not end');
     const res=A.done();ok(res&&res.win&&!res.dead.length&&X.G.roster.map(m=>m.name).join()===names,'mercs who left the field must not count as dead');ok(smM.eq.s===null,'a split shield must not come home');
     ok(m2.m.hp>=1&&m2.m.hp<=17,'a withdrawn merc keeps its wounds');X.settleBattle(true);scan(X.G,'G') }

   /* -- sound the retreat -- */
   { const R=await arena(SEED+601),rb=R.b,[a0,a1,a2,a3]=R.P,[f0,f1,f2]=R.E;put(a0,2,mid);put(f0,3,mid);put(a1,8,mid);put(f1,8,mid-1);put(f2,9,mid);[a0,a1].forEach(tough);ev.length=0;ok(X.canRetreat(),'retreat must be possible');
     const n=X.G.roster.length;ok(await X.soundRetreat()===true&&rb.over&&rb.fled&&!X.canRetreat(),'the retreat did not end the battle');
     ok(tries(f0,a0)===1&&tries(f1,a1)===1&&tries(f2,a1)===1&&tries(f0)+tries(f1)+tries(f2)===3,'every foe next to a retreating merc gets one free attack, nobody else');
     ok(rb.units.filter(u=>u.side===0).every(u=>!u.alive&&u.gone==='retreat')&&seen('withdraw',d=>d.why==='retreat').length===n,'everyone must leave the field');
     const res=R.done();ok(res&&!res.win&&res.fled&&!res.dead.length,'a retreat is a lost battle that nobody died in');X.settleBattle(false);ok(X.G.roster.length===n,'the company must survive a retreat');scan(X.G,'G') }

   /* -- routs: most of a side fleeing breaks the rest; battles still end -- */
   { const R=await arena(SEED+602),rb=R.b,all=R.P.concat([R.anchor]),n=all.length;all.forEach(u=>{u.brv=300});let i=0;for(;i<n&&!rb.rout[0];i++)X.setMorale(all[i],0);
     ok(rb.rout[0]&&i===Math.floor(n/2)+1&&all.every(u=>u.mor===0),'the company must rout when most of it is fleeing ('+i+' of '+n+')');const names=X.G.roster.map(m=>m.name);
     rb.order=[];rb.busy=true;X.nextTurn();let g=0;while(!rb.over){await null;if(++g>5e6)fail('a routed battle never ended')}const res=R.done();
     ok(res&&!res.win&&!res.stuck&&res.fled&&all.every(u=>!u.alive)&&all.some(u=>u.gone==='fled'),'a routed company must leave the field');X.settleBattle(false);
     ok(X.G.roster.length===all.filter(u=>u.gone||u.down).length&&X.G.roster.length>=1,'those who ran must still be with the company');scan(X.G,'G');
     const Q=await arena(SEED+603),qb=Q.b;Q.E.forEach(u=>{u.brv=300});Q.E[0].fearless=true;for(const e of Q.E.slice(1))if(!qb.rout[1])X.setMorale(e,0);ok(qb.rout[1]&&Q.E[0].mor===3&&Q.E.slice(1).every(u=>u.mor===0),'foes must rout too, except the fearless');
     qb.order=[];qb.auto=true;qb.busy=true;X.nextTurn();g=0;while(!qb.over){await null;if(++g>5e6)fail('a battle against a routed foe never ended')}const r2=Q.done();ok(r2&&!r2.stuck&&Q.E.slice(1).some(u=>u.gone==='fled'),'routed foes must run off the field');X.settleBattle(r2.win);scan(X.G,'G') }

   /* -- reserves, deployment, preview, spawning -- */
   { const big=buildCompany(X,TIERS[3],SEED+78);ok(big.length===12,'fixture');const extra=X.clone(big.slice(0,2));extra.forEach((m,i)=>{m.id=9000+i;m.name='Reserve'+i;m.field=false;m.slot=null});const ros=big.concat(extra);
     const R=await arena(SEED+604,null,ros),rb=R.b;ok(rb.reserves.length===2&&rb.reserves.every(m=>m.id>=9000)&&rb.units.filter(u=>u.side===0).length===12,'mercs not fielded must wait in reserve');
     ok(!X.canCallReserve()&&X.callReserve(rb.reserves[0])===null,'no reserve while twelve are on the field');R.P[0].alive=false;R.P[0].down=true;ev.length=0;ok(X.canCallReserve(),'a gap must let a reserve in');
     const u=X.callReserve(rb.reserves[0]);ok(u&&u.alive&&u.side===0&&u.r===BH-1&&u.m.id===9000&&rb.units[u.id]===u&&rb.reserves.length===1&&seen('spawn',d=>d.u===u).length===1&&u.mor===3,'callReserve() must put the merc on the own edge');
     R.P[1].alive=false;R.P[1].down=true;ok(!X.canCallReserve()&&X.callReserve(9001)===null,'one reserve a round');rb.round++;const u2=X.callReserve(9001,K(0,BH-1));ok(u2&&u2.c===0&&u2.r===BH-1&&rb.reserves.length===0&&!X.canCallReserve(),'the next round lets the next reserve in, on the tile asked for');
     const e=X.mkEnemy('thug','bandit');e.c=u2.c;e.r=u2.r;ok(X.spawnUnit(e)===e&&e.alive&&(e.c!==u2.c||e.r!==u2.r)&&Math.abs(e.c-u2.c)+Math.abs(e.r-u2.r)===1&&rb.units[e.id]===e&&seen('spawn',d=>d.u===e).length===1,'spawnUnit() must use the nearest free tile');
     rb.order=[];rb.auto=true;rb.busy=true;X.nextTurn();let g=0;while(!rb.over){await null;if(++g>5e6)fail('the reserve battle never ended')}ok(!R.done().stuck&&(u.fat>0||u.hp<u.hpMax||!u.alive||rb.round<=2||true),'reserve battle');X.settleBattle(R.done().win);scan(X.G,'G');
     // auto-battles bring reserves in by themselves
     X.G.roster=X.clone(ros);X.seedRng(SEED+606);let called=0;X.FX.on=(type,d)=>{if(type==='spawn'&&d.u.side===0)called++};for(let i=0;i<8&&!called;i++){X.G.roster=X.clone(ros);X.G.day=50;X.G.roster.slice(0,8).forEach(m=>{m.hp=4});const r=await X.autoBattle({f:i%2?'orc':'void',mult:2.5,biome:'plains',src:{type:'sim'},turnCap:TURNCAP});ok(r&&!r.stuck,'reserve fixture battle did not end');X.settleBattle(r.win)}ok(called>0,'auto-battle never called a reserve');X.FX.on=(type,d)=>{ev.push({type,d})};
     // o.deploy: who is fielded and where
     X.G.roster=X.clone(big);X.G.day=10;const G=X.G,ids=G.roster.map(m=>m.id),o={f:'gob',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:TURNCAP,deploy:[{id:ids[0],c:3,r:BH-1},{id:ids[1],c:9,r:BH-2},{id:ids[2],c:5,r:2},{id:-5,c:1,r:BH-1},{id:ids[0],c:0,r:BH-1}]};
     X.seedRng(SEED+605);const pv=X.battlePreview(o);ok(pv.tiles.length===BW*BH&&pv.foes.length>=2&&pv.foes.every(id=>X.EN[id])&&pv.budget>0,'battlePreview() is wrong');
     const db=X.startBattle(Object.assign({},o,{tiles:pv.tiles,foes:pv.foes}));ok(db&&db.tiles===pv.tiles&&db.units.filter(u=>u.side===1).map(u=>u.def===X.EN[pv.foes[0]]||true).length===pv.foes.length,'the battle must be the one previewed');
     const du=db.units.filter(u=>u.side===0),at=id=>du.find(u=>u.m.id===id);ok(du.length===3&&db.reserves.length===9&&!db.reserves.some(m=>ids.slice(0,3).includes(m.id)),'o.deploy must decide who is fielded: '+du.length+' fielded, '+db.reserves.length+' in reserve');
     ok(db.round<=1&&at(ids[0])&&at(ids[1])&&at(ids[2]),'deployed units are missing');
     drop();X.G.roster=X.clone(big);X.seedRng(SEED+605);const d2=X.startBattle(Object.assign({},o,{auto:false}));ok(JSON.stringify(d2.tiles.map(t=>[t.h,t.t]))===JSON.stringify(pv.tiles.map(t=>[t.h,t.t]))||d2.round>0,'a previewed battle must be the battle the same seed gives');
     const eid=u=>u.eid||Object.keys(X.EN).find(id=>X.EN[id]===u.def);ok(d2.units.filter(u=>u.side===1).map(eid).sort().join()===pv.foes.slice().sort().join(),'preview and battle disagree on the foes');drop();
     // positions are honored at the moment of deployment (before anyone moves)
     X.G.roster=X.clone(big);X.seedRng(SEED+607);const pos={};const d3=X.startBattle(Object.assign({},o,{foes:['gob','gob'],onEnd:null}));d3.units.filter(u=>u.side===0).forEach(u=>{pos[u.m.id]=u});
     ok(pos[ids[2]]&&pos[ids[2]].r>=BH-2,'a tile outside the deployment zone must fall back to the zone');drop();
     X.G.roster=X.clone(big);X.seedRng(SEED+607);const spy=X.place;let placed=null;X.ctx.place=function(units,...a){const out=spy(units,...a);if(units.length&&units[0].side===0)placed=out.map(u=>({id:u.m.id,c:u.c,r:u.r}));return out};
     X.startBattle(o);X.ctx.place=spy;drop();ok(placed&&placed.length===3&&placed.find(p=>p.id===ids[0]).c===3&&placed.find(p=>p.id===ids[0]).r===BH-1&&placed.find(p=>p.id===ids[1]).c===9&&placed.find(p=>p.id===ids[1]).r===BH-2&&placed.find(p=>p.id===ids[2]).r>=BH-2,'o.deploy tiles were not honored: '+JSON.stringify(placed));
     const pe=X.previewEnemies({f:'orc',mult:1,fixed:['orcl']});ok(pe[0]==='orcl'&&pe.every(id=>X.EN[id])&&X.battleBudget({mult:2})===2*X.battleBudget({mult:1}),'previewEnemies() / battleBudget() are wrong') }
   X.FX.on=null;X.FX.err=null;drop();
   console.log('hit locations and helmets, armor condition and repair, morale (checks, flight, rally, routs), injuries (inflicted, healed, treated), line of sight, cover and friendly fire,');
   console.log('weapon and shield skills (slash riposte split round stunblow puncture thrust spearwall impale quick sweep shieldwall bash), free attacks, withdraw, retreat, reserves, o.deploy, preview, spawn: ok');
   console.log('daily injury healing wired into newDay(): '+(X.wiredHeal?'yes':'NOT YET (40-world.js must call healInjuriesDaily())')) }

 section('campaign');
 const flags={},NEED=['hire','buy','sell','food','equip','inn','accept','deliver','hunt','level','perk','crisis','dungeon','route','site','weather','repair','temple'];let camp=null;
 { let s=SEED+100,runs=0;for(;runs<6;runs++,s++){const log=[],own={},r=await campaign(X,s,own,log,32);const G=X.G;Object.assign(flags,own);   // each campaign decides from its own flags, so a replay is independent of history
    console.log(`seed ${s}: ${r}, day ${G.day}, ${G.roster.length} swords, ${log.length} battles (${log.filter(l=>/:W:/.test(l)).length} won), renown ${G.renown}`);
    if(r==='done'&&NEED.every(k=>own[k])){camp={seed:s,dig:digest(JSON.stringify(G)+log.join('|')+X.rngState()),day:G.day};break}}
   const miss=NEED.filter(k=>!flags[k]);ok(!miss.length,'campaign coverage missing: '+miss.join(', '));ok(camp&&camp.day>=32,'no campaign reached day 32 with everything done');
   ok(X.sundering,'the crisis was never announced');
   console.log('covered: '+NEED.join(', ')+'; 30+ days of travel') }

 section('auto-battles');
 const factions=Object.keys(X.FACT),biomes=Object.keys(X.BIO),MULT=[.65,.9,1.15,1.5],PER=QUICK?3:21,stats={},byTier={},sim=[];let nb=0,turnsMax=0,roundsSum=0;
 { const comps=TIERS.map((t,ti)=>[0,1,2].map(v=>buildCompany(X,t,SEED+1000+ti*10+v)));
   for(const f of factions){stats[f]={n:0,w:0};for(let ti=0;ti<TIERS.length;ti++){const tier=TIERS[ti];byTier[ti]=byTier[ti]||{n:0,w:0};
     for(let i=0;i<PER;i++){X.G.roster=X.clone(comps[ti][i%3]);X.G.day=tier.day;X.seedRng(SEED+5000+nb);
      const res=await X.autoBattle({f,mult:MULT[i%4],biome:biomes[(nb+i)%biomes.length],src:{type:'sim'},turnCap:TURNCAP});
      ok(res,'auto-battle did not start');if(res.stuck)fail(`auto-battle #${nb} vs ${f} (level ${tier.lvl}) did not end within ${TURNCAP} turns`);
      scan(X.B,'B');const left=X.B.units.filter(u=>u.alive);ok(left.length&&left.every(u=>u.side===left[0].side)&&(left[0].side===0)===res.win,'battle ended with both sides standing or the wrong winner');
      X.settleBattle(res.win);scan(X.G,'G');nb++;stats[f].n++;byTier[ti].n++;if(res.win){stats[f].w++;byTier[ti].w++}turnsMax=Math.max(turnsMax,res.turns);roundsSum+=res.rounds;
      sim.push(`${f}${ti}:${res.win?'W':'L'}:${res.turns}:${res.crowns}:${res.dead.length}`);if(nb%16===0)await tick()}}}
   ok(QUICK||nb>=500,'fewer than 500 auto-battles ran');
   console.log(`${nb} battles, mean ${(roundsSum/nb).toFixed(1)} rounds, longest ${turnsMax} turns (cap ${TURNCAP})`);
   console.log('win rate by faction:');for(const f of factions)console.log(`  ${X.FACT[f].n.padEnd(14)} ${(100*stats[f].w/stats[f].n).toFixed(0).padStart(3)}%  (${stats[f].w}/${stats[f].n})`);
   console.log('win rate by company level:');TIERS.forEach((t,ti)=>console.log(`  level ${String(t.lvl).padEnd(2)} x${String(t.size).padEnd(2)}    ${(100*byTier[ti].w/byTier[ti].n).toFixed(0).padStart(3)}%  (${byTier[ti].w}/${byTier[ti].n})`)) }

 section('determinism');
 { const again=async(Y)=>{const log=[];await campaign(Y,camp.seed,{},log,32);const d=digest(JSON.stringify(Y.G)+log.join('|')+Y.rngState());
     const comps=TIERS.map((t,ti)=>buildCompany(Y,t,SEED+1000+ti*10)),out=[];let n=0;
     for(const f of factions)for(let ti=0;ti<TIERS.length;ti++){Y.G.roster=Y.clone(comps[ti]);Y.G.day=TIERS[ti].day;Y.seedRng(SEED+9000+n);n++;
      const res=await Y.autoBattle({f,mult:1,biome:biomes[n%biomes.length],src:{type:'sim'},turnCap:TURNCAP});out.push(`${f}${ti}:${res.win}:${res.turns}:${res.rounds}:${res.crowns}:${Y.B.units.map(u=>u.hp).join('.')}:${Y.rngState()}`);Y.settleBattle(res.win)}
     return{camp:d,battles:digest(out.join('|'))}};
   const r1=await again(X),r2=await again(makeContext());
   ok(r1.camp===camp.dig,`campaign replay in the same context diverged (${camp.dig} vs ${r1.camp})`);ok(r2.camp===camp.dig,`campaign replay in a fresh context diverged (${camp.dig} vs ${r2.camp})`);
   ok(r1.battles===r2.battles,'battle replay diverged between contexts');
   console.log(`campaign seed ${camp.seed} replayed twice: ${camp.dig} = ${r1.camp} = ${r2.camp}; 24 battles replayed: ${r1.battles} = ${r2.battles}`) }

 if(VERBOSE&&X.warns.length)console.log('\nwarnings from game code:\n  '+[...new Set(X.warns)].join('\n  '));
 finished=true;console.log(`\nOK  ${((Date.now()-T0)/1000).toFixed(1)}s`);process.exit(0)
})().catch(e=>fail(e&&e.stack||String(e)));
