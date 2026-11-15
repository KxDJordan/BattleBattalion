/* ================= AI ================= */
/* aiTurn2(u) drives every AI-controlled unit: all enemies, the company in auto-battle, and the two test
   players (B.opts.pilot = 'naive' | 'sensible') that test/balance.js measures the game with.
   One engine, aiRun(u,P): up to AI_CAP decisions per turn. Each decision scores every "walk to tile s, then
   use ability a on target k" the unit can afford, plus plain moves and ending the turn:
     score = chance to hit x value of the hit (forecast() damage, armor stripped, kill chance, statuses,
             target priority, focus fire) + what else the remaining AP could do
             + worth of standing on s (threat from foes that can reach it, height, hazards, formation,
               closing the distance, the plan) - the free attack for leaving a foe's reach - resource cost
   The role profile P (AI_ROLE, from def.role or the merc's gear) and, for the company, the plan against the
   faction (AI_PLAN) set the weights. Nothing here draws from rnd(): the same battle state gives the same
   decision, so battles stay deterministic under the seeded stream. Hard caps: AI_CAP decisions, 3 walks.
   Arms: bow shots are scored as impossible from any tile beside an able foe (the ranged lock), so a locked archer weighs stepping
   clear (the free attack it draws is priced in; tumbles and blinks draw none) against drawing its sidearm. A swap is judged one
   decision ahead (aiSwapPlan: the swap is tried on a copy of the unit's state, then the best plan with the AP left is scored), and units
   with two weapons also weigh which one they hold at the end of the turn (aiHandV). Fighters like standing beside foe archers. Abilities
   are scored from their fields (hits, through, aoe, chain, status, heal, cleanse, party, rally, rest, buff, giveAP, move), so new ones
   are used without code here.
   Fatigue: hit chances (hitChance) carry both sides' tiredPen, a tired foe is a slightly better target (aiPrio), an action's fatigue is
   taxed by the penalty it would add (aiTire), rest abilities are worth more the more tired the unit is; Slippery (light armor) makes the
   first step of a turn free of free attacks, so it is not priced.
   Rivals: a rival company's merc (side 1 with u.m) is played by the same engine with its real abilities, its role read from its gear
   like the company's (bow or crossbow or firearm: sniper; an awake caster gift: caster; a raised shield: shield, the line's anchor; a
   polearm or greatsword: reach, the second rank) and its company's plan by personality (AI_RIVAL; never the company's hold). The
   company's sensible pilot fights it with AI_PLAN.rival. */
const AI_CAP=7,AI_LATE=9;
let AI_CLOCK=null;                       // set to a ()=>ms clock by the balance harness to measure decision cost
const AI_STAT={n:0,ms:0,max:0};
const AI_DBG={};   // tuning switches (test/balance.js --set "AI_DBG.x=1")
/* ---- the ranged lock (rangedLocked() in the rules; a stand-in here while the rules lack it) ----
   A unit with an able foe beside it cannot use a bow. aiBowAb: does ability a shoot a bow for u (spells never do).
   aiLockAt: would u be locked standing on tile k (u.c/u.r are moved there for the question and put back). */
const aiAble=e=>e.alive&&e.mor!==0&&!e.st.stun&&!e.gone;
function aiBowAb(u,a){if(typeof isRangedAtk==='function')return isRangedAtk(u,a);return !a.magic&&(a.needs==='bow'||(!!a.wpn&&!!u.wpn&&u.wpn.wt==='bow'))}
const aiRngW=w=>typeof isRangedW==='function'?isRangedW(w):!!(w&&w.wt==='bow');   // bows, crossbows, firearms
const aiUnloaded=u=>!!(u.wpn&&u.wpn.reload&&u.loaded===false);                  // a spent crossbow or firearm in hand
function aiLocked(u){if(typeof rangedLocked==='function')return !!rangedLocked(u);if(!aiRngW(u.wpn))return false;for(const e of B.units)if(e.side!==u.side&&aiAble(e)&&mdist(e,u)===1)return true;return false}
let AI_LM=null,AI_LMU=null;   // per decision: tiles beside an able foe of AI_LMU (set by aiScan)
function aiLockAt(u,k){if(u===AI_LMU&&AI_LM)return AI_LM[k]===1;const c=k%BW,r=(k/BW)|0;for(const e of B.units)if(e!==u&&e.side!==u.side&&aiAble(e)&&fdist(c,r,u.sz||1,e)===1)return true;return false}
// canUse as if u stood clear of every foe: a locked archer may still step away and shoot.
// The weapon u does not hold (its sidearm, or the main weapon while the sidearm is out), as a weapon object, or null.
function aiAltW(u){if(u.wpnAlt)return u.wpnAlt;if(u.m&&u.alt&&typeof ITEMS==='object'&&ITEMS[u.alt]&&ITEMS[u.alt].k==='w')return ITEMS[u.alt];return null}
// Does u carry a bow in either hand (its fighting role stays the archer's while the sidearm is out)?
function aiHasBow(u){if(aiRngW(u.wpn))return true;const w=aiAltW(u);return aiRngW(w)}
/* ---- the weapon swap: one look ahead ----
   aiHypo(u, fn): runs fn() with u's weapons swapped (swapWeapons() of the rules, the swap's AP paid) and puts every field of u back
   afterwards. Nothing reaches the scene or the log meanwhile, and nothing draws from rnd(). */
function aiHypo(u,fn){const snap=Object.assign({},u),abs=u.abs.slice(),buffs=u.buffs.slice(),res=Object.keys(u.res),b=B,fl=b.floats.length,lg=b.log;
 const e=FX.emit,f=FX.float,sy=FX.say,ui=FX.ui,noop=()=>{};FX.emit=noop;FX.float=noop;FX.say=noop;FX.ui=noop;
 try{if(!swapWeapons(u))return null;return fn()}
 finally{FX.emit=e;FX.float=f;FX.say=sy;FX.ui=ui;for(const k of Object.keys(u))if(!(k in snap))delete u[k];Object.assign(u,snap);u.abs=abs;u.buffs=buffs;for(const k of Object.keys(u.res))if(!res.includes(k))delete u.res[k];b.floats.length=fl;b.log=lg}}
/* Worth of the weapon in hand for the next turn from tile k (only for units with a second weapon, so the swap is judged on more than
   this turn's blows): a bow beside a foe is worth nothing, a melee weapon is worth what can reach a foe next turn. */
function aiHandV(X,k){const u=X.u,w=u.wpn,atk=X.atk,c=k%BW,r=(k/BW)|0,d=X.nearTile(c,r),ap=u.apMax||9;let n,f=1;
 const bow=aiRngW(w);if(bow){if(!(u.flags&&u.flags.noLock)&&aiLockAt(u,k))return 0;n=Math.max(1,Math.floor(ap/(atk.ap||4)));if(d>atk.rng+1)f=.6;
  if(w.reload){const rl=w.reload.ap||4;n=aiUnloaded(u)?Math.floor((ap-rl)/(atk.ap||4)):1;if(n<1){n=1;f*=.5}}}   // a reload weapon: one shot a turn at best, after reloading if spent
 else{const mv=Math.max(0,d-(w.rng||1))*2;if(mv>ap-(atk.ap||4))return(w.d[0]+w.d[1])/2*.06;n=Math.max(1,Math.floor((ap-mv)/(atk.ap||4)))}
 const sk=bow?eff(u,'rs'):eff(u,'ms'),hit=clamp((sk+(w.hit||0)-10)/100,.15,.9);
 return .3*(w.d[0]+w.d[1])/2*(1+(u.dmgB||0))*Math.min(3,n)*hit*f}
