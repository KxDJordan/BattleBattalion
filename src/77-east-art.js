/* ================= THE EAST: WORLD-MAP ART (phase 8a, east agent) =================
   Painted with the world art's own painter (waP / waSprite / waShadow in 41-worldart.js), PAL keys only, cached per key.
   drawEastPx(q, x, y, o)  draws one eastern thing with its foot at (x, y):
     o.k 'town'  {size 1..3, night, frame}            an eastern town: curved roofs, a pagoda, a castle keep (size 3), a torii
     o.k 'band'  {goal, frame, dir, moving, n|str}    a host of the Shogunate: ashigaru under sashimono, a nobori banner
     o.k 'prop'  {v: 'torii'|'pagoda'|'cherry'|'pine'|'terrace'|'shrine', s (seed)}   scenery of the region
   eastBoxPx(o) -> {w, h} the sprite box (for culling and hit tests).
   eastProps() -> [{x, y, v, s}] the region's scenery in world units, generated once per world from the seed (no rnd draw); the renderer
     draws each seen one like a site (static: part of the draw list, so the frame-skip signature covers them).
   eastSpriteKey(o) -> a cache key for the renderer's sprite cache. */
const EA={box:{town1:{w:36,h:28},town2:{w:46,h:40},town3:{w:58,h:54},band:{w:44,h:34},torii:{w:16,h:16},pagoda:{w:16,h:30},cherry:{w:16,h:16},pine:{w:18,h:15},terrace:{w:22,h:12},shrine:{w:16,h:14}},props:null,sig:''};
function eastBoxPx(o){o=o||{};const B=EA.box;if(o.k==='town')return B['town'+clamp(o.size|0||1,1,3)];if(o.k==='band')return B.band;return B[o.v]||B.cherry}
function eastSpriteKey(o){o=o||{};if(o.k==='town')return'Et'+clamp(o.size|0||1,1,3)+(o.night?'n':'d')+((o.frame|0)&3);if(o.k==='band')return'Eb'+eaBandK(o)+((o.frame|0)&3)+(o.dir<0?'l':'r')+(o.moving?'m':'s');return'Ep'+(o.v||'cherry')+((o.s|0)&3)}
function eaBandK(o){const n=+o.n||+o.str||+o.mult||1;return n>=1.35?3:n>=1.1?2:1}
/* ---- painters ---- */
// a curved (irimoya) roof: concave slopes, the eaves turned up at both ends; R [light, mid, dark]
function eaRoof(P,cx,yb,hw,H,R,ridge){for(let j=0;j<H;j++){const t=(j+1)/H,ww=Math.max(1,Math.round(hw*(.3+.7*t*t))),y=yb-H+1+j;
  for(let i=-ww;i<=ww;i++)P.p(cx+i,y,j===H-1?(i<0?R[1]:R[2]):i<-ww*.3?R[0]:i>ww*.4?R[2]:R[1])}
 P.p(cx-hw-1,yb-1,R[1]);P.p(cx+hw+1,yb-1,R[2]);P.p(cx-hw,yb,R[1]);P.p(cx+hw,yb,R[2]);
 if(ridge){P.p(cx-Math.max(1,Math.round(hw*.3))-1,yb-H,ridge);P.p(cx+Math.max(1,Math.round(hw*.3))+1,yb-H,ridge)}}
// a plastered wall block with dark timber and windows
function eaWall(P,x,yb,w,h,night,win){P.r(x,yb-h+1,w,h,'l');P.r(x+w-1,yb-h+1,1,h,'m');P.r(x,yb,w,1,'i');for(let i=0;i<w;i+=3)P.p(x+i,yb-1,'j');
 if(win)for(let i=1;i<w-1;i+=3)P.p(x+i,yb-h+2,night?'y':'G')}
function eaHouse(P,x,yb,w,night,roof){eaWall(P,x,yb,w,3,night,1);eaRoof(P,x+(w>>1),yb-3,(w>>1)+1,3,roof||['4','3','2'])}
function eaTorii(P,cx,yb,w,h){const L=cx-(w>>1)+1,R=cx+(w>>1)-1;for(let y=yb-h+2;y<=yb;y++){P.p(L,y,'g');P.p(R,y,'f')}
 for(let x=L-1;x<=R+1;x++)P.p(x,yb-h+3,x<cx?'g':'f');for(let x=L-2;x<=R+2;x++)P.p(x,yb-h+1,'G');P.p(L-2,yb-h,'G');P.p(R+2,yb-h,'G');for(let x=L-1;x<=R+1;x++)P.p(x,yb-h,x===L-1||x===R+1?'.':'f')}
