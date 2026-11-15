// Audio test (26-audio.js). Plain node, no browser:  node test/audio.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the vm approach and DOM stubs of test/run.js) and checks:
// the engine loads and stays silent without an AudioContext (headless); the FX event map covers every FX.emit type in the source and
// every planned sound exists; the chained FX.on keeps the scene's handler first (and its errors); real battle events plan cleanly;
// settings (volumes, mute) persist across contexts and show in the settings dialog; music follows the scene (title, day, night,
// town, crisis, east, battle, boss, eastern battle, silence after a battle) and the ambience key follows biome / weather / hour;
// with a fake WebAudio context: unlock, every effect, every track's bars, crossfades, hidden / muted suspend, a tick that schedules
// nothing new between bars; and none of it ever consumes the game RNG.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261121,SRC=path.join(__dirname,'..','src');
function fail(msg){console.error('\nFAIL: '+msg);process.exit(1)}
function ok(c,msg){if(!c)fail(msg)}
process.on('uncaughtException',e=>fail('uncaught exception: '+(e&&e.stack||e)));
process.on('unhandledRejection',e=>fail('unhandled rejection: '+(e&&e.stack||e)));
const section=n=>console.log('\n== '+n+' ==');
/* ---------- DOM stubs (as in test/run.js) ---------- */
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
/* ---------- a fake WebAudio: every node and param, values checked for finiteness, nodes counted ---------- */
function fakeAudio(stats){
 const param=v=>{const chk=(x,n)=>{if(typeof x!=='number'||!isFinite(x))throw new Error('AudioParam.'+n+'('+x+')')};
  return{value:v,setValueAtTime(x,t){chk(x,'setValueAtTime');chk(t,'t')},linearRampToValueAtTime(x,t){chk(x,'linearRamp');chk(t,'t')},exponentialRampToValueAtTime(x,t){chk(x,'expRamp');chk(t,'t');if(!(x>0))throw new Error('expRamp to '+x)},
   setTargetAtTime(x,t,k){chk(x,'setTarget');chk(t,'t');chk(k,'k')},cancelScheduledValues(){}}};
 const node=kind=>{stats.nodes++;stats.kinds[kind]=(stats.kinds[kind]||0)+1;return{kind,connect(n){if(!n)throw new Error('connect to nothing');return n},disconnect(){},
  start(t){if(t!=null&&!isFinite(t))throw new Error('start('+t+')');stats.starts++},stop(t){if(t!=null&&!isFinite(t))throw new Error('stop('+t+')')},
  frequency:param(440),detune:param(0),gain:param(1),Q:param(1),pan:param(0),threshold:param(-24),knee:param(30),ratio:param(12),attack:param(.003),release:param(.25),type:'',buffer:null,loop:false}};
 function AC(){stats.ctx++;this.currentTime=0;this.sampleRate=8000;this.state='suspended';this.destination=node('dest')}
 AC.prototype.resume=function(){this.state='running';stats.resume++;return Promise.resolve()};
 AC.prototype.suspend=function(){this.state='suspended';stats.suspend++;return Promise.resolve()};
 for(const k of ['Gain','Oscillator','BufferSource','BiquadFilter','DynamicsCompressor','Convolver','StereoPanner'])AC.prototype['create'+k]=function(){return node(k)};
 AC.prototype.createBuffer=function(ch,len){const d=[];for(let i=0;i<ch;i++)d.push(new Float32Array(len));return{length:len,numberOfChannels:ch,getChannelData:i=>d[i]}};
 return AC}
