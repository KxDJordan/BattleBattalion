/* ================= DATA ================= */
const RESC={mana:'#62a6ee',aura:'#ecc64f',qi:'#3fd0b6',chi:'#9bd96f'},RESN={mana:'Mana',aura:'Aura',qi:'Qi',chi:'Chi'},RESK=['mana','aura','qi','chi'];
const STATN={hp:'Hitpoints',fat:'Fatigue',init:'Initiative',ms:'Melee skill',rs:'Ranged skill',md:'Melee defense',rd:'Ranged defense',brv:'Resolve'};
const ROLL={hp:[2,4],fat:[2,4],init:[3,5],ms:[1,3],rs:[2,4],md:[1,3],rd:[2,4],brv:[2,4]};
const XPT=[0,0,200,500,1000,1700,2600,3700,5000,6500,8200,10100,12200,14500,17000,20000];
const MAXLV=15,MAXROSTER=16,MAXFIELD=12;
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
const WSK={sword:['slash','riposte'],axe:['split'],mace:['stunblow'],dagger:['puncture'],spear:['thrust','spearwall'],bow:['quick'],staff:['sweep']},
 WSKID={greataxe:['split','round'],pike:['impale']},SHIELDHP={buckler:32,kite:64,heater:80};
for(const id in ITEMS){const i=ITEMS[id];if(i.k==='w')i.sk=WSKID[id]||WSK[i.wt]||[];else if(i.k==='s'){i.sk=['shieldwall','bash'];i.hp=SHIELDHP[id]||48}}
function itemDesc(id){const i=ITEMS[id];if(i.k==='w')return`${i.d[0]}–${i.d[1]} dmg, ${i.ap} AP${i.rng>1?', range '+i.rng:''}${i.two?', two-handed':''}${i.spell?', +'+Math.round(i.spell*100)+'% spell dmg':''}`;if(i.k==='s')return`+${i.md} melee def, +${i.rd} ranged def, ${i.hp} shield hp, −${i.fat} fatigue`;return`${i.arm} ${i.k==='h'?'head ':''}armor, −${i.fat} fatigue`}
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
 buff:{n:'Bolstered',d:'Under a helpful effect.',icon:'buff',good:1}
};
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
const MAST={
 vanguard:{n:'Vanguard',d:'Front-line killing craft',p:[
  {n:'Steady hand',d:'+8 melee skill',st:{ms:8}},{n:'Shove',d:'Ability: push an adjacent foe back 1 tile',ab:'shove'},
  {n:'Executioner',d:'+25% damage to foes below half health',flag:'exec'},{n:'Berserk',d:'Regain 4 AP on a kill, once per turn',flag:'berserk'}]},
 bulwark:{n:'Bulwark',d:'Holding the line',p:[
  {n:'Stalwart',d:'+6 melee and ranged defense',st:{md:6,rd:6}},{n:'Colossus',d:'+15 hitpoints',st:{hp:15}},
  {n:'Battle-forged',d:'Take 15% less damage while armor holds',flag:'forged'},{n:'Indomitable',d:'Ability: halve damage and ignore knockback for a round',ab:'indom'}]},
 marksman:{n:'Marksman',d:'Bow work',p:[
  {n:'Bullseye',d:'+10 ranged skill',st:{rs:10}},{n:'Aimed shot',d:'Ability: slow, accurate, hard-hitting shot',ab:'aimed'},
  {n:'Pinning shot',d:'Ability: root the target for its next turn',ab:'pin'},{n:'Eagle eye',d:'+1 bow range, +5 ranged skill',st:{rs:5},flag:'eagle'}]},
 skirmisher:{n:'Skirmisher',d:'Movement and evasion',p:[
  {n:'Pathfinder',d:'Climbing and rough ground cost no extra AP',flag:'path'},{n:'Footwork',d:'Ability: step 1 tile without provoking attacks',ab:'footwork'},
  {n:'Dodge',d:'+8 melee and ranged defense',st:{md:8,rd:8}},{n:'Adrenaline',d:'Ability: gain 4 AP, once per battle',ab:'adren'}]},
 mana:{n:'Arcana',res:'mana',d:'Awakens Mana for spellcraft',p:[
  {n:'Awaken Mana',d:'Unlocks 30 Mana. Ability: Arcane bolt',res:30,ab:'bolt'},{n:'Fireball',d:'Ability: burning blast that splashes adjacent foes',ab:'fireball'},
  {n:'Blink',d:'Ability: teleport up to 4 tiles',ab:'blink'},{n:'Chain lightning',d:'Ability: arcs to 2 more foes',ab:'chain'},
  {n:'Deep well',d:'+20 Mana, faster regeneration',res:20,regen:3}]},
 aura:{n:'Aura arts',res:'aura',d:'Awakens Aura to augment weapon strikes',p:[
  {n:'Awaken Aura',d:'Unlocks 30 Aura. Ability: Aura strike',res:30,ab:'astrike'},{n:'Aura wave',d:'Ability: send a weapon strike 3 tiles',ab:'awave'},
  {n:'Crushing blow',d:'Ability: knock back 2 tiles and stun',ab:'crush'},{n:'Aura dash',d:'Ability: rush a foe up to 4 tiles away and strike',ab:'adash'},
  {n:'Overflow',d:'+15 Aura, +10% damage',res:15,st:{dmg:.1}}]},
 qi:{n:'Elemental way',res:'qi',d:'Awakens Qi for elemental weapon arts',p:[
  {n:'Awaken Qi',d:'Unlocks 30 Qi. Ability: Flame edge',res:30,ab:'flame'},{n:'Frost edge',d:'Ability: chilled foes lose 3 AP',ab:'frost'},
  {n:'Gale step',d:'Ability: leap 3 tiles over anything',ab:'gale'},{n:'Thunder cleave',d:'Ability: strike every adjacent foe',ab:'thunder'},
  {n:'Harmony',d:'+15 Qi, faster regeneration',res:15,regen:2}]},
 chi:{n:'Inner flow',res:'chi',d:'Awakens Chi for reinforcement and support',p:[
  {n:'Awaken Chi',d:'Unlocks 30 Chi. Ability: Reinforce',res:30,ab:'reinforce'},{n:'Mend',d:'Ability: heal yourself or an adjacent ally',ab:'mend'},
  {n:'Empower',d:'Ability: raise an ally’s skill and damage',ab:'empower'},{n:'Swift meridian',d:'Ability: grant an ally 3 AP',ab:'swift'},
  {n:'Iron body',d:'+15 Chi, +12 hitpoints',res:15,st:{hp:12}}]}
};
const MUNDANE=['vanguard','bulwark','marksman','skirmisher'];
/* Backgrounds. st may carry brv (resolve); gear lists one pick per slot, '-' meaning nothing (helmets are k:'h'). */
const BG={
 farmhand:{n:'Farmhand',cost:90,wage:8,w:5,st:{hp:8,fat:10,ms:-3},m:['vanguard','bulwark'],r:[['chi',.15]],gear:['club|knife','rags','hood|-']},
 militia:{n:'Militiaman',cost:160,wage:11,w:5,st:{ms:4,md:2,brv:3},m:['vanguard','bulwark'],r:[['aura',.15]],gear:['spear','padded','buckler','cap|hood']},
 hunter:{n:'Hunter',cost:220,wage:13,w:4,st:{rs:12,ms:-4,init:8},m:['marksman','skirmisher'],r:[['qi',.3]],gear:['shortbow','rags|padded','hood']},
 thief:{n:'Cutpurse',cost:170,wage:11,w:3,st:{init:14,md:4,hp:-5,brv:-5},m:['skirmisher','vanguard'],r:[['aura',.2]],gear:['knife','rags','hood']},
 sellsword:{n:'Sellsword',cost:420,wage:24,w:3,st:{ms:10,md:4,hp:5,fat:5,brv:5},m:['vanguard','bulwark','skirmisher'],r:[['aura',.5]],gear:['shortsword|handaxe','leather','buckler','cap|coif']},
 squire:{n:'Squire',cost:380,wage:20,w:2,st:{ms:7,md:5,fat:5,brv:6},m:['bulwark','vanguard'],r:[['aura',1]],gear:['shortsword','padded','kite','coif|cap']},
 hedge:{n:'Hedge mage',cost:480,wage:22,w:2,st:{hp:-8,ms:-8,fat:-5,brv:-3},m:['skirmisher','bulwark'],r:[['mana',1]],gear:['staff','robe','hood']},
 acolyte:{n:'Temple acolyte',cost:330,wage:16,w:2,st:{hp:4,ms:-2,brv:6},m:['bulwark','vanguard'],r:[['chi',1]],gear:['club','padded','hood']},
 monk:{n:'Wandering monk',cost:450,wage:20,w:2,st:{init:8,md:8,ms:5,brv:10},m:['skirmisher','vanguard'],r:[['chi',.6],['qi',.4]],gear:['staff','rags']},
 spellblade:{n:'Academy dropout',cost:540,wage:26,w:2,st:{ms:5},m:['vanguard','skirmisher'],r:[['qi',.6],['mana',.4]],gear:['shortsword','padded','cap|-']},
 wildling:{n:'Wildling',cost:300,wage:16,w:3,st:{hp:10,ms:6,md:-5,fat:10,brv:4},m:['vanguard','skirmisher'],r:[['qi',.4]],gear:['handaxe','rags']},
 knight:{n:'Disgraced knight',cost:900,wage:38,w:1,st:{ms:14,md:8,hp:10,fat:8,brv:12},m:['vanguard','bulwark'],r:[['aura',1]],gear:['arming','mail','kite','nasal']}
};
const RACE={human:{n:'Human',st:{}},elf:{n:'Elf',st:{rs:5,init:8,hp:-5}},dwarf:{n:'Dwarf',st:{hp:8,fat:8,init:-10,brv:5}},halforc:{n:'Half-orc',st:{hp:6,ms:3,rd:-3,brv:3}}};
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
 gobarch:{n:'Goblin archer',hp:35,arm:10,ms:40,rs:55,md:5,rd:10,init:125,d:[16,28],rng:5,xp:100,role:'sniper',brv:30,flee:.4,abs:['gpoison']},
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
 bmark:{n:'Brigand archer',hp:50,arm:30,helm:20,ms:45,rs:55,md:5,rd:5,init:105,d:[22,38],rng:6,xp:120,role:'sniper',brv:25,flee:.35,abs:['aimed']},
 braid:{n:'Brigand raider',hp:70,arm:110,helm:70,ms:62,md:15,rd:15,init:105,d:[30,44],xp:220,role:'flanker',brv:32,dive:1,abs:['footwork']},
 blead:{n:'Brigand chief',hp:90,arm:70,helm:60,ms:72,md:14,rd:15,init:110,d:[40,56],xp:380,role:'caster',brv:75,lead:1,banner:1,max:1,sub:'braid',shield:{hp:64,md:12,rd:12},abs:['brally','shieldwall']},
 imp:{n:'Rift imp',hp:50,arm:20,ms:62,md:12,rd:12,init:150,d:[24,36],ap:11,xp:180,role:'flanker',brv:99,fearless:1,noCorpse:1,abs:['iblink']},
 vknight:{n:'Void knight',hp:120,arm:220,helm:180,ms:72,md:15,rd:12,init:70,d:[45,65],ap:8,xp:420,role:'line',brv:99,fearless:1,abs:['vreap']},
 vmage:{n:'Void weaver',hp:70,arm:40,ms:45,md:8,rd:10,init:105,d:[12,20],xp:380,role:'caster',brv:80,max:3,sub:'imp',res:{mana:[32,5]},abs:['vlance','vblink','vward']},
 tyrant:{n:'Rift tyrant',hp:340,arm:300,helm:240,ms:80,md:15,rd:10,init:100,d:[60,85],kb:2,kbCh:.6,big:1,boss:1,xp:1500,role:'boss',brv:99,fearless:1,lead:1,enrage:.34,noCorpse:1,abs:['tsummon','tnova']}
};
/* FACT[f].units: [enemy id, budget cost]. rank: [g, cap], how the faction's quality follows the budget (see foeRank in 64-foes.js). */
const FACT={
 gob:{n:'Goblins',g:'G',col:'#7a9a3c',skin:'#9fc25a',lair:'Burn out a goblin warren',units:[['gob',9],['gobarch',11],['gobsham',20]],rank:[.5,1.35],loot:['knife','shortbow','buckler','spear']},
 undead:{n:'Restless dead',g:'U',col:'#b9b39a',skin:'#e4e0cf',lair:'Put the restless dead to rest',units:[['skel',15],['zomb',14],['necro',30]],rank:[.3,1.4],loot:['shortsword','kite','spear','mail']},
 beast:{n:'Beasts',g:'B',col:'#6b5137',skin:'#8a6b49',lair:'Clear a den of beasts',units:[['wolf',19],['wolf',19],['spider',18],['bear',58]],rank:[.38,1.2,.3],loot:[]},
 orc:{n:'Orcs',g:'O',col:'#4f6b46',skin:'#7c9b62',lair:'Break an orc warcamp',units:[['orcy',38],['orcw',62],['orcl',105]],rank:[.46,1.6,.3],loot:['handaxe','waraxe','greataxe','leather','scale']},
 bandit:{n:'Brigands',g:'R',col:'#5a5a66',skin:'#d9b99a',lair:'Root out a brigand hideout',units:[['thug',20],['bmark',25],['braid',44],['blead',71]],rank:[.5,1.1,.3],loot:['shortsword','club','padded','leather','shortbow','mace','heater']},
 void:{n:'Riftspawn',g:'V',col:'#7a46b8',skin:'#b99be6',lair:'Purge a riftspawn nest',units:[['imp',26],['vknight',62],['vmage',52]],rank:[.45,1.45],loot:['arming','warspear','scale','focus','warbow','rondel']}
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
