/* ================= CARAVAN GUARDS, AMBUSHES AND CLASHES (world agent) =================
   Guards: every caravan carries p.guard = {n, t, cap, k}, hired by its HOME town (cvGuardFor): n swords (0..8), quality tier t 1..5
     (1 militia .. 5 veteran sellswords), cap = a captain leads them (t >= 4), k = the luck of the hiring (.93..1.07, the one rnd draw a
     caravan always took). Tier and size follow the town's economy (cvEcon: prosperity, size, a greedy (rich) owner, a boom or a famine):
     a poor village sends three militiamen, a rich city eight sellswords under a captain. p.mult IS the guards' strength (cvGuardMult) on
     the scale every band's mult is on (1 = an even fight for the company), so partyStrength, the map figure and attacking a caravan
     (cvCaravanBattle: the guards as they were hired, named as caravan guards) all read it.
   Ambush rule (cvHour, every in-game hour): a raiding band (CV.raid factions: brigands and the monsters that prey on roads; plain bands,
     nest bands and raiders, never a crisis host, a siege, a hunt or a band chasing the company) within CV.near tiles of a caravan attacks
     it iff the caravan's strength <= the band's (cvStr(c) <= r.mult). The two stop side by side and a CLASH begins:
       G.clashes [{id, c (caravan id), r (raider id), x, y (where the fight is), gs, rs (strengths when it began), gh, rh (what is left of
       each side, 1..0), h (hours fought), day, bo (the company backed off: no sheet until it walks away), turned (the company struck the guards)}]
       both parties carry p.clash = the clash id and stand still (moveParties, wsStep).
   Auto-resolve (cvStep, an hour at a time, a private stream seeded by the world seed, the clash id and the hour: no game randomness):
     each side wears the other down, Lanchester style (dG = K rs rh / gs', dR = K gs' gh / rs, times .6..1.4, gs' = gs x CV.def: the
     guards fight from behind their wagons); the guards break at gh <= .2,
     the raiders at rh <= .3, and after CV.maxH hours the raiders give it up. Guards win: the band limps off (mult x rh, or scatters
     below .3) and the caravan goes on with the guards it has left. Raiders win: the caravan is gone, the band carries its cargo (p.loot,
     handed over if the company beats it later), its home town loses 3 prosperity and the town it was bound for 1 (an arriving caravan: +1 / +3).
   The company: walking up to a clash (cvReach) or tapping it opens the sheet: INTERVENE (a battle beside the surviving guards and the
     wagon: cvBattle -> startBattle o.cv -> cvSetup) or BACK OFF (the clash goes on). In battle the guards are side 0 with u.ally / u.grd:
     AI-played (aiTurn2), blue rings and bars, outside deployment, never the company's dead. If a company sword KILLS a guard every guard
     turns on the company at once (cvTurn: side 2, foes to everyone), which also counts as attacking the caravan. Outcomes (cvBattleEnd,
     through worldBattleEnd): saved (reward, standing), saved but no guard left (escort it or let it go), the wagon burned, robbed (the
     company turned on them: cargo taken, standing lost), or the fight goes on (lost or fled: the clash continues with what is left).
   Public: cvGuardFor cvGuardMult cvGuardOf cvGuardLine cvStr cvTick cvHour cvStart cvStep cvEnd cvList cvById cvOf cvReach cvTap cvSheet
           cvGo cvBack cvBattle cvCaravanBattle cvSetup cvGuardDown cvTurn cvTapGuard cvResolve cvBattleEnd cvAfterSheet cvEscort
           cvEscArrive cvRepair cvDrawMap (map art) */
const CV={near:1.25,K:.07,def:1.25,cap1:.26,gBreak:.2,rBreak:.3,maxH:20,cd:2,reach:.75,rep:{save:8,turn:-18,tried:3,esc:5},
 gw:[.1,.12,.14,.16,.18],capW:.12,
 raid:{bandit:1,gob:1,orc:1,beast:1,ogre:1,wyvern:1,undead:1,serpent:1,horde:1,barb:1,dead:1}};
const CVQ=[{n:'militia',w:'weak'},{n:'hired guards',w:'light'},{n:'seasoned guards',w:'fair'},{n:'sellswords',w:'strong'},{n:'veteran sellswords',w:'very strong'}];
const CVMIX={1:['thug','thug','bmark','thug','thug','bmark','thug','thug'],2:['thug','bmark','thug','thug','bmark','thug','bxbow','thug'],3:['thug','bxbow','thug','braid','bmark','thug','bxbow','braid'],
 4:['braid','bxbow','thug','braid','bxbow','thug','braid','bmark'],5:['braid','bxbow','braid','bxbow','braid','thug','bxbow','braid']};
const CVNM={thug:['Militiaman','Caravan guard'],bmark:['Militia archer','Guard archer'],bxbow:['Guard crossbowman','Guard crossbowman'],braid:['Caravan sellsword','Caravan sellsword'],blead:['Caravan captain','Caravan captain']};

/* ---- guards ---- */
// the home town's purse: prosperity, size, a greedy (rich) house, a boom or a famine
function cvEcon(t){if(!t)return 40;const S=Array.isArray(t.sit)?t.sit:[],has=k=>S.some(s=>s&&s.k===k),h=typeof houseById==='function'?houseById(t.own):null,P=h&&typeof HPERS==='object'?HPERS[h.pers]:null;
 return svNum(t.pros,50)+15*clamp(t.size|0||1,1,3)+(h?5:0)+(P&&P.gold?10:0)+(has('boom')?10:0)-(has('famine')?12:0)}
