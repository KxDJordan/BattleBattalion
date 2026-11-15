/* ================= FABLED WARRIORS (fabled agent, phase 8 round A) =================
   Rare named fighters, clearly stronger than any tavern sword: a name and title, a short legend, named gear (famed-style unique ITEMS
   with famed:1, fabled:id) and a personal mastery tree (MAST[F.tree], kind 'fabled', owner id: only that warrior may learn it).
     FABLED[id] = {n, title, legend, bg, bgN?, race, fem?, east?, lvl, st:{base stat bonuses}, traits:[], gift?, gear:[item ids], eq?:{slot:plain item},
                   tree:'fab.<id>', where:['recruit','rival','east','crisis','boss'], crisis?:[crisis keys], f?:[faction keys they lead],
                   earn:{k:'renown',tier} | {k:'deed',stat,n,d} | {k:'quarry',q,n} | {k:'duel',tier} | {k:'stand',f,tier}, cost, pt:{portrait}, boss?:{phases}}
   State: G.fabled = {id: {state:'unmet'|'met'|'joined'|'dead'|'rival:<rid>', day?, how?, duel?, town?}}  (fabledRepair validates it)
   Public API:
     fabledMerc(id, o?{lvl, side}) -> a merc (m.fabled = id) built from the record; deterministic (no rnd), fresh ids from G.nid only when o.join
     fabledFor(ctx{k:'east'|'crisis'|'boss'|'rival'|'recruit', crisis?, f?, salt?}) -> an id that can appear there now (alive, free), or null. No rnd.
     fabledSpawn(units, o, used) (startBattle): o.fabled=[ids] mixes fabled merc units (side 1) into the enemy side, at most FABLED_MAX
     fabledEarn(id) -> {ok, text, p, goal}; fabledCan(id) -> {ok, why}; fabledJoin(id) -> merc | null; fabledOffers(townIndex) -> [{id, ...}]
     fabledTown(id) -> the town index where a recruitable fabled waits (deterministic from the seed); fabledDuel(id, mercId) starts the duel
     fabledResolve(b, res, win) (resolveBattle): permanent death, named gear drops, duels won, joined fabled lost; res.fabled = [{id,n,fate,drops}]
     fabledDay() (worldDay, typeof-guarded): rival champions, deserted states; fabledRepair(g) (repairSave)
     bossSetup(b, o) / bossHit(u) / bossRound(b) / bossStatus() -> HUD data for the boss of the battle (phases, enrage, summons)
   UI: openFabled() (a sheet listing the fabled the company has heard of; recruit and duel buttons where they wait). */
const FABLED_MAX=2,FABLED_DROP=.5;
/* ---- named gear ----  [id, base ('a|b': the first that exists), name, mods (FAMED mods), owner] */
const FABLED_GEAR=[
 ['fb:oathkeeper','arming','Oathkeeper',{d:[6,8],hit:6},'aldric'],['fb:vowwall','heater2|heater','The Vow Unbroken',{md:5,rd:4,hp:20},'aldric'],
 ['fb:widowsong','greatbow|longbow','Widow’s Song',{d:[5,8],rng:1},'mirela'],['fb:palecloak','studded|leather','The Pale Wood Cloak',{arm:20,rd:4,fat:3},'mirela'],
 ['fb:anvilfall','dwarfaxe|greataxe','Anvilfall',{d:[6,9],ign:.1},'grimhild'],['fb:anvilround','dwarfround|ironround','The Anvil-Queen’s Round',{hp:30,md:3},'grimhild'],
 ['fb:redtusk','bardiche|greataxe','Red Tusk',{d:[8,12]},'korvak'],['fb:tuskcrown','tuskhelm|barbute','The Tusk Crown',{arm:20},'korvak'],
 ['fb:wolfaxe','greataxe','The Emperor’s Wolf',{d:[8,12],ign:.1},'hakon'],['fb:wolfpelt','hide','Pelt of the White Wolf',{arm:40,fat:3},'hakon'],
 ['fb:gravestaff','archstaff|focus','The Bone Lantern',{spell:.2,d:[4,6]},'ulfgar'],['fb:shroud','archrobe|robe','The Unburied Shroud',{arm:30},'ulfgar'],
 ['fb:nightblade','katana|estoc|arming','Night-Without-Moon',{d:[4,6],hit:6},'kagemaru'],['fb:shadetanto','tanto|stiletto|rondel','Shade',{ign:.1,hit:5},'kagemaru'],
 ['fb:cranepole','naginata|glaive|lucerne','The Crane’s Wing',{d:[5,8],hit:5},'tomoe'],['fb:cranedo','do|lamellar','The Crane Banner Do',{arm:25,md:2},'tomoe'],
 ['fb:demonblade','nodachi|zweihander','Demon-Eater',{d:[8,12],ign:.1},'nobusada'],['fb:demonarmor','oyoroi|coatplates','The Red O-Yoroi',{arm:40},'nobusada'],['fb:demonmask','menpo|kabuto|armet|bascinet','The Oni Mask',{arm:30,md:2},'nobusada'],
 ['fb:lotusstaff','bo|ironstaff','The Iron Lotus',{d:[6,8],stun:.1},'jin'],['fb:lotusrobe','robe','Robe of the Hundred Steps',{arm:30,md:4},'jin'],
 ['fb:witchbane','windlass|arbalest','Witch-Bane',{d:[5,8],rld:1},'seraphine'],['fb:silverpoint','estoc|arming','Silver Point',{hit:8,d:[2,4]},'seraphine'],
 ['fb:saintsrifle','longrifle|musket','The Gunsmoke Saint',{d:[6,10],hit:5},'mattias'],['fb:sinpistol','duelpistol|pistol','Last Rites',{rld:1,hit:4},'mattias'],
 ['fb:sunderedge','runeblade|arming','The Sundered Edge',{ign:.15,hit:5,d:[3,5]},'ysolde'],['fb:riftmail','mailrobe|sigilrobe','Riftwoven Mail',{arm:30,md:3},'ysolde'],
 ['fb:mountainmaul','warmaul|maul','Mountain-Breaker',{d:[8,12],crush:.2},'brannoc'],['fb:bearhide','hide','The Black Bear’s Hide',{arm:45},'brannoc'],
 ['fb:lanternmace','bellmace|morningstar','The Lantern of Saint Vey',{d:[4,6],stun:.1},'agathe'],['fb:saintstower','steeltower|tower','The Saint’s Door',{hp:30,md:3},'agathe'],
 ['fb:hundredbow','yumi|greatbow|longbow','A Hundred Arrows',{d:[5,7],hit:6},'yuki'],['fb:snowdo','do|lamellar','Snowfall Do',{arm:20,rd:5},'yuki']];
// one name per base list: the first item that exists (eastern items from 19-east.js when the East is in the build, else a western stand-in)
function fabledBase(s){for(const b of String(s).split('|'))if(ITEMS[b]&&!ITEMS[b].famed)return b;return null}
function fabledItemBuild(G0){const [id,bs,n,mods,own]=G0,base=fabledBase(bs);if(!base)return null;const B=ITEMS[base];
 const price=Math.round((B.price*2.2+900+Object.keys(mods).length*250)/10)*10,it=famedBuild(id,{base,n,mods,price,from:null,day:null});if(!it)return null;
 it.fabled=own;it.uniq=1;return it}
