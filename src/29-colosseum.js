/* ================= THE COLOSSEUM: arena bouts for gold (rules; the sheets are 58c-colosseum-ui.js, the art 41-worldart.js / 71q-arena.js) =================
   One colosseum a world (two on a large world, three on a vast one), a world-map site (G.sites kind 'colo') a few tiles from one of the
   largest towns. G.colos = [{id (= its site id), ti (its town), x, y, card, arm, rec}]:
     card {ep, bouts:[{rule, theme, seed, done ('won'|'lost'|'yield'|0)}]}   the fight card: COL.bouts[0]..[1] bouts, drawn afresh every
          COL.every days (ep = floor((day - 1) / COL.every)); a bout is fought once a card. Drawn from a private stream (the world seed, the
          colosseum's id, the card number) the first time the card is looked at in its span: the game's rnd() is never touched.
     arm  {ep, stock:[item ids]}   the arena armory: gladiator gear (GLADITEMS, 11-gladiators.js) by the company's market tier, same stream rule
     rec  {w, l, y (yields), streak, best, purse (crowns won), title (index into COLTITLE)}   the ladder record of that colosseum
   A bout = a rule (COLRULE: the grand melee, single combat 1v1, 3v3, 6v6, the beast pit, a champion with an elite modifier, fire pits,
   sine missione) and a theme (COLTHEME: the opponents, a mix of factions: the arena school's gladiators (FACT.pit), beasts, serpents,
   orcs, brigands, eastern duelists, ogres, a wyvern late). Its enemies are a fixed roster (startBattle's o.roster, each entry with its own
   faction) built for the swords that fight it (colRoster): the company's budget for those swords (the rules' own mercBud x gearK, as every
   battle), times COL.k[difficulty] x the rule's k, buys the bodies and sets their rank exactly as foeRank would for an ordinary band of
   that strength. Bouts with a set number of swords keep that many foes: what the extra bodies would have cost goes into their rank
   (x (cost bought / cost kept)^(1 / COL.rp)). So every bout is a little stronger than the swords sent into it, and more so on harder
   difficulties (test/colosseum.js measures the win rates: Story ~65-75%, Normal ~55-65%, Hard ~45-58%, Brutal ~35-52%).
   The bout's own stat factor is 1 (o.rosterDk): the difficulty is already inside COL.k. No elites but the champion's.
   The arena (o.arena = {k, rule, noYield, death, haz}): the gates are shut (no withdrawing, 60-battle-core.js canWithdraw); the retreat
   is a yield (the bout is lost, the purse with it; no crowns are dropped on the run), never in a bout sine missione (canRetreat).
   The crowd spares most of the fallen: a struck-down sword dies with COL.death of its usual chance (killUnit); sine missione: the usual odds.
   Pay: the entry fee (COL.fee of the purse) is paid when the bout is settled, won or lost; a win pays the purse:
     purse = round((COL.purse.base + COL.purse.k x P^COL.purse.e) x rule.pay x diffK('pay') x (1 + streak bonus) x (1 + Showman) / 10) x 10
     (P: the company's power, companyPower of the fielded swords; streak bonus COL.streak.per a win in a row, at most COL.streak.max;
     Showman (trait): +5% a kill it made in the bout, at most +25%), renown round(COL.renown.base + COL.renown.k x sqrt(P)) x rule.ren,
     and some bouts a prize (a piece of gladiator gear). The field's own crowns, loot and xp come on top, as in any won battle.
   Ladder: wins at a colosseum earn its titles (COLTITLE: renown when reached), a streak of 3, 5 and 8 wins the crowd's acclaim (renown);
   achEvent('arena', {win, streak, wins, title}) for the achievements (28-achieve.js). The colosseum's town tavern hires gladiators
   (BG.gladiator; colRecruits after stockTown). colRepair(g) validates the saves (20-state.js repairSave); old saves get their colosseums. */
const COL={every:5,bouts:[3,5],near:[2.2,4.4],sep:18,count:{small:1,medium:1,large:2,vast:3},
 k:{story:1.065,normal:1.12,hard:1.17,brutal:1.26},kLvl:.01,   // (eased a little when the human foes got their masteries, 64m-foemast.js)
 rp:1.15,death:.3,fee:.1,
 purse:{base:420,k:52,e:.75},renown:{base:3,k:.9},streak:{per:.08,max:.4},acclaim:[[3,10],[5,20],[8,35]],prize:.35,armory:6};
