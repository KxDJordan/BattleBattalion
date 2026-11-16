/* ================= ENDGAME: portal worlds, dungeons, realm rules (Phase 8B, endgame agent) =================
   The owner's rule: every fight here is a fixed, hand-authored roster (startBattle's o.roster, 60-battle-core.js). Nothing about the
   company (size, level, renown, day, power) ever reaches the enemy side; only the player's own difficulty (diffK('budget')) moves it, flat.
   The rosters are tuned so a well-built late company (12 swords of level 11-13 in tier 4-5 gear, the balance harness's L12x12 profile)
   wins each fight about 50-65% of the time with the sensible pilot on Normal (test/endgame.js measures it). A weaker company should not go yet.

   Realm rules (REALMR, read by the battle rules through B.realm = realmOf(o.realm)):
     ashen   noRegen (no hitpoint regeneration of any kind), healK .5 (heals do half), burning ground: fire.start of the open tiles burn
             from the first round (hazard tiles, 12 a turn), and every fire.every rounds the fire spreads (fire.add tiles next to the
             burning) and dies down elsewhere (fire.out tiles)
     hollow  sight: no shot or spell reaches farther (abilityInfo caps a.rng), shifting ground: every shift.every rounds shift.n stones
             rise from open ground and as many sink (never under a unit, never on the deployment rows; the field stays connected)
     glass   spellK: every spell strikes harder (spellMult, so the forecast shows it), backlash: each spell burns its caster for that share
             of its max hitpoints (realmBacklash, both sides)
   realmOf(k) -> REALMR[k] | null;  realmTiles(tiles,k) (seeded, from battlePreview: the preview is the battle);  realmStart(b) (the HUD chip);
   realmRound(b) (round start, seeded);  realmBacklash(u,a);  realmLines(k) -> [[title, text]] for sheets, the deployment screen and the HUD.

   Portal worlds (ENDGAME[realm] = {n, d, fights:{key:{n, roster, boss?, elite?}}, battle:[keys], elite:[keys], boss:key, treasure, event, loot}):
     G.portalRun = {id (the portal), realm, seed, nodes:[{k:'battle'|'elite'|'rest'|'treasure'|'event'|'boss', edges:[node index], fight (a key
       of ENDGAME[realm].fights, battles only), done, L (layer), j (row)}], at (the node the company stands on, -1 at the gate), path:[indices],
       day, spoils:{crowns, items:[ids]}}
     portalGen(portal) builds the map from a private stream (G.seed and the portal id: no game randomness drawn, the same map every time):
     4 layers + the boss, 5-7 nodes, branching. portalBegin(id) starts it, portalCan(i) / portalGo(i) step onto a node (a fight opens a
     battle; rest / treasure / event resolve on the map), portalRetreat() leaves (RETREATK: a tenth of the crowns and 15% of every sword's
     hitpoints), a lost fight throws the company out. The boss closes the rift (the crisis's closed count, as the old three-battle run did).
   Dungeons (DUNGEONS[id] = {n, d, kind:'barrow'|'lair'|'keep'|'grove', f, biome, fights:[{n, d, roster, boss?}], loot:[legendary ids], danger, art}):
     G.dungeons = [{id (site id), k (DUNGEONS key), x, y, stage (fights won), cleared, day}] and a G.sites entry {id, kind:'dgn'|'dgnc', n: art
     variant} that the world map draws. dungeonDay() (worldDay) opens them over time: the first on DGN.first, then one every DGN.every days,
     at most DGN.cap(day) (2 before day 40, 4 before day 64, then 6). dungeonSheet(id) / dungeonEnter(id) / dungeonFall(id).
   Rewards: legendFor({k:'portal'|'dungeon', id, loot}) + legendGrant (the legend agent, 25-legend.js), DGNFALL when it is not there; deedAdd(m,k)
   ('portal' for every sword standing when a portal boss falls, 'dungeon' for every sword fielded in a dungeon's last fight, 'bane' for the killing blow on an endgame elite or boss). egRepair(g) validates the saves. */
const REALMR={
 ashen:{k:'ashen',n:'The Ashen Reach',noRegen:1,healK:.5,fire:{start:.08,every:3,add:4,out:2},
  rules:[['No mending','Nothing regenerates here, and every heal does half.'],['Burning ground','Embers cover the field and spread every third round.']]},
 hollow:{k:'hollow',n:'The Hollow',sight:5,shift:{every:3,n:3},
  rules:[['Darkness','No shot or spell reaches beyond 5 tiles.'],['Shifting ground','Every third round stones rise and sink.']]},
 glass:{k:'glass',n:'The Glass Wastes',spellK:1.3,backlash:.08,
  rules:[['Mana storms','Every spell strikes 30% harder.'],['Backlash','Each spell burns its caster for 8% of their hitpoints.']]}};
