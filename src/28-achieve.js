/* ================= ACHIEVEMENTS AND THE ORIGINS THEY UNLOCK (replayability round, docs/replay-contract.md section 3) =================
   Achievements belong to the player, not to a company: they are kept in localStorage under ACHKEY ('wyrdmarch_ach_v1'), never in a save,
   so they survive new companies, burned books and reloads, and an ironman march earns them like any other.
     ACH[k] = {n, d, icon, cat, unlock? (an ORIGINS key it opens), goal?, prog?(S,G) -> [have, need], check(G, ev, S) -> earned?}
     achHas(k) / achGrant(k, quiet?) / achList() / achCount()
     achEvent(name, data)   the game's hooks (one typeof-guarded line each): 'battle' {res, b} (22-run.js runOnBattle), 'contract'
                            (runOnContract), 'crisis' {win, k} (18-crises.js crisisEnd), 'east' {won, side} (19-east.js eastEnd),
                            'dungeon' {k} / 'rift' (24-endgame.js, 68-battle-flow.js), 'caravan' (42-caravans.js, a caravan saved),
                            'treat' (30-mercs.js treatInjury), 'day' (40-world.js newDay). Lifetime counters (wins, contracts, caravans,
                            treatments) count across every company. Every event then tests every achievement not yet earned.
     originUnlocked(k)      an origin with lock:{ach} opens once that achievement is earned (the new-company dialog greys the rest).
   Rules: nothing here draws on the game stream. Granting an achievement only writes the store and shows a notice; the new origins'
   own rules (orDay, the ambush in startBattle) touch G only for a company of that origin. Their state lives in G.evt.flags
   (already saved and repaired by evtRepair), so the save format is unchanged. */
