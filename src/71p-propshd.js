/* ================= HD PROPS (high-resolution obstacles for 71-tiles.js drawPropPx) =================
   The same obstacles at twice the art resolution: a 112x128 RGB buffer with the feet at (56,104) (HD px, half an art pixel
   each), cached per prop id as a canvas and blitted at half size, so the footprint, anchor, depth order, fading box, picking
   and line of sight (all from the 1x prop, propBoxPx) are untouched. Each painter replays the 1x painter's seeded calls
   (same mulberry seed, same call order) so the silhouette, size and placement match, then paints at HD with per-material
   colour ramps built from the PAL keys of the 1x art (ordered dither between steps, never smoothed): bark ridges, needle
   tiers, leaf clusters with lit tops, faceted rock with creases and lichen, fluted drums, mortar courses, crystal facets.
   A 1 HD px selective outline replaces the 1x 1 art px black one. Extra detail draws from a second hash-seeded stream
   (R2); the game rnd() is never touched. 70-render.js asks for these (o.hd) when the ground strips are HD (TL.k 2). */
const TXPHD={on:true};
function hpOK(){return TXPHD.on&&typeof hdOK==='function'&&hdOK()}
function hpBuf(){const P=hdBuf(112,128,56,104);P.id=new Uint8Array(112*128);return P}
function hpRamp(keys,n,hl){const G=hdRamp(keys.map(k=>PAL[k]||k),n);if(hl)G.push(hdMix(G[G.length-1],hdC('#fffbe8'),hl));return G}
/* a tapered limb from (x0,y0) to (x1,y1), radius r0..r1 (HD px, continuous): lit on its upper-left side; bark adds ridges */
function hpLimb(P,x0,y0,x1,y1,r0,r1,G,sd,bark){const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||1,tx=dx/L,ty=dy/L;let nx=-ty,ny=tx;if(nx>0||(nx===0&&ny>0)){nx=-nx;ny=-ny}
 const N=G.length-1,mr=Math.max(r0,r1),bx0=Math.floor(Math.min(x0,x1)-mr-1),bx1=Math.ceil(Math.max(x0,x1)+mr+1),by0=Math.floor(Math.min(y0,y1)-mr-1),by1=Math.ceil(Math.max(y0,y1)+mr+1);
 for(let Y=by0;Y<=by1;Y++)for(let X=bx0;X<=bx1;X++){const px=X+.5-x0,py=Y+.5-y0;let t=(px*tx+py*ty)/L;t=t<0?0:t>1?1:t;const ox=px-dx*t,oy=py-dy*t,r=r0+(r1-r0)*t;if(ox*ox+oy*oy>r*r)continue;
  const ac=(ox*nx+oy*ny)/r;let v=N*.42+ac*N*.28-(ac<-.55?1:0)+(ac>.6?.6:0);
  if(bark){const cc=ox*nx+oy*ny+r,al=t*L;if(r>1.4&&((Math.floor(cc*1.2)+sd)%3+3)%3===0&&hdN(cc*2,al,3,sd)<.66)v-=1.4;else if(txHash(Math.floor(cc),Math.floor(al/3),sd)<.07)v+=1.1}
  P.p(X,Y,hdDi(G,v,X,Y))}}
/* light on a rim pixel: an empty neighbour up or left */
function hpRim(P,f){const w=P.w,h=P.h,d=P.d,o=new Uint32Array(d),W=hdC('#fffbe8');for(let y=1;y<h;y++)for(let x=1;x<w;x++){const i=y*w+x;if(!d[i])continue;if(!d[i-1]||!d[i-w])o[i]=hdMix(d[i],W,f)}d.set(o)}
/* 1 HD px selective outline: a very dark shade of the colour it borders */
function hpOutline(P){const w=P.w,h=P.h,d=P.d,o=new Uint32Array(d),K=hdC('0');for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;
  if(d[i]){if(x<w-1&&y<h-1&&(!d[i+1]||!d[i+w]))o[i]=hdMix(d[i],K,.3);continue}   // inner shade on the lower-right edge
  let nb=0;if(y<h-1&&d[i+w])nb=d[i+w];else if(x>0&&d[i-1])nb=d[i-1];else if(x<w-1&&d[i+1])nb=d[i+1];else if(y>0&&d[i-w])nb=d[i-w];if(nb)o[i]=hdMix(K,nb,.08)}d.set(o)}

/* ---- foliage: a canopy of balls (HD [cx,cy,rx,ry]), bumpy rim, filled with small leaf clusters lit from the top-left ---- */
function hpCanopy(P,R,balls,G,o){const W=P.w,Hh=P.h,M=new Uint8Array(W*Hh),GL=new Float32Array(W*Hh),N=G.length-1,ax=P.ax,ay=P.ay;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
 const ball=(cx,cy,rx,ry,pc)=>{for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){const nx=(x+.5-cx)/rx,ny=(y+.5-cy)/ry;if(nx*nx+ny*ny>1)continue;
   const X=x+ax,Y=y+ay;if(X<0||Y<0||X>=W||Y>=Hh)continue;let mx=nx,my=ny;if(pc){mx=Math.max(-1,Math.min(1,(x+.5-pc[0])/pc[2]));my=Math.max(-1,Math.min(1,(y+.5-pc[1])/pc[3]))}
   const q=Math.min(1,mx*mx+my*my),i=Y*W+X;M[i]=1;GL[i]=-.55*mx-.72*my+.42*Math.sqrt(1-q);if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}};
 for(const b of balls){ball(b[0],b[1],b[2],b[3]);const nb=Math.round((b[2]+b[3])*(o.bump||.45));for(let i=0;i<nb;i++){const a=R()*6.283,br=1.4+R()*1.8;if(Math.sin(a)>.55&&R()<.7)continue;ball(b[0]+Math.cos(a)*b[2]*.93,b[1]+Math.sin(a)*b[3]*.93,br,br*.9,b)}}
 const und=o.under,uk=o.uk||.1,val=(Y,l,loc)=>N*.38+l*N*.3+loc-(Y>und?Math.min(2.2,(Y-und)*uk):0);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=(y+ay)*W+x+ax;if(M[i])P.p(x,y,hdDi(G,val(y,GL[i],-.9),x,y))}
 const L=[],n=Math.round((x1-x0)*(y1-y0)/(o.dens||9));for(let k=0;k<n*3&&L.length<n;k++){const x=Math.round(x0+R()*(x1-x0)),y=Math.round(y0+R()*(y1-y0)),i=(y+ay)*W+x+ax;if(M[i])L.push([x,y,(o.cr||2)+R()*(o.cr2||2.2),GL[i]])}
 L.sort((a,b)=>a[1]-b[1]);
 for(const c of L){const r=c[2],ir=Math.ceil(r);for(let dy=-ir;dy<=ir;dy++)for(let dx=-ir;dx<=ir;dx++){const q=(dx*dx)/(r*r)+(dy*dy)/(r*r*.75);if(q>1)continue;const X=c[0]+dx,Y=c[1]+dy,i=(Y+ay)*W+X+ax;if(X+ax<0||X+ax>=W||Y+ay<0||Y+ay>=Hh||!M[i])continue;
   let v=val(Y,c[3]*.7+GL[i]*.3,(-(dx*.55+dy*.8)/r)*1.5);if(q>.8&&dy>0)v-=.7;P.p(X,Y,hdDi(G,v,X,Y))}
  if(c[3]>.15&&R()<.6){const X=c[0]-1,Y=c[1]-Math.round(r*.6);if(M[(Y+ay)*W+X+ax])P.p(X,Y,G[Math.min(N,Math.round(val(Y,c[3],2)))])}}
 for(let k=0;k<n/3;k++){const x=Math.round(x0+R()*(x1-x0)),y=Math.round(y0+R()*(y1-y0)),i=(y+ay)*W+x+ax;if(!M[i])continue;if(GL[i]>.45)P.p(x,y,G[N]);else if(GL[i]<-.1||y>und)P.p(x,y,G[0])}
 return{M,GL,x0,x1,y0,y1}}

