// Forecast test. Plain node, no browser:  node test/forecast.js [--seed N] [--verbose]
// Loads src/*.js the way build.js concatenates them (same vm approach as test/headless.js), wraps the real
// strike() and proves, strike by strike, that forecast(u,t,a,o):
//   - consumes no rnd() and changes nothing (attacker, target and board are byte-identical afterwards),
//   - reports exactly hitChance(u,t,a),
//   - brackets the hitpoint and armor damage the real hit then does (taken from the 'hit' event of hurt()),
//   - calls kills correctly (kill=false never dies, sure=true always dies) and lists every status a hit applies,
//   - Phase 5: brackets head and body hits separately (helmet against body armor, x1.5 on the head), prices cover into the
//     hit chance, names every ally a missed shot can stray into, announces ripostes, heavy hits (morale check, injury),
//     armor-piercing blows and shield damage, and carries both sides' morale.
//   - Elites: battles at Brutal where elite foes (64e-elites.js: ward, venom, hex, berserk, keen eye, command...) strike and are struck.
//   - Rivals: battles against a rival mercenary company (startBattle o.rival): rival mercs strike with their own gear, talents and gift
//     abilities and are struck in their own armor, and every one of those strikes is checked the same way.
// Two sources of strikes: scripted battles (company uses every ability, enemies use the AI) and a directed
// sweep over weapons, abilities, armor states, heights, buffs, perks, morale, cover, shields and splash/arc options.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),VERBOSE=ARGV.includes('--verbose');
const SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261113;
const SKIP=ARGV.includes('--skip')?ARGV[ARGV.indexOf('--skip')+1].split(','):[];          // --skip 63-ai.js,64-foes.js: run the rules without those files
const SRC=path.join(__dirname,'..','src'),T0=Date.now();
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

/* ---------- the check, wrapped around the real strike() ---------- */
const S={trU:0,trT:0,lucky:0,luckySaved:0,bwise:0,tired:0,tiredT:0,armP:0,sidestep:0,brace:0,crush:0,reach:0,tal:0,swap:0,wmod:0,weak:0,undy:0,undySaved:0,marked:0,slung:0,n:0,hits:0,expHits:0,varHits:0,atMin:0,atMax:0,kills:0,lethal:0,armored:0,bare:0,broke:0,high:0,low:0,statuses:0,kb:0,splash:0,auto:0,magic:0,
 head:0,body:0,headAtMax:0,cover:0,ffRisk:0,stray:0,riposte:0,free:0,pierce:0,split:0,splitBroke:0,bleed:0,shake:0,inj:0,morAtt:0,morDef:0,byAb:{},byWt:{}};
