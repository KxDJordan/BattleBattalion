/* ================= TALENTS =================
   The talent API (the trees themselves are MAST in 10-data.js). A merc carries
     m.trees  [tree keys] fixed at creation: 4 style trees from BG[bg].pool, plus its gift tree when it has one
     m.gift   the gift tree key (a MAST entry of kind 'gift') or null; chosen from the gift and BG[bg].style (giftKey)
     m.perks  [perk ids] learned, in order;  m.pp unspent perk points (one a level, level 1 included)
   Weapon trees are not stored: weaponTrees(m) = BG[bg].wt minus RACE[race].noWt.
   Armor trees are not stored either: armorTrees(m) = BG[bg].at (1 or 2 of lightarmor medarmor heavyarmor); their tier t opens at level 3t-1.
   Tier t of a style or gift tree opens at level t, of a weapon tree at level 3t; any open perk can be bought with a point.
   The first perk learned in the gift tree awakens the gift (calc() then grants its pool).
   m.mast is a derived, read-only mirror {treeKey: perks owned} kept for older UI code; nothing in the rules reads it.
   Uses no randomness except rollTrees() at recruitment (seeded). */
const PERKIX={};for(const k in MAST)MAST[k].tiers.forEach((tier,ti)=>tier.forEach(p=>{PERKIX[p.id]={perk:p,tree:MAST[k],key:k,tier:ti+1,kind:MAST[k].kind}}));
/* Final mastery tier (25-legend.js): MAST[k].cap = {unlock:{deed,n}, lvl, tiers:[[perk...]]}. Its perks are indexed here with tier = the tree's
   tier count + 1 and cap:true; they open at capNeed(kind) AND only once capOpen(m, k) (the merc's deeds). perkOptions(m) lists the ordinary tiers
   only; capOptions(m) lists the capstones [{id, perk, key, tree, tier, kind, cap:true, owned, unlocked, need, open, why}].
   perkNeed(P) -> the level a perkById record needs (tierLevel, or capNeed for a capstone). */
for(const k in MAST){const T=MAST[k];if(T.cap&&Array.isArray(T.cap.tiers))T.cap.tiers.forEach(tier=>tier.forEach(p=>{if(!PERKIX[p.id])PERKIX[p.id]={perk:p,tree:T,key:k,tier:T.tiers.length+1,kind:T.kind,cap:true}}))}
function perkNeed(P){return P&&P.cap?(P.tree.cap&&P.tree.cap.lvl)||(typeof capNeed==='function'?capNeed(P.kind):10):tierLevel(P.kind,P.tier)}
const capOK=(m,k)=>typeof capOpen==='function'&&capOpen(m,k);
function capOptions(m){const own=new Set(m&&Array.isArray(m.perks)?m.perks:[]),out=[];if(!m)return out;
 for(const {key,tree,kind} of mercTrees(m)){const C=tree.cap;if(!C||!Array.isArray(C.tiers))continue;const need=C.lvl||10,open=capOK(m,key),why=typeof capWhy==='function'?capWhy(m,key):'';
  for(const tier of C.tiers)for(const p of tier)out.push({id:p.id,perk:p,key,tree,tier:tree.tiers.length+1,kind,cap:true,owned:own.has(p.id),open,why,unlocked:open&&(m.lvl||1)>=need,need})}
 return out}
// The level at which tier t (1-based) of a tree of this kind opens: style, gift and hunter t, weapon 3t (3 6 9), armor 3t-1 (2 5 8).
function tierLevel(kind,t){return kind==='weapon'?3*t:kind==='armor'?3*t-1:kind==='fabled'?3*t-2:t}
/* Armor trees: a merc may learn only its background's (BG[bg].at: 1 or 2 of ARMORT, display order light medium heavy); a perk of one
   works only while the body armor worn is of that tree's weight class (armorClass(m) in 30-mercs.js; calc() puts the others in .off).
   armorTrees(m) -> the keys it may learn, in ARMORT order. */
const ARMORT=['lightarmor','medarmor','heavyarmor'].filter(k=>MAST[k]&&MAST[k].kind==='armor');
function armorTrees(m){const b=m&&BG[m.bg],ok=b&&Array.isArray(b.at)?b.at:[];return ARMORT.filter(k=>ok.includes(k))}
const isArmorPerk=id=>!!(PERKIX[id]&&PERKIX[id].kind==='armor');
/* refundTrees(m): takes back every learned perk of a weapon or armor tree the merc may not learn (its background or race does not
   allow it) and returns the points to m.pp. Returns how many perks were refunded. Used by the v8 save migration and the loader. */
