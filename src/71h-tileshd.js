/* ================= HD TERRAIN (high-resolution tiles for 71-tiles.js drawTilePx) =================
   The same tiles at twice the art resolution: a tile top is a 64x32 diamond (HD pixels, half an art pixel each), cliff faces
   16 HD px a step. Painted straight into RGB buffers with per-biome colour ramps (ordered dither between ramp steps, never
   smoothed), cached as canvases and blitted at half size in art space, so the board's geometry, picking and units are
   untouched: 70-render.js builds its ground strips at 2 strip pixels per art pixel (TL.k 2) and asks for these (o.hd).
   HD geometry (tile centre at 0,0 is the art centre; HD pixel X,Y covers art X/2..X/2+.5): the top is every pixel with
   |X+.5| + 2|Y-.5| < 32, rows -15..16, which tessellates exactly with neighbours at (+-32,+-16); a cliff column X starts at
   row ceil(16.5-|X+.5|/2), right under the lower edge. Variation is a hash of (c,r); the seeded game rnd() is never used.
   Low-frequency noise is sampled in rot-0 board space, so at the default view the ground flows across tile borders. */
const TXHD={on:true,cap:1600};
const HDHEAD=28;                                   // headroom above the diamond (HD px) for upright details
function hdOK(){return TXHD.on&&hdArt()&&!(typeof SET==='object'&&SET&&SET.hdTiles===false)}
function hdC(k){const s=PAL[k]||k,n=parseInt(s.slice(1),16);return(0xff000000|(n&255)<<16|(n>>8&255)<<8|n>>16)>>>0}
function hdR(c){return c&255}function hdG(c){return c>>8&255}function hdB(c){return c>>16&255}
function hdP(r,g,b){r=r<0?0:r>255?255:r|0;g=g<0?0:g>255?255:g|0;b=b<0?0:b>255?255:b|0;return(0xff000000|b<<16|g<<8|r)>>>0}
function hdMix(a,b,t){return hdP(hdR(a)+(hdR(b)-hdR(a))*t,hdG(a)+(hdG(b)-hdG(a))*t,hdB(a)+(hdB(b)-hdB(a))*t)}
function hdMul(a,f){return hdP(hdR(a)*f,hdG(a)*f,hdB(a)*f)}
/* ramp: n colours through the stops (hex or PAL keys), linear in RGB */
function hdRamp(stops,n){const S=stops.map(hdC),o=[];n=n||S.length;for(let i=0;i<n;i++){const t=i/(n-1)*(S.length-1),j=Math.min(S.length-2,t|0);o.push(hdMix(S[j],S[j+1],t-j))}return o}
/* 7-step ramp around three PAL keys (lo, mid, hi): one darker below and one lighter above */
const HDR3=new Map();
function hdR3(lo,mid,hi){const id=lo+mid+hi;let r=HDR3.get(id);if(r)return r;const L=hdC(lo),M=hdC(mid),H=hdC(hi);
 r=[hdMix(hdMul(L,.62),hdC('#0b1020'),.15),L,hdMix(L,M,.5),M,hdMix(M,H,.5),H,hdMix(H,hdC('#fff8e0'),.35)];HDR3.set(id,r);return r}
function hdIn(x,y){const a=(x<0?-x-.5:x+.5)+2*(y<.5?.5-y:y-.5);return a<32}
function hdRing(x,y){return 32-((x<0?-x-.5:x+.5)+2*(y<.5?.5-y:y-.5))}     // >0 inside; <2 is the outermost 1 px line
/* ---- painter: RGB buffer with an origin; s() clips to the tile diamond ---- */
function hdBuf(w,h,ax,ay){const d=new Uint32Array(w*h);
 const P={w,h,d,ax,ay,
  p(x,y,c){x=(x+ax)|0;y=(y+ay)|0;if(x<0||y<0||x>=w||y>=h||!c)return;d[y*w+x]=c},
  s(x,y,c){if(hdIn(x,y))P.p(x,y,c)},
  g(x,y){x=(x+ax)|0;y=(y+ay)|0;if(x<0||y<0||x>=w||y>=h)return 0;return d[y*w+x]},
  m(x,y,f){const c=P.g(x,y);if(c)P.p(x,y,hdMul(c,f))},                      // darken in place
  t(x,y,col,a){const c=P.g(x,y);if(c)P.p(x,y,hdMix(c,col,a))}};             // tint in place
 return P}
function hdCv(P){const c=pxCanvas(P.w,P.h);if(!c||!c.getContext)return null;const g=c.getContext('2d');if(!g)return null;
 const im=g.createImageData(P.w,P.h);new Uint32Array(im.data.buffer).set(P.d);g.putImageData(im,0,0);return c}
function hdDi(G,v,x,y){const n=G.length-1;if(v<=0)return G[0];if(v>=n)return G[n];let i=v|0;if((v-i)*16>TXBAY[(x&3)+(y&3)*4]+.5)i++;return G[i]}
/* smooth value noise on a lattice of cell s (0..1) */
function hdN(x,y,s,seed){const fx=x/s,fy=y/s,ix=Math.floor(fx),iy=Math.floor(fy);let u=fx-ix,v=fy-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);
 const a=txHash(ix,iy,seed),b=txHash(ix+1,iy,seed),c=txHash(ix,iy+1,seed),d=txHash(ix+1,iy+1,seed);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
/* random point in the diamond, m = margin 0..1 */
function hdPt(R,m){const u=(R()-.5)*(1-m),v=(R()-.5)*(1-m);return[Math.round((u-v)*32),Math.round((u+v)*16)+1]}
function hdEach(fn){for(let y=-15;y<=16;y++){const a=y<.5?.5-y:y-.5,hw=32-2*a;for(let x=-Math.floor(hw+.5);x<=Math.floor(hw-.5);x++)if((x<0?-x-.5:x+.5)<hw)fn(x,y,a)}}
/* noisy elliptical blot (flat pass); fn(x,y,q) gives the colour, q 0 centre .. 1 rim */
function hdBlot(P,cx,cy,rx,ry,seed,fn){const ix=Math.ceil(rx)+2,iy=Math.ceil(ry)+2;for(let y=-iy;y<=iy;y++)for(let x=-ix;x<=ix;x++){const X=cx+x,Y=cy+y;if(!hdIn(X,Y))continue;
  const q=Math.sqrt(x*x/(rx*rx)+y*y/(ry*ry))+(hdN(X,Y*2,3,seed)-.5)*.5;if(q<1){const c=fn(X,Y,q);if(c)P.p(X,Y,c)}}}
/* a soft contact shadow under an upright thing (ground darkening, dithered rim) */
function hdShadow(P,cx,cy,rx,ry,f){for(let y=-Math.ceil(ry);y<=ry;y++)for(let x=-Math.ceil(rx);x<=rx;x++){const q=x*x/(rx*rx)+y*y/(ry*ry);if(q>1)continue;const X=cx+x,Y=cy+y;if(!hdIn(X,Y))continue;
  if(q<.55||TXBAY[(X&3)+(Y&3)*4]>(q-.55)*30)P.m(X,Y,f)}}
/* shaded ball, light from the top-left: G ramp dark..light; tex adds leafy/stony break-up */
function hdBall(P,cx,cy,rx,ry,G,tex,seed,clip){const n=G.length-1;for(let y=-Math.ceil(ry);y<=ry;y++)for(let x=-Math.ceil(rx);x<=rx;x++){const nx=(x+.5)/rx,ny=(y+.5)/ry,q=nx*nx+ny*ny;if(q>1)continue;
  const nz=Math.sqrt(1-q),L=-.5*nx-.62*ny+.6*nz,X=cx+x,Y=cy+y;let v=(L*.75+.32)*n+(tex?(txHash(X,Y,seed)-.5)*tex:0);if(q>.82)v-=.8;
  const c=hdDi(G,v,X,Y);if(clip)P.s(X,Y,c);else P.p(X,Y,c)}}
