/* ================= FACTIONS, REPUTATION, TOWN STATE (phase 7, world agent) =================
   Data tables (10-data.js): REPT REPK HPERS HOUSEN SITS BLD BLDX GOODS HOUSEUNITS HOUSELOOT, FACT.free.
   G.houses = [{id:'h0', n, short, c1, c2, emblem, seat, pers}]   2 houses in the small world, 3 otherwise
   G.towns[i] gains {own:'h0'|'h1'|'h2'|'free', spec:[goodKey], bld:[buildingKey], sit:[{k, days, by?}], pros:0..100}
   G.rep = {h0, h1, h2?, free} in -100..100;  G.repLog = [{day, f, n, why}] (last 30)
   G.hrel = {'h0|h1': -100..100} how two houses feel about each other; G.wars = [{a, b, day}] wars under way
   G.nests = [{id, x, y, f, str, day, n?}] (40-world.js grows them); G.wsim = {day} the last day the world simulation ran
   Everything here is generated from G.seed alone (mulberry streams): factionsInit never draws game randomness, so it can run at any point
   of createCampaign, from the save migration, or lazily (worldEnsure) and give the same world.
   Public: factionsInit(g) worldEnsure() houseFactReg(g) houseById(id) isHouse(f) humanFact(f) factName(f) factColor(f) houseTowns(id)
           repOf(f) repTier(f) repGain(f,n,why) repTierIx(f)
           townPriceK(i,kind,itemId?) townPriceWhy(i,kind,itemId?) townHostile(i) townRecruitK(i) townCtrK(i,type) townStockK(i) goodMatch(g,id)
           houseRelation(a,b) houseRel(a,b) atWar(a,b) townSit(i,k) townSitAdd(i,k,days,extra) townSitDel(i,k) townHas(i,key)
           bldServe(i,key,arg) bldList(i) harbourList(i) */

function houseById(id){if(!G||!Array.isArray(G.houses))return null;for(const h of G.houses)if(h.id===id)return h;return null}
function isHouse(f){return typeof f==='string'&&f.length===2&&f[0]==='h'&&!!houseById(f)}
function humanFact(f){return f==='free'||isHouse(f)}
function factName(f){const h=houseById(f);if(h)return h.n;const rv=rivalById(f);if(rv)return rv.n;if(f==='free')return 'Free towns';return FACT[f]?FACT[f].n:'Unknown'}
function factColor(f){const h=houseById(f)||rivalById(f);if(h&&typeof BANNERC!=='undefined'&&BANNERC[h.c1])return PAL[BANNERC[h.c1].r[1]];return FACT[f]?FACT[f].col:PAL.n}
function houseTowns(id){const L=[];if(G&&G.towns)G.towns.forEach((t,i)=>{if(t.own===id)L.push(i)});return L}

/* ---- generation (deterministic from the seed) ---- */
const FX_COL=['g','x','D','B','E','j','p','G','y','l'],FX_C2=['c','l','y','G','p'],FX_EMB=['lion','tower','stag','raven','oak','sun','moon','crown','boar','rose','fleur','wolf','anchor'];
function fxWorld(g){return W&&W.seed===(g.seed|0)&&W.tiles&&W.tiles.length===WN*WN?W:genWorld(g.seed)}
function fxCoastal(w,t){const tx=Math.floor(t.x/TS),ty=Math.floor(t.y/TS);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=tx+dx,y=ty+dy;if(x<0||y<0||x>=WN||y>=WN)continue;if(w.tiles[y*WN+x]===0)return true}return false}
function fxBiomes(w,t){const tx=Math.floor(t.x/TS),ty=Math.floor(t.y/TS),n={};for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const x=tx+dx,y=ty+dy;if(x<0||y<0||x>=WN||y>=WN)continue;const b=BIOKEY[w.tiles[y*WN+x]];if(b)n[b]=(n[b]||0)+1}return n}
/* factionsInit(g, opt): houses, territory, reputation, town buildings, specialties and prosperity; opt.nests (default true) also seeds the
   first monster nests (a new game: old saves migrate with none). Fills only what is missing, so it is safe to call twice. */
