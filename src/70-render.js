/* ================= RENDER =================
   Scene agent. Canvas fills the viewport; scenes are centered/fitted to SR (= Layout.scene).
   Public: resize() layoutBattle() onLayoutChange() drawWorld() drawBattle() drawMinimap() frame()
           boardXY(sx,sy) worldXY(sx,sy) tileAtBoard(bx,by) unitAtBoard(bx,by) pickAtBoard(bx,by) setHoverTile(k)
           VIEW rotateView(dir) toggleHeights() tpos(c,r,h) screenDir(dc,dr) artScale() zoomStep(dir,sx,sy)
           worldArtScale() worldCenterOn(wx,wy) worldPick(wx,wy) worldSeen(wx,wy) worldVisible(wx,wy) worldReadout()
           PERF SR VC wcam (CSS px origin + scale of the world view; read only) camOff (zero = the camera follows the company) */
const cv=$('cv'),g=cv.getContext('2d',{alpha:false});
let cw=0,ch=0,dpr=1,now=0,VC={x:0,y:0},wcam={x:0,y:0,z:1};const camOff={x:0,y:0};
const SR={x:0,y:0,w:1,h:1};                                   // scene rect in CSS px
const PERF={q:1,bn:0,wn:0,ft:16.7,draw:0,acc:0,n:0,good:0,lock:false};  // adaptive resolution + timings
let reduced=false,lastMode='';
try{const mq=window.matchMedia('(prefers-reduced-motion: reduce)');reduced=mq.matches;const f=e=>{reduced=e.matches};if(mq.addEventListener)mq.addEventListener('change',f);else if(mq.addListener)mq.addListener(f)}catch(e){}
const lerp=(a,b,t)=>a+(b-a)*t;
function mixHex(a,b,t){const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);return`rgb(${lerp(x>>16,y>>16,t)|0},${lerp(x>>8&255,y>>8&255,t)|0},${lerp(x&255,y&255,t)|0})`}
function hash2(c,r,i){let n=Math.imul(c+1,374761393)+Math.imul(r+1,668265263)+Math.imul(i+1,1274126177)|0;n=Math.imul(n^n>>>13,1274126177);return((n^n>>>16)>>>0)/4294967296}
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w|0);c.height=Math.max(1,h|0);return c}
function rrect(q,x,y,w,h,r){q.beginPath();q.moveTo(x+r,y);q.lineTo(x+w-r,y);q.arcTo(x+w,y,x+w,y+r,r);q.lineTo(x+w,y+h-r);q.arcTo(x+w,y+h,x+w-r,y+h,r);q.lineTo(x+r,y+h);q.arcTo(x,y+h,x,y+h-r,r);q.lineTo(x,y+r);q.arcTo(x,y,x+r,y,r);q.closePath()}

/* ---- glow / shadow / vignette sprites (pre-rendered, no per-frame gradients) ---- */
const GLOW={};
function glowSprite(col){let s=GLOW[col];if(s)return s;s=mkCanvas(64,64);const q=s.getContext('2d'),gr=q.createRadialGradient(32,32,0,32,32,32);
 gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,255,255,.55)');gr.addColorStop(.6,'rgba(255,255,255,.14)');gr.addColorStop(1,'rgba(255,255,255,0)');
 q.fillStyle=gr;q.fillRect(0,0,64,64);q.globalCompositeOperation='source-in';q.fillStyle=col;q.fillRect(0,0,64,64);GLOW[col]=s;return s}
function drawGlow(col,x,y,rx,ry,a){g.globalAlpha=a;g.drawImage(glowSprite(col),x-rx,y-ry,rx*2,ry*2)}
let SHADOW=null;
function shadowSprite(){if(SHADOW)return SHADOW;SHADOW=mkCanvas(64,64);const q=SHADOW.getContext('2d'),gr=q.createRadialGradient(32,32,4,32,32,32);gr.addColorStop(0,'rgba(4,10,12,.62)');gr.addColorStop(.55,'rgba(4,10,12,.34)');gr.addColorStop(1,'rgba(4,10,12,0)');q.fillStyle=gr;q.fillRect(0,0,64,64);return SHADOW}
// The vignette is a DOM layer just above the canvas (styled in inspect.css): the compositor blends it for free,
// where a full-screen alpha blit on the canvas every frame costs real fill rate on phones.
const VIG={el:null,a:-1};
function drawVignette(a){if(!VIG.el){const e=document.createElement('div');e.id='sceneVig';e.setAttribute('aria-hidden','true');cv.insertAdjacentElement('afterend',e);VIG.el=e}
 if(Math.abs(a-VIG.a)>.015){VIG.a=a;VIG.el.style.opacity=a.toFixed(2)}}

/* ---- canvas size, scene rect, adaptive resolution ---- */
// Title: at most 2x, scaled by the adaptive quality. Battle and world: the real device ratio divided by a whole number
// (so one backing pixel is a whole number of device pixels and the pixelated upscale stays exact), 2x at most.
function setRes(){const real=window.devicePixelRatio||1,wld=typeof mode!=='undefined'&&mode==='world',bat=wld||(typeof mode!=='undefined'&&mode==='battle');
 if(bat){let n=Math.max(1,Math.ceil(real/2-1e-6))+(wld?PERF.wn:PERF.bn);while(n>1&&real/n<.74)n--;dpr=real/n}else{const base=Math.min(2,real);dpr=Math.max(Math.min(1,base),base*PERF.q)}
 cw=window.innerWidth;ch=window.innerHeight;if(cv.style)cv.style.imageRendering=bat?'pixelated':'';
 const w=Math.round(cw*dpr),h=Math.round(ch*dpr);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}}
function refreshScene(){let x=0,y=0,w=cw,h=ch;
 if(typeof Layout!=='undefined'&&Layout&&Layout.scene&&Layout.scene.w>40&&Layout.scene.h>40){const s=Layout.scene;x=s.x;y=s.y;w=s.w;h=s.h}
 else{const top=$(mode==='battle'?'bTop':'hud'),bot=$(mode==='battle'?'bBot':'wbar');   // legacy portrait bars, only until chrome's Layout lands
  if(top&&!top.classList.contains('hidden')){const b=top.getBoundingClientRect().bottom;if(b>0&&b<ch*.4){y=b-10;h-=y}}
  if(bot&&!bot.classList.contains('hidden')){const t=bot.getBoundingClientRect().top;if(t>ch*.5&&t<ch)h=t+8-y}}
 SR.x=x;SR.y=y;SR.w=Math.max(40,w);SR.h=Math.max(40,h);VC.x=SR.x+SR.w/2;VC.y=SR.y+SR.h/2}
function resize(){setRes();refreshScene();if(B&&mode==='battle')fitBattle(true)}
function onLayoutChange(){if(window.innerWidth!==cw||window.innerHeight!==ch)setRes();refreshScene();if(B&&mode==='battle')fitBattle(false)}
function perfTick(raw){if(raw<=0||raw>250||document.hidden)return;PERF.ft+=(raw-PERF.ft)*.05;if(raw>20)PERF.acc++;if(++PERF.n<120)return;const slow=PERF.acc/PERF.n;PERF.acc=0;PERF.n=0;
 if(mode==='battle'){if(slow>.4&&B&&B.cam){const d0=dpr;PERF.bn++;setRes();if(dpr===d0)PERF.bn--;else fitBattle(false)}return}   // battle: halve the backing store instead, pixels stay whole
 if(mode==='world'){if(slow>.4){const d0=dpr;PERF.wn++;setRes();if(dpr===d0)PERF.wn--}return}                                        // world: the same (the camera refits itself when dpr changes)
 // step the backing-store resolution down when most frames miss 60 Hz; creep back up once after a long clean run
 if(slow>.4&&PERF.q>.5){if(PERF.up)PERF.lock=true;PERF.up=false;PERF.q=Math.max(.5,PERF.q-.15);PERF.good=0;setRes()}
 else if(slow<.08&&PERF.q<1&&!PERF.lock){if(++PERF.good>=6){PERF.good=0;PERF.up=true;PERF.q=Math.min(1,PERF.q+.15);setRes()}}else if(slow>=.08)PERF.good=0}

/* ---- backdrops: sky gradient, haze, distant ridges, light source; cached per biome+size ---- */
const SKY={
 plains:{a:'#14303a',b:'#3c7a80',c:'#bfd9b0',fog:'#10231f',glow:'#fff0c0',gx:.2,gy:.24},
 forest:{a:'#0f2622',b:'#2b5c4a',c:'#9cc59a',fog:'#0b1a15',glow:'#e6ffc0',gx:.24,gy:.2},
 hills:{a:'#1a2b38',b:'#51707c',c:'#d9d2b0',fog:'#161f1c',glow:'#ffe9b8',gx:.78,gy:.22},
 swamp:{a:'#101f1e',b:'#2c4a44',c:'#8aa58a',fog:'#0c1614',glow:'#c8e8a0',gx:.3,gy:.3},
 desert:{a:'#2a2440',b:'#b0683e',c:'#f3cf8a',fog:'#2a1c12',glow:'#fff2c8',gx:.74,gy:.3},
 snow:{a:'#1b2a40',b:'#5d7c9c',c:'#e6eef6',fog:'#182430',glow:'#ffffff',gx:.26,gy:.22},
 ashen:{a:'#120808',b:'#4a1a12',c:'#d0562a',fog:'#170a08',glow:'#ff7a30',gx:.5,gy:.62,stars:0},
 hollow:{a:'#07051a',b:'#231a52',c:'#6a4fc0',fog:'#0a0818',glow:'#b08cff',gx:.68,gy:.26,stars:90},
 glass:{a:'#061c24',b:'#1f5a66',c:'#a8ecec',fog:'#08181c',glow:'#d8ffff',gx:.34,gy:.2,stars:24},
 title:{a:'#0a1514',b:'#16302c',c:'#3d6a58',fog:'#0b1514',glow:'#d1a94e',gx:.5,gy:.34}};
const BGC={cv:null,key:''};
function drawBackdrop(kind){const key=kind+'|'+cv.width+'|'+cv.height;
 if(BGC.key!==key){BGC.key=key;const S=SKY[kind]||SKY.plains,w=cv.width,h=cv.height;if(!BGC.cv)BGC.cv=mkCanvas(w,h);const c=BGC.cv;c.width=w;c.height=h;const q=c.getContext('2d');
  let gr=q.createLinearGradient(0,0,0,h);gr.addColorStop(0,S.a);gr.addColorStop(.36,S.b);gr.addColorStop(.56,S.c);gr.addColorStop(.58,mixHex(S.c,S.fog,.5));gr.addColorStop(1,S.fog);q.fillStyle=gr;q.fillRect(0,0,w,h);
  for(let i=0;i<(S.stars||0);i++){q.fillStyle=`rgba(255,255,255,${.25+hash2(i,3,1)*.6})`;const r=hash2(i,5,2)<.12?1.2:.6;q.fillRect(hash2(i,1,7)*w,hash2(i,2,9)*h*.52,r*dpr,r*dpr)}
  const gx=S.gx*w,gy=S.gy*h,R=h*.75;gr=q.createRadialGradient(gx,gy,0,gx,gy,R);gr.addColorStop(0,S.glow);gr.addColorStop(.08,S.glow);gr.addColorStop(1,'rgba(0,0,0,0)');q.globalCompositeOperation='lighter';q.globalAlpha=.34;q.fillStyle=gr;q.fillRect(0,0,w,h);q.globalAlpha=1;q.globalCompositeOperation='source-over';
  for(let L=0;L<3;L++){const base=h*(.555+L*.07),amp=h*(.07-L*.012),p1=hash2(L,1,3)*9,p2=hash2(L,2,4)*9;q.fillStyle=mixHex(S.c,S.fog,.42+L*.24);q.beginPath();q.moveTo(0,h);
   for(let x=0;x<=w;x+=4){const u=x/w*6.283;q.lineTo(x,base-amp*(.5+.5*Math.sin(u*(1.3+L*.9)+p1))*(.6+.4*Math.sin(u*(3.1+L)+p2))-amp*.18*Math.sin(u*9+p1))}q.lineTo(w,h);q.fill()}
  gr=q.createLinearGradient(0,h*.62,0,h);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,mixHex(S.fog,'#000000',.35));q.fillStyle=gr;q.fillRect(0,h*.62,w,h*.38)}
 g.setTransform(1,0,0,1,0,0);g.drawImage(BGC.cv,0,0);g.setTransform(dpr,0,0,dpr,0,0)}

/* ================= WORLD =================
   Pixel-art overworld (world view agent). Three spaces:
     world  (x,y)   rules: TS units per tile, WS across
     art    (x,y)   world/WVU: one unit is one art pixel, a tile is WVT (16) of them
     backing        WV.s whole backing-store pixels per art pixel once a zoom has settled (worldArtScale());
                    WV.z = s/(WVU*dpr) is CSS px per world unit and is fractional only while a zoom animates
   Terrain is cached in chunks of WVC x WVC tiles, built a tile row at a time inside a per-frame time budget, nearest the
   camera first. A chunk keeps: flat (ground with the tall parts merged in, untinted), tall (the tall parts alone, one band
   per tile row, to put back in front of a sprite that stands behind them) and comp (flat + time-of-day tint + the unknown),
   which is what reaches the screen. Animated tiles repaint in place, visible ones only, inside their own budget.
   Art comes from 41-worldart.js; every call falls back to a flat stand-in when a function is missing or throws.
   Public: drawWorld(dt) drawMinimap() worldXY(sx,sy) worldArtScale() worldCenterOn(wx,wy) worldPick(wx,wy) worldSeen(wx,wy)
           worldVisible(wx,wy) worldZoomStep(dir,sx,sy) worldZoomFree(sx,sy,f) worldZoomSnap() worldPan(dx,dy)
           worldReadout() minimapToWorld(el,cx,cy) WV WNAME */
const WNAME=['Open water','Grassland','Forest','Hills','Mountains','Marsh','Desert','Snowfield'];
const WVT=16,WVC=16,WVP=WVT*WVC,WVU=TS/WVT,WVTB=12,WVDIM=112;      // art px per tile, tiles per chunk, art px per chunk, world units per art px, where a tile's tall part stands (art px below the tile top)
const WV={deco:{size:1,frame:0,night:false,own:null,mask:0,pr:1},mks:[],mkn:0,dk:[],s:0,sdef:1,smin:1,smax:1,z:0,zt:0,x:0,y:0,tx:0,ty:0,free:false,hold:false,pinch:false,ps:0,zax:0,zay:0,sig:'',gz:-1,boot:true,mv:false,
 sc:1,bx:0,by:0,vx0:0,vy0:0,vx1:0,vy1:0,f4:0,fs:0,vr:0,ring:null,ringR:-1,ringAt:0,dir:1,lx:0,cost:0,build:0,bd:new Map(),plates:[],np:0,night:0};
const WVA={init:false,tile:false,tall:false,site:false,box:false,band:false,co:false,mark:false,tint:false,wx:false,key:false,warn:{}};
function wvArtInit(){WVA.init=true;WVA.deco=typeof drawTownDecoPx==='function';WVA.tile=typeof drawWorldTilePx==='function';WVA.tall=typeof drawWorldTallPx==='function';WVA.site=typeof drawSitePx==='function';WVA.box=typeof siteBoxPx==='function';
 WVA.band=typeof drawBandPx==='function';WVA.co=typeof drawCompanyPx==='function';WVA.mark=typeof drawMarkerPx==='function';WVA.tint=typeof worldTint==='function';WVA.wx=typeof drawWeatherPx==='function';WVA.key=typeof worldKeyColor==='function'}
function wvFail(n,e){WVA[n]=false;if(!WVA.warn[n]){WVA.warn[n]=1;try{console.warn('world: '+n+' art failed, using the fallback: '+(e&&e.message||e))}catch(x){}}
 if(n==='tile'||n==='tall'||n==='key')WCH.w=null;else{WSPR.clear();WSBX.clear()}}
function worldArtScale(){return WV.s||1}
function worldXY(sx,sy){return{x:sx/wcam.z+wcam.x,y:sy/wcam.z+wcam.y}}
function wvNight(h){return h<5||h>=20?1:h<7?(7-h)/2:h>18?(h-18)/2:0}
function worldSeen(wx,wy){if(wx<0||wy<0||wx>=WS||wy>=WS)return false;return typeof seenAt!=='function'||seenAt(Math.floor(wx/TS),Math.floor(wy/TS))}
function worldVisible(wx,wy){if(typeof visibleAt==='function')return visibleAt(Math.floor(wx/TS),Math.floor(wy/TS));return Math.hypot(wx-G.p.x,wy-G.p.y)<7*TS}
function worldReadout(){const k=G&&G.weather&&G.weather.kind||'clear',W_=typeof WTHR==='object'&&WTHR&&WTHR[k];return{hour:G?G.hour:12,night:G?wvNight(G.hour):0,weather:k,label:W_&&W_.n||(k==='clear'?'Clear skies':k[0].toUpperCase()+k.slice(1))}}

/* ---- camera: follows the company inside a dead zone, free after a drag until the next march, whole scales ---- */
function worldFit(){const k=dpr,m=Math.min(SR.w,SR.h)*k/(WVT*10.5);
 WV.sdef=clamp(Math.round(m),Math.max(1,Math.ceil(1.25*k-.01)),Math.max(1,Math.floor(3*k+.01)));WV.smin=Math.max(1,Math.min(WV.sdef,Math.ceil(.75*k-.01)));WV.smax=Math.max(WV.sdef+1,Math.round(3*k));
 WV.s=clamp(Math.round((G&&G.zoom>0?G.zoom:1)*WV.sdef),WV.smin,WV.smax);WV.zt=WV.z=WV.s/(WVU*k);WV.pinch=false;WV.zax=VC.x;WV.zay=VC.y;if(G)G.zoom=WV.gz=WV.s/WV.sdef}
function wvSetScale(s,sx,sy){s=clamp(s,WV.smin,WV.smax);WV.pinch=false;WV.zax=sx==null?VC.x:sx;WV.zay=sy==null?VC.y:sy;WV.s=s;WV.zt=s/(WVU*dpr);G.zoom=WV.gz=s/WV.sdef}
function worldZoomStep(dir,sx,sy){if(!G||!WV.s)return;if(sx!=null&&Math.hypot(sx-VC.x,sy-VC.y)>24)wvFree();wvSetScale((WV.pinch?Math.round(WV.z*WVU*dpr):WV.s)+(dir>0?1:-1),sx,sy)}
function worldZoomFree(sx,sy,f){if(!G||!WV.s||!(f>0)||!isFinite(f))return;const z0=WV.z,z1=clamp(z0*f,WV.smin/(WVU*dpr)*.8,WV.smax/(WVU*dpr)*1.15);if(z1===z0)return;if(!WV.pinch){WV.pinch=true;WV.ps=WV.s}
 wvFree();const wx=(sx-VC.x)/z0+WV.x,wy=(sy-VC.y)/z0+WV.y;WV.z=z1;WV.zax=sx;WV.zay=sy;WV.x=WV.tx=wx-(sx-VC.x)/z1;WV.y=WV.ty=wy-(sy-VC.y)/z1}
function worldZoomSnap(){if(!WV.pinch)return;const f=WV.z*WVU*dpr,s0=WV.ps||WV.s;wvSetScale(f>=s0?Math.floor(f+.67):Math.ceil(f-.67),WV.zax,WV.zay)}   // a third of a step past the starting scale is enough to change it
function wvFree(){WV.free=true;WV.tx=WV.x;WV.ty=WV.y;camOff.x=1;camOff.y=1}
function worldPan(dx,dy){if(!G||!WV.z)return;wvFree();WV.x-=dx/WV.z;WV.y-=dy/WV.z;wvClamp();WV.tx=WV.x;WV.ty=WV.y}
function worldCenterOn(wx,wy){if(!(wx===wx)||!(wy===wy))return;WV.free=true;camOff.x=1;camOff.y=1;WV.tx=clamp(wx,0,WS);WV.ty=clamp(wy,0,WS)}
function wvClamp(){const hw=SR.w/2/WV.z,hh=SR.h/2/WV.z;
 if(WS<=2*hw)WV.x=WV.tx=WS/2;else{WV.x=clamp(WV.x,hw,WS-hw);WV.tx=clamp(WV.tx,hw,WS-hw)}
 if(WS<=2*hh)WV.y=WV.ty=WS/2;else{WV.y=clamp(WV.y,hh,WS-hh);WV.ty=clamp(WV.ty,hh,WS-hh)}}
function worldCam(dt){const p=G.p,sig=SR.w+'|'+SR.h+'|'+dpr+'|'+SR.x+'|'+SR.y;
 if(sig!==WV.sig||!WV.s){WV.sig=sig;worldFit()}
 if(G.zoom!==WV.gz)wvSetScale(Math.round((G.zoom>0?G.zoom:1)*WV.sdef));                    // the rail button and loaded saves speak in multiples of the default scale
 if(WV.z!==WV.zt&&!WV.pinch){const z0=WV.z;let z1=reduced||WV.boot?WV.zt:z0+(WV.zt-z0)*(1-Math.exp(-dt*22));if(Math.abs(WV.zt-z1)<.006*WV.zt)z1=WV.zt;   // eases, then lands exactly on the whole scale
  const ax=(WV.zax-VC.x)*(1/z0-1/z1),ay=(WV.zay-VC.y)*(1/z0-1/z1);WV.z=z1;WV.x+=ax;WV.y+=ay;WV.tx+=ax;WV.ty+=ay}
 if(WV.free&&((camOff.x===0&&camOff.y===0)||(G.moving&&!WV.mv)))WV.free=false;WV.mv=G.moving;        // a new march brings the camera home
 if(WV.hold){WV.tx=WV.x;WV.ty=WV.y}
 else if(!WV.free){if(WV.boot){WV.tx=p.x;WV.ty=p.y}else{const dx=SR.w*.13/WV.z,dy=SR.h*.13/WV.z;WV.tx=clamp(WV.tx,p.x-dx,p.x+dx);WV.ty=clamp(WV.ty,p.y-dy,p.y+dy)}camOff.x=camOff.y=0}
 const k=reduced||WV.boot?1:1-Math.exp(-dt*7);WV.x+=(WV.tx-WV.x)*k;WV.y+=(WV.ty-WV.y)*k;if(Math.abs(WV.tx-WV.x)<.2/WV.z)WV.x=WV.tx;if(Math.abs(WV.ty-WV.y)<.2/WV.z)WV.y=WV.ty;wvClamp();
 const sc=WV.z===WV.zt?WV.s:WV.z*WVU*dpr;WV.sc=sc;WV.bx=Math.round(dpr*VC.x-WV.x/WVU*sc);WV.by=Math.round(dpr*VC.y-WV.y/WVU*sc);
 wcam.z=WV.z;wcam.x=-WV.bx/sc*WVU;wcam.y=-WV.by/sc*WVU}

/* ---- art calls with stand-ins ---- */
const WVKEY=['X','w','7','b','o','4','c','q'],WTO={t:0,n:[0,0,0,0,0,0,0,0],river:0,road:0,c:0,r:0,frame:0};
function wvTileO(c,r,f){const T=W.tiles,n=WTO.n,i=r*WN+c,u=r>0,d=r<WN-1,l=c>0,rt=c<WN-1;
 n[0]=u?T[i-WN]:0;n[1]=u&&rt?T[i-WN+1]:0;n[2]=rt?T[i+1]:0;n[3]=d&&rt?T[i+WN+1]:0;n[4]=d?T[i+WN]:0;n[5]=d&&l?T[i+WN-1]:0;n[6]=l?T[i-1]:0;n[7]=u&&l?T[i-WN-1]:0;
 WTO.t=T[i];WTO.river=W.river?W.river[i]:0;WTO.road=W.road?W.road[i]:0;WTO.c=c;WTO.r=r;WTO.frame=f;return WTO}
function wvKeyOf(t,rv,rd){if(WVA.key){try{const k=worldKeyColor(t,rv,rd);if(PAL[k])return k}catch(e){wvFail('key',e)}}return rd&&t?'k':rv&&t?'x':WVKEY[t]||'0'}
function wvTileOld(q,x,y,o){const t=o.t;q.fillStyle=PAL[WVKEY[t]||'0'];q.fillRect(x,y,WVT,WVT);q.fillStyle=PAL[t===0?'x':t===1?'B':t===2?'3':t===3?'a':t===4?'p':t===5?'7':t===6?'d':'r'];
 for(let i=0;i<4;i++){const hx=(hash2(o.c,o.r,i)*13|0)+1,hy=(hash2(o.r,o.c,i+7)*14|0)+1;q.fillRect(x+(t===0?(hx+o.frame)%13+1:hx),y+hy,t===0?2:1,1)}
 const line=(m,k,w)=>{if(!m)return;q.fillStyle=PAL[k];const a=8-(w>>1);q.fillRect(x+a,y+a,w,w);if(m&1)q.fillRect(x+a,y,w,8);if(m&2)q.fillRect(x+8,y+a,8,w);if(m&4)q.fillRect(x+a,y+8,w,8);if(m&8)q.fillRect(x,y+a,8,w)};
 if(t)line(o.river,'x',4);line(o.road,'k',2);return t===0||!!o.river}
function wvTile(q,x,y,o){if(WVA.tile){try{return !!drawWorldTilePx(q,x,y,o)}catch(e){wvFail('tile',e)}}return wvTileOld(q,x,y,o)}
function wvSiteBox(o){if(WVA.box){try{const b=siteBoxPx(o);if(b&&b.w>0&&b.h>0)return b}catch(e){wvFail('box',e)}}return o.kind==='town'?{w:14+4*(o.size||2),h:14}:o.kind==='portal'?{w:12,h:18}:{w:14,h:10}}
const WVFC={gob:'v',undead:'l',beast:'j',orc:'w',bandit:'p',void:'C'};
function wvSiteOld(q,x,y,o){const R=(k,a,b,w,h)=>{q.fillStyle=PAL[k];q.fillRect(x+a,y+b,w,h)};
 if(o.kind==='town'){const w=10+4*(o.size||2),h=w>>1;R('0',-h-1,-9,w+2,10);R('j',-h,-8,w,8);R('0',-h-2,-13,w+4,5);R('g',-h-1,-12,w+2,3);R(o.night?'e':'i',-h+2,-6,2,2);R(o.night?'e':'i',h-4,-6,2,2);R('a',-1,-4,2,4)}
 else if(o.kind==='portal'){R('0',-5,-17,10,17);R('D',-4,-16,8,15);R('C',-3+(o.frame&1),-14,4,11);R('r',-1,-10+(o.frame%3),2,2)}
 else if(o.kind==='lair'){R('0',-7,-9,14,9);R('G',-6,-8,12,8);R(WVFC[o.f]||'g',-3,-5,2,2);R(WVFC[o.f]||'g',1,-5,2,2)}
 else{R('0',-7,-9,5,9);R('p',-6,-8,3,8);R('0',1,-6,5,6);R('p',2,-5,3,5);R('o',-4,-1,7,1)}}
function wvBandOld(q,x,y,o,co){const n=co?clamp(Math.ceil((o.n||1)/3),1,4):clamp(o.str||1,1,3),k=co?'5':WVFC[o.f]||'g',bob=o.moving?o.frame&1:0;
 for(let i=0;i<n;i++){const fx=x-n*3+i*6,fy=y-(i&1&&o.moving?1-bob:bob);q.fillStyle=PAL['0'];q.fillRect(fx,fy-9,5,9);q.fillStyle=PAL[k];q.fillRect(fx+1,fy-6,3,5);q.fillStyle=PAL[co?'s':'t'];q.fillRect(fx+1,fy-8,3,2)}
 if(co){const px=x+n*3*(o.dir<0?-1:1);q.fillStyle=PAL['0'];q.fillRect(px-1,y-17,3,17);q.fillStyle=PAL.a;q.fillRect(px,y-16,1,16);q.fillStyle=PAL['0'];q.fillRect(o.dir<0?px-8:px+1,y-17,8,6);q.fillStyle=PAL.c;q.fillRect(o.dir<0?px-7:px+1,y-16,7,4)}}
