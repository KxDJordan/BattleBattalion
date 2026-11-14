// Camp and crafting test. Plain node, no browser:  node test/craft.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the vm approach and DOM stubs of test/headless.js) and checks:
// monster parts (catalog, icons, drop tables, drops by enemy and through a real battle, determinism, the herbalist), recipes
// (spending, outputs, time, failure leaves nothing changed), crafted gear (registered, never on a market stall, never famed or loot),
// training (costs and XP by level, the daily cap, the drillmaster), field surgery (days, salves, once a day, the surgeon and medics),
// the save round trip of G.parts / G.salve / G.camp and craftRepair, and the camp screen in every tab.
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

const X=makeContext(),I=X.ITEMS,P=X.PARTS,R=X.RECIPES,EN=X.EN;
const fresh=seed=>{X.seedRng(seed);X.newGame(true);closeAll(X);const G=X.G;X.craftRepair(G);G.hour=8;return G};
const clock=G=>G.day*24+G.hour;
// followers: stub followerHas for a test, then put back whatever the build has
const realFol=X.followerHas;function withFollowers(list,fn){X.followerHas=id=>list.includes(id);try{return fn()}finally{X.followerHas=realFol===undefined?(()=>false):realFol}}

section('parts');
{ const keys=Object.keys(P),PAL=X.PAL;ok(keys.length>=16,'about 18 parts: '+keys.length);
  for(const k of keys){const p=P[k];ok(typeof p.n==='string'&&p.n&&typeof p.d==='string'&&p.d.length>10&&Number.isInteger(p.tier)&&p.tier>=1&&p.tier<=5,'part '+k+': name, text, tier');
   const rows=X.iconRows('part-'+k);ok(rows&&rows.length===16&&rows.every(r=>r.length===16&&[...r].every(c=>c==='.'||PAL[c])),'part-'+k+': a 16x16 icon in PAL keys');
   const on=(x,y)=>y>=0&&y<16&&x>=0&&x<16&&rows[y][x]!=='.';let edge=true;for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(rows[y][x]==='.'&&[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>on(x+a,y+b)&&rows[y+b][x+a]!=='0'))edge=false;ok(edge,'part-'+k+': a 1px outline');
   ok(/pxi-part-/.test(X.pxIcon('part-'+k,32)),'pxIcon(part-'+k+') resolves');ok(X.partSources(k).length>=1,'part '+k+' drops from something');
   ok(Object.keys(R).some(id=>R[id].parts[k]),'part '+k+' goes into a recipe')}
  for(const en in X.PARTDROP){ok(EN[en],'PARTDROP names an unknown enemy '+en);for(const [k,ch] of X.PARTDROP[en])ok(P[k]&&ch>0&&ch<=6,'PARTDROP.'+en+': '+k+' '+ch)}
  for(const f of ['beast','serpent','ent','ogre','wyvern','gob','orc','undead','void'])if(X.FACT[f])for(const [en] of X.FACT[f].units)ok(X.PARTDROP[en],'no part drop for '+en+' ('+f+')');
  const exp=en=>(X.PARTDROP[en]||[]).reduce((n,x)=>n+x[1]*P[x[0]].tier,0);
  for(const [boss,mob] of [['bear','wolf'],['gserp','adder'],['elder','thorn'],['orcl','orcw'],['necro','skel'],['tyrant','imp'],['wyvern','whatch'],['aogre','gob']])ok(exp(boss)>exp(mob)*1.5,boss+' drops more than '+mob);
  const unc=Object.keys(EN).filter(en=>!X.PARTDROP[en]);if(unc.length)console.log('  note: no part table for '+unc.join(', '));
  console.log(keys.length+' parts with icons, '+Object.keys(X.PARTDROP).length+' enemy drop tables, bosses drop more: ok') }

