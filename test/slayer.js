// Monster hunter tree and the Solo (Beast Slayer) origin. Plain node, no browser:  node test/slayer.js [--seed N]
// Loads src/*.js the way build.js concatenates them (the vm harness of test/company.js) and checks the tree data and tier levels,
// kill counting, the bonus and its caps, forecast exactness against quarry, wyverns never counting, the solo campaign, every recruit
// path refused with its reason, followers still hireable, and the save round trip and v11 migration.
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
const fresh=(s,origin)=>{X.seedRng(s);X.newGame(true,origin?{origin}:undefined);closeAll(X);return X.G};
(async()=>{
const Q=X.QUARRY,M=X.MAST.hunter;

section('the Monster hunter tree');
{ ok(M&&M.kind==='hunter'&&M.tiers.length===9&&M.tiers.every(t=>t.length===1),'MAST.hunter: 9 tiers of one perk');
  const want=[['hunter.gob','gob gobarch gobsham',.5,30],['hunter.spider','spider',.5,30],['hunter.wolf','wolf',.5,30],['hunter.dead','skel zomb skelhal necro',1,15],
   ['hunter.serpent','adder viper gserp',1,15],['hunter.bear','bear',1.5,10],['hunter.rift','imp vknight vmage tyrant',1.5,10],['hunter.ent','thorn ent elder',2.5,6],['hunter.ogre','ogre aogre',2.5,6]];
  want.forEach(([k,en,per,cap],i)=>{const p=M.tiers[i][0],q=Q[k];ok(p.id===k&&q&&q.en.join(' ')===en&&q.per===per&&q.cap===cap,'tier '+(i+1)+' is '+k);
   ok(q.en.every(e=>X.EN[e]),k+': every EN id exists');ok(X.tierLevel('hunter',i+1)===i+1,'tier '+(i+1)+' opens at level '+(i+1));
   ok(p.d.includes('+'+per+'% damage')&&p.d.includes('up to '+cap)&&p.d.includes('+'+(X.QUARRYB+per*cap)+'% damage')&&p.d.includes('+'+Math.floor(per*cap/2)+' to hit'),k+': exact numbers in the text: '+p.d);
   ok(X.QUARRYB+per*cap===20&&Math.floor(per*cap/2)===7,k+': tops out at +15% (plus 5) and +7 to hit');
   ok(p.d.includes('half that to hit, rounded down'),k+': the to-hit rule in the text');
   ok(X.perkById(k)&&X.perkById(k).kind==='hunter','perkById knows '+k)});
  ok(Object.keys(Q).length===9,'nine quarries');for(const e of ['wyvern','whatch'])ok(!X.QUARRYOF[e]&&X.EN[e],e+' is never a quarry');
  for(const b of ['slayer','hunter','poacher','witchhunter','wildling'])ok(X.BG[b].ht&&X.hunterTrees({bg:b}).join()==='hunter',b+' may learn it');
  for(const b of Object.keys(X.BG))if(!['slayer','hunter','poacher','witchhunter','wildling'].includes(b))ok(!X.hunterTrees({bg:b}).length,b+' may not');
  X.seedRng(SEED);fresh(SEED);const h=X.newMerc('hunter'),s=X.newMerc('sellsword');
  ok(X.mercTrees(h).some(x=>x.key==='hunter'&&x.kind==='hunter')&&!X.mercTrees(s).some(x=>x.key==='hunter'),'mercTrees: the hunter has it, the sellsword not');
  ok(JSON.stringify(h.slain)==='{}','a new merc starts with an empty tally');
  h.pp=3;X.gainXP(h,X.XPT[3]-h.xp);ok(X.canLearn(h,'hunter.wolf')&&!X.canLearn(h,'hunter.dead'),'level 3: tiers 1-3 open, tier 4 not yet');
  ok(X.learnPerk(h,'hunter.wolf')&&h.perks.includes('hunter.wolf'),'learn Wolf-slayer');ok(!X.canLearn(s,'hunter.gob'),'the sellsword cannot learn it');
  s.perks.push('hunter.gob');const p0=s.pp,n=X.refundTrees(s);ok(n===1&&!s.perks.includes('hunter.gob')&&s.pp===p0+1,'refundTrees takes back a hunter perk the background may not have');
  console.log('9 tiers, levels 1..9, exact texts, wyverns never, who may learn it: ok') }

section('the bonus and its caps');
{ fresh(SEED+1);const m=X.newMerc('slayer');X.gainXP(m,X.XPT[9]-m.xp);m.pp=9;
  for(const k in Q){let I=X.quarryInfo(m,k);ok(I.slain===0&&!I.learned&&I.dmg===0&&I.hit===0,k+': nothing before it is learned');
   ok(X.learnPerk(m,k),'learn '+k);I=X.quarryInfo(m,k);ok(I.dmg===5&&I.hit===0&&I.learned,k+': +5% the moment it is learned');
   const q=Q[k];for(const n of [1,2,3,q.cap-1,q.cap,q.cap+7,500]){m.slain[k]=n;I=X.quarryInfo(m,k);const s=Math.min(n,q.cap);
    ok(I.dmg===5+q.per*s&&I.hit===Math.floor(s*q.per/2)&&I.stack===s&&I.full===(n>=q.cap),`${k} at ${n} slain: +${I.dmg}% / +${I.hit}`);
    ok(I.text===`${n} slain: +${I.dmg}% damage, +${I.hit} to hit${n>=q.cap?' (full)':''}`,'stack text: '+I.text)}
   m.slain[k]=0}
  m.slain['hunter.gob']=12;ok(X.quarryInfo(m,'hunter.gob').text.startsWith('12 slain: +11% damage, +3 to hit'),'12 goblins: +11%, +3');
  m.slain['hunter.gob']=15;ok(X.quarryInfo(m,'hunter.gob').text.startsWith('15 slain: +12.5% damage, +3 to hit'),'15 goblins: +12.5%, +3');
  m.slain['hunter.ogre']=6;ok(X.quarryInfo(m,'hunter.ogre').text==='6 slain: +20% damage, +7 to hit (full)','6 ogres: +20%, +7 (full)');
  console.log('per-kill steps, caps and the +5% base: ok') }

// a battle with the slayer against named foes; returns B
function arena(foes,setup){const G=fresh(SEED+2,'slayer');const m=G.roster[0];if(setup)setup(m,G);m.hp=X.calc(m).hp;
 const b=X.startBattle({f:'beast',mult:1,src:{type:'sim'},quiet:true,foes,turnCap:4000});ok(b,'battle starts');return{b,m,G}}
section('kill counting');
{ const {b,m}=arena(['wolf','wolf','wyvern','spider']);const u=b.units.find(x=>x.side===0),E=b.units.filter(x=>x.side===1);
  const w1=E.find(x=>x.eid==='wolf'),wy=E.find(x=>x.eid==='wyvern'),sp=E.find(x=>x.eid==='spider');
  X.hurt(w1,9999,1,u,{});ok(!w1.alive&&m.slain['hunter.wolf']===1,'a killing blow on a direwolf counts (perk not learned yet)');
  X.hurt(wy,9999,1,u,{});ok(!wy.alive&&Object.keys(m.slain).length===1,'a wyvern never counts');
  X.hurt(sp,9999,1,null,{});ok(!m.slain['hunter.spider'],'a death with no killer (burning, bleeding, a fall) counts for nobody');
  const w2=E.filter(x=>x.eid==='wolf')[1];X.hurt(w2,9999,1,w1,{});ok(m.slain['hunter.wolf']===1,'a foe killing a foe credits no merc');
  X.B=null;X.mode='world';
  // a rival's merc is credited too, and a merc killed is no quarry
  const G=fresh(SEED+3);const r=G.rivals[0],rm=r.roster[0];ok(rm.slain&&typeof rm.slain==='object','rival mercs carry a tally');
  const b2=X.startBattle({f:'beast',mult:1,src:{type:'sim'},quiet:true,foes:['bear','bear']});const ru={side:1,m:rm,alive:true},bear=b2.units.find(x=>x.eid==='bear');
  ok(X.countSlain(ru,bear)==='hunter.bear'&&rm.slain['hunter.bear']===1,'a rival merc lands the blow: its tally counts');
  const pu=b2.units.find(x=>x.side===0);ok(X.countSlain(ru,pu)===null,'killing a merc counts for no quarry');X.B=null;X.mode='world';
  console.log('killing blows count per merc and species; wyverns, no-killer deaths and mercs never: ok') }

section('strike and forecast are exact against a quarry');
await (async()=>{let n=0,hits=0,kills=0;const ri0=k=>5+k;
  for(let s=0;s<8;s++){const {b,m}=arena(['ogre','aogre'],(m)=>{X.gainXP(m,X.XPT[9]-m.xp);m.pp=20;X.learnPerk(m,'hunter.ogre');m.slain['hunter.ogre']=s;m.eq.w='warspear'});
   const u=b.units.find(x=>x.side===0),E=b.units.filter(x=>x.side===1),a=X.abilityInfo(u,'attack');
   for(const t of E){t.alive=false}const t=E[s%2];t.alive=true;   // one foe, set next to the slayer on a free tile
   const spots=[[0,-1],[1,0],[-1,0],[0,1]].map(([dc,dr])=>[u.c+dc,u.r+dr]).filter(([c,r])=>X.inb(c,r));let placed=false;
   for(const [c,r] of spots){const o=t.c,p=t.r;t.c=c;t.r=r;if(X.mdist(u,t)===1&&!b.units.some(x=>x!==t&&x!==u&&x.alive&&X.mdist(x,t)===0)){placed=true;break}t.c=o;t.r=p}
   if(!placed){X.B=null;X.mode='world';continue}
   const qv=X.quarryVs(u,t),I=X.quarryInfo(m,'hunter.ogre');ok(qv.key==='hunter.ogre'&&Math.abs(qv.dmg-I.dmg/100)<1e-9&&qv.hit===I.hit,'quarryVs matches quarryInfo');
   ok(X.quarryVs(u,u).key===null,'no quarry bonus against a merc');
   const f=X.forecast(u,t,a),h1=X.hitChance(u,t,a),perks=m.perks.slice();m.perks=m.perks.filter(k=>k!=='hunter.ogre');const h0=X.hitChance(u,t,a),f0=X.forecast(u,t,a);m.perks=perks;
   ok(h1===Math.min(95,Math.max(5,h0+qv.hit)),`hit with the perk ${h1} = ${h0} + ${qv.hit}`);
   ok(f.quarry&&f.quarry.key==='hunter.ogre'&&f.quarry.dmg===I.dmg&&f.quarry.hit===I.hit&&f.quarry.text===`Ogre-slayer: +${I.dmg}% damage${I.hit?', +'+I.hit+' to hit':''}`,'forecast.quarry: '+(f.quarry&&f.quarry.text));
   ok(f0.quarry===null&&f.dmgMax>f0.dmgMax&&f.dmgMin>=f0.dmgMin,'without the perk: no quarry line and less damage');
   for(let k=0;k<30;k++){t.hp=k%3===2?ri0(k):t.hpMax;t.arm=t.armMax;t.helm=t.helmMax;t.alive=true;t.st={};u.ap=99;u.fat=0;
    const s0=X.rngState(),F=X.forecast(u,t,a);ok(X.rngState()===s0,'forecast draws no randomness');let ev=null;const on0=X.FX.on;
    X.FX.on=(ty,d)=>{if(ty==='hit'&&d.t===t&&!ev)ev=d;if(on0)on0(ty,d)};const sl0=m.slain['hunter.ogre']||0;
    try{await X.strike(u,t,a)}finally{X.FX.on=on0}n++;
    if(ev){hits++;ok(ev.dmg>=F.hpMin&&ev.dmg<=F.hpMax&&ev.armor>=F.armMin&&ev.armor<=F.armMax,`hit ${ev.dmg}/${ev.armor} outside the forecast ${F.hpMin}-${F.hpMax}/${F.armMin}-${F.armMax}`)}
    if(!t.alive){kills++;ok(m.slain['hunter.ogre']===sl0+1,'the kill adds to the tally');ok(F.kill,'a kill the forecast called impossible')}}
   X.B=null;X.mode='world'}
  ok(hits>40&&kills>0,`enough real hits (${hits}) and kills (${kills})`);
  console.log(`${n} strikes, ${hits} hits inside the forecast, ${kills} kills counted; hit and damage parts exact: ok`)})();

section('the Solo: Beast Slayer origin');
{ const O=X.ORIGINS.slayer;ok(O&&O.solo&&O.roster.join()==='slayer'&&O.n==='Solo: Beast Slayer'&&O.rule&&O.d,'ORIGINS.slayer');
  ok(!/if he falls/.test(X.ORIGINS.noble.rule)&&/if the heir falls/.test(X.ORIGINS.noble.rule),'the noble rule is neutral: '+X.ORIGINS.noble.rule);
  const B=X.BG.slayer;ok(B.w===0&&B.noHire&&B.ht&&B.at.length>=1&&B.at.length<=2&&B.wt.length<=5&&B.pool.length>=6,'BG.slayer shape');
  for(let s=0;s<6;s++){const G=fresh(SEED+40+s,'slayer'),m=G.roster[0];ok(G.origin==='slayer'&&G.roster.length===1&&m.bg==='slayer'&&m.field,'one sword, the slayer');
   ok(m.lvl===3&&m.pp===3&&m.traits.includes('beastwise')&&X.traitsValid(m.traits),'level 3, three points, Beast-wise: '+m.traits);
   ok(m.eq.w==='boarspear'&&m.eq.b==='huntxbow'&&m.eq.a==='leather'&&m.eq.h==='cap','the hunting kit');
   ok(X.mercTrees(m).some(x=>x.key==='hunter')&&X.mercTrees(m).some(x=>x.kind==='weapon')&&X.mercTrees(m).some(x=>x.kind==='armor'),'hunter, weapon and armor trees');
   ok(m.hp===X.calc(m).hp&&X.canRecruit()===false&&X.recruitWhy()==='You ride alone'&&X.isSolo(),'full health, solo');
   for(let i=0;i<4;i++){const t=G.towns[i];if(t)ok(t.recruits.every(r=>r.bg!=='slayer'),'no slayer in a tavern')}
   for(const r of G.rivals)ok(r.roster.every(x=>x.bg!=='slayer'),'no slayer in a rival roster')}
  // the rules still take a plain campaign as before
  const G=fresh(SEED+50);ok(X.canRecruit()&&X.recruitWhy()===''&&G.roster.length===4,'a free company recruits');
  console.log('solo campaigns valid: level 3, kit, Beast-wise, trees; never recruited elsewhere: ok') }

section('every way in is closed with a reason');
{ // tavern
  let G=fresh(SEED+60,'slayer');G.crowns=1e6;X.openTown(0);closeAll(X);X.openTown(0);const t=G.towns[0];if(!t.recruits.length)t.recruits.push(X.newMerc('sellsword'));
  X.townTab='tavern';X.townSel&&(X.townSel.tav='rec');const n0=G.roster.length,c0=G.crowns;X.hire(0);ok(G.roster.length===n0&&G.crowns===c0,'tavern hire refused');
  if(typeof X.townView==='function'){}G.townOpen=false;closeAll(X);
  // the parley
  G=fresh(SEED+61,'slayer');G.crowns=1e6;const r=G.rivals.find(x=>x.roster.length>4)||G.rivals[0];r.stance=30;r.hired=null;r.calm=G.day+5;
  const p=X.rivalParty(r)||X.rvSpawn(r);p.x=G.p.x+.2*X.TS;p.y=G.p.y;p.tx=p.x;p.ty=p.y;p.idle=1;
  const P=X.rivalParley(p),h=P&&P.opts.find(o=>o.k==='hire');ok(h&&!h.ok&&h.why==='You ride alone','parley hire shown closed: '+(h&&h.why));
  const res=X.rivalParleyDo(p,'hire');ok(G.roster.length===1&&res.text==='You ride alone','parley hire refused: '+res.text);
  // a beaten rival's sword who asks to join
  const jm=r.roster[0],fake={rival:{id:r.id,n:r.n,dead:[],down:[jm.name],fled:[],ok:[],loot:[],joiner:{id:jm.id,name:jm.name,lvl:jm.lvl,bg:jm.bg,bgN:'x',room:true,solo:true,taken:false,declined:false}}};
  ok(X.rivalJoin(fake)===null&&G.roster.length===1&&r.roster.includes(jm),'a rival joiner refused');
  const html=X.brRival(Object.assign({win:true},fake));ok(/asks to join, but you ride alone/.test(html)&&!/brJoin\(/.test(html),'the results sheet says why and offers no button');
  // events: options that are a recruitment are closed with the reason; the rest say nobody joins
  let hard=0,soft=0;for(const id in X.EVENTS){const D=X.EVENTS[id];if(!Array.isArray(D.opts))continue;D.opts.forEach((o,i)=>{
    const src=String(o.go||'');if(!/evRecruit\(/.test(src))return;ok(o.recruit||o.joins,id+'/'+i+': a recruiting option is marked');
    const c=X.evCtx((D.kind||['travel'])[0],{});c.m=G.roster[0];
    if(o.recruit){hard++;ok(!X.evReqOk(o,c),id+'/'+i+': closed in a solo run');const r2=X.evtResolve(id,c,i);ok(!r2.ok&&G.roster.length===1,id+'/'+i+': does nothing')}
    else{soft++;X.seedRng(SEED+i);const r2=X.evtResolve(id,c,i);ok(r2.ok&&G.roster.length===1,id+'/'+i+': nobody joins');
     if(r2.fx.some(x=>/You ride alone/.test(x.t))||!/evRecruit/.test(src))soft+=0}})}
  ok(hard>=5&&soft>=4,`recruit options: ${hard} closed, ${soft} that say nobody joins`);
  // the closed option shows the reason on the card
  X.eventShow('pitchamp',Object.assign(X.evCtx('town',{town:0}),{}));const shown=String(X.EVS.cur?1:0);ok(shown==='1','the pit champion card shows');
  let last='';const sh0=X.sheet;X.ctx.sheet=h=>{last=h};X.evRender();X.ctx.sheet=sh0;ok(/You ride alone/.test(last)&&/disabled/.test(last),'the card shows the hire greyed with the reason');closeAll(X);X.EVS.cur=null;
  X.seedRng(SEED+9);const r3=X.evRecruit('farmhand',1);ok(r3===null&&G.roster.length===1,'evRecruit refuses');
  // a free company still hires everywhere
  G=fresh(SEED+62);G.crowns=1e6;const n1=G.roster.length;ok(X.evRecruit('farmhand',1)&&G.roster.length===n1+1,'a free company still takes event recruits');
  // followers are not members
  G=fresh(SEED+63,'slayer');G.crowns=1e6;const F=Object.keys(X.FOLLOWERS).find(k=>X.followerCan(k).ok);ok(F&&X.hireFollower(F)&&X.followerHas(F)&&G.roster.length===1,'a follower still joins the retinue: '+F);
  // the team ambitions are never offered
  const offered=X.ambOffer(G);ok(Array.isArray(offered)&&!offered.some(id=>X.AMBITIONS[id]&&X.AMBITIONS[id].team),'no war-band ambitions for one sword');
  console.log('tavern, parley, rival joiner, events (closed / nobody joins), evRecruit refused; followers allowed: ok') }

section('death ends the run; pay and saves');
{ let G=fresh(SEED+70,'slayer');const b=X.startBattle({f:'beast',mult:1,src:{type:'sim'},quiet:true,foes:['wolf','wolf']});const u=b.units.find(x=>x.side===0);u.flags=Object.assign({},u.flags,{lucky:0,undying:0});
  X.seedRng(1);let tries=0;do{u.alive=true;u.hp=1;u.down=false;X.killUnit(u,null,false)}while(u.down&&++tries<50);
  const res=X.resolveBattle(false);ok(res.dead.length===1&&G.roster.length===0,'the slayer dies');const out=X.settleBattle(false);ok(out.kind==='wiped'&&out.solo,'the run ends: '+JSON.stringify(out));
  // pay: a solo run is paid as two swords
  G=fresh(SEED+71,'slayer');const p1=X.ctrPayBase(2);G.origin='free';const p0=X.ctrPayBase(2);G.origin='slayer';ok(p1>p0,`solo pay ${p1} > one-sword pay ${p0}`);
  // save round trip
  G=fresh(SEED+72,'slayer');G.roster[0].slain={'hunter.wolf':7,'hunter.ogre':2,bogus:5,'hunter.gob':-3};X.mode='world';ok(X.save(),'saves');
  const r=X.readSave();ok(r.state==='ok'&&r.g.v===X.SAVEVER,'reads back at the current version');const m=r.g.roster[0];
  ok(JSON.stringify(m.slain)==='{"hunter.wolf":7,"hunter.ogre":2}','the tally is kept, junk dropped: '+JSON.stringify(m.slain));ok(r.g.origin==='slayer','still a solo run');
  // a v11 save: every merc (company, recruits, rivals) gets an empty tally
  G=fresh(SEED+73);X.mode='world';X.save();const raw=JSON.parse(X.store.get(X.SAVEKEY));raw.v=11;
  const strip=m=>{delete m.slain};raw.roster.forEach(strip);raw.towns.forEach(t=>(t.recruits||[]).forEach(strip));raw.rivals.forEach(r=>r.roster.forEach(strip));
  const mg=X.migrateSave(JSON.parse(JSON.stringify(raw)));ok(mg.v===X.SAVEVER,'v11 migrates to the current version');
  const all=[].concat(mg.roster,...mg.towns.map(t=>t.recruits||[]),...mg.rivals.map(r=>r.roster));ok(all.length>10&&all.every(m=>m.slain&&JSON.stringify(m.slain)==='{}'),'every merc has m.slain = {}');
  X.store.set(X.SAVEKEY,JSON.stringify(raw));const r2=X.readSave();ok(r2.state==='ok'&&r2.g.roster.every(m=>JSON.stringify(m.slain)==='{}')&&r2.g.rivals.every(r=>r.roster.every(m=>m.slain)),'a v11 save loads and plays');
  console.log('death ends the run, solo pay, save round trip and the v11 migration: ok') }

section('solo bands');
{ const G=fresh(SEED+9,'slayer'),m=G.roster[0];ok(m.lvl===3&&X.isSolo(),'a level 3 solo run');const day0=G.day;G.day=3;
  const B3=X.battleBudget({f:'beast'}),dk=1+3*.008;ok(Math.abs(B3-(X.SOLOBUD.base+3*X.SOLOBUD.lvl)*dk*X.BUDGETK)<1e-9,'one sword: SOLOBUD at level 3 ('+B3.toFixed(1)+')');
  ok(Math.abs(X.battleBudget({f:'serpent'})-(X.FACT.serpent.solo[0]+3*X.FACT.serpent.solo[1])*dk*X.BUDGETK)<1e-9,'serpents follow their own solo line');
  for(let i=0;i<40;i++){X.seedRng(SEED+i);const L=X.buildEnemies('ogre',X.battleBudget({f:'ogre'}),null,1);ok(L.length===1&&L[0]==='ogre','an ogre band against one sword at level 3 is one ogre: '+L.join())
   X.seedRng(SEED+i);const W=X.buildEnemies('beast',B3,null,1);ok(W.length>=1&&W.length<=X.SOLOMAX,'a beast band of 1..'+X.SOLOMAX+': '+W.join())}
  G.origin='free';const Bc=X.battleBudget({f:'beast'});ok(Math.abs(Bc-(12+5*3)*dk*X.BUDGETK)<1e-9,'a company keeps 12 + 5 a level');
  X.seedRng(SEED);const L=X.buildEnemies('ogre',Bc,null,1);ok(!L.includes('ogre'),'a company that poor meets the goblins, as before: '+L.join());
  G.origin='slayer';G.day=day0;console.log('solo budget lines, the lone ogre, at most '+X.SOLOMAX+' foes; companies unchanged: ok') }
console.log('\nOK');process.exit(0)})().catch(e=>fail(e&&e.stack||e));
