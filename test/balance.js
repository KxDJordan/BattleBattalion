// Balance harness and the phase-5 done-criterion.   node test/balance.js [--n N] [--quick] [--jobs J] [--seed S]
//                                                      [--only fac,fac] [--prof id,id] [--no-abl] [--no-cross] [--boss] [--json file]
//                                                      [--set "JS statement"] [--src 63-ai.js=/other/file.js] [--srcdir dir] (tuning and A/B runs)
// Loads src/*.js like test/headless.js (vm context, DOM stubs), then fights N seeded battles per cell:
//   faction x company profile x pilot ('naive' = AI_NAIVE, 'sensible' = AI_SENSIBLE, chosen through B.opts.pilot).
// An "even fight" is what the game itself generates for that company at mult 1 (startBattle's budget x BUDGETK).
// Both pilots get the same companies, maps and enemy warbands (same seed per battle index).
// Prints: the balance table, the tactic ablation table (each faction's answer removed from the sensible pilot),
// the plan-against-faction matrix, and the AI's measured decision cost. Exits non-zero when
//   overall naive >= 50% or overall sensible <= 80%, or any faction has naive > 65% or sensible < 65%.
// Monsters update: the mid-game monster factions (MONF) are fought only at the profiles where the game lets them roam (factionPool at the
// profile's companyPower and day) and must also average naive < 50% and sensible > 80% there; mean battle length must stay under 12.5
// rounds. The wyvern (end-game) is a table of its own: a lone wyvern at L8x9 and L12x12 (--no-wyvern skips it); a sensible L12x12
// company must win 45..80% and a naive one at most 30%.
// Rivals update: a rival mercenary company of the same profile (another of the profile's companies, its own formation and gear, played
// by the rival AI: aiRun with AI_RIVAL's plan) at every profile (--no-rival skips it; --only rival runs only it). The sensible pilot
// must win 55..75% overall against an equal rival (they are as good as you), and the naive pilot less than the sensible.
// Solo update: the Solo (Beast Slayer) origin's one sword at levels 3, 6 and 9 (SOLO) against beasts, serpents and ogres, its quarry perks readied
// for the faction (QPLAN, open tiers only) and typical tallies; a table of its own with a 95% interval, reported, not judged (--no-solo skips it;
// --only solo runs only it; --ns N battles a cell; tuning: --sprof S3,S9 --sfac ogre --sens-only). KSOLO slayers per profile.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),os=require('os');
const ARGV=process.argv.slice(2),arg=(k,d)=>ARGV.includes(k)?ARGV[ARGV.indexOf(k)+1]:d,has=k=>ARGV.includes(k);
const SRC=ARGV.includes('--srcdir')?path.resolve(ARGV[ARGV.indexOf('--srcdir')+1]):path.join(__dirname,'..','src'),SEED=+arg('--seed',20261113),TURNCAP=4000;
const FACS=['gob','undead','beast','orc','bandit','void'],MONF=['serpent','ent','ogre'],BIOMES=['plains','forest','hills','swamp','desert','snow'],KCOMP=8,KSOLO=40;   // companies per profile; slayers per solo profile (one sword: its rolled stats, traits and trees weigh more)
/* ---------- company profiles ---------- */
// role -> level-up stat picks and gear by tier [L4, L8, L12] (b: the sidearm). Perks are spent by the game's own autoLearn(m)
// on the trees the merc rolled from its background pool, after the gear is on (autoLearn reads the weapons and the shield).
const ROLES={
 tank:{st:['hp','ms','md'],w:['arming','arming','runeblade'],b:[null,null,null],s:['kite','heater','heater'],a:['leather','mail','plate'],h:['cap','kettle','greathelm']},
 axe:{st:['hp','ms','md'],w:['handaxe','waraxe','waraxe'],b:[null,'greataxe','greataxe'],s:['buckler','kite','heater'],a:['leather','mail','scale'],h:['cap','kettle','barbute']},
 mace:{st:['hp','ms','md'],w:['club','mace','mace'],b:[null,null,null],s:['buckler','kite','heater'],a:['padded','mail','scale'],h:['cap','kettle','barbute']},
 spear:{st:['hp','ms','md'],w:['spear','warspear','warspear'],b:[null,null,null],s:['kite','heater','heater'],a:['leather','mail','scale'],h:['cap','kettle','barbute']},
 two:{st:['hp','ms','md'],w:['handaxe','greataxe','greataxe'],b:[null,'waraxe','waraxe'],s:['buckler','kite','kite'],a:['leather','mail','scale'],h:['cap','kettle','barbute']},
 pike:{st:['hp','ms','md'],w:['spear','pike','pike'],b:[null,null,null],s:['buckler',null,null],a:['leather','mail','scale'],h:['cap','kettle','barbute']},
 blade:{st:['hp','ms','md'],w:['shortsword','arming','runeblade'],b:[null,null,null],s:['buckler','buckler','heater'],a:['leather','mail','scale'],h:['cap','kettle','barbute']},
 bow:{st:['rs','hp','rd'],w:['shortbow','warbow','warbow'],b:['knife','knife','rondel'],s:[null,null,null],a:['padded','leather','mail'],h:['hood','cap','kettle']},
 mage:{st:['hp','rd','md'],w:['staff','focus','focus'],b:[null,null,null],s:[null,null,null],a:['robe','robe','leather'],h:['hood','hood','cap']},
 hammer:{st:['hp','ms','md'],w:['mallet','warhammer','warhammer'],b:[null,'maul','warmaul'],s:['roundshield','heater','heater'],a:['leather','mail','scale'],h:['cap','kettle','barbute']},
 pole:{st:['hp','ms','md'],w:['bill','halberd','glaive'],b:['knife','knife','knife'],s:[null,null,null],a:['leather','mail','scale'],h:['cap','kettle','barbute']},
 great:{st:['hp','ms','md'],w:['greatsword','zweihander','zweihander'],b:[null,null,null],s:[null,null,null],a:['leather','mail','scale'],h:['cap','kettle','barbute']},
 xbow:{st:['rs','hp','rd'],w:['lightxbow','crossbow','crossbow'],b:['knife','knife','rondel'],s:[null,null,null],a:['padded','leather','mail'],h:['hood','cap','kettle']},
 gun:{st:['rs','hp','rd'],w:['pistol','pistol','duelpistol'],b:['shortsword','arming','arming'],s:['buckler','kite','kite'],a:['padded','leather','mail'],h:['hood','cap','kettle']},
 tower:{st:['hp','ms','md'],w:['shortsword','arming','arming'],b:[null,null,null],s:['tower','tower','steeltower'],a:['leather','mail','plate'],h:['cap','kettle','greathelm']},
 heal:{st:['hp','ms','md'],w:['club','mace','mace'],b:[null,null,null],s:['buckler','kite','heater'],a:['padded','mail','scale'],h:['cap','kettle','barbute']}
};
const S=(bg,role,gift)=>({bg,role,gift:gift||null});
const PROFILES=[
 {id:'L1x4',lvl:1,day:2,tier:-1,team:null},                                     // the company a new game starts with, perk points spent
 {id:'L4x6',lvl:4,day:12,tier:0,team:[S('squire','tank','aura'),S('sellsword','axe'),S('militia','spear'),S('acolyte','heal','chi'),S('hunter','bow'),S('hedge','mage','mana')]},
 {id:'L8x9',lvl:8,day:30,tier:1,team:[S('knight','tank','aura'),S('squire','great'),S('sellsword','hammer'),S('militia','pole'),S('wildling','two','qi'),S('acolyte','heal','chi'),S('hunter','bow'),S('hunter','xbow'),S('hedge','mage','mana')]},
 {id:'L12x12',lvl:12,day:50,tier:2,team:[S('knight','tank','aura'),S('squire','tower','aura'),S('sellsword','axe'),S('sellsword','hammer'),S('militia','spear'),S('militia','pole'),S('wildling','two','qi'),S('spellblade','gun','qi'),
   S('monk','heal','chi'),S('hunter','bow'),S('hunter','xbow'),S('hedge','mage','mana')]}
];
/* Solo (Beast Slayer) profiles: the Solo origin's one sword at level 3 (the kit ORIGINS.slayer.setup gives), 6 and 9 (the gear a slayer would have
   bought by then), measured as the slayer would really stand at that level: only the quarry tiers open by then (tier t at level t), each
   with a typical tally (soloKills: half the cap of every open tier, none of the rest). Perks: autoLearn, except the SOLOKEEP points a
   sensible hunter keeps for the quarry it is fighting (QPLAN: the open Monster hunter perks for that faction, learned in battle()); kept
   points with no open quarry perk to spend on go to autoLearn as well (on the build it had before the tallies). Reported, not judged. */
