/* ================= TOWNS & CONTRACTS ================= */
/* ---- hunts: the factions on offer come from the rules' factionPool(ctx) (40-world.js: tiers, biomes, how far out each lives),
   with the old list as the fallback. The lair is set on one of the faction's own biomes at the distance the pool gives;
   tougher factions pay more (CTR_TIERK). ---- */
const CTR_TIERK={early:1,mid:1.15,late:1.3,end:1.5,crisis:1.25};   // was 1/1.35/1.7/2.6/1.5
/* contract danger 1..5 (skulls): the lair band's strength and the pay. Which dangers a board posts follows the company's renown tier
   (RENOWN[t].dw weights, 14-company.js); factions of a tier above RENOWN[t].ft are posted rarely (x0.15 a tier step, never removed). */
const CTR_DIFFK=[.8,1,1.3,1.6,2],CTR_PAYK=[1,1.45,1.75,2,2.3];   // pay was 1/1.5/2.2/3/4
function ctrPool(t,ti){let L=null;
 if(typeof factionPool==='function'){try{L=factionPool({x:t.x,y:t.y,town:t,ti,day:G.day,purpose:'contract',contract:true})}catch(e){L=null}}
 if(L&&!Array.isArray(L)&&typeof L==='object')L=Array.isArray(L.list)?L.list:Array.isArray(L.pool)?L.pool:Object.keys(L).map(f=>Object.assign({f},typeof L[f]==='object'?L[f]:{w:+L[f]||1}));
 const out=[];if(Array.isArray(L))for(const e of L){const o=typeof e==='string'?{f:e}:e&&typeof e==='object'?e:null;if(!o)continue;const f=o.f||o.id||o.k||o.fact;if(!FACT[f])continue;
  const dr=Array.isArray(o.d)?o.d:Array.isArray(o.dist)?o.dist:null,lo=svNum(o.dmin,svNum(o.min,dr?dr[0]:4)),hi=svNum(o.dmax,svNum(o.max,dr?dr[1]:lo+6));
  out.push({f,w:Math.max(0,svNum(o.w,svNum(o.weight,1))),lo:Math.max(2,lo),hi:Math.max(lo+1,hi)})}
 if(out.some(x=>x.w>0))return ctrRenownCap(out.filter(x=>x.w>0));
 const fs=['gob','bandit','beast','undead'];if(G.day>5)fs.push('orc');if(typeof crisisFacts==='function')crisisFacts().forEach(f=>{if(FACT[f]&&!fs.includes(f))fs.push(f)});else if(G.crisis)fs.push('void');const out2=fs.map(f=>({f,w:1,lo:4,hi:10}));
 // the new factions by tier, further out (the rules' factionPool refines this with company strength)
 for(const [f,day,w,lo,hi] of [['serpent',6,1,6,12],['ent',10,.8,7,13],['ogre',10,.8,7,13],['wyvern',30,.35,Math.max(8,18-Math.floor((G.day-30)/6)),20]])if(FACT[f]&&G.day>=day)out2.push({f,w,lo,hi:Math.max(lo+2,hi)});
 return ctrRenownCap(out2)}
function ctrRenownCap(L){if(typeof renownDef!=='function')return L;const cap=FT_RANK[renownDef().ft];return L.map(x=>{const r=FT_RANK[FACT[x.f].tier||'early'];return r==null||r<=cap?x:Object.assign({},x,{w:x.w*Math.pow(.15,r-cap)})})}
// is world position (x,y) on one of faction f's biomes? ('mountains' = within 2 tiles of a peak). No biomes listed: anywhere.
function ctrBiomeOk(f,x,y){const B=FACT[f]&&FACT[f].biomes;if(!Array.isArray(B)||!B.length||typeof tileAt!=='function'||!W)return true;const t=tileAt(x,y);
 if(B.includes(BIOKEY[t]))return true;if(B.includes('mountains')){const cx=Math.floor(x/TS),cy=Math.floor(y/TS);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(tileAt((cx+dx+.5)*TS,(cy+dy+.5)*TS)===4)return true}return false}
function ctrLairAt(t,f,lo,hi){let pos=null;for(let k=0;k<40;k++){const p=randOk(t.x,t.y,lo,hi);if(!pos)pos=p;if(ctrBiomeOk(f,p.x,p.y))return p}return pos}
function ctrTitle(f,t){return String(FACT[f].lair||'Hunt').replace('{place}',t.name)}
function ctrDiff(){const D=typeof renownDef==='function'?renownDef():null;if(!D)return pick([1,1,2,2,3]);let tot=0;D.dw.forEach(w=>tot+=w);let x=rnd()*tot;for(let i=0;i<D.dw.length;i++){x-=D.dw[i];if(x<=0&&D.dw[i]>0)return i+1}return D.diff}
function genContract(t){const ti=G.towns.indexOf(t);if(typeof genContract2==='function'){const c=genContract2(t,ti);if(c)return c}return genContract0(t,ti)}
function genContract0(t,ti){const rep=typeof renownDef==='function'?renownDef().pay:1+G.renown/300;
 if(rnd()<.25){let to;do{to=ri(0,G.towns.length-1)}while(to===ti);const o=G.towns[to],d=Math.hypot(o.x-t.x,o.y-t.y)/TS;return{type:'deliver',to,diff:1,pay:Math.round((60+d*10)*(typeof ctrStrPay==='function'?ctrStrPay()/560:1)*rep/10)*10,title:'Carry sealed cargo to '+o.name}}
 const P=ctrPool(t,ti);let tot=0;P.forEach(x=>tot+=x.w);let r=rnd()*tot,e=P[P.length-1];for(const x of P){r-=x.w;if(r<=0){e=x;break}}
 const f=e.f,diff=ctrDiff(),pos=ctrLairAt(t,f,e.lo,e.hi),tk=CTR_TIERK[FACT[f].tier]||1;
 return{type:'hunt',f,diff,x:pos.x,y:pos.y,pay:Math.round((typeof ctrStrPay==='function'?ctrStrPay()*.85:200+fielded().length*25)*CTR_PAYK[diff-1]*tk*rep/10)*10,title:ctrTitle(f,t)}}
/* ---- markets stock by tier: hamlets tier 1-2, towns tier 3 from day 8, cities tier 3 from day 6, 4 from day 16, 5 from day 30 ----
   Famed and unique items are never on the stalls. */
function marketTier(size,day){size=size||1;day=day||1;if(size>=3)return day>=30?5:day>=16?4:day>=6?3:2;if(size===2)return day>=8?3:2;return day>=20?3:2}
function marketPool(maxT){return Object.keys(ITEMS).filter(k=>{const i=ITEMS[k];return!i.uniq&&!i.famed&&!i.glad&&(i.tier||1)<=maxT})}   // gladiator gear: only the colosseum's armory (29-colosseum.js)
// one item of ids, by tier: the top tier (maxT) weight 1.2, the one below 2, the rest 1.6; q (-1 poor .. +1 rich, default 0) moves weight
// to the top tiers (a rich market) or away from them (a poor one). r: the stream to draw from (default the game's rnd)
function stockPick(ids,maxT,r,q){r=typeof r==='function'?r:rnd;q=clamp(+q||0,-1,1);const by={};for(const k of ids)(by[ITEMS[k].tier||1]||(by[ITEMS[k].tier||1]=[])).push(k);
 const T=Object.keys(by).map(Number).sort((a,b)=>a-b),w=T.map(t=>t===maxT?1.2*(1+.5*q):t===maxT-1?2*(1+.25*q):1.6);let tot=0;w.forEach(x=>tot+=x);let x=r()*tot,j=0;for(;j<T.length-1;j++){x-=w[j];if(x<=0)break}
 const L=by[T[j]];return L[Math.floor(r()*L.length)]}
/* ---- market days: what the stalls carry (G.towns[i].stock) ----
   The stalls restock on market day, every SHOPK.period days (mkEpoch(day): days 1-5 are market week 0, 6-10 week 1, ...); a stall keeps
   its piece through a market day with chance SHOPK.keep (per week passed), the rest is new. What comes in follows the town as it is on
   market day (mkEcon): its size (village < town < city: SHOPK.n stalls), prosperity and situations (townStockK: a famine, a siege or a
   sack thins the stalls; a boom fills them), and the top tier (mkTier: marketTier(size, day), one up in a rich town (prosperity >=
   SHOPK.rich, no trouble; never above SHOPK.cap[size]), one down in a poor or troubled one). The draws come from the town's own stream,
   mulberry(seed, town, week): the game's rnd() is never touched, so the same world shows the same stalls on the same week, however
   often the company looks, and the battles' stream is the same whether it shopped or not. t.mkEp = the market week of t.stock.
   Prices: townPriceWhy (15-factions.js) adds 'Scarce goods' on thin stalls (townStockK < .95), up to +15%. */
const SHOPK={period:5,keep:.4,n:[6,9,12],rich:70,poor:35,cap:[3,4,5],depth:[1500,3000,5000],glut:.5};
/* Market depth: the dealers of a town buy so much gear a market week (SHOPK.depth by size, x (.75 + prosperity x .005)); every crown they
   pay lowers their next offers, to half (SHOPK.glut) once the week's depth is sold. Market day clears it. t.mkSold = {ep, v (crowns paid)}.
   Trade goods (tradePrice) keep their own rule. */
function mkDepth(ti){const t=G.towns[ti];if(!t)return 1;return Math.round(SHOPK.depth[clamp(Math.round(svNum(t.size,1)),1,3)-1]*(.75+clamp(svNum(t.pros,50),0,100)*.005))}
function mkSoldNow(ti){const t=G.towns[ti],S=t&&t.mkSold;return svObj(S)&&S.ep===mkEpoch(G.day)?Math.max(0,svNum(S.v,0)):0}
function mkGlutK(ti){if(ti==null)ti=G.town;if(ti==null||ti<0||!G.towns[ti])return 1;return Math.round(clamp(1-(1-SHOPK.glut)*mkSoldNow(ti)/mkDepth(ti),SHOPK.glut,1)*1000)/1000}
function mkSoldAdd(ti,v){const t=G.towns[ti];if(!t||!(v>0))return;const ep=mkEpoch(G.day);t.mkSold={ep,v:mkSoldNow(ti)+Math.round(v)}}
function mkEpoch(day){return Math.floor((Math.max(1,Math.floor(svNum(day,1)))-1)/SHOPK.period)}
// days until the next market day (1..period): on day 5 the stalls restock tomorrow
function mkRestockIn(day){day=Math.max(1,Math.floor(svNum(day==null?G.day:day,1)));return SHOPK.period-((day-1)%SHOPK.period)}
function mkStream(ti,ep){let h=((svNum(G&&G.seed,0)|0)^0x5a17c0de)>>>0;h=Math.imul(h^(ti+1)*0x9e3779b1,0x85ebca6b)>>>0;h=Math.imul(h^(h>>>13)^Math.imul(ep+7,0xc2b2ae35),0x27d4eb2f)>>>0;return mulberry((h^(h>>>16))>>>0)}
// the town's market as it stands: {size, pros, stockK, bad (troubles), q (-1..1), tier, base (marketTier), n (stalls), why: [text]}
function mkEcon(ti){const t=G.towns[ti],size=clamp(Math.round(svNum(t&&t.size,1)),1,3),pros=svNum(t&&t.pros,50),stockK=typeof townStockK==='function'?townStockK(ti):1,
  bad=(Array.isArray(t&&t.sit)?t.sit:[]).filter(x=>x&&typeof SITS==='object'&&SITS[x.k]&&(SITS[x.k].pros||0)<0).map(x=>SITS[x.k].n),base=marketTier(size,G.day),why=[];
 let tier=base;if(pros>=SHOPK.rich&&!bad.length&&base<SHOPK.cap[size-1]){tier++;why.push('prosperous: finer goods')}else if((pros<SHOPK.poor||bad.length)&&base>1){tier--;why.push(bad.length?bad[0].toLowerCase()+': poorer goods':'poor: plainer goods')}
 const q=clamp((pros-50)/40,-1,1)*(bad.length?.5:1)-(bad.length?.3:0);
 let n=stockK>0?Math.max(3,Math.round(SHOPK.n[size-1]*Math.min(1.35,stockK))):0;n=Math.max(stockK>0?2:0,n+(typeof runModK==='function'?runModK('stock',0):0));
 return{size,pros,stockK,bad,q:clamp(q,-1,1),tier,base,n,why}}