/* grass blade: base (x,y) up len px, bending by lean; cols [base, mid, tip] */
function hdBlade(P,x,y,len,lean,cols){for(let i=0;i<len;i++){const t=len>1?i/(len-1):1;P.p(x+Math.round(lean*t*t),y-i,i===0?cols[0]:t<.55?cols[1]:cols[2])}}
/* a small stone: shaded 2:1 ellipse with a contact shadow toward the lower right */
function hdStone(P,x,y,w,G,seed){const rx=w/2,ry=Math.max(1,w*.32);hdShadow(P,x+1,y+1,rx+1,ry+.6,.7);hdBall(P,x,y-Math.round(ry*.5),rx,ry,G,.8,seed,0)}
/* crystal / glass shard: lit left face, dark right face, bright ridge and tip */
function hdShard(P,x,y,hgt,w,lean,G){const n=G.length-1;for(let dy=0;dy<hgt;dy++){const q=dy/hgt,hw=Math.max(.5,w*Math.pow(1-q,.85)),cx=x+lean*q;
  for(let i=Math.floor(cx-hw);i<=Math.ceil(cx+hw)-1;i++){const e=(i+.5-cx)/hw;let k=e<-.75?n:e<0?n-1-(dy%7===3?1:0):e<.2?n:e>.7?0:1;if(dy===0&&e>-.6)k=Math.max(0,k-1);P.p(i,y-dy,G[Math.max(0,Math.min(n,k))])}}
 P.p(Math.round(x+lean),y-hgt,G[n])}
/* flame: cols outer..core; animated by f, phase ph */
function hdFlame(P,x,y,hgt,f,ph,cols){const t=(f+ph)&7,a=t/8*6.283,sw=Math.sin(a)*1.6,hh=hgt*(1+.14*Math.sin(a*2+ph)),W=hgt*.32;
 for(let L=0;L<cols.length;L++){const s=1-L/(cols.length+.4),lh=hh*(L?s*.95:1);for(let dy=0;dy<lh;dy++){const q=dy/lh,hw=W*s*(q<.22?.55+q*2:Math.pow(1-q,.85)*1.1),cx=x+sw*q*q*1.6+.5;
   for(let i=Math.round(cx-hw);i<Math.round(cx+hw);i++)P.p(i,y-dy,cols[L])}}
 if(t&1)P.p(Math.round(x+sw*2+(ph&1?2:-2)),Math.round(y-hh-2-(t>>1)*2),cols[1])}

/* ---- per-biome HD materials: ground ramp (dark..light), base index, noise, rim/edge colours, cast-shadow colour ---- */
const HDM={
 plains:{ramp:['#223a20','#2e4c27','#3d6230','#4f7a37','#628f43','#78a650','#8fba60','#a6cd72','#c2e08e'],cl:150,grassy:1,base:5,amp:2.6,amp2:1.1,grain:.5,hb:.6,rim:'#d8f5a8',sh:'#0f2418',ao:'#16301e'},
 forest:{ramp:['#0f2622','#163530','#1d4639','#26583c','#336b3c','#437e3c','#57923f','#70a64c','#8dbc60'],cl:130,grassy:1,base:4.2,amp:2.8,amp2:1.2,grain:.5,hb:.6,rim:'#a8d47a',sh:'#06140f',ao:'#0b1e18'},
 hills:{ramp:['#26392b','#324a33','#425e3a','#53723f','#668548','#7a9853','#90ab62','#a8bf78','#c2d392'],cl:110,grassy:1,base:4.2,amp:2.4,amp2:1.2,grain:.6,hb:.6,rim:'#d2e2a4',sh:'#122018',ao:'#1a2a20'},
 swamp:{ramp:['#0c1817','#13231f','#1a2f2a','#223b33','#2c4a3d','#385a45','#46694a','#567a4f','#6a8c58'],cl:100,grassy:1,base:3.6,amp:2.6,amp2:1.2,grain:.8,hb:.5,rim:'#8aa86a',sh:'#050c0b',ao:'#08120f'},
 desert:{pa:.9,ramp:['#6e4f28','#866234','#9c7642','#b28a4c','#c69d52','#d4ad5e','#e0bf72','#ecd28e','#f8e8b6'],cl:50,grassy:0,base:4.9,amp:1.8,amp2:.9,grain:.6,hb:.5,rim:'#fff6d6',sh:'#5a3a22',ao:'#6a4a2a'},
 snow:{pa:.8,ramp:['#6f7d96','#8a97ae','#a3afc2','#b9c3d3','#ccd5e1','#dce3ec','#e9eef5','#f4f7fb','#ffffff'],cl:40,grassy:0,base:6.1,amp:2.2,amp2:.9,grain:.5,hb:.4,rim:'#ffffff',sh:'#4a5a86',ao:'#5a6a92'},
 ashen:{ramp:['#121216','#1a1a20','#23232b','#2d2f37','#393f44','#465052','#535f5f','#63706d','#788580'],cl:90,grassy:0,base:4.1,amp:2.4,amp2:1.2,grain:.6,hb:.5,rim:'#a2b0aa',sh:'#060608',ao:'#0a0a0e'},
 hollow:{ramp:['#150d27','#1e1438','#291b4b','#35235f','#432c74','#523689','#644498','#7a58b2','#9672cc'],cl:70,grassy:0,base:4.4,amp:2.6,amp2:1.2,grain:.5,hb:.5,rim:'#d2b0ff',sh:'#08041a',ao:'#0c0720'},
 glass:{ramp:['#0d322d','#134440','#195852','#1d6c62','#257f70','#3a9682','#56ad96','#79c6ae','#a4e0cc'],cl:30,grassy:0,pa:.9,base:5.5,amp:2,amp2:1,grain:.6,hb:.5,rim:'#eafff8',sh:'#04201c',ao:'#082a24'}};
for(const k in HDM){const m=HDM[k];m.G=hdRamp(m.ramp);m.rimC=hdC(m.rim);m.shC=hdC(m.sh);m.aoC=hdC(m.ao)}
const HDRAMP={
 soil:hdRamp(['#24180e','#3a2a18','#4a3826','#5f4630','#7a5a38','#94704a','#a98455']),
 stone:hdRamp(['#262d2e','#3a4444','#4d5a5c','#66726f','#7d8f86','#9aa79a','#b9c0ad','#d6d8c4']),
 sand:hdRamp(['#7a5a30','#9a7642','#b48c50','#c99f58','#dcb76a','#ecd08a','#f8e6b0','#fff6dc']),
 snowb:hdRamp(['#7a88a6','#97a4bd','#b4bfd2','#cfd7e4','#e4e9f1','#f3f6fa','#ffffff']),
 ice:hdRamp(['#1e4a86','#2f5fa8','#4a84cc','#62a6ee','#7cc2f6','#8fd8ff','#c4ecff','#ffffff']),
 water:hdRamp(['#081816','#0e2420','#13302a','#1a3d35','#234c41','#2f5e50']),
 lava:hdRamp(['#3a0c0a','#5a1f1c','#8e2f22','#c4493f','#e66a32','#ff8a3c','#f6b247','#ecc64f','#fff4c8']),
 leaf:hdRamp(['#0f2a20','#18402a','#245a30','#357236','#4a8a3c','#64a248','#82ba58','#a4d06c']),
 basalt:hdRamp(['#0c0c10','#16161c','#202028','#2c2e36','#3a3f46','#4d5458','#646c6c']),
 void:hdRamp(['#1a1030','#2a1a4e','#3e2770','#5a3a9a','#7a56c0','#9a74e0','#b98cf0','#e2ccff','#ffffff']),
 glass:hdRamp(['#0f4a42','#1f8573','#3fa890','#58b39c','#7fd0bc','#9fe0cd','#cff4ea','#ffffff']),
 shard:hdRamp(['#3a5a8a','#4a84cc','#62a6ee','#8fd8ff','#c8f0ff','#ffffff']),
 fire:['#5a1f1c','#c4493f','#ff8a3c','#ecc64f','#fff4c8'].map(hdC),
 vfire:['#2a1a4e','#5a3a9a','#9a74e0','#c9a4ff','#ffffff'].map(hdC)};

