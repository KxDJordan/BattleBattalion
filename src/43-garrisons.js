/* ================= TOWN GARRISONS (world agent, round 2) =================
   Every house town keeps a garrison; a free town keeps a watch from GR.freeMin (a town) up. Its full strength (grFull, on the scale every
   band's mult is on: 1 = an even fight for the company) follows the town: GR.base[size] x (.8 + prosperity / 250) x GR.house for a house
   town (x GR.seat at the house's seat, x GR.war for a warlike house) or x GR.free for a free town's watch. Eastern towns and towns a crisis
   holds have none. State on the town: t.gar = {h (what is left of it, 0..1), out (the party out on a sally), cd (the hour it may sally again)};
   absent = at full strength, at home. It recovers GR.rec[size] a day, not while the town is besieged.
   The sally (grHour, every in-game hour, from cvHour): a town whose garrison is home, rested (cd), at least GR.min strong and not besieged
   (a house siege, a crisis siege, a town held) sends it out against the nearest hostile band within GR.R[size] tiles of its walls:
   monsters, brigands, raiders and crisis hosts (never a caravan, a rival company, another house's soldiers, a band already in a clash, a
   besieging host or a band lying in wait for an escort), and only one it dares to fight (its strength >= the band's x GR.dare, x GR.dareCr
   for a crisis host). A town hostile to the company sends it after the company the same way. The garrison is a party (goal 'patrol',
   p.gar = its town, p.tgt = the band's id or -1 for the company, f = the town's owner): it walks out (real time near the company, GR.spd
   tiles an hour far from it), never further than GR.leash tiles past its radius, for at most GR.out hours, and goes home when the band is
   gone, out of reach or beaten. Reaching the band starts a CLASH (G.clashes, 42-caravans.js, cl.g = 1): the two stand side by side and
   fight it out an hour at a time (grStep: the caravans' Lanchester rule, a private stream from the world seed, the clash id and the hour:
   no game randomness), the garrison fighting at GR.def near its walls; the garrison gives up at gh <= GR.gBreak, the band at rh <= GR.rBreak
   or after GR.maxH hours. Garrison wins: the band limps away from the town (mult x rh, at least GR.keep of it; scattered below .3), a raid on
   the town is broken off. Band wins: the garrison falls back home with what is left. Either way the garrison walks home weakened and its
   town keeps that strength (t.gar.h) until it recovers.
   The company: walking up to the clash or tapping it opens the sheet (grSheet): INTERVENE (a battle beside the garrison: the house's soldiers
   as allies, cvSetup with o.cv.gar, in the house's livery o.livery / u.livery from houseLivery(houseId) when 46-banner.js has it) or BACK OFF.
   Won: GR.pay[size] crowns from the town and GR.rep.help standing with its owner. Kill a soldier and the garrison turns on you (cvTurn):
   GR.rep.turn standing. Lost or fled: the clash goes on with what is left.
   Public: grFull grStr grState grBesieged grHour grMove grStep grEnd grSheet grBattle grBattleEnd grAfterSheet grTownBattle grPartyBattle
           grPartyEnd grBetrayHit grDay grCard grRepair grLabel grIds grLivery */
const GR={R:[2.6,3,3.4],leash:1.6,spd:1.15,hit:.85,dare:.75,dareCr:1.2,min:.45,K:.08,def:1.15,gBreak:.35,rBreak:.3,maxH:12,keep:.45,out:20,cd:8,
 rec:[.12,.15,.18],base:[.45,.75,1.1],house:1.15,seat:1.25,war:1.1,free:.85,freeMin:2,rep:{help:5,turn:-15},pay:[30,50,80],
 nm:{thug:['Town watchman','Man-at-arms'],bmark:['Watch archer','Garrison archer'],bxbow:['Watch crossbowman','Garrison crossbowman'],braid:['Sergeant of the watch','Sergeant-at-arms'],blead:['Captain of the watch','Captain of the garrison']}};
function grT(i){return G&&G.towns?G.towns[i]||null:null}
function grNow(){return(G.day|0)*24+(+G.hour||0)}
// the full strength of town i's garrison (0: none)
function grFull(i){const t=grT(i);if(!t||t.east||t.held)return 0;const sz=clamp(t.size|0||1,1,3),own=t.own,h=typeof houseById==='function'?houseById(own):null;
 if(!h&&own!=='free')return 0;if(!h&&sz<GR.freeMin)return 0;let k=GR.base[sz-1]*(.8+svNum(t.pros,50)/250);
 if(h){k*=GR.house;if(h.seat===i)k*=GR.seat;if(typeof HPERS==='object'&&HPERS[h.pers]&&HPERS[h.pers].patrols)k*=GR.war}else k*=GR.free;
 return Math.round(k*100)/100}
