// Firearms balance test (the firearms rebalance): guns against the bows and crossbows of their tier. Plain node:  node test/firearms.js [--seed N] [--n N]
// Checks the catalog (no firearm worse than -5 to hit; every firearm below tier 4, and the musket, fires once a turn standing still: shot +
// reload within a turn's 9 AP; with Ramrod drill every gun but the wall gun does), then a shooting range on a flat arena: a shooter of the
// tier's ranged skill against two foes of the tier at 2, 4 and 6 tiles. The displayed hit chance (hitChance, which forecast() shows: checked
// equal) of every gun at its range is within 15 points of the tier's bows and crossbows at that range, and the expected hitpoint damage over
// two turns (shoot when loaded, else reload; seeded) of the tier's best gun is 0.8 to 2.25 times the tier's best crossbow and at least half
// its best bow's (0.4 with the mastery perks: Nimble fingers looses three light arrows a turn), without the weapon mastery perks and with them (Nimble fingers, Crank drill, Ramrod drill): guns land their big, piercing shots about as often as a
// crossbow fires, and stay one shot a turn.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ARGV=process.argv.slice(2),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261119,NT=ARGV.includes('--n')?+ARGV[ARGV.indexOf('--n')+1]:40,SRC=path.join(__dirname,'..','src');
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

