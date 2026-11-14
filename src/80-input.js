/* ================= INPUT =================
   Pointer gestures on the scene canvas: tap, one-finger drag pan, two-finger pan + pinch zoom (anchored at
   the midpoint), long-press inspect, mouse wheel zoom, hover path preview. Multi-pointer safe.
   Zoom is pixel-perfect in battle and on the world map: a pinch zooms freely and snaps to a whole scale on release,
   the wheel and +/- step one scale at a time. Q / E turn the battle view a quarter, H toggles the heights overlay, B the allies' bars.
   Battle taps carry whether they came from a finger: touch always plans a move before making it (two-tap movement).
   World taps: a town, rift, lair, band, ruin or open ground marches there (worldTap); unexplored ground only when the
   way to it runs over known land (worldGo).
   Public: zoomAt(sx,sy,f) panBy(dx,dy) wireMinimap(el) resetPointers() worldTap(wx,wy) worldGo(wx,wy,dest) */
const PT=new Map();let GS=null,lpT=0;
const SLOP_TOUCH=10,SLOP_MOUSE=4,LONG_MS=430;
function resetPointers(){PT.clear();clearTimeout(lpT);GS=null;WV.hold=false;if(mode==='world')worldZoomSnap();if(B&&B.cam){B.cam.hold=false;if(mode==='battle')zoomSnap()}setHoverTile(-1)}
function panBy(dx,dy){if(mode==='battle'&&B){const c=B.cam;c.x-=dx/c.z;c.y-=dy/c.z;c.tx=c.x;c.ty=c.y;c.ut=now;clampCam(c);c.ltx=c.tx;c.lty=c.ty}
 else if(mode==='world'&&G)worldPan(dx,dy)}
function zoomAt(sx,sy,f){if(!(f>0)||!isFinite(f))return;
 if(mode==='battle'&&B)zoomFree(sx,sy,f);
 else if(mode==='world'&&G)worldZoomFree(sx,sy,f)}
/* ---- world marching ---- */
const WFRINGE=3;      // how many unexplored tiles a march may end in (the dark just past the edge of the known land)
// March to open ground. Unexplored ground is allowed only when the way there runs over known land; the route is planned
// first, so a refusal never tells the player what the dark hides.
function worldGo(wx,wy,dest){if(!G||!W)return false;
 if(!dest&&!worldSeen(wx,wy)){let path=null;
  if(okAt(wx,wy)){if(typeof routeTo==='function'){const r=routeTo(wx,wy);path=r&&r.path}else path=findPath(Math.floor(G.p.x/TS),Math.floor(G.p.y/TS),Math.floor(wx/TS),Math.floor(wy/TS))}
  let dark=0;if(path)for(const s of path)if(!worldSeen(s.x,s.y))dark++;
  if(!path||dark>WFRINGE){toast('Unexplored: no known way there');return false}}
 return goTo(wx,wy,dest)!==false}
function worldTap(wx,wy){const k=worldPick(wx,wy,true);if(!k)return;const p=G.p,at=(x,y)=>Math.hypot(x-p.x,y-p.y)<TS*.12;
 if(k.type==='town'){const t=k.o;if(at(t.x,t.y))openTown(k.i);else goTo(t.x,t.y,{type:'town',i:k.i})}
 else if(k.type==='portal'){const q=k.o;if(at(q.x,q.y))portalSheet(q.id);else goTo(q.x,q.y,{type:'portal',id:q.id})}
 else if(k.type==='lair'||k.type==='nest')goTo(k.o.x,k.o.y);
 else if(k.type==='band'){const o=k.o;if(o.goal==='merc'&&Math.hypot(o.x-p.x,o.y-p.y)<TS*1.6&&typeof lkRival==='function'&&lkRival(o.f)){rivalSheet(o);return}if(typeof partyHostile==='function'&&typeof attackParty==='function'&&!partyHostile(o)&&Math.hypot(o.x-p.x,o.y-p.y)<TS*1.6)bandSheet(o);else goTo(o.x,o.y)}
 else if(k.type==='site'){const o=k.o;if(at(o.x,o.y)&&typeof siteSheet==='function')siteSheet(o.id);else goTo(o.x,o.y,{type:'site',id:o.id})}
 else if(k.type==='company'){for(let i=0;i<G.towns.length;i++)if(at(G.towns[i].x,G.towns[i].y)){openTown(i);return}if(G.moving){G.moving=false;if(G.route)G.route=[]}}
 else worldGo(wx,wy)}
