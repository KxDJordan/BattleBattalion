// Roll log test: node test/rolllog.js [--seed N] [--main DIR]
// The combat log shows every attack roll (rollRec() / rollAdd() in 60-battle-core.js, the lines in 65-battle-ui.js). This test:
//   - runs seeded auto-battles (company, rivals, elites at Brutal, beasts, the void) and wraps the real strike(): every strike that
//     resolves (all but shield splits) leaves exactly one roll line in the log, and that line's numbers agree with what happened:
//     shown hit roll < hit chance <=> the strike hit (and the strike reported a hit), the head roll < head chance <=> the hit landed on
//     the head (the 'hit' event's head), every chance roll's shown number < its chance <=> it came off, and each shown number IS the
//     draw: floor(draw x 100) on the 0..99 scale;
//   - checks the edge cases of the rule (5% and 95% clamps, a sure hit shows no roll, fractional chances);
//   - proves the seeded stream is untouched: the same battles on the main tree's src (--main, default ../owlbear-wt) end in the
//     same digest (winner, turns, rounds, every unit's hitpoints, the rng state).
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261118;
const MAIN=ARGV.includes('--main')?ARGV[ARGV.indexOf('--main')+1]:path.join(__dirname,'..','..','owlbear-wt');
const SKIP=[];let SRC=path.join(__dirname,'..','src');
let finished=false,failed=false;
function fail(msg){failed=true;console.error('\nFAIL: '+msg);process.exit(1)}
function ok(c,msg){if(!c)fail(msg)}
process.on('unhandledRejection',e=>fail('unhandled rejection: '+(e&&e.stack||e)));
process.on('uncaughtException',e=>fail('uncaught exception: '+(e&&e.stack||e)));
process.on('exit',code=>{if(!finished&&!failed&&code===0){console.error('\nFAIL: the run stopped before the end');process.exitCode=1}});
/* ---------- DOM stubs (as test/headless.js) ---------- */
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
 const ctx=vm.createContext(sb);
 const js=fs.readdirSync(SRC).filter(f=>f.endsWith('.js')&&!SKIP.includes(f)).sort().map(f=>`/* ---- ${f} ---- */\n`+fs.readFileSync(path.join(SRC,f),'utf8')).join('\n');
 vm.runInContext("'use strict';\n"+js,ctx,{filename:'wyrdmarch-src.js'});
 const getters=new Map(),setters=new Map(),extra={ctx};
 const X=new Proxy(extra,{get(t,k){if(k in t)return t[k];if(typeof k!=='string')return undefined;if(k in ctx)return ctx[k];
   if(!getters.has(k))getters.set(k,vm.runInContext(`(()=>typeof ${k}==='undefined'?undefined:${k})`,ctx));return getters.get(k)()},
  set(t,k,v){if(k in t){t[k]=v;return true}if(!setters.has(k))setters.set(k,vm.runInContext(`(v=>{${k}=v})`,ctx));setters.get(k)(v);return true}});
 for(const n of ['forecast','strike','hitChance','hurt','losInfo','headChance','startBattle','useAbility','abilityInfo','canUse','validTargets','aiTurn','nextTurn','newGame','closeSheet','newMerc','gainXP','calc','settleBattle','seedRng','rngState'])
  ok(typeof ctx[n]==='function','game function '+n+'() is missing');
 X.FX.on=null;X.SPEEDF=0;return X}
