// After-action report test: node test/aar.js [--seed N]
// The battle's own tally for every unit (68a-aar.js: u.aar, kept by hurt() / killUnit() of 60-battle-core.js and thorns in 25-legend.js),
// the bonus xp a won battle pays for kills and damage (resolveBattle, 68-battle-flow.js) and the result cards. This test:
//   - runs seeded battles (three company tiers against six factions, a rival company; scripted and auto) and checks the tally against
//     the battle's own events, recorded around the real hurt() / killUnit() / the FX stream: killing blows (and m.kills), hitpoints
//     dealt with no overkill, armor stripped, hitpoints taken, friendly-fire kills apart;
//   - checks the xp: every survivor earns the base share plus a bonus that is the formula's (recomputed here from the tally),
//     never above the cap, zero for a sword that did nothing, the company's bonuses within AAR.pool of the pool; deterministic (the
//     same battle twice gives the same bonuses) and drawing nothing (the seeded stream after the results is the same with the bonus off);
//   - the injuries each card lists are exactly those inflictInjury() dealt the merc in the battle;
//   - the results sheet renders a card per sword for a victory (base + bonus, a level marker, an injury, a fallen sword, the MVP), a
//     defeat and a retreat (no xp), and a solo Isekai hero; the sheet asks for the wide dialog;
//   - a save asked for in the middle of a battle is refused without harm, the tally is plain data, and the campaign saved before the
//     battle loads and fights on.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261119;
const SKIP=[],SRC=path.join(__dirname,'..','src');
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
 for(const n of ['hurt','killUnit','inflictInjury','startBattle','useAbility','abilityInfo','canUse','validTargets','aiTurn','nextTurn','newGame','closeSheet','newMerc','gainXP','calc','settleBattle','seedRng','rngState','resolveBattle','battleResultHTML','aarHTML','aarBonus','foeXpOf'])
  ok(typeof ctx[n]==='function','game function '+n+'() is missing');
 X.FX.on=null;X.SPEEDF=0;return X}

/* ---------- the companies and battles (as test/rolllog.js) ---------- */
const BGS=['sellsword','squire','hunter','acolyte','hedge','knight','militia','monk','wildling','spellblade','thief','farmhand'];
const TIERS=[{lvl:3,size:6,day:6,w:[],a:[]},{lvl:8,size:8,day:24,w:['arming','waraxe','warspear','mace','pike','handaxe'],a:['leather','padded','mail']},
 {lvl:14,size:12,day:50,w:['riftedge','waraxe','pike','mace','greataxe','rondel'],a:['plate','scale','mail']}];
function company(X,tier,seed){X.seedRng(seed);X.newGame(true);X.closeSheet(true);const G=X.G;G.roster.length=0;
 for(let i=0;i<tier.size;i++){const m=X.newMerc(BGS[(i+seed)%BGS.length]);m.field=true;X.gainXP(m,X.XPT[tier.lvl]);m.pend=0;m.pp=tier.lvl;X.autoLearn(m);
  const wt=m.eq.w?X.ITEMS[m.eq.w].wt:'fist';
  if(wt==='bow'){if(tier.lvl>4)m.eq.w='warbow'}else if(wt==='staff'){if(tier.lvl>4)m.eq.w='focus'}else if(tier.w.length){m.eq.w=tier.w[(i+seed)%tier.w.length];if(X.ITEMS[m.eq.w].two)m.eq.s=null}
  if(tier.a.length)m.eq.a=tier.a[(i+seed)%tier.a.length];m.hp=X.calc(m).hp;G.roster.push(m)}
 G.day=tier.day;return JSON.parse(JSON.stringify(G.roster))}
