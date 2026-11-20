// Company progression test. Plain node, no browser:  node test/company.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the vm approach and DOM stubs of test/items.js) and checks:
// renown tiers and what they unlock (contract danger and factions, pay, veteran recruits, follower slots, rare backgrounds),
// every follower's world / town / economy effect, ambitions (offer, take up, progress, completion, rewards, notes),
// the battle flow (parts, drillmaster xp, counters) and the save round trip of the progression fields.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261115,SRC=path.join(__dirname,'..','src');
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
const fightOnce=(o,kill)=>{const b=X.startBattle(Object.assign({f:'gob',mult:1,src:{type:'sim'},quiet:true},o));ok(b,'battle did not start');
 for(const u of b.units)if(u.side===1&&(!kill||kill(u)))u.alive=false;const res=X.resolveBattle(true);X.B=null;X.mode='world';return res};

section('renown tiers');
{ const R=X.RENOWN;ok(Array.isArray(R)&&R.length===6,'six renown tiers');
  R.forEach((D,i)=>{ok(typeof D.n==='string'&&D.n&&Number.isFinite(D.min),'tier '+(i+1)+' shape');if(i){const P=R[i-1];ok(D.min>P.min&&D.diff>=P.diff&&D.pay>P.pay&&D.slots>=P.slots&&D.lv[1]>=P.lv[1]&&D.vet>=P.vet&&D.rare>=P.rare,'tier '+(i+1)+' must open at least what tier '+i+' did')}});
  ok(R[0].min===0&&R[0].slots===1&&R[5].slots===5&&R[0].vet===0&&R[5].diff===5,'slots 1 to 5, no veterans unknown, five skulls at the top');
  for(let i=0;i<6;i++){ok(X.renownTier(R[i].min)===i+1,'renownTier at the threshold of '+R[i].n);if(i)ok(X.renownTier(R[i].min-1)===i,'renownTier just below '+R[i].n)}
  const G=fresh(SEED);G.renown=100;const I=X.renownInfo();ok(I.tier===2&&I.n===R[1].n&&I.renown===100&&I.next===R[2].min&&Math.abs(I.progress-(100-50)/(150-50))<1e-9,'renownInfo: '+JSON.stringify({t:I.tier,n:I.next,p:I.progress}));
  G.renown=5000;ok(X.renownInfo().next===null&&X.renownInfo().progress===1,'renownInfo at the summit');
  ok(R[1].min<=60,'Known within reach of a first week (about 5-8 fights and 2-3 contracts: 40-70 renown)');
  console.log(R.map(D=>`${D.n} ${D.min}`).join(', ')+': ok') }

section('contracts by tier');
{ const G=fresh(SEED+1),t=G.towns[0],P0=X.companyPower;X.companyPower=()=>240;G.day=90;
  const roll=(r,n)=>{G.renown=r;const L=[];for(let i=0;i<n;i++){const c=X.genContract(t);if(c.type==='hunt')L.push(c)}return L};
  const lo=roll(0,400),hi=roll(1200,400);
  ok(lo.every(c=>c.diff>=1&&c.diff<=2),'an unknown company is offered one and two skulls only: '+[...new Set(lo.map(c=>c.diff))]);
  ok(hi.some(c=>c.diff===5)&&hi.some(c=>c.diff===4)&&hi.every(c=>c.diff>=2),'a legendary company sees deadly and dire work');
  const end=L=>L.filter(c=>X.FACT[c.f].tier==='end').length/L.length,mid=L=>L.filter(c=>X.FACT[c.f].tier==='mid').length/L.length;
  ok(end(hi)>end(lo)*3&&mid(hi)>mid(lo),'renown opens the stronger factions: end '+end(lo).toFixed(3)+' -> '+end(hi).toFixed(3)+', mid '+mid(lo).toFixed(3)+' -> '+mid(hi).toFixed(3));
  const avg=(L,d)=>{const x=L.filter(c=>c.diff===d&&X.FACT[c.f].tier==='early');return x.reduce((a,c)=>a+c.pay,0)/Math.max(1,x.length)};
  {const k=X.RENOWN[X.RENOWN.length-1].pay/X.RENOWN[0].pay;ok(k>1.2&&Math.abs(avg(hi,2)/avg(lo,2)-k)<.08*k,'pay multiplier (x'+k+'): '+avg(lo,2).toFixed(0)+' -> '+avg(hi,2).toFixed(0))}
  X.companyPower=P0;
  // a five-skull lair fields a stronger band
  ok(X.CTR_DIFFK.length===5&&X.CTR_DIFFK.every((k,i)=>!i||k>X.CTR_DIFFK[i-1]),'lair strength rises with every skull');
  console.log(`hunts at renown 0: skulls ${[...new Set(lo.map(c=>c.diff))].sort()}; at 1200: ${[...new Set(hi.map(c=>c.diff))].sort()}; end-tier share ${end(lo).toFixed(2)} -> ${end(hi).toFixed(2)}: ok`) }

