// Rogues test: the Assassin, Rogue and Shadowdancer trees (MAST in 10-data.js, rules in 60-battle-core.js / 30-mercs.js / 64r-rogues.js).
// Plain node:  node test/rogues.js [--seed N]
// Checks: the catalog (pinned perk ids, six tiers, abilities and statuses with texts, capstones, background pools, the two new backgrounds,
// the trees turning up on newly rolled recruits, icons), the light weapon rule, every perk's effect (to hit, damage, bleed and poison, Read
// the blade and its cap with Quicksilver, Light step, Flow, Pocket sand, Death mark and its leap, Coup de grace's refund, the once-a-battle
// abilities, Blur, Slip away), the forecast agreeing with them, Pickpocket's take (seeded and deterministic, one robbery a foe, paid after the
// battle) and Light fingers, autoLearn on light and heavy builds, and the AI using every rogue ability in auto battles.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261116,SRC=path.join(__dirname,'..','src');
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
const TREES=['assassin','rogue','shadow'],ALL=[].concat(...TREES.map(k=>[1,2,3,4,5,6].map(t=>k+'.'+t)));
const rest=async b=>{let n=0;while(b.busy&&!b.over){await null;if(++n>3e6)fail('the battle never settled')}};
// a merc with every rogue perk and a light weapon
function rogue(bg,w){const m=X.newMerc(bg||'cutthroat');m.trees=TREES.concat(['skirmisher']);m.gift=null;m.lvl=8;m.perks=ALL.slice();m.pp=0;m.eq.w=w||'rondel';m.eq.s=null;m.eq.b=null;m.eq.a='padded';m.eq.h=null;m.inj=[];m.traits=[];m.hp=X.calc(m).hp;m.field=true;return m}
// a flat arena at the company's turn (P company, E foes), everything parked; the battle stays busy so nothing moves on its own
async function arena(seed,ros,foes){const G=X.G;G.roster=ros;G.day=10;X.seedRng(seed);
 const b=X.startBattle({f:'bandit',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:6000,foes:foes||['thug','thug','thug','thug']});ok(b,'arena did not start');
 let n=0;while(!b.over&&(b.busy||b.cur.side!==0)){await null;if(++n>3e6)fail('arena never reached a company turn')}
 const P=b.units.filter(u=>u.side===0),E=b.units.filter(u=>u.side===1);
 const park=()=>{b.tiles.forEach(t=>{t.t='ground';t.h=0});b.units.forEach((u,i)=>{u.alive=true;u.gone=null;u.down=false;u.hp=u.hpMax=Math.max(u.hpMax,80);u.arm=u.armMax;u.helm=u.helmMax;u.st={};u.buffs=u.buffs.filter(x=>x.foe);
   u.mor=3;u.fearless=true;u.aoo=0;u.rooted=false;u.dazed=false;u.fat=0;u.ap=u.apMax;u.dnc=0;u.robbed=0;u.bonusAP=0;u.used={};u.qsT=0;u.slipT=0;u.c=i;u.r=u.side?0:BH-1});b.order=[];b.busy=true;X.foeAuras()};
 park();return{b,P,E,park}}