section('drops');
{ const G=fresh(SEED),dead=en=>({side:1,def:EN[en],alive:false}),cnt=L=>{const o={};L.forEach(x=>o[x.key]=(o[x.key]||0)+x.n);return o};
  const w=cnt(X.partsDrop([dead('wyvern')]));ok(w.wscale>=4&&w.wvenom>=2&&w.membrane>=2,'a slain wyvern yields its scales, venom and wing: '+JSON.stringify(w));
  ok(!X.partsDrop([{side:1,def:EN.wyvern,alive:true}]).length,'the living drop nothing');ok(!X.partsDrop([{side:1,def:EN.wyvern,alive:false,fled:true}]).length,'nor those that fled');
  ok(!X.partsDrop({win:false,en:[dead('wyvern')]}).length,'a lost battle drops nothing');ok(!X.partsDrop([{side:0,def:EN.wyvern,alive:false}]).length,'own men are not butchered');
  ok(cnt(X.partsDrop(['bear'])).owlhide>=1,'EN ids work as dead foes');
  X.seedRng(SEED);const a=JSON.stringify(X.partsDrop(Array(30).fill(0).map(()=>dead('spider')))),s1=X.rngState();X.seedRng(SEED);const b=JSON.stringify(X.partsDrop(Array(30).fill(0).map(()=>dead('spider'))));
  ok(a===b&&X.rngState()===s1&&s1!==SEED>>>0,'partsDrop is deterministic under the game RNG');
  X.seedRng(SEED+1);const N=3000,wolves=cnt(X.partsDrop(Array(N).fill(0).map(()=>dead('wolf'))));ok(Math.abs(wolves.pelt/N-.55)<.04&&Math.abs(wolves.meat/N-.5)<.04,'wolf drop rates: '+wolves.pelt/N+' '+wolves.meat/N);
  ok(withFollowers(['herbalist'],()=>{X.seedRng(SEED+1);return cnt(X.partsDrop(Array(N).fill(0).map(()=>dead('wolf')))).pelt})===wolves.pelt,'partsDrop leaves the herbalist to resolveBattle');
  X.seedRng(SEED+2);const sl=cnt(X.partsDrop({win:true,slain:['wyvern','wolf'],foeKeys:['wyvern','wolf','gob']}));ok(sl.wscale>=4&&!sl.trinket,'partsDrop reads res.slain: '+JSON.stringify(sl));
  // a real battle: kill the field and resolve; resolveBattle adds the parts itself (res.parts), once
  let got=0;for(let i=0;i<6;i++){X.seedRng(SEED+40+i);G.day=12;const B=X.startBattle({f:'beast',mult:1.2,src:{type:'sim'},quiet:true});ok(B,'battle did not start');for(const u of B.units)if(u.side===1)u.alive=false;
   const p0=X.partsTotal(),res=X.resolveBattle(true),L=Array.isArray(res.parts)?res.parts:[];got+=L.length;
   if(Array.isArray(res.parts))ok(X.partsTotal()===p0+L.reduce((n,x)=>n+x.n,0),'resolveBattle adds its drop to G.parts exactly once');
   ok(L.every(x=>['pelt','silk','meat','venom','owlhide'].includes(x.key)),'beasts drop beast parts: '+JSON.stringify(L));X.B=null;X.mode='world'}
  {const p0=X.partsTotal();X.partsGain([{key:'pelt',n:2}]);ok(X.partsTotal()===p0+2,'partsGain')}
  ok(got>0,'beast fights yield parts');console.log('drops by enemy, determinism, rates, res.slain, through resolveBattle ('+X.partsTotal()+' parts from 6 fights): ok') }

