// Colosseum test: the arena site, its fight cards, bout strength, pay, the gladiators' gear, background and trees, saves, the arena's rules.
//   node test/colosseum.js [--quick] [--rates N] [--jobs J] [--diff d,d] [--prof p,p] [--rule r,r]
// Loads src/*.js through test/balance.js's loader (its --lib exports) and checks:
//   data        every rule and theme names real factions and foes; the gladiator items, background, trait, trees (pinned ids, abilities
//               with descriptions), the arena biome; painted icons for every new item, ability and perk, and 16 px pixel fallbacks
//   site        a colosseum on every world shape and size (one, two on large, three on vast), near one of the largest towns, on walkable
//               land, the same place twice from the same seed, never drawing the game's rnd(); a site on the world map; a map label
//   card        3-5 bouts, the same card twice, a new card after COL.every days, no game rnd drawn; fought bouts are marked
//   strength    a bout's roster is deterministic, follows the swords sent (a stronger company meets stronger foes), keeps a set number of
//               foes for 1v1 / 3v3 / 6v6, and grows with the difficulty (Story < Normal < Hard < Brutal)
//   pay         the entry fee, the purse, the streak bonus, renown, titles and the acclaim, a prize, a loss, a yield
//   rules       no withdrawing in the arena, no yielding sine missione (canRetreat), the deployment cap; the crowd spares the fallen
//               (killUnit: COL.death of the usual chance to die); the hazard bout's fire pits; the tiles are the preview's
//   trees       Taunt (taunted, drawn to the taunter), Throw net (netted roots it, the free off hand), Pinned prey and Single combat inside the
//               forecast (exact), Showstopper's rally, Undefeated's second wind once, autoLearn picks the trees for a gladiator
//   saves       a colosseum with its card and record round-trips; an old save without one gets one; broken data is repaired
//   win rates   (--rates N, default 12 a cell in a full run, 0 with --quick): the sensible pilot at L4x6, L8x9 and L12x12 against every rule,
//               on every difficulty; overall per difficulty must land in COLBAND (Story 62-80, Normal 52-68, Hard 42-60, Brutal 30-55)
'use strict';
const path=require('path'),cp=require('child_process'),os=require('os');
const ARGV=process.argv.slice(2),has=k=>ARGV.includes(k),arg=(k,d)=>has(k)?ARGV[ARGV.indexOf(k)+1]:d;
process.argv.push('--lib');const L=require(path.join(__dirname,'balance.js'));process.argv.pop();
const RO=has('--rates-only'),QUICK=has('--quick'),RATES=+arg('--rates',QUICK?0:12),SEED=20261116;
const COLBAND={story:[62,80],normal:[52,68],hard:[42,60],brutal:[30,55]};
let finished=false;
function fail(m){console.error('\nFAIL: '+m);process.exit(1)}
function ok(c,m){if(!c)fail(m)}
process.on('unhandledRejection',e=>fail('unhandled rejection: '+(e&&e.stack||e)));
process.on('exit',c=>{if(!finished&&c===0){console.error('FAIL: did not finish');process.exitCode=1}});
const section=n=>console.log('\n== '+n+' ==');
const PROF=id=>L.PROFILES.find(p=>p.id===id);
function closeAll(X){for(let i=0;i<6&&X.sheetOpen;i++)X.closeSheet(true);if(X.sheetOpen)X.sheetOpen=false;if(X.G)X.G.townOpen=false}
function buildComps(X,id,k){const P=PROF(id),c=[];for(let i=0;i<(k||8);i++)c.push(L.buildCompany(X,P,L.SEED+L.hash(P.id)%9973+i*101));return c}
function setComp(X,comp){const G=X.G;G.roster=X.clone(comp);G.roster.forEach(m=>{m.field=true});G.stash=[];closeAll(X)}
const foeSig=b=>b.units.filter(u=>u.side===1).map(u=>[u.eid,u.f,u.hpMax,u.armMax,u.ms,u.md,u.wpn.d.join('-'),u.lvl,u.elite?1:0].join(':')).join('|');
// a bout's strength in one number: what its foes cost x their rank (the budget they stand for)
function boutCost(X,ros){let s=0;for(const e of ros){const F=X.FACT[e.f],c=(F.units.find(u=>u[0]===e.id)||[0,30])[1];s+=c*(e.n||1)*X.rosterX(e)}return s}

