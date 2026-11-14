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
/* ---- Talent abilities ----
   Fields read by the rules beyond the ones above: hits (strike the target up to n times while it stands), through (after the
   strike, fly on along the line into up to n more foes for 75%), party (also affects every ally within n tiles: buff, heal,
   rally), rally (lift one step of morale, up to steady), cleanse (status keys removed from the healed ally), rest (fatigue shed),
   vsHurt (more damage against a foe below half health), noBow (not with a bow in hand), nostun (the weapon's stun never rides on it),
   noDmgTxt (the float of a no-damage hit), swapW (the weapon swap). fx is a hint for the presentation. */
Object.assign(AB,{
 swap:{n:'Swap weapons',ap:4,fat:0,tgt:'self',swapW:1,fx:'swap',d:'Exchange the weapon in hand for your other one (4 AP, no fatigue). A shield is raised with a one-handed weapon or none, slung on the back with a two-handed one.'},
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
 triage:{n:'Triage',ap:3,fat:10,rng:1,tgt:'ally',heal:[6,10],cleanse:['bleed','burn','poison','daze','chill','root','weak'],fx:'heal',d:'Quick care for yourself or an adjacent ally: heal 6–10 hitpoints and clear bleeding, burning, poison, daze, chill, roots and weakness.'},
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
 bastion:{n:'Bastion',d:'+20 melee and ranged defense, takes 20% less damage, cannot be knocked back.',icon:'bastion',good:1},
 parry:{n:'Parry',d:'+15 melee defense; strikes back at every melee attack that misses it.',icon:'riposte',good:1},
 phalanx:{n:'Phalanx',d:'+10 melee and ranged defense.',icon:'shieldwall',good:1},
 holdfast:{n:'Hold fast',d:'+10 melee and ranged defense, +15 resolve.',icon:'rallied',good:1},
 evasive:{n:'Evasive',d:'+15 melee and ranged defense.',icon:'evasive',good:1},
 rage:{n:'Raging',d:'+25% damage, −10 melee defense.',icon:'rage',good:1},
 manashield:{n:'Mana shield',d:'Takes 30% less damage.',icon:'manashield',good:1},
 avatar:{n:'Avatar of war',d:'+30% damage, +10 melee skill, +10 melee defense.',icon:'avatar',good:1},
 steady:{n:'Steady breathing',d:'+15 ranged skill.',icon:'steady',good:1}
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
   Tier t of a style or gift tree opens at level t, tier t of a weapon tree at level 3t (tierLevel). No same-tree prerequisites.
   aff: what the tree suits (melee ranged caster support one two shield bow light), read by autoLearn.
   Perk: {id, n, d, st?:{stat deltas, dmg as a fraction, ap = action points}, ab?:AB id, flag?:string, mod?:{flag:number},
          res?:number, regen?:number, wmod?:{d:[+min,+max], ap, rng, ign, hit, stun, spell} (weapon trees: changes the weapon in hand)}
   Ids are '<tree>.<tier>' (one perk in the tier) or '<tree>.<tier>a' / 'b'. d states the exact effect.
   The flags and mods the rules read (u.flags / calc(m).flags; mods add up):
     exec berserk forged path eagle (as before)   vsHurt vsFull dmgMelee dmgRanged twoDmg lowHpDmg duelHit duelDmg flankDmg spellB splitB
     drB drRanged drMelee lastStand   adjDef loneDef guard cmd flank coverIgn longShot rngB headB ignB bleedOn
     regenHP medAura killHeal killRes brvAura healB freeSwap noLock undying   shieldDef shieldHp (calc only) */
const GIFTBASE=30,GIFTREGEN=4,TALSTYLE=['melee','ranged','caster','support'],WTS=['sword','axe','mace','dagger','spear','bow','staff','fist'];
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
  [perkDef('Deadeye','+15% damage with bows, +10% head chance with weapon attacks',{mod:{dmgRanged:.15,headB:10}})]]},
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
  [perkDef('Dragon kick','Ability: 140% damage, knockback 2, dazes',{ab:'dragonkick'}),perkDef('Empty hand','Fists deal +6/+8 more damage and +20% armor piercing',{wmod:{d:[6,8],ign:.2}})]]}
};
// Perk ids, the flat list p (read by older UI code) and the tier count n.
for(const k in MAST){const T=MAST[k];T.p=[];T.tiers.forEach((tier,ti)=>tier.forEach((p,j)=>{if(!p.id)p.id=k+'.'+(ti+1)+(tier.length>1?'ab'[j]:'');T.p.push(p)}))}
const MUNDANE=Object.keys(MAST).filter(k=>MAST[k].kind==='style');
// Gift variants: GIFTV[res][style] -> tree key. A style the gift has no variant for falls back to melee.
const GIFTV={mana:{caster:'mana',melee:'mana_m',ranged:'mana_r'},aura:{melee:'aura',ranged:'aura_r'},qi:{melee:'qi',ranged:'qi_r'},chi:{support:'chi',melee:'chi_m',ranged:'chi_r'}};
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
/* Talents per background: style (melee ranged caster support: picks the gift variant), pool (the style trees a recruit draws 4 of),
   wt (the weapon families whose trees it may learn), side (a sidearm pick for m.eq.b, '-' = none). */
