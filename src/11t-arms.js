/* ================= ARMS: throwing weapons and more firearms (the masteries update) =================
   Loads right after 10-data.js (like the gladiators' gear), so the markets, loot, famed bases and crafting lists see these items.
   Throwing weapons: a weapon family of their own, wt 'throwing' (in RANGEDWT and WTS: they are aimed with ranged skill, keep to the ranged
   lock, make no free attacks; the weapon mastery perk 'weapons.throwing', the Throwing arms tree MAST.thrower). Every one is one-handed
   and carries a stack of throws for each battle (ammo: u.am[weapon] in battle, 60p-passives.js; Bandolier adds to it). With none left
   the weapon still fights in hand: the Strike in hand skill (tstrike: melee skill, 70% damage, allowed with a foe next to you). All
   throws are picked up again after the battle. Item fields beyond a weapon's own:
     ammo   throws a battle      shot   the projectile drawn in flight (75-fx.js: 'axe' 'haxe' 'knife' 'star' 'jav' 'dart' 'hammer' 'bolas' 'chakram')
     bleed  turns of bleeding a hit that reaches hitpoints leaves (shuriken)      wst {status: turns} a throw's hit applies (bolas)
     ret    the throw comes back when it misses (the chakram)
   Firearms: six more guns across the tiers. barrels 2: two shots before it must be reloaded (the twin-barrel pistol, u.am counts them);
   brace n: −n to hit when fired after moving this turn (the wall gun). Abilities: tstrike (a weapon skill of every throwing weapon),
   dthrow (Double throw, Throwing arms), dcharge (Double charge, Musketry). Statuses: hobbled (−2 AP at the start of its next turn:
   Hamstring shot), offbal (Off balance, −10 melee defense until its next turn: Shield bind; ticks with the foes' statuses, 64t-arms.js). */
const THROWITEMS=['tknives','darts','taxe','bolas','javelin','shuriken','throwhammer','francisca','pilum','chakram','hurlbat','stormaxes'];
const GUNITEMS=['caliver','dragon','carbine','twinpistol','jezail','wallgun'];
Object.assign(ITEMS,{
 tknives:{k:'w',n:'Throwing knives',wt:'throwing',d:[14,22],ap:3,fat:4,rng:4,ign:.25,hit:5,ammo:6,shot:'knife',crush:-.2,price:80,tier:1},
 darts:{k:'w',n:'Weighted darts',wt:'throwing',d:[16,24],ap:3,fat:4,rng:5,ign:.3,ammo:5,shot:'dart',crush:-.2,price:95,tier:1},
 taxe:{k:'w',n:'Throwing axe',wt:'throwing',d:[22,34],ap:4,fat:8,rng:3,ign:.3,ammo:3,shot:'axe',price:120,tier:1},
 bolas:{k:'w',n:'Bolas',wt:'throwing',d:[8,14],ap:4,fat:6,rng:4,ign:.1,hit:5,ammo:3,shot:'bolas',wst:{root:1},price:190,tier:2},
 javelin:{k:'w',n:'Javelins',wt:'throwing',d:[28,40],ap:4,fat:9,rng:5,ign:.35,ammo:3,shot:'jav',price:280,tier:2},
 shuriken:{k:'w',n:'Shuriken',wt:'throwing',d:[10,16],ap:3,fat:3,rng:4,ign:.15,hit:5,ammo:8,bleed:2,shot:'star',crush:-.2,price:220,tier:2,east:1},
 throwhammer:{k:'w',n:'Throwing hammer',wt:'throwing',d:[24,36],ap:4,fat:10,rng:3,ign:.25,crush:.2,stun:.1,ammo:3,shot:'hammer',price:360,tier:2},
 francisca:{k:'w',n:'Francisca',wt:'throwing',d:[36,54],ap:5,fat:14,rng:2,ign:.35,hit:-5,ammo:2,shot:'haxe',price:640,tier:3},
 pilum:{k:'w',n:'Pila',wt:'throwing',d:[34,50],ap:5,fat:11,rng:4,ign:.45,ammo:2,shot:'jav',price:820,tier:3},
 chakram:{k:'w',n:'Chakram',wt:'throwing',d:[28,42],ap:4,fat:6,rng:5,ign:.3,hit:10,ammo:3,ret:1,shot:'chakram',price:1350,tier:4},
 hurlbat:{k:'w',n:'Bearded hurlbats',wt:'throwing',d:[32,48],ap:4,fat:10,rng:3,ign:.4,ammo:3,shot:'axe',price:1250,tier:4},
 stormaxes:{k:'w',n:'Dwarven storm-axes',wt:'throwing',d:[44,64],ap:5,fat:13,rng:3,ign:.45,ammo:3,shot:'haxe',price:2700,tier:5},
 caliver:{k:'w',n:'Matchlock caliver',wt:'flintlock',two:1,d:[42,62],ap:4,fat:8,rng:6,ign:.55,reload:{ap:5,fat:12},shot:'ball',fx:'smoke',price:520,tier:2},
 dragon:{k:'w',n:'Dragon pistol',wt:'flintlock',d:[40,62],ap:4,fat:7,rng:3,ign:.5,hit:5,reload:{ap:5,fat:10},shot:'ball',fx:'smoke',price:980,tier:3},
 carbine:{k:'w',n:'Wheellock carbine',wt:'flintlock',two:1,d:[54,78],ap:4,fat:9,rng:6,ign:.6,hit:5,reload:{ap:5,fat:12},shot:'ball',fx:'smoke',price:1250,tier:3},
 twinpistol:{k:'w',n:'Twin-barrel pistol',wt:'flintlock',d:[36,54],ap:4,fat:7,rng:4,ign:.55,barrels:2,reload:{ap:5,fat:12},shot:'ball',fx:'smoke',price:1900,tier:4},
 jezail:{k:'w',n:'Jezail',wt:'flintlock',two:1,d:[76,108],ap:5,fat:11,rng:9,ign:.6,hit:5,reload:{ap:6,fat:16},shot:'ball',fx:'smoke',price:2200,tier:4},
 wallgun:{k:'w',n:'Wall gun',wt:'flintlock',two:1,d:[100,140],ap:6,fat:16,rng:8,ign:.7,hit:-5,brace:15,reload:{ap:7,fat:20},shot:'ball',fx:'smoke',price:3400,tier:5}
});
Object.assign(WSKID,{wallgun:['reload']});   // the wall gun is too heavy for a scattershot
for(const id of THROWITEMS.concat(GUNITEMS)){const i=ITEMS[id];i.look=i.look||id;i.sk=(WSKID[id]||WSK[i.wt]||[]).slice()}
/* ---- abilities ---- */
Object.assign(AB,{
 tstrike:{n:'Strike in hand',ap:4,fat:8,rng:1,tgt:'enemy',wpn:1,needs:'throwing',inHand:1,melee:1,mult:.7,fx:'slash',
  d:'Hack or stab with the throwing weapon in hand at a foe next to you: 70% damage, aimed with melee skill. It spends no throw, and works with a foe next to you or none left.'},
 dthrow:{n:'Double throw',ap:6,fat:16,tgt:'enemy',wpn:1,needs:'throwing',mult:.8,hits:2,ammoN:2,fx:'throw',
  d:'Two throws in quick succession at one foe (6 AP, 2 throws): 80% damage each, aimed with ranged skill; the second flies only while the foe stands.'},
 dcharge:{n:'Double charge',ap:6,fat:18,tgt:'enemy',wpn:1,needs:'flintlock',mult:1.4,ignB:.2,hit:-5,fx:'smoke',
  d:'A double load of powder behind the ball: 140% damage, +20% armor piercing, −5 to hit. The gun must be loaded, and is spent after.'}});