const COLTITLE=[{w:0,n:'Tiro',d:'a recruit of the sand'},{w:3,n:'Contender',d:'a name the crowd knows',ren:5},{w:6,n:'Veteran of the sands',d:'feared in the pens',ren:10},
 {w:10,n:'Champion',d:'champion of the arena',ren:20},{w:16,n:'Grand champion',d:'the crowd’s god',ren:35}];
/* rules: swords (a set number of the company's swords, else everyone fielded), k (strength factor, beside COL.k), pay / ren (purse and renown
   factors), beast (only beast themes), champ (one elite champion leads), haz (fire pits on the sand), noYield + death (sine missione) */
const COLRULE={
 melee:{n:'Grand melee',w:3,k:1,pay:1.1,ren:1,d:'Your fielded company against the whole of the card.'},
 duel:{n:'Single combat',w:2,swords:1,k:1.08,pay:.45,ren:.7,d:'One of your swords against the school’s chosen fighter, alone on the sand.'},
 trio:{n:'Three against three',w:2,swords:3,k:.97,pay:.65,ren:.8,d:'Three of your swords against three of theirs.'},
 six:{n:'Six against six',w:1.5,swords:6,k:.9,pay:.85,ren:.9,d:'Six of your swords against six of theirs.'},
 pit:{n:'The beast pit',w:2,k:1,pay:1.05,ren:1,beast:1,d:'The pens beneath the sand open: beasts, and only beasts.'},
 champ:{n:'The champion',w:1.5,k:1,pay:1.25,ren:1.2,champ:1,d:'A champion of the arena with a gift of its own, and its retinue.'},
 hazard:{n:'Fire pits',w:1.5,k:1,pay:1.15,ren:1.1,haz:1,d:'Pits of burning coals dot the sand: whoever steps in or stands in one burns.'},
 sine:{n:'Sine missione',w:1,k:1,pay:1.4,ren:1.5,noYield:1,death:1,d:'To the end: no yielding, and the crowd spares nobody.'}};
const COLRULEK=Object.keys(COLRULE);
/* themes: g = groups {f, w (share of the budget), ids (the units it may field)}; min = the company power it needs; beast; noCap (never with a
   set number of swords) */
const COLTHEME={
 school:{n:'Gladiators of the school',g:[{f:'pit'}],min:0},
 beasts:{n:'Beasts of the north wood',g:[{f:'beast'}],beast:1,min:0},
 serpents:{n:'Serpents of the south',g:[{f:'serpent'}],beast:1,min:30},
 orcs:{n:'Orc pit-fighters',g:[{f:'orc',ids:['orcy','orcw','obrute']}],min:25},
 brig:{n:'Condemned brigands',g:[{f:'bandit',ids:['thug','braid','bmark','bxbow']}],min:0},
 east:{n:'Duelists of the East',g:[{f:'east',ids:['samurai','shinobi','onna','sohei']}],min:20},
 ogres:{n:'Ogres in chains',g:[{f:'ogre',ids:['ogre','aogre']}],beast:1,min:45},
 venatio:{n:'Hunters and beasts',g:[{f:'pit',w:.55,ids:['gret','gmurm','gthrax']},{f:'beast',w:.45}],min:0},
 orcogre:{n:'Orcs and their ogre',g:[{f:'orc',w:.6,ids:['orcy','orcw']},{f:'ogre',w:.4,ids:['ogre']}],min:45},
 brigwolf:{n:'Brigands and their hounds',g:[{f:'bandit',w:.6,ids:['thug','braid']},{f:'beast',w:.4,ids:['wolf']}],min:0},
 eastschool:{n:'The East against the school',g:[{f:'east',w:.5,ids:['samurai','shinobi']},{f:'pit',w:.5}],min:30},
 wyvern:{n:'The wyvern',g:[{f:'wyvern',ids:['wyvern','whatch']}],beast:1,noCap:1,min:140}};
