/* ================= DATA ================= */
const RESC={mana:'#62a6ee',aura:'#ecc64f',qi:'#3fd0b6',chi:'#9bd96f'},RESN={mana:'Mana',aura:'Aura',qi:'Qi',chi:'Chi'},RESK=['mana','aura','qi','chi'];
const STATN={hp:'Hitpoints',fat:'Fatigue',init:'Initiative',ms:'Melee skill',rs:'Ranged skill',md:'Melee defense',rd:'Ranged defense',brv:'Resolve'};
const ROLL={hp:[2,4],fat:[2,4],init:[3,5],ms:[1,3],rs:[2,4],md:[1,3],rd:[2,4],brv:[2,4]};
/* XPT[L]: the xp a sword needs to stand at level L (levels 1..MAXLV). Levels 1-6 come as fast as ever (2-4 even fights a level);
   from level 6 each level asks ~14% more fights than the one before (the xp a fight pays grows with the company too), so 10 takes
   ~39 even fights (was 32), 15 ~91 (was 55) and 20 ~190: the last five levels are a long late-game goal. XPV: this table's version,
   stamped on a save (G.xpv) so an older save's xp is set on it again (repairSave, 20-state.js: each sword keeps its level and its
   share of the way to the next). Was [0,0,200,500,1000,1700,2600,3700,5000,6500,8200,10100,12200,14500,17000,20000] to level 15. */
const XPT=[0,0,200,500,1000,1700,2600,3800,5400,7500,10250,13750,18000,23250,29500,36750,45250,55250,67000,80500,96500],XPV=2;
const XPT1=[0,0,200,500,1000,1700,2600,3700,5000,6500,8200,10100,12200,14500,17000,20000];   // the table before XPV 2 (old saves)
// MAXLV: the highest level. PPLV: the last level that brings a mastery (perk) point; levels PPLV+1..MAXLV bring the attribute rolls only.
const MAXLV=20,PPLV=15,MAXROSTER=20,MAXFIELD=12;   // the roster holds 20 swords, 12 take the field
const FIST={n:'Fists',wt:'fist',d:[6,12],ap:4,fat:6,rng:1,ign:.1};
const ITEMS={
 knife:{k:'w',n:'Knife',wt:'dagger',d:[15,25],ap:3,fat:5,rng:1,ign:.2,crush:-.2,price:40},
 rondel:{k:'w',n:'Rondel dagger',wt:'dagger',d:[22,38],ap:3,fat:5,rng:1,ign:.4,crush:-.2,price:340},
 club:{k:'w',n:'Cudgel',wt:'mace',d:[18,30],ap:4,fat:10,rng:1,ign:.3,stun:.15,price:50},
 mace:{k:'w',n:'Flanged mace',wt:'mace',d:[32,48],ap:4,fat:12,rng:1,ign:.4,stun:.25,price:520},
 shortsword:{k:'w',n:'Short sword',wt:'sword',d:[26,36],ap:4,fat:8,rng:1,ign:.2,hit:10,price:160},
 arming:{k:'w',n:'Arming sword',wt:'sword',d:[36,48],ap:4,fat:9,rng:1,ign:.2,hit:10,price:560},
 runeblade:{k:'w',n:'Runed longsword',wt:'sword',d:[46,62],ap:4,fat:10,rng:1,ign:.25,hit:10,price:1500},
 handaxe:{k:'w',n:'Hand axe',wt:'axe',d:[28,42],ap:4,fat:11,rng:1,ign:.3,price:180},
 waraxe:{k:'w',n:'War axe',wt:'axe',d:[42,62],ap:4,fat:13,rng:1,ign:.35,price:640},
 greataxe:{k:'w',n:'Greataxe',wt:'axe',two:1,d:[62,92],ap:6,fat:18,rng:1,ign:.4,price:900},
 spear:{k:'w',n:'Militia spear',wt:'spear',d:[22,32],ap:4,fat:9,rng:1,ign:.2,hit:20,price:120},
 warspear:{k:'w',n:'Fighting spear',wt:'spear',d:[32,42],ap:4,fat:10,rng:1,ign:.25,hit:20,price:480},
 pike:{k:'w',n:'Pike',wt:'spear',two:1,d:[50,72],ap:6,fat:16,rng:2,ign:.3,price:560},
 shortbow:{k:'w',n:'Short bow',wt:'bow',two:1,d:[26,42],ap:4,fat:10,rng:6,ign:.25,price:200},
 warbow:{k:'w',n:'War bow',wt:'bow',two:1,d:[40,62],ap:5,fat:13,rng:7,ign:.3,price:780},
 staff:{k:'w',n:'Quarterstaff',wt:'staff',two:1,d:[20,34],ap:4,fat:8,rng:1,ign:.25,spell:.1,price:80},
 focus:{k:'w',n:'Runed focus staff',wt:'staff',two:1,d:[24,38],ap:4,fat:8,rng:1,ign:.25,spell:.3,price:760},
 riftedge:{k:'w',n:'Rift-forged blade',wt:'sword',d:[56,76],ap:4,fat:10,rng:1,ign:.4,hit:10,price:3000,uniq:1},
 buckler:{k:'s',n:'Buckler',md:10,rd:5,fat:4,price:80},
 kite:{k:'s',n:'Kite shield',md:15,rd:25,fat:10,price:260},
 heater:{k:'s',n:'Heater shield',md:22,rd:15,fat:12,price:420},
 rags:{k:'a',n:'Tattered rags',arm:15,fat:0,price:20},
 robe:{k:'a',n:'Warded robe',arm:45,fat:2,price:280},
 padded:{k:'a',n:'Padded gambeson',arm:60,fat:6,price:130},
 leather:{k:'a',n:'Boiled leather',arm:95,fat:10,price:340},
 mail:{k:'a',n:'Mail hauberk',arm:150,fat:18,price:950},
 scale:{k:'a',n:'Scale harness',arm:210,fat:26,price:1900},
 plate:{k:'a',n:'Knightly plate',arm:300,fat:36,price:4200}
};
/* ---- Phase 5 gear: helmets (k:'h', worn in m.eq.h), shield hitpoints, weapon skills ----
   Helmets carry about two thirds of the matching body armor at about half its price and a third of its weight.
   ITEMS[id].sk lists the ability ids a weapon or shield grants while it is in hand (see the weapon skills in AB). */
Object.assign(ITEMS,{
 hood:{k:'h',n:'Cloth hood',arm:20,fat:0,price:25},
 cap:{k:'h',n:'Leather cap',arm:40,fat:1,price:70},
 coif:{k:'h',n:'Mail coif',arm:70,fat:3,price:220},
 kettle:{k:'h',n:'Kettle hat',arm:105,fat:5,price:480},
 nasal:{k:'h',n:'Nasal helm',arm:140,fat:7,price:860},
 barbute:{k:'h',n:'Barbute',arm:180,fat:10,price:1500},
 greathelm:{k:'h',n:'Great helm',arm:240,fat:14,price:2600}
});
/* ---- Arms update: hammers, polearms, greatswords, crossbows, flintlocks, more shields ----
   Weapon fields beyond the old ones: crush (armor crushing: a hit tears up that much more armor, as a fraction of the damage;
   see hurt()), reload {ap, fat} (a reload weapon fires only when loaded: firing unloads it, the 'reload' skill loads it),
   look (the art's shape key), shot ('arrow' | 'bolt' | 'ball': the projectile), fx ('smoke': a flintlock's discharge).
   Shield fields: look (buckler round kite heater tower spiked), guard (Cover: shots and spells against allies next to the
   raised shield get -guard to hit), wallB (Shield wall gives that much more melee and ranged defense), spike [min,max] (the
   damage of Spiked bash). Ranged weapon families: RANGEDWT (bow, crossbow, flintlock): they shoot (ranged skill, the ranged
   lock, friendly fire) and never take free attacks. */
Object.assign(ITEMS,{
 mallet:{k:'w',n:'Smith\'s hammer',wt:'hammer',d:[18,28],ap:4,fat:10,rng:1,ign:.35,crush:.2,price:90,look:'hammer'},
 warhammer:{k:'w',n:'War hammer',wt:'hammer',d:[28,40],ap:4,fat:12,rng:1,ign:.45,crush:.35,price:620,look:'warhammer'},
 maul:{k:'w',n:'Maul',wt:'hammer',two:1,d:[52,78],ap:6,fat:20,rng:1,ign:.5,crush:.45,price:840,look:'maul'},
 warmaul:{k:'w',n:'Dwarven warmaul',wt:'hammer',two:1,d:[64,92],ap:6,fat:22,rng:1,ign:.5,crush:.55,price:2200,look:'maul'},
 bill:{k:'w',n:'Billhook',wt:'polearm',two:1,d:[34,50],ap:5,fat:14,rng:2,ign:.3,hit:5,price:280,look:'bill'},
 halberd:{k:'w',n:'Halberd',wt:'polearm',two:1,d:[48,70],ap:6,fat:17,rng:2,ign:.4,price:950,look:'halberd'},
 glaive:{k:'w',n:'War glaive',wt:'polearm',two:1,d:[56,80],ap:6,fat:16,rng:2,ign:.35,hit:5,price:1800,look:'glaive'},
 greatsword:{k:'w',n:'Greatsword',wt:'greatsword',two:1,d:[46,66],ap:6,fat:16,rng:2,ign:.25,hit:5,price:720,look:'greatsword'},
 zweihander:{k:'w',n:'Zweihänder',wt:'greatsword',two:1,d:[56,80],ap:6,fat:18,rng:2,ign:.3,hit:5,price:1650,look:'zweihander'},
 runegreat:{k:'w',n:'Runed greatsword',wt:'greatsword',two:1,d:[66,92],ap:6,fat:18,rng:2,ign:.3,hit:10,price:3100,look:'runegreat'},
 lightxbow:{k:'w',n:'Light crossbow',wt:'crossbow',two:1,d:[30,46],ap:4,fat:8,rng:6,ign:.4,hit:10,reload:{ap:3,fat:8},price:320,look:'crossbow',shot:'bolt'},
 crossbow:{k:'w',n:'Heavy crossbow',wt:'crossbow',two:1,d:[42,64],ap:4,fat:10,rng:7,ign:.5,hit:10,reload:{ap:4,fat:12},price:980,look:'crossbow',shot:'bolt'},
 arbalest:{k:'w',n:'Arbalest',wt:'crossbow',two:1,d:[54,80],ap:4,fat:12,rng:8,ign:.55,hit:10,reload:{ap:5,fat:16},price:2100,look:'arbalest',shot:'bolt'},
 pistol:{k:'w',n:'Wheellock pistol',wt:'flintlock',d:[36,54],ap:4,fat:6,rng:4,ign:.55,reload:{ap:5,fat:10},price:760,look:'pistol',shot:'ball',fx:'smoke'},
 duelpistol:{k:'w',n:'Duelling pistol',wt:'flintlock',d:[44,64],ap:4,fat:6,rng:5,ign:.6,hit:5,reload:{ap:5,fat:10},price:1600,look:'pistol',shot:'ball',fx:'smoke'},
 musket:{k:'w',n:'Musket',wt:'flintlock',two:1,d:[70,100],ap:5,fat:10,rng:7,ign:.6,hit:-5,reload:{ap:4,fat:14},price:1400,look:'musket',shot:'ball',fx:'smoke'},
 roundshield:{k:'s',n:'Round shield',md:14,rd:14,fat:7,price:150,look:'round'},
 ironround:{k:'s',n:'Iron-rimmed round shield',md:18,rd:18,fat:9,price:520,look:'round'},
 spiked:{k:'s',n:'Spiked shield',md:12,rd:8,fat:8,spike:[16,26],price:340,look:'spiked'},
 warspiked:{k:'s',n:'War-spiked shield',md:16,rd:12,fat:11,spike:[24,38],price:900,look:'spiked'},
 tower:{k:'s',n:'Tower shield',md:16,rd:30,fat:18,guard:8,wallB:10,price:680,look:'tower'},
 steeltower:{k:'s',n:'Steel tower shield',md:18,rd:34,fat:20,guard:10,wallB:10,price:1450,look:'tower'}
});
ITEMS.buckler.look='buckler';ITEMS.kite.look='kite';ITEMS.heater.look='heater';
/* ---- Gear variety: every family across five tiers (tier 1 hamlet stalls .. tier 5 city armouries and the best loot) ----
   Each item has tier (1..5) and look: a key unique to the item (its own id unless set) so the art draws every one apart.
   Shield looks start with their shape family (buckler round kite heater tower spiked targe pavise). */
ITEMS.ironround.look='round2';ITEMS.warspiked.look='spiked2';ITEMS.steeltower.look='tower2';ITEMS.lightxbow.look='lightxbow';ITEMS.duelpistol.look='duelpistol';ITEMS.warmaul.look='warmaul';
Object.assign(ITEMS,{
 // daggers: 3 AP stabs; the good ones slip through armor
 dirk:{k:'w',n:'Dirk',wt:'dagger',d:[18,28],ap:3,fat:5,rng:1,ign:.25,hit:5,crush:-.2,price:90},
 seax:{k:'w',n:'Seax',wt:'dagger',d:[22,34],ap:3,fat:7,rng:1,ign:.25,crush:-.2,price:200},
 stiletto:{k:'w',n:'Stiletto',wt:'dagger',d:[24,36],ap:3,fat:4,rng:1,ign:.6,hit:10,crush:-.2,price:900},
 kris:{k:'w',n:'Serpent kris',wt:'dagger',d:[30,46],ap:3,fat:5,rng:1,ign:.5,hit:5,crush:-.2,price:1900},
 /* more daggers: a cheap peasant's blade, a broad Italian one, a parrying blade for the off hand, a mercy-blade for armor's gaps */
 bollock:{k:'w',n:'Bollock dagger',wt:'dagger',d:[17,27],ap:3,fat:5,rng:1,ign:.25,crush:-.2,price:60},
 huntknife:{k:'w',n:'Hunting knife',wt:'dagger',d:[18,30],ap:3,fat:5,rng:1,ign:.2,crush:-.2,price:110},
 baselard:{k:'w',n:'Baselard',wt:'dagger',d:[22,36],ap:3,fat:6,rng:1,ign:.3,crush:-.2,price:280},
 maingauche:{k:'w',n:'Parrying dagger',wt:'dagger',d:[18,30],ap:3,fat:4,rng:1,ign:.3,hit:10,crush:-.2,price:420},
 cinquedea:{k:'w',n:'Cinquedea',wt:'dagger',d:[28,42],ap:3,fat:7,rng:1,ign:.3,crush:-.2,price:640},
 misericorde:{k:'w',n:'Misericorde',wt:'dagger',d:[24,38],ap:3,fat:5,rng:1,ign:.65,hit:5,crush:-.2,price:1200},
 // maces: stuns
 spikedclub:{k:'w',n:'Spiked club',wt:'mace',d:[22,34],ap:4,fat:11,rng:1,ign:.3,stun:.1,price:95},
 ironmace:{k:'w',n:'Iron mace',wt:'mace',d:[26,40],ap:4,fat:11,rng:1,ign:.35,stun:.2,price:240},
 morningstar:{k:'w',n:'Morning star',wt:'mace',d:[40,58],ap:4,fat:14,rng:1,ign:.4,stun:.2,hit:-5,price:1150},
 flail:{k:'w',n:'Knight\'s flail',wt:'mace',d:[34,52],ap:4,fat:13,rng:1,ign:.45,stun:.3,hit:10,price:1400},
 bellmace:{k:'w',n:'Cathedral mace',wt:'mace',d:[46,66],ap:4,fat:14,rng:1,ign:.5,stun:.35,price:2600},
 // swords: accurate
 oldsword:{k:'w',n:'Notched blade',wt:'sword',d:[20,30],ap:4,fat:8,rng:1,ign:.2,hit:5,price:70},
 falchion:{k:'w',n:'Falchion',wt:'sword',d:[30,44],ap:4,fat:9,rng:1,ign:.25,price:260},
 estoc:{k:'w',n:'Estoc',wt:'sword',d:[38,52],ap:4,fat:10,rng:1,ign:.55,hit:10,price:1150},
 // axes: heavy cuts that split shields
 hatchet:{k:'w',n:'Hatchet',wt:'axe',d:[22,34],ap:4,fat:9,rng:1,ign:.25,price:70},
 beardaxe:{k:'w',n:'Bearded axe',wt:'axe',d:[34,52],ap:4,fat:12,rng:1,ign:.3,hit:5,price:420},
 dwarfaxe:{k:'w',n:'Dwarven war axe',wt:'axe',d:[52,74],ap:4,fat:14,rng:1,ign:.4,price:2100},
 bardiche:{k:'w',n:'Bardiche',wt:'axe',two:1,d:[70,104],ap:6,fat:20,rng:1,ign:.45,price:2800},
 // spears: the surest hands
 boarspear:{k:'w',n:'Boar spear',wt:'spear',d:[28,38],ap:4,fat:10,rng:1,ign:.25,hit:15,price:260},
 wingspear:{k:'w',n:'Winged spear',wt:'spear',d:[38,50],ap:4,fat:11,rng:1,ign:.3,hit:20,price:1200},
 runespear:{k:'w',n:'Runed spear',wt:'spear',d:[44,58],ap:4,fat:11,rng:1,ign:.35,hit:25,price:2400},
 // bows
 huntbow:{k:'w',n:'Hunting bow',wt:'bow',two:1,d:[20,34],ap:4,fat:8,rng:5,ign:.2,price:70,shot:'arrow'},
 recurve:{k:'w',n:'Horn recurve',wt:'bow',two:1,d:[32,48],ap:4,fat:10,rng:6,ign:.25,hit:10,price:460,shot:'arrow'},
 longbow:{k:'w',n:'Yew longbow',wt:'bow',two:1,d:[38,56],ap:5,fat:14,rng:8,ign:.3,price:640,shot:'arrow'},
 greatbow:{k:'w',n:'Elven greatbow',wt:'bow',two:1,d:[50,74],ap:5,fat:13,rng:8,ign:.35,hit:10,price:2400,shot:'arrow'},
 // staves: the casters' focus
 pilgrim:{k:'w',n:'Pilgrim\'s staff',wt:'staff',two:1,d:[22,36],ap:4,fat:8,rng:1,ign:.25,spell:.15,price:220},
 ironstaff:{k:'w',n:'Iron-shod staff',wt:'staff',two:1,d:[30,46],ap:4,fat:10,rng:1,ign:.3,spell:.1,price:380},
 witchstave:{k:'w',n:'Witchwood stave',wt:'staff',two:1,d:[22,36],ap:4,fat:7,rng:1,ign:.25,spell:.22,price:520},
 archstaff:{k:'w',n:'Archmage\'s staff',wt:'staff',two:1,d:[26,42],ap:4,fat:8,rng:1,ign:.25,spell:.45,price:2400},
 // hammers: crush armor
 horsepick:{k:'w',n:'Horseman\'s pick',wt:'hammer',d:[22,34],ap:4,fat:11,rng:1,ign:.45,crush:.25,price:300},
 knighthammer:{k:'w',n:'Knightly war hammer',wt:'hammer',d:[34,48],ap:4,fat:13,rng:1,ign:.5,crush:.4,hit:5,price:1300},
 // polearms: reach 2
 pitchfork:{k:'w',n:'Pitchfork',wt:'polearm',two:1,d:[22,34],ap:5,fat:12,rng:2,ign:.2,hit:5,price:70},
 voulge:{k:'w',n:'Voulge',wt:'polearm',two:1,d:[42,60],ap:6,fat:15,rng:2,ign:.35,price:520},
 lucerne:{k:'w',n:'Lucerne hammer',wt:'polearm',two:1,d:[44,62],ap:6,fat:16,rng:2,ign:.5,crush:.3,price:1400},
 // greatswords: reach 2, wide cuts
 waster:{k:'w',n:'Notched greatsword',wt:'greatsword',two:1,d:[32,48],ap:6,fat:15,rng:2,ign:.2,price:150},
 bastard:{k:'w',n:'Hand-and-a-half sword',wt:'greatsword',two:1,d:[38,56],ap:6,fat:15,rng:2,ign:.25,hit:5,price:380},
 flamberge:{k:'w',n:'Flamberge',wt:'greatsword',two:1,d:[60,86],ap:6,fat:19,rng:2,ign:.3,price:1450},
 // crossbows: aim and pierce, then reload
 huntxbow:{k:'w',n:'Hunting crossbow',wt:'crossbow',two:1,d:[24,38],ap:4,fat:7,rng:5,ign:.35,hit:10,reload:{ap:3,fat:6},price:150,shot:'bolt'},
 repeater:{k:'w',n:'Repeating crossbow',wt:'crossbow',two:1,d:[28,40],ap:4,fat:8,rng:5,ign:.35,hit:5,reload:{ap:2,fat:6},price:760,shot:'bolt'},
 windlass:{k:'w',n:'Dwarven windlass',wt:'crossbow',two:1,d:[64,92],ap:4,fat:12,rng:8,ign:.6,hit:10,reload:{ap:6,fat:18},price:3200,shot:'bolt'},
 // firearms: the deepest bite through armor, slow to load. The rebalance (test/firearms.js): no gun worse than -5 to hit, and every gun
 // below tier 4 (and the musket) fires once a turn standing still (shot + reload = 9 AP, nothing left to step); Ramrod drill frees 2 AP
 // for a step, and lets the jezail and the rifled long gun fire every turn. The wall gun stays a two-turn piece.
 handgonne:{k:'w',n:'Hand cannon',wt:'flintlock',two:1,d:[30,50],ap:4,fat:6,rng:4,ign:.5,hit:5,reload:{ap:5,fat:12},price:140,shot:'ball',fx:'smoke'},
 arquebus:{k:'w',n:'Arquebus',wt:'flintlock',two:1,d:[48,72],ap:4,fat:9,rng:6,ign:.55,hit:-5,reload:{ap:5,fat:14},price:420,shot:'ball',fx:'smoke'},
 blunder:{k:'w',n:'Blunderbuss',wt:'flintlock',two:1,d:[52,80],ap:4,fat:10,rng:3,ign:.5,hit:5,reload:{ap:5,fat:12},price:900,shot:'ball',fx:'smoke'},
 longrifle:{k:'w',n:'Rifled long gun',wt:'flintlock',two:1,d:[84,118],ap:5,fat:11,rng:9,ign:.65,hit:5,reload:{ap:6,fat:16},price:3000,shot:'ball',fx:'smoke'},
 // shields
 targe:{k:'s',n:'Hide targe',md:8,rd:8,fat:3,price:55,look:'targe'},
 steelbuckler:{k:'s',n:'Steel buckler',md:15,rd:8,fat:5,price:480,look:'buckler2'},
 pavise:{k:'s',n:'Pavise',md:10,rd:34,fat:16,guard:10,wallB:6,price:820,look:'pavise'},
 kite2:{k:'s',n:'Knight\'s kite shield',md:20,rd:30,fat:12,price:1250,look:'kite2'},
 heater2:{k:'s',n:'Blazoned heater',md:28,rd:20,fat:13,price:2300,look:'heater2'},
 dwarfround:{k:'s',n:'Dwarven roundshield',md:24,rd:24,fat:11,price:2600,look:'round3'},
 // body armor (casters' robes are light for their protection)
 jack:{k:'a',n:'Quilted jack',arm:35,fat:2,price:55},
 hide:{k:'a',n:'Hide jerkin',arm:75,fat:9,price:170},
 studded:{k:'a',n:'Studded leather',arm:120,fat:13,price:520},
 brigandine:{k:'a',n:'Brigandine',arm:140,fat:15,price:780},
 sigilrobe:{k:'a',n:'Sigiled robe',arm:70,fat:3,price:820},
 lamellar:{k:'a',n:'Lamellar cuirass',arm:180,fat:22,price:1350},
 mailrobe:{k:'a',n:'Warded mail robe',arm:120,fat:8,price:1700},
 coatplates:{k:'a',n:'Coat of plates',arm:240,fat:30,price:2300},
 gothic:{k:'a',n:'Gothic plate',arm:340,fat:38,price:6200},
 archrobe:{k:'a',n:'Archmage\'s vestments',arm:150,fat:9,price:3400},
 // helmets
 armcap:{k:'h',n:'Padded arming cap',arm:30,fat:0,price:45},
 spangen:{k:'h',n:'Spangenhelm',arm:88,fat:4,price:330},
 sallet:{k:'h',n:'Sallet',arm:160,fat:8,price:1150},
 bascinet:{k:'h',n:'Visored bascinet',arm:210,fat:12,price:2000},
 armet:{k:'h',n:'Armet',arm:270,fat:16,price:3600}
});
{const T={knife:1,dirk:1,seax:2,rondel:3,stiletto:4,kris:5,bollock:1,huntknife:1,baselard:2,maingauche:3,cinquedea:3,misericorde:4, club:1,spikedclub:1,ironmace:2,mace:3,morningstar:4,flail:4,bellmace:5,
  oldsword:1,shortsword:2,falchion:2,arming:3,estoc:4,runeblade:5,riftedge:5, hatchet:1,handaxe:2,beardaxe:3,waraxe:3,greataxe:4,dwarfaxe:5,bardiche:5,
  spear:1,boarspear:2,warspear:3,pike:3,wingspear:4,runespear:5, huntbow:1,shortbow:2,recurve:3,longbow:3,warbow:4,greatbow:5,
  staff:1,pilgrim:2,ironstaff:2,witchstave:3,focus:4,archstaff:5, mallet:1,horsepick:2,warhammer:3,maul:4,knighthammer:4,warmaul:5,
  pitchfork:1,bill:2,voulge:3,halberd:4,lucerne:4,glaive:5, waster:1,bastard:2,greatsword:3,flamberge:4,zweihander:4,runegreat:5,
  huntxbow:1,lightxbow:2,repeater:3,crossbow:3,arbalest:4,windlass:5, handgonne:1,arquebus:2,pistol:3,blunder:3,musket:4,duelpistol:4,longrifle:5,
  targe:1,buckler:1,roundshield:2,kite:2,spiked:2,heater:3,ironround:3,steelbuckler:3,tower:3,pavise:3,warspiked:4,kite2:4,steeltower:4,heater2:5,dwarfround:5,
  rags:1,jack:1,padded:1,hide:2,robe:2,leather:2,studded:3,brigandine:3,mail:3,sigilrobe:3,lamellar:4,scale:4,mailrobe:4,coatplates:4,plate:5,gothic:5,archrobe:5,
  hood:1,armcap:1,cap:1,coif:2,spangen:2,kettle:3,nasal:3,sallet:4,barbute:4,bascinet:4,greathelm:5,armet:5};
 for(const id in ITEMS){const i=ITEMS[id];i.tier=T[id]||(i.price<150?1:i.price<450?2:i.price<1100?3:i.price<2400?4:5);if(!i.look)i.look=id}}
for(const id of ['shortbow','warbow'])ITEMS[id].shot='arrow';
/* ---- Surcoats (k:'c', worn in m.eq.c over the body armor): sleeveless cloth coats in the wearer's colours: the banner's field (c1)
   with its charge (c2) and emblem on the chest and the back (the company's for its swords, a house's for its soldiers). Sold only by
   tailors (47-tailor.js); uniq keeps them off the market stalls and out of loot. Small numbers: resolve, a little weight, the odd
   point of defense. coat = the cut the art draws: tabard (short, open at the sides), surcoat (long, split at the front), quilted
   (padded, mid-thigh), mantle (a tabard under a shoulder cape), herald (long and fine, a bordered hem), jinbaori (eastern, open front). */