/* ---- trees ---- */
const HPBARK=()=>hpRamp(['0','a','i','j','k'],9,.12);
function hpLeafy(P,R,R2,x0,y0,o,sd){const tH=o.tH,C=o.C,X0=2*x0+1,Y0=2*y0+1,bk=HPBARK(),tl=(.4*tH+5)*o.lean*2,yt=Y0-2*(tH+5);
 hpLimb(P,X0-5,Y0+1,X0-1,Y0-6,1.8,1.6,bk,sd);hpLimb(P,X0+5,Y0+1,X0+1,Y0-6,1.6,1.4,bk,sd);
 hpLimb(P,X0,Y0+1,X0,Y0-1.2*tH,o.thick?4.4:3.6,o.thick?3.8:3.2,bk,sd,1);hpLimb(P,X0,Y0-1.2*tH,X0+tl,yt,o.thick?3.8:3.2,2.4,bk,sd,1);
 hpLimb(P,X0-1,Y0-2*tH+3,X0-12,Y0-2*tH-8,1.9,1,bk,sd,0);hpLimb(P,X0+2,Y0-2*tH+5,X0+12,Y0-2*tH-6,1.7,1,bk,sd,0);
 const cx=x0+Math.round(tH*o.lean*.4),cy=y0-tH-o.ry,L=[];
 for(let i=0;i<o.n;i++){const a=i/o.n*6.283+R()*.5,rr=i<o.n-2?1:.35;L.push([cx+Math.cos(a)*o.rx*rr*.62,cy+Math.sin(a)*o.ry*rr*.6,o.cr*(.8+R()*.4)])}L.sort((a,b)=>a[1]-b[1]);
 const G=hpRamp([txDk(null,C.dk||txDk(null,C.lo)),C.dk||txDk(null,C.lo),C.lo,C.mid,C.hi,C.sp||C.hi],10,.15);
 const cv=hpCanopy(P,R2,L.map(c=>[2*c[0]+1,2*c[1]+1,c[2]*2.3,c[2]*2]),G,{under:2*(cy+o.ry*.35)+1,uk:.12,dens:9,cr:2.2,cr2:2.4});
 if(o.moss){const MG=hpRamp(['2','3','4','n','m'],7);for(let i=0;i<14;i++){const x=Math.round(cv.x0+4+R2()*(cv.x1-cv.x0-8));let y=cv.y1;while(y>cv.y0&&!cv.M[(y+P.ay)*P.w+x+P.ax])y--;if(y<=cv.y0)continue;const len=3+((R2()*10)|0);
   for(let j=0;j<len;j++){const sw=Math.round(Math.sin(j*.5+i)*.6);P.p(x+sw,y+j,hdDi(MG,4-j/len*3,x,y+j))}}}
 if(o.fruit){const F=hdC(o.fruit),FH=hdMix(F,hdC('r'),.5),FD=hdMul(F,.6);for(let i=0;i<7;i++){const x=Math.round(cx*2+1+(R2()-.5)*o.rx*2.6),y=Math.round(cy*2+1+(R2()-.3)*o.ry*2);if(!P.g(x,y)||!P.g(x+1,y+1))continue;P.p(x,y,FH);P.p(x+1,y,F);P.p(x,y+1,F);P.p(x+1,y+1,FD)}}
 return cv}
function hpPine(P,R,x0,y0,H,W,C,snow,sd,R2){const tH=Math.max(4,(H*.18)|0),X0=2*x0+1,Y0=2*y0+1,bk=HPBARK();
 hpLimb(P,X0,Y0+1,X0,Y0-2*(tH+4),3.3,2.4,bk,sd,1);hpLimb(P,X0-1,Y0,X0-5,Y0+1.5,1.7,1,bk,sd);hpLimb(P,X0+1,Y0,X0+5,Y0+1.5,1.6,1,bk,sd);
 const G=hpRamp(['0','1',C.lo,C.mid,C.hi],10,.22),S=HDRAMP.snowb,N=G.length-1,n=H>30?4:3,top=y0-H,bot=y0-tH,ID=P.id,Wd=P.w,T=[];
 for(let t=0;t<n;t++){const k=t/(n-1),th=Math.round((bot-top)/n*1.5),by=Math.round(bot-(bot-top-th)*k),ay=by-th,hw=Math.max(3,Math.round(W*(1-.5*k)));T.push([ay,by,hw,th])}
 for(let t=0;t<n;t++){const ay=T[t][0],by=T[t][1],hw=T[t][2],th=T[t][3];
  for(let Y=2*ay;Y<=2*by+5;Y++){const yy=(Y+.5)/2,half=Math.min(hw+.4,Math.max(.3,(yy-ay+.2)/th*(hw+.4)));
   for(let X=X0-2*hw-3;X<=X0+2*hw+3;X++){const xr=(X+.5)/2-(x0+.5),ax=Math.abs(xr);if(ax>half)continue;
    const tooth=[0,.6,1.2,.7,.2][((X+t*3)%5+5)%5]*(1-ax/(hw+1)*.5);if(yy>by+.7+tooth)continue;
    const e=xr/(half+.3),vt=(yy-ay)/(by-ay+1),dX=Math.abs(X+.5-X0),ph=txHash(Math.floor(dX/5),t,sd)*4,u=Y+ph-dX*.55,w=((u%4)+4)%4;
    let v=N*.7-e*N*.34-vt*1.1+(w<1?1.5:w>=3?-1.1:0)+(txHash(X,Y,sd)-.5)*.7;if(yy>by+.2)v-=1.2;let c=hdDi(G,v,X,Y);
    if(snow&&(yy-ay<2.4+hdN(X,0,3,sd+t)*1.6+(t===n-1?2.4:0)||(xr<-half+1.2+hdN(X,Y,3,sd)*1.2&&yy<by+.3)||(w<1.3&&e<.15&&txHash(Math.floor(dX/3),Math.floor(u/4),sd+3)<.6&&yy<by+.3)))c=hdDi(S,5.4-(e>0?1.6:0)-(w>=1?1:0)-(yy-ay<1.5?0:.4),X,Y);
    P.p(X,Y,c);ID[(Y+P.ay)*Wd+X+P.ax]=t+1}
   if((Y&1)===0&&yy<by+.5&&yy>ay+1){for(const s of[-1,1]){const X=Math.round(X0+s*(half*2+.5)),c=P.g(X-s,Y);if(c&&!P.g(X,Y)&&txHash(X,Y,sd+9)<.55)P.p(X,Y+1,G[s<0?3:1])}}}}
 for(let t=1;t<n;t++)for(let X=X0-2*T[t][2]-2;X<=X0+2*T[t][2]+2;X++){let Y=2*T[t][1]+6;while(Y>2*T[t][0]&&ID[(Y+P.ay)*Wd+X+P.ax]!==t+1)Y--;if(Y<=2*T[t][0])continue;
  for(let d=1;d<=4;d++){const i=(Y+d+P.ay)*Wd+X+P.ax,g=ID[i];if(g&&g<t+1){const c=P.g(X,Y+d);if(d<4||txHash(X,Y,2)<.5)P.p(X,Y+d,hdMix(c,G[0],d<3?.55:.3))}}}
 P.p(X0,2*top-1,snow?hdC('r'):G[N-1]);P.p(X0,2*top-2,snow?hdC('r'):G[N-2])}
