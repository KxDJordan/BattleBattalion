/* ================= LEGENDARY GEAR, DEEDS AND THE FINAL MASTERY TIER (legend agent, phase 8 round B) =================
   Legendary items: ITEMS[id] (ids 'lg:<key>') with legend:1, tier:6, uniq:1 and famed:1 (so every list that keeps famed gear off market
   stalls, loot tables, famed bases and the plain-catalogue tests skips them), base (the item it is forged on: armor weight class, skills),
   look 'lg_<key>' (its own art), lore (its legend) and power {n, d, st?, flag?, mod?, leech?, thorns?, chain?, fearless?}:
     st / flag / mod  the same fields as a perk: calc() (30-mercs.js) adds them while the item is worn (a weapon: while in hand; a shield:
                      while raised), so the battle rules and forecast() read them like any talent and stay exact
     leech  a share of the hitpoints a weapon or spell hit of the bearer takes that the bearer heals at once (no roll)
     thorns hitpoints a foe loses when its weapon hit lands on the bearer in melee (pierces armor; never kills: leaves at least 1)
     chain  arcs: when the bearer lands a killing blow, lightning leaps to up to that many other foes within LG_CHAIN.rng tiles of the
            fallen, nearest first, each taking LG_CHAIN.d damage (rolled) of which LG_CHAIN.ign pierces armor; arcs never chain again
     fearless  the bearer is never shaken: no morale checks (u.fearless)
   leech / thorns / chain / fearless are executed by legendHit / legendKill / legendUnit below, which 61-talents.js wires around hurt(),
   killUnit() and mkMercUnit() of 60-battle-core.js (so the core file is unchanged).
   Drops: only portal and dungeon bosses. legendFor(source) -> an item id (seeded: one rnd() draw) or null; legendGrant(id, o) records it.
     source: {k:'portal'|'dungeon', id?, loot?:[legendary ids it names first], boss?} or a string; never an item already dropped this run
     (G.legend[id]) or held by the company.
   Deeds: m.deeds = {portal:n, dungeon:n, bane:n}; deedAdd(m, k, n?) records one (the endgame agent calls it) and returns the new count.
     The first deed of each DEEDS kind also gives the merc DEED_PP perk point ("the deed teaches").
   Final mastery tier: every tree MAST[k] has cap = {unlock:{deed, n}, lvl, tiers:[[perk, ...]]} (perk ids '<key>.cap', '<key>.capb'; the Weapon
     mastery tree: one per weapon family, '<family>.cap' with perk.wt);
     capOpen(m, key) -> true when the merc's deeds open that tree's capstone; capWhy(m, key) -> '' or how to open it;
     capNeed(kind) -> the level it also needs. 61-talents.js indexes the perks (perkById(id).cap === true), capOptions(m) lists them,
     canLearn / learnPerk / autoLearn / refundTrees respect the lock. Uses no randomness except legendFor (one draw). */
const DEEDS={
 portal:{n:'Portal boss survived',d:'In the field, still standing, when the boss of a portal world fell',icon:'portal'},
 dungeon:{n:'Dungeon cleared',d:'In the field when the last fight of a dungeon was won',icon:'skull'},
 bane:{n:'Champion slain',d:'Landed the killing blow on an elite or boss of a portal world or dungeon',icon:'swords'}};
const DEED_PP=1,DEEDK=Object.keys(DEEDS);
function deedN(m,k){const v=m&&m.deeds&&typeof m.deeds==='object'?m.deeds[k]:0;return typeof v==='number'&&isFinite(v)&&v>0?Math.floor(v):0}
// Records n (default 1) of deed k for merc m. Known kinds only (DEEDS). The first of each kind gives DEED_PP perk point. Returns the new count.
function deedAdd(m,k,n){if(!m||!DEEDS[k])return 0;n=typeof n==='number'&&isFinite(n)&&n>0?Math.floor(n):1;if(!m.deeds||typeof m.deeds!=='object'||Array.isArray(m.deeds))m.deeds={};
 const was=deedN(m,k);m.deeds[k]=Math.min(9999,was+n);if(!was)m.pp=Math.max(0,Math.floor(Number(m.pp)||0))+DEED_PP;return m.deeds[k]}
