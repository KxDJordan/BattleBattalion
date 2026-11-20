/* ================= COMPANY PROGRESSION: renown tiers, ambitions, the retinue (progression agent) =================
   Data (CONTRACT.md "Renown, ambitions, retinue"):
     RENOWN[i]       {n, min, diff, ft, dw, pay, lv:[lo,hi], vet, slots, rare, d}   tier i+1; renownTier(r) -> 1..6
     AMBITIONS[id]   {n, d, kind, icon, test(g)->[progress, goal], reward:{renown, crowns, item?, tools?, food?}, req?(g), team? (needs several swords: never offered to a solo run)}
     FOLLOWERS[id]   {n, d, cost, renown (tier needed), effect, icon:'fol-<id>', wired}
   Company state:    G.retinue [ids]   G.amb {cur, done:[ids], offered:[ids], st:{counters}, base:{counters when cur was taken},
                                              days:{id: day fulfilled}, cel:[{k:'amb',id}|{k:'tier',t}] notes still to show, rt: tier last told}
   Public: renownTier renownDef renownInfo followerHas followerSlots followerCan hireFollower dismissFollower wageOf companyWages
           recruitCost recruitBG makeVeteran bandIntel ambProgress ambOffer ambPick ambDrop ambEvent ambTick ambNotify openAmbitions
           companyRepair companyNew
   No UI path ever draws game randomness: offers come from a hash of the seed; only rewards (an item) and recruits use rnd(). */

/* ---- renown tiers ----
   How renown is earned (68-battle-flow.js, 50-towns.js): +3 a band beaten, +8 per skull of a contract fulfilled, +50 a rift closed,
   -5 a contract failed or abandoned, plus ambitions (10-80). A first week of steady work (5-8 fights, 2-3 contracts) is 40-70:
   Known is there by day 5-8. Legendary (1000) is a late campaign: the crisis rifts, five-skull hunts and a dozen ambitions. */
const RENOWN=[
 {n:'Unknown',  min:0,   diff:2,ft:'early',dw:[3,2,0,0,0],pay:1,   lv:[1,1],vet:0,  slots:1,rare:.35,d:'Nobody has heard of the banner yet.'},
 {n:'Known',    min:50,  diff:3,ft:'mid',  dw:[2,3,1,0,0],pay:1.1, lv:[2,3],vet:.3,slots:2,rare:.6, d:'Innkeepers know the name and boards post grave work.'},
 {n:'Respected',min:150, diff:3,ft:'mid',  dw:[1,3,2,0,0],pay:1.2, lv:[3,5],vet:.4,slots:2,rare:1,  d:'Captains ask for the company by name.'},
 {n:'Renowned', min:330, diff:4,ft:'late', dw:[0,2,3,1,0],pay:1.3, lv:[4,7],vet:.5,slots:3,rare:1.5,d:'Lords send for the company with deadly work.'},
 {n:'Famed',    min:600, diff:5,ft:'end',  dw:[0,1,3,2,1],pay:1.4, lv:[5,9],vet:.55,slots:4,rare:2.2,d:'Songs are sung of it in every tavern.'},
 {n:'Legendary',min:1000,diff:5,ft:'end',  dw:[0,1,2,3,2],pay:1.5, lv:[6,10],vet:.65,slots:5,rare:3,  d:'A name that wins battles before they start.'}];
const FT_RANK={early:0,mid:1,late:2,end:3};
const DIFFN=['Light','Serious','Grave','Deadly','Dire'];
function cmpG(g){return g||G}
function renownTier(r){if(r===undefined||r===null)r=G?G.renown:0;r=+r||0;let t=1;for(let i=0;i<RENOWN.length;i++)if(r>=RENOWN[i].min)t=i+1;return t}
function renownDef(t){return RENOWN[clamp((t||renownTier())-1,0,RENOWN.length-1)]}
// {tier, n, renown, next (renown of the next tier, null at the top), progress 0..1 toward it, min, def}
function renownInfo(g){g=cmpG(g);const r=Math.max(0,Math.round(g&&+g.renown||0)),t=renownTier(r),D=RENOWN[t-1],N=RENOWN[t]||null;
 return{tier:t,n:D.n,renown:r,next:N?N.min:null,min:D.min,progress:N?clamp((r-D.min)/(N.min-D.min),0,1):1,def:D,nextN:N?N.n:null}}
// what a tier opens, as lines for the player
function renownUnlocks(t){const D=renownDef(t),P=RENOWN[t-2];const L=[];
 if(!P||D.diff>P.diff)L.push(`Contracts up to ${D.diff} skulls (${DIFFN[D.diff-1].toLowerCase()})`);
 if(!P||D.ft!==P.ft)L.push(D.ft==='early'?'Hunts against the common foes':D.ft==='mid'?'Hunts against serpents, ents and ogres':D.ft==='late'?'Hunts against the deadlier foes':'Hunts against wyverns and the end of the world');
 if(!P||D.pay!==P.pay)L.push(`Contract pay x${D.pay}`);
 if(D.vet&&(!P||D.lv[1]!==P.lv[1]))L.push(`Veterans up to level ${D.lv[1]} in taverns`);
 if(!P||D.slots!==P.slots)L.push(`${D.slots} follower slot${D.slots===1?'':'s'}`);
 if(P&&D.rare>P.rare)L.push('Rarer backgrounds in taverns');
 return L}

/* ---- the retinue ----
   wired: where the effect lives. world/town effects are read here and in 40-world.js / 50-towns.js / 68-battle-flow.js;
   battle and merc effects (cook, banner, surgeon, armorer) are read by the rules and camp through followerHas(id). */