/* the contract's destination town (a delivery's, or where the pay waits): a gold ring pulsing out over the ground around it, and while
   the town is off the screen an arrow at the screen's edge pointing the way. Art units (the world's transform); f: WV.fs. */
function wvBeacon(x,y,size,f,vx0,vy0,vx1,vy1,sc){const ph=reduced?.35:(f%9)/9,c0=PAL['0'],cy=PAL.y,cw=PAL.l,R0=14+6*size;
 const ring=(rx,col,a)=>{const ry=rx*.5,n=Math.max(24,Math.round(rx*1.5));g.globalAlpha=a;
  if(WVHD){g.save();g.imageSmoothingEnabled=true;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.strokeStyle=c0;g.lineWidth=3.2;g.stroke();g.strokeStyle=col;g.lineWidth=1.6;g.stroke();g.restore();g.globalAlpha=1;return}   // Detail High: smooth rings
  for(let i=0;i<n;i++){const t=i/n*Math.PI*2,px=Math.round(x+Math.cos(t)*rx),py=Math.round(y+Math.sin(t)*ry);g.fillStyle=c0;g.fillRect(px-1,py-1,4,4)}
  for(let i=0;i<n;i++){const t=i/n*Math.PI*2,px=Math.round(x+Math.cos(t)*rx),py=Math.round(y+Math.sin(t)*ry);g.fillStyle=col;g.fillRect(px,py,2,2)}g.globalAlpha=1};
 // the part of the map the player can see: the canvas less the top bar, the order rail on the right and (for the arrow) the minimap
 const cv=g.canvas,c=cv.getBoundingClientRect(),toX=v=>vx0+(v-c.left)*(vx1-vx0)/Math.max(1,c.width),toY=v=>vy0+(v-c.top)*(vy1-vy0)/Math.max(1,c.height),el=id=>{const e=typeof $==='function'?$(id):null;return e&&e.offsetParent!==null&&!e.classList.contains('hidden')?e.getBoundingClientRect():null};
 const rail=el('wbar'),bar=el('top')||el('hud'),Lx=vx0,Rx=rail&&rail.left>c.left+c.width*.5?toX(rail.left):vx1,Ty=bar&&bar.bottom<c.top+c.height*.4?toY(bar.bottom):toY(c.top+46),By=vy1;
 if(x>Lx-R0&&x<Rx+R0*.4&&y>Ty-6&&y<By+R0*.5){ring(R0,cy,.95);ring(R0+ph*14,ph<.5?cw:cy,1-ph*.85);return}
 // off the screen: an arrow on the edge of what can be seen, bobbing toward the town
 const ins=(24/Math.max(.5,c.width/Math.max(1,vx1-vx0))),cx=(Lx+Rx)/2,cyy=(Ty+By)/2,dx=x-cx,dy=y-cyy,hw=(Rx-Lx)/2-ins,hh=(By-Ty)/2-ins;if(hw<4||hh<4)return;
 const k=Math.min(hw/Math.max(1e-6,Math.abs(dx)),hh/Math.max(1e-6,Math.abs(dy))),L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,bob=reduced?0:Math.sin(f/9*Math.PI*2)*2.5;let px=cx+dx*k,py=cyy+dy*k;
 // the minimap sits over the bottom-left corner: an arrow that would land under it slides up the left edge or right along the bottom
 const mm=el('mini');if(mm){const pad=ins*.5+13,mx0=toX(mm.left)-pad,mx1=toX(mm.right)+pad,my0=toY(mm.top)-pad,my1=toY(mm.bottom)+pad;if(px>mx0&&px<mx1&&py>my0&&py<my1){if(Math.abs(px-(cx-hw))<1)py=my0;else px=mx1}}
 const ax=px+ux*bob,ay=py+uy*bob,tri=(s,col)=>{g.fillStyle=col;g.beginPath();g.moveTo(ax+ux*s*1.25,ay+uy*s*1.25);g.lineTo(ax-ux*s*.6-uy*s,ay-uy*s*.6+ux*s);g.lineTo(ax-ux*s*.6+uy*s,ay-uy*s*.6-ux*s);g.closePath();g.fill()};
 tri(10,c0);tri(7.5,cy);g.fillStyle=c0;g.beginPath();g.arc(ax-ux*2,ay-uy*2,1.6,0,Math.PI*2);g.fill()}
function wvMarkOld(q,x,y,o){const k=o.kind==='contract'?'g':o.kind==='turnin'?'y':o.kind==='dest'?'l':'5',b=o.kind==='dest'||o.kind==='waypoint'?0:(o.frame>>1&1);y-=b;
 q.fillStyle=PAL['0'];q.fillRect(x-1,y-7,3,7);q.fillRect(x-3,y-5,7,3);q.fillRect(x-2,y-6,5,5);q.fillStyle=PAL[k];q.fillRect(x,y-6,1,5);q.fillRect(x-2,y-4,5,1);q.fillRect(x-1,y-5,3,3)}

/* ---- chunks ---- */
const WCH={w:null,cols:0,rows:0,list:[],up:0,side:0,bh:WVT,aw:WVP,tallT:new Uint8Array(8),key:null,tk:'',tm:'#ffffff',ta:'#000000',ton:false,tAt:0,unk:null,unk32:null,nz:null,
 fs:null,frev:-2,fAt:0,fogOn:false,img:null,imgD:null,vg:new Uint8Array(17*17),dt:[],dl:0};
const WBAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function wvC32(k,a){const n=parseInt(PAL[k].slice(1),16);return((a==null?255:a)<<24|(n&255)<<16|(n&0xff00)|n>>16)>>>0}
function wvCtx(c,opaque){const q=c.getContext('2d',opaque?{alpha:false}:undefined);q.imageSmoothingEnabled=false;return q}
// how far the tall parts reach over the tile edges, measured once from the art itself
// The art is fixed, so the answer is kept for the next world; when the art module can hand over a tile's tall part as palette
// indices (worldTallIxPx: 32x32, drawn at x-8,y-16, 0 = empty) that is read instead of drawing and reading back a canvas.
const WTP={tall:null,up:0,side:0,tallT:new Uint8Array(8)};
function wvTallProbe(){if(WTP.tall===WVA.tall&&WVA.tall){WCH.up=WTP.up;WCH.side=WTP.side;WCH.tallT.set(WTP.tallT);return}
 WCH.up=0;WCH.side=0;WCH.tallT.fill(0);if(!WVA.tall)return;const ix=typeof worldTallIxPx==='function';let c=null,q=null;if(!ix){c=mkCanvas(48,64);q=c.getContext('2d',{willReadFrequently:true});q.imageSmoothingEnabled=false}let up=0,side=0;
 try{for(let t=0;t<8;t++)for(let v=0;v<9;v++){const o=WTO;o.t=t;for(let i=0;i<8;i++)o.n[i]=t;o.river=v>=3&&v<6?5:0;o.road=v>=6?10:0;o.c=3+v*7+t;o.r=5+v*3+t*2;o.frame=0;let hit=false;
   if(ix){const d=worldTallIxPx(o);if(d)for(let k=0;k<1024;k++)if(d[k]){const x=8+(k&31),y=24+(k>>5);hit=true;if(40-y>up)up=40-y;if(16-x>side)side=16-x;if(x-31>side)side=x-31}}
   else{q.clearRect(0,0,48,64);drawWorldTallPx(q,16,40,o);const d=q.getImageData(0,0,48,64).data;for(let y=0;y<64;y++)for(let x=0;x<48;x++)if(d[(y*48+x)*4+3]){hit=true;if(40-y>up)up=40-y;if(16-x>side)side=16-x;if(x-31>side)side=x-31}}
   if(hit)WCH.tallT[t]|=v<3?1:v<6?2:4}}catch(e){wvFail('tall',e);WCH.tallT.fill(0);return}
 if(up||side){WCH.up=clamp(up,16,40);WCH.side=clamp(side,8,16)}   // never less than the art contract says (x-8..x+24, y-16..y+16)
 WTP.tall=WVA.tall;WTP.up=WCH.up;WTP.side=WCH.side;WTP.tallT.set(WCH.tallT)}
function wvUnknownInit(){if(WCH.unk32)return;const N=64,u=WCH.unk32=new Uint32Array(N*N),c0=wvC32('0'),c1=wvC32('1'),c2=wvC32('2'),L=8,lat=[];for(let i=0;i<L*L;i++)lat.push(hash2(i%L,(i/L)|0,91));
 const nf=(x,y)=>{const fx=x/N*L,fy=y/N*L,ix=fx|0,iy=fy|0,tx=fx-ix,ty=fy-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),a=lat[iy*L+ix],b=lat[iy*L+(ix+1)%L],c=lat[(iy+1)%L*L+ix],d=lat[(iy+1)%L*L+(ix+1)%L];return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy};
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const v=nf(x,y),th=(WBAYER[(y&3)*4+(x&3)]+.5)/16;u[y*N+x]=(v-.5)*5+.5>th?(hash2(x,y,5)<.03&&v>.62?c2:c1):c0}
 WCH.nz=new Float32Array(32*32);for(let i=0;i<1024;i++)WCH.nz[i]=(hash2(i&31,i>>5,33)-.5)*.34;
 const t=mkCanvas(N,N),tq=t.getContext('2d'),im=tq.createImageData(N,N);new Uint32Array(im.data.buffer).set(u);tq.putImageData(im,0,0);
 WCH.unk=mkCanvas(WVP,WVP);const q=wvCtx(WCH.unk,true);for(let y=0;y<WVP;y+=N)for(let x=0;x<WVP;x+=N)q.drawImage(t,x,y)}
function wchReset(){WCH.w=W;WCH.cols=Math.ceil(WN/WVC);WCH.rows=Math.ceil(WN/WVC);WCH.list=new Array(WCH.cols*WCH.rows).fill(null);if(!WVA.init)wvArtInit();if(WVHD){WCH.up=WCH.side=0;WCH.tallT.fill(0);wqReset()}else wvTallProbe();WCH.bh=WVT+WCH.up;WCH.aw=WVP+2*WCH.side;wvUnknownInit();
 // the key colours, one pixel a tile, written in one go (the same opaque pixels a fillRect each would give)
 {const k=WCH.key&&WCH.key.width===WN&&WCH.key.height===WN?WCH.key:(WCH.key=mkCanvas(WN,WN)),q=k.getContext('2d'),im=q.createImageData(WN,WN),d=new Uint32Array(im.data.buffer),C={};
  for(let i=0;i<WN*WN;i++){const kk=wvKeyOf(W.tiles[i],W.river?W.river[i]:0,W.road?W.road[i]:0);d[i]=C[kk]||(C[kk]=wvC32(kk))}q.putImageData(im,0,0)}
 WCH.fs=new Uint8Array(WN*WN);WCH.frev=-2;WCH.tk='?';WSPR.clear();WSBX.clear();MM.w=null}
function wchAt(cx,cy){if(cx<0||cy<0||cx>=WCH.cols||cy>=WCH.rows)return null;return WCH.list[cy*WCH.cols+cx]}
function wchGet(cx,cy){if(cx<0||cy<0||cx>=WCH.cols||cy>=WCH.rows)return null;const i=cy*WCH.cols+cx;let ch=WCH.list[i];if(ch)return ch;
 const flat=mkCanvas(WVP,WVP),q=wvCtx(flat,true);q.fillStyle=PAL['0'];q.fillRect(0,0,WVP,WVP);q.drawImage(WCH.key,cx*WVC,cy*WVC,WVC,WVC,0,0,WVP,WVP);   // flat key colours until the tiles are painted
 ch=WCH.list[i]={cx,cy,x0:cx*WVP,y0:cy*WVP,flat,q,tall:null,tq:null,has:new Uint8Array(WVC),row:0,col:0,ph:0,anim:[],ai:0,af:-1,frev:0,comp:flat,cc:null,cq:null,ck:-1,ctk:'',fog:0,fd:true,fogcv:null,fq:null,ts:null,fv:false,vis:false,tt:null,ttq:null,ttk:'',ttr:-1,ver:0,tm:new Uint8Array(WVC*WVC)};return ch}   // ver: bumped whenever any of its canvases change (frame skipping)
// Paints the next tile row of a chunk: ground first, then its tall parts, then the two merged. Resumable inside a row
// (ch.col, ch.ph): cold art is slow, so the clock (deadline dl) is checked after every tile. Returns false when it ran out of time.
function wchBuildRow(ch,dl){ch.ver++;const r=ch.row,ty=ch.cy*WVC+r,q=ch.q,tx0=ch.cx*WVC,f=WV.f4;
 if(ty<WN){if(!ch.ph){for(;ch.col<WVC;ch.col++){const lc=ch.col,tx=tx0+lc;if(tx>=WN)break;if(wvTile(q,lc*WVT,r*WVT,wvTileO(tx,ty,f)))ch.anim.push(r*WVC+lc);if(performance.now()>dl){ch.col++;return false}}ch.ph=1;ch.col=0}
  if(WVA.tall)for(;ch.col<WVC;ch.col++){const lc=ch.col,tx=tx0+lc;if(tx>=WN)break;const i=ty*WN+tx,m=WCH.tallT[W.tiles[i]];if(!m||!(m&1||(m&2&&W.river&&W.river[i])||(m&4&&W.road&&W.road[i])))continue;
   if(!ch.tall){ch.tall=mkCanvas(WCH.aw,WCH.bh*WVC);ch.tq=wvCtx(ch.tall)}
   try{if(drawWorldTallPx(ch.tq,WCH.side+lc*WVT,r*WCH.bh+WCH.up,wvTileO(tx,ty,f))!==false)ch.tm[r*WVC+lc]=1;ch.has[r]=1}catch(e){wvFail('tall',e);return true}if(performance.now()>dl){ch.col++;return false}}
  if(ch.has[r])q.drawImage(ch.tall,0,r*WCH.bh,WCH.aw,WCH.bh,-WCH.side,r*WVT-WCH.up,WCH.aw,WCH.bh)}
 ch.col=0;ch.ph=0; ch.row++;ch.frev++;
 if(ch.row===WVC&&(WCH.up||WCH.side))for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const n=wchAt(ch.cx+dx,ch.cy+dy);if(!n||n.row<WVC)continue;if(dy<=0)wchStitch(n,ch);if(dy>=0)wchStitch(ch,n)}return true}
// tall parts of src that lean over the edge into dst (tree tops over the chunk above, wide peaks over the one beside)
function wchStitch(dst,src){if(!src.tall||(src.cy===dst.cy&&!WCH.side)||(src.cx!==dst.cx&&!WCH.side))return;const n=src.cy>dst.cy?Math.min(WVC,Math.ceil(WCH.up/WVT)):WVC;
 for(let r=0;r<n;r++)if(src.has[r])dst.q.drawImage(src.tall,0,r*WCH.bh,WCH.aw,WCH.bh,src.x0-WCH.side-dst.x0,src.y0+r*WVT-WCH.up-dst.y0,WCH.aw,WCH.bh);dst.frev++;dst.ver++}
// draws the tall bands that cross a map rect (art px), back to front, from tile row r0 down; (ox,oy) is the map position of the
// target's origin. lit: use the bands in the current light (for the screen) instead of the raw ones (for the caches).
function wvBands(q,ox,oy,mx,my,mw,mh,r0,lit){if(!WCH.up&&!WCH.side)return 0;const r1=Math.min(WN-1,Math.floor((my+mh-1+WCH.up)/WVT)),c0=Math.max(0,Math.floor((mx-WCH.side)/WVP)),c1=Math.min(WCH.cols-1,Math.floor((mx+mw-1+WCH.side)/WVP));let n=0;
 for(let R=Math.max(0,r0);R<=r1;R++){const cy=(R/WVC)|0,lr=R-cy*WVC,by=R*WVT-WCH.up,y0=Math.max(my,by),y1=Math.min(my+mh,by+WCH.bh);if(y1<=y0)continue;
  for(let cx=c0;cx<=c1;cx++){const ch=WCH.list[cy*WCH.cols+cx];if(!ch||!ch.tall||!ch.has[lr]||ch.row<=lr)continue;const bx=ch.x0-WCH.side,x0=Math.max(mx,bx),x1=Math.min(mx+mw,bx+WCH.aw);if(x1<=x0)continue;
   {const T=ch.tm,o=lr*WVC,a=Math.max(0,Math.floor((x0-ch.x0-WCH.side-WVT)/WVT)+1),b=Math.min(WVC-1,Math.ceil((x1-ch.x0+WCH.side)/WVT)-1);let k=a;while(k<=b&&!T[o+k])k++;if(k>b)continue}   // no tall art of this row reaches the rect: nothing to draw
   q.drawImage(lit?wchTallLit(ch):ch.tall,x0-bx,lr*WCH.bh+y0-by,x1-x0,y1-y0,x0-ox,y0-oy,x1-x0,y1-y0);n++}}return n}
// a chunk's tall bands in the current light (made on demand: only chunks with a sprite standing among their trees need one)
function wchTallLit(ch){if(!WCH.ton)return ch.tall;if(ch.ttk===WCH.tk&&ch.ttr===ch.row)return ch.tt;const w=ch.tall.width,h=ch.tall.height;if(!ch.tt){ch.tt=mkCanvas(w,h);ch.ttq=ch.tt.getContext('2d')}const q=ch.ttq;
 q.globalCompositeOperation='copy';q.drawImage(ch.tall,0,0);wvTintRect(q,0,0,w,h);q.globalCompositeOperation='destination-in';q.drawImage(ch.tall,0,0);q.globalCompositeOperation='source-over';ch.ttk=WCH.tk;ch.ttr=ch.row;return ch.tt}
function wvTintRect(q,x,y,w,h){if(!WCH.ton)return;q.globalCompositeOperation='multiply';q.fillStyle=WCH.tm;q.fillRect(x,y,w,h);if(WCH.ta!=='#000000'){q.globalCompositeOperation='lighter';q.fillStyle=WCH.ta;q.fillRect(x,y,w,h)}q.globalCompositeOperation='source-over'}
function wchAnimTile(ch,i,f){ch.ver++;const lc=i%WVC,r=(i/WVC)|0,x=lc*WVT,y=r*WVT;wvTile(ch.q,x,y,wvTileO(ch.cx*WVC+lc,ch.cy*WVC+r,f));wvBands(ch.q,ch.x0,ch.y0,ch.x0+x,ch.y0+y,WVT,WVT,ch.cy*WVC+r);
 // the comp gets the same tile painted again rather than a copy from the flat canvas: drawing from a canvas that is written again
 // a moment later makes the browser copy all of it each time (the tile is opaque and the bands stay inside it, so the pixels are the same)
 if(ch.comp===ch.cc){const q=ch.cq;wvTile(q,x,y,wvTileO(ch.cx*WVC+lc,ch.cy*WVC+r,f));wvBands(q,ch.x0,ch.y0,ch.x0+x,ch.y0+y,WVT,WVT,ch.cy*WVC+r);wvTintRect(q,x,y,WVT,WVT);if(ch.fog)q.drawImage(ch.fogcv,x,y,WVT,WVT,x,y,WVT,WVT)}}
/* the unknown: per chunk, a dithered edge that follows the seen set (soft at tile corners, a little ragged) */
function wvUnseen(x,y){return WCH.fs[(y<0?0:y>=WN?WN-1:y)*WN+(x<0?0:x>=WN?WN-1:x)]}
// One tile of a chunk's fog canvas: clear, solid unknown, or a dithered edge from the four corner weights (0..4 unseen tiles each).
function wchFogTile(ch,lc,lr,a,b,c,e){if(WVHD){wqFogTile(ch,lc,lr,a,b,c,e);return}const q=ch.fq,X0=lc*WVT,Y0=lr*WVT,s=a+b+c+e;if(!s){q.clearRect(X0,Y0,WVT,WVT);return}
 if(s===16){q.globalCompositeOperation='copy';q.drawImage(WCH.unk,X0,Y0,WVT,WVT,X0,Y0,WVT,WVT);q.globalCompositeOperation='source-over';return}
 if(!WCH.img){WCH.img=new ImageData(WVT,WVT);WCH.imgD=new Uint32Array(WCH.img.data.buffer)}const d=WCH.imgD,U=WCH.unk32,NZ=WCH.nz;
 for(let py=0;py<WVT;py++){const Y=Y0+py,fy=(py+.5)/WVT,l=a+(c-a)*fy,r=b+(e-b)*fy,o=py*WVT,uy=(Y&63)*64,ny=(Y>>1&31)*32,by=(Y&3)*4;
  for(let px=0;px<WVT;px++){const X=X0+px,v=((l+(r-l)*(px+.5)/WVT)/4-.34)/.32+NZ[ny+(X>>1&31)];d[o+px]=v>=1||v>(WBAYER[by+(X&3)]+.5)/16?U[uy+(X&63)]:0}}
 q.putImageData(WCH.img,X0,Y0)}
// Brings a chunk's fog up to date with the seen set, a few tiles at a time (WCH.dl is this frame's deadline; an unfinished
// chunk stays dirty and carries on next frame, so newly seen land ripples in). Returns the tiles that changed, or null when all did.
function wchFog(ch){const V=WCH.vg,tx0=ch.cx*WVC,ty0=ch.cy*WVC;let lo=4,hi=0;
 if(WCH.fogOn)for(let j=0;j<=WVC;j++)for(let i=0;i<=WVC;i++){const x=tx0+i,y=ty0+j,v=wvUnseen(x-1,y-1)+wvUnseen(x,y-1)+wvUnseen(x-1,y)+wvUnseen(x,y);V[j*17+i]=v;if(v<lo)lo=v;if(v>hi)hi=v}else lo=hi=0;
 if(hi===0){ch.fog=0;ch.fv=false;return null}if(lo===4){ch.fog=2;ch.fv=false;return null}
 if(!ch.fogcv){ch.fogcv=mkCanvas(WVP,WVP);ch.fq=ch.fogcv.getContext('2d');ch.ts=new Uint16Array(WVC*WVC)}const S=ch.ts,dt=WCH.dt;dt.length=0;let all=false;
 if(ch.fog!==1||!ch.fv){ch.fog=1;ch.fv=true;all=true;const q=ch.fq;q.globalCompositeOperation='copy';q.drawImage(WVHD?wqUnk():WCH.unk,0,0);q.globalCompositeOperation='source-over';S.fill(2340)}   // from scratch: all unknown, then open up what is known
 for(let lr=0;lr<WVC;lr++)for(let lc=0;lc<WVC;lc++){const k=lr*17+lc,a=V[k],b=V[k+1],c=V[k+17],e=V[k+18],sg=a|b<<3|c<<6|e<<9,i=lr*WVC+lc;if(sg===S[i])continue;
  if((dt.length&3)===3&&performance.now()>WCH.dl){ch.fd=true;return all?null:dt}wchFogTile(ch,lc,lr,a,b,c,e);S[i]=sg;dt.push(i)}
 return all?null:dt}
function wchComp(ch){ch.ver++;let dt=WCH.dt;dt.length=0;if(ch.fd){ch.fd=false;dt=wchFog(ch)}
 if(ch.fog===2)ch.comp=WCH.unk;else if(!WCH.ton&&!ch.fog)ch.comp=ch.flat;
 else{if(!ch.cc){ch.cc=mkCanvas(WVP,WVP);ch.cq=wvCtx(ch.cc,true)}const q=ch.cq;
  if(dt&&ch.comp===ch.cc&&ch.ck===ch.frev&&ch.ctk===WCH.tk)for(let n=0;n<dt.length;n++){const x=dt[n]%WVC*WVT,y=(dt[n]/WVC|0)*WVT;q.drawImage(ch.flat,x,y,WVT,WVT,x,y,WVT,WVT);wvTintRect(q,x,y,WVT,WVT);q.drawImage(ch.fogcv,x,y,WVT,WVT,x,y,WVT,WVT)}   // only the tiles whose fog moved
  else{q.drawImage(ch.flat,0,0);wvTintRect(q,0,0,WVP,WVP);if(ch.fog)q.drawImage(ch.fogcv,0,0)}ch.comp=ch.cc}
 ch.ck=ch.frev;ch.ctk=WCH.tk}
function wvFogSync(){const on=typeof seenAt==='function';if(on!==WCH.fogOn){WCH.fogOn=on;WCH.frev=-2}if(!on)return;
 const rev=typeof W.fogRev==='number'?W.fogRev:-1;if(rev>=0?rev===WCH.frev:now-WCH.fAt<400)return;WCH.frev=rev;WCH.fAt=now;const F=WCH.fs,L=WCH.list,C=WCH.cols,S=W.seen&&W.seen.length===WN*WN?W.seen:null;let any=false;
 for(let y=0;y<WN;y++)for(let x=0;x<WN;x++){const i=y*WN+x,u=(S?S[i]===1:seenAt(x,y))?0:1;if(u===F[i])continue;F[i]=u;any=true;
  const a=Math.max(0,(x-1)/WVC|0),b=Math.min(C-1,(x+1)/WVC|0),c=Math.max(0,(y-1)/WVC|0),e=Math.min(WCH.rows-1,(y+1)/WVC|0);for(let cy=c;cy<=e;cy++)for(let cx=a;cx<=b;cx++){const ch=L[cy*C+cx];if(ch)ch.fd=true}}
 if(any)MM.frev=-1}
/* time of day: one multiply and one add colour, baked into comp and into every sprite (never a full-screen pass) */
function wvTintTick(force){if(!force&&now-WCH.tAt<220)return;WCH.tAt=now;let t=null;const h=G.hour;
 if(WVA.tint){try{t=worldTint(h,G.weather&&G.weather.kind||'clear')}catch(e){wvFail('tint',e)}}
 if(!t||!t.mul){const n=wvNight(h),w=Math.max(0,1-Math.abs(h-18.4)/1.7,1-Math.abs(h-6.3)/1.5)*.7,hx=v=>(v|0).toString(16).padStart(2,'0');t={mul:'#'+hx(lerp(lerp(255,104,n),255,w))+hx(lerp(lerp(255,120,n),170,w))+hx(lerp(lerp(255,192,n),118,w)),add:'#000000',a:1}}
 const a=clamp(+t.a||0,0,1),m=parseInt(String(t.mul).slice(1),16)||0,d=parseInt(String(t.add||'#000000').slice(1),16)||0,qz=v=>Math.min(255,Math.round(v/4)*4),hx=v=>v.toString(16).padStart(2,'0');
 const tm='#'+hx(qz(lerp(255,m>>16,a)))+hx(qz(lerp(255,m>>8&255,a)))+hx(qz(lerp(255,m&255,a))),ta='#'+hx(qz((d>>16)*a))+hx(qz((d>>8&255)*a))+hx(qz((d&255)*a)),k=tm+ta;
 if(k===WCH.tk)return;WCH.tk=k;WCH.tm=tm;WCH.ta=ta;WCH.ton=k!=='#ffffff#000000'}