function deedList(m){return DEEDK.map(k=>({k,n:deedN(m,k),def:DEEDS[k]}))}
/* ---- the final tier: which deed opens it, by tree kind; the level it needs ---- */
const CAP_DEED={style:'dungeon',gift:'portal',weapon:'bane',armor:'dungeon',hunter:'bane',fabled:'portal'};
const CAP_LV={style:10,gift:10,weapon:10,armor:10,hunter:10,fabled:11};
function capNeed(kind){return CAP_LV[kind]||10}
function capOf(key){const T=MAST[key];return T&&T.cap&&Array.isArray(T.cap.tiers)?T.cap:null}
function capOpen(m,key){const C=capOf(key);if(!m||!C)return false;const u=C.unlock||{};return deedN(m,u.deed)>=(u.n||1)}
function capWhy(m,key){const C=capOf(key);if(!C)return'This tree has no final tier';if(capOpen(m,key))return'';const u=C.unlock||{},D=DEEDS[u.deed]||{n:u.deed,d:''},n=u.n||1;
 return`Sealed: ${D.d.charAt(0).toLowerCase()+D.d.slice(1)}${n>1?` (${deedN(m,u.deed)} of ${n})`:''}`}
function capHow(key){const C=capOf(key);if(!C)return'';const D=DEEDS[C.unlock.deed];return D?D.n:''}
/* capstone perks: [tree key, name, text, fields] (one per tree; a second in .capb where listed) */
const CAPS={
 vanguard:[['Spearhead','+6 melee skill; +12% melee damage; a kill steadies you (+10 to the morale roll)',{st:{ms:6},mod:{dmgMelee:.12,killMor:10}}]],
 bulwark:[['Unbreakable','+15 hitpoints; melee blows on you lose 12% of their damage',{st:{hp:15},mod:{drMelee:.12}}]],
 marksman:[['Dead eye','+6 ranged skill; +12% damage with bows, crossbows and guns; +10% head chance',{st:{rs:6},mod:{dmgRanged:.12,headB:10}}]],
 skirmisher:[['Ghost step','+12 initiative, +4 melee and ranged defense; +10 defense against shots after you moved this turn',{st:{init:12,md:4,rd:4},mod:{fleet:10}}]],
 duelist:[['Blade saint','In a duel (one-handed melee weapon, no shield): +8 to hit and +15% damage',{mod:{duelHit:8,duelDmg:.15}}]],
 brute:[['Juggernaut’s wrath','+15% damage with a two-handed melee weapon; cannot be knocked back',{mod:{twoDmg:.15},flag:'kbImm'}]],
 shieldbearer:[['Living wall','A raised shield gives +5 more defense and has 25% more hitpoints',{mod:{shieldDef:5,shieldHp:.25}}]],
 tactician:[['Warlord','Allies beside you get +5 to hit; allies within 3 tiles test morale at +10 resolve',{mod:{cmd:5,brvAura:10}}]],
 survivor:[['Death defier','+10 hitpoints; survives the first killing blow of a battle at 1 hitpoint',{st:{hp:10},flag:'undying'}]],
 medic:[['Saint’s hands','Heals 30% more; allies beside you regain 4 hitpoints at the start of each of their turns',{mod:{healB:.3,medAura:4}}]],
 scout:[['Pathfinder','+1 action point every turn; +5 initiative',{st:{ap:1,init:5}}]],
 berserker:[['Red mist','Regain 4 AP on a kill, once a turn; +20% damage below half health',{flag:'berserk',mod:{lowHpDmg:.2}}]],
 sharpshooter:[['Eagle’s eye','+1 bow range; no range penalty to hit; cover does not hide the target from you',{flag:'eagle',mod:{longShot:1,coverIgn:2}}]],
 assassin:[['Silent killer','+5 initiative; +10% armor piercing and +10% head chance with weapon attacks',{st:{init:5},mod:{ignB:.1,headB:10}}]],
 rogue:[['Prince of thieves','+8 initiative, +5 melee defense; +10% damage and +5 to hit against a foe that is dazed, blinded, stunned, rooted, webbed or fleeing',{st:{init:8,md:5},mod:{dirtyDmg:.1,dirtyHit:5}}]],
 shadow:[['One with the shadows','+10 initiative; every attack that misses you gives +2 more melee and ranged defense until your next turn (with Flow +6 a miss, up to +18; without it +2, up to +6)',{st:{init:10},mod:{flow:2}}]],
 brawler:[['Iron body','+10 hitpoints, +5 melee skill; +15% melee damage against a foe an ally also stands beside',{st:{hp:10,ms:5},mod:{flankDmg:.15}}]],
 mana:[['Archmage','+25% spell damage; +20 mana',{mod:{spellB:.25},res:20}]],
 mana_m:[['Spellblade','+15% spell damage, +10% melee damage; +15 mana',{mod:{spellB:.15,dmgMelee:.1},res:15}]],
 mana_r:[['Hexed arrows','+15% spell damage, +10% damage with ranged weapons; +15 mana',{mod:{spellB:.15,dmgRanged:.1},res:15}]],
 aura:[['Aura of conquest','+12% melee damage; a kill restores 10 aura; +15 aura',{mod:{dmgMelee:.12,killRes:10},res:15}]],
 aura_r:[['Burning sight','+12% ranged damage; a kill restores 10 aura; +15 aura',{mod:{dmgRanged:.12,killRes:10},res:15}]],
 qi:[['Perfect form','+5 melee defense, +10 initiative; qi regenerates 3 more a turn',{st:{md:5,init:10},regen:3}]],
 qi_r:[['Still hand','+5 ranged skill and ranged defense; qi regenerates 3 more a turn',{st:{rs:5,rd:5},regen:3}]],
 chi:[['Wellspring','Heals 30% more; allies beside you regain 3 hitpoints at the start of each of their turns; +15 chi',{mod:{healB:.3,medAura:3},res:15}]],
 chi_m:[['Iron breath','+10 hitpoints; regain 5 hitpoints at the start of each turn',{st:{hp:10},mod:{regenHP:5}}]],
 chi_r:[['Flowing aim','+6 ranged skill; heals 20% more; chi regenerates 2 more a turn',{st:{rs:6},mod:{healB:.2},regen:2}]],
 sword:[['Master of the blade','With a sword in hand: +8 to hit, +4–6 damage',{wmod:{hit:8,d:[4,6]}}]],
 axe:[['Headsman','With an axe in hand: +6–8 damage; shield-splitting blows do 30% more to shields',{wmod:{d:[6,8]},mod:{splitB:.3}}]],
 mace:[['Bell-ringer','With a mace in hand: +15% stun chance, +3–5 damage',{wmod:{stun:.15,d:[3,5]}}]],
 hammer:[['Anvil-breaker','With a hammer in hand: +30% armor crushing, +4–6 damage',{wmod:{crush:.3,d:[4,6]}}]],
 dagger:[['Between the plates','With a dagger in hand: +15% armor piercing, +10% head chance',{wmod:{ign:.15},mod:{headB:10}}]],
 spear:[['Phalanx master','With a spear in hand: +8 to hit; +8 to hit a foe an ally also stands beside',{wmod:{hit:8},mod:{flank:8}}]],
 polearm:[['Long reach','With a polearm in hand: +12 to hit over the tile between',{mod:{reachHit:12}}]],
 greatsword:[['Zweihänder','With a greatsword in hand: +8–10 damage, +10% damage',{wmod:{d:[8,10]},mod:{twoDmg:.1}}]],
 bow:[['Far flight','With a bow in hand: +1 range, +10% head chance',{wmod:{rng:1},mod:{headB:10}}]],
 crossbow:[['Quick crank','With a crossbow in hand: reloading costs 2 AP less; +10% armor piercing',{wmod:{rld:-2,ign:.1}}]],
 flintlock:[['Practised loader','With a gun in hand: reloading costs 2 AP less; +5 to hit',{wmod:{rld:-2,hit:5}}]],
 staff:[['Staff of ages','With a staff in hand: +20% spell damage',{wmod:{spell:.2}}]],
 fist:[['Iron palm','Fighting unarmed: +6–8 damage, +10% stun chance',{wmod:{d:[6,8],stun:.1}}]],
 shield:[['Aegis','A raised shield takes 15% off every blow and has 20% more hitpoints',{mod:{shieldDr:.15,shieldHp:.2}}]],
 lightarmor:[['Windborne','In light armor: shots on you lose 15% of their damage; +4 melee defense',{st:{md:4},mod:{drRanged:.15}}]],
 medarmor:[['Veteran’s harness','In medium armor: every blow on you loses 10%; steps cost half the fatigue',{mod:{drB:.1},flag:'footing'}]],
 heavyarmor:[['Walking fortress','In heavy armor: every blow that reaches your hitpoints loses 5 more; cannot be knocked back',{mod:{hpSoak:5},flag:'kbImm'}]],
 hunter:[['Monster’s bane','+4 melee and ranged skill; +20% damage against bosses, fabled and huge foes',{st:{ms:4,rs:4},mod:{vsBoss:.2}}]]};