function eaPagoda(P,cx,yb,n,night){let y=yb;const RF=['4','3','2'];for(let k=0;k<n;k++){const hw=Math.max(2,4-k)+(n>3?0:0);P.r(cx-hw+1,y-2,hw*2-1,3,k?'g':'l');P.p(cx+hw-1,y-1,'f');if(night&&k===0)P.p(cx,y-1,'y');else P.p(cx,y-1,k?'f':'G');
  eaRoof(P,cx,y-3,hw+1,2,RF);y-=5}
 for(let j=0;j<5;j++)P.p(cx,y+1-j,j&1?'c':'d');P.p(cx,y-4,'e')}
function eaCherry(P,cx,yb,s){const R=waRng(500+(s|0));for(let j=0;j<5;j++)P.p(cx+(j>2?(j&1):0),yb-j,j<2?'i':'j');P.p(cx-1,yb-3,'i');P.p(cx+1,yb-4,'i');
 P.ell(cx,yb-8,6,4.4,(x,y,a,b)=>{const e=a*a+b*b,h=R();return e>.85&&h<.35?null:h<.18?'r':(b<-.2||a<-.3)?(h<.6?'h':'l'):h<.3?'g':'h'});for(let i=0;i<3;i++)P.p(cx-5+Math.floor(R()*11),yb-1+Math.floor(R()*2),'h')}
function eaPine(P,cx,yb,s){const R=waRng(600+(s|0)),lean=R()<.5?-1:1;for(let j=0;j<8;j++)P.p(cx+Math.round(lean*j*j/24),yb-j,j<4?'i':'a');
 const pads=[[0,-3,6,2],[lean*3,-7,5,1.8],[-lean*2,-10,4,1.5],[lean,-12,2.6,1.2]];for(const [dx,dy,w,hh] of pads){const px=cx+dx+Math.round(lean*(-dy)*(-dy)/24);
  P.ell(px,yb+dy,w,hh,(x,y,a,b)=>b<-.25?(a<.2?'A':'B'):a>.5||b>.45?'3':R()<.25?'B':'7')}}