const COLTHEMEK=Object.keys(COLTHEME);
const COLCHAMPN=['Ursus the Unbroken','Crixa of the Red Sand','Verus Twice-Freed','Priscus Ironhand','Spiculus the Swift','Flamma','Tetraites','Carpophora','Hermes the Thracian','Marcia Lionheart'];
const COLCHAMPEL=['hulking','armoured','fast','bloodthirsty','berserk','unstoppable','commander','regen'];
/* ---- private streams (never the game's rnd) ---- */
function colStream(salt){return mulberry((((G&&G.seed)|0)^Math.imul((salt|0)+101,2654435761)^0xc0105e)>>>0)}
const colPick=(r,L)=>L[Math.floor(r()*L.length)%L.length];
function colWPick(r,L,w){let t=0;for(const x of L)t+=w(x);let v=r()*t;for(const x of L){v-=w(x);if(v<=0)return x}return L[L.length-1]}
/* ---- the site ---- */
function colOf(id){return Array.isArray(G&&G.colos)?G.colos.find(c=>c.id===id)||null:null}
function colTowns(){return Array.isArray(G&&G.colos)?G.colos.map(c=>c.ti):[]}
function colName(c){const t=c&&G&&G.towns[c.ti];return t?'The Colosseum of '+t.name:'The Colosseum'}
// the towns that get one: the largest first (size, then nearest the land's middle), never an eastern town, COL.sep tiles apart
function colPlaceTowns(g,w,n){const T=g.towns.map((t,i)=>({i,t})).filter(o=>!o.t.east&&!(w.east&&w.east[Math.floor(o.t.y/TS)*WN+Math.floor(o.t.x/TS)]));
 const cx=WS/2,cy=WS/2;T.sort((a,b)=>(b.t.size||1)-(a.t.size||1)||Math.hypot(a.t.x-cx,a.t.y-cy)-Math.hypot(b.t.x-cx,b.t.y-cy)||a.i-b.i);
 const out=[];for(const o of T){if(out.length>=n)break;if(out.some(j=>Math.hypot(g.towns[j].x-o.t.x,g.towns[j].y-o.t.y)<COL.sep*TS))continue;out.push(o.i)}
 if(!out.length&&g.towns.length)out.push(g.towns.length>1?1:0);return out}
// a spot near town ti: walkable land, off roads and rivers, COL.near tiles out, clear of towns and other sites; near a road if it can
function colSpot(g,w,ti,salt){const t=g.towns[ti],r=mulberry(((g.seed|0)^Math.imul(salt+7,40503)^0x5eed)>>>0);let best=null,bv=-1e9;
 for(let k=0;k<700;k++){const a=r()*6.2832,d=(COL.near[0]+r()*(COL.near[1]-COL.near[0]))*TS,x=t.x+Math.cos(a)*d,y=t.y+Math.sin(a)*d,tx=Math.floor(x/TS),ty=Math.floor(y/TS);
  if(tx<2||ty<2||tx>=WN-2||ty>=WN-2)continue;const i=ty*WN+tx;if(!w.ok[i]||w.road[i]||w.river[i])continue;
  let ok=true;for(let j=0;j<g.towns.length&&ok;j++)if(j!==ti&&Math.hypot(g.towns[j].x-x,g.towns[j].y-y)<3*TS)ok=false;if(!ok)continue;
  for(const s of g.sites||[])if(Math.hypot(s.x-x,s.y-y)<2.6*TS){ok=false;break}if(!ok)continue;
  let rd=0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const j=(ty+dy)*WN+tx+dx;if(w.road[j])rd++}
  let open=0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const j=(ty+dy)*WN+tx+dx;if(w.ok[j])open++}
  const v=(rd?2:0)+open*.4-Math.abs(d/TS-3)*.5+r()*.6;if(v>bv){bv=v;best={x:(tx+.5)*TS,y:(ty+.5)*TS}}}
 return best}