function refundTrees(m){if(!m||!Array.isArray(m.perks))return 0;const ok=new Set(weaponTrees(m).concat(armorTrees(m),hunterTrees(m),fabledTrees(m)));let n=0;
 m.perks=m.perks.filter(id=>{const P=PERKIX[id];if(P&&(P.kind==='weapon'||P.kind==='armor'||P.kind==='hunter'||P.kind==='fabled')&&!ok.has(P.key)){n++;return false}if(P&&P.cap&&!capOK(m,P.key)){n++;return false}return true});   // a capstone whose deed the merc lacks is refunded too
 if(n)m.pp=Math.max(0,Math.floor(Number(m.pp)||0))+n;return n}
// {perk, tree, key, tier, kind} for a perk id, or null.
function perkById(id){return PERKIX[id]||null}
function mercStyle(m){return m&&BG[m.bg]&&BG[m.bg].style||'melee'}
// The gift tree for resource res in a fighting style: that style's variant if the gift has one, else the melee one.
function giftKey(res,style){const V=GIFTV[res];return V?V[style]||V.melee:null}
// The merc's gift tree key (stored at creation), or null. For a merc without one stored, the variant its background implies.
function giftVariant(m,res){if(!m)return null;if(!res&&m.gift&&MAST[m.gift]&&MAST[m.gift].kind==='gift')return m.gift;const r=res||mercRes(m);return r?giftKey(r,mercStyle(m)):null}
// True once the gift is awakened (a perk of the gift tree is learned).
function giftAwake(m){const g=m&&m.gift;return!!(g&&Array.isArray(m.perks)&&m.perks.some(id=>PERKIX[id]&&PERKIX[id].key===g))}
// Weapon tree keys the merc may learn (BG[bg].wt minus RACE[race].noWt), in WTS order.
function weaponTrees(m){const b=BG[m.bg]||{},no=(RACE[m.race]&&RACE[m.race].noWt)||[],ok=Array.isArray(b.wt)?b.wt:[];return WTS.filter(w=>ok.includes(w)&&!no.includes(w)&&MAST[w])}
/* ---- Monster hunter (MAST.hunter, QUARRY in 10-data.js) ----
   hunterTrees(m) -> ['hunter'] for a merc whose background has BG[bg].ht (Beast slayer, hunter, poacher, witch hunter, wildling), else [].
   enKey(def) -> the EN id of an enemy definition (a unit's u.def), or null.  quarryOf(u|def|enId) -> the QUARRY key of that foe, or null.
   slainOf(m, k) -> how many of quarry k the merc has slain (m.slain, counted always).  countSlain(u, t): called when u lands the killing
   blow on t: +1 to u.m.slain[quarry] (any merc, a rival's too; never for wyverns or other mercs). Returns the key or null.
   quarryInfo(m, k) -> {key, n (QUARRY name), tag (perk name), one, slain, stack (kills that count, at most cap), per, cap, learned,
     dmg (percent, may be a half: QUARRYB + per x stack once learned, else 0), hit (floor(stack x per / 2) once learned, else 0), full (stack = cap),
     text ('12 slain: +11% damage, +3 to hit')}   (UI: perk cards, character sheet)
   quarryVs(u, t) -> {key, dmg (a fraction: 0.11), hit (+3), n, tag} or {key:null, dmg:0, hit:0}: what u's quarry perk gives against t
     (hitChance and dmgAfter in 60-battle-core.js add it, so forecast() is exact). Uses no randomness. */
/* Fabled warriors (21-fabled.js): a personal tree MAST[k] of kind 'fabled' with owner = the FABLED id; only the merc whose m.fabled is
   that id may learn it (fabledTrees(m) -> [key] or []). Tiers open at levels 1 4 7 10 (tierLevel). refundTrees takes back such perks
   from anyone else. */
