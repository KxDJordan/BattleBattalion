// The fist trees (64x-fists.js; the trees MAST.wrestle / pugilist / willow in 10-data.js, the abilities and the fist weapons in 11x-fists.js):
// the whole-game duplicate audit (as test/guntrees.js: no ability in two trees, no two perks with one effect, no name twice, no mechanic key in
// two trees but the shared base mechanics); each fist tree has its role, at most two abilities, a capstone, icons at both details, its numbers
// in its texts; who carries them (pools, cores, recruits, rivals, the Isekai, autoLearn); every mechanic one by one (breath on foes that tire
// and on foes that never do); the fist weapons (markets, loot, icons, looks on the figures); forecast == strike over forced strikes with the
// new abilities and passives; the AI (company, rivals) uses them; the PKV 3 save refit; role sims (each tree best in its own setting) and a
// fist parity check against the other one-handed melee families.   node test/fists.js [--seed S] [--quick]
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
const hitsOn=(t,fn)=>{let n=0;const on0=X.FX.on;X.FX.on=(ty,d)=>{if(ty==='hit'&&d.t===t)n++;if(on0)on0(ty,d)};return Promise.resolve(fn()).then(()=>{X.FX.on=on0;return n},e=>{X.FX.on=on0;throw e})};
const FT=['wrestle','pugilist','willow'],FW=['wraps','knuckles','baghnakh','shuko','gauntlet','katar'];
// a fighter of background bg with weapon w (null: bare fists), the perks given and the trees (default: the three fist trees and Survivor)
function fm(bg,w,perks,o){o=o||{};const m=X.newMerc(bg||'monk');m.trees=o.trees||['wrestle','pugilist','willow','survivor'];m.gift=null;m.lvl=11;m.perks=(perks||[]).slice();m.pp=0;
 m.eq.w=w||null;m.eq.s=o.s||null;m.eq.b=o.b||null;m.eq.a=o.a===undefined?'padded':o.a;m.eq.h=o.h||null;m.eq.c=null;m.inj=[];m.traits=[];m.hp=X.calc(m).hp;m.field=true;return m}
