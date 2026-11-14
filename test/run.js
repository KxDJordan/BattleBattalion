// Run systems test (22-run.js, 23-tutorial.js, the v13 save). Plain node, no browser:  node test/run.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the vm approach and DOM stubs of test/events.js) and checks:
// difficulty values and where they apply (contract pay, the crisis day, diffK fallbacks); ironman (the fight marker, no reload, the
// retire / wipe end); the three save slots (save, load, switch, delete); export / import round trips and the rejection of bad codes;
// the hall of the fallen (a death in battle, persistence in localStorage across contexts, one entry a sword); the run record and
// summary; the tutorial's steps (progress through a real battle and town, skip, remembered); the v12 -> v13 migration.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261117,SRC=path.join(__dirname,'..','src');
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
const X=makeContext(),SHEETS=[];{const s0=X.sheet;X.sheet=function(h,c){SHEETS.push(String(h));return s0(h,c)}}
const fresh=(s,o)=>{X.seedRng(s);X.newGame(true,o||undefined);closeAll(X);return X.G};
const killAll=()=>{for(const u of X.B.units)if(u.side===1){u.hp=0;u.alive=false}};

section('difficulty');
{ ok(['story','normal','hard','brutal'].every(k=>X.DIFF[k]&&['budget','pay','injury','death','crisisDay'].every(f=>Number.isFinite(X.DIFF[k][f])&&X.DIFF[k][f]>0)),'DIFF has every key for every level');
  ok(['budget','pay','injury','death','crisisDay'].every(f=>X.DIFF.normal[f]===1),'normal is all ones');
  ok(X.DIFF.story.budget<1&&X.DIFF.story.pay>1&&X.DIFF.story.death<1&&X.DIFF.brutal.budget>X.DIFF.hard.budget&&X.DIFF.brutal.death>X.DIFF.hard.death&&X.DIFF.brutal.pay<X.DIFF.hard.pay,'the levels are ordered');
  X.G=null;ok(X.diffK('pay')===1&&X.diffK('nope')===1,'no company: factor 1');
  for(const k of ['story','normal','hard','brutal']){const G=fresh(SEED+1,{diff:k});ok(G.diff===k&&X.diffK('pay')===X.DIFF[k].pay&&X.diffK('budget')===X.DIFF[k].budget,k+': G.diff and diffK');
   ok(G.crisisDay===Math.max(6,Math.round(18*X.DIFF[k].crisisDay)),k+': the crisis day is scaled ('+G.crisisDay+')')}
  const G=fresh(SEED+2,{diff:'nonsense'});ok(G.diff==='normal','an unknown level is normal');
  // the same notice under two levels: the pay follows DIFF.pay
  const pays={};for(const k of ['normal','story','brutal']){const G=fresh(SEED+3);G.diff=k;X.seedRng(SEED+33);const c=X.genContract2(G.towns[0],0);pays[k]=c.pay}
  ok(Math.abs(pays.story-pays.normal*1.25)<=10&&Math.abs(pays.brutal-pays.normal*.8)<=10,'contract pay scales with the level '+JSON.stringify(pays));
  console.log('levels, diffK, crisis day, contract pay: ok') }

section('save slots');
{ X.store.clear();X.slotUse(0);ok(X.SLOT===0&&X.slotKey(0)===X.SAVEKEY&&X.slotKey(2)===X.SAVEKEY+'_s2','slot keys (slot 0 is the old key)');
  const A=fresh(SEED+10,{name:'Alpha Company',slot:0});ok(X.save(),'save slot 0');
  const Bc=fresh(SEED+11,{name:'Bravo Company',slot:2});ok(X.SLOT===2&&X.save(),'save slot 2');ok(X.store.has(X.SAVEKEY+'_s2')&&JSON.parse(X.store.get(X.SAVEKEY)).name==='Alpha Company','slot 2 written, slot 0 untouched');
  const L=X.saveSlots();ok(L.length===3&&L[0].state==='ok'&&L[0].name==='Alpha Company'&&L[1].state==='none'&&L[2].state==='ok'&&L[2].name==='Bravo Company'&&L[2].cur,'saveSlots lists the books');
  ok(X.slotFree()===1,'the free book');X.slotUse(0);X.G=null;X.mode='title';X.continueGame();ok(X.mode==='world'&&X.G.name==='Alpha Company','switch to slot 0 and load');closeAll(X);
  ok(X.store.get('wyrdmarch_slot_v1')==='0','the slot is remembered');X.slotUse(2);X.G=null;X.continueGame();ok(X.G.name==='Bravo Company','switch back');closeAll(X);
  X.clearSave(2);ok(X.saveStatus(2).state==='none'&&X.saveStatus(0).state==='ok','delete one book');
  // a new company with the current book full goes to a free one
  X.slotUse(0);X.mode='title';X.G=null;X.newCompanySetup();ok(X.NCS.slot===1&&X.SLOT===1,'new company into the free book ('+X.NCS.slot+')');closeAll(X);
  console.log('three books: save, load, switch, delete, the free book: ok') }