function grState(i){const t=grT(i);if(!t)return null;if(!svObj(t.gar))t.gar={h:1};return t.gar}
function grH(i){const t=grT(i);return t&&svObj(t.gar)?clamp(svNum(t.gar.h,1),0,1):1}
// what stands in the town now (most of it is out on a sally)
function grStr(i){const t=grT(i),f=grFull(i);if(!t||!f)return 0;return Math.round(f*grH(i)*(svObj(t.gar)&&t.gar.out!=null?.35:1)*100)/100}
function grBesieged(i){const t=grT(i);if(!t)return true;if(t.held)return true;if(typeof townSit==='function'&&(townSit(i,'siege')||townSit(i,'crsiege')))return true;
 for(const p of G.parties)if(!p.gone&&(p.siege===i||p.siegeT===i))return true;return false}
function grR(i){const t=grT(i);return GR.R[clamp(t&&t.size|0||1,1,3)-1]}
function grParty(id){for(const p of G.parties)if(p.id===id&&!p.gone)return p;return null}
// a band the garrison of town i (strength s) would march out against
function grFoe(p,s){if(!p||p.gone||p.clash||p.gar!=null||p.goal==='caravan'||p.goal==='merc'||!FACT[p.f]||p.siegeT!=null||p.siege!=null||p.ambE)return false;
 if(typeof humanFact==='function'&&humanFact(p.f))return false;return s>=svNum(p.mult,1)*(p.cr?GR.dareCr:GR.dare)}
function grHostileCo(i){const t=grT(i);if(!t||typeof repTier!=='function')return false;return repTier(t.own).k==='hostile'}
function grSeen(x,y){return typeof seenAt==='function'&&seenAt(Math.floor(x/TS),Math.floor(y/TS))}
function grLabel(p){const t=grT(p.gar);return`The ${p.f==='free'?'watch':'garrison'} of ${t?t.name:'the town'}`}
function grFoeName(R){return R?(typeof partyLabel==='function'?partyLabel(R):FACT[R.f]?FACT[R.f].n:'raiders'):'raiders'}

/* ---- the hourly step (cvHour calls it) ---- */
function grHour(){if(GR.off)return;if(!G||!Array.isArray(G.towns)||!Array.isArray(G.parties))return;const now=grNow();
 for(let i=0;i<G.towns.length;i++){const t=G.towns[i];if(svObj(t.gar)&&t.gar.out!=null)continue;const full=grFull(i);if(!full)continue;const h=grH(i);
  if(h<GR.min||(svObj(t.gar)&&svFin(t.gar.cd)&&now<t.gar.cd)||grBesieged(i))continue;const s=Math.round(full*h*100)/100,R=grR(i)*TS,R2=R*R;let best=null,bd=R2;
  for(const p of G.parties){const dx=p.x-t.x,dy=p.y-t.y;if(dx>R||dx<-R||dy>R||dy<-R)continue;const d=dx*dx+dy*dy;if(d>bd||!grFoe(p,s))continue;bd=d;best=p}
  if(best){const w=grWay(t.x,t.y,best);if(!w||grWayLen(t.x,t.y,w)>(grR(i)+GR.leash)*1.6)best=null}   // no sally across water or round a mountain
  if(best)grSally(i,best);else if(G.grace<=0&&G.p&&mode==='world'&&!G.townOpen&&grHostileCo(i)&&Math.hypot(G.p.x-t.x,G.p.y-t.y)<R)grSally(i,null)}
 const live=(typeof WSIM==='object'?WSIM.live:30)*TS;
 for(const p of G.parties){if(p.gar==null||p.gone||p.clash)continue;p.oh=(p.oh|0)+1;grThink(p);if(p.gone||p.clash)continue;
  const rt=p.rt;delete p.rt;if(!rt||Math.hypot(p.x-G.p.x,p.y-G.p.y)>live){const a=grAim(p),dx=a.x-p.x,dy=a.y-p.y,d=Math.hypot(dx,dy),st=GR.spd*TS;if(d<=st){p.x=a.x;p.y=a.y}else{p.x+=dx/d*st;p.y+=dy/d*st}p.tx=a.x;p.ty=a.y;grContact(p)}}}
