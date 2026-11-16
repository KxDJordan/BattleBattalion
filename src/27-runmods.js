/* ================= RUN MODIFIERS ("twists"): seeded campaign-wide rules (replayability round, docs/replay-contract.md 1) =================
   RUNMODS[k] = {n, d, icon, tone:'good'|'bad'|'mixed', good:[lines], bad:[lines] (what the player reads: exact effects),
     k:{key: number}        factors read by runModK(key, def): def 0 = the values add up (recruits, rivals, pros, feud), else they multiply
     f:{group:{key: n}}     keyed factors read by runModF(group, key): spawn (band / contract faction weight), mult (band strength),
                            pay (contract pay by its faction), ctr (contract type weight); '*' = every key
     price:{kind: n}        town price factor by kind (buy sell food hire tools), gear:{buy, sell} (weapons, armor, helmets, shields),
                            trade:{sell} (trade goods); all shown in the market's price reasons under the twist's name
     weather(tab, biome)    the weather table of a land, start(g, r) once at a new game (r: a private stream from the seed)}
   G.mods = [keys] (set at new game, [] for old saves and for newGame() without options). The rules read them only through the helpers
   below, and every helper returns the plain value when no twist is in play: a company without twists plays exactly as before (no
   extra draws on the game stream).
   Public: runMods() runMod(k) runModK(key, def) runModF(group, key, def) rollRunMods(seed, n) runModsInit(g, opts) runModsStart(g)
           runModsRepair(g) runModPriceWhy(out, kind, id) runModPool(list) runModPayK(c) runModWeather(biome) runModBattle(o)
           runModHealStep(step) runModNestFs(fs); UI: ncModsHTML() ncModsOpt() runModsSheet() runModsLine().
   RUNMOD_FORCE: when set (tests, tuning), a new game without explicit mods takes these. */