section('recruits by tier');
{ const G=fresh(SEED+2),t=G.towns[0],rare=Object.keys(X.BG).filter(k=>X.BG[k].w<=1);
  const roll=(r,n)=>{G.renown=r;G.retinue=[];const L=[];for(let i=0;i<n;i++){X.stockTown(t);L.push(...t.recruits)}return L};
  const lo=roll(0,60),hi=roll(1200,60),D=X.RENOWN[5];
  ok(lo.length===300&&lo.every(m=>m.lvl===1),'an unknown company sees only green recruits');
  const vets=hi.filter(m=>m.lvl>1);ok(vets.length>hi.length*.3&&vets.length<hi.length*.8,'a legendary company sees some veterans: '+vets.length+' of '+hi.length);
  ok(vets.every(m=>m.lvl>=D.lv[0]&&m.lvl<=D.lv[1]&&m.pend===0&&m.pp===0&&m.perks.length===m.lvl&&m.xp>=X.XPT[m.lvl]&&m.hp===X.calc(m).hp),'veterans: level in range, stats rolled, perks learned by autoLearn');
  { const v=vets[0],g=lo.find(m=>m.bg===v.bg);ok(!g||X.recruitCost(v)>X.recruitCost(g),'a veteran costs more than a green one of its background') }
  if(rare.length){const f=L=>L.filter(m=>rare.includes(m.bg)).length/L.length;ok(f(hi)>f(lo)*1.5,'rare backgrounds are likelier with renown: '+f(lo).toFixed(3)+' -> '+f(hi).toFixed(3))}
  console.log(`veterans at Legendary ${vets.length}/${hi.length} (levels ${Math.min(...vets.map(m=>m.lvl))}-${Math.max(...vets.map(m=>m.lvl))}), rare backgrounds ${rare.length}: ok`) }

