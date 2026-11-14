// Items test. Plain node, no browser:  node test/items.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the same vm approach and DOM stubs as test/headless.js) and checks:
// catalog integrity (tiers, unique looks, family sizes, prices rising with tier, skills, starting gear), market tiering by town size
// and day, famed generation (bounds, power scaling, determinism, names), famed items in calc / equip / the market, the save round
// trip of famed items (and the v6 -> v7 migration), and the drop rules (none early, some late, guaranteed from end-game kills).
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261114,SRC=path.join(__dirname,'..','src');
let failed=false;
function fail(msg){failed=true;console.error('\nFAIL: '+msg);process.exit(1)}
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

const X=makeContext(),I=X.ITEMS,FAM=['sword','axe','mace','dagger','spear','bow','staff','hammer','polearm','greatsword','crossbow','flintlock'];
const plain=()=>Object.keys(I).filter(id=>!I[id].famed);

section('catalog');
{ const looks={};for(const id of plain()){const it=I[id];ok(Number.isInteger(it.tier)&&it.tier>=1&&it.tier<=5,id+' has no tier 1..5');ok(typeof it.look==='string'&&it.look,id+' has no look');
   ok(!looks[it.look],'look '+it.look+' is shared by '+id+' and '+looks[it.look]);looks[it.look]=id;ok(it.price>0&&typeof it.n==='string'&&it.n,id+' has no name or price');
   if(it.k==='w'){ok(Array.isArray(it.d)&&it.d[0]>0&&it.d[1]>it.d[0]&&it.ap>=2&&it.fat>=0&&it.rng>=1&&it.ign>0&&it.ign<1,id+': weapon numbers');ok(it.sk.length>=1&&it.sk.length<=2&&it.sk.every(a=>X.AB[a]&&(!X.AB[a].needs||X.AB[a].needs===it.wt||(Array.isArray(X.AB[a].needs)&&X.AB[a].needs.includes(it.wt)))),id+': skills of its own family')}
   if(it.k==='s')ok(/^(buckler|round|kite|heater|tower|spiked|targe|pavise)/.test(it.look)&&it.hp>0&&it.md>0&&it.rd>0,id+': shield look family and numbers');
   if(it.k==='a'||it.k==='h')ok(it.arm>0&&it.fat>=0,id+': armor numbers')}
  const rows=[];
  for(const f of FAM){const L=plain().filter(id=>I[id].k==='w'&&I[id].wt===f),T=new Set(L.map(id=>I[id].tier));ok(L.length>=5&&L.length<=7,f+': '+L.length+' items (5 to 7)');ok(T.size>=4&&T.has(1)&&T.has(5),f+' must span tiers 1 to 5');
   for(const a of L)for(const b of L)if(I[b].tier>=I[a].tier+2)ok(I[b].price>I[a].price,f+': '+b+' (tier '+I[b].tier+') must cost more than '+a+' (tier '+I[a].tier+')');rows.push(f+' '+L.length)}
  for(const [k,n,min] of [['a','body armor',14],['h','helmets',12],['s','shields',12]]){const L=plain().filter(id=>I[id].k===k),T=new Set(L.map(id=>I[id].tier));ok(L.length>=min,n+': '+L.length+' (need '+min+')');ok(T.size===5,n+' must span tiers 1 to 5');rows.push(n+' '+L.length)}
  ok(['buckler','round','kite','heater','tower','spiked','targe','pavise'].every(l=>plain().some(id=>I[id].k==='s'&&I[id].look.indexOf(l)===0)),'every shield shape is carried');
  { const sh=plain().filter(id=>I[id].k==='s').map(id=>I[id]);ok(new Set(sh.map(i=>[i.md,i.rd,i.hp,i.fat].join())).size===sh.length,'every shield has its own numbers') }
  { const hs=plain().filter(id=>I[id].k==='h').map(id=>I[id]).sort((a,b)=>a.price-b.price);ok(hs.every((h,i)=>!i||(h.arm>hs[i-1].arm&&h.fat>=hs[i-1].fat&&h.tier>=hs[i-1].tier)),'helmets rise in armor, weight and tier with price') }
  for(const b in X.BG)for(const g of X.BG[b].gear.concat(X.BG[b].side?[X.BG[b].side]:[]))for(const id of g.split('|'))ok(id==='-'||(I[id]&&I[id].tier<=3),'starting gear of '+b+': '+id+' (an item of tier 1 to 3)');
  for(const f in X.FACT)for(const id of X.FACT[f].loot||[])if(!I[id])console.log('  note: FACT.'+f+'.loot names an unknown item "'+id+'" (skipped by the loot roll)');
  console.log(rows.join(', ')+'; '+plain().length+' items, every look unique: ok') }

