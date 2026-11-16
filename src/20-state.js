/* ================= STATE ================= */
const TS=32,SPD=[0,1,.7,.62,0,.5,.8,.7];   // SPD: march speed by terrain code (roads and rivers: see tileSpeedOf in 40-world.js)
/* World sizes (G.wsize). WN tiles across, WS = WN*TS world units. They are set from the save (setWorldSize) before a world is
   generated or loaded; everything else derives from WN. towns: how many the generator places. */
const WORLDSZ={small:{n:64,towns:12,name:'Small',note:'A tight march: towns a day apart, the rifts never far.'},
 medium:{n:80,towns:16,name:'Medium',note:'More roads and rivers, and room between the towns.'},
 large:{n:96,towns:20,name:'Large',note:'A broad land of ranges and long roads. Supplies matter.'},
 vast:{n:128,towns:26,name:'Vast',note:'Weeks from coast to coast. For long campaigns.'}};
let WN=64,WS=WN*TS,WSZK='small';
function setWorldSize(k){k=WORLDSZ[k]?k:'small';const n=WORLDSZ[k].n;WSZK=k;if(n===WN)return k;WN=n;WS=WN*TS;
 if(typeof FP!=='undefined'&&FP)FP.cost=null;                                      // the pathfinder's buffers are sized for the old world
 return k}
function worldK(){return WN*WN/4096}                                              // land area relative to the small world
let W=null,G=null,B=null,mode='title',sheetOpen=false,townTab='contracts';
/* ---- Saves ----
   G is stored as JSON under SAVEKEY with a version field G.v. Saves written before versioning have no
   v and count as version 1. To change the save format: bump SAVEVER and add MIGRATE[old]=g=>g (one step,
   old -> old+1). readSave() runs the chain, then repairSave() fills defaults and rejects broken data.
   A save from a NEWER version than this code is never loaded and never silently overwritten. */
const SAVEKEY='wyrdmarch_save_v1',SAVEVER=16;
/* save slots (phase 8): SLOTS books, slot 0 under SAVEKEY (every older save is slot 0), slot i under SAVEKEY+'_s'+i. SLOT is the
   slot the running company reads and writes; the title's slot picker changes it (22-run.js slotUse). */
