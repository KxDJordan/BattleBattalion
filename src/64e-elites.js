/* ================= ELITE ENEMY MODIFIERS ================= */
/* Some foes take the field as elites: one modifier (two on a band's leader late in the march) from ELITES, each a single rule
   built from the rules' own levers (flags read by hitChance / dmgAfter / hurt, statuses, an ability, two event hooks), so the
   forecast and the AI see them like any other number.
     ELITES[k] = {n (the name prefix), d (the exact effect, in the inspect card and the chip), icon ('el-<k>'), tone, w (worth:
                  the share of the foe's own cost the modifier adds), ok(u) (who can carry it), apply(u)}
     u.elite = [keys]  (absent on plain foes), u.baseName (its name before the prefix)
   Who and how many (eliteShare): a share s of the battle budget goes to elites instead of bodies,
     s = ELITE.share x ELITE.diff[difficulty] x p x runMod,   p = clamp((average fielded level - lvl0) / lvlSpan, 0, 1)
   (Story .15, Normal 1, Hard 1.6, Brutal 2.2; a level 2 company sees none; Normal at level 4 1.25%, 8 3.75%, 10+ 5%), capped at maxShare.
   runMod('elites') (27-runmods.js, when present) doubles it and lifts p to at least .5; runModK('elite',1) multiplies it.
   previewEnemies buys bodies with (1 - s) of the budget (eliteKeep); elitePlan then prices the elites at E = s/(1-s) x what the bodies
   cost (at most s x budget), and eliteSetup spends E: a foe is drawn weighted by its cost (leaders more often), a modifier it can carry
   at random, until E runs out (the last one with the chance what is left buys) or ELITE.maxPer of the band is elite. A warband
   already at MAXFOES could not shrink: there the elites come out of its rank instead (b.eRankK = 1 - rankCut x s, read by foeRank).
   Fixed rosters (o.roster) carry only explicit elites: an entry's el:[keys]. Rivals, fabled warriors, EN bosses, summons and the
   raised are never elite. Every draw comes from a stream derived from the battle's seeded state (RNG_S) and the band: the game's
   own stream is not advanced, so a battle without elites rolls exactly as before.
   Rewards: XP x (1 + ELITE.xp a modifier); the loot roll of an elite succeeds with .18 + ELITE.loot a modifier (to lootMax) and
   picks from the dearer half of the faction's loot table (the same one draw either way). */
const ELITE={share:.05,lvl0:2,lvlSpan:8,maxShare:.4,maxPer:.35,two:.6,rankCut:.6,xp:.5,loot:.22,lootMax:.7,
 diff:{story:.15,normal:1,hard:1.6,brutal:2.2},
 ward:.35,wardMin:10,split:.4,splitDmg:.7,boom:[10,.15],thorns:.25,bloodHeal:1/3};