function hpDead(P,R,x0,y0,C,H,emb,sd){const G=hpRamp(['0',txDk(null,C[2]),C[2],C[1],C[0]],9,.15),F=HDRAMP.fire,rad=[0,1.5,2.3,3.4];
 const br=(x,y,a,len,th,d)=>{const x1=Math.max(x0-15,Math.min(x0+15,x+Math.cos(a)*len)),y1=y+Math.sin(a)*len;hpLimb(P,2*x+1,2*y+1,2*x1+1,2*y1+1,rad[th]+(th>2?.6:0),Math.max(.8,rad[th]*.75),G,sd,th>1);
   if(d>0){const n=d>1?2:1+(R()<.5?1:0);for(let i=0;i<n;i++)br(x1,y1,(a+(i?1:-1)*(.4+R()*.45)*(n>1?1:(R()<.5?1:-1)))*.8-1.57*.2,len*(.55+R()*.2),th-1,d-1)}
   else if(emb&&R()<.6){const X=Math.round(2*x1+1),Y=Math.round(2*y1+1),hot=R()<.5;P.p(X,Y,F[hot?4:3]);P.p(X+1,Y,F[hot?3:2]);P.p(X,Y+1,F[2])}};
 hpLimb(P,2*x0-5,2*y0+2,2*x0,2*y0-3,2,1.5,G,sd);hpLimb(P,2*x0+7,2*y0+2,2*x0+2,2*y0-3,1.8,1.4,G,sd);
 br(x0,y0,-1.57+(R()-.5)*.25,H*.36,3,3);if(R()<.7){const X=2*x0+2,Y=2*y0-9;for(let j=0;j<4;j++){P.p(X,Y+j,hdC('0'));P.p(X+1,Y+j,G[1])}P.p(X,Y-1,G[5])}}
function hpJPine(P,R,R2,v,sd){const lean=v===1?-1:1,bk=HPBARK(),G=hpRamp(['0','3','7','B','A'],10,.18);let px=1,py=3;
 for(let y=0;y<=16;y+=2){const b=lean*y*y/40,X=2*b+1,Y=3-2*y;hpLimb(P,px,py,X,Y,3-y*.06,3-(y+2)*.06,bk,sd,1);px=X;py=Y}
 const pads=[[-lean*6,-9,8,3],[lean*7,-15,7,3],[-lean*2,-21,8,3.4],[lean*3,-27,5,2.6]];
 for(const p of pads){const bx=lean*(-p[1])*(-p[1])/40;hpLimb(P,2*bx+1,2*p[1]+5,2*(bx+p[0])+1,2*p[1]+3,1.8,1.1,bk,sd)}
 for(const p of pads){const bx=Math.round(lean*(-p[1])*(-p[1])/40),cx=2*(bx+p[0])+1,cy=2*p[1]+1;
  hpCanopy(P,R2,[[cx,cy,p[2]*2,p[3]*2],[cx-p[2]*.7,cy+1,p[2]*1.1,p[3]*1.6],[cx+p[2]*.7,cy+1,p[2]*1.1,p[3]*1.6]],G,{under:cy+1,uk:.5,dens:7,cr:1.8,cr2:1.8,bump:.7})}}
function hpBamboo(P,R,R2,v,sd){const n=4+v,G=hpRamp(['3','7','B','w','v','A'],9,.15),LG=hpRamp(['3','7','B','A'],7,.2);
 for(let i=0;i<n;i++){const x=Math.round((i-(n-1)/2)*4+(R()-.5)*2),H=26+((R()*14)|0),lean=(R()-.5)*.12;
  for(let Y=3;Y>=2-2*H;Y--){const y=(3-Y)/2,X0=2*x+2*lean*y,ny=(y+i*3)%7;for(let k=0;k<4;k++){const X=Math.round(X0)+k;let vv=[5.4,4.2,3.4,1.6][k];if(ny<.5)vv=k===0?3:1.4;else if(ny<1)vv+=1;P.p(X,Y,hdDi(G,vv+(txHash(X,Y,sd)-.5)*.5,X,Y))}}
  for(let k=0;k<3;k++){const yb=H-4-k*7,Yb=3-2*yb,Xb=Math.round(2*x+2*lean*yb)+2,d=k&1?1:-1;
   for(let l=0;l<2;l++){const len=9+((R2()*6)|0),dr=.25+R2()*.35+l*.2;for(let j=0;j<len;j++){const q=j/len,X=Xb+d*(2+j),Y=Yb+Math.round(j*dr+q*q*3),w=q<.15?1:q<.7?2:1;for(let s=0;s<w;s++)P.p(X,Y+s,hdDi(LG,s?2:4.6-q*1.8,X,Y))}}}}}