// Would swapping now (and then doing the best thing with the AP left) beat the best plan with the weapon in hand?
function aiSwapPlan(u,P,plan,X,best,walks,S){if(typeof swapWeapons!=='function'||!AB.swap||!u.abs.includes('swap')||S.swN>=2||S.justSw)return null;
 const a=abilityInfo(u,'swap');if(!canUse(u,a))return null;const alt=aiAltW(u);if(!alt)return null;
 // only where a swap can matter: a bow that is (or is about to be) useless, the bow back once clear, or a shield to raise or sling
 const bow=aiRngW(u.wpn),near=X.near(u),ab=aiRngW(alt);
 if(!(bow&&near<=2||ab&&near>1||aiUnloaded(u)&&near<=4||!bow&&!ab&&(u.slung||u.shield&&alt.two)&&near<=3))return null;
 const v=aiHypo(u,()=>{u.ap-=a.ap;const S2={fc:new Map(),X:null,stamp:0},X2=aiScan(u,P,plan,S2);if(!X2.foes.length)return null;return aiBest(u,X2,walks).v});
 if(v==null)return null;return v-(a.ap?1:.3)>best.v+2?a:null}
function aiCanUseFree(u,a){if(canUse(u,a))return true;if(!aiBowAb(u,a))return false;const c0=u.c,r0=u.r;u.c=-99;u.r=-99;try{return canUse(u,a)}finally{u.c=c0;u.r=r0}}
/* care: weight of expected damage taken on the end tile      form: liking for allies alongside
   high: liking for height (ranged)   adv: pull towards the enemy per tile   back: appetite for the back line */
const AI_ROLE={
 line:{care:.22,form:1.4,high:.3,adv:3,back:1},
 flanker:{care:.25,form:0,high:.3,adv:3,back:1.35},
 guard:{care:.2,form:1,high:.3,adv:3,back:1,ward:1},
 sniper:{care:1.1,form:.4,high:2.5,adv:2.5,back:1.1,shy:1},
 caster:{care:1.4,form:.5,high:1.5,adv:2.5,back:1.1,shy:1},
 beast:{care:.08,form:0,high:.2,adv:3,back:1.15},
 // mercs by their gear (aiProfile): a raised shield anchors the line, a polearm or greatsword works from the second rank
 shield:{care:.18,form:1.7,high:.3,adv:3,back:1},
 reach:{care:.3,form:1.2,high:.3,adv:2.8,back:1},
 boss:{care:.04,form:0,high:.2,adv:3,back:1}
};
/* The sensible player's answer to each faction. Every key is a tactic the pilot can be run without
   (test/balance.js ablates them one at a time):
     hunt     enemy types to go for first (the shaman, the necromancer, weavers, the chief)
     hold     stand on the deployment line and let them come (until round `holdR` or until nothing melee is coming)
     tight    shoulder to shoulder, no open flanks (against the pack)
     spread   keep gaps (against sweeps and blasts)
     weather  raise defences and trade carefully while orcs are fresh; kill them once they are winded
     volley   archers and casters shoot the enemy's shooters first
     dodge    leave telegraphed tiles
     screen   melee stays near the back line to catch blinkers and raiders
     lock     how much a fighter wants to stand beside a foe archer (its bow is useless while it is engaged); default .35
   Monsters update:
     burn     fire on the fire-weak (ents): fire abilities are worth that much more against them (burning also stops their regrowth)
     ground   roots and stuns on fliers (the wyvern): a rooted flier is Grounded and a stun breaks its dive */
const AI_PLAN={
 gob:{hunt:{gobsham:3.5}},
 undead:{hunt:{necro:3},press:1},
 beast:{hold:1,holdR:3,tight:.2},
 orc:{outlast:1,holdR:3},
 bandit:{hunt:{blead:1.6},lock:.8,hold:1,holdR:2},
 void:{spread:1,dodge:1,hunt:{vmage:1.6}},
 serpent:{hunt:{gserp:1.5,viper:1.3},lock:.8},
 ent:{burn:1.5,hunt:{elder:1.4}},
 ogre:{spread:1},
 wyvern:{dodge:1,spread:1,ground:1.5},
 // a rival company: mercs like ours. Take the bows away (lock), shoot their shooters first (volley). AI_RIVAL is the rival's own
 // answer to the company, by its personality (cutthroats go for the wounded and the back line harder).
 rival:{lock:.8,volley:1}
};
const AI_RIVAL={honour:{lock:.6,volley:1},cutthroat:{lock:.6,volley:1,cut:1},greedy:{lock:.5,volley:1},glory:{lock:.7,volley:1}};
// The plan a rival company's merc plays by (never the company's hold: that one reads the company's own edge).
function aiRivalPlan(u){const r=typeof battleRival==='function'?battleRival(u.rival||B.rival):null,p=r&&AI_RIVAL[r.pers]||AI_RIVAL.honour;return B.opts.rivalPlan||p}
/* Deadlock guard: the sum of every living unit's hitpoints is sampled once a round; if it has not changed for AI_STALL rounds,
   aiProfile makes every AI unit drop caution and advance, so two careful sides can never stand apart forever. */
const AI_STALL=12;
function aiStalled(){const b=B;if(!b||!b.units)return false;const S=b.aiStall||(b.aiStall={r:-1,sum:-1,since:0});if(S.r!==b.round){S.r=b.round;let sum=0;for(const x of b.units)if(x.alive)sum+=x.hp;if(sum!==S.sum){S.sum=sum;S.since=b.round}}return b.round-S.since>=AI_STALL}
function aiPlan(u){const b=B;if(u.side!==0)return null;const p=b.opts.plan||AI_PLAN[b.opts.f]||(b.rival?AI_PLAN.rival:null)||{};return b.obj&&typeof objPlan==='function'?objPlan(p,u):p}   // a battle objective reshapes the plan (16-contracts.js)
function aiProfile(u){let role=u.role;
 if(!role){role='line';if(aiHasBow(u))role='sniper';else if(u.abs.some(id=>{const a=AB[id];return a&&a.magic&&a.rng>1&&a.cost&&u.res[a.cost[0]]&&u.res[a.cost[0]].cur>=a.cost[1]}))role='caster';
  else if(u.m&&!AI_DBG.noroles){if(u.shield)role='shield';else if(u.wpn&&u.wpn.rng>=2&&!aiRngW(u.wpn))role='reach'}}   // mercs: the shield line, the second-rank polearm
 const P=Object.assign({role},AI_ROLE[role]||AI_ROLE.line);if(u.def&&u.def.dive)P.back=1.8;if(u.fly&&u.side===1)P.back=Math.max(P.back,1.7);   // fliers go over the line for the casters and archers
 if(u.def&&u.def.flee&&u.hp<u.hpMax*u.def.flee)P.care*=2.5;            // the skittish hang back when hurt, but they keep fighting
 if(B.round>AI_LATE){P.care*=.3;P.shy=0}                                // a long battle: everyone presses, so it ends
 if(aiStalled()){P.care=0;P.shy=0;P.form=0;P.high=0;P.back=1;P.adv=Math.max(P.adv,6)}   // deadlock: nobody has bled for a while, so everyone closes in
 return P}