const elLc=s=>String(s||'').replace(/^./,c=>c.toLowerCase());
const elRanged=u=>!!(u&&u.wpn&&u.wpn.rng>1&&typeof isRangedW==='function'&&isRangedW(u.wpn));
const elKey=u=>!!(u.role==='boss'||u.role==='caster'||(u.def&&(u.def.lead||u.def.banner||u.def.max||u.def.boss)));   // a band's linchpin (its death means something)
const ELITES={
 hulking:{n:'Hulking',icon:'el-hulking',tone:'def',w:.35,d:()=>'+40% hitpoints.',
  apply(u){u.hp=u.hpMax=Math.round(u.hpMax*1.4)}},
 shielded:{n:'Shielded',icon:'el-shielded',tone:'def',w:.3,d:u=>`Hides behind a ward of ${u.wardMax||'35% of its hitpoints'}: blows and spells strike the ward before armor. Once broken it is gone.`,
  apply(u){u.ward=u.wardMax=Math.max(ELITE.wardMin,Math.round(u.hpMax*ELITE.ward))}},
 armoured:{n:'Armoured',icon:'el-armoured',tone:'def',w:.3,d:u=>`+40% body and head armor; mends ${u.flags.armRegen||0} body armor at the start of each of its turns.`,
  apply(u){u.arm=u.armMax=Math.max(Math.round(u.armMax*1.4),u.armMax+Math.round(u.hpMax*.25));if(u.helmMax>0||!u.noHead)u.helm=u.helmMax=Math.max(Math.round((u.helmMax||0)*1.4),(u.helmMax||0)+Math.round(u.hpMax*.15));
   u.flags.armRegen=(u.flags.armRegen||0)+Math.max(3,Math.round(u.armMax*.1))}},
 regen:{n:'Regenerating',icon:'el-regen',tone:'def',w:.35,ok:u=>!(u.def&&u.def.regen),d:u=>`Heals ${u.flags.regenHP||0} hitpoints (10%) at the start of each of its turns.`,
  apply(u){u.flags.regenHP=(u.flags.regenHP||0)+Math.max(3,Math.round(u.hpMax*.1))}},
 fast:{n:'Fast',icon:'el-fast',tone:'mob',w:.35,d:()=>'+2 action points and +25 initiative.',
  apply(u){u.apMax+=2;u.ap=u.apMax;u.init+=25}},
 blink:{n:'Blinking',icon:'el-blink',tone:'mob',w:.12,ok:u=>usz(u)===1&&!u.fly&&!(u.def&&u.def.anchored)&&!!AB.eblink,d:()=>'Once a battle it blinks up to 5 tiles, over anything.',
  apply(u){if(!u.abs.includes('eblink'))u.abs.push('eblink')}},
 unstoppable:{n:'Unstoppable',icon:'el-unstoppable',tone:'def',w:.15,ok:u=>usz(u)===1,d:()=>'Cannot be stunned, knocked back or dragged; heavy blows do not shake it. +15 resolve.',
  apply(u){u.flags.noStun=1;u.flags.kbImm=1;u.brv+=15}},
 bloodthirsty:{n:'Bloodthirsty',icon:'el-bloodthirsty',tone:'att',w:.35,d:()=>'Heals a third of the hitpoints it takes from a foe, and 15 more for a kill. +20% damage while below half health.',
  apply(u){u.flags.killHeal=(u.flags.killHeal||0)+15;u.flags.lowHpDmg=(u.flags.lowHpDmg||0)+.2}},
 berserk:{n:'Berserk',icon:'el-berserk',tone:'att',w:.3,d:()=>'+5% damage for every tenth of its hitpoints lost (up to +50%); a kill gives it 4 more action points, once a turn.',
  apply(u){u.flags.hurtDmg=(u.flags.hurtDmg||0)+.5;u.flags.berserk=1}},
 venom:{n:'Venomous',icon:'el-venom',tone:'att',w:.25,d:()=>'Every blow it lands poisons for 2 turns (hitpoints lost through armor at the start of each turn).',
  apply(){}},
 hex:{n:'Hexing',icon:'el-hex',tone:'att',w:.25,d:()=>'Every blow it lands Hexes for 2 turns: −15 melee and ranged skill, −15 resolve.',
  apply(){}},
 sharp:{n:'Keen-eyed',icon:'el-sharp',tone:'att',w:.3,ok:elRanged,d:()=>'+1 range, +10 ranged skill; ignores cover and the penalty for distance.',
  apply(u){u.wpn=Object.assign({},u.wpn,{rng:u.wpn.rng+1});u.rs+=10;u.flags.coverIgn=2;u.flags.longShot=1}},
 commander:{n:'Commanding',icon:'el-commander',tone:'aura',w:.3,d:()=>'Allies beside it get +10 to hit; allies within 3 tiles +15 to their morale checks.',
  apply(u){u.flags.cmd=Math.max(u.flags.cmd||0,10);u.flags.brvAura=Math.max(u.flags.brvAura||0,15)}},
 thorns:{n:'Thorned',icon:'el-thorns',tone:'def',w:.25,d:()=>'Whoever wounds it from beside it takes a quarter of that blow back (hitpoints and armor it lost), through armor.',
  apply(){}},
 volatile:{n:'Volatile',icon:'el-volatile',tone:'att',w:.15,d:u=>`Explodes when it dies: everyone beside it takes ${eliteBoomDmg(u)} (half through armor) and catches fire.`,
  apply(){}},
 splitting:{n:'Splitting',icon:'el-splitting',tone:'def',w:.45,ok:u=>usz(u)===1&&!elKey(u)&&!u.risen,d:u=>`Splits on death: two lesser ${elLc(u.def?u.def.n:u.name)}s rise in its place (${Math.max(1,Math.round(u.hpMax*ELITE.split))} hitpoints, 70% damage each).`,
  apply(){}}};
const ELITEK=Object.keys(ELITES);
/* ---- the share of the battle (pure: no randomness) ---- */
function eliteMods(){let k=1,on=false;try{if(typeof runMod==='function'&&runMod('elites')){k*=2;on=true}if(typeof runModK==='function'){const v=+runModK('elite',1);if(isFinite(v)&&v>=0)k*=v}}catch(e){}return{k,on}}
function eliteShare(o){if(!o||o.rival||Array.isArray(o.roster)||o.fabledOnly||o.noElite)return 0;let F=[];try{F=battleField(o)}catch(e){F=[]}if(!F.length)return 0;
 const L=F.reduce((s,m)=>s+(+m.lvl||1),0)/F.length,D=ELITE.diff[typeof diffOf==='function'?diffOf():'normal'];if(!(D>0))return 0;
 const M=eliteMods();let p=clamp((L-ELITE.lvl0)/ELITE.lvlSpan,0,1);if(M.on)p=Math.max(p,.5);return clamp(ELITE.share*D*p*M.k,0,ELITE.maxShare)}
