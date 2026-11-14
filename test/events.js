// Events and origins test (17-events.js). Plain node, no browser:  node test/events.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the vm approach and DOM stubs of test/items.js) and checks:
// Checks: the EVENTS catalog shape; every event's when/text/options run on varied companies (every origin, many seeds, extra recruits
// with every trait and gift) with their effects applied and the company left valid; requirement badges gate their options; travel
// frequency; determinism for a seed and a list of choices (and divergence when the choices differ); every origin raises a valid
// campaign that survives a battle, a few days and a save/load round trip; generic twist cards; evtRepair.
// renown tiers and what they unlock (contract danger and factions, pay, veteran recruits, follower slots, rare backgrounds),
// every follower's world / town / economy effect, ambitions (offer, take up, progress, completion, rewards, notes),
// the battle flow (parts, drillmaster xp, counters) and the save round trip of the progression fields.
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

const X=makeContext();
const fresh=(s,o)=>{X.seedRng(s);X.newGame(true,o?{origin:o}:undefined);closeAll(X);return X.G};
const fightOnce=(o)=>{const b=X.startBattle(Object.assign({f:'gob',mult:1,src:{type:'sim'},quiet:true},o));ok(b,'battle did not start');
 for(const u of b.units)if(u.side===1)u.alive=false;const res=X.resolveBattle(true);X.B=null;X.mode='world';closeAll(X);return res};
const KINDS=['travel','camp','town','after'];
function valid(G,why){ok(Array.isArray(G.roster)&&G.roster.length>=1&&G.roster.length<=X.MAXROSTER,why+': roster size '+G.roster.length);
 for(const k of ['crowns','food','tools','renown'])ok(Number.isFinite(G[k])&&G[k]>=0,why+': '+k+' = '+G[k]);
 ok(G.salve==null||(Number.isFinite(G.salve)&&G.salve>=0),why+': salves');for(const k in (G.parts||{}))ok(X.PARTS[k]&&G.parts[k]>0&&Number.isInteger(G.parts[k]),why+': part '+k);
 for(const id of G.stash)ok(!!X.ITEMS[id],why+': unknown stash item '+id);
 const ids=new Set();for(const m of G.roster){ok(!ids.has(m.id),why+': duplicate merc id');ids.add(m.id);ok(X.traitsValid(m.traits),why+': traits of '+m.name+' '+JSON.stringify(m.traits));
  ok(Number.isFinite(m.hp)&&m.hp>=1&&m.hp<=X.calc(m).hp,why+': hp of '+m.name+' '+m.hp);ok(Number.isFinite(m.xp)&&m.lvl>=1&&m.lvl<=X.MAXLV,why+': xp/lvl');
  for(const j of m.inj||[])ok(X.INJ[j.id]&&Number.isFinite(j.days),why+': injury '+JSON.stringify(j))}
 if(G.rep)for(const f in G.rep)ok(Number.isFinite(G.rep[f])&&G.rep[f]>=-100&&G.rep[f]<=100,why+': rep '+f);
 ok(G.evt&&G.evt.seen&&G.evt.flags,why+': G.evt')}
const stateHash=G=>{const s=JSON.stringify({c:G.crowns,f:G.food,t:G.tools,r:G.renown,s:G.salve,p:G.parts,st:G.stash,e:G.evt,rep:G.rep,day:G.day,h:G.hour,
 ro:G.roster.map(m=>[m.id,m.name,m.bg,m.traits,m.xp,m.hp,m.inj])});let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)};