const SLOTS=3;let SLOT=0;
function slotKey(i){i=Number.isInteger(i)&&i>=0&&i<SLOTS?i:SLOT;return i?SAVEKEY+'_s'+i:SAVEKEY}
const MIGRATE={
 1:g=>{if(typeof g.rng!=='number')g.rng=((g.seed|0)^0x9e3779b9)+(g.day|0)*7919>>>0;return g},   // v2: seeded RNG state lives in the save
 /* v3: the 64x64 world with rivers, roads, sites, fog and weather. The 44x44 world of a v2 save cannot be rebuilt, so the
    company keeps everything it carries (roster, crowns, food, renown, stash, day, crisis progress) and is set down at the
    first town of the new world made from the same seed. Old towns, bands, the contract in hand and rift positions are
    dropped; rifts still owed by the crisis are opened again in the new land. G.note tells the player once. */
 2:g=>{if(!svFin(g.seed))throw new Error('no world seed');if(!Array.isArray(g.towns)||g.towns.filter(t=>svObj(t)&&svFin(t.x)&&svFin(t.y)).length<2)throw new Error('no towns');
  const seed=g.seed|0,w=genWorld(seed),r=mulberry(seed^0x5f3759df);g.seed=seed;
  let nid=Math.floor(svNum(g.nid,1));for(const l of [g.roster,g.portals])if(Array.isArray(l))for(const o of l)if(svObj(o)&&svFin(o.id)&&o.id>=nid)nid=Math.floor(o.id)+1;
  const old=Array.isArray(g.portals)?g.portals.filter(svObj):[],cr=svObj(g.crisis)?g.crisis:null;
  const owed=cr?(cr.ended?Math.min(old.length,2):Math.max(1,Math.floor(svNum(cr.total,3))-Math.floor(svNum(cr.closed,0)))):0;
  g.towns=w.towns.map(t=>({name:t.name,x:t.x,y:t.y,size:t.size,ref:-99}));g.sites=worldSites(w,nid);nid+=g.sites.length;g.portals=[];
  for(let i=0;i<owed;i++){let pos=null;for(let k=0;k<4000&&!pos;k++){const x=(2+r()*(WN-4))*TS,y=(2+r()*(WN-4))*TS,ti=Math.floor(y/TS)*WN+Math.floor(x/TS);
    if(w.ok[ti]&&g.towns.every(t=>Math.hypot(t.x-x,t.y-y)>3*TS)&&g.portals.every(p=>Math.hypot(p.x-x,p.y-y)>6*TS)&&(k>2000||Math.hypot(x-WS/2,y-WS/2)<26*TS))pos={x,y}}
   if(pos)g.portals.push({id:nid++,x:pos.x,y:pos.y,realm:old[i]&&BIO[old[i].realm]?old[i].realm:REALMS[Math.floor(r()*REALMS.length)]})}
  g.nid=nid;g.parties=[];g.contract=null;g.town=null;g.dun=null;g.fog=null;g.weather=null;g.route=[];g.p=g.towns.length?{x:g.towns[0].x,y:g.towns[0].y}:{x:WS/2,y:WS/2};
  g.grace=Math.max(svNum(g.grace,0),4);g.zoom=1;g.note='newlands';return g},
 /* v4: combat depth. Mercs gain resolve (base.brv), a helmet slot (eq.h), injuries (inj) and armor condition (cond, absent = whole);
    the company gains a stock of repair tools (G.tools). Old mercs get a resolve fitting their background and race, no helmet and
    no injuries; the company is handed 20 tools. Applies to recruits waiting in towns as well. */
 3:g=>{const fix=m=>{if(!svObj(m))return;if(svObj(m.base)&&!svFin(m.base.brv))m.base.brv=defaultResolve(m);if(svObj(m.eq)&&m.eq.h===undefined)m.eq.h=null;if(!Array.isArray(m.inj))m.inj=[];delete m.cond;m.rolls=null};
  if(Array.isArray(g.roster))g.roster.forEach(fix);if(Array.isArray(g.towns))g.towns.forEach(t=>{if(svObj(t)&&Array.isArray(t.recruits))t.recruits.forEach(fix)});
  if(!svFin(g.tools))g.tools=20;return g},
 /* v5: talents and arms. m.mast {tree: perks taken} becomes m.trees / m.gift / m.perks (see 61-talents.js): the merc keeps its old
    trees (topped up to 4 style trees from its background pool), its old gift tree (old keys stay valid), and the first n tier perks
    of every tree it had n in (the old perks kept their ids' effects); unspent points stay. The sidearm slot eq.b starts empty. */
 4:g=>{const fix=m=>{if(!svObj(m))return;migrateMerc(m)};if(Array.isArray(g.roster))g.roster.forEach(fix);
  if(Array.isArray(g.towns))g.towns.forEach(t=>{if(svObj(t)&&Array.isArray(t.recruits))t.recruits.forEach(fix)});return g},
 /* v6: the company's identity. Every older save is the small (64x64) world; the company gets the default name and the brass and
    verdigris banner it always flew. Mercs keep their plain colours (m.colors absent). */
 5:g=>{g.wsize='small';if(typeof g.name!=='string'||!g.name.trim())g.name=BANNERDEF.name;g.banner=bannerFix(null,g.name);return g},
 /* v7: famed items. G.famed {id: {base, n, mods, price, pw, from?, day?}} holds every famed item the company has found
    (see 12-famed.js); older companies have found none. */
 6:g=>{g.famed={};return g},
 /* v8: trees by background. Each background now allows at most 5 weapon trees (BG[bg].wt) and 1 or 2 armor trees (BG[bg].at; before,
    every merc had all three). A merc who learned perks in a tree its background no longer allows gets those perks taken back and the
    points returned to spend again (refundTrees in 61-talents.js); recruits waiting in towns too. G.refund [{name, n}] lists the
    company's swords who got points back and G.note 'refund' tells the player once (refundSheet in 55-company.js). */
 7:g=>{const out=[],fix=(m,own)=>{if(!svObj(m)||!BG[m.bg]||!Array.isArray(m.perks))return;delete m.armp;
   m.perks=m.perks.filter(id=>typeof id==='string');const n=refundTrees(m);if(n&&own)out.push({name:typeof m.name==='string'&&m.name?m.name:'Nameless',n})};
  if(Array.isArray(g.roster))g.roster.forEach(m=>fix(m,true));if(Array.isArray(g.towns))g.towns.forEach(t=>{if(svObj(t)&&Array.isArray(t.recruits))t.recruits.forEach(m=>fix(m,false))});
  if(out.length){g.refund=out;if(typeof g.note!=='string'||!g.note)g.note='refund'}return g},
 /* v9: company depth (phase 6). Every merc gets character traits: old mercs (and recruits waiting in towns) ROLL them from their
    background exactly as a new recruit does (rollTraits), from a stream seeded by the merc's id, so loading the same save twice gives
    the same traits and no game randomness is drawn. The company gains monster parts (G.parts {key: count}, empty), a retinue of
    followers (G.retinue [ids], empty) and ambitions (G.amb {cur, done, offered}, nothing yet). The roster now holds MAXROSTER (20). */
 8:g=>{const fix=m=>{if(!svObj(m))return;if(!Array.isArray(m.traits))m.traits=BG[m.bg]?migrateTraits(m):[]};
  if(Array.isArray(g.roster))g.roster.forEach(fix);if(Array.isArray(g.towns))g.towns.forEach(t=>{if(svObj(t)&&Array.isArray(t.recruits))t.recruits.forEach(fix)});
  if(!svObj(g.parts))g.parts={};if(!Array.isArray(g.retinue))g.retinue=[];if(!svObj(g.amb))g.amb={cur:null,done:[],offered:[]};return g},
 /* v10: the living world (phase 7). Houses, territory, reputation (all neutral), town buildings, specialties and prosperity come from
    factionsInit (15-factions.js), which reads only the world seed: loading the same old save twice gives the same houses. No nests
    yet (G.nests = []), no situations, no wars. Old bands become plain roamers. Events start unseen and the origin is the free company.
    Old contracts are kept (deliver and hunt stay valid). */
 9:g=>{if(!svFin(g.seed))throw new Error('no world seed');if(!Array.isArray(g.towns))throw new Error('no towns');g.towns=g.towns.filter(t=>svObj(t)&&svFin(t.x)&&svFin(t.y));
  for(const t of g.towns){delete t.own;delete t.bld;delete t.spec;delete t.sit;delete t.pros}delete g.houses;delete g.rep;delete g.hrel;delete g.wars;
  g.nests=[];g.repLog=[];factionsInit(g,{nests:false});g.news=[];g.wsim={day:Math.max(1,Math.floor(svNum(g.day,1)))};
  if(Array.isArray(g.parties))for(const p of g.parties)if(svObj(p))p.goal='roam';
  if(!svObj(g.evt))g.evt={seen:{},flags:{}};if(typeof g.origin!=='string')g.origin='free';return g},
 /* v11: caravan cargo and rival companies. G.rivals (2 or 3 rival mercenary companies) are generated by rivalsInit (40-world.js) from the
    world seed on a private stream (no game randomness drawn): loading the same old save twice gives the same rivals. Every caravan on the
    road gets the full cargo of its good (cargoFix: a stream seeded by the seed and the caravan's id; its purse is kept). Contracts taken
    in the outbid twist kept the house in c.rival: that moves to c.outbid (c.rival now names a rival company). */
 10:g=>{if(!svFin(g.seed))throw new Error('no world seed');delete g.rivals;delete g.rvn;
  if(Array.isArray(g.parties))for(const p of g.parties)if(svObj(p)&&svObj(p.cargo))p.cargo=cargoFix(p.cargo,p.id,g.seed);
  const cs=[g.contract].concat(...(Array.isArray(g.towns)?g.towns.map(t=>svObj(t)&&Array.isArray(t.contracts)?t.contracts:[]):[]));
  for(const c of cs)if(svObj(c)&&typeof c.rival==='string'){if(/^h[0-9]$/.test(c.rival))c.outbid=c.rival;delete c.rival}
  if(Array.isArray(g.towns)&&g.towns.length>=2)rivalsInit(g);return g},
 /* v12: the Monster hunter tree. Every merc (the company's, recruits waiting in towns, every rival company's) gets an empty kill
    tally m.slain {quarry key: kills} (61-talents.js); kills count from now on. Nothing else changes. */
 11:g=>{const fix=m=>{if(svObj(m))m.slain={}};if(Array.isArray(g.roster))g.roster.forEach(fix);
  if(Array.isArray(g.towns))g.towns.forEach(t=>{if(svObj(t)&&Array.isArray(t.recruits))t.recruits.forEach(fix)});
  if(Array.isArray(g.rivals))g.rivals.forEach(r=>{if(svObj(r)&&Array.isArray(r.roster))r.roster.forEach(fix)});return g},
 /* v13: phase 8 (crises, the East, fabled warriors, run systems). The run's crisis kind: a crisis already under way stays the Sundering,
    else it comes from the seed (runCrisisKind, no game randomness); the East (eastInit marks the east-most towns and sets up the faction);
    no fabled warriors met yet (G.fabled {}); Normal difficulty, not ironman; a run record (G.run) with what can still be counted. */
 12:g=>{if(typeof g.crisisKind!=='string')g.crisisKind=svObj(g.crisis)?'sunder':runCrisisPick(g.seed);
  if(!svObj(g.fabled))g.fabled={};if(typeof g.diff!=='string')g.diff='normal';g.ironman=false;if(!svObj(g.run))g.run=runNew(g);
  if(typeof eastInit==='function'&&Array.isArray(g.towns)&&g.towns.length>=2)eastInit(g);return g},
 /* v14: phase 8B endgame. Portal worlds replace the three-battle rift run (G.portalRun, none under way: an old G.dun is dropped and its
    rift stays open), dungeons appear over time (G.dungeons, none yet: they open from the save's day on), every merc keeps a record of
    endgame deeds (m.deeds {}), the legendary drops found so far (G.legend {}). */
 13:g=>{g.portalRun=null;g.dungeons=[];delete g.dun;if(!svObj(g.legend))g.legend={};if(Array.isArray(g.roster))g.roster.forEach(m=>{if(svObj(m)&&!svObj(m.deeds))m.deeds={}});return g},
 /* v15: masteries merged. The 14 weapon trees became the one Weapon mastery tree (one perk a family): every perk learned in an old weapon
    tree ('sword.1a' ... 'shield.3b') is taken back and its point returned (weapon capstones '<family>.cap' keep their ids and stay). The armor
    trees have one perk a tier: either half of an old tier ('lightarmor.2a' / '.2b') becomes the merged perk ('lightarmor.2'); a merc who
    owned both halves gets one point back. The Monster hunter tree is no longer an extra tree of some backgrounds but one of the 4 a merc
    carries: a merc of a background that had it (hunter, poacher, witch hunter, wildling, the Beast slayer) who learned quarry perks keeps
    it in m.trees, in place of a style tree it has no perks in (else as a 5th); the Beast slayer always keeps it; anyone else's trees
    stay as they were. Perks of trees the merc may not learn are then refunded (refundTrees), as the loader would. The company's mercs, recruits waiting in towns and the
    rival companies' swords alike; G.refund / G.note 'refund' list the company's swords who got points back (as in v8). */
 14:g=>{const out=[],fix=(m,own)=>{if(!svObj(m)||!Array.isArray(m.perks))return;m.perks=m.perks.filter(id=>typeof id==='string');const n=migrateMastery(m);
   if(n&&own)out.push({name:typeof m.name==='string'&&m.name?m.name:'Nameless',n})};
  if(Array.isArray(g.roster))g.roster.forEach(m=>fix(m,true));if(Array.isArray(g.towns))g.towns.forEach(t=>{if(svObj(t)&&Array.isArray(t.recruits))t.recruits.forEach(m=>fix(m,false))});
  if(Array.isArray(g.rivals))g.rivals.forEach(r=>{if(svObj(r)&&Array.isArray(r.roster))r.roster.forEach(m=>fix(m,false))});
  if(out.length){const L=Array.isArray(g.refund)?g.refund:[];for(const x of out){const o=L.find(y=>svObj(y)&&y.name===x.name);if(o)o.n=Math.max(0,Math.floor(svNum(o.n,0)))+x.n;else L.push(x)}   // one line a sword (a v7 save gets both refunds)
   g.refund=L;if(typeof g.note!=='string'||!g.note)g.note='refund'}return g},
 /* v16: caravan guards and clashes (42-caravans.js). Every caravan on the road gets the guard detail its home town affords as it stands
    (cvGuardFor, no randomness: the luck of the hiring is the middle .5) and its strength (p.mult) becomes theirs; no clash is under way. */
 15:g=>cvMigrate(g)
};
/* migrateMastery(m): one merc of a v14 save to the merged masteries (v15, above). Returns the points given back. Draws no randomness. */
const OLDWT=['sword','axe','mace','hammer','dagger','spear','polearm','greatsword','bow','crossbow','flintlock','staff','fist','shield'],OLDHT=['hunter','poacher','witchhunter','wildling','slayer'];
function migrateMastery(m){let n=0;const keep=[],seen={};
 for(const id of m.perks){let x=/^([a-z]+)\.([1-9])([ab])$/.exec(id),k=id;
  if(x&&OLDWT.includes(x[1])){n++;continue}                                       // an old weapon tree perk: refunded
  if(x&&/^(light|med|heavy)armor$/.test(x[1]))k=x[1]+'.'+x[2];                   // an old armor half: the merged perk of its tier
  if(seen[k]){n++;continue}seen[k]=1;keep.push(k)}                                // both halves owned: one point back
 m.perks=keep;
 if(OLDHT.includes(m.bg)&&MAST.hunter){if(!Array.isArray(m.trees))m.trees=[];const hp=keep.some(id=>id==='hunter.cap'||!!(typeof QUARRY==='object'&&QUARRY[id]));
  if((hp||m.bg==='slayer')&&!m.trees.includes('hunter')){const used=new Set(keep.map(id=>String(id).split('.')[0]));
   let i=-1;for(let j=m.trees.length-1;j>=0;j--){const T=MAST[m.trees[j]];if(T&&T.kind==='style'&&!used.has(m.trees[j])){i=j;break}}
   if(i>=0)m.trees[i]='hunter';else{const g=m.trees.findIndex(k=>MAST[k]&&MAST[k].kind==='gift');if(g>=0)m.trees.splice(g,0,'hunter');else m.trees.push('hunter')}}}
 if(n)m.pp=Math.max(0,Math.floor(svNum(m.pp,0)))+n;
 if(BG[m.bg])n+=refundTrees(m);   // a merged perk of an armor tree (or a quarry perk of a hunter tree) the merc may not learn: back too
 if(typeof syncMast==='function')syncMast(m);return n}
