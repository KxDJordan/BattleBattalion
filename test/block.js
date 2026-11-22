// Shield blocks test (60b-block.js; the hit roll in 60-battle-core.js hitChance, strike's block roll, forecast().block, the AI's aiChance).
// Plain node:  node test/block.js [--seed N] [--quick]
// Checks: the hit roll leaves a raised shield out; block chances per shield (alone, surrounded by 2 / 3 / 4 foes, slung or split: none,
// fatigue, Shield wall); the surround count (only foes next to the bearer that can fight; a reach blow or a shot does not count itself);
// a blocked blow: no hitpoint or armor damage, no status, the shield loses what the forecast said, 'Blocked', the log line; a shield
// at 0 splits and then blocks nothing; forecast == strike over many forced strikes with blocks (shield damage inside the forecast, the block
// rate against the forecast); every shield ability and perk with the new step (Split shield, Grenade, Petard, Intercept, Shield wall, Tower
// guard, Bastion, Phalanx, Shield bind, Unmoved, a riposte, Hew, Shieldbreaker, Aegis, Shield bash); the foes' shields block the company;
// the AI weighs blocks (aiChance, ganging up on a shield-bearer, the shield's worth); the balance table (expected damage taken per attack
// for every shield against typical attackers, before = the old rule computed from the same state, after = hit x (1 - block)) within tolerance.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261121,SRC=path.join(__dirname,'..','src');
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
const T0=Date.now(),QUICK=ARGV.includes('--quick');
const atk=x=>X.abilityInfo(x,'attack'),F=(x,o)=>{x.flags=Object.assign({},x.flags,o)};
// a merc unit rebuilt with shield s (or none) in place of u: same tile, id and side
function refit(b,u,m,s){m.eq.s=s;const v=X.mkMercUnit(m,u.side);v.id=u.id;v.c=u.c;v.r=u.r;v.fearless=true;v.hp=v.hpMax=Math.max(v.hpMax,400);b.units[b.units.indexOf(u)]=v;X.auraScan();return v}
function heal(t){t.hp=t.hpMax;t.arm=t.armMax;t.helm=t.helmMax;t.st={};t.mor=3;t.alive=true;t.ss=0;t.brc=0;t.dnc=0;if(t.m)t.m.inj=[];t.undy=0;t.lck=0}
// every event of the strike on t: blocks {n}, hits {dmg,armor}
async function struck(u,t,a,o){const E={blk:null,hit:null,miss:false},on0=X.FX.on;X.FX.on=(ty,d)=>{if(ty==='miss'&&d.u===u&&d.t===t){if(d.block!=null)E.blk={n:d.block,R:d.roll};else E.miss=true}if(ty==='hit'&&d.u===u&&d.t===t&&!E.hit)E.hit={dmg:d.dmg,armor:d.armor};if(on0)on0(ty,d)};
 try{E.r=await X.strike(u,t,a,o)}finally{X.FX.on=on0}return E}
const z=(n,e,v)=>v>0?(n-e)/Math.sqrt(v):0;

