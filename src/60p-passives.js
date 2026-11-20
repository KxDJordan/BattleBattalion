/* ================= PASSIVES: the masteries update (rules) =================
   The trees (MAST in 10-data.js) traded most of their abilities for passives with mechanics of their own; firearms and throwing weapons
   got trees of their own (Gunnery 'gunner', Throwing arms 'thrower') and throwing weapons a family ('throwing', 11t-arms.js). Every rule
   here is a term or a hook the core calls (60-battle-core.js), so the hit chance, the damage and the forecast stay one computation:
     pvHit(u,t,a,d,melee)   to-hit terms of the attacker's and the defender's perks            (inside hitChance)
     pvSure(u,a)            the attack cannot miss (Deadly arc)                                (inside hitChance: 100)
     pvDmg(u,t,a,melee)     damage share of the attacker's perks                               (inside dmgBonus)
     pvDr(u,t,a)            damage the defender's perks take off                               (inside drOf)
     pvIgn(u,a) / pvCrush(u,a)  armor piercing and armor crushing                              (inside ignOf / crushOf)
     pvBleed(u,a)           turns of bleeding a hit that reaches hitpoints leaves (shuriken, an off-hand Opening cut)  (inside bleedOf)
     pvStatus(u,t,a,o,hpd,head,hp0,st)  statuses a hit adds (strike(); the chance ones draw rnd() only for a bearer, in a fixed order)
     pvFcStatus(...)        the same statuses for forecast(), with their chances
   and the hooks with no part in a single blow's numbers:
     pvStruck(u,t,a,o)      after every strike is settled, hit or miss: what the bearers count (attacks on a foe, first blow, Afterimage)
     pvHitDone(u,t,a,o,hpd) after a hit: Press the attack's target, Blade dance / Flowing strikes, Unstoppable fury, Runic recall, Static charge,
                            Whirling steel
     pvMiss(u,t,a,o,v)      after a miss: Unmoved (+1 AP), Shield bind (Off balance), Counter-cut (a chance free attack), Ricochet, the chakram
     pvKill(u,t,a,o)        after a kill: Follow-through, Overpenetration, Seize the moment, Thumbs down, Spell echo, Recover throws
     pvFreeAb(e,why)        the ability object of a free attack (Clinch: +to hit on a foe stepping away; Gale-touched: knockback)
     pvTurn(u)              start of u's turn (after the chill): resets the per-turn counts, Hobbled, Battle aura, Steadying voice, Field
                            triage, Shared breath
     pvPay(u,a)             when an ability is paid for: throws spent, a twin barrel, Draw and loose, Powder smoke
     pvAbInfo(u,a)          the ability as offered: Draw and loose (1 AP less), the throwing range bonus
     pvAngel(t)             a Guardian angel stands ready for t (inside canUndy and hurt)
   Unit state (all reset or counted here; the forecast only reads it): lastHit (id of the foe last hit in melee), chainN (melee hits this
   turn), mvN (tiles moved this turn), fury (hits taken, Unstoppable fury), hitBy ([ids] that attacked u since its last turn), atkN ({id: n}
   attacks u made on that foe), sfDone (u has attacked this battle), dArc (u has thrown this battle), aimg (an attack came at u since its
   turn), wsN (off-hand hits this turn), smoke (u fired a gun this turn), umvN (AP Unmoved gave this round), chg (Static charge), echoT,
   shotT (u shot a bow this turn), hrun (Hit and run ready), angU (a Guardian angel spent), am {weapon key: throws or barrels left}.
   The throwing gifts (mana_t aura_t qi_t chi_t, 10-data.js): a.conj (a conjured blade: no throw spent, usable with none left: outOfThrows,
   pvPay); to hit stillHit (throws, not moved this turn); damage hexDmg (throws at a marked foe), hurlAdj (throws, per foe next to the thrower),
   stormDmg (throws at a burning, chilled or dazed foe), bleedDmg (throws and melee blows at a bleeding foe); statuses frostThrow (chill),
   thawBurn (burn on a chilled foe), hurlOff (off balance: Aura throws), hamThrow (hobbled); hooks retRune (pvMiss: a missed throw comes back),
   hurlSplit (pvHitDone: the shield is struck too), hexKill (pvKill: a marked foe slain by a throw gives a throw and Mana back), breathAm (pvTurn:
   Chi calls a spent throw back).
   Randomness: only rnd(), and only where a bearer's chance is rolled. */
