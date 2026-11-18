// The throwing gifts (10-data.js MAST.mana_t aura_t qi_t chi_t; rules: 60p-passives.js; gift rolls: giftStyle in 61-talents.js and newMerc;
// the Isekai creator 28i-isekai.js): each tree is valid and its own; the abilities spend throws through the ammo path (a conjured blade
// spends none) and fall back to Strike in hand; each passive on its own; forecast == strike over >= 2000 forced strikes with the new perks;
// AI battles use the new abilities; throw-leaning mercs (and rivals) roll these gifts; the Isekai creator offers them; old saves load.
//   node test/throwgifts.js [--seed S]
'use strict';
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
const TG=['mana_t','aura_t','qi_t','chi_t'],SIB={mana_t:'mana_r',aura_t:'aura_r',qi_t:'qi_r',chi_t:'chi_r'},NEWAB=['conjure','swarm','ahurl','comet','tstar','balllight','vthrow','sever'];
// a thrower with the gift tree k and its perks (all six unless given)
function gm(bg,w,k,perks,o){o=o||{};const m=mk(bg||'woodcutter',w||'taxe',perks||X.MAST[k].p.map(p=>p.id),Object.assign({trees:['thrower','skirmisher','vanguard','survivor']},o));
 m.gift=k;m.trees=m.trees.concat([k]);m.hp=X.calc(m).hp;return m}