function factionsInit(g,opt){g=g||G;if(!g||!Array.isArray(g.towns)||!g.towns.length)return g;opt=opt||{};const w=fxWorld(g),r=mulberry(((g.seed|0)^0x4f1bbcd)>>>0),T=g.towns,nT=T.length;
 const R=n=>Math.floor(r()*n),shuf=a=>{for(let i=a.length-1;i>0;i--){const j=R(i+1),x=a[i];a[i]=a[j];a[j]=x}return a};
 if(!Array.isArray(g.houses)||!g.houses.length){const nh=WN<=64||nT<9?2:3,roots=shuf(HOUSEN.slice()),cols=shuf(FX_COL.slice()),embs=shuf(FX_EMB.slice()),pers=Object.keys(HPERS);
  // seats: the largest towns, spread as far apart as they will go (never the starting town)
  const order=T.map((t,i)=>i).filter(i=>i>0).sort((a,b)=>T[b].size-T[a].size||a-b),seats=[order[0]];
  while(seats.length<nh&&seats.length<order.length){let best=-1,bd=-1;for(const i of order){if(seats.includes(i))continue;let d=1e9;for(const s of seats)d=Math.min(d,Math.hypot(T[i].x-T[s].x,T[i].y-T[s].y));d*=1+.15*T[i].size;if(d>bd){bd=d;best=i}}seats.push(best)}
  g.houses=seats.map((s,k)=>{const c1=cols[k],c2s=FX_C2.filter(c=>c!==c1);return{id:'h'+k,n:'House '+roots[k],short:roots[k],c1,c2:c2s[R(c2s.length)],emblem:embs[k],seat:s,pers:pers[R(pers.length)]}})}
 const H=g.houses;
 // territory: each town to the nearest seat; a few towns far from any seat (and some at random) stay free
 if(T.some(t=>typeof t.own!=='string')){T.forEach((t,i)=>{let best=null,bd=1e9,second=1e9;for(const h of H){const s=T[h.seat]||T[0],d=Math.hypot(t.x-s.x,t.y-s.y);if(d<bd){second=bd;bd=d;best=h}else if(d<second)second=d}
   const seat=H.some(h=>h.seat===i),contested=second<1e9&&bd/second>.82,far=bd>WN*TS*.42,roll=r();
   t.own=seat?best.id:((contested&&roll<.5)||(far&&roll<.6)||roll<.14)?'free':best.id});
  for(const h of H)T[h.seat].own=h.id}
 // prosperity, buildings, specialties
 const coast=T.map(t=>fxCoastal(w,t)),nCoast=coast.filter(Boolean).length;
 T.forEach((t,i)=>{const sz=clamp(t.size|0,1,3);
  if(!svFin(t.pros))t.pros=clamp(Math.round(30+sz*12+r()*18),0,100);
  if(!Array.isArray(t.sit))t.sit=[];
  if(!Array.isArray(t.bld)){const b=['notice','tavern','market','inn'],h=houseById(t.own),pious=h&&HPERS[h.pers]&&HPERS[h.pers].pious;
   if(sz>=2||pious||r()<.45)b.push('temple');if(coast[i]&&nCoast>=2)b.push('harbour');
   const ex=shuf(['armorer','college','hall','weaponsmith','fletcher']),n=sz===3?2+R(2):sz===2?1+R(2):R(2);for(let k=0;k<n;k++)b.push(ex[k]);
   t.bld=['notice','tavern','market','inn'].concat(BLDX.filter(k=>b.includes(k)))}
  if(!Array.isArray(t.spec)){const bio=fxBiomes(w,t),cand=[];for(const k in GOODS){const G0=GOODS[k];let wgt=0;if(G0.coast&&coast[i])wgt+=6;if(G0.bio)for(const b of G0.bio)wgt+=bio[b]||0;if(wgt>0)cand.push([k,wgt])}
   const out=[],want=sz>=2?2:1;for(let n=0;n<want&&cand.length;n++){let tot=0;for(const c of cand)tot+=c[1];let v=r()*tot,j=0;for(;j<cand.length-1;j++){v-=cand[j][1];if(v<=0)break}out.push(cand[j][0]);cand.splice(j,1)}
   t.spec=out.length?out:['ale']}});
 // every world has at least one of each service building somewhere (the largest towns that lack one get it)
 for(const k of ['armorer','college','hall','weaponsmith','fletcher'])if(!T.some(t=>t.bld.includes(k))){const i=T.map((t,i)=>i).sort((a,b)=>T[b].size-T[a].size||T[a].bld.length-T[b].bld.length||a-b)[0];T[i].bld=['notice','tavern','market','inn'].concat(BLDX.filter(x=>T[i].bld.includes(x)||x===k))}
 if(!svObj(g.rep))g.rep={};for(const h of H)if(!svFin(g.rep[h.id]))g.rep[h.id]=0;if(!svFin(g.rep.free))g.rep.free=0;
 if(!Array.isArray(g.repLog))g.repLog=[];
 if(!svObj(g.hrel)){g.hrel={};for(let a=0;a<H.length;a++)for(let b=a+1;b<H.length;b++){const wa=HPERS[H[a].pers].war+HPERS[H[b].pers].war;g.hrel[H[a].id+'|'+H[b].id]=Math.round(-8+r()*36-wa*10)}}
 if(!Array.isArray(g.wars))g.wars=[];if(!Array.isArray(g.news))g.news=[];
 if(!Array.isArray(g.nests)){g.nests=[];if(opt.nests!==false)fxSeedNests(g,w,r)}
 if(!svObj(g.wsim))g.wsim={day:svNum(g.day,1)};
 if(!Array.isArray(g.rivals)&&typeof rivalsInit==='function')rivalsInit(g);   // the rival companies (40-world.js): from the seed, no game randomness drawn
 houseFactReg(g);
 if(typeof eastInit==='function'){try{eastInit(g)}catch(e){if(typeof console!=='undefined')console.warn('eastInit failed',e)}}   // the East (19-east.js): the faction east, eastern towns (idempotent)
 if(typeof crisisInit==='function'){try{crisisInit(g)}catch(e){}}   // the run's crisis kind (18-crises.js), from the seed
 return g}