function sceneTap(x,y,touch){if(sheetOpen)return;
 if(mode==='battle'&&B){const p=boardXY(x,y);battleTap(p.x,p.y,!!touch)}
 else if(mode==='world'&&G){const w=worldXY(x,y);worldTap(w.x,w.y)}}
function hoverAt(x,y){if(mode==='battle'&&B&&!B.busy&&!sheetOpen){const p=boardXY(x,y);setHoverTile(pickAtBoard(p.x,p.y))}else setHoverTile(-1)}
function pinchState(){let a=null,b=null;for(const p of PT.values()){if(!a)a=p;else if(!b){b=p;break}}GS.pd=Math.hypot(a.x-b.x,a.y-b.y);GS.mx=(a.x+b.x)/2;GS.my=(a.y+b.y)/2}
function holdCam(on){WV.hold=on;if(B&&B.cam)B.cam.hold=on}
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0){if(e.button===2&&!sheetOpen)inspectAt(e.clientX,e.clientY,false);return}
 try{cv.setPointerCapture(e.pointerId)}catch(err){}
 PT.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(PT.size===1){const shown=Inspect.visible;Inspect.hide();clearTimeout(lpT);
  GS={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),moved:false,multi:false,long:false,eat:shown,touch:e.pointerType!=='mouse',pd:0,mx:0,my:0};
  if(GS.touch&&!shown)hoverAt(e.clientX,e.clientY);
  lpT=setTimeout(()=>{if(GS&&!GS.moved&&!GS.multi&&PT.size===1&&!sheetOpen){GS.long=true;setHoverTile(-1);if(inspectAt(GS.x,GS.y,GS.touch)){try{if(navigator.vibrate)navigator.vibrate(8)}catch(err){}}}},LONG_MS)}
 else if(GS){GS.multi=true;GS.moved=true;clearTimeout(lpT);Inspect.hide();setHoverTile(-1);if(PT.size===2){pinchState();holdCam(true)}}});
cv.addEventListener('pointermove',e=>{const p=PT.get(e.pointerId);
 if(!p){if(e.pointerType==='mouse'&&!GS)hoverAt(e.clientX,e.clientY);return}
 const ox=p.x,oy=p.y;p.x=e.clientX;p.y=e.clientY;if(!GS)return;
 if(PT.size>=2){const pd=GS.pd,mx=GS.mx,my=GS.my;pinchState();if(pd>8&&GS.pd>8)zoomAt(GS.mx,GS.my,GS.pd/pd);panBy(GS.mx-mx,GS.my-my);return}
 if(!GS.moved&&Math.hypot(p.x-GS.x,p.y-GS.y)>(GS.touch?SLOP_TOUCH:SLOP_MOUSE)){if(GS.long){GS.x=p.x;GS.y=p.y;inspectAt(p.x,p.y,GS.touch);return}   // scrub the inspect card
  GS.moved=true;clearTimeout(lpT);setHoverTile(-1);holdCam(true);return}                // swallow the slop so the pan starts without a jump
 if(GS.moved&&!GS.long)panBy(p.x-ox,p.y-oy)});
function pointerEnd(e,cancel){if(!PT.has(e.pointerId))return;PT.delete(e.pointerId);try{cv.releasePointerCapture(e.pointerId)}catch(err){}
 const s=GS;if(!s)return;
 if(PT.size>=2){pinchState();return}
 if(PT.size===1){return}                                   // one finger left after a pinch: carries on as a pan, never a tap
 GS=null;clearTimeout(lpT);holdCam(false);if(s.touch)setHoverTile(-1);if(s.multi){if(mode==='battle')zoomSnap();else if(mode==='world')worldZoomSnap()}
 if(s.long){Inspect.release();return}
 if(cancel||s.moved||s.multi||s.eat||e.pointerId!==s.id)return;
 sceneTap(e.clientX,e.clientY,s.touch)}