function mkTier(ti){return mkEcon(ti).tier}
// a fresh draw of item ids for town ti, market week ep, n stalls at top tier maxT (the stream r, else the town's own)
function mkDraw(t,ti,ep,E,n,r){r=r||mkStream(ti,ep);const ids=marketPool(E.tier),out=[];for(let i=0;i<n;i++){out.push(stockPick(ids,E.tier,r,E.q))}
 // eastern stalls (19-east.js): eastStock(t, stock, maxTier, r) -> the stock (eastern gear in eastern markets)
 let st=out;if(typeof eastStock==='function'&&out.length){let X=null;try{X=eastStock(t,out,E.tier,r)}catch(e){X=null}if(Array.isArray(X))st=X.filter(id=>ITEMS[id]&&!ITEMS[id].famed)}
 // a piece twice on the stalls (a repeat draw, or the eastern swap): another of its kind and tier band, if the stalls lack one
 return st.map((id,j)=>{if(st.indexOf(id)===j)return id;const it=ITEMS[id],L=ids.filter(k=>ITEMS[k].k===it.k&&!!ITEMS[k].east===!!it.east&&!st.includes(k));return L.length?L[Math.floor(r()*L.length)]:id})}
// the stalls of town ti on market week ep: keeps a share of prev (the stock of an earlier week, `weeks` ago), draws the rest. Pure: no rnd()
function mkRoll(t,ti,ep,prev,weeks){const E=mkEcon(ti),r=mkStream(ti,ep),ids=marketPool(E.tier),keepP=Math.pow(SHOPK.keep,Math.max(1,weeks|0||1)),kept=[];
 for(const id of Array.isArray(prev)?prev:[]){const it=ITEMS[id],k=r()<keepP;if(k&&it&&!it.famed&&!it.uniq&&ids.includes(id)&&kept.length<E.n)kept.push(id)}
 const stock=kept.concat(mkDraw(t,ti,ep,E,Math.max(0,E.n-kept.length),r));
 {const hs=ids.filter(k=>ITEMS[k].k==='h');if(hs.length&&stock.length&&!stock.some(id=>ITEMS[id].k==='h')){const lo=hs.filter(k=>(ITEMS[k].tier||1)<=Math.min(E.tier,3)),L=lo.length?lo:hs;stock[stock.length-1]=L[Math.floor(r()*L.length)]}}   // every market has a helmet on the stalls
 return stock}
// brings the stalls of t up to this market week (fresh: a new stock outright, as on a new game or a town that changed hands)
function mkRestock(t,fresh){const ti=G.towns.indexOf(t);if(ti<0)return false;const ep=mkEpoch(G.day);if(!fresh&&t.mkEp===ep&&Array.isArray(t.stock))return false;
 const weeks=svFin(t.mkEp)?ep-t.mkEp:1;t.stock=mkRoll(t,ti,ep,fresh?[]:t.stock,weeks);t.mkEp=ep;return true}
// recruits: 4 (5 with the recruiter); backgrounds by recruitBG (renown makes rare ones likelier); some veterans at higher renown tiers
/* The stalls used to be drawn here from the game stream (rnd); they come from the town's own stream now (mkRestock). So that a world
   plays out as before (the same recruits, notices, bands and battles from the same seed), stockTown still makes the draws the old
   stalls made, and throws them away. */
function mkLegacyDraws(t){const maxT=marketTier(t.size,G.day),ids=marketPool(maxT),L=[];const nS=Math.max(3,9+twCountStep(typeof townStockK==='function'?townStockK(G.towns.indexOf(t)):1,2)+(typeof runModK==='function'?runModK('stock',0):0));
 for(let i=0;i<nS;i++)L.push(stockPick(ids,maxT));
 {const hs=ids.filter(k=>ITEMS[k].k==='h');if(hs.length&&L.length&&!L.some(id=>ITEMS[id].k==='h')){const lo=hs.filter(k=>(ITEMS[k].tier||1)<=Math.min(maxT,3));L[L.length-1]=pick(lo.length?lo:hs)}}
 if(typeof eastStock==='function'){try{eastStock(t,L,maxT)}catch(e){}}}
function stockTown(t){const fresh=!svFin(t.ref)||t.ref<0||!Array.isArray(t.stock)||!svFin(t.mkEp);t.ref=G.day;t.recruits=[];const D=typeof renownDef==='function'?renownDef():null,nR=Math.max(2,5+(typeof followerHas==='function'&&followerHas('recruiter')?1:0)+(typeof runModK==='function'?runModK('recruits',0):0));
 for(let i=0;i<nR;i++){const m=newMerc(typeof recruitBG==='function'?recruitBG(t):wpickBG());if(D&&D.vet>0&&rnd()<D.vet)makeVeteran(m,ri(D.lv[0],D.lv[1]));t.recruits.push(m)}
 mkLegacyDraws(t);   // the game stream as it always ran (below)
 mkRestock(t,fresh);   // the stalls: market days, the town's own stream (above)
 const keep=typeof rvKeepTaken==='function'?rvKeepTaken(t):[];   // notices a rival company holds stay up, marked as taken
 t.contracts=[];const nC=Math.max(0,townBoardN(t)-keep.length);if(typeof ctrBoard==='function')t.contracts=ctrBoard(t,nC);else for(let i=0;i<nC;i++){const c=genContract(t);if(c)t.contracts.push(c)}t.contracts=keep.concat(t.contracts);
 if(typeof colRecruits==='function')colRecruits(t)}   // a colosseum town's tavern: gladiators (29-colosseum.js)
/* how many notices a board posts: 3, +1 in a city, +1 when the owner is friendly or allied, -1 when cold; none when the town is hostile.
   SITS[k].contracts as a number adds or removes notices. */
/* the world's recruit and stock factors (situations, prosperity) as a step on the usual count: a small drift keeps it, a famine or a boom moves it */
function twCountStep(k,big){k=+k;if(!isFinite(k)||k<=0)return 0;return k>=1.3?big:k>=1.15?1:k<=.55?-2*big:k<=.8?-big:0}
function townBoardN(t){const i=G.towns.indexOf(t);if(twHostile(i))return 0;let n=3+(t.size>=3?1:0);const T=typeof repTier==='function'?repTier(t.own||'free'):null;if(T){if(T.k==='friendly'||T.k==='allied')n++;else if(T.k==='cold')n--}
 if(Array.isArray(t.sit))for(const x of t.sit){const S=x&&typeof SITS==='object'&&SITS?SITS[x.k]:null;if(S&&typeof S.contracts==='number')n+=S.contracts>=1.5?1:S.contracts<=.6?-1:0}return clamp(n,1,5)}
/* ---- the town economy: prices through townPriceK(i, kind) (owner reputation, situation, specialty; 15-factions.js), closed markets
   through townHostile(i). Without those helpers every price is the old one. ---- */
function twK(kind,ti,id){if(ti==null)ti=G.town;if(typeof townPriceK!=='function'||ti==null||ti<0)return 1;let k=1;try{k=+townPriceK(ti,kind,id)}catch(e){k=1}return k>0&&isFinite(k)?k:1}
function twHostile(ti){if(ti==null)ti=G.town;if(typeof townHostile!=='function'||ti==null||ti<0)return false;try{return!!townHostile(ti)}catch(e){return false}}
// one line that says why this market's prices differ (townPriceWhy, 15-factions.js): "Buy ×1.12: Cold with House X, Festival"
function twPriceWhyHTML(kind,ti){if(ti==null)ti=G.town;if(typeof townPriceWhy!=='function'||ti==null)return'';let L=[];try{L=townPriceWhy(ti,kind)||[]}catch(e){L=[]}if(!L.length)return'';const k=twK(kind,ti);
 return`<p class="pn-hint tw-why">${twIcon('coin',16)}<span><b>${kind==='sell'?'They pay':'Prices'} ×${k.toFixed(2)}</b> ${L.map(x=>htmlEsc(String(x.why))+' ×'+(+x.k).toFixed(2)).join(', ')}</span></p>`}
function mkBuyPrice(id,ti){const it=ITEMS[id];return it?Math.max(1,Math.round((it.price||0)*twK('buy',ti,id))):0}
function mkSellPrice(id,ti){const it=ITEMS[id];if(it&&it.k==='t')return tradePrice(id,ti).v;return Math.max(0,Math.floor(sellPrice(id)*twK('sell',ti,id)*mkGlutK(ti)))}
/* trade goods (ITEMS kind 't', 10-data.js): the full price where the good is not made, half where it is, times the town's sell factor
   (reputation, situations, prosperity, specialties). tradePrice(id, ti) -> {v, made (the town makes it), k (the sell factor), why} */
function tradePrice(id,ti){const it=ITEMS[id];if(!it)return{v:0,made:false,k:1,why:''};if(ti==null)ti=G.town;const t=G&&G.towns&&ti!=null?G.towns[ti]:null,made=!!(t&&Array.isArray(t.spec)&&t.spec.includes(it.good)),k=twK('sell',ti,id);
 return{v:Math.max(0,Math.floor((it.price||0)*(made?.5:1)*k)),made,k,why:made?`${t.name} makes ${GOODS[it.good]?GOODS[it.good].n.toLowerCase():'this'} itself: half price`:t?`Not made here: full price`:''}}
function mkFoodPrice(ti){return Math.max(5,Math.round(30*twK('food',ti)))}
function twShut(){if(!twHostile())return false;toast('The market is closed to the company');return true}
/* the company walks into town i (the world's arrival): a town event (17-events.js eventTick) may come first, and opens the town when it
   closes; else the town opens at once. openTown(i) itself never rolls an event (tests and inner calls use it directly). */