section('export / import');
{ X.store.clear();X.slotUse(0);const G=fresh(SEED+20,{name:'Export Lances'});G.crowns=4321;ok(X.save(),'save');
  const code=X.exportSave(0);ok(/^WYRD1\.[0-9a-f]{8}\./.test(code)&&code.length>100,'a code');ok(X.exportSave(1)==='','an empty book exports nothing');
  let r=X.importSave(code,1);ok(r.ok&&r.slot===1&&r.name==='Export Lances','import into book 1: '+JSON.stringify(r));
  ok(X.store.get(X.SAVEKEY+'_s1')===X.store.get(X.SAVEKEY),'byte-identical round trip');const g1=X.readSave(1).g;ok(g1.crowns===4321&&g1.roster.length===G.roster.length,'the imported book reads back');
  ok(X.importSave('  \n'+code.slice(0,40)+'\n'+code.slice(40)+'  ',2).ok,'whitespace and line breaks are ignored');
  const bad=[['',/empty/],['hello there',/not a Wyrdmarch/],['WYRD1.00000000.'+code.split('.')[2],/check/],[code.slice(0,code.length-37),/damaged|cut short|check/],
   [code.slice(0,20)+(code[20]==='A'?'B':'A')+code.slice(21),/check|damaged/],['WYRD1.zzzzzzzz.abcd',/not a Wyrdmarch/]];
  for(const [s,re] of bad){X.store.delete(X.SAVEKEY+'_s2');const r=X.importSave(s,2);ok(!r.ok&&re.test(r.why)&&!X.store.has(X.SAVEKEY+'_s2'),'a bad code is refused and nothing is written: '+JSON.stringify(s.slice(0,30))+' -> '+r.why)}
  const raw=JSON.parse(X.store.get(X.SAVEKEY));
  {const n=Object.assign({},raw,{v:X.SAVEVER+3});const s=JSON.stringify(n),c='WYRD1.'+X.runHash(s)+'.'+X.b64enc(unescape(encodeURIComponent(s)));r=X.importSave(c,2);ok(!r.ok&&/newer/.test(r.why),'a newer save is refused')}
  {const n=Object.assign({},raw,{roster:[]});r=X.importSave(JSON.stringify(n),2);ok(!r.ok&&/nobody/.test(r.why),'an empty company is refused')}
  {const n=Object.assign({},raw);delete n.seed;r=X.importSave(JSON.stringify(n),2);ok(!r.ok&&/cannot be read/.test(r.why),'a broken save is refused')}
  r=X.importSave(JSON.stringify(raw),2);ok(r.ok&&X.readSave(2).state==='ok','a plain JSON save is accepted');
  {const s=JSON.stringify(Object.assign({},raw,{name:'Ünïcødé — Lances ✦'})),c='WYRD1.'+X.runHash(s)+'.'+X.b64enc(unescape(encodeURIComponent(s)));r=X.importSave(c,2);ok(r.ok&&X.readSave(2).g.name.startsWith('Ünïcødé — Lances'),'UTF-8 names survive')}
  for(const t of ['','a','ab','abc','abcd','ü✦—x'.repeat(7)]){const b=unescape(encodeURIComponent(t));ok(decodeURIComponent(escape(X.b64dec(X.b64enc(b))))===t,'base64 round trip '+JSON.stringify(t))}
  console.log('export code, import round trip, '+bad.length+' bad codes, newer / empty / broken saves refused, JSON and UTF-8: ok') }