section('markets');
{ X.seedRng(SEED);X.newGame(true);closeAll(X);const G=X.G,t=G.towns[0],tierOf=id=>I[id].tier;
  const roll=(size,day,n)=>{const s0=t.size,d0=G.day;t.size=size;G.day=day;const L=[];for(let i=0;i<n;i++){X.stockTown(t);L.push(...t.stock)}t.size=s0;G.day=d0;return L};
  ok(X.marketTier(1,1)===2&&X.marketTier(3,1)===2&&X.marketTier(2,40)===3&&X.marketTier(3,40)===5&&X.marketTier(3,16)===4,'marketTier by size and day');
  for(const [size,day,maxT] of [[1,1,2],[1,60,3],[2,3,2],[2,60,3],[3,2,2],[3,10,3],[3,20,4],[3,45,5]]){const L=roll(size,day,30);
   ok(L.every(id=>I[id]&&!I[id].famed&&!I[id].uniq),'markets never stock famed or unique items');ok(Math.max(...L.map(tierOf))===maxT,`size ${size} day ${day}: top tier ${Math.max(...L.map(tierOf))}, want ${maxT}`);
   ok(L.filter(id=>tierOf(id)<=2).length>=L.length*.2,'low tiers stay on the stalls')}
  ok(roll(1,80,40).every(id=>tierOf(id)<=3)&&roll(2,80,40).every(id=>tierOf(id)<=3),'tier 4 and 5 only in cities');
  { const L=roll(3,45,40),cnt=L.filter(id=>tierOf(id)>=4).length;ok(cnt>0&&cnt<L.length*.6,'a late city stocks some tier 4-5') }
  X.stockTown(t);ok(t.stock.length===9&&t.stock.some(id=>I[id].k==='h'),'nine items, a helmet among them');
  G.town=0;G.crowns=1e6;X.openTown(0);closeAll(X);G.town=0;const n0=G.stash.length,id=t.stock[0];X.buyItem(0);ok(G.stash.length===n0+1&&G.stash[n0]===id,'buyItem');const c0=G.crowns;X.sellItem(n0);ok(G.crowns===c0+X.mkSellPrice(id,0),'sellItem');
  // hunt contracts: a faction from the pool, a lair on its biomes, pay by tier
  let hunts=0;for(let i=0;i<200;i++){const c=X.genContract(t);if(c.type!=='hunt')continue;hunts++;ok(X.FACT[c.f]&&isFinite(c.x)&&isFinite(c.y)&&c.pay>0&&!/\{place\}/.test(c.title),'hunt contract '+JSON.stringify(c))}
  ok(hunts>100,'hunts posted');console.log('market tiers by size and day, stock rules, buy / sell, '+hunts+' hunt contracts'+(typeof X.factionPool==='function'?' (from factionPool)':' (fallback list)')+': ok') }