function enterTown(i){if(typeof eventTick==='function'){let r=false;try{r=eventTick('town',{town:i,then:()=>openTown(i)})}catch(e){r=false}if(r)return'event'}openTown(i);return'open'}
function openTown(i){G.town=i;const t=G.towns[i];if(G.day-t.ref>=2)stockTown(t);else mkRestock(t);let note='';const c=G.contract;
 if(c&&typeof ctrTurnIn==='function'){const r=ctrTurnIn(i);if(r&&r.betray&&typeof ctrBetrayShow==='function'&&ctrBetrayShow(i))return;if(r&&r.ok)note=`<p class="good">${r.text}</p>`}   // a betrayal: its choice first (16-contracts.js), the town opens after
 else if(c&&((c.type==='deliver'&&c.to===i)||(c.type==='hunt'&&c.done&&c.town===i))){G.crowns+=c.pay;G.renown+=8*c.diff;note=`<p class="good">Contract fulfilled. You are paid ${c.pay} crowns and gain ${8*c.diff} renown.</p>`;G.contract=null;if(typeof ambEvent==='function')ambEvent('contract',c)}
 if(twHostile(i))note+=`<p class="bad">${typeof townHostileWhy==='function'?townHostileWhy(i):'The owner of this town is hostile to the company: its market, tavern and notice board are closed to you.'}</p>`;
 townTab='contracts';townSel={contracts:0,tavern:0,market:'food',temple:0,tailor:0,tav:'rec',ret:null};if(typeof TLR!=='undefined')TLR.draft=null;panelForget('town:');
 townAt=typeof tvCan==='function'&&tvCan()?'scene':'panel';renderTown(note);save();if(typeof ambNotify==='function')ambNotify()}
function mastChips(m){return tlTrees(m).filter(x=>x.kind!=='weapon'&&x.kind!=='armor').map(x=>{const r=tlGiftRes(x.key);return`<span class="chip" style="${r?'border-color:'+RESC[r]+';color:'+RESC[r]:''}">${x.kind==='gift'?tlGiftLabel(x.key):x.tree.n}</span>`}).join('')}
/* ---- town panel (two-pane, see 52-panels.js) ---- */
/* townAt: 'scene' = the illustrated town square (51-townview.js) is in front, 'panel' = one of its four places is open.
   Without a real canvas (headless tests) the scene is skipped and the town is the panel alone, as before. */
let townNote='',townSel={contracts:0,tavern:0,market:'food',temple:0,tailor:0,tav:'rec',ret:null},townAt='panel';
const TOWNTABS=[['contracts','Contracts'],['tavern','Tavern'],['market','Market'],['tailor','Tailor'],['inn','Inn'],['temple','Temple']];
const TOOLLOT=10;   // tools are sold by the lot
function toolPrice(n,ti){return Math.max(1,Math.round((typeof TOOLPRICE==='number'&&TOOLPRICE>0?TOOLPRICE:3)*(n||TOOLLOT)*twK('tools',ti)))}
function townGo(k){townTab=k;renderTown()}
function townPick(k){townSel[townTab]=k;renderTown(townNote)}
function leaveTown(){if(typeof tvHide==='function')tvHide();townAt='panel';if(!closePanel()&&typeof closeSheet==='function')closeSheet()}
function townBack(){if(typeof tvCan==='function'&&tvCan()){townAt='scene';renderTown();if(townAt==='scene')return}leaveTown()}
function compass(dx,dy){return['east','south-east','south','south-west','west','north-west','north','north-east'][((Math.round(Math.atan2(dy,dx)/(Math.PI/4))%8)+8)%8]}
function leagues(a,b){return Math.max(1,Math.round(Math.hypot(a.x-b.x,a.y-b.y)/TS))}
/* ---- pixel helpers for the town panel (art's pxIcon / company's portraitHTML, with fallbacks until they exist) ---- */
function twIcon(n,sz,fb){if(typeof pxIcon==='function'){try{if(typeof iconRows!=='function'||iconRows(n))return pxIcon(n,sz||16);if(PNOWN[n])return pnIcon(n,'',sz||16);return pxIcon(n,sz||16)}catch(e){}}return fb?pnIcon(fb):''}
function twItemIcon(id,sz){const it=ITEMS[id];if(typeof pxIcon!=='function'||!it||pnHasPx(itemIconName(id)))return pnItemIcon(id,sz||32);let h;if(it.k==='h')h=twIcon('helmet',sz||32);else h=pxIcon(it.k==='s'?'shield':it.k==='a'?(it.arm<=60?'armor-light':it.arm<=150?'armor-medium':'armor-heavy'):it.wt||'sword',sz||32);return pnFamedWrap(id,h)}
function twPortrait(m,sz){if(typeof portraitHTML==='function'){try{const h=portraitHTML(m,sz||32);if(h)return`<span class="tw-por">${h}</span>`}catch(e){}}const r=tlRes(m);return`<span class="tw-por none" style="width:${sz||32}px;height:${sz||32}px"><span class="pn-pip${r?' g-'+r:''}"></span></span>`}
function twSkulls(n,of){if(typeof pxIcon!=='function')return pnSkulls(n,of);let h='';for(let i=0;i<(of||n);i++)h+=`<span class="${i<n?'':'off'}">${pxIcon('skull',16)}</span>`;return`<span class="tw-skulls" aria-label="Danger ${n} of ${of||n}">${h}</span>`}
function twStat(ic,v,fb){return`<span class="tw-s">${twIcon(ic,16)}${fb&&typeof pxIcon!=='function'?fb+' ':''}${v}</span>`}
function twItemStats(id){const i=ITEMS[id];return(i&&i.famed?'<span class="tw-t fmd-tag">Famed</span>':'')+(typeof pxIcon==='function'?twItemStats0(id):itemDesc(id))}
function twItemStats0(id){const i=ITEMS[id];if(i.k==='t')return`<span class="tw-t">Trade good</span>`+twStat('coin',G.town!=null?tradePrice(id).v:i.price);
 if(i.k==='w')return twStat(i.rng>2?'ranged':'melee',`${i.d[0]}–${i.d[1]}`)+twStat('ap',i.ap)+`<span class="tw-t">${i.two?'2H':'1H'}</span>`+(i.rng>1?`<span class="tw-t">reach ${i.rng}</span>`:'')+(i.spell?`<span class="tw-t">+${Math.round(i.spell*100)}% spell</span>`:'');
 if(i.k==='s')return twStat('mdef','+'+i.md)+twStat('rdef','+'+i.rd)+twStat('fatigue','−'+i.fat);if(i.k==='h')return twStat('helmet',i.arm)+twStat('fatigue','−'+(i.fat||0))+'<span class="tw-t">head</span>';return twStat('armor',i.arm)+twStat('fatigue','−'+i.fat)}
/* faction emblems: a heater shield in the faction's colours with its mark (16x16, drawn here) */
const TWSHIELD=['................','.00000000000000.','.0++++++++++++0.','.0+##########-0.','.0+##########-0.','.0+##########-0.','.0+##########-0.','.0+##########-0.','.0+##########-0.','.0+##########-0.','.0+#########--0.','..0+########-0..','..0+#######--0..','...0+#####--0...','....00----00....','......0000......'];
const TWMARK={
 gob:{f:'bca',m:['A......A','AA.AA.AA','.AAAAAA.','.AyAAyA.','.AAAAAA.','..A00A..','...AA...','........']},
 undead:{f:'341',m:['.llllll.','llllllll','l00ll00l','l00ll00l','lll00lll','.llllll.','.l0ll0l.','........']},
 beast:{f:'jki',m:['..l..l..','.ll..ll.','.ll..ll.','........','..llll..','.llllll.','.llllll.','..l..l..']},
 orc:{f:'753',m:['qq.kk.qq','qqqkkqqq','qpqkkqpq','qq.kk.qq','...kk...','...kk...','...kk...','...jj...']},
 bandit:{f:'ghf',m:['...qq...','...qq...','...qp...','...qp...','.cccccc.','...jj...','...jj...','...cc...']},
 void:{f:'DCG',m:['...ee...','..eCCe..','.eCxxCe.','eCx00xCe','.eCxxCe.','..eCCe..','...ee...','........']},
 serpent:{f:'wv3',m:['..yyyy0g','.yy.....','.yy.....','..yyyy..','.....yy.','.....yy.','.yyyyy..','yy......']},
 ent:{f:'ija',m:['..AAAA..','.AABAAA.','AABAABAA','.AAAAAA.','...kk...','...kk...','..kkkk..','.k.kk.k.']},
 ogre:{f:'nmo',m:['..tttt..','.tttttt.','t00tt00t','tttttttt','ttuuuutt','tlu..ult','.tuuuut.','..tttt..']},
 wyvern:{f:'fga',m:['d......d','dd....dd','ddd..ddd','.dddddd.','..dccd..','...dd...','...cd...','..d..c..']}};
const TWCARGO=['................','................','..000000000000..','.0kkkkkckkkkkk0.','.0kjjjjbjjjjji0.','.0kjjjjbjjjjji0.','.0cbbbghgbbbbb0.','.0kjjjgggjjjji0.','.0kjjjfgfjjjji0.','.0kjjjjbjjjjji0.','.0kjjjjbjjjjji0.','.0jiiiibiiiiii0.','..000000000000..','................','................','................'];
function twEmblemRows(c){if(!twEmF(c))return TWCARGO;const M=TWMARK[c.f];return TWSHIELD.map((r,y)=>{let o='';for(let x=0;x<16;x++){const k=r[x],mk=y>=3&&y<11&&x>=4&&x<12?M.m[y-3][x-4]:'.';o+=mk!=='.'?mk:k==='#'?M.f[0]:k==='+'?M.f[1]:k==='-'?M.f[2]:k}return o})}
function twEmF(c){return c&&c.f&&TWMARK[c.f]&&c.type!=='deliver'&&c.type!=='escort'&&c.type!=='relic'?c.f:null}
function twEmblem(c,sz){if(c&&c.type!=='hunt'&&c.type!=='deliver'&&typeof CTYPES==='object'&&CTYPES&&CTYPES[c.type]&&typeof pxIcon==='function'){const n=typeof icHas==='function'&&icHas('ct-'+c.type)?'ct-'+c.type:CTYPES[c.type].icon||('ct-'+c.type);try{const h=pxIcon(n,sz||32);if(h)return h}catch(e){}}
 const key=twEmF(c)||'cargo',u=typeof pxURL==='function'?pxURL('twem-'+key,twEmblemRows(c),1):'';
 if(!u)return pnIcon(twEmF(c)?'skull':'contracts');return`<i class="tw-em" style="width:${sz||32}px;height:${sz||32}px;background-image:url(${u})" aria-hidden="true"></i>`}
function twHead(icon,kick,title){return`<div class="tw-head">${icon?`<span class="tw-hi">${icon}</span>`:''}<div><div class="pn-kick">${kick}</div><div class="pn-h">${title}</div></div></div>`}