function hpCactus(P,R,x0,y0,H,R2,sd){const G=hpRamp(['2','3','7','B','w','v'],9,.15),N=G.length-1,sp=hdC('l');
 const stem=(xl,yb,yt,w)=>{const XL=2*xl,XW=2*w,YB=2*yb+1,YT=2*yt,rr=XW/2;
  for(let Y=YT;Y<=YB;Y++)for(let i=0;i<XW;i++){const dy=Y+.5-(YT+rr),dx=i+.5-rr;if(dy<0&&dx*dx+dy*dy>rr*rr)continue;const e=dx/rr,rb=(i+1)%3;
   let v=N*.55-e*N*.3+(Math.sqrt(Math.max(0,1-e*e))-.6)*2+(dy<0?-dy/rr*.8:0);if(rb===0&&XW>4)v-=1.2;else if(rb===1)v+=.5;if(Y>YB-2)v-=1;P.p(XL+i,Y,hdDi(G,v+(txHash(XL+i,Y,sd)-.5)*.4,XL+i,Y));
   if(rb===1&&(Y+i*2)%7===0&&Y>YT+2)P.p(XL+i,Y,hdMix(sp,G[N],.3))}
  for(let Y=YT+3;Y<YB-2;Y+=4){P.p(XL-1,Y,hdMix(sp,G[2],.3));P.p(XL+XW,Y+2,hdMix(sp,G[1],.55))}};
 stem(x0-2,y0,y0-H,5);const a1=6+((R()*5)|0),a2=9+((R()*6)|0);
 hpLimb(P,2*x0-2,2*(y0-a1)+1,2*(x0-9)+3,2*(y0-a1)+1,2.6,2.8,G,sd);stem(x0-9,y0-a1,y0-a1-6-((R()*4)|0),3);
 hpLimb(P,2*x0+4,2*(y0-a2)+1,2*(x0+7)+3,2*(y0-a2)+1,2.6,2.8,G,sd);stem(x0+7,y0-a2,y0-a2-5-((R()*4)|0),3);
 const fx=2*x0+1,fy=2*(y0-H)-1;P.p(fx-2,fy+1,hdC('g'));P.p(fx+2,fy+1,hdC('f'));P.p(fx-1,fy,hdC('h'));P.p(fx+1,fy,hdC('g'));P.p(fx,fy-1,hdC('h'));P.p(fx,fy,hdC('y'));P.p(fx-1,fy-1,hdMix(hdC('h'),hdC('r'),.4))}
/* ---- rock ---- */
const HPLICH={plains:'#c4c87a',forest:'#9cb860',hills:'#cfcf8c',swamp:'#7f9a58',snow:'#a8b49a'};
function hpBoulder(P,R,cx,cy,rx,ry,C,cap,R2,li){const p1=R()*6.28,p2=R()*6.28,p3=R()*6.28;void p3;
 const G=hpRamp(['0',txDk(null,C[3]),C[3],C[2],C[1],C[0]],10,.22),N=G.length-1,CX=2*cx+1,CY=2*cy+1,RX=2*rx,RY=2*ry,snow=cap&&cap[0]==='r',CG=cap?(snow?hpRamp(['p','q','r'],7,0):hpRamp(['3','7',cap[1],cap[0]],7,.1)):null,sites=[];
 for(let i=0;i<7;i++)sites.push([CX+(R2()-.5)*RX*1.6,CY+(R2()-.5)*RY*1.6,(R2()-.5)*.8,(R2()-.5)*.6]);
 for(let Y=Math.floor(CY-RY*1.2-2);Y<=CY+RY;Y++)for(let X=Math.floor(CX-RX*1.2-2);X<=CX+RX*1.2+2;X++){const x=X+.5-CX,y=Y+.5-CY,a=Math.atan2(y/RY,x/RX),q=Math.sqrt(x*x/(RX*RX)+y*y/(RY*RY)),lim=1+.1*Math.sin(3*a+p1)+.07*Math.sin(5*a+p2);if(q>lim||y>RY*.62)continue;
  const nx=x/RX/lim,ny=y/RY/lim,nz=Math.sqrt(Math.max(0,1-nx*nx-ny*ny));let b=1e9,b2=1e9,s=sites[0];for(const S of sites){const dx=X-S[0],dy=(Y-S[1])*1.4,d=Math.sqrt(dx*dx+dy*dy);if(d<b){b2=b;b=d;s=S}else if(d<b2)b2=d}
  const mx=nx+s[2],my=ny+s[3],L=-.55*mx-.72*my+.42*nz;let v=(L*.72+.32)*N+(txHash(X,Y,7)-.5)*.8+(hdN(X,Y,4,11)-.5)*.8;
  if(b2-b<1.2)v-=1.7;else if(b2-b<2.3&&my<.1)v+=.7;if(y>RY*.62-3)v=Math.min(v,N*.3);if(nz<.3)v-=.5;
  let c=hdDi(G,v,X,Y);if(cap&&ny<-.3+.15*Math.sin(x/2*1.3+p1)){const ed=-.3+.15*Math.sin(x/2*1.3+p1)-ny;c=hdDi(CG,(L*.8+.38)*(CG.length-1)+(txHash(X,Y,3)-.5)*.8-(ed<.06?1.2:0),X,Y)}
  P.p(X,Y,c)}
 for(let i=0;i<2;i++){let x=CX+2*Math.round((R()-.5)*rx),y=CY-2*Math.round(R()*ry*.3);const n=2+((R()*3)|0);for(let j=0;j<n;j++){const st=R()<.5;for(let s=0;s<2;s++){const c=P.g(x,y);if(c){P.p(x,y,hdMix(c,G[0],.7));const u=P.g(x+1,y);if(u)P.t(x+1,y,G[N],.3)}y++;if(st&&s===0)x++}}}
 for(let i=0;i<3;i++){const x=CX+2*Math.round((R()-.6)*rx),y=CY+2*Math.round((R()-.5)*ry);if(P.g(x,y)){P.t(x,y,G[N],.5);P.t(x+1,y,G[N],.3)}}
 if(li){const LC=hdC(li);for(let i=0;i<2+((R2()*3)|0);i++){const sx=CX+(R2()-.5)*RX*1.3,sy=CY-R2()*RY*.8,r=1.4+R2()*2;for(let y=-3;y<=3;y++)for(let x=-4;x<=4;x++){const X=Math.round(sx+x),Y=Math.round(sy+y);if(x*x/(r*r*1.4)+y*y/(r*r)>1||txHash(X,Y,5)<.3)continue;if(P.g(X,Y))P.t(X,Y,LC,.34)}}}}
function hpPrism(P,bx,by,hgt,wd,lean,G){const BX=2*bx+1,BY=2*by+1,H=2*hgt,WD=2*wd,LN=2*lean,tip=Math.round(WD*1.1),rg=Math.max(1,Math.round(WD*.42)),N=G.length-1;
 for(let dy=0;dy<=H;dy++){const q=dy/H,cx=BX+Math.round(LN*q),t=dy>H-tip?(H-dy)/tip:1,l=Math.round(rg*t),rr=Math.round((WD-rg-1)*t);
  for(let x=-l;x<=rr;x++){let v;if(x<0)v=N*.5+q*1.5+(x===-l&&l>1?-1:0)+(((dy+x*2)%9+9)%9===0?-1.3:0)+(x===-1?.6:0);else if(x===0)v=q>.2?N:N-1;
   else v=N*.32-(x/Math.max(1,rr))*1.8+q*.9+(x===rr&&rr>1?-1.2:0)+(((dy-x*3)%13+13)%13===0?1.4:0);if(dy<2)v=Math.min(v,1.2);P.p(cx+x,BY-dy,hdDi(G,v,cx+x,BY-dy))}}}