// fabled personal trees: one capstone each (owner id -> perk)
const CAPS_FAB={
 aldric:['The last oath','+8 resolve and defense; +15% damage against bosses and fabled foes',{st:{brv:8,md:8,rd:8},mod:{vsBoss:.15}}],
 mirela:['Widow’s requiem','+8 ranged skill; +15% ranged damage',{st:{rs:8},mod:{dmgRanged:.15}}],
 grimhild:['Mountain-heart','+20 hitpoints; every blow that reaches her hitpoints loses 3 more',{st:{hp:20},mod:{hpSoak:3}}],
 korvak:['Pit king','+15% melee damage; a kill heals 10 hitpoints',{mod:{dmgMelee:.15,killHeal:10}}],
 hakon:['Wolf of the north','+10 initiative; +15% damage against a foe an ally also stands beside',{st:{init:10},mod:{flankDmg:.15}}],
 ulfgar:['Lord of the barrow','+20% spell damage; a kill restores 10 of the gift',{mod:{spellB:.2,killRes:10}}],
 kagemaru:['Moonless','+15% armor piercing; +10% head chance',{mod:{ignB:.15,headB:10}}],
 tomoe:['Crane ascendant','+8 to hit over the tile between; +8 melee defense',{st:{md:8},mod:{reachHit:8}}],
 nobusada:['Demon king','+20% damage against bosses, fabled and huge foes; +10 hitpoints',{st:{hp:10},mod:{vsBoss:.2}}],
 jin:['Ten thousand steps','+1 action point; +5 melee defense',{st:{ap:1,md:5}}],
 seraphine:['Inquisitor','+10 resolve; +20% damage against a foe at full health',{st:{brv:10},mod:{vsFull:.2}}],
 mattias:['Saint of gunsmoke','+8 ranged skill; may shoot with a foe beside you',{st:{rs:8},flag:'noLock'}],
 ysolde:['Rift-walker','+15% damage; shots on her lose 15%',{mod:{dmgMelee:.15,drRanged:.15}}],
 brannoc:['The bear wakes','+20 hitpoints; +20% damage below half health',{st:{hp:20},mod:{lowHpDmg:.2}}],
 agathe:['Living saint','Heals 30% more; allies beside her regain 4 hitpoints each turn',{mod:{healB:.3,medAura:4}}],
 yuki:['Snow without end','+1 bow range; +10% ranged damage',{flag:'eagle',mod:{dmgRanged:.1}}]};