const atk=u=>X.abilityInfo(u,'attack'),ab=(u,id)=>X.abilityInfo(u,id);
const use=async(b,u,a,t)=>{u.ap=99;await X.useAbility(u,a,KU(t));await rest(b);b.busy=true;b.cur=u};
const strikeUntil=async(u,t,a,f,n)=>{for(let i=0;i<(n||40);i++){await X.strike(u,t,a);if(f())return true}return f()};
(async()=>{
section('catalog: four throwing gift trees');
{ fresh(SEED);const M=X.MAST,AB=X.AB;let nIc=0;
  ok(Object.keys(M).filter(k=>M[k].kind==='gift').length===14,'fourteen gift trees');
  for(const k of TG){const T=M[k],res=k.split('_')[0];
   ok(T&&T.kind==='gift'&&T.res===res&&T.style==='ranged'&&T.aff.join()==='ranged,throwing',k+': a ranged '+res+' gift tree, aff ranged + throwing');
   ok(T.tiers.length===6&&T.tiers.every((t,i)=>t.length===1&&t[0].id===k+'.'+(i+1)),k+': six tiers of one perk');
   ok(typeof T.role==='string'&&T.role.length>=30&&T.role!==M[SIB[k]].role&&T.d&&T.n!==M[SIB[k]].n,k+': a name, text and role of its own');
   const A=T.p.filter(p=>p.ab);ok(A.length===2&&A[0]===T.p[0]&&A[1]===T.p[5],k+': the opener and the capstone are its two abilities');
   ok(/^Awakens (Mana|Aura|Qi|Chi) \(30\)\. Ability:/.test(T.p[0].d),k+': the first perk awakens the gift');
   for(const p of A){const a=AB[p.ab];ok(a&&a.needs==='throwing'&&a.wpn&&a.tgt==='enemy'&&a.cost&&a.cost[0]===res&&a.cost[1]>0&&a.n&&a.d&&a.d.length>40,p.id+': '+p.ab+' a throwing ability paid in '+res)}
   for(const p of T.p.slice(1,5))ok(!p.ab&&(p.mod||p.flag||p.res)&&p.d.length>20,p.id+': a passive');
   ok(X.GIFTV[res].throwing===k&&X.giftKey(res,'throwing')===k&&X.giftKey(res,'ranged')===SIB[k],'GIFTV: '+res+' throwing -> '+k+', ranged -> '+SIB[k]);
   ok(T.cap&&T.cap.tiers[0][0].id===k+'.cap'&&T.cap.tiers[0][0].d.length>20,k+': a capstone');
   // the bow sibling: no shared ability, different rewards
   const mods=t=>new Set(M[t].p.flatMap(p=>Object.keys(p.mod||{}).concat(p.flag?[p.flag]:[]))),a1=mods(k),a2=mods(SIB[k]),sh=[...a1].filter(x=>a2.has(x));
   ok(sh.length<=1&&!M[SIB[k]].p.some(p=>p.ab&&T.p.some(q=>q.ab===p.ab)),k+' / '+SIB[k]+': share '+sh.join());
   ok(M[SIB[k]].p.filter(p=>p.ab&&AB[p.ab].wpn).every(p=>!X.needsOK(AB[p.ab],'throwing')),SIB[k]+': its arrows stay bow-only');
   // icons: Detail Low (pixel) and Detail High (painted), the tree header, each ability, each perk
   for(const n of ['m-'+k].concat(T.p.map(p=>p.ab?'ab-'+p.ab:'perk-'+p.id),['perk-'+k+'.cap'])){ok(X.icResolve(n)!=='none','pixel icon '+n);ok(X.pkHas(n),'painted icon '+n);nIc++}
  }
  // the new Low icons are their own drawings: no two alike, none the same as the bow sibling's
  const rows=n=>JSON.stringify(X.ICONS[X.icResolve(n)]);const seen={};
  for(const k of TG)for(const n of ['m-'+k].concat(M[k].p.map(p=>p.ab?'ab-'+p.ab:'perk-'+p.id))){const r=rows(n);ok(!seen[r],n+' looks like '+seen[r]);seen[r]=n}
  for(const k of TG)ok(rows('m-'+k)!==rows('m-'+SIB[k]),k+': its own medallion');
  console.log('4 trees, 8 abilities, '+nIc+' icons at both details: ok') }

section('throws: spent through the ammo path, conjured, fallen back on');
{ fresh(SEED+1);const ros=[gm('woodcutter','taxe','aura_t'),gm('beggar','darts','mana_t'),gm('acrobat','tknives','chi_t'),gm('cutthroat','javelin','qi_t')];
  const {b,P,E,park}=await arena(SEED+1,ros,['thug','thug','braid','braid']);const [AU,MA,CH,QI]=P,[e1,e2,e3,e4]=E;
  for(const u of P)ok(u.res[X.MAST[u.m.gift].res]&&u.abs.includes('tstrike'),u.m.gift+': the gift awake, Strike in hand in reach');
  ok(AU.abs.includes('ahurl')&&AU.abs.includes('comet')&&MA.abs.includes('conjure')&&MA.abs.includes('swarm')&&QI.abs.includes('tstar')&&QI.abs.includes('balllight')&&CH.abs.includes('vthrow')&&CH.abs.includes('sever'),'the abilities come with the perks');
  ok(X.ammoMax(AU,AU.wpn)===3+1&&X.ammoMax(MA,MA.wpn)===5+2&&X.ammoMax(QI,QI.wpn)===3+1&&X.ammoMax(CH,CH.wpn)===6,'the stacks with Radiant arm / Arcane bandolier / Storm well: '+[AU,MA,QI,CH].map(u=>X.ammoMax(u,u.wpn)));
  // each throwing ability spends one throw (hit or miss), then is refused with none left; Strike in hand is still there
  for(const [u,id] of [[AU,'ahurl'],[QI,'tstar'],[CH,'vthrow'],[AU,'comet'],[QI,'balllight'],[CH,'sever']]){park();b.cur=u;put(u,5,9);put(e1,5,6);e1.hp=e1.hpMax=99999;for(const k in u.res)u.res[k].cur=u.res[k].max;u.rs=-500;u.flags=Object.assign({},u.flags,{retRune:0});
   const a=ab(u,id),n0=X.ammoLeft(u);ok(X.canUse(u,a)&&X.validTargets(u,a).has(KU(e1)),id+': usable');await use(b,u,a,e1);ok(X.ammoLeft(u)===n0-1,id+': one throw spent ('+n0+' -> '+X.ammoLeft(u)+')');
   X.setAmmo(u,0);for(const k in u.res)u.res[k].cur=u.res[k].max;const a2=ab(u,id);ok(!X.canUse(u,a2)&&/Out of throws/.test(X.useBlock(u,a2))&&X.forecast(u,e1,a2).out&&!X.validTargets(u,a2).size,id+': none left, refused with the reason');
   put(e1,5,8);const ts=ab(u,'tstrike');ok(X.canUse(u,ts)&&X.validTargets(u,ts).has(KU(e1)),id+': Strike in hand with none left');X.setAmmo(u,99);u.rs=60}
  // the conjured blades: no throw spent, and they work with none left (but not with a foe next to the thrower: the ranged lock holds)
  park();b.cur=MA;put(MA,5,9);put(e1,5,6);e1.hp=e1.hpMax=99999;MA.res.mana.cur=MA.res.mana.max;const n1=X.ammoLeft(MA);await use(b,MA,ab(MA,'conjure'),e1);ok(X.ammoLeft(MA)===n1,'Conjured blade: no throw spent');
  X.setAmmo(MA,0);MA.res.mana.cur=MA.res.mana.max;ok(X.canUse(MA,ab(MA,'conjure'))&&!X.forecast(MA,e1,ab(MA,'conjure')).out&&!X.canUse(MA,atk(MA)),'… usable with none left, a plain throw is not');
  let hits=0;const on0=X.FX.on;X.FX.on=(ty,d)=>{if((ty==='hit'||ty==='miss')&&d.u===MA&&d.t===e1)hits++;if(on0)on0(ty,d)};MA.rs=500;await use(b,MA,ab(MA,'swarm'),e1);X.FX.on=on0;
  ok(hits===3&&X.ammoLeft(MA)===0,'Blade swarm: three conjured blades, no throw ('+hits+')');MA.rs=60;
  put(e1,5,8);ok(!X.canUse(MA,ab(MA,'conjure')),'the ranged lock holds for a conjured blade');X.setAmmo(MA,99);
  // Conjured blade marks; Hex-bitten +15% at a marked foe; Soul-drinker: a marked foe slain by a throw gives a throw and 6 Mana
  park();b.cur=MA;put(MA,5,9);put(e1,5,6);e1.hp=e1.hpMax=99999;MA.rs=500;const cf=X.forecast(MA,e1,ab(MA,'conjure'));ok(cf.statuses.some(s=>s.k==='marked'&&s.n===2&&s.ch===1),'Conjured blade: the mark in the forecast');
  await strikeUntil(MA,e1,ab(MA,'conjure'),()=>e1.st.marked===2);ok(e1.st.marked===2,'… and on the foe');const hd=X.dmgBonus(MA,e1,atk(MA));e1.st.marked=0;ok(near(hd-X.dmgBonus(MA,e1,atk(MA)),.15),'Hex-bitten: +15% at a marked foe');
  e1.st.marked=1;e1.hp=1;e1.arm=0;e1.helm=0;X.setAmmo(MA,3);MA.res.mana.cur=10;await strikeUntil(MA,e1,atk(MA),()=>!e1.alive);ok(!e1.alive&&X.ammoLeft(MA)===4&&MA.res.mana.cur===16,'Soul-drinker: a throw back and 6 Mana ('+X.ammoLeft(MA)+', '+MA.res.mana.cur+')');
  // Homing runes: a missed throw comes back
  park();b.cur=MA;put(MA,5,9);put(e2,5,6);MA.rs=-500;X.setAmmo(MA,3);await use(b,MA,atk(MA),e2);ok(X.ammoLeft(MA)===3,'Homing runes: the missed throw returns ('+X.ammoLeft(MA)+')');MA.rs=60;
  // Gathered breath: 4 Chi call a spent throw back at the turn start; nothing when the stack is full or the Chi short
  CH.res.chi.cur=20;X.setAmmo(CH,2);X.pvTurn(CH);ok(X.ammoLeft(CH)===3&&CH.res.chi.cur===16,'Gathered breath: one throw for 4 Chi');X.setAmmo(CH,99);X.pvTurn(CH);ok(CH.res.chi.cur===16,'… none with a full stack');
  X.setAmmo(CH,1);CH.res.chi.cur=3;X.pvTurn(CH);ok(X.ammoLeft(CH)===1,'… none without the Chi');
  // Aura hurling: Shieldbreaker, Close hurl (no lock, +8% a foe beside), Staggering force (off balance), the knockback
  park();b.cur=AU;put(AU,5,9);put(e3,5,6);e3.hp=e3.hpMax=99999;AU.rs=500;AU.res.aura.cur=AU.res.aura.max;const ehs=e3.shp;
  if(!e3.shield){e3.shield=true;e3.shp=e3.shpMax=60}const sh0=e3.shp;await strikeUntil(AU,e3,atk(AU),()=>e3.shp<sh0||!e3.shield);ok(e3.shp===Math.max(0,sh0-Math.round(AU.wpn.d[1]*.5))||!e3.shield,'Shieldbreaker: the raised shield takes half the weapon\'s best ('+sh0+' -> '+e3.shp+')');
  park();b.cur=AU;put(AU,5,9);put(e1,5,8);put(e2,4,9);AU.rs=500;ok(X.rangedLocked(AU)===false&&X.canUse(AU,atk(AU)),'Close hurl: throws with foes beside');const d2=X.dmgBonus(AU,e1,atk(AU));put(e2,15,0);ok(near(d2-X.dmgBonus(AU,e1,atk(AU)),.08),'… +8% for the second foe beside');
  put(e1,5,6);const fo=X.forecast(AU,e1,ab(AU,'ahurl'));ok(fo.kb&&fo.kb.n===1&&fo.statuses.some(s=>s.k==='offbal'),'Aura hurl: knockback and off balance in the forecast');const r0=e1.r;e1.st={};
  await strikeUntil(AU,e1,ab(AU,'ahurl'),()=>e1.st.offbal===1);ok(e1.st.offbal===1&&e1.r===r0-1,'… on the foe: off balance, knocked back a tile');ok(!X.forecast(AU,e1,atk(AU)).statuses.some(s=>s.k==='offbal'),'a plain throw costs no Aura: no Staggering force');
  // Storm throws: Rime-edged (chill), Thawing fire (burn on the chilled), Conductive (+15% at burning, chilled or dazed), the leap
  park();b.cur=QI;put(QI,5,9);put(e1,5,6);put(e2,6,6);e1.arm=0;e1.helm=0;e1.hp=e1.hpMax=99999;QI.rs=500;let f=X.forecast(QI,e1,atk(QI));ok(f.statuses.some(s=>s.k==='chill'&&near(s.ch,.3,.01))&&!f.statuses.some(s=>s.k==='burn'),'Rime-edged: 30% chill (forecast), no burn on an unchilled foe');
  const c0=X.dmgBonus(QI,e1,atk(QI));e1.st.chill=1;f=X.forecast(QI,e1,atk(QI));ok(f.statuses.some(s=>s.k==='burn'&&s.n===2&&s.ch===1)&&near(X.dmgBonus(QI,e1,atk(QI))-c0,.15),'Thawing fire and Conductive on a chilled foe');
  await strikeUntil(QI,e1,atk(QI),()=>e1.st.burn===2);ok(e1.st.burn===2,'… it burns');e1.st={};for(let i=0;i<30&&!(e1.st.chill>0);i++)await X.strike(QI,e1,atk(QI));ok(e1.st.chill>0,'… and the frost takes');
  park();b.cur=QI;put(QI,5,9);put(e1,5,6);put(e2,7,6);put(e3,8,6);put(e4,15,0);for(const e of [e1,e2,e3])e.hp=e.hpMax=99999;QI.rs=500;QI.res.qi.cur=QI.res.qi.max;const hitT=new Set();X.FX.on=(ty,d)=>{if((ty==='hit'||ty==='miss')&&d.u===QI)hitT.add(d.t);if(on0)on0(ty,d)};
  await use(b,QI,ab(QI,'tstar'),e1);ok(hitT.size===2,'Thunder star: the lightning leaps to one more foe');hitT.clear();QI.res.qi.cur=QI.res.qi.max;for(const e of E)e.st={};await use(b,QI,ab(QI,'balllight'),e1);X.FX.on=on0;
  ok(hitT.size===3&&e2.st.daze&&e3.st.daze,'Ball lightning: leaps on and dazes each ('+hitT.size+')');
  // Still hand: Vital throw (+15% head, bleeds), Hamstring throw (30% hobbled), Inner stillness (+8 standing), Open the wound (+20% at a bleeder), Severing throw
  park();b.cur=CH;put(CH,5,9);put(e1,5,6);e1.hp=e1.hpMax=99999;e1.arm=0;e1.helm=0;CH.mvd=0;const vt=ab(CH,'vthrow');ok(X.headChance(CH,e1,vt)===X.headChance(CH,e1,atk(CH))+15,'Vital throw: +15% head chance');
  f=X.forecast(CH,e1,vt);ok(f.statuses.some(s=>s.k==='bleed'&&s.n===3)&&f.statuses.some(s=>s.k==='hobbled'&&near(s.ch,.3,.01)),'… bleeds 3 turns; Hamstring throw 30% (forecast)');
  const s0=X.hitChance(CH,e1,atk(CH));CH.mvd=1;ok(X.hitChance(CH,e1,atk(CH))===Math.max(5,s0-8)||s0>=95,'Inner stillness: +8 to hit standing still');CH.mvd=0;
  const b0=X.dmgBonus(CH,e1,atk(CH));e1.st.bleed=2;ok(near(X.dmgBonus(CH,e1,atk(CH))-b0,.2),'Open the wound: +20% at a bleeding foe (throw)');put(e1,5,8);
  {const t0=e1.st.bleed;e1.st.bleed=0;const m0=X.dmgBonus(CH,e1,ab(CH,'tstrike'));e1.st.bleed=t0;ok(near(X.dmgBonus(CH,e1,ab(CH,'tstrike'))-m0,.2),'… and in hand')}
  put(e1,5,6);e1.st={};CH.res.chi.cur=CH.res.chi.max;f=X.forecast(CH,e1,ab(CH,'sever'));ok(f.statuses.some(s=>s.k==='hobbled'&&s.ch===1)&&f.statuses.some(s=>s.k==='bleed'&&s.n===3)&&near(X.ignOf(CH,ab(CH,'sever'))-X.ignOf(CH,atk(CH)),.4),'Severing throw: hobbles, bleeds, +40% piercing');
  CH.rs=500;await strikeUntil(CH,e1,ab(CH,'sever'),()=>e1.st.hobbled===1);ok(e1.st.hobbled===1&&e1.st.bleed===3,'… on the foe');CH.rs=60;
  X.B=null;X.mode='world';console.log('the ammo path, conjured blades, the fallback and every passive and ability: ok') }

section('forecast == strike: forced strikes with the throwing gifts');
{ fresh(SEED+5);const kit=[['woodcutter','taxe','aura_t',{a:'leather'}],['beggar','darts','mana_t',{a:'padded'}],['acrobat','tknives','chi_t',{a:'jack'}],['cutthroat','javelin','qi_t',{a:'leather',h:'cap'}],
   ['nomad','francisca','aura_t',{a:'mail'}],['woodcutter','shuriken','qi_t',{a:'padded'}],['acrobat','chakram','mana_t',{a:'leather'}],['beggar','throwhammer','chi_t',{a:'padded'}]];
  const ros=kit.map(([bg,w,k,o])=>gm(bg,w,k,null,o));
  const {b,P,E,park}=await arena(SEED+6,ros,['thug','braid','barbhus','braid','samurai','ashi']);
  // the foes carry the passives too (so throws at a merc with them, and the defenders' side of every term, are checked both ways)
  for(const u of E){u.flags=Object.assign({},u.flags);for(const k of TG)for(const p of X.MAST[k].p)for(const q in p.mod||{})if(q!=='hurlSplit')u.flags[q]=Math.max(u.flags[q]||0,p.mod[q])}X.auraScan();
  FCHECK=true;FS.n=0;FS.byAb={};let tries=0,full=0;const U=b.units,STS=['marked','chill','burn','daze','bleed'];
  while(FS.n<2400&&tries++<30000){park();for(const u of U)u.fearless=false;const u=pick(P),t=pick(E);
   const ids=['attack'].concat(u.abs.filter(id=>NEWAB.includes(id)||id==='tstrike'));const id=pick(ids),a=X.abilityInfo(u,id);if(!a)continue;for(const k in u.res)u.res[k].cur=u.res[k].max;
   const rngd=X.isRangedAtk(u,a),adj=!rngd||R()<.3;put(u,6,6);put(t,6,adj?5:Math.max(0,6-2-Math.floor(R()*3)));
   for(const x of U)if(x!==u&&x!==t){x.c=1+Math.floor(R()*14);x.r=1+Math.floor(R()*10);if(X.unitAt(x.c,x.r)!==x||(x.c===6&&x.r<=6&&x.r>=2)){x.c=15;x.r=11-(x.id%3)}}
   if(R()<.5){const o=pick(E.filter(x=>x!==t));put(o,7,t.r)}if(R()<.4){const o=pick(E.filter(x=>x!==t));put(o,5,6)}   // a foe beside the target; a foe beside the thrower (Close hurl)
   b.cur=R()<.85?u:t;u.mvd=R()<.5?1:0;u.mixK=pick([0,'t','m']);t.mor=pick([1,2,3,3,4]);for(const s of STS)if(R()<.3)t.st[s]=1+Math.floor(R()*2);
   if(R()<.3)t.arm=Math.floor(t.armMax*R());if(R()<.3)t.hp=Math.max(1,Math.floor(t.hpMax*R()));if(R()<.3&&t.shpMax>0){t.shield=true;t.shp=Math.max(1,Math.floor(t.shpMax*R()))}
   X.setAmmo(u,R()<.15?0:1+Math.floor(R()*4));X.foeAuras();X.auraScan();
   if(!X.canUse(u,a)||!X.validTargets(u,a).has(KU(t)))continue;
   if(R()<.3){full++;u.ap=99;await X.useAbility(u,a,KU(t));await rest(b);b.busy=true}else await X.strike(u,t,a,R()<.15?{splash:.6,auto:1,noShot:1}:undefined)}
  FCHECK=false;ok(FS.n>=2000,'forced strikes: '+FS.n+' (tries '+tries+')');for(const id of NEWAB)ok(FS.byAb[id]>=40,id+': '+(FS.byAb[id]||0)+' strikes checked');
  for(const k of ['marked','offbal','chill','burn','hobbled','bleed','daze'])ok(FS.st[k]>0,'status '+k+' applied and forecast: '+(FS.st[k]||0));
  X.B=null;X.mode='world';console.log(FS.n+' strikes ('+full+' whole abilities), '+FS.hits+' hits, statuses '+JSON.stringify(FS.st)+': forecast == strike: ok') }

section('AI battles: autoLearn builds the throwing gifts and the pilot uses their abilities');
{ const used={},by={};const ua0=X.ctx.useAbility;X.ctx.useAbility=function(u,a,k){if(a&&NEWAB.includes(a.id)){used[a.id]=(used[a.id]||0)+1;const s=u.side?'foe':'company';by[s]=(by[s]||0)+1}return ua0(u,a,k)};
  let n=0,turns=0;
  for(let i=0;i<6;i++){const G=fresh(SEED+40+i);const L=[];
   const kit=[['woodcutter','taxe','aura_t'],['beggar','darts','mana_t'],['acrobat','tknives','chi_t'],['cutthroat','javelin','qi_t'],['nomad','hurlbat','aura_t'],['woodcutter','shuriken','qi_t']];
   for(const [bg,w,k] of kit){const m0=gm(bg,w,k,[]);m0.lvl=6;m0.pp=6;X.autoLearn(m0);ok(m0.perks.filter(id=>id.startsWith(k+'.')).length>=2,bg+': autoLearn builds into '+k+': '+m0.perks.join());
    const m=gm(bg,w,k,[]);m.lvl=10;m.pp=40;m.eq.b='hatchet';X.autoLearn(m);ok(X.MAST[k].p.every(p=>m.perks.includes(p.id)),bg+': autoLearn takes the whole '+k+' tree: '+m.perks.join());m.hp=X.calc(m).hp;L.push(m)}
   G.roster=L;X.seedRng(SEED+60+i);const b=X.startBattle({f:i&1?'bandit':'east',mult:1.4,biome:'plains',src:{type:'sim'},quiet:true,turnCap:3000});b.auto=true;b.opts.pilot='sensible';
   let k=0;while(!b.over){await null;if(++k>2e7)fail('battle never ended')}turns+=b.round||0;n++;X.B=null;X.mode='world'}
  // rivals: a rival company's thrower plays its gift too
  { const G=fresh(SEED+70);const R0=[];for(const [bg,w,k] of [['woodcutter','taxe','aura_t'],['cutthroat','javelin','qi_t'],['beggar','darts','mana_t'],['acrobat','tknives','chi_t']]){const m=gm(bg,w,k,[]);m.lvl=10;m.pp=40;X.autoLearn(m);m.hp=X.calc(m).hp;R0.push(m)}
    G.roster=[mk('sellsword','arming',[],{s:'kite',a:'mail'}),mk('squire','arming',[],{s:'kite',a:'mail'}),mk('knight','warhammer',[],{s:'kite',a:'plate'}),mk('hunter','longbow',[],{a:'leather'})];
    for(const m of G.roster){m.lvl=10;m.pp=10;X.autoLearn(m)}
    const rv={id:'rT',n:'The Test',short:'Test',c1:'g',c2:'x',emblem:'swords',pers:'cutthroat',renown:200,roster:R0,alive:true,home:0,stance:-12};R0.forEach(m=>m.field=true);
    G.rivals=(G.rivals||[]).concat([rv]);X.seedRng(SEED+71);const b=X.startBattle({f:'bandit',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:3000,rival:rv.id});ok(b&&b.rival==='rT'&&b.units.some(u=>u.side===1&&u.m&&TG.includes(u.m.gift)),'a rival company of throwers takes the field');
    if(b){b.auto=true;b.opts.pilot='sensible';let k=0;while(!b.over){await null;if(++k>2e7)fail('battle never ended')}n++;X.B=null;X.mode='world'} }
  X.ctx.useAbility=ua0;
  for(const id of NEWAB)ok(used[id]>0,id+': used by the AI ('+(used[id]||0)+')');
  console.log(n+' battles, '+turns+' rounds; the new abilities used '+JSON.stringify(used)+' (by side '+JSON.stringify(by)+'): ok');ok(by.foe>0,'the rival throwers use them too') }

section('gift rolls: throwers roll the throwing variant, rivals too; the Isekai creator offers them');
{ fresh(SEED+80);const got={},bad=[];let thr=0,bow=0;
  for(let i=0;i<6000;i++){const bg=['woodcutter','nomad','cutthroat','acrobat','beggar','butcher','poacher','hunter'][i%8],m=X.newMerc(bg);if(!m.gift)continue;const T=X.MAST[m.gift],lean=X.throwLean(m);
   if(lean){thr++;if(!TG.includes(m.gift))bad.push(bg+' '+m.eq.w+'/'+m.eq.b+' '+m.gift);got[m.gift]=(got[m.gift]||0)+1}else{if(TG.includes(m.gift))bad.push(bg+' no throwing weapon '+m.gift);if(T.style==='ranged')bow++}
   ok(m.trees[m.trees.length-1]===m.gift&&X.giftVariant(m)===m.gift&&X.giftKey(T.res,X.giftStyle(m))===m.gift,'a recruit\'s gift follows giftStyle: '+bg+' '+m.gift)}
  ok(!bad.length,'the variant follows the weapon: '+bad.slice(0,4).join('; '));for(const k of TG)ok(got[k]>0,k+' rolled by a throw-leaning recruit ('+(got[k]||0)+')');
  ok(bow>0,'bow carriers still roll the archery variants ('+bow+')');
  // a hunter with a bow keeps the archery gift; the same background with a throwing weapon in hand leans to throwing
  const h=X.newMerc('hunter');h.eq.w='huntbow';h.eq.b='knife';ok(!X.throwLean(h)&&X.giftStyle(h)==='ranged','a hunter with a bow: archery');h.eq.b='javelin';ok(X.throwLean(h)&&X.giftStyle(h)==='throwing','… with javelins as the sidearm: the throwing gift');
  const sw=X.newMerc('sellsword');sw.eq.w='taxe';ok(!X.throwLean(sw),'a background without the throwing family never leans to it');
  // the academy origin and the deed gifts (giftStyle): a thrower gets the throwing variant
  const w=X.newMerc('woodcutter');w.eq.w='taxe';w.gift=null;w.trees=w.trees.filter(k=>X.MAST[k].kind!=='gift');X.orGift(X.G,w,'qi');ok(w.gift==='qi_t'&&w.trees.includes('qi_t'),'a deed gift for a thrower: Storm throws ('+w.gift+')');
  // rivals: their mercs come from newMerc and autoLearn, so a rival thrower carries and builds the throwing gift
  let rt=0,rl=0;const rv={renown:300,roster:[]};for(let i=0;i<1500&&rl<3;i++){const m=X.rvNewMerc(rv,40);if(TG.includes(m.gift)){rt++;if(m.perks.some(id=>id.startsWith(m.gift+'.')))rl++}}
  ok(rt>0&&rl>0,'rival mercs roll and learn the throwing gifts ('+rt+' rolled, '+rl+' learned)');
  console.log('throw-leaning recruits '+thr+' '+JSON.stringify(got)+', archers '+bow+', rivals '+rt+': ok') }
{ fresh(SEED+90);const L=X.iskGifts();for(const k of TG)ok(L.includes(k)&&L.indexOf(k)===L.indexOf(SIB[k])+1,'the Isekai gift step lists '+k+' beside '+SIB[k]);
  X.iskReset();X.ISKS.wt='throwing';const html=X.iskBodyHTML('gift');for(const k of TG){const lab=X.tlGiftLabel(k);ok(html.includes(lab)&&html.includes("iskSet('gift','"+k+"')"),'the gift step offers '+lab)}
  const fit=k=>new RegExp("isk-o g-\\w+( on)? fit\"[^>]*onclick=\"iskSet\\('gift','"+k+"'\\)").test(html);ok(TG.every(fit)&&!TG.some(k=>fit(SIB[k])),'with the throwing family, the four throwing gifts fit and the archery ones do not');
  X.ISKS.wt='bow';const h2=X.iskBodyHTML('gift'),fit2=k=>new RegExp("isk-o g-\\w+( on)? fit\"[^>]*onclick=\"iskSet\\('gift','"+k+"'\\)").test(h2);ok(!TG.some(fit2)&&TG.every(k=>fit2(SIB[k])),'with a bow, the archery gifts fit');
  const sp=X.isekaiSpec({name:'Hana',tal:['rs','rd','init'],trees:['thrower','scout','skirmisher','survivor'],wt:'throwing',at:'lightarmor',gift:'chi_t',mode:'solo'});ok(sp.gift==='chi_t','isekaiSpec keeps a throwing gift');
  const m=X.newMerc('isekai');X.isekaiMake(m,sp);ok(m.gift==='chi_t'&&m.trees.includes('chi_t')&&X.mercStyle(m)==='ranged'&&X.giftVariant(m)==='chi_t'&&X.giftStyle(m)==='throwing','the hero carries Still hand: '+m.trees.join());
  m.lvl=3;m.pp=3;X.autoLearn(m);ok(X.giftAwake(m)&&m.perks.some(id=>id.startsWith('chi_t.')),'… and awakens it: '+m.perks.join());
  const m2=X.newMerc('isekai');X.isekaiMake(m2,Object.assign({},sp,{gift:null}));ok(X.giftVariant(m2,'aura')==='aura_t'&&X.giftVariant(m2,'mana')==='mana_t','a throwing hero without a gift: a later gift is the throwing variant');
  console.log('the Isekai creator: the four throwing gifts listed and fitting the throwing family: ok') }

section('saves: the new trees are additive');
{ const G=fresh(SEED+95);const m=G.roster[0];m.gift='qi_t';m.trees=m.trees.filter(k=>X.MAST[k].kind!=='gift').concat(['qi_t']);m.perks=['qi_t.1','qi_t.2'];m.lvl=4;m.pp=2;m.eq.w='javelin';
  ok(X.SAVEVER===22,'no save format change: SAVEVER '+X.SAVEVER);ok(X.save(),'save failed');const r=X.readSave();ok(r.state==='ok','the save reads');const M2=r.g.roster.find(q=>q.id===m.id);
  ok(M2.gift==='qi_t'&&M2.perks.join()==='qi_t.1,qi_t.2'&&M2.pp===2&&M2.trees.includes('qi_t'),'a merc with Storm throws keeps it: '+M2.trees.join()+' / '+M2.perks.join());
  // an old save (no throwing gift anywhere) loads unchanged
  const G2=fresh(SEED+96);const before=JSON.stringify(G2.roster.map(q=>[q.gift,q.trees,q.perks]));ok(X.save(),'save failed');const g=JSON.parse(X.store.get(X.SAVEKEY));X.store.set(X.SAVEKEY,JSON.stringify(g));
  const r2=X.readSave();ok(r2.state==='ok'&&JSON.stringify(r2.g.roster.map(q=>[q.gift,q.trees,q.perks]))===before,'an old save loads unchanged');
  X.G=null;X.mode='title';X.continueGame();closeAll(X);ok(X.mode==='world','the save loads into the world');console.log('SAVEVER 22 kept; the new trees save and load: ok') }
console.log('\nOK throwgifts');process.exit(0)})();