const SOLO=[{id:'S3',lvl:3,day:3,solo:1,gear:null},{id:'S6',lvl:6,day:16,solo:1,gear:{w:'warspear',b:'lightxbow',a:'mail',h:'kettle'}},
 {id:'S9',lvl:9,day:32,solo:1,gear:{w:'wingspear',b:'crossbow',a:'mail',h:'nasal'}}],SOLOF=['beast','serpent','ogre'],
 QPLAN={beast:['hunter.wolf','hunter.spider','hunter.bear'],serpent:['hunter.serpent'],ogre:['hunter.ogre']},SOLOKEEP=2;
function soloKills(X,lvl){const o={};Object.keys(X.QUARRY).forEach((k,i)=>{if(i+1<=lvl)o[k]=Math.floor(X.QUARRY[k].cap/2)});return o}
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
  performance:{now:()=>0},ResizeObserver:function(){return{observe(){},disconnect(){},unobserve(){}}},MutationObserver:function(){return{observe(){},disconnect(){}}},IntersectionObserver:function(){return{observe(){},disconnect(){}}},Image:function(){return element()},Audio:function(){return hole()},CSS:{supports:()=>false,escape:s=>s}};
 sb.window=sb;sb.self=sb;sb.globalThis=sb;sb.top=sb;sb.parent=sb;const ctx=vm.createContext(sb);
 const OVR={};for(let i=0;i<ARGV.length;i++)if(ARGV[i]==='--src'){const [f,file]=ARGV[i+1].split('=');OVR[f]=file}   // A/B runs: --src 63-ai.js=/path/to/other.js
 const js=fs.readdirSync(SRC).filter(f=>f.endsWith('.js')).sort().map(f=>`/* ---- ${f} ---- */\n`+fs.readFileSync(OVR[f]||path.join(SRC,f),'utf8')).join('\n');
 vm.runInContext("'use strict';\n"+js,ctx,{filename:'wyrdmarch-src.js'});
 const getters=new Map(),setters=new Map(),extra={ctx,warns};
 const X=new Proxy(extra,{get(t,k){if(k in t)return t[k];if(typeof k!=='string')return undefined;if(k in ctx)return ctx[k];
   if(!getters.has(k))getters.set(k,vm.runInContext(`(()=>typeof ${k}==='undefined'?undefined:${k})`,ctx));return getters.get(k)()},
  set(t,k,v){if(k in t){t[k]=v;return true}if(!setters.has(k))setters.set(k,vm.runInContext(`(v=>{${k}=v})`,ctx));setters.get(k)(v);return true}});
 X.FX.on=null;X.SPEEDF=0;X.clone=vm.runInContext('(o=>JSON.parse(JSON.stringify(o)))',ctx);
 for(let i=0;i<ARGV.length;i++)if(ARGV[i]==='--set')vm.runInContext(ARGV[i+1],ctx);          // tuning experiments: --set "BUDGETK=1.3" --set "EN.gob.hp=50"
 return X}