(async()=>{
section('catalog');
{ fresh(SEED);const M=X.MAST;
  for(const k of TREES){const T=M[k];ok(T&&T.kind==='style'&&T.tiers.length===6&&T.tiers.every((t,i)=>t.length===1&&t[0].id===k+'.'+(i+1)&&t[0].n&&t[0].d),k+': six tiers of one perk, ids pinned');
   ok(X.MUNDANE.includes(k)&&T.cap&&T.cap.tiers[0][0].id===k+'.cap','in MUNDANE, with a capstone');
   const abs=T.tiers.map(t=>t[0].ab).filter(Boolean);ok(abs.length>=2&&abs.length<=3&&abs.every(id=>X.AB[id]&&X.AB[id].n&&X.AB[id].d.length>30),k+': 2-3 abilities with texts: '+abs)}
  ok(M.assassin.n==='Assassin'&&M.rogue.n==='Rogue'&&M.shadow.n==='Shadowdancer','tree names');
  for(const s of ['doomed','blinded','blur','untouchable','slipaway','flow'])ok(X.STATUS[s]&&X.STATUS[s].n&&X.STATUS[s].d,'status '+s);
  for(const bg of ['thief','cutthroat','acrobat','brigand','poacher','sailor','beggar','nomad','wildling'])ok(X.BG[bg].pool.some(k=>TREES.includes(k)),bg+' can draw a rogue tree');
  ok(X.BG.cutthroat.n==='Cutthroat'&&X.BG.acrobat.n==='Tumbler'&&X.BG.cutthroat.at.join()==='lightarmor'&&X.BG.acrobat.at.join()==='lightarmor','the new backgrounds');
  const seen=new Set();for(let i=0;i<60;i++)for(const bg of ['thief','cutthroat','acrobat']){const m=X.newMerc(bg);m.trees.forEach(k=>seen.add(k))}ok(TREES.every(k=>seen.has(k)),'recruits roll the rogue trees');
  for(const k of TREES){ok(X.icResolve('m-'+k)!=='none'&&X.pkHas('m-'+k),'medallion '+k);for(const p of M[k].p.concat(M[k].cap.tiers[0])){const n=p.ab?'ab-'+p.ab:'perk-'+p.id;ok(X.icResolve(n)!=='none'&&X.pkHas(n),'icon '+n)}}
  for(const s of ['doomed','blinded','blur','untouchable','slipaway','flow'])ok(X.icResolve('st-'+s)!=='none'&&X.pkHas(X.icResolve('st-'+s)),'status icon '+s);
  console.log('3 trees, '+ALL.length+' perks, 8 abilities, 6 statuses, 2 backgrounds, icons: ok') }
section('light weapons');
{ const L=id=>X.isLightW(X.ITEMS[id]);ok(L('knife')&&L('rondel')&&L('stiletto')&&L('shortsword')&&L('wakizashi')&&X.isLightW(X.FIST),'daggers, short swords, the wakizashi, fists');
  ok(!L('arming')&&!L('falchion')&&!L('handaxe')&&!L('mace')&&!L('greatsword')&&!L('shortbow')&&!L('spear'),'not 9+ fatigue blades, axes, maces, two-handers, bows, spears') }
section('calc: Read the blade, Light step, Flow');
{ const m=rogue();m.perks=['shadow.4'];m.eq.a='mail';for(const init of [90,97,98,130,170]){m.base.init=init;const s=X.calc(m),i=s.init;ok(s.readDef===Math.max(0,Math.min(8,Math.floor((i-90)/8))),'Read the blade at '+i+': '+s.readDef)}
  m.eq.a='jack';m.perks=['shadow.4','lightarmor.4'];m.base.init=200;let s=X.calc(m);ok(s.initDef===20&&s.readDef===20-Math.floor(.1*s.init),'with Quicksilver at most +20 from initiative: '+s.initDef);
  m.base.init=100;s=X.calc(m);ok(s.initDef===Math.floor(.1*s.init)+Math.min(8,Math.floor((s.init-90)/8)),'below the cap both count');
  m.perks=['shadow.1','shadow.3'];s=X.calc(m);const s0=X.calc(Object.assign(X.clone(m),{perks:[]}));ok(s.flags.quickstep&&s.flags.footing&&s.flags.flow===4&&s.init===s0.init+5,'Light step +5 initiative, Flow, cheaper steps') }
section('in the field');
{ fresh(SEED+1);const r=rogue('cutthroat','rondel'),A=await arena(SEED+2,[r,rogue('thief','rondel')]),b=A.b,[u,v]=A.P,[e,e2]=A.E;
  const at=X.abilityInfo(u,'attack'),put=(x,c,rr)=>{x.c=c;x.r=rr},W=X.calc(r).wpn;
  const flags=f=>{u.flags=Object.assign({},f);X.foeAuras()};
  put(u,5,5);put(e,6,5);put(v,15,11);put(e2,15,0);e.md=10;u.ms=60;
  // Backstab: an ally next to the foe, a light weapon
  flags({});const h0=X.hitChance(u,e,at),d0=X.forecast(u,e,at).dmgMax;flags({stabDmg:.15,stabHit:5});ok(X.hitChance(u,e,at)===h0,'Backstab: nothing without an ally beside the foe');
  put(v,6,6);ok(X.hitChance(u,e,at)===h0+5&&X.forecast(u,e,at).dmgMax>d0,'Backstab: +5 to hit and more damage with an ally beside the foe');
  u.wpn=X.ITEMS.arming;ok(X.rogueHit(u,e,at)===0&&X.rogueDmg(u,e,at)===0,'Backstab needs a light weapon');u.wpn=W;put(v,15,11);
  // Before they wake + Quicker than thought: a foe still waiting for its turn this round
  flags({wakeDmg:.2,firstHit:10,firstDmg:.1});b.order=[];const w0=X.hitChance(u,e,at),wd0=X.dmgBonus(u,e,at);b.order=[e];ok(X.hitChance(u,e,at)===w0+10&&Math.abs(X.dmgBonus(u,e,at)-wd0-.3)<1e-9,'not yet acted: +10 to hit, +30% damage');
  u.wpn=X.ITEMS.arming;ok(Math.abs(X.dmgBonus(u,e,at)-.1)<1e-9,'Before they wake needs a light weapon, Quicker than thought does not');u.wpn=W;b.order=[];
  // Low blow
  flags({dirtyDmg:.2,dirtyHit:10});const l0=X.hitChance(u,e,at);e.st.daze=1;ok(X.hitChance(u,e,at)===l0+10&&X.impaired(e),'Low blow: +10 against a dazed foe');e.st={};e.rooted=true;ok(X.impaired(e),'rooted counts');e.rooted=false;
  // bleed and poison riding on a light blow
  flags({lightBleed:2,lightPoison:2});const fc=X.forecast(u,e,at);ok(fc.statuses.some(s=>s.k==='bleed'&&s.n===2)&&fc.statuses.some(s=>s.k==='poison'&&s.n===2),'the forecast lists bleed and poison');
  e.arm=0;e.helm=0;e.hp=e.hpMax=999;u.ms=300;let hit=false;for(let i=0;i<30&&!hit;i++)hit=await X.strike(u,e,at);ok(hit&&e.st.bleed===2&&e.st.poison===2,'a light hit that reaches hitpoints bleeds and poisons');
  e.st={};u.wpn=X.ITEMS.arming;ok(!X.forecast(u,e,at).statuses.some(s=>s.k==='poison'||s.k==='bleed'),'not with a heavier blade');u.wpn=W;u.ms=60;A.park();put(u,5,5);put(e,6,5);put(v,15,11);put(e2,15,0);
  // Flow: +4 defense a miss, three misses at most
  e.flags={};const ea=X.abilityInfo(e,'attack');u.flags={flow:4};u.dnc=0;const g0=X.hitChance(e,u,ea);u.dnc=2;ok(X.hitChance(e,u,ea)===g0-8&&X.forecast(e,u,ea).armDef===8,'Flow: +4 a miss');u.dnc=3;ok(X.armorDef(e,u,ea)===12,'Flow: up to +12');
  u.dnc=0;let miss=0;e.ms=-300;for(let i=0;i<5&&!miss;i++){await X.strike(e,u,ea);miss=u.dnc}ok(miss===1,'a miss sets Flow going');e.ms=60;u.dnc=0;
  // Pocket sand: blinded, the numbers change at once, no free attacks
  u.flags=X.calc(r).flags;const msE=X.eff(e,'ms'),mdE=X.eff(e,'md');let blind=false;for(let i=0;i<30&&!blind;i++){u.ap=9;u.ms=300;await X.useAbility(u,X.abilityInfo(u,'pocketsand'),KU(e));await rest(b);b.busy=true;blind=e.st.blinded>0}
  ok(blind&&X.eff(e,'ms')===msE-15&&X.eff(e,'md')===mdE-10&&!X.canFree(e),'Pocket sand: blinded, −15 skill, −10 melee defense, no free attacks');ok(X.unitStatuses(e).some(s=>s.key==='blinded'),'blinded shows');u.ms=60;
  // Death mark: 15% more damage taken, then it leaps on a kill
  A.park();put(u,5,5);put(e,8,5);put(e2,9,5);put(v,15,11);const dm=X.abilityInfo(u,'deathmark');ok(X.canUse(u,dm)&&X.validTargets(u,dm).has(KU(e)),'Death mark reaches a foe 3 tiles away');
  const va=X.abilityInfo(v,'attack'),f0=X.forecast(v,e,va);await X.useAbility(u,dm,KU(e));await rest(b);b.busy=true;ok(e.st.doomed===3&&Math.abs(X.buffSum(e,'dr')+.15)<1e-9,'doomed for 3: −15% damage reduction');
  ok(X.forecast(v,e,va).dmgMax>f0.dmgMax,'the forecast shows the extra damage ('+f0.dmgMax+' -> '+X.forecast(v,e,va).dmgMax+')');
  X.hurt(e,9999,1,u,{pierce:1});ok(!e.alive&&e2.st.doomed>=2,'the mark leaps to the nearest ally of the dead');
  // Coup de grace: a kill gives back 3 AP; a light weapon only
  A.park();put(u,5,5);put(e,6,5);e.hp=1;e.arm=0;e.helm=0;u.ms=300;const cg=X.abilityInfo(u,'coupdegrace');ok(X.canUse(u,cg),'Coup de grace with a dagger');
  await X.useAbility(u,cg,KU(e));await rest(b);b.busy=true;ok(!e.alive&&u.ap===u.apMax-cg.ap+3,'a kill gives back 3 AP: '+u.ap);
  u.wpn=X.ITEMS.arming;ok(!X.canUse(u,cg)&&/light weapon/.test(X.useBlock(u,cg)),'Coup de grace needs a light weapon');u.wpn=W;
  // Shadow strike and Untouchable: once a battle
  A.park();put(u,5,5);put(e,6,5);const ss=X.abilityInfo(u,'shadowstrike');await X.useAbility(u,ss,KU(e));await rest(b);b.busy=true;u.ap=9;ok(!X.canUse(u,ss)&&X.useBlock(u,ss)==='Already used this battle','Shadow strike once a battle');
  const ut=X.abilityInfo(u,'untouchable'),md0=X.eff(u,'md');await X.useAbility(u,ut,KU(u));await rest(b);b.busy=true;ok(X.eff(u,'md')===md0+25&&!X.canUse(u,ut),'Untouchable: +25, once');
  // Blur: defense and a riposte
  A.park();put(u,5,5);put(e,6,5);await X.useAbility(u,X.abilityInfo(u,'blur'),KU(u));await rest(b);b.busy=true;ok(X.buffSum(u,'rip')===1&&X.buffSum(u,'md')===10,'Blur: +10 defense and riposte');
  // Slip away: three tiles, no free attack, the buff
  A.park();put(u,5,5);put(e,6,5);const sl=X.abilityInfo(u,'slipaway');ok(X.validTargets(u,sl).has(5*BW+2),'Slip away reaches 3 tiles');const hp0=u.hp;
  await X.useAbility(u,sl,5*BW+2);await rest(b);b.busy=true;ok(u.c===2&&u.hp===hp0&&u.ap===u.apMax-2&&X.buffSum(u,'ms')===10&&!e.aoo,'Slip away: moved, no free attack, +10');
  // Light step: the first tile of a turn is free on open ground
  A.park();put(u,5,5);u.qsT=0;const D=X.dijkstra(u,9);ok(D.get(5*BW+4).cost===0&&D.get(5*BW+3).cost===2,'Light step: the first tile costs no AP');const ap0=u.ap;
  await X.walkPath(u,[5*BW+4,5*BW+3]);ok(u.ap===ap0-2&&u.qsT===1,'walking pays the same');ok(X.dijkstra(u,9).get(5*BW+2).cost===2,'only once a turn');
  X.B=null;X.mode='world';console.log('Backstab, Before they wake, Quicker than thought, Low blow, bleed and poison, Flow, Pocket sand, Death mark (and its leap), Coup de grace, once a battle, Blur, Slip away, Light step: ok') }
section('Pickpocket and the spoils');
{ const take=async seed=>{fresh(SEED+5);const r=rogue('thief','rondel');const A=await arena(seed,[r,rogue('cutthroat','dirk')]),b=A.b,[u,v]=A.P,[e,e2]=A.E,put=(x,c,rr)=>{x.c=c;x.r=rr};
    put(u,5,5);put(e,6,5);put(v,14,11);put(e2,14,0);const pp=X.abilityInfo(u,'pickpocket');ok(X.validTargets(u,pp).has(KU(e)),'Pickpocket reaches an adjacent foe');
    let got=null;for(let i=0;i<20&&!got;i++){u.ap=9;u.ms=200;await X.useAbility(u,pp,KU(e));await rest(b);b.busy=true;got=b.purse&&b.purse[0]}
    ok(got&&got.crowns>=2&&e.robbed&&e.bonusAP===-2,'a purse lifted, the foe loses 2 AP');u.ap=9;ok(!X.validTargets(u,pp).has(KU(e)),'each foe is robbed once');
    const w0=X.mkEnemy('wolf','beast');w0.alive=true;w0.eid='wolf';ok(!X.hasPurse(w0),'a wolf carries no purse');
    const c0=X.G.crowns,s0=X.G.stash.length;for(const x of A.E)x.alive=false;const res=X.resolveBattle(true),sp=res.spoils;
    ok(sp&&sp.stolen&&sp.stolen.crowns===got.crowns&&X.G.stash.length>=s0+got.items.length,'the take comes home');
    ok(sp.fingers&&sp.fingers.n===2&&X.G.crowns===c0+res.crowns+got.crowns,'Light fingers: +10% of the field crowns for each of the 2 rogues');
    ok(/Light fingers/.test(X.brSpoils(res))&&/purses/.test(X.brSpoils(res)),'the result sheet says so');X.B=null;X.mode='world';return JSON.stringify({c:got.crowns,i:got.items})};
  const a=await take(SEED+7),a2=await take(SEED+7);ok(a===a2,'the same seed lifts the same purse: '+a);
  fresh(SEED+6);{const A=await arena(SEED+8,[rogue('thief'),rogue('cutthroat')]),b=A.b,[u]=A.P;b.purse=[{u,side:0,mid:u.m.id,name:u.name,crowns:50,items:[]}];X.G.roster=X.G.roster.filter(m=>m!==u.m);
   const c0=X.G.crowns,res={crowns:0};X.rogueSpoils(b,res,false);ok(X.G.crowns===c0&&!res.spoils,'a dead thief on a lost field brings nothing home');X.B=null;X.mode='world'}
  console.log('Pickpocket (deterministic: '+a+'), the spoils, Light fingers: ok') }
section('autoLearn and the AI');
{ fresh(SEED+9);const m=X.newMerc('cutthroat');m.trees=['assassin','shadow','rogue','skirmisher'];m.gift=null;m.eq.w='rondel';m.eq.a='padded';X.gainXP(m,X.XPT[12]);m.pend=0;X.autoLearn(m);
  ok(m.perks.filter(id=>TREES.includes(id.split('.')[0])).length>=8,'autoLearn spends most points on the rogue trees for a light build: '+m.perks.join());
  const h=X.newMerc('cutthroat');h.trees=['assassin','vanguard','bulwark','survivor'];h.gift=null;h.eq.w='greataxe';h.eq.s=null;h.eq.b=null;X.gainXP(h,X.XPT[6]);h.pend=0;X.autoLearn(h);
  ok(!h.perks.includes('assassin.6')&&!h.perks.includes('assassin.2')&&!h.perks.includes('assassin.5'),'no light-weapon perks for a greataxe: '+h.perks.join());
  const use={},u0=X.ctx.useAbility,f0=X.ctx.foeUse;X.ctx.useAbility=async function(u,a,k){if(u.side===0)use[a.id]=(use[a.id]||0)+1;return u0(u,a,k)};X.ctx.foeUse=async function(u,a,k){if(u.side===0)use[a.id]=(use[a.id]||0)+1;return f0(u,a,k)};
  let wins=0,n=0,stolen=0;for(let i=0;i<10;i++){const G=fresh(SEED+20+i);G.roster.length=0;for(const bg of ['cutthroat','thief','acrobat','cutthroat','thief','acrobat']){const r=rogue(bg,['rondel','stiletto','shortsword'][i%3]);X.gainXP(r,X.XPT[8]);r.lvl=8;r.pend=0;r.pp=0;r.eq.h='hood';r.hp=X.calc(r).hp;G.roster.push(r)}
   const res=await X.autoBattle({f:['bandit','gob','orc','free','east'][i%5],mult:.6,biome:'plains',pilot:'sensible',src:{type:'test'},turnCap:4000});ok(res&&!res.stuck,'an auto battle ended');n++;if(res.win)wins++;if(res.spoils&&res.spoils.stolen)stolen+=res.spoils.stolen.crowns;X.B=null;X.mode='world'}
  X.ctx.useAbility=u0;X.ctx.foeUse=f0;console.log('AI use over '+n+' battles ('+wins+' won, '+stolen+' crowns lifted): '+JSON.stringify(use));
  for(const id of ['shadowstrike','deathmark','coupdegrace','pickpocket','pocketsand','slipaway','blur','untouchable'])ok(use[id]>0,'the AI never used '+id) }
section('old saves: thieves and their kin reroll their empty tree slots (v17)');
{ const G=fresh(SEED+40);const t=X.newMerc('thief');t.trees=['marksman','sharpshooter','skirmisher','scout'];t.perks=['skirmisher.1'];t.pp=0;G.roster.push(t);
  const v=X.newMerc('vanguard'in X.BG?'vanguard':'militia');const vt=v.trees.join();G.roster.push(v);
  const g=X.clone(G);g.v=16;g.fog=null;const r=X.readSaveRaw(JSON.stringify(g));ok(r.state==='ok','a v16 save loads: '+r.state+' '+(r.why||''));
  const t2=r.g.roster.find(m=>m.id===t.id),v2=r.g.roster.find(m=>m.id===v.id);
  ok(t2.trees.includes('skirmisher')&&t2.perks.includes('skirmisher.1'),'the tree with a learned perk stays, and its perk: '+t2.trees.join());
  ok(t2.trees.length===4&&t2.trees.join()!==t.trees.join()&&t2.trees.every(k=>X.BG.thief.pool.includes(k)),'the other slots are drawn again from the pool: '+t2.trees.join());
  ok(v2.trees.join()===vt,'a background without the new trees keeps its trees');
  const r2=X.readSaveRaw(JSON.stringify(g));ok(r2.g.roster.find(m=>m.id===t.id).trees.join()===t2.trees.join(),'the reroll is deterministic');
  let got=0;for(let i=0;i<40;i++){const m=X.newMerc('thief');m.id=9000+i;m.trees=['marksman','sharpshooter','skirmisher','scout'];m.perks=[];if(X.rerollRogueTrees(m,G.seed)&&m.trees.some(k=>['assassin','rogue','shadow'].includes(k)))got++}
  ok(got>=30,'most rerolled thieves draw a light-blade tree: '+got+'/40');console.log('v17 reroll: ok ('+got+'/40 thieves drew one)') }
console.log('\nOK rogues');process.exit(0)})();