/* per-frame chunk work: comps of the visible chunks, then tile rows nearest the camera, then animated tiles */
function wchWork(cx0,cy0,cx1,cy1,vx0,vy0,vx1,vy1){const t0=performance.now(),boot=WV.boot,L=WCH.list,ccx=(vx0+vx1)/2/WVP-.5,ccy=(vy0+vy1)/2/WVP-.5;let stale=0;
 for(let i=0;i<L.length;i++)if(L[i])L[i].vis=false;
 for(let cy=cy0;cy<=cy1;cy++)for(let cx=cx0;cx<=cx1;cx++){const ch=wchGet(cx,cy);ch.vis=true}
 if(WVHD){   // Detail High: painted quads (41h-worldhd.js); the chunks keep only their fog
  {const k0=WQ.K;if(WV.z===WV.zt&&!WV.pinch)WQ.K=clamp(WV.s,1,8);else if(!WQ.K)WQ.K=clamp(WV.s,1,8);if(k0&&WQ.K!==k0){WSPR.clear();WSBX.clear()}}wqWork(vx0,vy0,vx1,vy1,boot,G.moving||WV.hold||WV.z!==WV.zt,cv.width,cv.height);WV.build=performance.now()-t0;WCH.dl=boot?1e18:performance.now()+1.4;
  for(let cy=cy0;cy<=cy1;cy++)for(let cx=cx0;cx<=cx1;cx++){const ch=L[cy*WCH.cols+cx];if(ch&&ch.fd){ch.fd=false;wchFog(ch);ch.ver++}}return}
 // rows: visible chunks first (all of them when the view has just opened), then the ring around, then the rest of the map
 const budget=boot?90:G.moving||WV.hold||WV.z!==WV.zt?2.2:3.2;let guard=0;
 while(guard++<400){let best=null,bd=1e9;for(let cy=0;cy<WCH.rows;cy++)for(let cx=0;cx<WCH.cols;cx++){const ch=L[cy*WCH.cols+cx];if(ch&&ch.row>=WVC)continue;
   const d=Math.max(Math.abs(cx-ccx),Math.abs(cy-ccy))+(ch&&ch.vis?0:cx>=cx0-1&&cx<=cx1+1&&cy>=cy0-1&&cy<=cy1+1?10:20);if(d<bd){bd=d;best=cy*WCH.cols+cx}}
  if(best==null||(boot&&bd>=10))break;const ch=wchGet(best%WCH.cols,(best/WCH.cols)|0);const done=wchBuildRow(ch,t0+budget);if(WCH.w!==W)return;if(!done||performance.now()-t0>budget)break}
 WV.build=performance.now()-t0;const t2=performance.now();WCH.dl=boot?1e18:t2+1.4;
 for(let cy=cy0;cy<=cy1;cy++)for(let cx=cx0;cx<=cx1;cx++){const ch=L[cy*WCH.cols+cx];if(!ch||!(ch.fd||ch.ck!==ch.frev||ch.ctk!==WCH.tk))continue;
  if(boot||!stale||performance.now()<WCH.dl)wchComp(ch);stale++}
 if(reduced||boot)return;
 // animated tiles (water, rivers): the visible ones only, a slice a frame
 const f=WV.f4,t1=performance.now(),tx0=Math.floor(vx0/WVT)-1,tx1=Math.floor(vx1/WVT)+1,ty0=Math.floor(vy0/WVT)-1,ty1=Math.floor(vy1/WVT)+1;
 for(let cy=cy0;cy<=cy1;cy++)for(let cx=cx0;cx<=cx1;cx++){const ch=L[cy*WCH.cols+cx];if(!ch||ch.af===f||ch.row<WVC||ch.fog===2||!ch.anim.length){if(ch&&ch.row>=WVC)ch.af=f;continue}
  const A=ch.anim,bx=ch.cx*WVC,by=ch.cy*WVC;for(;ch.ai<A.length;ch.ai++){const i=A[ch.ai],x=bx+i%WVC,y=by+((i/WVC)|0);if(x<tx0||x>tx1||y<ty0||y>ty1||(WCH.fogOn&&WCH.fs[y*WN+x]))continue;
    wchAnimTile(ch,i,f);if(performance.now()-t1>1)return}
  ch.ai=0;ch.af=f;if(ch.comp===ch.flat)ch.ck=ch.frev}}

/* ---- sprites: cached at art size, tinted with the land, lit windows kept bright ---- */
/* the town dressing for town i: owner's banner, situations, prosperity. Re-derived at most every 400 ms per town; the key string only changes with the state. */
function wvDecoOf(t,i){const D=WV.dk[i]||(WV.dk[i]={at:-1e9,key:'',own:null,mask:0,pr:1,hit:false});if(now-D.at>400){D.at=now;const h=t.own&&t.own!=='free'?lkHouse(t.own):null,own=h&&typeof waBnOf==='function'?waBnOf(h):null,
  mask=typeof waTownSitMask==='function'?waTownSitMask(t):0,pr=typeof t.pros==='number'?(t.pros<30?0:t.pros>70?2:1):1;if(own!==D.own||mask!==D.mask||pr!==D.pr||!D.key){D.own=own;D.mask=mask;D.pr=pr;D.key='D'+(t.size||2)+'|'+mask+'|'+pr+'|'+(own?own.sig:'-')}D.hit=!!(own||mask||pr!==1)}
 if(!D.hit)return null;const O=WV.deco;O.own=D.own;O.mask=D.mask;O.pr=D.pr;return D}
function wvTownBio(t,i){const D=WV.dk[i]||(WV.dk[i]={at:-1e9,key:'',own:null,mask:0,pr:1,hit:false});if(!D.bio||D.bw!==W){D.bw=W;D.bio=typeof whTownBio==='function'?whTownBio(t):'plains'}return D.bio}
function waNestTierSafe(n){if(typeof waNestTier==='function'){try{return waNestTier(n)}catch(e){}}return 2}
const WSPR=new Map(),WSBX=new Map(),WSC={c:null,cq:null};
function wvScratch(w,h,k){let c=WSC[k];if(!c){c=WSC[k]=mkCanvas(Math.max(96,w),Math.max(96,h));WSC[k+'q']=c.getContext('2d',{willReadFrequently:k==='c'})}if(c.width<w)c.width=w;if(c.height<h)c.height=h;const q=WSC[k+'q'];q.setTransform(1,0,0,1,0,0);q.globalCompositeOperation='source-over';q.globalAlpha=1;q.imageSmoothingEnabled=false;q.clearRect(0,0,c.width,c.height);return q}
function wvPaint(q,x,y,kind,o){
 if(kind==='site'){if(WVA.site){try{drawSitePx(q,x,y,o);return}catch(e){wvFail('site',e)}}wvSiteOld(q,x,y,o)}
 else if(kind==='deco'){if(WVA.deco){try{drawTownDecoPx(q,x,y,o)}catch(e){wvFail('deco',e)}}}
 else if(kind==='east'){try{drawEastPx(q,x,y,o)}catch(e){wvFail('east',e)}}   // the East (77-east-art.js): towns, hosts, scenery
 else if(kind==='band'){if(WVA.band){try{drawBandPx(q,x,y,o);return}catch(e){wvFail('band',e)}}wvBandOld(q,x,y,o,false)}
 else{if(WVA.co){try{drawCompanyPx(q,x,y,o);return}catch(e){wvFail('co',e)}}wvBandOld(q,x,y,o,true)}}
// Cached sprite for a key. Two new sprites a frame at most: a third shows the last frame of the same thing meanwhile.
function wvSprite(key,base,kind,o){let e=WSPR.get(key);if(e)return e;{const b=WSBX.get(base);if(b&&b.last&&WV.nc>=2&&!WV.boot)return b.last}WV.nc++;if(WSPR.size>420)WSPR.clear();
 if(WVHD&&typeof whSprite==='function'){let h=null;try{h=whSprite(kind,o,WQ.K||WV.s)}catch(err){if(!WVA.warn.hd){WVA.warn.hd=1;try{console.warn('world: painted sprite failed, using the pixel one: '+(err&&err.message||err))}catch(x){}}}   // Detail High: painted (41i-worldhd-sites.js)
  if(h){let bb=WSBX.get(base);if(!bb){if(WSBX.size>300)WSBX.clear();bb={x0:h.x0,y0:h.y0,x1:h.x1,y1:h.y1,last:null};WSBX.set(base,bb)}bb.last=h;WSPR.set(key,h);return h}}let w=72,h=64,ax=36,ay=54;if(kind==='site'){const b=wvSiteBox(o);w=b.w+12;h=b.h+12;ax=w>>1;ay=b.h+6}else if(kind==='deco'){const b=wvSiteBox({kind:'town',size:o.size});w=b.w+20;h=b.h+32;ax=w>>1;ay=b.h+24}
 else if(kind==='east'){const b=eastBoxPx(o);w=b.w+12;h=b.h+12;ax=w>>1;ay=b.h+6}
 const night=(kind==='site'||kind==='deco'||(kind==='east'&&o.k==='town'))&&o.night,c=mkCanvas(w,h),q=c.getContext('2d',night?{willReadFrequently:true}:undefined);q.imageSmoothingEnabled=false;wvPaint(q,ax,ay,kind,o);
 let bb=WSBX.get(base),d=null;if(!bb||night)d=q.getImageData(0,0,w,h).data;
 if(!bb){let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}   // measured on the first frame of a sprite, with room for its animation
  if(x1<0){x0=ax-4;x1=ax+4;y0=ay-8;y1=ay}const pad=kind==='site'||kind==='deco'||kind==='east'?1:3;bb={x0:Math.max(0,x0-pad)-ax,y0:Math.max(0,y0-pad)-ay,x1:Math.min(w,x1+1+pad)-ax,y1:Math.min(h,y1+1+(kind==='site'||kind==='deco'?1:0))-ay};bb.last=null;if(WSBX.size>300)WSBX.clear();WSBX.set(base,bb)}
 e=bb.last={c,w,h,ax,ay,x0:bb.x0,y0:bb.y0,x1:bb.x1,y1:bb.y1,tc:null,tq:null,tk:'',lit:null,raw:kind==='site'&&o.kind==='portal'};
 if(night){   // the pixels that differ from the day sprite are the lit windows: they stay untinted
  const dq=wvScratch(w,h,'c'),was=o.night;o.night=false;wvPaint(dq,ax,ay,kind,o);o.night=was;const dd=dq.getImageData(0,0,w,h).data;let any=false;const im=new ImageData(w,h),ld=im.data;
  for(let i=0;i<d.length;i+=4)if(d[i+3]&&(d[i]!==dd[i]||d[i+1]!==dd[i+1]||d[i+2]!==dd[i+2])&&d[i]+d[i+1]+d[i+2]>dd[i]+dd[i+1]+dd[i+2]){ld[i]=d[i];ld[i+1]=d[i+1];ld[i+2]=d[i+2];ld[i+3]=255;any=true}
  if(any){e.lit=mkCanvas(w,h);e.lit.getContext('2d').putImageData(im,0,0)}}
 WSPR.set(key,e);return e}
function wvSprCv(e){if(!WCH.ton||e.raw){if(e.hd&&e.lit){if(!e.cl){e.cl=mkCanvas(e.c.width,e.c.height);const q=e.cl.getContext('2d');q.drawImage(e.c,0,0);q.drawImage(e.lit,0,0)}return e.cl}return e.c}   // a painted sprite's lit layer (torches, fires) shows by day too
if(e.tk===WCH.tk)return e.tc;if(e.tc&&WV.tn>=2)return e.tc;WV.tn++;   // a few re-tints a frame; the rest keep the last light for a frame or two
 const w=e.c.width,h=e.c.height;if(!e.tc){e.tc=mkCanvas(w,h);e.tq=e.tc.getContext('2d')}const t=e.tc,q=e.tq;
 q.globalCompositeOperation='copy';q.drawImage(e.c,0,0);wvTintRect(q,0,0,w,h);q.globalCompositeOperation='destination-in';q.drawImage(e.c,0,0);q.globalCompositeOperation='source-over';if(e.lit)q.drawImage(e.lit,0,0);e.tk=WCH.tk;return t}
// draws a standing sprite, then puts back the tall parts of the tiles in front of it (tree tops and peaks south of its feet)
function wvDrawSprite(e,x,y,snap){const sc=WV.sc;if(snap){x=Math.round(x*sc)/sc;y=Math.round(y*sc)/sc}else{x=Math.round(x);y=Math.round(y)}
 const c=wvSprCv(e),dx=x-e.ax,dy=y-e.ay;if(dx>WV.vx1+1||dy>WV.vy1+1||dx+e.w<WV.vx0-1||dy+e.h<WV.vy0-1)return;   // wholly off screen (still lit above, at the same pace)
 if(e.k>1){g.imageSmoothingEnabled=e.k!==sc||(dx*sc)%1!==0||(dy*sc)%1!==0;g.drawImage(c,dx,dy,e.w,e.h);g.imageSmoothingEnabled=false}else g.drawImage(c,dx,dy);if(WVHD){wqOcclude(g,e,x,y);return}if(!WCH.up&&!WCH.side)return;   // e.k: a painted sprite at k canvas px an art px (the colosseum at Detail High)
 const mx=Math.floor(x+e.x0),my=Math.floor(y+e.y0),mw=Math.ceil(x+e.x1)-mx,mh=Math.ceil(y+e.y1)-my;if(mw>0&&mh>0)wvBands(g,0,0,mx,my,mw,mh,Math.floor((y-WVTB)/WVT)+1,true)}

/* ---- name plates (own 4x6 capitals; drawn in whole device pixels over the scene) ---- */
const WFONT={A:'.##./#..#/####/#..#/#..#/#..#',B:'###./#..#/###./#..#/#..#/###.',C:'.###/#.../#.../#.../#.../.###',D:'###./#..#/#..#/#..#/#..#/###.',E:'####/#.../###./#.../#.../####',F:'####/#.../###./#.../#.../#...',
 G:'.###/#.../#.##/#..#/#..#/.###',H:'#..#/#..#/####/#..#/#..#/#..#',I:'###/.#./.#./.#./.#./###',J:'..##/...#/...#/...#/#..#/.##.',K:'#..#/#.#./##../#.#./#..#/#..#',L:'#.../#.../#.../#.../#.../####',
 M:'#...#/##.##/#.#.#/#...#/#...#/#...#',N:'#..#/##.#/#.##/#..#/#..#/#..#',O:'.##./#..#/#..#/#..#/#..#/.##.',P:'###./#..#/#..#/###./#.../#...',Q:'.##./#..#/#..#/#..#/#.#./.#.#',R:'###./#..#/#..#/###./#.#./#..#',
 S:'.###/#.../.##./...#/...#/###.',T:'###/.#./.#./.#./.#./.#.',U:'#..#/#..#/#..#/#..#/#..#/.##.',V:'#...#/#...#/#...#/.#.#./.#.#./..#..',W:'#...#/#...#/#...#/#.#.#/##.##/#...#',X:'#..#/#..#/.##./.##./#..#/#..#',
 Y:'#.#/#.#/#.#/.#./.#./.#.',Z:'####/...#/..#./.#../#.../####','0':'.##./#..#/#.##/##.#/#..#/.##.','1':'.#./##./.#./.#./.#./###','2':'.##./#..#/...#/..#./.#../####','3':'###./...#/.##./...#/...#/###.',
 '4':'#..#/#..#/####/...#/...#/...#','5':'####/#.../###./...#/...#/###.','6':'.##./#.../###./#..#/#..#/.##.','7':'####/...#/..#./..#./.#../.#..','8':'.##./#..#/.##./#..#/#..#/.##.','9':'.##./#..#/#..#/.###/...#/.##.',
 "'":'#/#/./././.','-':'.../.../###/.../.../...','.':'./././././#',' ':'../../../../../..'};
const WPL=new Map();
function wvPlate(txt,col,bg){const id=txt+'|'+col+bg;let c=WPL.get(id);if(c)return c;if(WPL.size>80)WPL.clear();const G_=[];let w=5;for(const ch of txt.toUpperCase()){const s=WFONT[ch];if(!s)continue;const r=s.split('/');G_.push(r);w+=r[0].length+1}
 c=mkCanvas(w,10);const q=c.getContext('2d');q.fillStyle=PAL['0'];q.fillRect(1,0,w-2,10);q.fillRect(0,1,w,8);q.fillStyle=PAL[bg];q.fillRect(1,1,w-2,8);q.fillStyle=PAL[col];let x=3;
 for(const r of G_){for(let y=0;y<6;y++)for(let i=0;i<r[y].length;i++)if(r[y][i]==='#')q.fillRect(x+i,2+y,1,1);x+=r[0].length+1}WPL.set(id,c);return c}
function wvPlateAt(txt,col,bg,ax,ay){const i=WV.np++,P=WV.plates[i]||(WV.plates[i]={c:null,x:0,y:0});P.c=WVHD&&typeof whPlate==='function'?whPlate(txt,col,bg,dpr):wvPlate(txt,col,bg);P.hd=WVHD;P.x=ax;P.y=ay}       // art-space anchor: bottom centre

/* ---- the edge of sight: everything beyond the company's vision dimmed with a dithered rim ---- */
function wvRing(R){if(WV.ringR===R&&WV.ring&&WV.ringHD===WVHD)return WV.ring;WV.ringHD=WVHD;const D=2*R+2,c=WV.ring||(WV.ring=mkCanvas(D,D));c.width=c.height=D;
 if(WVHD){const q=c.getContext('2d'),C=D/2,soft=Math.min(16,R*.42),gr=q.createRadialGradient(C,C,R-soft,C,C,R);gr.addColorStop(0,'rgba(16,29,28,0)');gr.addColorStop(.55,'rgba(16,29,28,'+(WVDIM/255*.45).toFixed(3)+')');gr.addColorStop(1,'rgba(16,29,28,'+(WVDIM/255).toFixed(3)+')');q.fillStyle=gr;q.fillRect(0,0,D,D);WV.ringR=R;return c}   // Detail High: a soft edge
 const q=c.getContext('2d'),im=q.createImageData(D,D),d=new Uint32Array(im.data.buffer),col=wvC32('1',WVDIM),C=D/2,soft=Math.min(14,R*.4),R0=R-soft,RR=R*R,R00=R0*R0;
 for(let y=0;y<D;y++){const dy=y+.5-C,d2=dy*dy,o=y*D;if(d2>=RR){d.fill(col,o,o+D);continue}
  const xo=Math.sqrt(RR-d2),xi=d2<R00?Math.sqrt(R00-d2):0,a=Math.max(0,Math.floor(C-xo)),b=Math.min(D,Math.ceil(C-xi)),e=Math.max(0,Math.floor(C+xi)),f=Math.min(D,Math.ceil(C+xo)),by=(y&3)*4;d.fill(col,o,o+a);d.fill(col,o+f,o+D);
  for(let x=a;x<b;x++){const dx=x+.5-C,dd=dx*dx+d2;if(dd>R00&&(dd>=RR||(Math.sqrt(dd)-R0)/soft>(WBAYER[by+(x&3)]+.5)/16))d[o+x]=col}
  for(let x=Math.max(e,b);x<f;x++){const dx=x+.5-C,dd=dx*dx+d2;if(dd>R00&&(dd>=RR||(Math.sqrt(dd)-R0)/soft>(WBAYER[by+(x&3)]+.5)/16))d[o+x]=col}}
 q.putImageData(im,0,0);WV.ringR=R;return c}

/* ---- the frame ---- */
const WSL=[];let WSN=0;
// the colosseum (29-colosseum.js): painted at Detail High (06pg-gladiators.js glColoSite: 4 canvas px an art px), else the pixel sprite of 41-worldart.js
const WCOLO=new Map();
function wvColoSpr(night){const hd=typeof hdArt==='function'&&hdArt()&&typeof glColoSite==='function',key=(hd?'h':'p')+(night?'n':'d');let e=WCOLO.get(key);if(e)return e;
 const D=typeof WASITE==='object'&&WASITE.colo?WASITE.colo:{w:64,h:46};
 if(hd){const K=4,c=glColoSite(D.w,D.h+2,K,night);if(c){e={c,w:D.w,h:D.h+2,ax:D.w>>1,ay:D.h,x0:-(D.w>>1),y0:-D.h,x1:D.w>>1,y1:2,tc:null,tq:null,tk:'',lit:null,raw:false,k:K};WCOLO.set(key,e);return e}}
 return wvSprite('Rcolo'+(night?'n':'d'),'Rcolo'+(night?'n':'d'),'site',{kind:'colo',size:1,frame:0,night:!!night,n:0})}
if(typeof onArtChange==='function')onArtChange(()=>WCOLO.clear());
function wvPush(y,e,x,snap){const s=WSL[WSN]||(WSL[WSN]={y:0,e:null,x:0,snap:false,i:0,sink:0});s.y=y;s.e=e;s.x=x;s.snap=snap;s.sink=0;s.i=WSN++;}
// a band of the dead sinking into the ground at dawn (40s-spawns.js SINKS): its sprite slides down under its own feet and fades, k 0..1
const WVSINK=1400;
function wvDrawSink(s){const e=s.e,k=s.sink,x=s.x,y=s.y;g.save();g.beginPath();g.rect(x-e.w-4,y-e.h-8,2*e.w+8,e.h+9);g.clip();g.globalAlpha=Math.max(0,1-k*k);wvDrawSprite(e,x,y+k*(e.h+2),s.snap);g.restore()}
function wvPathDots(vx0,vy0,vx1,vy1){const p=G.p,P=G.path,ph=reduced?0:(now/70)%7;let lx=p.x/WVU,ly=p.y/WVU,acc=7-ph,n=0;const c0=PAL['0'],c1=PAL.l,D=WV.dots||(WV.dots=new Int16Array(800));
 for(let i=0;i<P.length;i++){const nx=P[i].x/WVU,ny=P[i].y/WVU,dx=nx-lx,dy=ny-ly,L=Math.hypot(dx,dy);if(L<.01)continue;
  if(Math.max(lx,nx)<vx0||Math.min(lx,nx)>vx1||Math.max(ly,ny)<vy0||Math.min(ly,ny)>vy1){acc=(acc-L)%7;if(acc<0)acc+=7;lx=nx;ly=ny;continue}
  let d=acc;for(;d<L&&n<800;d+=7){D[n++]=Math.round(lx+dx*d/L);D[n++]=Math.round(ly+dy*d/L)}acc=d-L;lx=nx;ly=ny}
 if(WVHD&&typeof whDots==='function'){whDots(g,D,n,G.route,WV.sc);return}
 g.fillStyle=c0;for(let i=0;i<n;i+=2)g.fillRect(D[i]-1,D[i+1]-1,3,3);g.fillStyle=c1;for(let i=0;i<n;i+=2)g.fillRect(D[i]-1,D[i+1]-1,2,2);
 const R=G.route;if(R&&R.length>1){g.fillStyle=PAL.m;for(let i=1;i<R.length;i++){const ax=R[i-1].x/WVU,ay=R[i-1].y/WVU,dx=R[i].x/WVU-ax,dy=R[i].y/WVU-ay,L=Math.hypot(dx,dy);for(let d=5;d<L;d+=9)g.fillRect(Math.round(ax+dx*d/L),Math.round(ay+dy*d/L),1,1)}}}
function wvMark(x,y,kind){if(WVHD&&typeof whMark==='function'){try{whMark(g,x,y,kind,WV.fs,WV.sc);return}catch(e){}}const o={kind,frame:WV.fs};if(WVA.mark){try{drawMarkerPx(g,Math.round(x),Math.round(y),o);return}catch(e){wvFail('mark',e)}}wvMarkOld(g,Math.round(x),Math.round(y),o)}
/* Frame skipping. drawWorld collects the frame's draw list first (chunk canvases and their versions, sprites, the rim, markers, plates)
   into WSG.a and compares it with the list of the last frame it drew (WSG.b). When nothing on the list changed and nothing on it moves
   with the clock (flickering glows, weather, the march's dots), the canvas already shows exactly this frame and the pixel work is
   skipped. When the town view or the map screen covers the whole canvas (both are opaque, inset 0) nothing is drawn at all. Everything
   stateful (camera, chunk work, sprite caches and re-tints, easing, the rim) still runs every frame, so the next drawn frame is the same
   as without skipping. A frame is drawn at least once a second regardless. */
const WSG={a:[],b:[],n:0,pn:-1,at:-1e9,live:false,ok:false};
function wsg(v){WSG.a[WSG.n++]=v}
function wsgSame(){const a=WSG.a,b=WSG.b,n=WSG.n;if(n!==WSG.pn)return false;for(let i=0;i<n;i++)if(a[i]!==b[i])return false;return true}
/* a rival company's art on the world map: its banner and sword count, cached per rival (a new object only when they change) */
const WVRV=new Map(),WVRV0={sig:'-',bn:null,n:4};
function wvRivalArt(id){const r=typeof lkRival==='function'?lkRival(id):null;if(!r)return WVRV0;const n=typeof lkRivalSwords==='function'?lkRivalSwords(r):4;let a=WVRV.get(id);
 if(a&&a.c1===r.c1&&a.c2===r.c2&&a.em===r.emblem&&a.dv===r.div&&a.n===n)return a;a={c1:r.c1,c2:r.c2,em:r.emblem,dv:r.div,n,sig:r.c1+'.'+r.c2+'.'+r.emblem+(r.div&&r.div!=='plain'?'.'+r.div+r.c3:''),bn:{name:r.n,c1:r.c1,c2:r.c2,emblem:r.emblem,div:r.div,c3:r.c3,shape:r.shape}};WVRV.set(id,a);return a}
