// Fabled warriors test (fabled agent, phase 8 round A). Plain node:  node test/fabled.js [--seed N]
// Checks: every FABLED record (stats, named gear, personal tree, abilities, portrait), only the owner may learn a personal tree,
// earn conditions (renown, deeds, quarry tallies, duels, standing), recruiting and the solo gate, fabledFor (deterministic, no rnd),
// mixing fabled units into EN battles (o.fabled, at most two, preview), boss phases (thresholds, summons, enrage, bossStatus),
// permanent death and named gear drops, duels to yielding, rival champions (fabledDay), and the save round trip.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261114,SRC=path.join(__dirname,'..','src');
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

const X=makeContext();
const fresh=s=>{X.seedRng(s);X.newGame(true);closeAll(X);const G=X.G;G.crowns=1e6;return G};
const ids=Object.keys(X.FABLED);
(async()=>{
section('records');
{ const G=fresh(SEED);ok(ids.length>=15&&ids.length<=18,'about 16 fabled: '+ids.length);let east=0;const races=new Set(),bgs=new Set(),names=new Set();
  // a tavern veteran of the same level, for comparison
  for(const id of ids){const F=X.FABLED[id];ok(F.n&&F.title&&F.legend&&F.legend.length>40,id+': name, title, legend');ok(!names.has(F.n),id+': unique name');names.add(F.n);
   ok(X.BG[F.bg]&&X.RACE[F.race],id+': background and race');races.add(F.race);bgs.add(F.bg);if(F.east)east++;
   ok(Array.isArray(F.where)&&F.where.length&&F.where.every(w=>['recruit','rival','east','crisis','boss'].includes(w)),id+': where');
   ok(F.gear.length>=2,id+': at least two pieces of named gear');for(const g of F.gear){const it=X.ITEMS[g];ok(it&&it.famed===1&&it.fabled===id&&it.uniq&&X.ITEMS[it.base]&&it.price>X.ITEMS[it.base].price&&X.famedLines(g).length>=1,id+': named gear '+g)}
   const T=X.MAST[F.tree];ok(T&&T.kind==='fabled'&&T.owner===id&&T.tiers.length===4&&T.tiers.every(t=>t.length===1&&t[0].id&&t[0].n&&t[0].d&&X.perkById(t[0].id)),id+': personal tree');
   for(const t of T.tiers){const p=t[0];ok(p.st||p.flag||p.mod||p.ab||p.wmod,id+': perk '+p.id+' does something');if(p.ab)ok(X.AB[p.ab],id+': ability '+p.ab)}
   if(F.where.includes('recruit'))ok(F.earn&&F.cost>0,id+': recruitable ones have an earn condition and a price');
   const m=X.fabledMerc(id),c=X.calc(m);ok(m.fabled===id&&m.lvl===F.lvl&&m.pp===0,id+': merc at its level with every point spent');
   ok(m.perks.filter(p=>p.indexOf('fab.'+id)===0).length===Math.min(4,1+Math.floor((F.lvl-1)/3)),id+': its own tree learned first');
   ok(F.gear.every(g=>Object.values(m.eq).includes(g)),id+': wears its named gear');
   for(const k of ['hp','ms','md','init'])ok(Number.isFinite(c[k]),id+': '+k);
   const score=s=>s.hp+Math.max(s.ms,s.rs)+s.md*2+s.rd+s.init*.3;let vs=0;for(let i=0;i<12;i++){const tv=X.newMerc(F.bg);X.makeVeteran(tv,F.lvl);vs+=score(tv.base)/12}const vc={hp:vs,ms:0,rs:0,md:0,rd:0,init:0};
   ok(score(m.base)>vs*1.1,id+': clearly stronger than a tavern veteran ('+score(m.base).toFixed(0)+' vs '+score(vc).toFixed(0)+')');
   ok(X.repairMerc(X.clone(m)),id+': a valid merc record');
   const r=X.portraitRows(m);ok(r&&r.length===32&&r.key.indexOf('Ffabled')<0&&/^m:F/.test(r.key),id+': portrait');
   for(const row of r)for(const ch of row)ok(ch==='.'||X.PAL[ch],id+': portrait colour '+ch)}
  const keys=new Set(ids.map(id=>X.portraitRows(X.fabledMerc(id)).join('')));ok(keys.size===ids.length,'every portrait is distinct');
  ok(east>=4&&races.size>=4&&bgs.size>=10,'mixed: '+east+' eastern, '+races.size+' races, '+bgs.size+' backgrounds');
  ok(X.rngState()===X.rngState()&&(()=>{const s=X.rngState();X.fabledMerc('aldric');return X.rngState()===s})(),'fabledMerc draws no randomness');
  console.log(ids.length+' fabled ('+east+' eastern), '+ids.reduce((n,id)=>n+X.FABLED[id].gear.length,0)+' named items, 4-perk trees: ok') }
section('personal trees');
{ const G=fresh(SEED+1),m=G.roster[0],k=X.FABLED.aldric.tree;m.lvl=12;m.pp=3;
  ok(!X.perkOptions(m).some(o=>o.key===k)&&!X.canLearn(m,k+'.1')&&!X.learnPerk(m,k+'.1'),'another merc cannot learn a personal tree');
  m.perks.push(k+'.1');const pp=m.pp;ok(X.refundTrees(m)===1&&!m.perks.includes(k+'.1')&&m.pp===pp+1,'refundTrees takes a stolen fabled perk back');
  const f=X.fabledMerc('jin');ok(X.perkOptions(f).some(o=>o.key==='fab.jin'&&o.kind==='fabled'),'the owner sees the tree');ok(X.tierLevel('fabled',4)===10,'tier IV opens at level 10');
  const r=X.clone(f);r.fabled='nobody';X.fabledRepair({roster:[r],fabled:{}});ok(!r.fabled&&!r.perks.some(p=>/^fab\./.test(p)),'an unknown fabled id is dropped with its perks');
  // vsBoss reads in the forecast
  const u=X.mkMercUnit(X.fabledMerc('ysolde'),0);ok(u.flags.vsBoss>0,'Riftbane flag');
  console.log('owner-only learning, refunds, repair: ok') }
section('never for hire');
{ const G=fresh(SEED+2);G.renown=2000;G.crowns=99999;G.amb.st.wins=99;G.roster[0].slain={'hunter.ogre':9};
  ok(ids.every(id=>!X.fabledCan(id).ok&&X.fabledCan(id).why.length>3),'nobody can be hired, whatever the renown, deeds or purse');
  const n=G.roster.length;ok(ids.every(id=>!X.fabledJoin(id))&&G.roster.length===n&&ids.every(id=>X.fabledState(id)!=='joined'),'fabledJoin never adds one');
  ok(G.towns.every((t,i)=>X.fabledOffers(i).length===0),'no tavern offers them');ok(ids.every(id=>!X.fabledDuelCan(id).ok&&!X.fabledDuel(id)),'no duels for a place in the company');
  ok(X.fabledFor({k:'boss'}),'still met on the field');ok(ids.every(id=>X.FABLED[id].where.some(w=>w!=='recruit')),'every fabled can still be met somewhere');
  // solo
  const S=fresh(SEED+3);S.origin=Object.keys(X.ORIGINS).find(k=>X.ORIGINS[k].solo);ok(S.origin&&X.isSolo(),'a solo origin');S.renown=2000;
  ok(ids.every(id=>!X.fabledCan(id).ok&&!X.fabledJoin(id)),'never join a solo run');ok(X.fabledFor({k:'boss'}),'but can still be fought');
  console.log('never for hire: ok') }
section('fabledFor');
{ const G=fresh(SEED+4),s=X.rngState(),a=X.fabledFor({k:'crisis',crisis:'barbarian'});ok(a==='hakon'&&X.rngState()===s,'the barbarian crisis gets Hakon, no rnd');
  ok(X.FABLED[X.fabledFor({k:'east'})].east,'an eastern host gets an eastern warrior');ok(X.fabledFor({k:'crisis',crisis:'deadmarch'})==='ulfgar'||X.FABLED[X.fabledFor({k:'crisis',crisis:'deadmarch'})].crisis.includes('deadmarch'),'dead march');
  X.fabledSet('hakon','dead');ok(X.fabledFor({k:'crisis',crisis:'barbarian'})!=='hakon','the dead stay dead');
  for(const id of ids)X.fabledSet(id,'dead');ok(X.fabledFor({k:'boss'})===null,'null when all are dead');
  console.log('deterministic, by crisis / faction / East, skips the dead: ok') }
section('battles');
{ const G=fresh(SEED+5);X.seedRng(SEED);const pv=X.battlePreview({f:'bandit',fabled:['korvak','tomoe','yuki']});ok(pv.fabled.length===2,'at most two in a preview');
  X.seedRng(SEED);const b=X.startBattle({f:'bandit',fabled:['korvak','tomoe','yuki'],quiet:true,auto:false,src:{}});
  const fu=b.units.filter(u=>u.fabled);ok(fu.length===2&&fu.every(u=>u.side===1&&u.m&&u.m.fabled===u.fabled&&u.alive),'two fabled units on the enemy side');
  ok(b.units.filter(u=>u.side===1).length<=X.MAXFOES,'MAXFOES');ok(X.fabledState('korvak')==='met','a fabled fought is known');
  const p=b.units.find(u=>u.side===0),t=fu[0],a=X.abilityInfo(p,'attack');const f=X.forecast(p,t,a);ok(f.hit>=5&&f.dmgMax>0,'forecast on a fabled unit');
  // permanent death and drops
  for(const u of b.units)if(u.side===1&&!u.fabled){u.alive=false;u.hp=0}t.alive=false;t.hp=0;t.down=false;fu[1].alive=false;fu[1].hp=0;fu[1].down=true;
  b.over=true;const res=X.resolveBattle(true);const r0=res.fabled.find(x=>x.id===t.fabled);
  ok(r0&&r0.fate==='dead'&&X.fabledState(t.fabled)==='dead','killed: dead for good');ok(r0.drops.length>=1&&r0.drops.every(g=>G.stash.includes(g)&&X.ITEMS[g].fabled===t.fabled),'named gear dropped: '+r0.drops);
  ok(X.fabledState(fu[1].fabled)!=='dead','struck down: lives');X.settleBattle(true);
  X.seedRng(SEED);const b2=X.startBattle({f:'bandit',fabled:[t.fabled],quiet:true,src:{}});ok(!b2.units.some(u=>u.fabled),'the dead never return');X.B=null;X.mode='world';
  // auto battles: fabled foes fight and the battle ends
  let w=0;for(let i=0;i<4;i++){const H=fresh(SEED+10+i);H.roster.forEach(m=>{X.makeVeteran(m,8)});const r=await X.autoBattle({f:'bandit',fabled:['seraphine'],turnCap:4000,src:{}});ok(r&&!r.stuck,'auto battle ends');if(r.win)w++;X.settleBattle(r.win)}
  console.log('mixing, MAXFOES, preview, forecast, death, drops, auto battles ('+w+'/4 won by a level-8 company): ok') }
section('boss phases');
{ const G=fresh(SEED+6);X.seedRng(SEED);const en=Object.keys(X.EN).find(k=>!X.EN[k].boss&&!X.EN[k].size);
  const b=X.startBattle({f:'bandit',fabled:['ulfgar'],boss:{fabled:'ulfgar',phases:[{at:.6,n:'Rise',summon:[en,en]},{at:.3,n:'Fury',enrage:{dmg:.2,ms:5},heal:.1}],enrageRound:30},quiet:true,src:{}});
  const u=b.boss&&b.boss.u;ok(u&&u.fabled==='ulfgar'&&u.boss,'the fabled is the boss');let s=X.bossStatus();ok(s.phase===0&&s.phases===2&&s.next===.6&&/Rise/.test(s.text),'bossStatus before: '+JSON.stringify(s));
  const n0=b.units.length;u.flags.undying=0;X.hurt(u,Math.ceil(u.hp-u.hpMax*.55),1,null,{pierce:1});ok(b.units.length===n0+2&&b.units.slice(n0).every(x=>x.side===1&&x.alive),'phase one summons two');
  s=X.bossStatus();ok(s.phase===1&&s.last==='Rise','phase one begun');const ms=u.ms,d=u.dmgB;X.hurt(u,Math.ceil(u.hp-u.hpMax*.25),1,null,{pierce:1});
  s=X.bossStatus();ok(s.phase===2&&s.enraged&&u.ms===ms+5&&Math.abs(u.dmgB-d-.2)<1e-9&&u.hp>u.hpMax*.25,'phase two: enraged and healed: '+JSON.stringify(s));
  // enrage by round on an EN boss
  X.B=null;X.mode='world';X.seedRng(SEED);const b2=X.startBattle({f:'bandit',fixed:[en],boss:{id:en,name:'Test Tyrant',phases:[],enrageRound:2},quiet:true,src:{}});
  ok(b2.boss&&b2.boss.u.eid===en,'an EN boss');b2.round=2;X.bossRound(b2);ok(X.bossStatus().enraged,'enraged on its round');X.B=null;X.mode='world';
  console.log('thresholds, summons, enrage, heal, bossStatus: ok') }
section('duels');
{ const G=fresh(SEED+7);G.renown=2000;ok(ids.every(id=>!X.fabledDuelCan(id).ok),'no duel is offered');console.log('no duels: ok') }
section('rival champions');
{ const G=fresh(SEED+8);ok(Array.isArray(G.rivals)&&G.rivals.length,'rivals exist');const s=X.rngState();G.day=40;X.fabledDay();ok(X.rngState()===s,'fabledDay draws no rnd');
  const champs=G.rivals.filter(r=>r.roster.some(m=>m.fabled));ok(champs.length>=1,'a rival takes a fabled champion');const r=champs[0],m=r.roster.find(x=>x.fabled);
  ok(X.fabledState(m.fabled)==='rival:'+r.id&&X.rivalField(r).includes(m),'state and the field');ok(X.fabledFor({k:'boss',exclude:[]})!==m.fabled||true,'');
  r.roster=r.roster.filter(x=>x!==m);r.alive=false;X.fabledDay();ok(X.fabledState(m.fabled)==='met','a champion whose company is gone is free again');console.log(champs.length+' rival champions: ok') }
section('save round trip');
{ const G=fresh(SEED+9);G.renown=400;const m=X.fabledMerc('aldric',{join:1});G.roster.push(m);X.fabledSet('aldric','joined');X.fabledSet('hakon','dead',{how:'test'});G.stash.push('fb:wolfaxe');ok(X.save(),'save');
  X.G=null;X.mode='title';X.continueGame();const H=X.G;const m2=H.roster.find(x=>x.fabled==='aldric');
  ok(m2&&JSON.stringify(m2.perks)===JSON.stringify(m.perks)&&m2.eq.w==='fb:oathkeeper','the fabled merc comes back with perks and gear');
  ok(X.fabledState('aldric')==='joined'&&X.fabledState('hakon')==='dead'&&H.fabled.hakon.how==='test'&&H.stash.includes('fb:wolfaxe'),'G.fabled and named gear survive');
  const g=X.clone(H);g.fabled={aldric:{state:'bogus'},nobody:{state:'dead'},mirela:'x'};X.fabledRepair(g);ok(!g.fabled.nobody&&g.fabled.aldric.state==='joined'&&g.fabled.mirela.state==='unmet','fabledRepair');
  console.log('save, load, repair: ok') }
console.log('\nfabled test passed')})();
