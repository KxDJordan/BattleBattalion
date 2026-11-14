// Look test for the rivals round. Plain node, no browser:  node test/rivals-look.js
// Loads src/*.js as build.js concatenates them (the DOM stubs of test/items.js) and checks the look side of caravan cargo and rival companies:
// every trade good (ITEMS kind 't') draws its own 16x16 icon in PAL keys with a 1px outline; the new icons (rival personalities, parley,
// 'merc' goal) exist; caravan cargo lists with icons for every GOODS cargo rule; rival mercs wear their company's livery (and lose it when
// they join the company); the rival pennant icon; the parley, attack and band sheets, the factions Rivals tab, the inspect cards and the
// notice-board badge render without errors and show the stated costs; nothing here draws on the game's rnd() stream.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const SRC=path.join(__dirname,'..','src');
let failed=false;
function fail(msg){failed=true;console.error('\nFAIL: '+msg);process.exit(1)}
function ok(c,msg){if(!c)fail(msg)}
process.on('uncaughtException',e=>fail('uncaught exception: '+(e&&e.stack||e)));
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


function closeAll(X){for(let i=0;i<6&&X.sheetOpen;i++)X.closeSheet(true);if(X.sheetOpen)X.sheetOpen=false;if(X.G)X.G.townOpen=false}
const X=makeContext(),PAL=X.PAL,ICONS=X.ICONS,I=X.ITEMS;
const palOK=rows=>rows.length===16&&rows.every(r=>r.length===16&&[...r].every(k=>k==='.'||PAL[k]!==undefined));
const outlined=rows=>{for(let y=0;y<16;y++)for(let x=0;x<16;x++){const k=rows[y][x];if(k==='.'||k==='0')continue;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const r=rows[y+dy],n=r?r[x+dx]:undefined;if(n===undefined||n==='.')return false}}return true};

section('icons');
{ for(const n of ['goal-merc','rival','parley','pers-honour','pers-cutthroat','pers-greedy','pers-glory','tg','tg-spice','tg-salt','tg-furs','tg-glass','tg-ale','tg-grain','tg-fish','tg-timber','tg-ore','tg-herbs','tg-silk','tg-wine','tg-gems','tg-yew','tg-leather'])ok(ICONS[n]&&palOK(ICONS[n])&&outlined(ICONS[n]),'icon '+n+' missing, off-palette or not outlined');
  const T=Object.keys(I).filter(id=>I[id].k==='t');ok(T.length>=8,'the world defines trade goods (ITEMS kind t): '+T.length);
  for(const id of T){const n=X.tgIcon(id);ok(n!=='tg'&&ICONS[n],'trade good '+id+' falls back to the crate ('+n+')');ok(palOK(ICONS[n])&&outlined(ICONS[n]),'trade good icon '+n+' off-palette or not outlined');
   ok(X.itemIconName(id)!=='fist'&&X.iconRows('it-'+id),'it-'+id+' does not resolve to an icon');
   const F=X.itemFacts(id);ok(F.some(r=>r&&r[0]==='Worth'&&/\d+ crowns/.test(r[1])),'trade good facts state its worth: '+id);ok(X.itemKind(id)==='Trade good','itemKind of '+id);
   ok(!/NaN|undefined/.test(X.pnDeltaChips(id,null)),'delta chips of a trade good')}
  console.log('  '+T.length+' trade goods, each with its own icon') }