function eaTerrace(P,s){const fl=P.flat;P.flat=true;const W=P.w,H=P.h;for(let r=0;r<4;r++){const y=H-3-r*3,x0=1+r*2,x1=W-2-r;for(let x=x0;x<=x1;x++){P.p(x,y,'4');P.p(x,y-1,((x+r+(s|0))%5===0)?'v':r&1?'x':'v');P.p(x,y-2,r&1?'F':'A')}P.p(x0,y-1,'B');P.p(x1,y-1,'B')}P.flat=fl}
function eaShrine(P,cx,yb){P.r(cx-3,yb-3,7,4,'j');P.r(cx+2,yb-3,1,4,'i');P.p(cx,yb-1,'a');P.p(cx,yb-2,'c');eaRoof(P,cx,yb-4,5,3,['4','3','2'],'c');P.p(cx-6,yb,'p');P.p(cx-6,yb-1,'q');P.p(cx+6,yb,'p');P.p(cx+6,yb-1,'q')}
/* ---- towns ---- */
function eaTown(P,size,night,f){const W=P.w,B=P.h-3;
 if(size<=1){waGround(P,18,B-2,16,5,'k','j');eaTerrace0(P,2,B-1,10);
  eaHouse(P,4,B-7,9,night);eaHouse(P,21,B-8,10,night,['k','j','i']);eaCherry(P,31,B-2,1);eaHouse(P,11,B,10,night,['k','j','i']);eaTorii(P,27,B+1,8,8);
  P.outline();waSmoke(P,9,B-15,f)}
 else if(size===2){waGround(P,23,B-3,21,7,'k','m');
  eaPagoda(P,9,B-6,3,night);eaHouse(P,15,B-14,9,night);eaHouse(P,27,B-15,11,night,['k','j','i']);eaCherry(P,39,B-9,2);
  // a walled temple court
  for(let x=14;x<36;x++){P.p(x,B-6,'l');P.p(x,B-7,x&1?'4':'3')}eaShrine(P,25,B-8);
  eaHouse(P,3,B,10,night,['k','j','i']);eaHouse(P,30,B,11,night);eaTorii(P,20,B+1,10,10);eaPine(P,40,B,2);
  P.outline();waSmoke(P,32,B-21,f);waSmoke(P,7,B-6,f+2)}
 else{waGround(P,29,B-3,28,8,'k','m');
  // the castle: a battered stone base, three white storeys under curved roofs, gold shachihoko on the ridge
  const cx=29,sb=B-12;for(let j=0;j<7;j++){const hw=12-Math.round(j*.6);for(let i=-hw;i<=hw;i++)P.p(cx+i,sb-j,(waHash(i,j,7)<.18)?'o':i<-hw+2?'q':i>hw-2?'o':'p')}
  let y=sb-7;const RF=['G','2','0'];for(let k=0;k<3;k++){const hw=9-k*2;eaWall(P,cx-hw+1,y,hw*2-1,k===2?3:4,night,1);eaRoof(P,cx,y-(k===2?3:4),hw+2,3,RF,k===2?'d':null);y-=k===2?6:7}
  P.p(cx-2,y+1,'c');P.p(cx+2,y+1,'c');P.p(cx-3,y+2,'d');P.p(cx+3,y+2,'d');
  // outer wall, gate tower, houses, a pagoda and cherries
  for(let x=4;x<W-4;x++){P.p(x,B-5,'l');P.p(x,B-6,'m');P.p(x,B-7,x&1?'G':'2')}for(let x=4;x<W-4;x+=4)P.p(x,B-4,'p');
  eaWall(P,cx-4,B-1,9,4,night,0);P.r(cx-1,B-3,3,3,'a');eaRoof(P,cx,B-5,6,3,RF);
  eaPagoda(P,8,B-14,4,night);eaCherry(P,50,B-12,3);eaHouse(P,40,B-9,10,night);eaHouse(P,9,B,10,night,['k','j','i']);eaHouse(P,42,B,11,night,['k','j','i']);eaTorii(P,cx,B+2,12,9);
  P.outline();waSmoke(P,45,B-16,f);waSmoke(P,12,B-4,f+1)}}
function eaTerrace0(P,x,yb,w){const fl=P.flat;P.flat=true;for(let r=0;r<2;r++)for(let i=0;i<w-r*3;i++){P.p(x+i+r,yb-r*2,'4');P.p(x+i+r,yb-r*2-1,(i+r)%4===0?'v':'x')}P.flat=fl}
/* ---- the host ---- */
const EAFIG={b:['.......','.GGGGG.','GGGGGGG','..sst..','..s0t..','.gGgGg.','sgGgGgs','.GgGgG.','..GcG..'],la:['..i.i..','..i.i..','.ii.ii.'],lb:['..i.i..','.i...i.','ii...ii']};
const EAFIGS={b:['...c...','..GGG..','.GGcGG.','..sst..','..s0t..','.ggcgg.','sggcggs','.gGcGg.','..gcg..'],la:['..G.G..','..G.G..','.GG.GG.'],lb:['..G.G..','.G...G.','GG...GG']};
function eaBand(P,k,f,moving){const B=P.h-4,cx=P.w>>1,st=i=>moving?((f+i)&1):0,up=i=>moving&&((f+i)&3)===1?1:0;
 const L=k>=3?[[cx+9,B-2,1],[cx-9,B,0],[cx+1,B+2,0]]:k===2?[[cx+6,B-1,1],[cx-6,B+1,0]]:[[cx,B,1]];
 L.forEach((e,i)=>{const sam=e[2],F=sam?EAFIGS:EAFIG,b=waFigure(P,F,e[0],e[1],st(i),up(i));const px=b.x0-1,py=b.y;
  // the sashimono: pole up the back, a small flag with the red sun
  for(let j=-7;j<6;j++)P.p(px,py+j,'j');const fl=sam?'G':'l';for(let a=0;a<=3;a++)P.p(px-a,py-6,'i');for(let j=0;j<5;j++)for(let a=1;a<=3;a++)P.p(px-a,py-5+j+(a===3&&moving&&(f&1)?1:0),a===3&&j===4?'m':fl);P.p(px-2,py-3,sam?'c':'g');P.p(px-2,py-4,sam?'c':'g');
  // a yari over the shoulder, or the general's katana
  if(!sam){const yx=b.x0+b.w;for(let j=0;j<13;j++)P.p(yx,py+8-j,j>10?(j>11?'r':'q'):'k');P.p(yx,py+5,'s')}else{P.p(b.x0+b.w,py+6,'q');P.p(b.x0+b.w+1,py+5,'q');P.p(b.x0+b.w+2,py+4,'r')}});
 // the nobori: a tall white war banner with the mon, carried at the head of the host
 const nx=L[0][0]+5,ny=L[0][1]-22;for(let j=0;j<20;j++)P.p(nx,ny+j,'i');P.p(nx,ny-1,'c');for(let j=0;j<9;j++)for(let a=1;a<=3;a++)P.p(nx+a,ny+1+j+(a===3&&moving&&((f>>1)&1)?1:0),a===3?'m':'l');
 P.p(nx+2,ny+4,'g');P.p(nx+1,ny+4,'g');P.p(nx+2,ny+5,'g');P.p(nx+1,ny+5,'f');for(let a=1;a<=3;a++)P.p(nx+a,ny+1,'G');
 P.outline()}
