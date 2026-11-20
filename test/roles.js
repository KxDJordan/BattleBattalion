// Roles update (64v-roles.js, the trees in 10-data.js): every tree has a role line; no two trees carry the same mechanic keys and siblings
// share at most one; every perk's flags and mods are read by the rules; FOEMAST ids valid and fitting; each new mechanic on its own;
// forecast == strike over >= 2500 forced strikes with the new perks (test/throwing.js's check); the v20 -> v21 save migration; auto battles.
//   node test/roles.js [--seed S]
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
   u.mor=3;u.fearless=true;u.aoo=0;u.rooted=false;u.dazed=false;u.fat=0;u.ap=u.apMax;u.dnc=0;u.bonusAP=0;u.used={};u.qsT=0;u.slipT=0;u.c=i;u.r=u.side?0:BH-1});b.order=[];b.busy=true;b.cur=P[0];X.foeAuras();X.auraScan()};
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
// a sword of background bg with weapon w (and o.s shield, o.a body armor, o.h helmet, o.b sidearm) and the perks given
function mk(bg,w,perks,o){o=o||{};const m=X.newMerc(bg||'sellsword');m.trees=o.trees||['vanguard','bulwark','shieldbearer','brute'];m.gift=null;m.lvl=11;m.perks=(perks||[]).slice();m.pp=0;
 m.eq.w=w;m.eq.s=o.s||null;m.eq.b=o.b||null;m.eq.a=o.a||'padded';m.eq.h=o.h||null;m.inj=[];m.traits=[];m.hp=X.calc(m).hp;m.field=true;return m}