const snap=(X,u,t)=>JSON.stringify([u,t,X.B.tiles]);
let DIRECTED=false;const nested=[];                 // strikes started from inside another strike (strays, ripostes): {u,t,o}
function install(X){const ctx=X.ctx,strike0=ctx.strike,dist=(a,b)=>Math.abs(a.c-b.c)+Math.abs(a.r-b.r);
 // statuses a strike inflicts go through the rules' addStatus(); states other code derives from the board (auras, fatigue) are not the strike's doing
 const given=[],add0=ctx.addStatus;ctx.addStatus=function(t,key,n){const had=t.st[key]||0;const r=add0(t,key,n);if((t.st[key]||0)>had)given.push({t,key});return r};
 ctx.strike=async function(u,t,a,o){if(!t.alive||!u.alive)return strike0(u,t,a,o);
  const tag=`${u.name} -> ${t.name} with ${a.id||a.n} (${u.wpn.wt}${o?' '+JSON.stringify(o):''})`;nested.push({u,t,o:o||{}});const mark=nested.length,gmark=given.length;
  const s0=snap(X,u,t),r0=X.rngState(),f=X.forecast(u,t,a,o),f2=X.forecast(u,t,a,o);
  ok(X.rngState()===r0,'forecast consumed rnd(): '+tag);ok(snap(X,u,t)===s0,'forecast changed game state: '+tag);
  ok(JSON.stringify(f,(k,v)=>k==='t'&&v&&v.name?v.name:v)===JSON.stringify(f2,(k,v)=>k==='t'&&v&&v.name?v.name:v),'forecast is not repeatable: '+tag);
  for(const k of ['hit','dmgMin','dmgMax','hpMin','hpMax','armMin','armMax','headCh','cover'])ok(Number.isFinite(f[k]),`forecast.${k} is not a number: `+tag);
  ok(typeof f.kill==='boolean'&&Array.isArray(f.statuses)&&Array.isArray(f.ff)&&f.mor&&typeof f.blocked==='boolean','forecast shape: '+tag);
  const sure=!!(o&&o.auto)||(!!a.sure&&!(a.split&&!t.shield));
  ok(f.hit===(sure?100:X.hitChance(u,t,a)),`forecast hit ${f.hit} is not hitChance ${X.hitChance(u,t,a)}: `+tag);
  // fatigue and armor-tree parts of the hit chance and the damage
  const fsure=!!(o&&o.auto)||!!a.sure;ok(f.tiredAtt===(fsure?0:X.tiredPen(u))&&f.tiredDef===(fsure?0:X.tiredPen(t))&&f.armDef===(fsure?0:X.armorDef(u,t,a)),'forecast fatigue / armor defense parts differ from the rules: '+tag);
  ok(f.armDr===(a.split||a.noDmg?0:X.armorDr(t))&&f.soak===((t.flags&&t.flags.hpSoak)||0),'forecast armor damage-reduction parts differ: '+tag);
  if(u.fatMax>=999||t.fatMax>=999)ok((u.fatMax<999||f.tiredAtt===0)&&(t.fatMax<999||f.tiredDef===0),'a unit that does not tire paid for fatigue: '+tag);
  if(f.tiredAtt>0)S.tired++;if(f.tiredDef>0)S.tiredT++;if(f.armDef||f.armDr||f.soak||f.sidestep)S.armP++;if(f.sidestep)S.sidestep++;if(t.flags&&t.flags.brace&&!t.brc)S.brace++;
  ok(f.dmgMin<=f.dmgMax&&f.hpMin<=f.hpMax&&f.armMin<=f.armMax&&f.hpMin>=0&&f.armMin>=0,'forecast range is inverted: '+tag);
  ok(f.headCh>=0&&f.headCh<=100&&(f.headCh>0)===!!f.head&&(f.headCh<100)===!!f.body,'forecast head/body split is inconsistent: '+tag);
  { const L=X.losInfo(u,t,a);ok(f.cover===L.cover&&f.blocked===L.blocked,'forecast cover or line of fire differs from losInfo: '+tag);
    ok(f.mor.att===X.MORFX[u.mor].hit&&f.mor.def===X.MORFX[t.mor].def,'forecast morale differs from the units: '+tag);
    if(!DIRECTED&&!(o&&(o.splash||o.auto||o.free)))ok(!f.blocked,'the game ordered a strike with no line of fire: '+tag);
    if(f.cover>0&&!sure)S.cover++;
    if(f.ff.length){S.ffRisk++;ok(f.ff.every(x=>x.t&&x.t.side===u.side&&x.t!==u&&x.ch>0&&L.ff.includes(x.t))&&f.ff.length===L.ff.length,'forecast friendly-fire list differs from losInfo: '+tag)} }
  const hp0=t.hp,arm0=t.arm,helm0=t.helm,shp0=t.shp,shield0=t.shield,st0=Object.assign({},t.st),inj0=t.m?t.m.inj.length:0,heavyAt=Math.max(8,Math.ceil(t.hpMax*X.HEAVYHIT)),hd=X.B.tiles[u.r*X.BW+u.c].h-X.B.tiles[t.r*X.BW+t.c].h,d0=dist(u,t);let ev=null,died=false,injured=false;
  const on0=X.FX.on;X.FX.on=(type,d)=>{if(type==='hit'&&d.u===u&&d.t===t&&!ev){ev={dmg:d.dmg,armor:d.armor,head:!!d.head,hpAt:t.hp};died=t.hp<=0}if(type==='injury'&&d.t===t)injured=true;if(on0)on0(type,d)};
  let hit;try{hit=await strike0(u,t,a,o)}finally{X.FX.on=on0}
  const kids=nested.slice(mark).filter(x=>x.u===u||x.t===u);
  S.n++;if(f.crush>0)S.crush++;if(f.reach)S.reach++;S.expHits+=f.hit/100;S.varHits+=f.hit/100*(1-f.hit/100);const id=a.id||a.n;S.byAb[id]=(S.byAb[id]||0)+1;S.byWt[u.wpn.wt]=(S.byWt[u.wpn.wt]||0)+1;
  if(f.mor.att)S.morAtt++;if(f.mor.def)S.morDef++;if(o&&o.free)S.free++;if(o&&o.stray)S.stray++;
  if(a.split){ok(hit===!!shield0,'splitting a shield must always land on a shield bearer: '+tag);ok(!ev&&t.hp===hp0&&t.arm===arm0&&t.helm===helm0,'splitting a shield hurt its bearer: '+tag);
   if(shield0){const sd=shp0-t.shp;S.split++;S.hits++;ok(f.shield&&f.shield.hp===shp0&&sd>=f.shield.min&&sd<=f.shield.max,`shield damage ${sd} outside forecast ${f.shield&&f.shield.min}-${f.shield&&f.shield.max}: `+tag);
    if(!t.shield){S.splitBroke++;ok(f.shield.brk&&t.shp===0,'the shield broke but the forecast said it could not: '+tag)}else ok(!f.shield.sure,'the forecast promised a broken shield: '+tag)}
   else ok(f.shield===null,'forecast shows shield damage on a unit without a shield: '+tag);return hit}
  if(a.shieldD&&shield0){ok(f.shield&&f.shield.min===Math.min(a.shieldD,shp0),'a Petard forecasts its shield damage: '+tag);ok(!hit||!t.alive||shp0-t.shp===Math.min(a.shieldD,shp0),'a Petard took '+(shp0-t.shp)+' off the shield: '+tag)}   // the gun trees: a Petard's charge on a raised shield
  else ok(f.shield===null&&t.shp===shp0,'a blow that does not split shields damaged one: '+tag);
  if(!hit){const strays=kids.filter(x=>x.u===u&&x.o.stray),rips=kids.filter(x=>x.u===t&&x.t===u&&x.o.free==='riposte'),thorn=rips.length&&u.elite&&(u.elite.includes('thorns')||(u.elite.includes('volatile')&&!u.alive));   // a riposte into a Thorned elite costs the riposter; one that kills a Volatile elite takes its blast
   ok(!ev&&(thorn||t.hp===hp0&&t.arm===arm0&&t.helm===helm0),'a miss did damage: '+tag);ok(!sure,'a strike that cannot miss missed: '+tag);
   for(const x of strays)ok(f.ff.some(y=>y.t===x.t),'a shot strayed into an ally the forecast did not name: '+tag);ok(strays.length<=1,'one miss strayed twice: '+tag);
   if(rips.length){S.riposte++;ok(f.riposte,'a riposte the forecast did not announce: '+tag)}else ok(!f.riposte,'the forecast announced a riposte that did not come: '+tag);
   return hit}
  S.hits++;if(hd>0)S.high++;else if(hd<0)S.low++;if(o&&o.splash)S.splash++;if(o&&o.auto)S.auto++;if(a.magic)S.magic++;
  const hp=ev?ev.dmg:0,arm=ev?ev.armor:0;
  if(!ev)ok(f.dmgMin===0,`a hit did no damage but the forecast promised at least ${f.dmgMin}: `+tag);
  ok(hp>=f.hpMin&&hp<=f.hpMax,`hitpoint damage ${hp} outside forecast ${f.hpMin}-${f.hpMax} (hp ${hp0}, armor ${arm0}, helmet ${helm0}): `+tag);
  ok(arm>=f.armMin&&arm<=f.armMax,`armor damage ${arm} outside forecast ${f.armMin}-${f.armMax} (hp ${hp0}, armor ${arm0}, helmet ${helm0}): `+tag);
  if(ev){const L=ev.head?f.head:f.body,nm=ev.head?'head':'body';ok(L,`a hit landed on the ${nm} but the forecast rules that out: `+tag);
   ok(hp>=L.hpMin&&hp<=L.hpMax&&arm>=L.armMin&&arm<=L.armMax,`${nm} hit ${hp} hp / ${arm} armor outside its forecast ${L.hpMin}-${L.hpMax} / ${L.armMin}-${L.armMax}: `+tag);
   ok(ev.head?helm0-t.helm===arm:t.helm===helm0&&arm0-t.arm>=arm,'the wrong armor pool soaked the hit: '+tag);
   if(a.pierce){S.pierce++;ok(arm===0&&f.pierce&&f.armMax===0,'an armor-piercing blow wore armor down: '+tag)}
   if(ev.head){S.head++;if(hp===L.hpMax)S.headAtMax++}else S.body++;
   const pool0=ev.head?helm0:arm0;if(pool0>0){S.armored++;if(arm>=pool0)S.broke++}else S.bare++;
   if(died)ok(L.kill,'the hit killed but the forecast for that location said it could not: '+tag);else ok(!L.sure,'the forecast promised a kill on that location: '+tag)}
  if(hp===f.hpMin&&arm===f.armMin)S.atMin++;if(hp===f.hpMax&&arm===f.armMax)S.atMax++;
  if(died){S.kills++;ok(f.kill,'the hit killed but the forecast said it could not: '+tag)}else ok(!f.sure,'the forecast promised a kill that did not happen: '+tag);
  if(f.undying&&ev&&hp>=hp0&&t.flags&&t.flags.lucky&&t.lck){S.luckySaved++;ok(ev.hpAt===1&&!f.kill,'Lucky did not hold: '+tag)}
  if(f.undying&&ev&&hp>=hp0){S.undySaved++;ok(ev.hpAt===1&&!f.kill,'Undying did not hold: '+tag)}
  if(f.kill)S.lethal++;ok(f.kill===(!f.undying&&f.hpMax>=hp0)&&f.sure===(!f.undying&&f.hpMin>=hp0),'kill flags disagree with the range: '+tag);
  if(!died&&ev&&t.alive){const heavy=hp>=heavyAt;                      // (a knockback that then kills is not this hit's doing)
   if(heavy&&!t.fearless&&!(t.flags&&t.flags.noStun)&&X.moraleImmune(t)){S.beastwise=(S.beastwise||0)+1;ok(!f.shake,'the forecast warned of a shake on a Beast-wise merc against beasts: '+tag)}
   else if(heavy&&!t.fearless&&!(t.flags&&t.flags.noStun)){S.shake++;ok(f.shake,'a heavy hit shook the target but the forecast did not warn: '+tag)}
   if(injured){S.inj++;ok(f.injure&&heavy&&t.m&&t.m.inj.length===inj0+1,'an injury the forecast did not warn of: '+tag)}}
  if(!died){for(const s of f.statuses){if(s.ch>=1)ok((t.st[s.k]||0)>=s.n||!t.alive,`status ${s.k} was forecast as certain but not applied: `+tag)}
   if(t.alive)for(const k of new Set(given.slice(gmark).filter(x=>x.t===t).map(x=>x.key)))if((t.st[k]||0)>(st0[k]||0)){S.statuses++;if(k==='bleed')S.bleed++;ok(f.statuses.some(s=>s.k===k&&s.n>=t.st[k]&&s.ch>0),`status ${k} was applied but not forecast: `+tag)}
   if(a.bleed&&hp>0&&t.alive)ok(t.st.bleed>=a.bleed,'a wound that reached flesh did not bleed: '+tag);
   if(d0>1&&f.kb&&f.kb.ch>0)S.kb++}
  return hit};}