section('followers');
{ const F=X.FOLLOWERS,ids=Object.keys(F);ok(ids.length>=11&&['scout','quarter','surgeon','armorer','drill','cook','carto','recruiter','herbalist','banner','paymaster'].every(k=>F[k]),'the eleven followers');
  for(const id of ids){const f=F[id];ok(f.n&&f.d&&f.effect&&f.cost>0&&f.renown>=1&&f.renown<=6&&f.icon==='fol-'+id,id+' shape');const r=X.ICONS['fol-'+id];ok(Array.isArray(r)&&r.length===32&&r.every(s=>s.length===32&&[...s].every(k=>k==='.'||X.PAL[k])),id+': a 32x32 portrait in PAL keys')}
  let G=fresh(SEED+3);G.crowns=1e6;
  // hiring rules: renown tier, slots, crowns; dismissing
  G.renown=0;ok(X.followerSlots()===1,'one slot when unknown');ok(!X.followerCan('drill').ok&&X.followerCan('drill').tier,'the drillmaster needs renown');
  ok(X.hireFollower('scout')&&X.followerHas('scout')&&G.crowns===1e6-F.scout.cost,'hire the scout');ok(!X.followerCan('cook').ok&&X.followerCan('cook').full,'the one slot is taken');
  ok(!X.hireFollower('scout'),'no second scout');ok(X.dismissFollower('scout')&&!X.followerHas('scout'),'dismiss');
  G.renown=1200;ok(X.followerSlots()===5,'five slots when legendary');G.crowns=10;ok(X.followerCan('scout').poor,'not enough crowns');G.crowns=1e6;
  const on=id=>{G.retinue=[id]},off=()=>{G.retinue=[]};
  // scout: sight +2 tiles, band sight unchanged, band strength read
  off();const v0=X.visionRadius(),b0=X.bandSight();on('scout');ok(Math.abs(X.visionRadius()-v0-2*X.TS)<1e-6&&X.bandSight()===b0,'scout: +2 tiles of sight, bands see no further');
  ok(X.bandIntel(G.parties[0])&&/scout/.test(X.bandIntel(G.parties[0]).line),'scout: reads band strength');off();ok(X.bandIntel(G.parties[0])===null,'no reading without the scout');
  // quartermaster: 0.8 rations a sword a day
  { const n=G.roster.length;for(const q of [0,1]){G.retinue=q?['quarter']:[];G.food=1000;G.foodAcc=0;for(let d=0;d<10;d++)X.newDay();const used=1000-G.food;ok(q?used===Math.round(n*10*.8):used===n*10,'quartermaster: rations used '+used+' by '+n+' swords in 10 days')} }
  // paymaster: wages -15%
  { off();const w0=X.companyWages(),raw=G.roster.reduce((a,m)=>a+X.wageOf(m),0);on('paymaster');const w1=X.companyWages();ok(w1===Math.round(raw*.85)&&w1<w0,'paymaster: '+w0+' -> '+w1);
    const c=G.crowns=5000;X.newDay();ok(G.crowns===c-w1,'newDay pays the paymaster’s wages') }
  // wages by level: x1 at level 1, growing exponentially to x5 (the commonest backgrounds, tavern weight 5) .. x7 (the rarest, weight 0.5 or less) at 15
  { off();const ratio=(bg,L)=>{const m=X.clone(G.roster[0]);m.bg=bg;m.traits=[];m.lvl=1;const w1=X.wageOf(m);m.lvl=L;return X.wageOf(m)/w1};
    ok(Math.abs(ratio('farmhand',15)-5)<1e-9&&Math.abs(ratio('militia',15)-5)<1e-9,'level 15: the commonest ask x5 ('+ratio('farmhand',15).toFixed(2)+')');
    ok(Math.abs(ratio('gladiator',15)-7)<1e-9,'level 15: the rarest ask x7 ('+ratio('gladiator',15).toFixed(2)+')');
    const mid=['hunter','sellsword','squire','knight'].map(b=>ratio(b,15));ok(mid.every((r,i)=>r>5&&r<7&&(i===0||r>mid[i-1])),'level 15: rarer asks more, between x5 and x7 ('+mid.map(r=>r.toFixed(2)).join(' ')+')');
    for(const b of ['farmhand','knight']){let p=1,okk=true;for(let L=2;L<=X.MAXLV;L++){const r=ratio(b,L);if(!(r>p))okk=false;p=r}ok(okk&&ratio(b,1)===1,b+': wage rises every level from x1 to '+X.MAXLV);
      ok(Math.abs(ratio(b,20)/ratio(b,15)-Math.pow(1.05,5))<1e-9&&Math.abs(ratio(b,16)/ratio(b,15)-1.05)<1e-9,b+': past 15 +5% a level (x'+(ratio(b,20)/ratio(b,15)).toFixed(3)+' at 20)');
      ok(Math.abs(ratio(b,25)-ratio(b,X.MAXLV))<1e-9,b+': capped at level '+X.MAXLV)}
    ok(Math.abs(ratio('farmhand',8)-Math.sqrt(5))<1e-9,'level 8: half way on the exponential (x'+ratio('farmhand',8).toFixed(2)+')');
    ok(X.bgRarity('farmhand')===0&&X.bgRarity('gladiator')===1&&X.bgRarity('slayer')===1,'rarity: tavern weight 5 is 0, 0.5 or less is 1') }
  // cook: wounds mend 25% faster on the road
  { const run=q=>{G.retinue=q?['cook']:[];G.roster.forEach(m=>m.hp=1);G.healAcc=0;X.advanceTime(8);return G.roster[0].hp};const a=run(0),b=run(1);ok(b>a,'cook: '+a+' -> '+b+' hitpoints in 8 hours') }
  // recruiter: a quarter off, one more recruit
  { const t=G.towns[1];off();X.stockTown(t);const m=t.recruits[0],c0=X.recruitCost(m);ok(t.recruits.length===5,'five recruits');on('recruiter');ok(X.recruitCost(m)===Math.round(c0*.75/5)*5,'recruiter: a quarter off');X.stockTown(t);ok(t.recruits.length===6,'recruiter: six recruits');
    G.roster=G.roster.slice(0,4);X.openTown(1);closeAll(X);X.openTown(1);const r=t.recruits[0],cost=X.hireCost(r),c1=G.crowns;X.hire(0);ok(G.crowns===c1-cost&&G.roster.includes(r),'hire pays the recruiter’s price');G.townOpen=false;closeAll(X) }
  // cartographer: +15% on roads
  { const N=X.WN*X.WN,W=X.W;let i0=-1;for(let i=0;i<N;i++)if(W.road[i]&&W.ok[i]){const x=i%X.WN,y=(i/X.WN)|0;if(W.road[i]&2&&W.road[i+1]&2&&W.road[i+2]&2){i0=i;break}}
    ok(i0>=0,'a straight road for the test');const step=q=>{G.retinue=q?['carto']:[];G.grace=99;G.parties=[];G.contract=null;const x=(i0%X.WN+.5)*X.TS,y=(((i0/X.WN)|0)+.5)*X.TS;G.p={x,y};G.path=[{x:x+3*X.TS,y}];G.moving=true;G.note=null;X.sheetOpen=false;if(G.amb)G.amb.cel=[];X.worldTick(.05);return G.p.x-x};
    const a=step(0),b=step(1);ok(Math.abs(b/a-1.15)<1e-6,'cartographer: '+a.toFixed(3)+' -> '+b.toFixed(3));G.moving=false;G.path=[] }
  // drillmaster and herbalist through resolveBattle
  { G=fresh(SEED+4);const share=q=>{G.retinue=q?['drill']:[];X.seedRng(SEED+40);return fightOnce({f:'gob'})};const a=share(0),b=share(1);ok(b.xpK===1.2&&b.share===Math.round(b.xp*1.2*X.AAR.base/Math.max(1,G.roster.length)),'drillmaster: '+a.share+' -> '+b.share+' xp');
    ok(Array.isArray(a.slain)&&a.slain.length===a.foeKeys.length&&a.slain.every(k=>X.EN[k]),'the result lists the slain foes by EN key');
    const had=X.partsDrop;X.partsDrop=res=>[{key:'pt_a',n:2},{key:'pt_b',n:1}];const PP=X.PARTS;if(PP){PP.pt_a={n:'Test A',d:'',tier:1,icon:'skull'};PP.pt_b={n:'Test B',d:'',tier:1,icon:'skull'}}
    let tot0=0,tot1=0;for(let i=0;i<30;i++){G.parts={};G.retinue=[];X.seedRng(SEED+60+i);const r0=fightOnce({f:'gob'});tot0+=G.parts.pt_a+G.parts.pt_b;ok(r0.parts.length===2,'parts listed in the result');
      G.parts={};G.retinue=['herbalist'];X.seedRng(SEED+60+i);fightOnce({f:'gob'});tot1+=G.parts.pt_a+G.parts.pt_b}
    ok(tot0===90&&tot1>tot0+15&&tot1<tot0+45,'herbalist: parts '+tot0+' -> '+tot1);
    G.parts={};G.retinue=[];X.seedRng(SEED+99);const rr=fightOnce({f:'gob'});ok(/br-parts/.test(X.battleResultHTML(rr))&&/Test A/.test(X.battleResultHTML(rr)),'the results dialog lists the parts');
    if(PP){delete PP.pt_a;delete PP.pt_b}X.partsDrop=had;if(typeof had!=='function')X.partsDrop=undefined }
  console.log(ids.map(id=>F[id].n).join(', ')+': hiring, slots, every world / town / economy effect: ok') }