cv.addEventListener('pointerup',e=>pointerEnd(e,false));
cv.addEventListener('pointercancel',e=>pointerEnd(e,true));
cv.addEventListener('lostpointercapture',e=>{if(PT.has(e.pointerId))pointerEnd(e,true)});
cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!GS)setHoverTile(-1)});
cv.addEventListener('contextmenu',e=>e.preventDefault());
const WH={acc:0,t:0};
cv.addEventListener('wheel',e=>{e.preventDefault();if(sheetOpen)return;Inspect.hide();const d=e.deltaMode===1?e.deltaY*32:e.deltaMode===2?e.deltaY*300:e.deltaY;
 const bat=mode==='battle'&&B;if(!bat&&!(mode==='world'&&G))return;const t=performance.now();if(t-WH.t>260)WH.acc=0;WH.t=t;WH.acc+=d;
 if(Math.abs(WH.acc)>=50){if(bat)zoomStep(WH.acc<0?1:-1,e.clientX,e.clientY);else worldZoomStep(WH.acc<0?1:-1,e.clientX,e.clientY);WH.acc=0}},{passive:false});   // one notch, one whole scale
window.addEventListener('blur',resetPointers);
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetPointers();Inspect.hide()}});
document.addEventListener('gesturestart',e=>e.preventDefault());
window.addEventListener('keydown',e=>{if(e.key==='Escape'){Inspect.hide();if(mode==='battle'&&B&&typeof planClear==='function'&&planClear()&&typeof updateBUI==='function')updateBUI();return}if(sheetOpen||e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target,tn=t&&t.tagName,k=e.key,bat=mode==='battle'&&B;if(tn==='INPUT'||tn==='TEXTAREA'||tn==='SELECT')return;
 if(k==='+'||k==='='){if(bat)zoomStep(1);else if(mode==='world'&&G)worldZoomStep(1)}else if(k==='-'||k==='_'){if(bat)zoomStep(-1);else if(mode==='world'&&G)worldZoomStep(-1)}
 else if(bat&&(k==='q'||k==='Q'))rotateView(-1);else if(bat&&(k==='e'||k==='E'))rotateView(1);else if(bat&&(k==='h'||k==='H'))toggleHeights();else if(bat&&(k==='b'||k==='B')&&typeof toggleAllyBars==='function')toggleAllyBars()});
window.addEventListener('resize',resize);
/* minimap: tap (or drag) marches there */
function wireMinimap(el){let d=null;el.style.touchAction='none';
 el.addEventListener('pointerdown',e=>{d={x:e.clientX,y:e.clientY,id:e.pointerId};e.stopPropagation()});
 el.addEventListener('pointerup',e=>{const s=d;d=null;if(!s||s.id!==e.pointerId||sheetOpen||mode!=='world'||!G||Math.hypot(e.clientX-s.x,e.clientY-s.y)>12)return;const w=minimapToWorld(el,e.clientX,e.clientY);if(w){Inspect.hide();worldGo(w.x,w.y)}});
 el.addEventListener('pointercancel',()=>{d=null})}

/* ---- caravan cargo: the world agent's p.cargo {good, crowns, items:[ids], food, tools, salves, parts:{k:n}, trade:[...]} as rows with icons ---- */
function lkIc(n,sz){return typeof pnIcon==='function'?pnIcon(n,'',sz||32):typeof pxIcon==='function'?pxIcon(n,sz||32):''}
function lkCargoList(c){const L=[];if(!c||typeof c!=='object')return L;const num=v=>Math.max(0,Math.round(+v||0));
 if(num(c.crowns))L.push({ic:lkIc('coin'),t:'Crowns',n:num(c.crowns),k:'coin'});
 if(num(c.food))L.push({ic:lkIc('food'),t:'Rations',n:num(c.food),k:'food'});
 if(num(c.tools))L.push({ic:lkIc('tools'),t:'Tools',n:num(c.tools),k:'tools'});
 if(num(c.salves))L.push({ic:lkIc('salve'),t:num(c.salves)===1?'Salve':'Salves',n:num(c.salves),k:'salve'});
 if(c.parts&&typeof c.parts==='object')for(const k in c.parts){const n=num(c.parts[k]);if(n)L.push({ic:lkIc('part-'+k),t:typeof PARTS==='object'&&PARTS[k]?PARTS[k].n:k,n,k:'part'})}
 const grp=new Map(),add=(id,n,name,v)=>{const key=id||name;const e=grp.get(key);if(e){e.n+=n;return}grp.set(key,{id,n,name,v})};
 if(Array.isArray(c.trade))for(const x of c.trade){if(typeof x==='string')add(ITEMS[x]?x:null,1,x,0);else if(Array.isArray(x))add(ITEMS[x[0]]?x[0]:null,num(x[1])||1,x[0],0);
  else if(x&&typeof x==='object'){const id=[x.id,x.k,x.item,x.n].find(v=>typeof v==='string'&&ITEMS[v])||null;add(id,num(x.c||x.q||x.count||x.qty)||1,x.name||x.n||id,+x.v||0)}}
 grp.forEach(e=>{const it=e.id&&ITEMS[e.id],v=e.v||(it?+(it.price||it.v||0):0);L.push({ic:it&&typeof pnItemIcon==='function'?pnItemIcon(e.id,32):lkIc('tg'),t:it?it.n:String(e.name||'Trade goods'),n:e.n,sub:'Trade good'+(v?' · '+Math.round(v)+' crowns each':''),k:'trade'})});
 if(Array.isArray(c.items)){const gi=new Map();for(const id of c.items)if(ITEMS[id])gi.set(id,(gi.get(id)||0)+1);
  gi.forEach((n,id)=>L.push({ic:typeof pnItemIcon==='function'?pnItemIcon(id,32):lkIc('stash'),t:typeof pnItemName==='function'?pnItemName(id):ITEMS[id].n,n,sub:typeof itemKind==='function'?itemKind(id):'',k:'item'}))}
 return L}
function lkCargoHTML(c,cls){const L=lkCargoList(c);if(!L.length){const t=typeof cargoText==='function'?(()=>{try{return cargoText(c)}catch(e){return''}})():'';return t?`<p class="pn-p">${htmlEsc(t)}</p>`:''}
 return`<div class="cg-list${cls?' '+cls:''}">${L.map(x=>`<div class="cg-row k-${x.k}">${x.ic}<span><b>${x.t}</b>${x.sub?`<small>${x.sub}</small>`:''}</span><i>${x.n>1||x.k!=='item'?'×'+x.n:''}</i></div>`).join('')}</div>`}

/* a neutral caravan or patrol close by: say who they are, what they carry, what attacking them costs, and let the player choose (world agent's attackParty) */
function bandSheet(o){if(typeof sheet!=='function')return;if(o&&o.goal==='merc'){rivalSheet(o);return}
 const lab=typeof partyLabel==='function'?partyLabel(o):(FACT[o.f]?FACT[o.f].n:'A band'),car=o.goal==='caravan',fn=typeof lkFacName==='function'?lkFacName(o.f):o.f,rt=typeof lkRepTier==='function'?lkRepTier(o.f):null,cost=car?18:12;
 const war=Array.isArray(G.houses)&&o.f!=='free'&&typeof atWar==='function'?G.houses.filter(h=>h.id!==o.f&&atWar(h.id,o.f)).map(h=>h.n):[],hb=typeof lkHouse==='function'?lkHouse(o.f):null;
 const cg=car&&o.cargo?lkCargoHTML(o.cargo):'',gd=car&&o.cargo&&typeof GOODS==='object'&&GOODS[o.cargo.good]?GOODS[o.cargo.good]:null;
 sheet(`<div class="bs-hd">${hb&&typeof bannerHTML==='function'?bannerHTML({name:hb.n,c1:hb.c1,c2:hb.c2,emblem:hb.emblem},64):lkIc(car?'goal-caravan':'goal-patrol',48)}<div><div class="pn-kick">${car?'Caravan':'Patrol'} · ${htmlEsc(fn)}</div><h2>${htmlEsc(lab)}</h2>
 <p>${car?'Wagons, oxen and a few hired guards. They pass you with a nod.':'Riders in their lord’s colours. They watch you, but keep to the road.'}</p></div></div>
 ${car?`<div class="pn-sech"><span>The cargo${gd?' · '+htmlEsc(gd.n):''}</span></div>${cg||'<p class="pn-p dim">Nothing you can see from the road.</p>'}<p class="pn-p dim">Beat the guards and all of it is yours${typeof cargoValue==='function'?`: worth about <b>${cargoValue(o.cargo)}</b> crowns in all`:''}.</p>`:''}
 <p class="bs-cost">${lkIc('rep-hostile',16)}<span>Standing with ${htmlEsc(fn)}: <b>${rt?htmlEsc(rt.n):'neutral'}</b>. Attacking costs about <b>${cost}</b> standing${war.length?`, and earns a little with ${htmlEsc(war.join(' and '))}, at war with them`:''}.</span></p>
 <div class="row"><button class="warn" onclick="closeSheet();attackParty(${o.id})">${lkIc('swords',16)}Attack</button><button class="pri" onclick="closeSheet()">Let them pass</button></div>`,'bs')}

/* ---- meeting a rival company on the road (world agent's rivalParley(p) / rivalParleyDo(p,k)) ----
   The sheet: their banner, name, personality, renown, swords (portraits of the best), strength against the company, your standing
   with them on the tier bar, then the parley options with their stated costs and odds, and an attack that asks to be confirmed. */
const RVS={p:null};
function rvOpts(P){const A=Array.isArray(P)?P:P&&(P.opts||P.options||P.o)||[];return A.filter(o=>o&&(o.k||o.id)).map(o=>{const k=String(o.k||o.id),odds=o.odds!=null?+o.odds:o.chance!=null?+o.chance:null;
 return{k,n:String(o.n||o.t||o.label||k),d:String(o.d||o.desc||o.text||''),cost:o.cost!=null?o.cost:o.price!=null?o.price:null,odds:odds==null||!isFinite(odds)?null:Math.round(odds<=1?odds*100:odds),ok:o.ok!==false&&!o.off&&!o.lock&&!o.locked,m:o.m,why:o.why||o.reason||'',fight:!!o.fight||/^(fight|attack|ambush|challenge)$/.test(k),icon:o.icon||null}})}
function rvOptLead(o,r){if(o.k==='hire'&&o.m!=null&&r&&Array.isArray(r.roster)&&typeof portraitHTML==='function'){const m=r.roster.find(x=>x&&x.id===o.m);if(m)return portraitHTML(m,32)}return lkIc(rvOptIcon(o),32)}
function rvOptIcon(o){if(o.icon&&typeof icHas==='function'&&icHas(o.icon))return o.icon;const k=o.k;return o.fight?'swords':/news|intel|trade/.test(k)?'info':/hire|sword|buy.?sword/.test(k)?'tavern':/bribe|buy|pay|off/.test(k)?'coin':/leave|pass|go|ride/.test(k)?'back':/insult|taunt|threat/.test(k)?'rep-hostile':'parley'}
function rvMercLine(r,n){const R=Array.isArray(r.roster)?r.roster.filter(Boolean).slice():[],lv=m=>+m.lvl||+m.lv||+m.level||1;R.sort((a,b)=>lv(b)-lv(a));
 return R.slice(0,n).map(m=>`<span class="rv-m" title="${htmlEsc((m.name||'')+', level '+lv(m)+(typeof BG==='object'&&BG[m.bg]?' '+BG[m.bg].n.toLowerCase():''))}">${typeof portraitHTML==='function'?portraitHTML(m,32):''}<b>${lv(m)}</b></span>`).join('')+(R.length>n?`<span class="rv-more">+${R.length-n}</span>`:'')}
function rvJob(r){if(typeof rivalJob==='function'){try{return String(rivalJob(r))}catch(e){}}return r.alive===false?'Wiped out':''}
function rvHeader(r,big){const P=lkRivalPers(r),T=lkRivalTier(r),job=rvJob(r);
 return`<div class="rv-hd">${rivalBannerHTML(r,big||64)}<div><div class="pn-kick" title="${htmlEsc(P.d)}">${lkIc(P.icon,16)}${htmlEsc(P.n)} · ${htmlEsc(T.n)}${typeof r.renown==='number'?' · renown '+Math.round(r.renown):''}</div><h2>${htmlEsc(r.n||lkRivalName(r))}</h2>${job?`<p class="rv-job">${htmlEsc(job)}.</p>`:''}<p class="rv-pd">${htmlEsc(P.d)}</p></div></div>`}
function rvStrHTML(r,P){const s=P&&P.str!=null?+P.str:lkRivalStr(r),n=P&&P.swords!=null?+P.swords:P&&P.seen!=null?+P.seen:lkRivalSwords(r),me=G&&G.roster?G.roster.length:0,cl=s<=1?'weak':s>=3?'strong':'even';
 return`<div class="rv-str ${cl}"><span>${lkIc('swords',16)}<b>${n}</b> sword${n===1?'':'s'} against your ${me}</span><span class="rv-sw">${lkStrWord(s)}</span></div>`}
function rivalSheet(p,note){if(typeof sheet!=='function'||!p)return;const r=lkRival(p.f);if(!r){bandSheetPlain(p);return}RVS.p=p;
 let P=null;if(typeof rivalParley==='function'){try{P=rivalParley(p)}catch(e){P=null}}const O=rvOpts(P);
 const st=typeof fxuBar==='function'?`<div class="rv-stand">${typeof fxuTierChip==='function'?fxuTierChip(r.id):''}<b>${lkRivalStance(r)>0?'+':''}${lkRivalStance(r)}</b>${fxuBar(r.id)}</div>`:'';
 const nonFight=O.filter(o=>!o.fight&&o.k!=='leave'&&!(P&&P.hostile&&!o.ok)),leave=O.find(o=>o.k==='leave');
 const btn=o=>`<button type="button" class="rv-opt${o.ok?'':' off'}"${o.ok?'':' aria-disabled="true"'} onclick="${o.ok?`rvDo('${o.k.replace(/'/g,'')}')`:''}">${rvOptLead(o,r)}<span><b>${htmlEsc(o.n)}</b>${o.d?`<small>${htmlEsc(o.d)}</small>`:''}${!o.ok&&o.why?`<em>${htmlEsc(o.why)}</em>`:''}</span>${o.cost!=null&&o.cost!==0?`<i class="rv-c">${typeof o.cost==='number'?lkIc('coin',16)+o.cost:htmlEsc(o.cost)}</i>`:''}${o.odds!=null?`<i class="rv-o">${o.odds}%</i>`:''}</button>`;
 sheet(`${rvHeader(r)}${note?`<p class="rv-note">${htmlEsc(note)}</p>`:P&&P.hostile?`<p class="rv-note warn">${lkIc('rep-hostile',16)}They mean to fight. Buy them off or stand your ground.</p>`:''}
 <div class="rv-grid"><div class="rv-col">${rvStrHTML(r,P)}<div class="rv-ms">${rvMercLine(r,6)}</div></div><div class="rv-col"><div class="pn-sech"><span>Their stance toward you</span></div>${st}</div></div>
 <div class="pn-sech"><span>Parley</span></div><div class="rv-opts">${nonFight.map(btn).join('')||'<p class="pn-p dim">They have nothing to say to you.</p>'}</div>
 <div class="row"><button class="warn" onclick="rvAttackAsk()">${lkIc('swords',16)}Fight them</button>${P&&P.hostile||leave&&!leave.ok?'':`<button class="pri" onclick="${leave?`rvDo('leave')`:'closeSheet()'}">${leave?htmlEsc(leave.n):'Ride on'}</button>`}</div>`,'rv')}