function makeContext(o){o=o||{};const els=new Map(),store=o.store||new Map(),listeners={};
 const doc={getElementById(id){if(!els.has(id))els.set(id,element(id));return els.get(id)},createElement:()=>element(),createElementNS:()=>element(),createTextNode:()=>element(),createDocumentFragment:()=>element(),
  body:element('body'),documentElement:element('html'),head:element('head'),addEventListener(ev,f){(listeners[ev]=listeners[ev]||[]).push(f)},removeEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],
  hidden:false,visibilityState:'visible',fullscreenElement:null,activeElement:null,fonts:hole(),exitFullscreen(){}};
 const sb={document:doc,console:{log(){},info(){},debug(){},warn(){},error(...a){fail('console.error from game code: '+a.join(' '))}},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem(k,v){store.set(k,String(v))},removeItem(k){store.delete(k)},clear(){store.clear()}},
  setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},queueMicrotask,
  innerWidth:667,innerHeight:375,devicePixelRatio:1,addEventListener(){},removeEventListener(){},dispatchEvent:()=>true,
  matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}),
  getComputedStyle:()=>hole({getPropertyValue:()=>''}),navigator:{userAgent:'node',maxTouchPoints:0,vibrate(){}},screen:hole(),location:{href:'',reload(){}},
  performance:{now:()=>0},ResizeObserver:function(){return{observe(){},disconnect(){},unobserve(){}}},MutationObserver:function(){return{observe(){},disconnect(){}}},
  IntersectionObserver:function(){return{observe(){},disconnect(){}}},Image:function(){return element()},Audio:function(){return hole()},CSS:{supports:()=>false,escape:s=>s}};
 if(o.audio)sb.AudioContext=o.audio;
 sb.window=sb;sb.self=sb;sb.globalThis=sb;sb.top=sb;sb.parent=sb;
 const ctx=vm.createContext(sb),js=fs.readdirSync(SRC).filter(f=>f.endsWith('.js')).sort().map(f=>`/* ---- ${f} ---- */\n`+fs.readFileSync(path.join(SRC,f),'utf8')).join('\n');
 vm.runInContext("'use strict';\n"+js,ctx,{filename:'wyrdmarch-src.js'});
 const getters=new Map(),setters=new Map(),extra={ctx,store,listeners,doc};
 const X=new Proxy(extra,{get(t,k){if(k in t)return t[k];if(typeof k!=='string')return undefined;if(k in ctx)return ctx[k];
   if(!getters.has(k))getters.set(k,vm.runInContext(`(()=>typeof ${k}==='undefined'?undefined:${k})`,ctx));return getters.get(k)()},
  set(t,k,v){if(k in t){t[k]=v;return true}if(!setters.has(k))setters.set(k,vm.runInContext(`(v=>{${k}=v})`,ctx));setters.get(k)(v);return true}});
 X.SPEEDF=0;X.clone=vm.runInContext('(o=>JSON.parse(JSON.stringify(o)))',ctx);return X}
function closeAll(X){for(let i=0;i<6&&X.sheetOpen;i++)X.closeSheet(true);if(X.sheetOpen)X.sheetOpen=false;if(X.G)X.G.townOpen=false}
const fire=(X,ev)=>{for(const f of X.listeners[ev]||[])f({type:ev,target:null})};

