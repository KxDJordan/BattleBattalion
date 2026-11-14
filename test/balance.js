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
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),os=require('os');
const ARGV=process.argv.slice(2),arg=(k,d)=>ARGV.includes(k)?ARGV[ARGV.indexOf(k)+1]:d,has=k=>ARGV.includes(k);
const SRC=ARGV.includes('--srcdir')?path.resolve(ARGV[ARGV.indexOf('--srcdir')+1]):path.join(__dirname,'..','src'),SEED=+arg('--seed',20261113),TURNCAP=4000;
const FACS=['gob','undead','beast','orc','bandit','void'],BIOMES=['plains','forest','hills','swamp','desert','snow'],KCOMP=8;
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
 heal:{st:['hp','ms','md'],w:['club','mace','mace'],b:[null,null,null],s:['buckler','kite','heater'],a:['padded','mail','scale'],h:['cap','kettle','barbute']}
};
const S=(bg,role,gift)=>({bg,role,gift:gift||null});
const PROFILES=[
 {id:'L1x4',lvl:1,day:2,tier:-1,team:null},                                     // the company a new game starts with, perk points spent
 {id:'L4x6',lvl:4,day:12,tier:0,team:[S('squire','tank','aura'),S('sellsword','axe'),S('militia','spear'),S('acolyte','heal','chi'),S('hunter','bow'),S('hedge','mage','mana')]},
 {id:'L8x9',lvl:8,day:30,tier:1,team:[S('knight','tank','aura'),S('squire','tank'),S('sellsword','axe'),S('militia','spear'),S('wildling','two','qi'),S('acolyte','heal','chi'),S('hunter','bow'),S('hunter','bow'),S('hedge','mage','mana')]},
 {id:'L12x12',lvl:12,day:50,tier:2,team:[S('knight','tank','aura'),S('squire','tank','aura'),S('sellsword','axe'),S('sellsword','mace'),S('militia','spear'),S('militia','pike'),S('wildling','two','qi'),S('spellblade','blade','qi'),
   S('monk','heal','chi'),S('hunter','bow'),S('hunter','bow'),S('hedge','mage','mana')]}
];
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
function buildCompany(X,P,seed){X.seedRng(seed);X.newGame(true);closeAll(X);const G=X.G;
 if(P.team){G.roster.length=0;for(const s of P.team)G.roster.push(mkMerc(X,s,P))}
 else G.roster.forEach(m=>{m.field=true;learnAll(X,m);m.hp=X.calc(m).hp});
 G.stash.length=0;closeAll(X);return X.clone(G.roster)}
/* ---------- one battle ---------- */
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
async function battle(X,W,job,i){const P=PROFILES.find(p=>p.id===job.prof),G=X.G;G.roster=X.clone(W.comp[P.id][i%KCOMP]);G.stash=[];G.day=P.day;X.B=null;X.mode='world';
 X.seedRng((hash(job.f+'|'+P.id)^Math.imul(i+1,2654435761)^SEED)>>>0);
 const o={f:job.f,mult:1,biome:BIOMES[i%BIOMES.length],pilot:job.pilot,src:{type:'test'},turnCap:TURNCAP};if(job.plan)o.plan=job.plan;if(job.fixed)o.fixed=job.fixed;
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
   try{if(!X){X=makeContext();const {performance}=require('perf_hooks');X.AI_CLOCK=()=>performance.now();W={comp:{}};for(const P of PROFILES){W.comp[P.id]=[];for(let k=0;k<KCOMP;k++)W.comp[P.id].push(buildCompany(X,P,SEED+hash(P.id)%9973+k*101))}}
    const r=await runJob(X,W,job);process.send({id:job.id,r})}
   catch(e){process.send({id:job.id,err:String(e&&e.stack||e)})}}busy=false};
 process.on('message',m=>{if(m==='quit')process.exit(0);q.push(m);pump()});return}