/* ---- built things ---- */
const HPSTONE=()=>hpRamp(['1','G','o','n','m','l','#fbf6e6'],11,0);
function hpColumn(P,R,x0,y0,H,snow,R2,sd){const S=HPSTONE(),N=S.length-1,X0=2*x0,MG=hpRamp(['3','7','B','w','A'],7),SN=HDRAMP.snowb;
 for(let Y=2*(y0-2);Y<=2*y0+3;Y++)for(let X=X0-12;X<=X0+13;X++){const top=Y<2*(y0-2)+2,xr=(X-X0+.5)/13;let v=top?N*.9-(xr>.5?1.4:0):N*.64-xr*2.2;if(Y===2*y0)v-=1.3;else if(Y===2*y0+1)v+=.6;if(Y===2*y0+3)v-=1.4;
  v+=(txHash(X,Y,sd)-.5)*.8;if(top&&snow)P.p(X,Y,hdDi(SN,5-(xr>.5?1.5:0),X,Y));else P.p(X,Y,hdDi(S,v,X,Y))}
 for(let X=X0-8;X<X0+8;X++){const xi=(X-X0+8)>>1,top=H-((txHash(xi,H,5)*5)|0)-(xi>4?3:0),YT=2*(y0-top+1)+(txHash(X,H,6)<.4?1:0),e=(X-X0+.5)/8,fl=((X-X0+8)%3+3)%3;
  for(let Y=YT;Y<=2*(y0-3)+1;Y++){const yh=2*y0+1-Y,ay=yh>>1;let v=N*.68-e*N*.24+(Math.sqrt(Math.max(0,1-e*e))-.7)*1.6;if(fl===0)v-=1.1;else if(fl===1)v+=.5;
   if(ay%7===2&&(yh&1)===0)v-=2;else if(ay%7===2)v+=.8;v+=(txHash(X,Y,sd+1)-.5)*.7;if(Y<=YT+1)v=snow?99:N-.5-(e>.3?1.5:0);P.p(X,Y,v>50?hdDi(SN,5-(e>.3?1.5:0),X,Y):hdDi(S,v,X,Y))}}
 for(let i=0;i<5;i++){const X=X0-6+Math.round(R2()*12),Y=2*(y0-H*.4)+Math.round(R2()*H*.4);if(P.g(X,Y)&&P.g(X+1,Y)){P.p(X,Y,S[1]);P.p(X+1,Y,S[2]);P.p(X,Y+1,S[N-2])}}
 hdBall(P,X0+23,2*y0+4,6.8,4.8,S,1,sd,0);for(let y=-3;y<=3;y++)for(let x=-2;x<=2;x++){const q=x*x/4+y*y/9;if(q<=1)P.p(X0+28+x,2*y0+4+y,q>.6?S[N-4]:(q>.25?S[N-1]:S[N-2]))}
 for(let i=0;i<6;i++){const x=x0-5+((R()*5)|0),y=y0-2-((R()*H*.5)|0),X=2*x+1,Y=2*y+1;if(!P.g(X,Y))continue;for(let k=0;k<6;k++){const xx=X+((R2()*5)|0)-2,yy=Y+((R2()*4)|0)-1;if(P.g(xx,yy))P.p(xx,yy,snow?hdDi(SN,4+R2()*2,xx,yy):hdDi(MG,1.5+R2()*3,xx,yy))}}}
function hpWall(P,R,x0,y0,snow,R2,sd){const hs=[];let hh=14+((R()*5)|0);for(let x=-11;x<=10;x++){if(((x+11)%5)===0&&x>-10)hh=Math.max(4,hh-((R()*6)|0)+(R()<.25?3:0));hs.push(Math.min(19,hh))}
 const S=HPSTONE(),N=S.length-1,SN=HDRAMP.snowb,MG=hpRamp(['2','3','7','B','w'],7);
 for(let X=2*(x0-11);X<=2*(x0+10)+1;X++){const ax=Math.floor(X/2)-x0,base=2*y0+3+Math.floor((X-2*x0)/2),HH=2*hs[ax+11]-(txHash(X,7,sd)<.35?1:0)-(txHash(X>>1,9,sd)<.2?2:0),side=ax>8,u=X-2*x0+22;
  for(let yh=0;yh<HH+2;yh++){const Y=base-yh,row=Math.floor(yh/6),ry=yh%6,o=u+(row&1)*5,bx=o%10,bid=Math.floor(o/10);let v;
   if(yh>=HH){v=N*.86-(side?1.6:0)+(txHash(X,Y,4)-.5)*.6;P.p(X,Y-0,snow?hdDi(SN,5.5,X,Y):hdDi(S,v,X,Y));continue}
   if(ry===5||(bx===0&&!side))v=1.3+(txHash(X,Y,2)-.5);else{v=N*.68+(txHash(bid,row,sd)-.5)*1.8+(ry===4?1:ry===0?-.8:0)+(bx===1?.5:bx===9?-.6:0)+(txHash(X,Y,3)-.5)*.9;if(txHash(bid,row,sd+3)<.07)v=.6}
   if(side)v-=1.8;if(yh===0)v-=1;P.p(X,Y,hdDi(S,v,X,Y))}
  if(snow&&txHash(X,2,sd)<.7)P.p(X,base-HH-2,hdC('r'))}
 for(let i=0;i<9;i++){const X=2*(x0-11)+Math.round(R2()*30),bs=2*y0+3+Math.floor((X-2*x0)/2),Y=bs-Math.round(R2()*10);for(let k=0;k<7;k++){const xx=X+((R2()*5)|0)-2,yy=Y+((R2()*4)|0)-1;if(P.g(xx,yy))P.p(xx,yy,snow?hdDi(SN,4+R2()*2,xx,yy):hdDi(MG,1+R2()*3.5,xx,yy))}}
 hdBall(P,2*(x0-9)+1,2*(y0+5)+1,5.2,3.6,S,1.2,sd,0);hdBall(P,2*(x0-12)+1,2*(y0+5)+3,2.4,1.8,S,1,sd+1,0);hdBall(P,2*(x0-5),2*(y0+5)+3,2,1.5,S,1,sd+2,0)}