const RM_MONSTERS=['beast','serpent','ent','ogre','wyvern'];
const RM_ALLF=o=>{const r={};for(const f of RM_MONSTERS)r[f]=o;return r};
const RUNMODS={
 winter:{n:'Harsh winter',icon:'chill',tone:'bad',d:'The cold came early and will not lift. Snow lies on every road but the desert ones.',
  good:['Contract pay +10%: few will march in this','Bands are slowed by the snow as much as you'],
  bad:['Snowfall in every land but the desert, and storms more often','The company marches 8% slower','Every sword eats a quarter more','Food costs 40% more','A fight in a snowfall is fought on snow'],
  k:{pay:1.1,march:.92,ration:1.25},price:{food:1.4},
  weather(tab,b){if(b==='desert')return tab;const L=tab.map(e=>[e[0],e[0]==='clear'?Math.round(e[1]*.55):e[0]==='storm'?e[1]+4:e[0]==='snow'?Math.round(e[1]*1.5):e[1]]);
   if(!L.some(e=>e[0]==='snow'))L.push(['snow',34]);return L}},
 goldrush:{n:'Gold rush',icon:'coin',tone:'mixed',d:'Gold in the hills, and every fool with a shovel on the road to it. Coin is everywhere, and so are thieves.',
  good:['Contract pay +15%','Caravans carry 50% more coin'],
  bad:['Market prices, food and hiring +20%, tools +15%','Brigands twice as common','Raids on towns 50% more often'],
  k:{pay:1.15,cargo:1.5,raids:1.5},price:{buy:1.2,food:1.2,hire:1.2,tools:1.15},f:{spawn:{bandit:2}}},
 migration:{n:'Monster migration',icon:'q-wolf',tone:'mixed',d:'Something drove the beasts out of the deep wilds. They wander the settled lands in herds and packs.',
  good:['Monster parts drop 50% more often','Work against monsters pays 20% more','Named beasts and nests posted far more often'],
  bad:['Beasts, serpents, ents, ogres and wyverns twice as common','New monster nests appear twice as often'],
  k:{parts:1.5,nests:2},f:{spawn:Object.assign(RM_ALLF(2),{wyvern:1.6}),pay:RM_ALLF(1.2),ctr:{beast:1.8,nest:1.5}},nestFs:['beast','beast','beast']},
 feud:{n:'Feuding houses',icon:'sit-siege',tone:'mixed',d:'Old grudges between the great houses have come to a head. Every lord wants swords, and every border is a front.',
  good:['Sieges posted twice as often, gate defences nearly so','Houses pay 15% more for contracts'],
  bad:['The houses start the march hating each other, and the two nearest at war','Feuds sour faster and peace comes half as often','Sieges more often: towns change hands','Hiring costs 10% more'],
  k:{feud:1.2,peace:.5,siege:1.6,payHouse:1.15},price:{hire:1.1},f:{ctr:{siege:2,defend:1.8,patrol:1.3}},
  start(g,r){const H=Array.isArray(g.houses)?g.houses:[];if(H.length<2)return;if(!g.hrel||typeof g.hrel!=='object')g.hrel={};if(!Array.isArray(g.wars))g.wars=[];
   let best=null;for(let a=0;a<H.length;a++)for(let b=a+1;b<H.length;b++){const k=hrKey(H[a].id,H[b].id);g.hrel[k]=Math.min(svNum(g.hrel[k],0),-30-Math.floor(r()*15));
    const A=g.towns[H[a].seat],B0=g.towns[H[b].seat],d=A&&B0?Math.hypot(A.x-B0.x,A.y-B0.y):1e9;if(!best||d<best.d)best={a:H[a].id,b:H[b].id,d,k}}
   if(best&&!g.wars.some(w=>hrKey(w.a,w.b)===best.k)){g.hrel[best.k]=-60;g.wars.push({a:best.a,b:best.b,day:1})}}},
 plague:{n:'Plague years',icon:'sit-plague',tone:'bad',d:'Sickness moves from town to town and the taverns are half empty. Those who are left work cheap.',
  good:['Temples treat wounds for 40% less','Wages 10% lower'],
  bad:['Injuries heal a third slower','Two fewer recruits in every tavern','Plague strikes towns three times as often'],
  k:{temple:.6,wage:.9,recruits:-2,sit_plague:3,heal:1}},
 heroes:{n:'Age of heroes',icon:'laurel',tone:'mixed',d:'Songs are sung of every fight, and every band on the road wants to be in one.',
  good:['Contracts give 50% more renown','Fabled warriors ask a quarter less to join'],
  bad:['Every roaming band is 6% stronger'],
  k:{renown:1.5,fabled:.75},f:{mult:{'*':1.06}}},
 bandits:{n:'Bandit kings',icon:'ct-bounty',tone:'bad',d:'The brigand chiefs have sworn to one another. Their bands are larger, better armed and bolder.',
  good:['Bounties posted twice as often','Work against brigands pays 30% more'],
  bad:['Brigands twice as common and 20% stronger','Raids on towns twice as often'],
  k:{raids:2},f:{spawn:{bandit:2},mult:{bandit:1.2},pay:{bandit:1.3},ctr:{bounty:2.2}}},
 harvest:{n:'Bountiful harvest',icon:'tg-grain',tone:'good',d:'The granaries are full and the markets fat. A good year to be anyone but a sellsword.',
  good:['Food costs 45% less','Towns start richer and stay richer (prosperity +10)','One more recruit in every tavern','Famine a third as often, festivals twice as often'],
  bad:['Contract pay -10%: fat towns hire fewer swords'],
  k:{pros:10,recruits:1,pay:.9,sit_famine:.33,sit_festival:2},price:{food:.55},
  start(g){for(const t of g.towns||[])if(t&&svFin(t.pros))t.pros=clamp(t.pros+10,0,100)}},
 dead:{n:'Restless dead',icon:'q-dead',tone:'bad',d:'The graves will not stay shut. Barrow and churchyard alike give up their dead.',
  good:['Work against the dead pays 30% more','Relic hunts posted more often'],
  bad:['The restless dead are two and a half times as common, and 10% stronger','Undead nests rise more often'],
  f:{spawn:{undead:2.5},mult:{undead:1.1},pay:{undead:1.3},ctr:{relic:1.6}},nestFs:['undead','undead','undead']},
 trade:{n:'Trade boom',icon:'goal-caravan',tone:'good',d:'New roads, new markets and a hunger for goods. The wagons never stop rolling.',
  good:['Twice as many caravans on the roads','Caravans carry 50% more coin','Trade goods sell for 15% more'],
  bad:['Brigands a third more common, drawn by the wagons'],
  k:{caravans:2,cargo:1.5},trade:{sell:1.15},f:{spawn:{bandit:1.35}}},
 iron:{n:'Iron scarcity',icon:'anvil',tone:'bad',d:'The mines are flooded and the smiths idle. Every blade is precious, and priced like it.',
  good:['Gear you sell fetches 30% more'],
  bad:['Weapons, shields, armor and helmets cost 35% more','Tools cost 60% more','Two fewer items on every stall'],
  k:{stock:-2},gear:{buy:1.35,sell:1.3},price:{tools:1.6}},
 glut:{n:'Mercenary glut',icon:'retinue',tone:'mixed',d:'A great war ended in the south and its swords came north looking for pay. Men are cheap; work is not.',
  good:['Hiring costs 30% less','Wages 10% lower','Two more recruits in every tavern'],
  bad:['One more rival company from the start, and new ones form far more often','Contract pay -10%'],
  k:{recruits:2,wage:.9,pay:.9,rivals:1,rvForm:2.5},price:{hire:.7}},
 omens:{n:'Ill omens',icon:'hexed',tone:'mixed',d:'Two-headed calves, red moons, birds flying backwards. Whatever is coming, it is coming early.',
  good:['Ending the crisis pays 60% more, in crowns and renown'],
  bad:['The crisis comes a fifth sooner'],
  k:{crisisPay:1.6,crisisDay:.82}},
 elites:{n:'Blooded foes',icon:'pers-glory',tone:'mixed',d:'Hard years made hard enemies. Champions lead the bands, and every lord pays for a name.',
  good:['Contract pay +10%','Contracts give 20% more renown'],
  bad:['Many more foes carry elite marks'],
  k:{pay:1.1,renown:1.2,elites:2}},
 patron:{n:'A patron\'s purse',icon:'tg-gems',tone:'mixed',d:'A merchant prince paid for the banner, and expects to see it kept well.',
  good:['800 more crowns at the start'],
  bad:['Wages 12% higher, for the whole march'],
  k:{wage:1.12},start(g){g.crowns=(g.crowns||0)+800}}
};
const RUNMODK=Object.keys(RUNMODS);
// pairs that never come together (rolled or chosen)
const RUNMOD_CONFLICTS=[['winter','harvest'],['plague','glut'],['plague','harvest'],['trade','iron'],['bandits','goldrush'],['heroes','elites']];
const RUNMOD_MAX=3,RUNMOD_ROLL=2;
let RUNMOD_FORCE=null;
function runModClash(a,b){return a!==b&&RUNMOD_CONFLICTS.some(p=>(p[0]===a&&p[1]===b)||(p[0]===b&&p[1]===a))}
function runModOk(L,k){return !!RUNMODS[k]&&!L.includes(k)&&L.length<RUNMOD_MAX&&!L.some(x=>runModClash(x,k))}
// a clean list: known keys, no repeats, no conflicting pair (the earlier one stays), at most RUNMOD_MAX
function runModsClean(L){const out=[];if(Array.isArray(L))for(const k of L)if(typeof k==='string'&&runModOk(out,k))out.push(k);return out}
/* rollRunMods(seed, n): n twists from the seed alone (a private stream; the game stream is not touched), conflict-free, in roll order. */
function rollRunMods(seed,n){n=clamp(Math.floor(svNum(n,RUNMOD_ROLL)),0,RUNMOD_MAX);const r=mulberry(((seed|0)^0x6d0d5eed)>>>0),ks=RUNMODK.slice();
 for(let i=ks.length-1;i>0;i--){const j=Math.floor(r()*(i+1));const t=ks[i];ks[i]=ks[j];ks[j]=t}
 const out=[];for(const k of ks){if(out.length>=n)break;if(runModOk(out,k))out.push(k)}return out}