function giftRow(m){const r=tlRes(m),g=tlGift(m),st=g&&MAST[g].style;return`<div class="pn-gifts">${RESK.map(k=>`<span class="pn-gift g-${k}${k===r?' on':''}">${typeof pxIcon==='function'?pxIcon(k,16):'<i></i>'}${RESN[k]}</span>`).join('')}</div><p class="pn-p dim">${r?`Carries the gift of ${RESN[r]}${st&&TL_STYN[st]?', shaped to a '+TL_STYN[st].toLowerCase()+' hand':''}: <b class="tw-gv g-${r}">${tlGiftLabel(g)}</b>. The first perk learned in it awakens the gift.`:'No gift stirs here. This one fights with steel alone.'}</p>`}
/* the recruit's trees, one line each: style trees (and the Monster hunter tree) with their theme, the gift variant, then the weapon
   families of its Weapon mastery tree (from level 3) */
function twTreeList(m){const T=tlTrees(m),wl=tlTierLv('weapon',1),abN=x=>[].concat(...tlTiers(x.tree)).filter(p=>p&&p.ab&&AB[p.ab]).map(p=>AB[p.ab].n||p.n);
 let h=T.filter(x=>x.kind!=='weapon'&&x.kind!=='armor').map(x=>{const r=tlGiftRes(x.key),ab=abN(x);return`<div class="pn-mast tw-mast${r?' g-'+r:''}" data-tree="${x.key}">${twIcon(tlTreeIcon(x.key),32)}<b>${x.kind==='gift'?tlGiftLabel(x.key):x.tree.n}</b><span>${x.tree.d||''}</span>${ab.length?`<small>${ab.slice(0,3).join(', ')}${ab.length>3?'…':''}</small>`:''}</div>`}).join('');
 const W=T.filter(x=>x.kind==='weapon');
 const WO=tlOpts(m).filter(o=>o.kind==='weapon'&&!o.cap);
 h+=W.length&&WO.length?`<div class="tw-wts">${WO.map(o=>`<span class="tw-wt" title="${htmlEsc(o.perk.n+': '+o.perk.d)}">${twIcon(tlPerkIcon(o),16)}${TL_WTN[o.perk.wt]||o.perk.wt}</span>`).join('')}<small>weapon masteries, from level ${wl}</small></div>`
  :`<p class="pn-p dim">No weapon masteries${(tlWtAllowed(m).length?'':' for this background')}.</p>`;
 const A=T.filter(x=>x.kind==='armor');if(A.length)h+=`<div class="tw-wts tw-ats">${A.map(x=>{const ac=tlTreeArm(x.key);return`<span class="tw-wt" title="${x.tree.n}${x.tree.d?': '+x.tree.d:''}">${twIcon(tlTreeIcon(x.key),16)}${ac?TL_ARMN[ac]:x.tree.n}</span>`}).join('')}<small>${A.length===1?'the only armor tree':'armor trees'} for ${tlBgA(m)}, from level ${tlTierLv('armor',1)}${A.length>1?', each only in its class':''}</small></div>`;
 const no=(RACE[m.race]&&RACE[m.race].noWt)||[],lost=no.filter(w=>(BG[m.bg].wt||[]).includes(w));if(lost.length)h+=`<p class="pn-p dim">A ${RACE[m.race].n.toLowerCase()} never learns the ${lost.map(w=>(TL_WTN[w]||w).toLowerCase()).join(' or ')} mastery.</p>`;
 return h}
function gearRows(m){return[['w','Weapon']].concat(m.eq&&m.eq.b?[['b','Backup']]:[],[['s',m.eq&&ITEMS[m.eq.s]&&ITEMS[m.eq.s].k==='w'?'Off hand':'Shield'],['a','Armor'],['h','Helmet']],m.eq&&m.eq.c?[['c','Surcoat']]:[]).map(([k,n])=>{const id=m.eq[k];return`<div class="pn-gear${id?'':' none'}">${id?twItemIcon(id,32):twIcon(k==='w'?'fist':k==='s'?'shield':k==='h'?'helmet':'armor-light',32,k==='w'?'sword':k==='s'?'shield':'armor')}<span class="pn-rmain"><span class="pn-rt">${id?pnItemName(id):k==='w'?'Unarmed':'No '+n.toLowerCase()}</span>${id?`<span class="pn-rs tw-line">${twItemStats(id)}</span>`:''}</span><span class="pn-slot">${n}</span></div>`}).join('')}
function statGrid(m,s){const SK={hp:'hp',armor:'arm',fatigue:'fat',init:'init',melee:'ms',ranged:'rs',mdef:'md',rdef:'rd',helmet:'helm',resolve:'brv'},c=(ic,v,n)=>`<div data-stat="${SK[ic]||''}" data-v="${String(v).replace(/<small>/g,'').replace(/<[^>]*>/g,'')}" role="button" tabindex="0"><b>${v}</b>${twIcon(ic,16)}<span>${n}</span></div>`;
 return`<div class="pn-stats tw-stats${typeof s.brv==='number'?' five':''}">${c('hp',m.hp<s.hp?m.hp+'<small>/'+s.hp+'</small>':s.hp,'HP')}${c('armor',s.arm,'Armor')}${c('fatigue',s.fat,'Fatigue')}${c('init',s.init,'Init')}${c('melee',s.ms,'Melee')}${c('ranged',s.rs,'Ranged')}${c('mdef',s.md,'M def')}${c('rdef',s.rd,'R def')}${typeof s.helm==='number'?c('helmet',s.helm,'Helmet'):''}${typeof s.brv==='number'?c('resolve',s.brv,'Resolve'):''}</div>`}
function marketCompare(id){const k=ITEMS[id].k;return G.roster.map(m=>{const cur=m.eq[k],w=ITEMS[m.eq.w];let x='';
  if(k==='s'&&!tlEquipRule(m,'s',id).ok)x='<span class="pn-d same">Hands full</span>';else{x=pnDeltaChips(id,cur);if(k==='w'&&id!==cur&&tlDropsShield(m,'w',id))x+='<span class="pn-d same">drops shield</span>';if(k==='s'&&tlSlung(m))x+='<span class="pn-d same">slung</span>'}
  return`<div class="pn-cmp${m.field?'':' res'}">${twPortrait(m,32)}<span class="pn-cn"><b>${htmlEsc(m.name)}</b><small>${cur?pnItemName(cur):k==='w'?'Unarmed':'None'}</small></span><span class="pn-cd">${x}</span></div>`}).join('')}