function hpArch(P,R,x0,y0,R2,sd){const G=hpRamp(['a','i','j','k','c','d','e'],11,.1),N=G.length-1;
 for(let Y=2*(y0+2-30)-1;Y<=2*(y0+2)+1;Y++)for(let X=2*(x0-14);X<=2*(x0+13)+1;X++){const x=(X+.5)/2-.5-x0,y=(y0+2)-((Y+.5)/2-.5),xi=Math.floor(x+.5);
  const topc=30-Math.max(0,Math.abs(x+.5)-8)*1.2-(txHash(xi>>1,3,7)*2|0)+(txHash(X,5,sd)<.3?-.5:0);if(y>topc+.25||y<-.25)continue;const hx=(x+.5)/5.5,hy=y/19,hq=hx*hx+Math.max(0,hy)*hy;if(hq<1&&y<19)continue;
  const wb=Math.sin(x*.45+sd)*.6+hdN(X,Y,6,sd)*1.2,band=Math.floor((y+wb)/2.6),bf=((y+wb)/2.6)-band;let v=N*.55+[0,.9,-.5,.5,-.9,.3,-.2][((band%7)+7)%7];
  if(bf<.14)v-=1.4;else if(bf>.86)v+=.6;
  if(x<-11)v+=1.4;else if(x>10)v-=2.8;else if(x>=6&&x<8)v+=1.2;else if(x>8)v-=1.6;else if(x>-8&&x<-5)v-=1.2;
  if(hq<1.35&&y<19.5){if(y>16)v-=2.4;else if(x>0)v+=1.4;else v-=1.6}
  if(y>topc-2.6)v=N*.8-(x>6?1.4:0)+(txHash(X,Y,3)-.5);if(y<1.5)v-=1.3;v+=(txHash(X,Y,sd)-.5)*.8;P.p(X,Y,hdDi(G,v,X,Y))}
 for(let i=0;i<5;i++){const cx=2*x0+Math.round((R2()-.5)*44),cy=2*(y0+2)-Math.round(6+R2()*44),r=1+R2()*1.6;for(let y=-2;y<=2;y++)for(let x=-3;x<=3;x++){if(x*x/(r*r*2)+y*y/(r*r)>1)continue;const X=cx+x,Y=cy+y,c=P.g(X,Y);if(c)P.p(X,Y,hdMix(c,G[0],y<0?.7:.45))}}}
function hpSpire(P,R,x0,y0,R2,sd){const n=6,ws=[];let x=-10;for(let i=0;i<n;i++){const w=3+((R()*2)|0);ws.push([x,w,Math.round(34-Math.abs(i-2.4)*6.5-R()*4)]);x+=w}
 ws.sort((a,b)=>a[2]-b[2]);const G=hpRamp(['0','1','G','o','n','p'],10,.1),F=HDRAMP.fire,N=G.length-1;
 for(const c of ws){const XL=2*(x0+c[0]),XW=2*c[1],base=2*(y0+1+(Math.abs(c[0]+5)<6?1:0))+1,HH=2*c[2];
  for(let i=0;i<XW;i++){const ct=HH-Math.round(i*.5)-(txHash(XL+i,c[2],sd)<.3?1:0);for(let yh=0;yh<ct;yh++){const X=XL+i,Y=base-yh;
   let v=i<2?N*.52:i>=XW-2?N*.1:N*.28;if(i===(XW>>1))v-=.9;const jt=((yh+c[0]*5)%18+18)%18;if(jt===0)v-=1.6;else if(jt===1)v+=.9;
   if(yh>=ct-3)v=N*.78-(i>=XW-2?1.8:0);v+=(txHash(X,Y,sd)-.5)*.9;let col=hdDi(G,v,X,Y);
   if(yh<10&&jt<1&&txHash(X>>1,c[0],sd+5)<.55)col=F[yh<5?3:2];else if(yh<4&&txHash(X,Y,sd+6)<.12)col=F[1+((txHash(X,Y,2)*3)|0)];P.p(X,Y,col)}}}
 for(let i=0;i<4;i++){const X=2*(x0-8+((R()*16)|0))+1,hot=R()<.5,Y=2*y0+4;P.p(X,Y,F[hot?3:2]);P.p(X+1,Y,F[hot?2:1]);P.p(X,Y-1,F[hot?4:2])}}
function hpStump(P,R,x0,y0,R2,sd){const sv=(R()*9)|0,G=hpRamp(['0','1','G','o','n'],9,.1),F=HDRAMP.fire,N=G.length-1,bk=G;
 hpLimb(P,2*x0-13,2*y0+4,2*x0-7,2*y0-2,2.4,2.6,bk,sd,1);hpLimb(P,2*x0+16,2*y0+5,2*x0+9,2*y0-2,2.2,2.6,bk,sd,1);
 for(let X=2*(x0-7);X<=2*(x0+7)+1;X++){const x=Math.floor(X/2)-x0,H=x<-6||x>6?3:x<-5||x>5?6:11+((txHash(x>>1,7,sv)*10)|0)+(x<0?5:0),HH=2*H-(txHash(X,3,sd)<.4?1:0)-(txHash(X,5,sd)<.2?2:0),e=(X-2*x0+.5)/15;
  for(let yh=0;yh<HH;yh++){const Y=2*(y0+1)+1-yh;let v=N*.44-e*N*.3;if(((X+40)%4)===0&&txHash(X>>2,yh>>3,sd)<.8)v-=1.4;
   const cx=Math.floor((X+40)/5),o=yh+(cx&1)*3,cy=Math.floor(o/6),ce=o%6===0||(X+40)%5===0;let col=0;
   if(ce&&e<.7){v-=1.1;if(yh<18&&txHash(cx,cy,sd+4)<.35&&txHash(X,yh,sd+8)<.45)col=F[txHash(X,yh,3)<.3?4:yh<8?3:2]}
   if(yh>=HH-2)v=N*.7-(e>0?1.6:0);if(!col)col=hdDi(G,v+(txHash(X,Y,sd)-.5)*.8,X,Y);P.p(X,Y,col)}}}
function hpStakes(P,R,v,sd){const SO=hpRamp(['a','i','j','k','c'],8),W=hpRamp(['a','i','j','k','l'],8,.1),RO=hpRamp(['a','H','I'],5);
 hdBall(P,1,3,30,10,SO,1.4,sd,0);for(let Y=4;Y<14;Y++)for(let X=-32;X<33;X++)if(P.g(X,Y)&&Y>6)P.m(X,Y,.8);
 const N=5;for(let i=0;i<N;i++){const t=i/(N-1)*2-1,x0=Math.round(t*12),y0=Math.round(t*6)+1,H=15+((i*7+v*3)%4)*2-(i&1)*3,ln=i&1?1:-1,X0=2*x0+1,Y0=2*y0+1,tx=X0+2*ln*H/14,ty=Y0-2*H;
  hpLimb(P,X0,Y0+2,X0+(tx-X0)*.85,Y0-2*H*.85,2.3,2,W,sd+i,1);hpLimb(P,X0+(tx-X0)*.85,Y0-2*H*.85,tx,ty,2,.5,W,sd+i,0);P.p(Math.round(tx),Math.round(ty)+1,W[7]);P.p(Math.round(tx)-1,Math.round(ty)+2,W[6]);
  if(i&&i<N){const ry=2*(y0-Math.round(H*.45))+5;hpLimb(P,X0-24,ry-12,X0,ry,.8,.8,RO,sd);P.p(X0-1,ry-1,RO[4]);P.p(X0,ry-1,RO[3])}}
 for(let i=0;i<6;i++){const x=2*Math.round((R()-.5)*26)+1,y=2*Math.round(3+(R()-.5)*5)+1;hdStone(P,x,y,3,HDRAMP.soil,sd+i)}}