function eliteKeep(o){return 1-eliteShare(o)}
function eliteCost(id,f){const U=FACT[f]&&Array.isArray(FACT[f].units)?FACT[f].units:null;if(U){const e=U.find(x=>x[0]===id);if(e)return e[1];return U.reduce((s,x)=>s+x[1],0)/U.length}return 20}
/* elitePlan(b,o,pv): called by startBattle before the foes are made: b.elitePlan = {s, E, p, D, capped} (and b.eRankK for a full band) */
function elitePlan(b,o,pv){b.elitePlan=null;const s=eliteShare(o);if(!(s>0)||!pv||!Array.isArray(pv.foes)||!pv.foes.length)return null;
 let spent=0;for(const id of pv.foes)spent+=eliteCost(id,o.f);const B0=pv.budget>0?pv.budget:spent/(1-s),capped=pv.foes.length>=MAXFOES;
 let F=[];try{F=battleField(o)}catch(e){}const L=F.length?F.reduce((x,m)=>x+(+m.lvl||1),0)/F.length:1;
 const P={s,E:Math.min(s*B0,s/(1-s)*spent),p:clamp((L-ELITE.lvl0)/ELITE.lvlSpan,0,1),D:ELITE.diff[typeof diffOf==='function'?diffOf():'normal']||1,capped};
 if(capped)b.eRankK=1-ELITE.rankCut*s;b.elitePlan=P;return P}
/* ---- assignment ---- */
function eliteHas(u,k){return!!(u&&u.elite&&u.elite.indexOf(k)>=0)}
function eliteCan(u){return!!(u&&u.side===1&&u.def&&!u.m&&!u.vip&&!u.ally&&!u.spawned&&!u.risen&&!u.fabled&&!u.grd&&!u.def.boss&&!u.def.endgame)}
function eliteOpts(u){return ELITEK.filter(k=>!eliteHas(u,k)&&(!ELITES[k].ok||ELITES[k].ok(u)))}
function eliteSeed(b){let h=(Math.imul((RNG_S^0x2545F491)>>>0,0x9E3779B1)^0x7f4a7c15)>>>0;for(const u of b.units)if(u.side===1){const s=String(u.eid||u.name);for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0}return h}
// gives u the modifiers in keys (the ones it can carry), applies them in ELITES order and prefixes its name
function eliteGive(u,keys){if(!u||!Array.isArray(keys))return u;const add=keys.filter((k,i)=>ELITES[k]&&keys.indexOf(k)===i&&!eliteHas(u,k)&&(!ELITES[k].ok||ELITES[k].ok(u)));if(!add.length)return u;
 u.flags=Object.assign({},u.flags);u.abs=(u.abs||[]).slice();const all=(u.elite||[]).concat(add);u.elite=ELITEK.filter(k=>all.indexOf(k)>=0);
 for(const k of ELITEK)if(add.indexOf(k)>=0)ELITES[k].apply(u);
 if(!u.baseName)u.baseName=u.name;const dn=u.def&&u.def.n?String(u.def.n).toLowerCase():'';
 if(!dn||u.baseName.toLowerCase().endsWith(dn))u.name=ELITES[u.elite[0]].n+' '+elLc(u.baseName);   // a proper name (a contract's named leader) keeps it
 return u}
function eliteSetup(b,o){if(!b)return;
 for(const u of b.units)if(u.elRos){eliteGive(u,u.elRos);delete u.elRos}   // a fixed roster's own elites
 const P=b.elitePlan;if(!P||!(P.E>0))return;
 const cand=b.units.filter(eliteCan);if(!cand.length)return;const R=mulberry(eliteSeed(b)),cost=u=>eliteCost(u.eid,u.f)*(u===b.bossU?2:1);
 const cap=u=>elKey(u)&&P.p>=ELITE.two&&P.D>=1?2:1,maxN=Math.max(1,Math.round(cand.length*ELITE.maxPer));let rem=P.E,n=0;
 for(let g=0;g<64&&rem>0&&n<maxN;g++){const C=cand.filter(u=>(u.elite?u.elite.length:0)<cap(u)&&eliteOpts(u).length);if(!C.length)break;
  let tot=0;for(const u of C)tot+=cost(u);let x=R()*tot,u=C[C.length-1];for(const v of C){x-=cost(v);if(x<=0){u=v;break}}
  const ks=eliteOpts(u),k=ks[Math.min(ks.length-1,Math.floor(R()*ks.length))],c=ELITES[k].w*cost(u);
  if(c>rem&&R()>=rem/c)break;rem-=c;eliteGive(u,[k]);n++}
 b.eliteN=n}
/* ---- the rules' hooks ---- */
// hurt(): a weapon or spell blow on a warded elite strikes the ward first. Returns what is left of the damage.
function eliteWard(t,dmg){if(!(t.ward>0)||!(dmg>0))return dmg;const w=Math.min(t.ward,dmg);t.ward-=w;float(t,'Ward −'+w,'#8fd8ff');
 if(t.ward<=0){t.ward=0;float(t,'Ward broken','#ffd27a');say(`${t.name}'s ward breaks.`)}FX.emit('status',{t,key:'eward',n:t.ward});return dmg-w}
// strike() and forecast(): the statuses a blow of u applies, its venom and hex added
function eliteSt(u,a){const st=Object.assign({},a&&a.status||{});if(!u||!u.elite||!a||a.noDmg||a.split)return st;
 if(eliteHas(u,'venom'))st.poison=Math.max(st.poison||0,2);if(eliteHas(u,'hex'))st.hex=Math.max(st.hex||0,2);return st}