async function aiTurn2(u){const b=B;if(!b||!u||!u.alive)return;
 if(u.ally)return aiRun(u,aiProfile(u),null);   // a caravan guard fighting beside the company (42-caravans.js): its own judgement, not the company's plan
 if(u.side===0&&b.opts.pilot==='naive')return AI_NAIVE(u);
 if(u.side===0)return AI_SENSIBLE(u);
 if(u.m)return aiRun(u,aiProfile(u),aiRivalPlan(u));   // a rival company's merc: the engine with its own gear's role and the rival's plan
 return aiRun(u,aiProfile(u),null)}
// The scripted competent player: the engine with the company's roles and the plan against this faction.
async function AI_SENSIBLE(u){return aiRun(u,aiProfile(u),aiPlan(u)||{})}
// The careless player: walk at the nearest foe and hit it with the basic attack. An archer with a foe in its face draws its sidearm
// (and puts the bow back up once nobody is next to it); that much every player works out.
async function AI_NAIVE(u){const b=B;let sw=0;for(let n=0;n<6&&u.alive&&B===b&&!b.over;n++){const foes=b.units.filter(x=>x.alive&&x.side!==u.side);if(!foes.length)return;
  if(!sw&&typeof canSwap==='function'&&AB.swap&&canSwap(u)){const sa=abilityInfo(u,'swap'),alt=aiAltW(u),lk=aiLocked(u);
   if(canUse(u,sa)&&alt&&((lk&&!aiRngW(alt)&&u.ap>=sa.ap+(alt.ap||4))||(!lk&&aiRngW(alt)&&!aiRngW(u.wpn)&&!foes.some(f=>mdist(f,u)<=1)))){sw=1;await aiUse(u,sa,key(u.c,u.r));if(B!==b||b.over)return;continue}}
  if(aiUnloaded(u)&&AB.reload&&u.abs.includes('reload')){const ra=abilityInfo(u,'reload');if(canUse(u,ra)){await aiUse(u,ra,key(u.c,u.r));if(B!==b||b.over)return;continue}}   // a spent crossbow: everyone reloads
  const atk=abilityInfo(u,'attack'),vt=validTargets(u,atk),inr=foes.filter(f=>vt.has(key(f.c,f.r))).sort((x,y)=>mdist(u,x)-mdist(u,y)||x.hp-y.hp||x.id-y.id);
  if(inr.length&&canUse(u,atk)){await aiUse(u,atk,key(inr[0].c,inr[0].r));if(B!==b||checkEnd())return;continue}
  if(inr.length||u.rooted||u.ap<2)return;
  const want=foes.some(f=>mdist(u,f)<=atk.rng)?1:atk.rng;              // foes in range but none in sight: close in until one is
  const D=dijkstra(u,99),st=key(u.c,u.r),tl=b.tiles;let best=st,bs=1e9;
  D.forEach((v,k)=>{if(v.air)return;const c=k%BW,r=(k/BW)|0;let dm=99;for(const f of foes){const d=fdist(c,r,u.sz||1,f);if(d<dm)dm=d}const sc=(dm>want?dm-want:0)*10+v.cost*.1+(tl[k].t==='haz'?(B&&B.round>AIHAZR?4:30):0);if(sc<bs){bs=sc;best=k}});
  if(best===st)return;await walkPath(u,pathTo(D,best));if(B!==b||!u.alive||key(u.c,u.r)===st)return;if(checkEnd())return}}
/* Uses an ability the way the rules do. Abilities with a mechanic of their own go through foeUse(); everything
   else through useAbility(), with its hand-back to the player (afterAction) held off: the AI's turn is not over. */
async function aiUse(u,a,k){const b=B;const fo=b.aiFoc||(b.aiFoc=[null,null]);if(a.tgt==='enemy'){const t=unitAt(k%BW,(k/BW)|0);if(t)fo[u.side]=t}
 if(typeof a.run==='function'){await foeUse(u,a,k);if(B===b)b.busy=true;return}
 if(a.foe&&typeof foeMark==='function')foeMark(u,a);
 const aa=typeof afterAction==='function'?afterAction:null;if(aa)afterAction=aiNoop;
 try{await useAbility(u,a,k)}finally{if(aa)afterAction=aa}
 if(B===b)b.busy=true}
function aiNoop(){}

/* ---- reading the board ---- */
const AIFORT=2,AIFORTR=6;   // siege defenders: rounds they hold their works, and how close the company may come before they sally
function aiScan(u,P,plan,S){const b=B,N=BW*BH,X=S.X||(S.X={thr:new Float32Array(N),sw:new Float32Array(N),goal:new Uint8Array(N),pv:new Float32Array(N),ps:new Int32Array(N)});
 X.u=u;X.P=P;X.plan=plan;X.at=key(u.c,u.r);X.foes=[];X.allies=[];X.adj=[];X.S=S;S.stamp=(S.stamp||0)+1;
 const lm=X.lm||(X.lm=new Uint8Array(N));lm.fill(0);AI_LM=lm;AI_LMU=u;
 for(const o of b.units){if(!o.alive)continue;if(o.side!==u.side){X.foes.push(o);if(mdist(o,u)===1)X.adj.push(o);if(o.mor!==0&&!o.st.stun)for(const [tc,tr] of unitTiles(o))for(const [x,y] of DIRS)if(inb(tc+x,tr+y)&&!occupies(o,tc+x,tr+y))lm[(tr+y)*BW+tc+x]=1}else if(o!==u)X.allies.push(o)}
 X.near=o=>{let m=99;for(const f of X.foes){const d=mdist(f,o);if(d<m)m=d}return m};
 const us=u.sz||1;X.nearTile=(c,r)=>{let m=99;for(const f of X.foes){const d=us===1&&(f.sz||1)===1?Math.abs(f.c-c)+Math.abs(f.r-r):fdist(c,r,us,f);if(d<m)m=d}return m};   // u standing at (c,r)
 X.frail=1+(1-u.hp/u.hpMax)*1.5;
 aiThreat(u,X);
 X.D=dijkstra(u,u.rooted?0:u.ap);
 X.hold=0;X.tele=null;X.brace=0;X.fresh=0;X.lead=-1;X.guard=plan&&plan.guard&&plan.guard.alive&&plan.guard!==u?plan.guard:null;
 // a siege: the foe keeps behind its stakes for the first two rounds, and comes out at once when the company closes in
 // (any of its swords within AIFORTR tiles of a defender): defenders that sit out a waiting player read as a broken AI
 X.fort=-1;if(u.side===1&&b.obj&&b.obj.k==='siege'&&b.round<=AIFORT&&!u.fly){let near=99;for(const f of X.foes)for(const o of b.units)if(o.alive&&o.side===1){const d=mdist(f,o);if(d<near)near=d}if(near>AIFORTR)X.fort=DEPLOY.e.front+1}
 // enemies come on together: until the lines meet, nobody runs more than a couple of rows ahead of the band
 if(u.side===1&&b.round<=6){let m=99,s=0,n=0;for(const o of X.allies){if(o.back)continue;s+=o.r;n++;for(const f of X.foes){const d=mdist(f,o);if(d<m)m=d}}
  if(n>=2&&m>3&&X.near(u)>3)X.lead=s/n+(P.back>1.2?3:2)}
 {const f=u.flags||{};X.shaky=u.side===0&&(f.badMor<0||(f.superst>0&&typeof TRAITF!=='undefined'&&TRAITF.superst.includes(b.opts&&b.opts.f)))}
 if(plan){
  // hold: nobody steps off the line until the enemy is on it; after contact the company fights within a short leash of its line
  if((plan.hold||plan.outlast)&&b.round<=(plan.holdR||5)&&X.foes.some(f=>f.wpn.rng<=2&&!f.back&&f.mor!==0&&!(f.st.root||f.rooted))){let m=99;for(const f of X.foes){const d=mdist(f,u);if(d<m)m=d;for(const o of X.allies){const e=mdist(f,o);if(e<m)m=e}}X.hold=m>2?2:1}
  // weather: with fresh orcs close and none on us yet, brace instead of walking into the charge
  if(plan.outlast){let near=0,adj=0;for(const f of X.foes)if(f.st.fury>1&&f.mor!==0){const d=mdist(f,u);if(d===1)adj++;else if(d<=6)near++}X.brace=near&&!adj?1:0;X.fresh=adj}
  if(plan.dodge&&b.tele&&b.tele.length){X.tele=new Set();for(const t of b.tele)if(t.u.side!==u.side)for(const k of t.keys)X.tele.add(k)}}
 const atk=abilityInfo(u,'attack');let want=atk.rng;X.atk=atk;
 X.abs=[];for(const id of ['attack'].concat(u.abs)){if(id!=='attack'&&!AB[id])continue;const a=id==='attack'?atk:abilityInfo(u,id);
  if(a.withdraw||a.swap||!(a.foe?foeReady(u,a,1):aiCanUseFree(u,a)))continue;X.abs.push(a);if(a.tgt==='enemy'&&a.magic&&a.rng>want)want=a.rng}
 X.want=want;X.hand=!!(AB.swap&&u.abs.includes('swap')&&aiAltW(u));X.reach=!aiRngW(u.wpn)&&atk.rng>=2;
 // the lock: a fighter that can stand beside a foe archer takes its bow away (the sensible player goes out of its way for it)
 X.lockW=!AI_DBG.nolockw&&want<=2&&!P.shy?(plan?plan.lock!=null?plan.lock:.35:.15):0;
 aiGoal(u,X);return X}