(async()=>{
const X=makeContext(),SFX=X.AUDIO&&X.AUDIO.SFX;

section('headless: no AudioContext');
{ ok(X.AUDIO&&typeof X.AUDIO.play==='function'&&typeof X.AUDIO.music==='function'&&typeof X.AUDIO.ambience==='function','AUDIO.play / music / ambience exist');
  ok(X.AUDIO.ok===false&&X.AUDIO.live===false,'no context: not ok, not live');
  fire(X,'pointerdown');fire(X,'click');ok(X.AUDIO.unlock()===false&&X.AUDIO.ok===false,'a gesture with no AudioContext stays silent');
  ok(X.AUDIO.play('blade')===false&&X.AUDIO.play('nonsense')===false,'play is a no-op');
  X.AUDIO.music('battle');X.AUDIO.music(undefined);X.AUDIO.ambience('forest|rain|day');X.AUDIO.ambience(undefined);X.AUDIO.tick();X.AUDIO.apply();X.chromeTick();
  ok(typeof X.FX.on==='function'&&X.FX.on.auWrap===1&&X.FX.on.auPrev===X.fxEvent,'FX.on is the audio wrapper around the scene\'s fxEvent');
  console.log('loads, unlock / play / music / ambience / tick are silent no-ops, FX.on chained: ok') }

section('FX event map');
{ const src=fs.readdirSync(SRC).filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync(path.join(SRC,f),'utf8')).join('\n'),types=new Set();
  for(const m of src.matchAll(/FX\.emit\('([a-z]+)'/g))types.add(m[1]);
  // the documented ones too (60-battle-core.js header)
  for(const t of ['hit','miss','death','cast','move','kb','heal','buff','turn','loc','morale','injury','blocked','ff','spawn','withdraw','status','swap','shield','reload'])types.add(t);
  const miss=[...types].filter(t=>typeof X.AUDIO.MAP[t]!=='function');ok(!miss.length,'FX events without a sound mapping: '+miss.join(', '));
  // plausible data for each: every planned name is a real effect, delays are finite
  const u={side:0,wpn:{wt:'sword',rng:1},sx:0,sy:0},v={side:1,wpn:{wt:'bow',rng:6},sx:40,sy:0,hpMax:40},beast={side:1,def:{quad:1},wpn:{wt:'sword',rng:1}};
  const D={hit:[{u,t:v,dmg:12,armor:6,head:true},{u:v,t:u,dmg:0,armor:0},{u:null,t:u,dmg:5},{u:beast,t:u,dmg:20,armor:0}],miss:[{u,t:v},{u:v,t:u}],death:[{t:u},{t:v}],
   cast:[{u,t:v,ab:{id:'bolt',cost:['mana',3],tgt:'enemy'}},{u,ab:{id:'mend',cost:['chi',2],tgt:'ally'}},{u:v,ab:{id:'spell',n:'Hex',foe:1}},{u,ab:{id:'warcry',n:'War cry'}},{u,ab:{id:'attack'}}],
   move:[{u},{u:{sz:2,side:1}}],kb:[{t:v}],heal:[{t:u,n:5},{t:u,n:0}],buff:[{t:u}],turn:[{u},{u:v}],loc:[{t:v,head:true}],morale:[{u,from:3,to:0},{u,from:1,to:3},{u,from:3,to:1}],
   injury:[{t:u,id:'x'}],blocked:[{u,t:v}],ff:[{u,t:u,from:v}],spawn:[{u:v}],withdraw:[{u,why:'fled'}],status:['enrage','splitshield','stun','burn','bleed','poison','lucky','chill'].map(key=>({t:v,key,n:key==='splitshield'?0:2})),
   swap:[{u,from:{},to:{}}],shield:[{u,raised:true},{u,raised:false}],reload:[{u}]};
  let n=0;for(const t of types){for(const d of D[t]||[{u,t:v}]){const L=X.AUDIO.plan(t,d);ok(Array.isArray(L),t+': plan is a list');
    for(const x of L){n++;ok(SFX[x[0]],t+' plans an unknown sound '+x[0]);ok(Number.isFinite(x[1])&&x[1]>=0&&x[1]<5,t+': bad delay '+x[1])}}}
  ok(X.AUDIO.plan('hit',D.hit[0]).some(x=>x[0]==='helm')&&X.AUDIO.plan('hit',D.hit[0]).some(x=>x[0]==='blade')&&X.AUDIO.plan('hit',D.hit[0]).some(x=>x[0]==='head'),'a sword blow on a helmet: blade, helm, head');
  ok(X.AUDIO.plan('hit',D.hit[1]).some(x=>x[0]==='arrowFly')&&X.AUDIO.plan('hit',D.hit[1]).some(x=>x[0]==='block'),'an arrow that does nothing: the twang and a block');
  ok(X.AUDIO.plan('hit',D.hit[3]).some(x=>x[0]==='claw'),'a beast claws');
  const wk=wt=>X.auWKind({wpn:{wt}});ok(wk('mace')==='blunt'&&wk('hammer')==='blunt'&&wk('spear')==='pierce'&&wk('crossbow')==='bolt'&&wk('flintlock')==='shot'&&wk('bow')==='arrow'&&wk('axe')==='blade','weapon kinds');
  ok(['mana','aura','qi','chi'].every(g=>X.AUDIO.plan('cast',{u,ab:{id:'x',cost:[g,1],tgt:'enemy'}})[0][0]===g),'a spell sounds by its gift');
  ok(X.AUDIO.plan('morale',D.morale[0])[0][0]==='rout'&&X.AUDIO.plan('morale',D.morale[1])[0][0]==='rally','morale break and rally');
  ok(X.AUDIO.plan('status',{t:v,key:'enrage',n:0})[0][0]==='boss','a boss phase');
  for(const k of ['click','confirm','cancel','tab','step','whoosh','blade','blunt','pierce','arrowHit','boltHit','shotFire','armor','block','miss','mana','aura','qi','chi','heal','death','rout','rally','levelup','head','boss','victory','defeat','coin','coins','march','event','bird','cricket','thunder','bell','anvil'])
   ok(typeof SFX[k]==='function','the effect '+k+' exists');
  ok(Object.keys(X.AUDIO.TRACKS).length>=9&&['title','day','night','town','battle','boss','crisis','east','eastBattle'].every(k=>X.AUDIO.TRACKS[k]),'the nine tracks');
  console.log(types.size+' FX event types mapped ('+[...types].sort().join(' ')+'), '+n+' planned sounds valid: ok') }

section('real battle events');
{ X.seedRng(SEED);X.newGame(true);closeAll(X);const seen={},prev=X.FX.on;let planned=0,bad=null;
  X.FX.on=function(type,d){seen[type]=(seen[type]||0)+1;try{const L=X.AUDIO.plan(type,d);for(const x of L){planned++;if(!SFX[x[0]]||!Number.isFinite(x[1]))bad=type+':'+x[0]}}catch(e){bad=type+' threw '+e.message}};
  for(const f of ['gob','undead','void']){X.seedRng(SEED+f.length);const r=await X.autoBattle({f,mult:1,src:{type:'sim'},turnCap:6000});ok(r&&!r.stuck,'battle '+f);X.settleBattle(r.win)}
  X.FX.on=prev;ok(!bad,'a real event planned badly: '+bad);ok(Object.keys(seen).every(t=>typeof X.AUDIO.MAP[t]==='function'),'an emitted event type has no mapping: '+Object.keys(seen).join(','));
  // the chain: the scene's handler runs first, its error still reaches FX.emit; the audio never throws
  let order=[];const w0=X.FX.on;X.FX.on=null;X.AUDIO.hook();const inner=X.FX.on;ok(!inner||inner.auWrap,'hook with no scene handler');
  X.FX.on=(t)=>{order.push('scene:'+t)};X.AUDIO.hook();const w=X.FX.on;ok(w.auWrap&&w.auPrev,'wraps a new scene handler');w('miss',{u:{},t:{}});ok(order.join()==='scene:miss','the scene handler ran');
  X.AUDIO.hook();ok(X.FX.on===w,'never wrapped twice');
  X.FX.on=()=>{throw new Error('scene bug')};X.AUDIO.hook();let threw=false;try{X.FX.on('hit',{t:{}})}catch(e){threw=/scene bug/.test(e.message)}ok(threw,'the scene\'s error is passed on');
  X.FX.err=null;X.FX.emit('hit',{t:{}});ok(X.FX.err&&/scene bug/.test(X.FX.err.message),'FX.emit still records it');X.FX.err=null;X.FX.on=w0;
  console.log(Object.keys(seen).length+' event types in 3 battles, '+planned+' sounds planned, chain order and errors: ok') }

section('settings');
{ ok(X.SET.vol===.8&&X.SET.music===.6&&X.SET.sfx===.8&&X.SET.mute===false,'defaults');
  X.setVolume('music',35,1);X.setVolume('sfx',120,1);X.setVolume('vol','x',1);X.setOpt('mute',true);
  const o=JSON.parse(X.store.get(X.SETKEY));ok(o.music===.35&&o.sfx===1&&o.vol===.8&&o.mute===true,'saved: '+JSON.stringify(o));
  const Y=makeContext({store:new Map(X.store)});ok(Y.SET.music===.35&&Y.SET.sfx===1&&Y.SET.vol===.8&&Y.SET.mute===true,'loaded in a new context');
  const h=Y.settingsHTML();ok(/type="range"/.test(h)&&(h.match(/type="range"/g)||[]).length===3&&/setVolume\('music'/.test(h)&&/setOpt\('mute'/.test(h),'the dialog has the mute switch and three sliders');
  const Z=makeContext({store:new Map([[X.SETKEY,JSON.stringify({v:1,vol:'loud',music:-3,sfx:NaN,mute:'yes'})]])});ok(Z.SET.vol===.8&&Z.SET.music===0&&Z.SET.sfx===.8&&Z.SET.mute===false,'bad values are refused or clamped');
  X.setOpt('mute',false);console.log('volumes and mute persist apart from the save, clamp, and show: ok') }

section('music and ambience follow the scene');
{ const T=X.AUDIO.trackFor;
  ok(T({mode:'title'})==='title'&&T({mode:'world'})==='day'&&T({mode:'world',night:true})==='night'&&T({mode:'world',town:true})==='town'&&T({mode:'world',town:true,east:true})==='east'
   &&T({mode:'world',crisis:true})==='crisis'&&T({mode:'world',crisis:true,town:true})==='town'&&T({mode:'world',east:true})==='east'&&T({mode:'world',portal:true})==='crisis'
   &&T({mode:'battle'})==='battle'&&T({mode:'battle',boss:true})==='boss'&&T({mode:'battle',east:true})==='eastBattle'&&T({mode:'battle',over:true})===null,'trackFor table');
  X.seedRng(SEED+5);X.newGame(true);closeAll(X);const G=X.G;const S=()=>X.AUDIO.scene(),TR=()=>T(S());
  ok(S().mode==='world','a new company is on the world');G.hour=12;const w0=TR();ok(w0==='day'||w0==='east'||w0==='crisis','noon: '+w0);
  if(X.crisisOn&&X.crisisOn())X.G.crisis.ended=true;const east=X.isEast(G.p.x,G.p.y);
  G.hour=12;ok(TR()===(east?'east':'day'),'noon in the west: day ('+TR()+')');G.hour=23;ok(TR()===(east?'east':'night'),'night ('+TR()+')');
  G.townOpen=true;ok(TR()===(east?'east':'town'),'in town');G.townOpen=false;
  const p0={x:G.p.x,y:G.p.y},et=G.towns.find(t=>t.east);ok(et,'the world has eastern towns');G.p.x=et.x;G.p.y=et.y;ok(X.isEast(G.p.x,G.p.y)&&TR()==='east','at an eastern town: east');G.p.x=p0.x;G.p.y=p0.y;
  G.crisis={k:'sunder',day:G.day,ended:false,won:false,lost:false,fin:0,doom:0,str:1,closed:0,total:3,beaten:0};ok(TR()==='crisis','a crisis on');G.crisis.ended=true;
  G.hour=12;G.weather={kind:'rain'};const a=X.AUDIO.ambFor(S());ok(/\|rain\|day$/.test(a),'ambience: biome|weather|day ('+a+')');G.hour=23;ok(/\|night$/.test(X.AUDIO.ambFor(S())),'ambience at night');
  G.townOpen=true;ok(X.AUDIO.ambFor(S())==='town|night','town ambience');G.townOpen=false;
  X.SPEEDF=0;X.startBattle({f:'gob',mult:1,src:{type:'sim'}});ok(X.mode==='battle'&&TR()===(X.B.east?'eastBattle':'battle'),'a battle: '+TR());ok(/^battle\|/.test(X.AUDIO.ambFor(S())),'battle ambience');
  X.B.boss={u:{alive:true}};ok(TR()==='boss','a boss');X.B.boss=null;X.B.east=true;ok(TR()==='eastBattle','an eastern battle');X.B.east=false;X.B.over=true;ok(TR()===null,'silence for the result');
  X.B=null;X.mode='world';X.mode='title';ok(TR()==='title','the title');
  const k1=['plains','forest','hills','swamp','desert','snow'].map(b=>X.auAmbTargets(b+'|clear|day')),st=X.auAmbTargets('plains|storm|night');
  ok(k1.every(t=>t.wind>0&&t.wind<=.7&&t.rain===0)&&st.rain>0&&X.auAmbTargets('swamp|clear|day').water>0&&X.auAmbTargets('town|day').crowd>0,'ambience beds by biome / weather / town');
  console.log('track table, the real scene (day, night, town, east, crisis, battle, boss, eastern battle, result, title), ambience keys: ok') }

section('engine with a fake WebAudio');
{ const stats={nodes:0,starts:0,ctx:0,resume:0,suspend:0,kinds:{}},AC=fakeAudio(stats),A=makeContext({audio:AC});
  ok(stats.ctx===0,'no context before a gesture');A.seedRng(SEED+9);A.newGame(true);closeAll(A);const r0=JSON.stringify(A.rngState());
  fire(A,'pointerdown');ok(stats.ctx===1&&A.AUDIO.ok&&A.AUDIO.live,'the first gesture makes and resumes one context');fire(A,'touchend');ok(stats.ctx===1,'only one context');
  const c=A.AU.ctx;let errs=[];
  for(const k of Object.keys(A.AUDIO.SFX)){try{c.currentTime+=.5;A.AUDIO.play(k,{v:.8,pan:.3,p:1.1,at:.1})}catch(e){errs.push(k+': '+e.message)}}ok(!errs.length,'effects: '+errs.join('; '));
  for(const k of Object.keys(A.AUDIO.TRACKS)){try{const tr=A.auTrackStart(k,.5);let t=c.currentTime;for(let i=0;i<40;i++)t+=A.auBar(tr,t);A.auTrackStop(tr,.5)}catch(e){errs.push(k+': '+e.stack)}}ok(!errs.length,'tracks: '+errs.join('; '));
  // the scene drives the music through tick, with crossfades
  A.G.hour=12;A.AUDIO.tick();c.currentTime+=1;A.AUDIO.tick();const t1=A.AUDIO.track;ok(t1==='day'||t1==='east','world music on ('+t1+')');
  for(let i=0;i<20;i++){c.currentTime+=.25;A.AUDIO.tick()}const n0=stats.nodes;A.AUDIO.tick();A.AUDIO.tick();ok(stats.nodes-n0<=4,'a tick with no time passing schedules nothing new ('+(stats.nodes-n0)+' nodes)');
  A.G.townOpen=true;c.currentTime+=.3;A.AUDIO.tick();c.currentTime+=1;A.AUDIO.tick();ok(A.AUDIO.track===(A.isEast(A.G.p.x,A.G.p.y)?'east':'town'),'into town: '+A.AUDIO.track);A.G.townOpen=false;
  ok(JSON.stringify(A.rngState())===r0,'the game RNG was touched on the world');A.SPEEDF=1;A.startBattle({f:'gob',mult:1,src:{type:'sim'}});const r1=JSON.stringify(A.rngState());c.currentTime+=.3;A.AUDIO.tick();ok(/battle|eastBattle/i.test(A.AUDIO.track),'battle music at once ('+A.AUDIO.track+')');
  A.mode='battle';const u=A.B.units[0],v=A.B.units.find(x=>x.side===1);for(const t of Object.keys(A.AUDIO.MAP))try{A.audioFx(t,{u,t:v,from:3,to:0,key:'stun',n:1,ab:{id:'bolt',cost:['qi',1],tgt:'enemy'},dmg:5,armor:3})}catch(e){errs.push(t+': '+e.message)}ok(!errs.length,'audioFx: '+errs.join('; '));
  ok(JSON.stringify(A.rngState())===r1,'the game RNG was touched in battle');A.B.over=true;A.B.result={win:true};const r2=JSON.stringify(A.rngState());c.currentTime+=.3;A.AUDIO.tick();ok(A.AU.bRes===A.B.result,'the victory stinger');A.SPEEDF=0;A.B=null;A.mode='world';
  A.AUDIO.music('boss');ok(A.AUDIO.track==='boss','a forced track');A.AUDIO.music(null);ok(A.AUDIO.track===null,'forced silence');A.AUDIO.music(undefined);c.currentTime+=2;A.AUDIO.tick();ok(A.AUDIO.track!=='boss','handed back to the scene');
  A.AUDIO.ambience('snow|snow|night');ok(A.AU.ambK==='snow|snow|night','a forced ambience');A.AUDIO.ambience(undefined);
  // coins and level-ups are noticed by the tick
  const L0=A.AU.last.coin||0;A.G.crowns+=25;c.currentTime+=.5;A.AUDIO.tick();ok((A.AU.last.coin||0)>L0,'a coin when the purse grows');
  const m=A.G.roster[0],L1=A.AU.last.levelup||0;m.lvl++;c.currentTime+=.5;A.AUDIO.tick();ok((A.AU.last.levelup||0)>L1,'a level-up chime');
  // hidden page and mute suspend the context; back again resumes it
  const s0=stats.suspend;A.auHidden(true);ok(stats.suspend>s0&&c.state==='suspended'&&!A.AUDIO.live,'hidden: suspended');const nH=stats.nodes;A.AUDIO.tick();ok(stats.nodes===nH,'nothing scheduled while hidden');
  A.auHidden(false);ok(c.state==='running','visible again: resumed');
  A.setOpt('mute',true);await new Promise(r=>setTimeout(r,350));ok(c.state==='suspended'&&!A.AUDIO.live&&A.AUDIO.play('click')===false,'muted: suspended and silent');A.setOpt('mute',false);ok(c.state==='running','unmuted');
  ok(JSON.stringify(A.rngState())===r2,'the game RNG was touched');
  console.log(stats.nodes+' nodes in '+stats.starts+' starts across every effect and track; tick, crossfade, stingers, coins, level-up, hide / mute: ok') }

section('no RNG consumption');
{ X.seedRng(SEED+77);const r0=JSON.stringify(X.rngState());
  for(let i=0;i<200;i++){X.AUDIO.plan('hit',{u:{wpn:{wt:'axe'}},t:{hpMax:40},dmg:i%30,armor:i%7});X.AUDIO.trackFor(X.AUDIO.scene());X.AUDIO.ambFor(X.AUDIO.scene());X.auAmbEvent('forest|clear|day');X.auRand()}
  for(const k of Object.keys(X.AUDIO.TRACKS))X.auSection(X.AUDIO.TRACKS[k],123);X.AUDIO.tick();
  ok(JSON.stringify(X.rngState())===r0,'audio consumed the game RNG');
  const a=X.auSection(X.AUDIO.TRACKS.day,99).lead.map(p=>p.map(n=>n.n).join()).join('|'),b=X.auSection(X.AUDIO.TRACKS.day,99).lead.map(p=>p.map(n=>n.n).join()).join('|');ok(a===b,'a section is reproducible from its seed');
  console.log('plan, scene, sections, ambience events, tick: the game stream untouched; sections reproducible: ok') }

console.log('\nALL AUDIO TESTS PASSED');process.exit(0)})();