function capFields(p,src){const f=src||{};for(const k of ['st','flag','mod','wmod','res','regen','ab'])if(f[k]!==undefined)p[k]=f[k];return p}
for(const k in MAST){const T=MAST[k];if(!T||!Array.isArray(T.tiers)||T.cap)continue;let L=CAPS[k];
 if(!L&&T.kind==='fabled'&&T.owner&&CAPS_FAB[T.owner])L=[CAPS_FAB[T.owner]];
 if(!L&&T.kind==='fabled')L=[['Legend complete','+10 hitpoints; +15% damage against bosses, fabled and huge foes',{st:{hp:10},mod:{vsBoss:.15}}]];
 if(!L)continue;const deed=CAP_DEED[T.kind]||'portal';
 T.cap={unlock:{deed,n:1},lvl:capNeed(T.kind),tiers:[L.map((x,j)=>capFields({id:k+(j?'.capb':'.cap'),n:x[0],d:x[1],cap:1},x[2]))]}}
/* the Weapon mastery tree (MAST.weapons): one capstone per weapon family (CAPS[family], id '<family>.cap', perk.wt), working only with that
   family in hand like the tree's own perks; a merc sees those of the families its background allows (capOptions). */
if(MAST.weapons&&!MAST.weapons.cap){const L=WTS.filter(w=>CAPS[w]).map(w=>capFields({id:w+'.cap',n:CAPS[w][0][0],d:CAPS[w][0][1],cap:1,wt:w},CAPS[w][0][2]));
 if(L.length)MAST.weapons.cap={unlock:{deed:CAP_DEED.weapon,n:1},lvl:capNeed('weapon'),tiers:[L]}}