// Expected damage a foe deals to u per turn on each tile it can strike next turn.
function aiThreat(u,X){const th=X.thr,sw=X.sw;th.fill(0);sw.fill(0);const armK=u.arm>0?.75:1,bw=BW,bh=BH;
 for(const e of X.foes){let rng=e.wpn.rng,avg=(e.wpn.d[0]+e.wpn.d[1])/2,hit,n=Math.min(2,Math.floor(e.apMax/(e.wpn.ap||4)))||1,mag=null;
  for(const id of e.abs){const a=AB[id];if(a&&a.magic&&a.rng>1&&(!a.cost||(e.res[a.cost[0]]&&e.res[a.cost[0]].cur>=a.cost[1]))){mag=a;break}}
  if(mag){rng=mag.rng;avg=(mag.magic[0]+mag.magic[1])/2;hit=.7;n=Math.min(2,Math.floor(e.apMax/(mag.ap||4)))||1}
  else if(rng>1&&aiRngW(e.wpn)&&aiLocked(e)){const w=aiAltW(e);            // a locked archer: it fights with its sidearm, or steps clear and shoots less
   if(w&&w.rng<=1){rng=1;avg=(w.d[0]+w.d[1])/2*(e.dmgK||1);n=1;hit=clamp(eff(e,'ms')-eff(u,'md'),5,95)/100}else{n=.4;hit=clamp(eff(e,'rs')+(e.wpn.hit||0)-eff(u,'rd'),5,95)/100}}
  else{const sh=aiRngW(e.wpn);hit=clamp((sh?eff(e,'rs'):eff(e,'ms'))+(e.wpn.hit||0)-(sh?eff(u,'rd'):eff(u,'md')),5,95)/100}
  if(!mag&&e.wpn.reload)n=Math.min(n,aiUnloaded(e)&&(e.wpn.reload.ap||4)+(e.wpn.ap||4)>e.apMax?.5:1);   // a crossbow or firearm: one shot a turn, every other turn if it must reload first
  const reach=!mag&&rng>1&&!aiRngW(e.wpn);                                     // a polearm or greatsword: melee threat that reaches 2 tiles
  const dm=avg*(1+buffSum(e,'dmg')+(e.dmgB||0));e.aiW=dm*n*.55+(mag||e.back?6:0)+(e.def&&e.def.lead?8:0);
  if(e.st.stun||e.mor===0)continue;
  if(buffSum(e,'sw')&&mdist(e,u)>1)for(const [x,y] of DIRS)if(inb(e.c+x,e.r+y))sw[(e.r+y)*bw+e.c+x]+=dm*hit*armK+5;
  const d=dm*hit*armK,mv=e.rooted||e.st.root?0:Math.floor((e.apMax-(e.wpn.ap||4))/2.4),R=reach?rng+mv:rng>1?rng:1+mv,rr=reach?rng:1;
  const es=(e.sz||1)-1,r0=Math.max(0,e.r-R),r1=Math.min(bh-1,e.r+es+R),c0=Math.max(0,e.c-R),c1=Math.min(bw-1,e.c+es+R);
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){const m=es?tdist(c,r,e):(c>e.c?c-e.c:e.c-c)+(r>e.r?r-e.r:e.r-r);if(m>R||!m)continue;
   th[r*bw+c]+=rng>1&&!reach?d*n*.3:m<=rr?d*n:m<=rr+mv/2?d:d*.6}}}
// Path distance (ignoring units) from every tile to the nearest foe; foes the plan hunts count as closer.
function aiGoal(u,X){const g=X.goal,tl=B.tiles,bk=[],hunt=X.plan&&X.plan.press&&X.plan.hunt,melee=X.want<=2;g.fill(99);let any=false;
 if(hunt&&melee)for(const f of X.foes)if(hunt[f.eid]>=1.5){any=true;break}
 for(const f of X.foes){const o=any&&!(hunt[f.eid]>=1.5)?3:0;for(const [c,r] of unitTiles(f))if(inb(c,r))(bk[o]||(bk[o]=[])).push(key(c,r))}
 for(let d=0;d<bk.length&&d<64;d++){const q=bk[d];if(!q)continue;for(let i=0;i<q.length;i++){const k=q[i];if(g[k]<=d)continue;g[k]=d;const c=k%BW,r=(k/BW)|0,h=tl[k].h;
   for(const [a,b] of DIRS){const nc=c+a,nr=r+b;if(!inb(nc,nr))continue;const nk=nr*BW+nc;if(g[nk]<=d+1||tl[nk].t==='block'||h-tl[nk].h>1)continue;(bk[d+1]||(bk[d+1]=[])).push(nk)}}}}