/* ground: base ramp + two noise octaves (rot-0 board space) + grain + height light */
function hdGround(P,M,c,r,hf,sd){const G=M.G,ox=(c-r)*32,oy=(c+r)*16,n=G.length-1;P.ix=new Uint8Array(P.w*P.h);
 hdEach((x,y)=>{const wx=ox+x,wy=(oy+y)*2;let v=M.base+hf*M.hb+(hdN(wx,wy,22,sd)-.5)*M.amp+(hdN(wx,wy,7,sd+5)-.5)*M.amp2+(txHash(wx,wy,sd+9)-.5)*M.grain;
  const pn=hdN(wx,wy,10,sd+13);v+=pn>.64?-(M.pa||1.4):pn<.3?(M.pa||1.4)*.55:0;   // crisp mottling: darker clumps, lighter sunlit patches
  const c0=hdDi(G,v,x,y);P.p(x,y,c0);P.ix[(y+P.ay)*P.w+x+P.ax]=Math.max(0,Math.min(n,v<0?0:(v|0)+((v-(v|0))*16>TXBAY[(x&3)+(y&3)*4]+.5?1:0)))});
 /* surface clusters: small lit-top / shaded-bottom shapes that give the ground a hand-placed texture */
 const R=mulberry((Math.imul(c+3,92821)^Math.imul(r+5,68917)^sd)>>>0),N=M.cl||0,gi=(x,y)=>{const X=x+P.ax,Y=y+P.ay;return X<0||Y<0||X>=P.w||Y>=P.h?-1:P.ix[Y*P.w+X]},C=i=>G[i<0?0:i>n?n:i];
 for(let k=0;k<N;k++){const pt=hdPt(R,.04),x=pt[0],y=pt[1];if(!hdIn(x,y))continue;const i=gi(x,y),t=R();
  if(M.grassy){if(t<.5){P.s(x,y+1,C(i-2));P.s(x,y,C(i+1));P.s(x-1,y-1,C(i+2));P.s(x+1,y-1,C(i+1));P.s(x+1,y,C(i))}
   else if(t<.75){P.s(x,y,C(i-1));P.s(x+1,y,C(i-1));P.s(x+1,y+1,C(i-2));P.s(x,y-1,C(i+1))}
   else{P.s(x,y,C(i+1));P.s(x,y-1,C(i+2));P.s(x,y+1,C(i-1));P.s(x+1,y,C(i-1))}}
  else if(t<.55){P.s(x,y,C(i+1));P.s(x+1,y,C(i+1));P.s(x+1,y+1,C(i-1));P.s(x+2,y+1,C(i-1))}
  else{P.s(x,y,C(i-1));P.s(x+1,y,C(i-1));P.s(x,y-1,C(i+1))}}}
/* grass blades scattered over the ground, coloured from the pixel they stand on */
function hdGrassField(P,R,M,n,h0,h1,lean){const G=M.G,L=[];for(let i=0;i<n;i++){const pt=hdPt(R,.08);L.push([pt[0],pt[1],h0+((R()*(h1-h0+1))|0),(R()-.5)*lean])}L.sort((a,b)=>a[1]-b[1]);
 for(const a of L){const x=a[0],y=a[1];if(!hdIn(x,y))continue;const c0=P.g(x,y);let i=0,best=1e9;for(let j=0;j<G.length;j++){const d=Math.abs(hdG(G[j])-hdG(c0))+Math.abs(hdR(G[j])-hdR(c0));if(d<best){best=d;i=j}}
  hdBlade(P,x,y,a[2],a[3],[G[Math.max(0,i-2)],G[Math.min(G.length-1,i+1)],G[Math.min(G.length-1,i+2)]])}}
function hdPebbles(P,R,n,G,sd,m){for(let i=0;i<n;i++){const pt=hdPt(R,m||.3);hdStone(P,pt[0],pt[1],2+((R()*3)|0),G,sd+i)}}
function hdSpeck(P,R,n,cols,m){for(let i=0;i<n;i++){const pt=hdPt(R,m||.1);P.s(pt[0],pt[1],cols[(R()*cols.length)|0])}}
/* wandering crack along the iso axes; glow colour optional */
function hdCrack(P,R,len,dark,lit,glow){let pt=hdPt(R,.4),x=pt[0],y=pt[1],d=(R()*4)|0;const DX=[2,2,-2,-2],DY=[1,-1,1,-1];
 for(let i=0;i<len;i++){if(R()<.3)d=(d+(R()<.5?1:3))&3;for(let s=0;s<2;s++){const X=x+(DX[d]>0?s:-s),Y=y;P.s(X,Y,glow&&R()<.5?glow:dark);if(lit&&hdIn(X,Y-1)&&P.g(X,Y-1)!==dark)P.t(X,Y-1,lit,.35)}x+=DX[d];y+=DY[d]}}
/* voronoi cells in the diamond (glass facets, cracked hardpan); returns [cell index, edge distance] per pixel via fn */
function hdCells(P,R,n,fn){const S=[];for(let i=0;i<n;i++){const p=hdPt(R,.02);S.push([p[0],p[1]*2])}
 hdEach((x,y)=>{let a=1e9,b=1e9,ai=0;for(let i=0;i<S.length;i++){const dx=x-S[i][0],dy=y*2-S[i][1],d=Math.sqrt(dx*dx+dy*dy);if(d<a){b=a;a=d;ai=i}else if(d<b)b=d}fn(x,y,ai,b-a)})}
/* pool shape used by swamp water / ice / lava: e 0 centre .. ~.5 rim in diamond metric, wobbly */
function hdPoolE(x,y,sd){const u=(x+.5)/64+(y-.5)/32,v=(y-.5)/32-(x+.5)/64;return Math.max(Math.abs(u),Math.abs(v))-(hdN(x,y*2,6,sd)-.5)*.09}