const F=(u,fl)=>{u.flags=Object.assign({},u.flags,fl);X.auraScan()};
let LC=987654321;const R=()=>{LC=(Math.imul(LC,1103515245)+12345)>>>0;return LC/4294967296},pick=L=>L[Math.floor(R()*L.length)];
(async()=>{
section('catalog: a role for every tree, perks that build on it');
{ fresh(SEED);const M=X.MAST,AB=X.AB;
  for(const k in M){const T=M[k];ok(typeof T.role==='string'&&T.role.length>=20&&T.role!==T.d,k+': a role line of its own');
   const n=T.p.filter(p=>p.ab).length;if(T.kind==='style')ok(n<=(['gunner','pistol','powder','wrestle','pugilist','willow'].includes(k)?2:1),k+': at most one ability ('+n+'; the firearm trees and the fist trees two, test/guntrees.js, test/fists.js)');if(T.kind==='gift')ok(n===2,k+': two abilities ('+n+')');
   for(const p of T.p)ok(typeof p.d==='string'&&p.d.length>=8&&!/undefined|NaN/.test(p.d),p.id+': a text')}
  // the mechanic keys of each tree (stats, flags, mods, weapon mods, abilities, the gift pool): no two trees the same
  const keys=T=>{const s=new Set();for(const p of T.p.concat(T.cap?T.cap.tiers.flat():[])){for(const q in p.st||{})s.add('st:'+q);if(p.flag)s.add('f:'+p.flag);for(const q in p.mod||{})s.add('m:'+q);for(const q in p.wmod||{})s.add('w:'+q+(p.wt?'/'+p.wt:''));if(p.ab)s.add('ab:'+p.ab);if(p.res||p.regen)s.add('res');if(p.quarry)s.add('q:'+p.quarry)}return[...s].sort().join(' ')};
  const seen={};for(const k in M){if(M[k].kind==='fabled')continue;const s=keys(M[k]);ok(!seen[s],k+' and '+seen[s]+' carry the same mechanic keys: '+s);seen[s]=k}
  // and the siblings differ in what they reward: their mod keys overlap in at most one key
  const mods=k=>new Set(M[k].p.flatMap(p=>Object.keys(p.mod||{}).concat(p.flag?[p.flag]:[])));
  for(const G of [['vanguard','bulwark','shieldbearer'],['duelist','skirmisher','berserker','brute'],['marksman','sharpshooter','gunner','pistol','powder','thrower'],['tactician','medic'],['assassin','rogue','shadow'],['gladiator','champion','duelist'],['wrestle','pugilist','willow','brawler']])
   for(let i=0;i<G.length;i++)for(let j=i+1;j<G.length;j++){const A=mods(G[i]),B2=mods(G[j]),sh=[...A].filter(x=>B2.has(x));ok(sh.length<=1,G[i]+' / '+G[j]+' share '+sh.join())}
  // no dead perk: every flag and mod a perk carries is read somewhere in the rules
  const SRC=fs.readdirSync(path.join(__dirname,'..','src')).filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8')).join('\n');
  const read=k=>new RegExp('\\.'+k+'\\b|\''+k+'\'').test(SRC);let nk=0;
  const all=[];for(const k in M){const T=M[k];all.push(...T.p);if(T.cap)all.push(...T.cap.tiers.flat())}
  for(const p of all){for(const q in p.mod||{}){nk++;ok(read(q),p.id+': mod '+q+' is read nowhere')}if(p.flag){nk++;ok(read(p.flag),p.id+': flag '+p.flag+' is read nowhere')}}
  // the changed perks: listed for the save migration, still passives where they were (abilities only where the tree has its one)
  ok(X.SAVEVER>=21&&X.PERKV21.length>=30&&new Set(X.PERKV21).size===X.PERKV21.length&&X.PERKV21.every(id=>X.perkById(id)),'PERKV21: '+X.PERKV21.length+' changed perks, all real');
  for(const id of X.PERKV21)ok(X.pkHas('perk-'+id)||X.perkById(id).perk.ab,'painted icon perk-'+id);
  for(const id of X.RL_ICONS){ok(X.icResolve('perk-'+id)!=='none','pixel icon perk-'+id);ok(X.pkHas('perk-'+id),'painted icon perk-'+id)}
  ok(X.icResolve('st-suppr')!=='none'&&X.pkHas('st-suppr')&&X.STATUS.suppr,'the Suppressed status: both icons');
  ok(M.marksman.p[1].ab==='volley'&&!M.vanguard.p.some(p=>p.ab)&&M.bulwark.p[5].ab==='bastion','Marksman has Volley, Vanguard no ability, Bulwark Bastion');
  console.log(Object.keys(M).length+' trees, each with its role; '+nk+' flags and mods read by the rules; '+X.PERKV21.length+' changed: ok') }
section('FOEMAST: valid ids, coherent roles');
{ const FM=X.FOEMAST,EN=X.EN;let n=0;
  for(const id in FM){ok(EN[id],'FOEMAST '+id+': an enemy');for(const g of ['p','v','e'])for(const pid of FM[id][g]||[]){n++;const P=X.perkById(pid);ok(P,id+': '+pid+' is a perk');
    const d=EN[id],w=d.w&&X.ITEMS[d.w],m=P.perk.mod||{};
    if(m.shelter||m.intercept)ok(d.shield,id+': '+pid+' needs a shield');if(m.twoIgn||m.sweep||m.twoDaze)ok(w&&w.two,id+': '+pid+' needs a two-handed weapon');
    if(m.mvShot||m.suppress)ok(d.rng||w&&X.isRangedW(w),id+': '+pid+' needs a bow')}}
  ok(FM.thug.e.includes('shieldbearer.5')&&FM.braid.p.includes('vanguard.1')&&FM.barbhus.e.includes('bulwark.1'),'the brigand thug intercepts, the raider charges, the huscarl stands firm');
  console.log(n+' foe perks, all valid and fitting: ok') }
section('the new mechanics, one by one');
{ fresh(SEED+1);
  const v=mk('sellsword','arming',['vanguard.1','vanguard.3','vanguard.5','vanguard.6']),bw=mk('knight','warhammer',['bulwark.1','bulwark.2','bulwark.3','bulwark.5'],{s:'kite',a:'plate',h:'greathelm'}),
   sb=mk('squire','arming',['shieldbearer.3','shieldbearer.5'],{s:'kite',a:'mail'}),br=mk('sellsword','greataxe',['brute.3','brute.4','brute.5']),
   du=mk('sellsword','arming',['duelist.3','duelist.5']),sk=mk('sellsword','shortsword',['skirmisher.3']);
  const {b,P,E,park}=await arena(SEED+2,[v,bw,sb,br,du,sk],['thug','thug','braid','braid']);const [V,BW2,SB,BR,DU,SK]=P,[e1,e2,e3,e4]=E;const at=u=>X.abilityInfo(u,'attack');
  // Charge: first melee attack of the turn after moving
  park();b.cur=V;put(V,5,5);put(e1,5,4);V.mvd=0;V.atkT=0;const c0=X.hitChance(V,e1,at(V)),d0=X.dmgBonus(V,e1,at(V));V.mvd=1;
  ok(X.hitChance(V,e1,at(V))===Math.min(95,c0+10)&&near(X.dmgBonus(V,e1,at(V))-d0,.15),'Charge: +10 to hit, +15% after moving');V.atkT=1;ok(X.hitChance(V,e1,at(V))===c0,'… only the first attack of the turn');
  // Rout them: a shaken foe
  V.atkT=1;e1.mor=2;e1.fearless=false;ok(near(X.dmgBonus(V,e1,at(V))-d0,.2),'Rout them: +20% against a wavering foe');e1.mor=3;e1.fearless=true;
  // Shock: a hit that wounds tests morale (forecast says so)
  e1.fearless=false;ok(X.forecast(V,e1,at(V)).shock,'Shock: forecast');let tested=0;const mc0=X.ctx.moraleCheck;X.ctx.moraleCheck=function(u,bn,dir){if(u===e1&&dir<0&&bn===10)tested++;return mc0(u,bn,dir)};
  // (moraleCheck is a function declaration: the rules call the context's binding)
  for(let i=0;i<20&&!tested;i++){e1.hp=e1.hpMax;e1.arm=0;e1.helm=0;await X.strike(V,e1,at(V))}X.ctx.moraleCheck=mc0;ok(tested>0,'Shock: the struck foe tests its morale at +10');e1.fearless=true;
  // Terror: allies of the slain test at 15 less
  park();b.cur=V;put(V,5,5);put(e1,5,4);put(e2,7,4);e2.fearless=false;e1.hp=1;e1.arm=0;e1.helm=0;let tb=null;X.ctx.moraleCheck=function(u,bn,dir){if(u===e2&&dir<0)tb=bn;return mc0(u,bn,dir)};
  for(let i=0;i<20&&e1.alive;i++)await X.strike(V,e1,at(V));X.ctx.moraleCheck=mc0;ok(!e1.alive&&tb===35-15,'Terror: the dead foe\'s ally within 3 tests at 20 ('+tb+')');
  // Stand firm / Rooted / Iron retort (Bulwark)
  park();b.cur=e3;put(BW2,5,5);put(e3,5,4);const ea=at(e3);BW2.mvd=1;const h1=X.hitChance(e3,BW2,ea),m1=X.armorMitOf(BW2,false,.3);BW2.mvd=0;
  ok(X.hitChance(e3,BW2,ea)===Math.max(5,h1-8),'Stand firm: −8 to hit a Bulwark that held its ground');ok(X.armorMitOf(BW2,false,.3)>m1,'Rooted: more mitigation while held ('+m1+' -> '+X.armorMitOf(BW2,false,.3)+')');
  b.cur=BW2;const ba=at(BW2),r0=X.dmgBonus(BW2,e3,ba);BW2.hitBy=[e3.id];ok(near(X.dmgBonus(BW2,e3,ba)-r0,.25),'Iron retort: +25% in full plate against the foe that struck');BW2.arm=150;ok(near(X.dmgBonus(BW2,e3,ba)-r0,.15),'… +15% at 150 armor');BW2.hitBy=null;
  // Shelter and Intercept (Shieldbearer)
  park();put(SB,5,6);put(V,5,5);put(e3,5,4);SB.shield=true;X.auraScan();b.cur=e3;const dr0=X.drOf(e3,V,ea);SB.shield=false;X.auraScan();ok(near(dr0-X.drOf(e3,V,ea),.1),'Shelter: −10% damage to the ally beside a raised shield');
  SB.shield=true;put(SB,4,5);put(V,5,5);put(e3,5,4);put(e4,9,9);X.auraScan();ok(X.forecast(e3,V,ea).icpt===SB,'Intercept: the forecast names who steps in');
  e3.ap=9;const hp0=SB.hp,va=V.hp;let hits=0;const on0=X.FX.on;X.FX.on=(ty,d)=>{if(ty==='hit'&&d.t===SB)hits++;if(on0)on0(ty,d)};
  for(let i=0;i<12&&!hits;i++){SB.icpT=0;e3.ap=9;put(SB,4,5);put(V,5,5);await X.useAbility(e3,ea,KU(V));b.busy=true;b.cur=e3}X.FX.on=on0;ok(hits>0&&V.hp===va&&SB.c===5&&SB.r===5&&V.c===4,'Intercept: the Shieldbearer trades places and takes the blow');
  SB.icpT=1;ok(!X.forecast(e3,V,ea).icpt,'… once between its turns');X.pvTurn(SB);ok(!SB.icpT,'… ready again on its turn');
  // Sweeping blows (Brute): a hit that does not kill carries on
  park();b.cur=BR;put(BR,5,5);put(e1,5,4);put(e2,4,5);e1.hp=e1.hpMax=9999;e2.hp=e2.hpMax=500;const swept=[];X.FX.on=(ty,d)=>{if(ty==='hit'&&d.t===e2)swept.push(d.dmg+d.armor);if(on0)on0(ty,d)};
  for(let i=0;i<12&&!swept.length;i++)await X.strike(BR,e1,at(BR));X.FX.on=on0;ok(swept.length===1,'Sweeping blows: one carry-over blow into the other foe beside');
  ok(near(X.crushOf(BR,at(BR))-(X.ITEMS.greataxe.crush||0),.3)&&near(X.ignOf(BR,at(BR))-X.ITEMS.greataxe.ign,.15),'Armor-breaker: +30% crush, +15% piercing two-handed');
  ok(X.forecast(BR,e1,at(BR)).statuses.some(s=>s.k==='daze'&&near(s.ch,.25*X.forecast(BR,e1,at(BR)).hit/100,.3)||s.k==='daze'),'Brutal blows: a daze chance in the forecast');
  // Isolate and Fencer's guard (Duelist), Never still (Skirmisher)
  park();b.cur=DU;put(DU,5,5);put(e1,5,4);put(e2,9,9);const i0=X.hitChance(DU,e1,at(DU));put(e2,6,4);ok(X.hitChance(DU,e1,at(DU))===Math.max(5,i0-10),'Isolate: +10 against a foe with no ally beside it');
  b.cur=e1;put(e2,9,9);const g0=X.hitChance(e1,DU,at(e1));DU.flags=Object.assign({},DU.flags,{duelDef:0});ok(X.hitChance(e1,DU,at(e1))===Math.min(95,g0+8),'Fencer\'s guard: +8 melee defense in a duel stance');DU.flags=X.calc(DU.m).flags;
  put(SK,7,7);put(e1,7,6);SK.mvd=0;const s0=X.hitChance(e1,SK,at(e1));SK.mvd=1;ok(X.hitChance(e1,SK,at(e1))===Math.max(5,s0-8),'Never still: −8 to hit a skirmisher that moved');
  console.log('Charge, Shock, Rout them, Terror, Stand firm, Rooted, Iron retort, Shelter, Intercept, Sweeping blows, Armor-breaker, Isolate, Fencer\'s guard, Never still: ok') }
{ fresh(SEED+3);
  const mm=mk('hunter','longbow',['marksman.1','marksman.6'],{trees:['marksman','sharpshooter','scout','survivor']}),ss=mk('hunter','longbow',['sharpshooter.5','scout.5'],{trees:['marksman','sharpshooter','scout','survivor']}),
   gn=mk('noble','musket',['gunner.3'],{trees:['gunner','tactician','duelist','vanguard']}),th=mk('woodcutter','taxe',['thrower.5'],{trees:['thrower','gunner','skirmisher','vanguard']}),
   tc=mk('squire','arming',['tactician.5','medic.5','survivor.4'],{trees:['tactician','medic','survivor','bulwark']});
  const {b,P,E,park}=await arena(SEED+4,[mm,ss,gn,th,tc],['thug','thug','braid','braid']);const [MM,SS,GN,TH,TC]=P,[e1,e2]=E;const at=u=>X.abilityInfo(u,'attack');
  park();b.cur=MM;put(MM,5,9);put(e1,5,4);MM.mvd=0;const m0=X.hitChance(MM,e1,at(MM));MM.mvd=1;ok(X.hitChance(MM,e1,at(MM))===Math.min(95,m0+8),'Snap shot: +8 after moving');
  ok(X.forecast(MM,e1,at(MM)).statuses.some(s=>s.k==='suppr'&&s.ch>0),'Suppressing fire: forecast');e1.hp=e1.hpMax=9999;const rs0=X.eff(e1,'rs'),ms0=X.eff(e1,'ms');
  for(let i=0;i<12&&!(e1.st.suppr>0);i++)await X.strike(MM,e1,at(MM));ok(e1.st.suppr===1&&X.eff(e1,'ms')===ms0-10,'… the foe is suppressed: −10 melee skill');
  b.cur=SS;put(SS,5,9);SS.mvd=0;const hh=X.headChance(SS,e1,at(SS));SS.mvd=1;ok(hh===X.headChance(SS,e1,at(SS))+15,'Deliberate aim: +15% head chance standing still');SS.mvd=0;
  ok(X.forecast(SS,e1,at(SS)).statuses.some(s=>s.k==='marked'),'Spotter: a wounding shot marks (forecast)');
  b.cur=GN;GN.primed=0;X.setLoaded(GN,false);X.setLoaded(GN,true);ok(GN.primed===1,'Primed: a reload primes the gun');put(GN,5,8);const ga=at(GN);await X.strike(GN,e1,ga);ok(!GN.primed,'… the next shot spends it');
  b.cur=TH;put(TH,5,6);TH.mixK=0;const t0=X.hitChance(TH,e1,at(TH));TH.mixK='m';ok(X.hitChance(TH,e1,at(TH))===Math.min(95,t0+10),'Hand to hand: a throw after a melee blow +10');
  // Quick orders, Mercy, Shrug it off
  b.cur=TC;b.order=[MM];put(TC,2,2);put(MM,3,2);MM.bonusAP=0;X.pvTurn(TC);ok(MM.bonusAP===1,'Quick orders: +1 AP to the nearest ally yet to act');
  TC.st.bleed=2;TC.st.poison=1;X.pvTurn(TC);ok(TC.st.bleed===1&&!TC.st.poison,'Shrug it off: bleeding and poison lose a turn more');
  const hb={heal:[10,10]};MM.hp=MM.hpMax;ok(X.healRoll(TC,hb,MM)===10,'Mercy: plain heal on a healthy ally');MM.hp=1;ok(X.healRoll(TC,hb,MM)===15,'Mercy: +50% below half health');
  console.log('Snap shot, Suppressing fire, Deliberate aim, Spotter, Primed, Hand to hand, Quick orders, Shrug it off, Mercy: ok') }
section('forecast == strike: forced strikes with the new perks');
{ fresh(SEED+5);const R2=['vanguard.1','vanguard.2','vanguard.3','vanguard.5','vanguard.6','bulwark.1','bulwark.2','bulwark.3','bulwark.5','shieldbearer.3','shieldbearer.5','duelist.3','duelist.5','skirmisher.3',
   'brute.3','brute.4','brute.5','berserker.4','marksman.1','marksman.6','sharpshooter.5','gunner.3','thrower.5','scout.5','qi_r.2','chi_m.5','weapons.sword','weapons.axe','weapons.mace','weapons.dagger','weapons.spear','weapons.shield','heavyarmor.1','heavyarmor.2','heavyarmor.3'];
  const kit=[['knight','warhammer',{s:'kite',a:'plate',h:'greathelm'}],['sellsword','greataxe',{a:'scale',h:'barbute'}],['squire','arming',{s:'kite',a:'mail',h:'nasal'}],['thief','dirk',{a:'jack'}],
   ['hunter','longbow',{a:'leather',h:'cap'}],['noble','musket',{a:'mail'}],['woodcutter','taxe',{a:'padded'}],['militia','spear',{s:'roundshield',a:'leather'}],['sellsword','handaxe',{s:'heater',a:'brigandine'}],['farmhand','mace',{a:'leather'}]];
  const ros=kit.map(([bg,w,o])=>{const m=mk(bg,w,R2,o);return m});
  const {b,P,E,park}=await arena(SEED+6,ros.slice(0,8),['thug','braid','barbhus','braid','samurai','ashi']);for(const u of E){u.flags=Object.assign({},u.flags);for(const id of R2){const p=X.perkById(id).perk;for(const k in p.mod||{})if(!X.perkById(id).perk.wt)u.flags[k]=(u.flags[k]||0)+p.mod[k]}}X.auraScan();
  FCHECK=true;FS.n=0;let tries=0;const U=b.units;
  while(FS.n<2600&&tries++<20000){park();for(const u of U)u.fearless=false;const u=pick(U.filter(x=>x.alive)),t=pick(U.filter(x=>x.alive&&x.side!==u.side));const a=X.abilityInfo(u,'attack');if(!a)continue;
   const rngd=X.isRangedAtk(u,a);put(u,6,6);put(t,6,rngd?Math.max(0,6-2-Math.floor(R()*3)):5);if(rngd&&X.rangedLocked(u))continue;
   for(const x of U)if(x!==u&&x!==t){x.c=1+Math.floor(R()*14);x.r=1+Math.floor(R()*10);if(X.unitAt(x.c,x.r)!==x||(x.c===6&&x.r<=6&&x.r>=2)){x.c=15;x.r=11-(x.id%3)}}
   if(R()<.5){const o=pick(U.filter(x=>x!==u&&x!==t&&x.side===t.side));if(o)put(o,7,t.r)}if(R()<.4){const o=pick(U.filter(x=>x!==u&&x!==t&&x.side===u.side));if(o)put(o,5,t.r)}
   b.cur=R()<.8?u:t;u.mvd=R()<.5?1:0;t.mvd=R()<.5?1:0;u.atkT=R()<.3?1:0;u.primed=R()<.5?1:0;u.mixK=pick([0,'t','m']);t.mor=pick([1,2,3,3,4]);u.hitBy=R()<.5?[t.id]:null;
   if(R()<.3){t.arm=Math.floor(t.armMax*R())}if(R()<.3)t.hp=Math.max(1,Math.floor(t.hpMax*R()));if(R()<.3)u.hp=Math.max(1,Math.floor(u.hpMax*R()));const sh=b.units.find(x=>x.flags&&x.flags.shelter&&x.side===t.side&&x!==t);if(sh&&R()<.5){sh.c=t.c+1;sh.r=t.r;if(X.unitAt(sh.c,sh.r)!==sh)put(sh,15,0)}
   X.foeAuras();X.auraScan();if(!X.canFire(u,a))X.setLoaded(u,true);if(X.validTargets(u,a).has(KU(t))||!rngd)await X.strike(u,t,a)}
  FCHECK=false;ok(FS.n>=2500,'forced strikes: '+FS.n+' (tries '+tries+')');
  console.log(FS.n+' strikes, '+FS.hits+' hits, statuses '+JSON.stringify(FS.st)+': forecast == strike: ok') }
section('saves: v20 -> v21 (the changed perks refunded)');
{ const G=fresh(SEED+7);const m=G.roster[0];m.lvl=8;m.trees=['vanguard','bulwark','marksman','skirmisher'];m.perks=['vanguard.1','vanguard.2','vanguard.4','bulwark.2','bulwark.3','skirmisher.1','marksman.6'];m.pp=0;
  const t=G.towns.find(t=>t.recruits&&t.recruits.length),rc=t&&t.recruits[0];if(rc){rc.lvl=5;rc.trees=['vanguard','bulwark','survivor','brute'];rc.perks=['vanguard.1','bulwark.4'];rc.pp=0}
  ok(X.save(),'save failed');const g=JSON.parse(X.store.get(X.SAVEKEY));g.v=20;delete g.refund;delete g.refundWhy;g.note=null;X.store.set(X.SAVEKEY,JSON.stringify(g));const r=X.readSave();
  ok(r.state==='ok'&&r.v===20&&r.g.v===X.SAVEVER,'a v20 save migrates to the current version');const M2=r.g.roster.find(q=>q.id===m.id);
  ok(M2.perks.join()==='vanguard.2,vanguard.4,bulwark.3,skirmisher.1'&&M2.pp===3,'the changed perks come back as points: '+M2.perks.join()+' pp '+M2.pp);
  ok(r.g.refund.some(x=>x.name===m.name&&x.n===3)&&r.g.note==='refund'&&r.g.refundWhy==='roles','the one-time sheet is asked for');
  if(rc){const T=r.g.towns.find(q=>q.name===t.name),R0=T.recruits.find(q=>q.id===rc.id);ok(R0.perks.join()==='vanguard.1,bulwark.4','recruits keep theirs')}
  X.G=null;X.mode='title';X.continueGame();closeAll(X);let html='';const sh0=X.ctx.sheet;X.ctx.sheet=h=>{html=h};X.refundSheet&&(X.G.refund=[{name:'A',n:1}],X.G.refundWhy='roles',X.refundSheet());X.ctx.sheet=sh0;
  ok(/battlefield role/.test(html),'the sheet says why');ok(X.mode==='world','the migrated save loads');console.log('v20 -> v21: changed perks refunded, the sheet, the save loads: ok') }
section('auto battles: AI mercs learn the new trees and use them');
{ let n=0;for(const [bg,w,o] of [['knight','warhammer',{s:'kite',a:'plate',h:'greathelm',trees:['bulwark','shieldbearer','vanguard','brute']}],['sellsword','greataxe',{a:'scale',trees:['brute','vanguard','berserker','duelist']}],['hunter','longbow',{a:'leather',trees:['marksman','sharpshooter','scout','survivor']}]]){
   const G=fresh(SEED+20+n);const L=[];for(let i=0;i<4;i++){const m=mk(bg,w,[],o);m.pp=11;X.autoLearn(m);L.push(m)}
   const role=o.trees[0];ok(L[0].perks.filter(id=>id.startsWith(role+'.')).length>=3,bg+': autoLearn builds into '+role+': '+L[0].perks.join());
   G.roster=L;X.seedRng(SEED+30+n);const b=X.startBattle({f:'bandit',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:3000});b.auto=true;b.opts.pilot='sensible';
   let k=0;while(!b.over){await null;if(++k>2e7)fail('battle never ended')}n++}
  console.log(n+' battles fought to the end: ok') }
console.log('\nOK roles');process.exit(0)})();
