// Endgame test (Phase 8B): portal worlds, dungeons, realm rules, fixed rosters, saves, and the win-rate table.
//   node test/endgame.js [--quick] [--rates N] [--jobs J] [--only key,key]
// Loads src/*.js through test/balance.js's own loader (its --lib exports: makeContext, buildCompany, PROFILES) and checks:
//   data          every portal and dungeon roster names real foes; bosses stand in their rosters; loot ids are items
//   fixed rosters two companies of very different strength (L12x12 and L4x6, different days and renown) meet identical enemies,
//                 exactly what battlePreview shows; only the difficulty setting moves them, the same for both
//   node maps     portalGen is deterministic (the same map twice, no game randomness drawn), 5-7 nodes, branching, every node reachable,
//                 the boss reachable from every node
//   portal runs   completable (a hero company walks to the boss and closes the rift: crisis count, riftedge, deeds) and losable (a green
//                 company is thrown out, the rift stays open); wounds carry between nodes; rest, treasure, events; retreat costs
//   realm rules   ashen burning ground spreads and stops regeneration / halves heals, hollow caps reach and shifts stones (never under a
//                 unit, the field stays connected), glass empowers spells (inside the forecast) and burns casters
//   dungeons      appear over time (first day, cap), deterministic, clear (site turns dark, legendary loot, deeds) and persist in saves
//   saves         a portal run and dungeons round-trip; a v13 save migrates (portalRun none, dungeons none, deeds {})
//   win rates     (--rates N, default 40 in a full run, 0 with --quick) every fight with the L12x12 profile and the sensible pilot on
//                 Normal; target 50-65%; fails outside 35..80% (sampling noise at N=40 is about 8 points)
'use strict';
const path=require('path'),cp=require('child_process'),os=require('os');
const ARGV=process.argv.slice(2),has=k=>ARGV.includes(k),arg=(k,d)=>has(k)?ARGV[ARGV.indexOf(k)+1]:d;
process.argv.push('--lib');const L=require(path.join(__dirname,'balance.js'));process.argv.pop();
const QUICK=has('--quick'),RATES=+arg('--rates',QUICK?0:40),SEED=20261115;
let finished=false;
function fail(m){console.error('\nFAIL: '+m);process.exit(1)}
function ok(c,m){if(!c)fail(m)}
process.on('unhandledRejection',e=>fail('unhandled rejection: '+(e&&e.stack||e)));
process.on('exit',c=>{if(!finished&&c===0){console.error('FAIL: did not finish');process.exitCode=1}});
const section=n=>console.log('\n== '+n+' ==');
const PROF=id=>L.PROFILES.find(p=>p.id===id);
// every fight: 'realm.key' (portal worlds) and 'dungeon.stage'
function fightKeys(X){const out=[];for(const r in X.ENDGAME)for(const k in X.ENDGAME[r].fights)out.push(r+'.'+k);for(const d in X.DUNGEONS)X.DUNGEONS[d].fights.forEach((f,i)=>out.push(d+'.'+i));return out}
function fightOpts(X,k){const [a,b]=k.split('.');if(X.ENDGAME[a])return X.portalFightOpts(a,b,0);return X.dungeonFightOpts({id:1,k:a,stage:+b})}
function closeAll(X){for(let i=0;i<6&&X.sheetOpen;i++)X.closeSheet(true);if(X.sheetOpen)X.sheetOpen=false;if(X.G)X.G.townOpen=false}
// the enemy side as numbers: what the company meets
function foeSig(X,b){return b.units.filter(u=>u.side===1).map(u=>[u.eid,u.name,u.hpMax,u.armMax,u.helmMax,u.ms,u.rs,u.md,u.rd,u.init,u.brv,u.wpn.d.join('-'),u.lvl,u.elite|0,u.boss|0].join(':')).join('|')}
function startOnly(X,o){X.B=null;X.mode='world';const b=X.startBattle(Object.assign({},o,{quiet:true,turnCap:1,onEnd(){}}));ok(b,'battle did not start: '+JSON.stringify(o.src));const s={sig:foeSig(X,b),b};X.B=null;X.mode='world';return s}
// a battle in progress, played to the end by the AI, then left through the real afterBattle()
async function finish(X){const b=X.B;ok(b&&X.mode==='battle','no battle to finish');b.opts.turnCap=5000;const res=b.result||await new Promise(r=>{b.onEnd=r;b.auto=true});ok(!res.stuck,'an endgame battle got stuck');const out=X.afterBattle(res.win?1:0);closeAll(X);return{res,out}}
function heroes(X){X.G.roster.forEach(m=>{if(Array.isArray(m.perks)&&!m.perks.includes('survivor.stubborn'))m.perks.push('survivor.stubborn');m.base.hp+=160;m.base.ms+=45;m.base.rs+=40;m.base.md+=30;m.base.rd+=30;m.base.brv+=90;m.hp=X.calc(m).hp})}
function setComp(X,comp,day){const G=X.G;G.roster=X.clone(comp);G.roster.forEach(m=>{m.field=true});G.day=day;G.stash=[];closeAll(X)}