function hpToro(P,R,v,sd){const S=hpRamp(['0','G','o','p','q','r'],10,0),N=S.length-1,F=HDRAMP.fire;
 const box=(xa,xb,ya,yb,top)=>{for(let Y=2*ya;Y<=2*yb+1;Y++)for(let X=2*xa;X<=2*xb+1;X++){const e=(X-2*xa+.5)/(2*(xb-xa+1))*2-1;let k=N*.55-e*N*.3+(txHash(X,Y,sd)-.5)*.9;if(top&&Y<2*ya+2)k=N*.85-(e>.4?1.5:0);if(Y===2*yb+1)k-=1.2;P.p(X,Y,hdDi(S,k,X,Y))}};
 box(-5,5,0,1,1);box(-1,1,-9,-1,0);box(-4,4,-10,-10,1);box(-4,-4,-15,-11,0);box(4,4,-15,-11,0);
 for(let Y=-30;Y<=-21;Y++)for(let X=-6;X<=7;X++){const wy=Y>=-26&&Y<=-23&&X>=-2&&X<=3,cy=(Y+24.5)/4,cx=(X-.5)/4,q=cx*cx+cy*cy;P.p(X,Y,wy?F[q<.25?8:q<.6?7:6]:hdMix(hdC('G'),F[3],Math.max(0,.45-q*.15)))}
 for(let j=0;j<4;j++){const w=6-j;for(let Y=-32-2*j;Y<=-31-2*j;Y++)for(let X=-2*w;X<=2*w+1;X++){const e=X/(2*w+1);let k=j===0?N*.5-e*2:N*.7-e*2.2-(Y&1?0:-.5);P.p(X,Y,hdDi(S,k,X,Y))}}
 for(const s of[-1,1]){P.p(s*14+(s>0?1:0),-30,S[N-2]);P.p(s*13+(s>0?1:0),-31,S[N-3]);P.p(s*15+(s>0?1:0),-29,S[N-3])}
 hpLimb(P,1,-40,1,-43,1.6,1,S,sd);if(v===2)hpCanopy(P,mulberry(sd),[[15,1,8,4.2]],hpRamp(['3','7','B','w','v'],8,.15),{under:2,uk:.3,dens:7,cr:1.6,cr2:1.6})}
function hpTorii(P,R,v,sd){const RD=hpRamp(['0','f','g','h'],8,.1),BK=hpRamp(['0','G','o'],6),N=RD.length-1;
 for(const s of[-1,1]){const X=s*17+1;hpLimb(P,X,3,X+s*.5,-49,2.4,2.1,RD,sd,0);hdBall(P,X,3,4.4,2,hpRamp(['0','o','p'],6),.8,sd,0)}
 const beam=(ya,yb,xa,xb,G,up)=>{for(let X=xa;X<=xb;X++){const e=Math.abs(X+.5)/((xb-xa)/2),lift=up?Math.round(Math.max(0,e-.6)*e*7):0;for(let Y=ya-lift;Y<=yb-lift;Y++){const n=G.length-1;let k=Y===ya-lift?n:Y===yb-lift?1:n*.55;P.p(X,Y,hdDi(G,k+(txHash(X,Y,sd)-.5)*.6,X,Y))}}};
 beam(-38,-35,-24,25,RD,0);beam(-50,-47,-31,32,BK,1);beam(-46,-45,-27,28,RD,1);
 for(let Y=-44;Y<=-39;Y++)for(let X=-2;X<=3;X++)P.p(X,Y,hdDi(hpRamp(['b','c','d'],5),Y===-44?4:X>2?1:2.6,X,Y))}
/* ---- crystal, monolith, glass fan ---- */
function hpMonolith(P,R2,cry,sd){const G=hpRamp(['0','1','G','D','C'],10,.05),N=G.length-1,GL=hdC('C'),GW=hdC('r');
 for(let Y=-72;Y<=-11;Y++){const yf=-5.5-(Y+.5)/2,w=yf<4?yf+1:yf>25?31-yf:5;for(let X=-14;X<=14;X++){const xa=(X+.5)/2-.5;if(Math.abs(xa)>w+.3)continue;const e=xa/(w+.5);
   let k=e<-.6?N*.72:e>.6?N*.12:N*.38-e*.8;k+=(hdN(X,Y,5,sd)-.5)*1.4+(txHash(X,Y,sd)-.5)*.8;if(((Y+80)%13)===0&&txHash(X>>2,Y,sd)<.6)k-=1.2;P.p(X,Y,hdDi(G,k,X,Y))}}
 const rune=(X,Y)=>{P.p(X,Y,txHash(X,Y,2)<.3?GW:GL);for(const d of[[-1,0],[1,0],[0,-1],[0,1]])if(P.g(X+d[0],Y+d[1])&&P.g(X+d[0],Y+d[1])!==GL&&P.g(X+d[0],Y+d[1])!==GW)P.t(X+d[0],Y+d[1],GL,.35)};
 for(let y=8;y<23;y++){const Y0=2*(-6-y);if(y%4)rune(0,Y0),rune(0,Y0+1);if(y%5===0){rune(-4,Y0);rune(5,Y0)}}for(let X=-6;X<=7;X++)rune(X,2*(-21)+1);
 hpPrism(P,-10,2,7,3,-2,cry);hpPrism(P,9,3,9,4,2,cry);for(const d of[[-9,-16],[10,-22],[-7,-27]]){const X=2*d[0],Y=2*d[1];P.p(X,Y,GL);P.p(X+1,Y,hdMix(GL,GW,.5));P.p(X,Y+1,hdC('D'));P.p(X+1,Y+1,GL)}}
function hpCrystalBase(P,R,R2,bk,cx,cy,rx,ry){hpBoulder(P,R,cx,cy,rx,ry,bk==='hollow'?['D','G','1','0']:['5','7','3','2'],0,R2,0)}

