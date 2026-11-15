/* ================= HAND-DRAWN HD ICONS (32x32) =================
   The icons the player sees most (battle HUD stats, the ability bar, end turn, the top bar, common gear) are drawn here at
   32x32 instead of being upscaled. A tiny raster kit: shapes are tested at pixel centres, lit from the top-left (IHD_L) and
   quantised to material ramps with a narrow checker at each step (crisp bands, no blur); parts drawn over others get a dark
   seam; ihdHandPaint() closes every drawing with a 1px selective outline. Same 16 px meaning, silhouette and colours. */
const IHD_L=(()=>{const v=[-.5,-.62,.6],m=Math.hypot(v[0],v[1],v[2]);return v.map(a=>a/m)})();
function ihdR(st){return st.map(s=>Array.isArray(s)?s:s[0]==='#'?[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)]:ihdRGB(s))}
const IHR={
 steel:ihdR(['#1d2830','o','#68778a','p','#aab6c2','q','#e8eef4','r']),
 brass:ihdR(['#2a1d0b','a','#6b4f1d','b','#b38a39','c','#e6c06a','d','e']),
 madder:ihdR(['#2e0e10','f','#8a2c28','g','#dd6a5b','h','#ffc9b8']),
 wood:ihdR(['#241a12','i','#5e4530','j','#8f6c45','k','#c7a372']),
 leather:ihdR(['#1f1611','#3d2a1d','i','#5e4530','j','#8f6c45']),
 verd:ihdR(['#0f2e29','7','#3f8f7d','5','#7fcdb8','6','#dcf7ee']),
 vellum:ihdR(['#3c463f','n','#9a9c87','m','#d6cdb2','l','#fffaf0']),
 glass:ihdR(['#21406e','X','#4d86cc','x','#8fd8ff','#d6f3ff','r']),
 sand:ihdR(['#6b4f1d','b','#c79b3e','c','#ecc874','d','e']),
 meat:ihdR(['#2c140c','#5a2a17','#8a4424','#b0602f','#cf8546','#e8ad6c','#fbd9a6']),
 fire:ihdR(['#5a1f1c','#a8361f','#e0571f','E','#ffb347','y','#fff1b8']),
 ink:ihdR(['0'])};
/* ramp pick: v 0..1, a checker only right at a step (x,y pixel) */
function ihdPick(R,v,x,y){v=v<0?0:v>1?1:v;const f=v*(R.length-1);let i=Math.floor(f);const r=f-i;if(r>.56||(r>.5&&((x>>1)+(y>>1)&1)&&((x+y)&1)))i++;return R[i>R.length-1?R.length-1:i]}
function ihdNew(){const P={W:32,H:32,out:new Array(1024).fill(null),z:new Uint8Array(1024)};
 P.put=(x,y,c)=>{x|=0;y|=0;if(x<0||y<0||x>=32||y>=32||!c)return;P.out[y*32+x]=c;P.z[y*32+x]=1};
 P.get=(x,y)=>x<0||y<0||x>=32||y>=32?null:P.out[y*32+x];
 P.fill=fn=>{for(let y=0;y<32;y++)for(let x=0;x<32;x++){const c=fn(x+.5,y+.5,x,y);if(c)P.put(x,y,c)}};
 P.tint=(x,y,c,t)=>{const o=P.get(x,y);if(o)P.out[y*32+x]=ihdMix(o,c,t)};
 /* a part drawn over what is there, with a dark seam where it overlaps */
 P.part=fn=>{const Q=ihdNew();fn(Q);for(let i=0;i<1024;i++)if(Q.z[i]){P.out[i]=Q.out[i];P.z[i]=1}
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=y*32+x;if(Q.z[i]||!P.z[i])continue;
   if((x>0&&Q.z[i-1])||(x<31&&Q.z[i+1])||(y>0&&Q.z[i-32])||(y<31&&Q.z[i+32]))P.out[i]=ihdMix(P.out[i],IHD_INK,.72)}};
 return P}
/* pseudo-3D shading of any mask: distance to the edge -> height -> normal -> light. dm: bevel depth in px */
function ihdBlob(P,mask,R,o){o=o||{};const dm=o.d||5,M=new Uint8Array(1024),D=new Float32Array(1024);
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){const m=mask(x+.5,y+.5)?1:0;M[y*32+x]=m;D[y*32+x]=m?99:0}
 const at=(x,y)=>x<0||y<0||x>=32||y>=32?0:D[y*32+x];
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=y*32+x;if(!M[i])continue;D[i]=Math.min(D[i],at(x-1,y)+1,at(x,y-1)+1,at(x-1,y-1)+1.41,at(x+1,y-1)+1.41)}
 for(let y=31;y>=0;y--)for(let x=31;x>=0;x--){const i=y*32+x;if(!M[i])continue;D[i]=Math.min(D[i],at(x+1,y)+1,at(x,y+1)+1,at(x+1,y+1)+1.41,at(x-1,y+1)+1.41)}
 const h=(x,y)=>{const d=Math.min(dm,Math.max(0,at(x,y)-.5));const t=1-d/dm;return Math.sqrt(Math.max(0,1-t*t))*dm*(o.k||.9)};
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=y*32+x;if(!M[i])continue;let nx=(h(x-1,y)-h(x+1,y))/2,ny=(h(x,y-1)-h(x,y+1))/2,nz=1;const m=Math.hypot(nx,ny,nz);nx/=m;ny/=m;nz/=m;
  let l=nx*IHD_L[0]+ny*IHD_L[1]+nz*IHD_L[2];let v=(o.amb==null?.12:o.amb)+(1-(o.amb==null?.12:o.amb))*Math.max(0,l)*(o.gain||1.15);
  if(at(x,y)<1.6&&nx>.2&&ny>.2)v+=.1;   // bounce light on the shaded rim
  if(o.f)v=o.f(v,x+.5,y+.5,at(x,y),l);const c=Array.isArray(R[0])?ihdPick(R,v,x,y):R(v,x,y);if(c)P.put(x,y,c)}}
