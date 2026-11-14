/* ================= TALENTS =================
   The talent API (the trees themselves are MAST in 10-data.js). A merc carries
     m.trees  [tree keys] fixed at creation: 4 style trees from BG[bg].pool, plus its gift tree when it has one
     m.gift   the gift tree key (a MAST entry of kind 'gift') or null; chosen from the gift and BG[bg].style (giftKey)
     m.perks  [perk ids] learned, in order;  m.pp unspent perk points (one a level, level 1 included)
   Weapon trees are not stored: weaponTrees(m) = BG[bg].wt minus RACE[race].noWt.
   Tier t of a style or gift tree opens at level t, of a weapon tree at level 3t; any open perk can be bought with a point.
   The first perk learned in the gift tree awakens the gift (calc() then grants its pool).
   m.mast is a derived, read-only mirror {treeKey: perks owned} kept for older UI code; nothing in the rules reads it.
   Uses no randomness except rollTrees() at recruitment (seeded). */
const PERKIX={};for(const k in MAST)MAST[k].tiers.forEach((tier,ti)=>tier.forEach(p=>{PERKIX[p.id]={perk:p,tree:MAST[k],key:k,tier:ti+1,kind:MAST[k].kind}}));
// The level at which tier t (1-based) of a tree of this kind opens.
function tierLevel(kind,t){return kind==='weapon'?3*t:t}
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
// Every tree the merc has, in display order: style trees, the gift, weapon trees. [{key, tree, kind}]
function mercTrees(m){const out=[],tr=Array.isArray(m.trees)?m.trees:[];
 for(const k of tr)if(MAST[k]&&MAST[k].kind==='style')out.push({key:k,tree:MAST[k],kind:'style'});
 const g=m.gift&&MAST[m.gift]&&MAST[m.gift].kind==='gift'?m.gift:null;if(g)out.push({key:g,tree:MAST[g],kind:'gift'});
 for(const k of weaponTrees(m))out.push({key:k,tree:MAST[k],kind:'weapon'});return out}
// Every perk of every tree the merc has: [{id, perk, key, tree, tier, kind, owned, unlocked, need (level)}]
function perkOptions(m){const own=new Set(Array.isArray(m.perks)?m.perks:[]),out=[];
 for(const {key,tree,kind} of mercTrees(m))tree.tiers.forEach((tier,ti)=>{const need=tierLevel(kind,ti+1);for(const p of tier)out.push({id:p.id,perk:p,key,tree,tier:ti+1,kind,owned:own.has(p.id),unlocked:(m.lvl||1)>=need,need})});
 return out}
function canLearn(m,id){const P=PERKIX[id];if(!m||!P||!(m.pp>0)||!Array.isArray(m.perks)||m.perks.includes(id))return false;if((m.lvl||1)<tierLevel(P.kind,P.tier))return false;return mercTrees(m).some(x=>x.key===P.key)}
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
 let s=o.tier*10;if(o.kind==='gift')s+=giftAwake(m)?18:60;
 if(o.kind==='weapon')s+=T.wt==='shield'?(up?14:swUp?4:-25):T.wt===wt?14:T.wt===swt?4:-25;
 if((T.aff||[]).some(a=>tags.has(a)))s+=12;
 const a=p.ab&&AB[p.ab];if(a){s+=3;if(a.needs&&a.needs!==wt)s-=a.needs===swt?12:45;if(a.two&&!two)s-=45;if(a.shield&&!up)s-=swUp?12:45;if(a.noBow&&rngd)s-=20;if(a.tgt==='ally'||a.party)s+=tags.has('support')?6:0}
 const md=p.mod||{};if((md.shieldDef||md.shieldHp||md.guard||md.deflect||md.shieldDr)&&!sh)s-=35;if((md.duelHit||md.duelDmg)&&(sh||two||rngd))s-=30;if(md.twoDmg&&!(two&&!rngd))s-=30;
 if((md.dmgRanged||md.coverIgn||md.longShot||p.flag==='noLock')&&!rngd)s-=30;if((md.rngB||p.flag==='eagle')&&!bow)s-=30;if(md.spellB&&!tags.has('caster'))s-=20;if(md.dmgMelee&&rngd)s-=20;
 if(p.st){if(rngd&&p.st.ms)s-=8;if(!rngd&&p.st.rs&&!p.st.ms)s-=12}
 return s}
function autoLearn(m){const got=[];if(!m||!Array.isArray(m.perks))return got;const tags=mercTags(m);let g=0;
 while(m.pp>0&&g++<40){let best=null,bs=-1e9;for(const o of perkOptions(m)){if(o.owned||!o.unlocked)continue;const s=perkFit(m,o,tags);if(s>bs){bs=s;best=o}}
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
