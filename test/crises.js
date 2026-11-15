// Crises test (crises agent): the four crises of CONTRACT.md. Plain node:  node test/crises.js [--seed N]
// Each crisis starts on its day from a fixed seed, runs 60 days headless (replayed twice: identical), changes the world (hosts, sites,
// fallen / sacked towns), can be won (the final fights scripted through crisisBattleEnd) and lost (doom 100: a scar, the run goes on),
// survives the save round trip, keeps the daily simulation fast; the final battles run as auto-battles.
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
 const getters=new Map(),setters=new Map(),extra={ctx,store,sheets:[]};const sheet0=ctx.sheet;ctx.sheet=function(h){extra.sheets.push(String(h));return sheet0.apply(this,arguments)};
 const X=new Proxy(extra,{get(t,k){if(k in t)return t[k];if(typeof k!=='string')return undefined;if(k in ctx)return ctx[k];
   if(!getters.has(k))getters.set(k,vm.runInContext(`(()=>typeof ${k}==='undefined'?undefined:${k})`,ctx));return getters.get(k)()},
  set(t,k,v){if(k in t){t[k]=v;return true}if(!setters.has(k))setters.set(k,vm.runInContext(`(v=>{${k}=v})`,ctx));setters.get(k)(v);return true}});
 X.SPEEDF=0;X.clone=vm.runInContext('(o=>JSON.parse(JSON.stringify(o)))',ctx);return X}
function closeAll(X){for(let i=0;i<6&&X.sheetOpen;i++)X.closeSheet(true);if(X.sheetOpen)X.sheetOpen=false;if(X.G)X.G.townOpen=false}
const X=makeContext();
const fresh=(s,k)=>{X.seedRng(s);X.newGame(true);closeAll(X);if(k)X.G.crisisKind=k;return X.G};
const keepAlive=G=>{G.crowns=1e6;G.food=1e5;G.roster.forEach(m=>{m.hp=X.calc(m).hp;if(Array.isArray(m.inj))m.inj=[]})};
const day=G=>{keepAlive(G);for(let i=0;i<30;i++){X.advanceTime(.8);X.moveParties(1)}G.grace=99;closeAll(X)};   // a day of the world as if the company were on the road: bands near it move in real time
const toStart=G=>{const d=X.crisisStartDay();while(G.day<d)day(G);ok(G.crisis&&G.crisis.k===G.crisisKind,'the crisis did not start on its day: '+G.crisisKind+' day '+G.day)};
const snap=G=>JSON.stringify({c:G.crisis,towns:G.towns.map(t=>[t.held||'',t.sacks|0,Math.round(t.pros)]),hosts:G.parties.filter(p=>p.cr).map(p=>[p.id,p.f,p.cr,Math.round(p.x),Math.round(p.y),p.to,p.siegeT]),sites:G.sites.filter(s=>s.cr).map(s=>[s.kind,Math.round(s.x),Math.round(s.y)]),news:G.news.map(n=>n.t),rng:X.rngState()});
const K=X.CRKEYS;

section('choice');
{const seen={};for(let s=1;s<=40;s++){const k=X.crisisKindOf(s*7919);ok(K.includes(k),'bad crisis kind');ok(X.crisisKindOf(s*7919)===k,'crisis kind not deterministic');seen[k]=1}
 ok(Object.keys(seen).length===4,'40 seeds should give all four crises: '+Object.keys(seen));
 const G=fresh(SEED);ok(K.includes(G.crisisKind)&&G.crisisKind===X.crisisKindOf(G.seed),'a new game must choose its crisis from the seed: '+G.crisisKind);
 for(const k of K){const C=X.CRISES[k];ok(C.n&&C.d&&typeof C.start==='function'&&typeof C.day==='function'&&typeof C.ended==='function'&&typeof C.win==='function'&&typeof C.lose==='function'&&typeof C.marks==='function'&&typeof C.sheet==='function','CRISES.'+k+' is incomplete')}
 console.log('kinds from the seed: ok ('+Object.keys(seen).join(' ')+')')}