function wvCovered(){return(typeof TV!=='undefined'&&!!TV&&TV.shown&&!!TV.root&&TV.root.classList.contains('on'))||(typeof MP!=='undefined'&&!!MP&&MP.open&&!!MP.root&&MP.root.classList.contains('on'))}
// worldVisible for one pass (a frame's list, a minimap paint): the company's sight radius cannot change inside it, so it is taken once
function wvVisFn(){if(typeof visibleWithin!=='function'||typeof visibleAt!=='function'||typeof visionRadius!=='function')return worldVisible;const r=visionRadius();return(x,y)=>visibleWithin(Math.floor(x/TS),Math.floor(y/TS),r)}
let WVHD=false;   // Detail High: the painted world of 41h-worldhd.js (Detail Low keeps the pixel chunks below exactly as they were)
function drawWorld(dt){if(!WVA.init)wvArtInit();{const hd=typeof whOn==='function'&&whOn();if(hd!==WVHD){WVHD=hd;WCH.w=null;WSPR.clear();WSBX.clear();if(!hd&&typeof wqReset==='function'&&W){wqReset();WQ.mm=null}}}if(WCH.w!==W){wchReset();WV.boot=true;WV.free=false}
 worldCam(dt||0);const t0=performance.now(),p=G.p,sc=WV.sc,bx=WV.bx,by=WV.by,W_=cv.width,H_=cv.height;WV.f4=reduced?0:Math.floor(now/250);WV.fs=reduced?0:Math.floor(now/140);
 wvFogSync();wvTintTick(WV.boot);const night=WV.night=wvNight(G.hour);
 const vx0=WV.vx0=-bx/sc,vy0=WV.vy0=-by/sc,vx1=WV.vx1=(W_-bx)/sc,vy1=WV.vy1=(H_-by)/sc,AM=WN*WVT;
 const cx0=clamp(Math.floor(vx0/WVP),0,WCH.cols-1),cx1=clamp(Math.floor(vx1/WVP),0,WCH.cols-1),cy0=clamp(Math.floor(vy0/WVP),0,WCH.rows-1),cy1=clamp(Math.floor(vy1/WVP),0,WCH.rows-1);
 wchWork(cx0,cy0,cx1,cy1,vx0,vy0,vx1,vy1);if(WCH.w!==W){WV.boot=true;return}
 wvEastFrame();
 // standing things, back to front
 WSN=0;WV.np=0;WV.tn=0;WV.nc=0;const vis=wvVisFn(),M=40,inV=(x,y)=>x>vx0-M&&x<vx1+M&&y>vy0-M&&y<vy1+M+24,fs=WV.fs,c=G.contract,CM=lkCtrMarks();let turnin=-1;WV.mkn=0;for(let i=0;i<CM.length;i++)if(CM[i].kind==='turnin'){turnin=CM[i].town;break}
 for(let i=0;i<G.towns.length;i++){const o=G.towns[i],x=o.x/WVU,y=o.y/WVU;if(!inV(x,y))continue;const seen=worldSeen(o.x,o.y),so={kind:'town',size:o.size||2,frame:WV.f4%4,night:night>.5};let top=y-7;
  if(seen){const ea=WVE.on&&!!o.east;if(WVHD&&!ea){so.bio=wvTownBio(o,i)}const e=ea?wvEastSpr(WVE.town,'town',so.size,so.night,so.frame):wvSprite((WVHD?'T'+so.bio:'T')+so.size+(so.night?'n':'d')+so.frame,(WVHD?'T'+so.bio:'T')+so.size,'site',so);wvPush(y,e,x,false);top=y+e.y0;
   if(WVA.deco){const dk=wvDecoOf(o,i);if(dk){const DO=WV.deco;DO.size=so.size;DO.frame=so.frame;DO.night=so.night;const e2=wvSprite(dk.key+(so.night?'n':'d')+so.frame,dk.key,'deco',DO);wvPush(y+.001,e2,x,false)}}}
  wvPlateAt(o.name,seen?(i===turnin?'d':'l'):'n',seen?'1':'0',x,top-2);if(i===turnin)WV.mk={x,y:top-13}}
 if(WVE.on){const L=WVE.props;for(let i=0;i<L.length;i++){const o=L[i],x=o.x/WVU,y=o.y/WVU;if(!inV(x,y)||!worldSeen(o.x,o.y))continue;wvPush(y,wvEastProp(o),x,false)}}   // eastern scenery: static sprites (their entries are in the draw list)
 if(G.sites)for(const o of G.sites){const x=o.x/WVU,y=o.y/WVU;if(!inV(x,y)||!worldSeen(o.x,o.y))continue;if(o.kind==='colo'){const e=wvColoSpr(night>.5);wvPush(y,e,x,false);wvPlateAt('Colosseum','d','1',x,y+13);continue}wvPush(y,wvSprite('R'+(o.kind||'ruin')+(o.n|0)%4,'R'+(o.kind||'ruin')+(o.n|0)%4,'site',{kind:o.kind||'ruin',size:1,frame:0,night:false,n:o.n}),x,false)}
 for(let i=0;i<CM.length;i++){const m=CM[i];if(m.kind==='turnin')continue;const x=m.x/WVU,y=m.y/WVU;let top=y-2;
  if(m.kind==='lair'&&inV(x,y)&&vis(m.x,m.y)){const fk=m.f||'bandit',e=wvSprite('L'+fk+WV.f4%4,'L'+fk,'site',{kind:'lair',f:fk,size:c.diff||1,frame:WV.f4%4,night:night>.5});wvPush(y,e,x,false);top=y+e.y0}
  const k=WV.mkn++,Q=WV.mks[k]||(WV.mks[k]={x:0,y:0});Q.x=x;Q.y=top-3}
 if(Array.isArray(G.nests))for(const n of G.nests){if(!n)continue;const x=n.x/WVU,y=n.y/WVU;if(!inV(x,y)||!worldSeen(n.x,n.y))continue;const ti=waNestTierSafe(n),fk=n.f||'bandit';
  wvPush(y,wvSprite('N'+fk+ti+(night>.5?'n':'d')+WV.f4%4,'N'+fk+ti,'site',{kind:'nest',f:fk,tier:ti,frame:WV.f4%4,night:night>.5}),x,false)}
 let pglow=false;for(const o of G.portals){const x=o.x/WVU,y=o.y/WVU;if(!inV(x,y)||!vis(o.x,o.y))continue;pglow=true;wvPush(y,wvSprite('P'+o.realm+fs%12,'P'+o.realm,'site',{kind:'portal',realm:o.realm,size:1,frame:fs%12,night:night>.5}),x,false)}
 const MLON=typeof mlBegin==='function';if(MLON)mlBegin();   // band names (70n-maplabels.js): candidates from the bands drawn
 for(const o of G.parties){const x=o.x/WVU,y=o.y/WVU;let b=WV.bd.get(o.id);if(!b){if(WV.bd.size>200)WV.bd.clear();b={x:o.x,dir:(o.tx||0)<o.x?-1:1,t:-1e9};WV.bd.set(o.id,b)}
  if(Math.abs(o.x-b.x)>.02){b.dir=o.x<b.x?-1:1;b.t=now}else if(o.x!==b.x||Math.abs((o.y-(b.y||0)))>.02)b.t=now;b.x=o.x;b.y=o.y;
  if(o.clash&&typeof cvOf==='function'){const cl=cvOf(o);if(cl)b.dir=o.x<cl.x?1:-1}   // a clash (42-caravans.js): the two face each other and fight on the spot
  if(!inV(x,y)||!vis(o.x,o.y))continue;if(MLON)mlCand(o,x,y);const mv=!!o.clash||now-b.t<200,str=typeof partyStrength==='function'?partyStrength(o):o.mult<.8?1:o.mult<1?2:3,f=mv?fs%12:0;
  if(o.f==='east'&&WVE.on&&o.goal!=='caravan'){wvPush(y,wvEastBand(o,str,f,b.dir,mv),x,true);continue}   // a host of the Shogunate (77-east-art.js)
  if(o.goal==='merc'){const rv=wvRivalArt(o.f),sz=rv.n>8?'L':'s';   // a rival company under its own banner (41-worldart.js waMercPaint); the banner's colours are part of the key
   wvPush(y,wvSprite('Bm'+rv.sig+str+sz+b.dir+(mv?'m':'s')+f,'Bm'+rv.sig+str+sz+b.dir,'band',{f:o.f,str,n:rv.n,frame:f,dir:b.dir,moving:mv,goal:'merc',house:rv.bn}),x,true);continue}
  const hf=o.f==='free'||!!lkHouse(o.f),gl=o.goal==='caravan'||o.goal==='patrol'||o.goal==='raid'?o.goal:hf?'patrol':'',hs=gl==='patrol'||gl==='caravan'?lkHouse(o.f):null;
  const gk=gl==='caravan'&&typeof cvFigKey==='function'?cvFigKey(o):'';   // the guards beside the wagon (42-caravans.js)
  wvPush(y,wvSprite('B'+gl+o.f+str+gk+b.dir+(mv?'m':'s')+f,'B'+gl+o.f+str+gk+b.dir,'band',{f:o.f,str,frame:f,dir:b.dir,moving:mv,goal:gl,house:hs,guard:gk}),x,true)}
 if(typeof SINKS!=='undefined'&&SINKS.length)for(let i=SINKS.length-1;i>=0;i--){const o=SINKS[i],k=(now-o.t)/WVSINK;if(reduced||!(k>=0&&k<1)){SINKS.splice(i,1);continue}const x=o.x/WVU,y=o.y/WVU;if(!inV(x,y))continue;   // the dead going back to their graves at dawn
  wvPush(y,wvSprite('B'+o.f+o.str+o.dir+'s0','B'+o.f+o.str+o.dir,'band',{f:o.f,str:o.str,frame:0,dir:o.dir,moving:false,goal:'',house:null,guard:''}),x,true);WSL[WSN-1].sink=Math.max(.001,k)}
 {if(Math.abs(p.x-WV.lx)>.02){WV.dir=p.x<WV.lx?-1:1}WV.lx=p.x;const mv=!!G.moving&&!sheetOpen,f=fs%12,n=G.roster.length;wvPush(p.y/WVU+.01,wvSprite('C'+n+WV.dir+(mv?'m':'s')+f,'C'+n+WV.dir,'co',{n,frame:f,dir:WV.dir,moving:mv}),p.x/WVU,true)}
 for(let i=1;i<WSN;i++){const s=WSL[i];let j=i-1;while(j>=0&&(WSL[j].y>s.y||(WSL[j].y===s.y&&WSL[j].i>s.i))){WSL[j+1]=WSL[j];j--}WSL[j+1]=s}
 // the edge of sight: the radius eases every frame; the rim canvas is made here so that it follows the radius on skipped frames too
 let rc=null,rD=0,rX=0,rY=0;
 if(WCH.fogOn&&typeof visionRadius==='function'){const tr=Math.max(8,visionRadius()/WVU);if(WV.boot||reduced||!WV.vr)WV.vr=tr;else WV.vr+=(tr-WV.vr)*(1-Math.exp(-(dt||0)*5));
  let R=WV.ringR,k=1;const still=Math.abs(tr-WV.vr)<.75;if(still)WV.vr=tr;    // the rim is redrawn exact once the radius settles; while it moves the old rim is stretched
  if(R<0||(still&&R!==Math.round(tr))||WV.vr/R<.72||WV.vr/R>1.38)R=Math.round(WV.vr);if(!still)k=WV.vr/R;
  rc=wvRing(R);rD=Math.round(rc.width*k*sc)/sc;rX=Math.round((p.x/WVU-rD/2)*sc)/sc;rY=Math.round((p.y/WVU-rD/2)*sc)/sc}
 if(MLON){try{mlLayout(dt,WV.plates,Math.max(1,Math.round(dpr*1.5)))}catch(e){ML.dn=0;if(!ML.warn){ML.warn=1;try{console.warn('world: band names failed: '+(e&&e.message||e))}catch(x){}}}}
 const wk=G.weather&&G.weather.kind,wx=!!(wk&&wk!=='clear'&&WVA.wx),wind=wx?Math.sin(G.day*1.7+Math.floor(G.hour/6)):0,dots=!!(G.moving&&G.path.length);
 // the draw list (see WSG)
 const cvOn=typeof cvDrawMap==='function'&&Array.isArray(G.clashes)&&G.clashes.some(c=>inV(c.x/WVU,c.y/WVU)&&vis(c.x,c.y));
 const escM=typeof escDrawMap==='function'&&typeof escCtr==='function'&&!!escCtr();   // a live escort: its road and the caravan's ring (42-caravans.js)
 let live=dots||(wx&&!reduced)||(pglow&&!reduced)||(cvOn&&!reduced)||escM||(typeof SINKS!=='undefined'&&SINKS.length>0);WSG.n=0;
 wsg(W_);wsg(H_);wsg(sc);wsg(bx);wsg(by);wsg(dpr);wsg(night);wsg(WCH.tk);wsg(WCH.frev);wsg(reduced);wsg(wk);wsg(wind);
 for(let cy=cy0-1;cy<=cy1+1;cy++)for(let cx=cx0-1;cx<=cx1+1;cx++){const ch=wchAt(cx,cy);wsg(ch);if(ch){wsg(ch.ver);wsg(WVHD?ch.fog:ch.comp)}}if(WVHD)wqSig(vx0,vy0,vx1,vy1);
 for(let i=0;i<WSN;i++){const s=WSL[i],e=s.e;wsg(e);wsg(s.x);wsg(s.y);wsg(s.snap);if(WCH.ton&&!e.raw&&e.tk!==WCH.tk)live=true}
 wsg(rc);wsg(rc?WV.ringR:-1);wsg(rD);wsg(rX);wsg(rY);   // the rim canvas is redrawn in place for a new radius
 {const n0=WSG.n,R=G.route;if(R&&R.length>1)for(let i=1;i<R.length;i++){wsg(R[i].x);wsg(R[i].y)}wsg(-1);if(dots&&!G.dest){const e=G.path[G.path.length-1];wsg(e.x);wsg(e.y)}wsg(-2);
  if(c){for(let i=0;i<WV.mkn;i++){wsg(WV.mks[i].x);wsg(WV.mks[i].y)}wsg(-3);if(turnin>=0&&WV.mk&&inV(G.towns[turnin].x/WVU,G.towns[turnin].y/WVU)){wsg(WV.mk.x);wsg(WV.mk.y)}}if(WSG.n>n0+2+(c?1:0)||(c&&turnin>=0))wsg(fs)}   // markers bob with the clock; the destination's beacon and edge arrow pulse
 if(insW){wsg(insW.x);wsg(insW.y);wsg(insW.r);wsg(reduced||(now/260|0)&1)}else wsg(null);
 if(night>.02&&!reduced)for(let i=0;i<G.towns.length;i++){const o=G.towns[i];if(inV(o.x/WVU,o.y/WVU)&&worldSeen(o.x,o.y)){live=true;break}}
 for(let i=0;i<WV.np;i++){const q=WV.plates[i];wsg(q.c);wsg(q.x);wsg(q.y)}
 if(MLON){mlSig(wsg);if(ML.live)live=true}
 if(wvCovered()){WSG.ok=false;for(let i=0;i<WSN;i++)wvSprCv(WSL[i].e);drawVignette(.42+night*.2);WV.boot=false;return}   // under the town view or the map: the sprites still take the light at a drawn frame's pace
 if(WSG.ok&&!live&&!WSG.live&&!WV.boot&&now-WSG.at<1000&&wsgSame()){drawVignette(.42+night*.2);return}
 {const a=WSG.a;WSG.a=WSG.b;WSG.b=a;WSG.pn=WSG.n;WSG.ok=true;WSG.at=now;WSG.live=live}
 g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.imageSmoothingEnabled=false;
 if(vx0<0||vy0<0||vx1>AM||vy1>AM){g.fillStyle=PAL['0'];g.fillRect(0,0,W_,H_)}
 if(WVHD)wqDraw(g,W_,H_,bx,by,sc,vx0,vy0,vx1,vy1,cx0,cy0,cx1,cy1);
 else for(let cy=cy0;cy<=cy1;cy++)for(let cx=cx0;cx<=cx1;cx++){const ch=WCH.list[cy*WCH.cols+cx],x=Math.round(bx+ch.x0*sc),y=Math.round(by+ch.y0*sc);g.drawImage(ch.comp,x,y,Math.round(bx+(ch.x0+WVP)*sc)-x,Math.round(by+(ch.y0+WVP)*sc)-y)}
 g.setTransform(sc,0,0,sc,bx,by);
 if(dots)wvPathDots(vx0,vy0,vx1,vy1);
 if(escM){try{escDrawMap(g,now,reduced)}catch(e){wvFail('escort',e)}}
 for(let i=0;i<WSN;i++){const s=WSL[i];if(s.sink>0)wvDrawSink(s);else wvDrawSprite(s.e,s.x,s.y,s.snap)}
 if(rc){const D=rD,x=rX,y=rY;g.imageSmoothingEnabled=WVHD;g.drawImage(rc,x,y,D,D);g.imageSmoothingEnabled=false;g.fillStyle='rgba(16,29,28,'+(WVDIM/255).toFixed(3)+')';
  if(y>vy0)g.fillRect(vx0,vy0,vx1-vx0,y-vy0);if(y+D<vy1)g.fillRect(vx0,y+D,vx1-vx0,vy1-y-D);if(x>vx0)g.fillRect(vx0,y,x-vx0,D);if(x+D<vx1)g.fillRect(x+D,y,vx1-x-D,D)}
 // markers: route waypoints, the tap destination, the contract
 {const R=G.route;if(R&&R.length>1)for(let i=1;i<R.length;i++)wvMark(R[i].x/WVU,R[i].y/WVU,'waypoint');
  if(G.moving&&G.path.length&&!G.dest){const e=G.path[G.path.length-1];wvMark(e.x/WVU,e.y/WVU,'dest')}
  if(c&&turnin>=0&&G.towns[turnin]){const T=G.towns[turnin];try{wvBeacon(T.x/WVU,T.y/WVU,T.size||2,fs,vx0,vy0,vx1,vy1,sc)}catch(e){wvFail('beacon',e)}}
  if(c){for(let i=0;i<WV.mkn;i++)wvMark(WV.mks[i].x,WV.mks[i].y,'contract');if(turnin>=0&&WV.mk&&inV(G.towns[turnin].x/WVU,G.towns[turnin].y/WVU))wvMark(WV.mk.x,WV.mk.y,'turnin')}}
 if(cvOn){g.save();try{cvDrawMap(g,sc,bx,by,vis,now,reduced)}catch(e){wvFail('clash',e)}g.restore()}   // clashes: the fight over the two parties (42-caravans.js)
 if(insW){const r=Math.round(insW.r/WVU),x=Math.round(insW.x/WVU),y=Math.round(insW.y/WVU),L=Math.max(2,r>>1),on=reduced||(now/260|0)&1;g.fillStyle=PAL['0'];
  for(let k=0;k<2;k++){const o=k?0:1;for(let sx=-1;sx<=1;sx+=2)for(let sy=-1;sy<=1;sy+=2){const ex=x+sx*r,ey=y+sy*r;g.fillRect(Math.min(ex,ex-sx*L)+o,ey+o,L+1,1);g.fillRect(ex+o,Math.min(ey,ey-sy*L)+o,1,L+1)}g.fillStyle=PAL[on?'r':'d']}}
 // soft light: town windows and camp fire at night, rifts always
 g.globalCompositeOperation='lighter';
 if(night>.02){for(let i=0;i<G.towns.length;i++){const o=G.towns[i],x=o.x/WVU,y=o.y/WVU;if(!inV(x,y)||!worldSeen(o.x,o.y))continue;const s=10+5*(o.size||2),fl=reduced?1:.92+.08*Math.sin(now/110+i*3);drawGlow('#ffb04a',x,y-6,s*1.5,s*1.1,night*.5*fl)}
  drawGlow('#ffc070',p.x/WVU,p.y/WVU-6,20,16,night*.34)}
 for(const o of G.portals){const x=o.x/WVU,y=o.y/WVU;if(inV(x,y)&&vis(o.x,o.y))drawGlow('#9a5cff',x,y-10,24,26,.42+(reduced?0:.1*Math.sin(now/400+o.id)))}
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 // weather, in screen space at the art scale
 if(wx){g.setTransform(sc,0,0,sc,0,0);try{if(WVHD&&typeof whWeather==='function')whWeather(g,Math.ceil(W_/sc),Math.ceil(H_/sc),{kind:wk,frame:reduced?0:now/80,wind},WQ.K||WV.s);else drawWeatherPx(g,Math.ceil(W_/sc),Math.ceil(H_/sc),{kind:wk,frame:reduced?0:now/80,wind})}catch(e){wvFail('wx',e)}g.globalAlpha=1;g.globalCompositeOperation='source-over'}
 // name plates
 g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;if(MLON)mlDraw(g);const P=Math.max(1,Math.round(dpr*1.5));for(let i=0;i<WV.np;i++){const q=WV.plates[i],w=q.c.width*(q.hd?1:P),h=q.c.height*(q.hd?1:P);g.drawImage(q.c,Math.round(bx+q.x*sc-w/2),Math.round(by+q.y*sc-h),w,h)}
 g.setTransform(dpr,0,0,dpr,0,0);drawVignette(.42+night*.2);WV.boot=false;WV.cost+=(performance.now()-t0-WV.cost)*.1}

/* ---- what is under a world point: the nearest thing the player can see there, else the tile ---- */
function worldPick(wx,wy,withCompany){if(!G||!W)return null;const pad=Math.max(0,16/wcam.z),hit=(x,y,w,h)=>{const r=Math.max(Math.max(w,h)*WVU*.5+2,pad),cy=y-h*WVU*.45;return Math.hypot(wx-x,wy-cy)<r?{x,y:cy,r:Math.max(w,h)*WVU*.5+3}:null};let b;
 for(let i=0;i<G.towns.length;i++){const o=G.towns[i],bb=wvSiteBox({kind:'town',size:o.size||2});if((b=hit(o.x,o.y,bb.w,bb.h)))return{type:'town',i,o,x:b.x,y:b.y,r:b.r,seen:worldSeen(o.x,o.y)}}
 for(const o of G.portals)if(worldVisible(o.x,o.y)&&(b=hit(o.x,o.y,14,20)))return{type:'portal',o,x:b.x,y:b.y,r:b.r};
 const c=G.contract,CM=lkCtrMarks();for(const m of CM)if(m.kind!=='turnin'&&(b=hit(m.x,m.y,16,14)))return{type:'lair',o:m,c,x:b.x,y:b.y,r:b.r,vis:worldVisible(m.x,m.y)};
 if(Array.isArray(G.nests))for(const n of G.nests)if(n&&worldSeen(n.x,n.y)&&(b=hit(n.x,n.y,22,16)))return{type:'nest',o:n,x:b.x,y:b.y,r:b.r,vis:worldVisible(n.x,n.y)};
 for(const o of G.parties)if(worldVisible(o.x,o.y)&&(b=hit(o.x,o.y,16,14)))return{type:'band',o,x:b.x,y:b.y,r:b.r};
 if(typeof mlPick==='function'){const o=mlPick(wx,wy);if(o&&worldVisible(o.x,o.y))return{type:'band',o,x:o.x,y:o.y-14*WVU*.45,r:16*WVU*.5+3}}   // a band's name plate (70n-maplabels.js)
 if(withCompany&&(b=hit(G.p.x,G.p.y,16,16)))return{type:'company',x:b.x,y:b.y,r:b.r};
 if(G.sites)for(const o of G.sites)if(worldSeen(o.x,o.y)&&(b=hit(o.x,o.y,14,10)))return{type:'site',o,x:b.x,y:b.y,r:b.r};
 if(wx<0||wy<0||wx>=WS||wy>=WS)return null;const tx=Math.floor(wx/TS),ty=Math.floor(wy/TS);return{type:'tile',tx,ty,x:(tx+.5)*TS,y:(ty+.5)*TS,r:TS*.5,seen:worldSeen(wx,wy)}}

/* ---- minimap: one pixel a tile at a whole scale; terrain and fog cached, markers repainted at 8 Hz ---- */
const MM={el:null,w:null,fog:null,fq:null,frev:-1,pk:-1,t:0,s:0,ox:0,oy:0,sig:''};
function wvMiniFog(){const pk=Math.floor(G.p.y/TS)*WN+Math.floor(G.p.x/TS)+(typeof visionRadius==='function'?Math.round(visionRadius()/TS*2)*WN*WN:0);if(MM.w===W&&MM.frev===WCH.frev&&MM.pk===pk)return false;MM.w=W;MM.frev=WCH.frev;MM.pk=pk;
 const hd=WVHD&&typeof wqMini==='function',MW=hd?WN*4:WN;if(!MM.fog){MM.fog=mkCanvas(MW,MW);MM.fq=MM.fog.getContext('2d')}if(MM.fog.width!==MW)MM.fog.width=MM.fog.height=MW;const q=MM.fq;q.globalCompositeOperation='copy';q.drawImage(hd?wqMini():WCH.key,0,0);q.globalCompositeOperation='source-over';MM.hd=hd;
 if(!WCH.fogOn)return true;const im=q.createImageData(WN,WN),d=new Uint32Array(im.data.buffer),u0=wvC32('0'),u1=wvC32('1'),dim=wvC32('1',118),vr=typeof visionRadius==='function'?visionRadius():-1,vis=vr<0&&typeof visibleAt==='function',px=G.p.x,py=G.p.y;
 for(let y=0;y<WN;y++)for(let x=0;x<WN;x++){const i=y*WN+x;if(WCH.fs[i])d[i]=(x+y)&1?u0:u1;else if(vr>=0?Math.hypot((x+.5)*TS-px,(y+.5)*TS-py)>vr:vis&&!visibleAt(x,y))d[i]=dim}
 const s=wvScratch(WN,WN,'c');s.putImageData(im,0,0);if(hd){q.imageSmoothingEnabled=true;q.drawImage(WSC.c,0,0,WN,WN,0,0,MW,MW);q.imageSmoothingEnabled=false}else q.drawImage(WSC.c,0,0,WN,WN,0,0,WN,WN);return true}
function drawMinimap(){const el=$('mini');if(!el||!G||!W||WCH.w!==W)return;if(el!==MM.el){MM.el=el;MM.t=0;MM.sig='';if(typeof wireMinimap==='function')wireMinimap(el)}
 if(now-MM.t<110)return;const cwid=el.clientWidth,chei=el.clientHeight;if(cwid<8||chei<8)return;MM.t=now;const vsb=wvVisFn(),c0=G.contract,pulse=(now/300|0)&1,fogNew=wvMiniFog();let vis='';for(const o of G.parties)if(vsb(o.x,o.y))vis+=((o.x/TS)|0)+'.'+((o.y/TS)|0)+';';
 const sig=(G.p.x/TS*2|0)+','+(G.p.y/TS*2|0)+','+(wcam.x/TS*2|0)+','+(wcam.y/TS*2|0)+','+WV.s+','+G.path.length+','+G.portals.length+','+pulse+','+(c0?c0.type+(c0.done?1:0)+(c0.stage|0):'')+(G.nests?G.nests.length:0)+','+SR.w+','+SR.h+','+cwid+','+vis+(G.route?G.route.length:0);
 if(sig===MM.sig&&!fogNew)return;MM.sig=sig;
 const d=Math.min(3,window.devicePixelRatio||1),w=Math.round(cwid*d),h=Math.round(chei*d);if(el.width!==w||el.height!==h){el.width=w;el.height=h}
 const q=el.getContext('2d'),k=Math.max(1,Math.floor(Math.min(w,h)/WN)),S=k*WN,ox=(w-S)>>1,oy=(h-S)>>1,u=k/TS,th=Math.max(1,k>>1);MM.s=S/WS/d;MM.ox=ox/d;MM.oy=oy/d;
 q.setTransform(1,0,0,1,0,0);q.imageSmoothingEnabled=!!MM.hd;q.fillStyle=PAL['0'];q.fillRect(0,0,w,h);q.drawImage(MM.fog,ox,oy,S,S);q.imageSmoothingEnabled=false;
 const X=v=>ox+Math.floor(v*u),Y=v=>oy+Math.floor(v*u),box=(x,y,r,a,b)=>{q.fillStyle=PAL[a];q.fillRect(x-r-th,y-r-th,2*r+k+2*th,2*r+k+2*th);q.fillStyle=PAL[b];q.fillRect(x-r,y-r,2*r+k,2*r+k)},tile=v=>Math.floor(v/TS)*k;
 if(G.moving&&G.path.length){q.fillStyle=PAL.l;for(const s of G.path)q.fillRect(ox+tile(s.x)+((k-th)>>1),oy+tile(s.y)+((k-th)>>1),th,th)}
 if(G.sites){q.fillStyle=PAL.m;for(const o of G.sites)if(worldSeen(o.x,o.y))q.fillRect(ox+tile(o.x),oy+tile(o.y),k,k)}
 for(const o of G.towns)box(ox+tile(o.x),oy+tile(o.y),((o.size||2)>2?th:0),'0',worldSeen(o.x,o.y)?'c':'m');
 for(const o of G.parties)if(vsb(o.x,o.y)){if(o.goal==='merc'){const a=wvRivalArt(o.f),c1=PAL[a.c1]?a.c1:'g',c2=PAL[a.c2]?a.c2:'l';box(ox+tile(o.x),oy+tile(o.y),th,c2,c1);continue}q.fillStyle=PAL['0'];q.fillRect(ox+tile(o.x)-th,oy+tile(o.y)-th,k+2*th,k+2*th);q.fillStyle=PAL.g;q.fillRect(ox+tile(o.x),oy+tile(o.y),k,k)}
 for(const o of G.portals)if(vsb(o.x,o.y))box(ox+tile(o.x),oy+tile(o.y),pulse?th:0,'D','C');
 if(G.route&&G.route.length>1)for(let i=1;i<G.route.length;i++)box(ox+tile(G.route[i].x),oy+tile(G.route[i].y),0,'0','5');
 if(Array.isArray(G.nests))for(const n of G.nests)if(n&&worldSeen(n.x,n.y))box(ox+tile(n.x),oy+tile(n.y),0,'0','f');
 if(c0)for(const m of lkCtrMarks()){const done=m.kind==='turnin',mx=m.x,my=m.y;
  const x=ox+tile(mx)+(k>>1),y=oy+tile(my)+(k>>1),r=done?k+th*(pulse?3:2):k+(pulse?th:0);/* the destination town: a larger blinking diamond */q.fillStyle=PAL['0'];for(let i=-r-th;i<=r+th;i++){const ww=r+th-Math.abs(i);q.fillRect(x-ww,y+i,2*ww+1,1)}q.fillStyle=PAL[done?'y':'g'];for(let i=-r;i<=r;i++){const ww=r-Math.abs(i);q.fillRect(x-ww,y+i,2*ww+1,1)}}
 // the view
 {const x0=clamp(X(wcam.x+SR.x/wcam.z),ox,ox+S-th),y0=clamp(Y(wcam.y+SR.y/wcam.z),oy,oy+S-th),x1=clamp(X(wcam.x+(SR.x+SR.w)/wcam.z),ox+th,ox+S),y1=clamp(Y(wcam.y+(SR.y+SR.h)/wcam.z),oy+th,oy+S);
  q.fillStyle=PAL.l;q.fillRect(x0,y0,x1-x0,th);q.fillRect(x0,y1-th,x1-x0,th);q.fillRect(x0,y0,th,y1-y0);q.fillRect(x1-th,y0,th,y1-y0)}
 box(ox+tile(G.p.x),oy+tile(G.p.y),th,'r',G.banner&&PAL[G.banner.c1]?G.banner.c1:'5')}   // the company in its banner colour (shell)
function minimapToWorld(el,clientX,clientY){const r=el.getBoundingClientRect();if(!MM.s)return null;return{x:clamp((clientX-r.left-MM.ox)/MM.s,1,WS-1),y:clamp((clientY-r.top-MM.oy)/MM.s,1,WS-1)}}