Object.assign(ITEMS,{
 tabard:{k:'c',n:'Tabard',coat:'tabard',brv:3,fat:0,price:70,tier:1,look:'tabard',uniq:1,tailor:1,d:'A short sleeveless tunic in the company colours, open at the sides over the armor.'},
 surcoat:{k:'c',n:'Surcoat',coat:'surcoat',brv:5,fat:1,price:160,tier:2,look:'surcoat',uniq:1,tailor:1,d:'A long coat of arms worn over the armor, split at the front for the march.'},
 quiltcoat:{k:'c',n:'Padded surcoat',coat:'quilted',brv:3,md:1,fat:2,price:220,tier:2,look:'quiltcoat',uniq:1,tailor:1,d:'A quilted gambeson cut as a surcoat: it takes the edge off a blow.'},
 mantletabard:{k:'c',n:'Mantled tabard',coat:'mantle',brv:4,rd:1,fat:1,price:300,tier:3,look:'mantletabard',uniq:1,tailor:1,d:'A tabard under a short shoulder cape that turns the odd arrow.'},
 heraldcoat:{k:'c',n:'Heraldic coat',coat:'herald',brv:7,rd:1,fat:1,price:650,tier:3,look:'heraldcoat',uniq:1,tailor:1,d:'Fine wool, the charge embroidered large and a bordered hem: the colours worn with pride.'},
 jinbaori:{k:'c',n:'Jinbaori',coat:'jinbaori',brv:5,init:2,fat:1,price:480,tier:3,look:'jinbaori',uniq:1,tailor:1,east:1,d:'An eastern sleeveless campaign coat with the mon on the back. Only eastern tailors cut it.'}
});
const RANGEDWT=['bow','crossbow','flintlock','throwing'];   // throwing: knives, axes, stars and javelins (11t-arms.js)
// A ranged weapon (bow, crossbow, flintlock, or an enemy's ranged attack): it shoots with ranged skill, obeys the ranged lock, takes no free attacks.
function isRangedW(w){return!!(w&&RANGEDWT.includes(w.wt))}
const WSK={sword:['slash','riposte'],axe:['split'],mace:['stunblow'],dagger:['puncture'],spear:['thrust','spearwall'],bow:['quick'],staff:['sweep'],
  hammer:['batter'],polearm:['hook','reap'],greatsword:['halfsword','gswing'],crossbow:['reload','xaim'],flintlock:['reload','blast'],throwing:['tstrike']},
 WSKID={greataxe:['split','round'],pike:['impale'],maul:['batter','hsmash'],warmaul:['batter','hsmash'],bill:['hook']},
 SHIELDHP={buckler:32,kite:64,heater:80,roundshield:50,ironround:66,spiked:56,warspiked:72,tower:110,steeltower:140},SHIELDSK={spiked:['shieldwall','spikebash'],warspiked:['shieldwall','spikebash']};
// the new items' own skill sets (where one differs from its family's) and shield hitpoints
Object.assign(WSKID,{falchion:['slash'],estoc:['riposte'],bardiche:['split','round'],pitchfork:['hook'],waster:['gswing'],repeater:['reload'],handgonne:['reload']});
Object.assign(SHIELDHP,{targe:36,steelbuckler:44,pavise:100,kite2:84,heater2:96,dwarfround:90});
for(const id in ITEMS){const i=ITEMS[id];if(i.k==='w')i.sk=WSKID[id]||WSK[i.wt]||[];else if(i.k==='s'){i.sk=SHIELDSK[id]||['shieldwall','bash'];i.hp=SHIELDHP[id]||48}}
function itemDesc(id){const i=ITEMS[id];if(i.k==='t')return`Trade good, worth ${i.price} crowns where it is not made (half where it is)`;
 if(i.k==='c'){const L=[];if(i.brv)L.push('+'+i.brv+' resolve');if(i.md)L.push('+'+i.md+' melee def');if(i.rd)L.push('+'+i.rd+' ranged def');if(i.init)L.push('+'+i.init+' initiative');L.push(i.fat?'−'+i.fat+' fatigue':'no weight');return L.join(', ')}
 if(i.k==='w')return`${i.d[0]}–${i.d[1]} dmg, ${i.ap} AP${i.rng>1?(isRangedW(i)?', range ':', reach ')+i.rng:''}${i.two?', two-handed':''}${i.reload?', reload '+i.reload.ap+' AP':''}${i.barrels>1?', '+i.barrels+' barrels':''}${i.ammo?', '+i.ammo+' throws':''}${i.brace?', braced (−'+i.brace+' to hit after moving)':''}${i.crush>0?', crushes armor (+'+Math.round(i.crush*100)+'%)':i.crush<0?', glances off armor (−'+Math.round(-i.crush*100)+'%)':''}${i.ign>=.5?', '+Math.round(i.ign*100)+'% through armor':''}${i.spell?', +'+Math.round(i.spell*100)+'% spell dmg':''}`;
 if(i.k==='s')return`+${i.md} melee def, +${i.rd} ranged def, ${i.hp} shield hp, −${i.fat} fatigue${i.wallB?', shield wall +'+i.wallB:''}${i.guard?', covers allies beside it (−'+i.guard+' to be shot)':''}${i.spike?', spiked bash '+i.spike[0]+'–'+i.spike[1]:''}`;
 const cl=typeof armorPieceClass==='function'?armorPieceClass(id):null;return`${cl?cl[0].toUpperCase()+cl.slice(1)+' · ':''}${i.arm} ${i.k==='h'?'head ':''}armor${typeof armorMit==='function'&&i.arm>0?' (turns '+Math.round(armorMit(null,i.arm,0)*100)+'% aside)':''}, −${i.fat} fatigue`}
const AB={
 shove:{n:'Shove',ap:3,fat:10,rng:1,tgt:'enemy',noDmg:1,kb:1,hit:20,d:'Push a foe back 1 tile.'},
 aimed:{n:'Aimed shot',ap:6,fat:14,tgt:'enemy',wpn:1,needs:'bow',hit:25,mult:1.3},
 pin:{n:'Pinning shot',ap:5,fat:14,tgt:'enemy',wpn:1,needs:'bow',mult:.7,status:{root:1}},
 footwork:{n:'Footwork',ap:3,fat:8,rng:1,tgt:'move'},
 adren:{n:'Adrenaline',ap:0,fat:20,tgt:'self',gainAP:4,once:1},
 indom:{n:'Indomitable',ap:4,fat:15,tgt:'self',buff:{dr:.5,indom:1},dur:2},
 bolt:{n:'Arcane bolt',ap:4,fat:6,cost:['mana',8],rng:5,tgt:'enemy',magic:[22,34],ign:.6},
 fireball:{n:'Fireball',ap:6,fat:10,cost:['mana',15],rng:5,tgt:'enemy',magic:[20,32],ign:.5,aoe:1,status:{burn:2}},
 blink:{n:'Blink',ap:3,fat:4,cost:['mana',10],rng:4,tgt:'move',leap:1},
 chain:{n:'Chain lightning',ap:6,fat:12,cost:['mana',18],rng:5,tgt:'enemy',magic:[26,40],ign:.6,chain:2},
 astrike:{n:'Aura strike',fat:12,cost:['aura',8],tgt:'enemy',wpn:1,mult:1.5,hit:10},
 awave:{n:'Aura wave',ap:5,fat:12,cost:['aura',12],rng:3,tgt:'enemy',wpn:1,mult:1},
 crush:{n:'Crushing blow',fat:16,cost:['aura',14],tgt:'enemy',wpn:1,mult:1.2,kb:2,status:{stun:1}},
 adash:{n:'Aura dash',ap:5,fat:14,cost:['aura',12],rng:4,tgt:'enemy',wpn:1,mult:1.2,dash:1},
 flame:{n:'Flame edge',fat:12,cost:['qi',8],tgt:'enemy',wpn:1,mult:1.1,status:{burn:3}},
 frost:{n:'Frost edge',fat:12,cost:['qi',8],tgt:'enemy',wpn:1,mult:1.1,status:{chill:1}},
 gale:{n:'Gale step',ap:2,fat:6,cost:['qi',6],rng:3,tgt:'move',leap:1},
 thunder:{n:'Thunder cleave',ap:6,fat:18,cost:['qi',16],tgt:'aoe',wpn:1,mult:1,ignB:.2},
 reinforce:{n:'Reinforce',ap:3,fat:6,cost:['chi',8],tgt:'self',buff:{md:15,rd:15,dr:.25},dur:2},
 mend:{n:'Mend',ap:4,fat:8,cost:['chi',10],rng:1,tgt:'ally',heal:[18,28]},
 empower:{n:'Empower',ap:3,fat:6,cost:['chi',10],rng:2,tgt:'ally',buff:{ms:12,rs:12,dmg:.2},dur:2},
 swift:{n:'Swift meridian',ap:2,fat:6,cost:['chi',14],rng:2,tgt:'ally',noSelf:1,giveAP:3}
};
/* ---- Phase 5 abilities: weapon skills (granted by ITEMS[id].sk), shield skills, withdraw ----
   Extra ability fields read by the rules: needs (weapon type), two (needs a two-hander), shield (needs an intact shield),
   needShieldT (target must carry a shield), split (damages the shield, cannot miss), sure (no hit roll), pierce (bypasses armor),
   bleed (turns of bleeding if the hit reaches hitpoints), head (added to the 25% head chance), melee (never counts as a shot),
   buff.key (a STATUS key: one such buff at a time), withdraw. fx is a hint for the presentation. */
Object.assign(AB,{
 slash:{n:'Slash',fat:12,tgt:'enemy',wpn:1,needs:'sword',mult:1.1,bleed:2,fx:'slash',d:'A drawing cut: +10% damage, and a wound that reaches flesh bleeds for 2 turns.'},
 riposte:{n:'Riposte',ap:4,fat:14,tgt:'self',needs:'sword',buff:{key:'riposte',rip:1},dur:1,fx:'guard',d:'Until your next turn, strike back at every foe whose melee attack misses you.'},
 split:{n:'Split shield',fat:14,tgt:'enemy',wpn:1,needs:'axe',split:1,sure:1,needShieldT:1,fx:'chop',d:'Hew at a shield instead of its bearer. Cannot miss; a shield with no hitpoints left is destroyed.'},
 round:{n:'Round swing',ap:6,fat:22,tgt:'aoe',wpn:1,needs:'axe',two:1,mult:.9,hit:-5,fx:'spin',d:'A full circle with the greataxe: strike every adjacent foe at 90% damage.'},
 stunblow:{n:'Stun blow',fat:18,tgt:'enemy',wpn:1,needs:'mace',mult:.6,head:25,status:{stun:1},fx:'bonk',d:'A blow to rattle the skull: 60% damage, likelier to land on the head, and the target loses its next turn.'},
 kthrow:{n:'Throw kunai',ap:4,fat:8,rng:3,tgt:'enemy',wpn:1,thrown:1,needs:'dagger',mult:.85,fx:'stab',d:'Throw a kunai at a foe up to 3 tiles away: 85% damage, aimed with ranged skill (a thrown shot: cover, the ranged lock and stray shots apply). The kunai rides on a cord and comes back to hand.'},
 puncture:{n:'Puncture',ap:4,fat:12,tgt:'enemy',wpn:1,needs:'dagger',mult:.6,hit:-10,pierce:1,fx:'stab',d:'Slip the blade through a gap: 60% damage straight to hitpoints, ignoring armor. Harder to land.'},
 thrust:{n:'Thrust',fat:10,tgt:'enemy',wpn:1,needs:'spear',mult:.85,hit:15,fx:'stab',d:'A careful lunge: +15 to hit for 85% damage.'},
 spearwall:{n:'Spear wall',ap:4,fat:18,tgt:'self',needs:'spear',buff:{key:'spearwall',sw:1},dur:1,fx:'guard',d:'Until your next turn, strike any foe that steps next to you; a hit stops it short. The wall drops once a foe gets through.'},
 impale:{n:'Impale',fat:20,tgt:'enemy',wpn:1,needs:'spear',two:1,mult:1.25,ignB:.15,hit:-5,fx:'stab',d:'Reach 2, over the heads of your own line. A committed thrust: +25% damage that bites through armor.'},
 quick:{n:'Quick shot',ap:3,fat:9,tgt:'enemy',wpn:1,needs:'bow',mult:.75,hit:-10,fx:'arrow',d:'A snap shot for 3 AP: 75% damage, −10 to hit.'},
 sweep:{n:'Sweep',ap:4,fat:14,tgt:'enemy',wpn:1,needs:'staff',mult:.7,kb:1,status:{daze:1},fx:'sweep',d:'Sweep a foe back 1 tile at 70% damage and leave it dazed.'},
 shieldwall:{n:'Shield wall',ap:4,fat:12,tgt:'self',shield:1,buff:{key:'shieldwall',md:15,rd:15},dur:1,fx:'guard',d:'Brace behind the shield: +15 melee and ranged defense until your next turn.'},
 bash:{n:'Shield bash',ap:4,fat:14,rng:1,tgt:'enemy',shield:1,noDmg:1,kb:1,hit:15,status:{daze:1},fx:'shove',d:'Slam a foe back 1 tile with the shield and leave it dazed. No damage.'},
 withdraw:{n:'Withdraw',ap:2,fat:0,tgt:'self',withdraw:1,fx:'flee',d:'Leave the battle alive. Only from your own edge of the field; a foe next to you strikes first.'}
});
AB.indom.buff.key='indom';AB.reinforce.buff.key='reinforce';AB.empower.buff.key='empower';AB.aimed.head=15;
/* ---- Statuses: everything a unit can carry. unitStatuses(u) lists the active ones as [{key,n,turns}]. ----
   good: 1 helps the bearer, 0 harms it. Turn counts in u.st[key]; timed buffs (shieldwall, riposte, ...) live in u.buffs with buff.key. */
const STATUS={
 burn:{n:'Burning',d:'Takes 8 damage at the start of each of its turns.',icon:'burn',good:0},
 chill:{n:'Chilled',d:'Loses 3 action points on its next turn.',icon:'chill',good:0},
 root:{n:'Rooted',d:'Cannot move on its next turn.',icon:'root',good:0},
 stun:{n:'Stunned',d:'Loses its next turn and is easier to hit.',icon:'stun',good:0},
 bleed:{n:'Bleeding',d:'Loses 6 hitpoints at the start of each of its turns, past any armor.',icon:'bleed',good:0},
 daze:{n:'Dazed',d:'−15 to hit on its next turn.',icon:'daze',good:0},
 webbed:{n:'Webbed',d:'Cannot move and is easier to hit until it tears free.',icon:'webbed',good:0},
 splitshield:{n:'Shield split',d:'Its shield is destroyed: no shield defense, no shield skills.',icon:'splitshield',good:0},
 shieldwall:{n:'Shield wall',d:'+15 melee and ranged defense until its next turn.',icon:'shieldwall',good:1},
 riposte:{n:'Riposte',d:'Strikes back at every melee attack that misses it.',icon:'riposte',good:1},
 spearwall:{n:'Spear wall',d:'Strikes any foe that steps next to it; a hit stops the foe short.',icon:'spearwall',good:1},
 rallied:{n:'Rallied',d:'Found its nerve again: +10 resolve for a while.',icon:'rallied',good:1},
 indom:{n:'Indomitable',d:'Takes half damage and cannot be knocked back.',icon:'indom',good:1},
 reinforce:{n:'Reinforced',d:'+15 melee and ranged defense, takes 25% less damage.',icon:'reinforce',good:1},
 empower:{n:'Empowered',d:'+12 melee and ranged skill, +20% damage.',icon:'empower',good:1},
 buff:{n:'Bolstered',d:'Under a helpful effect.',icon:'buff',good:1},
 // fatigue and the armor trees (shown by unitStatuses; turns = the size of the effect, not a duration)
 tired:{n:'Tired',d:'Fatigue past half its maximum: −1 to hit and −1 defense for every 5% more, up to −10 each at full exhaustion (the number shown).',icon:'st-winded',good:0},
 dance:{n:'Dancing',d:'Dancer: +5 melee and ranged defense for every attack that missed it since its last turn (up to +15).',icon:'buff',good:1},
 fleet:{n:'Fleet',d:'Moved on its turn: +10 ranged defense against shots until its next turn.',icon:'buff',good:1}
};
/* ---- Talent abilities ----
   Fields read by the rules beyond the ones above: hits (strike the target up to n times while it stands), through (after the
   strike, fly on along the line into up to n more foes for 75%), party (also affects every ally within n tiles: buff, heal,
   rally), rally (lift one step of morale, up to steady), cleanse (status keys removed from the healed ally), rest (fatigue shed),
   vsHurt (more damage against a foe below half health), noBow (not with a bow in hand), nostun (the weapon's stun never rides on it),
   noDmgTxt (the float of a no-damage hit), swapW (the weapon swap). fx is a hint for the presentation. */
Object.assign(AB,{
 swap:{n:'Swap weapons',ap:2,fat:0,tgt:'self',swapW:1,fx:'swap',d:'Exchange the weapon in hand for your other one (2 AP, no fatigue). A shield is raised with a one-handed weapon or none, slung on the back with a two-handed one.'},
 decap:{n:'Decapitate',fat:20,tgt:'enemy',wpn:1,mult:1,vsHurt:.6,head:25,noBow:1,fx:'chop',d:'A stroke at the neck: +60% damage against a foe below half health, +25% chance to hit the head.'},
 bastion:{n:'Bastion',ap:4,fat:18,tgt:'self',buff:{key:'bastion',md:20,rd:20,dr:.2,indom:1},dur:1,fx:'guard',d:'Until your next turn: +20 melee and ranged defense, take 20% less damage, cannot be knocked back.'},
 volley:{n:'Volley',ap:6,fat:20,tgt:'enemy',wpn:1,needs:'bow',mult:.8,aoe:1,fx:'volley',d:'Arrows on a foe and everyone beside it: 80% damage to the target, 70% of that to each foe next to it.'},
 tumble:{n:'Tumble',ap:3,fat:12,rng:3,tgt:'move',fx:'leap',d:'Roll up to 3 tiles to a free spot (no climbing more than 1 step), drawing no free attacks.'},
 lunge:{n:'Lunge',ap:5,fat:15,rng:2,tgt:'enemy',wpn:1,dash:1,hit:10,noBow:1,fx:'stab',d:'Close one tile and strike in one motion: reaches a foe 2 tiles away, +10 to hit.'},
 parry:{n:'Parry',ap:4,fat:16,tgt:'self',buff:{key:'parry',md:15,rip:1},dur:1,fx:'guard',d:'Until your next turn: +15 melee defense, and strike back at every foe whose melee attack misses you.'},
 flurry:{n:'Flurry',ap:6,fat:24,tgt:'enemy',wpn:1,mult:.8,hits:2,hit:5,noBow:1,fx:'multi',d:'Two quick strikes at 80% damage, +5 to hit each. The second follows only if the foe still stands.'},
 cleave:{n:'Cleave',ap:6,fat:22,tgt:'aoe',wpn:1,two:1,mult:.8,noBow:1,fx:'spin',d:'A two-handed sweep: strike every adjacent foe at 80% damage.'},
 earthsplit:{n:'Earthsplitter',ap:7,fat:28,tgt:'enemy',wpn:1,two:1,mult:1.6,ignB:.2,hit:-5,status:{stun:1},noBow:1,fx:'quake',d:'A colossal overhead blow with a two-handed weapon: 160% damage, +20% armor piercing, stuns. −5 to hit.'},
 slam:{n:'Shield slam',ap:5,fat:20,tgt:'enemy',wpn:1,shield:1,mult:.7,hit:5,status:{stun:1},noBow:1,fx:'shove',d:'Drive the shield rim into a foe: 70% weapon damage, +5 to hit, and it loses its next turn.'},
 phalanx:{n:'Phalanx',ap:4,fat:18,tgt:'self',shield:1,party:1,buff:{key:'phalanx',md:10,rd:10},dur:1,fx:'guard',d:'Lock shields: you and every ally next to you get +10 melee and ranged defense until your (their) next turn.'},
 rally:{n:'Rally',ap:5,fat:15,tgt:'self',party:3,rally:1,buff:{key:'rallied',brv:10},dur:2,fx:'rally',d:'You and allies within 3 tiles: shaken ones regain one step of morale (up to steady), all get +10 resolve for 2 turns. The fleeing do not hear it.'},
 command:{n:'Command',ap:4,fat:16,rng:4,tgt:'ally',noSelf:1,giveAP:3,fx:'rally',d:'Bark an order: an ally within 4 tiles gets +3 action points on its next turn.'},
 holdfast:{n:'Hold fast!',ap:5,fat:20,tgt:'self',party:2,buff:{key:'holdfast',md:10,rd:10,brv:15},dur:2,fx:'rally',d:'You and allies within 2 tiles: +10 melee and ranged defense and +15 resolve for 2 turns.'},
 secwind:{n:'Second wind',ap:3,fat:0,tgt:'self',rest:40,heal:[8,14],once:1,fx:'heal',d:'Once per battle: shed 40 fatigue and recover 8–14 hitpoints.'},
 bandage:{n:'Bandage',ap:4,fat:10,rng:1,tgt:'ally',heal:[10,16],cleanse:['bleed'],fx:'heal',d:'Bind a wound on yourself or an adjacent ally: heal 10–16 hitpoints and stop the bleeding.'},
 triage:{n:'Triage',ap:3,fat:10,rng:1,tgt:'ally',heal:[6,10],cleanse:['bleed','burn','poison','venom','daze','chill','root','weak'],fx:'heal',d:'Quick care for yourself or an adjacent ally: heal 6–10 hitpoints and clear bleeding, burning, poison and venom, daze, chill, roots and weakness.'},
 surge:{n:'Miracle',ap:6,fat:20,tgt:'self',party:2,heal:[14,22],once:1,fx:'heal',d:'Once per battle: you and every ally within 2 tiles heal 14–22 hitpoints.'},
 mark:{n:'Mark target',ap:2,fat:6,rng:7,tgt:'enemy',noDmg:1,sure:1,nostun:1,status:{marked:2},noDmgTxt:'Marked',fx:'mark',d:'Point out a foe within 7 tiles in sight: every attack against it gets +15 to hit until 2 of its turns have passed. Cannot miss.'},
 vanish:{n:'Vanish',ap:4,fat:16,rng:4,tgt:'move',leap:1,buff:{key:'evasive',md:15,rd:15},dur:1,fx:'leap',d:'Slip up to 4 tiles away over anything, drawing no free attacks: +15 melee and ranged defense until your next turn.'},
 rage:{n:'Rage',ap:2,fat:10,tgt:'self',buff:{key:'rage',dmg:.25,md:-10},dur:2,fx:'rage',d:'Work yourself into a fury: +25% damage, −10 melee defense for 2 turns.'},
 whirl:{n:'Whirlwind',ap:6,fat:26,tgt:'aoe',wpn:1,mult:1.1,noBow:1,fx:'spin',d:'Spin through every adjacent foe: 110% damage to each.'},
 headshot:{n:'Headshot',ap:6,fat:16,tgt:'enemy',wpn:1,needs:'bow',head:40,hit:-5,fx:'arrow',d:'Aim for the eyes: +40% chance to hit the head (x1.5 to hitpoints there), −5 to hit.'},
 pshot:{n:'Through and through',ap:7,fat:26,tgt:'enemy',wpn:1,needs:'bow',mult:1.2,ignB:.2,through:2,fx:'pierce',d:'A shot that does not stop: 120% damage with +20% armor piercing, then on into up to 2 more foes in the line behind for 75% of that.'},
 kick:{n:'Kick',ap:3,fat:12,rng:1,tgt:'enemy',noDmg:1,nostun:1,kb:1,hit:10,status:{daze:1},noDmgTxt:'Kicked',fx:'shove',d:'Boot a foe back 1 tile and daze it (−15 to hit on its next turn). No damage, +10 to hit.'},
 headbutt:{n:'Headbutt',ap:4,fat:18,rng:1,tgt:'enemy',noDmg:1,nostun:1,hit:-10,status:{stun:1},noDmgTxt:'Headbutt',fx:'bonk',d:'Crack your skull into the foe’s: it loses its next turn. No damage, −10 to hit.'},
 grapple:{n:'Grapple',ap:4,fat:16,rng:1,tgt:'enemy',noDmg:1,nostun:1,hit:5,status:{root:2,marked:1},noDmgTxt:'Grappled',fx:'shove',d:'Seize a foe: it cannot move for 2 turns and is marked (+15 to hit it) until its next turn. No damage, +5 to hit.'},
 haymaker:{n:'Haymaker',ap:6,fat:24,tgt:'enemy',wpn:1,mult:1.5,kb:2,hit:-10,status:{daze:1},noBow:1,fx:'bonk',d:'Everything behind one swing: 150% damage, knocks the foe back 2 tiles and dazes it. −10 to hit.'},
 starfall:{n:'Starfall',ap:6,fat:14,cost:['mana',26],rng:6,tgt:'enemy',magic:[34,52],ign:.7,aoe:1,status:{daze:1},fx:'arcane',d:'Call down a falling star within 6 tiles: 34–52 magic damage (70% through armor), 70% of it to every foe beside the target, all dazed.'},
 runeedge:{n:'Runic edge',fat:10,cost:['mana',8],tgt:'enemy',wpn:1,mult:1,ignB:.25,hit:5,fx:'arcane',d:'Etch a rune of cutting on the weapon: a strike with +25% armor piercing and +5 to hit.'},
 manashield:{n:'Mana shield',ap:3,fat:6,cost:['mana',10],tgt:'self',buff:{key:'manashield',dr:.3},dur:2,fx:'arcane',d:'A skin of raw mana: take 30% less damage for 2 turns.'},
 blinkstrike:{n:'Blink strike',ap:5,fat:14,cost:['mana',12],rng:4,tgt:'enemy',wpn:1,mult:1.1,dash:1,noBow:1,fx:'arcane',d:'Vanish and reappear beside a foe up to 4 tiles away, striking for 110%.'},
 overload:{n:'Runic overload',ap:6,fat:20,cost:['mana',20],tgt:'enemy',wpn:1,mult:1.6,ignB:.3,chain:1,status:{daze:1},noBow:1,fx:'storm',d:'Pour every rune into one blow: 160% damage, +30% armor piercing, dazes; the discharge arcs to one more foe within 3 tiles for 60%.'},
 seeker:{n:'Seeker arrow',fat:10,cost:['mana',8],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:.85,sure:1,fx:'arcane',d:'A mana-guided shaft that bends to its mark: cannot miss, 85% damage.'},
 avolley:{n:'Arcane volley',ap:6,fat:16,cost:['mana',14],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:.9,aoe:1,fx:'arcane',d:'A shot that bursts into motes: 90% damage to the target, 70% of that to every foe beside it.'},
 bindshot:{n:'Binding rune',ap:5,fat:12,cost:['mana',10],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:.6,status:{root:2,marked:2},fx:'arcane',d:'An arrow carrying a rune of binding: 60% damage; the target cannot move for 2 turns and is marked (+15 to hit it) for 2.'},
 starpierce:{n:'Starpiercer',ap:7,fat:22,cost:['mana',24],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:1.3,ignB:.3,through:3,fx:'pierce',d:'A lance of light down the line of fire: 130% damage, +30% armor piercing, then on through up to 3 more foes behind for 75%.'},
 avatar:{n:'Avatar of war',ap:3,fat:14,cost:['aura',24],tgt:'self',buff:{key:'avatar',dmg:.3,ms:10,md:10},dur:2,fx:'aura',d:'Blaze with Aura: +30% damage, +10 melee skill and +10 melee defense for 2 turns.'},
 aarrow:{n:'Aura arrow',fat:12,cost:['aura',8],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:1.4,hit:5,fx:'aura',d:'Wreathe the arrow in Aura: 140% damage, +5 to hit.'},
 pvolley:{n:'Piercing volley',ap:6,fat:16,cost:['aura',12],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:1,through:2,fx:'pierce',d:'An Aura-driven shot that punches through: full damage to the target, then up to 2 more foes in the line behind take 75%.'},
 carrow:{n:'Concussive arrow',fat:14,cost:['aura',14],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:1.1,kb:1,status:{daze:1},fx:'aura',d:'An arrow that hits like a ram: 110% damage, knocks the target back 1 tile and dazes it.'},
 sunarrow:{n:'Sunburst arrow',ap:7,fat:22,cost:['aura',26],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:1.7,ignB:.3,aoe:1,fx:'aura',d:'The arrow bursts in golden light: 170% damage, +30% armor piercing, 70% of that to every foe beside the target.'},
 dragon:{n:'Storm dragon',ap:6,fat:22,cost:['qi',24],tgt:'enemy',wpn:1,mult:1.5,chain:2,status:{burn:2,chill:1},noBow:1,fx:'storm',d:'A blow that uncoils into a dragon of fire and frost: 150% damage, burns for 2 turns and chills, then leaps to 2 more foes within 3 tiles for 60%.'},
 farrow:{n:'Fire arrow',fat:10,cost:['qi',8],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:1,status:{burn:3},fx:'flame',d:'A burning shaft: full damage, and the target burns for 3 turns (8 damage each).'},
 iarrow:{n:'Frost arrow',fat:10,cost:['qi',8],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:1,status:{chill:1},fx:'frost',d:'An ice-tipped shaft: full damage, and the target loses 3 action points on its next turn.'},
 tarrow:{n:'Thunder arrow',ap:6,fat:16,cost:['qi',16],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:1.1,chain:2,status:{daze:1},fx:'storm',d:'Lightning rides the arrow: 110% damage, dazes, and arcs to 2 more foes within 3 tiles for 60%.'},
 tempest:{n:'Tempest volley',ap:7,fat:22,cost:['qi',24],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:1.2,aoe:1,status:{burn:2,chill:1},fx:'storm',d:'A storm of elemental arrows: 120% damage, 70% of that to every foe beside the target; all of them burn for 2 turns and are chilled.'},
 lotus:{n:'Lotus circle',ap:5,fat:14,cost:['chi',24],tgt:'self',party:2,heal:[12,20],fx:'heal',d:'Chi blooms outward: you and every ally within 2 tiles heal 12–20 hitpoints.'},
 palm:{n:'Chi palm',fat:12,cost:['chi',8],tgt:'enemy',wpn:1,mult:1.2,kb:1,noBow:1,fx:'chi',d:'A strike that bursts with Chi: 120% damage and the foe is knocked back 1 tile.'},
 hundred:{n:'Hundred hands',ap:6,fat:18,cost:['chi',14],tgt:'enemy',wpn:1,mult:.55,hits:3,hit:5,noBow:1,fx:'multi',d:'Three blurred blows at 55% damage, +5 to hit each, while the foe stands.'},
 shatter:{n:'Shattering palm',ap:6,fat:22,cost:['chi',24],tgt:'enemy',wpn:1,mult:1.8,ignB:.5,status:{stun:1},noBow:1,fx:'chi',d:'Chi driven straight through armor: 180% damage, +50% armor piercing, and the foe loses its next turn.'},
 breath:{n:'Steady breathing',ap:2,fat:4,cost:['chi',8],tgt:'self',buff:{key:'steady',rs:15},dur:2,fx:'chi',d:'Slow the heart between shots: +15 ranged skill for 2 turns.'},
 pparrow:{n:'Pressure-point arrow',fat:12,cost:['chi',10],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:.8,status:{daze:1,weak:2},fx:'chi',d:'A shot to a nerve cluster: 80% damage; the target is dazed and weakened (−25% damage dealt) for 2 turns.'},
 spiritarrow:{n:'Spirit arrow',ap:6,fat:18,cost:['chi',22],tgt:'enemy',wpn:1,needs:['bow','crossbow'],mult:1,pierce:1,hit:10,fx:'chi',d:'An arrow of pure Chi that ignores armor: full damage straight to hitpoints, +10 to hit.'},
 /* the throwing gifts (mana_t aura_t qi_t chi_t): weapon throws (needs 'throwing'); each spends a throw through the ammo path (pvPay),
    except conj:1 (a conjured blade: no throw spent, usable with none left: outOfThrows / pvPay in 60p-passives.js) */
 conjure:{n:'Conjured blade',fat:8,cost:['mana',8],tgt:'enemy',wpn:1,needs:'throwing',mult:.9,hit:10,conj:1,status:{marked:2},fx:'arcane',d:'Throw a blade of mana conjured in the hand: 90% damage, +10 to hit, and a hit marks the foe for 2 turns (every attack on it +15 to hit). It spends no throw and works with none left.'},
 swarm:{n:'Blade swarm',ap:6,fat:18,cost:['mana',22],tgt:'enemy',wpn:1,needs:'throwing',mult:.75,hit:5,hits:3,conj:1,fx:'arcane',d:'Three conjured blades at one foe: 75% damage each, +5 to hit; each flies only while the foe stands. It spends no throw.'},
 ahurl:{n:'Aura hurl',fat:14,cost:['aura',8],tgt:'enemy',wpn:1,needs:'throwing',mult:1.3,kb:1,fx:'aura',d:'A throw charged with Aura: 130% damage, and the foe is knocked back 1 tile.'},
 comet:{n:'Comet hurl',ap:7,fat:24,cost:['aura',26],tgt:'enemy',wpn:1,needs:'throwing',mult:1.7,crushB:.3,kb:1,aoe:1,fx:'aura',d:'The throw lands like a falling star: 170% damage, +30% armor crushing, the foe knocked back 1 tile; then every foe beside it where it lands takes 70% and is knocked back too.'},
 tstar:{n:'Thunder star',fat:12,cost:['qi',8],tgt:'enemy',wpn:1,needs:'throwing',mult:1,chain:1,fx:'storm',d:'A throw crackling with thunder: full damage, then the lightning leaps to 1 more foe within 3 tiles for 60% (the leap cannot miss).'},
 balllight:{n:'Ball lightning',ap:7,fat:22,cost:['qi',24],tgt:'enemy',wpn:1,needs:'throwing',mult:1.3,chain:3,status:{daze:1},fx:'storm',d:'A throw wrapped in lightning: 130% damage and dazes; then it leaps on to 3 more foes within 3 tiles for 60%, dazing each (the leaps cannot miss).'},
 vthrow:{n:'Vital throw',fat:10,cost:['chi',8],tgt:'enemy',wpn:1,needs:'throwing',mult:1,head:15,bleed:3,fx:'chi',d:'A calm throw at a vital point: full damage, +15% head chance, and a hit that reaches hitpoints bleeds the foe for 3 turns.'},
 sever:{n:'Severing throw',ap:6,fat:20,cost:['chi',22],tgt:'enemy',wpn:1,needs:'throwing',mult:1.4,ignB:.4,hit:10,bleed:3,status:{hobbled:1},fx:'chi',d:'A throw at the sinews: 140% damage, +40% armor piercing, +10 to hit; the foe is hobbled (−2 AP at the start of its next turn), and bleeds for 3 turns if it reaches hitpoints.'},
 masterstroke:{n:'Masterstroke',ap:6,fat:20,tgt:'enemy',wpn:1,needs:'sword',mult:1.5,hit:15,fx:'slash',d:'The cut every master teaches last: 150% damage, +15 to hit.'},
 staffquake:{n:'Ringing staff',ap:6,fat:20,tgt:'aoe',wpn:1,needs:'staff',mult:.9,status:{daze:1},fx:'quake',d:'Strike the ground and every adjacent foe: 90% damage to each, all dazed.'},
});
/* ---- Arms update abilities: weapon skills of the new families, shield skills (and abilities fabled warriors and eastern foes carry) ----
   Fields read by the rules beyond the ones above: reloadW (the reload: AP and fatigue come from the weapon in hand's reload),
   crushB (added to the weapon's armor crushing), pull (drag the target that many tiles toward the attacker), scare (a hit tests the
   target's morale), spikeD (the damage roll is the raised shield's spike, not the weapon), ignW (armor piercing of that roll). */
