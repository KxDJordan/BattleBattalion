// Difficulty in battle: Story / Normal / Hard / Brutal for a company and for the solo runs.   node test/brutal.js [--n N] [--quick] [--jobs J] [--measure]
//                                                                                              [--set "JS statement"] [--json file]
// Loads src/*.js through test/balance.js's loader (its --lib exports) and fights the same seeded battles (the seed never depends on the
// difficulty: every row is a paired comparison) at each difficulty, the player's side flown by the naive and the sensible pilot:
//   company   the balance profiles L4x6 (early), L8x9 (mid), L12x12 (late) against the six common factions in turn
//   slayer    the Solo: Beast Slayer at level 3, 6, 9 (balance.js SOLO: its kit, the quarry perks it would keep) against beasts, serpents,
//             ogres, bandits and goblins in turn
//   isekai    the Isekai's solo hero (sword and buckler, medium armor, hp/ms/md talents at three stars; the slayer's level-6 / 9 armor later)
//             at level 3, 6, 9 against goblins, bandits, beasts, the dead and orcs in turn
// Reported per cell: win %, rounds, the hitpoints the side lost (share of its maximum), deaths, swords struck down and injuries a fight.
// Gates (not with --measure):
//   1. Brutal is clearly harder than Hard: the sensible pilot's win rate pooled over the three stages at least BRUTAL.gap points below
//      Hard, for the company and for each solo run; and Brutal costs more blood (deaths + struck down a fight) than Hard.
//      (Measured at --n 40, sensible, pooled over the stages: Hard 63 / 73 / 88 for company / slayer / isekai; Brutal before the Brutal rules
//      40 / 63 / 78, after them 30 / 48 / 68. --mult .8, a typical band you choose to fight: Hard 94 / 87 / 94, Brutal 80 / 81 / 90 -> 76 / 73 / 84.)
//   2. The order holds: Story >= Normal >= Hard >= Brutal (sensible, pooled; a little slack for noise between Story and Normal).
//   3. Solo is not a free ride on Brutal: the solo runs' sensible win rate on Brutal at least BRUTAL.soloGap points below their Normal one.
//   4. Normal and Hard are untouched by the Brutal rules: on fixed seeds every battle's foes (ids, rank, elites, hitpoints) at Story / Normal /
//      Hard are exactly what the base formula gives (budget x DIFF[k].budget, no Brutal extras), for a company and for both solo runs, and
//      a few whole Normal / Hard battles a stage (both pilots) end exactly as recorded in test/brutal-ref.json (written on the base, before
//      the Brutal rules: node test/brutal.js --write-ref --srcdir <the base's src>).
'use strict';
const path=require('path'),cp=require('child_process'),fs=require('fs');
const ARGV=process.argv.slice(2),has=f=>ARGV.includes(f),arg=(f,d)=>{const i=ARGV.indexOf(f);return i>=0&&i+1<ARGV.length?ARGV[i+1]:d};
process.argv.push('--lib');const L=require(path.join(__dirname,'balance.js'));process.argv.pop();
const SEED=+arg('--seed',20261120),DIFFS=['story','normal','hard','brutal'],PILOTS=['naive','sensible'],FACS=['gob','undead','beast','orc','bandit','void'];
const REF={};
const TARGET={normal:80,hard:60,brutal:30,tol:7,stage:15,story:8,blood:1.1};
const ISEK=[{id:'I3',lvl:3,day:3},{id:'I6',lvl:6,day:16,gear:{w:'arming',s:'kite',a:'mail',h:'kettle'}},{id:'I9',lvl:9,day:32,gear:{w:'arming',s:'heater',a:'mail',h:'nasal'}}];
const GROUPS={
 company:{profs:['L4x6','L8x9','L12x12'],facs:FACS,k:8},
 slayer:{profs:['S3','S6','S9'],facs:['beast','serpent','ogre','bandit','gob'],k:16},
 isekai:{profs:['I3','I6','I9'],facs:['gob','bandit','beast','undead','orc'],k:16}};
