// Gun backgrounds test:  node test/gunbg.js [html] [--seed N] [--no-browser]
// The six gun backgrounds (10-data.js: arquebusier, gunner, pistoleer, sapper, fowler, musketeer; BG.core pins their Gunnery tree in
// rollTrees, 61-talents.js), the old ones that carry a gun now and then (hunter, sailor, noble), the brigand gunner (11u-guns.js), rival gunners:
//  - every gun background is valid (the shape headless.js checks: rarity, wage, town, pool, weapon and armor trees, looks, traits) and every
//    recruit of it starts with a gun in hand and the Gunnery tree; the other backgrounds never get Gunnery forced;
//  - tavern draws (recruitBG + newMerc): gun carriers are 8-13% of hires in towns and cities, fewer in villages, and bows still outnumber
//    them in villages; rival companies field some gunners; the brigand gunner is in the brigands' bands with art, foe perks and a coat;
//  - a save with gunners round-trips; an old save (no new ids) loads;
//  - in the browser (a built html, default dist/index.html): every gun background renders at Detail High (the composed figure) and Low,
//    idle and aiming, with no page errors; their portraits draw; the brigand gunner renders.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261120,SRC=path.join(__dirname,'..','src');
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
const GUNBG=['arquebusier','gunner','pistoleer','sapper','fowler','musketeer'],isGun=id=>!!(X.ITEMS[id]&&X.ITEMS[id].wt==='flintlock');
(async()=>{
section('the gun backgrounds');
{ fresh(SEED);const BG=X.BG,M=X.MAST;
  for(const k of GUNBG){const b=BG[k];ok(b&&b.n&&b.d&&b.cost>0&&b.wage>0&&b.w>0&&b.w<=5&&!b.noHire,k+': n d cost wage rarity');
   ok(b.core==='gunner'&&b.pool.includes('gunner')&&b.style==='ranged'&&b.wt.includes('flintlock')&&b.wt.length>=3&&b.wt.length<=5&&b.at.length>=1&&b.at.length<=2,k+': Gunnery core, ranged, flintlock family');
   ok([1,2,3].includes(b.town||1)&&b.look&&['hat','cloth','accent','trim'].every(q=>typeof b.look[q]==='string')&&X.PT_HATOK.test(b.look.hat)&&b.tr,k+': town, looks (a hat the portraits draw), traits');
   const gw=b.gear[0].split('|');ok(gw.every(isGun),k+': its main weapon is always a gun: '+b.gear[0]);
   ok(b.gear.concat(b.side||[]).every(gs=>gs.split('|').every(id=>id==='-'||(X.ITEMS[id]&&!X.ITEMS[id].uniq&&(X.ITEMS[id].k!=='w'||b.wt.includes(X.ITEMS[id].wt))))),k+': kit from existing items, inside its weapon trees');
   for(const id of gw)ok((X.ITEMS[id].tier||1)<=({1:2,2:3,3:3}[b.town||1]),k+': '+id+' is tier '+X.ITEMS[id].tier+', too good for a town '+(b.town||1)+' recruit');
   for(let i=0;i<40;i++){const m=X.newMerc(k);ok(isGun(m.eq.w)&&m.trees.includes('gunner')&&m.trees.filter(t=>M[t]&&(M[t].kind==='style'||t==='hunter')).length===4&&X.calc(m).hp>=5,k+': a recruit with a gun and Gunnery: '+m.eq.w+' '+m.trees);
    ok(X.wageOf(m)>0&&X.recruitCost(m)>0,k+': wage and price')}}
  // wages and prices sit with their peers
  const W=k=>BG[k].wage;ok(W('sapper')<=W('miner')&&W('fowler')===W('poacher')&&W('arquebusier')>=W('watchman')&&W('arquebusier')<=W('caravan')&&W('musketeer')>=W('veteran')&&W('pistoleer')<W('noble'),'wages in line with similar backgrounds');
  ok(new Set(Object.keys(BG).map(k=>BG[k].pool.slice().sort().join())).size===Object.keys(BG).length,'pools stay unique');
  // the old ones: firearms as an option, a gun now and then; Gunnery never forced on anyone else
  for(const k of ['hunter','sailor','noble','thief','witchhunter','spellblade'])ok(BG[k].wt.includes('flintlock'),k+' may learn firearms');
  for(const k in BG)if(!GUNBG.includes(k))ok(!BG[k].core,k+': no core tree');
  const n={hunter:0,sailor:0};for(let i=0;i<400;i++)for(const k in n){const m=X.newMerc(k);if(isGun(m.eq.w)||isGun(m.eq.b))n[k]++}
  ok(n.hunter>15&&n.hunter<90&&n.sailor>15&&n.sailor<90,'hunters and sailors carry a gun now and then (of 400): '+JSON.stringify(n));
  const t0={hunter:0};for(let i=0;i<200;i++){const m=X.newMerc('hunter');if(!isGun(m.eq.w))t0.hunter+=X.ITEMS[m.eq.w].wt==='bow'||X.ITEMS[m.eq.w].wt==='crossbow'?1:0}ok(t0.hunter>140,'a hunter is still mostly an archer');
  console.log('6 backgrounds, kits, Gunnery, wages; hunters '+n.hunter+'/400 and sailors '+n.sailor+'/400 with a gun: ok') }
section('tavern rates');
{ const G=fresh(SEED+1),R={};
  for(const tier of [1,3]){G.renown=X.RENOWN[tier-1].min;for(const t of G.towns){X.seedRng(SEED+G.towns.indexOf(t)*13+tier);const r=R[t.size]=R[t.size]||{n:0,gun:0,bow:0};
    for(let i=0;i<500;i++){const m=X.newMerc(X.recruitBG(t)),ws=[m.eq.w,m.eq.b,m.eq.s].map(id=>X.ITEMS[id]&&X.ITEMS[id].wt);r.n++;if(ws.includes('flintlock'))r.gun++;if(ws.includes('bow')||ws.includes('crossbow'))r.bow++}}}
  const p=s=>R[s]?R[s].gun/R[s].n:null,line=[1,2,3].filter(s=>R[s]).map(s=>'size '+s+' '+(100*p(s)).toFixed(1)+'%').join(', ');
  for(const s of [2,3])if(R[s])ok(p(s)>=.08&&p(s)<=.13,'gun carriers in towns and cities 8-13%: '+line);
  if(R[1])ok(p(1)<Math.min(p(2)||1,p(3)||1)&&p(1)>=.03&&R[1].bow>R[1].gun,'fewer in villages, where bows still rule: '+line);
  console.log('gun carriers among tavern hires: '+line) }
section('rivals and brigands');
{ let n=0,g=0,co=0,cg=0;for(let s=0;s<8;s++){const G=fresh(SEED+100+s);for(const r of G.rivals||[]){co++;let any=0;for(const m of r.roster){n++;if(isGun(m.eq.w)||isGun(m.eq.b)){g++;any=1}}cg+=any}}
  ok(co>0&&g/n>=.04&&g/n<=.2&&cg>=co/5,`rival companies field gunners: ${g} of ${n} swords, ${cg} of ${co} companies`);
  for(const k of ['arquebusier','musketeer','gunner'])ok(X.RVBG[k]>0,'rivals hire '+k);
  const E=X.EN.bgun;ok(E&&E.w==='handgonne'&&isGun(E.w)&&E.side&&X.FACT.bandit.units.some(x=>x[0]==='bgun')&&X.FOEMAST.bgun&&X.COAT_EN.bgun,'the brigand gunner: a hand cannon, a falchion, in the bands, foe perks, a coat');
  const G=fresh(SEED+2);G.day=12;X.seedRng(SEED+3);const b=X.startBattle({f:'bandit',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:10,foes:['bgun','thug']});ok(b,'a battle with a brigand gunner');
  const u=b.units.find(x=>x.eid==='bgun');ok(u&&u.back&&u.wpn.wt==='flintlock'&&u.wpn.reload&&u.wpnAlt&&u.wpnAlt.wt==='sword','he stands back with a gun that reloads, a falchion for close work');
  let seen=0;for(let i=0;i<200;i++){X.seedRng(SEED+500+i);const pv=X.battlePreview({f:'bandit',mult:1.6,biome:'plains',src:{type:'sim'}});if(pv&&pv.foes.includes('bgun'))seen++}ok(seen>5,'brigand bands bring a gunner now and then: '+seen+'/200');
  console.log(`rivals: ${g}/${n} swords with a gun, ${cg}/${co} companies; brigand gunner in ${seen}/200 bands: ok`) }
section('saves');
{ const G=fresh(SEED+4);G.roster=G.roster.slice(0,2);for(const k of GUNBG){const m=X.newMerc(k);m.field=true;G.roster.push(m)}X.mode='world';ok(X.save(),'save a company of gunners');
  const r=X.readSave();ok(r.state==='ok'&&GUNBG.every(k=>r.g.roster.some(m=>m.bg===k&&isGun(m.eq.w)&&m.trees.includes('gunner'))),'gunners come back with their guns and trees: '+r.state);
  const old=X.clone(G);old.roster=old.roster.filter(m=>!GUNBG.includes(m.bg));const r2=X.readSaveRaw(JSON.stringify(old));ok(r2.state==='ok','a save without them loads') }
if(ARGV.includes('--no-browser')){console.log('\nOK (no browser)');return}
section('art (browser)');
{ const {chromium}=require('playwright'),f=path.resolve(ARGV.filter((a,i)=>!a.startsWith('--')&&!/^\d+$/.test(a)&&!['--ref','--seed'].includes(ARGV[i-1]))[0]||'dist/index.html'),REF=ARGV.includes('--ref')?path.resolve(ARGV[ARGV.indexOf('--ref')+1]):null;ok(fs.existsSync(f),'no built html at '+f+' (node build.js dist/index.html)');
  const br=await chromium.launch(),p=await br.newPage({viewport:{width:667,height:375}}),errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
  await p.goto('file://'+f);await p.waitForTimeout(300);await p.evaluate(()=>{newGame();closeSheet();humImg()});await p.waitForFunction(()=>typeof humReady==='function'&&humReady()&&typeof p2On==='function'&&p2On(),null,{timeout:30000});
  const R=await p.evaluate(GB=>{const bad=[],ink=c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n};seedRng(77);let n=0;
   for(const bg of GB)for(let i=0;i<6;i++){const m=newMerc(bg);m.race=['human','dwarf','elf','halforc','human','human'][i];const u=mkPlayerUnit(m);
    for(const det of['high','low']){SET.detail=det;artChanged();for(const [st,fr] of[['idle',0],['attack',1],['reload',1]])for(const fc of[0,1]){const o=unitSpritePx(u,fc,st,fr);n++;
      if(!o||!o.cv||ink(o.cv)<60)bad.push(bg+' '+det+' '+st+' face '+fc+': blank');else if(det==='high'&&!o.hum)bad.push(bg+' at High is not the composed figure')}}
    SET.detail='low';artChanged();const pc=portraitCanvas(m);if(!pc||ink(pc)<200)bad.push(bg+': no portrait');SET.detail='high';artChanged();if(!portraitURL(m))bad.push(bg+': no High portrait')}
   // the brigand gunner
   for(const det of['high','low']){SET.detail=det;artChanged();const u=mkEnemy('bgun','bandit');for(const st of['idle','attack']){const o=unitSpritePx(u,0,st,st==='attack'?1:0);n++;if(!o||!o.cv||ink(o.cv)<60)bad.push('bgun '+det+' '+st+': blank')}}
   SET.detail='high';artChanged();const pe=portraitCanvas({eid:'bgun',def:EN.bgun,side:1,f:'bandit'});if(!pe||ink(pe)<200)bad.push('bgun: no portrait');return{bad,n}},GUNBG);
  // ---- how guns are held at Detail High (73m-skel.js: lgun / pgun poses, hskMuzzleL, humGunMuzzle; 75-fx.js fxMuzzleAt) ----
  const H=await p.evaluate(()=>{const bad=[],k=humK(),base=G.roster[0];let n=0,id=0;const LONG=['handgonne','arquebus','caliver','musket','carbine','blunder','jezail','longrifle','wallgun'],PIST=['pistol','duelpistol','dragon','twinpistol'];
   const mk=(w,b,s,race)=>{const m=JSON.parse(JSON.stringify(base));m.id=86000+(++id);m.name='Gn'+id;m.race=race||'human';m.bg='arquebusier';m.colors=null;m.eq={w,b:b||null,s:s||null,a:'padded',h:'cap',c:null};return mkPlayerUnit(m)};
   const T=[['idle',0],['attack',.3],['attack',.38],['reload',.2],['reload',.6],['walk',.25],['hit',.22]];
   for(const w of LONG.concat(PIST))for(const race of['human','dwarf']){const u=mk(w,'shortsword',null,race),L=usLook(u),long=LONG.includes(w);
    for(let fc=0;fc<4;fc++)for(const [st,t] of T){const Fr=humSkFrame(L,fc,st,t,k,'');n++;const W=Fr.wpn,tag=w+' '+race+' face '+fc+' '+st+' '+t;
     if(!W||W.fam!==(long?'musket':'pistol')){bad.push(tag+': the hand weapon is a '+(W&&W.fam)+', not the gun');continue}
     const sl=Fr.list.filter(x=>x.tag==='weapon');if(sl.length!==1){bad.push(tag+': '+sl.length+' weapons in the hand');continue}
     // the muzzle: the drawn weapon's matrix at the muzzle point of its own frame lands on Fr.wpn.mz (the point the shot starts from)
     const wi=humWIc(L.S.wd,L.S.wdI),mzL=hskMuzzleL(wi),ps=long?1:HSK_PSC,m=sl[0].m,X=mzL.x*ps,Y=mzL.y*ps,mx=m[0]*X+m[2]*Y+m[4],my=m[1]*X+m[3]*Y+m[5];
     if(!W.mz||Math.hypot(mx-W.mz[0],my-W.mz[1])>3)bad.push(tag+': muzzle '+[mx,my].map(Math.round)+' vs '+(W.mz||[]).map(Math.round));
     const dx=W.mz[0]-W.hw[0],dy=W.mz[1]-W.hw[1],len=Math.hypot(dx,dy),ox=W.ho[0]-W.hw[0],oy=W.ho[1]-W.hw[1],along=(ox*dx+oy*dy)/len,off=Math.abs(ox*dy-oy*dx)/len;
     if(long&&(st==='idle'||st==='attack'||st==='walk'||st==='hit')&&!(W.grip&&off<=14&&along>=30&&along<=len+10))bad.push(tag+': the off hand is not on the gun (along '+Math.round(along)+' of '+Math.round(len)+', off '+Math.round(off)+')');
     const wa=Math.atan2(dy,Math.abs(dx))*180/Math.PI;
     if(st==='attack'&&t===.3&&Math.abs(wa)>12)bad.push(tag+': aimed '+Math.round(wa)+' deg off level');
     if(long&&st==='idle'&&!(wa<-15&&wa>-60))bad.push(tag+': port arms at '+Math.round(wa)+' deg');
     if(st==='reload'&&!(wa<-15))bad.push(tag+': reloading with the muzzle '+Math.round(wa)+' deg');
     if(st==='reload'&&!Fr.list.some(x=>x.tag==='rod'))bad.push(tag+': no ramrod');
     if(!long&&st==='attack'&&t===.3){const sh=Math.hypot(W.hw[0]-W.mz[0],W.hw[1]-W.mz[1]);const a=sl[0].a;if(!(a.w>=110))bad.push(tag+': the pistol is drawn '+Math.round(a.w)+' SU long')}}
    // the muzzle the effects use: humGunMuzzle (art px from the feet) is Fr.wpn.mz scaled, mirrored on faces 1 and 3
    for(let fc=0;fc<4;fc++){const M=humGunMuzzle(u,fc),Fr=humSkFrame(L,fc,'attack',.38,k,''),s=HUM_A*Fr.sc;if(!M||Math.abs(M.x-(Fr.mir?-1:1)*Fr.wpn.mz[0]*s)>.01||Math.abs(M.y-Fr.wpn.mz[1]*s)>.01)bad.push(w+' face '+fc+': humGunMuzzle')}}
   // twin pistols, one in each hand (dual wield): the second drawn in the off hand, as big
   {const u=mk('pistol',null,'pistol'),L=usLook(u);if(L.S.ow){const Fr=humSkFrame(L,0,'attack',.3,k,''),o=Fr.list.find(x=>x.tag==='offweapon');if(!o||!(o.a.w>=110))bad.push('a pistol in the off hand: '+(o?Math.round(o.a.w):'missing'))}}
   // crossbows keep their own pose (the off hand on the stock, the reload crank)
   {const u=mk('crossbow'),L=usLook(u),Fr=humSkFrame(L,0,'reload',.2,k,'');if(Fr.anim!=='reloadX'||Fr.wpn.fam!=='xbow')bad.push('crossbow reload: '+Fr.anim);if(humSkFrame(L,0,'attack',.3,k,'').anim!=='gun')bad.push('crossbow attack pose changed')}
   // the effects: a gunner's shot starts at the drawn muzzle (board px = feet + 2 x art px)
   {SET.detail='high';artChanged();const m=JSON.parse(JSON.stringify(base));m.id=86900;m.eq={w:'musket',b:null,s:null,a:'padded',h:null,c:null};const u=mkPlayerUnit(m);u.c=3;u.r=3;const t={c:3,r:0};const M=fxMuzzleAt(u,t),p0=fxFoot(u),hm=humGunMuzzle(u,fxSDir(0,-3));
    if(!M||!hm||Math.abs(M.x-(p0.x+2*hm.x))>.01||Math.abs(M.y-(p0.y+2*hm.y))>.01)bad.push('fxMuzzleAt '+JSON.stringify(M));if(M&&(M.y>p0.y-12||M.y<p0.y-60))bad.push('the shot starts '+Math.round(p0.y-M.y)+' px above the feet')}
   return{bad,n}});
  ok(!H.bad.length,'guns in hand: '+H.bad.slice(0,8).join('; ')+(H.bad.length>8?' ... '+H.bad.length:''));console.log(H.n+' gun frames (13 guns, 2 races, 4 facings, idle / aim / shot / reload / walk / hit): the gun in hand, both hands on long guns, levelled aim, ramrod, muzzle = the shot\'s start, pistols '+Math.round(1.3*100)+'%: ok');
  // ---- with --ref (a build of main): non-gun figures at High and every figure at Low unchanged ----
  if(REF){const DG=()=>{const base=G.roster[0],out={},k=humK();let id=0;const dg=o=>{if(!o||!o.cv)return'none';const d=o.cv.getContext('2d').getImageData(0,0,o.cv.width,o.cv.height).data;let h=2166136261;for(let i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619)}return o.cv.width+'x'+o.cv.height+':'+(h>>>0)};
     const mk=(w,s,race)=>{const m=JSON.parse(JSON.stringify(base));m.id=87000+(++id);m.name='Rf'+id;m.race=race;m.bg='sellsword';m.colors=null;m.gift=null;m.mast={};m.perks=[];m.traits=[];m.lvl=1;m.kills=0;delete m.pseed;delete m.fabled;m.eq={w,b:null,s:s||null,a:'leather',h:null,c:null};return mkPlayerUnit(m)};
     const NG=[['arming','heater2'],['greataxe'],['spear'],['shortbow'],['crossbow'],['knife'],['staff'],['warhammer'],['halberd']],GN=['musket','arquebus','pistol','handgonne'],U=[],UG=[];
     for(const race of['human','elf','dwarf','halforc']){for(const [w,s] of NG)U.push(mk(w,s,race));for(const w of GN)UG.push(mk(w,null,race))}
     SET.detail='high';artChanged();for(const u of U)for(let fc=0;fc<4;fc++)for(const [st,fr] of[['idle',0],['attack',1],['reload',1],['walk',1]])out['hi '+u.m.id+' '+fc+' '+st]=dg(unitSpritePx(u,fc,st,fr));
     SET.detail='low';artChanged();for(const u of U.concat(UG))for(let fc=0;fc<4;fc++)for(const [st,fr] of[['idle',0],['attack',1],['reload',1]])out['lo '+u.m.id+' '+fc+' '+st]=dg(unitSpritePx(u,fc,st,fr));SET.detail='high';artChanged();return out};
   const p2=await br.newPage({viewport:{width:667,height:375}});await p2.goto('file://'+REF);await p2.waitForTimeout(300);await p2.evaluate(()=>{newGame();closeSheet();humImg()});await p2.waitForFunction(()=>typeof humReady==='function'&&humReady()&&typeof p2On==='function'&&p2On(),null,{timeout:30000});
   const fix=async q=>q.evaluate(()=>{seedRng(12345);newGame();closeSheet()});await fix(p);await fix(p2);
   const a=await p.evaluate(DG),b=await p2.evaluate(DG),diff=Object.keys(b).filter(x=>a[x]!==b[x]);
   ok(!diff.length,'changed against the ref build: '+diff.slice(0,6).join(', '));console.log(Object.keys(b).length+' sprites (other weapons at High in 4 races, every figure at Low incl. guns) identical to '+path.basename(REF)+': ok')}
  await br.close();ok(!R.bad.length,'art: '+R.bad.slice(0,6).join('; '));ok(!errs.length,'page errors: '+errs.slice(0,3).join(' | '));console.log(R.n+' sprites at High and Low, portraits: ok') }
console.log('\nOK');process.exit(0)})().catch(e=>fail(e&&e.stack||e));