/* ================= BATTLE =================
   Pixel-perfect isometric scene. Three spaces:
     grid   (c,r)       rules; never changes with the camera
     board  (x,y)       what the camera looks at; a tile is 64x32, tpos(c,r,h) is the centre of a tile top
     art    (x,y)       board/2; one unit is one art pixel, a tile top is a 32x16 diamond, a height step 8
   VIEW.rot (0..3 quarter turns) maps grid to view coordinates (vc,vr); everything below draws and picks in view
   order, so rotation is one table rebuild. cam.s is the integer number of backing-store pixels per art pixel
   (artScale()); cam.z = cam.s/(2*dpr) is CSS px per board unit and is only fractional while a zoom animates.
   Static ground is cached per rotation as one 1:1 art-pixel strip per screen diagonal (blitted nearest-neighbour
   at the integer scale, so one cache serves every zoom); props and units are drawn between the strips.
   Art comes from 71-tiles / 73-units / 74-anim when those exist; each call falls back to the old vector look. */
const VIEW={rot:0,heights:false,anim:null};
const NT=BW*BH,ND=BW+BH-1,ROTK=[.72,.42,.16,.16,.42,.72],ROTMS=34;
const HAVE={init:false,tile:false,prop:false,box:false,sky:false,tint:false,sprite:false,pose:false,over:false,warn:{}};
function haveInit(){HAVE.init=true;HAVE.tile=typeof drawTilePx==='function';HAVE.prop=typeof drawPropPx==='function';HAVE.box=typeof propBoxPx==='function';HAVE.sky=typeof drawBackdropPx==='function';
 HAVE.tint=typeof sceneTint==='function';HAVE.sprite=typeof unitSpritePx==='function';HAVE.pose=typeof unitPose==='function';HAVE.over=typeof drawUnitOverlayPx==='function'}
function artFail(n,e){HAVE[n]=false;if(!HAVE.warn[n]){HAVE.warn[n]=1;try{console.warn('board: '+n+' art failed, using the fallback: '+(e&&e.message||e))}catch(x){}}if(n==='tile'||n==='prop'||n==='tint')viewInvalidate()}
function vcOf(c,r,k){return k===0?c:k===1?BH-1-r:k===2?BW-1-c:r}
function vrOf(c,r,k){return k===0?r:k===1?c:k===2?BH-1-r:BW-1-c}
function vKey(vc,vr,k){if(vc<0||vr<0||vc>=(k&1?BH:BW)||vr>=(k&1?BW:BH))return -1;return k===0?vr*BW+vc:k===1?(BH-1-vc)*BW+vr:k===2?(BH-1-vr)*BW+BW-1-vc:vc*BW+BW-1-vr}
// Overrides the rot-0 tpos of 60-battle-core.js (same values at VIEW.rot 0; fractional c,r allowed).
function tpos(c,r,h){const k=VIEW.rot,vc=vcOf(c,r,k),vr=vrOf(c,r,k);return{x:(vc-vr)*HW,y:(vc+vr)*HH-h*HL}}
// Grid direction -> screen direction: 0 bottom-right, 1 bottom-left, 2 top-left, 3 top-right.
function screenDir(dc,dr){const k=VIEW.rot;let a=dc,b=dr;if(k===1){a=-dr;b=dc}else if(k===2){a=-dc;b=-dr}else if(k===3){a=dr;b=-dc}return a>0?0:b>0?1:a<0?2:b<0?3:1}
let ARTSC_O=0;   // set only while the title draws its figures (89-title.js)
function artScale(){return ARTSC_O||B&&B.cam&&B.cam.s||1}
function boardXY(sx,sy){const c=B.cam;return{x:(sx-VC.x)/c.z+c.x,y:(sy-VC.y)/c.z+c.y}}

/* ---- camera ---- */
const BB={x0:-BH*HW,x1:BW*HW,y0:-HH-3*HL-72,y1:(BW+BH-2)*HH+HH+2*HL+8};   // board bounds in board space (unit headroom above, skirt below)
function setBB(){const o=VIEW.rot&1;BB.x0=-(o?BW:BH)*HW;BB.x1=(o?BH:BW)*HW}
function fitBattle(reset){const cam=B.cam,bw=(BB.x1-BB.x0)/2,bh=(BB.y1-BB.y0)/2,fit=Math.floor(Math.min(SR.w*dpr/bw,SR.h*dpr/bh)),read=Math.ceil(40*dpr/32);
 // default: the largest integer scale that shows the whole board, but never tiles under 40 CSS px wide (then the camera follows the active unit)
 cam.sdef=Math.max(1,fit,read);cam.smin=Math.max(1,Math.min(Math.max(fit,Math.ceil(cam.sdef/2)),cam.sdef));cam.smax=Math.max(cam.sdef+2,Math.round(4*dpr));
 cam.s=clamp(reset||!cam.uz||!cam.s?cam.sdef:Math.round(cam.z*2*dpr),cam.smin,cam.smax);cam.zt=cam.s/(2*dpr);cam.zmin=cam.smin/(2*dpr)*.8;cam.zmax=cam.smax/(2*dpr)*1.15;
 if(reset||reduced||!cam.z)cam.z=cam.zt;if(cam.zax==null){cam.zax=VC.x;cam.zay=VC.y}clampCam(cam)}
function layoutBattle(){if(typeof document!=='undefined')setRes();refreshScene();const cam=B.cam;VIEW.rot=0;VIEW.anim=null;setBB();viewBuild();reseatUnits();
 cam.uz=false;cam.pinch=false;cam.x=cam.tx=(BB.x0+BB.x1)/2;cam.y=cam.ty=(BB.y0+BB.y1)/2;cam.ltx=cam.tx;cam.lty=cam.ty;cam.zax=VC.x;cam.zay=VC.y;fitBattle(true);
 HOV.k=-1;HOV.pk=-2;OV.sig=null;OV.targets=0;if(typeof fxReset==='function')fxReset()}
function clampCam(cam){const hw=SR.w/2/cam.z,hh=SR.h/2/cam.z,bw=BB.x1-BB.x0,bh=BB.y1-BB.y0;
 // the view may slide past the board edge by up to 30% of itself, never more; a board smaller than the view stays centered
 let m=Math.min(hw*.6,Math.max(0,bw-2*hw)),lo=BB.x0+hw-m,hi=BB.x1-hw+m;if(lo>hi)lo=hi=(BB.x0+BB.x1)/2;cam.tx=clamp(cam.tx,lo,hi);cam.x=clamp(cam.x,lo,hi);
 m=Math.min(hh*.6,Math.max(0,bh-2*hh));lo=BB.y0+hh-m;hi=BB.y1-hh+m;if(lo>hi)lo=hi=(BB.y0+BB.y1)/2;cam.ty=clamp(cam.ty,lo,hi);cam.y=clamp(cam.y,lo,hi)}
function updateBattleCam(dt){const cam=B.cam,u=B.cur;
 if(cam.z!==cam.zt&&!cam.pinch){const z0=cam.z;let z1=reduced?cam.zt:z0+(cam.zt-z0)*(1-Math.exp(-dt*22));if(Math.abs(cam.zt-z1)<.006*cam.zt)z1=cam.zt;   // zoom eases, then lands exactly on the integer scale
  const ax=(cam.zax-VC.x)*(1/z0-1/z1),ay=(cam.zay-VC.y)*(1/z0-1/z1);cam.z=z1;cam.x+=ax;cam.y+=ay;cam.tx+=ax;cam.ty+=ay;cam.ltx=cam.tx;cam.lty=cam.ty}
 if(cam.hold){cam.tx=cam.x;cam.ty=cam.y}
 else{if(u&&u.alive&&now-(cam.ut||0)>1800){const v=VIS.get(u);if(v&&now-v.t0<v.dur+80){cam.tx=u.sx;cam.ty=u.sy-10}}
  if(cam.tx!==cam.ltx||cam.ty!==cam.lty){const dx=(cam.tx-cam.x)*cam.z,dy=(cam.ty-cam.y)*cam.z;if(Math.abs(dx)<SR.w*.27&&Math.abs(dy)<SR.h*.24){cam.tx=cam.x;cam.ty=cam.y}}}   // dead zone: no swing if already comfortably in view
 clampCam(cam);cam.ltx=cam.tx;cam.lty=cam.ty;const k=reduced?1:1-Math.exp(-dt*6);cam.x+=(cam.tx-cam.x)*k;cam.y+=(cam.ty-cam.y)*k}
/* zoom: steps for wheel and keys, free while pinching, then a snap to the nearest integer scale */
function zoomStep(dir,sx,sy){if(!B||!B.cam)return;const c=B.cam,s=clamp((c.pinch?Math.round(c.z*2*dpr):c.s)+(dir>0?1:-1),c.smin,c.smax);c.pinch=false;c.zax=sx==null?VC.x:sx;c.zay=sy==null?VC.y:sy;
 if(s===c.s&&c.z===c.zt)return;c.s=s;c.zt=s/(2*dpr);c.uz=true;c.ut=now}
function zoomFree(sx,sy,f){const c=B.cam,z0=c.z,z1=clamp(z0*f,c.zmin||.2,c.zmax||4);if(z1===z0)return;if(!c.pinch){c.pinch=true;c.ps=c.s}
 const bx=(sx-VC.x)/z0+c.x,by=(sy-VC.y)/z0+c.y;c.z=z1;c.uz=true;c.ut=now;c.zax=sx;c.zay=sy;c.x=c.tx=bx-(sx-VC.x)/z1;c.y=c.ty=by-(sy-VC.y)/z1;clampCam(c);c.ltx=c.tx;c.lty=c.ty}
function zoomSnap(){if(!B||!B.cam||!B.cam.pinch)return;const c=B.cam,f=c.z*2*dpr,s0=c.ps||c.s;c.pinch=false;   // a third of a step past the starting scale is enough to change it
 c.s=clamp(f>=s0?Math.floor(f+.67):Math.ceil(f-.67),c.smin,c.smax);c.zt=c.s/(2*dpr);c.ut=now}
/* rotation: the view squashes shut in three steps, the grid turns, and it opens again (instant under reduced motion) */
function rotateView(dir){if(!B||mode!=='battle'||!B.cam)return;dir=dir<0?-1:1;if(reduced||SPEEDF===0||typeof requestAnimationFrame!=='function'){applyRot(dir);return}
 if(VIEW.anim){VIEW.anim.q=clamp(VIEW.anim.q+dir,-3,3);return}VIEW.anim={t0:now,dir,q:0,sw:false}}
function rotStep(){const A=VIEW.anim;if(!A)return 1;const i=Math.floor((now-A.t0)/ROTMS);if(i>=3&&!A.sw){A.sw=true;applyRot(A.dir)}
 if(i>=6||i<0){const q=A.q;VIEW.anim=null;if(q){const d=q<0?-1:1;VIEW.anim={t0:now,dir:d,q:q-d,sw:false};return ROTK[0]}return 1}return ROTK[i]}
function applyRot(dir){const cam=B.cam,k0=VIEW.rot,a=cam.x/HW,b=cam.y/HH,vc=(a+b)/2,vr=(b-a)/2;let c,r;   // the ground point at the view centre stays there
 if(k0===0){c=vc;r=vr}else if(k0===1){c=vr;r=BH-1-vc}else if(k0===2){c=BW-1-vc;r=BH-1-vr}else{c=BW-1-vr;r=vc}
 VIEW.rot=(k0+dir+4)&3;viewEnsure();V=RVW[VIEW.rot];setBB();const p=tpos(c,r,0);cam.x=cam.tx=p.x;cam.y=cam.ty=p.y;cam.ut=now;clampCam(cam);cam.ltx=cam.tx;cam.lty=cam.ty;
 reseatUnits();HOV.k=-1;HOV.pk=-2;OV.sig=null;OV.targets=0;HC.t=0;if(typeof fxReset==='function')fxReset();if(typeof Inspect!=='undefined'&&Inspect.visible)Inspect.hide();
 if(typeof FC!=='undefined'&&FC.t&&typeof fcPlace==='function')fcPlace()}
function reseatUnits(){if(!B||!B.units)return;for(let i=0;i<B.units.length;i++){const u=B.units[i];if(u.c==null)continue;const p=ufoot(u),v=VIS.get(u);u.sx=p.x;u.sy=p.y;
  if(v){v.c=u.c;v.r=u.r;v.fx=v.tx=p.x;v.fy=v.ty=p.y;v.mv=false;v.lift=0;v.kx=v.ky=0;v.depth=v.pd=udepth(u,V)}}
 if(B.floats)for(const f of B.floats)if(f.u){f.x=f.u.sx;f.y=f.u.sy-52}if(B.shots)B.shots.length=0}
function toggleHeights(){VIEW.heights=!VIEW.heights;OV.sig=null;if(B&&typeof updateBUI==='function')updateBUI()}

/* ---- view tables: per rotation, per tile: art position, depth, exposed cliff steps, cast-shadow steps ---- */
function mkRV(rot){const R={rot,tiles:null,ax:new Int16Array(NT),ay:new Int16Array(NT),dp:new Uint8Array(NT),vc:new Uint8Array(NT),vr:new Uint8Array(NT),dl:new Uint8Array(NT),dr:new Uint8Array(NT),sl:new Uint8Array(NT),sr:new Uint8Array(NT),
  ord:new Int16Array(NT),ds:new Int16Array(ND+1),x0:new Int16Array(ND),y0:new Int16Array(ND),w:new Int16Array(ND),h:new Int16Array(ND),built:new Uint8Array(ND),nb:0,cv:[],ov:[],ovOn:new Uint8Array(ND),props:[],anim:[]};
 for(let d=0;d<ND;d++)R.props.push([]);return R}
const RVW=[mkRV(0),mkRV(1),mkRV(2),mkRV(3)];let V=RVW[0];
const TL={hazAll:[],scale:1,k:1,trim:false};           // TL.hazAll: keys of hazard tiles (read by the effects)
function viewTables(R){const k=R.rot,tl=B.tiles,vw=k&1?BH:BW,vh=k&1?BW:BH;let n=0;R.tiles=tl;
 const hn=(a,b)=>{const j=vKey(a,b,k);return j<0?-1:tl[j].h};
 for(let d=0;d<ND;d++){R.ds[d]=n;R.props[d].length=0;let xa=1e9,xb=-1e9,ya=1e9,yb=-1e9;
  for(let vc=Math.max(0,d-vh+1);vc<=Math.min(vw-1,d);vc++){const vr=d-vc,q=vKey(vc,vr,k),t=tl[q],h=t.h,x=(vc-vr)*16,y=d*8-h*8,l=hn(vc,vr+1),rr_=hn(vc+1,vr),bl=hn(vc-1,vr),br=hn(vc,vr-1);
   R.ax[q]=x;R.ay[q]=y;R.dp[q]=d;R.vc[q]=vc;R.vr[q]=vr;R.dl[q]=l<0?h+2:Math.max(0,h-l);R.dr[q]=rr_<0?h+2:Math.max(0,h-rr_);R.sl[q]=Math.max(0,bl-h);R.sr[q]=Math.max(0,br-h);R.ord[n++]=q;if(t.t==='block')R.props[d].push(q);
   xa=Math.min(xa,x-18);xb=Math.max(xb,x+18);ya=Math.min(ya,y-24);yb=Math.max(yb,y+10+Math.max(R.dl[q],R.dr[q])*8)}
  R.x0[d]=xa;R.y0[d]=ya;R.w[d]=xb-xa;R.h[d]=yb-ya;R.built[d]=0;R.ovOn[d]=0}
 R.ds[ND]=n;R.nb=0;R.anim.length=0}
function viewBuild(){if(!B||!B.tiles)return;if(!HAVE.init)haveInit();TL.k=tileK();TL.trim=false;for(let i=0;i<4;i++)viewTables(RVW[i]);V=RVW[VIEW.rot];PROPC.clear();PANIM.length=0;ANI.R=null;OV.sig=null;OV.targets=0;
 TL.hazAll.length=0;for(let i=0;i<NT;i++)if(B.tiles[i].t==='haz')TL.hazAll.push(i);tintRefresh();TN.at=now}
/* ground strip pixels per art pixel: 2 for the HD tiles (71h-tileshd.js) once the camera shows at least 2 backing px per art
   pixel, else 1 (the 1x tiles); 2 for the vector fallback */
function tileK(){if(!HAVE.tile)return 2;return typeof drawTileHD==='function'&&typeof hdOK==='function'&&hdOK()&&!(B&&B.cam&&B.cam.s<2)?2:1}
function stripsReset(){TL.trim=false;PROPC.clear();PANIM.length=0;for(let i=0;i<4;i++){const R=RVW[i];R.built.fill(0);R.nb=0;R.anim.length=0}ANI.R=null}
function viewInvalidate(){RVW[0].tiles=null}
function viewEnsure(){if(RVW[0].tiles!==B.tiles)viewBuild();return V}

/* ---- lighting tint, baked into every cached canvas (never applied per frame, never over the HUD) ---- */
const TN={k:'',on:false,mul:'#ffffff',add:'#000000',a:0,sc:null,at:0};
function tintRefresh(){let t=null;if(HAVE.tint){try{t=sceneTint(B.bk,typeof G!=='undefined'&&G&&typeof G.hour==='number'?G.hour:12)}catch(e){artFail('tint',e)}}
 const k=t&&t.a>0?(t.mul||'#ffffff')+'|'+(t.add||'#000000')+'|'+(+t.a).toFixed(3):'';if(k===TN.k)return false;TN.k=k;TN.on=!!k;if(k){TN.mul=t.mul||'#ffffff';TN.add=t.add||'#000000';TN.a=Math.min(1,t.a)}return true}
function tintCanvas(c){if(!TN.on)return c;const w=c.width,h=c.height,s=TN.sc||(TN.sc=mkCanvas(64,64));if(s.width<w)s.width=w;if(s.height<h)s.height=h;
 const sq=s.getContext('2d'),q=c.getContext('2d');sq.setTransform(1,0,0,1,0,0);sq.clearRect(0,0,w,h);sq.drawImage(c,0,0);
 q.save();q.setTransform(1,0,0,1,0,0);q.globalAlpha=TN.a;q.globalCompositeOperation='multiply';q.fillStyle=TN.mul;q.fillRect(0,0,w,h);
 if(TN.add!=='#000000'){q.globalCompositeOperation='lighter';q.fillStyle=TN.add;q.fillRect(0,0,w,h)}
 q.globalAlpha=1;q.globalCompositeOperation='destination-in';q.drawImage(s,0,0,w,h,0,0,w,h);q.restore();return c}
const TINTED=new WeakMap(),SILS=new WeakMap();
function tintedOf(c){if(!TN.on)return c;let e=TINTED.get(c);if(e&&e.k===TN.k)return e.c;const t=mkCanvas(c.width,c.height);t.getContext('2d').drawImage(c,0,0);tintCanvas(t);if(c.hdk)t.hdk=c.hdk;TINTED.set(c,{k:TN.k,c:t});return t}
function silOf(c,col){let m=SILS.get(c);if(!m){m={};SILS.set(c,m)}let s=m[col];if(s)return s;s=m[col]=mkCanvas(c.width,c.height);const q=s.getContext('2d');q.drawImage(c,0,0);q.globalCompositeOperation='source-in';q.fillStyle=PAL[col];q.fillRect(0,0,s.width,s.height);if(c.hdk)s.hdk=c.hdk;return s}

/* ---- ground strips ---- */
const TO={bk:'',t:'ground',h:0,c:0,r:0,dropL:0,dropR:0,shL:0,shR:0,frame:0,hd:false},PO={bk:'',c:0,r:0,frame:0,hd:false};
function tileFrame(){return reduced?0:Math.floor(now/166)}
function drawTile(q,R,k,frame){const t=B.tiles[k];
 if(HAVE.tile){TO.bk=B.bk;TO.t=t.t;TO.h=t.h;TO.c=k%BW;TO.r=(k/BW)|0;TO.dropL=R.dl[k];TO.dropR=R.dr[k];TO.shL=R.sl[k];TO.shR=R.sr[k];TO.frame=frame;TO.hd=TL.k===2;
  try{return drawTilePx(q,R.ax[k],R.ay[k],TO)===true}catch(e){artFail('tile',e);return false}}
 drawTileOld(q,R.ax[k],R.ay[k],t,k%BW,(k/BW)|0,R.dl[k],R.dr[k],R.sl[k],R.sr[k]);return false}
function buildStrip(R,d){const K=TL.k,c=R.cv[d]||(R.cv[d]=mkCanvas(1,1));c.width=R.w[d]*K;c.height=R.h[d]*K;const q=c.getContext('2d'),f=tileFrame();q.imageSmoothingEnabled=false;q.setTransform(K,0,0,K,-R.x0[d]*K,-R.y0[d]*K);
 for(let i=R.ds[d];i<R.ds[d+1];i++){const k=R.ord[i];if(drawTile(q,R,k,f)&&R.tiles)R.anim.push(k)}
 tintCanvas(c);R.built[d]=1;R.nb++}
function stripsEnsure(R){if(R.nb<ND){for(let d=0;d<ND;d++)if(!R.built[d]&&R.tiles)buildStrip(R,d);return}
 for(let i=1;i<4;i++){const O=RVW[(R.rot+i)&3];if(O.nb<ND&&O.tiles){for(let d=0;d<ND;d++)if(!O.built[d]){buildStrip(O,d);return}}}   // other rotations fill in one strip a frame
 if(!TL.trim&&TL.k===2&&typeof hdTrim==='function'){TL.trim=true;hdTrim()}}   // every strip is built: the HD tile canvases are dead weight (animated ones repaint on demand)
// Animated tiles and props repaint at the 6 Hz tile clock, spread over the frames in between.
const ANI={R:null,f:-1,i:0},ASC={cv:null};
function redrawTile(R,k,f){const d=R.dp[k],K=TL.k;
 if(!TN.on){const q=R.cv[d].getContext('2d');q.setTransform(1,0,0,1,0,0);q.clearRect((R.ax[k]-16-R.x0[d])*K,0,32*K,R.h[d]*K);q.setTransform(K,0,0,K,-R.x0[d]*K,-R.y0[d]*K);drawTile(q,R,k,f);return}   // a column is its tile's alone: clear and repaint in place
 const w=32*K,h=R.h[d]*K,s=ASC.cv||(ASC.cv=mkCanvas(64,64));if(s.width!==w||s.height<h){s.width=w;s.height=Math.max(s.height,h)}
 const q=s.getContext('2d');q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,w,s.height);q.imageSmoothingEnabled=false;q.setTransform(K,0,0,K,-(R.ax[k]-16)*K,-R.y0[d]*K);drawTile(q,R,k,f);
 if(TN.on){const t=ASC.t||(ASC.t=mkCanvas(64,64));if(t.width!==w||t.height!==h){t.width=w;t.height=h}const tq=t.getContext('2d');tq.clearRect(0,0,w,h);tq.drawImage(s,0,0);tintCanvas(t);q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,w,s.height);q.drawImage(t,0,0)}
 const sq=R.cv[d].getContext('2d'),x=(R.ax[k]-16-R.x0[d])*K;sq.setTransform(1,0,0,1,0,0);sq.clearRect(x,0,w,h);sq.drawImage(s,0,0,w,h,x,0,w,h)}
function animTick(R){const n=R.anim.length+PANIM.length;if(!n||reduced||R.nb<ND)return;const f=tileFrame();
 if(ANI.R!==R||ANI.i>=n){if(ANI.R===R&&ANI.f===f)return;ANI.R=R;ANI.f=f;ANI.i=0}
 const t0=performance.now();for(let j=Math.max(1,Math.ceil(n/8));j>0&&ANI.i<n;j--,ANI.i++){const i=ANI.i;if(i<R.anim.length)redrawTile(R,R.anim[i],ANI.f);else propPaint(PANIM[i-R.anim.length],ANI.f);if(performance.now()-t0>1.2)j=1}}
/* fallback ground (no 71-tiles.js): the old vector look, at 2 px per art pixel */
function drawTileOld(q,x,y,t,c,r,dL,dR,sL,sR){const P=B.P,haz=t.t==='haz',base=haz?'#3b1711':t.t==='rough'?P.rough:P.top,f=haz?0:t.h*.06-((c+r)&1)*.03+(hash2(c,r,0)-.5)*.05;
 q.save();q.translate(x,y);q.scale(.5,.5);
 if(dL){q.fillStyle=shade(P.side,-.2);q.beginPath();q.moveTo(-HW,0);q.lineTo(0,HH);q.lineTo(0,HH+dL*HL);q.lineTo(-HW,dL*HL);q.fill()}
 if(dR){q.fillStyle=shade(P.side,-.5);q.beginPath();q.moveTo(HW,0);q.lineTo(0,HH);q.lineTo(0,HH+dR*HL);q.lineTo(HW,dR*HL);q.fill()}
 q.fillStyle=shade(base,f);q.beginPath();q.moveTo(0,-HH);q.lineTo(HW,0);q.lineTo(0,HH);q.lineTo(-HW,0);q.closePath();q.fill();q.save();q.clip();
 if(haz){q.strokeStyle='#ff8a2a';q.lineWidth=2;q.beginPath();for(let i=0;i<4;i++){let px=(hash2(c,r,i+2)-.5)*14,py=(hash2(c,r,i+7)-.5)*6;q.moveTo(px,py);const a=i*1.57+hash2(c,r,i)*1.2;for(let j=1;j<=3;j++){px+=Math.cos(a+(hash2(c,r,i*5+j)-.5)*1.4)*9;py+=Math.sin(a+(hash2(c,r,i*3+j)-.5)*1.4)*4.5;q.lineTo(px,py)}}q.stroke()}
 else{for(let i=0;i<6;i++){q.fillStyle=hash2(c,r,i+30)<.5?'rgba(255,255,255,.07)':'rgba(0,0,0,.08)';q.fillRect((hash2(c,r,i+10)-.5)*46,(hash2(c,r,i+20)-.5)*20,4+hash2(c,r,i+40)*6,2)}
  if(t.t==='rough'){q.strokeStyle=shade(base,-.38);q.lineWidth=2;q.beginPath();for(let i=0;i<7;i++){const px=(hash2(c,r,i+60)-.5)*40,py=(hash2(c,r,i+70)-.5)*17;q.moveTo(px-2,py);q.lineTo(px-1,py-5);q.moveTo(px+2,py);q.lineTo(px+3,py-4)}q.stroke()}}
 if(sL){q.fillStyle=`rgba(6,12,18,${Math.min(.5,.2+sL*.12)})`;q.beginPath();q.moveTo(-HW,0);q.lineTo(0,-HH);q.lineTo(8,-HH+4);q.lineTo(-HW+8,4);q.fill()}
 if(sR){q.fillStyle=`rgba(6,12,18,${Math.min(.4,.14+sR*.1)})`;q.beginPath();q.moveTo(HW,0);q.lineTo(0,-HH);q.lineTo(-8,-HH+4);q.lineTo(HW-8,4);q.fill()}
 q.restore();q.strokeStyle='rgba(0,0,0,.22)';q.lineWidth=1;q.beginPath();q.moveTo(0,-HH);q.lineTo(HW,0);q.lineTo(0,HH);q.lineTo(-HW,0);q.closePath();q.stroke();q.restore()}