// wsArrive: raiders reach the town they were bound for (a day's march at a time far from the company). A garrison at home, rested and
// strong enough meets them short of the walls: they are stopped GR.R x .6 tiles out on the side they came from, and it marches out. -> true
function grRaidCheck(p){const i=p.to,t=grT(i);if(!t||p.clash||p.cr||p.gar!=null)return false;const st=t.gar;if(svObj(st)&&st.out!=null)return false;const full=grFull(i);if(!full)return false;
 const h=grH(i);if(h<GR.min||(svObj(st)&&svFin(st.cd)&&grNow()<st.cd)||grBesieged(i))return false;if(!grFoe(p,Math.round(full*h*100)/100))return false;
 const q=Array.isArray(p.pts)&&p.pts.length>1?p.pts[p.pts.length-2]:{x:p.x,y:p.y},dx=q.x-t.x,dy=q.y-t.y,d=Math.hypot(dx,dy)||1,k=Math.min(grR(i)*.6*TS,d);let x=t.x+dx/d*k,y=t.y+dy/d*k;if(!okAt(x,y)){x=q.x;y=q.y}
 p.x=x;p.y=y;p.tx=x;p.ty=y;if(Array.isArray(p.pts))p.pi=Math.max(0,p.pts.length-1);grSally(i,p);return true}
// out of the gate: a party of the town's owner, carrying the garrison's strength
function grSally(i,foe){const t=grT(i),st=grState(i),full=grFull(i),m=Math.max(.1,Math.round(full*clamp(svNum(st.h,1),0,1)*100)/100),y=t.y+(okAt(t.x,t.y+TS*.5)?TS*.5:0);
 const p=wsAdd({x:t.x,y,f:t.own,goal:'patrol',gar:i,tgt:foe?foe.id:-1,mult:m,from:i,oh:0});p.pts=null;p.pi=0;st.out=p.id;
 if(grSeen(t.x,t.y))worldNews(foe?`${grLabel(p)} marches out against ${grFoeName(foe).replace(/^./,c=>c.toLowerCase())}`:`${grLabel(p)} rides out after the company`);
 if(foe&&typeof cvSeen==='function'&&cvSeen(t.x,t.y)&&typeof toast==='function')toast(`${grLabel(p)} marches out against ${FACT[foe.f]?FACT[foe.f].n.toLowerCase():'raiders'}.`);return p}
// where the party heads: its band, the company, or home
function grGoal(p){const t=grT(p.gar);if(!p.back){if(p.tgt===-1)return G.p;const R=grParty(p.tgt);if(R)return R}return t||p}
// the next waypoint toward the goal: straight where the ground allows, else around the water and peaks (findPath, again when the goal moves)
function grAim(p){const a=grGoal(p);if(!Array.isArray(p.way)||!p.wg||Math.hypot(p.wg.x-a.x,p.wg.y-a.y)>.75*TS){p.way=grWay(p.x,p.y,a)||[{x:a.x,y:a.y}];p.wg={x:a.x,y:a.y}}
 while(p.way.length>1&&Math.hypot(p.way[0].x-p.x,p.way[0].y-p.y)<6)p.way.shift();const q=p.way[0];return p.way.length>1?q:a}
function grWay(x,y,a){if(lineClear(x,y,a.x,a.y))return[{x:a.x,y:a.y}];const r=typeof wsPathTo==='function'?wsPathTo(x,y,a.x,a.y):null;return r&&r.length?r:null}
function grWayLen(x,y,L){let d=0,px=x,py=y;for(const q of L){d+=Math.hypot(q.x-px,q.y-py);px=q.x;py=q.y}return d/TS}
// give up and go home: the band is gone or out of reach, the company left, the hours ran out
function grThink(p){const t=grT(p.gar);if(!t){p.gone=1;return}if(p.back){if(Math.hypot(p.x-t.x,p.y-t.y)<.5*TS||p.oh>GR.out+12)grHome(p);return}
 const lim=(grR(p.gar)+GR.leash)*TS;let a=null;if(p.tgt===-1){if(grHostileCo(p.gar)&&mode==='world')a=G.p}else{const R=grParty(p.tgt);if(R&&!R.clash)a=R}
 if(!a||Math.hypot(a.x-t.x,a.y-t.y)>lim||p.oh>GR.out||grBesieged(p.gar))p.back=1}
