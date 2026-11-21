/* ================= SHIELD BLOCKS: facing, the block roll, a blocked blow (60b-block.js) =================
   A raised shield no longer adds its melee / ranged defense to the hit roll. An attack is rolled in two steps:
     1. the hit roll, against the defender's own defense (dodge and parry: hitChance() leaves the shield's part out, shieldDef());
     2. if it would hit, the BLOCK roll: blockChance(u,t,a,o) percent that the raised shield takes the blow instead.
   A blocked attack does no hitpoint or armor damage and applies nothing (no status, no knockback, no stun): the shield takes it, losing
   blockShDmg() of its hitpoints (damageShield: at 0 it splits as before, and splits block nothing more). For every rule that asks
   whether an attack MISSED (a riposte, Shield bind, Unmoved, Dancer and Flow, a returning chakram, a glancing ricochet) a block is a miss.
   strike() returns false for it.

   Block chance, in whole percent (the forecast shows it beside the hit chance; forecast().block):
     BLK.km x the shield's md against a melee blow, BLK.kr x its rd against a shot or a reach blow two tiles away (and x BLK.magic, half,
     against a spell): the item's md / rd with Shield training / Living wall (t.shb), plus Shield wall's buff (u.shw included),
     both taken out of the hit roll in exchange,
     x BLK.side from the flank, 0 from behind (blockSide: the defender's facing, below),
     - the defender's fatigue (tiredPen: a tired arm sags), capped to 0..BLK.max.
   No block: no raised intact shield (slung, split, none), a shove or bash (noDmg), Split shield, a bomb (Grenade, Petard: a raised shield
   is no cover from them), anything that cannot miss (sure, Deadly arc, arcs and strays: o.auto), a stunned, netted or fleeing defender.
   Shield damage of a blocked blow (blockShDmg): the blow's damage before armor (dmgAfter: the roll with every bonus) x SHK[weapon family]
   (axes .5, hammers and maces .4, polearms .3, crossbows .3, firearms .5, swords .25, spears .2, daggers, fists, bows .15, spells .3)
   x SHK2 for a two-handed melee weapon, x SHKBIG for a huge attacker (size 2 or def.big), x splitMult (Hew, Headsman: the axe perks that
   make shield-splitting blows hit shields harder), + Shieldbreaker's (Aura hurling) bite on a throw. At least 1.

   Facing (u.face, [dc,dr] along one board axis; faceOf(u) defaults to the side's front: the company faces -r, the foes +r). The rules keep
   it from the same events the figures turn on (faceEv, called by FX.emit whether or not a scene listens): a step or any other move faces the
   way it went (a knockback or a hook does not turn anyone), a strike or a cast at a unit or a tile faces it. Being struck does not turn a
   unit: a foe that walked round behind keeps hitting its back until it turns to fight. 74-anim.js draws every figure the way u.face says.
   blockSide(u,t): 2 front, 1 flank, 0 behind, by the angle between t's facing and the line to u (cos >= BLK.cos front, <= -BLK.cos behind).
   Randomness: one draw after a hit roll that hits, and only when the block chance is above 0; a blocked blow then draws its damage roll
   (for the shield). Nothing else, so fights without shields keep their old stream. */
const BLK={km:1.8,kr:2.1,max:80,side:.5,magic:.5,cos:.4};
const SHK={axe:.5,hammer:.4,mace:.4,polearm:.3,greatsword:.25,sword:.25,spear:.2,dagger:.15,fist:.15,staff:.25,bow:.15,sling:.15,throwing:.25,crossbow:.3,flintlock:.5},SHK0=.25,SHK2=1.25,SHKBIG=1.5,SHKMAG=.3;
const FACE0=[0,-1],FACE1=[0,1];
function faceOf(u){return u&&Array.isArray(u.face)?u.face:u&&u.side===0?FACE0:FACE1}
function faceSet(u,dc,dr){if(!u||(!dc&&!dr))return;u.face=Math.abs(dc)>=Math.abs(dr)?[dc>0?1:-1,0]:[0,dr>0?1:-1]}
function faceTo(u,t){if(!u||!t||u===t)return;const a=unitCenter(u),b=unitCenter(t);faceSet(u,b.c-a.c,b.r-a.r)}
// FX.emit calls this first: the rules' facing follows the events the figures turn on. fpos: where the unit last stood (the next 'move' is measured from it).
function faceEv(type,d){if(!d||typeof B==='undefined'||!B||!B.units)return;
 if(type==='move'){const u=d.u;if(!u)return;const p=u.fpos;if(p)faceSet(u,u.c-p[0],u.r-p[1]);u.fpos=[u.c,u.r]}
 else if(type==='kb'||type==='spawn'){const u=d.t||d.u;if(u)u.fpos=[u.c,u.r]}
 else if(type==='turn'){for(const x of B.units)if(x.alive)x.fpos=[x.c,x.r]}
 else if(type==='cast'){const u=d.u,ab=d.ab||{};if(!u)return;if(d.t&&d.t!==u)faceTo(u,d.t);else if(d.k>=0&&ab.tgt==='tile'){const a=unitCenter(u);faceSet(u,d.k%BW-a.c,((d.k/BW)|0)-a.r)}}
 else if(type==='hit'||type==='miss'){if(d.u&&d.t&&d.u!==d.t&&d.u.alive)faceTo(d.u,d.t)}}