function digest(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')}

/* ---------- the battles (identical on both trees: only the rules' own draws) ---------- */
const BGS=['sellsword','squire','hunter','acolyte','hedge','knight','militia','monk','wildling','spellblade','thief','farmhand'];
const TIERS=[{lvl:3,size:6,day:6,w:[],a:[]},{lvl:8,size:8,day:24,w:['arming','waraxe','warspear','mace','pike','handaxe'],a:['leather','padded','mail']},
 {lvl:14,size:12,day:50,w:['riftedge','waraxe','pike','mace','greataxe','rondel'],a:['plate','scale','mail']}];
function company(X,tier,seed){X.seedRng(seed);X.newGame(true);X.closeSheet(true);const G=X.G;G.roster.length=0;X.seedRng(seed^0x51a7);   // reseeded after newGame: the roster does not hang on how many draws the new world's spawns took (a branch that changes spawning stays comparable)
 for(let i=0;i<tier.size;i++){const m=X.newMerc(BGS[(i+seed)%BGS.length]);m.field=true;X.gainXP(m,X.XPT[tier.lvl]);m.pend=0;m.pp=tier.lvl;X.autoLearn(m);
  const wt=m.eq.w?X.ITEMS[m.eq.w].wt:'fist';
  if(wt==='bow'){if(tier.lvl>4)m.eq.w='warbow'}else if(wt==='staff'){if(tier.lvl>4)m.eq.w='focus'}else if(tier.w.length){m.eq.w=tier.w[(i+seed)%tier.w.length];if(X.ITEMS[m.eq.w].two)m.eq.s=null}
  if(tier.a.length)m.eq.a=tier.a[(i+seed)%tier.a.length];m.hp=X.calc(m).hp;G.roster.push(m)}
 G.day=tier.day;return JSON.parse(JSON.stringify(G.roster))}
// the company plays by script (every ability gets used), the foes by the AI
async function scripted(X,opts){let done=null;const b=X.startBattle(Object.assign({},opts,{quiet:true,turnCap:4000,onEnd:r=>{done=r}}));ok(b,'battle did not start');let spins=0,acts=0,turn=-1;
 while(!done){if(!b.busy&&!b.over&&b.cur&&b.cur.side===0){const u=b.cur;if(turn!==b.turns){turn=b.turns;acts=0}let acted=false;spins=0;
   if(acts<5)for(const id of X.shuffle(['attack'].concat(u.abs))){const a=X.abilityInfo(u,id);if(!X.canUse(u,a))continue;let k=u.r*X.BW+u.c;
     if(a.tgt==='aoe'){if(!b.units.some(t=>t.alive&&t.side!==u.side&&Math.abs(t.c-u.c)+Math.abs(t.r-u.r)===1))continue}
     else if(a.tgt!=='self'){const ts=[...X.validTargets(u,a)];if(!ts.length)continue;k=ts[X.ri(0,ts.length-1)]}
     acts++;acted=true;await X.useAbility(u,a,k);break}
   if(!acted&&!b.over&&!b.busy&&b.cur===u){b.busy=true;await X.aiTurn(u);if(!b.over)X.nextTurn()}}
  else{await null;if(++spins>2e6)fail('scripted battle stalled')}}
 ok(!done.stuck,'scripted battle did not end');return done}
async function battles(X,each){const out=[],bios=['plains','hills','forest','swamp','snow','desert'];let n=0;
 const one=async(label,o,auto)=>{const r=auto?await X.autoBattle(Object.assign({src:{type:'sim'},turnCap:4000},o)):await scripted(X,Object.assign({src:{type:'sim'}},o));ok(r&&!r.stuck,label+' did not end');
  out.push(`${label}:${r.win}:${r.turns}:${r.rounds}:${X.B.units.map(u=>u.hp+'/'+u.arm+'/'+u.helm).join('.')}:${X.rngState()}`);if(each)each(label,X.B);X.settleBattle(r.win);n++};
 for(let ti=0;ti<TIERS.length;ti++){const ros=company(X,TIERS[ti],SEED+ti);
  for(const [i,f] of ['orc','bandit','undead','beast','gob','void'].entries()){X.G.roster=JSON.parse(JSON.stringify(ros));X.G.day=TIERS[ti].day;X.G.diff=i%3===2?'brutal':'normal';X.seedRng(SEED+100*ti+i);await one(`t${ti}-${f}`,{f,mult:1,biome:bios[(i+ti)%6]},i%2===1)}
  // a rival company (its mercs: gear, talents, gifts)
  X.G.roster=JSON.parse(JSON.stringify(ros));const rv=JSON.parse(JSON.stringify(ros)).map((m,i)=>Object.assign(m,{id:'rv'+i,name:'Rival '+m.name}));
  X.G.rivals=[{id:'rF',n:'The Tallymen',pers:'honour',renown:50,crowns:100,roster:rv,stance:0,alive:true,deeds:[]}];X.seedRng(SEED+100*ti+50);await one(`t${ti}-rival`,{f:'rF',rival:'rF',mult:1,biome:'hills'},false);X.G.rivals=[]}
 return out}

/* ---------- the check, around the real strike() ---------- */
const S={strikes:0,lines:0,hits:0,miss:0,sure:0,auto:0,head:0,body:0,procs:{},byU:{0:0,1:0},multi:0,sides:new Set()};
function install(X){const ctx=X.ctx,strike0=ctx.strike,rec0=ctx.rollRec,push0=ctx.logPush,recs=[],lines=[];
 ctx.rollRec=function(u,t,a,o){const R=rec0(u,t,a,o);R._u=u;R._t=t;recs.push(R);return R};
 const all=[];ctx.logPush=function(t,cls,side,R){if(R)lines.push({R,t});if(X.B)all.push({R,t,b:X.B});return push0(t,cls,side,R)};
 let heads=[];const on0=X.FX.on;X.FX.on=(type,d)=>{if(type==='hit'&&d.roll)heads.push({R:d.roll,head:!!d.head});if(on0)on0(type,d)};
 ctx.strike=async function(u,t,a,o){if(!t.alive||!u.alive||a.split)return strike0(u,t,a,o);const mark=recs.length,r0=X.rngState();
  const hit=await strike0(u,t,a,o),R=recs[mark],tag=`${u.name} -> ${t.name} with ${a.id||a.n}${o?' '+JSON.stringify(o):''}`;
  ok(R&&R._u===u&&R._t===t,'a strike left no roll record: '+tag);S.strikes++;S.byU[u.side]++;
  const L=lines.filter(l=>l.R===R);ok(L.length===1,`a strike wrote ${L.length} roll lines (one expected): `+tag);S.lines++;
  const h=R.L.filter(e=>e.k==='hit');ok(h.length<=1,'two hit rolls on one strike: '+tag);
  for(const e of R.L){ok(Number.isInteger(e.n)&&e.n>=0&&e.n<=99,`shown roll ${e.n} is off the 0..99 scale: `+tag);
   ok((e.n<e.c)===e.on,`${e.k} roll shows ${e.n} vs ${e.c}% but ${e.on?'came off':'failed'}: `+tag);
   if(Number.isInteger(e.c))ok(e.n===Math.floor(e.x*100),`${e.k} roll shows ${e.n} but the draw was ${e.x}: `+tag);
   if(e.k!=='hit'&&e.k!=='head')S.procs[e.k]=(S.procs[e.k]||0)+1}
  if(R.k==='roll'){ok(h.length===1&&h[0].on===hit,`the hit roll says ${h[0]&&h[0].on?'hit':'miss'} but strike() returned ${hit}: `+tag);if(hit)S.hits++;else S.miss++;
   ok(/ rolled \d\d vs \d+%/.test(L[0].R?X.rollText(R):''),'a roll line does not read "X rolled NN vs C%": '+X.rollText(R))}
  else{ok(hit,'a strike with no hit roll missed: '+tag);if(R.k==='sure')S.sure++;else S.auto++}
  const hd=R.L.filter(e=>e.k==='head'),ev=heads.filter(x=>x.R===R);
  if(ev.length){ok(hd.length===1&&hd[0].on===ev[0].head,'the head roll disagrees with where the hit landed: '+tag);if(ev[0].head)S.head++;else S.body++}
  if(hd.length&&hd[0].on)ok(/HEAD/.test(X.rollText(R)),'a head hit does not read HEAD: '+X.rollText(R));
  if(!hit)ok(/: miss/.test(X.rollText(R)),'a miss does not read miss: '+X.rollText(R));
  return hit};
 return{lines,all,reset(){recs.length=0;lines.length=0;heads=[]}}}

(async()=>{
 console.log('== the roll rule ==');
 { const X=makeContext(),sh=X.rollShow;
   for(const [x,c,on,n] of [[0,.05,true,0],[.0499999,.05,true,4],[.05,.05,false,5],[.9499999,.95,true,94],[.95,.95,false,95],[.9999999,.95,false,99],[.3,.3,false,30],[.2999999,.3,true,29],[.745,.745,false,75],[.7449,.745,true,74],[.7451,.745,false,75]]){
    const s=sh(x,c,on);ok(s.n===n&&(s.n<s.c)===on,`rollShow(${x}, ${c}) = ${JSON.stringify(s)}, expected ${n}`)}
   // every draw in [0,1) against every whole chance: the shown number is the draw and below the chance exactly when x*100 < chance
   for(let i=0;i<20000;i++){const x=i/20000,c=5+i%91,on=x*100<c,s=sh(x,c/100,on);ok(s.n===Math.floor(x*100)&&(s.n<s.c)===on,'whole-chance rule broken at '+x+' vs '+c)}
   const R=X.rollRec({name:'A',side:0},{name:'B'},{sure:1},{});ok(R.k==='sure','a sure ability must show a sure hit');
   const R2=X.rollRec({name:'A',side:0},{name:'B'},{},{});X.rollAdd(R2,'hit',.5,1,true);ok(R2.k==='sure'&&/sure hit/.test(X.rollText(R2))&&!/rolled/.test(X.rollText(R2)),'a 100% hit chance must read sure hit, with no roll');
   console.log('0..99: shown = floor(draw x 100), success when shown < chance%; clamps and fractional chances agree') }

 console.log('== seeded battles, every strike ==');
 const X=makeContext(),I=install(X);const sample=[];
 let best=-1;   // the sample (--sample FILE): the 40 consecutive lines of one battle that show the most kinds of roll
 const out=await battles(X,(label,b)=>{const A=I.all.filter(l=>l.b===b),L=A.map(l=>l.R?X.rollText(l.R):l.t);
  for(let i=0;i+40<=L.length;i+=4){const W=A.slice(i,i+40),T=L.slice(i,i+40),r=W.filter(l=>l.R),sc=[r.some(l=>l.R.side===0),r.some(l=>l.R.side===1),T.some(t=>/HEAD/.test(t)),T.some(t=>/: miss/.test(t)),T.some(t=>/; /.test(t)),T.some(t=>/sure hit/.test(t)),r.some((l,j)=>j&&l.R.u===r[j-1].R.u&&l.R.side===0)].filter(Boolean).length*10+r.length;
   if(sc>best){best=sc;sample.length=0;sample.push(...T)}}});
 ok(S.strikes>800,'too few strikes checked: '+S.strikes);ok(S.hits>200&&S.miss>100&&S.head>30&&S.body>100,'too few hits / misses / head hits: '+JSON.stringify(S));
 ok(S.byU[0]>200&&S.byU[1]>200,'strikes by both sides: '+JSON.stringify(S.byU));
 ok(Object.keys(S.procs).length>=2,'too few kinds of chance rolls seen: '+JSON.stringify(S.procs));
 console.log(`${out.length} battles, ${S.strikes} strikes (${S.byU[0]} company, ${S.byU[1]} foes): ${S.hits} rolled hits, ${S.miss} misses, ${S.sure} sure, ${S.auto} auto; head ${S.head} / body ${S.body}; chance rolls ${JSON.stringify(S.procs)}`);
 if(ARGV.includes('--sample')){fs.writeFileSync(ARGV[ARGV.indexOf('--sample')+1],sample.join('\n')+'\n');console.log('sample written')}

 console.log('== the seeded stream is the main tree\'s ==');
 if(!fs.existsSync(path.join(MAIN,'src','60-battle-core.js')))console.log('skipped: no main tree at '+MAIN+' (--main DIR)');
 else{SRC=path.join(MAIN,'src');const Y=makeContext(),out2=await battles(Y);
  for(let i=0;i<out.length;i++)ok(out[i]===out2[i],`battle ${i} differs from the main tree:\n  ${out[i]}\n  ${out2[i]}`);
  console.log(`${out.length} battles identical to ${MAIN} (digest ${digest(out.join('|'))})`)}
 finished=true;console.log('\nrolllog: all checks passed')})();