const PV={armDmgMax:.25,chainMax:3,momStep:2,momMax:3,furyMax:5,readMax:3,crowdMax:3,gunR:2,gunMax:3,missAP:2,wsMax:3,chgMax:2,resPer:10,resMax:6,
 sfHit:15,arcDmg:.25,angelR:3,seizeR:4,steadyR:3,pbR:2,farD:4,hobble:2,echoMax:1};
const isThrowW=w=>!!w&&w.wt==='throwing';
const isGunW=w=>!!w&&w.wt==='flintlock';
const isFistW=w=>!w||w.wt==='fist';
const isBowW=w=>!!w&&(w.wt==='bow'||w.wt==='crossbow');
const pvRng=(u,a)=>isRangedAtk(u,a)&&!a.magic;                                   // a weapon shot or throw (not a spell)
const pvAura=(a,k)=>!!(a&&a.cost&&a.cost[0]===k);
const pvOff=(u,a)=>!!(a&&a.dwHand==='o'&&u.dw&&u.wpn===u.dw);                    // an off-hand blow (64w-dualwield.js)
// allies of u within PV.gunR tiles with a firearm in hand (Gunline), at most PV.gunMax
function gunMates(u){let n=0;if(!B)return 0;const mx=PV.gunMax+((u.flags&&u.flags.lineMax)||0);for(const o of B.units)if(o.alive&&o!==u&&o.side===u.side&&isGunW(o.wpn)&&mdist(o,u)<=PV.gunR&&++n>=mx)break;return n}   // Fire by ranks (Musketry's capstone): one more
// foes next to x beyond the first (Surrounded by glory), at most PV.crowdMax
function crowdN(x){let n=0;if(!B)return 0;for(const o of B.units)if(o.alive&&o.side!==x.side&&mdist(o,x)===1)n++;return Math.min(PV.crowdMax,Math.max(0,n-1))}
/* ---- throws and barrels: u.am[wkey(w)] ---- */
function ammoMax(u,w){if(!w)return 0;if(w.ammo)return w.ammo+((u&&u.flags&&u.flags.ammoB)||0);if(w.barrels>1)return w.barrels;return 0}
function ammoLeft(u,w){w=w||u.wpn;if(!w||!(w.ammo||w.barrels>1))return null;const k=wkey(w),L=u.am;return L&&typeof L[k]==='number'?L[k]:ammoMax(u,w)}
function setAmmo(u,n,w){w=w||u.wpn;u.am=Object.assign({},u.am);u.am[wkey(w)]=clamp(n,0,ammoMax(u,w))}   // a fresh object: AI look-aheads restore u by a shallow copy
const outOfThrows=(u,a)=>!!(u.wpn&&u.wpn.ammo&&!(a&&a.conj)&&isRangedAtk(u,a)&&ammoLeft(u)<((a&&a.ammoN)||1));   // a conjured blade (Hexed blades) needs none
function pvSure(u,a){const f=u.flags;return!!(f&&f.deadArc&&!u.dArc&&isThrowW(u.wpn)&&pvRng(u,a))}
/* ---- the numbers of one blow ---- */
function pvHit(u,t,a,d,melee){const f=u.flags||{},g=t.flags||{};let v=0;
 if(!a.magic){
  if(melee){if(f.pressHit&&u.lastHit===t.id)v+=f.pressHit;if(f.chainHit&&u.chainN>0)v+=f.chainHit*Math.min(PV.chainMax,u.chainN);if(f.sfHit&&!u.sfDone&&isLightW(u.wpn))v+=f.sfHit;
   if(f.chargeHit&&rlCharge(u))v+=f.chargeHit;if(f.isoHit&&isDuel(u,a)&&rlIso(t))v+=f.isoHit;if(f.mixHit&&rlMix(u,'t'))v+=f.mixHit}
  if(f.shakenHit&&rlShaken(t))v+=f.shakenHit;
  if(pvRng(u,a)){if(f.mvShot&&u.mvd&&u.wpn.wt==='bow')v+=f.mvShot;if(f.holdHit&&!u.mvd)v+=f.holdHit;if(f.primeHit&&u.primed&&isGunW(u.wpn))v+=f.primeHit;if(f.mixHit&&isThrowW(u.wpn)&&rlMix(u,'m'))v+=f.mixHit;if(f.stillHit&&isThrowW(u.wpn)&&!u.mvd)v+=f.stillHit}
  if(f.payHit&&u.hitBy&&u.hitBy.includes(t.id))v+=f.payHit;
  if(f.readOpp&&u.atkN&&u.atkN[t.id])v+=f.readOpp*Math.min(PV.readMax,u.atkN[t.id]);
  if(f.oppHit&&t.aoo)v+=f.oppHit;
  if(pvAura(a,'aura')&&f.auraHit)v+=f.auraHit;
  if(isGunW(u.wpn)&&pvRng(u,a)){const pis=!u.wpn.two;if(f.gunPBHit&&pis&&d<=gtPbR(u))v+=f.gunPBHit;if(f.gunSteady&&!u.mvd)v+=f.gunSteady;if(f.gunLine)v+=f.gunLine*gunMates(u);
   if(pis){if(f.runHit&&t.mvd)v+=f.runHit;if(f.paceHit&&gtPace(u,t))v+=f.paceHit}}   // the Pistolier (64u-guntrees.js): Arm's length, Wing the runner, Ten paces
  if(u.wpn&&u.wpn.brace&&u.mvd&&pvRng(u,a))v-=u.wpn.brace}                             // the wall gun: fired after moving
 if(g.afterImg&&!t.aimg)v-=g.afterImg;
 if(!a.magic){if(g.holdDef&&!t.mvd)v-=g.holdDef;if(g.mvDef&&t.mvd)v-=g.mvDef;if(g.duelDef&&melee&&isDuel(t,FREEAB))v-=g.duelDef}
 if(!melee){if(g.smokeDef&&t.smoke&&!a.magic)v-=g.smokeDef;if(g.farDef&&d>=PV.farD)v-=g.farDef}
 else if(!a.magic){if(g.dwFlow&&t.wsN>0)v-=g.dwFlow*Math.min(PV.wsMax,t.wsN);if(g.crowdDef)v-=g.crowdDef*crowdN(t);if(g.smokeMel&&t.smoke)v-=g.smokeMel}   // Veil of smoke (the Gunsmoke Saint)
 return v}
