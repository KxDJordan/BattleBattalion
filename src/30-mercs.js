/* ================= MERCS ================= */
/* wpickBG(t?): a background for a tavern recruit (seeded). Weighted by BG[k].w (rarity); with a town t: backgrounds whose BG[k].town (the
   smallest settlement that hires them out, default 1) is above t.size are skipped, and those whose BG[k].bio lists the town's biome count double. */
// bgWeight(k, t?): the plain rarity weight of background k (BG[k].w): 14-company.js's recruitBG reads it and applies town size, biome and renown itself.
function bgWeight(k){const b=BG[k];return b?b.w||0:0}
// bgWeightIn(k, t?): the full weight wpickBG draws with: 0 when town t is smaller than BG[k].town, x2 in one of BG[k].bio.
function bgWeightIn(k,t){const b=BG[k];if(!b)return 0;const size=t&&svFinM(t.size)?t.size:3;if((b.town||1)>size)return 0;let bio=null;
 if(t&&typeof tileAt==='function'&&typeof BIOKEY!=='undefined'&&svFinM(t.x)&&svFinM(t.y)){try{bio=BIOKEY[tileAt(t.x,t.y)]||null}catch(e){bio=null}}
 return(b.w||0)*(bio&&Array.isArray(b.bio)&&b.bio.includes(bio)?2:1)}
function wpickBG(t){const ks=Object.keys(BG),wt=k=>bgWeightIn(k,t);
 let tot=0;ks.forEach(k=>tot+=wt(k));let x=rnd()*tot;for(const k of ks){const w=wt(k);if(!w)continue;x-=w;if(x<=0)return k}return ks[0]}
const svFinM=x=>typeof x==='number'&&isFinite(x);
/* ---- Followers (the progression agent's 14-company.js): the rules read the ones that touch battle and merc numbers. ---- */
const fHas=id=>{try{return typeof followerHas==='function'&&!!followerHas(id)}catch(e){return false}};
// Battle XP multiplier for the company (drillmaster: +20%). The XP grant itself is in 68-battle-flow.js: battleXP(m,x) applies it.
function xpMult(){return fHas('drill')||fHas('drillmaster')?1.2:1}
function battleXP(m,x){gainXP(m,Math.round(x*xpMult()))}
// Armor points one tool mends (armorer: +50%).
function toolPts(){return Math.round(TOOLPTS*(fHas('armorer')?1.5:1))}
/* ---- Traits (TRAITS in 10-data.js) ---- */
function traitsOf(m){return(m&&Array.isArray(m.traits)?m.traits:[]).map(k=>TRAITS[k]).filter(Boolean)}
const traitW=(bg,k)=>{const b=BG[bg],w=b&&b.tr&&b.tr[k];return typeof w==='number'&&w>=0?w:1};
/* rollTraits(bg, r?): 0-2 trait keys for a merc of background bg, from r (a 0..1 generator; default the game's rnd). 30% none, 48% one,
   22% two; each drawn by background weight, never one already held or the opp of one held. */
function rollTraits(bg,r){r=r||rnd;const x=r(),n=x<.3?0:x<.78?1:2,out=[];
 for(let i=0;i<n;i++){const ks=Object.keys(TRAITS).filter(k=>!out.includes(k)&&!out.some(o=>TRAITS[o].opp===k||TRAITS[k].opp===o)&&traitW(bg,k)>0);
  let tot=0;for(const k of ks)tot+=traitW(bg,k);if(!(tot>0))break;let y=r()*tot,pk=ks[ks.length-1];for(const k of ks){y-=traitW(bg,k);if(y<=0){pk=k;break}}out.push(pk)}
 return out}
// True when a trait list is valid: known keys, no repeats, at most 2, never a trait with its opp.
function traitsValid(L){if(!Array.isArray(L)||L.length>2)return false;for(let i=0;i<L.length;i++){const T=TRAITS[L[i]];if(!T||L.indexOf(L[i])!==i)return false;if(T.opp&&L.includes(T.opp))return false}return true}
// The daily wage of a merc: the background's wage, with Greedy / Loyal (TRAITS[k].wage fractions), rounded, at least 1.
function mercWage(m){const b=m&&BG[m.bg];if(!b)return 0;let f=1;for(const T of traitsOf(m))if(T.wage)f+=T.wage;return Math.max(1,Math.round(b.wage*f))}
/* A merc: {id,name,bg,race,lvl,xp,pp,pend,base:{hp,fat,init,ms,rs,md,rd,brv},tal,trees,gift,perks,traits:[keys],eq:{w,b,s,a,h},hp,field,inj:[{id,days}],cond?:{a,h},slain:{quarryKey:kills}}
   traits: 0-2 TRAITS keys rolled at creation (rollTraits); their st and mods are in calc(m), their battle flags in 60-battle-core.js.
   base.brv is resolve (morale checks); eq.h a helmet, eq.b a sidearm (any weapon; swapped in battle); eq.s a shield or an off-hand weapon (11w-dualwield.js); cond the armor points left on body (a)
   and head (h), absent = whole; inj the injuries carried (days left, -1 = permanent). trees / gift / perks: see 61-talents.js. */