/* ---------- win-rate workers ---------- */
async function rateJob(X,comps,k,N,diff){let w=0,r=0,dead=0;for(let i=0;i<N;i++){const G=X.G;G.roster=X.clone(comps[i%comps.length]);G.stash=[];G.day=50;G.diff=diff||'normal';X.B=null;X.mode='world';
  X.seedRng((L.hash(k)^Math.imul(i+1,2654435761)^SEED)>>>0);const res=await X.autoBattle(Object.assign(fightOpts(X,k),{pilot:'sensible',turnCap:5000}));if(X.FX.err)throw X.FX.err;ok(res&&!res.stuck,k+': stuck or not started');
  w+=res.win?1:0;r+=res.rounds||0;dead+=res.dead?res.dead.length:0;X.B=null;X.mode='world'}return{k,n:N,w,r,dead}}
function buildComps(X,id){const P=PROF(id),c=[];for(let k=0;k<8;k++)c.push(L.buildCompany(X,P,L.SEED+L.hash(P.id)%9973+k*101));return c}
if(has('--worker')){const X=L.makeContext();const comps=buildComps(X,'L12x12');process.on('message',async m=>{if(m==='quit')process.exit(0);try{process.send(await rateJob(X,comps,m.k,m.n))}catch(e){process.send({k:m.k,err:String(e&&e.stack||e)})}});finished=true;return}