// the guard detail town i can afford; r: a 0..1 draw for the luck of the hiring (default .5). No other randomness.
function cvGuardFor(i,r){const t=G&&G.towns?G.towns[i]:null,E=cvEcon(t),sz=t?clamp(t.size|0||1,1,3):1,pros=t?svNum(t.pros,50):50;
 const T=clamp(1+Math.floor((E-40)/22),1,5),n=clamp(2+sz+Math.floor(pros/35)+(T>=4?1:0),2,8);
 return{n,t:T,cap:T>=4?1:0,k:Math.round((.93+.14*(svFin(r)?clamp(r,0,1):.5))*100)/100}}
function cvGuardBase(g){if(!g||!(g.n>0))return 0;return g.n*CV.gw[clamp(g.t|0,1,5)-1]+(g.cap?CV.capW:0)}
function cvGuardMult(g){return Math.max(.05,Math.round(cvGuardBase(g)*(svFin(g&&g.k)?g.k:1)*100)/100)}   // never 0: the drovers still fight for their wagons
// p.guard, or one read back from the caravan's strength (caravans made before guards existed)
function cvGuardOf(p){const g=p&&p.guard;if(svObj(g)&&Number.isInteger(g.n)&&Number.isInteger(g.t))return g;const m=svNum(p&&p.mult,.6),t=clamp(Math.round((m-.25)/.25)+1,1,5);
 return{n:clamp(Math.round((m-(t>=4?CV.capW:0))/CV.gw[t-1]),2,8),t,cap:t>=4?1:0,k:1}}
function cvStr(p){return p?svNum(p.mult,0):0}
function cvGuardIds(g,n){const L=(CVMIX[clamp(g.t|0,1,5)]||CVMIX[1]).slice(0,clamp(n==null?g.n:n,0,8));if(g.cap&&L.length)L[0]='blead';return L}
function cvGuardName(id,t){const N=CVNM[id];return N?N[t<=1?0:1]:EN[id]?EN[id].n:'Caravan guard'}
function cvQual(g){return CVQ[clamp(g.t|0,1,5)-1]}
function cvGuardLine(p){const g=cvGuardOf(p);if(!(g.n>0))return p&&p.esc?'Unguarded: the company has the escort':'Unguarded but for the drovers';const q=cvQual(g);
 return`Guarded by ${g.n} ${g.n===1?q.n.replace(/s$/,''):q.n}${g.cap?' under a captain':''} (${q.w})`}
// the map figure's key: 'g' + tier + guard figures beside the wagon (0..3) + a captain among them
function cvFigKey(p){const g=cvGuardOf(p),n=g.n<=0?0:g.n<=3?1:g.n<=5?2:3;return'g'+g.t+n+(g.cap&&n>=3?1:0)}
function cvOwnerName(p){if(!p)return'';const t=G.towns[p.from];return p.f==='free'||!houseById(p.f)?(t?t.name:factName(p.f)):factName(p.f)}

/* ---- clashes: the list and lookups ---- */
function cvList(){if(!G)return[];if(!Array.isArray(G.clashes))G.clashes=[];return G.clashes}
function cvById(id){for(const c of cvList())if(c.id===id)return c;return null}
function cvOf(p){return p&&p.clash?cvById(p.clash):null}
function cvParty(id){for(const p of G.parties)if(p.id===id&&!p.gone)return p;return null}
function cvRaider(p){return !!p&&!p.gone&&!p.clash&&!!CV.raid[p.f]&&!!FACT[p.f]&&!p.cr&&p.siege==null&&p.siegeT==null&&!p.hunt&&!p.ch&&(!p.goal||p.goal==='roam'||p.goal==='nest'||p.goal==='raid')&&!(svFin(p.cvCd)&&p.cvCd>=G.day)}
function cvSeen(x,y){return typeof visionRadius==='function'&&G&&G.p&&Math.hypot(x-G.p.x,y-G.p.y)<=visionRadius()}
function cvNear(x,y){return G.towns[nearestTown(x,y)]}

/* ---- the hourly world step ---- */
function cvTick(h){if(!G||!Array.isArray(G.parties)||!(h>0))return;G.cvAcc=svNum(G.cvAcc,0)+h;let n=0;while(G.cvAcc>=1&&n<720){G.cvAcc-=1;n++;cvHour()}if(G.cvAcc>=1)G.cvAcc=0}
function cvHour(){const L=cvList(),cars=[];for(const p of G.parties)if(p.goal==='caravan'&&!p.clash&&!p.gone)cars.push(p);
 if(cars.length){const R=CV.near*TS;for(const r of G.parties){if(!cvRaider(r))continue;for(const c of cars){if(c.clash)continue;const dx=c.x-r.x,dy=c.y-r.y;if(dx>R||dx<-R||dy>R||dy<-R||dx*dx+dy*dy>R*R)continue;
   if(cvStr(c)<=cvStr(r)){cvStart(c,r);break}}}}   // the rule: they attack iff the guards are no stronger than they are
 for(const cl of L.slice())cvStep(cl);
 if(L.length!==cvList().length||G.parties.some(p=>p.gone))G.parties=G.parties.filter(p=>!p.gone)}
// the band falls on the caravan: both stop side by side, the band on the side it came from
function cvStart(c,r){const id=G.nid++,side=r.x>=c.x?1:-1;let rx=c.x+side*52,ry=c.y;if(!okAt(rx,ry)){rx=c.x-side*52;if(!okAt(rx,ry))rx=c.x}
 r.x=rx;r.y=ry;r.tx=rx;r.ty=ry;c.tx=c.x;c.ty=c.y;c.clash=id;r.clash=id;r.ch=0;
 const cl={id,c:c.id,r:r.id,x:Math.round((c.x+rx)/2),y:Math.round(c.y),gs:cvStr(c),rs:cvStr(r),gh:1,rh:1,h:0,day:G.day};cvList().push(cl);
 const t=cvNear(cl.x,cl.y),F=FACT[r.f],line=`${F?F.n:'Raiders'} fell on a caravan of ${cvOwnerName(c)} near ${t?t.name:'the road'}`;
 if(cvSeen(cl.x,cl.y)){worldNews(line);if(typeof toast==='function')toast(`${F?F.n:'Raiders'} fall on a caravan of ${cvOwnerName(c)}! March there to help the guards.`)}
 else if(seenAt(Math.floor(cl.x/TS),Math.floor(cl.y/TS)))worldNews(line);return cl}