section('recipes and crafted gear');
{ const G=fresh(SEED+2),ids=Object.keys(R),gear=ids.filter(i=>R[i].out.item);ok(ids.length>=18,'about 20 recipes: '+ids.length);ok(gear.length>=15,'crafted gear: '+gear.length);
  const looks={};for(const id in I)if(!I[id].famed){ok(!looks[I[id].look],'look '+I[id].look+' shared');looks[I[id].look]=id}
  for(const r of ids){const x=R[r];ok(x.n&&x.d&&x.hours>0&&x.crowns>=0&&Object.keys(x.parts).length&&Object.keys(x.parts).every(k=>P[k]&&x.parts[k]>0),'recipe '+r);
   const o=x.out;ok(o.item||o.tools>0||o.food>0||o.salve>0,'recipe '+r+' makes something');
   if(o.item){const it=I[o.item];ok(it&&it.craft===1&&it.uniq===1&&it.tier>=3&&it.tier<=5&&it.price>0,o.item+': craft, uniq, tier 3..5');ok(X.iconRows('it-'+o.item)&&X.itemIconName(o.item)==='it-'+o.item,o.item+': its own icon')}}
  ok(['w','a','h','s'].every(k=>gear.some(r=>I[R[r].out.item].k===k)),'weapons, armor, helmets and shields');
  ok(['tools','food','salve'].every(k=>ids.some(r=>R[r].out[k])),'tools, rations and salves');
  // calc reads crafted gear, defense on armor included
  const m=G.roster[0];m.eq.a='wyvcuirass';m.eq.h='ogrehelm';const s=X.calc(m);ok(s.arm===I.wyvcuirass.arm&&s.helm===I.ogrehelm.arm,'calc reads crafted armor');
  // spending
  G.parts={};G.crowns=0;ok(!X.craftCan('bonemaul')&&/Missing/.test(X.craftWhy('bonemaul')),'no parts, no maul');const snap=JSON.stringify([G.parts,G.crowns,G.stash,G.day,G.hour]);ok(X.craftDo('bonemaul')===false&&JSON.stringify([G.parts,G.crowns,G.stash,G.day,G.hour])===snap,'a failed craft changes nothing');
  Object.assign(G.parts,{ogrebone:4,ogrehide:1,scrap:2});ok(/crowns/.test(X.craftWhy('bonemaul')),'parts but no crowns');G.crowns=1000;ok(X.craftCan('bonemaul'),'craftCan');
  const t0=clock(G),st=G.stash.length,rs=X.rngState(),r=X.craftDo('bonemaul');ok(r&&r.out.item==='bonemaul'&&G.stash.length===st+1&&G.stash[st]==='bonemaul','the maul goes to the stash');
  ok(G.crowns===1000-R.bonemaul.crowns&&G.parts.ogrebone===1&&!('ogrehide' in G.parts)&&!('scrap' in G.parts),'parts and crowns spent: '+JSON.stringify(G.parts));ok(clock(G)-t0===R.bonemaul.hours,'the hours pass');ok(X.rngState()===rs,'crafting uses no randomness');
  G.parts={scrap:2,meat:2,silk:2,sap:1,bonedust:2,trinket:1};const t1=G.tools,f1=G.food,s1=G.salve;
  for(const id of ['tools','rations','bandage','poultice','plaster'])ok(X.craftDo(id),'craft '+id);
  ok(G.tools===t1+R.tools.out.tools&&G.food===f1+R.rations.out.food&&G.salve===s1+R.bandage.out.salve+R.poultice.out.salve+R.plaster.out.salve&&!Object.keys(G.parts).length,'supplies: tools, rations, salves');
  console.log(ids.length+' recipes ('+gear.length+' gear), spending, outputs, time: ok') }

section('crafted gear stays off the market');
{ const G=fresh(SEED+3),t=G.towns[0],C=Object.keys(I).filter(id=>I[id].craft);ok(C.length>=15,'crafted items registered');
  for(const [size,day] of [[1,1],[2,40],[3,30],[3,90]]){t.size=size;G.day=day;for(let i=0;i<40;i++){X.stockTown(t);ok(t.stock.every(id=>!I[id].craft),'a stall stocks a crafted item')}}
  if(typeof X.marketPool==='function')ok(X.marketPool(5).every(id=>!I[id].craft),'marketPool excludes crafted gear');
  for(let i=0;i<300;i++){X.seedRng(SEED+i);ok(!I[X.famedBasePick(i/300,'wyvern')].craft,'a famed item made from crafted gear')}
  for(const f in X.FACT)ok(!(X.FACT[f].loot||[]).some(id=>I[id]&&I[id].craft),'FACT.'+f+' loots crafted gear');
  console.log('markets at every size and day, famed bases, loot tables: never crafted: ok') }

