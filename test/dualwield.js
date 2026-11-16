// Twin blades test: dual wielding (11w-dualwield.js, 64w-dualwield.js; calc() 30-mercs.js; equipRules / fixHands / autoLearn 61-talents.js)
// and the Twin blades tree (MAST.dualwield in 10-data.js, its capstone in 25-legend.js).
// Plain node:  node test/dualwield.js [index.html] [--seed N]
// Checks: the catalog (pinned ids, six tiers, abilities with texts, the capstone, the pools, recruits rolling the tree, painted and pixel
// icons); the equipping rules (only a light one-handed weapon in the off hand, only beside a one-handed melee weapon, shields and off-hand
// weapons exclusive, drops when the partner goes, the company screen's equip and slot views); calc (s.dw, Cross guard, idle off hand);
// the save round trip and a v17 save loading; every ability's useBlock reasons; the off-hand blow after an Attack (untrained, trained,
// ambidextrous, the capstone) and its fatigue; forecast == strike for every blow of every new ability (wrapping strike() like
// test/forecast.js) and the forecast's off-hand line; the AI using the three abilities in auto battles; autoLearn with and without an
// off-hand weapon.
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
const X=makeContext(),BW=X.BW,BH=X.BH,KU=u=>u.r*BW+u.c;
const fresh=s=>{X.seedRng(s);X.newGame(true);closeAll(X);return X.G};
const ALL=[1,2,3,4,5,6].map(t=>'dualwield.'+t),ABS=['twinstrike','dwfeint','bladeflurry'];
const rest=async b=>{let n=0;while(b.busy&&!b.over){await null;if(++n>3e6)fail('the battle never settled')}};
// a merc with a weapon in each hand and the perks given (default: the whole tree)
function twin(bg,w,o,perks){const m=X.newMerc(bg||'pitfighter');m.trees=['dualwield','vanguard','survivor','skirmisher'];m.gift=null;m.lvl=8;m.perks=(perks||ALL).slice();m.pp=0;
 m.eq.w=w||'shortsword';m.eq.s=o===undefined?'knife':o;m.eq.b=null;m.eq.a='padded';m.eq.h=null;m.inj=[];m.traits=[];m.hp=X.calc(m).hp;m.field=true;return m}
// a flat arena at the company's turn, everything parked; the battle stays busy so nothing moves on its own
async function arena(seed,ros,foes){const G=X.G;G.roster=ros;G.day=10;X.seedRng(seed);
 const b=X.startBattle({f:'bandit',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:6000,foes:foes||['thug','thug','thug','thug']});ok(b,'arena did not start');
 let n=0;while(!b.over&&(b.busy||b.cur.side!==0)){await null;if(++n>3e6)fail('arena never reached a company turn')}
 const P=b.units.filter(u=>u.side===0),E=b.units.filter(u=>u.side===1);
 const park=()=>{b.tiles.forEach(t=>{t.t='ground';t.h=0});b.units.forEach((u,i)=>{u.alive=true;u.gone=null;u.down=false;u.hp=u.hpMax=Math.max(u.hpMax,80);u.arm=u.armMax;u.helm=u.helmMax;u.st={};u.buffs=u.buffs.filter(x=>x.foe);
   u.mor=3;u.fearless=true;u.aoo=0;u.rooted=false;u.dazed=false;u.fat=0;u.ap=u.apMax;u.dnc=0;u.bonusAP=0;u.used={};u.qsT=0;u.slipT=0;u.c=i;u.r=u.side?0:BH-1});b.order=[];b.busy=true;X.foeAuras()};
 park();return{b,P,E,park}}
