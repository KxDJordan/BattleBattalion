// Shops: market days (50-towns.js mkEpoch / mkRestock / mkRoll / mkEcon): the stalls restock every SHOPK.period days, keep a share of the
// old stock, follow the town's size, prosperity and situations (stalls, tier, scarcity prices), draw from their own stream (world seed, town,
// week) and never from the game's rnd(); the market panel says when it restocks; saves round-trip and old saves load.
//   node test/shops.js [--seed N]
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261116,SRC=path.join(__dirname,'..','src');
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

const X=makeContext(),I=X.ITEMS;
const fresh=s=>{X.seedRng(s);X.newGame(true);closeAll(X);return X.G};
const tierOf=id=>I[id].tier||1,mean=L=>L.length?L.reduce((a,b)=>a+b,0)/L.length:0;
// a stand-in town at index ti with the given size, prosperity and situations
const shape=(G,ti,o)=>{const t=G.towns[ti];t.size=o.size;t.pros=o.pros;t.sit=(o.sit||[]).map(k=>({k,days:5}));delete t.held;if(o.east!=null)t.east=o.east;return t};
const weeks=(G,ti,n,day0)=>{const t=G.towns[ti],L=[];for(let w=0;w<n;w++){G.day=day0+w*X.SHOPK.period;X.mkRestock(t,true);L.push(t.stock.slice())}return L};