function cvRng(cl){return mulberry((((G.seed|0)^0x3c4a7a5)+Math.imul(cl.id|0,2654435761)+Math.imul((cl.h|0)+1,40503))>>>0)}
function cvStep(cl){const C=cvParty(cl.c),R=cvParty(cl.r);if(!C||!R){cvEnd(cl,C?'guards':'raiders',true);return}
 const r=cvRng(cl),gs=Math.max(.05,cl.gs)*CV.def,rs=Math.max(.05,cl.rs);cl.h=(cl.h|0)+1;
 const dG=Math.min(CV.cap1,CV.K*rs*cl.rh/gs*(.6+.8*r())),dR=Math.min(CV.cap1,CV.K*gs*cl.gh/rs*(.6+.8*r()));
 cl.gh=Math.round(Math.max(0,cl.gh-dG)*1000)/1000;cl.rh=Math.round(Math.max(0,cl.rh-dR)*1000)/1000;
 if(cl.gh<=CV.gBreak)cvEnd(cl,'raiders');else if(cl.rh<=CV.rBreak||cl.h>=CV.maxH)cvEnd(cl,'guards')}
// who: 'guards' (the caravan goes on) | 'raiders' (the caravan is lost). quiet: a party went missing (no news)
function cvEnd(cl,who,quiet){const L=cvList(),i=L.indexOf(cl);if(i>=0)L.splice(i,1);const C=cvParty(cl.c),R=cvParty(cl.r);if(C)delete C.clash;if(R)delete R.clash;
 const t=cvNear(cl.x,cl.y),F=R&&FACT[R.f],seen=seenAt(Math.floor(cl.x/TS),Math.floor(cl.y/TS)),own=C?cvOwnerName(C):'';
 if(who==='guards'){if(R){R.mult=Math.round(R.mult*Math.max(.3,cl.rh)*100)/100;R.cvCd=G.day+CV.cd;if(R.mult<.3)R.gone=1}
  if(C){const g=Object.assign({},cvGuardOf(C));g.n=clamp(Math.round(g.n*Math.max(.25,cl.gh)),g.n?1:0,8);C.guard=g;C.mult=cvGuardMult(g);if(svObj(C.cargo))C.cargo.crowns=Math.round((C.cargo.crowns||0)*(.7+.3*cl.gh));
   if(!quiet&&seen)worldNews(`The guards of a caravan of ${own} beat off ${F?F.n.toLowerCase():'raiders'} near ${t?t.name:'the road'}`)}}
 else{if(C){C.gone=1;const A=G.towns[C.from],T0=G.towns[C.to];if(A)A.pros=clamp(svNum(A.pros,50)-3,0,100);if(T0)T0.pros=clamp(svNum(T0.pros,50)-1,0,100);
   if(R&&svObj(C.cargo))R.loot=cvMergeLoot(R.loot,C.cargo);if(!quiet)worldNews(`${F?F.n:'Raiders'} plundered a caravan of ${own}${T0?' bound for '+T0.name:''}`)}
  if(R){R.mult=Math.round(R.mult*Math.max(.5,cl.rh)*100)/100;R.cvCd=G.day+CV.cd}}
 return who}
function cvMergeLoot(a,b){const B0=cargoFix(b,0,G.seed)||{crowns:0};if(!svObj(a))return B0;const A=cargoFix(a,0,G.seed)||{crowns:0};A.crowns+=B0.crowns;A.food+=B0.food;A.tools+=B0.tools;A.salves+=B0.salves;
 for(const k in B0.parts)A.parts[k]=(A.parts[k]||0)+B0.parts[k];A.items=A.items.concat(B0.items).slice(0,8);A.trade=A.trade.concat(B0.trade).slice(0,8);return A}

/* ---- the company and a clash on the map ---- */
// worldTick: the company walked up to a clash -> the sheet (once; again only after it walked away). True when it stopped the march.
function cvReach(x,y){const L=G&&G.clashes;if(!Array.isArray(L)||!L.length)return false;for(const cl of L){const d=Math.hypot(cl.x-x,cl.y-y);
  if(cl.bo){if(d>2*TS)cl.bo=0;continue}if(d<CV.reach*TS&&typeof sheet==='function'&&!sheetOpen){G.moving=false;G.route=[];G.path=[];G.dest=null;G.tap=null;cvSheet(cl.id);return true}}return false}
