// Monster hunter tree and the Solo (Beast Slayer) origin. Plain node, no browser:  node test/slayer.js [--seed N]
// The Isekai origin (28i-isekai.js). Plain node, then a browser pass with Playwright:  node test/isekai.js [html] [--seed N] [--no-browser]
// Checks the origin record and icons, the hero made headlessly through the very functions the creation screens call (iskSet, iskToggle,
// iskNext, iskBegin) in both modes: three stats at three stars, the chosen style trees, weapon family and armor tree (and nothing else,
// whatever the background allows), the kit, solo closing every recruit path and RPG hiring, the hero's death ending the run in both
// modes (another sword's death does not; nor can the hero be dismissed, desert or walk out), the name sanitised and escaped
// (<img onerror>), the save round trip, repair of a broken record, and a v21 save loading unchanged. The browser part (built html,
// default dist/index.html, else index.html) walks the whole creation UI at 667x375, Detail High, by taps: every step's controls on
// screen and nothing overflowing, then the world with the hero, and the RPG game-over page.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261118,SRC=path.join(__dirname,'..','src');
const HTML=ARGV.find(a=>/\.html$/.test(a))||(fs.existsSync(path.join(__dirname,'..','dist','index.html'))?'dist/index.html':'index.html');
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
const BAD='<img src=x onerror=alert(1)>';
// the creation screens, driven as a player would: every choice through the UI's own functions; returns the sheets shown
function create(seed,c){X.seedRng(seed);const shown=[];const sh0=X.sheet;X.ctx.sheet=(h,cls)=>{shown.push(String(h));return sh0(h,cls)};
 try{X.newCompanySetup();X.ncSet('origin','isekai');X.ncBegin();ok(X.ISKS.step===0,'the creation screens open on the name');
  X.iskSet('name',c.name);X.iskNext();ok(X.ISKS.step===1,'name -> talents');X.iskBack();ok(X.ISKS.step===0,'and back');X.iskNext();
  X.iskNext();ok(X.ISKS.step===1,'Next waits for three talents');for(const k of c.tal)X.iskToggle('tal',k);ok(!X.iskToggle('tal',X.ISK.stats.find(k=>!c.tal.includes(k))),'a fourth star is refused');
  X.iskNext();ok(X.ISKS.step===2,'talents -> trees');for(const k of c.trees)X.iskToggle('trees',k);X.iskNext();ok(X.ISKS.step===3,'trees -> weapon');
  X.iskSet('wt',c.wt);X.iskNext();X.iskSet('at',c.at);X.iskNext();X.iskSet('gift',c.gift||'none');X.iskNext();ok(X.ISKS.step===6,'-> mode');
  X.iskBack();ok(X.ISKS.step===5,'Back goes one step back');X.iskNext();X.iskSet('mode',c.mode);X.iskNext();ok(X.ISKS.step===7,'-> the summary');
  ok(X.iskBegin(),'Begin raises the company');closeAll(X)}finally{X.ctx.sheet=sh0}return shown}