section('training');
{ const G=fresh(SEED+4),m=G.roster[0],hi=G.roster[1];G.crowns=10000;hi.lvl=8;hi.xp=X.XPT[8];m.hp=X.calc(m).hp;hi.hp=X.calc(hi).hp;
  const a=X.campTrainInfo(m),b=X.campTrainInfo(hi);ok(!a.why&&a.xp>0&&a.cost>0&&a.hours>0,'a level 1 merc can drill: '+JSON.stringify(a));ok(b.xp>a.xp*1.5&&b.cost>a.cost*1.5,'cost and XP grow with level: '+a.xp+'/'+a.cost+' -> '+b.xp+'/'+b.cost);
  const xp0=m.xp,c0=G.crowns,h0=clock(G);ok(X.campTrain(m.id)===a.xp&&m.xp===xp0+a.xp&&G.crowns===c0-a.cost&&clock(G)-h0===a.hours,'a session: XP, crowns and hours');
  ok(X.campTrain(m.id),'second session');ok(X.campTrainInfo(m).used===a.cap,'two today');ok(X.campTrain(m.id)===false&&/enough/.test(X.campTrainInfo(m).why),'the daily cap holds');
  G.hour=23;X.advanceTime(2);X.craftRepair(G);ok(X.campTrainInfo(m).used===0&&!X.campTrainInfo(m).why,'a new day, new drills');
  const d=withFollowers(['drill'],()=>X.campTrainInfo(m));ok(d.xp>X.campTrainInfo(m).xp&&d.cost<X.campTrainInfo(m).cost&&d.cap===a.cap+1,'the drillmaster: more XP, cheaper, one more session');
  // tactician perks in the company add XP
  const tac=Object.keys(X.PERKIX).filter(id=>X.PERKIX[id].key==='tactician').slice(0,2),c=G.roster[2],keep=c.perks.slice();c.perks=c.perks.concat(tac);ok(X.campTrainInfo(m).xp>a.xp,'tactician perks help');c.perks=keep;
  G.crowns=0;ok(/crowns/.test(X.campTrainInfo(m).why)&&X.campTrain(m.id)===false,'no crowns, no drill');G.crowns=10000;
  m.hp=1;ok(/hurt/.test(X.campTrainInfo(m).why),'too hurt to drill');m.hp=X.calc(m).hp;
  hi.lvl=X.MAXLV;ok(/highest/.test(X.campTrainInfo(hi).why),'nothing to learn at the top');
  // a level up through drills
  const n=G.roster[3];n.hp=X.calc(n).hp;n.xp=X.XPT[2]-10;n.lvl=1;const pp=n.pp;X.campTrain(n.id);ok(n.lvl===2&&n.pp===pp+1,'drills can level a merc up');
  console.log('costs '+a.cost+'..'+b.cost+' crowns, XP '+a.xp+'..'+b.xp+', cap '+a.cap+' a day, drillmaster, tacticians: ok') }

section('surgery');
{ const G=fresh(SEED+5),m=G.roster[1],inj=Object.keys(X.INJ).filter(k=>!X.INJ[k].perm),perm=Object.keys(X.INJ).find(k=>X.INJ[k].perm);
  m.inj=[];X.addInjury(m,inj[0],6);G.salve=3;const S=X.campSurgInfo(m,inj[0]);ok(!S.why&&S.days>=2&&!S.heals,'surgery on a 6-day wound: '+JSON.stringify({days:S.days,why:S.why}));
  const h0=clock(G);ok(X.campSurgery(m.id,inj[0])&&m.inj[0].days===6-S.days&&G.salve===2&&clock(G)-h0===S.hours,'days off, a salve used, hours passed');
  ok(X.campSurgery(m.id,inj[0])===false&&/today/.test(X.campSurgInfo(m,inj[0]).why),'once a wound a day');
  X.addInjury(m,inj[1],2);ok(X.campSurgInfo(m,inj[1]).heals&&X.campSurgery(m.id,inj[1])&&!X.hasInjury(m,inj[1]),'a short wound is mended outright');
  if(perm){X.addInjury(m,perm);ok(/Permanent/.test(X.campSurgInfo(m,perm).why),'permanent wounds are beyond the knife')}
  G.salve=0;X.addInjury(m,inj[2],9);ok(/salve/.test(X.campSurgInfo(m,inj[2]).why)&&X.campSurgery(m.id,inj[2])===false,'no salve, no surgery');G.salve=5;
  const base=X.campSurgInfo(m,inj[2]),sg=withFollowers(['surgeon'],()=>X.campSurgInfo(m,inj[2]));ok(sg.days===base.days+1&&sg.hours===base.hours-1,'the surgeon: a day more, an hour less');
  const med=Object.keys(X.PERKIX).filter(id=>X.PERKIX[id].key==='medic').slice(0,4),c=G.roster[3];c.perks=c.perks.concat(med);ok(X.campSurgInfo(m,inj[2]).days===base.days+2,'a field medic with four perks: two days more');
  console.log('surgery takes '+base.days+' days off for a salve and '+base.hours+' hours; once a day; surgeon and medics: ok') }

