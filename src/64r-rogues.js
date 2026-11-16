/* ================= ROGUES: the Assassin, Rogue and Shadowdancer trees =================
   The trees are MAST.assassin / MAST.rogue / MAST.shadow in 10-data.js (perk ids pinned: assassin.1-6, rogue.1-6, shadow.1-6). The numbers
   that touch a hit or its damage live in the core so the forecast stays exact: isLightW, notActed, impaired, rogueHit, rogueDmg,
   bleedOf / poisonOf, the Flow term of armorDef, the Pocket sand rule of canFree (60-battle-core.js); Read the blade in calc()
   (30-mercs.js); poison in forecast() (62-forecast.js). This file (it loads after 64-foes.js, whose status tables it extends) holds:
     the abilities (AB): shadowstrike deathmark coupdegrace pickpocket pocketsand slipaway blur untouchable
     the statuses: doomed (Death mark: takes 15% more damage), blinded (Pocket sand), and the buffs blur / untouchable / slipaway / flow
     Death mark leaping on a kill (a wrapper of killUnit), the status refresh (a wrapper of addStatus: the foe auras recompute at once,
       so a blinded or doomed unit's numbers change before the next blow, not at the next move)
     Pickpocket: what a purse holds (pickPurse), B.purse, and rogueSpoils(b, res, win) (resolveBattle in 68-battle-flow.js: stolen goods and
       Light fingers), brSpoils(res) (the result sheet's line).
   Light weapon (isLightW): bare fists, any dagger, or a one-handed melee weapon of at most LIGHTW.fat (8) fatigue: short swords, the wakizashi.
   AB field read by the rules: light (needs a light weapon in hand: canUse / useBlock), killAP (a kill with it gives back that much AP),
   tgtOK(u,t) (validTargets keeps only the foes it accepts). Randomness: the rnd() stream only in pickPurse (a successful Pickpocket). */
const PICK={ap:2,item:.2,coin:[4,8],min:2},DOOM={dr:.15,turns:3,leap:2,rng:4},BLIND={ms:15,rs:15,md:10,turns:2};
// Foes that carry no purse: beasts, serpents, plants, the mindless dead, riftspawn, wyverns (and anything raised or of size 2).
const NOPURSE=new Set(['wolf','spider','bear','adder','viper','gserp','thorn','ent','elder','wyvern','whatch','imp','vknight','vmage','tyrant','skel','zomb','skelhal','gknight','barbhound','bthrone']);
function hasPurse(t){if(!t||!t.alive||t.robbed||t.vip)return false;if(t.m)return true;return!!(t.def&&!NOPURSE.has(t.eid)&&!((t.sz||1)>1)&&!t.risen&&!(t.def.noCorpse&&t.spawned))}
// What a foe is worth to a cutpurse: its battle xp (rank included, as resolveBattle pays it), a rival's merc by its level.
function purseWorth(t){if(t.m)return typeof rivalXP==='function'?rivalXP(t.m):60+20*(t.lvl||1);const x=t.def&&t.def.xp||60;return x*(1+(typeof XPRANK==='number'?XPRANK:.3)*Math.max(0,+t.rank||0))}
/* pickPurse(u,t): u has just picked t's pocket (the hit landed). Rolls (seeded) the crowns, round(worth x 4..8%) at least PICK.min, and with
   chance PICK.item one piece of gear from t's band's loot table (FACT[t.f].loot; never from a rival's merc); t loses PICK.ap AP on its next
   turn and cannot be robbed again. The take goes into B.purse [{u, side, mid, name, crowns, items}]. Returns that entry. */
function pickPurse(u,t){const b=B;if(!b)return null;t.robbed=1;const crowns=Math.max(PICK.min,Math.round(purseWorth(t)*ri(PICK.coin[0],PICK.coin[1])/100)),items=[];
 const L=!t.m&&FACT[t.f]&&Array.isArray(FACT[t.f].loot)?FACT[t.f].loot.filter(id=>ITEMS[id]&&!ITEMS[id].uniq):[];if(L.length&&rnd()<PICK.item)items.push(pick(L));
 const e={u,side:u.side,mid:u.m?u.m.id:null,name:u.name,crowns,items};(b.purse||(b.purse=[])).push(e);
 t.bonusAP=(t.bonusAP||0)-PICK.ap;float(u,'+'+crowns+' crowns','#ffd27a');for(const id of items)float(u,ITEMS[id].n,'#ffd27a');float(t,'-'+PICK.ap+' AP','#ffd27a');
 say(`${u.name} lifts ${crowns} crowns${items.length?' and '+ITEMS[items[0]].n.toLowerCase():''} from ${t.name}.`);FX.emit('buff',{t:u});return e}