const RPG={name:BAD,tal:['hp','init','ms'],trees:['duelist','shadow','assassin','scout'],wt:'flintlock',at:'heavyarmor',gift:'qi',mode:'rpg'};
const SOLO={name:'Hana Sato',tal:['rs','rd','brv'],trees:['thrower','scout','skirmisher','survivor'],wt:'throwing',at:'lightarmor',gift:null,mode:'solo'};
const freshI=(s,c)=>{create(s,c);return X.G};
function kill(b,m){const u=b.units.find(x=>x.side===0&&x.m===m);u.flags=Object.assign({},u.flags,{lucky:0,undying:0});let n=0;do{u.alive=true;u.hp=1;u.down=false;X.killUnit(u,null,false)}while(u.down&&++n<50);return u}
(async()=>{
section('the origin');
{ const O=X.ORIGINS.isekai;ok(O&&O.n==='The Isekai'&&O.d&&O.rule&&O.icon==='or-isekai'&&typeof O.setup==='function'&&!O.lock&&!O.solo,'ORIGINS.isekai: n d rule icon setup, no lock');
  ok(/Solo/.test(O.rule)&&/RPG/.test(O.rule)&&/hero dies/.test(O.rule),'the rule states both modes');ok(/two swords/.test(X.isekaiRule('solo'))&&/run ends/.test(X.isekaiRule('rpg')),'each mode states its own rule');
  ok(X.icHas('or-isekai')&&typeof X.PAINT['or-isekai']==='function','pixel (Low) and painted (High) icons');ok(X.originUnlocked('isekai'),'open from the start');
  const L=X.ncOrigins();ok(L.indexOf('isekai')===L.indexOf('slayer')+1,'listed beside the open origins');
  const B=X.BG.isekai;ok(B&&B.n==='Isekai'&&B.proper&&typeof B.d==='string'&&B.d.length>20&&B.noHire&&B.w===0,'BG.isekai: "Isekai", a description, never hired');
  ok(['hp','fat','init','ms','rs','md','rd','brv'].every(k=>B.st[k]>0&&B.st[k]<=6),'balanced base stats: '+JSON.stringify(B.st));ok(X.bgLow('isekai')==='Isekai'&&X.bgLow('sellsword')==='sellsword','its name keeps its capital inside sentences');
  // never generated: taverns of every town over many days, the background draw, rival rosters
  { X.seedRng(SEED+90);X.newGame(true);closeAll(X);const G0=X.G;let n=0;for(let d=0;d<40;d++){for(const t of G0.towns){X.stockTown(t);for(const r of t.recruits){n++;ok(r.bg!=='isekai','isekai never in a tavern')}}}
    for(let i=0;i<4000;i++)ok(X.wpickBG()!=='isekai'&&X.recruitBG(G0.towns[i%G0.towns.length])!=='isekai','isekai never drawn');
    for(const r of G0.rivals||[])ok(r.roster.every(m=>m.bg!=='isekai'),'isekai never in a rival roster');ok(n>200,'recruits looked at: '+n);
    const evs=Object.values(X.EVENTS).map(e=>String(e.opts&&e.opts.map(o=>o.go).join())).join();ok(!/evRecruit\(['"]isekai/.test(evs),'no event recruits one') }
  X.NCS.origin='isekai';const h=X.ncOriginHTML();ok(h.includes(`ncSet('origin','isekai')`)&&h.includes('The Isekai'),'the setup dialog offers it');
  ok(X.ACH.isekaicrisis&&X.ACH.isekaicrisis.icon==='or-isekai','its feat') }

section('making the hero, RPG (headless, through the creation screens)');
{ const shown=create(SEED,RPG),G=X.G,m=G.roster[0],sp=X.isekaiSpec(RPG);
  ok(G.origin==='isekai'&&G.isekai&&G.isekai.mode==='rpg'&&G.isekai.hero===m.id&&G.roster.length===1,'one hero, RPG: '+JSON.stringify(G.isekai));
  ok(!/[<>"'&=]/.test(m.name)&&m.name.length<=X.ISK.nameMax&&m.name===G.isekai.name&&m.name.length>0,'the name is sanitised: '+m.name);
  for(const h of shown){ok(!h.includes('<img src=x')&&!/<img[^>]*onerror/i.test(h),'no injected tag in any creation sheet')}
  ok(shown.some(h=>h.includes(X.htmlEsc(BAD))),'the raw name typed is shown escaped in its field');
  ok(Object.keys(m.tal).length===3&&RPG.tal.every(k=>m.tal[k]===3)&&X.ISK.stats.filter(k=>!RPG.tal.includes(k)).every(k=>!m.tal[k]),'exactly three stats at three stars: '+JSON.stringify(m.tal));
  ok(m.trees.filter(k=>X.MAST[k].kind==='style').join()===RPG.trees.join()&&m.gift==='qi'&&m.trees.includes('qi'),'style trees and gift as chosen: '+m.trees.join());
  ok(X.weaponTypes(m).join()==='flintlock'&&!X.BG.isekai.wt.includes('flintlock'),'the weapon family as chosen, outside the background');ok(X.armorTrees(m).join()==='heavyarmor','the armor tree as chosen, outside the background');
  ok(X.mercTrees(m).map(x=>x.key).join()===RPG.trees.concat(['qi','weapons','heavyarmor']).join(),'the talent screen lists exactly those trees: '+X.mercTrees(m).map(x=>x.key).join());
  const O=X.perkOptions(m);ok(O.filter(o=>o.kind==='weapon').every(o=>o.perk.wt==='flintlock')&&O.some(o=>o.kind==='weapon'),'the weapon tree offers only the firearm perk');
  ok(O.every(o=>o.kind!=='armor'||o.key==='heavyarmor'),'only the heavy armor tree');
  ok(X.ITEMS[m.eq.w].wt==='flintlock'&&X.armorClass(m)==='heavy'&&m.eq.b==='knife','kit: a firearm, heavy armor, a knife: '+JSON.stringify(m.eq));ok(m.cond&&m.cond.a<X.ITEMS[m.eq.a].arm,'the heavy kit comes battered');
  ok(m.lvl===1&&m.race==='human'&&m.bg==='isekai'&&X.BG[m.bg].n==='Isekai'&&m.traits.length===0&&Number.isInteger(m.pseed),'level 1 human of the Isekai background, with a face of their own');
  ok(G.crowns>=1200||(G.mods&&G.mods.length),'1,200 crowns (twists aside): '+G.crowns);ok(!X.isSolo()&&X.canRecruit()&&X.recruitWhy()==='','RPG: not solo, recruits welcome');
  // the trees bind: another family's perk and another armor class's cannot be learned; autoLearn keeps to the chosen trees
  const wp=X.MAST.weapons.tiers.flat().find(p=>p.wt==='sword'),hv=X.MAST.lightarmor.tiers[0][0];m.lvl=9;m.pp=5;ok(!X.canLearn(m,wp.id)&&!X.canLearn(m,hv.id),'no sword perk, no light armor perk');
  X.gainXP(m,X.XPT[9]-m.xp);m.pp=12;const got=X.autoLearn(m),keys=new Set(RPG.trees.concat(['qi','weapons','heavyarmor']));
  ok(got.length>0&&m.perks.every(id=>keys.has(X.perkById(id).key))&&m.perks.filter(id=>X.perkById(id).kind==='weapon').every(id=>X.perkById(id).perk.wt==='flintlock'),'autoLearn keeps to the chosen trees: '+got.join());
  // a merc of the isekai background without the choice is a plain recruit
  const q=X.newMerc('isekai');ok(!q.cc&&X.weaponTypes(q).every(w=>X.BG.isekai.wt.includes(w)),'cc only on the hero');
  console.log('  '+m.name+': '+m.trees.join(', ')+'; '+m.eq.w+'/'+m.eq.a+'/'+m.eq.h) }

section('making the hero, Solo');
{ const G=freshI(SEED+1,SOLO),m=G.roster[0];ok(G.isekai.mode==='solo'&&X.isSolo()&&!X.canRecruit()&&X.recruitWhy()==='You ride alone','solo: nobody can join');
  ok(m.name==='Hana Sato'&&m.lvl===3&&m.pend===2&&m.pp===3,'level 3 with two level-ups and three points');ok(X.ITEMS[m.eq.w].wt==='throwing'&&X.armorClass(m)==='light','kit: throwing arms, light armor');
  ok(X.weaponTypes(m).join()==='throwing'&&X.armorTrees(m).join()==='lightarmor'&&!m.gift&&X.mercStyle(m)==='ranged','throwing, light, no gift, a ranged style');
  ok(['rs','rd','brv'].every(k=>m.tal[k]===3)&&Object.keys(m.tal).length===3,'three stars on ranged skill, ranged defense, resolve');
  const p1=X.ctrPayBase(2);G.isekai.mode='rpg';const p0=X.ctrPayBase(2);G.isekai.mode='solo';ok(p1>p0,`contracts pay as for two swords: ${p1} > ${p0}`);
  // every recruit path is closed
  G.crowns=1e6;X.openTown(0);const t=G.towns[0];if(!t.recruits.length)t.recruits.push(X.newMerc('sellsword'));X.townTab='tavern';X.hire(0);ok(G.roster.length===1,'the tavern refuses');
  G.townOpen=false;closeAll(X);X.seedRng(9);ok(X.evRecruit('farmhand',1)===null&&G.roster.length===1,'an event recruit refuses');
  const html=X.twSoloTavern({list:'<div class="pn-sec">x</div>',detail:'',foot:''});ok(/stranger from another world/.test(html.detail),'the tavern says why');
  const F=Object.keys(X.FOLLOWERS).find(k=>X.followerCan(k).ok);ok(F&&X.hireFollower(F)&&G.roster.length===1,'a follower still joins the retinue') }

section('RPG hires');
{ const G=freshI(SEED+2,Object.assign({},RPG,{name:'Kenji'}));G.crowns=1e6;X.openTown(0);const t=G.towns[0];if(!t.recruits.length)t.recruits.push(X.newMerc('sellsword'));
  X.townTab='tavern';const n0=G.roster.length;X.hire(0);ok(G.roster.length===n0+1,'a tavern recruit joins the hero');G.townOpen=false;closeAll(X);
  X.seedRng(4);ok(X.evRecruit('farmhand',1)&&G.roster.length===n0+2,'an event recruit joins too') }

section('the hero\'s death ends the run; nobody else\'s does');
{ // RPG: another sword falls, the march goes on
  let G=freshI(SEED+3,Object.assign({},RPG,{name:'Kenji'}));const hero=G.roster[0],ally=X.newMerc('sellsword');ally.field=true;G.roster.push(ally);
  let b=X.startBattle({f:'bandit',mult:1,src:{type:'sim'},quiet:true,foes:['bandit','bandit']});kill(b,ally);for(const u of b.units)if(u.side===1)u.alive=false;
  let res=X.resolveBattle(true);ok(res.dead.length===1&&G.roster.length===1&&G.roster[0]===hero,'the ally dies');let out=X.settleBattle(true);ok(out.kind==='world'&&!G.isekai.lost&&!X.isekaiLost(),'the run goes on: '+out.kind);
  X.mode='world';ok(X.save(),'and still saves');
  // RPG: the hero falls with a sword still standing: the run is over, the last page names the hero
  G=freshI(SEED+4,Object.assign({},RPG,{name:'Kenji'}));const a2=X.newMerc('sellsword');a2.field=true;G.roster.push(a2);X.mode='world';X.save();
  b=X.startBattle({f:'bandit',mult:1,src:{type:'sim'},quiet:true,foes:['bandit','bandit']});kill(b,G.roster[0]);for(const u of b.units)if(u.side===1)u.alive=false;res=X.resolveBattle(true);
  ok(res.dead.length===1&&G.roster.length===1&&G.roster[0]===a2,'the hero dies, one sword stands');
  let last='';const sh0=X.sheet;X.ctx.sheet=(h,c)=>{last=String(h);return sh0(h,c)};X.B.result=res;out=X.afterBattle(1);X.ctx.sheet=sh0;
  ok(out.kind==='wiped'&&out.isekai&&G.isekai.lost===1,'the run ends: '+JSON.stringify(out));ok(/Kenji has fallen/.test(last)&&/run is over/.test(last)&&/Raise a new company/.test(last)&&!/Fight on/i.test(last),'the last page names the hero, no fighting on');
  ok(X.readSave().state==='none'&&!X.save(),'the book is cleared and never written again');ok(X.runsAll()[0]&&X.runsAll()[0].origin==='isekai'&&X.runsAll()[0].kind==='wipe','the chronicle keeps the run');
  closeAll(X);
  // the last page escapes whatever name it is handed
  G.isekai.name=BAD;const eh=X.isekaiEndHTML(5);ok(!eh.includes('<img')&&/has fallen/.test(eh),'the last page escapes the name');
  // Solo: the hero falls, the run ends
  G=freshI(SEED+5,SOLO);b=X.startBattle({f:'beast',mult:1,src:{type:'sim'},quiet:true,foes:['wolf','wolf']});kill(b,G.roster[0]);res=X.resolveBattle(false);
  out=X.settleBattle(false);ok(out.kind==='wiped'&&out.isekai&&out.solo&&G.roster.length===0,'solo: the run ends with the hero: '+JSON.stringify(out));X.B=null;X.mode='world';
  // anything else that takes the hero away: the shell's watch ends it at the next quiet moment
  G=freshI(SEED+6,Object.assign({},RPG,{name:'Kenji'}));G.roster.push(X.newMerc('farmhand'));X.mode='world';closeAll(X);ok(!X.isekaiWatch(),'nothing to watch while the hero lives');
  G.roster.shift();ok(X.isekaiWatch()&&G.isekai.lost===1&&!X.save(),'a hero gone some other way still ends the run');closeAll(X);
  // ...but the usual ways out are closed to the hero
  G=freshI(SEED+7,Object.assign({},RPG,{name:'Kenji'}));const h7=G.roster[0];for(let i=0;i<3;i++)G.roster.push(X.newMerc('farmhand'));
  X.dismiss(0);ok(G.roster[0]===h7,'the hero cannot be dismissed');ok(!X.evLeave(h7,'walks out'),'nor walk out in an event');
  let gone=0;for(let s=0;s<60&&G.roster.length>1;s++){X.seedRng(SEED+s);G.crowns=0;const n=G.roster.length;X.newDay();closeAll(X);if(G.roster.length<n)gone++;ok(G.roster.includes(h7),'the hero never deserts')}
  ok(gone>0,'unpaid swords still desert ('+gone+')') }

section('saves');
{ let G=freshI(SEED+8,RPG);const m0=X.clone(G.roster[0]);X.mode='world';ok(X.save(),'saves');let r=X.readSave();
  ok(r.state==='ok'&&r.g.v===X.SAVEVER&&X.SAVEVER===22,'reads back at v22');const m=r.g.roster[0];
  ok(r.g.origin==='isekai'&&JSON.stringify(r.g.isekai)===JSON.stringify(G.isekai),'origin and mode kept: '+JSON.stringify(r.g.isekai));
  ok(JSON.stringify(m.cc)===JSON.stringify(m0.cc)&&m.pseed===m0.pseed&&JSON.stringify(m.tal)===JSON.stringify(m0.tal)&&m.trees.join()===m0.trees.join(),'the hero keeps trees, choice, face and stars');
  X.continueGame();closeAll(X);ok(X.G.origin==='isekai'&&!X.isSolo()&&X.isekaiHero()&&X.weaponTypes(X.isekaiHero()).join()==='flintlock','continues as the same hero');
  G=freshI(SEED+9,SOLO);X.mode='world';X.save();r=X.readSave();ok(r.g.isekai.mode==='solo'&&X.isSolo(r.g),'solo kept');
  // a broken record is repaired, never trusted
  let raw=JSON.parse(X.store.get(X.slotKey()));raw.isekai.mode='god';X.store.set(X.slotKey(),JSON.stringify(raw));r=X.readSave();ok(r.state==='ok'&&r.g.origin==='free'&&!r.g.isekai,'an unreadable mode: a plain free company');
  raw=JSON.parse(X.store.get(X.slotKey()));raw.origin='isekai';raw.isekai={mode:'solo',hero:raw.roster[0].id,name:BAD};raw.roster[0].cc={wt:'laser',at:'heavyarmor',sty:'melee'};raw.roster[0].pseed=-4;
  X.store.set(X.slotKey(),JSON.stringify(raw));r=X.readSave();ok(r.state==='ok'&&r.g.origin==='isekai'&&!/[<>]/.test(r.g.isekai.name)&&!r.g.roster[0].cc&&r.g.roster[0].pseed===undefined,'a bad name is cleaned, a bad choice and face dropped');
  raw.isekai.hero=99999;X.store.set(X.slotKey(),JSON.stringify(raw));r=X.readSave();ok(r.g.origin==='free','a hero not on the roster: a free company');
  // a v21 save loads exactly as before (the v22 step adds nothing)
  for(const o of [undefined,'slayer','noble']){X.seedRng(SEED+20);X.newGame(true,o?{origin:o}:undefined);closeAll(X);X.mode='world';X.save();const v22=X.store.get(X.slotKey()),old=JSON.parse(v22);old.v=21;
   const mg=X.migrateSave(X.clone(old));ok(mg.v===22&&JSON.stringify(Object.assign({},mg,{v:21}))===JSON.stringify(old),'v21 -> v22 changes nothing ('+(o||'free')+')');
   X.store.set(X.slotKey(),JSON.stringify(old));const a=X.readSave();X.store.set(X.slotKey(),v22);const b=X.readSave();ok(a.state==='ok'&&JSON.stringify(a.g)===JSON.stringify(b.g),'a v21 save loads as the same company ('+(o||'free')+')');ok(!a.g.isekai&&a.g.roster.every(m=>!m.cc),'no Isekai fields appear')} }

section('the default record (an Isekai with no choices: tests, the events sweep)');
{ X.seedRng(SEED+30);X.newGame(true,{origin:'isekai'});closeAll(X);const G=X.G,m=G.roster[0];ok(G.isekai&&G.isekai.mode==='rpg'&&m.name&&Object.keys(m.tal).length===3&&m.cc&&m.cc.wt==='sword','a sensible default hero');
  X.seedRng(SEED+30);X.newGame(true,{origin:'isekai'});closeAll(X);ok(X.G.roster[0].name===m.name&&X.G.seed===G.seed,'seeded: the same seed makes the same hero');
  const s=X.isekaiSpec({tal:['hp','hp','zz','ms'],trees:['vanguard','nope'],wt:'shield',at:'plate',mode:'x',name:'  a<b>c  '},1);
  ok(s.tal.length===3&&new Set(s.tal).size===3&&s.trees.length===4&&s.wt==='sword'&&s.at==='medarmor'&&s.mode==='rpg'&&s.name==='abc','isekaiSpec fills and cleans: '+JSON.stringify(s)) }

if(ARGV.includes('--no-browser')){console.log('\nOK (no browser)');process.exit(0)}
section('the creation screens in a browser, 667x375, Detail High ('+HTML+')');
{ const {chromium}=require('playwright');const b=await chromium.launch();const p=await b.newPage({viewport:{width:667,height:375},deviceScaleFactor:2});const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
  await p.goto('file://'+path.resolve(HTML));await p.waitForTimeout(250);
  await p.evaluate(()=>{SET.detail='high';if(typeof artChanged==='function')artChanged();window.ambNotify=()=>{};newCompanySetup()});await p.waitForTimeout(150);
  const tap=async(sel,why)=>{const e=await p.$(sel);ok(e,why+': '+sel+' is there');await e.scrollIntoViewIfNeeded();const r=await e.boundingBox();ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=667.5&&r.y+r.height<=375.5,why+': '+sel+' on screen '+JSON.stringify(r));await e.click();await p.waitForTimeout(90)};
  // every control of the step on screen once scrolled to, nothing wider than the sheet, head and foot fixed in view
  const check=async(name)=>{const R=await p.evaluate(()=>{const B=document.getElementById('sheetBody'),Y=document.getElementById('iskBody'),F=document.getElementById('iskFoot'),r=e=>{const q=e.getBoundingClientRect();return{l:q.left,t:q.top,r:q.right,b:q.bottom,w:q.width,h:q.height}};
    const over=[...B.querySelectorAll('button,input,.isk-chip,.isk-lead,.isk-sr')].filter(e=>{const q=e.getBoundingClientRect(),s=B.getBoundingClientRect();return q.width>0&&(q.left<s.left-1||q.right>s.right+1)}).map(e=>e.textContent.slice(0,30));
    const clip=[...B.querySelectorAll('button b,button small,.isk-hint')].filter(e=>e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).whiteSpace==='nowrap').map(e=>e.textContent.slice(0,30));
    return{sheet:r(B),body:Y?{sw:Y.scrollWidth,cw:Y.clientWidth,sh:Y.scrollHeight,ch:Y.clientHeight}:null,foot:F?r(F):null,bsw:B.scrollWidth,bcw:B.clientWidth,over,clip,head:[...B.querySelectorAll('.isk-st')].map(r),hint:F?F.querySelector('.isk-hint').textContent:''}});
   ok(R.body&&R.foot,name+': body and foot');ok(R.sheet.l>=0&&R.sheet.t>=0&&R.sheet.r<=667.5&&R.sheet.b<=375.5,name+': the sheet fits the screen '+JSON.stringify(R.sheet));
   ok(R.bsw<=R.bcw+1&&R.body.sw<=R.body.cw+1,name+': nothing overflows sideways ('+R.bsw+'/'+R.bcw+', '+R.body.sw+'/'+R.body.cw+')');ok(!R.over.length,name+': controls inside the sheet: '+R.over.join('|'));ok(!R.clip.length,name+': no clipped label: '+R.clip.join('|'));
   ok(R.foot.b<=375.5&&R.foot.t>=R.sheet.t&&R.foot.h>=44,name+': the foot (Back, Next) on screen');ok(R.head.length===8&&R.head.every(h=>h.r<=R.sheet.r&&h.h>=30&&h.w>=28),name+': eight step buttons in the head');
   ok(R.body.ch>=150,name+': room for the choices ('+R.body.ch+'px)');return R};
  const btn=t=>`#iskBody button:has-text("${t}")`;
  await tap('#ncsOpts .ncs-or:has-text("The Isekai")','origin');ok(await p.evaluate(()=>NCS.origin==='isekai'&&document.getElementById('ncsGoB').textContent==='Make your hero'),'The Isekai chosen; Begin reads Make your hero');
  await tap('.ncs-go','begin');await check('name');
  await p.fill('#iskName',BAD);await p.waitForTimeout(60);ok(await p.evaluate(()=>!document.querySelector('#sheetBody img[src="x"]')&&/^img srcx onerror/.test(document.getElementById('iskCap').textContent)&&!/[<>=]/.test(document.getElementById('iskCap').textContent)),'the name preview is cleaned, nothing injected');
  await p.fill('#iskName','Sora Kirigaya');await tap('#iskBody .isk-dice','another face');await tap('.isk-next','next');
  await check('talents');for(const s of ['Hitpoints','Melee skill','Melee defense'])await tap(btn(s),'talent');await tap('.isk-next','next');
  await check('trees');for(const s of ['Vanguard','Duelist','Survivor','Twin blades'])await tap(btn(s),'tree');await tap('.isk-next','next');
  await check('weapon');await tap(btn('Sword'),'weapon');await tap('.isk-next','next');
  await check('armor');await tap(btn('Medium armor'),'armor');await tap('.isk-next','next');
  await check('gift');await tap(btn('Aura arts'),'gift');await tap('.isk-next','next');
  await check('mode');await tap(btn('RPG'),'mode');await tap('.isk-next','next');
  const S=await check('summary');ok(await p.evaluate(()=>/Sora Kirigaya/.test(document.getElementById('iskBody').textContent)&&document.querySelectorAll('#iskBody .isk-chip').length>=9),'the summary lists the hero');
  await tap('.isk-back','back');ok(await p.evaluate(()=>ISKS.step===6),'Back from the summary');await tap('.isk-next','next');
  for(let i=0;i<8;i++)await tap('.isk-back','back');ok(await p.evaluate(()=>NCS.open&&!!document.getElementById('ncsOpts')&&NCS.origin==='isekai'),'Back from the name returns to the company dialog, choices kept');
  await tap('.ncs-go','begin again');ok(await p.evaluate(()=>ISKS.step===0&&ISKS.name==='Sora Kirigaya'&&ISKS.trees.length===4),'the hero is still as made');
  for(let i=0;i<7;i++)await tap('.isk-next','next');await tap('.isk-next','Begin');await p.waitForTimeout(400);
  const W=await p.evaluate(()=>({mode,o:G.origin,i:G.isekai,n:G.roster.length,nm:G.roster[0].name,hd:typeof hdArt==='function'?hdArt():null,sheet:document.getElementById('sheetBody').textContent}));
  ok(W.mode==='world'&&W.o==='isekai'&&W.i.mode==='rpg'&&W.n===1&&W.nm==='Sora Kirigaya'&&W.hd===true,'the world with the hero, Detail High: '+JSON.stringify({o:W.o,i:W.i,n:W.n}));ok(/Sora Kirigaya starts at level 1/.test(W.sheet),'the opening page speaks of the hero');
  // the background reads "Isekai" in the roster, on the character screen (with the talents) and in the inspect panel
  const BGT=await p.evaluate(()=>{closeSheet(true);companySheet();const ro=document.getElementById('pn').innerText;mercSheet(0);const ch=document.getElementById('pn').innerText;closePanel();
   const bt=startBattle({f:'bandit',mult:1,src:{type:'sim'},quiet:true,foes:['bandit']}),u=bt.units.find(x=>x.side===0&&x.m===G.roster[0]),d=document.createElement('div');d.innerHTML=unitCard(u);const ins=d.textContent;B=null;mode='world';closeSheet(true);return{ro,ch,ins}});
  ok(/Isekai/.test(BGT.ro)&&!/outlander/i.test(BGT.ro),'the roster card shows Isekai');ok(/HUMAN ISEKAI|Human Isekai/i.test(BGT.ch)&&/Vanguard/.test(BGT.ch),'the character and talent screen shows Isekai: '+BGT.ch.slice(0,80));
  ok(/Human Isekai/.test(BGT.ins),'the inspect panel shows Isekai: '+BGT.ins.slice(0,60));
  // the game over page, in the browser
  await p.evaluate(()=>{closeSheet(true);const a=newMerc('sellsword');a.field=true;G.roster.push(a);const b=startBattle({f:'bandit',mult:1,src:{type:'sim'},quiet:true,foes:['bandit']});const u=b.units.find(x=>x.side===0&&x.m===G.roster[0]);
   u.flags=Object.assign({},u.flags,{lucky:0,undying:0});let n=0;do{u.alive=true;u.hp=1;u.down=false;killUnit(u,null,false)}while(u.down&&++n<50);for(const e of b.units)if(e.side===1)e.alive=false;b.result=resolveBattle(true);afterBattle(1)});
  await p.waitForTimeout(300);const E=await p.evaluate(()=>{const B=document.getElementById('sheetBody'),q=B.getBoundingClientRect(),bt=[...B.querySelectorAll('button')].map(e=>e.getBoundingClientRect());return{t:B.textContent,ok:q.right<=667.5&&q.bottom<=375.5,bt:bt.every(r=>r.bottom<=375.5&&r.right<=667.5&&r.height>=44)}});
  ok(/Sora Kirigaya has fallen/.test(E.t)&&/run is over/.test(E.t)&&E.ok&&E.bt,'the game-over page names the hero and fits: '+E.t.slice(0,80));
  ok(!errs.length,'no page errors: '+errs.join(' | '));await b.close();console.log('  every step on screen, nothing overflowing; world and game over: ok') }
console.log('\nOK');process.exit(0)})().catch(e=>fail(e&&e.stack||e));