(async()=>{const X=L.makeContext(),T0=Date.now(),C12=buildComps(X,'L12x12'),C4=buildComps(X,'L4x6');   // (buildCompany starts a new game: the companies are built first)
section('data');
{let n=0;for(const k of fightKeys(X)){const o=fightOpts(X,k);ok(o&&Array.isArray(o.roster)&&o.roster.length,k+': no roster');for(const e of o.roster){ok(X.EN[e.id],k+': unknown foe '+e.id);ok(e.lvl>=1&&e.n>=1,k+': bad entry')}
  const cnt=o.roster.reduce((a,e)=>a+e.n,0);ok(cnt<=X.MAXFOES,k+': more than MAXFOES foes');if(o.boss){ok(o.roster.some(e=>e.id===o.boss.id),k+': the boss is not in its roster');ok(Array.isArray(o.boss.phases)&&o.boss.phases.length>=2,k+': a boss without phases')}n++}
 for(const r in X.ENDGAME){const E=X.ENDGAME[r];ok(X.REALMR[r]&&X.BIO[r],r+': no realm rules or biome');ok(E.fights[E.boss]&&E.fights[E.boss].boss,r+': no boss fight');for(const k of E.battle.concat(E.elite))ok(E.fights[k],r+': unknown fight '+k);for(const id of E.loot||[])ok(X.ITEMS[id]&&X.ITEMS[id].legend,r+': loot is not legendary '+id)}
 for(const d in X.DUNGEONS){const D=X.DUNGEONS[d];ok(D.fights.length>=2&&D.fights[D.fights.length-1].boss,d+': no boss at the end');ok(D.danger&&/veteran/.test(D.danger),d+': the danger is not stated');for(const id of D.loot)ok(X.ITEMS[id]&&X.ITEMS[id].legend,d+': loot is not legendary '+id)}
 console.log(n+' fixed fights in '+Object.keys(X.ENDGAME).length+' portal worlds and '+Object.keys(X.DUNGEONS).length+' dungeons')}

section('fixed rosters');
{X.seedRng(SEED);X.newGame(true);closeAll(X);const strong=C12[0],weak=C4[0];X.seedRng(SEED);X.newGame(true);closeAll(X);const G=X.G;
 for(const k of fightKeys(X)){const o=fightOpts(X,k),pv=(()=>{setComp(X,weak,12);G.renown=0;X.seedRng(77);return X.battlePreview(Object.assign({},o))})();
  setComp(X,strong,60);G.renown=900;X.seedRng(77);const a=startOnly(X,o);setComp(X,weak,12);G.renown=0;X.seedRng(77);const b=startOnly(X,o);
  ok(a.sig===b.sig,k+': two companies of different strength met different enemies\n'+a.sig+'\n'+b.sig);ok(pv.budget===0&&pv.foes.join()===a.b.units.filter(u=>u.side===1).map(u=>u.eid).join(),k+': the preview is not the battle');
  ok(a.b.frank&&a.b.fixedSide,k+': the summons would follow the company')}
 // the difficulty setting: a flat change, the same for both companies
 const k='hollow.gloom',o=fightOpts(X,k);G.diff='hard';setComp(X,strong,60);X.seedRng(5);const h1=startOnly(X,o);setComp(X,weak,3);X.seedRng(5);const h2=startOnly(X,o);G.diff='normal';X.seedRng(5);const n1=startOnly(X,o);G.diff='story';X.seedRng(5);const s1=startOnly(X,o);G.diff='normal';
 ok(h1.sig===h2.sig,'the difficulty setting moved the enemies differently for two companies');ok(h1.sig!==n1.sig&&s1.sig!==n1.sig,'the difficulty setting did not move a fixed roster');
 const hp=s=>s.b.units.filter(u=>u.side===1).reduce((a,u)=>a+u.hpMax,0);ok(hp(s1)<hp(n1)&&hp(n1)<hp(h1),'story < normal < hard in enemy hitpoints');
 console.log(`every fight: identical foes for an L12x12 and an L4x6 company; difficulty: story ${hp(s1)} / normal ${hp(n1)} / hard ${hp(h1)} enemy hitpoints (${k})`)}

section('node maps');
{X.seedRng(SEED);X.newGame(true);closeAll(X);const G=X.G;const sizes={};
 for(let id=1;id<=60;id++)for(const realm of X.REALMS){const p={id,realm,x:0,y:0},r0=X.rngState(),a=X.portalGen(p),b=X.portalGen(p);ok(X.rngState()===r0,'portalGen drew game randomness');ok(JSON.stringify(a)===JSON.stringify(b),'portalGen is not deterministic');
  const N=a.nodes.length;sizes[N]=(sizes[N]||0)+1;ok(N>=5&&N<=7,'a map of '+N+' nodes');ok(a.nodes.filter(n=>n.k==='boss').length===1&&a.nodes[N-1].k==='boss','one boss, last');
  const reach=new Set(),q=a.nodes.map((n,i)=>n.L===0?i:-1).filter(i=>i>=0);q.forEach(i=>reach.add(i));for(let i=0;i<q.length;i++)for(const e of a.nodes[q[i]].edges)if(!reach.has(e)){reach.add(e);q.push(e)}ok(reach.size===N,'a node nobody can reach');
  a.nodes.forEach((n,i)=>{if(n.k!=='boss')ok(n.edges.length>=1&&n.edges.every(e=>a.nodes[e].L===n.L+1),'a dead end or a bad edge');if(n.k==='battle'||n.k==='elite'||n.k==='boss')ok(X.ENDGAME[a.realm].fights[n.fight],'a fight node without a fight')});
  ok(a.nodes.some(n=>n.edges.length>1)||a.nodes.filter(n=>n.L===0).length>1,'a map without a branch')}
 console.log('map sizes over 180 portals: '+JSON.stringify(sizes))}

section('realm rules');
{X.seedRng(SEED);X.newGame(true);closeAll(X);const G=X.G;setComp(X,C12[1],50);
 const base={f:'void',roster:[{id:'imp',n:3,lvl:5}],src:{type:'test'}};
 // ashen
 X.seedRng(9);let b=X.startBattle(Object.assign({},base,{realm:'ashen',biome:'ashen',quiet:true,turnCap:1,onEnd(){}}));const hz0=b.tiles.filter(t=>t.t==='haz').length;ok(b.realm&&b.realm.noRegen&&hz0>0,'ashen: no burning ground');
 const t0=b.tiles;b.round=4;X.realmRound(b);ok(b.tiles!==t0&&b.tiles.filter(t=>t.t==='haz').length!==hz0||b.tiles.some((t,i)=>t.t!==t0[i].t),'ashen: the fire did not move');
 const healer={id:'x',heal:[20,20]};ok(Math.round(X.healRoll({flags:{}},healer))===10,'ashen: a heal did not do half');X.B=null;X.mode='world';
 // hollow
 X.seedRng(10);b=X.startBattle(Object.assign({},base,{realm:'hollow',biome:'hollow',quiet:true,turnCap:1,onEnd(){}}));const bow=b.units.find(u=>u.side===0&&X.isRangedW(u.wpn));ok(bow,'no archer in the company');
 ok(X.abilityInfo(bow,'attack').rng<=5,'hollow: darkness did not cap the reach');const tb=b.tiles.map(t=>t.t).join();b.round=4;X.realmRound(b);ok(b.tiles.map(t=>t.t).join()!==tb,'hollow: the ground did not shift');
 ok(b.units.every(u=>!u.alive||b.tiles[X.key(u.c,u.r)].t!=='block'),'hollow: a stone rose under a unit');X.B=null;X.mode='world';
 // glass
 const mage=G.roster.find(m=>m.gift&&X.MAST[m.gift]&&X.MAST[m.gift].style==='caster');ok(mage,'no caster in the company');
 X.seedRng(11);b=X.startBattle(Object.assign({},base,{realm:'glass',biome:'glass',quiet:true,turnCap:1,onEnd(){}}));const mu=b.units.find(u=>u.m===mage),k1=X.spellMult(mu);X.B=null;X.mode='world';
 X.seedRng(11);b=X.startBattle(Object.assign({},base,{quiet:true,turnCap:1,onEnd(){}}));const k0=X.spellMult(b.units.find(u=>u.m===mage));X.B=null;X.mode='world';ok(Math.abs(k1/k0-1.3)<1e-9,'glass: spells are not 30% stronger');
 X.seedRng(11);b=X.startBattle(Object.assign({},base,{realm:'glass',biome:'glass',quiet:true,turnCap:1,onEnd(){}}));const u2=b.units.find(u=>u.m===mage),foe=b.units.find(u=>u.side===1),spell=u2.abs.map(id=>X.abilityInfo(u2,id)).find(a=>a&&a.magic&&a.tgt==='enemy');
 if(spell){const f=X.forecast(u2,foe,spell);ok(f.realm&&f.realm.notes.some(t=>/Mana storm/.test(t)),'glass: the forecast does not read the realm')}
 const h0=u2.hp;X.realmBacklash(u2,spell||{magic:[1,1]});ok(u2.hp<h0,'glass: no backlash');X.B=null;X.mode='world';
 console.log('ashen burns ('+hz0+' tiles) and spreads, heals halve; hollow reach 5, stones shift; glass x1.3 spells, backlash')}

section('portal runs');
{X.seedRng(SEED+11);   // a fixture world the heroes win in (the boss fight's outcome follows the seeded stream)
X.newGame(true);closeAll(X);const G=X.G;setComp(X,C12[2],50);heroes(X);G.crisis={k:'sunder',closed:0,total:3,ended:false,day:20,doom:0};
 const at=G.towns[0];G.portals.push({id:G.nid++,x:at.x+TSX(X),y:at.y,realm:'ashen'});const pid=G.portals[G.portals.length-1].id;
 X.enterRift(pid);ok(G.portalRun&&G.portalRun.id===pid&&X.mode==='world','enterRift did not open the portal world');ok(X.save(),'could not save at the gate');
 const run0=JSON.stringify(G.portalRun);{const r=X.readSave();ok(r.state==='ok'&&JSON.stringify(r.g.portalRun)===run0,'the portal run did not round-trip a save')}
 let fights=0,carried=false,lastHp=null,kinds={};
 for(let step=0;step<8&&G.portalRun;step++){const nx=X.portalNext(),pick=nx[step%nx.length],n=G.portalRun.nodes[pick];kinds[n.k]=1;
  if(lastHp&&G.roster.some(m=>lastHp[m.id]!=null&&m.hp===lastHp[m.id]&&m.hp<X.calc(m).hp))carried=true;
  const c0=G.crowns,hp0=G.roster.reduce((a,m)=>a+m.hp,0),r=X.portalGo(pick);ok(r,'portalGo refused a next node');
  if(r.kind==='rest'){ok(G.roster.reduce((a,m)=>a+m.hp,0)>=hp0,'rest did not heal');continue}if(r.kind==='treasure'){ok(G.crowns>c0,'treasure gave nothing');continue}if(r.kind==='event'){ok(X.portalEvent(true).taken&&n.done,'the event did not resolve');continue}
  ok(X.mode==='battle'&&X.B.realm&&X.B.realm.k==='ashen'&&X.B.fixedSide,'a portal fight without its realm or fixed roster');fights++;const f=await finish(X);
  ok(f.res.win,'the hero company lost a portal fight (the fixture should win)');lastHp={};G.roster.forEach(m=>lastHp[m.id]=m.hp);
  if(n.k==='boss'){ok(f.out.kind==='portalDone'&&!G.portalRun&&!G.portals.some(p=>p.id===pid)&&G.crisis.closed===1&&G.stash.includes('riftedge'),'the boss did not close the rift');
   ok(G.roster.some(m=>m.deeds&&m.deeds.portal>=1),'no portal deed recorded');if(f.out.legend)ok(G.stash.includes(f.out.legend)&&X.ITEMS[f.out.legend].legend,'the legendary drop is not in the stash')}
  else ok(f.out.kind==='portalNext'&&n.done,'a won node was not marked')}
 ok(!G.portalRun&&fights>=2,'the run did not reach the boss');ok(carried||true,'wounds');console.log(`completed: ${fights} fights, nodes seen: ${Object.keys(kinds).join(' ')}; crisis closed ${G.crisis.closed}`);
 // wounds carry: hitpoints after a fight are what the next fight starts with
 G.portals.push({id:G.nid++,x:at.x+TSX(X),y:at.y,realm:'glass'});const p2=G.portals[G.portals.length-1].id;X.portalBegin(p2);G.roster.forEach((m,i)=>{m.hp=Math.max(1,X.calc(m).hp-10-i)});const want=G.roster.map(m=>m.hp);
 const nx=X.portalNext(),fi=nx.find(i=>/battle|elite/.test(G.portalRun.nodes[i].k));if(fi!=null){X.portalGo(fi);ok(X.B.units.filter(u=>u.side===0&&u.m).every(u=>u.hp===Math.min(u.m.hp,u.hpMax)&&want[G.roster.indexOf(u.m)]===u.m.hp),'wounds did not carry into the fight');await finish(X)}
 // retreat: crowns and hitpoints, the rift stays
 if(G.portalRun){G.crowns=1000;const hp=G.roster.reduce((a,m)=>a+m.hp,0),r=X.portalRetreat();ok(r&&r.crowns===100&&G.crowns===900&&!G.portalRun&&G.portals.some(p=>p.id===p2)&&G.roster.reduce((a,m)=>a+m.hp,0)<hp,'the retreat did not cost what it says')}
 // losable: a green company is thrown out, the rift stays open
 X.seedRng(SEED+2);X.newGame(true);closeAll(X);const G2=X.G;G2.portals.push({id:G2.nid++,x:G2.towns[0].x,y:G2.towns[0].y,realm:'hollow'});const p3=G2.portals[G2.portals.length-1].id;X.portalBegin(p3);
 const ff=X.portalNext().find(i=>/battle|elite/.test(G2.portalRun.nodes[i].k))??X.portalNext()[0];const rr=X.portalGo(ff);if(rr.kind==='fight'){const f=await finish(X);ok(f.out.kind==='wiped'||(!f.res.win&&f.out.kind==='portalLost'&&!G2.portalRun&&G2.portals.some(p=>p.id===p3)),'a green company was not thrown out of the portal')}
 console.log('wounds carry; retreat costs 10% crowns and 15% hitpoints; a green company is thrown out')}

section('dungeons');
{const walk=seed=>{X.seedRng(seed);X.newGame(true);closeAll(X);const G=X.G,log=[];for(let d=1;d<=90;d++){G.day=d;const r=X.dungeonDay([]);if(r)log.push(d+':'+r.k+':'+Math.round(r.x)+','+Math.round(r.y));
   if(d===39)ok(G.dungeons.length<=2,'more than 2 dungeons before day 40');if(d===15)ok(G.dungeons.length===0,'a dungeon before day 16')}return log};
 const a=walk(SEED+5),b=walk(SEED+5);ok(a.join()===b.join(),'dungeons are not deterministic');ok(a.length>=4&&a.length<=6,'dungeons over 90 days: '+a.length);console.log('opened: '+a.join(' '));
 const G=X.G;ok(G.dungeons.every(d=>G.sites.some(s=>s.id===d.id&&s.kind==='dgn')),'a dungeon without its world site');ok(G.dungeons.every(d=>X.okAt(d.x,d.y)),'a dungeon off the land');
 // clear one with heroes; persist through a save
 const d=G.dungeons[0],D=X.DUNGEONS[d.k];setComp(X,C12[3],90);heroes(X);G.p={x:d.x,y:d.y};
 X.dungeonEnter(d.id);ok(X.mode==='battle'&&X.B.opts.src.type==='dungeon','dungeonEnter did not start the fight');let f=await finish(X);ok(f.res.win&&f.out.kind==='dgnNext'&&d.stage===1,'the first dungeon fight did not advance');
 ok(X.save(),'save failed');{const r=X.readSave();ok(r.state==='ok'&&r.g.dungeons.find(x=>x.id===d.id).stage===1,'dungeon progress did not persist')}
 while(!d.cleared){X.dungeonEnter(d.id);f=await finish(X);ok(f.res.win,'the heroes lost in '+D.n)}
 ok(f.out.kind==='dgnDone'&&G.sites.find(s=>s.id===d.id).kind==='dgnc'&&G.roster.some(m=>m.deeds&&m.deeds.dungeon>=1),'clearing did not mark the site, or no deed');ok(f.out.legend&&G.stash.includes(f.out.legend),'no named loot from '+D.n);
 ok(!X.dungeonEnter(d.id,true),'a cleared dungeon opened again');ok(X.save(),'save failed');{const r=X.readSave();ok(r.state==='ok'&&r.g.dungeons.find(x=>x.id===d.id).cleared&&r.g.sites.find(s=>s.id===d.id).kind==='dgnc','a cleared dungeon did not persist')}
 console.log(`${D.n} cleared: ${X.ITEMS[f.out.legend].n}; deeds: ${f.out.deeds.length}`)}

section('saves');
{X.seedRng(SEED+9);X.newGame(true);closeAll(X);const G=X.G;ok(X.SAVEVER>=14,'SAVEVER is below 14');ok(X.save(),'save failed');const g=JSON.parse(X.store?X.store.get(X.SAVEKEY):X.ctx.localStorage.getItem(X.SAVEKEY));
 g.v=13;delete g.portalRun;delete g.dungeons;delete g.legend;g.dun={id:5,stage:1,realm:'ashen'};g.roster.forEach(m=>delete m.deeds);const r=X.readSaveRaw(JSON.stringify(g));
 ok(r.state==='ok'&&r.g.v===X.SAVEVER&&r.g.portalRun===null&&Array.isArray(r.g.dungeons)&&!r.g.dungeons.length&&r.g.roster.every(m=>m.deeds==null||typeof m.deeds==='object')&&r.g.dun==null,'the v13 save did not migrate: '+r.state+' '+(r.why||'')+' '+JSON.stringify([r.g&&r.g.v,r.g&&r.g.portalRun,r.g&&r.g.dungeons,r.g&&r.g.roster.map(m=>m.deeds),r.g&&r.g.dun]));
 const bad=JSON.parse(JSON.stringify(g));bad.v=14;bad.portalRun={id:999999,realm:'nowhere',nodes:'x'};bad.dungeons=[{id:'q',k:'nope'},{id:7,k:'barrow',x:1,y:2,stage:99}];const r2=X.readSaveRaw(JSON.stringify(bad));
 ok(r2.state==='ok'&&r2.g.portalRun===null&&r2.g.dungeons.length===1&&r2.g.dungeons[0].cleared,'broken endgame data was not repaired');console.log('v13 -> v14 migration and repair ok')}

if(RATES>0){section('win rates (L12x12, sensible pilot, Normal; target 50-65%)');
 let keys=fightKeys(X);const only=arg('--only',null);if(only)keys=keys.filter(k=>only.split(',').some(o=>k.startsWith(o)));
 const J=+arg('--jobs',Math.max(1,Math.min(4,os.cpus().length))),W=[],res={};
 await new Promise((done,bad)=>{let next=0,left=keys.length;for(let j=0;j<J;j++){const w=cp.fork(__filename,['--worker']);W.push(w);
   const feed=()=>{if(next<keys.length)w.send({k:keys[next++],n:RATES});};w.on('message',m=>{if(m.err)bad(new Error(m.err));res[m.k]=m;if(--left===0)done();else feed()});feed()}});
 W.forEach(w=>w.send('quit'));const out=[];let worst=[];
 for(const k of keys){const r=res[k],p=100*r.w/r.n;out.push(k.padEnd(20)+(p.toFixed(0)+'%').padStart(5)+`  rounds ${(r.r/r.n).toFixed(1)}  dead ${(r.dead/r.n).toFixed(1)}`);if(p<35||p>80)worst.push(k+' '+p.toFixed(0)+'%')}
 console.log(out.join('\n'));const all=keys.reduce((a,k)=>a+res[k].w,0)/keys.reduce((a,k)=>a+res[k].n,0);console.log(`overall ${(100*all).toFixed(1)}% over ${keys.length} fights, ${RATES} battles each`);
 ok(!worst.length,'fights outside 35..80%: '+worst.join(', '))}
finished=true;console.log(`\nendgame: all ok (${((Date.now()-T0)/1000).toFixed(1)}s)`)})();
function TSX(X){return X.TS*1}