const eliteBoomDmg=u=>Math.round(ELITE.boom[0]+ELITE.boom[1]*(u.hpMax||0));
const eliteXpK=e=>1+ELITE.xp*(e&&e.elite?e.elite.length:0);
const eliteLootCh=(e,base)=>Math.min(ELITE.lootMax,base+ELITE.loot*(e&&e.elite?e.elite.length:0));
function eliteLootPick(e,L){const S=L.slice().sort((x,y)=>((ITEMS[y]&&ITEMS[y].price)||0)-((ITEMS[x]&&ITEMS[x].price)||0)||(x<y?-1:x>y?1:0));return pick(S.slice(0,Math.max(1,Math.ceil(S.length/2))))}
// the events: Bloodthirsty and Thorned on 'hit', Volatile and Splitting on 'death' (synchronous, inside the blow that caused them)
function eliteEvent(type,d){const b=B;if(!b||!b.units||!d)return;
 if(type==='hit'){const u=d.u,t=d.t;if(!u||!t||u===t||u.side===t.side)return;
  if(u.elite&&u.alive&&d.dmg>0&&u.hp<u.hpMax&&eliteHas(u,'bloodthirsty'))healUnit(u,Math.min(u.hpMax-u.hp,Math.max(1,Math.round(d.dmg*ELITE.bloodHeal))));
  if(t.elite&&u.alive&&!b.elThorn&&mdist(u,t)===1&&eliteHas(t,'thorns')){const n=Math.round(((d.dmg|0)+(d.armor|0))*ELITE.thorns);if(n>0){b.elThorn=1;try{float(u,'Thorns','#9bd96f');hurt(u,n,1,null,{pierce:1})}finally{b.elThorn=0}}}}
 else if(type==='death'){const t=d.t;if(!t||!t.elite||t.elDone)return;t.elDone=1;
  if(eliteHas(t,'volatile')){const n=eliteBoomDmg(t);float(t,'Explodes!','#ff8a3c');say(`${t.name} explodes.`);eliteBoomFx(t);
   for(const x of b.units.slice())if(x.alive&&x!==t&&mdist(x,t)===1){hurt(x,n,.5,null);if(x.alive)addStatus(x,'burn',1)}}
  if(eliteHas(t,'splitting')&&t.eid&&EN[t.eid]&&typeof foeSpawn==='function'){let n=0;
   for(let i=0;i<2;i++){const e=foeSpawn(t.eid,t.f,t.c,t.r,{def:Object.assign({},EN[t.eid],{xp:0}),splitOf:t.id});if(!e)break;
    e.hp=e.hpMax=Math.max(1,Math.round(t.hpMax*ELITE.split));e.wpn=Object.assign({},e.wpn,{d:t.wpn.d.map(v=>Math.max(1,Math.round(v*ELITE.splitDmg)))});e.ap=0;e.name='Lesser '+elLc(EN[t.eid].n);
    if(e.ward)e.ward=0;float(e,'Split','#9bd96f');n++}
   if(n)say(`${t.name} splits in two.`)}}}
if(typeof FX==='object'&&FX&&!FX.eliteHook){const e0=FX.emit;FX.eliteHook=1;FX.emit=function(type,data){try{eliteEvent(type,data)}catch(e){if(!FX.err){FX.err=e;if(typeof console!=='undefined')console.warn('eliteEvent('+type+') failed: '+(e&&e.stack||e))}}return e0.call(FX,type,data)}}
// the explosion on screen (75-fx.js primitives; nothing when headless or instant)
function eliteBoomFx(t){try{if(typeof document==='undefined'||!(SPEEDF>0)||typeof ringFx!=='function'||typeof fxUP!=='function')return;const p=fxUP(t),x=p.x,y=p.y,h=p.h||24,sp=Math.max(.6,typeof fxSp==='function'?fxSp():1);
 for(let i=0;i<3;i++)ringFx(x,y-h*.2,6,46+i*8,520*sp,i&1?R_WHITE:R_FIRE,i*60*sp,.5,2);if(typeof glowFx==='function'){glowFx(x,y-h*.4,120,'E',.85,420);glowFx(x,y-h*.4,60,'r',.6,160)}
 if(typeof spawn==='function'&&typeof K_SQ!=='undefined')for(let i=0;i<(typeof fxN==='function'?fxN(36):36);i++){const a=Math.random()*6.283,v=Math.random()*260+100;spawn(i%3?K_TRAIL:K_SQ,R_FIRE,x+Math.cos(a)*6,y-h*.4+Math.sin(a)*3,Math.cos(a)*v,Math.sin(a)*v*.5,Math.random()*.4+.3,i&1?2:1,0,2)}
 if(typeof fxShake==='function')fxShake(5)}catch(e){}}