function grContact(p){if(p.back||p.tgt===-1||p.clash)return false;const R=grParty(p.tgt);if(!R||R.clash)return false;if(Math.hypot(R.x-p.x,R.y-p.y)>GR.hit*TS)return false;grClash(p,R);return true}
// real-time walking near the company (moveParties calls it instead of its own rules)
function grMove(p,dt,wf){if(p.clash)return;p.rt=1;const a=grAim(p),dx=a.x-p.x,dy=a.y-p.y,d=Math.hypot(dx,dy)||1,sp=Math.min(d,WBAND*(speedAt(p.x,p.y)||.5)*(wf||1)*dt),nx=p.x+dx/d*sp,ny=p.y+dy/d*sp;
 if(okAt(nx,ny)||!okAt(p.x,p.y)){p.x=nx;p.y=ny}else if(okAt(nx,p.y))p.x=nx;else if(okAt(p.x,ny))p.y=ny;p.tx=a.x;p.ty=a.y;
 if(!grContact(p)&&p.back){const t=grT(p.gar);if(t&&Math.hypot(p.x-t.x,p.y-t.y)<.5*TS)grHome(p)}}
// back behind the walls: the town keeps what is left of it
function grHome(p){const st=grState(p.gar),full=grFull(p.gar);p.gone=1;if(st){st.h=full>0?Math.round(clamp(p.mult/full,.05,1)*1000)/1000:1;delete st.out;st.cd=grNow()+GR.cd}}
function grClash(p,R){const id=G.nid++,side=R.x>=p.x?1:-1;let rx=p.x+side*52,ry=p.y;if(!okAt(rx,ry)){rx=p.x-side*52;if(!okAt(rx,ry))rx=p.x}
 R.x=rx;R.y=ry;R.tx=rx;R.ty=ry;p.tx=p.x;p.ty=p.y;p.clash=id;R.clash=id;R.ch=0;
 const cl={id,g:1,ti:p.gar,c:p.id,r:R.id,x:Math.round((p.x+rx)/2),y:Math.round(p.y),gs:Math.max(.05,p.mult),rs:Math.max(.05,svNum(R.mult,1)),gh:1,rh:1,h:0,day:G.day};cvList().push(cl);
 const t=grT(p.gar),F=FACT[R.f],line=`${grLabel(p)} fell on ${F?F.n.toLowerCase():'raiders'} outside the walls`;
 if(typeof cvSeen==='function'&&cvSeen(cl.x,cl.y)){worldNews(line);if(typeof toast==='function')toast(`${grLabel(p)} falls on ${F?F.n.toLowerCase():'raiders'}! March there to fight beside them.`)}else if(grSeen(cl.x,cl.y))worldNews(line);return cl}
function grRng(cl){return mulberry((((G.seed|0)^0x6a1d3c5)+Math.imul(cl.id|0,2654435761)+Math.imul((cl.h|0)+1,40503))>>>0)}
function grStep(cl){const C=cvParty(cl.c),R=cvParty(cl.r);if(!C||!R){grEnd(cl,C?'garrison':'band',true);return}
 const r=grRng(cl),gs=Math.max(.05,cl.gs)*GR.def,rs=Math.max(.05,cl.rs);cl.h=(cl.h|0)+1;
 const dG=Math.min(CV.cap1,GR.K*rs*cl.rh/gs*(.6+.8*r())),dR=Math.min(CV.cap1,GR.K*gs*cl.gh/rs*(.6+.8*r()));
 cl.gh=Math.round(Math.max(0,cl.gh-dG)*1000)/1000;cl.rh=Math.round(Math.max(0,cl.rh-dR)*1000)/1000;
 if(cl.gh<=GR.gBreak)grEnd(cl,'band');else if(cl.rh<=GR.rBreak||cl.h>=GR.maxH)grEnd(cl,'garrison')}