// Worth of ending on tile k (higher is better). Cached per decision.
const AIHAZR=40;
function aiPos(X,k){if(X.ps[k]===X.S.stamp)return X.pv[k];const u=X.u,P=X.P,plan=X.plan,t=B.tiles[k],c=k%BW,r=(k/BW)|0;
 let v=-P.care*X.thr[k]*X.frail+P.high*t.h-(t.t==='haz'?(B&&B.round>AIHAZR?12:60):0);   // a long fight (AIHAZR rounds): walk through the fire rather than stand off foreverif(X.hand)v+=aiHandV(X,k);
 const sz=u.sz||1;let gk=X.goal[k];if(sz>1)for(let y=0;y<sz;y++)for(let x=0;x<sz;x++)if(inb(c+x,r+y))gk=Math.min(gk,X.goal[key(c+x,r+y)]);   // a footprint is as close as its nearest tile
 const g=gk>X.want?gk-X.want:0;
 if(X.hold===2){const front=DEPLOY.p.front;v-=(r<front-1?(front-1-r)*7:0)}else{v-=P.adv*g;if(X.hold===1){const front=DEPLOY.p.front;if(r<front-2)v-=(front-2-r)*5}}
 if(P.shy&&gk<=2)v-=6*(3-gk);
 if(X.reach&&gk===2)v+=2.5;                                      // a reach weapon likes the second rank: in reach, out of arm's length
 if(X.lead>=0&&r>X.lead)v-=5*(r-X.lead);
 if(X.fort>=0&&r>X.fort)v-=6*(r-X.fort);
 if(X.guard){const d=Math.abs(X.guard.c-c)+Math.abs(X.guard.r-r);if(d>3)v-=2*(d-3)}   // escort: stay within reach of the wagon

 let al=0,open=0,blk=0;
 for(const [a,b] of DIRS){const nc=c+a,nr=r+b;if(!inb(nc,nr))continue;const tt=B.tiles[nr*BW+nc];if(tt.t==='block'){blk++;continue}const o=unitAt(nc,nr);if(o&&o!==u&&o.alive&&o.side===u.side)al++;else if(!o||o===u)open++;
  else if(X.lockW&&aiRngW(o.wpn)&&aiAble(o)){let held=0;for(const q of X.allies)if(mdist(q,o)===1){held=1;break}v+=X.lockW*(o.aiW||10)*(held?.25:1)}}   // standing beside an archer locks its bow
 let form=P.form;if(plan){if(plan.tight&&!P.shy)form+=1.6*plan.tight;if(plan.spread)form=-2.5}
 v+=form*al;if(plan&&plan.tight&&!P.shy&&open>1)v-=2.5*plan.tight*(open-1);
 if(X.shaky)v+=al?1.5*al:-2;                                     // traits: a Craven (or Superstitious in the wrong fight) merc is no anchor: it keeps to its friends
 if(P.shy&&blk)v+=1.2;
 if(X.tele){if(sz>1){for(let y=0;y<sz;y++)for(let x=0;x<sz;x++)if(X.tele.has(key(c+x,r+y)))v-=90}else if(X.tele.has(k))v-=90}
 if(P.ward||(plan&&plan.screen&&!P.shy)){let m=99;for(const o of X.allies)if(o.back||o.role==='caster'||o.role==='sniper'){const d=Math.abs(o.c-c)+Math.abs(o.r-r);if(d<m)m=d}if(m<99&&m>2)v-=(P.ward?2:1.2)*(m-2)}
 X.ps[k]=X.S.stamp;return X.pv[k]=v}
function aiStatusVal(k,n,t){const W=t.aiW||10;let v;
 if(k==='stun')v=W*1.1+(t.dive?W*.8:0);else if(k==='root'||k==='webbed')v=t.fly&&k==='root'?W*.5*Math.min(2,n)+(t.dive?W*.6:0):t.wpn.rng>1||t.back?2:W*.35*Math.min(2,n);else if(k==='daze')v=W*.12;else if(k==='bleed')v=5*n;else if(k==='chill')v=W*.3;else if(k==='burn')v=(6+(t.fw?8*t.fw*1.5:0)+(t.def&&t.def.regen&&!(t.st.burn>0)?t.hpMax*t.def.regen*.6:0))*n;else if(k==='poison')v=5*n;else if(k==='hex')v=W*.3;
 else if(k==='marked')v=W*.12*Math.min(2,n);else if(k==='weak')v=W*.2*Math.min(2,n)/2+2;
 else if(k==='venom')v=10*n;else if(k==='web'||k==='grab'||k==='coiled'||k==='entangled')v=4;else v=3;
 return t.st[k]>0?v*.2:v}
// What a hit with a on t is worth, from forecast(). Cached for the unit's turn.
function aiHit(u,a,t,S){const id=a.id+'|'+t.id+'|'+t.hp+'|'+t.arm+'|'+(t.helm||0)+'|'+(t.shp||0),C=S.fc;let v=C.get(id);if(v)return v;
 const W=t.aiW||10;let hp=0,arm=0,kill=0,sv=0;
 if(a.split){const f=forecast(u,t,a);const sb=t.shb?(t.shb.md||0)+(t.shb.rd||0)*.3:10,gone=W*sb/45;   // a split shield takes its defense away for the rest of the battle
  v={v:f.shield?f.shield.max*.2+Math.min(1,f.shield.max/Math.max(1,f.shield.hp))*gone*.5+(f.shield.brk?(f.shield.sure?10:5)+W*.3+gone*.5:0):0,kill:0,kv:0};C.set(id,v);return v}
 /* The forecast's own arithmetic (fcDamage, fcSoak, headChance) at the low, middle and high roll, for a hit on the body and on
    the head: the same numbers forecast() shows the player, without walking every roll for every candidate. */
 let lo=0,hi=0,ign=1;const cr=typeof crushOf==='function'?crushOf(u,a):0;if(a.noDmg){}else if(a.magic){lo=a.magic[0];hi=a.magic[1];ign=a.ign||.5}else{const wd=a.dmgD||u.wpn.d;lo=wd[0];hi=wd[1];ign=(a.ignW!=null?a.ignW:u.wpn.ign||.2)+(a.ignB||0)}
 if(hi>0){const hc=headChance(u,t,a)/100,d0=fcDamage(u,t,a,lo),d1=fcDamage(u,t,a,(lo+hi)/2),d2=fcDamage(u,t,a,hi);
  for(let h=0;h<2;h++){const w=h?hc:1-hc;if(!(w>0))continue;const s0=fcSoak(t,d0,ign,!!h,a.pierce,cr),s1=fcSoak(t,d1,ign,!!h,a.pierce,cr),s2=fcSoak(t,d2,ign,!!h,a.pierce,cr);
   hp+=w*Math.min(t.hp,(s0.hp+2*s1.hp+s2.hp)/4);arm+=w*(s0.arm+2*s1.arm+s2.arm)/4;kill+=w*(s0.hp>=t.hp?1:s2.hp<t.hp?0:(s2.hp-t.hp+1)/(s2.hp-s0.hp+1));
   if(!t.fearless&&s2.hp>=heavyHit(t))sv+=w*3;if(a.bleed&&s1.hp>0)sv+=w*aiStatusVal('bleed',a.bleed,t)}}
 if(a.status)for(const k in a.status)sv+=aiStatusVal(k,a.status[k],t);
 if(!a.magic&&u.wpn.stun&&!(a.status&&a.status.stun))sv+=u.wpn.stun*aiStatusVal('stun',1,t);
 if(u.onhit)sv+=u.onhit.ch*aiStatusVal('root',u.onhit.root,t);
 const kn=a.kb||u.kbN||0;if(kn&&!buffSum(t,'indom'))sv+=1.5*(a.kb?1:u.kbCh||0);
 if(a.pull&&!buffSum(t,'indom'))sv+=t.back||aiRngW(t.wpn)?W*.25:1.5;                   // a hook drags an archer or caster into reach
 if(a.scare&&!t.fearless&&t.mor>0)sv+=W*.12;
 const pl=S.X&&S.X.plan;let mul=1;if(pl){if(pl.burn&&t.fw&&fireAb(a))mul+=pl.burn*.5;if(pl.ground&&t.fly&&a.status&&(a.status.root||a.status.stun))sv*=1+pl.ground}   // the plan: burn the ents, ground the wyvern
 v={v:(hp+arm*.5)*mul+(1-kill)*sv,kill,kv:16+W*.7};C.set(id,v);return v}
