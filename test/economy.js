// Economy curves: a headless campaign driver that plays a sensible strategy for N days and reports the run by day.
//   node test/economy.js [--quick] [--days D] [--seeds a,b,c] [--origins free,noble] [--diffs normal,hard] [--jobs J] [--json file] [--verbose]
//                        [--set "JS statement"] (tuning experiments, as in test/balance.js)
// Loads src/*.js in a vm context (DOM stubs, as test/headless.js), raises a company with newGame(true, {origin, diff}) and plays it:
//   in a town: turn in the contract (openTown does), rest at the inn when hurt, the temple for long wounds, tools and repairs, sell loot,
//   level-ups (hp/skill/defence picks) and perks (autoLearn), hire to 12 while the purse allows (a reserve for a week of wages), buy gear
//   upgrades for the swords who gain most (within its trees: same weapon kind, armor class it trains), food for ten days, take the
//   best-paying contract whose fights are within its strength (contract mult <= the company's appetite, lower when hurt or thin, and
//   light jobs only while its best eight are green: a struck-down sword lives 30% of the time);
//   on the road: fight what comes (the game's own encounters, sensible pilot), hunt weak bands near it when idle, camp when hurt far from
//   town, drill in camp (campTrain) when it has the crowns; the Eastern War: picks the houses' side; the crisis: hunts its hosts and
//   breaks its sieges near, and when the company is strong (or the doom is high) goes for the end: rifts (portal runs), the throne,
//   the camp assaults.
// Reports per run and day (1, 5, 10, ... N): crowns, food, roster size / mean level, gear tier (worn armor+weapon), renown tier, deaths,
// contracts done, battles; the day the crisis starts and how it ends, the day the Eastern War fires and its outcome; an estimate of
// the play time (battles x minutes a battle by its length + days x minutes of map play). Judged (exit 1) on: no bankrupt wipe-outs before day 40
// on Normal (by bankruptcy: broke the week before), crowns never above RUNAWAY on Normal by day 60, food never at 0 for 3 days running, mean level rising, the crisis
// arriving after day 20 and the Eastern War after day 25 (mean level flat is noted, not judged); the flows (contract pay in days of wages for
// model companies, FLOWBAND; --flows runs only these) and the hoard (the median Normal purse on days 60-100 under HOARD).
// The ledger (per run and ten-day window, --json): crowns in and out by source: contracts, strip (crowns off the field), sales, trade, cargo,
// rival, caravan, escort, garrison, crisis, east, endgame, dungeon, colosseum, events; wages, hire, gear, temple, food, inn, tools, drill, withdraw.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),os=require('os');
const ARGV=process.argv.slice(2),arg=(k,d)=>ARGV.includes(k)?ARGV[ARGV.indexOf(k)+1]:d,has=k=>ARGV.includes(k);
const SRC=path.join(__dirname,'..','src'),QUICK=has('--quick'),DAYS=+arg('--days',QUICK?60:100),TURNCAP=4000;
const SEEDS=arg('--seeds',QUICK?'11,23':'11,23,37,41').split(',').map(Number),ORIG=arg('--origins',QUICK?'free':'free,noble,deserters').split(','),DIFFS=arg('--diffs',QUICK?'normal':'normal,hard,story').split(',');
const RUNAWAY=60000,HOARD=15000;   // runaway: no Normal or Hard run above it by day 60; hoard: the median Normal run below it on days 60-100
/* The flows (judged, policy-free, a second): what a contract pays in days of the company's wages, for the balance profiles (test/balance.js:
   L1x4 a new company, L4x6 day 12 Known, L8x9 day 30 Renowned, L12x12 day 50 Famed and Legendary), the mean of 300 boards' notices.
   Target band FLOWBAND: a contract pays 3-6 days of the company's wages at every stage (wages grow exponentially with level to x5-x7 at 15
   by the background's rarity, 14-company.js WAGELV / wageLvK; pay with power, renown, danger and the swords' levels, 16-contracts.js
   CTRPAY / ctrVetK / RENOWN.pay / CTR_PAYK). Before the econ rebalance it paid 8 days for a
   new company and 26-51 days of wages late: the mid and late game's runaway purse. */
const FLOWBAND=[3,6];
// The roster variants (reported, judged against FLOWBAND_X): the same swords (levels, gear, power) under the commonest (BGC: tavern weight 4-5)
// or the rarest backgrounds (BGR: weight 1 or less): their wages differ ~3x by level 12, the pay does not (it follows power, not the roster).
// L15x12: the L12x12 company at level 15 (day 80, Legendary).
const BGC=['farmhand','militia','hunter','butcher','miner','woodcutter','poacher','deserter','brigand'],BGR=['knight','noble','hedgeknight','witchhunter','cultist','gladiator'];
const FLOWBAND_X=[2,9];
function flows(){process.argv.push('--lib');const L=require(path.join(__dirname,'balance.js'));process.argv.pop();const X=L.makeContext(),rows=[];
 const P15=Object.assign({},L.PROFILES.find(p=>p.id==='L12x12'),{id:'L15x12',lvl:15,day:80});
 for(const [pid,ren,mix] of [['L1x4',0],['L4x6',60],['L8x9',340],['L8x9',340,'common'],['L8x9',340,'rare'],['L12x12',620],['L12x12',1000],['L12x12',620,'common'],['L12x12',620,'rare'],
   ['L15x12',1000],['L15x12',1000,'common'],['L15x12',1000,'rare']]){const P=pid==='L15x12'?P15:L.PROFILES.find(p=>p.id===pid),R=L.buildCompany(X,P,1234),G=X.G;
  G.roster=X.clone(R);G.roster.forEach((m,i)=>{m.field=true;if(mix)m.bg=(mix==='rare'?BGR:BGC)[i%(mix==='rare'?BGR:BGC).length]});G.day=P.day;G.renown=ren;const w=X.companyWages();let s=0,n=0;X.seedRng(77);
  for(let k=0;k<300;k++){const ti=k%G.towns.length,c=X.genContract2(G.towns[ti],ti);if(c){s+=c.pay;n++}}
  rows.push({pid,ren,mix:mix||'',wages:w,power:X.companyPower(),pay:Math.round(s/n),days:s/n/w,purse:typeof X.colPurseBase==='function'?Math.round(X.colPurseBase(X.companyPower())*(typeof X.ctrVetK==='function'?X.ctrVetK():1)):0})}
 return rows}
/* ---------- DOM stubs (as in test/balance.js) ---------- */
function hole(props){const store=Object.assign(Object.create(null),props||{});
 return new Proxy(function(){},{get(t,k){if(k in store)return store[k];if(k==='then'||k==='toJSON')return undefined;if(k===Symbol.toPrimitive)return h=>h==='number'?0:'';
   if(k===Symbol.iterator)return function*(){};if(typeof k==='symbol')return undefined;if(k==='length')return 0;return store[k]=hole()},
  set(t,k,v){store[k]=v;return true},has(){return true},deleteProperty(t,k){delete store[k];return true},apply(){return hole()},construct(){return hole()}})}