/* ---------- strikes from real battles ---------- */
const BGS=['sellsword','squire','hunter','acolyte','hedge','knight','militia','monk','wildling','spellblade','thief','farmhand'];
const TIERS=[{lvl:1,size:4,day:2,w:[],a:[]},{lvl:5,size:6,day:12,w:['arming','waraxe','warspear','mace','pike'],a:['leather','padded']},
 {lvl:10,size:9,day:30,w:['runeblade','greataxe','warspear','mace','rondel'],a:['mail','scale','robe']},{lvl:14,size:12,day:50,w:['riftedge','waraxe','pike','mace','greataxe'],a:['plate','scale','mail']}];
function company(X,tier,seed){X.seedRng(seed);X.newGame(true);X.closeSheet(true);const G=X.G;G.roster.length=0;
 for(let i=0;i<tier.size;i++){const m=X.newMerc(BGS[(i+seed)%BGS.length]);m.field=true;X.gainXP(m,X.XPT[tier.lvl]);m.pend=0;m.pp=0;
  m.pp=tier.lvl;X.autoLearn(m);
  const wt=m.eq.w?X.ITEMS[m.eq.w].wt:'fist';
  if(wt==='bow'){if(tier.lvl>4)m.eq.w='warbow'}else if(wt==='staff'){if(tier.lvl>4)m.eq.w='focus'}else if(tier.w.length){m.eq.w=tier.w[(i+seed)%tier.w.length];if(X.ITEMS[m.eq.w].two)m.eq.s=null}
  if(tier.a.length)m.eq.a=tier.a[(i+seed)%tier.a.length];m.hp=X.calc(m).hp;G.roster.push(m)}
 G.day=tier.day;return JSON.parse(JSON.stringify(G.roster))}