function bandSheetPlain(o){sheet(`<h2>${htmlEsc(typeof partyLabel==='function'?partyLabel(o):'A company of swords')}</h2><p>Armed riders under a banner you do not know.</p><div class="row"><button class="warn" onclick="closeSheet();attackParty(${o.id})">Attack</button><button class="pri" onclick="closeSheet()">Ride on</button></div>`)}
function rvDo(k){const p=RVS.p;if(!p)return;let res=null;if(typeof rivalParleyDo==='function'){try{res=rivalParleyDo(p,k)}catch(e){res={text:'They will not hear it.'}}}
 if(res&&res.fight){closeSheet();G.moving=false;G.route=[];if(res.text&&typeof toast==='function')toast(res.text);if(typeof engage==='function')engage(res.fight);else if(typeof startBattle==='function')startBattle(res.fight);return}   // the parley turned into a fight
 if(k==='leave'&&res){closeSheet();if(res.text&&typeof toast==='function')toast(res.text);return}
 const txt=typeof res==='string'?res:res&&(res.text||res.t||res.msg)||'';if(res&&res.close){closeSheet();if(txt&&typeof toast==='function')toast(txt);return}
 if(!G.parties.includes(p)){closeSheet();if(txt&&typeof toast==='function')toast(txt);return}   // they rode off (bought off, parted ways)
 rivalSheet(p,txt||null);if(typeof save==='function')try{save()}catch(e){}}