function runMods(){return G&&Array.isArray(G.mods)?G.mods:[]}
function runMod(k){return runMods().includes(k)}
function runModK(key,def){const L=runMods();if(def==null)def=1;if(!L.length)return def;let v=def;
 for(const k of L){const M=RUNMODS[k],x=M&&M.k?M.k[key]:undefined;if(typeof x==='number'&&isFinite(x))v=def===0?v+x:v*x}return v}
function runModF(grp,key,def){const L=runMods();if(def==null)def=1;if(!L.length)return def;let v=def;
 for(const k of L){const M=RUNMODS[k],T=M&&M.f&&M.f[grp];if(!T)continue;const x=T[key]!=null?T[key]:T['*'];if(typeof x==='number'&&isFinite(x))v*=x}return v}
/* ---- new game, start, save ---- */
// runModsInit(g, opts): createCampaign, right after the world is made. opts.mods: 'random' (rolled from the seed) | [keys] | absent (none, or RUNMOD_FORCE)
function runModsInit(g,opts){const o=opts||{};let L=o.mods;if(L===undefined&&RUNMOD_FORCE)L=RUNMOD_FORCE;
 g.mods=L==='random'?rollRunMods(g.seed,RUNMOD_ROLL):runModsClean(L);return g.mods}
// runModsStart(g): once, after houses, the crisis and the origin are set up (feuds, purses, prosperity, the crisis day)
function runModsStart(g){if(!g||!Array.isArray(g.mods)||!g.mods.length)return;const G0=G;G=g;
 try{const r=mulberry(((g.seed|0)^0x5a17ed)>>>0);for(const k of g.mods){const M=RUNMODS[k];if(M&&typeof M.start==='function'){try{M.start(g,r)}catch(e){if(typeof console!=='undefined')console.warn('twist start failed',k,e)}}}
  const cd=runModK('crisisDay',1);if(cd!==1&&svFin(g.crisisDay))g.crisisDay=Math.max(8,Math.round(g.crisisDay*cd))}finally{G=G0}}
