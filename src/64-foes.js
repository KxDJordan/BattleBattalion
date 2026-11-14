/* ================= FOES ================= */
/* Enemy factions: abilities, resources, passives and the hooks that make them work.
   Everything an enemy can do is an AB entry with foe:1. Entries without `run` are executed by the normal
   useAbility(); entries with `run(u,k,a)` carry a mechanic of their own (raise, summon, charge, nova) and are
   executed by foeUse(), which pays the same costs and emits the same 'cast' event. Extra fields the AI reads:
     cd    turns before it can be used again        uses  times per battle
     req   'flank' | 'held': a condition on the target (see foeReq)
     ai    (u,X) -> [{k, s?, v}]  candidates for abilities the generic scoring cannot judge (63-ai.js)
     tele  1 = starts a telegraphed attack that lands on the unit's next turn (listed in B.tele)
   Passives are data on the EN entry: pack (direwolves), wall (skeletons), tire (orcs), enrage (owlbear, tyrant).
   They become numbers through one buff object per unit (u.fb, kept in u.buffs) that foeAuras() recomputes after
   every event that can change them, so hitChance(), strike() and forecast() see them like any other buff.
   Statuses added here live in u.st like the rules' own and are described in FOE_ST (merged into STATUS). */
let BUDGETK=1;      // scales every enemy budget (tuned by test/balance.js)
let FOE_TICK=1;
const FOE_FURY={dmg:.09,ms:3};   // orc battle fury per turn of fury left (they start with 6): the reason to outlast them   // 0 if the rules ever tick every u.st key themselves
const FOE_RANK={base:21,hp:.35,dmg:.55,arm:.25,ms:8,md:3,max:24};  // how enemy quality follows the budget (see foeRank; the exponents g and cap are per faction, FACT[f].rank)
const FOE_ST={
 poison:{n:'Poisoned',d:'Loses 6 hitpoints at the start of each of its turns.',icon:'st-poison',good:0,t:1},
 hex:{n:'Hexed',d:'−15 melee and ranged skill, −15 resolve.',icon:'st-hex',good:0,t:1},
 chant:{n:'War chant',d:'+20 melee and ranged skill, +50% damage, +10 resolve. Ends when the shaman dies.',icon:'st-chant',good:1,t:1},
 grab:{n:'Grabbed',d:'Held in place by a shambler: cannot move, −10 melee defense.',icon:'st-grab',good:0,t:1},
 harried:{n:'Harried',d:'Two direwolves at its throat, or one and fewer than two allies (or walls) at its side: −25 melee defense, +50% damage taken.',icon:'st-harried',good:0},
 pack:{n:'Pack',d:'+4 melee skill for each other direwolf within 2 tiles.',icon:'st-pack',good:1},
 bonewall:{n:'Shield wall',d:'+8 melee and +10 ranged defense for each skeleton standing beside it (up to two).',icon:'st-bonewall',good:1},
 winded:{n:'Winded',d:'Out of breath: −15 melee skill, −15 melee defense, −8 ranged defense, −20% damage.',icon:'st-winded',good:0},
 fury:{n:'Battle fury',d:'Howling for blood: +9% damage and +3 melee skill for each turn of fury left. It burns down by one every turn.',icon:'st-fury',good:1},
 spent:{n:'Spent',d:'The fury has burned out: −10 melee skill, −10 melee defense.',icon:'st-spent',good:0},
 banner:{n:'Under the chief\'s eye',d:'While the chief lives and stands within 6 tiles: +60 resolve (they will not run), +8 melee skill, +8 melee defense.',icon:'st-banner',good:1},
 enrage:{n:'Enraged',d:'Wounded and furious: +30% damage, +2 action points, −10 melee defense.',icon:'st-enrage',good:1},
 warcry:{n:'War cry',d:'+10 melee skill, +20 resolve.',icon:'st-warcry',good:1,t:1},
 ward:{n:'Void ward',d:'Takes 40% less damage.',icon:'st-ward',good:1,t:1},
 nova:{n:'Gathering the void',d:'Unleashes a void nova on everything within 2 tiles at the start of its next turn. Get clear.',icon:'st-nova',good:0}
};
const FOE_MOD={hex:{ms:-15,rs:-15,brv:-15},chant:{ms:20,rs:20,dmg:.5,brv:10},grab:{md:-10},webbed:{md:-5,rd:-10},winded:{ms:-15,md:-15,rd:-8,dmg:-.2},spent:{ms:-10,md:-10},banner:{brv:60,ms:8,md:8},
 enrage:{dmg:.3,md:-10},warcry:{ms:10,brv:20},ward:{dr:.4}};