/* ---- per-biome ground details (flat; run after hdGround) ---- */
const HDGD={
 plains(P,R,M,hf,c,r){const G=M.G;hdSpeck(P,R,10,[G[7],G[8],G[3]]);
  const q=R();if(q<.22){const fc=[hdC('r'),hdC('y'),hdC('h'),hdC('C'),hdC('e')][(R()*5)|0];for(let i=0;i<4;i++){const pt=hdPt(R,.3);P.s(pt[0],pt[1]+1,G[2]);P.s(pt[0],pt[1],fc);P.s(pt[0]+1,pt[1],hdMul(fc,.8));P.s(pt[0],pt[1]-1,hdMix(fc,hdC('r'),.4))}}
  else if(q<.36)hdPebbles(P,R,1+((R()*3)|0),HDRAMP.stone,c*7+r,.4);
  else if(q<.44)hdBlot(P,...hdPt(R,.5),5+R()*3,2.5+R()*1.5,c+r*3,(x,y,qq)=>hdDi(HDRAMP.soil,3.6+(1-qq)*1.4+(txHash(x,y,4)-.5),x,y));
  hdGrassField(P,R,M,26+((R()*14)|0),2,4,2.4)},
 forest(P,R,M,hf,c,r){const G=M.G;hdSpeck(P,R,8,[hdC('K'),hdC('k'),hdC('j'),hdC('c'),G[1]]);
  for(let i=0;i<5;i++){const pt=hdPt(R,.2),lc=[hdC('K'),hdC('b'),hdC('j'),hdC('g')][(R()*4)|0];P.s(pt[0],pt[1],lc);P.s(pt[0]+1,pt[1],hdMul(lc,.75))}  // fallen leaves
  const q=R();if(q<.16){const pt=hdPt(R,.4),x=pt[0],y=pt[1];hdShadow(P,x+1,y+1,3,1.4,.7);hdBall(P,x,y-2,2.5,2,hdRamp(['#5a1f1c','#c4493f','#ef8a78','#ffd8c8']),.4,3,0);P.p(x,y,hdC('l'));P.p(x,y-1,hdC('m'))}   // toadstool
  else if(q<.3){const pt=hdPt(R,.45),dx=R()<.5?1:-1;for(let j=0;j<9;j++){P.s(pt[0]+j,pt[1]+Math.round(j*dx/2),hdC('j'));P.s(pt[0]+j,pt[1]+Math.round(j*dx/2)+1,hdC('i'))}}
  else if(q<.38)hdPebbles(P,R,1,HDRAMP.stone,c*7+r,.4);
  hdGrassField(P,R,M,18+((R()*10)|0),2,4,2)},
 hills(P,R,M,hf,c,r){const G=M.G;if(R()<.5)hdBlot(P,...hdPt(R,.4),6+R()*5,3+R()*2,c*3+r,(x,y,q)=>hdMix(P.g(x,y),hdDi(HDRAMP.stone,3.6+(1-q)*1.2+(hdN(x,y*2,3,6)-.5)*1.6,x,y),q>.75?.45:.8));
  hdSpeck(P,R,8,[G[7],hdC('k'),G[2]]);if(R()<.55)hdPebbles(P,R,1+((R()*4)|0),HDRAMP.stone,c*5+r,.3);hdGrassField(P,R,M,14+((R()*10)|0),2,4,2)},
 swamp(P,R,M,hf,c,r){const G=M.G;const q=R();
  if(q<.3)hdBlot(P,...hdPt(R,.45),6+R()*4,3+R()*2,c*5+r,(x,y,qq)=>qq<.6?hdDi(HDRAMP.water,2.2+(txHash(x,y,2)<.08?2:0)+(1-qq),x,y):hdMix(P.g(x,y),HDRAMP.soil[2],.4*(1.2-qq)));   // puddle, mud at its rim
  else if(q<.45)hdBlot(P,...hdPt(R,.45),5+R()*3,2.5+R()*1.5,c+r*7,(x,y)=>hdDi(HDRAMP.soil,2+(txHash(x,y,5)-.5)*1.6,x,y));
  hdSpeck(P,R,8,[G[6],G[7],hdC('n'),hdC('Z')]);if(R()<.3){const pt=hdPt(R,.4);P.s(pt[0],pt[1],hdC('l'));P.s(pt[0]+1,pt[1],hdC('m'));P.s(pt[0]+2,pt[1]-1,hdC('l'))}
  hdGrassField(P,R,M,14+((R()*10)|0),2,5,2)},
 desert(P,R,M,hf,c,r){const G=M.G,ox=(c-r)*32,oy=(c+r)*16;      // wind ripples: wavy crests across the whole board
  hdEach((x,y)=>{const wx=ox+x,wy=oy+y,ph=(wx*.32+wy*.9+Math.sin((wx-wy)*.05+c)*3.5+hdN(wx,wy*2,16,7)*9)%11,t=(ph+11)%11;if(t<1)P.t(x,y,G[8],.4);else if(t<2.2)P.t(x,y,G[1],.3)});
  hdSpeck(P,R,6,[G[1],G[2],hdC('b'),G[8]]);
  const q=R();if(q<.18)hdPebbles(P,R,1+((R()*2)|0),HDRAMP.sand,c+r*9,.4);
  else if(q<.28){const pt=hdPt(R,.45),x=pt[0],y=pt[1];hdShadow(P,x+2,y+1,4,1.6,.75);for(let i=-3;i<=3;i++){P.p(x+i,y-Math.abs(i>>1),hdC(i<0?'k':'j'));if(Math.abs(i)<2)P.p(x+i,y-2,hdC('b'))}P.p(x-4,y-1,hdC('k'));P.p(x+4,y-2,hdC('j'))}   // dry scrub
  else if(q<.34){const pt=hdPt(R,.45);hdShadow(P,pt[0]+1,pt[1]+1,4,1.2,.8);for(let i=0;i<6;i++){P.s(pt[0]+i,pt[1]-(i>>2),hdC(i&1?'m':'l'))}P.s(pt[0]+2,pt[1]-1,hdC('l'))}},   // bleached bone
 snow(P,R,M,hf,c,r){const G=M.G,ox=(c-r)*32,oy=(c+r)*16;
  hdEach((x,y)=>{const n=hdN(ox+x,(oy+y)*2,9,c*0+11);if(n<.3&&TXBAY[(x&3)+(y&3)*4]<(.3-n)*60)P.t(x,y,M.shC,.18)});   // blue hollows in the drifts
  for(let i=0;i<14;i++){const pt=hdPt(R,.05);if(hdIn(pt[0],pt[1]))P.p(pt[0],pt[1],R()<.5?hdC('r'):hdC('F'))}         // sparkle
  const q=R();if(q<.2){for(let i=0;i<3;i++){const pt=hdPt(R,.35);hdBlade(P,pt[0],pt[1],3+((R()*3)|0),(R()-.5)*3,[hdC('4'),hdC('n'),hdC('m')])}}     // dry stalks
  else if(q<.34){const pt=hdPt(R,.4);hdStone(P,pt[0],pt[1],5,HDRAMP.stone,c+r);P.p(pt[0]-1,pt[1]-3,hdC('r'));P.p(pt[0],pt[1]-3,hdC('r'))}      // rock capped with snow
  else if(q<.44){const pt=hdPt(R,.5);for(let i=0;i<4;i++){const x=pt[0]+i*7,y=pt[1]+i*3;P.s(x,y,G[2]);P.s(x+1,y,G[3]);P.s(x+2,y+1,G[3]);P.s(x+1,y+1,G[1])}}},   // footprints
 ashen(P,R,M,hf,c,r){const G=M.G;hdBlot(P,...hdPt(R,.4),7+R()*5,3.5+R()*2,c*3+r,(x,y,q)=>q<.8||txHash(x,y,1)<.5?hdDi(G,1.6+(txHash(x,y,2)-.5)*1.4,x,y):0);
  hdSpeck(P,R,14,[G[7],G[8],hdC('n'),hdC('p')]);
  const q=R();if(q<.5){hdCrack(P,R,6+((R()*6)|0),hdC('f'),0,hdC('g'));if(R()<.4)hdCrack(P,R,4,hdC('1'),G[6],0)}
  if(q>.78)hdPebbles(P,R,1+((R()*2)|0),HDRAMP.basalt,c+r,.4);else if(q>.66){const pt=hdPt(R,.45);P.s(pt[0],pt[1],hdC('m'));P.s(pt[0]+1,pt[1],hdC('l'));P.s(pt[0]+2,pt[1]+1,hdC('m'));P.s(pt[0]+3,pt[1]+1,hdC('n'))}},
 hollow(P,R,M,hf,c,r){const G=M.G;hdSpeck(P,R,10,[G[7],G[8],hdC('X'),G[1]]);const n=R()<.6?1+((R()*2)|0):0;for(let i=0;i<n;i++)hdCrack(P,R,5+((R()*6)|0),hdC('D'),G[8],hdC('C'));
  if(R()<.35){const pt=hdPt(R,.4);hdShard(P,pt[0],pt[1],4+((R()*3)|0),1.5,(R()-.5)*2,HDRAMP.void.slice(2,8))}
  for(let i=0;i<3;i++){const pt=hdPt(R,.2);if(hdIn(pt[0],pt[1]))P.p(pt[0],pt[1],hdC(R()<.5?'C':'r'))}},
 glass(P,R,M,hf,c,r){const G=M.G;hdCells(P,R,5+((R()*3)|0),(x,y,i,e)=>{const tone=txHash(i,c*17+r,4);if(e<1.1)P.p(x,y,G[tone<.5?2:1]);else{const c0=P.g(x,y);if(tone>.7)P.p(x,y,hdMix(c0,G[7],.35));else if(tone<.25)P.p(x,y,hdMix(c0,G[1],.3));if(e<2.2&&tone>.4)P.p(x,y,hdMix(P.g(x,y),G[8],.4))}});
  for(let i=0;i<5;i++){const pt=hdPt(R,.2);if(hdIn(pt[0],pt[1]))P.p(pt[0],pt[1],hdC(R()<.6?'r':'6'))}}};