const ACHKEY='wyrdmarch_ach_v1';
const ACHCAT=[['march','The march'],['battle','Battle'],['crisis','Crises and wars'],['feat','Feats of arms'],['iron','Ironman']];
const achRn=n=>{const R=typeof RENOWN!=='undefined'?RENOWN.find(r=>r.n===n):null;return R?R.min:n==='Legendary'?1000:330};
const achWon=ev=>ev.name==='battle'&&ev.res&&ev.res.win;
const achSlew=(ev,re)=>achWon(ev)&&Array.isArray(ev.res.slain)&&ev.res.slain.some(k=>re.test(String(k)));
const achCtr=(c,goal)=>({goal,prog:S=>[S.n[c]||0,goal],check:(g,ev,S)=>(S.n[c]||0)>=goal});
const ACH={
 /* ---- the march ---- */
 ctr10:Object.assign({n:'Hired hands',d:'Complete 10 contracts, across all your companies.',icon:'contract',cat:'march'},achCtr('ctr',10)),
 ctr50:Object.assign({n:'A name on every board',d:'Complete 50 contracts, across all your companies.',icon:'ledger',cat:'march'},achCtr('ctr',50)),
 rich:{n:'Pieces of eight',d:'Hold 5,000 crowns at once.',icon:'coin',cat:'march',unlock:'corsairs',prog:(S,g)=>[g?Math.max(0,g.crowns|0):0,5000],check:g=>g.crowns>=5000},
 hoard:{n:'Dragon\'s hoard',d:'Hold 10,000 crowns at once.',icon:'coin',cat:'march',prog:(S,g)=>[g?Math.max(0,g.crowns|0):0,10000],check:g=>g.crowns>=10000},
 renowned:{n:'Lords send riders',d:'Raise a company to Renowned.',icon:'laurel',cat:'march',unlock:'sworn',prog:(S,g)=>[g?Math.floor(g.renown||0):0,achRn('Renowned')],check:g=>(g.renown||0)>=achRn('Renowned')},
 legendary:{n:'Sung in every hall',d:'Raise a company to Legendary.',icon:'star',cat:'march',prog:(S,g)=>[g?Math.floor(g.renown||0):0,achRn('Legendary')],check:g=>(g.renown||0)>=achRn('Legendary')},
 swords12:{n:'A full muster',d:'Have 12 swords on the roster at once.',icon:'retinue',cat:'march',prog:(S,g)=>[g&&Array.isArray(g.roster)?g.roster.length:0,12],check:g=>Array.isArray(g.roster)&&g.roster.length>=12},
 lvl11:{n:'Old soldier',d:'Keep a sword alive to level 11.',icon:'helmet',cat:'march',prog:(S,g)=>[g&&Array.isArray(g.roster)?Math.max(0,...g.roster.map(m=>m.lvl||1)):0,11],check:g=>Array.isArray(g.roster)&&g.roster.some(m=>(m.lvl||1)>=11)},
 cv5:Object.assign({n:'Road warden',d:'Save 5 caravans from raiders, across all your companies.',icon:'goal-caravan',cat:'march'},achCtr('cv',5)),
 treat10:Object.assign({n:'Bones well set',d:'Have 10 injuries treated at a temple, across all your companies.',icon:'temple',cat:'march',unlock:'plague'},achCtr('treat',10)),
 day100:{n:'The long road',d:'Keep one company marching to day 100.',icon:'camp',cat:'march',prog:(S,g)=>[g?Math.min(100,g.day|0):0,100],check:g=>(g.day|0)>=100},
 /* ---- battle ---- */
 first:Object.assign({n:'First blood',d:'Win a battle.',icon:'swords',cat:'battle'},achCtr('wins',1)),
 wins10:Object.assign({n:'Blooded',d:'Win 10 battles, across all your companies.',icon:'swords',cat:'battle'},achCtr('wins',10)),
 wins50:Object.assign({n:'Hardened',d:'Win 50 battles, across all your companies.',icon:'sword',cat:'battle'},achCtr('wins',50)),
 wins150:Object.assign({n:'War is a trade',d:'Win 150 battles, across all your companies.',icon:'ambition',cat:'battle'},achCtr('wins',150)),
 clean:{n:'Not one lost',d:'On Hard or Brutal, win a battle against five or more foes with no sword killed.',icon:'shieldwall',cat:'battle',
  check:(g,ev)=>achWon(ev)&&(g.diff==='hard'||g.diff==='brutal')&&!(ev.res.dead||[]).length&&(ev.res.foes||0)>=5},
 fabled:{n:'Legends bleed',d:'Kill a fabled warrior in battle.',icon:'rival',cat:'battle',check:(g,ev)=>achWon(ev)&&(ev.res.fabled||[]).some(x=>x&&x.side!==0&&x.fate==='dead')},
 dungeon:{n:'Into the dark',d:'Clear an endgame dungeon to its last hall.',icon:'q-dead',cat:'battle',check:(g,ev)=>ev.name==='dungeon'},
 arena5:{n:'Blood and sand',d:'Win 5 bouts in a colosseum with one company.',icon:'colosseum',cat:'battle',prog:(S,g)=>[g&&Array.isArray(g.colos)?Math.min(5,Math.max(0,...g.colos.map(c=>c.rec.w))):0,5],check:(g,ev)=>ev.name==='arena'&&ev.wins>=5},
 arenachamp:{n:'Champion of the sands',d:'Be hailed Champion of a colosseum (10 wins there), or win 5 bouts in a row.',icon:'laurel',cat:'feat',check:(g,ev)=>ev.name==='arena'&&(ev.title>=3||ev.streak>=5)},
 rift:{n:'Riftcloser',d:'Close a rift by killing its tyrant.',icon:'ab-riftstep',cat:'battle',check:(g,ev)=>ev.name==='rift'},
 /* ---- crises and wars ---- */
 sunder:{n:'The sky mended',d:'End the Sundering.',icon:'cr-sunder',cat:'crisis',unlock:'cultists',check:(g,ev)=>ev.name==='crisis'&&ev.win&&ev.k==='sunder'},
 deadmarch:{n:'Back to the grave',d:'End the Dead March.',icon:'cr-deadmarch',cat:'crisis',unlock:'necro',check:(g,ev)=>ev.name==='crisis'&&ev.win&&ev.k==='deadmarch'},
 horde:{n:'The Horde broken',d:'End the Great Horde.',icon:'cr-horde',cat:'crisis',check:(g,ev)=>ev.name==='crisis'&&ev.win&&ev.k==='horde'},
 barbarian:{n:'The Emperor falls',d:'End the Barbarian War.',icon:'cr-barbarian',cat:'crisis',check:(g,ev)=>ev.name==='crisis'&&ev.win&&ev.k==='barbarian'},
 eastwar:{n:'On the winning side',d:'Fight for a side in the Eastern War, and see that side win.',icon:'or-ronin',cat:'crisis',unlock:'ronin',
  check:(g,ev)=>ev.name==='east'&&((ev.side==='houses'&&!ev.won)||(ev.side==='east'&&ev.won))},
 /* ---- feats of arms ---- */
 wyvern:{n:'Wyvernbane',d:'Kill a wyvern.',icon:'part-wscale',cat:'feat',check:(g,ev)=>achSlew(ev,/^wyvern/)},
 slayogre:{n:'One spear, one ogre',d:'As the lone Beast Slayer, kill an ogre.',icon:'q-ogre',cat:'feat',check:(g,ev)=>g.origin==='slayer'&&achSlew(ev,/^a?ogre$/)},
 slayent:{n:'Woodcutter of legend',d:'As the lone Beast Slayer, fell an elder ent.',icon:'q-ent',cat:'feat',check:(g,ev)=>g.origin==='slayer'&&achSlew(ev,/^elder$/)},
 isekaicrisis:{n:'Summoned for this',d:'As the hero of The Isekai, end the crisis.',icon:'or-isekai',cat:'feat',check:(g,ev)=>g.origin==='isekai'&&!!g.isekai&&ev.name==='crisis'&&ev.win},
 /* ---- ironman ---- */
 iron30:{n:'No second chances',d:'On an ironman march, reach day 30.',icon:'ironman',cat:'iron',prog:(S,g)=>[g&&g.ironman?Math.min(30,g.day|0):0,30],check:g=>!!g.ironman&&(g.day|0)>=30},
 iron10w:{n:'Iron nerve',d:'On an ironman march, win 10 battles.',icon:'ironman',cat:'iron',prog:(S,g)=>[g&&g.ironman&&g.run?Math.min(10,g.run.won|0):0,10],check:g=>!!g.ironman&&g.run&&(g.run.won|0)>=10},
 ironcrisis:{n:'Iron and fire',d:'On an ironman march, end the crisis.',icon:'ironman',cat:'iron',check:(g,ev)=>!!g.ironman&&ev.name==='crisis'&&ev.win}
};
const ACHK=Object.keys(ACH);