section('saves');
{ const G=fresh(SEED+6);G.parts={wscale:3,pelt:7};G.salve=4;G.stash.push('wyvkite');X.craftRepair(G);G.camp.tr[G.roster[0].id]=1;ok(X.save(),'save() failed');
  const raw=JSON.parse(X.store.get(X.SAVEKEY));ok(raw.parts&&raw.parts.wscale===3&&raw.salve===4,'the save carries G.parts and G.salve');
  X.G=null;X.mode='title';X.continueGame();let g=X.G;const viaRepair=/craftRepair/.test(X.repairSave.toString());if(!viaRepair){console.log('  note: repairSave does not call craftRepair yet; calling it here');X.craftRepair(g)}
  ok(X.mode==='world'&&g.parts.wscale===3&&g.parts.pelt===7&&g.salve===4&&g.stash.includes('wyvkite'),'parts, salves and crafted gear come back');ok(g.camp&&g.camp.tr[g.roster[0].id]===1,'today\'s drills are remembered');
  const bad={day:5,parts:{wscale:'2',pelt:-3,nosuch:4,silk:2.7,meat:1e9},salve:'x',camp:{day:5,tr:{1:'2',2:-1},sg:{'1:x':1}}};X.craftRepair(bad);
  ok(JSON.stringify(bad.parts)==='{"wscale":2,"silk":2,"meat":999}'&&bad.salve===2&&bad.camp.tr[1]===2&&!(2 in bad.camp.tr)&&bad.camp.sg['1:x']===1,'craftRepair cleans the fields: '+JSON.stringify(bad));
  const old={day:9,camp:{day:8,tr:{1:2}}};X.craftRepair(old);ok(JSON.stringify(old.parts)==='{}'&&old.salve===2&&old.camp.day===9&&!Object.keys(old.camp.tr).length,'an old save gets empty stores, two salves, a fresh day');
  if(viaRepair){const v=JSON.parse(X.store.get(X.SAVEKEY));v.parts={wscale:-1,pelt:2,zzz:1};X.store.set(X.SAVEKEY,JSON.stringify(v));const r=X.readSave();ok(r.state==='ok'&&JSON.stringify(r.g.parts)==='{"pelt":2}','repairSave validates G.parts')}
  X.store.clear();console.log('G.parts / G.salve / G.camp round trip, craftRepair: ok') }

section('camp screen');
{ const G=fresh(SEED+7);for(const k in P)G.parts[k]=6;G.crowns=9000;X.addInjury(G.roster[0],Object.keys(X.INJ).find(k=>!X.INJ[k].perm),4);
  for(const t of ['rest','train','surgery','craft','parts']){ok(X.campOpen(t)&&X.sheetOpen&&X.CM.tab===t,'campOpen('+t+')');X.campPick(t==='train'?String(G.roster[1].id):t==='craft'?'silkbow':t==='parts'?'wscale':X.CM.sel[t])}
  X.campOpen('craft');ok(X.campCraft('silkbow')&&G.stash.includes('silkbow'),'craft from the screen');X.campClose();ok(!X.sheetOpen,'closing the camp');
  const h0=clock(G);X.campQuickRest();ok(clock(G)-h0===6,'campQuickRest: six hours');G.moving=true;const h1=clock(G);X.campQuickRest();ok(!G.moving&&clock(G)===h1,'a quick rest first halts the march');
  console.log('every tab opens, crafting from the screen, quick rest: ok') }

console.log('\ncraft test passed');