function runModsRepair(g){if(!g)return g;g.mods=runModsClean(g.mods);return g}
/* ---- what the systems ask ---- */
// the town price reasons (15-factions.js townPriceWhy): one line a twist that moves this price
function runModPriceWhy(out,kind,id){const L=runMods();if(!L.length)return out;const it=id&&typeof ITEMS==='object'?ITEMS[id]:null,gear=!!it&&['w','s','a','h'].includes(it.k),tg=!!it&&it.k==='t';
 for(const k of L){const M=RUNMODS[k];if(!M)continue;let x=1;if(M.price&&M.price[kind])x*=M.price[kind];if(gear&&M.gear&&M.gear[kind])x*=M.gear[kind];if(tg&&M.trade&&M.trade[kind])x*=M.trade[kind];
  if(x!==1)out.push({k:Math.round(x*100)/100,why:M.n})}return out}
// faction weights of the spawn / contract pool (40-world.js factionPool), in place
function runModPool(list){if(!runMods().length||!Array.isArray(list))return list;for(const e of list){if(!e||e.tier==='crisis')continue;const x=runModF('spawn',e.f,1);if(x!==1)e.w=Math.round(e.w*x*1000)/1000}return list}
// contract pay factor (16-contracts.js genContract2): the twists' pay, by the contract's foe, by a house employer
function runModPayK(c){if(!runMods().length||!c)return 1;let k=runModK('pay',1);if(c.f)k*=runModF('pay',c.f,1);if(typeof c.emp==='string'&&/^h[0-9]$/.test(c.emp))k*=runModK('payHouse',1);return k}
const RM_WX={sig:'',m:{}};
// the weather table of a land (40-world.js rollWeather / stepWeather)
function runModWeather(b){const base=WTHRBIO[b]||WTHRBIO.plains,L=runMods();if(!L.length)return base;const sig=L.join(',');if(RM_WX.sig!==sig){RM_WX.sig=sig;RM_WX.m={}}
 if(RM_WX.m[b])return RM_WX.m[b];let t=base;for(const k of L){const M=RUNMODS[k];if(M&&typeof M.weather==='function')t=M.weather(t,b)}return RM_WX.m[b]=t}