// the first nests of a new world: 2 (small) to 4 (vast), far from the towns, of the early monster factions
function fxSeedNests(g,w,r){const n=Math.max(2,Math.round(2*Math.sqrt(WN*WN/4096))),fs=['gob','bandit','beast'],T=g.towns;let nid=Math.floor(svNum(g.nid,1));
 for(let k=0;k<n;k++){let pos=null;for(let a=0;a<600&&!pos;a++){const x=Math.floor(3+r()*(WN-6)),y=Math.floor(3+r()*(WN-6)),i=y*WN+x;if(!w.ok[i])continue;const px=(x+.5)*TS,py=(y+.5)*TS;
   if(T.every(t=>Math.hypot(t.x-px,t.y-py)>(a<400?7:5)*TS)&&g.nests.every(q=>Math.hypot(q.x-px,q.y-py)>10*TS))pos={x:px,y:py}}
  if(pos)g.nests.push({id:nid++,x:pos.x,y:pos.y,f:fs[k%fs.length],str:1,day:svNum(g.day,1)})}
 g.nid=nid}
/* the noble houses fight as FACT entries of their own (house soldiers in the house's colours) so that every FACT[p.f] lookup works */
function houseFactReg(g){g=g||G;for(const k of Object.keys(FACT))if(FACT[k].house&&k!=='free'&&!(FACT[k].rival?g&&Array.isArray(g.rivals)&&g.rivals.some(r=>r.id===k):g&&Array.isArray(g.houses)&&g.houses.some(h=>h.id===k)))delete FACT[k];
 rivalFactReg(g);if(!g||!Array.isArray(g.houses))return;for(const h of g.houses){const c=typeof BANNERC!=='undefined'&&BANNERC[h.c1]?PAL[BANNERC[h.c1].r[1]]:'#5a5a66';
  FACT[h.id]={n:h.n,g:'H',col:c,skin:'#d9b99a',tier:'early',house:1,biomes:null,lair:'Break a patrol of '+h.n,units:HOUSEUNITS,rank:[.5,1.15,.3,19],loot:HOUSELOOT.filter(id=>ITEMS[id])}}}