// 2 front, 1 flank, 0 behind: where u stands as t's shield sees it
function blockSide(u,t){const f=faceOf(t),a=unitCenter(u),b=unitCenter(t),dx=a.c-b.c,dy=a.r-b.r,L=Math.hypot(dx,dy);if(!(L>0))return 2;
 const cs=(dx*f[0]+dy*f[1])/L;return cs>=BLK.cos-1e-9?2:cs<=-BLK.cos+1e-9?0:1}
const BSIDEN=['behind','flank','front'];
// The defense a raised shield gives against k ('md' | 'rd'): the item's (t.shb, already inside t.md / t.rd) and Shield wall's buff. It is the
// shield's part of t's defense, which the hit roll leaves out and the block roll uses.
function shWallOf(t,k){let v=0;for(const b of t.buffs)if(b.key==='shieldwall')v+=b[k]||0;return v}
function shieldDef(t,k){return t&&t.shield&&t.shb?(t.shb[k]||0)+shWallOf(t,k):0}
// Can t's shield take u's attack a at all (whatever the side)?
function blockOK(u,t,a,o){return!!(u&&t&&a&&t!==u&&t.alive&&t.shield&&t.shb&&t.shp>0&&!a.noDmg&&!a.split&&!a.bomb&&!a.sure&&!a.unblock&&!(o&&(o.auto||o.stray))&&!pvSure(u,a)
  &&t.mor!==0&&!(t.st&&(t.st.stun>0||t.st.netted>0)))}
// The block chance of t's raised shield from the front against a blow (k 'md') or a shot (k 'rd'), as the inspector shows it.
function blockFront(t,k){if(!t||!t.shield||!t.shb||!(t.shp>0))return 0;return clamp(Math.round(shieldDef(t,k)*(k==='md'?BLK.km:BLK.kr)-tiredPen(t)),0,BLK.max)}
// An item's block chances from the front, blow and shot, for a shield of md / rd (no perks): the shop and the stash show them.
const blockItem=(md,rd)=>[clamp(Math.round((md||0)*BLK.km),0,BLK.max),clamp(Math.round((rd||0)*BLK.kr),0,BLK.max)];
// Chance in percent (0..BLK.max) that a hit of u's attack a on t is blocked by t's shield.
function blockChance(u,t,a,o){if(!blockOK(u,t,a,o))return 0;const side=blockSide(u,t);if(!side)return 0;
 const melee=!a.magic&&(!!a.melee||mdist(u,t)<=1);let p=shieldDef(t,melee?'md':'rd')*(a.magic?BLK.magic:1)*(melee?BLK.km:BLK.kr);if(side===1)p*=BLK.side;p-=tiredPen(t);
 return clamp(Math.round(p),0,BLK.max)}
// The share of a blocked blow's damage the shield takes (before Shieldbreaker), by the attacker's weapon.
function blockShK(u,a){if(a.magic)return SHKMAG;const w=u.wpn||{};let k=SHK[w.wt]!=null?SHK[w.wt]:SHK0;if(w.two&&!isRangedW(w))k*=SHK2;if(usz(u)>1||(u.def&&u.def.big))k*=SHKBIG;return k*splitMult(u,a)}
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
// For the forecast and the HUD: {block, side ('front' | 'flank' | 'behind', null when the shield cannot take this attack), min, max (shield
// damage of a blocked blow, capped at what is left), hp, brk (a blocked blow can split it), sure (any blocked blow splits it)}, or null.
function blockFc(u,t,a,o,dmgMin,dmgMax){if(!blockOK(u,t,a,o))return null;const ch=blockChance(u,t,a,o),lo=blockShDmg(u,t,a,dmgMin),hi=blockShDmg(u,t,a,dmgMax);
 return{block:ch,side:BSIDEN[blockSide(u,t)],min:Math.min(lo,t.shp),max:Math.min(hi,t.shp),hp:t.shp,brk:hi>=t.shp,sure:lo>=t.shp}}
