/* ================= FORECAST =================
   forecast(u,t,a,o) previews strike(u,t,a,o) from 60-battle-core.js without touching state or the rnd() stream.
   It mirrors, in the same order and with the same arithmetic, what strike()/hurt()/hitChance() do:
     roll (weapon d[] x mult, or magic[] x staff bonus x level bonus) -> x(1+dmg buffs+dmgB) -> x1.25 executioner
     -> x splash -> x1.1 from higher ground -> round(x max(.2, 1-damage reduction)) -> the hit location is rolled
     -> that location's armor soaks (helmet or body armor), `ign` pierces -> x HEADMULT to hitpoints on the head.
   Returns
     hit        chance to hit in percent (100 for arcs, stray shots and abilities that cannot miss); it already
                holds height, range, morale on both sides, daze and cover
     dmg*       damage dealt before armor
     hp* / arm* what a hit takes from hitpoints / from the armor of the location it lands on, over both locations
     headCh     chance in percent that a hit lands on the head
     head, body {hpMin,hpMax,armMin,armMax,kill,sure} for a hit on that location (head is null when headCh is 0, body when it is 100)
     kill       the best roll kills              sure   even the worst roll kills, wherever it lands
     ign        share of damage that pierces armor      pierce  the ability bypasses armor altogether
     statuses   what a hit applies to a survivor: [{k (a STATUS key), n turns, ch chance 0..1}]
     kb         tiles of knockback {n,ch,crash} or null (0 chance against Indomitable, size-2 units and def.kbImm; crash: what t and
                the unit it is thrown into each take when one stands in the way, 0 = the plain 8-point slam)
     cover      0..2 steps of cover in the line of fire (each -COVERPEN to hit, already in hit)
     blocked    no line of fire at all (the strike cannot be ordered)
     ff         allies in the line of fire: [{t (unit), ch (percent that this shot ends up hitting it)}]
     mor        {att, def}: what the attacker's morale adds to its hit chance and the target's to its defense
     shake      a hit can be heavy enough (HEAVYHIT of max hitpoints) to force a morale check on the target
     injure     such a hit can also injure the target (company mercs only)
     shield     {min,max,hp,brk,sure} for shield-splitting abilities: damage to the shield, its hitpoints, whether it can / must break; else null
     riposte    a miss draws a riposte from the target
   Talents and arms:
     locked     the attacker is ranged-locked (a foe next to it): a shot cannot be ordered (canUse/validTargets refuse it)
     undying    the target survives a killing blow at 1 hitpoint (Undying perk or Lucky trait not yet spent; kill / sure are false then)
     hits       strikes the ability makes on the target (a second or third only while it stands; each one is this forecast)
     through    foes behind the target the shot flies on into, for THROUGH (75%) of the damage: [unit]
   Arms update:
     crush      armor crushing of the blow (hammers): the struck armor loses dmg x (1 + crush), already in arm*
     unloaded   the attacker's reload weapon is spent: the shot cannot be ordered until it reloads (canUse/validTargets refuse it)
     reach      the blow reaches over the tile between (a polearm, greatsword or pike 2 tiles away: walls stop it, bodies do not)
     pull       tiles a hit drags the target toward the attacker {n, ch} or null      scare   a hit tests the target's morale
   Monsters update: fire weakness (def.fireWeak) is inside dmgAfter(), so the dmg, hp and arm figures already hold it (fire = fireAb(a)); distances,
   cover and line of fire measure footprints (mdist, losInfo), so a size-2 target forecasts like any other.
     fire       the hit counts as fire against a fire-weak target (its share of extra damage), else 0
   Fatigue and armor trees (the hit chance and the damage figures already hold them; these are the parts, for the HUD):
     tiredAtt   to hit the attacker loses to its own fatigue (tiredPen)     tiredDef   defense the target loses to its fatigue (adds to hit)
     armDef     defense from the target's armor-tree perks (Fleet, Fresh legs, Dancer, Layered defense; already taken off hit)
     armDr      share of damage its armor-tree perks take off (Nimble, Brace, an ally's Bulwark of steel; inside dmg*)
     sidestep   the target's Sidestep is ready: a blow over 25% of its max hitpoints is halved (inside hp*)
     soak       hitpoints its Juggernaut takes off each blow that reaches them (inside hp*)
   Monster hunter (61-talents.js quarryVs; already inside hit and the damage figures, here for the HUD):
     quarry     null, or {key, tag ('Ogre-slayer'), n ('Ogres'), slain, dmg (percent, to a tenth: 12.5), hit, text ('Ogre-slayer: +12.5% damage, +3 to hit')}
     kb.ch, pull.ch and a stun's ch are halved by Rolling with it; Unshakable drops the stun and the shake; Immovable makes kb.ch 0.
   o is strike()'s option bag: {splash:.7} for blast/arc secondaries, {auto:1} for arcs and strays that always hit,
   {free:...} for free attacks.
   Endgame (24-endgame.js): realm {k, n, notes:[text]} | null (the portal realm's rules on this strike; spellK is inside spellMult already);
   lines [{k,t}] legendary powers (legendFcLines, 25-legend.js). */