/* ---- the store: {v:1, got:{k:{day, co, t}}, n:{wins, ctr, cv, treat}} ---- */
let ACHS=null;
function achFresh(){return{v:1,got:{},n:{}}}
function achLoad(force){if(ACHS&&!force)return ACHS;let o=null;try{o=JSON.parse(typeof storeGet==='function'?storeGet(ACHKEY)||'null':'null')}catch(e){o=null}
 const S=achFresh();if(o&&typeof o==='object'&&!Array.isArray(o)){
  if(o.got&&typeof o.got==='object')for(const k in o.got)if(ACH[k]){const x=o.got[k]||{};S.got[k]={day:Math.max(0,Math.floor(+x.day||0)),co:typeof x.co==='string'?x.co.slice(0,40):'',t:+x.t||0}}
  if(o.n&&typeof o.n==='object')for(const k in o.n){const v=Math.floor(+o.n[k]);if(isFinite(v)&&v>0)S.n[k]=v}}
 return ACHS=S}
function achSave(){if(!ACHS)return false;return typeof storeSet==='function'?storeSet(ACHKEY,JSON.stringify(ACHS)):false}
function achHas(k){return!!achLoad().got[k]}
function achCount(){return ACHK.filter(achHas).length}
function achList(){const S=achLoad();return ACHK.map(k=>({k,...ACH[k],got:S.got[k]||null}))}
function achGrant(k,quiet){if(!ACH[k])return false;const S=achLoad();if(S.got[k])return false;
 let co='';try{co=G&&typeof companyName==='function'?companyName():''}catch(e){}
 S.got[k]={day:G&&typeof G.day==='number'?G.day|0:0,co:String(co||'').slice(0,40),t:Date.now()};achSave();if(!quiet)achNotify(k);return true}
function achReset(){ACHS=achFresh();achSave()}
// a test and debug hook: every achievement at once (quiet: no notices)
function achGrantAll(quiet){let n=0;for(const k of ACHK)if(achGrant(k,quiet!==false))n++;return n}
function achEvent(name,data){if(!G||typeof G!=='object')return[];const S=achLoad(),ev=Object.assign({name},data||{}),N=S.n;let dirty=false;
 const inc=k=>{N[k]=(N[k]||0)+1;dirty=true};
 if(name==='battle'&&ev.res&&ev.res.win)inc('wins');else if(name==='contract')inc('ctr');else if(name==='caravan')inc('cv');else if(name==='treat')inc('treat');
 if(dirty)achSave();
 if(name==='day'){try{orDay()}catch(e){}}
 const got=[];for(const k of ACHK){if(S.got[k])continue;let ok=false;try{ok=!!ACH[k].check(G,ev,S)}catch(e){ok=false}if(ok&&achGrant(k))got.push(k)}
 return got}