function pvDmg(u,t,a,melee){const f=u.flags||{};let x=0;
 if(melee){if(f.pressDmg&&u.lastHit===t.id)x+=f.pressDmg;if(f.flowDmg&&u.chainN>0)x+=f.flowDmg*Math.min(PV.chainMax,u.chainN);if(f.sfDmg&&!u.sfDone&&isLightW(u.wpn))x+=f.sfDmg;
  if(f.koDmg&&isFistW(u.wpn))x+=f.koDmg;if(f.crowdDmg)x+=f.crowdDmg*crowdN(u);
  if(f.chargeDmg&&rlCharge(u))x+=f.chargeDmg;if(f.isoDmg&&isDuel(u,a)&&rlIso(t))x+=f.isoDmg;if(f.mixDmg&&rlMix(u,'t'))x+=f.mixDmg;
  if(f.armDmg&&u.hitBy&&u.hitBy.includes(t.id))x+=Math.min(PV.armDmgMax,f.armDmg*Math.floor((u.arm||0)/10))}
 if(f.shakenDmg&&rlShaken(t))x+=f.shakenDmg;
 if(f.momentum&&u.mvN>=PV.momStep)x+=f.momentum*Math.min(PV.momMax,Math.floor(u.mvN/PV.momStep));
 if(f.furyHit&&u.fury>0)x+=f.furyHit*Math.min(PV.furyMax,u.fury);
 if(f.payDmg&&u.hitBy&&u.hitBy.includes(t.id))x+=f.payDmg;
 if(f.oppDmg&&t.aoo)x+=f.oppDmg;
 if(f.manaDmg&&u.res&&u.res.mana)x+=f.manaDmg*Math.min(PV.resMax,Math.floor(u.res.mana.cur/PV.resPer));
 if(pvRng(u,a)){if(f.staticChg&&u.chg>=PV.chgMax&&u.wpn.wt==='bow')x+=f.staticChg;
  if(isGunW(u.wpn)){const pis=!u.wpn.two;if(f.gunPB&&pis&&mdist(u,t)<=gtPbR(u))x+=f.gunPB;if(f.gunLineD)x+=f.gunLineD*gunMates(u);if(f.rollV)x+=f.rollV*gtRolled(t);
   if(pis){if(f.runDmg&&t.mvd)x+=f.runDmg;if(f.paceDmg&&gtPace(u,t))x+=f.paceDmg}if(f.blastDmg&&a.id==='blast')x+=f.blastDmg}   // the gun trees (64u-guntrees.js)
  if(f.deadArc&&!u.dArc&&isThrowW(u.wpn))x+=PV.arcDmg;
  if(f.bowDmg&&isBowW(u.wpn))x+=f.bowDmg;if(f.holdDmg&&!u.mvd)x+=f.holdDmg;if(f.primeDmg&&u.primed&&isGunW(u.wpn))x+=f.primeDmg;if(f.mixDmg&&isThrowW(u.wpn)&&rlMix(u,'m'))x+=f.mixDmg;
  if(isThrowW(u.wpn)){const s=t.st||{};if(f.hexDmg&&s.marked>0)x+=f.hexDmg;if(f.hurlAdj)x+=f.hurlAdj*Math.min(PV.crowdMax,adjFoes(u).length);if(f.stormDmg&&(s.burn>0||s.chill>0||s.daze>0))x+=f.stormDmg}}   // the throwing gifts
 if(f.bleedDmg&&!a.magic&&t.st&&t.st.bleed>0&&(melee||(isThrowW(u.wpn)&&pvRng(u,a))))x+=f.bleedDmg;   // Open the wound (Still hand)
 return x}