// who: 'garrison' (the band is driven off) | 'band' (the garrison falls back). quiet: a party went missing
function grEnd(cl,who,quiet){const L=cvList(),i=L.indexOf(cl);if(i>=0)L.splice(i,1);const C=cvParty(cl.c),R=cvParty(cl.r);if(C)delete C.clash;if(R)delete R.clash;
 const t=grT(cl.ti),F=R&&FACT[R.f],seen=grSeen(cl.x,cl.y),nm=C?grLabel(C):'The garrison';
 if(who==='garrison'){if(R){R.mult=Math.round(R.mult*Math.max(GR.keep,cl.rh)*100)/100;R.cvCd=G.day+2;if(R.mult<.3)R.gone=1;else grDrive(R,t)}
  if(C){C.mult=Math.round(Math.max(.05,C.mult*Math.max(.3,cl.gh))*100)/100;C.back=1}if(!quiet&&seen)worldNews(`${nm} drove ${F?F.n.toLowerCase():'raiders'} away from ${t?t.name:'the walls'}`)}
 else{if(C){C.mult=Math.round(Math.max(.05,C.mult*Math.max(.2,cl.gh))*100)/100;C.back=1}if(R){R.mult=Math.round(R.mult*Math.max(.5,cl.rh)*100)/100;R.cvCd=G.day+1}
  if(t)t.pros=clamp(svNum(t.pros,50)-2,0,100);if(!quiet&&seen)worldNews(`${F?F.n:'Raiders'} beat ${nm.toLowerCase()} back behind its walls`)}
 return who}
// a beaten band walks off, away from the town (a raid on it is broken off; a crisis host keeps its own orders)
function grDrive(R,t){if(!t||R.cr)return;const dx=R.x-t.x,dy=R.y-t.y,d=Math.hypot(dx,dy)||1,k=(grR(G.towns.indexOf(t))+3.5)*TS;let ax=t.x+dx/d*k,ay=t.y+dy/d*k;if(!okAt(ax,ay)){ax=R.x+dx/d*2*TS;ay=R.y+dy/d*2*TS;if(!okAt(ax,ay)){ax=R.x;ay=R.y}}
 if(R.goal==='raid'){R.goal=R.home!=null?'nest':'roam';delete R.to}R.pts=[{x:Math.round(ax),y:Math.round(ay)}];R.pi=0;R.tx=R.pts[0].x;R.ty=R.pts[0].y;R.ch=0}

/* ---- the daily step: garrisons recover ---- */
function grDay(){if(!G||!Array.isArray(G.towns))return;G.towns.forEach((t,i)=>{if(!svObj(t.gar))return;const g=t.gar;if(g.out==null&&!grBesieged(i))g.h=Math.round(Math.min(1,svNum(g.h,1)+GR.rec[clamp(t.size|0||1,1,3)-1])*1000)/1000;
  if(g.out==null&&g.h>=1&&!(svFin(g.cd)&&g.cd>grNow()))delete t.gar})}

/* ---- the battle: the house's soldiers ---- */
function grTier(i){const t=grT(i),h=t&&typeof houseById==='function'?houseById(t.own):null;return clamp((t?clamp(t.size|0||1,1,3):1)+(h?1:0)+(h&&h.seat===i?1:0),1,5)}
// the soldiers of town i at strength fraction k: [unit ids]
function grIds(i,k){const t=grT(i),T=grTier(i),n=clamp(Math.round(2+grFull(i)*4*clamp(k==null?1:k,0,1)),2,8);return cvGuardIds({t:T,cap:T>=4?1:0},n)}
function grLivery(f){const h=typeof houseById==='function'?houseById(f):null;if(!h)return null;if(typeof houseLivery==='function'){try{const L=houseLivery(f);if(L)return L}catch(e){}}return{c1:h.c1,c2:h.c2,emblem:h.emblem}}
function grNameUnit(u,ti){const N=GR.nm[u.eid],t=grT(ti),hs=t&&typeof houseById==='function'&&houseById(t.own);if(!N)return;const n=N[hs?1:0];u.name=u.rank>=1.5?(u.rank>=2.75?'Elite ':'Veteran ')+n.toLowerCase():n}
// the company fights town ti's garrison (a betrayal's pay taken by force, a hostile town): the house's soldiers in its livery
function grTownBattle(ti,src){const t=grT(ti),f=t&&FACT[t.own]?t.own:'free',s=Math.max(.6,grStr(ti)||grFull(ti)||.6);
 const o={f,mult:Math.round(s*100)/100,foes:grIds(ti,grH(ti)),grNames:ti,src:src||{type:'party'}};const L=grLivery(f);if(L)o.livery=L;return o}
