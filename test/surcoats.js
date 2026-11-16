// Surcoats test. Plain node, no browser:  node test/surcoats.js [--seed N]
// The surcoat slot (m.eq.c): the items, equip / unequip and stats, the tailor's Surcoats mode, the save round trip (old saves load with
// no surcoat), house livery (houseLivery, o.livery, brigands wear none) and the art: every surcoat x armor x view x mirror x state x frame
// draws on the part grid, portraits, icons, house soldiers dressed in their colours. Harness as test/items.js.
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

const X=makeContext(),I=X.ITEMS,COATS=Object.keys(I).filter(id=>I[id].k==='c');

section('items');
{ ok(COATS.length>=5,'at least five surcoats');
  for(const id of COATS){const it=I[id];ok(it.uniq&&it.tailor&&it.price>0&&it.tier>=1&&it.tier<=5&&typeof it.coat==='string'&&it.look===id,id+': uniq, tailor, price, tier, cut, look');
   ok((it.brv||0)>0&&(it.brv||0)<=8&&(it.fat||0)<=2&&(it.md||0)<=1&&(it.rd||0)<=1&&(it.init||0)<=2,id+': small numbers');ok(/resolve/.test(X.itemDesc(id)),id+': description')}
  ok(!X.marketPool(5).some(id=>I[id].k==='c'),'no surcoat on the market stalls');
  console.log('surcoats:',COATS.map(id=>I[id].n+' (+'+I[id].brv+' res'+(I[id].md?', +'+I[id].md+' md':'')+(I[id].rd?', +'+I[id].rd+' rd':'')+(I[id].init?', +'+I[id].init+' init':'')+', '+(I[id].fat||0)+' fat, '+I[id].price+')').join('; ')) }

section('equip and stats');
{ X.seedRng(SEED);X.newGame(true);closeAll(X);const G=X.G,m=G.roster[0];ok(m.eq.c===null,'new mercs have an empty surcoat slot');
  const s0=X.calc(m);G.stash.push('heraldcoat');const j=G.stash.indexOf('heraldcoat');ok(X.equip(0,'c',j),'equip a surcoat from the stash');ok(m.eq.c==='heraldcoat'&&!G.stash.includes('heraldcoat'),'it is worn');
  const s1=X.calc(m);ok(s1.brv===s0.brv+I.heraldcoat.brv&&s1.rd===s0.rd+1&&s1.fat===s0.fat-1&&s1.arm===s0.arm,'resolve, ranged defense and weight count; armor does not');
  ok(!X.equip(0,'c',G.stash.findIndex(id=>I[id]&&I[id].k!=='c')),'a non-surcoat does not go in the slot');
  ok(X.equip(0,'c',-1)&&m.eq.c===null&&G.stash.includes('heraldcoat'),'unequip returns it to the stash');
  ok(X.equipRules(m,'c','tabard').ok&&!X.equipRules(m,'a','tabard').ok,'the rules accept a surcoat only in its slot');
  closeAll(X) }

section('tailor');
{ X.seedRng(SEED+1);X.newGame(true);closeAll(X);const G=X.G;X.openTown(0);X.townTab='tailor';X.townSel.tailor=0;X.TLR.mode='coat';
  const v=X.tailorView(G.towns[0]);ok(/tl-coat/.test(v.detail)&&/tlcFit/.test(v.foot),'the tailor has a Surcoats mode');
  ok(!X.coatSold('jinbaori')||X.townEast(G.town),'the jinbaori only in eastern towns');
  const c0=G.crowns,p=X.coatPrice('surcoat');ok(p>0,'priced');X.tailorCoatPick('surcoat');ok(X.tailorCoatFit(),'fit');ok(G.roster[0].eq.c==='surcoat'&&G.crowns===c0-p,'bought and worn for its price');
  X.tailorCoatPick('tabard');const c1=G.crowns;ok(X.tailorCoatBuy()&&G.stash.includes('tabard')&&G.crowns===c1-X.coatPrice('tabard'),'buy for the stash');
  const c2=G.crowns;ok(X.tailorCoatFit()&&G.roster[0].eq.c==='tabard'&&G.crowns===c2&&G.stash.includes('surcoat'),'fit from the stash is free, the old one goes to the stash');
  G.crowns=99999;ok(X.tailorCoatAll()&&G.roster.every(x=>x.eq.c==='tabard'),'the whole company');
  ok(X.tailorCoatOff()&&G.roster[0].eq.c===null,'take off');G.crowns=0;X.tailorCoatPick('heraldcoat');ok(!X.tailorCoatFit(),'not without crowns');
  closeAll(X) }