for(const g of FABLED_GEAR){const it=fabledItemBuild(g);if(it)ITEMS[g[0]]=it}
/* ---- signature abilities (generic ability fields: the rules, the AI and the forecast read them like any other) ---- */
Object.assign(AB,{
 fb_oath:{n:'Oathkeeper’s Judgement',ap:6,fat:20,tgt:'enemy',wpn:1,mult:1.6,hit:10,vsHurt:.25,fx:'slash',d:'Judgement for the oathbreaker: 160% damage, +10 to hit, a further +25% against a foe below half health.'},
 fb_crane:{n:'Crane Sweep',ap:6,fat:22,tgt:'enemy',wpn:1,mult:1,aoe:1,hit:5,fx:'sweep',d:'The crane opens its wings: 100% damage to the target and 70% of that to every foe beside it, +5 to hit.'},
 fb_demon:{n:'Demon’s Due',ap:7,fat:26,tgt:'aoe',wpn:1,mult:1.25,noBow:1,fx:'spin',d:'A cut that takes every foe beside you: 125% damage to each.'},
 fb_silent:{n:'Silent Cut',ap:5,fat:16,tgt:'enemy',wpn:1,mult:1.3,ignB:.25,head:20,noBow:1,fx:'stab',d:'Through the gap in the armor: 130% damage, +25% armor piercing, +20% head chance.'},
 fb_saint:{n:'Lantern Light',ap:5,fat:16,tgt:'self',party:3,heal:[10,16],rally:1,fx:'heal',d:'You and allies within 3 tiles heal 10–16 hitpoints and the shaken regain one step of morale.'},
 fb_hundred:{n:'Hundred Arrows',ap:7,fat:24,tgt:'enemy',wpn:1,needs:'bow',mult:1,aoe:1,hit:5,fx:'volley',d:'An arrow storm: 100% damage to the target and 70% of that to each foe next to it, +5 to hit.'},
 fb_quake:{n:'Mountain Falls',ap:7,fat:28,tgt:'enemy',wpn:1,mult:1.7,ignB:.2,hit:-5,status:{stun:1},noBow:1,fx:'quake',d:'The mountain comes down: 170% damage, +20% armor piercing, stuns. −5 to hit.'}});
/* ---- personal trees: MAST['fab.<id>'], four tiers of one perk each (tierLevel 'fabled': levels 1 4 7 10) ---- */
const FABLED_TREES={
 aldric:['Oath of the Vane',[['Sworn shield','+6 melee and ranged defense, +10 resolve',{st:{md:6,rd:6,brv:10}}],['Hold, brothers','+6 defense while an ally stands beside you; allies within 3 tiles test morale at +10 resolve',{mod:{adjDef:6,brvAura:10}}],
  ['Unbroken vow','Survives the first killing blow at 1 hitpoint',{flag:'undying'}],['Oathkeeper’s Judgement','Ability: 160% damage, +10 to hit, +25% more against a foe below half health',{ab:'fb_oath'}]]],
 mirela:['The Pale Wood',[['Widow’s eye','+10 ranged skill',{st:{rs:10}}],['Long grief','No range penalty to hit; +10% head chance with weapon attacks',{mod:{longShot:1,headB:10}}],
  ['First blood','+20% damage against a foe at full health',{mod:{vsFull:.2}}],['Headshot','Ability: +40% head chance, −5 to hit',{ab:'headshot'}]]],
 grimhild:['The Anvil',[['Forge-hardened','+15 hitpoints',{st:{hp:15}}],['Anvil-footed','Cannot be knocked back; every blow that reaches her hitpoints loses 4',{flag:'kbImm',mod:{hpSoak:4}}],
  ['Plate-splitter','+20% damage against a foe whose armor still holds',{mod:{vsArm:.2}}],['Mountain Falls','Ability: 170% damage, +20% armor piercing, stuns, −5 to hit',{ab:'fb_quake'}]]],
 korvak:['Pit of Red Tusk',[['Pit-born','+8 melee skill, +10 hitpoints',{st:{ms:8,hp:10}}],['Blood frenzy','Regain 4 AP on a kill, once per turn',{flag:'berserk'}],
  ['Wounded boar','+25% damage while below half health',{mod:{lowHpDmg:.25}}],['Whirlwind','Ability: 110% damage to every adjacent foe',{ab:'whirl'}]]],
 hakon:['The White Wolf',[['Winter-blooded','+10 hitpoints; recovers 3 more fatigue a turn',{st:{hp:10},mod:{fatRec:3}}],['Feeds on the slain','Heals 8 hitpoints on a kill',{mod:{killHeal:8}}],
  ['The pack falls','+20% damage against a foe below half health; a kill steadies him (+10 to the morale roll)',{mod:{vsHurt:.2,killMor:10}}],['Rage','Ability: +25% damage, −10 melee defense for 2 turns',{ab:'rage'}]]],
 ulfgar:['The Bone Throne',[['Grave-cold','+12 hitpoints, +15 resolve',{st:{hp:12,brv:15}}],['Rot and renewal','Regains 5 hitpoints at the start of each turn',{mod:{regenHP:5}}],
  ['Unburied','Survives the first killing blow at 1 hitpoint',{flag:'undying'}],['Herald’s voice','+20% spell damage',{mod:{spellB:.2}}]]],
 kagemaru:['The Silent Way',[['Shadow-step','+15 initiative, +6 melee defense',{st:{init:15,md:6}}],['Strike from the side','+10 to hit and +15% damage against a foe beside one of his allies',{mod:{flank:10,flankDmg:.15}}],
  ['Not there','A blow over 25% of his hitpoints is halved, once between his turns',{mod:{sidestep:.25}}],['Silent Cut','Ability: 130% damage, +25% armor piercing, +20% head chance',{ab:'fb_silent'}]]],
 tomoe:['The Crane Banner',[['Long reach','+10 to hit when striking over a tile with a reach weapon',{mod:{reachHit:10}}],['Crane stance','+8 melee defense',{st:{md:8}}],
  ['The first cut','+20% damage against a foe at full health',{mod:{vsFull:.2}}],['Crane Sweep','Ability: 100% damage to the target and 70% to every foe beside it, +5 to hit',{ab:'fb_crane'}]]],
 nobusada:['The Demon General',[['War-banner','Adjacent allies get +5 to hit (Battle orders)',{mod:{cmd:5}}],['Iron will','+15 hitpoints, +20 resolve',{st:{hp:15,brv:20}}],
  ['Two-handed fury','+15% damage with two-handed weapons',{mod:{twoDmg:.15}}],['Demon’s Due','Ability: 125% damage to every adjacent foe',{ab:'fb_demon'}]]],
 jin:['The Iron Lotus',[['Still water','+10 melee defense, +10 initiative',{st:{md:10,init:10}}],['Rolling reed','Never stunned by heavy blows; half the chance to be knocked back, pulled or stunned',{flag:'noStun',mod:{roll:.5}}],
  ['Lotus breath','Regains 4 hitpoints a turn; adjacent allies regain 3',{mod:{regenHP:4,medAura:3}}],['Ringing staff','Ability: 90% damage to every adjacent foe, all dazed (staff)',{ab:'staffquake'}]]],
 seraphine:['The Witch-Bane',[['Steel nerves','+8 ranged skill, +15 resolve',{st:{rs:8,brv:15}}],['Bane of the great','+15% damage against bosses, fabled warriors and huge foes',{mod:{vsBoss:.15}}],
  ['Close work','Can shoot with a foe beside her',{flag:'noLock'}],['Heartseeker','Ability: 150% damage, +10 to hit, +15% head chance (crossbow)',{ab:'xheart'}]]],
 mattias:['The Gunsmoke Saint',[['Saint’s aim','+10 ranged skill',{st:{rs:10}}],['Quick hands','−1 AP to reload',{wmod:{rld:-1}}],
  ['Through the eye','+10% head chance with weapon attacks; +10% armor piercing',{mod:{headB:10,ignB:.1}}],['Execution','Ability: 125% damage, +15% piercing, +50% more against a foe below half health (flintlock)',{ab:'fexecute'}]]],
 ysolde:['The Sundered Blade',[['Rift-quick','+10 initiative, +6 melee skill',{st:{init:10,ms:6}}],['Riftbane','+25% damage against bosses, fabled warriors and huge foes',{mod:{vsBoss:.25}}],
  ['Between worlds','A blow over 25% of her hitpoints is halved, once between her turns',{mod:{sidestep:.25}}],['Masterstroke','Ability: 150% damage, +15 to hit (sword)',{ab:'masterstroke'}]]],
 brannoc:['The Mountain',[['Bear-strong','+20 hitpoints',{st:{hp:20}}],['Rooted','Cannot be knocked back; 10% less damage from every blow',{flag:'kbImm',mod:{drB:.1}}],
  ['Stone-breaker','+20% damage against a foe whose armor still holds',{mod:{vsArm:.2}}],['Mountain Falls','Ability: 170% damage, +20% armor piercing, stuns, −5 to hit',{ab:'fb_quake'}]]],
 agathe:['The Lantern of Saint Vey',[['Healing hands','+30% healing done',{mod:{healB:.3}}],['The lantern lit','Allies within 3 tiles test morale at +10 resolve',{mod:{brvAura:10}}],
  ['Saint’s warmth','Adjacent allies regain 4 hitpoints a turn',{mod:{medAura:4}}],['Lantern Light','Ability: she and allies within 3 tiles heal 10–16 and steady',{ab:'fb_saint'}]]],
 yuki:['A Hundred Arrows',[['Snow-eyed','+10 ranged skill, +8 initiative',{st:{rs:10,init:8}}],['Arrow-rain','+15% damage with ranged weapons',{mod:{dmgRanged:.15}}],
  ['Far sight','+1 bow range, +5 ranged skill',{st:{rs:5},flag:'eagle'}],['Hundred Arrows','Ability: 100% damage to the target and 70% to each foe beside it, +5 to hit (bow)',{ab:'fb_hundred'}]]]};