/* ---- legendary items ---- [key, base ('a|b': the first that exists), name, stat overrides, power, lore] */
const LG_CHAIN={d:[18,28],ign:.5,rng:3};
const LEGENDS=[
 ['dawnbringer','runeblade|arming','Dawnbringer',{d:[54,72],ign:.35,hit:12,fat:9},{n:'Dawn’s mercy',d:'Heals a quarter of the hitpoints each of your hits takes',leech:.25},
  'Forged at first light by a smith who swore the night would not take his daughter. The night came anyway; the blade still remembers the oath and drinks what it cuts.'],
 ['grudgebearer','dwarfaxe|waraxe','Grudgebearer',{d:[60,82],ign:.45},{n:'Old grudge',d:'Regain 4 AP on a kill, once a turn; +25% damage below half health',flag:'berserk',mod:{lowHpDmg:.25}},
  'A dwarf-king’s axe that carries every insult his line ever suffered, notched once for each. It grows heavier with every wound its bearer takes, and angrier.'],
 ['widowmaker','bardiche|greataxe','The Widowmaker',{d:[80,114],ign:.5},{n:'Headsman’s hunger',d:'+50% damage against a foe below half health',flag:'exec',mod:{vsHurt:.25}},
  'Carried by the executioner of the Old Kingdom through nine hundred sentences. When the kingdom fell it went looking for necks of its own.'],
 ['lastmercy','kris|stiletto','Last Mercy',{d:[34,52],ign:.6,hit:8},{n:'Through the gap',d:'+30% armor piercing; +15% head chance',mod:{ignB:.3,headB:15}},
  'The misericorde a saint used to end the suffering of the fallen on the field of Varre. It finds the gap in any armor, as if it pitied the man inside.'],
 ['oathbreaker','bellmace|morningstar','Oathbreaker',{d:[52,72],ign:.55,stun:.4},{n:'Broken vows',d:'+30% damage while the foe’s armor still holds',mod:{vsArm:.3}},
  'The mace that broke the Order of the Lantern, swung by its own grand master on the night he renounced his vows. Plate splits under it like old oaths.'],
 ['worldhammer','warmaul|maul','The World-Hammer',{d:[72,100],ign:.65,crush:1.3},{n:'Giant’s bane',d:'+30% damage against bosses, fabled warriors and huge foes',mod:{vsBoss:.3}},
  'Dwarven sagas say the mountains were struck into shape with it. Whatever the truth, it was made for things far larger than men.'],
 ['heartseeker','runespear|warspear','Heartseeker',{d:[50,66],ign:.4,hit:28},{n:'Wolfpack',d:'+15 to hit and +20% damage against a foe an ally also stands beside',mod:{flank:15,flankDmg:.2}},
  'The spear of the huntress Ysra, who never once hunted alone. It strikes truest when the quarry is surrounded.'],
 ['skyrender','glaive|halberd','Skyrender',{d:[62,88],ign:.4,hit:8},{n:'Long reach',d:'+15 to hit over the tile between; +10% melee damage',mod:{reachHit:15,dmgMelee:.1}},
  'A glaive said to have cut a griffon from the sky over the marches. Its reach seems longer than its haft.'],
 ['kingsblade','runegreat|zweihander','Oath of the Last King',{d:[72,98],ign:.35,hit:12},{n:'The king endures',d:'Survives the first killing blow of a battle at 1 hitpoint; +15% damage',flag:'undying',mod:{twoDmg:.15}},
  'The last king of Wyrd held the bridge alone for a night and a day with this greatsword. He fell at last, but not before dawn, and the blade will not let its bearer fall before then either.'],
 ['starfall','greatbow|warbow','Starfall',{d:[56,80],ign:.4,hit:12,rng:9},{n:'Falling star',d:'No range penalty to hit; cover does not hide the target; +20% head chance',mod:{longShot:1,coverIgn:2,headB:20}},
  'Strung with a thread of silver from a star that fell on the elven wood. Its arrows come down from very far away, and very straight.'],
 ['wyrmbane','windlass|arbalest','Wyrmbane',{d:[70,98],ign:.65,hit:12},{n:'First blood',d:'+30% damage against a foe at full health; +20% armor piercing',mod:{vsFull:.3,ignB:.2}},
  'Built to kill the wyrm of Hollow Fen with one bolt. The first shot is always the one that matters.'],
 ['thunderclap','longrifle|musket','Thunderclap',{d:[90,124],ign:.85,hit:8},{n:'Point blank',d:'May fire with a foe beside you; +10% head chance',flag:'noLock',mod:{headB:10}},
  'A gunsmith’s masterwork that has fired at a dragon, a cardinal and its maker, in that order. It does not care how close the target is.'],
 ['starweaver','archstaff|focus','The Starweaver',{d:[30,46],spell:.7},{n:'Starwell',d:'+20% spell damage; a kill restores 10 of your gift',mod:{spellB:.2,killRes:10}},
  'The staff of the first archmage of the Glass Tower, carved from a tree that grew in a portal-world. The stars move in its grain.'],
 ['kusanagi','katana3|katana2|runeblade','Kusanagi, the Grass-Cutter',{d:[56,74],ign:.35,hit:18},{n:'Wind cutter',d:'In a duel (one-handed, no shield): +10 to hit and +20% damage',mod:{duelHit:10,duelDmg:.2}},
  'Drawn from the tail of the eight-headed serpent, the eastern legends say; it once cut down a burning field to save its bearer. It wants to be held alone.'],
 ['raijin','daikyu|yumi|greatbow','Raijin’s Bow',{d:[54,78],ign:.4,hit:12},{n:'Thunder god’s due',d:`On a kill, lightning leaps to up to 2 other foes within ${LG_CHAIN.rng} tiles of the fallen: ${LG_CHAIN.d[0]}–${LG_CHAIN.d[1]} damage each, half through armor`,chain:2},
  'A lacquered bow said to belong to the drummer of the storm. When it takes a life, the sky answers.'],
 ['stormcleaver','odachi|nodachi|runegreat','Stormcleaver',{d:[70,96],ign:.35,hit:12},{n:'Storm’s edge',d:`On a kill, lightning leaps to 1 other foe within ${LG_CHAIN.rng} tiles of the fallen (${LG_CHAIN.d[0]}–${LG_CHAIN.d[1]}, half through armor); heals a tenth of the hitpoints each hit takes`,chain:1,leech:.1},
  'The great blade of a shogun who rode into a typhoon to meet an invading fleet. Neither came back; the sword washed ashore, humming.'],
 ['aegisplate','gothic|plate','The Aegis of Saint Vey',{arm:380,fat:34},{n:'Wrath of the righteous',d:'A foe whose weapon hit lands on you in melee loses 15 hitpoints (through armor; never kills); +10 resolve',thorns:15,st:{brv:10}},
  'The armor of the saint who walked into the plague-city and out again. Those who strike its wearer feel the blow returned.'],
 ['shadowweave','padded|jack','Shadowweave',{arm:115,fat:4},{n:'Shade-cloth',d:'Light armor: shots on you lose 25%; +15 initiative',mod:{drRanged:.25},st:{init:15}},
  'Woven by the night-spiders of the Hollow from thread no one has seen in daylight. It counts as light armor, whatever it stops.'],
 ['pilgrimmantle','mail|scale','The Pilgrim’s Mantle',{arm:230,fat:14},{n:'Pilgrim’s road',d:'Every blow on you loses 10%; regain 5 hitpoints at the start of each turn',mod:{drB:.1,regenHP:5}},
  'A coat of mail worn by every pilgrim-knight who walked the long road to the Rift and back. Each left a ring; it mends itself on the road.'],
 ['thousandbattles','oyoroi|gothic','Armor of a Thousand Battles',{arm:350,fat:30},{n:'Undefeated',d:'Every blow on you loses 25% below half health; regain 4 hitpoints at the start of each turn',mod:{lastStand:.25,regenHP:4}},
  'The red lacquered o-yoroi of a general who never lost a field. Its lacing has been re-tied by forty generations of retainers.'],
 ['dreadcrown','greathelm|armet','The Dread Crown',{arm:270,fat:12},{n:'Crown of the fearless',d:'You are never shaken: no morale checks; allies within 3 tiles test morale at +10 resolve',fearless:1,mod:{brvAura:10}},
  'The iron crown of the warlord who conquered the Barrow Kings. Fear does not pass beneath it, and those who march with its wearer stand taller.'],
 ['oniface','kawari|kabuto|armet','The Oni’s Face',{arm:280,fat:12},{n:'Demon visage',d:'Head hits on you are 20% less likely; a kill steadies you (+15 to the morale roll)',mod:{headDef:20,killMor:15}},
  'A war-mask hammered in the likeness of a demon that, so they say, sat for the smith. Blades slide from its brow.'],
 ['sunwall','heater2|heater','The Sunwall',{md:32,rd:30,hp:120,fat:12,look:'heater_lgsun'},{n:'Shelter of the sun',d:'While raised: shots on you lose 30%; allies beside you are covered (−10 to be shot)',mod:{deflect:.3,guard:10}},
  'The shield that held the gate of Solmere for forty days. Arrows break on its gilded face like rain on a roof.'],
 ['mirrorshield','dwarfround|round3|heater2','The Mirror of Vey',{md:28,rd:28,hp:110,fat:10,look:'round_lgmirror'},{n:'Turned blow',d:'While raised: a foe whose weapon hit lands on you in melee loses 10 hitpoints (through armor; never kills); every blow loses 10%',thorns:10,mod:{shieldDr:.1}},
  'A round shield polished like still water. Those who strike at its bearer see themselves, and feel it.']];
