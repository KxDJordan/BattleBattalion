/* ================= GLADIATORS: the Gladiator and Arena champion trees, and the arena school's tricks =================
   The trees are MAST.gladiator / MAST.champion in 10-data.js (perk ids pinned: gladiator.1-6, champion.1-6; capstones in 25-legend.js).
   What touches a hit or its damage lives in the core so the forecast stays exact: pinned / alone / glHit / glDmg (Pinned prey, Single
   combat) inside hitChance() and dmgBonus(), a.offhand in canUse / useBlock (Throw net), a.killRally in strike() (Showstopper)
   (60-battle-core.js); netted roots in nextTurn like webbed. This file (it loads after 64-foes.js and 64e-elites.js) holds:
     the abilities (AB): taunt netthrow showstop crowdroar feint iugula, and the school's own: gnet (the retiarius' cast net), gtaunt
     the statuses: taunted (−10 melee defense, −10 resolve; drawn to its taunter: the AI's target priority, 63-ai.js aiPrio), netted
       (−10 melee defense, −10 melee skill, cannot move), and the buffs crowd / feint / secondwind
     crowdRally(u, steps, rad): allies of u within rad tiles, not fleeing, regain morale steps (up to steady, or confident for steps > 1)
     the hooks (wrappers, installed once): killUnit (Crowd-pleaser; the arena's tally of kills for Showman), hurt (Undefeated: the
       second wind), addStatus (taunted and netted take hold at once: the foe auras recompute)
   Randomness: none of its own; every roll is the rules' (strike). */
const GL={net:{turns:2,md:10,ms:10},taunt:{turns:2,md:10,brv:10},crowd:{rad:3},wind:{hp:20,ap:2}};
const glNetOK=(u,t)=>!!t&&(t.sz||1)<2&&!(t.def&&t.def.anchored);
const glOf=(b,k)=>b&&Array.isArray(b.units)?b.units.find(x=>x.id===k)||null:null;
/* ---- abilities ---- */
Object.assign(AB,{
 taunt:{n:'Taunt',ap:2,fat:6,rng:4,tgt:'enemy',noDmg:1,sure:1,nostun:1,status:{taunted:GL.taunt.turns},noDmgTxt:'Taunted',fx:'mark',
  d:'Jeer at a foe within 4 tiles you can see: Taunted until 2 of its turns have passed: −10 melee defense, −10 resolve, and it would rather strike you than anyone else. Cannot miss.',
  async run(u,k,a){const b=B,t=unitAt(k%BW,(k/BW)|0);if(!t)return;const hit=await strike(u,t,a);if(B!==b||!hit||!t.alive)return;t.tauntBy=u.id;float(u,'Come and get me!','#ffd27a')}},
 netthrow:{n:'Throw net',ap:4,fat:14,rng:3,tgt:'enemy',melee:1,offhand:1,noDmg:1,nostun:1,hit:5,status:{netted:GL.net.turns},noDmgTxt:'Netted',fx:'shove',tgtOK:(u,t)=>glNetOK(u,t),
  d:'With no shield raised and no two-handed weapon in hand: cast a weighted net at a foe within 3 tiles (melee skill, +5 to hit; not at huge foes). Netted for 2 turns: it cannot move, −10 melee defense and −10 melee skill.'},
 showstop:{n:'Showstopper',ap:5,fat:18,tgt:'enemy',wpn:1,mult:1.3,hit:10,killAP:3,killRally:2,noBow:1,fx:'slash',
  d:'A flourish to finish it: 130% damage, +10 to hit. A kill gives back 3 AP and lifts every ally within 4 tiles one step of morale, up to confident.'},
 crowdroar:{n:'Roar of the crowd',ap:4,fat:12,tgt:'self',once:1,party:4,rally:1,buff:{key:'crowd',ms:8,md:5,brv:15},dur:2,fx:'rally',
  d:'Once per battle, play to the crowd: you and every ally within 4 tiles regain one step of morale (up to steady) and get +8 melee skill, +5 melee defense and +15 resolve for 2 turns.'},
 feint:{n:'Feint',ap:2,fat:8,tgt:'self',noBow:1,buff:{key:'feint',ms:15},dur:1,fx:'guard',
  d:'A feint to open the guard: +15 melee skill until your next turn.'},
 iugula:{n:'Iugula',ap:5,fat:18,tgt:'enemy',wpn:1,melee:1,mult:1,hit:10,ignB:.4,vsHurt:.8,noBow:1,fx:'stab',
  d:'The crowd’s verdict, in melee: 100% damage, +10 to hit, +40% armor piercing, and a further +80% against a foe below half health.'},
 /* the arena school's own (FACT.pit, 11-gladiators.js) */
 gnet:{n:'Cast net',foe:1,ap:4,fat:0,rng:3,tgt:'enemy',melee:1,noDmg:1,nostun:1,hit:5,cd:3,status:{netted:GL.net.turns},noDmgTxt:'Netted',fx:'shove',tgtOK:(u,t)=>glNetOK(u,t),
  d:'The retiarius casts its net at a foe within 3 tiles: Netted for 2 turns: it cannot move, −10 melee defense and −10 melee skill.'},
 gtaunt:{n:'Challenge',foe:1,ap:2,fat:0,rng:4,tgt:'enemy',noDmg:1,sure:1,nostun:1,cd:3,status:{taunted:GL.taunt.turns},noDmgTxt:'Challenged',fx:'mark',
  d:'A champion’s challenge to a sword within 4 tiles: Taunted until 2 of its turns have passed: −10 melee defense and −10 resolve.',
  async run(u,k,a){const b=B,t=unitAt(k%BW,(k/BW)|0);if(!t)return;const hit=await strike(u,t,a);if(B!==b||!hit||!t.alive)return;t.tauntBy=u.id}}});