/* ---- the notice: a brass card at the top of the screen, one at a time ---- */
const ACHQ=[];let achQT=0;
const achTimer=(f,ms)=>{const t=setTimeout(f,ms);if(t&&typeof t.unref==='function')t.unref();return t};   // never holds a headless run open
function achUnlockLine(k){const A=ACH[k],O=A&&A.unlock&&ORIGINS[A.unlock];return O?`Unlocks the ${O.n} origin`:''}
function achNotify(k){ACHQ.push(k);if(!achQT)achNext()}
function achNext(){const k=ACHQ.shift();if(!k){achQT=0;const e=achEl();if(e)e.classList.remove('on');return}const A=ACH[k],e=achEl();
 if(e){const u=achUnlockLine(k);e.innerHTML=`${achIc(A.icon,32)}<span><small>Achievement</small><b>${htmlEsc(A.n)}</b>${u?`<em>${achIc(ORIGINS[A.unlock].icon,16)}${htmlEsc(u)}</em>`:`<i>${htmlEsc(A.d)}</i>`}</span>`;e.classList.add('on')}
 achQT=achTimer(()=>{const e2=achEl();if(e2)e2.classList.remove('on');achQT=achTimer(achNext,350)},4200)}
function achEl(){try{if(typeof document==='undefined'||!document.getElementById)return null;let e=document.getElementById('achNote');
  if(!e||!e.classList){e=document.createElement('div');e.id='achNote';e.className='ach-note';e.setAttribute('role','status');e.setAttribute('aria-live','polite');
   e.onclick=()=>{if(typeof achSheet==='function')achSheet()};(document.getElementById('app')||document.body).appendChild(e)}return e}catch(e){return null}}
function achIc(n,s){try{if(typeof pnIcon==='function')return pnIcon(n,'',s||16);if(typeof pic==='function')return pic(n,s||16)}catch(e){}return''}

/* ---- the sheet ---- */
function achClose(){if(typeof mode!=='undefined'&&mode==='title')closeSheet(true);else if(typeof menuSheet==='function')menuSheet();else closeSheet(true)}
function achCard(k){const A=ACH[k],S=achLoad(),got=S.got[k],O=A.unlock&&ORIGINS[A.unlock];let pr='';
 if(!got&&typeof A.prog==='function'){let p=null;try{p=A.prog(S,typeof G==='object'?G:null)}catch(e){p=null}if(p&&p[1]>0){const h=Math.max(0,Math.min(p[0],p[1]));
  pr=`<span class="ach-pr" aria-label="${h} of ${p[1]}"><i style="width:${Math.round(h/p[1]*100)}%"></i></span><small class="ach-pn">${h.toLocaleString('en')} / ${p[1].toLocaleString('en')}</small>`}}
 return`<div class="ach-c${got?' on':''}">${achIc(got?A.icon:A.icon,32)}<div><b>${htmlEsc(A.n)}</b><p>${htmlEsc(A.d)}</p>${pr}
 ${O?`<small class="ach-un">${achIc(O.icon,16)}${got?'Unlocked':'Unlocks'}: ${htmlEsc(O.n)}</small>`:''}${got?`<small class="ach-when">Earned${got.co?' by '+htmlEsc(got.co):''}${got.day?', day '+got.day:''}</small>`:''}</div></div>`}
function achSheet(){const n=achCount(),N=ACHK.length;
 sheet(`<div class="row sp seth"><h2>Achievements</h2><button class="pri" onclick="achClose()">Done</button></div>
<div class="ach-hd">${achIc('ach',32)}<div><b>${n} of ${N} earned</b><span class="ach-pr big"><i style="width:${Math.round(n/N*100)}%"></i></span><small>Kept in this browser for every company you raise, ironman too. Some open a new origin for the next company.</small></div></div>
${ACHCAT.map(([c,cn])=>{const L=ACHK.filter(k=>ACH[k].cat===c);return L.length?`<h3 class="ach-h">${htmlEsc(cn)}</h3><div class="ach-g">${L.map(achCard).join('')}</div>`:''}).join('')}`,'wide ach')}
// the field menu's entry (menuExtra is the hook 90-shell.js already offers the content sheets; wrapped here, loaded before it runs)
{const mx=menuExtra;menuExtra=function(){const h=mx.apply(this,arguments);return h+(typeof mbtn==='function'?mbtn('ach','Achievements',`${achCount()} of ${ACHK.length} earned, and the origins they open`,'closeSheet(true);achSheet()','',''):'')}}

/* ---- origin locks and the setup dialog ---- */
function originUnlocked(k){const O=ORIGINS[k];if(!O)return false;return!(O.lock&&O.lock.ach)||achHas(O.lock.ach)}
function achOrLockBtn(k){const O=ORIGINS[k],A=ACH[O.lock.ach];
 return`<button class="ncs-or ncs-lock" aria-disabled="true" title="Unlock: ${htmlEsc(A?A.n:'')}" onclick="achLockedTap('${k}')">${achIc(O.icon,32)}<b>${htmlEsc(O.n)}</b><small class="ncs-unl">${achIc('ach-lock',16)}${htmlEsc(A?A.n:'Locked')}</small></button>`}