for(const id in FABLED_TREES){const [n,P]=FABLED_TREES[id],k='fab.'+id,T={n,kind:'fabled',owner:id,aff:['melee','ranged'],d:'A personal tree: only this warrior can learn it',tiers:P.map((p,i)=>[perkDef(p[0],p[1],Object.assign({id:k+'.'+(i+1)},p[2]))])};
 T.p=T.tiers.map(t=>t[0]);MAST[k]=T}
/* ---- the sixteen ---- */
const FABLED={
 aldric:{n:'Aldric Vane',title:'the Last Oathsworn',bg:'knight',bgN:'Oathsworn knight',race:'human',lvl:9,st:{ms:8,md:6,brv:15},traits:['brave','steady'],gear:['fb:oathkeeper','fb:vowwall'],eq:{a:'coatplates',h:'bascinet'},
  where:['recruit','rival','crisis'],crisis:['horde','deadmarch'],earn:{k:'renown',tier:4},cost:4200,
  legend:'The last knight of an order that swore to hold the Vane bridge to the end. The bridge fell; he did not. He sells his sword now only to those whose name is worth guarding.',
  pt:{hair:'short',hairC:'W',beard:'short',marks:{scar:2},bg:['X','G','c'],skin:'fair'}},
 mirela:{n:'Mirela Ashgrove',title:'Widow of the Pale Wood',bg:'hunter',bgN:'Pale Wood ranger',race:'elf',fem:1,lvl:9,st:{rs:14,init:8},traits:[],gear:['fb:widowsong','fb:palecloak'],eq:{h:'hood'},
  where:['recruit','rival'],earn:{k:'quarry',q:'hunter.ent',n:3,d:'Fell three ents'},cost:3600,
  legend:'Her husband went into the Pale Wood after a wounded ent and came back as bark. She has been hunting the old trees ever since, and has never missed twice.',
  pt:{hair:'long',hairC:'W',bg:['4','2','m'],skin:'pale',marks:{paint:1,paintC:'l'}}},
 grimhild:{n:'Grimhild Ironbrow',title:'the Anvil-Queen',bg:'blacksmith',bgN:'Clan smith-queen',race:'dwarf',fem:1,lvl:10,st:{hp:10,ms:8,md:4},traits:['tough'],gear:['fb:anvilfall','fb:anvilround'],eq:{a:'scale',h:'barbute'},
  where:['recruit','rival'],earn:{k:'duel',tier:3},cost:4400,
  legend:'Exiled from her hold for forging a blade that cut her king’s crown in two. She will follow anyone who can stand three blows from it.',
  pt:{hair:'braids',hairC:'K',bg:['f','a','c'],skin:'fair',marks:{soot:1}}},
 korvak:{n:'Korvak',title:'Red Tusk the Skullsplitter',bg:'pitfighter',bgN:'Pit champion',race:'halforc',lvl:10,st:{hp:14,ms:10},traits:['bloodthirsty'],gear:['fb:redtusk','fb:tuskcrown'],eq:{a:'lamellar'},
  where:['recruit','rival','crisis','boss'],crisis:['horde'],f:['orc','horde'],earn:{k:'duel',tier:3},cost:3800,
  legend:'Undefeated in two hundred pit fights from the salt mines to the Warchief’s own ring. He fights for whoever beats him, which so far has been nobody.',
  pt:{hair:'mohawk',hairC:'J',bg:['f','1','g'],marks:{paint:2,paintC:'g',scar:3}}},
 hakon:{n:'Hakon Bloodaxe',title:'the Emperor’s Wolf',bg:'wildling',bgN:'Huscarl of the North',race:'human',lvl:13,st:{hp:16,ms:10,brv:10},traits:['brave'],gear:['fb:wolfaxe','fb:wolfpelt'],eq:{h:'spangen'},
  where:['crisis','boss','rival'],crisis:['barbarian'],f:['barbarian'],earn:null,cost:0,
  legend:'First of the Barbarian Emperor’s huscarls, who strangled a white wolf as a boy and wears it still. Where he walks south, towns burn.',
  pt:{hair:'shaggy',hairC:'J',beard:'full',bg:['n','o','r'],marks:{paint:1,paintC:'X'}},boss:{phases:[{at:.66,n:'The wolf howls',say:'Hakon throws back his head and howls: the pack answers.',summon:['wolf','wolf']},{at:.33,n:'Blood on the snow',say:'Hakon laughs through the blood and comes on.',enrage:{dmg:.25,ms:10,ap:1}}]}},
 ulfgar:{n:'Ulfgar the Unburied',title:'Herald of the Bone Throne',bg:'cultist',bgN:'Necromancer',race:'human',lvl:11,st:{hp:10,brv:20},traits:[],gift:'mana',gear:['fb:gravestaff','fb:shroud'],eq:{},
  where:['crisis','boss'],crisis:['deadmarch'],f:['undead','deadmarch'],earn:null,cost:0,
  legend:'Hanged three times for grave-robbery and buried twice. The third time he did not wait to be dug up. He speaks for the Bone Throne now.',
  pt:{hair:'bald',beard:'long',beardC:'W',skin:'pale',bg:['D','0','C'],marks:{scar:1}},boss:{phases:[{at:.6,n:'The dead rise',say:'Ulfgar calls, and the earth gives up its dead.',summon:['skel','skel']},{at:.3,n:'Unburied',say:'The Herald will not stay down.',heal:.2,enrage:{dmg:.15}}]}},
 kagemaru:{n:'Kagemaru',title:'the Silent Blade',bg:'thief',bgN:'Shinobi',race:'human',east:1,lvl:9,st:{init:16,ms:8,md:6},traits:['quick'],gear:['fb:nightblade','fb:shadetanto'],eq:{a:'jack'},
  where:['recruit','rival','east'],earn:{k:'deed',stat:'kills',n:150,d:'Slay 150 foes'},cost:3600,
  legend:'Nobody has seen his face and lived to describe it. The Shogunate swears he serves it; three houses swear he serves them. He serves the best-paid name in the land.',
  pt:{hat:'mask',hatC:'night',hair:'tail',hairC:'G',bg:['0','1','4'],skin:'tan',veil:'night'}},
 tomoe:{n:'Tomoe of Kiso',title:'the Crane Banner',bg:'veteran',bgN:'Onna-musha',race:'human',east:1,fem:1,lvl:10,st:{ms:10,md:6,brv:10},traits:['steady'],gear:['fb:cranepole','fb:cranedo'],eq:{h:'kabuto|sallet'},
  where:['recruit','east'],earn:{k:'duel',tier:3},cost:4000,
  legend:'She carried the Crane banner out of a lost battle on the end of her naginata and cut a road home through the enemy. She will not serve a captain she cannot respect.',
  pt:{hair:'long',hairC:'G',bg:['f','0','r'],skin:'fair'}},
 nobusada:{n:'Oda Nobusada',title:'the Demon General',bg:'noble',bgN:'Eastern general',race:'human',east:1,lvl:12,st:{hp:16,ms:12,md:8,brv:20},traits:['brave'],gear:['fb:demonblade','fb:demonarmor','fb:demonmask'],eq:{},
  where:['east','boss'],f:['east'],earn:null,cost:0,
  legend:'The general who burned the temple of a thousand steps with its monks inside. He wears an oni’s face so his soldiers fear him more than the foe.',
  pt:{hair:'tail',hairC:'G',beard:'stache',bg:['f','a','g'],skin:'tan',marks:{scar:2}},boss:{phases:[{at:.66,n:'The banners rise',say:'Nobusada lifts his fan: his guard closes in.',summon:['@east']},{at:.33,n:'The demon wakes',say:'The Demon General tears off his helm and laughs.',enrage:{dmg:.25,ms:10,ap:1}}]}},
 jin:{n:'Master Jin',title:'the Iron Lotus',bg:'monk',bgN:'Temple master',race:'human',east:1,lvl:10,st:{md:8,init:10,brv:20},traits:[],gift:'chi_m',gear:['fb:lotusstaff','fb:lotusrobe'],eq:{},
  where:['recruit','east'],earn:{k:'deed',stat:'wins',n:30,d:'Win thirty battles'},cost:3400,
  legend:'The last master of the temple Nobusada burned. He walked out of the fire carrying his students and has been walking ever since, looking for a company worth teaching.',
  pt:{hair:'bald',beard:'long',beardC:'W',bg:['A','B','e'],skin:'tan'}},
 seraphine:{n:'Seraphine Dulac',title:'the Witch-Bane',bg:'witchhunter',bgN:'Witch-hunter',race:'human',fem:1,lvl:9,st:{rs:12,brv:15},traits:[],gear:['fb:witchbane','fb:silverpoint'],eq:{a:'brigandine',h:'sallet'},
  where:['recruit','rival','crisis'],crisis:['deadmarch','sunder'],earn:{k:'renown',tier:3},cost:3400,
  legend:'She has burned nine witches, two liches and a bishop. Only the bishop was a mistake, she says, and she still will not say which way.',
  pt:{hat:'wide',hatC:'black',hair:'long',hairC:'K',bg:['0','f','g'],skin:'pale'}},
 mattias:{n:'Black Mattias',title:'the Gunsmoke Saint',bg:'deserter',bgN:'Gunner',race:'human',lvl:10,st:{rs:14,init:6},traits:['eagle'],gear:['fb:saintsrifle','fb:sinpistol'],eq:{a:'leather'},
  where:['recruit','rival'],earn:{k:'renown',tier:4},cost:3800,
  legend:'A priest who took up the long gun when his parish was put to the torch. He gives last rites before every shot and has never needed to give them twice.',
  pt:{hat:'wide',hatC:'black',hair:'swept',hairC:'G',beard:'goatee',bg:['o','0','E'],marks:{soot:1}}},
 ysolde:{n:'Ysolde Riftborn',title:'the Sundered Blade',bg:'spellblade',bgN:'Rift-walker',race:'elf',fem:1,lvl:11,st:{ms:10,init:10,md:6},traits:[],gift:'qi',gear:['fb:sunderedge','fb:riftmail'],eq:{h:'coif'},
  where:['recruit','crisis','boss'],crisis:['sunder'],earn:{k:'deed',stat:'rifts',n:2,d:'Seal two rifts'},cost:4600,
  legend:'She walked out of the first rift with a blade from another world and no memory of the one she left. She hunts what comes through, and what sent it.',
  pt:{hair:'mane',hairC:'V',bg:['D','G','C'],skin:'pale',marks:{paint:1,paintC:'C'}}},
 brannoc:{n:'Brannoc',title:'the Mountain-Breaker',bg:'woodcutter',bgN:'Mountain hermit',race:'halforc',lvl:10,st:{hp:20,ms:8},traits:['hulking'],gear:['fb:mountainmaul','fb:bearhide'],eq:{h:'kettle'},
  where:['recruit','rival','crisis'],crisis:['horde','barbarian'],earn:{k:'quarry',q:'hunter.ogre',n:2,d:'Slay two ogres'},cost:3600,
  legend:'He brought down a rockslide on an ogre clan with one swing at the right stone. Ogres still run from his name; men are wiser to do the same.',
  pt:{hair:'shaggy',hairC:'H',beard:'short',beardC:'H',bg:['j','i','k'],marks:{scar:1}}},
 agathe:{n:'Sister Agathe',title:'the Lantern of Saint Vey',bg:'acolyte',bgN:'Lantern sister',race:'human',fem:1,lvl:8,st:{hp:10,md:6,brv:25},traits:['loyal'],gift:'chi',gear:['fb:lanternmace','fb:saintstower'],eq:{a:'mail',h:'coif'},
  where:['recruit','rival','crisis'],crisis:['deadmarch'],earn:{k:'renown',tier:3},cost:2800,
  legend:'She carried the Saint’s lantern through the plague year and it never went out. Wounded men swear it heals; dying ones swear it is the last kind thing they saw.',
  pt:{hat:'band',hatC:'white',hair:'bun',hairC:'H',bg:['y','Y','e'],skin:'fair',beads:['c','b','d','e']}},
 yuki:{n:'Hayase Yuki',title:'the Hundred Arrows',bg:'hunter',bgN:'Yumi archer',race:'human',east:1,fem:1,lvl:10,st:{rs:14,init:10},traits:[],gear:['fb:hundredbow','fb:snowdo'],eq:{},
  where:['recruit','rival','east'],earn:{k:'stand',f:'east',tier:3,alt:{k:'renown',tier:4},d:'Be honoured by the Shogunate (or Renowned)'},cost:3600,
  legend:'At the siege of Snow Gate she loosed a hundred arrows in a single night and every one found a throat. They sing it in the East; she does not.',
  pt:{hat:'band',hatC:'red',hair:'tail',hairC:'G',bg:['F','X','r'],skin:'fair'}}};