Object.assign(AB,{
 reload:{n:'Reload',ap:4,fat:10,tgt:'self',reloadW:1,fx:'reload',d:'Load the crossbow or firearm in hand so it can fire again. AP and fatigue come from the weapon. Allowed with a foe next to you.'},
 batter:{n:'Batter',fat:15,tgt:'enemy',wpn:1,needs:'hammer',mult:.75,crushB:1,fx:'bonk',d:'A blow at the plate, not the man: 75% damage, but it tears up 100% more armor.'},
 hsmash:{n:'Overhead smash',ap:6,fat:22,tgt:'enemy',wpn:1,needs:'hammer',two:1,mult:1.25,crushB:.25,hit:-10,status:{daze:1},fx:'quake',d:'The maul comes down with both hands: 125% damage that crushes armor 25% harder and dazes. −10 to hit.'},
 hook:{n:'Hook',fat:15,tgt:'enemy',wpn:1,needs:'polearm',mult:.5,pull:1,hit:5,fx:'hook',d:'Catch a foe with the hook and drag it 1 tile toward you: 50% damage, +5 to hit.'},
 reap:{n:'Reap',ap:6,fat:22,tgt:'enemy',wpn:1,needs:'polearm',mult:.85,aoe:1,hit:-5,fx:'sweep',d:'A wide sweep at reach: 85% damage to the target and 70% of that to every foe beside it. −5 to hit.'},
 halfsword:{n:'Half-sword',ap:4,fat:14,rng:1,tgt:'enemy',wpn:1,needs:'greatsword',mult:.8,hit:15,ignB:.25,fx:'stab',d:'Grip the blade and drive the point through a gap at a foe right beside you: 4 AP, 80% damage, +15 to hit, +25% armor piercing.'},
 gswing:{n:'Great swing',fat:22,tgt:'enemy',wpn:1,needs:'greatsword',mult:1.3,hit:-10,kb:1,fx:'slash',d:'A full-body swing: 130% damage and the foe is knocked back 1 tile. −10 to hit.'},
 xaim:{n:'Braced shot',ap:6,fat:12,tgt:'enemy',wpn:1,needs:'crossbow',mult:1.1,hit:20,head:10,fx:'bolt',d:'Brace the crossbow and take your time: 6 AP, +20 to hit, 110% damage, +10% head chance.'},
 blast:{n:'Scattershot',fat:14,tgt:'enemy',wpn:1,needs:'flintlock',mult:.55,aoe:1,hit:10,fx:'smoke',d:'A charge of shot instead of a ball: 55% damage to the target and 70% of that to every foe beside it, +10 to hit.'},
 spikebash:{n:'Spiked bash',ap:4,fat:14,rng:1,tgt:'enemy',shield:1,spikeD:1,ignW:.3,melee:1,nostun:1,mult:1,hit:10,kb:1,fx:'shove',d:'Ram the spiked boss into a foe: the shield’s spike damage (30% through armor), knocks it back 1 tile, +10 to hit.'},
 trip:{n:'Trip',fat:14,tgt:'enemy',wpn:1,needs:'polearm',mult:.6,hit:5,status:{root:1,daze:1},fx:'hook',d:'Hook the legs out from under a foe: 60% damage, it cannot move on its next turn and is dazed. +5 to hit.'},
 xheart:{n:'Heartseeker',ap:6,fat:18,tgt:'enemy',wpn:1,needs:'crossbow',mult:1.5,hit:10,head:15,fx:'bolt',d:'A bolt for the heart: 6 AP, 150% damage, +10 to hit, +15% head chance.'},
 fexecute:{n:'Execution',fat:18,tgt:'enemy',wpn:1,needs:'flintlock',mult:1.25,vsHurt:.5,ignB:.15,fx:'smoke',d:'A slow, sure shot: 125% damage, +15% armor piercing, a further +50% against a foe below half health.'}
});
// Descriptions of the older abilities (they used to borrow the perk text).
{const D={shove:'Push an adjacent foe back 1 tile. No damage, +20 to hit.',aimed:'A slow, careful shot: +25 to hit, 130% damage, +15% head chance.',pin:'70% damage, and the target cannot move on its next turn.',
 footwork:'Step 1 tile without drawing free attacks.',adren:'Gain 4 action points. Once per battle.',indom:'Take half damage and ignore knockback for 2 turns.',
 bolt:'A bolt of force at up to 5 tiles: 22–34 magic damage, 60% through armor.',fireball:'A blast at up to 5 tiles: 20–32 magic damage, 70% of it to every foe beside the target, all set burning for 2 turns.',
 blink:'Teleport up to 4 tiles.',chain:'Lightning at up to 5 tiles: 26–40 magic damage, arcing to 2 more foes within 3 tiles for 60%.',
 astrike:'A weapon strike charged with Aura: 150% damage, +10 to hit.',awave:'Send a weapon strike up to 3 tiles away.',crush:'120% damage, knocks the foe back 2 tiles and stuns it.',
 adash:'Rush a foe up to 4 tiles away and strike it for 120%.',flame:'110% damage, and the foe burns for 3 turns (8 damage each).',frost:'110% damage, and the foe loses 3 action points on its next turn.',
 gale:'Leap up to 3 tiles over anything.',thunder:'Strike every adjacent foe, +20% armor piercing.',reinforce:'+15 melee and ranged defense and 25% less damage for 2 turns.',
 mend:'Heal yourself or an adjacent ally 18–28 hitpoints.',empower:'An ally within 2 tiles gets +12 melee and ranged skill and +20% damage for 2 turns.',swift:'Grant an ally within 2 tiles 3 action points on its next turn.'};
 for(const id in D)if(AB[id])AB[id].d=D[id]}
Object.assign(STATUS,{
 marked:{n:'Marked',d:'Every attack against it gets +15 to hit. Wears off as its turns pass.',icon:'marked',good:0},
 weak:{n:'Weakened',d:'Deals 25% less damage. Wears off as its turns pass.',icon:'weak',good:0},
 slung:{n:'Shield slung',d:'Its shield hangs on its back while a two-handed weapon is in hand: no shield defense, no shield skills, cannot be split.',icon:'slung',good:0},
 undying:{n:'Undying',d:'Survived a killing blow at 1 hitpoint (once per battle).',icon:'undying',good:1},
 lucky:{n:'Lucky',d:'Luck held: survived a killing blow at 1 hitpoint (the Lucky trait, once per battle).',icon:'undying',good:1},
 bastion:{n:'Bastion',d:'+20 melee and ranged defense, takes 20% less damage, cannot be knocked back.',icon:'bastion',good:1},
 parry:{n:'Parry',d:'+15 melee defense; strikes back at every melee attack that misses it.',icon:'riposte',good:1},
 phalanx:{n:'Phalanx',d:'+10 melee and ranged defense.',icon:'shieldwall',good:1},
 holdfast:{n:'Hold fast',d:'+10 melee and ranged defense, +15 resolve.',icon:'rallied',good:1},
 evasive:{n:'Evasive',d:'+15 melee and ranged defense.',icon:'evasive',good:1},
 rage:{n:'Raging',d:'+25% damage, −10 melee defense.',icon:'rage',good:1},
 manashield:{n:'Mana shield',d:'Takes 30% less damage.',icon:'manashield',good:1},
 avatar:{n:'Avatar of war',d:'+30% damage, +10 melee skill, +10 melee defense.',icon:'avatar',good:1},
 steady:{n:'Steady breathing',d:'+15 ranged skill.',icon:'steady',good:1},
 unloaded:{n:'Unloaded',d:'The crossbow or firearm in hand is spent: it must be reloaded before it can fire again.',icon:'unloaded',good:0}
});
/* ---- Morale: u.mor 0..4. hit is added to the unit's own chance to hit, def to its defense against every attack. ---- */
const MORN=['Fleeing','Breaking','Wavering','Steady','Confident'],
 MORFX=[{hit:-30,def:-20},{hit:-20,def:-10},{hit:-10,def:-5},{hit:0,def:0},{hit:10,def:5}];
/* ---- Combat constants ---- */
const HEADCH=25,HEADMULT=1.5,COVERPEN=15,FFCH=.3,FFDMG=.75,HEAVYHIT=.25,INJCH=.5,DOWNCH=.3,PERMCH=.3,TOOLPTS=15,TOOLPRICE=3,BLEEDDMG=6;
/* ---- Injuries: m.inj=[{id,days}], days left (-1 = permanent). loc 'h' comes from head hits, 'b' from body hits.
   st is added to the merc's stats in calc(m) (dmg is a fraction of damage dealt); days is the healing time rolled for a fresh one. ---- */
const INJ={
 cutarm:{n:'Cut arm',loc:'b',days:[3,5],st:{ms:-6,rs:-6},d:'A long slice down the forearm. Every swing pulls the stitches.'},
 bruisedleg:{n:'Bruised leg',loc:'b',days:[3,4],st:{init:-15,md:-3},d:'The thigh has gone black and stiff. Slow off the mark.'},
 brokenribs:{n:'Broken ribs',loc:'b',days:[6,9],st:{fat:-20,hp:-8},d:'Two ribs at least. Breathing hurts, laughing is out of the question.'},
 piercedlung:{n:'Pierced lung',loc:'b',days:[7,10],st:{fat:-35},d:'A wet rattle with every breath. Winded after a dozen steps.'},
 sprainedwrist:{n:'Sprained wrist',loc:'b',days:[3,5],st:{ms:-8},d:'The weapon hand is swollen to twice its size.'},
 tornshoulder:{n:'Torn shoulder',loc:'b',days:[5,8],st:{ms:-5,md:-6},d:'The arm will not lift above the chest. Parrying is guesswork.'},
 deepgash:{n:'Deep gash',loc:'b',days:[5,7],st:{hp:-12},d:'Bound tight and still seeping through the linen.'},
 brokenhand:{n:'Broken hand',loc:'b',days:[7,10],st:{ms:-12,dmg:-.1},d:'Splinted fingers make a poor grip. Blows land soft.'},
 piercedthigh:{n:'Pierced thigh',loc:'b',days:[5,8],st:{init:-25,md:-5},d:'A hole clean through the meat of the leg. Walks like an old man.'},
 bruisedkidney:{n:'Bruised kidney',loc:'b',days:[4,6],st:{fat:-15,hp:-5},d:'Took the blow low in the back. Pisses red and tires fast.'},
 concussion:{n:'Concussion',loc:'h',days:[4,6],st:{ms:-8,rs:-12,init:-10},d:'The world tilts and the names of friends come slowly.'},
 brokennose:{n:'Broken nose',loc:'h',days:[3,5],st:{rs:-6,brv:-4},d:'Eyes streaming, breath whistling. Hard to sight down a shaft.'},
 gashedbrow:{n:'Gashed brow',loc:'h',days:[3,4],st:{rs:-10,rd:-4},d:'Blood keeps running into one eye.'},
 crackedjaw:{n:'Cracked jaw',loc:'h',days:[5,7],st:{brv:-8,fat:-8},d:'Bound shut with a strap. Lives on broth and cannot shout a warning.'},
 ringingears:{n:'Ringing ears',loc:'h',days:[2,4],st:{init:-12,brv:-5},d:'A bell that will not stop. Orders arrive late or not at all.'},
 fracturedskull:{n:'Fractured skull',loc:'h',days:[8,12],st:{ms:-10,rs:-10,md:-5,brv:-5},d:'A dent you could rest a thumb in. Lucky to be walking.'},
 missingeye:{n:'Missing eye',perm:1,loc:'h',st:{rs:-20,rd:-5},d:'An empty socket under a patch. Distances are a matter of opinion now.'},
 missingear:{n:'Missing ear',perm:1,loc:'h',st:{init:-8,brv:-3},d:'Sheared off clean. Hears half of everything.'},
 scarredface:{n:'Scarred face',perm:1,loc:'h',st:{hp:-4,brv:4},d:'A ruin from brow to chin. Children cry; so do some brigands.'},
 addled:{n:'Addled wits',perm:1,loc:'h',st:{ms:-6,rs:-6,init:-10},d:'Never quite came back from that blow. Stares at fires.'},
 maimedhand:{n:'Maimed hand',perm:1,loc:'b',st:{ms:-10,dmg:-.1},d:'Two fingers and half the palm gone. The grip will never be the same.'},
 lameleg:{n:'Lame leg',perm:1,loc:'b',st:{init:-25,md:-4},d:'The bone set crooked. A limp for life.'},
 badback:{n:'Bad back',perm:1,loc:'b',st:{fat:-25},d:'Something in the spine healed wrong. Armor weighs double.'},
 collapsedlung:{n:'Collapsed lung',perm:1,loc:'b',st:{fat:-30,hp:-5},d:'One lung does the work of two, badly.'},
 shatteredknee:{n:'Shattered knee',perm:1,loc:'b',st:{init:-20,md:-8},d:'The knee bends two ways now, neither of them useful.'}
};
/* ---- Talents: trees and perks (the rules live in 61-talents.js, 30-mercs.js and 60-battle-core.js) ----
   MAST[key] = {n, d, kind, res?, style?, wt?, aff, tiers:[[perk,...], ...]} with kind
     'style'  mundane combat craft, 6 tiers of one perk; a merc carries 4 drawn from BG[bg].pool
     'gift'   a resource tree (res: mana aura qi chi) in a fighting style (style: melee ranged caster support), 6 tiers;
              the first perk learned in it awakens the gift: a pool of GIFTBASE (regen GIFTREGEN a turn) plus the perks' res/regen
     'weapon' the one Weapon mastery tree (MAST.weapons): a single tier of one perk per weapon family (perk.wt); each works only
              while a weapon of that family is in hand (wt 'shield': only while a shield is raised); a merc may learn only the
              families its background allows (weaponTypes in 61-talents.js)
     'armor'  lightarmor medarmor heavyarmor, one perk a tier (BG[bg].at decides which a merc has)
     'hunter' MAST.hunter, 9 tiers of one quarry perk: one of the 4 trees a recruit draws (BG[bg].hw: its chance; rollTrees)
   Tier t of a style or gift tree opens at level t, the weapon tier at level 3, armor tier t at 3t-1 (tierLevel). No same-tree prerequisites.
   aff: what the tree suits (melee ranged caster support one two shield bow light), read by autoLearn.
   Perk: {id, n, d, st?:{stat deltas, dmg as a fraction, ap = action points}, ab?:AB id, flag?:string, mod?:{flag:number},
          res?:number, regen?:number, wt?:weapon family (weapon mastery perks),
          wmod?:{d:[+min,+max], ap, fat (attack and weapon-skill fatigue), rng, ign, hit, stun, spell, crush, rld (reload AP), rfat (reload fatigue)} (changes the weapon in hand)}
   Ids are '<tree>.<tier>' (one perk in the tier) or '<tree>.<tier>a' / 'b'. d states the exact effect.
   The flags and mods the rules read (u.flags / calc(m).flags; mods add up):
     exec berserk forged path eagle (as before)   vsHurt vsFull dmgMelee dmgRanged twoDmg lowHpDmg duelHit duelDmg flankDmg spellB splitB
     drB drRanged drMelee lastStand   adjDef loneDef guard cmd flank coverIgn longShot rngB headB ignB bleedOn
     regenHP medAura killHeal killRes brvAura healB freeSwap noLock undying   shieldDef shieldHp (calc only)
     arms update: vsArm (damage while the target's body armor holds), reachHit (to hit a foe 2 tiles away with a reach weapon),
     deflect (less damage from shots and spells while a shield is raised), shieldDr (less damage while a shield is raised), shGuard (Cover from a tower shield)
     armor trees (kind 'armor', aw light/medium/heavy, tiers at levels 2/5/8 (11); idle unless armorClass(m) matches aw):
     nimble fleet sidestep slip freshDef dance initDef | brace armRegen roll footing layerDef padIgn | kbImm ironLung unbowed steelWall hpSoak noStun
     armor mitigation (any tree): mitK (the armor counts that much more on the mitigation curve), mitCap (the curve's ceiling rises by that much); see MIT in 60-battle-core.js
     (initDef: that share of the initiative, rounded down, is added to melee and ranged defense by calc())
     the rogues' trees (assassin rogue shadow): stabDmg stabHit wakeDmg lightBleed lightPoison lightFingers dirtyDmg dirtyHit quickstep flow readInit firstHit firstDmg
     (light-weapon terms read isLightW; aff 'lightw' = a light weapon in hand, read by autoLearn)
     the roles update (rules: 64v-roles.js, 60p-passives.js; every tree has role: one line, its battlefield role, shown on the talent screen):
     chargeHit chargeDmg shock shakenHit shakenDmg killFear | holdDef holdMit armDmg | shelter intercept | isoHit isoDmg duelDef | mvDef |
     twoIgn twoCrush sweep twoDaze | hurtDmg | mvShot suppress bowDmg | holdHit holdHead | primeHit primeDmg | mixHit mixDmg | ordersAP |
     healLow | shrug | spotMark | arrowBurn | zocHit (weapon mastery: free attacks with a spear) ; aff 'heavy' = heavy armor worn
     the gun trees update (rules: 64u-guntrees.js): rollV volleyB lineMax (Musketry) | runHit runDmg paceHit paceDmg braceP pbR (Pistolier; gunPB /
     gunPBHit count only with a pistol) | blastDmg blastFear blastBurn bombN blastIgn (Grenadier) | smokeMel killLoad (the Gunsmoke Saint); aff 'longgun' /
     'pistol' = a two-handed / one-handed firearm in hand, 'bomb' = the Grenadier's bombs (any weapon)
     the fists update (rules: 64x-fists.js; with fists in hand: bare or a fist weapon): wrFat wrKb wrGrind wrSmother wrBreak (Wrestler) | pgAP pgFat pgRec
     pgDouble pgFlurry pgKill (Pugilist) | wlDef wlBare wlStep wlSlip wlDr wlAP wlKick (Willow style: in light armor too); aff 'fist' = fists in hand */
const GIFTBASE=30,GIFTREGEN=4,TALSTYLE=['melee','ranged','caster','support'],
 WTS=['sword','axe','mace','hammer','dagger','spear','polearm','greatsword','bow','crossbow','flintlock','throwing','staff','fist','shield'];   // weapon families in display order (the weapon mastery perks; 'shield': a raised shield)
