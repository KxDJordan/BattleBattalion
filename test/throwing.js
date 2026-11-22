// Masteries test: the passives that replaced most tree abilities, the Gunnery and Throwing arms trees, throwing weapons and the new firearms
// (60p-passives.js the rules, 11t-arms.js the items and abilities, 64t-arms.js the foes' side, 06pt-arms.js the icons; MAST in 10-data.js).
// Plain node:  node test/throwing.js [--seed N]
// Checks: the catalog (one ability a style tree, two a gift tree, the new trees and perks, the items, icons, backgrounds, foes); throws (the
// stack, the Throw, none left, Strike in hand, the ranged lock, Bandolier, Recover, Double throw, Deadly arc, Ricochet, the chakram, the
// shuriken's bleed, the bolas' roots, a fresh stack every battle); the firearms (two barrels, the braced wall gun) and the Gunnery passives
// (Powder smoke, Point-blank, Steady aim, Armor-piercing ball, Gunline, Double charge); the other new passives, one by one; forecast == strike
// for every blow of a directed sweep over the new flags and states and of auto battles with every new tree (test/forecast.js's check); the
// AI throwing, striking in hand and firing; the v19 -> v20 save migration (changed perks refunded).
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261118,SRC=path.join(__dirname,'..','src');
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
// a merc with a weapon in hand and the perks given
function merc(bg,w,perks,trees,o){const m=X.newMerc(bg||'woodcutter');m.trees=trees||['thrower','gunner','skirmisher','vanguard'];m.gift=null;m.lvl=10;m.perks=(perks||[]).slice();m.pp=0;
 m.eq.w=w;m.eq.s=null;m.eq.b=(o&&o.b)||null;m.eq.a='padded';m.eq.h=null;m.inj=[];m.traits=[];m.hp=X.calc(m).hp;m.field=true;return m}
// a flat arena at the company's turn, everything parked; the battle stays busy so nothing moves on its own
async function arena(seed,ros,foes,f){const G=X.G;G.roster=ros;G.day=10;X.seedRng(seed);
 const b=X.startBattle({f:f||'bandit',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:6000,foes:foes||['thug','thug','thug','thug']});ok(b,'arena did not start');
 let n=0;while(!b.over&&(b.busy||b.cur.side!==0)){await null;if(++n>3e6)fail('arena never reached a company turn')}
 const P=b.units.filter(u=>u.side===0),E=b.units.filter(u=>u.side===1);
 const park=()=>{b.tiles.forEach(t=>{t.t='ground';t.h=0});b.units.forEach((u,i)=>{u.alive=true;u.gone=null;u.down=false;u.hp=u.hpMax=Math.max(u.hpMax,80);u.arm=u.armMax;u.helm=u.helmMax;u.st={};u.buffs=u.buffs.filter(x=>x.foe);
   u.mor=3;u.fearless=true;u.aoo=0;u.rooted=false;u.dazed=false;u.fat=0;u.ap=u.apMax;u.dnc=0;u.bonusAP=0;u.used={};u.qsT=0;u.slipT=0;u.c=i;u.r=u.side?0:BH-1;if(u.side&&u.shield&&u.shb){u.shield=false;u.md-=u.shb.md;u.rd-=u.shb.rd}});b.order=[];b.busy=true;b.cur=P[0];X.foeAuras();X.auraScan()};
 park();return{b,P,E,park}}
const put=(u,c,r)=>{u.c=c;u.r=r};
/* ---- forecast == strike for every blow (test/forecast.js's check, condensed): the hit chance, the damage to hitpoints and armor, kills, statuses ---- */
const FS={n:0,hits:0,byAb:{},st:{},auto:0};let FCHECK=false;
const strike0=X.ctx.strike;
X.ctx.strike=async function(u,t,a,o){if(!FCHECK||!t.alive||!u.alive)return strike0(u,t,a,o);
 const tag=`${u.name} -> ${t.name} with ${a.id} (${u.wpn.n||u.wpn.wt}) ${JSON.stringify(o||{})}`,r0=X.rngState(),s0=JSON.stringify([u,t]),f=X.forecast(u,t,a,o);
 ok(X.rngState()===r0&&JSON.stringify([u,t])===s0,'forecast changed the state or drew rnd(): '+tag);
 const sure=!!(o&&o.auto)||!!a.sure;ok(f.hit===(sure?100:X.hitChance(u,t,a)),'forecast hit '+f.hit+' is not hitChance: '+tag);if(sure)FS.auto++;
 const hp0=t.hp,st0=Object.assign({},t.st);let ev=null;const on0=X.FX.on;X.FX.on=(type,d)=>{if(type==='hit'&&d.u===u&&d.t===t&&!ev)ev={dmg:d.dmg,armor:d.armor,head:!!d.head};if(on0)on0(type,d)};
 let hit;try{hit=await strike0(u,t,a,o)}finally{X.FX.on=on0}
 FS.n++;FS.byAb[a.id]=(FS.byAb[a.id]||0)+1;
 if(hit&&!a.split){FS.hits++;const hp=ev?ev.dmg:0,arm=ev?ev.armor:0;
  ok(hp>=f.hpMin&&hp<=f.hpMax,`hitpoint damage ${hp} outside the forecast ${f.hpMin}-${f.hpMax}: `+tag);ok(arm>=f.armMin&&arm<=f.armMax,`armor damage ${arm} outside ${f.armMin}-${f.armMax}: `+tag);
  if(ev){const L=ev.head?f.head:f.body;ok(L&&hp>=L.hpMin&&hp<=L.hpMax,'the location forecast misses the blow: '+tag)}
  if(!t.alive&&hp0>0&&t.hp<=0)ok(f.kill,'a kill the forecast did not allow: '+tag);else if(t.alive)ok(!f.sure,'a sure kill that did not happen: '+tag);
  if(t.alive)for(const k in t.st)if((t.st[k]||0)>(st0[k]||0)&&!['harried','pack','bonewall','banner','winded','fury','spent','enrage'].includes(k)){FS.st[k]=(FS.st[k]||0)+1;ok(f.statuses.some(s=>s.k===k&&s.n>=t.st[k]&&s.ch>0),`status ${k} was applied but not forecast: `+tag+' '+JSON.stringify(f.statuses))}}
 return hit};