for(const id in FABLED){const F=FABLED[id];F.id=id;F.tree='fab.'+id;F.gear=F.gear.filter(g=>ITEMS[g]);for(const g of F.gear)ITEMS[g].from=F.n+', '+F.title}
// The fabled boss/east hosts' eastern guard (phase summons of '@east'): the east agent's eastern soldier ids when they exist, else steel of our own.
function fabledEastGuard(){const L=['samurai','ashigaru','eastsam','esamurai','eashigaru'].filter(k=>typeof EN==='object'&&EN[k]);return L.length?L[0]:(EN.knight?'knight':EN.bandit?'bandit':Object.keys(EN)[0])}
/* ---- state ---- */
function fabledG(){if(!G)return{};if(!G.fabled||typeof G.fabled!=='object'||Array.isArray(G.fabled))G.fabled={};return G.fabled}
function fabledRec(id){const S=fabledG();if(!FABLED[id])return null;if(!S[id]||typeof S[id]!=='object')S[id]={state:'unmet'};return S[id]}
function fabledState(id){const S=G&&G.fabled&&G.fabled[id];return S&&typeof S.state==='string'?S.state:'unmet'}
function fabledSet(id,st,o){const R=fabledRec(id);if(!R)return null;R.state=st;if(G&&typeof G.day==='number')R.day=G.day;if(o)Object.assign(R,o);return R}
const fabledAlive=id=>fabledState(id)!=='dead';
const fabledFree=id=>{const s=fabledState(id);return s==='unmet'||s==='met'};
function fabledRepair(g){g=g||G;if(!g)return;const S=g.fabled&&typeof g.fabled==='object'&&!Array.isArray(g.fabled)?g.fabled:{};const out={};
 for(const id in S){if(!FABLED[id])continue;const R=S[id]&&typeof S[id]==='object'?S[id]:{};let st=typeof R.state==='string'?R.state:'unmet';
  if(!['unmet','met','joined','dead'].includes(st)&&!/^rival:/.test(st))st='unmet';const o={state:st};
  if(typeof R.day==='number'&&isFinite(R.day))o.day=Math.floor(R.day);if(typeof R.how==='string')o.how=R.how.slice(0,80);if(R.duel)o.duel=1;if(Number.isInteger(R.town))o.town=R.town;out[id]=o}
 g.fabled=out;
 // mercs that name an unknown fabled lose the name (their perks of a personal tree are refunded by refundTrees)
 const fix=m=>{if(m&&m.fabled!=null&&!FABLED[m.fabled]){delete m.fabled;if(typeof refundTrees==='function')refundTrees(m)}};
 (g.roster||[]).forEach(fix);(g.rivals||[]).forEach(r=>(r&&r.roster||[]).forEach(fix));
 fabledSync(g);return out}