const ALLP=()=>[].concat(...FT.map(k=>X.MAST[k].p.map(p=>p.id)));
(async()=>{
/* ---- the duplicate audit: the whole game, every tree (test/guntrees.js's, unchanged; the fist trees borrow no shared base mechanic) ---- */
const SHARED={dmgRanged:'ranged damage',dmgMelee:'melee damage',spellB:'spell damage',twoDmg:'two-handed damage',headB:'head chance',ignB:'armor piercing',
 mitK:'armor mitigation',mitCap:'armor mitigation ceiling',hpSoak:'damage soaked',drB:'damage taken',drMelee:'damage taken from blows',drRanged:'damage taken from shots',
 healB:'healing',medAura:'healing aura',regenHP:'regeneration',killHeal:'heal on a kill',killRes:'gift on a kill',ammoB:'throws carried',coverIgn:'cover ignored',longShot:'no range penalty',
 brvAura:'resolve aura',cmd:'to hit aura',vsBoss:'damage against the great',vsFull:'damage against the unhurt',vsArm:'damage against armor',lowHpDmg:'damage when hurt',lastStand:'damage taken when hurt',
 reachHit:'reach to hit',flank:'flank to hit',flankDmg:'flank damage',shieldHp:'shield hitpoints',splitB:'shield splitting',killMor:'steadied by a kill',fleet:'defense after moving',
 sidestep:'a heavy blow halved','f:kbImm':'cannot be knocked back','f:undying':'survives a killing blow','f:berserk':'AP on a kill','f:eagle':'bow range','f:noLock':'no ranged lock',
 'f:footing':'half fatigue for steps','f:noStun':'cannot be stunned',roll:'rolls with knockback'};
const FAB_ECHO=['fab.korvak.2','fab.yuki.3','fab.nobusada.1','fab.agathe.2','fab.aldric.3','fab.ulfgar.3','fab.agathe.cap','fab.mirela.3','fab.tomoe.3','fab.aldric.1','fab.seraphine.3','fab.tomoe.1','fab.grimhild.3','fab.brannoc.3','fab.kagemaru.3','fab.ysolde.3'];
section('the duplicate audit: no tree repeats another tree\'s ability or passive');
{ fresh(SEED);const M=X.MAST,all=[];
  for(const k in M){const T=M[k];for(const p of T.p)all.push({t:T.kind==='weapon'?'w:'+p.wt:k,p,T});if(T.cap)for(const p of T.cap.tiers.flat())all.push({t:p.wt?'w:'+p.wt:k,p,T})}
  const ab={};for(const x of all)if(x.p.ab)(ab[x.p.ab]=ab[x.p.ab]||[]).push(x.p.id);
  for(const a in ab)ok(ab[a].length===1,'ability '+a+' granted by '+ab[a].join(' and '));
  const sig=p=>JSON.stringify([p.st||{},p.mod||{},p.flag||'',p.ab||'',p.wmod||{},p.res||0,p.regen||0]),by={};for(const x of all)(by[sig(x.p)]=by[sig(x.p)]||[]).push(x);
  for(const s in by){const L=by[s];if(new Set(L.map(x=>x.t)).size<2)continue;const p=L[0].p;if(!p.st&&!p.mod&&!p.flag&&!p.ab&&!p.wmod&&(p.res||p.regen))continue;
   const fab=L.filter(x=>x.T.kind==='fabled');ok(fab.length>=L.length-1&&fab.every(x=>FAB_ECHO.includes(x.p.id)),'the same effect in two trees: '+L.map(x=>x.p.id+' '+x.p.n).join(' | '))}
  const keys={};for(const x of all){if(x.T.kind==='fabled')continue;for(const q of Object.keys(x.p.mod||{}).concat(x.p.flag?['f:'+x.p.flag]:[]))(keys[q]=keys[q]||new Set()).add(x.t)}
  for(const q in keys)if(keys[q].size>1)ok(SHARED[q],'mechanic '+q+' in two trees: '+[...keys[q]].join(', ')+' (not a shared base mechanic)');
  const nm={};for(const x of all)(nm[x.p.n]=nm[x.p.n]||[]).push(x.p.id);for(const n in nm)ok(nm[n].length===1,'the name '+n+' twice: '+nm[n].join(' '));
  for(const n of FT.map(k=>M[k].n))ok(Object.keys(M).filter(k=>M[k].n===n).length===1,'the tree name '+n+' once');
  // the fist trees: none of their keys in any other tree (fabled included), no bare stat perk, no shared base mechanic
  for(const k of FT){const T=M[k];for(const p of T.p.concat(T.cap.tiers.flat())){for(const q of Object.keys(p.mod||{}).concat(p.flag?['f:'+p.flag]:[]).concat(p.ab?['ab:'+p.ab]:[])){
     ok(!SHARED[q],p.id+': '+q+' is a shared base mechanic');
     const others=all.filter(x=>x.t!==k&&(q.startsWith('ab:')?x.p.ab===q.slice(3):q.startsWith('f:')?x.p.flag===q.slice(2):x.p.mod&&x.p.mod[q]!==undefined));ok(!others.length,p.id+': '+q+' also in '+others.map(x=>x.p.id).join())}
    ok(p.ab||p.mod||p.flag,p.id+': a mechanic of its own, not a bare stat')}}
  // and none repeats the Brawler's, the Iron fist's or Iron knuckles' (the older fist perks) by what it does
  const old=['brawler','chi_m'].flatMap(k=>M[k].p.concat(M[k].cap.tiers.flat())).concat([X.perkById('weapons.fist').perk,X.perkById('fist.cap').perk]);
  for(const k of FT)for(const p of M[k].p)for(const q of old){ok(p.ab!==q.ab||!p.ab,p.id+' and '+q.id+': one ability');ok(sig(p)!==sig(q),p.id+' repeats '+q.id)}
  console.log('abilities: '+Object.keys(ab).length+', each granted by one tree; the fist trees\' keys are their own: ok') }
section('the three fist trees: role, tiers, abilities, capstone, icons, texts');
{ const M=X.MAST,AB=X.AB;
  for(const k of FT){const T=M[k];ok(T&&T.kind==='style'&&X.MUNDANE.includes(k)&&T.tiers.length===6&&T.tiers.every((t,i)=>t.length===1&&t[0].id===k+'.'+(i+1)),k+': a style tree, six tiers, ids pinned');
   ok(typeof T.role==='string'&&T.role.length>40&&T.aff.includes('melee')&&T.aff.includes('fist'),k+': its role: '+T.role);const abs=T.p.filter(p=>p.ab).map(p=>p.ab);
   ok(abs.length>=1&&abs.length<=2&&abs.every(a=>AB[a]&&AB[a].n&&AB[a].d&&AB[a].needs==='fist'&&AB[a].fist),k+': one or two fist abilities ('+abs+')');
   const C=T.cap&&T.cap.tiers[0][0];ok(C&&C.id===k+'.cap'&&C.d,k+': a capstone');
   for(const n of ['m-'+k].concat(abs.map(a=>'ab-'+a),T.p.filter(p=>!p.ab).concat([C]).map(p=>'perk-'+p.id))){ok(X.icResolve(n)!=='none'&&X.icResolve(n)===n,'pixel icon (Detail Low) '+n);ok(X.pkHas(n),'painted icon (Detail High) '+n)}
   for(const p of T.p.concat([C])){ok(!/undefined|NaN/.test(p.d)&&p.d.length>20,p.id+': a text');const md=p.mod||{};
    for(const q in md){const v=md[q];if(v>0&&v<1)ok(p.d.includes(Math.round(v*100)+'%'),p.id+': '+q+' '+v+' in its text');else if(v>1)ok(p.d.includes(String(v)),p.id+': '+q+' '+v+' in its text')}}}
  ok(new Set(FT.map(k=>M[k].role)).size===3,'three roles');
  for(const id of ['hipthrow','suplex','onetwo','pflurry','flykick'])ok(AB[id].fx&&/\d/.test(AB[id].d),id+': fx and numbers');
  ok(X.FS_ICONS.length>=30&&X.FS_ICONS.every(n=>X.icResolve(n)!=='none'&&X.pkHas(n)),'FS_ICONS: both details');
  console.log('Wrestler, Pugilist, Willow style: roles, abilities, capstones, '+X.FS_ICONS.length+' icons: ok') }
section('who carries them: backgrounds, pools, cores, recruits, rivals, the Isekai, autoLearn');
{ const G=fresh(SEED+1),B0=X.BG;const CORE={monk:'willow',pitfighter:'wrestle'};
  for(const bg in CORE){ok(B0[bg].core===CORE[bg]&&B0[bg].pool.includes(CORE[bg])&&B0[bg].wt.includes('fist'),bg+': core '+CORE[bg]);for(let i=0;i<20;i++){const m=X.newMerc(bg);ok(m.trees.includes(CORE[bg]),bg+' recruit carries '+CORE[bg])}}
  for(const k of FT){const L=Object.keys(B0).filter(bg=>B0[bg].pool.includes(k));ok(L.length>=5&&L.every(bg=>B0[bg].wt.includes('fist')),k+' in five pools or more, each of a background that trains fists: '+L.join())}
  for(const bg in B0)ok(B0[bg].pool.length<=9&&new Set(B0[bg].pool).size===B0[bg].pool.length,bg+': at most nine trees, none twice');
  for(const k of FT)ok(X.iskStyles().includes(k),'the Isekai creator lists '+k);
  let rv=0;for(const r of G.rivals||[])for(const m of r.roster)if(CORE[m.bg]){rv++;ok(m.trees.includes(CORE[m.bg]),'rival '+m.bg+' carries '+CORE[m.bg])}
  // autoLearn builds into the fist tree with fists in hand, and passes over it with a sword
  for(const [k,w] of [['wrestle','shuko'],['pugilist','wraps'],['willow',null]]){const m=fm('monk',w,[],{trees:[k,'survivor','scout','skirmisher'],a:'robe'});for(let lv=1;lv<=10;lv++){m.lvl=lv;m.pp=1;X.autoLearn(m)}
   ok(m.perks.filter(id=>id.startsWith(k+'.')).length>=3,k+': autoLearn builds into it with fists: '+m.perks.join())}
  const p2=fm('monk','arming',[],{trees:['pugilist','vanguard','survivor','scout']});for(let lv=1;lv<=10;lv++){p2.lvl=lv;p2.pp=1;X.autoLearn(p2)}ok(p2.perks.filter(id=>id.startsWith('pugilist.')).length===0,'… and passes over it with a sword in hand: '+p2.perks.join());
  const p3=fm('monk',null,[],{trees:['willow','vanguard','survivor','scout'],a:'mail'});for(let lv=1;lv<=6;lv++){p3.lvl=lv;p3.pp=1;X.autoLearn(p3)}ok(!p3.perks.includes('willow.1'),'… Willow style\'s perks not in mail: '+p3.perks.join());
  console.log('2 cores, pools, '+rv+' rival monks and pit fighters, the Isekai, autoLearn: ok') }
section('the new mechanics, one by one');
{ fresh(SEED+2);const W1=['wrestle.1','wrestle.2','wrestle.3','wrestle.4','wrestle.5','wrestle.6'],P1=['pugilist.1','pugilist.2','pugilist.3','pugilist.4','pugilist.5','pugilist.6'],L1=['willow.1','willow.2','willow.3','willow.4','willow.5','willow.6'];
  const wr=fm('pitfighter','wraps',W1,{a:'leather'}),pg=fm('monk','wraps',P1),wl=fm('monk',null,L1,{a:'robe'}),sw=fm('monk','arming',P1.concat(W1)),hv=fm('monk',null,L1,{a:'mail'}),plain=fm('monk',null,[],{a:'robe'});
  const {b,P,E,park}=await arena(SEED+3,[wr,pg,wl,sw,hv,plain],['thug','thug','orcw','thug','thug','thug'],'bandit');const [WR,PG,WL,SW,HV,PL]=P,[e1,e2,e3,e4,e5,e6]=E;
  const at=u=>X.abilityInfo(u,'attack'),A=(u,id)=>X.abilityInfo(u,id),hp9=x=>{x.hp=x.hpMax=9999;x.arm=x.armMax;x.fearless=true};
  const nofist=(u,fn)=>{const w=u.wpn;u.wpn=Object.assign({},w,{wt:'sword'});try{return fn()}finally{u.wpn=w}};
  // breath: a foe that never tires keeps a debt of its own (gwind, out of 100) that counts like fatigue; one that tires takes fatigue
  park();b.cur=WR;b.round=3;put(WR,5,8);put(e1,5,7);hp9(e1);ok(e1.fatMax>=999&&!(e1.gwind>0),'a brigand never tires');
  const th0=X.hitChance(WR,e1,at(WR));e1.gwind=80;ok(X.tiredPen(e1)===6&&X.hitChance(WR,e1,at(WR))===Math.min(95,th0+6),'… at 80 breath lost it is tired: −6 defense ('+X.tiredPen(e1)+')');
  e1.gwind=0;let n=0;for(let i=0;i<20&&!(e1.gwind>0);i++){await X.strike(WR,e1,at(WR));n++}ok(e1.gwind===8,'Bear hug: a hit squeezes 8 breath out ('+e1.gwind+')');
  X.pvTurn(e1);ok(e1.gwind===0,'… and it recovers 15 a turn');
  put(e3,6,8);hp9(e3);ok(e3.fatMax<999&&e3.fat===0,'an orc warrior tires');for(let i=0;i<20&&!(e3.fat>0);i++)await X.strike(WR,e3,at(WR));ok(e3.fat===8,'… and takes the breath as fatigue ('+e3.fat+')');
  e3.fat=e3.fatMax-3;await X.ctx.fsWind(e3,8,WR);ok(e3.fat===e3.fatMax,'… never past its maximum');e3.fat=0;
  ok(nofist(WR,()=>X.fsWindOf(WR,e1,at(WR)))===0,'… no breath from a sword blow');
  // Hip throw: 60%, +5, thrown back 2, 12 breath (with Bear hug 20); Grip of iron: 3 tiles
  park();b.cur=WR;put(WR,5,8);put(e1,5,7);hp9(e1);const ht=A(WR,'hipthrow');ok(ht.ap===4&&ht.mult===.6&&ht.kb===2&&ht.hit===5&&X.canUse(WR,ht),'Hip throw: 4 AP, 60%, knocked back 2, +5');
  ok(X.fsWindOf(WR,e1,ht)===20,'… 12 breath and Bear hug\'s 8');ok(X.forecast(WR,e1,ht).kb&&X.forecast(WR,e1,ht).kb.n===2,'… forecast: knocked back 2');
  ok(!X.canUse(SW,A(SW,'hipthrow')),'… not with a sword in hand');F(WR,{wrKb:1});ok(A(WR,'hipthrow').kb===3,'Grip of iron: thrown 3 tiles');F(WR,{wrKb:0});
  e1.gwind=0;WR.ms+=60;WR.ap=9;await X.useAbility(WR,ht,KU(e1));await rest(b);b.busy=true;WR.ms-=60;ok(e1.r===5&&e1.gwind===20,'… thrown to 2 tiles off, 20 breath out ('+e1.r+', '+e1.gwind+')');
  // Grind: +4% a tenth of breath lost, at most +20%
  park();b.cur=WR;put(WR,5,8);put(e1,5,7);e1.gwind=0;const g0=X.dmgBonus(WR,e1,at(WR));e1.gwind=34;ok(near(X.dmgBonus(WR,e1,at(WR))-g0,.12),'Grind: +12% at 34 breath lost');
  e1.gwind=100;ok(near(X.dmgBonus(WR,e1,at(WR))-g0,.2),'… at most +20%');ok(near(nofist(WR,()=>X.dmgBonus(WR,e1,at(WR))),nofist(WR,()=>{const v=e1.gwind;e1.gwind=0;const r=X.dmgBonus(WR,e1,at(WR));e1.gwind=v;return r})),'… only with fists');
  e3.fat=Math.round(e3.fatMax*.62);put(e3,6,8);ok(near(X.dmgBonus(WR,e3,at(WR))-X.dmgBonus(WR,e3,Object.assign({},at(WR))),0)&&X.fsBreath(e3)>.6,'… on a tiring foe its fatigue counts');e3.fat=0;
  // Suplex: stuns past half breath (not one stunned this round or the last), dazes otherwise
  park();b.cur=WR;b.round=5;put(WR,5,8);put(e1,5,7);hp9(e1);const sx=A(WR,'suplex');e1.gwind=40;let fc=X.forecast(WR,e1,sx);
  ok(fc.statuses.some(s=>s.k==='daze'&&s.ch===1)&&!fc.statuses.some(s=>s.k==='stun'),'Suplex: a foe at 40 breath lost is dazed');
  e1.gwind=60;fc=X.forecast(WR,e1,sx);ok(fc.statuses.some(s=>s.k==='stun'&&s.ch===1),'… past half, stunned');e1.wrStR=4;fc=X.forecast(WR,e1,sx);ok(!fc.statuses.some(s=>s.k==='stun')&&fc.statuses.some(s=>s.k==='daze'),'… not one stunned the round before');
  e1.wrStR=null;WR.ms+=60;WR.ap=9;e1.st={};await X.useAbility(WR,sx,KU(e1));await rest(b);b.busy=true;WR.ms-=60;ok(e1.st.stun>0&&e1.wrStR===5,'… stunned, and the round kept');
  // Smother: 8 breath from every foe next to you at your turn's start
  park();b.cur=WR;put(WR,5,8);put(e1,5,7);put(e2,6,8);put(e4,5,5);for(const x of [e1,e2,e4])x.gwind=0;X.pvTurn(WR);ok(e1.gwind===8&&e2.gwind===8&&!(e4.gwind>0),'Smother: the two foes next to you lose 8');
  // Breaking hold: past three quarters, a 35% stun
  park();b.round=7;put(WR,5,8);put(e1,5,7);e1.gwind=80;fc=X.forecast(WR,e1,at(WR));ok(fc.statuses.some(s=>s.k==='stun'&&near(s.ch,.35)),'Breaking hold: 35% stun past three quarters '+JSON.stringify(fc.statuses));
  e1.gwind=70;ok(!X.forecast(WR,e1,at(WR)).statuses.some(s=>s.k==='stun'),'… not below');e1.gwind=0;
  // Snap jab, Loose shoulders: a punch costs 1 AP less (at least 2) and half its fatigue; recovery 5 more a turn
  park();b.cur=PG;put(PG,5,8);put(e1,5,7);hp9(e1);const pa=at(PG);ok(pa.ap===3&&pa.fat===Math.floor(X.ITEMS.wraps.fat*.5),'Snap jab and Loose shoulders: wraps punch for 3 AP (no less), '+pa.fat+' fatigue');{const w0=PG.wpn;PG.wpn=X.calc(fm('monk',null,[])).wpn;ok(at(PG).ap===3,'… bare fists: 4 AP -> 3');PG.wpn=w0}
  ok(A(PG,'onetwo').ap===3&&A(PG,'pflurry').ap===4&&A(PG,'onetwo').fat===5&&A(PG,'pflurry').fat===7,'… One-two 3 AP, Flurry of blows 4');ok(at(PL).ap===4&&at(SW).ap===X.ITEMS.arming.ap,'… bare fists without it: 4, a sword untouched');
  PG.fat=30;PG.ap=PG.apMax;X.pvTurn(PG);ok(PG.fat===25,'… 5 more fatigue recovered at the turn\'s start');PG.fat=0;
  // One-two: two punches; Flurry of blows: four (five with Thousand fists); Double jab: an Attack is followed by a 35% punch
  park();b.cur=PG;put(PG,5,8);put(e1,5,7);hp9(e1);PG.ap=12;let hits=await hitsOn(e1,async()=>{PG.ms+=80;await X.useAbility(PG,A(PG,'onetwo'),KU(e1));await rest(b);b.busy=true;PG.ms-=80});ok(hits===2,'One-two: two punches ('+hits+')');
  PG.ap=12;hits=await hitsOn(e1,async()=>{PG.ms+=80;await X.useAbility(PG,A(PG,'pflurry'),KU(e1));await rest(b);b.busy=true;PG.ms-=80});ok(hits===4,'Flurry of blows: four ('+hits+')');
  F(PG,{pgFlurry:1});ok(A(PG,'pflurry').hits===5,'Thousand fists: a fifth');F(PG,{pgFlurry:0});
  let atk=0;const on0=X.FX.on;X.FX.on=(ty,d)=>{if((ty==='hit'||ty==='miss')&&d.t===e1&&d.u===PG)atk++;if(on0)on0(ty,d)};PG.ap=12;await X.useAbility(PG,at(PG),KU(e1));await rest(b);b.busy=true;X.FX.on=on0;ok(atk===2,'Double jab: the Attack and its second punch ('+atk+')');
  const fd=X.forecast(PG,e1,at(PG),{splash:.3,free:'double'}),fp=X.forecast(PG,e1,at(PG));ok(fd.dmgMax<fp.dmgMax&&fd.dmgMax>=Math.floor(fp.dmgMax*.3)-1,'… forecast at 30% ('+fd.dmgMax+' of '+fp.dmgMax+')');
  // Rapid hands: an Attack that kills gives its AP back, once a turn
  park();b.cur=PG;put(PG,5,8);put(e1,5,7);put(e2,6,8);for(const x of [e1,e2]){x.hp=1;x.arm=0;x.helm=0}PG.ms+=90;PG.ap=6;PG.pgKT=0;await X.useAbility(PG,at(PG),KU(e1));await rest(b);b.busy=true;
  ok(!e1.alive&&PG.ap===6,'Rapid hands: the kill gives the 3 AP back ('+PG.ap+')');await X.useAbility(PG,at(PG),KU(e2));await rest(b);b.busy=true;PG.ms-=90;ok(!e2.alive&&PG.ap===3,'… once a turn ('+PG.ap+')');
  // Empty hands (+6, +4 more bare), Hard to pin (+2 a tile moved, at most +10): defense in light armor with fists only
  park();b.cur=e1;put(WL,5,8);put(PL,7,8);put(HV,9,8);put(e1,5,7);put(e2,7,7);put(e4,9,7);const ea=at(e1);
  const h0=X.hitChance(e1,PL,at(e1)),hw=X.hitChance(e1,WL,ea);ok(WL.aw<=2&&PL.aw===WL.aw,'a robe weighs nothing');
  {const f0=WL.flags;WL.flags=Object.assign({},f0,{wlDef:0,wlBare:0,wlStep:0});const hb=X.hitChance(e1,WL,ea);WL.flags=f0;ok(hw===Math.max(5,hb-12),'Empty hands: −12 to hit you, bare-chested ('+hb+' -> '+hw+')');
   WL.mvN=3;ok(X.hitChance(e1,WL,ea)===Math.max(5,hb-21),'Hard to pin: −9 after 3 tiles');WL.mvN=9;ok(X.hitChance(e1,WL,ea)===Math.max(5,hb-24),'… at most −12');WL.mvN=0;
   const s0=WL.wpn;WL.wpn=X.calc(fm('monk','arming',[])).wpn;ok(X.hitChance(e1,WL,ea)===X.hitChance(e1,WL,ea)&&X.fsHit(e1,WL,ea,true)===0,'… nothing with a sword');WL.wpn=s0}
  ok(HV.acl!=='light'&&X.fsHit(e1,HV,ea,true)===0,'… nothing in mail');
  // Turn the blow: 15% off melee blows in light armor with fists
  ok(near(X.fsDr(e1,WL,ea),.15)&&near(X.fsDr(e1,HV,ea),0),'Turn the blow: 15% in light armor, none in mail');put(e5,5,2);ok(near(X.fsDr(e5,WL,Object.assign({},ea,{melee:0})),.15)&&near(X.fsDr(e5,WL,{magic:[10,20]}),0),'… from a shot too, not from a spell');
  // Slip away: leaving a foe's side draws no free attack
  park();b.cur=WL;put(WL,5,8);put(e1,5,7);put(PL,8,8);put(e2,8,7);WL.slipT=1;PL.slipT=1;let fa=0;const fr0=X.ctx.freeAttack;X.ctx.freeAttack=async function(e,u,w){if(u===WL||u===PL)fa++;return fr0(e,u,w)};
  WL.ap=9;await X.walkPath(WL,[KU({c:4,r:8})]);ok(fa===0&&WL.c===4,'Slip away: stepped from the foe\'s side, no free attack');PL.ap=9;b.cur=PL;e2.aoo=0;await X.walkPath(PL,[KU({c:9,r:8})]);X.ctx.freeAttack=fr0;ok(fa===1,'… a monk without it draws one ('+fa+')');
  // Wind step: +1 AP on a turn begun with no foe next to you
  park();b.cur=WL;put(WL,2,10);WL.ap=WL.apMax;X.pvTurn(WL);ok(WL.ap===WL.apMax+1,'Wind step: +1 AP alone');put(e1,2,9);WL.ap=WL.apMax;X.pvTurn(WL);ok(WL.ap===WL.apMax,'… none with a foe beside');
  // Flying kick: a dash of 3 tiles, +10, no free attacks on the way; Willow in the storm: 4
  park();b.cur=WL;put(WL,5,10);put(e1,5,7);put(e2,6,10);const fk=A(WL,'flykick');ok(fk.rng===3&&fk.dash&&fk.hit===10&&X.validTargets(WL,fk).has(KU(e1)),'Flying kick: reaches a foe 3 tiles away');
  F(WL,{wlKick:1});ok(A(WL,'flykick').rng===4,'Willow in the storm: 4 tiles');F(WL,{wlKick:0});
  fa=0;X.ctx.freeAttack=async function(e,u,w){if(u===WL)fa++;return fr0(e,u,w)};WL.ap=9;await X.useAbility(WL,fk,KU(e1));await rest(b);b.busy=true;X.ctx.freeAttack=fr0;ok(X.mdist(WL,e1)===1&&fa===0,'… lands beside the foe, no free attack from the one it left');ok(WL.mvN===2,'… and the 2 tiles leapt count for Hard to pin ('+WL.mvN+')');
  // the fist weapons: hand hooks squeeze breath; tiger claws bleed; knuckle-dusters and gauntlets stun; every one counts as fists
  for(const id of FW){const it=X.ITEMS[id];ok(it&&it.k==='w'&&it.wt==='fist'&&!it.two&&!it.glad&&X.isFistW(it)&&X.isLightW(it),id+': a fist weapon')}
  {const hk=fm('monk','shuko',[]),cl=fm('monk','baghnakh',[]),kn=fm('monk','knuckles',[]);const {b:b2,P:Q,E:E2,park:pk2}=await arena(SEED+4,[hk,cl,kn],['thug','thug','thug']);pk2();const [HK,CL,KN]=Q;
   b2.cur=HK;put(HK,5,8);put(E2[0],5,7);ok(X.fsWindOf(HK,E2[0],at(HK))===6,'Hand hooks: 6 breath a hit');
   put(CL,8,8);put(E2[1],8,7);E2[1].arm=0;E2[1].helm=0;ok(X.forecast(CL,E2[1],at(CL)).statuses.some(s=>s.k==='bleed'),'Tiger claws: bleeding');
   put(KN,11,8);put(E2[2],11,7);ok(X.forecast(KN,E2[2],at(KN)).statuses.some(s=>s.k==='stun'&&near(s.ch,.1)),'Knuckle-dusters: a 10% stun');X.B=null;X.mode='world'}
  X.B=null;X.mode='world';console.log('breath (gwind and fatigue), Bear hug, Hip throw, Grip of iron, Grind, Suplex, Smother, Breaking hold, Snap jab, Loose shoulders, One-two, Flurry of blows, Thousand fists, Double jab, Rapid hands, Empty hands, Hard to pin, Turn the blow, Slip away, Wind step, Flying kick, Willow in the storm, the fist weapons: ok') }
section('forecast == strike: forced strikes with the fist trees (double jabs, throws, suplexes, kicks and the fist weapons)');
{ fresh(SEED+5);const ALL=ALLP().concat(FT.map(k=>k+'.cap'),['weapons.fist','fist.cap','brawler.4','brawler.6']);
  const kit=[['monk',null,{a:'robe'}],['monk','wraps',{a:'robe'}],['pitfighter','shuko',{a:'leather'}],['pitfighter','gauntlet',{a:'jack'}],['monk','katar',{a:'robe'}],
   ['pitfighter','knuckles',{a:'leather'}],['monk','baghnakh',{a:'padded'}],['pitfighter','cestus',{a:'mail'}]];
  const ros=kit.map(([bg,w,o])=>{const m=fm(bg,w,ALL,o);m.lvl=12;m.deeds={dungeon:1,bane:1};return m});
  const {b,P,E,park}=await arena(SEED+6,ros,['thug','braid','orcw','bgun','samurai','ashi']);
  // the foes carry the defender's side of the trees too (Empty hands, Hard to pin, Turn the blow) and Breaking hold / Grind on their blows
  for(const u of E){u.flags=Object.assign({},u.flags);for(const id of ['willow.1','willow.3','willow.5','wrestle.1','wrestle.3','wrestle.6'])for(const k in X.perkById(id).perk.mod)u.flags[k]=(u.flags[k]||0)+X.perkById(id).perk.mod[k];u.acl='light'}X.auraScan();
  const ABS=['attack','attack','attack','hipthrow','suplex','onetwo','pflurry','flykick','shove'];FCHECK=true;FS.n=0;FS.byAb={};let tries=0;const U=b.units;
  while(FS.n<(QUICK?1500:3200)&&tries++<40000){park();for(const u of U){u.fearless=false;u.used={}}const u=pick(U.filter(x=>x.alive&&x.side===0)),t=pick(U.filter(x=>x.alive&&x.side!==u.side));
   const id=pick(ABS);if(id!=='attack'&&!u.abs.includes(id))continue;const a=X.abilityInfo(u,id);if(!a)continue;
   put(u,6,6);put(t,6,a.dash&&R()<.5?3:5);
   for(const x of U)if(x!==u&&x!==t){x.c=1+Math.floor(R()*14);x.r=1+Math.floor(R()*10);if(X.unitAt(x.c,x.r)!==x||(x.c===6&&x.r<=6&&x.r>=1)){x.c=15;x.r=11-(x.id%3)}}
   if(R()<.5){const o=pick(U.filter(x=>x!==u&&x!==t&&x.side===t.side));if(o&&!X.unitAt(7,t.r))put(o,7,t.r)}   // a body behind or beside: knockback slams
   if(R()<.4){const o=pick(U.filter(x=>x!==u&&x!==t&&x.side!==u.side));if(o&&!X.unitAt(6,t.r-1)&&t.r>0)put(o,6,t.r-1)}
   b.cur=u;b.round=6;u.mvd=R()<.5?1:0;t.mvd=R()<.5?1:0;u.mvN=Math.floor(R()*5);t.mvN=Math.floor(R()*6);t.mor=pick([1,2,3,3,4]);
   const br=pick([0,0,30,55,60,80,95]);if(t.fatMax<999)t.fat=Math.round(t.fatMax*br/100);else t.gwind=br;u.gwind=pick([0,0,70]);t.wrStR=R()<.25?5:null;
   if(R()<.3)t.arm=Math.floor(t.armMax*R());if(R()<.3)t.hp=Math.max(1,Math.floor(t.hpMax*R()));if(R()<.3&&t.shpMax>0)t.shield=true;
   X.foeAuras();X.auraScan();u.ap=12;if(!X.canUse(u,a))continue;const k=KU(t);if(!X.validTargets(u,a).has(k))continue;await X.useAbility(u,a,k);b.busy=true}
  FCHECK=false;ok(FS.n>=(QUICK?1200:3000),'forced strikes: '+FS.n+' (tries '+tries+')');for(const id of ['attack','hipthrow','suplex','onetwo','pflurry','flykick'])ok(FS.byAb[id]>(QUICK?10:30),'strikes with '+id+': '+FS.byAb[id]);
  ok((FS.st.stun||0)>5&&(FS.st.daze||0)>5,'stuns and dazes landed and were forecast '+JSON.stringify(FS.st));
  X.B=null;X.mode='world';console.log(FS.n+' strikes, '+FS.hits+' hits '+JSON.stringify(FS.byAb)+', statuses '+JSON.stringify(FS.st)+': forecast == strike: ok') }
section('the AI uses them: the company on auto, a rival company of fist fighters');
{ const use={},u0=X.ctx.useAbility;X.ctx.useAbility=async function(u,a,k){const s=(u.side?'rv:':'')+a.id;use[s]=(use[s]||0)+1;return u0(u,a,k)};
  const kit=[['pitfighter','shuko','wrestle','leather'],['monk','wraps','pugilist','robe'],['monk',null,'willow','robe'],['pitfighter','gauntlet','wrestle','jack'],['monk','katar','pugilist','padded'],['monk','knuckles','willow','robe']];
  const crew=(i,n)=>{const L=[];for(let j=0;j<n;j++){const [bg,w,k,a]=kit[(i+j)%kit.length],m=fm(bg,w,[],{trees:[k,'survivor','skirmisher','brawler'],a});X.gainXP(m,X.XPT[10]);m.pend=0;m.perks=[];for(let lv=1;lv<=10;lv++){m.lvl=lv;m.pp=1;X.autoLearn(m)}m.hp=X.calc(m).hp;L.push(m)}return L};
  const NB=QUICK?3:6;let wins=0;
  for(let i=0;i<NB;i++){const G=fresh(SEED+30+i);G.roster.length=0;G.roster.push(...crew(i,6));for(const m of G.roster){const t=m.trees[0];ok(m.perks.filter(id=>id.startsWith(t+'.')).length>=4,m.bg+' builds into '+t+': '+m.perks.join())}FCHECK=true;
   const res=await X.autoBattle({f:['bandit','bandit','orc','gob','bandit','free'][i],mult:.75,biome:'plains',pilot:'sensible',src:{type:'test'},turnCap:4000});FCHECK=false;ok(res&&!res.stuck,'an auto battle ended');if(res.win)wins++;X.B=null;X.mode='world'}
  for(let i=0;i<(QUICK?2:3);i++){const G=fresh(SEED+60+i);const r=(G.rivals||[])[0];ok(r,'a rival company');r.roster=crew(i+2,6).map((m,j)=>Object.assign(m,{field:true,slot:{row:j%2,col:4+j}}));
   G.roster.forEach(m=>{m.perks=[];for(let lv=1;lv<=10;lv++){m.lvl=lv;m.pp=1;X.autoLearn(m)}});FCHECK=true;const res=await X.autoBattle({rival:r.id,f:r.id,mult:1,biome:'plains',pilot:'sensible',src:{type:'test'},turnCap:4000});FCHECK=false;ok(res&&!res.stuck,'a rival battle ended');X.B=null;X.mode='world'}
  X.ctx.useAbility=u0;console.log('AI over '+NB+' battles ('+wins+' won) and the rival battles: '+JSON.stringify(use));
  ok(['hipthrow','suplex','onetwo','pflurry','flykick'].filter(id=>(use[id]||0)+(use['rv:'+id]||0)>0).length>=4,'the AI uses the new abilities in battle');
  ok(['hipthrow','suplex','onetwo','pflurry','flykick'].some(id=>use['rv:'+id]>0),'… rivals too');
  // and each one where it is at its best: the AI (aiTurn2) picks it
  { fresh(SEED+80);const tn0=X.ctx.nextTurn;const seen={};const u1=X.ctx.useAbility;X.ctx.useAbility=async function(u,a,k){if(u.side===0)seen[a.id]=(seen[a.id]||0)+1;return u1(u,a,k)};
   const cases=[['hipthrow',['pitfighter','wraps',['wrestle.1','wrestle.2']],(P,E)=>{P.forEach((u,i)=>{put(u,1+i*4,10);u.ap=4});E.forEach((e,i)=>{put(e,1+i*4,9);put(E[i],1+i*4,9)})}],
    ['suplex',['pitfighter','wraps',['wrestle.1','wrestle.2','wrestle.3','wrestle.4']],(P,E)=>{P.forEach((u,i)=>put(u,1+i*4,10));E.forEach((e,i)=>{put(e,1+i*4,9);e.gwind=70})}],
    ['onetwo',['monk','wraps',['pugilist.2']],(P,E)=>{P.forEach((u,i)=>put(u,1+i*4,10));E.forEach((e,i)=>put(e,1+i*4,9))}],
    ['pflurry',['monk','wraps',['pugilist.1','pugilist.3','pugilist.5']],(P,E)=>{P.forEach((u,i)=>{put(u,1+i*4,10);u.ap=5});E.forEach((e,i)=>{put(e,1+i*4,9);e.arm=0;e.helm=0})}],
    ['flykick',['monk','katar',['willow.1','willow.2']],(P,E)=>{P.forEach((u,i)=>{put(u,1+i*4,11);u.ap=4});E.forEach((e,i)=>put(e,1+i*4,8))}]];
   for(const [id,[bg,w,perks],place] of cases){const ros=[0,1,2,3].map(()=>fm(bg,w,perks,{a:'robe'}));const {b,P,E,park}=await arena(SEED+81,ros,['thug','thug','thug','thug']);park();
    for(const u of P){u.used={};u.ap=u.apMax}for(const e of E){e.hp=e.hpMax=Math.max(e.hpMax,150);e.shield=false}place(P,E);X.foeAuras();X.auraScan();X.ctx.nextTurn=async function(){};
    for(const u of P){if(!u.alive)continue;b.cur=u;await X.aiTurn2(u);b.busy=true}X.ctx.nextTurn=tn0;ok(seen[id]>0,'the AI uses '+id+' where it fits: '+JSON.stringify(seen));X.B=null;X.mode='world'}
   X.ctx.nextTurn=tn0;X.ctx.useAbility=u1;console.log('the AI picks each where it fits: '+JSON.stringify(seen)) } }
section('saves: the PKV 3 refit (a monk\'s or pit fighter\'s lost tree traded for a fist tree, its points back; the gun refit not run twice)');
{ const G=fresh(SEED+70);const a=X.newMerc('monk'),p=X.newMerc('pitfighter'),s=X.newMerc('musketeer'),c=X.newMerc('acrobat');G.roster.push(a,p,s,c);a.name='Monk Amar';p.name='Pit Pell';s.name='Musket Sorn';c.name='Tumbler Cass';   // names of their own: the sheet lists refunds by name
  a.lvl=8;a.trees=['scout','bulwark','willow','survivor'];a.perks=['scout.1','scout.2','bulwark.1','willow.1','survivor.1'];a.pp=0;
  p.lvl=6;p.trees=['wrestle','vanguard','brawler','survivor'];p.perks=['vanguard.1','brawler.1'];p.pp=1;
  s.lvl=6;s.trees=['gunner','survivor','scout','skirmisher'];s.perks=['gunner.1','gunner.3','survivor.1'];s.pp=0;   // a pkv 2 save: Musketry's changed tiers were refunded already
  c.lvl=5;c.trees=['shadow','brawler','duelist','rogue'];c.perks=['brawler.1','brawler.2','shadow.1'];c.pp=0;
  X.mode='world';ok(X.save(),'save');const g=JSON.parse(X.store.get(X.SAVEKEY));ok(g.pkv===X.PKV&&X.PKV===3,'a save carries the perk version 3');g.pkv=2;delete g.refund;delete g.refundWhy;g.note=null;
  X.store.set(X.SAVEKEY,JSON.stringify(g));const r=X.readSave();ok(r.state==='ok'&&r.g.pkv===X.PKV&&r.g.v===X.SAVEVER,'a pkv 2 save loads, refit, same save version');
  const by=id=>r.g.roster.find(q=>q.id===id),A2=by(a.id),P2=by(p.id),S2=by(s.id),C2=by(c.id);
  ok(A2.trees.join()==='wrestle,pugilist,willow,survivor'&&A2.perks.join()==='willow.1,survivor.1'&&A2.pp===3,'the monk trades Scout and Bulwark for the Wrestler and the Pugilist, 3 points back: '+A2.trees+' '+A2.perks+' pp '+A2.pp);
  ok(P2.trees.join()==='wrestle,pugilist,brawler,survivor'&&P2.perks.join()==='brawler.1'&&P2.pp===2,'the pit fighter trades the Vanguard: '+P2.trees+' pp '+P2.pp);
  ok(S2.perks.join()==='gunner.1,gunner.3,survivor.1'&&S2.pp===0,'the gun refit does not run again on a pkv 2 save: '+S2.perks);
  ok(C2.trees.includes('willow')&&!C2.trees.includes('brawler')&&C2.perks.join()==='shadow.1'&&C2.pp===2,'the tumbler trades the Brawler for Willow style: '+C2.trees);
  ok(r.g.refundWhy==='fists'&&r.g.note==='refund'&&r.g.refund.some(x=>x.name===a.name&&x.n===3),'the one-time sheet: '+JSON.stringify(r.g.refund));
  X.G=null;X.mode='title';X.continueGame();closeAll(X);ok(X.mode==='world'&&X.G.pkv===X.PKV,'the refit save loads');let html='';const sh0=X.ctx.sheet;X.ctx.sheet=h=>{html=h};X.G.refund=[{name:'A',n:1}];X.G.refundWhy='fists';X.refundSheet();X.ctx.sheet=sh0;
  ok(/Wrestler/.test(html)&&/Willow style/.test(html),'the sheet says why');
  ok(X.save(),'save again');const r2=X.readSave();ok(by(a.id).perks.join()===r2.g.roster.find(q=>q.id===a.id).perks.join(),'… and refit once only');
  // an older save still gets the gun refit (and the fist one with it)
  const g1=JSON.parse(X.store.get(X.SAVEKEY));delete g1.pkv;const m1=g1.roster.find(q=>q.id===s.id);m1.perks=['gunner.1','survivor.1'];m1.pp=0;X.store.set(X.SAVEKEY,JSON.stringify(g1));const r3=X.readSave();
  ok(r3.g.roster.find(q=>q.id===s.id).perks.join()==='survivor.1'&&r3.g.refundWhy==='guns','… a save older than both: the gun refit too');
  console.log('PKV '+X.PKV+': trees traded, points back, the sheet, once only, the gun refit kept to older saves: ok') }
/* ---- role sims: one background (the pit fighter's) for every squad of four, all six tiers of its tree and its weapon (the fist trees: hand hooks;
   the others: theirs), light hide armor; the squads played by the company's AI, the foes by theirs, repeated over seeds. Each fist tree best in
   its own setting:
     brawl     one company turn, the squad rooted beside four brigands (shields down): damage dealt (hitpoints and armor)   the Pugilist
     boss      four rounds around an orc warlord (it tires; its hitpoints raised so nobody kills it): damage taken           the Wrestler
     hold      three rounds in the press of four orc warriors (they hit hard, and there are four of them): damage taken    Willow style
   and the fist trees not stronger than the other melee families: over those three settings and a fourth, neutral one (skirmish: three
   rounds against archers and crossbowmen behind two thugs), the best fist tree's mean (dealt − taken) is no better than the best of the
   Vanguard, the Duelist and the Brute.
   Then the weapons themselves: every one-handed melee weapon of a tier swung (Attack only) for two turns at the tier's foes; the best fist
   weapon of each tier does 0.7 to 1.15 times the best dagger, sword, mace or axe of the tier, with and without its weapon mastery. */
section('role sims: each fist tree best in its own setting; fists no stronger than the other melee families');
{ const NS=QUICK?5:10,TR={wrestle:'shuko',pugilist:'shuko',willow:'shuko',vanguard:'arming',duelist:'arming',brute:'greatsword'},res={};
  const squad=k=>[0,1,2,3].map(()=>{const m=fm('pitfighter',TR[k],X.MAST[k].p.map(p=>p.id),{trees:[k,'survivor','scout','skirmisher'],a:'hide'});m.traits=[];m.hp=X.calc(m).hp;return m});
  const sum=L=>L.reduce((s,e)=>s+(e.alive?e.hp+e.arm+(e.helm||0):0),0);
  const SET={brawl:{foes:['thug','thug','thug','thug'],rounds:0,place:(P,E)=>{P.forEach((u,i)=>put(u,3+i*3,9));E.forEach((e,i)=>{put(e,3+i*3,8);e.shield=false})}},
   boss:{foes:['orcl'],rounds:4,place:(P,E)=>{P.forEach((u,i)=>put(u,[6,8,7,7][i],[9,9,8,10][i]));put(E[0],7,9);E[0].hp=E[0].hpMax=1500}},
   skirmish:{foes:['bmark','bxbow','bmark','bxbow','thug','thug'],rounds:3,place:(P,E)=>{P.forEach((u,i)=>put(u,3+i*3,10));E.forEach((e,i)=>put(e,1+i*2+(i>3?1:0),i<4?5:6))}},
   hold:{foes:['orcw','orcw','orcw','orcw'],rounds:3,place:(P,E)=>{P.forEach((u,i)=>put(u,3+i*3,9));E.forEach((e,i)=>put(e,3+i*3,8))}}};
  const tn0=X.ctx.nextTurn;
  for(const sk in SET){res[sk]={};const S=SET[sk];
   for(const k in TR){fresh(SEED+90);let D=0,Tk=0;
    for(let n=0;n<NS;n++){const {b,P,E,park}=await arena(SEED+100+n,squad(k),S.foes);park();for(const e of E){e.hp=e.hpMax=Math.max(e.hpMax,120);e.fearless=true;e.mvd=0}S.place(P,E);
     for(const u of P){u.used={};u.fearless=true}X.foeAuras();X.auraScan();const e0=sum(E),p0=sum(P);
     if(!S.rounds){X.ctx.nextTurn=async function(){};for(const u of P){if(!u.alive||b.over)continue;b.cur=u;u.ap=u.apMax;u.mvd=0;X.pvTurn(u);u.rooted=true;await X.aiTurn2(u);b.busy=true}X.ctx.nextTurn=tn0}
     else{b.order=[];b.cur=null;b.opts.turnCap=b.turns+S.rounds*(P.length+E.length);b.auto=true;b.busy=false;X.nextTurn();let g=0;while(!b.over){await null;if(++g>5e6)fail('a sim never ended')}}
     D+=e0-sum(E);Tk+=p0-sum(P);X.B=null;X.mode='world'}
    res[sk][k]={d:Math.round(D/NS),t:Math.round(Tk/NS),n:Math.round((D-Tk)/NS)}}
   console.log('  '+sk.padEnd(9)+Object.entries(res[sk]).map(([k,v])=>(X.MAST[k].n+' '+v.d+'/'+v.t).padEnd(22)).join('')+'  (dealt/taken)')}
  const R=res,f=k=>X.MAST[k].n;
  ok(R.brawl.pugilist.d>1.15*Math.max(R.brawl.wrestle.d,R.brawl.willow.d),'the brawl: the Pugilist deals the most '+JSON.stringify(R.brawl));
  ok(R.boss.wrestle.t<.8*Math.min(R.boss.pugilist.t,R.boss.willow.t),'the boss: the Wrestler takes the least '+JSON.stringify(R.boss));
  ok(R.hold.willow.t<.8*Math.min(R.hold.pugilist.t,R.hold.wrestle.t),'the press of orc warriors: Willow style takes the least '+JSON.stringify(R.hold));
  const mean=k=>Object.keys(SET).reduce((s,sk)=>s+R[sk][k].n,0)/Object.keys(SET).length,bf=Math.max(...FT.map(mean)),bo=Math.max(...['vanguard','duelist','brute'].map(mean));
  console.log('  mean dealt − taken: '+Object.keys(TR).map(k=>f(k)+' '+Math.round(mean(k))).join(', '));
  ok(bf<=bo+Math.abs(bo)*.1,'fists no stronger than the other melee families: best fist tree '+Math.round(bf)+', best of the others '+Math.round(bo)) }
{ const NT=QUICK?8:20,FAM=['fist','dagger','sword','mace','axe'],MS={1:50,2:55,3:62,4:68,5:75},TGT={1:['thug','gob'],2:['skel','bxbow'],3:['orcw','braid'],4:['samurai','barbhus'],5:['vknight','orcl']};
  const MP={fist:'weapons.fist',dagger:'weapons.dagger',sword:'weapons.sword',mace:'weapons.mace',axe:'weapons.axe'};
  fresh(SEED);const on0=X.FX.on;X.FX.on=null;const W=Object.keys(X.ITEMS).filter(id=>{const i=X.ITEMS[id];return i.k==='w'&&FAM.includes(i.wt)&&!i.two&&!i.uniq&&!i.famed&&!i.legend&&!i.glad&&!i.east&&i.price>0}),R={};
  for(const id of W){const it=X.ITEMS[id],T=it.tier||1;for(const mast of [0,1]){let dmg=0;
    for(const tid of TGT[T]){const m=fm('pitfighter',id,mast?[MP[it.wt]]:[],{a:'padded'});const {b,P,E,park}=await arena(SEED+7,[m],[tid]);park();const u=P[0],t=E[0];u.ms=MS[T];
     for(const x of E)if(x!==t){x.alive=false;x.gone='fled';x.c=-9;x.r=-9}put(u,7,8);put(t,7,7);X.seedRng(SEED+T*13+tid.length);
     for(let n=0;n<NT;n++){t.alive=true;t.hpMax=t.hp=5000;t.arm=t.armMax;t.helm=t.helmMax;t.st={};t.mor=3;t.fearless=true;t.gwind=0;u.st={};u.used={};let D=0;
      for(let k=0;k<2;k++){u.ap=u.apMax;u.fat=0;u.mvd=0;X.pvTurn(u);for(let g=0;g<12;g++){const a=X.abilityInfo(u,'attack');if(!X.canUse(u,a))break;const v0=t.hp+t.arm+(t.helm||0);b.busy=false;await X.useAbility(u,a,KU(t));b.busy=true;D+=v0-t.hp-t.arm-(t.helm||0)}}
      dmg+=D/NT/TGT[T].length}X.B=null;X.mode='world'}
    (R[T+'|'+mast]=R[T+'|'+mast]||[]).push({id,wt:it.wt,dmg})}}
  X.FX.on=on0;let nt=0;
  for(let T=1;T<=5;T++)for(const mast of [0,1]){const L=R[T+'|'+mast]||[],bf=L.filter(r=>r.wt==='fist').sort((a,b)=>b.dmg-a.dmg)[0],bo=L.filter(r=>r.wt!=='fist').sort((a,b)=>b.dmg-a.dmg)[0];if(!bf||!bo)continue;nt++;const k=bf.dmg/bo.dmg;
   console.log(`  tier ${T}${mast?' (mastery)':''}: best fist ${bf.id} ${bf.dmg.toFixed(1)}, best other ${bo.id} ${bo.dmg.toFixed(1)} (x${k.toFixed(2)})`);ok(k>=.7&&k<=1.15,`tier ${T}${mast?' with the mastery':''}: the best fist weapon x${k.toFixed(2)} of the best other one-handed melee weapon, outside 0.7..1.15`)}
  ok(nt>=8,'fist weapons in tiers 1 to 4');console.log('fist weapons within 0.7..1.15 of their tier: ok') }
console.log('\nOK fists');process.exit(0)})();