function newMerc(bg){const b=BG[bg],race=rnd()<.55?'human':pick(['elf','dwarf','halforc']);
 const base={hp:ri(50,60),fat:ri(90,100),init:ri(98,112),ms:ri(47,56),rs:ri(32,42),md:ri(0,5),rd:ri(0,5),brv:ri(32,44)};
 for(const k in b.st)base[k]+=b.st[k];for(const k in RACE[race].st)base[k]+=RACE[race].st[k];
 const tal={};shuffle(Object.keys(base)).slice(0,3).forEach(k=>tal[k]=ri(1,3));
 const trees=rollTrees(bg);let gift=null;
 let x=rnd(),gres=null;for(const [k,p] of (b.r||[])){if(x<p){gres=k;break}x-=p}   // one resource only
 const eq={w:null,b:null,s:null,a:null,h:null,c:null};b.gear.forEach(gs=>{const id=pick(gs.split('|'));if(ITEMS[id])eq[ITEMS[id].k]=id});
 if(b.side){const id=pick(b.side.split('|'));if(ITEMS[id]&&ITEMS[id].k==='w')eq.b=id}
 if(eq.s&&ITEMS[eq.w]&&ITEMS[eq.w].two)eq.s=null;   // a recruit who carries a two-hander brings no shield
 if(gres){const th=(b.wt||[]).includes('throwing')&&!(RACE[race].noWt||[]).includes('throwing')&&throwKit(eq.w,eq.b);gift=giftKey(gres,th?'throwing':b.style||'melee')}   // a thrower rolls the throwing variant (giftStyle, 61-talents.js)
 const traits=rollTraits(bg);
 const m={id:G.nid++,name:pick(NAMES),bg,race,lvl:1,xp:0,pp:1,pend:0,base,tal,trees:gift?trees.concat([gift]):trees,gift,perks:[],eq,hp:base.hp,field:false,inj:[],traits,slain:{}};
 fixHands(m);syncMast(m);m.hp=calc(m).hp;return m}
// The merc's gift resource (mana aura qi chi) or null.
function mercRes(m){if(!m)return null;if(m.gift&&MAST[m.gift]&&MAST[m.gift].res)return MAST[m.gift].res;if(!Array.isArray(m.perks)&&m.mast&&typeof m.mast==='object')return RESK.find(k=>k in m.mast)||null;return null}
/* calc(m, o?): the merc's fighting numbers from base stats, perks, gear and injuries, with the main weapon in hand
   (o.hand 'b': the sidearm in hand instead; battle units recompute on a swap).
   {hp,fat,init,ms,rs,md,rd,brv,ap, arm (body armor max), helm (head armor max), res, abs (perk abilities, then weapon and shield skills, swap),
    flags (perk flags and summed mods; a raised tower shield adds its guard and shGuard), dmg,
    wpn (a copy of the weapon in hand with weapon-tree changes, reload included; id = item id or null for fists),
    shield:{id,look,hp,md,rd,raised,guard,wallB,spike}|null (md/rd are what it adds when raised; slung with a two-handed weapon in hand;
           guard/wallB/spike from the item: Cover for allies beside it, the Shield wall bonus, the Spiked bash roll),
    hand, wid, alt (item ids in hand / the other weapon), perks (active ids), off (weapon perks idle: another family in hand; armor perks idle:
    another weight class worn), acl (armorClass: light medium heavy), aw (armor + helmet weight = their fatigue),
    initDef (melee and ranged defense from initiative: Quicksilver floor(flags.initDef x init) plus Read the blade, already inside md and rd),
    readDef (the Read the blade share of it), inj:[ids],
    dw (the off-hand weapon object while a weapon is in each hand, else null), dwId (the off-hand item carried), dwIdle (carried, not in use: 11w-dualwield.js)} */