section('save round trip');
{ X.seedRng(SEED+2);X.newGame(true);closeAll(X);let G=X.G;G.roster[0].eq.c='mantletabard';G.roster[1].eq.c='quiltcoat';G.stash.push('surcoat');ok(X.save(),'save');
  X.G=null;X.mode='title';X.continueGame();G=X.G;ok(G.roster[0].eq.c==='mantletabard'&&G.roster[1].eq.c==='quiltcoat'&&G.stash.includes('surcoat'),'surcoats survive the round trip');
  const raw=JSON.parse(X.store.get(X.SAVEKEY));raw.roster.forEach(m=>delete m.eq.c);raw.roster[2].eq.c='nosuchcoat';raw.roster[3].eq.c='plate';X.store.set(X.SAVEKEY,JSON.stringify(raw));
  const r=X.readSave();ok(r.state==='ok'&&r.g.roster.every(m=>m.eq.c===null),'old saves load with no surcoat; unknown or wrong items are dropped');
  closeAll(X) }

section('livery');
{ X.seedRng(SEED+3);X.newGame(true);closeAll(X);const G=X.G,H=G.houses;ok(H.length>=2,'two houses');
  for(const h of H){const L=X.houseLivery(h.id);ok(L&&L.c1===h.c1&&L.c2===h.c2&&L.emblem===h.emblem,h.n+': livery from its banner');ok(X.houseLivery(h.id)===L,'cached')}
  ok(X.houseLivery('gob')===null&&X.houseLivery('nope')===null,'no livery for monsters');
  const a=X.houseLivery(H[0].id),b=X.houseLivery(H[1].id);ok(a.c1!==b.c1&&a.emblem!==b.emblem,'two houses look apart');
  const u=X.mkEnemy('braid',H[0].id),c=X.unitCoat(u);ok(c&&c.liv===a&&c.id==='surcoat','a house raider wears its house surcoat');
  ok(X.unitCoat(X.mkEnemy('braid','bandit'))===null,'brigands wear none');
  const g=X.mkEnemy('thug','bandit');g.side=1;X.B={opts:{livery:{c1:'g',c2:'l',emblem:'tower'}}};const gc=X.unitCoat(g);ok(gc&&gc.liv.c1==='g'&&gc.liv.emblem==='tower','o.livery dresses the foe (garrisons)');
  X.B={opts:{livery:H[1].id}};ok(X.unitCoat(g).liv===b,'o.livery may name a house');X.B=null;
  G.banner=X.bannerFix({c1:'x',c2:'c',emblem:'lion'});G.roster[0].eq.c='tabard';const mc=X.unitCoat({m:G.roster[0],side:0});ok(mc&&mc.liv.c1==='x'&&mc.liv.emblem==='lion','the company wears its banner');
  ok(X.liveryOf({c1:'x',c2:'c',emblem:'lion',division:'quarterly',shape:'x'}).c1==='x','unknown banner fields are ignored');
  closeAll(X) }

section('art');
{ X.seedRng(SEED+4);X.newGame(true);closeAll(X);const G=X.G,armors=['rags','jack','padded','leather','studded','brigandine','mail','lamellar','scale','coatplates','plate','gothic','robe','mailrobe','do'].filter(a=>I[a]),states=X.UNIT_FRAMES;let n=0;
  const coatCells=()=>{let k=0;const g=X.usG;for(let i=0;i<g.Z.length;i++)if(g.R[i]&&g.R[i].t&&g.Z[i])k++;return k};
  for(const c of COATS)for(const a of armors)for(const m0 of G.roster.slice(0,2)){const m=Object.assign({},m0,{eq:Object.assign({},m0.eq,{a,c})}),S=X.usMercSpec(m);ok(S.coat&&S.coat.cut===I[c].coat,c+' on '+a+': spec');
   for(let v=0;v<2;v++)for(const mir of [false,true])for(const st in states)for(let fr=0;fr<states[st];fr++){X.usBegin(0);X.usHuman(S,v,mir,st,fr);ok(coatCells()>20,c+'/'+a+' '+st+fr+' draws');n++}
   const rows=X.portraitRows({m});ok(rows&&rows.length===32,c+'/'+a+' portrait')}
  for(const c of COATS){const r=X.usCoatIconRows(c,X.companyLivery());ok(r&&r.length===16&&r.every(x=>x.length===16),c+' icon rows');ok(X.coatIconName(c)!=='armor-light',c+' icon registered')}
  for(const h of G.houses)for(const id of ['thug','bmark','bxbow','braid','blead']){const u=X.mkEnemy(id,h.id);u.side=1;const S=X.usHouseDress(X.usEnemySpec(id,u),u,X.unitCoat(u));ok(S.coat&&S.shR===S.coat.F||!S.shield,id+' of '+h.n+' dressed');
   for(let v=0;v<2;v++)for(const st of ['idle','walk','attack','death']){X.usBegin(0);X.usHuman(S,v,v===1,st,st==='death'?2:1);n++}ok(X.portraitRows(u).length===32,id+' portrait')}
  ok(X.usEmGlyph('lion',5,5).length===5&&Object.keys(X.EMBLEMS).every(e=>X.usEmGlyph(e,5,5).join('').replace(/\./g,'').length>=4),'every emblem reads at 5x5');
  console.log('frames drawn:',n);closeAll(X) }

console.log('\nsurcoats test passed');