(async()=>{
section('the hit roll leaves the shield out; block chances per shield');
 fresh(SEED);const mk=(bg,w)=>{const m=merc(bg,w,[],['shieldbearer','bulwark','vanguard','tactician']);m.base.md=12;m.base.rd=8;m.eq.a='padded';return m};
 const mD=mk('sellsword','arming'),mA=mk('sellsword','arming'),mG=mk('sellsword','greataxe'),mW=mk('sellsword','warbow');
 const A=await arena(SEED,[mD,mA,mG,mW],['thug','bmark','skel','orcw','ogre','thug']),b=A.b;let [D,MA,MG,MW]=A.P;const [th,bm,sk,ow,og,th2]=A.E;
 b.units.forEach(u=>u.alive=u===D||u===th||u===bm);put(D,8,8);put(th,8,7);put(bm,8,3);
 D=refit(b,D,mD,'kite');ok(D.shield&&D.shb.md===15&&D.shb.rd===25,'a kite shield raised: md 15, rd 25');
 {const h=X.hitChance(th,D,atk(th)),h2=X.hitChance(bm,D,atk(bm));const N=refit(b,D,mD,null),h0=X.hitChance(th,N,atk(th)),h02=X.hitChance(bm,N,atk(bm));D=refit(b,N,mD,'kite');
  ok(h===h0&&h2===h02,`the hit roll is the same with the shield raised as without it (${h} / ${h0} melee, ${h2} / ${h02} shots)`);
  D.shield=false;const old=X.hitChance(th,D,atk(th));D.shield=true;ok(old===Math.max(5,h-15)||h-15<5,`the old rule put the shield into the hit roll: ${old} = ${h} − 15`)}
 const rows=[];
 for(const id of Object.keys(X.ITEMS).filter(k=>X.ITEMS[k].k==='s')){const I=X.ITEMS[id];D=refit(b,D,mD,id);
  const fm=X.blockChance(th,D,atk(th)),fr=X.blockChance(bm,D,atk(bm)),hm=X.hitChance(th,D,atk(th)),hr=X.hitChance(bm,D,atk(bm)),em=Math.min(85,Math.round(100*I.md/hm)),er=Math.min(85,Math.round(100*I.rd/hr));   // block = the shield's points as a share of the hit chance
  ok(fm===em&&fr===er,`${id}: block ${fm}% of blows (expected ${em}), ${fr}% of shots (expected ${er})`);
  const bi=X.blockItem(I.md,I.rd);ok(bi[0]===Math.min(85,2*I.md)&&bi[1]===Math.min(85,2*I.rd)&&X.blockFront(D,'md')===bi[0]&&X.blockFront(D,'rd')===bi[1],id+': the shop and the inspector show the chances against an even (50%) foe');
  ok(/blocks \d+% of blows/.test(X.itemDesc(id)),id+': the item text names its block chances: '+X.itemDesc(id));
  put(th2,9,8);th2.alive=true;const s2=X.blockChance(th,D,atk(th)),h2=X.hitChance(th,D,atk(th));put(sk,7,8);sk.alive=true;const s3=X.blockChance(th,D,atk(th)),h3=X.hitChance(th,D,atk(th));
  put(ow,8,9);ow.alive=true;const s4=X.blockChance(th,D,atk(th)),h4=X.hitChance(th,D,atk(th));th2.alive=sk.alive=ow.alive=false;put(th2,0,0);put(sk,1,0);put(ow,2,0);const fl=s3;
  ok(s2===Math.min(85,Math.round(100*I.md/h2*.75))&&s3===Math.min(85,Math.round(100*I.md/h3*.5))&&s4===Math.min(85,Math.round(100*I.md/h4*.25)),`${id}: surrounded by 2 / 3 / 4 foes it blocks ${s2} / ${s3} / ${s4}%`);rows.push(`${(I.n||id).padEnd(26)} md ${String(I.md).padStart(2)} rd ${String(I.rd).padStart(2)} hp ${String(I.hp).padStart(3)}  block: blows ${String(fm).padStart(2)}% (3 foes round it ${String(fl).padStart(2)}%), shots ${String(fr).padStart(2)}%`)}
 console.log(rows.join('\n'));
 D=refit(b,D,mD,'kite');
 {const b0=X.blockChance(th,D,atk(th));D.fat=D.fatMax*.9;const tp=X.tiredPen(D),h=X.hitChance(th,D,atk(th));ok(tp>0&&X.blockChance(th,D,atk(th))===Math.round(1500/h)&&X.blockChance(th,D,atk(th))<b0,'a tired bearer is hit more easily, so it blocks a smaller share: '+b0+'% -> '+X.blockChance(th,D,atk(th))+'%');D.fat=0}
 {D.st.stun=1;ok(X.blockChance(th,D,atk(th))===0,'a stunned bearer cannot block');D.st={};D.mor=0;ok(X.blockChance(th,D,atk(th))===0,'nor a fleeing one');D.mor=3}
 {const N=refit(b,D,mD,null);ok(X.blockChance(th,N,atk(th))===0&&X.forecast(th,N,atk(th)).block===0&&X.forecast(th,N,atk(th)).blkSh===null,'no shield, no block');D=refit(b,N,mD,'kite')}
 {mD.eq.w='greataxe';const S=refit(b,D,mD,'kite');ok(!S.shield&&S.slung&&X.blockChance(th,S,atk(th))===0,'a slung shield (two-handed weapon in hand) blocks nothing');mD.eq.w='arming';D=refit(b,S,mD,'kite')}
 console.log('the hit roll and block chances: ok');

section('surrounded');
 {const one=X.surroundN(D);ok(one===1&&X.forecast(th,D,atk(th)).surK===1,'one foe next to the bearer: the full block');
  put(th2,9,8);th2.alive=true;ok(X.surroundN(D)===2&&X.forecast(th,D,atk(th)).surK===.75,'two foes: ×.75');
  th2.st={stun:1};ok(X.surroundN(D)===1,'a stunned foe does not press the bearer');th2.st={};th2.mor=0;ok(X.surroundN(D)===1,'nor a fleeing one');th2.mor=3;
  put(th2,10,8);ok(X.surroundN(D)===1,'two tiles off (a spear or a halberd\'s reach) does not count');
  put(bm,8,4);const fb=X.forecast(bm,D,atk(bm));ok(fb.sur===1&&fb.surK===1,'a shot: the archer is not next to it; the thug beside it is one foe');
  put(th2,9,8);put(sk,7,8);sk.alive=true;put(ow,8,9);ow.alive=true;const f4=X.forecast(th,D,atk(th));ok(f4.sur===4&&f4.surK===.25,'four foes round it: ×.25 ('+f4.block+'%)');
  const N=X.mkMercUnit(mA,0);N.id=4242;N.c=7;N.r=7;b.units.push(N);ok(X.surroundN(D)===4,'its own allies do not count');N.alive=false;
  th2.alive=sk.alive=ow.alive=false;put(th2,0,0);put(sk,1,0);put(ow,2,0);put(bm,8,3)}
 console.log('surrounded: ok');

section('a blocked blow');
 {th.ms=400;const a=Object.assign({},atk(th),{status:{bleed:3}});let E=null,n=0;
  for(;n<200&&!(E&&E.blk);n++){heal(D);D.shp=D.shpMax;const hp0=D.hp,ar0=D.arm,he0=D.helm,s0=D.shp,f=X.forecast(th,D,a);E=await struck(th,D,a);
   if(E.blk){ok(E.r===false&&!E.hit&&D.hp===hp0&&D.arm===ar0&&D.helm===he0&&!(D.st.bleed>0),'a blocked blow does no damage and applies nothing');
    ok(s0-D.shp===E.blk.n&&E.blk.n>=f.blkSh.min&&E.blk.n<=f.blkSh.max,`the shield loses ${E.blk.n} (forecast ${f.blkSh.min}–${f.blkSh.max})`);
    ok(X.B.floats.some(x=>x.u===D&&x.txt==='Blocked'),'a "Blocked" float');ok(/blocks Brigand thug's blow with the shield|blocks .*'s blow with the shield/.test(X.B.log),'the log: '+X.B.log);
    const R=E.blk.R,bl=R.L.find(x=>x.k==='block');ok(bl&&bl.on&&R.blk===E.blk.n,'the roll line carries the block roll');ok(/BLOCKED/.test(X.rollText(R))&&/shield -\d+/.test(X.rollText(R)),'roll line: '+X.rollText(R));
    ok(/blocks .* with the shield/.test(X.rollPlain(R)),'plain line: '+X.rollPlain(R))}
   else if(E.hit)ok(D.shp===s0,'a blow that lands leaves the shield alone')}
  ok(E&&E.blk,'a forced blow was blocked within '+n+' strikes');
  // the shield splits at 0, then blocks nothing more
  heal(D);D.shp=2;let split=false;for(let i=0;i<200&&D.shield;i++){heal(D);const E2=await struck(th,D,atk(th));if(E2.blk)split=!D.shield}
  ok(split&&!D.shield&&D.shp===0&&X.unitStatuses(D).some(s=>s.key==='splitshield'),'a block at 2 shield hitpoints splits the shield');
  ok(X.blockChance(th,D,atk(th))===0&&!X.forecast(th,D,atk(th)).blkSh,'a split shield blocks nothing');
  let nb=0;for(let i=0;i<120;i++){heal(D);const E3=await struck(th,D,atk(th));if(E3.blk)nb++}ok(nb===0,'… and 120 forced blows later still nothing: '+nb);
  th.ms=52;D=refit(b,D,mD,'kite')}
 console.log('a blocked blow: ok');

section('forecast == strike over forced strikes, blocks included');
 {const SH=Object.keys(X.ITEMS).filter(k=>X.ITEMS[k].k==='s'),ATT=[th,sk,ow,og,bm,MA,MG,MW],N=QUICK?1200:4000;let n=0,blk=0,eB=0,vB=0,hits=0,eH=0,vH=0,surN=[0,0,0,0,0],broke=0,magic=0,wall=0;
  const R=()=>X.rnd(),spots={front:[[0,-1],[0,-4]],flank:[[1,0],[4,0]],behind:[[0,1],[0,4]]},DC=7,DR=6,rot=(dc,dr,f,big)=>{let [x,y]=f[0]===0&&f[1]===-1?[dc,dr]:f[0]===0&&f[1]===1?[-dc,-dr]:f[0]===1?[-dr,dc]:[dr,-dc];if(big){if(x<0)x--;if(y<0)y--}return[DC+x,DR+y]},SPARE=[th2,sk,ow].filter(x=>(x.sz||1)===1);   // the attacker on any side of the defender (a size-2 foe's footprint kept clear) and spare foes to crowd it
  for(;n<N;n++){if(n%25===0){D=refit(b,D,mD,SH[(n/25|0)%SH.length]);}
   const u=ATT[n%ATT.length];b.units.forEach(x=>x.alive=x===D||x===u);heal(D);u.alive=true;u.st={};u.mor=3;u.ap=u.apMax;u.fat=0;u.loaded=true;if(u.ld)for(const k in u.ld)u.ld[k]=true;if(u.am)for(const k in u.am)u.am[k]=9;
   const f4=[[0,-1],[0,1],[1,0],[-1,0]][Math.floor(R()*4)];const side=['front','flank','behind'][Math.floor(R()*3)],rng=X.isRangedW(u.wpn)?1:0,[c,r]=rot(...spots[side][rng],f4,(u.sz||1)>1);put(u,c,r);put(D,DC,DR);
   {let k=Math.floor(R()*4);for(const x of SPARE){if(k<=0||x===u)continue;for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const cc=DC+dc,rr=DR+dr;if(!X.unitAt(cc,rr)){put(x,cc,rr);x.alive=true;x.st={};x.mor=R()<.1?0:3;k--;break}}}}
   if(D.shpMax>0&&!D.shield&&!D.slung)D=refit(b,D,mD,D.m.eq.s);
   D.shp=D.shpMax>0?(R()<.25?1+Math.floor(R()*12):D.shpMax):0;D.buffs=R()<.25&&D.shield?[{key:'shieldwall',md:15+(D.shw||0),rd:15+(D.shw||0),dur:1}]:[];if(D.buffs.length)wall++;D.fat=R()<.3?Math.floor(D.fatMax*R()):0;
   const a=R()<.08&&u.side===0?Object.assign({id:'bolt'},X.AB.bolt):atk(u);if(a.magic)magic++;
   const tag=`${u.name} (${u.wpn.wt}) -> ${D.m.eq.s||'no shield'} from the ${side}, ${X.surroundN(D)} foes round it, shp ${D.shp}${D.buffs.length?', shield wall':''} with ${a.id}`;
   const r0=X.rngState(),s0=JSON.stringify([u,D]),f=X.forecast(u,D,a);ok(X.rngState()===r0&&JSON.stringify([u,D])===s0,'the forecast drew rnd() or changed state: '+tag);
   ok(f.hit===X.hitChance(u,D,a)&&f.block===X.blockChance(u,D,a)&&Math.abs(f.land-f.hit*(100-f.block)/100)<.01,`forecast hit ${f.hit} / block ${f.block} differ from the rules: `+tag);
   ok(f.block===0||f.sur===X.surroundN(D)&&f.surK===X.surK(f.sur),`forecast surround ${f.sur} / ${f.surK}: `+tag);if(D.shield)surN[Math.min(4,X.surroundN(D))]++;
   const hp0=D.hp,ar0=D.arm,he0=D.helm,s1=D.shp,sh0=D.shield,E=await struck(u,D,a);const pb=f.hit/100*f.block/100;eB+=pb;vB+=pb*(1-pb);eH+=f.hit/100;vH+=f.hit/100*(1-f.hit/100);
   if(E.blk){blk++;hits++;ok(sh0&&f.block>0,'a block the forecast ruled out: '+tag);ok(!E.r&&!E.hit&&D.hp===hp0&&D.arm===ar0&&D.helm===he0,'a blocked blow did damage: '+tag);
    const sd=s1-D.shp;ok(sd===E.blk.n&&sd>=f.blkSh.min&&sd<=f.blkSh.max&&f.blkSh.hp===s1,`blocked shield damage ${sd} outside the forecast ${f.blkSh.min}–${f.blkSh.max}: `+tag);
    if(!D.shield){broke++;ok(f.blkSh.brk&&D.shp===0,'the block split the shield, the forecast said it could not: '+tag)}else ok(!f.blkSh.sure,'the forecast promised a split: '+tag)}
   else if(E.r){hits++;const hp=E.hit?E.hit.dmg:0;ok(hp>=f.hpMin&&hp<=f.hpMax,`hit for ${hp}, forecast ${f.hpMin}–${f.hpMax}: `+tag);ok(D.shp===s1,'a blow that landed took shield hitpoints: '+tag)}
   else ok(!E.hit&&D.hp===hp0&&D.shp===s1,'a miss did something: '+tag)}
  const zb=z(blk,eB,vB),zh=z(hits,eH,vH);
  console.log(`${n} strikes: ${hits} hit rolls hit (forecast ${eH.toFixed(0)}, z=${zh.toFixed(2)}), ${blk} of them blocked (forecast ${eB.toFixed(1)}, z=${zb.toFixed(2)}), ${broke} blocks split the shield; shield-bearers with 0..4 foes round them: ${surN.join(' / ')}; ${wall} behind a Shield wall, ${magic} spells`);
  ok(Math.abs(zb)<4&&Math.abs(zh)<4,'the strikes drift from the forecast');ok(blk>50&&broke>3,'too few blocks or splits to say anything')}
 console.log('forecast == strike: ok');

section('shield abilities and perks with the block step');
 {const only=(...L)=>b.units.forEach(x=>x.alive=L.includes(x));const ab=(id,o)=>Object.assign({id},X.AB[id],o||{});
  D=refit(b,D,mD,'kite');put(D,7,6);put(th,7,5);only(D,th);heal(D);
  // Split shield: cannot miss, hews the shield, never blocked
  put(MG,7,5);only(D,MG);MG.side=1;const sp=X.abilityInfo(MG,'split');ok(sp&&sp.split&&X.blockChance(MG,D,sp)===0,'Split shield is never blocked');
  {const s0=D.shp,r=await X.strike(MG,D,sp);ok(r&&D.shp<s0&&D.hp===D.hpMax,'… and hews '+(s0-D.shp)+' off the shield, not the bearer')}
  // Hew / Headsman (splitB): blocked blows bite harder too; big two-handed weapons and huge foes more than a sword
  {const a=atk(MG),d0=X.blockShDmg(MG,D,a,100);F(MG,{splitB:.5});const d1=X.blockShDmg(MG,D,a,100);F(MG,{splitB:0});ok(d0===Math.round(100*.5*1.25)&&d1===Math.round(100*.5*1.25*1.5),`Hew: a blocked greataxe blow of 100 takes ${d0}, with Hew ${d1}`);
   const ds=X.blockShDmg(th,D,atk(th),100),dg=X.blockShDmg(og,D,atk(og),100);ok(ds===25&&dg===Math.round(100*.4*1.25*1.5),`a sword blow of 100 takes ${ds} off the shield, an ogre's maul ${dg}`)}
  MG.side=0;put(MG,0,0);
  // Grenade: the hit roll as before (no shield in it), and never blocked; Petard: cannot miss, never blocked, 60 off a raised shield
  {const g=ab('grenade');put(th,7,3);only(D,th);const h=X.hitChance(th,D,g),N=refit(b,D,mD,null),h0=X.hitChance(th,N,g);D=refit(b,N,mD,'kite');
   ok(h===h0&&X.blockChance(th,D,g)===0&&X.forecast(th,D,g).block===0,`Grenade: the shield is no cover (${h}% = ${h0}% without it) and blocks nothing`);
   const pe=ab('petard');put(th,7,5);only(D,th);ok(X.blockChance(th,D,pe)===0,'Petard: never blocked');const s0=D.shp,r=await X.strike(th,D,pe);ok(r&&s0-D.shp===Math.min(60,s0),'… and the charge takes 60 off the raised shield ('+(s0-D.shp)+')');D=refit(b,D,mD,'kite');put(D,7,6)}   // (the Petard knocked it back)
  // Shield bash: a shove, never blocked
  {const bash=X.abilityInfo(D,'bash');put(th,7,5);ok(bash&&bash.noDmg&&X.blockChance(D,th,bash)===0&&X.blockChance(D,th,atk(D))>0,'Shield bash shoves past a raised shield; a blow on the same foe can be blocked')}
  // Shield wall: its defense moves into the block roll; the hit roll does not change
  {b.cur=D;D.ap=9;b.busy=false;const h0=X.hitChance(th,D,atk(th)),k0=X.blockChance(th,D,atk(th)),r0=X.blockChance(bm,D,atk(bm));put(bm,7,2);only(D,th,bm);await X.useAbility(D,X.abilityInfo(D,'shieldwall'),X.key(D.c,D.r));await rest(b);b.busy=true;
const w=D.buffs.find(x=>x.key==='shieldwall');ok(w&&w.md===15+(D.shw||0),'Shield wall: +'+(w&&w.md)+' on the shield');
   ok(X.hitChance(th,D,atk(th))===h0&&X.blockChance(th,D,atk(th))===Math.min(85,Math.round(100*(15+w.md)/h0))&&X.blockChance(bm,D,atk(bm))===Math.min(85,Math.round(100*(25+w.rd)/X.hitChance(bm,D,atk(bm)))),`… the hit roll stays ${h0}%, the block goes ${k0}% -> ${X.blockChance(th,D,atk(th))}% (shots ${X.blockChance(bm,D,atk(bm))}%)`);
   D.buffs=[];put(bm,8,2)}
  // Bastion and Phalanx: plain defense, in the hit roll; the block is the shield's and stays
  for(const [k,md] of [['bastion',20],['phalanx',10]]){const h0=X.hitChance(th,D,atk(th)),k0=X.blockChance(th,D,atk(th));X.addBuff(D,{key:k,md,rd:md},1);
   const h1=X.hitChance(th,D,atk(th));ok(h1===Math.max(5,h0-md)&&X.blockChance(th,D,atk(th))===Math.min(85,Math.round(100*15/h1)),`${k}: −${md} to be hit (${h0} -> ${h1}); the shield's 15 points are a bigger share of that: block ${k0}% -> ${X.blockChance(th,D,atk(th))}%`);D.buffs=[]}
  // a block is a miss for the miss rules: Shield bind, Unmoved, a riposte
  {th.ms=400;F(D,{bindOff:1,missAP:1});D.bonusAP=0;D.umvN=0;th.st={};X.addBuff(D,{key:'riposte',rip:1},1);let rip=0,bl=0;const on0=X.FX.on;X.FX.on=(ty,d)=>{if((ty==='hit'||ty==='miss')&&d.u===D&&d.t===th)rip++;if(on0)on0(ty,d)};
   for(let i=0;i<300&&!bl;i++){heal(D);D.shp=D.shpMax;th.hp=th.hpMax=9999;const E=await struck(th,D,atk(th));if(E.blk)bl++;else{th.st={};D.bonusAP=0;D.umvN=0;rip=0}}X.FX.on=on0;
   ok(bl&&th.st.offbal===1,'Shield bind: a blocked blow throws the attacker off balance');ok(D.bonusAP===1,'Unmoved: a blocked melee blow gives +1 AP ('+D.bonusAP+')');ok(rip===1,'a riposte answers a blocked blow ('+rip+')');
   D.buffs=[];F(D,{bindOff:0,missAP:0});th.st={};th.ms=52}
  // Shieldbreaker (Aura hurling): a blocked throw bites the shield for its share too; Aegis (shieldDr): the blow, so the bite, is smaller
  {mA.eq.w='taxe';let T=refit(b,MA,mA,null);MA=T;put(T,7,3);T.side=1;only(D,T);const a=atk(T),d0=X.blockShDmg(T,D,a,40);F(T,{hurlSplit:.5});const d1=X.blockShDmg(T,D,a,40);
   ok(d1===d0+Math.round(T.wpn.d[1]*.5),`Shieldbreaker: a blocked throw takes ${d1} off the shield instead of ${d0}`);F(T,{hurlSplit:0});
   const f0=X.forecast(th,D,atk(th));F(D,{shieldDr:.15});const f1=X.forecast(th,D,atk(th));F(D,{shieldDr:0});ok(f1.blkSh&&f1.blkSh.max<f0.blkSh.max,`Aegis: the blow is lighter, so is its bite (${f0.blkSh.max} -> ${f1.blkSh.max})`);
   mA.eq.w='arming';MA=refit(b,T,mA,null);MA.side=0;put(MA,0,1)}
  // Intercept: the Shieldbearer steps in, turned to meet the blow, and its shield can take it
  {const mS=mk('sellsword','arming');mS.eq.s='heater';const SB=X.mkMercUnit(mS,0);SB.id=777;SB.fearless=true;b.units.push(SB);F(SB,{intercept:1});put(D,7,6);put(SB,8,6);put(th,7,5);only(D,SB,th);SB.icpT=0;X.pvScan();
   const g=X.rlIntercept(th,D,atk(th));ok(g===SB&&SB.c===7&&SB.r===6&&D.c===8,'Intercept: the bearer trades places with its ally');
   ok(X.blockChance(th,SB,atk(th))===Math.round(100*22/X.hitChance(th,SB,atk(th))),'… and its heater blocks the blow as it would its own ('+X.blockChance(th,SB,atk(th))+'%)');put(SB,0,2);SB.alive=false;put(D,7,6)}
  // Tower shield: its Cover still guards the allies beside it, until blocked blows split it
  {mD.eq.s='tower';D=refit(b,D,mD,'tower');put(D,7,6);put(MA,8,6);put(bm,8,2);only(D,MA,bm,th);MA.side=0;X.auraScan();const gd=D.flags.guard||0,h1=X.hitChance(bm,MA,atk(bm));
   ok(gd>0&&D.flags.shGuard>0,'a raised tower shield gives Cover: −'+gd+' to shots at the allies beside it');
   th.ms=400;let split=false;for(let i=0;i<300&&D.shield;i++){heal(D);D.shp=1;await struck(th,D,atk(th));split=!D.shield}th.ms=52;
   ok(split&&!(D.flags.guard>0),'blocked blows split it, and the Cover is gone');ok(X.hitChance(bm,MA,atk(bm))===Math.min(95,h1+gd),`… shots at the ally beside it: ${h1}% -> ${X.hitChance(bm,MA,atk(bm))}%`);D=refit(b,D,mD,'kite')}
 }
 console.log('shield abilities and perks: ok');

section('Relieve (64y-relieve.js) with blocks');
 {const only=(...L)=>b.units.forEach(x=>x.alive=L.includes(x));D=refit(b,D,mD,'kite');MA.side=0;put(MA,7,6);put(D,7,7);put(th,7,5);only(D,MA,th);heal(D);th.st={};th.mor=3;
  const s0=D.shp;let ev=0;const on0=X.FX.on;X.FX.on=(ty,d)=>{if(ty==='hit'||ty==='miss')ev++;if(on0)on0(ty,d)};await X.rvRun(D,X.key(7,6),Object.assign({id:'relieve'},X.AB.relieve));X.FX.on=on0;
  ok(D.c===7&&D.r===6&&MA.r===7&&ev===0&&D.shp===s0,'Relieve: a trade of places, not a blow: no strike, no block, the shield untouched');
  ok(X.surroundN(D)===1&&X.blockChance(th,D,atk(th))>0,'… and the bearer now in the line blocks the foe in front ('+X.blockChance(th,D,atk(th))+'%)');put(MA,0,1)}
 console.log('Relieve: ok');

section('the foes\' shields');
 {const only=(...L)=>b.units.forEach(x=>x.alive=L.includes(x));MA.side=0;MA.ms=400;put(MA,7,7);
  for(const [u,id,md] of [[sk,'skel',8],[th2,'thug',8]]){put(u,7,6);only(MA,u);u.mor=3;u.st={};u.hp=u.hpMax=9999;
   ok(u.shield&&u.shb.md>=md&&X.blockChance(MA,u,atk(MA))===Math.round(100*u.shb.md/X.hitChance(MA,u,atk(MA))),`${id}: its shield blocks ${X.blockChance(MA,u,atk(MA))}% of the company's blows`);
   let nb=0,n=0;for(;n<400&&u.shield;n++){u.st={};const s0=u.shp,E=await struck(MA,u,atk(MA));if(E.blk){nb++;ok(u.hp===9999&&s0-u.shp===E.blk.n,'a foe\'s block costs its shield, not its hitpoints')}else if(E.r)u.hp=9999}
   ok(nb>0&&!u.shield&&X.blockChance(MA,u,atk(MA))===0,`${id}: ${nb} blocks in ${n} forced blows split it; then it blocks nothing`);put(u,0,0)}
  MA.ms=mA.base.ms;MA=refit(b,MA,mA,null)}
 console.log('the foes\' shields: ok');

section('the AI weighs blocks');
 {const only=(...L)=>b.units.forEach(x=>x.alive=L.includes(x));D=refit(b,D,mD,'kite');put(D,7,6);heal(D);only(D,th);
  const a=atk(th),k=(c,r)=>X.key(c,r),alone=X.aiChance(th,a,D,k(7,5));put(th,7,5);const h=X.hitChance(th,D,a)/100,bc=X.blockChance(th,D,a)/100;put(th,7,1);
  put(sk,6,6);sk.alive=true;const two=X.aiChance(th,a,D,k(7,5));put(th2,8,6);th2.alive=true;const three=X.aiChance(th,a,D,k(7,5));sk.alive=th2.alive=false;put(sk,1,0);put(th2,0,0);
  ok(Math.abs(alone-h*(1-bc))<1e-9&&two>alone&&three>two,`aiChance: ${alone.toFixed(3)} alone (= hit ${h} x (1 − block ${bc})), ${two.toFixed(3)} with a second foe beside the bearer, ${three.toFixed(3)} with a third`);
  ok(X.aiShieldV(og,D,atk(og))>X.aiShieldV(th,D,a)*2,'a blocked maul blow is worth more against the shield than a sword\'s');
  // two shield-bearers alike, equally far: the thug gangs up on the one a skeleton already presses
  {const mE=mk('sellsword','arming');mE.eq.s='kite';const D2=X.mkMercUnit(mE,0);D2.id=4343;D2.fearless=true;D2.hp=D2.hpMax=D.hpMax;b.units.push(D2);
   const pick=async(eng)=>{only(D,D2,th,sk);heal(D);heal(D2);put(D,5,6);put(D2,9,6);put(sk,eng===D?4:10,6);sk.ap=0;put(th,7,5);th.ap=th.apMax;th.st={};th.mor=3;b.cur=th;b.over=false;b.busy=true;await X.aiTurn(th);b.over=true;return mdA(th,D)===1?'D':mdA(th,D2)===1?'D2':'none'};
   const mdA=(x,y)=>Math.abs(x.c-y.c)+Math.abs(x.r-y.r);const p1=await pick(D),p2=await pick(D2);D2.alive=false;sk.alive=false;
   ok(p1==='D'&&p2==='D2','the thug goes for the bearer already pressed by a skeleton: '+p1+', then '+p2)}
  b.over=false}
 console.log('the AI: ok');

section('balance: expected damage taken per attack, before and after');
 {const only=(...L)=>b.units.forEach(x=>x.alive=L.includes(x));const ATT=[[th,'Brigand thug'],[sk,'Skeleton legionary'],[ow,'Orc warrior'],[og,'Ogre (maul, huge)'],[bm,'Brigand archer'],[MA,'Merc arming sword'],[MG,'Merc greataxe'],[MW,'Merc war bow']];
  const SH=Object.keys(X.ITEMS).filter(k=>X.ITEMS[k].k==='s'),lines=[],R={};let tb=0,ta=0;
  lines.push('shield'.padEnd(22)+ATT.map(x=>x[1].slice(0,13).padStart(15)).join('')+'   mean');
  for(const id of SH){D=refit(b,D,mD,id);put(D,7,6);heal(D);let sb=0,sa=0;const cells=[];
   for(const [u,nm] of ATT){const rng=X.isRangedW(u.wpn);put(u,7,(u.sz||1)>1?4:rng?2:5);only(D,u);u.st={};u.mor=3;u.fat=0;const a=atk(u),f=X.forecast(u,D,a),avg=(f.dmgMin+f.dmgMax)/2;
    D.shield=false;const old=X.hitChance(u,D,a);D.shield=true;   // the old rule: the shield's md / rd in the hit roll (it is in D.md / D.rd), no block
    const eb=old/100*avg,ea=f.land/100*avg;sb+=eb;sa+=ea;tb+=eb;ta+=ea;const brk=f.blkSh&&f.block>0?D.shp/(f.hit/100*f.block/100*(f.blkSh.min+f.blkSh.max)/2):Infinity;
    cells.push((eb.toFixed(1)+'>'+ea.toFixed(1)).padStart(15));(R[id]=R[id]||{})[nm]={old,hit:f.hit,block:f.block,land:f.land,eb,ea,brk};put(u,0,0)}
   const r=sa/sb;lines.push((X.ITEMS[id].n||id).slice(0,21).padEnd(22)+cells.join('')+'  '+(r>=1?'+':'')+((r-1)*100).toFixed(0)+'%');ok(r>.8&&r<1.25,`${id}: damage taken ${((r-1)*100).toFixed(0)}% against the old rule (tolerance −20%..+25%)`);
   for(const nm in R[id]){const c=R[id][nm];ok(c.ea<=c.eb*2.5+1.5&&c.ea>=c.eb*.5-1.5,`${id} against ${nm}: ${c.eb.toFixed(1)} -> ${c.ea.toFixed(1)}`)}}
  console.log(lines.join('\n'));const tr=ta/tb;console.log(`all shields, all attackers: ${((tr-1)*100).toFixed(1)}% damage taken against the old rule`);ok(tr>.9&&tr<1.1,'overall within ±10% of the old protection: '+tr.toFixed(3));
  // attrition: blocked blows of big weapons wear a shield down far faster than a sword's
  const k=R.kite;ok(k['Ogre (maul, huge)'].brk*3<k['Brigand thug'].brk&&k['Merc greataxe'].brk*2<k['Merc arming sword'].brk,`attacks to split a kite shield: thug ${k['Brigand thug'].brk.toFixed(0)}, ogre ${k['Ogre (maul, huge)'].brk.toFixed(0)}, arming sword ${k['Merc arming sword'].brk.toFixed(0)}, greataxe ${k['Merc greataxe'].brk.toFixed(0)}`);
  if(ARGV.includes('--json'))require('fs').writeFileSync(ARGV[ARGV.indexOf('--json')+1],JSON.stringify(R,null,1))}
 console.log('balance: ok');

 console.log(`\nOK shield blocks (${((Date.now()-T0)/1000).toFixed(1)}s)`);process.exit(0)})().catch(e=>fail(e&&e.stack||e));