/* ---- Blinking: one rift step a battle (the AI picks the tile: a melee elite lands beside a back-liner or a wounded foe, a ranged one slips clear) ---- */
AB.eblink={foe:1,n:'Blink',d:'Vanishes and reappears up to 5 tiles away, over anything. Once a battle.',ap:2,fat:0,rng:5,tgt:'move',leap:1,uses:1,fx:'blink',
 ai(u,X){const free=(c,r)=>inb(c,r)&&B.tiles[key(c,r)].t!=='block'&&B.tiles[key(c,r)].t!=='haz'&&!unitAt(c,r);let best=null,bv=0;
  if(!u.back){if(X.adj.length)return[];for(const t of X.foes){if(!t.back&&t.hp>t.hpMax*.5)continue;for(const [x,y] of DIRS){const c=t.c+x,r=t.r+y;if(!free(c,r)||Math.abs(c-u.c)+Math.abs(r-u.r)>5)continue;
     const v=14+(t.back?6:0)+(1-t.hp/t.hpMax)*8-(X.thr?X.thr[key(c,r)]*.15:0);if(v>bv){bv=v;best=key(c,r)}}}}
  else{const d0=X.near(u);if(d0>1)return[];for(let r=u.r-5;r<=u.r+5;r++)for(let c=u.c-5;c<=u.c+5;c++){const m=Math.abs(c-u.c)+Math.abs(r-u.r);if(!m||m>5||!free(c,r))continue;
    const d=X.nearTile(c,r);if(d<=2||d>u.wpn.rng)continue;const v=12+d*3-(X.thr?X.thr[key(c,r)]*.3:0)+B.tiles[key(c,r)].h;if(v>bv){bv=v;best=key(c,r)}}}
  return best!=null?[{k:best,v:bv}]:[]}};
/* ---- the ward as a status (unitStatuses lists u.ward as 'eward') ---- */
if(typeof STATUS==='object'&&STATUS&&!STATUS.eward)STATUS.eward={n:'Ward',d:'A ward soaks blows and spells before armor. The number is what it can still take.',icon:'el-shielded',good:1};
/* ---- presentation ---- */
function eliteEsc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function eliteIc(n,size){return typeof pxIcon==='function'?pxIcon(n,size||16,'pxi'):''}
function eliteLines(u){return(u&&u.elite||[]).filter(k=>ELITES[k]).map(k=>({k,n:ELITES[k].n,d:ELITES[k].d(u),icon:ELITES[k].icon}))}
// the battle chip: one small icon a modifier, its effect in the title
function eliteChip(u){const L=eliteLines(u);if(!L.length)return'';return'<span class="uel" title="'+eliteEsc('Elite: '+L.map(x=>x.n+': '+x.d).join(' · '))+'">'+L.map(x=>eliteIc(x.icon,16)).join('')+'</span>'}
// the inspect card: every modifier with its exact effect, and the ward left
function eliteInsHTML(u){const L=eliteLines(u);if(!L.length)return'';const ic=n=>typeof insIc==='function'?insIc(n):eliteIc(n,16);
 return L.map(x=>`<div class="ins-ab ins-s bd ins-el">${ic(x.icon)}<div><b>${eliteEsc(x.n)}</b>${x.k==='shielded'?`<i>${u.ward>0?'ward '+u.ward+'/'+u.wardMax:'broken'}</i>`:x.k==='blink'?`<i>${u.usedN&&u.usedN.eblink?'spent':'ready'}</i>`:''}<span>${eliteEsc(x.d)}</span></div></div>`).join('')}
// the forecast: what the elite does to this blow (the ward is already inside the figures)
function eliteFcHTML(u,t,a,f){if(!t||!t.elite||!a||a.noDmg)return'';let h='';const sd=(ic,col,title,v)=>'<span class="sd" style="--sc:'+col+'" title="'+eliteEsc(title)+'">'+eliteIc(ic,16)+(v!=null?'<b>'+v+'</b>':'')+'</span>';
 if(t.ward>0)h+=sd('el-shielded','#8fd8ff','Ward '+t.ward+': the blow strikes the ward first (already counted)',t.ward);
 if(eliteHas(t,'thorns')&&mdist(u,t)===1&&!a.split)h+=sd('el-thorns','#9bd96f',u.name+' takes back a quarter of what this blow does, through armor');
 if(f&&f.kill){if(eliteHas(t,'volatile'))h+=sd('el-volatile','#ff8a3c','Volatile: it explodes when it dies, '+eliteBoomDmg(t)+' to everyone beside it',eliteBoomDmg(t));
  if(eliteHas(t,'splitting'))h+=sd('el-splitting','#9bd96f','Splitting: two lesser copies rise when it dies')}
 return h}