/* the fight, confirmed: each way to start it (the world's 'challenge' and 'attack') with what it costs, and what a win brings */
function rvAttackAsk(){const p=RVS.p,r=p&&lkRival(p.f);if(!r)return;let P=null;if(typeof rivalParley==='function'){try{P=rivalParley(p)}catch(e){}}const F=rvOpts(P).filter(o=>o.fight),pers=lkRivalPers(r);
 const opt=o=>`<button type="button" class="rv-opt ${o.ok?'warn':'off'}"${o.ok?'':' aria-disabled="true"'} onclick="${o.ok?`rvDo('${o.k.replace(/'/g,'')}')`:''}">${lkIc(o.k==='challenge'?'banner':'swords',32)}<span><b>${htmlEsc(o.n)}</b>${o.d?`<small>${htmlEsc(o.d)}</small>`:''}${!o.ok&&o.why?`<em>${htmlEsc(o.why)}</em>`:''}</span></button>`;
 const L=['Win: some of their gear (worn), a share of their purse and renown. A beaten sword may ask to join you.','They fight as mercenaries do: they can rout, and the wounded keep their scars.'];
 if(pers.k==='honour')L.unshift('They are honourable: they keep a watch and cannot be taken unawares, but they accept an open challenge.');
 sheet(`${rvHeader(r,64)}${rvStrHTML(r,P)}<div class="pn-sech"><span>Fight ${htmlEsc(lkRivalShort(r))}</span></div>
 <div class="rv-opts">${F.length?F.map(opt).join(''):`<button type="button" class="rv-opt warn" onclick="rvAttackGo()">${lkIc('swords',32)}<span><b>Attack</b><small>Fall on them.</small></span></button>`}</div>
 <ul class="rv-ul">${L.map(x=>`<li>${x}</li>`).join('')}</ul>
 <div class="row"><button onclick="rivalSheet(RVS.p)">${lkIc('back',16)}Back to the parley</button></div>`,'rv')}
function rvAttackGo(){const p=RVS.p;if(!p)return;closeSheet();if(typeof attackParty==='function')attackParty(p.id)}
