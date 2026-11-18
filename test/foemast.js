// Foe masteries test: the human foes' perks (FOEMAST in 64m-foemast.js, folded in by foePerks through perkSum, 30-mercs.js).
// Plain node:  node test/foemast.js [--seed N]
// Checks: the catalog (every human EN foe has a set, every perk exists in MAST and fits the foe's weapon, passives only, the lighter goblin
// and orc sets, nothing for beasts, the dead, riftspawn and monsters); the merc path (the same perk list gives the same flags, weapon numbers
// and stats as calc()); ranks (veteran and elite tiers), elites and splits (never applied twice); the inspect card lists the masteries;
// the passives on foes one by one (Unmoved, Counter-cut, Guardian angel, Seize the moment, Steadying voice, Bandolier, shield perks);
// forecast == strike over a directed sweep of perk-bearing foes against mercs and over auto battles (the AI plays them without errors).
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261118,SRC=path.join(__dirname,'..','src'),T0=Date.now();
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
const EN=X.EN,ITEMS=X.ITEMS,MAST=X.MAST,FOEMAST=X.FOEMAST;
function merc(bg,w,perks,o){const m=X.newMerc(bg||'sellsword');m.trees=['vanguard','bulwark','duelist','tactician'];m.gift=null;m.lvl=10;m.perks=(perks||[]).slice();m.pp=0;
 m.eq.w=w||null;m.eq.s=(o&&o.s)||null;m.eq.b=null;m.eq.a='padded';m.eq.h=null;m.eq.c=null;m.inj=[];m.traits=[];m.hp=X.calc(m).hp;m.field=true;return m}
// a flat arena at the company's turn, everything parked; the battle stays busy so nothing moves on its own
async function arena(seed,ros,foes,f,mult){const G=X.G;G.roster=ros;G.day=10;X.seedRng(seed);
 const b=X.startBattle({f:f||'bandit',mult:mult||1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:6000,foes});ok(b,'arena did not start');
 let n=0;while(!b.over&&(b.busy||b.cur.side!==0)){await null;if(++n>3e6)fail('arena never reached a company turn')}
 const P=b.units.filter(u=>u.side===0),E=b.units.filter(u=>u.side===1);
 const park=()=>{b.tiles.forEach(t=>{t.t='ground';t.h=0});b.units.forEach((u,i)=>{u.alive=true;u.gone=null;u.down=false;u.hp=u.hpMax=Math.max(u.hpMax,80);u.arm=u.armMax;u.helm=u.helmMax;u.st={};u.buffs=u.buffs.filter(x=>x.foe);
   u.mor=3;u.fearless=true;u.aoo=0;u.rooted=false;u.dazed=false;u.fat=0;u.ap=u.apMax;u.dnc=0;u.bonusAP=0;u.used={};u.c=i;u.r=u.side?0:BH-1});b.order=[];b.busy=true;b.cur=P[0];X.foeAuras();X.auraScan()};
 park();return{b,P,E,park}}