const hash=L.hash;
function fail(msg){console.error('\nFAIL: '+msg);process.exit(1)}
/* ---------- building the sides ---------- */
function buildIsekai(X,P,seed){X.seedRng(seed);X.newGame(true,{origin:'isekai',isekai:{mode:'solo',name:'Hero',tal:['hp','ms','md'],trees:['vanguard','duelist','survivor','tactician'],wt:'sword',at:'medarmor'}});
 L.closeAll(X);const G=X.G,m=G.roster[0];m.field=true;if(P.gear)Object.assign(m.eq,P.gear);if(typeof X.fixHands==='function')X.fixHands(m);delete m.cond;
 if(P.lvl>m.lvl)X.gainXP(m,X.XPT[P.lvl]-m.xp);let g=0;
 while(m.pend>0&&g++<40){for(const k of ['hp','ms','md']){const t=m.tal[k]||0;m.base[k]+=X.ri(X.ROLL[k][0]+Math.floor(t/2),X.ROLL[k][1]+Math.ceil(t/2))}m.pend--}
 L.learnAll(X,m);m.hp=X.calc(m).hp;G.stash.length=0;return{roster:X.clone(G.roster),isekai:X.clone(G.isekai)}}
function profOf(id){return L.PROFILES.find(p=>p.id===id)||L.SOLO.find(p=>p.id===id)||ISEK.find(p=>p.id===id)}
function build(X,grp,id,k){const P=profOf(id),seed=SEED+hash(grp+'/'+id)%9973+k*101;
 if(grp==='isekai')return buildIsekai(X,P,seed);return{roster:L.buildCompany(X,P,seed)}}
// put side c on the field as group grp at difficulty diff (G.diff: the only thing that differs between the rows of a battle)
function setSide(X,grp,c,P,f,diff){const G=X.G;G.roster=X.clone(c.roster);G.stash=[];G.day=P.day;X.B=null;X.mode='world';G.diff=diff;G.fabled={};
 delete G.isekai;if(grp==='slayer'){G.origin='slayer';L.soloPrep(X,G.roster[0],f,P)}else if(grp==='isekai'){G.origin='isekai';G.isekai=X.clone(c.isekai);G.isekai.hero=G.roster[0].id}else G.origin='free'}
function battleSeed(grp,id,i){return(hash(grp+'|'+id)^Math.imul(i+1,2654435761)^SEED)>>>0}
async function fight(X,W,job,i){const G0=GROUPS[job.grp],P=profOf(job.prof),f=G0.facs[i%G0.facs.length],cs=W[job.grp+'/'+job.prof],c=cs[i%cs.length];
 setSide(X,job.grp,c,P,f,job.diff);const G=X.G,n0=G.roster.length;X.seedRng(battleSeed(job.grp,job.prof,i));
 const res=await X.autoBattle({f,mult:job.mult||1,biome:['plains','forest','hills','swamp','desert','snow'][i%6],pilot:job.pilot,src:{type:'test'},turnCap:4000});
 if(!res)throw new Error('battle did not start');if(X.FX.err)throw X.FX.err;
 let hp=0,hpM=0;for(const r of res.men||[]){hpM+=r.hpMax||0;hp+=r.state==='dead'?0:r.state==='down'?0:Math.min(r.hpMax||0,r.hp||0)}
 const b=X.B,elites=b?b.units.filter(u=>u.side===1&&u.elite&&u.elite.length).length:0,foes=b?b.units.filter(u=>u.side===1&&!u.spawned).length:0;X.B=null;X.mode='world';
 return{win:res.win&&!res.stuck?1:0,stuck:res.stuck?1:0,rounds:res.rounds||0,lost:hpM?1-hp/hpM:0,dead:(res.dead||[]).length,down:(res.down||[]).length,inj:(res.injuries||[]).length,foes,elites,n0}}
