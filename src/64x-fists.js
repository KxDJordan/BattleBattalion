/* ================= THE FIST TREES: rules of the three martial arts (the trees: MAST.wrestle / pugilist / willow in 10-data.js; the
   abilities and the fist weapons: 11x-fists.js; the capstones: 25-legend.js) =================
   Three ways to fight with bare hands or a fist weapon in hand (isFistW), each its own role, no perk repeating another tree's (test/fists.js):
     Wrestler      (wrestle)   the grappler: Bear hug, Hip throw, Grind, Suplex, Smother, Breaking hold: breath, throws and stuns
     Pugilist      (pugilist)  the striker: Snap jab, One-two, Loose shoulders, Double jab, Flurry of blows, Rapid hands: many cheap punches
     Willow style  (willow)    the evader, in light armor or none: Empty hands, Flying kick, Hard to pin, Slip away, Turn the blow, Wind step
   Breath. Squeezing the breath out of a foe is fatigue: a unit that tires (a merc of either side, an orc, an ogre: fatMax under 999) takes it
   as fatigue (t.fat, at most its maximum: tired, winded, too tired to act); a unit that never tires keeps a breath debt of its own instead
   (t.gwind, out of WINDMAX = 100, recovering 15 at the start of each of its turns) that counts in tiredPen like fatigue (60-battle-core.js).
   fsBreath(t) is the share of its breath a foe has lost (0..1), whichever it keeps.
   Every term of a blow's numbers is read inside hitChance / dmgBonus / drOf / pvStCases (60p-passives.js, 60-battle-core.js), so forecast()
   and strike() cannot drift:
     fsHit(u,t,a,melee)    to hit: Empty hands, Hard to pin (the defender's)
     fsDmg(u,t,a,melee)    damage share: Grind
     fsDr(u,t,a)           damage the defender's perks take off: Turn the blow
     fsStCases(u,t,a,melee,L)  statuses: Suplex (stun past half breath, else daze), Breaking hold (a chance stun past three quarters)
   Hooks: fsAbInfo (from pvAbInfo: Snap jab, Loose shoulders, Hip throw's reach with Grip of iron, Flying kick's with Willow in the storm,
   Flurry of blows' fifth punch), fsHitDone (from pvHitDone: the breath a hit squeezes out, the round a foe was stunned), fsKill (from pvKill:
   Rapid hands), fsTurn (from pvTurn: Smother, Wind step, Loose shoulders' recovery, breath recovers), fsSlip (walkPath0 and the AI's free
   attack estimate: Slip away), fsFollow (useAbility, after the Attack: Double jab), fsAiExtra / fsAiVal (63-ai.js: what Double jab, the
   breath and the conditional stuns are worth). perkFit / mercTags are wrapped (autoLearn builds into the tree of the fists in hand).
   Unit state: gwind (breath debt of a foe that never tires), wrStR (the round t was last stunned), pgKT (Rapid hands spent this turn), flI (the punches of a Flurry of blows thrown so far).
   Randomness: only Breaking hold's chance, drawn in pvStatus's fixed order (after every older case). */
const FSTREES=['wrestle','pugilist','willow'];
const FSK={apMin:3,windRec:15,grindMax:.2,stepMax:10,bare:2,breakAt:.75,suplexAt:.5,smother:1};
const fsFist=u=>!!u&&isFistW(u.wpn);
const fsLight=u=>!!u&&fsFist(u)&&(u.acl||armorClass(u))==='light';
function fsBreath(t){if(!t)return 0;if(t.fatMax>0&&t.fatMax<999)return clamp((t.fat||0)/t.fatMax,0,1);return clamp((t.gwind||0)/WINDMAX,0,1)}
// squeezes n breath out of t (fatigue, or the breath debt of a foe that never tires)
function fsWind(t,n,u){if(!t||!t.alive||!(n>0))return 0;let d=0;if(t.fatMax>0&&t.fatMax<999){const f0=t.fat||0;t.fat=Math.min(t.fatMax,f0+n);d=t.fat-f0}
 else{const w0=t.gwind||0;t.gwind=Math.min(WINDMAX,w0+n);d=t.gwind-w0}if(d>0)float(t,'−'+d+' breath','#8fd8ff');return d}
// the breath a hit of u with a squeezes out of t (the ability's, the weapon's and Bear hug: melee hits with fists)
function fsWindOf(u,t,a,o){if(!u||!t||u.side===t.side||a.magic||a.noDmg)return 0;const f=u.flags||{},melee=!!a.melee||mdist(u,t)<=1;let n=a.gwind||0;
 if(melee&&fsFist(u)){n+=(u.wpn.gwind||0)+(f.wrFat||0)}if(o&&o.splash)n=Math.round(n*o.splash);return n}
const fsStunOK=t=>!(B&&t.wrStR!=null&&t.wrStR>=B.round-1);
/* ---- the numbers of one blow ---- */
function fsHit(u,t,a,melee){const g=t.flags||{};let v=0;if(a.magic)return 0;if(a.ramp&&u.flI>0)v+=a.ramp*u.flI;   // Flurry of blows: each punch 5 more than the one before
 if((g.wlDef||g.wlStep)&&fsLight(t)){if(g.wlDef){v-=g.wlDef;if(g.wlBare&&(t.aw||0)<=FSK.bare)v-=g.wlBare}if(g.wlStep&&t.mvN>0)v-=Math.min(FSK.stepMax,g.wlStep*t.mvN)}
 return v}