section('catalog');
const E=X.EVENTS,ids=Object.keys(E).filter(id=>!E[id].twist);   // contract twists (16-contracts.js) write ctr-* entries of their own
{ ok(ids.length>=40,'about 45 events (have '+ids.length+')');const by={};
  for(const id of ids){const D=E[id];ok(typeof D.n==='string'&&D.n,id+': name');ok(Array.isArray(D.kind)&&D.kind.length&&D.kind.every(k=>KINDS.includes(k)),id+': kinds');
   ok(X.EVSCENE[D.art],id+': art key '+D.art+' has a vignette');ok(typeof D.when==='function'&&(typeof D.text==='function'||typeof D.text==='string'),id+': when/text');
   ok(Number.isFinite(D.cd)&&D.cd>=0,id+': cooldown');ok(Array.isArray(D.opts)&&D.opts.length>=1&&D.opts.length<=4,id+': 1-4 options');
   ok(D.opts.some(o=>!o.req),id+': at least one option is always open');
   for(const o of D.opts){ok(typeof o.t==='string'&&o.t,id+': option title');ok(typeof o.d==='string'||typeof o.d==='function',id+': option '+o.t+' states its effects');ok(typeof o.go==='function',id+': option go');
    if(o.badge)ok(typeof o.req==='function',id+': a badge marks a requirement')}
   D.kind.forEach(k=>by[k]=(by[k]||0)+1)}
  ok(by.travel>=15&&by.camp>=8&&by.town>=6&&by.after>=4,'events of every kind: '+JSON.stringify(by));
  const arts=new Set(ids.map(id=>E[id].art));ok(Object.keys(X.EVSCENE).length>=15&&arts.size>=14,'15+ vignettes, 14+ in use ('+arts.size+')');
  console.log(`  ${ids.length} events ${JSON.stringify(by)}, ${Object.keys(X.EVSCENE).length} vignettes, ${ids.reduce((n,id)=>n+E[id].opts.length,0)} options`)}

section('every event on varied companies');
{ let runs=0,applied=0,gated=0,shown=0;const ORG=Object.keys(X.ORIGINS),TR=Object.keys(X.TRAITS),BGS=Object.keys(X.BG);
  for(let ci=0;ci<ORG.length*2;ci++){const G0=fresh(SEED+ci,ORG[ci%ORG.length]);
   // widen the company: recruits of many backgrounds, every trait somewhere, a hurt merc, an injured one
   for(let i=0;i<6;i++){const m=X.newMerc(BGS[(ci*5+i*7)%BGS.length]);m.traits=[];X.evTraitQuiet(m,TR[(ci*3+i*2)%TR.length]);X.evTraitQuiet(m,TR[(ci*7+i*5+1)%TR.length]);m.hp=X.calc(m).hp;G0.roster.push(m)}
   G0.roster[1].hp=Math.max(1,Math.floor(G0.roster[1].hp*.3));X.addInjury(G0.roster[2],'cutarm',4);
   if(ci%3===1){G0.crowns=5;G0.food=0;G0.tools=0;G0.salve=0}if(ci%4===3){while(G0.roster.length<X.MAXROSTER)G0.roster.push(X.newMerc('farmhand'))}
   if(ci%2)G0.evt.flags.hexBroken=1;if(ci%2)G0.evt.flags.invest=1;G0.day=20;
   const snap=X.clone(G0);
   for(const id of ids){const D=E[id];for(const kind of D.kind){
    X.G=X.clone(snap);const G=X.G;const base=X.evCtx(kind,kind==='after'?{win:true,f:['bandit','beast','undead','orc'][ci%4]}:{town:ci%G.towns.length});
    const cs=D.who?G.roster.filter(m=>D.who(m,base)):G.roster;if(!cs.length)continue;
    const c=Object.assign({},base,{m:cs[ci%cs.length]});c.m2=G.roster.find(m=>m!==c.m&&(!D.who2||D.who2(m,c)))||null;if(D.who2&&!c.m2)continue;
    const w=D.when(c);ok(Number.isFinite(+w)&&+w>=0,id+': when() gives a weight ('+w+')');ok(typeof X.evStr(D.text,c)==='string'&&X.evStr(D.text,c).length>20,id+': text');
    X.seedRng(ci*1000+runs);ok(X.eventShow(id,c)===true,id+': eventShow');shown++;X.EVS.cur=null;closeAll(X);
    for(let i=0;i<D.opts.length;i++){X.G=X.clone(snap);const G2=X.G;const c2=X.evCtx(kind,kind==='after'?{win:true,f:base.foe}:{town:base.town});
     const cs2=D.who?G2.roster.filter(m=>D.who(m,c2)):G2.roster;c2.m=cs2[ci%cs2.length];c2.m2=G2.roster.find(m=>m!==c2.m&&(!D.who2||D.who2(m,c2)))||null;
     const o=D.opts[i],d=X.evStr(o.d,c2);ok(d.length>=5,id+'/'+i+': effects text');const open=X.evReqOk(o,c2);if(!open){gated++;const r=X.evtResolve(id,c2,i);ok(!r.ok,id+"/"+i+": a closed option does nothing");continue}
     const h0=stateHash(G2);X.seedRng(ci*7919+i*31+runs);const r=X.evtResolve(id,c2,i);runs++;ok(r.ok,id+'/'+i+': resolves');
     if(r.fx.some(x=>x.c)){applied++;ok(stateHash(G2)!==h0||r.fight,id+'/'+i+': listed effects changed the company ('+r.fx.map(x=>x.t).join(', ')+')')}
     if(r.fight){ok(G2.parties.some(p=>p.id===r.fight.src.id),id+'/'+i+': the band to fight is on the map')}
     valid(G2,id+'/'+i)}}}}
  console.log(`  ${shown} cards shown, ${runs} options resolved (${applied} with listed effects), ${gated} gated by a requirement`)}

