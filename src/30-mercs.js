/* ================= MERCS ================= */
function wpickBG(){const ks=Object.keys(BG);let tot=0;ks.forEach(k=>tot+=BG[k].w);let x=rnd()*tot;for(const k of ks){x-=BG[k].w;if(x<=0)return k}return ks[0]}
/* A merc: {id,name,bg,race,lvl,xp,pp,pend,base:{hp,fat,init,ms,rs,md,rd,brv},tal,mast,eq:{w,s,a,h},hp,field,inj:[{id,days}],cond?:{a,h}}
   base.brv is resolve (morale checks); eq.h a helmet; cond the armor points left on body (a) and head (h), absent = whole;
   inj the injuries carried (days left, -1 = permanent). */
function newMerc(bg){const b=BG[bg],race=rnd()<.55?'human':pick(['elf','dwarf','halforc']);
 const base={hp:ri(50,60),fat:ri(90,100),init:ri(98,112),ms:ri(47,56),rs:ri(32,42),md:ri(0,5),rd:ri(0,5),brv:ri(32,44)};
 for(const k in b.st)base[k]+=b.st[k];for(const k in RACE[race].st)base[k]+=RACE[race].st[k];
 const tal={};shuffle(Object.keys(base)).slice(0,3).forEach(k=>tal[k]=ri(1,3));
 const mast={};b.m.forEach(k=>mast[k]=0);
 let x=rnd();for(const [k,p] of (b.r||[])){if(x<p){mast[k]=0;break}x-=p}   // one resource only
 let g=0;while(Object.keys(mast).length<3&&g++<20)mast[pick(MUNDANE)]=0;
 const eq={w:null,s:null,a:null,h:null};b.gear.forEach(gs=>{const id=pick(gs.split('|'));if(ITEMS[id])eq[ITEMS[id].k]=id});
 if(eq.w&&ITEMS[eq.w].two)eq.s=null;
 return{id:G.nid++,name:pick(NAMES),bg,race,lvl:1,xp:0,pp:1,pend:0,base,tal,mast,eq,hp:base.hp,field:false,inj:[]}}
function mercRes(m){return RESK.find(k=>k in m.mast)||null}
/* calc(m): the merc's fighting numbers from base stats, perks, gear and injuries.
   {hp,fat,init,ms,rs,md,rd,brv, arm (body armor max), helm (head armor max), res, abs (perk abilities, then weapon and shield skills),
    flags, dmg, wpn, shield:{hp,md,rd}|null, inj:[ids]} */
function calc(m){const s={hp:m.base.hp,fat:m.base.fat,init:m.base.init,ms:m.base.ms,rs:m.base.rs,md:m.base.md,rd:m.base.rd,brv:typeof m.base.brv==='number'?m.base.brv:40,arm:0,helm:0,res:{},abs:[],flags:{},dmg:0,shield:null,inj:[]};
 for(const k in m.mast){const M=MAST[k];if(!M)continue;for(let i=0;i<m.mast[k]&&i<M.p.length;i++){const p=M.p[i];if(p.st)for(const q in p.st)s[q]+=p.st[q];if(p.ab)s.abs.push(p.ab);if(p.flag)s.flags[p.flag]=1;
  if(p.res){const R=s.res[M.res]||(s.res[M.res]={max:0,regen:4});R.max+=p.res;if(p.regen)R.regen+=p.regen}}}
 const w=ITEMS[m.eq.w],sh=ITEMS[m.eq.s],a=ITEMS[m.eq.a],h=ITEMS[m.eq.h];s.wpn=w||FIST;
 if(sh){s.md+=sh.md;s.rd+=sh.rd;s.fat-=sh.fat;s.shield={hp:sh.hp||48,md:sh.md,rd:sh.rd}}if(a){s.arm=a.arm;s.fat-=a.fat}if(h){s.helm=h.arm;s.fat-=h.fat}
 for(const id of (s.wpn.sk||[]).concat(sh&&sh.sk||[]))if(AB[id]&&!s.abs.includes(id))s.abs.push(id);
 if(Array.isArray(m.inj))for(const j of m.inj){const I=j&&INJ[j.id];if(!I)continue;s.inj.push(j.id);for(const k in I.st)s[k]+=I.st[k]}
 if(s.hp<5)s.hp=5;if(s.fat<20)s.fat=20;return s}
function gainXP(m,x){m.xp+=x;while(m.lvl<MAXLV&&m.xp>=XPT[m.lvl+1]){m.lvl++;m.pp++;m.pend++}}
function fielded(){let f=G.roster.filter(m=>m.field);if(!f.length){G.roster.slice(0,MAXFIELD).forEach(m=>m.field=true);f=G.roster.filter(m=>m.field)}return f.slice(0,MAXFIELD)}

/* ---- Armor condition, tools and repair ----
   Armor does not mend itself: m.cond={a,h} holds the points left (a missing key or no cond at all = whole).
   G.tools is a company stock; each tool mends TOOLPTS points. */