// The traits an old merc gets in the v9 migration (and a merc record that has none): rolled from its background by a stream seeded by its id.
function migrateTraits(m){return rollTraits(m.bg,mulberry(((svNum(m.id,0)|0)^0x7a175)>>>0))}
// One merc of a version 4 save to talents (v5). Draws no game randomness: the top-up trees come from a stream seeded by the merc's id.
function migrateMerc(m){if(Array.isArray(m.trees)&&Array.isArray(m.perks)){if(svObj(m.eq)&&m.eq.b===undefined)m.eq.b=null;return m}   // already in the new shape
 const old=svObj(m.mast)?m.mast:{},trees=[],perks=[];let gift=null;
 for(const k in old){const T=MAST[k];if(!T||T.kind==='weapon')continue;const n=clamp(Math.floor(svNum(old[k],0)),0,T.tiers.length);
  if(T.kind==='gift'){if(gift)continue;gift=k}else if(!trees.includes(k))trees.push(k);for(let t=0;t<n;t++)perks.push(T.tiers[t][0].id)}
 if(BG[m.bg]){const r=mulberry((svNum(m.id,0)|0)^0x7a1e57),add=rollTrees(m.bg,r).concat(rollTrees(m.bg,r));for(const k of add){if(trees.length>=4)break;if(!trees.includes(k))trees.push(k)}}
 m.trees=gift?trees.concat([gift]):trees;m.gift=gift;m.perks=perks;if(svObj(m.eq)&&m.eq.b===undefined)m.eq.b=null;delete m.mast;return m}
