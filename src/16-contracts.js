/* ================= CONTRACTS (phase 7) =================
   Ten kinds of work. CTYPES[type] = {n, d, icon, gen(t,ti)->contract|null, w(t,ti)->weight, mark(c)->[{x,y,kind,label,f?}],
   turnIn(c,ti)->bool, onBattle?(c,o,win), onArrive?(c,place)}.
   A contract: {type, id, title, emp (faction key: house id | 'free'), town (issuing town), diff 1..5, pay, adv (paid up front),
   stage, stages:[...], twist:null|{k,when,fired}, done, failed, due:day|null, day (posted), ...type fields}.
   Stages: {k:'go', x, y, kind:'lair'|'road'|'gate'|'site'|'siege'|'nest'|'camp', label, fight:null|{f, k (strength), obj?, boss?, fixed?}}
           {k:'town', ti, kind:'turnin', label}. The last stage is always a town: the pay is collected there.
   c.done mirrors ctrDone(c) (only the turn-in is left) for older readers.

   Generic hooks (every other file uses these, never type checks; all pure unless named as acting):
     ctrMarks(c)          -> [{x,y,kind,label,f?,town?}] map/world markers for the current stage (+ the turn-in town)
     ctrTargetAt(x,y)     -> {c, stage, x, y, kind, label} when the company at (x,y) stands on the current go-stage, else null
     ctrArrive(x,y)       acting: the world calls it as the company moves; true when it took over (battle, card, stage step)
     ctrDone(c)           -> only the pay is left to collect
     ctrTurnInAt(ti)      -> {c, pay, renown, rep} when G.contract can be turned in at town ti, else null
     ctrTurnIn(ti)        acting: pays out; -> {ok, pay, renown, text} | null
     ctrStatus(c)         -> one short line ("Hold the gate at Alder, by day 12")
     ctrBattle(c,place)   -> startBattle options for the current stage's fight (or null)
     ctrNegotiate(c,ask)  -> {ok, c, mood, moodN, msg, counter?, gone?}; deterministic per contract, at most 3 rounds
     ctrMood(c)           -> {v 0..100, n, why}
     ctrAccept(c)         acting: takes c from its board as G.contract, pays the advance
     ctrAbandon()         acting: drops G.contract (renown and reputation loss)
     ctrDaily()           acting: the world calls it once a day (deadlines, curses, travel twists)
     ctrTwistCard(c)      -> {k, n, text, opts:[{t,d,req?}]} the card for a fired twist; ctrTwistPick(i) acting -> {text, fight:o|null}
     objStatus()          -> the battle objective for the HUD, or null
     ctrRepair(c,nTowns?,towns?) validates a saved contract in place (against the save's towns, or G's) (old deliver/hunt saves get their stages); false = drop it
     genContract2(t,ti)   -> a new contract for town t (genContract in 50-towns.js delegates here) */
const CTR_KINDS=['deliver','hunt','escort','defend','patrol','beast','relic','siege','nest','bounty'];
function ctrH(seed,n){let h=(seed|0)^Math.imul((n|0)+0x9e37,0x85ebca6b);h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);h^=h>>>16;return(h>>>0)/4294967296}   // a pure hash: [0,1)
function ctrTown(i){return G&&G.towns&&G.towns[i]||null}
function ctrDist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)/TS}
function ctrRep(f){return G&&G.rep&&typeof G.rep[f]==='number'?G.rep[f]:0}
function ctrRepGain(f,n,why){if(!f||!n)return;if(typeof repGain==='function'){try{repGain(f,n,why);return}catch(e){}}if(G.rep&&typeof G.rep==='object'&&f in G.rep)G.rep[f]=clamp(G.rep[f]+n,-100,100)}
function ctrHouse(f){return G&&Array.isArray(G.houses)?G.houses.find(h=>h&&h.id===f)||null:null}
function ctrEmpName(c){const h=ctrHouse(c.emp);if(h)return h.short||h.n;const t=ctrTown(c.town);return t?'the council of '+t.name:'the town council'}
function ctrRenownT(){return typeof renownTier==='function'?renownTier():1}
function ctrPayRep(){return typeof renownDef==='function'?renownDef().pay:1+G.renown/300}
// Contract pay follows the company's strength (companyPower: levels + gear of the fielded swords; a solo run counts its one sword twice),
// renown (ctrPayRep) and the job's danger (CTR_PAYK by difficulty): never the day. CTRPAY = {base, k, e}: base + k x power^e crowns.
// CTRPAY.knee / .e2: past power knee (a seasoned company) the pay grows by (power/knee)^e2 instead (was: power^e all the way): a new
// company is paid as before, a strong one far less (the mid and late game's runaway purse)
const CTRPAY={base:175,k:14,e:.75,knee:30,e2:.45};   // was {240,30,.75}: a contract pays 3-6 days of the company's wages
function ctrPower(){let P=typeof companyPower==='function'&&G?companyPower():fielded().length*3;if(typeof isSolo==='function'&&isSolo())P=Math.max(P*2,8);return Math.max(0,P||0)}
function ctrStrPay(){const P=ctrPower(),K=CTRPAY.knee;return CTRPAY.base+CTRPAY.k*(P<=K?Math.pow(P,CTRPAY.e):Math.pow(K,CTRPAY.e)*Math.pow(P/K,CTRPAY.e2))}
function ctrPayBase(diff,k){return Math.max(30,Math.round(ctrStrPay()*CTR_PAYK[clamp(diff,1,5)-1]*(k||1)*ctrPayRep()/10)*10)}
function ctrMult(diff,k){return CTR_DIFFK[clamp(diff,1,CTR_DIFFK.length)-1]*(k||1)}
function ctrNear(t,lo,hi,f){const p=f?ctrLairAt(t,f,lo,hi):randOk(t.x,t.y,lo,hi);return{x:p.x,y:p.y}}
function ctrPickF(t,ti,only){let P=ctrPool(t,ti);if(only){const Q=P.filter(x=>only.includes(x.f));if(Q.length)P=Q;else return null}
 let tot=0;P.forEach(x=>tot+=x.w);let r=rnd()*tot,e=P[P.length-1];for(const x of P){r-=x.w;if(r<=0){e=x;break}}return e}
function ctrOtherTown(ti,lo,hi){const t=G.towns[ti],L=[];G.towns.forEach((o,i)=>{if(i===ti)return;const d=ctrDist(o,t);if(d>=lo&&d<=hi)L.push(i)});
 if(!L.length){let b=-1,bd=1e9;G.towns.forEach((o,i)=>{if(i!==ti){const d=ctrDist(o,t);if(d<bd){bd=d;b=i}}});return b}return pick(L)}
// another town the roads join to town ti, lo..hi leagues away (else the nearest the roads join); -1 when no road leads anywhere
function ctrRoadTown(ti,lo,hi){const t=G.towns[ti],ok=i=>i!==ti&&(typeof wsLinked!=='function'||wsLinked(ti,i)),L=[];G.towns.forEach((o,i)=>{if(!ok(i))return;const d=ctrDist(o,t);if(d>=lo&&d<=hi)L.push(i)});
 if(!L.length){let b=-1,bd=1e9;G.towns.forEach((o,i)=>{if(ok(i)){const d=ctrDist(o,t);if(d<bd){bd=d;b=i}}});return b}return pick(L)}
function ctrDue(t,x,y,extra){return G.day+2+Math.ceil(Math.hypot(x-t.x,y-t.y)/TS/10)+(extra||0)}
// the base of every contract (draws: id)
function ctrNew(type,t,ti,diff,title){return{type,id:ri(1,2147483646),title,emp:t.own||'free',town:ti,diff,pay:0,adv:0,stage:0,stages:[],twist:null,done:false,failed:false,due:null,day:G.day}}
function ctrHome(ti,label){return{k:'town',ti,kind:'turnin',label:label||'Collect the pay'}}
function ctrPlace(t){return t?t.name:'the town'}
// a point beside town t, off its walls (defend / siege): a free tile 1.2..2 leagues out, the first that is walkable
function ctrBeside(t){for(let k=0;k<16;k++){const a=k*0.785+(k>=8?.39:0),d=(k>=8?2:1.25)*TS,x=t.x+Math.cos(a)*d,y=t.y+Math.sin(a)*d;if(typeof okAt!=='function'||okAt(x,y))return{x,y}}return{x:t.x+TS*1.25,y:t.y}}

/* ---- named foes: beasts and brigand leaders. The boss is the strongest of its band, boosted (CTR_BOSSK). ---- */
const CTR_BOSSK={hp:1.6,arm:1.25,ms:10,md:8,dmg:.2};
const CTR_BEAST={beast:{id:'bear',n:['Greymaw','Old Scar','Bonecrook','Blackhide','Mother Hollow','Grimpaw']},serpent:{id:'gserp',n:['Coilmother','Silverfang','Old Venom','the Sunken Queen']},
 ogre:{id:'aogre',n:['Gutrend','Big Haldo','Skullsplitter','Old Mother Gristle']},ent:{id:'elder',n:['the Weeping Oak','Rotheart','Old Gnarl','the Hanging Tree']},wyvern:{id:'wyvern',n:['Ashwing','Stormtalon','the Red Duke']}};
const CTR_BTITLE=['the Widowmaker','Terror of {place}','the Shepherd-Eater','the Unkillable','Bane of {place}','the Night Hunger'];
const CTR_BANDIT={first:['Black','One-Eyed','Red','Gentle','Mad','Iron','Laughing','Crooked'],name:['Wulf','Hessa','Corvin','Mags','Tobold','Edric','Sabine','Garret'],title:['the Butcher of {place}','the Toll-Taker','the Hangman','Lord of the Ditch','the Smiling Knife']};
const CTR_RELIC=['the Reliquary of Saint Aud','a crown of black iron','the Ember Codex','a mirror of the old kings','the Thornwood Chalice','a sealed lead casket','the Saint\'s Finger'];