(async()=>{
section('market days');
{ const P=X.SHOPK.period;ok(P>=3&&P<=7,'a market day every '+P+' days');
  ok(X.mkEpoch(1)===0&&X.mkEpoch(P)===0&&X.mkEpoch(P+1)===1&&X.mkEpoch(3*P+1)===3,'market weeks by day');
  ok(X.mkRestockIn(1)===P&&X.mkRestockIn(P)===1&&X.mkRestockIn(P+1)===P,'days to the next market day');
  ok(X.mkRestockText(P)==='Restocks tomorrow'&&X.mkRestockText(1)==='Restocks in '+P+' days','the restock line');
  const G=fresh(SEED),t=G.towns[1];G.day=7;X.mkRestock(t);const s0=t.stock.slice(),rng=X.rngState();
  for(let h=0;h<4;h++){X.mkRestock(t);X.stockTown(t);G.town=1;X.openTown(1);closeAll(X)}
  ok(JSON.stringify(t.stock)===JSON.stringify(s0),'the same stalls all week, however often the company looks');
  const r0=X.rngState();X.mkRestock(t,true);X.mkRoll(t,1,5,t.stock,1);ok(X.rngState()===r0,'a restock never draws from the game stream');
  G.day=7+P;X.mkRestock(t);ok(t.mkEp===X.mkEpoch(G.day)&&JSON.stringify(t.stock)!==JSON.stringify(s0),'market day: new goods');
  console.log('market day every '+P+' days, stalls fixed between them, the game stream untouched: ok') }

section('deterministic: world seed, town, week');
{ const a=fresh(SEED+1),A=[];for(let w=0;w<6;w++){a.day=1+w*X.SHOPK.period;a.towns.forEach(t=>X.mkRestock(t));A.push(JSON.stringify(a.towns.map(t=>t.stock)))}
  const b=fresh(SEED+1),B=[];for(let w=0;w<6;w++){b.day=1+w*X.SHOPK.period;X.seedRng(w*977);b.towns.forEach(t=>X.mkRestock(t));B.push(JSON.stringify(b.towns.map(t=>t.stock)))}
  ok(A.join()===B.join(),'the same world, the same stalls week by week (whatever the game stream did meanwhile)');
  const c=fresh(SEED+2);ok(JSON.stringify(c.towns.map(t=>t.stock))!==A[0],'another world, other stalls');
  // partial turnover: a share of the stalls stays through a market day
  const G=fresh(SEED+3);let kept=0,all=0;for(let ti=0;ti<G.towns.length;ti++){shape(G,ti,{size:3,pros:50});G.day=40;X.mkRestock(G.towns[ti],true);
   for(let w=1;w<=8;w++){const prev=G.towns[ti].stock.slice();G.day=40+w*X.SHOPK.period;X.mkRestock(G.towns[ti]);const now=G.towns[ti].stock.slice();
    for(const id of prev){all++;const j=now.indexOf(id);if(j>=0){kept++;now.splice(j,1)}}}}
  const f=kept/all;ok(f>.2&&f<.7,'about '+Math.round(X.SHOPK.keep*100)+'% of the stalls carry over (with chance repeats): '+(f*100).toFixed(0)+'%');
  // two weeks missed: fewer carry over
  { const t=G.towns[0];G.day=40;X.mkRestock(t,true);let k1=0,k3=0,n=0;for(let w=0;w<30;w++){const ep=10+w,prev=X.mkRoll(t,0,ep-1,[],1),one=X.mkRoll(t,0,ep,prev,1),three=X.mkRoll(t,0,ep,prev,3);n+=prev.length;
     k1+=prev.filter(id=>one.includes(id)).length;k3+=prev.filter(id=>three.includes(id)).length}ok(k3<k1,'after three weeks away less of the old stock is left: '+k1+' vs '+k3) }
  console.log('stalls by seed, town and week; '+(f*100).toFixed(0)+'% carried over a market day: ok') }

section('size and economy');
{ const G=fresh(SEED+4);G.day=35;const T=(o,n)=>{shape(G,1,o);const L=weeks(G,1,n||30,35);return{n:mean(L.map(s=>s.length)),top:Math.max(...L.flat().map(tierOf)),avg:mean(L.flat().map(tierOf)),E:X.mkEcon(1)}};
  const vil=T({size:1,pros:50}),town=T({size:2,pros:50}),city=T({size:3,pros:50}),rich=T({size:3,pros:85}),poor=T({size:3,pros:20}),siege=T({size:3,pros:50,sit:['siege']}),boom=T({size:2,pros:60,sit:['boom']}),richV=T({size:1,pros:95}),richT=T({size:2,pros:85});
  const row=(n,v)=>n+' '+v.n.toFixed(1)+' stalls, top '+v.top+', mean tier '+v.avg.toFixed(2);console.log('  '+[['village',vil],['town',town],['city',city],['rich city',rich],['poor city',poor],['besieged city',siege],['booming town',boom],['rich village',richV],['rich town',richT]].map(x=>row(...x)).join('\n  '));
  ok(vil.n<town.n&&town.n<city.n&&city.n<rich.n,'more stalls in bigger and richer towns');
  ok(vil.top<=3&&town.top<=3&&city.top===5&&rich.top===5,'tiers by size: village and town to III on day 35, a city to V');
  ok(richV.top<=3&&richT.top===4,'a rich town reaches tier IV, a rich village never past III');
  ok(rich.avg>city.avg&&city.avg>poor.avg,'a rich city stocks stronger goods than a poor one');
  ok(poor.top===4&&siege.top===4&&poor.n<city.n&&siege.n<city.n,'a poor or besieged city: fewer stalls, a tier down');
  ok(boom.n>town.n,'a boom fills the stalls');
  // situations shift the stock at the next market day, not before
  { const t=shape(G,2,{size:3,pros:80});G.day=41;X.mkRestock(t,true);const s0=t.stock.slice(),t0=X.mkEcon(2).tier;t.pros=15;t.sit=[{k:'raided',days:6}];
    G.day=42;X.mkRestock(t);ok(JSON.stringify(t.stock)===JSON.stringify(s0),'a raid mid-week leaves the stalls as they were');
    let top=0,n=0;for(let w=1;w<=6;w++){G.day=41+w*X.SHOPK.period;X.mkRestock(t);top=Math.max(top,...t.stock.map(tierOf));n+=t.stock.length}
    ok(top<t0&&X.mkEcon(2).tier<t0&&n/6<s0.length,'the next market days carry less and plainer: tier '+t0+' -> '+top+', '+s0.length+' -> '+(n/6).toFixed(1)+' stalls') }
  // prices: thin stalls are dear
  { const t=shape(G,3,{size:2,pros:50});const id=Object.keys(I).find(k=>I[k].k==='w'&&I[k].tier===2&&!I[k].uniq&&!I[k].famed);const p0=X.mkBuyPrice(id,3);
    t.sit=[{k:'raided',days:5}];const p1=X.mkBuyPrice(id,3),why=X.townPriceWhy(3,'buy').map(x=>x.why);ok(p1>p0&&why.includes('Scarce goods'),'scarcity raises prices: '+p0+' -> '+p1+' ('+why.join(', ')+')');
    t.sit=[];t.pros=50;ok(!X.townPriceWhy(3,'buy').some(x=>x.why==='Scarce goods'),'an ordinary market is not scarce') }
  console.log('stalls and tiers by size, prosperity and troubles; scarcity prices: ok') }

section('buying, the stalls refill');
{ const G=fresh(SEED+5);G.crowns=1e6;G.town=1;G.day=12;X.mkRestock(G.towns[1],true);const t=G.towns[1],n0=t.stock.length;X.openTown(1);closeAll(X);G.town=1;
  ok(X.buyItem(0)&&X.buyItem(0)&&t.stock.length===n0-2,'bought pieces leave the stalls');X.mkRestock(t);ok(t.stock.length===n0-2,'and stay gone until market day');
  G.day=12+X.SHOPK.period;X.openTown(1);closeAll(X);ok(t.stock.length===X.mkEcon(1).n,'market day fills the stalls again: '+t.stock.length) }

section('market depth: the dealers buy so much a week');
{ const G=fresh(SEED+8);G.day=21;const ti=1,t=shape(G,ti,{size:2,pros:50});G.town=ti;G.crowns=0;X.openTown(ti);closeAll(X);G.town=ti;
  const big=Object.keys(I).filter(k=>I[k].k==='a'&&I[k].tier===4&&!I[k].famed&&!I[k].uniq)[0],p0=X.mkSellPrice(big,ti);ok(X.mkGlutK(ti)===1,'fresh dealers pay in full');
  const D=X.mkDepth(ti),vil=(shape(G,2,{size:1,pros:50}),X.mkDepth(2)),city=(shape(G,3,{size:3,pros:80}),X.mkDepth(3));ok(vil<D&&D<city,'a city buys more than a village: '+[vil,D,city]);
  const got=[];for(let k=0;k<14;k++){G.stash.push(big);const c=G.crowns;X.sellItem(G.stash.length-1);got.push(G.crowns-c)}
  ok(got[0]===p0&&got.every((v,j)=>!j||v<=got[j-1])&&got[got.length-1]===Math.floor(X.sellPrice(big)*X.twK('sell',ti,big)*X.SHOPK.glut),'each sale lowers the next offer, to half: '+got.join(' '));
  const v=X.marketView;X.townSel.market='s0';G.stash.push(big);const h=X.marketView(G.towns[ti]).list;ok(/id="mkGlut"/.test(h)&&/Dealers pay \d+% less/.test(h),'the inventory says the dealers pay less');
  ok(X.mkSellPrice(big,2)===Math.floor(X.sellPrice(big)*X.twK('sell',2,big)),'another town pays in full');
  G.day=21+X.SHOPK.period;ok(X.mkGlutK(ti)===1&&X.mkSellPrice(big,ti)>got[got.length-1],'market day: fresh buyers');
  // saves
  G.day=22;X.mkSoldAdd(ti,700);X.mode='world';ok(X.save(),'save');const rd=X.readSave();ok(rd.state==='ok'&&rd.g.towns[ti].mkSold&&rd.g.towns[ti].mkSold.v===G.towns[ti].mkSold.v,'what the dealers bought round-trips');
  console.log('depth village/town/city '+[vil,D,city].join('/')+'; offers for one tier-4 armor in a row: '+got.join(' ')+': ok') }

section('the market panel');
{ const G=fresh(SEED+6);G.town=0;X.openTown(0);closeAll(X);G.town=0;G.townOpen=true;X.townTab='market';const v=X.marketView(G.towns[0]),h=v.list;
  ok(/Restocks (in \d+ days|tomorrow)/.test(h)&&/id="mkRestock"/.test(h),'the market says when it restocks');ok(/(Village|Town|City) market/.test(h)&&/up to tier/.test(h),'and what kind of market it is');
  console.log('the restock line: '+h.match(/<b>(Restocks[^<]*)<\/b>([^<]*)/).slice(1).join('')) }

section('saves');
{ const G=fresh(SEED+7);G.day=23;G.towns.forEach(t=>X.mkRestock(t));X.mode='world';ok(X.save(),'save');const rd=X.readSave();ok(rd.state==='ok','read back: '+rd.state);
  ok(rd.g.towns.every((t,i)=>t.mkEp===G.towns[i].mkEp&&JSON.stringify(t.stock)===JSON.stringify(G.towns[i].stock)),'the stalls and their market week round-trip');
  // an old save (no market week): loads, keeps its stalls, restocks at the next visit
  const old=JSON.parse(X.store.get(X.SAVEKEY));old.towns.forEach(t=>delete t.mkEp);old.towns[0].mkEp='x';X.store.set(X.SAVEKEY,JSON.stringify(old));const ro=X.readSave();
  ok(ro.state==='ok'&&ro.g.towns.every(t=>t.mkEp===undefined&&Array.isArray(t.stock)),'an old save loads without market weeks');
  X.G=ro.g;const t=X.G.towns[1],s0=t.stock.slice();X.mkRestock(t);ok(t.mkEp===X.mkEpoch(X.G.day)&&t.stock.length>0,'its towns restock at the next visit');
  ok(s0.filter(id=>t.stock.includes(id)).length<s0.length,'with a share of the old stock carried over');
  console.log('save round trip, old saves: ok') }

console.log('\nshops test passed');process.exit(0)
})().catch(e=>fail(e&&e.stack||e));
