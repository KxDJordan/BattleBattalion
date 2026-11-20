/* ================= THE GUN TREES: rules of the three firearm trees (the trees: MAST.gunner / pistol / powder in 10-data.js;
   the abilities: 11u-guns.js; the capstones: 25-legend.js) =================
   Three ways to fight with powder, each its own role, no perk repeating another tree's (test/guntrees.js):
     Musketry   (gunner)  the line gunner: long guns side by side, Volley fire, Rolling volley, Primed, Double charge, Armor-piercing ball, Gunline
     Pistolier  (pistol)  the gun duellist: a one-handed firearm close in, Arm's length, Quick draw, Wing the runner, Pistol-whip, Ten paces,
                          Brace of pistols
     Grenadier  (powder)  the sapper: Powder smoke, Grenade, Blasting powder, Petard, Shellshock, Wildfire, against crowds and shields
   Every term of a blow's numbers is read inside hitChance / dmgBonus / ignOf / pvStCases (60p-passives.js, 60-battle-core.js), so forecast()
   and strike() cannot drift:
     gtPbR(u)          the reach of Arm's length (2 tiles; Gunslinger 3)
     gtPace(u,t)       Ten paces: no foe but t within 3 tiles of u
     gtRolled(t)       Rolling volley: firearm hits t took this round (t.gvR the round, t.gvN the count), at most 3
     gtBlast(u,a)      a Scattershot or a bomb (Grenade, Petard): what Blasting powder, Shellshock, Wildfire and Master sapper reach
     gtBombDmg(u,t,a)  the damage share of a bomb (inside dmgBonus, in place of the weapon's bonuses): Blasting powder, weakness
   Hooks: gtAbInfo(u,a) (from pvAbInfo: Master sapper's extra Grenade, Shellshock's scare), gtUsesLeft(u,a) (canUse / useBlock: a.uses),
   gtBrace(u) (from pvBarrel: Brace of pistols keeps every second pistol shot's load), gtHitDone (from pvHitDone: Rolling volley's count,
   a Petard's shield damage), gtKill (from pvKill: Saint of gunsmoke reloads), gtVolley(u,t,a) (useAbility, after the shot: the allies' guns),
   gtVolleyAi (63-ai.js: what the allies' shots add to a Volley fire). Unit state: gvR / gvN (on the target), brN (pistol shots counted),
   used {id: n} (abilities with uses a battle). Randomness: only the strikes' own draws (and Shellshock's morale roll, a.scare). */
const GT={paceR:3,rollMax:3,volleyR:2};
const isPistolW=w=>isGunW(w)&&!w.two;
const gtPbR=u=>PV.pbR+((u.flags&&u.flags.pbR)||0);
function gtPace(u,t){if(!B)return false;for(const o of B.units)if(o.alive&&o!==t&&o.side!==u.side&&mdist(o,u)<=GT.paceR)return false;return true}
const gtRolled=t=>B&&t&&t.gvR===B.round?Math.min(GT.rollMax,t.gvN||0):0;
const gtBlast=(u,a)=>!!a&&!a.magic&&(a.id==='blast'||!!a.bomb);
function gtBombDmg(u,t,a){const f=u.flags||{};let x=0;if(f.blastDmg)x+=f.blastDmg;if(u.weakened||u.st.weak>0)x-=WEAKDMG;return x}
function gtAbInfo(u,a){const f=u.flags||{};if(!a)return a;if(f.bombN&&a.id==='grenade')a.uses=(a.uses||0)+f.bombN;if(f.blastFear&&gtBlast(u,a)&&a.tgt==='enemy')a.scare=1;return a}
const gtUsesLeft=(u,a)=>(a.uses||0)-((u.used&&u.used[a.id])||0);
// Brace of pistols: every second pistol shot keeps the load (the first of a pair is fired from the sash). True: the pistol stays loaded.
function gtBrace(u){const f=u.flags;if(!f||!f.braceP||!isPistolW(u.wpn))return false;u.brN=(u.brN||0)+1;if(u.brN%2===1){float(u,'Second pistol','#e9e0c9');return true}return false}
function gtHitDone(u,t,a,o,hpd){if(!B||u.side===t.side)return;
 if(isGunW(u.wpn)&&pvRng(u,a)){if(t.gvR!==B.round){t.gvR=B.round;t.gvN=0}t.gvN++}                      // Rolling volley counts every firearm hit
 if(a.shieldD&&t.shield&&t.alive)damageShield(t,a.shieldD,u)}                                            // a Petard on a raised shield
function gtKill(u,t,a,o){const f=u.flags||{};if(f.killLoad&&isGunW(u.wpn)&&pvRng(u,a)&&u.loaded===false&&u.alive){setLoaded(u,true);float(u,'Reloaded','#e9e0c9');FX.emit('reload',{u})}}
/* Volley fire: the allies within GT.volleyR tiles of u, of its side, not fleeing or stunned, a loaded firearm in hand, not engaged, with t in
   range and in sight (nearest first, ties the lower id). Each fires once at t for a.gvol (+ Fire by ranks) of its damage: its load is spent
   (a twin barrel: one barrel; Brace of pistols counts), never its AP. */
function gtVolleyMates(u,t){if(!B)return[];const out=[];
 for(const o of B.units){if(!o.alive||o===u||o.side!==u.side||o.mor===0||o.gone||(o.st&&o.st.stun>0)||!isGunW(o.wpn)||o.loaded===false||mdist(o,u)>GT.volleyR||rangedLocked(o))continue;
  const oa=abilityInfo(o,'attack');if(!canFire(o,oa)||mdist(o,t)>oa.rng||losInfo(o,t,oa).blocked)continue;out.push([o,oa])}
 return out.sort((x,y)=>mdist(x[0],u)-mdist(y[0],u)||x[0].id-y[0].id)}
const gtVolleyK=(u,a)=>(a.gvol||0)+((u.flags&&u.flags.volleyB)||0);
async function gtVolley(u,t,a){const b=B;if(!b||!t.alive||!u.alive)return;const k=gtVolleyK(u,a),L=gtVolleyMates(u,t);if(L.length)say(`${u.name}'s line fires a volley.`);
 for(const [o,oa] of L){if(B!==b||!t.alive)break;if(!o.alive||o.loaded===false)continue;pvPay(o,oa);if(!pvBarrel(o))setLoaded(o,false);
  await strike(o,t,oa,{splash:k,free:'volley'});o.primed=0}}
// What the allies' shots of a Volley fire on t are worth to the AI (each ally's own forecast, priced like a hit of u's)
function gtVolleyAi(u,a,t,S,X){let v=0;const k=gtVolleyK(u,a);for(const [o,oa] of gtVolleyMates(u,t)){const h=aiHit(o,Object.assign({},oa,{id:'gvolA'+o.id}),t,S),p=hitChance(o,t,oa)/100;v+=p*(h.v+h.kill*h.kv*.5)*k}return v}