function achLockedTap(k){const O=ORIGINS[k],A=O&&O.lock&&ACH[O.lock.ach];if(!A)return;if(typeof toast==='function')toast(`Locked. Unlock: ${A.n}. ${A.d}`)}

/* ================= THE NEW ORIGINS =================
   Each is a real rule change carried by existing systems: originK keys read elsewhere (xp: battle XP in 68-battle-flow.js; temple:
   injury treatment in 30-mercs.js injuryCost; wage), reputation (evSetRep), G.grace (hours no band falls on the company), the ambush of
   60-battle-core.js (o.ambush: the foe starts unready) and a daily rule (orDay) for the debt and the plague cures. */
function orGift(g,m,res){if(!m)return;if(m.gift&&res&&typeof mercRes==='function'&&mercRes(m)!==res){const o=m.gift;m.trees=(m.trees||[]).filter(t=>t!==o);m.perks=(m.perks||[]).filter(id=>{const P=typeof PERKIX==='object'&&PERKIX[id];if(P&&P.key===o){m.pp=(m.pp||0)+1;return false}return true});m.gift=null}if(m.gift)return;const r=res||(typeof mercRes==='function'&&mercRes(m))||pick(RESK);const gk=giftKey(r,mercStyle(m));if(!gk)return;m.gift=gk;
 if(!Array.isArray(m.trees))m.trees=[];if(!m.trees.includes(gk))m.trees.push(gk);if(typeof syncMast==='function')syncMast(m)}
function orGiftPerk(m){const P=typeof perkOptions==='function'?perkOptions(m).filter(o=>o.kind==='gift'&&o.unlocked&&!o.owned):[];if(P.length&&typeof learnPerk==='function'){m.pp=(m.pp||0)+1;learnPerk(m,P[0].id)}}
function orHostile(g,id){if(!id)return;evSetRep(id,-60);let n=0;while(n++<5&&evTier(id)!=='hostile')evSetRep(id,Math.max(-100,evRepOf(id)-10))}
function orFree(g,v){evSetRep('free',v)}
Object.assign(ORIGINS,{
 necro:{n:'Necromancers',icon:'or-necro',lock:{ach:'deadmarch'},d:'You walked the field after the Dead March and picked up what the Bone Throne dropped: its books. The dead have a great deal to teach.',
  rule:'Every sword carries the mana gift, awakened, and none fears the restless dead (no Superstitious). Battle XP +25%: the dying teach. Temples charge double, and the free towns distrust you (−15).',
  roster:['gravedigger','cultist','hedge','apothecary'],crowns:700,k:{xp:1.25,temple:2}},
 corsairs:{n:'Corsairs',icon:'or-corsairs',lock:{ach:'rich'},d:'Your ship is at the bottom of the bay and the harbour master has your names. What is left: a crew, falchions, and the habit of striking first.',
  rule:'You start at a harbour town. Every fight with a band on the road begins as an ambush: you move first and the foe starts unready (−3 AP). The house that owns the harbour wants you hanged (Hostile).',
  roster:['sailor','sailor','brigand','thief'],crowns:1100,k:{}},
 cultists:{n:'Cultists of the Hollow Star',icon:'or-cultists',lock:{ach:'sunder'},d:'You prayed to the crack in the sky, and something answered. Every one of you came back with a gift. The priests have not forgiven it.',
  rule:'Every sword starts with a gift awakened and one gift perk learned. Temples hate you: treatment costs three times as much. The free towns shun you (−25).',
  roster:['cultist','cultist','flagellant','hedge'],crowns:900,k:{temple:3}},
 sworn:{n:'A noble\'s sellswords',icon:'or-debt',lock:{ach:'renowned'},d:'A lord paid for your steel and your first season. He was generous. His bankers will be less so.',
  rule:'Rich: 4,000 crowns and good armor. But the house of your first town lent it: you owe 6,000 crowns, and 750 leave the purse every 10 days. Miss a payment and that house thinks 25 worse of you and the debt grows 250. Pay it off: +20 with them.',
  roster:['sellsword','sellsword','squire','caravan'],crowns:4000,k:{}},
 plague:{n:'Plague doctors',icon:'or-plague',lock:{ach:'treat10'},d:'Beaked masks, vinegar and a cart of salves. Where the black flag flies over a town, you go in, and you get paid to come out again.',
  rule:'For the first ten days no band falls on you: the masks keep the roads clear (picking a fight yourself ends it). Temples treat you at half price. Every day at a town under plague pays 80 crowns, 3 renown and +2 standing with its owner.',
  roster:['apothecary','apothecary','acolyte','monk'],crowns:800,k:{temple:.5}},
 ronin:{n:'Eastern ronin',icon:'or-ronin',lock:{ach:'eastwar'},d:'Masterless swords from across the eastern sea. Your lord is dead; your blades are not. The Shogunate still owes you its respect.',
  rule:'Eastern steel from the start: katana, naginata, yumi and lamellar. The Shogunate counts you friends (+40); the western houses are wary (−10). Masterless men ask less: wages −15%.',
  roster:['veteran','hedgeknight','monk','hunter'],crowns:900,k:{wage:.85}}
});
ORIGINS.necro.setup=g=>{for(const m of g.roster){orGift(g,m,'mana');orGiftPerk(m);if(Array.isArray(m.traits))m.traits=m.traits.filter(t=>t!=='superstitious');m.hp=evMaxHp(m)}
 orFree(g,-15);g.stash.push('focus')};