function realmOf(k){return typeof k==='string'&&REALMR[k]?REALMR[k]:null}
function realmLines(k){const R=realmOf(k);return R?R.rules.map(r=>r.slice()):[]}
// a portal realm's ground: the Ashen Reach starts burning (seeded rnd, called once from battlePreview)
function realmTiles(tiles,k){const R=realmOf(k);if(!R||!R.fire)return tiles;for(let r=0;r<BH;r++)for(let c=0;c<BW;c++){if(spawnRow(r))continue;const t=tiles[key(c,r)];if(t.t==='ground'&&rnd()<R.fire.start)t.t='haz'}return tiles}
function realmStart(b){egChip(b);if(!b||!b.realm)return;const R=b.realm;say(`${R.n}: ${R.rules.map(r=>r[0].toLowerCase()).join(', ')}.`)}
// the tiles a shift may touch: off the deployment rows, nobody standing there
function egFree(b,k){const c=k%BW,r=(k/BW)|0;return!spawnRow(r)&&!unitAt(c,r)}
function realmRound(b){const R=b&&b.realm;if(!R||b.round<2)return;
 if(R.fire&&(b.round-1)%R.fire.every===0){const T=b.tiles.slice(),hz=[],nb=[];
  for(let k=0;k<T.length;k++){const t=T[k];if(t.t==='haz')hz.push(k);else if(t.t==='ground'&&egFree(b,k)){const c=k%BW,r=(k/BW)|0;if(DIRS.some(([a,d])=>inb(c+a,r+d)&&T[key(c+a,r+d)].t==='haz'))nb.push(k)}}
  for(let i=0;i<R.fire.out&&hz.length;i++){const k=hz.splice(Math.floor(rnd()*hz.length),1)[0];T[k]=Object.assign({},T[k],{t:'ground'})}
  for(let i=0;i<R.fire.add&&nb.length;i++){const k=nb.splice(Math.floor(rnd()*nb.length),1)[0];T[k]=Object.assign({},T[k],{t:'haz'})}
  b.tiles=T;say('The embers spread across the ash.');FX.emit('realm',{k:R.k,round:b.round,what:'fire'})}
 if(R.shift&&(b.round-1)%R.shift.every===0){const T=b.tiles.slice(),bl=[],gr=[];
  for(let k=0;k<T.length;k++){if(!egFree(b,k))continue;if(T[k].t==='block')bl.push(k);else if(T[k].t==='ground')gr.push(k)}
  for(let i=0;i<R.shift.n&&bl.length;i++){const k=bl.splice(Math.floor(rnd()*bl.length),1)[0];T[k]=Object.assign({},T[k],{t:'ground'})}
  for(let i=0;i<R.shift.n&&gr.length;i++){const k=gr.splice(Math.floor(rnd()*gr.length),1)[0];T[k]=Object.assign({},T[k],{t:'block'})}
  openBattleMap(T);b.tiles=T;say('The ground of the Hollow shifts.');FX.emit('realm',{k:R.k,round:b.round,what:'shift'})}
 egChip(b)}
function realmBacklash(u,a){const R=B&&B.realm;if(!R||!R.backlash||!u||!u.alive)return;const n=Math.max(3,Math.round(u.hpMax*R.backlash));float(u,'Backlash','#8fd8ff');hurt(u,n,1,null,{pierce:1})}
// the realm chip on the battle HUD (#bLeft): the realm's name and its rules, the next shift or spread
function egChip(b){if(typeof document==='undefined'||!document.getElementById)return;let el=document.getElementById('brealm');const R=b&&b.realm;
 if(!el){if(!R)return;const L=document.getElementById('bLeft');if(!L||!L.insertBefore)return;el=document.createElement('div');el.id='brealm';el.setAttribute('role','status');L.insertBefore(el,L.firstChild)}
 if(!R){el.className='hidden';el.innerHTML='';return}
 const ev=R.fire?R.fire.every:R.shift?R.shift.every:0,nx=ev?(b.round<1?1+ev:b.round+ev-((b.round-1)%ev)):0;
 el.className='eg-chip eg-'+R.k;el.title=R.rules.map(r=>r[0]+': '+r[1]).join(' ');el.innerHTML=`<b>${R.n}</b><span>${R.rules.map(r=>`<i>${r[0]}</i>`).join(' · ')}</span><span class="eg-cd">${R.rules.map(r=>r[1]).join(' ')}</span>${nx?`<em>${R.fire?'The fire spreads':'The ground shifts'} on round ${nx}</em>`:''}`}

