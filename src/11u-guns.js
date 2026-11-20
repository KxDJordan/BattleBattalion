/* ================= GUNS ON THE ROAD: the brigand gunner (the gun backgrounds) =================
   Loads after 11t-arms.js. The gun backgrounds themselves (arquebusier, siege gunner, pistoleer, sapper, fowler, musketeer) are in
   10-data.js with the other backgrounds; their firearm tree (Musketry, Pistolier or Grenadier) is pinned by BG.core (rollTrees, 61-talents.js). Here: a brigand with a hand
   cannon in the brigands' bands (between the crossbowman and the raider), slow to reload, a heavy ball and a scattershot. Art: 07-portraits.js
   and 73-units.js (case 'bgun'); foe masteries 64m-foemast.js; coat 47-tailor.js; parts 13-craft.js. */
Object.assign(EN,{
 bgun:{n:'Brigand gunner',hp:48,arm:30,helm:18,ms:42,rs:46,md:4,rd:6,init:92,d:[28,46],w:'handgonne',xp:135,role:'sniper',brv:26,flee:.4,abs:['blast'],side:{n:'Falchion',wt:'sword',d:[18,30],ap:4,fat:0,rng:1,ign:.2}}});
if(FACT.bandit){const U=FACT.bandit.units,i=U.findIndex(x=>x[0]==='bxbow');if(!U.some(x=>x[0]==='bgun'))U.splice(i>=0?i+1:U.length,0,['bgun',34]);
 for(const id of ['handgonne','arquebus'])if(!FACT.bandit.loot.includes(id))FACT.bandit.loot.push(id)}
/* ---- the gun trees update: the firearm trees' abilities (the trees: MAST.gunner / pistol / powder in 10-data.js; rules: 64u-guntrees.js) ----
   Fields beyond the usual: gvol (Volley fire: the allies' guns join, gtVolley), oneH (needs a one-handed weapon in hand: a pistol), uses (times a
   battle, counted in u.used[id]; Master sapper's bombN raises a Grenade's), bomb (a powder charge, not a weapon attack: aimed with ranged skill
   from any weapon, its own damage roll dmgD and piercing ignW, only the Grenadier's bonuses: gtBombDmg), shieldD (shield damage a hit deals). */
Object.assign(AB,{
 gvolley:{n:'Volley fire',ap:5,fat:14,tgt:'enemy',wpn:1,needs:'flintlock',mult:1,gvol:.6,fx:'smoke',
  d:'Present, and fire! A shot at a foe, and every ally within 2 tiles whose firearm is loaded, with the foe in range and in sight, fires at it too for 60% damage. Their loads are spent, and each starts its next turn 2 AP short.'},
 qdraw:{n:'Quick draw',ap:2,fat:6,tgt:'enemy',wpn:1,needs:'flintlock',oneH:1,mult:.7,hit:-5,fx:'smoke',
  d:'A shot from the hip before the foe is set: 2 AP, 70% damage, −5 to hit. A pistol only, and it must be loaded.'},
 pwhip:{n:'Pistol-whip',ap:3,fat:8,rng:1,tgt:'enemy',wpn:1,needs:'flintlock',oneH:1,inHand:1,melee:1,mult:.6,status:{daze:1},fx:'bonk',
  d:'Club the foe next to you with the butt of the pistol: 60% damage, aimed with melee skill, and it is dazed. Allowed with a foe next to you; the load stays in the pan.'},
 grenade:{n:'Grenade',ap:4,fat:12,rng:4,tgt:'enemy',bomb:1,dmgD:[24,36],ignW:.3,aoe:1,uses:2,hit:10,fx:'fireball',
  d:'A lit bomb lobbed at a foe up to 4 tiles away: 24–36 damage, 30% armor piercing, and 70% of it to every foe beside it. Aimed with ranged skill (+10 to hit), whatever is in hand, and a raised shield is no cover from it; twice a battle.'},
 petard:{n:'Petard',ap:5,fat:16,rng:1,tgt:'enemy',bomb:1,sure:1,dmgD:[30,46],ignW:.3,crushB:1,kb:1,shieldD:60,uses:1,fx:'quake',
  d:'A charge of powder set against the foe next to you: 30–46 damage that cannot miss, 100% more armor torn up, knocked back 1 tile, and a raised shield takes 60 damage. Once a battle.'}});