/* Where a knockback from u standing at (sc,sr) would throw t, and what that is worth: thrown into one of t's friends (crash damage to
   both), off a height (6 a step), into a hazard (12), against a wall (8). A thrown friend of u costs. Cheap: walks at most a.kb tiles. */
function aiKbV(u,a,t,sc,sr,X){if(kbImmune(t))return 0;const s=u.sz||1,mc=sc+(s-1)/2,mr=sr+(s-1)/2;let dc=t.c-mc,dr=t.r-mr;if(Math.abs(dc)>=Math.abs(dr)){dc=Math.sign(dc)||1;dr=0}else{dr=Math.sign(dr);dc=0}
 let c=t.c,r=t.r,v=0;const cr=a.crash||0;
 for(let i=0;i<a.kb;i++){const nc=c+dc,nr=r+dr;if(!inb(nc,nr)){v+=4;break}const tl=B.tiles[key(nc,nr)],h=B.tiles[key(c,r)].h;if(tl.t==='block'||tl.h>h+1){v+=4;break}
  const x=unitAt(nc,nr);if(x&&x!==u){if(x!==t)v+=cr?(x.side!==u.side?cr*1.6+4:-cr):4;break}if(h>tl.h)v+=6*(h-tl.h)*1.2+3;if(tl.t==='haz')v+=12;c=nc;r=nr}
 return v}
/* Fatigue (tiredPen in the rules): what spending f more fatigue now costs u in hit points of defense and to-hit until it recovers,
   priced lightly (the hit chances aiChance reads already hold the current penalty on both sides). 0 for units that do not tire. */
const aiTire=(u,f)=>typeof tiredPen==='function'&&f>0&&u.fatMax<999?tiredPen({fat:u.fat+f,fatMax:u.fatMax})-tiredPen(u):0;
function aiPrio(X,t){const u=X.u,P=X.P,plan=X.plan;let p=1;const fo=B.aiFoc&&B.aiFoc[u.side];
 if(u.def&&u.def.pack){let n=0;for(const o of X.allies)if(o.def&&o.def.pack&&mdist(o,t)===1)n++;p+=.35*Math.min(2,n);if(t.st.harried)p+=.3;       // the pack goes for whoever a wolf already has by the leg,
  else if(!n){let s=0;for(const o of X.foes)if(o!==t&&mdist(o,t)===1)s++;if(s<2)p+=.3}}                                                         // and for prey that stands alone
 if(fo===t)p+=.15;if(t.back||t.role==='caster'||t.role==='sniper')p*=P.back;if(t.vip)p*=u.side===1?1.7:0;   // foes go for the escorted wagon
 if(plan){const h=plan.hunt&&plan.hunt[t.eid];if(h)p*=h;if(plan.volley&&P.shy&&(t.role==='sniper'||t.role==='caster'||(t.m&&t.back)))p*=1.5;if(plan.cut&&t.hp<t.hpMax*.5)p*=1.25;
  if(plan.outlast&&t.def&&t.def.tire)p*=t.st.winded||t.st.spent?1.3:1}
 if(t.st.ward)p*=.6;if(t.mor===0)p*=.5;if(typeof tiredPen==='function'&&t.fatMax<999)p*=1+tiredPen(t)*.012;   // a tired foe is easier to hit and slower to hit back
 return p}
// Chance (0..1) that a used from tile s hits t; 0 when the shot is blocked from there.
let AI_RISK=0;   // set by aiChance: what a miss from there costs (a stray shot into an ally, a riposte)
function aiChance(u,a,t,s){const c0=u.c,r0=u.r;let p;AI_RISK=0;if(s!==c0+r0*BW){u.c=s%BW;u.r=(s/BW)|0}
 try{if(!AI_DBG.nolock&&aiBowAb(u,a)&&!(u.flags&&u.flags.noLock)&&aiLockAt(u,s)){p=0;return 0}p=hitChance(u,t,a)/100;const d=mdist(u,t);
  if(p>0&&d>1&&!a.dash){const L=losInfo(u,t,a);if(L.blocked)p=0;else if(L.ff.length&&p<1)AI_RISK=(1-p)*FFCH*14}
  else if(d===1&&!a.magic&&!a.sure&&buffSum(t,'rip')>0&&canFree(t))AI_RISK=(1-p)*(t.wpn.d[0]+t.wpn.d[1])*.3}finally{u.c=c0;u.r=r0}return p}
/* ---- choosing ---- */
// What u's own blows are worth this turn if a foe is in reach (for buffs to damage and skill), else 0.
function aiOwn(u,X,atk){const k=X.at,r=atk.rng+(u.rooted?0:Math.floor(Math.max(0,u.ap-atk.ap)/2.4));if(X.nearTile(k%BW,(k/BW)|0)>r)return 0;return(u.wpn.d[0]+u.wpn.d[1])/2*Math.max(1,Math.floor(u.apMax/(atk.ap||4)))*.6}
/* A timed buff on unit o: th = the damage o expects to take while it lasts (defense, damage reduction), own = what o deals per turn
   (damage, skill), X (o is the acting unit) for riposte and spear wall, apLeft = AP o has left this turn to use it at once. */
function aiBuffVal(o,bf,dur,th,own,X,apLeft){if(bf.dr&&buffSum(o,'dr')>=bf.dr&&!bf.md)return 0;if(bf.md&&!bf.dr&&buffSum(o,'md')>=bf.md)return 0;
 const turns=Math.min(2,dur||1);let v=th*((bf.dr||0)+(bf.md||0)/90+(bf.rd||0)/200)*.7*(turns>1?1.3:1)-(bf.md<0?th*(-bf.md)/90*.7:0);
 if(own>0){const off=(bf.dmg||0)+((aiRngW(o.wpn)?bf.rs:bf.ms)||0)/70;if(off>0)v+=own*off*(apLeft>=4?1:.5)*(turns>1?1.4:.8)}
 if(bf.brv&&o.mor<3)v+=4;if(bf.indom)v+=2;
 if(X&&bf.rip){const w=(o.wpn.d[0]+o.wpn.d[1])/2;v+=X.adj.filter(e=>e.wpn.rng<=2&&e.mor!==0).length*w*.3}
 if(X&&bf.sw&&!X.adj.length){const w=(o.wpn.d[0]+o.wpn.d[1])/2;let n=0;for(const e of X.foes)if(e.wpn.rng<=2&&e.mor!==0&&!e.rooted&&mdist(e,o)<=4)n++;v+=Math.min(2,n)*w*.4}
 return v}
function aiHealVal(o,h){const miss=o.hpMax-o.hp;if(miss<=0)return 0;return Math.min(miss,(h[0]+h[1])/2)*.9+(o.hp<o.hpMax*.4?8:0)}
/* Reloading: worth the best shot it makes possible from here (now, when the AP left covers it and nothing locks the unit; else next
   turn, for less), and something even with no target yet, so a spent crossbow does not walk around empty. */
