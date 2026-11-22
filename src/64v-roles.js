/* ================= ROLES: the rules of the roles update (the trees: MAST in 10-data.js; the passive hooks: 60p-passives.js) =================
   Every tree has one battlefield role (MAST[k].role, shown on the talent screen) and its perks build toward it. The new mechanics live here
   as small predicates and hooks that 60p-passives.js and 60-battle-core.js call, so a blow's numbers stay inside hitChance / dmgBonus /
   drOf / armorSoak / ignOf / crushOf / headChance and the forecast cannot drift from the strike:
     rlCharge(u)    Charge (Vanguard): u moved this turn and has not attacked yet this turn (u.atkT), on its own turn
     rlShaken(t)    Rout them (Vanguard): t is wavering, breaking or fleeing (morale 2 or lower)
     rlIso(t)       Isolate (Duelist): none of t's own allies stands next to it
     rlMix(u,k)     Hand to hand (Throwing arms): u's last attack this turn was a throw (k 't': this blow is melee) or a melee blow (k 'm': a throw)
     rlTwo(u,a)     a two-handed melee weapon blow (Armor-breaker: twoIgn / twoCrush)
     shelterOf(t)   Shelter (Shieldbearer): the best shelter of an ally next to t whose shield is raised (inside pvDr)
     rlHead(u,t,a)  Deliberate aim (Sharpshooter): head chance of a weapon shot while u has not moved this turn (inside headChance)
     rlMitK(t)      Rooted (Bulwark): the mitigation-curve bonus while t did not move on its last turn (inside armorMit)
   Terms read in place (60p-passives.js pvHit / pvDmg): holdDef / mvDef / duelDef (defense from not moving, from moving, in a duel stance),
   mvShot (Snap shot), holdHit / holdDmg (Deliberate aim), primeHit / primeDmg (Primed: u.primed, set by a firearm reload), bowDmg (Suppressing fire),
   armDmg (Iron retort: against a foe in u.hitBy, per 10 body armor left), shakenHit / shakenDmg, isoHit / isoDmg, chargeHit / chargeDmg,
   mixHit / mixDmg; statuses (pvStCases): suppress (Suppressed), spotMark (Spotter: marked 1), twoDaze (Brutal blows), arrowBurn (Kindled arrows).
   Hooks with no part in a blow's numbers:
     rlStruck(u,t,a,o)  after every strike: the turn's attack marks (u.atkT, u.mixK), a firearm's Primed spent
     rlTurn(u)          start of u's turn (from pvTurn): Shrug it off, Quick orders
     rlShock(u,t,a,o,hpd)  Shock (Vanguard): a melee hit that reached hitpoints tests the foe's morale (strike(), beside a.scare)
     rlSweep(u,t,a,o)   Sweeping blows (Brute): a two-handed melee hit that did not kill carries into the weakest other foe next to u
     rlIntercept(u,t,a) Intercept (Shieldbearer): who takes a single-target weapon attack aimed at t (useAbility(), before the strike)
     rlPrime(u)         a firearm reloaded: Primed
   killFear (Terror) is read by killUnit(), healLow (Mercy) by healRoll(), zocHit (Steady point, spear) by pvFreeAb().
   Unit state: atkT (attacked this turn), mixK ('t' / 'm': the kind of its last attack this turn), primed, icpT (Intercept spent since its turn).
   Randomness: Shock's morale roll (moraleCheck) and nothing else; Intercept and Sweeping blows are certain. */
const RL={orderR:3};
const rlCharge=u=>!!(u.mvd&&!u.atkT&&B&&B.cur===u);
const rlShaken=t=>!!(t&&t.mor!=null&&t.mor<=2&&!t.fearless);
const rlIso=t=>!!(B&&t&&!hasAdj(t,t.side));
const rlMix=(u,k)=>!!(B&&B.cur===u&&u.mixK===k&&isThrowW(u.wpn));
const rlTwo=(u,a)=>!!(u.wpn&&u.wpn.two&&!a.magic&&!isRangedW(u.wpn)&&!isRangedAtk(u,a));
function shelterOf(t){let v=0;if(!B)return 0;for(const o of B.units)if(o.alive&&o!==t&&o.side===t.side&&o.shield&&o.flags&&o.flags.shelter>v&&mdist(o,t)===1)v=o.flags.shelter;return v}
function rlHead(u,t,a){const f=u.flags;return f&&f.holdHead&&a.wpn&&!u.mvd&&pvRng(u,a)?f.holdHead:0}
const rlMitK=t=>t&&t.flags&&t.flags.holdMit&&!t.mvd?t.flags.holdMit:0;
function rlStruck(u,t,a,o){if(!B||B.cur!==u||o.stray||o.sweep)return;const f=u.flags||{};u.atkT=1;
 if(f.mixHit||f.mixDmg){if(isThrowW(u.wpn))u.mixK=pvRng(u,a)?'t':(!a.magic?'m':u.mixK)}
 if(u.primed&&isGunW(u.wpn)&&pvRng(u,a))u.primed=0}