function element(id){const cls=new Set();
 return hole({id:id||'',tagName:'DIV',innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,children:[],childNodes:[],dataset:{},parentNode:null,
  scrollTop:0,scrollLeft:0,scrollHeight:0,offsetTop:0,offsetLeft:0,offsetWidth:0,offsetHeight:0,clientWidth:0,clientHeight:0,width:300,height:150,
  classList:{add(...a){a.forEach(x=>cls.add(x))},remove(...a){a.forEach(x=>cls.delete(x))},toggle(x,f){const on=f===undefined?!cls.has(x):!!f;on?cls.add(x):cls.delete(x);return on},contains:x=>cls.has(x)},
  style:hole({setProperty(){},removeProperty(){},getPropertyValue:()=>''}),getBoundingClientRect:()=>({x:0,y:0,top:0,left:0,right:0,bottom:0,width:0,height:0}),
  getContext:()=>hole({measureText:()=>({width:10}),getImageData:()=>({data:[]})}),addEventListener(){},removeEventListener(){},dispatchEvent:()=>true,setAttribute(){},removeAttribute(){},getAttribute:()=>null,hasAttribute:()=>false,
  appendChild:x=>x,insertBefore:x=>x,removeChild:x=>x,remove(){},focus(){},blur(){},click(){},scrollIntoView(){},scrollTo(){},setPointerCapture(){},releasePointerCapture(){},hasPointerCapture:()=>false,contains:()=>false,closest:()=>null,matches:()=>false,
  querySelector:()=>null,querySelectorAll:()=>[],getElementsByClassName:()=>[],getElementsByTagName:()=>[],animate:()=>hole()})}
function makeContext(){const els=new Map(),store=new Map(),warns=[];
 const doc={getElementById(id){if(!els.has(id))els.set(id,element(id));return els.get(id)},createElement:()=>element(),createElementNS:()=>element(),createTextNode:()=>element(),createDocumentFragment:()=>element(),
  body:element('body'),documentElement:element('html'),head:element('head'),addEventListener(){},removeEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],hidden:false,visibilityState:'visible',fullscreenElement:null,activeElement:null,fonts:hole(),exitFullscreen(){}};
 const sb={document:doc,console:{log(){},info(){},debug(){},warn(...a){warns.push(a.join(' '))},error(...a){throw new Error('console.error from game code: '+a.join(' '))}},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem(k,v){store.set(k,String(v))},removeItem(k){store.delete(k)},clear(){store.clear()}},
  setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},queueMicrotask,innerWidth:667,innerHeight:375,devicePixelRatio:1,addEventListener(){},removeEventListener(){},dispatchEvent:()=>true,
  matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}),getComputedStyle:()=>hole({getPropertyValue:()=>''}),navigator:{userAgent:'node',maxTouchPoints:0,vibrate(){}},screen:hole(),location:{href:'',reload(){}},
  performance:{now:()=>0},ResizeObserver:function(){return{observe(){},disconnect(){},unobserve(){}}},MutationObserver:function(){return{observe(){},disconnect(){}}},IntersectionObserver:function(){return{observe(){},disconnect(){}}},Image:function(){return element()},Audio:function(){return hole()},AudioContext:undefined,CSS:{supports:()=>false,escape:s=>s}};
 sb.window=sb;sb.self=sb;sb.globalThis=sb;sb.top=sb;sb.parent=sb;const ctx=vm.createContext(sb);
 const js=fs.readdirSync(SRC).filter(f=>f.endsWith('.js')).sort().map(f=>`/* ---- ${f} ---- */\n`+fs.readFileSync(path.join(SRC,f),'utf8')).join('\n');
 vm.runInContext("'use strict';\n"+js,ctx,{filename:'wyrdmarch-src.js'});
 const getters=new Map(),setters=new Map(),extra={ctx,warns};
 const X=new Proxy(extra,{get(t,k){if(k in t)return t[k];if(typeof k!=='string')return undefined;if(k in ctx)return ctx[k];
   if(!getters.has(k))getters.set(k,vm.runInContext(`(()=>typeof ${k}==='undefined'?undefined:${k})`,ctx));return getters.get(k)()},
  set(t,k,v){if(k in t){t[k]=v;return true}if(!setters.has(k))setters.set(k,vm.runInContext(`(v=>{${k}=v})`,ctx));setters.get(k)(v);return true}});
 X.FX.on=null;X.SPEEDF=0;
 for(let i=0;i<ARGV.length;i++)if(ARGV[i]==='--set')vm.runInContext(ARGV[i+1],ctx);
 return X}