const FOLLOWERS={
 scout:    {n:'Scout',          cost:500, renown:1,effect:'+2 tiles of sight, day and night. Reads every band’s strength exactly.',d:'A poacher who knows every deer path and every ambush spot.',wired:'40-world visionRadius, bandIntel'},
 quarter:  {n:'Quartermaster',  cost:650, renown:1,effect:'Rations last 25% longer: each sword eats 0.8 a day.',d:'Counts every biscuit twice and every barrel thrice.',wired:'40-world newDay'},
 cook:     {n:'Cook',           cost:450, renown:1,effect:'+5 resolve at the start of every battle. Wounds mend 25% faster on the road.',d:'Hot stew before a fight is worth a sergeant.',wired:'rules battle start; 40-world advanceTime'},
 carto:    {n:'Cartographer',   cost:800, renown:2,effect:'+15% march speed on roads.',d:'Carries the land in rolled vellum and knows every short cut.',wired:'40-world worldTick'},
 recruiter:{n:'Recruiter',      cost:900, renown:2,effect:'Recruits cost 25% less. One more recruit in every tavern.',d:'Buys the first round and the second signature.',wired:'50-towns stockTown, hire'},
 surgeon:  {n:'Surgeon',        cost:1100,renown:2,effect:'Injuries heal 50% faster. Field surgery costs less.',d:'Steady hands, a bone saw and no stomach left to turn.',wired:'rules healInjuriesDaily; camp surgery'},
 armorer:  {n:'Armorer',        cost:900, renown:2,effect:'Every tool mends 50% more armor.',d:'Rivets, rings and a hammer that never rests.',wired:'rules repairAll'},
 drill:    {n:'Drillmaster',    cost:1200,renown:3,effect:'+20% experience from battles. Training at camp costs less.',d:'Shouts until the line moves as one.',wired:'68-battle-flow resolveBattle; camp training'},
 herbalist:{n:'Herbalist',      cost:1000,renown:3,effect:'Each kind of monster part dropped has a 50% chance of one more.',d:'Knows which gland is worth the knife.',wired:'68-battle-flow resolveBattle (partsDrop)'},
 paymaster:{n:'Paymaster',      cost:1400,renown:3,effect:'Daily wages 15% lower.',d:'Pays on time, to the copper, and never a copper more.',wired:'40-world newDay (wageOf)'},
 banner:   {n:'Standard-bearer',cost:1600,renown:4,effect:'+5 resolve to every fielded sword in battle.',d:'Where the banner stands, the company stands.',wired:'rules battle morale'}};
for(const k in FOLLOWERS)FOLLOWERS[k].icon='fol-'+k;
function followerHas(id){return!!(G&&Array.isArray(G.retinue)&&G.retinue.includes(id))}
function followerSlots(g){g=cmpG(g);return renownDef(renownTier(g?g.renown:0)).slots}
// {ok, why}
function followerCan(id){const F=FOLLOWERS[id];if(!F)return{ok:false,why:'Nobody of that name'};if(followerHas(id))return{ok:false,why:'Already with the company'};
 const t=renownTier();if(t<F.renown)return{ok:false,why:`Needs the company to be ${RENOWN[F.renown-1].n}`,tier:true};
 if((G.retinue||[]).length>=followerSlots())return{ok:false,why:'Every follower slot is taken',full:true};
 if(G.crowns<F.cost)return{ok:false,why:'Not enough crowns',poor:true};return{ok:true,why:''}}
function hireFollower(id){const c=followerCan(id);if(!c.ok){if(typeof toast==='function')toast(c.why);return false}
 G.crowns-=FOLLOWERS[id].cost;if(!Array.isArray(G.retinue))G.retinue=[];G.retinue.push(id);ambTick();return true}
function dismissFollower(id){if(!followerHas(id))return false;G.retinue=G.retinue.filter(x=>x!==id);return true}

/* ---- economy helpers read by 40-world.js and 50-towns.js ---- */
// a merc's daily wage: the rules' mercWage(m) when they provide one, else the background's wage plus trait wages
// (TRAITS[k].wage: a fraction below 1 is a share of the base wage, else crowns), then the sword's level (WAGELV: a veteran asks more, +10% a level
// past the first), then the paymaster.
const WAGELV=.1;
function wageLvK(m){return 1+WAGELV*Math.max(0,Math.min(typeof MAXLV==='number'?MAXLV:15,(m&&m.lvl)|0||1)-1)}
function wageOf(m){if(!m||!BG[m.bg])return 0;let w;
 if(typeof mercWage==='function'){try{w=mercWage(m)}catch(e){w=null}}
 if(typeof w!=='number'||!isFinite(w)){const b=BG[m.bg].wage||0;w=b;if(Array.isArray(m.traits)&&typeof TRAITS==='object'&&TRAITS)for(const k of m.traits){const T=TRAITS[k];if(T&&typeof T.wage==='number'&&isFinite(T.wage))w+=Math.abs(T.wage)<1?b*T.wage:T.wage}}
 return Math.max(0,w*wageLvK(m)*(followerHas('paymaster')?.85:1)*(typeof originK==='function'?originK('wage'):1)*(typeof runModK==='function'?runModK('wage',1):1))}
function companyWages(){let w=0;if(G&&G.roster)G.roster.forEach(m=>w+=wageOf(m));return Math.round(w)}
// hiring price of a recruit: the background's price, a third more per level beyond the first, a quarter off with the recruiter
function recruitCost(m){if(!m||!BG[m.bg])return 0;const c=BG[m.bg].cost*(1+.35*Math.max(0,(m.lvl||1)-1));return Math.max(5,Math.round(c*(followerHas('recruiter')?.75:1)/5)*5)}
// tavern backgrounds: the rules' bgWeight(key, town) when it exists, else BG[key].w; rare ones (weight 1 or less) scale with renown,
// and with the standing of the town's owner (REPK[tier].recruit: friends send their best, a cold house its worst),
// and a background whose BG.bio / BG.biomes lists the town's ground is twice as common there. Seeded.
function recruitBG(t){const ti=G&&G.towns&&t?G.towns.indexOf(t):-1,RQ=ti>=0&&typeof repTier==='function'&&typeof REPK!=='undefined'&&t.own?REPK[repTier(t.own).k].recruit:1,ks=Object.keys(BG),R=renownDef().rare*RQ,bio=t&&typeof tileAt==='function'&&W?BIOKEY[tileAt(t.x,t.y)]:null,ws=[];let tot=0;
 for(const k of ks){const b=BG[k];let w=typeof bgWeight==='function'?+bgWeight(k,t):+b.w;if(!(w>0))w=0;if(b.w<=1)w*=R;
  const bl=b.bio||b.biomes;if(bio&&Array.isArray(bl)&&bl.includes(bio))w*=2;if(t&&b.size&&+t.size<+b.size)w*=.25;ws.push(w);tot+=w}
 if(!(tot>0))return typeof wpickBG==='function'?wpickBG():ks[0];let x=rnd()*tot;for(let i=0;i<ks.length;i++){x-=ws[i];if(x<=0)return ks[i]}return ks[ks.length-1]}
// raises a fresh recruit to level L: the level-up rolls are spent on its three best talents (ties at random) and its perk points
// on the build autoLearn() picks for it. Seeded.
function makeVeteran(m,L){L=clamp(Math.floor(L||1),1,typeof MAXLV==='number'?MAXLV:15);if(L<=m.lvl)return m;gainXP(m,Math.max(0,XPT[L]-m.xp));
 const keys=Object.keys(ROLL);while(m.pend>0){const ks=shuffle(keys.slice()).sort((a,b)=>(m.tal[b]||0)-(m.tal[a]||0)).slice(0,3);
  for(const k of ks){const t=m.tal[k]||0;m.base[k]=(m.base[k]||0)+ri(ROLL[k][0]+Math.floor(t/2),ROLL[k][1]+Math.ceil(t/2))}m.pend--}
 m.rolls=null;if(typeof autoLearn==='function')autoLearn(m);if(typeof syncMast==='function')syncMast(m);m.hp=calc(m).hp;m.vet=1;return m}