const perkDef=(n,d,o)=>Object.assign({n,d},o||{});
const MAST={
 /* ---- style trees ---- */
 vanguard:{n:'Vanguard',kind:'style',aff:['melee'],d:'Front-line killing craft',role:'The breaker: closes in, hits first and hard, and shatters the enemy line\'s nerve',tiers:[
  [perkDef('Charge','Your first melee attack each turn after you have moved that turn: +10 to hit and +15% damage',{mod:{chargeHit:10,chargeDmg:.15}})],[perkDef('Press the attack','+8 to hit and +10% damage in melee against the foe you last hit in melee',{mod:{pressHit:8,pressDmg:.1}})],
  [perkDef('Shock','A melee hit of yours that reaches hitpoints shakes the foe: it tests its morale (at +10 resolve)',{mod:{shock:10}})],[perkDef('Breakthrough','Regain 4 AP on a kill, once per turn',{flag:'berserk'})],
  [perkDef('Rout them','+10 to hit and +20% damage against a foe that is wavering, breaking or fleeing',{mod:{shakenHit:10,shakenDmg:.2}})],[perkDef('Terror','A foe you kill spreads fear: its allies within 3 tiles test their morale at 15 less resolve than they would',{mod:{killFear:15}})]]},
 bulwark:{n:'Bulwark',kind:'style',aff:['melee','shield','heavy'],d:'Holding the line',role:'The anchor: plants itself, turns blows aside on its armor and punishes whoever strikes it',tiers:[
  [perkDef('Stand firm','+8 melee and ranged defense while you did not move on your last turn',{mod:{holdDef:8}})],[perkDef('Rooted','While you did not move on your last turn, your armor counts 60% more on the mitigation curve (the heavier the armor, the more this gives)',{mod:{holdMit:.6}})],
  [perkDef('Battle-forged','Your armor turns more of every blow aside: it counts 50% more on the mitigation curve, and the curve\'s ceiling is 10 points higher (the heavier the armor, the more this gives)',{flag:'forged',mod:{mitK:.5,mitCap:.1}})],[perkDef('Unmoved','You cannot be knocked back or dragged; every melee attack that misses you gives +1 AP on your next turn (at most +2 between your turns)',{flag:'kbImm',mod:{missAP:1}})],
  [perkDef('Iron retort','Against a foe that has attacked you since your last turn: +1% melee damage for every 10 points of body armor you still wear (at most +25%)',{mod:{armDmg:.01}})],[perkDef('Bastion','Ability: +20 melee and ranged defense, 20% less damage and no knockback until your next turn',{ab:'bastion'})]]},
 marksman:{n:'Marksman',kind:'style',aff:['ranged','bow'],d:'Bow work',role:'The volley archer: shoots often and on the move, and pins the enemy down with arrows',tiers:[
  [perkDef('Snap shot','+8 ranged skill; after you have moved this turn, your bow shots get +8 more to hit',{st:{rs:8},mod:{mvShot:8}})],[perkDef('Volley','Ability: arrows on a foe and everyone beside it: 80% damage to the target, 70% of that to each foe next to it',{ab:'volley'})],
  [perkDef('Hamstring shot','A bow or crossbow hit that reaches hitpoints hobbles the target: it loses 2 AP at the start of its next turn',{mod:{hobbleShot:1}})],[perkDef('Eagle eye','+1 bow range, +5 ranged skill',{st:{rs:5},flag:'eagle'})],
  [perkDef('Draw and loose','Your first bow shot each turn (Shoot or a bow skill) costs 1 AP less (at least 2)',{flag:'drawLoose'})],
  [perkDef('Suppressing fire','+15% damage with bows and crossbows; every bow or crossbow hit suppresses the foe until its next turn (−10 melee and ranged skill)',{mod:{suppress:1,bowDmg:.15}})]]},
 skirmisher:{n:'Skirmisher',kind:'style',aff:['melee','ranged','light'],d:'Movement and evasion',role:'The raider: never where it stood, strikes and slips away, harder to hit the more it moves',tiers:[
  [perkDef('Pathfinder','Climbing and rough ground cost no extra AP',{flag:'path'})],[perkDef('Hit and run','After you attack on your turn, the next tile you leave draws no free attacks',{flag:'hitRun'})],
  [perkDef('Never still','+8 melee and ranged defense while you moved on your last turn',{mod:{mvDef:8}})],[perkDef('Momentum','+5% damage for every 2 tiles you have moved this turn (at most +15%)',{mod:{momentum:.05}})],
  [perkDef('Evasion','+10 melee and ranged defense while no ally stands next to you',{mod:{loneDef:10}})],[perkDef('Tumble','Ability: roll up to 3 tiles without drawing free attacks',{ab:'tumble'})]]},
 duelist:{n:'Duelist',kind:'style',aff:['melee','one'],d:'One blade, one free hand',role:'The fencer: one blade, one opponent: parries, punishes every miss and picks off the foe left alone',tiers:[
  [perkDef('En garde','+6 to hit in melee with a one-handed weapon and no shield raised',{mod:{duelHit:6}})],[perkDef('Counter-cut','With a one-handed melee weapon, no shield raised and no off-hand weapon: a foe whose melee attack misses you takes a free counter-cut 30% of the time',{mod:{counter:.3}})],
  [perkDef('Isolate','With a one-handed melee weapon, no shield raised and no off-hand weapon: +10 to hit and +20% damage in melee against a foe none of its own allies stands next to',{mod:{isoHit:10,isoDmg:.2}})],[perkDef('Parry','Ability: +15 melee defense and riposte every melee miss until your next turn',{ab:'parry'})],
  [perkDef('Fencer\'s guard','+10 initiative; with a one-handed melee weapon, no shield raised and no off-hand weapon: +8 melee defense',{st:{init:10},mod:{duelDef:8}})],[perkDef('Blade dance','Every melee hit you land on your turn gives +5 to hit for the rest of that turn (at most +15)',{mod:{chainHit:5}})]]},
 brute:{n:'Brute',kind:'style',aff:['melee','two'],d:'Two hands, one swing',role:'The wrecker: two-handed swings that tear armor apart and carry through into everyone in reach',tiers:[
  [perkDef('Heavy grip','+10% damage with two-handed melee weapons',{mod:{twoDmg:.1}})],[perkDef('Follow-through','With a two-handed melee weapon, a melee kill carries on into the weakest other foe next to you: a free blow at 50% damage',{mod:{follow:.5}})],
  [perkDef('Armor-breaker','Two-handed melee hits pierce 15% more armor and crush 30% more of it',{mod:{twoIgn:.15,twoCrush:.3}})],[perkDef('Sweeping blows','With a two-handed melee weapon, a melee hit that does not kill carries on into one other foe next to you (the weakest): a free blow at 35% damage that cannot miss',{mod:{sweep:.35}})],
  [perkDef('Brutal blows','A two-handed melee hit that reaches hitpoints dazes the foe 25% of the time',{mod:{twoDaze:.25}})],[perkDef('Earthsplitter','Ability: a two-handed overhead blow: 160% damage, +20% armor piercing, stuns, −5 to hit',{ab:'earthsplit'})]]},
 shieldbearer:{n:'Shieldbearer',kind:'style',aff:['shield'],d:'The shield is a weapon too',role:'The protector: covers the allies beside it and takes the blows meant for them on its shield',tiers:[
  [perkDef('Shield training','A raised shield gives +5 more melee and ranged defense',{mod:{shieldDef:5}})],[perkDef('Cover','Shots and spells against allies next to you get −8 to hit',{mod:{guard:8}})],
  [perkDef('Shelter','While your shield is raised, allies next to you take 10% less damage from every blow',{mod:{shelter:.1}})],[perkDef('Shield bind','While your shield is raised, a foe whose melee attack misses you is thrown off balance: −10 melee defense until its next turn',{mod:{bindOff:1}})],
  [perkDef('Intercept','Once between your turns, while your shield is raised, the first weapon attack aimed at an ally next to you is taken by you instead: against a blow you trade places with that ally, against a shot you must stand in its range and line of fire (single-target attacks only, not spells)',{mod:{intercept:1}})],[perkDef('Phalanx','Ability: you and every ally next to you get +10 melee and ranged defense until your next turn',{ab:'phalanx'})]]},
 tactician:{n:'Tactician',kind:'style',aff:['support'],d:'Orders that win fights',role:'The commander: more actions, steadier nerves and sharper aim for the allies around it',tiers:[
  [perkDef('Battle orders','Allies next to you get +5 to hit',{mod:{cmd:5}})],[perkDef('Steadying voice','At the start of each of your turns, the most shaken ally within 3 tiles (breaking or wavering, not fleeing) regains one step of morale',{mod:{steadyV:1}})],
  [perkDef('Inspiring presence','Allies within 3 tiles get +10 resolve on morale checks',{mod:{brvAura:10}})],[perkDef('Seize the moment','Every foe you kill gives the nearest ally within 4 tiles +2 AP on its next turn',{mod:{seizeAP:2}})],
  [perkDef('Quick orders','+10 initiative; at the start of each of your turns, the nearest ally within 3 tiles that has not acted yet this round gets +1 AP on its turn',{st:{init:10},mod:{ordersAP:1}})],[perkDef('Hold fast!','Ability: you and allies within 2 tiles get +10 melee and ranged defense and +15 resolve for 2 turns',{ab:'holdfast'})]]},
 survivor:{n:'Survivor',kind:'style',aff:['melee','ranged','caster','support'],d:'Hard to put down',role:'The last one standing: outlasts wounds, poison and the killing blow through hitpoints and will alone',tiers:[
  [perkDef('Thick skin','+8 hitpoints',{id:'survivor.1',st:{hp:8}}),perkDef('Stubborn','When struck down, 65% chance to live instead of 30% (an injury all the same)',{id:'survivor.stubborn',mod:{downSurv:.65}})],[perkDef('Second wind','Ability: once per battle, shed 40 fatigue and recover 8–14 hitpoints',{ab:'secwind'})],
  [perkDef('Hard to kill','Take 15% less damage while below half health',{mod:{lastStand:.15}})],[perkDef('Shrug it off','+8 resolve; at the start of each of your turns, bleeding, poison and burning on you lose 1 more turn',{st:{brv:8},mod:{shrug:1}})],
  [perkDef('Grit','Recover 4 hitpoints at the start of each of your turns',{mod:{regenHP:4}})],[perkDef('Undying','Once per battle, a blow that would kill you leaves you at 1 hitpoint',{flag:'undying'})]]},
 medic:{n:'Field medic',kind:'style',aff:['support'],d:'Keeps the company standing',role:'The healer: keeps the wounded on their feet and pulls the dying back',tiers:[
  [perkDef('Bandage','Ability: heal yourself or an adjacent ally 10–16 hitpoints and stop bleeding',{ab:'bandage'})],[perkDef('Steady hands','+25% healing from your abilities',{mod:{healB:.25}})],
  [perkDef('Field triage','At the start of each of your turns, whoever is worst afflicted of you and the allies next to you sheds bleeding, poison, burning and daze',{mod:{fieldTri:1}})],[perkDef('Watchful eye','Allies next to you recover 3 hitpoints at the start of their turns',{mod:{medAura:3}})],
  [perkDef('Mercy','Your healing heals 50% more on an ally below half health; +5 resolve',{mod:{healLow:.5},st:{brv:5}})],[perkDef('Guardian angel','Once per battle, a blow that would kill or strike down an ally within 3 tiles of you leaves it at 1 hitpoint instead',{flag:'angel'})]]},
 scout:{n:'Scout',kind:'style',aff:['ranged','light'],d:'Eyes ahead of the company',role:'The spotter: acts first, marks the targets and makes every shot of the company count',tiers:[
  [perkDef('Quick start','+12 initiative',{st:{init:12}})],[perkDef('Mark target','Ability: mark a foe within 7 tiles: +15 to hit it for its next 2 turns (2 AP, cannot miss)',{ab:'mark'})],
  [perkDef('Ambush','+20% damage to foes still at full health',{mod:{vsFull:.2}})],[perkDef('Quick hands','The first weapon swap each turn costs no AP',{flag:'freeSwap'})],
  [perkDef('Spotter','A weapon shot of yours that reaches hitpoints marks the foe for 1 turn (every attack on it gets +15 to hit)',{mod:{spotMark:1}})],[perkDef('Hard to pin down','Shots and spells from 4 or more tiles away get −12 to hit you',{mod:{farDef:12}})]]},
 berserker:{n:'Berserker',kind:'style',aff:['melee'],d:'Blood and fury',role:'The madman: grows deadlier with every wound and feeds on the kills',tiers:[
  [perkDef('Battle hunger','Recover 6 hitpoints whenever you kill a foe',{mod:{killHeal:6}})],[perkDef('Rage','Ability: +25% damage and −10 melee defense for 2 turns (2 AP)',{ab:'rage'})],
  [perkDef('Blood rage','+20% damage while below half health',{mod:{lowHpDmg:.2}})],[perkDef('Wounds feed it','+3% damage for every 10% of your hitpoints you have lost (whole tenths: at most +27%)',{mod:{hurtDmg:.3}})],
  [perkDef('Pain-fed','Take 10% less damage below half health; recover 6 more hitpoints on a kill',{mod:{lastStand:.1,killHeal:6}})],[perkDef('Unstoppable fury','Every enemy blow that reaches your hitpoints gives +5% damage for the rest of the battle (at most +25%)',{mod:{furyHit:.05}})]]},
 sharpshooter:{n:'Sharpshooter',kind:'style',aff:['ranged','bow'],d:'One shot, one body',role:'The sniper: stands still, aims long and puts the arrow through the eye and out the back',tiers:[
  [perkDef('Sure aim','Your shots ignore 1 step of cover',{mod:{coverIgn:1}})],[perkDef('Headshot','Ability: +40% head chance, −5 to hit',{ab:'headshot'})],
  [perkDef('Long shot','No hit penalty for distance; +4 ranged skill',{mod:{longShot:1},st:{rs:4}})],[perkDef('Bodkin points','+15% armor piercing on weapon attacks',{mod:{ignB:.15}})],
  [perkDef('Deliberate aim','While you have not moved this turn: +10 to hit, +10% damage and +15% head chance with weapon shots',{mod:{holdHit:10,holdDmg:.1,holdHead:15}})],[perkDef('Overpenetration','A shot that kills flies on into the next foe in line behind the target for 50% damage',{mod:{overpen:.5}})]]},
 brawler:{n:'Brawler',kind:'style',aff:['melee'],d:'Fists, boots and foreheads',role:'The street fighter: unarmed, in close, dazing and knocking out what it grapples',tiers:[
  [perkDef('Scrapper','+4 melee skill, +4 hitpoints',{st:{ms:4,hp:4}})],[perkDef('Kick','Ability: boot a foe back 1 tile and daze it, +10 to hit (3 AP)',{ab:'kick'})],
  [perkDef('Iron jaw','+8 resolve; take 10% less damage from melee blows',{st:{brv:8},mod:{drMelee:.1}})],[perkDef('Dirty boxing','Fighting unarmed or with a fist weapon, a melee hit dazes the foe 30% of the time',{mod:{fistDaze:.3}})],
  [perkDef('Clinch','+15 to hit with your free attack on a foe that steps away from you',{mod:{clinch:15}})],[perkDef('Knockout','Fighting unarmed or with a fist weapon: +20% melee damage, and a melee hit that lands on the head stuns',{mod:{koDmg:.2}})]]},
  /* ---- the fist trees (rules: 64x-fists.js; abilities and the fist weapons: 11x-fists.js; capstones: 25-legend.js): three martial arts with
         bare hands or a fist weapon in hand (isFistW), each its own role, none repeating another tree (test/fists.js). The Brawler above stays
         the street fighter any brawny background may draw. Ids pinned: wrestle.1-6, pugilist.1-6, willow.1-6. ---- */
 wrestle:{n:'Wrestler',kind:'style',aff:['melee','fist'],d:'Holds, throws and the long squeeze',role:'The grappler: wrings the breath out of the foe it holds, then throws it down stunned or hurls it across the field',tiers:[
  [perkDef('Bear hug','Fighting with fists: every melee hit squeezes 8 breath out of the foe (fatigue; a foe that never tires loses breath of its own, which recovers 15 a turn): past half, it is tired (−1 to hit and −1 defense for every 5% more)',{id:'wrestle.1',mod:{wrFat:8}})],
  [perkDef('Hip throw','Ability (fists, 4 AP): over the hip and down: 60% damage, +5 to hit, the foe is thrown back 2 tiles and loses 12 breath',{id:'wrestle.2',ab:'hipthrow'})],
  [perkDef('Grind','Fighting with fists: +4% melee damage for every tenth of its breath the foe has lost (at most +20%)',{id:'wrestle.3',mod:{wrGrind:.04}})],
  [perkDef('Suplex','Ability (fists, 5 AP): lift the foe and drive it into the ground: 120% damage and 10 breath; a foe already past half its breath is stunned, any other dazed',{id:'wrestle.4',ab:'suplex'})],
  [perkDef('Smother','Fighting with fists: at the start of each of your turns, every foe next to you loses 8 breath',{id:'wrestle.5',mod:{wrSmother:8}})],
  [perkDef('Breaking hold','Fighting with fists: a melee hit on a foe past three quarters of its breath stuns it 35% of the time (never a foe stunned this round or the last)',{id:'wrestle.6',mod:{wrBreak:.35}})]]},
 pugilist:{n:'Pugilist',kind:'style',aff:['melee','fist'],d:'Fast hands and quick feet in the ring',role:'The striker: a storm of quick, cheap punches, two for every attack, that never tires the arms',tiers:[
  [perkDef('Snap jab','Fighting with fists: your Attack, One-two and Flurry of blows cost 1 AP less (at least 3)',{id:'pugilist.1',mod:{pgAP:1}})],
  [perkDef('One-two','Ability (fists, 4 AP): the jab finds the range, the cross lands: two punches at 70% damage, +15 to hit each; the second only while the foe stands',{id:'pugilist.2',ab:'onetwo'})],
  [perkDef('Loose shoulders','Fighting with fists: your punches cost half (50%) of their fatigue (rounded down), and you recover 5 more fatigue at the start of each of your turns',{id:'pugilist.3',mod:{pgFat:.5,pgRec:5}})],
  [perkDef('Double jab','Fighting with fists: every Attack is followed by a second punch at the same foe, at 30% damage, while it stands',{id:'pugilist.4',mod:{pgDouble:.3}})],
  [perkDef('Flurry of blows','Ability (fists, 5 AP): four punches at one foe, 50% damage each, every one 5 more to hit than the one before (+0, +5, +10, +15), while it stands',{id:'pugilist.5',ab:'pflurry'})],
  [perkDef('Rapid hands','+6 initiative. Fighting with fists: an Attack that kills gives its AP back, once a turn',{id:'pugilist.6',st:{init:6},mod:{pgKill:1}})]]},
 willow:{n:'Willow style',kind:'style',aff:['melee','fist','light'],d:'Bend, slip and never stand still',role:'The evader: bare-handed in light armor or none, it leaps in, slips out of every hold and bends around the blows aimed at it',tiers:[
  [perkDef('Empty hands','Fighting with fists in light armor or none: +8 melee and ranged defense, and 4 more while your armor and helmet together weigh 2 or less',{id:'willow.1',mod:{wlDef:8,wlBare:4}})],
  [perkDef('Flying kick','Ability (fists, 4 AP): leap at a foe up to 3 tiles away, past every foe on the way, and kick: 100% damage, +10 to hit',{id:'willow.2',ab:'flykick'})],
  [perkDef('Hard to pin','Fighting with fists in light armor: +3 melee and ranged defense for every tile you moved or leapt on your last turn (at most +12)',{id:'willow.3',mod:{wlStep:3}})],
  [perkDef('Slip away','Fighting with fists in light armor: leaving a foe\'s side never draws its free attack',{id:'willow.4',flag:'wlSlip'})],
  [perkDef('Turn the blow','Fighting with fists in light armor: weapon blows and shots on you lose 15% of their damage, bent or slipped aside',{id:'willow.5',mod:{wlDr:.15}})],
  [perkDef('Wind step','Fighting with fists in light armor: +1 AP on every turn you begin with no foe next to you',{id:'willow.6',mod:{wlAP:1}})]]},
  /* ---- the rogues' trees (rules: 60-battle-core.js rogueHit / rogueDmg, 30-mercs.js calc, abilities and statuses in 64r-rogues.js).
         A light weapon: bare fists, any dagger, or a one-handed melee weapon of at most 8 fatigue (short swords, the wakizashi): isLightW.
         Ids pinned: assassin.1-6, rogue.1-6, shadow.1-6. ---- */
 assassin:{n:'Assassin',kind:'style',aff:['melee','lightw'],d:'A knife where it is least expected',role:'The killer: one decisive light-blade strike from behind or before the foe can move, then the finish',tiers:[
  [perkDef('Backstab','With a light weapon in hand: +20% damage and +5 to hit in melee against a foe one of your allies also stands next to',{id:'assassin.1',mod:{stabDmg:.2,stabHit:5}})],
  [perkDef('From the shadows','With a light weapon in hand, your first attack of the battle, in melee: +15 to hit and +30% damage',{id:'assassin.2',mod:{sfHit:15,sfDmg:.3}})],
  [perkDef('Before they wake','With a light weapon in hand: +20% damage in melee against a foe that has not acted yet this round',{id:'assassin.3',mod:{wakeDmg:.2}})],
  [perkDef('Marked for death','With a light weapon in hand, a melee hit that reaches the hitpoints of a foe already below half health marks it for death for 2 turns (it takes 15% more damage from every blow; if it dies marked, the mark leaps to its nearest ally)',{id:'assassin.4',mod:{doomHurt:2}})],
  [perkDef('Opening wounds','With a light weapon in hand, a weapon blow that reaches hitpoints makes the foe bleed for 2 turns (6 hitpoints a turn)',{id:'assassin.5',mod:{lightBleed:2}})],
  [perkDef('Coup de grâce','Ability: with a light weapon in hand: 125% damage, +10 to hit, +25% armor piercing, a further +75% against a foe below half health; a kill gives back 3 AP (5 AP)',{id:'assassin.6',ab:'coupdegrace'})]]},
 rogue:{n:'Rogue',kind:'style',aff:['melee','lightw','support'],d:'Quick fingers and dirty tricks',role:'The cheat: poisons, blinds and robs, then feasts on the foe it has crippled',tiers:[
  [perkDef('Light fingers','+5 initiative; a won battle you fought in yields 10% more crowns from the field (up to +30% with three such rogues)',{id:'rogue.1',st:{init:5},flag:'lightFingers'})],
  [perkDef('Pickpocket','Ability: lift the purse of an adjacent foe that carries one (3 AP, +10 to hit, no damage): crowns, and one time in five a piece of its band’s gear, that come home with you if you live or the field is won; the foe loses 2 AP on its next turn. Each foe can be robbed once',{id:'rogue.2',ab:'pickpocket'})],
  [perkDef('Venomed blade','With a light weapon in hand, a weapon blow that reaches hitpoints poisons the foe for 2 turns (6 hitpoints a turn through armor, more against higher-ranked bands)',{id:'rogue.3',mod:{lightPoison:2}})],
  [perkDef('Cheap shot','With a light weapon in hand, a melee hit blinds the foe through its next turn 20% of the time (−15 melee and ranged skill, −10 melee defense, no free attacks)',{id:'rogue.4',mod:{cheapBlind:.2}})],
  [perkDef('Low blow','+20% damage and +10 to hit against a foe that is dazed, blinded, stunned, rooted, webbed or fleeing',{id:'rogue.5',mod:{dirtyDmg:.2,dirtyHit:10}})],
  [perkDef('Opportunist','+10 to hit and +15% damage against a foe that has made a free attack since its last turn',{id:'rogue.6',mod:{oppHit:10,oppDmg:.15}})]]},
 shadow:{n:'Shadowdancer',kind:'style',aff:['melee','light'],d:'Never where the blow lands',role:'The evader: speed as armor: every miss and every point of initiative makes it harder to hit',tiers:[
  [perkDef('Light step','The first tile you move each turn costs 2 AP less (it is free on open ground); +5 initiative',{id:'shadow.1',st:{init:5},flag:'quickstep'})],
  [perkDef('Blur','Ability: until your next turn, +10 melee and ranged defense, and you strike back at every melee attack that misses you (3 AP)',{id:'shadow.2',ab:'blur'})],
  [perkDef('Flow','Every attack that misses you gives +4 melee and ranged defense until your next turn (up to +12); moving costs 1 fatigue a tile instead of 2',{id:'shadow.3',mod:{flow:4},flag:'footing'})],
  [perkDef('Read the blade','+1 melee and ranged defense for every 8 initiative above 90 (at most +8; with Quicksilver, at most +20 defense from initiative in all)',{id:'shadow.4',mod:{readInit:1}})],
  [perkDef('Quicker than thought','+10 to hit and +10% damage in melee against a foe that has not acted yet this round',{id:'shadow.5',mod:{firstHit:10,firstDmg:.1}})],
  [perkDef('Afterimage','The first attack aimed at you after each of your turns gets −20 to hit',{id:'shadow.6',mod:{afterImg:20}})]]},
 /* ---- the gladiators' trees (the colosseum update; rules: 60-battle-core.js glHit / glDmg, abilities, statuses and hooks in 64g-gladiators.js).
        Ids pinned: gladiator.1-6, champion.1-6. ---- */
 gladiator:{n:'Gladiator',kind:'style',aff:['melee','support','one'],d:'Blood and sand, for the crowd',role:'The showman: nets its prey, fights surrounded and lifts the company with every kill',tiers:[
  [perkDef('Crowd-pleaser','+5 resolve. Every kill you make heartens the company: allies within 3 tiles who are below steady regain one step of morale, and you recover 5 hitpoints',{id:'gladiator.1',st:{brv:5},mod:{crowdKill:5}})],
  [perkDef('Payback','+10 to hit and +10% damage against a foe that has attacked you since your last turn',{id:'gladiator.2',mod:{payHit:10,payDmg:.1}})],
  [perkDef('Throw net','Ability: with no shield raised and no two-handed weapon in hand, cast a weighted net at a foe within 3 tiles (4 AP, melee skill, +5 to hit; not at huge foes): Netted for 2 turns: it cannot move, −10 melee defense and −10 melee skill',{id:'gladiator.3',ab:'netthrow'})],
  [perkDef('Pinned prey','+15% damage and +10 to hit against a foe that is netted, rooted or webbed',{id:'gladiator.4',mod:{pinDmg:.15,pinHit:10}})],
  [perkDef('Thumbs down','Killing a foe that is netted, rooted or webbed on your turn gives back 3 AP',{id:'gladiator.5',mod:{pinKillAP:3}})],
  [perkDef('Surrounded by glory','For every foe next to you beyond the first: +5 melee defense and +5% melee damage (at most +15 and +15%)',{id:'gladiator.6',mod:{crowdDef:5,crowdDmg:.05}})]]},
 champion:{n:'Arena champion',kind:'style',aff:['melee','one','shield'],d:'The one who walks out of the sand',role:'The champion: alone against one foe it studies, outlasts and executes',tiers:[
  [perkDef('Sand-hardened','+8 hitpoints, +3 melee defense, +5 maximum fatigue',{id:'champion.1',st:{hp:8,md:3,fat:5}})],
  [perkDef('Read the opponent','+5 to hit against a foe for every attack you have already made on it this battle, hit or miss (at most +15)',{id:'champion.2',mod:{readOpp:5}})],
  [perkDef('Single combat','+10 to hit and +15% damage in melee against a foe that no other ally of yours stands next to',{id:'champion.3',mod:{soloHit:10,soloDmg:.15}})],
  [perkDef('Hold the sand','You cannot be knocked back or dragged; +8 resolve; take 8% less damage from melee blows',{id:'champion.4',flag:'kbImm',st:{brv:8},mod:{drMelee:.08}})],
  [perkDef('Iugula','Ability: the crowd’s verdict (5 AP, melee): 100% damage, +10 to hit, +40% armor piercing, and a further +80% against a foe below half health',{id:'champion.5',ab:'iugula'})],
  [perkDef('Undefeated','+5 melee skill. The first time in a battle a blow leaves you alive below half health, you catch your second wind: recover 20 hitpoints, and +2 AP on your next turn',{id:'champion.6',st:{ms:5},flag:'secondWind'})]]},
  /* ---- the twin blades (rules: 11w-dualwield.js the off-hand rules, 64w-dualwield.js abilities and hooks; calc() 30-mercs.js).
        Dual wielding: a light one-handed weapon in the shield slot (m.eq.s) beside a one-handed melee weapon in hand. Ids pinned: dualwield.1-6. ---- */
 dualwield:{n:'Twin blades',kind:'style',aff:['melee','dual'],d:'A blade in each hand',role:'The whirlwind: a blade in each hand, two blows for every attack, bleeding and guarding with the off hand',tiers:[
  [perkDef('Off-hand training','With a weapon in each hand: the off-hand blow that follows every Attack strikes at 75% of the off-hand weapon\u2019s damage instead of 50%, and loses its \u221210 to hit',{id:'dualwield.1',flag:'dwTrain'})],
  [perkDef('Twin strike','Ability: with a weapon in each hand, strike with both (5 AP): the main hand at 100% damage and +10 to hit, then the off hand at 100% and +10 to hit',{id:'dualwield.2',ab:'twinstrike'})],
  [perkDef('Cross guard','+8 melee defense while you fight with a weapon in each hand: the off-hand blade turns aside what a shield would have',{id:'dualwield.3',mod:{dwDef:8}})],
  [perkDef('Opening cut','With a weapon in each hand, an off-hand blow that reaches hitpoints makes the foe bleed for 2 turns',{id:'dualwield.4',mod:{dwBleed:2}})],
  [perkDef('Whirling steel','With a weapon in each hand, every off-hand blow that hits gives +5 melee defense until your next turn (at most +15)',{id:'dualwield.5',mod:{dwFlow:5}})],
  [perkDef('Ambidextrous','+5 melee skill. With a weapon in each hand, the off-hand blow that follows every Attack strikes at the off-hand weapon\u2019s full damage, with no penalty to hit',{id:'dualwield.6',st:{ms:5},flag:'dwAmbi'})]]},
 /* ---- the masteries update: the firearm trees and Throwing arms (rules: 60p-passives.js; the throwing family and the new arms: 11t-arms.js).
        Each works only with its weapon in hand where its text says so. Ids pinned: gunner.1-6, pistol.1-6, powder.1-6, thrower.1-6. ---- */
 /* the firearm trees (the gun trees update, rules: 64u-guntrees.js): three ways to fight with powder. Musketry ('gunner': the line gunner, long guns
    by volley), Pistolier ('pistol': the gun duellist, pistols close in) and Grenadier ('powder': bombs, scattershot, smoke, against crowds and shields).
    No perk of one repeats another tree's (test/guntrees.js). */
 gunner:{n:'Musketry',kind:'style',aff:['ranged','gun','longgun'],d:'Powder, ball and the drum',role:'The line gunner: fires by volley beside the other guns, slow and deliberate, and punches through plate at long range',tiers:[
  [perkDef('Rolling volley','With a firearm: +8% damage against a foe already hit by a firearm shot this round, for every such hit (at most +24%)',{id:'gunner.1',mod:{rollV:.08}})],
  [perkDef('Volley fire','Ability (a loaded firearm, 5 AP): fire, and every ally within 2 tiles whose firearm is loaded, with the foe in range and in sight, fires at it too for 60% damage (their loads are spent, and each starts its next turn 2 AP short)',{id:'gunner.2',ab:'gvolley'})],
  [perkDef('Primed','After you reload a firearm, its next shot gets +10 to hit and +15% damage',{id:'gunner.3',mod:{primeHit:10,primeDmg:.15}})],
  [perkDef('Double charge','Ability: a double load of powder (6 AP, a loaded firearm): 140% damage, +20% armor piercing, −5 to hit',{id:'gunner.4',ab:'dcharge'})],
  [perkDef('Armor-piercing ball','Firearm shots pierce 10% more armor and crush 25% more of it',{id:'gunner.5',mod:{gunIgn:.1,gunCrush:.25}})],
  [perkDef('Gunline','With a firearm: +5 to hit and +5% damage for every ally within 2 tiles who also holds one (at most +15 and +15%)',{id:'gunner.6',mod:{gunLine:5,gunLineD:.05}})]]},
 pistol:{n:'Pistolier',kind:'style',aff:['ranged','pistol'],d:'A wheellock in the sash, a blade on the hip',role:'The gun duellist: a pistol at arm\'s length, quick shots at whoever comes close, and the butt or a blade to finish',tiers:[
  [perkDef('Arm\'s length','With a pistol (a one-handed firearm): +10 to hit and +15% damage against a foe 2 tiles away or closer',{mod:{gunPBHit:10,gunPB:.15}})],
  [perkDef('Quick draw','Ability (a loaded pistol, 2 AP): a shot from the hip before the foe is set: 70% damage, −5 to hit',{ab:'qdraw'})],
  [perkDef('Wing the runner','With a pistol: +10 to hit and +10% damage against a foe that moved on its last turn',{mod:{runHit:10,runDmg:.1}})],
  [perkDef('Pistol-whip','Ability (a pistol in hand, 3 AP): club the foe next to you with the butt: 60% damage with melee skill and it is dazed; the load stays in the pan',{ab:'pwhip'})],
  [perkDef('Ten paces','With a pistol: +10 to hit and +15% damage while no foe but your target stands within 3 tiles of you',{mod:{paceHit:10,paceDmg:.15}})],
  [perkDef('Brace of pistols','Every second pistol shot leaves your pistol loaded: a second one comes out of the sash',{mod:{braceP:1}})]]},
 powder:{n:'Grenadier',kind:'style',aff:['ranged','gun','bomb'],d:'Kegs, fuses and scattershot',role:'The grenadier: bombs, shot and smoke that break shields, scatter close formations and send the crowd running',tiers:[
  [perkDef('Powder smoke','After you fire a firearm, shots and spells at you get −10 to hit until your next turn',{mod:{smokeDef:10}})],
  [perkDef('Grenade','Ability (twice a battle, 4 AP, up to 4 tiles, any weapon in hand): a lit bomb: 24–36 damage, 30% armor piercing, to a foe and 70% of it to every foe beside it, aimed with ranged skill at +10; a raised shield is no cover from it',{ab:'grenade'})],
  [perkDef('Blasting powder','+20% damage with Scattershot, Grenade and Petard',{mod:{blastDmg:.2}})],
  [perkDef('Petard','Ability (once a battle, 5 AP): a charge set against the foe next to you: 30–46 damage that cannot miss, 100% more armor crushed, knocked back 1 tile, and a raised shield takes 60 damage',{ab:'petard'})],
  [perkDef('Shellshock','A foe hit by your Scattershot, Grenade or Petard tests its morale',{mod:{blastFear:1}})],
  [perkDef('Wildfire','Your Scattershot, Grenade and Petard set what they hit burning for 2 turns',{mod:{blastBurn:2}})]]},
 thrower:{n:'Throwing arms',kind:'style',aff:['ranged','throw'],d:'Axes, knives and stars, by hand',role:'The skirmish thrower: throws at close range, then closes in, mixing throws and blows and never running dry',tiers:[
  [perkDef('Bandolier','+2 throws with every throwing weapon you carry',{id:'thrower.1',mod:{ammoB:2}})],
  [perkDef('Recover','A throw that kills its target comes back to you: one throw regained',{id:'thrower.2',mod:{recover:1}})],
  [perkDef('Double throw','Ability: two throws in quick succession at one foe (6 AP, 2 throws): 80% damage each; the second flies only while the foe stands',{id:'thrower.3',ab:'dthrow'})],
  [perkDef('Ricochet','A throw that misses glances off into the nearest other foe next to its target, for 50% damage (the glance cannot miss)',{id:'thrower.4',mod:{ricochet:.5}})],
  [perkDef('Hand to hand','With a throwing weapon in hand: after a throw on your turn, your next melee blow that turn gets +10 to hit and +15% damage; after a melee blow, your next throw that turn does',{id:'thrower.5',mod:{mixHit:10,mixDmg:.15}})],
  [perkDef('Deadly arc','Your first throw of the battle cannot miss and deals +25% damage',{id:'thrower.6',flag:'deadArc'})]]},
 /* ---- gift trees: today's four under their old keys, the variants beside them ---- */
 mana:{n:'Arcana',kind:'gift',role:'The spellcaster: bolts that burn, kill to refill and arc into the next foe',res:'mana',style:'caster',aff:['caster'],d:'Awakens Mana for spellcraft',tiers:[
  [perkDef('Arcane bolt','Awakens Mana (30). Ability: a 22–34 magic bolt at 5 tiles',{ab:'bolt'})],[perkDef('Kindling','Your spells set what they hit burning for 2 turns',{mod:{spellBurn:2}})],
  [perkDef('Spell echo','Once per turn, a spell of yours that kills gives its Mana back',{mod:{echo:1}})],[perkDef('Arcing spells','A spell that hits its target arcs on to 1 more foe within 3 tiles of it for 50% damage (the arc cannot miss)',{mod:{spellArc:.5}})],
  [perkDef('Deep well','+20 Mana, +3 Mana a turn',{res:20,regen:3})],[perkDef('Starfall','Ability: 34–52 magic damage within 6 tiles, 70% to every foe beside the target, all dazed',{ab:'starfall'})]]},
 mana_m:{n:'Runeblade',kind:'gift',role:'The runeblade: weapon hits that refill the mana that wards it',res:'mana',style:'melee',aff:['melee'],d:'Mana etched into the blade',tiers:[
  [perkDef('Runic edge','Awakens Mana (30). Ability: a weapon strike with +25% armor piercing, +5 to hit',{ab:'runeedge'})],[perkDef('Warding runes','Take 10% less damage while you hold at least half your Mana',{mod:{manaWard:.1}})],
  [perkDef('Runic recall','Every weapon hit you land restores 3 Mana',{mod:{manaHit:3}})],[perkDef('Spellfed blade','Kills restore 8 Mana; +5 melee skill',{mod:{killRes:8},st:{ms:5}})],
  [perkDef('Arcane surge','+20 Mana, +2 Mana a turn',{res:20,regen:2})],[perkDef('Runic overload','Ability: 160% damage, +30% armor piercing, dazes, arcs to 1 more foe for 60%',{ab:'overload'})]]},
 mana_r:{n:'Arcane archery',kind:'gift',role:'The arcane archer: arrows that never miss, root and hit harder the fuller the mana',res:'mana',style:'ranged',aff:['ranged','bow'],d:'Mana guides the arrow',tiers:[
  [perkDef('Seeker arrow','Awakens Mana (30). Ability: a shot that cannot miss, 85% damage',{ab:'seeker'})],[perkDef('Guided fletching','Shots ignore 1 step of cover and have no distance penalty',{mod:{coverIgn:1,longShot:1}})],
  [perkDef('Arcane resonance','+2% damage with weapon attacks for every 10 Mana you hold (at most +12%)',{mod:{manaDmg:.02}})],[perkDef('Binding rune','A bow hit that reaches hitpoints roots the target for 1 turn 25% of the time',{mod:{bindRoot:.25}})],
  [perkDef('Deep quiver','+20 Mana, +3 Mana a turn, +5 ranged skill',{res:20,regen:3,st:{rs:5}})],[perkDef('Starpiercer','Ability: 130% damage, +30% armor piercing, on through up to 3 foes behind for 75%',{ab:'starpierce'})]]},
 mana_t:{n:'Hexed blades',kind:'gift',role:'The hexblade thrower: conjured blades that never run dry, runes that call a missed throw home, and a hex that marks the foe for the kill',res:'mana',style:'ranged',aff:['ranged','throwing'],d:'Mana etched into the thrown blade',tiers:[
  [perkDef('Conjured blade','Awakens Mana (30). Ability: throw a blade of mana conjured in the hand: 90% damage, +10 to hit, and a hit marks the foe for 2 turns (every attack on it +15 to hit); it spends no throw and works with none left',{ab:'conjure'})],[perkDef('Homing runes','A throw of yours that misses flies back to your hand: the throw is not spent',{mod:{retRune:1}})],
  [perkDef('Hex-bitten','Your throws deal +15% damage to a marked foe',{mod:{hexDmg:.15}})],[perkDef('Soul-drinker','When a marked foe dies to your throw, you regain one throw and 6 Mana',{mod:{hexKill:6}})],
  [perkDef('Arcane bandolier','+20 Mana, +3 Mana a turn, +2 throws with every throwing weapon you carry',{res:20,regen:3,mod:{ammoB:2}})],[perkDef('Blade swarm','Ability: three conjured blades at one foe (6 AP): 75% damage each, +5 to hit; each flies only while the foe stands; spends no throw',{ab:'swarm'})]]},
 aura:{n:'Aura arts',kind:'gift',role:'The aura warrior: burst strikes fed by the foes pressing in on it',res:'aura',style:'melee',aff:['melee'],d:'Awakens Aura to augment weapon strikes',tiers:[
  [perkDef('Aura strike','Awakens Aura (30). Ability: a weapon strike for 150%, +10 to hit',{ab:'astrike'})],[perkDef('Focused aura','Abilities that cost Aura get +10 to hit',{mod:{auraHit:10}})],
  [perkDef('Crushing aura','Hits of abilities that cost Aura crush 30% more armor',{mod:{auraCrush:.3}})],[perkDef('Battle aura','At the start of each of your turns, gain 2 Aura for every foe next to you',{mod:{auraAdj:2}})],
  [perkDef('Overflow','+15 Aura, +10% damage',{res:15,st:{dmg:.1}})],[perkDef('Avatar of war','Ability: +30% damage, +10 melee skill and defense for 2 turns',{ab:'avatar'})]]},
 aura_r:{n:'Aura archery',kind:'gift',role:'The aura archer: few, heavy, piercing shots that stagger what they hit',res:'aura',style:'ranged',aff:['ranged','bow'],d:'Aura poured into the bowstring',tiers:[
  [perkDef('Aura arrow','Awakens Aura (30). Ability: a shot for 140%, +5 to hit',{ab:'aarrow'})],[perkDef('Piercing aura','Abilities that cost Aura pierce 15% more armor',{mod:{auraIgn:.15}})],
  [perkDef('Aura sight','+8 ranged skill, +1 bow range',{st:{rs:8},mod:{rngB:1}})],[perkDef('Concussive force','Shots of abilities that cost Aura daze what they hit',{mod:{auraDaze:1}})],
  [perkDef('Radiant quiver','+15 Aura, +10% damage with bows',{res:15,mod:{dmgRanged:.1}})],[perkDef('Sunburst arrow','Ability: 170% damage, +30% armor piercing, 70% to every foe beside the target',{ab:'sunarrow'})]]},
 aura_t:{n:'Aura hurling',kind:'gift',role:'The aura hurler: few, heavy throws that hurl foes back and break shields, stronger the harder the foes press in',res:'aura',style:'ranged',aff:['ranged','throwing'],d:'Aura poured into the throwing arm',tiers:[
  [perkDef('Aura hurl','Awakens Aura (30). Ability: a throw charged with Aura: 130% damage, and the foe is knocked back 1 tile',{ab:'ahurl'})],[perkDef('Shieldbreaker','A throw of yours that hits a foe behind a raised shield also strikes the shield for half the weapon\u2019s highest damage',{mod:{hurlSplit:.5}})],
  [perkDef('Close hurl','You may throw with foes next to you (no ranged lock); +8% damage with throws for every foe next to you (at most +24%)',{flag:'noLock',mod:{hurlAdj:.08}})],[perkDef('Staggering force','Throws of abilities that cost Aura leave what they hit off balance (−10 melee defense until its next turn)',{mod:{hurlOff:1}})],
  [perkDef('Radiant arm','+15 Aura, +5 ranged skill, +1 throw with every throwing weapon you carry',{res:15,st:{rs:5},mod:{ammoB:1}})],[perkDef('Comet hurl','Ability: 170% damage, +30% armor crushing, knocks the foe back 1 tile; then every foe beside it where it lands takes 70% and is knocked back too',{ab:'comet'})]]},
 qi:{n:'Elemental way',kind:'gift',role:'The elemental blade: frost, wind and thunder that slow and scatter the foes it fights',res:'qi',style:'melee',aff:['melee'],d:'Awakens Qi for elemental weapon arts',tiers:[
  [perkDef('Flame edge','Awakens Qi (30). Ability: 110% damage and the foe burns for 3 turns',{ab:'flame'})],[perkDef('Frostbite','A weapon hit that reaches hitpoints chills the foe (−3 AP on its next turn) 20% of the time',{mod:{chillCh:.2}})],
  [perkDef('Gale-touched','Your free attacks (on a foe stepping away, ripostes, spear wall, counter-cuts) knock the foe back 1 tile',{mod:{galeKb:1}})],[perkDef('Thunderclap','Hits of abilities that cost Qi daze the target',{mod:{qiDaze:1}})],
  [perkDef('Harmony','+15 Qi, +2 Qi a turn',{res:15,regen:2})],[perkDef('Storm dragon','Ability: 150% damage, burns and chills, leaps to 2 more foes for 60%',{ab:'dragon'})]]},
 qi_r:{n:'Elemental arrows',kind:'gift',role:'The storm archer: fire, frost and lightning on the string, charge by charge',res:'qi',style:'ranged',aff:['ranged','bow'],d:'Fire, frost and thunder on the string',tiers:[
  [perkDef('Fire arrow','Awakens Qi (30). Ability: full damage and the target burns for 3 turns',{ab:'farrow'})],[perkDef('Kindled arrows','A bow hit that reaches hitpoints sets the foe burning for 2 turns 25% of the time',{mod:{arrowBurn:.25}})],
  [perkDef('Wind-read','Your missed shots never stray into allies, and your shots ignore 1 step of cover',{flag:'noStray',mod:{coverIgn:1}})],[perkDef('Static charge','Each bow hit builds a charge; the bow hit after two charges deals +40% damage, dazes, and spends them',{mod:{staticChg:.4}})],
  [perkDef('Gathering storm','+15 Qi, +2 Qi a turn',{res:15,regen:2})],[perkDef('Tempest volley','Ability: 120% damage, 84% to every foe beside the target, all burn and are chilled',{ab:'tempest'})]]},
 qi_t:{n:'Storm throws',kind:'gift',role:'The storm thrower: thunder that leaps from foe to foe, frost that slows, fire that bursts on the frozen',res:'qi',style:'ranged',aff:['ranged','throwing'],d:'Fire, frost and thunder in the throwing hand',tiers:[
  [perkDef('Thunder star','Awakens Qi (30). Ability: a throw crackling with thunder: full damage, then the lightning leaps to 1 more foe within 3 tiles for 60% (the leap cannot miss)',{ab:'tstar'})],[perkDef('Rime-edged','A throw that reaches hitpoints chills the foe (−3 AP on its next turn) 30% of the time',{mod:{frostThrow:.3}})],
  [perkDef('Thawing fire','A throw that hits a chilled foe sets it burning for 2 turns',{mod:{thawBurn:2}})],[perkDef('Conductive','Your throws deal +15% damage to a foe that is burning, chilled or dazed',{mod:{stormDmg:.15}})],
  [perkDef('Storm well','+15 Qi, +2 Qi a turn, +1 throw with every throwing weapon you carry',{res:15,regen:2,mod:{ammoB:1}})],[perkDef('Ball lightning','Ability: a throw wrapped in lightning: 130% damage and dazes; then it leaps on to 3 more foes within 3 tiles for 60%, dazing each (the leaps cannot miss)',{ab:'balllight'})]]},
 chi:{n:'Inner flow',kind:'gift',role:'The life-giver: heals that also quicken and strengthen whoever they touch',res:'chi',style:'support',aff:['support'],d:'Awakens Chi for reinforcement and support',tiers:[
  [perkDef('Shared breath','Awakens Chi (30). Allies next to you recover 5 more fatigue at the start of their turns',{mod:{breathFat:5}})],[perkDef('Mend','Ability: heal yourself or an adjacent ally 18–28',{ab:'mend'})],
  [perkDef('Empowering touch','Whoever you heal also gets +10 melee and ranged skill for 2 turns',{mod:{healBuff:10}})],[perkDef('Quickening','Whoever you heal also gets +2 AP on their next turn',{mod:{healAP:2}})],
  [perkDef('Deep wellspring','+15 Chi, +12 hitpoints',{res:15,st:{hp:12}})],[perkDef('Lotus circle','Ability: you and every ally within 2 tiles heal 12–20',{ab:'lotus'})]]},
 chi_m:{n:'Iron fist',kind:'gift',role:'The iron monk: unarmored body hardened by chi, strikes that build on each other',res:'chi',style:'melee',aff:['melee'],d:'Chi through hands and blade',tiers:[
  [perkDef('Chi palm','Awakens Chi (30). Ability: 120% damage and knockback 1',{ab:'palm'})],[perkDef('Iron skin','Take 10% less damage from everything',{mod:{drB:.1}})],
  [perkDef('Flowing strikes','Every melee hit you land on your turn gives +10% damage for the rest of that turn (at most +30%)',{mod:{flowDmg:.1}})],[perkDef('Inner calm','+6 melee and ranged defense, +10 resolve',{st:{md:6,rd:6,brv:10}})],
  [perkDef('Iron body','+15 Chi; every blow that reaches your hitpoints takes 3 fewer (at least 1)',{res:15,mod:{hpSoak:3}})],[perkDef('Shattering palm','Ability: 180% damage, +50% armor piercing, stuns',{ab:'shatter'})]]},
 chi_r:{n:'Steady breath',kind:'gift',role:'The calm archer: aimed shots at the head that cripple, and arrows through armor',res:'chi',style:'ranged',aff:['ranged','bow'],d:'Chi stills the archer',tiers:[
  [perkDef('Steady breathing','Awakens Chi (30). Ability: +15 ranged skill for 2 turns (2 AP)',{ab:'breath'})],[perkDef('Chi focus','+10% head chance with weapon attacks, +4 ranged skill',{mod:{headB:10},st:{rs:4}})],
  [perkDef('Pressure points','A weapon shot that lands on the head weakens the target (−25% damage) for 2 turns',{mod:{ppHead:2}})],[perkDef('Calm mind','+15 Chi, +2 Chi a turn, +10 resolve',{res:15,regen:2,st:{brv:10}})],
  [perkDef('Point-blank','You may shoot with foes next to you (no ranged lock)',{flag:'noLock'})],[perkDef('Spirit arrow','Ability: full damage straight to hitpoints, ignoring armor, +10 to hit',{ab:'spiritarrow'})]]},
 chi_t:{n:'Still hand',kind:'gift',role:'The still hand: calm throws at the vitals that bleed and cripple, and breath that gathers spent throws back',res:'chi',style:'ranged',aff:['ranged','throwing'],d:'Chi stills the throwing hand',tiers:[
  [perkDef('Vital throw','Awakens Chi (30). Ability: a throw at a vital point: full damage, +15% head chance, and a hit that reaches hitpoints bleeds the foe for 3 turns',{ab:'vthrow'})],[perkDef('Gathered breath','At the start of each of your turns, if the throwing weapon in hand has spent throws, 4 Chi call one back',{mod:{breathAm:4}})],
  [perkDef('Hamstring throw','A throw that reaches hitpoints hobbles the foe (−2 AP at the start of its next turn) 30% of the time',{mod:{hamThrow:.3}})],[perkDef('Inner stillness','+15 Chi, +2 Chi a turn; +8 to hit with throws while you have not moved this turn',{res:15,regen:2,mod:{stillHit:8}})],
  [perkDef('Open the wound','+20% damage with throws and melee blows against a bleeding foe',{mod:{bleedDmg:.2}})],[perkDef('Severing throw','Ability: a throw at the sinews: 140% damage, +40% armor piercing, +10 to hit; the foe is hobbled, and bleeds for 3 turns if it reaches hitpoints',{ab:'sever'})]]},
 /* ---- the weapon mastery tree: one perk per weapon family (p.wt), each working only while a weapon of that family is in hand
         (shield: only while a shield is raised). A merc sees and may learn only the families its background allows (weaponTypes).
         One tier: every perk opens at level 3 (tierLevel('weapon', 1)). Ids 'weapons.<family>'. ---- */
 weapons:{n:'Weapon mastery',kind:'weapon',role:'Each weapon at its own trade: the sword parries, the axe splits shields, the mace stuns, the dagger bleeds, the spear holds ground',aff:['melee','ranged'],d:'One mastery per weapon family: each works only while that weapon is in hand',tiers:[[
  perkDef('Blade discipline','With a sword in hand: +5 to hit and +5 melee defense (the blade parries as it cuts)',{id:'weapons.sword',wt:'sword',wmod:{hit:5},st:{md:5}}),
  perkDef('Hew','With an axe in hand: +10% armor piercing, and shield-splitting blows do 50% more to shields',{id:'weapons.axe',wt:'axe',wmod:{ign:.1},mod:{splitB:.5}}),
  perkDef('Bonebreaker','With a mace in hand: +10% chance to stun on a hit, and hits crush 20% more armor',{id:'weapons.mace',wt:'mace',wmod:{stun:.1,crush:.2}}),
  perkDef('Plate breaker','Hammer hits crush 40% more armor',{id:'weapons.hammer',wt:'hammer',wmod:{crush:.4}}),
  perkDef('Quick blade','Dagger attacks cost 1 less AP (at least 2), and so do weapon skills that cost the weapon’s AP; a dagger hit that reaches hitpoints bleeds the foe for 2 turns',{id:'weapons.dagger',wt:'dagger',wmod:{ap:-1},mod:{bleedOn:2}}),
  perkDef('Steady point','With a spear in hand: +5 to hit, and your free attacks (on a foe stepping away, spear wall, ripostes) get +15 to hit',{id:'weapons.spear',wt:'spear',wmod:{hit:5},mod:{zocHit:15}}),
  perkDef('Second rank','+10 to hit with a polearm against a foe 2 tiles away',{id:'weapons.polearm',wt:'polearm',mod:{reachHit:10}}),
  perkDef('Measured swings','With a greatsword in hand, attacks and weapon skills cost 6 less fatigue',{id:'weapons.greatsword',wt:'greatsword',wmod:{fat:-6}}),
  perkDef('Nimble fingers','Bow shots cost 1 less AP (at least 2), and so do weapon skills that cost the weapon’s AP',{id:'weapons.bow',wt:'bow',wmod:{ap:-1}}),
  perkDef('Crank drill','Reloading a crossbow costs 2 less AP (at least 2)',{id:'weapons.crossbow',wt:'crossbow',wmod:{rld:-2}}),
  perkDef('Ramrod drill','Reloading a firearm costs 2 less AP (at least 2) and 6 less fatigue',{id:'weapons.flintlock',wt:'flintlock',wmod:{rld:-2,rfat:-6}}),
  perkDef('Practised arm','+10 to hit with a throwing weapon in hand',{id:'weapons.throwing',wt:'throwing',wmod:{hit:10}}),
  perkDef('Channeling','+15% spell damage with a staff in hand',{id:'weapons.staff',wt:'staff',wmod:{spell:.15}}),
  perkDef('Iron knuckles','Fighting unarmed: fists deal +8 minimum and +10 maximum damage',{id:'weapons.fist',wt:'fist',wmod:{d:[8,10]}}),
  perkDef('Shield discipline','A raised shield has 30% more hitpoints, and while it is raised shots and spells on you lose 10% of their damage',{id:'weapons.shield',wt:'shield',mod:{shieldHp:.3,deflect:.1}})]]},
 /* ---- armor trees: a merc has its background's (BG[bg].at); each works only while the body armor worn is of its weight class (armorClass(m):
         light = up to 60 armor or any robe, also no armor; medium = 61 to 150; heavy = over 150). One perk a tier; tiers open at levels 2, 5, 8
         (and 11: the light armor tree's fourth). ---- */
 lightarmor:{n:'Light armor',kind:'armor',aw:'light',role:'Evasion: not being there, fresh legs and quick feet in place of steel',aff:['light'],d:'Cloth, leather and robes: not being there (only while your armor is light: body and helmet together weigh at most 9, robes weigh nothing)',tiers:[
  [perkDef('Nimble','Take less damage the lighter you go: 30% minus 1.5% per point of body armor and helmet weight (their fatigue), at full strength while fresh and half of it when exhausted (scales with the stamina you have left); after you move on your turn, +10 ranged defense against shots until your next turn',{mod:{nimble:1,fleet:10}})],
  [perkDef('Slippery','Once between your turns, a blow that would take more than 25% of your maximum hitpoints only grazes you: you lose half those hitpoints; the first tile you leave each turn draws no free attacks',{mod:{sidestep:.25},flag:'slip'})],
  [perkDef('Dancer','+8 melee and ranged defense while your fatigue is below half; every attack that misses you gives +5 melee and ranged defense until your next turn (up to +15)',{mod:{freshDef:8,dance:5}})],
  [perkDef('Quicksilver','+10% of your initiative (rounded down) as melee and ranged defense',{mod:{initDef:.1}})]]},
 medarmor:{n:'Medium armor',kind:'armor',aw:'medium',role:'Resilience: gives a little, mends itself and keeps its wearer on its feet',aff:['melee','ranged'],d:'Mail, leather and brigandine: give a little, keep the rest (only while your armor is medium: body and helmet together weigh 10 to 26)',tiers:[
  [perkDef('Braced mail','The first blow that hits you between your turns deals 15% less damage; regain 5 body armor at the start of each of your turns (up to its maximum)',{mod:{brace:.15,armRegen:5}})],
  [perkDef('Rolling with it','Knockbacks, hooks and stuns against you work only half the time; moving costs 1 fatigue a tile instead of 2',{mod:{roll:.5},flag:'footing'})],
  [perkDef('Layered defense','+5 melee and ranged defense while your body armor is above half; the share of a blow that pierces your body armor is a quarter smaller (head hits excluded); your armor counts 25% more on the mitigation curve',{mod:{layerDef:5,padIgn:.25,mitK:.25}})]]},
 heavyarmor:{n:'Heavy armor',kind:'armor',aw:'heavy',role:'Mitigation: the heavier the plate, the more of every blow it turns aside',aff:['melee','shield'],d:'Plate and scale: a wall that walks (only while your armor is heavy: body and helmet together weigh 27 or more)',tiers:[
  [perkDef('Immovable','You cannot be knocked back or dragged; your body armor and helmet cost half as much fatigue (rounded down); your armor counts 75% more on the mitigation curve',{flag:'kbImm',mod:{ironLung:1,mitK:.75}})],
  [perkDef('Unbowed','A single blow never strips more than 35% of the armor it strikes (body armor or helmet, of its maximum); allies next to you take 5% less damage; your armor\'s mitigation ceiling is 15 points higher',{mod:{unbowed:.35,steelWall:.05,mitCap:.15}})],
  [perkDef('Juggernaut','Every blow that reaches your hitpoints takes 4 fewer (at least 1), you cannot be stunned, heavy blows do not test your morale, and your armor counts 25% more on the mitigation curve',{mod:{hpSoak:4,mitK:.25},flag:'noStun'})]]}
};
/* ---- Monster hunter (kind 'hunter'): 9 tiers of one perk, tier t opens at level t (tierLevel). Each perk is a quarry (QUARRY, keyed by
   the perk id): against a unit whose EN id is in QUARRY[k].en, a merc who has learned it deals +QUARRYB% damage plus per% for every one of
   that quarry it has slain (m.slain[k], counted always, also before the perk is learned), up to cap kills, and gets floor(kills x per / 2)
   to hit. Wyverns are never a quarry. It is one of the 4 trees a merc carries (m.trees): a background with BG[bg].hw draws it with that chance (rollTrees; the Beast slayer always). Rules: quarryVs / quarryInfo (61-talents.js). ---- */