ORIGINS.corsairs.setup=g=>{const H=(g.towns||[]).map((t,i)=>({t,i})).filter(o=>Array.isArray(o.t.bld)&&o.t.bld.includes('harbour')&&!o.t.east);
 const t0=g.towns[0],h=H.sort((a,b)=>Math.hypot(a.t.x-t0.x,a.t.y-t0.y)-Math.hypot(b.t.x-t0.x,b.t.y-t0.y)||a.i-b.i)[0];
 if(h){const t=h.t;g.p={x:t.x,y:typeof okAt==='function'&&okAt(t.x,t.y+.65*TS)?t.y+.65*TS:t.y};g.evt.flags.port=h.i;
  if(typeof fogRevealAt==='function'&&typeof W!=='undefined'&&W){try{fogRevealAt(t.x,t.y,9.5*TS);W.fogKey=-1;fogReveal()}catch(e){}}}
 const own=h&&g.houses&&g.houses.find(x=>x.id===h.t.own),H2=own||evStartHouse(g);if(H2){orHostile(g,H2.id);g.evt.flags.wanted=H2.id}
 for(const m of g.roster)if(m.bg==='sailor'&&ITEMS.falchion)evGear(m,['falchion'])};
ORIGINS.cultists.setup=g=>{for(const m of g.roster){orGift(g,m);orGiftPerk(m);m.hp=evMaxHp(m)}orFree(g,-25)};
ORIGINS.sworn.setup=g=>{const R=g.roster;if(R[0])evGear(R[0],['mail','arming','heater','nasal']);if(R[1])evGear(R[1],['mail','coif']);if(R[2])evGear(R[2],['brigandine','cap']);if(R[3])evGear(R[3],['brigandine']);
 const H=evStartHouse(g,true);const F=g.evt.flags;F.debt=6000;F.debtH=H?H.id:'free';F.debtNext=(g.day|0)+10;if(H)evSetRep(H.id,15)};
ORIGINS.plague.setup=g=>{g.grace=Math.max(g.grace||0,240);g.salve=(typeof g.salve==='number'?g.salve:2)+4};
ORIGINS.ronin.setup=g=>{const R=g.roster,K=[['katana','do','kabuto'],['naginata','tatami','jingasa'],['bo','kesa','hachigane'],['tanto','kesa','hachigane']];
 R.forEach((m,i)=>{evGear(m,m.bg==='hunter'?['yumi','kesa','hachigane']:K[i]||K[3]);if(m.bg==='hunter'&&ITEMS.tanto&&!m.eq.b){m.eq.b='tanto';if(typeof fixHands==='function')fixHands(m)}});
 if(R[0])R[0].hp=evMaxHp(R[0]);if(g.rep&&'east' in g.rep||g.east)evSetRep('east',40);if(Array.isArray(g.houses))for(const h of g.houses)evSetRep(h.id,-10)};
/* ---- the daily rules (achEvent 'day', from newDay) ---- */
const ORDEBT={every:10,pay:750,miss:25,grow:250,done:20};
function orDay(){if(!G||!G.evt||!G.evt.flags)return;const F=G.evt.flags;
 if(G.origin==='sworn'&&typeof F.debt==='number'&&F.debt>0&&(G.day|0)>=(F.debtNext|0)){const due=Math.min(ORDEBT.pay,F.debt),h=F.debtH,hn=typeof evFacName==='function'?evFacName(h):h;F.debtNext=(G.day|0)+ORDEBT.every;
  if(G.crowns>=due){G.crowns-=due;F.debt-=due;if(F.debt<=0){F.debt=0;F.debtDone=G.day|0;if(h&&h!=='free')evSetRep(h,evRepOf(h)+ORDEBT.done);orNews(`The debt to ${hn} is paid in full`,'coin')}else orNews(`Paid ${due} crowns on the debt to ${hn}: ${F.debt} left`)}
  else{F.debt+=ORDEBT.grow;F.missed=(F.missed|0)+1;if(h&&h!=='free')evSetRep(h,evRepOf(h)-ORDEBT.miss);orNews(`Missed a payment to ${hn}: the debt grows to ${F.debt}`,'coin')}}
 if(G.origin==='plague'&&Array.isArray(G.towns)&&G.towns.length&&typeof nearestTown==='function'){const i=nearestTown(G.p.x,G.p.y),t=G.towns[i];
  if(t&&Math.hypot(t.x-G.p.x,t.y-G.p.y)<=1.6*TS&&typeof townSit==='function'&&townSit(i,'plague')){G.crowns+=80;G.renown=(G.renown||0)+3;F.cures=(F.cures|0)+1;if(t.own)evSetRep(t.own,evRepOf(t.own)+2);orNews(`The doctors work the streets of ${t.name}: +80 crowns`)}}}