/* ---- the ten types ---- */
const CTYPES={
 deliver:{n:'Delivery',d:'Carry sealed cargo to another town before the deadline.',icon:'contracts',
  w:()=>1,
  gen(t,ti){const to=ctrOtherTown(ti,3,40),o=G.towns[to];if(to<0)return null;const d=ctrDist(o,t),c=ctrNew('deliver',t,ti,1,'Carry sealed cargo to '+o.name);
   c.to=to;c.cargo=pick(['sealed letters','a strongbox','salt and spice','wine casks','tithe silver']);c.pay=Math.round((80+d*12)*ctrStrPay()/560*ctrPayRep()/10)*10;c.stages=[ctrHome(to,'Deliver the cargo')];c.due=ctrDue(t,o.x,o.y,1);return c}},
 hunt:{n:'Hunt',d:'Find the lair and destroy the band inside, then return for the pay.',icon:'skull',
  w:()=>7.5,
  gen(t,ti){const e=ctrPickF(t,ti);if(!e)return null;const f=e.f,diff=ctrDiff(),pos=ctrLairAt(t,f,e.lo,e.hi),tk=CTR_TIERK[FACT[f].tier]||1,c=ctrNew('hunt',t,ti,diff,ctrTitle(f,t));
   c.f=f;c.x=pos.x;c.y=pos.y;c.pay=ctrPayBase(diff,tk);c.stages=[{k:'go',x:pos.x,y:pos.y,kind:'lair',label:'Lair',fight:{f,k:1}},ctrHome(ti)];c.due=ctrDue(t,pos.x,pos.y,6);return c}},
 escort:{n:'Escort',d:'March beside a caravan on the road to another town. Raiders who think themselves a match for its guards and the company together will come for the wagons: the wagon must survive.',icon:'contracts',
  w:(t)=>t.size>=2?1:.6,
  gen(t,ti){const to=ctrRoadTown(ti,8,30);if(to<0)return null;const o=G.towns[to],e=ctrPickF(t,ti,['bandit','gob','orc','beast']),f=e?e.f:'bandit',diff=ctrDiff(),c=ctrNew('escort',t,ti,diff,'Escort a caravan to '+o.name);
   const r=typeof wsRoute==='function'?wsRoute(ti,to):null,len=r&&typeof rdLen==='function'?rdLen(r,t.x,t.y,0):ctrDist(o,t)*1.3;   // a live escort (42-caravans.js): the wagons keep to the road
   c.to=to;c.f=f;c.len0=Math.round(len);c.pay=ctrPayBase(diff,1.1);c.stages=[escStageOf(to),ctrHome(to,'Collect the pay')];c.due=G.day+2+Math.ceil(len/ESC.day)+ESC.slack;return c},
  onAccept(c){escStart(c,null,true)},onFail(c){escRelease(c)},onTurnIn(c){escRelease(c)}},
 defend:{n:'Defend',d:'Raiders are coming. Be at the gate in time and hold it.',icon:'shield',
  w:()=>.7,
  gen(t,ti){const e=ctrPickF(t,ti,['bandit','orc','gob','undead']),f=e?e.f:'bandit',diff=ctrDiff(),p=ctrBeside(t),c=ctrNew('defend',t,ti,diff,'Hold the gate of '+t.name);
   const rounds=diff>=4?6:5;c.f=f;c.rounds=rounds;c.pay=ctrPayBase(diff,1.05);c.stages=[{k:'go',x:p.x,y:p.y,kind:'gate',label:'The gate',fight:{f,k:1.25,obj:{k:'hold',rounds}}},ctrHome(ti)];c.due=G.day+3;return c}},
 patrol:{n:'Patrol',d:'Walk a round of the roads and clear whatever you meet, then report back.',icon:'map',
  w:()=>.9,
  gen(t,ti){const e=ctrPickF(t,ti,['bandit','gob','beast','undead']),f=e?e.f:'bandit',diff=Math.min(ctrDiff(),3),c=ctrNew('patrol',t,ti,diff,'Patrol the roads of '+t.name),n=3,hit=ri(0,n-1),pts=[];
   for(let i=0;i<n;i++){const p=randOk(t.x,t.y,3,7);pts.push({k:'go',x:p.x,y:p.y,kind:'road',label:'Waypoint '+(i+1),fight:i===hit?{f,k:.9}:null})}
   c.f=f;c.pay=ctrPayBase(diff,.85);c.stages=pts.concat([ctrHome(ti,'Report back')]);c.due=G.day+6;return c}},
 beast:{n:'Named beast',d:'A beast with a name and a price on its head. It is bigger and meaner than the rest of its kind.',icon:'skull',
  w:()=>ctrRenownT()>=2||G.day>=8?.6:.15,
  gen(t,ti){const fs=Object.keys(CTR_BEAST).filter(f=>FACT[f]&&EN[CTR_BEAST[f].id]),e=ctrPickF(t,ti,fs);if(!e)return null;const f=e.f,B0=CTR_BEAST[f],diff=clamp(ctrDiff()+1,2,5),pos=ctrLairAt(t,f,e.lo,e.hi);
   const name=pick(B0.n),title=pick(CTR_BTITLE).replace('{place}',t.name),c=ctrNew('beast',t,ti,diff,`Slay ${name}, ${title}`);
   c.f=f;c.x=pos.x;c.y=pos.y;c.boss={id:B0.id,name,title};c.pay=ctrPayBase(diff,(CTR_TIERK[FACT[f].tier]||1)*1.25);
   c.stages=[{k:'go',x:pos.x,y:pos.y,kind:'lair',label:name,fight:{f,k:.8,boss:c.boss}},ctrHome(ti,'Bring back the head')];c.due=ctrDue(t,pos.x,pos.y,8);return c}},
 relic:{n:'Relic',d:'Recover an artifact from a ruin. Its guardians do not sleep.',icon:'stash',
  w:()=>Array.isArray(G.sites)&&G.sites.length?.7:.35,
  gen(t,ti){const S=(G.sites||[]).filter(s=>s&&s.kind==='ruin'&&ctrDist(s,t)>=3&&ctrDist(s,t)<=22);let x,y,sid=null;
   if(S.length){const s=pick(S);x=s.x;y=s.y;sid=s.id}else{const p=randOk(t.x,t.y,5,12);x=p.x;y=p.y}
   const cf=typeof crisisFacts==='function'?crisisFacts():(G.crisis?['void']:[]),f=cf.length&&rnd()<.4?cf[0]:'undead',diff=clamp(ctrDiff(),2,5),relic=pick(CTR_RELIC),c=ctrNew('relic',t,ti,diff,'Recover '+relic);
   c.f=f;c.x=x;c.y=y;c.site=sid;c.relic=relic;c.pay=ctrPayBase(diff,1.15);c.stages=[{k:'go',x,y,kind:'site',label:'The ruin',fight:{f,k:.95}},ctrHome(ti,'Hand over the relic')];c.due=ctrDue(t,x,y,6);return c}},
 siege:{n:'Break a siege',d:'A town is besieged. Storm the siege lines: the foe fights from behind stakes and earthworks. Kill the leader and the rest break.',icon:'swords',
  w:(t,ti)=>(ctrRenownT()>=2||G.day>=10?.45:.1)*(ctrSiegeTown(ti)!==ti?3:1),
  gen(t,ti){const at=ctrSiegeTown(ti),o=G.towns[at],e=ctrPickF(t,ti,['orc','bandit','undead','gob']),f=e?e.f:'orc',diff=clamp(ctrDiff()+1,2,5),p=ctrBeside(o),c=ctrNew('siege',t,ti,diff,'Break the siege of '+o.name);
   c.f=f;c.at=at;c.pay=ctrPayBase(diff,1.4);c.stages=[{k:'go',x:p.x,y:p.y,kind:'siege',label:'Siege lines',fight:{f,k:1.1,obj:{k:'siege'}}},ctrHome(ti)];c.due=G.day+4+Math.ceil(ctrDist(o,t)/10);return c}},
 nest:{n:'Clear a nest',d:'A nest grows stronger every day it is left alone, and sends out bands. Burn it out.',icon:'board',
  w:(t)=>ctrNests(t).length?1.4:.25,
  gen(t,ti){const N=ctrNests(t);let n=N.length?pick(N):null,f,x,y,str;
   if(n){f=n.f;x=n.x;y=n.y;str=svNum(n.str,1)}else{const e=ctrPickF(t,ti,['gob','beast','serpent','undead','orc']);if(!e)return null;f=e.f;const p=ctrLairAt(t,f,e.lo,e.hi);x=p.x;y=p.y;str=1}
   const nb=n&&typeof nestBattle==='function'?nestBattle(n.id):null,k=clamp(nb&&nb.mult>0?nb.mult:.7+str*.3,.75,2.2),diff=clamp(Math.round(k*2.2),1,5),c=ctrNew('nest',t,ti,diff,'Clear the '+(FACT[f].n||'monster').toLowerCase()+' nest near '+t.name);
   c.f=f;c.x=x;c.y=y;c.nest=n?n.id:null;c.str=str;c.pay=ctrPayBase(diff,(CTR_TIERK[FACT[f].tier]||1)*1.1);c.stages=[{k:'go',x,y,kind:'nest',label:'The nest',fight:{f,k:k/CTR_DIFFK[clamp(diff,1,5)-1]}},ctrHome(ti)];c.due=ctrDue(t,x,y,7);return c}},
 bounty:{n:'Bounty',d:'A named brigand leader with a price on the head. The band is loyal; the leader is the job.',icon:'skull',
  w:()=>.6,
  gen(t,ti){const orc=G.day>=12&&rnd()<.25,f=orc?'orc':'bandit',id=orc?'orcl':'blead';if(!EN[id])return null;const e=ctrPickF(t,ti,[f]),pos=ctrLairAt(t,f,e?e.lo:4,e?e.hi:10),diff=clamp(ctrDiff()+(orc?1:0),1,5);
   const name=orc?pick(['Gorza','Ukrul','Mag Thrask','Shagra']):pick(CTR_BANDIT.first)+' '+pick(CTR_BANDIT.name),title=pick(CTR_BANDIT.title).replace('{place}',t.name),c=ctrNew('bounty',t,ti,diff,`Bounty: ${name}, ${title}`);
   c.f=f;c.x=pos.x;c.y=pos.y;c.boss={id,name,title};c.pay=ctrPayBase(diff,1.2);c.stages=[{k:'go',x:pos.x,y:pos.y,kind:'camp',label:name+'’s camp',fight:{f,k:.85,boss:c.boss}},ctrHome(ti,'Claim the bounty')];c.due=ctrDue(t,pos.x,pos.y,7);return c}}
};
for(const k of CTR_KINDS)ctrTypeDefaults(k);
function ctrTypeDefaults(k){const T=CTYPES[k];if(typeof icHas==='function'&&icHas('ct-'+k))T.icon='ct-'+k;   // the look agent's contract icons (06-icons.js)
 T.mark=T.mark||(c=>ctrMarks(c));T.turnIn=T.turnIn||((c,ti)=>!!ctrTurnInAt(ti));if(typeof T.n!=='string')T.n=k;if(typeof T.d!=='string')T.d='';if(!T.icon)T.icon='contracts'}