// Rules: places the colosseums of a world (new campaigns and old saves). Pure: the world seed only. Idempotent.
function colInit(g){g=g||G;if(!g||!Array.isArray(g.towns)||g.towns.length<2)return g;if(Array.isArray(g.colos)&&g.colos.length)return g;
 const w=typeof W!=='undefined'&&W&&(W.seed|0)===(g.seed|0)&&W.tiles?W:genWorld(g.seed);if(!w||!w.ok)return g;
 if(!Array.isArray(g.sites))g.sites=[];g.colos=[];const n=COL.count[g.wsize]||1,L=colPlaceTowns(g,w,n);let nid=Math.max(1,Math.floor(+g.nid||1));
 L.forEach((ti,k)=>{const p=colSpot(g,w,ti,k*31+ti);if(!p)return;const id=nid++;g.colos.push({id,ti,x:p.x,y:p.y,card:null,arm:null,rec:colRec()});g.sites.push({id,kind:'colo',x:p.x,y:p.y,n:k})});
 g.nid=nid;return g}
function colRec(){return{w:0,l:0,y:0,streak:0,best:0,purse:0,title:0}}
/* ---- the card ---- */
function colEp(){return Math.floor(((G&&G.day|0)-1)/COL.every)}
function colPower(L){return typeof companyPower==='function'?companyPower(L||fielded()):30}
function colThemeOK(k,R,P){const T=COLTHEME[k];if(!T||(T.min||0)>P)return false;if(R.beast&&!T.beast)return false;if(R.swords&&T.noCap)return false;if(R.champ&&T.beast)return false;return true}
// Rules: the card of colosseum c for the current span (drawn and stored the first time; deterministic: the world seed, c.id, the span)
function colCard(c){if(!c)return null;const ep=colEp();if(c.card&&c.card.ep===ep)return c.card;const r=colStream(c.id*977+ep*31+7),P=colPower(),n=COL.bouts[0]+Math.floor(r()*(COL.bouts[1]-COL.bouts[0]+1)),bouts=[],used=new Set();
 for(let i=0;i<n*4&&bouts.length<n;i++){const rule=colWPick(r,COLRULEK,k=>COLRULE[k].w*(bouts.some(b=>b.rule===k)?.25:1)),R=COLRULE[rule],TH=COLTHEMEK.filter(k=>colThemeOK(k,R,P));if(!TH.length)continue;
  const theme=colPick(r,TH),key=rule+'|'+theme;if(used.has(key))continue;used.add(key);bouts.push({rule,theme,seed:Math.floor(r()*1e9),done:0,prize:r()<COL.prize?1:0})}
 c.card={ep,bouts};return c.card}
function colBout(c,i){const C=colCard(c);return C&&C.bouts[i]||null}
function colDaysLeft(){return COL.every-(((G.day|0)-1)%COL.every)}
/* ---- who fights ---- */
const colFit=m=>!!m&&m.hp>0;
function colBest(n){const L=G.roster.slice().filter(colFit).sort((a,b)=>(colPower([b])-colPower([a]))||(b.hp-a.hp)||a.id-b.id);return L.slice(0,n)}
// the swords that fight bout b: a set number of them (the chosen ids, else the strongest), or everyone fielded
function colSwords(b,ids){const R=COLRULE[b.rule];if(!R.swords)return fielded().slice();const pick=Array.isArray(ids)?ids.map(id=>G.roster.find(m=>m.id===id)).filter(colFit):[];
 const out=[];for(const m of pick)if(!out.includes(m)&&out.length<R.swords)out.push(m);for(const m of colBest(MAXROSTER))if(out.length<R.swords&&!out.includes(m))out.push(m);return out}
/* ---- strength ---- */
// what the swords ms add to an enemy budget (the rules' own: mercBud x gearK, as battleBudget does for a company), before any factor
function colBudget0(ms){let b=0;for(const m of ms)b+=mercBud(m.lvl)*gearK(m);return b}
// the bout's strength factor: the difficulty's COL.k x the rule's k, eased by COL.kLvl a level above 8 (stiffened below): a strong late company
// already meets the largest bands the rules allow, so the same factor would weigh on it more than on a young one
function colK(b,ms){const R=COLRULE[b.rule],L=ms&&ms.length?ms.reduce((a,m)=>a+(m.lvl||1),0)/ms.length:8;return(COL.k[typeof diffOf==='function'?diffOf():'normal']||1)*R.k*(1-COL.kLvl*(L-8))}
// foeRank's formula for a band of faction f bought with budget bud against n swords
function colRank(f,bud,n){const F=FACT[f];if(!F)return 1;const U=F.units,R=FOE_RANK;let avg=0;U.forEach(u=>avg+=u[1]);avg/=U.length;const q=F.rank||[.5,1],pm=Math.max(1,bud/Math.max(1,n)/(q[3]||R.base));
 return clamp(Math.pow(pm,q[0]*(1+(q[2]||0)*Math.log2(pm)))*Math.pow(Math.max(1,bud/(MAXFOES*avg)),q[1]),1,R.max)}
