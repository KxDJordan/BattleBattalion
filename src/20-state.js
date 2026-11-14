/* ================= STATE ================= */
const WN=64,TS=32,WS=WN*TS,SPD=[0,1,.7,.62,0,.5,.8,.7];   // SPD: march speed by terrain code (roads and rivers: see tileSpeedOf in 40-world.js)
let W=null,G=null,B=null,mode='title',sheetOpen=false,townTab='contracts';
/* ---- Saves ----
   G is stored as JSON under SAVEKEY with a version field G.v. Saves written before versioning have no
   v and count as version 1. To change the save format: bump SAVEVER and add MIGRATE[old]=g=>g (one step,
   old -> old+1). readSave() runs the chain, then repairSave() fills defaults and rejects broken data.
   A save from a NEWER version than this code is never loaded and never silently overwritten. */
const SAVEKEY='wyrdmarch_save_v1',SAVEVER=5;
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
  if(Array.isArray(g.towns))g.towns.forEach(t=>{if(svObj(t)&&Array.isArray(t.recruits))t.recruits.forEach(fix)});return g}
};
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
   const gifts=m.trees.filter(k=>MAST[k].kind==='gift');m.gift=typeof m.gift==='string'&&gifts.includes(m.gift)?m.gift:gifts[0]||null;m.trees=m.trees.filter(k=>MAST[k].kind==='style'||k===m.gift);
   if(!m.trees.some(k=>MAST[k].kind==='style')){const r=mulberry((svNum(m.id,0)|0)^0x7a1e57);m.trees=rollTrees(m.bg,r).concat(m.trees)}
   const have=new Set(m.trees.concat(weaponTrees(m))),ps={};m.perks=(Array.isArray(m.perks)?m.perks:[]).filter(id=>typeof id==='string'&&perkById(id)&&have.has(perkById(id).key)&&!ps[id]&&(ps[id]=1)) }
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
 m.field=!!m.field;syncMast(m);m.hp=clamp(Math.round(svNum(m.hp,m.base.hp)),1,calc(m).hp);return true}
function repairContract(c,nTowns){if(!svObj(c))return false;c.diff=clamp(Math.floor(svNum(c.diff,1)),1,3);if(!svFin(c.pay)||typeof c.title!=='string')return false;
 if(c.type==='deliver')return Number.isInteger(c.to)&&c.to>=0&&c.to<nTowns;
 if(c.type==='hunt')return !!FACT[c.f]&&svFin(c.x)&&svFin(c.y);return false}