const tick=()=>new Promise(r=>setImmediate(r));
/* ---------- one campaign ---------- */
async function campaign(X,run){const {seed,origin,diff}=run,days=run.days||DAYS;X.seedRng(seed);X.newGame(true,{origin,diff,wsize:'small'});if(run.crisis&&X.CRISES&&X.CRISES[run.crisis]&&!X.G.crisis)X.G.crisisKind=run.crisis;   // every crisis gets its turn (the seed alone may pick the same one)
 const G=()=>X.G,st={battles:0,won:0,lost:0,rounds:0,deaths:0,ctr:0,ctrFail:0,crisisDay:null,crisisEnd:null,crisisHow:null,eastDay:null,eastEnd:null,eastHow:null,wiped:null,starve:0,maxStarve:0,
  rows:[],peakCrowns:0,minCrowns:1e9,hired:0,bought:0,spentGear:0,spentHire:0,innN:0,trainN:0,rifts:0,finale:[],log:[],stuckN:0};
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)/X.TS;
 const closeAll=()=>{for(let i=0;i<8&&X.sheetOpen;i++)X.closeSheet(true);if(X.sheetOpen)X.sheetOpen=false;if(G())G().townOpen=false};
 const field=()=>G().roster.filter(m=>m.field);
 const meanLvl=()=>{const R=G().roster;return R.length?R.reduce((s,m)=>s+m.lvl,0)/R.length:0};
 const tierOf=id=>id&&X.ITEMS[id]?X.ITEMS[id].tier||1:0;
 const gearTier=()=>{const R=G().roster;let s=0,n=0;for(const m of R){for(const k of ['w','a','h']){s+=tierOf(m.eq[k]);n++}}return n?s/n:0};
 const hpFrac=()=>{let a=0,b=0;for(const m of G().roster){a+=m.hp;b+=X.calc(m).hp}return b?a/b:1};
 let lastDay=0;
 const snap=()=>{const g=G();if(!g||g.day===lastDay)return;
  if(g.food<=0){st.starve++;st.maxStarve=Math.max(st.maxStarve,st.starve)}else st.starve=0;
  if(g.crisis&&st.crisisDay==null)st.crisisDay=g.crisis.day||g.day;
  if(g.crisis&&g.crisis.ended&&st.crisisEnd==null){st.crisisEnd=g.day;st.crisisHow=g.crisis.won?(g.crisis.late?'won late':'won'):'lost'}
  else if(g.crisis&&g.crisis.lost&&st.crisisHow==null){st.crisisHow='lost (scar) day '+g.day}
  const ew=g.east&&g.east.war;if(ew&&st.eastDay==null)st.eastDay=ew.day0||g.day;if(ew&&ew.stage==='over'&&st.eastEnd==null){st.eastEnd=g.day;st.eastHow=ew.outcome||'?'}
  (st.last7||(st.last7=[])).push(g.crowns);if(st.last7.length>7)st.last7.shift();   // the purse of the last week: was a wipe-out a bankruptcy?
  st.peakCrowns=Math.max(st.peakCrowns,g.crowns);if(g.day>3)st.minCrowns=Math.min(st.minCrowns,g.crowns);
  while(lastDay<g.day){lastDay++;if(lastDay===1||lastDay%5===0||lastDay===days){const r=g.run||{};
   st.rows.push({day:lastDay,crowns:g.crowns,food:g.food,n:g.roster.length,lvl:+meanLvl().toFixed(1),gear:+gearTier().toFixed(2),renown:g.renown|0,rt:X.renownTier(),deaths:st.deaths,ctr:st.ctr,battles:st.battles,won:st.won,
    power:Math.round(X.companyPower()),top:+(()=>{const L=g.roster.map(m=>m.lvl).sort((a,b)=>b-a).slice(0,8);return L.length?L.reduce((s,v)=>s+v,0)/L.length:0})().toFixed(1),crisis:g.crisis?(g.crisis.won?'won':g.crisis.lost?'lost':'doom '+Math.round(g.crisis.doom||0)):'-',east:ew?(ew.stage==='over'?'over:'+(ew.outcome||''):'war w'+(ew.wave|0)):'-'})}}};
 // sheets the game opens: events (first open option), the Eastern War (the houses' side), the crisis assault (go on), notes
 const sheets=()=>{const g=G();let did=false;
  const ew=g.east&&g.east.war;if(ew&&ew.stage==='war'&&!ew.side&&typeof X.eastWarChoose==='function'){X.eastWarChoose('houses');did=true}
  const E=X.EVS;if(E&&E.cur&&!E.res&&typeof X.evtPick==='function'){const S=E.cur,n=S.c&&S.c.opts?S.c.opts.length:(S.D&&S.D.opts?S.D.opts.length:3);for(let i=0;i<Math.max(1,n)&&E.cur&&!E.res;i++){try{X.evtPick(i)}catch(e){}}did=true}
  if(X.mode==='battle')return true;
  if(E&&E.cur){closeAll();E.cur=null;E.res=null;did=true}
  if(g.crisis&&g.crisis.as&&(g.note==='crisisNext'||X.sheetOpen)){g.note=null;closeAll();X.crAssaultNext();if(X.mode==='battle')return true;did=true}
  if(g.note==='crisisNext'){g.note=null;did=true}
  if(X.sheetOpen){closeAll();did=true}return did};
 // the battle in progress, to its end (the AI on both sides: the company with the sensible pilot)
 const fight=async()=>{const b=X.B;b.opts.turnCap=TURNCAP;const armF=(()=>{let a=0,m=0;for(const u of b.units)if(u.side===0&&u.armMax){a+=u.arm;m+=u.armMax}return m?Math.round(100*a/m):100})(),lv0=(()=>{const P=b.units.filter(u=>u.side===0&&u.m);return P.length?(P.reduce((s,u)=>s+u.m.lvl,0)/P.length).toFixed(1):'-'})();const n0=G().roster.length,ids=new Set(G().roster.map(m=>m.id)),hp0=hpFrac(),u0=b.units.filter(u=>u.side===0).length,e0=b.units.filter(u=>u.side===1).length;
  const res=b.result||await new Promise(r=>{b.onEnd=r;b.auto=true});
  {const P=b.units.filter(u=>u.side===0&&u.m);st.ko=(st.ko||0)+P.filter(u=>!u.alive&&!u.gone).length;st.kod=(st.kod||0)+P.filter(u=>!u.alive&&!u.gone&&!u.down).length}
  st.battles++;if(res.win&&!res.stuck)st.won++;else st.lost++;st.rounds+=res.rounds||0;if(res.stuck)st.stuckN++;
  const out=X.afterBattle(res.win&&!res.stuck?1:0);await tick();
  const g=G();if(!g.roster.length||(out&&out.kind==='wiped')){st.wiped=g.day;return'wiped'}
  const now=new Set(g.roster.map(m=>m.id));for(const id of ids)if(!now.has(id))st.deaths++;
  if(st.log.length<4000)st.log.push(`d${g.day} ${b.opts.f}${b.opts.mult?'x'+(+b.opts.mult).toFixed(2):''} ${res.win?'W':'L'} r${res.rounds} -${n0-g.roster.length} (hp${Math.round(hp0*100)} arm${armF} L${lv0} ${u0}v${e0} dead${res.dead?res.dead.length:'?'} down${res.down?res.down.length:'?'})${b.opts.src&&b.opts.src.type?' '+b.opts.src.type+(b.opts.src.what?':'+b.opts.src.what:''):''}`);
  return out&&out.kind||'world'};
 // march to (x,y); fights on the way are fought; follow: re-aim at a moving party
 const march=async(x,y,dest,o)=>{o=o||{};if(!X.goTo(x,y,dest||null))return'nopath';let n=0,fights=0;
  for(;;){if(!G().roster.length)return'wiped';
   if(X.mode==='battle'){const w0=st.won,r=await fight();fights++;if(r==='wiped')return'wiped';if(await afterFight(r)==='wiped')return'wiped';if(st.won===w0){X.clearRoute();return'lost'}if(o.stopOnFight||fights>6||hpFrac()<.6){X.clearRoute();return'fought'}snap();
    if(o.follow){const p=G().parties.find(q=>q.id===o.follow);if(!p||p.gone)return'gone';x=p.x;y=p.y}if(!X.goTo(x,y,dest||null))return'nopath';continue}
   if(sheets()){if(X.mode==='battle')continue;if(!G().moving&&!o.follow)return'arrived';if(!G().moving&&!X.goTo(x,y,dest||null))return'arrived';continue}
   if(!G().moving){if(o.follow){const p=G().parties.find(q=>q.id===o.follow);if(!p||p.gone||dist(p,G().p)>3)return'gone';if(!X.goTo(p.x,p.y,null))return'gone';continue}return'arrived'}
   X.worldTick(.05);snap();if(G().day>days+1)return'time';
   if(++n>60000){st.stuckN++;X.clearRoute();return'stuck'}
   if(o.follow&&n%15===0){const p=G().parties.find(q=>q.id===o.follow);if(!p||p.gone)return'gone';if(dist(p,G().p)>o.maxD)return'gone';X.goTo(p.x,p.y,null)}}};
 // after a battle: multi-stage fights (crisis assaults, portal nodes, old rift runs) go on while the company holds up
 const afterFight=async kind=>{const g=G();for(let guard=0;guard<12;guard++){
   if(X.mode==='battle'){const r=await fight();if(r==='wiped')return'wiped';kind=r;continue}
   if(g.crisis&&g.crisis.as&&g.note==='crisisNext'){g.note=null;closeAll();if(hpFrac()<.35){X.crAssaultStop&&X.crAssaultStop();break}X.crAssaultNext();continue}
   if(kind==='dunNext'&&g.dun){closeAll();X.dunBattle();continue}
   if(g.portalRun&&(kind==='portalNext'||kind==='world'||kind==='fight')){closeAll();const nx=X.portalNext().filter(i=>!g.portalRun.nodes[i].done);if(!nx.length)break;
    const N=g.portalRun.nodes,hurt=hpFrac()<.7;let i=nx.find(i=>hurt&&N[i].k==='rest');if(i==null)i=nx.find(i=>N[i].k==='treasure');if(i==null)i=nx.find(i=>N[i].k==='battle');if(i==null)i=nx[0];
    if(hpFrac()<.3&&N[i].k!=='rest'&&N[i].k!=='treasure'&&typeof X.portalRetreat==='function'){X.portalRetreat();break}
    const r=X.portalGo(i,true);if(r&&r.kind==='fight'){X.engage(r.o);kind='fight';continue}if(r&&r.kind==='event')X.portalEvent(false);kind='world';continue}
   break}
  closeAll();return'ok'};
 /* ---- the town ---- */
 const reserve=()=>X.companyWages()*7+150;
 const score=(id,k)=>{const it=X.ITEMS[id];if(!it)return -1;return k==='w'?(it.d[0]+it.d[1])/2*(1+(it.ign||0)*.5)*(it.spell?1+it.spell:1):k==='s'?(it.md||0)+(it.rd||0)*.6+(it.hp||0)*.1:(it.arm||0)};
 const AC=['light','medium','heavy'];
 const canWear=(m,id,k)=>{const it=X.ITEMS[id];if(!it||it.uniq&&it.k==='t')return false;if(it.k!==k)return false;const cur=m.eq[k]&&X.ITEMS[m.eq[k]];
  if(k==='w'){if(!cur)return !it.two||!m.eq.s;if(cur.wt!==it.wt)return false;if(!!it.two!==!!cur.two)return false;return true}
  if(k==='s'){const w=X.ITEMS[m.eq.w];return !(w&&w.two)&&!!cur}
  if(k==='a'&&typeof X.armorTrees==='function'){const T=X.armorTrees(m);if(T.length){const top=Math.max(...T.map(t=>AC.indexOf(X.MAST[t].aw)));if(AC.indexOf(X.armorClassOf(id))>top)return false}}
  if(k==='a'||k==='h'){const fat=(it.fat||0)-(cur&&cur.fat||0);if(fat>12&&(X.calc(m).fat||100)<90)return false}
  return true};
 const levelUps=()=>{const g=G();for(let i=0;i<g.roster.length;i++){const m=g.roster[i];let n=0;
   while(m.pend>0&&n++<20){X.levelSheet(i);if(!m.rolls)break;const bow=X.calc(m).wpn&&['bow','crossbow','firearm','throw'].includes(X.calc(m).wpn.wt);X.lvSel=[];for(const k of bow?['hp','rs','rd']:['hp','ms','md'])X.lvPick(i,k);const p=m.pend;X.lvConfirm(i);if(m.pend===p)break}
   if(m.pp>0)X.autoLearn(m)}closeAll();if(has('--dbg')){const p=g.roster.reduce((s,m)=>s+(m.pend|0),0),q=g.roster.reduce((s,m)=>s+(m.pp|0),0);if((p||q)&&st.log.length<4000)st.log.push(`d${g.day} unspent: ${p} level-ups, ${q} perk points`)}};
 const shop=(t)=>{const g=G();if(!t.stock)return;
  // sell the loot that nobody wears (keep a little: none) - trade goods too
  if(typeof X.sellTrade==='function')X.sellTrade();
  for(let j=g.stash.length-1;j>=0;j--){const id=g.stash[j],it=X.ITEMS[id];if(!it)continue;
   const use=g.roster.some(m=>['w','a','h','s'].some(k=>canWear(m,id,k)&&score(id,k)>score(m.eq[k],k)));if(use)continue;X.sellItem(j)}
  // wear upgrades from the stash
  wearStash();
  // buy upgrades: the biggest gain per crown first, within the purse
  for(let pass=0;pass<14;pass++){let best=null;
   t.stock.forEach((id,j)=>{const it=X.ITEMS[id];if(!it||!['w','a','h','s'].includes(it.k))return;const p=X.mkBuyPrice(id);if(g.crowns-p<reserve())return;
    g.roster.forEach((m,mi)=>{if(!m.field)return;const k=it.k;if(!canWear(m,id,k))return;const gain=score(id,k)-score(m.eq[k],k);if(gain<=0)return;const base=Math.max(1,score(m.eq[k],k));if(gain/base<.12)return;
     const v=gain/base/Math.sqrt(p);if(!best||v>best.v)best={j,id,mi,k,v,p}})});
   if(!best)break;const n=g.stash.length;X.buyItem(best.j);if(g.stash.length===n+1){st.bought++;st.spentGear+=best.p;const si=g.stash.lastIndexOf(best.id);X.equip(best.mi,best.k,si)}else break}
  closeAll()};
 const wearStash=()=>{const g=G();for(let mi=0;mi<g.roster.length;mi++){const m=g.roster[mi];for(const k of ['w','a','h','s']){let b=-1,bs=score(m.eq[k],k);
    g.stash.forEach((id,j)=>{if(!canWear(m,id,k))return;const s=score(id,k);if(s>bs){bs=s;b=j}});if(b>=0)X.equip(mi,k,b)}}closeAll()};
 const hireUp=(t)=>{const g=G();if(typeof X.canRecruit==='function'&&!X.canRecruit())return;
  for(let n=0;n<4&&g.roster.length<12&&t.recruits&&t.recruits.length;n++){let bj=-1,bv=-1;const need=g.roster.length<4?.1:g.roster.length<8?.4:1;/* a company of three hires with its last crowns */t.recruits.forEach((m,j)=>{const c=X.hireCost(m);if(g.crowns-c<(reserve()+X.wageOf(m)*7)*need)return;const v=(m.lvl||1)*10/Math.sqrt(c);if(v>bv){bv=v;bj=j}});
   if(bj<0)break;const c=X.hireCost(t.recruits[bj]),n0=g.roster.length;X.hire(bj);if(g.roster.length>n0){st.hired++;st.spentHire+=c;const m=g.roster[g.roster.length-1];m.field=g.roster.filter(x=>x.field).length<=X.MAXFIELD}else break}
  closeAll()};
 const inTown=(i)=>{const g=G(),t=g.towns[i];closeAll();if(!g.townOpen||g.town!==i)X.openTown(i);closeAll();if(X.twHostile(i))return;
  // the inn when hurt
  if(hpFrac()<.8&&g.crowns>g.roster.length*10+reserve()*.3){X.innRest();st.innN++;closeAll()}
  // food for ten days first: a company that cannot eat cannot march (a sensible captain feeds the men before the temple, tools or new hires)
  for(let k=0;k<40&&g.food<g.roster.length*10;k++){const f=g.food;if(g.crowns<X.mkFoodPrice()+50)break;X.buyFood();if(g.food<=f)break}
  // the temple for long wounds
  if(typeof X.templeTreat==='function')g.roster.forEach((m,mi)=>{for(const j of (m.inj||[]).slice()){if(j.days<0||j.days<4)continue;const c=X.cpInjCost(m,j.id);if(c!=null&&g.crowns-c>reserve())X.templeTreat(mi,j.id)}});closeAll();
  // tools and repairs
  const need=X.repairNeed();if(need.tools>(g.tools|0)&&typeof X.buyTools==='function'){const lots=Math.min(6,Math.ceil((need.tools-(g.tools|0))/10));for(let k=0;k<lots;k++)if(g.crowns-X.toolPrice(10)>reserve())X.buyTools(10)}
  X.repairAll();closeAll();
  levelUps();hireUp(t);shop(t);levelUps();
  closeAll()};
 // the company's appetite: the strongest contract fight (mult of an even fight) it will take
 const top8=()=>{const L=G().roster.map(m=>m.lvl).sort((a,b)=>b-a).slice(0,8);return L.length?L.reduce((s,v)=>s+v,0)/L.length:0};
 // a struck-down sword lives only 30% of the time (DOWNCH): a green company takes the light jobs, a seasoned core the even ones
 const appetite=()=>{const g=G(),f=field().length,hp=hpFrac();let a=top8()<3?.85:top8()>=6&&f>=9?1.05:.95;if(f<4)a=.5;else if(f<6)a=Math.min(a,.85);if(hp<.75)a-=.2;if(g.crowns<reserve()+300&&f>=4)a=Math.max(a-.1,Math.min(a,.8));if(g.diff==='hard'||g.diff==='brutal')a-=.05;return a};   // a purse that cannot replace the fallen takes lighter work (but still the light jobs, its only income)
 const ctrMult=c=>{let mx=0;for(const s of c.stages||[]){if(s.k==='go'&&s.fight)mx=Math.max(mx,X.ctrMult(c.diff,s.fight.k||1)*(s.fight.boss?1.2:1));if(s.k==='go'&&s.kind==='escort')mx=Math.max(mx,.95)}return mx};   // a live escort: a band at least a match for the guards and the company together will come (an even fight beside the guards)
 const ctrLen=(c,t)=>{let d=0,p=t;for(const s of c.stages||[]){const q=s.k==='town'?g2().towns[s.ti]:s;if(q){d+=dist(p,q);p=q}}return d};
 const g2=()=>G();
 const pickContract=(i)=>{const g=G(),t=g.towns[i];if(g.contract||!t.contracts||X.twHostile(i))return false;const A=appetite();let bj=-1,bv=0;
  t.contracts.forEach((c,j)=>{if(c.rtook)return;const m=ctrMult(c);if(m>A)return;const L=ctrLen(c,t);if(c.due!=null&&c.due-g.day<L/10+1)return;const v=c.pay/(L/8+1+(m>0?1.5:0));if(v>bv){bv=v;bj=j}});
  if(bj<0){if(st.log.length<4000)st.log.push(`d${g.day} no contract at ${t.name} (A ${A.toFixed(2)}): `+t.contracts.map(c=>c.type+c.diff+'x'+ctrMult(c).toFixed(2)+'/'+c.pay).join(' '));return false}
  const c=t.contracts[bj];X.acceptContract(bj);closeAll();if(st.log.length<4000)st.log.push(`d${g.day} take ${c.type} d${c.diff} x${ctrMult(c).toFixed(2)} pay ${c.pay} (crowns ${g.crowns}, wages ${X.companyWages()}/day, men ${g.roster.length})`);return !!g.contract};
 const doContract=async()=>{const g=G();for(let guard=0;guard<10&&g.contract;guard++){const c=g.contract,s=X.ctrStage(c);if(!s)break;
   if(s.k==='town'){const r=await march(g.towns[s.ti].x,g.towns[s.ti].y,{type:'town',i:s.ti});if(r==='wiped')return'wiped';closeAll();X.openTown(s.ti);if(!g.contract)st.ctr++;closeAll();return s.ti}
   if(s.fight&&hpFrac()<.85){const r0=await restUp(.9,c.due!=null?Math.max(0,(c.due-g.day-dist(g.p,s)/8-1)*24):48);if(r0==='wiped')return'wiped'}
   if(s.fight&&(hpFrac()<.6||field().length<3)){X.ctrAbandon();st.ctrFail++;if(st.log.length<4000)st.log.push(`d${g.day} abandon ${c.type}: too hurt (hp${Math.round(hpFrac()*100)})`);break}   // a sensible captain does not walk the wounded into a lair
   const st0=c.stage,r=await march(s.x,s.y,null);if(r==='wiped')return'wiped';if(r==='time')return'time';
   if(g.contract===c&&c.stage===st0&&r!=='fought'&&r!=='lost'&&hpFrac()>=.6){const tg=X.ctrTargetAt(g.p.x,g.p.y);if(tg){X.ctrArrive(g.p.x,g.p.y);if(X.mode==='battle'){const k=await fight();if(k==='wiped')return'wiped';await afterFight(k)}closeAll()}else{X.goTo(s.x,s.y,null)}}
   if(g.contract===c&&c.failed){st.ctrFail++;break}}
  if(!g.contract)return null;if(g.contract.failed){g.contract=null;st.ctrFail++}return null};
 const nearestTown=(skipHeld)=>{const g=G();let b=0,bd=1e9;g.towns.forEach((t,i)=>{if(skipHeld&&X.crTownHeld&&X.crTownHeld(i))return;if(X.twHostile(i))return;const d=dist(t,g.p);if(d<bd){bd=d;b=i}});return b};
 const goTown=async i=>{const g=G(),t=g.towns[i];const r=await march(t.x,t.y,{type:'town',i});if(r==='wiped')return'wiped';closeAll();if(dist(g.p,t)<3&&!(X.crTownHeld&&X.crTownHeld(i)))inTown(i);return r};
 // hunt a weak hostile band near the company
 const huntBand=async(maxMult,maxD)=>{const g=G();const L=g.parties.filter(p=>!p.gone&&X.partyHostile(p)&&dist(p,g.p)<maxD&&(p.mult||1)<=maxMult&&!(p.cr&&p.siegeT!=null&&false)).sort((a,b)=>dist(a,g.p)-dist(b,g.p));
  if(!L.length)return false;const p=L[0];const b0=st.battles;const r=await march(p.x,p.y,null,{follow:p.id,maxD:maxD+4,stopOnFight:true});return r==='wiped'?'wiped':st.battles>b0};
 // rest on the spot (camp) until the company is whole again, at most h hours
 const restUp=async(to,h)=>{const g=G();let t=0;if(has('--dbg')&&st.log.length<4000)st.log.push(`d${g.day} rest hp ${hpFrac().toFixed(2)} `+g.roster.map(m=>m.hp+'/'+X.calc(m).hp).join(' '));while(hpFrac()<to&&t<h){X.campRest(6);t+=6;st.campH=(st.campH||0)+6;closeAll();snap();if(sheets()&&X.mode==='battle'){const k=await fight();if(k==='wiped')return'wiped';await afterFight(k)}if(g.day>days)break}return'ok'};
 const topLvl=n=>{const L=G().roster.map(m=>m.lvl).sort((a,b)=>b-a).slice(0,n);return L.length?L.reduce((s,v)=>s+v,0)/L.length:0};
 const strong=()=>topLvl(8)>=7&&field().length>=9;
 // the crisis: hosts first, the end when ready
 const crisisMove=async()=>{const g=G(),c=g.crisis;if(!c||c.ended||(c.won))return false;const k=c.k||'sunder',ready=strong()||(c.doom>=70&&topLvl(8)>=5&&field().length>=8);
  if(ready&&hpFrac()>.85){
   if(k==='sunder'&&g.portals.length){const p=g.portals.slice().sort((a,b)=>dist(a,g.p)-dist(b,g.p))[0];const r=await march(p.x,p.y,null);if(r==='wiped')return'wiped';closeAll();if(dist(g.p,p)<2&&hpFrac()>.85&&field().length>=8){st.rifts++;st.finale.push('d'+g.day+' rift');X.enterRift(p.id);closeAll();
     if(X.mode==='battle'){const k2=await fight();if(k2==='wiped')return'wiped';if(await afterFight(k2)==='wiped')return'wiped'}else if(g.portalRun){if(await afterFight('world')==='wiped')return'wiped'}}return true}
   const site=k==='deadmarch'?(c.throne&&c.throne.known?c.throne:null):(c.camp||null);
   if(site&&(k!=='horde'||g.day>=(c.gather||0)+6||c.campSeen)){const r=await march(site.x,site.y,null);if(r==='wiped')return'wiped';closeAll();if(dist(g.p,site)<2.5&&hpFrac()>.85&&field().length>=8){st.finale.push('d'+g.day+' '+k);
     if(k==='deadmarch')X.crThroneFight();else X.crAssault(k);if(X.mode==='battle'){const k2=await fight();if(k2==='wiped')return'wiped';if(await afterFight(k2)==='wiped')return'wiped'}closeAll()}return true}}
  // hosts near (sieges first)
  const H=g.parties.filter(p=>p.cr&&!p.gone&&X.partyHostile(p)&&dist(p,g.p)<22&&(p.mult||1)<=appetite()).sort((a,b)=>(a.siegeT!=null?-10:0)+dist(a,g.p)-((b.siegeT!=null?-10:0)+dist(b,g.p)));
  if(H.length&&hpFrac()>.7){const b0=st.battles;const r=await march(H[0].x,H[0].y,null,{follow:H[0].id,maxD:26,stopOnFight:true});if(r==='wiped')return'wiped';return st.battles>b0}
  return false};
 // the deploy screen's withdraw: a band the company did not choose to fight, met hurt, thin or outmatched, is declined (10% of the purse)
 {const eng=X.ctx.engage;X.ctx.engage=function(o){const s=o&&o.src||{};if(s.type==='party'&&(hpFrac()<.6||field().length<3||(o.mult||1)>appetite()+.05)){st.fled=(st.fled||0)+1;X.fleeEncounter(o);return null}return eng.apply(this,arguments)}}
 // the ledger: crowns in and out by source (the game's own functions, wrapped; a nested call's crowns go to the inner one), in total
 // (st.led) and by ten-day window (st.ledT[window][source]: the income and the spending of days 1-10, 11-20, ...)
 st.led={};st.ledT=[];const LSTK=[];
 const ledAdd=(k,d)=>{if(!d)return;st.led[k]=(st.led[k]||0)+d;const w=Math.floor(Math.max(0,(G().day||1)-1)/10),T=st.ledT[w]||(st.ledT[w]={});T[k]=(T[k]||0)+d};
 for(const [fn,k] of [['newDay','wages'],['worldTick','world'],['afterBattle','battle'],['resolveBattle','strip'],['cargoTake','cargo'],['nestClear','nest'],['rvBattleEnd','rival'],['portalGo','endgame'],['portalSettle','endgame'],
   ['dungeonSettle','dungeon'],['colSettle','colosseum'],['crisisEnd','crisis'],['eastEnd','east'],['cvBattleEnd','caravan'],['grBattleEnd','garrison'],['cvEscArrive','escort'],
   ['ctrTurnIn','contracts'],['ctrAccept','contracts'],['openTown','town'],['buyItem','gear'],['hire','hire'],['buyFood','food'],['innRest','inn'],['sellItem','sales'],['sellTrade','trade'],['templeTreat','temple'],
   ['buyTools','tools'],['repairAll','repairs'],['campTrain','drill'],['fleeEncounter','withdraw'],['eventTick','events'],['evtPick','events'],['orDay','events']]){const f=X.ctx[fn];if(typeof f!=='function')continue;
  X.ctx[fn]=function(){const c0=G()?G().crowns:0;LSTK.push(0);let r;try{r=f.apply(this,arguments)}finally{const inner=LSTK.pop();const g=G();if(g){const d=g.crowns-c0;ledAdd(k,d-inner);if(LSTK.length)LSTK[LSTK.length-1]+=d}}return r}}
 // the line-up: the hurt and the injured sit out while at least five whole swords can take the field
 const setField=()=>{const R=G().roster,bad=m=>(m.inj||[]).some(j=>j.days>0)||m.hp<X.calc(m).hp*.5;const ok=R.filter(m=>!bad(m));const n=ok.length>=5?ok.length:R.length;
  R.forEach(m=>m.field=false);(ok.length>=5?ok:R).slice(0,X.MAXFIELD).forEach(m=>m.field=true);if(ok.length>=5&&ok.length<X.MAXFIELD)R.filter(bad).slice(0,Math.max(0,Math.min(X.MAXFIELD,7)-ok.length)).forEach(m=>m.field=true)};
 {const ab=X.ctx.afterBattle;X.ctx.afterBattle=function(){const r=ab.apply(this,arguments);try{if(G()&&G().roster.length)setField()}catch(e){}return r}}
 const injured=()=>G().roster.filter(m=>(m.inj||[]).some(j=>j.days>0)).length;
 const needRest=()=>hpFrac()<.8||injured()>G().roster.length*.6;
 // recover: the nearest friendly town, the inn until whole (at most four days), then hire
 const recover=async()=>{const i=nearestTown(true);const r=await goTown(i);if(r==='wiped')return'wiped';const g=G();if(dist(g.p,g.towns[i])>3)return'away';
  if(hpFrac()<.8&&g.crowns>g.roster.length*10+50){X.openTown(i);closeAll();X.innRest();st.innN++;closeAll()}
  for(let k=0;k<4&&injured()>g.roster.length*.6&&g.day<=days;k++){X.campRest(12);st.campH=(st.campH||0)+12;closeAll();snap()}inTown(i);return i};
 // ---- main loop ----
 closeAll();let here=0,idle=0;inTown(0);
 for(let loop=0;loop<3000&&G().day<=days;loop++){const g=G();if(!g.roster.length){st.wiped=st.wiped||g.day;break}snap();
  if(!g.contract&&(needRest()||field().length<4)){const r=await recover();if(r==='wiped')break;if(typeof r==='number')here=r}
  if(!g.contract)pickContract(here);
  if(g.contract){const r=await doContract();if(r==='wiped')break;if(typeof r==='number'){here=r;inTown(r)}if(g.contract&&g.contract.stage===0&&idle++>3){X.ctrAbandon();st.ctrFail++}continue}
  // no work here: the crisis, a band, a camp, or the next town
  const cm=await crisisMove();if(cm==='wiped')break;if(cm){const i=nearestTown(true);if((await goTown(i))==='wiped')break;here=i;continue}
  if(hpFrac()<.7){if((await restUp(.85,24))==='wiped')break;continue}
  if(hpFrac()>.8){const hb=await huntBand(Math.min(1,appetite()-.1),9);if(hb==='wiped')break;if(hb){closeAll();continue}}
  if(field().length>=4&&typeof X.campTrain==='function'&&g.crowns>reserve()*2){for(const m of field().slice(0,3)){const T=X.campTrainInfo(m);if(!T.why&&g.crowns-(T.cost||0)>reserve()){if(X.campTrain(m.id))st.trainN++}}closeAll()}
  // travel: the best board within reach (a big town, not the one just seen)
  const cand=g.towns.map((t,i)=>({i,d:dist(t,g.p),s:t.size})).filter(o=>o.i!==here&&!X.twHostile(o.i)&&!(X.crTownHeld&&X.crTownHeld(o.i))).sort((a,b)=>(a.d-a.s*4)-(b.d-b.s*4));
  const to=cand.length?cand[Math.min(cand.length-1,X.ri(0,1))].i:nearestTown(true);if((await goTown(to))==='wiped')break;here=to;idle=0}
 snap();const g=G();
 const r=g.run||{};st.end={day:g.day,crowns:g.crowns,n:g.roster.length,lvl:+meanLvl().toFixed(1),gear:+gearTier().toFixed(2),renown:g.renown|0,rt:X.renownTier(),runBattles:r.battles,runFallen:r.fallen,runContracts:r.contracts};
 st.crisisKind=g.crisisKind;st.crisisStart=X.crisisStartDay?X.crisisStartDay():null;
 if(g.crisis&&!st.crisisHow)st.crisisHow=g.crisis.won?'won':g.crisis.lost?'lost':'on (doom '+Math.round(g.crisis.doom||0)+')';
 return st}