function pvDr(u,t,a){const g=t.flags||{};let dr=0;if(g.manaWard&&t.res&&t.res.mana&&t.res.mana.cur>=t.res.mana.max/2)dr+=g.manaWard;if(B&&B.shelOn)dr+=shelterOf(t);return dr}
function pvIgn(u,a){const f=u.flags||{};let x=0;if(f.gunIgn&&isGunW(u.wpn)&&pvRng(u,a))x+=f.gunIgn;if(f.blastIgn&&gtBlast(u,a))x+=f.blastIgn;if(f.auraIgn&&pvAura(a,'aura'))x+=f.auraIgn;if(f.twoIgn&&rlTwo(u,a))x+=f.twoIgn;return x}
function pvCrush(u,a){const f=u.flags||{};let x=0;if(f.gunCrush&&isGunW(u.wpn)&&pvRng(u,a))x+=f.gunCrush;if(f.auraCrush&&pvAura(a,'aura'))x+=f.auraCrush;if(f.twoCrush&&rlTwo(u,a))x+=f.twoCrush;return x}
function pvBleed(u,a){const f=u.flags||{};let n=0;if(a.wpn&&!a.magic&&u.wpn&&u.wpn.bleed)n=u.wpn.bleed;if(f.dwBleed&&pvOff(u,a))n=Math.max(n,f.dwBleed);return n}
/* the statuses a hit adds. Certain ones first, then the chances, each one rnd() drawn only when its bearer qualifies (strike order) */
function pvStCases(u,t,a,melee,shot,hp){const f=u.flags||{},w=u.wpn||{},L=[];   // [key, turns, kind: 1 any hit | 'hp' reaching hitpoints | 'head' a head hit, chance]
 if(a.magic){if(f.spellBurn)L.push(['burn',f.spellBurn,1,1]);return L}
 if(w.wst&&pvRng(u,a))for(const k in w.wst)L.push([k,w.wst[k],1,1]);                   // bolas: they wrap the legs
 if(f.hobbleShot&&isBowW(w)&&pvRng(u,a))L.push(['hobbled',1,'hp',1]);
 if(f.koDmg&&isFistW(w)&&melee)L.push(['stun',1,'head',1]);
 if(f.doomHurt&&melee&&isLightW(w)&&hp<t.hpMax/2)L.push(['doomed',f.doomHurt,'hp',1]);
 if(f.auraDaze&&pvAura(a,'aura')&&shot)L.push(['daze',1,1,1]);
 if(f.qiDaze&&pvAura(a,'qi'))L.push(['daze',1,1,1]);
 if(f.staticChg&&u.chg>=PV.chgMax&&w.wt==='bow'&&pvRng(u,a))L.push(['daze',1,1,1]);
 if(f.ppHead&&pvRng(u,a))L.push(['weak',f.ppHead,'head',1]);
 if(f.fistDaze&&isFistW(w)&&melee)L.push(['daze',1,1,f.fistDaze]);
 if(f.cheapBlind&&melee&&isLightW(w))L.push(['blinded',1,1,f.cheapBlind]);
 if(f.bindRoot&&w.wt==='bow'&&pvRng(u,a))L.push(['root',1,'hp',f.bindRoot]);
 if(f.chillCh&&a.wpn)L.push(['chill',1,'hp',f.chillCh]);
 if(f.suppress&&isBowW(w)&&pvRng(u,a))L.push(['suppr',1,1,1]);                         // the roles update (64v-roles.js)
 if(f.spotMark&&pvRng(u,a))L.push(['marked',1,'hp',1]);
 if(f.twoDaze&&melee&&w.two&&!isRangedW(w))L.push(['daze',1,'hp',f.twoDaze]);
 if(f.arrowBurn&&w.wt==='bow'&&pvRng(u,a))L.push(['burn',2,'hp',f.arrowBurn]);
 if(f.blastBurn&&gtBlast(u,a))L.push(['burn',f.blastBurn,1,1]);   // Wildfire (Grenadier, 64u-guntrees.js)
 if(isThrowW(w)&&pvRng(u,a)){   // the throwing gifts (after every older case, so their rnd() order is unchanged)
  if(f.thawBurn&&t.st&&t.st.chill>0)L.push(['burn',f.thawBurn,1,1]);if(f.hurlOff&&pvAura(a,'aura'))L.push(['offbal',1,1,1]);
  if(f.frostThrow)L.push(['chill',1,'hp',f.frostThrow]);if(f.hamThrow)L.push(['hobbled',1,'hp',f.hamThrow])}
 return L}
