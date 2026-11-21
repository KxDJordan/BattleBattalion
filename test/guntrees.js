// The gun trees (64u-guntrees.js; the trees MAST.gunner / pistol / powder in 10-data.js, the abilities in 11u-guns.js): no tree carries a
// duplicate ability or a duplicate passive anywhere in the game (a general check: allowlist only for shared base mechanics, printed); each
// firearm tree has its role, two abilities, a capstone, icons at both details; every new mechanic one by one; forecast == strike over forced
// strikes with the new abilities; the AI (company, rivals) uses them; the gun backgrounds carry their trees; the PKV save refit; role sims
// (each tree measurably best at its own job).   node test/guntrees.js [--seed S] [--quick]
//   node test/roles.js [--seed S]
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
// a merc with a weapon in hand and the perks given
function merc(bg,w,perks,trees,o){const m=X.newMerc(bg||'woodcutter');m.trees=trees||['thrower','gunner','skirmisher','vanguard'];m.gift=null;m.lvl=10;m.perks=(perks||[]).slice();m.pp=0;
 m.eq.w=w;m.eq.s=null;m.eq.b=(o&&o.b)||null;m.eq.a='padded';m.eq.h=null;m.inj=[];m.traits=[];m.hp=X.calc(m).hp;m.field=true;return m}
// a flat arena at the company's turn, everything parked; the battle stays busy so nothing moves on its own
async function arena(seed,ros,foes,f){const G=X.G;G.roster=ros;G.day=10;X.seedRng(seed);
 const b=X.startBattle({f:f||'bandit',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:6000,foes:foes||['thug','thug','thug','thug']});ok(b,'arena did not start');
 let n=0;while(!b.over&&(b.busy||b.cur.side!==0)){await null;if(++n>3e6)fail('arena never reached a company turn')}
 const P=b.units.filter(u=>u.side===0),E=b.units.filter(u=>u.side===1);
 const park=()=>{b.tiles.forEach(t=>{t.t='ground';t.h=0});b.units.forEach((u,i)=>{u.alive=true;u.gone=null;u.down=false;u.hp=u.hpMax=Math.max(u.hpMax,80);u.arm=u.armMax;u.helm=u.helmMax;u.st={};u.buffs=u.buffs.filter(x=>x.foe);
   u.mor=3;u.fearless=true;u.aoo=0;u.rooted=false;u.dazed=false;u.fat=0;u.ap=u.apMax;u.dnc=0;u.bonusAP=0;u.used={};u.qsT=0;u.slipT=0;u.c=i;u.r=u.side?0:BH-1;u.face=u.side?[0,-1]:[0,1]});b.order=[];b.busy=true;b.cur=P[0];X.foeAuras();X.auraScan()};
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
  if(!t.alive&&hp0>0&&t.hp<=0)ok(f.kill||(f.kb&&ev&&(ev.dmg<hp0||f.undying)),'a kill the forecast did not allow: '+tag+' '+JSON.stringify({hp0,ev,hpMax:f.hpMax,kb:f.kb,und:f.undying}));   // (a knockback's slam may finish what the blow, or Undying, left)else if(t.alive)ok(!f.sure,'a sure kill that did not happen: '+tag);
  if(t.alive)for(const k in t.st)if((t.st[k]||0)>(st0[k]||0)&&!['harried','pack','bonewall','banner','winded','fury','spent','enrage'].includes(k)){FS.st[k]=(FS.st[k]||0)+1;ok(f.statuses.some(s=>s.k===k&&s.n>=t.st[k]&&s.ch>0),`status ${k} was applied but not forecast: `+tag+' '+JSON.stringify(f.statuses))}}
 return hit};
// a sword of background bg with weapon w (and o.s shield, o.a body armor, o.h helmet, o.b sidearm) and the perks given
function mk(bg,w,perks,o){o=o||{};const m=X.newMerc(bg||'sellsword');m.trees=o.trees||['vanguard','bulwark','shieldbearer','brute'];m.gift=null;m.lvl=11;m.perks=(perks||[]).slice();m.pp=0;
 m.eq.w=w;m.eq.s=o.s||null;m.eq.b=o.b||null;m.eq.a=o.a||'padded';m.eq.h=o.h||null;m.inj=[];m.traits=[];m.hp=X.calc(m).hp;m.field=true;return m}
const F=(u,fl)=>{u.flags=Object.assign({},u.flags,fl);X.auraScan()};
let LC=987654321;const R=()=>{LC=(Math.imul(LC,1103515245)+12345)>>>0;return LC/4294967296},pick=L=>L[Math.floor(R()*L.length)];
const GUNT=['gunner','pistol','powder'];
// a gunner of background bg with weapon w, the perks given and the trees (default: the three firearm trees and Survivor)
function gm(bg,w,perks,o){o=o||{};const m=X.newMerc(bg||'musketeer');m.trees=o.trees||['gunner','pistol','powder','survivor'];m.gift=null;m.lvl=11;m.perks=(perks||[]).slice();m.pp=0;
 m.eq.w=w;m.eq.s=o.s||null;m.eq.b=o.b||null;m.eq.a=o.a||'padded';m.eq.h=o.h||null;m.inj=[];m.traits=[];m.hp=X.calc(m).hp;m.field=true;return m}
