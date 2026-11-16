// Elite enemy modifiers (src/64e-elites.js). Plain node:  node test/elites.js [--seed N] [--quick]
// Loads src/*.js through test/balance.js's context (vm, DOM stubs) and proves:
//   - the catalog is complete (name, exact effect text, weight, pixel icon 16x16 on the palette, painting);
//   - assignment: none for a fresh company, scaled by difficulty (story < normal < hard < brutal) and by level, deterministic
//     for a seed, never on rivals / fixed rosters (unless the entry lists el:[keys]) / EN bosses; the budget buys fewer bodies;
//     the game's own stream (rnd) is not advanced by the assignment; run modifiers (runMod / runModK) scale it when present;
//   - every modifier's effect, strike by strike (ward, armor and its mending, regeneration, AP and initiative, the blink, stun and
//     knockback immunity, heal on hit and kill, damage as it is hurt, venom, hex, range / cover / distance, the command aura,
//     thorns, the explosion, the split);
//   - forecast() stays exact with elites on either side (a directed sweep, every strike checked against the real 'hit' event);
//   - XP and loot of elite foes, whole auto-battles with elites at Hard (they end, no FX error, replay identically);
//   - the HUD pieces (chip, inspect card, forecast badges) and that battles are never saved mid-fight (save() refuses in battle).
'use strict';
process.argv.push('--lib');
const L=require('./balance.js');
const ARGV=process.argv.slice(2),QUICK=ARGV.includes('--quick'),SEED=ARGV.includes('--seed')?+ARGV[ARGV.indexOf('--seed')+1]:20261115,T0=Date.now();
let failed=false,finished=false,checks=0;
function fail(m){failed=true;console.error('\nFAIL: '+m);process.exit(1)}
function ok(c,m){checks++;if(!c)fail(m)}
process.on('unhandledRejection',e=>fail('unhandled rejection: '+(e&&e.stack||e)));
process.on('exit',code=>{if(!finished&&!failed&&code===0){console.error('\nFAIL: stopped before the end');process.exitCode=1}});
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{const X=L.makeContext(),E=X.ELITES,K=Object.keys(E);
 const comp={};for(const P of L.PROFILES)comp[P.id]=L.buildCompany(X,P,SEED+P.lvl);
 const setup=(pid,diff)=>{const P=L.PROFILES.find(p=>p.id===pid);X.G.roster=X.clone(comp[pid]);X.G.diff=diff||'normal';X.G.day=P.day;X.B=null;X.mode='world'};
 const begin=(o,seed)=>{X.seedRng(seed);return X.startBattle(Object.assign({mult:1,src:{type:'test'},quiet:true,auto:true,turnCap:1,onEnd:()=>{}},o))};
 const settle=async b=>{for(let i=0;i<2000&&!b.over;i++)await tick();ok(b.over,'a one-turn battle did not stop');b.busy=true};

 console.log('== catalog ==');
 ok(K.length>=14&&K.length<=16,'there should be 14 to 16 elite modifiers, not '+K.length);
 const PALK=new Set(Object.keys(X.PAL).concat(['.']));
 for(const k of K){const e=E[k],n=e.icon;ok(e.n&&typeof e.d==='function'&&e.w>0&&e.w<1&&['att','def','mob','aura'].includes(e.tone)&&typeof e.apply==='function','elite '+k+' is incomplete');
  const rows=X.ICONS[n];ok(Array.isArray(rows)&&rows.length===16&&rows.every(r=>r.length===16&&[...r].every(c=>PALK.has(c))),'elite '+k+': no 16x16 pixel icon on the palette');
  ok(typeof X.PAINT[n]==='function','elite '+k+': no painting');ok(X.icResolve(n)===n,'elite '+k+': the icon does not resolve to itself')}
 ok(X.ICONS['el-mark']&&X.PAINT['el-mark']&&X.PAINT['el-mark2'],'the elite mark has no icon');
 ok(X.STATUS.eward&&X.STATUS.eward.n&&X.STATUS.eward.d&&X.STATUS.eward.icon,'the ward status is incomplete');
 ok(X.AB.eblink&&X.AB.eblink.uses===1&&X.AB.eblink.tgt==='move','the blink ability is missing');
 for(const k of ['bloodthirsty','shielded','fast','splitting'])ok(E[k],'the owner\'s modifier '+k+' is missing');
 console.log(K.length+' modifiers: '+K.map(k=>E[k].n).join(', '));

 console.log('== assignment ==');
 { setup('L1x4');ok(X.eliteShare({f:'orc'})===0,'a fresh company should meet no elites');
   const sh={};for(const d of ['story','normal','hard','brutal']){setup('L8x9',d);sh[d]=X.eliteShare({f:'orc'})}
   ok(sh.story>0&&sh.story<sh.normal&&sh.normal<sh.hard&&sh.hard<sh.brutal,'the elite share does not rise with difficulty: '+JSON.stringify(sh));
   setup('L4x6');const s4=X.eliteShare({f:'orc'});setup('L12x12');const s12=X.eliteShare({f:'orc'});ok(s4>0&&s4<sh.normal&&sh.normal<s12,'the elite share does not rise with level');
   setup('L8x9');ok(X.eliteShare({f:'orc',rival:'rX'})===0&&X.eliteShare({f:'orc',roster:[]})===0&&X.eliteShare({f:'orc',noElite:1})===0,'rivals, fixed rosters and noElite must have no random elites');
   // run modifiers, when another file provides them
   const c=X.ctx,rm0=c.runMod,rk0=c.runModK;c.runModK=(k,d)=>k==='elite'?2:d;const s2=X.eliteShare({f:'orc'});c.runMod=k=>k==='elites';const s3=X.eliteShare({f:'orc'});c.runMod=rm0;c.runModK=rk0;
   ok(Math.abs(s2-2*sh.normal)<1e-9&&Math.abs(s3-4*sh.normal)<1e-9,'runModK(\'elite\') / runMod(\'elites\') do not scale the share: '+[s2,s3,sh.normal]);
   // counts by difficulty, determinism, no rnd advanced by the assignment
   const count={};let two=0,lead2=0;
   for(const d of ['story','normal','hard','brutal']){let n=0,m=0;for(const f of ['gob','undead','beast','orc','bandit','void'])for(let i=0;i<(QUICK?3:6);i++){setup('L12x12',d);const b=begin({f},SEED+i*31+f.length);
     for(const u of b.units)if(u.elite){n++;m+=u.elite.length;if(u.elite.length>1){two++;if(u.role==='boss'||u.def.lead||u.def.banner||u.def.max)lead2++}
      ok(u.side===1&&u.def&&!u.m&&!u.def.boss&&!u.spawned,'an elite that should not be: '+u.name);ok(u.name.startsWith(E[u.elite[0]].n+' '),'elite name without its prefix: '+u.name);
      for(const k of u.elite)ok(!E[k].ok||E[k].ok(u),u.name+' carries '+k+' it cannot carry')}
     const cap=Math.max(1,Math.round(b.units.filter(X.eliteCan).length*X.ELITE.maxPer));ok(b.units.filter(u=>u.elite).length<=cap+0,'too many elites in one band');
     await settle(b)}
    count[d]=n}
   ok(count.story<count.normal&&count.normal<count.hard&&count.hard<=count.brutal,'elite counts do not rise with difficulty: '+JSON.stringify(count));
   ok(two>0&&lead2===two,'two modifiers should come only on leaders, late and hard: '+two+' / '+lead2);
   const sig=b=>b.units.filter(u=>u.side===1).map(u=>u.name+':'+(u.elite||[]).join('+')+':'+u.hpMax+':'+u.arm).join('|');
   setup('L12x12','hard');const b1=begin({f:'orc'},SEED+5),s1=sig(b1),r1=X.rngState();await settle(b1);setup('L12x12','hard');const b2=begin({f:'orc'},SEED+5),s2b=sig(b2),r2=X.rngState();await settle(b2);
   ok(s1===s2b&&r1===r2,'elite assignment is not deterministic for a seed');ok(b1.units.some(u=>u.elite),'the determinism battle had no elites (pick another seed)');
   // the stream: a battle that rolls elites leaves rnd exactly where the same battle without the elite step would (the plan uses a derived stream)
   setup('L12x12','hard');X.seedRng(SEED+5);const pv=X.battlePreview({f:'orc',mult:1}),rA=X.rngState();X.seedRng(SEED+5);X.battlePreview({f:'orc',mult:1});ok(X.rngState()===rA,'battlePreview is not repeatable');
   { const b=X.B=null;void b;setup('L12x12','hard');X.seedRng(SEED+9);const s0=X.rngState();const bb={units:pv.foes.map((id,i)=>{const e=X.mkEnemy(id,'orc');e.id=i;return e})};X.elitePlan(bb,{f:'orc',mult:1},pv);
     ok(X.rngState()===s0,'the elite plan consumed rnd()');X.B=null}
   // the budget: elites take a share of it, so the band buys fewer bodies
   let cE=0,cN=0;for(let i=0;i<20;i++){setup('L8x9','brutal');X.seedRng(SEED+i);cE+=X.previewEnemies({f:'orc',mult:1}).reduce((s,id)=>s+X.eliteCost(id,'orc'),0);X.seedRng(SEED+i);cN+=X.previewEnemies({f:'orc',mult:1,noElite:1}).reduce((s,id)=>s+X.eliteCost(id,'orc'),0)}
   ok(cE<cN,'the elites\' share did not come out of the bodies the budget buys: '+cE+' vs '+cN);
   // fixed rosters carry explicit elites only
   setup('L8x9','normal');const br=begin({f:'void',roster:[{id:'vknight',n:1,lvl:5,el:['shielded','fast']},{id:'imp',n:3,lvl:5}]},SEED+1);
   const vk=br.units.find(u=>u.eid==='vknight');ok(vk&&vk.elite&&vk.elite.join()==='shielded,fast'&&vk.ward>0&&vk.name.startsWith('Shielded '),'a roster entry\'s el:[keys] was not applied');
   ok(br.units.filter(u=>u.side===1&&u.elite).length===1,'a fixed roster rolled random elites');await settle(br);
   console.log(`share at L8: ${Object.entries(sh).map(([k,v])=>k+' '+(v*100).toFixed(1)+'%').join(', ')}; elite modifiers in ${QUICK?18:36} L12 battles: ${JSON.stringify(count)}; ${two} doubled (all leaders); bodies bought ${cE} vs ${cN} without elites`) }

 console.log('== each modifier ==');
 setup('L8x9','normal');const b=begin({f:'orc',foes:['orcw','orcw','orcy','orcy']},SEED+2);await settle(b);
 const BW=X.BW,BH=X.BH,pu=b.units.filter(u=>u.side===0);
 const reset=()=>{for(const tl of b.tiles){tl.t='ground';tl.h=0}for(const x of b.units){x.alive=false;x.c=-20-x.id;x.r=-20}b.tele=[];b.corpses=[];b.rout=[false,false,false];b.fledN=[0,0,0]};
 const at=(u,c,r)=>{u.alive=true;u.gone=null;u.c=c;u.r=r;u.st={};u.buffs=[];u.mor=3;u.hp=u.hpMax;u.arm=u.armMax;u.helm=u.helmMax;u.fat=0;return u};
 const foe=(id,keys,c,r)=>{const e=X.foeSpawn(id,'orc',c,r);ok(e,'could not spawn '+id);e.spawned=0;X.eliteGive(e,keys);e.c=c;e.r=r;return e};
 const hitEv=async(u,t,a,o)=>{let ev=null;const on0=X.FX.on;X.FX.on=(ty,d)=>{if(ty==='hit'&&d.u===u&&d.t===t&&!ev)ev=d};try{await X.strike(u,t,a,o)}finally{X.FX.on=on0}return ev};
 const atk=u=>X.abilityInfo(u,'attack'),me=()=>at(pu[0],6,6);
 // hulking, shielded
 reset();{const p=X.foeSpawn('orcw','orc',8,8);const h0=p.hpMax;p.alive=false;const u=foe('orcw',['hulking','shielded'],8,8);ok(u.hpMax===Math.round(h0*1.4),'Hulking: +40% hitpoints');
  ok(u.ward===Math.max(10,Math.round(u.hpMax*.35))&&u.wardMax===u.ward,'Shielded: the ward is 35% of the hitpoints');ok(X.unitStatuses(u).some(s=>s.key==='eward'&&s.turns===u.ward),'the ward is not listed as a status');
  const m=me();at(u,7,6);u.ward=30;const f=X.forecast(m,u,atk(m),{auto:1}),hp0=u.hp,arm0=u.arm,ev=await hitEv(m,u,atk(m),{auto:1});
  ok(u.ward<30&&ev&&ev.dmg>=f.hpMin&&ev.dmg<=f.hpMax&&arm0-u.arm>=f.armMin&&arm0-u.arm<=f.armMax,'Shielded: the ward did not soak first, or the forecast missed it');
  u.ward=100000;const ev2=await hitEv(m,u,atk(m),{auto:1});ok(ev2&&ev2.dmg===0&&u.hp===hp0-ev.dmg&&u.arm===arm0-(arm0-u.arm),'Shielded: a ward that soaks the whole blow should leave hitpoints and armor alone')}
 // armoured, regen (start of its turn), fast
 reset();{const p=X.foeSpawn('orcw','orc',3,3),a0=p.armMax,i0=p.init,ap0=p.apMax;p.alive=false;const u=foe('orcw',['armoured','regen','fast'],9,2);
  ok(u.armMax>=Math.round(a0*1.4)&&u.flags.armRegen===Math.max(3,Math.round(u.armMax*.1))&&u.flags.regenHP===Math.max(3,Math.round(u.hpMax*.1)),'Armoured / Regenerating: wrong numbers');
  ok(u.apMax===ap0+2&&u.init===i0+25,'Fast: +2 AP and +25 initiative');
  at(pu[0],2,10);u.arm=Math.round(u.armMax/2);u.hp=Math.round(u.hpMax/2);const arm1=u.arm,hp1=u.hp;u.st.stun=1;b.over=false;b.opts.turnCap=b.turns+1;b.order=[u];await X.nextTurn();
  ok(u.arm===Math.min(u.armMax,arm1+u.flags.armRegen)&&u.hp===Math.min(u.hpMax,hp1+u.flags.regenHP),'Armoured / Regenerating: no mending at the start of its turn ('+[arm1,u.arm,hp1,u.hp]+')');b.over=true;b.busy=true}
 // blink: the AI uses it once, never twice
 reset();{const u=foe('orcw',['blink'],5,4);const back=at(pu[1],9,6);back.back=true;at(pu[0],12,9);ok(u.abs.includes('eblink'),'Blinking: no ability');
  const a=X.abilityInfo(u,'eblink');ok(X.foeReady(u,a),'Blinking: not ready at the start');b.over=false;b.busy=true;b.cur=u;u.ap=u.apMax;await X.aiTurn(u);b.over=true;
  ok(u.usedN&&u.usedN.eblink===1&&X.mdist(u,back)<=1,'Blinking: the AI did not blink beside the back-liner ('+u.c+','+u.r+')');ok(!X.foeReady(u,a),'Blinking: usable twice')}
 // unstoppable
 reset();{const u=foe('orcw',['unstoppable'],8,6);const m=me();at(u,7,6);X.addStatus(u,'stun',2);ok(!(u.st.stun>0)&&X.kbImmune(u),'Unstoppable: stunned or knocked back');
  const c0=u.c;await X.knockback(m,u,2,0);ok(u.c===c0,'Unstoppable: moved by a knockback');const f=X.forecast(m,u,Object.assign({},atk(m),{kb:1,status:{stun:1}}));ok(!f.statuses.some(s=>s.k==='stun')&&f.kb.ch===0,'Unstoppable: the forecast promises a stun or a knockback')}
 // bloodthirsty: heal a third of the hitpoints dealt, +15 on a kill, +20% below half health
 reset();{const u=foe('orcw',['bloodthirsty'],7,6);const m=me();at(u,7,6);m.hp=m.hpMax;u.hp=Math.round(u.hpMax*.6);const h0=u.hp;const ev=await hitEv(u,m,atk(u),{auto:1});
  ok(ev&&u.hp===Math.min(u.hpMax,h0+(ev.dmg>0?Math.max(1,Math.round(ev.dmg/3)):0)),'Bloodthirsty: no heal on the hit ('+h0+' -> '+u.hp+', dealt '+(ev&&ev.dmg)+')');
  u.hp=Math.round(u.hpMax*.4);const lo=X.dmgAfter(u,m,atk(u),100);u.hp=u.hpMax;const hi=X.dmgAfter(u,m,atk(u),100);ok(lo>hi,'Bloodthirsty: no damage bonus below half health');
  u.hp=Math.round(u.hpMax*.3);const hk=u.hp;m.hp=1;m.flags=Object.assign({},m.flags,{undying:0,lucky:0});m.undy=1;m.lck=1;const ev3=await hitEv(u,m,atk(u),{auto:1});ok(!m.alive&&u.hp>=Math.min(u.hpMax,hk+15),'Bloodthirsty: no heal on a kill');m.alive=true}
 // berserk: +5% a tenth lost, exact in the forecast
 reset();{const u=foe('orcw',['berserk'],7,6);const m=me();at(u,7,6);u.hp=u.hpMax;const d0=X.dmgAfter(u,m,atk(u),100);u.hp=Math.round(u.hpMax*.45);const d1=X.dmgAfter(u,m,atk(u),100);
  ok(u.flags.berserk&&u.flags.hurtDmg===.5&&d1>d0,'Berserk: no damage as it is hurt ('+d0+' / '+d1+')')}
 // venom and hex ride on its blows, forecast included
 reset();{const u=foe('orcy',['venom','hex'],7,6);const m=me();at(u,7,6);const f=X.forecast(u,m,atk(u),{auto:1});ok(f.statuses.some(s=>s.k==='poison'&&s.n===2)&&f.statuses.some(s=>s.k==='hex'&&s.n===2),'Venomous / Hexing: not in the forecast');
  m.hp=m.hpMax*5;m.hpMax*=5;await X.strike(u,m,atk(u),{auto:1});ok(m.st.poison===2&&m.st.hex===2,'Venomous / Hexing: the blow did not poison and hex');m.hpMax/=5;m.hp=m.hpMax}
 // keen-eyed: +1 range, cover and distance ignored
 reset();{const plain=X.foeSpawn('gobarch','gob',1,1);const r0=plain.wpn.rng;plain.alive=false;const u=foe('gobarch',['sharp'],2,6);const m=at(pu[0],8,6);
  ok(u.wpn.rng===r0+1&&u.flags.coverIgn===2&&u.flags.longShot&&X.abilityInfo(u,'attack').rng===r0+1,'Keen-eyed: range / cover / distance flags');const hk=X.hitChance(u,m,atk(u));
  const s0=u.flags;u.flags=Object.assign({},s0,{coverIgn:0,longShot:0});const hp=X.hitChance(u,m,atk(u));u.flags=s0;ok(hk>hp,'Keen-eyed: the distance penalty still applies ('+hk+' / '+hp+')');
  const w=X.foeSpawn('orcw','orc',3,3);ok(w&&!E.sharp.ok(w),'Keen-eyed: a melee foe can carry it')}
 // commanding: +10 to hit for an ally beside it, morale aura
 reset();{const u=foe('orcw',['commander'],7,5);const o=X.foeSpawn('orcy','orc',7,6);const m=me();at(m,8,6);at(o,7,6);X.auraScan();const h1=X.hitChance(o,m,atk(o));u.c=0;u.r=0;X.auraScan();const h0=X.hitChance(o,m,atk(o));
  ok(h1===Math.min(95,h0+10)||(h0>=85&&h1===95),'Commanding: +10 to hit for an ally beside it ('+h0+' -> '+h1+')');u.c=7;u.r=5;ok(X.brvAura(o)===15,'Commanding: the morale aura')}
 // thorned: a quarter back, through armor
 reset();{const u=foe('orcw',['thorns'],7,6);const m=me();at(u,7,6);m.hpMax*=5;m.hp=m.hpMax;const h0=m.hp,ev=await hitEv(m,u,atk(m),{auto:1});const back=Math.round(((ev.dmg|0)+(ev.armor|0))*.25);
  ok(m.hp===h0-back,'Thorned: the attacker did not take a quarter back ('+h0+' -> '+m.hp+', expected -'+back+')');m.hpMax/=5;m.hp=Math.min(m.hp,m.hpMax)}
 // volatile: explodes on death, both sides, burns
 reset();{const u=foe('orcy',['volatile'],7,6);const m=me();const o=at(pu[1],7,7),f=X.foeSpawn('orcy','orc',8,6);at(m,6,6);at(f,8,6);const n=X.eliteBoomDmg(u),h=[m.hp+m.arm,o.hp+o.arm,f.hp+f.arm];
  u.hp=1;u.ward=0;u.arm=u.helm=0;await X.strike(m,u,atk(m),{auto:1});ok(!u.alive,'Volatile: the test blow did not kill');
  ok(m.hp+m.arm<h[0]&&o.hp+o.arm<h[1]&&f.hp+f.arm<h[2]&&m.st.burn>=1&&o.st.burn>=1,'Volatile: the explosion did not hit everyone beside it ('+n+')')}
 // splitting: two lesser copies on death, never splitting again
 reset();{const u=foe('orcw',['splitting'],7,6);const m=me();at(u,7,6);const n0=b.units.length;u.hp=1;u.arm=u.helm=0;await X.strike(m,u,atk(m),{auto:1});
  const kids=b.units.slice(n0).filter(x=>x.alive&&x.splitOf===u.id);ok(!u.alive&&kids.length===2,'Splitting: no two copies ('+kids.length+')');
  ok(kids.every(k=>k.hpMax===Math.round(u.hpMax*.4)&&k.wpn.d[1]===Math.round(u.wpn.d[1]*.7)&&!k.elite&&k.spawned&&/^Lesser /.test(k.name)&&k.def.xp===0),'Splitting: the copies are wrong');
  kids[0].hp=1;kids[0].arm=kids[0].helm=0;await X.strike(m,kids[0],atk(m),{auto:1});ok(b.units.length===n0+2,'Splitting: a copy split again')}

 console.log('== forecast with elites (directed sweep) ==');
 { const ids=['orcw','orcy','obrute','thug','braid','bmark','gobarch','skel','wolf','bear','vknight'],fac={orcw:'orc',orcy:'orc',obrute:'orc',thug:'bandit',braid:'bandit',bmark:'bandit',gobarch:'gob',skel:'undead',wolf:'beast',bear:'beast',vknight:'void'};
   let n=0,hits=0,warded=0,stat=0,byE={};const N=QUICK?600:1800;
   for(let i=0;i<N;i++){reset();const ks=[K[X.ri(0,K.length-1)]],id=ks[0]==='sharp'?['bmark','gobarch'][X.ri(0,1)]:ids[X.ri(0,ids.length-1)];if(X.ri(0,3)===0)ks.push(K[X.ri(0,K.length-1)]);
    const e=X.foeSpawn(id,fac[id],8,6);if(!e)continue;e.spawned=0;X.eliteGive(e,ks);const m=at(pu[X.ri(0,pu.length-1)],0,0);at(e,8,6);
    const ranged=X.elRanged(e),d=ranged&&X.ri(0,1)?X.ri(2,Math.min(5,e.wpn.rng)):1;m.c=8-d;m.r=6;
    if(e.ward>0&&X.ri(0,2)===0)e.ward=X.ri(1,e.ward);e.hp=X.ri(0,2)?e.hpMax:Math.max(1,Math.round(e.hpMax*X.ri(10,90)/100));e.arm=X.ri(0,2)?e.armMax:X.ri(0,e.armMax);
    m.hp=X.ri(0,2)?m.hpMax:Math.max(1,Math.round(m.hpMax*X.ri(20,90)/100));if(X.ri(0,1))for(const k of ['venom','hex'])if(X.ri(0,3)===0)m.st[k==='venom'?'poison':'hex']=1;
    for(let q=0;q<3;q++){const o=b.units.find(x=>!x.alive&&x.side===1&&x!==e);if(o&&X.ri(0,2)===0){at(o,8+X.ri(-1,1),5+(q&1)*2);if(X.unitAt(o.c,o.r)!==o)o.alive=false}}
    X.auraScan();const fromFoe=X.ri(0,1)===0,u=fromFoe?e:m,t=fromFoe?m:e;if(!u.alive||!t.alive)continue;
    let a=X.abilityInfo(u,'attack');if(X.mdist(u,t)>a.rng){continue}if(X.losInfo(u,t,a).blocked)continue;const o=X.ri(0,3)===0?{auto:1}:undefined;
    const r0=X.rngState(),s0=JSON.stringify([u,t]),f=X.forecast(u,t,a,o);ok(X.rngState()===r0&&JSON.stringify([u,t])===s0,'forecast changed state or drew rnd with an elite');
    ok(f.hit===(o?100:X.hitChance(u,t,a)),'forecast hit differs from hitChance with an elite');
    const hp0=t.hp,arm0=t.arm,helm0=t.helm,ward0=t.ward||0,st0=Object.assign({},t.st);let ev=null;const on0=X.FX.on;X.FX.on=(ty,dd)=>{if(ty==='hit'&&dd.u===u&&dd.t===t&&!ev)ev={dmg:dd.dmg,armor:dd.armor,head:dd.head,died:t.hp<=0}};
    let hit;try{hit=await X.strike(u,t,a,o)}finally{X.FX.on=on0}n++;for(const k of (e.elite||[]))byE[k]=(byE[k]||0)+1;
    const tag=`${u.name} -> ${t.name} (${(e.elite||[]).join('+')}${o?' auto':''}, d ${X.mdist(u,t)})`;
    if(!hit){ok(!ev&&t.hp===hp0&&t.arm===arm0,'a miss did damage: '+tag);continue}hits++;if(ward0>0&&t===e)warded++;
    ok(ev,'a hit without a hit event: '+tag);const Lc=ev.head?f.head:f.body;ok(Lc,'the hit landed where the forecast ruled out: '+tag);
    ok(ev.dmg>=f.hpMin&&ev.dmg<=f.hpMax&&ev.armor>=f.armMin&&ev.armor<=f.armMax,`hit ${ev.dmg} hp / ${ev.armor} armor outside the forecast ${f.hpMin}-${f.hpMax} / ${f.armMin}-${f.armMax}: `+tag);
    ok(ev.dmg>=Lc.hpMin&&ev.dmg<=Lc.hpMax,'the location forecast misses the hit: '+tag);
    if(ev.died)ok(f.kill,'killed though the forecast said it could not: '+tag);else ok(!f.sure,'the forecast promised a kill: '+tag);
    if(t.alive&&!ev.died)for(const s of f.statuses)if(s.ch>=1){ok((t.st[s.k]||0)>=s.n,'status '+s.k+' forecast as certain but not applied: '+tag);stat++}
    if(t.alive)for(const k in t.st)if((t.st[k]||0)>(st0[k]||0)&&['poison','hex'].includes(k))ok(f.statuses.some(s=>s.k===k),'status '+k+' applied but not forecast: '+tag)}
   ok(n>=N*.6&&hits>N*.35&&warded>N/60&&stat>N/40,'the elite forecast sweep covered too little: '+JSON.stringify({n,hits,warded,stat}));
   ok(K.every(k=>byE[k]>5),'a modifier never took part in the forecast sweep: '+JSON.stringify(byE));
   console.log(`${n} strikes with elites checked (${hits} hits, ${warded} on a ward, ${stat} certain statuses)`) }

 console.log('== rewards, whole battles, HUD ==');
 { ok(X.eliteXpK({elite:['fast']})===1.5&&X.eliteXpK({elite:['fast','hex']})===2&&X.eliteXpK({})===1,'elite XP factor');
   ok(Math.abs(X.eliteLootCh({elite:['fast']},.18)-.4)<1e-9&&X.eliteLootCh({elite:['a','b','c','d']},.18)===X.ELITE.lootMax,'elite loot chance');
   { const Lt=X.FACT.orc.loot.filter(id=>X.ITEMS[id]),pr=id=>X.ITEMS[id].price||0,mid=Lt.map(pr).sort((a,b)=>b-a)[Math.ceil(Lt.length/2)-1];
     for(let i=0;i<40;i++){const id=X.eliteLootPick({elite:['fast']},Lt);ok(pr(id)>=mid,'elite loot came from the cheap half')} }
   const res=[];let withEl=0,splits=0;
   for(let i=0;i<(QUICK?6:12);i++){const f=['orc','bandit','undead','gob','beast','void'][i%6];
    for(let rep=0;rep<2;rep++){setup(i%2?'L12x12':'L8x9','hard');X.seedRng(SEED+300+i);const r=await X.autoBattle({f,mult:1,src:{type:'test'},turnCap:4000});ok(r&&!r.stuck,'an auto-battle with elites did not end');
     if(X.FX.err)fail('FX error in an elite battle: '+(X.FX.err.stack||X.FX.err));const bb=X.B,el=bb.units.filter(u=>u.elite);
     if(rep===0){if(el.length)withEl++;splits+=bb.units.filter(u=>u.splitOf!=null).length;
      if(r.win){let xp=0;for(const e of bb.units.filter(u=>u.side!==0))xp+=Math.round((e.def&&e.def.xp||0)*(1+X.XPRANK*Math.max(0,+e.rank||0))*(e.elite?X.eliteXpK(e):1));ok(r.xp===xp,'battle XP does not count the elites ('+r.xp+' vs '+xp+')')}}
     const sg=[r.win,r.rounds,r.turns,r.xp,r.crowns,(r.loot||[]).filter(id=>!/^f/.test(String(id))).join(),el.map(u=>u.name+u.alive).join()].join('|');if(rep===0)res.push(sg);else ok(res[res.length-1]===sg,'an elite battle did not replay identically');X.B=null;X.mode='world'}}
   ok(withEl>=(QUICK?3:6),'too few whole battles had elites: '+withEl);
   // the HUD pieces and saving
   setup('L8x9','normal');const bh=begin({f:'orc',foes:['orcw','orcy']},SEED+8);await settle(bh);const u=bh.units.find(x=>x.side===1);X.eliteGive(u,['shielded','thorns']);
   const chip=X.eliteChip(u),ins=X.eliteInsHTML(u);ok(/class="uel"/.test(chip)&&chip.includes('Shielded')&&chip.includes('Thorned'),'the chip lists no modifiers');
   ok(ins.includes('Shielded')&&ins.includes('ward '+u.ward+'/'+u.wardMax)&&ins.includes('Thorned')&&ins.includes('a quarter'),'the inspect card lists no exact effects');
   bh.cur=bh.units.find(x=>x.side===0);let card='';try{card=X.unitCard(u)}catch(e){card='ERR '+e.message}ok(/Elite/.test(card)&&card.includes('Shielded'),'unitCard has no Elite section: '+card.slice(0,120));
   const m=bh.cur;at(m,4,4);at(u,5,4);const fh=X.eliteFcHTML(m,u,X.abilityInfo(m,'attack'),X.forecast(m,u,X.abilityInfo(m,'attack')));ok(fh.includes('Ward')&&fh.includes('quarter'),'the forecast shows no elite badges');
   ok(X.mode==='battle'&&X.save()===false,'a battle must never be saved mid-fight (there is nothing to restore)');X.B=null;X.mode='world';
   console.log(`${res.length} whole battles at Hard replayed twice (${withEl} with elites, ${splits} split-off copies); XP, loot, chip, inspect card, forecast badges: ok`) }
 finished=true;console.log(`\nOK elites: ${checks} checks (${((Date.now()-T0)/1000).toFixed(1)}s)`)})().catch(e=>fail(e&&e.stack||e));