function pvStatus(u,t,a,o,hpd,head,hp0,st,R){const melee=!!a.melee||mdist(u,t)<=1,shot=shotKind(u,t,a)===2;
 for(const [k,n,kind,ch] of pvStCases(u,t,a,melee,shot,hp0)){if(kind==='hp'&&!(hpd>0))continue;if(kind==='head'&&!head)continue;if(ch<1){const x=rnd();if(typeof rollAdd==='function')rollAdd(R,k,x,ch,x<ch);if(!(x<ch))continue}st[k]=Math.max(st[k]||0,n)}}
// forecast: the same cases with their odds (pch: chance a hit reaches hitpoints; hc: head chance in percent, 0 when nothing lands)
function pvFcStatus(u,t,a,st,pch,hc){const melee=!!a.melee||mdist(u,t)<=1,shot=shotKind(u,t,a)===2;
 for(const [k,n,kind,ch] of pvStCases(u,t,a,melee,shot,t.hp)){const p=(kind==='hp'?pch:kind==='head'?hc/100:1)*ch;if(!(p>0))continue;const S=st[k];
  if(!S)st[k]={k,n,ch:p};else{if(n>S.n)S.n=n;S.ch=1-(1-S.ch)*(1-p)}}}
/* ---- hooks ---- */
function pvStruck(u,t,a,o){if(!u||!t||o.stray)return;const f=u.flags||{};
 if(t.flags&&t.flags.afterImg)t.aimg=1;
 if(t.flags&&(t.flags.payHit||t.flags.payDmg||t.flags.armDmg)&&u.side!==t.side){const L=Array.isArray(t.hitBy)?t.hitBy:[];if(!L.includes(u.id))t.hitBy=L.concat([u.id])}
 if(f.readOpp&&!a.magic){u.atkN=Object.assign({},u.atkN);u.atkN[t.id]=(u.atkN[t.id]||0)+1}
 if(f.sfHit||f.sfDmg)u.sfDone=1;
 if(f.deadArc&&isThrowW(u.wpn)&&pvRng(u,a))u.dArc=1;
 rlStruck(u,t,a,o)}