section('ambitions');
{ const A=X.AMBITIONS,ids=Object.keys(A);ok(ids.length>=18,'about 18 ambitions: '+ids.length);
  let G=fresh(SEED+5);for(const id of ids){const a=A[id];ok(a.n&&a.d&&typeof a.test==='function'&&a.reward&&(a.reward.renown>0||a.reward.crowns>0||a.reward.item),id+' shape');const p=X.ambProgress(id);ok(p.goal>=1&&p.p>=0&&p.p<=p.goal,id+' progress')}
  ok(G.amb&&G.amb.cur===null&&G.amb.offered.length===3&&new Set(G.amb.offered).size===3&&new Set(G.amb.offered.map(id=>A[id].kind)).size>=2,'a new company is offered three ambitions of different kinds: '+G.amb.offered);
  ok(G.amb.offered.every(id=>!X.ambProgress(id).done),'nothing on offer is already met');
  { const o1=G.amb.offered.slice(),r=X.rngState();X.companyRepair(G);ok(G.amb.offered.join()===o1.join()&&X.rngState()===r,'offers are deterministic and draw no game randomness') }
  // take up "muster" and meet it
  G.amb.offered=['muster','wins10','chest'];ok(!X.ambPick('lairs'),'only an offered ambition can be taken up');ok(X.ambPick('muster')&&G.amb.cur==='muster'&&G.amb.offered.length===3&&!G.amb.offered.includes('muster'),'take up muster');
  ok(!X.ambPick('wins10'),'one ambition at a time');
  while(G.roster.length<8){const m=X.newMerc('militia');G.roster.push(m)}G.roster.forEach(m=>m.field=false);ok(X.ambTick()===null,'not met with nobody fielded');
  const r0=G.renown,c0=G.crowns;G.roster.slice(0,8).forEach(m=>m.field=true);ok(X.ambProgress('muster').done,'muster: progress 8 of 8');
  ok(X.ambTick()==='muster'&&G.amb.done.includes('muster')&&G.amb.cur===null&&G.renown===r0+A.muster.reward.renown&&G.crowns===c0+A.muster.reward.crowns&&G.amb.days.muster===G.day,'muster fulfilled and paid');
  ok(G.amb.offered.length===3&&!G.amb.offered.includes('muster'),'new offers after completion');
  ok(G.amb.cel.some(e=>e.k==='amb'&&e.id==='muster'),'a celebration note waits');const h=X.ambCelHTML(G.amb.cel.find(e=>e.k==='amb'));ok(/Ambition fulfilled/.test(h)&&/Muster/.test(h)&&/renown/.test(h),'the celebration note');
  // counted ambitions start when taken up; set aside returns them to the offer
  G.amb.offered=['wins10','slay50','streak5'];G.amb.st.wins=7;ok(X.ambPick('wins10')&&X.ambProgress('wins10').p===0,'counted from the day it is taken up');
  for(let i=0;i<9;i++)X.ambEvent('battle',{win:true,dead:[],slain:['gob','gob']});ok(X.ambProgress('wins10').p===9&&G.amb.cur==='wins10','nine wins counted');
  ok(X.ambDrop()&&G.amb.cur===null&&G.amb.offered[0]==='wins10','set aside');ok(X.ambPick('wins10')&&X.ambProgress('wins10').p===0,'taken up again: counted afresh');
  G.amb.cur=null;G.amb.offered=['streak5','slay50','chest'];X.ambPick('streak5');for(let i=0;i<4;i++)X.ambEvent('battle',{win:true,dead:[],slain:['gob']});X.ambEvent('battle',{win:true,dead:['x'],slain:[]});ok(X.ambProgress('streak5').p===0,'a death breaks the streak');
  const st0=G.stash.length;for(let i=0;i<5;i++)X.ambEvent('battle',{win:true,dead:[],slain:['gob']});ok(G.amb.done.includes('streak5')&&G.stash.length===st0+1&&X.ITEMS[G.stash[G.stash.length-1]],'unbroken: fulfilled, a piece of gear in the stash');
  // lairs, contracts, rifts, wyverns
  G.amb.offered=['lairs','grave','wyvern'];G.renown=200;X.ambPick('lairs');for(const f of ['beast','serpent','ent'])X.ambEvent('lair',{f});ok(X.ambProgress('lairs').p===3&&!G.amb.done.includes('lairs'),'three lairs of four');X.ambEvent('lair',{f:'ogre'});ok(G.amb.done.includes('lairs'),'beastbreaker fulfilled');
  G.amb.offered=['grave','wyvern','contracts5'];X.ambPick('grave');X.ambEvent('contract',{diff:2});ok(!G.amb.done.includes('grave'),'two skulls are not grave');X.ambEvent('contract',{diff:3});ok(G.amb.done.includes('grave'),'grave work fulfilled');
  G.amb.offered=['wyvern','contracts5','chest'];G.day=40;X.ambPick('wyvern');X.ambEvent('battle',{win:true,dead:[],slain:['whatch']});ok(G.amb.cur==='wyvern','a hatchling is no wyvern');X.ambEvent('battle',{win:true,dead:[],slain:['wyvern']});ok(G.amb.done.includes('wyvern'),'wyvernslayer fulfilled');
  // a new renown tier is noted
  G.amb.cel=[];G.amb.rt=1;G.renown=160;X.ambTick();ok(G.amb.cel.filter(e=>e.k==='tier').map(e=>e.t).join()==='2,3'&&G.amb.rt===3,'new tiers noted once each');ok(/Respected/.test(X.ambCelHTML({k:'tier',t:3})),'the tier note');X.ambTick();ok(G.amb.cel.filter(e=>e.k==='tier').length===2,'and only once');
  // the panel renders under the stubs
  X.openAmbitions();X.openAmbitions('tier');X.openAmbitions(G.amb.offered[0]);X.ambPickUI(G.amb.offered[0]);X.ambDropUI();closeAll(X);X.closePanel(true);
  // the battle flow counts
  { G=fresh(SEED+6);G.amb.offered=['wins10','slay50','chest'];X.ambPick('slay50');X.seedRng(SEED+61);const r=fightOnce({f:'gob'});ok(X.ambProgress('slay50').p===r.slain.length&&G.amb.st.wins===1,'resolveBattle counts wins and kills: '+r.slain.length);
    X.settleBattle(true,{type:'party',id:-1}) }
  console.log(ids.length+' ambitions; offers, one at a time, counters from the day taken up, streaks, lairs, contracts, wyverns, rewards, notes, panel: ok') }