/* ---------- roster shorthand: [id, n, lvl, elite?, name?, hpK?] -> {id, n, lvl, elite, name, hpK} ---------- */
function egR(L){return L.map(x=>Array.isArray(x)?{id:x[0],n:x[1]==null?1:x[1],lvl:x[2]||1,elite:x[3]?1:0,name:x[4]||null,hpK:x[5]||0}:x)}
const egBoss=(id,name,title,phases,er)=>({id,name,title,phases,enrageRound:er||0});
/* ---------- portal worlds ---------- */
const EGDANGER='Made for a company of veterans: twelve swords of level 11 to 13 in their best steel. Fewer, or greener, will not come back.';
const ENDGAME={
 ashen:{n:'The Ashen Reach',f:'void',danger:EGDANGER,d:'A world that burned and never cooled. Cinders fall like snow; the riftspawn here are born in the fire.',
  fights:{
   cinders:{n:'Cinder pickets',roster:egR([['vknight',3,13.5],['imp',6,13.5],['vmage',2,13.5]])},
   ashwalk:{n:'The ash-walkers',roster:egR([['barbz',4,14.25],['vknight',2,12.25],['imp',4,12.25],['vmage',2,12.25]])},
   pyre:{n:'The burning pyre',roster:egR([['obrute',3,13.9],['imp',5,12.9],['vmage',3,12.9]])},
   embers:{n:'Ember guard',elite:1,roster:egR([['vknight',4,10.5,1],['vmage',3,9.5],['imp',4,9.5]])},
   furnace:{n:'The furnace host',elite:1,roster:egR([['obrute',3,11.5,1],['vknight',2,11.5],['vmage',3,10.5],['imp',3,10.5]])},
   throne:{n:'The Cinder Throne',boss:egBoss('tyrant','Vael the Cinder King','Tyrant of the Ashen Reach',[{at:.66,n:'The pyre wakes',say:'Vael spreads his hands: the ash blazes up.',summon:['imp','imp']},{at:.33,n:'King of cinders',say:'Vael burns brighter as he bleeds.',enrage:{dmg:.25,ms:8}}],9),
    roster:egR([['tyrant',1,10.6,0,'Vael the Cinder King',1.4],['vknight',3,12.6],['vmage',2,11.6],['imp',3,11.6]])}},
  battle:['cinders','ashwalk','pyre'],elite:['embers','furnace'],boss:'throne',
  treasure:{crowns:500,items:['dwarfaxe','runeblade','zweihander','steeltower']},loot:['lg:kingsblade','lg:worldhammer','lg:aegisplate'],
  event:{n:'The cinder pilgrim',d:'A figure of living ash kneels by the path and offers to burn away what weighs on your swords.',
   a:['Take the burning','Every sword gains 150 experience and loses a fifth of its hitpoints.'],b:['Refuse him','Nothing changes.']}},
 hollow:{n:'The Hollow',f:'void',danger:EGDANGER,d:'A dark that moves. The ground forgets its shape; the dead of a hundred worlds wander in it.',
  fights:{
   gloom:{n:'Gloom stalkers',roster:egR([['imp',6,14],['gknight',3,14],['vmage',2,14]])},
   barrowmen:{n:'The barrow-men',roster:egR([['gknight',3,13.75],['skelhal',4,14.75],['necro',2,13.75],['imp',3,12.75]])},
   echo:{n:'Echoes in the dark',roster:egR([['vknight',3,11.95],['imp',5,11.95],['vmage',3,11.95]])},
   lanterns:{n:'The lantern-wardens',elite:1,roster:egR([['gknight',4,11.5,1],['vmage',3,10.5],['imp',3,10.5]])},
   shades:{n:'The shade court',elite:1,roster:egR([['vknight',3,13.75,1],['necrolt',1,12.75],['skelhal',4,13.75],['imp',3,12.75]])},
   maw:{n:'The Maw of the Hollow',boss:egBoss('tyrant','Ossuar the Unlit','Tyrant of the Hollow',[{at:.66,n:'Lights out',say:'Ossuar swallows the last light: the dead stir.',summon:['skel','skel']},{at:.33,n:'The dark hungers',say:'Ossuar drinks the dark and grows.',heal:.12,enrage:{dmg:.2}}],9),
    roster:egR([['tyrant',1,11.5,0,'Ossuar the Unlit',1.4],['gknight',3,13.5],['vmage',2,12.5],['imp',3,12.5]])}},
  battle:['gloom','barrowmen','echo'],elite:['lanterns','shades'],boss:'maw',
  treasure:{crowns:500,items:['bardiche','estoc','plate','greathelm']},loot:['lg:shadowweave','lg:dreadcrown','lg:lastmercy'],
  event:{n:'A voice in the dark',d:'Something in the Hollow knows your names. It offers the way through, for a price in blood.',
   a:['Pay in blood','Every sword loses a quarter of its hitpoints; the next fight\'s foes start the battle unready.'],b:['Walk on','Nothing changes.']}},
 glass:{n:'The Glass Wastes',f:'void',danger:EGDANGER,d:'A desert of violet glass under a storming sky. Mana falls here like rain, and burns like it too.',
  fights:{
   shards:{n:'Shard-runners',roster:egR([['imp',6,13.25],['vmage',3,13.25],['vknight',2,13.25]])},
   storm:{n:'The storm-callers',roster:egR([['vmage',4,11.5],['vknight',3,10.5],['imp',3,10.5]])},
   prism:{n:'Prism guard',roster:egR([['vknight',4,13],['imp',4,13],['vmage',2,13]])},
   seers:{n:'The glass seers',elite:1,roster:egR([['vmage',4,10,1],['vknight',3,9],['imp',3,9]])},
   colossus:{n:'The shattered legion',elite:1,roster:egR([['vknight',4,10.4,1],['vmage',3,9.4],['imp',4,9.4]])},
   eye:{n:'The Eye of the Storm',boss:egBoss('tyrant','Ixa the Glass Tyrant','Tyrant of the Glass Wastes',[{at:.66,n:'The storm breaks',say:'Ixa raises the storm: glass rains on the field.',summon:['imp','imp']},{at:.33,n:'Mana-drunk',say:'Ixa drinks the storm.',enrage:{dmg:.3,ms:6}}],9),
    roster:egR([['tyrant',1,10,0,'Ixa the Glass Tyrant',1.4],['vmage',3,12],['vknight',2,11],['imp',3,11]])}},
  battle:['shards','storm','prism'],elite:['seers','colossus'],boss:'eye',
  treasure:{crowns:500,items:['focus','arbalest','warbow','sigilrobe']},loot:['lg:starweaver','lg:skyrender','lg:mirrorshield'],
  event:{n:'The singing glass',d:'A spire of glass hums with the storm. Those with a gift could drink from it, if they dare.',
   a:['Drink from the spire','Every awakened caster gains 300 experience and loses half its hitpoints.'],b:['Leave it be','Nothing changes.']}}};