const RES={};
for(const k of K){section(k);
 const run=()=>{const G=fresh(SEED+K.indexOf(k)*101,k);toStart(G);const out={start:snap(G)};let maxHosts=0,held=0,sacked=0,T=0;
  for(let d=0;d<60&&!G.crisis.fin;d++){const t0=process.hrtime.bigint();day(G);T+=Number(process.hrtime.bigint()-t0)/1e6;maxHosts=Math.max(maxHosts,G.parties.filter(p=>p.cr).length);
   held=Math.max(held,G.towns.filter((t,i)=>X.crTownHeld(i)).length);sacked=Math.max(sacked,G.towns.filter(t=>t.sacks>0).length)}
  out.end=snap(G);out.maxHosts=maxHosts;out.held=held;out.sacked=sacked;out.ms=T;out.G=G;return out};
 const a=run(),b=run();ok(a.start===b.start&&a.end===b.end,k+': two runs from the same seed differ');
 const G=a.G,c=G.crisis;
 ok(c.doom>0,k+': the doom never rose');
 if(k==='sunder')ok(G.portals.length>=3,'the Sundering opened no rifts');
 if(k==='deadmarch')ok(G.sites.filter(s=>s.kind==='grave').length>=3&&a.maxHosts>=2&&a.held>=1,'the Dead March: graves, hosts or fallen towns missing: '+[a.maxHosts,a.held]);
 if(k==='horde')ok(X.crSiteOf('hcamp')&&a.maxHosts>=2&&a.held>=1,'the Great Horde: camp, bands or taken towns missing: '+[a.maxHosts,a.held]);
 if(k==='barbarian'){const s=X.crSiteOf('ecamp');ok(s&&s.y<X.WS*.35,'the Emperor\'s Camp must stand in the far north');ok(a.maxHosts>=2&&(a.sacked>=1||a.held>=1),'the Barbarian War: raids or sacked towns missing: '+[a.maxHosts,a.sacked])}
 ok(X.crisisLine().length>4&&X.crisisMarks().length>0,k+': no status line or no map marks');
 X.sheets.length=0;X.crisisSheet();ok(X.sheets.join().includes(X.CRISES[k].n),k+': the crisis sheet');closeAll(X);
 ok(a.ms/60<25,k+': the daily simulation is slow: '+(a.ms/60).toFixed(2)+' ms a day');
 // save round trip
 X.mode='world';X.save();const g2=X.loadSave();ok(g2&&g2.crisis&&g2.crisis.k===k&&JSON.stringify(g2.crisis)===JSON.stringify(G.crisis),k+': the crisis did not survive a save round trip');
 ok(JSON.stringify(g2.towns.map(t=>t.held||''))===JSON.stringify(G.towns.map(t=>t.held||'')),k+': held towns did not survive the save');
 ok(g2.parties.filter(p=>p.cr).length===G.parties.filter(p=>p.cr).length,k+': crisis hosts did not survive the save');
 RES[k]=a;console.log(`60 days (or to the end): doom ${Math.round(c.doom)}, hosts at most ${a.maxHosts}, towns held at most ${a.held}, sacked ${a.sacked}; ${(a.ms/60).toFixed(2)} ms a day; save round trip, replay: ok`)}

section('winning');
for(const k of K){const G=fresh(SEED+5+K.indexOf(k),k);toStart(G);for(let d=0;d<6;d++)day(G);const c=G.crisis,r0=G.renown;
 if(k==='sunder'){c.closed=c.total}
 else if(k==='deadmarch'){for(const p of G.parties.filter(p=>p.cr==='host').slice(0,4))X.worldBattleEnd({type:'party',id:p.id},true);ok(c.throne.known||c.clues>=4||G.parties.filter(p=>p.cr).length<4,'beaten hosts must give clues');X.crThroneReveal();ok(X.crSiteOf('throne'),'the throne site');X.worldBattleEnd({type:'crisis',k,what:'throne'},true)}
 else if(k==='horde'){X.crisisBattleEnd({type:'crisis',k,what:'camp'},true);ok(G.note==='crisisNext'&&c.as&&c.as.stage===1,'the horde camp is two fights');G.note=null;X.crisisBattleEnd({type:'crisis',k,what:'chief'},true)}
 else{for(const w of ['palisade','champions'])X.crisisBattleEnd({type:'crisis',k,what:w},true);ok(c.as&&c.as.stage===2,'the Emperor\'s camp is three fights');X.crisisBattleEnd({type:'crisis',k,what:'emperor'},true)}
 day(G);ok(c.won&&c.fin&&!c.lost&&X.CRISES[k].win(G)&&!X.CRISES[k].lose(G),k+': the crisis was not won');ok(G.renown>=r0+X.CRK.renown*.9&&G.stash.includes(X.CRTROPHY[k])&&G.titles.includes(X.CRTITLE[k]),k+': victory rewards missing');
 ok(G.parties.filter(p=>p.cr&&p.f===X.CRISES[k].f).length===0||k==='sunder',k+': hosts linger after the victory');
 for(let d=0;d<10;d++)day(G);ok(G.crisis.won,'the victory must hold');
 X.sheets.length=0;X.crisisEndSheet();ok(/victory/i.test(X.sheets.join()),'the victory sheet');closeAll(X);console.log(k+': won (scripted), rewards, title, trophy: ok')}