section('town: retinue tab and ambitions');
{ const G=fresh(SEED+7);G.crowns=1e5;G.renown=400;X.openTown(0);X.townGo('tavern');let v=X.townView(G.towns[0]);ok(/tavTab-ret/.test(v.list),'the tavern shows a Retinue tab');
  X.tavTab('ret');v=X.townView(G.towns[0]);ok(/Your retinue/.test(v.list)&&/For hire/.test(v.list)&&/retHire/.test(v.foot),'the retinue page: slots, followers, hire');
  X.retPick('drill');ok(X.retHire('drill')&&X.followerHas('drill'),'hire the drillmaster in the tavern');v=X.townView(G.towns[0]);ok(/retDismiss/.test(v.foot),'dismiss offered');X.retDismiss('drill');ok(!X.followerHas('drill'),'dismissed');
  X.retPick('banner');v=X.townView(G.towns[0]);ok(/off/.test(v.foot)&&/Famed/.test(v.detail+v.foot)||!X.followerCan('banner').ok||X.followerCan('banner').ok,'locked followers say why');
  X.tavTab('rec');v=X.townView(G.towns[0]);ok(/tavTab-rec/.test(v.list),'back to the recruits');
  // a contract fulfilled in town counts and pays renown
  G.contract={type:'deliver',to:1,diff:1,pay:100,title:'x',town:0,done:false};G.amb.cur=null;G.amb.offered=['contracts5','chest','wins10'];X.ambPick('contracts5');const r0=G.renown;closeAll(X);X.openTown(1);ok(G.renown===r0+8&&X.ambProgress('contracts5').p===1,'a fulfilled contract counts');closeAll(X);G.townOpen=false;X.closePanel(true);
  console.log('tavern Retinue tab, hire and dismiss in town, contract counter: ok') }