// what the scout reads of a band: null without a scout, else {line, mult, str, count}
function bandIntel(p){if(!p||!followerHas('scout')||!FACT[p.f])return null;const pct=Math.round((p.mult||1)*100),F=FACT[p.f];
 const who=typeof partyLabel==='function'&&p.goal&&p.goal!=='roam'?partyLabel(p):F.n;
 return{mult:p.mult,str:typeof partyStrength==='function'?partyStrength(p):0,pct,line:`Your scout counts them: ${pct}% of an even fight for the company, ${p.goal&&p.goal!=='roam'?who:who.charAt(0).toLowerCase()+who.slice(1)}.`}}

/* ---- ambitions ---- */
const AMB_MONF=['beast','serpent','ent','ogre'];
function ambSt(g){g=cmpG(g);return g&&g.amb&&g.amb.st||{}}
function ambSince(g,k){const a=g&&g.amb;if(!a||!a.st)return 0;return Math.max(0,(a.st[k]||0)-((a.base&&a.base[k])||0))}
function ambOwned(g){const L=[];if(!g)return L;(g.stash||[]).forEach(id=>L.push(id));(g.roster||[]).forEach(m=>{if(m&&m.eq)for(const k in m.eq)if(m.eq[k])L.push(m.eq[k])});return L}
function ambFielded(g){return(g&&g.roster||[]).filter(m=>m&&m.field).slice(0,typeof MAXFIELD==='number'?MAXFIELD:12)}
const AMBITIONS={
 muster:  {n:'Muster a war band',team:1,kind:'company',icon:'swords',d:'Field eight swords at once.',test:g=>[ambFielded(g).length,8],reward:{renown:15,crowns:250}},
 line12:  {n:'A full battle line',team:1,kind:'company',icon:'company',d:'Field twelve swords at once.',req:g=>(g.roster||[]).length>=7,test:g=>[ambFielded(g).length,12],reward:{renown:30,crowns:500}},
 wins10:  {n:'Ten victories',kind:'war',icon:'sword',d:'Win ten battles.',test:g=>[ambSince(g,'wins'),10],reward:{renown:25,crowns:400}},
 streak5: {n:'Unbroken',kind:'war',icon:'shield',d:'Win five battles in a row without a sword killed.',test:g=>[g.amb&&g.amb.cur==='streak5'?Math.min(5,ambSt(g).streak||0):0,5],reward:{renown:30,item:'gear'}},
 slay50:  {n:'Fifty foes',kind:'war',icon:'skull',d:'Slay fifty foes.',test:g=>[ambSince(g,'kills'),50],reward:{renown:20,crowns:300}},
 wyvern:  {n:'Wyvernslayer',kind:'hunt',icon:'skull',d:'Slay a wyvern.',req:g=>renownTier(g.renown)>=4||g.day>=30,test:g=>[ambSince(g,'wyv'),1],reward:{renown:80,crowns:1500,item:'gear'}},
 rift:    {n:'Seal a rift',kind:'hunt',icon:'mana',d:'Fight through a rift and close it.',req:g=>!!g.crisis&&(g.portals||[]).length>0,test:g=>[ambSince(g,'rifts'),1],reward:{renown:40,crowns:600}},
 lairs:   {n:'Beastbreaker',kind:'hunt',icon:'board',d:'Clear a lair of beasts, serpents, ents and ogres (one of each kind).',req:g=>renownTier(g.renown)>=2,
           test:g=>{const L=AMB_MONF.filter(f=>FACT[f]),s=ambSt(g).lairs||{};return[L.filter(f=>s[f]).length,L.length]},reward:{renown:60,crowns:1200,item:'gear'}},
 grave:   {n:'Grave work',kind:'hunt',icon:'contract',d:'Fulfil a contract of three skulls or more.',req:g=>renownTier(g.renown)>=2,test:g=>[ambSince(g,'bigc'),1],reward:{renown:30,crowns:600}},
 contracts5:{n:'Steady work',kind:'wealth',icon:'contract',d:'Fulfil five contracts.',test:g=>[ambSince(g,'contracts'),5],reward:{renown:30,crowns:500}},
 chest:   {n:'A war chest',kind:'wealth',icon:'coin',d:'Hold 5,000 crowns at once.',test:g=>[Math.min(5000,Math.floor(g.crowns||0)),5000],reward:{renown:25,item:'gear'}},
 follower:{n:'A retinue',kind:'company',icon:'tavern',d:'Hire a follower in a tavern.',test:g=>[Math.min(1,(g.retinue||[]).length),1],reward:{renown:10,crowns:200}},
 retinue3:{n:'A proper household',kind:'company',icon:'tavern',d:'Keep three followers at once.',req:g=>renownTier(g.renown)>=3,test:g=>[Math.min(3,(g.retinue||[]).length),3],reward:{renown:35,crowns:800}},
 famed:   {n:'A blade with a name',kind:'wealth',icon:'star',d:'Carry a famed weapon.',req:g=>g.day>=15||renownTier(g.renown)>=3,
           test:g=>[(g.roster||[]).some(m=>m&&m.eq&&['w','b'].some(k=>ITEMS[m.eq[k]]&&ITEMS[m.eq[k]].famed))?1:0,1],reward:{renown:30,crowns:500}},
 craft:   {n:'Monster-forged',kind:'wealth',icon:'tools',d:'Own a piece of gear crafted from monster parts.',req:()=>typeof RECIPES!=='undefined',
           test:g=>[ambOwned(g).some(id=>ITEMS[id]&&ITEMS[id].craft)?1:0,1],reward:{renown:20,crowns:300,tools:20}},
 parts20: {n:'A trophy wagon',kind:'hunt',icon:'stash',d:'Carry twenty monster parts.',req:()=>typeof PARTS!=='undefined',
           test:g=>{let n=0;const P=g.parts||{};for(const k in P)n+=Math.max(0,+P[k]||0);return[Math.min(20,n),20]},reward:{renown:15,crowns:300}},
 tier3:   {n:'Respected',kind:'company',icon:'renown',d:'Raise the company’s renown to Respected.',req:g=>renownTier(g.renown)<3,test:g=>[Math.min(RENOWN[2].min,Math.floor(g.renown||0)),RENOWN[2].min],reward:{renown:0,crowns:600}},
 tier5:   {n:'Famed',kind:'company',icon:'renown',d:'Raise the company’s renown to Famed.',req:g=>renownTier(g.renown)>=3&&renownTier(g.renown)<5,test:g=>[Math.min(RENOWN[4].min,Math.floor(g.renown||0)),RENOWN[4].min],reward:{renown:0,crowns:2000,item:'gear'}},
 vet10:   {n:'A veteran',kind:'war',icon:'level',d:'Raise a sword to level 10.',test:g=>[Math.min(10,Math.max(0,...(g.roster||[]).map(m=>m&&m.lvl||0))),10],reward:{renown:30,crowns:800}},
 gifted3: {n:'The gifted',team:1,kind:'company',icon:'aura',d:'Field three swords who carry a gift.',test:g=>[Math.min(3,ambFielded(g).filter(m=>typeof mercRes==='function'?!!mercRes(m):!!m.gift).length),3],reward:{renown:20,crowns:400}},
 iron:    {n:'An iron line',team:1,kind:'war',icon:'armor',d:'Field six swords in tier III armor or better, each with a helmet.',
           test:g=>[Math.min(6,ambFielded(g).filter(m=>{const a=ITEMS[m.eq&&m.eq.a],h=ITEMS[m.eq&&m.eq.h],B=a&&a.famed&&ITEMS[a.base]?ITEMS[a.base]:a;return!!(B&&(B.tier||1)>=3&&h)}).length),6],reward:{renown:25,crowns:500}}};