/* the mark over the unit: a small gold-rimmed badge left of its bars (painted at device pixels on Detail High; a 7x7 pixel diamond on Low) */
const EL_MARK=['...0...','..0d0..','.0dcb0.','0dcgcb0','.0bcb0.','..0b0..','...0...'],EL_MARK2=['...0...','..0d0..','.0dee0.','0deced0','.0ded0.','..0d0..','...0...'];
let EL_MC=null,EL_MC2=null;
function eliteMark(q,u,x0,top,bh,o){const two=u.elite.length>1,cy=top+(bh>>1)-1,cx=x0-5;
 if(typeof hdArt==='function'&&hdArt()&&typeof pkCanvas==='function'){const T=q.getTransform(),sy=Math.abs(T.d)||1,N=Math.max(9,Math.min(Math.round(9*sy),Math.round(18*(typeof dpr==='number'?dpr:1)))),c=pkCanvas(two?'el-mark2':'el-mark',N);
  if(c){q.save();q.setTransform(1,0,0,1,0,0);q.imageSmoothingEnabled=true;q.drawImage(c,Math.round(T.a*cx+T.c*cy+T.e-N/2),Math.round(T.b*cx+T.d*cy+T.f-N/2));q.restore();return}}
 const c=two?EL_MC2||(EL_MC2=px(EL_MARK2)):EL_MC||(EL_MC=px(EL_MARK));if(c)q.drawImage(c,Math.round(cx-3),Math.round(cy-3))}
/* ---- icons: 16 px pixel fallbacks (Detail Low) and paintings (Detail High) ---- */
const EL_PX={
 'el-mark':['................','................','................','.......00.......','......0dd0......','.....0dccb0.....','....0dcggcb0....','...0dcgghgcb0...','...0bcggggcb0...','....0bcggcb0....','.....0bccb0.....','......0bb0......','.......00.......','................','................','................'],
 'el-hulking':['................','................','.....ttt........','....tsstt.......','....tsstu.......','....ttttu.......','.....tuu..ttt...','.....tt..tsstt..','.....ttttsssttu.','....tsssssttttu.','....tsssstttuu..','....ttttttuuu...','.....tttuuu.....','......uuu.......','................','................'],
 'el-shielded':['................','......xxxx......','....xxFFFFxx....','...xFFxxxxFFx...','..xFxx....xxFx..','..xFx.XXXX.xFx..','.xFx.XqqqqX.xFx.','.xFx.XqrrqX.xFx.','.xFx.XqqqqX.xFx.','.xFx..XqqX..xFx.','..xFx..XX..xFx..','..xFxx....xxFx..','...xFFxxxxFFx...','....xxFFFFxx....','......xxxx......','................'],
 'el-armoured':['................','................','...pp......pp...','..pqqp....pqqp..','..pqqqppppqqqo..','...pqqqqqqqqo...','...pqqrqqqqqo...','...pqqqqqqqqo...','...ppqqqqqqoo...','....pqqqqqqo....','....pqqppqqo....','....ppqqqqoo....','.....pqqqqo.....','......oooo......','................','................'],
 'el-regen':['................','................','......AAAA......','......AAAB......','......AAAB......','......AAAB......','..AAAAAAAAAAAA..','..AArAAAAAAAAB..','..AAAAAAAAAAAB..','..BBBBAAAABBBB..','......AAAB......','......AAAB......','......AAAB......','......BBBB......','................','................'],
 'el-fast':['................','................','................','..dd....dd......','..ddd...ddd.....','...ddd...ddd....','....cdd...cdd...','.....cdd...cdd..','.....cdd...cdd..','....cdb...cdb...','...cdb...cdb....','..cdb...cdb.....','..cb....cb......','................','................','................'],
 'el-blink':['................','................','.....CCCCC......','....CDDDDDCC....','...CD.....DC....','...CD.CCC..DC...','..CD.CD.DC.DC...','..CD.CD.CD.DC...','..CD.CDDD..DC...','..CD.......DC...','...CD.....DC....','...CCDDDDDC.....','.....CCCCC..r...','...........rrr..','............r...','................'],
 'el-unstoppable':['................','................','................','.pp..........pp.','.pqp........pqo.','..pqp......pqo..','...pqpppppppqo..','...pqqqqqqqqqo..','..ppqqqrqqqqqoo.','..pqqqqqqqqqqqo.','..oooqqqqqqqooo.','....oqqqqqqqo...','....ooooooooo...','................','................','................'],
 'el-bloodthirsty':['................','.......g........','......ghg.......','......ghg.......','.....ghhgg......','.....ghggg......','....ghgggggf....','....ggggggggf...','...gggggggggf...','...ggrggggggf...','...ggggggggff...','....ggggggff....','....gggggfff....','.....ffffff.....','................','................'],
 'el-berserk':['................','................','..ggg......ggg..','..gfgg....ggfg..','...gfgg..ggfg...','....gggggggg....','.....gggggg.....','....gglgglgg....','....ggggggggf...','...gggfggfgggf..','...gggggggggff..','....gglllgggf...','.....ggggggff...','......fffff.....','................','................'],
 'el-venom':['................','.......A........','......AAA.......','......AvA.......','.....AvAAA......','.....AvAAA......','....AvAAAAAB....','....AAAAAAAAB...','...AAAAAAAAAB...','...AArAAAAAAB...','...AAAAAAAABB...','....AAAAAABB....','.....AABBBB.....','......BBBB......','................','................'],
 'el-hex':['................','................','.......CC.......','......CDDC......','..CCCCDCCDCCCC..','..CDDDDCCDDDDC..','...CDC.CC.CDC...','....CDCCCCDC....','.....CDDDDC.....','....CDCCCCDC....','...CDC.CC.CDC...','..CDDDDCCDDDDC..','..CCCCDCCDCCCC..','......CDDC......','.......CC.......','................'],
 'el-sharp':['................','................','................','................','.....llllll.....','...lllmmmmlll...','..llm.XXXX.mll..','.llm.XxxrxX.mll.','.llm.XxxxxX.mll.','..llm.XXXX.mll..','...lllmmmmlll...','.....llllll.....','................','................','................','................'],
 'el-commander':['................','................','................','..c....c....c...','..cc..ccc..cc...','..cdc.cdc.cdc...','..cdccdddccdc...','..cdddddddddc...','..cddgddgddbc...','..cdddddddddb...','..cbbbbbbbbbb...','..cdddddddddb...','..bbbbbbbbbbb...','................','................','................'],
 'el-thorns':['................','.......w........','.......vw.......','..w...vvw...w...','..vw.vvvvw.vw...','...vvvvvvvvw....','...vvAAAAvvw....','.wvvAAAAAAvvww..','..vvAAvAAAvvw...','...vvAAAAvvw....','...vvvvvvvvw....','..vw.vvvvw.vw...','..w...vvw...w...','.......vw.......','.......w........','................'],
 'el-volatile':['................','..........E.....','.........EdE....','..........jE....','.........j......','......GGjGG.....','....GGGGGGGGG...','...GGoGGGGGGGG..','...GooGGGGGGGG..','...GoGGGGGGGGG..','...GGGGGGGGGGG..','...GGGGGGGGGGG..','....GGGGGGGGG...','......GGGGG.....','................','................'],
 'el-splitting':['................','................','.....vvv.vvv....','....vAAv.vAAv...','...vAAAv.vAAAw..','...vArAv.vAAAw..','..vAAAAv.vAAAAw.','..vAAAAv.vAAAAw.','..vAAAAv.vAAAAw.','..vAAAAv.vAAAAw.','...vAAAv.vAAAw..','...vAAAv.vAAww..','....vwwv.vwww...','.....www.www....','................','................']};