function drawPropOld(q,x,y){const P=B.P;let gr;q.save();q.translate(x,y);q.scale(.5,.5);x=0;y=0;
 if(P.obj==='tree'){const sn=B.bk==='snow',lf=sn?'#4f7563':B.bk==='swamp'?'#33503a':'#2f5a2c';q.fillStyle='#4a3826';q.fillRect(x-3,y-16,6,19);q.fillStyle='#34271a';q.fillRect(x,y-16,3,19);
  for(let i=0;i<3;i++){const ty=y-58+i*13,by=y-30+i*10,w=11+i*4;q.fillStyle=shade(lf,-.12+i*.02);q.beginPath();q.moveTo(x,ty);q.lineTo(x+w,by);q.lineTo(x-w,by);q.fill();q.fillStyle=shade(lf,.16);q.beginPath();q.moveTo(x,ty);q.lineTo(x-w,by);q.lineTo(x-w*.25,by);q.fill();
   if(sn){q.fillStyle='rgba(240,246,252,.9)';q.beginPath();q.moveTo(x,ty);q.lineTo(x+w*.5,ty+(by-ty)*.5);q.lineTo(x,ty+(by-ty)*.38);q.lineTo(x-w*.5,ty+(by-ty)*.5);q.fill()}}}
 else if(P.obj==='crystal'){gr=q.createLinearGradient(x-12,y-46,x+8,y+2);gr.addColorStop(0,'#e6fbff');gr.addColorStop(.5,'#8fdcf5');gr.addColorStop(1,'#4a8fb8');q.fillStyle=gr;q.beginPath();q.moveTo(x-4,y-46);q.lineTo(x+8,y-18);q.lineTo(x+2,y+2);q.lineTo(x-12,y-6);q.fill();
  q.fillStyle='rgba(255,255,255,.4)';q.beginPath();q.moveTo(x-4,y-46);q.lineTo(x-1,y-14);q.lineTo(x-12,y-6);q.fill();q.fillStyle='#8a5cc8';q.beginPath();q.moveTo(x+10,y-30);q.lineTo(x+16,y-8);q.lineTo(x+6,y+2);q.fill()}
 else{q.fillStyle='#6f6a62';q.beginPath();q.moveTo(x-16,y+2);q.lineTo(x-10,y-20);q.lineTo(x+4,y-28);q.lineTo(x+17,y-8);q.lineTo(x+12,y+5);q.fill();q.fillStyle='#9a958b';q.beginPath();q.moveTo(x-16,y+2);q.lineTo(x-10,y-20);q.lineTo(x+4,y-28);q.lineTo(x,y-8);q.lineTo(x-4,y+4);q.fill();
  if(B.bk==='snow'){q.fillStyle='rgba(240,246,252,.85)';q.beginPath();q.moveTo(x-10,y-20);q.lineTo(x+4,y-28);q.lineTo(x+10,y-18);q.lineTo(x,y-21);q.lineTo(x-6,y-15);q.fill()}}
 q.restore()}

/* ---- props: one cached sprite per obstacle; they fade when they hide a unit or the hovered tile ---- */
const PROPC=new Map(),PANIM=[];
function propOf(k){let p=PROPC.get(k);if(p)return p;const c=k%BW,r=(k/BW)|0;let w=36,h=34;
 if(HAVE.prop&&HAVE.box){try{const b=propBoxPx(B.bk,c,r);if(b&&b.w>0&&b.h>0){w=Math.ceil(b.w);h=Math.ceil(b.h)}}catch(e){artFail('box',e)}}
 const K=HAVE.prop?propK():2;p={k,c,r,w,h,K,cw:w+12,ch:h+26,ox:(w+12)>>1,oy:h+12,a:1,anim:false,cv:null};p.cv=mkCanvas(p.cw*K,p.ch*K);PROPC.set(k,p);if(propPaint(p,tileFrame())){p.anim=true;PANIM.push(p)}return p}
/* prop sprite pixels per art pixel: 2 (the HD props of 71p-propshd.js) whenever the ground strips are HD, else 1 */
function propK(){return TL.k===2&&HAVE.tile&&typeof txPropHD==='function'&&typeof hpOK==='function'&&hpOK()?2:1}
function propPaint(p,f){const q=p.cv.getContext('2d'),K=p.K;let an=false;q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,p.cv.width,p.cv.height);q.imageSmoothingEnabled=false;q.setTransform(K,0,0,K,p.ox*K,p.oy*K);
 if(HAVE.prop){PO.bk=B.bk;PO.c=p.c;PO.r=p.r;PO.frame=f;PO.hd=K===2;try{an=drawPropPx(q,0,0,PO)===true}catch(e){artFail('prop',e)}}else drawPropOld(q,0,0);
 tintCanvas(p.cv);return an}
function propFade(R,dt){const us=B.units,hk=HOV.k>=0?HOV.k:insK,st=reduced?1:dt*7;
 for(let d=0;d<ND;d++){const L=R.props[d];for(let i=0;i<L.length;i++){const k=L[i],p=propOf(k),x0=R.ax[k]-p.w/2+3,x1=R.ax[k]+p.w/2-3,y0=R.ay[k]-p.h+3,y1=R.ay[k]+2;let hid=false;
   for(let j=0;j<us.length&&!hid;j++){const u=us[j];if(!u.alive)continue;const v=VIS.get(u);if(!v||v.depth>=d)continue;const x=u.sx/2,y=u.sy/2,top=umon(u).kind?umon(u).top-6:u.def&&u.def.big?40:25;hid=x+5>x0&&x-5<x1&&y-4>y0&&y-top<y1}
   if(!hid&&hk>=0&&R.dp[hk]<d){const x=R.ax[hk],y=R.ay[hk];hid=x+8>x0&&x-8<x1&&y+3>y0&&y-3<y1}
   const ta=hid?.4:1;p.a=p.a<ta?Math.min(ta,p.a+st):Math.max(ta,p.a-st)}}}
function drawProps(R,d){const L=R.props[d];for(let i=0;i<L.length;i++){const k=L[i],p=propOf(k);g.globalAlpha=p.a;g.drawImage(p.cv,R.ax[k]-p.ox,R.ay[k]-p.oy,p.cw,p.ch)}g.globalAlpha=1}

/* ---- pixel sprites made here: tile overlays, shadows, a 5x7 number font, pills ---- */
// The tile top as 71-tiles draws it: 15 rows (y-7..y+7) of 4,8,..,32,..,8,4 px inside a 32x16 box whose row 8 is the centre row.
const dmIn=(x,y,k)=>{const a=Math.abs(y-8),hw=16-2*a-2*k;return a<=7-k&&x-16>=-hw&&x-16<hw};
const OVM={fill:(x,y)=>dmIn(x,y,0),ring:(x,y)=>dmIn(x,y,0)&&!dmIn(x,y,1),ring2:(x,y)=>dmIn(x,y,0)&&!dmIn(x,y,2),
 nw:(x,y)=>OVM.ring(x,y)&&x<16&&y<=8,ne:(x,y)=>OVM.ring(x,y)&&x>=16&&y<=8,se:(x,y)=>OVM.ring(x,y)&&x>=16&&y>8,sw:(x,y)=>OVM.ring(x,y)&&x<16&&y>8,
 dash:(x,y)=>OVM.ring(x,y)&&!(x>>2&1),brk:(x,y)=>OVM.ring2(x,y)&&(Math.abs(x+.5-16)>=10||Math.abs(y-8)>=5)};
const OVC=new Map();
function ovSpr(n,col){const id=n+col;let c=OVC.get(id);if(c)return c;c=mkCanvas(32,16);const q=c.getContext('2d'),f=OVM[n];q.fillStyle=PAL[col]||col;for(let y=0;y<16;y++)for(let x=0;x<32;x++)if(f(x,y))q.fillRect(x,y,1,1);OVC.set(id,c);return c}
function ellSpr(w,h,col,ring){const id='e'+w+'|'+h+col+(ring?1:0);let c=OVC.get(id);if(c)return c;c=mkCanvas(w,h);const q=c.getContext('2d'),inn=(x,y,k)=>{const a=(x+.5-w/2)/(w/2-k),b=(y+.5-h/2)/(h/2-k);return a*a+b*b<=1};
 q.fillStyle=PAL[col];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(inn(x,y,0)&&!(ring&&inn(x,y,1)&&inn(x-1,y,0)&&inn(x+1,y,0)&&inn(x,y-1,0)&&inn(x,y+1,0)&&h>2))q.fillRect(x,y,1,1);OVC.set(id,c);return c}
const FONT={'0':'.###.#...##..###.#.###..##...#.###.','1':'..#...##....#....#....#....#...###.','2':'.###.#...#....#...#...#...#...#####','3':'####.....#....#.###.....#....#####.','4':'...#...##..#.#.#..#.#####...#....#.',
 '5':'######....####.....#....##...#.###.','6':'.###.#....#....####.#...##...#.###.','7':'#####....#...#...#....#....#....#..','8':'.###.#...##...#.###.#...##...#.###.','9':'.###.#...##...#.####....#....#.###.',
 '%':'##..###.#....#...#...#....#.###..##','A':'.###.#...##...#######...##...##...#','P':'####.#...##...#####.#....#....#....','!':'..#....#...##...###.#######.##.###.','-':'...............#####...............','+':'.......#....#..#####..#....#.......',' ':'...................................',
 'L':'#....#....#....#....#....#....#####','E':'######....#....####.#....#....#####','F':'######....#....####.#....#....#....','T':'#####..#....#....#....#....#....#..'};
function glyph(ch,col){const id='g'+ch+col;let c=OVC.get(id);if(c)return c;c=mkCanvas(5,7);const q=c.getContext('2d'),s=FONT[ch]||FONT[' '];q.fillStyle=PAL[col]||col;for(let i=0;i<35;i++)if(s[i]==='#')q.fillRect(i%5,(i/5)|0,1,1);OVC.set(id,c);return c}
const PILLS=new Map();
function pillSpr(txt,col){const id=txt+'|'+col;let c=PILLS.get(id);if(c)return c;if(PILLS.size>240)PILLS.clear();let w=5;for(let i=0;i<txt.length;i++)w+=txt[i]===' '?3:6;const h=11;c=mkCanvas(w,h);const q=c.getContext('2d');
 q.fillStyle=PAL['0'];q.fillRect(1,0,w-2,h);q.fillRect(0,1,w,h-2);q.fillStyle=PAL.b;q.fillRect(1,1,w-2,h-2);q.fillStyle=PAL['1'];q.fillRect(2,2,w-4,h-4);q.fillStyle=PAL['0'];q.fillRect(1,1,1,1);q.fillRect(w-2,1,1,1);q.fillRect(1,h-2,1,1);q.fillRect(w-2,h-2,1,1);
 for(let i=0,x=3;i<txt.length;i++){if(txt[i]===' '){x+=3;continue}q.drawImage(glyph(txt[i],txt[i]==='!'?'E':col),x,2);x+=6}PILLS.set(id,c);return c}
// A pill of several coloured parts with a dark notch between them (the move plan: "4 AP" | "5 LEFT"); parts: [[txt,col],...]
function pillSpr2(parts){const id=parts.map(p=>p[0]+'|'+p[1]).join('/');let c=PILLS.get(id);if(c)return c;if(PILLS.size>240)PILLS.clear();
 const ws=parts.map(p=>{let w=0;for(let i=0;i<p[0].length;i++)w+=p[0][i]===' '?3:6;return w});let w=5+ws.reduce((a,b)=>a+b,0)+(parts.length-1)*4;const h=11;c=mkCanvas(w,h);const q=c.getContext('2d');
 q.fillStyle=PAL['0'];q.fillRect(1,0,w-2,h);q.fillRect(0,1,w,h-2);q.fillStyle=PAL.b;q.fillRect(1,1,w-2,h-2);q.fillStyle=PAL['1'];q.fillRect(2,2,w-4,h-4);q.fillStyle=PAL['0'];q.fillRect(1,1,1,1);q.fillRect(w-2,1,1,1);q.fillRect(1,h-2,1,1);q.fillRect(w-2,h-2,1,1);
 let x=3;parts.forEach((p,j)=>{if(j){q.fillStyle=PAL.b;q.fillRect(x,2,1,h-4);x+=4}for(let i=0;i<p[0].length;i++){const ch=p[0][i];if(ch===' '){x+=3;continue}q.drawImage(glyph(ch,p[1]),x,2);x+=6}});PILLS.set(id,c);return c}
const PILLQ={n:0,c:[],x:[],y:[],s:[]};
function pillAt(txt,col,ax,ay,big){const i=PILLQ.n++;PILLQ.c[i]=Array.isArray(txt)?pillSpr2(txt):pillSpr(txt,col);PILLQ.x[i]=ax;PILLQ.y[i]=ay;PILLQ.s[i]=big?1:0}       // art-space anchor: bottom centre of the pill
function pillsFlush(sc){if(!PILLQ.n)return;const P0=Math.max(1,Math.round(dpr*1.5)),P1=Math.max(2,Math.round(dpr*2));g.setTransform(1,0,0,1,0,0);
 for(let i=0;i<PILLQ.n;i++){const c=PILLQ.c[i],P=PILLQ.s[i]?P1:P0,w=c.width*P,h=c.height*P;g.drawImage(c,Math.round(btx+PILLQ.x[i]*sc*BKX-w/2),Math.round(bty+PILLQ.y[i]*sc-h),w,h)}PILLQ.n=0}

/* ---- units ---- */
/* Footprints: a size-2 unit (u.sz 2) stands on 4 tiles; it is drawn on the middle of its footprint (ufoot), at the depth of its
   front tile (udepth) and before the props and figures of that diagonal, so whatever stands in front of any of its tiles covers it.
   Monsters (76-monsters.js) say how tall they are, how wide their shadow is and whether they fly (monsterInfo). */
const usize=u=>u&&u.sz||(u&&u.def&&u.def.size>1?u.def.size:1);
function ufoot(u){const s=usize(u);if(s===1)return tpos(u.c,u.r,T(u).h);const h=(s-1)/2;return tpos(u.c+h,u.r+h,T(u).h)}
function udepth(u,R){const s=usize(u);if(s===1)return R.dp[key(u.c,u.r)];let d=0;for(let y=0;y<s;y++)for(let x=0;x<s;x++){const c=u.c+x,r=u.r+y;if(inb(c,r)&&R.dp[key(c,r)]>d)d=R.dp[key(c,r)]}return d}
const UMI=new WeakMap();
function umon(u){let m=UMI.get(u.def||u);if(m)return m;m=null;if(u.def&&typeof monsterInfo==='function'){try{const i=monsterInfo(u);if(i&&(i.kind||i.size>1||i.fly))m=i}catch(e){}}
 if(!m)m={kind:null,size:usize(u),fly:!!(u.def&&u.def.fly),lift:u.def&&u.def.fly?8:0,top:u.def&&u.def.big?48:32,wide:u.def&&u.def.big?14:8};UMI.set(u.def||u,m);return m}
const VIS=new WeakMap(),SOX=27,SOY=50,SPW=56,SPH=57;
function visOf(u){let v=VIS.get(u);if(!v){const p=ufoot(u),d=udepth(u,viewEnsure());v={c:u.c,r:u.r,fx:p.x,fy:p.y,tx:p.x,ty:p.y,t0:-1e9,dur:1,hop:0,lift:0,depth:d,pd:d,hp:u.hp,arm:u.arm,hpLag:u.hp,lagT:0,alive:u.alive,deadT:0,flashT:-1e9,kx:0,ky:0,
  burn:u.st.burn||0,chill:u.st.chill||0,stun:u.st.stun||0,root:u.st.root||0,buffs:u.buffs.length,spr:null,sil:null,sprS:0,face:u.side===0?1:-1,hitAt:0,hitDmg:0,hitArm:false,hx:0,hy:0,
  fdc:0,fdr:u.side===0?-1:1,pS:'idle',pF:0,pX:0,pY:0,pL:0,pT:null,pA:1,pFl:0,pSh:1,pD:0,show:true,gone:false,ox:0,oy:0,drawn:false};VIS.set(u,v)}return v}
function stepUnit(u,v,dt){
 if(u.c!==v.c||u.r!==v.r){const p=ufoot(u),dist=Math.abs(u.c-v.c)+Math.abs(u.r-v.r),dh=T(u).h-B.tiles[key(v.c,v.r)].h,kb=B.cur!==u,nd=udepth(u,V);
  v.fx=u.sx;v.fy=u.sy;v.tx=p.x;v.ty=p.y;v.t0=now;if(HAVE.pose){u.sx=p.x;u.sy=p.y}   // with 74-anim the pose carries the slide: the unit sits on its tile at once
v.dur=reduced?1:Math.max(45,(dist>1?230:kb?140:118)*SPEEDF);v.hop=reduced||HAVE.pose?0:kb?2:dist>1?18+dist*5:4+Math.abs(dh)*10;v.big=dist>1||Math.abs(dh)>0;
  v.pd=Math.max(V.dp[key(v.c,v.r)]+(usize(u)-1)*2,nd);if(!kb){const dc=u.c-v.c,dr=u.r-v.r;if(Math.abs(dc)>=Math.abs(dr)){v.fdc=dc<0?-1:1;v.fdr=0}else{v.fdc=0;v.fdr=dr<0?-1:1}if(p.x!==v.fx)v.face=p.x>v.fx?1:-1}
  v.c=u.c;v.r=u.r;v.mv=true;if(typeof fxStep==='function')fxStep(u,v,kb,dist)}
 if(v.mv){const a=(now-v.t0)/v.dur;if(a>=1){u.sx=v.tx;u.sy=v.ty;v.lift=0;v.mv=false;v.depth=udepth(u,V);if(v.big&&typeof fxLand==='function')fxLand(u)}
  else if(HAVE.pose)v.depth=v.pd;
  else{const e=v.hop>12?a*a*(3-2*a):a;u.sx=v.fx+(v.tx-v.fx)*e;u.sy=v.fy+(v.ty-v.fy)*e;v.lift=Math.sin(Math.PI*a)*v.hop;v.depth=v.pd}}
 if(now-v.lagT>260)v.hpLag+=(u.hp-v.hpLag)*Math.min(1,dt*5);if(v.hpLag<u.hp)v.hpLag=u.hp;
 v.kx*=Math.max(0,1-dt*14);v.ky*=Math.max(0,1-dt*14)}
function unitFrames(s){return typeof UNIT_FRAMES==='object'&&UNIT_FRAMES&&UNIT_FRAMES[s]||1}
function poseTo(u,v){let p=null;if(HAVE.pose){try{p=unitPose(u)}catch(e){artFail('pose',e)}}
 if(p){v.pS=p.state||'idle';v.pF=p.frame|0;v.pPh=p.ph||0;v.pCy=p.cyc||0;v.pAn=p.anim||'';v.pX=p.ox||0;v.pY=p.oy||0;v.pA=p.alpha==null?1:p.alpha;v.pFl=p.flash||0;v.pBf=p.bflash||0;v.pSh=p.shadow==null?1:p.shadow;v.pL=typeof p.lift==='number'?p.lift:0;v.pT=p.tint||null;v.pD=screenDir(p.dc||0,p.dr||0);
  if(!u.alive&&v.pA<=.01&&now-v.deadT>200)v.gone=true;if(!u.alive&&now-v.deadT>4000)v.gone=true;v.show=!v.gone;return}
 const dead=!u.alive,a=dead?clamp((now-v.deadT)/650,0,1):0,s=dead?'death':v.mv?'walk':'idle',n=unitFrames(s),fps=typeof UNIT_FPS==='object'&&UNIT_FPS&&UNIT_FPS[s]||6;
 v.pS=s;v.pF=dead?Math.min(n-1,(a*n)|0):reduced&&!v.mv?0:((now*fps/1000)|0)%n;v.pX=v.kx;v.pY=v.ky-v.lift;v.pL=v.lift;v.pT=null;v.pA=1-a*a;v.pFl=clamp(1-(now-v.flashT)/170,0,1)*.9;v.pSh=1;v.pD=screenDir(v.fdc,v.fdr);v.show=!dead||a<1}
// Height of the figure above its feet (the sprite canvas has working room around it): where the overlay hangs.
const ELL={ok:false,sh:null,shB:null,r0:null,r1:null,r0B:null,r1B:null};
function ellInit(){ELL.ok=true;ELL.sh=ellSpr(16,7,'0');ELL.shB=ellSpr(28,12,'0');ELL.r0=ellSpr(20,9,'5',1);ELL.r1=ellSpr(20,9,'g',1);ELL.r0B=ellSpr(32,14,'5',1);ELL.r1B=ellSpr(32,14,'g',1);
 const mix=(sh,rg)=>{const c=mkCanvas(rg.width,rg.height),q=c.getContext('2d');q.globalAlpha=.42;q.drawImage(sh,(rg.width-sh.width)>>1,(rg.height-sh.height)>>1);q.globalAlpha=.85;q.drawImage(rg,0,0);return c};   // shadow + side ring in one blit for a unit standing still
 ELL.c0=mix(ELL.sh,ELL.r0);ELL.c1=mix(ELL.sh,ELL.r1);ELL.c0B=mix(ELL.shB,ELL.r0B);ELL.c1B=mix(ELL.shB,ELL.r1B);
 ELL.shW=ellSpr(54,24,'0');ELL.r0W=ellSpr(62,28,'5',1);ELL.r1W=ellSpr(62,28,'g',1);ELL.c0W=mix(ELL.shW,ELL.r0W);ELL.c1W=mix(ELL.shW,ELL.r1W);
 ELL.rA=ellSpr(20,9,'x',1);ELL.rAB=ellSpr(32,14,'x',1);ELL.rAW=ellSpr(62,28,'x',1);ELL.cA=mix(ELL.sh,ELL.rA);ELL.cAB=mix(ELL.shB,ELL.rAB);ELL.cAW=mix(ELL.shW,ELL.rAW);return ELL}   // allies (caravan guards, 42-caravans.js): a mana-blue ring
function ellRing(E,u,wide,big){return u.ally?(wide?E.rAW:big?E.rAB:E.rA):wide?(u.side?E.r1W:E.r0W):big?(u.side?E.r1B:E.r0B):u.side?E.r1:E.r0}
function ellComb(E,u,wide,big){return u.ally?(wide?E.cAW:big?E.cAB:E.cA):wide?(u.side?E.c1W:E.c0W):big?(u.side?E.c1B:E.c0B):u.side?E.c1:E.c0}
function unitTop(u){if(typeof sheetTop==='function'){const t=sheetTop(u);if(t>0)return t}const mi=umon(u);if(mi.kind)return mi.top;if(typeof unitSpriteBox==='function'){try{const b=unitSpriteBox(u);if(b&&b.h>0)return b.h}catch(e){}}return u.def&&u.def.big?48:32}
// Sprites are built on first use; warming one unit a frame at the start of a battle keeps that off the action frames.
// Passes: every unit's idle frames in every facing first (a rotation needs them all at once), then walk and hit, then the rest.
// Each frame spends at most WARMMS ms (at least one sprite), so the warm-up never turns into a run of long frames.
const WARM={b:null,i:0,p:0},WARMP=[['idle'],['walk','hit'],['attack','cast','death']],WARMMS=3;
const WARMF=[0];
function warmSprites(){if(typeof unitSpriteWarm!=='function'||!HAVE.sprite)return;if(WARM.b!==B){WARM.b=B;WARM.i=0;WARM.p=0}if(WARM.p>=WARMP.length)return;
 const until=performance.now()+WARMMS;
 try{for(;;){if(WARM.i>=B.units.length*4){WARM.i=0;if(++WARM.p>=WARMP.length)return}
  WARMF[0]=WARM.i&3;const wu=B.units[WARM.i>>2],st=WARMP[WARM.p];let cut=0,mon=false;
  if(typeof monsterSpriteWarm==='function'&&wu.def){monsterSpriteWarm(wu,WARMF,until,st);mon=!!umon(wu).kind;cut=MS.cut}
  if(!mon){unitSpriteWarm(wu,WARMF,until,st);cut=US.cut}
  if(cut)return;WARM.i++;if(performance.now()>=until)return}}catch(e){WARM.p=9}}
function drawUnitPx(u,v){let s=null,Fr=null;if(typeof humLiveFrame==='function'){try{Fr=humLiveFrame(u,v)}catch(e){Fr=null;artFail('skeleton',e)}}   // Detail High people: the live skeleton (73m-skel.js)
 if(!Fr&&typeof ogreLiveFrame==='function'&&u.def&&!u.m)Fr=ogreLiveFrame(u,v);   // Detail High ogre: the paper cut-out skeleton from the user's sheet (76d-ogre.js)
 if(!Fr&&typeof fsLiveFrame==='function'&&u.def&&!u.m)Fr=fsLiveFrame(u,v);   // Detail High direwolf / goblins: the user's drawn frames (76g-frames.js; the wolf's idle a cut-out rig, 76h-wolf.js)
 if(!Fr){if(typeof monsterSpritePx==='function'&&u.def){try{s=monsterSpritePx(u,v.pD,v.pS,v.pF)}catch(e){s=null}}
 if(!s){try{s=unitSpritePx(u,v.pD,v.pS==='attack'&&(v.pAn==='throw'||v.pAn==='throwK')?v.pAn:v.pS,v.pF)}catch(e){artFail('sprite',e)}}if(!s||!s.cv||!s.cv.width)return false}   // a throw has its own frames (74-anim.js animThrow)
 const mi=umon(u),wide=mi.size>1,big=!wide&&(u.def&&u.def.big||mi.bigSh),x=Math.round((u.sx+v.pX)/2),y=Math.round((u.sy+v.pY)/2),gy=Math.round((u.sy+v.pY+v.pL)/2),E=ELL.ok?ELL:ellInit(),sh=wide?E.shW:big?E.shB:E.sh;
 if(mi.fly&&u.alive&&v.pL>0){const k=Math.max(.45,1-v.pL/140);g.globalAlpha=v.pA*.42;const w=Math.round(sh.width*k),h=Math.round(sh.height*k);g.drawImage(sh,x-(w>>1),gy-(h>>1),w,h);   // a flier: its shadow shrinks with height, the side ring stays on the ground
  if(u.alive){const rg=ellRing(E,u,wide,big);g.globalAlpha=.85;g.drawImage(rg,x-(rg.width>>1),gy-(rg.height>>1))}}
 else if(u.alive&&v.pA>.99&&v.pSh>.99){const c=ellComb(E,u,wide,big);g.drawImage(c,x-(c.width>>1),gy-(c.height>>1))}
 else{g.globalAlpha=v.pA*v.pSh*.42;g.drawImage(sh,x-(sh.width>>1),gy-(sh.height>>1));
  if(u.alive){const rg=ellRing(E,u,wide,big);g.globalAlpha=.85;g.drawImage(rg,x-(rg.width>>1),gy-(rg.height>>1))}}
 if(Fr){g.imageSmoothingEnabled=true;g.globalAlpha=v.pA;if(u===B.cur&&!B.over&&!v.mv){const o=.9*(B.cam&&B.cam.s?1/B.cam.s:.5)+.45,pu=reduced?.6:.45+.45*(.5+.5*Math.sin(now/260)),col=u.side!==0?'r':u.ally?'x':'e',mp=c=>silOf(c,col);
   g.globalAlpha=v.pA*pu;for(const [dx,dy] of TURNOL)humSkDraw(g,Fr,x+dx*o,y+dy*o,mp,1);g.globalAlpha=v.pA}
  humSkDraw(g,Fr,x,y,tintedOf);if(v.pT&&PAL[v.pT]){g.globalAlpha=v.pA*.34;const t=v.pT;humSkDraw(g,Fr,x,y,c=>silOf(c,t),1)}
  if(v.pFl>.02){g.globalAlpha=v.pA*Math.min(1,v.pFl);humSkDraw(g,Fr,x,y,c=>silOf(c,'r'),1)}
  if(v.pBf>.02){g.globalAlpha=v.pA*Math.min(1,v.pBf)*.5;humSkDraw(g,Fr,x,y,c=>silOf(c,'F'),1)}   // a blocked blow: a steel-blue flash
  g.imageSmoothingEnabled=false;g.globalAlpha=1;v.ox=x;v.oy=y-(v.bh||(v.bh=unitTop(u)-3));v.oy0=gy;return true}
 g.globalAlpha=v.pA;const sk=s.k||1,sw=s.cv.width/sk,sh2=s.cv.height/sk;   // an HD figure (k 2, 73h-unitshd.js) is blitted at half size
 if(u===B.cur&&!B.over&&!v.mv){const o=.9*(B.cam&&B.cam.s?1/B.cam.s:.5)+.45,pu=reduced?.6:.45+.45*(.5+.5*Math.sin(now/260)),sl=silOf(s.cv,u.side!==0?'r':u.ally?'x':'e');   // whose turn: a pulsing outline round the figure
  g.globalAlpha=v.pA*pu;if(s.smooth)g.imageSmoothingEnabled=true;for(const [dx,dy] of TURNOL)g.drawImage(sl,x-s.ax+dx*o,y-s.ay+dy*o,sw,sh2);g.imageSmoothingEnabled=false;g.globalAlpha=v.pA}
 if(s.smooth)g.imageSmoothingEnabled=true;g.drawImage(tintedOf(s.cv),x-s.ax,y-s.ay,sw,sh2);if(v.pT&&PAL[v.pT]){g.globalAlpha=v.pA*.34;g.drawImage(silOf(s.cv,v.pT),x-s.ax,y-s.ay,sw,sh2)}
 if(v.pFl>.02){g.globalAlpha=v.pA*Math.min(1,v.pFl);g.drawImage(silOf(s.cv,'r'),x-s.ax,y-s.ay,sw,sh2)}
 if(v.pBf>.02){g.globalAlpha=v.pA*Math.min(1,v.pBf)*.5;g.drawImage(silOf(s.cv,'F'),x-s.ax,y-s.ay,sw,sh2)}
 g.imageSmoothingEnabled=false;g.globalAlpha=1;v.ox=x;v.oy=y-(v.bh||(v.bh=unitTop(u)-3));v.oy0=gy;return true}
