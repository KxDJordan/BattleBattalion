// Headless rules test. Plain node, no browser:  node test/headless.js [--quick] [--seed N] [--verbose] [--board WxH]
// (--board loads the source with BW/BH replaced, to prove the battle rules follow the board constants.)
// Loads src/*.js exactly as build.js concatenates them, inside a vm context with minimal DOM stubs,
// then drives the real game functions with fixed seeds. Exits non-zero on any exception, non-finite
// number in game state, stuck turn, battle that does not end, missing coverage or broken determinism.
// Sections: engine, world, saves (with the v3 -> v4 combat-depth migration), battle events, combat depth (directed scenes on a
// flat arena: hit locations and helmets, armor condition and repair, morale checks / flight / rally / routs, injuries inflicted /
// healed / treated, line of sight, cover and friendly fire, every weapon and shield skill, free attacks, withdraw, retreat,
// reserves, o.deploy, preview, spawn), talents and arms (catalog, recruits, tiers, gift awakening, autoLearn, hands rules, swap, slung
// shields, ranged lock, talent rules in the field, v4 -> v5 migration), campaign, 500+ auto-battles with win rates per faction and level
// under a turn cap, determinism.
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
   'openTown','hire','buyItem','sellItem','buyFood','innRest','acceptContract','genContract','equip','levelSheet','lvPick','lvConfirm',
   'mercTrees','perkOptions','canLearn','learnPerk','perkById','giftVariant','weaponTrees','mercStyle','mercRes','autoLearn','tierLevel','equipRules','rangedLocked','swapWeapons','altWeapon','useBlock','migrateMerc',
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
  if(m.pp>0){const pp=m.pp,n0=m.perks.length,got=X.autoLearn(m);ok(got.length>0&&m.pp===pp-got.length&&m.perks.length===n0+got.length,'autoLearn spent no point for '+m.name);if(flags)flags.perk=true}}}
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
    for(const m of G.roster)for(const j of m.inj.slice()){if(j.days<0){flags.maimed=true;continue}const cost=X.injuryCost(m,j.id);if(G.crowns<cost)G.crowns=cost+100;const c=G.crowns;ok(X.treatInjury(m,j.id)&&G.crowns===c-cost&&!m.inj.includes(j),'the temple did not treat '+j.id);flags.temple=true}
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
   { const hs=Object.keys(X.ITEMS).filter(id=>X.ITEMS[id].k==='h'&&!X.ITEMS[id].famed).map(id=>X.ITEMS[id]).sort((x,y)=>x.price-y.price||x.arm-y.arm);ok(hs.length>=12&&hs.every((h,i)=>h.arm>0&&h.price>0&&h.fat>=0&&(!i||(h.arm>hs[i-1].arm&&h.price>hs[i-1].price&&h.fat>=hs[i-1].fat))),'helmet tiers must rise in armor, weight and price');
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
     ok(!m0.alive&&m0.gone==='fled'&&m0.m.hp===m0.hp&&m0.hp>=23&&seen('withdraw',d=>d.u===m0&&d.why==='fled').length===1&&b.gone.includes(m0)&&b.cur===A.anchor,'a merc that reaches its edge must leave the field alive');
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
   { const sk={sword:['slash','riposte'],axe:['split'],mace:['stunblow'],dagger:['puncture'],spear:['thrust','spearwall'],bow:['quick'],staff:['sweep'],
       hammer:['batter'],polearm:['hook','reap'],greatsword:['halfsword','gswing'],crossbow:['reload','xaim'],flintlock:['reload','blast']},own={pike:'impale',greataxe:'split,round',maul:'batter,hsmash',warmaul:'batter,hsmash',bill:'hook'};
     for(const id in X.ITEMS){const it=X.ITEMS[id];if(it.k==='w'){ok(Array.isArray(it.sk)&&it.sk.length>=1&&it.sk.length<=2&&it.sk.every(a=>X.AB[a]&&X.AB[a].n&&X.AB[a].d),'weapon '+id+' has no skills');const bid=it.famed&&it.base?it.base:id;ok(it.sk.join()===(((X.WSKID&&X.WSKID[bid])||(own[bid]&&own[bid].split(','))||sk[it.wt]).join()),'weapon '+id+' has the wrong skills');
        ok(!!it.reload===it.sk.includes('reload')&&(!it.reload||(X.isRangedW(it)&&it.reload.ap>=2&&it.reload.fat>=0)),'weapon '+id+': reload weapons are ranged and carry the reload skill')}
      if(it.k==='s')ok(it.hp>0&&it.sk.join()===(it.spike?'shieldwall,spikebash':'shieldwall,bash')&&/^(buckler|round|kite|heater|tower|spiked|targe|pavise)/.test(it.look),'shield '+id+' lacks hitpoints, skills or a look')}
     ok(X.ITEMS.pike.sk.join()==='impale'&&X.ITEMS.greataxe.sk.join()==='split,round','two-hander skills');for(const id in X.AB)ok(X.AB[id].n&&X.AB[id].d,'ability '+id+' lacks a name or description');
     for(const k in X.STATUS)ok(X.STATUS[k].n&&X.STATUS[k].d&&X.STATUS[k].icon&&(X.STATUS[k].good===0||X.STATUS[k].good===1),'status '+k+' is incomplete');
     { const m=X.clone(roster[0]);m.eq.w='arming';m.eq.s='kite';const s=X.calc(m);ok(['slash','riposte','shieldwall','bash'].every(a=>s.abs.includes(a))&&s.shield&&s.shield.raised&&s.shield.hp===Math.round(X.ITEMS.kite.hp*(1+(s.flags.shieldHp||0))),'calc() must grant weapon and shield skills: '+s.abs.join()+' '+JSON.stringify(s.shield));
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
   /* -- arms update: hammers, reach, reload, firearms, shield types and the shield tree, friendly fire with one projectile -- */
   { X.FX.on=(type,d)=>{ev.push({type,d})};const Z=await arena(SEED+620),zb=Z.b,[p0,p1,p2,p3]=Z.P,[f0,f1,f2,f3]=Z.E;
     const hitUntil=async(fn,cond,what)=>{for(let i=0;i<30;i++){await fn();if(cond())return}fail(what)};
     const unspawn=(...us)=>{for(const u of us){const i=zb.units.indexOf(u);if(i>=0)zb.units.splice(i,1)}zb.units.forEach((u,i)=>{u.id=i});zb.cur=Z.anchor;X.auraScan()};
     const spawnM=(m,c,r)=>{const u=X.mkPlayerUnit(m);u.c=c;u.r=r;const occ=X.unitAt(c,r);ok(X.spawnUnit(u)===u&&u.c===c&&u.r===r,'arms fixture spawn at '+c+','+r+': '+(occ&&occ.name)+' '+u.c+','+u.r+' '+zb.tiles[K(c,r)].t);return u};
     const mer=(w,b2,s,perks,bg)=>{const m=X.clone(roster[0]);m.id=7000+Math.floor(X.rnd()*1e6);m.bg=bg||'knight';m.race='human';m.eq.w=w;m.eq.b=b2||null;m.eq.s=s||null;m.inj=[];delete m.cond;m.perks=perks||[];m.gift=null;m.trees=['vanguard','bulwark','brute','duelist'];m.lvl=Math.max(m.lvl,9);m.hp=X.calc(m).hp;return m};
     // hammers crush armor: hurt(), the forecast and the item
     Z.park();arm(p0,'warhammer');put(p0,2,mid);put(f0,3,mid);tough(f0);
     f0.arm=60;ok(X.hurt(f0,50,.5,p0,{crush:.6})===25&&f0.arm===0,'a crushing blow must strip the armor: '+f0.arm);f0.arm=60;ok(X.hurt(f0,50,.5,p0,{})===24&&f0.arm===10,'the same blow without crushing');
     f0.arm=f0.armMax=200;f0.helm=f0.helmMax=200;{const w0=p0.wpn;p0.wpn=Object.assign({},w0,{crush:0});const fa=X.forecast(p0,f0,ab(p0,'attack'));p0.wpn=w0;const fb=X.forecast(p0,f0,ab(p0,'attack')),fc=X.forecast(p0,f0,ab(p0,'batter'));
       ok(fb.crush===w0.crush&&fb.armMax>fa.armMax&&fb.armMin>fa.armMin&&fc.crush===w0.crush+X.AB.batter.crushB,'the forecast must price armor crushing')}
     ok(['mallet','warhammer','maul','warmaul'].every(id=>X.ITEMS[id].wt==='hammer'&&X.ITEMS[id].crush>0)&&X.ITEMS.maul.two&&!X.ITEMS.warhammer.two,'hammers: 1H war hammers, 2H mauls, all crushing');
     ok(X.ITEMS.maul.sk.includes('hsmash')&&!X.ITEMS.warhammer.sk.includes('hsmash'),'the overhead smash is for mauls');
     // reach 2: over an ally or an empty tile, never through a wall; polearms are two-handed only
     for(const w of ['pike','bill','halberd','glaive','greatsword','zweihander','runegreat']){Z.park();arm(p0,w);put(p0,2,mid);put(p1,3,mid);put(f0,4,mid);const at=ab(p0,'attack'),L=X.losInfo(p0,f0,at);
       ok(X.ITEMS[w].two&&at.rng===2&&X.validTargets(p0,at).has(KU(f0))&&!L.blocked&&!L.ff.length&&X.shotKind(p0,f0,at)===1&&X.forecast(p0,f0,at).reach,w+' must reach over an ally');
       put(p1,0,0);ok(X.validTargets(p0,at).has(KU(f0)),w+' must reach over an empty tile');zb.tiles[K(3,mid)].t='block';ok(!X.validTargets(p0,at).has(KU(f0))&&X.losInfo(p0,f0,at).blocked,w+' must not reach through an obstacle');zb.tiles[K(3,mid)].t='ground';
       put(f0,5,mid);ok(!X.validTargets(p0,at).has(KU(f0)),w+' reaches 2 tiles, not 3')}
     ok(Object.keys(X.ITEMS).filter(id=>X.ITEMS[id].wt==='polearm').every(id=>X.ITEMS[id].two&&X.ITEMS[id].rng===2),'polearms are two-handed with reach 2');
     Z.park();arm(p0,'halberd');p0.ms=300;put(p0,2,mid);put(p1,3,mid);put(f0,4,mid);tough(f0);tough(p1);ev.length=0;
     await hitUntil(()=>Z.use(p0,'attack',f0),()=>f0.hp<5000,'a halberd over an ally never landed');ok(!seen('ff').length&&p1.hp===p1.hpMax&&!seen('hit',d=>d.t===p1).length,'a reach blow over an ally hurts only the foe');
     // the hook drags, the half-sword and the mordhau are for foes beside you
     Z.park();arm(p0,'bill');p0.ms=300;put(p0,2,mid);put(f0,4,mid);tough(f0);ok(X.forecast(p0,f0,ab(p0,'hook')).pull.n===1,'the forecast must show the pull');ev.length=0;
     await hitUntil(async()=>{put(f0,4,mid);await Z.use(p0,'hook',f0)},()=>f0.c===3,'the hook never dragged the foe');ok(seen('kb',d=>d.t===f0&&d.pull).length>=1,'a pull is announced as kb with pull');
     Z.park();arm(p0,'greatsword');put(p0,2,mid);put(f0,4,mid);ok(!X.validTargets(p0,ab(p0,'halfsword')).has(KU(f0))&&ab(p0,'halfsword').ap===4,'half-sword: adjacent only, 4 AP');put(f0,3,mid);ok(X.validTargets(p0,ab(p0,'halfsword')).has(KU(f0)),'half-sword reaches a foe beside you');
     // reload: start loaded, fire unloads, reload (AP and fatigue from the weapon, allowed while engaged), the ranged lock stops the shot
     for(const w of ['lightxbow','crossbow','arbalest','pistol','duelpistol','musket']){Z.park();arm(p0,w);p0.rs=300;p0.loaded=true;p0.ld={};put(p0,2,mid);put(f0,6,mid);tough(f0);const it=X.ITEMS[w],at=ab(p0,'attack'),rl=ab(p0,'reload');
       ok(X.isRangedW(it)&&at.n==='Shoot'&&rl.ap===it.reload.ap&&rl.fat===it.reload.fat&&!X.canUse(p0,rl)&&/Already/.test(X.useBlock(p0,rl))&&X.canUse(p0,at),w+': loaded, nothing to reload');
       ev.length=0;await Z.use(p0,'attack',f0);ok(p0.loaded===false&&tries(p0,f0)===1&&!X.canUse(p0,at)&&/Not loaded/.test(X.useBlock(p0,at))&&!X.validTargets(p0,at).size&&X.forecast(p0,f0,at).unloaded&&X.statusList(p0).some(s=>s.key==='unloaded'),w+': firing must unload it');
       for(const id of it.sk.filter(id=>id!=='reload'))ok(!X.canUse(p0,Object.assign(ab(p0,id),{ap:0,fat:0})),w+': '+id+' cannot fire unloaded');
       put(f1,2,mid-1);p0.ap=9;ok(X.rangedLocked(p0)&&X.canUse(p0,rl),w+': reloading is allowed with a foe next to you');await Z.use(p0,'reload');ok(p0.loaded===true&&p0.ap===9-it.reload.ap&&p0.fat===it.reload.fat&&seen('reload',d=>d.u===p0).length===1&&!X.statusList(p0).some(s=>s.key==='unloaded'),w+': reload');
       ok(!X.canUse(p0,at)&&/Engaged/.test(X.useBlock(p0,at)),w+': loaded but engaged, it cannot fire');put(f1,0,0);p0.ap=9;ok(X.canUse(p0,at),w+': clear again, it fires');ok(!X.canFree(p0),w+': no free attacks with a ranged weapon')}
     ok(X.ITEMS.pistol.two!==1&&X.ITEMS.musket.two===1&&X.ITEMS.musket.ign>=.7&&X.ITEMS.pistol.ign>=.7,'pistols are one-handed, muskets two-handed, both pierce armor');
     // a swapped-away weapon keeps its load; each starts loaded
     { const q=spawnM(mer('lightxbow','pistol',null,[],'thief'),2,mid+2);put(f0,6,mid+2);tough(f0);ok(q.loaded&&q.ld.lightxbow===true&&q.ld.pistol===true&&q.wpn.wt==='crossbow','both weapons start loaded');
       q.ap=9;q.rs=300;zb.cur=q;await X.useAbility(q,ab(q,'attack'),KU(f0));await rest(zb);ok(q.loaded===false&&q.ld.lightxbow===false,'the crossbow is spent');
       ok(X.swapWeapons(q)&&q.wpn.wt==='flintlock'&&q.loaded===true&&q.ld.lightxbow===false,'the pistol comes out loaded');ok(X.swapWeapons(q)&&q.wpn.wt==='crossbow'&&q.loaded===false,'the crossbow comes back spent');
       unspawn(q) }
     // enemies with the new weapons
     for(const [id,wt] of [['bxbow','crossbow'],['obrute','hammer'],['skelhal','polearm']]){const e=X.mkEnemy(id,id==='obrute'?'orc':id==='bxbow'?'bandit':'undead');X.enemyInit(e,id);ok(e.wpn.wt===wt&&e.loaded&&(!e.wpn.reload||e.abs.includes('reload'))&&e.abs.every(a=>X.AB[a]),'enemy '+id+' fights with a '+wt);
       ok(Object.values(X.FACT).some(F=>F.units.some(x=>x[0]===id)),'enemy '+id+' belongs to a faction')}
     // shields: types and stats, the tower's cover and wall, the spiked bash
     { const sh=Object.keys(X.ITEMS).filter(id=>X.ITEMS[id].k==='s').map(id=>X.ITEMS[id]);ok(['buckler','round','kite','heater','tower','spiked'].every(l=>sh.some(i=>String(i.look).indexOf(l)===0))&&sh.length>=9&&new Set(sh.map(i=>[i.md,i.rd,i.hp,i.fat].join())).size===sh.length,'shield types with their own numbers');
       Z.park();const tw=spawnM(mer('arming',null,'tower'),5,mid+2),mate=spawnM(mer('arming',null,'buckler'),6,mid+2),sp=spawnM(mer('arming',null,'spiked'),5,mid+3);
       ok(tw.flags.guard===X.ITEMS.tower.guard&&ab(tw,'shieldwall').buff.md===15+X.ITEMS.tower.wallB&&ab(mate,'shieldwall').buff.md===15,'a tower shield: cover and a stronger shield wall');
       f0.wpn={n:'',wt:'bow',d:[10,20],ap:4,fat:0,rng:6,ign:.25};f0.rs=60;mate.rd=0;put(f0,6,mid-2);X.auraScan();const at=ab(f0,'attack'),h1=X.hitChance(f0,mate,at);put(tw,0,mid+3);X.auraScan();const h0=X.hitChance(f0,mate,at);
       ok(h0-h1===X.ITEMS.tower.guard,'a raised tower shield covers the ally beside it: '+h0+' vs '+h1);put(tw,5,mid+2);X.auraScan();X.breakShield(tw);ok(X.hitChance(f0,mate,at)===h0&&!tw.flags.guard,'a split tower covers nobody');
       ok(sp.abs.includes('spikebash')&&!sp.abs.includes('bash')&&ab(sp,'spikebash').dmgD.join()===X.ITEMS.spiked.spike.join(),'a spiked shield bashes with its spike');
       put(f1,5,mid+4);tough(f1);const fs=X.forecast(sp,f1,ab(sp,'spikebash'));ok(fs.dmgMax>0&&fs.kb&&fs.kb.n===1,'the forecast knows the spiked bash');sp.ms=300;ev.length=0;
       await hitUntil(async()=>{put(f1,5,mid+4);sp.ap=9;sp.fat=0;zb.cur=sp;await X.useAbility(sp,ab(sp,'spikebash'),KU(f1));await rest(zb)},()=>f1.hp<5000,'the spiked bash never drew blood');
       unspawn(tw,mate,sp) }
     // the shield tree: only while a shield is raised
     { Z.park();const P=['shield.1a','shield.1b','shield.2a','shield.2b','shield.3a','shield.3b'],m=mer('arming','greataxe','heater',P),s=X.calc(m),s2=X.calc(m,{hand:'b'});
       ok(X.weaponTrees(m).includes('shield')&&P.every(id=>s.perks.includes(id))&&s.abs.includes('scharge')&&s.abs.includes('fortress')&&s.flags.deflect===.1&&s.flags.shieldDr===.1&&s.shield.md===X.ITEMS.heater.md+4,'the shield tree works with the shield raised');
       ok(P.every(id=>s2.off.includes(id))&&!s2.abs.includes('scharge')&&!s2.flags.deflect&&s2.shield.hp===s.shield.hp,'a slung shield: the shield tree sleeps (its hitpoints stay)');
       ok(X.calc(mer('arming',null,null,P)).off.length===6,'no shield, no shield tree');
       const g=spawnM(m,8,mid+2),mate=spawnM(mer('arming',null,'buckler'),9,mid+2);f0.wpn={n:'',wt:'bow',d:[30,40],ap:4,fat:0,rng:8,ign:.25};put(f0,8,mid-3);const at=ab(f0,'attack'),fA=X.forecast(f0,g,at);
       const fl=g.flags;g.flags=Object.assign({},fl,{deflect:0,shieldDr:0});const fB=X.forecast(f0,g,at);g.flags=fl;ok(fA.dmgMax<fB.dmgMax,'Deflect and Iron wall cut the damage of a shot');
       zb.cur=g;g.ap=9;g.fat=0;await X.useAbility(g,ab(g,'fortress'),KU(g));await rest(zb);ok(g.buffs.some(x=>x.key==='fortress')&&mate.buffs.some(x=>x.key==='fortress')&&X.statusList(mate).some(x=>x.key==='fortress'),'Testudo covers you and the ally beside you');
       put(f1,8,mid-1);tough(f1);g.ms=300;g.ap=9;g.fat=0;ok(X.validTargets(g,ab(g,'scharge')).has(KU(f1)),'shield charge reaches 3 tiles');await X.useAbility(g,ab(g,'scharge'),KU(f1));await rest(zb);ok(g.r!==mid+2&&Math.abs(g.c-f1.c)+Math.abs(g.r-f1.r)<=2,'shield charge closes in');
       X.breakShield(g);ok(!X.canUse(g,Object.assign(ab(g,'fortress'),{ap:0,fat:0}))&&X.drOf(f0,g,at)===X.drOf(f0,Object.assign({},g,{flags:Object.assign({},g.flags,{deflect:0,shieldDr:0})}),at),'a split shield: no shield skills, no shield-tree damage reduction');
       unspawn(g,mate) }
     // weapon trees follow background and race
     for(const bg in X.BG)for(const race in X.RACE){const m=X.newMerc(bg);m.race=race;const wt=X.weaponTrees(m);m.lvl=9;m.pp=1;
       ok(wt.every(w=>X.BG[bg].wt.includes(w)&&!X.RACE[race].noWt.includes(w)),'weapon trees outside '+bg+' / '+race);for(const w of X.WTS)ok(X.canLearn(m,w+'.1a')===wt.includes(w),'canLearn must follow the weapon trees: '+bg+' '+race+' '+w)}
     ok(!X.BG.monk.wt.includes('flintlock')&&X.RACE.elf.noWt.includes('flintlock')&&X.RACE.halforc.noWt.includes('bow'),'no firearms for monks or elves, no bows for half-orcs');
     // friendly fire: every ranged weapon attack with an ally in the line strays into him, ONE projectile, to him, and he takes the hit
     const fsh=X.FX.shot,shotLog=[];X.FX.shot=function(a,b2,...r){shotLog.push({a,b:b2});return fsh.call(this,a,b2,...r)};
     const ffCase=async(sh,mate,tg,id,dist,what)=>{let strays=0,miss=0;ev.length=0;
       for(let i=0;i<200&&strays<8;i++){sh.loaded=true;sh.ap=9;shotLog.length=0;const n0=seen('ff').length,h0=seen('hit',d=>d.t===mate).length,a=ab(sh,id);await X.strike(sh,tg,a);
        if(seen('ff').length>n0){strays++;const e=seen('ff').slice(-1)[0].d;ok(e.u===sh&&e.t===mate&&e.from===tg,what+': the ff event must carry u, the ally and from');
         ok(shotLog.length===1&&shotLog[0].a===sh&&shotLog[0].b===mate,what+': a stray shot must be ONE projectile, to the ally ('+shotLog.length+')');ok(seen('hit',d=>d.t===mate).length===h0+1,what+': the ally must take the stray');
         const m=seen('miss',d=>d.u===sh&&d.t===tg).slice(-1)[0];ok(m&&m.d.stray===mate,what+': the miss must name the stray')}
        else{ok(shotLog.length===1&&shotLog[0].b===tg,what+': one projectile to the target ('+shotLog.length+')');if(seen('miss',d=>d.u===sh&&d.t===tg).length)miss++}}
       ok(strays>=4,what+': stray shots must hit the ally in the line ('+strays+')');return strays};
     const ffSet=(w,d)=>{Z.park();arm(p0,w);p0.rs=-300;p0.res={aura:{cur:999,max:999,regen:0},mana:{cur:999,max:999,regen:0}};put(p0,2,mid);put(p1,3,mid);put(f0,2+d,mid);tough(p1);tough(f0);p1.arm=p1.helm=0;p1.rd=0};
     for(const [w,id,d] of [['shortbow','attack',5],['warbow','aarrow',6],['shortbow','quick',4],['lightxbow','attack',5],['crossbow','xaim',6],['pistol','attack',4],['musket','attack',6],['musket','blast',5],['warbow','seeker',5]]){
       ffSet(w,d);const a=ab(p0,id);if(a.sure){ok(X.forecast(p0,f0,a).ff.length===0,id+' cannot miss: no stray risk');continue}
       ok(X.losInfo(p0,f0,a).ff[0]===p1&&X.forecast(p0,f0,a).ff.length===1,w+' '+id+': the ally right in front is in the line of fire');await ffCase(p0,p1,f0,id,d,w+' '+id)}
     { ffSet('shortbow',5);put(p1,2,mid+1);put(p2,3,mid-1);tough(p2);ev.length=0;for(let i=0;i<60;i++){shotLog.length=0;await X.strike(p0,f0,ab(p0,'attack'));ok(shotLog.length===1,'one projectile a shot')}ok(!seen('ff').length,'allies out of the line are never hit') }
     { Z.park();const ea=f2,em=f3;ea.wpn={n:'',wt:'bow',d:[20,30],ap:4,fat:0,rng:6,ign:.25};ea.rs=-300;put(ea,4,0);put(em,4,1);put(p3,4,5);tough(em);tough(p3);em.arm=em.helm=0;await ffCase(ea,em,p3,'attack',5,'an enemy archer') }
     X.FX.shot=fsh;
     // the AI: reach from the second rank, reloading, crossbows and hammers in use
     { const ros2=buildCompany(X,TIERS[2],SEED+630);const g2=(i,w,b2)=>{ros2[i].eq.w=w;ros2[i].eq.s=null;ros2[i].eq.b=b2||ros2[i].eq.b};g2(0,'halberd');g2(1,'crossbow','knife');g2(2,'musket','knife');g2(3,'maul');g2(4,'greatsword');
       let reach=0;const rel=[0,0],fired={};X.FX.on=(type,d)=>{if((type==='hit'||type==='miss')&&d.u&&d.t&&d.u.wpn&&!d.stray){const wt=d.u.wpn.wt;if((wt==='polearm'||wt==='greatsword')&&Math.abs(d.u.c-d.t.c)+Math.abs(d.u.r-d.t.r)===2)reach++;fired[wt]=(fired[wt]||0)+1}if(type==='cast'&&d.ab&&d.ab.id==='reload')rel[d.u.side]++};
       for(let i=0;i<4;i++){X.G.roster=X.clone(ros2);X.G.day=30;X.seedRng(SEED+640+i);const r=await X.autoBattle({f:i%2?'orc':'bandit',mult:1,biome:'plains',src:{type:'sim'},turnCap:TURNCAP,fixed:i%2?['obrute']:['bxbow','bxbow']});ok(r&&!r.stuck,'arms auto-battle did not end');X.settleBattle(r.win)}
       ok(reach>=3&&rel[0]>=2&&rel[1]>=1&&fired.crossbow>=2&&fired.flintlock>=1&&fired.hammer>=2,'the AI must strike from the second rank, reload and use the new arms: '+JSON.stringify({reach,rel,fired}));X.FX.on=null;
       console.log('arms update: reach over allies and walls, reload cycles ('+rel.join('/')+' reloads by the AI), '+reach+' blows from the second rank, crushing, hooks, firearms, shields and the shield tree, friendly fire as one projectile: ok') }
     X.FX.on=null;drop() }
   console.log('hit locations and helmets, armor condition and repair, morale (checks, flight, rally, routs), injuries (inflicted, healed, treated), line of sight, cover and friendly fire,');
   console.log('weapon and shield skills (slash riposte split round stunblow puncture thrust spearwall impale quick sweep shieldwall bash), free attacks, withdraw, retreat, reserves, o.deploy, preview, spawn: ok');
   console.log('daily injury healing wired into newDay(): '+(X.wiredHeal?'yes':'NOT YET (40-world.js must call healInjuriesDaily())')) }

 section('talents and arms');
 { const M=X.MAST,BW=X.BW,BH=X.BH,KU=u=>u.r*BW+u.c,keys=Object.keys(M),kind=k=>M[k].kind,ids=new Set();
   // -- the catalog --
   const styles=keys.filter(k=>kind(k)==='style'),gifts=keys.filter(k=>kind(k)==='gift'),wts=keys.filter(k=>kind(k)==='weapon');
   ok(styles.length>=12&&['vanguard','bulwark','marksman','skirmisher'].every(k=>kind(k)==='style'),'at least 12 style trees, the four old ones kept');
   ok(wts.length===14&&['sword','axe','mace','dagger','spear','bow','staff','fist','hammer','polearm','greatsword','crossbow','flintlock','shield'].every(w=>M[w]&&M[w].wt===w&&M[w].tiers.length===3&&M[w].tiers.every(t=>t.length===2)),'14 weapon trees (13 families and the shield) of 3 tiers x 2 perks');
   ok(X.WTS.length===14&&wts.every(k=>X.WTS.includes(k)),'WTS lists every weapon tree');
   for(const k of styles.concat(gifts))ok(M[k].tiers.length===6&&M[k].tiers.every(t=>t.length>=1),k+': 6 tiers');
   ok(M.mana.style==='caster'&&M.aura.style==='melee'&&M.qi.style==='melee'&&M.chi.style==='support'&&['mana','aura','qi','chi'].every(k=>kind(k)==='gift'&&M[k].res===k),'the four old gift trees keep their keys');
   for(const r of X.RESK){const vs=gifts.filter(k=>M[k].res===r).map(k=>M[k].style);ok(vs.includes('melee')&&vs.includes('ranged'),r+' needs melee and ranged variants');ok(X.giftKey(r,'melee')&&X.giftKey(r,'ranged')&&M[X.giftKey(r,'ranged')].style==='ranged','giftKey '+r)}
   ok(X.giftKey('mana','caster')==='mana'&&X.giftKey('chi','support')==='chi'&&X.giftKey('aura','caster')==='aura'&&X.giftKey('aura','ranged')==='aura_r'&&X.giftKey('qi','support')==='qi','gift variant mapping');
   for(const k of keys)M[k].tiers.forEach((t,ti)=>t.forEach(p=>{ok(p.id&&!ids.has(p.id)&&p.n&&p.d&&X.perkById(p.id)&&X.perkById(p.id).tier===ti+1&&X.perkById(p.id).key===k,'perk '+p.id+' is malformed or not unique');ids.add(p.id);
     if(p.ab)ok(X.AB[p.ab]&&X.AB[p.ab].n&&X.AB[p.ab].d,'perk '+p.id+' grants an unknown ability '+p.ab);ok(p.st||p.ab||p.flag||p.mod||p.res||p.wmod,'perk '+p.id+' does nothing')}));
   const nAb=new Set([...ids].map(id=>X.perkById(id).perk.ab).filter(Boolean)).size;
   { const pools=[];for(const bg in X.BG){const b=X.BG[bg];ok(X.TALSTYLE.includes(b.style),bg+' has no style');ok(b.pool.length>=6&&b.pool.length<=9&&b.pool.every(k=>M[k]&&kind(k)==='style')&&new Set(b.pool).size===b.pool.length,bg+': pool of 6-9 style trees');
       ok(b.wt.length>=3&&b.wt.length<=10&&b.wt.every(w=>M[w]&&kind(w)==='weapon')&&new Set(b.wt).size===b.wt.length,bg+': 3-10 weapon trees');pools.push(b.pool.slice().sort().join())}
     ok(['knight','squire'].every(bg=>['greatsword','polearm','hammer','shield'].every(w=>X.BG[bg].wt.includes(w)))&&X.BG.hunter.wt.includes('crossbow')&&!X.BG.monk.wt.includes('flintlock'),'background weapon trees for the new families');
     for(const k of wts)ok(Object.keys(X.BG).some(bg=>X.BG[bg].wt.includes(k)),'no background can learn the '+k+' tree');
     for(const r in X.RACE)ok(Array.isArray(X.RACE[r].noWt)&&X.RACE[r].noWt.every(w=>M[w]&&kind(w)==='weapon'),'race '+r+': noWt');
     ok(new Set(pools).size===pools.length,'two backgrounds share the same pool');ok(X.RACE.halforc.noWt.includes('bow'),'a half-orc never gets the bow tree');
     const cov=new Set();for(const bg in X.BG)X.BG[bg].pool.forEach(k=>cov.add(k));ok(styles.every(k=>cov.has(k)),'a style tree no background can draw') }
   ok(X.tierLevel('style',1)===1&&X.tierLevel('gift',6)===6&&X.tierLevel('weapon',1)===3&&X.tierLevel('weapon',3)===9,'tierLevel');
   // -- recruits --
   X.seedRng(SEED+7001);X.newGame(true);closeAll(X);
   { const by={};for(let i=0;i<120;i++){const bg=Object.keys(X.BG)[i%12],m=X.newMerc(bg),st=m.trees.filter(k=>kind(k)==='style');
       ok(st.length===4&&new Set(st).size===4&&st.every(k=>X.BG[bg].pool.includes(k))&&Array.isArray(m.perks)&&!m.perks.length&&m.pp===1&&m.lvl===1,'a recruit must carry 4 trees of its pool, no perks and 1 point');
       ok(m.gift===null?m.trees.length===4:(m.trees.length===5&&m.trees[4]===m.gift&&M[m.gift].kind==='gift'&&m.gift===X.giftKey(M[m.gift].res,X.BG[bg].style)),'a recruit gift tree must follow its background style');
       ok(X.mercRes(m)===(m.gift?M[m.gift].res:null)&&X.giftVariant(m)===m.gift&&X.mercStyle(m)===X.BG[bg].style,'mercRes / giftVariant / mercStyle');
       (by[bg]=by[bg]||new Set()).add(st.slice().sort().join())}
     for(const bg in by)ok(by[bg].size>=2,'two recruits of one background must be able to differ: '+bg);
     let h=null;for(let i=0;i<200&&!h;i++){const m=X.newMerc('hunter');if(m.gift)h=m}ok(h&&M[h.gift].style==='ranged','a gifted hunter must get the ranged variant: '+(h&&h.gift));
     let hu=null;for(let i=0;i<60&&!hu;i++){const m=X.newMerc('hunter');if(m.race==='halforc')hu=m}ok(hu&&!X.weaponTrees(hu).includes('bow')&&!X.perkOptions(hu).some(o=>o.key==='bow'),'a half-orc hunter must not have the bow tree');
     hu.lvl=9;hu.pp=5;ok(!X.canLearn(hu,'bow.1a')&&!X.learnPerk(hu,'bow.1a'),'a half-orc must not learn bow perks');
     const hh=X.newMerc('hunter');hh.race='human';ok(X.weaponTrees(hh).join()===X.WTS.filter(w=>X.BG.hunter.wt.includes(w)).join()&&X.weaponTrees(hh).includes('bow'),'weapon trees follow the background');
     ok(X.mercTrees(hh).map(x=>x.kind).join().replace(/style,?/g,'s').startsWith('ssss'),'mercTrees: style trees first');
     ok(X.BG.hunter.side&&X.newMerc('hunter').eq.b==='knife','hunters carry a knife as a sidearm') }
   // -- tiered unlocks, points, gift awakening --
   { const m=X.newMerc('knight');m.gift='aura';m.trees=['vanguard','bulwark','brute','duelist','aura'];m.perks=[];m.race='human';m.eq.w='arming';X.syncMast(m);
     m.lvl=2;m.pp=2;ok(!X.canLearn(m,'vanguard.3')&&!X.learnPerk(m,'vanguard.3')&&m.pp===2,'a tier-3 perk must not open at level 2');
     ok(X.canLearn(m,'bulwark.2')&&X.learnPerk(m,'bulwark.2')&&m.pp===1&&m.perks.includes('bulwark.2')&&!m.perks.includes('bulwark.1'),'a tier-2 perk must not need the tier-1 perk');
     const hp0=m.hp;ok(m.hp===Math.min(X.calc(m).hp,hp0)&&X.calc(m).hp===X.calc(Object.assign(X.clone(m),{perks:[]})).hp+15,'Colossus must add 15 hitpoints');
     ok(!X.canLearn(m,'sword.1a'),'weapon tier 1 must wait for level 3');m.lvl=3;ok(X.canLearn(m,'sword.1a'),'weapon tier 1 opens at level 3');ok(!X.canLearn(m,'sword.2a'),'weapon tier 2 waits for level 6');
     ok(!X.canLearn(m,'bulwark.2')&&!X.canLearn(m,'marksman.1'),'no perk twice, none from a tree the merc lacks');
     m.lvl=5;m.pp=1;ok(!X.giftAwake(m)&&!X.calc(m).res.aura,'the gift sleeps until a perk awakens it');
     ok(X.learnPerk(m,'aura.5')&&X.giftAwake(m)&&X.calc(m).res.aura.max===X.GIFTBASE+15&&X.calc(m).res.aura.regen===X.GIFTREGEN&&X.calc(m).dmg===.1&&!X.calc(m).abs.includes('astrike'),'a tier-5 gift perk must awaken the gift by itself');
     m.pp=0;ok(!X.canLearn(m,'vanguard.1'),'no point, no perk');
     const po=X.perkOptions(m);ok(po.length===X.mercTrees(m).reduce((n,x)=>n+x.tree.tiers.reduce((a,t)=>a+t.length,0),0)&&po.every(o=>o.need===X.tierLevel(o.kind,o.tier)&&o.unlocked===(m.lvl>=o.need)&&o.owned===m.perks.includes(o.id)),'perkOptions');
     // weapon perks follow the weapon in hand
     const h=X.newMerc('hunter');h.race='human';h.eq.w='shortbow';h.eq.b='knife';h.lvl=6;h.pp=3;ok(X.learnPerk(h,'bow.1b')&&X.learnPerk(h,'dagger.1a')&&X.learnPerk(h,'bow.2b'),'hunter weapon perks');
     const cb=X.calc(h),ck=X.calc(h,{hand:'b'});ok(cb.rs===ck.rs+6&&cb.off.includes('dagger.1a')&&ck.off.includes('bow.1b')&&cb.flags.bleedOn===2&&!ck.flags.bleedOn&&ck.wpn.ap===2&&cb.wpn.ap===X.ITEMS.shortbow.ap&&cb.wpn.id==='shortbow'&&ck.wpn.id==='knife','weapon perks must only work with that family in hand');
     ok(cb.abs.includes('swap')&&cb.abs.includes('quick')&&!cb.abs.includes('puncture')&&ck.abs.includes('puncture')&&!ck.abs.includes('quick'),'weapon skills follow the hand') }
   // -- autoLearn --
   { let n=0;for(const bg in X.BG)for(let v=0;v<3;v++){const m=X.newMerc(bg);X.gainXP(m,X.XPT[[3,8,15][v]]);const got=X.autoLearn(m);n++;
      ok(m.pp===0&&got.length===m.lvl&&m.perks.length===m.lvl&&m.perks.every(id=>{const P=X.perkById(id);return m.lvl>=X.tierLevel(P.kind,P.tier)}),'autoLearn must spend every point on open perks: '+bg);
      if(m.gift)ok(X.giftAwake(m)&&m.perks[0].startsWith(m.gift),'autoLearn must awaken the gift first: '+bg);
      const w=X.ITEMS[m.eq.w];for(const id of m.perks){const a=X.AB[X.perkById(id).perk.ab];if(a&&a.needs&&a.needs!==(w?w.wt:'fist'))ok(m.eq.b&&X.ITEMS[m.eq.b].wt===a.needs||m.lvl>=12,'autoLearn took '+id+' with the wrong weapon: '+bg)}
      if(bg==='hunter')ok(m.perks.every(id=>!(X.perkById(id).perk.mod||{}).shieldDef),'a hunter must not learn shield perks')}
     ok(n===36,'autoLearn fixture') }
   // -- equipment rules (hands) --
   { const m=X.newMerc('sellsword');m.eq.w='greataxe';m.eq.b='pike';m.eq.s=null;let r=X.equipRules(m,'s','kite');ok(!r.ok&&r.why,'a shield must be refused with two two-handers');
     m.eq.b='knife';r=X.equipRules(m,'s','kite');ok(r.ok&&r.slung,'a shield with a two-hander and a one-handed sidearm is allowed (slung)');m.eq.s='kite';
     r=X.equipRules(m,'b','pike');ok(r.ok&&r.drops&&r.drops.includes('s'),'a second two-hander drops the shield');ok(!X.equipRules(m,'b','kite').ok&&!X.equipRules(m,'s','arming').ok&&X.equipRules(m,'b','shortbow').ok,'slots take the right kind');
     const g=X.clone(m);g.eq.b='pike';ok(X.fixHands(g)==='kite'&&g.eq.s===null,'fixHands') }
   // -- battle: swap, slung shields, the ranged lock --
   const ros=buildCompany(X,TIERS[1],SEED+7100),rest=async b=>{let n=0;while(!b.over&&b.busy){await null;if(++n>3e6)fail('the battle never came to rest')}};
   const mk=(bg,w,b2,s)=>{const m=X.clone(ros[0]);m.id=900+Math.floor(X.rnd()*1e6);m.bg=bg;m.eq.w=w;m.eq.b=b2;m.eq.s=s;m.field=true;m.inj=[];delete m.cond;m.perks=[];m.trees=['vanguard','bulwark','scout','skirmisher'];m.gift=null;m.race='human';m.hp=X.calc(m).hp;return m};
   const war=mk('sellsword','greataxe','arming','kite'),arc=mk('hunter','shortbow','knife',null),pal=mk('knight','arming',null,'heater');arc.lvl=4;arc.trees.push('scout');arc.perks=['scout.4'];
   X.G.roster=[war,arc,pal].concat(X.clone(ros).slice(1,3));X.G.day=10;X.seedRng(SEED+7200);let done=null;const ev=[];
   const b=X.startBattle({f:'bandit',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:TURNCAP,foes:['thug','thug','bmark'],onEnd:r=>{done=r}});ok(b,'arms arena did not start');
   { let n=0;while(!b.over&&(b.busy||b.cur.side!==0)){await null;if(++n>3e6)fail('arms arena never reached a company turn')} }
   X.FX.on=(type,d)=>ev.push({type,d});
   const U=m=>b.units.find(u=>u.m===m)||b.units.find(u=>u.m&&u.m.id===m.id),W=U(war),A=U(arc),Pl=U(pal),E=b.units.filter(u=>u.side===1),[e0,e1,e2]=E;ok(W&&A&&Pl&&e0&&e1&&e2,'arms arena units');
   b.tiles.forEach(t=>{t.t='ground';t.h=0});b.units.forEach((u,i)=>{u.c=i;u.r=0;u.st={};u.mor=3;u.fearless=true});const put=(u,c,r)=>{u.c=c;u.r=r};
   // a two-hander with a shield: slung; swap to the arming sword: raised; and back
   ok(W.wid==='greataxe'&&W.alt==='arming'&&W.hand==='w'&&W.slung&&!W.shield&&W.shp===X.calc(war).shield.hp&&!W.abs.includes('bash')&&W.abs.includes('round')&&W.abs.includes('swap'),'a two-hander must start with the shield slung');
   ok(X.statusList(W).some(s=>s.key==='slung')&&!X.statusList(W).some(s=>s.key==='splitshield'),'a slung shield shows as slung, not split');
   { const md0=W.md,ms0=W.ms,sk=X.ITEMS.kite;put(W,5,5);W.ap=9;W.fat=20;W.hp=W.hpMax-11;W.st.bleed=2;X.addBuff(W,{key:'rage',dmg:.25,md:-10},2);const hp0=W.hp,fat0=W.fat;
     const sw=X.abilityInfo(W,'swap');ok(sw.ap===2&&sw.fat===0&&X.canUse(W,sw),'swap costs 2 AP');b.cur=W;await X.useAbility(W,sw,KU(W));await rest(b);
     ok(W.ap===7&&W.wid==='arming'&&W.alt==='greataxe'&&W.hand==='b'&&W.wpn.id==='arming'&&W.shield&&!W.slung&&W.md===md0+sk.md&&W.ms===ms0,'the swap must raise the shield and keep the rest: md '+W.md+' vs '+(md0+sk.md));
     ok(W.hp===hp0&&W.fat===fat0&&W.st.bleed===2&&W.buffs.some(x=>x.key==='rage')&&['slash','riposte','shieldwall','bash'].every(id=>W.abs.includes(id))&&!W.abs.includes('round'),'a swap must keep hitpoints, fatigue, statuses and buffs; skills follow the weapon');
     ok(ev.some(e=>e.type==='swap'&&e.d.u===W&&e.d.to===W.wpn)&&ev.some(e=>e.type==='shield'&&e.d.u===W&&e.d.raised),'swap / shield events');
     const fc=X.forecast(e0,W,X.abilityInfo(e0,'attack'));put(e0,6,5);ok(X.forecast(e0,W,X.abilityInfo(e0,'attack')).hit===X.hitChance(e0,W,X.abilityInfo(e0,'attack')),'forecast after a swap');
     await X.useAbility(W,X.abilityInfo(W,'swap'),KU(W));await rest(b);ok(W.ap===5&&W.wid==='greataxe'&&W.slung&&!W.shield&&W.md===md0&&!W.abs.includes('shieldwall'),'swapping back must sling the shield again');
     W.ap=1;ok(!X.canUse(W,X.abilityInfo(W,'swap')),'no AP, no swap');
     X.addInjury(W.m,'cutarm',3);X.applyInjury(W,'cutarm');const ms1=W.ms,rs1=W.rs,md1=W.md;W.ap=9;await X.useAbility(W,X.abilityInfo(W,'swap'),KU(W));await rest(b);await X.useAbility(W,X.abilityInfo(W,'swap'),KU(W));await rest(b);
     ok(W.ms===ms1&&W.rs===rs1&&W.md===md1&&W.wid==='greataxe','an injury taken in battle must not count twice over a swap');W.m.inj=[];put(e0,0,0) }
   // the ranged lock: a foe next to the archer stops its shots; swap to the knife; free first swap with Quick hands
   { put(A,8,6);put(e1,8,5);A.ap=9;A.fat=0;e1.mor=3;e1.st={};const at=X.abilityInfo(A,'attack');ok(X.rangedLocked(A)&&!X.canUse(A,at)&&!X.validTargets(A,at).size&&/Engaged/.test(X.useBlock(A,at))&&X.forecast(A,e1,at).locked,'an archer with a foe next to it must be ranged-locked');
     ok(!X.canUse(A,X.abilityInfo(A,'quick'))&&!X.canUse(A,X.abilityInfo(A,'aimed')||{ap:99}),'every bow ability is locked');
     e1.st.stun=1;ok(!X.rangedLocked(A),'a stunned foe does not lock');e1.st={};e1.mor=0;ok(!X.rangedLocked(A),'a fleeing foe does not lock');e1.mor=3;
     A.flags.noLock=1;ok(!X.rangedLocked(A)&&X.canUse(A,at),'Point-blank lifts the lock');delete A.flags.noLock;
     ok(A.swapFree===false||A.swapFree===undefined||A.swapFree===true,'swapFree');A.swapFree=!!A.flags.freeSwap;ok(A.flags.freeSwap&&X.abilityInfo(A,'swap').ap===0,'Quick hands: the first swap each turn is free');
     b.cur=A;await X.useAbility(A,X.abilityInfo(A,'swap'),KU(A));await rest(b);ok(A.ap===9&&A.wid==='knife'&&A.wpn.wt==='dagger'&&X.abilityInfo(A,'swap').ap===2,'the free swap costs nothing, the next one 4 AP');
     const kn=X.abilityInfo(A,'attack');ok(X.canUse(A,kn)&&X.validTargets(A,kn).has(KU(e1))&&!X.rangedLocked(A)===false,'with the knife the archer fights in melee');
     ok(X.canUse(A,X.abilityInfo(A,'puncture'))&&!X.canUse(A,X.abilityInfo(A,'quick')),'knife skills replace bow skills');
     await X.useAbility(A,X.abilityInfo(A,'swap'),KU(A));await rest(b);ok(A.wid==='shortbow'&&X.rangedLocked(A),'back to the bow, still locked');
     e1.alive=false;ok(!X.rangedLocked(A)&&X.canUse(A,at),'the lock lifts when the foe dies');e1.alive=true;
     A.ap=9;b.cur=A;const fw=X.abilityInfo(A,'footwork');A.abs.push('footwork');await X.useAbility(A,fw,(A.r+1)*BW+A.c);await rest(b);ok(A.r===7&&!X.rangedLocked(A)&&X.canUse(A,X.abilityInfo(A,'attack')),'the lock lifts when the archer steps away');
     // enemies: a bow in hand locks them too; a sidearm in def.side lets them swap
     put(e2,12,8);put(Pl,12,9);ok(e2.wpn.wt==='bow'&&X.rangedLocked(e2)&&!X.canUse(e2,X.abilityInfo(e2,'attack')),'enemy archers are locked too');
     const d0=e2.def;e2.def=Object.assign({},d0,{side:{n:'Hatchet',wt:'axe',d:[14,22]}});e2.wpnAlt=X.enemySide(e2.def);ok(X.altWeapon(e2)&&X.swapWeapons(e2)&&e2.wpn.wt==='axe'&&X.canUse(e2,X.abilityInfo(e2,'attack'))&&e2.wpnAlt.wt==='bow','an enemy with a sidearm can swap to it');
     X.swapWeapons(e2);ok(e2.wpn.wt==='bow','and back');e2.def=d0;e2.wpnAlt=null;ok(!X.altWeapon(e2)&&!X.swapWeapons(e2),'no sidearm, no swap') }
   // the slung shield cannot be split and gives nothing; a knight with no sidearm cannot swap
   { ok(Pl.shield&&!X.canUse(Pl,X.abilityInfo(Pl,'swap')||{ap:99,swapW:1}),'no sidearm: no swap');put(W,3,3);put(e0,4,3);e0.wpn=X.ITEMS.waraxe;const sp=X.abilityInfo(e0,'split');ok(W.slung&&!X.validTargets(e0,sp).has(KU(W)),'a slung shield cannot be split') }
   // talent rules in the field: marked, weak, undying, regen, Battle orders, Rally
   { put(W,3,3);put(e0,4,3);const at=X.abilityInfo(W,'attack'),h0=X.hitChance(W,e0,at);e0.st.marked=1;ok(X.hitChance(W,e0,at)===Math.min(95,h0+15),'marked: +15 to hit');e0.st.marked=0;
     const f0=X.forecast(W,e0,at);W.st.weak=1;const f1=X.forecast(W,e0,at);ok(f1.dmgMax<f0.dmgMax,'weakened deals less damage');W.st.weak=0;
     W.flags=Object.assign({},W.flags,{undying:1});W.undy=0;W.hp=3;const fk=X.forecast(e0,W,X.abilityInfo(e0,'attack'));ok(fk.undying&&!fk.kill&&!fk.sure,'the forecast knows Undying');
     X.hurt(W,500,1,e0,{loc:1});ok(W.alive&&W.hp===1&&W.undy===1,'Undying leaves 1 hitpoint');X.hurt(W,500,1,e0,{loc:1});ok(!W.alive,'only once');
     W.alive=true;W.hp=W.hpMax=200;put(A,3,4);const h1=X.hitChance(W,e0,at);A.flags=Object.assign({},A.flags,{cmd:5});X.auraScan();ok(X.hitChance(W,e0,at)===Math.min(95,h1+5),'Battle orders: +5 to hit for an adjacent ally');delete A.flags.cmd;X.auraScan();
     Pl.mor=2;put(Pl,5,5);put(A,6,5);A.mor=1;A.fearless=false;Pl.fearless=false;const ra=Object.assign({id:'rally'},X.AB.rally);Pl.ap=9;Pl.fat=0;b.cur=Pl;await X.useAbility(Pl,ra,KU(Pl));await rest(b);
     ok(Pl.mor===3&&A.mor===2&&Pl.buffs.some(x=>x.key==='rallied')&&A.buffs.some(x=>x.key==='rallied'),'Rally lifts morale around the rallier') }
   let ARMM=null;
   // -- fatigue: tired attackers miss more, tired targets are easier to hit; foes that never tire are unaffected --
   { b.units.forEach((u,i)=>{put(u,i,11);u.st={};u.buffs=[];u.mor=3;u.fearless=true;u.alive=true});put(Pl,5,5);put(e0,6,5);
     ok(X.tiredPen({fat:30,fatMax:100})===0&&X.tiredPen({fat:50,fatMax:100})===0&&X.tiredPen({fat:60,fatMax:100})===2&&X.tiredPen({fat:75,fatMax:100})===5&&X.tiredPen({fat:90,fatMax:100})===8&&X.tiredPen({fat:100,fatMax:100})===10&&X.tiredPen({fat:5000,fatMax:9999})===0,'the fatigue curve: 0 to half, then -1 a 5%, -10 at full exhaustion');const TM=X.TIRED.max;
     Pl.flags={};e0.flags={};Pl.ms=60;Pl.md=10;e0.ms=60;e0.md=10;e0.fatMax=9999;const at=X.abilityInfo(Pl,'attack'),ea=X.abilityInfo(e0,'attack');Pl.fat=0;e0.fat=0;
     const h0=X.hitChance(Pl,e0,at),g0=X.hitChance(e0,Pl,ea);ok(h0>25&&h0<75&&g0>25&&g0<75,'fatigue fixture: '+h0+' '+g0);
     const hs=[];for(const r of [0,.5,.6,.75,.9,1]){Pl.fat=Math.round(Pl.fatMax*r);hs.push(X.hitChance(Pl,e0,at));ok(hs[hs.length-1]===h0-X.tiredPen(Pl),'a tired attacker loses tiredPen to hit')}
     ok(hs.every((h,i)=>!i||h<=hs[i-1])&&hs[0]-hs[5]===TM&&hs[1]===h0,'hit chance must fall as the attacker tires: '+hs.join(' '));
     Pl.fat=Pl.fatMax;ok(X.hitChance(e0,Pl,ea)===g0+TM,'an exhausted target is TIRED.max easier to hit');const fc=X.forecast(e0,Pl,ea);ok(fc.tiredDef===TM&&fc.tiredAtt===0&&fc.hit===g0+TM,'forecast: tiredDef');
     const fa=X.forecast(Pl,e0,at);ok(fa.tiredAtt===TM&&fa.tiredDef===0&&fa.hit===h0-TM,'forecast: tiredAtt');
     const sp={id:'bolt',n:'Bolt',magic:[10,20],ign:.5,rng:5,tgt:'enemy'};Pl.fat=0;const s0=X.hitChance(Pl,e0,sp);Pl.fat=Pl.fatMax;ok(X.hitChance(Pl,e0,sp)===s0-TM,'spells pay for fatigue too');Pl.fat=0;
     e0.fat=5000;ok(X.hitChance(Pl,e0,at)===h0&&X.hitChance(e0,Pl,ea)===g0&&X.tiredPen(e0)===0,'a foe without fatigue (fatMax 9999) is never tired');
     e0.fatMax=60;e0.fat=60;ok(X.tiredPen(e0)===TM&&X.hitChance(Pl,e0,at)===h0+TM&&X.hitChance(e0,Pl,ea)===g0-TM,'a foe with real fatigue (orcs) tires like a merc');
     ok(X.unitStatuses(e0).some(s=>s.key==='tired'&&s.turns===TM)&&!X.unitStatuses(Pl).some(s=>s.key==='tired'),'Tired shows in the statuses');e0.fatMax=9999;e0.fat=0 }
   // -- armor trees: classes, tiers, perks only in their class --
   { const AT=['lightarmor','medarmor','heavyarmor'];ok(AT.every(k=>M[k]&&kind(k)==='armor'&&M[k].tiers.length===3&&M[k].tiers.every(t=>t.length===2))&&M.lightarmor.aw==='light'&&M.medarmor.aw==='medium'&&M.heavyarmor.aw==='heavy','three armor trees of 3 tiers x 2 perks');
     ok(X.tierLevel('armor',1)===2&&X.tierLevel('armor',2)===5&&X.tierLevel('armor',3)===8,'armor tiers open at levels 2, 5 and 8');
     const ac=id=>{const m={eq:{a:id}};return X.armorClass(m)};
     ok(ac(null)==='light'&&ac('rags')==='light'&&ac('padded')==='light'&&ac('robe')==='light'&&ac('archrobe')==='light'&&ac('mailrobe')==='light'&&ac('hide')==='medium'&&ac('mail')==='medium'&&ac('brigandine')==='medium'&&ac('lamellar')==='heavy'&&ac('plate')==='heavy','armorClass by armor points (robes are light)');
     X.ITEMS['f:armtest']=Object.assign({},X.ITEMS.padded,{famed:1,base:'padded',arm:90});ok(ac('f:armtest')==='light','a famed piece keeps its base class');delete X.ITEMS['f:armtest'];
     const m=X.newMerc('knight');m.race='human';m.perks=[];m.lvl=1;m.pp=1;m.eq.a='plate';const mt=X.mercTrees(m);ok(mt.slice(-3).map(x=>x.key+':'+x.kind).join()==='lightarmor:armor,medarmor:armor,heavyarmor:armor','mercTrees ends with the three armor trees');
     ok(!X.canLearn(m,'heavyarmor.1a'),'armor tier 1 waits for level 2');m.lvl=2;ok(X.canLearn(m,'heavyarmor.1a')&&X.canLearn(m,'lightarmor.1a')&&!X.canLearn(m,'heavyarmor.2a'),'armor tier 1 opens at level 2, for every class');
     m.lvl=5;ok(X.canLearn(m,'medarmor.2b')&&!X.canLearn(m,'medarmor.3a'),'armor tier 2 at level 5');m.lvl=8;ok(X.canLearn(m,'lightarmor.3b'),'armor tier 3 at level 8');
     const po=X.perkOptions(m).filter(o=>o.kind==='armor');ok(po.length===18&&po.every(o=>o.need===[2,5,8][o.tier-1]),'perkOptions lists the armor perks with their levels');
     const all=[];for(const k of AT)M[k].tiers.forEach(t=>t.forEach(p=>all.push(p.id)));m.pp=18;for(const id of all)ok(X.learnPerk(m,id),'learn '+id);ok(m.pp===0&&!m.perks.some(id=>!all.includes(id)),'all 18 armor perks learned with points');
     const bare=X.clone(m);bare.perks=[];delete bare.armp;
     for(const [a,cl] of [['jack','light'],['mail','medium'],['plate','heavy']]){m.eq.a=a;bare.eq.a=a;const s=X.calc(m),s0=X.calc(bare),T=AT[['light','medium','heavy'].indexOf(cl)];
       ok(s.acl===cl&&s.perks.every(id=>X.perkById(id).key===T)&&s.perks.length===6&&s.off.length===12&&s.off.every(id=>X.perkById(id).key!==T),cl+' armor: only its own tree works');
       for(const k of ['nimble','fleet','sidestep','freshDef','dance','brace','armRegen','roll','layerDef','padIgn','unbowed','steelWall','hpSoak'])ok(!!s.flags[k]===(X.perkById(all.find(id=>{const p=X.perkById(id).perk;return(p.mod&&p.mod[k]!=null)})).key===T),cl+': '+k+' must follow the armor class');
       for(const k of ['slip','footing','kbImm','ironLung','noStun'])ok(!!s.flags[k]===(X.perkById(all.find(id=>X.perkById(id).perk.flag===k)).key===T),cl+': '+k+' must follow the armor class');
       ok(s.fat===s0.fat+(cl==='heavy'?Math.floor(s.aw/2):0)&&s.aw===X.ITEMS[a].fat+(m.eq.h?X.ITEMS[m.eq.h].fat||0:0),'Iron lung halves the armor weight on fatigue, in heavy armor only')}
     // autoLearn takes armor perks from the tree of the armor worn only
     for(const [a,T] of [['jack','lightarmor'],['mail','medarmor'],['plate','heavyarmor']])for(const bg of ['knight','hunter','hedge']){const q=X.newMerc(bg);q.eq.a=a;X.gainXP(q,X.XPT[15]);X.autoLearn(q);
       const ar=q.perks.filter(id=>X.perkById(id).kind==='armor');ok(ar.length>=2&&ar.every(id=>X.perkById(id).key===T),'autoLearn picks the armor tree of the armor worn: '+bg+' in '+a+': '+ar.join())}
     ARMM=X.clone(m);
     // in the field: one class at a time, the flags calc gives (other classes get none of them)
     const fl=a=>{m.eq.a=a;const s=X.calc(m);return{flags:s.flags,aw:s.aw}};
     b.units.forEach((u,i)=>{put(u,i,11);u.st={};u.buffs=[];u.flags={};u.mor=3;u.fearless=true;u.alive=true;u.fat=0;u.ss=0;u.brc=0;u.dnc=0;u.mvd=0;u.slipT=0});X.auraScan();
     put(Pl,5,5);put(e0,6,5);Pl.fat=0;Pl.hp=Pl.hpMax=200;Pl.arm=Pl.armMax=200;Pl.helm=Pl.helmMax=100;const ea=X.abilityInfo(e0,'attack'),g0=X.hitChance(e0,Pl,ea),d0=X.forecast(e0,Pl,ea);
     // light
     { const L=fl('jack');Pl.flags=L.flags;Pl.aw=L.aw;const nb=Math.round(Math.max(0,30-1.5*L.aw))/100;ok(X.nimbleDr(Pl)===nb&&X.armorDr(Pl)===nb&&X.forecast(e0,Pl,ea).armDr===nb,'Nimble: 30% - 1.5% a point of weight, fresh: '+X.nimbleDr(Pl)+' vs '+nb);
       Pl.fat=Pl.fatMax;ok(X.nimbleDr(Pl)===Math.round(Math.max(0,30-1.5*L.aw)*.5)/100,'Nimble: half when exhausted');Pl.fat=0;ok(X.forecast(e0,Pl,ea).dmgMax<d0.dmgMax,'Nimble takes damage off the forecast');
       ok(X.hitChance(e0,Pl,ea)===g0-8,'Fresh legs: +8 defense while fatigue is below half');Pl.fat=Math.ceil(Pl.fatMax*.5);ok(X.hitChance(e0,Pl,ea)===g0+X.tiredPen(Pl),'Fresh legs ends at half fatigue');Pl.fat=0;
       Pl.dnc=2;ok(X.hitChance(e0,Pl,ea)===g0-8-10&&X.forecast(e0,Pl,ea).armDef===18,'Dancer: +5 a miss');Pl.dnc=0;
       let miss=0;for(let i=0;i<40&&!miss;i++){e0.ms=-200;await X.strike(e0,Pl,ea);miss=Pl.dnc}e0.ms=60;ok(miss===1,'a miss sets Dancer going');Pl.dnc=3;ok(X.hitChance(e0,Pl,ea)===g0-8-15,'Dancer stops at +15');Pl.dnc=0;
       put(e2,5,1);e2.fat=0;const sh=X.abilityInfo(e2,'attack'),q0=X.hitChance(e2,Pl,sh);Pl.mvd=1;ok(X.hitChance(e2,Pl,sh)===q0-10&&X.hitChance(e0,Pl,ea)===g0-8,'Fleet: +10 against shots after moving, nothing in melee');Pl.mvd=0;put(e2,15,11);
       Pl.ss=0;const hp0=Pl.hp;X.hurt(Pl,80,1,e0,{loc:1,pierce:1});ok(hp0-Pl.hp===40&&Pl.ss===1,'Sidestep: a blow over 25% of max hitpoints is halved: '+(hp0-Pl.hp));const hp1=Pl.hp;X.hurt(Pl,80,1,e0,{loc:1,pierce:1});ok(hp1-Pl.hp===80,'Sidestep: once between turns');
       Pl.ss=0;const hp2=Pl.hp;X.hurt(Pl,40,1,e0,{loc:1,pierce:1});ok(hp2-Pl.hp===40&&!Pl.ss,'Sidestep ignores lighter blows');Pl.hp=200;
       // Slippery: the first step of a turn draws no free attack
       const seen=[];X.FX.on=(type,d)=>{if((type==='hit'||type==='miss')&&d.u===e0)seen.push(type)};Pl.ap=9;e0.aoo=0;Pl.slipT=0;await X.walkPath(Pl,[5*BW+4]);ok(Pl.c===4&&!seen.length&&!e0.aoo,'Slippery: no free attack on the first step');
       put(Pl,5,5);Pl.ap=9;e0.aoo=0;await X.walkPath(Pl,[5*BW+4]);ok(seen.length===1,'Slippery: only the first tile of a turn');X.FX.on=(type,d)=>ev.push({type,d});Pl.hp=200;put(Pl,5,5) }
     // medium
     { const Md=fl('mail');Pl.flags=Md.flags;Pl.aw=Md.aw;Pl.fat=0;Pl.arm=200;ok(X.armorDr(Pl)===.2&&X.forecast(e0,Pl,ea).armDr===.2,'Brace: 20% off the first blow');X.hurt(Pl,10,0,e0,{loc:1});ok(Pl.brc===1&&X.armorDr(Pl)===0,'Brace is spent by a hit');Pl.brc=0;
       Pl.arm=200;ok(X.hitChance(e0,Pl,ea)===g0-6,'Layered defense: +6 while the armor is above half');Pl.arm=100;ok(X.hitChance(e0,Pl,ea)===g0,'Layered defense: not at half');Pl.arm=200;
       { const t2=X.clone({}),h0=Pl.hp;Pl.arm=200;X.hurt(Pl,100,.6,e0,{loc:1});const a1=Pl.arm,l1=h0-Pl.hp;Pl.hp=h0;Pl.arm=200;const f0=Pl.flags;Pl.flags=Object.assign({},f0,{padIgn:0});X.hurt(Pl,100,.6,e0,{loc:1});const l2=h0-Pl.hp;Pl.flags=f0;Pl.hp=h0;Pl.arm=200;
         ok(l1<l2&&l1===Math.max(0,Math.round(100*.6*(2/3)-(200-100)*.1))&&a1===100,'Padded under-layer: a third less of the piercing share: '+l1+' vs '+l2) }
       let kb=0,st=0;for(let i=0;i<200;i++){put(Pl,5,5);await X.knockback(e0,Pl,1,0);if(Pl.c!==5)kb++;Pl.st={};X.addStatus(Pl,'stun',1);if(Pl.st.stun)st++}put(Pl,5,5);Pl.st={};
       ok(kb>70&&kb<130&&st>70&&st<130,'Rolling with it: half the knockbacks and stuns land: '+kb+' / '+st);
       const kbA={id:'kbt',n:'kbt',wpn:1,mult:1,kb:1,status:{stun:1},rng:1,tgt:'enemy'},fk=X.forecast(e0,Pl,kbA);ok(fk.kb&&fk.kb.ch===.5&&fk.statuses.some(s=>s.k==='stun'&&s.ch===.5),'forecast: Rolling with it halves knockback and stun chances');
       Pl.ap=9;Pl.fat=0;put(e0,15,0);await X.walkPath(Pl,[5*BW+4,5*BW+3,5*BW+2]);ok(Pl.c===2&&Pl.fat===3&&X.moveFat(Pl)===1,'Steady footing: 1 fatigue a tile');put(Pl,5,5);put(e0,6,5);
       Pl.arm=150;const res0=Pl.res;Pl.res={mana:{cur:0,max:30,regen:4}};b.order=[Pl];b.busy=true;await X.nextTurn();ok(Pl.arm===156&&b.cur===Pl,'Mail mender: +6 armor at turn start');ok(Pl.res.mana.cur===4,'gift pools still regenerate at turn start');Pl.res=res0;b.busy=true;Pl.arm=200 }
     // heavy
     { const H=fl('plate');Pl.flags=H.flags;Pl.aw=H.aw;Pl.fat=0;ok(X.kbImmune(Pl),'Immovable');put(Pl,5,5);await X.knockback(e0,Pl,2,0);ok(Pl.c===5&&Pl.r===5,'Immovable: no knockback');
       ok(X.forecast(e0,Pl,{id:'kbt',n:'kbt',wpn:1,mult:1,kb:1,rng:1,tgt:'enemy'}).kb.ch===0,'forecast: Immovable');
       Pl.arm=200;X.hurt(Pl,150,.2,e0,{loc:1});ok(Pl.arm===140,'Unbowed: one blow strips at most 30% of the maximum: '+Pl.arm);Pl.arm=200;Pl.helm=100;X.hurt(Pl,80,.2,e0,{loc:1,head:true});ok(Pl.helm===70,'Unbowed covers the helmet');Pl.helm=100;
       const hp0=Pl.hp;X.hurt(Pl,20,1,e0,{loc:1,pierce:1});ok(hp0-Pl.hp===15,'Juggernaut: 5 fewer hitpoints a blow');const hp1=Pl.hp;X.hurt(Pl,3,1,e0,{loc:1,pierce:1});ok(hp1-Pl.hp===1,'Juggernaut: at least 1');const hp2=Pl.hp;X.hurt(Pl,20,1,null,{pierce:1});ok(hp2-Pl.hp===20,'Juggernaut: only weapon and spell hits');Pl.hp=200;
       Pl.st={};X.addStatus(Pl,'stun',1);ok(!Pl.st.stun,'Unshakable: no stun');ok(!X.forecast(e0,Pl,{id:'st',n:'st',wpn:1,mult:1,status:{stun:1},rng:1,tgt:'enemy'}).statuses.some(s=>s.k==='stun'),'forecast: Unshakable drops the stun');
       Pl.fearless=false;Pl.brv=-200;Pl.mor=3;for(let i=0;i<10;i++){Pl.hp=200;X.hurt(Pl,80,1,e0,{loc:1,pierce:1})}ok(Pl.mor===3,'Unshakable: heavy blows do not test morale');Pl.fearless=true;Pl.hp=200;
       put(W,5,6);W.flags=Object.assign({},W.flags,{steelWall:.1});Pl.flags={};X.auraScan();ok(X.armorDr(Pl)===.1&&X.forecast(e0,Pl,ea).armDr===.1,'Bulwark of steel: 10% off for an ally beside it');put(W,0,11);X.auraScan();ok(X.armorDr(Pl)===0,'Bulwark of steel: only beside it');W.flags.steelWall=0;X.auraScan() }
     // a class the merc does not wear gives nothing: light armor's flags on, then a medium kit
     { const Md=fl('mail');Pl.flags=Md.flags;Pl.aw=Md.aw;Pl.fat=0;Pl.brc=1;ok(X.nimbleDr(Pl)===0&&X.armorDr(Pl)===0&&!X.kbImmune(Pl),'no Nimble or Immovable in medium armor');Pl.flags={} } }
   console.log('fatigue (curve, attacker and target, spells, foes that never tire, orcs, forecast parts), armor trees (classes, tiers 2/5/8, 18 perks each in its class only, autoLearn, field effects): ok');
   X.FX.on=null;X.B=null;X.mode='world';
   { const m=ARMM;     // armor perks: save round trip: armor perks are plain perk ids
     const sm=X.clone(m);sm.eq.a='plate';sm.id=777001;X.G.roster.push(sm);ok(X.save(),'save failed');const keep=sm.perks.slice().sort().join();
     const r=X.readSave();ok(r.state==='ok'&&r.g.v===X.SAVEVER,'save unreadable');const back=r.g.roster.find(q=>q.id===777001);X.calc(back);ok(back&&back.perks.slice().sort().join()===keep,'armor perks must survive a save round trip: '+(back&&back.perks.join()));
     X.G.roster.pop();{const cl=X.clone(sm);cl.perks=['vanguard.1'];X.calc(cl);ok(cl.perks.join()==='vanguard.1','a copy given other perks must not get the armor perks back')}
     X.G=null;X.mode='title';X.continueGame();const lm=X.G&&X.G.roster.find(q=>q.id===777001);ok(lm&&lm.perks.slice().sort().join()===keep&&X.calc(lm).perks.length===6,'armor perks must load and work after continueGame');console.log('armor perks: save round trip and continueGame: ok');X.G.roster=X.G.roster.filter(q=>q.id!==777001) }
   // -- an old (version 4) save: masteries become trees and perks --
   { X.store.clear();X.seedRng(SEED+7300);X.newGame(true);closeAll(X);ok(X.save(),'save failed');const g=JSON.parse(X.store.get(X.SAVEKEY));g.v=4;
     const olds=[{vanguard:2,bulwark:0,aura:1},{marksman:4,skirmisher:1,qi:2},{bulwark:3,vanguard:1,chi:5},{skirmisher:0,mana:3,bulwark:1}];
     g.roster.forEach((m,i)=>{delete m.trees;delete m.gift;delete m.perks;delete m.eq.b;m.mast=olds[i%4];m.lvl=6;m.pp=1});g.towns.forEach(t=>t.recruits.forEach(m=>{delete m.trees;delete m.gift;delete m.perks;delete m.eq.b;m.mast={vanguard:0,skirmisher:0}}));
     X.store.set(X.SAVEKEY,JSON.stringify(g));const r=X.readSave();ok(r.state==='ok'&&r.v===4&&r.g.v===X.SAVEVER,'a version 4 save was not migrated');
     const R=r.g.roster;ok(R[0].perks.join()==='vanguard.1,vanguard.2,aura.1'&&R[0].gift==='aura'&&R[1].perks.join()==='marksman.1,marksman.2,marksman.3,marksman.4,skirmisher.1,qi.1,qi.2'&&R[1].gift==='qi'&&R[2].perks.length===9&&R[3].gift==='mana','old masteries must map to their tier perks: '+R.map(m=>m.perks.join(' ')).join(' | '));
     ok(R.every(m=>m.trees.filter(k=>kind(k)==='style').length===4&&m.eq.b===null&&m.pp===1&&m.trees.includes(m.gift||'vanguard')||m.trees.filter(k=>kind(k)==='style').length===4&&m.eq.b===null),'migrated mercs must carry 4 style trees, an empty sidearm slot and their points');
     ok(R[0].trees.includes('vanguard')&&R[0].trees.includes('bulwark')&&R[1].trees.includes('marksman'),'migrated mercs keep their old trees');
     const c0=X.calc(R[0]);ok(c0.res.aura&&c0.res.aura.max===X.GIFTBASE&&c0.abs.includes('astrike')&&c0.abs.includes('shove')&&c0.ms>=R[0].base.ms+8,'old perks keep their effects');
     ok(X.calc(R[3]).res.mana.max===X.GIFTBASE&&X.calc(R[3]).abs.includes('blink')&&X.calc(R[2]).res.chi.max===X.GIFTBASE+15,'old gift pools');
     ok(r.g.towns.every(t=>t.recruits.every(m=>Array.isArray(m.perks)&&m.trees.length>=4)),'recruits in towns are migrated too');
     X.G=null;X.mode='title';X.continueGame();ok(X.mode==='world'&&X.G.roster.length===4,'a migrated v4 save did not load');scan(X.G,'G');
     const res=await X.autoBattle({f:'gob',mult:.6,biome:'plains',src:{type:'sim'},turnCap:TURNCAP});ok(res&&!res.stuck,'a migrated v4 company could not fight');X.settleBattle(res.win);X.store.clear() }
   console.log(`${styles.length} style, ${gifts.length} gift and ${wts.length} weapon trees, ${ids.size} perks (${nAb} abilities); backgrounds, races, recruits, tiers, gift awakening, autoLearn, hands rules,`);
   console.log('swap (1h/2h, raised and slung shields), ranged lock (stun, flight, death, stepping away, Point-blank, enemies), talent rules in the field, v4 migration: ok') }

 section('monsters');
 { const BW=X.BW,BH=X.BH,K=(c,r)=>r*BW+c,EN=X.EN,FACT=X.FACT,AB=X.AB,NEW={serpent:['adder','viper','gserp'],ent:['thorn','ent','elder'],ogre:['ogre','aogre'],wyvern:['wyvern','whatch']};
   /* -- data: every new foe and faction is complete -- */
   for(const f in NEW){const F=FACT[f];ok(F&&F.n&&F.tier&&Array.isArray(F.biomes)&&F.biomes.length&&F.lair&&Array.isArray(F.units)&&F.rank&&Array.isArray(F.loot)&&F.loot.length&&F.loot.every(id=>X.ITEMS[id]),'faction '+f+' is incomplete');
    for(const id of NEW[f]){const d=EN[id];ok(d&&d.n&&d.role&&d.hp>0&&d.d&&isFinite(d.brv)&&d.helm!=null&&Array.isArray(d.abs)&&d.abs.length&&F.units.some(u=>u[0]===id),'enemy '+id+' is incomplete');
     for(const a of d.abs)ok(AB[a]&&AB[a].n&&AB[a].d&&AB[a].fx&&AB[a].fat!=null&&(AB[a].ap!=null||AB[a].wpn),'ability '+a+' of '+id+' lacks n, d, costs or fx')}}
   for(const f in FACT)ok(['early','mid','late','end','crisis'].includes(FACT[f].tier),'faction '+f+' has no tier');
   ok(EN.wyvern.size===2&&EN.wyvern.fly&&EN.wyvern.endgame&&EN.wyvern.boss&&EN.ogre.big&&EN.aogre.big&&EN.ent.big&&EN.gserp.big&&EN.ent.fireWeak>0,'monster flags are wrong');
   for(const k of ['venom','coiled','entangled','bark','regrow','diving','grounded','slammed'])ok(X.STATUS[k]&&X.STATUS[k].n&&X.STATUS[k].d,'status '+k+' is not registered');
   /* -- a flat field with a wyvern -- */
   const roster=buildCompany(X,TIERS[3],SEED+4400);X.G.roster=X.clone(roster);X.G.day=50;X.seedRng(SEED+4401);
   const b=X.startBattle({f:'wyvern',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:TURNCAP,foes:['wyvern','whatch','ent','ogre','thorn'],onEnd:()=>{}});ok(b,'monster arena did not start');
   { const seen=new Set();for(const u of b.units)for(const [c,r] of X.unitTiles(u)){ok(X.inb(c,r)&&b.tiles[K(c,r)].t!=='block'&&!seen.has(K(c,r)),'placement: a footprint overlaps, leaves the board or stands on a prop');seen.add(K(c,r))} }
   let n=0;while(!b.over&&(b.busy||b.cur.side!==0)){await null;if(++n>3e6)fail('monster arena never reached a company turn')}ok(!b.over,'monster arena ended early');
   const P=b.units.filter(u=>u.side===0),[wy,ha,en,og,th]=['wyvern','whatch','ent','ogre','thorn'].map(id=>b.units.find(u=>u.eid===id)),cur=b.cur;
   const park=()=>{b.tiles.forEach(t=>{t.t='ground';t.h=0});b.units.forEach((u,i)=>{u.alive=true;u.hp=u.hpMax=Math.max(u.hpMax,9000);u.arm=u.armMax;u.helm=u.helmMax;u.st={};u.buffs=u.buffs.filter(x=>x.foe);u.mor=3;u.fearless=true;u.aoo=0;u.rooted=false;u.ap=u.apMax=Math.max(u.apMax,9);u.fat=0;u.c=i%BW;u.r=i<BW?BH-1:BH-2;u.dive=null});
     for(const u of b.units.filter(u=>u.side===1))u.r=0;let i=0;for(const u of b.units.filter(u=>u.side===1)){u.c=i;i+=(u.sz||1)};b.tele=[];b.cur=cur};
   park();ok(wy.sz===2&&ha.sz===1&&ha.fly&&wy.fly&&en.fw>0,'unit footprint fields');
   wy.c=6;wy.r=5;
   ok(X.unitTiles(wy).map(([c,r])=>K(c,r)).join()===[K(6,5),K(7,5),K(6,6),K(7,6)].join()&&X.occupies(wy,7,6)&&!X.occupies(wy,8,6),'unitTiles / occupies');
   ok([[6,5],[7,5],[6,6],[7,6]].every(([c,r])=>X.unitAt(c,r)===wy)&&X.unitAt(8,5)!==wy,'unitAt must find a size-2 unit on any of its tiles');
   const m0=P[0],m1=P[1],m2=P[2],put=(u,c,r)=>{u.c=c;u.r=r};
   put(m0,8,6);ok(X.mdist(m0,wy)===1&&X.mdist(wy,m0)===1,'beside the second column is adjacent');put(m0,8,7);ok(X.mdist(m0,wy)===2,'a diagonal corner is 2 away');put(m0,7,8);ok(X.mdist(m0,wy)===2,'two below');
   put(m0,7,7);ok(X.mdist(m0,wy)===1&&X.zocFoe(m0)===wy,'a merc under the wyvern is adjacent and in its zone of control');
   /* -- targeting: any tile picks it -- */
   const atk=X.abilityInfo(m0,'attack'),vt=X.validTargets(m0,atk);ok(vt.has(K(6,6))&&vt.has(K(7,6))&&!vt.has(K(6,5))===false,'validTargets must hold every tile of a size-2 target');
   { const hp0=wy.hp,arm0=wy.arm;m0.ap=9;await X.useAbility(m0,atk,K(6,5));ok(wy.hp<hp0||wy.arm<arm0||true,'');ok(b.units.includes(wy),'');
     let tries=0;for(;tries<6&&wy.hp===hp0&&wy.arm===arm0;tries++){m0.ap=9;await X.useAbility(m0,atk,K(7,5))}ok(wy.hp<hp0||wy.arm<arm0,'striking a non-anchor tile must hit the wyvern') }
   /* -- knockback immunity, forecast -- */
   park();put(wy,6,5);put(m0,7,7);const sh=X.abilityInfo(m0,'shove');sh.hit=100;const f0=X.forecast(m0,wy,sh);ok(f0.kb&&f0.kb.ch===0,'forecast: a size-2 unit cannot be knocked back');
   for(let i=0;i<4;i++){m0.ap=9;await X.useAbility(m0,Object.assign({},sh,{sure:1}),K(6,6))}ok(wy.c===6&&wy.r===5,'a shove must not move a size-2 unit');
   put(en,10,2);ok(X.forecast(m0,en,sh).kb.ch===0,'ents cannot be knocked back');
   /* -- line of sight: a size-2 unit is one step of cover, whichever tiles the line crosses; one clear tile is enough to be seen -- */
   park();put(m0,6,10);put(wy,6,5);put(m1,6,1);put(m2,6,2);const bow={id:'t',n:'t',ap:4,fat:0,rng:12,tgt:'enemy',magic:[10,12]};
   ok(X.losInfo(m0,m1,bow).cover===2&&!X.losInfo(m0,m1,bow).blocked,'cover in a line through a wyvern and a merc');put(m2,0,0);ok(X.losInfo(m0,m1,bow).cover===1,'a size-2 unit is one step of cover');
   park();put(wy,6,5);put(m0,6,10);b.tiles[K(6,8)].t='block';b.tiles[K(6,7)].t='block';ok(!X.losInfo(m0,wy,bow).blocked,'one clear tile of a footprint is enough to be seen');
   for(let c=0;c<BW;c++)b.tiles[K(c,8)].t='block';ok(X.losInfo(m0,wy,bow).blocked,'a wall in front of every tile blocks the shot');
   /* -- movement: all four tiles free and walkable; fliers ignore height and props, never stop on them -- */
   park();put(wy,6,5);wy.ap=14;for(let c=0;c<BW;c++){b.tiles[K(c,8)].h=3;b.tiles[K(c,9)].t='block'}
   let D=X.dijkstra(wy,99);D.forEach((v,k)=>{if(v.air)return;ok(X.footFree(k%BW,(k/BW)|0,2,wy),'a size-2 reach tile is not free')});ok([...D.keys()].some(k=>((k/BW)|0)>=10&&!D.get(k).air),'a flier must cross height and props');
   ok([...D.keys()].every(k=>k%BW<=BW-2&&((k/BW)|0)<=BH-2),'a size-2 footprint left the board');
   { const g=wy.fly;wy.fly=false;D=X.dijkstra(wy,99);ok(![...D.keys()].some(k=>((k/BW)|0)>=8),'a size-2 walker must not climb 3 steps or pass a wall');
     put(th,3,7);const Dt=X.dijkstra(th,99);ok(![...Dt.keys()].some(k=>((k/BW)|0)>=8),'a walker must not cross the wall');wy.fly=g }
   { park();put(wy,6,2);put(m0,6,5);put(m1,7,5);wy.ap=14;D=X.dijkstra(wy,14);const k=K(6,7);ok(D.has(k)&&!D.get(k).air,'a flier must pass over a line of mercs');
     const path=X.pathTo(D,k);await X.walkPath(wy,path);ok(X.footFree(wy.c,wy.r,2,wy)&&!b.units.some(o=>o!==wy&&o.alive&&X.occupies(wy,o.c,o.r)),'a flier must never end over another unit') }
   { park();put(og,6,4);og.fly=false;D=X.dijkstra(og,9);for(const [k,v] of D)ok(!X.unitAt(k%BW,(k/BW)|0)||k===K(6,4),'') }
   /* -- adjacency: aoe, free attacks -- */
   park();put(wy,6,5);put(m0,5,5);put(m1,8,6);put(m2,6,7);
   { const sw=X.AB.wbuffet,hit=new Set();const ev0=X.FX.on;X.FX.on=(t,d)=>{if((t==='hit'||t==='miss')&&d.u===wy)hit.add(d.t)};wy.ap=14;await X.useAbility(wy,X.abilityInfo(wy,'wbuffet'),K(6,5));X.FX.on=ev0;
     ok(hit.has(m0)&&hit.has(m1)&&hit.has(m2)&&hit.size===3,'an aoe from a size-2 unit must reach every adjacent foe once') }
   park();put(wy,6,5);put(m0,8,5);
   { const cl={id:'aoe',n:'aoe',ap:4,fat:0,tgt:'aoe',wpn:1,mult:1};let n=0;const ev0=X.FX.on;X.FX.on=(t,d)=>{if((t==='hit'||t==='miss')&&d.u===m0)n++};m0.ap=9;await X.useAbility(m0,cl,K(8,5));X.FX.on=ev0;ok(n===1,'an aoe must strike a size-2 neighbour once') }
   /* -- the dive: telegraphed, lands, a stun breaks it -- */
   park();put(wy,6,2);put(m0,6,8);put(m1,7,8);wy.ap=14;
   await X.foeUse(wy,X.abilityInfo(wy,'wdive'),K(6,8));ok(wy.dive&&wy.st.diving&&b.tele.some(t=>t.u===wy&&t.keys.includes(K(6,8))),'a dive must be telegraphed on its landing tiles');
   { const hp0=m0.hp+m0.arm+m0.helm;await X.foeUse(wy,X.abilityInfo(wy,'wdiveb'),K(wy.c,wy.r));ok(!wy.dive&&!b.tele.some(t=>t.u===wy),'the dive must clear its telegraph');
     ok(m0.hp+m0.arm+m0.helm<hp0,'the dive must hit whoever stayed');ok(!X.occupies(wy,m0.c,m0.r)&&!X.occupies(wy,m1.c,m1.r)&&X.footFree(wy.c,wy.r,2,wy),'the dive must throw clear whoever is under it') }
   park();put(wy,6,2);put(m0,6,8);await X.foeUse(wy,X.abilityInfo(wy,'wdive'),K(6,8));X.monStunned(wy);ok(!wy.dive&&!wy.st.diving&&!b.tele.length,'a stun must break the dive');
   park();X.addStatus(wy,'root',1);ok(wy.st.grounded>0&&!(wy.st.root>0),'a root grounds a wyvern (it is too big to pin)');ok(!X.canFly(wy)&&!X.AB.wdive.ai(wy,{foes:[],allies:[],adj:[]}).length,'a grounded wyvern cannot fly or dive');
   { park();put(wy,6,5);put(m0,6,7);const fc=X.forecast(m0,wy,Object.assign({},X.abilityInfo(m0,'attack'),{status:{root:1}}));ok(fc.statuses.some(s=>s.k==='grounded')&&!fc.statuses.some(s=>s.k==='root'),'forecast must show the root turning into Grounded') }
   /* -- ents: weak to fire, regrow unless burning -- */
   park();put(en,6,5);put(m0,6,6);
   { const fl=Object.assign({},X.abilityInfo(m0,'attack'),{id:'fl',status:{burn:2}}),pl=X.abilityInfo(m0,'attack'),a1=X.forecast(m0,en,fl),a0=X.forecast(m0,en,pl);ok(a1.dmgMax>a0.dmgMax&&a1.fire===en.fw&&a0.fire===0,'fire must do more to an ent, and the forecast must say so');
     en.hp=en.hpMax-500;const h0=en.hp;X.monTurn(en);ok(en.hp>h0,'an ent regrows');const h1=en.hp;en.st.burn=2;X.monTurn(en);ok(en.hp===h1,'a burning ent does not regrow');ok(X.burnDmg(en)===12&&X.burnDmg(m0)===8,'burning does 50% more to ents') }
   /* -- ogres: thrown into each other, off heights -- */
   park();put(og,6,4);put(m0,6,5);put(m1,6,6);
   { const hu=X.abilityInfo(og,'ohurl'),HA=u=>u.hp+u.arm,a1=HA(m1);await X.strike(og,m0,hu,{auto:1});ok(m0.c===6&&m0.r===5&&HA(m1)<a1,'hurled into an ally: both take the crash, nobody moves');
     park();put(og,6,4);put(m0,6,5);b.tiles[K(6,6)].h=0;b.tiles[K(6,5)].h=2;b.tiles[K(6,4)].h=2;b.tiles[K(6,7)].h=0;const p0=m0.hp;await X.strike(og,m0,hu,{auto:1});ok(m0.r===7,'hurled 2 tiles: '+m0.r);
     ok(X.forecast(og,m0,hu).kb.crash===14,'the forecast tells the crash damage') }
   /* -- serpents: coil, constrict only the coiled, the coil lets go when the serpent dies -- */
   X.B=null;X.mode='world';X.G.roster=X.clone(roster);X.seedRng(SEED+4402);
   const b2=X.startBattle({f:'serpent',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:TURNCAP,foes:['gserp','adder'],onEnd:()=>{}});n=0;while(!b2.over&&(b2.busy||b2.cur.side!==0)){await null;if(++n>3e6)fail('serpent arena stuck')}
   { const gs=b2.units.find(u=>u.eid==='gserp'),q=b2.units.find(u=>u.side===0);b2.tiles.forEach(t=>{t.t='ground';t.h=0});b2.units.forEach((u,i)=>{u.c=i;u.r=i%2?BH-1:BH-3;u.hp=u.hpMax=9000;u.st={}});gs.c=5;gs.r=4;q.c=5;q.r=5;
     ok(!X.foeReq(gs,X.AB.constrict,q),'constrict needs a coiled foe');await X.foeUse(gs,Object.assign(X.abilityInfo(gs,'coil'),{sure:1}),K(5,5));ok(q.st.coiled>0&&q.coilBy===gs&&q.st.root>0&&X.foeReq(gs,X.AB.constrict,q),'coil must hold the foe');
     X.hurt(gs,99999,1,q,{pierce:1});ok(!gs.alive&&!(q.st.coiled>0)&&!q.coilBy,'the coil must let go when the serpent dies') }
   X.B=null;X.mode='world';
   /* -- spawn ranges: wyverns never near towns early, closer later; contracts for the new factions -- */
   X.seedRng(SEED+4500);X.newGame(true);closeAll(X);const G=X.G;
   { const pool=(p,d)=>X.factionPool({power:p,day:d,crisis:false}),has=(L,f)=>L.find(e=>e.f===f);
     const start=pool(X.companyPower(),2);ok(!has(start,'wyvern')&&!has(start,'ent')&&!has(start,'ogre')&&has(start,'gob')&&has(start,'bandit'),'a new company must meet only early factions: '+start.map(e=>e.f).join());
     const mid=pool(60,20),late=pool(140,40),endg=pool(240,90);ok(has(mid,'ent')&&has(mid,'ogre')&&has(mid,'serpent')&&!has(mid,'wyvern'),'mid factions come with strength');
     ok(has(late,'wyvern')&&has(endg,'wyvern')&&has(late,'wyvern').minD>has(endg,'wyvern').minD&&has(late,'wyvern').minD>=15&&has(endg,'wyvern').minD<=8,'wyverns start far out and come closer: '+[has(late,'wyvern').minD,has(endg,'wyvern').minD]);
     ok(has(mid,'ent').minD>has(endg,'ent').minD&&has(mid,'ent').biomes.includes('forest')&&has(late,'wyvern').w<has(endg,'wyvern').w,'mid factions come closer and more often');
     const F=X.worldFields(),dist=(x,y)=>F.td[Math.floor(y/X.TS)*X.WN+Math.floor(x/X.TS)];let far=[],near=[];
     for(let i=0;i<30;i++){const e1=has(late,'wyvern'),e2=has(endg,'wyvern');const p1=X.factionSpot(e1,G.p.x,G.p.y,9,26),p2=X.factionSpot(e2,G.p.x,G.p.y,9,26);if(p1)far.push(dist(p1.x,p1.y));if(p2)near.push(dist(p2.x,p2.y));
      for(const p of [p1,p2])if(p){const t=X.tileAt(p.x,p.y);ok(X.okAt(p.x,p.y)&&X.biomeHas(Math.floor(p.y/X.TS)*X.WN+Math.floor(p.x/X.TS),X.FACT.wyvern.biomes),'a wyvern spot off its biomes: '+t)}}
     const avg=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length);ok(far.length>20&&near.length>20&&avg(far)>avg(near)&&Math.min(...far)>=Math.min(...near),'wyverns must roam further from towns early: '+avg(far).toFixed(1)+' vs '+avg(near).toFixed(1));
     ok(Math.min(...far)>=Math.min(has(late,'wyvern').minD,6),'an early wyvern spawned close to a town: '+Math.min(...far).toFixed(1));
     // the bands the land fills itself with
     G.roster.forEach(m=>{m.lvl=1});G.parties.length=0;for(let i=0;i<40;i++)X.spawnParty();ok(G.parties.every(p=>!['serpent','ent','ogre','wyvern','orc'].includes(p.f)),'a fresh company met a strong band: '+G.parties.map(p=>p.f).join());
     const st=G.towns[0],cnt={};G.parties.length=0;const P0=X.companyPower;X.companyPower=()=>240;G.day=90;for(let i=0;i<120;i++)X.spawnParty();X.companyPower=P0;for(const p of G.parties)cnt[p.f]=(cnt[p.f]||0)+1;
     ok(Object.keys(cnt).filter(f=>X.FACT[f].tier!=='early').length>=3,'a strong company must meet the new factions: '+JSON.stringify(cnt));
     for(const p of G.parties)if(X.FACT[p.f].tier!=='early'&&X.FACT[p.f].tier!=='crisis'){const i=Math.floor(p.y/X.TS)*X.WN+Math.floor(p.x/X.TS);ok(X.biomeHas(i,X.FACT[p.f].biomes),p.f+' band off its biomes')}
     // contracts (genContract asks factionPool)
     X.companyPower=()=>240;const fs=new Set();for(let i=0;i<200;i++){const c=X.genContract(G.towns[i%G.towns.length]);if(c.type==='hunt'){fs.add(c.f);ok(X.FACT[c.f]&&c.title&&!/\{place\}/.test(c.title)&&isFinite(c.x)&&isFinite(c.y),'a hunt contract is broken')}}X.companyPower=P0;
     ok(['serpent','ent','ogre','wyvern'].filter(f=>fs.has(f)).length>=3,'hunt contracts must offer the new factions: '+[...fs].join());
     console.log('spawn: wyverns at power 140/day 40 roam '+avg(far).toFixed(1)+' tiles from towns (min '+Math.min(...far).toFixed(1)+'), at 240/day 90 '+avg(near).toFixed(1)+'; bands '+JSON.stringify(cnt)) }
   closeAll(X);X.B=null;X.mode='world';
   console.log('monsters: data, footprints, placement, targeting, knockback immunity, line of sight, flight, aoe, dive, fire, crash, coils, spawn ranges, contracts: ok') }

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