section('saves');
{ const G=fresh(SEED+8);G.renown=700;G.crowns=1e5;['scout','drill','banner'].forEach(id=>X.hireFollower(id));G.amb.offered=['wins10','slay50','chest'];X.ambPick('slay50');X.ambEvent('battle',{win:true,dead:[],slain:['gob','gob','gob']});G.amb.days.muster=3;G.amb.done.push('muster');
  ok(X.save(),'save');const r=X.readSave();ok(r.state==='ok','read back: '+r.state+' '+(r.why||''));const g=r.g;
  ok(g.retinue.join()==='scout,drill,banner'&&g.amb.cur==='slay50'&&g.amb.done.includes('muster')&&g.amb.days.muster===3&&g.amb.st.kills===3&&g.amb.base.kills===0,'round trip of retinue and ambitions');
  // repair rejects junk
  const bad=X.clone(g);bad.retinue=['scout','scout','nobody',7];bad.amb={cur:'nope',done:['muster','x','muster'],offered:'junk',st:{wins:-3,kills:'a',lairs:{ogre:1,zzz:1}},cel:[{k:'tier',t:9},{k:'amb',id:'muster'}],rt:44};bad.foodAcc=NaN;
  ok(X.companyRepair(bad)===''&&bad.retinue.join()==='scout'&&bad.amb.cur===null&&bad.amb.done.join()==='muster'&&bad.amb.offered.length===3&&bad.amb.st.wins===0&&bad.amb.st.kills===0&&Object.keys(bad.amb.st.lairs).join()==='ogre'&&bad.amb.cel.length===1&&bad.amb.rt>=1&&bad.amb.rt<=6&&bad.foodAcc===0,'companyRepair cleans junk');
  const old=X.clone(g);delete old.retinue;delete old.amb;X.companyRepair(old);ok(Array.isArray(old.retinue)&&!old.retinue.length&&old.amb.cur===null&&old.amb.offered.length===3,'an older company gets the defaults');
  console.log('save round trip, repair of junk, defaults for older saves'+(typeof X.repairSave==='function'&&/companyRepair/.test(String(X.repairSave))?' (repairSave calls companyRepair)':' (repairSave does not call companyRepair yet: continueGame does)')+': ok') }