function armorCond(m){const a=ITEMS[m.eq.a],h=ITEMS[m.eq.h],c=m.cond||{},aMax=a?a.arm:0,hMax=h?h.arm:0,f=(v,mx)=>typeof v==='number'&&isFinite(v)?clamp(Math.round(v),0,mx):mx;
 return{a:f(c.a,aMax),aMax,h:f(c.h,hMax),hMax}}
function setArmorCond(m,a,h){const c=armorCond(m);a=clamp(Math.round(a),0,c.aMax);h=clamp(Math.round(h),0,c.hMax);
 if(a>=c.aMax&&h>=c.hMax){delete m.cond;return}m.cond={};if(a<c.aMax)m.cond.a=a;if(h<c.hMax)m.cond.h=h}
// Armor points missing across the company and the tools it would take: {pts,tools}.
function repairNeed(){let pts=0;if(G&&G.roster)for(const m of G.roster){const c=armorCond(m);pts+=c.aMax-c.a+c.hMax-c.h}return{pts,tools:Math.ceil(pts/TOOLPTS)}}
/* repairAll(maxTools?): mends armor and helmets from G.tools, fielded mercs and the worst damage first.
   Returns {tools (used), pts (mended), left (points still missing), list:[{name,pts}]}. Uses no randomness. */
function repairAll(maxTools){const have=Math.max(0,Math.floor(typeof G.tools==='number'&&isFinite(G.tools)?G.tools:0)),use=typeof maxTools==='number'?clamp(Math.floor(maxTools),0,have):have;
 let pool=use*TOOLPTS,pts=0;const list=[],dmg=m=>{const c=armorCond(m);return c.aMax-c.a+c.hMax-c.h};
 const order=G.roster.map((m,i)=>({m,i,d:dmg(m)})).filter(x=>x.d>0).sort((x,y)=>(y.m.field?1:0)-(x.m.field?1:0)||y.d-x.d||x.i-y.i);
 for(const {m} of order){if(pool<=0)break;const c=armorCond(m),na=Math.min(c.aMax-c.a,pool);pool-=na;const nh=Math.min(c.hMax-c.h,pool);pool-=nh;
  if(na+nh>0){setArmorCond(m,c.a+na,c.h+nh);pts+=na+nh;list.push({name:m.name,pts:na+nh})}}
 const tools=Math.ceil(pts/TOOLPTS);G.tools=have-tools;return{tools,pts,left:repairNeed().pts,list}}

/* ---- Injuries ---- */
function hasInjury(m,id){return Array.isArray(m.inj)&&m.inj.some(j=>j.id===id)}
// Adds injury id to the merc (days: healing time, ignored for permanent ones). Returns the record, or null if it is unknown or already carried.
function addInjury(m,id,days){const I=INJ[id];if(!I||hasInjury(m,id))return null;if(!Array.isArray(m.inj))m.inj=[];
 const j={id,days:I.perm?-1:Math.max(1,Math.round(typeof days==='number'?days:I.days[0]))};m.inj.push(j);return j}
// Rolls a fresh injury (seeded): head or body by where the blow fell, permanent or not. Returns its id, or null when nothing new fits.
function rollInjury(m,head,perm,slow){const have=id=>hasInjury(m,id),all=Object.keys(INJ).filter(id=>!!INJ[id].perm===!!perm&&!have(id));
 let pool=all.filter(id=>INJ[id].loc===(head?'h':'b'));if(!pool.length)pool=all;if(!pool.length)return null;
 const id=pick(pool),I=INJ[id];return addInjury(m,id,I.perm?-1:Math.round(ri(I.days[0],I.days[1])*(slow?1.5:1)))?id:null}
/* healInjuriesDaily(): one day of healing for the whole roster. Call once from newDay().
   Returns the injuries that healed today: [{m, name, id, n}]. Uses no randomness. */
function healInjuriesDaily(){const out=[];if(!G||!Array.isArray(G.roster))return out;
 for(const m of G.roster){if(!Array.isArray(m.inj)||!m.inj.length)continue;
  m.inj=m.inj.filter(j=>{if(j.days<0)return true;if(--j.days>0)return true;out.push({m,name:m.name,id:j.id,n:INJ[j.id]?INJ[j.id].n:j.id});return false});
  const mx=calc(m).hp;if(m.hp>mx)m.hp=mx}
 return out}
// Temple price in crowns for treating one injury, or null when it cannot be treated (permanent, or not carried).
function injuryCost(m,id){const j=Array.isArray(m.inj)&&m.inj.find(j=>j.id===id);if(!j||j.days<0||!INJ[id]||INJ[id].perm)return null;return 40+20*Math.max(1,j.days)}
// Pays injuryCost and removes the injury. Returns true when treated; false (nothing changes) when it cannot be treated or paid for.
function treatInjury(m,id){const cost=injuryCost(m,id);if(cost==null||!(G.crowns>=cost))return false;G.crowns-=cost;m.inj=m.inj.filter(j=>j.id!==id);return true}