/* ---- abilities ---- */
Object.assign(AB,{
 shadowstrike:{n:'Shadow strike',ap:4,fat:15,tgt:'enemy',wpn:1,light:1,once:1,mult:1.5,hit:15,ignB:.3,noBow:1,fx:'stab',
  d:'Once per battle, with a light weapon in hand: a strike out of nowhere for 150% damage, +15 to hit, +30% armor piercing.'},
 deathmark:{n:'Death mark',ap:2,fat:6,rng:6,tgt:'enemy',noDmg:1,sure:1,nostun:1,status:{doomed:DOOM.turns},noDmgTxt:'Marked for death',fx:'mark',
  d:'Mark a foe within 6 tiles in sight for death: it takes 15% more damage from every blow until 3 of its turns have passed. If it dies marked, the mark leaps to the nearest of its allies within 4 tiles, for at least 2 more turns. Cannot miss.'},
 coupdegrace:{n:'Coup de grâce',ap:5,fat:18,tgt:'enemy',wpn:1,light:1,mult:1.25,hit:10,ignB:.25,vsHurt:.75,killAP:3,noBow:1,fx:'stab',
  d:'With a light weapon in hand: 125% damage, +10 to hit, +25% armor piercing, and a further +75% against a foe below half health. A kill gives back 3 AP.'},
 pickpocket:{n:'Pickpocket',ap:3,fat:8,rng:1,tgt:'enemy',melee:1,noDmg:1,nostun:1,hit:10,noDmgTxt:'Pickpocketed',fx:'shove',tgtOK:(u,t)=>hasPurse(t),
  d:'Lift the purse of an adjacent foe that carries one (people, not beasts or the mindless dead): crowns, and one time in five a piece of its band’s gear. The take comes home with you if you live or the field is won. The fumbling foe loses 2 AP on its next turn. +10 to hit, no damage; each foe can be robbed once.',
  async run(u,k,a){const b=B,t=unitAt(k%BW,(k/BW)|0);if(!t||!hasPurse(t))return;const hit=await strike(u,t,a);if(B!==b||!hit||!t.alive||!u.alive)return;pickPurse(u,t);await sleep(160)},
  ai(u,X){const out=[];if(u.side!==0||!X||!X.D)return out;const a=abilityInfo(u,'pickpocket');
   for(const t of X.foes){if(!hasPurse(t))continue;const W=t.aiW||10,v0=RG_AIPICK.base+purseWorth(t)*.06*RG_AIPICK.coin+W*RG_AIPICK.ap;
    X.D.forEach((d,s)=>{if(d.air||d.cost+a.ap>u.ap)return;const c=s%BW,r=(s/BW)|0;if(Math.abs(c-t.c)+Math.abs(r-t.r)!==1)return;if(s!==X.at&&unitAt(c,r))return;const p=aiChance(u,a,t,s);if(p>0)out.push({s,k:key(t.c,t.r),v:p*v0})})}
   return out}},
 pocketsand:{n:'Pocket sand',ap:3,fat:10,rng:1,tgt:'enemy',melee:1,noDmg:1,nostun:1,hit:10,status:{blinded:BLIND.turns},noDmgTxt:'Blinded',fx:'shove',
  d:'A fistful of grit in the eyes of an adjacent foe: blinded through its next turn: −15 melee and ranged skill, −10 melee defense, and it makes no free attacks. +10 to hit, no damage.'},
 slipaway:{n:'Slip away',ap:2,fat:12,rng:3,tgt:'move',buff:{key:'slipaway',ms:10,md:10,rd:10},dur:1,fx:'leap',
  d:'Slip up to 3 tiles away to a free spot (no climbing more than 1 step), drawing no free attacks: +10 melee skill and +10 melee and ranged defense until your next turn.'},
 blur:{n:'Blur',ap:3,fat:12,tgt:'self',buff:{key:'blur',md:10,rd:10,rip:1},dur:1,fx:'guard',
  d:'Until your next turn: +10 melee and ranged defense, and you strike back at every foe whose melee attack misses you.'},
 untouchable:{n:'Untouchable',ap:2,fat:10,tgt:'self',once:1,buff:{key:'untouchable',md:25,rd:25},dur:1,fx:'guard',
  d:'Once per battle: +25 melee and ranged defense until your next turn.'}});
const RG_AIPICK={base:6,coin:.5,ap:.2};   // what the AI weighs a Pickpocket at: base + half the crowns it expects + a fifth of the foe's threat (the AP it loses)
/* ---- statuses: doomed and blinded tick like the foes' own (FOE_ST t:1, one off at the start of each of the bearer's turns) and change
   numbers through FOE_MOD (foeAuras folds them into the unit's buff, so hitChance, drOf and forecast() read them) ---- */
const RG_ST={
 doomed:{n:'Marked for death',d:'Takes 15% more damage from every blow. If it dies marked, the mark leaps to the nearest of its allies within 4 tiles.',icon:'st-doomed',good:0,t:1},
 blinded:{n:'Blinded',d:'Grit in the eyes: −15 melee and ranged skill, −10 melee defense, and it makes no free attacks.',icon:'st-blinded',good:0,t:1}};