const PORTALK={rest:.35,retreat:{crowns:.1,hp:.15},pay:900};
// a private stream for one portal's map: the world seed and the portal id (never the game's rnd)
function egStream(salt){return mulberry((((G&&G.seed)|0)^Math.imul((salt|0)+7,2654435761)^0x51ed270b)>>>0)}
function egPick(r,L){return L[Math.floor(r()*L.length)%L.length]}
function portalGen(p){const E=ENDGAME[p.realm]||ENDGAME.hollow,r=egStream(p.id*31+((p.realm||'').length)),sizes=[r()<.3?1:2,2,r()<.5?1:2,1],nodes=[],bat=E.battle.slice(),eli=E.elite.slice();
 const take=L=>L.length>1?L.splice(Math.floor(r()*L.length),1)[0]:L[0];
 for(let L=0;L<4;L++)for(let j=0;j<sizes[L];j++){let k;
  if(L===3)k='boss';else if(L===0)k=sizes[0]===2&&j===1&&r()<.4?'event':'battle';
  else if(L===1)k=j===0?'elite':egPick(r,['treasure','battle','event']);else k=sizes[2]===1||j===0?'rest':egPick(r,['battle','treasure']);
  const n={k,edges:[],done:false,L,j};if(k==='battle')n.fight=take(bat.length?bat:E.battle.slice());else if(k==='elite')n.fight=take(eli.length?eli:E.elite.slice());else if(k==='boss')n.fight=E.boss;nodes.push(n)}
 const lay=L=>nodes.map((n,i)=>n.L===L?i:-1).filter(i=>i>=0);
 for(let L=0;L<3;L++){const A=lay(L),Bn=lay(L+1),flip=r()<.5;
  if(A.length===1||Bn.length===1)A.forEach(i=>Bn.forEach(t=>nodes[i].edges.push(t)));
  else{A.forEach((i,a)=>{nodes[i].edges.push(Bn[a]);if((a===0)!==flip)nodes[i].edges.push(Bn[1-a])})}}
 return{id:p.id,realm:E===ENDGAME[p.realm]?p.realm:'hollow',seed:p.id,nodes,at:-1,path:[],day:G?G.day|0:1,spoils:{crowns:0,items:[]}}}
// the nodes the company may step onto next
function portalNext(run){run=run||G.portalRun;if(!run)return[];if(run.at<0)return run.nodes.map((n,i)=>n.L===0?i:-1).filter(i=>i>=0);const n=run.nodes[run.at];return n&&n.done?n.edges.slice():[]}
function portalCan(i){const run=G&&G.portalRun;return!!run&&portalNext(run).includes(i)&&!run.nodes[i].done}
function portalOf(id){return(G.portals||[]).find(p=>p.id===id)||null}
function portalBegin(id){const p=portalOf(id);if(!p)return null;if(!G.portalRun||G.portalRun.id!==id)G.portalRun=portalGen(p);G.dun=null;return G.portalRun}
// the battle options of a fight node (or of any fight key): the fixed roster, the realm, the boss
function portalFightOpts(realm,fk,i){const E=ENDGAME[realm],F=E&&E.fights[fk];if(!F)return null;const o={f:E.f,roster:F.roster.map(e=>Object.assign({},e)),realm,biome:realm,src:{type:'portal',i,fight:fk},fixedRoster:1};
 if(F.boss)o.boss=Object.assign({},F.boss,{phases:F.boss.phases.map(p=>Object.assign({},p))});return o}
// Rules: step onto node i. A fight returns {kind:'fight', o} (and opens the battle unless quiet); rest / treasure return what happened; event {kind:'event'}.
function portalGo(i,quiet){const run=G.portalRun;if(!run||!portalCan(i))return null;const n=run.nodes[i];run.at=i;run.path.push(i);
 if(n.k==='battle'||n.k==='elite'||n.k==='boss'){const o=portalFightOpts(run.realm,n.fight,i);if(run.unready){o.ambush=1;run.unready=0}if(!quiet){egMapHide();G.moving=false;G.route=[];engage(o)}return{kind:'fight',o}}
 if(n.k==='rest'){n.done=true;const L=[];G.roster.forEach(m=>{const mx=calc(m).hp,h0=m.hp;m.hp=Math.min(mx,m.hp+Math.round(mx*PORTALK.rest));if(m.hp>h0)L.push(m.name)});return{kind:'rest',n:L.length}}
 if(n.k==='treasure'){n.done=true;const E=ENDGAME[run.realm],r=egStream(run.id*97+i),id=egPick(r,E.treasure.items),c=E.treasure.crowns;G.crowns+=c;if(ITEMS[id])G.stash.push(id);run.spoils.crowns+=c;if(ITEMS[id])run.spoils.items.push(id);return{kind:'treasure',crowns:c,item:ITEMS[id]?id:null}}
 if(n.k==='event')return{kind:'event'};return null}
// Rules: the event's answer (a: take it, else pass). No randomness.
function portalEvent(take){const run=G.portalRun;if(!run||run.at<0)return null;const n=run.nodes[run.at];if(!n||n.k!=='event'||n.done)return null;n.done=true;if(!take)return{taken:false};
 if(run.realm==='ashen')G.roster.forEach(m=>{gainXP(m,150);m.hp=Math.max(1,m.hp-Math.round(calc(m).hp*.2))});
 else if(run.realm==='hollow'){G.roster.forEach(m=>{m.hp=Math.max(1,m.hp-Math.round(calc(m).hp*.25))});run.unready=1}
 else G.roster.forEach(m=>{if(m.gift&&typeof giftAwake==='function'&&giftAwake(m)&&MAST[m.gift]&&MAST[m.gift].style==='caster'){gainXP(m,300);m.hp=Math.max(1,Math.round(m.hp/2))}});
 return{taken:true}}