/* ---- statuses ---- */
Object.assign(STATUS,{
 hobbled:{n:'Hobbled',d:'A wound in the leg: loses 2 action points at the start of its next turn.',icon:'st-hobbled',good:0},
 offbal:{n:'Off balance',d:'Thrown off balance: −10 melee defense until its next turn.',icon:'st-offbal',good:0},
 touched:{n:'Empowered touch',d:'+10 melee and ranged skill from a healer\u2019s touch.',icon:'st-touched',good:1}});
/* ---- who carries them: backgrounds (BG[bg].wt: at most 5 families; pool: the trees a recruit draws), gear, enemies, loot ---- */
{const add=(bg,k,v)=>{const b=BG[bg];if(b&&Array.isArray(b[k])&&!b[k].includes(v))b[k].push(v)},swap=(bg,from,to)=>{const b=BG[bg];if(!b)return;const i=b.wt.indexOf(from);if(i>=0)b.wt[i]=to};
 for(const bg of ['woodcutter','poacher','butcher','beggar','cutthroat','acrobat'])add(bg,'wt','throwing');
 swap('hunter','spear','throwing');swap('nomad','spear','throwing');
 const tree=(bg,k,out)=>{const b=BG[bg];if(!b||b.pool.includes(k))return;const i=out?b.pool.indexOf(out):-1;if(i>=0)b.pool[i]=k;else b.pool.push(k)};   // a full pool (9) gives up a tree
 for(const bg of ['woodcutter','poacher','hunter','acrobat','butcher','beggar'])tree(bg,'thrower');tree('nomad','thrower','berserker');tree('cutthroat','thrower','berserker');
 tree('witchhunter','gunner');for(const bg of ['spellblade','noble'])tree(bg,'pistol');tree('thief','pistol','brawler');tree('sailor','pistol','berserker');   // the gun trees update: the duellists and boarders take the Pistolier, the witch hunter's caliver Musketry
 const gear=(bg,i,extra)=>{const b=BG[bg];if(b&&b.gear&&b.gear[i])b.gear[i]+='|'+extra};
 gear('woodcutter',0,'taxe');gear('nomad',0,'javelin');gear('cutthroat',0,'tknives');gear('witchhunter',0,'caliver');
 if(BG.cutthroat)BG.cutthroat.side='knife|-|darts';if(BG.woodcutter&&!BG.woodcutter.side)BG.woodcutter.side='-|-|hatchet';if(BG.acrobat)BG.acrobat.side=(BG.acrobat.side?BG.acrobat.side+'|':'')+'tknives|-';
 gear('beggar',0,'darts');}   // a gutter juggler's darts (and with them, now and then, a throwing gift: mana_t); one more choice in the same draw
Object.assign(EN,{
 bknife:{n:'Brigand knife-thrower',hp:52,arm:30,helm:18,ms:50,rs:55,md:8,rd:10,init:115,d:[16,26],w:'tknives',xp:120,role:'sniper',brv:25,flee:.35,abs:['tstrike'],side:{n:'Seax',wt:'dagger',d:[18,28],ap:3,fat:0,rng:1,ign:.25}},
 kageuchi:{n:'Shuriken thrower',hp:50,arm:20,helm:10,ms:58,rs:62,md:18,rd:22,init:145,ap:10,d:[12,20],w:'shuriken',xp:200,role:'sniper',brv:42,flee:.2,east:1,abs:['tstrike'],side:'tanto'}});
if(FACT.bandit){FACT.bandit.units.splice(2,0,['bknife',28]);for(const id of ['taxe','tknives','javelin'])if(!FACT.bandit.loot.includes(id))FACT.bandit.loot.push(id)}
if(FACT.gob)for(const id of ['darts','tknives'])if(!FACT.gob.loot.includes(id))FACT.gob.loot.push(id);