// a battle about to start (40-world.js engage): in a harsh winter, a fight in a snowfall on open ground is fought on snow
function runModBattle(o){if(!o||!runMod('winter')||o.biome||!G||!G.weather||G.weather.kind!=='snow')return o;
 try{const b=BIOKEY[tileAt(G.p.x,G.p.y)];if(b==='plains'||b==='forest'||b==='hills')o.biome='snow'}catch(e){}return o}
// a day of healing for an injury (30-mercs.js healInjuriesDaily): plague years skip every third day
function runModHealStep(step){return runMod('plague')&&G&&(G.day|0)%3===0?0:step}
// the factions a new nest may belong to (40-world.js wsNests): twists add entries (more weight)
function runModNestFs(fs){for(const k of runMods()){const M=RUNMODS[k];if(M&&Array.isArray(M.nestFs))for(const f of M.nestFs)if(FACT[f])fs.push(f)}return fs}

/* ================= UI ================= */
function rmIc(k,sz){const M=RUNMODS[k];return typeof pnIcon==='function'?pnIcon(M?M.icon:'hint','',sz||16):''}
function rmCard(k,small){const M=RUNMODS[k];if(!M)return'';const li=(L,c)=>L.map(x=>`<li class="${c}">${htmlEsc(x)}</li>`).join('');
 return`<div class="rm-card t-${M.tone}">${rmIc(k,32)}<div><b>${htmlEsc(M.n)}</b>${small?'':`<p>${htmlEsc(M.d)}</p>`}<ul class="rm-fx">${li(M.good,'g')}${li(M.bad,'b')}</ul></div></div>`}
/* ---- the new-company dialog section (90-shell.js ncDraw): NCS.mods 'random' | 'none' | 'pick', NCS.modPick [keys] ---- */
function ncModsHTML(){if(!['random','none','pick'].includes(NCS.mods))NCS.mods='random';if(!Array.isArray(NCS.modPick))NCS.modPick=[];NCS.modPick=runModsClean(NCS.modPick);
 const m=NCS.mods,P=NCS.modPick,btn=(k,n,s)=>`<button class="ncs-size${m===k?' on':''}" role="radio" aria-checked="${m===k}" onclick="ncModsMode('${k}')"><b>${n}</b><small>${s}</small></button>`;
 let h=`<div class="ncs-sec"><b>Twists</b><small>Rules that hold for the whole march: prices, bands, work and the world</small></div>
 <div class="ncs-sizes rm-modes" role="radiogroup" aria-label="Twists">${btn('random','Random','Two, from the seed')}${btn('none','None','The plain march')}${btn('pick','Choose','Up to three')}</div>`;
 if(m==='random')h+=`<p class="rm-note">${rmIc('omens',16)}Two twists are rolled from the land's seed when the company is raised. You will see them before you march, and in the ledger.</p>`;
 else if(m==='none')h+=`<p class="rm-note">No twists: the land as it always is.</p>`;
 else{h+=`<div class="ncs-ors rm-ors" role="group" aria-label="Choose twists">${RUNMODK.map(k=>{const M=RUNMODS[k],on=P.includes(k),clash=!on&&P.find(x=>runModClash(x,k)),full=!on&&!clash&&P.length>=RUNMOD_MAX,dis=!!clash||full;
   return`<button class="ncs-or rm-or t-${M.tone}${on?' on':''}${dis?' off':''}" aria-pressed="${on}"${dis?` aria-disabled="true" title="${htmlEsc(clash?'Not with '+RUNMODS[clash].n:'Three at most')}"`:''} onclick="ncModsTog('${k}')">${rmIc(k,32)}<b>${htmlEsc(M.n)}</b>${clash?`<small>Not with ${htmlEsc(RUNMODS[clash].n)}</small>`:''}</button>`}).join('')}</div>`;
  h+=P.length?`<div class="rm-cards">${P.map(k=>rmCard(k)).join('')}</div>`:`<p class="rm-note">Pick up to three. Twists that cannot go together are shut.</p>`}
 return h}