/* ---------- win-rate workers ---------- */
const RPROFS=['L4x6','L8x9','L12x12'];
function themesFor(X,rule,power){return X.COLTHEMEK.filter(k=>X.colThemeOK(k,X.COLRULE[rule],power))}
async function rateJob(X,comps,job){let w=0,r=0,dead=0,down=0,n=0;const R=X.COLRULE[job.rule];
 for(let i=0;i<job.n;i++){const comp=comps[i%comps.length];setComp(X,comp);const G=X.G;G.diff=job.diff;G.day=40;G.crowns=9000;X.B=null;X.mode='world';
  const fit=G.roster.length;if(R.swords&&fit<R.swords)continue;const P=X.companyPower(),TH=themesFor(X,job.rule,P);if(!TH.length)continue;
  const theme=TH[(i+L.hash(job.prof+job.rule)%TH.length)%TH.length],seed=(L.hash(job.prof+'|'+job.rule+'|'+theme)^Math.imul(i+1,2654435761)^SEED)>>>0,b={rule:job.rule,theme,seed,done:0,prize:0};
  const ms=X.colSwords(b,null),o=X.colFightOpts(b,ms,1);o.src={type:'test'};X.seedRng(seed);
  const res=await X.autoBattle(Object.assign(o,{pilot:'sensible',turnCap:5000}));if(X.FX.err)throw X.FX.err;ok(res&&!res.stuck,job.rule+'/'+theme+': stuck or not started');
  n++;w+=res.win?1:0;r+=res.rounds||0;dead+=res.dead?res.dead.length:0;down+=res.down?res.down.length:0;X.B=null;X.mode='world'}
 return Object.assign({},job,{n,w,r,dead,down})}
const colSet=X=>{if(process.env.COLSET)require('vm').runInContext(process.env.COLSET,X.ctx)};   // tuning: COLSET="COL.k.normal=1.2"
if(has('--worker')){const X=L.makeContext();colSet(X);const C={};for(const p of RPROFS)C[p]=buildComps(X,p,8);process.on('message',async m=>{if(m==='quit')process.exit(0);try{process.send(await rateJob(X,C[m.prof],m))}catch(e){process.send({id:m.id,err:String(e&&e.stack||e)})}});finished=true;return}