/* Armor weight classes for the armor trees: light = no body armor, a robe, or at most ACLASS.light armor points; medium = at most
   ACLASS.medium; heavy = more. A famed piece keeps the class of the item it was made from. armorClass(m) takes a merc, or a battle unit
   (its merc's armor; an enemy by its armor maximum). */
const ACLASS={light:60,medium:150};
const READINIT={from:90,per:8,max:8,cap:20};   // Read the blade (Shadowdancer tree): defense from initiative
/* The weight class counts the body armor and the helmet together, by their weight (the fatigue they cost): light up to ACLASSW.light,
   medium up to ACLASSW.medium, heavy beyond. The limits are the heaviest light (6 + 3) and medium (18 + 8) body and helmet, so pieces of
   one class stay in it and a mix lands between. Robes weigh nothing here (casters' cloth). A famed or legendary piece weighs what the
   item it was made from weighs. armorWeight(id) one piece; armorPieceClass(id) a piece on its own (the shop's label).
   armorClassOf(a, h) body a with helmet h (one argument: the body piece on its own); armorClass(m) a merc, or a battle unit (its
   merc's gear; an enemy by its body and head armor points). */
const ACLASSW={light:9,medium:26},ACLASSP={a:[6,18],h:[3,8]};
function armorBase(id){const it=ITEMS[id];if(!it)return null;const bid=it.famed&&it.base&&ITEMS[it.base]?it.base:id;return{id:bid,it:ITEMS[bid]}}
function armorWeight(id){const r=armorBase(id);if(!r||(r.it.k!=='a'&&r.it.k!=='h'))return 0;if(r.it.k==='a'&&(r.it.robe||/robe/.test(r.id)))return 0;return Math.max(0,+r.it.fat||0)}
function armorPieceClass(id){const r=armorBase(id);if(!r||(r.it.k!=='a'&&r.it.k!=='h'))return null;const w=armorWeight(id),L=ACLASSP[r.it.k];return w<=L[0]?'light':w<=L[1]?'medium':'heavy'}
function armorClassOf(id,h){if(arguments.length<2)return armorPieceClass(id)||'light';const w=armorWeight(id)+armorWeight(h);return w<=ACLASSW.light?'light':w<=ACLASSW.medium?'medium':'heavy'}
function armorClass(m){if(!m)return'light';if(m.m&&m.side!=null)m=m.m;else if(m.side!=null&&!m.eq){const a=(m.armMax||0)+(m.helmMax||0);return a<=ACLASS.light*1.6?'light':a<=ACLASS.medium*1.7?'medium':'heavy'}
 return armorClassOf(m.eq&&m.eq.a,m.eq&&m.eq.h)}
/* perkSum(ids, wpn, raised, acl, sh): what a list of perks makes of a fighter, the one rule for mercs (calc) and for the foes that carry
   masteries (foePerks, 64m-foemast.js). wpn is the weapon in hand (a copy: its wmods are applied to it), raised whether a shield is up,
   acl the armor weight class, sh the shield item carried (or null). Weapon mastery perks work only with their family in hand (p.wt; 'shield':
   only while a shield is raised, though its shield hitpoints count whenever one is carried: shHpOff); armor trees only in their class.
   Returns {perks (working), off (idle), st (stat deltas), abs, flags, res (gift pools), shHpOff}. */