// keeps G.fabled in step with where the fabled actually are: joined ones in the roster, rival ones in a living rival's roster
function fabledSync(g){g=g||G;if(!g||!g.fabled)return;const inRoster=new Set((g.roster||[]).filter(m=>m&&m.fabled).map(m=>m.fabled)),inRival={};
 for(const r of g.rivals||[])if(r&&r.alive!==false)for(const m of r.roster||[])if(m&&m.fabled&&!m.dead)inRival[m.fabled]=r.id;
 for(const id in FABLED){const st=(g.fabled[id]&&g.fabled[id].state)||'unmet';if(st==='dead')continue;
  if(inRoster.has(id)){if(st!=='joined')(g.fabled[id]||(g.fabled[id]={})).state='joined'}
  else if(inRival[id]!=null){const s='rival:'+inRival[id];if(st!==s)(g.fabled[id]||(g.fabled[id]={})).state=s}
  else if(st==='joined'||/^rival:/.test(st))(g.fabled[id]||(g.fabled[id]={})).state='met'}}
/* ---- the merc ----
   Stats: a fixed base that grows with the level (no rolls), the race, the record's st. Perks: every point spent by autoLearn,
   the personal tree first. Gear: the named pieces (weapon, sidearm, shield, armor, helmet by kind) and eq for the rest. */
function fabledStats(F,L){const g=L-1,b={hp:66+Math.round(3*g),fat:106+2*g,init:110+Math.round(1.5*g),ms:62+Math.round(2.1*g),rs:46+Math.round(2.1*g),md:7+Math.round(1.1*g),rd:6+Math.round(.9*g),brv:52+Math.round(1.5*g)};
 const Bg=BG[F.bg];if(Bg&&Bg.st)for(const k in Bg.st)b[k]=(b[k]||0)+Bg.st[k];   // the background's edge, as a recruit of it has
 const R=RACE[F.race]||RACE.human;for(const k in R.st)b[k]=(b[k]||0)+R.st[k];for(const k in F.st||{})b[k]=(b[k]||0)+F.st[k];return b}
function fabledMerc(id,o){const F=FABLED[id];if(!F)return null;o=o||{};const L=clamp(Math.floor(o.lvl||F.lvl),1,typeof MAXLV==='number'?MAXLV:15);
 const eq={w:null,b:null,s:null,a:null,h:null};
 for(const gid of F.gear){const it=ITEMS[gid];if(!it||(!o.keepGear&&fabledOwned(gid)))continue;/* named gear is unique: what the company holds is not worn again */if(it.k==='w'){if(!eq.w)eq.w=gid;else if(!eq.b)eq.b=gid}else if(['s','a','h'].includes(it.k)&&!eq[it.k])eq[it.k]=gid}
 for(const k in F.eq||{}){const pick0=fabledBase(F.eq[k]);if(pick0&&!eq[k]&&ITEMS[pick0].k===k)eq[k]=pick0}
 const hunt=!!(BG[F.bg]&&BG[F.bg].hw>=.5&&MAST.hunter),   // a fabled hunter, poacher, witch hunter or wildling carries the Monster hunter tree as one of the four
  pool=(BG[F.bg]&&BG[F.bg].pool||MUNDANE).filter(k=>MAST[k]&&MAST[k].kind==='style').slice(0,hunt?3:4).concat(hunt?['hunter']:[]),trees=F.gift&&MAST[F.gift]?pool.concat([F.gift]):pool;
 const m={id:o.join&&G?G.nid++:-(1000+Object.keys(FABLED).indexOf(id)),name:F.n,title:F.title,bg:F.bg,race:RACE[F.race]?F.race:'human',lvl:1,xp:0,pp:1,pend:0,base:fabledStats(F,L),tal:{},trees,gift:F.gift&&MAST[F.gift]?F.gift:null,
  perks:[],eq,hp:1,field:false,inj:[],traits:(F.traits||[]).filter(k=>typeof TRAITS==='object'&&TRAITS[k]),slain:{},fabled:id};
 if(!traitsValid(m.traits))m.traits=[];
 gainXP(m,XPT[L]);m.pend=0;fixHands(m);autoLearn(m);syncMast(m);m.hp=calc(m).hp;return m}