function fabledTrees(m){const id=m&&m.fabled,k=id&&typeof FABLED==='object'&&FABLED[id]?FABLED[id].tree:null;return k&&MAST[k]&&MAST[k].kind==='fabled'&&MAST[k].owner===id?[k]:[]}
function hunterTrees(m){const b=m&&BG[m.bg];return b&&b.ht&&MAST.hunter?['hunter']:[]}
let _ENK=null;
function enKey(def){if(!def||typeof EN!=='object')return null;if(!_ENK){_ENK=new Map();for(const k in EN)_ENK.set(EN[k],k)}return _ENK.get(def)||null}
function quarryOf(x){if(!x)return null;if(typeof x==='string')return QUARRYOF[x]||null;if(x.m)return null;const k=x.def?enKey(x.def)||x.eid||null:enKey(x);return k&&QUARRYOF[k]||null}
function slainOf(m,k){const v=m&&m.slain&&m.slain[k];return typeof v==='number'&&v>0?Math.floor(v):0}
function countSlain(u,t){const m=u&&u.m;if(!m||!t||t===u)return null;const k=quarryOf(t);if(!k)return null;if(!m.slain||typeof m.slain!=='object'||Array.isArray(m.slain))m.slain={};m.slain[k]=slainOf(m,k)+1;return k}
function quarryInfo(m,k){const Q=QUARRY[k];if(!Q)return null;const slain=slainOf(m,k),stack=Math.min(slain,Q.cap),learned=!!(m&&Array.isArray(m.perks)&&m.perks.includes(k));
 const dmg=learned?QUARRYB+Q.per*stack:0,hit=learned?Math.floor(stack*Q.per/2):0;
 return{key:k,n:Q.n,tag:Q.tag,one:Q.one,slain,stack,per:Q.per,cap:Q.cap,learned,dmg,hit,full:stack>=Q.cap,
  text:learned?`${slain} slain: +${dmg}% damage, +${hit} to hit${stack>=Q.cap?' (full)':''}`:`${slain} slain (not learned)`}}
const QV0={key:null,dmg:0,hit:0,n:'',tag:''};
function quarryVs(u,t){const m=u&&u.m;if(!m||!Array.isArray(m.perks)||!t)return QV0;const k=quarryOf(t);if(!k||!m.perks.includes(k))return QV0;const I=quarryInfo(m,k);
 return{key:k,dmg:I.dmg/100,hit:I.hit,n:I.n,tag:I.tag,slain:I.slain}}
// Every tree the merc has, in display order: (a fabled warrior's personal tree first), style trees, the gift, weapon trees, armor trees, the Monster hunter tree. [{key, tree, kind}]
function mercTrees(m){const out=[],tr=Array.isArray(m.trees)?m.trees:[];
 for(const k of tr)if(MAST[k]&&MAST[k].kind==='style')out.push({key:k,tree:MAST[k],kind:'style'});
 const g=m.gift&&MAST[m.gift]&&MAST[m.gift].kind==='gift'?m.gift:null;if(g)out.push({key:g,tree:MAST[g],kind:'gift'});
 for(const k of weaponTrees(m))out.push({key:k,tree:MAST[k],kind:'weapon'});
 for(const k of armorTrees(m))out.push({key:k,tree:MAST[k],kind:'armor'});
 for(const k of hunterTrees(m))out.push({key:k,tree:MAST[k],kind:'hunter'});
 for(const k of fabledTrees(m))out.unshift({key:k,tree:MAST[k],kind:'fabled'});return out}
// Every perk of every tree the merc has: [{id, perk, key, tree, tier, kind, owned, unlocked, need (level)}]
function perkOptions(m){const own=new Set(Array.isArray(m.perks)?m.perks:[]),out=[];
 for(const {key,tree,kind} of mercTrees(m))tree.tiers.forEach((tier,ti)=>{const need=tierLevel(kind,ti+1);for(const p of tier)out.push({id:p.id,perk:p,key,tree,tier:ti+1,kind,owned:own.has(p.id),unlocked:(m.lvl||1)>=need,need})});
 return out}