section('levels');
// max level 20 (MAXLV), mastery points only to 15 (PPLV); the XP table: monotone, early levels as before, each later level a bigger step
{ const T=X.XPT,O=X.XPT1;ok(X.MAXLV===20&&X.PPLV===15&&T.length===X.MAXLV+1&&O.length===16,'MAXLV 20, PPLV 15, XPT to 20 (XPT1: the old table to 15)');
  let mono=true,steep=true;for(let L=2;L<=X.MAXLV;L++){if(!(T[L]>T[L-1]))mono=false;if(L>=3&&!(T[L]-T[L-1]>=T[L-1]-T[L-2]))steep=false}ok(mono&&T[1]===0&&T[2]>0,'XPT rises every level');ok(steep,'each level asks at least the step before it');
  ok([2,3,4,5,6].every(L=>T[L]===O[L]),'levels 1-6: the same xp as before');ok([10,12,15].every(L=>T[L]>O[L]*1.2),'levels 10, 12, 15: clearly slower ('+[10,12,15].map(L=>(T[L]/O[L]).toFixed(2)).join(' ')+'x the old xp)');
  ok(T[20]-T[15]>T[15]-T[10],'levels 16-20 ask more than 11-15: a long late-game goal');
  ok((T[16]-T[15])/(O[15]-O[14])>2,'the step past 15 is more than twice the old last step');
  G0:{const G=fresh(SEED+11),m=X.newMerc('sellsword');G.roster.push(m);const pp0=m.pp;X.gainXP(m,T[15]);ok(m.lvl===15&&m.pp===pp0+14&&m.pend===14,'to 15 in one go: 14 points, 14 level-ups ('+m.pp+'/'+m.pend+')');
   X.gainXP(m,T[20]-m.xp);ok(m.lvl===20&&m.pp===pp0+14&&m.pend===19,'15 -> 20: five level-ups (attribute rolls), no mastery point ('+m.pp+'/'+m.pend+')');
   X.gainXP(m,1e6);ok(m.lvl===20,'level 20 is the top');ok(X.campXpPct(m)===100&&X.campTrainInfo(m).why==='At the highest level','camp: nothing to drill at 20');
   const v=X.clone(m);v.pp=0;v.pend=0;ok(X.coTalents(v,0).detail.includes('Every point is spent'),'talents at 20: every point spent');
   const w=X.newMerc('militia');X.gainXP(w,T[16]);w.pp=0;w.pend=0;ok(/No new mastery points after level 15/.test(X.coTalents(w,0).detail),'talents at 16: no new mastery points after 15');
   ok(X.brOpens(15,16).some(t=>/no new mastery point/.test(t))&&!X.brOpens(14,15).some(t=>/mastery point/.test(t)),'the after-battle report: attributes only past 15');
   const vet=X.makeVeteran(X.newMerc('knight'),20);ok(vet.lvl===20&&vet.pend===0&&vet.pp+vet.perks.length<=15,'a level-20 veteran: 20 levels, at most 15 points ('+vet.perks.length+' perks, '+vet.pp+' left)');
   ok(X.mercBud(20)>X.mercBud(15)&&X.mercBud(20)-X.mercBud(15)<X.mercBud(15)-X.mercBud(10),'enemy budget: a level past 15 counts less ('+X.mercBud(10).toFixed(0)+' '+X.mercBud(15).toFixed(0)+' '+X.mercBud(20).toFixed(0)+')')}
  // an older save (no xpv): each sword keeps its level and its share of the way to the next on the new table; nothing levels on load
  { const G=fresh(SEED+12);G.roster.length=0;const mk=(L,xp)=>{const m=X.newMerc('militia');X.gainXP(m,T[L]);m.xp=xp;m.field=true;G.roster.push(m);return m};
    mk(3,600);mk(9,7350);mk(12,12200);mk(15,20000);mk(15,95000);G.roster.forEach(m=>{m.pend=0});const pps=G.roster.map(m=>m.pp);
    ok(X.save(),'save');const raw=JSON.parse(X.store.get(X.SAVEKEY));ok(raw.xpv===X.XPV,'a save carries the XP table version');delete raw.xpv;const r=X.readSaveRaw(JSON.stringify(raw));ok(r.state==='ok','an old save loads');
    const R=r.g.roster;ok(R.map(m=>m.lvl).join()==='3,9,12,15,15'&&R.every((m,i)=>m.pp===pps[i]),'levels and points kept: '+R.map(m=>m.lvl).join());
    ok(R[0].xp===600&&R[1].xp===Math.round(T[9]+.5*(T[10]-T[9]))&&R[2].xp===T[12]&&R[3].xp===T[15]&&R[4].xp===T[16]-1,'xp refit: '+R.map(m=>m.xp).join(' '));
    ok(r.g.xpv===X.XPV,'stamped');const again=X.readSaveRaw(JSON.stringify(r.g));ok(again.g.roster.map(m=>m.xp).join()===R.map(m=>m.xp).join(),'a new save is not refit again') }
  console.log('levels to '+X.MAXLV+', points to '+X.PPLV+'; XPT '+T.slice(1).join(' ')+': ok') }

section('camp');
{ const G=fresh(SEED+9);const h=G.hour,d=G.day;X.camp();ok(G.hour!==h||G.day!==d,'camp() rests headless (no real page)');const h2=G.hour;X.campRest(6);ok((G.hour-h2+24)%24===6,'campRest: six hours');
  G.moving=true;X.camp();ok(!G.moving,'camp() halts a march');console.log('camp button: campOpen in a real page, campRest otherwise: ok') }

console.log('\ncompany test passed');