function perkSum(ids,wpn,raised,acl,sh){const o={perks:[],off:[],st:{},abs:[],flags:{},res:{},shHpOff:0};
 for(const id of ids||[]){const P=perkById(id);if(!P)continue;const p=P.perk,T=P.tree;
  const pw=p.wt||T.wt;if(T.kind==='weapon'&&pw&&(pw==='shield'?!raised:pw!==wpn.wt)){o.off.push(id);if(pw==='shield'&&sh&&p.mod&&p.mod.shieldHp)o.shHpOff+=p.mod.shieldHp;continue}
  if(T.kind==='armor'&&T.aw!==acl){o.off.push(id);continue}   // armor trees: only in body armor of their weight class
  o.perks.push(id);
  if(p.st)for(const q in p.st)o.st[q]=(o.st[q]||0)+p.st[q];if(p.ab&&AB[p.ab]&&!o.abs.includes(p.ab))o.abs.push(p.ab);
  if(p.flag)o.flags[p.flag]=1;if(p.mod)for(const q in p.mod)o.flags[q]=(o.flags[q]||0)+p.mod[q];
  if(p.wmod){const x=p.wmod;if(x.d)wpn.d=[wpn.d[0]+x.d[0],wpn.d[1]+x.d[1]];if(x.ap)wpn.ap=Math.max(2,wpn.ap+x.ap);if(x.fat){wpn.fat=Math.max(0,(wpn.fat||0)+x.fat);wpn.fatCut=(wpn.fatCut||0)-x.fat}if(x.rng)wpn.rng+=x.rng;if(x.ign)wpn.ign=(wpn.ign||.2)+x.ign;
   if(x.hit)wpn.hit=(wpn.hit||0)+x.hit;if(x.stun)wpn.stun=(wpn.stun||0)+x.stun;if(x.spell)wpn.spell=(wpn.spell||0)+x.spell;if(x.crush)wpn.crush=(wpn.crush||0)+x.crush;
   if(x.rld&&wpn.reload)wpn.reload.ap=Math.max(2,wpn.reload.ap+x.rld);if(x.rfat&&wpn.reload)wpn.reload.fat=Math.max(0,(wpn.reload.fat||0)+x.rfat)}   // rfat: Ramrod drill's lighter reload
  if(T.kind==='gift'&&T.res){const R=o.res[T.res]||(o.res[T.res]={max:GIFTBASE,regen:GIFTREGEN});if(p.res)R.max+=p.res;if(p.regen)R.regen+=p.regen}}
 return o}
function calc(m,o){const hand=o&&o.hand==='b'?'b':'w',eq=m.eq||{},wid=eq[hand]||null,wi=ITEMS[wid]&&ITEMS[wid].k==='w'?ITEMS[wid]:null,acl=armorClassOf(eq.a,eq.h);
 const s={hp:m.base.hp,fat:m.base.fat,init:m.base.init,ms:m.base.ms,rs:m.base.rs,md:m.base.md,rd:m.base.rd,brv:typeof m.base.brv==='number'?m.base.brv:40,ap:9,arm:0,helm:0,res:{},abs:[],flags:{},dmg:0,shield:null,inj:[],
  hand,wid:wi?wid:null,alt:(hand==='w'?eq.b:eq.w)||null,perks:[],off:[],acl,aw:0};
 const wpn=Object.assign({},wi||FIST,{id:wi?wid:null});wpn.d=wpn.d.slice();if(wpn.reload)wpn.reload=Object.assign({},wpn.reload);
 const sh=ITEMS[eq.s]&&ITEMS[eq.s].k==='s'?ITEMS[eq.s]:null,raised=!!sh&&!wpn.two;let shHpOff=0;
 {const P=perkSum(Array.isArray(m.perks)?m.perks:legacyPerks(m.mast),wpn,raised,acl,sh);s.perks=P.perks;s.off=P.off;shHpOff=P.shHpOff;s.abs=P.abs;s.flags=P.flags;s.res=P.res;for(const q in P.st)s[q]=(s[q]||0)+P.st[q]}
 const a=ITEMS[eq.a],h=ITEMS[eq.h];s.wpn=wpn;
 if(sh){const sd=s.flags.shieldDef||0;s.fat-=sh.fat;s.shield={id:eq.s,look:sh.look||'heater',hp:Math.round((sh.hp||48)*(1+(s.flags.shieldHp||0)+shHpOff)),md:sh.md+sd,rd:sh.rd+sd,raised,
   guard:sh.guard||0,wallB:sh.wallB||0,spike:sh.spike?sh.spike.slice():null};
  if(raised){s.md+=sh.md+sd;s.rd+=sh.rd+sd;if(sh.guard){s.flags.guard=(s.flags.guard||0)+sh.guard;s.flags.shGuard=sh.guard}}}
 if(a){s.arm=a.arm;s.fat-=a.fat;s.md+=a.md||0;s.rd+=a.rd||0}if(h){s.helm=h.arm;s.fat-=h.fat;s.md+=h.md||0;s.rd+=h.rd||0}   // armor and helmets may carry defence (famed rolls)
 {const c=ITEMS[eq.c];if(c&&c.k==='c'){s.fat-=c.fat||0;s.brv+=c.brv||0;s.md+=c.md||0;s.rd+=c.rd||0;s.init+=c.init||0}}   // the surcoat over the armor (47-tailor.js)
 s.aw=(a?a.fat||0:0)+(h?h.fat||0:0);if(s.flags.ironLung)s.fat+=Math.floor(s.aw/2);   // aw: what armor and helmet weigh (Nimble); Iron lung gives half of it back
 if(typeof legendPow==='function'){if(wi&&wi.power)legendPow(s,wi.power);if(sh&&sh.power&&raised)legendPow(s,sh.power);if(a&&a.power)legendPow(s,a.power);if(h&&h.power)legendPow(s,h.power)}   // legendary powers (25-legend.js): the weapon in hand, a raised shield, armor, helmet
 for(const id of (wpn.sk||[]).concat(raised&&sh.sk||[]))if(AB[id]&&!s.abs.includes(id))s.abs.push(id);
 if(eq.b&&ITEMS[eq.b])s.abs.push('swap');
 for(const T of traitsOf(m)){if(T.st)for(const k in T.st)s[k]=(s[k]||0)+T.st[k];if(T.flag)s.flags[T.flag]=1;if(T.mod)for(const q in T.mod)s.flags[q]=(s.flags[q]||0)+T.mod[q]}   // traits
 if(Array.isArray(m.inj))for(const j of m.inj){const I=j&&INJ[j.id];if(!I)continue;s.inj.push(j.id);for(const k in I.st)s[k]+=I.st[k]}
 {const ow=offItem(m);s.dw=null;s.dwId=ow?eq.s:null;s.dwIdle=false;   // Twin blades (11w-dualwield.js): the off-hand weapon, in use beside a one-handed melee weapon in hand
  if(ow){if(wi&&dwMainOK(wi)){const o=Object.assign({},ow,{id:eq.s});o.d=ow.d.slice();delete o.sk;delete o.power;s.dw=o;s.md+=s.flags.dwDef||0}else s.dwIdle=true}}
 if(s.flags.initDef){s.initDef=Math.floor(s.flags.initDef*Math.max(0,s.init));s.md+=s.initDef;s.rd+=s.initDef}else s.initDef=0;   // Quicksilver (light armor): a share of the initiative as defense
 s.readDef=0;if(s.flags.readInit){s.readDef=Math.max(0,Math.min(READINIT.max,Math.floor((s.init-READINIT.from)/READINIT.per),READINIT.cap-s.initDef));s.md+=s.readDef;s.rd+=s.readDef;s.initDef+=s.readDef}   // Read the blade (Shadowdancer): 1 a READINIT.per initiative above READINIT.from, at most READINIT.max, Quicksilver and it at most READINIT.cap
 if(s.hp<5)s.hp=5;if(s.fat<20)s.fat=20;s.ap=clamp(Math.round(s.ap),4,12);return s}