/* ---------- worker ---------- */
if(has('--worker')){let X=null;process.on('message',async m=>{if(m==='quit')process.exit(0);try{X=makeContext();const T=Date.now();const r=await campaign(X,m);r.ms=Date.now()-T;process.send({id:m.id,r})}catch(e){process.send({id:m.id,err:String(e&&e.stack||e)})}});return}
/* ---------- main ---------- */
(async()=>{const J=+arg('--jobs',Math.max(1,Math.min(4,os.cpus().length))),T0=Date.now();const runs=[];let id=0;
 const FL=flows(),fbad=[];console.log('flows: contract pay in days of wages (target '+FLOWBAND.join('-')+')');
 for(const r of FL){console.log(`  ${r.pid.padEnd(7)} ${r.mix.padEnd(6)} renown ${String(r.ren).padStart(4)}: wages ${String(r.wages).padStart(4)}/day, power ${String(r.power).padStart(5)}, contract ${String(r.pay).padStart(5)} = ${r.days.toFixed(1)} days, arena purse ${r.purse}`);
  const B=r.mix?FLOWBAND_X:FLOWBAND;if(r.days<B[0]||r.days>B[1])fbad.push(`flows: ${r.pid}${r.mix?' '+r.mix:''} at renown ${r.ren}: a contract pays ${r.days.toFixed(1)} days of wages (band ${B.join('-')})`)}
 if(has('--flows')){if(fbad.length){console.log('\nFAIL:\n  '+fbad.join('\n  '));process.exit(1)}console.log('\nPASS');process.exit(0)}
 for(const diff of DIFFS)for(const origin of ORIG)for(const seed of SEEDS)runs.push({id:id++,seed,origin,diff,days:DAYS,crisis:['sunder','deadmarch','horde','barbarian'][id%4]});
 console.log(`economy: ${runs.length} campaigns of ${DAYS} days, ${J} workers`);
 const res=new Array(runs.length);
 await new Promise((done,fail)=>{let next=0,left=runs.length;const sets=[];for(let i=0;i<ARGV.length;i++)if(ARGV[i]==='--set')sets.push(ARGV[i],ARGV[i+1]);
  for(let w=0;w<Math.min(J,runs.length);w++){const ch=cp.fork(__filename,['--worker'].concat(sets));const feed=()=>{if(next<runs.length)ch.send(runs[next++]);else ch.send('quit')};
   ch.on('message',m=>{if(m.err){ch.kill();fail(new Error(`run ${JSON.stringify(runs[m.id])}: ${m.err}`));return}res[m.id]=m.r;process.stderr.write('.');if(--left===0)done();else feed()});
   ch.on('exit',c=>{if(c&&left)fail(new Error('worker died '+c))});feed()}});
 process.stderr.write('\n');const pad=(s,n)=>String(s).padEnd(n),lp=(s,n)=>String(s).padStart(n),bad=fbad.slice();
 const est=r=>{const mins=r.battles*(3+.45*(r.rounds/Math.max(1,r.battles)))+r.end.day*2.2;return mins/60};
 for(const k in runs){const R=runs[k],r=res[k];
  console.log(`\n== ${R.origin} / ${R.diff} / seed ${R.seed}: crisis ${r.crisisKind} (due day ${r.crisisStart}) started ${r.crisisDay??'-'}, ${r.crisisHow||'-'}${r.crisisEnd?' day '+r.crisisEnd:''}; Eastern War ${r.eastDay??'-'}${r.eastHow?' -> '+r.eastHow+' day '+r.eastEnd:''}${r.wiped?'; WIPED day '+r.wiped:''} ==`);
  console.log(pad('day',5)+lp('crowns',8)+lp('food',6)+lp('men',5)+lp('lvl/top8',9)+lp('gear',6)+lp('renown',8)+lp('tier',5)+lp('power',7)+lp('dead',6)+lp('ctr',5)+lp('fights',8)+lp('won',5)+'  crisis       east');
  for(const w of r.rows)console.log(pad(w.day,5)+lp(w.crowns,8)+lp(w.food,6)+lp(w.n,5)+lp(w.lvl.toFixed(1)+'/'+w.top.toFixed(0),7)+lp(w.gear.toFixed(2),6)+lp(w.renown,8)+lp(w.rt,5)+lp(w.power,7)+lp(w.deaths,6)+lp(w.ctr,5)+lp(w.battles,8)+lp(w.won,5)+'  '+pad(w.crisis,12)+' '+w.east);
  console.log(`  hired ${r.hired} (${r.spentHire} cr), bought ${r.bought} pieces (${r.spentGear} cr), inn rests ${r.innN}, camp hours ${r.campH|0}, drills ${r.trainN}, contracts failed ${r.ctrFail}, withdrew ${r.fled|0}, peak crowns ${r.peakCrowns}, longest starving ${r.maxStarve} days, finale ${r.finale.join(', ')||'-'}; ~${est(r).toFixed(1)} h of play (${r.battles} battles, ${(r.rounds/Math.max(1,r.battles)).toFixed(1)} rounds each) [${(r.ms/1000).toFixed(0)} s]`);
  console.log(`  knocked out ${r.ko|0}, of them killed ${r.kod|0}`);console.log('  ledger: '+Object.keys(r.led).sort((a,b)=>r.led[b]-r.led[a]).map(k=>k+' '+r.led[k]).join(', '));
  if(has('--verbose'))console.log('  '+r.log.join('\n  '));
  const tag=`${R.origin}/${R.diff}/${R.seed}`;
  // a wipe-out before day 40 on Normal fails the economy when the company was broke the week before (never 250 crowns: it could not
  // replace the fallen); one with crowns in the chest was lost in battle (reported, the battle tests judge those)
  if(R.diff==='normal'&&r.wiped&&r.wiped<40){const broke=Math.max(0,...(r.last7||[0]))<250;if(broke)bad.push(tag+': wiped out broke on day '+r.wiped);else console.log('  (note: wiped out on day '+r.wiped+' with '+Math.max(...(r.last7||[0]))+' crowns in the last week: lost in battle, not to the purse)')}
  if(R.diff!=='story'&&r.rows.some(w=>w.day<=60&&w.crowns>RUNAWAY))bad.push(tag+': runaway gold ('+Math.max(...r.rows.map(w=>w.crowns))+')');
  if(r.maxStarve>=3)bad.push(tag+': starved '+r.maxStarve+' days running');
  const L=r.rows.filter(w=>w.n>0);if(!r.wiped&&L.length>4&&L[L.length-1].lvl<=L[1].lvl+1)console.log('  (note: mean level flat: '+L[1].lvl+' -> '+L[L.length-1].lvl+', the dead are replaced by green recruits)');
  if(r.crisisDay!=null&&r.crisisDay<20&&R.origin!=='pilgrims')bad.push(tag+': crisis on day '+r.crisisDay);
  if(r.eastDay!=null&&r.eastDay<25)bad.push(tag+': Eastern War on day '+r.eastDay)}
 // the summary: means by day over the runs of each difficulty
 for(const diff of DIFFS){const L=runs.map((R,i)=>R.diff===diff?res[i]:null).filter(Boolean);console.log(`\n== mean by day: ${diff} (${L.length} runs) ==`);
  console.log(pad('day',5)+lp('crowns',8)+lp('food',6)+lp('men',6)+lp('lvl',6)+lp('gear',6)+lp('renown',8)+lp('dead',6)+lp('ctr',6)+lp('fights',8)+lp('alive',7));
  const days=[...new Set(L.flatMap(r=>r.rows.map(w=>w.day)))].sort((a,b)=>a-b);
  for(const d of days){const W=L.map(r=>r.rows.find(w=>w.day===d)).filter(Boolean);if(!W.length)continue;const m=k=>W.reduce((s,w)=>s+w[k],0)/W.length;
   console.log(pad(d,5)+lp(Math.round(m('crowns')),8)+lp(Math.round(m('food')),6)+lp(m('n').toFixed(1),6)+lp(m('lvl').toFixed(1),6)+lp(m('gear').toFixed(2),6)+lp(Math.round(m('renown')),8)+lp(m('deaths').toFixed(1),6)+lp(m('ctr').toFixed(1),6)+lp(m('battles').toFixed(0),8)+lp(W.length+'/'+L.length,7))}
  const cs=L.filter(r=>r.crisisDay!=null),es=L.filter(r=>r.eastDay!=null),won=L.filter(r=>/^won/.test(r.crisisHow||''));
  if(diff==='normal')for(const d of days.filter(d=>d>=60&&d<=100)){const C=L.map(r=>{const w=r.rows.find(w=>w.day===d);return w?w.crowns:null}).filter(v=>v!=null).sort((a,b)=>a-b);if(C.length<3)continue;const med=C[C.length>>1];if(med>HOARD)bad.push(`hoard: the median Normal purse on day ${d} is ${med} (> ${HOARD})`)}
  console.log(`crisis: started in ${cs.length}/${L.length} (mean day ${cs.length?(cs.reduce((s,r)=>s+r.crisisDay,0)/cs.length).toFixed(0):'-'}), won in ${won.length} (mean day ${won.length?(won.reduce((s,r)=>s+r.crisisEnd,0)/won.length).toFixed(0):'-'}); Eastern War: in ${es.length}/${L.length} (mean day ${es.length?(es.reduce((s,r)=>s+r.eastDay,0)/es.length).toFixed(0):'-'}); wiped ${L.filter(r=>r.wiped).length}; play time ~${(L.reduce((s,r)=>s+est(r),0)/L.length).toFixed(1)} h for ${DAYS} days`)}
 console.log(`\nplay-time estimate: battles x (3 + 0.45 x rounds) minutes + days x 2.2 minutes of map, town and camp.   Wall time ${((Date.now()-T0)/1000).toFixed(0)} s.`);
 if(arg('--json',null))fs.writeFileSync(arg('--json'),JSON.stringify({runs,res},null,1));
 if(bad.length&&!has('--report')){console.log('\nFAIL:\n  '+bad.join('\n  '));process.exit(1)}console.log(bad.length?'\nREPORT (not judged):\n  '+bad.join('\n  '):'\nPASS');process.exit(0)})().catch(e=>{console.error('\nFAIL: '+(e&&e.stack||e));process.exit(1)});