const put=(u,c,r)=>{u.c=c;u.r=r};
/* ---- forecast == strike for every blow (test/forecast.js's check, condensed): the hit chance, the damage to hitpoints and armor, kills ---- */
const FS={n:0,hits:0,off:0,offHits:0,byAb:{},offAb:[]};let FCHECK=false;
const strike0=X.ctx.strike;
X.ctx.strike=async function(u,t,a,o){if(!FCHECK||!t.alive||!u.alive)return strike0(u,t,a,o);
 const tag=`${u.name} -> ${t.name} with ${a.id} (${u.wpn.n||u.wpn.wt})`,r0=X.rngState(),s0=JSON.stringify([u,t]),f=X.forecast(u,t,a,o);
 ok(X.rngState()===r0&&JSON.stringify([u,t])===s0,'forecast changed the state or drew rnd(): '+tag);
 const sure=!!(o&&o.auto)||!!a.sure;ok(f.hit===(sure?100:X.hitChance(u,t,a)),'forecast hit '+f.hit+' is not hitChance: '+tag);
 const off=!!(u.dw&&u.wpn===u.dw);if(off){FS.off++;FS.offAb.push(a)}
 const hp0=t.hp;let ev=null;const on0=X.FX.on;X.FX.on=(type,d)=>{if(type==='hit'&&d.u===u&&d.t===t&&!ev)ev={dmg:d.dmg,armor:d.armor,head:!!d.head};if(on0)on0(type,d)};
 let hit;try{hit=await strike0(u,t,a,o)}finally{X.FX.on=on0}
 FS.n++;FS.byAb[a.id]=(FS.byAb[a.id]||0)+1;
 if(hit){FS.hits++;if(off)FS.offHits++;const hp=ev?ev.dmg:0,arm=ev?ev.armor:0;
  ok(hp>=f.hpMin&&hp<=f.hpMax,`hitpoint damage ${hp} outside the forecast ${f.hpMin}-${f.hpMax}: `+tag);ok(arm>=f.armMin&&arm<=f.armMax,`armor damage ${arm} outside ${f.armMin}-${f.armMax}: `+tag);
  if(ev){const L=ev.head?f.head:f.body;ok(L&&hp>=L.hpMin&&hp<=L.hpMax,'the location forecast misses the blow: '+tag)}
  if(t.hp<=0&&!t.alive)ok(f.kill,'a kill the forecast did not allow: '+tag);else ok(!f.sure,'a sure kill that did not happen: '+tag);
  if(t.alive&&a.bleed&&hp>0)ok(t.st.bleed>=a.bleed&&f.statuses.some(s=>s.k==='bleed'),'the bleed: '+tag)}
 return hit};