section('effects are exact');
{ let G=fresh(31);G.crowns=1000;G.food=20;let c=X.evCtx('travel',{});c.m=G.roster[0];let r=X.evtResolve('pedlar',c,0);ok(r.ok&&G.crowns===950&&G.food===34,'pedlar: −50 crowns, +14 food');
  r=X.evtResolve('pedlar',c,1);ok(G.crowns===890&&G.tools===30,'pedlar: −60 crowns, +10 tools');
  G.food=5;r=X.evtResolve('refugees',c,0);ok(!r.ok&&G.food===5,'a requirement (10 food) closes the option and nothing changes');
  const n0=G.roster.length;r=X.evtResolve('refugees',c,1);ok(G.roster.length===n0+1&&G.roster[n0].bg==='farmhand'&&G.food===1,'refugees: a farmhand joins for 4 food');
  while(G.roster.length<X.MAXROSTER)G.roster.push(X.newMerc('farmhand'));G.food=20;r=X.evtResolve('refugees',c,1);ok(G.roster.length===X.MAXROSTER&&r.fx.some(x=>/No room/.test(x.t)),'a full roster turns recruits away');
  G=fresh(32);const m=G.roster[0];m.traits=['craven'];X.evTrait(m,'brave');ok(m.traits.join()==='brave','gaining a trait replaces its opposite');
  m.traits=['tough','quick'];ok(!X.evTrait(m,'lucky')&&m.traits.length===2,'two good traits leave no room for a third good one');
  m.traits=['tough','greedy'];ok(X.evTrait(m,'lucky')&&m.traits.join()==='tough,lucky','a good trait pushes out a bad one');
  ok(X.evUntrait(m,'lucky')&&m.traits.join()==='tough','a trait can be lost');
  const L=G.roster.length;G.roster.length=1;ok(!X.evLeave(G.roster[0]),'the last sword never leaves');
  G=fresh(33,'noble');ok(!X.evLeave(G.roster[0])&&G.roster.length===4,'the noble heir never walks out of an event');}

section('requirement badges');
{ const G=fresh(41);G.roster.forEach(m=>{m.bg='farmhand';m.traits=[];m.gift=null;m.perks=[]});let c=X.evCtx('travel',{});c.m=G.roster[0];
  const D=E.wolves,hi=D.opts.findIndex(o=>o.badge==='Hunter');ok(hi>=0&&!X.evReqOk(D.opts[hi],c),'Hunter badge closed without a hunter');
  G.roster[2].bg='hunter';ok(X.evReqOk(D.opts[hi],c),'and open with one');
  const S=E.shrine,qi=S.opts.findIndex(o=>o.badge==='Chi');ok(qi>=0&&!X.evReqOk(S.opts[qi],c),'Chi badge closed without a chi gift');
  G.roster[3].bg='acolyte';G.roster[3].gift=X.giftKey('chi','support');ok(X.evReqOk(S.opts[qi],c),'Chi badge open with a chi-gifted merc');
  const B=E.dice,li=B.opts.findIndex(o=>o.badge==='Lucky');ok(!X.evReqOk(B.opts[li],c),'Lucky closed');G.roster[1].traits=['lucky'];ok(X.evReqOk(B.opts[li],c),'Lucky open')}