const FOE_KEYS=['ms','rs','md','rd','dmg','dr','brv'];
for(const k in FOE_ST)if(!STATUS[k])STATUS[k]=FOE_ST[k];

/* ---- small helpers ---- */
const foeAdj=(a,b)=>Math.abs(a.c-b.c)+Math.abs(a.r-b.r)===1;
function foeFree(c,r){return inb(c,r)&&B.tiles[key(c,r)].t!=='block'&&!unitAt(c,r)}
// Applies a status from an ability with a mechanic of its own (plain abilities do it through strike()).
function foeStatus(t,k,n){if(!t.alive)return;if(typeof addStatus==='function')addStatus(t,k,n);else{t.st[k]=Math.max(t.st[k]||0,n);FX.emit('status',{t,key:k,n})}foeAuras()}
// Morale shift in steps (negative = worse) through the rules' morale; the fearless ignore it.
function foeMor(u,d){if(!u.alive||u.fearless||typeof u.mor!=='number'||typeof setMorale!=='function')return;setMorale(u,clamp(u.mor+d,0,4))}
const foeBroken=u=>u.mor===0;
// Damage that armor cannot stop (poison).
function foeBleed(u,n){hurt(u,n,1,null,{pierce:1})}
/* ---- rank: enemy quality follows the budget ----
   The budget buys bodies (buildEnemies), but a level 12 company is far more than four times a level 1 company, and
   a warband stops at MAXFOES. So every foe also gets a rank x >= 1 from the same budget:
     x = pm^(g(1+h log2 pm))  x  (budget / what MAXFOES average foes cost, if more than 1)^cap,   pm = budget per fielded merc / FOE_RANK.base,   [g, cap, h, base?] = FACT[f].rank (base: the faction's own FOE_RANK.base)
   and with it hp x^.hp, damage x^.dmg, armor x^.arm and .ms / .md points of skill / defense per doubling.
   A company's level, the days passed, the band's strength (mult) and BUDGETK all reach the foes this way. */
function foeBudget(o){if(typeof battleBudget==='function')return battleBudget(o);let b=0;(typeof battleField==='function'?battleField(o):fielded()).forEach(m=>b+=12+m.lvl*5);return b*(o&&o.mult||1)*(1+G.day*.008)*BUDGETK}
function foeRank(f){const b=B;if(!b||!FACT[f])return 1;if(b.frank&&b.frank.f===f)return b.frank.x;
 const U=FACT[f].units;let avg=0;U.forEach(u=>avg+=u[1]);avg/=U.length;let bud=foeBudget(b.opts);
 for(const id of b.opts.fixed||[]){const e=U.find(u=>u[0]===id);bud-=e?e[1]:0}
 const R=FOE_RANK,n=Math.max(1,(typeof battleField==='function'?battleField(b.opts):fielded()).length);
 const q=FACT[f].rank||[.5,1],pm=Math.max(1,bud/n/(q[3]||R.base)),x=clamp(Math.pow(pm,q[0]*(1+(q[2]||0)*Math.log2(pm)))*Math.pow(Math.max(1,bud/(MAXFOES*avg)),q[1]),1,R.max);b.frank={f,x};return x}