function cvTap(p){const cl=cvOf(p);if(!cl)return false;if(Math.hypot(cl.x-G.p.x,cl.y-G.p.y)<1.6*TS){cvSheet(cl.id);return true}cl.bo=0;goTo(cl.x,cl.y);return true}
function cvOdds(cl){const q=(cl.gs*CV.def*cl.gh)/Math.max(.01,cl.rs*cl.rh);return q<.6?'The guards will be overrun within hours.':q<.95?'The guards are losing ground.':q<1.15?'It could go either way.':'The guards should hold.'}
function cvBarHTML(v,cls){const p=clamp(Math.round(v*100),0,100);return`<i class="cv-bar ${cls}"><b style="width:${p}%"></b></i>`}
function cvSheet(id){const cl=cvById(id);if(!cl||typeof sheet!=='function')return;const C=cvParty(cl.c),R=cvParty(cl.r);if(!C||!R)return;const g=cvGuardOf(C),q=cvQual(g),F=FACT[R.f],T0=G.towns[C.to];
 const left=Math.max(g.n?1:0,Math.round(g.n*Math.max(cl.gh,.2))),own=cvOwnerName(C),ic=(n,s)=>typeof lkIc==='function'?lkIc(n,s):'',esc=s=>typeof htmlEsc==='function'?htmlEsc(s):String(s);
 const st=typeof partyStrength==='function'?partyStrength(R):2,sw=typeof lkStrWord==='function'?lkStrWord(st):'';
 sheet(`<div class="bs-hd">${ic('swords',48)}<div><div class="pn-kick">Ambush on the road · ${esc(F?F.n:'Raiders')}</div><h2>${esc(F?F.n:'Raiders')} fall on a caravan of ${esc(own)}</h2>
 <p>Wagons drawn into a ring, oxen bellowing, the guards fighting for their lives${T0?` on the road to ${esc(T0.name)}`:''}.</p></div></div>
 <div class="cv-vs"><div class="cv-side ally">${ic('goal-caravan',32)}<span><b>The caravan's guards</b><small>${left} ${left===1?q.n.replace(/s$/,''):q.n}${g.cap?' and a captain':''} · ${Math.round(cl.gh*100)}% still in the fight</small>${cvBarHTML(cl.gh,'ally')}</span></div>
 <div class="cv-side foe">${ic('rep-hostile',32)}<span><b>${esc(typeof partyLabel==='function'?partyLabel(R):F.n)}</b><small>${esc(sw)} · ${Math.round(cl.rh*100)}% of their strength</small>${cvBarHTML(cl.rh,'foe')}</span></div></div>
 <p class="pn-p dim">Left alone: ${cvOdds(cl)} They have fought for ${cl.h} hour${cl.h===1?'':'s'}.</p>
 <p class="bs-cost">${ic('rep-allied',16)}<span>Join on the guards' side: they fight beside you on their own, and ${esc(own)} will remember it. <b>Kill one of them and the whole caravan turns on you.</b></span></p>
 <div class="row"><button class="pri" onclick="cvGo(${cl.id})">${ic('swords',16)}Intervene</button><button onclick="cvBack(${cl.id})">${ic('back',16)}Back off</button></div>`,'bs')}
function cvBack(id){const cl=cvById(id);if(cl)cl.bo=1;if(typeof closeSheet==='function')closeSheet();if(typeof toast==='function')toast('The company keeps its distance. The fight goes on.')}
function cvGo(id){const o=cvBattle(cvById(id));if(typeof closeSheet==='function')closeSheet(true);if(!o)return null;G.moving=false;G.route=[];engage(o);return o}
// the battle options for joining clash cl (null when it is over): the band as partyBattle makes it, worn down by the fight so far, and the guards in o.cv
function cvBattle(cl){if(!cl)return null;const C=cvParty(cl.c),R=cvParty(cl.r);if(!C||!R)return null;const o=partyBattle(R),g=cvGuardOf(C);
 o.mult=Math.round(Math.max(.2,R.mult*Math.max(.35,cl.rh))*100)/100;o.src={type:'clash',id:cl.id,c:C.id,r:R.id,pf:R.f};
 const n=g.n>0?clamp(Math.round(g.n*Math.max(cl.gh,.2)),1,g.n):0;
 o.cv={cl:cl.id,c:C.id,f:FACT[C.f]?C.f:'free',t:g.t,cap:g.cap?1:0,n,gm:Math.round(Math.max(.05,cvStr(C)*cl.gh)*100)/100};return o}
// attacking a caravan outright: its guards as the town hired them (the company fights them, so they are foes)
function cvCaravanBattle(p){const g=cvGuardOf(p),ids=cvGuardIds(g,Math.max(1,g.n));return{f:FACT[p.f]?p.f:'bandit',mult:p.mult,foes:ids,cvNames:g.t,src:{type:'party',id:p.id,goal:'caravan',pf:p.f}}}

// the map readout (82-inspect.js worldCard) for a caravan, a band in a clash, or a band carrying plunder; '' for anything else
function cvCard(e){if(!e||!G)return'';const esc=s=>typeof htmlEsc==='function'?htmlEsc(s):String(s),lab=typeof partyLabel==='function'?partyLabel(e):'',cl=cvOf(e),hos=typeof partyHostile==='function'&&partyHostile(e);
 const sw=s=>s===1?'weaker than the company':s===2?'about an even match for the company':'stronger than the company',st=typeof partyStrength==='function'?partyStrength(e):2;
 const fight=q=>{const C=cvParty(q.c),R=cvParty(q.r),own=C?cvOwnerName(C):'',F=R&&FACT[R.f];return`<div class="ins-note"><span class="ins-bad">${e.goal==='caravan'?`Under attack by ${esc(F?F.n.toLowerCase():'raiders')}`:`Falling on a caravan of ${esc(own)}`}</span>: the guards at ${Math.round(q.gh*100)}%, the raiders at ${Math.round(q.rh*100)}%. ${cvOdds(q)}</div><div class="ins-note">Tap to march there and choose: intervene on the guards' side, or back off.</div>`};
 if(e.goal==='caravan'){const g=cvGuardOf(e),gd=e.cargo&&typeof GOODS==='object'&&GOODS[e.cargo.good]?GOODS[e.cargo.good].n:'';
  return`<div class="ins-h"><b class="ins-n">${esc(lab)}</b><span class="ins-tag ${cl?'foe':'ally'}">${cl?'Ambushed':'Caravan'}</span></div><div class="ins-sub">${esc(cvGuardLine(e))}</div>`
   +`<div class="ins-note">${g.n>0?'The guards are '+sw(st):'Nobody to stop a robber'}.${gd?' Carrying '+esc(gd.toLowerCase())+(e.cargo.crowns?' and a strongbox':'')+'.':''}</div>`
   +(cl?fight(cl):e.esc?`<div class="ins-note ins-good">Under the company's escort: be at ${esc(G.towns[e.to]?G.towns[e.to].name:'its town')} when it arrives for ${e.esc.pay} crowns.</div>`:`<div class="ins-note">They will not attack you. Tap them nearby to choose whether to strike (it costs standing with ${esc(typeof lkFacName==='function'?lkFacName(e.f):factName(e.f))}).</div>`)}
 if(cl)return`<div class="ins-h"><b class="ins-n">${esc(lab)}</b><span class="ins-tag foe">${hos?'Hostile':'Raiders'}</span></div><div class="ins-sub">${st===1?'A small band, weaker than the company':st===2?'A warband, about an even match':'A large host, stronger than the company'}</div>`+fight(cl);
 return''}