/* ---- public: the HD canvas of a 1x prop record (71-tiles.js txProp) ---- */
function hpBuild(S){const a=S.id.split('|'),bk=a[0],kind=a[1],v=+a[2],P=hpBuf(),sd=(kind.length*7+kind.charCodeAt(0)+v*13)&255;
 const R=mulberry(Math.imul(v+1,2654435761)^Math.imul(kind.length*7+kind.charCodeAt(0),40503)),R2=mulberry((Math.imul(v+7,374761393)^Math.imul(kind.charCodeAt(1)||3,668265263)^TXBI[bk]*977)>>>0);
 const snow=bk==='snow',pc=snow?{lo:'3',mid:'7',hi:'4'}:bk==='hills'?{lo:'3',mid:'7',hi:'w'}:{lo:'3',mid:'7',hi:'B'};
 const rock=bk==='desert'?['d','c','k','j']:bk==='ashen'?['n','o','G','1']:bk==='swamp'?['n','o','4','3']:['q','p','o','G'],li=HPLICH[bk]||0;
 const cry=hpRamp(bk==='hollow'?['0','G','D','#7a56c0','C','#e2ccff']:['2','7','5','F','6','r'],10,.1);
 if(kind==='pine')hpPine(P,R,0,1,32+v*4,9+(v&1),pc,snow,sd,R2);
 else if(kind==='pines'){hpPine(P,R,5,-1,24+v*2,7,pc,snow,sd,R2);hpPine(P,R,-5,3,30+v*3,8,pc,snow,sd+1,R2)}
 else if(kind==='leafy')hpLeafy(P,R,R2,0,1,{tH:10+v,lean:v===1?.25:0,n:7,rx:12,ry:9,cr:6,thick:1,C:bk==='forest'?{hi:'w',mid:'B',lo:'7',dk:'3',sp:'v'}:{hi:'v',mid:'B',lo:'7',sp:'A'},fruit:v===2?'g':0},sd);
 else if(kind==='leafy2'){hpLeafy(P,R,R2,-4,2,{tH:7,lean:0,n:6,rx:9,ry:7,cr:5,C:{hi:'A',mid:'w',lo:'B',dk:'7',sp:'e'}},sd);
  hpCanopy(P,R2,[[15,-1,10,7.2],[11,1,5,4],[19,1,5,4]],hpRamp(['3','7','B','v','A'],9,.15),{under:0,uk:.3,dens:7,cr:1.7,cr2:1.8});if(v){P.p(19,-2,hdC('h'));P.p(20,-2,hdC('g'));P.p(19,-3,hdC('r'))}}
 else if(kind==='willow')hpLeafy(P,R,R2,0,1,{tH:11+v,lean:v===1?-.2:.15,n:7,rx:13,ry:8,cr:6,thick:1,moss:1,C:{hi:'w',mid:'4',lo:'3',dk:'2',sp:'n'}},sd);
 else if(kind==='dead')hpDead(P,R,0,1,bk==='ashen'?['o','G','1']:['k','j','i'],bk==='ashen'?52:48,bk==='ashen',sd);
 else if(kind==='boulder'){hpBoulder(P,R,-1,-5,10+v,8+(v&1),rock,snow?['r','q']:bk==='plains'||bk==='swamp'?['w','B']:0,R2,li);if(v!==1)hpBoulder(P,R,9,1,4,3,rock,snow?['r','q']:0,R2,li)}
 else if(kind==='stack'){hpBoulder(P,R,0,-4,10,7,rock,0,R2,li);hpBoulder(P,R,-1+v,-14,7,6,rock,0,R2,li);hpBoulder(P,R,1-v,-23,5+(v&1),4,rock,0,R2,li);if(bk==='desert')hpBoulder(P,R,0,-30,7,3,rock,0,R2,0)}
 else if(kind==='col')hpColumn(P,R,0,1,18+v*5,snow,R2,sd);
 else if(kind==='wall')hpWall(P,R,0,0,snow,R2,sd);
 else if(kind==='cactus')hpCactus(P,R,0,1,24+v*3,R2,sd);
 else if(kind==='arch')hpArch(P,R,0,1,R2,sd);
 else if(kind==='spire')hpSpire(P,R,0,1,R2,sd);
 else if(kind==='stump')hpStump(P,R,0,1,R2,sd);
 else if(kind==='crystal'){hpCrystalBase(P,R,R2,bk,0,0,9,4);hpPrism(P,-7,-1,13+v*2,4,-4,cry);hpPrism(P,7,0,15,5,4,cry);hpPrism(P,-1,1,27+v*3,7,v-1,cry);hpPrism(P,4,3,9,4,3,cry);hpPrism(P,-5,3,7,3,-2,cry)}
 else if(kind==='crystal2'){hpCrystalBase(P,R,R2,bk,0,1,10,4);hpPrism(P,-5,0,22+v*2,6,-3,cry);hpPrism(P,4,1,30+v*2,6,2,cry);hpPrism(P,9,2,11,4,5,cry);hpPrism(P,-9,3,9,4,-4,cry);hpPrism(P,0,4,6,3,0,cry)}
 else if(kind==='fan'){const GG=hpRamp(['2','7','5','F','6','r'],9);for(let i=0;i<7;i++){const t=(i-3)/3;hdShard(P,2*Math.round(t*7)+1,2*(Math.round((1-Math.abs(t))*3))+1,2*Math.round(30-Math.abs(t)*14-(i&1)*4),3.2+(i===3?1:0),2*Math.round(t*9),GG)}hpBoulder(P,R,0,2,9,3,['5','7','3','2'],0,R2,0)}
 else if(kind==='stakes')hpStakes(P,R,v,sd);
 else if(kind==='sakura'){hpLeafy(P,R,R2,0,1,{tH:9+v,lean:v===1?.3:v===2?-.2:.1,n:7,rx:12,ry:8,cr:6,thick:1,C:{hi:'r',mid:'h',lo:'g',dk:'f',sp:'l'}},sd);
  for(let i=0;i<14;i++){const x=Math.round((R2()-.5)*52),y=Math.round(2+(R2()-.5)*12);P.p(x,y,hdC(R2()<.5?'h':'r'));if(R2()<.5)P.p(x+1,y,hdC('h'))}}
 else if(kind==='jpine')hpJPine(P,R,R2,v,sd);else if(kind==='bamboo')hpBamboo(P,R,R2,v,sd);else if(kind==='toro')hpToro(P,R,v,sd);else if(kind==='torii')hpTorii(P,R,v,sd);
 else if(kind==='monolith')hpMonolith(P,R2,cry,sd);
 else return null;
 hpRim(P,.1);hpOutline(P);return hdCv(P)}
function txPropHD(S){if(S.hcv===undefined){S.hcv=null;try{S.hcv=hpBuild(S)}catch(e){S.hcv=null;if(typeof artFail==='function')artFail('prophd',e)}}return S.hcv}
function hpFlush(){if(typeof TXPC!=='undefined')for(const S of TXPC.values())S.hcv=undefined}
onArtChange(hpFlush);