/* ctrRegister(k, T): a contract type from another file (crisis work, the Eastern War, the tutorial), with the shape of CTYPES above:
   {n, d, icon, w(t,ti) -> board weight (0 keeps it off the boards), gen(t,ti) -> contract | null, mark?, turnIn?, onBattle?, onTurnIn?(c,ti)}.
   It joins the boards (CTR_KINDS) unless T.board === false; contracts of the type survive a save through ctrRepair like any other. */
function ctrRegister(k,T){if(typeof k!=='string'||!k||!T||typeof T!=='object')return false;CTYPES[k]=T;if(T.board!==false&&!CTR_KINDS.includes(k))CTR_KINDS.push(k);ctrTypeDefaults(k);return true}
function ctrNests(t){return Array.isArray(G.nests)?G.nests.filter(n=>n&&FACT[n.f]&&svFin(n.x)&&svFin(n.y)&&ctrDist(n,t)<=24):[]}
// a town of the same owner under siege (situation 'siege'), else the issuing town itself
function ctrSiegeTown(ti){const t=G.towns[ti];let best=-1,bd=1e9;G.towns.forEach((o,i)=>{if(!ctrHasSit(o,'siege'))return;if(i!==ti&&(o.own||'free')!==(t.own||'free'))return;const d=ctrDist(o,t);if(d<bd){bd=d;best=i}});return best>=0?best:ti}
function ctrHasSit(t,k){return Array.isArray(t&&t.sit)&&t.sit.some(s=>s&&s.k===k)}
/* how a town's situations shape its board: SITS[k].contracts may be a number (more or fewer notices) or {type: weight factor};
   the fixed reading below covers the situations the contract names. */
const CTR_SITW={raided:{defend:2.5,bounty:1.8,hunt:1.2},siege:{siege:6,defend:1.5,deliver:.5},famine:{deliver:2,escort:1.6,hunt:.8},festival:{patrol:1.8,escort:1.3},plague:{relic:1.6,deliver:.6,escort:.5},boom:{escort:1.8,deliver:1.6}};
function ctrSitK(t,type){let k=1;if(!Array.isArray(t&&t.sit))return k;for(const s of t.sit){if(!s)continue;const S=typeof SITS==='object'&&SITS&&SITS[s.k],C=S&&S.contracts;
  if(C&&typeof C==='object'&&typeof C[type]==='number')k*=C[type];else if(CTR_SITW[s.k]&&CTR_SITW[s.k][type])k*=CTR_SITW[s.k][type]}return k}
function ctrTypeW(t,ti,type){const T=CTYPES[type];let w=0;try{w=T.w(t,ti)}catch(e){w=0}if(!(w>0))return 0;if(typeof runModF==='function')w*=runModF('ctr',type,1);
 if(typeof townCtrK==='function'){let k=1;try{k=+townCtrK(ti,type)}catch(e){k=1}if(k>=0&&isFinite(k))w*=k;return w}   // the world's factor: situations and the owner's standing
 w*=ctrSitK(t,type);
 const tier=typeof repTier==='function'?repTier(t.own||'free'):null;if(tier&&(tier.k==='friendly'||tier.k==='allied')&&(type==='siege'||type==='beast'||type==='relic'))w*=1.4;return w}
// the reputation the issuing faction has of the company scales the pay on the board: cold 0.9, friendly 1.1, allied 1.2
function ctrRepPayK(f){const tier=typeof repTier==='function'?repTier(f):null,k=tier&&tier.k;return k==='cold'?.9:k==='friendly'?1.1:k==='allied'?1.2:k==='hostile'?.8:1}
/* genContract2(t,ti,opt?): a contract for town t. Draws from the seeded stream only. Hunts are the common work (about half of single
   notices); a board (ctrBoard) asks with opt.avoid = the types already posted, so a board of three or four shows several kinds. */
function ctrBoard(t,n){const ti=G.towns.indexOf(t),L=[];for(let i=0;i<n;i++){const c=genContract2(t,ti,{avoid:L.map(x=>x.type)});if(c)L.push(c)}return L}
function genContract2(t,ti,opt){if(!t)return null;if(ti==null||ti<0)ti=G.towns.indexOf(t);let c=null;const av=opt&&Array.isArray(opt.avoid)?opt.avoid:null;
 for(let g=0;g<4&&!c;g++){const W=CTR_KINDS.map(k=>{const n=av?av.filter(x=>x===k).length:0;return ctrTypeW(t,ti,k)*(!n?1:k==='hunt'&&n===1?.25:0)});let tot=0;W.forEach(w=>tot+=w);let r=rnd()*tot,k='hunt';for(let i=0;i<W.length;i++){r-=W[i];if(r<=0&&W[i]>0){k=CTR_KINDS[i];break}}
  try{c=CTYPES[k].gen(t,ti)}catch(e){c=null}}
 if(!c)c=CTYPES.hunt.gen(t,ti);if(!c)return null;
 c.pay=Math.max(10,Math.round(c.pay*ctrRepPayK(c.emp)*(typeof diffK==='function'?diffK('pay'):1)*(typeof runModPayK==='function'?runModPayK(c):1)/10)*10);c.pay0=c.pay;   // standing and the run's difficulty (22-run.js)
 if(rnd()<.3){const L=Object.keys(CTWIST).filter(k=>CTWIST[k].types.includes(c.type));if(L.length){const k=pick(L);c.twist={k,when:CTWIST[k].when,fired:false}}}
 ctrSync(c);return c}
function ctrSync(c){if(!c)return c;c.done=ctrDone(c);return c}

/* ---- the generic hooks ---- */
function ctrStage(c){if(c&&!Array.isArray(c.stages)&&CTYPES[c.type])ctrRepair(c);   // a hand-made or phase-6 contract gets its stages on first look
 return c&&Array.isArray(c.stages)?c.stages[clamp(c.stage|0,0,c.stages.length-1)]||null:null}
function ctrDone(c){if(!c||c.failed)return false;const s=ctrStage(c);return!!s&&s.k==='town'&&(c.stage|0)>=c.stages.length-1}
function ctrMarks(c){c=c||G.contract;if(!c)return[];const s=ctrStage(c),out=[];if(!s)return out;
 if(s.k==='go'&&s.kind==='escort'){const t=ctrTown(c.to);if(t)out.push({x:t.x,y:t.y,kind:'turnin',label:'Escort the caravan here',town:c.to});return out}   // the caravan itself is drawn with its road (escDrawMap)
 if(s.k==='go'){out.push({x:s.x,y:s.y,kind:s.fight?(s.kind==='lair'||s.kind==='nest'||s.kind==='camp'?'lair':s.kind):'waypoint',label:s.label,f:s.fight?s.fight.f:c.f,stage:c.stage});
  const h=c.stages[c.stages.length-1],t=ctrTown(h.ti);if(t)out.push({x:t.x,y:t.y,kind:'turnin',label:h.label,town:h.ti,later:true})}
 else{const t=ctrTown(s.ti);if(t)out.push({x:t.x,y:t.y,kind:'turnin',label:s.label,town:s.ti})}
 return out}
function ctrTurnInTown(c){const h=c&&Array.isArray(c.stages)?c.stages[c.stages.length-1]:null;return h&&h.k==='town'?h.ti:c?c.town:-1}
function ctrTargetAt(x,y){const c=G&&G.contract;if(!c||c.failed)return null;const s=ctrStage(c);if(!s||s.k!=='go'||s.kind==='escort')return null;/* an escort ends when its caravan arrives (escArrive) */if(Math.hypot(s.x-x,s.y-y)>=.4*TS)return null;
 return{c,stage:c.stage,x:s.x,y:s.y,kind:s.kind,label:s.label,fight:!!s.fight}}
function ctrBattle(c,place){c=c||G.contract;const s=ctrStage(c);if(!s||s.k!=='go'||!s.fight)return null;const F=s.fight;
 const o={f:F.f,mult:ctrMult(c.diff,F.k||1),src:{type:'lair',ctr:1,id:c.id,stage:c.stage}};
 if(F.obj)o.obj=Object.assign({},F.obj);if(F.boss&&EN[F.boss.id]){o.boss=Object.assign({},F.boss);o.fixed=[F.boss.id]}
 if(c.twist&&c.twist.fight){o.mult*=c.twist.fight;}
 return o}