// partyBattle for a garrison party (it caught the company)
function grPartyBattle(p){const o={f:FACT[p.f]?p.f:'free',mult:p.mult,foes:grIds(p.gar,grFull(p.gar)?p.mult/grFull(p.gar):1),grNames:p.gar,src:{type:'party',id:p.id,goal:'patrol',pf:p.f,gar:p.gar}};const L=grLivery(p.f);if(L)o.livery=L;return o}
// worldBattleEnd for a garrison party the company fought: beaten, the town is left with a remnant
function grPartyEnd(p,win,out){if(!win)return out;const st=grState(p.gar);if(st){st.h=.1;delete st.out;st.cd=grNow()+GR.cd*3}G.parties=G.parties.filter(q=>q.id!==p.id);
 const t=grT(p.gar);if(t&&grSeen(t.x,t.y))worldNews(`The company cut down the garrison of ${t.name}`);return out}
// the betrayal fight (16-contracts.js): won, the garrison is broken; lost, it is bloodied
function grBetrayHit(ti,win){const st=grState(ti);if(!st)return;st.h=Math.round(Math.max(.05,svNum(st.h,1)*(win?.25:.8))*1000)/1000;st.cd=grNow()+GR.cd}
// cvBattle for a garrison clash: the band as partyBattle makes it, worn down, and the garrison beside the company (o.cv.gar)
function grBattle(cl){if(!cl)return null;const C=cvParty(cl.c),R=cvParty(cl.r);if(!C||!R)return null;const o=partyBattle(R),ti=cl.ti,full=grFull(ti)||C.mult,k=clamp(C.mult/full,0,1)*Math.max(cl.gh,.2);
 o.mult=Math.round(Math.max(.2,R.mult*Math.max(.35,cl.rh))*100)/100;o.src={type:'clash',id:cl.id,c:C.id,r:R.id,pf:R.f,g:1};
 const ids=grIds(ti,k),T=grTier(ti),L=grLivery(C.f);o.cv={cl:cl.id,c:C.id,f:FACT[C.f]?C.f:'free',t:T,cap:T>=4?1:0,n:ids.length,ids,gar:1,ti,gm:Math.round(Math.max(.05,C.mult*cl.gh)*100)/100};
 if(L){o.cv.livery=L;o.livery=L}return o}
// worldBattleEnd for src.type 'clash' with a garrison (cvBattleEnd hands it here); out.cv is what the after sheet tells
function grBattleEnd(s,win,res,out){const cl=cvById(s.id),rc=res&&res.cv;if(!cl||!rc)return out;const C=cvParty(cl.c),R=cvParty(cl.r),t=grT(cl.ti),add=(f,n,why)=>{const d=repGain(f,n,why);if(d)out.rep.push({f,n:d})};
 const own=C?C.f:t?t.own:'free',F=R&&FACT[R.f],k={g:1,cl:cl.id,ti:cl.ti,town:t?t.name:'',own,raiders:F?F.n:'The raiders',alive:rc.alive,dead:rc.dead,n0:rc.n0,turned:rc.turned,by:rc.by,win:!!win,crowns:0,watch:own==='free'};out.cv=k;
 if(rc.turned)add(own,GR.rep.turn,'Attacked the garrison of '+(t?t.name:'a town'));
 if(win){const L=cvList(),i=L.indexOf(cl);if(i>=0)L.splice(i,1);if(R)R.gone=1;G.renown+=2;
  if(rc.turned){k.k='turned';if(C){C.gone=1;const st=grState(cl.ti);if(st){st.h=.1;delete st.out;st.cd=grNow()+GR.cd*3}}worldNews(`The company turned on the garrison of ${k.town}`)}
  else{k.k='saved';if(C){delete C.clash;const n0=Math.max(1,rc.n0);C.mult=Math.round(Math.max(.05,C.mult*cl.gh*Math.max(.2,rc.alive/n0))*100)/100;C.back=1}
   const pay=GR.pay[clamp(t&&t.size|0||1,1,3)-1];G.crowns+=pay;k.crowns=pay;add(own,GR.rep.help,'Fought beside the garrison of '+k.town);worldNews(`The company fought beside the garrison of ${k.town} against ${k.raiders.toLowerCase()}`)}
  G.parties=G.parties.filter(p=>!p.gone)}
 else{k.k='left';cl.gh=Math.round(clamp(cl.gh*rc.gh,0,1)*1000)/1000;cl.rh=Math.round(clamp(cl.rh*rc.rh,0,1)*1000)/1000;if(rc.turned)cl.turned=1;cl.bo=1;
  if(!rc.alive)k.end=grEnd(cl,'band');else if(!rc.rleft)k.end=grEnd(cl,'garrison');G.parties=G.parties.filter(p=>!p.gone)}
 return out}