/* ---------- main ---------- */
(async()=>{const QUICK=has('--quick'),N=+arg('--n',QUICK?40:200),NA=+arg('--na',Math.max(20,Math.round(N/2))),J=+arg('--jobs',Math.max(1,Math.min(4,os.cpus().length)));
 const only=arg('--only',null),facs=only?only.split(','):FACS,profs=arg('--prof',null)?arg('--prof').split(','):PROFILES.map(p=>p.id),T0=Date.now();
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
  'engage the archers':p=>{if(p.lock!=null)p.lock=0}
 };
 const jobs=[];let jid=0;const add=(kind,f,prof,pilot,n,plan,tag,fixed)=>{const j={id:jid++,kind,f,prof,pilot,n,plan:plan||null,tag:tag||null,fixed:fixed||null};jobs.push(j);return j};
 for(const f of facs)for(const p of profs)for(const pilot of ['naive','sensible'])add('main',f,p,pilot,N);
 const AP=arg('--aprof','L4x6,L8x9,L12x12').split(',').filter(p=>profs.includes(p)||arg('--prof',null)==null);
 if(!has('--no-abl'))for(const t in TACTICS)for(const f of facs){const p=JSON.parse(JSON.stringify(PLAN[f]||{})),before=JSON.stringify(p);TACTICS[t](p);if(JSON.stringify(p)===before)continue;for(const pr of AP){add('abl',f,pr,'sensible',NA,p,t);add('ablbase',f,pr,'sensible',NA,null,t)}}
 if(!has('--no-cross'))for(const f of facs)for(const g of FACS){for(const pr of AP)add('cross',f,pr,'sensible',NA,PLAN[g],g)}
 if(has('--boss'))for(const pr of ['L8x9','L12x12'])for(const pilot of ['naive','sensible'])add('boss','void',pr,pilot,NA,null,null,['tyrant']);
 // identical jobs (same battles) are run once
 const sig=j=>[j.f,j.prof,j.pilot,j.n,JSON.stringify(j.plan&&JSON.stringify(j.plan)!==JSON.stringify(PLAN[j.f])?j.plan:null),JSON.stringify(j.fixed)].join('|'),uniq=new Map();
 for(const j of jobs){const s=sig(j);if(!uniq.has(s))uniq.set(s,{job:j,res:null})}
 const todo=[...uniq.values()].sort((a,b)=>b.job.n*PROFILES.findIndex(p=>p.id===b.job.prof)-a.job.n*PROFILES.findIndex(p=>p.id===a.job.prof));
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
 for(const f of facs){byF[f]={n:0,s:0,c:0};for(const p of profs){const a=R(jobs.find(j=>j.kind==='main'&&j.f===f&&j.prof===p&&j.pilot==='naive')),b=R(jobs.find(j=>j.kind==='main'&&j.f===f&&j.prof===p&&j.pilot==='sensible'));
   stuck+=a.stuck+b.stuck;const rounds=(a.rounds+b.rounds)/(a.n+b.n);
   console.log(pad(FACT[f].n,16)+pad(p,8)+lp(f1(b.foes/b.n),6)+lp(f1(pct(a)),8)+lp(f1(pct(b)),8)+lp(f1(rounds),8)+lp((a.dead/a.n).toFixed(2),9)+lp((b.dead/b.n).toFixed(2),9)+lp((b.down/b.n).toFixed(2),9));
   byF[f].n+=pct(a);byF[f].s+=pct(b);byF[f].c++;tot.n+=pct(a);tot.s+=pct(b);tot.c++;tot.rounds+=rounds}}
 for(const t of uniq.values())if(t.res){ai.n+=t.res.ai.n;ai.ms+=t.res.ai.ms;ai.max=Math.max(ai.max,t.res.ai.max)}
 console.log('\n== by faction ==');
 for(const f of facs){const n=byF[f].n/byF[f].c,s=byF[f].s/byF[f].c;console.log(pad(FACT[f].n,16)+lp('naive '+f1(n)+'%',14)+lp('sensible '+f1(s)+'%',18)+(n>65?'   NAIVE TOO HIGH':'')+(s<65?'   SENSIBLE TOO LOW':''));if(n>65)bad.push(FACT[f].n+': naive '+f1(n)+'% > 65%');if(s<65)bad.push(FACT[f].n+': sensible '+f1(s)+'% < 65%')}
 const on=tot.n/tot.c,os_=tot.s/tot.c;
 console.log(`\nOVERALL  naive ${f1(on)}%   sensible ${f1(os_)}%   mean rounds ${f1(tot.rounds/tot.c)}   (${N} battles per cell and pilot)`);
 if(on>=50)bad.push('overall naive '+f1(on)+'% >= 50%');if(os_<=80)bad.push('overall sensible '+f1(os_)+'% <= 80%');if(stuck)bad.push(stuck+' battles hit the turn cap');
 /* ---- ablation ---- */
 if(jobs.some(j=>j.kind==='abl')){console.log(`\n== tactic ablation: sensible win % with the tactic removed, change against the full plan (${AP.join('+')}, ${NA} battles each) ==`);
  console.log(pad('tactic removed',24)+facs.map(f=>lp(FACT[f].n.slice(0,12),14)).join(''));
  for(const t in TACTICS){let line=pad(t,24);for(const f of facs){const a=jobs.filter(j=>j.kind==='abl'&&j.tag===t&&j.f===f),b=jobs.filter(j=>j.kind==='ablbase'&&j.tag===t&&j.f===f);
    if(!a.length){line+=lp('·',14);continue}const wa=a.reduce((s,j)=>s+pct(R(j)),0)/a.length,wb=b.reduce((s,j)=>s+pct(R(j)),0)/b.length;line+=lp(f1(wa)+' ('+(wa-wb>=0?'+':'')+f1(wa-wb)+')',14)}console.log(line)}
  console.log('(· = the plan against that faction does not use the tactic, so removing it changes nothing there)')}
 if(jobs.some(j=>j.kind==='cross')){console.log(`\n== plan against faction: sensible win % when it fights the row faction with the column faction's plan (${AP.join('+')}) ==`);
  console.log(pad('fighting \\ plan for',24)+FACS.map(f=>lp(FACT[f].n.slice(0,10),12)).join(''));
  for(const f of facs){let line=pad(FACT[f].n,24),own=0,bestOther=0;for(const g of FACS){const js=jobs.filter(j=>j.kind==='cross'&&j.f===f&&j.tag===g),w=js.reduce((s,j)=>s+pct(R(j)),0)/js.length;if(g===f)own=w;else bestOther=Math.max(bestOther,w);line+=lp((g===f?'[':' ')+f1(w)+(g===f?']':' '),12)}console.log(line)}}
 if(jobs.some(j=>j.kind==='boss')){console.log('\n== rift tyrant (dungeon boss fight, fixed tyrant + even budget) ==');for(const pr of ['L8x9','L12x12']){const a=R(jobs.find(j=>j.kind==='boss'&&j.prof===pr&&j.pilot==='naive')),b=R(jobs.find(j=>j.kind==='boss'&&j.prof===pr&&j.pilot==='sensible'));
   console.log(pad(pr,10)+`naive ${f1(pct(a))}%  sensible ${f1(pct(b))}%  rounds ${f1((a.rounds+b.rounds)/(a.n+b.n))}`)}}
 console.log(`\nAI decision cost: ${(ai.ms/Math.max(1,ai.n)).toFixed(3)} ms per unit turn (mean over ${ai.n} turns), worst single decision ${ai.max.toFixed(1)} ms.   Wall time ${((Date.now()-T0)/1000).toFixed(0)} s.`);
 if(arg('--json',null))fs.writeFileSync(arg('--json'),JSON.stringify({N,NA,seed:SEED,cells:[...uniq.values()].map(t=>({job:t.job,res:t.res}))},null,1));
 if(bad.length){console.log('\nFAIL:\n  '+bad.join('\n  '));process.exit(1)}console.log('\nPASS');process.exit(0)})().catch(e=>{console.error('\nFAIL: '+(e&&e.stack||e));process.exit(1)});