function ctrStatus(c){c=c||G.contract;if(!c)return'';if(c.failed)return'Failed: '+c.title;const s=ctrStage(c),due=c.due!=null?`, by day ${c.due}`:'';
 if(!s)return c.title;if(s.k==='go'&&s.kind==='escort'&&typeof escStatus==='function')return escStatus(c)+due;if(s.k==='town'){const t=ctrTown(s.ti);return(ctrDone(c)?`${s.label} in ${ctrPlace(t)}`:`${s.label}: ${ctrPlace(t)}`)+(c.type==='deliver'||c.type==='escort'?due:'')}
 const n=c.stages.filter(x=>x.k==='go').length,i=c.stages.slice(0,c.stage).filter(x=>x.k==='go').length+1;return`${s.label}${n>1?` (${i} of ${n})`:''}: ${CTYPES[c.type]?CTYPES[c.type].n.toLowerCase():'contract'}${due}`}
function ctrTurnInAt(ti){const c=G&&G.contract;if(!c||!ctrDone(c)||ctrTurnInTown(c)!==ti)return null;
 return{c,pay:Math.max(0,c.pay-(c.adv||0)),renown:Math.round(8*c.diff*(typeof runModK==='function'?runModK('renown',1):1)),rep:3+2*c.diff}}
function ctrNote(c,txt){(c.log||(c.log=[])).push({day:G.day,t:txt});if(c.log.length>8)c.log.shift()}
// acting: the company stands on the current stage. Fight, twist card or a stage step. Returns true when it took over.
function ctrArrive(x,y){const t=ctrTargetAt(x,y);if(!t)return false;const c=t.c,s=ctrStage(c);
 // a waypoint with nothing to fight, crossed on a march that goes on elsewhere: ticked off in passing, the march is not halted
 if(!s.fight&&!(c.twist&&!c.twist.fired&&c.twist.when==='arrive')&&G.moving&&G.tap&&Math.hypot(G.tap.x-s.x,G.tap.y-s.y)>=.6*TS){ctrAdvance(c);if(typeof toast==='function')toast(ctrStatus(c));return false}
 G.moving=false;G.route=[];
 if(c.twist&&!c.twist.fired&&c.twist.when==='arrive'){ctrTwistFire(c);return true}
 if(s.fight){const o=ctrBattle(c,t);if(typeof engage==='function')engage(o);else startBattle(o);return true}
 ctrAdvance(c);if(typeof toast==='function')toast(ctrStatus(c));if(typeof save==='function')save();return true}
function ctrAdvance(c){c.stage=Math.min((c.stage|0)+1,c.stages.length-1);ctrSync(c);return c}
// settleBattle (68-battle-flow.js) hands every contract fight here. Returns the toast line.
function ctrBattleEnd(c,win,res){const s=ctrStage(c);if(!c||!s||s.k!=='go')return'';
 if(!win){ctrFail(c,res&&res.obj==='lost'&&s.fight&&s.fight.obj&&s.fight.obj.k==='escort'?'The caravan was lost':'The fight was lost');return'Contract failed'}
 const T=CTYPES[c.type];if(T&&T.onBattle)try{T.onBattle(c,s,win)}catch(e){}
 if(c.type==='hunt'&&typeof ambEvent==='function')ambEvent('lair',{f:c.f,diff:c.diff});
 if(c.type==='nest'){if(c.nest!=null){if(typeof nestClear==='function'){try{nestClear(c.nest)}catch(e){}}else if(Array.isArray(G.nests))G.nests=G.nests.filter(n=>n.id!==c.nest)}if(typeof ambEvent==='function')ambEvent('lair',{f:c.f,diff:c.diff})}
 if(c.type==='siege'){const o=ctrTown(c.at);if(o&&Array.isArray(o.sit)){if(typeof townSiegeEnd==='function'){try{townSiegeEnd(c.at,'broken')}catch(e){}}else o.sit=o.sit.filter(x=>x&&x.k!=='siege')}}
 if(c.type==='defend'){const o=ctrTown(c.town);if(o&&typeof o.pros==='number')o.pros=Math.min(100,o.pros+5)}
 if(c.type==='relic'&&c.site!=null&&Array.isArray(G.sites)){const st=G.sites.find(x=>x.id===c.site);if(st)st.v=1}
 ctrAdvance(c);ctrNote(c,'Won the fight at '+s.label);
 if(c.twist&&!c.twist.fired&&c.twist.when==='battle')c.twist.ready=1;
 const h=ctrTown(ctrTurnInTown(c));return ctrDone(c)?`Contract work done. Return to ${ctrPlace(h)} for pay`:ctrStatus(c)}
function ctrFail(c,why){if(!c||c.failed)return;c.failed=true;c.done=false;{const T=CTYPES[c.type];if(T&&typeof T.onFail==='function')T.onFail(c)}const n=4+2*c.diff+(c.adv>0?4:0);ctrRepGain(c.emp,-n,why||'Contract failed');G.renown=Math.max(0,G.renown-5);ctrNote(c,why||'Failed');
 if(typeof ambEvent==='function')ambEvent('contractFail',c);if(G.contract===c)G.contract=null;G.ctrLast={id:c.id,title:c.title,ok:false,why:why||'',day:G.day}}
function ctrAbandon(){const c=G.contract;if(!c)return false;ctrFail(c,'Contract abandoned');return true}
// acting: pays out at town ti. {ok, pay, renown, text}
function ctrTurnIn(ti){const q=ctrTurnInAt(ti);if(!q)return null;const c=q.c;
 if(ctrBetrayBites(c)){ctrBetrayState(c,ti,q.pay);return{ok:false,betray:true,c,ti,card:ctrBetrayCard(c,ti)}}   // the betrayal's choice comes first (ctrBetrayPick)
 if(c.twist&&c.twist.bf)return null;   // the garrison fight for the pay is under way (ctrBetrayBattleEnd)
 if(c.twist&&c.twist.fired&&svObj(c.twist.res)&&!c.twist.paid){c.twist.paid=1;q.pay=Math.max(0,Math.round(svNum(c.twist.res.pay,q.pay)));c.twistText=String(c.twist.res.text||'');if(c.twist.pick===2)q.rep=0}   // pay taken by force earns no goodwill
 if(c.twist&&!c.twist.fired&&c.twist.when==='turnin'){const tw=CTWIST[c.twist.k];c.twist.fired=true;const r=tw.apply(c)||{};if(r.pay!=null)q.pay=r.pay;if(r.text)ctrNote(c,r.text);c.twistText=r.text||''}
 const bonus=c.bonus||0;G.crowns+=q.pay+bonus;G.renown+=q.renown;ctrRepGain(c.emp,q.rep,'Contract fulfilled');if(c.outbid)ctrRepGain(c.outbid,-3,'Refused their offer');
 G.contract=null;G.ctrLast={id:c.id,title:c.title,ok:true,day:G.day};if(typeof ambEvent==='function')ambEvent('contract',c);if(typeof runOnContract==='function')runOnContract(c);if(CTYPES[c.type]&&typeof CTYPES[c.type].onTurnIn==='function')try{CTYPES[c.type].onTurnIn(c,ti)}catch(e){}
 const adv=c.adv?` (${c.adv} was paid up front)`:'';return{ok:true,c,pay:q.pay+bonus,renown:q.renown,text:`${c.twistText?c.twistText+' ':''}Contract fulfilled. You are paid ${q.pay+bonus} crowns${adv} and gain ${q.renown} renown.`}}
function ctrAccept(c){if(!c||G.contract||c.rtook)return false;   // a notice a rival company took is no longer open
 const t=ctrTown(c.town);if(t&&Array.isArray(t.contracts)){const i=t.contracts.indexOf(c);if(i>=0)t.contracts.splice(i,1)}
 if(c.neg&&c.neg.gone)return false;c.taken=G.day;c.tickDay=G.day;G.contract=c;if(c.adv>0)G.crowns+=c.adv;ctrSync(c);{const T=CTYPES[c.type];if(T&&typeof T.onAccept==='function')T.onAccept(c)}return true}
// acting: once a day
function ctrDaily(){const c=G&&G.contract;if(!c)return null;if(c.type==='escort'&&typeof escCheck==='function'&&escCheck(c))return'lost';
 if(c.curse&&G.roster.length){const m=pick(G.roster);m.hp=Math.max(1,m.hp-8)}
 if(c.due!=null&&G.day>c.due&&(!ctrDone(c)||c.type==='deliver'||c.type==='escort')){const t=c.title;ctrFail(c,'Too late');if(typeof toast==='function')toast('Contract failed: too late for '+t);return'late'}
 if(c.twist&&!c.twist.fired&&c.twist.when==='travel'&&G.day>(c.taken!=null?c.taken:c.day)){c.twist.ready=1}
 if(c.twist&&c.twist.ready&&!c.twist.fired&&G.moving&&typeof sheetOpen!=='undefined'&&!sheetOpen&&mode==='world'){ctrTwistFire(c);return'twist'}
 return null}

/* ---- negotiation: deterministic per contract (ctrH of its id), at most 3 rounds. The employer's mood starts from the
   reputation the company has with them and their house personality; every push past what they will pay sours it. ---- */