async function scripted(X,opts){let done=null;const b=X.startBattle(Object.assign({},opts,{quiet:true,turnCap:6000,onEnd:r=>{done=r}}));ok(b,'battle did not start');let spins=0,acts=0,turn=-1;
 while(!done){if(!b.busy&&!b.over&&b.cur&&b.cur.side===0){const u=b.cur;if(turn!==b.turns){turn=b.turns;acts=0}let acted=false;spins=0;
   if(acts<5)for(const id of X.shuffle(['attack'].concat(u.abs))){const a=X.abilityInfo(u,id);if(!X.canUse(u,a))continue;let k=u.r*X.BW+u.c;
     if(a.tgt==='aoe'){if(!b.units.some(t=>t.alive&&t.side!==u.side&&Math.abs(t.c-u.c)+Math.abs(t.r-u.r)===1))continue}
     else if(a.tgt!=='self'){const ts=[...X.validTargets(u,a)];if(!ts.length)continue;k=ts[X.ri(0,ts.length-1)]}
     acts++;acted=true;await X.useAbility(u,a,k);break}
   if(!acted&&!b.over&&!b.busy&&b.cur===u){b.busy=true;await X.aiTurn(u);if(!b.over)X.nextTurn()}}
  else{await null;if(++spins>2e6)fail('scripted battle stalled')}}
 ok(!done.stuck,'scripted battle did not end');X.settleBattle(done.win)}

/* ---------- directed sweep: every weapon x ability x armor and helmet state x height x buff x morale x cover, struck for real ---------- */
// talent flags and mods the sweep puts on attackers (TALU) and targets (TALT); every one changes a number the forecast must match
const TALU=[['vsHurt',.15],['vsFull',.2],['dmgMelee',.1],['dmgRanged',.15],['twoDmg',.1],['lowHpDmg',.2],['duelHit',6],['duelDmg',.15],['flankDmg',.15],['flank',10],['spellB',.1],['ignB',.15],['headB',10],['bleedOn',2],['splitB',.5],['coverIgn',1],['longShot',1],
  // the rogues' trees (64r-rogues.js): light-weapon, unacted-foe and impaired-foe terms, bleed and poison riding on light blows
  ['stabDmg',.15],['stabHit',5],['wakeDmg',.2],['lightBleed',2],['lightPoison',2],['dirtyDmg',.2],['dirtyHit',10],['firstHit',10],['firstDmg',.1]],
 TALT=[['adjDef',6],['loneDef',10],['drB',.1],['drRanged',.15],['drMelee',.1],['lastStand',.15],['undying',1],
  // armor trees (light, medium, heavy)
  ['nimble',1],['fleet',10],['sidestep',.25],['freshDef',8],['dance',5],['brace',.2],['roll',.5],['layerDef',6],['padIgn',1/3],['kbImm',1],['unbowed',.3],['hpSoak',5],['noStun',1],['flow',4]],mates0=new Set();