section('frequency and cooldowns');
{ // the real march: advanceTime while moving offers travel events through the world's travelTick when it exists, else eventTick counts the hours
  const G=fresh(51),world=typeof X.travelTick==='function';let n=0;
  for(let i=0;i<24*40;i++){G.moving=true;X.advanceTime(1);if(!world)X.eventTick('travel',{h:1});if(X.EVS.cur){n++;X.EVS.cur=null}closeAll(X)}G.moving=false;
  const per=40/n;ok(per>=1.25&&per<=2.2,'a travel event every 1.5-2 days of marching (got one per '+per.toFixed(2)+' days, '+n+' in 40)');
  const seen=G.evt.seen;for(const id in seen)ok(E[id].kind.includes('travel'),'only travel events on the march');
  // no event repeats inside its cooldown
  const G2=fresh(52),last={};for(let i=0;i<24*60;i++){X.advanceTime(1);closeAll(X);if(X.eventTick('travel',{h:1})){const id=X.EVS.cur.id;if(last[id]!=null)ok(E[id].cd>0&&G2.day-last[id]>=E[id].cd,id+' came back inside its cooldown');last[id]=G2.day;X.EVS.cur=null;closeAll(X)}}
  // camp: at most once a day
  const G3=fresh(53);let cn=0;for(let d=0;d<30;d++){for(let k=0;k<3;k++)if(X.eventTick('camp')){cn++;X.EVS.cur=null;closeAll(X)}X.advanceTime(24)}ok(cn>=5&&cn<=30,'camp events: at most one a day, about '+Math.round(X.EVK.camp*100)+'% of rests ('+cn+'/30)');
  console.log(`  ${n} travel events in 40 days of marching${world?' (world travelTick)':''}; ${cn} camp events in 30 days`)}

section('determinism and divergence');
function run(seed,choose){const G=fresh(seed);const log=[];
 for(let step=0;step<24*30;step++){X.advanceTime(1);closeAll(X);const kind=step%24===20?'camp':step%24===12?'town':step%37===5?'after':'travel';
  const shown=kind==='travel'?X.eventTick('travel',{h:1}):X.eventTick(kind,kind==='after'?{win:true,f:'bandit'}:kind==='town'?{town:step%G.towns.length}:{});
  if(shown){const S=X.EVS.cur,opts=S.D.opts.map((o,i)=>X.evReqOk(o,S.c)?i:-1).filter(i=>i>=0),i=opts[choose(log.length)%opts.length];X.evtPick(i);
   if(X.EVS.fight){G.parties=G.parties.filter(p=>p.id!==X.EVS.fight.src.id);X.EVS.fight=null}log.push(S.id+':'+i);X.evtClose();closeAll(X)}}
 return{h:stateHash(G),log}}
{ const a=run(61,n=>n),b=run(61,n=>n),c=run(61,n=>n*7+3);ok(a.log.length>=12,'a month brings a dozen events or more ('+a.log.length+')');
  ok(a.h===b.h&&a.log.join()===b.log.join(),'same seed, same choices: same events and same company ('+a.h+' = '+b.h+')');
  ok(c.h!==a.h,'different choices: a different company ('+c.h+')');console.log(`  ${a.log.length} events in 30 days; replay ${a.h} = ${b.h}; other choices ${c.h}`)}