const CTR_PERS={proud:{n:'proud',mood:-5,pay:.12,adv:.25,temper:1.35},greedy:{n:'greedy',mood:-10,pay:.07,adv:.15,temper:1},pious:{n:'pious',mood:6,pay:.12,adv:.4,temper:.8},warlike:{n:'warlike',mood:0,pay:.2,adv:.3,temper:1.1},free:{n:'practical',mood:0,pay:.12,adv:.3,temper:1}};
function ctrPers(c){const h=ctrHouse(c.emp);return CTR_PERS[h&&h.pers]||CTR_PERS.free}
function ctrMoodN(v){return v>=70?'pleased':v>=45?'patient':v>=25?'irritated':'angry'}
function ctrNeg(c){if(!c.neg||typeof c.neg!=='object'){const P=ctrPers(c),rep=ctrRep(c.emp),v=clamp(Math.round(55+rep*.4+P.mood+ctrRenownT()*3),5,95);c.neg={r:0,mood:v,base:c.pay0||c.pay,gone:false,counter:null}}return c.neg}
function ctrMood(c){const N=ctrNeg(c),P=ctrPers(c),rep=ctrRep(c.emp);return{v:N.mood,n:ctrMoodN(N.mood),why:`${ctrEmpName(c)}: ${P.n}, reputation ${rep>0?'+':''}${rep}`,rounds:N.r,left:3-N.r}}
function ctrLimits(c){const N=ctrNeg(c),P=ctrPers(c),j=ctrH(c.id|0,1),pay=Math.floor(N.base*(1+P.pay+N.mood/500+.06*j)/10)*10,adv=clamp(P.adv+N.mood/400,0,.6);return{pay:Math.max(N.base,pay),adv}}
function ctrNegotiate(c,ask){if(!c)return{ok:false,c,mood:0,moodN:'angry',msg:'No contract'};const N=ctrNeg(c);ask=ask||{};
 const out=(ok,msg,x)=>Object.assign({ok,c,mood:N.mood,moodN:ctrMoodN(N.mood),msg,rounds:N.r,left:3-N.r},x||{});
 if(N.gone)return out(false,'The offer is withdrawn.',{gone:true});
 const pay=Math.max(10,Math.round((ask.pay==null?c.pay:+ask.pay)/10)*10),adv=Math.max(0,Math.round((+ask.adv||0)/10)*10),L=ctrLimits(c),P=ctrPers(c);
 if(adv>pay)return out(false,'The advance cannot be more than the pay.');
 if(pay<=L.pay&&adv<=Math.floor(L.adv*pay/10)*10){const push=Math.max(0,pay/N.base-1);N.mood=clamp(Math.round(N.mood-push*40*P.temper),0,100);c.pay=pay;c.adv=adv;N.counter=null;return out(true,adv?`Agreed: ${pay} crowns, ${adv} of it now.`:`Agreed: ${pay} crowns.`)}
 const over=Math.max(pay/L.pay-1,(adv-L.adv*pay)/Math.max(1,pay));N.r++;N.mood=clamp(Math.round(N.mood-(8+Math.min(over,.5)*40)*P.temper),0,100);
 if(N.mood<=0||N.r>=3){N.gone=true;const t=ctrTown(c.town);if(t&&Array.isArray(t.contracts)&&G.contract!==c){const i=t.contracts.indexOf(c);if(i>=0)t.contracts.splice(i,1)}if(N.mood<=10)ctrRepGain(c.emp,-2,'Haggled too hard');return out(false,`${ctrEmpName(c)} has heard enough and gives the work to someone else.`,{gone:true})}
 const L2=ctrLimits(c),cp=Math.min(pay,L2.pay),ca=Math.min(adv,Math.floor(L2.adv*cp/10)*10);N.counter={pay:cp,adv:ca};
 return out(false,`Too much. ${ctrEmpName(c)} offers ${cp} crowns${ca?`, ${ca} up front`:''}.${N.r>=2?' That is the last word.':''}`,{counter:N.counter})}

/* ---- twists: rolled when the contract is posted (30%), hidden until they fire. CTWIST[k] = {n, d, when, types, apply(c) ->
   {text, opts:[{t, d, req?(c), go(c)->{text, fight?}}]} | {text, pay?} (turn-in twists resolve at once)} ---- */
const CTWIST={
 ambush:{n:'Ambush on the road',d:'Brigands who knew your route.',when:'travel',types:['deliver','relic','patrol'],   // an escort's ambush is a real band on the road (escAmbush)
  apply(c){const toll=Math.max(20,Math.round(c.pay*.2/10)*10);return{text:'Figures rise from the ditch ahead: brigands who knew your route. Their captain names a toll.',
   opts:[{t:'Fight them',d:'A battle against brigands (an even match).',go:()=>({text:'Steel it is.',fight:{f:'bandit',mult:.9,src:{type:'twist',id:c.id}}})},
    {t:`Pay the toll (${toll} crowns)`,d:`−${toll} crowns.`,req:()=>G.crowns>=toll,go:()=>{G.crowns-=toll;return{text:'They count the coin twice and melt into the trees.'}}}]}}},
 bribe:{n:'A bribe',d:'The target offers coin to be left alone.',when:'arrive',types:['bounty','hunt','siege'],
  apply(c){const g=Math.round(c.pay*.6/10)*10;return{text:`A messenger meets you under a white rag: ${c.boss?c.boss.name:'their leader'} offers ${g} crowns if you turn around and forget the job.`,
   opts:[{t:'Refuse and attack',d:'The battle goes ahead.',go:()=>({text:'You send the messenger back without his ears’ worth of answer.',fight:ctrBattle(c)})},
    {t:`Take the ${g} crowns`,d:`+${g} crowns. The contract fails: −${4+2*c.diff} reputation with ${ctrEmpName(c)}, −5 renown.`,go:()=>{G.crowns+=g;ctrFail(c,'Took a bribe');return{text:'The purse is heavy. Word of it will reach your employer.'}}}]}}},
 surrender:{n:'Surrender',d:'The target gives up without a fight.',when:'arrive',types:['bounty','defend'],
  apply(c){return{text:c.type==='bounty'?`${c.boss?c.boss.name:'The brigand'} walks out alone, hands open. Rather the rope later than your steel now.`:'The raiders see the company at the gate and lose heart. Their leader asks to parley.',
   opts:[{t:'Accept the surrender',d:'The job is done without a battle. The pay is 15% lower (no proof of a fight).',go:()=>{c.pay=Math.round(c.pay*.85/10)*10;ctrAdvance(c);return{text:'It is done without blood.'}}},
    {t:'Cut them down anyway',d:'The battle goes ahead; +5 renown if you win.',go:()=>{c.bonusRenown=5;return{text:'No quarter.',fight:ctrBattle(c)}}}]}}},
 outbid:{n:'A second employer',d:'A rival offers more for what you carry.',when:'travel',types:['deliver','relic','escort'],
  apply(c){const R=(G.houses||[]).filter(h=>h&&h.id!==c.emp),rv=R.length?R[(c.id>>>3)%R.length]:null,rn=rv?rv.short||rv.n:'a free merchant',g=Math.round(c.pay*1.5/10)*10;
   return{text:`An agent of ${rn} rides up beside the wagons. They will pay ${g} crowns for ${c.relic||c.cargo||'the cargo'}, here and now.`,
    opts:[{t:`Sell to ${rn} (${g} crowns)`,d:`+${g} crowns. The contract fails: −${8+2*c.diff} reputation with ${ctrEmpName(c)}${rv?`, +8 with ${rn}`:''}.`,go:()=>{G.crowns+=g;if(rv)ctrRepGain(rv.id,8,'Sold them the cargo');ctrRepGain(c.emp,-4,'Sold the cargo to a rival');ctrFail(c,'Sold to a rival');return{text:'The agent smiles. Your old employer will not.'}}},
     {t:'Refuse',d:`Stay true: +${4} reputation with ${ctrEmpName(c)} when you deliver${rv?`, −3 with ${rn}`:''}.`,go:()=>{c.outbid=rv?rv.id:null;c.loyal=1;ctrRepGain(c.emp,4,'Refused a rival');return{text:'The agent shrugs and rides off.'}}}]}}},
 cursed:{n:'The cargo is cursed',d:'Something in the cargo is wrong.',when:'travel',types:['deliver','relic'],
  apply(c){const gifted=G.roster.find(m=>typeof tlRes==='function'&&tlRes(m));return{text:'At night the cargo whispers. Men wake with bloody noses and nobody sleeps well.',
   opts:[{t:'Carry on',d:'Until delivered, one sword loses 8 hitpoints every day.',go:()=>{c.curse=1;return{text:'You lash the crate tighter and march on.'}}},
    {t:'Seal it with the gift',d:gifted?`${gifted.name} binds it: no curse, −15 hitpoints for ${gifted.name}.`:'Needs a gifted sword.',req:()=>!!gifted,go:()=>{gifted.hp=Math.max(1,gifted.hp-15);return{text:`${gifted.name} works through the night. The whispering stops.`}}},
    {t:'Dump it in a ditch',d:`The contract fails: −${4+2*c.diff} reputation, −5 renown.`,go:()=>{ctrFail(c,'Dumped the cargo');return{text:'Better poor than haunted.'}}}]}}},
 betrayal:{n:'Betrayal',d:'The employer will not pay in full.',when:'turnin',types:['hunt','beast','nest','patrol','defend','bounty','siege','relic','escort','deliver'],
  apply(c){const pay=Math.max(0,c.pay-(c.adv||0));return{text:'The steward begins to haggle over the pay, then thinks better of it.',pay}}}   // the grace (standing >= BETRAY.grace); below it: the choice (ctrBetrayCard)
};
/* ---- betrayal at the turn-in: the choice sheet ----
   ctrTurnIn(ti) on a contract whose betrayal bites (standing with the employer < BETRAY.grace; at or above it the steward pays in full)
   pays nothing yet and returns {ok:false, betray:true, c, ti, card}. c.twist.bt = {owed, short, force, p, lines, talk, guard, loss} is fixed
   the first time it bites (the odds shown are the odds used, across a save too). ctrBetrayPick(i, ti) resolves choice i and completes the turn-in:
     0 accept: the short pay (BETRAY.short of what is owed), no standing lost.
     1 argue:  one rnd() draw against bt.p (BETRAY.base, + BETRAY.tier a renown tier above the first, + standing x BETRAY.rep, + the best
               talker: (resolve - BETRAY.brv0) x BETRAY.brv + background BETRAY.bg + traits BETRAY.tr, + BETRAY.pay with a paymaster;
               clamped BETRAY.min..max). Success: the full pay. Failure: the short pay and BETRAY.fail standing.
     2 force:  the whole purse owed plus BETRAY.extra, and BETRAY.force standing (BETRAY.forceLow when already below 0; a proud house doubles
               it, repGain: so it can turn the house hostile, its markets and board closed as any hostile town's). When the house holds the town in
               strength (its garrison, 43-garrisons.js grStr >= BETRAY.guard) the garrison bars the way: a battle (src.type 'betray', the house's
               soldiers in its livery); won: the purse, lost or fled: nothing more and the contract closes. */