function orNews(t,ic){try{if(typeof worldNews==='function')worldNews(t)}catch(e){}if(ic&&typeof document!=='undefined'){const e=achEl();if(e&&!achQT){e.innerHTML=`${achIc(ic,32)}<span><small>The debt</small><b>${htmlEsc(t)}</b></span>`;e.classList.add('on');achQT=achTimer(()=>{e.classList.remove('on');achQT=achTimer(achNext,350)},3600)}}}
/* the corsairs' ambush: every fight with a band on the road (not a rival company, a caravan, a crisis boss or a fixed fight) */
function orAmbush(o){if(!o||typeof o!=='object'||!G||G.origin!=='corsairs')return false;const s=o.src||{};
 if(s.type!=='party'||o.rival||o.cv||o.boss||o.fixedRoster||s.goal==='caravan'||s.goal==='merc')return false;o.ambush=1;return true}
{const sb=startBattle;startBattle=function(o){try{orAmbush(o)}catch(e){}return sb.apply(this,arguments)}}

/* ---- icons: 16 px pixel art (Detail Low) and painted art (Detail High) ---- */
(function(){if(typeof ICONS!=='object'||!ICONS||typeof _icOutline!=='function')return;const P=r=>r.map(x=>(x+'................').slice(0,16)).concat(Array(16).fill('................')).slice(0,16);
 const S={
 'or-necro':['................','.....llllll.....','....llllllll....','...lllllllllm...','...llllllllmm...','...l00ll00lmm...','...l0Cll0Clm....','...lllllllmm....','....lll00lm.....','....lmlmlmm.....','.....m.m.m......','.....DDDDDD.....','....DCCCCCCD....','.....DDDDDD.....'],
 'or-corsairs':['.......pp.......','......p..p......','......p..p......','.......pp.......','....qqqqqqqq....','.......qp.......','.......qp.......','.......qp.......','.q.....qp.....q.','.qq....qp....qq.','..qq...qp...qq..','...qqq.qp.qqq...','....qqqqqqqq....','......qqqq......'],
 'or-cultists':['.......cc.......','......cddc......','......cddc......','.....cd..dc.....','.....cd..dc.....','....cd.CC.dc....','....cdCDDCdc....','...cdCDrrDCdc...','...cd.CDDC.dc...','..cd...CC...dc..','..cd........dc..','.cddddddddddddc.','.cccccccccccccc.'],
 'or-debt':['................','..pp............','.p..p...cccc....','.p..p..cddddc...','..pp..cddbbddc..','...pp.cdbddbdc..','..p..pcdbddbdc..','..p..pcddbbddc..','...pp..cddddc...','........cccc....','..cccccccccc....','..bbbbbbbbbb....','..cccccccccc....','..bbbbbbbbbb....'],
 'or-plague':['................','.....iiiiii.....','....ijjjjjji....','...ijjjjjjjji...','...ijFFjjFFji...','...ijFFjjFFji...','...ijjjjjjjjjk..','....ijjjjjjjjkk.','.....ijjjjjjjkkk','......iijjjjkkk.','........iiikk...','.........ii.....'],
 'or-ronin':['................','.........ggg...q','........ggggg.qr','........gggg.qr.','.........gg.qr..','...........qr...','..........qr....','.........qr.....','........qr......','.......cc.......','......jcc.......','.....jj.........','....jj..........','...jj...........'],
 ach:['................','...cccccccccc...','..ccddddddddcc..','.c.cddeeddddc.c.','.c.cddeddddbc.c.','..ccddddddbcc...','....cdddddb.....','.....cdddb......','......cdb.......','.......c........','......bcb.......','.....bbbbb......','....cccccccc....','....bbbbbbbb....'],
 'ach-lock':['................','......pppp......','.....p....p.....','....p......p....','....p......p....','...cccccccccc...','...cddddddddc...','...cddd00dddc...','...cddd00dddc...','...cdddd0dddc...','...cddddddddc...','...bbbbbbbbbb...']};
 for(const n in S){ICONS[n]=_icOutline(P(S[n]));if(typeof icCss==='function')icCss(n)}})();