async function sweep(X,roster,N){X.G.roster=JSON.parse(JSON.stringify(roster));X.seedRng(SEED+900);
 const b=X.startBattle({f:'orc',mult:1,biome:'hills',src:{type:'sim'},quiet:true,turnCap:1e9});ok(b,'sweep battle did not start');b.busy=true;DIRECTED=true;
 for(const x of b.units){delete x.elite;x.ward=0}   // the sweep randomises flags itself: elites are covered by the battles above and test/elites.js
 const R=(a,c)=>X.ri(a,c),P=a=>a[X.ri(0,a.length-1)],BW=X.BW,BH=X.BH,key=(c,r)=>r*BW+c;
 const weapons=Object.keys(X.ITEMS).filter(id=>X.ITEMS[id].k==='w').map(id=>X.ITEMS[id]).concat([X.FIST]);
 const abIds=['attack'].concat(Object.keys(X.AB).filter(id=>{const a=X.AB[id];return a.tgt==='enemy'||a.tgt==='aoe'}));
 const pu=b.units.filter(u=>u.side===0),eu=b.units.filter(u=>u.side===1);
 const foes=Object.keys(X.EN),KEEP=['hpMax','fatMax','ms','rs','md','rd','init','brv','dmgB','apMax'];
 for(const x of b.units){x.keep={};for(const k of KEEP)x.keep[k]=x[k]}
 for(let i=0;i<N;i++){const fromFoe=i%4===3,u=fromFoe?P(eu):P(pu),t=fromFoe?P(pu):P(eu);
  for(const x of b.units){for(const k of KEEP)x[k]=x.keep[k];x.alive=true;x.gone=null;x.hp=x.hpMax;x.arm=x.armMax;x.helm=x.helmMax;x.st={};x.buffs=[];x.down=false;x.bzk=1;x.mor=3;x.fearless=false;x.dazed=false;x.rooted=false;x.shield=false;x.shp=0;x.c=-9;x.r=-9;if(x.m)x.m.inj=[]}
  b.rout=[false,false];b.fledN=[0,0];b.gone=[];
  for(const tl of b.tiles){tl.t='ground';tl.h=R(0,3)}
  let a,o;
  if(fromFoe){const d=X.EN[P(foes)];u.def=d;u.wpn={n:'',wt:d.rng?'bow':'sword',d:d.d,ap:4,fat:0,rng:d.rng||1,ign:.25};u.kbN=d.kb||0;u.kbCh=d.kbCh||0;u.onhit=d.onhit;u.ms=d.ms;u.rs=d.rs||0;
   a=d.spell&&R(0,1)?{id:'spell',n:d.spell.n,magic:d.spell.d,ign:.5,status:d.spell.status}:R(0,5)?X.abilityInfo(u,'attack'):X.FREEAB}
  else{u.wpn=P(weapons);u.flags={};if(R(0,2)===0)u.flags.exec=1;if(R(0,3)===0)u.flags.berserk=1;u.dmgB=P([0,0,.1,.2]);u.lvl=R(1,15);
   if(R(0,1)===0){S.tal++;for(const [k,v] of TALU)if(R(0,3)===0)u.flags[k]=v}                     // talent flags and mods on the attacker
   if(R(0,4)===0&&u.m&&u.m.eq.b&&X.swapWeapons(u)){S.swap++;if(R(0,1))u.wpn=Object.assign({},u.wpn,{d:u.wpn.d.slice()})}      // the weapon in hand after a real swap
   if(R(0,5)===0){u.wpn=Object.assign({},u.wpn,{d:[u.wpn.d[0]+R(0,6),u.wpn.d[1]+R(6,9)],stun:P([0,.1,.25]),ign:(u.wpn.ign||.2)+P([0,.1,.2]),hit:(u.wpn.hit||0)+P([0,5])});S.wmod++}   // weapon-tree changes
   if(R(0,6)===0){u.st.weak=1;S.weak++}
   a=X.abilityInfo(u,P(abIds));if(R(0,3)===0)u.buffs.push({dmg:.2,ms:12,rs:12,dur:2});
   if(i%60===1){u.wpn=X.ITEMS[P(['handaxe','waraxe','greataxe'])];a=X.abilityInfo(u,'split')}                    // directed: shield splits are covered whatever the random stream does
   else if(i%60===5){u.wpn=X.ITEMS[P(['mallet','warhammer','maul','warmaul'])];a=X.abilityInfo(u,P(['attack','batter','attack']))}   // armor crushing
   else if(i%60===9){u.wpn=X.ITEMS[P(['bill','halberd','glaive','greatsword','zweihander','runegreat','pike'])];a=X.abilityInfo(u,'attack')}   // reach 2
   else if(i%60===13){u.wpn=X.ITEMS[P(['lightxbow','crossbow','arbalest','pistol','duelpistol','musket'])];a=X.abilityInfo(u,'attack')}}       // crossbows and firearms
  if(a.aoe&&R(0,2)===0)o={splash:.7};else if(a.chain&&R(0,1)===0)o={splash:.6,auto:1};else if(a===X.FREEAB)o={free:'zoc'};
  t.flags=t.side===0?Object.assign({},t.flags):{};if(R(0,2)===0)t.flags.forged=1;else delete t.flags.forged;
  if(R(0,1)===0)for(const [k,v] of TALT)if(R(0,3)===0)t.flags[k]=v;
  // character traits (phase 6) the forecast must follow: Hard-headed / Glass-jawed on the target, Lucky (spent or not), Beast-wise in a fight with
  // beasts (no shake), and Steady-handed / Bloodthirsty / Hulking on a company attacker
  b.opts.f=R(0,4)===0?'beast':'orc';
  if(R(0,2)===0){S.trT++;const k=P(['hard','glass','lucky','beast']);if(k==='hard')t.flags.headDef=(t.flags.headDef||0)+10;else if(k==='glass')t.flags.headDef=(t.flags.headDef||0)-10;
   else if(k==='lucky'){t.flags.lucky=1;t.lck=R(0,1);if(!t.lck)S.lucky++}else if(t.side===0){t.flags.beastwise=1;if(b.opts.f==='beast')S.bwise++}}else t.lck=0;
  if(fromFoe&&R(0,2)===0){b.opts.f='beast';t.flags.beastwise=1;S.bwise++}
  if(!fromFoe&&R(0,2)===0){S.trU++;const k=P(['steady','blood','hulk']);if(k==='steady')u.flags.headB=(u.flags.headB||0)+5;else if(k==='blood')u.flags.vsHurt=(u.flags.vsHurt||0)+.1;else u.flags.dmgMelee=(u.flags.dmgMelee||0)+.05}
  // fatigue on both sides (units that tire), and the turn state the armor perks read
  for(const x of [u,t]){x.fat=x.fatMax<999&&R(0,1)===0?R(0,x.fatMax):0}if(R(0,5)===0){u.fatMax=R(40,110);u.fat=R(0,u.fatMax)}
  t.aw=R(0,40);t.mvd=R(0,1);t.dnc=R(0,4);t.ss=R(0,2)===0?1:0;t.brc=R(0,2)===0?1:0;t.undy=R(0,1);if(t.flags.undying&&!t.undy)S.undy++;if(R(0,5)===0){t.st.marked=1;S.marked++}
  for(const x of b.units)if(x!==u&&x!==t){x.flags=R(0,3)===0?{cmd:5}:R(0,3)===0?{guard:8}:R(0,2)===0?{steelWall:.1}:{}}
  // the rogues: the target still waiting for its turn (Before they wake, Quicker than thought), blinded or marked for death (their numbers through foeAuras)
  b.order=R(0,1)?[t]:[];if(R(0,4)===0){t.st.blinded=2;S.rg=(S.rg||0)+1}if(R(0,4)===0){t.st.doomed=2;S.rg=(S.rg||0)+1}X.foeAuras();
  if(u.flags&&(u.flags.stabDmg||u.flags.wakeDmg||u.flags.lightPoison)&&X.isLightW(u.wpn))S.rgL=(S.rgL||0)+1;
  const bt=R(0,5);if(bt===0)t.buffs.push({dr:.5,indom:1,dur:2});else if(bt===1)t.buffs.push({md:15,rd:15,dr:.25,dur:2});else if(bt===2){t.buffs.push({dr:.5,indom:1,dur:2});t.buffs.push({md:15,rd:15,dr:.25,dur:2})}
  t.armMax=P([0,15,60,150,300]);const am=R(0,4);t.arm=am===0?0:am===1?Math.min(t.armMax,R(1,12)):am===2?Math.round(t.armMax*R(10,90)/100):t.armMax;
  t.helmMax=P([0,20,70,140,240]);const hm=R(0,4);t.helm=hm===0?0:hm===1?Math.min(t.helmMax,R(1,12)):hm===2?Math.round(t.helmMax*R(10,90)/100):t.helmMax;
  t.hp=R(0,3)===0?R(1,12):R(0,2)===0?Math.max(1,Math.round(t.hpMax*R(15,49)/100)):t.hpMax;if(R(0,5)===0)t.st.stun=1;
  if(R(0,2)===0)u.mor=R(1,4);if(R(0,2)===0)t.mor=R(0,4);if(R(0,7)===0)t.fearless=true;if(R(0,6)===0)u.st.daze=1;if(R(0,9)===0)t.st.webbed=1;
  if(a.split||R(0,3)===0){t.shield=true;t.shpMax=P([32,64,80]);t.shp=R(0,2)?t.shpMax:R(1,t.shpMax);t.shb={md:0,rd:0};if(R(0,4)===0){t.shield=false;t.slung=true;S.slung++}else t.slung=false}else t.slung=false
  const d=Math.min(BW-2,Math.max(1,Math.min(a.rng||1,R(1,7))));u.c=R(0,BW-1-d);u.r=R(1,BH-2);t.c=u.c+d;t.r=u.r;
  const hs=R(0,2);b.tiles[key(u.c,u.r)].h=hs===0?2:hs===1?1:0;b.tiles[key(t.c,t.r)].h=hs===0?0:hs===1?1:2;
  if(d===1&&!a.magic&&R(0,2)===0)t.buffs.push({key:'riposte',rip:1,dur:1});
  if(d>1){const mates=b.units.filter(x=>x!==u&&x!==t);let n=0;for(let c=u.c+1;c<t.c&&n<3;c++)if(R(0,2)===0){const x=mates.splice(R(0,mates.length-1),1)[0];x.c=c;x.r=u.r;n++}}   // bodies in the line of fire: cover, and allies to hit by mistake
  X.auraScan();
  await X.strike(u,t,a,o)}
 b.over=true;DIRECTED=false}