function canLearn(m,id){const P=PERKIX[id];if(!m||!P||!(m.pp>0)||!Array.isArray(m.perks)||m.perks.includes(id))return false;if((m.lvl||1)<perkNeed(P))return false;if(P.cap&&!capOK(m,P.key))return false;return mercTrees(m).some(x=>x.key===P.key)}
// Spends a point on perk id. Awakens the gift on its first perk; hitpoints gained are healed at once. Returns true when learned.
function learnPerk(m,id){if(!canLearn(m,id))return false;const hp0=calc(m).hp;m.perks.push(id);m.pp--;const hp1=calc(m).hp;if(hp1>hp0)m.hp=Math.min(hp1,(m.hp||0)+hp1-hp0);else m.hp=Math.min(m.hp,hp1);syncMast(m);return true}
// Older UI code reads m.mast; keep it a mirror of m.perks.
function syncMast(m){if(!m)return;const o={};for(const k of (Array.isArray(m.trees)?m.trees:[]))if(MAST[k])o[k]=0;for(const id of (m.perks||[])){const P=PERKIX[id];if(P&&P.key in o)o[P.key]++}m.mast=o}
// 4 style trees drawn from the background pool. r: a random source (default the seeded game stream).
function rollTrees(bg,r){const pool=(BG[bg]&&BG[bg].pool||MUNDANE).filter(k=>MAST[k]&&MAST[k].kind==='style').slice();
 if(r){for(let i=pool.length-1;i>0;i--){const j=Math.floor(r()*(i+1)),t=pool[i];pool[i]=pool[j];pool[j]=t}}else shuffle(pool);return pool.slice(0,4)}
/* autoLearn(m): spends every point on a sensible build for the merc's role: the gift first (awakened at once), then the
   highest open tier that suits its style, gear and weapons; abilities it could not use with its gear are passed over.
   Deterministic (no randomness). Returns the ids learned. */
function mercTags(m){const t=new Set([mercStyle(m)]),w=ITEMS[m.eq&&m.eq.w],a=ITEMS[m.eq&&m.eq.a];
 if(isRangedW(w)){t.add('ranged');if(w.wt==='bow')t.add('bow')}else{t.add('melee');t.add(w&&w.two?'two':'one')}if(m.eq&&m.eq.s&&!(w&&w.two))t.add('shield');if(!a||a.fat<=10)t.add('light');
 if(m.gift&&MAST[m.gift])t.add(MAST[m.gift].style);return t}
function perkFit(m,o,tags){const T=o.tree,p=o.perk,w=ITEMS[m.eq&&m.eq.w],sw=ITEMS[m.eq&&m.eq.b],wt=w?w.wt:'fist',swt=sw?sw.wt:null,rngd=isRangedW(w),bow=wt==='bow',two=!!(w&&w.two),
  sh=!!(m.eq&&m.eq.s),up=sh&&!two,swUp=sh&&!!sw&&!sw.two;   // up: the shield is raised with the main weapon in hand; swUp: with the sidearm
 let s=o.tier*10+(o.cap?40:0);if(o.kind==='gift')s+=giftAwake(m)?18:60;if(o.kind==='fabled')s+=80;   // a fabled warrior's own tree comes first
 if(o.kind==='weapon')s+=T.wt==='shield'?(up?14:swUp?4:-25):T.wt===wt?14:T.wt===swt?4:-25;
 if(o.kind==='armor'){if(T.aw!==armorClass(m))return s-200;s+=20;const md=p.mod||{};   // only the tree of the armor worn; within it, what suits the merc
  if(md.fleet&&!rngd)s-=6;if(p.flag==='slip'&&rngd)s+=4;if(md.steelWall&&rngd)s-=8;if(p.flag==='ironLung')s+=4;if(md.armRegen)s+=3}
 if(o.kind==='hunter'){const I=quarryInfo(m,o.id);return 4+o.tier*3+(I?Math.min(I.slain,I.cap)*4:0)}   // worth it once the merc has a tally of that quarry
 if((T.aff||[]).some(a=>tags.has(a)))s+=12;
 const a=p.ab&&AB[p.ab];if(a){s+=3;if(a.needs&&!needsOK(a,wt))s-=needsOK(a,swt)?12:45;if(a.two&&!two)s-=45;if(a.shield&&!up)s-=swUp?12:45;if(a.noBow&&rngd)s-=20;if(a.tgt==='ally'||a.party)s+=tags.has('support')?6:0}
 const md=p.mod||{};if(md.downSurv)s+=16;   // Stubborn: with death so near, living through being struck down comes first
 if((md.shieldDef||md.shieldHp||md.guard||md.deflect||md.shieldDr)&&!sh)s-=35;if((md.duelHit||md.duelDmg)&&(sh||two||rngd))s-=30;if(md.twoDmg&&!(two&&!rngd))s-=30;
 if((md.dmgRanged||md.coverIgn||md.longShot||p.flag==='noLock')&&!rngd)s-=30;if((md.rngB||p.flag==='eagle')&&!bow)s-=30;if(md.spellB&&!tags.has('caster'))s-=20;if(md.dmgMelee&&rngd)s-=20;
 if(p.st){if(rngd&&p.st.ms)s-=8;if(!rngd&&p.st.rs&&!p.st.ms)s-=12}
 return s}
