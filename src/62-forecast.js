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
     kb         tiles of knockback {n,ch} or null (0 chance against Indomitable)
     cover      0..2 steps of cover in the line of fire (each -COVERPEN to hit, already in hit)
     blocked    no line of fire at all (the strike cannot be ordered)
     ff         allies in the line of fire: [{t (unit), ch (percent that this shot ends up hitting it)}]
     mor        {att, def}: what the attacker's morale adds to its hit chance and the target's to its defense
     shake      a hit can be heavy enough (HEAVYHIT of max hitpoints) to force a morale check on the target
     injure     such a hit can also injure the target (company mercs only)
     shield     {min,max,hp,brk,sure} for shield-splitting abilities: damage to the shield, its hitpoints, whether it can / must break; else null
     riposte    a miss draws a riposte from the target
   o is strike()'s option bag: {splash:.7} for blast/arc secondaries, {auto:1} for arcs and strays that always hit,
   {free:...} for free attacks. */
function fcDamage(u,t,a,roll,o){let dmg=0;
 if(a.noDmg)dmg=0;else if(a.magic)dmg=roll*(1+(u.wpn.spell||0))*(1+(u.side===0?u.lvl*.03:0));else dmg=roll*(a.mult||1);
 dmg*=1+buffSum(u,'dmg')+(u.dmgB||0);if(u.flags.exec&&t.hp<t.hpMax/2)dmg*=1.25;if(o&&o.splash)dmg*=o.splash;if(T(u).h>T(t).h)dmg*=1.1;
 let dr=buffSum(t,'dr');if(t.flags.forged&&t.arm>0)dr+=.15;return Math.round(dmg*Math.max(.2,1-dr))}
// hurt() without the hurting: what `dmg` takes from hitpoints and from the armor of the struck location.
function fcSoak(t,dmg,ign,head,pierce){if(!(dmg>0))return{hp:0,arm:0};const a0=(head?t.helm:t.arm)||0;let hp,arm=0;
 if(pierce)hp=dmg;else if(a0>0){arm=Math.min(a0,dmg);hp=Math.max(dmg-arm,Math.round(dmg*ign-(a0-arm)*.1),0)}else hp=dmg;
 if(head)hp=Math.round(hp*HEADMULT);return{hp,arm}}
function forecast(u,t,a,o){o=o||{};const sure=!!(o.auto||a.sure),kind=shotKind(u,t,a),los=losInfo(u,t,a),mu=morOf(u),mt=morOf(t);
 const f={hit:sure?100:hitChance(u,t,a),dmgMin:0,dmgMax:0,hpMin:0,hpMax:0,armMin:0,armMax:0,kill:false,sure:false,ign:1,pierce:!!a.pierce,kb:null,statuses:[],
  headCh:0,head:null,body:null,cover:los.cover,blocked:los.blocked,ff:[],mor:{att:mu.hit,def:mt.def},shake:false,injure:false,shield:null,riposte:false};
 if(a.split){const m=a.smult||1,lo=Math.round(u.wpn.d[0]*m),hi=Math.round(u.wpn.d[1]*m);if(t.shield)f.shield={min:Math.min(lo,t.shp),max:Math.min(hi,t.shp),hp:t.shp,brk:hi>=t.shp,sure:lo>=t.shp};f.body={hpMin:0,hpMax:0,armMin:0,armMax:0,kill:false,sure:false};return f}
 let lo=0,hi=0;if(a.noDmg){}else if(a.magic){lo=a.magic[0];hi=a.magic[1];f.ign=a.ign||.5}else{lo=u.wpn.d[0];hi=u.wpn.d[1];f.ign=(u.wpn.ign||.2)+(a.ignB||0)}
 const hc=headChance(u,t,a),mk=()=>({hpMin:0,hpMax:0,armMin:0,armMax:0,kill:false,sure:false}),H=mk(),Bd=mk();let first=true,n=0,posB=0,posH=0;
 for(let r=lo;r<=hi;r++){const d=fcDamage(u,t,a,r,o),sb=fcSoak(t,d,f.ign,false,a.pierce),sh=fcSoak(t,d,f.ign,true,a.pierce);n++;if(sb.hp>0)posB++;if(sh.hp>0)posH++;
  if(first){f.dmgMin=f.dmgMax=d;Bd.hpMin=Bd.hpMax=sb.hp;Bd.armMin=Bd.armMax=sb.arm;H.hpMin=H.hpMax=sh.hp;H.armMin=H.armMax=sh.arm;first=false}
  else{if(d<f.dmgMin)f.dmgMin=d;if(d>f.dmgMax)f.dmgMax=d;
   if(sb.hp<Bd.hpMin)Bd.hpMin=sb.hp;if(sb.hp>Bd.hpMax)Bd.hpMax=sb.hp;if(sb.arm<Bd.armMin)Bd.armMin=sb.arm;if(sb.arm>Bd.armMax)Bd.armMax=sb.arm;
   if(sh.hp<H.hpMin)H.hpMin=sh.hp;if(sh.hp>H.hpMax)H.hpMax=sh.hp;if(sh.arm<H.armMin)H.armMin=sh.arm;if(sh.arm>H.armMax)H.armMax=sh.arm}}
 for(const L of [H,Bd]){L.kill=L.hpMax>=t.hp;L.sure=L.hpMin>=t.hp}
 f.headCh=f.dmgMax>0?hc:0;const useH=f.headCh>0,useB=f.headCh<100;f.head=useH?H:null;f.body=useB?Bd:null;
 const parts=[];if(useH)parts.push(H);if(useB)parts.push(Bd);
 f.hpMin=Math.min(...parts.map(p=>p.hpMin));f.hpMax=Math.max(...parts.map(p=>p.hpMax));f.armMin=Math.min(...parts.map(p=>p.armMin));f.armMax=Math.max(...parts.map(p=>p.armMax));
 f.kill=f.hpMax>=t.hp;f.sure=f.hpMin>=t.hp;
 f.shake=!t.fearless&&f.hpMax>=heavyHit(t)&&!f.sure;f.injure=!!t.m&&f.hpMax>=heavyHit(t)&&!f.sure;
 const st={};for(const k in a.status||{})st[k]={k,n:a.status[k],ch:1};
 if(!a.magic&&u.wpn.stun&&!(st.stun))st.stun={k:'stun',n:1,ch:u.wpn.stun};
 if(u.onhit){const n=u.onhit.root;if(!st.root)st.root={k:'root',n,ch:u.onhit.ch};else if(n>st.root.n)st.root={k:'root',n,ch:u.onhit.ch}}
 if(a.bleed&&n){const pb=posB/n,ph=posH/n,ch=(!useH||ph===1)&&(!useB||pb===1)?1:(useH?f.headCh/100*ph:0)+(useB?(1-f.headCh/100)*pb:0);if(ch>0)st.bleed={k:'bleed',n:a.bleed,ch}}
 for(const k in st)if(st[k].n>0)f.statuses.push(st[k]);
 const kn=a.kb||u.kbN||0;if(kn)f.kb={n:kn,ch:buffSum(t,'indom')?0:a.kb?1:u.kbCh||0};
 if(kind===2&&!o.free&&!sure&&los.ff.length){const ch=(100-f.hit)*FFCH/los.ff.length;f.ff=los.ff.map(x=>({t:x,ch}))}
 f.riposte=!sure&&!o.free&&!a.magic&&mdist(u,t)===1&&buffSum(t,'rip')>0&&canFree(t);
 return f}