function ncModsMode(k){NCS.mods=k;if(typeof ncDraw==='function')ncDraw()}
function ncModsTog(k){if(!RUNMODS[k])return;const P=Array.isArray(NCS.modPick)?NCS.modPick:(NCS.modPick=[]);const i=P.indexOf(k);
 if(i>=0)P.splice(i,1);else if(runModOk(P,k))P.push(k);else{if(typeof toast==='function'){const c=P.find(x=>runModClash(x,k));toast(c?RUNMODS[k].n+' cannot go with '+RUNMODS[c].n:'Three twists at most')}return}
 if(typeof ncDraw==='function')ncDraw()}
// what ncBegin passes to newGame as opts.mods
function ncModsOpt(){return NCS.mods==='random'?'random':NCS.mods==='pick'?runModsClean(NCS.modPick):[]}
/* ---- the active twists: a sheet (menu: Twists) and a line on the raise sheet ---- */
function runModsSheet(){const L=runMods();
 sheet(`<div class="row sp"><h2>Twists of this march</h2><button onclick="menuSheet()">Back</button></div>
${L.length?`<p class="dim">They hold from the first day to the last. Prices they move show their name in the market.</p><div class="rm-cards">${L.map(k=>rmCard(k)).join('')}</div>`:'<p>This march has no twists: the land as it always is.</p>'}
<div class="row"><button class="pri" style="flex:1" onclick="closeSheet()">Back to the march</button></div>`,'rm-sheet')}
function runModsLine(){const L=runMods();if(!L.length)return'';
 return`<div class="rm-line"><span class="rm-lk">Twists</span>${L.map(k=>`<span class="rm-chip t-${RUNMODS[k].tone}">${rmIc(k,16)}${htmlEsc(RUNMODS[k].n)}</span>`).join('')}</div><div class="rm-cards sm">${L.map(k=>rmCard(k,true)).join('')}</div>`}
// the menu entry and the raise sheet: wraps (the shell's and the run's functions are hoisted declarations; nothing else in them changes)
if(typeof menuExtra==='function'){const me=menuExtra;menuExtra=function(){let h=me.apply(this,arguments);try{if(G&&typeof mbtn==='function'){const L=runMods();
  h+=mbtn(L.length?RUNMODS[L[0]].icon:'hint','Twists',L.length?htmlEsc(L.map(k=>RUNMODS[k].n).join(', ')):'None on this march','closeSheet(true);runModsSheet()','','')}}catch(e){}return h}}