/* ---- the battle: guards beside the company (startBattle -> cvSetup, killUnit -> cvGuardDown) ---- */
function cvNameUnit(u,t){const n=cvGuardName(u.eid,t);u.name=u.rank>=1.5?(u.rank>=2.75?'Elite ':'Veteran ')+n.toLowerCase():n}
function cvCost(id){const e=HOUSEUNITS.find(x=>x[0]===id);return e?e[1]:25}
function cvSetup(b,o,used){if(o.cvNames)for(const u of b.units)if(u.side===1&&CVNM[u.eid])cvNameUnit(u,o.cvNames|0);
 const C=o.cv;if(!svObj(C))return;const ids=cvGuardIds({t:C.t,cap:C.cap,n:8},C.n|0),L=[];let cost=0;for(const id of ids)cost+=cvCost(id);
 const rk=typeof runK==='function'?runK('budget'):1,bud=battleBudget(Object.assign({},o,{mult:C.gm}))/(rk||1),x=cost>0?bud/cost:1;
 for(const id of ids){if(!EN[id])continue;const u=mkEnemy(id,C.f);u.side=0;u.ros=1;u.rx=x>1?Math.min(FOE_RANK.max,Math.pow(x,1/1.15)):1;if(typeof enemyInit==='function')enemyInit(u,id);initUnit(u);
  if(x<1){const k=Math.max(.35,x);u.hp=u.hpMax=Math.max(8,Math.round(u.hpMax*Math.pow(k,.6)));const dk=Math.pow(k,.4);u.wpn.d=[Math.round(u.wpn.d[0]*dk),Math.round(u.wpn.d[1]*dk)];u.dmgK=(u.dmgK||1)*dk}
  u.side=0;u.ally=1;u.grd=1;u.f=C.f;cvNameUnit(u,C.t);L.push(u)}
 const w=typeof objVipUnit==='function'?objVipUnit('wagon'):null;let wp=[];if(w){w.cvw=1;w.name='Caravan wagon';wp=place([w],7,7,1,b.tiles,used)}
 const gp=place(L,5,6,1,b.tiles,used);b.units.push(...wp,...gp);
 b.cv={cl:C.cl,c:C.c,f:C.f,t:C.t,n0:gp.length,turned:0,by:null,dead:0,guards:gp,wagon:wp[0]||null,hp0:gp.reduce((a,u)=>a+u.hpMax,0)}}
function cvGuardDown(t,src){const c=B&&B.cv;if(!c)return;c.dead++;if(!c.turned&&src&&src.side===0&&!src.ally&&!src.grd&&!src.vip)cvTurn(src,t)}
function cvTurn(src,t){const c=B&&B.cv;if(!c||c.turned)return;c.turned=1;c.by=src?src.name:'';
 for(const u of c.guards){if(!u.alive)continue;u.side=2;delete u.ally;float(u,'Hostile!','#ff7a6b')}
 say(`${src?src.name+' cut down '+t.name+'. ':''}You killed a caravan guard: the caravan turns on you!`);
 if(typeof toast==='function')toast('You killed a caravan guard: the caravan turns on you!');if(typeof FX==='object'&&FX.ui)FX.ui()}
// the player taps a guard: the first tap warns, a second tap on the same guard strikes him with the plain attack
function cvTapGuard(u,t,k){const a=abilityInfo(u,'attack');if(mdist(u,t)>a.rng||!canUse(u,a)){say(`${t.name}: a caravan guard, fighting on your side. ${unitLine(t)}.`);return true}
 const arm=t.id+':'+B.turns;if(B.cvArm!==arm){B.cvArm=arm;say(`${t.name} is a caravan guard on your side. Tap him again to strike: kill one and the whole caravan turns on you.`);if(typeof updateBUI==='function')updateBUI();return true}
 B.cvArm=null;if(typeof losInfo==='function'&&losInfo(u,t,a).blocked){say('No line of fire to '+t.name+'.');return true}
 if(typeof fcClear==='function')fcClear();if(typeof planClear==='function')planClear();useAbility(u,a,k);return true}
// resolveBattle: what became of the guards, the wagon and the band -> res.cv
function cvResolve(b,res,win){const c=b.cv;if(!c)return null;const al=c.guards.filter(u=>u.alive),hp=al.reduce((a,u)=>a+Math.max(0,u.hp),0),R=b.units.filter(u=>u.side===1&&!u.spawned),r0=R.reduce((a,u)=>a+u.hpMax,0),r1=R.filter(u=>u.alive).reduce((a,u)=>a+Math.max(0,u.hp),0);
 res.cv={cl:c.cl,c:c.c,turned:!!c.turned,by:c.by,n0:c.n0,alive:al.length,dead:c.n0-al.length,gh:c.hp0>0?Math.round(hp/c.hp0*1000)/1000:0,rh:r0>0?Math.round(r1/r0*1000)/1000:0,rleft:R.filter(u=>u.alive).length,wagon:!!(c.wagon&&c.wagon.alive)};return res.cv}