const QUARRYB=5;
const QUARRY={
 'hunter.gob':    {n:'Goblins',      one:'goblin',      tag:'Goblin-slayer',  en:['gob','gobarch','gobsham'],        per:.5,cap:30},
 'hunter.spider': {n:'Webspinners',  one:'webspinner',  tag:'Spider-slayer',  en:['spider'],                         per:.5,cap:30},
 'hunter.wolf':   {n:'Direwolves',   one:'direwolf',    tag:'Wolf-slayer',    en:['wolf'],                           per:.5,cap:30},
 'hunter.dead':   {n:'Restless dead',one:'restless dead',tag:'Grave-warden',  en:['skel','zomb','skelhal','necro'],  per:1,cap:15},
 'hunter.serpent':{n:'Serpents',     one:'serpent',     tag:'Serpent-slayer', en:['adder','viper','gserp'],          per:1,cap:15},
 'hunter.bear':   {n:'Owlbears',     one:'owlbear',     tag:'Owlbear-slayer', en:['bear'],                           per:1.5,cap:10},
 'hunter.rift':   {n:'Riftspawn',    one:'riftspawn',   tag:'Rift-warden',    en:['imp','vknight','vmage','tyrant'], per:1.5,cap:10},
 'hunter.ent':    {n:'Ents',         one:'ent',         tag:'Ent-feller',     en:['thorn','ent','elder'],            per:2.5,cap:6},
 'hunter.ogre':   {n:'Ogres',        one:'ogre',        tag:'Ogre-slayer',    en:['ogre','aogre'],                   per:2.5,cap:6}};