/* ---- the sheets ---- */
function grEsc(s){return typeof htmlEsc==='function'?htmlEsc(String(s)):String(s)}
function grIc(n,s){return typeof lkIc==='function'?lkIc(n,s):''}
function grBanner(f,sz){const h=typeof houseById==='function'?houseById(f):null;if(h&&typeof bannerHTML==='function'){try{return bannerHTML(h,sz)}catch(e){}}return grIc('goal-patrol',sz)}
function grOdds(cl){const q=(cl.gs*GR.def*cl.gh)/Math.max(.01,cl.rs*cl.rh);return q<.6?'The garrison will be driven back within hours.':q<.95?'The garrison is losing ground.':q<1.15?'It could go either way.':'The garrison should drive them off.'}
function grSheet(id){const cl=cvById(id);if(!cl||typeof sheet!=='function')return;const C=cvParty(cl.c),R=cvParty(cl.r);if(!C||!R)return;const t=grT(cl.ti),F=FACT[R.f],ids=grIds(cl.ti,clamp(C.mult/(grFull(cl.ti)||C.mult),0,1)*Math.max(cl.gh,.2)),own=C.f,watch=own==='free';
 const st=typeof partyStrength==='function'?partyStrength(R):2,sw=typeof lkStrWord==='function'?lkStrWord(st):'',who=watch?`The watch of ${t?t.name:'the town'}`:`The garrison of ${t?t.name:'the town'}`,fn=typeof factName==='function'?factName(own):'';
 sheet(`<div class="bs-hd">${grIc('swords',48)}<div><div class="pn-kick">Sally from ${grEsc(t?t.name:'the town')} · ${grEsc(fn)}</div><h2>${grEsc(who)} falls on ${grEsc(F?F.n.toLowerCase():'raiders')}</h2>
 <p>${watch?'Watchmen with spears and lanterns':'Soldiers in '+grEsc(fn)+'\'s colours'} have marched out of the gate to drive them from the walls.</p></div></div>
 <div class="cv-vs"><div class="cv-side ally">${grBanner(own,32)}<span><b>${grEsc(who)}</b><small>${ids.length} ${watch?'watchmen':'soldiers'} · ${Math.round(cl.gh*100)}% still in the fight</small>${cvBarHTML(cl.gh,'ally')}</span></div>
 <div class="cv-side foe">${grIc('rep-hostile',32)}<span><b>${grEsc(typeof partyLabel==='function'?partyLabel(R):F.n)}</b><small>${grEsc(sw)} · ${Math.round(cl.rh*100)}% of their strength</small>${cvBarHTML(cl.rh,'foe')}</span></div></div>
 <p class="pn-p dim">Left alone: ${grOdds(cl)} They have fought for ${cl.h} hour${cl.h===1?'':'s'}.</p>
 <p class="bs-cost">${grIc('rep-allied',16)}<span>Join on the ${watch?'watch':'garrison'}'s side: they fight beside you on their own; win and ${grEsc(t?t.name:'the town')} pays ${GR.pay[clamp(t&&t.size|0||1,1,3)-1]} crowns and ${grEsc(fn)} will remember it. <b>Kill one of them and the whole ${watch?'watch':'garrison'} turns on you.</b></span></p>
 <div class="row"><button class="pri" onclick="cvGo(${cl.id})">${grIc('swords',16)}Intervene</button><button onclick="cvBack(${cl.id})">${grIc('back',16)}Back off</button></div>`,'bs')}