section('hall of the fallen, run record');
{ X.store.clear();X.slotUse(0);const G=fresh(SEED+30,{name:'Doomed Spears'});const R0=JSON.stringify(G.run);ok(G.run&&G.run.battles===0&&G.run.kills===0&&G.run.fallen===0,'a fresh run record '+R0);
  // a won battle with one sword killed
  const b=X.startBattle({f:'gob',mult:1,src:{type:'sim'},quiet:true});ok(b,'battle');const me=b.units.find(u=>u.side===0&&u.m),m=me.m,foe=b.units.find(u=>u.side===1);
  m.slain=m.slain||{};X.countSlain(me,foe);me.hp=0;me.alive=false;killAll();const res=X.resolveBattle(true);X.B=null;X.mode='world';closeAll(X);
  ok(res.dead.includes(m.name),'the sword died');ok(G.run.battles===1&&G.run.won===1&&G.run.fallen===1&&G.run.kills>=1,'the run record counts the battle '+JSON.stringify(G.run));
  const H=X.hallAll();ok(H.length===1&&H[0].name===m.name&&H[0].co==='Doomed Spears'&&H[0].bg===m.bg&&H[0].lvl===m.lvl&&H[0].day===G.day&&/Fell fighting|Slain by/.test(H[0].how)&&H[0].look&&H[0].look.eq,'the hall entry: '+JSON.stringify(H[0]).slice(0,200));
  ok(H[0].kills>=1,'the fallen sword kept its kills');ok(typeof X.portraitHTML(H[0].look,48)==='string','the entry draws a portrait');
  ok(X.hallAdd(m,'again')===null&&X.hallAll().length===1,'one entry a sword');
  // persistence: a second game context reading the same localStorage
  const Y=makeContext();for(const [k,v] of X.store)Y.store.set(k,v);ok(Y.hallAll().length===1&&Y.hallAll()[0].name===m.name,'the hall survives into another session');
  // more battles, then the summary
  for(let i=0;i<2;i++){X.startBattle({f:'gob',mult:.6,src:{type:'sim'},quiet:true});killAll();X.resolveBattle(true);X.B=null;X.mode='world';closeAll(X)}
  ok(G.run.battles===3&&G.run.won===3,'three battles');G.renown=77;
  const S=X.runSummary('live');ok(S.name==='Doomed Spears'&&S.battles===3&&S.kills===G.run.kills&&S.fallen===G.run.fallen&&S.fallen>=1&&S.renown===77&&S.days>=1&&S.diff==='normal'&&!S.ironman,'the summary '+JSON.stringify(S).slice(0,240));
  ok(Array.isArray(S.best)&&S.best.length===3&&S.best.every(x=>x.name&&x.lvl>=1&&x.look)&&S.best.every((x,i)=>!i||X.runScore(S.best[i-1])>=X.runScore(x)),'the three finest, best first');
  ok(S.crisis&&typeof S.crisis.n==='string'&&typeof S.crisis.text==='string','the crisis line');ok(typeof X.runSummaryHTML(S)==='string'&&X.runSummaryHTML(S).includes('Doomed Spears'),'the summary renders');
  ok(X.save(),'save');const g=X.readSave().g;ok(g.run.battles===3&&g.run.fallen===G.run.fallen,'the run record is saved');
  X.runCrisisEnd(true);ok(G.run.crisis==='won'&&X.runSummary().crisis.out==='won','crisis victory recorded');ok(!X.runCrisisEnd(false)&&G.run.crisis==='won','once');
  // retire: the book is cleared, the chronicle keeps the run
  SHEETS.length=0;X.runRetire();ok(X.G===null&&X.mode==='title'&&X.readSave(0).state==='none','retire clears the book');ok(X.runsAll().length===1&&X.runsAll()[0].kind==='retire'&&X.runsAll()[0].name==='Doomed Spears','the chronicle keeps the run');
  ok(SHEETS.some(h=>/banner is laid down/.test(h)&&/Doomed Spears/.test(h)),'the summary sheet is shown');
  console.log('hall entry from a death, persistence, the run record, summary, crisis outcome, retire: ok') }