/* enemyInit(u,id): called by the rules for every enemy at battle start (and by foeSpawn for late arrivals). */
function enemyInit(u,id){let d=u.def||EN[id];
 // A warband has only so many leaders: the ones beyond def.max take the field as def.sub instead.
 if(d.max&&d.sub&&EN[d.sub]&&B&&!u.spawned){const n=B.fcnt||(B.fcnt={});n[id]=(n[id]||0)+1;if(n[id]>d.max){const e=mkEnemy(d.sub,u.f);for(const k in e)u[k]=e[k];id=d.sub;d=u.def}}
 u.eid=id;u.role=d.role||'line';u.abs=(d.abs||[]).filter(a=>AB[a]);if(u.wpn.reload&&AB.reload&&!u.abs.includes('reload'))u.abs.push('reload');   // a crossbow or firearm: it reloads like a merc
 if(u.wpnAlt&&AB.swap)u.abs.push('swap');   // a sidearm (def.side): the archer is not helpless when a foe gets close
u.cds={};u.usedN={};u.spell=undefined;
 if(d.res)for(const k in d.res)u.res[k]={cur:d.res[k][0],max:d.res[k][0],regen:d.res[k][1]};
 if(d.fatMax){u.fatMax=d.fatMax;u.wpn.fat=d.wfat||10}
 if(d.ign)u.wpn.ign=d.ign;if(d.wap)u.wpn.ap=d.wap;
 u.back=u.role==='caster'||u.role==='sniper';if(d.fury)u.st.fury=d.fury+1;
 const x=foeRank(u.f);
 if(x>1&&!d.boss){const L=Math.log2(x),R=FOE_RANK;u.rank=L;u.lvl=1+Math.round(L*4);
  u.hp=u.hpMax=Math.round(u.hp*Math.pow(x,R.hp));u.arm=u.armMax=Math.round(u.arm*Math.pow(x,R.arm));
  if(typeof u.helm==='number'){u.helm=u.helmMax=Math.round(u.helm*Math.pow(x,R.arm))}
  const k=Math.pow(x,R.dmg);u.wpn.d=[Math.round(d.d[0]*k),Math.round(d.d[1]*k)];if(u.wpnAlt&&d.side&&typeof d.side==='object'){const sd=d.side.d;u.wpnAlt.d=[Math.round(sd[0]*k),Math.round(sd[1]*k)]}u.wpn.spell=k-1;u.ms+=Math.round(R.ms*L);if(u.rs)u.rs+=Math.round(R.ms*L);u.md+=Math.round(R.md*L);u.rd+=Math.round(R.md*L);u.dmgK=k;if(u.side===1&&B)B.venom=Math.round(6*k);
  if(L>=1.5)u.name=(L>=2.75?'Elite ':'Veteran ')+String(d.n).toLowerCase()}
 return u}
// Adds a unit mid-battle through the rules' spawnUnit() when it exists.
function foeSpawn(id,f,c,r,o){const e=mkEnemy(id,f);e.spawned=1;if(o&&o.def)e.def=o.def;enemyInit(e,id);e.c=c;e.r=r;if(o)for(const k in o)if(k!=='def')e[k]=o[k];
 if(!spawnUnit(e))return null;foeAuras();return e}

/* ---- passives: one buff object per unit, recomputed from positions and statuses ---- */
function foeAuras(){const b=B;if(!b||!b.units)return;const U=b.units,n=U.length;
 for(let i=0;i<n;i++){const u=U[i];if(!u.alive)continue;let fb=u.fb;if(!fb)fb=u.fb={dur:1e9,foe:1};
  let ms=0,rs=0,md=0,rd=0,dmg=0,dr=0,brv=0;const st=u.st,d=u.def;
  let wolves=0,pack=0,wall=0,chief=0,side=0;
  for(let j=0;j<n;j++){const o=U[j];if(o===u||!o.alive)continue;const dc=o.c-u.c,dR=o.r-u.r,m=(dc<0?-dc:dc)+(dR<0?-dR:dR);if(m>6)continue;const od=o.def;
   if(m>2){if(od&&od.banner&&o.side===u.side&&d&&d.banner!==1&&o.f===u.f)chief=1;continue}
   if(od&&od.banner&&o.side===u.side&&d&&d.banner!==1&&o.f===u.f)chief=1;
   if(o.side!==u.side){if(m===1&&od&&od.pack)wolves++}
   else if(m===1)side++;
   if(o.side!==u.side)continue;
   if(d&&od){if(d.pack&&od.pack)pack++;if(m===1&&d.wall&&od.wall)wall++}}
  if(wolves&&side<2)for(const [x,y] of DIRS){const c=u.c+x,r=u.r+y;if(!inb(c,r)||b.tiles[r*BW+c].t==='block')side++}
  if(wolves>=2||(wolves&&side<2)){st.harried=1;md-=25;dr-=.5}else if(st.harried)delete st.harried;
  if(chief)st.banner=1;else if(st.banner)delete st.banner;
  if(d){
   if(d.pack){if(pack){pack=Math.min(pack,3);st.pack=pack;ms+=4*pack}else if(st.pack)delete st.pack}
   if(d.wall){if(wall){wall=Math.min(wall,2);st.bonewall=wall;md+=8*wall;rd+=10*wall}else if(st.bonewall)delete st.bonewall}
   if(d.tire){if(u.fat>=u.fatMax*.7)st.winded=1;else if(st.winded)delete st.winded}
   if(st.fury>0){dmg+=FOE_FURY.dmg*st.fury;ms+=FOE_FURY.ms*st.fury}
   if(d.enrage&&!u.enr&&u.hp<=u.hpMax*d.enrage){u.enr=1;st.enrage=1;u.apMax+=2;float(u,'Enraged','#ff7a6b');say(`${u.name} is enraged.`);FX.emit('status',{t:u,key:'enrage'})}}
  let fk=null;for(const k in st){const M=FOE_MOD[k];if(st[k]>0&&STATUS[k]&&!fk)fk=k;if(!M||!(st[k]>0))continue;if(M.ms)ms+=M.ms;if(M.rs)rs+=M.rs;if(M.md)md+=M.md;if(M.rd)rd+=M.rd;if(M.dmg)dmg+=M.dmg;if(M.dr)dr+=M.dr;if(M.brv)brv+=M.brv}
  fb.ms=ms;fb.rs=rs;fb.md=md;fb.rd=rd;fb.dmg=dmg;fb.dr=dr;fb.brv=brv;fb.dur=1e9;
  // The buff rides in u.buffs only while it does something, under the key of a status the unit shows anyway (so it adds no icon of its own).
  const on=!!(ms||rs||md||rd||dmg||dr||brv),bi=u.buffs.indexOf(fb);if(on){fb.key=fk||'buff';if(bi<0)u.buffs.push(fb)}else if(bi>=0)u.buffs.splice(bi,1)}}
