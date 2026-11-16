// Garrisons test (town garrisons sallying on the world map, 43-garrisons.js; world agent, round 2).
// Plain node, no browser:  node test/garrisons.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the vm harness of test/caravans.js) and checks: garrison strength by town (size,
// prosperity, a house's town or a free town's watch, the seat), the sally (a band inside the radius brings the garrison out, one beyond it
// or far too strong does not; never caravans, patrols, besiegers, rivals; a besieged town keeps it in), the clash (side by side, within the
// leash, auto-resolved with no game randomness, replayed identical, both outcomes), the march home and recovery by the day, a hostile town's
// garrison coming for the company, intervening (the house's soldiers on the company's side in livery; won, turned, lost), the save round
// trip with a clash in progress and repair of broken records, and a 40-day world where the bands do not vanish.
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


const X=makeContext();
const fresh=s=>{X.seedRng(s);X.newGame(true);closeAll(X);return X.G};
const keepAlive=G=>{G.crowns=1e7;G.food=1e5;G.roster.forEach(m=>m.hp=X.calc(m).hp)};
const TS=X.TS;
const canon=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((a,q)=>(a[q]=v[q],a),{}):v);

// a band of faction f, strength m, standing d tiles from town ti (east of it, or the first walkable spot around it)
const bandAt=(G,ti,f,m,d)=>{const t=G.towns[ti];let x=t.x+d*TS,y=t.y;for(let a=0;a<16&&!X.okAt(x,y);a++){x=t.x+Math.cos(a*.4)*d*TS;y=t.y+Math.sin(a*.4)*d*TS}const p={id:G.nid++,x,y,tx:x,ty:y,f,mult:m,goal:'roam',pts:[{x:Math.round(x),y:Math.round(y)}],pi:0};G.parties.push(p);return p};
// a quiet world: the company far away (or at hand), nothing else on the map
const quiet=(G,near)=>{G.parties=[];G.clashes=[];G.grace=0;X.mode='world';G.townOpen=false;if(!near){const t=G.towns[0];let far=null,fd=-1;for(const q of G.towns){const d=Math.hypot(q.x-t.x,q.y-t.y);if(d>fd){fd=d;far=q}}G.p.x=far.x;G.p.y=far.y}};
const houseTown=(G,big)=>{let best=-1;G.towns.forEach((t,i)=>{if(!X.houseById(t.own)||t.east||t.held||i===0&&!big)return;if(best<0||(big?t.size>G.towns[best].size:t.size<G.towns[best].size))best=i});return best};
const hours=(n,f)=>{for(let h=0;h<n;h++){X.cvHour();if(f&&f())return h+1}return n};