/* ---------- companies ---------- */
function closeAll(X){for(let i=0;i<6&&X.sheetOpen;i++)X.closeSheet(true);if(X.sheetOpen)X.sheetOpen=false}
// The perk build: the game's autoLearn(m) (the Auto button), or, on an older build without the talent API, the old mastery spend.
function learnAll(X,m){if(typeof X.autoLearn==='function'&&Array.isArray(m.perks)){X.autoLearn(m);if(typeof X.syncMast==='function')X.syncMast(m);return}
 let g=0;const order=Object.keys(m.mast||{});while(m.pp>0&&g++<60){const k=order.find(k=>X.MAST[k]&&X.MAST[k].p&&m.mast[k]<X.MAST[k].p.length);if(!k)break;m.mast[k]++;m.pp--;order.push(order.shift())}}
// The gift the profile asks for (in the variant the background's style gets), or none.
function setGift(X,m,res){if(!Array.isArray(m.trees)||typeof X.giftKey!=='function')return;const g=res?X.giftKey(res,X.mercStyle(m)):null;
 m.trees=m.trees.filter(k=>!(X.MAST[k]&&X.MAST[k].kind==='gift'));m.gift=g;if(g)m.trees.push(g)}
function mkMerc(X,spec,P){const R=ROLES[spec.role],m=X.newMerc(spec.bg);m.field=true;setGift(X,m,spec.gift);
 const eq={w:R.w[P.tier],b:R.b[P.tier],s:R.s[P.tier],a:R.a[P.tier],h:X.ITEMS[R.h[P.tier]]?R.h[P.tier]:null};m.eq=Object.assign(m.eq||{},eq);
 if(X.ITEMS[eq.w].two&&(!eq.b||X.ITEMS[eq.b].two)&&!(typeof X.fixHands==='function'))m.eq.s=null;if(typeof X.fixHands==='function')X.fixHands(m);
 X.gainXP(m,X.XPT[P.lvl]);let g=0;
 while(m.pend>0&&g++<40){for(const k of R.st){const t=m.tal[k]||0;m.base[k]+=X.ri(X.ROLL[k][0]+Math.floor(t/2),X.ROLL[k][1]+Math.ceil(t/2))}m.pend--}
 learnAll(X,m);delete m.cond;m.hp=X.calc(m).hp;return m}
function buildSolo(X,P,seed){X.seedRng(seed);X.newGame(true,{origin:'slayer'});closeAll(X);const G=X.G,m=G.roster[0];m.field=true;
 if(P.gear)Object.assign(m.eq,P.gear);if(typeof X.fixHands==='function')X.fixHands(m);if(P.lvl>m.lvl)X.gainXP(m,X.XPT[P.lvl]-m.xp);let g=0;
 while(m.pend>0&&g++<40){for(const k of ['hp','ms','md']){const t=m.tal[k]||0;m.base[k]+=X.ri(X.ROLL[k][0]+Math.floor(t/2),X.ROLL[k][1]+Math.ceil(t/2))}m.pend--}
 const keep=Math.min(SOLOKEEP,m.pp);m.pp-=keep;learnAll(X,m);m.pp+=keep;delete m.cond;m.hp=X.calc(m).hp;G.stash.length=0;return X.clone(G.roster)}
// the quarry a sensible slayer readies for the faction it fights (the kept points), the rest of them by autoLearn as if it had no tally
function soloPrep(X,m,f,P){m.slain={};for(const k of QPLAN[f]||[])if(m.pp>0&&X.canLearn(m,k))X.learnPerk(m,k);learnAll(X,m);m.slain=soloKills(X,P.lvl);m.hp=X.calc(m).hp}
function buildCompany(X,P,seed){if(P.solo)return buildSolo(X,P,seed);X.seedRng(seed);X.newGame(true);closeAll(X);const G=X.G;
 if(P.team){G.roster.length=0;for(const s of P.team)G.roster.push(mkMerc(X,s,P))}
 else G.roster.forEach(m=>{m.field=true;learnAll(X,m);m.hp=X.calc(m).hp});
 G.stash.length=0;closeAll(X);return X.clone(G.roster)}