const put=(u,c,r)=>{u.c=c;u.r=r};
const mdist0=(a,b)=>Math.abs(a.c-b.c)+Math.abs(a.r-b.r);
/* ---- forecast == strike for every blow (test/forecast.js's check, condensed, as in test/throwing.js) ---- */
const FS={n:0,hits:0,byAb:{},st:{},auto:0,foePk:0,vsPk:0};let FCHECK=false;
const strike0=X.ctx.strike;
X.ctx.strike=async function(u,t,a,o){if(!FCHECK||!t.alive||!u.alive)return strike0(u,t,a,o);
 const tag=`${u.name} -> ${t.name} with ${a.id} (${u.wpn.n||u.wpn.wt}) ${JSON.stringify(o||{})} [${(u.fpk||[]).join(',')} | ${(t.fpk||[]).join(',')}]`,r0=X.rngState(),s0=JSON.stringify([u,t]),f=X.forecast(u,t,a,o);
 ok(X.rngState()===r0&&JSON.stringify([u,t])===s0,'forecast changed the state or drew rnd(): '+tag);
 const sure=!!(o&&o.auto)||!!a.sure;ok(f.hit===(sure?100:X.hitChance(u,t,a)),'forecast hit '+f.hit+' is not hitChance: '+tag);if(sure)FS.auto++;
 const hp0=t.hp,st0=Object.assign({},t.st);let ev=null;const on0=X.FX.on;X.FX.on=(type,d)=>{if(type==='hit'&&d.u===u&&d.t===t&&!ev)ev={dmg:d.dmg,armor:d.armor,head:!!d.head};if(on0)on0(type,d)};
 let hit;try{hit=await strike0(u,t,a,o)}finally{X.FX.on=on0}
 FS.n++;FS.byAb[a.id]=(FS.byAb[a.id]||0)+1;if(u.fpk&&u.fpk.length)FS.foePk++;if(t.fpk&&t.fpk.length)FS.vsPk++;
 if(hit&&!a.split){FS.hits++;const hp=ev?ev.dmg:0,arm=ev?ev.armor:0;
  ok(hp>=f.hpMin&&hp<=f.hpMax,`hitpoint damage ${hp} outside the forecast ${f.hpMin}-${f.hpMax}: `+tag);ok(arm>=f.armMin&&arm<=f.armMax,`armor damage ${arm} outside ${f.armMin}-${f.armMax}: `+tag);
  if(ev){const L=ev.head?f.head:f.body;ok(L&&hp>=L.hpMin&&hp<=L.hpMax,'the location forecast misses the blow: '+tag)}
  if(!t.alive&&hp0>0&&t.hp<=0)ok(f.kill,'a kill the forecast did not allow: '+tag);else if(t.alive)ok(!f.sure,'a sure kill that did not happen: '+tag);
  if(t.alive)for(const k in t.st)if((t.st[k]||0)>(st0[k]||0)&&!['harried','pack','bonewall','banner','winded','fury','spent','enrage'].includes(k)){FS.st[k]=(FS.st[k]||0)+1;ok(f.statuses.some(s=>s.k===k&&s.n>=t.st[k]&&s.ch>0),`status ${k} was applied but not forecast: `+tag+' '+JSON.stringify(f.statuses))}}
 return hit};