section('origins');
{ const ORG=Object.keys(X.ORIGINS);ok(ORG.length===6&&ORG[0]==='free','six origins, Free company first');
  for(const k of ORG){const O=X.ORIGINS[k];ok(O.n&&O.d&&O.rule&&O.icon&&typeof O.n==='string','origin '+k+': n/d/rule/icon');
   const G=fresh(70+ORG.indexOf(k),k);ok(G.origin===k,k+': G.origin');ok(G.roster.length===4,k+': four swords');ok(G.crowns===O.crowns,k+': crowns '+G.crowns);valid(G,'origin '+k);
   const res=fightOnce({f:'bandit'});ok(res&&res.win!==false,k+': wins a battle');X.advanceTime(72);closeAll(X);valid(X.G,k+' after a battle and three days');
   X.mode='world';ok(X.save(),k+': saves');const r=X.readSave();ok(r.state==='ok',k+': loads ('+r.state+' '+(r.why||'')+')');ok(r.g.origin===k&&JSON.stringify(r.g.evt)===JSON.stringify(X.G.evt),k+': origin and event state survive the round trip');
   X.continueGame();closeAll(X);ok(X.G.origin===k&&X.G.roster.length===G.roster.length,k+': continues')}
  let G=fresh(81,'deserters');ok(X.originK('wage')===.8,'deserters: wage x0.8');if(Array.isArray(G.houses)&&G.houses.length){const f=G.evt.flags.fled;ok(f&&G.rep[f]<=-50,'deserters: the fled house starts hostile ('+(f&&G.rep[f])+')')}
  G=fresh(82,'noble');const lord=G.roster.find(m=>m.id===G.evt.flags.lord);ok(lord&&/^Ser /.test(lord.name)&&lord.lvl>=3&&lord.eq.a==='mail','noble: the heir, level 3, in mail');ok(G.crowns===450&&G.renown===30,'noble: 450 crowns, 30 renown');
  G.roster=G.roster.filter(m=>m!==lord);ok(X.eventTick('travel',{h:1})===false&&X.EVS.cur&&/oath/.test(X.EVS.cur.D.n),'noble: the oath-broken card when the heir is gone');
  X.evtPick(1);ok(X.G.origin==='free','noble: fight on as a free company');X.evtClose();closeAll(X);
  G=fresh(83,'academy');ok(G.roster.every(m=>m.gift&&X.giftAwake(m)&&m.traits.includes('fragile')),'academy: every gift awake, every one Fragile');ok(X.originK('college')===.5,'academy: colleges at half price');
  G=fresh(84,'beast');ok(X.originK('parts')===1.5&&G.parts.pelt>=3&&G.roster.some(m=>m.traits.includes('beastwise')),'beast hunters: parts x1.5, pelts, a beast-wise hunter');
  { let a=0,b=0;X.seedRng(5);for(let i=0;i<400;i++)a+=X.partsDrop({win:true,slain:['wolf']}).reduce((n,x)=>n+x.n,0);G.origin='free';X.seedRng(5);for(let i=0;i<400;i++)b+=X.partsDrop({win:true,slain:['wolf']}).reduce((n,x)=>n+x.n,0);
    ok(a>b*1.3,'beast hunters drop more parts ('+a+' vs '+b+')')}
  G=fresh(85,'pilgrims');ok(G.crisisDay===12&&G.parts.voidshard>=2,'pilgrims: the Sundering on day 12, void shards')}

section('twists and repair');
{ const G=fresh(91);let hit=0;ok(X.eventShow({n:'The cargo is cursed',text:'<p>It whispers.</p>',opts:[{t:'Dump it',d:'−50 crowns.',go:c=>{X.evCrowns(-50);hit++;return'Gone.'}},{t:'Keep it',d:'Nothing.',go:()=>''}]},{then:()=>hit+=10})===true,'a generic twist card shows');
  const c0=G.crowns;X.evtPick(0);ok(hit===1&&G.crowns===c0-50,'its option applies');X.evtClose();ok(hit===11,'then runs when the card closes');closeAll(X);
  ok(X.eventShow({n:'Bare'})===true,'a twist with no options gets a Go on button');X.evtPick(0);X.evtClose();closeAll(X);
  const g={seed:1,day:5,evt:{seen:{a:'x',pedlar:3},flags:{ok:1,bad:{}},acc:'q',next:-4,last:null},origin:'nope'};X.evtRepair(g);
  ok(g.evt.seen.pedlar===3&&!('a' in g.evt.seen)&&g.evt.flags.ok===1&&!('bad' in g.evt.flags)&&g.evt.acc===0&&g.evt.next>0&&g.origin==='free','evtRepair cleans a damaged G.evt');
  const g2={};X.evtRepair(g2);ok(g2.evt&&g2.origin==='free','evtRepair fills an old save')}

console.log('\nOK');