function grAfterSheet(k){if(!k||typeof sheet!=='function')return;const who=(k.watch?'The watch of ':'The garrison of ')+k.town,lost=k.dead>0?`<p class="pn-p dim">${k.dead} of the ${k.n0} ${k.watch?'watchmen':'soldiers'} fell.</p>`:'';let h='';
 if(k.k==='saved')h=`<div class="bs-hd">${grBanner(k.own,48)}<div><div class="pn-kick">${grEsc(who)}</div><h2>The raiders are driven off</h2><p>${grEsc(k.raiders)} break and run from the walls. The captain counts out <span class="coin">${k.crowns} crowns</span> from the town's chest. ${grEsc(typeof factName==='function'?factName(k.own):'')} will hear of this.</p></div></div>${lost}<p class="pn-p">${k.alive} ${k.alive===1?'soldier marches':'soldiers march'} back through the gate.</p>`;
 if(k.k==='turned')h=`<div class="bs-hd">${grIc('rep-hostile',48)}<div><div class="pn-kick">${grEsc(who)}</div><h2>The garrison is cut down</h2><p>${k.by?grEsc(k.by)+' struck the first soldier down, and the':'The'} rest died fighting you. ${grEsc(k.town)} stands nearly undefended.</p></div></div><p class="bs-cost">${grIc('rep-hostile',16)}<span>${grEsc(typeof factName==='function'?factName(k.own):'The town')} will not forget it.</span></p>`;
 if(k.k==='left')h=`<div class="bs-hd">${grIc('back',48)}<div><div class="pn-kick">${grEsc(who)}</div><h2>The fight goes on without you</h2><p>${k.end==='band'?`The garrison falls back behind its walls.`:k.end==='garrison'?`The raiders are spent and drift away from the walls.`:`${k.alive} ${k.alive===1?'soldier holds':'soldiers hold'} the field.`}</p></div></div>${k.turned?`<p class="bs-cost">${grIc('rep-hostile',16)}<span>The garrison will not forget that the company turned on it.</span></p>`:''}`;
 sheet(h+`<button class="pri" onclick="closeSheet()">March on</button>`,'bs')}
// the map readout (82-inspect.js through cvCard) for a garrison party
function grCard(e){if(!e||e.gar==null)return'';const t=grT(e.gar),cl=typeof cvOf==='function'?cvOf(e):null,R=cl?cvParty(cl.r):e.tgt>=0?grParty(e.tgt):null,F=R&&FACT[R.f],hos=typeof partyHostile==='function'&&partyHostile(e);
 const head=`<div class="ins-h"><b class="ins-n">${grEsc(grLabel(e))}</b><span class="ins-tag ${hos?'foe':'ally'}">${hos?'Hostile':e.f==='free'?'Watch':'Garrison'}</span></div><div class="ins-sub">${grEsc(typeof factName==='function'?factName(e.f):'')} · ${typeof partyStrength==='function'?['','weaker than the company','about an even match for the company','stronger than the company'][partyStrength(e)]:''}</div>`;
 if(cl)return head+`<div class="ins-note"><span class="ins-bad">Fighting ${grEsc(F?F.n.toLowerCase():'raiders')}</span>: the garrison at ${Math.round(cl.gh*100)}%, the raiders at ${Math.round(cl.rh*100)}%. ${grOdds(cl)}</div><div class="ins-note">Tap to march there and choose: intervene on the garrison's side, or back off.</div>`;
 return head+`<div class="ins-note">${e.back?`Marching back to ${grEsc(t?t.name:'the town')}.`:e.tgt===-1?'Riding out after the company.':`Marching out of ${grEsc(t?t.name:'the town')} against ${grEsc(F?F.n.toLowerCase():'a band')}.`}</div>`}

/* ---- saves: garrison state is optional (absent = at full strength, at home) ---- */
function grRepair(g){if(!g||!Array.isArray(g.towns))return;const nT=g.towns.length,P=Array.isArray(g.parties)?g.parties:[];
 for(const p of P){delete p.rt;delete p.way;delete p.wg;if(p.gar==null){delete p.tgt;delete p.back;delete p.oh;continue}if(!(Number.isInteger(p.gar)&&p.gar>=0&&p.gar<nT)||p.goal!=='patrol'){p.gone=1;continue}
  if(!svFin(p.tgt))p.tgt=-1;else p.tgt=Math.floor(p.tgt);if(p.back)p.back=1;else delete p.back;p.oh=Math.max(0,Math.floor(svNum(p.oh,0)));delete p.hunt}
 g.parties=P.filter(p=>!p.gone);const byT=new Map();for(const p of g.parties)if(p.gar!=null){if(byT.has(p.gar))p.gone=1;else byT.set(p.gar,p.id)}g.parties=g.parties.filter(p=>!p.gone);
 g.towns.forEach((t,i)=>{if(t.gar===undefined)return;if(!svObj(t.gar)){delete t.gar;return}const o=t.gar,q={h:Math.round(clamp(svNum(o.h,1),0,1)*1000)/1000};if(svFin(o.cd))q.cd=o.cd;
  if(byT.has(i))q.out=byT.get(i);t.gar=q});
 for(const [i,id] of byT){const t=g.towns[i];if(!svObj(t.gar))t.gar={h:1};t.gar.out=id}}