// Resolve for a merc that has none (old saves): the middle of the creation roll plus background and race.
function defaultResolve(m){const b=BG[m.bg],r=RACE[m.race];return clamp(38+((b&&b.st.brv)||0)+((r&&r.st.brv)||0),5,95)}
function storeGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function storeSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
function storeDel(k){try{localStorage.removeItem(k);return true}catch(e){return false}}
const svFin=x=>typeof x==='number'&&isFinite(x),svNum=(x,d)=>svFin(x)?x:d,svObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
function saveVersion(g){return svFin(g.v)&&g.v>=1?Math.floor(g.v):1}
function migrateSave(g){let v=saveVersion(g);while(v<SAVEVER){const f=MIGRATE[v];if(!f)throw new Error('no migration from version '+v);g=f(g)||g;g.v=++v}return g}
function repairMerc(m){if(!svObj(m)||!BG[m.bg]||!svObj(m.base))return false;
 for(const k of ['hp','fat','init','ms','rs','md','rd'])if(!svFin(m.base[k]))return false;
 if(!Array.isArray(m.trees)&&!Array.isArray(m.perks))migrateMerc(m);                      // an unmigrated record (written by older code)
 { const seen={};m.trees=(Array.isArray(m.trees)?m.trees:[]).filter(k=>typeof k==='string'&&MAST[k]&&MAST[k].kind!=='weapon'&&!seen[k]&&(seen[k]=1));
   const gifts=m.trees.filter(k=>MAST[k].kind==='gift');m.gift=typeof m.gift==='string'&&gifts.includes(m.gift)?m.gift:gifts[0]||null;m.trees=m.trees.filter(k=>MAST[k].kind==='style'||MAST[k].kind==='hunter'||k===m.gift||(m.fabled&&MAST[k].kind==='fabled'));
   if(!m.trees.some(k=>MAST[k].kind==='style')){const r=mulberry((svNum(m.id,0)|0)^0x7a1e57);m.trees=rollTrees(m.bg,r).concat(m.trees)}
   // perks only of the trees the merc has (mercTrees: its style trees and gift, its background's weapon and armor trees); a perk of a
   // weapon or armor tree it may not learn is refunded (refundTrees), anything else unreadable is dropped
   delete m.armp;if(Array.isArray(m.perks)){m.perks=m.perks.filter(id=>typeof id==='string');refundTrees(m)}
   const have=new Set(mercTrees(m).map(x=>x.key)),ps={};m.perks=(Array.isArray(m.perks)?m.perks:[]).filter(id=>perkById(id)&&have.has(perkById(id).key)&&!ps[id]&&(ps[id]=1)) }
 if(!svObj(m.eq))m.eq={};for(const k of ['w','b','s','a','h']){const it=ITEMS[m.eq[k]];m.eq[k]=it&&it.k===(k==='b'?'w':k)?m.eq[k]:null}
 fixHands(m);
 if(!svObj(m.tal))m.tal={};for(const k in m.tal)if(!svFin(m.tal[k]))delete m.tal[k];
 if(typeof m.name!=='string'||!m.name)m.name='Nameless';if(!RACE[m.race])m.race='human';
 m.base.brv=svFin(m.base.brv)?clamp(Math.round(m.base.brv),0,200):defaultResolve(m);
 {const seen={};m.inj=Array.isArray(m.inj)?m.inj.filter(j=>svObj(j)&&INJ[j.id]&&!seen[j.id]&&(seen[j.id]=1)).map(j=>({id:j.id,days:INJ[j.id].perm?-1:clamp(Math.floor(svNum(j.days,INJ[j.id].days[0])),1,99)})):[]}
 if(svObj(m.cond)){const a=ITEMS[m.eq.a],h=ITEMS[m.eq.h],c={};if(a&&svFin(m.cond.a)&&m.cond.a<a.arm)c.a=clamp(Math.round(m.cond.a),0,a.arm);if(h&&svFin(m.cond.h)&&m.cond.h<h.arm)c.h=clamp(Math.round(m.cond.h),0,h.arm);
  if('a' in c||'h' in c)m.cond=c;else delete m.cond}else delete m.cond;
 m.lvl=clamp(Math.floor(svNum(m.lvl,1)),1,MAXLV);m.xp=Math.max(0,svNum(m.xp,0));m.pp=Math.max(0,Math.floor(svNum(m.pp,0)));m.pend=clamp(Math.floor(svNum(m.pend,0)),0,m.lvl-1);
 if(m.rolls){if(!svObj(m.rolls))m.rolls=null;else for(const k in ROLL)if(!svFin(m.rolls[k])){m.rolls=null;break}}
 m.slot=svObj(m.slot)&&(m.slot.row===0||m.slot.row===1)&&Number.isInteger(m.slot.col)&&m.slot.col>=0&&m.slot.col<(typeof BW==='number'?BW:12)?{row:m.slot.row,col:m.slot.col}:null;   // formation tile; null = default deployment
 if(m.colors!==undefined){const c=typeof colorsFix==='function'?colorsFix(m.colors):null;if(c)m.colors=c;else delete m.colors}
 if(!Array.isArray(m.traits))m.traits=migrateTraits(m);else{const seen={};m.traits=m.traits.filter(k=>typeof k==='string'&&TRAITS[k]&&!seen[k]&&(seen[k]=1));
  m.traits=m.traits.filter((k,i)=>!m.traits.slice(0,i).some(o=>TRAITS[o].opp===k||TRAITS[k].opp===o)).slice(0,2)}   // known, no repeats, no opposed pair, at most 2
 {const S={};if(svObj(m.slain))for(const k in m.slain){const n=m.slain[k];if(typeof QUARRY==='object'&&QUARRY[k]&&svFin(n)&&n>0)S[k]=Math.min(9999,Math.floor(n))}m.slain=S}   // the quarry tally: known keys, whole kills
 if(svFin(m.kills)&&m.kills>0)m.kills=Math.min(99999,Math.floor(m.kills));else delete m.kills;if(typeof m.fabled!=='string'||!m.fabled)delete m.fabled;if(m.title!==undefined){if(typeof m.title==='string'&&m.title)m.title=m.title.slice(0,60);else delete m.title}
 m.field=!!m.field;syncMast(m);m.hp=clamp(Math.round(svNum(m.hp,m.base.hp)),1,calc(m).hp);return true}