function pvHitDone(u,t,a,o,hpd){const f=u.flags||{},melee=!!a.melee||mdist(u,t)<=1;if(o.stray)return;gtHitDone(u,t,a,o,hpd);   // the gun trees: Rolling volley's count, a Petard on a shield (64u-guntrees.js)
 if(!a.magic){
  if(melee&&f.pressHit)u.lastHit=t.id;
  if(melee&&(f.chainHit||f.flowDmg)&&B&&B.cur===u)u.chainN=(u.chainN||0)+1;
  if(f.manaHit&&a.wpn&&u.res&&u.res.mana){const R=u.res.mana;if(R.cur<R.max){R.cur=Math.min(R.max,R.cur+f.manaHit);float(u,'+'+f.manaHit+' '+(RESN.mana||'Mana'),RESC.mana||'#9ab8ff')}}
  if(f.staticChg&&u.wpn&&u.wpn.wt==='bow'&&pvRng(u,a))u.chg=u.chg>=PV.chgMax?0:(u.chg||0)+1;
  if(f.dwFlow&&pvOff(u,a))u.wsN=Math.min(PV.wsMax,(u.wsN||0)+1);
  if(f.hurlSplit&&t.shield&&t.alive&&u.side!==t.side&&isThrowW(u.wpn)&&pvRng(u,a))damageShield(t,Math.max(1,Math.round(u.wpn.d[1]*f.hurlSplit)),u)}   // Shieldbreaker (Aura hurling)
 const g=t.flags||{};if(g.furyHit&&hpd>0&&t.alive&&u.side!==t.side)t.fury=Math.min(PV.furyMax,(t.fury||0)+1)}
// Counter (a miss in melee): the one draw, recorded on the miss's roll line
function rollCounter(R,ch){const x=rnd();if(typeof rollAdd==='function')rollAdd(R,'counter',x,ch,x<ch);return x<ch}
async function pvMiss(u,t,a,o,v,R){if(!u||!t||o.stray)return;const b=B,g=t.flags||{},melee=!a.magic&&mdist(u,t)===1;
 if(melee&&!o.free&&t.alive&&u.side!==t.side){
  if(g.missAP&&(t.umvN||0)<PV.missAP){t.umvN=(t.umvN||0)+1;t.bonusAP=(t.bonusAP||0)+g.missAP;float(t,'+'+g.missAP+' AP','#ffd27a')}
  if(g.bindOff&&t.shield&&u.alive)addStatus(u,'offbal',1)}
 if(melee&&!o.free&&g.counter&&t.alive&&u.alive&&!buffSum(t,'rip')&&isDuel(t,FREEAB)&&canFree(t)&&rollCounter(R,g.counter)){await freeAttack(t,u,'counter');if(B!==b)return}
 const f=u.flags||{};
 if(isThrowW(u.wpn)&&pvRng(u,a)&&!v){
  if((u.wpn.ret||f.retRune)&&u.alive&&!a.conj){setAmmo(u,ammoLeft(u)+(a.ammoN||1));float(u,'Returns','#e9e0c9')}      // the chakram flies back; Homing runes (Hexed blades)
  if(f.ricochet&&!o.ric&&!o.free&&u.alive){const n=b.units.filter(x=>x.alive&&x!==t&&x.side!==u.side&&mdist(x,t)===1).sort((x,y)=>mdist(x,u)-mdist(y,u)||x.id-y.id)[0];
   if(n){FX.shot(t,n,'#e9e0c9',22,22);say(`${u.name}'s throw glances off into ${n.name}.`);await strike(u,n,a,{splash:f.ricochet,auto:1,noShot:1,ric:1})}}}}