section('new game');
X.newGame();closeAll(X);const G=X.G;ok(Array.isArray(G.rivals)&&G.rivals.length>=2,'the world has rival companies');
const r0=G.rivals[0];
section('cargo');
{ for(const k in X.GOODS){const c=X.cargoRoll(k,()=>.5,G.day),L=X.lkCargoList(c);ok(L.length>=1,'cargo of '+k+' lists nothing');
   const h=X.lkCargoHTML(c);ok(!/undefined|NaN|\[object/.test(h),'cargo html of '+k+': '+h.slice(0,200));
   for(const t of c.trade||[])ok(L.some(x=>x.k==='trade'&&x.t===I[t.id].n),'trade good '+t.id+' missing from the cargo list of '+k)}
  // the band sheet shows the cargo with icons and the standing cost
  let shown='';const s0=X.sheet;X.sheet=h=>{shown=h};
  const car={id:9e6,goal:'caravan',f:G.houses[0].id,x:G.p.x,y:G.p.y,from:0,to:1,mult:.6,cargo:X.cargoRoll('spice',()=>.7,G.day)};G.parties.push(car);
  X.bandSheet(car);ok(/The cargo/.test(shown)&&/Chest of spices/.test(shown)&&/costs about <b>18<\/b> standing/.test(shown),'band sheet lists the cargo and states the cost');
  G.parties=G.parties.filter(p=>p!==car);X.sheet=s0 }

section('livery');
{ const m=r0.roster[0];ok(m&&!m.colors,'a rival merc without own colours');const L=X.mercLook(m);ok(L&&L.rival,'rival merc wears the livery');
  const D=X.BANNERDYE;ok(L.cloth===D[r0.c1]||!D[r0.c1],'cloth from the banner field');ok(X.mercLook(m)===L,'livery object is cached (sprite caches compare identity)');
  ok(X.usColSig(m)!==''&&X.ptColSig(m)!=='','sprite and portrait signatures carry the livery');
  for(const p of G.roster)ok(X.rivalOfMerc(p)===null,'the company\'s own mercs belong to no rival');
  const pen=X.rivalPennantIcon(r0);ok(ICONS[pen]&&palOK(ICONS[pen])&&outlined(ICONS[pen]),'rival pennant icon');
  // a merc that leaves for the company drops the livery
  const r1=G.rivals.find(r=>r.roster.length>4)||r0,mm=r1.roster[r1.roster.length-1];r1.roster=r1.roster.filter(x=>x!==mm);ok(X.mercLook(mm)===null,'a merc who left keeps no livery');r1.roster.push(mm) }

section('parley');
{ let shown='';const s0=X.sheet;X.sheet=h=>{shown=h};const q=G.parties.find(p=>p.goal==='merc')||X.rvSpawn(r0),r=X.lkRival(q.f);
  const st0=X.rngState?JSON.stringify(X.rngState()):null;
  X.rivalSheet(q);ok(shown.includes(r.n)&&/swords? against your/.test(shown)&&/Fight them/.test(shown),'parley sheet: name, strength, fight');
  const P=X.rivalParley(q);for(const o of P.opts.filter(o=>o.k!=='leave'&&!(P.hostile&&!o.ok)&&!/challenge|attack/.test(o.k)))ok(shown.includes(o.n.replace(/&/g,'&amp;')),'parley option shown: '+o.k);
  const hire=P.opts.find(o=>o.k==='hire');if(hire&&hire.cost&&!P.hostile)ok(shown.includes(String(hire.cost)),'the hire fee is stated');
  X.rvAttackAsk();ok(/Challenge them/.test(shown)&&/Fall on them/.test(shown)&&/standing/.test(shown),'the fight sheet states both ways in and their costs');
  if(st0)ok(JSON.stringify(X.rngState())===st0,'the sheets drew on the game rnd() stream');
  X.sheet=s0;closeAll(X) }

section('factions, inspect, board');
{ const h=X.fxuRvList();ok(G.rivals.every(r=>h.includes(r.n)),'factions list names every rival');
  const d=X.fxuRvDetail(r0.id);ok(d.includes(r0.n)&&/Their best swords/.test(d)&&/Deeds/.test(d),'rival detail');
  r0.alive=false;const h2=X.fxuRvList();ok(/Fallen/.test(h2)&&/Wiped out/.test(h2),'a wiped-out company is marked');r0.alive=true;
  const q=G.parties.find(p=>p.goal==='merc');if(q){const k=X.worldPick(q.x,q.y-1,false);if(k&&k.type==='band'&&k.o===q){const c=X.worldCard(q.x,q.y-1);ok(c.includes(X.lkRival(q.f).n),'world inspect names the rival')}}
  const t=G.towns[0];if(t.contracts&&t.contracts.length){const c=t.contracts[0];c.rtook=G.day;c.rival=r0.id;const B=X.tvBadges(t);ok(!B.contracts||B.contracts.t!==t.contracts.length||t.contracts.length>1,'taken notices are not counted as open');delete c.rtook;delete c.rival} }

console.log(failed?'\nFAILED':'\nOK');