// Fills defaults in place. Returns '' when the save is usable, 'empty' for a company with nobody left, else what is wrong.
function repairSave(g){if(!svFin(g.seed))return 'no world seed';
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
  t.recruits=Array.isArray(t.recruits)?t.recruits.filter(repairMerc):[];t.stock=Array.isArray(t.stock)?t.stock.filter(id=>!!ITEMS[id]):[];
  t.contracts=Array.isArray(t.contracts)?t.contracts.filter(c=>repairContract(c,g.towns.length)):[]});
 g.parties=Array.isArray(g.parties)?g.parties.filter(p=>svObj(p)&&FACT[p.f]&&svFin(p.x)&&svFin(p.y)&&svFin(p.tx)&&svFin(p.ty)&&svFin(p.mult)&&svFin(p.id)):[];
 g.parties.forEach(p=>{if(!Array.isArray(p.pts)||!p.pts.length||!p.pts.every(q=>svObj(q)&&svFin(q.x)&&svFin(q.y))){delete p.pts;p.pi=0}else p.pi=clamp(Math.floor(svNum(p.pi,0)),0,p.pts.length-1);p.ch=p.ch?1:0});
 g.sites=Array.isArray(g.sites)?g.sites.filter(s=>svObj(s)&&svFin(s.x)&&svFin(s.y)&&svFin(s.id)&&typeof s.kind==='string'):[];g.sites.forEach(s=>{s.n=Math.max(0,Math.floor(svNum(s.n,0)));s.v=s.v?1:0});
 g.weather=svObj(g.weather)&&WTHR[g.weather.kind]&&svFin(g.weather.t)&&svFin(g.weather.dur)?{kind:g.weather.kind,t:Math.max(0,g.weather.t),dur:Math.max(.1,g.weather.dur)}:{kind:'clear',t:0,dur:8};
 g.fog=typeof g.fog==='string'?g.fog:null;g.route=[];
 g.portals=Array.isArray(g.portals)?g.portals.filter(p=>svObj(p)&&svFin(p.x)&&svFin(p.y)&&svFin(p.id)&&BIO[p.realm]):[];
 if(g.contract&&!(repairContract(g.contract,g.towns.length)&&Number.isInteger(g.contract.town)&&g.contract.town>=0&&g.contract.town<g.towns.length))g.contract=null;
 if(g.contract)g.contract.done=!!g.contract.done;else g.contract=null;
 if(svObj(g.crisis)){g.crisis.closed=Math.max(0,Math.floor(svNum(g.crisis.closed,0)));g.crisis.total=Math.max(1,Math.floor(svNum(g.crisis.total,3)));g.crisis.ended=!!g.crisis.ended}else g.crisis=null;
 let nid=svNum(g.nid,1);const seen=x=>{if(svObj(x)&&svFin(x.id)&&x.id>=nid)nid=x.id+1};g.roster.forEach(seen);g.parties.forEach(seen);g.portals.forEach(seen);g.sites.forEach(seen);g.towns.forEach(t=>t.recruits.forEach(seen));g.nid=Math.floor(nid);
 g.dun=null;g.path=[];g.moving=false;g.dest=null;g.tap=null;g.townOpen=false;g.note=typeof g.note==='string'?g.note:null;g.town=Number.isInteger(g.town)&&g.town>=0&&g.town<g.towns.length?g.town:null;
 if(!svFin(g.rng))g.rng=(g.seed^0x9e3779b9)>>>0;g.rng=g.rng>>>0;return ''}
// {state:'none'} | {state:'ok',g,v} | {state:'newer',v} | {state:'corrupt',why}. Never throws.
function readSave(){const raw=storeGet(SAVEKEY);if(raw==null||raw==='')return{state:'none'};let g;
 try{g=JSON.parse(raw)}catch(e){return{state:'corrupt',why:'unreadable data'}}
 if(!svObj(g))return{state:'corrupt',why:'unreadable data'};const v=saveVersion(g);if(v>SAVEVER)return{state:'newer',v};
 try{g=migrateSave(g);const why=repairSave(g);if(why==='empty')return{state:'none'};if(why)return{state:'corrupt',why}}catch(e){return{state:'corrupt',why:String(e&&e.message||e)}}
 return{state:'ok',g,v}}
function loadSave(){const r=readSave();return r.state==='ok'?r.g:null}          // a loadable campaign, or null
function saveStatus(){const r=readSave(),s={state:r.state,v:r.v,why:r.why};if(r.g){s.day=r.g.day;s.swords=r.g.roster.length;s.crowns=r.g.crowns}return s}
function save(){if(!G||mode!=='world'||!Array.isArray(G.roster)||!G.roster.length)return false;G.v=SAVEVER;G.rng=rngState();if(typeof fogPack==='function')G.fog=fogPack();let s;try{s=JSON.stringify(G)}catch(e){return false}return storeSet(SAVEKEY,s)}
function clearSave(){return storeDel(SAVEKEY)}
// Keeps a copy of a save this version cannot read before a new company replaces it.
function backupUnreadableSave(){const st=readSave().state;if(st!=='newer'&&st!=='corrupt')return false;const raw=storeGet(SAVEKEY);return raw!=null&&storeSet(SAVEKEY+'_bak',raw)}