/* ---- events: the rules tell the scene what happened through FX.emit; the foes listen on the same wire ---- */
function foeTurn(u){const b=B;if(!u||!u.alive)return;
 if(u.cds)for(const k in u.cds)if(u.cds[k]>0)u.cds[k]--;
 if(u.st.fury>0&&--u.st.fury<=0){delete u.st.fury;u.st.spent=1;float(u,'Spent','#c8d0d8')}
 const st=u.st;if(st.poison>0){float(u,'Poison','#9bd96f');foeBleed(u,b.venom||6)}
 if(FOE_TICK)for(const k in st)if(FOE_ST[k]&&FOE_ST[k].t&&st[k]>0){if(--st[k]<=0)delete st[k]}
}
function foeDeath(t){const b=B;if(!t)return;
 if(!(t.def&&t.def.noCorpse)&&!b.corpses.some(c=>c.c===t.c&&c.r===t.r))b.corpses.push({c:t.c,r:t.r,n:t.name,risen:t.risen?1:0});
 if(b.tele)b.tele=b.tele.filter(x=>x.u!==t);
 if(t.side!==1)return;const mates=b.units.filter(u=>u.alive&&u.side===1&&u.f===t.f);
 if(t.eid==='gobsham'&&!mates.some(u=>u.eid==='gobsham')){mates.forEach(u=>{delete u.st.chant;foeMor(u,-4)});if(mates.length)say('The shaman is dead. The goblins break and run.')}
 else if(t.eid==='necro'&&!mates.some(u=>u.eid==='necro')){const risen=mates.filter(u=>u.risen);if(risen.length)say('The necromancer is dead. What he raised falls apart.');risen.forEach(u=>{if(u.alive){float(u,'Unbound','#c9a8ff');foeBleed(u,u.hp+999)}})}
 else if(t.eid==='orcl')mates.forEach(u=>foeMor(u,-1));
 else if(t.eid==='blead'&&!mates.some(u=>u.eid==='blead')){mates.forEach(u=>foeMor(u,-4));if(mates.length)say('The chief is down. The brigands scatter.')}}
function foeEvent(type,d){const b=B;if(!b||!b.units||!b.units.length)return;
 if(!b.corpses){b.corpses=[];b.tele=[];
  // a goblin band with no shaman to drive it starts the fight already wavering
  if(b.opts.f==='gob'&&!b.units.some(u=>u.side===1&&u.eid==='gobsham'))for(const u of b.units)if(u.side===1&&!u.fearless&&u.mor>2)u.mor=2}
 if(type==='turn')foeTurn(d&&d.u);else if(type==='death')foeDeath(d&&d.t);
 if(type==='turn'||type==='death'||type==='move'||type==='kb'||type==='hit'||type==='spawn'||type==='withdraw')foeAuras()}