function ihdBall(P,cx,cy,r,R,o){o=o||{};P.fill((x,y,X,Y)=>{const nx=(x-cx)/r,ny=(y-cy)/r,q=nx*nx+ny*ny;if(q>1)return null;const nz=Math.sqrt(1-q),l=nx*IHD_L[0]+ny*IHD_L[1]+nz*IHD_L[2];
  let v=(o.amb==null?.1:o.amb)+.95*Math.max(0,l);if(q>.7&&nx+ny>.4)v+=.12;return ihdPick(R,v,X,Y)})}
/* axis frame of a segment: s along (0..L), d across (negative = upper-left side for a blade pointing up-right) */
function ihdAx(x0,y0,x1,y1){const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L;return(x,y)=>{const px=x-x0,py=y-y0;return[px*ux+py*uy,-px*uy+py*ux,L]}}
function ihdGlint(P,x,y,arm){const W=[255,255,248];P.put(x,y,W);if(arm)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){P.tint(x+dx,y+dy,W,.55);if(arm>1)P.tint(x+2*dx,y+2*dy,W,.25)}}
/* a sword from the pommel (x0,y0) to the tip (x1,y1) */
function ihdSword(P,x0,y0,x1,y1,o){o=o||{};const A=ihdAx(x0,y0,x1,y1),BL=o.blade||IHR.steel,GU=o.guard||IHR.brass,GR=o.grip||IHR.leather,gw=o.gw||5.2,sg=o.sg||9,bw=o.bw||1.75;
 P.fill((x,y,X,Y)=>{const [s,d,L]=A(x,y);if(s<-.2||s>L)return null;
  if(s>sg+1){let w=bw;if(s>L-5)w=bw*(L-s)/5+.25;if(Math.abs(d)>w)return null;let v;
   if(d<-w+.75)v=.97;else if(d<-.3)v=.78;else if(d<.45)v=s<L-6&&s>sg+2.5&&!o.nofuller?.44:.62;else if(d<w-.7)v=.55;else v=.3;
   if(s>L-2.2)v+=.12;return ihdPick(BL,v,X,Y)}
  if(s>=sg-1){if(Math.abs(d)>gw)return null;let v=.6-.28*d/gw-(s>sg+.3?.18:0);if(Math.abs(d)>gw-1.3)v+=.16;return ihdPick(GU,v,X,Y)}
  if(s>=3){if(Math.abs(d)>1.25)return null;let v=.55-.25*d;if((Math.floor(s*1.15+d*.7)&1))v-=.24;return ihdPick(GR,v,X,Y)}
  return null});
 const t=Math.hypot(x1-x0,y1-y0),ux=(x1-x0)/t,uy=(y1-y0)/t;ihdBall(P,x0+ux*1.5,y0+uy*1.5,o.pr||2.1,GU);
 if(o.gem!==false)P.tint(Math.floor(x0+ux*1.5-.3),Math.floor(y0+uy*1.5-.3),[255,252,230],.6);
 const gx=Math.floor(x0+ux*(sg+3.5)-uy*-1),gy=Math.floor(y0+uy*(sg+3.5)+ux*-1);if(o.glint!==false)ihdGlint(P,gx,gy,1)}
/* crescent swing trail: centre, radius, angles (rad, screen space), half-thickness */
function ihdArc(P,cx,cy,r,a0,a1,th,R){P.fill((x,y,X,Y)=>{const dx=x-cx,dy=y-cy,rho=Math.hypot(dx,dy);let a=Math.atan2(dy,dx);while(a<a0)a+=Math.PI*2;if(a>a1)return null;
  const t=(a-a0)/(a1-a0),w=th*Math.sin(Math.PI*Math.pow(t,.8));if(Math.abs(rho-r)>w)return null;return ihdPick(R,.35+.65*t+(rho-r)/(th*3),X,Y)})}
/* heater shield: top-left (x0,y0), width w, height h */
function ihdHeaterMask(x0,y0,w,h){const cx=x0+w/2;return(x,y)=>{const t=(y-y0)/h;if(t<0||t>1)return false;let hw=t<.42?w/2:w/2*Math.sqrt(Math.max(0,1-Math.pow((t-.42)/.58,1.7)));if(t<.06)hw-=(.06-t)*20;return Math.abs(x-cx)<hw}}
function ihdHeater(P,x0,y0,w,h,R,o){o=o||{};const m=ihdHeaterMask(x0,y0,w,h),cx=x0+w/2;
 ihdBlob(P,m,R,{d:2.6,amb:.14,gain:.95,f:(v,x,y,D)=>v-.06-.12*((x-cx)+(y-y0-h/2))/w});
 if(o.rim)P.fill((x,y,X,Y)=>{if(!m(x,y)||m(x-1.6,y)&&m(x+1.6,y)&&m(x,y-1.6)&&m(x,y+1.6))return null;return ihdPick(o.rim,.6-.25*((x-cx)/w*2+(y-y0-h/2)/h*2),X,Y)})}