function autoLearn(m){const got=[];if(!m||!Array.isArray(m.perks))return got;const tags=mercTags(m);let g=0;
 while(m.pp>0&&g++<40){let best=null,bs=-1e9;for(const o of perkOptions(m).concat(capOptions(m))){if(o.owned||!o.unlocked)continue;const s=perkFit(m,o,tags);if(s>bs){bs=s;best=o}}
  if(!best||!learnPerk(m,best.id))break;got.push(best.id)}
 return got}
/* equipRules(m, slot, itemId) -> {ok, why, drops?:[slots], slung?}: the hands rules for the equipment screen.
   slot w (main weapon) and b (sidearm) take any weapon; s takes a shield unless both weapons are two-handed; a / h body armor and helmets.
   A shield with a two-handed weapon in the main hand starts every battle slung (raised once a one-handed weapon or nothing is in hand). */
function equipRules(m,slot,id){const it=ITEMS[id];if(!it)return{ok:false,why:'Unknown item'};const want=slot==='b'?'w':slot;
 if(!['w','b','s','a','h'].includes(slot)||it.k!==want)return{ok:false,why:'That does not go in this slot'};
 const eq=m.eq||{},two=x=>!!(ITEMS[x]&&ITEMS[x].k==='w'&&ITEMS[x].two);
 if(slot==='s'){if(two(eq.w)&&two(eq.b))return{ok:false,why:'Both weapons are two-handed: no hand is free for a shield'};
  if(two(eq.w))return{ok:true,why:'Slung on the back while the two-handed weapon is in hand; raised after a swap',slung:true};return{ok:true,why:''}}
 if(slot==='w'||slot==='b'){const other=slot==='w'?eq.b:eq.w;
  if(it.two&&eq.s&&two(other))return{ok:true,why:'Both weapons would be two-handed: the shield goes to the stash',drops:['s']};
  if(it.two&&eq.s)return{ok:true,why:'The shield is slung while this is in hand',slung:slot==='w'}}
 return{ok:true,why:''}}
// Drops a shield the hands rules no longer allow (both weapons two-handed). Returns the dropped item id or null.
function fixHands(m){const eq=m.eq||{},two=x=>!!(ITEMS[x]&&ITEMS[x].k==='w'&&ITEMS[x].two);if(eq.s&&two(eq.w)&&two(eq.b)){const s=eq.s;eq.s=null;return s}return null}
// The perks an old mastery record {key: n} stands for: the first n tier perks of each tree.
function legacyPerks(mast){const out=[];if(!mast||typeof mast!=='object')return out;for(const k in mast){const T=MAST[k];if(!T)continue;const n=Math.max(0,Math.floor(Number(mast[k])||0));for(let t=0;t<n&&t<T.tiers.length;t++)out.push(T.tiers[t][0].id)}return out}

/* ---- legendary powers in the battle rules (25-legend.js): hurt(), killUnit() and mkMercUnit() of 60-battle-core.js are wrapped once, here
   (this file loads after it), so leech / thorns / chain lightning / fearless run without touching the core file. The wrappers only add what
   legendHit / legendKill / legendUnit do; the forecast is untouched (those effects follow the hit; the hit and damage numbers are the core's). */
if(typeof hurt==='function'&&typeof legendHit==='function'&&!hurt.lg){const h0=hurt;hurt=function(t,dmg,ign,src,o){const r=h0(t,dmg,ign,src,o);if(src)legendHit(src,t,r,o);return r};hurt.lg=1}
if(typeof killUnit==='function'&&typeof legendKill==='function'&&!killUnit.lg){const k0=killUnit;killUnit=function(t,src,head){const r=k0(t,src,head);if(src)legendKill(src,t);return r};killUnit.lg=1}
if(typeof mkMercUnit==='function'&&typeof legendUnit==='function'&&!mkMercUnit.lg){const u0=mkMercUnit;mkMercUnit=function(m,side){return legendUnit(u0(m,side))};mkMercUnit.lg=1}