// lazy guard: a campaign that reached the world without factionsInit (older code paths) gets its factions now. Draws no game randomness.
function worldEnsure(){if(G&&Array.isArray(G.towns)&&G.towns.length&&(!Array.isArray(G.houses)||!G.houses.length||!svObj(G.rep)||!Array.isArray(G.nests)||G.towns.some(t=>typeof t.own!=='string'||!Array.isArray(t.sit)||!Array.isArray(G.rivals))))factionsInit(G);else if(G&&Array.isArray(G.houses)&&G.houses.length&&(!FACT[G.houses[0].id]||(Array.isArray(G.rivals)&&G.rivals.length&&!FACT[G.rivals[0].id])))houseFactReg(G)}

/* ---- reputation ---- */
function repOf(f){const rv=rivalById(f);if(rv)return svFin(rv.stance)?rv.stance:0;if(!humanFact(f))return FACT[f]?-100:0;return G&&G.rep&&svFin(G.rep[f])?G.rep[f]:0}
function repTierIx(f){const v=repOf(f);let k=0;for(let i=0;i<REPT.length;i++)if(v>=REPT[i].min)k=i;return k}
function repTier(f){return REPT[repTierIx(f)]}
/* repGain(f, n, why): changes the standing with a human faction (monsters ignore it). Proud houses take losses twice as hard. Clamped to
   -100..100, logged in G.repLog (last 30) and a toast says when the tier changes. Returns the change actually made. */
function repGain(f,n,why){const rv=rivalById(f);if(!G||!(rv||humanFact(f))||!svFin(n)||!n)return 0;worldEnsure();const h=houseById(f),P=h&&HPERS[h.pers];if(n<0&&P&&P.proud>1)n*=P.proud;n=Math.round(n);
 const v0=repOf(f),t0=repTierIx(f),v=clamp(v0+n,-100,100);if(rv)rv.stance=v;else G.rep[f]=v;const d=v-v0;if(!d)return 0;
 G.repLog.push({day:G.day,f,n:d,why:typeof why==='string'?why.slice(0,80):''});if(G.repLog.length>30)G.repLog.splice(0,G.repLog.length-30);
 const t1=repTierIx(f);if(t1!==t0&&typeof toast==='function'){const T=REPT[t1];try{toast(`${factName(f)}: ${T.n.toLowerCase()}${t1===0?(rv?'. They will fight the company on sight':'. Their markets close and their patrols hunt you'):t1>t0?'. They think better of you':''}`)}catch(e){}}
 return d}

/* ---- rival mercenary companies: the small lookups (the simulation is in 40-world.js "RIVAL COMPANIES") ----
   G.rivals = [{id:'r0', n, short, c1, c2, emblem, pers, renown, crowns, home, roster, stance, alive, day, deeds, ...}]. Their standing with the
   company is rv.stance, read and changed through repOf / repTier / repGain like a house's. Each one is registered in FACT (house soldiers'
   units as a fallback, its banner colour) with house:1 rival:1, so FACT[p.f] lookups work and it never spawns as a monster faction. */
function isRival(f){return typeof f==='string'&&f[0]==='r'&&!!rivalById(f)}
function rivalById(id){if(typeof id!=='string'||id[0]!=='r'||!G||!Array.isArray(G.rivals))return null;for(const r of G.rivals)if(r&&r.id===id)return r;return null}
function rivalFactReg(g){g=g||G;if(!g||!Array.isArray(g.rivals))return;for(const r of g.rivals){if(!r||typeof r.id!=='string')continue;const c=typeof BANNERC!=='undefined'&&BANNERC[r.c1]?PAL[BANNERC[r.c1].r[1]]:'#6a5a4a';
  FACT[r.id]={n:r.n,g:'R',col:c,skin:'#d9b99a',tier:'early',house:1,rival:1,biomes:null,lair:'Fight '+r.n,units:HOUSEUNITS,rank:[.5,1.15,.3,19],loot:HOUSELOOT.filter(id=>ITEMS[id])}}}