Object.assign(BG.farmhand,{style:'melee',pool:['vanguard','bulwark','brute','survivor','brawler','shieldbearer','medic'],wt:['mace','axe','spear','dagger','fist']});
Object.assign(BG.militia,{style:'melee',pool:['vanguard','bulwark','shieldbearer','tactician','survivor','skirmisher','marksman'],wt:['spear','sword','mace','bow'],side:'knife|-'});
Object.assign(BG.hunter,{style:'ranged',pool:['marksman','sharpshooter','scout','skirmisher','survivor','medic','brawler'],wt:['bow','dagger','spear','axe'],side:'knife'});
Object.assign(BG.thief,{style:'melee',pool:['skirmisher','duelist','scout','survivor','brawler','sharpshooter','marksman'],wt:['dagger','sword','fist','bow']});
Object.assign(BG.sellsword,{style:'melee',pool:['vanguard','duelist','brute','bulwark','skirmisher','tactician','berserker','survivor','shieldbearer'],wt:['sword','axe','mace','spear','dagger'],side:'knife|-|-'});
Object.assign(BG.squire,{style:'melee',pool:['vanguard','bulwark','shieldbearer','duelist','tactician','brute'],wt:['sword','spear','mace']});
Object.assign(BG.hedge,{style:'caster',pool:['skirmisher','bulwark','medic','scout','survivor','tactician'],wt:['staff','dagger','fist'],side:'knife|-'});
Object.assign(BG.acolyte,{style:'support',pool:['medic','bulwark','shieldbearer','tactician','survivor','vanguard','brawler'],wt:['mace','staff','spear','fist']});
Object.assign(BG.monk,{style:'melee',pool:['skirmisher','brawler','duelist','survivor','medic','scout','bulwark'],wt:['fist','staff','spear']});
Object.assign(BG.spellblade,{style:'melee',pool:['duelist','vanguard','skirmisher','tactician','scout','brute'],wt:['sword','staff','dagger','spear']});
Object.assign(BG.wildling,{style:'melee',pool:['berserker','brute','survivor','vanguard','skirmisher','scout','marksman','brawler'],wt:['axe','spear','bow','fist','mace']});
Object.assign(BG.knight,{style:'melee',pool:['vanguard','bulwark','shieldbearer','duelist','brute','tactician','survivor'],wt:['sword','mace','axe','spear']});
BG.hunter.r=[['qi',.2],['aura',.12],['chi',.08],['mana',.05]];      // a hunter's gift, if any, comes as its archery variant
RACE.human.noWt=[];RACE.elf.noWt=[];RACE.dwarf.noWt=[];RACE.halforc.noWt=['bow'];   // weapon trees a race never learns
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
 imp:{n:'Rift imp',hp:50,arm:20,ms:62,md:12,rd:12,init:150,d:[24,36],ap:11,xp:180,role:'flanker',brv:99,fearless:1,noCorpse:1,abs:['iblink']},
 vknight:{n:'Void knight',hp:120,arm:220,helm:180,ms:72,md:15,rd:12,init:70,d:[45,65],ap:8,xp:420,role:'line',brv:99,fearless:1,abs:['vreap']},
 vmage:{n:'Void weaver',hp:70,arm:40,ms:45,md:8,rd:10,init:105,d:[12,20],xp:380,role:'caster',brv:80,max:3,sub:'imp',res:{mana:[32,5]},abs:['vlance','vblink','vward']},
 tyrant:{n:'Rift tyrant',hp:340,arm:300,helm:240,ms:80,md:15,rd:10,init:100,d:[60,85],kb:2,kbCh:.6,big:1,boss:1,xp:1500,role:'boss',brv:99,fearless:1,lead:1,enrage:.34,noCorpse:1,abs:['tsummon','tnova']}
};
/* FACT[f].units: [enemy id, budget cost]. rank: [g, cap, h?, base?], how the faction's quality follows the budget (see foeRank in 64-foes.js). */
const FACT={
 gob:{n:'Goblins',g:'G',col:'#7a9a3c',skin:'#9fc25a',lair:'Burn out a goblin warren',units:[['gob',10],['gobarch',12],['gobsham',20]],rank:[.5,1.25],loot:['knife','shortbow','buckler','spear']},
 undead:{n:'Restless dead',g:'U',col:'#b9b39a',skin:'#e4e0cf',lair:'Put the restless dead to rest',units:[['skel',15],['zomb',14],['necro',30]],rank:[.3,1.4,0,17],loot:['shortsword','kite','spear','mail']},
 beast:{n:'Beasts',g:'B',col:'#6b5137',skin:'#8a6b49',lair:'Clear a den of beasts',units:[['wolf',19],['wolf',19],['spider',18],['bear',58]],rank:[.38,1.2,.3],loot:[]},
 orc:{n:'Orcs',g:'O',col:'#4f6b46',skin:'#7c9b62',lair:'Break an orc warcamp',units:[['orcy',38],['orcw',62],['orcl',105]],rank:[.46,1.6,.3,19],loot:['handaxe','waraxe','greataxe','leather','scale']},
 bandit:{n:'Brigands',g:'R',col:'#5a5a66',skin:'#d9b99a',lair:'Root out a brigand hideout',units:[['thug',20],['bmark',25],['braid',44],['blead',71]],rank:[.5,1.1,.3,19],loot:['shortsword','club','padded','leather','shortbow','mace','heater']},
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