async function scripted(X,opts){let done=null;const b=X.startBattle(Object.assign({},opts,{quiet:true,turnCap:4000,onEnd:r=>{done=r}}));ok(b,'battle did not start');let spins=0,acts=0,turn=-1;
 while(!done){if(!b.busy&&!b.over&&b.cur&&b.cur.side===0){const u=b.cur;if(turn!==b.turns){turn=b.turns;acts=0}let acted=false;spins=0;
   if(acts<5)for(const id of X.shuffle(['attack'].concat(u.abs))){const a=X.abilityInfo(u,id);if(!X.canUse(u,a))continue;let k=u.r*X.BW+u.c;
     if(a.tgt==='aoe'){if(!b.units.some(t=>t.alive&&t.side!==u.side&&Math.abs(t.c-u.c)+Math.abs(t.r-u.r)===1))continue}
     else if(a.tgt!=='self'){const ts=[...X.validTargets(u,a)];if(!ts.length)continue;k=ts[X.ri(0,ts.length-1)]}
     acts++;acted=true;await X.useAbility(u,a,k);break}
   if(!acted&&!b.over&&!b.busy&&b.cur===u){b.busy=true;await X.aiTurn(u);if(!b.over)X.nextTurn()}}
  else{await null;if(++spins>2e6)fail('scripted battle stalled')}}
 ok(!done.stuck,'scripted battle did not end');return done}

/* ---------- the independent record, around the real rules ---------- */
function install(X){const ctx=X.ctx,R={tal:new Map(),kills:[],inj:[],calls:[]};
 const T=u=>{let t=R.tal.get(u);if(!t)R.tal.set(u,t={k:0,ff:0,dmg:0,adm:0,taken:0,hits:0});return t};
 const h0=ctx.hurt;ctx.hurt=function(t,dmg,ign,src,o){const call={t,src,hp0:t.hp,alive:t.alive,arm:0,main:false};R.calls.push(call);let r;try{r=h0(t,dmg,ign,src,o)}finally{R.calls.pop()}
  if(call.alive){const eff=Math.max(0,call.hp0-Math.max(0,call.main?call.hpAt:t.hp));if(eff>0)T(t).taken+=eff;if(src&&src!==t&&src.side!==t.side&&(eff>0||call.arm>0)){const s=T(src);s.dmg+=eff;s.adm+=call.arm;s.hits++}}
  return r};
 const on0=X.FX.on;X.FX.on=(type,d)=>{const c=R.calls[R.calls.length-1];
  if(type==='hit'&&c){if(d.t===c.t&&!c.main){c.main=true;c.arm=d.armor||0;c.hpAt=d.t.hp}   // (the hitpoints as the blow lands: a heal that follows inside the call is not the blow's)
   else if(d.u===c.t&&d.t===c.src&&d.dmg>0){T(d.t).taken+=d.dmg;const s=T(d.u);s.dmg+=d.dmg;s.hits++}}   // thorns: the struck unit hurts its attacker back
  if(on0)on0(type,d)};
 const k0=ctx.killUnit;ctx.killUnit=function(t,src,head){R.kills.push({t,src});if(src&&src!==t){if(src.side!==t.side)T(src).k++;else T(src).ff++}return k0(t,src,head)};
 const i0=ctx.inflictInjury;ctx.inflictInjury=function(t,head,perm,slow){const id=i0(t,head,perm,slow);if(id&&t.m&&t.side===0)R.inj.push({id:t.m.id,inj:id});return id};
 R.reset=()=>{R.tal=new Map();R.kills.length=0;R.inj.length=0;R.calls.length=0};return R}