// Rules: leave the portal world between nodes. The way back burns: PORTALK.retreat of the crowns and of every sword's hitpoints. The rift stays open.
function portalRetreat(){const run=G.portalRun;if(!run)return null;const c=Math.floor(G.crowns*PORTALK.retreat.crowns);G.crowns-=c;G.roster.forEach(m=>{m.hp=Math.max(1,m.hp-Math.round(calc(m).hp*PORTALK.retreat.hp))});G.portalRun=null;return{crowns:c}}
// Rules (settleBattle, 68-battle-flow.js): a portal fight ended. {kind:'portalNext'|'portalDone'|'portalLost', ...}
function portalSettle(s,win,res){const run=G.portalRun;if(!run)return{kind:'world',toast:null};const n=run.nodes[s.i];
 if(!win||!n){G.portalRun=null;return{kind:'portalLost',realm:run.realm}}
 n.done=true;if(n.k!=='boss'){if(n.k==='elite'){const c=350;G.crowns+=c;run.spoils.crowns+=c}return{kind:'portalNext',realm:run.realm,node:n.k}}
 // the boss: the rift closes
 const p=portalOf(run.id),pay=Math.round(PORTALK.pay*(typeof originK==='function'?originK('rift'):1));G.crowns+=pay;G.renown+=50;G.stash.push('riftedge');
 const E=ENDGAME[run.realm]||{},leg=egLegend('portal',run.realm,E.loot,(res&&res.boss&&res.boss.name)||E.n);
 const alive=new Set((res&&res.men||[]).filter(r=>r.state==='ok').map(r=>r.id)),deeds=[];for(const m of G.roster)if(alive.has(m.id)){egDeed(m,'portal');deeds.push(m.name)}
 if(typeof ambEvent==='function')ambEvent('rift');if(typeof achEvent==='function')achEvent('rift');G.portals=G.portals.filter(q=>q.id!==run.id);G.portalRun=null;G.dun=null;let ended=false;
 if(G.crisis){G.crisis.closed++;if(!G.crisis.ended&&G.crisis.closed>=G.crisis.total){ended=true;if(typeof crisisEnd==='function'){try{crisisEnd(true)}catch(e){G.crisis.ended=true}}else G.crisis.ended=true;G.crisis.ended=true}}
 if(typeof worldNews==='function'){try{worldNews(`${G.name||'A company'} closed the rift to ${(ENDGAME[run.realm]||{}).n||'another world'}`)}catch(e){}}
 return{kind:'portalDone',realm:run.realm,pay,ended,legend:leg,deeds,boss:res&&res.boss?res.boss.name:''}}
/* ---------- the legend agent's hooks (25-legend.js), guarded ---------- */
// a legendary drop: legendFor({k, id, loot}) picks (one rnd draw, never a duplicate), legendGrant records it and puts it in the stash
function egLegend(k,id,loot,from){if(typeof legendFor!=='function')return null;let x=null;try{x=legendFor({k,id,loot:(loot||[]).slice()})}catch(e){x=null}if(typeof x!=='string'||!ITEMS[x])return null;
 if(typeof legendGrant==='function'){try{return legendGrant(x,{from})}catch(e){}}G.stash.push(x);return x}
// 'bane': the killing blow on an endgame elite or boss (an elite-marked or boss unit of a fixed-roster battle)
function egBane(b){if(!b||!b.fixedSide)return[];const out=[];for(const u of b.units){if(u.side!==1||u.alive||!(u.elite||u.boss)||!u.killer)continue;const m=G.roster.find(x=>x.name===u.killer&&b.units.some(v=>v.m===x&&v.side===0));if(m){egDeed(m,'bane');out.push(m.name)}}return out}
function egDeed(m,k){if(typeof deedAdd==='function'){try{deedAdd(m,k);return}catch(e){}}if(!m.deeds||typeof m.deeds!=='object')m.deeds={};m.deeds[k]=(m.deeds[k]|0)+1}