// what the band would be at each difficulty, without fighting: the foe ids, rank and hitpoints of the battle startBattle rolls (gate 4)
function bandOf(X,W,grp,prof,i,diff){const G0=GROUPS[grp],P=profOf(prof),f=G0.facs[i%G0.facs.length],cs=W[grp+'/'+prof],c=cs[i%cs.length];setSide(X,grp,c,P,f,diff);X.seedRng(battleSeed(grp,prof,i));
 const o={f,mult:1,biome:'plains',pilot:'sensible',src:{type:'test'},auto:true,quiet:true,onEnd(){}};if(!X.startBattle(o))throw new Error('no battle');const b=X.B;
 const out={budget:Math.round(X.battleBudget(o)*1000)/1000,foes:b.units.filter(u=>u.side===1).map(u=>[u.eid,u.hpMax,u.armMax,u.wpn&&u.wpn.d&&u.wpn.d.join('-'),(u.elite||[]).join('+'),u.ms,u.md].join(':'))};X.B=null;X.mode='world';return out}
/* ---------- worker ---------- */
function mkWorld(){const X=L.makeContext();X.AI_CLOCK=null;return{X,W:{}}}
function ensure(S,grp,prof){const k=grp+'/'+prof;if(!S.W[k]){S.W[k]=[];for(let j=0;j<GROUPS[grp].k;j++)S.W[k].push(build(S.X,grp,prof,j))}}
for(let i=0;i<ARGV.length;i++)if(ARGV[i]==='--set')process.env.BRUTAL_SET=(process.env.BRUTAL_SET||'')+ARGV[i+1]+';\n';
function applySets(X){if(process.env.BRUTAL_SET)require('vm').runInContext(process.env.BRUTAL_SET,X.ctx)}
if(has('--worker')){let S=null;const q=[];let busy=false;
 const pump=async()=>{if(busy)return;busy=true;while(q.length){const job=q.shift();
   try{if(!S){S=mkWorld();applySets(S.X)}ensure(S,job.grp,job.prof);const r={win:0,stuck:0,rounds:0,lost:0,dead:0,down:0,inj:0,foes:0,elites:0,n:0};
    for(let i=job.i0;i<job.i0+job.n;i++){const o=await fight(S.X,S.W,job,i);for(const k in o)if(k in r)r[k]+=o[k];r.n++}
    process.send({id:job.id,r})}catch(e){process.send({id:job.id,err:String(e&&e.stack||e)})}}busy=false};
 process.on('message',m=>{if(m==='quit')process.exit(0);q.push(m);pump()});return}