/* ---- rough terrain (ph 0 flat, ph 1 upright) and hazards ---- */
function hdTallGrass(P,R,M,n,h0,h1){const G=M.G,L=[];for(let i=0;i<n;i++){const pt=hdPt(R,.12);L.push([pt[0],pt[1],h0+((R()*(h1-h0+1))|0),(R()-.5)*5,R()])}L.sort((a,b)=>a[1]-b[1]);
 for(const a of L){if(!hdIn(a[0],a[1]))continue;const k=a[4];hdBlade(P,a[0],a[1],a[2],a[3],[G[1],G[k<.4?3:4],G[k<.3?5:k<.8?6:7]]);if(k>.86){P.p(Math.round(a[0]+a[3]),a[1]-a[2],hdC('m'));P.p(Math.round(a[0]+a[3]),a[1]-a[2]-1,hdC('l'))}}}
function hdBush(P,R,x,y,s,G,berry){hdShadow(P,x+2,y+1,s+2,s*.5+1,.62);const n=4+((R()*3)|0),L=[];for(let i=0;i<n;i++){const a=i/n*6.283+R(),d=s*.45;L.push([x+Math.cos(a)*d,y-s*.7+Math.sin(a)*d*.6,s*(.55+R()*.25)])}
 L.push([x,y-s*.95,s*.62]);L.sort((a,b)=>a[1]-b[1]);for(const b of L)hdBall(P,Math.round(b[0]),Math.round(b[1]),b[2]*1.1,b[2],G,1.6,7,0);
 if(berry)for(let i=0;i<4;i++){const bx=Math.round(x+(R()-.5)*s*1.4),by=Math.round(y-s*.8+(R()-.5)*s*.8);if(P.g(bx,by)){P.p(bx,by,hdC('g'));P.p(bx,by-1,hdC('h'))}}}
function hdFireHaz(P,R,f,ph,M){
 if(!ph){hdBlot(P,...hdPt(R,.6),18+R()*4,9+R()*2,3,(x,y,q)=>hdDi(HDRAMP.soil,q>.8?2:(txHash(x,y,1)-.3)*1.6,x,y));
  hdBlot(P,...hdPt(R,.5),11,5.5,9,(x,y,q)=>q<.6?hdC(txHash(x,y,5)<.5?'1':'0'):0);
  for(let i=0;i<16;i++){const pt=hdPt(R,.15),t=(f+((R()*8)|0))&7;if(hdIn(pt[0],pt[1])){P.p(pt[0],pt[1],HDRAMP.fire[t<2?3:t<5?2:1]);if(t<2)P.p(pt[0]+1,pt[1],HDRAMP.fire[2])}}}
 else{const n=3+((R()*2)|0),L=[];for(let i=0;i<n;i++){const pt=hdPt(R,.4);L.push([pt[0],pt[1],10+((R()*9)|0),(R()*8)|0])}L.sort((a,b)=>a[1]-b[1]);for(const a of L)hdFlame(P,a[0],a[1],a[2],f,a[3],HDRAMP.fire)}}