/* ---- public ---- */
function drawEastPx(q,x,y,o){if(typeof waInit!=='function'||!waInit())return;o=o||{};const rm=typeof waRM==='function'&&waRM(),f=rm?0:(o.frame|0)&3,D=eastBoxPx(o),key=eastSpriteKey(Object.assign({},o,{frame:f}));
 let paint;if(o.k==='town'){const sz=clamp(o.size|0||1,1,3),night=o.night?1:0;paint=P=>eaTown(P,sz,night,f)}
 else if(o.k==='band'){const k=eaBandK(o),mv=!!o.moving&&!rm,dir=o.dir<0?-1:1;paint=P=>{eaBand(P,k,f,mv);if(dir<0)P.mirror()}}
 else{const v=EA.box[o.v]?o.v:'cherry',s=(o.s|0)&3;paint=P=>{const B=P.h-2,cx=P.w>>1;if(v==='torii'){eaTorii(P,cx,B,10,11)}else if(v==='pagoda'){eaPagoda(P,cx,B,4,false)}else if(v==='cherry'){eaCherry(P,cx,B,s)}else if(v==='pine'){eaPine(P,cx,B,s)}else if(v==='shrine'){eaShrine(P,cx,B)}else{eaTerrace(P,s);return}P.outline()}}
 const s=waSprite(key,D.w,D.h,D.w>>1,D.h-2,paint);if(o.k!=='prop'||o.v==='pagoda'||o.v==='shrine')waShadow(q,x,y,Math.max(8,D.w-6),o.k==='band'?5:6);q.drawImage(s.cv,Math.round(x)-s.ax,Math.round(y)-s.ay)}
/* the region's scenery: on eastern land tiles off roads, rivers and towns, about one prop in nine tiles, chosen by hash from the seed */
function eastProps(){const w=typeof eastW==='function'?eastW():null;if(!w||!w.east)return[];const sig=(w.seed|0)+'|'+WN;if(EA.props&&EA.sig===sig)return EA.props;const L=[],T=w.towns||[];
 for(let ty=1;ty<WN-1;ty++)for(let tx=1;tx<WN-1;tx++){const i=ty*WN+tx;if(!w.east[i]||!w.ok[i]||w.road[i]||w.river[i])continue;const t=w.tiles[i];if(t===4||t===0)continue;
  const h=(typeof waHash==='function'?waHash(tx,ty,(w.seed|0)&0xffff):((tx*73856093)^(ty*19349663))%1000/1000);if(h>.12)continue;const px=(tx+.5)*TS,py=(ty+.5)*TS;let near=1e9;for(const o of T)near=Math.min(near,Math.hypot(o.x-px,o.y-py)/TS);if(near<1.6)continue;
  const g=(h*1e4|0)%100,v=near<3.2&&g<30?'terrace':near<4&&g<40?'torii':t===3&&g<22?'pagoda':t===2||t===3?(g<70?'pine':'cherry'):t===5?'pine':g<14?'shrine':g<60?'cherry':'pine';
  L.push({x:px+((h*997)%1-.5)*TS*.5,y:py,v,s:g&3})}
 EA.props=L;EA.sig=sig;return L}