const colLvl=x=>Math.round((1+4*Math.log2(Math.max(1,x)))*1000)/1000;
/* Rules: the enemy roster of bout b against the swords ms: [{id, f, n, lvl, elite?, el?, name?}] (startBattle's o.roster). Deterministic:
   the bout's seed and the swords' strength; nothing else. */
function colRoster(b,ms){const R=COLRULE[b.rule],T=COLTHEME[b.theme]||COLTHEME.school,n=Math.max(1,ms.length),B0=colBudget0(ms)*colK(b,ms),r=mulberry((b.seed|0)^0x2a9b);
 const gs=T.g,tw=gs.reduce((s,g)=>s+(g.w||1),0),list=[];
 for(const g of gs){const F=FACT[g.f];if(!F)continue;const U=[];for(const u of F.units)if((!g.ids||g.ids.includes(u[0]))&&EN[u[0]]&&!U.some(x=>x[0]===u[0]))U.push(u);if(!U.length)continue;
  let bud=B0*(g.w||1)/tw;const minC=Math.min(...U.map(u=>u[1])),cnt={},mine=[];
  const buy=id=>{const d=EN[id];cnt[id]=(cnt[id]||0)+1;if(d.max&&d.sub&&EN[d.sub]&&cnt[id]>d.max&&U.some(u=>u[0]===d.sub))id=d.sub;const c=(U.find(u=>u[0]===id)||U[0])[1];mine.push({id,f:g.f,c});return c};
  if(g.f==='wyvern'){bud-=buy('wyvern');while(bud>=40&&mine.length<4)bud-=buy('whatch')}
  else{for(let k=0;k<200&&bud>=minC&&list.length+mine.length<MAXFOES;k++){const A=U.filter(u=>u[1]<=bud);if(!A.length)break;bud-=buy(colPick(r,A)[0])}
   if(!mine.length)buy(U.reduce((a,u)=>u[1]<a[1]?u:a,U[0])[0])}
  for(const e of mine){e.x=colRank(g.f,B0,n);list.push(e)}}
 if(!list.length)list.push({id:'gmurm',f:'pit',c:34,x:1});
 // a set number of swords: as many foes, the rest of what was bought going into their rank
 if(R.swords){const cap=R.swords,C=list.reduce((s,e)=>s+e.c,0);let keep=list.map((e,i)=>({e,i})).sort((a,b)=>b.e.c-a.e.c||a.i-b.i).slice(0,cap).sort((a,b)=>a.i-b.i).map(o=>o.e);
  while(keep.length<cap)keep.push(Object.assign({},keep[keep.length%Math.max(1,keep.length)]||list[0]));
  const Ck=keep.reduce((s,e)=>s+e.c,0),xk=Math.pow(Math.max(1,C/Math.max(1,Ck)),1/COL.rp);keep=keep.map(e=>Object.assign({},e,{x:e.x*xk}));list.length=0;keep.forEach(e=>list.push(e))}
 const out=[];for(const e of list){const lvl=colLvl(e.x),o=out.find(q=>q.id===e.id&&q.f===e.f&&q.lvl===lvl&&!q.elite);if(o)o.n++;else out.push({id:e.id,f:e.f,n:1,lvl})}
 // the champion: the costliest foe of the card, picked out with an elite gift and a name
 if(R.champ){let bi=0,bc=-1;out.forEach((o,i)=>{const c=(FACT[o.f].units.find(u=>u[0]===o.id)||[0,0])[1];if(c>bc){bc=c;bi=i}});const o=out[bi];if(o.n>1){o.n--;out.splice(bi+1,0,Object.assign({},o,{n:1}));bi++}
  const ch=out[bi];ch.elite=1;ch.el=[colPick(r,COLCHAMPEL)];ch.name=colPick(r,COLCHAMPN)}
 return out}