if(typeof PAINT==='object'&&PAINT&&typeof pkFill==='function'){
 PAINT['or-necro']=g=>{pkGlow(g,16,25,11,'#b98cf0',.55);pkHaft(g,25,5,25,30,2.4,'darkwood');pkGem(g,25,4.6,3.2,'void');pkSkull(g,14,15,1.05,'bone');
  pkFill(g,pkEll(14,27.5,8,2.4),'purple',{k:.6})};
 PAINT['or-corsairs']=g=>{pkFill(g,pkS('M16 3 A3.6 3.6 0 1 1 15.99 3 Z M16 5.4 A1.4 1.4 0 1 0 16.01 5.4 Z'),'iron',{k:.8,rule:'evenodd'});pkHaft(g,16,9,16,28,3,'iron');
  pkFill(g,pkRect(9,10,14,2.8,1.2),'iron',{k:.8});pkFill(g,pkS('M4 18 L7 16 Q8 25 16 28.5 Q24 25 25 16 L28 18 Q27 29 16 31 Q5 29 4 18 Z'),'iron',{k:1.1})};
 PAINT['or-cultists']=g=>{pkGlow(g,16,18,13,'#b98cf0',.5);pkFill(g,pkS('M16 2 L30 29 L2 29 Z'),'gold',{k:1.2,inside:(g,m)=>{pkFill(g,pkS('M16 9 L25.5 26.5 L6.5 26.5 Z'),'dark',{k:.6,noRim:1})}});
  pkFill(g,pkEll(16,20,6,3.6),'vellum',{k:.6});pkFill(g,pkCirc(16,20,2.6),'void',{k:.5,ball:1});g.fillStyle=PK.ink;g.fill(pkCirc(16,20,1.1).p)};
 PAINT['or-debt']=g=>{for(const y of [27,23.5,20])pkFill(g,pkEll(12,y,9,3),'gold',{k:.7});pkCoin(g,21,11,7.5,'gold',null);
  pkLine(g,'M3 5 Q6 2 8 5 Q10 8 7 10 Q4 12 6 15',2,'#5f6b76',1);pkLine(g,'M3 5 Q6 2 8 5 Q10 8 7 10 Q4 12 6 15',.8,'#c6d2de',.9)};
 PAINT['or-plague']=g=>{pkFill(g,pkS('M5 6 Q5 2 13 2 Q21 2 22 8 L31 20 Q30 23 27 22 L19 19 Q14 25 8 22 Q4 19 5 6 Z'),'leather',{k:1.4,inside:(g,m)=>{
   for(const x of [10,17]){pkFill(g,pkCirc(x,10,3),'frost',{k:.5,ball:1})}pkLine(g,'M7 17 Q12 19 18 17',.8,m[1],.8)}});pkFill(g,pkRect(4,1.5,19,3,1.2),'dark',{k:.6})};
 PAINT['or-ronin']=g=>{pkFill(g,pkCirc(19,12,9),'madder',{k:.8,ball:1});pkSword(g,9,24,45,{len:23,w:3.4,guard:5.5,grip:6.5})};
 PAINT.ach=g=>{pkGlow(g,16,12,12,'#ffd95a',.45);pkFill(g,pkS('M7 3 L25 3 L24 10 Q23 18 16 19.5 Q9 18 8 10 Z'),'gold',{k:1.2});pkLine(g,'M7 6 Q2 6 3 10 Q4 14 9 14 M25 6 Q30 6 29 10 Q28 14 23 14',1.8,'#a26800',1);
  pkFill(g,pkRect(14.4,19,3.2,5,.6),'gold',{k:.6});pkFill(g,pkRect(9,24,14,5,1.2),'darkwood',{k:.8});pkStar(g,16,10,4,'white',5,.45)};
 PAINT['ach-lock']=g=>{pkFill(g,pkS('M9 15 L9 10 Q9 3 16 3 Q23 3 23 10 L23 15 L20 15 L20 10 Q20 6 16 6 Q12 6 12 10 L12 15 Z'),'iron',{k:.9});
  pkFill(g,pkRect(6,14,20,15,2),'brass',{k:1.2,inside:(g,m)=>{g.fillStyle=PK.ink;g.fill(pkCirc(16,20,2.2).p);g.fill(pkRect(15,20,2,5,.5).p)}})};
}