function repairContract(c,nTowns,towns){if(!svObj(c))return false;if(c.type!=='deliver'&&c.type!=='hunt')return typeof CTYPES!=='undefined'&&!!CTYPES[c.type]&&typeof ctrRepair==='function'&&!!ctrRepair(c,nTowns,towns);
 if(typeof ctrRepair==='function'&&ctrRepair(c,nTowns,towns)===false)return false;c.diff=clamp(Math.floor(svNum(c.diff,1)),1,5);   // contracts run 1..5 skulls
 if(!svFin(c.pay)||typeof c.title!=='string')return false;
 if(c.type==='deliver')return Number.isInteger(c.to)&&c.to>=0&&c.to<nTowns;
 if(c.type==='hunt')return !!FACT[c.f]&&svFin(c.x)&&svFin(c.y);return false}
// Fills defaults in place. Returns '' when the save is usable, 'empty' for a company with nobody left, else what is wrong.
function repairSave(g){if(!svFin(g.seed))return 'no world seed';
 g.famed=typeof registerFamed==='function'?registerFamed(svObj(g.famed)?g.famed:{}):{};   // famed items go into ITEMS before anything below checks an item id
 g.wsize=WORLDSZ[g.wsize]?g.wsize:'small';if(typeof shapeRepair==='function')shapeRepair(g);g.name=cleanName(g.name);g.banner=bannerFix(g.banner,g.name);
 if(!Array.isArray(g.towns))return 'no towns';g.towns=g.towns.filter(t=>svObj(t)&&svFin(t.x)&&svFin(t.y));if(g.towns.length<2)return 'no towns';
 if(!Array.isArray(g.roster))return 'no roster';if(!g.roster.length)return 'empty';
 g.roster=g.roster.filter(repairMerc);if(!g.roster.length)return 'no readable mercenaries';
 if(g.roster.length>MAXROSTER)g.roster.length=MAXROSTER;let nf=0;g.roster.forEach(m=>{if(m.field&&++nf>MAXFIELD)m.field=false});
 {const seen={};g.roster.forEach(m=>{if(!m.slot)return;const k=m.slot.row+':'+m.slot.col;if(!m.field||seen[k])m.slot=null;else seen[k]=1})}   // one sword a tile
 if(!svObj(g.p)||!svFin(g.p.x)||!svFin(g.p.y))g.p={x:g.towns[0].x,y:g.towns[0].y};
 g.day=Math.max(1,Math.floor(svNum(g.day,1)));g.hour=clamp(svNum(g.hour,8),0,23.999);g.crowns=Math.max(0,Math.round(svNum(g.crowns,0)));g.food=Math.max(0,Math.round(svNum(g.food,0)));g.tools=Math.max(0,Math.round(svNum(g.tools,0)));
 g.renown=Math.max(0,svNum(g.renown,0));g.crisisDay=svNum(g.crisisDay,18);g.grace=svNum(g.grace,0);g.healAcc=clamp(svNum(g.healAcc,0),0,48);g.zoom=svFin(g.zoom)&&g.zoom>0?clamp(g.zoom,.05,20):1;
 g.stash=Array.isArray(g.stash)?g.stash.filter(id=>!!ITEMS[id]):[];
 g.towns.forEach((t,i)=>{if(typeof t.name!=='string'||!t.name)t.name=TOWNN[i%TOWNN.length];t.ref=svNum(t.ref,-99);t.size=clamp(Math.round(svNum(t.size,1)),1,3);
  t.recruits=Array.isArray(t.recruits)?t.recruits.filter(repairMerc):[];t.stock=Array.isArray(t.stock)?t.stock.filter(id=>!!ITEMS[id]&&!ITEMS[id].famed):[];
  t.contracts=Array.isArray(t.contracts)?t.contracts.filter(c=>repairContract(c,g.towns.length,g.towns)):[]});
 rivalRepair(g);   // the rival companies (registered in FACT by factionsInit below, before the bands are checked)
 worldRepair(g);   // phase 7: houses (registered in FACT before the bands are checked), rep, town state, nests, wars (below)
 g.parties=Array.isArray(g.parties)?g.parties.filter(p=>svObj(p)&&FACT[p.f]&&svFin(p.x)&&svFin(p.y)&&svFin(p.tx)&&svFin(p.ty)&&svFin(p.mult)&&svFin(p.id)):[];
 g.parties.forEach(p=>{if(!Array.isArray(p.pts)||!p.pts.length||!p.pts.every(q=>svObj(q)&&svFin(q.x)&&svFin(q.y))){delete p.pts;p.pi=0}else p.pi=clamp(Math.floor(svNum(p.pi,0)),0,p.pts.length-1);p.ch=p.ch?1:0});
 g.parties.forEach(p=>partyRepair(p,g.towns.length,g.nests,g));g.parties=g.parties.filter(p=>!p.gone);cvRepair(g);   // caravan guards, raiders' plunder, clashes under way (42-caravans.js)
 g.sites=Array.isArray(g.sites)?g.sites.filter(s=>svObj(s)&&svFin(s.x)&&svFin(s.y)&&svFin(s.id)&&typeof s.kind==='string'):[];g.sites.forEach(s=>{s.n=Math.max(0,Math.floor(svNum(s.n,0)));s.v=s.v?1:0});
 g.weather=svObj(g.weather)&&WTHR[g.weather.kind]&&svFin(g.weather.t)&&svFin(g.weather.dur)?{kind:g.weather.kind,t:Math.max(0,g.weather.t),dur:Math.max(.1,g.weather.dur)}:{kind:'clear',t:0,dur:8};
 g.fog=typeof g.fog==='string'?g.fog:null;g.route=[];
 g.portals=Array.isArray(g.portals)?g.portals.filter(p=>svObj(p)&&svFin(p.x)&&svFin(p.y)&&svFin(p.id)&&BIO[p.realm]):[];
 if(g.contract&&!(repairContract(g.contract,g.towns.length,g.towns)&&Number.isInteger(g.contract.town)&&g.contract.town>=0&&g.contract.town<g.towns.length))g.contract=null;
 if(g.contract)g.contract.done=!!g.contract.done;else g.contract=null;
 if(typeof g.crisisKind!=='string'||(typeof CRISES==='object'&&CRISES&&!CRISES[g.crisisKind]))g.crisisKind=svObj(g.crisis)&&!g.crisis.k?'sunder':runCrisisPick(g.seed);
 if(typeof crisisRepair==='function')crisisRepair(g);else if(svObj(g.crisis)){g.crisis.closed=Math.max(0,Math.floor(svNum(g.crisis.closed,0)));g.crisis.total=Math.max(1,Math.floor(svNum(g.crisis.total,3)));g.crisis.ended=!!g.crisis.ended}else g.crisis=null;
 let nid=svNum(g.nid,1);const seen=x=>{if(svObj(x)&&svFin(x.id)&&x.id>=nid)nid=x.id+1};g.roster.forEach(seen);g.parties.forEach(seen);g.portals.forEach(seen);g.nests.forEach(seen);g.sites.forEach(seen);g.towns.forEach(t=>t.recruits.forEach(seen));if(Array.isArray(g.rivals))g.rivals.forEach(r=>r.roster.forEach(seen));g.nid=Math.floor(nid);
 g.dun=null;g.path=[];g.moving=false;g.dest=null;g.tap=null;g.townOpen=false;g.note=typeof g.note==='string'?g.note:null;g.refund=Array.isArray(g.refund)?g.refund.filter(r=>svObj(r)&&typeof r.name==='string'&&svFin(r.n)&&r.n>0).map(r=>({name:r.name.slice(0,40),n:Math.floor(r.n)})).slice(0,MAXROSTER):[];if(!g.refund.length){delete g.refund;if(g.note==='refund')g.note=null}else if(!g.note)g.note='refund';g.town=Number.isInteger(g.town)&&g.town>=0&&g.town<g.towns.length?g.town:null;
 // phase 6 company fields (the camp and progression agents validate their own contents through craftRepair / companyRepair)
 {const P={};if(svObj(g.parts))for(const k in g.parts){const n=g.parts[k];if(svFin(n)&&n>0&&(typeof PARTS==='undefined'||PARTS[k]))P[k]=Math.floor(n)}g.parts=P}
 g.retinue=Array.isArray(g.retinue)?g.retinue.filter((id,i,a)=>typeof id==='string'&&(typeof FOLLOWERS==='undefined'||FOLLOWERS[id])&&a.indexOf(id)===i):[];
 {const a=svObj(g.amb)?g.amb:{},ids=x=>Array.isArray(x)?x.filter((id,i,l)=>typeof id==='string'&&l.indexOf(id)===i):[];g.amb={cur:typeof a.cur==='string'||svObj(a.cur)?a.cur:null,done:ids(a.done),offered:ids(a.offered)};
  for(const k in a)if(!(k in g.amb))g.amb[k]=a[k]}
 if(typeof craftRepair==='function')craftRepair(g);if(typeof companyRepair==='function')companyRepair(g);
 if(typeof evtRepair==='function')evtRepair(g);else if(!svObj(g.evt)||!svObj(g.evt.seen)||!svObj(g.evt.flags))g.evt={seen:svObj(g.evt)&&svObj(g.evt.seen)?g.evt.seen:{},flags:svObj(g.evt)&&svObj(g.evt.flags)?g.evt.flags:{}};
 if(typeof g.origin!=='string'||(typeof ORIGINS==='object'&&ORIGINS&&!ORIGINS[g.origin]&&g.origin!=='free'))g.origin='free';
 // phase 8: the East, fabled warriors, the run (difficulty, ironman, stats), each validated by its owner's helper when present
 if(typeof eastRepair==='function')eastRepair(g);g.fabled=svObj(g.fabled)?g.fabled:{};if(typeof fabledRepair==='function')fabledRepair(g);
 if(typeof egRepair==='function')egRepair(g);else{g.portalRun=null;g.dungeons=Array.isArray(g.dungeons)?g.dungeons:[]}   // phase 8B: portal run, dungeons, deeds (24-endgame.js; it calls legendRepair)
 if(typeof runModsRepair==='function')runModsRepair(g);else g.mods=Array.isArray(g.mods)?g.mods:[];   // the run's twists (27-runmods.js)
 if(typeof runRepair==='function')runRepair(g);else{g.diff=['story','normal','hard','brutal'].includes(g.diff)?g.diff:'normal';g.ironman=!!g.ironman}
 if(!svFin(g.rng))g.rng=(g.seed^0x9e3779b9)>>>0;g.rng=g.rng>>>0;return ''}
