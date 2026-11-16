/* ================= TWIN BLADES: the dual-wield abilities and the off-hand blows =================
   The tree is MAST.dualwield in 10-data.js (perk ids pinned: dualwield.1-6; capstone in 25-legend.js). The off-hand rules (which weapons,
   the untrained penalty) are in 11w-dualwield.js; calc() (30-mercs.js) gives a merc s.dw, a battle unit carries it as u.dw (mkMercUnit,
   swapWeapons: only beside a one-handed melee weapon in hand). The core reads: a.dual (needs u.dw: canUse / useBlock 'Needs a weapon in
   each hand'), u.dw in isDuel and a.offhand (a hand holding a blade is not free), and a.dwOff / a.dwSeq in useAbility, which calls
   dwFollow(u, t, a) after the ability's own strike (60-battle-core.js).
   Every off-hand blow is a strike() of its own, with u.wpn set to the off-hand weapon for that one blow and put back afterwards, so
   hitChance, the damage, the bleed and the forecast are the core's (test/forecast.js wraps every one of them). This file holds:
     the abilities (AB): twinstrike (main then off hand), dwfeint (the off hand feints, the main hand cuts: +20 to hit, bleeds), bladeflurry
       (main, off, main at 75%)
     a.dwSeq: [[hand 'm'|'o', mult, hit], ...] the blows of a sequence; the first is the ability's own strike (its mult and hit), the rest
       follow while the foe stands next to the striker. a.dwOff {mult, hit}: the off-hand blow after an Attack (abilityInfo wrapper: set on
       'attack' for a unit with a weapon in each hand, whose fatigue then also carries DW.atkFat of the off-hand weapon's)
     dwStepAb(u, a, hand, mult, hit): the ability object of one blow (an off-hand blow adds the capstone's dwOffDmg / dwOffHit)
     forecast() wrapper: f.off = the forecast of the next off-hand blow ({n, hit, dmgMin..armMax, kill, sure, mult}) for the HUD
     dwAiExtra(u, a, t, S): what the off-hand blows of a are worth to the AI (63-ai.js adds it to the ability's value)
   Randomness: none of its own; every roll is strike()'s. */
/* ---- abilities ---- */
Object.assign(AB,{
 twinstrike:{n:'Twin strike',ap:5,fat:13,tgt:'enemy',wpn:1,dual:1,mult:1,hit:10,noBow:1,fx:'multi',dwSeq:[['m',1,10],['o',1,10]],
  d:'With a weapon in each hand: strike with both. The main hand at 100% damage and +10 to hit, then, if the foe still stands, the off hand at 100% of its weapon’s damage and +10 to hit.'},
 dwfeint:{n:'Feint and cut',ap:4,fat:12,tgt:'enemy',wpn:1,dual:1,mult:1,hit:20,bleed:3,noBow:1,fx:'slash',
  d:'With a weapon in each hand: the off-hand blade feints, the main hand cuts. 100% damage, +20 to hit, and a wound that reaches flesh bleeds for 3 turns.'},
 bladeflurry:{n:'Blade flurry',ap:6,fat:20,tgt:'enemy',wpn:1,dual:1,mult:.75,hit:5,noBow:1,fx:'multi',dwSeq:[['m',.75,5],['o',.75,5],['m',.75,5]],
  d:'With a weapon in each hand: three quick blows, main hand, off hand, main hand, at 75% damage and +5 to hit each, while the foe stands.'}});
/* ---- one blow ---- */
function dwStepAb(u,a,h,mult,hit){const f=u&&u.flags||{};
 if(h!=='o')return Object.assign({},a,{id:a.id+'#m',mult,hit,dwSeq:null,dwOff:null,dwStep:1});
 return{id:a.id+'#o',n:'Off-hand blow',wpn:1,melee:1,noBow:1,mult:mult*(1+(f.dwOffDmg||0)),hit:hit+(f.dwOffHit||0),fx:'stab',dwStep:1,dwHand:'o'}}
// The blows that follow the ability's own strike: [[hand, mult, hit], ...]
function dwRest(a){if(Array.isArray(a.dwSeq))return a.dwSeq.slice(1);if(a.dwOff)return[['o',a.dwOff.mult,a.dwOff.hit]];return[]}
// Runs fn() with the off-hand weapon in u's hand (sync or async), and puts the main weapon back.
function dwWith(u,fn){const w0=u.wpn;u.wpn=u.dw;let r;try{r=fn()}catch(e){u.wpn=w0;throw e}if(r&&typeof r.then==='function')return r.then(x=>{u.wpn=w0;return x},e=>{u.wpn=w0;throw e});u.wpn=w0;return r}
async function dwBlow(u,t,a,h,mult,hit){const st=dwStepAb(u,a,h,mult,hit);if(h!=='o')return strike(u,t,st);
 if(B&&typeof FX==='object')FX.emit('offhand',{u,t,w:u.dw});return dwWith(u,()=>strike(u,t,st))}
async function dwFollow(u,t,a){const b=B;for(const [h,mult,hit] of dwRest(a)){if(B!==b||!t.alive||!u.alive||!u.dw||u.mor===0||mdist(u,t)>1)break;await dwBlow(u,t,a,h,mult,hit)}}
/* ---- the Attack of a unit with a weapon in each hand: the off-hand blow follows, and the off-hand weapon's weight adds to the fatigue ---- */
if(typeof abilityInfo==='function'&&!abilityInfo.dw){const ai0=abilityInfo;abilityInfo=function(u,id){const a=ai0(u,id);
  if(id==='attack'&&u&&u.dw&&u.wpn&&!isRangedW(u.wpn)&&(u.wpn.rng||1)<=1){const F=dwFollowOf(u.flags);a.dwOff={mult:F.mult,hit:F.hit};a.fat=(a.fat||0)+Math.ceil((u.dw.fat||0)*DW.atkFat)}
  return a};abilityInfo.dw=1}
/* ---- the forecast: the next off-hand blow, for the HUD (the main figures stay the ability's own strike) ---- */
function dwOffFc(u,t,a){if(!u||!u.dw||!t||a.dwStep||mdist(u,t)>1)return null;const s=dwRest(a).find(x=>x[0]==='o');if(!s)return null;const st=dwStepAb(u,a,'o',s[1],s[2]);
 const f=dwWith(u,()=>dwFc0(u,t,st));if(!f)return null;return{n:u.dw.n||'Off hand',id:u.dw.id||null,hit:f.hit,dmgMin:f.dmgMin,dmgMax:f.dmgMax,hpMin:f.hpMin,hpMax:f.hpMax,armMin:f.armMin,armMax:f.armMax,kill:f.kill,sure:f.sure,mult:st.mult}}
let dwFc0=null;
if(typeof forecast==='function'&&!forecast.dw){dwFc0=forecast;forecast=function(u,t,a,o){const f=dwFc0(u,t,a,o);if(!o&&a&&(a.dwOff||a.dwSeq)&&f){const x=dwOffFc(u,t,a);if(x)f.off=x}return f};forecast.dw=1}
/* ---- the AI: what the off-hand blows add (each at its own chance, from where the unit stands) ---- */
function dwAiExtra(u,a,t,S){if(!u||!u.dw||!(a.dwOff||a.dwSeq)||typeof aiHit!=='function')return 0;let v=0;
 for(const [h,mult,hit] of dwRest(a)){const st=dwStepAb(u,a,h,mult,hit),f=()=>{const H=aiHit(u,st,t,S);return hitChance(u,t,st)/100*(H.v+H.kill*H.kv*.5)};v+=h==='o'?dwWith(u,f):f()}
 return v}