/* flag on a pole: shape rect | swallow | pennant | tatter */
function ihdFlag(P,R,shape,emblem){
 P.fill((x,y,X,Y)=>{if(x<4.5||x>7||y<4.5||y>30)return null;return ihdPick(IHR.wood,x<5.6?.82:x<6.4?.55:.3,X,Y)});
 ihdBall(P,5.8,3.6,2,IHR.brass);
 const top=x=>5.2+1.4*Math.sin((x-7)*.4),len=shape==='pennant'?20:21,hh=shape==='pennant'?12:13;
 P.part(Q=>Q.fill((x,y,X,Y)=>{if(x<7||x>7+len)return null;const t=(x-7)/len,y0=top(x);let y1=y0+hh;
  if(shape==='pennant'){const c=y0+hh/2;y1=c+hh/2*(1-t);if(y<c-hh/2*(1-t)+(y0-top(7))*0||y>y1)return null}
  else{if(y<y0||y>y1)return null}
  if(shape==='swallow'&&t>.62&&Math.abs(y-(y0+hh/2))<(t-.62)*hh*1.35)return null;
  if(shape==='tatter'&&(t>.7&&ihdHash(X>>1,Y>>1,9)<(t-.7)*3.2||y>y1-2.5&&ihdHash(X,Y>>1,4)<.45))return null;
  let v=.58-.26*Math.cos((x-7)*.4)-.12*(y-y0)/hh+(x<9?-.12:0);if(y<y0+1.2)v+=.14;return ihdPick(R,v,X,Y)}));
 if(emblem)emblem(P,top)}
/* gear: teeth n, outer r1, body r0, hole rh */
function ihdGear(P,cx,cy,n,r1,r0,rh,R){ihdBlob(P,(x,y)=>{const dx=x-cx,dy=y-cy,rho=Math.hypot(dx,dy);if(rho<rh)return false;if(rho<=r0)return true;if(rho>r1)return false;
  const a=Math.atan2(dy,dx)*n/(2*Math.PI),f=a-Math.floor(a);return Math.abs(f-.5)<.24+(r1-rho)*.03},R,{d:2.4,amb:.18});
 P.fill((x,y,X,Y)=>{const rho=Math.hypot(x-cx,y-cy);if(Math.abs(rho-(rh+2.2))<.5){const o=P.get(X,Y);return o?ihdMix(o,(x-cx)+(y-cy)<0?IHD_INK:[255,255,245],(x-cx)+(y-cy)<0?.35:.3):null}return null})}
/* point in polygon (pixel centres) */
function ihdIn(pts,x,y){let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}
/* a rod (shaft, haft, staff) from (x0,y0) to (x1,y1), radius r, lit on its upper-left side; band(s) -> extra shade along it */
function ihdRod(P,x0,y0,x1,y1,r,R,band){const A=ihdAx(x0,y0,x1,y1);P.fill((x,y,X,Y)=>{const [s,d,L]=A(x,y);if(s<0||s>L||Math.abs(d)>r)return null;let v=d<-r*.35?.86:d<r*.35?.58:.32;if(band)v+=band(s,d);return ihdPick(R,v,X,Y)})}
/* faceted polygon: each edge-to-centre triangle is a facet lit by how its outward direction faces the light */
function ihdFacets(P,pts,cx,cy,R,o){o=o||{};const n=pts.length;P.fill((x,y,X,Y)=>{if(!ihdIn(pts,x,y))return null;let a=Math.atan2(y-cy,x-cx);
  let best=0,bd=9;for(let i=0;i<n;i++){const [px,py]=pts[i],[qx,qy]=pts[(i+1)%n],ma=Math.atan2((py+qy)/2-cy,(px+qx)/2-cx);let dd=Math.abs(((a-ma+Math.PI*3)%(Math.PI*2))-Math.PI);if(dd<bd){bd=dd;best=i}}
  const [px,py]=pts[best],[qx,qy]=pts[(best+1)%n];let nx=(py+qy)/2-cy,ny=(px+qx)/2-cx;const ma=Math.atan2((py+qy)/2-cy,(px+qx)/2-cx);
  let v=(o.base||.6)+.34*Math.cos(ma-Math.atan2(-.78,-.62))*(o.k||1);if(o.table&&Math.hypot(x-cx,y-cy)<o.table)v=.8;return ihdPick(R,v,X,Y)})}
function ihdStar(cx,cy,R1,r1,k,rot){const p=[];for(let i=0;i<k*2;i++){const a=rot+i*Math.PI/k,r=i&1?r1:R1;p.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r])}return p}
/* arrow: tail (x0,y0) to tip (x1,y1); head steel, fletch madder */
function ihdArrow(P,x0,y0,x1,y1,o){o=o||{};const A=ihdAx(x0,y0,x1,y1);
 P.fill((x,y,X,Y)=>{const [s,d,L]=A(x,y);if(s<0||s>L)return null;
  if(s>L-6.5){const w=(L-s)*.5;if(Math.abs(d)>w+.2)return null;return ihdPick(o.head||IHR.steel,d<-.2?.95:d<.6?.6:.32,X,Y)}
  if(s<7){const w=1.2+Math.min(2.6,(7-s)*.55)-(s<1.5?(1.5-s):0);if(Math.abs(d)<.75)return ihdPick(IHR.wood,d<0?.85:.45,X,Y);if(Math.abs(d)>w)return null;if(((s*1.6)|0)%3===2&&Math.abs(d)>1.4)return null;return ihdPick(o.fl||IHR.madder,(d<0?.78:.42)+(s<2?-.1:0),X,Y)}
  if(Math.abs(d)>.75)return null;return ihdPick(IHR.wood,d<0?.85:.45,X,Y)})}