/* ---- town economy: every factor with its reason ---- */
function goodMatch(g,id){const S=GOODS[g],it=ITEMS[id];if(!S||!S.items||!it)return false;const I=S.items;
 if(I.wt&&it.k==='w'&&I.wt.includes(it.wt))return true;
 if(I.k&&I.k.includes(it.k)){if(I.heavy)return(it.arm||0)>=150;if(I.light)return(it.arm||0)<=95;return true}
 if(I.spell&&it.spell)return true;return false}
/* townPriceWhy(i, kind, itemId?): [{k, why}] every factor on a price at town i. kind: 'buy' (gear the company buys), 'sell' (what the town pays
   for gear: higher is better for you), 'food', 'tools', 'hire' (recruits' signing fee). With itemId, specialties of that item count. */
function townPriceWhy(i,kind,id){const t=G&&G.towns&&G.towns[i],out=[];if(!t)return out;worldEnsure();kind=kind||'buy';const sell=kind==='sell';
 const T=repTier(t.own),RK=REPK[T.k],rk=sell?RK.sell:kind==='hire'?RK.hire:RK.buy;if(rk!==1)out.push({k:rk,why:`${T.n} with ${factName(t.own)}`});
 const h=houseById(t.own),P=h&&HPERS[h.pers];if(P&&P.greed!==1&&!sell)out.push({k:P.greed,why:`${h.n} is ${P.n.toLowerCase()}`});
 for(const s of t.sit){const S=SITS[s.k];if(!S)continue;let k=1;if(kind==='hire')k=S.recruits>1?.95:S.recruits<.6?1.1:1;else k=S.price[kind==='food'?'food':sell?'sell':'buy']||1;if(kind==='tools'&&s.k==='famine')k=1;if(k!==1)out.push({k,why:S.n})}
 const p=svNum(t.pros,50),pk=sell?.94+p*.0012:kind==='hire'?1:1.08-p*.0016;if(Math.abs(pk-1)>.015)out.push({k:Math.round(pk*100)/100,why:p>=60?'A prosperous town':p<40?'A poor town':'Prosperity'});
 for(const g of t.spec||[]){const S=GOODS[g];if(!S)continue;if(S.kind===kind||(kind==='buy'&&id&&goodMatch(g,id)))out.push({k:S.k,why:`Specialty: ${S.n.toLowerCase()}`})}
 return out}
function townPriceK(i,kind,id){let k=1;for(const x of townPriceWhy(i,kind,id))k*=x.k;return Math.round(clamp(k,.4,3)*1000)/1000}
// closed markets: the town's owner is hostile to the company
function townHostile(i){const t=G&&G.towns&&G.towns[i];if(!t)return false;worldEnsure();return !!REPK[repTier(t.own).k].closed}
// recruit odds and counts: rep, situations, prosperity (1 = as before)
function townRecruitK(i){const t=G&&G.towns&&G.towns[i];if(!t)return 1;worldEnsure();let k=REPK[repTier(t.own).k].recruit*(.8+svNum(t.pros,50)*.004);for(const s of t.sit)if(SITS[s.k])k*=SITS[s.k].recruits;return Math.round(k*100)/100}
// weight factor for a contract type at town i: situations, and how much work the owner gives you (rep)
function townCtrK(i,type){const t=G&&G.towns&&G.towns[i];if(!t)return 1;worldEnsure();let k=REPK[repTier(t.own).k].ctr;for(const s of t.sit){const S=SITS[s.k];if(S&&S.contracts&&S.contracts[type])k*=S.contracts[type]}return Math.round(k*100)/100}
// market stock factor (how many items the stalls carry): prosperity and situations
function townStockK(i){const t=G&&G.towns&&G.towns[i];if(!t)return 1;worldEnsure();let k=.75+svNum(t.pros,50)*.005;for(const s of t.sit)if(SITS[s.k])k*=SITS[s.k].stock||1;return Math.round(k*100)/100}
function townHas(i,key){const t=G&&G.towns&&G.towns[i];if(!t)return false;worldEnsure();return Array.isArray(t.bld)&&t.bld.includes(key)}
function townSit(i,k){const t=G&&G.towns&&G.towns[i];if(!t||!Array.isArray(t.sit))return null;for(const s of t.sit)if(s.k===k)return s;return null}
// adds (or lengthens) situation k at town i; days defaults to the middle of SITS[k].dur; extra fields (by: the besieging house) are copied
function townSitAdd(i,k,days,extra){const t=G&&G.towns&&G.towns[i],S=SITS[k];if(!t||!S)return null;worldEnsure();let s=townSit(i,k);const d=Math.max(1,Math.round(svFin(days)?days:(S.dur[0]+S.dur[1])/2));
 if(s)s.days=Math.max(s.days,d);else{s={k,days:d};t.sit.push(s)}if(extra)Object.assign(s,extra);
 if(k==='festival'||k==='boom')t.sit=t.sit.filter(x=>x.k!=='famine'||k!=='boom');if(k==='raided'||k==='siege')t.sit=t.sit.filter(x=>x.k!=='festival'&&x.k!=='boom');return s}