(async()=>{
section('catalog');
{ fresh(SEED);const M=X.MAST,T=M.dualwield;
  ok(T&&T.kind==='style'&&T.n==='Twin blades'&&T.tiers.length===6&&T.tiers.every((t,i)=>t.length===1&&t[0].id==='dualwield.'+(i+1)&&t[0].n&&t[0].d),'six tiers of one perk, ids pinned dualwield.1-6');
  ok(X.MUNDANE.includes('dualwield')&&T.cap&&T.cap.tiers[0][0].id==='dualwield.cap'&&X.perkById('dualwield.cap'),'a style tree with a capstone');
  const abs=T.tiers.map(t=>t[0].ab).filter(Boolean);ok(abs.join()===ABS.join(),'three abilities: '+abs);for(const id of ABS){const a=X.AB[id];ok(a&&a.n&&a.d.length>40&&a.dual&&a.tgt==='enemy'&&a.wpn,id+': a dual-wield weapon ability with a text')}
  ok(T.tiers.filter(t=>!t[0].ab).length===3,'three passives');
  for(const bg of ['thief','sellsword','brigand','pitfighter','cutthroat','acrobat','gladiator'])ok(X.BG[bg].pool.includes('dualwield')&&X.BG[bg].pool.length<=9,bg+' can draw the tree');
  ok(X.BG.pitfighter.pool.includes('gladiator')&&X.BG.knight.pool.includes('champion'),'the arena trees stay where they were');
  const seen={};for(let i=0;i<80;i++)for(const bg of ['pitfighter','cutthroat','gladiator']){const m=X.newMerc(bg);if(m.trees.includes('dualwield'))seen[bg]=1}ok(Object.keys(seen).length===3,'recruits roll the tree: '+Object.keys(seen));
  const icons=['m-dualwield'].concat(T.p.concat(T.cap.tiers[0]).map(p=>p.ab?'ab-'+p.ab:'perk-'+p.id));
  for(const n of icons){ok(X.icResolve(n)!=='none','pixel icon '+n);ok(X.pkHas(n)&&typeof X.PAINT[n]==='function','painted icon '+n)}
  console.log('tree, '+abs.length+' abilities, capstone, '+icons.length+' icons: ok') }
section('the off hand: which weapons, beside what');
{ const G=fresh(SEED+1);const R=X.equipRules,I=X.ITEMS;
  for(const id of ['knife','dirk','rondel','stiletto','kris','seax','shortsword','oldsword','gladius','sica','hatchet','cestus','cestus2'])ok(X.isOffW(I[id]),id+' is an off-hand weapon');
  for(const id of ['arming','falchion','handaxe','waraxe','club','mace','spear','warspear','pistol','shortbow','greataxe','staff','kite'])ok(!X.isOffW(I[id]),id+' is not an off-hand weapon');
  const m=X.newMerc('sellsword');m.eq.w='arming';m.eq.b=null;m.eq.s=null;
  ok(R(m,'s','knife').ok&&R(m,'s','hatchet').ok&&R(m,'s','kite').ok,'a dagger, a hatchet or a shield beside a one-handed sword');
  let r=R(m,'s','arming');ok(!r.ok&&/heavy/i.test(r.why),'an arming sword is too heavy for the off hand: '+r.why);r=R(m,'s','pistol');ok(!r.ok&&/ranged/i.test(r.why),'no pistol in the off hand');
  r=R(m,'s','greataxe');ok(!r.ok&&/two-handed/i.test(r.why),'no two-hander in the off hand');ok(!R(m,'b','kite').ok&&!R(m,'s','padded').ok,'slots still refuse the wrong kinds');
  m.eq.w='greataxe';r=R(m,'s','knife');ok(!r.ok&&/one-handed melee/.test(r.why),'no off hand beside a two-hander alone: '+r.why);
  m.eq.w='shortbow';ok(!R(m,'s','knife').ok,'nor beside a bow');m.eq.w=null;ok(!R(m,'s','knife').ok,'nor with bare fists');
  m.eq.w='greataxe';m.eq.b='falchion';r=R(m,'s','knife');ok(r.ok&&r.slung,'beside a one-handed sidearm: allowed, idle until the swap');
  m.eq.w='falchion';m.eq.b=null;m.eq.s='knife';r=R(m,'w','greataxe');ok(r.ok&&r.drops&&r.drops.includes('s'),'a two-hander that leaves the off hand nothing to fight beside drops it');
  m.eq.b='shortsword';r=R(m,'w','greataxe');ok(r.ok&&!r.drops&&r.slung,'… unless the sidearm can take its place (idle)');
  m.eq.b=null;r=R(m,'w','arming');ok(r.ok&&!r.drops&&!r.slung,'another one-handed weapon is fine');
  const g=X.clone(m);g.eq.w='greataxe';ok(X.fixHands(g)==='knife'&&g.eq.s===null,'fixHands drops an off-hand weapon with nothing to fight beside');
  const g2=X.clone(m);g2.eq.w='greataxe';g2.eq.b='seax';ok(X.fixHands(g2)===null&&g2.eq.s==='knife','… and keeps it beside a one-handed sidearm');
  const g3=X.clone(m);g3.eq.s='kite';g3.eq.w='greataxe';ok(X.fixHands(g3)===null&&g3.eq.s==='kite','shields keep their old rule (slung)');
  ok(X.slotTakes('s','knife')&&X.slotTakes('s','kite')&&!X.slotTakes('s','arming')&&!X.slotTakes('w','kite')&&X.slotTakes('b','knife'),'slotTakes');
  // calc: the off-hand weapon in use, Cross guard, idle beside a two-hander
  const c=twin('pitfighter','shortsword','knife',[]);let s=X.calc(c);ok(s.dw&&s.dw.id==='knife'&&s.dwId==='knife'&&!s.dwIdle&&!s.shield,'calc: the knife is in the off hand');
  const md0=s.md;c.perks=['dualwield.3'];s=X.calc(c);ok(s.md===md0+8,'Cross guard: +8 melee defense with a weapon in each hand ('+md0+' -> '+s.md+')');
  c.eq.s=null;const md1=X.calc(c).md;ok(md1===md0-0&&!X.calc(c).dw,'no Cross guard without an off-hand weapon');c.eq.s='knife';
  c.eq.w='greataxe';c.eq.b='seax';s=X.calc(c);ok(!s.dw&&s.dwIdle&&s.md===X.calc(Object.assign(X.clone(c),{perks:[]})).md,'idle beside a two-hander: no off hand, no Cross guard');
  s=X.calc(c,{hand:'b'});ok(s.dw&&s.dw.id==='knife','… in use beside the sidearm');
  // the company screen: equip from the stash, shields and off-hand weapons swap places, the slot view lists both
  G.roster.length=1;const e=G.roster[0];e.eq.w='shortsword';e.eq.b=null;e.eq.s='buckler';G.stash=['knife','kite','arming','hatchet'];X.coSel=e.id;
  ok(X.coSlotFit('s')===3,'the slot counts shields and off-hand weapons in the stash: '+X.coSlotFit('s'));
  const v=X.coSlotView(e,0,'s');ok(/Knife/.test(v.detail)&&/Kite/.test(v.detail)&&/Hatchet/.test(v.detail)&&!/Arming sword/.test(v.detail),'the slot view lists both kinds, not the arming sword');
  ok(X.equip(0,'s',G.stash.indexOf('knife'))&&e.eq.s==='knife'&&G.stash.includes('buckler')&&!G.stash.includes('knife'),'the knife goes to the off hand, the buckler to the stash');
  ok(X.coSlotN(e,'s')==='Off hand'&&/Off hand/.test(X.coLeft(e,0,X.calc(e),false)),'the doll names the off hand');ok(X.coRole(e,X.calc(e))==='Twin blades','the role chip');
  ok(X.equip(0,'s',G.stash.indexOf('kite'))&&e.eq.s==='kite'&&G.stash.includes('knife'),'a shield takes the slot back');
  ok(!X.equip(0,'s',G.stash.indexOf('arming'))&&e.eq.s==='kite','the arming sword is refused');
  X.equip(0,'s',G.stash.indexOf('hatchet'));ok(e.eq.s==='hatchet','a hatchet in the off hand');G.stash.push('greataxe');
  X.equip(0,'w',G.stash.indexOf('greataxe'));ok(e.eq.w==='greataxe'&&e.eq.s===null&&G.stash.includes('hatchet')&&G.stash.includes('shortsword'),'a two-hander sends the off-hand weapon to the stash');
  X.equip(0,'w',G.stash.indexOf('shortsword'));X.equip(0,'s',G.stash.indexOf('hatchet'));X.equip(0,'w',-1);ok(e.eq.w===null&&e.eq.s===null&&G.stash.includes('hatchet'),'unequipping the main weapon sends it to the stash too');
  const html=X.coSlotView(e,0,'s').detail;ok(/off hand/i.test(html),'the slot view explains the off hand');
  console.log('equip rules, calc, the company screen: ok') }
section('saves');
{ const G=fresh(SEED+2);const m=G.roster[0];m.eq.w='shortsword';m.eq.b=null;m.eq.s='kris';G.roster[1].eq.w='arming';G.roster[1].eq.s='buckler';
  ok(X.save(),'save() failed');const raw=JSON.parse(X.store.get(X.SAVEKEY));ok(raw.v===X.SAVEVER&&X.SAVEVER===18,'saved as v18');
  let r=X.readSave();ok(r.state==='ok'&&r.g.roster.find(x=>x.id===m.id).eq.s==='kris'&&r.g.roster[1].eq.s==='buckler','the off-hand weapon and the shield come back');
  const old=X.clone(raw);old.v=17;r=X.readSaveRaw(JSON.stringify(old));ok(r.state==='ok'&&r.v===17&&r.g.v===18&&r.g.roster.find(x=>x.id===m.id).eq.s==='kris','a v17 save loads (the migration changes nothing)');
  const bad=X.clone(raw);const bm=bad.roster.find(x=>x.id===m.id);bm.eq.s='arming';r=X.readSaveRaw(JSON.stringify(bad));ok(r.state==='ok'&&r.g.roster.find(x=>x.id===m.id).eq.s===null,'repair drops a weapon the off hand cannot hold');
  const lone=X.clone(raw);const lm=lone.roster.find(x=>x.id===m.id);lm.eq.w='greataxe';r=X.readSaveRaw(JSON.stringify(lone));ok(r.state==='ok'&&r.g.roster.find(x=>x.id===m.id).eq.s===null,'repair drops an off-hand weapon with nothing to fight beside');
  X.G=null;X.mode='title';X.continueGame();ok(X.mode==='world'&&X.G.roster.find(x=>x.id===m.id).eq.s==='kris','continueGame');closeAll(X);X.store.clear();console.log('v18 round trip, v17 load, repair: ok') }
section('battle: requirements, the off-hand blow, forecast == strike');
{ fresh(SEED+3);const A=await arena(SEED+3,[twin('pitfighter','shortsword','knife',[]),twin('cutthroat','falchion',null,ALL),twin('gladiator','greataxe','knife',ALL)]);
  const {b,P,E}=A,[u,v,w]=P,e=E[0];
  ok(u.dw&&u.dw.id==='knife'&&!v.dw&&!w.dw&&w.cld.dwIdle,'u.dw on the battle unit only with a weapon in each hand');
  for(const id of ABS){const ab=X.abilityInfo(v,id);ok(X.useBlock(v,ab)==='Needs a weapon in each hand'&&!X.canUse(v,ab),id+': refused without an off-hand weapon');
   const aw=X.abilityInfo(w,id);ok(X.useBlock(w,aw)==='Needs a one-handed melee weapon in hand beside the off-hand weapon'&&!X.canUse(w,aw),id+': refused beside a two-hander');
   const au=X.abilityInfo(u,id);ok(X.useBlock(u,au)===''&&X.canUse(u,au),id+': ready with a weapon in each hand');u.ap=au.ap-1;ok(X.useBlock(u,au)==='Not enough AP','… AP');u.ap=u.apMax;
   u.fat=u.fatMax;ok(X.useBlock(u,au)==='Too tired','… fatigue');u.fat=0}
  ok(X.useBlock(u,X.abilityInfo(u,'netthrow'))==='Needs a free off hand: no shield raised, no off-hand weapon, no two-handed weapon','Throw net needs a free hand, not a blade');
  ok(!X.isDuel(u,X.abilityInfo(u,'attack'))&&X.isDuel(v,X.abilityInfo(v,'attack')),'a dual wielder is not duelling (no Duelist bonus)');
  // the Attack: its off-hand blow and fatigue
  const at=X.abilityInfo(u,'attack'),atv=X.abilityInfo(v,'attack');ok(at.dwOff&&at.dwOff.mult===.5&&at.dwOff.hit===-10&&!atv.dwOff,'untrained: 50%, −10 to hit');
  ok(at.fat===X.ITEMS.shortsword.fat+Math.ceil(X.ITEMS.knife.fat*X.DW.atkFat),'the off-hand weapon adds fatigue to the Attack: '+at.fat);
  u.flags=Object.assign({},u.flags,{dwTrain:1});let t2=X.abilityInfo(u,'attack');ok(t2.dwOff.mult===.75&&t2.dwOff.hit===0,'Off-hand training: 75%, no penalty');
  u.flags.dwAmbi=1;t2=X.abilityInfo(u,'attack');ok(t2.dwOff.mult===1&&t2.dwOff.hit===0,'Ambidextrous: 100%');
  u.flags.dwOffDmg=.15;u.flags.dwOffHit=5;const st=X.dwStepAb(u,t2,'o',1,0);ok(Math.abs(st.mult-1.15)<1e-9&&st.hit===5,'the capstone: +15% and +5 on every off-hand blow');
  put(u,5,5);put(e,6,5);const f=X.forecast(u,e,t2);ok(f.off&&f.off.n==='Knife'&&f.off.hit===X.dwWith(u,()=>X.hitChance(u,e,st)),'the forecast carries the off-hand blow: '+JSON.stringify(f.off));
  const fm=X.forecast(u,e,X.abilityInfo(u,'dwfeint'));ok(!fm.off,'Feint and cut has no off-hand blow');ok(X.forecast(u,e,X.abilityInfo(u,'twinstrike')).off.hit===X.dwWith(u,()=>X.hitChance(u,e,X.dwStepAb(u,X.AB.twinstrike,'o',1,10))),'Twin strike: the off-hand line');
  put(e,7,5);ok(!X.forecast(u,e,t2).off,'no off-hand line out of reach');
  u.flags=X.calc(u.m).flags;
  // strikes for real: every blow checked against its forecast
  FCHECK=true;let follow=0,twinN=0;const run=async(un,id,t)=>{A.park();put(un,5,5);put(t,6,5);un.ap=9;un.fat=0;un.ms=75;const n0=FS.off;await X.useAbility(un,X.abilityInfo(un,id),KU(t));await rest(b);b.busy=true;return FS.off-n0};
  u.m.perks=ALL.slice();u.flags=X.calc(u.m).flags;
  for(let i=0;i<40;i++){const t=E[i%E.length];follow+=await run(u,'attack',t);twinN+=await run(u,'twinstrike',t);await run(u,'dwfeint',t);await run(u,'bladeflurry',t)}
  ok(follow>=30,'the Attack is followed by the off-hand blow: '+follow+'/40');ok(twinN>=30,'Twin strike strikes with the off hand: '+twinN+'/40');
  ok(FS.offAb.every(a=>a.dwStep&&a.dwHand==='o'),'every off-hand blow is a step of its own');
  ok(FS.byAb['bladeflurry']>=40&&FS.byAb['bladeflurry#o']>=30&&FS.byAb['bladeflurry#m']>=30,'Blade flurry: main, off, main: '+JSON.stringify(FS.byAb));
  ok(FS.byAb['dwfeint']>=40&&!FS.byAb['dwfeint#o'],'Feint and cut: one blow, the main hand');
  // the Attack with no off-hand weapon is untouched
  const n0=FS.off;for(let i=0;i<10;i++)await run(v,'attack',E[0]);ok(FS.off===n0,'no off-hand blow without an off-hand weapon');
  FCHECK=false;console.log('forecast == strike over '+FS.n+' blows ('+FS.hits+' hits, '+FS.off+' off-hand blows, '+FS.offHits+' landed): ok') }
section('the HUD and the figure');
{ const html=X.fcHTML(...await (async()=>{fresh(SEED+4);const A=await arena(SEED+4,[twin()]);const u=A.P[0],e=A.E[0];put(u,5,5);put(e,6,5);return[u,e,X.abilityInfo(u,'twinstrike'),true]})());
  ok(/fco/.test(html),'the forecast window shows the off-hand line');
  const u=X.B.units[0],S=X.usMercSpec(u.m,{w:u.wid,a:u.alt});ok(S.ow&&S.owId==='knife'&&!S.shield,'the battle figure carries the off-hand weapon');
  const m2=X.clone(u.m);m2.eq.s='kite';const S2=X.usMercSpec(m2,{w:'shortsword',a:null});ok(!S2.ow&&S2.shield,'a shield is drawn as a shield');
  const ins=X.insArms(u);ok(/off hand/.test(ins),'the inspect panel lists the off hand');
  X.B=null;X.mode='world';console.log('forecast window, figure spec, inspect: ok') }
section('autoLearn');
{ fresh(SEED+5);const m=X.newMerc('pitfighter');m.trees=['dualwield','vanguard','survivor','brawler'];m.gift=null;m.eq.w='shortsword';m.eq.s='knife';m.eq.b=null;m.eq.a='padded';X.gainXP(m,X.XPT[12]);m.pend=0;X.autoLearn(m);
  ok(m.perks[0]==='dualwield.6'&&['dualwield.6','dualwield.5','dualwield.4'].every(id=>m.perks.includes(id)),'a dual wielder learns the Twin blades first: '+m.perks.join());
  const h=X.newMerc('sellsword');h.trees=['dualwield','vanguard','survivor','brawler'];h.gift=null;h.eq.w='arming';h.eq.s='heater';h.eq.b=null;X.gainXP(h,X.XPT[6]);h.pend=0;X.autoLearn(h);
  ok(!h.perks.some(id=>['dualwield.2','dualwield.4','dualwield.5','dualwield.3'].includes(id)),'a shield bearer passes the Twin blades over: '+h.perks.join());
  const k=X.newMerc('sellsword');k.trees=['dualwield','vanguard','survivor','brawler'];k.gift=null;k.eq.w='greataxe';k.eq.b='seax';k.eq.s='knife';X.gainXP(k,X.XPT[6]);k.pend=0;const tg=X.mercTags(k);ok(!tg.has('dual'),'mercTags: no dual tag with a two-hander in hand');
  const t=twin();ok(X.mercTags(t).has('dual'),'mercTags: dual');console.log('autoLearn: ok') }
section('the AI uses the abilities');
{ const use={},u0=X.ctx.useAbility;X.ctx.useAbility=async function(u,a,k){if(u.side===0)use[a.id]=(use[a.id]||0)+1;return u0(u,a,k)};
  let wins=0,n=0,offB=0;const on=X.FX.on;
  for(let i=0;i<8;i++){const G=fresh(SEED+20+i);G.roster.length=0;for(const bg of ['pitfighter','cutthroat','gladiator','thief','brigand','sellsword']){const r=twin(bg,['shortsword','falchion','gladius'][i%3],['knife','dirk','hatchet','sica'][i%4]);X.gainXP(r,X.XPT[8]);r.lvl=8;r.pend=0;r.pp=0;r.eq.h='hood';r.hp=X.calc(r).hp;G.roster.push(r)}
   FCHECK=true;const res=await X.autoBattle({f:['bandit','gob','orc','free'][i%4],mult:.6,biome:'plains',pilot:'sensible',src:{type:'test'},turnCap:4000});FCHECK=false;ok(res&&!res.stuck,'an auto battle ended');n++;if(res.win)wins++;X.B=null;X.mode='world'}
  X.ctx.useAbility=u0;console.log('AI use over '+n+' battles ('+wins+' won): '+JSON.stringify(use)+'; off-hand blows checked: '+FS.off);
  for(const id of ABS.concat(['attack']))ok(use[id]>0,'the AI never used '+id) }
console.log('\nOK dualwield');process.exit(0)})();