if(typeof FX==='object'&&FX&&!FX.foeHook){const e0=FX.emit;FX.foeHook=1;FX.emit=function(type,data){try{foeEvent(type,data)}catch(e){if(!FX.err){FX.err=e;if(typeof console!=='undefined')console.warn('foeEvent('+type+') failed: '+(e&&e.stack||e))}}return e0.call(FX,type,data)}}

/* ---- using abilities ---- */
function foeReq(u,a,t){if(!a.req)return true;
 if(a.req==='flank')return B.units.some(o=>o.alive&&o.side===u.side&&o!==u&&foeAdj(o,t));
 if(a.req==='shield')return !!t.shield;
 if(a.req==='held')return !!(t.st.webbed||t.st.root||t.rooted||t.st.stun);
 return true}
// free: as if no foe stood beside u (the AI asks whether a locked archer could shoot after stepping clear)
function foeReady(u,a,free){if(a.cd&&u.cds&&u.cds[a.id]>0)return false;if(a.uses&&u.usedN&&(u.usedN[a.id]||0)>=a.uses)return false;if(a.hpBelow&&u.hp>u.hpMax*a.hpBelow)return false;return free&&typeof aiCanUseFree==='function'?aiCanUseFree(u,a):canUse(u,a)}
function foeMark(u,a){if(a.cd)(u.cds||(u.cds={}))[a.id]=a.cd+1;if(a.uses){const n=u.usedN||(u.usedN={});n[a.id]=(n[a.id]||0)+1}}
// Executes an ability that carries its own mechanic. Mirrors useAbility(): pay, announce, emit 'cast', act.
async function foeUse(u,a,k){const b=B;payFor(u,a);foeMark(u,a);say(`${u.name} uses ${a.n}.`);FX.ui();const c=k%BW,r=(k/BW)|0;
 FX.emit('cast',{u,t:a.tgt==='self'?u:unitAt(c,r)||null,ab:a,k});await sleep(160);if(B!==b)return;
 await a.run(u,k,a);if(B!==b)return;foeAuras();await sleep(120)}
function foeAllies(u,rng){return B.units.filter(o=>o.alive&&o.side===u.side&&o.f===u.f&&mdist(o,u)<=rng)}
function foeFoes(u){return B.units.filter(o=>o.alive&&o.side!==u.side)}
function foeTele(u,n,keys){B.tele=(B.tele||[]).filter(x=>x.u!==u);if(keys)B.tele.push({u,n,keys})}

