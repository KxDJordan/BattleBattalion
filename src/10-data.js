/* ================= DATA ================= */
const RESC={mana:'#62a6ee',aura:'#ecc64f',qi:'#3fd0b6',chi:'#9bd96f'},RESN={mana:'Mana',aura:'Aura',qi:'Qi',chi:'Chi'},RESK=['mana','aura','qi','chi'];
const STATN={hp:'Hitpoints',fat:'Fatigue',init:'Initiative',ms:'Melee skill',rs:'Ranged skill',md:'Melee defense',rd:'Ranged defense',brv:'Resolve'};
const ROLL={hp:[2,4],fat:[2,4],init:[3,5],ms:[1,3],rs:[2,4],md:[1,3],rd:[2,4],brv:[2,4]};
const XPT=[0,0,200,500,1000,1700,2600,3700,5000,6500,8200,10100,12200,14500,17000,20000];
const MAXLV=15,MAXROSTER=20,MAXFIELD=12;   // the roster holds 20 swords, 12 take the field
const FIST={n:'Fists',wt:'fist',d:[6,12],ap:4,fat:6,rng:1,ign:.1};
const ITEMS={
 knife:{k:'w',n:'Knife',wt:'dagger',d:[15,25],ap:3,fat:5,rng:1,ign:.2,price:40},
 rondel:{k:'w',n:'Rondel dagger',wt:'dagger',d:[22,38],ap:3,fat:5,rng:1,ign:.4,price:340},
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
 mallet:{k:'w',n:'Smith\'s hammer',wt:'hammer',d:[18,28],ap:4,fat:10,rng:1,ign:.35,crush:.3,price:90,look:'hammer'},
 warhammer:{k:'w',n:'War hammer',wt:'hammer',d:[28,40],ap:4,fat:12,rng:1,ign:.5,crush:.6,price:620,look:'warhammer'},
 maul:{k:'w',n:'Maul',wt:'hammer',two:1,d:[52,78],ap:6,fat:20,rng:1,ign:.5,crush:.8,price:840,look:'maul'},
 warmaul:{k:'w',n:'Dwarven warmaul',wt:'hammer',two:1,d:[64,92],ap:6,fat:22,rng:1,ign:.6,crush:1,price:2200,look:'maul'},
 bill:{k:'w',n:'Billhook',wt:'polearm',two:1,d:[34,50],ap:5,fat:14,rng:2,ign:.3,hit:5,price:280,look:'bill'},
 halberd:{k:'w',n:'Halberd',wt:'polearm',two:1,d:[48,70],ap:6,fat:17,rng:2,ign:.4,price:950,look:'halberd'},
 glaive:{k:'w',n:'War glaive',wt:'polearm',two:1,d:[56,80],ap:6,fat:16,rng:2,ign:.35,hit:5,price:1800,look:'glaive'},
 greatsword:{k:'w',n:'Greatsword',wt:'greatsword',two:1,d:[46,66],ap:6,fat:16,rng:2,ign:.25,hit:5,price:720,look:'greatsword'},
 zweihander:{k:'w',n:'Zweihänder',wt:'greatsword',two:1,d:[56,80],ap:6,fat:18,rng:2,ign:.3,hit:5,price:1650,look:'zweihander'},
 runegreat:{k:'w',n:'Runed greatsword',wt:'greatsword',two:1,d:[66,92],ap:6,fat:18,rng:2,ign:.3,hit:10,price:3100,look:'runegreat'},
 lightxbow:{k:'w',n:'Light crossbow',wt:'crossbow',two:1,d:[30,46],ap:4,fat:8,rng:6,ign:.4,hit:10,reload:{ap:3,fat:8},price:320,look:'crossbow',shot:'bolt'},
 crossbow:{k:'w',n:'Heavy crossbow',wt:'crossbow',two:1,d:[42,64],ap:4,fat:10,rng:7,ign:.5,hit:10,reload:{ap:4,fat:12},price:980,look:'crossbow',shot:'bolt'},
 arbalest:{k:'w',n:'Arbalest',wt:'crossbow',two:1,d:[54,80],ap:4,fat:12,rng:8,ign:.55,hit:10,reload:{ap:5,fat:16},price:2100,look:'arbalest',shot:'bolt'},
 pistol:{k:'w',n:'Wheellock pistol',wt:'flintlock',d:[36,54],ap:4,fat:6,rng:4,ign:.7,reload:{ap:5,fat:10},price:760,look:'pistol',shot:'ball',fx:'smoke'},
 duelpistol:{k:'w',n:'Duelling pistol',wt:'flintlock',d:[44,64],ap:4,fat:6,rng:5,ign:.75,hit:5,reload:{ap:5,fat:10},price:1600,look:'pistol',shot:'ball',fx:'smoke'},
 musket:{k:'w',n:'Musket',wt:'flintlock',two:1,d:[70,100],ap:5,fat:10,rng:7,ign:.8,hit:-5,reload:{ap:5,fat:14},price:1400,look:'musket',shot:'ball',fx:'smoke'},
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
 dirk:{k:'w',n:'Dirk',wt:'dagger',d:[18,28],ap:3,fat:5,rng:1,ign:.25,hit:5,price:90},
 seax:{k:'w',n:'Seax',wt:'dagger',d:[22,34],ap:3,fat:7,rng:1,ign:.25,price:200},
 stiletto:{k:'w',n:'Stiletto',wt:'dagger',d:[24,36],ap:3,fat:4,rng:1,ign:.6,hit:10,price:900},
 kris:{k:'w',n:'Serpent kris',wt:'dagger',d:[30,46],ap:3,fat:5,rng:1,ign:.5,hit:5,price:1900},
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
 horsepick:{k:'w',n:'Horseman\'s pick',wt:'hammer',d:[22,34],ap:4,fat:11,rng:1,ign:.45,crush:.4,price:300},
 knighthammer:{k:'w',n:'Knightly war hammer',wt:'hammer',d:[34,48],ap:4,fat:13,rng:1,ign:.55,crush:.7,hit:5,price:1300},
 // polearms: reach 2
 pitchfork:{k:'w',n:'Pitchfork',wt:'polearm',two:1,d:[22,34],ap:5,fat:12,rng:2,ign:.2,hit:5,price:70},
 voulge:{k:'w',n:'Voulge',wt:'polearm',two:1,d:[42,60],ap:6,fat:15,rng:2,ign:.35,price:520},
 lucerne:{k:'w',n:'Lucerne hammer',wt:'polearm',two:1,d:[44,62],ap:6,fat:16,rng:2,ign:.5,crush:.5,price:1400},
 // greatswords: reach 2, wide cuts
 waster:{k:'w',n:'Notched greatsword',wt:'greatsword',two:1,d:[32,48],ap:6,fat:15,rng:2,ign:.2,price:150},
 bastard:{k:'w',n:'Hand-and-a-half sword',wt:'greatsword',two:1,d:[38,56],ap:6,fat:15,rng:2,ign:.25,hit:5,price:380},
 flamberge:{k:'w',n:'Flamberge',wt:'greatsword',two:1,d:[60,86],ap:6,fat:19,rng:2,ign:.3,price:1450},
 // crossbows: aim and pierce, then reload
 huntxbow:{k:'w',n:'Hunting crossbow',wt:'crossbow',two:1,d:[24,38],ap:4,fat:7,rng:5,ign:.35,hit:10,reload:{ap:3,fat:6},price:150,shot:'bolt'},
 repeater:{k:'w',n:'Repeating crossbow',wt:'crossbow',two:1,d:[28,40],ap:4,fat:8,rng:5,ign:.35,hit:5,reload:{ap:2,fat:6},price:760,shot:'bolt'},
 windlass:{k:'w',n:'Dwarven windlass',wt:'crossbow',two:1,d:[64,92],ap:4,fat:12,rng:8,ign:.6,hit:10,reload:{ap:6,fat:18},price:3200,shot:'bolt'},
 // firearms: the deepest bite through armor, slow to load
 handgonne:{k:'w',n:'Hand cannon',wt:'flintlock',two:1,d:[30,50],ap:5,fat:6,rng:3,ign:.6,hit:-15,reload:{ap:5,fat:12},price:140,shot:'ball',fx:'smoke'},
 arquebus:{k:'w',n:'Arquebus',wt:'flintlock',two:1,d:[48,72],ap:5,fat:9,rng:6,ign:.7,hit:-10,reload:{ap:6,fat:14},price:420,shot:'ball',fx:'smoke'},
 blunder:{k:'w',n:'Blunderbuss',wt:'flintlock',two:1,d:[52,80],ap:5,fat:10,rng:3,ign:.6,hit:5,reload:{ap:5,fat:12},price:900,shot:'ball',fx:'smoke'},
 longrifle:{k:'w',n:'Rifled long gun',wt:'flintlock',two:1,d:[84,118],ap:5,fat:11,rng:9,ign:.85,hit:5,reload:{ap:6,fat:16},price:3000,shot:'ball',fx:'smoke'},
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
{const T={knife:1,dirk:1,seax:2,rondel:3,stiletto:4,kris:5, club:1,spikedclub:1,ironmace:2,mace:3,morningstar:4,flail:4,bellmace:5,
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
const RANGEDWT=['bow','crossbow','flintlock'];
// A ranged weapon (bow, crossbow, flintlock, or an enemy's ranged attack): it shoots with ranged skill, obeys the ranged lock, takes no free attacks.
function isRangedW(w){return!!(w&&RANGEDWT.includes(w.wt))}
const WSK={sword:['slash','riposte'],axe:['split'],mace:['stunblow'],dagger:['puncture'],spear:['thrust','spearwall'],bow:['quick'],staff:['sweep'],
  hammer:['batter'],polearm:['hook','reap'],greatsword:['halfsword','gswing'],crossbow:['reload','xaim'],flintlock:['reload','blast']},
 WSKID={greataxe:['split','round'],pike:['impale'],maul:['batter','hsmash'],warmaul:['batter','hsmash'],bill:['hook']},
 SHIELDHP={buckler:32,kite:64,heater:80,roundshield:50,ironround:66,spiked:56,warspiked:72,tower:110,steeltower:140},SHIELDSK={spiked:['shieldwall','spikebash'],warspiked:['shieldwall','spikebash']};
// the new items' own skill sets (where one differs from its family's) and shield hitpoints
Object.assign(WSKID,{falchion:['slash'],estoc:['riposte'],bardiche:['split','round'],pitchfork:['hook'],waster:['gswing'],repeater:['reload'],handgonne:['reload']});
Object.assign(SHIELDHP,{targe:36,steelbuckler:44,pavise:100,kite2:84,heater2:96,dwarfround:90});
for(const id in ITEMS){const i=ITEMS[id];if(i.k==='w')i.sk=WSKID[id]||WSK[i.wt]||[];else if(i.k==='s'){i.sk=SHIELDSK[id]||['shieldwall','bash'];i.hp=SHIELDHP[id]||48}}
function itemDesc(id){const i=ITEMS[id];if(i.k==='t')return`Trade good, worth ${i.price} crowns where it is not made (half where it is)`;
 if(i.k==='w')return`${i.d[0]}–${i.d[1]} dmg, ${i.ap} AP${i.rng>1?(isRangedW(i)?', range ':', reach ')+i.rng:''}${i.two?', two-handed':''}${i.reload?', reload '+i.reload.ap+' AP':''}${i.crush?', crushes armor (+'+Math.round(i.crush*100)+'%)':''}${i.ign>=.5?', '+Math.round(i.ign*100)+'% through armor':''}${i.spell?', +'+Math.round(i.spell*100)+'% spell dmg':''}`;
 if(i.k==='s')return`+${i.md} melee def, +${i.rd} ranged def, ${i.hp} shield hp, −${i.fat} fatigue${i.wallB?', shield wall +'+i.wallB:''}${i.guard?', covers allies beside it (−'+i.guard+' to be shot)':''}${i.spike?', spiked bash '+i.spike[0]+'–'+i.spike[1]:''}`;
 return`${i.arm} ${i.k==='h'?'head ':''}armor, −${i.fat} fatigue`}
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
 seeker:{n:'Seeker arrow',fat:10,cost:['mana',8],tgt:'enemy',wpn:1,needs:'bow',mult:.85,sure:1,fx:'arcane',d:'A mana-guided shaft that bends to its mark: cannot miss, 85% damage.'},
 avolley:{n:'Arcane volley',ap:6,fat:16,cost:['mana',14],tgt:'enemy',wpn:1,needs:'bow',mult:.9,aoe:1,fx:'arcane',d:'A shot that bursts into motes: 90% damage to the target, 70% of that to every foe beside it.'},
 bindshot:{n:'Binding rune',ap:5,fat:12,cost:['mana',10],tgt:'enemy',wpn:1,needs:'bow',mult:.6,status:{root:2,marked:2},fx:'arcane',d:'An arrow carrying a rune of binding: 60% damage; the target cannot move for 2 turns and is marked (+15 to hit it) for 2.'},
 starpierce:{n:'Starpiercer',ap:7,fat:22,cost:['mana',24],tgt:'enemy',wpn:1,needs:'bow',mult:1.3,ignB:.3,through:3,fx:'pierce',d:'A lance of light down the line of fire: 130% damage, +30% armor piercing, then on through up to 3 more foes behind for 75%.'},
 avatar:{n:'Avatar of war',ap:3,fat:14,cost:['aura',24],tgt:'self',buff:{key:'avatar',dmg:.3,ms:10,md:10},dur:2,fx:'aura',d:'Blaze with Aura: +30% damage, +10 melee skill and +10 melee defense for 2 turns.'},
 aarrow:{n:'Aura arrow',fat:12,cost:['aura',8],tgt:'enemy',wpn:1,needs:'bow',mult:1.4,hit:5,fx:'aura',d:'Wreathe the arrow in Aura: 140% damage, +5 to hit.'},
 pvolley:{n:'Piercing volley',ap:6,fat:16,cost:['aura',12],tgt:'enemy',wpn:1,needs:'bow',mult:1,through:2,fx:'pierce',d:'An Aura-driven shot that punches through: full damage to the target, then up to 2 more foes in the line behind take 75%.'},
 carrow:{n:'Concussive arrow',fat:14,cost:['aura',14],tgt:'enemy',wpn:1,needs:'bow',mult:1.1,kb:1,status:{daze:1},fx:'aura',d:'An arrow that hits like a ram: 110% damage, knocks the target back 1 tile and dazes it.'},
 sunarrow:{n:'Sunburst arrow',ap:7,fat:22,cost:['aura',26],tgt:'enemy',wpn:1,needs:'bow',mult:1.7,ignB:.3,aoe:1,fx:'aura',d:'The arrow bursts in golden light: 170% damage, +30% armor piercing, 70% of that to every foe beside the target.'},
 dragon:{n:'Storm dragon',ap:6,fat:22,cost:['qi',24],tgt:'enemy',wpn:1,mult:1.5,chain:2,status:{burn:2,chill:1},noBow:1,fx:'storm',d:'A blow that uncoils into a dragon of fire and frost: 150% damage, burns for 2 turns and chills, then leaps to 2 more foes within 3 tiles for 60%.'},
 farrow:{n:'Fire arrow',fat:10,cost:['qi',8],tgt:'enemy',wpn:1,needs:'bow',mult:1,status:{burn:3},fx:'flame',d:'A burning shaft: full damage, and the target burns for 3 turns (8 damage each).'},
 iarrow:{n:'Frost arrow',fat:10,cost:['qi',8],tgt:'enemy',wpn:1,needs:'bow',mult:1,status:{chill:1},fx:'frost',d:'An ice-tipped shaft: full damage, and the target loses 3 action points on its next turn.'},
 tarrow:{n:'Thunder arrow',ap:6,fat:16,cost:['qi',16],tgt:'enemy',wpn:1,needs:'bow',mult:1.1,chain:2,status:{daze:1},fx:'storm',d:'Lightning rides the arrow: 110% damage, dazes, and arcs to 2 more foes within 3 tiles for 60%.'},
 tempest:{n:'Tempest volley',ap:7,fat:22,cost:['qi',24],tgt:'enemy',wpn:1,needs:'bow',mult:1.2,aoe:1,status:{burn:2,chill:1},fx:'storm',d:'A storm of elemental arrows: 120% damage, 70% of that to every foe beside the target; all of them burn for 2 turns and are chilled.'},
 lotus:{n:'Lotus circle',ap:5,fat:14,cost:['chi',24],tgt:'self',party:2,heal:[12,20],fx:'heal',d:'Chi blooms outward: you and every ally within 2 tiles heal 12–20 hitpoints.'},
 palm:{n:'Chi palm',fat:12,cost:['chi',8],tgt:'enemy',wpn:1,mult:1.2,kb:1,noBow:1,fx:'chi',d:'A strike that bursts with Chi: 120% damage and the foe is knocked back 1 tile.'},
 hundred:{n:'Hundred hands',ap:6,fat:18,cost:['chi',14],tgt:'enemy',wpn:1,mult:.55,hits:3,hit:5,noBow:1,fx:'multi',d:'Three blurred blows at 55% damage, +5 to hit each, while the foe stands.'},
 shatter:{n:'Shattering palm',ap:6,fat:22,cost:['chi',24],tgt:'enemy',wpn:1,mult:1.8,ignB:.5,status:{stun:1},noBow:1,fx:'chi',d:'Chi driven straight through armor: 180% damage, +50% armor piercing, and the foe loses its next turn.'},
 breath:{n:'Steady breathing',ap:2,fat:4,cost:['chi',8],tgt:'self',buff:{key:'steady',rs:15},dur:2,fx:'chi',d:'Slow the heart between shots: +15 ranged skill for 2 turns.'},
 pparrow:{n:'Pressure-point arrow',fat:12,cost:['chi',10],tgt:'enemy',wpn:1,needs:'bow',mult:.8,status:{daze:1,weak:2},fx:'chi',d:'A shot to a nerve cluster: 80% damage; the target is dazed and weakened (−25% damage dealt) for 2 turns.'},
 spiritarrow:{n:'Spirit arrow',ap:6,fat:18,cost:['chi',22],tgt:'enemy',wpn:1,needs:'bow',mult:1,pierce:1,hit:10,fx:'chi',d:'An arrow of pure Chi that ignores armor: full damage straight to hitpoints, +10 to hit.'},
 bladedance:{n:'Blade dance',ap:6,fat:22,tgt:'aoe',wpn:1,needs:'sword',mult:.75,fx:'spin',d:'Turn among the foes around you: strike each adjacent one at 75% damage.'},
 masterstroke:{n:'Masterstroke',ap:6,fat:20,tgt:'enemy',wpn:1,needs:'sword',mult:1.5,hit:15,fx:'slash',d:'The cut every master teaches last: 150% damage, +15 to hit.'},
 axeexec:{n:'Behead',fat:20,tgt:'enemy',wpn:1,needs:'axe',mult:1.2,vsHurt:.5,head:15,fx:'chop',d:'120% damage and a further +50% against a foe below half health; +15% chance to hit the head.'},
 skullcrack:{n:'Skullcracker',fat:18,tgt:'enemy',wpn:1,needs:'mace',mult:1,head:50,status:{daze:2},fx:'bonk',d:'Full damage aimed at the head (+50% head chance); dazes for 2 turns.'},
 sunder:{n:'Sunder',ap:5,fat:18,tgt:'enemy',wpn:1,needs:'mace',mult:.8,ignB:.2,status:{weak:2,marked:2},fx:'bonk',d:'Batter guard and armor alike: 80% damage, +20% armor piercing; the foe is weakened (−25% damage) and marked (+15 to hit it) for 2 turns.'},
 gut:{n:'Gut',fat:14,tgt:'enemy',wpn:1,needs:'dagger',mult:.8,bleed:3,hit:5,fx:'stab',d:'Open the belly: 80% damage, +5 to hit, and a wound that reaches flesh bleeds for 3 turns.'},
 assassin:{n:'Assassinate',ap:5,fat:20,tgt:'enemy',wpn:1,needs:'dagger',mult:1,pierce:1,vsHurt:.5,fx:'stab',d:'A blade between the plates: full damage straight to hitpoints, ignoring armor; +50% against a foe below half health.'},
 skewer:{n:'Skewer',ap:5,fat:18,tgt:'enemy',wpn:1,needs:'spear',mult:.9,through:1,fx:'stab',d:'Drive the point through: 90% damage to the target, then 75% of that to the foe right behind it.'},
 pinspear:{n:'Pin',fat:18,tgt:'enemy',wpn:1,needs:'spear',mult:1.1,status:{root:2},fx:'stab',d:'Pin a foe in place: 110% damage, and it cannot move for 2 turns.'},
 doubleshot:{n:'Double shot',ap:6,fat:18,tgt:'enemy',wpn:1,needs:'bow',mult:.6,hits:2,hit:-5,fx:'arrow',d:'Two arrows nocked at once: two shots at 60% damage, −5 to hit each.'},
 cripple:{n:'Crippling shot',fat:16,tgt:'enemy',wpn:1,needs:'bow',mult:.9,status:{root:1,weak:2},fx:'arrow',d:'Shoot for the legs: 90% damage; the target cannot move on its next turn and is weakened (−25% damage) for 2.'},
 vault:{n:'Pole vault',ap:3,fat:12,rng:3,tgt:'move',leap:1,needs:'staff',fx:'leap',d:'Vault up to 3 tiles over anything on the staff, drawing no free attacks.'},
 staffquake:{n:'Ringing staff',ap:6,fat:20,tgt:'aoe',wpn:1,needs:'staff',mult:.9,status:{daze:1},fx:'quake',d:'Strike the ground and every adjacent foe: 90% damage to each, all dazed.'},
 fistflurry:{n:'Flurry of fists',ap:5,fat:16,tgt:'enemy',wpn:1,needs:'fist',mult:.7,hits:3,fx:'multi',d:'Three punches at 70% damage each, while the foe stands.'},
 dragonkick:{n:'Dragon kick',ap:5,fat:20,tgt:'enemy',wpn:1,needs:'fist',mult:1.4,kb:2,status:{daze:1},fx:'shove',d:'A flying kick: 140% damage, knocks the foe back 2 tiles and dazes it.'}
});
/* ---- Arms update abilities: weapon skills of the new families, shield skills, their weapon trees ----
   Fields read by the rules beyond the ones above: reloadW (the reload: AP and fatigue come from the weapon in hand's reload),
   crushB (added to the weapon's armor crushing), pull (drag the target that many tiles toward the attacker), scare (a hit tests the
   target's morale), spikeD (the damage roll is the raised shield's spike, not the weapon), ignW (armor piercing of that roll). */
Object.assign(AB,{
 reload:{n:'Reload',ap:4,fat:10,tgt:'self',reloadW:1,fx:'reload',d:'Load the crossbow or firearm in hand so it can fire again. AP and fatigue come from the weapon. Allowed with a foe next to you.'},
 batter:{n:'Batter',fat:15,tgt:'enemy',wpn:1,needs:'hammer',mult:.75,crushB:1.5,fx:'bonk',d:'A blow at the plate, not the man: 75% damage, but it tears up 150% more armor.'},
 hsmash:{n:'Overhead smash',ap:6,fat:22,tgt:'enemy',wpn:1,needs:'hammer',two:1,mult:1.25,crushB:.4,hit:-10,status:{daze:1},fx:'quake',d:'The maul comes down with both hands: 125% damage that crushes armor 40% harder and dazes. −10 to hit.'},
 hook:{n:'Hook',fat:15,tgt:'enemy',wpn:1,needs:'polearm',mult:.5,pull:1,hit:5,fx:'hook',d:'Catch a foe with the hook and drag it 1 tile toward you: 50% damage, +5 to hit.'},
 reap:{n:'Reap',ap:6,fat:22,tgt:'enemy',wpn:1,needs:'polearm',mult:.85,aoe:1,hit:-5,fx:'sweep',d:'A wide sweep at reach: 85% damage to the target and 70% of that to every foe beside it. −5 to hit.'},
 halfsword:{n:'Half-sword',ap:4,fat:14,rng:1,tgt:'enemy',wpn:1,needs:'greatsword',mult:.8,hit:15,ignB:.25,fx:'stab',d:'Grip the blade and drive the point through a gap at a foe right beside you: 4 AP, 80% damage, +15 to hit, +25% armor piercing.'},
 gswing:{n:'Great swing',fat:22,tgt:'enemy',wpn:1,needs:'greatsword',mult:1.3,hit:-10,kb:1,fx:'slash',d:'A full-body swing: 130% damage and the foe is knocked back 1 tile. −10 to hit.'},
 xaim:{n:'Braced shot',ap:6,fat:12,tgt:'enemy',wpn:1,needs:'crossbow',mult:1.1,hit:20,head:10,fx:'bolt',d:'Brace the crossbow and take your time: 6 AP, +20 to hit, 110% damage, +10% head chance.'},
 blast:{n:'Scattershot',fat:14,tgt:'enemy',wpn:1,needs:'flintlock',mult:.55,aoe:1,hit:10,fx:'smoke',d:'A charge of shot instead of a ball: 55% damage to the target and 70% of that to every foe beside it, +10 to hit.'},
 spikebash:{n:'Spiked bash',ap:4,fat:14,rng:1,tgt:'enemy',shield:1,spikeD:1,ignW:.3,melee:1,nostun:1,mult:1,hit:10,kb:1,fx:'shove',d:'Ram the spiked boss into a foe: the shield’s spike damage (30% through armor), knocks it back 1 tile, +10 to hit.'},
 scharge:{n:'Shield charge',ap:5,fat:18,rng:3,tgt:'enemy',shield:1,dash:1,noDmg:1,nostun:1,kb:1,hit:10,status:{daze:1},noDmgTxt:'Bowled over',fx:'charge',d:'Rush up to 3 tiles behind the shield and slam into a foe: it is knocked back 1 tile and dazed. No damage, +10 to hit.'},
 fortress:{n:'Testudo',ap:4,fat:20,tgt:'self',shield:1,party:1,buff:{key:'fortress',md:8,rd:20,indom:1},dur:1,fx:'guard',d:'Shields up and locked: you and every ally next to you get +8 melee and +20 ranged defense and cannot be knocked back until your (their) next turn.'},
 ringblow:{n:'Bell ringer',fat:18,tgt:'enemy',wpn:1,needs:'hammer',mult:.8,head:20,hit:-5,status:{stun:1},fx:'bonk',d:'Ring the helmet like a bell: 80% damage, +20% head chance, and the foe loses its next turn. −5 to hit.'},
 demolish:{n:'Demolish',ap:6,fat:24,tgt:'enemy',wpn:1,needs:'hammer',mult:1.4,crushB:1,ignB:.2,hit:-5,fx:'quake',d:'Everything into one blow: 140% damage, armor crushed twice as hard, +20% armor piercing. −5 to hit.'},
 trip:{n:'Trip',fat:14,tgt:'enemy',wpn:1,needs:'polearm',mult:.6,hit:5,status:{root:1,daze:1},fx:'hook',d:'Hook the legs out from under a foe: 60% damage, it cannot move on its next turn and is dazed. +5 to hit.'},
 glaivecut:{n:'Headsman’s arc',ap:6,fat:22,tgt:'enemy',wpn:1,needs:'polearm',mult:1.3,vsHurt:.4,head:15,fx:'slash',d:'A long, falling cut: 130% damage, +40% more against a foe below half health, +15% head chance.'},
 gsweep:{n:'Wide arc',ap:6,fat:24,tgt:'aoe',wpn:1,needs:'greatsword',mult:.9,fx:'spin',d:'Swing the greatsword through every foe beside you: 90% damage to each.'},
 mordhau:{n:'Mordhau',fat:20,rng:1,tgt:'enemy',wpn:1,needs:'greatsword',mult:1.1,crushB:.6,hit:-5,nostun:1,status:{stun:1},fx:'bonk',d:'Reverse the sword and strike with the hilt at a foe beside you: 110% damage that crushes armor, and it loses its next turn. −5 to hit.'},
 xpin:{n:'Pinning bolt',fat:14,tgt:'enemy',wpn:1,needs:'crossbow',mult:.8,status:{root:2},fx:'bolt',d:'A bolt through the foot: 80% damage, and the target cannot move for 2 turns.'},
 xheart:{n:'Heartseeker',ap:6,fat:18,tgt:'enemy',wpn:1,needs:'crossbow',mult:1.5,hit:10,head:15,fx:'bolt',d:'A bolt for the heart: 6 AP, 150% damage, +10 to hit, +15% head chance.'},
 fdeafen:{n:'Deafening shot',fat:16,tgt:'enemy',wpn:1,needs:'flintlock',mult:.9,scare:1,status:{daze:1},fx:'smoke',d:'Fire past the ear: 90% damage, the target is dazed and must test its morale.'},
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
 fortress:{n:'Testudo',d:'+8 melee and +20 ranged defense, cannot be knocked back.',icon:'fortress',good:1},
 unloaded:{n:'Unloaded',d:'The crossbow or firearm in hand is spent: it must be reloaded before it can fire again.',icon:'unloaded',good:0}
});
/* ---- Morale: u.mor 0..4. hit is added to the unit's own chance to hit, def to its defense against every attack. ---- */
const MORN=['Fleeing','Breaking','Wavering','Steady','Confident'],
 MORFX=[{hit:-30,def:-20},{hit:-20,def:-10},{hit:-10,def:-5},{hit:0,def:0},{hit:10,def:5}];
/* ---- Combat constants ---- */
const HEADCH=25,HEADMULT=1.5,COVERPEN=15,FFCH=.3,FFDMG=.75,HEAVYHIT=.25,INJCH=.5,DOWNCH=.5,PERMCH=.35,TOOLPTS=15,TOOLPRICE=3,BLEEDDMG=6;
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
     'weapon' one per weapon family (wt), 3 tiers of two perks; they only work while a weapon of that family is in hand
              (the shield tree, wt 'shield': only while a shield is raised)
   Tier t of a style or gift tree opens at level t, tier t of a weapon tree at level 3t (tierLevel). No same-tree prerequisites.
   aff: what the tree suits (melee ranged caster support one two shield bow light), read by autoLearn.
   Perk: {id, n, d, st?:{stat deltas, dmg as a fraction, ap = action points}, ab?:AB id, flag?:string, mod?:{flag:number},
          res?:number, regen?:number, wmod?:{d:[+min,+max], ap, rng, ign, hit, stun, spell, crush, rld (reload AP)} (weapon trees: changes the weapon in hand)}
   Ids are '<tree>.<tier>' (one perk in the tier) or '<tree>.<tier>a' / 'b'. d states the exact effect.
   The flags and mods the rules read (u.flags / calc(m).flags; mods add up):
     exec berserk forged path eagle (as before)   vsHurt vsFull dmgMelee dmgRanged twoDmg lowHpDmg duelHit duelDmg flankDmg spellB splitB
     drB drRanged drMelee lastStand   adjDef loneDef guard cmd flank coverIgn longShot rngB headB ignB bleedOn
     regenHP medAura killHeal killRes brvAura healB freeSwap noLock undying   shieldDef shieldHp (calc only)
     arms update: vsArm (damage while the target's body armor holds), reachHit (to hit a foe 2 tiles away with a reach weapon),
     deflect (less damage from shots and spells while a shield is raised), shieldDr (less damage while a shield is raised), shGuard (Cover from a tower shield)
     armor trees (kind 'armor', aw light/medium/heavy, tiers at levels 2/5/8; idle unless armorClass(m) matches aw):
     nimble fleet sidestep slip freshDef dance | brace armRegen roll footing layerDef padIgn | kbImm ironLung unbowed steelWall hpSoak noStun */
const GIFTBASE=30,GIFTREGEN=4,TALSTYLE=['melee','ranged','caster','support'],
 WTS=['sword','axe','mace','hammer','dagger','spear','polearm','greatsword','bow','crossbow','flintlock','staff','fist','shield'];   // weapon tree keys in display order ('shield': the shield tree)
const perkDef=(n,d,o)=>Object.assign({n,d},o||{});
const MAST={
 /* ---- style trees ---- */
 vanguard:{n:'Vanguard',kind:'style',aff:['melee'],d:'Front-line killing craft',tiers:[
  [perkDef('Steady hand','+8 melee skill',{st:{ms:8}})],[perkDef('Shove','Ability: push an adjacent foe back 1 tile (3 AP)',{ab:'shove'})],
  [perkDef('Executioner','+25% damage to foes below half health',{flag:'exec'})],[perkDef('Berserk','Regain 4 AP on a kill, once per turn',{flag:'berserk'})],
  [perkDef('Cleaving blows','+10% damage with melee weapons',{mod:{dmgMelee:.1}})],[perkDef('Decapitate','Ability: a stroke at the neck: +60% damage against a foe below half health, +25% head chance',{ab:'decap'})]]},
 bulwark:{n:'Bulwark',kind:'style',aff:['melee','shield'],d:'Holding the line',tiers:[
  [perkDef('Stalwart','+6 melee and ranged defense',{st:{md:6,rd:6}})],[perkDef('Colossus','+15 hitpoints',{st:{hp:15}})],
  [perkDef('Battle-forged','Take 15% less damage while your body armor holds',{flag:'forged'})],[perkDef('Indomitable','Ability: take half damage and ignore knockback for 2 turns (4 AP)',{ab:'indom'})],
  [perkDef('Hold the line','+6 melee and ranged defense while an ally stands next to you',{mod:{adjDef:6}})],[perkDef('Bastion','Ability: +20 melee and ranged defense, 20% less damage and no knockback until your next turn',{ab:'bastion'})]]},
 marksman:{n:'Marksman',kind:'style',aff:['ranged','bow'],d:'Bow work',tiers:[
  [perkDef('Bullseye','+10 ranged skill',{st:{rs:10}})],[perkDef('Aimed shot','Ability: a slow shot at +25 to hit for 130% damage',{ab:'aimed'})],
  [perkDef('Pinning shot','Ability: 70% damage and the target cannot move on its next turn',{ab:'pin'})],[perkDef('Eagle eye','+1 bow range, +5 ranged skill',{st:{rs:5},flag:'eagle'})],
  [perkDef('Volley','Ability: arrows on a foe and everyone beside it: 80% damage to the target, 56% to each neighbour',{ab:'volley'})],
  [perkDef('Deadeye','+15% damage with ranged weapons, +10% head chance with weapon attacks',{mod:{dmgRanged:.15,headB:10}})]]},
 skirmisher:{n:'Skirmisher',kind:'style',aff:['melee','ranged','light'],d:'Movement and evasion',tiers:[
  [perkDef('Pathfinder','Climbing and rough ground cost no extra AP',{flag:'path'})],[perkDef('Footwork','Ability: step 1 tile without drawing free attacks',{ab:'footwork'})],
  [perkDef('Dodge','+8 melee and ranged defense',{st:{md:8,rd:8}})],[perkDef('Adrenaline','Ability: gain 4 AP, once per battle',{ab:'adren'})],
  [perkDef('Evasion','+10 melee and ranged defense while no ally stands next to you',{mod:{loneDef:10}})],[perkDef('Tumble','Ability: roll up to 3 tiles without drawing free attacks',{ab:'tumble'})]]},
 duelist:{n:'Duelist',kind:'style',aff:['melee','one'],d:'One blade, one free hand',tiers:[
  [perkDef('En garde','+6 to hit in melee with a one-handed weapon and no shield raised',{mod:{duelHit:6}})],[perkDef('Lunge','Ability: close 1 tile and strike in one motion, +10 to hit',{ab:'lunge'})],
  [perkDef('Precise cuts','+15% damage with a one-handed melee weapon and no shield raised',{mod:{duelDmg:.15}})],[perkDef('Parry','Ability: +15 melee defense and riposte every melee miss until your next turn',{ab:'parry'})],
  [perkDef('Blade footwork','+6 melee defense, +10 initiative',{st:{md:6,init:10}})],[perkDef('Flurry','Ability: two strikes at 80% damage, +5 to hit each',{ab:'flurry'})]]},
 brute:{n:'Brute',kind:'style',aff:['melee','two'],d:'Two hands, one swing',tiers:[
  [perkDef('Heavy grip','+10% damage with two-handed melee weapons',{mod:{twoDmg:.1}})],[perkDef('Cleave','Ability: a two-handed sweep at every adjacent foe for 80% damage',{ab:'cleave'})],
  [perkDef('Crush armor','+10% armor piercing on weapon attacks',{mod:{ignB:.1}})],[perkDef('Brute strength','+10 hitpoints, +10 fatigue',{st:{hp:10,fat:10}})],
  [perkDef('Merciless','+15% damage to foes below half health',{mod:{vsHurt:.15}})],[perkDef('Earthsplitter','Ability: a two-handed overhead blow: 160% damage, +20% armor piercing, stuns, −5 to hit',{ab:'earthsplit'})]]},
 shieldbearer:{n:'Shieldbearer',kind:'style',aff:['shield'],d:'The shield is a weapon too',tiers:[
  [perkDef('Shield training','A raised shield gives +5 more melee and ranged defense',{mod:{shieldDef:5}})],[perkDef('Cover','Shots and spells against allies next to you get −8 to hit',{mod:{guard:8}})],
  [perkDef('Turtle','Take 15% less damage from shots and spells',{mod:{drRanged:.15}})],[perkDef('Shield slam','Ability: drive the rim into a foe: 70% damage, +5 to hit, stuns',{ab:'slam'})],
  [perkDef('Reinforced rim','Your shield has 50% more hitpoints',{mod:{shieldHp:.5}})],[perkDef('Phalanx','Ability: you and every ally next to you get +10 melee and ranged defense until your next turn',{ab:'phalanx'})]]},
 tactician:{n:'Tactician',kind:'style',aff:['support'],d:'Orders that win fights',tiers:[
  [perkDef('Battle orders','Allies next to you get +5 to hit',{mod:{cmd:5}})],[perkDef('Rally','Ability: allies within 3 tiles regain a step of morale (up to steady) and +10 resolve for 2 turns',{ab:'rally'})],
  [perkDef('Inspiring presence','Allies within 3 tiles get +10 resolve on morale checks',{mod:{brvAura:10}})],[perkDef('Command','Ability: an ally within 4 tiles gets +3 AP on its next turn',{ab:'command'})],
  [perkDef('Read the field','+15 initiative, +6 ranged defense',{st:{init:15,rd:6}})],[perkDef('Hold fast!','Ability: you and allies within 2 tiles get +10 melee and ranged defense and +15 resolve for 2 turns',{ab:'holdfast'})]]},
 survivor:{n:'Survivor',kind:'style',aff:['melee','ranged','caster','support'],d:'Hard to put down',tiers:[
  [perkDef('Thick skin','+8 hitpoints',{st:{hp:8}})],[perkDef('Second wind','Ability: once per battle, shed 40 fatigue and recover 8–14 hitpoints',{ab:'secwind'})],
  [perkDef('Hard to kill','Take 15% less damage while below half health',{mod:{lastStand:.15}})],[perkDef('Steel nerves','+15 resolve',{st:{brv:15}})],
  [perkDef('Grit','Recover 4 hitpoints at the start of each of your turns',{mod:{regenHP:4}})],[perkDef('Undying','Once per battle, a blow that would kill you leaves you at 1 hitpoint',{flag:'undying'})]]},
 medic:{n:'Field medic',kind:'style',aff:['support'],d:'Keeps the company standing',tiers:[
  [perkDef('Bandage','Ability: heal yourself or an adjacent ally 10–16 hitpoints and stop bleeding',{ab:'bandage'})],[perkDef('Steady hands','+25% healing from your abilities',{mod:{healB:.25}})],
  [perkDef('Triage','Ability: heal 6–10 and clear bleeding, burning, poison, daze, chill, roots and weakness',{ab:'triage'})],[perkDef('Watchful eye','Allies next to you recover 3 hitpoints at the start of their turns',{mod:{medAura:3}})],
  [perkDef('Field surgeon','+25% more healing from your abilities, +5 resolve',{mod:{healB:.25},st:{brv:5}})],[perkDef('Miracle','Ability: once per battle, you and every ally within 2 tiles heal 14–22',{ab:'surge'})]]},
 scout:{n:'Scout',kind:'style',aff:['ranged','light'],d:'Eyes ahead of the company',tiers:[
  [perkDef('Quick start','+12 initiative',{st:{init:12}})],[perkDef('Mark target','Ability: mark a foe within 7 tiles: +15 to hit it for its next 2 turns (2 AP, cannot miss)',{ab:'mark'})],
  [perkDef('Ambush','+20% damage to foes still at full health',{mod:{vsFull:.2}})],[perkDef('Quick hands','The first weapon swap each turn costs no AP',{flag:'freeSwap'})],
  [perkDef('Flanker','+10 to hit in melee against a foe one of your allies is also next to',{mod:{flank:10}})],[perkDef('Vanish','Ability: slip up to 4 tiles away over anything, +15 melee and ranged defense until your next turn',{ab:'vanish'})]]},
 berserker:{n:'Berserker',kind:'style',aff:['melee'],d:'Blood and fury',tiers:[
  [perkDef('Battle hunger','Recover 6 hitpoints whenever you kill a foe',{mod:{killHeal:6}})],[perkDef('Rage','Ability: +25% damage and −10 melee defense for 2 turns (2 AP)',{ab:'rage'})],
  [perkDef('Blood rage','+20% damage while below half health',{mod:{lowHpDmg:.2}})],[perkDef('Reckless','+10 melee skill, −5 melee defense',{st:{ms:10,md:-5}})],
  [perkDef('Pain-fed','Take 10% less damage below half health; recover 6 more hitpoints on a kill',{mod:{lastStand:.1,killHeal:6}})],[perkDef('Whirlwind','Ability: strike every adjacent foe for 110% damage',{ab:'whirl'})]]},
 sharpshooter:{n:'Sharpshooter',kind:'style',aff:['ranged','bow'],d:'One shot, one body',tiers:[
  [perkDef('Sure aim','Your shots ignore 1 step of cover',{mod:{coverIgn:1}})],[perkDef('Headshot','Ability: +40% head chance, −5 to hit',{ab:'headshot'})],
  [perkDef('Long shot','No hit penalty for distance; +4 ranged skill',{mod:{longShot:1},st:{rs:4}})],[perkDef('Bodkin points','+15% armor piercing on weapon attacks',{mod:{ignB:.15}})],
  [perkDef('Killing shot','+20% damage to foes below half health',{mod:{vsHurt:.2}})],[perkDef('Through and through','Ability: 120% damage, +20% armor piercing, then on into up to 2 foes behind for 75%',{ab:'pshot'})]]},
 brawler:{n:'Brawler',kind:'style',aff:['melee'],d:'Fists, boots and foreheads',tiers:[
  [perkDef('Scrapper','+4 melee skill, +4 hitpoints',{st:{ms:4,hp:4}})],[perkDef('Kick','Ability: boot a foe back 1 tile and daze it, +10 to hit (3 AP)',{ab:'kick'})],
  [perkDef('Iron jaw','+8 resolve; take 10% less damage from melee blows',{st:{brv:8},mod:{drMelee:.1}})],[perkDef('Headbutt','Ability: the foe loses its next turn; −10 to hit',{ab:'headbutt'})],
  [perkDef('Grapple','Ability: hold a foe: it cannot move for 2 turns and is marked for 1',{ab:'grapple'})],[perkDef('Haymaker','Ability: 150% damage, knockback 2 and daze, −10 to hit',{ab:'haymaker'})]]},
 /* ---- gift trees: today's four under their old keys, the variants beside them ---- */
 mana:{n:'Arcana',kind:'gift',res:'mana',style:'caster',aff:['caster'],d:'Awakens Mana for spellcraft',tiers:[
  [perkDef('Arcane bolt','Awakens Mana (30). Ability: a 22–34 magic bolt at 5 tiles',{ab:'bolt'})],[perkDef('Fireball','Ability: 20–32 magic damage at 5 tiles, 70% of it to every foe beside the target, all burn for 2 turns',{ab:'fireball'})],
  [perkDef('Blink','Ability: teleport up to 4 tiles (3 AP)',{ab:'blink'})],[perkDef('Chain lightning','Ability: 26–40 magic damage, arcing to 2 more foes within 3 tiles for 60%',{ab:'chain'})],
  [perkDef('Deep well','+20 Mana, +3 Mana a turn',{res:20,regen:3})],[perkDef('Starfall','Ability: 34–52 magic damage within 6 tiles, 70% to every foe beside the target, all dazed',{ab:'starfall'})]]},
 mana_m:{n:'Runeblade',kind:'gift',res:'mana',style:'melee',aff:['melee'],d:'Mana etched into the blade',tiers:[
  [perkDef('Runic edge','Awakens Mana (30). Ability: a weapon strike with +25% armor piercing, +5 to hit',{ab:'runeedge'})],[perkDef('Mana shield','Ability: take 30% less damage for 2 turns',{ab:'manashield'})],
  [perkDef('Blink strike','Ability: appear beside a foe up to 4 tiles away and strike for 110%',{ab:'blinkstrike'})],[perkDef('Spellfed blade','Kills restore 8 Mana; +5 melee skill',{mod:{killRes:8},st:{ms:5}})],
  [perkDef('Arcane surge','+20 Mana, +2 Mana a turn',{res:20,regen:2})],[perkDef('Runic overload','Ability: 160% damage, +30% armor piercing, dazes, arcs to 1 more foe for 60%',{ab:'overload'})]]},
 mana_r:{n:'Arcane archery',kind:'gift',res:'mana',style:'ranged',aff:['ranged','bow'],d:'Mana guides the arrow',tiers:[
  [perkDef('Seeker arrow','Awakens Mana (30). Ability: a shot that cannot miss, 85% damage',{ab:'seeker'})],[perkDef('Guided fletching','Shots ignore 1 step of cover and have no distance penalty',{mod:{coverIgn:1,longShot:1}})],
  [perkDef('Arcane volley','Ability: 90% damage to the target, 63% to every foe beside it',{ab:'avolley'})],[perkDef('Binding rune','Ability: 60% damage, the target cannot move for 2 turns and is marked for 2',{ab:'bindshot'})],
  [perkDef('Deep quiver','+20 Mana, +3 Mana a turn, +5 ranged skill',{res:20,regen:3,st:{rs:5}})],[perkDef('Starpiercer','Ability: 130% damage, +30% armor piercing, on through up to 3 foes behind for 75%',{ab:'starpierce'})]]},
 aura:{n:'Aura arts',kind:'gift',res:'aura',style:'melee',aff:['melee'],d:'Awakens Aura to augment weapon strikes',tiers:[
  [perkDef('Aura strike','Awakens Aura (30). Ability: a weapon strike for 150%, +10 to hit',{ab:'astrike'})],[perkDef('Aura wave','Ability: a full weapon strike at a foe up to 3 tiles away',{ab:'awave'})],
  [perkDef('Crushing blow','Ability: 120% damage, knockback 2 tiles, stuns',{ab:'crush'})],[perkDef('Aura dash','Ability: rush a foe up to 4 tiles away and strike for 120%',{ab:'adash'})],
  [perkDef('Overflow','+15 Aura, +10% damage',{res:15,st:{dmg:.1}})],[perkDef('Avatar of war','Ability: +30% damage, +10 melee skill and defense for 2 turns',{ab:'avatar'})]]},
 aura_r:{n:'Aura archery',kind:'gift',res:'aura',style:'ranged',aff:['ranged','bow'],d:'Aura poured into the bowstring',tiers:[
  [perkDef('Aura arrow','Awakens Aura (30). Ability: a shot for 140%, +5 to hit',{ab:'aarrow'})],[perkDef('Piercing volley','Ability: full damage, then on through up to 2 foes behind for 75%',{ab:'pvolley'})],
  [perkDef('Aura sight','+8 ranged skill, +1 bow range',{st:{rs:8},mod:{rngB:1}})],[perkDef('Concussive arrow','Ability: 110% damage, knocks back 1 tile and dazes',{ab:'carrow'})],
  [perkDef('Radiant quiver','+15 Aura, +10% damage with bows',{res:15,mod:{dmgRanged:.1}})],[perkDef('Sunburst arrow','Ability: 170% damage, +30% armor piercing, 70% to every foe beside the target',{ab:'sunarrow'})]]},
 qi:{n:'Elemental way',kind:'gift',res:'qi',style:'melee',aff:['melee'],d:'Awakens Qi for elemental weapon arts',tiers:[
  [perkDef('Flame edge','Awakens Qi (30). Ability: 110% damage and the foe burns for 3 turns',{ab:'flame'})],[perkDef('Frost edge','Ability: 110% damage; the foe loses 3 AP on its next turn',{ab:'frost'})],
  [perkDef('Gale step','Ability: leap up to 3 tiles over anything (2 AP)',{ab:'gale'})],[perkDef('Thunder cleave','Ability: strike every adjacent foe, +20% armor piercing',{ab:'thunder'})],
  [perkDef('Harmony','+15 Qi, +2 Qi a turn',{res:15,regen:2})],[perkDef('Storm dragon','Ability: 150% damage, burns and chills, leaps to 2 more foes for 60%',{ab:'dragon'})]]},
 qi_r:{n:'Elemental arrows',kind:'gift',res:'qi',style:'ranged',aff:['ranged','bow'],d:'Fire, frost and thunder on the string',tiers:[
  [perkDef('Fire arrow','Awakens Qi (30). Ability: full damage and the target burns for 3 turns',{ab:'farrow'})],[perkDef('Frost arrow','Ability: full damage; the target loses 3 AP on its next turn',{ab:'iarrow'})],
  [perkDef('Wind step','Ability: leap up to 3 tiles over anything (2 AP): out of melee, free to shoot again',{ab:'gale'})],[perkDef('Thunder arrow','Ability: 110% damage, dazes, arcs to 2 more foes for 60%',{ab:'tarrow'})],
  [perkDef('Harmony','+15 Qi, +2 Qi a turn',{res:15,regen:2})],[perkDef('Tempest volley','Ability: 120% damage, 84% to every foe beside the target, all burn and are chilled',{ab:'tempest'})]]},
 chi:{n:'Inner flow',kind:'gift',res:'chi',style:'support',aff:['support'],d:'Awakens Chi for reinforcement and support',tiers:[
  [perkDef('Reinforce','Awakens Chi (30). Ability: +15 melee and ranged defense and 25% less damage for 2 turns',{ab:'reinforce'})],[perkDef('Mend','Ability: heal yourself or an adjacent ally 18–28',{ab:'mend'})],
  [perkDef('Empower','Ability: an ally within 2 tiles gets +12 melee and ranged skill and +20% damage for 2 turns',{ab:'empower'})],[perkDef('Swift meridian','Ability: an ally within 2 tiles gets +3 AP on its next turn',{ab:'swift'})],
  [perkDef('Iron body','+15 Chi, +12 hitpoints',{res:15,st:{hp:12}})],[perkDef('Lotus circle','Ability: you and every ally within 2 tiles heal 12–20',{ab:'lotus'})]]},
 chi_m:{n:'Iron fist',kind:'gift',res:'chi',style:'melee',aff:['melee'],d:'Chi through hands and blade',tiers:[
  [perkDef('Chi palm','Awakens Chi (30). Ability: 120% damage and knockback 1',{ab:'palm'})],[perkDef('Iron skin','Take 10% less damage from everything',{mod:{drB:.1}})],
  [perkDef('Hundred hands','Ability: three blows at 55% damage, +5 to hit each',{ab:'hundred'})],[perkDef('Inner calm','+6 melee and ranged defense, +10 resolve',{st:{md:6,rd:6,brv:10}})],
  [perkDef('Iron body','+15 Chi, +12 hitpoints',{res:15,st:{hp:12}})],[perkDef('Shattering palm','Ability: 180% damage, +50% armor piercing, stuns',{ab:'shatter'})]]},
 chi_r:{n:'Steady breath',kind:'gift',res:'chi',style:'ranged',aff:['ranged','bow'],d:'Chi stills the archer',tiers:[
  [perkDef('Steady breathing','Awakens Chi (30). Ability: +15 ranged skill for 2 turns (2 AP)',{ab:'breath'})],[perkDef('Chi focus','+10% head chance with weapon attacks, +4 ranged skill',{mod:{headB:10},st:{rs:4}})],
  [perkDef('Pressure-point arrow','Ability: 80% damage, dazes and weakens (−25% damage) for 2 turns',{ab:'pparrow'})],[perkDef('Calm mind','+15 Chi, +2 Chi a turn, +10 resolve',{res:15,regen:2,st:{brv:10}})],
  [perkDef('Point-blank','You may shoot with foes next to you (no ranged lock)',{flag:'noLock'})],[perkDef('Spirit arrow','Ability: full damage straight to hitpoints, ignoring armor, +10 to hit',{ab:'spiritarrow'})]]},
 /* ---- weapon trees: only while a weapon of the family is in hand ---- */
 sword:{n:'Swordplay',kind:'weapon',wt:'sword',aff:['melee','one'],d:'Edge, point and guard',tiers:[
  [perkDef('Edge discipline','+5 to hit with swords',{wmod:{hit:5}}),perkDef('Swift guard','+5 melee defense with a sword in hand',{st:{md:5}})],
  [perkDef('Blade dance','Ability: strike every adjacent foe at 75% damage',{ab:'bladedance'}),perkDef('Keen edge','+4 sword damage (min and max)',{wmod:{d:[4,4]}})],
  [perkDef('Masterstroke','Ability: 150% damage, +15 to hit',{ab:'masterstroke'}),perkDef('Bladesong','+5 melee skill, +10% damage with a sword in hand',{st:{ms:5,dmg:.1}})]]},
 axe:{n:'Axe craft',kind:'weapon',wt:'axe',aff:['melee'],d:'Hewing through wood and men',tiers:[
  [perkDef('Hew','+10% armor piercing with axes',{wmod:{ign:.1}}),perkDef('Shieldbreaker','Split shield does 50% more damage to shields',{mod:{splitB:.5}})],
  [perkDef('Bloody edge','Axe hits that reach flesh bleed for 2 turns',{mod:{bleedOn:2}}),perkDef('Heft','+3 minimum and +6 maximum axe damage',{wmod:{d:[3,6]}})],
  [perkDef('Behead','Ability: 120% damage, a further +50% against a foe below half health, +15% head chance',{ab:'axeexec'}),perkDef('Reaver','+10% damage with an axe in hand; recover 5 hitpoints on a kill',{st:{dmg:.1},mod:{killHeal:5}})]]},
 mace:{n:'Mace work',kind:'weapon',wt:'mace',aff:['melee'],d:'Bruises through steel',tiers:[
  [perkDef('Bonebreaker','+10% chance to stun on a mace hit',{wmod:{stun:.1}}),perkDef('Weighted head','+10% armor piercing with maces',{wmod:{ign:.1}})],
  [perkDef('Skullcracker','Ability: full damage, +50% head chance, dazes for 2 turns',{ab:'skullcrack'}),perkDef('Ringing blows','+10% head chance with a mace in hand',{mod:{headB:10}})],
  [perkDef('Sunder','Ability: 80% damage, +20% armor piercing; the foe is weakened and marked for 2 turns',{ab:'sunder'}),perkDef('Judgment','+15% damage with a mace in hand',{st:{dmg:.15}})]]},
 dagger:{n:'Knife fighting',kind:'weapon',wt:'dagger',aff:['melee','one','light'],d:'Close, quick and dirty',tiers:[
  [perkDef('Quick blade','Dagger attacks cost 1 less AP (at least 2)',{wmod:{ap:-1}}),perkDef('Knife in the ribs','+15% damage in melee against a foe one of your allies is also next to',{mod:{flankDmg:.15}})],
  [perkDef('Gut','Ability: 80% damage, +5 to hit, bleeds for 3 turns',{ab:'gut'}),perkDef('Lightfoot','+10 initiative, +4 melee defense with a dagger in hand',{st:{init:10,md:4}})],
  [perkDef('Assassinate','Ability: full damage straight to hitpoints, +50% against a foe below half health',{ab:'assassin'}),perkDef('Venom','Dagger hits that reach flesh bleed for 2 turns',{mod:{bleedOn:2}})]]},
 spear:{n:'Spear drill',kind:'weapon',wt:'spear',aff:['melee'],d:'Point and reach (pikes too)',tiers:[
  [perkDef('Steady point','+5 to hit with spears',{wmod:{hit:5}}),perkDef('Brace','+5 melee defense with a spear in hand',{st:{md:5}})],
  [perkDef('Skewer','Ability: 90% damage, then 75% of it to the foe right behind',{ab:'skewer'}),perkDef('Set for the charge','+20% damage to foes still at full health',{mod:{vsFull:.2}})],
  [perkDef('Pin','Ability: 110% damage and the foe cannot move for 2 turns',{ab:'pinspear'}),perkDef('Shoulder to shoulder','+5 defense beside an ally, +10% damage with a spear in hand',{mod:{adjDef:5},st:{dmg:.1}})]]},
 bow:{n:'Archery',kind:'weapon',wt:'bow',aff:['ranged','bow'],d:'String, shaft and fletching',tiers:[
  [perkDef('Fletcher','+3 minimum and +4 maximum bow damage',{wmod:{d:[3,4]}}),perkDef('Steady stance','+6 ranged skill with a bow in hand',{st:{rs:6}})],
  [perkDef('Double shot','Ability: two shots at 60% damage, −5 to hit each',{ab:'doubleshot'}),perkDef('Broadheads','Arrows that reach flesh bleed for 2 turns',{mod:{bleedOn:2}})],
  [perkDef('Crippling shot','Ability: 90% damage, the target cannot move on its next turn and is weakened for 2',{ab:'cripple'}),perkDef('Nimble fingers','Bow attacks cost 1 less AP (at least 2)',{wmod:{ap:-1}})]]},
 staff:{n:'Staff arts',kind:'weapon',wt:'staff',aff:['caster','melee'],d:'Quarterstaff and focus',tiers:[
  [perkDef('Staff guard','+5 melee and ranged defense with a staff in hand',{st:{md:5,rd:5}}),perkDef('Channeling','+10% spell damage with a staff in hand',{wmod:{spell:.1}})],
  [perkDef('Pole vault','Ability: vault up to 3 tiles over anything',{ab:'vault'}),perkDef('Warding','Take 10% less damage from shots and spells with a staff in hand',{mod:{drRanged:.1}})],
  [perkDef('Ringing staff','Ability: strike every adjacent foe at 90% and daze them',{ab:'staffquake'}),perkDef('Archstaff','+15% spell damage and +10 resolve with a staff in hand',{wmod:{spell:.15},st:{brv:10}})]]},
 fist:{n:'Open hand',kind:'weapon',wt:'fist',aff:['melee','light'],d:'Unarmed fighting',tiers:[
  [perkDef('Iron knuckles','Fists deal +6 minimum and +8 maximum damage',{wmod:{d:[6,8]}}),perkDef('Flowing stance','+6 melee defense while unarmed',{st:{md:6}})],
  [perkDef('Flurry of fists','Ability: three punches at 70% damage',{ab:'fistflurry'}),perkDef('Pressure points','+15% chance to stun with fists',{wmod:{stun:.15}})],
  [perkDef('Dragon kick','Ability: 140% damage, knockback 2, dazes',{ab:'dragonkick'}),perkDef('Empty hand','Fists deal +6/+8 more damage and +20% armor piercing',{wmod:{d:[6,8],ign:.2}})]]},
 /* ---- the arms update: five more families and the shield ---- */
 hammer:{n:'Hammer craft',kind:'weapon',wt:'hammer',aff:['melee'],d:'Plate is only metal',tiers:[
  [perkDef('Plate breaker','Hammer hits crush 30% more armor',{wmod:{crush:.3}}),perkDef('Heavy head','+2 minimum and +5 maximum hammer damage',{wmod:{d:[2,5]}})],
  [perkDef('Bell ringer','Ability: 80% damage, +20% head chance, stuns; −5 to hit',{ab:'ringblow'}),perkDef('Momentum','+15% damage with a hammer against a foe whose body armor still holds',{mod:{vsArm:.15}})],
  [perkDef('Demolish','Ability: 140% damage, armor crushed twice as hard, +20% armor piercing',{ab:'demolish'}),perkDef('Anvil','+10 hitpoints, +10% armor piercing with a hammer in hand',{st:{hp:10},wmod:{ign:.1}})]]},
 polearm:{n:'Polearm drill',kind:'weapon',wt:'polearm',aff:['melee','two'],d:'Bills, halberds and glaives from the second rank',tiers:[
  [perkDef('Long reach','+5 to hit with polearms',{wmod:{hit:5}}),perkDef('Keep them off','+5 melee defense with a polearm in hand',{st:{md:5}})],
  [perkDef('Trip','Ability: 60% damage, the foe cannot move on its next turn and is dazed',{ab:'trip'}),perkDef('Leverage','+10% damage with a polearm in hand',{st:{dmg:.1}})],
  [perkDef('Headsman’s arc','Ability: 130% damage, +40% more against a foe below half health, +15% head chance',{ab:'glaivecut'}),perkDef('Second rank','+10 to hit when you strike a foe 2 tiles away',{mod:{reachHit:10}})]]},
 greatsword:{n:'Greatsword school',kind:'weapon',wt:'greatsword',aff:['melee','two'],d:'Two hands on a long blade',tiers:[
  [perkDef('Edge alignment','+5 to hit with greatswords',{wmod:{hit:5}}),perkDef('Broad blade','+3 minimum and +6 maximum greatsword damage',{wmod:{d:[3,6]}})],
  [perkDef('Wide arc','Ability: strike every adjacent foe at 90% damage',{ab:'gsweep'}),perkDef('Measure','+4 melee defense and +5 initiative with a greatsword in hand',{st:{md:4,init:5}})],
  [perkDef('Mordhau','Ability: a hilt blow at an adjacent foe: 110% damage that crushes armor, stuns; −5 to hit',{ab:'mordhau'}),perkDef('Master of the long sword','+5 melee skill, +10% damage with a greatsword in hand',{st:{ms:5,dmg:.1}})]]},
 crossbow:{n:'Crossbow drill',kind:'weapon',wt:'crossbow',aff:['ranged'],d:'Crank, quarrel and trigger',tiers:[
  [perkDef('Quick crank','Reloading a crossbow costs 1 less AP (at least 2)',{wmod:{rld:-1}}),perkDef('Steady rest','+6 ranged skill with a crossbow in hand',{st:{rs:6}})],
  [perkDef('Pinning bolt','Ability: 80% damage, the target cannot move for 2 turns',{ab:'xpin'}),perkDef('Bodkin points','+10% armor piercing with crossbows',{wmod:{ign:.1}})],
  [perkDef('Heartseeker','Ability: 150% damage, +10 to hit, +15% head chance (6 AP)',{ab:'xheart'}),perkDef('Well oiled','Reloading costs 1 less AP; +3 minimum and +5 maximum crossbow damage',{wmod:{rld:-1,d:[3,5]}})]]},
 flintlock:{n:'Gunnery',kind:'weapon',wt:'flintlock',aff:['ranged'],d:'Powder, ball and nerve',tiers:[
  [perkDef('Powder measure','+4 minimum and +6 maximum firearm damage',{wmod:{d:[4,6]}}),perkDef('Calm in the smoke','+6 ranged skill with a firearm in hand',{st:{rs:6}})],
  [perkDef('Deafening shot','Ability: 90% damage, dazes and tests the target’s morale',{ab:'fdeafen'}),perkDef('Ramrod drill','Reloading a firearm costs 1 less AP (at least 2)',{wmod:{rld:-1}})],
  [perkDef('Execution','Ability: 125% damage, +15% armor piercing, +50% more against a foe below half health',{ab:'fexecute'}),perkDef('Gunsmith','+10% armor piercing and +5 to hit with firearms',{wmod:{ign:.1,hit:5}})]]},
 shield:{n:'Shield work',kind:'weapon',wt:'shield',aff:['shield','melee'],d:'Boss, rim and wall (only while a shield is raised)',tiers:[
  [perkDef('Shield discipline','A raised shield gives +4 more melee and ranged defense',{mod:{shieldDef:4}}),perkDef('Hardened boss','Your shield has 30% more hitpoints',{mod:{shieldHp:.3}})],
  [perkDef('Shield charge','Ability: rush up to 3 tiles and slam into a foe: knockback 1, daze',{ab:'scharge'}),perkDef('Deflect','Take 10% less damage from shots and spells while your shield is raised',{mod:{deflect:.1}})],
  [perkDef('Testudo','Ability: you and every ally next to you get +8 melee and +20 ranged defense and no knockback until your next turn',{ab:'fortress'}),perkDef('Iron wall','Take 10% less damage from everything while your shield is raised',{mod:{shieldDr:.1}})]]},
 /* ---- armor trees: every merc has all three; each works only while the body armor worn is of its weight class (armorClass(m):
         light = up to 60 armor or any robe, also no armor; medium = 61 to 150; heavy = over 150). Tiers open at levels 2, 5, 8. ---- */
 lightarmor:{n:'Light armor',kind:'armor',aw:'light',aff:['light'],d:'Cloth, leather and robes: not being there (only while your body armor is light: up to 60 armor, or a robe)',tiers:[
  [perkDef('Nimble','Take less damage the lighter you go: 30% minus 1.5% per point of body armor and helmet weight (their fatigue), at full strength while fresh and half of it when exhausted (scales with the stamina you have left)',{mod:{nimble:1}}),
   perkDef('Fleet','After you move on your turn: +10 ranged defense against shots until your next turn',{mod:{fleet:10}})],
  [perkDef('Sidestep','Once between your turns, a blow that would take more than 25% of your maximum hitpoints only grazes you: you lose half those hitpoints',{mod:{sidestep:.25}}),
   perkDef('Slippery','The first tile you leave each turn draws no free attacks',{flag:'slip'})],
  [perkDef('Fresh legs','+8 melee and ranged defense while your fatigue is below half',{mod:{freshDef:8}}),
   perkDef('Dancer','Every attack that misses you gives +5 melee and ranged defense until your next turn (up to +15)',{mod:{dance:5}})]]},
 medarmor:{n:'Medium armor',kind:'armor',aw:'medium',aff:['melee','ranged'],d:'Mail, leather and brigandine: give a little, keep the rest (only while your body armor is medium: 61 to 150 armor)',tiers:[
  [perkDef('Brace','The first blow that hits you between your turns deals 20% less damage',{mod:{brace:.2}}),
   perkDef('Mail mender','Regain 6 body armor at the start of each of your turns (up to its maximum)',{mod:{armRegen:6}})],
  [perkDef('Rolling with it','Knockbacks, hooks and stuns against you work only half the time',{mod:{roll:.5}}),
   perkDef('Steady footing','Moving costs 1 fatigue a tile instead of 2',{flag:'footing'})],
  [perkDef('Layered defense','+6 melee and ranged defense while your body armor is above half',{mod:{layerDef:6}}),
   perkDef('Padded under-layer','The share of a blow that pierces your body armor is a third smaller (head hits excluded)',{mod:{padIgn:1/3}})]]},
 heavyarmor:{n:'Heavy armor',kind:'armor',aw:'heavy',aff:['melee','shield'],d:'Plate and scale: a wall that walks (only while your body armor is heavy: over 150 armor)',tiers:[
  [perkDef('Immovable','You cannot be knocked back or dragged',{flag:'kbImm'}),
   perkDef('Iron lung','Your body armor and helmet cost half as much fatigue (rounded down)',{flag:'ironLung'})],
  [perkDef('Unbowed','A single blow never strips more than 30% of the armor it strikes (body armor or helmet, of its maximum)',{mod:{unbowed:.3}}),
   perkDef('Bulwark of steel','Allies next to you take 10% less damage',{mod:{steelWall:.1}})],
  [perkDef('Juggernaut','Every blow that reaches your hitpoints takes 5 fewer (at least 1)',{mod:{hpSoak:5}}),
   perkDef('Unshakable','You cannot be stunned, and heavy blows do not test your morale',{flag:'noStun'})]]}
};
/* ---- Monster hunter (kind 'hunter'): 9 tiers of one perk, tier t opens at level t (tierLevel). Each perk is a quarry (QUARRY, keyed by
   the perk id): against a unit whose EN id is in QUARRY[k].en, a merc who has learned it deals +QUARRYB% damage plus per% for every one of
   that quarry it has slain (m.slain[k], counted always, also before the perk is learned), up to cap kills, and gets floor(kills x per / 2)
   to hit. Wyverns are never a quarry. Only backgrounds with BG[bg].ht may learn it (hunterTrees). Rules: quarryVs / quarryInfo (61-talents.js). ---- */
const QUARRYB=5;
const QUARRY={
 'hunter.gob':    {n:'Goblins',      one:'goblin',      tag:'Goblin-slayer',  en:['gob','gobarch','gobsham'],        per:1,cap:30},
 'hunter.spider': {n:'Webspinners',  one:'webspinner',  tag:'Spider-slayer',  en:['spider'],                         per:1,cap:30},
 'hunter.wolf':   {n:'Direwolves',   one:'direwolf',    tag:'Wolf-slayer',    en:['wolf'],                           per:1,cap:30},
 'hunter.dead':   {n:'Restless dead',one:'restless dead',tag:'Grave-warden',  en:['skel','zomb','skelhal','necro'],  per:2,cap:15},
 'hunter.serpent':{n:'Serpents',     one:'serpent',     tag:'Serpent-slayer', en:['adder','viper','gserp'],          per:2,cap:15},
 'hunter.bear':   {n:'Owlbears',     one:'owlbear',     tag:'Owlbear-slayer', en:['bear'],                           per:3,cap:10},
 'hunter.rift':   {n:'Riftspawn',    one:'riftspawn',   tag:'Rift-warden',    en:['imp','vknight','vmage','tyrant'], per:3,cap:10},
 'hunter.ent':    {n:'Ents',         one:'ent',         tag:'Ent-feller',     en:['thorn','ent','elder'],            per:5,cap:6},
 'hunter.ogre':   {n:'Ogres',        one:'ogre',        tag:'Ogre-slayer',    en:['ogre','aogre'],                   per:5,cap:6}};
const QUARRYOF={};for(const k in QUARRY){QUARRY[k].key=k;for(const e of QUARRY[k].en)QUARRYOF[e]=k}   // EN id -> quarry (perk) key
function quarryText(k){const Q=QUARRY[k],hit=Q.per%2===0?`+${Q.per/2} to hit for every one`:Q.per===1?'+1 to hit for every two':`+${Q.per} to hit for every two (an odd one adds ${Math.floor(Q.per/2)})`;
 return`Against ${Q.n.toLowerCase()}: +${QUARRYB}% damage once learned, plus +${Q.per}% damage for every one you have slain and ${hit} (kills count from your first, up to ${Q.cap}: at most +${QUARRYB+Q.per*Q.cap}% damage, +${Math.floor(Q.per*Q.cap/2)} to hit)`}
MAST.hunter={n:'Monster hunter',kind:'hunter',aff:['melee','ranged'],d:'Know your quarry: every kill of a kind makes the next one easier (never wyverns)',
 tiers:Object.keys(QUARRY).map(k=>[perkDef(QUARRY[k].tag,quarryText(k),{id:k,quarry:k})])};
// Perk ids, the flat list p (read by older UI code) and the tier count n.
for(const k in MAST){const T=MAST[k];T.p=[];T.tiers.forEach((tier,ti)=>tier.forEach((p,j)=>{if(!p.id)p.id=k+'.'+(ti+1)+(tier.length>1?'ab'[j]:'');T.p.push(p)}))}
const MUNDANE=Object.keys(MAST).filter(k=>MAST[k].kind==='style');
// Gift variants: GIFTV[res][style] -> tree key. A style the gift has no variant for falls back to melee.
const GIFTV={mana:{caster:'mana',melee:'mana_m',ranged:'mana_r'},aura:{melee:'aura',ranged:'aura_r'},qi:{melee:'qi',ranged:'qi_r'},chi:{support:'chi',melee:'chi_m',ranged:'chi_r'}};
/* Backgrounds. st may carry brv (resolve); gear lists one pick per slot, '-' meaning nothing (helmets are k:'h'). */
const BG={
 farmhand:{n:'Farmhand',cost:90,wage:8,w:5,st:{hp:8,fat:10,ms:-3},m:['vanguard','bulwark'],r:[['chi',.15]],gear:['club|knife|mallet|pitchfork|hatchet','rags|rags|jack','hood|-|armcap']},
 militia:{n:'Militiaman',cost:160,wage:11,w:5,st:{ms:4,md:2,brv:3},m:['vanguard','bulwark'],r:[['aura',.15]],gear:['spear|spear|bill|pitchfork','padded|jack','buckler|targe','cap|hood|armcap']},
 hunter:{n:'Hunter',cost:220,wage:13,w:4,st:{rs:12,ms:-4,init:8},m:['marksman','skirmisher'],r:[['qi',.3]],gear:['shortbow|huntbow|huntbow|lightxbow|huntxbow','rags|padded|jack','hood']},
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
Object.assign(BG.hunter,{style:'ranged',pool:['marksman','sharpshooter','scout','skirmisher','survivor','medic','brawler'],wt:['bow','crossbow','dagger','spear','axe'],at:['lightarmor'],side:'knife'});
Object.assign(BG.thief,{style:'melee',pool:['skirmisher','duelist','scout','survivor','brawler','sharpshooter','marksman'],wt:['dagger','sword','fist','crossbow','flintlock'],at:['lightarmor']});
Object.assign(BG.sellsword,{style:'melee',pool:['vanguard','duelist','brute','bulwark','skirmisher','tactician','berserker','survivor','shieldbearer'],wt:['sword','axe','hammer','spear','shield'],at:['medarmor','heavyarmor'],side:'knife|-|-'});
Object.assign(BG.squire,{style:'melee',pool:['vanguard','bulwark','shieldbearer','duelist','tactician','brute'],wt:['sword','greatsword','spear','polearm','shield'],at:['medarmor','heavyarmor']});
Object.assign(BG.hedge,{style:'caster',pool:['skirmisher','bulwark','medic','scout','survivor','tactician'],wt:['staff','dagger','fist'],at:['lightarmor'],side:'knife|-'});
Object.assign(BG.acolyte,{style:'support',pool:['medic','bulwark','shieldbearer','tactician','survivor','vanguard','brawler'],wt:['mace','hammer','staff','fist','shield'],at:['medarmor']});
Object.assign(BG.monk,{style:'melee',pool:['skirmisher','brawler','duelist','survivor','medic','scout','bulwark'],wt:['fist','staff','spear'],at:['lightarmor']});
Object.assign(BG.spellblade,{style:'melee',pool:['duelist','vanguard','skirmisher','tactician','scout','brute'],wt:['sword','greatsword','staff','dagger','flintlock'],at:['lightarmor','medarmor']});
Object.assign(BG.wildling,{style:'melee',pool:['berserker','brute','survivor','vanguard','skirmisher','scout','marksman','brawler'],wt:['axe','mace','hammer','spear','bow'],at:['lightarmor','medarmor']});
Object.assign(BG.knight,{style:'melee',pool:['vanguard','bulwark','shieldbearer','duelist','brute','tactician','survivor'],wt:['sword','mace','hammer','greatsword','shield'],at:['medarmor','heavyarmor']});
BG.hunter.r=[['qi',.2],['aura',.12],['chi',.08],['mana',.05]];      // a hunter's gift, if any, comes as its archery variant
RACE.human.noWt=[];RACE.elf.noWt=['flintlock','hammer'];RACE.dwarf.noWt=['bow','polearm'];RACE.halforc.noWt=['bow','crossbow','flintlock'];   // weapon trees a race never learns
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
 butcher:{n:'Butcher',cost:140,wage:10,w:4,st:{hp:6,ms:5,md:-2,brv:2},r:[['qi',.1]],gear:['handaxe|hatchet|knife|seax','jack|padded','-|cap'],
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
  style:'ranged',pool:['marksman','scout','skirmisher','survivor','sharpshooter','brawler'],wt:['bow','crossbow','dagger','axe'],at:['lightarmor'],
  tr:{eagle:3,nightowl:3,beastwise:2,greedy:1.5,nearsight:.2,loyal:.5},look:{hat:'hood',cloth:'green',accent:'forest',trim:'',garb:'bandolier',prop:'net'}},
 caravan:{n:'Caravan guard',cost:280,wage:16,w:3,st:{ms:6,md:4,brv:4,hp:3},r:[['aura',.2],['chi',.05]],gear:['spear|boarspear|shortsword|ironmace','padded|leather','roundshield|buckler|kite','cap|coif'],bio:['desert','plains'],town:2,
  style:'melee',pool:['bulwark','shieldbearer','vanguard','tactician','survivor','marksman','scout'],wt:['spear','sword','mace','crossbow','shield'],at:['medarmor','heavyarmor'],
  tr:{loyal:2,steady:1.5,brave:1.5,athletic:1.5,craven:.6},look:{hat:'cap',cloth:'tan',accent:'teal',trim:'steel',garb:'sash'}},
 deserter:{n:'Deserter',cost:200,wage:13,w:4,st:{ms:6,md:3,brv:-8,init:4},r:[['aura',.12],['qi',.06]],gear:['spear|bill|oldsword|warspear','padded|leather|jack','-|buckler','cap|kettle|-'],
  style:'melee',pool:['vanguard','skirmisher','survivor','tactician','shieldbearer','scout','brute'],wt:['spear','polearm','sword','crossbow','shield'],at:['lightarmor','medarmor'],
  tr:{craven:4,brave:.3,quick:2,greedy:1.5,drunkard:1.5,loyal:.2},look:{hat:'cap',cloth:'red',accent:'grey',trim:'',garb:'tatters',beard:'goatee'}},
 brigand:{n:'Brigand',cost:210,wage:13,w:4,st:{ms:7,init:4,brv:2,md:-2},r:[['qi',.15],['aura',.06]],gear:['hatchet|club|seax|falchion|spikedclub','jack|hide|leather','-|targe|roundshield','hood|cap|-'],
  style:'melee',pool:['berserker','skirmisher','brawler','duelist','vanguard','scout'],wt:['axe','mace','sword','dagger','shield'],at:['lightarmor','medarmor'],
  tr:{greedy:3,cocky:2,bloodthirsty:2,loyal:.3,brave:1.5},look:{hat:'bandana',cloth:'night',accent:'crimson',trim:'',garb:'bandolier',beard:'goatee'}},
 pitfighter:{n:'Pit fighter',cost:300,wage:18,w:2,st:{ms:9,hp:6,init:5,md:-3,brv:6},r:[['qi',.3],['chi',.08]],gear:['spikedclub|knife|-|hatchet','rags|hide','-'],town:2,
  style:'melee',pool:['brawler','berserker','duelist','survivor','brute','skirmisher','vanguard'],wt:['fist','mace','axe','dagger'],at:['lightarmor','medarmor'],
  tr:{hardhead:3,glassjaw:1.5,cocky:3,tough:2,bloodthirsty:2,craven:.3,fragile:.3},look:{hat:'',cloth:'red',accent:'tan',trim:'',garb:'manica',hair:'mohawk'}},
 veteran:{n:'Retired soldier',cost:520,wage:26,w:2,st:{ms:10,md:6,brv:10,init:-6,fat:-5,hp:2},r:[['aura',.3],['chi',.05]],gear:['warspear|arming|bill|ironmace','mail|brigandine|leather','kite|roundshield','kettle|nasal|coif'],town:2,
  style:'melee',pool:['vanguard','bulwark','shieldbearer','tactician','survivor','duelist','medic','brute'],wt:['spear','polearm','sword','mace','shield'],at:['medarmor','heavyarmor'],
  tr:{steady:3,brave:2,sluggish:2.5,drunkard:2,asthmatic:1.5,quick:.4,craven:.3,cocky:.4},look:{hat:'kettle',cloth:'steel',accent:'crimson',trim:'steel',garb:'tabard',beard:'stache'}},
 watchman:{n:'Watchman',cost:170,wage:12,w:4,st:{md:4,rd:3,brv:4,init:2},r:[['aura',.12],['chi',.05]],gear:['club|spear|bill|ironmace','padded|jack','buckler|-','cap|kettle|hood'],town:2,
  style:'melee',pool:['bulwark','shieldbearer','tactician','vanguard','marksman','survivor'],wt:['mace','spear','polearm','crossbow','shield'],at:['lightarmor','medarmor'],
  tr:{nightowl:4,eagle:1.5,loyal:1.5,drunkard:1.5},look:{hat:'kettle',cloth:'blue',accent:'ochre',trim:'',garb:'tabard'}},
 noble:{n:'Noble scion',cost:600,wage:34,w:1,st:{ms:6,md:4,brv:8,fat:-6,hp:-3},r:[['aura',.35],['mana',.1]],gear:['arming|falchion|shortsword','brigandine|leather|padded','heater|kite|buckler','coif|cap'],side:'pistol|-|-|rondel',town:3,
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
 sailor:{n:'Sailor',cost:170,wage:12,w:3,st:{fat:8,init:6,md:2,rd:2,hp:2},r:[['qi',.12],['aura',.08]],gear:['seax|hatchet|falchion|boarspear','jack|rags|padded','hood|-|-'],bio:['swamp','plains'],
  style:'melee',pool:['skirmisher','brawler','duelist','survivor','scout','marksman','berserker'],wt:['dagger','axe','sword','spear','flintlock'],at:['lightarmor'],
  tr:{drunkard:3,superstitious:3,athletic:2,dexterous:1.5,asthmatic:.4},look:{hat:'bandana',cloth:'blue',accent:'white',trim:'',garb:'stripes',beard:'chops'}},
 nomad:{n:'Nomad rider',cost:280,wage:15,w:2,st:{rs:8,init:10,md:2,hp:-2},r:[['qi',.2],['aura',.1]],gear:['shortbow|huntbow|recurve','hide|leather|jack','cap|hood'],side:'falchion|seax|knife',bio:['desert','plains','snow'],
  style:'ranged',pool:['marksman','skirmisher','scout','sharpshooter','duelist','survivor','berserker'],wt:['bow','sword','dagger','spear','axe'],at:['lightarmor','medarmor'],
  tr:{quick:3,beastwise:3,eagle:2,sluggish:.3,loyal:1.5},look:{hat:'wrap',cloth:'tan',accent:'rust',trim:'gold',garb:'sash'}},
 beggar:{n:'Beggar',cost:40,wage:4,w:4,st:{hp:-6,fat:-8,ms:-6,brv:-6,init:4},r:[['chi',.1],['mana',.05],['qi',.05]],gear:['knife|club|-','rags','-'],
  style:'melee',pool:['survivor','skirmisher','scout','brawler','medic','duelist'],wt:['dagger','mace','fist','staff'],at:['lightarmor'],
  tr:{lucky:3,fragile:2,drunkard:2.5,craven:2,asthmatic:2,hulking:.2,cocky:.3},look:{hat:'',cloth:'brown',accent:'grey',trim:'',garb:'tatters',hair:'shaggy',beard:'long'}},
 cultist:{n:'Ex-cultist',cost:380,wage:20,w:1,st:{brv:4,hp:-4,ms:-4},r:[['mana',.7],['chi',.15]],gear:['staff|knife|pilgrim','robe|rags','hood'],town:2,
  style:'caster',pool:['survivor','medic','tactician','skirmisher','scout','berserker','brawler'],wt:['staff','dagger','mace'],at:['lightarmor'],
  tr:{superstitious:0,nightowl:3,craven:1.5,bloodthirsty:2,lucky:1.5,loyal:.5},look:{hat:'hood',cloth:'purple',accent:'violet',trim:'',garb:'eye',prop:'censer'}}
});
/* The Beast Slayer: the one sword of the Solo origin (ORIGINS.slayer). w 0 and noHire: never in a tavern, a rival roster or an event. */
BG.slayer={n:'Beast slayer',cost:1100,wage:30,w:0,noHire:1,ht:1,st:{hp:14,ms:12,rs:8,md:8,rd:4,fat:12,brv:16,init:6},r:[['qi',.2],['aura',.12]],
 gear:['boarspear','leather','cap'],side:'huntxbow',
 style:'melee',pool:['survivor','vanguard','skirmisher','scout','berserker','duelist','brute'],wt:['spear','axe','sword','crossbow','dagger'],at:['medarmor','lightarmor'],
 tr:{beastwise:4,tough:2,brave:2,athletic:2,craven:0,fragile:.3,superstitious:.3},look:{hat:'hood',cloth:'black',accent:'charcoal',trim:'steel',garb:'bandolier',beard:'short'}};
for(const k of ['hunter','poacher','witchhunter','wildling'])if(BG[k])BG[k].ht=1;   // the backgrounds that may learn the Monster hunter tree
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
 cocky:{n:'Cocky',good:false,st:{md:-4},flag:'cocky',d:'Starts every battle Confident (+10 to hit, +5 defense until shaken); -4 melee defense.'}
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
 undead:{n:'Restless dead',g:'U',col:'#b9b39a',skin:'#e4e0cf',lair:'Put the restless dead to rest',units:[['skel',15],['zomb',14],['skelhal',21],['necro',30]],rank:[.3,1.4,0,17],loot:['shortsword','kite','spear','mail','bill','halberd']},
 beast:{n:'Beasts',g:'B',col:'#6b5137',skin:'#8a6b49',lair:'Clear a den of beasts',units:[['wolf',19],['wolf',19],['spider',18],['bear',58]],rank:[.38,1.2,.3],loot:[]},
 orc:{n:'Orcs',g:'O',col:'#4f6b46',skin:'#7c9b62',lair:'Break an orc warcamp',units:[['orcy',38],['orcw',62],['obrute',60],['orcl',105]],rank:[.46,1.6,.3,19],loot:['handaxe','waraxe','greataxe','leather','scale','maul','mallet','spiked']},
 bandit:{n:'Brigands',g:'R',col:'#5a5a66',skin:'#d9b99a',lair:'Root out a brigand hideout',units:[['thug',20],['bmark',25],['bxbow',32],['braid',44],['blead',71]],rank:[.5,1.1,.3,19],loot:['shortsword','club','padded','leather','shortbow','mace','heater','lightxbow','crossbow','roundshield','pistol']},
 void:{n:'Riftspawn',g:'V',col:'#7a46b8',skin:'#b99be6',lair:'Purge a riftspawn nest',units:[['imp',26],['vknight',62],['vmage',52]],rank:[.45,1.45],loot:['arming','warspear','scale','focus','warbow','rondel','zweihander','arbalest','steeltower']}
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
 wyvern:{n:'Wyvern',size:2,fly:1,hp:6000,arm:260,helm:200,ms:85,md:14,rd:10,init:120,ap:14,d:[165,220],ign:.45,xp:2400,role:'boss',boss:1,endgame:1,brv:99,fearless:1,abs:['wbite','wsting','wbuffet','wdive']},
 whatch:{n:'Wyvern hatchling',fly:1,hp:85,arm:30,helm:20,ms:62,md:16,rd:16,init:135,ap:10,d:[22,34],xp:200,role:'flanker',brv:70,abs:['hsting']}
});
Object.assign(FACT,{
 serpent:{n:'Serpents',g:'S',col:'#5d7a3a',skin:'#a7b85a',tier:'mid',biomes:['swamp','desert'],spawn:{d0:7,d1:2,gate:.04},lair:'Clear a serpent nest',units:[['adder',14],['adder',14],['viper',17],['gserp',62]],rank:[.56,1.4,.3],loot:['dirk','seax','stiletto','rondel','shortbow','padded','leather','cap'].filter(id=>ITEMS[id])},
 ent:{n:'Ents',g:'E',col:'#4d5f2e',skin:'#7f6a45',tier:'mid',biomes:['forest'],lair:'Burn out a blighted grove',units:[['thorn',18],['thorn',18],['ent',80],['elder',130]],rank:[.4,1.2,.25,19],loot:['witchstave','sigilrobe','longbow','recurve','staff','focus','robe','warbow'].filter(id=>ITEMS[id])},
 ogre:{n:'Ogres',g:'T',col:'#7a6a4a',skin:'#b59a72',tier:'mid',biomes:['hills','mountains','plains'],lair:'Break an ogre camp',units:[['ogre',76],['ogre',76],['aogre',96],['gob',10]],rank:[.42,1.25,.25,19],loot:['spikedclub','morningstar','bellmace','knighthammer','lamellar','sallet','maul','warmaul','scale'].filter(id=>ITEMS[id])},
 wyvern:{n:'Wyverns',g:'W',col:'#6b4a3a',skin:'#a8604a',tier:'end',biomes:['mountains','snow','hills'],lair:'Slay the wyvern of {place}',units:[['wyvern',400],['whatch',40]],rank:[.4,1,.2],loot:['gothic','armet','greatbow','windlass','heater2','plate','arbalest','runegreat'].filter(id=>ITEMS[id]),
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
FACT.free={n:'Free towns',g:'F',col:'#7d8f86',skin:'#d9b99a',tier:'early',house:1,biomes:null,lair:'Break a free town militia',units:HOUSEUNITS,rank:[.5,1.1,.3,19],loot:HOUSELOOT.filter(id=>ITEMS[id])};

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
const RVBG={sellsword:5,militia:4,hunter:3,squire:2,wildling:3,thief:2,knight:1,hedge:1,acolyte:1,monk:1,spellblade:1};