/* ---------- one battle ---------- */
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
async function battle(X,W,job,i){const P=PROFILES.concat(SOLO).find(p=>p.id===job.prof),G=X.G;G.roster=X.clone(W.comp[P.id][i%W.comp[P.id].length]);G.stash=[];G.day=P.day;X.B=null;X.mode='world';
 if(P.solo){G.origin='slayer';soloPrep(X,G.roster[0],job.f,P)}else G.origin='free';
 X.seedRng((hash(job.f+'|'+P.id)^Math.imul(i+1,2654435761)^SEED)>>>0);
 const o={f:job.f,mult:1,biome:BIOMES[i%BIOMES.length],pilot:job.pilot,src:{type:'test'},turnCap:TURNCAP};if(job.plan)o.plan=job.plan;
 if(job.f==='rival'){const R=X.clone(W.comp[P.id][(i+3)%KCOMP]);R.forEach((m,k)=>{m.id=900000+k;m.field=true});   // an equal rival: another company of the same profile
  G.rivals=[{id:'rB',n:'The Grey Company',short:'Greys',c1:'k',c2:'w',emblem:'wolf',pers:job.pers||'honour',renown:G.renown||0,crowns:0,home:0,roster:R,stance:0,alive:true,day:G.day,deeds:[]}];o.f='rB';o.rival='rB'}if(job.fixed)o.fixed=job.fixed;if(job.cr){const C=job.cr,d=X.EN[C.boss];G.fabled={};Object.assign(o,{f:C.f,mult:C.mult,fixed:C.fixed.slice(),boss:{id:C.boss,name:d.n,title:'',phases:(d.crph||[]).map(p=>Object.assign({},p)),enrageRound:C.er||0}});if(C.fabled&&X.FABLED[C.fabled])o.fabled=[C.fabled];if(C.obj)o.obj={k:C.obj}}
 if(job.fab){G.fabled={};o.fabled=job.fab.ids.slice();o.mult=job.fab.mult;if(job.fab.boss)o.boss={fabled:job.fab.ids[0]}}if(job.foes)o.foes=job.foes;
 const n0=G.roster.length,res=await X.autoBattle(o);if(!res)throw new Error('battle did not start');
 if(X.FX.err)throw X.FX.err;
 const b=X.B,foes=b?b.units.filter(u=>u.side===1&&!u.spawned).length:0;
 const out={win:res.win&&!res.stuck?1:0,stuck:res.stuck?1:0,rounds:res.rounds||0,dead:res.dead?res.dead.length:n0-G.roster.length,down:res.down?res.down.length:0,foes};X.B=null;X.mode='world';return out}
async function runJob(X,W,job){const r={wins:0,stuck:0,rounds:0,dead:0,down:0,foes:0,n:job.n};
 for(let i=0;i<job.n;i++){const o=await battle(X,W,job,i);r.wins+=o.win;r.stuck+=o.stuck;r.rounds+=o.rounds;r.dead+=o.dead;r.down+=o.down;r.foes+=o.foes}
 const st=X.AI_STAT;r.ai={n:st.n,ms:st.ms,max:st.max};st.n=0;st.ms=0;st.max=0;return r}
if(has('--lib')){module.exports={makeContext,buildCompany,battle,PROFILES,SEED,hash};return}
/* ---------- worker ---------- */
if(has('--worker')){let X=null,W=null;const q=[];let busy=false;
 const pump=async()=>{if(busy)return;busy=true;while(q.length){const job=q.shift();
   try{if(!X){X=makeContext();const {performance}=require('perf_hooks');X.AI_CLOCK=()=>performance.now();W={comp:{}};for(const P of PROFILES.concat(SOLO)){W.comp[P.id]=[];for(let k=0;k<(P.solo?KSOLO:KCOMP);k++)W.comp[P.id].push(buildCompany(X,P,SEED+hash(P.id)%9973+k*101))}}
    const r=await runJob(X,W,job);process.send({id:job.id,r})}
   catch(e){process.send({id:job.id,err:String(e&&e.stack||e)})}}busy=false};
 process.on('message',m=>{if(m==='quit')process.exit(0);q.push(m);pump()});return}