const X=makeContext(),ITEMS=X.ITEMS,BW=X.BW,BH=X.BH,FAM=['bow','crossbow','flintlock'],MPERK={bow:'weapons.bow',crossbow:'weapons.crossbow',flintlock:'weapons.flintlock'};
const RS={1:50,2:55,3:62,4:68,5:75},TGT={1:['thug','gob'],2:['skel','bxbow'],3:['orcw','braid'],4:['samurai','barbhus'],5:['vknight','orcl']};   // the tier's shooter and two foes it meets
const W=Object.keys(ITEMS).filter(id=>{const i=ITEMS[id];return i.k==='w'&&FAM.includes(i.wt)&&!i.uniq&&!/^fb:|^lg_/.test(id)&&i.price>0});
const GUNS=W.filter(id=>ITEMS[id].wt==='flintlock');
(async()=>{
section('the catalog');
{ ok(GUNS.length>=13,'the firearms: '+GUNS.join(','));const AP=9;
  for(const id of GUNS){const it=ITEMS[id],rl=it.reload&&it.reload.ap;ok(rl>0,id+': a firearm reloads');ok((it.hit||0)>=-5,id+': '+it.hit+' to hit (no firearm worse than -5)');
   if(it.tier<=3||id==='musket')ok(it.ap+rl<=AP,`${id} (tier ${it.tier}): ${it.ap} AP to fire + ${rl} to reload does not fit a turn`);
   if(id!=='wallgun')ok(it.ap+Math.max(2,rl-2)<=AP,`${id}: with Ramrod drill it should fire every turn`)}
  ok(ITEMS.handgonne.hit===undefined||ITEMS.handgonne.hit>=(ITEMS.huntbow.hit||0),'the hand cannon aims no worse than the hunting bow');
  console.log(GUNS.length+' firearms: no worse than -5 to hit, once a turn below tier 4 (and the musket), every turn with the drill but the wall gun: ok') }

section('the shooting range');
{ X.seedRng(SEED);X.newGame(true);closeAll(X);X.FX.on=null;
  const merc=(w,perks)=>{const m=X.newMerc('hunter');m.traits=[];m.perks=perks.slice();m.pp=0;m.eq.w=w;m.eq.b=null;m.eq.s=null;m.eq.a='padded';m.eq.h=null;m.eq.c=null;m.inj=[];m.field=true;m.hp=X.calc(m).hp;return m};
  const setup=async(m,tid)=>{const G=X.G;G.roster=[m];X.seedRng(SEED+7);const b=X.startBattle({f:'bandit',mult:1,biome:'plains',src:{type:'sim'},quiet:true,turnCap:6000,foes:[tid]});ok(b,'the range did not open');
   let n=0;while(!b.over&&(b.busy||b.cur.side!==0)){await null;if(++n>3e6)fail('the range never reached the shooter')}
   b.tiles.forEach(t=>{t.t='ground';t.h=0});const u=b.units.find(x=>x.side===0),t=b.units.find(x=>x.side===1&&x.eid===tid);ok(u&&t,'no shooter or no '+tid);
   b.units.forEach(x=>{if(x!==u&&x!==t){x.alive=false;x.gone='fled';x.c=-9;x.r=-9}});b.order=[];b.cur=u;return{b,u,t}};
  const place=(S,d)=>{S.u.c=Math.floor(BW/2);S.u.r=BH-1;S.t.c=S.u.c;S.t.r=S.u.r-d};
  // two turns standing still: shoot while it can, else reload; the target cannot fall (its hitpoints are raised), its armor wears as in play
  const volley=async(S,d)=>{const {b,u,t}=S;place(S,d);t.alive=true;t.hpMax=t.hp=5000;t.arm=t.armMax;t.helm=t.helmMax;t.st={};t.mor=3;t.fearless=true;t.dnc=0;
   u.st={};u.mor=3;u.used={};u.primed=0;u.smoke=0;X.initLoad(u);let dmg=0;const tk=t.r*BW+t.c;
   for(let k=0;k<2;k++){u.ap=u.apMax;u.mvd=0;u.fat=0;for(let g=0;g<12;g++){const a=X.abilityInfo(u,'attack');
     if(X.canUse(u,a)&&X.validTargets(u,a).has(tk)){const hp0=t.hp;b.busy=false;await X.useAbility(u,a,tk);dmg+=hp0-t.hp;continue}
     const r=X.abilityInfo(u,'reload');if(u.abs.includes('reload')&&X.canUse(u,r)){b.busy=false;await X.useAbility(u,r,u.r*BW+u.c);continue}break}}
   return dmg};
  const R={};let nf=0;
  for(const id of W){const it=ITEMS[id],T=it.tier;for(const mast of [0,1]){const r={id,wt:it.wt,T,mast,hit:{},dmg:0};
    for(const tid of TGT[T]){const S=await setup(merc(id,mast?[MPERK[it.wt]]:[]),tid);S.u.rs=RS[T];
     for(const d of [2,4,6]){if(d>S.u.wpn.rng)continue;place(S,d);const a=X.abilityInfo(S.u,'attack'),h=X.hitChance(S.u,S.t,a),f=X.forecast(S.u,S.t,a);ok(f.hit===h,`${id}: forecast ${f.hit} is not hitChance ${h}`);nf++;(r.hit[d]=r.hit[d]||[]).push(h)}
     const d=Math.min(4,S.u.wpn.rng);X.seedRng(SEED+T*13+tid.length);let D=0;for(let i=0;i<NT;i++)D+=await volley(S,d);r.dmg+=D/NT/TGT[T].length;
     ok(isFinite(r.dmg),id+': a broken volley');X.B=null;X.mode='world'}
    for(const d in r.hit)r.hit[d]=r.hit[d].reduce((s,v)=>s+v,0)/r.hit[d].length;(R[T+'|'+mast]=R[T+'|'+mast]||[]).push(r)}}
  const fx=n=>n.toFixed(1);
  for(let T=1;T<=5;T++)for(const mast of [0,1]){const L=R[T+'|'+mast];ok(L,'tier '+T+': no ranged weapons');const guns=L.filter(r=>r.wt==='flintlock'),oth=L.filter(r=>r.wt!=='flintlock');ok(guns.length&&oth.length,'tier '+T+': guns and bows or crossbows');
   for(const g of guns){const d=Math.min(4,ITEMS[g.id].rng),ref=oth.filter(r=>r.hit[d]!=null);if(!ref.length)continue;const m=ref.reduce((s,r)=>s+r.hit[d],0)/ref.length;
    ok(g.hit[d]>=m-15,`${g.id} (tier ${T}) hits ${fx(g.hit[d])}% at ${d} tiles, the tier's bows and crossbows ${fx(m)}%`)}
   const best=L=>L.reduce((a,r)=>r.dmg>a.dmg?r:a),bg=best(guns),bx=best(oth.filter(r=>r.wt==='crossbow')),bb=best(oth.filter(r=>r.wt==='bow')),kx=bg.dmg/bx.dmg,kb=bg.dmg/bb.dmg;
   console.log(`  tier ${T}${mast?' (mastery)':''}: best gun ${bg.id} ${fx(bg.dmg)} hp in two turns; best crossbow ${bx.id} ${fx(bx.dmg)} (x${kx.toFixed(2)}), best bow ${bb.id} ${fx(bb.dmg)} (x${kb.toFixed(2)})`);
   ok(kx>=.8&&kx<=2.25,`tier ${T}${mast?' with the mastery perks':''}: the best gun does x${kx.toFixed(2)} of the best crossbow (${bg.id} ${fx(bg.dmg)} vs ${bx.id} ${fx(bx.dmg)}), outside 0.8..2.25`);
   ok(kb>=(mast?.4:.5),`tier ${T}${mast?' with the mastery perks':''}: the best gun does x${kb.toFixed(2)} of the best bow (${bg.id} ${fx(bg.dmg)} vs ${bb.id} ${fx(bb.dmg)}), below ${mast?.4:.5}`)}
  console.log(nf+' aims forecast as hitChance; every gun within 15 points of its tier at its range, the best gun 0.8..2.25 times the best crossbow, at least half the best bow (0.4 mastered): ok') }
console.log('\nfirearms: all ok');process.exit(0)
})();