function itemDetail(id){const it=ITEMS[id];if(it.k==='t')return tradeDetail(id);return`${twHead(twItemIcon(id,48),itemKind(id)+(it.tier?' · tier '+it.tier:''),pnItemName(id,1))}${pnFamedBlock(id)}${pnFacts(pnFamedFacts(id))}${pnHead('Against what the company carries')}<div class="pn-cmps">${marketCompare(id)}</div>`}
function twRecruitLine(m){const b=BG[m.bg];return`${m.eq.w?twItemIcon(m.eq.w,16):twIcon('fist',16)}${m.eq.b?twItemIcon(m.eq.b,16):''}${m.eq.s?twItemIcon(m.eq.s,16):''}${m.eq.a?twItemIcon(m.eq.a,16):''}<span class="tw-t0">${RACE[m.race].n} ${b.n.toLowerCase()}</span>`}
/* the recruit's build at a glance: style trees, the gift in its colour with its variant, the weapon families */
function twRecruitTrees(m){const g=tlGift(m);return`${typeof coTreeStrip==='function'?coTreeStrip(m):''}${g?`<span class="tw-gv g-${tlGiftRes(g)}">${MAST[g].n}</span>`:''}`}
function townView(t){let list='',detail='',foot='',key=townTab;
 if(townTab==='contracts'){const n=t.contracts.length,i=clamp(+townSel.contracts||0,0,n-1);townSel.contracts=i;key+=':'+i;
  if(G.contract)list+=`<div class="pn-hint tw-hint">${twEmblem(G.contract,32)}<span><b>Contract in hand</b>${G.contract.title}</span></div>`;
  list+=pnSec('Notice board',n);
  if(!n){list+=pnEmpty('No work posted.');detail=`<div class="pn-blank">${twIcon('board',48,'contracts')}<p>${G.contract?'You already hold a contract. Finish or abandon it before taking another.':'No work posted. New notices go up every two days.'}</p></div>`}
  t.contracts.forEach((c,j)=>{list+=pnRow({on:`townPick(${j})`,sel:j===i,cls:'wrap tw-row',lead:twEmblem(c,32),title:c.title,sub:twCtrSub(c),right:pnCoin(c.pay)+twSkulls(c.diff,Math.max(3,c.diff))})});
  if(n){const c=t.contracts[i],v=twCtrDetail(c,t);detail=v.detail;foot=v.foot}}
 else if(townTab==='tavern'&&townSel.tav==='fab'&&tavFabled().length){const v=fabledView(t);list=v.list;detail=v.detail;foot=v.foot;key+=':'+v.key}
 else if(townTab==='tavern'&&townSel.tav==='ret'&&typeof FOLLOWERS!=='undefined'){const v=retinueView(t);list=v.list;detail=v.detail;foot=v.foot;key+=':'+v.key}
 else if(townTab==='tavern'){const n=t.recruits.length,i=clamp(+townSel.tavern||0,0,n-1),full=G.roster.length>=MAXROSTER,solo=!(typeof canRecruit!=='function'||canRecruit());townSel.tavern=i;key+=':'+i;
  if(typeof FOLLOWERS!=='undefined'||tavFabled().length)list+=tavTabs('rec');list+=pnSec('Looking for work',solo?recruitWhy():`Roster ${G.roster.length} of ${MAXROSTER}`);
  if(!n){list+=pnEmpty('Nobody is looking for work today.');detail=`<div class="pn-blank">${twIcon('tavern',48,'tavern')}<p>Nobody is looking for work today. New faces drift in every two days.</p></div>`}
  t.recruits.forEach((m,j)=>{const c=hireCost(m),tc=typeof traitChips==='function'?traitChips(m,{compact:1}):'';list+=pnRow({on:`townPick(${j})`,sel:j===i,cls:'tw-row'+(solo?' off solo':''),lead:twPortrait(m,32),title:htmlEsc(m.name)+(m.lvl>1?` <span class="tw-t vet">Lv ${m.lvl}</span>`:''),sub:`<span class="tw-line">${twRecruitLine(m)}</span><span class="tw-line co-trees tw-trees">${twRecruitTrees(m)}${tc}</span>`,right:pnCoin(c,G.crowns<c?'short':'')})});
  if(n){const m=t.recruits[i],b=BG[m.bg],s=calc(m),c=hireCost(m),tf=typeof traitChips==='function'?traitChips(m,{full:1}):'';
   detail=`${twHead(twPortrait(m,64),`${RACE[m.race].n} ${b.n.toLowerCase()}, level ${m.lvl}${m.lvl>1?', a veteran':''}`,htmlEsc(m.name))}${statGrid(m,s)}${tf?pnHead('Traits')+tf:''}${m.lvl>1&&m.perks&&m.perks.length?`<p class="pn-p dim">Has fought before: ${m.perks.length} perk${m.perks.length===1?'':'s'} learned${m.pp?', '+m.pp+' point'+(m.pp===1?'':'s')+' to spend':''}.</p>`:''}
   ${pnHead('The four gifts')}${giftRow(m)}
   ${pnHead('Trees')}${twTreeList(m)}
   ${pnHead('Starting gear')}<div class="pn-gears">${gearRows(m)}</div>`;
   foot=`<span class="pn-fl">${pnCoin(c,'big'+(G.crowns<c?' short':''))}<small>${solo?`<em>${recruitWhy()}</em>`:full?'<em>The roster is full</em>':G.crowns<c?'<em>Not enough crowns</em>':'+ '+Math.round(typeof wageOf==='function'?wageOf(m):b.wage)+' a day'}</small></span><button type="button" class="pn-btn pri${solo||full||G.crowns<c?' off':''}"${solo?' disabled':''} onclick="hire(${i})">Hire</button>`}}
 else if(townTab==='market'){const v=marketView(t);list=v.list;detail=v.detail;foot=v.foot;key+=':'+v.key}
 else if(townTab==='tailor'&&typeof tailorView==='function'){const v=tailorView(t);list=v.list;detail=v.detail;foot=v.foot;key=v.key}
 else if(townTab==='temple'){const L=[];G.roster.forEach((m,mi)=>cpInj(m).forEach(j=>L.push({m,mi,j,cost:cpInjCost(m,j.id)})));const n=L.length,i=clamp(+townSel.temple||0,0,n-1);townSel.temple=i;key+=':'+i+':'+n;
  list+=pnSec('The injured',n?n+' wound'+(n===1?'':'s'):'None');
  if(!n){list+=pnEmpty('Nobody in the company carries a wound.');
   detail=`${twHead(twIcon('temple',48,'inn'),'Temple','The healers’ hall')}<p class="pn-p">The priests set bones, draw fevers and stitch what the field surgeon only bound. A wound they treat is gone the same hour.</p><p class="pn-p dim">Injuries come from heavy blows and from being struck down. Left alone, most heal in days and weaken the sword who carries them until then. Some never heal, and those no temple can mend.</p>`}
  L.forEach((x,k)=>{list+=pnRow({on:`townPick(${k})`,sel:k===i,cls:'tw-row tw-inj'+(x.j.perm?' perm':''),lead:twPortrait(x.m,32),title:`${htmlEsc(x.m.name)}: ${x.j.n}`,sub:`<span class="tw-line">${cpInjIcon(x.j.id)}<span class="tw-t0">${x.j.d}</span></span>`,right:x.cost==null?'<span class="tw-t perm">For good</span>':pnCoin(x.cost,G.crowns<x.cost?'short':'')+`<small class="tw-days">${x.j.days} day${x.j.days===1?'':'s'}</small>`})});
  if(n){const x=L[i],j=x.j,m=x.m;
   detail=`${twHead(cpInjIcon(j.id,48),htmlEsc(m.name)+', '+(m.field?'fielded':'in reserve'),j.n)}${j.lore?`<p class="pn-p">${j.lore}</p>`:''}
   ${pnFacts([['Effect',`<span class="tw-bad">${j.d}</span>`],['Heals by itself',j.perm?'Never':'In '+j.days+' day'+(j.days===1?'':'s')],['Treatment',x.cost==null?'Beyond the healers':twIcon('coin',16)+x.cost+' crowns']])}
   ${x.cost==null?'<p class="pn-p warn">This one is for good. The priests can ease it, not undo it.</p>':`<p class="pn-p dim">Treated now, ${htmlEsc(m.name)} fights at full strength again today.</p>`}`;
   foot=x.cost==null?`<span class="pn-fl"><small>Cannot be treated</small></span><button type="button" class="pn-btn pri" disabled>Treat</button>`
    :`<span class="pn-fl">${pnCoin(x.cost,'big'+(G.crowns<x.cost?' short':''))}<small>${G.crowns<x.cost?'<em>Not enough crowns</em>':'to treat '+j.n.toLowerCase()}</small></span><button type="button" class="pn-btn pri${G.crowns<x.cost?' off':''}" id="twTreat" onclick="templeTreat(${x.mi},'${j.id}')">Treat</button>`}}
 else{const cost=G.roster.length*10,dawn=(G.hour||0)+8>=24,wage=dawn?(typeof companyWages==='function'?companyWages():G.roster.reduce((a,m)=>a+BG[m.bg].wage,0)):0,all=cost+wage;let hurt=0;const need=cpDamageAll(),needT=Math.ceil(need/cpToolPts()),have=cpTools(),inj=cpTreatable().length;list+=pnSec('The company',G.roster.length);
  G.roster.forEach(m=>{const mx=calc(m).hp,h=Math.min(m.hp,mx),d=cpDamage(m),c=cpCond(m);if(h<mx)hurt++;list+=`<div class="pn-row static tw-row"><span class="pn-lead">${twPortrait(m,32)}</span><span class="pn-rmain"><span class="pn-rt">${htmlEsc(m.name)}</span><span class="tw-bar${h<mx?' hurt':''}"><i style="width:${Math.round(100*h/mx)}%"></i></span></span><span class="pn-rr"><span class="pn-hp tw-hp${h<mx?' hurt':''}">${twIcon('hp',16)}${h}<small>/${mx}</small></span>${d?`<span class="pn-hp tw-hp worn" title="Armor and helmet points left">${twIcon('armor',16)}${c.a+c.h}<small>/${c.aM+c.hM}</small></span>`:''}</span></div>`});
  detail=`${twHead(twIcon('inn',48,'inn'),'Inn','A bed for the night')}<p class="pn-p">A night under a roof heals every wound of the flesh, and the company’s tools go to work on its armor.</p>
  ${pnFacts([['Wounded',twIcon('hp',16)+(hurt?hurt+' of '+G.roster.length:'None')],['Armor to mend',need?twIcon('tools',16)+`${need} points, ${needT} tool${needT===1?'':'s'} <small>(${have} carried)</small>`:twIcon('armor',16)+'None'],['Beds',twIcon('coin',16)+G.roster.length+' at 10 crowns'],['Time',twIcon('day',16)+'8 hours']].concat(dawn?[['Wages',twIcon('coin',16)+wage+' crowns <small>(due at midnight, during the night)</small>']]:[]))}
  ${need&&have<needT?`<p class="pn-p warn">Not enough tools to mend everything. The market sells them.</p>`:''}${inj?`<p class="pn-p dim">${inj===1?'One sword carries':inj+' swords carry'} an injury that sleep will not cure. The temple treats those.</p>`:''}
  ${pnHead('Common-room talk')}<p class="pn-p dim">${G.crisis&&typeof crisisLine==='function'?htmlEsc(crisisLine()):G.crisis?(G.crisis.ended?'Travelers say new rifts still open now and then.':`Rifts closed: ${G.crisis.closed} of ${G.crisis.total}.`):`The innkeeper’s seer mutters about dark days ahead, perhaps ${Math.max(1,G.crisisDay-G.day)} days off.`}</p>`;
  foot=`<span class="pn-fl">${pnCoin(all,'big'+(G.crowns<cost?' short':''))}<small>${G.crowns<cost?'<em>Not enough crowns</em>':dawn?`${cost} for beds + ${wage} wages due at midnight`:'for the whole company'}</small></span><button type="button" class="pn-btn pri${G.crowns<cost?' off':''}" onclick="innRest()">Rest the night</button>`}
 return{list,detail,foot,key}}
/* ---- market: two tabs. Purchase = the town's stock plus provisions and tools; Inventory = everything the company carries:
   spare pieces in the stash (sold from here) and what each sword wears (read-only here; taken off in the company screen).
   townSel.market keeps the selection: 'food' | 'tools' | 'b<stock i>' (Purchase), 's<stash i>' | 'e<roster i>.<slot>' | 'inv' (Inventory). ---- */
const MK_SLOTS=[['w','Weapon'],['b','Backup'],['s','Shield'],['a','Armor'],['h','Helmet'],['c','Surcoat']];
function mkWorn(){const L=[];G.roster.forEach((m,mi)=>{for(const [k,n] of MK_SLOTS){const id=m.eq&&m.eq[k];if(id&&ITEMS[id])L.push({m,mi,k,n:k==='s'&&ITEMS[id].k==='w'?'Off hand':n,id})}});return L}
function mkTabOf(sel){sel=String(sel==null?townSel.market||'food':sel);return sel[0]==='s'||sel[0]==='e'||sel==='inv'?'inv':'buy'}
function mkTab(k){if(k===mkTabOf())return;if(k==='inv'){const W=mkWorn();townSel.market=G.stash.length?'s0':W.length?'e'+W[0].mi+'.'+W[0].k:'inv'}else townSel.market='food';renderTown(townNote)}
function mkTabs(cur,nBuy,nInv){const b=(k,n,ic,c)=>`<button type="button" role="tab" class="mk-tab${cur===k?' on':''}" id="mkTab-${k}" aria-selected="${cur===k}" onclick="mkTab('${k}')">${twIcon(ic,16)}<span>${n}</span><i>${c}</i></button>`;
 return`<div class="mk-tabs" role="tablist" aria-label="Market">${b('buy','Purchase','coin',nBuy)}${b('inv','Inventory','armor',nInv)}</div>`}
function mkGear(mi,k){if(typeof slotSheet==='function'&&G.roster[mi])slotSheet(mi,k)}
// the market-day line over the stalls: 'Restocks in 3 days', the top tier and why (size, prosperity, troubles)
// the dealers' line over the company's goods: what they will still take this week ('The dealers pay 18% less until market day')
function mkGlutHTML(ti){if(ti==null||ti<0||!G.towns[ti])return'';const k=mkGlutK(ti),d=mkDepth(ti),s=mkSoldNow(ti),off=Math.round((1-k)*100);
 return`<p class="mk-day${off?' glut':''}" id="mkGlut">${twIcon('coin',16)}<span><b>${off?`Dealers pay ${off}% less`:'Dealers buying'}</b> · ${htmlEsc(off?`${s} crowns of gear sold here this week; fresh buyers on market day (${mkRestockText().toLowerCase()})`:`about ${d} crowns of gear a week before their offers drop`)}</span></p>`}
function mkRestockText(day){const n=mkRestockIn(day);return n===1?'Restocks tomorrow':`Restocks in ${n} days`}
function mkDayHTML(ti){if(ti==null||ti<0||!G.towns[ti])return'';const E=mkEcon(ti),SZ=['Village','Town','City'][E.size-1];
 const why=[SZ+' market',E.n+' stalls','up to tier '+(typeof TIERN!=='undefined'&&TIERN[E.tier]?TIERN[E.tier]:E.tier)].concat(E.why);
 return`<p class="mk-day" id="mkRestock">${twIcon('day',16)}<span><b>${mkRestockText()}</b> · ${htmlEsc(why.join(', '))}</span></p>`}