function gainXP(m,x){m.xp+=x;while(m.lvl<MAXLV&&m.xp>=XPT[m.lvl+1]){m.lvl++;m.pp++;m.pend++}}
function fielded(){let f=G.roster.filter(m=>m.field);if(!f.length){G.roster.slice(0,MAXFIELD).forEach(m=>m.field=true);f=G.roster.filter(m=>m.field)}return f.slice(0,MAXFIELD)}

/* ---- Armor condition, tools and repair ----
   Armor does not mend itself: m.cond={a,h} holds the points left (a missing key or no cond at all = whole).
   G.tools is a company stock; each tool mends toolPts() points (TOOLPTS, +50% with the armorer follower). */
function armorCond(m){const a=ITEMS[m.eq.a],h=ITEMS[m.eq.h],c=m.cond||{},aMax=a?a.arm:0,hMax=h?h.arm:0,f=(v,mx)=>typeof v==='number'&&isFinite(v)?clamp(Math.round(v),0,mx):mx;
 return{a:f(c.a,aMax),aMax,h:f(c.h,hMax),hMax}}
function setArmorCond(m,a,h){const c=armorCond(m);a=clamp(Math.round(a),0,c.aMax);h=clamp(Math.round(h),0,c.hMax);
 if(a>=c.aMax&&h>=c.hMax){delete m.cond;return}m.cond={};if(a<c.aMax)m.cond.a=a;if(h<c.hMax)m.cond.h=h}
// Armor points missing across the company and the tools it would take: {pts,tools}.
function repairNeed(){let pts=0;if(G&&G.roster)for(const m of G.roster){const c=armorCond(m);pts+=c.aMax-c.a+c.hMax-c.h}return{pts,tools:Math.ceil(pts/toolPts())}}
/* repairAll(maxTools?): mends armor and helmets from G.tools, fielded mercs and the worst damage first.
   Returns {tools (used), pts (mended), left (points still missing), list:[{name,pts}]}. Uses no randomness. */