/* ---------- main ---------- */
(async()=>{const QUICK=has('--quick'),N=+arg('--n',QUICK?30:60),J=Math.max(1,+arg('--jobs',2)),T0=Date.now(),MEAS=has('--measure');
 const only=arg('--only',null),grps=Object.keys(GROUPS).filter(g=>!only||only.split(',').includes(g)),diffs=arg('--diffs',DIFFS.join(',')).split(','),pilots=arg('--pilots',PILOTS.join(',')).split(',');
 // gate 4 first (cheap, deterministic): every level's budget is the formula; Story fights exactly as recorded (this retune left it alone)
 if(!MEAS&&!has('--no-same')||has('--write-ref')){const RF=path.join(__dirname,'brutal-ref.json'),ref=has('--write-ref')?{}:fs.existsSync(RF)?JSON.parse(fs.readFileSync(RF,'utf8')):{};const S=mkWorld();applySets(S.X);const X=S.X;let n=0,nr=0;
  const D=X.DIFF;if(['vet','solo','foeHit','foePlan'].some(k=>D.story[k]!=null))fail('Story has a level rule beyond its factors: '+JSON.stringify(D.story));
  if(['foeHit','foePlan'].some(k=>D.normal[k]!=null)||D.normal.solo&&D.normal.solo.max||D.hard.foePlan||D.hard.solo&&D.hard.solo.max)fail('Normal / Hard carry a Brutal rule (foePlan, solo.max) or Normal a foeHit');
  // the curve, written out again here: 1 + lo + (hi - lo) x clamp((L - lvl0) / (lvl1 - lvl0), 0, 1) over the fielded swords' average level
  const curve=(V,L)=>{if(!V||!(V.lo||V.hi))return 1;const a=V.lvl0||0,b=V.lvl1>a?V.lvl1:a+1,t=Math.min(1,Math.max(0,(L-a)/(b-a)));return 1+(V.lo||0)+((V.hi||0)-(V.lo||0))*t};
  for(const grp of grps)for(const prof of GROUPS[grp].profs){ensure(S,grp,prof);for(let i=0;i<12;i++){
   const st=bandOf(X,S.W,grp,prof,i,'story'),b0=st.budget/D.story.budget,F=X.battleField({}),L=F.reduce((s,m)=>s+m.lvl,0)/F.length,band={story:st};
   for(const d of DIFFS){const a=d==='story'?st:bandOf(X,S.W,grp,prof,i,d),V=grp==='company'?D[d].vet:D[d].solo,want=b0*D[d].budget*(grp!=='company'&&V&&V.k>0?V.k:1)*curve(V,L);
    if(Math.abs(a.budget-want)>.004*Math.max(1,want))fail(`${grp} ${prof} #${i} ${d}: budget ${a.budget} is not ${want.toFixed(3)} (the base ${b0.toFixed(3)} x DIFF.${d}.budget x the curve at level ${L.toFixed(1)})`);n++}
   const key=grp+'/'+prof+'/'+i;
   if(has('--write-ref')){REF[key]=band}else if(ref[key]){nr++;if(JSON.stringify(ref[key].story)!==JSON.stringify(st))fail(`${key} story: the band changed: ${JSON.stringify(st)} vs ${JSON.stringify(ref[key].story)}`)}else fail(`${key}: no reference band (node test/brutal.js --write-ref)`)}}
  // and whole Story battles: a few fights a stage, sensible and naive, end exactly as recorded (the foes' AI included)
  let nf=0;for(const grp of grps)for(const prof of GROUPS[grp].profs)for(const diff of ['story'])for(const pilot of PILOTS)for(let i=0;i<2;i++){
   const o=await fight(X,S.W,{grp,prof,diff,pilot},i),key='fight/'+[grp,prof,diff,pilot,i].join('/'),v=JSON.stringify(o);nf++;
   if(has('--write-ref'))REF[key]=o;else if(!ref[key])fail(key+': no reference fight');else if(JSON.stringify(ref[key])!==v)fail(`${key}: the battle changed: ${v} vs ${JSON.stringify(ref[key])}`)}
  if(has('--write-ref')){fs.writeFileSync(path.join(__dirname,'brutal-ref.json'),JSON.stringify(REF));console.log('wrote test/brutal-ref.json: '+Object.keys(REF).length+' entries');return}
  console.log(`gate 4: ${n} bands at the four levels on the budget formula (base x DIFF[k].budget x the level's curve), ${nr} Story bands and ${nf} Story battles exactly as recorded`)}
 const jobs=[];let id=0;const CH=Math.max(5,Math.ceil(N/4));
 for(const grp of grps)for(const prof of GROUPS[grp].profs)for(const pilot of pilots)for(const diff of diffs)for(let i0=0;i0<N;i0+=CH)jobs.push({id:id++,grp,prof,pilot,diff,i0,n:Math.min(CH,N-i0),mult:+arg('--mult',1)});
 const ws=[];let next=0,left=jobs.length;
 await new Promise((done,bad)=>{const feed=w=>{if(next<jobs.length){w.cur=jobs[next++];w.send(w.cur)}};
  for(let i=0;i<J;i++){const w=cp.fork(__filename,['--worker'].concat(has('--srcdir')?['--srcdir',arg('--srcdir')]:[]),{env:process.env});ws.push(w);
   w.on('message',m=>{if(m.err){ws.forEach(x=>x.kill());bad(new Error(m.err));return}jobs[m.id].res=m.r;process.stderr.write('.');if(--left===0){ws.forEach(x=>x.send('quit'));done()}else feed(w)});feed(w)}}).catch(e=>fail(e.stack||e));
 process.stderr.write('\n');
 const cell={};for(const j of jobs){const k=[j.grp,j.prof,j.pilot,j.diff].join('|'),c=cell[k]||(cell[k]={win:0,stuck:0,rounds:0,lost:0,dead:0,down:0,inj:0,foes:0,elites:0,n:0});for(const x in c)c[x]+=j.res[x]}
 const pct=(a,n)=>(100*a/Math.max(1,n)).toFixed(0).padStart(3)+'%',f2=(a,n)=>(a/Math.max(1,n)).toFixed(2);
 for(const grp of grps){console.log(`\n== ${grp} (${N} battles a cell; win% · rounds · hp lost · dead / down / injuries a fight · foes (elites) a fight) ==`);
  console.log('prof  pilot     '+diffs.map(d=>d.padEnd(38)).join(''));
  for(const prof of GROUPS[grp].profs)for(const pilot of pilots){let s=prof.padEnd(6)+pilot.padEnd(10);
   for(const d of diffs){const c=cell[[grp,prof,pilot,d].join('|')];s+=(`${pct(c.win,c.n)} ${(c.rounds/c.n).toFixed(1).padStart(4)}r ${pct(c.lost,c.n)} ${f2(c.dead,c.n)}/${f2(c.down,c.n)}/${f2(c.inj,c.n)} ${f2(c.foes,c.n)}(${f2(c.elites,c.n)})`).padEnd(38)}console.log(s)}}
 if(arg('--json',null))fs.writeFileSync(arg('--json'),JSON.stringify(cell,null,1));
 const pool=(grp,pilot,d)=>{let w=0,n=0,b=0;for(const prof of GROUPS[grp].profs){const c=cell[[grp,prof,pilot,d].join('|')];if(!c)continue;w+=c.win;n+=c.n;b+=c.dead+c.down}return{w:100*w/Math.max(1,n),b:b/Math.max(1,n)}};
 console.log('\npooled (sensible): '+grps.map(g=>g+' '+diffs.map(d=>d+' '+pool(g,'sensible',d).w.toFixed(0)+'%').join(' ')).join(' | '));
 console.log('pooled (naive):    '+grps.map(g=>g+' '+diffs.map(d=>d+' '+pool(g,'naive',d).w.toFixed(0)+'%').join(' ')).join(' | '));
 if(MEAS||!diffs.includes('brutal')||!pilots.includes('sensible')){console.log(`\n(${((Date.now()-T0)/1000).toFixed(0)} s)`);return}
 let bad=[];const T=TARGET;
 for(const grp of grps){const P={};for(const d of DIFFS)P[d]=pool(grp,'sensible',d);
  for(const d of ['normal','hard','brutal']){if(Math.abs(P[d].w-T[d])>T.tol)bad.push(`${grp}: ${d} ${P[d].w.toFixed(0)}% is not ${T[d]} ± ${T.tol}`);
   for(const prof of GROUPS[grp].profs){const c=cell[[grp,prof,'sensible',d].join('|')],w=100*c.win/c.n;if(Math.abs(w-T[d])>T.stage)bad.push(`${grp} ${prof}: ${d} ${w.toFixed(0)}% is not ${T[d]} ± ${T.stage}`)}}
  if(!(P.story.w>=P.normal.w+T.story))bad.push(`${grp}: Story ${P.story.w.toFixed(0)}% is not ${T.story} points above Normal ${P.normal.w.toFixed(0)}%`);
  if(!(P.normal.w>P.hard.w&&P.hard.w>P.brutal.w))bad.push(`${grp}: the order Normal ${P.normal.w.toFixed(0)} > Hard ${P.hard.w.toFixed(0)} > Brutal ${P.brutal.w.toFixed(0)} does not hold`);
  if(!(P.brutal.b>=P.hard.b*T.blood))bad.push(`${grp}: Brutal costs ${P.brutal.b.toFixed(2)} dead + down a fight, not ${T.blood}x Hard's ${P.hard.b.toFixed(2)}`)}
 if(bad.length)fail(bad.join('\n      '));
 console.log(`\nPASS: Normal ${T.normal} / Hard ${T.hard} / Brutal ${T.brutal} ± ${T.tol} pooled (± ${T.stage} a stage) for the company and both solo runs; Story ${T.story}+ above Normal; Brutal bloodier than Hard (${((Date.now()-T0)/1000).toFixed(0)} s)`)})();