function cvReward(C,n0){return Math.round(clamp(25+(typeof cargoValue==='function'?cargoValue(C.cargo):0)*.12+8*n0,40,450))}
// worldBattleEnd for src.type 'clash': the world's side of it; out.cv is what the after sheet tells
function cvBattleEnd(s,win,res,out){const cl=cvById(s.id),rc=res&&res.cv;if(!cl||!rc)return out;const C=cvParty(cl.c),R=cvParty(cl.r),add=(f,n,why)=>{const d=repGain(f,n,why);if(d)out.rep.push({f,n:d})};
 const own=C?cvOwnerName(C):'the caravan',T0=C?G.towns[C.to]:null,F=R&&FACT[R.f],k={cl:cl.id,c:cl.c,own,to:T0?T0.name:'',raiders:F?F.n:'The raiders',alive:rc.alive,dead:rc.dead,n0:rc.n0,turned:rc.turned,by:rc.by,win:!!win,crowns:0,good:null};out.cv=k;
 if(rc.turned&&C){add(C.f,CV.rep.turn,'Attacked a caravan');if(C.f!=='free')for(const h of G.houses)if(h.id!==C.f&&atWar(h.id,C.f))add(h.id,3,'Struck at their enemy')}
 if(win){const L=cvList(),i=L.indexOf(cl);if(i>=0)L.splice(i,1);if(R)R.gone=1;G.renown+=3;
  if(rc.turned){k.k='robbed';if(C){C.gone=1;const t=cargoTake(cargoFix(C.cargo,C.id,G.seed)||{crowns:0});out.crowns=t.crowns;out.cargo=t;k.cargo=t.text;cvLost(C)}worldNews(`The company turned on a caravan of ${own} and plundered it`)}
  else if(!rc.wagon){k.k='burned';if(C){C.gone=1;cvLost(C);add(C.f,CV.rep.tried,'Fought for a caravan')}worldNews(`A caravan of ${own} was burned in a fight with ${k.raiders.toLowerCase()}`)}
  else if(C){delete C.clash;const g=Object.assign({},cvGuardOf(C));g.n=rc.alive;C.guard=g;C.mult=cvGuardMult(g);const pay=cvReward(C,rc.n0);G.crowns+=pay;k.crowns=pay;
   if(svObj(C.cargo)&&Array.isArray(C.cargo.trade)&&C.cargo.trade.length){const x=C.cargo.trade.shift();if(ITEMS[x.id]){G.stash.push(x.id);k.good=ITEMS[x.id].n}}
   add(C.f,CV.rep.save,'Saved a caravan from '+k.raiders.toLowerCase());k.k=rc.alive?'saved':'alone';k.pay=Math.round(pay*.8+40);if(typeof achEvent==='function')achEvent('caravan');worldNews(`The company saved a caravan of ${own} from ${k.raiders.toLowerCase()}`)}
  G.parties=G.parties.filter(p=>!p.gone)}
 else{k.k='left';cl.gh=Math.round(clamp(cl.gh*rc.gh,0,1)*1000)/1000;cl.rh=Math.round(clamp(cl.rh*rc.rh,0,1)*1000)/1000;if(rc.turned)cl.turned=1;cl.bo=1;
  if(C){const g=Object.assign({},cvGuardOf(C));g.n=rc.alive;C.guard=g;C.mult=cvGuardMult(g)}
  if(!rc.alive||!rc.wagon)k.end=cvEnd(cl,'raiders');else if(!rc.rleft)k.end=cvEnd(cl,'guards');G.parties=G.parties.filter(p=>!p.gone)}
 return out}