const FOE_AB={
 /* ---------- goblins: fragile, fast, numerous; kill the shaman and they break ---------- */
 gslip:{n:'Slip away',d:'Darts up to 2 tiles without provoking attacks.',ap:2,fat:0,rng:2,tgt:'move',cd:2,fx:'dash'},
 gstab:{n:'Backstab',d:'A vicious stab at a foe already fighting another goblin: +10 to hit, +40% damage.',fat:0,tgt:'enemy',wpn:1,mult:1.4,hit:10,req:'flank',fx:'stab'},
 gpoison:{n:'Poison arrow',d:'A light arrow that poisons for 3 turns (6 hitpoints a turn, through armor).',fat:0,tgt:'enemy',wpn:1,needs:'bow',mult:.7,status:{poison:3},cd:2,fx:'poison'},
 ghex:{n:'Hex',d:'Curses a foe within 5 tiles: −15 skill and resolve for 2 turns.',ap:4,fat:0,cost:['mana',6],rng:5,tgt:'enemy',magic:[12,20],ign:.5,status:{hex:2},fx:'hex'},
 gchant:{n:'War chant',d:'Goblins within 5 tiles gain +20 skill and +50% damage for 4 turns. The chant dies with the shaman.',ap:4,fat:0,cost:['mana',6],rng:5,tgt:'self',cd:2,fx:'chant',
  ai(u,X){const n=foeAllies(u,5).filter(o=>o!==u&&!(o.st.chant>1)&&X.near(o)<=6).length;return n>=2?[{k:X.at,v:9*n}]:[]},
  async run(u){for(const o of foeAllies(u,5))if(o!==u){foeStatus(o,'chant',4);float(o,'Chant','#9bd96f');FX.emit('buff',{t:o})}}},
 /* ---------- restless dead: fearless, slow; kill the necromancer or be outlasted ---------- */
 zgrab:{n:'Grab',d:'Seizes a foe: light damage, and the victim cannot move on its next turn (−10 melee defense while held).',fat:0,tgt:'enemy',wpn:1,mult:.6,hit:10,status:{root:1,grab:2},cd:1,fx:'grab'},
 nbolt:{n:'Grave bolt',d:'A bolt of grave-cold at a foe within 5 tiles.',ap:4,fat:0,cost:['mana',5],rng:5,tgt:'enemy',magic:[22,34],ign:.5,fx:'bolt'},
 nraise:{n:'Raise the fallen',d:'A corpse within 6 tiles rises as a shambler. Any corpse will do. What he raised falls apart when the last necromancer dies.',ap:5,fat:0,cost:['mana',9],rng:6,tgt:'tile',fx:'raise',
  ai(u,X){const out=[];for(const c of B.corpses||[]){if(Math.abs(c.c-u.c)+Math.abs(c.r-u.r)>6||!foeFree(c.c,c.r))continue;out.push({k:key(c.c,c.r),v:34-(c.risen?8:0)+(X.nearTile(c.c,c.r)<=2?6:0)})}return out},
  async run(u,k){const c=k%BW,r=(k/BW)|0,i=(B.corpses||[]).findIndex(x=>x.c===c&&x.r===r);if(i<0||!foeFree(c,r))return;const co=B.corpses[i];B.corpses.splice(i,1);
   const e=foeSpawn('zomb',u.f,c,r,{def:Object.assign({},EN.zomb,{xp:0}),risen:1});e.hp=Math.round(e.hpMax*(co.risen?.5:.7));e.ap=0;say(`${co.n} rises again.`);float(e,'Risen','#c9a8ff');await sleep(260)}},
 /* ---------- beasts: the pack surrounds, the spinner holds, the owlbear breaks the line ---------- */
 sweb:{n:'Spit web',d:'Webs a foe within 4 tiles: it cannot move for 2 turns and is easier to hit.',ap:4,fat:0,rng:4,tgt:'enemy',noDmg:1,hit:25,status:{webbed:2},cd:2,fx:'web'},
 sbite:{n:'Venom bite',d:'Bites prey that cannot move: +60% damage and poison.',fat:0,tgt:'enemy',wpn:1,mult:1.6,hit:10,req:'held',status:{poison:2},fx:'bite'},
 bcharge:{n:'Trample',d:'Charges a foe up to 4 tiles away, strikes at +20% damage and hurls it back.',ap:5,fat:0,rng:4,tgt:'enemy',wpn:1,mult:1.2,dash:1,kb:1,cd:2,fx:'charge',
  async run(u,k,a){await foeCharge(u,k,a,0)}},
 bswipe:{n:'Swipe',d:'Rakes every adjacent foe.',ap:5,fat:0,tgt:'aoe',wpn:1,mult:.8,fx:'sweep'},
 /* ---------- orcs: heavy and brutal, but they tire ---------- */
 ocharge:{n:'Charge',d:'Runs down a foe up to 4 tiles away. After a run-up of 2 tiles or more the impact stuns. Tiring.',ap:5,fat:24,rng:4,tgt:'enemy',wpn:1,mult:1.1,hit:-5,dash:1,cd:2,fx:'charge',
  async run(u,k,a){await foeCharge(u,k,a,1)}},
 osmash:{n:'Shield smash',d:'A blow at 70% damage that also wrecks the shield it lands on (twice the weapon damage to the shield). Tiring.',fat:20,tgt:'enemy',wpn:1,mult:.7,hit:10,req:'shield',cd:1,fx:'smash',
  async run(u,k,a){const t=unitAt(k%BW,(k/BW)|0);if(!t)return;const hit=await strike(u,t,a);if(hit&&t.alive&&t.shield)damageShield(t,ri(u.wpn.d[0],u.wpn.d[1])*2,u)}},
 owarcry:{n:'War cry',d:'Orcs within 4 tiles take heart (+10 melee skill, +20 resolve for 2 turns), shake off fear and gain 3 action points.',ap:4,fat:28,rng:4,tgt:'self',cd:3,fx:'warcry',
  ai(u,X){const n=foeAllies(u,4).filter(o=>o!==u&&!o.st.warcry&&X.near(o)<=5).length;return n>=2?[{k:X.at,v:9*n}]:[]},
  async run(u){for(const o of foeAllies(u,4)){if(o!==u){o.bonusAP=(o.bonusAP||0)+3;float(o,'+3 AP','#ffd27a')}o.st.warcry=2;foeMor(o,1);FX.emit('buff',{t:o})}}},
 /* ---------- brigands: a mercenary company of their own ---------- */
 brally:{n:'Rally',d:'Brigands within 4 tiles find their nerve: the fleeing turn back, the shaken steady, and all gain +10 resolve for 2 turns.',ap:4,fat:0,rng:4,tgt:'self',cd:2,fx:'rally',
  ai(u,X){const A=foeAllies(u,4).filter(o=>o!==u),n=A.filter(o=>o.mor<3).length,f=A.filter(o=>o.mor===0).length;return n?[{k:X.at,v:12*n+14*f}]:[]},
  async run(u){for(const o of foeAllies(u,4)){if(o===u)continue;if(o.mor<3){setMorale(o,o.mor===0?2:3)}addBuff(o,{key:'rallied',brv:10},2);FX.emit('buff',{t:o})}}},
 /* ---------- riftspawn: nothing stands where you left it ---------- */
 iblink:{n:'Rift step',d:'Blinks up to 5 tiles, over anything.',ap:3,fat:0,rng:5,tgt:'move',leap:1,cd:2,fx:'blink',
  ai(u,X){if(X.adj.length)return[];let best=null,bv=0;for(const t of X.foes){if(!t.back&&t.hp>t.hpMax*.5)continue;for(const [x,y] of DIRS){const c=t.c+x,r=t.r+y;if(!foeFree(c,r)||Math.abs(c-u.c)+Math.abs(r-u.r)>5)continue;
    if(B.tiles[key(c,r)].t==='haz')continue;const v=16+(t.back?6:0)+(1-t.hp/t.hpMax)*8-X.thr[key(c,r)]*.15;if(v>bv){bv=v;best=key(c,r)}}}return best!=null?[{k:best,v:bv}]:[]}},
 vreap:{n:'Reaping sweep',d:'A scything arc through every adjacent foe.',ap:5,fat:0,tgt:'aoe',wpn:1,mult:.9,fx:'sweep'},
 vlance:{n:'Void lance',d:'A lance of void-fire at a foe within 6 tiles that bursts over everyone standing next to it (70% damage). Burns.',ap:5,fat:0,cost:['mana',8],rng:6,tgt:'enemy',magic:[26,38],ign:.5,aoe:1,status:{burn:2},fx:'lance'},
 vblink:{n:'Phase step',d:'Slips up to 4 tiles away when something gets close.',ap:2,fat:0,cost:['mana',6],rng:4,tgt:'move',leap:1,cd:2,fx:'blink',
  ai(u,X){if(X.near(u)>2)return[];let best=null,bv=0;const d0=X.near(u);for(let r=u.r-4;r<=u.r+4;r++)for(let c=u.c-4;c<=u.c+4;c++){const m=Math.abs(c-u.c)+Math.abs(r-u.r);if(!m||m>4||!foeFree(c,r)||B.tiles[key(c,r)].t==='haz')continue;
    const d=X.nearTile(c,r);if(d<=d0||d>6)continue;const v=10+(d-d0)*4-X.thr[key(c,r)]*.3+B.tiles[key(c,r)].h;if(v>bv){bv=v;best=key(c,r)}}return best!=null?[{k:best,v:bv}]:[]}},
 vward:{n:'Void ward',d:'Wraps an ally within 4 tiles in void-glass: it takes 40% less damage for 2 turns.',ap:3,fat:0,cost:['mana',9],rng:4,tgt:'ally',noSelf:1,cd:1,fx:'ward',
  ai(u,X){let best=null,bv=0;for(const o of foeAllies(u,4)){if(o===u||o.st.ward||!X.foes.some(f=>foeAdj(f,o)))continue;const v=10+(o.def&&o.def.boss?14:0)+(1-o.hp/o.hpMax)*12+(o.role==='line'?4:0);if(v>bv){bv=v;best=o}}return best?[{k:key(best.c,best.r),v:bv}]:[]},
  async run(u,k){const t=unitAt(k%BW,(k/BW)|0);if(!t)return;foeStatus(t,'ward',2);float(t,'Warded','#c9a8ff');FX.emit('buff',{t})}},
 tsummon:{n:'Tear the veil',d:'Rips the rift wider: two imps crawl out beside the tyrant.',ap:4,fat:0,tgt:'self',cd:4,uses:3,fx:'summon',
  ai(u,X){let n=0;for(const [x,y] of DIRS)if(foeFree(u.c+x,u.r+y))n++;const imps=B.units.filter(o=>o.alive&&o.side===u.side&&o.eid==='imp').length;return n&&imps<4?[{k:X.at,v:34}]:[]},
  async run(u){let n=0;for(const [x,y] of DIRS){const c=u.c+x,r=u.r+y;if(n>=2||!foeFree(c,r))continue;const e=foeSpawn('imp',u.f,c,r,{def:Object.assign({},EN.imp,{xp:0})});e.ap=0;float(e,'Summoned','#c9a8ff');n++;await sleep(180)}}},
 tnova:{n:'Gather the void',d:'The tyrant draws the void in. On its next turn a nova tears through everything within 2 tiles. Get clear, or stun it.',ap:6,fat:0,tgt:'self',cd:2,hpBelow:.85,tele:1,fx:'charge-up',
  ai(u,X){const n=X.foes.filter(f=>mdist(f,u)<=2).length;return n>=2?[{k:X.at,v:30*n}]:[]},
  async run(u){u.nova=1;u.st.nova=1;u.ap=0;const ks=[];for(let r=u.r-2;r<=u.r+2;r++)for(let c=u.c-2;c<=u.c+2;c++)if(inb(c,r)&&Math.abs(c-u.c)+Math.abs(r-u.r)<=2)ks.push(key(c,r));
   foeTele(u,'Void nova',ks);float(u,'Gathering…','#c9a8ff');say(`${u.name} gathers the void. Get clear!`);FX.emit('status',{t:u,key:'nova'})}},
 tnovab:{n:'Void nova',d:'The gathered void bursts: heavy damage to every foe within 2 tiles.',ap:0,fat:0,tgt:'self',magic:[48,66],ign:.6,fx:'nova',
  async run(u,k,a){u.nova=0;delete u.st.nova;foeTele(u);const b=B;for(const t of foeFoes(u).filter(t=>mdist(t,u)<=2)){if(B!==b||!u.alive)break;await strike(u,t,a,{auto:1})}}}
};
// Shared by Charge and Trample: run to the free tile beside the target, strike; a long run-up stuns (orcs) .
async function foeCharge(u,k,a,stun){const b=B,t=unitAt(k%BW,(k/BW)|0);if(!t)return;let run=0;
 if(mdist(u,t)>1){const s=dashSpot(u,t);if(!s)return;run=Math.abs(s[0]-u.c)+Math.abs(s[1]-u.r);
  // a spear wall beside the landing tile meets the charge: a hit stops it dead
  for(const w of b.units.filter(w=>w.alive&&w.side!==u.side&&buffSum(w,'sw')&&mdist(w,u)>1&&Math.abs(w.c-s[0])+Math.abs(w.r-s[1])===1)){if(!canFree(w))continue;
   const hit=await freeAttack(w,u,'spearwall');if(B!==b||!u.alive)return;if(hit){float(u,'Halted','#ffd27a');return}dropBuff(w,'spearwall')}
  u.c=s[0];u.r=s[1];FX.emit('move',{u});await sleep(200);if(B!==b||!u.alive)return;if(T(u).t==='haz')hurt(u,12,1);if(!u.alive)return}
 if(mdist(u,t)!==1)return;const st=stun&&run>=2&&!buffSum(t,'indom');
 await strike(u,t,st?Object.assign({},a,{status:{stun:1}}):a)}
for(const k in FOE_AB)AB[k]=Object.assign({foe:1},FOE_AB[k]);
// What the charge-up and the release of a telegraphed attack are called, for the scene: B.tele = [{u, n, keys}].