function marketView(t){let list='',detail='',foot='';const W=mkWorn();let sel=String(townSel.market||'food'),kind=sel[0],i=+sel.slice(1),wi=-1;
 if(sel==='inv')kind='n';
 else if(kind==='b'){i=Math.min(i,t.stock.length-1);if(!(i>=0))kind='f'}
 else if(kind==='s'){i=Math.min(i,G.stash.length-1);if(!(i>=0))kind=W.length?'e':'n';if(kind==='e')wi=0}
 else if(kind==='e'){const p=sel.slice(1).split('.');wi=W.findIndex(x=>x.mi===+p[0]&&x.k===p[1]);if(wi<0)wi=W.length?Math.min(W.length-1,Math.max(0,W.findIndex(x=>x.mi>=+p[0]))):-1;if(wi<0)kind=G.stash.length?'s':'n';if(kind==='s')i=0}
 else if(kind!=='t')kind='f';
 sel=townSel.market=kind==='f'?'food':kind==='t'?'tools':kind==='n'?'inv':kind==='e'?'e'+W[wi].mi+'.'+W[wi].k:kind+i;
 const tab=mkTabOf(sel);list+=mkTabs(tab,t.stock.length,G.stash.length+W.length);
 if(typeof tvTownNote!=='function'){const h=twPriceWhyHTML(tab==='buy'?'buy':'sell');if(h)list+=h}   // the town note says it when the town view is loaded
 if(tab==='buy'){const need=cpDamageAll(),needT=Math.ceil(need/cpToolPts()),tp=toolPrice();
  list+=mkDayHTML(G.town);   // market day: when the stalls restock, what kind of market
  list+=pnSec('Provisions and tools',2);
  list+=pnRow({on:`townPick('food')`,sel:kind==='f',cls:'tw-row',lead:twIcon('food',32,'food'),title:'Provisions',sub:'10 days for one man',right:pnCoin(mkFoodPrice(),G.crowns<mkFoodPrice()?'short':'')});
  list+=pnRow({on:`townPick('tools')`,sel:kind==='t',cls:'tw-row',lead:twIcon('tools',32,'armor'),title:'Tools',sub:`Each mends ${cpToolPts()} armor`+(needT>cpTools()?` <span class="tw-t warn">need ${needT}</span>`:''),right:pnCoin(tp,G.crowns<tp?'short':'')});
  list+=pnSec('For sale',t.stock.length);if(!t.stock.length)list+=pnEmpty('The stalls are bare until market day.');
  t.stock.forEach((id,j)=>{const it=ITEMS[id];list+=pnRow({on:`townPick('b${j}')`,sel:kind==='b'&&j===i,cls:'tw-row',lead:twItemIcon(id,32),title:pnItemName(id),sub:`<span class="tw-line">${it.tier?`<span class="pn-tier t${it.tier}" title="Tier ${it.tier}">${TIERN[it.tier]}</span>`:''}${twItemStats(id)}</span>`,right:pnCoin(mkBuyPrice(id),G.crowns<mkBuyPrice(id)?'short':'')})});
  if(kind==='f'){const men=G.roster.length;detail=`${twHead(twIcon('food',48,'food'),'Provisions','Salt pork and hard bread')}<p class="pn-p">10 days for one man. Every sword eats one ration a day, and a starving company bleeds.</p>${pnFacts([['In the wagons',twIcon('food',16)+G.food+' rations'],['Mouths to feed',twIcon('swords',16)+men],['Lasts the company',twIcon('day',16)+Math.floor(G.food/Math.max(1,men))+' days']])}`;
   const fp=mkFoodPrice();foot=`<span class="pn-fl">${pnCoin(fp,'big'+(G.crowns<fp?' short':''))}<small>${G.crowns<fp?'<em>Not enough crowns</em>':'for 10 rations'}</small></span><button type="button" class="pn-btn pri${G.crowns<fp?' off':''}" onclick="buyFood()">Buy for ${fp}</button>`}
  else if(kind==='t'){const have=cpTools(),more=Math.max(0,needT-have),mp=toolPrice(more);
   detail=`${twHead(twIcon('tools',48,'armor'),'Hammers, rivets and rings','Repair tools')}<p class="pn-p">Armor and helmets do not mend themselves. One tool puts back <b>${cpToolPts()} points</b> on a body armor or a helmet whenever the company makes camp or rests at an inn. The fielded and the worst damaged go first.</p>
   ${pnFacts([['In the wagons',twIcon('tools',16)+have+' tool'+(have===1?'':'s')],['Armor to mend',twIcon('armor',16)+(need?need+' points':'None')],['Tools that takes',need?twIcon('tools',16)+needT+(more?` <small>(${more} short)</small>`:''):'None'],['Price',twIcon('coin',16)+toolPrice(1)+' crown'+(toolPrice(1)===1?'':'s')+' a tool']])}
   ${need?`<p class="pn-p ${more?'warn':'dim'}">${more?`You are ${more} tool${more===1?'':'s'} short of mending everything.`:'You carry enough to mend everything at the next camp.'}</p>`:'<p class="pn-p dim">Nothing needs mending right now. A spare lot costs little and weighs less.</p>'}`;
   foot=`<span class="pn-fl">${pnCoin(tp,'big'+(G.crowns<tp?' short':''))}<small>${G.crowns<tp?'<em>Not enough crowns</em>':'for '+TOOLLOT+' tools'}</small></span>${more&&more!==TOOLLOT?`<button type="button" class="pn-btn${G.crowns<mp?' off':''}" id="twToolsNeed" onclick="buyTools(${more})">Buy ${more} for ${mp}</button>`:''}<button type="button" class="pn-btn pri${G.crowns<tp?' off':''}" id="twTools" onclick="buyTools()">Buy ${TOOLLOT} for ${tp}</button>`}
  else{const id=t.stock[i],it=ITEMS[id],own=G.stash.filter(x=>x===id).length;detail=itemDetail(id);
   const bp=mkBuyPrice(id);foot=`<span class="pn-fl">${pnCoin(bp,'big'+(G.crowns<bp?' short':''))}<small>${G.crowns<bp?'<em>Not enough crowns</em>':own?own+' in the stash':'to the stash'}</small></span><button type="button" class="pn-btn pri${G.crowns<bp?' off':''}" onclick="buyItem(${i})">Buy for ${bp}</button>`}}
 else{let worth=0;G.stash.forEach(id=>worth+=mkSellPrice(id));list+=mkGlutHTML(G.town);
  list+=`<div class="mk-sum"><span title="Every piece the company carries">${twIcon('armor',16)}<b>${G.stash.length+W.length}</b> carried</span><span title="Spare pieces in the stash">${twIcon('stash',16,'armor')}<b>${G.stash.length}</b> spare</span><span title="Worn or held by a sword">${twIcon('swords',16)}<b>${W.length}</b> equipped</span></div>`;
  list+=pnSec('Spare in the stash',G.stash.length?`${G.stash.length} · sells for ${worth}`:0);if(!G.stash.length)list+=pnEmpty('Nothing spare. Loot from battles lands here.');
  G.stash.forEach((id,j)=>{const it=ITEMS[id];list+=pnRow({on:`townPick('s${j}')`,sel:kind==='s'&&j===i,cls:'own tw-row mk-spare'+(it.famed?' fmd-row':''),lead:twItemIcon(id,32),title:pnItemName(id),sub:`<span class="tw-line"><span class="mk-tag spare">Spare</span>${twItemStats(id)}</span>`,right:pnCoin(mkSellPrice(id),'sell')})});
  list+=pnSec('Equipped',W.length);if(!W.length)list+=pnEmpty('Nobody wears anything. Equip gear in the company screen.');
  W.forEach((x,j)=>{const it=ITEMS[x.id];list+=pnRow({on:`townPick('e${x.mi}.${x.k}')`,sel:kind==='e'&&j===wi,cls:'tw-row mk-worn'+(it.famed?' fmd-row':''),lead:twItemIcon(x.id,32),title:pnItemName(x.id),sub:`<span class="tw-line"><span class="mk-tag eq">${x.n}</span><span class="tw-t0">${htmlEsc(x.m.name)}</span></span>`,right:`<span class="mk-who">${twPortrait(x.m,16)}</span>`})});
  if(kind==='n'){detail=`<div class="pn-blank">${twIcon('armor',48,'armor')}<p>The company carries nothing at all. Buy gear on the Purchase tab or take it from the fallen.</p></div>`}
  else if(kind==='s'){const id=G.stash[i],it=ITEMS[id];detail=`<div class="mk-state spare">${twIcon('stash',16,'armor')}<b>Spare</b><span>in the stash, not worn by anyone</span></div>`+itemDetail(id);
   foot=`<span class="pn-fl">${pnCoin(mkSellPrice(id),'big')}<small>${it.famed?'a famed piece: the dealers pay well':'worth '+it.price+' new'}</small></span><button type="button" class="pn-btn${it.famed?' warn':''}" onclick="sellItem(${i})">Sell for ${mkSellPrice(id)}</button>`}
  else{const x=W[wi],it=ITEMS[x.id],nm=htmlEsc(x.m.name);detail=`<div class="mk-state eq">${twIcon('swords',16)}<b>Equipped</b><span>${nm}, ${x.n.toLowerCase()} slot</span></div>`+itemDetail(x.id)+`<p class="pn-p dim">Worn gear is not for sale. Take it off in the company screen and it goes to the stash, where it can be sold for ${mkSellPrice(x.id)}.</p>`;
   foot=`<span class="pn-fl">${pnCoin(mkSellPrice(x.id),'big')}<small>once taken off</small></span><button type="button" class="pn-btn" onclick="mkGear(${x.mi},'${x.k}')">${pnIcon('company')}<span>${nm}’s gear</span></button>`}}
 return{list,detail,foot,key:sel}}
function renderTown(note){G.townOpen=true;townNote=note||'';
 if(townAt==='scene'){if(typeof tvShow==='function'&&tvShow(note))return;townAt='panel'}
 if(typeof tvbIsTab==='function'&&tvbIsTab(townTab)&&typeof tvbOpen==='function'){tvbOpen(townTab);return}   // a building panel (51-townview.js) stays on re-render
 const t=G.towns[G.town],v=townView(t),ready=G.roster.filter(m=>m.pend||m.pp).length,sq=typeof tvCan==='function'&&tvCan();
 showPanel({id:'town',title:t.name,sub:`Day ${G.day}`,banner:typeof tvTownBanner==='function'?tvTownBanner(G.town):'',meta:pnPurse()+`<button type="button" class="pn-btn ico pn-cobtn" aria-label="Company${ready?', '+ready+' ready to advance':''}" title="Company" onclick="companySheet()">${pnIcon('company','',32)}${ready?`<i>${ready}</i>`:''}</button>`,note:(typeof tvTownNote==='function'?tvTownNote(G.town):'')+townNote,closeLabel:sq?'Town square':'Leave town',closeIcon:sq?'back':'x',onClose:sq?townBack:leaveTown,
  tabs:(typeof tvTownTabs==='function'?tvTownTabs(t):TOWNTABS).map(([k,n])=>{const bl=typeof tvbIsTab==='function'&&tvbIsTab(k);return{k,n,icon:bl&&typeof tvBldIcon==='function'?tvBldIcon(k):k,badge:k==='temple'?cpTreatable().length||'':''}}),tab:townTab,
  onTab:k=>{if(typeof tvbIsTab==='function'&&tvbIsTab(k)&&typeof tvbOpen==='function')tvbOpen(k);else townGo(k)},
  list:v.list,listKey:'town:'+townTab+(townTab==='market'?':'+mkTabOf():townTab==='tavern'?':'+(townSel.tav||'rec'):''),railEnd:[],   /* ambitions: from the company screen and the renown bar, not the town's rail */detail:v.detail,detailKey:'town:'+v.key,foot:v.foot})}