function aiReloadV(u,X,a,atk){const cur=X.at,lock=!(u.flags&&u.flags.noLock)&&aiLockAt(u,cur),now=!lock&&u.ap-a.ap>=atk.ap;let bv=0;u.loaded=true;
 try{for(const t of X.foes){if(mdist(u,t)>atk.rng+2)continue;const p=aiChance(u,atk,t,cur);if(p<=0)continue;const h=aiHit(u,atk,t,X.S),w=p*(h.v+h.kill*h.kv)*aiPrio(X,t)*(mdist(u,t)<=atk.rng?1:.5);if(w>bv)bv=w}}finally{u.loaded=false}
 return lock?Math.max(3,bv*.3):now?Math.max(6,bv*.95):Math.max(6,bv*.55)}
function aiBest(u,X,walks){const P=X.P,plan=X.plan,S=X.S,D=X.D,cur=X.at,atk=X.atk,foes=X.foes;
 const tiles=[],usz1=u.sz||1;D.forEach((v,k)=>{if(v.air)return;if(k===cur||!unitAt(k%BW,(k/BW)|0))tiles.push({k,cost:v.cost,pos:aiPos(X,k)})});
 if(!tiles.some(t=>t.k===cur))tiles.push({k:cur,cost:0,pos:aiPos(X,cur)});
 tiles.sort((a,b)=>b.pos-a.pos||a.k-b.k);
 const pos0=aiPos(X,cur);let aoo=0;
 if(!(u.flags&&u.flags.slip&&!u.slipT))for(const e of X.adj)if(!e.aoo&&canFree(e)){const p=hitChance(e,u,FREEAB)/100;aoo=AI_DBG.oldaoo?(e.aiD||((e.wpn.d[0]+e.wpn.d[1])/2*.6))*1.3+6:((e.wpn.d[0]+e.wpn.d[1])/2*.6*1.3*X.frail+6)*(.4+p);break}   // leaving a foe's reach: its free attack, and a hit halts the walk
 let best={v:pos0,s:cur,a:null,k:cur};
 const take=(v,s,a,k)=>{if(v>best.v+1e-6){best={v,s,a,k}}};
 const canWalk=walks<3&&!u.rooted;
 if(canWalk)for(const t of tiles){if(t.k===cur)continue;take(t.pos-aoo-X.sw[t.k]-.6-t.cost*.05,t.k,null,t.k)}
 const tcost=k=>k===cur?0:(D.get(k)||{cost:99}).cost;
 // what the AP left after an action is still good for: one more basic attack on something in reach
 const rw=!!(u.wpn.reload&&aiRngW(u.wpn)),follow=(apLeft,ev)=>!rw&&apLeft>=atk.ap&&u.fat+atk.fat*2<=u.fatMax?ev*.7:0;   // a reload weapon fires once, then must reload
 for(const a of X.abs){const tax=(a.cost?a.cost[1]*.25:0)+(a.fat&&u.fatMax<999&&u.fat+a.fat>u.fatMax*.8?6:0)+aiTire(u,a.fat)*.5;
  if(a.ai){for(const c of a.ai(u,X)){const s=c.s==null?cur:c.s,co=tcost(s);if(co+a.ap>u.ap||(s!==cur&&!canWalk))continue;const end=a.tgt==='move'?c.k:s;
    take(c.v+aiPos(X,end)-(s!==cur?aoo:0)-tax,s,a,c.k)}continue}
  if(a.swapW)continue;                                                   // the swap is weighed by aiSwapPlan (one look ahead)
  if(a.tgt==='enemy'){const dash=!!a.dash,melee=a.rng<=1||(a.rng<=2&&!a.magic&&!aiBowAb(u,a)),nh=a.hits>1?a.hits:1;let vt=null;if(dash)vt=validTargets(u,a);   // reach blows weigh every tile, like melee
   for(const t of foes){if(a.foe&&!foeReq(u,a,t))continue;const d0=mdist(u,t);if(d0>a.rng+Math.floor(u.ap/2))continue;
    const h=aiHit(u,a,t,S),pr=aiPrio(X,t);let extra=0;
    // what a hit is worth at chance p: several blows (hits) land while the foe stands, each one a chance to kill
    const hv=p=>{if(nh===1)return(h.v+h.kill*h.kv)*pr;const m=1+(nh-1)*p*(1-h.kill);return(h.v*m+Math.min(1,h.kill*m)*h.kv)*pr};
    if(a.aoe)for(const o of foes)if(o!==t&&mdist(o,t)===1)extra+=aiHit(u,a,o,S).v*.7*.7*aiPrio(X,o);
    if(a.chain){let n=0;for(const o of foes)if(o!==t&&mdist(o,t)<=3)n++;extra+=Math.min(a.chain,n)*h.v*.5}
    const bh=a===atk?h:aiHit(u,atk,t,S);
    if(dash){if(!vt.has(key(t.c,t.r)))continue;const p=aiChance(u,a,t,cur),sp=d0>1?dashSpot(u,t):null,end=sp?key(sp[0],sp[1]):cur;
     take(p*(hv(p)+extra)-AI_RISK+follow(u.ap-a.ap,bh.v*pr*(1-p*h.kill)*.6)+aiPos(X,end)-(end!==cur?aoo*.5:0)-tax,cur,a,key(t.c,t.r));continue}
    let cnt=0;for(const tl of tiles){const s=tl.k,sc=s%BW,sr=(s/BW)|0,dc=sc-t.c,dr=sr-t.r,m=usz1===1&&(t.sz||1)===1?(dc<0?-dc:dc)+(dr<0?-dr:dr):fdist(sc,sr,usz1,t);if(m>a.rng||!m)continue;
     if(tl.cost+a.ap>u.ap||(s!==cur&&!canWalk))continue;if(!melee&&s!==cur&&++cnt>5)continue;
     const p=aiChance(u,a,t,s);if(p<=0)continue;const risk=AI_RISK;let ex=extra;if(a.kb)ex+=aiKbV(u,a,t,sc,sr,X);
     // through: the shot flies on into foes standing behind the target, seen from s
     if(a.through){let n=0;for(const o of foes){if(o===t||n>=a.through)continue;const e=mdist(o,t);if(e<=a.through&&Math.abs(o.c-sc)+Math.abs(o.r-sr)===m+e){ex+=aiHit(u,a,o,S).v*.75*.6*aiPrio(X,o);n++}}}
     take(p*(hv(p)+ex)-risk+follow(u.ap-tl.cost-a.ap,bh.v*pr*(1-p*h.kill)*(m<=atk.rng?p:0))+tl.pos-(s!==cur?aoo+X.sw[s]:0)-tax,s,a,key(t.c,t.r))}}}
  else if(a.tgt==='aoe'){for(const tl of tiles){const s=tl.k;if(tl.cost+a.ap>u.ap||(s!==cur&&!canWalk))continue;const c=s%BW,r=(s/BW)|0;let v=0,n=0;
    for(const t of foes){if(fdist(c,r,usz1,t)!==1)continue;const h=aiHit(u,a,t,S);v+=aiChance(u,a,t,s)*((h.v+h.kill*h.kv)*aiPrio(X,t)+(a.kb?aiKbV(u,a,t,c,r,X)*(1-h.kill):0));n++}
    if(n>=2||(n&&a.foe&&s===cur&&u.ap<a.ap+atk.ap))take(v+tl.pos-(s!==cur?aoo:0)-tax,s,a,s)}}
  else if(a.tgt==='self'){let v=0;const th=X.thr[cur],own=aiOwn(u,X,atk);
   if(a.gainAP){if(X.adj.length&&u.ap<atk.ap&&u.fat+a.fat+atk.fat<=u.fatMax)v=10}
   if(a.reloadW){if(!aiUnloaded(u))continue;v=aiReloadV(u,X,a,atk)}
   if(a.buff&&!(a.buff.key&&u.buffs.some(x=>x.key===a.buff.key)))v+=aiBuffVal(u,a.buff,a.dur,th,own,X,u.ap-a.ap);
   if(a.party){const R=a.party===true?1:a.party;for(const o of X.allies){if(mdist(o,u)>R||o.mor===0)continue;
     if(a.buff&&!(a.buff.key&&o.buffs.some(x=>x.key===a.buff.key))){let adj=0;for(const f of foes)if(mdist(f,o)<=1)adj++;v+=aiBuffVal(o,a.buff,a.dur,adj*((o.hpMax>0?18:0)),adj?(o.wpn.d[0]+o.wpn.d[1])/2:0,null,0)*.8}
     if(a.heal)v+=aiHealVal(o,a.heal);if(a.rally&&o.mor>0&&o.mor<3)v+=10}}
   if(a.heal)v+=aiHealVal(u,a.heal);if(a.rally&&u.mor>0&&u.mor<3)v+=10;
   if(a.rest&&u.fatMax<9000&&u.fat>u.fatMax*.45)v+=Math.min(a.rest,u.fat)*.25+(typeof tiredPen==='function'?tiredPen(u)*.6:0);
   if(X.brace&&a.buff&&(a.buff.md||a.buff.dr)&&v>0&&v<26)v=26;
   if(v>0)take(v+pos0-tax,cur,a,cur)}
  else if(a.tgt==='ally'){for(const o of X.allies.concat(a.noSelf?[]:[u])){if(mdist(o,u)>a.rng)continue;let v=0;
    if(a.heal){const miss=o.hpMax-o.hp;if(miss>=10||a.cleanse)v+=aiHealVal(o,a.heal)}
    if(a.cleanse)for(const k of a.cleanse)if(o.st[k]>0)v+=k==='bleed'||k==='poison'||k==='burn'?5*o.st[k]:k==='root'&&X.near(o)>1?6:3;
    if(a.buff&&!(a.buff.key&&o.buffs.some(x=>x.key===a.buff.key))){const bf=a.buff;
     if(bf.dmg||bf.ms||bf.rs){if(!(buffSum(o,'dmg')>0)&&X.near(o)<=2)v+=6+(o.aiW||((o.wpn.d[0]+o.wpn.d[1])/2))*.25}
     else{let adj=0;for(const f of foes)if(mdist(f,o)<=1)adj++;v+=aiBuffVal(o,bf,a.dur,adj*18,0,null,0)}}
    if(a.giveAP){if(o.bonusAP||X.near(o)>1||o.wpn.rng>1)continue;v+=(o.wpn.d[0]+o.wpn.d[1])/2*.4}
    if(v>0)take(v+pos0-tax,cur,a,key(o.c,o.r))}}
  else if(a.tgt==='move'){const locked=X.adj.length&&aiLocked(u);if(!X.adj.length&&!(P.back>1.2&&!P.shy))continue;const vt=validTargets(u,a),cand=[];
   for(const k of vt){if(B.tiles[k].t==='haz')continue;let v=aiPos(X,k)-1.5-tax;if(a.buff)v+=aiBuffVal(u,a.buff,a.dur,X.thr[k],0,X,0);cand.push({k,v})}
   // a locked archer (or anyone whose weapon reaches) slips clear without free attacks and still has a shot: look one action ahead from the best few spots
   if(!AI_DBG.nomovef&&cand.length&&u.ap-a.ap>=atk.ap){cand.sort((x,y)=>y.v-x.v||x.k-y.k);for(let i=0;i<cand.length&&i<6;i++){const k=cand[i].k;let fb=0;
     for(const t of foes){if(fdist(k%BW,(k/BW)|0,usz1,t)>atk.rng)continue;const p=aiChance(u,atk,t,k);if(p>0){const h=aiHit(u,atk,t,S),w=p*(h.v+h.kill*h.kv)*aiPrio(X,t);if(w>fb)fb=w}}
     cand[i].v+=fb*.8}}
   for(const c of cand)take(c.v,cur,a,c.k)}}
 best.idle=!(best.a||best.s!==cur);return best}