function ambNew(){return{cur:null,done:[],offered:[],st:{},base:{},days:{},cel:[],rt:1}}
const AMB_CTR=['wins','kills','contracts','bigc','rifts','wyv','streak'];
// counted goals of an ambition not in hand read as if taken up now (0 so far)
function ambProgress(id,g){g=cmpG(g);const A=AMBITIONS[id];if(!A||!g)return{p:0,goal:1,done:false,pct:0};let r=[0,1];const a=g.amb,probe=a&&a.st&&a.cur!==id,b=probe?a.base:null;
 if(probe)a.base=ambSnap(a);try{r=A.test(g)}catch(e){r=[0,1]}finally{if(probe)a.base=b}
 const goal=Math.max(1,+r[1]||1),p=clamp(+r[0]||0,0,goal);return{p,goal,done:p>=goal,pct:Math.round(100*p/goal)}}
function ambHash(s){let h=2166136261;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
// tops the offer up to three: ambitions not fulfilled, allowed now and not already met; a mix of kinds first. Deterministic (no rnd).
function ambOffer(g){g=cmpG(g);const a=g.amb;if(!a)return[];const ok=id=>{const A=AMBITIONS[id];if(!A||a.done.includes(id)||id===a.cur)return false;if(A.team&&typeof canRecruit==='function'&&!canRecruit(g))return false;   // a solo run never raises a war band
  try{if(A.req&&!A.req(g))return false}catch(e){return false}return!ambProgress(id,g).done};
 a.offered=a.offered.filter(ok).slice(0,3);const salt=(g.seed|0)+'|'+a.done.length+'|'+(g.day|0),pool=Object.keys(AMBITIONS).filter(id=>ok(id)&&!a.offered.includes(id)).sort((x,y)=>ambHash(salt+x)-ambHash(salt+y)||(x<y?-1:1));
 while(a.offered.length<3&&pool.length){const kinds=a.offered.map(id=>AMBITIONS[id].kind);let j=pool.findIndex(id=>!kinds.includes(AMBITIONS[id].kind));if(j<0)j=0;a.offered.push(pool.splice(j,1)[0])}
 return a.offered}
function ambSnap(a){const b={};for(const k of AMB_CTR)b[k]=a.st[k]||0;return b}
// takes up an offered ambition (one at a time); progress of counted goals starts now
function ambPick(id){const a=G&&G.amb;if(!a||a.cur||!a.offered.includes(id)||!AMBITIONS[id])return false;a.cur=id;a.offered=a.offered.filter(x=>x!==id);a.st.streak=0;a.base=ambSnap(a);ambOffer();ambTick();return true}
// sets the current ambition aside: it goes back on offer
function ambDrop(){const a=G&&G.amb;if(!a||!a.cur)return false;const id=a.cur;a.cur=null;a.base={};a.offered=[id].concat(a.offered.filter(x=>x!==id)).slice(0,3);ambOffer();return true}
/* events from the campaign: 'battle' (the result record), 'lair' {f}, 'contract' (the contract), 'rift' */
function ambEvent(k,o){if(!G)return;if(!G.amb)G.amb=ambNew();const s=G.amb.st;o=o||{};
 if(k==='battle'){if(o.win){s.wins=(s.wins||0)+1;s.streak=(o.dead||[]).length?0:(s.streak||0)+1}else s.streak=0;
  const sl=o.slain||[];s.kills=(s.kills||0)+sl.length;s.wyv=(s.wyv||0)+sl.filter(x=>/^wyvern/.test(x)).length}
 else if(k==='lair'){if(!s.lairs)s.lairs={};if(o.f)s.lairs[o.f]=1}
 else if(k==='contract'){s.contracts=(s.contracts||0)+1;if((o.diff||1)>=3)s.bigc=(s.bigc||0)+1}
 else if(k==='rift')s.rifts=(s.rifts||0)+1;
 ambTick()}
// pays out a fulfilled ambition and notes a new renown tier. Returns the ambition id fulfilled, or null. Draws rnd only for an item reward.
function ambTick(){if(!G||!G.amb)return null;const a=G.amb;let got=null;
 if(a.cur&&AMBITIONS[a.cur]&&ambProgress(a.cur).done){const id=a.cur,R=AMBITIONS[id].reward||{},out={id,renown:R.renown||0,crowns:R.crowns||0,item:null,tools:R.tools||0,food:R.food||0};
  G.renown=(G.renown||0)+out.renown;G.crowns+=out.crowns;if(out.tools)G.tools=(G.tools||0)+out.tools;if(out.food)G.food+=out.food;
  if(R.item){const it=R.item==='gear'?ambGear():ITEMS[R.item]?R.item:null;if(it){G.stash.push(it);out.item=it}}
  a.done.push(id);a.days[id]=G.day;a.cur=null;a.base={};a.cel.push({k:'amb',id,item:out.item});ambOffer();got=id}
 const t=renownTier();if(!(a.rt>=1))a.rt=t;if(t>a.rt){for(let i=a.rt+1;i<=t;i++)a.cel.push({k:'tier',t:i});a.rt=t;ambOffer()}else if(t<a.rt)a.rt=t;
 if(a.cel.length>6)a.cel=a.cel.slice(-6);return got}
// a market piece one tier above what the company's renown would find on the stalls
function ambGear(){const mt=clamp(renownTier()+1,2,5),P=Object.keys(ITEMS).filter(k=>{const i=ITEMS[k];return!i.uniq&&!i.famed&&!i.craft&&['w','a','h','s'].includes(i.k)&&(i.tier||1)===mt});return P.length?pick(P):null}

/* ---- celebration notes: a pixel-framed sheet, one at a time, in the world or over a town panel (never during a battle) ---- */
function ambCelHTML(e){const fx=typeof reduced!=='undefined'&&reduced?'':' amb-anim';
 if(e.k==='tier'){const D=renownDef(e.t),L=renownUnlocks(e.t);
  return`<div class="amb-cel tier${fx}"><div class="amb-rays"></div><div class="amb-ic">${pxIcon('renown',48)}</div><div class="amb-kick">Renown tier ${e.t} of ${RENOWN.length}</div><h2 class="amb-h">${G.name?htmlEsc(G.name)+' is ':'The company is '}${D.n}</h2><p class="amb-p">${D.d}</p>${L.length?`<ul class="amb-ul">${L.map(x=>`<li>${pxIcon('check',16)}<span>${x}</span></li>`).join('')}</ul>`:''}<div class="row amb-row"><button class="pri" onclick="ambCelClose()">Onward</button></div></div>`}
 if(e.k==='first'){if(G.amb.cur)return'';const L=(G.amb.offered||[]).filter(id=>AMBITIONS[id]);
  return`<div class="amb-cel${fx}"><div class="amb-rays"></div><div class="amb-ic">${pxIcon('ambition',48)}</div><div class="amb-kick">A new banner</div><h2 class="amb-h">Choose an ambition</h2><p class="amb-p">Every company needs something to march for. Take up an ambition: fulfil it for renown, coin and gear, and the next one waits behind it.</p>${L.length?`<div class="amb-chips">${L.map(id=>`<span class="amb-chip">${pxIcon('ambition',16)}${AMBITIONS[id].n}</span>`).join('')}</div>`:''}<div class="row amb-row"><button onclick="ambCelClose()">Later</button><button class="pri" onclick="ambCelClose(1)">Choose an ambition</button></div></div>`}
 const A=AMBITIONS[e.id];if(!A)return'';const R=A.reward||{},chips=[];
 if(R.renown)chips.push(`<span class="amb-chip">${pxIcon('renown',16)}+${R.renown} renown</span>`);if(R.crowns)chips.push(`<span class="amb-chip">${pxIcon('coin',16)}${R.crowns} crowns</span>`);
 if(R.tools)chips.push(`<span class="amb-chip">${pxIcon('tools',16)}${R.tools} tools</span>`);if(e.item&&ITEMS[e.item])chips.push(`<span class="amb-chip it">${typeof pnItemIcon==='function'?pnItemIcon(e.item,16):''}${ITEMS[e.item].n}</span>`);
 return`<div class="amb-cel${fx}"><div class="amb-rays"></div><div class="amb-ic">${pxIcon('ambition',48)}</div><div class="amb-kick">Ambition fulfilled</div><h2 class="amb-h">${A.n}</h2><p class="amb-p">${A.d}</p><div class="amb-chips">${chips.join('')}</div><div class="row amb-row"><button onclick="ambCelClose()">Later</button><button class="pri" onclick="ambCelClose(1)">Choose the next ambition</button></div></div>`}
function ambCelClose(next){if(typeof closeSheet==='function')closeSheet();if(next)openAmbitions();else setTimeout(()=>ambNotify(),0)}
// shows the next note when the stage is free: true when one went up. Headless (no real page): the notes are only kept.
function ambNotify(){if(!G||!G.amb||!G.amb.cel.length||mode!=='world')return false;if(typeof tvCan==='function'&&!tvCan())return false;
 if(typeof pnSheetUp==='function'&&pnSheetUp())return false;if(!panelOpen()&&sheetOpen)return false;const e=G.amb.cel.shift(),h=ambCelHTML(e);if(!h)return false;sheet(h,'amb-sheet');return true}

/* ---- the ambitions panel: renown tier and progress, the ambition in hand, three on offer, those fulfilled ---- */
let ambSel=null;
function ambRows(){const a=G.amb,L=[];if(a.cur)L.push({id:a.cur,st:'cur'});a.offered.forEach(id=>L.push({id,st:'offer'}));a.done.slice().reverse().forEach(id=>L.push({id,st:'done'}));return L}
function ambReward(R){const b=[];if(R.renown)b.push(`${pnIcon('renown')}<b>+${R.renown}</b>`);if(R.crowns)b.push(`${pnIcon('coin')}<b>${R.crowns}</b>`);if(R.tools)b.push(`${pnIcon('tools')}<b>${R.tools}</b>`);if(R.item)b.push(`${pnIcon('stash')}<b>gear</b>`);return`<span class="amb-rw">${b.join('')}</span>`}
function ambClose(){if(G.townOpen)renderTown();else if(!closePanel()&&typeof closeSheet==='function')closeSheet()}
function ambPickUI(id){if(ambPick(id)){toast('Ambition taken up: '+AMBITIONS[id].n);ambSel=id;save()}openAmbitions(ambSel)}
function ambDropUI(){const id=G.amb.cur;if(ambDrop()){toast('Set aside: '+AMBITIONS[id].n);save()}openAmbitions(id)}
function openAmbitions(sel){if(!G)return;if(!G.amb)G.amb=ambNew();ambOffer();if(sel!==undefined)ambSel=sel;const rows=ambRows(),RI=renownInfo();
 if(ambSel!=='tier'&&!rows.some(r=>r.id===ambSel))ambSel=rows.length?rows[0].id:'tier';
 let list=`<div class="pn-row tw-row amb-tier${ambSel==='tier'?' on':''}" role="button" tabindex="0" onclick="openAmbitions('tier')"><span class="pn-lead">${pnIcon('renown','',32)}</span><span class="pn-rmain"><span class="pn-rt">${RI.n} <small>tier ${RI.tier} of ${RENOWN.length}</small></span><span class="pn-rs">${pnBar(RI.progress*100,'xp')}<small>${RI.next?RI.renown+' / '+RI.next+' to '+RI.nextN:RI.renown+' renown, the summit'}</small></span></span></div>`;
 const sec={cur:'In hand',offer:'On offer',done:'Fulfilled'};let last='';
 if(!G.amb.cur)list+=pnSec('In hand',0)+pnEmpty('No ambition yet. Take one up from those on offer.'),last='cur';
 for(const r of rows){if(r.st!==last){list+=pnSec(sec[r.st],r.st==='done'?G.amb.done.length:r.st==='offer'?G.amb.offered.length:undefined);last=r.st}const A=AMBITIONS[r.id],P=ambProgress(r.id);
  list+=pnRow({on:`openAmbitions('${r.id}')`,sel:ambSel===r.id,cls:'tw-row amb-r '+r.st,lead:pnIcon(A.icon||'star','',32),title:A.n,sub:r.st==='done'?`<span class="tw-t0">Day ${G.amb.days[r.id]||'?'}</span>`:r.st==='cur'?`${pnBar(P.pct,'xp')}<small>${P.p} / ${P.goal}</small>`:`<span class="tw-t0">${A.d}</span>`,right:r.st==='done'?pnIcon('check'):ambReward(A.reward||{})})}
 let detail='',foot='';
 if(ambSel==='tier'){detail=`${twHead(pnIcon('renown','',48),'Renown, tier '+RI.tier+' of '+RENOWN.length,RI.n)}<p class="pn-p">${RI.def.d}</p>${pnFacts([['Renown',pnIcon('renown')+RI.renown],['Next tier',RI.next?RI.nextN+' at '+RI.next:'None: the summit'],['Contracts',`up to ${RI.def.diff} skulls`],['Pay',`x${RI.def.pay}`],['Recruits',RI.def.vet?`level ${RI.def.lv[0]}-${RI.def.lv[1]} veterans, ${Math.round(RI.def.vet*100)}%`:'level 1'],['Followers',`${(G.retinue||[]).length} of ${RI.def.slots} slots`]])}
  ${pnHead('The tiers')}<div class="amb-tiers">${RENOWN.map((D,i)=>`<div class="amb-ti${i+1===RI.tier?' on':i+1<RI.tier?' past':''}"><b>${D.n}</b><small>${D.min}</small><span>${renownUnlocks(i+1).join(' · ')}</span></div>`).join('')}</div>
  <p class="pn-p dim">Renown comes from bands beaten (+3), contracts fulfilled (+8 a skull), rifts closed (+50) and ambitions. A failed or abandoned contract costs 5.</p>`}
 else{const id=ambSel,A=AMBITIONS[id],P=ambProgress(id),st=G.amb.cur===id?'cur':G.amb.done.includes(id)?'done':'offer',R=A.reward||{};
  detail=`${twHead(pnIcon(A.icon||'star','',48),st==='cur'?'Ambition in hand':st==='done'?'Fulfilled on day '+(G.amb.days[id]||'?'):'On offer',A.n)}<p class="pn-p">${A.d}</p>
  ${st!=='done'?`<div class="amb-prog">${pnBar(P.pct,'xp')}<b>${P.p} / ${P.goal}</b></div>`:''}
  ${pnFacts([['Renown',R.renown?pnIcon('renown')+'+'+R.renown:'None'],['Crowns',R.crowns?pnIcon('coin')+R.crowns:'None'],R.tools?['Tools',pnIcon('tools')+R.tools]:null,R.item?['Gear','A fine piece from the markets above your station']:null])}
  ${st==='offer'&&['wins10','slay50','contracts5','grave','wyvern','rift'].includes(id)?'<p class="pn-p dim">Counted from the day it is taken up.</p>':''}${st==='offer'&&id==='streak5'?'<p class="pn-p dim">The streak starts when it is taken up. A defeat or a death starts it again.</p>':''}`;
  if(st==='offer')foot=`<span class="pn-fl"><small>${G.amb.cur?'<em>Set aside '+AMBITIONS[G.amb.cur].n+' first</em>':'One ambition at a time'}</small></span><button type="button" class="pn-btn pri${G.amb.cur?' off':''}" id="ambTake" onclick="ambPickUI('${id}')">Take up</button>`;
  else if(st==='cur')foot=`<span class="pn-fl"><small>${P.p} of ${P.goal}</small></span><button type="button" class="pn-btn" id="ambDrop" onclick="ambDropUI()">Set aside</button>`}
 showPanel({id:'amb',title:'Ambitions',sub:`${RI.n} · renown ${RI.renown}`,meta:pnPurse(),closeLabel:G.townOpen?'Back to town':'Close',closeIcon:G.townOpen?'back':'x',onClose:ambClose,
  list,listKey:'amb:list',detail,detailKey:'amb:'+ambSel,foot})}

/* ---- saves: validates the progression fields in place (repairSave calls it); also gives defaults to an older company ---- */
function companyNew(g){g.retinue=[];g.amb=ambNew();g.amb.rt=renownTier(g.renown||0);ambOffer(g);g.amb.cel.push({k:'first'});return g}   // a new company is asked for its first ambition with the same card the later ones get
function companyRepair(g){if(!g||typeof g!=='object')return'';const seen={};
 g.retinue=Array.isArray(g.retinue)?g.retinue.filter(id=>typeof id==='string'&&FOLLOWERS[id]&&!seen[id]&&(seen[id]=1)).slice(0,RENOWN[RENOWN.length-1].slots):[];
 const a=g.amb&&typeof g.amb==='object'&&!Array.isArray(g.amb)?g.amb:{},ids=x=>{const s={};return(Array.isArray(x)?x:[]).filter(id=>typeof id==='string'&&AMBITIONS[id]&&!s[id]&&(s[id]=1))};
 const n=ambNew();n.done=ids(a.done);n.cur=typeof a.cur==='string'&&AMBITIONS[a.cur]&&!n.done.includes(a.cur)?a.cur:null;n.offered=ids(a.offered).filter(id=>!n.done.includes(id)&&id!==n.cur).slice(0,3);
 const num=(o,k)=>{const v=o&&o[k];return typeof v==='number'&&isFinite(v)&&v>=0?Math.floor(v):0};
 for(const k of AMB_CTR){n.st[k]=num(a.st,k);if(n.cur)n.base[k]=Math.min(num(a.base,k),n.st[k])}
 n.st.lairs={};if(a.st&&a.st.lairs&&typeof a.st.lairs==='object')for(const f in a.st.lairs)if(FACT[f]&&a.st.lairs[f])n.st.lairs[f]=1;
 if(a.days&&typeof a.days==='object')for(const id of n.done){const d=num(a.days,id);if(d)n.days[id]=d}
 n.cel=(Array.isArray(a.cel)?a.cel:[]).filter(e=>e&&typeof e==='object'&&((e.k==='amb'&&AMBITIONS[e.id])||(e.k==='tier'&&Number.isInteger(e.t)&&e.t>=1&&e.t<=RENOWN.length))).map(e=>e.k==='amb'?{k:'amb',id:e.id,item:ITEMS[e.item]?e.item:null}:{k:'tier',t:e.t}).slice(-6);
 n.rt=Number.isInteger(a.rt)&&a.rt>=1&&a.rt<=RENOWN.length?a.rt:renownTier(g.renown||0);g.amb=n;
 g.foodAcc=typeof g.foodAcc==='number'&&isFinite(g.foodAcc)?clamp(g.foodAcc,0,.999):0;
 if(!g.parts||typeof g.parts!=='object'||Array.isArray(g.parts))g.parts={};
 if(Array.isArray(g.towns))g.towns.forEach(t=>{if(t&&Array.isArray(t.retinue))delete t.retinue});
 try{ambOffer(g)}catch(e){}return''}

/* ---- pixel art: ambition laurel (16x16), retinue mark (16x16) and the eleven follower portraits (32x32), PAL only ---- */
function folGrid(){return Array.from({length:32},()=>Array(32).fill('.'))}
function folSet(g,x,y,k){if(x>=0&&y>=0&&x<32&&y<32&&k&&k!=='.')g[y][x]=k}
function folRect(g,x0,y0,x1,y1,k){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)folSet(g,x,y,typeof k==='function'?k(x,y):k)}
function folEll(g,cx,cy,rx,ry,k){for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){const dx=(x-cx)/rx,dy=(y-cy)/ry;if(dx*dx+dy*dy<=1)folSet(g,x,y,typeof k==='function'?k(x,y):k)}}
function folSpr(g,x0,y0,rows){rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.'&&r[x]!==' ')folSet(g,x0+x,y0+y,r[x])})}
function folRows(g){return g.map(r=>r.join(''))}
const FOLRAMP={green:['B','w','v'],verd:['7','5','6'],brown:['i','j','k'],red:['f','g','h'],blue:['X','x','F'],grey:['o','p','q'],vellum:['m','l','r'],dark:['2','3','4'],purple:['D','C','C'],brass:['a','b','c']};
const FOLART={
 scout:    {cloth:'green',hat:'hood',hood:'green',hair:'H',prop:'spyglass',bg:'7'},
 quarter:  {cloth:'brown',hat:'cap',capc:'brown',hair:'K',beard:1,prop:'sack',bg:'3'},
 cook:     {cloth:'vellum',hat:'toque',hair:'H',prop:'ladle',bg:'3',round:1},
 carto:    {cloth:'blue',hat:'brim',brimc:'brown',hair:'G',prop:'scroll',bg:'7'},
 recruiter:{cloth:'purple',hat:'plume',capc:'red',hair:'I',prop:'quill',bg:'3'},
 surgeon:  {cloth:'dark',hat:'none',hair:'J',bald:1,prop:'saw',bg:'7',apron:'vellum'},
 armorer:  {cloth:'brown',hat:'none',hair:'G',bald:1,beard:2,prop:'hammer',bg:'3',apron:'brown'},
 drill:    {cloth:'red',hat:'helm',hair:'H',mous:1,prop:'baton',bg:'7'},
 herbalist:{cloth:'green',hat:'hood',hood:'brown',hair:'J',beard:2,prop:'herbs',bg:'3'},
 paymaster:{cloth:'brass',hat:'brim',brimc:'dark',hair:'J',prop:'coins',bg:'7',specs:1},
 banner:   {cloth:'red',hat:'helm',hair:'K',prop:'flag',bg:'3',tabard:1}};
const FOLPROP={
 spyglass:[[22,19],['.......0','......0d','.....0cb','....0cb.','...0cb..','..0ba...','.0ba....','0aa.....']],
 sack:[[21,21],['...00....','..0kj0...','..0b00...','.0kkkj0..','0kkkkjj0.','0kkkjjj0.','0kjjjji0.','.0jjjii0.','..00000..']],
 ladle:[[23,17],['.000..','0qqp0.','0pqo0.','.0o0..','..0o0.','..0p0.','..0o0.','..0p0.','..0o0.','..0p0.','..000.']],
 scroll:[[20,22],['.0000000..','0lllllll0.','0mllllll00','0lgggllll0','.0lllllll0','..0000000.']],
 quill:[[23,16],['.....00','....0l0','...0lm0','...0lm0','..0lm0.','..0m0..','.0m0...','.0b0...','0b0....','00.....']],
 saw:[[21,20],['0000000..','0qqqqqq0.','0pqpqpq00','.0000ooj0','......0j0','......0i0','.......0.']],
 hammer:[[22,18],['0000000','0qqqqp0','0pppoo0','.00j00.','..0j0..','..0j0..','..0i0..','..0j0..','..0i0..','..000..']],
 baton:[[24,17],['..00','.0c0','0ec0','0cb0','0j0.','0j0.','0i0.','0j0.','0i0.','0j0.','00..']],
 herbs:[[21,19],['..0..0..0.','.0A00A00A0','.0AB0vB0B0','..0B0B0w0.','..0BwBw0..','...0BB0...','...0kk0...','...0jj0...','....00....']],
 coins:[[21,22],['..00000..','.0eddc00.','.0dccb0..','0eddc000.','0dccbb0..','0eddc000.','0dccbbb0.','.0000000.']],
 flag:[[22,6],['000000...','0ggggg000','0gghgggg0','0ggcgggf0','0gcccggf0','0ggcgggf0','0ggggggf0','0gggff000','00000....','.0j0.....','.0j0.....','.0i0.....','.0j0.....','.0i0.....','.0j0.....','.0i0.....','.0j0.....','.0i0.....','.0j0.....','.0i0.....','.0j0.....','.000.....']]};
function folPortrait(id){const A=FOLART[id];if(!A)return null;const g=folGrid(),C=FOLRAMP[A.cloth]||FOLRAMP.brown;
 // the plate: a rounded square with a lit top-left edge
 folRect(g,1,1,30,30,(x,y)=>((x<3||x>28)&&(y<3||y>28)&&!((x===2||x===29)&&(y===2||y===29)))?'.':(x+y<9)?'.':(x+y>53)?'.':(x<=2||y<=2)?'4':A.bg);
 const fig=folGrid(),cx=15.5;
 // shoulders and chest, lit from the left
 for(let y=21;y<=30;y++){const w=y===21?5:y===22?7:y===23?9:10;for(let x=Math.round(cx-w);x<=Math.round(cx+w)-1;x++){const r=(x-cx)/w;folSet(fig,x,y,r<-.45?C[2]:r<.35?C[1]:C[0])}}
 if(A.apron){const P=FOLRAMP[A.apron];folRect(fig,12,24,19,30,(x,y)=>x<14?P[2]:x>17?P[0]:P[1]);folSet(fig,12,23,P[1]);folSet(fig,19,23,P[1])}
 if(A.tabard){folRect(fig,13,23,18,30,(x,y)=>x<15?'h':x>16?'f':'g');folRect(fig,15,25,16,28,'c')}
 if(A.round){folRect(fig,8,25,23,30,(x,y)=>x<11?'r':x>20?'m':'l')}
 folRect(fig,14,19,17,21,(x,y)=>x>=16?'t':'s');folSet(fig,14,21,'t');folSet(fig,17,21,'u');                    // neck
 // the head: skin lit from the upper left, jaw and right side shaded
 folEll(fig,cx,13,5.6,6.6,(x,y)=>x>=19||(y>=17&&x>=16)?'t':'s');folSet(fig,20,13,'u');folSet(fig,20,14,'u');folSet(fig,19,17,'u');folSet(fig,18,18,'u');
 folSet(fig,10,13,'t');folSet(fig,21,13,'t');                                                                         // ears
 const hair=A.hair||'H';
 if(!A.bald||A.hat!=='none'){folRect(fig,11,7,20,8,hair);folSet(fig,10,9,hair);folSet(fig,21,9,hair);folRect(fig,10,10,10,11,hair);folRect(fig,21,10,21,11,hair)}
 else{folSet(fig,10,11,hair);folSet(fig,10,12,hair);folSet(fig,21,11,hair);folSet(fig,21,12,hair);folSet(fig,13,8,'r')}
 // the face
 folSet(fig,13,13,'0');folSet(fig,18,13,'0');folSet(fig,13,12,hair);folSet(fig,12,12,hair);folSet(fig,18,12,hair);folSet(fig,19,12,hair);
 folSet(fig,16,14,'t');folSet(fig,16,15,'t');folSet(fig,15,17,'u');folSet(fig,16,17,'u');folSet(fig,12,15,'h');
 if(A.specs){folSet(fig,12,13,'c');folSet(fig,14,13,'c');folSet(fig,17,13,'c');folSet(fig,19,13,'c');folSet(fig,15,13,'b');folSet(fig,16,13,'b')}
 if(A.mous){folRect(fig,13,16,18,16,hair);folSet(fig,12,17,hair);folSet(fig,19,17,hair)}
 if(A.beard){folRect(fig,11,16,20,18,(x,y)=>x===15&&y===17||x===16&&y===17?'u':hair);folRect(fig,12,19,19,19,hair);if(A.beard>1){folRect(fig,13,20,18,21,hair);folRect(fig,14,22,17,22,hair)}}
 // headgear
 if(A.hat==='hood'){const H=FOLRAMP[A.hood||A.cloth];folEll(fig,cx,10.5,7.2,5.6,(x,y)=>y>9&&x>10&&x<21?null:x<12?H[2]:x>19?H[0]:H[1]);
  for(let y=10;y<=21;y++){folSet(fig,9,y,H[2]);folSet(fig,22,y,H[0]);folSet(fig,10,y,H[1]);folSet(fig,21,y,H[0])}folRect(fig,10,20,21,22,(x)=>x<14?H[2]:x>18?H[0]:H[1]);
  folRect(fig,11,9,20,9,H[0])}
 else if(A.hat==='cap'){const H=FOLRAMP[A.capc];folEll(fig,cx,8,6.4,3.4,(x,y)=>y>9?null:x<13?H[2]:x>18?H[0]:H[1]);folRect(fig,9,9,22,10,(x)=>x<13?H[1]:H[0])}
 else if(A.hat==='plume'){const H=FOLRAMP[A.capc];folEll(fig,cx,8,6.4,3.4,(x,y)=>y>9?null:x<13?H[2]:x>18?H[0]:H[1]);folRect(fig,9,9,22,10,(x)=>x<13?H[1]:H[0]);
  folSpr(fig,18,0,['....ll','...llm','..llm.','.llm..','.lm...','lm....','m.....'])}
 else if(A.hat==='toque'){folRect(fig,10,8,21,10,(x)=>x<13?'r':x>18?'m':'l');folEll(fig,15.5,4.5,6,4,(x,y)=>y>8?null:x<13?'r':x>18?'m':'l');folRect(fig,10,10,21,10,'m')}
 else if(A.hat==='brim'){const H=FOLRAMP[A.brimc];folRect(fig,6,9,25,10,(x,y)=>y===10?H[0]:x<12?H[2]:H[1]);folRect(fig,10,3,21,8,(x,y)=>x<13?H[2]:x>18?H[0]:H[1]);folRect(fig,10,7,21,7,A.cloth==='brass'?'g':'c')}
 else if(A.hat==='helm'){folEll(fig,cx,8.5,6.6,4.6,(x,y)=>y>10?null:x<13?'q':x>18?'o':'p');folRect(fig,9,10,22,11,(x)=>x<13?'p':'o');folRect(fig,15,11,16,15,'o');folSet(fig,15,9,'r');
  if(id==='drill')folSpr(fig,13,0,['..ggh.','.gghh.','.gg...','..g...','..o...'])}
 const out=pxLayer(folRows(g),_icOutline(folRows(fig)));
 // the prop, outlined in its own drawing, laid over the figure
 const P=FOLPROP[A.prop];let rows=out;if(P){const pg=folGrid();folSpr(pg,P[0][0],P[0][1],P[1]);rows=pxLayer(out,folRows(pg))}
 return _icOutline(rows.map(r=>r))}
const AMB_ICONS={
 ambition:['................','.....0....0.....','....0B0..0B0....','...0BA0..0AB0...','...0B00cc00B0...','..0BA0cddc0AB0..','..0B0cdeedc0B0..','..0BA0cddc0AB0..','...0B0cddc0B0...','...0BA0cc0AB0...','....0B0bb0B0....','.....00bb00.....','......0bb0......','.....0cddc0.....','.....000000.....','................'],
 retinue:['................','......00........','.....0ss0.00....','.....0st00gg0...','......00.0ggh0..','....00kk0gggg0..','...0kkjj00g0f0..','...0kjjj0.0j00..','...0kjji0.0j0...','....0jji0.0j0...','....0j0i0.0i0...','....0j0i0.0j0...','....000000000...','................','................','................']};
(function(){try{for(const n in AMB_ICONS)if(!icHas(n)){ICONS[n]=AMB_ICONS[n];if(typeof icCss==='function')icCss(n)}
 for(const id in FOLLOWERS){const n='fol-'+id;if(icHas(n))continue;const r=folPortrait(id);if(r){ICONS[n]=r;if(typeof icCss==='function')icCss(n)}}}catch(e){}})();