(async()=>{const X=makeContext();install(X);
 console.log('== strikes in scripted battles ==');
 const facs=Object.keys(X.FACT),bios=Object.keys(X.BIO);let nb=0;
 for(let ti=0;ti<TIERS.length;ti++){const roster=company(X,TIERS[ti],SEED+ti*17);
  for(let i=0;i<9;i++){X.G.roster=JSON.parse(JSON.stringify(roster));X.G.day=TIERS[ti].day;X.seedRng(SEED+100*ti+i);await scripted(X,{f:facs[(i+ti)%facs.length],mult:[.8,1,1.3][i%3],biome:bios[(i*2+ti)%bios.length],src:{type:'sim'}});nb++}}
 const n0=S.n;console.log(`${nb} battles, ${n0} strikes checked`);
 console.log('== strikes against rival companies ==');
 { const st=X.ctx.strike,R={u:0,t:0,ab:new Set()};X.ctx.strike=async function(u,t,a,o){if(u.m&&u.side===1){R.u++;R.ab.add(a.id||a.n)}if(t.m&&t.side===1)R.t++;return st(u,t,a,o)};
   for(let ti=0;ti<TIERS.length;ti++){const roster=company(X,TIERS[ti],SEED+ti*17),rv=company(X,TIERS[ti],SEED+ti*17+555);rv.forEach((m,k)=>{m.id=800000+k});
    for(let i=0;i<4;i++){X.G.roster=JSON.parse(JSON.stringify(roster));X.G.day=TIERS[ti].day;X.G.rivals=[{id:'rF',n:'The Forecasters',pers:['honour','cutthroat','glory'][i],renown:50,crowns:100,roster:JSON.parse(JSON.stringify(rv)),stance:0,alive:true,deeds:[]}];
     X.seedRng(SEED+700+10*ti+i);await scripted(X,{f:'rF',rival:'rF',mult:1,biome:bios[(i+ti)%bios.length],src:{type:'sim'}});nb++}}
   X.ctx.strike=st;X.G.rivals=[];ok(R.u>200&&R.t>200,`too few rival strikes checked (${R.u} by rival mercs, ${R.t} on them)`);
   console.log(`16 battles, ${S.n-n0} strikes checked: ${R.u} by rival mercs (${[...R.ab].sort().join(' ')}), ${R.t} on them`) }
 console.log('== strikes with fabled warriors (o.fabled mixed into EN bands, a fabled boss with phases) ==');
 { const st=X.ctx.strike,R={u:0,t:0,ab:new Set()},n1=S.n,ids=Object.keys(X.FABLED);X.ctx.strike=async function(u,t,a,o){if(u.fabled){R.u++;R.ab.add(a.id||a.n)}if(t.fabled)R.t++;return st(u,t,a,o)};
   for(let ti=0;ti<TIERS.length;ti++){const roster=company(X,TIERS[ti],SEED+ti*17);
    for(let i=0;i<10;i++){X.G.roster=JSON.parse(JSON.stringify(roster));X.G.day=TIERS[ti].day;X.G.fabled={};const f2=[ids[(ti*4+i)%ids.length],ids[(ti*4+i+7)%ids.length]];
     X.seedRng(SEED+900+10*ti+i);await scripted(X,{f:facs[(i+ti)%facs.length],mult:.7,fabled:f2,boss:i%2?{fabled:f2[0],phases:[{at:.6,n:'Test phase',summon:[Object.keys(X.EN)[0]],enrage:{dmg:.1}}]}:null,biome:bios[(i+ti)%bios.length],src:{type:'sim'}});nb++}}
   X.ctx.strike=st;X.G.fabled={};ok(R.u>150&&R.t>80,`too few fabled strikes checked (${R.u} by fabled warriors, ${R.t} on them)`);
   console.log(`40 battles, ${S.n-n1} strikes checked: ${R.u} by fabled warriors (${[...R.ab].sort().join(' ')}), ${R.t} on them`) }
 console.log('== strikes with elite foes (64e-elites.js: Brutal, levels 10 and 14) ==');
 { const st=X.ctx.strike,R={u:0,t:0,mods:new Set()},n1=S.n,d0=X.G.diff;X.ctx.strike=async function(u,t,a,o){if(u.elite){R.u++;u.elite.forEach(k=>R.mods.add(k))}if(t.elite){R.t++;t.elite.forEach(k=>R.mods.add(k))}return st(u,t,a,o)};
   for(let ti=2;ti<TIERS.length;ti++){const roster=company(X,TIERS[ti],SEED+ti*17);
    for(let i=0;i<8;i++){X.G.roster=JSON.parse(JSON.stringify(roster));X.G.day=TIERS[ti].day;X.G.diff='brutal';X.seedRng(SEED+1300+10*ti+i);await scripted(X,{f:facs[(i+ti)%6],mult:1,biome:bios[(i+ti)%bios.length],src:{type:'sim'}});nb++}}
   X.ctx.strike=st;X.G.diff=d0;ok(R.u>100&&R.t>40&&R.mods.size>=12,`too few elite strikes checked (${R.u} by elites, ${R.t} on them, modifiers ${[...R.mods].join(' ')})`);
   console.log(`16 battles, ${S.n-n1} strikes checked: ${R.u} by elites, ${R.t} on them (${R.mods.size} modifiers: ${[...R.mods].sort().join(' ')})`) }
 const nBattle=S.n;
 console.log('== directed sweep ==');
 await sweep(X,company(X,TIERS[2],SEED+5),6000);
 console.log(`${S.n-nBattle} strikes checked`);
 const sd=Math.sqrt(S.varHits),z=(S.hits-S.expHits)/sd;
 console.log(`\ntotal ${S.n} strikes, ${S.hits} hits (forecast expected ${S.expHits.toFixed(0)}, z=${z.toFixed(2)}), ${S.kills} kills, ${S.lethal} forecast lethal`);
 console.log(`armor: ${S.armored} armored (${S.broke} broken through), ${S.bare} bare; height: ${S.high} from above, ${S.low} from below; ${S.magic} magic, ${S.splash} splash, ${S.auto} arcs; ${S.statuses} statuses applied`);
 console.log(`range tightness: ${S.atMin} hits landed exactly on the forecast minimum, ${S.atMax} on the maximum`);
 console.log(`phase 5: ${S.head} head / ${S.body} body hits; ${S.cover} strikes through cover, ${S.ffRisk} with allies in the line, ${S.stray} stray shots; ${S.free} free attacks, ${S.riposte} ripostes; ${S.pierce} piercing, ${S.split} shield splits (${S.splitBroke} broke it), ${S.bleed} bleeds; ${S.shake} heavy hits, ${S.inj} injuries; morale in play on ${S.morAtt} attackers and ${S.morDef} targets`);
 if(VERBOSE){console.log('by ability:',JSON.stringify(S.byAb));console.log('by weapon:',JSON.stringify(S.byWt))}
 ok(S.n>=3000,'fewer than 3000 strikes were checked');ok(Math.abs(z)<4,'observed hit rate is far from the forecast hit chances (z='+z.toFixed(2)+')');
 ok(S.atMin>20&&S.atMax>20,'forecast range is loose: its ends are never reached');
 ok(S.armored>500&&S.bare>300&&S.broke>100&&S.high>300&&S.low>300&&S.magic>200&&S.splash>20&&S.auto>10&&S.kills>200&&S.statuses>100,'the sweep missed a case it is meant to cover');
 ok(S.head>400&&S.body>1500&&S.headAtMax>10&&S.cover>150&&S.ffRisk>80&&S.stray>15&&S.riposte>15&&S.free>100&&S.pierce>20&&S.split>40&&S.splitBroke>10&&S.bleed>15&&S.shake>150&&S.inj>15&&S.morAtt>300&&S.morDef>300,
  'a Phase 5 mechanic was not covered: '+JSON.stringify({head:S.head,body:S.body,headAtMax:S.headAtMax,cover:S.cover,ffRisk:S.ffRisk,stray:S.stray,riposte:S.riposte,free:S.free,pierce:S.pierce,split:S.split,splitBroke:S.splitBroke,bleed:S.bleed,shake:S.shake,inj:S.inj,morAtt:S.morAtt,morDef:S.morDef}));
 { const hf=S.head/(S.head+S.body);ok(hf>.2&&hf<.34,'head hits are not about a quarter of all hits: '+hf.toFixed(3)) }
 const abs=['attack'].concat(Object.keys(X.AB).filter(id=>X.AB[id].tgt==='enemy'||X.AB[id].tgt==='aoe'));for(const id of abs)ok(S.byAb[id]>0,'ability never struck: '+id);
 ok(X.FREEAB&&X.MORFX&&X.STATUS&&X.HEAVYHIT>0,'rules constants are missing');
 console.log(`fatigue and armor trees: ${S.tired} tired attackers, ${S.tiredT} tired targets, ${S.armP} strikes on armor-tree perks (${S.sidestep} with Sidestep ready, ${S.brace} braced)`);
 ok(S.tired>200&&S.tiredT>200&&S.armP>400&&S.sidestep>50&&S.brace>50,'fatigue or the armor trees were not covered: '+JSON.stringify({tired:S.tired,tiredT:S.tiredT,armP:S.armP,sidestep:S.sidestep,brace:S.brace}));
 for(const wt of ['sword','axe','mace','dagger','spear','bow','staff','fist','hammer','polearm','greatsword','crossbow','flintlock'])ok(S.byWt[wt]>0,'weapon type never struck: '+wt);
 console.log(`arms update: ${S.crush} crushing blows, ${S.reach} reach blows over the tile between; by family `+['hammer','polearm','greatsword','crossbow','flintlock'].map(w=>w+' '+S.byWt[w]).join(', '));
 ok(S.crush>150&&S.reach>60&&['hammer','polearm','greatsword','crossbow','flintlock'].every(w=>S.byWt[w]>60),'an arms-update case was not covered');
 console.log(`talents and arms: ${S.tal} attackers with talent mods, ${S.swap} after a real swap, ${S.wmod} with weapon-tree changes, ${S.weak} weakened; ${S.undy} targets with Undying (${S.undySaved} saved by it), ${S.marked} marked, ${S.slung} slung shields`);
 console.log(`traits: ${S.trU} attackers with trait mods, ${S.trT} targets with traits (${S.lucky} with luck unspent, ${S.luckySaved} saved by it; ${S.bwise} Beast-wise against beasts, ${S.beastwise||0} heavy hits that could not shake them)`);
 ok(S.trU>500&&S.trT>800&&S.lucky>80&&S.luckySaved>3&&S.bwise>150&&(S.beastwise||0)>15,'a trait case was not covered: '+JSON.stringify({trU:S.trU,trT:S.trT,lucky:S.lucky,luckySaved:S.luckySaved,bwise:S.bwise,beastwise:S.beastwise}));
 console.log(`rogues: ${S.rgL||0} light-weapon attackers with the rogues' mods, ${S.rg||0} blinded or doomed targets`);ok((S.rgL||0)>100&&(S.rg||0)>1000,'the rogues were not covered');
 ok(S.tal>1500&&S.swap>30&&S.wmod>300&&S.weak>300&&S.undy>100&&S.undySaved>5&&S.marked>300&&S.slung>50,'a talents and arms case was not covered: '+JSON.stringify({tal:S.tal,swap:S.swap,wmod:S.wmod,weak:S.weak,undy:S.undy,undySaved:S.undySaved,marked:S.marked,slung:S.slung}));
 finished=true;console.log(`\nOK forecast matches strike() (${((Date.now()-T0)/1000).toFixed(1)}s)`)})();
