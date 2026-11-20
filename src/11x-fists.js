/* ================= FISTS: the fist weapons and the fist trees' abilities (the fists update) =================
   Loads right after 10-data.js and the other arms files, so the markets, loot, famed bases and crafting lists see these items like any other.
   The trees: MAST.wrestle (Wrestler), MAST.pugilist (Pugilist), MAST.willow (Willow style) in 10-data.js; their rules: 64x-fists.js; their
   capstones: 25-legend.js; icons: 06pz-fists.js; the weapons on the figures: 73x-fists.js.
   Fist weapons (wt 'fist': they count as fists for every fist rule, isFistW; one-handed, light, a dagger's AP), each with a trade of its own:
     wraps     Hand wraps          tier 1  light and quick: the most accurate, little bite
     knuckles  Knuckle-dusters     tier 2  iron over the knuckles: a stunning punch
     baghnakh  Tiger claws         tier 2  the bagh nakh's curved blades: a punch that bleeds
     shuko     Hand hooks          tier 3  the shuko's iron claws catch hold: every hit squeezes breath (gwind), and they Grapple
     gauntlet  Mailed gauntlets    tier 3  plate over the fist: heavy, slow, crushes armor
     katar     Katar               tier 4  the punch-dagger: straight through mail
   Item fields beyond a weapon's own: gwind (breath a melee hit squeezes out of the foe, 64x-fists.js fsWind), bleed, stun, crush (the core's).
   Ability fields: fist 1 (a fist skill: needs fists in hand), punch 1 (a punch: Snap jab, Loose shoulders count it), gwind (breath a hit
   squeezes out), suplex 1 (stuns a foe past half its breath, dazes any other: fsStCases), hits / kb / dash / melee (the core's). */
const FISTITEMS=['wraps','knuckles','baghnakh','shuko','gauntlet','katar'];
Object.assign(ITEMS,{
 wraps:{k:'w',n:'Hand wraps',wt:'fist',d:[12,20],ap:3,fat:3,rng:1,ign:.15,hit:10,price:45,tier:1},
 knuckles:{k:'w',n:'Knuckle-dusters',wt:'fist',d:[22,32],ap:3,fat:4,rng:1,ign:.3,stun:.1,price:240,tier:2},
 baghnakh:{k:'w',n:'Tiger claws',wt:'fist',d:[18,30],ap:3,fat:4,rng:1,ign:.2,hit:5,bleed:2,crush:-.2,price:300,tier:2},
 shuko:{k:'w',n:'Hand hooks',wt:'fist',d:[24,34],ap:3,fat:5,rng:1,ign:.25,hit:5,gwind:6,price:680,tier:3},
 gauntlet:{k:'w',n:'Mailed gauntlets',wt:'fist',d:[30,44],ap:4,fat:7,rng:1,ign:.35,crush:.4,stun:.1,price:760,tier:3},
 katar:{k:'w',n:'Katar',wt:'fist',d:[30,44],ap:3,fat:5,rng:1,ign:.55,hit:5,crush:-.2,price:1350,tier:4}
});
for(const id of FISTITEMS){const i=ITEMS[id];i.look=i.look||id;i.sk=id==='shuko'?['shove','grapple']:['shove']}
/* ---- abilities ---- */
Object.assign(AB,{
 hipthrow:{n:'Hip throw',ap:4,fat:14,rng:1,tgt:'enemy',wpn:1,needs:'fist',fist:1,melee:1,mult:.6,hit:5,kb:2,gwind:12,fx:'shove',
  d:'Over the hip and down: 60% damage, +5 to hit, and the foe is thrown back 2 tiles and loses 12 breath. Fists only.'},
 suplex:{n:'Suplex',ap:6,fat:20,rng:1,tgt:'enemy',wpn:1,needs:'fist',fist:1,melee:1,mult:1,gwind:10,suplex:1,fx:'bonk',
  d:'Lift the foe and drive it into the ground: 100% damage and 10 breath. A foe already past half its breath is stunned (not one stunned this round or the last); any other is dazed. Fists only.'},
 onetwo:{n:'One-two',ap:4,fat:10,rng:1,tgt:'enemy',wpn:1,needs:'fist',fist:1,punch:1,melee:1,mult:.7,hits:2,hit:5,fx:'multi',
  d:'A jab and a cross: two punches at 70% damage, +5 to hit each; the second only while the foe stands. Fists only.'},
 pflurry:{n:'Flurry of blows',ap:6,fat:16,rng:1,tgt:'enemy',wpn:1,needs:'fist',fist:1,punch:1,melee:1,mult:.45,hits:4,hit:-5,fx:'multi',
  d:'Four punches at one foe, 45% damage and −5 to hit each, while it stands. Fists only.'},
 flykick:{n:'Flying kick',ap:4,fat:14,rng:3,tgt:'enemy',wpn:1,needs:'fist',fist:1,melee:1,dash:1,mult:1,hit:10,fx:'bonk',
  d:'Leap at a foe up to 3 tiles away, past every foe on the way (no free attacks), and kick: 100% damage, +10 to hit. Fists only.'}});
/* ---- who carries them (BG[bg].pool at most 9 trees; core: the tree every recruit of it carries, rollTrees) ----
   monk       Willow style (core), the Pugilist, the Wrestler          pit fighter  the Wrestler (core), the Pugilist
   tumbler    Willow style (for the Brawler)                           cutthroat    the Pugilist (for the Scout)
   cutpurse   Willow style (for the Scout)                             beggar       the Pugilist
   gladiator  the Wrestler, the Pugilist (for the Berserker and the Shieldbearer)
   flagellant, acolyte  the Wrestler          hedge mage, apothecary  Willow style
   The trees a background gave up: FIST_OUT (the PKV 3 refit trades them for its fist tree, 20-state.js). Gear: hand wraps, knuckle-dusters
   and the cestus now and then in the hands of the boxers and wrestlers; fist weapons in the brigands' loot. */
const FIST_OUT={monk:['scout','bulwark'],pitfighter:['skirmisher','dualwield'],acrobat:['brawler'],cutthroat:['scout'],thief:['scout'],gladiator:['berserker','shieldbearer']};
{const pool=(bg,L,core)=>{const b=BG[bg];if(!b)return;b.pool=L;if(core)b.core=core};
 pool('monk',['willow','pugilist','wrestle','skirmisher','brawler','survivor','medic','duelist'],'willow');
 pool('pitfighter',['wrestle','pugilist','brawler','berserker','duelist','survivor','brute','vanguard','gladiator'],'wrestle');
 const tree=(bg,k,out)=>{const b=BG[bg];if(!b||b.pool.includes(k))return;const i=out?b.pool.indexOf(out):-1;if(i>=0)b.pool[i]=k;else b.pool.push(k)};
 tree('acrobat','willow','brawler');tree('cutthroat','pugilist','scout');tree('thief','willow','scout');tree('beggar','pugilist');
 tree('gladiator','wrestle','shieldbearer');tree('gladiator','pugilist','berserker');tree('flagellant','wrestle');tree('acolyte','wrestle');tree('hedge','willow');tree('apothecary','willow');
 const gear=(bg,i,extra)=>{const b=BG[bg];if(b&&b.gear&&b.gear[i])b.gear[i]+='|'+extra};
 gear('monk',0,'wraps|wraps|-');gear('pitfighter',0,'wraps|knuckles');gear('beggar',0,'wraps');gear('flagellant',0,'wraps');gear('acrobat',0,'wraps');
 for(const f of ['bandit'])if(FACT[f])for(const id of ['wraps','knuckles'])if(!FACT[f].loot.includes(id))FACT[f].loot.push(id)}