(async()=>{
 const X=makeContext(),I=install(X),sheets=[];{const s0=X.ctx.sheet;X.ctx.sheet=function(h,cls){sheets.push({h,cls});return s0(h,cls)}}
 const S={battles:0,won:0,lost:0,kills:0,ff:0,dmg:0,inj:0,levels:0,bonusN:0,zero:0,capped:0,topK:[],arm:0};
 const check=(label,b,res)=>{S.battles++;if(res.win)S.won++;else S.lost++;
  // the tally against the record, unit by unit
  for(const u of b.units){const a=X.aarStats(u),e=I.tal.get(u)||{k:0,ff:0,dmg:0,adm:0,taken:0,hits:0};
   for(const k of ['k','ff','dmg','adm','taken','hits'])ok(a[k]===e[k],`${label}: ${u.name} (side ${u.side}) ${k} = ${a[k]}, the battle's record says ${e[k]}`)}
  const byU=new Map();for(const x of I.kills)if(x.src)byU.set(x.src,(byU.get(x.src)||0)+1);
  for(const u of b.units)ok((u.aar?u.aar.k+u.aar.ff:0)===(byU.get(u)||0),`${label}: ${u.name}'s kills do not add up to the deaths it caused`);
  const dead=b.units.filter(u=>!u.alive&&(u.hp<=0)&&!u.gone);ok(I.kills.length>=dead.length,`${label}: ${dead.length} fell but only ${I.kills.length} killing blows were seen`);
  // the result rows: one per fielded sword, with its tally
  const pu=b.units.filter(u=>u.side===0&&u.m);ok(res.men.length===pu.length,`${label}: ${res.men.length} rows for ${pu.length} swords`);
  for(const u of pu){const r=res.men.find(r=>r.id===u.m.id);ok(r&&r.st&&JSON.stringify(r.st)===JSON.stringify(X.aarStats(u)),`${label}: ${u.name}'s row does not carry the tally`);
   S.kills+=r.st.k;S.ff+=r.st.ff;S.dmg+=r.st.dmg;S.arm+=r.st.adm;
   // injuries: what the card lists is what the rules dealt (a sword that died is not listed)
   if(r.state!=='dead'){const want=I.inj.filter(x=>x.id===u.m.id).map(x=>x.inj).sort().join(),got=r.inj.map(j=>j.id).sort().join();ok(want===got,`${label}: ${u.name}'s injuries listed [${got}], dealt [${want}]`);S.inj+=r.inj.length}}
  // xp: base + bonus by the formula
  const en=b.units.filter(u=>u.side!==0),tot={xp:en.reduce((n,e)=>n+X.foeXpOf(e),0),hp:en.reduce((n,e)=>n+Math.max(0,e.hpMax),0)};
  if(res.win){ok(tot.xp===res.xp,`${label}: the foes are worth ${tot.xp}, the result says ${res.xp}`);const pool=res.xp*res.xpK,A=X.AAR;let sum=0;const surv=res.men.filter(r=>r.state!=='dead');
   ok(res.share===Math.round(pool*A.base/Math.max(1,surv.length)),`${label}: the base share`);
   for(const r of surv){const st=r.st,sc=A.kill*Math.min(1,tot.xp>0?st.kx/tot.xp:0)+A.dmg*Math.min(1,tot.hp>0?st.dmg/tot.hp:0),want=Math.max(0,Math.min(Math.round(res.share*A.cap),Math.round(pool*A.pool*sc)));
    ok(r.xp&&r.xp.base===res.share&&r.xp.bonus===want,`${label}: ${r.name} xp ${JSON.stringify(r.xp)}, the formula says ${res.share} + ${want}`);
    ok(r.xp.bonus<=Math.round(res.share*A.cap),`${label}: ${r.name}'s bonus over the cap`);if(r.xp.bonus===Math.round(res.share*A.cap)&&r.xp.bonus>0)S.capped++;
    if(st.k===0&&st.dmg===0){ok(r.xp.bonus===0,`${label}: ${r.name} did nothing but earned a bonus`);S.zero++}
    const m=X.G.roster.find(m=>m.id===r.id);ok(m&&m.xp===m._x0+r.xp.base+r.xp.bonus,`${label}: ${r.name} gained ${m&&m.xp-m._x0} xp, the row says ${r.xp.base}+${r.xp.bonus}`);
    if(r.lvl){S.levels++;ok(m.lvl===r.lvl&&r.from<r.lvl,`${label}: level marker`)}sum+=r.xp.bonus;if(r.xp.bonus>0)S.bonusN++}
   ok(sum===res.bonus&&sum<=pool*A.pool+surv.length,`${label}: the bonuses (${sum}) over AAR.pool of the pool (${pool})`);
   if(surv.length>1&&res.share>0)S.topK.push(Math.max(...surv.map(r=>r.xp.bonus))/res.share);
   for(const r of res.men.filter(r=>r.state==='dead'))ok(!r.xp,`${label}: a dead sword earned xp`)}
  else for(const r of res.men)ok(!r.xp,`${label}: xp on a lost battle`);
  // the sheet
  const html=X.battleResultHTML(res),cards=(html.match(/class="aar-c /g)||[]).length;ok(cards===res.men.length,`${label}: ${cards} cards for ${res.men.length} swords`);
  for(const r of res.men){ok(html.includes(`<b>${r.name}</b>`),`${label}: no card for ${r.name}`);for(const j of r.inj)ok(html.includes(`<b>${j.n}</b>`),`${label}: the card does not show ${r.name}'s ${j.n}`)}
  if(res.win)for(const r of res.men.filter(r=>r.xp))ok(html.includes(`<b>+${r.xp.base}</b>`)&&(!r.xp.bonus||html.includes(`>+${r.xp.bonus}</i>`)),`${label}: the card does not show ${r.name}'s xp`);
  if(res.men.some(r=>r.state==='dead'))ok(/<em class="dead">Dead<\/em>/.test(html),`${label}: no Dead tag`)};
 const prep=()=>{for(const m of X.G.roster){m._x0=m.xp;m._k0=m.kills|0}};
 const one=async(label,o,auto)=>{I.reset();prep();const r=auto?await X.autoBattle(Object.assign({src:{type:'sim'},turnCap:4000},o)):await scripted(X,Object.assign({src:{type:'sim'}},o));ok(r&&!r.stuck,label+' did not end');
  if(process.env.AARDBG)console.log(label,r.win,r.men.length,r.foes,r.rounds);check(label,X.B,r);const out={res:r,b:X.B};X.settleBattle(r.win);return out};

 console.log('== seeded battles: the tally, the xp, the injuries, the cards ==');
 const bios=['plains','hills','forest','swamp','snow','desert'];const ROS=[];
 for(let ti=0;ti<TIERS.length;ti++){const ros=company(X,TIERS[ti],SEED+ti);ROS.push(ros);
  for(const [i,f] of ['orc','bandit','undead','beast','gob','void'].entries()){X.G.roster=JSON.parse(JSON.stringify(ros));X.G.day=TIERS[ti].day;X.G.diff=i%3===2?'brutal':'normal';X.seedRng(SEED+100*ti+i);await one(`t${ti}-${f}`,{f,mult:i===5?.8:.5,biome:bios[(i+ti)%6]},i!==3)}
  X.G.roster=JSON.parse(JSON.stringify(ros));const rv=JSON.parse(JSON.stringify(ros)).map((m,i)=>Object.assign(m,{id:'rv'+i,name:'Rival '+m.name}));
  X.G.rivals=[{id:'rF',n:'The Tallymen',pers:'honour',renown:50,crowns:100,roster:rv,stance:0,alive:true,deeds:[]}];X.seedRng(SEED+100*ti+50);await one(`t${ti}-rival`,{f:'rF',rival:'rF',mult:1,biome:'hills'},false);X.G.rivals=[]}
 ok(S.won>=8&&S.lost>=1,'too few won / lost battles: '+JSON.stringify({won:S.won,lost:S.lost}));ok(S.kills>100&&S.dmg>3000&&S.arm>500,'too little seen: '+JSON.stringify(S));
 ok(S.inj>=3,'too few injuries seen: '+S.inj);ok(S.levels>=1,'too few level-ups seen: '+S.levels);ok(S.zero>=1&&S.bonusN>20,'bonus coverage: '+JSON.stringify({zero:S.zero,bonusN:S.bonusN}));
 const tk=S.topK.slice().sort((a,b)=>a-b),med=tk[tk.length>>1];
 console.log(`${S.battles} battles (${S.won} won, ${S.lost} lost): ${S.kills} kills (${S.ff} friendly), ${S.dmg} hitpoints and ${S.arm} armor dealt, ${S.inj} injuries, ${S.levels} level-ups; `+
  `top bonus / base: median ${(med*100).toFixed(0)}%, range ${(tk[0]*100).toFixed(0)}..${(tk[tk.length-1]*100).toFixed(0)}%, ${S.capped} capped; ${S.zero} idle swords at base`);

 console.log('== deterministic, and no draws ==');
 { const run=async(pool)=>{X.G.roster=JSON.parse(JSON.stringify(ROS[2]));X.G.day=50;X.G.diff='normal';const p0=X.AAR.pool;X.AAR.pool=pool;X.seedRng(SEED+777);
    const r=await X.autoBattle({src:{type:'sim'},turnCap:4000,f:'gob',mult:.5,biome:'plains'});X.AAR.pool=p0;const st=X.rngState(),xp=r.men.map(x=>x.xp?x.xp.base+'+'+x.xp.bonus:'-').join();X.settleBattle(r.win);return{st,xp,win:r.win,bonus:r.bonus}};
   const a=await run(X.AAR.pool),b=await run(X.AAR.pool),c=await run(0);ok(a.win&&a.bonus>0,'the check battle should be won with a bonus');
   ok(a.xp===b.xp&&a.st===b.st,'the same battle twice: different xp');ok(c.bonus===0&&c.st===a.st,'the bonus draws from the seeded stream');
   ok(X.aarBonus({k:9,kx:1e6,dmg:1e6},{xp:100,hp:100},1000,100)===100,'the cap: the bonus stops at AAR.cap x the base');ok(X.aarBonus({k:0,kx:0,dmg:0},{xp:100,hp:100},1000,100)===0,'nothing done, no bonus');
   console.log('the same battle twice: '+a.xp+'; the stream after the results is the same with the bonus off') }

 console.log('== the sheet: victory, defeat, retreat, a solo hero ==');
 { // a victory with a level-up, an injury, a fallen sword and an MVP: one sword does the killing, one is struck down, one dies
   const G=X.G;G.roster=JSON.parse(JSON.stringify(ROS[0])).slice(0,6);G.day=6;G.diff='normal';X.seedRng(SEED+901);sheets.length=0;
   G.roster[1].xp=X.XPT[G.roster[1].lvl+1]-5;const lv1=G.roster[1].lvl;const b=X.startBattle({f:'bandit',mult:1,src:{type:'sim'},turnCap:4000});ok(b&&X.mode==='battle','the sheet battle did not start');
   ok(X.save()===false,'a save in the middle of a battle must be refused');ok(X.mode==='battle'&&X.B===b,'the refused save changed the battle');
   const me=b.units.filter(u=>u.side===0&&u.m),foes=b.units.filter(u=>u.side===1);
   X.hurt(foes[0],5,1,me[1],{pierce:1});X.killUnit(foes[0],me[0]);for(const u of foes.slice(1))X.killUnit(u,me[1]);
   const j=X.inflictInjury(me[2],false,false);ok(j,'an injury for the test');X.killUnit(me[3],foes[0]);   // (the dead foe strikes: a test, not the rules)
   ok(JSON.parse(JSON.stringify(b.units.map(u=>u.aar||null))).length===b.units.length,'the tally is plain data');
   const res=X.endBattle(true),sh=sheets[sheets.length-1];ok(sh&&sh.cls==='brw'&&sh.h.includes('aar-g'),'the results sheet is not the wide one with the cards');
   const r1=res.men.find(r=>r.id===me[1].m.id),r0=res.men.find(r=>r.id===me[0].m.id),r2=res.men.find(r=>r.id===me[2].m.id),r3=res.men.find(r=>r.id===me[3].m.id);
   ok(r0.st.k===1&&r1.st.k===foes.length-1&&r1.st.dmg>=5,'the scripted kills: '+r0.st.k+' / '+r1.st.k);ok(r1.lvl>lv1&&/<em>Level \d+<\/em>/.test(sh.h),'the level-up shows on the card');
   ok(r2.inj.some(x=>x.id===j)&&sh.h.includes(X.INJ[j].n),'the injury shows on the card');ok(['dead','down'].includes(r3.state)&&(r3.state==='dead'?/>Dead</.test(sh.h):/>Struck down</.test(sh.h)),'the fallen sword shows');
   ok(/class="aar-c [a-z]+ mvp/.test(sh.h)&&/>MVP</.test(sh.h),'no MVP');const mv=X.aarMvp(res);ok(mv===r1.id,'the MVP is the sword with most kills and damage: '+mv);
   const idle=res.men.filter(r=>r.xp&&r.st.k===0&&r.st.dmg===0);ok(idle.length&&idle.every(r=>r.xp.bonus===0),'the idle swords earn the base');ok(r1.xp.bonus>0&&r0.xp.bonus>0,'the killers earn a bonus');
   X.settleBattle(true);X.closeSheet(true);
   // defeat: every sword falls
   G.roster.forEach(m=>{m.hp=X.calc(m).hp});X.seedRng(SEED+902);sheets.length=0;const b2=X.startBattle({f:'orc',mult:1,src:{type:'sim'},turnCap:4000});const f2=b2.units.find(u=>u.side===1);
   for(const u of b2.units.filter(u=>u.side===0&&u.m))X.killUnit(u,f2);const res2=b2.result||X.endBattle(false),h2=X.battleResultHTML(res2);ok(!res2.win&&/<h2>Defeat<\/h2>/.test(h2)&&(h2.match(/class="aar-c /g)||[]).length===res2.men.length&&!/aar-xpn/.test(h2),'the defeat sheet: cards, no xp');
   const o2=X.settleBattle(false);X.closeSheet(true);
   // retreat
   if(o2.kind!=='wiped'&&G.roster.length){G.roster.forEach(m=>{m.hp=X.calc(m).hp});X.seedRng(SEED+903);const b3=X.startBattle({f:'gob',mult:1,src:{type:'sim'},turnCap:4000});const me3=b3.units.filter(u=>u.side===0&&u.m),f3=b3.units.find(u=>u.side===1);
    X.hurt(f3,4,1,me3[0],{pierce:1});b3.over=true;b3.busy=true;b3.fled=true;const res3=X.endBattle(false),h3=X.battleResultHTML(res3);ok(/<h2>Retreat<\/h2>/.test(h3)&&(h3.match(/class="aar-c /g)||[]).length===res3.men.length&&res3.men[0].st.dmg===4,'the retreat sheet: cards with the tally');X.settleBattle(false);X.closeSheet(true)}
   fs.writeFileSync(path.join(require('os').tmpdir(),'aar-sheet.html'),sh.h);
   console.log(`victory: ${res.men.length} cards (MVP ${r1.name}: ${r1.st.k} kills, xp ${r1.xp.base}+${r1.xp.bonus}, level ${r1.lvl}); defeat and retreat: cards, no xp`) }
 { // the Isekai: one hero
   X.seedRng(SEED+30);X.newGame(true,{origin:'isekai'});X.closeSheet(true);const G=X.G;ok(G.isekai&&G.roster.length===1,'the Isekai starts with one hero');const hero=G.roster[0];hero.field=true;hero._x0=hero.xp;hero._k0=hero.kills|0;
   X.seedRng(SEED+31);sheets.length=0;I.reset();const r=await X.autoBattle({f:'gob',mult:.3,src:{type:'sim'},turnCap:4000});ok(r&&!r.stuck,'the Isekai battle did not end');check('isekai',X.B,r);
   const h=X.battleResultHTML(r);ok((h.match(/class="aar-c /g)||[]).length===1&&!/>MVP</.test(h)&&h.includes(hero.name),'the solo sheet: one card, no MVP');
   if(r.win)ok(r.men[0].xp.bonus===Math.min(Math.round(r.share*X.AAR.cap),Math.round(r.xp*r.xpK*X.AAR.pool*r.men[0].score)),'the hero\'s bonus');
   console.log(`isekai: ${r.win?'won':'lost'} (${r.men[0].state}, ${r.foes} foes, ${r.rounds} rounds, dmg ${r.men[0].st.dmg}, taken ${r.men[0].st.taken}), ${r.men[0].st.k} kills, xp ${r.men[0].xp?r.men[0].xp.base+'+'+r.men[0].xp.bonus:'none'}`);X.settleBattle(r.win);X.closeSheet(true);
   // and a win: the hero cuts them down
   if(G.roster.length){G.roster[0].hp=X.calc(G.roster[0]).hp;G.roster[0]._x0=G.roster[0].xp;X.seedRng(SEED+32);const b=X.startBattle({f:'gob',mult:.3,src:{type:'sim'},turnCap:4000}),me=b.units.find(u=>u.side===0&&u.m),fo=b.units.filter(u=>u.side===1);
    X.hurt(fo[0],9,1,me,{pierce:1});for(const u of fo)X.killUnit(u,me);const w=b.result||X.endBattle(true),hw=X.battleResultHTML(w),rw=w.men[0];
    ok(w.win&&rw.st.k===fo.length&&rw.xp&&rw.xp.bonus===Math.min(Math.round(w.share*X.AAR.cap),Math.round(w.xp*w.xpK*X.AAR.pool*rw.score))&&(hw.match(/class="aar-c /g)||[]).length===1&&!/>MVP</.test(hw)&&hw.includes(`<b>+${rw.xp.base}</b>`),'the solo hero\'s won sheet');
    console.log(`isekai, won: ${rw.st.k} kills, xp ${rw.xp.base}+${rw.xp.bonus}`);X.settleBattle(true);X.closeSheet(true)} }

 console.log('== saves around a battle ==');
 { X.seedRng(SEED+40);X.newGame(true);X.closeSheet(true);X.mode='world';ok(X.save(),'save in the world failed');const raw=X.store?X.store.get(X.slotKey()):null;
   const b=X.startBattle({f:'gob',mult:1,src:{type:'sim'},turnCap:4000});ok(b,'battle');ok(X.save()===false,'a save during the battle is refused');
   const me=b.units.find(u=>u.side===0&&u.m),fo=b.units.filter(u=>u.side===1);X.hurt(fo[0],6,1,me,{pierce:1});ok(X.save()===false&&me.aar&&me.aar.dmg===6,'a refused save leaves the tally');
   const rd=X.readSave();ok(rd.state==='ok'&&Array.isArray(rd.g.roster)&&rd.g.roster.every(m=>!('aar' in m)),'the save holds no battle tally');
   for(const u of fo)X.killUnit(u,me);const res=b.result||X.endBattle(true);ok(res.win&&res.men.find(r=>r.id===me.m.id).st.k===fo.length,'the battle after the refused save');X.settleBattle(true);X.closeSheet(true);
   X.mode='world';ok(X.save(),'save after the battle failed');const rd2=X.readSave();ok(rd2.state==='ok','the save after the battle does not read back');
   X.continueGame();ok(X.G&&X.G.roster.length,'the campaign did not load');const b2=X.startBattle({f:'gob',mult:1,src:{type:'sim'},turnCap:4000});ok(b2,'a battle after loading');
   for(const u of b2.units.filter(u=>u.side===1))X.killUnit(u,b2.units.find(u=>u.side===0&&u.m));const res2=b2.result||X.endBattle(true);ok(res2.win&&res2.men.length&&res2.men[0].st,'the loaded campaign fights and tallies');X.settleBattle(true);X.closeSheet(true);
   console.log('a save mid-battle is refused; the campaign saved before it loads and fights on') }
 finished=true;console.log('\naar: all checks passed')})();