const HDRF={
 plains(P,R,M,hf,f,ph,v,c,r){
  if(v<.3){if(!ph){hdBlot(P,...hdPt(R,.5),14+R()*4,7+R()*2,c*3+r,(x,y,q)=>hdDi(HDRAMP.soil,2.6+(1-q)*2+(hdN(x,y*2,3,c)-.5)*2,x,y));hdPebbles(P,R,4,HDRAMP.stone,c+r,.4);hdGrassField(P,R,M,10,2,4,2)}}
  else if(!ph)hdBlot(P,0,1,22,11,c+r*5,(x,y,q)=>hdDi(M.G,2.4+(txHash(x,y,3)-.5)*1.5+q,x,y));
  else hdTallGrass(P,R,M,64,6,12)},
 forest(P,R,M,hf,f,ph){if(!ph)hdBlot(P,0,1,21,10.5,7,(x,y,q)=>hdDi(M.G,1.6+q*1.2+(txHash(x,y,3)-.5)*1.4,x,y));
  else{const n=3+((R()*2)|0),L=[];for(let i=0;i<n;i++){const pt=hdPt(R,.4);L.push([pt[0],pt[1],5+R()*2.5,R()])}L.sort((a,b)=>a[1]-b[1]);for(const a of L)hdBush(P,R,a[0],a[1],a[2],HDRAMP.leaf,a[3]<.4);hdTallGrass(P,R,M,10,4,8)}},
 hills(P,R,M,hf,f,ph){if(!ph)hdBlot(P,0,1,20,10,5,(x,y,q)=>hdDi(HDRAMP.stone,1.8+q*1.4+(txHash(x,y,3)-.5)*1.6,x,y));
  else{const L=[];for(let i=0;i<9;i++){const pt=hdPt(R,.25);L.push([pt[0],pt[1],3+((R()*6)|0)])}L.sort((a,b)=>a[1]-b[1]);for(const a of L)hdStone(P,a[0],a[1],a[2],HDRAMP.stone,a[0]*3+a[1])}},
 swamp(P,R,M,hf,f,ph,v,c,r){const W=HDRAMP.water,sd=c*13+r;
  if(!ph){hdEach((x,y)=>{const e=hdPoolE(x,y,sd);if(e<.37){let k=1.2+(.37-e)*5+(hdN(x,y*2,5,sd+2)-.5)*1.5;const t=((x>>1)+y*3+f*2)&15;if(t===0&&txHash(x>>2,y,sd)<.5)k+=2.2;P.p(x,y,hdDi(W,k,x,y))}
    else if(e<.43)P.p(x,y,hdDi(HDRAMP.soil,1+(txHash(x,y,4)-.5)*1.6+(e-.37)*20,x,y))});
   for(let i=0;i<3;i++){const pt=hdPt(R,.55);if(hdPoolE(pt[0],pt[1],sd)>.3)continue;hdBall(P,pt[0],pt[1],3,1.6,M.G.slice(4),.5,2,1);P.s(pt[0]+1,pt[1],W[1]);if(R()<.4){P.s(pt[0],pt[1]-1,hdC('h'));P.s(pt[0]+1,pt[1]-1,hdC('r'))}}   // lily pads
   const t=f&7;for(let i=0;i<2;i++){const pt=hdPt(R,.6),rr=1+((t+i*4)&7)*.6;if(hdPoolE(pt[0],pt[1],sd)>.3)continue;for(let a=0;a<12;a++){const x=Math.round(pt[0]+Math.cos(a/12*6.283)*rr*2),y=Math.round(pt[1]+Math.sin(a/12*6.283)*rr);if(hdPoolE(x,y,sd)<.35)P.t(x,y,hdC('n'),.5-rr*.04)}}}
  else{const n=4+((R()*3)|0),L=[];for(let i=0;i<n;i++){const pt=hdPt(R,.3);if(hdPoolE(pt[0],pt[1],sd)<.33)continue;L.push([pt[0],pt[1],10+((R()*10)|0),(R()*8)|0,R()])}L.sort((a,b)=>a[1]-b[1]);
   for(const a of L){const x=a[0],y=a[1],hg=a[2],sw=((f+a[3])&7)<3?1:0;for(let dy=0;dy<hg;dy++){const xx=x+(dy>hg*.6?sw:0);P.p(xx,y-dy,hdC(dy<3?'3':dy<hg*.5?'B':'w'));if(dy<hg-4)P.p(xx+1,y-dy,hdC(dy<3?'2':'7'))}
    if(a[4]<.6)for(let j=0;j<5;j++){P.p(x+sw,y-hg-j+2,hdC(j===0||j===4?'i':'j'));P.p(x+sw+1,y-hg-j+2,hdC(j===4?'a':'i'))}P.p(x+sw,y-hg-3,hdC(a[4]<.6?'4':'v'));P.p(x+2,y-4,hdC('B'));P.p(x+3,y-5,hdC('w'))}}},
 desert(P,R,M,hf,f,ph,v){const S=HDRAMP.sand;
  if(v<.55){if(ph){const L=[];for(let i=0;i<2;i++){const pt=hdPt(R,.6);L.push([pt[0]+(i?8:-8),pt[1]+(i?6:-4),12+((R()*6)|0)])}
    for(const a of L){const cx=a[0],cy=a[1],rx=a[2];for(let x=-rx;x<=rx;x++){const t=x/rx,top=cy-Math.round((1-t*t)*6.4),bot=cy+Math.round((1-Math.abs(t))*3)+2;
      for(let y=top;y<=bot;y++){const lee=x>(y-top)*1.3-rx*.3,k=y===top?6:lee?(y>=bot-1&&x>0?1:2.6+(top-y+bot-y)*.05):4.6-(y-top)*.15+(((x*2+y*3)%9)===0?1:0);P.s(cx+x,y,hdDi(S,k,cx+x,y))}}}}}
  else if(!ph)hdCells(P,R,7,(x,y,i,e)=>{const c0=P.g(x,y),base=hdMix(c0,S[2],.55);P.p(x,y,e<1?hdC('a'):e<1.8?hdMix(base,hdC('b'),.6):e<3&&y<0?hdMix(base,S[6],.3):base)})},
 snow(P,R,M,hf,f,ph,v,c,r){const I=HDRAMP.ice,sd=c*11+r;
  if(v<.42){if(!ph){hdEach((x,y)=>{const e=hdPoolE(x,y,sd);if(e<.4)P.p(x,y,hdDi(I,4+(.4-e)*3+(hdN(x,y*2,8,sd)-.5)*2.4,x,y));else if(e<.45)P.p(x,y,hdDi(HDRAMP.snowb,3+(e-.4)*30,x,y))});
     for(let i=0;i<3;i++)hdCrack(P,R,4+((R()*4)|0),hdC('r'),0,0);hdCrack(P,R,3,hdC('X'),0,0);
     const t=(f+((c*3+r*5)&7))&7;if(t<4){const s=-44+t*26;hdEach((x,y)=>{if(hdPoolE(x,y,sd)<.38&&Math.abs(x+2*y-s)<5&&((x+y)&1))P.p(x,y,hdC('r'))})}
     else if(t===6){const pt=hdPt(R,.6);if(hdPoolE(pt[0],pt[1],sd)<.35){const x=pt[0],y=pt[1];for(let j=-3;j<=3;j++){P.p(x+j,y,hdC(Math.abs(j)<2?'r':'F'));P.p(x,y+(j>>1),hdC(Math.abs(j)<2?'r':'F'))}}}}}
  else if(ph){const L=[];for(let i=0;i<3;i++){const pt=hdPt(R,.55);L.push([pt[0],pt[1],10+((R()*6)|0)])}L.sort((a,b)=>a[1]-b[1]);
   for(const a of L){const cx=a[0],cy=a[1],rx=a[2];hdShadow(P,cx+3,cy+2,rx+1,3,.82);for(let x=-rx;x<=rx;x++){const t=x/rx,top=cy-Math.round(Math.sqrt(1-t*t)*6.8),bot=cy+Math.round((1-Math.abs(t))*3);
     for(let y=top;y<=bot;y++){const sh=x>rx*.25+(top-y)*.6;P.p(cx+x,y,hdDi(HDRAMP.snowb,y===top?6:sh?(y>=bot&&x>0?1.2:2.6):5-(y-top)*.12,cx+x,y))}}}}},
 ashen(P,R,M,hf,f,ph){if(!ph)hdBlot(P,0,1,20,10,5,(x,y,q)=>hdDi(HDRAMP.basalt,1.4+q*1.2+(txHash(x,y,3)-.5)*1.4,x,y));
  else{const L=[];for(let i=0;i<5;i++){const pt=hdPt(R,.35);L.push([pt[0],pt[1],4+R()*3])}L.sort((a,b)=>a[1]-b[1]);
   for(const a of L){hdShadow(P,a[0]+2,a[1]+1,a[2]+2,a[2]*.5+1,.6);hdBall(P,a[0],a[1]-2,a[2]*1.2,a[2],HDRAMP.basalt,1.4,5,0);for(let j=0;j<2;j++){const ex=a[0]+((R()*5)|0)-2,ey=a[1]-1-((R()*3)|0);if(P.g(ex,ey))P.p(ex,ey,HDRAMP.fire[R()<.5?2:1])}}
   for(let i=0;i<6;i++){const pt=hdPt(R,.25);P.s(pt[0],pt[1],HDRAMP.fire[R()<.4?2:1])}}},
 hollow(P,R,M,hf,f,ph){if(!ph)hdBlot(P,0,1,20,10,5,(x,y,q)=>hdDi(M.G,1+q*1.4+(txHash(x,y,3)-.5)*1.2,x,y));
  else{const L=[];for(let i=0;i<4;i++){const pt=hdPt(R,.4);L.push([pt[0],pt[1],12+((R()*10)|0),3+R()*2,(R()-.5)*8])}L.sort((a,b)=>a[1]-b[1]);
   for(const a of L){hdShadow(P,a[0]+2,a[1]+1,a[3]+3,2,.6);hdShard(P,a[0],a[1],a[2],a[3],a[4],HDRAMP.void.slice(1,8))}}},
 glass(P,R,M,hf,f,ph){if(!ph){hdBlot(P,0,1,20,10,5,(x,y,q)=>hdDi(M.G,1.4+q*1.6+(txHash(x,y,3)-.5)*1.2,x,y));for(let i=0;i<10;i++){const pt=hdPt(R,.2);P.s(pt[0],pt[1],hdC(R()<.5?'r':'6'))}}
  else{const L=[];for(let i=0;i<5;i++){const pt=hdPt(R,.4);L.push([pt[0],pt[1],8+((R()*10)|0),2.5+R()*2,(R()-.5)*8])}L.sort((a,b)=>a[1]-b[1]);
   for(const a of L){hdShadow(P,a[0]+2,a[1]+1,a[3]+2,1.8,.6);hdShard(P,a[0],a[1],a[2],a[3],a[4],HDRAMP.glass.slice(1))}}}};