// {state:'none'} | {state:'ok',g,v} | {state:'newer',v} | {state:'corrupt',why}. Never throws.
function cleanName(s){s=typeof s==='string'?s.replace(/[<>&"`\\]/g,'').replace(/\s+/g,' ').trim().slice(0,NAMEMAX):'';return s||BANNERDEF.name}
const NAMEMAX=24;
function readSave(slot){return readSaveRaw(storeGet(slotKey(slot)))}
function readSaveRaw(raw){if(raw==null||raw==='')return{state:'none'};let g;
 try{g=JSON.parse(raw)}catch(e){return{state:'corrupt',why:'unreadable data'}}
 if(!svObj(g))return{state:'corrupt',why:'unreadable data'};const v=saveVersion(g);if(v>SAVEVER)return{state:'newer',v};
 const wk=WSZK,wsh=typeof setWorldShape==='function'?[WSHK,WBMK]:null;try{setWorldSize(svObj(g)&&WORLDSZ[g.wsize]?g.wsize:'small');if(wsh)setWorldShape(g.shape,g.biomes);g=migrateSave(g);const why=repairSave(g);if(why==='empty')return{state:'none'};if(why)return{state:'corrupt',why}}catch(e){return{state:'corrupt',why:String(e&&e.message||e)}}finally{setWorldSize(wk);if(wsh)setWorldShape(wsh[0],wsh[1])}
 return{state:'ok',g,v}}
function loadSave(){const r=readSave();return r.state==='ok'?r.g:null}          // a loadable campaign, or null
function saveStatus(slot){const r=readSave(slot),s={state:r.state,v:r.v,why:r.why};if(r.g){s.day=r.g.day;s.swords=r.g.roster.length;s.crowns=r.g.crowns;s.name=r.g.name;s.banner=r.g.banner;s.wsize=r.g.wsize;s.renown=r.g.renown;s.diff=r.g.diff;s.ironman=!!r.g.ironman;s.origin=r.g.origin;s.crisisKind=r.g.crisisKind}return s}
// save(): the running company's famed items are registered again first, whatever readSave() put into ITEMS meanwhile.
function save(){if(!G||mode!=='world'||!Array.isArray(G.roster)||!G.roster.length)return false;G.v=SAVEVER;if(svObj(G.famed)&&typeof registerFamed==='function')registerFamed(G.famed);G.rng=rngState();if(typeof fogPack==='function')G.fog=fogPack();let s;try{s=JSON.stringify(G)}catch(e){return false}return storeSet(slotKey(SLOT),s)}
function clearSave(slot){return storeDel(slotKey(slot))}
// Keeps a copy of a save this version cannot read before a new company replaces it.
function backupUnreadableSave(){const st=readSave().state;if(st!=='newer'&&st!=='corrupt')return false;const raw=storeGet(slotKey(SLOT));return raw!=null&&storeSet(slotKey(SLOT)+'_bak',raw)}

/* ---- phase 7 world fields (validated in place; anything unreadable is rebuilt from the seed by factionsInit) ---- */
function worldRepair(g){const nT=g.towns.length,okF=f=>f==='free'||(f==='east'&&svObj(g.east))||(Array.isArray(g.houses)&&g.houses.some(h=>h.id===f))||(typeof f==='string'&&typeof ownerOk==='function'&&!!ownerOk(f,g));   // owners: free towns, houses, the East (19-east.js), crisis owners (ownerOk, 18-crises.js)

 if(Array.isArray(g.houses)){const seen={};g.houses=g.houses.filter(h=>svObj(h)&&typeof h.id==='string'&&/^h[0-9]$/.test(h.id)&&!seen[h.id]&&(seen[h.id]=1)&&Number.isInteger(h.seat)&&h.seat>=0&&h.seat<nT);
  for(const h of g.houses){if(typeof h.n!=='string'||!h.n)h.n='House '+h.id;h.n=h.n.slice(0,40);if(typeof h.short!=='string')h.short=h.n.replace(/^House /,'');if(!HPERS[h.pers])h.pers='proud';
   const b=typeof bannerFix==='function'?bannerFix({c1:h.c1,c2:h.c2,emblem:h.emblem},h.n):h;h.c1=b.c1;h.c2=b.c2;h.emblem=b.emblem}
  if(!g.houses.length)delete g.houses}
 for(const t of g.towns){if(!okF(t.own))delete t.own;
  if(Array.isArray(t.bld)){const s={};t.bld=t.bld.filter(k=>typeof k==='string'&&BLD[k]&&!s[k]&&(s[k]=1));for(const k of ['inn','market','tavern','notice'])if(!t.bld.includes(k))t.bld.unshift(k)}else delete t.bld;
  if(Array.isArray(t.spec))t.spec=t.spec.filter(k=>typeof k==='string'&&GOODS[k]).slice(0,3);else delete t.spec;
  t.sit=Array.isArray(t.sit)?t.sit.filter(s=>svObj(s)&&SITS[s.k]&&svFin(s.days)&&s.days>0).map(s=>{const o={k:s.k,days:clamp(Math.ceil(s.days),1,60)};if(okF(s.by))o.by=s.by;return o}):[];
  if(svFin(t.pros))t.pros=clamp(t.pros,0,100);else delete t.pros}
 {const r={};if(svObj(g.rep))for(const f in g.rep)if(okF(f)&&svFin(g.rep[f]))r[f]=clamp(Math.round(g.rep[f]),-100,100);g.rep=r}
 g.repLog=Array.isArray(g.repLog)?g.repLog.filter(e=>svObj(e)&&okF(e.f)&&svFin(e.n)&&svFin(e.day)).map(e=>({day:Math.floor(e.day),f:e.f,n:Math.round(e.n),why:typeof e.why==='string'?e.why.slice(0,80):''})).slice(-30):[];
 if(svObj(g.hrel)){const h={};for(const k in g.hrel)if(svFin(g.hrel[k])&&k.split('|').length===2&&k.split('|').every(okF))h[k]=clamp(g.hrel[k],-100,100);g.hrel=h}else delete g.hrel;
 g.wars=Array.isArray(g.wars)?g.wars.filter(w=>svObj(w)&&okF(w.a)&&okF(w.b)&&w.a!==w.b&&w.a!=='free'&&w.b!=='free'&&svFin(w.day)).map(w=>({a:w.a,b:w.b,day:Math.floor(w.day)})):[];
 g.nests=Array.isArray(g.nests)?g.nests.filter(n=>svObj(n)&&svFin(n.id)&&svFin(n.x)&&svFin(n.y)&&FACT[n.f]&&!FACT[n.f].house).map(n=>({id:Math.floor(n.id),x:n.x,y:n.y,f:n.f,str:clamp(svNum(n.str,1),.5,5),day:Math.floor(svNum(n.day,1)),n:Math.max(0,Math.floor(svNum(n.n,0)))})):[];
 g.news=Array.isArray(g.news)?g.news.filter(e=>svObj(e)&&typeof e.t==='string'&&svFin(e.day)).map(e=>({day:Math.floor(e.day),t:e.t.slice(0,120)})).slice(-24):[];
 g.wsim=svObj(g.wsim)&&svFin(g.wsim.day)?{day:Math.floor(g.wsim.day)}:{day:Math.floor(svNum(g.day,1))};
 g.trav=Math.max(0,svNum(g.trav,0));if(svFin(g.travNext))g.travNext=clamp(g.travNext,1,96);else delete g.travNext;
 if(typeof factionsInit==='function')factionsInit(g,{nests:false})}   // fills whatever was missing from the seed and registers the houses in FACT
// one band: goal fields that point nowhere are dropped (the band falls back to roaming)
function partyRepair(p,nT,nests,g){const ti=x=>Number.isInteger(x)&&x>=0&&x<nT;if(!['roam','nest','caravan','patrol','raid','merc'].includes(p.goal))p.goal='roam';
 if(p.goal==='merc'){const r=g&&Array.isArray(g.rivals)?g.rivals.find(x=>x.id===p.f):null;if(!r||!r.alive){p.gone=1;return}p.idle=p.idle?1:0;if(p.hunt)p.hunt=1;else delete p.hunt;if(typeof p.tgt!=='string')delete p.tgt}
 else if(isRivalId(p.f)){p.gone=1;return}
 for(const k of ['from','to','siege'])if(p[k]!=null&&!ti(p[k]))delete p[k];if(p.home!=null&&!(Array.isArray(nests)&&nests.some(n=>n.id===p.home)))p.home=null;
 if(p.hunt)p.hunt=1;else delete p.hunt;if(svFin(p.life))p.life=Math.max(1,Math.floor(p.life));else delete p.life;if(p.legs!=null)p.legs=Math.max(0,Math.floor(svNum(p.legs,0)));
 if(p.goal==='merc')return;if(svObj(p.cargo))p.cargo=cargoFix(p.cargo,p.id,svNum(g&&g.seed,0));else delete p.cargo;
 if((p.goal==='caravan'||p.goal==='raid')&&(p.to==null||!Array.isArray(p.pts)))p.goal='roam';if(p.goal==='caravan'&&p.from==null)p.goal='roam';
 if(p.goal==='nest'&&p.home==null)p.goal='roam';if(p.goal==='roam'){delete p.siege;delete p.hunt}
 if(Array.isArray(p.pts))p.pi=clamp(Math.floor(svNum(p.pi,0)),0,p.pts.length)}

/* ---- the rival companies (v11; 40-world.js). Validated in place; a list that is missing is generated again from the seed by factionsInit. ---- */
function isRivalId(f){return typeof f==='string'&&/^r[0-9]+$/.test(f)}
function rivalRepair(g){if(!g)return'';if(g.rivals!==undefined&&!Array.isArray(g.rivals))delete g.rivals;if(!Array.isArray(g.rivals))return'';const nT=Array.isArray(g.towns)?g.towns.length:0,seen={};let rvn=Math.max(0,Math.floor(svNum(g.rvn,0)));
 const ti=x=>Number.isInteger(x)&&x>=0&&x<nT,hs=Array.isArray(g.houses)?g.houses.map(h=>h&&h.id):[];
 g.rivals=g.rivals.filter(r=>svObj(r)&&isRivalId(r.id)&&!seen[r.id]&&(seen[r.id]=1)).slice(0,12);
 for(const r of g.rivals){rvn=Math.max(rvn,(+r.id.slice(1))+1);if(typeof r.short!=='string'||!r.short.trim())r.short='Free Lances';r.short=r.short.replace(/[<>&"`\\]/g,'').slice(0,28);
  if(typeof r.n!=='string'||!r.n.trim())r.n='The '+r.short;r.n=r.n.replace(/[<>&"`\\]/g,'').slice(0,40);
  if(typeof bannerFix==='function'){const b=bannerFix({c1:r.c1,c2:r.c2,emblem:r.emblem},r.n);r.c1=b.c1;r.c2=b.c2;r.emblem=b.emblem}
  if(typeof RVPERS!=='object'||!RVPERS[r.pers])r.pers='greedy';r.renown=Math.max(0,svNum(r.renown,0));r.crowns=Math.max(0,Math.round(svNum(r.crowns,0)));if(!ti(r.home))r.home=0;
  r.roster=Array.isArray(r.roster)?r.roster.filter(repairMerc).slice(0,16):[];{const ids={};r.roster=r.roster.filter(m=>!ids[m.id]&&(ids[m.id]=1))}r.roster.forEach((m,i)=>{m.field=i<MAXFIELD});
  r.stance=clamp(Math.round(svNum(r.stance,0)),-100,100);r.alive=!!r.alive&&r.roster.length>0;r.day=Math.max(1,Math.floor(svNum(r.day,1)));
  r.deeds=Array.isArray(r.deeds)?r.deeds.filter(e=>svObj(e)&&typeof e.t==='string'&&svFin(e.day)).map(e=>({day:Math.floor(e.day),t:e.t.slice(0,120)})).slice(-12):[];
  const c=r.ctr;r.ctr=svObj(c)&&svFin(c.x)&&svFin(c.y)&&typeof c.title==='string'&&typeof FACT==='object'&&FACT[c.f]&&!FACT[c.f].house?{ti:ti(c.ti)?c.ti:0,x:c.x,y:c.y,type:typeof c.type==='string'?c.type:'hunt',f:c.f,diff:clamp(Math.floor(svNum(c.diff,1)),1,5),
   pay:Math.max(0,Math.round(svNum(c.pay,0))),title:c.title.slice(0,80),due:Math.floor(svNum(c.due,svNum(g.day,1)+5)),day:Math.floor(svNum(c.day,svNum(g.day,1))),eta:Math.floor(svNum(c.eta,1))}:null;
  if(r.ctr)for(const k of ['cid','race','nest'])if(svFin(c[k]))r.ctr[k]=Math.floor(c[k]);
  r.hired=svObj(r.hired)&&hs.includes(r.hired.by)&&svFin(r.hired.until)?{by:r.hired.by,until:Math.floor(r.hired.until)}:null;
  r.rest=clamp(Math.floor(svNum(r.rest,0)),0,30);if(svFin(r.calm))r.calm=Math.floor(r.calm);else delete r.calm;if(svFin(r.talk))r.talk=Math.floor(r.talk);else delete r.talk;delete r.pid;
  const H=g.towns&&g.towns[r.home];if(!svFin(r.x)||!svFin(r.y)){r.x=H?H.x:0;r.y=H?H.y:0}
  if(!r.alive){r.roster=[];r.ctr=null;r.hired=null}}
 g.rvn=rvn;return''}