// The damage one roll does before armor: the same dmgAfter() strike() calls (talent bonuses, executioner, splash, height, reduction).
function fcDamage(u,t,a,roll,o){if(a.noDmg)return 0;return dmgAfter(u,t,a,a.magic?roll*spellMult(u):roll*(a.mult||1),o)}
// hurt() without the hurting: what `dmg` takes from hitpoints and from the armor of the struck location.
// The armor-tree terms of hurt() are here too (Padded under-layer, Unbowed, Sidestep, Juggernaut): a forecast is always of a weapon or spell hit.
function fcSoak(t,dmg,ign,head,pierce,crush){if(!(dmg>0))return{hp:0,arm:0};const a0=(head?t.helm:t.arm)||0,tf=t.flags||{};let hp,arm=0;
 if(pierce)hp=dmg;else if(a0>0){arm=Math.min(a0,crush>0?Math.round(dmg*(1+crush)):dmg);if(tf.unbowed)arm=Math.min(arm,armCap(t,head));
  hp=Math.max(dmg-Math.min(a0,dmg),Math.round(dmg*(!head&&tf.padIgn?ign*(1-tf.padIgn):ign)-(a0-arm)*.1),0)}else hp=dmg;
 if(head)hp=Math.round(hp*HEADMULT);if(tf.sidestep&&!t.ss&&hp>t.hpMax*tf.sidestep)hp=Math.round(hp/2);if(tf.hpSoak&&hp>0)hp=Math.max(1,hp-tf.hpSoak);return{hp,arm}}
// What the rules turn a status into on this target (monStatus in 66-monsters.js): a rooted flier is also Grounded for its root turns + 2;
// a size-2 flier is too big to pin, so the root itself is dropped and only Grounded stays.
function statusConv(t,st){const R=st.root;if(!R||!t.fly)return;const n=Math.max(t.st.root||0,R.n)+2;if(!(t.st.grounded>=n))st.grounded={k:'grounded',n,ch:R.ch};if((t.sz||1)>1)delete st.root}
function fcQuarry(u,t,a,sure){const q=quarryVs(u,t);if(!q.key)return null;const dmg=a.noDmg||a.split?0:Math.round(q.dmg*1000)/10,hit=sure?0:q.hit;
 return{key:q.key,tag:q.tag,n:q.n,slain:q.slain,dmg,hit,text:`${q.tag}: +${dmg}% damage${hit?`, +${hit} to hit`:''}`}}
