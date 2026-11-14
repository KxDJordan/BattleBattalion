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
   decision, so battles stay deterministic under the seeded stream. Hard caps: AI_CAP decisions, 3 walks. */
const AI_CAP=7,AI_LATE=9;
let AI_CLOCK=null;                       // set to a ()=>ms clock by the balance harness to measure decision cost
const AI_STAT={n:0,ms:0,max:0};
/* care: weight of expected damage taken on the end tile      form: liking for allies alongside
   high: liking for height (ranged)   adv: pull towards the enemy per tile   back: appetite for the back line */
const AI_ROLE={
 line:{care:.22,form:1.4,high:.3,adv:3,back:1},
 flanker:{care:.25,form:0,high:.3,adv:3,back:1.35},
 guard:{care:.2,form:1,high:.3,adv:3,back:1,ward:1},
 sniper:{care:1.1,form:.4,high:2.5,adv:2.5,back:1.1,shy:1},
 caster:{care:1.4,form:.5,high:1.5,adv:2.5,back:1.1,shy:1},
 beast:{care:.08,form:0,high:.2,adv:3,back:1.15},
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
     screen   melee stays near the back line to catch blinkers and raiders */
const AI_PLAN={
 gob:{hunt:{gobsham:3.5}},
 undead:{hunt:{necro:3},press:1},
 beast:{hold:1,holdR:3,tight:.2},
 orc:{outlast:1,holdR:5},
 bandit:{hunt:{blead:3.5}},
 void:{spread:1,dodge:1,hunt:{vmage:1.6}}
};
function aiPlan(u){const b=B;if(u.side!==0)return null;if(b.opts.plan)return b.opts.plan;return AI_PLAN[b.opts.f]||{}}
function aiProfile(u){let role=u.role;
 if(!role){role='line';if(u.wpn.wt==='bow')role='sniper';else if(u.abs.some(id=>{const a=AB[id];return a&&a.magic&&a.rng>1&&a.cost&&u.res[a.cost[0]]&&u.res[a.cost[0]].cur>=a.cost[1]}))role='caster'}
 const P=Object.assign({role},AI_ROLE[role]||AI_ROLE.line);if(u.def&&u.def.dive)P.back=1.8;
 if(u.def&&u.def.flee&&u.hp<u.hpMax*u.def.flee)P.care*=2.5;            // the skittish hang back when hurt, but they keep fighting
 if(B.round>AI_LATE){P.care*=.3;P.shy=0}                                // a long battle: everyone presses, so it ends
 return P}
async function aiTurn2(u){const b=B;if(!b||!u||!u.alive)return;
 if(u.side===0&&b.opts.pilot==='naive')return AI_NAIVE(u);
 if(u.side===0)return AI_SENSIBLE(u);
 return aiRun(u,aiProfile(u),null)}
// The scripted competent player: the engine with the company's roles and the plan against this faction.
async function AI_SENSIBLE(u){return aiRun(u,aiProfile(u),aiPlan(u)||{})}
// The careless player: walk at the nearest foe and hit it with the basic attack.
async function AI_NAIVE(u){const b=B;for(let n=0;n<6&&u.alive&&B===b&&!b.over;n++){const foes=b.units.filter(x=>x.alive&&x.side!==u.side);if(!foes.length)return;
  const atk=abilityInfo(u,'attack'),vt=validTargets(u,atk),inr=foes.filter(f=>vt.has(key(f.c,f.r))).sort((x,y)=>mdist(u,x)-mdist(u,y)||x.hp-y.hp||x.id-y.id);
  if(inr.length&&canUse(u,atk)){await aiUse(u,atk,key(inr[0].c,inr[0].r));if(B!==b||checkEnd())return;continue}
  if(inr.length||u.rooted||u.ap<2)return;
  const want=foes.some(f=>mdist(u,f)<=atk.rng)?1:atk.rng;              // foes in range but none in sight: close in until one is
  const D=dijkstra(u,99),st=key(u.c,u.r),tl=b.tiles;let best=st,bs=1e9;
  D.forEach((v,k)=>{const c=k%BW,r=(k/BW)|0;let dm=99;for(const f of foes){const d=Math.abs(f.c-c)+Math.abs(f.r-r);if(d<dm)dm=d}const sc=(dm>want?dm-want:0)*10+v.cost*.1+(tl[k].t==='haz'?30:0);if(sc<bs){bs=sc;best=k}});
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
function aiScan(u,P,plan,S){const b=B,N=BW*BH,X=S.X||(S.X={thr:new Float32Array(N),sw:new Float32Array(N),goal:new Uint8Array(N),pv:new Float32Array(N),ps:new Int32Array(N)});
 X.u=u;X.P=P;X.plan=plan;X.at=key(u.c,u.r);X.foes=[];X.allies=[];X.adj=[];X.S=S;S.stamp=(S.stamp||0)+1;
 for(const o of b.units){if(!o.alive)continue;if(o.side!==u.side){X.foes.push(o);if(mdist(o,u)===1)X.adj.push(o)}else if(o!==u)X.allies.push(o)}
 X.near=o=>{let m=99;for(const f of X.foes){const d=mdist(f,o);if(d<m)m=d}return m};
 X.nearTile=(c,r)=>{let m=99;for(const f of X.foes){const d=Math.abs(f.c-c)+Math.abs(f.r-r);if(d<m)m=d}return m};
 X.frail=1+(1-u.hp/u.hpMax)*1.5;
 aiThreat(u,X);
 X.D=dijkstra(u,u.rooted?0:u.ap);
 X.hold=0;X.tele=null;X.brace=0;X.fresh=0;X.lead=-1;
 // enemies come on together: until the lines meet, nobody runs more than a couple of rows ahead of the band
 if(u.side===1&&b.round<=6){let m=99,s=0,n=0;for(const o of X.allies){if(o.back)continue;s+=o.r;n++;for(const f of X.foes){const d=mdist(f,o);if(d<m)m=d}}
  if(n>=2&&m>3&&X.near(u)>3)X.lead=s/n+(P.back>1.2?3:2)}
 if(plan){
  // hold: nobody steps off the line until the enemy is on it; after contact the company fights within a short leash of its line
  if((plan.hold||plan.outlast)&&b.round<=(plan.holdR||5)&&X.foes.some(f=>f.wpn.rng<=2&&!f.back&&f.mor!==0&&!(f.st.root||f.rooted))){let m=99;for(const f of X.foes){const d=mdist(f,u);if(d<m)m=d;for(const o of X.allies){const e=mdist(f,o);if(e<m)m=e}}X.hold=m>2?2:1}
  // weather: with fresh orcs close and none on us yet, brace instead of walking into the charge
  if(plan.outlast){let near=0,adj=0;for(const f of X.foes)if(f.st.fury>1&&f.mor!==0){const d=mdist(f,u);if(d===1)adj++;else if(d<=6)near++}X.brace=near&&!adj?1:0;X.fresh=adj}
  if(plan.dodge&&b.tele&&b.tele.length){X.tele=new Set();for(const t of b.tele)if(t.u.side!==u.side)for(const k of t.keys)X.tele.add(k)}}
 const atk=abilityInfo(u,'attack');let want=atk.rng;X.atk=atk;
 X.abs=[];for(const id of ['attack'].concat(u.abs)){if(id!=='attack'&&!AB[id])continue;const a=id==='attack'?atk:abilityInfo(u,id);
  if(a.withdraw||!(a.foe?foeReady(u,a):canUse(u,a)))continue;X.abs.push(a);if(a.tgt==='enemy'&&a.magic&&a.rng>want)want=a.rng}
 X.want=want;aiGoal(u,X);return X}
// Expected damage a foe deals to u per turn on each tile it can strike next turn.
function aiThreat(u,X){const th=X.thr,sw=X.sw;th.fill(0);sw.fill(0);const armK=u.arm>0?.75:1,bw=BW,bh=BH;
 for(const e of X.foes){let rng=e.wpn.rng,avg=(e.wpn.d[0]+e.wpn.d[1])/2,hit,n=Math.min(2,Math.floor(e.apMax/(e.wpn.ap||4)))||1,mag=null;
  for(const id of e.abs){const a=AB[id];if(a&&a.magic&&a.rng>1&&(!a.cost||(e.res[a.cost[0]]&&e.res[a.cost[0]].cur>=a.cost[1]))){mag=a;break}}
  if(mag){rng=mag.rng;avg=(mag.magic[0]+mag.magic[1])/2;hit=.7;n=Math.min(2,Math.floor(e.apMax/(mag.ap||4)))||1}
  else hit=clamp((rng>1?eff(e,'rs'):eff(e,'ms'))+(e.wpn.hit||0)-(rng>1?eff(u,'rd'):eff(u,'md')),5,95)/100;
  const dm=avg*(1+buffSum(e,'dmg')+(e.dmgB||0));e.aiW=dm*n*.55+(mag||e.back?6:0)+(e.def&&e.def.lead?8:0);
  if(e.st.stun||e.mor===0)continue;
  if(buffSum(e,'sw')&&mdist(e,u)>1)for(const [x,y] of DIRS)if(inb(e.c+x,e.r+y))sw[(e.r+y)*bw+e.c+x]+=dm*hit*armK+5;
  const d=dm*hit*armK,mv=e.rooted||e.st.root?0:Math.floor((e.apMax-(e.wpn.ap||4))/2.4),R=rng>1?rng:1+mv;
  const r0=Math.max(0,e.r-R),r1=Math.min(bh-1,e.r+R),c0=Math.max(0,e.c-R),c1=Math.min(bw-1,e.c+R);
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){const m=(c>e.c?c-e.c:e.c-c)+(r>e.r?r-e.r:e.r-r);if(m>R||!m)continue;
   th[r*bw+c]+=rng>1?d*n*.3:m<=1?d*n:m<=1+mv/2?d:d*.6}}}
// Path distance (ignoring units) from every tile to the nearest foe; foes the plan hunts count as closer.
function aiGoal(u,X){const g=X.goal,tl=B.tiles,bk=[],hunt=X.plan&&X.plan.press&&X.plan.hunt,melee=X.want<=2;g.fill(99);let any=false;
 if(hunt&&melee)for(const f of X.foes)if(hunt[f.eid]>=1.5){any=true;break}
 for(const f of X.foes){const o=any&&!(hunt[f.eid]>=1.5)?3:0;(bk[o]||(bk[o]=[])).push(key(f.c,f.r))}
 for(let d=0;d<bk.length&&d<64;d++){const q=bk[d];if(!q)continue;for(let i=0;i<q.length;i++){const k=q[i];if(g[k]<=d)continue;g[k]=d;const c=k%BW,r=(k/BW)|0,h=tl[k].h;
   for(const [a,b] of DIRS){const nc=c+a,nr=r+b;if(!inb(nc,nr))continue;const nk=nr*BW+nc;if(g[nk]<=d+1||tl[nk].t==='block'||h-tl[nk].h>1)continue;(bk[d+1]||(bk[d+1]=[])).push(nk)}}}}
// Worth of ending on tile k (higher is better). Cached per decision.
function aiPos(X,k){if(X.ps[k]===X.S.stamp)return X.pv[k];const u=X.u,P=X.P,plan=X.plan,t=B.tiles[k],c=k%BW,r=(k/BW)|0;
 let v=-P.care*X.thr[k]*X.frail+P.high*t.h-(t.t==='haz'?60:0);
 const g=X.goal[k]>X.want?X.goal[k]-X.want:0;
 if(X.hold===2||X.brace){const front=DEPLOY.p.front;v-=(r<front-1?(front-1-r)*7:0)}else{v-=P.adv*g;if(X.hold===1){const front=DEPLOY.p.front;if(r<front-2)v-=(front-2-r)*5}}
 if(P.shy&&X.goal[k]<=2)v-=6*(3-X.goal[k]);
 if(X.lead>=0&&r>X.lead)v-=5*(r-X.lead);

 let al=0,open=0,blk=0;
 for(const [a,b] of DIRS){const nc=c+a,nr=r+b;if(!inb(nc,nr))continue;const tt=B.tiles[nr*BW+nc];if(tt.t==='block'){blk++;continue}const o=unitAt(nc,nr);if(o&&o!==u&&o.alive&&o.side===u.side)al++;else if(!o||o===u)open++}
 let form=P.form;if(plan){if(plan.tight&&!P.shy)form+=1.6*plan.tight;if(plan.spread)form=-2.5}
 v+=form*al;if(plan&&plan.tight&&!P.shy&&open>1)v-=2.5*plan.tight*(open-1);
 if(P.shy&&blk)v+=1.2;
 if(X.tele&&X.tele.has(k))v-=90;
 if(P.ward||(plan&&plan.screen&&!P.shy)){let m=99;for(const o of X.allies)if(o.back||o.role==='caster'||o.role==='sniper'){const d=Math.abs(o.c-c)+Math.abs(o.r-r);if(d<m)m=d}if(m<99&&m>2)v-=(P.ward?2:1.2)*(m-2)}
 X.ps[k]=X.S.stamp;return X.pv[k]=v}
function aiStatusVal(k,n,t){const W=t.aiW||10;let v;
 if(k==='stun')v=W*1.1;else if(k==='root'||k==='webbed')v=t.wpn.rng>1||t.back?2:W*.35*Math.min(2,n);else if(k==='daze')v=W*.12;else if(k==='bleed')v=5*n;else if(k==='chill')v=W*.3;else if(k==='burn')v=6*n;else if(k==='poison')v=5*n;else if(k==='hex')v=W*.3;
 else if(k==='web'||k==='grab')v=4;else v=3;
 return t.st[k]>0?v*.2:v}
// What a hit with a on t is worth, from forecast(). Cached for the unit's turn.
function aiHit(u,a,t,S){const id=a.id+'|'+t.id+'|'+t.hp+'|'+t.arm+'|'+(t.helm||0)+'|'+(t.shp||0),C=S.fc;let v=C.get(id);if(v)return v;
 const W=t.aiW||10;let hp=0,arm=0,kill=0,sv=0;
 if(a.split){const f=forecast(u,t,a);v={v:f.shield?f.shield.max*.2+(f.shield.brk?(f.shield.sure?10:5)+W*.3:0):0,kill:0,kv:0};C.set(id,v);return v}
 /* The forecast's own arithmetic (fcDamage, fcSoak, headChance) at the low, middle and high roll, for a hit on the body and on
    the head: the same numbers forecast() shows the player, without walking every roll for every candidate. */
 let lo=0,hi=0,ign=1;if(a.noDmg){}else if(a.magic){lo=a.magic[0];hi=a.magic[1];ign=a.ign||.5}else{lo=u.wpn.d[0];hi=u.wpn.d[1];ign=(u.wpn.ign||.2)+(a.ignB||0)}
 if(hi>0){const hc=headChance(u,t,a)/100,d0=fcDamage(u,t,a,lo),d1=fcDamage(u,t,a,(lo+hi)/2),d2=fcDamage(u,t,a,hi);
  for(let h=0;h<2;h++){const w=h?hc:1-hc;if(!(w>0))continue;const s0=fcSoak(t,d0,ign,!!h,a.pierce),s1=fcSoak(t,d1,ign,!!h,a.pierce),s2=fcSoak(t,d2,ign,!!h,a.pierce);
   hp+=w*Math.min(t.hp,(s0.hp+2*s1.hp+s2.hp)/4);arm+=w*(s0.arm+2*s1.arm+s2.arm)/4;kill+=w*(s0.hp>=t.hp?1:s2.hp<t.hp?0:(s2.hp-t.hp+1)/(s2.hp-s0.hp+1));
   if(!t.fearless&&s2.hp>=heavyHit(t))sv+=w*3;if(a.bleed&&s1.hp>0)sv+=w*aiStatusVal('bleed',a.bleed,t)}}
 if(a.status)for(const k in a.status)sv+=aiStatusVal(k,a.status[k],t);
 if(!a.magic&&u.wpn.stun&&!(a.status&&a.status.stun))sv+=u.wpn.stun*aiStatusVal('stun',1,t);
 if(u.onhit)sv+=u.onhit.ch*aiStatusVal('root',u.onhit.root,t);
 const kn=a.kb||u.kbN||0;if(kn&&!buffSum(t,'indom'))sv+=1.5*(a.kb?1:u.kbCh||0);
 v={v:hp+arm*.5+(1-kill)*sv,kill,kv:16+W*.7};C.set(id,v);return v}
function aiPrio(X,t){const u=X.u,P=X.P,plan=X.plan;let p=1;const fo=B.aiFoc&&B.aiFoc[u.side];
 if(u.def&&u.def.pack){let n=0;for(const o of X.allies)if(o.def&&o.def.pack&&mdist(o,t)===1)n++;p+=.35*Math.min(2,n);if(t.st.harried)p+=.3;       // the pack goes for whoever a wolf already has by the leg,
  else if(!n){let s=0;for(const o of X.foes)if(o!==t&&mdist(o,t)===1)s++;if(s<2)p+=.3}}                                                         // and for prey that stands alone
 if(fo===t)p+=.15;if(t.back||t.role==='caster'||t.role==='sniper')p*=P.back;
 if(plan){const h=plan.hunt&&plan.hunt[t.eid];if(h)p*=h;if(plan.volley&&P.shy&&(t.role==='sniper'||t.role==='caster'))p*=1.5;
  if(plan.outlast&&t.def&&t.def.tire)p*=t.st.winded||t.st.spent?1.3:1}
 if(t.st.ward)p*=.6;if(t.mor===0)p*=.5;
 return p}
// Chance (0..1) that a used from tile s hits t; 0 when the shot is blocked from there.
let AI_RISK=0;   // set by aiChance: what a miss from there costs (a stray shot into an ally, a riposte)
function aiChance(u,a,t,s){const c0=u.c,r0=u.r;let p;AI_RISK=0;if(s!==c0+r0*BW){u.c=s%BW;u.r=(s/BW)|0}
 try{p=hitChance(u,t,a)/100;const d=mdist(u,t);
  if(p>0&&d>1&&!a.dash){const L=losInfo(u,t,a);if(L.blocked)p=0;else if(L.ff.length&&p<1)AI_RISK=(1-p)*FFCH*14}
  else if(d===1&&!a.magic&&!a.sure&&buffSum(t,'rip')>0&&canFree(t))AI_RISK=(1-p)*(t.wpn.d[0]+t.wpn.d[1])*.3}finally{u.c=c0;u.r=r0}return p}
/* ---- choosing ---- */
function aiBest(u,X,walks){const P=X.P,plan=X.plan,S=X.S,D=X.D,cur=X.at,atk=X.atk,foes=X.foes;
 const tiles=[];D.forEach((v,k)=>{if(k===cur||!unitAt(k%BW,(k/BW)|0))tiles.push({k,cost:v.cost,pos:aiPos(X,k)})});
 if(!tiles.some(t=>t.k===cur))tiles.push({k:cur,cost:0,pos:aiPos(X,cur)});
 tiles.sort((a,b)=>b.pos-a.pos||a.k-b.k);
 const pos0=aiPos(X,cur);let aoo=0;
 for(const e of X.adj)if(!e.aoo&&canFree(e)){aoo=(e.aiD||((e.wpn.d[0]+e.wpn.d[1])/2*.6))*1.3+6;break}
 let best={v:pos0,s:cur,a:null,k:cur};
 const take=(v,s,a,k)=>{if(v>best.v+1e-6){best={v,s,a,k}}};
 const canWalk=walks<3&&!u.rooted;
 if(canWalk)for(const t of tiles){if(t.k===cur)continue;take(t.pos-aoo-X.sw[t.k]-.6-t.cost*.05,t.k,null,t.k)}
 const tcost=k=>k===cur?0:(D.get(k)||{cost:99}).cost;
 // what the AP left after an action is still good for: one more basic attack on something in reach
 const follow=(apLeft,ev)=>apLeft>=atk.ap&&u.fat+atk.fat*2<=u.fatMax?ev*.7:0;
 for(const a of X.abs){const tax=(a.cost?a.cost[1]*.25:0)+(a.fat&&u.fatMax<999&&u.fat+a.fat>u.fatMax*.8?6:0);
  if(a.ai){for(const c of a.ai(u,X)){const s=c.s==null?cur:c.s,co=tcost(s);if(co+a.ap>u.ap||(s!==cur&&!canWalk))continue;const end=a.tgt==='move'?c.k:s;
    take(c.v+aiPos(X,end)-(s!==cur?aoo:0)-tax,s,a,c.k)}continue}
  if(a.tgt==='enemy'){const dash=!!a.dash,melee=a.rng<=1;let vt=null;if(dash)vt=validTargets(u,a);
   for(const t of foes){if(a.foe&&!foeReq(u,a,t))continue;const d0=mdist(u,t);if(d0>a.rng+Math.floor(u.ap/2))continue;
    const h=aiHit(u,a,t,S),pr=aiPrio(X,t),hv=(h.v+h.kill*h.kv)*pr;let extra=0;
    if(a.aoe)for(const o of foes)if(o!==t&&mdist(o,t)===1)extra+=aiHit(u,a,o,S).v*.7*.7;
    if(a.chain){let n=0;for(const o of foes)if(o!==t&&mdist(o,t)<=3)n++;extra+=Math.min(a.chain,n)*h.v*.5}
    const bh=a===atk?h:aiHit(u,atk,t,S);
    if(dash){if(!vt.has(key(t.c,t.r)))continue;const p=aiChance(u,a,t,cur),sp=d0>1?dashSpot(u,t):null,end=sp?key(sp[0],sp[1]):cur;
     take(p*(hv+extra)-AI_RISK+follow(u.ap-a.ap,bh.v*pr*(1-p*h.kill)*.6)+aiPos(X,end)-(end!==cur?aoo*.5:0)-tax,cur,a,key(t.c,t.r));continue}
    let cnt=0;for(const tl of tiles){const s=tl.k,dc=(s%BW)-t.c,dr=((s/BW)|0)-t.r,m=(dc<0?-dc:dc)+(dr<0?-dr:dr);if(m>a.rng||!m)continue;
     if(tl.cost+a.ap>u.ap||(s!==cur&&!canWalk))continue;if(!melee&&s!==cur&&++cnt>5)continue;
     const p=aiChance(u,a,t,s);if(p<=0)continue;
     take(p*(hv+extra)-AI_RISK+follow(u.ap-tl.cost-a.ap,bh.v*pr*(1-p*h.kill)*(m<=atk.rng?p:0))+tl.pos-(s!==cur?aoo+X.sw[s]:0)-tax,s,a,key(t.c,t.r))}}}
  else if(a.tgt==='aoe'){for(const tl of tiles){const s=tl.k;if(tl.cost+a.ap>u.ap||(s!==cur&&!canWalk))continue;const c=s%BW,r=(s/BW)|0;let v=0,n=0;
    for(const t of foes){if(Math.abs(t.c-c)+Math.abs(t.r-r)!==1)continue;const h=aiHit(u,a,t,S);v+=aiChance(u,a,t,s)*(h.v+h.kill*h.kv)*aiPrio(X,t);n++}
    if(n>=2||(n&&a.foe&&s===cur&&u.ap<a.ap+atk.ap))take(v+tl.pos-(s!==cur?aoo:0)-tax,s,a,s)}}
  else if(a.tgt==='self'){let v=0;const th=X.thr[cur];
   if(a.gainAP){if(X.adj.length&&u.ap<atk.ap&&u.fat+a.fat+atk.fat<=u.fatMax)v=10}
   if(a.buff){const bf=a.buff,own=(u.wpn.d[0]+u.wpn.d[1])/2;if(!(bf.key&&u.buffs.some(x=>x.key===bf.key))&&!(bf.dr&&buffSum(u,'dr')>=bf.dr)&&!(bf.md&&buffSum(u,'md')>=bf.md)){v=th*((bf.dr||0)+(bf.md||0)/90+(bf.rd||0)/200)*.7;
     if(bf.rip)v+=X.adj.filter(e=>e.wpn.rng<=2&&e.mor!==0).length*own*.3;
     if(bf.sw&&!X.adj.length){let n=0;for(const e of foes)if(e.wpn.rng<=2&&e.mor!==0&&!e.rooted&&mdist(e,u)<=4)n++;v+=Math.min(2,n)*own*.4}
     if(X.brace&&v<26)v=26}}
   if(v>0)take(v+pos0-tax,cur,a,cur)}
  else if(a.tgt==='ally'){for(const o of X.allies.concat(a.noSelf?[]:[u])){if(mdist(o,u)>a.rng)continue;let v=0;
    if(a.heal){const miss=o.hpMax-o.hp;if(miss<10)continue;v=Math.min(miss,(a.heal[0]+a.heal[1])/2)*.9+(o.hp<o.hpMax*.4?8:0)}
    if(a.buff){if(buffSum(o,'dmg')>0||X.near(o)>2)continue;v+=6+(o.aiW||((o.wpn.d[0]+o.wpn.d[1])/2))*.25}
    if(a.giveAP){if(o.bonusAP||X.near(o)>1||o.wpn.rng>1)continue;v+=(o.wpn.d[0]+o.wpn.d[1])/2*.4}
    if(v>0)take(v+pos0-tax,cur,a,key(o.c,o.r))}}
  else if(a.tgt==='move'){if(!X.adj.length&&!(P.back>1.2&&!P.shy))continue;const vt=validTargets(u,a);
   for(const k of vt){if(B.tiles[k].t==='haz')continue;take(aiPos(X,k)-1.5-tax,cur,a,k)}}}
 return best.a||best.s!==cur?best:null}
async function aiRun(u,P,plan){const b=B,S={fc:new Map(),X:null,stamp:0};let walks=0;
 if(u.nova&&AB.tnovab){await foeUse(u,abilityInfo(u,'tnovab'),key(u.c,u.r));if(B!==b)return;b.busy=true;if(checkEnd()||!u.alive)return}
 for(let n=0;n<AI_CAP&&u.alive&&B===b&&!b.over;n++){
  const t0=AI_CLOCK?AI_CLOCK():0;
  if(n&&u.side===0&&!u.role)P=aiProfile(u);
  const X=aiScan(u,P,plan,S);if(!X.foes.length)return;
  // The sensible player pulls a merc who is about to die out of the fight when he already stands on the company's edge.
  if(plan&&!plan.noWithdraw&&u.side===0&&u.m&&u.hp<u.hpMax*.25&&X.thr[X.at]>=u.hp*.5&&canWithdraw(u)&&X.allies.length>=2){const ok=await withdraw(u);if(B!==b||b.over)return;b.busy=true;if(checkEnd()||ok||!u.alive)return}
  const best=aiBest(u,X,walks);
  if(AI_CLOCK){const dt=AI_CLOCK()-t0;AI_STAT.ms+=dt;if(!n)AI_STAT.n++;if(dt>AI_STAT.max)AI_STAT.max=dt}
  if(!best)return;
  if(best.s!==X.at){walks++;const at=X.at;await walkPath(u,pathTo(X.D,best.s));if(B!==b||b.over||!u.alive)return;if(checkEnd())return;
   const k=key(u.c,u.r);if(k===at&&!best.a)return;if(k!==best.s)continue}
  if(best.a){const ap=u.ap,k0=key(u.c,u.r);await aiUse(u,best.a,best.k);if(B!==b||b.over)return;if(checkEnd())return;if(!u.alive)return;
   if(u.ap>=ap&&key(u.c,u.r)===k0&&!best.a.gainAP)return}}}       // an action that cost nothing and moved nothing: stop rather than spin