/* simple bevelled arrow glyph (UI arrows): points right unless flip */
function ihdUIArrow(P,x0,y0,len,h,R,flip){const pts=[[0,-h*.3],[len*.55,-h*.3],[len*.55,-h*.5],[len,0],[len*.55,h*.5],[len*.55,h*.3],[0,h*.3]].map(([x,y])=>[flip?x0+len-x:x0+x,y0+y]);
 ihdBlob(P,(x,y)=>ihdIn(pts,x,y),R,{d:2.2,amb:.2})}
/* ---- the drawings ---- */
const IHD_W=[255,255,248];
const IHD_DRAW={
 hp(P){const m=(x,y)=>{const u=(x-16)/12.2,v=(15.2-y)/11.6+.18;const a=u*u+v*v-1;return a*a*a-u*u*v*v*v<=0};
  ihdBlob(P,m,IHR.madder,{d:6.5,amb:.1,gain:.92});
  P.fill((x,y,X,Y)=>{const q=Math.pow((x-10.6)/2.6,2)+Math.pow((y-9.2)/1.7,2);return q<=1?ihdMix(P.get(X,Y)||IHD_W,IHD_W,q<.45?.8:.35):null});ihdGlint(P,20,8,0)},
 fatigue(P){const m=(x,y)=>{if(y>=19.5)return Math.hypot(x-16,y-19.5)<=8.6;if(y<3)return false;return Math.abs(x-16)<=8.6*Math.pow((y-3)/16.5,.75)};
  ihdBlob(P,m,ihdR(['#2a3644','o','#7c8a98','p','#b9c6d2','q','#f2f7fb','r']),{d:5,amb:.2});
  P.fill((x,y,X,Y)=>{const q=Math.pow((x-12.2)/1.5,2)+Math.pow((y-18)/3.4,2);return q<=1?ihdMix(P.get(X,Y),IHD_W,.75):null});ihdGlint(P,12,13,0)},
 coin(P){const cx=16,cy=16;P.fill((x,y,X,Y)=>{const dx=x-cx,dy=y-cy,rho=Math.hypot(dx,dy);if(rho>13.6)return null;const k=-(dx+dy)/(rho*1.414+.001);let v;
   if(rho>11.2){v=.55+.38*k;if(rho>12.6&&((Math.round(Math.atan2(dy,dx)*14/Math.PI))&1))v-=.14}
   else if(rho>10.2)v=.5-.32*k;else{v=.6-.08*(dx+dy)/11;const e=Math.abs(dx)+Math.abs(dy);
    if(e<=6.4){if(e>5.1)v=dx+dy<0?.95:.3;else if(e<3.1)v=e>2?(dx+dy<0?.38:.82):.68;else v=.7-.05*(dx+dy)}}
   return ihdPick(IHR.brass,v,X,Y)});ihdGlint(P,8,8,2);ihdGlint(P,22,11,0)},
 endturn(P){const glassR=IHR.glass;
  P.fill((x,y,X,Y)=>{if(y<6.5||y>25.5)return null;const t=Math.abs(y-16)/9.5,hw=1.2+8.2*Math.pow(t,1.3);if(Math.abs(x-16)>hw)return null;const e=(x-16)/hw;
   const sandTop=y>10.5&&y<15.5&&Math.abs(x-16)<hw-.6,sandBot=y>25.5-((7.2-Math.abs(x-16)*1.05))&&y>17,stream=Math.abs(x-16)<.7&&y>=15&&y<=24;
   if(sandTop||sandBot||stream)return ihdPick(IHR.sand,.62-.3*e+(y<11.6&&sandTop?.2:0),X,Y);
   return ihdPick(glassR,e<-.62?.92:e<-.3?.7:e>.65?.32:.5,X,Y)});
  for(const y0 of [3,25])P.part(Q=>Q.fill((x,y,X,Y)=>{if(x<5||x>27||y<y0||y>y0+4)return null;if((x<6||x>26)&&(y<y0+.6||y>y0+3.4))return null;return ihdPick(IHR.brass,(y-y0<1.2?.92:y-y0<2.4?.62:.34)-(x>24?.1:0),X,Y)}));
  for(const x0 of [6.6,23.2])P.part(Q=>Q.fill((x,y,X,Y)=>{if(x<x0||x>x0+2.2||y<7||y>25)return null;return ihdPick(IHR.wood,x-x0<.9?.85:x-x0<1.6?.55:.3,X,Y)}));
  ihdGlint(P,12,8,0);ihdGlint(P,9,4,1)},
 sword(P){ihdSword(P,4.5,27.5,28,4,{bw:2.1})},
 melee(P){ihdSword(P,16,30,16,1.5,{gw:8.2,bw:2.9,pr:2.6,sg:8.5})},
 swords(P){ihdSword(P,27.5,28,4,4.5,{gw:4.6});P.part(Q=>ihdSword(Q,4.5,28,28,4.5,{gw:4.6}))},
 'ab-attack'(P){ihdArc(P,13,13,15,.15,1.75,2.4,ihdR(['#3b5a78','#8fb8dc','#cfe6f7','r']));P.part(Q=>ihdSword(Q,4,28,27,5,{}))},
 'ab-slash'(P){ihdArc(P,13,13,15,.15,1.75,2.6,ihdR(['#5a1f1c','g','h','#ffe2d8']));P.part(Q=>ihdSword(Q,4,28,27,5,{blade:ihdR(['#2e0e10','f','#8a2c28','g','#c9a6a8','q','#f4e8ea','r'])}))},
 armor(P){const m=(x,y)=>{if(y<3.5||y>28)return false;let hw=11;if(y<14)hw=11*Math.sqrt(Math.max(0,1-Math.pow((14-y)/10.5,2)));if(y>24)hw=11-(y-24)*1.1;return Math.abs(x-16)<hw};
  ihdBlob(P,m,IHR.steel,{d:7,amb:.12,gain:.98,f:(v,x,y)=>v+(x<16?.03:-.04)});
  P.part(Q=>Q.fill((x,y,X,Y)=>{if(!m(x,y)||y<10||y>12.6)return null;return ihdPick(IHR.brass,y<11?.9:y<12?.62:.34,X,Y)}));
  for(const rx of [8,16,24])P.put(rx,11,ihdR(['e'])[0]);
  P.fill((x,y,X,Y)=>{if(!m(x,y))return null;if(y>14&&y<16.8&&Math.abs(x-16)>1.6)return y<15.5?IHD_INK:ihdMix(IHD_INK,[60,70,80],.5);
   if(y>19&&y<24&&(Math.abs(x-11.5)<.6||Math.abs(x-20.5)<.6)&&((Y&1)===0))return IHD_INK;return null});
  P.fill((x,y,X,Y)=>m(x,y)&&y>16.8&&y<17.8&&Math.abs(x-16)>1.6?ihdMix(P.get(X,Y),IHD_W,.35):null);
  ihdGlint(P,10,6,1)},
 shield(P){const cx=16,cy=16;P.fill((x,y,X,Y)=>{const dx=x-cx,dy=y-cy,rho=Math.hypot(dx,dy);if(rho>13.6)return null;const k=-(dx+dy)/(rho*1.414+.001);
   if(rho>11.3){if(Math.abs(rho-12.4)<.8&&(Math.round(Math.atan2(dy,dx)*4/Math.PI*2)%2===0)&&Math.abs(((Math.atan2(dy,dx)*8/Math.PI)%1+1)%1-.5)<.17)return ihdPick(IHR.brass,.6+.3*k,X,Y);return ihdPick(IHR.steel,.5+.36*k,X,Y)}
   const pl=Math.floor((x+2)/5.2),f=((x+2)/5.2)-pl;if(f<.13)return ihdPick(IHR.wood,.08,X,Y);
   let v=.55-.18*(dx+dy)/14+(ihdHash(pl,Math.floor(y/2.5+pl*3),2)-.5)*.2;if(((X*3+Y*7+pl*5)%11)===0)v-=.18;if(f>.85)v-=.12;return ihdPick(IHR.wood,v,X,Y)});
  P.part(Q=>ihdBall(Q,16,16,4.6,IHR.brass));ihdGlint(P,14,14,0);ihdGlint(P,7,9,1)},
 mdef(P){ihdHeater(P,4,3.5,24,26,IHR.verd);P.part(Q=>{Q.fill((x,y,X,Y)=>{if(Math.abs(x-16)<1.3&&y>7&&y<23.5)return ihdPick(IHR.vellum,x<16?.95:.62,X,Y);if(Math.abs(y-11)<1.2&&Math.abs(x-16)<6)return ihdPick(IHR.vellum,y<11?.95:.62,X,Y);return null})});ihdGlint(P,8,7,1)},
 rdef(P){ihdHeater(P,3.5,5.5,23,25,IHR.verd);P.part(Q=>{Q.fill((x,y,X,Y)=>{const [s,d,L]=ihdAx(14,18,27.5,4.5)(x,y);if(s<0||s>L)return null;
   if(s<L-4.5){if(Math.abs(d)>.75)return null;return ihdPick(IHR.wood,d<0?.85:.4,X,Y)}if(Math.abs(d)>2.2-(s-(L-4.5))*.2)return null;return ihdPick(IHR.madder,d<0?.85:.45,X,Y)})});
  P.fill((x,y,X,Y)=>Math.hypot(x-14,y-18)<1.6?ihdMix(P.get(X,Y)||IHD_INK,IHD_INK,.6):null);ihdGlint(P,7,9,1)},
 ap(P){const cx=16,cy=16;P.fill((x,y,X,Y)=>{const dx=x-cx,dy=y-cy;if(Math.abs(dx)/12.6+Math.abs(dy)/13.6>1)return null;const inner=Math.abs(dx)/6+Math.abs(dy)/6.6<=1;let v;
   if(inner)v=dx+dy<0?(dx<0&&dy<0?.98:.8):.66;else v=dy<0?(dx<0?.9:.66):(dx<0?.5:.26);if(Math.abs(Math.abs(dx)/12.6+Math.abs(dy)/13.6-1)<.09)v+=dy<0&&dx<0?.1:-.08;return ihdPick(IHR.brass,v,X,Y)});ihdGlint(P,11,10,2)},
 'morale-4'(P){ihdFlag(P,IHR.brass,'swallow',(Q,top)=>{const W=ihdR(['e','r']);for(const [x,y] of [[14,10],[14,11],[13,11],[15,11],[14,12]])Q.put(x,y+Math.round(top(x)-5),W[(x+y)&1])});ihdGlint(P,25,4,1)},
 'morale-3'(P){ihdFlag(P,IHR.verd,'rect')},
 'morale-2'(P){ihdFlag(P,IHR.brass,'pennant')},
 'morale-1'(P){ihdFlag(P,IHR.fire,'tatter')},
 retreat(P){ihdFlag(P,IHR.vellum,'rect')},
 company(P){ihdFlag(P,IHR.madder,'swallow',(Q,top)=>{const G=IHR.brass;for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){if(Math.abs(x)+Math.abs(y)>3||(x&&y&&Math.abs(x)+Math.abs(y)>2))continue;const X=15+x,Y=Math.round(10+y+top(15)-5);Q.put(X,Y,ihdPick(G,x+y<0?.92:x+y>0?.42:.7,X,Y))}})},
 settings(P){ihdGear(P,16,16,8,14.2,10.6,4.2,IHR.steel);ihdGlint(P,9,7,1)},
 fast(P){for(const x0 of [4,16])P.part(Q=>Q.fill((x,y,X,Y)=>{const t=(x-x0)/12;if(t<0||t>1||Math.abs(y-16)>12*(1-t))return null;const up=y<16;return ihdPick(IHR.brass,(x-x0<1.5?.88:up?.72:.42)+(Math.abs(y-16)>12*(1-t)-1.3?(up?.15:-.15):0),X,Y)}))},
 food(P){const A=ihdAx(8,24,20,12);
  ihdBlob(P,(x,y)=>{const [s,d]=A(x,y);return Math.pow((s-6)/10.5,2)+Math.pow(d/7.6,2)<=1&&s>-2},IHR.meat,{d:6,amb:.15,f:(v,x,y)=>v+(ihdHash(x|0,y|0,6)<.12?-.12:0)});
  P.part(Q=>{Q.fill((x,y,X,Y)=>{const [s,d]=ihdAx(17,15,25,7)(x,y);if(s<0||s>10||Math.abs(d)>1.3)return null;return ihdPick(IHR.vellum,d<0?.92:.6,X,Y)});ihdBall(Q,25.2,5.2,2,IHR.vellum);ihdBall(Q,27.4,7.4,2,IHR.vellum)});
  for(const [x,y] of [[8,15],[11,13],[7,20],[12,18]])ihdGlint(P,x,y,0)},
 camp(P){P.fill((x,y,X,Y)=>{if(y<5.5||y>28)return null;const hw=(y-4.5)*.56;if(Math.abs(x-16)>hw)return null;const door=y>13&&Math.abs(x-16)<(y-12.5)*.36;
   if(door)return ihdPick(ihdR(['#060b0a','1','2','3']),.2+.6*(y-13)/15*(x<16?1:.4),X,Y);const e=(x-16)/hw;let v=e<-.25?.85-.1*(y/28):e<.2?.6:.36;if(Math.abs(x-16)<.6&&y<13)v=.25;if(((Y+(e<0?X:-X))%6)===0)v-=.12;return ihdPick(IHR.vellum,v,X,Y)});
  P.part(Q=>Q.fill((x,y,X,Y)=>{for(const sg of [-1,1]){const [s,d]=ihdAx(16-sg*2.2,7.5,16+sg*2.2,1)(x,y);if(s>=0&&s<=7.5&&Math.abs(d)<.85)return ihdPick(IHR.wood,d*sg<0?.8:.4,X,Y)}return null}));
  P.fill((x,y,X,Y)=>y>28&&y<29.2&&Math.abs(x-16)<14?ihdPick(IHR.wood,.3+.2*((X&3)===0),X,Y):null)},
 tools(P){P.fill((x,y,X,Y)=>{if(y<20||y>28)return null;let ok=false,v=.5;if(y<23&&x>5&&x<29-(y<21?0:0)){ok=x>5+(22-y)*0||true;if(x>26&&y>21.5)ok=false;if(x<9-(y-20)*1.2)ok=x>5+(y-20)*1.5}if(y>=23&&y<25.5&&Math.abs(x-16)<4)ok=true;if(y>=25.5&&Math.abs(x-16)<7.5)ok=true;if(!ok)return null;
   v=y<20.9?.95:y<22.2?.62:y<23?.32:y<25.6?.42:y<26.5?.7:.34;if(y<23)v-=(x-16)*.012;return ihdPick(IHR.steel,v,X,Y)});
  P.part(Q=>{Q.fill((x,y,X,Y)=>{const [s,d,L]=ihdAx(6,18.5,21,5)(x,y);if(s<0||s>L||Math.abs(d)>1.1)return null;return ihdPick(IHR.wood,d<0?.82:.42-(((s*1.3)|0)&1)*.06,X,Y)});
   Q.fill((x,y,X,Y)=>{const [s,d]=ihdAx(15.5,1.5,26,12)(x,y);if(s<0||s>14.8||Math.abs(d)>2.6)return null;if(s>9.5&&Math.abs(d)>2.6-(s-9.5)*.35)return null;return ihdPick(IHR.steel,(d<-1.5?.95:d<0?.72:d<1.4?.5:.3)+(s<1.4?.1:0),X,Y)})});
  ihdGlint(P,17,4,1);ihdGlint(P,9,21,0)},
 bow(P){P.fill((x,y,X,Y)=>{const dx=x-21,dy=y-16,rho=Math.hypot(dx,dy),a=Math.atan2(dy,dx);if(Math.abs(a)<1.75)return null;const t=Math.abs(Math.abs(a)-Math.PI)/1.39,w=2.1-1.3*t;
   if(Math.abs(rho-12.5)>w)return null;const mid=t<.13;if(mid)return ihdPick(IHR.leather,.5-(rho-12.5)*.2-((Y&1)?.2:0),X,Y);if(t>.9)return ihdPick(IHR.brass,.7,X,Y);return ihdPick(IHR.wood,.58-(rho-12.5)*.3+(dy<0?.08:-.06),X,Y)});
  P.fill((x,y,X,Y)=>Math.abs(x-21.6)<.5&&y>4.6&&y<27.6?ihdPick(IHR.vellum,.8,X,Y):null)},
 ranged(P){ihdArrow(P,4,28,28,4)},
 'ab-quickshot'(P){ihdArrow(P,3,24,24,3);P.part(Q=>ihdArrow(Q,8,29,29,8))},
 withdraw(P){P.fill((x,y,X,Y)=>x>4&&x<7.5&&y>5&&y<27?ihdPick(IHR.brass,x<5.4?.92:x<6.4?.6:.32,X,Y):null);ihdUIArrow(P,9,16,19,15,IHR.brass,1)},
 swap(P){ihdUIArrow(P,5,10,22,12,IHR.brass,0);P.part(Q=>ihdUIArrow(Q,5,22,22,12,IHR.steel,1))},
 spear(P){ihdRod(P,4,28,22,10,1.1,IHR.wood,s=>((s*1.2)|0)%5===0?-.15:0);P.part(Q=>{const A=ihdAx(20,12,28.5,3.5);Q.fill((x,y,X,Y)=>{const [s,d,L]=A(x,y);if(s<0||s>L)return null;const w=s<1.6?1.3:3*Math.sin(Math.PI*Math.min(1,(s-1)/(L-1))*.92)+.3;if(Math.abs(d)>w)return null;return ihdPick(IHR.steel,d<-.4?.92:d<.4?.62:.34,X,Y)})});ihdGlint(P,24,7,0)},
 axe(P){ihdRod(P,5,28,23,7,1.2,IHR.wood,s=>((s*1.2)|0)%6===0?-.15:0);P.part(Q=>{const pts=[[17,9],[21,5],[25,2.5],[29,5.5],[30.5,11],[28.5,17],[25.5,19.5],[24,15],[21,12.5]];ihdBlob(Q,(x,y)=>ihdIn(pts,x,y),IHR.steel,{d:3,amb:.18,f:(v,x,y)=>v+(Math.hypot(x-26,y-12)>6.5?.18:0)})});ihdGlint(P,27,6,1)},
 mace(P){ihdRod(P,5,28,19,13,1.2,IHR.wood,s=>((s*1.3)|0)%2&&s<6?-.2:0);P.part(Q=>{const pts=ihdStar(22,10,8.2,5.2,6,.3);ihdFacets(Q,pts,22,10,IHR.steel,{table:2.6})});ihdGlint(P,20,7,1)},
 dagger(P){ihdSword(P,6,26,25,7,{bw:1.9,gw:4,sg:7.5,pr:1.8})},
 staff(P){ihdRod(P,5,29,21,10,1.2,IHR.wood,s=>((s*.9)|0)%4===0?-.14:0);P.part(Q=>{ihdBall(Q,23.5,7.5,4.6,IHR.glass);});P.fill((x,y,X,Y)=>{const q=Math.hypot(x-21.8,y-5.8);return q<1.3?IHD_W:null});
  P.part(Q=>Q.fill((x,y,X,Y)=>{const [s,d]=ihdAx(17,14,21.5,9.5)(x,y);return s>=0&&s<=2.2&&Math.abs(d)<2.3?ihdPick(IHR.brass,d<0?.85:.4,X,Y):null}))},
 helmet(P){const m=(x,y)=>{if(y<4||y>27.5)return false;let hw=11;if(y<14.5)hw=11*Math.sqrt(Math.max(0,1-Math.pow((14.5-y)/10.5,2)));if(y>23)hw=11-(y-23)*.9;return Math.abs(x-16)<hw};
  ihdBlob(P,m,IHR.steel,{d:7,amb:.12,gain:.98,f:(v,x)=>v+(x<16?.03:-.04)});
  P.part(Q=>Q.fill((x,y,X,Y)=>m(x,y)&&y>12&&y<14.6?ihdPick(IHR.brass,y<13?.92:y<14?.62:.34,X,Y):null));
  P.fill((x,y,X,Y)=>{if(!m(x,y)||y<16||y>25||Math.abs(x-16)>7.6)return null;const c=Math.floor((x-8.4)/2.6),f=(x-8.4)/2.6-c;return f<.42?IHD_INK:f<.62?ihdMix(P.get(X,Y),IHD_W,.3):null});ihdGlint(P,10,7,1)},
 init(P){P.fill((x,y,X,Y)=>{const dx=x-16,dy=y-16.5,rho=Math.hypot(dx,dy);if(rho>13.2)return null;const k=-(dx+dy)/(rho*1.41+.01);if(rho>10.8)return ihdPick(IHR.brass,.55+.38*k,X,Y);
   let v=.72+.12*(-(dx+dy)/16);if(rho>9.6)v-=.18;const a=Math.atan2(dy,dx),tick=Math.abs(((a*6/Math.PI)%1+1)%1-.5)>.42&&rho>7.6&&rho<9.4;if(tick)v=.15;return ihdPick(IHR.vellum,v,X,Y)});
  P.fill((x,y,X,Y)=>{const h1=ihdAx(16,16.5,16,8)(x,y),h2=ihdAx(16,16.5,22,16.5)(x,y);if((h1[0]>=-.5&&h1[0]<=h1[2]&&Math.abs(h1[1])<.9)||(h2[0]>=-.5&&h2[0]<=h2[2]&&Math.abs(h2[1])<.9))return IHD_INK;return null});
  P.put(16,16,ihdR(['g'])[0]);ihdBall(P,16,3.4,1.9,IHR.brass);ihdGlint(P,8,10,0)},
 star(P){ihdFacets(P,ihdStar(16,17,14.5,6.2,5,-Math.PI/2),16,17,IHR.brass,{k:1});P.fill((x,y,X,Y)=>{const o=P.get(X,Y);if(!o)return null;const a=Math.atan2(y-17,x-16)+Math.PI/2,f=((a*5/(2*Math.PI))%1+1)%1;return f<.5?ihdLit(o,.12):ihdShd(o,.12)});ihdGlint(P,13,10,1)},
 xp(P){ihdFacets(P,ihdStar(16,16,14.5,4.6,4,-Math.PI/2),16,16,IHR.brass,{base:.7,k:.8});P.fill((x,y,X,Y)=>{const o=P.get(X,Y);if(!o)return null;const a=Math.atan2(y-16,x-16)+Math.PI/2,f=((a*4/(2*Math.PI))%1+1)%1;return f<.5?ihdLit(o,.16):ihdShd(o,.14)});ihdGlint(P,16,16,2)},
 skull(P){const m=(x,y)=>(Math.pow((x-16)/11.5,2)+Math.pow((y-13)/10.5,2)<=1)||(Math.abs(x-16)<7.2&&y>=18&&y<27.5);
  ihdBlob(P,m,IHR.vellum,{d:5,amb:.16});
  P.fill((x,y,X,Y)=>{for(const ex of [11,21]){const q=Math.pow((x-ex)/3.4,2)+Math.pow((y-15.5)/3,2);if(q<=1)return ihdMix(IHD_INK,[40,20,20],q*.4)}if(Math.abs(x-16)<1.4&&y>19&&y<22.5&&Math.abs(x-16)<(y-18.6)*.6)return IHD_INK;
   if(y>24&&y<27.5&&Math.abs(x-16)<6.5&&((X-16)%3===0||((X-16)%3+3)%3===0))return ihdMix(IHD_INK,[90,80,70],.3);return null});ihdGlint(P,10,7,1)},
 check(P){const pts=[[3,17],[8,12.5],[13,17.5],[25,4],[30,9],[13,27]];ihdBlob(P,(x,y)=>ihdIn(pts,x,y),IHR.verd,{d:2.6,amb:.18})},
 close(P){for(const [a,b,c,d] of [[5,27,27,5],[5,5,27,27]])P.part(Q=>{const A=ihdAx(a,b,c,d);ihdBlob(Q,(x,y)=>{const [s,dd,L]=A(x,y);return s>-1&&s<L+1&&Math.abs(dd)<2.6},IHR.brass,{d:2.4,amb:.2})})},
 auto(P){for(const [a0,a1,ex,ey,dir] of [[3.5,6.0,27.2,12,1],[0.35,2.85,4.8,20,-1]]){P.part(Q=>{Q.fill((x,y,X,Y)=>{const dx=x-16,dy=y-16,rho=Math.hypot(dx,dy);let a=Math.atan2(dy,dx);if(a<0)a+=Math.PI*2;if(a<a0||a>a1||Math.abs(rho-10)>2.1)return null;
     return ihdPick(IHR.brass,.6-(rho-10)*.12*(dy<0?1:-1)+(dy<0?.14:-.1),X,Y)});const pts=dir>0?[[ex-5,ey-1],[ex+4,ey-1],[ex-.5,ey+6]]:[[ex-4,ey+1],[ex+5,ey+1],[ex+.5,ey-6]];ihdBlob(Q,(x,y)=>ihdIn(pts,x,y),IHR.brass,{d:2,amb:.25})})}},
 shieldwall(P){ihdHeater(P,2.5,3,17,23,IHR.verd);P.part(Q=>{ihdHeater(Q,12.5,7,17.5,23.5,IHR.steel);Q.fill((x,y,X,Y)=>{const o=Q.get(X,Y);if(!o)return null;if((Math.abs(x-21.2)<1.3&&y>11&&y<25)||(Math.abs(y-15.5)<1.2&&Math.abs(x-21.2)<5))return ihdPick(IHR.brass,x<21.2||y<15.5?.88:.5,X,Y);return null})});ihdGlint(P,6,6,1)},
 'ab-bash'(P){ihdHeater(P,2.5,4,17,24,IHR.verd);P.fill((x,y,X,Y)=>{const o=P.get(X,Y);if(!o)return null;return (Math.abs(x-11)<1.2&&Math.abs(y-13.5)<4.5)||(Math.abs(y-12.5)<1.2&&Math.abs(x-11)<4)?ihdPick(IHR.brass,(x<11||y<12.5)?.9:.5,X,Y):null});
  P.part(Q=>{ihdFacets(Q,ihdStar(24.5,15,8.6,3.2,8,0),24.5,15,ihdR(['b','c','d','e','r']),{table:2})});ihdGlint(P,25,15,1);ihdGlint(P,6,7,1)},
 'ab-parry'(P){ihdSword(P,27,27,9,9,{gw:3.6,bw:1.4,glint:false});P.part(Q=>{ihdSword(Q,4,28,27,5,{blade:IHR.brass})});ihdGlint(P,16,16,2)},
};
/* outline + register: the drawings win while the 16 px icon they replace is still the one drawn in 06-icons.js */
function ihdHandPaint(f){const P=ihdNew();f(P);const out=P.out.slice(),z=P.z;
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=y*32+x;if(z[i])continue;let f2=null,lit=false;
  for(const [dx,dy,l] of [[0,1,1],[1,0,1],[0,-1,0],[-1,0,0]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>31||Y>31)continue;const j=Y*32+X;if(z[j]){f2=P.out[j];lit=!!l;break}}
  if(f2)out[i]=lit?ihdMix(IHD_INK,ihdShd(f2,.45),.24):ihdMix(IHD_INK,f2,.06)}
 return{W:32,H:32,out}}
for(const n in IHD_DRAW){ICHD_HAND[n]=IHD_DRAW[n];ICHD_BASE[n]=Object.prototype.hasOwnProperty.call(ICONS,n)?ICONS[n]:undefined}