function cvLost(C){const A=G.towns[C.from],T0=G.towns[C.to];if(A)A.pros=clamp(svNum(A.pros,50)-3,0,100);if(T0)T0.pros=clamp(svNum(T0.pros,50)-1,0,100)}
// after the battle: the caravan master's word (and the escort offer when no guard is left)
function cvAfterSheet(k){if(!k||typeof sheet!=='function')return;const ic=(n,s)=>typeof lkIc==='function'?lkIc(n,s):'',esc=s=>typeof htmlEsc==='function'?htmlEsc(s):String(s);let h='',btn=`<button class="pri" onclick="closeSheet()">March on</button>`;
 const lost=k.dead>0?`<p class="pn-p dim">${k.dead} of the ${k.n0} guards fell.</p>`:'';
 if(k.k==='saved'||k.k==='alone')h=`<div class="bs-hd">${ic('goal-caravan',48)}<div><div class="pn-kick">Caravan of ${esc(k.own)}</div><h2>The caravan is saved</h2><p>The caravan master counts out <span class="coin">${k.crowns} crowns</span>${k.good?` and hands over ${esc(k.good.toLowerCase())} from the wagons`:''}. ${esc(k.own)} will hear of this.</p></div></div>${lost}`;
 if(k.k==='saved')h+=`<p class="pn-p">${k.alive} guard${k.alive===1?'':'s'} take${k.alive===1?'s':''} up the road again${k.to?' to '+esc(k.to):''}.</p>`;
 if(k.k==='alone'){h+=`<p class="pn-p">Not one of the guards is left standing. The master looks down the empty road${k.to?' to '+esc(k.to):''}: will the company see the wagons through? He offers <span class="coin">${k.pay} crowns</span> more if you are there when they arrive.</p>`;
  btn=`<div class="row"><button class="pri" onclick="cvEscort(${k.c},1)">${ic('goal-caravan',16)}Take over the escort</button><button onclick="cvEscort(${k.c},0)">Let them go</button></div>`}
 if(k.k==='burned')h=`<div class="bs-hd">${ic('rep-hostile',48)}<div><div class="pn-kick">Caravan of ${esc(k.own)}</div><h2>The wagons burn</h2><p>The raiders are beaten, but the caravan is lost: its wagon went up in flames. The surviving guards thank you and walk home.</p></div></div>${lost}`;
 if(k.k==='robbed')h=`<div class="bs-hd">${ic('rep-hostile',48)}<div><div class="pn-kick">Caravan of ${esc(k.own)}</div><h2>The caravan is yours</h2><p>${k.by?esc(k.by)+' struck the first guard down, and the':'The'} rest died fighting you. The wagons are the company's now${k.cargo?': '+esc(k.cargo):''}.</p></div></div><p class="bs-cost">${ic('rep-hostile',16)}<span>${esc(k.own)} will not forget a caravan the company turned on.</span></p>`;
 if(k.k==='left')h=`<div class="bs-hd">${ic('back',48)}<div><div class="pn-kick">Caravan of ${esc(k.own)}</div><h2>The fight goes on without you</h2><p>${k.end==='raiders'?`The guards are finished: ${esc(k.raiders.toLowerCase())} take the wagons.`:k.end==='guards'?'The raiders are spent: the caravan limps on.':`${k.alive} guard${k.alive===1?' holds':'s hold'} on beside the wagons.`}</p></div></div>${k.turned?`<p class="bs-cost">${ic('rep-hostile',16)}<span>The guards will not forget that the company turned on them.</span></p>`:''}`;
 sheet(h+btn,'bs')}
function cvEscort(cid,yes){const C=cvParty(cid);if(typeof closeSheet==='function')closeSheet();if(!C)return false;if(!yes){if(typeof toast==='function')toast('The wagons roll on alone.');return false}
 const g=cvGuardOf(C),pay=Math.round(cvReward(C,Math.max(1,g.n||3))*.8+40);C.esc={pay,day:G.day};const T0=G.towns[C.to];
 if(typeof toast==='function')toast(`Escort the caravan${T0?' to '+T0.name:''}: be there when it arrives for ${pay} crowns.`);if(typeof save==='function')save();return true}
// wsArrive: an escorted caravan reaches its town; the company is paid if it is close by
function cvEscArrive(p){const e=p.esc,T0=G.towns[p.to];if(!svObj(e)||!T0)return;delete p.esc;
 if(Math.hypot(T0.x-G.p.x,T0.y-G.p.y)<=5*TS){const pay=Math.max(0,Math.round(svNum(e.pay,0)));G.crowns+=pay;repGain(p.f,CV.rep.esc,'Escorted a caravan to '+T0.name);worldNews(`The company saw a caravan of ${cvOwnerName(p)} safe to ${T0.name}`);if(typeof toast==='function')toast(`The caravan reaches ${T0.name}: the master pays ${pay} crowns.`)}
 else worldNews(`A caravan of ${cvOwnerName(p)} reached ${T0.name} without its escort`)}

/* ---- saves (20-state.js repairSave; SAVEVER 16 adds guards and G.clashes) ---- */
function cvGuardFix(g){if(!svObj(g))return null;return{n:clamp(Math.floor(svNum(g.n,0)),0,8),t:clamp(Math.floor(svNum(g.t,1)),1,5),cap:g.cap?1:0,k:clamp(svNum(g.k,1),.5,1.5)}}
function cvRepair(g){if(!g)return;const P=Array.isArray(g.parties)?g.parties:[],byId=new Map();for(const p of P)byId.set(p.id,p);g.cvAcc=clamp(svNum(g.cvAcc,0),0,1);
 for(const p of P){if(p.goal==='caravan'){const f=cvGuardFix(p.guard);if(f)p.guard=f;else delete p.guard;if(svObj(p.esc)&&svFin(p.esc.pay))p.esc={pay:Math.max(0,Math.round(p.esc.pay)),day:Math.floor(svNum(p.esc.day,1))};else delete p.esc}else{delete p.guard;delete p.esc}
  if(svObj(p.loot))p.loot=cargoFix(p.loot,p.id,svNum(g.seed,0));else delete p.loot;if(p.cvCd!=null){if(svFin(p.cvCd))p.cvCd=Math.floor(p.cvCd);else delete p.cvCd}}
 const L=Array.isArray(g.clashes)?g.clashes:[],out=[],used=new Set();
 for(const c of L){if(!svObj(c)||!svFin(c.id))continue;const C=byId.get(c.c),R=byId.get(c.r);if(!C||!R||C.goal!=='caravan'||C===R||used.has(C.id)||used.has(R.id))continue;
  const n=x=>Math.round(clamp(svNum(x,1),0,1)*1000)/1000;out.push({id:Math.floor(c.id),c:C.id,r:R.id,x:svFin(c.x)?c.x:(C.x+R.x)/2,y:svFin(c.y)?c.y:C.y,gs:Math.max(.05,svNum(c.gs,svNum(C.mult,.5))),rs:Math.max(.05,svNum(c.rs,svNum(R.mult,.8))),gh:n(c.gh),rh:n(c.rh),h:Math.max(0,Math.floor(svNum(c.h,0))),day:Math.floor(svNum(c.day,svNum(g.day,1)))});const q=out[out.length-1];if(c.bo)q.bo=1;if(c.turned)q.turned=1;used.add(C.id);used.add(R.id)}
 for(const c of out){byId.get(c.c).clash=c.id;byId.get(c.r).clash=c.id}
 for(const p of P)if(p.clash&&!used.has(p.id))delete p.clash;g.clashes=out}