/* ---- the arena floor: sand, pillars, a raised dais, the gates, fire pits (seeded from the bout; the preview is the battle) ---- */
function colArenaTiles(b){const R=COLRULE[b.rule],r=mulberry((b.seed|0)^0x51a7),T=[];for(let i=0;i<BW*BH;i++)T.push({h:0,t:'ground'});
 const S=(c,r0,v,k)=>{if(!inb(c,r0)||spawnRow(r0))return;const t=T[key(c,r0)];if(k)t[k]=v;else t.t=v};
 const lay=Math.floor(r()*4);   // 0 open, 1 four pillars, 2 two pillars and a dais, 3 a ring of statues
 if(lay===1)for(const [c,q] of [[4,4],[BW-5,4],[4,BH-5],[BW-5,BH-5]])S(c,q,'block');
 if(lay===2){S(3,5,'block');S(BW-4,6,'block');for(let c=6;c<=9;c++)for(let q=5;q<=6;q++)S(c,q,1,'h')}
 if(lay===3)for(const [c,q] of [[5,3],[BW-6,3],[2,6],[BW-3,5],[7,8],[8,8]])S(c,q,'block');
 for(const [c,q] of [[0,5],[BW-1,6]]){S(c,q,'block');S(c,q,'gate','prop')}   // the gates in the side walls
 if(R.haz){const n=6+Math.floor(r()*4);for(let i=0,g=0;i<n&&g<80;g++){const c=1+Math.floor(r()*(BW-2)),q=SPAWN_E+Math.floor(r()*(BH-SPAWN_E-SPAWN_P)),t=T[key(c,q)];if(t.t!=='ground'||spawnRow(q))continue;t.t='haz';i++;
  const m=T[key(BW-1-c,BH-1-q)];if(m&&m.t==='ground'&&!spawnRow(BH-1-q)){m.t='haz';i++}}}
 openBattleMap(T);T.arena=1;return T}
/* ---- pay ---- */
function colPurseBase(P){return COL.purse.base+COL.purse.k*Math.pow(Math.max(0,P),COL.purse.e)}
function colStreakK(c){return 1+Math.min(COL.streak.max,COL.streak.per*((c&&c.rec&&c.rec.streak)|0))}
function colPurse(c,b){const R=COLRULE[b.rule],P=colPower();return Math.max(50,Math.round(colPurseBase(P)*R.pay*(typeof diffK==='function'?diffK('pay'):1)*colStreakK(c)/10)*10)}
function colFee(c,b){return Math.max(10,Math.round(colPurse(c,b)*COL.fee/10)*10)}
function colRenown(b){const R=COLRULE[b.rule];return Math.max(1,Math.round((COL.renown.base+COL.renown.k*Math.sqrt(Math.max(0,colPower())))*R.ren))}
function colPrize(c,b){if(!b.prize)return null;const r=mulberry((b.seed|0)^0x9e11),T=typeof marketTier==='function'?marketTier(3,G.day|0):3,L=GLADITEMS.filter(id=>ITEMS[id]&&(ITEMS[id].tier||1)<=Math.max(2,T));return L.length?colPick(r,L):null}
/* ---- entering a bout ---- */
// Why bout i of colosseum c cannot be fought now ('' when it can)
function colWhy(c,i){const b=colBout(c,i);if(!b)return'No such bout';if(b.done)return'Already fought on this card';const R=COLRULE[b.rule];
 const fit=G.roster.filter(colFit).length;if(R.swords&&fit<R.swords)return`Needs ${R.swords} swords`;if(!R.swords&&!fielded().length)return'Nobody is fielded';
 if(G.crowns<colFee(c,b))return'Cannot pay the entry fee';return''}
/* Rules: the battle options of bout i of colosseum c fought by the swords ids (a set-number bout; else the fielded company):
   {f, roster, fixedRoster, rosterDk 1, sumX, biome 'arena', tiles, arena:{k, rule, noYield, death, haz}, deploy, maxField, src:{type:'arena', id, i,
   purse, fee, ren, prize}}. No randomness. */