section('ironman');
{ X.store.clear();X.slotUse(1);const G=fresh(SEED+40,{ironman:true,diff:'hard'});ok(G.ironman&&G.diff==='hard'&&X.readSave(1).g.ironman,'an ironman company in book 1');
  SHEETS.length=0;X.menuSheet();ok(!/Save now/.test(SHEETS.join())&&/Ironman/.test(SHEETS.join())&&/Retire the company/.test(SHEETS.join()),'no Save now in the ironman menu');closeAll(X);
  ok(X.exportSave(1)!==''&&/Ironman/.test(X.slotCard(Object.assign(X.saveStatus(1),{slot:1})))&&!/Export/.test(X.slotCard(Object.assign(X.saveStatus(1),{slot:1}))),'an ironman book offers no export');
  const c0=G.crowns;X.startBattle({f:'gob',mult:1,src:{type:'party',id:-1}});ok(X.mode==='battle'&&X.readSave(1).g.ironFight,'the fight is written down before it starts');
  // the page is closed mid-battle: loading counts it as fled
  X.B=null;X.G=null;X.mode='title';SHEETS.length=0;X.continueGame();ok(X.mode==='world'&&X.G.crowns===c0-Math.floor(c0*.1)&&!X.G.ironFight&&/ledger remembers/.test(SHEETS.join()),'reloading mid-battle counts as fleeing');
  ok(!X.readSave(1).g.ironFight,'and that is written at once');closeAll(X);
  // a finished battle clears the marker
  X.startBattle({f:'gob',mult:.5,src:{type:'sim'}});killAll();X.resolveBattle(true);ok(!X.G.ironFight,'a resolved battle clears the marker');X.B=null;X.mode='world';closeAll(X);
  // death ends it: the whole company falls
  const n=X.G.roster.length;X.startBattle({f:'gob',mult:1,src:{type:'party',id:-1}});for(const u of X.B.units)if(u.side===0){u.hp=0;u.alive=false;u.down=false}const r=X.resolveBattle(false);X.B.result=r;SHEETS.length=0;const out=X.afterBattle(0);
  ok(out&&out.kind==='wiped'&&X.readSave(1).state==='none','a wiped ironman company is gone');ok(X.hallAll().length>=n,'the fallen are in the hall');ok(X.runsAll()[0].kind==='wipe'&&X.runsAll()[0].ironman,'the wipe is in the chronicle');
  ok(SHEETS.some(h=>/company is no more/.test(h)&&/Hall of the fallen/.test(h)),'the wipe summary sheet');closeAll(X);X.slotUse(0);
  console.log('ironman: the fight marker, no reload, no export, wiped and gone: ok') }

