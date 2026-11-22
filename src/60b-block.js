/* ================= SHIELD BLOCKS: the block roll, surrounded, a blocked blow (60b-block.js) =================
   A raised shield no longer adds its melee / ranged defense to the hit roll. An attack is rolled in two steps:
     1. the hit roll, against the defender's own defense (dodge and parry: hitChance() leaves the shield's part out, shieldDef());
     2. if it would hit, the BLOCK roll: blockChance(u,t,a,o) percent that the raised shield takes the blow instead.
   A blocked attack does no hitpoint or armor damage and applies nothing (no status, no knockback, no stun): the shield takes it, losing
   blockShDmg() of its hitpoints (damageShield: at 0 it splits as before, and splits block nothing more). For every rule that asks
   whether an attack MISSED (a riposte, Shield bind, Unmoved, Dancer and Flow, a returning chakram, a glancing ricochet) a block is a miss.
   strike() returns false for it.

   Block chance, in whole percent (the forecast shows it beside the hit chance; forecast().block):
     100 x S / h: the shield's defense S taken as its share of the would-be hits h (the hit chance, 5..95). S is the shield's md against a
     melee blow, its rd against a shot or a reach blow two tiles away (half its rd against a spell, as a spell's hit roll halves rd): the
     item's md / rd with Shield training / Living wall (t.shb), plus Shield wall's buff (u.shw included), all taken out of the hit roll.
     So against a lone foe a blow lands h - S percent of the time, as the old rule's subtraction had it (unless it was clamped at 5): a weak
     attacker is blocked more often, a sure one less; a shield's table value still says how much it takes. The forecast shows the chance.
     x the surround factor BLK.sur[n] (surroundN: foes standing next to the bearer and able to fight, the attacker among them when it is
     next to it; a shot or a reach blow from two tiles does not count itself): 1 or none 1, 2 x.75, 3 x.5, 4+ x.25. Capped to 0..BLK.max.
     The game had no general outnumbering bonus to build on (only perks: the attacker's Flanking / Backstab-style +hit with an ally next to
     the target, the Gladiator's crowdDef / crowdDmg); those stay as they are and the surround factor only shrinks the block.
     (A tired bearer is hit more easily (tiredPen in the hit roll), which already makes its block a smaller share.)
   No block: no raised intact shield (slung, split, none), a shove or bash (noDmg), Split shield, a bomb (Grenade, Petard: a raised shield
   is no cover from them), anything that cannot miss (sure, Deadly arc, arcs and strays: o.auto), a stunned, netted or fleeing defender.
   Shield damage of a blocked blow (blockShDmg): the blow's damage before armor (dmgAfter: the roll with every bonus) x SHK[weapon family]
   (axes .5, hammers and maces .4, polearms .3, crossbows .3, firearms .5, swords .25, spears .2, daggers, fists, bows .15, spells .3)
   x BLK.two for a two-handed melee weapon, x BLK.big for a huge attacker (size 2 or def.big), x splitMult (Hew, Headsman: the axe perks that
   make shield-splitting blows hit shields harder), + Shieldbreaker's (Aura hurling) bite on a throw. At least 1.

   Randomness: one draw after a hit roll that hits, and only when the block chance is above 0; a blocked blow then draws its damage roll
   (for the shield). Nothing else, so fights without shields keep their old stream. */
const BLK={k:1,max:85,sur:[1,1,.75,.5,.25],magic:.5,two:1.25,big:1.5,ref:50};
const SHK={axe:.5,hammer:.4,mace:.4,polearm:.3,greatsword:.25,sword:.25,spear:.2,dagger:.15,fist:.15,staff:.25,bow:.15,sling:.15,throwing:.25,crossbow:.3,flintlock:.5},SHK0=.25,SHKMAG=.3;
// Foes next to t that can fight (alive, not fled, not fleeing, not stunned): how surrounded it is.
function surroundN(t){if(!B||!B.units)return 0;let n=0;for(const o of B.units)if(o.alive&&!o.gone&&o.side!==t.side&&o.mor!==0&&!(o.st&&o.st.stun>0)&&mdist(o,t)===1)n++;return n}
const surK=n=>BLK.sur[Math.min(BLK.sur.length-1,Math.max(0,n))];
// The defense a raised shield gives against k ('md' | 'rd'): the item's (t.shb, already inside t.md / t.rd) and Shield wall's buff. It is the
// shield's part of t's defense, which the hit roll leaves out and the block roll uses.
function shWallOf(t,k){let v=0;for(const b of t.buffs)if(b.key==='shieldwall')v+=b[k]||0;return v}
function shieldDef(t,k){return t&&t.shield&&t.shb?(t.shb[k]||0)+shWallOf(t,k):0}
// Can t's shield take u's attack a at all (whatever the side)?
function blockOK(u,t,a,o){return!!(u&&t&&a&&t!==u&&t.alive&&t.shield&&t.shb&&t.shp>0&&!a.noDmg&&!a.split&&!a.bomb&&!a.sure&&!a.unblock&&!(o&&(o.auto||o.stray))&&!pvSure(u,a)
  &&t.mor!==0&&!(t.st&&(t.st.stun>0||t.st.netted>0)))}