const hitsOn=(t,fn)=>{let n=0;const on0=X.FX.on;X.FX.on=(ty,d)=>{if(ty==='hit'&&d.t===t)n++;if(on0)on0(ty,d)};return Promise.resolve(fn()).then(()=>{X.FX.on=on0;return n},e=>{X.FX.on=on0;throw e})};
(async()=>{
/* ---- the duplicate audit: the whole game, every tree ---- */
// Shared base mechanics: generic numbers several trees may raise (a stat, armor's mitigation curve, damage of a kind, a gift's pool...).
// Each is a quantity, not a playstyle; no firearm tree carries one. Anything else shared between two trees fails.
const SHARED={dmgRanged:'ranged damage',dmgMelee:'melee damage',spellB:'spell damage',twoDmg:'two-handed damage',headB:'head chance',ignB:'armor piercing',
 mitK:'armor mitigation',mitCap:'armor mitigation ceiling',hpSoak:'damage soaked',drB:'damage taken',drMelee:'damage taken from blows',drRanged:'damage taken from shots',
 healB:'healing',medAura:'healing aura',regenHP:'regeneration',killHeal:'heal on a kill',killRes:'gift on a kill',ammoB:'throws carried',coverIgn:'cover ignored',longShot:'no range penalty',
 brvAura:'resolve aura',cmd:'to hit aura',vsBoss:'damage against the great',vsFull:'damage against the unhurt',vsArm:'damage against armor',lowHpDmg:'damage when hurt',lastStand:'damage taken when hurt',
 reachHit:'reach to hit',flank:'flank to hit',flankDmg:'flank damage',shieldHp:'shield hitpoints',splitB:'shield splitting',killMor:'steadied by a kill',fleet:'defense after moving',
 sidestep:'a heavy blow halved','f:kbImm':'cannot be knocked back','f:undying':'survives a killing blow','f:berserk':'AP on a kill','f:eagle':'bow range','f:noLock':'no ranged lock',
 'f:footing':'half fatigue for steps','f:noStun':'cannot be stunned',roll:'rolls with knockback'};
// the fabled warriors' personal trees (one legend each, never drawn by a recruit) echo a style tree's passive here and there: listed, reported
const FAB_ECHO=['fab.korvak.2','fab.yuki.3','fab.nobusada.1','fab.agathe.2','fab.aldric.3','fab.ulfgar.3','fab.agathe.cap','fab.mirela.3','fab.tomoe.3','fab.aldric.1','fab.seraphine.3','fab.tomoe.1','fab.grimhild.3','fab.brannoc.3','fab.kagemaru.3','fab.ysolde.3'];
section('the duplicate audit: no tree repeats another tree\'s ability or passive');
{ fresh(SEED);const M=X.MAST,AB=X.AB,all=[];
  for(const k in M){const T=M[k];for(const p of T.p)all.push({t:T.kind==='weapon'?'w:'+p.wt:k,p,T});if(T.cap)for(const p of T.cap.tiers.flat())all.push({t:p.wt?'w:'+p.wt:k,p,T})}
  // 1. an ability is granted by one tree only
  const ab={};for(const x of all)if(x.p.ab)(ab[x.p.ab]=ab[x.p.ab]||[]).push(x.p.id);
  for(const a in ab)ok(ab[a].length===1,'ability '+a+' granted by '+ab[a].join(' and '));
  // 2. no two perks of different trees with the same effect (a gift's pool-only perk aside: +gift, +regen)
  const sig=p=>JSON.stringify([p.st||{},p.mod||{},p.flag||'',p.ab||'',p.wmod||{},p.res||0,p.regen||0]),by={};for(const x of all)(by[sig(x.p)]=by[sig(x.p)]||[]).push(x);
  let echo=[];for(const s in by){const L=by[s];if(new Set(L.map(x=>x.t)).size<2)continue;const p=L[0].p;
   if(!p.st&&!p.mod&&!p.flag&&!p.ab&&!p.wmod&&(p.res||p.regen))continue;   // a gift's pool (Harmony, Gathering storm): the shared base of the gift
   const fab=L.filter(x=>x.T.kind==='fabled');ok(fab.length>=L.length-1&&fab.every(x=>FAB_ECHO.includes(x.p.id)),'the same effect in two trees: '+L.map(x=>x.p.id+' '+x.p.n).join(' | '));echo.push(L.map(x=>x.p.id).join('='))}
  // 3. a mechanic key (mod or flag) in two trees is a shared base mechanic (SHARED) or a fabled echo; the weapon tree's per-family tuning (wmod) never repeats a family's whole perk
  const keys={};for(const x of all){if(x.T.kind==='fabled')continue;for(const q of Object.keys(x.p.mod||{}).concat(x.p.flag?['f:'+x.p.flag]:[]))(keys[q]=keys[q]||new Set()).add(x.t)}
  const shared=[];for(const q in keys)if(keys[q].size>1){ok(SHARED[q],'mechanic '+q+' in two trees: '+[...keys[q]].join(', ')+' (not a shared base mechanic)');shared.push(q)}
  // 4. every name once
  const nm={};for(const x of all)(nm[x.p.n]=nm[x.p.n]||[]).push(x.p.id);for(const n in nm)ok(nm[n].length===1,'the name '+n+' twice: '+nm[n].join(' '));
  // 5. the firearm trees: none of their keys is shared with any other tree (fabled included), no stat-only perk
  for(const k of GUNT){const T=M[k];for(const p of T.p.concat(T.cap.tiers.flat())){for(const q of Object.keys(p.mod||{}).concat(p.flag?['f:'+p.flag]:[]).concat(p.ab?['ab:'+p.ab]:[])){
     const others=all.filter(x=>x.t!==k&&(q.startsWith('ab:')?x.p.ab===q.slice(3):q.startsWith('f:')?x.p.flag===q.slice(2):x.p.mod&&x.p.mod[q]!==undefined));ok(!others.length,p.id+': '+q+' also in '+others.map(x=>x.p.id).join())}
    ok(p.ab||p.mod||p.flag,p.id+': a mechanic of its own, not a bare stat')}}
  // the old Gunnery's borrowed capstone keys and the Gunsmoke Saint's no-lock are gone
  ok(!M.gunner.cap.tiers[0][0].mod.dmgRanged&&!M.gunner.cap.tiers[0][0].mod.coverIgn&&X.perkById('fab.mattias.cap').perk.flag!=='noLock','Musketry\'s capstone and the Gunsmoke Saint no longer borrow');
  ok(JSON.stringify(X.perkById('weapons.flintlock').perk.wmod)!==JSON.stringify(X.perkById('weapons.crossbow').perk.wmod),'Ramrod drill is not Crank drill');
  console.log('abilities: '+Object.keys(ab).length+', each granted by one tree; shared base mechanics in use ('+shared.length+'): '+shared.join(' '));
  console.log('fabled echoes (reported, allowlisted): '+echo.join(', ')) }
section('the three firearm trees: role, tiers, two abilities, capstone, icons, texts');
{ const M=X.MAST,AB=X.AB;
  for(const k of GUNT){const T=M[k];ok(T&&T.kind==='style'&&X.MUNDANE.includes(k)&&T.tiers.length===6&&T.tiers.every((t,i)=>t.length===1&&t[0].id===k+'.'+(i+1)),k+': a style tree, six tiers, ids pinned');
   ok(typeof T.role==='string'&&T.role.length>40&&T.aff.includes('ranged'),k+': its role: '+T.role);const abs=T.p.filter(p=>p.ab).map(p=>p.ab);ok(abs.length===2&&abs.every(a=>AB[a]&&AB[a].n&&AB[a].d),k+': two abilities ('+abs+')');
   const C=T.cap&&T.cap.tiers[0][0];ok(C&&C.id===k+'.cap'&&C.d,k+': a capstone');
   for(const n of ['m-'+k].concat(abs.map(a=>'ab-'+a),T.p.filter(p=>!p.ab).concat([C]).map(p=>'perk-'+p.id))){ok(X.icResolve(n)!=='none'&&X.icResolve(n)===n,'pixel icon (Detail Low) '+n);ok(X.pkHas(n),'painted icon (Detail High) '+n)}
   for(const p of T.p.concat([C])){ok(!/undefined|NaN/.test(p.d)&&p.d.length>20,p.id+': a text');const md=p.mod||{};   // the numbers in the text are the numbers in the rules
    for(const q in md){const v=md[q];if(v>0&&v<1&&!['blastBurn'].includes(q))ok(p.d.includes(Math.round(v*100)+'%'),p.id+': '+q+' '+v+' in its text');else if(v>1)ok(p.d.includes(String(v)),p.id+': '+q+' '+v+' in its text')}}}
  ok(new Set(GUNT.map(k=>M[k].role)).size===3&&M.gunner.n==='Musketry'&&M.pistol.n==='Pistolier'&&M.powder.n==='Grenadier','three roles, three names');
  for(const id of ['gvolley','qdraw','pwhip','grenade','petard'])ok(AB[id].fx&&/\d/.test(AB[id].d),id+': fx and numbers');
  ok(X.GT_ICONS.length>=20&&X.GT_ICONS.every(n=>X.icResolve(n)!=='none'&&X.pkHas(n)),'GT_ICONS: both details');
  console.log('Musketry, Pistolier, Grenadier: roles, 2 abilities each, capstones, '+X.GT_ICONS.length+' icons: ok') }
section('who carries them: backgrounds, pools, recruits, rivals, the Isekai, brigands');
{ const G=fresh(SEED+1),B0=X.BG,M=X.MAST;const CORE={arquebusier:'gunner',musketeer:'gunner',fowler:'gunner',pistoleer:'pistol',sapper:'powder',gunner:'powder'};
  for(const bg in CORE){ok(B0[bg].core===CORE[bg]&&B0[bg].pool.includes(CORE[bg]),bg+': core '+CORE[bg]);for(let i=0;i<20;i++){const m=X.newMerc(bg);ok(m.trees.includes(CORE[bg]),bg+' recruit carries '+CORE[bg])}}
  for(const k of GUNT)ok(Object.keys(B0).filter(bg=>B0[bg].pool.includes(k)).length>=5,k+' in five pools or more');
  for(const bg of ['thief','sailor','noble','spellblade'])ok(B0[bg].pool.includes('pistol')&&!B0[bg].pool.includes('gunner'),bg+': the Pistolier in its pool');ok(B0.witchhunter.pool.includes('gunner'),'the witch hunter keeps Musketry');
  ok(X.iskStyles().includes('pistol')&&X.iskStyles().includes('powder')&&X.iskStyles().includes('gunner'),'the Isekai creator lists all three');
  ok(X.FOEMAST.bgun.p.includes('powder.1')&&X.FOEMAST.bgun.e.includes('powder.3'),'the brigand gunner: a Grenadier\'s smoke and powder');
  // rivals: gun backgrounds hired by rival companies carry their trees and, learned, their abilities
  let rv=0;for(const r of G.rivals||[])for(const m of r.roster)if(CORE[m.bg]){rv++;ok(m.trees.includes(CORE[m.bg]),'rival '+m.bg+' carries '+CORE[m.bg])}
  // autoLearn builds into the tree of the weapon in hand
  for(const [bg,w,k] of [['musketeer','caliver','gunner'],['pistoleer','pistol','pistol'],['sapper','handgonne','powder']]){const m=gm(bg,w,[],{trees:[k,'survivor','scout','skirmisher']});m.lvl=6;m.pp=6;X.autoLearn(m);
   ok(m.perks.filter(id=>id.startsWith(k+'.')).length>=2,bg+': autoLearn builds into '+k+': '+m.perks.join())}
  const p2=gm('noble','musket',[],{trees:['pistol','gunner','survivor','scout']});p2.pp=6;X.autoLearn(p2);ok(!p2.perks.includes('pistol.1')&&!p2.perks.includes('pistol.2'),'… and passes over pistol perks with a musket in hand: '+p2.perks.join());
  console.log('6 gun backgrounds, 4 more pools, '+rv+' rival gunners, the Isekai, the brigand gunner, autoLearn: ok') }
section('the new mechanics, one by one');
{ fresh(SEED+2);
  const mu=gm('musketeer','caliver',['gunner.1','gunner.2','gunner.6']),m2=gm('arquebusier','arquebus',[]),m3=gm('arquebusier','arquebus',[]),
   pi=gm('pistoleer','pistol',['pistol.1','pistol.2','pistol.3','pistol.4','pistol.5','pistol.6']),gr=gm('sapper','handgonne',['powder.1','powder.2','powder.3','powder.4','powder.5','powder.6']),
   sw=gm('sapper','shortsword',['powder.2','powder.4']);
  const {b,P,E,park}=await arena(SEED+3,[mu,m2,m3,pi,gr,sw],['thug','thug','braid','braid','bgun','thug']);const [MU,M2,M3,PI,GR,SW]=P,[e1,e2,e3,e4,e5,e6]=E;
  const at=u=>X.abilityInfo(u,'attack'),A=(u,id)=>X.abilityInfo(u,id),hp9=x=>{x.hp=x.hpMax=9999;x.arm=x.armMax;x.fearless=true};
  // Rolling volley: every firearm hit on the foe this round adds 8%, up to three
  park();b.cur=MU;b.round=3;put(MU,5,10);put(e1,5,5);hp9(e1);const r0=X.dmgBonus(MU,e1,at(MU));e1.gvR=3;e1.gvN=2;ok(near(X.dmgBonus(MU,e1,at(MU))-r0,.16),'Rolling volley: +16% after two gun hits this round');
  e1.gvN=5;ok(near(X.dmgBonus(MU,e1,at(MU))-r0,.24),'… at most +24%');e1.gvR=2;ok(near(X.dmgBonus(MU,e1,at(MU)),r0),'… this round only');e1.gvR=0;e1.gvN=0;
  for(let i=0;i<20&&!(e1.gvN>0);i++){X.setLoaded(M2,true);await X.strike(M2,e1,at(M2))}ok(e1.gvR===b.round&&e1.gvN>=1,'a firearm hit is counted on its target');
  // Volley fire: the allies within 2 with loaded guns fire too, for 60%; their loads are spent, not their AP
  park();b.cur=MU;put(MU,5,10);put(M2,4,10);put(M3,6,10);put(PI,9,10);put(e1,5,5);hp9(e1);for(const x of [MU,M2,M3,PI])X.setLoaded(x,true);const ap2=M2.ap,ap3=M3.ap;
  const vf=A(MU,'gvolley');ok(X.canUse(MU,vf)&&vf.ap===5&&vf.gvol===.6,'Volley fire: usable, 5 AP, allies at 60%');ok(X.gtVolleyMates(MU,e1).length===2,'… two allies within 2 tiles join (the pistoleer 4 tiles off does not)');
  const fo=X.forecast(M2,e1,at(M2),{splash:.6,free:'volley'}),fp=X.forecast(M2,e1,at(M2));ok(fo.dmgMax<fp.dmgMax&&fo.dmgMax>=Math.floor(fp.dmgMax*.6)-1,'… an ally\'s volley shot forecast at 60% ('+fo.dmgMax+' of '+fp.dmgMax+')');
  let mates=0;const on0=X.FX.on;X.FX.on=(ty,d)=>{if((ty==='hit'||ty==='miss')&&d.t===e1&&(d.u===M2||d.u===M3))mates++;if(on0)on0(ty,d)};MU.ap=9;await X.useAbility(MU,vf,KU(e1));await rest(b);b.busy=true;X.FX.on=on0;
  ok(mates===2&&M2.loaded===false&&M3.loaded===false&&M2.ap===ap2&&M3.ap===ap3&&PI.loaded,'… both fired ('+mates+'), loads spent, AP kept now; the pistoleer did not');
  M2.ap=M2.apMax;X.pvTurn(M2);ok(M2.ap===M2.apMax-2&&!M2.vfAP,'… and the ally\'s next turn starts 2 AP short');
  F(MU,{volleyB:.25});ok(X.gtVolleyK(MU,vf)===.85,'Fire by ranks: 85%');F(MU,{volleyB:0});
  park();put(MU,5,10);for(const [x,c] of [[M2,4],[M3,6],[PI,5]])put(x,c,x===PI?9:10);put(SW,3,10);put(GR,7,10);for(const x of [M2,M3,PI,GR,SW])x.wpn=Object.assign({},x.wpn,{wt:'flintlock'});
  ok(X.gunMates(MU)===3,'Gunline: three allies count');F(MU,{lineMax:1});ok(X.gunMates(MU)===4,'Fire by ranks: four');F(MU,{lineMax:0});
  for(const x of [M2,M3,PI,GR,SW])x.wpn=X.calc(x.m).wpn;
  // Arm's length (pistols only), Gunslinger's reach, Wing the runner, Ten paces
  park();b.cur=PI;put(PI,5,8);put(e1,5,6);hp9(e1);for(const x of E)if(x!==e1)put(x,x.c,0);const pa=at(PI);
  const base=()=>{const f0=PI.flags;PI.flags=Object.assign({},f0,{gunPBHit:0,gunPB:0,runHit:0,runDmg:0,paceHit:0,paceDmg:0});const r=[X.hitChance(PI,e1,pa),X.dmgBonus(PI,e1,pa)];PI.flags=f0;return r};
  e1.mvd=0;put(e2,0,0);let [h0,d0]=base();ok(X.hitChance(PI,e1,pa)===Math.min(95,h0+20)&&near(X.dmgBonus(PI,e1,pa)-d0,.3),'Arm\'s length (+10, +15%) and Ten paces (+10, +15%) at 2 tiles, alone with the foe');
  put(e2,7,8);[h0,d0]=base();ok(X.hitChance(PI,e1,pa)===Math.min(95,h0+10)&&near(X.dmgBonus(PI,e1,pa)-d0,.15),'… another foe within 3 tiles: no Ten paces');
  e1.mvd=1;ok(X.hitChance(PI,e1,pa)===Math.min(95,h0+20)&&near(X.dmgBonus(PI,e1,pa)-d0,.25),'Wing the runner: +10, +10% on a foe that moved');e1.mvd=0;put(e2,0,0);
  put(e1,5,5);[h0,d0]=base();ok(X.hitChance(PI,e1,pa)===Math.min(95,h0+10),'3 tiles: no Arm\'s length');F(PI,{pbR:1});ok(X.hitChance(PI,e1,pa)===Math.min(95,h0+20),'Gunslinger: Arm\'s length at 3 tiles');F(PI,{pbR:0});
  {const mm=MU,f0=mm.flags;F(mm,{gunPBHit:10,gunPB:.15,runHit:10});put(mm,6,8);put(e1,6,6);e1.mvd=1;const ma=at(mm);const fx=mm.flags;mm.flags=Object.assign({},fx,{gunPBHit:0,gunPB:0,runHit:0});const hb=X.hitChance(mm,e1,ma);mm.flags=fx;
   ok(X.hitChance(mm,e1,ma)===hb,'… none of the Pistolier\'s terms with a two-handed gun');mm.flags=f0;e1.mvd=0}
  // Quick draw: 2 AP, 70%, a pistol only; Pistol-whip: melee skill, allowed when engaged, keeps the load, dazes
  park();b.cur=PI;put(PI,5,8);put(e1,5,6);X.setLoaded(PI,true);const qd=A(PI,'qdraw');ok(qd.ap===2&&qd.mult===.7&&qd.hit===-5&&X.canUse(PI,qd),'Quick draw: 2 AP, 70%, −5');
  ok(!X.canUse(MU,A(MU,'qdraw'))&&/pistol/i.test(X.useBlock(MU,A(MU,'qdraw'))),'… not with a long gun');
  put(e1,5,7);const pw=A(PI,'pwhip');ok(X.rangedLocked(PI)&&X.canUse(PI,pw)&&!X.canUse(PI,at(PI)),'Pistol-whip: allowed with the foe next to you (shooting is not)');
  const sk0=X.hitChance(PI,e1,pw);PI.ms+=10;ok(X.hitChance(PI,e1,pw)===Math.min(95,sk0+10),'… aimed with melee skill');PI.ms-=10;ok(X.forecast(PI,e1,pw).statuses.some(s=>s.k==='daze'),'… dazes (forecast)');
  PI.ap=9;await X.useAbility(PI,pw,KU(e1));await rest(b);b.busy=true;ok(PI.loaded!==false,'… the load stays in the pan');
  // Brace of pistols: every second shot keeps the load
  park();b.cur=PI;put(PI,5,8);put(e1,5,5);hp9(e1);X.setLoaded(PI,true);PI.brN=0;PI.ap=12;await X.useAbility(PI,at(PI),KU(e1));await rest(b);b.busy=true;ok(PI.loaded!==false,'Brace of pistols: the first shot keeps the load');
  PI.ap=12;await X.useAbility(PI,at(PI),KU(e1));await rest(b);b.busy=true;ok(PI.loaded===false,'… the second spends it');
  // Powder smoke; Grenade: any weapon, ranged skill, two a battle (three with Master sapper), 70% to the foes beside; Blasting powder; Shellshock; Wildfire
  park();b.cur=GR;put(GR,5,9);put(e1,5,5);X.setLoaded(GR,true);X.payFor(GR,at(GR));ok(GR.smoke===1,'Powder smoke: firing makes the smoke');GR.smoke=0;
  b.cur=SW;put(SW,8,9);put(e2,8,5);put(e3,9,5);put(e4,7,5);for(const x of [e2,e3,e4])hp9(x);const gn=A(SW,'grenade');
  ok(gn.uses===2&&gn.rng===4&&X.canUse(SW,gn)&&SW.wpn.wt==='sword','Grenade: two a battle, 4 tiles, with a sword in hand');
  const g0=X.hitChance(SW,e2,gn);SW.rs+=10;ok(X.hitChance(SW,e2,gn)===Math.min(95,g0+10),'… aimed with ranged skill');SW.rs-=10;ok(near(X.dmgBonus(SW,e2,gn),0)&&near(X.ignOf(SW,gn),.3),'… its own numbers: no weapon bonuses, 30% piercing');
  let side=0;X.FX.on=(ty,d)=>{if(ty==='hit'&&(d.t===e3||d.t===e4)&&d.u===SW)side++;if(on0)on0(ty,d)};
  SW.rs+=40;for(let i=0;i<2;i++){SW.ap=9;await X.useAbility(SW,X.abilityInfo(SW,'grenade'),KU(e2));await rest(b);b.busy=true}X.FX.on=on0;SW.rs-=40;
  ok(side>=1,'… the foes beside are caught ('+side+' hits; chance '+X.hitChance(SW,e3,gn)+' rs '+X.eff(SW,'rs')+' rd '+X.eff(e3,'rd')+' cover '+JSON.stringify(X.losInfo(SW,e3,gn))+' h '+X.T(SW).h+'/'+X.T(e3).h+', '+[e2,e3,e4].map(x=>x.c+','+x.r+' '+x.hp).join(' ')+')');ok(!X.canUse(SW,X.abilityInfo(SW,'grenade'))&&/None left/.test(X.useBlock(SW,X.abilityInfo(SW,'grenade'))),'… none left after two');
  F(SW,{bombN:1});ok(X.canUse(SW,X.abilityInfo(SW,'grenade'))&&X.abilityInfo(SW,'grenade').uses===3,'Master sapper: a third');F(SW,{bombN:0});
  b.cur=GR;put(GR,5,8);put(e1,5,6);ok(near(X.dmgBonus(GR,e1,A(GR,'grenade')),.2)&&near(X.dmgBonus(GR,e1,A(GR,'blast'))-X.dmgBonus(GR,e1,at(GR)),.2),'Blasting powder: +20% to Grenade and Scattershot (not the plain shot)');
  e1.fearless=false;const gf=X.forecast(GR,e1,A(GR,'grenade'));ok(A(GR,'grenade').scare&&gf.scare,'Shellshock: a blast tests morale (forecast)');ok(!at(GR).scare,'… not a plain shot');
  ok(gf.statuses.some(s=>s.k==='burn'&&s.n===2&&s.ch>0),'Wildfire: burning 2 turns (forecast)');F(GR,{blastIgn:.15});ok(near(X.ignOf(GR,A(GR,'grenade')),.45),'Master sapper: blasts pierce 15% more');F(GR,{blastIgn:0});
  // Petard: cannot miss, knocks back, a raised shield takes 60, once a battle
  park();b.cur=GR;put(GR,5,8);put(e1,5,7);put(e2,9,0);e1.hp=e1.hpMax=9999;const pt=A(GR,'petard');ok(X.hitChance(GR,e1,pt)===100&&pt.uses===1&&X.forecast(GR,e1,pt).kb,'Petard: cannot miss, knocks back');
  e1.shield=true;e1.shp=e1.shpMax=Math.max(e1.shpMax||0,200);const sp0=e1.shp;GR.ap=9;await X.useAbility(GR,pt,KU(e1));await rest(b);b.busy=true;ok(sp0-e1.shp>=60||!e1.shield,'… the raised shield takes 60 ('+sp0+' -> '+e1.shp+')');
  ok(e1.r!==7||e1.c!==5,'… knocked back');ok(!X.canUse(GR,A(GR,'petard')),'… once a battle');
  // the Gunsmoke Saint: Veil of smoke, a kill reloads; Ramrod drill: 2 AP and 6 fatigue off the reload
  park();b.cur=e1;put(MU,5,8);put(e1,5,7);F(MU,{smokeMel:10});MU.smoke=0;const ea=at(e1),s0=X.hitChance(e1,MU,ea);MU.smoke=1;ok(X.hitChance(e1,MU,ea)===Math.max(5,s0-10)||s0<=15,'Veil of smoke: −10 to melee blows after firing');MU.smoke=0;F(MU,{smokeMel:0});
  b.cur=MU;F(MU,{killLoad:1});put(e1,5,5);e1.hp=1;e1.arm=0;e1.helm=0;e1.alive=true;X.setLoaded(MU,true);for(let i=0;i<12&&e1.alive;i++){X.setLoaded(MU,true);X.payFor(MU,at(MU));await X.strike(MU,e1,at(MU))}
  ok(!e1.alive&&MU.loaded,'Saint of gunsmoke: the kill reloads');F(MU,{killLoad:0});
  {const a0=gm('musketeer','musket',[]),a1=gm('musketeer','musket',['weapons.flintlock']),c0=X.calc(a0).wpn.reload,c1=X.calc(a1).wpn.reload;ok(c1.ap===Math.max(2,c0.ap-2)&&c1.fat===c0.fat-6,'Ramrod drill: −2 AP, −6 fatigue')}
  X.B=null;X.mode='world';console.log('Rolling volley, Volley fire, Fire by ranks, Arm\'s length, Wing the runner, Ten paces, Gunslinger, Quick draw, Pistol-whip, Brace of pistols, Powder smoke, Grenade, Blasting powder, Shellshock, Wildfire, Petard, Master sapper, Veil of smoke, Saint of gunsmoke, Ramrod drill: ok') }
section('forecast == strike: forced strikes with the firearm trees (volley shots, blasts and their splash included)');
{ fresh(SEED+5);const ALL=[].concat(...GUNT.map(k=>X.MAST[k].p.map(p=>p.id)),GUNT.map(k=>k+'.cap'),['weapons.flintlock']);
  const kit=[['musketeer','caliver',{a:'mail'}],['arquebusier','arquebus',{a:'padded'}],['pistoleer','pistol',{a:'leather'}],['pistoleer','twinpistol',{a:'leather'}],['sapper','handgonne',{a:'jack'}],
   ['gunner','blunder',{a:'leather'}],['sapper','shortsword',{a:'padded'}],['musketeer','musket',{a:'mail'}]];
  const ros=kit.map(([bg,w,o])=>{const m=gm(bg,w,ALL,o);m.lvl=12;return m});
  const {b,P,E,park}=await arena(SEED+6,ros,['thug','braid','barbhus','bgun','samurai','ashi']);for(const u of E){u.flags=Object.assign({},u.flags);for(const id of ['pistol.3','pistol.5','gunner.1','powder.3','powder.6'])for(const k in X.perkById(id).perk.mod)u.flags[k]=(u.flags[k]||0)+X.perkById(id).perk.mod[k]}X.auraScan();
  const ABS=['attack','attack','qdraw','pwhip','gvolley','grenade','petard','blast','dcharge'];FCHECK=true;FS.n=0;FS.byAb={};let tries=0;const U=b.units;
  while(FS.n<(QUICK?1200:2600)&&tries++<30000){park();for(const u of U){u.fearless=false;u.used={}}const u=pick(U.filter(x=>x.alive)),t=pick(U.filter(x=>x.alive&&x.side!==u.side));
   const id=pick(ABS);if(id!=='attack'&&!u.abs.includes(id))continue;const a=X.abilityInfo(u,id);if(!a)continue;const rngd=X.isRangedAtk(u,a)||a.bomb;
   put(u,6,6);put(t,6,rngd&&a.rng>1?Math.max(0,6-1-Math.floor(R()*Math.min(4,a.rng))):5);
   for(const x of U)if(x!==u&&x!==t){x.c=1+Math.floor(R()*14);x.r=1+Math.floor(R()*10);if(X.unitAt(x.c,x.r)!==x||(x.c===6&&x.r<=6&&x.r>=1)){x.c=15;x.r=11-(x.id%3)}}
   if(R()<.6){const o=pick(U.filter(x=>x!==u&&x!==t&&x.side===t.side));if(o&&!X.unitAt(7,t.r))put(o,7,t.r)}if(R()<.6){const o=pick(U.filter(x=>x!==u&&x!==t&&x.side===u.side));if(o&&!X.unitAt(5,6))put(o,5,6)}
   for(const x of U)if(x.wpn&&x.wpn.reload)X.setLoaded(x,R()<.85);
   b.cur=u;u.mvd=R()<.5?1:0;t.mvd=R()<.5?1:0;u.primed=R()<.4?1:0;b.round=4;t.gvR=R()<.5?4:0;t.gvN=Math.floor(R()*4);t.mor=pick([1,2,3,3,4]);u.smoke=R()<.3?1:0;
   if(R()<.3)t.arm=Math.floor(t.armMax*R());if(R()<.3)t.hp=Math.max(1,Math.floor(t.hpMax*R()));if(R()<.4&&t.shpMax>0)t.shield=true;
   X.foeAuras();X.auraScan();if(!X.canFire(u,a))X.setLoaded(u,true);u.ap=12;if(!X.canUse(u,a))continue;const k=KU(t);if(!X.validTargets(u,a).has(k))continue;await X.useAbility(u,a,k);b.busy=true}
  FCHECK=false;ok(FS.n>=(QUICK?1000:2400),'forced strikes: '+FS.n+' (tries '+tries+')');for(const id of ['qdraw','pwhip','gvolley','grenade','petard','blast'])ok(FS.byAb[id]>(QUICK?5:20),'strikes with '+id+': '+FS.byAb[id]);
  X.B=null;X.mode='world';console.log(FS.n+' strikes, '+FS.hits+' hits '+JSON.stringify(FS.byAb)+', statuses '+JSON.stringify(FS.st)+': forecast == strike: ok') }
section('the AI uses them: the company on auto, a rival company of gunners');
{ const use={},u0=X.ctx.useAbility;X.ctx.useAbility=async function(u,a,k){const s=(u.side?'rv:':'')+a.id;use[s]=(use[s]||0)+1;return u0(u,a,k)};
  const kit=[['musketeer','caliver','gunner'],['arquebusier','arquebus','gunner'],['musketeer','musket','gunner'],['pistoleer','pistol','pistol'],['pistoleer','dragon','pistol'],['sapper','handgonne','powder'],['gunner','blunder','powder']];
  const crew=(i,n)=>{const L=[];for(let j=0;j<n;j++){const [bg,w,k]=kit[(i+j)%kit.length],m=gm(bg,w,[],{trees:[k,'survivor','scout','skirmisher'],b:k==='pistol'?'arming':null});X.gainXP(m,X.XPT[10]);m.pend=0;m.perks=[];for(let lv=1;lv<=10;lv++){m.lvl=lv;m.pp=1;X.autoLearn(m)}m.eq.h='cap';m.hp=X.calc(m).hp;L.push(m)}return L};
  const NB=QUICK?3:6;let wins=0;
  for(let i=0;i<NB;i++){const G=fresh(SEED+30+i);G.roster.length=0;G.roster.push(...crew(i,6));FCHECK=true;
   const res=await X.autoBattle({f:['bandit','bandit','orc','gob','bandit','free'][i],mult:.75,biome:'plains',pilot:'sensible',src:{type:'test'},turnCap:4000});FCHECK=false;ok(res&&!res.stuck,'an auto battle ended');if(res.win)wins++;X.B=null;X.mode='world'}
  // a rival company of gunners against the company: the rivals' AI (aiRun with the rival's plan) uses the trees' abilities
  for(let i=0;i<(QUICK?2:3);i++){const G=fresh(SEED+60+i);const r=(G.rivals||[])[0];ok(r,'a rival company');r.roster=crew(i+2,6).map((m,j)=>Object.assign(m,{field:true,slot:{row:j%2,col:4+j}}));
   G.roster.forEach(m=>{m.perks=[];for(let lv=1;lv<=10;lv++){m.lvl=lv;m.pp=1;X.autoLearn(m)}});FCHECK=true;const res=await X.autoBattle({rival:r.id,f:r.id,mult:1,biome:'plains',pilot:'sensible',src:{type:'test'},turnCap:4000});FCHECK=false;ok(res&&!res.stuck,'a rival battle ended');X.B=null;X.mode='world'}
  X.ctx.useAbility=u0;console.log('AI over '+NB+' battles ('+wins+' won) and the rival battles: '+JSON.stringify(use));
  ok(['gvolley','qdraw','pwhip','grenade','petard'].filter(id=>(use[id]||0)+(use['rv:'+id]||0)>0).length>=4,'the AI uses the new abilities in battle');
  // and each one where it is at its best: the AI (aiTurn2) picks it
  { fresh(SEED+80);const tn0=X.ctx.nextTurn;const seen={};const u1=X.ctx.useAbility;X.ctx.useAbility=async function(u,a,k){if(u.side===0)seen[a.id]=(seen[a.id]||0)+1;return u1(u,a,k)};
   const ALL=[].concat(...GUNT.map(k=>X.MAST[k].p.map(p=>p.id)));
   const cases=[['gvolley',['musketeer','caliver'],(P,E)=>{P.forEach((u,i)=>put(u,5+i,11));put(E[0],6,5)}],
    ['qdraw',['pistoleer','pistol'],(P,E)=>{P.forEach((u,i)=>{put(u,1+i*4,10);u.ap=2});E.forEach((e,i)=>put(e,1+i*4,7))}],
    ['pwhip',['pistoleer','pistol'],(P,E)=>{P.forEach((u,i)=>{put(u,1+i*4,10);X.setLoaded(u,false);u.ap=4});E.forEach((e,i)=>put(e,1+i*4,9))}],
    ['grenade',['sapper','shortsword'],(P,E)=>{P.forEach((u,i)=>put(u,5+i,11));E.forEach((e,i)=>put(e,6+(i%2),7+Math.floor(i/2)))}],
    ['petard',['sapper','shortsword'],(P,E)=>{P.forEach((u,i)=>{put(u,1+i*4,10);u.used={grenade:9}});E.forEach((e,i)=>{put(e,1+i*4,9);e.shield=e.shpMax>0})}]];
   for(const [id,[bg,w],place] of cases){const ros=[0,1,2,3].map(()=>gm(bg,w,ALL,{trees:['gunner','pistol','powder','survivor']}));const {b,P,E,park}=await arena(SEED+81,ros,['thug','thug','thug','thug']);park();
    for(const u of P){u.used={};X.setLoaded(u,true);u.ap=u.apMax}for(const e of E){e.hp=e.hpMax=Math.max(e.hpMax,150)}place(P,E);X.foeAuras();X.auraScan();X.ctx.nextTurn=async function(){};
    for(const u of P){if(!u.alive)continue;b.cur=u;await X.aiTurn2(u);b.busy=true}X.ctx.nextTurn=tn0;ok(seen[id]>0,'the AI uses '+id+' where it fits: '+JSON.stringify(seen));X.B=null;X.mode='world'}
   X.ctx.nextTurn=tn0;X.ctx.useAbility=u1;console.log('the AI picks each where it fits: '+JSON.stringify(seen)) }ok((use['rv:gvolley']||0)+(use['rv:qdraw']||0)+(use['rv:grenade']||0)+(use['rv:petard']||0)+(use['rv:pwhip']||0)>0,'… rivals too') }
section('saves: the PKV refit (changed perks refunded, a pistoleer\'s or sapper\'s Musketry traded for its own tree)');
{ const G=fresh(SEED+70);const a=X.newMerc('musketeer'),p=X.newMerc('pistoleer'),s=X.newMerc('sapper');G.roster.push(a,p,s);a.name='Musketeer Ash';p.name='Pistoleer Pell';s.name='Sapper Sorn';   // names of their own: the sheet lists refunds by name
  a.lvl=8;a.trees=['gunner','survivor','scout','skirmisher'];a.perks=['gunner.1','gunner.2','gunner.3','survivor.1','weapons.flintlock'];a.pp=0;
  p.lvl=6;p.trees=['gunner','duelist','scout','rogue'];p.perks=['gunner.3','gunner.4','duelist.1'];p.pp=1;s.lvl=4;s.trees=['scout','gunner','medic','survivor'];s.perks=['gunner.1','scout.1'];s.pp=0;
  const t=G.towns.find(t=>t.recruits&&t.recruits.length),rc=t&&t.recruits[0];if(rc){rc.bg='pistoleer';rc.lvl=5;rc.trees=['gunner','duelist','scout','rogue'];rc.perks=['gunner.3'];rc.pp=0}
  X.mode='world';ok(X.save(),'save');const g=JSON.parse(X.store.get(X.SAVEKEY));ok(g.pkv===X.PKV&&X.PKV>=2,'a save carries the perk version');delete g.pkv;delete g.refund;delete g.refundWhy;g.note=null;
  X.store.set(X.SAVEKEY,JSON.stringify(g));const r=X.readSave();ok(r.state==='ok'&&r.g.pkv===X.PKV&&r.g.v===X.SAVEVER,'an older save loads, refit, same save version');
  const A2=r.g.roster.find(q=>q.id===a.id),P2=r.g.roster.find(q=>q.id===p.id),S2=r.g.roster.find(q=>q.id===s.id);
  ok(A2.perks.join()==='gunner.3,survivor.1'&&A2.pp===3&&A2.trees.includes('gunner'),'Musketry\'s changed tiers and Ramrod drill refunded: '+A2.perks.join()+' pp '+A2.pp);
  ok(P2.trees.includes('pistol')&&!P2.trees.includes('gunner')&&P2.perks.join()==='duelist.1'&&P2.pp===3,'the pistoleer trades Musketry for the Pistolier, its points back: '+P2.trees+' '+P2.perks+' pp '+P2.pp);
  ok(S2.trees.includes('powder')&&!S2.trees.includes('gunner')&&S2.perks.join()==='scout.1'&&S2.pp===1,'the sapper takes the Grenadier: '+S2.trees+' pp '+S2.pp);
  ok(r.g.refundWhy==='guns'&&r.g.note==='refund'&&r.g.refund.some(x=>x.name===a.name&&x.n>=2)&&r.g.refund.some(x=>x.name===p.name&&x.n===2),'the one-time sheet: '+JSON.stringify(r.g.refund));
  if(rc){const R0=r.g.towns.find(q=>q.name===t.name).recruits.find(q=>q.id===rc.id);ok(R0.trees.includes('pistol')&&!R0.perks.includes('gunner.3')&&R0.pp+R0.perks.length>=1,'a pistoleer recruit trades too (its point spent again)')}
  X.G=null;X.mode='title';X.continueGame();closeAll(X);ok(X.mode==='world'&&X.G.pkv===X.PKV,'the refit save loads');let html='';const sh0=X.ctx.sheet;X.ctx.sheet=h=>{html=h};X.G.refund=[{name:'A',n:1}];X.G.refundWhy='guns';X.refundSheet();X.ctx.sheet=sh0;
  ok(/Pistolier/.test(html)&&/Grenadier/.test(html),'the sheet says why');
  // a save already refit is left alone
  ok(X.save(),'save again');const r2=X.readSave();const A3=r2.g.roster.find(q=>q.id===a.id);ok(A3.perks.join()===A2.perks.join()&&A3.pp===A2.pp,'… and refit once only');
  console.log('PKV '+X.PKV+': '+X.PERKV2.length+' changed perks refunded, trees traded, the sheet, once only: ok') }
/* ---- role sims: one background (the musketeer's stats) for every squad, each tree with its trade's weapon (Musketry a caliver, the Pistolier a
   wheellock pistol, the Grenadier a blunderbuss), all six tiers; a squad of four played by the company's AI for one turn, standing its ground
   (rooted: the setting stays what it is), repeated over seeds; the damage dealt (hitpoints and armor) per squad turn. Each tree is best at its job:
     gunline   the squad side by side, four armored foes 4-5 tiles off (the line's ground: range and plate)
     close     the squad spread out, a lone foe 2 tiles from each that has just moved (the pistol's ground)
     crowd     a packed knot of six shield foes 2-3 tiles off (the grenadier's ground) */
section('role sims: each tree best at its own job');
{ const NS=QUICK?6:16,TREES={gunner:'caliver',pistol:'pistol',powder:'blunder'},res={};
  const squad=k=>[0,1,2,3].map(()=>{const m=gm('musketeer',TREES[k],X.MAST[k].p.map(p=>p.id),{trees:[k,'survivor','scout','skirmisher'],a:'leather'});m.traits=[];m.hp=X.calc(m).hp;return m});
  const SET={gunline:{foes:['barbhus','barbhus','barbhus','barbhus'],place:(P,E)=>{P.forEach((u,i)=>put(u,5+i,11));E.forEach((e,i)=>put(e,4+i*2,6+(i%2)))}},
   close:{foes:['braid','braid','braid','braid'],place:(P,E)=>{P.forEach((u,i)=>put(u,1+i*4,10));E.forEach((e,i)=>{put(e,1+i*4,8);e.mvd=1})}},
   crowd:{foes:['thug','thug','thug','thug','thug','thug'],place:(P,E)=>{P.forEach((u,i)=>put(u,5+i,11));E.forEach((e,i)=>put(e,5+(i%3),8+Math.floor(i/3)));for(const e of E)if(e.shpMax>0)e.shield=true}}};
  const tn0=X.ctx.nextTurn;
  for(const sk in SET){res[sk]={};const S=SET[sk];
   for(const k in TREES){fresh(SEED+90);let tot=0;
    for(let n=0;n<NS;n++){const {b,P,E,park}=await arena(SEED+100+n,squad(k),S.foes);park();for(const e of E){e.hp=e.hpMax=Math.max(e.hpMax,120);e.fearless=true;e.mvd=0}S.place(P,E);
     for(const u of P){u.used={};X.setLoaded(u,true);u.rooted=true}X.foeAuras();X.auraScan();const v0=E.reduce((s,e)=>s+e.hp+e.arm+(e.helm||0),0);X.ctx.nextTurn=async function(){};
     for(const u of P){if(!u.alive||b.over)continue;b.cur=u;u.ap=u.apMax;u.mvd=0;X.pvTurn(u);u.rooted=true;await X.aiTurn2(u);b.busy=true}
     X.ctx.nextTurn=tn0;tot+=v0-E.reduce((s,e)=>s+(e.alive?e.hp+e.arm+(e.helm||0):0),0);X.B=null;X.mode='world'}
    res[sk][k]=Math.round(tot/NS)}}
  for(const sk in res)console.log('  '+sk.padEnd(8)+Object.entries(res[sk]).map(([k,v])=>(X.MAST[k].n+' '+v).padEnd(18)).join(''));
  const best=sk=>Object.entries(res[sk]).sort((x,y)=>y[1]-x[1])[0][0];
  ok(best('gunline')==='gunner','the gunline at range: Musketry best '+JSON.stringify(res.gunline));ok(best('close')==='pistol','close in: the Pistolier best '+JSON.stringify(res.close));ok(best('crowd')==='powder','a packed crowd of shields: the Grenadier best '+JSON.stringify(res.crowd)) }
console.log('\nOK guntrees');process.exit(0)})();