const BETRAY={grace:30,short:.6,extra:.1,base:.22,tier:.06,rep:.005,brv:.006,brv0:45,pay:.08,min:.05,max:.9,fail:-5,force:-20,forceLow:-30,guard:.8,
 bg:{noble:.12,knight:.08,hedgeknight:.06,caravan:.05,squire:.04,veteran:.04,watchman:.03,witchhunter:.03},tr:{cocky:.04,brave:.03,loyal:.02,craven:-.05,drunkard:-.04}};
function ctrBetrayBites(c){return!!(c&&c.twist&&c.twist.k==='betrayal'&&!c.twist.fired&&(svObj(c.twist.bt)||ctrRep(c.emp)<BETRAY.grace))}
// the company's best talker: resolve, background and traits -> {m, k (its share of the odds), why}
function ctrTalker(){let best=null;for(const m of (G&&G.roster)||[]){const st=typeof calc==='function'?calc(m):{brv:40},brv=svNum(st.brv,40);let k=(brv-BETRAY.brv0)*BETRAY.brv;const bits=[`resolve ${Math.round(brv)}`];
  const bk=BETRAY.bg[m.bg];if(bk){k+=bk;bits.push(BG[m.bg]?bgLow(m.bg):m.bg)}for(const t of m.traits||[]){const tk=BETRAY.tr[t];if(tk){k+=tk;bits.push(TRAITS[t]?TRAITS[t].n.toLowerCase():t)}}
  k=Math.round(k*100)/100;if(!best||k>best.k)best={m,k,why:bits.join(', ')}}return best}
// the odds of arguing for the full pay -> {p, lines:[{t, v (percent points)}], talker}
function ctrBetrayOdds(c){const L=[],T=ctrRenownT(),rep=ctrRep(c.emp),tk=ctrTalker();let p=BETRAY.base;L.push({t:'A steward who has made up his mind',v:Math.round(BETRAY.base*100)});
 if(T>1){const v=BETRAY.tier*(T-1);p+=v;L.push({t:'the company\'s name ('+(typeof renownDef==='function'?renownDef(T).n:'tier '+T)+')',v:Math.round(v*100)})}
 if(rep){const v=rep*BETRAY.rep;p+=v;L.push({t:`standing ${rep>0?'+':''}${rep}`,v:Math.round(v*100)})}
 if(tk&&tk.k){p+=tk.k;L.push({t:`${tk.m.name} speaks (${tk.why})`,v:Math.round(tk.k*100)})}
 if(typeof followerHas==='function'&&followerHas('paymaster')){p+=BETRAY.pay;L.push({t:'the paymaster\'s ledger',v:Math.round(BETRAY.pay*100)})}
 return{p:Math.round(clamp(p,BETRAY.min,BETRAY.max)*100)/100,lines:L,talker:tk?tk.m:null}}
// the garrison bars the way when the house holds town ti in strength: its strength, else 0
function ctrBetrayGuard(c,ti){if(!(typeof isHouse==='function'?isHouse(c.emp):!!ctrHouse(c.emp)))return 0;const t=ctrTown(ti);if(!t||t.own!==c.emp)return 0;const s=typeof grStr==='function'?grStr(ti):(t.size>=2?1:0);return s>=BETRAY.guard?Math.round(s*100)/100:0}
function ctrBetrayState(c,ti,owed){const tw=c.twist;if(svObj(tw.bt))return tw.bt;const O=ctrBetrayOdds(c),rep=ctrRep(c.emp);
 tw.bt={owed,short:Math.round(owed*BETRAY.short/10)*10,force:owed+Math.round(owed*BETRAY.extra/10)*10,p:O.p,lines:O.lines,talk:O.talker?O.talker.id:null,guard:ctrBetrayGuard(c,ti),loss:rep<0?BETRAY.forceLow:BETRAY.force};return tw.bt}
function ctrEsc(s){return typeof htmlEsc==='function'?htmlEsc(String(s)):String(s)}
// the card: {n, text, opts:[{t, d, ok}], bt}; null unless the betrayal is waiting on a choice
function ctrBetrayCard(c,ti){c=c||G.contract;if(!c||!c.twist||!svObj(c.twist.bt)||c.twist.fired)return null;const b=c.twist.bt,e=ctrEsc(ctrEmpName(c)),pc=Math.round(b.p*100),t=ctrTown(ti!=null?ti:ctrTurnInTown(c)),
  lossN=ctrBetrayLossN(c,b.loss),hos=ctrRep(c.emp)+lossN<-40,why=b.lines.map(x=>`${x.t} ${x.v>=0?'+':'−'}${Math.abs(x.v)}%`).join(' · ');
 return{n:'Betrayal',bt:b,text:`<p>The steward of ${e} counts the coin onto the table and stops at <b>${b.short}</b> of the <b>${b.owed}</b> crowns owed. “The work was slower than promised,” he says. His guards at the door do not look away.</p>`,
  opts:[{t:`Accept the short pay (${b.short} crowns)`,d:`Swallow it: +${b.short} crowns. Your standing with ${e} is unchanged.`,ok:true},
   {t:`Argue for the full pay: ${pc}% chance`,d:`Success: all ${b.owed} crowns. Failure: ${b.short} crowns and −${Math.abs(BETRAY.fail)} standing. <span class="ctr-odds">${ctrEsc(why)}</span>`,ok:true},
   {t:`Take it by force (${b.force} crowns)`,d:(b.guard?`The garrison of ${ctrEsc(t?t.name:'the town')} bars the door: a battle against ${e}'s soldiers. Win: ${b.force} crowns. Lose or flee: nothing more. `:`The whole purse and something for the trouble: +${b.force} crowns. `)+`−${Math.abs(lossN)} standing with ${e}${hos?': they turn hostile, their markets and board closed to you':''}.`,ok:true}]}}
function ctrBetrayLossN(c,n){const h=ctrHouse(c.emp),P=h&&typeof HPERS==='object'?HPERS[h.pers]:null;return Math.round(n*(P&&P.proud>1?P.proud:1))}
/* acting: resolves betrayal choice i at town ti -> {ok, k:'accept'|'won'|'lost'|'force'|'fight', text, pay, fx:[{t, c}], fight?, turn? (ctrTurnIn's result)} | null */
function ctrBetrayPick(i,ti,c){c=c||G.contract;if(!c||!c.twist||!svObj(c.twist.bt)||c.twist.fired)return null;if(ti==null)ti=ctrTurnInTown(c);i=i|0;if(i<0||i>2)return null;const b=c.twist.bt,e=ctrEmpName(c),fx=[];
 const rg=(n,why)=>{const r0=ctrRep(c.emp);ctrRepGain(c.emp,n,why);const d=ctrRep(c.emp)-r0;if(d)fx.push({t:`${d>0?'+':''}${d} standing with ${e}`,c:d>0?'good':'bad'})};
 let pay=b.short,k='accept',text='';c.twist.pick=i;
 if(i===0)text=`You take the ${b.short} crowns without a word. The steward looks almost disappointed.`;
 else if(i===1){const roll=rnd(),m=b.talk!=null?G.roster.find(x=>x.id===b.talk):null;c.twist.roll=Math.round(roll*1000)/1000;
  if(roll<b.p){k='won';pay=b.owed;text=`${m?m.name:'Your sergeant'} lays the work out day by day until the steward runs out of excuses. He pays it all.`}
  else{k='lost';text='The steward will not be moved, and the shouting carries to the hall. You leave with the short pay and a worse name in this house.';rg(BETRAY.fail,'Argued over the pay')}}
 else{rg(b.loss,'Took the pay by force');
  if(b.guard){k='fight';c.twist.bf=1;c.twist.fired=true;c.twist.res={pay:b.force,text:'You took the pay from the steward\'s strongbox at sword point.'};ctrNote(c,'Betrayal: took it by force');
   const src={type:'betray',id:c.id,ti},o=typeof grTownBattle==='function'?grTownBattle(ti,src):{f:c.emp,mult:Math.max(.6,b.guard),src};
   return{ok:true,k,text:`Steel comes out across the counting table, and the garrison of ${ctrPlace(ctrTown(ti))} pours into the hall.`,pay:0,fx,fight:o}}
  k='force';pay=b.force;text='Steel comes out across the counting table. The steward unlocks the strongbox with shaking hands.'}
 c.twist.fired=true;c.twist.res={pay,text};ctrNote(c,'Betrayal: '+['accepted the short pay','argued '+(k==='won'?'and won':'and lost'),'took it by force'][i]);
 const r=ctrTurnIn(ti);fx.unshift({t:`+${pay} crowns`,c:pay>=b.owed?'good':''});return{ok:!!(r&&r.ok),k,text,pay,fx,turn:r}}
// the guard fight is over (worldBattleEnd, src.type 'betray'): won -> the purse and the turn-in; lost or fled -> the contract closes unpaid
function ctrBetrayBattleEnd(s,win,out){const c=G.contract;if(!c||c.id!==s.id||!c.twist||!c.twist.bf)return out;delete c.twist.bf;
 if(typeof grBetrayHit==='function')grBetrayHit(s.ti,win);
 if(win){const r=ctrTurnIn(s.ti);if(r&&r.ok){out.betray={win:true,pay:r.pay};if(typeof toast==='function')toast(`The garrison is beaten. You take ${r.pay} crowns from the strongbox.`)}return out}
 G.contract=null;G.ctrLast={id:c.id,title:c.title,ok:false,why:'Beaten by the garrison',day:G.day};out.betray={win:false};
 if(typeof toast==='function')toast('Beaten by the garrison: the company leaves without its pay.');return out}