section('losing');
for(const k of K){const G=fresh(SEED+9+K.indexOf(k),k);toStart(G);day(G);G.crisis.doom=999;day(G);const c=G.crisis;
 ok(c.lost&&c.fin&&!c.won&&Array.isArray(G.crScar)&&G.crScar.some(s=>s.k===k),k+': the crisis was not lost');ok(G.roster.length>0&&X.mode==='world','the run must go on after a defeat');
 for(let d=0;d<15;d++)day(G);ok(!c.won,'a lost crisis does not win itself');
 // the late victory
 if(k==='horde'){X.crisisBattleEnd({type:'crisis',k,what:'camp'},true);X.crisisBattleEnd({type:'crisis',k,what:'chief'},true);ok(c.won&&c.late,'a late victory after the defeat');ok(!G.crScar.some(s=>s.k===k),'the scar heals')}
 console.log(k+': lost (doom 100), scar, the run goes on'+(k==='horde'?', late victory heals the scar':'')+': ok')}

section('towns');
{const G=fresh(SEED+20,'horde');toStart(G);const i=G.towns.length-1,own=G.towns[i].own;ok(X.crFall(i,'horde'),'crFall');ok(X.crTownHeld(i)==='horde'&&X.townOwner(i)==='horde'&&X.townHostile(i)&&!X.houseTowns(own).includes(i),'a held town changes owner and closes');
 X.sheets.length=0;ok(X.crTownSheet(i)&&/Storm the gate/.test(X.sheets.join()),'arriving at a held town offers the fight');closeAll(X);
 X.worldBattleEnd({type:'crisis',k:'horde',what:'town',i},true);ok(!X.crTownHeld(i)&&G.towns[i].own===own,'liberating a town returns it');
 // a host besieges and the town falls (or holds) after two days
 const p=X.crHost('horde',G.towns[i].x+40,G.towns[i].y,i,{cr:'band'});ok(p,'crHost');X.crArrive(p);ok(p.siegeT===i&&X.townSit(i,'crsiege'),'arrival must start a siege');for(let d=0;d<6;d++)day(G);ok(!G.parties.some(q=>q.id===p.id),'the siege must end');
 console.log('fall, liberation, sieges: ok')}

section('contracts');
{const G=fresh(SEED+30,'deadmarch');toStart(G);let types={};for(let d=0;d<25;d++){day(G);G.towns.forEach((t,ti)=>{for(let n=0;n<4;n++){const c=X.genContract2(t,ti);if(c&&c.cr)types[c.type]=1}})}
 ok(types.crdefend||types.crhunt||types.crlib,'no crisis contracts were offered: '+Object.keys(types));
 ok(X.RV_TAKE.includes('crdefend'),'rivals take crisis contracts');console.log('crisis contracts offered: '+Object.keys(types).join(' '))}

section('battles');
(async()=>{for(const k of K){const G=fresh(SEED+40+K.indexOf(k),k);toStart(G);G.roster.forEach(m=>{if(m.lvl<6)X.makeVeteran(m,6)});keepAlive(G);let o;
  if(k==='sunder'){o={f:'void',mult:1,fixed:['tyrant'],src:{type:'dun'}}}else if(k==='deadmarch'){X.crThroneReveal();o=X.crThroneFight()}else{X.crAssault();G.crisis.as.stage=X.CRISES[k].nStages-1;o=X.CRISES[k].stages(G,G.crisis.as.stage)}
  if(X.B)X.B=null;X.mode='world';const res=await X.autoBattle(Object.assign({},o,{turnCap:4000}));ok(res,k+': the final battle did not start');
  const bossOK=k==='sunder'||(X.EN[o.fixed[0]]);ok(bossOK,'boss unit');X.settleBattle(res.win);closeAll(X);console.log(`${k}: the final battle ran (${res.win?'won':'lost'}${res.stuck?', stuck':''})`)}
 finished=true;console.log('\ncrises: all ok')})();
let finished=false;process.on('exit',c=>{if(!finished&&c===0){console.error('FAIL: did not finish');process.exitCode=1}});