function townSitDel(i,k){const t=G&&G.towns&&G.towns[i];if(!t||!Array.isArray(t.sit))return false;const n=t.sit.length;t.sit=t.sit.filter(s=>s.k!==k);return t.sit.length<n}

/* ---- houses between themselves ---- */
function hrKey(a,b){return a<b?a+'|'+b:b+'|'+a}
function houseRel(a,b){if(a===b)return 100;if(!isHouse(a)||!isHouse(b))return humanFact(a)&&humanFact(b)?0:-100;return svNum(G.hrel&&G.hrel[hrKey(a,b)],0)}
function atWar(a,b){if(!G||!Array.isArray(G.wars))return false;const k=hrKey(a,b);return G.wars.some(w=>hrKey(w.a,w.b)===k)}
/* houseRelation(a, b): 'self' | 'war' | 'tense' | 'peace' | 'ally' (monsters are always 'war' with everyone human) */
function houseRelation(a,b){if(a===b)return 'self';if(!humanFact(a)||!humanFact(b))return 'war';if(atWar(a,b))return 'war';const v=houseRel(a,b);return v<-20?'tense':v>45?'ally':'peace'}

/* ---- buildings: what each one does (bldServe) ----
   bldServe(i, key, arg) -> {ok, msg, ...}. arg {op, ...}; without op it describes the building: {ok, key, n, d, offers:[{op, n, d, cost?, why?}]}.
     armorer      op 'stock' -> {items}   top-tier armor and helmets (one tier above the market);   op 'repair' -> mends all armor for crowns
     weaponsmith  op 'stock' -> {items}   top-tier melee weapons;   fletcher op 'stock' -> ranged weapons
     college      op 'hint', m (merc id) -> {text} reads the gift;  op 'stock' -> {items} foci and staves;  op 'respec', m, tree -> unlearns one tree
                  op 'respecCost', m, tree -> {cost, n}
     hall         op 'train', m -> {xp, cost} trains for crowns (3 hours, no daily cap);  op 'trainCost', m -> {xp, cost}
     harbour      op 'list' -> {list:[{to, n, cost, days}]};  op 'sail', to -> pays, sails (advanceTime), sets the company at that town
   Refuses (ok:false, msg) when the town lacks the building, its markets are closed, or crowns run short. Uses no randomness except the
   time it passes (advanceTime). */
const BLDK={repairPt:.35,respec0:150,respecPer:60,hallK:1.25,sailBase:40,sailPer:6,sailTiles:22};
function bldMerc(id){return G&&G.roster?G.roster.find(m=>m.id===id)||null:null}
function bldTop(i,f,n){const t=G.towns[i],cap=Math.min(5,(typeof marketTier==='function'?marketTier(t.size,G.day):2)+1);
 return Object.keys(ITEMS).filter(k=>{const it=ITEMS[k];return!it.uniq&&!it.famed&&(it.tier||1)<=cap&&f(it)}).sort((a,b)=>(ITEMS[b].tier||1)-(ITEMS[a].tier||1)||ITEMS[b].price-ITEMS[a].price||(a<b?-1:1)).slice(0,n||6)}