function lgBase(s){for(const b of String(s).split('|'))if(ITEMS[b]&&!ITEMS[b].famed&&!ITEMS[b].legend)return b;return null}
function lgBuild(L){const [key,bs,n,st,power,lore]=L,base=lgBase(bs);if(!base)return null;const B=ITEMS[base],it=Object.assign({},B);
 if(B.d)it.d=B.d.slice();if(B.reload)it.reload=Object.assign({},B.reload);if(B.sk)it.sk=B.sk.slice();if(B.spike)it.spike=B.spike.slice();
 for(const k in st)it[k]=Array.isArray(st[k])?st[k].slice():st[k];
 const price=Math.round((B.price*3+6000)/100)*100;
 Object.assign(it,{n,tier:6,legend:1,uniq:1,famed:1,base,mods:{},price,look:st.look||'lg_'+key,lore,power:Object.assign({},power),from:null,day:null});delete it.east;delete it.craft;delete it.icon;return it}
const LEGENDIDS=[];
for(const L of LEGENDS){const it=lgBuild(L);if(it){ITEMS['lg:'+L[0]]=it;LEGENDIDS.push('lg:'+L[0])}}
function isLegend(id){const it=ITEMS[id];return!!(it&&it.legend)}
// adds a legendary power's rule fields to calc()'s s (30-mercs.js calls it for each worn piece that counts)
function legendPow(s,p){if(!p)return;if(p.st)for(const q in p.st)s[q]=(s[q]||0)+p.st[q];if(p.flag)s.flags[p.flag]=1;if(p.mod)for(const q in p.mod)s.flags[q]=(s.flags[q]||0)+p.mod[q];
 for(const q of ['leech','thorns','chain'])if(p[q])s.flags[q]=(s.flags[q]||0)+p[q];if(p.fearless)s.flags.fearless=1}