section('famed generation');
{ const G=X.G,R=X.FAMED_ROLL,bases=plain().filter(id=>!I[id].uniq);
  const bound=(B,s)=>{const r=R[X.famedKind(B)].find(x=>x[0]===s);return r};
  let n=0,sum={0:0,1:0},cnt={0:0,1:0};
  for(const pw of [0,.5,1])for(const b of bases){X.seedRng(SEED+n++);const id=X.makeFamed(b,pw,{from:'a test',day:30});ok(id&&/^f:\d+$/.test(id)&&I[id]&&I[id].famed===1&&I[id].base===b,'makeFamed('+b+')');
   const it=I[id],B=I[b],M=it.mods,ks=Object.keys(M);ok(ks.length>=Math.min(2,X.famedPool(B,pw).length)&&ks.length>=1&&ks.length<=4,b+': '+ks.length+' improvements');ok(typeof it.n==='string'&&it.n.length>4&&it.n!==B.n,b+': a name');ok(it.price>B.price,b+': priced above its base');
   ok(it.look===B.look&&it.k===B.k&&it.tier===B.tier,b+': keeps its look, kind and tier');
   for(const k of ks){const s=k==='d'?'dmg':k,r=bound(B,s);ok(r,b+': '+s+' is not a roll for its kind');const [,lo,hi]=r,eps=1e-9;
    if(s==='dmg'){ok(M.d[1]>=Math.max(2,Math.round(B.d[1]*lo))&&M.d[1]<=Math.max(2,Math.round(B.d[1]*hi))&&M.d[0]>=1&&M.d[0]<=Math.max(1,Math.round(B.d[0]*hi)),b+': damage roll '+M.d)}
    else if(s==='arm')ok(M.arm>=Math.max(5,Math.round(B.arm*lo))&&M.arm<=Math.max(5,Math.round(B.arm*hi)),b+': armor roll '+M.arm);
    else if(s==='fat')ok(M.fat>=1&&M.fat<=hi,b+': fatigue roll '+M.fat);
    else ok(M[k]>=lo-eps&&M[k]<=hi+eps,b+': '+s+' roll '+M[k]+' outside '+lo+'..'+hi);
    if(s==='ap')ok(pw>=.5&&it.ap===B.ap-1,b+': AP -1 only from strong fights')}
   if(M.d)ok(it.d[0]===B.d[0]+M.d[0]&&it.d[1]===B.d[1]+M.d[1],b+': damage applied');if(M.arm)ok(it.arm===B.arm+M.arm,b+': armor applied');if(M.md)ok(it.md===(B.md||0)+M.md,b+': defense applied');
   if(M.fat)ok(it.fat===B.fat-M.fat&&it.fat>=(B.k==='w'?2:0),b+': fatigue applied');ok(X.famedLines(id).length===ks.length,b+': famedLines lists every improvement');
   ok(B.d===undefined||it.d!==B.d,b+': the famed copy has its own arrays');
   if(pw!==.5){const v=ks.length+(M.d?M.d[1]/B.d[1]*10:0)+(M.arm?M.arm/B.arm*10:0)+(M.md||0)/3+(M.rd||0)/3+(M.hit||0)/5;sum[pw]+=v;cnt[pw]++}}
  ok(sum[1]/cnt[1]>sum[0]/cnt[0]*1.3,'power scales the rolls: '+(sum[0]/cnt[0]).toFixed(2)+' -> '+(sum[1]/cnt[1]).toFixed(2));
  // determinism: the same RNG state gives the same famed item; the game stream moves
  X.seedRng(777);const a=X.makeFamed('arming',.7),ra=X.clone(G.famed[a]),s1=X.rngState();delete G.famed[a];X.seedRng(777);const b=X.makeFamed('arming',.7),rb=X.clone(G.famed[b]);
  ok(a===b&&X.rngState()===s1&&s1!==777&&JSON.stringify(ra)===JSON.stringify(rb),'makeFamed is deterministic under the seeded RNG');
  // names: two-part tables, 100+ per kind
  for(const b of ['arming','waraxe','mace','spear','warbow','musket','focus','kite','mail','nasal'])ok(X.famedNameCount(I[b])>=100,'name combinations for '+b);
  { const names=new Set(Object.values(G.famed).map(f=>f.n));ok(names.size>Object.keys(G.famed).length*.6,'names mostly distinct: '+names.size+' of '+Object.keys(G.famed).length) }
  // famed items work everywhere ITEMS does
  const m=X.G.roster[0],fw=X.makeFamed('arming',1),fa=X.makeFamed('mail',1),fs=X.makeFamed('kite',1);m.eq.w=fw;m.eq.a=fa;m.eq.s=fs;const s=X.calc(m);
  ok(s.wpn.id===fw&&s.wpn.d[1]>=I.arming.d[1]&&s.arm===I[fa].arm&&s.shield&&s.shield.hp>=I[fs].hp,'calc() reads famed gear');
  ok(X.itemDeltas(fw,'arming').some(d=>d.v>0),'comparison chips see the improvements');ok(X.sellPrice(fw)===Math.floor(I[fw].price*X.FAMED_SELL)&&X.sellPrice(fw)>X.sellPrice('arming'),'famed items sell well');
  ok(/fmd-up/.test(JSON.stringify(X.pnFamedFacts(fw)))&&/famed/.test(X.pnItemIcon(fw,32))&&/fmd-n/.test(X.pnItemName(fw)),'famed display helpers');
  console.log(n+' famed items rolled across every base at three powers: bounds, power scaling, determinism, names, calc / chips / sale: ok') }