if(typeof runStartLine==='function'){const rs=runStartLine;runStartLine=function(){return rs.apply(this,arguments)+runModsLine()}}
/* ---- twist events (17-events.js EVENTS): each comes only under its twist (weight 0 otherwise, so a march without twists is unchanged) ---- */
if(typeof EVENTS==='object'&&EVENTS)Object.assign(EVENTS,{
 rm_frost:{n:'A killing frost',kind:['travel','camp'],art:'pass',cd:6,when:c=>runMod('winter')&&c.biome!=='desert'?2.4:0,
  text:c=>evP(`The night goes so cold that the water skins freeze solid. By grey morning ${evNm(c.m)} cannot feel their hands, and the others are not much better.`),
  opts:[{t:'Build up the fires',req:c=>(G.tools|0)>=5,d:'−5 tools (wood, pitch, a wagon board). Nobody suffers.',go:c=>{evTools(-5);return'<p>The fire roars all night and the frost stays outside it.</p>'}},
   {t:'Share out the rations',req:c=>(G.food|0)>=8,d:'−8 food: hot broth for everyone. Nobody suffers.',go:c=>{evFood(-8);return'<p>A pot of broth, passed hand to hand until it is gone.</p>'}},
   {t:'March to keep warm',d:c=>`${evPlain(c.m)} −15 hitpoints; everyone else −5. 25%: ${evPlain(c.m)} takes frostbite (an injury).`,go:c=>{evHurt(c.m,15);G.roster.filter(m=>m!==c.m).forEach(m=>evHurt(m,5));if(evRoll(.25))evInj(c.m);return'<p>Stamping feet, numb fingers, and the road.</p>'}}]},
 rm_claim:{n:'A claim for sale',kind:['travel'],art:'river',cd:8,when:c=>runMod('goldrush')?2.2:0,
  text:c=>evP(`Two prospectors sit by a cold stream with pans in their laps and a deed between them. "Gold, sure as sunrise," says one. "We'd work it ourselves, but the brigands know our faces."`),
  opts:[{t:'Buy the claim',req:c=>G.crowns>=120,d:'−120 crowns. 50%: the stream pays (+320 crowns). 50%: fool\'s gold.',go:c=>{evCrowns(-120);if(evRoll(.5)){evCrowns(320);return'<p>A day of panning, and the pans come up yellow.</p>'}return'<p>It glitters. It is not gold.</p>'}},
   {t:'Guard them while they dig',d:'+8 hours. +70 crowns from their take.',go:c=>{evHours(8);evCrowns(70);return'<p>They dig, you watch the treeline, and they pay as they promised.</p>'}},
   {t:'Ride on',d:'Nothing changes.',go:c=>'<p>Every man on this road has a claim to sell.</p>'}]},
 rm_herd:{n:'The great herd',kind:['travel'],art:'glade',cd:7,when:c=>runMod('migration')?2.2:0,
  text:c=>evP(`The ground is churned for a mile: hoof, paw and claw, all heading the same way. Whatever drove them, the beasts are moving in their hundreds, and some of them are hungry.`),
  opts:[{t:'Hunt the stragglers',d:'A fight with beasts (a weak band). Pelts and meat if you win.',go:c=>{evFight('beast',.7,'the stragglers');return'<p>The weak and the old fall behind. So do the ones that turn and fight.</p>'}},
   {t:'Strip what the herd left',d:'+2 hours. +2 pelts, +6 food.',go:c=>{evHours(2);evPart('pelt',2);evFood(6);return'<p>The trampled and the dead, picked over with knives.</p>'}},
   {t:'Wait for them to pass',d:'+6 hours.',go:c=>{evHours(6);return'<p>It takes all afternoon.</p>'}}]},
 rm_levy:{n:'The lord\'s levy',kind:['town'],art:'square',cd:8,when:c=>runMod('feud')&&c.f&&c.f!=='free'?2:0,
  text:c=>evP(`A sergeant of ${evFacName(c.f)} is pressing men in the square for the war, and three of them have no wish to go. They look to your banner. "Take us on, captain. Anything but the front."`),
  opts:[{t:'Take one on',recruit:1,req:c=>G.crowns>=60,d:c=>`−60 crowns. A militiaman joins (level 2, room permitting). −6 standing with ${evFacName(c.f)}.`,go:c=>{evCrowns(-60);evRecruit(BG.militia?'militia':'sellsword',2);evRep(c.f,-6,'took a levy man');return'<p>The sergeant spits, and lets it go.</p>'}},
   {t:'Hand them to the sergeant',d:c=>`+40 crowns of bounty. +6 standing with ${evFacName(c.f)}.`,go:c=>{evCrowns(40);evRep(c.f,6,'returned levy dodgers');return'<p>"The house remembers its friends."</p>'}},
   {t:'Stay out of it',d:'Nothing changes.',go:c=>'<p>Not your war. Not yet.</p>'}]},
 rm_sick:{n:'A village of the sick',kind:['travel'],art:'farm',cd:8,when:c=>runMod('plague')?2.2:0,
  text:c=>evP(`Chalk crosses on every door. A woman at the well begs for anything that might help, and behind her the houses are silent.`),
  opts:[{t:'Give them salves',req:c=>(G.salve|0)>=1,d:c=>`−1 salve. +6 standing with ${evFacName(c.f)}. +40 XP for ${evPlain(c.m)}.`,go:c=>{evSalve(-1);evRep(c.f,6,'helped a plague village');evXP(c.m,40);return'<p>It will not be enough. It is something.</p>'}},
   {t:'Search the empty houses',d:c=>`+60 crowns. 35%: ${evPlain(c.m)} catches the sickness (an injury).`,go:c=>{evCrowns(60);if(evRoll(.35))evInj(c.m);return'<p>The dead have no use for their savings.</p>'}},
   {t:'Go round it',d:'+4 hours.',go:c=>{evHours(4);return'<p>A long way round, upwind.</p>'}}]},
 rm_graves:{n:'Open graves',kind:['travel'],art:'crypt',cd:6,when:c=>runMod('dead')?(c.night?3:1.5):0,
  text:c=>evP(`A churchyard by the road, and every grave in it is open from the inside. Fresh tracks lead off between the trees. Something is still digging in the far corner.`),
  opts:[{t:'Put them back down',d:'A fight with the restless dead (a weak band). Old steel if you win.',go:c=>{evFight('undead',.75,'the risen');return'<p>Shields up. They are slow, until they are not.</p>'}},
   {t:'Salt and burn the yard',req:c=>(G.tools|0)>=4,d:c=>`−4 tools. +8 standing with ${evFacName(c.f)}.`,go:c=>{evTools(-4);evRep(c.f,8,'burned a risen churchyard');return'<p>The smoke smells of tallow and worse.</p>'}},
   {t:'Leave before dark',d:'+3 hours.',go:c=>{evHours(3);return'<p>Nobody looks back.</p>'}}]},
 rm_wagons:{n:'A wagon train in a hurry',kind:['travel'],art:'wagon',cd:7,when:c=>runMod('trade')?2:0,
  text:c=>evP(`Eight wagons nose to tail, axles groaning. The master leans down from the first. "Ride with us to the next town and I'll pay, and feed you besides."`),
  opts:[{t:'Ride as escort',d:'+8 hours. +90 crowns, +6 food.',go:c=>{evHours(8);evCrowns(90);evFood(6);return'<p>A slow road, and a quiet one: nobody tries a train that size.</p>'}},
   {t:'Buy from the tailboard',req:c=>G.crowns>=50,d:'−50 crowns. +12 food, +6 tools.',go:c=>{evCrowns(-50);evFood(12);evTools(6);return'<p>At road prices, but the road is long.</p>'}},
   {t:'Wave them on',d:'Nothing changes.',go:c=>'<p>Dust, and then quiet.</p>'}]},
 rm_swords:{n:'Swords for hire',kind:['town'],art:'tavern',cd:6,when:c=>runMod('glut')?2.2:0,
  text:c=>evP(`Every bench in the tavern holds a veteran with a notched blade and no work. One of them follows your banner with his eyes, then comes over. "Half pay. A roof. I've done this twenty years."`),
  opts:[{t:'Hire him',recruit:1,req:c=>G.crowns>=60,d:'−60 crowns. A sellsword joins (level 3, room permitting).',go:c=>{evCrowns(-60);evRecruit('sellsword',3);return'<p>He was not lying about the twenty years.</p>'}},
   {t:'Buy the room a drink',req:c=>G.crowns>=30,d:c=>`−30 crowns. +60 XP for ${evPlain(c.m)}, from the old soldiers' stories.`,go:c=>{evCrowns(-30);evXP(c.m,60);return'<p>Old wars, retold until dawn.</p>'}},
   {t:'Leave them to it',d:'Nothing changes.',go:c=>'<p>There will be more of them tomorrow.</p>'}]}
});