function acceptContract(i){const t=G.towns[G.town];if(G.contract)return false;const c=t.contracts[i];if(!c)return false;
 if(typeof ctrAccept==='function'){if(!ctrAccept(c))return false}else G.contract=Object.assign({town:G.town,done:false},t.contracts.splice(i,1)[0]);
 toast(c.adv?`Contract accepted: ${c.adv} crowns up front`:'Contract accepted');renderTown();save();return true}
/* the notice board: a line and a detail page for any contract type, read through the ctr* hooks (16-contracts.js) */
const TW_DIFFN=['Light','Serious','Grave','Deadly','Dire'];
function twCtrSub(c){const T=typeof CTYPES==='object'&&CTYPES[c.type],f=c.f&&FACT[c.f]?', '+FACT[c.f].n.toLowerCase():'',tk=typeof ctrRivalTook==='function'?ctrRivalTook(c):'';return(T?T.n:c.type==='deliver'?'Delivery':'Hunt')+(c.type==='deliver'?'':f)+(c.due!=null?` · by day ${c.due}`:'')+(tk?` · <span class="tw-t warn">${c.rtook!=null&&typeof rivalMiniHTML==='function'?rivalMiniHTML(c.rival,16):''}${htmlEsc(tk)}</span>`:'')}
function twCtrWhere(c,t){const L=[];for(const s of c.stages||[]){if(s.k==='go'&&s.kind==='escort'){const o=G.towns[c.to],n=Math.max(1,c.len0|0||(o?leagues(o,t):1));if(o)L.push(`${s.label} from ${t.name} to ${o.name}: ${n} leagues of road ${compass(o.x-t.x,o.y-t.y)}, at the wagons' pace.`);continue}
  if(s.k==='go'){const d=leagues(s,t);L.push(`${s.label}: about ${d} league${d===1?'':'s'} ${compass(s.x-t.x,s.y-t.y)} of ${t.name}${s.fight?'':' (no fight expected)'}.`)}
  else{const o=G.towns[s.ti];if(o)L.push(o===t?`${s.label} here in ${t.name}.`:`${s.label} in ${o.name}, ${leagues(o,t)} leagues ${compass(o.x-t.x,o.y-t.y)}.`)}}
 if(!L.length){const o=c.type==='hunt'?c:G.towns[c.to];if(o)L.push(`About ${leagues(o,t)} leagues ${compass(o.x-t.x,o.y-t.y)} of ${t.name}.`)}return L}
function twCtrObj(c){if(c&&c.type==='escort'&&(c.stages||[]).some(x=>x&&x.kind==='escort'))return`The company marches beside the wagons all the way and cannot leave them. ${c.f&&FACT[c.f]?FACT[c.f].n:'Raiders'} are said to watch the road. Only bands that think themselves a match for the guards and the company together will attack; if the wagon is destroyed, the contract is lost.`;const s=(c.stages||[]).find(x=>x.k==='go'&&x.fight&&(x.fight.obj||x.fight.boss));if(!s)return'';const F=s.fight,o=F.obj;
 if(F.boss)return`The target is <b>${F.boss.name}</b>${F.boss.title?', '+F.boss.title:''}: stronger than the rest of its kind.`;
 if(o&&o.k==='escort')return'The caravan wagon fights at your back and cannot move: if it is destroyed, the contract is lost.';if(o&&o.k==='hold')return`Hold for ${o.rounds} rounds or rout them.`;if(o&&o.k==='siege')return'The foe fights from behind stakes, fortified for its first turns. Kill its leader and the rest break.';return''}
function twCtrDetail(c,t){const tk=typeof ctrTakenBy==='function'?ctrTakenBy(c):null,T=typeof CTYPES==='object'&&CTYPES[c.type],mood=typeof ctrMood==='function'?ctrMood(c):null,neg=c.neg||{},ob=twCtrObj(c);
 const facts=[['Employer',typeof ctrEmpName==='function'?ctrEmpName(c):t.name]];if(c.f&&FACT[c.f]&&c.type!=='deliver')facts.push(['Foe',FACT[c.f].n]);
 facts.push(['Danger',twSkulls(c.diff,Math.max(3,c.diff))+' '+(typeof DIFFN!=='undefined'?DIFFN:TW_DIFFN)[c.diff-1]],['Pay',`<span title="Pay rises with your company's strength, renown and the job's danger">`+twIcon('coin',16)+c.pay+' crowns'+(c.adv?` <small>(${c.adv} up front)</small>`:'')+'</span>'],['Renown',twIcon('renown',16)+'+'+8*c.diff]);
 if(c.due!=null)facts.push(['Deadline',twIcon('day',16)+'Day '+c.due+` <small>(${Math.max(0,c.due-G.day)} days)</small>`]);
 if(mood)facts.push(['Employer’s mood',`<span class="tw-mood ${mood.n}">${mood.n}</span> <small>${mood.why}</small>`]);
 const detail=`${twHead(twEmblem(c,48),T?T.n:'Contract',c.title)}<p class="pn-p">${T?T.d:''}</p>${twCtrWhere(c,t).map(x=>`<p class="pn-p dim">${x}</p>`).join('')}${ob?`<p class="pn-p">${ob}</p>`:''}
  ${pnFacts(facts)}${tk?`<p class="pn-p warn">${htmlEsc(ctrRivalTook(c))} on day ${c.rtook}. The notice stays up until the board is renewed, but the work is theirs.</p>`:''}${neg.msg?`<p class="pn-p ${neg.ok?'good':'warn'}">${neg.msg}</p>`:''}${G.contract?'<p class="pn-p warn">You already hold a contract. Finish or abandon it before taking another.</p>':''}`;
 const ix=t.contracts.indexOf(c),can=!G.contract&&!neg.gone&&!tk,hag=typeof ctrNegotiate==='function'&&can&&(neg.r||0)<3,b=c.pay0||c.pay;
 const foot=`<span class="pn-fl">${pnCoin(c.pay,'big')}<small>crowns on completion</small></span>${hag?`<button type="button" class="pn-btn" onclick="twHaggle(${ix},'pay')">Ask ${Math.round(b*1.15/10)*10}</button><button type="button" class="pn-btn" onclick="twHaggle(${ix},'adv')">Ask ${Math.round(c.pay*.3/10)*10} up front</button>`:''}${neg.counter?`<button type="button" class="pn-btn" onclick="twHaggle(${ix},'counter')">Take their offer</button>`:''}<button type="button" class="pn-btn pri" ${can?'':'disabled'} onclick="acceptContract(${ix})">Accept contract</button>`;
 return{detail,foot}}
// haggling from the board: 'pay' asks 15% over the posted pay, 'adv' a third up front, 'counter' takes the employer's last offer
function twHaggle(i,how){const t=G.towns[G.town],c=t&&t.contracts[i];if(!c||typeof ctrNegotiate!=='function')return null;const b=c.pay0||c.pay,N=c.neg||{};
 const ask=how==='counter'&&N.counter?N.counter:how==='adv'?{pay:c.pay,adv:Math.round(c.pay*.3/10)*10}:{pay:Math.round(b*1.15/10)*10,adv:c.adv||0};
 const r=ctrNegotiate(c,ask);if(c.neg){c.neg.msg=r.msg;c.neg.ok=r.ok}renderTown(r.gone?`<p class="bad">${r.msg}</p>`:'');return r}
function hireCost(m,ti){const c=typeof recruitCost==='function'?recruitCost(m):BG[m.bg].cost,k=twK('hire',ti);return k===1?c:Math.max(5,Math.round(c*k/5)*5)}
function hire(i){if(!(typeof canRecruit!=='function'||canRecruit())){toast(recruitWhy()+': nobody joins the company');return false}if(twHostile()){toast('Nobody here will sign with the company');return}const t=G.towns[G.town],m=t.recruits[i];if(!m)return;const c=hireCost(m);if(G.roster.length>=MAXROSTER){toast('The roster is full');return}if(G.crowns<c){toast('Not enough crowns');return}
 G.crowns-=c;t.recruits.splice(i,1);m.field=G.roster.filter(x=>x.field).length<MAXFIELD;G.roster.push(m);toast(m.name+' joins the company');renderTown();save()}
function buyFood(){if(twShut())return false;const p=mkFoodPrice();if(G.crowns<p){toast('Not enough crowns');return false}G.crowns-=p;G.food+=10;renderTown();return true}
function buyItem(i){if(twShut())return false;const t=G.towns[G.town],id=t.stock[i];if(!id)return false;const p=mkBuyPrice(id);if(G.crowns<p){toast('Not enough crowns');return false}G.crowns-=p;G.stash.push(id);t.stock.splice(i,1);renderTown();return true}
/* tools: a company stock like food. n defaults to one lot. */
function buyTools(n){if(twShut())return false;n=Math.max(1,Math.round(+n||TOOLLOT));const c=toolPrice(n);if(G.crowns<c){toast('Not enough crowns');return false}G.crowns-=c;G.tools=cpTools()+n;renderTown();return true}
/* temple: treat injury id of roster[i] for crowns */
function templeTreat(i,id){const m=G.roster[i];if(!m)return false;const j=cpInj(m).find(x=>x.id===id);if(!j)return false;const r=cpTreat(m,id);if(!r.ok){toast(r.why);return false}
 toast(`${m.name}: ${j.n.toLowerCase()} treated`);renderTown(`<p class="good">The healers see to ${htmlEsc(m.name)}. ${j.n} is mended for ${r.cost} crowns.</p>`);save();return true}
/* a trade good's page in the market: what it is, what this town pays, where it is made */
function tradeDetail(id){const it=ITEMS[id],q=tradePrice(id),made=G.towns.filter(t=>Array.isArray(t.spec)&&t.spec.includes(it.good)).map(t=>t.name);
 return`${twHead(twItemIcon(id,48),'Trade good',htmlEsc(it.n))}<p class="pn-p">${htmlEsc(it.d||'')}</p>${pnFacts([['Worth',twIcon('coin',16)+it.price+' crowns'],['Here',twIcon('coin',16)+q.v+' crowns <small>('+htmlEsc(q.why)+')</small>'],['Made in',made.length?htmlEsc(made.join(', ')):'No town in this land']])}<p class="pn-p dim">Trade goods sell for their full worth in any town that does not make them, and for half where they are made.</p>`}
// sells every trade good in the stash at this market; returns the crowns made (0 when there were none or the market is closed)
function sellTrade(){if(twShut())return 0;let n=0,c=0;for(let j=G.stash.length-1;j>=0;j--){const it=ITEMS[G.stash[j]];if(!it||it.k!=='t')continue;c+=mkSellPrice(G.stash[j]);G.stash.splice(j,1);n++}
 G.crowns+=c;if(n&&typeof toast==='function')toast(`Sold ${n} trade good${n===1?'':'s'} for ${c} crowns`);if(n)renderTown();return c}