section('saves');
{ X.seedRng(SEED+5);X.newGame(true);closeAll(X);let G=X.G;G.day=40;const f1=X.makeFamed('greataxe',.8,{from:'the test',day:40}),f2=X.makeFamed('plate',.6);
  G.stash.push(f1);G.roster[1].eq.a=f2;delete G.roster[1].cond;const want={f1:X.clone(I[f1]),f2:X.clone(I[f2])},rec=X.clone(G.famed);
  ok(X.save(),'save() failed');const raw=JSON.parse(X.store.get(X.SAVEKEY));ok(raw.v===X.SAVEVER&&X.SAVEVER>=7&&raw.famed&&raw.famed[f1]&&raw.famed[f1].base==='greataxe','the save carries G.famed');
  // a fresh page: no famed item in ITEMS until the save is read
  for(const id of Object.keys(I))if(id.slice(0,2)==='f:')delete I[id];X.G=null;X.mode='title';X.continueGame();G=X.G;
  ok(X.mode==='world'&&JSON.stringify(G.famed)===JSON.stringify(rec),'G.famed comes back');ok(JSON.stringify(I[f1])===JSON.stringify(want.f1)&&JSON.stringify(I[f2])===JSON.stringify(want.f2),'famed items are registered again on load');
  ok(G.stash.includes(f1)&&G.roster[1].eq.a===f2&&X.calc(G.roster[1]).arm===want.f2.arm,'stash and worn famed gear survive the round trip');
  // a broken record is dropped, and so is the gear that named it
  const bad=JSON.parse(X.store.get(X.SAVEKEY));bad.famed['f:999']={base:'nosuchitem',n:'X',mods:{},price:5};bad.stash.push('f:999');X.store.set(X.SAVEKEY,JSON.stringify(bad));
  const r=X.readSave();ok(r.state==='ok'&&!r.g.famed['f:999']&&!r.g.stash.includes('f:999')&&!I['f:999'],'a famed record with no base is dropped');
  // v6 -> v7
  const v6=JSON.parse(X.store.get(X.SAVEKEY));v6.v=6;delete v6.famed;v6.stash=v6.stash.filter(id=>id.slice(0,2)!=='f:');v6.roster.forEach(m=>{for(const k in m.eq)if(m.eq[k]&&String(m.eq[k]).slice(0,2)==='f:')m.eq[k]=null});
  X.store.set(X.SAVEKEY,JSON.stringify(v6));const r6=X.readSave();ok(r6.state==='ok'&&r6.v===6&&r6.g.v===X.SAVEVER&&JSON.stringify(r6.g.famed)==='{}','a version 6 save migrates with no famed items');
  X.G=null;X.mode='title';X.continueGame();ok(X.mode==='world'&&X.G.famed&&!Object.keys(X.G.famed).length,'the v6 company loads');
  X.store.clear();console.log('save version '+X.SAVEVER+': famed round trip, re-registration on load, broken records, v6 migration: ok') }