const QUARRYOF={};for(const k in QUARRY){QUARRY[k].key=k;for(const e of QUARRY[k].en)QUARRYOF[e]=k}   // EN id -> quarry (perk) key
function quarryText(k){const Q=QUARRY[k];
 return`Against ${Q.n.toLowerCase()}: +${QUARRYB}% damage once learned, plus +${Q.per}% damage for every one you have slain and half that to hit, rounded down (kills made before learning it count too; up to ${Q.cap} kills: at most +${QUARRYB+Q.per*Q.cap}% damage, +${Math.floor(Q.per*Q.cap/2)} to hit)`}
MAST.hunter={n:'Monster hunter',kind:'hunter',role:'The slayer: every kill of a kind makes the next one easier',aff:['melee','ranged'],d:'Know your quarry: every kill of a kind makes the next one easier (never wyverns)',
 tiers:Object.keys(QUARRY).map(k=>[perkDef(QUARRY[k].tag,quarryText(k),{id:k,quarry:k})])};
// Perk ids, the flat list p (read by older UI code) and the tier count n.
for(const k in MAST){const T=MAST[k];T.p=[];T.tiers.forEach((tier,ti)=>tier.forEach((p,j)=>{if(!p.id)p.id=k+'.'+(ti+1)+(tier.length>1?'ab'[j]:'');T.p.push(p)}))}
const MUNDANE=Object.keys(MAST).filter(k=>MAST[k].kind==='style');
// Gift variants: GIFTV[res][style] -> tree key. A style the gift has no variant for falls back to melee.
// throwing: the throwing variant (a merc whose background allows throwing weapons and who carries one: giftStyle in 61-talents.js)
const GIFTV={mana:{caster:'mana',melee:'mana_m',ranged:'mana_r',throwing:'mana_t'},aura:{melee:'aura',ranged:'aura_r',throwing:'aura_t'},qi:{melee:'qi',ranged:'qi_r',throwing:'qi_t'},chi:{support:'chi',melee:'chi_m',ranged:'chi_r',throwing:'chi_t'}};
/* Backgrounds. st may carry brv (resolve); gear lists one pick per slot, '-' meaning nothing (helmets are k:'h'). */
const BG={
 farmhand:{n:'Farmhand',cost:90,wage:8,w:5,st:{hp:8,fat:10,ms:-3},m:['vanguard','bulwark'],r:[['chi',.15]],gear:['club|knife|mallet|pitchfork|hatchet','rags|rags|jack','hood|-|armcap']},
 militia:{n:'Militiaman',cost:160,wage:11,w:5,st:{ms:4,md:2,brv:3},m:['vanguard','bulwark'],r:[['aura',.15]],gear:['spear|spear|bill|pitchfork','padded|jack','buckler|targe','cap|hood|armcap']},
 hunter:{n:'Hunter',cost:220,wage:13,w:4,st:{rs:12,ms:-4,init:8},m:['marksman','skirmisher'],r:[['qi',.3]],gear:['shortbow|huntbow|huntbow|lightxbow|huntxbow|shortbow|huntbow|handgonne','rags|padded|jack','hood']},
 thief:{n:'Cutpurse',cost:170,wage:11,w:3,st:{init:14,md:4,hp:-5,brv:-5},m:['skirmisher','vanguard'],r:[['aura',.2]],gear:['knife|dirk','rags|jack','hood']},
 sellsword:{n:'Sellsword',cost:420,wage:24,w:3,st:{ms:10,md:4,hp:5,fat:5,brv:5},m:['vanguard','bulwark','skirmisher'],r:[['aura',.5]],gear:['shortsword|handaxe|mallet|falchion|boarspear','leather|hide','buckler|roundshield|targe','cap|coif']},
 squire:{n:'Squire',cost:380,wage:20,w:2,st:{ms:7,md:5,fat:5,brv:6},m:['bulwark','vanguard'],r:[['aura',1]],gear:['shortsword|shortsword|greatsword','padded','kite','coif|cap']},
 hedge:{n:'Hedge mage',cost:480,wage:22,w:2,st:{hp:-8,ms:-8,fat:-5,brv:-3},m:['skirmisher','bulwark'],r:[['mana',1]],gear:['staff|staff|pilgrim','robe','hood']},
 acolyte:{n:'Temple acolyte',cost:330,wage:16,w:2,st:{hp:4,ms:-2,brv:6},m:['bulwark','vanguard'],r:[['chi',1]],gear:['club|spikedclub','padded','hood|armcap']},
 monk:{n:'Wandering monk',cost:450,wage:20,w:2,st:{init:8,md:8,ms:5,brv:10},m:['skirmisher','vanguard'],r:[['chi',.6],['qi',.4]],gear:['staff','rags']},
 spellblade:{n:'Academy dropout',cost:540,wage:26,w:2,st:{ms:5},m:['vanguard','skirmisher'],r:[['qi',.6],['mana',.4]],gear:['shortsword','padded','cap|-']},
 wildling:{n:'Wildling',cost:300,wage:16,w:3,st:{hp:10,ms:6,md:-5,fat:10,brv:4},m:['vanguard','skirmisher'],r:[['qi',.4]],gear:['handaxe|hatchet|mallet|spikedclub','rags|hide','-|roundshield|targe']},
 knight:{n:'Disgraced knight',cost:900,wage:38,w:1,st:{ms:14,md:8,hp:10,fat:8,brv:12},m:['vanguard','bulwark'],r:[['aura',1]],gear:['arming|warhammer|greatsword|falchion','mail|mail|brigandine','kite|heater','nasal|spangen']}
};
const RACE={human:{n:'Human',st:{}},elf:{n:'Elf',st:{rs:5,init:8,hp:-5}},dwarf:{n:'Dwarf',st:{hp:8,fat:8,init:-10,brv:5}},halforc:{n:'Half-orc',st:{hp:6,ms:3,rd:-3,brv:3}}};
/* Talents per background: style (melee ranged caster support: picks the gift variant), pool (the style trees a recruit draws 4 of),
   wt (the weapon families whose trees it may learn: at most 5, covering its starting weapons; exceptions: a sellsword's sidearm knife and a
   wildling's odd shield fall outside), at (the armor trees it may learn: 1 or 2 of lightarmor medarmor heavyarmor),
   side (a sidearm pick for m.eq.b, '-' = none). */
Object.assign(BG.farmhand,{style:'melee',pool:['vanguard','bulwark','brute','survivor','brawler','shieldbearer','medic'],wt:['mace','axe','hammer','polearm','dagger'],at:['lightarmor','medarmor']});
Object.assign(BG.militia,{style:'melee',pool:['vanguard','bulwark','shieldbearer','tactician','survivor','skirmisher','marksman'],wt:['spear','polearm','crossbow','dagger','shield'],at:['lightarmor','medarmor'],side:'knife|-'});
Object.assign(BG.hunter,{style:'ranged',pool:['marksman','sharpshooter','scout','skirmisher','survivor','medic','brawler'],wt:['bow','crossbow','dagger','spear','flintlock'],at:['lightarmor'],side:'knife|huntknife'});   // flintlock (the gun backgrounds): a fowling piece now and then, in place of the axe
Object.assign(BG.thief,{style:'melee',pool:['rogue','assassin','shadow','skirmisher','duelist','scout','survivor','brawler','dualwield'],wt:['dagger','sword','fist','crossbow','flintlock'],at:['lightarmor']});
Object.assign(BG.sellsword,{style:'melee',pool:['vanguard','duelist','brute','dualwield','skirmisher','tactician','berserker','survivor','shieldbearer'],wt:['sword','axe','hammer','spear','shield'],at:['medarmor','heavyarmor'],side:'knife|-|-'});
Object.assign(BG.squire,{style:'melee',pool:['vanguard','bulwark','shieldbearer','duelist','tactician','brute'],wt:['sword','greatsword','spear','polearm','shield'],at:['medarmor','heavyarmor']});
Object.assign(BG.hedge,{style:'caster',pool:['skirmisher','bulwark','medic','scout','survivor','tactician'],wt:['staff','dagger','fist'],at:['lightarmor'],side:'knife|-'});
Object.assign(BG.acolyte,{style:'support',pool:['medic','bulwark','shieldbearer','tactician','survivor','vanguard','brawler'],wt:['mace','hammer','staff','fist','shield'],at:['medarmor']});
Object.assign(BG.monk,{style:'melee',pool:['skirmisher','brawler','duelist','survivor','medic','scout','bulwark'],wt:['fist','staff','spear'],at:['lightarmor']});
Object.assign(BG.spellblade,{style:'melee',pool:['duelist','vanguard','skirmisher','tactician','scout','brute'],wt:['sword','greatsword','staff','dagger','flintlock'],at:['lightarmor','medarmor']});
Object.assign(BG.wildling,{style:'melee',pool:['berserker','brute','survivor','vanguard','skirmisher','shadow','marksman','brawler'],wt:['axe','mace','hammer','spear','bow'],at:['lightarmor','medarmor']});
Object.assign(BG.knight,{style:'melee',pool:['vanguard','bulwark','shieldbearer','duelist','brute','tactician','survivor','champion'],wt:['sword','mace','hammer','greatsword','shield'],at:['medarmor','heavyarmor']});
BG.hunter.r=[['qi',.2],['aura',.12],['chi',.08],['mana',.05]];      // a hunter's gift, if any, comes as its archery variant
RACE.human.noWt=[];RACE.elf.noWt=['flintlock','hammer'];RACE.dwarf.noWt=['bow','polearm'];RACE.halforc.noWt=['bow','crossbow','flintlock'];   // weapon masteries a race never learns
/* ---- More backgrounds (phase 6): every field in one entry. w is the rarity weight in the tavern draw (wpickBG), town (1-3) the
   smallest settlement that hires them out, bio the biomes where they turn up more often (x2). tr: trait weights (see TRAITS; 1 when
   absent, 0 = never). look: appearance hints for the art {hat, cloth, accent, trim, hair?, beard?} in the portrait vocabulary
   (the look agent's vocabulary: hat hood straw cap band feather circlet skullcap mask coif kettle nasal wide capotain feathercap cowl wrap bandana furcap
   miner scholar; cloth green night brown tan red purple blue white steel straw bone verd black; accent crimson ochre forest verdigris teal sky royal violet
   charcoal black bone brown tan white grey rust; trim gold white steel or ''; garb apron smith fine rope welts sash stripes patches fleece bandolier tabard
   vials eye tatters manica; prop (portrait only) shovel lute book scourge pick net crook censer cleaver tongs flask axe chisel; hair; beard). ---- */
Object.assign(BG,{
 gravedigger:{n:'Gravedigger',cost:110,wage:9,w:3,st:{hp:4,fat:8,brv:8,init:-4},r:[['chi',.12],['mana',.04]],gear:['mallet|club|hatchet','rags|jack','hood|-'],
  style:'melee',pool:['survivor','brawler','bulwark','medic','vanguard','brute'],wt:['hammer','mace','axe','polearm','dagger'],at:['lightarmor','medarmor'],
  tr:{superstitious:0,brave:2,craven:.5,nightowl:2.5,drunkard:2,tough:1.5},look:{hat:'nasal',cloth:'night',accent:'crimson',trim:'gold',garb:'tabard'}},
 butcher:{n:'Butcher',cost:140,wage:10,w:4,st:{hp:6,ms:5,md:-2,brv:2},r:[['qi',.1]],gear:['handaxe|hatchet|knife|seax|huntknife','jack|padded','-|cap'],
  style:'melee',pool:['brute','berserker','vanguard','brawler','survivor','medic','duelist'],wt:['axe','dagger','mace','hammer'],at:['lightarmor','medarmor'],
  tr:{bloodthirsty:3,tough:2,hulking:1.5,fragile:.3,tiny:.3,superstitious:.5},look:{hat:'',cloth:'white',accent:'crimson',trim:'',garb:'apron',prop:'cleaver',beard:'full'}},
 blacksmith:{n:'Blacksmith',cost:260,wage:15,w:3,st:{hp:6,fat:10,ms:5,init:-6},r:[['aura',.1],['qi',.06]],gear:['mallet|mallet|horsepick','leather|padded|hide','-|-|roundshield','armcap|cap'],
  style:'melee',pool:['brute','bulwark','shieldbearer','vanguard','survivor','brawler','tactician'],wt:['hammer','mace','axe','polearm','shield'],at:['medarmor','heavyarmor'],
  tr:{hulking:3,athletic:2,tough:1.5,tiny:.2,fragile:.4,steady:1.5,asthmatic:1.5},look:{hat:'',cloth:'brown',accent:'rust',trim:'steel',garb:'smith',prop:'tongs',beard:'short'}},
 miner:{n:'Miner',cost:150,wage:11,w:4,st:{hp:5,fat:12,init:-5,rd:-2},r:[['chi',.08],['qi',.06]],gear:['horsepick|mallet|hatchet','jack|padded','armcap|cap'],bio:['hills','snow'],
  style:'melee',pool:['survivor','brute','bulwark','brawler','shieldbearer','medic','scout'],wt:['hammer','axe','mace','dagger'],at:['lightarmor','medarmor'],
  tr:{athletic:2,asthmatic:2,nearsight:2,tough:1.5,tiny:1.5,nightowl:2,eagle:.4},look:{hat:'miner',cloth:'black',accent:'ochre',trim:'',garb:'patches',prop:'pick',beard:'stache'}},
 woodcutter:{n:'Woodcutter',cost:150,wage:11,w:4,st:{hp:6,ms:5,fat:6,md:-2},r:[['qi',.12],['chi',.05]],gear:['hatchet|handaxe|handaxe','jack|hide','-|hood'],bio:['forest'],
  style:'melee',pool:['brute','vanguard','survivor','scout','berserker','brawler'],wt:['axe','polearm','bow','dagger'],at:['lightarmor','medarmor'],
  tr:{athletic:2,hulking:2,beastwise:1.5,tough:1.5,superstitious:1.5,tiny:.3},look:{hat:'furcap',cloth:'red',accent:'brown',trim:'',garb:'fleece',prop:'axe',beard:'full'}},
 poacher:{n:'Poacher',cost:180,wage:12,w:4,st:{rs:9,init:6,brv:-3},r:[['qi',.15],['aura',.06],['chi',.04]],gear:['huntbow|huntbow|huntxbow|shortbow','rags|jack','hood'],side:'knife|dirk',bio:['forest','swamp'],
  style:'ranged',pool:['marksman','scout','skirmisher','survivor','sharpshooter','brawler','rogue'],wt:['bow','crossbow','dagger','axe'],at:['lightarmor'],
  tr:{eagle:3,nightowl:3,beastwise:2,greedy:1.5,nearsight:.2,loyal:.5},look:{hat:'hood',cloth:'green',accent:'forest',trim:'',garb:'bandolier',prop:'net'}},
 caravan:{n:'Caravan guard',cost:280,wage:16,w:3,st:{ms:6,md:4,brv:4,hp:3},r:[['aura',.2],['chi',.05]],gear:['spear|boarspear|shortsword|ironmace','padded|leather','roundshield|buckler|kite','cap|coif'],bio:['desert','plains'],town:2,
  style:'melee',pool:['bulwark','shieldbearer','vanguard','tactician','survivor','marksman','scout'],wt:['spear','sword','mace','crossbow','shield'],at:['medarmor','heavyarmor'],
  tr:{loyal:2,steady:1.5,brave:1.5,athletic:1.5,craven:.6},look:{hat:'cap',cloth:'tan',accent:'teal',trim:'steel',garb:'sash'}},
 deserter:{n:'Deserter',cost:200,wage:13,w:4,st:{ms:6,md:3,brv:-8,init:4},r:[['aura',.12],['qi',.06]],gear:['spear|bill|oldsword|warspear','padded|leather|jack','-|buckler','cap|kettle|-'],
  style:'melee',pool:['vanguard','skirmisher','survivor','tactician','shieldbearer','scout','brute'],wt:['spear','polearm','sword','crossbow','shield'],at:['lightarmor','medarmor'],
  tr:{craven:4,brave:.3,quick:2,greedy:1.5,drunkard:1.5,loyal:.2},look:{hat:'cap',cloth:'red',accent:'grey',trim:'',garb:'tatters',beard:'goatee'}},
 brigand:{n:'Brigand',cost:210,wage:13,w:4,st:{ms:7,init:4,brv:2,md:-2},r:[['qi',.15],['aura',.06]],gear:['hatchet|club|seax|falchion|spikedclub','jack|hide|leather','-|targe|roundshield','hood|cap|-'],
  style:'melee',pool:['berserker','skirmisher','brawler','duelist','vanguard','scout','assassin','rogue','dualwield'],wt:['axe','mace','sword','dagger','shield'],at:['lightarmor','medarmor'],
  tr:{greedy:3,cocky:2,bloodthirsty:2,loyal:.3,brave:1.5},look:{hat:'bandana',cloth:'night',accent:'crimson',trim:'',garb:'bandolier',beard:'goatee'}},
 pitfighter:{n:'Pit fighter',cost:300,wage:18,w:2,st:{ms:9,hp:6,init:5,md:-3,brv:6},r:[['qi',.3],['chi',.08]],gear:['spikedclub|knife|-|hatchet|cestus','rags|hide','-'],town:2,
  style:'melee',pool:['brawler','berserker','duelist','survivor','brute','skirmisher','vanguard','gladiator','dualwield'],wt:['fist','mace','axe','dagger'],at:['lightarmor','medarmor'],
  tr:{hardhead:3,glassjaw:1.5,cocky:3,tough:2,bloodthirsty:2,craven:.3,fragile:.3},look:{hat:'',cloth:'red',accent:'tan',trim:'',garb:'manica',hair:'mohawk'}},
 veteran:{n:'Retired soldier',cost:520,wage:26,w:2,st:{ms:10,md:6,brv:10,init:-6,fat:-5,hp:2},r:[['aura',.3],['chi',.05]],gear:['warspear|arming|bill|ironmace','mail|brigandine|leather','kite|roundshield','kettle|nasal|coif'],town:2,
  style:'melee',pool:['vanguard','bulwark','shieldbearer','tactician','survivor','duelist','medic','brute'],wt:['spear','polearm','sword','mace','shield'],at:['medarmor','heavyarmor'],
  tr:{steady:3,brave:2,sluggish:2.5,drunkard:2,asthmatic:1.5,quick:.4,craven:.3,cocky:.4},look:{hat:'kettle',cloth:'steel',accent:'crimson',trim:'steel',garb:'tabard',beard:'stache'}},
 watchman:{n:'Watchman',cost:170,wage:12,w:4,st:{md:4,rd:3,brv:4,init:2},r:[['aura',.12],['chi',.05]],gear:['club|spear|bill|ironmace','padded|jack','buckler|-','cap|kettle|hood'],town:2,
  style:'melee',pool:['bulwark','shieldbearer','tactician','vanguard','marksman','survivor'],wt:['mace','spear','polearm','crossbow','shield'],at:['lightarmor','medarmor'],
  tr:{nightowl:4,eagle:1.5,loyal:1.5,drunkard:1.5},look:{hat:'kettle',cloth:'blue',accent:'ochre',trim:'',garb:'tabard'}},
 noble:{n:'Noble scion',cost:600,wage:34,w:1,st:{ms:6,md:4,brv:8,fat:-6,hp:-3},r:[['aura',.35],['mana',.1]],gear:['arming|falchion|shortsword','brigandine|leather|padded','heater|kite|buckler','coif|cap'],side:'pistol|-|rondel',town:3,
  style:'melee',pool:['duelist','tactician','vanguard','bulwark','shieldbearer','skirmisher','sharpshooter'],wt:['sword','greatsword','flintlock','dagger','shield'],at:['medarmor','heavyarmor'],
  tr:{cocky:4,greedy:3,fragile:1.5,dexterous:2,loyal:.5,drunkard:1.5,hulking:.5},look:{hat:'feathercap',cloth:'purple',accent:'royal',trim:'gold',garb:'fine',hair:'swept'}},
 hedgeknight:{n:'Hedge knight',cost:700,wage:32,w:1,st:{ms:12,md:6,hp:8,fat:4,brv:8,init:-8},r:[['aura',.6],['qi',.1]],gear:['bastard|greatsword|warhammer|beardaxe','mail|brigandine','kite|roundshield|-','nasal|kettle|spangen'],town:2,
  style:'melee',pool:['brute','vanguard','bulwark','duelist','berserker','survivor','shieldbearer','brawler'],wt:['greatsword','sword','hammer','axe','shield'],at:['medarmor','heavyarmor'],
  tr:{hulking:3,greedy:2,drunkard:1.5,brave:2,tough:1.5,tiny:.2},look:{hat:'nasal',cloth:'brown',accent:'crimson',trim:'steel',garb:'tabard',beard:'short'}},
 witchhunter:{n:'Witch hunter',cost:520,wage:26,w:1,st:{rs:10,brv:12,init:4,ms:-2},r:[['aura',.2],['mana',.15],['chi',.1]],gear:['lightxbow|huntxbow|crossbow|pistol','leather|padded','cap|hood'],side:'shortsword|dirk',town:2,
  style:'ranged',pool:['sharpshooter','marksman','tactician','duelist','survivor','scout','skirmisher'],wt:['crossbow','flintlock','sword','dagger','bow'],at:['lightarmor','medarmor'],
  tr:{superstitious:0,brave:3,steady:2,eagle:1.5,craven:.2,cocky:1.5},look:{hat:'capotain',cloth:'black',accent:'bone',trim:'white',garb:'bandolier'}},
 apothecary:{n:'Apothecary',cost:300,wage:18,w:2,st:{hp:-4,ms:-4,init:2,brv:-2,rs:2},r:[['chi',.45],['mana',.15]],gear:['knife|staff|dirk','robe|padded|jack','hood|-'],town:2,
  style:'support',pool:['medic','tactician','survivor','scout','sharpshooter','skirmisher'],wt:['dagger','staff','crossbow','fist'],at:['lightarmor'],
  tr:{steady:3,dexterous:2,nearsight:2,asthmatic:1.5,bloodthirsty:.2,drunkard:.5},look:{hat:'scholar',cloth:'green',accent:'white',trim:'',garb:'vials',prop:'flask'}},
 flagellant:{n:'Flagellant',cost:160,wage:9,w:2,st:{hp:10,brv:14,md:-6,init:-2},r:[['chi',.25],['aura',.15]],gear:['club|spikedclub|knife','rags','-'],
  style:'melee',pool:['berserker','survivor','brawler','medic','vanguard','bulwark'],wt:['mace','fist','dagger','staff'],at:['lightarmor'],
  tr:{superstitious:3,brave:3,craven:0,tough:2,fragile:0,cocky:0,greedy:0,loyal:2},look:{hat:'cowl',cloth:'bone',accent:'crimson',trim:'',garb:'welts',prop:'scourge',hair:'bald'}},
 sailor:{n:'Sailor',cost:170,wage:12,w:3,st:{fat:8,init:6,md:2,rd:2,hp:2},r:[['qi',.12],['aura',.08]],gear:['seax|hatchet|falchion|boarspear','jack|rags|padded','hood|-|-'],side:'-|-|-|-|-|knife|knife|pistol',bio:['swamp','plains'],
  style:'melee',pool:['skirmisher','brawler','duelist','survivor','scout','marksman','berserker','rogue','gladiator'],wt:['dagger','axe','sword','spear','flintlock'],at:['lightarmor'],
  tr:{drunkard:3,superstitious:3,athletic:2,dexterous:1.5,asthmatic:.4},look:{hat:'bandana',cloth:'blue',accent:'white',trim:'',garb:'stripes',beard:'chops'}},
 nomad:{n:'Nomad rider',cost:280,wage:15,w:2,st:{rs:8,init:10,md:2,hp:-2},r:[['qi',.2],['aura',.1]],gear:['shortbow|huntbow|recurve','hide|leather|jack','cap|hood'],side:'falchion|seax|knife',bio:['desert','plains','snow'],
  style:'ranged',pool:['marksman','skirmisher','scout','sharpshooter','duelist','survivor','berserker','shadow'],wt:['bow','sword','dagger','spear','axe'],at:['lightarmor','medarmor'],
  tr:{quick:3,beastwise:3,eagle:2,sluggish:.3,loyal:1.5},look:{hat:'wrap',cloth:'tan',accent:'rust',trim:'gold',garb:'sash'}},
 beggar:{n:'Beggar',cost:40,wage:4,w:4,st:{hp:-6,fat:-8,ms:-6,brv:-6,init:4},r:[['chi',.1],['mana',.05],['qi',.05]],gear:['knife|club|-','rags','-'],
  style:'melee',pool:['survivor','skirmisher','scout','brawler','medic','duelist','rogue'],wt:['dagger','mace','fist','staff'],at:['lightarmor'],
  tr:{lucky:3,fragile:2,drunkard:2.5,craven:2,asthmatic:2,hulking:.2,cocky:.3},look:{hat:'',cloth:'brown',accent:'grey',trim:'',garb:'tatters',hair:'shaggy',beard:'long'}},
 /* the rogues (assassin, rogue and shadowdancer trees): a knife for hire and a fairground tumbler */
 cutthroat:{n:'Cutthroat',cost:260,wage:15,w:2,st:{ms:6,init:10,md:3,hp:-3,brv:-2},r:[['qi',.12],['aura',.06]],gear:['dirk|seax|knife|shortsword|baselard|bollock','jack|padded|rags','hood|-'],side:'knife|-',town:2,
  style:'melee',pool:['assassin','rogue','shadow','duelist','skirmisher','scout','survivor','berserker','dualwield'],wt:['dagger','sword','crossbow','fist'],at:['lightarmor'],
  tr:{bloodthirsty:2.5,greedy:2,quick:2,cocky:1.5,brave:.7,loyal:.3},look:{hat:'hood',cloth:'black',accent:'crimson',trim:'',garb:'sash'}},
 acrobat:{n:'Tumbler',cost:210,wage:12,w:2,st:{init:16,md:6,rd:4,hp:-4,fat:6,ms:-3},r:[['chi',.12],['qi',.1]],gear:['knife|shortsword|-','rags|jack','-|hood'],town:2,
  style:'melee',pool:['shadow','skirmisher','duelist','rogue','scout','brawler','survivor','dualwield'],wt:['dagger','sword','fist','staff'],at:['lightarmor'],
  tr:{athletic:3,dexterous:3,quick:2.5,tiny:1.5,hulking:.2,sluggish:.2,asthmatic:.3,clumsy:0},look:{hat:'band',cloth:'red',accent:'ochre',trim:'',garb:'stripes',hair:'swept'}},
 /* the arena (29-colosseum.js): a gladiator of the school, bought out of the sand; mostly in the colosseum's own tavern */
 gladiator:{n:'Gladiator',cost:640,wage:30,w:.5,st:{ms:12,md:6,hp:8,fat:6,brv:8,init:4,rd:-4,rs:-6},r:[['aura',.25],['qi',.15],['chi',.05]],gear:['gladius|gladius|sica|trident|spatha','manica|manica|harness','parma|scutum|-','galea|thraexhelm|-'],town:3,
  style:'melee',pool:['gladiator','champion','duelist','brawler','vanguard','berserker','survivor','shieldbearer','dualwield'],wt:['sword','spear','fist','dagger','shield'],at:['lightarmor','medarmor'],
  tr:{showman:4,cocky:2.5,brave:2,athletic:2,bloodthirsty:1.5,hardhead:1.5,craven:.2,loyal:.6,greedy:1.5,asthmatic:.3},look:{hat:'',cloth:'red',accent:'gold',trim:'gold',garb:'manica',hair:'short'}},
 cultist:{n:'Ex-cultist',cost:380,wage:20,w:1,st:{brv:4,hp:-4,ms:-4},r:[['mana',.7],['chi',.15]],gear:['staff|knife|pilgrim','robe|rags','hood'],town:2,
  style:'caster',pool:['survivor','medic','tactician','skirmisher','scout','berserker','brawler'],wt:['staff','dagger','mace'],at:['lightarmor'],
  tr:{superstitious:0,nightowl:3,craven:1.5,bloodthirsty:2,lucky:1.5,loyal:.5},look:{hat:'hood',cloth:'purple',accent:'violet',trim:'',garb:'eye',prop:'censer'}},
 /* the gunners (the gun backgrounds): six who come to the company with a firearm in hand. core: the style tree every recruit of the
    background carries (rollTrees, 61-talents.js): Musketry (gunner) for the long guns of the line, Pistolier (pistol) for the
    pistoleer, Grenadier (powder) for the sapper and the siege gunner. d: a line about them. Towns and cities hire most of them; a village sees
    the sapper and the fowler. */
 arquebusier:{n:'Arquebusier',cost:240,wage:14,w:3.5,st:{rs:8,md:2,brv:4,init:-4},r:[['aura',.12],['chi',.05]],gear:['arquebus|arquebus|handgonne|caliver','padded|jack|leather','kettle|cap|-'],side:'shortsword|oldsword|knife|-',town:2,
  style:'ranged',core:'gunner',pool:['gunner','powder','marksman','bulwark','tactician','survivor','shieldbearer','vanguard'],wt:['flintlock','sword','dagger','spear','polearm'],at:['lightarmor','medarmor'],
  d:'Drilled on the town green with match and powder horn: the militia’s gun, paid by the watch and now by whoever pays better.',
  tr:{steady:2.5,loyal:1.5,brave:1.3,eagle:1.5,nearsight:.5,craven:.7},look:{hat:'feather',cloth:'red',accent:'ochre',trim:'',garb:'bandolier',beard:['stache','short','']}},
 gunner:{n:'Siege gunner',cost:360,wage:20,w:1.5,st:{hp:8,fat:8,rs:6,brv:6,init:-10,md:-3},r:[['aura',.1],['qi',.08]],gear:['arquebus|caliver|handgonne|blunder','leather|padded|jack|hide','armcap|cap|kettle|-'],side:'mallet|hatchet|-',town:2,
  style:'ranged',core:'powder',pool:['powder','gunner','brute','bulwark','survivor','tactician','vanguard','brawler'],wt:['flintlock','hammer','axe','mace','polearm'],at:['lightarmor','medarmor'],
  d:'A cannoneer’s mate from the siege trains, half deaf and wholly unafraid of noise: slow on their feet, hard to knock down, and very good at making holes.',
  tr:{tough:2,hulking:2,steady:1.5,asthmatic:1.5,sluggish:1.5,drunkard:1.5,quick:.5,craven:.4,tiny:.4},look:{hat:'bandana',cloth:'brown',accent:'charcoal',trim:'',garb:'apron',beard:['full','short','chops'],marks:{soot:1}}},
 pistoleer:{n:'Pistoleer',cost:560,wage:28,w:1,st:{rs:7,init:10,md:4,ms:3,hp:-3,brv:3},r:[['qi',.2],['aura',.12]],gear:['pistol','leather|padded|brigandine','-|-|cap'],side:'arming|falchion|shortsword|pistol',town:3,
  style:'ranged',core:'pistol',pool:['pistol','duelist','skirmisher','scout','dualwield','rogue','tactician','sharpshooter'],wt:['flintlock','sword','dagger'],at:['lightarmor','medarmor'],
  d:'A city duellist with a wheellock in the sash and a blade on the hip: rides in close, fires, and is gone before the smoke clears.',
  tr:{quick:2.5,cocky:3,dexterous:2,greedy:2,showman:1.5,sluggish:.3,loyal:.5},look:{hat:'feathercap',cloth:'black',accent:'crimson',trim:'gold',garb:'sash',hair:['swept','long','short'],beard:['goatee','stache','']}},
 sapper:{n:'Sapper',cost:130,wage:10,w:1.5,st:{rs:4,init:4,fat:6,hp:-2,brv:-4,ms:-2},r:[['chi',.08],['mana',.05]],gear:['handgonne','rags|jack|padded','armcap|cap|-'],side:'hatchet|knife|mallet|-',bio:['hills'],
  style:'ranged',core:'powder',pool:['powder','gunner','survivor','scout','brawler','skirmisher','medic','thrower'],wt:['flintlock','axe','dagger','hammer','throwing'],at:['lightarmor'],
  d:'A powder monkey grown up: dug mines under walls, carried the kegs, lit the fuses, and kept most of their fingers. Comes with an old hand cannon and a cough.',
  tr:{lucky:2,asthmatic:2,tiny:1.5,fragile:1.5,craven:1.5,steady:1.5,nightowl:1.5,hulking:.4},look:{hat:'bandana',cloth:'tan',accent:'rust',trim:'',garb:'patches',prop:'shovel',marks:{soot:1}}},
 fowler:{n:'Fowler',cost:180,wage:12,w:1.5,st:{rs:10,init:4,fat:4,ms:-4,brv:-2},r:[['qi',.15],['chi',.05]],gear:['handgonne|handgonne|arquebus','rags|jack|padded','hood|-'],side:'knife|huntknife',bio:['swamp'],
  style:'ranged',core:'gunner',pool:['gunner','powder','marksman','sharpshooter','scout','survivor','skirmisher','medic'],wt:['flintlock','bow','dagger','axe','spear'],at:['lightarmor'],
  d:'A market hunter of the marshes: a long fowling piece, a punt, and a hundred ducks a morning for the town stalls. Patient, and a fine shot.',
  tr:{eagle:2.5,beastwise:2,nightowl:1.5,steady:1.5,loyal:1.3,nearsight:.2,sluggish:.6},look:{hat:'wide',cloth:'verd',accent:'brown',trim:'',garb:'fleece',prop:'net'}},
 musketeer:{n:'Musketeer',cost:600,wage:28,w:1,st:{rs:12,ms:4,md:3,brv:8,fat:4,init:-6},r:[['aura',.25],['qi',.05]],gear:['caliver|caliver|arquebus|carbine','leather|padded|brigandine|mail','kettle|cap|nasal'],side:'arming|shortsword|falchion|oldsword',town:2,
  style:'ranged',core:'gunner',pool:['gunner','powder','sharpshooter','marksman','tactician','vanguard','bulwark','survivor','shieldbearer'],wt:['flintlock','sword','polearm','spear','mace'],at:['lightarmor','medarmor'],
  d:'Twenty years in a lord’s gunline: fires by the drum, reloads by feel, and has stood still in front of a cavalry charge more often than anyone sane.',
  tr:{steady:3,brave:2,loyal:1.5,drunkard:1.5,eagle:1.3,craven:.3,quick:.6},look:{hat:'capotain',cloth:'blue',accent:'royal',trim:'white',garb:'tabard',beard:['goatee','stache','full']}}
});
/* The Beast Slayer: the one sword of the Solo origin (ORIGINS.slayer). w 0 and noHire: never in a tavern, a rival roster or an event. */
BG.slayer={n:'Beast slayer',cost:1100,wage:30,w:0,noHire:1,st:{hp:12,ms:10,rs:8,md:6,rd:4,fat:12,brv:16,init:6},r:[['qi',.2],['aura',.12]],
 gear:['boarspear','leather','cap'],side:'huntxbow',
 style:'melee',pool:['survivor','vanguard','skirmisher','scout','berserker','duelist','brute'],wt:['spear','axe','sword','crossbow','dagger'],at:['medarmor','lightarmor'],
 tr:{beastwise:4,tough:2,brave:2,athletic:2,craven:0,fragile:.3,superstitious:.3},look:{hat:'hood',cloth:'black',accent:'charcoal',trim:'steel',garb:'bandolier',beard:'short'}};