// readable lines of a legendary item: [{k, t}] (the power first)
function legendLines(id){const it=ITEMS[id];if(!it||!it.legend||!it.power)return[];return[{k:'power',t:it.power.n+': '+it.power.d}]}
/* ---- drops ---- */
function legendHeld(id){if(typeof G==='undefined'||!G)return false;if(Array.isArray(G.stash)&&G.stash.includes(id))return true;
 return Array.isArray(G.roster)&&G.roster.some(m=>m&&m.eq&&Object.values(m.eq).includes(id))}
function legendFree(id){return!!ITEMS[id]&&ITEMS[id].legend&&!legendHeld(id)&&!(G&&G.legend&&G.legend[id])}
// an item id for a portal or dungeon boss drop: the source's own loot first (those still free), else any free legendary; one rnd() draw. null when none is left.
function legendFor(source){const S=typeof source==='string'?{id:source}:source||{};let L=(Array.isArray(S.loot)?S.loot:[]).filter(legendFree);if(!L.length)L=LEGENDIDS.filter(legendFree);
 if(!L.length)return null;return L[Math.min(L.length-1,Math.floor(rnd()*L.length))]}
// records a drop and puts it in the stash. Returns the id or null.
function legendGrant(id,o){if(!ITEMS[id]||!ITEMS[id].legend||!G)return null;if(!G.legend||typeof G.legend!=='object')G.legend={};
 G.legend[id]={day:Math.max(1,Math.floor(G.day||1)),from:o&&o.from?String(o.from).slice(0,40):null};if(!legendHeld(id)&&Array.isArray(G.stash))G.stash.push(id);return id}