/* fallback figure (no 73-units.js): the old vector stand-in, cached at device resolution */
function drawUnitArt(q,u){const d=u.def||{},F=u.side===1?FACT[u.f]:null,body=u.side===0?'#2f7868':F.col,skin=u.side===0?'#e3bf9c':F.skin;q.strokeStyle='#0b1514';q.lineWidth=1.5;q.lineJoin='round';
 if(d.quad){q.fillStyle=body;q.beginPath();q.ellipse(0,-9,15,9,0,0,7);q.fill();q.stroke();q.fillStyle='rgba(255,255,255,.14)';q.beginPath();q.ellipse(-3,-12,9,4,0,0,7);q.fill();q.fillStyle=skin;q.beginPath();q.arc(12,-16,6,0,7);q.fill();q.stroke()}
 else{q.fillStyle=body;q.beginPath();q.moveTo(-9,0);q.lineTo(-7,-22);q.quadraticCurveTo(0,-27,7,-22);q.lineTo(9,0);q.closePath();q.fill();q.stroke();
  q.fillStyle='rgba(255,255,255,.13)';q.beginPath();q.moveTo(-8,-1);q.lineTo(-6.4,-21.5);q.lineTo(-2.5,-23.6);q.lineTo(-3.5,-1);q.fill();q.fillStyle='rgba(0,0,0,.16)';q.beginPath();q.moveTo(8,-1);q.lineTo(6.4,-21.5);q.lineTo(3,-23.4);q.lineTo(3.5,-1);q.fill();
  if(u.side===0){q.fillStyle='#d1a94e';q.fillRect(-2,-22,4,21)}
  q.fillStyle=skin;q.beginPath();q.arc(0,-30,6.5,0,7);q.fill();q.stroke();q.fillStyle='rgba(0,0,0,.14)';q.beginPath();q.arc(1.5,-29,5,-.6,1.9);q.fill();
  const wt=u.wpn.wt;q.strokeStyle=u.spell||wt==='staff'?'#b88cff':'#d7dde2';q.lineWidth=2.5;q.lineCap='round';q.beginPath();
  if(wt==='bow'){q.arc(11,-16,11,-1.2,1.2);q.stroke();q.lineWidth=1;q.beginPath();q.moveTo(15,-26);q.lineTo(15,-6)}
  else if(wt==='spear'||wt==='staff'||u.spell){q.moveTo(11,0);q.lineTo(11,-40)}else if(wt==='axe'||wt==='mace'){q.moveTo(11,-6);q.lineTo(13,-32);q.stroke();q.beginPath();q.arc(13,-32,4,0,7)}
  else if(wt!=='fist'){q.moveTo(10,-8);q.lineTo(16,-32)}q.stroke();q.lineCap='butt';
  if(u.spell||wt==='staff'){q.fillStyle='#e6d4ff';q.beginPath();q.arc(11,-41,3,0,7);q.fill()}
  if(u.shield){q.fillStyle='#8c6a3a';q.strokeStyle='#0b1514';q.lineWidth=1.5;q.beginPath();q.arc(-9,-12,6.5,0,7);q.fill();q.stroke();q.fillStyle='#c9a35e';q.beginPath();q.arc(-9,-12,2,0,7);q.fill()}}
 const rk=Object.keys(u.res)[0];if(rk){q.fillStyle=RESC[rk];q.strokeStyle='rgba(11,21,20,.7)';q.lineWidth=1;q.beginPath();q.arc(0,-13,3,0,7);q.fill();q.stroke()}}
function unitSprite(u,v){const S=Math.max(1,artScale()/2);if(v.spr&&v.sprS===S)return v.spr;const sc=u.def&&u.def.big?1.35:1,k=S*sc,c=v.spr||(v.spr=mkCanvas(1,1));c.width=Math.ceil(SPW*k);c.height=Math.ceil(SPH*k);
 const q=c.getContext('2d');q.setTransform(k,0,0,k,SOX*k,SOY*k);drawUnitArt(q,u);v.sprS=S;v.silS=0;return c}
function unitSil(u,v){if(v.sil&&v.silS===v.sprS)return v.sil;const s=v.spr,c=v.sil||(v.sil=mkCanvas(1,1));c.width=s.width;c.height=s.height;const q=c.getContext('2d');q.drawImage(s,0,0);q.globalCompositeOperation='source-in';q.fillStyle='#fff';q.fillRect(0,0,c.width,c.height);v.silS=v.sprS;return c}
function drawUnitOld(u,v){const sc=(u.def&&u.def.big?1.35:1)/2,x=(u.sx+v.pX)/2,y=(u.sy+v.pY)/2,sh=ellSpr(16,7,'0'),spr=unitSprite(u,v),w=SPW*sc,h=SPH*sc,right=v.pD===0||v.pD===3;
 g.globalAlpha=v.pA*v.pSh*.42;g.drawImage(sh,Math.round((u.sx+v.pX)/2)-8,Math.round((u.sy+v.pY+v.pL)/2)-3);g.globalAlpha=v.pA;
 if(!right){g.save();g.translate(x,y);g.scale(-1,1);g.drawImage(spr,-SOX*sc,-SOY*sc,w,h);if(v.pFl>.02){g.globalAlpha=v.pA*v.pFl;g.drawImage(unitSil(u,v),-SOX*sc,-SOY*sc,w,h)}g.restore()}
 else{g.drawImage(spr,x-SOX*sc,y-SOY*sc,w,h);if(v.pFl>.02){g.globalAlpha=v.pA*v.pFl;g.drawImage(unitSil(u,v),x-SOX*sc,y-SOY*sc,w,h)}}
 g.globalAlpha=1;v.ox=Math.round(x);v.oy=Math.round(y-46*sc)}
function drawUnit(u,v){v.drawn=true;if(HAVE.sprite&&drawUnitPx(u,v))return;drawUnitOld(u,v)}
/* fallback overlay (no 74-anim.js): armor over health as pixel bars, status pips, a marker over the acting unit */
const OO={cur:false,big:false,tgt:false,bars:true,wide:false,top:0,exact:false};
function drawOverlayOld(u,v,x,y,cur){const w=16,bx=x-8,bars=u.side!==0||!!u.ally||allyBarsOn();let ty=y-(u.armMax?7:5);if(bars){g.fillStyle=PAL['0'];g.fillRect(bx-1,ty-1,w+2,u.armMax?7:4);
 if(u.armMax){g.fillStyle=PAL.o;g.fillRect(bx,ty,w,2);g.fillStyle=PAL.q;g.fillRect(bx,ty,Math.ceil(w*u.arm/u.armMax),2);ty+=3}
 g.fillStyle=PAL.f;g.fillRect(bx,ty,w,2);if(v.hpLag>u.hp){g.fillStyle=PAL.e;g.fillRect(bx,ty,Math.ceil(w*Math.min(1,v.hpLag/u.hpMax)),2)}g.fillStyle=PAL[u.side?'g':'A'];g.fillRect(bx,ty,Math.ceil(w*u.hp/u.hpMax),2)}
 let px=bx;const py=y-(u.armMax?12:10),dot=c=>{g.fillStyle=PAL['0'];g.fillRect(px,py,4,4);g.fillStyle=PAL[c];g.fillRect(px+1,py+1,2,2);px+=5};
 if(u.st.burn)dot('E');if(u.st.chill)dot('F');if(u.st.root||u.rooted)dot('A');if(u.st.stun)dot('y');if(u.buffs.length)dot('r');
 if(cur){const cy=py-(px>bx?7:3)-(reduced?0:(now/260|0)&1);g.fillStyle=PAL['0'];g.fillRect(x-4,cy-5,8,3);g.fillRect(x-3,cy-2,6,2);g.fillRect(x-2,cy,4,1);g.fillStyle=PAL.d;g.fillRect(x-3,cy-4,6,2);g.fillRect(x-2,cy-2,4,1);g.fillRect(x-1,cy-1,2,1)}}
// SET.allyBars false (the HUD's toggle, B): the company's HP/armor bars stay hidden; o.bars carries it to the art's overlay too
function allyBarsOn(){return!(typeof SET==='object'&&SET&&SET.allyBars===false)&&(typeof shAllyBars!=='function'||shAllyBars())}
function drawUnitOverlays(){const us=B.units,ab=allyBarsOn(),cam=B.cam;OO.exact=cam.z===cam.zt&&BKX===1&&cam.s===Math.round(cam.s);   // whole-number scale: the overlay may blit its cached bars
 for(let i=0;i<us.length;i++){const u=us[i];if(!u.alive)continue;const v=VIS.get(u);if(!v||!v.drawn)continue;const cur=u===B.cur;
  if(HAVE.over){OO.cur=cur;const mi=umon(u);OO.big=!!(u.def&&u.def.big)||mi.size>1;OO.wide=mi.size>1;OO.top=mi.kind?mi.top:0;OO.tgt=!!(B.targets&&unitTiles(u).some(q=>B.targets.has(key(q[0],q[1]))));OO.bars=ab||u.side!==0||!!u.ally;try{drawUnitOverlayPx(g,u,v.ox,v.oy,OO);continue}catch(e){artFail('over',e);tfArt()}}
  drawOverlayOld(u,v,v.ox,v.oy,cur)}g.globalAlpha=1;
 /* objective marks (phase 7): the escorted VIP wears a gold shield, the siege leader a red crown; both bob unless motion is reduced */
 const ob=B.obj;if(ob&&(ob.vip||ob.leader)){for(const [u,rows,key] of [[ob.vip,OBJMK.vip,'objvip'],[ob.leader,OBJMK.lead,'objlead']]){if(!u||!u.alive)continue;const v=VIS.get(u);if(!v||!v.drawn)continue;
   const mi=umon(u),big=!!(u.def&&u.def.big)||mi.size>1,c=pxScaled(key,rows,1);if(!c)continue;const bob=reduced?0:((now/400)|0)&1,an=typeof anOf==='function'?anOf(u):null,yy=an&&an.ovT!=null&&hdArt()?an.ovT-c.height-2-(u===B.cur?10:0)-bob:v.oy-(big?66:52)-(mi.kind?mi.top||0:0)-bob;   // right above the overlay (above the chevron on its turn)
   const m=g.getTransform(),dp=Math.round(12*Math.abs(m.a)),pc=typeof paCanvas==='function'&&dp>=8?paCanvas('pa-'+key,dp):null;   // painted mark at device resolution (Detail High), 12 art px square
   if(pc){const s=g.imageSmoothingEnabled;g.imageSmoothingEnabled=true;g.drawImage(pc,v.ox-6,yy+c.height/2-6,12,12);g.imageSmoothingEnabled=s}else g.drawImage(c,Math.round(v.ox-c.width/2),Math.round(yy))}}}
const OBJMK={vip:['..0000000..','.0ddddddd0.','0deeeeeddc0','0de0e0e0dc0','0deeeeeedc0','0ddeeeedcc0','.0ddedddc0.','..0dddcc0..','...0ddc0...','....0c0....','.....0.....'],
 lead:['.0..0.0..0.','0g00g0g00g0','0gg0ggg0gg0','0ghggggghg0','0ggggggggf0','0fffffffff0','.000000000.']};

/* ---- picking: exact against the drawn columns (tops and exposed cliff faces), front to back ---- */
function tileAtBoard(bx,by){if(!B||!B.tiles)return -1;const R=viewEnsure(),k=R.rot,x=Math.floor(bx/2+1e-6)+.5,y=Math.floor(by/2+1e-6)+.5,u0=Math.floor(x/16);   // the centre of the art pixel under the point
 for(let d=ND-1;d>=0;d--){const u=(d+u0)&1?u0+1:u0,q=vKey((d+u)>>1,(d-u)>>1,k);if(q<0)continue;const dx=x-R.ax[q],dy=y-R.ay[q]-.5,ax=dx<0?-dx:dx;if(ax>16)continue;
  if(ax/16+(dy<0?-dy:dy)/8<1)return q;if(dy>0&&dy<=8*(1-ax/16)+(dx<0?R.dl[q]:R.dr[q])*8)return q}return -1}   // upper edges are open, lower edges closed: a shared corner goes to the tile below it
function unitAtBoard(bx,by){if(!B)return null;const R=viewEnsure(),us=B.units,x=bx/2,y=by/2;let best=null,bd=-1;
 for(let i=0;i<us.length;i++){const u=us[i];if(!u.alive)continue;const mi=umon(u),v=VIS.get(u),big=u.def&&u.def.big,ux=u.sx/2,uy=u.sy/2-(v&&mi.fly?Math.round(v.pL/2):0),d=udepth(u,R),hw=mi.kind?mi.wide:big?14:8,top=mi.kind?mi.top-4:big?44:28;
  if(Math.abs(x-ux)<=hw&&y<=uy+3+(mi.size>1?8:0)&&y>=uy-top&&d>bd){best=u;bd=d}}return best}
// What a tap means: the unit whose figure is under the point, else the tile. A tile the acting unit could act on wins
// over a figure standing in front of it when the point is on the figure's upper half and that figure is not a target.
function pickAtBoard(bx,by){const k=tileAtBoard(bx,by),u=unitAtBoard(bx,by);if(!u)return k;const uk=key(u.c,u.r);if(k<0||k===uk)return uk;
 if(usize(u)>1&&occupies(u,k%BW,(k/BW)|0))return k;                                                            // any tile of a big unit's footprint picks it
 if(unitAt(k%BW,(k/BW)|0))return V.dp[k]>udepth(u,V)?k:uk;
 const act=B.sel?!!(B.targets&&B.targets.has(k)):!!(B.reach&&B.reach.has(k)&&!B.busy),uact=B.sel?!!(B.targets&&B.targets.has(uk)):u.side!==0;
 return act&&!uact&&by/2<u.sy/2-12?k:uk}

/* ---- overlays: reach, range outline, heights (cached per diagonal); targets, cursor, path (live) ---- */
const OV={sig:null,reach:0,sel:null,own:-1,hts:false,R:null,targets:0,TgR:null,Tg:[]};for(let d=0;d<ND;d++)OV.Tg.push([]);
const HOV={k:-1,pk:-2,dest:-1,reach:null,path:[],cost:0,hz:false};let insK=-1,insW=null;      // what the inspect card is pointing at (battle tile key / world circle)
const TGC={enemy:['g','h'],ally:['B','A'],move:['X','F']},HTC=['n','l','d','E'];
function setHoverTile(k){HOV.k=k}
function ovCtx(R,d){let c=R.ov[d];if(!c)c=R.ov[d]=mkCanvas(R.w[d],R.h[d]);else if(c.width!==R.w[d]||c.height!==R.h[d]){c.width=R.w[d];c.height=R.h[d]}
 const q=c.getContext('2d');if(!R.ovOn[d]){q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,c.width,c.height);R.ovOn[d]=1}q.setTransform(1,0,0,1,-R.x0[d],-R.y0[d]);q.globalAlpha=1;return q}
/* movement reach reads on any ground: dark blue wash on bright biomes (snow, desert, glass), ice-blue on dark ones, both with a shadowed border */
function reachBright(){const h=(B.P&&B.P.top)||'#000',n=parseInt(h.slice(1),16);return((n>>16)*.3+(n>>8&255)*.59+(n&255)*.11)>150}
function buildOverlays(R){const u=B.cur,reach=!B.sel&&B.reach&&!B.busy&&!B.auto?B.reach:null,tg=B.targets||null,own=u&&u.alive&&!visOf(u).mv?key(u.c,u.r):-1,sel=B.busy?null:B.sel||null,pl=PL.k;
 if(tg!==OV.targets||R!==OV.TgR){OV.targets=tg;OV.TgR=R;for(let d=0;d<ND;d++)OV.Tg[d].length=0;if(tg)for(const k of tg)OV.Tg[R.dp[k]].push(k)}
 if(OV.sig===B.tiles&&OV.reach===reach&&OV.sel===sel&&OV.own===own&&OV.hts===VIEW.heights&&OV.R===R&&OV.pk===pl)return;OV.sig=B.tiles;OV.reach=reach;OV.sel=sel;OV.own=own;OV.hts=VIEW.heights;OV.R=R;OV.pk=pl;
 for(let d=0;d<ND;d++)if(R.ovOn[d]){const c=R.ov[d],q=c.getContext('2d');q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,c.width,c.height);R.ovOn[d]=0}
 let rng=-1,kind='enemy',oc=u?u.c:0,orr=u?u.r:0;if(sel&&u){try{const a=abilityInfo(u,sel);if(a.rng>0&&TGC[a.tgt]){rng=a.rng;kind=a.tgt}}catch(e){}}
 else if(pl>=0&&u){try{const a=abilityInfo(u,'attack');if(a.rng>1){rng=a.rng;oc=pl%BW;orr=(pl/BW)|0}}catch(e){}}   // a planned move with a reach or ranged weapon: its attack range from the planned tile
 const hts=VIEW.heights,k=R.rot,tl=B.tiles;if(!reach&&rng<0&&!hts&&own<0)return;
 const inR=q=>q>=0&&(reach.has(q)||q===own),inG=q=>q>=0&&Math.abs(q%BW-oc)+Math.abs(((q/BW)|0)-orr)<=rng,low=(q,h)=>q<0||tl[q].h<h;
 for(let i=0;i<NT;i++){const q=R.ord[i],d=R.dp[q],vc=R.vc[q],vr=R.vr[q],x=R.ax[q]-16,y=R.ay[q]-8,nw=vKey(vc-1,vr,k),ne=vKey(vc,vr-1,k),se=vKey(vc+1,vr,k),sw=vKey(vc,vr+1,k);
  if(hts){const c=ovCtx(R,d),h=tl[q].h;c.globalAlpha=.6;if(low(nw,h))c.drawImage(ovSpr('nw','l'),x,y);if(low(ne,h))c.drawImage(ovSpr('ne','l'),x,y);if(low(se,h))c.drawImage(ovSpr('se','l'),x,y);if(low(sw,h))c.drawImage(ovSpr('sw','l'),x,y);c.globalAlpha=1;
   if(tl[q].t!=='block'){const z=glyph(''+h,'0'),gx=x+14,gy=y+5;c.drawImage(z,gx-1,gy);c.drawImage(z,gx+1,gy);c.drawImage(z,gx,gy-1);c.drawImage(z,gx,gy+1);c.drawImage(glyph(''+h,HTC[h]||'l'),gx,gy)}}
  if(reach&&reach.has(q)){const c=ovCtx(R,d),br=reachBright(),ec=br?'X':'e';c.globalAlpha=br?.5:.34;c.drawImage(ovSpr('fill',br?'X':'F'),x,y);
   c.globalAlpha=.75;if(!inR(nw))c.drawImage(ovSpr('nw','0'),x,y+1);if(!inR(ne))c.drawImage(ovSpr('ne','0'),x,y+1);if(!inR(se))c.drawImage(ovSpr('se','0'),x,y+1);if(!inR(sw))c.drawImage(ovSpr('sw','0'),x,y+1);c.globalAlpha=1;
   if(!inR(nw))c.drawImage(ovSpr('nw',ec),x,y);if(!inR(ne))c.drawImage(ovSpr('ne',ec),x,y);if(!inR(se))c.drawImage(ovSpr('se',ec),x,y);if(!inR(sw))c.drawImage(ovSpr('sw',ec),x,y)}
  if(rng>=0&&inG(q)){const c=ovCtx(R,d),col=TGC[kind][1];c.globalAlpha=.14;c.drawImage(ovSpr('fill',col),x,y);c.globalAlpha=.6;if(!inG(nw))c.drawImage(ovSpr('nw','0'),x,y+1);if(!inG(ne))c.drawImage(ovSpr('ne','0'),x,y+1);if(!inG(se))c.drawImage(ovSpr('se','0'),x,y+1);if(!inG(sw))c.drawImage(ovSpr('sw','0'),x,y+1);c.globalAlpha=1;if(!inG(nw))c.drawImage(ovSpr('nw',col),x,y);if(!inG(ne))c.drawImage(ovSpr('ne',col),x,y);if(!inG(se))c.drawImage(ovSpr('se',col),x,y);if(!inG(sw))c.drawImage(ovSpr('sw',col),x,y)}
  if(q===own){const c=ovCtx(R,d);c.drawImage(ovSpr('ring2','c'),x,y);c.drawImage(ovSpr('ring','d'),x,y)}}}
function drawOverlays(R,d){if(R.ovOn[d])g.drawImage(R.ov[d],R.x0[d],R.y0[d]);
 const Tg=OV.Tg[d];if(Tg.length){const C=TGC[B.selKind]||TGC.move,f=ovSpr('fill',C[0]),b=ovSpr('brk',C[1]),pu=reduced?.5:(now/140|0)%6/5;g.globalAlpha=.34+(pu>.5?1-pu:pu)*.3;
  for(let i=0;i<Tg.length;i++)g.drawImage(f,R.ax[Tg[i]]-16,R.ay[Tg[i]]-8);g.globalAlpha=1;for(let i=0;i<Tg.length;i++)g.drawImage(b,R.ax[Tg[i]]-16,R.ay[Tg[i]]-8)}
 const hk=HOV.k;if(hk>=0&&R.dp[hk]===d&&hk!==HOV.dest){g.globalAlpha=.75;g.drawImage(ovSpr('brk','r'),R.ax[hk]-16,R.ay[hk]-8);g.globalAlpha=1}
 if(hk>=0){const w=unitAt(hk%BW,(hk/BW)|0);if(w&&usize(w)>1){g.globalAlpha=.6;for(const [c,r] of unitTiles(w)){if(!inb(c,r))continue;const q=key(c,r);if(q!==hk&&R.dp[q]===d)g.drawImage(ovSpr('brk','r'),R.ax[q]-16,R.ay[q]-8)}g.globalAlpha=1}}   // hovering a big unit marks its whole footprint
 if(HOV.dest>=0&&R.dp[HOV.dest]===d){const x=R.ax[HOV.dest]-16,y=R.ay[HOV.dest]-8;g.globalAlpha=.3;g.drawImage(ovSpr('fill',HOV.hz?'E':'d'),x,y);g.globalAlpha=1;g.drawImage(ovSpr('ring2',HOV.hz?'E':'d'),x,y)}
 if(PL.k>=0&&R.dp[PL.k]===d){const x=R.ax[PL.k]-16,y=R.ay[PL.k]-8,pu=reduced?.5:(now/120|0)%8/7,a=pu>.5?1-pu:pu;g.globalAlpha=.34+a*.3;g.drawImage(ovSpr('fill',PL.hz?'E':'d'),x,y);g.globalAlpha=1;
  g.drawImage(ovSpr('ring2','0'),x,y+1);g.drawImage(ovSpr('ring2',PL.hz?'E':'d'),x,y);g.drawImage(ovSpr('ring','e'),x,y)}
 for(let i=0;i<PL.tn;i++){const q=PL.tg[i];if(R.dp[q]!==d)continue;const x=R.ax[q]-16,y=R.ay[q]-8;g.drawImage(ovSpr('dash','0'),x,y+1);g.drawImage(ovSpr('dash','E'),x,y)}
 if(insK>=0&&R.dp[insK]===d)g.drawImage(ovSpr('dash','r'),R.ax[insK]-16,R.ay[insK]-8);
 turnTileDraw(R,d);bmDraw(R,d)}
const TURNOL=[[-1,0],[1,0],[0,-1],[0,1],[-.7,-.7],[.7,-.7],[-.7,.7],[.7,.7]];
/* whose turn it is: the acting unit's tile(s) glow under it — a filled diamond and a bright double rim, pulsing (gold for the company,
   red for foes, blue for allies), drawn as vector paths at device resolution (Detail High) or as art-pixel rings (Low). Not while it walks. */
function turnTileDraw(R,d){const u=B&&B.cur;if(!u||!u.alive||B.over||visOf(u).mv)return;const pu=reduced?.5:.5+.5*Math.sin(now/260),
  col=u.side!==0?['#ff6a55','#ffd2c8']:u.ally?['#6fb1ff','#d8ecff']:['#ffd25a','#fff4c8'];
 for(const [c,r] of unitTiles(u)){if(!inb(c,r))continue;const q=key(c,r);if(R.dp[q]!==d)continue;const x=R.ax[q],y=R.ay[q];
  if(typeof hdArt==='function'&&hdArt()){g.save();const dia=(k)=>{g.beginPath();g.moveTo(x,y-8*k);g.lineTo(x+16*k,y);g.lineTo(x,y+8*k);g.lineTo(x-16*k,y);g.closePath()};
   g.globalAlpha=.22+.18*pu;g.fillStyle=col[0];dia(1);g.fill();
   g.globalAlpha=.55+.4*pu;g.lineJoin='round';g.strokeStyle='rgba(8,14,13,.85)';g.lineWidth=1.6;dia(.94);g.stroke();g.strokeStyle=col[0];g.lineWidth=1.1;dia(.94);g.stroke();
   g.globalAlpha=.35+.5*pu;g.strokeStyle=col[1];g.lineWidth=.5;dia(.72+.08*pu);g.stroke();g.restore()}
  else{const xx=x-16,yy=y-8;g.globalAlpha=.3+.25*pu;g.drawImage(ovSpr('fill',u.side!==0?'r':'c'),xx,yy);g.globalAlpha=1;g.drawImage(ovSpr('ring2','0'),xx,yy+1);g.drawImage(ovSpr('ring2',u.side!==0?'r':'c'),xx,yy);g.globalAlpha=1}}}
function uiK(){return 1/Math.sqrt(clamp(B.cam.z,.5,1))}
/* the move plan (65-battle-ui.js: B.plan, planInfo): its tile, path, pill, and the foes in reach from there; read once a frame */
const PL={k:-1,path:null,cost:0,left:0,hz:false,tg:new Int16Array(40),tn:0,I:null};
function planPrep(){PL.k=-1;PL.tn=0;PL.I=null;const p=typeof planOK==='function'?planOK():null;if(!p)return;PL.k=p.k;PL.path=p.path;PL.cost=p.cost;PL.left=p.left;PL.hz=!!p.hz;
 let I=null;try{I=typeof planInfo==='function'?planInfo():null}catch(e){}PL.I=I;const S=I&&(B.sel?I.sel:I.atk);if(S)for(const q of S){if(PL.tn>=40)break;if(!(B.targets&&B.targets.has(q)))PL.tg[PL.tn++]=q}}
function drawPlan(R){if(PL.k<0||!PL.path)return;const P=PL.path,u=B.cur,ph=reduced?0:(now/90|0)%4,c0=PAL['0'],c1=PAL[PL.hz?'E':'d'];let x0=Math.round(u.sx/2),y0=Math.round(u.sy/2);
 for(let i=0;i<P.length;i++){const x1=R.ax[P[i]],y1=R.ay[P[i]];for(let j=0;j<4;j++){const a=(j+ph/4)/4,x=Math.round(x0+(x1-x0)*a),y=Math.round(y0+(y1-y0)*a);g.fillStyle=c0;g.fillRect(x-2,y-2,5,5);g.fillStyle=c1;g.fillRect(x-1,y-1,3,3)}x0=x1;y0=y1}
 const bob=reduced?0:(now/260|0)&1;pillAt([[PL.cost+' AP'+(PL.hz?' !':''),PL.hz?'h':'d'],[PL.left+' LEFT',PL.left>0?'A':'h']],null,x0,y0-12-bob,true)}