function repairAll(maxTools){const have=Math.max(0,Math.floor(typeof G.tools==='number'&&isFinite(G.tools)?G.tools:0)),use=typeof maxTools==='number'?clamp(Math.floor(maxTools),0,have):have;
 const per=toolPts();let pool=use*per,pts=0;const list=[],dmg=m=>{const c=armorCond(m);return c.aMax-c.a+c.hMax-c.h};
 const order=G.roster.map((m,i)=>({m,i,d:dmg(m)})).filter(x=>x.d>0).sort((x,y)=>(y.m.field?1:0)-(x.m.field?1:0)||y.d-x.d||x.i-y.i);
 for(const {m} of order){if(pool<=0)break;const c=armorCond(m),na=Math.min(c.aMax-c.a,pool);pool-=na;const nh=Math.min(c.hMax-c.h,pool);pool-=nh;
  if(na+nh>0){setArmorCond(m,c.a+na,c.h+nh);pts+=na+nh;list.push({name:m.name,pts:na+nh})}}
 const tools=Math.ceil(pts/per);G.tools=have-tools;return{tools,pts,left:repairNeed().pts,list}}

/* ---- Injuries ---- */
function hasInjury(m,id){return Array.isArray(m.inj)&&m.inj.some(j=>j.id===id)}
// Adds injury id to the merc (days: healing time, ignored for permanent ones). Returns the record, or null if it is unknown or already carried.
function addInjury(m,id,days){const I=INJ[id];if(!I||hasInjury(m,id))return null;if(!Array.isArray(m.inj))m.inj=[];
 const j={id,days:I.perm?-1:Math.max(1,Math.round(typeof days==='number'?days:I.days[0]))};m.inj.push(j);if(typeof m.hp==='number'&&typeof calc==='function'){try{m.hp=Math.min(m.hp,calc(m).hp)}catch(e){}}return j}   // a wound that lowers the hitpoints lowers what is left of them too (saves clamp it the same way)
// Rolls a fresh injury (seeded): head or body by where the blow fell, permanent or not. Returns its id, or null when nothing new fits.
function rollInjury(m,head,perm,slow){const have=id=>hasInjury(m,id),all=Object.keys(INJ).filter(id=>!!INJ[id].perm===!!perm&&!have(id));
 let pool=all.filter(id=>INJ[id].loc===(head?'h':'b'));if(!pool.length)pool=all;if(!pool.length)return null;
 const id=pick(pool),I=INJ[id];return addInjury(m,id,I.perm?-1:Math.round(ri(I.days[0],I.days[1])*(slow?1.5:1)))?id:null}
/* healInjuriesDaily(): one day of healing for the whole roster. Call once from newDay(). With the surgeon follower injuries heal
   50% faster (on even days each injury loses 2 days instead of 1).
   Returns the injuries that healed today: [{m, name, id, n}]. Uses no randomness. */
function healInjuriesDaily(){const out=[];if(!G||!Array.isArray(G.roster))return out;
 for(const m of G.roster){if(!Array.isArray(m.inj)||!m.inj.length)continue;
  let step=fHas('surgeon')&&(G.day|0)%2===0?2:1;if(typeof runModHealStep==='function')step=runModHealStep(step);   // plague years: every third day no healing (27-runmods.js)   // surgeon: an extra day off every other day (1.5 days a day)
  m.inj=m.inj.filter(j=>{if(j.days<0)return true;j.days-=step;if(j.days>0)return true;out.push({m,name:m.name,id:j.id,n:INJ[j.id]?INJ[j.id].n:j.id});return false});
  const mx=calc(m).hp;if(m.hp>mx)m.hp=mx}
 return out}
// Temple price in crowns for treating one injury, or null when it cannot be treated (permanent, or not carried).
function injuryCost(m,id){const j=Array.isArray(m.inj)&&m.inj.find(j=>j.id===id);if(!j||j.days<0||!INJ[id]||INJ[id].perm)return null;return Math.round((40+20*Math.max(1,j.days))*(typeof originK==='function'?originK('temple'):1)*(typeof runModK==='function'?runModK('temple',1):1))}
// Pays injuryCost and removes the injury. Returns true when treated; false (nothing changes) when it cannot be treated or paid for.
function treatInjury(m,id){const cost=injuryCost(m,id);if(cost==null||!(G.crowns>=cost))return false;G.crowns-=cost;m.inj=m.inj.filter(j=>j.id!==id);if(typeof achEvent==='function')achEvent('treat',{id});return true}