/* ---------- dungeons ---------- */
const DUNGEONS={
 barrow:{n:'The Drowned Barrow',kind:'barrow',art:0,f:'undead',biome:'swamp',danger:'Made for a company of veterans: twelve swords of level 11 to 13 in their best steel. Fewer, or greener, will not come back.',
  d:'A king\'s grave gone under the marsh. Its dead still keep the old watch, and the old king keeps them.',
  fights:[{n:'The flooded halls',d:'Shamblers in the black water, legionaries on the steps.',roster:egR([['zomb',5,16.5],['skel',5,16.5],['skelhal',3,16.5],['necro',2,15.5]])},
   {n:'The bone choir',d:'The barrow\'s priests raise their dead faster than they fall.',roster:egR([['gknight',3,12.25],['skelhal',4,14.25],['necro',3,13.25],['zomb',3,14.25]])},
   {n:'The Drowned King',d:'Haldane the Drowned King on his sunken throne, and his grave knights about him.',boss:egBoss('gknight','Haldane the Drowned King','Lord of the Barrow',[{at:.6,n:'Rise, my guard',say:'Haldane strikes the water: his guard rises from it.',summon:['skel','skel','skelhal']},{at:.3,n:'The king will not lie down',say:'The Drowned King draws the marsh into his wounds.',heal:.2,enrage:{dmg:.2,md:6}}],10),
    roster:egR([['gknight',1,14.75,0,'Haldane the Drowned King',2.2],['gknight',3,12.75],['necro',2,13.75],['skelhal',3,14.75]])}],
  loot:['lg:dreadcrown','lg:oathbreaker','lg:pilgrimmantle']},
 warren:{n:'The Red Warren',kind:'lair',art:1,f:'ogre',biome:'hills',danger:'Made for a company of veterans: twelve swords of level 11 to 13 in their best steel. Fewer, or greener, will not come back.',
  d:'A cave the goblins dug for something bigger than goblins. The bones at the mouth are not all animal.',
  fights:[{n:'The goblin tunnels',d:'Goblins in every crack, and an ogre at the bend.',roster:egR([['gob',6,17.25],['gobarch',4,17.25],['gobsham',2,16.25],['ogre',2,12.25]])},
   {n:'The ogre pens',d:'Armored ogres, chained no longer.',roster:egR([['ogre',3,13.75],['aogre',2,13.75],['gobarch',4,18.75]])},
   {n:'Gutmaw',d:'Gutmaw the Ever-Hungry, the ogre the warren was dug for.',boss:egBoss('aogre','Gutmaw the Ever-Hungry','Lord of the Red Warren',[{at:.6,n:'Feeding time',say:'Gutmaw bellows: his brood come running.',summon:['ogre']},{at:.3,n:'Blood-mad',say:'Gutmaw goes blood-mad.',enrage:{dmg:.3,ms:8}}],10),
    roster:egR([['aogre',1,14,0,'Gutmaw the Ever-Hungry',2.6],['ogre',2,12],['gobsham',2,16],['gobarch',4,16]])}],
  loot:['lg:worldhammer','lg:grudgebearer','lg:mirrorshield']},
 keep:{n:'The Black Keep',kind:'keep',art:2,f:'bandit',biome:'hills',danger:'Made for a company of veterans: twelve swords of level 11 to 13 in their best steel. Fewer, or greener, will not come back.',
  d:'A burned lord\'s keep, held now by the worst brigands of three kingdoms and the madman who leads them.',
  fights:[{n:'The gatehouse',d:'Crossbows on the walls, raiders at the gate.',roster:egR([['bxbow',5,14.25],['braid',4,14.25],['thug',4,14.25],['bmark',2,14.25]])},
   {n:'The great hall',d:'The keep\'s sworn men, in stolen plate.',roster:egR([['braid',5,16.4],['thug',4,15.4],['bxbow',3,15.4],['blead',1,14.4]])},
   {n:'Lord Vesk',d:'The Mad Lord Vesk and his bodyguard, at the top of the tower.',boss:egBoss('blead','Lord Vesk the Mad','Master of the Black Keep',[{at:.6,n:'To me!',say:'Vesk shrieks for his guard.',summon:['braid','braid']},{at:.3,n:'Madness',say:'Vesk laughs and fights like ten men.',enrage:{dmg:.3,ms:10,md:8}}],10),
    roster:egR([['blead',1,16,0,'Lord Vesk the Mad',3.2],['braid',4,16],['bxbow',4,15],['thug',3,15]])}],
  loot:['lg:lastmercy','lg:dawnbringer','lg:sunwall']},
 grove:{n:'The Rotting Grove',kind:'grove',art:3,f:'ent',biome:'forest',danger:'Made for a company of veterans: twelve swords of level 11 to 13 in their best steel. Fewer, or greener, will not come back.',
  d:'A wood where the trees remember every axe. At its heart the oldest of them has gone rotten, and angry.',
  fights:[{n:'The thorn wall',d:'Thornlings by the dozen and the ents that tend them.',roster:egR([['thorn',6,19],['ent',2,15],['viper',4,19]])},
   {n:'The serpent pools',d:'Great serpents in the black pools beneath the roots.',roster:egR([['gserp',3,16],['adder',5,19],['viper',3,19]])},
   {n:'The Rotheart',d:'The Rotheart, eldest of the grove, and its rotten court.',boss:egBoss('elder','The Rotheart','Eldest of the Grove',[{at:.6,n:'The grove wakes',say:'The Rotheart groans: the trees walk.',summon:['thorn','thorn','thorn']},{at:.3,n:'Rot and ruin',say:'Rot pours from the Rotheart\'s wounds.',heal:.15,enrage:{dmg:.25}}],10),
    roster:egR([['elder',1,11.95,0,'The Rotheart',2.4],['ent',2,10.95],['thorn',4,14.95],['viper',3,14.95]])}],
  loot:['lg:heartseeker','lg:starfall','lg:shadowweave']},
 hall:{n:'The Hall of Iron Tusks',kind:'keep',art:2,f:'orc',biome:'snow',danger:'Made for a company of veterans: twelve swords of level 11 to 13 in their best steel. Fewer, or greener, will not come back.',
  d:'The mountain hall of an orc clan that never bent the knee to any warchief, and the iron-jawed brute who rules it.',
  fights:[{n:'The tusk-gate',d:'Braves at the gate, crushers behind.',roster:egR([['orcy',5,15.6],['obrute',3,15.6],['orcw',3,15.6]])},
   {n:'The feasting hall',d:'The clan\'s warriors, drunk and eager.',roster:egR([['orcw',5,15],['obrute',3,15],['orcy',3,15]])},
   {n:'Ghor Ironjaw',d:'Ghor Ironjaw and the warlords of his clan.',boss:egBoss('orcl','Ghor Ironjaw','Chief of the Iron Tusks',[{at:.6,n:'Iron Tusks!',say:'Ghor roars the clan\'s name: warriors pour in.',summon:['orcy','orcy']},{at:.3,n:'Iron jaw',say:'Ghor spits teeth and grins.',enrage:{dmg:.25,ms:8}}],10),
    roster:egR([['orcl',1,10.75,0,'Ghor Ironjaw',2.6],['orcl',2,9.75],['orcw',4,10.75],['orcy',3,10.75]])}],
  loot:['lg:widowmaker','lg:aegisplate','lg:skyrender']},
 den:{n:'The Hunger Den',kind:'lair',art:1,f:'beast',biome:'forest',danger:'Made for a company of veterans: twelve swords of level 11 to 13 in their best steel. Fewer, or greener, will not come back.',
  d:'A hollow hill where every beast of the north wood comes to die, and some of them do not.',
  fights:[{n:'The wolf run',d:'A pack that has grown fat on hunters.',roster:egR([['wolf',8,17.5],['spider',4,17.5],['bear',1,14.5]])},
   {n:'The web halls',d:'Webspinners as big as ponies, and the owlbears that eat them.',roster:egR([['spider',6,17.6],['bear',3,14.6],['wolf',3,17.6]])},
   {n:'Old Grandmother',d:'Old Grandmother, the great owlbear of the den, and her get.',boss:egBoss('bear','Old Grandmother','Mother of the Hunger Den',[{at:.6,n:'Her get',say:'Old Grandmother shrieks: her young come out of the dark.',summon:['bear']},{at:.3,n:'The hunger',say:'Old Grandmother is starving, and she has found food.',enrage:{dmg:.3,ms:10}}],10),
    roster:egR([['bear',1,15,0,'Old Grandmother',3.4],['bear',2,13],['wolf',5,16],['spider',3,16]])}],
  loot:['lg:wyrmbane','lg:kingsblade','lg:thunderclap']}};