function sellItem(i){if(twShut())return false;const id=G.stash.splice(i,1)[0];if(!id)return false;const p=mkSellPrice(id);G.crowns+=p;if(!(ITEMS[id]&&ITEMS[id].k==='t'))mkSoldAdd(G.town,p);renderTown();return true}
function innRest(){const cost=G.roster.length*10;if(G.crowns<cost){toast('Not enough crowns');return}G.crowns-=cost;G.roster.forEach(m=>m.hp=calc(m).hp);const d0=G.day;advanceTime(8);G.roster.forEach(m=>m.hp=calc(m).hp);const rep=cpRepair(),rt=cpRepairText(rep);let note=rt?`<p class="${rep.pts?'good':'bad'}">${rt}.</p>`:'';
 if(G.day!==d0){let msg='';try{const e=$('toast');msg=e&&typeof e.textContent==='string'?e.textContent:''}catch(e){}   // newDay() only toasts its report; the next toast would replace it
  if(msg.indexOf('Day '+G.day)===0)note=`<p class="${/desert|cannot|starves/.test(msg)?'bad':'dim'}">${msg}.</p>`+note;if(G.note==='crisis')note+='<p class="bad">Something is wrong with the sky. Word of it will meet you at the gate.</p>'}
 toast(rep.pts?`The company is rested. ${rep.pts} armor mended`:'The company is rested');renderTown(note);save();return rep}
function contractSheet(){const c=G.contract;let h='<h2>Contract</h2>';
 if(!c)h+='<p class="dim">You hold no contract. Towns post work on their notice boards.</p>';
 else{const t=G.towns[c.town];h+=`<div class="card"><b>${c.title}</b><p class="dim">${typeof ctrStatus==='function'?ctrStatus(c)+'.':c.type==='deliver'?'Deliver to '+G.towns[c.to].name+'.':c.done?'Done. Return to '+t.name+' for your pay.':'Marked on the map with a red skull. Posted in '+t.name+'.'}</p>${(()=>{const r=typeof ctrRace==='function'?ctrRace(c):null;return r&&r.text?`<p class="warn">${typeof rivalMiniHTML==='function'?rivalMiniHTML(r.r&&r.r.id||c.rival,16):''}${htmlEsc(r.text)}</p>`:''})()}${typeof escCtr==='function'&&escCtr()===c?(()=>{const p=escParty(c);return`<p class="dim">${p?htmlEsc(cvGuardLine(p))+'. ':''}The company marches beside the wagons and cannot leave them. Only bands a match for the guards and the company together will try for the caravan. Abandon the contract and the wagons roll on alone.</p>`})():''}<span class="coin">${c.pay} crowns</span></div><button class="warn" onclick="if(typeof ctrAbandon==='function')ctrAbandon();else{G.contract=null;G.renown=Math.max(0,G.renown-5)}closeSheet();toast('Contract abandoned')">Abandon contract</button> `}
 sheet(h+'<button onclick="closeSheet()">Close</button>')}
/* ---- the tavern's two pages: recruits looking for work, and the retinue (followers hired for good, slots by renown) ---- */
function tavTabs(cur){const nR=G.towns[G.town].recruits.length,nF=(G.retinue||[]).length,sl=typeof followerSlots==='function'?followerSlots():1,b=(k,n,ic,c)=>`<button type="button" role="tab" class="mk-tab${cur===k?' on':''}" id="tavTab-${k}" aria-selected="${cur===k}" onclick="tavTab('${k}')">${twIcon(ic,16)}<span>${n}</span><i>${c}</i></button>`;
 const nB=tavFabled().length;return`<div class="mk-tabs" role="tablist" aria-label="Tavern">${b('rec','Recruits','swords',nR)}${b('ret','Retinue','retinue',nF+'/'+sl)}${nB?b('fab','Fabled','star',nB):''}</div>`}
function tavTab(k){if(townSel.tav===k)return;townSel.tav=k;renderTown(townNote)}
function retPick(id){townSel.ret=id;renderTown(townNote)}
function folIcon(id,sz){return`<span class="fol-por">${twIcon('fol-'+id,sz||32)}</span>`}
function retinueView(t){const F=FOLLOWERS,ids=Object.keys(F),have=G.retinue||[],sl=followerSlots(),RI=renownInfo();let list=tavTabs('ret'),detail='',foot='';
 let sel=townSel.ret;if(!F[sel])sel=townSel.ret=have[0]||ids.find(id=>!have.includes(id))||ids[0];
 list+=pnSec('Your retinue',`${have.length} of ${sl} slots`);
 have.forEach(id=>{list+=pnRow({on:`retPick('${id}')`,sel:sel===id,cls:'tw-row ret-row own',lead:folIcon(id),title:F[id].n,sub:`<span class="tw-t0">${F[id].effect}</span>`,right:pnIcon('check')})});
 for(let k=have.length;k<5;k++){const need=RENOWN.findIndex(D=>D.slots>k);list+=`<div class="pn-row static tw-row ret-slot${k<sl?' open':' locked'}"><span class="pn-lead"><span class="fol-por empty">${twIcon(k<sl?'plus':'lock',16)}</span></span><span class="pn-rmain"><span class="pn-rt">${k<sl?'An open slot':'Locked'}</span><span class="pn-rs">${k<sl?'Hire a follower below':`Opens when the company is ${RENOWN[need]?RENOWN[need].n:'Legendary'}`}</span></span></div>`}
 const free=ids.filter(id=>!have.includes(id)).sort((a,b)=>F[a].renown-F[b].renown||F[a].cost-F[b].cost);
 list+=pnSec('For hire',free.length);
 free.forEach(id=>{const f=F[id],lock=RI.tier<f.renown;list+=pnRow({on:`retPick('${id}')`,sel:sel===id,cls:'tw-row ret-row'+(lock?' locked':''),lead:folIcon(id),title:f.n,sub:lock?`<span class="tw-t warn">${pnIcon('lock')}${RENOWN[f.renown-1].n}</span><span class="tw-t0">${f.effect}</span>`:`<span class="tw-t0">${f.effect}</span>`,right:pnCoin(f.cost,G.crowns<f.cost?'short':'')})});
 const f=F[sel],own=have.includes(sel),c=followerCan(sel);
 detail=`${twHead(folIcon(sel,64),own?'In your retinue':'Follower for hire',f.n)}<p class="pn-p">${f.d}</p>
 <div class="ret-eff">${pnIcon('star')}<b>${f.effect}</b></div>
 ${pnFacts([['Price',twIcon('coin',16)+f.cost+' crowns, once'],['Renown needed',twIcon('renown',16)+RENOWN[f.renown-1].n+(RI.tier>=f.renown?'':' <small>(you are '+RI.n+')</small>')],['Slots',`${have.length} of ${sl} taken`],['Wage','None: followers share the company’s table']])}
 <p class="pn-p dim">A follower travels with the wagons and never takes the field. Renown opens more slots: ${RENOWN.map(D=>D.n+' '+D.slots).join(', ')}.</p>`;
 if(own)foot=`<span class="pn-fl"><small>No refund when dismissed</small></span><button type="button" class="pn-btn warn" id="retDismiss" onclick="retDismiss('${sel}')">Dismiss</button>`;
 else foot=`<span class="pn-fl">${pnCoin(f.cost,'big'+(G.crowns<f.cost?' short':''))}<small>${c.ok?'to hire for good':'<em>'+c.why+'</em>'}</small></span><button type="button" class="pn-btn pri${c.ok?'':' off'}" id="retHire" onclick="retHire('${sel}')">Hire</button>`;
 return{list,detail,foot,key:'ret:'+sel}}
function retHire(id){if(!hireFollower(id))return false;toast(FOLLOWERS[id].n+' joins the retinue');renderTown(`<p class="good">${FOLLOWERS[id].n} joins the retinue: ${FOLLOWERS[id].effect}</p>`);save();if(typeof ambNotify==='function')ambNotify();return true}
function retDismiss(id){if(!dismissFollower(id))return false;toast(FOLLOWERS[id].n+' leaves the company');renderTown();save();return true}

/* ---- the tavern's fabled page (21-fabled.js): a named warrior drinking here, what it takes to earn them, the price; hire or duel ---- */
function tavFabled(){if(!G||G.town==null||typeof fabledOffers!=='function')return[];try{return fabledOffers(G.town)||[]}catch(e){return[]}}
function fabledView(t){const L=tavFabled();let sel=townSel.fab;if(!L.some(o=>o.id===sel))sel=townSel.fab=L[0].id;let list=tavTabs('fab');
 list+=pnSec('A legend at the bar','Fabled warriors join only those who earn it');
 for(const o of L){const m=typeof fabledMerc==='function'?fabledMerc(o.id):null,F=o.F||{};
  list+=pnRow({on:`fabPick('${o.id}')`,sel:o.id===sel,cls:'tw-row'+(o.can&&o.can.ok?'':' off'),lead:m?twPortrait(m,32):twIcon('star',32),title:htmlEsc(F.n||o.id),sub:`<span class="tw-line">${htmlEsc(F.title||'')}</span><span class="tw-line ${o.earn&&o.earn.ok?'good':'dim'}">${htmlEsc(o.earn?o.earn.text:'')}</span>`,right:pnCoin(o.cost,G.crowns<o.cost?'short':'')})}
 const o=L.find(x=>x.id===sel),F=o.F||{},m=typeof fabledMerc==='function'?fabledMerc(o.id):null,s=m?calc(m):null;
 let detail=`${twHead(m?twPortrait(m,64):twIcon('star',48),`Fabled · ${htmlEsc(F.title||'')}`,htmlEsc(F.n||o.id))}<p class="pn-p">${htmlEsc(F.legend||'')}</p>${m&&s?statGrid(m,s):''}
  ${pnHead('To earn them')}<p class="pn-p ${o.earn&&o.earn.ok?'good':''}">${htmlEsc(o.earn?o.earn.text:'')}</p>${o.can&&!o.can.ok&&o.can.why?`<p class="pn-p bad">${htmlEsc(o.can.why)}</p>`:''}
  ${pnHead('Terms')}${pnFacts([['Signing',`${o.cost} crowns`],['Wage',`${o.wage} a day`]])}`;
 const du=typeof fabledDuelCan==='function'?fabledDuelCan(o.id):{ok:false},foot=`<div class="row">${du.ok?`<button onclick="fabDuel('${o.id}')">${twIcon('swords',16)}<span>Challenge to a duel</span></button>`:''}<button class="pri" style="flex:1" ${o.can&&o.can.ok&&G.crowns>=o.cost?'':'disabled'} onclick="fabHire('${o.id}')">${twIcon('star',16)}<span>Hire for ${o.cost}</span></button></div>`;
 return{list,detail,foot,key:'fab:'+sel}}
function fabPick(id){townSel.fab=id;renderTown(townNote)}
function fabHire(id){if(typeof fabledJoin!=='function')return;const m=fabledJoin(id);if(!m){toast('Not yet');return}toast(`${m.name} joins the company`);renderTown();save()}
function fabDuel(id){if(typeof fabledDuel!=='function')return;if(typeof closeSheet==='function')closeSheet(true);if(!fabledDuel(id))toast(typeof fabledDuelCan==='function'?fabledDuelCan(id).why||'No duel':'No duel')}