// shows the card for the contract at town ti: the event card (17-events.js) when it exists, else a sheet. True when shown.
const CTRBT={ti:null};
function ctrBetrayShow(ti){const c=G&&G.contract;if(!c)return false;const card=ctrBetrayCard(c,ti);if(!card)return false;G.moving=false;G.route=[];let fight=null;
 const then=()=>{if(fight){const o=fight;fight=null;if(typeof engage==='function')engage(o);else startBattle(o);return}if(typeof openTown==='function')openTown(ti)};
 if(typeof eventShow==='function'&&typeof EVENTS==='object'&&EVENTS){const id='ctr-betrayal',tk=card.bt.talk,m=tk!=null?G.roster.find(x=>x.id===tk):null,ctx={c,twist:'betrayal',town:ti,then};if(m)ctx.m=m;
  EVENTS[id]={n:card.n,art:'twist-betrayal',twist:1,text:()=>card.text,when:()=>0,opts:card.opts.map((o,i)=>({t:o.t,d:o.d,go:()=>{const r=ctrBetrayPick(i,ti,c);if(!r)return'';if(typeof evLog==='function')for(const x of r.fx)evLog(x.t,x.c);if(r.fight)fight=r.fight;return`<p>${r.text}</p>`}}))};
  try{if(eventShow(id,ctx))return true}catch(e){}}
 if(typeof sheet!=='function')return false;CTRBT.ti=ti;
 sheet(`<h2>${card.n}</h2>${card.text}${card.opts.map((o,i)=>`<button type="button" class="${i?'':'pri'}" onclick="ctrBetrayBtn(${i})"><b>${o.t}</b><br><small>${o.d}</small></button>`).join('')}`);return true}
function ctrBetrayBtn(i){const ti=CTRBT.ti,r=ctrBetrayPick(i,ti);if(!r)return;if(typeof closeSheet==='function')closeSheet(true);if(r.text&&typeof toast==='function')toast(r.text);
 if(r.fight){if(typeof engage==='function')engage(r.fight);else startBattle(r.fight);return}if(typeof openTown==='function')openTown(ti)}
function ctrBetrayRepair(tw){const b=tw.bt;if(b!==undefined){if(!svObj(b)||!svFin(b.owed)||!svFin(b.short)||!svFin(b.p))delete tw.bt;
  else{for(const k of ['owed','short','force'])b[k]=Math.max(0,Math.round(svNum(b[k],b.owed)));b.p=clamp(b.p,0,1);b.guard=Math.max(0,svNum(b.guard,0));b.loss=Math.min(0,Math.round(svNum(b.loss,BETRAY.force)));
   b.lines=Array.isArray(b.lines)?b.lines.filter(x=>svObj(x)&&typeof x.t==='string'&&svFin(x.v)).slice(0,8):[];if(b.talk!=null&&!svFin(b.talk))b.talk=null}}
 if(tw.res!==undefined&&(!svObj(tw.res)||!svFin(tw.res.pay)))delete tw.res;if(tw.bf)tw.bf=1;else delete tw.bf;if(tw.paid)tw.paid=1;else delete tw.paid;
 if(tw.fired&&svObj(tw.bt)&&!tw.res)tw.res={pay:tw.bt.short,text:''}}
function ctrTwistCard(c){c=c||G.contract;if(!c||!c.twist)return null;const T=CTWIST[c.twist.k];if(!T||T.when==='turnin')return null;
 const A=T.apply(c);return{k:c.twist.k,n:T.n,text:A.text,opts:(A.opts||[]).map(o=>({t:o.t,d:o.d,ok:!o.req||!!o.req(c)})),_A:A}}
// rules: resolve option i of the current contract's fired twist. -> {text, fight:startBattle options|null}
function ctrTwistPick(i,c){c=c||G.contract;if(!c||!c.twist)return null;const T=CTWIST[c.twist.k];if(!T)return null;const A=T.apply(c),o=A.opts&&A.opts[i];if(!o||(o.req&&!o.req(c)))return null;
 c.twist.fired=true;c.twist.ready=0;c.twist.pick=i;const r=o.go(c)||{};ctrNote(c,T.n+': '+o.t);return{text:r.text||'',fight:r.fight||null}}
// shows the twist as an event card (17-events.js eventShow) when that exists, else as a sheet
function ctrTwistFire(c){if(!c||!c.twist||c.twist.fired)return false;const card=ctrTwistCard(c);if(!card)return false;G.moving=false;G.route=[];
 if(typeof eventShow==='function'&&typeof EVENTS==='object'&&EVENTS){const id='ctr-'+card.k;
  EVENTS[id]={n:card.n,art:'twist-'+card.k,twist:1,text:()=>card.text,when:()=>0,opts:card._A.opts.map((o,i)=>({t:o.t,d:o.d,req:()=>!o.req||!!o.req(c),go:()=>{const r=ctrTwistPick(i,c);ctrTwistAfter(r);return r?r.text:''}}))};
  try{eventShow(id,{c,twist:card.k});return true}catch(e){}}
 if(typeof sheet!=='function')return false;
 sheet(`<h2>${card.n}</h2><p>${card.text}</p>${card.opts.map((o,i)=>`<button type="button" class="${i?'':'pri'}"${o.ok?'':' disabled'} onclick="ctrTwistBtn(${i})"><b>${o.t}</b><br><small>${o.d}</small></button>`).join('')}`);return true}
function ctrTwistBtn(i){const r=ctrTwistPick(i);if(!r)return;if(typeof closeSheet==='function')closeSheet(true);if(r.text&&typeof toast==='function')toast(r.text);ctrTwistAfter(r,true)}
function ctrTwistAfter(r,now){if(!r)return;if(typeof save==='function'&&!r.fight)save();if(!r.fight)return;const go=()=>{if(typeof engage==='function')engage(r.fight);else startBattle(r.fight)};
 if(now||typeof setTimeout!=='function')go();else setTimeout(go,0)}

/* ---- battle objectives (startBattle reads o.obj; 60-battle-core.js) ----
   escort: a VIP of the company's side (CVIP[o.obj.vip]) stands in the back row and must live; it does not move or fight.
   hold:   survive o.obj.rounds rounds (or rout the foe).  siege: the foe starts behind stakes, fortified; kill its leader and the rest break. */
const CVIP={wagon:{n:'Caravan wagon',hp:170,arm:90,helm:0,ms:0,md:0,rd:10,init:1,ap:0,d:[0,0],xp:0,noHead:1,fearless:1,brv:99,role:'vip'}};
if(typeof STATUS==='object'&&STATUS){Object.assign(STATUS,{fort:{n:'Fortified',d:'Behind stakes and earthworks: +10 melee defense, +15 ranged defense for its first turns.',icon:'shield',good:1}})}
const OBJ_FORT={md:10,rd:15,dur:4};
function objVipUnit(k){const d=CVIP[k]||CVIP.wagon;return initUnit({side:0,vip:k,def:d,name:d.n,lvl:1,hp:d.hp,hpMax:d.hp,arm:d.arm,armMax:d.arm,helm:d.helm,helmMax:d.helm,apMax:0,ap:0,fat:0,fatMax:9999,init:d.init,ms:0,rs:0,md:d.md,rd:d.rd,brv:99,fearless:true,noHead:true,
 wpn:{n:'None',d:[0,0],ap:99,rng:1,fat:0},abs:[],res:{},flags:{noLock:1},dmgB:0,buffs:[],st:{},alive:true,shield:false,shp:0,shb:null,back:true,mor:3,kbN:0,kbCh:0})}
// siege works: stakes across the row in front of the foe's line, a gap every four columns. Pure (no rnd).
function objFortify(tiles){if(!Array.isArray(tiles))return tiles;const r=typeof DEPLOY==='object'?DEPLOY.e.front+1:2;for(let c=0;c<BW;c++){if(c%4===1)continue;const t=tiles[key(c,r)];if(t){t.t='block';t.fort=1}}return tiles}
// startBattle calls this once the units stand: adds the VIP, fortifies, marks the leader and the named boss
function objSetup(b,o,used){const ob=o.obj;b.obj=ob?{k:ob.k,rounds:ob.rounds|0,state:'ok'}:null;
 if(o.boss){const E=b.units.filter(u=>u.side===1);let u=E.find(x=>x.eid===o.boss.id)||E.slice().sort((a,c)=>(c.def&&c.def.xp||0)-(a.def&&a.def.xp||0))[0];
  if(u){const K=CTR_BOSSK;u.boss=1;u.name=o.boss.name;u.title=o.boss.title||'';u.hp=u.hpMax=Math.round(u.hpMax*K.hp);u.arm=u.armMax=Math.round((u.armMax||0)*K.arm);if(typeof u.helm==='number'){u.helm=Math.round(u.helm*K.arm);u.helmMax=u.helm}
   u.ms+=K.ms;u.md+=K.md;u.rd+=Math.round(K.md/2);u.dmgB=(u.dmgB||0)+K.dmg;u.brv=Math.max(u.brv||0,90);u.fearless=true;b.bossU=u}}
 if(!ob)return;
 if(ob.k==='escort'){const v=objVipUnit(ob.vip||'wagon');if(ob.hpK>0&&ob.hpK!==1){const k=clamp(ob.hpK,.5,4);v.hp=v.hpMax=Math.round(v.hpMax*k);v.arm=v.armMax=Math.round(v.armMax*k)}   // hpK: a whole caravan's wagons (42-caravans.js escBattle)
 const pl=place([v],DEPLOY.p.back,DEPLOY.p.back,DEPLOY.p.dir,b.tiles,used);if(pl.length){b.units.push(v);b.obj.vip=v;b.obj.vipN=v.name}}
 if(ob.k==='siege'){const E=b.units.filter(u=>u.side===1);for(const u of E)addBuff(u,{key:'fort',md:OBJ_FORT.md,rd:OBJ_FORT.rd},OBJ_FORT.dur);
  const L=b.bossU||E.find(u=>u.def&&u.def.lead)||E.slice().sort((a,c)=>(c.def&&c.def.xp||0)-(a.def&&a.def.xp||0))[0];if(L){L.leader=1;b.obj.leader=L;b.obj.leaderN=L.name}}}