function forecast(u,t,a,o){o=o||{};const sure=!!(o.auto||a.sure),kind=shotKind(u,t,a),los=losInfo(u,t,a),mu=morOf(u),mt=morOf(t);
 const f={hit:sure?100:hitChance(u,t,a),dmgMin:0,dmgMax:0,hpMin:0,hpMax:0,armMin:0,armMax:0,kill:false,sure:false,ign:1,pierce:!!a.pierce,kb:null,statuses:[],
  headCh:0,head:null,body:null,cover:los.cover,blocked:los.blocked,ff:[],mor:{att:mu.hit,def:mt.def},shake:false,injure:false,shield:null,riposte:false,
  locked:isRangedAtk(u,a)&&rangedLocked(u),undying:canUndy(t),hits:a.hits||1,through:a.through&&!o.splash?lineBeyond(u,t,a.through):[],
  crush:crushOf(u,a),unloaded:!canFire(u,a),reach:kind===1,pull:null,scare:!!a.scare&&!t.fearless&&!moraleImmune(t),fire:t.fw&&fireAb(a)?t.fw:0,
  tiredAtt:sure?0:tiredPen(u),tiredDef:sure?0:tiredPen(t),armDef:sure?0:armorDef(u,t,a),armDr:a.split||a.noDmg?0:armorDr(t),sidestep:false,soak:(t.flags&&t.flags.hpSoak)||0,quarry:fcQuarry(u,t,a,sure)};
 if(a.split){const m=splitMult(u,a),lo=Math.round(u.wpn.d[0]*m),hi=Math.round(u.wpn.d[1]*m);if(t.shield)f.shield={min:Math.min(lo,t.shp),max:Math.min(hi,t.shp),hp:t.shp,brk:hi>=t.shp,sure:lo>=t.shp};f.body={hpMin:0,hpMax:0,armMin:0,armMax:0,kill:false,sure:false};return f}
 let lo=0,hi=0;if(a.noDmg){}else if(a.magic){lo=a.magic[0];hi=a.magic[1];f.ign=ignOf(u,a)}else{const wd=rollOf(u,a);lo=wd[0];hi=wd[1];f.ign=ignOf(u,a)}
 const hc=headChance(u,t,a),mk=()=>({hpMin:0,hpMax:0,armMin:0,armMax:0,kill:false,sure:false}),H=mk(),Bd=mk();let first=true,n=0,posB=0,posH=0;
 for(let r=lo;r<=hi;r++){const d=fcDamage(u,t,a,r,o),sb=fcSoak(t,d,f.ign,false,a.pierce,f.crush),sh=fcSoak(t,d,f.ign,true,a.pierce,f.crush);n++;if(sb.hp>0)posB++;if(sh.hp>0)posH++;
  if(first){f.dmgMin=f.dmgMax=d;Bd.hpMin=Bd.hpMax=sb.hp;Bd.armMin=Bd.armMax=sb.arm;H.hpMin=H.hpMax=sh.hp;H.armMin=H.armMax=sh.arm;first=false}
  else{if(d<f.dmgMin)f.dmgMin=d;if(d>f.dmgMax)f.dmgMax=d;
   if(sb.hp<Bd.hpMin)Bd.hpMin=sb.hp;if(sb.hp>Bd.hpMax)Bd.hpMax=sb.hp;if(sb.arm<Bd.armMin)Bd.armMin=sb.arm;if(sb.arm>Bd.armMax)Bd.armMax=sb.arm;
   if(sh.hp<H.hpMin)H.hpMin=sh.hp;if(sh.hp>H.hpMax)H.hpMax=sh.hp;if(sh.arm<H.armMin)H.armMin=sh.arm;if(sh.arm>H.armMax)H.armMax=sh.arm}}
 for(const L of [H,Bd]){L.kill=!f.undying&&L.hpMax>=t.hp;L.sure=!f.undying&&L.hpMin>=t.hp}
 f.headCh=f.dmgMax>0?hc:0;const useH=f.headCh>0,useB=f.headCh<100;f.head=useH?H:null;f.body=useB?Bd:null;
 const parts=[];if(useH)parts.push(H);if(useB)parts.push(Bd);
 f.hpMin=Math.min(...parts.map(p=>p.hpMin));f.hpMax=Math.max(...parts.map(p=>p.hpMax));f.armMin=Math.min(...parts.map(p=>p.armMin));f.armMax=Math.max(...parts.map(p=>p.armMax));
 f.kill=!f.undying&&f.hpMax>=t.hp;f.sure=!f.undying&&f.hpMin>=t.hp;
 f.shake=!t.fearless&&!(t.flags&&t.flags.noStun)&&!moraleImmune(t)&&f.hpMax>=heavyHit(t)&&!f.sure;   // Beast-wise against beasts: no check
 {const tf=t.flags||{};f.sidestep=!!(tf.sidestep&&!t.ss&&!a.noDmg)}f.injure=!!t.m&&f.hpMax>=heavyHit(t)&&!f.sure;
 const st={};for(const k in a.status||{})st[k]={k,n:a.status[k],ch:1};
 { const sc=stunOf(u,a);if(sc&&!(st.stun))st.stun={k:'stun',n:1,ch:Math.min(1,sc)} }
 if(u.onhit){const n=u.onhit.root;if(!st.root)st.root={k:'root',n,ch:u.onhit.ch};else if(n>st.root.n)st.root={k:'root',n,ch:u.onhit.ch}}
 const bl=bleedOf(u,a);if(bl&&n){const pb=posB/n,ph=posH/n,ch=(!useH||ph===1)&&(!useB||pb===1)?1:(useH?f.headCh/100*ph:0)+(useB?(1-f.headCh/100)*pb:0);if(ch>0)st.bleed={k:'bleed',n:Math.max(bl,st.bleed?st.bleed.n:0),ch}}
 statusConv(t,st);
 if(st.stun){const tf=t.flags||{};if(tf.noStun)delete st.stun;else if(tf.roll>0)st.stun.ch*=1-tf.roll}   // Unshakable, Rolling with it
 for(const k in st)if(st[k].n>0)f.statuses.push(st[k]);
 const kn=a.kb||u.kbN||0,imm=kbImmune(t),rl=1-((t.flags&&t.flags.roll)||0);if(kn)f.kb={n:kn,ch:imm?0:(a.kb?1:u.kbCh||0)*rl,crash:a.crash||u.crashD||0};if(a.pull)f.pull={n:a.pull,ch:imm||mdist(u,t)<=1?0:rl};
 if(kind===2&&!o.free&&!sure&&los.ff.length){const ch=(100-f.hit)*FFCH/los.ff.length;f.ff=los.ff.map(x=>({t:x,ch}))}
 f.riposte=!sure&&!o.free&&!a.magic&&mdist(u,t)===1&&buffSum(t,'rip')>0&&canFree(t);
 f.realm=fcRealm(u,a);   // a portal realm's say in this strike (24-endgame.js), already inside the figures
 f.lines=typeof legendFcLines==='function'?legendFcLines(u,t,a):[];   // legendary powers (25-legend.js): [{k,t}] for the HUD
 return f}
/* realm: null, or {k, n, notes:[text]}: the Glass Wastes' mana storm (spells +30%, inside dmg*) and backlash (the caster's own hitpoints),
   the Hollow's darkness (the reach is capped: the target is within it), the Ashen Reach's halved healing. */
function fcRealm(u,a){const R=B&&B.realm;if(!R)return null;const L=[];if(a.magic&&R.spellK)L.push(`Mana storm: +${Math.round((R.spellK-1)*100)}% spell damage`);if(a.magic&&R.backlash)L.push(`Backlash: the caster loses ${Math.max(3,Math.round(u.hpMax*R.backlash))} hitpoints`);
 if(R.sight&&a.tgt==='enemy')L.push(`Darkness: reach at most ${R.sight} tiles`);if(R.healK!=null&&a.heal)L.push('No mending: heals do half');return{k:R.k,n:R.n,notes:L}}