(async()=>{const X=L.makeContext(),T0=Date.now();colSet(X);
if(!RO)section('data');
if(!RO){for(const k in X.COLTHEME){const T=X.COLTHEME[k];for(const g of T.g){ok(X.FACT[g.f],k+': no faction '+g.f);for(const id of g.ids||[])ok(X.EN[id]&&X.FACT[g.f].units.some(u=>u[0]===id),k+': '+id+' is not a '+g.f)}}
 for(const k in X.COLRULE){const R=X.COLRULE[k];ok(R.n&&R.d&&R.k>0&&R.pay>0&&R.ren>0,k+': incomplete rule')}
 ok(X.FACT.pit&&X.FACT.pit.units.every(u=>X.EN[u[0]]&&X.EN[u[0]].glad),'the arena school is incomplete');
 for(const id of X.GLADITEMS){const it=X.ITEMS[id];ok(it&&it.glad&&it.price>0&&it.tier>=1,id+': not a gladiator item');if(it.k==='w')ok(Array.isArray(it.sk),id+': no weapon skills');if(it.k==='s')ok(it.hp>0&&it.sk.length,id+': a shield without hitpoints')}
 ok(X.ITEMS.trident.sk.includes('netthrow'),'the trident does not carry the net');ok(!X.marketPool(5).some(id=>X.ITEMS[id].glad),'gladiator gear in a town market');
 const B=X.BG.gladiator;ok(B&&B.pool.includes('gladiator')&&B.pool.includes('champion')&&B.cost>=500&&B.tr.showman>1,'the gladiator background');for(const g of B.gear)for(const id of g.split('|'))ok(id==='-'||X.ITEMS[id],'gladiator gear '+id);
 ok(X.TRAITS.showman&&X.TRAITS.showman.good,'the Showman trait');ok(X.BG.pitfighter.pool.includes('gladiator')&&X.BG.knight.pool.includes('champion')&&X.BG.sailor.pool.includes('gladiator'),'the trees are not in the other pools');
 for(const t of ['gladiator','champion']){const T=X.MAST[t];ok(T&&T.kind==='style'&&T.tiers.length===6,t+': not a 6-tier style tree');T.tiers.forEach((tier,i)=>{ok(tier.length===1&&tier[0].id===t+'.'+(i+1),t+': tier '+(i+1)+' id is not pinned');const p=tier[0];if(p.ab)ok(X.AB[p.ab]&&X.AB[p.ab].d,p.id+': ability '+p.ab+' missing or undescribed')});ok(T.cap&&T.cap.tiers&&T.cap.tiers[0][0].id===t+'.cap',t+': no capstone')}
 ok(X.BIO.arena&&X.TXM&&X.TXM.arena&&X.HDM&&X.HDM.arena,'the arena biome has no tiles');
 const icons=[];for(const id of X.GLADITEMS)icons.push('it-'+id);for(const t of ['gladiator','champion'])for(const p of X.MAST[t].p){icons.push(p.ab?'ab-'+p.ab:'perk-'+p.id)}icons.push('m-gladiator','m-champion','st-taunted','st-netted','st-crowd','ab-gnet','ab-gtaunt','colosseum');
 const miss=icons.filter(n=>!(X.PAINT&&X.PAINT[n])&&!(n.slice(0,3)==='it-'&&X.pkcSpec&&X.pkcSpec(n.slice(3))));ok(!miss.length,'painted icons missing: '+miss.join(' '));
 const px=icons.filter(n=>{let r='none';try{r=X.icResolve(n)}catch(e){}return r==='none'});ok(!px.length,'pixel icons missing: '+px.join(' '));
 console.log(`${Object.keys(X.COLRULE).length} rules, ${Object.keys(X.COLTHEME).length} themes, ${X.GLADITEMS.length} items, 2 trees, ${icons.length} icons`)}

if(!RO)section('site');
if(!RO){const shapes=X.MSKEYS?X.MSKEYS.slice():['continent'],sizes=QUICK?['small','large']:['small','medium','large','vast'];let n=0;
 for(const sz of sizes)for(const sh of (sz==='small'?shapes:['continent'])){const seed=SEED+n++;X.seedRng(seed);X.newGame(true,{wsize:sz,shape:sh});closeAll(X);const G=X.G;
  ok(Array.isArray(G.colos)&&G.colos.length===X.COL.count[sz],sz+'/'+sh+': '+(G.colos?G.colos.length:0)+' colosseums');
  for(const c of G.colos){const t=G.towns[c.ti],d=Math.hypot(c.x-t.x,c.y-t.y)/X.TS;ok(d>=X.COL.near[0]-.8&&d<=X.COL.near[1]+.8,sz+'/'+sh+': colosseum '+d.toFixed(1)+' tiles from its town');ok(X.okAt(c.x,c.y),sz+'/'+sh+': off the land');
   ok(G.sites.some(s=>s.id===c.id&&s.kind==='colo'),'no site on the map');const max=Math.max(...G.towns.filter(q=>!q.east).map(q=>q.size||1));ok((t.size||1)>=Math.min(max,G.colos.length>1?2:max),sz+'/'+sh+': not beside one of the largest towns')}
  const st=X.rngState(),k=JSON.stringify(G.colos.map(c=>[c.ti,c.x,c.y]));G.colos=null;G.sites=G.sites.filter(s=>s.kind!=='colo');X.colInit(G);ok(JSON.stringify(G.colos.map(c=>[c.ti,c.x,c.y]))===k,'colInit is not deterministic');ok(X.rngState()===st,'colInit drew from the game stream')}
 console.log(`${n} worlds: placed, near a large town, deterministic`)}

const C4=RO?null:buildComps(X,'L4x6',4),C8=RO?null:buildComps(X,'L8x9',4),C12=RO?null:buildComps(X,'L12x12',4);
if(!RO)section('card');
if(!RO){X.seedRng(SEED+40);X.newGame(true);closeAll(X);const G=X.G;setComp(X,C8[0]);const c=G.colos[0];G.day=3;const st=X.rngState(),A=JSON.stringify(X.colCard(c));ok(X.rngState()===st,'the card drew from the game stream');
 const C=X.colCard(c);ok(C.bouts.length>=3&&C.bouts.length<=5,'bouts on the card: '+C.bouts.length);ok(C.bouts.every(b=>X.COLRULE[b.rule]&&X.COLTHEME[b.theme]),'a bout with an unknown rule or theme');
 c.card=null;ok(JSON.stringify(X.colCard(c))===A,'the card is not deterministic');X.colCard(c).bouts[0].done='won';ok(X.colCard(c).bouts[0].done==='won','a fought bout is not kept for the span');
 const ep=c.card.ep;G.day+=X.COL.every;const D=X.colCard(c);ok(D.ep===ep+1&&D.bouts.every(b=>!b.done)&&JSON.stringify(D)!==A,'no new card after the span');
 const seen=new Set();for(let d=1;d<=60;d+=X.COL.every){G.day=d;for(const b of X.colCard(c).bouts){seen.add(b.rule);seen.add(b.theme)}}
 console.log(`3-5 bouts, deterministic, refreshed every ${X.COL.every} days; 60 days show ${[...seen].filter(k=>X.COLRULE[k]).length} rules and ${[...seen].filter(k=>X.COLTHEME[k]).length} themes`)}

if(!RO)section('strength');
if(!RO){X.seedRng(SEED+41);X.newGame(true);closeAll(X);const G=X.G;const b0={rule:'melee',theme:'venatio',seed:12345,done:0};
 const at=(comp,diff,b)=>{setComp(X,comp);G.diff=diff;const ms=X.colSwords(b,null);return{ros:X.colRoster(b,ms),bud:X.colBudget0(ms)}};
 const a=at(C8[0],'normal',b0),a2=at(C8[0],'normal',b0);ok(JSON.stringify(a.ros)===JSON.stringify(a2.ros),'the roster is not deterministic');
 const w=at(C4[0],'normal',b0),s=at(C12[0],'normal',b0);ok(boutCost(X,s.ros)>boutCost(X,a.ros)&&boutCost(X,a.ros)>boutCost(X,w.ros),'a stronger company does not meet a stronger bout');
 let last=0;const line=[];for(const d of ['story','normal','hard','brutal']){const r=at(C8[0],d,b0),v=boutCost(X,r.ros)/r.bud;line.push(d+' '+v.toFixed(2));ok(v>last,'the bout does not grow with the difficulty: '+line.join(', '));last=v}
 for(const [rule,n] of [['duel',1],['trio',3],['six',6]]){const b={rule,theme:'school',seed:777,done:0};for(const comp of [C4[0],C12[0]]){const r=at(comp,'normal',b),cnt=r.ros.reduce((q,e)=>q+e.n,0);ok(cnt===n,rule+': '+cnt+' foes, not '+n)}}
 {const b={rule:'champ',theme:'school',seed:99,done:0},r=at(C8[0],'normal',b);ok(r.ros.filter(e=>e.elite).length===1&&r.ros.find(e=>e.elite).el.length===1&&r.ros.find(e=>e.elite).name,'the champion bout has no named elite')}
 {const b={rule:'pit',theme:'beasts',seed:5,done:0},r=at(C8[0],'normal',b);ok(r.ros.every(e=>e.f==='beast'),'the beast pit fields more than beasts')}
 {const b={rule:'melee',theme:'venatio',seed:5,done:0},r=at(C12[0],'normal',b);ok(new Set(r.ros.map(e=>e.f)).size===2,'a mixed theme does not mix its factions')}
 // the battle fields exactly the roster, on the bout's own floor (the preview is the battle)
 {setComp(X,C8[0]);G.diff='normal';const b={rule:'hazard',theme:'brig',seed:31337,done:0},ms=X.colSwords(b,null),o=X.colFightOpts(b,ms,1);o.src={type:'test'};ok(o.tiles.filter(t=>t.t==='haz').length>=6,'the fire pits bout has no pits');
  X.B=null;X.mode='world';const bt=X.startBattle(Object.assign({},o,{quiet:true,turnCap:1,onEnd(){}}));ok(bt&&bt.bk==='arena'&&bt.tiles===o.tiles,'the bout is not fought on its arena floor');const want=X.rosterList(o).map(e=>e.id).join();ok(bt.units.filter(u=>u.side===1).map(u=>u.eid).join()===want,'the battle does not field the roster');
  ok(bt.units.filter(u=>u.side===1).every(u=>u.f==='bandit'),'roster entries lost their faction');X.B=null;X.mode='world'}
 console.log('deterministic, follows the company, grows with the difficulty ('+line.join(', ')+'), set counts kept, champions, beasts, mixes')}

if(!RO)section('pay');
if(!RO){X.seedRng(SEED+42);X.newGame(true);closeAll(X);const G=X.G;setComp(X,C8[1]);G.crowns=5000;G.renown=0;const c=G.colos[0],C=X.colCard(c);
 const i=C.bouts.findIndex(b=>!X.COLRULE[b.rule].swords),b=C.bouts[i];b.prize=1;const o=X.colOpts(c,i);ok(o&&o.src.purse>0&&o.src.fee>0&&o.src.fee<o.src.purse,'no purse or fee');
 const P=X.companyPower(),want=Math.max(50,Math.round(X.colPurseBase(P)*X.COLRULE[b.rule].pay*X.diffK('pay')/10)*10);ok(o.src.purse===want,'the purse is not the formula: '+o.src.purse+' vs '+want);
 const c0=G.crowns,r0=G.renown,s0=G.stash.length;const out=X.colSettle(o.src,true,{fled:false,arenaKills:{}});ok(out.win&&G.crowns===c0+out.purse-out.fee&&G.renown===r0+out.renown&&out.renown===o.src.ren,'a win did not pay what it says');
 ok(o.src.prize&&G.stash.length===s0+1&&G.stash.includes(o.src.prize)&&X.ITEMS[o.src.prize].glad,'the prize did not reach the stash');ok(b.done==='won'&&X.colWhy(c,i),'a won bout can be fought again');
 ok(c.rec.w===1&&c.rec.streak===1,'the record did not count the win');const p1=X.colOpts(c,(i+1)%C.bouts.length);ok(!p1||X.colStreakK(c)>1,'no streak bonus');
 c.rec.w=2;c.rec.streak=2;const r1=G.renown,o3=Object.assign({},o.src,{prize:null});const out3=X.colSettle(o3,true,{});ok(out3.acclaim===10&&out3.title==='Contender'&&G.renown===r1+out3.renown,'the third win in a row: no acclaim or title');
 const c1=G.crowns;const outL=X.colSettle(o3,false,{fled:false});ok(!outL.win&&G.crowns===c1-o3.fee&&c.rec.streak===0&&c.rec.l===1,'a loss did not cost the entry or end the streak');
 const outY=X.colSettle(o3,false,{fled:true});ok(outY.yielded&&c.rec.y===1,'a yield is not counted');
 // Showman: +5% a kill
 G.roster[0].traits=['showman'];const c2=G.crowns;const outS=X.colSettle(o3,true,{arenaKills:{[G.roster[0].id]:3}});ok(outS.show===15&&outS.purse===Math.round(o3.purse*1.15/10)*10&&G.crowns===c2+outS.purse-outS.fee,'Showman did not add to the purse');
 console.log(`purse ${o.src.purse}, entry ${o.src.fee}, +${o.src.ren} renown, prize ${X.ITEMS[o.src.prize].n}; streak, acclaim, title, loss, yield, Showman`)}

if(!RO)section('rules');
if(!RO){X.seedRng(SEED+43);X.newGame(true);closeAll(X);const G=X.G;setComp(X,C8[2]);G.crowns=5000;const mk=rule=>{const b={rule,theme:'brig',seed:4242,done:0},ms=X.colSwords(b,null),o=X.colFightOpts(b,ms,1);o.src={type:'test'};X.B=null;X.mode='world';return X.startBattle(Object.assign({},o,{quiet:true,turnCap:1,onEnd(){}}))};
 let b=mk('sine');ok(b&&!X.canRetreat(),'a bout sine missione can be yielded');const u=b.units.find(x=>x.side===0);u.r=X.EDGE[0];u.ap=9;ok(!X.canWithdraw(u),'a sword withdrew from the arena');X.B=null;
 b=mk('melee');ok(X.canRetreat(),'an ordinary bout cannot be yielded');X.B=null;
 b=mk('duel');ok(b.units.filter(x=>x.side===0&&!x.ally).length===1&&b.units.filter(x=>x.side===1).length===1,'the duel is not one against one');X.B=null;
 // the crowd spares the fallen: deaths at COL.death of the usual chance (and the usual odds sine missione)
 const deaths=rule=>{const bb=mk(rule);let d=0,n=0;for(let i=0;i<600;i++){const t=bb.units.find(x=>x.side===0&&x.m);t.alive=true;t.down=false;t.hp=1;X.seedRng(9000+i);X.killUnit(t,null,false);n++;if(!t.down)d++;t.m.inj=[]}X.B=null;return d/n};
 const dA=deaths('melee'),dS=deaths('sine'),exp=(1-Math.max(X.DOWNCH,0))*X.diffK('death');ok(Math.abs(dS-exp)<.07&&Math.abs(dA-exp*X.COL.death)<.06,`deaths: arena ${(dA*100).toFixed(0)}%, sine missione ${(dS*100).toFixed(0)}%, expected ${(exp*X.COL.death*100).toFixed(0)}% and ${(exp*100).toFixed(0)}%`);
 // the deployment cap and a declined bout costs nothing
 const c=G.colos[0],C=X.colCard(c);C.bouts[0]={rule:'trio',theme:'brig',seed:11,done:0,prize:0};const o=X.colOpts(c,0);ok(o.maxField===3&&o.deploy.length===3,'a 3v3 bout does not name three swords');
 const c0=G.crowns,out=X.fleeEncounter(o);ok(out.declined&&G.crowns===c0&&!C.bouts[0].done,'declining a bout at the gate cost something');
 console.log(`no withdrawing, no yielding sine missione, 1v1 is one against one; deaths ${(dA*100).toFixed(0)}% in the arena vs ${(dS*100).toFixed(0)}% sine missione; the gate is free`)}

if(!RO)section('trees');
if(!RO){X.seedRng(SEED+44);X.newGame(true);closeAll(X);const G=X.G;const m=X.newMerc('gladiator');ok(m.trees.some(t=>X.BG.gladiator.pool.includes(t)),'a gladiator without its trees');ok(['w','s','a','h'].some(k=>m.eq[k]&&X.ITEMS[m.eq[k]].glad),'a gladiator without gladiator gear');
 // a hand-built gladiator who has every perk of both trees
 const g=X.newMerc('gladiator');g.trees=['gladiator','champion','duelist','brawler'];g.lvl=12;g.perks=X.MAST.gladiator.p.map(p=>p.id).concat(X.MAST.champion.p.map(p=>p.id));g.eq.w='trident';g.eq.s=null;g.eq.b=null;if(X.syncMast)X.syncMast(g);G.roster=[g];g.field=true;g.hp=X.calc(g).hp;
 const fl=X.calc(g).flags;ok(fl.crowdKill&&fl.pinHit&&fl.soloHit&&fl.secondWind&&fl.kbImm,'the passives do not reach calc()');
 const b={rule:'duel',theme:'brig',seed:5,done:0},o=X.colFightOpts(b,[g],1);o.src={type:'test'};X.B=null;X.mode='world';const bt=X.startBattle(Object.assign({},o,{quiet:true,turnCap:1,onEnd(){}}));
 const u=bt.units.find(x=>x.side===0),t=bt.units.find(x=>x.side===1);for(const a of ['taunt','netthrow','showstop','crowdroar','feint','iugula'])ok(u.abs.includes(a),'ability '+a+' is not in hand');
 u.c=5;u.r=6;t.c=5;t.r=4;u.ap=12;u.fat=0;X.foeAuras();const net=X.abilityInfo(u,'netthrow');ok(X.canUse(u,net),'Throw net cannot be used with a trident and no shield');
 u.shield=true;ok(!X.canUse(u,net)&&/off hand/.test(X.useBlock(u,net)),'Throw net with a shield raised');u.shield=false;
 X.seedRng(1);t.st={};let hit=false;for(let k=0;k<20&&!hit;k++){hit=await X.strike(u,t,net);u.ap=12}ok(t.st.netted>0,'the net did not net');
 // the forecast is exact against a pinned foe: hit and damage include Pinned prey
 const atk=X.abilityInfo(u,'attack'),hc=X.hitChance(u,t,atk),f=X.forecast(u,t,atk);ok(f.hit===hc,'forecast hit '+f.hit+' vs '+hc);const pin=X.glHit(u,t,atk);ok(pin>=X.calc(g).flags.pinHit,'Pinned prey not counted against a netted foe');
 t.st.netted=0;t.rooted=false;const hc2=X.hitChance(u,t,atk);ok(hc2<hc||hc===95,'netted made no difference');
 // the netted foe cannot move on its turn
 t.st.netted=2;bt.order=[t];bt.cur=null;t.rooted=false;const tick=X.glRootCheck;tick(t);ok(t.rooted,'a netted unit is not rooted');
 // Taunt
 const ta=X.abilityInfo(u,'taunt');await ta.run(u,X.key(t.c,t.r),ta);ok(t.st.taunted>0&&t.tauntBy===u.id,'Taunt did not taunt');
 // Undefeated: the second wind once
 u.hp=u.hpMax;u.swd=0;X.hurt(u,Math.round(u.hpMax*.6),1,null,{pierce:1});ok(u.swd===1&&u.bonusAP>=2&&u.hp>u.hpMax*.4-1,'no second wind');const h1=u.hp;X.hurt(u,5,1,null,{pierce:1});ok(u.hp===h1-5,'a second second wind');
 X.B=null;X.mode='world';
 // autoLearn spends a gladiator's points in its trees
 const r=X.newMerc('gladiator');r.trees=['gladiator','champion','vanguard','duelist'];X.gainXP(r,X.XPT[6]);X.autoLearn(r);ok(r.perks.some(p=>/^(gladiator|champion)\./.test(p)),'autoLearn ignores the gladiator trees: '+r.perks.join(' '));
 console.log('gear and trees on recruits; abilities in hand; net roots and needs a free hand; forecast exact with Pinned prey; Taunt; Undefeated once; autoLearn: '+r.perks.join(' '))}

if(!RO)section('saves');
if(!RO){X.seedRng(SEED+45);X.newGame(true);closeAll(X);const G=X.G;const c=G.colos[0];X.colCard(c);c.rec.w=4;c.rec.streak=2;c.rec.best=3;c.rec.title=1;c.card.bouts[1].done='lost';X.colArmory(c);
 ok(X.save(),'save failed');const raw=X.ctx.localStorage.getItem(X.SAVEKEY),r=X.readSaveRaw(raw);ok(r.state==='ok','the save did not load: '+r.why);const c2=r.g.colos[0];
 ok(JSON.stringify(c2.rec)===JSON.stringify(c.rec)&&JSON.stringify(c2.card)===JSON.stringify(c.card)&&JSON.stringify(c2.arm)===JSON.stringify(c.arm),'the colosseum did not round-trip');
 const g=JSON.parse(raw);delete g.colos;g.sites=g.sites.filter(s=>s.kind!=='colo');const r2=X.readSaveRaw(JSON.stringify(g));ok(r2.state==='ok'&&r2.g.colos&&r2.g.colos.length===1&&r2.g.sites.some(s=>s.kind==='colo'),'an old save did not get its colosseum');
 ok(r2.g.colos[0].x===c.x&&r2.g.colos[0].y===c.y,'the old save\'s colosseum is not where a new game puts it');
 const bad=JSON.parse(raw);bad.colos=[{id:'x'},{id:c.id,ti:999,x:1,y:2},{id:c.id,ti:c.ti,x:c.x,y:c.y,rec:{w:-3,streak:'a'},card:{ep:2,bouts:[{rule:'nope'},{rule:'duel',theme:'school',seed:5,done:'won'}]},arm:{ep:1,stock:['gladius','katana',7]}}];
 const r3=X.readSaveRaw(JSON.stringify(bad));ok(r3.state==='ok'&&r3.g.colos.length===1&&r3.g.colos[0].rec.w===0&&r3.g.colos[0].card.bouts.length===1&&r3.g.colos[0].arm.stock.join()==='gladius','broken colosseum data was not repaired: '+JSON.stringify(r3.g&&r3.g.colos));
 console.log('round trip, an old save gets its colosseum (the same place), broken data repaired')}

if(RATES>0){section(`win rates (sensible pilot, ${RATES} battles a cell; bands: ${Object.keys(COLBAND).map(d=>d+' '+COLBAND[d].join('-')).join(', ')})`);
 const diffs=arg('--diff','story,normal,hard,brutal').split(','),profs=arg('--prof',RPROFS.join(',')).split(','),rules=arg('--rule',Object.keys(X.COLRULE).join(',')).split(',');
 const jobs=[];let id=0;for(const d of diffs)for(const p of profs)for(const r of rules)jobs.push({id:id++,diff:d,prof:p,rule:r,n:RATES});
 const J=+arg('--jobs',Math.max(1,Math.min(4,os.cpus().length))),W=[],res=[];
 await new Promise((done,bad)=>{let next=0,left=jobs.length;for(let j=0;j<Math.min(J,jobs.length);j++){const w=cp.fork(__filename,['--worker']);W.push(w);
   const feed=()=>{if(next<jobs.length)w.send(jobs[next++])};w.on('message',m=>{if(m.err)bad(new Error(m.err));res.push(m);if(--left===0)done();else feed()});feed()}});
 W.forEach(w=>w.send('quit'));const pct=(w,n)=>n?(100*w/n):NaN,sum=(L,k)=>L.reduce((a,x)=>a+x[k],0);
 console.log('rule'.padEnd(10)+diffs.map(d=>profs.map(p=>(d.slice(0,2)+'/'+p).padStart(12)).join('')).join(''));
 for(const r of rules){let line=r.padEnd(10);for(const d of diffs)for(const p of profs){const x=res.find(q=>q.diff===d&&q.prof===p&&q.rule===r);line+=(x&&x.n?pct(x.w,x.n).toFixed(0)+'%':'-').padStart(12)}console.log(line)}
 const bad=[];for(const d of diffs){const L=res.filter(x=>x.diff===d),v=pct(sum(L,'w'),sum(L,'n'));const per=profs.map(p=>{const P=L.filter(x=>x.prof===p);return p+' '+pct(sum(P,'w'),sum(P,'n')).toFixed(0)+'%'}).join(', ');
  console.log(`${d.padEnd(8)} overall ${v.toFixed(1)}% (${sum(L,'n')} bouts; ${per}); dead ${(sum(L,'dead')/sum(L,'n')).toFixed(2)} a bout, struck down ${(sum(L,'down')/sum(L,'n')).toFixed(2)}, rounds ${(sum(L,'r')/sum(L,'n')).toFixed(1)}`);
  const B=COLBAND[d];if(B&&!(v>=B[0]&&v<=B[1]))bad.push(`${d} ${v.toFixed(1)}% outside ${B[0]}-${B[1]}`)}
 ok(!bad.length,'win rates: '+bad.join('; '))}
finished=true;console.log(`\ncolosseum: all ok (${((Date.now()-T0)/1000).toFixed(1)}s)`)})();
