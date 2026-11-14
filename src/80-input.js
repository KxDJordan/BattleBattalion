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
 else if(k.type==='band'){const o=k.o;if(typeof partyHostile==='function'&&typeof attackParty==='function'&&!partyHostile(o)&&Math.hypot(o.x-p.x,o.y-p.y)<TS*1.6)bandSheet(o);else goTo(o.x,o.y)}
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

/* a neutral caravan or patrol close by: say who they are, what attacking them costs, and let the player choose (world agent's attackParty) */
function bandSheet(o){if(typeof sheet!=='function')return;const lab=typeof partyLabel==='function'?partyLabel(o):(FACT[o.f]?FACT[o.f].n:'A band'),car=o.goal==='caravan',fn=typeof lkFacName==='function'?lkFacName(o.f):o.f,rt=typeof lkRepTier==='function'?lkRepTier(o.f):null,cost=car?18:12;
 const war=Array.isArray(G.houses)&&o.f!=='free'&&typeof atWar==='function'?G.houses.filter(h=>h.id!==o.f&&atWar(h.id,o.f)).map(h=>h.n):[];
 sheet(`<h2>${htmlEsc(lab)}</h2><p>${car?'Wagons, oxen and a few hired guards. They pass you with a nod.':'Riders in their lord\u2019s colours. They watch you, but keep to the road.'}</p>
 <p class="dim">Standing with ${htmlEsc(fn)}: ${rt?htmlEsc(rt.n):'neutral'}. Attacking costs about <b>${cost}</b> standing${car&&o.cargo&&o.cargo.crowns?`; the cargo is worth about ${Math.round(o.cargo.crowns)} crowns`:''}${war.length?`, and earns a little with ${htmlEsc(war.join(' and '))}, at war with them`:''}.</p>
 <div class="row"><button class="warn" onclick="closeSheet();attackParty(${o.id})">Attack</button><button class="pri" onclick="closeSheet()">Let them pass</button></div>`)}