function rlPrime(u){if(u&&u.flags&&(u.flags.primeHit||u.flags.primeDmg)&&isGunW(u.wpn))u.primed=1}
function rlTurn(u){const b=B,f=u.flags||{};
 if(f.shrug)for(const k of ['bleed','poison','burn'])if(u.st[k]>0){u.st[k]=Math.max(0,u.st[k]-f.shrug);if(!u.st[k])delete u.st[k]}
 if(f.ordersAP&&b){const n=b.units.filter(x=>x.alive&&x!==u&&x.side===u.side&&!x.gone&&mdist(x,u)<=RL.orderR&&notActed(x)).sort((x,y)=>mdist(x,u)-mdist(y,u)||x.id-y.id)[0];
  if(n){n.bonusAP=(n.bonusAP||0)+f.ordersAP;float(n,'+'+f.ordersAP+' AP','#ffd27a');FX.emit('buff',{t:n})}}}
function rlShock(u,t,a,o,hpd){const f=u.flags;if(!f||!f.shock||!(hpd>0)||!t.alive||t.fearless||a.magic||o.stray||!(a.melee||mdist(u,t)<=1))return;moraleCheck(t,f.shock,-1)}
const rlShockOK=(u,t,a)=>!!(u.flags&&u.flags.shock&&!a.magic&&!t.fearless&&!moraleImmune(t)&&(a.melee||mdist(u,t)<=1));
async function rlSweep(u,t,a,o){const f=u.flags;if(!f||!f.sweep||!t.alive||!u.alive||o.sweep||o.free||o.splash||o.stray||a.magic||a.tgt!=='enemy'||a.aoe||!rlTwo(u,a)||mdist(u,t)>1)return;
 const n=B.units.filter(x=>x.alive&&x!==t&&x.side!==u.side&&mdist(x,u)===1).sort((x,y)=>x.hp-y.hp||x.id-y.id)[0];if(!n)return;
 say(`${u.name}'s swing carries into ${n.name}.`);await strike(u,n,FREEAB,{splash:f.sweep,auto:1,sweep:1,free:'sweep'})}
/* rlIntercept(u,t,a): the unit that takes u's attack a aimed at t: a Shieldbearer with Intercept next to t, of t's side, shield raised, not
   spent since its own turn. Against a melee blow it steps in: it and t trade places (both of size 1), so it stands where the blow falls;
   against a shot it must be in range and in the line of fire. The nearest to u first (ties: the lower id). Spends it. Only single-target
   weapon attacks (no spells, sweeps, area or chained abilities, no shoves, nothing that cannot miss). Returns t when nobody steps in. */
function rlInterceptOf(u,t,a){if(!B||!t||!u||a.magic||a.noDmg||a.split||a.dash||a.aoe||a.chain||a.through||a.tgt!=='enemy'||a.sure)return null;let best=null;
 const melee=!!a.melee||mdist(u,t)<=1,rng=a.rng||1;
 for(const g of B.units){if(!g.alive||g===t||g===u||g.side!==t.side||!g.shield||g.icpT||!(g.flags&&g.flags.intercept)||mdist(g,t)!==1||g.mor===0||(g.st&&g.st.stun>0))continue;
  if(melee?(usz(g)>1||usz(t)>1||g.rooted||t.rooted):(mdist(u,g)>rng||mdist(u,g)<=1||losInfo(u,g,a).blocked))continue;
  if(!best||mdist(g,u)<mdist(best,u)||(mdist(g,u)===mdist(best,u)&&g.id<best.id))best=g}
 return best}
function rlIntercept(u,t,a){const g=rlInterceptOf(u,t,a);if(!g)return t;g.icpT=1;
 if(!!a.melee||mdist(u,t)<=1){const c=g.c,r=g.r;g.c=t.c;g.r=t.r;t.c=c;t.r=r;FX.emit('move',{u:g});FX.emit('move',{u:t})}
 float(g,'Intercept','#ffd27a');say(`${g.name} steps in front of ${t.name}.`);FX.emit('buff',{t:g});return g}
/* ---- the status: Suppressed (Suppressing fire): −10 melee and ranged skill until its next turn; ticks like the foes' own (FOE_ST t:1) ---- */
const RL_ST={suppr:{n:'Suppressed',d:'Pinned down by arrows: −10 melee and ranged skill until its next turn.',icon:'st-suppr',good:0,t:1}};
if(typeof FOE_ST==='object'){Object.assign(FOE_ST,RL_ST);if(typeof FOE_MOD==='object')FOE_MOD.suppr={ms:-10,rs:-10}}
for(const k in RL_ST)if(!STATUS[k])STATUS[k]=RL_ST[k];
if(typeof addStatus==='function'&&!addStatus.rl){const a0=addStatus;addStatus=function(t,key,n){const had=t&&t.st?t.st[key]||0:0,r=a0(t,key,n);if(RL_ST[key]&&t&&t.st&&(t.st[key]||0)!==had&&typeof foeAuras==='function')foeAuras();return r};addStatus.rl=1}