// what a dungeon gives when the legendary agent's item is not there (12-famed.js top items)
const DGNFALL={barrow:'runeblade',warren:'dwarfaxe',keep:'estoc',grove:'bardiche',hall:'greataxe',den:'warbow'};
const DGN={first:16,every:9,cap:d=>d<40?2:d<64?4:6,crowns:1200,renown:40};
function dgnOf(id){return Array.isArray(G&&G.dungeons)?G.dungeons.find(d=>d.id===id)||null:null}
function dgnSite(d){return(G.sites||[]).find(s=>s.id===d.id)||null}
// a spot for a new dungeon: walkable, away from towns, sites and portals; a private stream (no game randomness)
function dgnSpot(salt){const r=egStream(salt*131+17);let best=null,bv=-1;
 for(let k=0;k<900;k++){const x=2+Math.floor(r()*(WN-4)),y=2+Math.floor(r()*(WN-4)),i=y*WN+x;if(!W||!W.ok||!W.ok[i]||(W.road&&W.road[i])||(W.river&&W.river[i]))continue;const px=(x+.5)*TS,py=(y+.5)*TS;
  const dt=Math.min(...G.towns.map(t=>Math.hypot(t.x-px,t.y-py)))/TS;if(dt<4)continue;if((G.sites||[]).some(s=>Math.hypot(s.x-px,s.y-py)<5*TS)||(G.portals||[]).some(p=>Math.hypot(p.x-px,p.y-py)<5*TS))continue;
  const v=Math.min(dt,9)+r();if(v>bv){bv=v;best={x:px,y:py}}}
 return best}
// The order the dungeons appear in (seeded by the world)
function dgnOrder(){const L=Object.keys(DUNGEONS),r=egStream(4242);for(let i=L.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[L[i],L[j]]=[L[j],L[i]]}return L}
// the day the n-th dungeon opens (n from 0): the first on DGN.first, then DGN.every days apart with a seeded jitter of 0..3
function dgnDue(n){const r=egStream(9001+n);return DGN.first+n*DGN.every+Math.floor(r()*4)}
/* Rules: once a day (worldDay). Opens the next dungeon when it is due and the cap allows. Returns the new dungeon or null. No game randomness. */
function dungeonDay(news){if(!G||!Array.isArray(G.towns)||!G.towns.length)return null;if(!Array.isArray(G.dungeons))G.dungeons=[];const n=G.dungeons.length,ord=dgnOrder();
 if(n>=ord.length||n>=DGN.cap(G.day|0)||(G.day|0)<dgnDue(n))return null;return dungeonOpen(ord[n],news)}
function dungeonOpen(k,news){const D=DUNGEONS[k];if(!D)return null;if(!Array.isArray(G.dungeons))G.dungeons=[];if(G.dungeons.some(d=>d.k===k))return null;const pos=dgnSpot(G.dungeons.length+1);if(!pos)return null;
 const d={id:G.nid++,k,x:pos.x,y:pos.y,stage:0,cleared:false,day:G.day|0};G.dungeons.push(d);if(!Array.isArray(G.sites))G.sites=[];G.sites.push({id:d.id,kind:'dgn',x:d.x,y:d.y,n:D.art|0,dg:1});
 const w=`Travellers speak of ${D.n}`;if(typeof worldNews==='function'){try{worldNews(w)}catch(e){}}if(Array.isArray(news))news.push(w);return d}
function dungeonFightOpts(d){const D=DUNGEONS[d.k],F=D&&D.fights[d.stage];if(!F)return null;const o={f:D.f,roster:F.roster.map(e=>Object.assign({},e)),biome:D.biome,src:{type:'dungeon',id:d.id,stage:d.stage},fixedRoster:1};
 if(F.boss)o.boss=Object.assign({},F.boss,{phases:F.boss.phases.map(p=>Object.assign({},p))});if(F.realm)o.realm=F.realm;return o}