// the battle of bout b fought by the swords ms (everything but the pay): the roster, the floor, the arena's rules, who is deployed
function colFightOpts(b,ms,cid){const R=COLRULE[b.rule],roster=colRoster(b,ms),f=roster[0]?roster[0].f:'pit',xs=roster.map(e=>rosterX(e)),sumX=xs.length?xs.reduce((a,x)=>a+x,0)/xs.length:1;
 const o={f,roster,fixedRoster:1,rosterDk:1,sumX,biome:'arena',tiles:colArenaTiles(b),noElite:1,arena:{k:cid||0,rule:b.rule,noYield:R.noYield?1:0,death:R.death||COL.death,haz:R.haz?1:0}};
 if(R.swords){o.deploy=ms.map(m=>({id:m.id}));o.maxField=R.swords}return o}
function colOpts(c,i,ids){const b=colBout(c,i);if(!b)return null;const ms=colSwords(b,ids);if(!ms.length)return null;
 const o=colFightOpts(b,ms,c.id);o.src={type:'arena',id:c.id,i,ep:c.card.ep,purse:colPurse(c,b),fee:colFee(c,b),ren:colRenown(b),prize:colPrize(c,b)};return o}
function colEnter(id,i,ids,quiet){const c=colOf(id);if(!c)return null;const why=colWhy(c,i);if(why){if(!quiet&&typeof toast==='function')toast(why);return null}
 const o=colOpts(c,i,ids);if(!o)return null;if(!quiet){if(typeof closeSheet==='function')closeSheet(true);G.moving=false;G.route=[];engage(o)}return o}
/* ---- settling (settleBattle, 68-battle-flow.js): {kind:'arena', win, yielded, purse, fee, renown, prize, title, acclaim, rec, n} ---- */
function colSettle(s,win,res){const c=colOf(s.id),out={kind:'arena',win:!!win,yielded:!!(res&&res.fled),purse:0,fee:0,renown:0,prize:null,title:null,acclaim:0,id:s.id,name:c?colName(c):'The Colosseum'};
 if(!c)return out;const b=c.card&&c.card.ep===s.ep?c.card.bouts[s.i]:null,rec=c.rec;
 const fee=Math.max(0,Math.round(+s.fee||0));G.crowns=Math.max(0,G.crowns-fee);out.fee=fee;
 if(b)b.done=win?'won':out.yielded?'yield':'lost';out.bout=b?COLRULE[b.rule].n+': '+(COLTHEME[b.theme]||{}).n:'';
 if(win){rec.w++;rec.streak++;rec.best=Math.max(rec.best,rec.streak);
  let show=0;const K=B&&B.arenaKills||res&&res.arenaKills||null;if(K)for(const m of G.roster)if(Array.isArray(m.traits)&&m.traits.includes('showman'))show+=Math.min(5,K[m.id]|0)*.05;
  const purse=Math.round((+s.purse||0)*(1+Math.min(.25,show))/10)*10;G.crowns+=purse;rec.purse+=purse;out.purse=purse;out.show=Math.round(Math.min(.25,show)*100);
  let ren=Math.max(0,Math.round(+s.ren||0));for(const [n,v] of COL.acclaim)if(rec.streak===n){ren+=v;out.acclaim=v}
  let t=rec.title;while(t+1<COLTITLE.length&&rec.w>=COLTITLE[t+1].w){t++;ren+=COLTITLE[t].ren||0;out.title=COLTITLE[t].n}rec.title=t;
  G.renown+=ren;out.renown=ren;if(s.prize&&ITEMS[s.prize]){G.stash.push(s.prize);out.prize=s.prize}
  if(out.title&&typeof worldNews==='function'){try{worldNews(`${G.name||'A company'} is hailed ${out.title} in ${colName(c).replace(/^The /,'the ')}`)}catch(e){}}}
 else{if(out.yielded)rec.y++;else rec.l++;rec.streak=0}
 out.rec=Object.assign({},rec);out.titleN=COLTITLE[rec.title].n;
 if(typeof achEvent==='function'){try{achEvent('arena',{win:!!win,streak:rec.streak,wins:rec.w,title:rec.title,rule:b?b.rule:null})}catch(e){}}
 return out}