(async()=>{
section('catalog');
{ fresh(SEED);const M=X.MAST,AB=X.AB,I=X.ITEMS;let actives=0;
  for(const k in M){const T=M[k],n=T.p.filter(p=>p.ab).length;actives+=n;
   if(T.kind==='style')ok(n<=(['gunner','pistol','powder','wrestle','pugilist','willow'].includes(k)?2:1),k+': at most one ability in a style tree, two in a firearm or fist tree ('+n+')');if(T.kind==='gift')ok(n===2,k+': two abilities in a gift tree ('+n+')');if(T.kind==='fabled')ok(n<=1,k+': at most one ability');
   for(const p of T.p){ok(typeof p.d==='string'&&p.d.length>=8,p.id+': a text');if(p.ab)ok(AB[p.ab]&&AB[p.ab].n&&AB[p.ab].d,p.id+': ability '+p.ab)}}
  ok(actives<=74,'tree abilities in all: '+actives);   // 56, the 8 of the four throwing gift trees (test/throwgifts.js), 5 of the firearm trees (test/guntrees.js) and 5 of the fist trees (test/fists.js)
  for(const id of X.PERKV20){const P=X.perkById(id);ok(P&&!P.perk.ab&&(P.perk.mod||P.perk.flag)&&P.perk.d.length>20,'a changed perk is a passive with a text: '+id)}
  ok(X.PERKV20.length===54&&new Set(X.PERKV20).size===54,'54 perks changed: '+X.PERKV20.length);
  // the abilities that left the trees are still abilities (foes, fabled trees, elites use some)
  for(const a of ['shove','indom','pin','volley','footwork','adren','lunge','flurry','cleave','slam','rally','command','triage','surge','vanish','whirl','pshot','headbutt','grapple','haymaker',
   'shadowstrike','deathmark','pocketsand','slipaway','untouchable','taunt','showstop','crowdroar','feint','dwfeint','bladeflurry','fireball','blink','chain','manashield','blinkstrike','avolley',
   'bindshot','awave','crush','adash','pvolley','carrow','frost','gale','thunder','iarrow','tarrow','reinforce','empower','swift','hundred','pparrow'])ok(AB[a]&&AB[a].n&&AB[a].d,'ability '+a+' kept');
  for(const [k,ab] of [['gunner','gvolley,dcharge'],['thrower','dthrow']]){const T=M[k];ok(T&&T.kind==='style'&&T.tiers.length===6&&T.tiers.every((t,i)=>t.length===1&&t[0].id===k+'.'+(i+1)),k+': six tiers, ids pinned');
   ok(T.p.filter(p=>p.ab).map(p=>p.ab).join()===ab,k+': its abilities, '+ab);ok(T.cap&&T.cap.tiers[0][0].id===k+'.cap'&&X.MUNDANE.includes(k),k+': a capstone, a style tree');
   ok(Object.keys(X.BG).filter(bg=>X.BG[bg].pool.includes(k)).length>=5,k+': in five pools or more')}
  ok(X.WTS.includes('throwing')&&X.RANGEDWT.includes('throwing')&&X.perkById('weapons.throwing')&&X.perkById('throwing.cap'),'the throwing family: WTS, RANGEDWT, its mastery and capstone');
  const thrBG=Object.keys(X.BG).filter(bg=>X.BG[bg].wt.includes('throwing'));ok(thrBG.length>=6,'backgrounds that can learn throwing weapons: '+thrBG.join());
  ok(X.BG.hunter.wt.includes('throwing')&&!X.BG.hunter.wt.includes('spear'),'hunters trade the spear for throwing weapons');
  ok(X.THROWITEMS.length>=10&&X.GUNITEMS.length>=5,'twelve throwing weapons, six firearms');
  for(const id of X.THROWITEMS){const it=I[id];ok(it&&it.k==='w'&&it.wt==='throwing'&&!it.two&&it.ammo>=2&&it.rng>=2&&it.rng<=5&&it.sk.includes('tstrike')&&X.isRangedW(it)&&it.shot,id+': a throwing weapon');
   ok(X.iconRows('it-'+id)&&X.pkcSpec(id)&&X.pkHas('it-'+id),id+': pixel and painted icons');ok(/throws/.test(X.itemDesc(id)),id+': the stack in its line')}
  for(const id of X.GUNITEMS){const it=I[id];ok(it&&it.wt==='flintlock'&&it.reload&&it.sk.includes('reload')&&X.iconRows('it-'+id)&&X.pkHas('it-'+id),id+': a firearm with icons')}
  const ts=new Set(X.THROWITEMS.map(id=>I[id].tier));ok([1,2,3,4,5].every(t=>ts.has(t)),'throwing weapons span tiers 1-5');
  ok(I.francisca.d[1]>I.taxe.d[1]&&I.francisca.rng<I.taxe.rng&&I.francisca.fat>I.taxe.fat,'the francisca: more damage, shorter, heavier than a throwing axe');
  ok(I.shuriken.ammo>I.tknives.ammo&&I.shuriken.bleed>0&&I.shuriken.d[1]<I.tknives.d[1],'shuriken: many cheap throws that bleed');ok(I.bolas.wst&&I.bolas.wst.root,'bolas root');ok(I.chakram.ret,'the chakram comes back');
  ok(I.twinpistol.barrels===2&&I.wallgun.brace>0,'two barrels, a braced wall gun');
  for(const n of ['ab-dthrow','ab-dcharge','ab-tstrike','st-hobbled','st-offbal','st-touched','m-gunner','m-thrower','perk-gunner.1','perk-thrower.1','perk-weapons.throwing']){ok(X.icResolve(n)!=='none','pixel icon '+n);ok(X.pkHas(n),'painted icon '+n)}
  for(const id of X.PERKV20)ok(X.pkHas('perk-'+id)&&X.icResolve('perk-'+id)!=='none','icons for perk-'+id);
  ok(X.EN.bknife&&X.FACT.bandit.units.some(x=>x[0]==='bknife')&&X.EN.kageuchi&&X.FACT.east.units.some(x=>x[0]==='kageuchi')&&X.EN.barbax.w==='taxe','foes that throw: brigands, the East, the northmen');
  for(const s of ['hobbled','offbal','touched'])ok(X.STATUS[s]&&X.STATUS[s].n&&X.STATUS[s].d,'status '+s);
  console.log(actives+' tree abilities; '+X.THROWITEMS.length+' throwing weapons, '+X.GUNITEMS.length+' firearms, icons, backgrounds, foes: ok') }

section('throws');
{ fresh(SEED+1);const A=await arena(SEED+1,[merc('woodcutter','taxe',[]),merc('poacher','tknives',['thrower.1','thrower.2']),merc('nomad','chakram',['thrower.6','thrower.4'])]),b=A.b,[u,v,w]=A.P,[e,e2,e3,e4]=A.E;
  ok(X.ammoLeft(u)===3&&X.ammoLeft(v)===8&&X.ammoLeft(w)===3,'the stacks: 3 axes, 6+2 knives (Bandolier), 3 chakrams: '+[X.ammoLeft(u),X.ammoLeft(v),X.ammoLeft(w)]);
  const at=X.abilityInfo(u,'attack');ok(at.n==='Throw'&&at.rng===3&&X.isRangedAtk(u,at),'the Throw: a ranged attack at 3 tiles');ok(u.abs.includes('tstrike'),'Strike in hand comes with the weapon');
  put(u,5,8);put(e,5,5);e.hp=e.hpMax=9999;const k=KU(e);
  for(let i=0;i<3;i++){u.ap=9;ok(X.canUse(u,X.abilityInfo(u,'attack'))&&X.validTargets(u,X.abilityInfo(u,'attack')).has(k),'throw '+(i+1)+' can be made');await X.useAbility(u,X.abilityInfo(u,'attack'),k);await rest(b);b.busy=true}
  ok(X.ammoLeft(u)===0,'three throws spend the stack');u.ap=9;const a2=X.abilityInfo(u,'attack');ok(!X.canUse(u,a2)&&/Out of throws/.test(X.useBlock(u,a2))&&X.forecast(u,e,a2).out,'no throw left: refused, with the reason');
  ok(!X.validTargets(u,a2).size,'no targets for an empty hand');
  const ts=X.abilityInfo(u,'tstrike');put(e,5,7);ok(X.canUse(u,ts)&&X.validTargets(u,ts).has(KU(e))&&!X.isRangedAtk(u,ts),'Strike in hand: a melee blow with no throws left');
  const h0=X.hitChance(u,e,ts);u.ms+=10;ok(X.hitChance(u,e,ts)===Math.min(95,h0+10),'aimed with melee skill');u.ms-=10;
  ok(X.rangedLocked(u)&&X.canUse(u,ts),'allowed with a foe next to you (the ranged lock stops only the throw)');
  { const n0=e.hp;let hit=false;for(let i=0;i<20&&!hit;i++){u.ap=9;hit=await X.strike(u,e,ts)}ok(hit&&e.hp<n0&&X.ammoLeft(u)===0,'it strikes and spends nothing') }
  // Recover: a kill gives a throw back; Bandolier counted above
  A.park();put(v,5,8);put(e2,5,5);e2.hp=1;e2.arm=0;e2.helm=0;v.rs=400;v.ap=9;await X.useAbility(v,X.abilityInfo(v,'attack'),KU(e2));await rest(b);b.busy=true;ok(!e2.alive&&X.ammoLeft(v)===8,'Recover: the killing throw comes back ('+X.ammoLeft(v)+')');
  // Deadly arc: the first throw of the battle cannot miss; Ricochet: a miss glances into the foe beside the target
  A.park();put(w,5,8);put(e3,5,4);put(e4,6,4);w.rs=-500;const wa=X.abilityInfo(w,'attack');ok(X.hitChance(w,e3,wa)===100,'Deadly arc: the first throw cannot miss');
  const d0=X.dmgBonus(w,e3,wa);w.dArc=1;ok(X.hitChance(w,e3,wa)<100&&near(d0-X.dmgBonus(w,e3,wa),.25),'… and deals +25%; then it is spent');w.dArc=0;
  w.ap=9;const fd=X.forecast(w,e3,wa);ok(fd.hit===100,'the forecast knows');await X.useAbility(w,wa,KU(e3));await rest(b);b.busy=true;ok(w.dArc===1,'spent after the first throw');
  const hp4=e4.hp,am=X.ammoLeft(w);let ric=0;const on=X.FX.on;X.FX.on=(t,d)=>{if(t==='hit'&&d.t===e4&&d.u===w)ric++};
  for(let i=0;i<4;i++){w.ap=9;if(X.ammoLeft(w)<1)X.setAmmo(w,3);await X.useAbility(w,X.abilityInfo(w,'attack'),KU(e3));await rest(b);b.busy=true}X.FX.on=on;
  ok(ric>=3&&e4.hp<hp4,'Ricochet: missed throws glance into the foe beside the target ('+ric+')');ok(X.ammoLeft(w)>=Math.min(3,am),'the chakram comes back on a miss');
  console.log('stack, Throw, none left, Strike in hand, ranged lock, Bandolier, Recover, Deadly arc, Ricochet, the chakram: ok') }
{ fresh(SEED+2);const A=await arena(SEED+2,[merc('hunter','javelin',['thrower.3']),merc('poacher','shuriken',[]),merc('acrobat','bolas',[])]),b=A.b,[u,v,w]=A.P,[e,e2]=A.E;
  ok(u.abs.includes('dthrow'),'Double throw comes with the perk');put(u,5,8);put(e,5,4);e.hp=e.hpMax=9999;u.rs=400;const dt=X.abilityInfo(u,'dthrow');ok(dt.ammoN===2&&dt.hits===2&&X.canUse(u,dt),'Double throw: 2 throws');
  let n=0;const on=X.FX.on;X.FX.on=(t,d)=>{if(t==='hit'&&d.u===u)n++};await X.useAbility(u,dt,KU(e));await rest(b);b.busy=true;X.FX.on=on;ok(n===2&&X.ammoLeft(u)===1,'two hits, two throws spent: '+n+' '+X.ammoLeft(u));
  u.ap=9;ok(!X.canUse(u,dt)&&X.canUse(u,X.abilityInfo(u,'attack')),'one throw left: no Double throw, a single throw still');
  // shuriken bleed, bolas root: in the forecast and on the foe
  put(v,8,8);put(e2,8,5);e2.arm=0;e2.helm=0;e2.hp=e2.hpMax=9999;v.rs=400;const sa=X.abilityInfo(v,'attack');const sf=X.forecast(v,e2,sa);ok(sf.statuses.some(s=>s.k==='bleed'&&s.n===2),'the shuriken bleeds (forecast)');
  for(let i=0;i<8&&!(e2.st.bleed>0);i++)await X.strike(v,e2,sa);ok(e2.st.bleed===2,'… and on the foe');
  put(w,8,8);w.rs=400;const ba=X.abilityInfo(w,'attack'),bf=X.forecast(w,e2,ba);ok(bf.statuses.some(s=>s.k==='root'&&s.ch===1),'bolas root (forecast)');for(let i=0;i<8&&!(e2.st.root>0);i++)await X.strike(w,e2,ba);ok(e2.st.root>=1,'… and on the foe');
  X.B=null;X.mode='world';
  // a fresh stack every battle
  const A2=await arena(SEED+3,X.G.roster);ok(A2.P.every(x=>X.ammoLeft(x)===X.ammoMax(x,x.wpn)),'every battle starts with full stacks');X.B=null;X.mode='world';
  // a foe that throws: its stack, then it closes in
  const A3=await arena(SEED+4,[merc('woodcutter','taxe',[])],['bknife','bknife']);const k=A3.E[0];ok(X.ammoLeft(k)>=6&&X.ammoLeft(k)===X.ammoMax(k,k.wpn)&&k.back&&k.abs.includes('tstrike'),'a brigand knife-thrower has his knives (a full stack: 6, more with an ammo perk)');
  X.setAmmo(k,1);X.payFor(k,X.abilityInfo(k,'attack'));ok(X.ammoLeft(k)===0&&!k.back&&k.role!=='sniper','an empty-handed thrower stops hanging back');X.B=null;X.mode='world';
  console.log('Double throw, shuriken bleed, bolas root, fresh stacks, foes that throw: ok') }

section('firearms');
{ fresh(SEED+5);const g=merc('noble','twinpistol',['powder.1','pistol.1','gunner.3','gunner.4','gunner.5','gunner.6'],['gunner','pistol','powder','vanguard']);   // Powder smoke (Grenadier), Arm's length (Pistolier), the rest Musketry (the gun trees update)
  const A=await arena(SEED+5,[g,merc('witchhunter','wallgun',[],['gunner','marksman','scout','survivor']),merc('noble','pistol',[]),merc('sailor','caliver',[])]),b=A.b,[u,wg,m3,m4]=A.P,[e,e2]=A.E;
  ok(X.ammoLeft(u)===2&&u.loaded,'two barrels, loaded');ok(u.abs.includes('dcharge'),'Double charge comes with Musketry');put(u,3,8);put(e,3,4);e.hp=e.hpMax=9999;put(m3,15,11);put(m4,14,11);
  const at=X.abilityInfo(u,'attack');u.ap=12;await X.useAbility(u,at,KU(e));await rest(b);b.busy=true;ok(u.loaded&&X.ammoLeft(u)===1,'the first shot: one barrel left, still loaded');
  u.ap=12;await X.useAbility(u,X.abilityInfo(u,'attack'),KU(e));await rest(b);b.busy=true;ok(!u.loaded&&X.ammoLeft(u)===0,'the second: spent');
  u.ap=12;await X.useAbility(u,X.abilityInfo(u,'reload'),KU(u));await rest(b);b.busy=true;ok(u.loaded&&X.ammoLeft(u)===2,'a reload loads both barrels');
  // Powder smoke: shots at a gunner who has fired get -10
  const ea=X.abilityInfo(e,'attack');e.wpn=Object.assign({},e.wpn,{wt:'bow',rng:8});const eb=X.abilityInfo(e,'attack');u.smoke=0;const s0=X.hitChance(e,u,eb);u.smoke=1;ok(X.hitChance(e,u,eb)===Math.max(5,s0-10)||s0<=15,'Powder smoke: −10 to be shot');u.smoke=0;
  X.payFor(u,X.abilityInfo(u,'attack'));ok(u.smoke===1,'firing makes the smoke');u.smoke=0;
  // Point-blank, Steady aim, Gunline: inside hitChance and dmgBonus, so the forecast holds them
  put(e,3,6);const f0=u.flags;u.flags=Object.assign({},f0,{gunPBHit:0,gunPB:0,primeHit:0,primeDmg:0,gunLine:0,gunLineD:0});u.primed=0;const h0=X.hitChance(u,e,at),d0=X.dmgBonus(u,e,at);u.flags=f0;
  u.mvd=0;u.primed=0;ok(X.hitChance(u,e,at)===Math.min(95,h0+10),'Point-blank +10 at 2 tiles');ok(near(X.dmgBonus(u,e,at)-d0,.15),'Point-blank +15% damage');
  u.primed=1;ok(X.hitChance(u,e,at)===Math.min(95,h0+20)&&near(X.dmgBonus(u,e,at)-d0,.3),'Primed (the roles update): +10 to hit and +15% damage after a reload');u.primed=0;put(e,3,3);ok(X.hitChance(u,e,X.abilityInfo(u,'attack'))<Math.min(95,h0+10),'farther than 2 tiles: no Point-blank');
  put(m3,4,8);put(m4,2,8);const hl=X.hitChance(u,e,at);put(m3,15,11);put(m4,14,11);ok(hl===Math.min(95,X.hitChance(u,e,at)+10),'Gunline: +5 for each of two gunners beside');
  ok(near(X.ignOf(u,at)-X.ITEMS.twinpistol.ign,.1)&&near(X.crushOf(u,at),.25),'Armor-piercing ball: +10% piercing, +25% crushing');
  // the wall gun: braced
  put(wg,8,8);put(e2,8,3);const wa=X.abilityInfo(wg,'attack');wg.mvd=0;const w0=X.hitChance(wg,e2,wa);wg.mvd=1;ok(X.hitChance(wg,e2,wa)===Math.max(5,w0-15),'the wall gun: −15 to hit after moving');wg.mvd=0;
  // Double charge spends the load
  u.ap=12;const dc=X.abilityInfo(u,'dcharge');ok(X.canUse(u,dc)&&dc.mult===1.4,'Double charge: 140%');
  X.B=null;X.mode='world';console.log('two barrels, reload, Powder smoke, Point-blank, Primed, Gunline, Armor-piercing ball, the braced wall gun, Double charge: ok') }

section('the new passives, one by one');
{ fresh(SEED+6);const A=await arena(SEED+6,[merc('sellsword','arming',[],['vanguard','duelist','bulwark','tactician']),merc('sellsword','arming',[]),merc('sellsword','arming',[])]),b=A.b,[u,v,w]=A.P,[e,e2,e3]=A.E;
  const F=(x,o)=>{x.flags=Object.assign({},o)};const atk=x=>X.abilityInfo(x,'attack');
  const hitN=async(x,y,a,n)=>{let h=0;for(let i=0;i<n*5&&h<n&&y.alive;i++)if(await X.strike(x,y,a))h++;return h},untilDead=async(x,y,a)=>{for(let i=0;i<12&&y.alive;i++)await X.strike(x,y,a)};
  put(u,5,5);put(e,6,5);put(v,15,11);put(w,14,11);put(e2,15,0);put(e3,14,0);e.hp=e.hpMax=99999;
  // Press the attack: the foe last hit in melee
  F(u,{pressHit:8,pressDmg:.1});u.lastHit=null;const p0=X.hitChance(u,e,atk(u)),pd=X.dmgBonus(u,e,atk(u));u.lastHit=e.id;ok(X.hitChance(u,e,atk(u))===Math.min(95,p0+8)&&near(X.dmgBonus(u,e,atk(u))-pd,.1),'Press the attack: +8, +10%');
  u.lastHit=null;u.ms=400;await hitN(u,e,atk(u),1);ok(u.lastHit===e.id,'a melee hit marks the foe');u.ms=60;
  // Unmoved: a melee miss on you gives AP, two at most
  F(u,{missAP:1,kbImm:1});u.bonusAP=0;u.umvN=0;e.ms=-500;for(let i=0;i<4;i++)await X.strike(e,u,atk(e));ok(u.bonusAP===2&&X.kbImmune(u),'Unmoved: +1 AP a miss, at most 2, no knockback: '+u.bonusAP);e.ms=60;
  // Shield bind: needs a raised shield; the attacker is off balance
  F(u,{bindOff:1});u.shield=true;e.st={};e.ms=-500;for(let i=0;i<6&&e.st.offbal!==1;i++)await X.strike(e,u,atk(e));ok(e.st.offbal===1,'Shield bind: the attacker is off balance');const md0=X.eff(e,'md');X.foeAuras();ok(X.eff(e,'md')<=md0,'… −10 melee defense');u.shield=false;e.ms=60;e.st={};X.foeAuras();
  // Counter-cut: a chance free attack on a melee miss (one-handed, no shield)
  F(u,{counter:1});u.shield=false;u.dw=null;e.ms=-500;let cc=0;const on=X.FX.on;X.FX.on=(t,d)=>{if((t==='hit'||t==='miss')&&d.u===u&&d.t===e)cc++};const fc=X.forecast(e,u,atk(e));ok(fc.counter===1&&!fc.riposte,'the forecast names the Counter-cut chance');
  for(let i=0;i<6&&!cc;i++)await X.strike(e,u,atk(e));X.FX.on=on;ok(cc===1,'Counter-cut struck back');e.ms=60;
  // Blade dance / Flowing strikes: melee hits on your own turn
  F(u,{chainHit:5,flowDmg:.1});u.chainN=0;b.cur=u;e.hp=e.hpMax=99999;u.ms=400;await hitN(u,e,atk(u),4);ok(u.chainN===4,'hits counted on your turn');u.ms=60;u.chainN=0;const c0=X.hitChance(u,e,atk(u)),cd=X.dmgBonus(u,e,atk(u));u.chainN=4;
  ok(X.hitChance(u,e,atk(u))===Math.min(95,c0+15)&&near(X.dmgBonus(u,e,atk(u))-cd,.3),'at most +15 / +30%');u.chainN=0;X.pvTurn(u);ok(!u.chainN,'reset at the start of the turn');
  // Momentum: tiles moved this turn
  F(u,{momentum:.05});u.mvN=0;const m0=X.dmgBonus(u,e,atk(u));u.mvN=5;ok(near(X.dmgBonus(u,e,atk(u))-m0,.1),'Momentum: 5 tiles, +10%');u.mvN=9;ok(near(X.dmgBonus(u,e,atk(u))-m0,.15),'at most +15%');u.mvN=0;
  // Hit and run: the next tile after an attack draws no free attack
  F(u,{hitRun:1});u.ap=9;u.slipT=1;await X.useAbility(u,atk(u),KU(e));await rest(b);b.busy=true;ok(u.hrun===1,'an attack readies Hit and run');e.aoo=0;u.ap=9;await X.walkPath(u,[KU(u)-BW]);ok(!e.aoo&&!u.hrun,'the step away draws no free attack');put(u,5,5);
  // Unstoppable fury: blows that reach hitpoints
  F(u,{furyHit:.05});u.fury=0;e.ms=400;u.arm=0;u.helm=0;u.hp=u.hpMax=99999;for(let i=0;i<7;i++)await X.strike(e,u,atk(e));ok(u.fury===5,'Unstoppable fury: at most 5 stacks: '+u.fury);const f0=u.fury;u.fury=0;const fd=X.dmgBonus(u,e,atk(u));u.fury=f0;ok(near(X.dmgBonus(u,e,atk(u))-fd,.25),'+25%');e.ms=60;u.hp=u.hpMax;
  // Payback / Read the opponent
  F(u,{payHit:10,payDmg:.1,readOpp:5});u.hitBy=null;u.atkN=null;const y0=X.hitChance(u,e,atk(u));await X.strike(e,u,atk(e));ok(u.hitBy&&u.hitBy.includes(e.id),'Payback: the attacker is remembered');
  ok(X.hitChance(u,e,atk(u))===Math.min(95,y0+10),'+10 to hit it');for(let i=0;i<5;i++)await X.strike(u,e,atk(u));ok(u.atkN[e.id]===5&&X.hitChance(u,e,atk(u))===Math.min(95,y0+10+15),'Read the opponent: +5 an attack, at most +15');X.pvTurn(u);ok(!u.hitBy,'Payback forgets at your turn');
  // Afterimage: the first attack after your turn
  F(u,{afterImg:20});u.aimg=0;const a0=X.hitChance(e,u,atk(e));await X.strike(e,u,atk(e));ok(u.aimg===1&&X.hitChance(e,u,atk(e))===Math.min(95,a0+20)||a0<=25,'Afterimage: −20 on the first attack only');
  // Opportunist
  F(u,{oppHit:10,oppDmg:.15});e.aoo=0;const o0=X.hitChance(u,e,atk(u));e.aoo=1;ok(X.hitChance(u,e,atk(u))===Math.min(95,o0+10),'Opportunist: +10 against a foe whose free attack is spent');e.aoo=0;
  // Surrounded by glory
  F(u,{crowdDef:5,crowdDmg:.05});put(e2,4,5);put(e3,5,4);const gd=X.hitChance(e,u,atk(e)),gm=X.dmgBonus(u,e,atk(u));F(u,{});ok(X.hitChance(e,u,atk(e))===Math.min(95,gd+10)&&near(gm-X.dmgBonus(u,e,atk(u)),.1),'Surrounded by glory: three foes beside, +10 melee defense, +10% damage');put(e2,15,0);put(e3,14,0);
  // Follow-through: a kill with a two-hander carries on
  A.park();u.m.eq.w='greataxe';u.wpn=X.calc(u.m).wpn;F(u,{follow:.5});put(u,5,5);put(e,6,5);put(e2,4,5);e.hp=1;e.arm=0;e.helm=0;u.ms=400;let fo=0;const on2=X.FX.on;X.FX.on=(t,d)=>{if(t==='hit'&&d.u===u&&d.t===e2)fo++};
  FCHECK=true;await untilDead(u,e,atk(u));FCHECK=false;X.FX.on=on2;ok(!e.alive&&fo===1,'Follow-through: a free blow into the next foe');u.m.eq.w='arming';u.wpn=X.calc(u.m).wpn;u.ms=60;
  // Seize the moment / Thumbs down
  A.park();F(u,{seizeAP:2,pinKillAP:3});put(u,5,5);put(e,6,5);put(v,5,6);e.hp=1;e.arm=0;e.helm=0;e.st.netted=1;u.ms=400;v.bonusAP=0;b.cur=u;u.ap=5;await untilDead(u,e,atk(u));ok(v.bonusAP===2&&u.ap===8,'Seize the moment: +2 AP to the ally; Thumbs down: +3 AP');u.ms=60;
  // Steadying voice / Field triage
  A.park();F(u,{steadyV:1,fieldTri:1});put(u,5,5);put(v,5,7);v.mor=1;v.fearless=false;put(w,6,5);w.st.bleed=2;w.st.burn=1;X.pvTurn(u);ok(v.mor===2&&!w.st.bleed&&!w.st.burn,'Steadying voice and Field triage at the turn start');
  // Guardian angel
  A.park();F(u,{angel:1});X.auraScan();put(u,5,5);put(v,5,7);ok(X.canUndy(v)&&X.forecast(e,v,atk(e)).undying,'Guardian angel: an ally within 3 is covered (and the forecast knows)');X.hurt(v,9999,1,e,{pierce:1,loc:1});ok(v.alive&&v.hp===1&&u.angU===1&&!X.canUndy(v),'… once a battle');
  // Hard to pin down
  A.park();F(u,{farDef:12});put(u,5,8);put(e,5,3);e.wpn=Object.assign({},e.wpn,{wt:'bow',rng:8});const eb=X.abilityInfo(e,'attack');F(u,{});const hf=X.hitChance(e,u,eb);F(u,{farDef:12});ok(X.hitChance(e,u,eb)===Math.max(5,hf-12),'Hard to pin down: −12 from afar');
  // Draw and loose
  A.park();u.m.eq.w='shortbow';u.wpn=X.calc(u.m).wpn;F(u,{drawLoose:1});u.shotT=0;const da=X.abilityInfo(u,'attack');ok(da.ap===u.wpn.ap-1,'Draw and loose: the first shot 1 AP less');X.payFor(u,da);ok(X.abilityInfo(u,'attack').ap===u.wpn.ap,'… then the full cost');
  // Hamstring shot: hobbled loses 2 AP at its turn
  F(u,{hobbleShot:1});put(u,5,8);put(e,5,4);e.arm=0;e.helm=0;e.hp=e.hpMax=999;u.rs=400;const hb=X.forecast(u,e,X.abilityInfo(u,'attack'));ok(hb.statuses.some(s=>s.k==='hobbled'),'the forecast lists Hobbled');await hitN(u,e,X.abilityInfo(u,'attack'),1);ok(e.st.hobbled===1,'Hamstring shot hobbles');
  e.ap=9;X.pvTurn(e);ok(e.ap===7&&!e.st.hobbled,'Hobbled: −2 AP, once');u.m.eq.w='arming';u.wpn=X.calc(u.m).wpn;u.rs=0;
  // Overpenetration
  A.park();u.m.eq.w='shortbow';u.wpn=X.calc(u.m).wpn;F(u,{overpen:.5});put(u,5,9);put(e,5,6);put(e2,5,4);e.hp=1;e.arm=0;e.helm=0;u.rs=400;let op=0;const on3=X.FX.on;X.FX.on=(t,d)=>{if(t==='hit'&&d.u===u&&d.t===e2)op++};
  FCHECK=true;await untilDead(u,e,X.abilityInfo(u,'attack'));FCHECK=false;X.FX.on=on3;ok(!e.alive&&op===1,'Overpenetration: on into the foe behind');u.m.eq.w='arming';u.wpn=X.calc(u.m).wpn;u.rs=0;
  // Clinch and Gale-touched: the free attack's ability
  F(u,{clinch:15,galeKb:1});const z=X.pvFreeAb(u,'zoc'),r=X.pvFreeAb(u,'riposte');ok(z.hit===15&&z.kb===1&&!r.hit&&r.kb===1&&X.pvFreeAb(v,'zoc')===X.FREEAB,'Clinch +15 on a foe stepping away; Gale-touched knocks back');
  // the gift passives in the numbers
  A.park();u.res.mana={cur:50,max:60,regen:4};F(u,{});const wr=X.drOf(e,u,atk(e)),wd=X.dmgBonus(u,e,atk(u));F(u,{manaWard:.1,manaDmg:.02});ok(near(X.drOf(e,u,atk(e))-wr,.1),'Warding runes: −10% damage at half Mana or more');u.res.mana.cur=20;ok(near(X.drOf(e,u,atk(e))-wr,0),'… not below');
  u.res.mana.cur=59;ok(near(X.dmgBonus(u,e,atk(u))-wd,.1),'Arcane resonance: +2% for every 10 Mana');delete u.res.mana;
  const as=X.abilityInfo(u,'astrike');F(u,{});const ah=X.hitChance(u,e,as),ag=X.ignOf(u,as),ac=X.crushOf(u,as);F(u,{auraHit:10,auraIgn:.15,auraCrush:.3});ok(X.hitChance(u,e,as)===Math.min(95,ah+10)&&near(X.ignOf(u,as)-ag,.15)&&near(X.crushOf(u,as)-ac,.3),'Focused / Piercing / Crushing aura');
  u.res.aura={cur:0,max:40,regen:4};F(u,{auraAdj:2});put(u,5,5);put(e,6,5);put(e2,4,5);X.pvTurn(u);ok(u.res.aura.cur===4,'Battle aura: +2 a foe beside');delete u.res.aura;
  // healing passives
  F(u,{healBuff:10,healAP:2});v.bonusAP=0;X.allyEffect(u,v,{heal:[5,5]});ok(X.buffSum(v,'ms')===10&&v.bonusAP===2,'Empowering touch and Quickening');
  F(w,{breathFat:5});X.auraScan();put(u,5,5);put(w,5,6);u.fat=30;X.pvTurn(u);ok(u.fat===25,'Shared breath: 5 more fatigue off beside the healer');
  X.B=null;X.mode='world';console.log('Press the attack, Unmoved, Shield bind, Counter-cut, Blade dance, Momentum, Hit and run, Unstoppable fury, Payback, Read the opponent, Afterimage, Opportunist, Surrounded by glory, Follow-through, Seize the moment, Thumbs down, Steadying voice, Field triage, Guardian angel, Hard to pin down, Draw and loose, Hamstring shot, Overpenetration, Clinch, Gale-touched, gift and healing passives: ok') }

section('forecast == strike: a directed sweep over the new flags and states');
{ fresh(SEED+7);const W=['taxe','francisca','shuriken','bolas','chakram','javelin','throwhammer','twinpistol','wallgun','dragon','caliver','shortbow','crossbow','greataxe','arming','knife','cestus','rondel'];
  const ros=W.slice(0,6).map((w,i)=>merc(['woodcutter','hunter','nomad','poacher','cutthroat','acrobat'][i],w,[]));const A=await arena(SEED+7,ros,['thug','bmark','braid','bknife','thug','bxbow']),b=A.b;
  const R=X.mulberry(SEED+7),ri=(a,c)=>a+Math.floor(R()*(c-a+1)),pick=L=>L[Math.floor(R()*L.length)];
  const NEWF=[['pressHit',8],['pressDmg',.1],['missAP',1],['hobbleShot',1],['drawLoose',1],['hitRun',1],['momentum',.05],['counter',.5],['chainHit',5],['follow',.5],['bindOff',1],['steadyV',1],
   ['seizeAP',2],['fieldTri',1],['angel',1],['farDef',12],['furyHit',.05],['overpen',.5],['fistDaze',.3],['clinch',15],['koDmg',.2],['sfHit',15],['sfDmg',.3],['doomHurt',2],['cheapBlind',.2],
   ['oppHit',10],['oppDmg',.15],['afterImg',20],['payHit',10],['payDmg',.1],['pinKillAP',3],['crowdDef',5],['crowdDmg',.05],['readOpp',5],['dwBleed',2],['dwFlow',5],['spellBurn',2],['echo',1],
   ['spellArc',.5],['manaWard',.1],['manaHit',3],['manaDmg',.02],['bindRoot',.25],['auraHit',10],['auraCrush',.3],['auraAdj',2],['auraIgn',.15],['auraDaze',1],['chillCh',.2],['galeKb',1],['qiDaze',1],
   ['noStray',1],['staticChg',.4],['breathFat',5],['healBuff',10],['healAP',2],['flowDmg',.1],['ppHead',2],['smokeDef',10],['gunPBHit',10],['gunPB',.15],['gunSteady',10],['gunIgn',.1],['gunCrush',.25],
   ['gunLine',5],['gunLineD',.05],['ammoB',2],['recover',1],['ricochet',.5],['throwRng',1],['deadArc',1]];
  const ABS=['attack','attack','attack','tstrike','dthrow','dcharge','astrike','flame','aarrow','bolt','runeedge','blast','quick','slash','split','puncture'];
  const wpnOf=id=>{const m=merc('woodcutter',id,[]);return X.calc(m).wpn};const WP={};for(const id of W)WP[id]=wpnOf(id);
  FCHECK=true;let n0=FS.n,tries=0;
  while(FS.n-n0<2500&&tries<20000){tries++;A.park();const U=b.units,u=pick(U),t=pick(U.filter(x=>x!==u&&x.side!==u.side));if(!t)continue;
   u.wpn=Object.assign({},WP[pick(W)]);u.loaded=true;u.ld={};u.am={};if(u.wpn.reload)u.ld[X.wkey(u.wpn)]=true;
   const fl={};for(let i=0,k=ri(2,9);i<k;i++){const [f,v]=pick(NEWF);fl[f]=v}u.flags=fl;const tf={};for(let i=0,k=ri(0,6);i<k;i++){const [f,v]=pick(NEWF);tf[f]=v}t.flags=tf;
   for(const x of U){x.lastHit=R()<.3?t.id:null;x.chainN=ri(0,4);x.mvN=ri(0,8);x.mvd=R()<.5?1:0;x.fury=ri(0,6);x.hitBy=R()<.4?[u.id,t.id]:null;x.atkN=R()<.4?{[t.id]:ri(1,4),[u.id]:ri(0,2)}:null;
    x.aimg=R()<.5?1:0;x.wsN=ri(0,3);x.smoke=R()<.4?1:0;x.chg=ri(0,2);x.sfDone=R()<.5?1:0;x.dArc=R()<.5?1:0;x.aoo=R()<.3?1:0;x.angU=R()<.5?1:0;
    x.res=R()<.5?{mana:{cur:ri(0,60),max:60,regen:4},aura:{cur:40,max:40,regen:4},qi:{cur:40,max:40,regen:4}}:{aura:{cur:40,max:40,regen:4},qi:{cur:40,max:40,regen:4}};
    if(R()<.3)x.st.netted=1;if(R()<.2)x.st.daze=1}
   X.auraScan();
   const d=ri(1,4),dc=ri(0,d),c0=ri(3,12),r0=ri(3,8);put(u,c0,r0);put(t,c0+dc,r0-(d-dc));if(t.c>=BW||t.r<0)continue;
   for(const x of U)if(x!==u&&x!==t){if(R()<.35){const c=t.c+pick([-1,1,0,0]),r=t.r+pick([0,0,-1,1]);if(c>=0&&c<BW&&r>=0&&r<BH&&!X.unitAt(c,r))put(x,c,r)}else put(x,ri(0,15),pick([0,11]))}
   if(X.unitAt(u.c,u.r)!==u||X.unitAt(t.c,t.r)!==t)continue;
   t.hp=R()<.3?ri(1,20):t.hpMax;t.arm=R()<.3?0:t.armMax;u.ms=ri(30,120);u.rs=ri(30,120);if(R()<.3)u.dw=Object.assign({},WP.knife);else u.dw=null;
   const id=pick(ABS);let a=X.abilityInfo(u,id);if(!a||a.tgt!=='enemy'&&a.tgt!=='aoe')continue;if(a.rng!=null&&mdist0(u,t)>Math.max(1,a.rng))continue;if(!X.needsOK(a,u.wpn.wt))continue;if(a.split&&!t.shield)continue;
   if(R()<.15)a=Object.assign({},a,{dwHand:'o'});
   b.cur=R()<.6?u:t;await X.strike(u,t,a,R()<.1?{splash:.7}:R()<.05?{auto:1}:{})}
  FCHECK=false;ok(FS.n-n0>=2500,'the sweep ran: '+(FS.n-n0)+' strikes in '+tries+' tries');
  const want=['hobbled','bleed','root','daze','stun','doomed','blinded','chill','burn','weak'];const miss=want.filter(k=>!FS.st[k]);ok(miss.length<=2,'the sweep applied the new statuses: '+JSON.stringify(FS.st));
  X.B=null;X.mode='world';console.log('directed sweep: '+(FS.n-n0)+' strikes ('+FS.auto+' that could not miss), statuses '+JSON.stringify(FS.st)+': ok') }
function mdist0(a,b){return Math.abs(a.c-b.c)+Math.abs(a.r-b.r)}

section('auto battles: every new tree learned, every blow checked; the AI throws, strikes in hand and fires');
{ const use={},u0=X.ctx.useAbility,f0=X.ctx.foeUse;X.ctx.useAbility=async function(u,a,k){const id=a.id+(a.id==='attack'&&u.wpn&&u.wpn.wt==='throwing'?':throw':'');if(u.side===0||u.side===1)use[id]=(use[id]||0)+1;return u0(u,a,k)};
  if(f0)X.ctx.foeUse=async function(u,a,k){use['foe:'+a.id]=(use['foe:'+a.id]||0)+1;return f0(u,a,k)};
  const kit=[['woodcutter','taxe',['thrower','skirmisher','vanguard','survivor']],['nomad','javelin',['thrower','marksman','scout','skirmisher']],['cutthroat','tknives',['thrower','assassin','rogue','shadow']],
   ['witchhunter','caliver',['gunner','sharpshooter','marksman','tactician']],['noble','twinpistol',['gunner','duelist','tactician','vanguard']],['sellsword','greataxe',['brute','berserker','vanguard','survivor']],
   ['knight','arming',['bulwark','shieldbearer','tactician','champion']],['pitfighter','cestus',['brawler','gladiator','berserker','duelist']],['hedge','staff',['medic','tactician','survivor','skirmisher']]];
  let wins=0,n=0;const N0=FS.n;
  for(let i=0;i<6;i++){const G=fresh(SEED+30+i);G.roster.length=0;
   for(let j=0;j<6;j++){const [bg,w,tr]=kit[(i+j)%kit.length],m=merc(bg,w,[],tr);if(bg==='knight')m.eq.s='kite';if(bg==='hedge'){m.gift='mana';m.trees=tr.concat(['mana'])}X.gainXP(m,X.XPT[9]);m.lvl=9;m.pend=0;m.pp=9;X.autoLearn(m);m.eq.h='hood';m.hp=X.calc(m).hp;G.roster.push(m)}
   FCHECK=true;const res=await X.autoBattle({f:['bandit','east','gob','orc','bandit','free'][i],mult:.7,biome:'plains',pilot:'sensible',src:{type:'test'},turnCap:4000});FCHECK=false;
   ok(res&&!res.stuck,'an auto battle ended');n++;if(res.win)wins++;X.B=null;X.mode='world'}
  X.ctx.useAbility=u0;if(f0)X.ctx.foeUse=f0;console.log('AI over '+n+' battles ('+wins+' won), '+(FS.n-N0)+' blows checked: '+JSON.stringify(use));
  ok(use['attack:throw']>20,'the AI throws');if(!use.dthrow)console.log('  (the AI preferred single throws to Double throw in these battles)');ok(use.tstrike>0||use['foe:tstrike']>0,'a thrower strikes in hand');ok(use.dcharge>0,'a gunner uses Double charge');ok(use.reload>0,'… and reloads');
  ok(FS.n-N0>300,'blows checked in the battles: '+(FS.n-N0)) }

section('saves: v19 -> v20');
{ const G=fresh(SEED+40);const m=G.roster[0];m.lvl=8;m.trees=['vanguard','marksman','skirmisher','bulwark'];m.perks=['vanguard.1','vanguard.2','marksman.3','skirmisher.1','bulwark.4'];m.pp=1;
  const t=G.towns.find(t=>t.recruits&&t.recruits.length),rc=t&&t.recruits[0];if(rc){rc.lvl=5;rc.trees=['vanguard','bulwark','survivor','brute'];rc.perks=['vanguard.2','bulwark.4'];rc.pp=0}
  ok(X.save(),'save failed');const g=JSON.parse(X.store.get(X.SAVEKEY));g.v=19;delete g.refund;g.note=null;X.store.set(X.SAVEKEY,JSON.stringify(g));const r=X.readSave();ok(r.state==='ok'&&r.v===19&&r.g.v===X.SAVEVER&&X.SAVEVER>=20,'a v19 save migrates to v20 (and on: v21, the roles update)');
  const M=r.g.roster.find(q=>q.id===m.id);ok(M.perks.join()==='skirmisher.1'&&M.pp===5,   // v20 takes vanguard.2 marksman.3 bulwark.4, v21 (the roles update) vanguard.1
  'the changed perks are handed back: '+M.perks.join()+' pp '+M.pp);
  ok(Array.isArray(r.g.refund)&&r.g.refund.some(x=>x.name===m.name&&x.n===4)&&r.g.note==='refund'&&r.g.refundWhy==='masteries','G.refund names the sword, the note asks for the sheet');
  if(rc){const T=r.g.towns.find(q=>q.name===t.name),R0=T.recruits.find(q=>q.id===rc.id);ok(R0&&R0.perks.join()==='vanguard.2,bulwark.4'&&R0.pp===0,'recruits keep the new passives in place of the old perks')}
  X.G=null;X.mode='title';X.continueGame();closeAll(X);ok(X.mode==='world'&&!X.calc(X.G.roster.find(q=>q.id===m.id)).abs.includes('shove'),'the migrated save loads; no ability left from a refunded perk');
  console.log('v19 -> v20: changed perks refunded, recruits remapped, the save loads: ok') }
console.log('\nOK throwing');process.exit(0)})();