/* Isekai: the background of The Isekai origin's hero (ORIGINS.isekai, 28i-isekai.js), balanced and a little better than a recruit everywhere. w 0 and noHire:
   never in a tavern, a rival roster or an event. The hero's own trees, weapon family and armor tree are chosen (m.cc); these are the
   background's defaults for anything else that makes one. */
BG.isekai={n:'Isekai',proper:1,d:'A stranger from another world: woke in a field under two moons with strange clothes, no past here and a knack for learning fast.',cost:700,wage:12,w:0,noHire:1,st:{hp:6,fat:6,init:6,ms:6,rs:6,md:3,rd:3,brv:6},r:[],
 gear:['oldsword','padded','cap'],style:'melee',pool:['vanguard','duelist','skirmisher','survivor','tactician','scout','marksman','brute','bulwark'],
 wt:['sword','spear','bow','dagger','shield'],at:['lightarmor','medarmor'],tr:{},
 look:{hat:'',cloth:'black',accent:'white',trim:'gold',garb:'fine',hair:'swept'}};
// a background's name inside a sentence: lowercased ('a level 3 sellsword'), unless it is a proper name (proper: 'Isekai')
function bgLow(k){const b=BG[k];return b?b.proper?b.n:b.n.toLowerCase():''}
/* The Monster hunter tree as one of a recruit's 4 trees: hw is the chance rollTrees puts it in place of the 4th style tree ('hunter' in pool). */
for(const [k,w] of [['slayer',1],['hunter',.6],['poacher',.6],['witchhunter',.5],['wildling',.5],['fowler',.3],['woodcutter',.15],['nomad',.15],['butcher',.1]])if(BG[k]){BG[k].hw=w;if(!BG[k].pool.includes('hunter'))BG[k].pool.push('hunter')}
for(const k in BG)if(!BG[k].m)BG[k].m=BG[k].pool.slice(0,2);
for(const k in BG){const b=BG[k];if(b.town)b.size=b.town;if(b.bio)b.biomes=b.bio}   // the names 50-towns' recruitBG also reads (size: minimum town size, biomes)                              // the old two-mastery list (read by nothing new; kept for shape)
/* Trait weights and looks of the first twelve backgrounds (the portraits already draw these hats). */
Object.assign(BG.farmhand,{tr:{athletic:2,tough:2,hulking:1.5,drunkard:1.5,loyal:1.5,superstitious:2,cocky:.5},look:{hat:'straw',cloth:'tan',accent:'brown',trim:''}});
Object.assign(BG.militia,{tr:{loyal:2,brave:1.5,craven:1.5,steady:1.2},look:{hat:'kettle',cloth:'red',accent:'tan',trim:''}});
Object.assign(BG.hunter,{tr:{eagle:3,nightowl:2,beastwise:3,quick:1.5,nearsight:.2},look:{hat:'hood',cloth:'green',accent:'brown',trim:''}});
Object.assign(BG.thief,{tr:{quick:3,dexterous:3,greedy:3,lucky:2,craven:1.5,hulking:.2,loyal:.3},look:{hat:'hood',cloth:'night',accent:'black',trim:''}});
Object.assign(BG.sellsword,{tr:{greedy:3,cocky:2,brave:1.5,bloodthirsty:1.5,loyal:.4},look:{hat:'band',cloth:'red',accent:'steel',trim:'steel'}});
Object.assign(BG.squire,{tr:{loyal:3,brave:2,cocky:2,athletic:1.5,drunkard:.3,greedy:.5},look:{hat:'',cloth:'blue',accent:'white',trim:'white',hair:'bowl'}});
Object.assign(BG.hedge,{tr:{nearsight:2,fragile:2,superstitious:1.5,steady:1.5,nightowl:2,hulking:.2},look:{hat:'circlet',cloth:'purple',accent:'blue',trim:'gold'}});
Object.assign(BG.acolyte,{tr:{loyal:2,brave:2,superstitious:2,drunkard:.3,greedy:.3,bloodthirsty:.3},look:{hat:'band',cloth:'white',accent:'straw',trim:'gold'}});
Object.assign(BG.monk,{tr:{athletic:3,quick:2,dexterous:2,brave:2,drunkard:0,greedy:0,cocky:.3},look:{hat:'',cloth:'straw',accent:'brown',trim:'',hair:'tonsure'}});
Object.assign(BG.spellblade,{tr:{cocky:3,quick:2,dexterous:2,greedy:1.5,asthmatic:1.5},look:{hat:'circlet',cloth:'blue',accent:'white',trim:'gold'}});
Object.assign(BG.wildling,{tr:{hulking:2,tough:2,superstitious:3,beastwise:3,bloodthirsty:2,nearsight:.3},look:{hat:'feather',cloth:'tan',accent:'green',trim:'',hair:'shaggy'}});
Object.assign(BG.knight,{tr:{brave:3,cocky:2,drunkard:2,greedy:1.5,steady:1.5,craven:.3,tiny:.3},look:{hat:'nasal',cloth:'night',accent:'red',trim:'gold'}});
/* ---- Character traits (phase 6). 0-2 per merc, rolled at creation (rollTraits in 30-mercs.js) weighted by background (BG[bg].tr, also
   mirrored as TRAITS[k].bg {bgKey: weight}); never a trait together with its opp. TRAITS[k] = {n, d, good, st?:{stat deltas, added in calc},
   mod?:{flag: number, summed into calc(m).flags}, flag?:string (a 1 in calc(m).flags), wage?:fraction of the background's wage (mercWage)}.
   The battle flags (60-battle-core.js): badMor (to every morale check against bad news), killMor (to the morale check after its own kill),
   superst (taken off every morale check in a battle against TRAITF.superst factions), beastwise (no bad-news morale checks at all against
   TRAITF.beast factions), headDef (head-hit chance against it lowered), headB (its weapon attacks' head-hit chance, as the perk), vsHurt,
   dmgMelee (as the perks), fatRec (fatigue recovered each turn on top of 15), lucky (one killing blow a battle leaves it at 1 hitpoint),
   cocky (starts a battle Confident), nightowl (NIGHTOWL bonus in battles that start at night: from 20:00 to 05:00). d states the numbers. ---- */
const TRAITF={superst:['undead','void','wyvern'],beast:['beast','serpent','ogre','wyvern']},NIGHTOWL={ms:5,rs:8,init:10};
const TRAITS={
 brave:{n:'Brave',good:true,opp:'craven',st:{brv:10},d:'+10 resolve.'},
 craven:{n:'Craven',good:false,opp:'brave',st:{brv:-10},mod:{badMor:-10},d:'-10 resolve, and a further -10 on every morale check against bad news (allies falling, heavy blows, being surrounded).'},
 hardhead:{n:'Hard-headed',good:true,opp:'glassjaw',mod:{headDef:10},d:'Blows land on its head 10% less often (head-hit chance -10 against it).'},
 glassjaw:{n:'Glass-jawed',good:false,opp:'hardhead',mod:{headDef:-10},d:'Blows land on its head 10% more often (head-hit chance +10 against it).'},
 athletic:{n:'Athletic',good:true,opp:'asthmatic',st:{fat:6},mod:{fatRec:3},d:'+6 maximum fatigue; sheds 18 fatigue at the start of each turn instead of 15.'},
 asthmatic:{n:'Asthmatic',good:false,opp:'athletic',st:{fat:-6},mod:{fatRec:-4},d:'-6 maximum fatigue; sheds only 11 fatigue at the start of each turn instead of 15.'},
 quick:{n:'Quick',good:true,opp:'sluggish',st:{init:10},d:'+10 initiative.'},
 sluggish:{n:'Sluggish',good:false,opp:'quick',st:{init:-10},d:'-10 initiative.'},
 eagle:{n:'Eagle-eyed',good:true,opp:'nearsight',st:{rs:6},d:'+6 ranged skill.'},
 nearsight:{n:'Near-sighted',good:false,opp:'eagle',st:{rs:-6},d:'-6 ranged skill.'},
 tough:{n:'Tough',good:true,opp:'fragile',st:{hp:6},d:'+6 hitpoints.'},
 fragile:{n:'Fragile',good:false,opp:'tough',st:{hp:-6},d:'-6 hitpoints.'},
 hulking:{n:'Hulking',good:true,opp:'tiny',st:{hp:4,init:-4},mod:{dmgMelee:.05},d:'+4 hitpoints, +5% melee damage, -4 initiative.'},
 tiny:{n:'Slight',good:false,opp:'hulking',st:{hp:-4,init:4,rd:3},d:'-4 hitpoints, +4 initiative, +3 ranged defense.'},
 dexterous:{n:'Dexterous',good:true,opp:'clumsy',st:{md:3,init:3},d:'+3 melee defense, +3 initiative.'},
 clumsy:{n:'Clumsy',good:false,opp:'dexterous',st:{md:-3,ms:-2},d:'-3 melee defense, -2 melee skill.'},
 steady:{n:'Steady-handed',good:true,st:{rs:3},mod:{headB:5},d:'+3 ranged skill; +5 head-hit chance with weapon attacks.'},
 bloodthirsty:{n:'Bloodthirsty',good:true,mod:{vsHurt:.1,killMor:10},d:'+10% damage against foes below half health; +10 to its morale check after making a kill.'},
 lucky:{n:'Lucky',good:true,flag:'lucky',d:'Once per battle, a blow that would kill it leaves it at 1 hitpoint instead (after Undying, if it has that too).'},
 drunkard:{n:'Drunkard',good:false,st:{ms:-4,rs:-6,brv:8},d:'-4 melee skill, -6 ranged skill, +8 resolve (Dutch courage).'},
 greedy:{n:'Greedy',good:false,opp:'loyal',wage:.25,d:'Wants 25% more wages (rounded).'},
 loyal:{n:'Loyal',good:true,opp:'greedy',st:{brv:5},wage:-.1,d:'+5 resolve; asks 10% less wages (rounded, at least 1).'},
 superstitious:{n:'Superstitious',good:false,mod:{superst:15},d:'-15 on every morale check when fighting the restless dead, riftspawn or wyverns.'},
 beastwise:{n:'Beast-wise',good:true,flag:'beastwise',d:'Never tests morale against bad news when fighting beasts, serpents, ogres or wyverns (0 checks: it holds 100% steady against them).'},
 nightowl:{n:'Night owl',good:true,flag:'nightowl',d:'In a battle that starts at night (20:00 to 05:00): +5 melee skill, +8 ranged skill, +10 initiative.'},
 cocky:{n:'Cocky',good:false,st:{md:-4},flag:'cocky',d:'Starts every battle Confident (+10 to hit, +5 defense until shaken); -4 melee defense.'},
 showman:{n:'Showman',good:true,st:{brv:5},flag:'showman',d:'+5 resolve. Plays to the crowd: in a colosseum bout every kill it makes adds 5% to the purse (up to +25%).'}
};
for(const k in TRAITS){const T=TRAITS[k];T.id=k;T.bg={};for(const b in BG){const w=BG[b].tr&&BG[b].tr[k];if(w!=null&&w!==1)T.bg[b]=w}}   // TRAITS[k].bg mirrors BG[b].tr
// Every ability carries a one-line description: mastery abilities take theirs from the perk that grants them.
for(const k in MAST)for(const p of MAST[k].p)if(p.ab&&AB[p.ab]&&!AB[p.ab].d){const d=p.d.replace(/^Unlocks[^.]*\.\s*/,'').replace(/^Ability:\s*/,'');AB[p.ab].d=d[0].toUpperCase()+d.slice(1)+'.'}
const NAMES=['Aldric','Brenna','Corvin','Dagny','Edda','Fenn','Garrick','Hesper','Ivo','Jorah','Kestrel','Lysa','Marek','Nessa','Osric','Petra','Quill','Rurik','Sable','Torvald','Una','Varek','Wren','Yara','Zane','Bram','Isolde','Tamsin','Hroth','Mira','Dunstan','Sorrel','Kael','Ottoline','Grett','Halvard'];
const TOWNN=['Harrowmere','Stonewick','Elderfen','Marrowgate','Thistledown','Greywater','Ashby Cross','Lanternhold','Corbenford','Saltmarsh Quay','Dunmoor','Redwater','Hollinbrook','Wyrmstead','Kestrel Hythe','Oldbarrow'];
const TOWNKIND=['','Hamlet','Town','City'];
const RUINS=[['The Broken Tower','Half a tower still stands, the stair open to the sky. Somebody carved a tally of days into the lintel and stopped at forty.'],
 ['Old Watchfort','A ring of tumbled wall on a rise. The hearth is cold but the stones are black from a thousand fires.'],
 ['The Sunken Chapel','The roof fell in long ago. Rain has pooled where the altar stood, and the bell lies cracked in the nave.'],
 ['Barrow of the Nine','Nine low mounds in a row, the doors sealed with slabs. The men walk past quietly and nobody jokes.'],
 ['The Fallen Abbey','Arches without a roof, and a garden gone wild inside the cloister. The well still gives clean water.'],
 ['Giant\'s Cairn','Stones too large for any cart, stacked as if by hand. The wind makes a low note between them.'],
 ['The Ashen Hall','A lord\'s hall burned to its footings. Melted glass glitters in the weeds where the windows were.'],
 ['Drowned Keep','Only the gatehouse is above ground now. The rest has slumped into the earth, and something has nested in it.'],
 ['The Pilgrim Stones','A circle of standing stones, each cut with a different hand\'s prayer. Fresh flowers lie at the tallest.'],
 ['Kingsroad Milefort','A fort from when the roads were kept. The gate is gone and the yard is full of thistles.']];
const EN={
 gob:{n:'Goblin skirmisher',hp:40,arm:20,ms:55,md:10,rd:10,init:130,d:[16,26],xp:90,role:'flanker',brv:35,flee:.4,abs:['gslip','gstab']},
 gobarch:{n:'Goblin archer',hp:35,arm:10,ms:40,rs:55,md:5,rd:10,init:125,d:[16,28],rng:5,xp:100,role:'sniper',brv:30,flee:.4,abs:['gpoison'],side:{n:'Goblin knife',wt:'dagger',d:[10,18],ap:3,fat:0,rng:1,ign:.2}},
 gobsham:{n:'Goblin shaman',hp:45,arm:15,ms:40,md:5,rd:10,init:110,d:[10,16],xp:180,role:'caster',brv:45,lead:1,max:1,sub:'gob',res:{mana:[26,4]},abs:['ghex','gchant']},
 skel:{n:'Skeleton legionary',hp:50,arm:60,helm:45,ms:55,md:10,rd:20,init:80,d:[24,36],xp:130,role:'line',brv:99,fearless:1,wall:1,shield:{hp:40,md:8,rd:12}},
 zomb:{n:'Shambler',hp:78,arm:0,ms:45,md:-5,rd:0,init:50,d:[20,34],ap:7,xp:110,role:'line',brv:99,fearless:1,abs:['zgrab']},
 necro:{n:'Necromancer',hp:50,arm:20,ms:40,md:5,rd:35,init:90,d:[10,18],xp:250,role:'caster',brv:70,fearless:0,lead:1,max:2,sub:'skel',res:{mana:[24,7]},abs:['nbolt','nraise']},
 wolf:{n:'Direwolf',hp:65,arm:15,ms:58,md:10,rd:10,init:150,d:[20,34],ap:11,quad:1,xp:130,role:'flanker',brv:50,pack:1},
 spider:{n:'Webspinner',hp:55,arm:15,ms:55,md:10,rd:10,init:140,d:[16,26],quad:1,xp:120,role:'beast',brv:45,abs:['sweb','sbite']},
 bear:{n:'Owlbear',hp:170,arm:40,ms:62,md:5,rd:0,init:90,d:[40,60],kb:1,kbCh:.4,quad:1,big:1,xp:380,role:'beast',brv:90,max:2,sub:'wolf',enrage:.5,abs:['bcharge','bswipe']},
 orcy:{n:'Orc brave',hp:100,arm:60,helm:30,ms:60,md:5,rd:5,init:100,d:[30,48],xp:200,role:'flanker',brv:60,tire:1,fury:6,fatMax:60,wfat:15,abs:['ocharge']},
 orcw:{n:'Orc warrior',hp:130,arm:130,helm:95,ms:65,md:8,rd:8,init:80,d:[42,62],kb:1,kbCh:.35,xp:330,role:'line',brv:70,tire:1,fury:6,fatMax:72,wfat:16,abs:['osmash']},
 orcl:{n:'Orc warlord',hp:190,arm:190,helm:150,ms:75,md:12,rd:10,init:90,d:[55,80],kb:1,kbCh:.5,big:1,xp:550,role:'boss',brv:90,lead:1,max:1,sub:'orcw',tire:1,fury:6,fatMax:90,wfat:16,abs:['owarcry','ocharge']},
 thug:{n:'Brigand thug',hp:55,arm:40,helm:20,ms:52,md:5,rd:5,init:100,d:[20,32],xp:100,role:'line',brv:25,shield:{hp:32,md:8,rd:8},abs:['shieldwall']},
 bmark:{n:'Brigand archer',hp:50,arm:30,helm:20,ms:45,rs:55,md:5,rd:5,init:105,d:[22,38],rng:6,xp:120,role:'sniper',brv:25,flee:.35,abs:['aimed'],side:{n:'Falchion',wt:'sword',d:[18,30],ap:4,fat:0,rng:1,ign:.2}},
 braid:{n:'Brigand raider',hp:70,arm:110,helm:70,ms:62,md:15,rd:15,init:105,d:[30,44],xp:220,role:'flanker',brv:32,dive:1,abs:['footwork']},
 blead:{n:'Brigand chief',hp:90,arm:70,helm:60,ms:72,md:14,rd:15,init:110,d:[40,56],xp:380,role:'caster',brv:75,lead:1,banner:1,max:1,sub:'braid',shield:{hp:64,md:12,rd:12},abs:['brally','shieldwall']},
 bxbow:{n:'Brigand crossbowman',hp:44,arm:30,helm:20,ms:40,rs:40,ign:.3,md:5,rd:8,init:95,d:[22,36],w:'lightxbow',xp:130,role:'sniper',brv:28,flee:.35,abs:['xaim'],side:{n:'Falchion',wt:'sword',d:[18,30],ap:4,fat:0,rng:1,ign:.2}},
 obrute:{n:'Orc crusher',hp:120,arm:110,helm:80,ms:62,md:4,rd:4,init:85,d:[56,84],w:'maul',wap:5,xp:300,role:'line',brv:70,tire:1,fury:6,fatMax:70,wfat:18,abs:['batter']},
 skelhal:{n:'Skeleton halberdier',hp:45,arm:50,helm:40,ms:50,md:0,rd:12,init:75,d:[28,42],w:'halberd',wap:5,xp:140,role:'line',brv:99,fearless:1,abs:['hook']},
 imp:{n:'Rift imp',hp:50,arm:20,ms:62,md:12,rd:12,init:150,d:[24,36],ap:11,xp:180,role:'flanker',brv:99,fearless:1,noCorpse:1,abs:['iblink']},
 vknight:{n:'Void knight',hp:120,arm:220,helm:180,ms:72,md:15,rd:12,init:70,d:[45,65],ap:8,xp:420,role:'line',brv:99,fearless:1,abs:['vreap']},
 vmage:{n:'Void weaver',hp:70,arm:40,ms:45,md:8,rd:10,init:105,d:[12,20],xp:380,role:'caster',brv:80,max:3,sub:'imp',res:{mana:[32,5]},abs:['vlance','vblink','vward']},
 tyrant:{n:'Rift tyrant',hp:340,arm:300,helm:240,ms:80,md:15,rd:10,init:100,d:[60,85],kb:2,kbCh:.6,big:1,boss:1,xp:1500,role:'boss',brv:99,fearless:1,lead:1,enrage:.34,noCorpse:1,abs:['tsummon','tnova']}
};
/* EN[id].w: an item id the foe fights with (its wt, range, reach, reload, crush and to-hit; d stays the foe's own and wap its AP).
   FACT[f].units: [enemy id, budget cost]. rank: [g, cap, h?, base?], how the faction's quality follows the budget (see foeRank in 64-foes.js). */