/* ---- the armory ---- */
function colArmory(c){const ep=colEp();if(c.arm&&c.arm.ep===ep)return c.arm;const r=colStream(c.id*613+ep*17+3),T=Math.max(2,typeof marketTier==='function'?marketTier(3,G.day|0):3),L=GLADITEMS.filter(id=>ITEMS[id]&&(ITEMS[id].tier||1)<=T),stock=[];
 for(let i=0;i<COL.armory&&L.length;i++)stock.push(colPick(r,L));c.arm={ep,stock};return c.arm}
function colPrice(id){const it=ITEMS[id];return it?Math.max(1,Math.round((it.price||0)*1.1)):0}
function colBuy(id,k){const c=colOf(id);if(!c)return false;const A=colArmory(c),item=A.stock[k];if(!item)return false;const p=colPrice(item);if(G.crowns<p){if(typeof toast==='function')toast('Not enough crowns');return false}
 G.crowns-=p;G.stash.push(item);A.stock.splice(k,1);return true}
/* ---- the tavern of a colosseum town: one gladiator at the bar at least half the time (after stockTown; game rnd, that town only) ---- */
function colRecruits(t){if(!G||!Array.isArray(G.towns)||!t||!BG.gladiator)return;const ti=G.towns.indexOf(t);if(ti<0||!colTowns().includes(ti))return;if(!Array.isArray(t.recruits))return;
 if(t.recruits.some(m=>m.bg==='gladiator'))return;if(rnd()<.55){const m=newMerc('gladiator');if(t.recruits.length)t.recruits[t.recruits.length-1]=m;else t.recruits.push(m)}}
/* ---- saves ---- */
function colRepair(g){const ok=x=>x&&typeof x==='object'&&!Array.isArray(x),fin=v=>typeof v==='number'&&isFinite(v),nat=v=>fin(v)&&v>=0?Math.floor(v):0;
 if(!Array.isArray(g.colos)||!g.colos.length){g.colos=null;if(Array.isArray(g.sites))g.sites=g.sites.filter(s=>!(s&&s.kind==='colo'));colInit(g);return g}
 const seen=new Set();g.colos=g.colos.filter(c=>ok(c)&&fin(c.id)&&fin(c.x)&&fin(c.y)&&Number.isInteger(c.ti)&&c.ti>=0&&c.ti<g.towns.length&&!seen.has(c.id)&&seen.add(c.id)).map(c=>{
  const R=ok(c.rec)?c.rec:{},rec={w:nat(R.w),l:nat(R.l),y:nat(R.y),streak:nat(R.streak),best:nat(R.best),purse:nat(R.purse),title:clamp(nat(R.title),0,COLTITLE.length-1)};rec.best=Math.max(rec.best,rec.streak);
  let card=null;if(ok(c.card)&&fin(c.card.ep)&&Array.isArray(c.card.bouts)){const B=c.card.bouts.filter(b=>ok(b)&&COLRULE[b.rule]&&COLTHEME[b.theme]&&fin(b.seed)).slice(0,COL.bouts[1]).map(b=>({rule:b.rule,theme:b.theme,seed:Math.floor(b.seed),done:['won','lost','yield'].includes(b.done)?b.done:0,prize:b.prize?1:0}));if(B.length)card={ep:Math.floor(c.card.ep),bouts:B}}
  const arm=ok(c.arm)&&fin(c.arm.ep)&&Array.isArray(c.arm.stock)?{ep:Math.floor(c.arm.ep),stock:c.arm.stock.filter(id=>typeof id==='string'&&ITEMS[id]&&ITEMS[id].glad).slice(0,COL.armory)}:null;
  return{id:Math.floor(c.id),ti:c.ti,x:c.x,y:c.y,card,arm,rec}});
 if(!g.colos.length){g.colos=null;colInit(g);return g}
 if(!Array.isArray(g.sites))g.sites=[];g.sites=g.sites.filter(s=>!(s&&s.kind==='colo'&&!g.colos.some(c=>c.id===s.id)));
 g.colos.forEach((c,k)=>{let s=g.sites.find(x=>x&&x.id===c.id);if(!s){s={id:c.id,kind:'colo',x:c.x,y:c.y,n:k};g.sites.push(s)}s.kind='colo';s.x=c.x;s.y=c.y});
 return g}