function dungeonEnter(id,quiet){const d=dgnOf(id);if(!d||d.cleared)return null;const o=dungeonFightOpts(d);if(!o)return null;if(!quiet){if(typeof closeSheet==='function')closeSheet(true);G.moving=false;G.route=[];engage(o)}return o}
// Rules (settleBattle): {kind:'dgnNext'|'dgnDone'|'dgnLost', ...}. A lost fight keeps the halls already cleared.
function dungeonSettle(s,win,res){const d=dgnOf(s.id);if(!d)return{kind:'world',toast:null};const D=DUNGEONS[d.k];
 if(!win)return{kind:'dgnLost',id:d.id,n:D.n};d.stage++;if(d.stage<D.fights.length)return{kind:'dgnNext',id:d.id,n:D.n,stage:d.stage,of:D.fights.length};
 d.cleared=true;const st=dgnSite(d);if(st)st.kind='dgnc';G.crowns+=DGN.crowns;G.renown+=DGN.renown;
 let leg=egLegend('dungeon',d.k,D.loot,D.n);if(!leg&&ITEMS[DGNFALL[d.k]]){leg=DGNFALL[d.k];G.stash.push(leg)}
 const alive=new Set((res&&res.men||[]).filter(r=>r.state!=='dead').map(r=>r.id)),deeds=[];for(const m of G.roster)if(alive.has(m.id)){egDeed(m,'dungeon');deeds.push(m.name)}
 if(typeof worldNews==='function'){try{worldNews(`${G.name||'A company'} cleared ${D.n}`)}catch(e){}}
 if(typeof achEvent==='function')achEvent('dungeon',{k:d.k});   // achievements (28-achieve.js)
 return{kind:'dgnDone',id:d.id,n:D.n,crowns:DGN.crowns,legend:leg,deeds,boss:res&&res.boss?res.boss.name:''}}

/* ---------- saves (20-state.js repairSave calls this; v13 -> v14 adds empty G.portalRun / G.dungeons) ---------- */
function egRepair(g){const ok=x=>x&&typeof x==='object'&&!Array.isArray(x),fin=v=>typeof v==='number'&&isFinite(v);
 // dungeons: known keys, finite places, one per key; their sites follow them
 const seen={};g.dungeons=Array.isArray(g.dungeons)?g.dungeons.filter(d=>ok(d)&&DUNGEONS[d.k]&&fin(d.id)&&fin(d.x)&&fin(d.y)&&!seen[d.k]&&(seen[d.k]=1)).map(d=>({id:Math.floor(d.id),k:d.k,x:d.x,y:d.y,stage:clamp(Math.floor(fin(d.stage)?d.stage:0),0,DUNGEONS[d.k].fights.length),cleared:!!d.cleared,day:Math.max(1,Math.floor(fin(d.day)?d.day:1))})):[];
 if(!Array.isArray(g.sites))g.sites=[];g.sites=g.sites.filter(s=>!(s&&(s.kind==='dgn'||s.kind==='dgnc')&&!g.dungeons.some(d=>d.id===s.id)));
 for(const d of g.dungeons){if(d.stage>=DUNGEONS[d.k].fights.length)d.cleared=true;let s=g.sites.find(x=>x&&x.id===d.id);if(!s){s={id:d.id,kind:'dgn',x:d.x,y:d.y,n:DUNGEONS[d.k].art|0,dg:1};g.sites.push(s)}s.kind=d.cleared?'dgnc':'dgn';s.dg=1;s.n=DUNGEONS[d.k].art|0;s.x=d.x;s.y=d.y}
 // the portal run: its portal must still be open, its nodes well formed
 const r=g.portalRun;g.portalRun=null;
 if(ok(r)&&ENDGAME[r.realm]&&fin(r.id)&&Array.isArray(g.portals)&&g.portals.some(p=>p.id===r.id)&&Array.isArray(r.nodes)&&r.nodes.length>=2&&r.nodes.length<=9){const N=r.nodes.length,E=ENDGAME[r.realm];
  const nodes=r.nodes.map(n=>ok(n)&&['battle','elite','rest','treasure','event','boss'].includes(n.k)?{k:n.k,edges:Array.isArray(n.edges)?n.edges.filter(e=>Number.isInteger(e)&&e>=0&&e<N):[],done:!!n.done,L:clamp(Math.floor(fin(n.L)?n.L:0),0,3),j:clamp(Math.floor(fin(n.j)?n.j:0),0,1),fight:typeof n.fight==='string'&&E.fights[n.fight]?n.fight:undefined}:null);
  if(nodes.every(n=>n&&((n.k!=='battle'&&n.k!=='elite'&&n.k!=='boss')||n.fight))&&nodes.some(n=>n.k==='boss')){nodes.forEach(n=>{if(n.fight===undefined)delete n.fight});
   const at=Number.isInteger(r.at)&&r.at>=-1&&r.at<N?r.at:-1,sp=ok(r.spoils)?r.spoils:{};
   g.portalRun={id:Math.floor(r.id),realm:r.realm,seed:fin(r.seed)?Math.floor(r.seed):Math.floor(r.id),nodes,at,path:Array.isArray(r.path)?r.path.filter(e=>Number.isInteger(e)&&e>=0&&e<N).slice(0,N):[],day:Math.max(1,Math.floor(fin(r.day)?r.day:1)),
    spoils:{crowns:Math.max(0,Math.floor(fin(sp.crowns)?sp.crowns:0)),items:Array.isArray(sp.items)?sp.items.filter(id=>typeof id==='string'&&ITEMS[id]).slice(0,12):[]}};if(r.unready)g.portalRun.unready=1;
   // a fight node the company stood on when it was saved (a battle cannot be saved): it is still to be fought
   if(at>=0&&!nodes[at].done&&(nodes[at].k==='battle'||nodes[at].k==='elite'||nodes[at].k==='boss')){g.portalRun.at=g.portalRun.path.length>1?g.portalRun.path[g.portalRun.path.length-2]:-1;g.portalRun.path.pop()}}}
 // deeds on every merc (the legend agent validates its own keys through legendRepair)
 for(const m of Array.isArray(g.roster)?g.roster:[]){if(!ok(m))continue;const D=ok(m.deeds)?m.deeds:{},o={};for(const k in D)if(fin(D[k])&&D[k]>0)o[k]=Math.floor(D[k]);m.deeds=o}
 if(typeof legendRepair==='function'){try{legendRepair(g)}catch(e){}}return g}