function bldPrice(i,base,kind){return Math.max(1,Math.round(base*townPriceK(i,kind||'buy')/5)*5)}
function harbourList(i){const t=G.towns[i],out=[];if(!t||!townHas(i,'harbour'))return out;G.towns.forEach((o,j)=>{if(j===i||!Array.isArray(o.bld)||!o.bld.includes('harbour'))return;const d=Math.hypot(o.x-t.x,o.y-t.y)/TS;
  out.push({to:j,n:o.name,days:Math.max(1,Math.ceil(d/BLDK.sailTiles)),cost:bldPrice(i,BLDK.sailBase+G.roster.length*8+d*BLDK.sailPer),closed:townHostile(j)})});return out}
function bldTrainInfo(i,m){const lv=m.lvl||1,max=lv>=MAXLV||!XPT[lv+1],gap=max?0:XPT[lv+1]-XPT[lv];return{xp:max?0:Math.round(40+gap*.12),cost:bldPrice(i,(25+12*lv)*BLDK.hallK,'hire'),hours:3,why:max?'At the highest level':''}}
function bldRespecInfo(i,m,tree){const P=Array.isArray(m.perks)?m.perks.filter(id=>{const p=typeof perkById==='function'?perkById(id):null;return p&&p.key===tree}):[];return{n:P.length,perks:P,cost:bldPrice(i,(BLDK.respec0+BLDK.respecPer*P.length)*(typeof originK==='function'?originK('college'):1))}}
function bldList(i){const t=G&&G.towns&&G.towns[i];return t&&Array.isArray(t.bld)?t.bld.slice():[]}
function bldServe(i,key,arg){const t=G&&G.towns&&G.towns[i],B0=BLD[key];if(!t||!B0)return{ok:false,msg:'No such place'};worldEnsure();arg=arg||{};const op=arg.op||'info';
 if(!t.bld.includes(key))return{ok:false,msg:`${t.name} has no ${B0.n.toLowerCase()}`};
 if(op!=='info'&&townHostile(i))return{ok:false,msg:`${factName(t.own)} will not deal with you`};
 const pay=c=>{if((G.crowns||0)<c)return false;G.crowns-=c;return true};
 if(op==='info'){const offers=[];
  if(key==='armorer'){const need=typeof repairNeed==='function'?repairNeed().pts:0,c=bldPrice(i,need*BLDK.repairPt);offers.push({op:'stock',n:'Browse armor',d:'Top-tier armor and helmets.'},{op:'repair',n:'Full repair',d:need?`Mend ${need} armor points without tools.`:'Nothing needs mending.',cost:need?c:0,why:need?'':'Nothing to mend'})}
  else if(key==='weaponsmith'||key==='fletcher')offers.push({op:'stock',n:'Browse',d:B0.d});
  else if(key==='college')offers.push({op:'hint',n:'Read a gift',d:'Learn what gift a sword carries and how to wake it.'},{op:'stock',n:'Foci and staves',d:'Casting gear.'},{op:'respec',n:'Unlearn a tree',d:`Takes back one tree's perks and returns the points. From ${bldPrice(i,BLDK.respec0)} crowns.`});
  else if(key==='hall')offers.push({op:'train',n:'Train a sword',d:'Three hours of drill for crowns, no daily limit.'});
  else if(key==='harbour')offers.push({op:'list',n:'Book passage',d:harbourList(i).length?'Ships to: '+harbourList(i).map(x=>x.n).join(', '):'No ships sail from here.'});
  return{ok:true,key,n:B0.n,d:B0.d,offers}}
 if(op==='stock'){let f=null;if(key==='armorer')f=it=>it.k==='a'||it.k==='h';else if(key==='weaponsmith')f=it=>it.k==='w'&&!isRangedW(it)&&!it.spell;else if(key==='fletcher')f=it=>it.k==='w'&&isRangedW(it);else if(key==='college')f=it=>it.k==='w'&&!!it.spell;
  if(!f)return{ok:false,msg:'Nothing for sale here'};return{ok:true,items:bldTop(i,f,key==='armorer'?8:6)}}
 if(key==='armorer'&&op==='repair'){const need=typeof repairNeed==='function'?repairNeed().pts:0;if(!need)return{ok:false,msg:'Nothing needs mending'};const c=bldPrice(i,need*BLDK.repairPt);if(!pay(c))return{ok:false,msg:'Not enough crowns',cost:c};
  for(const m of G.roster)delete m.cond;return{ok:true,cost:c,pts:need,msg:`The armorer mends ${need} points of armor for ${c} crowns`}}
 if(key==='college'&&op==='hint'){const m=bldMerc(arg.m);if(!m)return{ok:false,msg:'Pick a sword'};const r=typeof mercRes==='function'?mercRes(m):null,aw=r&&Array.isArray(m.perks)&&m.perks.some(id=>{const p=typeof perkById==='function'?perkById(id):null;return p&&p.kind==='gift'});
  return{ok:true,text:r?`${m.name} carries the gift of ${RESN[r]}${aw?', and it is awake.':'. It sleeps: spend a perk point in the '+RESN[r]+' tree to wake it.'}`:`${m.name} carries no gift. Steel and nerve will have to do.`}}
 if(key==='college'&&(op==='respec'||op==='respecCost')){const m=bldMerc(arg.m);if(!m)return{ok:false,msg:'Pick a sword'};const I=bldRespecInfo(i,m,arg.tree);if(op==='respecCost')return Object.assign({ok:true},I);
  if(!I.n)return{ok:false,msg:'Nothing learned in that tree'};if(!pay(I.cost))return{ok:false,msg:'Not enough crowns',cost:I.cost};
  m.perks=m.perks.filter(id=>!I.perks.includes(id));m.pp=Math.max(0,Math.floor(svNum(m.pp,0)))+I.n;if(typeof syncMast==='function')syncMast(m);m.hp=Math.min(m.hp,calc(m).hp);
  return{ok:true,cost:I.cost,n:I.n,msg:`${m.name} unlearns ${I.n} perk${I.n===1?'':'s'} for ${I.cost} crowns`}}
 if(key==='hall'&&(op==='train'||op==='trainCost')){const m=bldMerc(arg.m);if(!m)return{ok:false,msg:'Pick a sword'};const I=bldTrainInfo(i,m);if(op==='trainCost')return Object.assign({ok:true},I);if(I.why)return{ok:false,msg:I.why};
  if(!pay(I.cost))return{ok:false,msg:'Not enough crowns',cost:I.cost};const l0=m.lvl;gainXP(m,I.xp);if(typeof advanceTime==='function')advanceTime(I.hours);
  return{ok:true,xp:I.xp,cost:I.cost,lvl:m.lvl>l0,msg:`${m.name} drills for ${I.hours} hours: +${I.xp} XP${m.lvl>l0?', level '+m.lvl+'!':''}`}}
 if(key==='harbour'&&op==='list')return{ok:true,list:harbourList(i)};
 if(key==='harbour'&&op==='sail'){const L=harbourList(i),x=L.find(o=>o.to===arg.to);if(!x)return{ok:false,msg:'No ship sails there'};if(x.closed)return{ok:false,msg:`${G.towns[x.to].name} is closed to you`};if(!pay(x.cost))return{ok:false,msg:'Not enough crowns',cost:x.cost};
  const o=G.towns[x.to];if(typeof clearRoute==='function')clearRoute();G.p={x:o.x,y:okAt(o.x,o.y+.65*TS)?o.y+.65*TS:o.y};if(typeof advanceTime==='function')advanceTime(x.days*24);G.town=null;if(W)W.fogKey=-1;if(typeof fogReveal==='function')fogReveal();G.grace=Math.max(G.grace||0,3);
  return{ok:true,to:x.to,cost:x.cost,days:x.days,msg:`The company sails to ${o.name}: ${x.days} day${x.days===1?'':'s'} at sea, ${x.cost} crowns`}}
 return{ok:false,msg:'Not offered here'}}