function fsDmg(u,t,a,melee){const f=u.flags||{};if(!melee||a.magic||!f.wrGrind||!fsFist(u))return 0;return Math.min(FSK.grindMax,f.wrGrind*Math.floor(fsBreath(t)*10+1e-9))}
function fsDr(u,t,a){const g=t.flags||{};if(!g.wlDr||a.magic||!fsLight(t))return 0;return(!!a.melee||mdist(u,t)<=1)?g.wlDr:0}
function fsStCases(u,t,a,melee,L){const f=u.flags||{};if(a.magic||u.side===t.side)return;const br=fsBreath(t);
 if(a.suplex){if(br>FSK.suplexAt&&fsStunOK(t))L.push(['stun',1,1,1]);else L.push(['daze',1,1,1])}
 if(f.wrBreak&&melee&&fsFist(u)&&br>FSK.breakAt&&fsStunOK(t))L.push(['stun',1,1,f.wrBreak])}
/* ---- hooks ---- */
function fsAbInfo(u,a){const f=u.flags||{};if(!a||!fsFist(u))return a;const punch=a.id==='attack'||a.punch;
 if(punch){if(f.pgAP&&a.ap>FSK.apMin)a.ap=Math.max(FSK.apMin,a.ap-f.pgAP);if(f.pgFat&&a.fat)a.fat=Math.floor(a.fat*(1-f.pgFat))}
 if(a.id==='hipthrow'&&f.wrKb)a.kb=(a.kb||0)+f.wrKb;if(a.id==='flykick'&&f.wlKick)a.rng=(a.rng||0)+f.wlKick;if(a.id==='pflurry'&&f.pgFlurry)a.hits=(a.hits||1)+f.pgFlurry;
 return a}
function fsHitDone(u,t,a,o,hpd){if(!B||!t)return;if(t.st&&t.st.stun>0)t.wrStR=B.round;if(u.side===t.side||!t.alive)return;const n=fsWindOf(u,t,a,o);if(n>0)fsWind(t,n,u)}
// Flurry of blows: the punch count, set back when it is paid for (fsPay, from pvPay) and counted after every strike (fsStruck, from pvStruck)
function fsPay(u,a){if(a.ramp)u.flI=0}
function fsStruck(u,t,a,o){if(a.ramp&&!o.free)u.flI=(u.flI||0)+1}
function fsKill(u,t,a,o){const f=u.flags||{};if(f.pgKill&&a.id==='attack'&&!o.free&&!o.splash&&fsFist(u)&&B&&B.cur===u&&!u.pgKT&&u.alive){u.pgKT=1;u.ap+=a.ap;float(u,'+'+a.ap+' AP','#ffd27a');FX.emit('buff',{t:u})}}
function fsTurn(u){const b=B,f=u.flags||{};if(u.pgKT)u.pgKT=0;if(u.gwind>0)u.gwind=Math.max(0,u.gwind-FSK.windRec);if(!b)return;
 if(f.pgRec&&fsFist(u)&&u.fat>0)u.fat=Math.max(0,u.fat-f.pgRec);
 if(f.wrSmother&&fsFist(u))for(const o of b.units)if(o.alive&&o.side!==u.side&&mdist(o,u)===1)fsWind(o,f.wrSmother,u);
 if(f.wlAP&&fsLight(u)&&!b.units.some(o=>o.alive&&o.side!==u.side&&o.mor!==0&&mdist(o,u)===1)){u.ap+=f.wlAP;float(u,'Wind step +'+f.wlAP+' AP','#ffd27a')}}
const fsSlip=u=>!!(u&&u.flags&&u.flags.wlSlip&&fsLight(u));
// Double jab: after an Attack with fists, a second punch at the same foe (while it stands)
async function fsFollow(u,t,a){const f=u.flags||{};if(!f.pgDouble||a.id!=='attack'||!fsFist(u)||!t.alive||!u.alive)return;await strike(u,t,a,{splash:f.pgDouble,free:'double'})}
// the AI: what Double jab adds to an Attack, and what a blow's breath and conditional stun are worth
function fsAiExtra(u,a,t,S){const f=u.flags||{};if(!f.pgDouble||a.id!=='attack'||!fsFist(u))return 0;return aiHit(u,a,t,S).v*f.pgDouble}
function fsAiVal(u,a,t){if(!u||a.magic||a.noDmg)return 0;const n=fsWindOf(u,t,a),br=fsBreath(t),f=u.flags||{};let v=0;
 if(n>0){const k=Math.min(n/WINDMAX,1-br);v+=k*((t.aiW||10)*1.2+6)}
 if(a.suplex)v+=br>FSK.suplexAt&&fsStunOK(t)?aiStatusVal('stun',1,t):aiStatusVal('daze',1,t);
 if(f.wrBreak&&fsFist(u)&&br>FSK.breakAt&&fsStunOK(t)&&(!!a.melee||mdist(u,t)<=1))v+=f.wrBreak*aiStatusVal('stun',1,t);
 return v}
/* ---- autoLearn: the fist trees' perks with fists in hand (mercTags 'fist'), Willow style's in light armor; their abilities when they open ---- */
{const mt0=mercTags;mercTags=function(m){const t=mt0(m),w=ITEMS[m.eq&&m.eq.w];if(!w||w.wt==='fist')t.add('fist');return t}
 const pf0=perkFit;perkFit=function(m,o,tags){let s=pf0(m,o,tags);const T=o.tree,p=o.perk;if(!T||!FSTREES.includes(o.key))return s;
  const fist=tags.has('fist'),a=p.ab&&AB[p.ab];if(!fist)s-=a?45:30;else{s+=6;if(a&&s>0)s+=8}if(T===MAST.willow&&armorClass(m)!=='light')s-=30;return s}}