/* ---- where they appear ---- */
function fabledHash(s){let h=2166136261;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
/* fabledFor(ctx): one fabled warrior who can lead or join this host now: alive, not with the company, not already in a rival's ranks
   (except for ctx.k 'rival'), whose where lists ctx.k; a crisis host prefers those whose F.crisis names ctx.crisis, a faction host those
   whose F.f names ctx.f; an eastern host (k 'east') only eastern ones. ctx.exclude: ids to skip (already in this battle). Deterministic
   from G.seed, the day and ctx.salt; draws no randomness. Returns an id or null (callers must cope with null: all may be dead). */
function fabledFor(ctx){ctx=ctx||{};const k=ctx.k||'boss',ex=Array.isArray(ctx.exclude)?ctx.exclude:[];
 let L=Object.keys(FABLED).filter(id=>{const F=FABLED[id];if(!F.where.includes(k)||ex.includes(id))return false;const s=fabledState(id);if(s==='dead'||s==='joined')return false;if(/^rival:/.test(s)&&k!=='rival')return false;if(k==='rival'&&s!=='unmet'&&s!=='met')return false;
  if(k==='east'&&!F.east)return false;if(k==='recruit'&&isSoloF())return false;return true});
 if(!L.length)return null;
 const pref=L.filter(id=>{const F=FABLED[id];return(ctx.crisis&&(F.crisis||[]).includes(ctx.crisis))||(ctx.f&&(F.f||[]).includes(ctx.f))});if(pref.length)L=pref;
 const salt=(G&&G.seed|0)+'|'+(G?G.day|0:0)+'|'+k+'|'+(ctx.salt||'');return L.slice().sort((a,b)=>fabledHash(salt+a)-fabledHash(salt+b)||(a<b?-1:1))[0]}
const isSoloF=()=>typeof isSolo==='function'&&isSolo();
// a fabled merc as a battle unit of the enemy side (the rival-merc path: mkMercUnit), carrying u.fabled
function fabledUnit(id,o){const m=fabledMerc(id,o);if(!m)return null;const u=mkMercUnit(m,1);u.fabled=id;u.name=m.name;u.title=FABLED[id].title;u.f=(o&&o.f)||u.f;u.fearless=true;return u}
/* fabledSpawn(units, o): the enemy units of startBattle get the fabled of o.fabled (ids or {id, lvl}), at most FABLED_MAX, the dead and the
   joined skipped. A fabled merc unit takes the place of the weakest EN foe when the board would hold more than MAXFOES. Returns the fabled units. */
function fabledList(o){const L=o&&Array.isArray(o.fabled)?o.fabled:o&&typeof o.fabled==='string'?[o.fabled]:[],out=[];
 for(const x of L){const id=typeof x==='string'?x:x&&x.id;if(!FABLED[id]||out.some(y=>y.id===id))continue;const s=fabledState(id);if(s==='dead'||s==='joined')continue;out.push({id,lvl:x&&x.lvl||null});if(out.length>=FABLED_MAX)break}
 return out}
function fabledSpawn(units,o){const L=fabledList(o),out=[];for(const x of L){const u=fabledUnit(x.id,{lvl:x.lvl,f:o.f});if(!u)continue;out.push(u)}
 while(units.length+out.length>MAXFOES&&units.length){let wi=0;for(let i=1;i<units.length;i++)if((units[i].def&&units[i].def.xp||0)<(units[wi].def&&units[wi].def.xp||0))wi=i;units.splice(wi,1)}
 for(const u of out){units.unshift(u);if(G&&fabledState(u.fabled)==='unmet')fabledSet(u.fabled,'met')}   // once fought, they are known
 return out}
// what the deployment screen may show of the fabled in o: [{id,n,title,lvl,bgN}]
function fabledPreview(o){return fabledList(o).map(x=>{const F=FABLED[x.id];return{id:x.id,n:F.n,title:F.title,lvl:x.lvl||F.lvl,bgN:F.bgN||(BG[F.bg]?BG[F.bg].n:F.bg)}})}
/* ---- earning them ---- */
function fabledStat(stat){const st=G&&G.amb&&G.amb.st||{};const v=st[stat];return typeof v==='number'&&isFinite(v)?v:0}
function fabledQuarry(q){let n=0;for(const m of (G&&G.roster||[]))n+=slainOf(m,q);return n}
function fabledEarnOf(id,E){const F=FABLED[id];if(!E)return{ok:false,p:0,goal:1,text:'Never joins a company'};
 if(E.k==='renown'){const t=typeof renownTier==='function'?renownTier():1,n=typeof RENOWN!=='undefined'&&RENOWN[E.tier-1]?RENOWN[E.tier-1].n:'tier '+E.tier;return{ok:t>=E.tier,p:Math.min(t,E.tier),goal:E.tier,text:`Joins a company that is ${n}`}}
 if(E.k==='deed'){const v=fabledStat(E.stat);return{ok:v>=E.n,p:Math.min(v,E.n),goal:E.n,text:`${E.d||E.stat} (${Math.min(v,E.n)}/${E.n})`}}
 if(E.k==='quarry'){const v=fabledQuarry(E.q);return{ok:v>=E.n,p:Math.min(v,E.n),goal:E.n,text:`${E.d||E.q} (${Math.min(v,E.n)}/${E.n}, the company’s tally)`}}
 if(E.k==='duel'){const won=!!(G&&G.fabled&&G.fabled[id]&&G.fabled[id].duel),t=typeof renownTier==='function'?renownTier():1,n=typeof RENOWN!=='undefined'&&RENOWN[(E.tier||1)-1]?RENOWN[(E.tier||1)-1].n:'';
  return{ok:won,p:won?1:0,goal:1,duel:!won&&t>=(E.tier||1),text:won?'Beaten in a duel: will join':`Joins whoever beats them in a duel${E.tier>1?` (accepts a challenge from a company that is ${n})`:''}`}}
 if(E.k==='stand'){const ix=typeof repTierIx==='function'&&typeof FACT==='object'&&FACT[E.f]?repTierIx(E.f):-1,ok=ix>=E.tier;if(!ok&&E.alt){const a=fabledEarnOf(id,E.alt);if(a.ok)return{ok:true,p:1,goal:1,text:E.d||a.text}}
  return{ok,p:ok?1:0,goal:1,text:E.d||`Honoured by ${FACT[E.f]?FACT[E.f].n:E.f}`}}
 return{ok:false,p:0,goal:1,text:''}}
function fabledEarn(id){const F=FABLED[id];if(!F)return{ok:false,p:0,goal:1,text:''};return fabledEarnOf(id,F.where.includes('recruit')?F.earn:null)}
function fabledWage(id){const F=FABLED[id];return F?Math.round((BG[F.bg]?BG[F.bg].wage:20)*2.5+20):0}
function fabledCost(id){const F=FABLED[id];return F?Math.round((F.cost||3000)*(typeof followerHas==='function'&&followerHas('recruiter')?.85:1)/10)*10:0}
// {ok, why}: can the company take this fabled warrior on now (the earn condition, the purse, room, solo runs: never)
/* FABLED_HIRE (owner's rule): fabled warriors are never for hire. They are met only as foes, rival champions and bosses; no tavern
   page, no recruit or duel offer. fabledCan is always false, fabledOffers empty, fabledDuelCan closed. A fabled who joined in an older save stays. */
const FABLED_HIRE=false;
function fabledCan(id){const F=FABLED[id];if(!F)return{ok:false,why:'Nobody of that name'};if(!FABLED_HIRE)return{ok:false,why:'Serves no company but their own'};
 if(!(typeof canRecruit!=='function'||canRecruit()))return{ok:false,why:typeof recruitWhy==='function'?recruitWhy():'You ride alone: nobody joins',solo:true};
 if(!F.where.includes('recruit'))return{ok:false,why:'Serves no company but their own'};const s=fabledState(id);
 if(s==='dead')return{ok:false,why:'Dead'};if(s==='joined')return{ok:false,why:'Already with the company'};if(/^rival:/.test(s))return{ok:false,why:'Rides with a rival company'};
 const e=fabledEarn(id);if(!e.ok)return{ok:false,why:e.text,earn:true};if(G.roster.length>=MAXROSTER)return{ok:false,why:'The roster is full',full:true};
 const c=fabledCost(id);if(!(G.crowns>=c))return{ok:false,why:`Needs ${c} crowns`,poor:true};return{ok:true,why:''}}
function fabledJoin(id){const c=fabledCan(id);if(!c.ok)return null;const m=fabledMerc(id,{join:1});G.crowns-=fabledCost(id);m.field=G.roster.filter(x=>x.field).length<MAXFIELD;G.roster.push(m);fabledSet(id,'joined');return m}
// the town where a recruitable fabled waits (eastern ones in an eastern town when there is one): deterministic from the seed
function fabledTown(id){if(!G||!Array.isArray(G.towns)||!G.towns.length||!FABLED[id])return-1;const R=G.fabled&&G.fabled[id];if(R&&Number.isInteger(R.town)&&R.town>=0&&R.town<G.towns.length)return R.town;
 let L=G.towns.map((t,i)=>i);const F=FABLED[id],east=L.filter(i=>typeof townEast==='function'?!!townEast(i):!!G.towns[i].east);
 if(F.east&&east.length)L=east;else if(!F.east&&east.length<L.length)L=L.filter(i=>!east.includes(i));const big=L.filter(i=>(G.towns[i].size||1)>=2);if(big.length)L=big;
 return L[fabledHash((G.seed|0)+':'+id)%L.length]}
// the fabled who wait in town ti for the company: [{id, F, state, earn, can, cost, wage}] (in solo runs: none)
function fabledOffers(ti){if(!FABLED_HIRE||!G||isSoloF())return[];const out=[];for(const id in FABLED){const F=FABLED[id];if(!F.where.includes('recruit')||!fabledFree(id)||fabledTown(id)!==ti)continue;
 out.push({id,F,state:fabledState(id),earn:fabledEarn(id),can:fabledCan(id),cost:fabledCost(id),wage:fabledWage(id)})}return out}
/* ---- duels ----  fabledDuel(id, mercId): your champion alone against the fabled warrior, fought to yielding (nobody dies: B.opts.yield).
   Winning sets G.fabled[id].duel; the earn condition 'duel' is then met. Returns the battle or null. */
function fabledDuelCan(id){const F=FABLED[id];if(!FABLED_HIRE)return{ok:false,why:'Fights no duels'};if(!F||!F.earn||F.earn.k!=='duel')return{ok:false,why:'Fights no duels'};if(!fabledFree(id))return{ok:false,why:'Not here'};
 const e=fabledEarn(id);if(e.ok)return{ok:false,why:'Already beaten'};if(!e.duel)return{ok:false,why:e.text};return{ok:true,why:''}}
function fabledDuel(id,mid){if(!fabledDuelCan(id).ok)return null;const m=(G.roster.find(x=>x.id===mid)||G.roster.filter(x=>!(x.hp<=0)).sort((a,b)=>b.lvl-a.lvl)[0]);if(!m)return null;
 const o={f:'bandit',fabled:[id],fabledOnly:1,duel:id,yield:1,deploy:[{id:m.id}],src:{type:'fabled',id},biome:null};
 if(typeof engage==='function'&&!o.auto)return engage(o);return startBattle(o)}
/* ---- after a battle ---- */
function fabledResolve(b,res,win){const out=[];res.fabled=out;if(!b||!G)return out;
 for(const u of b.units){const id=u.m&&u.m.fabled;if(!id||!FABLED[id])continue;const F=FABLED[id],dead=!u.alive&&!u.down&&!u.gone,r={id,n:F.n,title:F.title,side:u.side,fate:dead?'dead':u.alive?'ok':u.down?'down':'fled',drops:[]};
  if(u.side===0){if(dead){fabledSet(id,'dead',{how:'Fell fighting for '+(G.name||'the company')})}}
  else if(b.opts.yield){if(win&&b.opts.duel===id){fabledSet(id,'met',{duel:1});r.fate='yielded'}}
  else if(dead){fabledSet(id,'dead',{how:'Slain by '+(G.name||'the company')+(G.day?' on day '+G.day:'')});
   if(win){const gear=['w','b','s','a','h'].map(k=>u.m.eq[k]).filter(g=>ITEMS[g]&&ITEMS[g].fabled===id&&!fabledOwned(g));let got=0;
    gear.forEach((g,i)=>{if(rnd()<FABLED_DROP||(u.boss&&i===0)||(i===gear.length-1&&!got)){r.drops.push(g);got++}});   // at least one piece always
    for(const g of r.drops){res.loot.push(g);G.stash.push(g)}}}
  out.push(r)}
 return out}
// true when the company already holds item g (named gear is unique)
function fabledOwned(g){if(!G)return false;if((G.stash||[]).includes(g))return true;return(G.roster||[]).some(m=>m&&m.eq&&Object.values(m.eq).includes(g))}
/* ---- the world ---- fabledDay(): call once a day (worldDay). Rival champions: from day 20 each living rival may take a free fabled warrior
   whose where lists 'rival' into its ranks, at most one per rival, on a day fixed by the seed; the states follow the rosters. No randomness. */
function fabledDay(){if(!G)return;fabledG();fabledSync(G);const day=G.day|0;if(day<20)return;
 for(const r of G.rivals||[]){if(!r||r.alive===false||!Array.isArray(r.roster)||r.roster.some(m=>m&&m.fabled))continue;if(day<20+fabledHash((G.seed|0)+':rv:'+r.id)%16)continue;
  const id=fabledFor({k:'rival',salt:r.id});if(!id)break;const lv=Math.max(FABLED[id].lvl,Math.max(1,...r.roster.map(m=>m.lvl||1))+1),m=fabledMerc(id,{lvl:lv,join:1});m.field=true;
  r.roster.unshift(m);fabledSet(id,'rival:'+r.id);if(typeof addNews==='function'){try{addNews(`${m.name}, ${FABLED[id].title}, rides with ${r.n||'a rival company'}.`)}catch(e){}}}}
/* ---- bosses ----
   o.boss = {id (EN id) | fabled (a fabled id among o.fabled), name?, title?, phases:[{at (hp share: the phase starts when hp falls to it or below), n, say?,
     summon?:[EN ids | '@east'], enrage?:{dmg, ms, md, ap}, heal? (share of max hp), fx?}], enrageRound?: round on which the boss enrages anyway}
   A fabled boss without phases uses FABLED[id].boss.phases. B.boss = {u, name, title, phases, ph (phases begun), enr (enraged), log:[names]}.
   bossHit(u) is called by hurt() after every blow on the boss; bossRound(b) at the start of each round. bossStatus() is what the HUD reads. */
function bossSetup(b,o){b.boss=null;const ob=o&&o.boss;if(!ob)return null;const E=b.units.filter(u=>u.side===1);let u=null;
 if(ob.fabled)u=E.find(x=>x.fabled===ob.fabled)||null;if(!u&&b.bossU)u=b.bossU;if(!u&&ob.id)u=E.find(x=>x.eid===ob.id)||null;if(!u)return null;
 const F=u.fabled?FABLED[u.fabled]:null,ph=Array.isArray(ob.phases)?ob.phases:F&&F.boss?F.boss.phases:[];
 u.boss=1;u.fearless=true;if(ob.name&&!u.fabled)u.name=ob.name;b.bossU=u;
 b.boss={u,name:u.name,title:ob.title||u.title||(F?F.title:''),phases:ph.filter(p=>p&&typeof p.at==='number').map(p=>Object.assign({},p)).sort((x,y)=>y.at-x.at),ph:0,enr:false,enrRound:ob.enrageRound|0,log:[]};
 return b.boss}
function bossApply(b,p){const u=b.boss.u;b.boss.log.push(p.n||'');if(p.say)say(p.say);float(u,p.n||'Phase','#ffd27a');FX.emit('status',{t:u,key:'enrage',n:0});
 if(p.enrage){const e=p.enrage;if(e.dmg)u.dmgB=(u.dmgB||0)+e.dmg;if(e.ms)u.ms+=e.ms;if(e.md)u.md+=e.md;if(e.ap){u.apMax+=e.ap}b.boss.enr=true}
 if(p.heal>0&&u.alive){const h=Math.round(u.hpMax*p.heal);healUnit(u,h)}
 if(Array.isArray(p.summon))for(const s of p.summon){const id=s==='@east'?fabledEastGuard():s;if(!EN[id])continue;const e=mkEnemy(id,u.f||b.opts.f);if(typeof enemyInit==='function')enemyInit(e,id);e.c=u.c;e.r=u.r;spawnUnit(initUnit(e))}}
function bossHit(u){const b=B;if(!b||!b.boss||b.boss.u!==u||!u.alive)return;const P=b.boss.phases;while(b.boss.ph<P.length&&u.hp<=u.hpMax*P[b.boss.ph].at){const p=P[b.boss.ph++];bossApply(b,p)}}
function bossRound(b){if(!b||!b.boss||!b.boss.u.alive||b.boss.enr||!(b.boss.enrRound>0)||b.round<b.boss.enrRound)return;b.boss.enr=true;bossApply(b,{n:'Enraged',say:`${b.boss.name} is enraged.`,enrage:{dmg:.25,ms:10}})}
// {name, title, hp, hpMax, pct, phase (phases begun), phases, next (the hp share of the next phase or null), nextN, enraged, alive, text}
function bossStatus(){const b=B;if(!b||!b.boss)return null;const S=b.boss,u=S.u,P=S.phases,nx=P[S.ph]||null;
 return{name:S.name,title:S.title,hp:Math.max(0,u.hp),hpMax:u.hpMax,pct:Math.round(100*Math.max(0,u.hp)/u.hpMax),phase:S.ph,phases:P.length,next:nx?nx.at:null,nextN:nx?nx.n||'':'',enraged:!!S.enr,alive:!!u.alive,
  last:S.log.length?S.log[S.log.length-1]:'',text:!u.alive?`${S.name} has fallen`:nx?`At ${Math.round(nx.at*100)}%: ${nx.n||'a new phase'}`:S.enr?'Enraged':S.enrRound>0?`Enrages on round ${S.enrRound}`:''}}
/* ---- the sheet ---- */
function fabledKnown(id){const s=fabledState(id);return s!=='unmet'||fabledEarn(id).ok||(typeof renownTier==='function'&&renownTier()>=2)}
function fabledCard(id){const F=FABLED[id],s=fabledState(id),e=fabledEarn(id),ti=fabledTown(id),here=G&&G.town===ti&&ti>=0,m=fabledMerc(id),c=calc(m);
 const st=s==='dead'?'<em class="bad">Dead</em>':s==='joined'?'<em class="good">With the company</em>':/^rival:/.test(s)?'<em class="warn">With a rival company</em>':'';
 const gear=F.gear.map(g=>`<b class="fmd-n">${ITEMS[g].n}</b>`).join(', '),tree=MAST[F.tree];
 let act='';if(FABLED_HIRE&&F.where.includes('recruit')&&fabledFree(id)){const can=fabledCan(id),dc=fabledDuelCan(id);
  act=`<p class="dim">${e.ok?'<span class="good">Earned</span>':'To earn: '+e.text}${ti>=0?` · waits in <b>${G.towns[ti].name}</b>`:''}</p>`;
  if(here&&can.ok)act+=`<button class="pri" onclick="fabledHire('${id}')">Recruit (${fabledCost(id)} crowns, ${fabledWage(id)} a day)</button>`;
  else if(here&&dc.ok)act+=`<button class="pri" onclick="fabledDuelUI('${id}')">Challenge to a duel</button>`;
  else if(here&&can.why)act+=`<p class="bad">${can.why}</p>`}
 return`<div class="fb-card" style="display:flex;gap:8px;align-items:flex-start;margin:6px 0">${typeof portraitHTML==='function'?portraitHTML(m,48):''}<div style="flex:1">
  <p><b>${F.n}</b>, ${F.title} ${st}</p><p class="dim">Level ${m.lvl} ${RACE[m.race].n.toLowerCase()} ${(F.bgN||BG[F.bg].n).toLowerCase()} · ${c.hp} hp · melee ${c.ms} · ranged ${c.rs} · defense ${c.md}/${c.rd}</p>
  <p><i>${F.legend}</i></p><p class="dim">Named gear: ${gear}. Tree: <b>${tree.n}</b> (${tree.tiers.map(t=>t[0].n).join(', ')}).</p>${act}</div></div>`}
function openFabled(){if(typeof sheet!=='function'||!G)return;const ids=Object.keys(FABLED).filter(fabledKnown);
 sheet(`<h2>Fabled warriors</h2><p class="dim">${'Rare named fighters who serve no company but their own: you meet them across the field, at the head of rival companies, crises and the eastern host. Each carries named gear, and death is for good.'}</p>${ids.length?ids.map(fabledCard).join(''):'<p>Nobody sings of them to an unknown company yet.</p>'}<button onclick="closeSheet()">Close</button>`)}
function fabledHire(id){const m=fabledJoin(id);if(!m){const c=fabledCan(id);if(typeof toast==='function')toast(c.why||'They will not join');return}if(typeof toast==='function')toast(`${m.name}, ${FABLED[id].title}, joins the company.`);if(typeof save==='function')save();openFabled()}
function fabledDuelUI(id){if(typeof closeSheet==='function')closeSheet(true);if(!fabledDuel(id)&&typeof toast==='function')toast(fabledDuelCan(id).why||'No duel')}
