/* ================= GLADIATORS: the arena's gear and fighters (the colosseum: 29-colosseum.js) =================
   Loads right after 10-data.js, so every table that is built from ITEMS / EN / FACT at load time (famed bases, markets, crafting,
   the legend agent's lists) sees the gladiators' things like any other.
   ITEMS (GLADITEMS, every one glad:1 and tier'd like the rest of the set; sold in the colosseum's armory and won in its bouts, never in
   a town market):
     weapons  gladius gladius2 (short swords, light: at most 8 fatigue), spatha (a long sword), sica (the Thraex's curved blade: slash),
              trident fuscina (one-handed spears: thrust, spear wall and Throw net), cestus cestus2 (fist weapons: 'fist', a free hand)
     shields  parma (a small round shield), scutum (the great curved shield of the murmillo: a wall bonus, like a tower shield)
     armor    manica (arm guard and belt), harness (manica, greave and belt), champharness (the gilded harness of a champion)
     helmets  galea (a crested bowl helm), thraexhelm (the griffin-crested Thraex helm), murmhelm (the murmillo's grilled visor and fish crest)
   EN (the lanista's school, FACT.pit 'The arena school'): gmurm (murmillo: gladius and scutum), gret (retiarius: trident and net),
     gthrax (Thraex: sica and parma), gsecu (secutor: the retiarius' hunter), gchamp (champion of the sands: the school's best; one a band)
   Their foe abilities (gnet: the retiarius' cast net) and the company's (netthrow, taunt ...) are in 64g-gladiators.js. */
const GLADITEMS=['gladius','gladius2','spatha','sica','trident','fuscina','cestus','cestus2','parma','scutum','manica','harness','champharness','galea','thraexhelm','murmhelm'];
Object.assign(ITEMS,{
 gladius:{k:'w',n:'Gladius',wt:'sword',d:[28,38],ap:4,fat:7,rng:1,ign:.25,hit:10,price:260,tier:2},
 gladius2:{k:'w',n:'Champion\'s gladius',wt:'sword',d:[36,48],ap:4,fat:7,rng:1,ign:.3,hit:10,price:1150,tier:4},
 spatha:{k:'w',n:'Spatha',wt:'sword',d:[38,52],ap:4,fat:9,rng:1,ign:.2,hit:10,price:900,tier:3},
 sica:{k:'w',n:'Sica',wt:'sword',d:[26,38],ap:4,fat:6,rng:1,ign:.25,hit:5,price:300,tier:2},
 trident:{k:'w',n:'Trident',wt:'spear',d:[26,40],ap:4,fat:9,rng:1,ign:.3,hit:15,price:420,tier:2},
 fuscina:{k:'w',n:'Barbed fuscina',wt:'spear',d:[36,50],ap:4,fat:10,rng:1,ign:.35,hit:15,price:1300,tier:4},
 cestus:{k:'w',n:'Cestus',wt:'fist',d:[18,28],ap:3,fat:4,rng:1,ign:.25,hit:5,price:150,tier:1},
 cestus2:{k:'w',n:'Spiked cestus',wt:'fist',d:[26,38],ap:3,fat:5,rng:1,ign:.3,hit:5,price:700,tier:3},
 parma:{k:'s',n:'Parma',md:12,rd:8,fat:4,price:140,tier:1,look:'roundparma'},
 scutum:{k:'s',n:'Scutum',md:18,rd:24,fat:13,wallB:6,price:620,tier:3,look:'towerscutum'},
 manica:{k:'a',n:'Manica and belt',arm:55,fat:4,price:210,tier:1},
 harness:{k:'a',n:'Gladiator\'s harness',arm:95,fat:8,price:520,tier:2},
 champharness:{k:'a',n:'Champion\'s harness',arm:150,fat:13,price:1450,tier:4},
 galea:{k:'h',n:'Crested galea',arm:100,fat:5,price:460,tier:3},
 thraexhelm:{k:'h',n:'Thraex helm',arm:125,fat:6,price:720,tier:3},
 murmhelm:{k:'h',n:'Murmillo helm',arm:160,fat:9,price:1150,tier:4}
});
{const SK={gladius:['slash','riposte'],gladius2:['slash','riposte'],spatha:['slash','riposte'],sica:['slash'],trident:['thrust','spearwall','netthrow'],fuscina:['thrust','spearwall','netthrow'],cestus:['shove'],cestus2:['shove']};
 for(const id of GLADITEMS){const i=ITEMS[id];i.glad=1;i.look=i.look||id;if(i.k==='w')i.sk=SK[id]||(typeof WSK==='object'&&WSK[i.wt])||[];else if(i.k==='s'){i.sk=['shieldwall','bash'];i.hp=id==='scutum'?96:40}}}
/* ---- the arena school ---- */
Object.assign(EN,{
 gmurm:{n:'Murmillo',hp:82,arm:75,helm:70,ms:60,md:12,rd:14,init:95,d:[26,38],w:'gladius',xp:190,role:'line',brv:60,glad:1,shield:{hp:60,md:12,rd:16},abs:['shieldwall','slash']},
 gret:{n:'Retiarius',hp:62,arm:28,helm:0,noHead:0,ms:62,md:18,rd:10,init:122,d:[24,36],w:'trident',xp:180,role:'flanker',brv:55,glad:1,abs:['gnet','thrust']},
 gthrax:{n:'Thraex',hp:70,arm:55,helm:55,ms:64,md:14,rd:10,init:110,d:[26,40],w:'sica',xp:180,role:'flanker',brv:58,glad:1,shield:{hp:36,md:10,rd:8},abs:['slash']},
 gsecu:{n:'Secutor',hp:88,arm:85,helm:85,ms:62,md:10,rd:16,init:90,d:[28,40],w:'gladius',xp:210,role:'line',brv:65,glad:1,shield:{hp:70,md:12,rd:18},abs:['shieldwall','gtaunt']},
 gchamp:{n:'Champion of the sands',hp:120,arm:120,helm:110,ms:74,md:16,rd:14,init:112,d:[40,58],w:'spatha',xp:420,role:'line',brv:85,glad:1,lead:1,max:1,sub:'gsecu',shield:{hp:80,md:14,rd:18},abs:['shieldwall','slash','gtaunt']}
});
const GLADLOOT=['gladius','sica','trident','cestus','parma','manica','harness','galea'];
FACT.pit={n:'The arena school',g:'A',col:'#b8862e',skin:'#d9b99a',tier:'early',spawn:{gate:2,d0:0,d1:0},arena:1,biomes:null,lair:'',
 units:[['gmurm',34],['gret',30],['gthrax',32],['gsecu',38],['gchamp',80]],rank:[.5,.85,.3,19],loot:GLADLOOT};
/* the arena floor as a battle biome (its tiles and props: 71q-arena.js; the floor itself is laid out by colArenaTiles, 29-colosseum.js) */
BIO.arena={n:'The arena',top:'#d8b878',side:'#8a6a44',rough:'#c4a462',amp:0,block:0,rgh:0,obj:'pillar',sky:'#3a2a1e',arena:1};