const HDHZ={
 ashen(P,R,f,ph,M,c,r){const L=HDRAMP.lava,sd=c*7+r*3;
  if(!ph){hdEach((x,y)=>{const e=hdPoolE(x,y,sd);if(e>.43){P.p(x,y,hdDi(HDRAMP.basalt,1.5+(txHash(x,y,2)-.5)*2,x,y));return}
     if(e>.37){P.p(x,y,hdDi(L,1+(.43-e)*18,x,y));return}
     const fl=hdN(x+f*1.5,y*2-f,7,sd)*.6+hdN(x-f,y*2+f*.5,3,sd+3)*.4;let k=4.5+(.37-e)*6+(fl-.5)*4;
     if(hdN(x+f*.6,y*2,9,sd+9)>.68)k=.6+(txHash(x,y,4)-.5)*1.2;        // drifting crust plates
     P.p(x,y,hdDi(L,k,x,y))});
   for(let i=0;i<3;i++){const pt=hdPt(R,.6),t=(f+((R()*8)|0))&7;if(t<4&&hdPoolE(pt[0],pt[1],sd)<.33){const rr=1+t*.6;hdBall(P,pt[0],pt[1],rr*1.6,rr,L.slice(4),0,0,1);if(t===3)P.p(pt[0],pt[1]-1,L[8])}}}
  else for(let i=0;i<4;i++){const pt=hdPt(R,.5),t=(f+((R()*8)|0))&7;if(t<6){P.p(pt[0]+((t>>1)&1),pt[1]-4-t*4,L[t<2?8:t<4?7:5]);if(t>1&&t<5)P.p(pt[0],pt[1]-t*3,L[5])}}},
 hollow(P,R,f,ph,M,c,r){const V=HDRAMP.void;
  if(!ph){hdBlot(P,0,1,21,10.5,5,(x,y,q)=>hdDi(M.G,.8+q*1.6+(txHash(x,y,3)-.5)*1.4,x,y));let x=-22,y=((R()*7)|0)-2;const pts=[];while(x<23){pts.push([x,y]);x++;if(R()<.35)y+=R()<.5?1:-1;y=Math.max(-6,Math.min(8,y))}
   const g2=(f>>1)&1;for(let i=0;i<pts.length;i++){const p=pts[i],w=Math.round(1+2.2*Math.sin(i/pts.length*3.14));for(let j=-w-2;j<=w+2;j++){const a=Math.abs(j);P.s(p[0],p[1]+j,a<=w?(a===w?V[g2?5:4]:a===w-1?V[2]:hdC('0')):V[a===w+1?3:2])}}
   for(let i=0;i<8;i++){const pt=hdPt(R,.2);if(((f+((R()*8)|0))&7)<3)P.s(pt[0],pt[1],V[6])}}
  else{const L=[];for(let i=0;i<5;i++){const pt=hdPt(R,.45);L.push([pt[0],pt[1],12+((R()*10)|0),(R()*8)|0])}L.sort((a,b)=>a[1]-b[1]);for(const a of L)hdFlame(P,a[0],a[1],a[2],f,a[3],HDRAMP.vfire)}},
 glass(P,R,f,ph,M){const pu=(f>>1)&3;
  if(!ph){hdBlot(P,0,1,21,10.5,5,(x,y,q)=>hdDi(M.G,.6+q*1.6+(txHash(x,y,3)-.5)*1.2,x,y));hdBlot(P,0,1,14,7,9,(x,y,q)=>hdMix(P.g(x,y),hdC(pu===1?'h':'g'),.55*(1-q)))}
  else{const L=[];for(let i=0;i<9;i++){const pt=hdPt(R,.3);L.push([pt[0],pt[1],12+((R()*14)|0),2+R()*1.6,(R()-.5)*8,(R()*8)|0])}L.sort((a,b)=>a[1]-b[1]);
   for(const a of L){hdShard(P,a[0],a[1],a[2],a[3],a[4],HDRAMP.shard);const t=(f+a[5])&7;P.p(a[0],a[1],hdC(t<4?'h':'g'));P.p(a[0]-1,a[1],hdC('g'));
    if(t<2){const tx=Math.round(a[0]+a[4]),ty=a[1]-a[2];for(let j=1;j<3;j++){P.p(tx-j,ty,hdC('r'));P.p(tx+j,ty,hdC('r'));P.p(tx,ty-j,hdC('r'));P.p(tx,ty+j,hdC('r'))}}}}}};

/* ---- tile top: 64 x (32+HDHEAD) RGB buffer ---- */
function hdTopBuf(bk,ti,c,r,h,sL,sR,eL,eR,f){const P=hdBuf(64,32+HDHEAD,32,15+HDHEAD),M=HDM[bk],seed=(Math.imul(c+11,73856093)^Math.imul(r+7,19349663)^Math.imul(TXBI[bk]+3,83492791))>>>0;
 const R=mulberry(seed),hf=h/3,v=txRoughVar(bk,c,r),sd=TXBI[bk]*101+17;
 hdGround(P,M,c,r,hf,sd);HDGD[bk](P,R,M,hf,c,r);
 if(ti===1)HDRF[bk](P,mulberry(seed^0x51ed27),M,hf,f,0,v,c,r);
 else if(ti===2)(HDHZ[bk]||hdFireHaz)(P,mulberry(seed^0x51ed27),f,0,M,c,r);
 else if(ti===3){const bx=txPropBox(bk,c,r),rx=Math.max(12,Math.min(24,bx.w*.72)),ry=rx*.5;    // trodden patch and the obstacle's shadow (toward the lower right)
  hdEach((x,y)=>{const q=(x-6)*(x-6)/(rx*rx)+(y-3)*(y-3)/(ry*ry);if(q<1||(q<1.3&&TXBAY[(x&3)+(y&3)*4]<(1.3-q)*50)){P.t(x,y,M.shC,q<.45?.5:.32)}})}
 /* cast shadow from taller back neighbours: back-left (the light side) casts a long band, back-right a thin one; dithered fringe */
 if((sL||sR)&&ti!==2){const wL=sL?.2+.14*sL:0,wR=sR?.1+.08*sR:0;
  hdEach((x,y)=>{const a=(x+.5)/64+(y-.5)/32+.5,b=(y-.5)/32-(x+.5)/64+.5,th=TXBAY[(x&3)+(y&3)*4]/16;let n=0;
   if(sL&&a<wL+.1*th)n+=a<wL-.06?1.2:1;if(sR&&b<wR+.06*th)n+=1;if(n)P.t(x,y,M.shC,Math.min(.62,.36*n))})}
 /* edges: rim light along the two back edges, a dark line and soft AO along the front, a bright lip where a cliff drops away */
 const haz=ti===2&&HDHZ[bk];
 hdEach((x,y)=>{const m=hdRing(x,y);if(m>=4)return;const back=y<=0,left=x<0,lip=!back&&(left?eL:eR);
  if(haz){if(m<2)P.p(x,y,hdC('1'));return}
  if(back){if(m<2)P.t(x,y,M.rimC,left?.34:.2)}
  else if(lip){if(m<2)P.p(x,y,txHash(x,c*31+r,3)<.88?hdMix(M.rimC,P.g(x,y),.25):hdMul(P.g(x,y),.8));else P.t(x,y,M.rimC,.14)}
  else{if(m<2)P.m(x,y,.66);else P.m(x,y,.86)}});
 if(ti===1)HDRF[bk](P,mulberry(seed^0x2c1b3d),M,hf,f,1,v,c,r);
 else if(ti===2)(HDHZ[bk]||hdFireHaz)(P,mulberry(seed^0x2c1b3d),f,1,M,c,r);
 return P}