section('drops');
{ X.seedRng(SEED+9);X.newGame(true);closeAll(X);const G=X.G;
  const P=X.famedPlan,E=(d,o)=>Object.assign({alive:false,gone:null,def:d,name:d.n,f:'gob'},o||{});
  ok(P([E(X.EN.orcw),E(X.EN.orcl)],{day:10,rank:3}).p===0,'no famed drop before day '+X.FAMED_DAY);
  ok(P([E(X.EN.gob),E(X.EN.gob)],{day:80,rank:0}).p===0,'no famed drop from weak foes, however late');
  const late=P([E(X.EN.orcw),E(X.EN.orcw),E(X.EN.orcl)],{day:60,rank:2});ok(late.p>0&&late.p<=X.FAMED_MAXP&&!late.sure.length,'a chance late against strong foes: '+late.p.toFixed(3));
  ok(P([E(X.EN.orcw)],{day:90,rank:2.5}).p>P([E(X.EN.orcw)],{day:30,rank:1}).p,'the chance grows with day and rank');
  ok(P([E(X.EN.tyrant)],{day:12}).sure.length===1,'the rift tyrant always drops one');ok(!P([E(X.EN.tyrant,{alive:true})],{day:12}).sure.length,'only when it falls');
  if(X.EN.wyvern)ok(P([E(X.EN.wyvern,{f:'wyvern'})],{day:20}).sure.length===1,'a slain wyvern always drops one');
  // through resolveBattle: kill the field and read the result
  const fightOnce=(o,day)=>{G.day=day;const b=X.startBattle(Object.assign({mult:1,src:{type:'sim'},quiet:true},o));ok(b,'battle did not start');for(const u of b.units)if(u.side===1)u.alive=false;
   const res=X.resolveBattle(true);X.B=null;X.mode='world';return res};
  let early=0;for(let i=0;i<20;i++){X.seedRng(SEED+100+i);early+=fightOnce({f:'orc',mult:1.4},8).famed.length}ok(early===0,'no famed items from early fights');
  X.seedRng(SEED+300);const ty=fightOnce({f:'void',fixed:['tyrant']},14);ok(ty.famed.length>=1&&ty.famed.every(id=>I[id]&&I[id].famed&&G.stash.includes(id)&&ty.loot.includes(id)),'the tyrant drops a famed item into the stash');
  ok(/fmd-n/.test(X.battleResultHTML(ty)),'the results dialog shows the famed drop');
  G.roster.forEach(m=>{m.lvl=12;m.field=true});let late2=0,n=0;for(let i=0;i<40;i++){X.seedRng(SEED+500+i);const r=fightOnce({f:'bandit',mult:1.5},70);n++;late2+=r.famed.length}
  ok(late2>0&&late2<n,'some late fights drop famed items: '+late2+' of '+n);
  { X.seedRng(SEED+900);const r=fightOnce({f:'orc',mult:1.5},70),lead=X.B===null&&r;const pl=X.famedPlan([{alive:false,def:X.EN.orcl,name:'Elite orc warlord',rank:3,f:'orc'}],{day:70,rank:3});
    ok(pl.sure.length===1&&r.famed.length>=1,'an elite boss always drops one');late2+=r.famed.length }
  ok(Object.keys(G.famed).length===early+ty.famed.length+late2,'every drop is recorded in G.famed');
  console.log('drop rules (none early, '+late2+' of '+n+' strong late fights, guaranteed from end-game kills), results dialog: ok') }

console.log('\nitems test passed');