async function aiRun(u,P,plan){const b=B,S={fc:new Map(),X:null,stamp:0,swN:0,justSw:0};let walks=0;
 if(u.nova&&AB.tnovab){await foeUse(u,abilityInfo(u,'tnovab'),key(u.c,u.r));if(B!==b)return;b.busy=true;if(checkEnd()||!u.alive)return}
 if(u.dive&&AB.wdiveb){await foeUse(u,abilityInfo(u,'wdiveb'),key(u.c,u.r));if(B!==b)return;b.busy=true;if(checkEnd()||!u.alive)return}   // a telegraphed dive lands first
 for(let n=0;n<AI_CAP&&u.alive&&B===b&&!b.over;n++){
  const t0=AI_CLOCK?AI_CLOCK():0;
  if(n&&(u.side===0||u.m)&&!u.role)P=aiProfile(u);
  const X=aiScan(u,P,plan,S);if(!X.foes.length)return;
  // The sensible player pulls a merc who is about to die out of the fight when he already stands on the company's edge.
  if(plan&&!plan.noWithdraw&&u.side===0&&u.m&&u.hp<u.hpMax*.25&&X.thr[X.at]>=u.hp*.5&&canWithdraw(u)&&X.allies.length>=2){const ok=await withdraw(u);if(B!==b||b.over)return;b.busy=true;if(checkEnd()||ok||!u.alive)return}
  const best=aiBest(u,X,walks),sw=aiSwapPlan(u,P,plan,X,best,walks,S);
  if(AI_CLOCK){const dt=AI_CLOCK()-t0;AI_STAT.ms+=dt;if(!n)AI_STAT.n++;if(dt>AI_STAT.max)AI_STAT.max=dt}
  if(sw){const ap=u.ap,w=u.wpn;await aiUse(u,sw,X.at);if(B!==b||b.over||!u.alive)return;S.fc.clear();S.swN++;S.justSw=1;if(u.wpn===w&&u.ap>=ap)return;continue}
  S.justSw=0;if(best.idle)return;
  if(best.s!==X.at){walks++;const at=X.at;await walkPath(u,pathTo(X.D,best.s));if(B!==b||b.over||!u.alive)return;if(checkEnd())return;
   const k=key(u.c,u.r);if(k===at&&!best.a)return;if(k!==best.s)continue}
  if(best.a){const ap=u.ap,k0=key(u.c,u.r);await aiUse(u,best.a,best.k);if(B!==b||b.over)return;if(checkEnd())return;if(!u.alive)return;
   if(u.ap>=ap&&key(u.c,u.r)===k0&&!best.a.gainAP)return}}}       // an action that cost nothing and moved nothing: stop rather than spin