section('tutorial');
{ X.store.clear();X.slotUse(0);ok(X.tutWanted(),'offered to a new player');const G=fresh(SEED+50,{tutorial:true});const c=G.contract;
  ok(c&&c.type==='tutorial'&&G.tut&&G.tut.step==='go'&&G.tut.cid===c.id&&c.stages.length===2&&c.stages[0].fight,'the tutorial contract is in hand');
  ok(!X.CTR_KINDS.includes('tutorial'),'never on a board');ok(X.save()&&X.readSave().g.contract.type==='tutorial'&&X.readSave().g.tut.step==='go','it survives a save');
  X.tutTick();ok(G.tut.step==='go','step 1: march');
  const o=X.ctrBattle(c);o.quiet=true;X.startBattle(o);ok(X.mode==='battle','the camp fight');X.tutTick();ok(G.tut.step==='move','step 2: move');
  const me=X.B.units.find(u=>u.side===0&&u.alive);me.c=(me.c+1)%X.BW;X.tutTick();ok(G.tut.step==='forecast','step 3: the forecast');
  X.FC.t=X.B.units.find(u=>u.side===1);X.tutTick();ok(G.tut.step==='attack','step 4: strike');X.FC.t=null;
  const foe=X.B.units.find(u=>u.side===1&&u.alive);foe.hp-=5;X.tutTick();ok(G.tut.step==='end','step 5: end the turn ('+G.tut.step+')');
  X.tutTick();X.B.turns++;X.tutTick();ok(G.tut.step==='win','step 6: finish them');
  killAll();const res=X.resolveBattle(true);X.B.result=res;X.afterBattle(1);closeAll(X);ok(X.mode==='world'&&c.stage===1,'the camp is cleared');X.tutTick();ok(G.tut.step==='heal','step 7: heal in town');
  G.town=0;G.townOpen=true;X.townTab='inn';X.tutTick();ok(G.tut.step==='pay','step 8: the pay');
  const q=X.ctrTurnIn(0);ok(q&&q.ok,'turned in');SHEETS.length=0;X.tutTick();ok(G.tut.done&&X.tutDone()&&!X.tutWanted()&&/trade is learned/.test(SHEETS.join()),'finished and remembered');
  X.townTab='contracts';closeAll(X);
  // skip
  X.store.delete(X.TUTKEY);const G2=fresh(SEED+51,{tutorial:true});ok(G2.tut&&!G2.tut.done,'offered again before it was done');X.tutSkip();ok(G2.tut.done&&X.tutDone()&&G2.contract&&G2.contract.type==='tutorial','skip: hints off, remembered, the job stays');
  const G3=fresh(SEED+52);ok(!G3.tut&&G3.contract===null,'no tutorial unless asked');
  console.log('tutorial: contract, 8 steps through a real battle and town, finish, skip, remembered: ok') }

section('v12 -> v13 migration');
{ X.store.clear();X.slotUse(0);const G=fresh(SEED+60);ok(X.save(),'save');const g=JSON.parse(X.store.get(X.SAVEKEY));g.v=12;
  for(const k of ['diff','ironman','fabled','run','crisisKind','tut','east'])delete g[k];g.towns.forEach(t=>{delete t.east;delete t.eastPrev0});
  X.store.set(X.SAVEKEY,JSON.stringify(g));let r=X.readSave();ok(r.state==='ok'&&r.v===12&&r.g.v===X.SAVEVER&&X.SAVEVER===13,'a v12 save migrates to 13');
  const m=r.g;ok(m.diff==='normal'&&m.ironman===false&&m.fabled&&typeof m.fabled==='object'&&m.run&&m.run.battles>=0&&typeof m.crisisKind==='string'&&m.crisisKind,'the v13 fields '+JSON.stringify({d:m.diff,i:m.ironman,f:m.fabled,k:m.crisisKind}));
  ok(r.g.crisisKind===X.readSave().g.crisisKind,'the crisis kind is deterministic');
  if(typeof X.CRISES==='object'&&X.CRISES)ok(!!X.CRISES[m.crisisKind],'a known crisis');
  if(typeof X.eastInit==='function')ok(m.towns.some(t=>t.east),'old towns get the East');
  const g2=JSON.parse(JSON.stringify(g));g2.crisis={closed:1,total:3,ended:false};X.store.set(X.SAVEKEY,JSON.stringify(g2));r=X.readSave();ok(r.state==='ok'&&r.g.crisisKind==='sunder','a crisis under way stays the Sundering');
  const g3=JSON.parse(JSON.stringify(g));g3.v=13;g3.diff='impossible';g3.ironman='yes';g3.run={battles:-3,kills:'x',crisis:'maybe'};X.store.set(X.SAVEKEY,JSON.stringify(g3));r=X.readSave();
  ok(r.state==='ok'&&r.g.diff==='normal'&&r.g.ironman===true&&r.g.run.battles===0&&r.g.run.kills===0&&r.g.run.crisis===null,'v13 fields are repaired');
  X.G=null;X.mode='title';X.continueGame();ok(X.mode==='world'&&X.G.v===13,'the migrated company plays');closeAll(X);
  console.log('v12 -> v13: crisis kind, fabled, difficulty, ironman, run record, the East; repair of bad v13 fields: ok') }
console.log('\nrun systems: all ok');process.exit(0)