const facIds=f=>X.FACT[f]?X.FACT[f].units.map(x=>x[0]):[];
const LIGHT=['gob','gobarch','gobsham','orcy','orcw','obrute','orcl','hstd','hchief'];
const HUMAN=[...new Set([].concat(facIds('bandit'),facIds('pit'),facIds('east'),facIds('barb'),['emperor','necro','necrolt']))].filter(id=>EN[id]&&!EN[id].quad);
const isWpnItem=id=>!!(id&&ITEMS[id]&&ITEMS[id].k==='w');
(async()=>{
section('catalog: every human foe has masteries, and they fit');
{ ok(HUMAN.length>=25,'the human foes: '+HUMAN.join(','));
  for(const id in EN){const F=FOEMAST[id];if(HUMAN.includes(id))ok(F&&Array.isArray(F.p)&&F.p.length>0,id+' ('+EN[id].n+') has no masteries');else if(LIGHT.includes(id))ok(F&&X.foeMastList(id,9).length>0,id+' ('+EN[id].n+') has no masteries even as a veteran');else ok(!F,id+' ('+EN[id].n+') is no man and should carry none')}
  let nPk=0;const trees=new Set();
  for(const id in FOEMAST){const d=EN[id];ok(d,'FOEMAST names an unknown foe: '+id);const all=X.foeMastList(id,9),base=X.foeMastList(id,0),vet=X.foeMastList(id,X.FOEMASTV.vet);
   ok(base.length<=vet.length&&vet.length<=all.length&&all.length===new Set(all).size,id+': the tiers stack without repeats');
   const w=isWpnItem(d.w)?ITEMS[d.w]:null,wpn=X.enemyWpn(d),ranged=X.isRangedW(wpn)||(d.rng>1);const fams=new Set();
   for(const pid of all){const P=X.perkById(pid);ok(P&&P.perk,id+': '+pid+' is not a perk in MAST');const p=P.perk,T=P.tree;nPk++;trees.add(P.key+(P.cap?'.cap':''));
    ok(T.kind==='style'||T.kind==='weapon',id+': '+pid+' comes from a '+T.kind+' tree (style and weapon trees only)');
    ok(!p.ab,id+': '+pid+' is an ability perk (foes get passives only)');
    const md=Object.assign({},p.mod||{});ok(!md.initDef&&!md.readInit&&!md.ironLung,id+': '+pid+' works only through calc()');
    if(T.kind==='weapon'){fams.add(p.wt);ok(w&&w.wt===p.wt,id+': '+pid+' does not fit its weapon ('+(w?w.wt:'no item')+')')}
    const k=P.key;
    if(k==='thrower')ok(wpn.wt==='throwing',id+': Throwing arms without a throwing weapon');
    if(k==='gunner')ok(wpn.wt==='flintlock',id+': Gunnery without a firearm');
    if(k==='marksman'||k==='sharpshooter')ok(ranged&&(wpn.wt==='bow'||wpn.wt==='crossbow'),id+': '+T.n+' without a bow or crossbow');
    if(k==='duelist')ok(!wpn.two&&!d.shield&&!ranged,id+': Duelist without a one-handed blade and a free hand');
    if(k==='brute'&&(md.twoDmg||md.follow))ok(wpn.two&&!ranged,id+': '+p.n+' without a two-handed weapon');
    if(k==='assassin')ok(X.isLightW(wpn),id+': Assassin without a light weapon');
    if(k==='shieldbearer'||(k==='champion'&&P.cap)||(k==='bulwark'&&md.missAP))ok(k!=='shieldbearer'||!!d.shield,id+': Shieldbearer without a shield')}
   ok(fams.size<=1,id+': weapon masteries of one family at most');
   if(LIGHT.includes(id))ok(all.length<=3&&all.every(pid=>!X.perkById(pid).cap&&(X.perkById(pid).tier||1)<=3),id+': the goblins and orcs carry a lighter set');
   if(HUMAN.includes(id)&&d.xp<=150)ok(base.length<=2&&base.every(pid=>(X.perkById(pid).tier||1)<=3&&!X.perkById(pid).cap),id+' (xp '+d.xp+'): a weak foe carries one or two low perks');
   if(HUMAN.includes(id)&&d.xp>=380&&!/^necro/.test(id))ok(all.length>=4,id+' (xp '+d.xp+'): a champion or leader carries a deeper set');}
  console.log(Object.keys(FOEMAST).length+' foes, '+nPk+' perks from '+trees.size+' trees: ok') }

section('the merc path: the same perks give the same flags, weapon and stats');
{ fresh(SEED);let n=0;
  for(const id in FOEMAST)for(const L of [0,X.FOEMASTV.vet,X.FOEMASTV.elite]){const d=EN[id],ids=X.foeMastList(id,L);
   const u0=X.mkEnemy(id,'bandit'),u=X.mkEnemy(id,'bandit');u.eid=id;u.rank=L;X.foePerks(u);
   ok(JSON.stringify(u.fpk||[])===JSON.stringify(ids),id+': the working perks '+JSON.stringify(u.fpk)+' are the list '+JSON.stringify(ids));
   const w=isWpnItem(d.w)?d.w:null,m=merc('sellsword',w,ids),m0=Object.assign(X.clone(m),{perks:[]}),s=X.calc(m),s0=X.calc(m0);
   ok(JSON.stringify(s.perks)===JSON.stringify(u.fpk||[]),id+': calc() works the same perks');
   const sk=o=>JSON.stringify(Object.keys(o).sort().map(k=>[k,+o[k].toFixed(6)]));
   ok(sk(u.flags)===sk(s.flags),id+' rank '+L+': the foe\'s flags '+sk(u.flags)+' are not the merc\'s '+sk(s.flags));
   if(w)for(const k of ['hit','ign','crush','stun','rng','ap','spell']){const de=(u.wpn[k]||0)-(u0.wpn[k]||0),dm=(s.wpn[k]||0)-(s0.wpn[k]||0);ok(Math.abs(de-dm)<1e-9,id+': weapon '+k+' moved by '+de+', the merc\'s by '+dm)}
   if(w&&u0.wpn.reload)ok(u0.wpn.reload.ap-u.wpn.reload.ap===s0.wpn.reload.ap-s.wpn.reload.ap,id+': the reload AP');
   ok(u.wpn.d[0]-u0.wpn.d[0]===s.wpn.d[0]-s0.wpn.d[0]&&u.wpn.d[1]-u0.wpn.d[1]===s.wpn.d[1]-s0.wpn.d[1],id+': the weapon damage');
   const sd=(s.flags.shieldDef||0);
   for(const k of ['ms','rs','md','rd','init','brv','hp','dmg']){const de=k==='hp'?u.hpMax-u0.hpMax:k==='dmg'?(u.dmgB||0)-(u0.dmgB||0):u[k]-u0[k],dm=s[k]-s0[k]+((k==='md'||k==='rd')&&u.shield?sd:0);
    ok(Math.abs(de-dm)<1e-9,id+' rank '+L+': '+k+' moved by '+de+', the merc\'s by '+dm)}
   if(u0.shpMax>0){ok(u.shpMax===Math.round(u0.shpMax*(1+(s.flags.shieldHp||0))),id+': shield hitpoints');ok(u.shb.md===u0.shb.md+sd&&u.shb.rd===u0.shb.rd+sd,id+': a shield\'s defense goes with the shield')}
   const before=JSON.stringify(u);X.foePerks(u);ok(JSON.stringify(u)===before,id+': foePerks applies once');n++}
  // a merc and a rival keep their own perks: foePerks leaves a unit with u.m alone
  const m=merc('sellsword','arming',['vanguard.1']),pu=X.mkPlayerUnit(m),pj=JSON.stringify(pu);pu.eid='thug';X.foePerks(pu);delete pu.eid;ok(JSON.stringify(pu)===pj,'a merc unit gets no foe masteries');
  console.log(n+' foe and rank pairs match calc(): ok') }

section('in battle: ranks, elites, splits, the inspect card');
{ const G=fresh(SEED+1);G.diff='hard';G.roster=[];for(let i=0;i<6;i++){const m=merc('sellsword','arming',['vanguard.1']);m.lvl=12;G.roster.push(m)}
  let seen={},vets=0,elites=0,cards=0,el=0;
  for(const [f,foes] of [['bandit',['thug','bmark','bxbow','bknife','braid','blead']],['east',['ashi','ashiy','kageuchi','shinobi','sohei','onna','samurai','taisho']],
    ['barb',['barbz','barbax','barbskald','barbhus','barbhound']],['pit',['gmurm','gret','gthrax','gsecu','gchamp']],['gob',['gob','gobarch','gobsham']],['orc',['orcy','orcw','obrute','orcl']],['undead',['skel','necro','zomb']]])
   for(const mult of [.6,1.6]){X.seedRng(SEED+mult*10+f.length);G.day=40;const b=X.startBattle({f,mult,biome:'plains',src:{type:'sim'},quiet:true,turnCap:10,foes});ok(b,'battle '+f);b.busy=true;
    for(const u of b.units.filter(x=>x.side===1)){const want=X.foeMastList(u.eid,u.rank);
     ok(JSON.stringify((u.fpk||[]))===JSON.stringify(want.filter(id=>!(u.fpkOff||[]).includes(id))),u.name+': fpk '+JSON.stringify(u.fpk)+' for rank '+u.rank+' should be '+JSON.stringify(want));
     ok(!(u.fpkOff||[]).length,u.name+': nothing idle at the start ('+JSON.stringify(u.fpkOff)+')');
     if(want.length){seen[u.eid]=1;if(u.rank>=X.FOEMASTV.vet)vets++;if(u.rank>=X.FOEMASTV.elite)elites++;if(u.elite)el++;
      const c=X.unitCard(u);ok(/Masteries/.test(c),u.name+': the inspect card lists no masteries');for(const id of u.fpk){const p=X.perkById(id).perk;ok(c.includes('<b>'+p.n+'</b>'),u.name+': the card misses '+p.n)}cards++}
     else ok(!/Masteries/.test(X.unitCard(u)),u.name+': a foe with no masteries shows none');
     const j=JSON.stringify(u);X.foePerks(u);ok(JSON.stringify(u)===j,u.name+': applied twice')}
    // a late arrival of the same kind (a split, a summon) gets its masteries once
    const h=b.units.find(x=>x.side===1&&x.fpk&&x.fpk.length);if(h){const c0=[[0,5],[1,5],[2,5],[3,5],[4,5],[5,5]].find(([c,r])=>X.foeFree(c,r));if(c0){const e=X.foeSpawn(h.eid,h.f,c0[0],c0[1],{def:Object.assign({},EN[h.eid],{xp:0})});
      ok(e&&JSON.stringify(e.fpk)===JSON.stringify(X.foeMastList(h.eid,e.rank)),'a late '+h.eid+' carries its masteries: '+JSON.stringify(e&&e.fpk))}}
    X.B=null;X.mode='world'}
  ok(vets>0&&elites>0,'veterans '+vets+' and elite ranks '+elites+' took the field');
  console.log('cards '+cards+' list their masteries, '+vets+' veterans ('+elites+' of elite rank), '+el+' elite-modified, every kind seen: '+Object.keys(seen).length+': ok') }

section('passives on foes, one by one');
{ fresh(SEED+2);const ros=[merc('sellsword','arming',[]),merc('sellsword','arming',[]),merc('sellsword','arming',[])];
  const save={};for(const k of ['thug','samurai','braid','bknife'])save[k]=FOEMAST[k];
  FOEMAST.thug={p:['bulwark.4','medic.6','tactician.4']};FOEMAST.samurai={p:['weapons.sword','duelist.2']};FOEMAST.braid={p:['tactician.2']};FOEMAST.bknife={p:['weapons.throwing','thrower.1']};
  const A=await arena(SEED+2,ros,['thug','samurai','braid','bknife'],'bandit'),b=A.b,E=A.E,P=A.P,by=id=>E.find(u=>u.eid===id);
  for(const k in save)FOEMAST[k]=save[k];
  const th=by('thug'),sa=by('samurai'),br=by('braid'),kn=by('bknife');ok(th&&sa&&br&&kn,'the four foes');
  ok(th.flags.missAP===1&&th.flags.kbImm===1&&th.flags.angel===1&&th.flags.seizeAP===2,'Unmoved, Guardian angel and Seize the moment on a foe: '+JSON.stringify(th.flags));
  ok(kn.flags.ammoB===2&&X.ammoLeft(kn)===ITEMS.tknives.ammo+2,'Bandolier: the foe\'s stack is '+X.ammoLeft(kn));
  ok(sa.wpn.hit===ITEMS.katana.hit+10,'Blade discipline on the samurai\'s katana');
  ok(b.pvAngel,'the battle knows a Guardian angel stands on the field');
  // Unmoved: a melee miss on the foe gives it AP for its next turn
  A.park();const m0=P[0];put(m0,5,5);put(th,5,4);m0.ms=-200;b.cur=m0;const at=X.abilityInfo(m0,'attack');th.bonusAP=0;th.umvN=0;
  for(let i=0;i<3;i++)await X.strike(m0,th,at);ok(th.bonusAP===2,'Unmoved: two misses, +2 AP (at most 2): '+th.bonusAP);
  // Counter-cut: misses on the samurai draw counter-cuts, about 30% of the time
  A.park();put(m0,8,5);put(sa,8,4);m0.ms=-200;m0.hp=m0.hpMax=99999;b.cur=m0;let cut=0;const cut0=X.ctx.freeAttack;X.ctx.freeAttack=async function(e,t,why){if(e===sa&&why==='counter')cut++;return cut0(e,t,why)};
  for(let i=0;i<60;i++){sa.ap=sa.apMax;sa.aoo=0;sa.buffs=sa.buffs.filter(x=>x.foe);await X.strike(m0,sa,at)}X.ctx.freeAttack=cut0;ok(cut>=6&&cut<=36,'Counter-cut fired '+cut+' times in 60 misses');
  // Guardian angel: a killing blow on the braid next to the thug leaves it at 1 hitpoint, once
  A.park();put(th,3,3);put(br,3,4);put(m0,3,5);m0.ms=400;m0.hp=m0.hpMax=99999;br.hp=1;br.arm=0;br.helm=0;b.cur=m0;X.auraScan();await X.strike(m0,br,at);
  ok(br.alive&&br.hp===1&&th.angU===1,'Guardian angel: the ally lives at 1 hitpoint ('+br.hp+', alive '+br.alive+')');
  // Seize the moment: the thug's kill gives the nearest ally +2 AP
  A.park();put(th,10,4);put(m0,10,5);put(kn,11,4);for(const x of P.slice(1))put(x,0,BH-1-P.indexOf(x));m0.hp=1;m0.arm=0;m0.helm=0;th.ms=400;b.cur=th;kn.bonusAP=0;
  await X.strike(th,m0,X.abilityInfo(th,'attack'));ok(!m0.alive||m0.hp<=0||m0.down,'the thug strikes the merc down');ok(kn.bonusAP===2,'Seize the moment: the nearest foe ally gets +2 AP ('+kn.bonusAP+')');
  // Steadying voice: at the start of its turn the braid steadies the most shaken ally within 3 tiles
  A.park();put(br,6,2);put(sa,7,2);put(kn,6,4);sa.fearless=false;kn.fearless=false;sa.mor=1;kn.mor=2;X.pvTurn(br);ok(sa.mor===2&&kn.mor===2,'Steadying voice: the wavering samurai steadied ('+sa.mor+', '+kn.mor+')');
  X.B=null;X.mode='world';console.log('Unmoved, Counter-cut ('+cut+'/60), Guardian angel, Seize the moment, Steadying voice, Bandolier, Blade discipline on foes: ok') }

section('forecast == strike: perk-bearing foes against mercs, a directed sweep');
{ fresh(SEED+7);const ros=[merc('sellsword','arming',['vanguard.1','vanguard.2','duelist.1','duelist.2']),merc('knight','warhammer',['bulwark.1','bulwark.4'],{s:'kite'}),merc('hunter','huntbow',['marksman.1']),
   merc('sellsword','greataxe',['brute.1','brute.2']),merc('cutthroat','tknives',['weapons.throwing','thrower.1']),merc('sellsword','spear',['tactician.1'])];
  const foes=['blead','gchamp','barbhus','taisho','kageuchi','barbz','gret','onna','samurai','bknife','braid','bxbow'];
  const A=await arena(SEED+7,ros,foes,'bandit',2.2),b=A.b,R=X.mulberry(SEED+7),ri=(a,c)=>a+Math.floor(R()*(c-a+1)),pick=L=>L[Math.floor(R()*L.length)];
  ok(A.E.filter(u=>u.fpk&&u.fpk.length).length>=8,'perk-bearing foes on the field');
  const ABS=['attack','attack','attack','slash','tstrike','thrust','split','iaido','riposte'];FCHECK=true;const n0=FS.n;let tries=0;
  while(FS.n-n0<2500&&tries<30000){tries++;A.park();const U=b.units.filter(x=>x.side<2),u=pick(U),t=pick(U.filter(x=>x!==u&&x.side!==u.side));if(!t)continue;
   for(const x of U){x.lastHit=R()<.3?t.id:null;x.chainN=ri(0,4);x.mvN=ri(0,8);x.mvd=R()<.5?1:0;x.fury=ri(0,6);x.hitBy=R()<.4?[u.id,t.id]:null;x.atkN=R()<.4?{[t.id]:ri(1,4),[u.id]:ri(0,2)}:null;
    x.aimg=R()<.5?1:0;x.sfDone=R()<.5?1:0;x.dArc=R()<.5?1:0;x.aoo=R()<.3?1:0;x.angU=R()<.5?1:0;x.loaded=R()<.8;if(R()<.3)x.st.netted=1;if(R()<.2)x.st.daze=1;if(R()<.15)x.st.offbal=1}
   const d=ri(1,4),dc=ri(0,d),c0=ri(3,12),r0=ri(3,8);put(u,c0,r0);put(t,c0+dc,r0-(d-dc));if(t.c>=BW||t.r<0)continue;
   for(const x of U)if(x!==u&&x!==t){if(R()<.35){const c=t.c+pick([-1,1,0,0]),r=t.r+pick([0,0,-1,1]);if(c>=0&&c<BW&&r>=0&&r<BH&&!X.unitAt(c,r))put(x,c,r)}else put(x,ri(0,15),pick([0,11]))}
   if(X.unitAt(u.c,u.r)!==u||X.unitAt(t.c,t.r)!==t)continue;X.foeAuras();X.auraScan();
   t.hp=R()<.3?ri(1,20):t.hpMax;t.arm=R()<.3?0:t.armMax;
   const id=pick(ABS);if(id!=='attack'&&!(u.abs||[]).includes(id))continue;const a=X.abilityInfo(u,id);if(!a||a.tgt!=='enemy'&&a.tgt!=='aoe')continue;if(a.rng!=null&&mdist0(u,t)>Math.max(1,a.rng))continue;
   if(!X.canUse(Object.assign({},u,{ap:99,fat:0}),a)&&!(a.rng>1&&X.rangedLocked(u)))continue;if(a.split&&!t.shield)continue;
   b.cur=R()<.6?u:t;await X.strike(u,t,a,R()<.1?{splash:.7}:R()<.05?{auto:1}:{})}
  FCHECK=false;ok(FS.n-n0>=2500,'the sweep ran: '+(FS.n-n0)+' strikes in '+tries+' tries');ok(FS.foePk>500&&FS.vsPk>500,'blows by ('+FS.foePk+') and on ('+FS.vsPk+') perk-bearing foes');
  X.B=null;X.mode='world';console.log('directed sweep: '+(FS.n-n0)+' strikes ('+FS.foePk+' by foes with masteries, '+FS.vsPk+' on them), statuses '+JSON.stringify(FS.st)+': ok') }

section('auto battles: the AI plays foes with masteries, every blow checked');
{ let wins=0,n=0;const N0=FS.n,P0=FS.foePk,said={};const say0=X.ctx.say;X.ctx.say=function(s){if(/steadies/.test(s))said.steady=(said.steady||0)+1;if(/follows through/.test(s))said.follow=(said.follow||0)+1;return say0.apply(this,arguments)};
  const fl0=X.ctx.float;X.ctx.float=function(u,txt){if(u&&u.side===1&&/^\+\d+ AP$/.test(txt))said.ap=(said.ap||0)+1;return fl0.apply(this,arguments)};
  const kit=[['sellsword','arming',[]],['knight','warhammer',[],'kite'],['hunter','huntbow',[]],['sellsword','greataxe',[]],['militia','spear',[]],['sellsword','mace',[],'heater']];
  const FAC=['bandit','east','barb','pit','bandit','east','barb','pit','gob','orc'];
  for(let i=0;i<FAC.length;i++){const G=fresh(SEED+30+i);G.roster.length=0;
   for(let j=0;j<6;j++){const [bg,w,,s]=kit[(i+j)%kit.length],m=merc(bg,w,[],{s});X.gainXP(m,X.XPT[8]);m.lvl=8;m.pend=0;m.pp=8;X.autoLearn(m);m.eq.h='hood';m.hp=X.calc(m).hp;G.roster.push(m)}
   G.day=30;FCHECK=true;const res=await X.autoBattle({f:FAC[i],mult:.75,biome:'plains',pilot:'sensible',src:{type:'test'},turnCap:4000});FCHECK=false;
   ok(res&&!res.stuck,'an auto battle against '+FAC[i]+' ended');n++;if(res.win)wins++;X.B=null;X.mode='world'}
  X.ctx.say=say0;X.ctx.float=fl0;
  ok(FS.n-N0>400&&FS.foePk-P0>100,'blows checked in the battles: '+(FS.n-N0)+' ('+(FS.foePk-P0)+' by foes with masteries)');
  console.log('AI over '+n+' battles ('+wins+' won), '+(FS.n-N0)+' blows checked, passives seen '+JSON.stringify(said)+': ok') }

console.log('\nOK foemast ('+((Date.now()-T0)/1000).toFixed(1)+'s)');process.exit(0)})();