/* ---------- main ---------- */
(async()=>{const QUICK=has('--quick'),N=+arg('--n',QUICK?40:200),NA=+arg('--na',Math.max(20,Math.round(N/2))),J=+arg('--jobs',Math.max(1,Math.min(4,os.cpus().length)));
 const only=arg('--only',null),RIV=!has('--no-rival')&&(!only||only.split(',').includes('rival')),facs=only?only.split(',').filter(f=>f!=='wyvern'&&f!=='rival'&&f!=='solo'&&f!=='fabled'&&f!=='crisis'):FACS.concat(MONF),profs=arg('--prof',null)?arg('--prof').split(','):PROFILES.map(p=>p.id),T0=Date.now();
 const X0=makeContext(),PLAN=JSON.parse(JSON.stringify(X0.AI_PLAN)),FACT=X0.FACT;
 /* The tactics the sensible pilot is run without, one at a time: name -> what to strip from a plan. */
 const TACTICS={
  'target the shaman':p=>{if(p.hunt)delete p.hunt.gobsham},
  'kill the necromancer':p=>{if(p.hunt)delete p.hunt.necro;delete p.press},
  'hold a tight line':p=>{delete p.hold;delete p.tight},
  'outlast the fury':p=>{if(p.outlast){delete p.outlast;delete p.holdR}},
  'kill the chief':p=>{if(p.hunt)delete p.hunt.blead},
  'spread out':p=>{delete p.spread},
  'hunt the weavers':p=>{if(p.hunt)delete p.hunt.vmage},
  'engage the archers':p=>{if(p.lock!=null)p.lock=0},
  'kill the great serpent':p=>{if(p.hunt){delete p.hunt.gserp;delete p.hunt.viper}},
  'burn the ents':p=>{delete p.burn},
  'dodge the dive':p=>{delete p.dodge},
  'pin its wings':p=>{delete p.ground}
 };
 // where the game lets each monster faction roam: the profiles whose company power and day put it in factionPool
 const roams={};{const Xp=X0;for(const P of PROFILES){const ros=buildCompany(Xp,P,SEED+hash(P.id)%9973),pw=Xp.companyPower(ros),pool=Xp.factionPool({power:pw,day:P.day,crisis:false});P.power=pw;for(const e of pool)(roams[e.f]||(roams[e.f]=[])).push(P.id)}}
 const profOf=f=>MONF.includes(f)||f==='wyvern'?profs.filter(p=>(roams[f]||[]).includes(p)):profs;
 const jobs=[];let jid=0;const add=(kind,f,prof,pilot,n,plan,tag,fixed,foes)=>{const j={id:jid++,kind,f,prof,pilot,n,plan:plan||null,tag:tag||null,fixed:fixed||null,foes:foes||null};jobs.push(j);return j};
 for(const f of facs)for(const p of profOf(f))for(const pilot of ['naive','sensible'])add('main',f,p,pilot,N);
 if(RIV)for(const p of profs)for(const pilot of ['naive','sensible'])add('rival','rival',p,pilot,N);
 const AP=arg('--aprof','L4x6,L8x9,L12x12').split(',').filter(p=>profs.includes(p)||arg('--prof',null)==null);
 if(!has('--no-abl'))for(const t in TACTICS)for(const f of facs){const p=JSON.parse(JSON.stringify(PLAN[f]||{})),before=JSON.stringify(p);TACTICS[t](p);if(JSON.stringify(p)===before)continue;for(const pr of AP.filter(x=>profOf(f).includes(x))){add('abl',f,pr,'sensible',NA,p,t);add('ablbase',f,pr,'sensible',NA,null,t)}}
 const CROSS=FACS.concat(MONF);if(!has('--no-cross'))for(const f of facs)for(const g of (MONF.includes(f)?CROSS:FACS)){for(const pr of AP.filter(x=>profOf(f).includes(x)))add('cross',f,pr,'sensible',NA,PLAN[g],g)}
 const WYV=has('--no-wyvern')||(only&&!only.split(',').includes('wyvern'))?[]:['L8x9','L12x12'].filter(p=>PROFILES.some(q=>q.id===p));
 const NW=+arg('--nw',Math.max(40,Math.round(N/2))),WABL={'dodge the dive':'dodge','pin its wings':'ground','spread out':'spread','no plan at all':'*'};
 for(const pr of WYV)for(const pilot of ['naive','sensible'])add('wyv','wyvern',pr,pilot,NW,null,null,null,['wyvern']);
 if(!has('--no-abl')&&WYV.includes('L12x12'))for(const t in WABL){const p=JSON.parse(JSON.stringify(PLAN.wyvern||{}));if(WABL[t]==='*')for(const k in p)delete p[k];else delete p[WABL[t]];add('wyvabl','wyvern','L12x12','sensible',NW,p,t,null,['wyvern'])}
 const SOLON=+arg('--ns',Math.max(40,Math.round(N/2))),SOLOON=!has('--no-solo')&&(!only||only.split(',').includes('solo'));
 const SPROF=arg('--sprof',null),SFAC=arg('--sfac',null),SOLOP=SOLO.filter(P=>!SPROF||SPROF.split(',').includes(P.id)),SOLOFF=SOLOF.filter(f=>!SFAC||SFAC.split(',').includes(f));   // (tuning: --sprof S3,S9 --sfac ogre)
 if(SOLOON)for(const f of SOLOFF)for(const P of SOLOP)for(const pilot of has('--sens-only')?['sensible']:['naive','sensible'])add('solo',f,P.id,pilot,SOLON);
 if(has('--boss'))for(const pr of ['L8x9','L12x12'])for(const pilot of ['naive','sensible'])add('boss','void',pr,pilot,NA,null,null,['tyrant']);
 // Fabled update: a band led by a fabled warrior (o.fabled; the band at FABM of an even budget), and fabled bosses with their phases. Reported, not judged.
 const FABM=.75,FABS=[['orc','L8x9','korvak',0],['bandit','L8x9','aldric',0],['bandit','L12x12','hakon',1],[FACT.east?'east':'bandit','L12x12','nobusada',1],['undead','L12x12','ulfgar',1]].filter(x=>FACT[x[0]]&&X0.FABLED&&X0.FABLED[x[2]]);
 const FABON=!has('--no-fabled')&&(!only||only.split(',').includes('fabled'));
 if(FABON)for(const [f,pr,id,boss] of FABS)for(const pilot of ['naive','sensible']){const j=add('fab',f,pr,pilot,NA);j.fab={ids:[id],boss,mult:FABM}}
 // Crisis update: the crisis boss fights as 18-crises.js stages them (a typical crisis strength: mult as at str 1.3 and a half-built camp), with the
 // fabled warrior crFabled would bring, at the late profiles. Reported, not judged (target for the crises: sensible 55..75% at L12x12).
 const CRB=[['Bone Throne','dead',{f:'dead',mult:.66,fixed:['bthrone','necrolt'],boss:'bthrone',er:16,fabled:'ulfgar',obj:'siege'}],['Warchief','horde',{f:'horde',mult:.89,fixed:['hchief','hstd','hstd','obrute'],boss:'hchief',er:14,fabled:'korvak'}],
  ['Huscarl champions','barb',{f:'barb',mult:1.31,fixed:['barbhus','barbhus','barbhus','barbskald','barbz','barbz'],boss:'barbhus'}],['Emperor','barb',{f:'barb',mult:.89,fixed:['emperor','barbhus'],boss:'emperor',er:16,fabled:'hakon'}]].filter(x=>FACT[x[1]]&&X0.EN[x[2].boss]);   // the stage setups of 18-crises.js (crBossMult / crChampMult at a typical crisis)
 const CRON=!has('--no-crisis')&&(!only||only.split(',').includes('crisis'));
 if(CRON)for(const [n,f,C] of CRB)for(const pr of ['L8x9','L12x12'])for(const pilot of ['naive','sensible']){const j=add('crb',f,pr,pilot,NA);j.cr=C;j.tag=n}
 // identical jobs (same battles) are run once
 const sig=j=>[j.f,j.prof,j.pilot,j.n,JSON.stringify(j.fab||null),JSON.stringify(j.cr||null),JSON.stringify(j.plan&&JSON.stringify(j.plan)!==JSON.stringify(PLAN[j.f])?j.plan:null),JSON.stringify(j.fixed),JSON.stringify(j.foes)].join('|'),uniq=new Map();
 for(const j of jobs){const s=sig(j);if(!uniq.has(s))uniq.set(s,{job:j,res:null})}
 const PIX=id=>{const i=PROFILES.findIndex(p=>p.id===id);return i>=0?i:1},todo=[...uniq.values()].sort((a,b)=>b.job.n*PIX(b.job.prof)-a.job.n*PIX(a.job.prof));
 console.log(`balance: ${todo.length} cells, ${todo.reduce((s,t)=>s+t.job.n,0)} battles, ${J} workers, seed ${SEED}, BUDGETK ${X0.BUDGETK}`);
 await new Promise((done,fail)=>{let next=0,left=todo.length,dead=false;if(!left)return done();
  const sets=[];for(let i=0;i<ARGV.length;i++)if(ARGV[i]==='--set'||ARGV[i]==='--src'||ARGV[i]==='--srcdir')sets.push(ARGV[i],ARGV[i+1]);
  const ws=[];for(let i=0;i<J;i++){const w=cp.fork(__filename,['--worker','--seed',String(SEED)].concat(sets));ws.push(w);
   const feed=()=>{if(next<todo.length){const t=todo[next++];w.cur=t;w.send(t.job)}else w.send('quit')};
   w.on('message',m=>{if(m.err){if(!dead){dead=true;ws.forEach(x=>x.kill());fail(new Error(`cell ${w.cur.job.f}/${w.cur.job.prof}/${w.cur.job.pilot}: ${m.err}`))}return}w.cur.res=m.r;if(!has('--quiet'))process.stderr.write('.');if(--left===0){ws.forEach(x=>{try{if(x.connected)x.send('quit')}catch(e){}});done()}else feed()});
   w.on('exit',c=>{if(c&&!dead){dead=true;fail(new Error('worker died with code '+c))}});feed()}});
 process.stderr.write('\n');
 const R=j=>uniq.get(sig(j)).res,pct=r=>100*r.wins/r.n,f1=x=>x.toFixed(1),pad=(s,n)=>String(s).padEnd(n),lp=(s,n)=>String(s).padStart(n);
 /* ---- balance table ---- */
 console.log('\n== even fights: faction x company profile ==');
 console.log(pad('faction',16)+pad('profile',8)+lp('foes',6)+lp('naive%',8)+lp('sens%',8)+lp('rounds',8)+lp('lost(n)',9)+lp('lost(s)',9)+lp('down(s)',9));
 const tot={n:0,s:0,c:0,rounds:0},byF={};let stuck=0,ai={n:0,ms:0,max:0},bad=[];
 if(!facs.length)tot.c=1;
 for(const f of facs){byF[f]={n:0,s:0,c:0};for(const p of profOf(f)){const a=R(jobs.find(j=>j.kind==='main'&&j.f===f&&j.prof===p&&j.pilot==='naive')),b=R(jobs.find(j=>j.kind==='main'&&j.f===f&&j.prof===p&&j.pilot==='sensible'));
   stuck+=a.stuck+b.stuck;const rounds=(a.rounds+b.rounds)/(a.n+b.n);
   console.log(pad(FACT[f].n,16)+pad(p,8)+lp(f1(b.foes/b.n),6)+lp(f1(pct(a)),8)+lp(f1(pct(b)),8)+lp(f1(rounds),8)+lp((a.dead/a.n).toFixed(2),9)+lp((b.dead/b.n).toFixed(2),9)+lp((b.down/b.n).toFixed(2),9));
   byF[f].n+=pct(a);byF[f].s+=pct(b);byF[f].c++;tot.n+=pct(a);tot.s+=pct(b);tot.c++;tot.rounds+=rounds}}
 for(const t of uniq.values())if(t.res){ai.n+=t.res.ai.n;ai.ms+=t.res.ai.ms;ai.max=Math.max(ai.max,t.res.ai.max)}
 console.log('\n== by faction ==');
 for(const f of facs){if(!byF[f].c){console.log(pad(FACT[f].n,16)+'   (roams at none of these profiles)');continue}const n=byF[f].n/byF[f].c,s=byF[f].s/byF[f].c,mon=MONF.includes(f);console.log(pad(FACT[f].n,16)+lp('naive '+f1(n)+'%',14)+lp('sensible '+f1(s)+'%',18)+(mon?'   ('+profOf(f).join(' ')+')':'')+(n>65?'   NAIVE TOO HIGH':'')+(s<65?'   SENSIBLE TOO LOW':''));if(n>65)bad.push(FACT[f].n+': naive '+f1(n)+'% > 65%');if(s<65)bad.push(FACT[f].n+': sensible '+f1(s)+'% < 65%');
  if(mon&&n>=50)bad.push(FACT[f].n+': naive '+f1(n)+'% >= 50% where it roams');if(mon&&s<=80)bad.push(FACT[f].n+': sensible '+f1(s)+'% <= 80% where it roams')}
 const on=tot.n/tot.c,os_=tot.s/tot.c;
 if(facs.length){console.log(`\nOVERALL  naive ${f1(on)}%   sensible ${f1(os_)}%   mean rounds ${f1(tot.rounds/tot.c)}   (${N} battles per cell and pilot)`);
 if(on>=50)bad.push('overall naive '+f1(on)+'% >= 50%');if(os_<=80)bad.push('overall sensible '+f1(os_)+'% <= 80%');if(tot.rounds/tot.c>12.5)bad.push('mean battle length '+f1(tot.rounds/tot.c)+' rounds > 12.5')}
 /* ---- rival companies ---- */
 if(jobs.some(j=>j.kind==='rival')){console.log('\n== rival company of the same profile (an even fight between equals) ==');
  console.log(pad('profile',10)+lp('foes',6)+lp('naive%',8)+lp('sens%',8)+lp('rounds',8)+lp('lost(n)',9)+lp('lost(s)',9)+lp('down(s)',9));let sn=0,ss=0,c=0;
  for(const pr of profs){const a=R(jobs.find(j=>j.kind==='rival'&&j.prof===pr&&j.pilot==='naive')),b=R(jobs.find(j=>j.kind==='rival'&&j.prof===pr&&j.pilot==='sensible'));stuck+=a.stuck+b.stuck;
   console.log(pad(pr,10)+lp(f1(b.foes/b.n),6)+lp(f1(pct(a)),8)+lp(f1(pct(b)),8)+lp(f1((a.rounds+b.rounds)/(a.n+b.n)),8)+lp((a.dead/a.n).toFixed(2),9)+lp((b.dead/b.n).toFixed(2),9)+lp((b.down/b.n).toFixed(2),9));sn+=pct(a);ss+=pct(b);c++}
  sn/=c;ss/=c;console.log(`RIVALS   naive ${f1(sn)}%   sensible ${f1(ss)}%   (target: sensible 55..75%, naive below it)`);
  if(ss<55||ss>75)bad.push('rivals: sensible '+f1(ss)+'% outside 55..75%');if(sn>=ss)bad.push('rivals: naive '+f1(sn)+'% not below sensible '+f1(ss)+'%')}
 if(stuck)bad.push(stuck+' battles hit the turn cap');
 /* ---- ablation ---- */
 if(jobs.some(j=>j.kind==='abl')){console.log(`\n== tactic ablation: sensible win % with the tactic removed, change against the full plan (${AP.join('+')}, ${NA} battles each) ==`);
  console.log(pad('tactic removed',24)+facs.map(f=>lp(FACT[f].n.slice(0,12),14)).join(''));
  for(const t in TACTICS){let line=pad(t,24);for(const f of facs){const a=jobs.filter(j=>j.kind==='abl'&&j.tag===t&&j.f===f),b=jobs.filter(j=>j.kind==='ablbase'&&j.tag===t&&j.f===f);
    if(!a.length){line+=lp('·',14);continue}const wa=a.reduce((s,j)=>s+pct(R(j)),0)/a.length,wb=b.reduce((s,j)=>s+pct(R(j)),0)/b.length;line+=lp(f1(wa)+' ('+(wa-wb>=0?'+':'')+f1(wa-wb)+')',14)}console.log(line)}
  console.log('(· = the plan against that faction does not use the tactic, so removing it changes nothing there)')}
 if(jobs.some(j=>j.kind==='cross')){console.log(`\n== plan against faction: sensible win % when it fights the row faction with the column faction's plan (${AP.join('+')}) ==`);
  console.log(pad('fighting \\ plan for',24)+FACS.map(f=>lp(FACT[f].n.slice(0,10),12)).join(''));
  for(const f of facs){let line=pad(FACT[f].n,24),own=0,bestOther=0;for(const g of FACS){const js=jobs.filter(j=>j.kind==='cross'&&j.f===f&&j.tag===g),w=js.reduce((s,j)=>s+pct(R(j)),0)/js.length;if(g===f)own=w;else bestOther=Math.max(bestOther,w);line+=lp((g===f?'[':' ')+f1(w)+(g===f?']':' '),12)}console.log(line)}}
 if(jobs.some(j=>j.kind==='wyv')){let wst=0;console.log('\n== wyvern (end-game): a lone wyvern against the whole company ==');console.log(pad('profile',10)+lp('power',7)+lp('naive%',8)+lp('sens%',8)+lp('rounds',8)+lp('lost(n)',9)+lp('lost(s)',9)+lp('down(s)',9));
  for(const pr of WYV){const a=R(jobs.find(j=>j.kind==='wyv'&&j.prof===pr&&j.pilot==='naive')),b=R(jobs.find(j=>j.kind==='wyv'&&j.prof===pr&&j.pilot==='sensible')),P=PROFILES.find(p=>p.id===pr);wst+=a.stuck+b.stuck;
   console.log(pad(pr,10)+lp(f1(P.power||0),7)+lp(f1(pct(a)),8)+lp(f1(pct(b)),8)+lp(f1((a.rounds+b.rounds)/(a.n+b.n)),8)+lp((a.dead/a.n).toFixed(2),9)+lp((b.dead/b.n).toFixed(2),9)+lp((b.down/b.n).toFixed(2),9));
   if(pr==='L12x12'){if(pct(b)<45||pct(b)>80)bad.push('wyvern L12x12 sensible '+f1(pct(b))+'% outside 45..80%');if(pct(a)>30)bad.push('wyvern L12x12 naive '+f1(pct(a))+'% > 30%')}}
  if(jobs.some(j=>j.kind==='wyvabl')){const base=pct(R(jobs.find(j=>j.kind==='wyv'&&j.prof==='L12x12'&&j.pilot==='sensible')));console.log('sensible L12x12 with a tactic removed:');
   for(const j of jobs.filter(j=>j.kind==='wyvabl')){const w=pct(R(j));console.log('  '+pad(j.tag,18)+lp(f1(w)+'%',7)+'  ('+(w-base>=0?'+':'')+f1(w-base)+')')}}
  if(wst)bad.push(wst+' wyvern battles hit the turn cap')}
 if(jobs.some(j=>j.kind==='solo')){console.log(`\n== Solo: Beast Slayer (one sword, an even fight for one at mult 1; quarry perks ${JSON.stringify(QPLAN)} where open, half-cap tallies of the open tiers, ${SOLON} battles each) ==`);
  console.log(pad('faction',16)+pad('profile',8)+lp('foes',6)+lp('naive%',8)+lp('sens%',8)+lp('±95%',7)+lp('rounds',8)+lp('dead(s)',9)+lp('down(s)',9));
  for(const f of SOLOFF)for(const P of SOLOP){const jn=jobs.find(j=>j.kind==='solo'&&j.f===f&&j.prof===P.id&&j.pilot==='naive'),b=R(jobs.find(j=>j.kind==='solo'&&j.f===f&&j.prof===P.id&&j.pilot==='sensible')),a=jn?R(jn):b;stuck+=a.stuck+b.stuck;
   console.log(pad(FACT[f].n,16)+pad(P.id,8)+lp(f1(b.foes/b.n),6)+lp(f1(pct(a)),8)+lp(f1(pct(b)),8)+lp(f1(196*Math.sqrt(b.wins/b.n*(1-b.wins/b.n)/b.n)),7)+lp(f1((a.rounds+b.rounds)/(a.n+b.n)),8)+lp((b.dead/b.n).toFixed(2),9)+lp((b.down/b.n).toFixed(2),9))}
  console.log('(reported, not judged: the overall criteria above are the company profiles only)')}
 if(jobs.some(j=>j.kind==='fab')){console.log(`\n== fabled: a band (${FABM} of an even budget) led by a fabled warrior; * = a boss with its phases (${NA} battles each) ==`);
  console.log(pad('faction',16)+pad('profile',8)+pad('fabled',12)+lp('foes',6)+lp('naive%',8)+lp('sens%',8)+lp('rounds',8)+lp('lost(s)',9));
  for(const [f,pr,id,boss] of FABS){const a=R(jobs.find(j=>j.kind==='fab'&&j.f===f&&j.prof===pr&&j.fab.ids[0]===id&&j.pilot==='naive')),b=R(jobs.find(j=>j.kind==='fab'&&j.f===f&&j.prof===pr&&j.fab.ids[0]===id&&j.pilot==='sensible'));stuck+=a.stuck+b.stuck;
   console.log(pad(FACT[f].n,16)+pad(pr,8)+pad(id+(boss?'*':''),12)+lp(f1(b.foes/b.n),6)+lp(f1(pct(a)),8)+lp(f1(pct(b)),8)+lp(f1((a.rounds+b.rounds)/(a.n+b.n)),8)+lp((b.dead/b.n).toFixed(2),9))}
  console.log('(reported, not judged)')}
 if(jobs.some(j=>j.kind==='crb')){console.log(`\n== crisis bosses (18-crises.js stages, boss phases, the fabled crFabled brings; ${NA} battles each) ==`);
  console.log(pad('fight',20)+pad('profile',8)+pad('fabled',10)+lp('foes',6)+lp('naive%',8)+lp('sens%',8)+lp('rounds',8)+lp('lost(s)',9));
  for(const [n,f,C] of CRB)for(const pr of ['L8x9','L12x12']){const a=R(jobs.find(j=>j.kind==='crb'&&j.tag===n&&j.prof===pr&&j.pilot==='naive')),b=R(jobs.find(j=>j.kind==='crb'&&j.tag===n&&j.prof===pr&&j.pilot==='sensible'));stuck+=a.stuck+b.stuck;
   console.log(pad(n,20)+pad(pr,8)+pad(C.fabled||'-',10)+lp(f1(b.foes/b.n),6)+lp(f1(pct(a)),8)+lp(f1(pct(b)),8)+lp(f1((a.rounds+b.rounds)/(a.n+b.n)),8)+lp((b.dead/b.n).toFixed(2),9))}
  console.log('(reported, not judged; the crisis target: a strong late company, sensible, 55..75% a fight)')}
 if(jobs.some(j=>j.kind==='boss')){console.log('\n== rift tyrant (dungeon boss fight, fixed tyrant + even budget) ==');for(const pr of ['L8x9','L12x12']){const a=R(jobs.find(j=>j.kind==='boss'&&j.prof===pr&&j.pilot==='naive')),b=R(jobs.find(j=>j.kind==='boss'&&j.prof===pr&&j.pilot==='sensible'));
   console.log(pad(pr,10)+`naive ${f1(pct(a))}%  sensible ${f1(pct(b))}%  rounds ${f1((a.rounds+b.rounds)/(a.n+b.n))}`)}}
 console.log(`\nAI decision cost: ${(ai.ms/Math.max(1,ai.n)).toFixed(3)} ms per unit turn (mean over ${ai.n} turns), worst single decision ${ai.max.toFixed(1)} ms.   Wall time ${((Date.now()-T0)/1000).toFixed(0)} s.`);
 if(arg('--json',null))fs.writeFileSync(arg('--json'),JSON.stringify({N,NA,seed:SEED,cells:[...uniq.values()].map(t=>({job:t.job,res:t.res}))},null,1));
 if(bad.length){console.log('\nFAIL:\n  '+bad.join('\n  '));process.exit(1)}console.log('\nPASS');process.exit(0)})().catch(e=>{console.error('\nFAIL: '+(e&&e.stack||e));process.exit(1)});