/* ---- cliff faces: 32 HD px wide, drop*16 tall (+32 skirt on the board edge); column top follows the tile edge ---- */
const HDJAG=[0,2,3,5,8,9,8,6,4,6,9,11,12,10,7,4,3,5,4,2,1,3,4,3,2,1,2,1,0,1,0,0];
function hdFaceBuf(bk,side,h,drop,v,cd){const M=TXM[bk],F=M.face,HM=HDM[bk],edge=drop>h,D=edge?h*16+32:drop*16,P=hdBuf(32,D+18,0,0);
 const SR=F.st.map(s=>hdR3(s[4],s[3],s[2])),lipG=hdRamp([txDk(M,F.lip[1]),F.lip[1],F.lip[0],HM.rim]),soilG=hdR3(txDk(M,F.soil[1]),F.soil[1],F.soil[0]);
 const lit=side?.72:1,cool=hdC('#18203a'),sk=F.st.length-1;
 for(let i=0;i<32;i++){const ii=side?31-i:i,t=Math.ceil(.75+ii/2)-1,hv=txHash(ii,v,side+3),wob=Math.round(Math.sin((ii+v*7)*.45)*1.5);
  const lip=F.len*2+(hv<.3?1:0)+(txHash(ii,v,side+5)<.18?2+((txHash(ii,v,7)*3)|0):0)-(hv>.85&&F.len>1?1:0);
  const icy=F.ice&&txHash(ii>>1,v,side+17)<.3?4+((txHash(ii>>1,v,9)*8)|0)-(ii&1?2:0):0;
  const root=F.roots&&txHash(ii>>1,v,23)<.2?4+((txHash(ii>>1,v,29)*12)|0):0;
  const skl=edge?Math.min(32,20+HDJAG[(ii+v*9)&31]-(txHash(ii>>2,v,5)<.3?4:0)+(txHash(ii,v,41)<.08?8:0)):0,end=edge?h*16+skl:D;
  for(let d=0;d<end;d++){const a=h*16-d-1;let c;
   if(a<0){const s=-a-1,G=SR[sk];   // board-edge skirt: the island's underside, darkening to nothing
    if(s>=skl-1)c=hdC('0');else if(s>=skl-3)c=hdC('1');else{c=hdFaceTex(F.st[sk],G,ii,a,v,side);c=hdMix(c,hdC('0'),Math.min(.85,.25+s/skl*.7))}}
   else if(d<lip){const k=d===lip-1?0:d===0?3:d<2?2:1+(txHash(ii,d,v)<.3?1:0);c=lipG[k]}
   else if(d<lip+3+(wob>0?1:0)&&d<D-1)c=hdDi(soilG,3+(txHash(ii,d,v+1)-.5)*2.4-(d===lip?1.5:0),ii,d);
   else{let si=0;for(let j=0;j<F.st.length;j++)if(a+wob>=F.st[j][0]*2){si=j;break}else si=j;
    c=hdFaceTex(F.st[si],SR[si],ii,a,v,side);
    if(root&&d<lip+root+3&&((ii+(d>>2))&1)===0&&(ii&1)===0)c=hdC(d-lip>root?'i':'k');
    if(F.vein&&Math.abs(((ii*2+a+v*13)%23+23)%23-11)<1&&txHash(ii>>2,a>>3,v+31)<.5)c=hdMix(c,hdC(F.vein),.75);
    if(F.lava&&a<24&&txHash(ii>>1,a>>2,v+37)<.18)c=HDRAMP.lava[txHash(ii,a,3)<.4?6:4];
    const dl=d-lip;if(dl<6)c=hdMul(c,.62+dl*.06);                                   // shade under the overhang
    if(!edge){const db=D-1-d;if(db<8)c=hdMix(c,HM.aoC,.55*(1-db/8));if(db===0)c=hdMix(c,hdC('0'),.5)}   // contact AO at the cliff base
    else if(a<10)c=hdMix(c,HM.aoC,.3*(1-a/10));
    if(!side&&cd&&ii>=30&&d<cd*16&&d>=lip)c=hdMix(c,hdC('#fff4dc'),ii===31?.22:.1)}     // lit vertical corner
   if(icy&&d>=lip-1&&d<lip+icy&&a>=0){const q=(d-lip)/icy;c=hdC(q>.7?'x':(ii&1)?'F':'r')}
   if(side&&a>=0)c=hdMix(hdMul(c,lit),cool,.12);else if(side)c=hdMul(c,.8);
   P.p(i,t+d,c)}}
 return P}
/* face texture per stratum type; G is the 7-step ramp of the stratum */
function hdFaceTex(st,G,i,a,v,side){const ty=st[1],n=txHash(i,a,v*2+side+7);
 if(ty==='earth'){let k=3+(n-.5)*1.6+(hdN(i,a,5,v+3)-.5)*1.6;const pi=((i+v*5)>>3),pa=((a+v*3)>>3),px=(i+v*5)&7,py=(a+v*3)&7;
  if(txHash(pi,pa,v+11)<.45&&px>1&&px<6&&py>2&&py<6){const ex=(px-3.5)/2.5,ey=(py-4)/2;if(ex*ex+ey*ey<1)k=ey<-.2?5.4:ey>.4?1:4}return hdDi(G,k,i,a)}
 if(ty==='rock'){const row=Math.floor(a/8),ra=((a%8)+8)%8,ln=12+((txHash(row,v,3)*8)|0),off=(row*7+v*5)&15,cell=Math.floor((i+off)/ln),ci=(i+off)%ln,merge=txHash(row,cell+v,7)<.25;
  if(ra===0)return G[0];if(ra===1)return G[1];if(ci===0&&!merge)return G[1];if(ci===1&&!merge)return G[4];
  let k=(ra===7?5.2:ra===6?4.4:3.2-((7-ra)*.05))+(n-.5)*1.4+(txHash(row,cell,v+2)-.5)*1.2;if(ra===2)k-=.8;return hdDi(G,k,i,a)}
 if(ty==='band'){const w=Math.sin(i*.31+v)*1.5,b=((Math.round(a+w)%18)+18)%18;let k=b<2?1:b<4?5:b<9?3.4:b<11?2.2:b<13?4.2:3;
  k+=(n-.5)*1.2;if((i+v*3)%11===0&&txHash(i,a>>4,v)<.5)k-=1.4;return hdDi(G,k,i,a)}
 if(ty==='col'){const cw=8,off=v*5,ci=(i+off)%cw,col=((i+off)/cw)|0,brk=((a+col*7)%14+14)%14;let k=ci===0?5:ci===1?4.2:ci===cw-1?1:ci===cw-2?2:3+(n-.5)*1.2;
  if(brk===0&&txHash(col,a,v)<.75)k=0;else if(brk===1)k+=1.2;return hdDi(G,k,i,a)}
 /* cry: slanted crystalline facets with bright edges */
 {const s=i+a*2+v*7,b=(s>>3)&3,e=s&7;let k=b===0?(e===0?0:5):b===2&&e===0?1:b===1?3.6:b===3?2.6:3;if(e===1&&b!==0)k+=1.4;return hdDi(G,k+(n-.5),i,a)}}

/* ---- public (called by drawTilePx when o.hd) ---- */
const TXHC=new Map(),TXHFC=new Map();
function hdFace(bk,bi,side,h,drop,c,r,cd){const v=(txHash(c,r,side+61)*4)|0,key=((((bi*2+side)*4+h)*8+drop)*8+cd)*4+v;let cv=TXHFC.get(key);
 if(cv===undefined){cv=hdCv(hdFaceBuf(bk,side,h,drop,v,cd));TXHFC.set(key,cv)}return cv}
function drawTileHD(q,x,y,bk,bi,ti,h,c,r,dL,dR,sL,sR,f){
 if(dL>0){const cv=hdFace(bk,bi,0,h,dL,c,r,dR>0?(dL<dR?dL:dR):0);if(cv)q.drawImage(cv,x-16,y+.5,16,cv.height/2)}
 if(dR>0){const cv=hdFace(bk,bi,1,h,dR,c,r,0);if(cv)q.drawImage(cv,x,y+.5,16,cv.height/2)}
 const key=((((((((bi*4+ti)*4+h)*3+sL)*3+sR)*2+(dL>0?1:0))*2+(dR>0?1:0))*64+(c&63))*64+(r&63))*8+f;let cv=TXHC.get(key);
 if(cv===undefined){if(TXHC.size>TXHD.cap)TXHC.clear();cv=hdCv(hdTopBuf(bk,ti,c,r,h,sL,sR,dL>0,dR>0,f));TXHC.set(key,cv)}
 if(cv)q.drawImage(cv,x-16,y-(15+HDHEAD)/2,32,cv.height/2)}
function hdTrim(){TXHC.clear()}