async function pvKill(u,t,a,o){if(!u||!u.alive||o.stray)return;const b=B,f=u.flags||{},melee=!!a.melee||mdist(u,t)<=1;gtKill(u,t,a,o);   // Saint of gunsmoke: a kill reloads (64u-guntrees.js)
 if(f.seizeAP){const n=b.units.filter(x=>x.alive&&x!==u&&x.side===u.side&&!x.gone&&mdist(x,u)<=PV.seizeR).sort((x,y)=>mdist(x,u)-mdist(y,u)||x.id-y.id)[0];
  if(n){n.bonusAP=(n.bonusAP||0)+f.seizeAP;float(n,'+'+f.seizeAP+' AP','#ffd27a');FX.emit('buff',{t:n})}}
 if(f.pinKillAP&&b.cur===u&&(t.st.netted>0||t.rooted||t.st.root>0||t.st.webbed>0)){u.ap+=f.pinKillAP;float(u,'+'+f.pinKillAP+' AP','#ffd27a');FX.emit('buff',{t:u})}
 if(f.echo&&a.magic&&a.cost&&b.cur===u&&!u.echoT&&u.res[a.cost[0]]){const R=u.res[a.cost[0]];u.echoT=1;R.cur=Math.min(R.max,R.cur+a.cost[1]);float(u,'Spell echo','#c9a8ff')}
 if(f.recover&&!a.conj&&isThrowW(u.wpn)&&pvRng(u,a)&&ammoLeft(u)<ammoMax(u,u.wpn)){setAmmo(u,ammoLeft(u)+1);float(u,'Throw recovered','#e9e0c9')}
 if(f.hexKill&&isThrowW(u.wpn)&&pvRng(u,a)&&t.st&&t.st.marked>0){if(ammoLeft(u)<ammoMax(u,u.wpn))setAmmo(u,ammoLeft(u)+1);const R=u.res&&u.res.mana;if(R&&R.cur<R.max)R.cur=Math.min(R.max,R.cur+f.hexKill);float(u,'Soul-drinker','#c9a8ff')}   // Hexed blades
 if(f.follow&&melee&&!a.magic&&u.wpn.two&&!isRangedW(u.wpn)&&!o.follow){const n=b.units.filter(x=>x.alive&&x.side!==u.side&&mdist(x,u)===1).sort((x,y)=>x.hp-y.hp||x.id-y.id)[0];
  if(n){say(`${u.name} follows through into ${n.name}.`);await strike(u,n,FREEAB,{splash:f.follow,follow:1,free:'follow'});if(B!==b)return}}
 if(f.overpen&&!o.op&&!a.magic&&pvRng(u,a)&&shotKind(u,t,a)===2){const n=lineBeyond(u,t,1)[0];
  if(n&&n.alive){FX.shot(t,n,'#e9e0c9',22,22);await strike(u,n,a,{splash:f.overpen,noShot:1,op:1})}}}
// Arcing spells: a spell that hit arcs on to the nearest other foe within 3 tiles of its target (ties: the lower id), auto, no projectile
async function pvArc(u,t,a){const b=B,n=b.units.filter(x=>x.alive&&x!==t&&x.side!==u.side&&mdist(x,t)<=3).sort((x,y)=>mdist(x,t)-mdist(y,t)||x.id-y.id)[0];
 if(!n)return;FX.shot(t,n,'#c9a8ff',22,22);await strike(u,n,a,{splash:u.flags.spellArc,auto:1,noShot:1,arc:1})}
// Empowering touch / Quickening (Inner flow): whoever u heals
function pvHealed(u,t){const f=u&&u.flags;if(!f||!t||!t.alive)return;if(f.healBuff){addBuff(t,{key:'touched',ms:f.healBuff,rs:f.healBuff},2);FX.emit('buff',{t})}
 if(f.healAP){t.bonusAP=(t.bonusAP||0)+f.healAP;float(t,'+'+f.healAP+' AP','#ffd27a')}}
// the free attack's ability: Clinch (a foe stepping away) and Gale-touched (knockback) change it; otherwise the plain FREEAB
function pvFreeAb(e,why){const f=e&&e.flags;if(!f||!(f.clinch||f.galeKb||f.zocHit))return FREEAB;const x={};if(f.clinch&&why==='zoc')x.hit=f.clinch;if(f.zocHit)x.hit=(x.hit||0)+f.zocHit;if(f.galeKb&&why!=='retreat')x.kb=1;
 return Object.keys(x).length?Object.assign({},FREEAB,x):FREEAB}