const FACT={
 gob:{n:'Goblins',g:'G',col:'#7a9a3c',skin:'#9fc25a',lair:'Burn out a goblin warren',units:[['gob',10],['gobarch',12],['gobsham',20]],rank:[.5,1.25],loot:['knife','shortbow','buckler','spear']},
 undead:{n:'Restless dead',g:'U',col:'#b9b39a',skin:'#e4e0cf',lair:'Put the restless dead to rest',units:[['skel',17],['zomb',16],['skelhal',22],['necro',30]],rank:[.3,1.4,0,17],loot:['shortsword','kite','spear','mail','bill','halberd']},
 beast:{n:'Beasts',g:'B',col:'#6b5137',skin:'#8a6b49',lair:'Clear a den of beasts',units:[['wolf',21],['wolf',21],['spider',20],['bear',58]],rank:[.38,1.2,.3],loot:[]},
 orc:{n:'Orcs',g:'O',col:'#4f6b46',skin:'#7c9b62',lair:'Break an orc warcamp',units:[['orcy',38],['orcw',62],['obrute',60],['orcl',105]],rank:[.46,1.6,.3,19],loot:['handaxe','waraxe','greataxe','leather','scale','maul','mallet','spiked']},
 bandit:{n:'Brigands',g:'R',col:'#5a5a66',skin:'#d9b99a',lair:'Root out a brigand hideout',units:[['thug',20],['bmark',25],['bxbow',32],['braid',44],['blead',71]],rank:[.5,.75,.3,19],loot:['shortsword','club','padded','leather','shortbow','mace','heater','lightxbow','crossbow','roundshield','pistol']},
 void:{n:'Riftspawn',g:'V',col:'#7a46b8',skin:'#b99be6',lair:'Purge a riftspawn nest',units:[['imp',28],['vknight',67],['vmage',56]],rank:[.45,1.45],loot:['arming','warspear','scale','focus','warbow','rondel','zweihander','arbalest','steeltower']}
};
const BIOKEY=[null,'plains','forest','hills',null,'swamp','desert','snow'];
const BIO={
 plains:{n:'Plains',top:'#86a455',side:'#6b5638',rough:'#6f8a47',amp:1.3,block:.04,rgh:.06,obj:'rock',sky:'#27403a'},
 forest:{n:'Forest',top:'#567f41',side:'#5a4630',rough:'#476a37',amp:1.6,block:.14,rgh:.08,obj:'tree',sky:'#1c342b'},
 hills:{n:'Hills',top:'#9a9a5c',side:'#6f6247',rough:'#84844f',amp:3.6,block:.06,rgh:.05,obj:'rock',sky:'#2f3d3c'},
 swamp:{n:'Swamp',top:'#5f7352',side:'#40452f',rough:'#3f6d70',amp:1,block:.06,rgh:.22,obj:'tree',sky:'#1f2d2b'},
 desert:{n:'Desert',top:'#d6b871',side:'#a5814a',rough:'#c4a55f',amp:2.3,block:.05,rgh:.08,obj:'rock',sky:'#4a3f33'},
 snow:{n:'Snowfield',top:'#dfe7ee',side:'#8d99a6',rough:'#c3d3e2',amp:2.4,block:.07,rgh:.1,obj:'tree',sky:'#334452'},
 ashen:{n:'The Ashen Reach',top:'#5a4646',side:'#2e1f1f',rough:'#4a3838',amp:2.6,block:.06,rgh:.04,haz:.09,obj:'rock',sky:'#2a1414'},
 hollow:{n:'The Hollow Void',top:'#4b4470',side:'#231f3b',rough:'#3c3660',amp:3.3,block:.09,rgh:.05,obj:'crystal',sky:'#120f24'},
 glass:{n:'The Glass Wastes',top:'#86adb5',side:'#476a73',rough:'#74999f',amp:2.5,block:.12,rgh:.05,haz:.03,obj:'crystal',sky:'#16303a'}
};
const REALMS=['ashen','hollow','glass'];
/* ---- Monsters update: serpents, ents, ogres, wyverns (their abilities live in 66-monsters.js) ----
   New EN fields: size (2 = the unit stands on 2x2 tiles: (c,r) (c+1,r) (c,r+1) (c+1,r+1); see unitTiles() in 60-battle-core.js),
   fly (moves ignore height steps and pass over props: trees, rocks), fireWeak (fire hits and burning do that much more: .5 = +50%),
   regen (share of max hitpoints regained at the start of each turn, never while burning), endgame (end-game monster: a famed item drops
   for certain), kbImm (cannot be knocked back; every size-2 unit is immune anyway).
   FACT[f].tier 'early' | 'mid' | 'late' | 'end' | 'crisis', FACT[f].biomes: world terrain names (plains forest hills mountains swamp desert snow;
   'mountains' means ground within 2 tiles of a peak), FACT[f].spawn {d0, d1, gate, w0, w1}: overrides of the tier's spawn curve
   (see factionPool in 40-world.js). FACT[f].build(budget, mult): the faction picks its own warband (the wyvern and its brood). */
Object.assign(EN,{
 adder:{n:'Marsh adder',hp:48,arm:10,helm:5,ms:58,md:14,rd:22,init:145,d:[14,22],ap:10,xp:85,role:'flanker',brv:40,flee:.3,serp:1,abs:['vbite','slither']},
 viper:{n:'Spitting viper',hp:38,arm:10,helm:5,ms:44,rs:56,md:8,rd:18,init:125,d:[12,20],rng:4,xp:100,role:'sniper',brv:35,flee:.35,serp:1,abs:['vspit'],side:{n:'Fangs',wt:'dagger',d:[10,16],ap:4,rng:1,ign:.3}},
 gserp:{n:'Great serpent',hp:210,arm:60,helm:45,ms:66,md:10,rd:12,init:110,d:[34,52],big:1,kbImm:1,xp:420,role:'beast',brv:85,max:1,sub:'adder',serp:1,abs:['coil','constrict','vbite']},
 thorn:{n:'Thornling',hp:52,arm:35,helm:20,ms:54,md:6,rd:16,init:100,d:[16,26],xp:95,role:'flanker',brv:99,fearless:1,fireWeak:.5,abs:['bramble']},
 ent:{n:'Ent',hp:200,arm:125,helm:80,ms:60,md:-5,rd:25,init:55,ap:8,d:[42,62],big:1,kbImm:1,xp:420,role:'line',brv:99,fearless:1,fireWeak:.5,regen:.05,abs:['entangle','limbcrush','barkskin']},
 elder:{n:'Elder ent',hp:300,arm:180,helm:120,ms:68,md:0,rd:30,init:65,ap:8,d:[54,78],big:1,kbImm:1,xp:700,role:'boss',brv:99,fearless:1,lead:1,max:1,sub:'ent',fireWeak:.5,regen:.06,abs:['groots','limbcrush','barkskin','grove']},
 ogre:{n:'Ogre',hp:185,arm:60,helm:35,ms:62,md:0,rd:0,init:85,d:[50,76],w:'maul',wap:5,big:1,kb:1,kbCh:.3,xp:380,role:'line',brv:70,abs:['ohurl','osweep']},
 aogre:{n:'Armored ogre',hp:200,arm:200,helm:150,ms:64,md:4,rd:6,init:75,d:[54,80],w:'warmaul',wap:5,big:1,kb:1,kbCh:.3,xp:520,role:'line',brv:80,abs:['oslam','ohurl']},
 wyvern:{n:'Wyvern',size:2,fly:1,hp:6400,arm:260,helm:200,ms:85,md:14,rd:10,init:120,ap:14,d:[150,200],ign:.45,xp:2400,role:'boss',boss:1,endgame:1,brv:99,fearless:1,abs:['wbite','wsting','wbuffet','wdive']},
 whatch:{n:'Wyvern hatchling',fly:1,hp:85,arm:30,helm:20,ms:62,md:16,rd:16,init:135,ap:10,d:[22,34],xp:200,role:'flanker',brv:70,abs:['hsting']}
});
Object.assign(FACT,{
 serpent:{n:'Serpents',g:'S',col:'#5d7a3a',skin:'#a7b85a',tier:'mid',biomes:['forest','desert','swamp'],spawn:{d0:7,d1:2,gate:.04},lair:'Clear a serpent nest',units:[['adder',11],['adder',11],['viper',13],['gserp',50]],rank:[.6,.95,.3],solo:[37.5,1.2],loot:['dirk','seax','stiletto','rondel','shortbow','padded','leather','cap'].filter(id=>ITEMS[id])},
 ent:{n:'Ents',g:'E',col:'#4d5f2e',skin:'#7f6a45',tier:'mid',biomes:['forest'],lair:'Burn out a blighted grove',units:[['thorn',16],['thorn',16],['ent',72],['elder',120]],rank:[.4,1.1,.25,19],loot:['witchstave','sigilrobe','longbow','recurve','staff','focus','robe','warbow'].filter(id=>ITEMS[id])},
 ogre:{n:'Ogres',g:'T',col:'#7a6a4a',skin:'#b59a72',tier:'mid',biomes:['hills','mountains','plains'],lair:'Break an ogre camp',units:[['ogre',62],['ogre',62],['aogre',80],['gob',10]],rank:[.42,.75,.25,19],solo:[2.5,5.1],loot:['spikedclub','morningstar','bellmace','knighthammer','lamellar','sallet','maul','warmaul','scale'].filter(id=>ITEMS[id])},
 wyvern:{n:'Wyverns',g:'W',col:'#6b4a3a',skin:'#a8604a',tier:'end',biomes:['mountains','snow','hills'],lair:'Slay the wyvern of {place}',units:[['wyvern',400],['whatch',40]],rank:[.34,1,.2],loot:['gothic','armet','greatbow','windlass','heater2','plate','arbalest','runegreat'].filter(id=>ITEMS[id]),
  build(budget,mult){const n=mult>=1.15?2:mult>=.9?1:0,L=['wyvern'];for(let i=0;i<n;i++)L.push('whatch');return L}}
});
FACT.gob.tier='early';FACT.bandit.tier='early';FACT.beast.tier='early';FACT.undead.tier='mid';FACT.orc.tier='mid';FACT.void.tier='crisis';
FACT.gob.biomes=['plains','forest','hills','swamp','desert','snow'];FACT.bandit.biomes=FACT.gob.biomes;FACT.beast.biomes=['plains','forest','hills','snow','swamp'];
FACT.undead.biomes=['plains','forest','hills','swamp','desert','snow'];FACT.undead.spawn={d0:4,d1:0,gate:0,w0:.6};
FACT.orc.biomes=['plains','hills','desert','snow','forest','mountains'];FACT.orc.spawn={d0:6,d1:2,gate:.06};FACT.void.biomes=FACT.gob.biomes;
Object.assign(STATUS,{
 venom:{n:'Wyvern venom',d:'Loses 14 hitpoints at the start of each of its turns, through armor.',icon:'venom',good:0},
 coiled:{n:'Coiled',d:'Crushed in a serpent\'s coils: cannot move, −15 melee defense, −10 melee skill. Ends when the serpent dies or lets go.',icon:'coiled',good:0},
 entangled:{n:'Entangled',d:'Roots hold it fast: cannot move, −10 melee and ranged defense.',icon:'entangled',good:0},
 bark:{n:'Barkskin',d:'Bark thickens over it: takes 30% less damage.',icon:'bark',good:1},
 regrow:{n:'Regrowth',d:'Regains hitpoints at the start of each turn. Fire stops it.',icon:'regrow',good:1},
 diving:{n:'Taking wing',d:'Climbing to dive: on its next turn it falls on the marked tiles. Get clear, or stun it to break the dive.',icon:'diving',good:0},
 grounded:{n:'Grounded',d:'A wing or leg is crippled: it cannot fly or dive.',icon:'grounded',good:0},
 slammed:{n:'Off balance',d:'Thrown off its feet: −10 melee and ranged defense until its next turn.',icon:'slammed',good:0}
});
/* ================= PHASE 7: THE LIVING WORLD (world agent; CONTRACT.md "Factions", "Towns", "Roaming parties") =================
   REPT      reputation tiers, low to high: {k, n, min} (min = the lowest standing of the tier, -100..100)
   REPK[k]   what a tier does: buy/sell/hire price factors, ctr (how much work the board posts for you), patience (negotiation rounds' slack),
             recruit (recruit odds), closed (markets shut), hunt (the house sends patrols after the company)
   HPERS     house personalities: {n, d, war (daily pull toward war), greed (price factor in its towns), pious, proud (rep losses x)}
   HOUSEN    house name roots (the house is 'House <root>', its short name the root)
   SITS[k]   town situations: {n, d, icon, price:{buy,sell,food}, recruits (count factor), contracts {type: weight factor}, dur:[a,b] days,
             pros (prosperity a day while it lasts), stock (market items factor)}
   BLD[k]    town buildings: {n, d, icon, base (every town has it), svc (what bldServe(i,key,arg) offers: short words for the UI)}
   GOODS[k]  town specialties: {n, d, icon, kind 'food'|'tools'|'buy'|'sell'|'hire', k (price factor on that kind), items? {k:[slots], wt:[weapon types],
             tag} (which market items the specialty makes cheaper and stocks more of), bio:[world biomes it comes from], coast (sea towns) } */
const REPT=[{k:'hostile',n:'Hostile',min:-100},{k:'cold',n:'Cold',min:-40},{k:'neutral',n:'Neutral',min:-10},{k:'friendly',n:'Friendly',min:15},{k:'allied',n:'Allied',min:50}];
const REPK={hostile:{buy:1.25,sell:.75,hire:1.3,ctr:.35,patience:0,recruit:.4,closed:1,hunt:1},
 cold:{buy:1.1,sell:.9,hire:1.12,ctr:.75,patience:1,recruit:.8,closed:0,hunt:0},
 neutral:{buy:1,sell:1,hire:1,ctr:1,patience:2,recruit:1,closed:0,hunt:0},
 friendly:{buy:.93,sell:1.06,hire:.92,ctr:1.2,patience:3,recruit:1.15,closed:0,hunt:0},
 allied:{buy:.86,sell:1.12,hire:.85,ctr:1.4,patience:4,recruit:1.3,closed:0,hunt:0}};
const HPERS={
 proud:{n:'Proud',d:'Old blood and long memories. Slights cost twice the standing; honour is repaid in kind.',war:.6,greed:1,proud:2},
 greedy:{n:'Greedy',d:'Everything has a price in their towns, a little higher than elsewhere. Gold buys their friendship quickly.',war:.4,greed:1.06,proud:1,gold:1},
 pious:{n:'Pious',d:'Temples in every town. They hate the restless dead and the rifts, and reward those who put them down.',war:.3,greed:1,proud:1,pious:1},
 warlike:{n:'Warlike',d:'Always at someone\'s throat. Their patrols are many and their wars come often.',war:1.2,greed:1,proud:1,patrols:1}};
const HOUSEN=['Varrow','Ostmark','Caelin','Dunmere','Halloran','Aubreth','Morcant','Thessaly','Ilsworth','Rennick','Grausch','Valcourt','Ashgrove','Brennan','Corwyn','Maudlin'];
const SITS={
 famine:{n:'Famine',d:'The granaries are empty. Food costs twice as much, fewer will sign on, and the board wants grain carried in.',icon:'sit-famine',
  price:{buy:1,sell:1,food:2},recruits:.6,contracts:{deliver:2,escort:1.5},dur:[4,9],pros:-2,stock:1},
 raided:{n:'Raided',d:'Raiders burned the outskirts. Goods are scarce and dear, and the town pays for vengeance.',icon:'sit-raided',
  price:{buy:1.15,sell:.85,food:1.4},recruits:.7,contracts:{bounty:2,hunt:1.5,defend:1.5},dur:[3,7],pros:-3,stock:.7},
 festival:{n:'Festival',d:'Banners, ale and dancing. Food is cheap, merchants pay well and young folk are eager to join a company.',icon:'sit-festival',
  price:{buy:1.05,sell:1.1,food:.85},recruits:1.4,contracts:{},dur:[2,4],pros:1,stock:1.1},
 plague:{n:'Plague',d:'Sickness in the streets. Few recruits, wary merchants, and the temple pays for relics and medicine.',icon:'sit-plague',
  price:{buy:1.1,sell:.9,food:1.2},recruits:.4,contracts:{relic:1.5,deliver:1.5},dur:[5,10],pros:-2,stock:.85},
 boom:{n:'Boom',d:'Trade is booming. Prices are fair, stalls are full and the merchants hire guards for their caravans.',icon:'sit-boom',
  price:{buy:.9,sell:1.1,food:.95},recruits:1.2,contracts:{escort:2,deliver:1.5},dur:[5,10],pros:2,stock:1.3},
 siege:{n:'Under siege',d:'An enemy host sits before the walls. Everything is dear, food most of all, and the lord pays to break the siege.',icon:'sit-siege',
  price:{buy:1.3,sell:.8,food:1.8},recruits:.5,contracts:{siege:3,defend:2},dur:[4,8],pros:-3,stock:.6}};
const BLD={
 notice:{n:'Notice board',d:'Contracts posted by the town and its lord.',icon:'board',base:1,svc:['contracts']},
 tavern:{n:'Tavern',d:'Recruits, rumours and followers for hire.',icon:'tavern',base:1,svc:['recruits']},
 market:{n:'Market',d:'Food, tools and gear. Specialties are cheaper and better stocked.',icon:'market',base:1,svc:['buy','sell']},
 inn:{n:'Inn',d:'A roof and a hot meal: rest until the wounds close.',icon:'inn',base:1,svc:['rest']},
 temple:{n:'Temple',d:'Healers for the wounded and blessings for the faithful.',icon:'temple',svc:['heal']},
 armorer:{n:'Armorer',d:'Top-tier armor and helmets, and full repairs for crowns instead of tools.',icon:'armor-heavy',svc:['stock','repair']},
 college:{n:'Arcane college',d:'Scholars of the four gifts: they read a sword\'s gift, sell foci and staves, and unlearn one talent tree for a fee.',icon:'mana',svc:['hint','stock','respec']},
 hall:{n:'Training hall',d:'Drill masters train a sword for crowns, as in camp but with no daily limit.',icon:'level',svc:['train']},
 weaponsmith:{n:'Weaponsmith',d:'Fine blades, axes and polearms of the highest tier the town can forge.',icon:'melee',svc:['stock']},
 fletcher:{n:'Fletcher',d:'Bows, crossbows and firearms, and the quivers to go with them.',icon:'ranged',svc:['stock']},
 harbour:{n:'Harbour',d:'Ships to the other harbour towns: faster than the road, for crowns and a few days at sea.',icon:'anchor',svc:['sail']}};
const BLDX=['temple','armorer','college','hall','weaponsmith','fletcher','harbour'];   // the extras, in the order the town view lists them
const GOODS={
 grain:{n:'Grain',d:'Wide fields: food is cheap here.',icon:'food',kind:'food',k:.75,bio:['plains']},
 cattle:{n:'Cattle',d:'Herds on the hills: salted meat is cheap here.',icon:'food',kind:'food',k:.8,bio:['plains','hills']},
 fish:{n:'Fish',d:'The boats come in every morning: food is cheap here.',icon:'food',kind:'food',k:.8,coast:1},
 timber:{n:'Timber',d:'Sawmills and woodwrights: tools, shields and staves are cheap here.',icon:'tools',kind:'tools',k:.75,items:{k:['s'],wt:['staff']},bio:['forest']},
 ore:{n:'Iron ore',d:'Mines in the hills: tools and heavy armor are cheap here.',icon:'tools',kind:'tools',k:.7,items:{k:['a','h'],heavy:1},bio:['hills','snow']},
 steel:{n:'Steel',d:'Famous forges: blades, axes, maces and polearms are cheap and plentiful.',icon:'melee',kind:'buy',k:.85,items:{wt:['sword','axe','mace','spear','polearm','dagger','hammer','greatsword']},bio:['hills']},
 yew:{n:'Yew bows',d:'Bowyers and fletchers: bows and crossbows are cheap here.',icon:'ranged',kind:'buy',k:.82,items:{wt:['bow','crossbow']},bio:['forest']},
 leather:{n:'Leather',d:'Tanneries: light armor and caps are cheap here.',icon:'armor-light',kind:'buy',k:.85,items:{k:['a','h'],light:1},bio:['plains','swamp']},
 furs:{n:'Furs',d:'Trappers sell furs: merchants here pay well for what you bring.',icon:'parts',kind:'sell',k:1.12,bio:['snow','forest']},
 herbs:{n:'Herbs',d:'Marsh herbalists: the temple heals for less and food keeps.',icon:'heal',kind:'food',k:.9,bio:['swamp']},
 salt:{n:'Salt',d:'Salt pans by the sea: food is cheap and merchants pay well.',icon:'food',kind:'sell',k:1.08,coast:1,bio:['desert']},
 spice:{n:'Spice',d:'Caravan spices: merchants pay well for loot.',icon:'coin',kind:'sell',k:1.15,bio:['desert']},
 glass:{n:'Rift glass',d:'Strange glass from the waste: foci and staves are cheap here.',icon:'mana',kind:'buy',k:.8,items:{wt:['staff','focus'],spell:1},bio:['desert','snow']},
 ale:{n:'Ale',d:'Famous breweries: men sign on cheaply over a mug.',icon:'tavern',kind:'hire',k:.88,bio:['plains','forest','hills','swamp']}};
/* the house soldiers: every noble house and the free towns field these (their banner colours are filled in by houseFactReg, 15-factions.js) */
const HOUSEUNITS=[['thug',20],['bmark',25],['bxbow',32],['braid',44],['blead',71]],HOUSELOOT=['shortsword','mace','heater','kite','mail','padded','leather','spear','crossbow','lightxbow','arming','cap'];
FACT.free={n:'Free towns',g:'F',col:'#7d8f86',skin:'#d9b99a',tier:'early',house:1,biomes:null,lair:'Break a free town militia',units:HOUSEUNITS,rank:[.5,.7,.3,19],loot:HOUSELOOT.filter(id=>ITEMS[id])};

/* ================= CARAVAN CARGO AND RIVAL COMPANIES (world agent) =================
   GOODS[k].cargo  what a caravan out of a town with specialty k carries (rolled once when it sets out, cargoRoll in 40-world.js):
                   {crowns:[lo,hi] (tens), food:[lo,hi], tools:[lo,hi], salves:[lo,hi], parts:{partKey:[lo,hi]},
                    items:{n:[lo,hi], k:[slots], wt:[weapon types], heavy?, light?, spell?, tier:+n (above the day's market tier)},
                    trade:[[tradeItemId, lo, hi]]}   every range inclusive; a missing key carries none.
   Trade goods are ITEMS of kind 't' {k:'t', n, d, price, good (the GOODS key that makes it), trade:1, uniq:1 (never on a stall,
   never loot, never famed), icon:'tg-<id>'}. Markets pay the full price where the good is not made, half where it is
   (tradePrice in 50-towns.js), with the usual reputation and situation factors.
   RVPERS[k]       rival company personalities: {n, d, hunt (hires itself out against the company), ambush (attacks the weak on the road),
                   greed (fee factor in parley), glory (eagerness to race for named work), honour}
   RVNAMES         [[short name, emblem]] the rival companies' names (the company is 'The <short>') and their banner's charge */
Object.assign(GOODS.grain,{cargo:{crowns:[4,10],food:[40,70],trade:[['flour',1,2]]}});
Object.assign(GOODS.cattle,{cargo:{crowns:[5,12],food:[30,55],parts:{meat:[2,4]},trade:[['hides',1,2]]}});
Object.assign(GOODS.fish,{cargo:{crowns:[4,10],food:[35,60],trade:[['saltfish',1,2]]}});
Object.assign(GOODS.timber,{cargo:{crowns:[5,12],tools:[8,16],items:{n:[1,2],k:['s'],wt:['staff']}}});
Object.assign(GOODS.ore,{cargo:{crowns:[5,12],tools:[10,20],parts:{scrap:[2,5]},items:{n:[1,1],k:['a','h'],heavy:1},trade:[['ironbar',1,2]]}});
Object.assign(GOODS.steel,{cargo:{crowns:[6,14],tools:[4,10],items:{n:[2,3],wt:['sword','axe','mace','spear','polearm','dagger','hammer','greatsword'],tier:1}}});
Object.assign(GOODS.yew,{cargo:{crowns:[5,12],items:{n:[1,2],wt:['bow','crossbow']},trade:[['yewstaves',1,1]]}});
Object.assign(GOODS.leather,{cargo:{crowns:[5,12],items:{n:[1,2],k:['a','h'],light:1},trade:[['hides',1,2]]}});
Object.assign(GOODS.furs,{cargo:{crowns:[6,14],parts:{pelt:[2,4]},trade:[['furbale',1,2]]}});
Object.assign(GOODS.herbs,{cargo:{crowns:[5,12],salves:[2,4],food:[10,20],trade:[['herbbundle',1,2]]}});
Object.assign(GOODS.salt,{cargo:{crowns:[6,14],food:[15,30],trade:[['saltbrick',2,3]]}});
Object.assign(GOODS.spice,{cargo:{crowns:[8,18],trade:[['spices',1,3]]}});
Object.assign(GOODS.glass,{cargo:{crowns:[7,16],items:{n:[1,1],wt:['staff','focus'],spell:1},trade:[['riftglass',1,2]]}});
Object.assign(GOODS.ale,{cargo:{crowns:[6,14],food:[10,20],trade:[['alecask',2,3]]}});
const TRADEGOODS={
 flour:{n:'Sacks of flour',price:60,good:'grain',d:'Milled white flour, dear in towns that grow none.'},
 hides:{n:'Tanned hides',price:110,good:'leather',d:'A bundle of cured cowhides, stiff and sweet-smelling.'},
 saltfish:{n:'Barrel of salt fish',price:70,good:'fish',d:'Cod packed in salt. Inland towns pay well for it.'},
 ironbar:{n:'Iron bars',price:130,good:'ore',d:'Smelted pig iron, stamped with the mine\'s mark.'},
 yewstaves:{n:'Yew staves',price:150,good:'yew',d:'Seasoned bow staves, split and bound. Every bowyer wants them.'},
 furbale:{n:'Bale of furs',price:180,good:'furs',d:'Fox, marten and wolf, prime winter pelts.'},
 herbbundle:{n:'Medicinal herbs',price:120,good:'herbs',d:'Bundled marsh herbs, dried. Healers pay for them.'},
 saltbrick:{n:'Salt bricks',price:90,good:'salt',d:'Pressed sea salt. The salt of every larder in the land.'},
 spices:{n:'Chest of spices',price:260,good:'spice',d:'Pepper, saffron and clove in a small locked chest. A fortune by weight.'},
 riftglass:{n:'Crate of rift glass',price:320,good:'glass',d:'Strange violet glass packed in straw. Scholars pay anything for it.'},
 alecask:{n:'Cask of strong ale',price:65,good:'ale',d:'A famous brew, sealed with the brewer\'s wax.'}};
for(const id in TRADEGOODS){const T=TRADEGOODS[id];ITEMS[id]={k:'t',n:T.n,d:T.d,price:T.price,good:T.good,trade:1,uniq:1,tier:1,look:id,icon:'tg-'+id}}
const RVPERS={
 honour:{n:'Honourable',d:'They keep their word and fight in the open. They never ambush and never hire out to hunt other companies.',hunt:0,ambush:0,greed:1,glory:.8,honour:1},
 cutthroat:{n:'Cutthroat',d:'Any purse is fair game. They fall on weaker companies on the road and sell their swords to anyone.',hunt:1,ambush:1,greed:1.2,glory:.7,honour:0},
 greedy:{n:'Greedy',d:'Gold first. They take any job, sell anything, and can be bought off for a price.',hunt:1,ambush:0,greed:.75,glory:.9,honour:0},
 glory:{n:'Glory-hounds',d:'They chase named beasts and famous bounties, and race anyone to the prize.',hunt:0,ambush:0,greed:1.1,glory:1.6,honour:0}};
const RVNAMES=[['Black Hounds','wolf'],['Iron Crows','raven'],['Red Lanterns','sun'],['Grey Wolves','wolf'],['Silver Spurs','crown'],['Ashen Blades','swords'],['Bitter Oaks','oak'],
 ['Crimson Hand','skull'],['Gallows Men','skull'],['Brass Lions','lion'],['Night Ravens','raven'],['Salt Dogs','anchor'],['Hollow Crowns','crown'],['Seventh Banner','tower'],
 ['Thorn Company','rose'],['Wild Boars','boar'],['Stag Riders','stag'],['Moon Wardens','moon'],['Lily Guard','fleur'],['Tower Swords','tower']];
// backgrounds a rival company signs on (weights): fighters first, a few casters
const RVBG={sellsword:5,militia:4,hunter:3,squire:2,wildling:3,thief:2,knight:1,hedge:1,acolyte:1,monk:1,spellblade:1,arquebusier:1.5,musketeer:.5,gunner:.5};   // the gunners: about one rival sword in ten carries a gun