// The block chance of t's raised shield from the front against a blow (k 'md') or a shot (k 'rd') that would hit BLK.ref (50) percent
// of the time, as the inspector shows it.
function blockFront(t,k){if(!t||!t.shield||!t.shb||!(t.shp>0))return 0;return clamp(Math.round(100*shieldDef(t,k)*BLK.k/BLK.ref),0,BLK.max)}
// An item's block chances from the front against such a blow and shot, for a shield of md / rd (no perks): the shop and the stash show them.
const blockItem=(md,rd)=>[clamp(Math.round(100*(md||0)*BLK.k/BLK.ref),0,BLK.max),clamp(Math.round(100*(rd||0)*BLK.k/BLK.ref),0,BLK.max)];
// Chance in percent (0..BLK.max) that a hit of u's attack a on t is blocked by t's shield. h: the hit chance (hitChance(u,t,a), passed
// by strike() which has it already).
function blockChance(u,t,a,o,h){if(!blockOK(u,t,a,o))return 0;if(h==null)h=hitChance(u,t,a);
 const melee=!a.magic&&(!!a.melee||mdist(u,t)<=1);let p=100*shieldDef(t,melee?'md':'rd')*(a.magic?BLK.magic:1)*BLK.k/Math.max(5,h)*surK(surroundN(t));
 return clamp(Math.round(p),0,BLK.max)}
// The share of a blocked blow's damage the shield takes (before Shieldbreaker), by the attacker's weapon.
function blockShK(u,a){if(a.magic)return SHKMAG;const w=u.wpn||{};let k=SHK[w.wt]!=null?SHK[w.wt]:SHK0;if(w.two&&!isRangedW(w))k*=BLK.two;if(usz(u)>1||(u.def&&u.def.big))k*=BLK.big;return k*splitMult(u,a)}
// Shield hitpoints a blocked blow of `dmg` (dmgAfter: before armor) takes, uncapped (damageShield caps it at what is left).
function blockShDmg(u,t,a,dmg){let d=Math.max(1,Math.round(dmg*blockShK(u,a)));const f=u.flags;if(f&&f.hurlSplit&&isThrowW(u.wpn)&&pvRng(u,a))d+=Math.max(1,Math.round(u.wpn.d[1]*f.hurlSplit));return d}
/* strike() on a hit that the shield blocks (the block roll R already holds): the damage roll (for the shield), 'Blocked', the shield's loss,
   then what a miss draws (a riposte, the miss passives). FX: 'miss' {u,t,block:shield damage,roll} (the figures, the sound and the log
   read it as a blow turned on the shield). Returns false. */
async function blockHit(u,t,a,o,R,d,fly){fly(t);const wd=rollOf(u,a);let dmg=a.magic?ri(a.magic[0],a.magic[1])*spellMult(u):ri(wd[0],wd[1])*(a.mult||1);dmg=dmgAfter(u,t,a,dmg,o);
 const sd=blockShDmg(u,t,a,dmg);R.blk=Math.min(sd,t.shp);float(t,'Blocked','#9fc8ff');
 say(`${t.name} blocks ${u.name}'s ${a.magic?'spell':d>1&&isRangedAtk(u,a)?'shot':'blow'} with the shield.`);
 FX.emit('miss',{u,t,block:R.blk,roll:R});rollDone(R);damageShield(t,sd,u);if(t.flags&&(t.flags.dance||t.flags.flow))t.dnc=Math.min(3,(t.dnc||0)+1);await sleep(230);
 if(!o.free&&!a.magic&&d===1&&t.alive&&u.alive&&buffSum(t,'rip'))await freeAttack(t,u,'riposte');
 pvStruck(u,t,a,o);await pvMiss(u,t,a,o,null,R);return false}
// For the forecast and the HUD: {block, sur (foes next to the bearer that can fight), surK (the factor on the block), min, max (shield
// damage of a blocked blow, capped at what is left), hp, brk (a blocked blow can split it), sure (any blocked blow splits it)}, or null.
function blockFc(u,t,a,o,dmgMin,dmgMax){if(!blockOK(u,t,a,o))return null;const ch=blockChance(u,t,a,o),lo=blockShDmg(u,t,a,dmgMin),hi=blockShDmg(u,t,a,dmgMax);
 const n=surroundN(t);return{block:ch,sur:n,surK:surK(n),min:Math.min(lo,t.shp),max:Math.min(hi,t.shp),hp:t.shp,brk:hi>=t.shp,sure:lo>=t.shp}}