// v15 -> v16: guards for the caravans on the road, from their home town as it stands (no randomness), no clashes yet
function cvMigrate(g){if(!svObj(g))return g;const T=Array.isArray(g.towns)?g.towns:[];g.clashes=[];
 if(Array.isArray(g.parties))for(const p of g.parties){if(!svObj(p)||p.goal!=='caravan')continue;const G0=G;try{G={towns:T,houses:Array.isArray(g.houses)?g.houses:[]};const gd=cvGuardFor(Number.isInteger(p.from)?p.from:-1,.5);p.guard=gd;p.mult=cvGuardMult(gd)}finally{G=G0}}return g}

/* ---- the clash on the map (70-render.js calls cvDrawMap after the sprites): crossed swords swinging over the two parties, sparks
   at each blow and dust at their feet; a painted icon at device pixels (pkCanvas, Detail High), the pixel icon otherwise ---- */
const CVFX={px:null,pxK:''};
function cvIcon(px){let c=null;if(typeof pkCanvas==='function'){try{c=pkCanvas('swords',px)}catch(e){c=null}}if(c)return c;
 if(CVFX.px&&CVFX.pxK===px)return CVFX.px;const rows=typeof iconRows==='function'?iconRows('swords'):null;if(!rows||typeof document==='undefined')return null;
 const n=rows.length,cv=document.createElement('canvas');cv.width=cv.height=px;const q=cv.getContext('2d');if(!q)return null;const s=px/n;
 for(let y=0;y<n;y++)for(let x=0;x<rows[y].length;x++){const ch=rows[y][x];if(ch==='.'||ch===' '||!PAL[ch])continue;q.fillStyle=PAL[ch];q.fillRect(Math.floor(x*s),Math.floor(y*s),Math.ceil(s),Math.ceil(s))}CVFX.px=cv;CVFX.pxK=px;return cv}
// q: the canvas context; sx, sy: the screen point above the fight (device px); k: device px per art px; t: ms; still: reduced motion
function cvClashFx(q,sx,sy,k,t,still,seed){const ph=still?.5:((t+seed*137)%760)/760,hit=ph<.18,px=Math.max(16,Math.round(15*k/2)*2),ic=cvIcon(px);
 q.save();q.setTransform(1,0,0,1,0,0);q.imageSmoothingEnabled=true;
 // dust kicked up at their feet
 for(let i=0;i<4;i++){const p2=still?.4:((t/900+i*.25+seed*.13)%1),dx=(i-1.5)*7*k+Math.sin(i*2.1+seed)*3*k,dy=24*k-p2*7*k,r=(2+p2*4)*k;q.globalAlpha=(1-p2)*.45;q.fillStyle=i&1?'#b9ad8f':'#8a7f62';q.beginPath();q.arc(sx+dx,sy+dy,r,0,6.283);q.fill()}
 // a dark badge with a pulsing red rim so it reads on any ground
 const R=px*.62,pul=still?0:Math.sin(t/180)*.5+.5;q.globalAlpha=.9;q.fillStyle='#0b1514';q.beginPath();q.arc(sx,sy,R+k*.8,0,6.283);q.fill();q.fillStyle='#e9e0c9';q.beginPath();q.arc(sx,sy,R-k*.3,0,6.283);q.fill();
 q.globalAlpha=.65+.35*pul;q.strokeStyle=hit?'#ffd27a':'#c4493f';q.lineWidth=Math.max(1.5,k*.9);q.beginPath();q.arc(sx,sy,R+k*(.6+pul*.8),0,6.283);q.stroke();
 // the swords: drawn back, then swung together (a jolt on the blow)
 if(ic){const sw=still?0:ph<.18?-.05+ph*.3:Math.sin((ph-.18)/.82*Math.PI)*.32,sc=hit?1.12-ph*.6:1,bob=still?0:Math.round(Math.sin(ph*6.283)*k*.8);
  q.globalAlpha=1;q.save();q.translate(sx,sy+bob);q.rotate(-sw);q.scale(sc,sc);q.drawImage(ic,-px/2,-px/2,px,px);q.restore()}
 // sparks fly at the moment of the blow
 if(!still&&ph<.42){const a0=seed*.7,e=ph/.42;for(let i=0;i<7;i++){const a=a0+i*.9,d=(3+e*10)*k,x=sx+Math.cos(a)*d,y=sy-2*k+Math.sin(a)*d*.8-e*3*k,s=Math.max(1,Math.round(k*(1.3-e*.6)));
   q.globalAlpha=1-e;q.fillStyle=i%3?'#ffd27a':'#fff4c8';q.fillRect(Math.round(x),Math.round(y),s,s)}
  q.globalAlpha=(1-ph/.18)*.8;if(hit){q.fillStyle='#fff4c8';q.beginPath();q.arc(sx,sy-k,px*.22*(1+ph*3),0,6.283);q.fill()}}
 q.restore()}
// the map's clashes: called with the world transform (art px) set; vis(x,y) = can the company see it. Returns true when one was drawn (keeps the frame live).
function cvDrawMap(q,sc,bx,by,vis,t,still){const L=G&&G.clashes;if(!Array.isArray(L)||!L.length)return false;let n=0;
 for(const cl of L){if(!vis(cl.x,cl.y))continue;const ax=cl.x/WVU,ay=cl.y/WVU;cvClashFx(q,Math.round(bx+ax*sc),Math.round(by+(ay-27)*sc),sc,t,still,cl.id%7);n++}return n>0}