function pvTurn(u){const b=B,f=u.flags||{};
 if(u.shotT)u.shotT=0;if(u.atkT)u.atkT=0;if(u.mixK)u.mixK=0;if(u.icpT)u.icpT=0;if(u.mvN)u.mvN=0;if(u.chainN)u.chainN=0;if(u.aimg)u.aimg=0;if(u.wsN)u.wsN=0;if(u.smoke)u.smoke=0;if(u.umvN)u.umvN=0;if(u.hitBy)u.hitBy=null;if(u.echoT)u.echoT=0;if(u.hrun)u.hrun=0;
 if(u.st.hobbled>0){u.ap=Math.max(0,u.ap-PV.hobble);u.st.hobbled--;float(u,'Hobbled','#ffd27a')}
 if(u.vfAP){u.ap=Math.max(0,u.ap-u.vfAP);u.vfAP=0;float(u,'Volley: −2 AP','#ffd27a')}   // fired in a Volley fire since its last turn (64u-guntrees.js)
 if(b&&b.pvBreath){const v=bestAdj(u,'breathFat');if(v>0)u.fat=Math.max(0,u.fat-v)}
 if(f.breathAm&&isThrowW(u.wpn)&&u.res.chi&&u.res.chi.cur>=f.breathAm&&ammoLeft(u)<ammoMax(u,u.wpn)){u.res.chi.cur-=f.breathAm;setAmmo(u,ammoLeft(u)+1);float(u,'Throw gathered','#9bd96f')}   // Gathered breath (Still hand)
 if(f.auraAdj&&u.res.aura){const n=adjFoes(u).length,R=u.res.aura;if(n&&R.cur<R.max){const g=Math.min(R.max-R.cur,f.auraAdj*n);R.cur+=g;float(u,'+'+g+' '+(RESN.aura||'Aura'),RESC.aura||'#ffd27a')}}
 if(f.steadyV){const n=b.units.filter(x=>x.alive&&x!==u&&x.side===u.side&&!x.fearless&&x.mor>0&&x.mor<3&&mdist(x,u)<=PV.steadyR).sort((x,y)=>x.mor-y.mor||mdist(x,u)-mdist(y,u)||x.id-y.id)[0];
  if(n){setMorale(n,n.mor+1);say(`${u.name} steadies ${n.name}.`)}}
 if(f.fieldTri){const K=['bleed','poison','burn','daze'],cnt=x=>K.filter(k=>x.st[k]>0).length;
  const n=b.units.filter(x=>x.alive&&x.side===u.side&&mdist(x,u)<=1&&cnt(x)>0).sort((x,y)=>cnt(y)-cnt(x)||x.hp/x.hpMax-y.hp/y.hpMax||x.id-y.id)[0];
  if(n){for(const k of K)if(n.st[k]>0)n.st[k]=0;float(n,'Tended','#9bd96f');FX.emit('heal',{t:n,n:0})}}
 rlTurn(u)}
function pvPay(u,a){const w=u.wpn,f=u.flags||{};if(!w||!isRangedAtk(u,a))return;
 if(w.ammo&&!a.conj){const n=ammoLeft(u)-((a.ammoN)||1);setAmmo(u,n);if(n<=0&&!u.m){u.back=false;if(u.role==='sniper')u.role='flanker'}}   // a foe with no throws left closes in
 if(f.drawLoose&&w.wt==='bow')u.shotT=1;
 if((f.smokeDef||f.smokeMel)&&isGunW(w))u.smoke=1}
// a reload weapon with more than one barrel: a shot spends one, the weapon is spent with the last (returns true while one is left)
function pvBarrel(u){const w=u.wpn;if(!w||!(w.barrels>1))return gtBrace(u);const n=ammoLeft(u)-1;setAmmo(u,n);return n>0}   // Brace of pistols (Pistolier, 64u-guntrees.js)
function pvAbInfo(u,a){const f=u.flags||{},w=u.wpn;if(!w)return a;
 if(f.drawLoose&&!u.shotT&&w.wt==='bow'&&a.tgt==='enemy'&&(a.id==='attack'||a.wpn)&&!a.magic)a.ap=Math.max(2,(a.ap||0)-1);
 return gtAbInfo(u,a)}   // the Grenadier's bombs and blasts (64u-guntrees.js)
// a Guardian angel of t's side within PV.angelR tiles, not yet spent (the nearest; ties: the lower id), or null
function pvAngel(t){if(!B||!t||!B.pvAngel)return null;let best=null;for(const o of B.units)if(o.alive&&o!==t&&o.side===t.side&&o.flags&&o.flags.angel&&!o.angU&&mdist(o,t)<=PV.angelR&&(!best||mdist(o,t)<mdist(best,t)||(mdist(o,t)===mdist(best,t)&&o.id<best.id)))best=o;return best}
// what the battle's units carry (kept on B at the start and on every spawn: cheap scans skip what nobody has)
function pvScan(){const b=B;if(!b||!b.units)return;b.pvAngel=b.units.some(x=>x.flags&&x.flags.angel);b.pvBreath=b.units.some(x=>x.flags&&x.flags.breathFat>0);b.shelOn=b.units.some(x=>x.alive&&x.shield&&x.flags&&x.flags.shelter>0);b.icpOn=b.units.some(x=>x.alive&&x.flags&&x.flags.intercept>0)}