/* ---- statuses (taunted and netted tick like the foes' own: FOE_ST t:1; their numbers through FOE_MOD, so hitChance and forecast() read them) ---- */
const GL_ST={
 taunted:{n:'Taunted',d:'Goaded: −10 melee defense, −10 resolve, and it would rather strike whoever taunted it than anyone else.',icon:'st-taunted',good:0,t:1},
 netted:{n:'Netted',d:'Tangled in a weighted net: cannot move, −10 melee defense, −10 melee skill.',icon:'st-netted',good:0,t:1}};
if(typeof FOE_ST==='object'){Object.assign(FOE_ST,GL_ST);if(typeof FOE_MOD==='object'){FOE_MOD.taunted={md:-GL.taunt.md,brv:-GL.taunt.brv};FOE_MOD.netted={md:-GL.net.md,ms:-GL.net.ms}}}
for(const k in GL_ST)if(!STATUS[k])STATUS[k]=GL_ST[k];
Object.assign(STATUS,{
 crowd:{n:'The crowd roars',d:'+8 melee skill, +5 melee defense, +15 resolve.',icon:'st-crowd',good:1},
 feint:{n:'Feinting',d:'+15 melee skill until its next turn.',icon:'st-feint',good:1},
 secondwind:{n:'Second wind',d:'Undefeated: caught its second wind (once per battle).',icon:'st-secondwind',good:1}});
if(typeof addStatus==='function'&&!addStatus.gl){const a0=addStatus;addStatus=function(t,key,n){const had=t&&t.st?t.st[key]||0:0,r=a0(t,key,n);if(GL_ST[key]&&t&&t.st&&(t.st[key]||0)!==had&&typeof foeAuras==='function')foeAuras();return r};addStatus.gl=1}
/* ---- morale from the sand ---- */
function crowdRally(u,steps,rad){const b=B;if(!b||!u)return 0;const top=steps>1?4:3;let n=0;
 for(const o of b.units){if(!o.alive||o.side!==u.side||o.gone||o.mor===0||o.fearless||mdist(o,u)>(rad||GL.crowd.rad))continue;if(o.mor>=top)continue;const to=Math.min(top,o.mor+1);if(typeof setMorale==='function'&&setMorale(o,to))n++}
 if(n)say(`The crowd roars for ${u.name}.`);return n}
/* ---- hooks ---- */
// Crowd-pleaser (crowdKill: the hitpoints it heals) and the arena's tally of who killed what (B.arenaKills {merc id: n}: Showman, 29-colosseum.js)
if(typeof killUnit==='function'&&!killUnit.gl){const k0=killUnit;killUnit=function(t,src,head){const r=k0(t,src,head);const b=B;
  if(b&&src&&src.side!==t.side){if(b.opts&&b.opts.arena&&src.m)(b.arenaKills||(b.arenaKills={}))[src.m.id]=((b.arenaKills||{})[src.m.id]|0)+1;
   const f=src.flags;if(f&&f.crowdKill>0&&src.alive){crowdRally(src,1,GL.crowd.rad);if(src.hp<src.hpMax){const h0=src.hp;src.hp=Math.min(src.hpMax,src.hp+f.crowdKill);float(src,'+'+(src.hp-h0),'#9bd96f');FX.emit('heal',{t:src,n:src.hp-h0})}}}
  return r};killUnit.gl=1}
// Undefeated (secondWind): the first blow of a battle that leaves it alive below half health
if(typeof hurt==='function'&&!hurt.gl){const h0=hurt;hurt=function(t,dmg,ign,src,o){const r=h0(t,dmg,ign,src,o);
  if(t&&t.alive&&t.flags&&t.flags.secondWind&&!t.swd&&t.hp>0&&t.hp<t.hpMax/2){t.swd=1;const a=t.hp;t.hp=Math.min(t.hpMax,t.hp+GL.wind.hp);t.bonusAP=(t.bonusAP||0)+GL.wind.ap;
   addBuff(t,{key:'secondwind'},2);float(t,'Second wind','#9bd96f');if(t.hp>a)FX.emit('heal',{t,n:t.hp-a});if(typeof say==='function')say(`${t.name} will not stay down.`)}
  return r};hurt.gl=1}
// netted units cannot move (the rules root a unit at the start of its turn: this keeps it rooted while the net holds)
function glRootCheck(u){if(u&&u.st&&u.st.netted>0)u.rooted=true}