(async()=>{
section('strength by town');
{ const G=fresh(SEED),T=G.towns;
  const mk=(o)=>{const t=Object.assign(X.clone(T[1]),{sit:[],pros:50,size:2,own:G.houses[0].id},o);delete t.gar;delete t.held;delete t.east;T.push(t);const v=X.grFull(T.length-1);T.pop();return v};
  const h1=mk({size:1}),h2=mk({size:2}),h3=mk({size:3}),f1=mk({size:1,own:'free'}),f2=mk({size:2,own:'free'}),f3=mk({size:3,own:'free'}),poor=mk({size:3,pros:10}),rich=mk({size:3,pros:95});
  ok(h1<h2&&h2<h3,'larger towns field larger garrisons: '+[h1,h2,h3]);ok(f1===0&&f2>0&&f2<h2&&f3<h3,'free towns keep a weaker watch, none in a hamlet: '+[f1,f2,f3]);ok(poor<h3&&h3<rich,'prosperity: '+[poor,h3,rich]);
  const seat=G.houses[0].seat,s=X.grFull(seat);ok(s>0&&s>=X.GR.base[T[seat].size-1]*X.GR.house,'the seat is strongest: '+s);
  const E=T.findIndex(t=>t.east);if(E>=0)ok(X.grFull(E)===0,'eastern towns have none of this');
  ok(X.grStr(seat)===s&&!T[seat].gar,'a garrison at home, untouched: full strength, no state stored');
  const L=T.map((t,i)=>`${t.name} (${t.size}, ${t.own}): ${X.grFull(i)}`);console.log('  '+L.slice(0,6).join('; '));
  // the soldiers: more and better in a big house town
  const a=X.grIds(houseTown(G,false),1),b=X.grIds(seat,1);ok(b.length>=a.length&&a.every(id=>X.EN[id])&&b.every(id=>X.EN[id]),'soldiers: '+a+' / '+b);
  console.log('strength by town: ok') }

section('the sally: radius, who is a foe');
{ const G=fresh(SEED);quiet(G);const ti=houseTown(G,true),t=G.towns[ti],R=X.grR(ti),s=X.grFull(ti);
  const out=bandAt(G,ti,'bandit',s*.5,R+.8);hours(1);ok(!t.gar||t.gar.out==null,'a band beyond the radius ('+(R+.8).toFixed(1)+' tiles) is left alone');out.gone=1;G.parties=G.parties.filter(p=>!p.gone);
  const big=bandAt(G,ti,'orc',s*2,R-.5);hours(1);ok(!t.gar||t.gar.out==null,'a band far stronger than the garrison is left alone');big.gone=1;G.parties=G.parties.filter(p=>!p.gone);
  for(const [kind,o] of [['a caravan',{goal:'caravan'}],['a house patrol',{f:G.houses[1]?G.houses[1].id:'free',goal:'patrol'}],['a besieging host',{siege:ti}],['a band in wait for an escort',{ambE:1}],['a rival company',{goal:'merc'}]]){
   const p=bandAt(G,ti,o.f||'bandit',s*.5,R-.5);Object.assign(p,o);hours(1);ok(!t.gar||t.gar.out==null,'not '+kind);p.gone=1;G.parties=G.parties.filter(q=>!q.gone);delete t.gar}
  const band=bandAt(G,ti,'bandit',Math.round(s*.6*100)/100,R-.4);const s0=X.rngState();hours(1);ok(t.gar&&t.gar.out!=null,'a band inside the radius: the garrison marches out');ok(X.rngState()===s0,'the sally draws no game randomness');
  const g=G.parties.find(p=>p.id===t.gar.out);ok(g&&g.gar===ti&&g.goal==='patrol'&&g.f===t.own&&g.tgt===band.id&&Math.abs(g.mult-s)<.011,'the garrison is a party of the house: '+JSON.stringify({f:g.f,mult:g.mult,tgt:g.tgt}));
  ok(/garrison of/.test(X.partyLabel(g))&&!X.partyHostile(g),'it reads as the garrison, and is no foe of the company: '+X.partyLabel(g));ok(X.grStr(ti)<s*.5,'the town is thin while it is out');
  // besieged: it stays in
  const G2=fresh(SEED);quiet(G2);X.townSitAdd(ti,'siege',5,{by:G2.houses[1]?G2.houses[1].id:'h1'});bandAt(G2,ti,'bandit',s*.4,R-.4);hours(2);ok(!G2.towns[ti].gar||G2.towns[ti].gar.out==null,'a besieged town keeps its garrison in');
  const G3=fresh(SEED);quiet(G3);X.townSitAdd(ti,'crsiege',5);bandAt(G3,ti,'bandit',s*.4,R-.4);hours(2);ok(!G3.towns[ti].gar||G3.towns[ti].gar.out==null,'so does a town under a crisis siege');
  console.log('the sally: ok') }

section('the clash, auto-resolved; home, recovery');
{ const run=(seed,mf)=>{const G=fresh(seed);quiet(G);const ti=houseTown(G,true),t=G.towns[ti],s=X.grFull(ti),band=bandAt(G,ti,'bandit',Math.round(s*mf*100)/100,X.grR(ti)-.4);const L=[];
   let h=0,cl=null;for(;h<40&&!cl;h++){X.cvHour();cl=X.cvList().find(q=>q.g)}ok(cl&&cl.ti===ti&&cl.r===band.id,'the garrison reaches the band ('+h+' hours) and they clash');
   const g=G.parties.find(p=>p.id===cl.c);ok(g.clash===cl.id&&band.clash===cl.id&&Math.hypot(band.x-g.x,band.y-g.y)<=60,'side by side: '+[band.x-g.x,band.y-g.y]);
   const R0=Math.hypot(g.x-t.x,g.y-t.y)/TS;ok(R0<=X.grR(ti)+X.GR.leash+.01,'within its leash: '+R0.toFixed(2)+' tiles out');
   const s0=X.rngState();while(X.cvList().some(q=>q.g)&&L.length<30){X.cvHour();const q=X.cvList().find(q=>q.g);L.push(q?q.gh+'/'+q.rh:'end')}ok(X.rngState()===s0,'the clash draws no game randomness');
   const bandLeft=G.parties.find(p=>p.id===band.id);let back=0;for(;back<60&&t.gar&&t.gar.out!=null;back++)X.cvHour();ok(t.gar&&t.gar.out==null&&!G.parties.some(p=>p.gar===ti),'it walks home ('+back+' hours)');
   return{G,ti,L,band:bandLeft,h:X.grH(ti),s,mult0:Math.round(s*mf*100)/100}};
  const a=run(SEED,.6),b=run(SEED,.6);ok(JSON.stringify(a.L)===JSON.stringify(b.L)&&a.h===b.h,'replayed: the same fight '+a.L.slice(0,4).join(' '));ok(a.L[a.L.length-1]==='end'&&a.L.length<=X.GR.maxH+1,'over within '+X.GR.maxH+' hours: '+a.L.length);
  ok(a.h<1&&a.h>0,'the garrison came home weakened: '+a.h);ok(!a.band||a.band.mult<a.mult0,'the band is weaker or gone');
  if(a.band)ok(Math.hypot(a.band.tx-a.G.towns[a.ti].x,a.band.ty-a.G.towns[a.ti].y)>X.grR(a.ti)*TS,'and driven away from the walls');
  // both outcomes, by strength
  const tally={garrison:0,band:0};for(let k=0;k<24;k++){const r=run(SEED+k,.8+(k%4)*.17);const T=r.G.towns[r.ti];if(r.band&&r.band.mult>=r.mult0*.5&&r.h<.4)tally.band++;else tally.garrison++}
  ok(tally.garrison>=8&&tally.band>=1,'both outcomes, the garrison winning most fights it chooses: '+JSON.stringify(tally));console.log('  24 sallies: '+JSON.stringify(tally));
  // recovery: back to full in days, not while besieged; a weak garrison stays in
  const {G,ti}=a;X.G=G;const t=G.towns[ti];bandAt(G,ti,'bandit',.3,X.grR(ti)-.5);G.towns[ti].gar.h=X.GR.min-.05;G.towns[ti].gar.cd=0;hours(1);ok(t.gar.out==null,'a garrison below '+X.GR.min+' stays in');G.parties=G.parties.filter(p=>p.gar==null&&p.f!=='bandit');
  t.gar.h=.4;X.grDay();const h1=X.grH(ti);ok(h1>.4,'it recovers a day at a time: '+h1);let d=0;while(t.gar&&d<20){G.day++;X.grDay();d++}ok(!t.gar&&X.grH(ti)===1,'back to full in '+(d+1)+' days '+JSON.stringify(t.gar)+X.grBesieged(ti));
  t.gar={h:.4};X.townSitAdd(ti,'siege',3,{by:'h9'});X.grDay();ok(X.grH(ti)===.4,'no recovery under siege');X.townSitDel(ti,'siege');
  console.log('the clash: ok') }

section('hostile town: the garrison comes for the company');
{ const G=fresh(SEED);quiet(G,true);const ti=houseTown(G,true),t=G.towns[ti];G.p.x=t.x+X.grR(ti)*.6*TS;G.p.y=t.y;if(!X.okAt(G.p.x,G.p.y)){G.p.x=t.x;G.p.y=t.y+TS}G.rep[t.own]=-80;
  hours(1);const g=G.parties.find(p=>p.gar===ti);ok(g&&g.tgt===-1&&X.partyHostile(g),'out after the company');const o=X.partyBattle(g);ok(o.f===t.own&&o.foes.length>=2&&o.src.gar===ti,'the battle: its soldiers');
  G.rep[t.own]=0;hours(2);ok(g.back,'friends again: it turns home');
  console.log('hostile town: ok') }

section('intervene: fight beside the garrison');
{ for(const how of ['win','turn','lose']){const G=fresh(SEED+7);quiet(G,true);keepAlive(G);const ti=houseTown(G,true),t=G.towns[ti],s=X.grFull(ti);const band=bandAt(G,ti,'orc',Math.round(s*.7*100)/100,X.grR(ti)-.4);
   let cl=null;for(let h=0;h<40&&!cl;h++){X.cvHour();cl=X.cvList().find(q=>q.g)}ok(cl,'a clash');G.p.x=cl.x;G.p.y=cl.y+TS*.3;
   X.sheetOpen=false;ok(X.cvReach(cl.x,cl.y)&&X.sheetOpen,'walking up opens the sheet');closeAll(X);
   const o=X.cvBattle(cl);ok(o&&o.src.type==='clash'&&o.src.g&&o.cv&&o.cv.gar&&o.cv.ids.length>=2&&o.cv.f===t.own,'battle options: '+JSON.stringify(o.cv));ok(o.livery&&o.cv.livery&&o.livery.c1,'the house livery rides along: '+JSON.stringify(o.livery));
   const b=X.startBattle(Object.assign({},o,{auto:true,quiet:true,turnCap:how==='win'?1500:1}));const gu=b.units.filter(u=>u.grd);
   ok(gu.length===o.cv.ids.length&&gu.every(u=>u.side===0&&u.ally&&!u.m&&u.livery&&/watch|garrison|arms|captain/i.test(u.name)),'the garrison on the company\'s side, in livery: '+gu.map(u=>u.name).join(', '));ok(!b.units.some(u=>u.cvw),'no wagon');
   if(how==='turn'){const m=b.units.find(u=>u.side===0&&u.m);X.cvGuardDown(gu[0],m);ok(b.cv.turned&&gu.slice(1).every(u=>!u.alive||u.side===2),'a soldier killed by the company: the garrison turns')}
   let res;if(how==='lose'){res=X.resolveBattle(false)}else{for(const u of b.units)if(u.side===1||(how==='turn'&&u.side===2))u.alive=false;res=X.resolveBattle(true)}
   const cr=G.crowns,rp=X.repOf(t.own),out=X.settleBattle(how!=='lose');const k=out.world&&out.world.cv;ok(k&&k.g,'the after sheet record: '+JSON.stringify(k));
   if(how==='win'){ok(k.k==='saved'&&G.crowns-cr===X.GR.pay[t.size-1]&&X.repOf(t.own)>rp&&!G.parties.some(p=>p.id===band.id)&&!X.cvList().some(q=>q.id===cl.id),'won: paid, thanked, the band gone '+JSON.stringify([k.k,G.crowns-cr,res.crowns,X.repOf(t.own)-rp,G.parties.some(p=>p.id===band.id),X.cvList().some(q=>q.id===cl.id)]));
    const g=G.parties.find(p=>p.gar===ti);ok(g&&g.back,'the garrison marches home')}
   if(how==='turn')ok(k.k==='turned'&&X.repOf(t.own)<rp&&X.grH(ti)<=.1,'turned: standing lost, the garrison cut down');
   if(how==='lose')ok(k.k==='left'&&(X.cvList().some(q=>q.id===cl.id)||k.end),'lost: the fight goes on: '+k.k);
   X.sheetOpen=false;X.cvAfterSheet(k);ok(X.sheetOpen,'the after sheet shows');closeAll(X)}
  console.log('intervene: ok') }

section('saves');
{ const G=fresh(SEED+11);quiet(G);const ti=houseTown(G,true),t=G.towns[ti],s=X.grFull(ti);bandAt(G,ti,'bandit',Math.round(s*.6*100)/100,X.grR(ti)-.4);
  let cl=null;for(let h=0;h<40&&!cl;h++){X.cvHour();cl=X.cvList().find(q=>q.g)}ok(cl,'a clash under way');X.cvHour();const g=G.parties.find(p=>p.gar===ti);
  X.mode='world';ok(X.save(),'save');const rd=X.readSave();ok(rd.state==='ok','read back: '+rd.state+' '+(rd.why||''));const g2=rd.g,cl2=g2.clashes.find(q=>q.id===cl.id),p2=g2.parties.find(p=>p.id===g.id);
  const cur=X.cvList().find(q=>q.id===cl.id);ok(cl2&&cur&&canon(cl2)===canon(cur),'the garrison clash round trips: '+JSON.stringify(cl2));ok(p2&&p2.gar===ti&&p2.clash===cl.id&&g2.towns[ti].gar&&g2.towns[ti].gar.out===g.id,'the garrison party and its town keep each other');
  // repair: a broken record is put right or dropped
  const bad=JSON.parse(JSON.stringify(rd.g));bad.towns[ti].gar={h:'lots',out:'x'};bad.parties.push(Object.assign({},p2,{id:99999,gar:999}));bad.towns[0].gar=7;X.store.set(X.SAVEKEY,JSON.stringify(bad));const rb=X.readSave();
  ok(rb.state==='ok'&&rb.g.towns[ti].gar.h===1&&rb.g.towns[ti].gar.out===g.id&&!rb.g.parties.some(p=>p.id===99999)&&rb.g.towns[0].gar===undefined,'repaired: '+JSON.stringify(rb.g.towns[ti].gar));
  const none=JSON.parse(JSON.stringify(rd.g));none.towns.forEach(t=>delete t.gar);none.parties=none.parties.filter(p=>p.gar==null);none.clashes=[];X.store.set(X.SAVEKEY,JSON.stringify(none));const rn=X.readSave();ok(rn.state==='ok'&&rn.g.towns.every(t=>t.gar===undefined),'a save without garrisons (older) reads: every garrison home at full strength');
  console.log('saves: ok') }

section('a living world: towns keep their bands at bay, the map does not empty');
{ const G=fresh(SEED+21);keepAlive(G);let sallies=0,clashes=0,seen=new Set();const n0=G.parties.filter(p=>!X.humanFact(p.f)).length;
  for(let d=0;d<40;d++){for(let h=0;h<24;h++){X.advanceTime(1);X.moveParties(1/X.WHRS);for(const p of G.parties)if(p.gar!=null&&!seen.has(p.id)){seen.add(p.id);sallies++}for(const q of X.cvList())if(q.g&&!seen.has('c'+q.id)){seen.add('c'+q.id);clashes++}closeAll(X)}keepAlive(G)}
  const n1=G.parties.filter(p=>!X.humanFact(p.f)).length;ok(sallies>0&&clashes>0,'garrisons sallied ('+sallies+') and fought ('+clashes+')');ok(n1>=Math.max(3,n0*.5),'bands still roam: '+n0+' -> '+n1);
  ok(G.parties.filter(p=>p.gar!=null).every(p=>{const t=G.towns[p.gar];return Math.hypot(p.x-t.x,p.y-t.y)<=(X.grR(p.gar)+X.GR.leash+2)*TS}),'never far from home');
  console.log(`  40 days: ${sallies} sallies, ${clashes} clashes, monster bands ${n0} -> ${n1}`);console.log('a living world: ok') }

console.log('\nALL GARRISON TESTS PASSED');process.exit(0)
})().catch(e=>fail(e&&e.stack||e));