function pathPrep(R){const u=B.cur,k=HOV.k;HOV.dest=-1;if(k<0||!u||!OV.reach||u.side!==0||B.auto||!OV.reach.has(k)||k===key(u.c,u.r)||unitAt(k%BW,(k/BW)|0))return;
 if(HOV.pk!==k||HOV.reach!==OV.reach){HOV.pk=k;HOV.reach=OV.reach;HOV.path=pathTo(OV.reach,k);HOV.cost=OV.reach.get(k).cost;HOV.hz=HOV.path.some(q=>B.tiles[q].t==='haz')}
 if(HOV.path.length&&k!==PL.k)HOV.dest=k}
function drawPathPreview(R){if(HOV.dest<0)return;const P=HOV.path,u=B.cur,ph=reduced?0:(now/90|0)%4,c0=PAL['0'],c1=PAL[HOV.hz?'E':'e'];let x0=Math.round(u.sx/2),y0=Math.round(u.sy/2);
 for(let i=0;i<P.length;i++){const x1=R.ax[P[i]],y1=R.ay[P[i]];for(let j=0;j<4;j++){const a=(j+ph/4)/4,x=Math.round(x0+(x1-x0)*a),y=Math.round(y0+(y1-y0)*a);g.fillStyle=c0;g.fillRect(x-2,y-2,4,4);g.fillStyle=c1;g.fillRect(x-1,y-1,2,2)}x0=x1;y0=y1}
 pillAt(HOV.cost+' AP'+(HOV.hz?' !':''),HOV.hz?'h':'d',x0,y0-11)}
// hover over the planned tile: the plan's own pill says it; elsewhere, the hover path draws as before
const HC={t:0,n:0,u:[],p:[],c:[]};
function drawHitChances(){const u=B.cur;if(!u||u.side!==0||B.busy||B.auto||!u.alive){HC.n=0;return}
 if(now-HC.t>180){HC.t=now;HC.n=0;const a=abilityInfo(u,B.sel||'attack');
  if(PL.k>=0&&PL.I&&typeof planHit==='function'){const S=B.sel?PL.I.sel:PL.I.atk;if(S&&a.tgt==='enemy')for(const q of S){const t=unitAt(q%BW,(q/BW)|0);if(!t||HC.n>=24)continue;const h=planHit(t,a);if(h==null)continue;HC.u[HC.n]=t;HC.c[HC.n]=h<0?'':h>=75?'A':h<45?'h':'d';HC.p[HC.n++]=h<0?'':h+'%'}}
  else if(a.tgt==='enemy')for(let i=0;i<B.units.length;i++){const t=B.units[i];if(t.alive&&t.side!==0&&!t.vip&&mdist(u,t)<=a.rng&&!(a.needShieldT&&!t.shield)){let blk=false;try{blk=typeof losInfo==='function'&&losInfo(u,t,a).blocked}catch(e){}
    const h=blk?0:hitChance(u,t,a);HC.u[HC.n]=t;HC.c[HC.n]=blk?'':h>=75?'A':h<45?'h':'d';HC.p[HC.n++]=h+'%'}}}
 for(let i=0;i<HC.n;i++){const t=HC.u[i],v=VIS.get(t);if(!t.alive||!v||!v.drawn)continue;
  if(!HC.c[i]){const c=typeof anSprite==='function'?anSprite('los-blocked'):null;if(c&&!(BM.los&&BM.tg===t))g.drawImage(c,v.ox-9,v.oy-(HAVE.over?27:34));continue}
  pillAt(HC.p[i],HC.c[i],v.ox,v.oy-(HAVE.over?9:16)-(HAVE.over&&typeof anOf==='function'&&anOf(t).icn?14:0))}}

/* ---- Phase 5 board feedback: the line of fire while aiming, telegraphed attacks, where the fallen lie ----
   bmPrep() re-reads the rules a few times a second into fixed arrays; the frame only blits cached sprites.
     line of fire   from the acting unit to the foe under the pointer (or the armed one): a dotted pixel line, green when clear,
                    amber through cover, red when blocked; every body in the line is ringed (amber: cover, red: an ally a stray
                    shot can hit), the obstacle that blocks it is crossed out
     telegraphs     B.tele = [{u,n,keys}]: the tiles an attack will hit on that unit's next turn pulse in warning orange
     corpses        B.corpses = [{c,r}]: a small heap of bones, so it shows what a necromancer can raise */
const BM={dv:[],dvN:0,t:-1e9,R:null,los:false,blocked:false,cover:0,ff:0,n:0,k:new Int16Array(40),ty:new Uint8Array(40),u:null,tg:null,stop:-1,teleN:0,tele:[],corN:0,cor:[],spr:null};
for(let d=0;d<ND;d++){BM.tele.push([]);BM.cor.push([])}
const BM_BONES=['..l....ll..','.lml..lrrl.','..lmllll0l.','.llmmlllll.','lm..lm..ml.'];
function bmPrep(R){if(now-BM.t<140&&BM.R===R)return;BM.t=now;BM.R=R;let n=0;
 for(let d=0;d<ND;d++){BM.tele[d].length=0;BM.cor[d].length=0}
 const T=B.tele;if(T&&T.length)for(let i=0;i<T.length;i++){const x=T[i],ks=x&&x.keys;if(!ks||(x.u&&!x.u.alive))continue;for(let j=0;j<ks.length;j++){const k=ks[j];if(k>=0&&k<NT){BM.tele[R.dp[k]].push(k);n++}}}
 BM.teleN=n;n=0;BM.dvN=0;if(T&&T.length&&typeof fxDiveShadow==='function')for(let i=0;i<T.length;i++){const x=T[i],z=x&&x.u&&fxDiveShadow(x.u);if(!z)continue;const s=usize(x.u),hc=(s-1)/2;let h=0,dd=0;for(let y=0;y<s;y++)for(let c=0;c<s;c++){if(!inb(z.c+c,z.r+y))continue;const q=key(z.c+c,z.r+y);h=Math.max(h,B.tiles[q].h);dd=Math.max(dd,R.dp[q])}const p=tpos(z.c+hc,z.r+hc,h);BM.dv[BM.dvN++]={x:p.x/2,y:p.y/2,d:dd,s}}
 const C=B.corpses;if(C&&C.length)for(let i=0;i<C.length;i++){const c=C[i];if(!c||!inb(c.c,c.r))continue;const k=key(c.c,c.r);BM.cor[R.dp[k]].push(k);n++}
 BM.corN=n;BM.los=false;BM.n=0;BM.stop=-1;
 let u=null,t=null,a=null;
 if(typeof FC!=='undefined'&&FC.t&&FC.u&&FC.t.alive&&FC.u.alive&&FC.a){u=FC.u;t=FC.t;a=FC.a}
 else if(HOV.k>=0&&B.cur&&B.cur.side===0&&B.cur.alive&&!B.busy&&!B.auto&&!B.over){const x=unitAt(HOV.k%BW,(HOV.k/BW)|0);if(x&&x.side!==B.cur.side){try{const q=abilityInfo(B.cur,B.sel||'attack');if(q.tgt==='enemy'&&mdist(B.cur,x)<=q.rng){u=B.cur;t=x;a=q}}catch(e){}}}
 if(!u||mdist(u,t)<=1)return;let kind=2;try{if(typeof shotKind==='function')kind=shotKind(u,t,a)}catch(e){}if(!kind)return;
 let L=null;try{if(typeof losInfo==='function')L=losInfo(u,t,a)}catch(e){}if(!L)return;
 BM.los=true;BM.blocked=!!L.blocked;BM.cover=L.cover|0;BM.ff=L.ff?L.ff.length:0;BM.u=u;BM.tg=t;
 // the same walk over the grid as the rules' losInfo(): from the lower tile key to the higher one
 let p=u,q=t;if(key(t.c,t.r)<key(u.c,u.r)){p=t;q=u}const dc=q.c-p.c,dr=q.r-p.r,m=Math.max(Math.abs(dc),Math.abs(dr)),top=Math.max(T_(u).h,T_(t).h)+1;
 for(let i=1;i<m&&BM.n<40;i++){const c=Math.round(p.c+dc*i/m),r=Math.round(p.r+dr*i/m),k=key(c,r),tl=B.tiles[k];let ty=0;
  if(tl.t==='block'||tl.h>top)ty=3;else if(kind===2){const x=unitAt(c,r);if(x&&x!==u&&x!==t)ty=x.side===u.side?2:1}   // a reach weapon (kind 1) strikes over bodies: no cover, no stray
  if(ty){BM.k[BM.n]=k;BM.ty[BM.n++]=ty}}
 if(BM.blocked){let bd=1e9;for(let i=0;i<BM.n;i++)if(BM.ty[i]===3){const k=BM.k[i],d=Math.abs(k%BW-u.c)+Math.abs(((k/BW)|0)-u.r);if(d<bd){bd=d;BM.stop=k}}}}
const T_=u=>B.tiles[key(u.c,u.r)];
function bmSpr(){if(BM.spr)return BM.spr;const S=BM.spr={bones:px(BM_BONES),x:null};const c=mkCanvas(9,9),q=c.getContext('2d');q.fillStyle=PAL['0'];for(let i=0;i<9;i++){q.fillRect(i-1,i-1,3,3);q.fillRect(7-i,i-1,3,3)}q.fillStyle=PAL.h;for(let i=1;i<8;i++){q.fillRect(i,i,1,1);q.fillRect(8-i,i,1,1)}S.x=c;return S}
function bmDraw(R,d){for(let i=0;i<BM.dvN;i++){const D=BM.dv[i];if(D.d!==d)continue;const E=ELL.ok?ELL:ellInit(),pu=reduced?.5:(Math.sin(now/180)+1)/2,sh=D.s>1?E.shW:E.shB,k=.7+pu*.35;   // a dive's shadow grows and pulses on its landing tiles
  g.globalAlpha=.32+pu*.22;const w=Math.round(sh.width*k*1.15),h=Math.round(sh.height*k*1.15);g.drawImage(sh,Math.round(D.x-w/2),Math.round(D.y-h/2),w,h);g.globalAlpha=.5;g.drawImage(sh,Math.round(D.x-sh.width*.3),Math.round(D.y-sh.height*.3),Math.round(sh.width*.6),Math.round(sh.height*.6));g.globalAlpha=1}
 const C=BM.cor[d];if(C.length){const b=bmSpr().bones;if(b)for(let i=0;i<C.length;i++)g.drawImage(b,R.ax[C[i]]-5,R.ay[C[i]]-2)}
 const Tl=BM.tele[d];if(Tl.length){const f=ovSpr('fill','E'),b=ovSpr('dash','y'),b2=ovSpr('ring','K'),ph=reduced?2:(now/110|0)%8,pu=ph<4?ph:8-ph;g.globalAlpha=.2+pu*.085;
  for(let i=0;i<Tl.length;i++)g.drawImage(f,R.ax[Tl[i]]-16,R.ay[Tl[i]]-8);g.globalAlpha=1;for(let i=0;i<Tl.length;i++){g.drawImage(b2,R.ax[Tl[i]]-16,R.ay[Tl[i]]-8);g.drawImage(b,R.ax[Tl[i]]-16,R.ay[Tl[i]]-8-(pu>2?1:0))}}
 if(BM.los)for(let i=0;i<BM.n;i++){const k=BM.k[i];if(R.dp[k]!==d)continue;const ty=BM.ty[i],x=R.ax[k]-16,y=R.ay[k]-8,col=ty===3?'g':ty===2?'h':'y';g.globalAlpha=.3;g.drawImage(ovSpr('fill',col),x,y);g.globalAlpha=1;g.drawImage(ovSpr('ring2',col),x,y)}}
/* the dotted line and the icons over what it meets: drawn after the figures so it is never hidden */
function bmLine(R){if(!BM.los)return;const u=BM.u,t=BM.tg;if(!u||!t||!u.alive||!t.alive)return;const vu=VIS.get(u),vt=VIS.get(t);if(!vu||!vt)return;
 const x0=Math.round(u.sx/2),y0=Math.round(u.sy/2)-15;let x1=Math.round(t.sx/2),y1=Math.round(t.sy/2)-15;
 if(BM.blocked&&BM.stop>=0){x1=R.ax[BM.stop];y1=R.ay[BM.stop]-12}
 const dx=x1-x0,dy=y1-y0,L=Math.sqrt(dx*dx+dy*dy)||1,n=Math.max(2,(L/5)|0),ph=reduced?0:(now/70|0)%5/5,c0=PAL['0'],c1=PAL[BM.blocked?'g':BM.cover>0?'E':'A'],c2=PAL[BM.blocked?'h':BM.cover>0?'y':'e'];
 g.fillStyle=c0;for(let i=0;i<n;i++){const a=(i+ph)/n,x=Math.round(x0+dx*a),y=Math.round(y0+dy*a);g.fillRect(x-1,y-1,4,4)}
 for(let i=0;i<n;i++){const a=(i+ph)/n,x=Math.round(x0+dx*a),y=Math.round(y0+dy*a);g.fillStyle=c1;g.fillRect(x,y,2,2);g.fillStyle=c2;g.fillRect(x,y,1,1)}
 if(typeof anSprite!=='function')return;
 for(let i=0;i<BM.n;i++){const k=BM.k[i],ty=BM.ty[i];
  if(ty===3){if(k===BM.stop){const X=bmSpr().x;g.drawImage(X,R.ax[k]-4,R.ay[k]-17)}continue}
  const x=unitAt(k%BW,(k/BW)|0),v=x&&VIS.get(x),c=anSprite(ty===2?'friendly-fire':'cover');if(c&&v&&v.drawn)g.drawImage(c,v.ox-9,v.oy-(HAVE.over?27:34)-(anOf(x).icn?13:0))}
 if(BM.blocked){const c=anSprite('los-blocked');if(c)g.drawImage(c,vt.ox-9,vt.oy-(HAVE.over?27:34))}}

/* ---- backdrop: painted into an art-resolution buffer at a low rate, scaled up crisp ---- */
const SKYB={cv:null,key:'',t:0,cost:0,vw:0,vh:0,w:0,h:0,px:1,z:1};
/* backdrop pixels per default art pixel: 2 at Detail High when the default art pixel is at least 2 device px (the HD backdrop:
   fine 1 px dithers, rims and stars at the HD tiles' resolution), else 1 */
function skyZ(){return HAVE.tile&&typeof hdOK==='function'&&hdOK()&&(B.cam.sdef||1)>=2?2:1}
function drawSky(){if(!HAVE.sky){drawBackdrop(B.bk);return}
 // one buffer size per viewport (a rebuild costs tens of ms): its pixel is the default art pixel (or half of it, HD), in CSS px, and survives a resolution change
 const z=skyZ();if(SKYB.vw!==cw||SKYB.vh!==ch||!SKYB.w||SKYB.z!==z){SKYB.vw=cw;SKYB.vh=ch;SKYB.z=z;SKYB.px=Math.max(1,B.cam.sdef||1)/dpr/z;SKYB.w=Math.ceil(cw/SKYB.px);SKYB.h=Math.ceil(ch/SKYB.px)}
 const w=SKYB.w,h=SKYB.h,hour=typeof G!=='undefined'&&G&&typeof G.hour==='number'?G.hour:12,key_=B.bk+'|'+w+'|'+h+'|'+(hour*4|0)+'|'+z;
 if(SKYB.key!==key_||(!reduced&&now-SKYB.t>Math.max(240,SKYB.cost*40))){const c=SKYB.cv||(SKYB.cv=mkCanvas(w,h));if(c.width!==w||c.height!==h){c.width=w;c.height=h}const q=c.getContext('2d'),t0=performance.now();SKYB.key=key_;SKYB.t=now;
  q.setTransform(1,0,0,1,0,0);q.globalAlpha=1;q.globalCompositeOperation='source-over';q.imageSmoothingEnabled=false;
  try{drawBackdropPx(q,w,h,{bk:B.bk,hour,frame:tileFrame(),hd:z})}catch(e){artFail('sky',e);SKYB.key='';drawBackdrop(B.bk);return}SKYB.cost=performance.now()-t0}
 const k=SKYB.px*dpr;g.setTransform(1,0,0,1,0,0);g.drawImage(SKYB.cv,0,0,Math.round(w*k),Math.round(h*k))}

/* ---- the frame ---- */
let btx=0,bty=0,BKX=1;const DU=[];for(let d=0;d<ND;d++)DU.push([]);
function tfArt(){const c=B.cam,s=c.z===c.zt?c.s:c.z*2*dpr;g.setTransform(s*BKX,0,0,s,btx,bty)}
function tfBoard(){const c=B.cam,s=(c.z===c.zt?c.s:c.z*2*dpr)/2;g.setTransform(s*BKX,0,0,s,btx,bty)}
function drawBattle(dt){dt=dt||0;const cam=B.cam;if(!HAVE.init)haveInit();let R=viewEnsure();BKX=rotStep();R=V;
 if(now-TN.at>1000){TN.at=now;if(tintRefresh()){viewBuild();R=V}}
 updateBattleCam(dt);if(HAVE.tile&&tileK()!==TL.k){TL.k=tileK();stripsReset()}g.imageSmoothingEnabled=false;drawSky();stripsEnsure(R);animTick(R);warmSprites();planPrep();buildOverlays(R);pathPrep(R);bmPrep(R);
 for(let d=0;d<ND;d++)DU[d].length=0;
 for(let i=0;i<B.units.length;i++){const u=B.units[i],v=visOf(u);v.drawn=false;if(u.alive)stepUnit(u,v,dt);else if(!v.deadT)v.deadT=now;poseTo(u,v);if(v.show){const L=DU[clamp(u.alive?v.depth:udepth(u,R),0,ND-1)];if(usize(u)>1)L.unshift(u);else L.push(u)}}
 if(typeof fxScan==='function')fxScan(dt);
 const sc=cam.z===cam.zt?cam.s:cam.z*2*dpr,sx=typeof fxShakeX==='function'?fxShakeX():0,sy=typeof fxShakeY==='function'?fxShakeY():0;
 const btx0=Math.round(dpr*(VC.x+sx)-cam.x*sc/2);bty=Math.round(dpr*(VC.y+sy)-cam.y*sc/2);btx=BKX!==1?Math.round(dpr*VC.x*(1-BKX)+btx0*BKX):btx0;
 tfArt();propFade(R,dt);const vy0=-bty/sc-2,vy1=(cv.height-bty)/sc+2;
 for(let d=0;d<ND;d++){if(R.y0[d]<vy1&&R.y0[d]+R.h[d]>vy0){g.drawImage(R.cv[d],R.x0[d],R.y0[d],R.w[d],R.h[d]);drawOverlays(R,d)}
  const L=DU[d];let i=0;for(;i<L.length&&usize(L[i])>1;i++)drawUnit(L[i],VIS.get(L[i]));   // a big unit first: props and figures in front of its tiles cover it
  if(R.props[d].length)drawProps(R,d);for(;i<L.length;i++)drawUnit(L[i],VIS.get(L[i]))}
 drawUnitOverlays();drawPlan(R);drawPathPreview(R);bmLine(R);drawHitChances();pillsFlush(sc);
 btx=btx0;g.setTransform(sc/2,0,0,sc/2,btx,bty);g.imageSmoothingEnabled=true;if(typeof fxDraw==='function')fxDraw(dt);   // effects: board space (1 unit = half an art pixel), never squashed
 g.setTransform(dpr,0,0,dpr,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';if(typeof fxAmbient==='function')fxAmbient(B.bk,dt);drawVignette(.8)}
/* pixel icons for the view buttons in the battle HUD (rotate left / right, heights) */
const VICON={rotl:['................','................','....l...........','...ll...........','..lllllll.......','.llllllllll.....','..lll....lll....','...ll.....lll...','....l......ll...','...........ll...','...........ll...','..........lll...','....ll...lll....','....lllllll.....','.....lllll......','................'],
 bars:['................','.00000000000000.','.0AAAAAAAAABBB0.','.0AAAAAAAAABBB0.','.00000000000000.','.0qqqqqqpppppp0.','.00000000000000.','................','......0000......','.....0ssss0.....','.....0ssss0.....','......0ss0......','....00555500....','...0555555550...','...0555555550...','...0000000000...'],
 heights:['................','................','..........dddd..','..........dccc..','..........dccc..','......ddddcccb..','......dcccbbbb..','......dcccbbbb..','..ddddcccbbbbb..','..dcccbbbbbbbb..','..dcccbbbbbbbb..','..dcccbbbbbbbb..','..aaaaaaaaaaaa..','................','................','................']};
function viewIcon(n,size){if(typeof pkHas==='function'&&pkHas('pa-'+n)&&hdArt()){const u=pkURL('pa-'+n);if(u)return'<img class="pxi" src="'+u+'" width="'+(size||16)+'" height="'+(size||16)+'" alt="" draggable="false" style="display:block;flex:none;width:'+(size||16)+'px;height:'+(size||16)+'px;image-rendering:auto">'}   // painted twin (06pa-ui.js) at Detail High
 const rows=n==='rotr'?pxFlip(VICON.rotl):VICON[n],u=rows?pxURL('view:'+n,rows,1):'';size=size||16;
 return u?'<img class="pxi" src="'+u+'" width="'+size+'" height="'+size+'" alt="" draggable="false" style="display:block;flex:none;width:'+size+'px;height:'+size+'px;image-rendering:pixelated">':'<b aria-hidden="true">'+(n==='rotl'?'‹':n==='rotr'?'›':'#')+'</b>'}

/* ================= FRAME ================= */
let hudStr='';
/* the top bar never runs under the rail: when its contents overflow (a narrow phone, safe-area insets, long numbers, a large system font)
   it sheds detail a step at a time (f1: the company's name and the renown/ambition names; f2: the words after the numbers and "Day";
   f3: the renown bar and the ambition's count, one weather glyph; f4: tighter spacing and type; f5: the company banner and the weather;
   last of all it clips). Every button stays, as its icon. Called when the bar's text or the layout changes. */
const HUDF=['f1','f2','f3','f4','f5'];
function hudFit(){const h=typeof document==='object'?$('hud'):null;if(!h||h.classList.contains('hidden'))return 0;h.classList.remove(...HUDF);let k=0;
 const over=()=>{if(h.scrollWidth>h.clientWidth+1)return true;const L=h.lastElementChild,r=L&&L.getBoundingClientRect(),b=h.getBoundingClientRect();return!!(r&&r.width&&r.right>b.right+.5)};
 while(k<HUDF.length&&over())h.classList.add(HUDF[k++]);return k}
try{const R=typeof document==='object'&&document&&document.fonts?document.fonts.ready:null;if(R&&typeof R.then==='function')R.then(()=>{try{hudFit()}catch(e){}},()=>{})}catch(e){}
function frame(t){requestAnimationFrame(frame);if(window.innerWidth!==cw||window.innerHeight!==ch)screenRecover(false);const raw=t-now,dt=Math.min(.05,raw/1000||0),t0=performance.now();now=t;perfTick(raw);
 if(mode!==lastMode){lastMode=mode;setRes();refreshScene();if(mode==='world')WV.boot=true}
 g.setTransform(dpr,0,0,dpr,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
 if(mode==='world'&&G&&W){if(!sheetOpen)worldTick(dt);if(mode==='world'){drawWorld(dt);drawMinimap();const hh=Math.floor(G.hour),s=G.crowns+'|'+G.food+'|'+G.roster.length+'|'+G.day+'|'+hh+'|'+(G.weather?G.weather.kind:'');
   if(s!==hudStr){hudStr=s;const set=(id,v,w,pre)=>{const e=$(id);if(e)e.innerHTML=(pre?'<span class="hw">'+pre+'</span>':'')+v+(w?'<span class="hw"> '+w+'</span>':'')};set('hCoin',G.crowns,'crowns');set('hFood',G.food,'food');set('hMen',G.roster.length,'swords');set('hDay',G.day+', '+String(hh).padStart(2,'0')+':00','','Day ');if(typeof mapHudWeather==='function')mapHudWeather();hudFit()}}}
 g.imageSmoothingEnabled=true;if(mode==='battle'&&B)drawBattle(dt);
 else if(mode==='title'){drawBackdrop('title');if(typeof fxAmbient==='function')fxAmbient('title',dt);drawVignette(.9)}
 PERF.draw+=(performance.now()-t0-PERF.draw)*.05}

/* ---- coming back to the game (app switch, lock screen, bfcache): the viewport may have changed while hidden without a
   resize event (so the canvas would be stretched), and iOS may have purged cached canvases. Re-measure, re-fit and
   rebuild the board's caches; measure again once the browser toolbars have settled. ---- */
function screenRecover(deep){try{if(typeof Layout!=='undefined'&&Layout&&Layout.update)Layout.update()}catch(e){}
 try{resize()}catch(e){}
 if(deep){BGC.key='';try{if(typeof B!=='undefined'&&B&&B.tiles)viewInvalidate()}catch(e){}try{if(typeof WCH!=='undefined')WCH.w=null}catch(e){}
  try{if(typeof MM!=='undefined'&&MM)MM.sig=''}catch(e){}}}
/* iOS can hand the page back magnified (user-scalable is ignored there; an app switch or a turn of the phone while away restores a zoomed
   page). Rewriting the viewport tag, even to the same limits, makes the browser apply it again and drop back to scale 1. */
const VPFIX={a:'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no',n:0};
function vpUnzoom(force){try{const v=window.visualViewport,m=document.querySelector('meta[name="viewport"]');if(!m)return false;if(!force&&!(v&&Math.abs(v.scale-1)>.01))return false;
 m.setAttribute('content',VPFIX.a+((++VPFIX.n)&1?', shrink-to-fit=no':''));if(window.scrollX||window.scrollY)window.scrollTo(0,0);return true}catch(e){return false}}
function screenBack(){vpUnzoom(true);screenRecover(true);setTimeout(()=>{vpUnzoom(false);screenRecover(false)},250);setTimeout(()=>screenRecover(false),250);setTimeout(()=>screenRecover(false),900)}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)screenBack()});
 window.addEventListener('pageshow',e=>{if(e.persisted)screenBack()});
 window.addEventListener('focus',()=>screenRecover(false));
 window.addEventListener('orientationchange',()=>setTimeout(()=>{vpUnzoom(false);screenRecover(true)},300));
 try{if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>{if(Math.abs(window.visualViewport.scale-1)>.01)setTimeout(()=>vpUnzoom(false),60)})}catch(e){}
}

/* ---- the East (19-east.js, 77-east-art.js): eastern towns (t.east, unless the East took them in the war: t.eastPrev0 marks those),
   hosts of the Shogunate (party f 'east') and the region's scenery (eastProps). Every sprite goes through wvSprite (the cache and the
   draw list), keyed by eastSpriteKey. Option objects are reused: nothing is allocated per frame once the sprites are made. ---- */
const WVE={on:false,props:[],sig:'',town:{k:'town',size:1,night:false,frame:0},band:{k:'band',goal:'',n:1,frame:0,dir:1,moving:false},prop:{k:'prop',v:'',s:0}};
function wvEastFrame(){WVE.on=typeof drawEastPx==='function'&&typeof eastSpriteKey==='function'&&typeof eastBoxPx==='function'&&!!(G&&G.east);if(!WVE.on)return;
 if(typeof eastProps==='function'){const sig=(G.seed|0)+'|'+WN;if(WVE.sig!==sig){WVE.sig=sig;let L=[];try{L=eastProps()||[]}catch(e){L=[]}WVE.props=L.map(p=>({x:p.x,y:p.y,v:p.v,s:p.s|0,key:''}))}}else WVE.props=[]}
function wvEastSpr(O,k,size,night,frame){O.size=size;O.night=!!night;O.frame=frame;const key=eastSpriteKey(O);return wvSprite(key,'E'+k+size,'east',O)}
function wvEastBand(p,str,f,dir,mv){const O=WVE.band;O.goal=p.goal||'';O.n=p.mult||1;O.frame=f&3;O.dir=dir;O.moving=mv;return wvSprite(eastSpriteKey(O),'Eb'+(O.n>=1.35?3:O.n>=1.1?2:1),'east',O)}
function wvEastProp(p){const O=WVE.prop;O.v=p.v;O.s=p.s;if(!p.key){p.key=eastSpriteKey(O);p.base='Ep'+p.v}return wvSprite(p.key,p.base,'east',O)}