if(typeof FOE_ST==='object'){Object.assign(FOE_ST,RG_ST);if(typeof FOE_MOD==='object'){FOE_MOD.doomed={dr:-DOOM.dr};FOE_MOD.blinded={ms:-BLIND.ms,rs:-BLIND.rs,md:-BLIND.md}}}
for(const k in RG_ST)if(!STATUS[k])STATUS[k]=RG_ST[k];
Object.assign(STATUS,{
 blur:{n:'Blur',d:'+10 melee and ranged defense; strikes back at every melee attack that misses it.',icon:'st-blur',good:1},
 untouchable:{n:'Untouchable',d:'+25 melee and ranged defense.',icon:'st-untouchable',good:1},
 slipaway:{n:'Slipped away',d:'+10 melee skill, +10 melee and ranged defense.',icon:'st-slipaway',good:1},
 flow:{n:'Flowing',d:'Flow: melee and ranged defense for every attack that missed it since its last turn (+4 a miss, up to 3 misses; the number shown is the bonus).',icon:'st-flow',good:1}});
// a status with numbers of its own (FOE_MOD) takes hold at once: the auras are recomputed when it is given
if(typeof addStatus==='function'&&!addStatus.rg){const a0=addStatus;addStatus=function(t,key,n){const had=t&&t.st?t.st[key]||0:0,r=a0(t,key,n);if(RG_ST[key]&&t&&t.st&&(t.st[key]||0)!==had&&typeof foeAuras==='function')foeAuras();return r};addStatus.rg=1}
/* Death mark leaps: when a doomed unit dies, the nearest living unit of its side within DOOM.rng tiles of it (ties: the lower id) is doomed for
   the turns the mark had left, at least DOOM.leap. No randomness. */
function doomLeap(t,n){const b=B;if(!b)return null;let best=null,bd=99;for(const o of b.units){if(!o.alive||o===t||o.side!==t.side||o.gone)continue;const d=mdist(o,t);if(d>DOOM.rng)continue;if(d<bd||(d===bd&&o.id<best.id)){bd=d;best=o}}
 if(!best)return null;addStatus(best,'doomed',Math.max(DOOM.leap,n));float(best,'Marked for death','#ff7a6b');say(`The death mark passes to ${best.name}.`);return best}
if(typeof killUnit==='function'&&!killUnit.rg){const k0=killUnit;killUnit=function(t,src,head){const n=t&&t.st&&t.st.doomed>0?t.st.doomed:0;const r=k0(t,src,head);if(n&&B)doomLeap(t,n);return r};killUnit.rg=1}
/* ---- after the battle (resolveBattle calls rogueSpoils once, after the field's crowns and loot) ----
   Light fingers: a won battle pays 10% more of res.crowns for every company merc with the perk (flag lightFingers) who took the field and lives,
   at most RG_FINGERS.max of them. Pickpocket: what the company's thieves took (B.purse, side 0) comes home when the thief lives or the field is
   won (the company strips its fallen too). res.spoils = {fingers:{n, crowns}, stolen:{crowns, items, by:[names]}} | null. No randomness. */
const RG_FINGERS={per:.1,max:3};
function rogueSpoils(b,res,win){if(!b||!res)return null;const live=m=>!!(m&&G&&Array.isArray(G.roster)&&G.roster.includes(m));const out={fingers:null,stolen:null};
 if(win&&res.crowns>0){let n=0;for(const u of b.units)if(u.side===0&&u.m&&!u.ally&&u.flags&&u.flags.lightFingers&&live(u.m))n++;n=Math.min(RG_FINGERS.max,n);
  if(n){const c=Math.round(res.crowns*RG_FINGERS.per*n);if(c>0){G.crowns+=c;res.crowns+=c;out.fingers={n,crowns:c}}}}
 const P=Array.isArray(b.purse)?b.purse.filter(e=>e.side===0):[];
 if(P.length){const S={crowns:0,items:[],by:[]};for(const e of P){const m=e.u&&e.u.m;if(!(win||live(m)))continue;S.crowns+=e.crowns;for(const id of e.items)if(ITEMS[id]){S.items.push(id);G.stash.push(id)}if(!S.by.includes(e.name))S.by.push(e.name)}
  if(S.crowns||S.items.length){G.crowns+=S.crowns;out.stolen=S}}
 res.spoils=out.fingers||out.stolen?out:null;return res.spoils}
// The result sheet's line for res.spoils (68-battle-flow.js battleResultHTML).
function brSpoils(res){const S=res&&res.spoils;if(!S)return'';let h='';const ic=n=>typeof pxIcon==='function'?pxIcon(n,16):'';
 if(S.fingers)h+=`<p class="br-spoils">${ic('perk-rogue.1')}<span>Light fingers: the company's rogues turn up <span class="coin">${S.fingers.crowns} more crowns</span> on the field.</span></p>`;
 if(S.stolen){const L=S.stolen.items.map(id=>`<b>${ITEMS[id].n}</b>`);h+=`<p class="br-spoils">${ic('ab-pickpocket')}<span>${S.stolen.by.join(' and ')} ${S.stolen.by.length>1?'empty':'empties'} the purses lifted in the fight: <span class="coin">${S.stolen.crowns} crowns</span>${L.length?' and '+L.join(', '):''}.</span></p>`}
 return h}