function legendRepair(g){const L={};if(g&&g.legend&&typeof g.legend==='object'&&!Array.isArray(g.legend))for(const id in g.legend){const r=g.legend[id];if(ITEMS[id]&&ITEMS[id].legend&&r&&typeof r==='object')L[id]={day:typeof r.day==='number'&&isFinite(r.day)?Math.max(1,Math.floor(r.day)):1,from:typeof r.from==='string'?r.from.slice(0,40):null}}
 if(g)g.legend=L;const fixM=m=>{if(!m||typeof m!=='object')return;const D={};if(m.deeds&&typeof m.deeds==='object')for(const k of DEEDK){const n=deedN(m,k);if(n)D[k]=Math.min(9999,n)}if(Object.keys(D).length)m.deeds=D;else delete m.deeds;
  if(Array.isArray(m.perks)&&typeof refundTrees==='function')refundTrees(m)};
 if(g&&Array.isArray(g.roster))g.roster.forEach(fixM);return g}
/* ---- rules of the powers no talent field covers (wired around 60-battle-core.js by 61-talents.js) ---- */
let LG_ARC=0;
// after hurt(t, ...) with attacker u took hpd hitpoints (o.loc: a weapon or spell hit)
function legendHit(u,t,hpd,o){if(!u||!t||!o||!o.loc||!(hpd>0)||u===t)return;const fu=u.flags||{},ft=t.flags||{};
 if(fu.leech>0&&u.alive&&u.hp<u.hpMax){const h=Math.min(u.hpMax-u.hp,Math.round(hpd*fu.leech));if(h>0){u.hp+=h;if(typeof float==='function')float(u,'+'+h,'#9bd96f');if(typeof FX==='object'&&FX.emit)FX.emit('heal',{t:u,n:h})}}
 if(ft.thorns>0&&u.alive&&u.side!==t.side&&typeof mdist==='function'&&mdist(u,t)<=1&&u.hp>1){const d=Math.min(u.hp-1,Math.round(ft.thorns));if(d>0){u.hp-=d;if(typeof float==='function')float(u,'-'+d+' thorns','#ff7a6b');if(typeof FX==='object'&&FX.emit)FX.emit('hit',{u:t,t:u,dmg:d,armor:0,head:false})}}}
// after killUnit(t, u): chain lightning from the bearer's power
function legendKill(u,t){if(!u||!t||LG_ARC||!u.alive||!(u.flags&&u.flags.chain>0)||typeof B==='undefined'||!B||u.side===t.side)return;
 const n=Math.floor(u.flags.chain),L=B.units.filter(x=>x.alive&&x!==t&&x.side!==u.side&&mdist(x,t)<=LG_CHAIN.rng).sort((a,b)=>mdist(a,t)-mdist(b,t)||a.id-b.id).slice(0,n);
 if(!L.length)return;LG_ARC=1;try{for(const x of L){if(!x.alive)continue;const d=ri(LG_CHAIN.d[0],LG_CHAIN.d[1]);if(typeof FX==='object'&&FX.emit)FX.emit('status',{t:x,key:'shock',n:0});if(typeof say==='function')say(`Lightning leaps to ${x.name}.`);hurt(x,d,LG_CHAIN.ign,u,{})}}finally{LG_ARC=0}}
// after mkMercUnit: the unit-level fields of a power (fearless)
function legendUnit(u){if(u&&u.flags&&u.flags.fearless)u.fearless=true;return u}
// what the bearer's legendary powers add to a strike, for the HUD and inspect (no rnd): [{k, t}]
function legendFcLines(u,t,a){const f=u&&u.flags||{},ft=t&&t.flags||{},out=[];if(f.leech)out.push({k:'leech',t:`Heals ${Math.round(f.leech*100)}% of the hitpoints the hit takes`});
 if(f.chain)out.push({k:'chain',t:`A kill sends lightning to ${f.chain} more foe${f.chain>1?'s':''} (${LG_CHAIN.d[0]}–${LG_CHAIN.d[1]})`});
 if(ft.thorns&&u&&t&&typeof mdist==='function'&&mdist(u,t)<=1&&!(a&&a.magic))out.push({k:'thorns',t:`A hit costs the attacker ${ft.thorns} hitpoints (thorns)`});return out}