EL_PX['el-mark2']=EL_PX['el-mark'].map(r=>r.replace(/g/g,'d').replace(/h/g,'e'));
for(const n in EL_PX){if(typeof ICONS==='object'&&ICONS&&!ICONS[n]){ICONS[n]=typeof _icOutline==='function'?_icOutline(EL_PX[n]):EL_PX[n];if(typeof icCss==='function')icCss(n)}}
if(typeof PAINT==='object'&&PAINT&&typeof pkFill==='function'){const P=PAINT;
 // the mark: a ruby diamond in a gold setting (two modifiers: all gold, a glint)
 const mark=(g,gem)=>{pkFill(g,pkPoly([16,1.5,30.5,16,16,30.5,1.5,16]),'gold',{k:1.6});pkGem(g,16,16,9.6,gem,'diamond')};
 P['el-mark']=g=>mark(g,'blood');P['el-mark2']=g=>{mark(g,'aura');pkPost(g=>pkGlint(g,22,8,4))};
 P['el-hulking']=g=>{const A=pkTube([9,26,8.5,15,12,9,18,8.6],[7.4,6],'round');pkFill(g,A,'skin',{k:1.8});pkFill(g,pkCirc(19.5,12.6,7),'skin',{ball:1,k:1.4});
  pkFill(g,pkCirc(23.5,8.4,4.6),'skin',{ball:1,k:1,inside:(g,m)=>pkLine(g,'M21 7 L26 7 M21 9.5 L26 9.5',.7,m[0],.6)});pkHi(g,'M7.5 22 Q7.2 16 10 12',1.4,.55)};
 P['el-shielded']=g=>{pkFill(g,pkS('M16 2 A14 14 0 1 1 15.99 2 Z M16 6.2 A9.8 9.8 0 1 0 16.01 6.2 Z'),'mana',{rule:'evenodd',k:1.2});pkShield(g,16,16.6,{kind:'heater',w:11,h:12.5,mat:'steel',rim:'silver',rimW:1.3});pkPost(g=>pkGlint(g,9,7,3.4))};
 P['el-armoured']=g=>{pkFill(g,pkS('M5 6 L11 4 Q16 7.5 21 4 L27 6 L25.5 16 Q24.5 25 16 29 Q7.5 25 6.5 16 Z'),'steel',{k:1.6,inside:(g,m)=>{pkLine(g,'M16 8 L16 27',.9,m[1],.8);pkLine(g,'M9 14 Q16 17 23 14 M9.5 20 Q16 23 22.5 20',.8,m[1],.75);pkHi(g,'M8 8 L9.5 18',1.3,.6)}});
  for(const [x,y] of [[8,7.4],[24,7.4]])pkFill(g,pkCirc(x,y,1.3),'brass',{ball:1,k:.4,lw:.6})};
 P['el-regen']=g=>{pkFill(g,pkS('M12.5 3 L19.5 3 L19.5 12.5 L29 12.5 L29 19.5 L19.5 19.5 L19.5 29 L12.5 29 L12.5 19.5 L3 19.5 L3 12.5 L12.5 12.5 Z'),'chi',{k:1.6,inside:(g,m)=>pkHi(g,'M14.5 5.5 L14.5 13 M5.5 14.5 L11 14.5',1.3,.7)})};
 P['el-fast']=g=>{for(const x of [4,15])pkFill(g,pkPoly([x,5,x+6,5,x+14,16,x+6,27,x,27,x+8,16]),'aura',{k:1.2})};
 P['el-blink']=g=>{pkSwirl(g,16,16,13,'void',1.8);pkPost(g=>{pkGlint(g,25,24,4.2,'#efe2ff');pkGlint(g,8,8,2.6,'#efe2ff')})};
 P['el-unstoppable']=g=>{pkFill(g,pkS('M3 8 Q6 14 11 14 L21 14 Q26 14 29 8 Q29 15 25 18 L24 25 L8 25 L7 18 Q3 15 3 8 Z'),'iron',{k:1.6,inside:(g,m)=>{pkHi(g,'M9 16.5 L22 16.5',1.2,.5);pkLine(g,'M8 21 L24 21',.8,m[1],.8)}});pkPost(g=>pkGlint(g,11,17,2.8))};
 P['el-bloodthirsty']=g=>{pkDrop(g,16,29.5,27,'blood');pkFill(g,pkPoly([10.5,17,13,17,11.8,22.5]),'white',{k:.4,lw:.7});pkFill(g,pkPoly([19,17,21.5,17,20.2,22.5]),'white',{k:.4,lw:.7})};
 P['el-berserk']=g=>{pkFill(g,pkS('M5 4 Q9 11 12 12 L20 12 Q23 11 27 4 Q28 12 25 16 Q26 24 16 29 Q6 24 7 16 Q4 12 5 4 Z'),'cloth',{k:1.6,inside:(g,m)=>{pkLine(g,'M10 16.5 L14 18 M22 16.5 L18 18',1.6,PK.ink,.9);pkLine(g,'M11.5 23.5 Q16 21 20.5 23.5',1.4,PK.ink,.9)}});
  for(const x of [12,20])pkFill(g,pkCirc(x,19.2,1.3),'fire',{ball:1,k:.3,lw:.4})};
 P['el-venom']=g=>{pkDrop(g,16,29.5,27,'poison');pkPost(g=>pkSpec(g,12,18,2.2,.8))};
 P['el-hex']=g=>{pkFill(g,pkStarS(16,16.5,14,6,7.6),'void',{k:1.4});pkFill(g,pkCirc(16,16.5,4.6),'purple',{ball:1,k:.8});g.fillStyle=PK.ink;g.fill(pkCirc(16,16.5,1.8).p)};
 P['el-sharp']=g=>{pkFill(g,pkS('M2 16 Q16 3 30 16 Q16 29 2 16 Z'),'white',{k:1.2,inside:(g,m)=>{pkFill(g,pkCirc(16,16,6.4),'mana',{ball:1,k:.7});g.fillStyle=PK.ink;g.fill(pkCirc(16,16,2.8).p);pkSpec(g,13.8,13.6,2,.95)}});
  pkLine(g,'M16 1 L16 5 M16 27 L16 31',1.6,'#cfa443',.95)};
 P['el-commander']=g=>{pkFill(g,pkS('M3 9 L9.5 15 L16 5 L22.5 15 L29 9 L27 24 L5 24 Z'),'gold',{k:1.6,inside:(g,m)=>pkLine(g,'M6 20 L26 20',1.2,m[1],.8)});pkFill(g,pkRect(5,24,22,4,1),'gold',{k:.8});
  pkGem(g,16,20.2,2.6,'blood','round');for(const x of [3,16,29])pkFill(g,pkCirc(x,x===16?5:9,1.8),'gold',{ball:1,k:.4,lw:.7})};
 P['el-thorns']=g=>{pkFill(g,pkStarS(16,16,14.5,10,7.5),'green',{k:1.6});pkFill(g,pkCirc(16,16,7),'chi',{ball:1,k:1})};
 P['el-volatile']=g=>{pkFill(g,pkCirc(14,19,10.5),'dark',{ball:1,k:1.6,inside:()=>{}});pkFill(g,pkRect(16.5,6.5,5,4,1),'iron',{k:.6});pkFill(g,pkTube(pkQ(19,7,22,2,27,4,8),1.6,'round'),'wood',{k:.4,lw:.7});pkSpec(g,10,14.5,3.4,.55);
  pkPost(g=>{pkGlow(g,27.5,4,5.5,'#ffb12e',.85);pkGlint(g,27.5,4,4,'#fff6b8')})};
 P['el-splitting']=g=>{pkFill(g,pkS('M14.5 3 Q4 4 3.5 16 Q4 28 14.5 29 L12 22 L15 16 L12 10 Z'),'chi',{k:1.4});pkFill(g,pkS('M17.5 3 Q28 4 28.5 16 Q28 28 17.5 29 L20 22 L17 16 L20 10 Z'),'chi',{k:1.4});pkPost(g=>pkSpec(g,9,10,2.6,.7))};
}