// rules: null = the objective does not decide the battle now; true = the company has won; false = lost. Called from checkEnd.
function objCheck(b){b=b||B;const ob=b&&b.obj;if(!ob)return null;
 if(ob.k==='escort'&&ob.vip&&!ob.vip.alive){ob.state='lost';return false}
 if(ob.k==='hold'&&ob.rounds>0&&b.round>ob.rounds){ob.state='won';return true}
 if(ob.k==='siege'&&ob.leader&&!ob.leader.alive){ob.state='won';return true}
 return null}
function objStatus(){const b=typeof B!=='undefined'?B:null,ob=b&&b.obj;if(!ob)return null;const o={k:ob.k,state:ob.state||'ok',round:b.round};
 if(ob.k==='escort'){const v=ob.vip;o.n='Escort';o.goal=`Keep the ${(ob.vipN||'wagon').toLowerCase()} alive`;o.vip=v?{name:v.name,hp:Math.max(0,Math.round(v.hp)),hpMax:v.hpMax,arm:Math.round(v.arm||0),armMax:v.armMax||0,alive:!!v.alive,u:v}:null;o.line=v?`${v.name}: ${o.vip.hp}/${v.hpMax}`:o.goal}
 else if(ob.k==='hold'){o.n='Hold';o.rounds=ob.rounds;o.left=Math.max(0,ob.rounds-b.round+1);o.goal=`Hold for ${ob.rounds} rounds or rout them`;o.line=o.state==='won'?'Held':`Round ${Math.min(b.round,ob.rounds)} of ${ob.rounds}`}
 else if(ob.k==='siege'){const L=ob.leader;o.n='Siege';o.leader=L?{name:L.name,alive:!!L.alive,hp:Math.max(0,Math.round(L.hp)),hpMax:L.hpMax,u:L}:null;o.goal=L?`Kill ${L.name} or rout them`:'Rout them';o.line=L?(L.alive?`${L.name} stands`:`${L.name} is dead`):o.goal}
 return o}
// AI: what the company's plan becomes under an objective (63-ai.js aiPlan) and how much foes want the VIP / the leader
function objPlan(plan,u){const b=B,ob=b&&b.obj;if(!ob)return plan;const p=Object.assign({},plan||{});
 if(ob.k==='hold'){p.hold=1;p.holdR=Math.max(p.holdR||0,ob.rounds+1)}
 if(ob.k==='escort'){p.hold=1;p.holdR=Math.max(p.holdR||0,3);p.guard=ob.vip||null}
 if(ob.k==='siege'&&ob.leader){p.hunt=Object.assign({},p.hunt||{});p.hunt[ob.leader.eid]=Math.max(p.hunt[ob.leader.eid]||1,1.8);p.leader=ob.leader}
 return p}

/* ---- saves ---- */
function ctrRepair(c,nTowns,towns){if(!svObj(c))return false;if(!CTYPES[c.type])return false;   // nTowns/towns: the save being loaded (G may not exist yet at the title)
 towns=Array.isArray(towns)?towns:G&&Array.isArray(G.towns)?G.towns:[];const nT=Number.isInteger(nTowns)?nTowns:towns.length;
 c.diff=clamp(Math.floor(svNum(c.diff,1)),1,5);if(!svFin(c.pay)||typeof c.title!=='string')return false;c.pay=Math.max(0,Math.round(c.pay));c.adv=clamp(Math.round(svNum(c.adv,0)),0,c.pay);
 const ti=i=>Number.isInteger(i)&&i>=0&&i<nT;if(!ti(c.town))c.town=0;
 if(!Array.isArray(c.stages)||!c.stages.length){   // a phase-6 contract: rebuild its stages from its fields
  if(c.type==='deliver'){if(!ti(c.to))return false;c.stages=[ctrHome(c.to,'Deliver the cargo')];c.stage=0}
  else if(c.type==='hunt'){if(!FACT[c.f]||!svFin(c.x)||!svFin(c.y))return false;c.stages=[{k:'go',x:c.x,y:c.y,kind:'lair',label:'Lair',fight:{f:c.f,k:1}},ctrHome(c.town)];c.stage=c.done?1:0}
  else return false}
 for(const s of c.stages){if(!svObj(s))return false;if(s.k==='town'){if(!ti(s.ti))return false}else if(s.k==='go'){if(!svFin(s.x)||!svFin(s.y))return false;if(s.fight&&(!svObj(s.fight)||!FACT[s.fight.f]))s.fight=null}else return false;
  if(typeof s.label!=='string')s.label=s.k==='town'?'Collect the pay':'Target'}
 if(c.stages[c.stages.length-1].k!=='town')c.stages.push(ctrHome(c.town));
 c.stage=clamp(Math.floor(svNum(c.stage,0)),0,c.stages.length-1);if(!svFin(c.id))c.id=Math.floor(ctrH(Math.round(c.pay)+c.diff*977,c.town)*2147483646)+1;
 if(c.emp==null||typeof c.emp!=='string')c.emp=(towns[c.town]&&towns[c.town].own)||'free';
 c.due=svFin(c.due)?Math.floor(c.due):null;if(c.twist&&(!svObj(c.twist)||!CTWIST[c.twist.k]))c.twist=null;if(c.twist){delete c.twist.card;ctrBetrayRepair(c.twist)}
 if(c.neg&&!svObj(c.neg))delete c.neg;c.failed=!!c.failed;
 if(typeof c.rival==='string'&&/^h[0-9]$/.test(c.rival)){c.outbid=c.rival;delete c.rival}if(c.rival!=null&&!/^r[0-9]+$/.test(String(c.rival)))delete c.rival;if(c.outbid!=null&&typeof c.outbid!=='string')delete c.outbid;
 if(svFin(c.rtook))c.rtook=Math.floor(c.rtook);else delete c.rtook;
 if(c.type==='escort'){if(!ti(c.to))return false;if(c.live)c.live=1;else delete c.live;if(c.cv!=null&&!svFin(c.cv))delete c.cv;if(c.amb!=null&&!svFin(c.amb))delete c.amb;if(c.len0!=null)c.len0=Math.max(0,Math.round(svNum(c.len0,0)))}if(c.rivalWon!=null&&typeof c.rivalWon!=='string')delete c.rivalWon;ctrSync(c);return true}
// the world's clock (40-world.js advanceTime) calls this with the hours that passed: ctrDaily() once for every day turned
function ctrTick(h){let c=G&&G.contract;if(!c)return;if(!svFin(c.tickDay))c.tickDay=G.day;for(let g=0;g<40&&c&&G.contract===c&&c.tickDay<G.day;g++){c.tickDay++;ctrDaily();c=G.contract}}

/* ---- rival companies (40-world.js "RIVAL COMPANIES") ----
   c.rival  the rival company's id: on a board notice with c.rtook (the day they took it) the notice is theirs and cannot be accepted;
            on the company's own contract it means they race for the same target (another employer posted the same head).
   c.rivalWon  the rival that got there first (the contract failed).
     ctrTakenBy(c)    -> the rival that took this notice off the board, or null
     ctrRace(c)       -> {r, n, eta, text} while a rival races the company for c's target, else null
     ctrRivalTook(c)  -> the line that says a rival took the work ("Taken by the Black Hounds" / "The Black Hounds reached the lair first"), or ''
     ctrRivalFail(c, r, why)  acting (the world calls it): the race is lost. The contract fails with that notice and NO reputation or renown
                      loss (the company did nothing wrong); the employer only takes back an advance. */
function ctrRvById(id){return typeof rivalById==='function'?rivalById(id):null}
function ctrTakenBy(c){return c&&c.rtook!=null&&c.rival?ctrRvById(c.rival):null}
function ctrRace(c){c=c||(G&&G.contract);if(!c||c.failed||!c.rival||c.rtook!=null)return null;const r=ctrRvById(c.rival);if(!r||!r.alive||!r.ctr||r.ctr.race!==c.id)return null;
 const eta=Math.max(0,Math.round(svNum(r.ctr.eta,0)));const p=typeof rivalParty==='function'?rivalParty(r):null,d=p?Math.hypot(p.x-r.ctr.x,p.y-r.ctr.y)/TS:null;
 const days=d!=null?Math.max(0,Math.ceil(d/10)):eta;return{r,n:r.n,eta:days,text:`${r.n} race you for it: about ${days?days+' day'+(days===1?'':'s'):'less than a day'} from the target`}}
function ctrRivalTook(c){if(!c)return'';if(c.rivalWon){const r=ctrRvById(c.rivalWon),n=r?r.n:'A rival company';const s=Array.isArray(c.stages)?c.stages.find(x=>x&&x.k==='go'&&x.fight):null;return`${n} reached ${s?s.label.toLowerCase()==='lair'?'the lair':s.label:'the target'} first and claimed the work`}
 const r=ctrTakenBy(c);return r?'Taken by '+r.n:''}
function ctrRivalFail(c,r,why){if(!c||c.failed)return;c.failed=true;c.done=false;c.rivalWon=r?r.id:c.rival||'';const adv=Math.max(0,c.adv|0);if(adv&&G.crowns>0)G.crowns=Math.max(0,G.crowns-adv);
 ctrNote(c,why||'A rival got there first');if(G.contract===c)G.contract=null;G.ctrLast={id:c.id,title:c.title,ok:false,why:(why||'A rival got there first')+(adv?`. The employer took back the ${adv} crowns paid up front`:''),day:G.day,rival:c.rivalWon}}
