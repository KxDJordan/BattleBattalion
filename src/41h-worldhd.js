/* ================= WORLD ART, DETAIL HIGH: the painted overworld (terrain, rivers, roads, trees, peaks) =================
   The same world (W.tiles / river / road, the tile grid, the ownership noise and the path geometry of 41-worldart.js) painted
   smooth at device resolution in the town screen's style (51h-townhd.js): flat colours with soft shading, clean dark ink lines,
   one light from the upper left. Detail Low never comes here (70-render.js keeps the pixel chunks exactly as they were).
   TERRAIN. 70-render.js keeps the map in quads of WHQ x WHQ tiles (WHQ 8), each a canvas at K device px per art px (K = the
   settled whole zoom WV.s). A quad is painted in steps inside the frame's time budget:
     1. ground: a per-pixel shader (whShadeTile) at K. Ownership is the Low art's own field (bilinear tile weights + a seamless noise
        per terrain, waClass) evaluated per device pixel with the noise sampled smoothly, so borders are organic curves with no stair
        steps; the winner's margin is a distance to the border: land to land blends softly, water to land gets a beach / cliff / mud
        band, foam, shallows and an ink coastline (anti-aliased over one device pixel). Ground colour comes from seamless painted
        textures (whTex, 2 texels an art px, sampled bilinearly). Rivers and roads are distance fields to the Low art's own curves
        (waSegs: shared edge crossings, so they run on across tiles): river = ink edge, bank, water and a lighter middle; road = a
        soft dark edge and the dirt of the ground it crosses; where a road crosses water it becomes a plank bridge with rails.
     2. ground details (tufts, flowers, stones, reeds, pools, bones, ice) as small vector shapes, placed like the Low decorations.
     3. the tall layer: trees (round, dark, small, pines, snowy pines, swamp trees, dead trees, bushes, cacti), peaks and foothills,
        rocks; placed by the Low art's own rules (whTallItems mirrors waTallBuild), painted once per kind and K (whItemSpr) and
        stamped back to front. Each quad keeps its items so a sprite standing among them can have the ones in front put back
        (whOcclude), in place of the Low art's tall bands.
   Public: whOn() whTex() whShadeTile(img32,tx,ty,K) whQuadDeco(g,qx,qy) whTallItems(tx,ty) whItemSpr(kind,v,K) WHK */
const WHQ=8,WHTR=2,WHTW=WAP*WHTR,WHTM=WHTW-1;
const WHA={tex:null,nz:null,n1:null,n2:null,n3:null,spr:new Map(),K:0,ok:0};
function whOn(){return typeof hdArt==='function'&&hdArt()&&typeof Path2D==='function'&&typeof document!=='undefined'&&typeof waInit==='function'&&waInit()}
const WHINK='#1b2026';
function whRGB(h){const n=parseInt(String(h).slice(1),16);return[n>>16&255,n>>8&255,n&255]}
// ground ramps [dark, mid, light] per terrain: 0 water 1 grass 2 forest 3 hills 4 mountain scree 5 marsh 6 desert 7 snow
const WHG=[['#2a5f9e','#3570b4','#4a86c6'],['#6a9c43','#80b44f','#98c95d'],['#2e5b33','#3a6b3d','#4a7d46'],['#8d9a4a','#a3ad58','#b9bf6c'],
 ['#76726a','#8c887c','#a49f92'],['#4a6340','#5a7349','#6b8452'],['#d1a05a','#e2b974','#efcf90'],['#c3d2e3','#dde7f1','#f4f8fc']].map(r=>r.map(whRGB));
const WHC={ink:whRGB(WHINK),foam:whRGB('#eef8ff'),shal:whRGB('#5fa8da'),shal2:whRGB('#79bfe6'),sand:whRGB('#ecd393'),wsand:whRGB('#d6b878'),cliff:whRGB('#5d5a55'),cliff2:whRGB('#7d786e'),
 mud:whRGB('#5e5a3c'),mudw:whRGB('#5a7a6a'),ice:whRGB('#e8f4fc'),ice2:whRGB('#b9d8ee'),rvw:whRGB('#3d82c4'),rvl:whRGB('#6cb2e4'),rvb:whRGB('#7f9a5c'),rdk:whRGB('#5b4630'),
 plank:whRGB('#a87a4a'),plank2:whRGB('#8c6238'),rail:whRGB('#3b2a1a')};
// road dirt per terrain it crosses [fill, light middle]
const WHRD=[['#a87a4a','#c09466'],['#b89a68','#d2b88a'],['#8d6e48','#a8875c'],['#b39a64','#ccb584'],['#9a9488','#b4afa2'],['#7e6a48','#97825c'],['#c99d62','#ddb984'],['#a8a6a4','#c8c6c4']].map(r=>r.map(whRGB));

/* ---- noise and textures (seamless, period WAP art px) ---- */
function whNzS(a,x,y){x-=.5;y-=.5;const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,x0=ix&WAM,y0=iy&WAM,x1=(ix+1)&WAM,y1=(iy+1)&WAM,A=a[y0*WAP+x0],B=a[y0*WAP+x1],C=a[y1*WAP+x0],D=a[y1*WAP+x1];
 return A+(B-A)*fx+(C-A)*fy+(A-B-C+D)*fx*fy}
function whRamp(R,v,o,i){v=v<0?0:v>1?1:v;const a=v<.5?R[0]:R[1],b=v<.5?R[1]:R[2],t=v<.5?v*2:(v-.5)*2;o[i]=a[0]+(b[0]-a[0])*t;o[i+1]=a[1]+(b[1]-a[1])*t;o[i+2]=a[2]+(b[2]-a[2])*t}
function whTex(){if(WHA.tex)return WHA.tex;waInit();const n1=WHA.n1=waFbm(131,32),n2=WHA.n2=waFbm(149,16),n3=WHA.n3=waNoise(163,4),nA=waFbm(11,32),nB=waFbm(23,32);WHA.nz=WA.nz;
 const T=[],tmp=new Float32Array(3);
 for(let t=0;t<8;t++){const o=new Float32Array(WHTW*WHTW*3),R=WHG[t];
  for(let y=0;y<WHTW;y++)for(let x=0;x<WHTW;x++){const X=(x+.5)/WHTR,Y=(y+.5)/WHTR,a=whNzS(n1,X,Y),b=whNzS(n2,X,Y),c=whNzS(n3,X,Y),i=(y*WHTW+x)*3;
   let v=.5+(a-.5)*1.25+(b-.5)*.55+(c-.5)*.12;
   if(t===0){const s=whNzS(n2,X,Y*2+X*.15),w=whNzS(n3,X*.5+3,Y*2);v=.42+(a-.5)*.7+Math.max(0,(s-.62))*2.2+Math.max(0,w-.8)*1.2}
   else if(t===6){const A=whNzS(nA,X,Y),B=whNzS(nB,X,Y),u=(((Y+6*Math.sin(X*Math.PI/32)+(A-.5)*22)%16)+16)%16,on=B>.36?Math.min(1,(B-.36)*6):0;   // dunes: a lit crest, a soft lee shadow
    v=.56+(a-.5)*.5+(c-.5)*.08;if(on){if(u<1.1)v+=.4*on*(1-u/1.1);else if(u<4.6)v-=.32*on*Math.sin((u-1.1)/3.5*Math.PI)}}
   else if(t===7){const A=whNzS(nA,X,Y),B=whNzS(nB,X,Y),u=(((Y+5*Math.sin(X*Math.PI/32+2)+(B-.5)*26)%16)+16)%16,on=A>.56?Math.min(1,(A-.56)*6):0;   // snow drifts, blue in the hollows
    v=.62+(a-.5)*.45+(c-.5)*.06;if(on&&u>1&&u<3.6)v-=.38*on*Math.sin((u-1)/2.6*Math.PI)}
   else if(t===2){v=.45+(a-.5)*1.1+(b-.5)*.8+(c-.5)*.2}
   else if(t===5){const p=whNzS(n2,X+40,Y+17);v=.5+(a-.5)*1.2+(c-.5)*.15;if(p<.3)v-=.35*Math.min(1,(.3-p)*8)}
   whRamp(R,v,o,i)}
  T.push(o)}
 // marsh water pockets: the dark patches of the marsh texture lean blue-green
 {const o=T[5],w=whRGB('#4d6e64');for(let y=0;y<WHTW;y++)for(let x=0;x<WHTW;x++){const X=(x+.5)/WHTR,Y=(y+.5)/WHTR,p=whNzS(n2,X+40,Y+17),i=(y*WHTW+x)*3;if(p<.27){const k=Math.min(1,(.27-p)*14)*.8;for(let j=0;j<3;j++)o[i+j]+=(w[j]-o[i+j])*k}}}
 WHA.tex=T;return T}

/* ---- the tile shader ---- */
const WHS={T9:new Uint8Array(9),seg:new Float32Array(9*80*8),sn:0,rseg:new Float32Array(9*80*8),rn:0,wv:new Float32Array(4),ty:new Uint8Array(4),c:new Float32Array(3),c2:new Float32Array(3),nb:[0,0,0,0,0,0,0,0]};
function whTile(c,r){return c<0||r<0||c>=WN||r>=WN?0:W.tiles[r*WN+c]}
function whNb(c,r){const n=WHS.nb;n[0]=whTile(c,r-1);n[1]=whTile(c+1,r-1);n[2]=whTile(c+1,r);n[3]=whTile(c+1,r+1);n[4]=whTile(c,r+1);n[5]=whTile(c-1,r+1);n[6]=whTile(c-1,r);n[7]=whTile(c-1,r-1);return n}
// the path segments (river: kind 1, road: kind 2) of the 3x3 tiles around (c,r) that reach into it, in its local art px
function whSegs(c,r,kind,out){let n=0;const M=kind===1?W.river:W.road;if(!M)return 0;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const cc=c+dx,rr=r+dy;if(cc<0||rr<0||cc>=WN||rr>=WN)continue;const m=M[rr*WN+cc]&15;if(!m)continue;
  const S=kind===1?waSegs(m,cc,rr,40,3,1.9,whNb(cc,rr),1):waSegs(m,cc,rr,60,2,1.5,whNb(cc,rr),2),ox=dx*16,oy=dy*16;
  for(let q=0;q<S.length;q+=8){if(S[q+5]===3&&(dx||dy))continue;const x0=S[q]+ox,y0=S[q+1]+oy,x1=S[q+2]+ox,y1=S[q+3]+oy,w=Math.max(S[q+6],S[q+7])+2;
   if(Math.max(x0,x1)<-w||Math.min(x0,x1)>16+w||Math.max(y0,y1)<-w||Math.min(y0,y1)>16+w)continue;if(n>=out.length/8)break;const o=n*8;out[o]=x0;out[o+1]=y0;out[o+2]=x1;out[o+3]=y1;out[o+4]=S[q+4];out[o+5]=S[q+5];out[o+6]=S[q+6];out[o+7]=S[q+7];n++}}
 return n}
function whTexAt(t,X,Y,o){const T=WHA.tex[t];let x=X*WHTR-.5,y=Y*WHTR-.5;const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,x0=ix&WHTM,y0=iy&WHTM,x1=(ix+1)&WHTM,y1=(iy+1)&WHTM,
  a=(y0*WHTW+x0)*3,b=(y0*WHTW+x1)*3,c=(y1*WHTW+x0)*3,d=(y1*WHTW+x1)*3,w0=(1-fx)*(1-fy),w1=fx*(1-fy),w2=(1-fx)*fy,w3=fx*fy;
 o[0]=T[a]*w0+T[b]*w1+T[c]*w2+T[d]*w3;o[1]=T[a+1]*w0+T[b+1]*w1+T[c+1]*w2+T[d+1]*w3;o[2]=T[a+2]*w0+T[b+2]*w1+T[c+2]*w2+T[d+2]*w3}
function whMix(o,c,a){if(a<=0)return;if(a>=1){o[0]=c[0];o[1]=c[1];o[2]=c[2];return}o[0]+=(c[0]-o[0])*a;o[1]+=(c[1]-o[1])*a;o[2]+=(c[2]-o[2])*a}
function whCov(x,K){x=x*K+.5;return x<0?0:x>1?1:x}
// fills img32 (16K x 16K, row stride 16K) with tile (tx,ty) at K device px an art px
function whShadeTile(img32,tx,ty,K){whTex();const N=16*K,T9=WHS.T9,NZ=WHA.nz,o=WHS.c,o2=WHS.c2,WV4=WHS.wv,TY=WHS.ty;
 for(let j=0;j<3;j++)for(let i=0;i<3;i++)T9[j*3+i]=whTile(tx-1+i,ty-1+j);
 let uni=true;for(let i=0;i<9;i++)if(T9[i]!==T9[4]){uni=false;break}
 const t=T9[4],rv=W.river?W.river[ty*WN+tx]&15:0,rd=W.road?W.road[ty*WN+tx]&15:0;
 let rn=0,sn=0;const RS=WHS.rseg,SS=WHS.seg;
 // rivers and roads of this tile and its neighbours (an arm of the next tile can reach over the edge)
 {let anyR=false,anyD=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const c=tx+dx,r=ty+dy;if(c<0||r<0||c>=WN||r>=WN)continue;if(W.river&&W.river[r*WN+c])anyR=true;if(W.road&&W.road[r*WN+c])anyD=true}
  if(anyR)rn=whSegs(tx,ty,1,RS);if(anyD)sn=whSegs(tx,ty,2,SS)}
 const bx=tx*16,by=ty*16,inv=1/K;
 for(let j=0;j<N;j++){const ly=(j+.5)*inv,Y=by+ly,v=ly/16-.5,r0=v<0?0:1,wy=v<0?v+1:v;
  for(let i=0;i<N;i++){const lx=(i+.5)*inv,X=bx+lx;let best=t,sec=255,d=99;
   if(!uni){const u=lx/16-.5,c0=u<0?0:1,wx=u<0?u+1:u,a=T9[r0*3+c0],b=T9[r0*3+c0+1],c=T9[(r0+1)*3+c0],e=T9[(r0+1)*3+c0+1];
    if(a===b&&a===c&&a===e)best=a;
    else{let n=0;const add=(tt,w)=>{for(let k=0;k<n;k++)if(TY[k]===tt){WV4[k]+=w;return}TY[n]=tt;WV4[n]=w;n++};
     add(a,(1-wx)*(1-wy));add(b,wx*(1-wy));add(c,(1-wx)*wy);add(e,wx*wy);let bs=-9,ss=-9;
     for(let k=0;k<n;k++){const tt=TY[k],w=WV4[k],sc=w+(whNzS(NZ,X+tt*41,Y+tt*23)-.5)*.62*(w<.2?w*5:1);if(sc>bs){sec=best;ss=bs;best=tt;bs=sc}else if(sc>ss){sec=tt;ss=sc}}
     d=(bs-ss)*8}}
   whTexAt(best,X,Y,o);
   if(d<8&&sec!==255){
    if(best!==0&&sec!==0){if(d<1.8){whTexAt(sec,X,Y,o2);const z=1-d/1.8;whMix(o,o2,.5*z*z*(3-2*z))}}   // land to land: a soft painted blend
    else if(best===0){   // water near land: shallows, foam, the ink coastline
     if(sec===5){whMix(o,WHC.mudw,clamp(1-(d-.4)/2.2,0,1)*.85)}
     else{whMix(o,WHC.shal,clamp(1-(d-1)/3.2,0,1)*.9);whMix(o,WHC.shal2,clamp(1-(d-.8)/1.3,0,1)*.7);
      const fo=whNzS(WHA.n3,X*2,Y*2);whMix(o,WHC.foam,whCov(.95+fo*.5-d,K)*.92);whMix(o,WHC.ink,whCov(.32-d,K))}}
    else{   // land near water: beach, cliff, mud, ice, then the ink line
     if(best===4){whMix(o,WHC.cliff2,whCov(2-d,K));whMix(o,WHC.cliff,whCov(1.1-d,K))}
     else if(best===5){whMix(o,WHC.mud,clamp(1-(d-.6)/1.6,0,1)*.9)}
     else if(best===7){whMix(o,WHC.ice2,whCov(1.6-d,K)*.8);whMix(o,WHC.ice,whCov(1.1-d,K))}
     else if(best!==2){const B=best===1?2.4:best===6?3:best===3?2:1.4;whMix(o,WHC.sand,clamp((B+.8-d)/1.2,0,1));whMix(o,WHC.wsand,whCov(.75-d,K)*.8)}
     else{whMix(o,WHC.sand,whCov(1.2-d,K))}
     if(best!==5)whMix(o,WHC.ink,whCov(.32-d,K))}}
   // a river: ink edge, bank, water, a lighter middle (only over land: it ends at the coast)
   let wet=best===0;
   if(rn){let bd=1e9,bw=1.9;for(let q=0;q<rn*8;q+=8){const x0=RS[q],y0=RS[q+1],dx=RS[q+2]-x0,dy=RS[q+3]-y0,l2=dx*dx+dy*dy;let uu=l2>0?((lx-x0)*dx+(ly-y0)*dy)/l2:0;uu=uu<0?0:uu>1?1:uu;const ex=x0+dx*uu-lx,ey=y0+dy*uu-ly,dd=ex*ex+ey*ey;if(dd<bd){bd=dd;bw=RS[q+6]+(RS[q+7]-RS[q+6])*uu}}
    const dr=Math.sqrt(bd);if(dr<bw+1.2){if(best!==0){whMix(o,WHC.ink,whCov(bw+.7-dr,K));whMix(o,WHC.rvb,whCov(bw+.35-dr,K));whMix(o,WHC.rvw,whCov(bw-.15-dr,K));whMix(o,WHC.rvl,whCov(bw-1.15-dr,K)*.55)}
     else if(d<1.4){whTexAt(0,X,Y,o2);o2[0]=WHC.shal[0];o2[1]=WHC.shal[1];o2[2]=WHC.shal[2];whMix(o,o2,whCov(bw+.3-dr,K)*.9)}   // the mouth: shallows, no coastline across it
     if(dr<bw)wet=true}}
   // a road: a soft dark edge, the dirt of the ground, a lighter middle; planks and rails over water
   if(sn){let bd=1e9,bs2=0;for(let q=0;q<sn*8;q+=8){const x0=SS[q],y0=SS[q+1],dx=SS[q+2]-x0,dy=SS[q+3]-y0,l2=dx*dx+dy*dy;let uu=l2>0?((lx-x0)*dx+(ly-y0)*dy)/l2:0;uu=uu<0?0:uu>1?1:uu;const ex=x0+dx*uu-lx,ey=y0+dy*uu-ly,dd=ex*ex+ey*ey;if(dd<bd){bd=dd;bs2=SS[q+4]+SS[q+5]*uu}}
    const dd=Math.sqrt(bd);if(dd<2.6){if(wet){whMix(o,WHC.rail,whCov(1.95-dd,K));whMix(o,(Math.floor(bs2*1.4)&1)?WHC.plank:WHC.plank2,whCov(1.45-dd,K));whMix(o,WHC.rail,whCov(.22-Math.abs(dd-1.15),K)*.9)}
     else{const R=WHRD[best];whMix(o,WHC.rdk,whCov(1.85-dd,K)*.55);whMix(o,R[0],whCov(1.45-dd,K));whMix(o,R[1],whCov(.7-dd,K)*.6)}}}
   img32[j*N+i]=(255<<24|(o[2]<0?0:o[2]>255?255:o[2])<<16|(o[1]<0?0:o[1]>255?255:o[1])<<8|(o[0]<0?0:o[0]>255?255:o[0]))>>>0}}}

/* ---- the tall layer: where things stand (the Low art's own rules, waTallBuild) ---- */
const WHIV={round:5,dark:4,small:3,pine:3,spine:3,bush:3,dead:2,swtree:2,cactus:2,spire:2,boulder:2,sboulder:1};
function whTallItems(c,r,out){const t=whTile(c,r),n=whNb(c,r).slice(),i0=r*WN+c,river=W.river?W.river[i0]&15:0,road=W.road?W.road[i0]&15:0,c7=c&7,r7=r&7;
 waClass(t,n,c,r);if(river||road)waPaths(t,n,c,r,river,road);const cl=WA.cl,D=WA.d,bx=c*16,by=r*16;
 const H=(i,sx)=>waHash(c7*16+i,r7*16+(sx|0),500+i),pk=(k,h)=>[k,(h*WHIV[k])|0];
 if(t===4){let de=0,sn=0;for(let i=0;i<8;i++){if(n[i]===6)de++;else if(n[i]===7)sn++}const st=de>=3?1:sn>=3?2:0,h=H(40),big=n[0]===4||n[4]===4||n[2]===4||n[6]===4;
  out.push({k:'peak',v:st*9+(big?(h*6)|0:3+((h*3)|0)),x:bx+8+Math.round((H(41)-.5)*5),y:by+15});
  if(H(42)<.4)out.push({k:'peak',v:st*9+6+((H(43)*3)|0),x:bx+(H(44)<.5?2:13),y:by+15.5})}
 for(let gq=0;gq<4;gq++){const ax=clamp(4+(gq&1)*8+Math.round((H(gq)-.5)*5),0,15),ay=clamp(7+(gq>>1)*8+Math.round((H(gq+4)-.5)*4)-1,0,15),k=ay*16+ax,b=cl[k],d=D[k],h=H(gq+8),h2=H(gq+12);
  if(b===0||b===4||d<1.1)continue;
  if(road){if(WA.rd[k]<4.2||WA.rd[Math.max(0,ay-5)*16+ax]<3.2)continue}if(river){if(WA.rv[k]-WA.rw[k]<3.2||WA.rv[Math.max(0,ay-5)*16+ax]-WA.rw[k]<2.4)continue}
  let sp=null;
  if(b===2){const cold=n.indexOf(7)>=0||t===7,pine=cold?h2<.75:WA.nz[((r7*16+ay)*WAP+c7*16+ax+3000)%(WAP*WAP)]>.68?h2<.8:h2<.06;
   if(d<3.2&&h<.5)sp=h<.22?null:pk('bush',h2);else if(h<.05)sp=pk('small',h2);else sp=pine?pk(cold?'spine':'pine',h):h2>.55?pk('dark',h):pk('round',h)}
  else if(b===7){if(h<.13)sp=pk('spine',h2);else if(h<.16)sp=['sboulder',0]}
  else if(b===5){if(h<.12)sp=pk('dead',h2);else if(h<.3)sp=pk('swtree',h2)}
  else if(b===1){const gr=WA.nz[((r7*16+ay)*WAP+c7*16+ax+7000)%(WAP*WAP)];if(gr>.6){if(h<.07)sp=pk('round',h2);else if(h<.13)sp=pk('small',h2);else if(h<.2)sp=pk('bush',h2)}else if(h<.012)sp=pk('bush',h2)}
  else if(b===3){if(h<.05)sp=pk('small',h2);else if(h<.1)sp=pk('boulder',h2);else if(h<.13)sp=pk('pine',h2)}
  else if(b===6){if(h<.05)sp=pk('cactus',h2);else if(h<.085)sp=pk('spire',h2)}
  if(sp)out.push({k:sp[0],v:sp[1],x:bx+ax+.5,y:by+ay+.5})}
 return out}

/* ---- painting kit: shapes in art px on a context scaled to K device px an art px ---- */
const WHR={leaf:['#163a1c','#2a6a2e','#4a9a3a','#7cc44c','#caf08c'],leaf2:['#0f2a1a','#1d4e2c','#2f6c38','#4a8c46','#9cc882'],leafS:['#162c22','#2a5a3a','#3f7f4e','#5fa062','#b4dca4'],
 pine:['#0b2820','#184a34','#2a6a48','#468c5e','#9ad0a0'],swamp:['#1f2a16','#3b5026','#566c32','#778e42','#bcd088'],dry:['#3a2a10','#6a5226','#8f7438','#b49a54','#e2d098'],
 cactus:['#10321a','#24602e','#3a8638','#62ac4c','#bce69a'],sand:['#4a2a10','#965828','#c88848','#e6ae6c','#fde0b0'],rock:['#1e2226','#4a5056','#7a8086','#a8aeb2','#e0e4e6'],
 wood:['#22140a','#4e311a','#7a5030','#a47448','#d8b080'],snow:['#5a7088','#a8bccf','#dbe6f0','#f4f8fc','#ffffff'],bark:['#1a1008','#3c2614','#5e3e22','#805a36','#b08a60']};
function whPU(g,K,fn){const u=PK.u,lw=PK.lw;PK.u=K;try{fn()}finally{PK.u=u;PK.lw=lw}}
function whFill(g,S,M,o){o=o||{};pkFill(g,S,M,{lw:o.lw==null?.5:o.lw,k:o.k||.5,ink:o.ink||WHINK,noRim:o.noRim,noShade:o.noShade,ball:o.ball,inside:o.inside,flat:o.flat})}
function whBlob(L){const p=new Path2D(),b=[1e9,1e9,-1e9,-1e9];for(const l of L){const rx=l[2],ry=l[3]||l[2];p.moveTo(l[0]+rx,l[1]);p.ellipse(l[0],l[1],rx,ry,0,0,Math.PI*2);b[0]=Math.min(b[0],l[0]-rx);b[1]=Math.min(b[1],l[1]-ry);b[2]=Math.max(b[2],l[0]+rx);b[3]=Math.max(b[3],l[1]+ry)}return{p,b,u:1}}
function whEllS(x,y,rx,ry){return pkEll(x,y,rx,ry)}
function whPolyS(a){return pkPoly(a)}
function whLine(g,pts,w,col,a){g.save();g.globalAlpha=a==null?1:a;g.lineCap='round';g.lineJoin='round';g.lineWidth=w;g.strokeStyle=col;g.beginPath();g.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)g.lineTo(pts[i],pts[i+1]);g.stroke();g.restore()}
function whDot(g,x,y,r,col,a){g.globalAlpha=a==null?1:a;g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();g.globalAlpha=1}
function whShadowE(g,x,y,rx,ry,a){g.save();g.globalAlpha=a==null?.25:a;g.fillStyle='#0a1014';g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();g.restore()}
// a sprite painted at K: box (w,h, anchor ax,ay) in art px; paint(g) draws with (0,0) at the anchor
function whMake(w,h,ax,ay,K,paint){const c=pxCanvas(Math.max(1,Math.ceil(w*K)),Math.max(1,Math.ceil(h*K))),g=c.getContext('2d');g.setTransform(K,0,0,K,ax*K,ay*K);g.lineJoin='round';g.lineCap='round';
 whPU(g,K,()=>paint(g));return{c,w,h,ax,ay,x0:-ax,y0:-ay,x1:w-ax,y1:h-ay,tc:null,tq:null,tk:'',lit:null,raw:false,k:K,hd:true}}

/* ---- tall things ---- */
function whTree(g,seed,rx,ry,trunk,M){const R=waRng(seed),cy=-trunk-ry+.6;whShadowE(g,1,.2,rx*.85,1.3,.24);
 whFill(g,pkRect(-.75,-trunk-1.2,1.5,trunk+1.4,.4),WHR.bark,{k:.3,lw:.45});
 const L=[[0,cy,rx,ry],[-rx*.5,cy+ry*.35,rx*.6,ry*.6],[rx*.5,cy+ry*.4,rx*.62,ry*.58],[(R()-.5)*rx*.5,cy-ry*.35,rx*.62,ry*.6]];
 whFill(g,whBlob(L),M,{k:.55,lw:.55,inside:(g,m)=>{for(let i=0;i<3;i++){const a=R()*6.28,d=R()*rx*.45;whDot(g,-rx*.25+Math.cos(a)*d*.6,cy-ry*.25+Math.sin(a)*d*.5,.8+R()*.6,m[3],.55)}whDot(g,-rx*.35,cy-ry*.4,.7,m[4],.5)}})}
function whPine(g,seed,H,M,snow){const R=waRng(seed),tiers=3,w0=4.6+R()*.6;whShadowE(g,1,.1,w0*.8,1.2,.24);
 whFill(g,pkRect(-.6,-1.6,1.2,1.8,.3),WHR.bark,{k:.3,lw:.45});
 for(let t=0;t<tiers;t++){const top=-H+t*H*.27,bot=-1.2-(tiers-1-t)*H*.2,hw=w0*(.55+t*.24),pts=[0,top,hw*.55,top+(bot-top)*.55,hw,bot,hw*.35,bot-.6,0,bot-.2,-hw*.35,bot-.6,-hw,bot,-hw*.55,top+(bot-top)*.55];
  whFill(g,whPolyS(pts),M,{k:.45,lw:.5,inside:snow?(g,m)=>{g.fillStyle='#f4f8fc';g.beginPath();g.moveTo(0,top-.5);g.lineTo(hw*.5,top+(bot-top)*.5);g.quadraticCurveTo(0,top+(bot-top)*.75,-hw*.62,top+(bot-top)*.56);g.closePath();g.fill();g.fillStyle='#c8d8e8';g.globalAlpha=.8;g.beginPath();g.moveTo(hw*.5,top+(bot-top)*.5);g.lineTo(hw*.9,bot-.3);g.lineTo(hw*.3,bot-.8);g.closePath();g.fill();g.globalAlpha=1}:null})}}
function whBush(g,seed,s,M){const R=waRng(seed);whFill(g,whBlob([[0,-s*.9,s*1.3,s*.95],[-s*.9,-s*.55,s*.8,s*.65],[s*.9,-s*.5,s*.75,s*.6]]),M,{k:.4,lw:.5,inside:(g,m)=>{whDot(g,-s*.4,-s*1.3,s*.45,m[3],.6);if(R()<.5)whDot(g,s*.5,-s*.7,.45,'#e86a8a',.9)}})}
function whDead(g,seed){const R=waRng(seed),br=[[0,0,0,-7],[0,-4,-2.6,-6.6],[0,-5,2.4,-8],[0,-2.6,2.2,-4.2],[-1.4,-5.6,-2.8,-8.4]];
 for(const b of br)whLine(g,b,1.5,WHINK);for(const b of br)whLine(g,b,b[0]===0&&b[1]===0?1:.6,'#7a5a3a');whLine(g,[-.3,-1,-.3,-5],.35,'#a8865e',.7);void R}
function whSwamp(g,seed){const R=waRng(seed);whFill(g,pkRect(-.7,-4,1.4,4.2,.3),WHR.bark,{k:.3,lw:.45});
 whFill(g,whBlob([[0,-7,4.2,2.9],[-2.6,-6,2.4,2.2],[2.6,-6,2.4,2.1]]),WHR.swamp,{k:.45,lw:.5,inside:(g,m)=>{for(let i=-3;i<=3;i+=1.5){const l=1.5+R()*1.8;whLine(g,[i,-5.4,i+.2,-5.4+l],.6,m[1],.9)}whDot(g,-1.5,-8,.9,m[3],.6)}})}
function whCactus(g,v){const M=WHR.cactus,arm=(x,y,w,h,dir)=>pkRect(x,y,w,h,w/2);
 const S=v?pkU(pkRect(-1.1,-6.5,2.2,6.7,1.1),pkRect(-3,-4.2,1.6,2.6,.8),pkRect(-3,-3,2.5,1.4,.7)):pkU(pkRect(-1.2,-9,2.4,9.2,1.2),pkRect(-3.6,-6.4,1.7,3.6,.85),pkRect(-3.6,-4,3,1.5,.75),pkRect(2,-7.6,1.7,3.4,.85),pkRect(1,-5.4,2.7,1.5,.75));
 whFill(g,S,M,{k:.4,lw:.5,inside:(g,m)=>{whLine(g,[-.35,v?-6:-8.4,-.35,-.6],.3,m[1],.8);whLine(g,[.45,v?-6:-8.4,.45,-.6],.3,m[3],.6);whDot(g,0,v?-6.4:-8.9,.45,'#f07aa0',.95)}});void arm}
function whSpire(g,v){const S=v?whPolyS([-2.6,0,-2,-3.4,-.6,-4.6,1,-4,2.3,-2.6,2.8,0]):whPolyS([-3,0,-2.4,-4.6,-1.4,-7.2,.2,-8,1.6,-6.8,2.4,-4,3.2,0]);
 whFill(g,S,WHR.sand,{k:.55,lw:.55,inside:(g,m)=>{whLine(g,[-2.6,-2,2.6,-2.4],.35,m[1],.6);if(!v)whLine(g,[-2,-4.8,2,-5.2],.35,m[1],.6)}})}
function whBoulder(g,v,snow){const S=v?whBlob([[0,-1.6,2.4,1.7],[1.4,-1,1.4,1.1]]):whBlob([[0,-2.2,3.2,2.3],[-1.6,-1.2,2,1.4],[2,-1.2,1.8,1.3]]);
 whFill(g,S,WHR.rock,{k:.5,lw:.5,inside:snow?(g)=>{g.fillStyle='#f4f8fc';g.beginPath();g.ellipse(-.4,-3.9,2.8,1.3,0,0,Math.PI*2);g.fill()}:null})}
// a peak: jagged silhouette, lit west face, shaded east face, a snow cap with a ragged hem, ink all round but the foot
const WHPK=[{l:'#b4b0a6',m:'#918d82',d:'#625e58',dd:'#46423f',s:'#f6f9fc',ss:'#c4d4e4'},{l:'#e6b27a',m:'#c68a52',d:'#93603a',dd:'#6a4026',s:'#f8ead0',ss:'#e0c49a'},{l:'#c6ccd2',m:'#9aa2aa',d:'#6c737c',dd:'#4c525a',s:'#f8fbfe',ss:'#c8d8ea'}];
function whPeakDims(v){const st=(v/9)|0,i=v%9;return i<6?{st,W:24+(i%3)*2+2,H:17+((i*5)%6)+2}:{st,W:14+(i-6)*2+1,H:9+(i-6)*2+1}}
function whPeak(g,v){const D=whPeakDims(v),st=D.st,C=WHPK[st],R=waRng(300+v*7),W=D.W,H=D.H,ax=(R()-.5)*W*.22,xl=-W/2,xr=W/2,snowF=st===2?.62:st===1?.16:.34+R()*.1;
 const left=[],right=[];let jl=0,jr=0;const n=8;
 for(let i=0;i<=n;i++){const t=i/n,e=Math.pow(t,1.05);jl=i>1&&i<n?clamp(jl+(R()-.5)*1.4,-1.2,1.2):0;jr=i>1&&i<n?clamp(jr+(R()-.5)*1.4,-1.2,1.2):0;
  left.push(ax-(ax-xl)*e+jl*.6,-H+H*t+(i>0&&i<n?(R()-.5)*1.2:0));right.push(ax+(xr-ax)*e+jr*.6,-H+H*t+(i>0&&i<n?(R()-.5)*1.2:0))}
 // a shoulder on one side for the big ones
 if(H>14){const sd=R()<.5?left:right,k=4+((R()*2)|0);sd[k*2+1]-=1.6+R()*1.4}
 const sil=[];for(let i=left.length-2;i>=0;i-=2)sil.push(left[i],left[i+1]);for(let i=2;i<right.length;i+=2)sil.push(right[i],right[i+1]);
 const P=new Path2D();P.moveTo(sil[0],sil[1]);for(let i=2;i<sil.length;i+=2)P.lineTo(sil[i],sil[i+1]);P.closePath();
 g.save();g.clip(P);
 let gr=g.createLinearGradient(xl,-H,xr,0);gr.addColorStop(0,C.m);gr.addColorStop(1,C.dd);g.fillStyle=gr;g.fillRect(xl-2,-H-2,W+4,H+4);
 // the lit face: west of a wandering ridge from the summit to the foot
 const ridge=[ax,-H];for(let i=1;i<=6;i++){const t=i/6;ridge.push(ax+t*W*.14+(R()-.5)*1.1,-H+H*t)}
 g.beginPath();g.moveTo(xl-3,2);for(let i=ridge.length-2;i>=0;i-=2)g.lineTo(ridge[i],ridge[i+1]);g.lineTo(xl-3,-H-3);g.closePath();gr=g.createLinearGradient(xl,-H,ax,0);gr.addColorStop(0,C.l);gr.addColorStop(1,C.m);g.fillStyle=gr;g.fill();
 // creases
 g.globalAlpha=.35;g.strokeStyle=C.dd;g.lineWidth=.35;for(let i=0;i<4;i++){const x=xl+W*(.15+R()*.3),y=-H*(.2+R()*.5);g.beginPath();g.moveTo(x,y);g.lineTo(x+1.2+R(),y+2.4+R()*2);g.stroke()}
 g.strokeStyle=C.l;g.globalAlpha=.4;for(let i=0;i<3;i++){const x=ax+W*(.1+R()*.25),y=-H*(.25+R()*.45);g.beginPath();g.moveTo(x,y);g.lineTo(x+1.4,y+2.6);g.stroke()}g.globalAlpha=1;
 // the snow cap
 const sy=-H+H*snowF;if(snowF>.1){g.beginPath();g.moveTo(xl-3,-H-3);g.lineTo(xr+3,-H-3);let x=xr+1;g.lineTo(x,sy);const st2=W/9;for(;x>xl-1;x-=st2){g.lineTo(x-st2*.5,sy+(R()*1.6+.6)*(x>ridge[2]?1.3:1));g.lineTo(x-st2,sy-(R()*1.1))}g.closePath();
  g.fillStyle=C.ss;g.fill();g.save();g.clip();g.beginPath();g.moveTo(xl-3,2);for(let i=ridge.length-2;i>=0;i-=2)g.lineTo(ridge[i],ridge[i+1]);g.lineTo(xl-3,-H-3);g.closePath();g.fillStyle=C.s;g.fill();g.restore()}
 // the foot fades into the scree
 gr=g.createLinearGradient(0,-3,0,.5);gr.addColorStop(0,'rgba(60,56,52,0)');gr.addColorStop(1,'rgba(60,56,52,.45)');g.fillStyle=gr;g.fillRect(xl-2,-3,W+4,4);
 g.restore();
 g.strokeStyle=WHINK;g.lineWidth=.55;g.lineJoin='round';g.beginPath();g.moveTo(sil[0],sil[1]-.2);for(let i=2;i<sil.length;i+=2)g.lineTo(sil[i],sil[i+1]-(i===sil.length-2?.2:0));g.stroke();
 g.globalAlpha=.55;g.lineWidth=.35;g.beginPath();g.moveTo(ridge[0],ridge[1]);for(let i=2;i<ridge.length-4;i+=2)g.lineTo(ridge[i],ridge[i+1]);g.stroke();g.globalAlpha=1}
const WHIB={round:[14,14,7,13],dark:[14,14,7,13],small:[10,11,5,10],pine:[12,17,6,16],spine:[12,17,6,16],bush:[8,6,4,5],dead:[9,10,4.5,9],swtree:[11,12,5.5,11],cactus:[9,11,4.5,10],spire:[8,10,4,9],boulder:[8,6,4,5],sboulder:[8,6,4,5]};
function whItemSpr(k,v,K){const key=k+v+'@'+K;let e=WHA.spr.get(key);if(e)return e;
 if(k==='peak'){const D=whPeakDims(v);e=whMake(D.W+3,D.H+3,D.W/2+1.5,D.H+1.5,K,g=>whPeak(g,v));e.y1=.5}
 else{const B=WHIB[k]||[10,10,5,9];e=whMake(B[0],B[1],B[2],B[3],K,g=>{const s=v*31+7;
   if(k==='round')whTree(g,100+v,4.4+(v%3)*.5,3.9+(v%2)*.5,2,v%2?WHR.leafS:WHR.leaf);
   else if(k==='dark')whTree(g,140+v,4.2+(v%2)*.6,3.8+(v%3)*.4,2,WHR.leaf2);
   else if(k==='small')whTree(g,170+v,3,2.8,1.3,v===2?WHR.leaf2:WHR.leaf);
   else if(k==='pine')whPine(g,200+v,11+v,WHR.pine,false);
   else if(k==='spine')whPine(g,220+v,10.5+v,WHR.pine,true);
   else if(k==='bush')whBush(g,s,1.6+(v%2)*.3,v===2?WHR.leaf2:WHR.leaf);
   else if(k==='dead')whDead(g,s);
   else if(k==='swtree')whSwamp(g,s);
   else if(k==='cactus')whCactus(g,v);
   else if(k==='spire')whSpire(g,v);
   else if(k==='boulder')whBoulder(g,v,false);
   else if(k==='sboulder')whBoulder(g,0,true)})}
 if(WHA.spr.size>400)WHA.spr.clear();WHA.spr.set(key,e);return e}

/* ---- ground details (flat: drawn before the tall layer) ---- */
const WHDSET=[null,{n:4,l:[['tuft',.42],['flower',.2],['rock',.05]]},{n:2,l:[['shroom',.12],['tuft',.2]]},{n:4,l:[['mound',.42],['mound',.25],['rock',.08],['tuft',.12]]},{n:3,l:[['scree',.7]]},
 {n:4,l:[['pool',.3],['reed',.32],['lily',.08],['log',.05]]},{n:2,l:[['drock',.14],['bones',.04],['dbush',.14]]},{n:3,l:[['ice',.06],['srock',.08],['stuft',.14]]}];
const WHFLC=['#ffffff','#ffd84a','#e8506a','#a06ae8','#ff9a3a'];
function whDeco(g,kind,x,y,h){const R=waRng((h*1e6)|0);
 if(kind==='tuft'){const c1='#4f8a34',c2='#a8d06a';for(let i=-1;i<=1;i++){whLine(g,[x+i*.5,y,x+i*1.1,y-1.6-(i?0:.6)],.45,c1,.95);whLine(g,[x+i*1.0,y-1.2-(i?0:.6),x+i*1.1,y-1.6-(i?0:.6)],.35,c2,.8)}}
 else if(kind==='stuft'){for(let i=-1;i<=1;i++)whLine(g,[x+i*.5,y,x+i*1.1,y-1.4-(i?0:.5)],.4,'#8a9a6a',.9)}
 else if(kind==='flower'){const c=WHFLC[(R()*WHFLC.length)|0];for(let i=0;i<3;i++){const a=R()*6.28,d=.6+R()*1.2,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*.6;whDot(g,px,py+.35,.5,'#3e6e2a',.7);whDot(g,px,py,.48,c);whDot(g,px,py,.18,'#fff4b0')}}
 else if(kind==='rock'||kind==='drock'||kind==='srock'){const M=kind==='drock'?WHR.sand:WHR.rock,s=.9+R()*.6;whFill(g,whBlob([[x,y-s*.6,s*1.3,s*.9]]),M,{k:.3,lw:.4,inside:kind==='srock'?(g)=>whDot(g,x-.2,y-s*1.3,s*1.1,'#f4f8fc'):null})}
 else if(kind==='scree'){for(let i=0;i<4;i++){const px=x+(R()-.5)*4,py=y+(R()-.5)*2.4,s=.4+R()*.5;whDot(g,px+.15,py+.2,s,'#4a4744',.8);whDot(g,px,py,s,i&1?'#b0aca2':'#9a958a')}}
 else if(kind==='shroom'){whLine(g,[x,y,x,y-1],.5,'#efe2c8');g.fillStyle='#c4392f';g.beginPath();g.ellipse(x,y-1.1,1,.65,0,Math.PI,0);g.fill();whDot(g,x-.3,y-1.4,.18,'#fff')}
 else if(kind==='mound'){const w=3.5+R()*2.5,hh=1.6+R()*1.2,P=new Path2D();P.moveTo(x-w,y);P.bezierCurveTo(x-w*.6,y-hh*1.35,x+w*.5,y-hh*1.35,x+w,y);P.closePath();
  const gr=g.createLinearGradient(x-w*.5,y-hh,x+w*.6,y);gr.addColorStop(0,'#c8cc7c');gr.addColorStop(.5,'#a3ad58');gr.addColorStop(1,'#7c8a40');g.fillStyle=gr;g.fill(P);
  g.strokeStyle='#4a5524';g.globalAlpha=.85;g.lineWidth=.42;g.beginPath();g.moveTo(x-w,y);g.bezierCurveTo(x-w*.6,y-hh*1.35,x+w*.5,y-hh*1.35,x+w,y);g.stroke();g.globalAlpha=1;
  for(let i=0;i<2;i++)whLine(g,[x-w*.3+i*1.5,y-hh*.6,x-w*.3+i*1.5+.4,y-hh*.9],.3,'#e0e4a0',.6)}
 else if(kind==='pool'){const w=2.2+R()*1.6,hh=1.1+R()*.6;g.fillStyle='#3e5a34';g.beginPath();g.ellipse(x,y,w+.5,hh+.45,0,0,Math.PI*2);g.fill();g.fillStyle='#4c7a86';g.beginPath();g.ellipse(x,y,w,hh,0,0,Math.PI*2);g.fill();
  g.fillStyle='#8cc0c8';g.globalAlpha=.6;g.beginPath();g.ellipse(x-w*.35,y-hh*.35,w*.35,hh*.25,0,0,Math.PI*2);g.fill();g.globalAlpha=1;if(R()<.5)whDot(g,x+w*.4,y+hh*.1,.6,'#5ea04a')}
 else if(kind==='reed'){for(let i=0;i<3;i++){const px=x+(i-1)*.9,hh=2.2+R()*1.2;whLine(g,[px,y,px+(R()-.5)*.6,y-hh],.35,'#5a6a2a');g.fillStyle='#6a4024';g.beginPath();g.ellipse(px+(R()-.5)*.3,y-hh+.2,.35,.7,0,0,Math.PI*2);g.fill()}}
 else if(kind==='lily'){whDot(g,x,y,1,'#4e8a3a');whDot(g,x-.25,y-.2,.75,'#6eaa48');if(R()<.6)whDot(g,x+.3,y-.3,.35,'#f4a0c0')}
 else if(kind==='log'){whFill(g,pkRect(x-2.2,y-1,4.4,1.3,.6),WHR.wood,{k:.25,lw:.35})}
 else if(kind==='bones'){whLine(g,[x-1.2,y,x+1.2,y-.4],.45,'#efe8d4');whLine(g,[x-.4,y-1,x+.2,y+.3],.4,'#e2dac4');whDot(g,x+1.4,y-.5,.45,'#f4eedc')}
 else if(kind==='dbush'){for(let i=0;i<5;i++){const a=-Math.PI*(.15+i*.17);whLine(g,[x,y,x+Math.cos(a)*1.8,y+Math.sin(a)*1.6],.3,'#8a6a3a',.95)}}
 else if(kind==='ice'){g.fillStyle='#b8d6ec';g.beginPath();g.ellipse(x,y,2.6,1.1,0,0,Math.PI*2);g.fill();g.fillStyle='#eef8ff';g.beginPath();g.ellipse(x-.5,y-.25,1.6,.5,0,0,Math.PI*2);g.fill()}}
// the ground details of tile (c,r), in its quad's context (art px)
function whTileDeco(g,c,r){const t=whTile(c,r),set=WHDSET[t];if(!set)return;const n=whNb(c,r).slice(),i0=r*WN+c,river=W.river?W.river[i0]&15:0,road=W.road?W.road[i0]&15:0;
 const uni=waClass(t,n,c,r);if(river||road)waPaths(t,n,c,r,river,road);const cl=WA.cl,D=WA.d;
 for(let a=0;a<set.n;a++){let h=waHash(c,r,310+a*7),kind=null;for(const e of set.l){if(h<e[1]){kind=e[0];break}h-=e[1]}if(!kind)continue;
  const lx=2.5+waHash(c,r,312+a*7)*11,ly=3.5+waHash(c,r,313+a*7)*10.5,k=(ly|0)*16+(lx|0);
  if(!uni&&(cl[k]!==t||D[k]<2.6))continue;if(river&&WA.rv[k]-WA.rw[k]<2.4)continue;if(road&&WA.rd[k]<3.2)continue;
  whDeco(g,kind,c*16+lx,r*16+ly,waHash(c,r,314+a*7))}}

/* ================= QUADS: the painted terrain cache (Detail High) =================
   WQ.list: one entry per WHQ x WHQ tiles, made on demand: {cv (painted at cv.K), b (a build in progress: its own canvas, so the
   old picture stays up until the new one is whole), items (the tall things standing on its tiles, for whOcclude), ver, use}.
   A quad is (re)built when it is in or next to the view and has no picture at the settled scale K. Quads off the view are dropped
   oldest first once the painted pixels pass WQ.cap (about three screens). */
const WQ={w:null,n:0,list:[],K:0,px:0,cap:6e6,img:null,i32:null,iK:0,tall:new Map(),unk:null,build:0,ms:0,nb:0};
function wqReset(){WQ.w=W;WQ.n=Math.ceil(WN/WHQ);WQ.list=new Array(WQ.n*WQ.n).fill(null);WQ.px=0;WQ.tall.clear();WHA.spr.clear()}
function wqAt(qx,qy){return qx<0||qy<0||qx>=WQ.n||qy>=WQ.n?null:WQ.list[qy*WQ.n+qx]}
function wqGet(qx,qy){if(qx<0||qy<0||qx>=WQ.n||qy>=WQ.n)return null;const i=qy*WQ.n+qx;return WQ.list[i]||(WQ.list[i]={qx,qy,x0:qx*WHQ*16,y0:qy*WHQ*16,cv:null,b:null,items:null,ver:0,use:0})}
function wqTall(c,r){if(c<0||r<0||c>=WN||r>=WN)return null;const i=r*WN+c;let L=WQ.tall.get(i);if(L===undefined){L=whTallItems(c,r,[]);if(!L.length)L=null;WQ.tall.set(i,L)}return L}
function wqImg(K){if(WQ.iK!==K||!WQ.img){WQ.iK=K;WQ.img=new ImageData(16*K,16*K);WQ.i32=new Uint32Array(WQ.img.data.buffer)}return WQ.img}
// one step of a quad's build; returns true when the quad is finished
function wqStep(q,K,dl){let b=q.b;const S=WHQ*16,N=S*K;
 if(!b||b.K!==K){const cv=pxCanvas(N,N),g=cv.getContext('2d');b=q.b={cv,g,K,ph:0,i:0};g.imageSmoothingEnabled=true;
  if(q.cv)g.drawImage(q.cv,0,0,N,N);else if(WCH.key)g.drawImage(WCH.key,q.qx*WHQ,q.qy*WHQ,WHQ,WHQ,0,0,N,N)}   // the old picture (or soft key colours) under the new one
 const g=b.g,tx0=q.qx*WHQ,ty0=q.qy*WHQ;
 if(b.ph===0){const img=wqImg(K);for(;b.i<WHQ*WHQ;){const lx=b.i%WHQ,ly=(b.i/WHQ)|0,tx=tx0+lx,ty=ty0+ly;b.i++;if(tx<WN&&ty<WN){whShadeTile(WQ.i32,tx,ty,K);g.putImageData(img,lx*16*K,ly*16*K)}q.ver++;if(performance.now()>dl)return false}b.ph=1;b.i=0}
 if(b.ph===1){g.save();g.setTransform(K,0,0,K,-q.x0*K,-q.y0*K);g.beginPath();g.rect(q.x0,q.y0,S,S);g.clip();g.lineJoin='round';g.lineCap='round';
  whPU(g,K,()=>{for(let r=ty0-1;r<=ty0+WHQ;r++)for(let c=tx0-1;c<=tx0+WHQ;c++)if(c>=0&&r>=0&&c<WN&&r<WN)whTileDeco(g,c,r)});g.restore();b.ph=2;q.ver++;if(performance.now()>dl)return false}
 if(b.ph===2){const L=[],own=[];for(let r=ty0-1;r<=ty0+WHQ+2;r++)for(let c=tx0-1;c<=tx0+WHQ;c++){const T=wqTall(c,r);if(!T)continue;const mine=c>=tx0&&c<tx0+WHQ&&r>=ty0&&r<ty0+WHQ;for(const it of T){L.push(it);if(mine)own.push(it)}}
  L.sort((a,b)=>a.y-b.y||a.x-b.x);g.save();g.setTransform(1,0,0,1,0,0);
  for(const it of L){const e=whItemSpr(it.k,it.v,K),x=Math.round((it.x-e.ax-q.x0)*K),y=Math.round((it.y-e.ay-q.y0)*K);if(x>N||y>N||x+e.c.width<0||y+e.c.height<0)continue;g.drawImage(e.c,x,y)}
  g.restore();for(const it of own)it.e=whItemSpr(it.k,it.v,K);own.sort((a,b)=>a.y-b.y);q.items=own;
  // done: the new picture replaces the old
  if(q.cv)WQ.px-=q.cv.width*q.cv.height;q.cv=b.cv;q.cv.K=K;WQ.px+=N*N;q.b=null;q.ver++;return true}
 return true}
function wqDrop(q){if(q.cv)WQ.px-=q.cv.width*q.cv.height;q.cv=null;q.b=null;q.items=null;q.ver++}
// per-frame quad work: the view's quads first (nearest the middle), then the ring around it
function wqWork(vx0,vy0,vx1,vy1,boot,busy,W_,H_){const t0=performance.now(),S=WHQ*16,K=WQ.K;WQ.cap=Math.max(6e6,W_*H_*3.2);
 const qx0=clamp(Math.floor(vx0/S),0,WQ.n-1),qx1=clamp(Math.floor(vx1/S),0,WQ.n-1),qy0=clamp(Math.floor(vy0/S),0,WQ.n-1),qy1=clamp(Math.floor(vy1/S),0,WQ.n-1),cx=(vx0+vx1)/2/S-.5,cy=(vy0+vy1)/2/S-.5,stamp=++WQ.nb;
 for(let y=qy0;y<=qy1;y++)for(let x=qx0;x<=qx1;x++){const q=wqGet(x,y);q.use=stamp}
 let miss=false;for(let y=qy0;y<=qy1&&!miss;y++)for(let x=qx0;x<=qx1;x++){const q=WQ.list[y*WQ.n+x];if(!q||!q.cv){miss=true;break}}   // a hole in the view: work harder until it is filled
 const budget=boot?260:miss?9:busy?2.4:3.4,dl=t0+budget;let guard=0;
 while(guard++<200&&performance.now()<dl){let best=null,bd=1e9;
  for(let y=Math.max(0,qy0-1);y<=Math.min(WQ.n-1,qy1+1);y++)for(let x=Math.max(0,qx0-1);x<=Math.min(WQ.n-1,qx1+1);x++){const q=WQ.list[y*WQ.n+x];if(q&&q.cv&&q.cv.K===K&&!q.b)continue;
   const inV=x>=qx0&&x<=qx1&&y>=qy0&&y<=qy1;if(boot&&!inV)continue;const d=Math.max(Math.abs(x-cx),Math.abs(y-cy))+(inV?0:10)-(q&&q.b?.5:0);if(d<bd){bd=d;best=[x,y]}}
  if(!best)break;const q=wqGet(best[0],best[1]);q.use=Math.max(q.use,stamp-1);if(!wqStep(q,K,dl))break}
 // over the cap: drop the quads furthest out of use
 if(WQ.px>WQ.cap){const L=WQ.list.filter(q=>q&&q.cv&&q.use<stamp-1).sort((a,b)=>a.use-b.use);for(const q of L){if(WQ.px<=WQ.cap*.8)break;wqDrop(q)}}
 WQ.build=performance.now()-t0}
// the smooth unknown (art px, tiles seamlessly): ink blue with soft cloud shapes
function wqUnk(){if(WQ.unk)return WQ.unk;const N=64,c=pxCanvas(N,N),q=c.getContext('2d'),im=q.createImageData(N,N),d=new Uint32Array(im.data.buffer),nz=waFbm(211,16);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const v=whNzS(nz,x*2,y*2),r=18+v*14,gg=27+v*16,b=34+v*20;d[y*N+x]=(255<<24|(b|0)<<16|(gg|0)<<8|(r|0))>>>0}q.putImageData(im,0,0);
 const u=pxCanvas(WVP,WVP),uq=u.getContext('2d');for(let y=0;y<WVP;y+=N)for(let x=0;x<WVP;x+=N)uq.drawImage(c,x,y);WQ.unk=u;return u}
// one tile of a chunk's fog canvas (art px), smooth: the unknown's colour with a soft, wavy alpha edge
function wqUnk32(){if(WQ.u32)return WQ.u32;const c=wqUnk(),d=c.getContext('2d').getImageData(0,0,64,64).data;WQ.u32=new Uint32Array(d.buffer.slice(0));return WQ.u32}
function wqFogTile(ch,lc,lr,a,b,c,e){const q=ch.fq,X0=lc*16,Y0=lr*16,s=a+b+c+e;if(!s){q.clearRect(X0,Y0,16,16);return}
 if(s===16){q.globalCompositeOperation='copy';q.drawImage(wqUnk(),X0,Y0,16,16,X0,Y0,16,16);q.globalCompositeOperation='source-over';return}
 if(!WQ.fimg){WQ.fimg=new ImageData(16,16);WQ.f32=new Uint32Array(WQ.fimg.data.buffer)}whTex();const d=WQ.f32,U=wqUnk32(),gx=ch.cx*WVP,gy=ch.cy*WVP;
 for(let py=0;py<16;py++){const Y=Y0+py,fy=(py+.5)/16,l=a+(c-a)*fy,r=b+(e-b)*fy;
  for(let px=0;px<16;px++){const X=X0+px;let v=((l+(r-l)*(px+.5)/16)/4-.3)/.4+(whNzS(WHA.n2,gx+X,gy+Y)-.5)*.9;v=v<0?0:v>1?1:v*v*(3-2*v);const u=U[(Y&63)*64+(X&63)];d[py*16+px]=((u&0xffffff)|((v*255)|0)<<24)>>>0}}
 q.putImageData(WQ.fimg,X0,Y0)}
// the terrain on the screen: quads, the light of the hour, the fog of the chunks
function wqDraw(g,W_,H_,bx,by,sc,vx0,vy0,vx1,vy1,cx0,cy0,cx1,cy1){const S=WHQ*16;g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=true;
 const qx0=clamp(Math.floor(vx0/S),0,WQ.n-1),qx1=clamp(Math.floor(vx1/S),0,WQ.n-1),qy0=clamp(Math.floor(vy0/S),0,WQ.n-1),qy1=clamp(Math.floor(vy1/S),0,WQ.n-1);
 for(let y=qy0;y<=qy1;y++)for(let x=qx0;x<=qx1;x++){const q=wqAt(x,y),X=Math.round(bx+x*S*sc),Y=Math.round(by+y*S*sc),w=Math.round(bx+(x+1)*S*sc)-X,h=Math.round(by+(y+1)*S*sc)-Y;
  const c=q&&(q.cv||(q.b&&q.b.cv));if(c)g.drawImage(c,X,Y,w,h);else if(WCH.key)g.drawImage(WCH.key,x*WHQ,y*WHQ,WHQ,WHQ,X,Y,w,h)}
 if(WCH.ton)wvTintRect(g,0,0,W_,H_);
 for(let cy=cy0;cy<=cy1;cy++)for(let cx=cx0;cx<=cx1;cx++){const ch=wchAt(cx,cy);if(!ch||!ch.fog)continue;const X=Math.round(bx+ch.x0*sc),Y=Math.round(by+ch.y0*sc),w=Math.round(bx+(ch.x0+WVP)*sc)-X,h=Math.round(by+(ch.y0+WVP)*sc)-Y;
  g.drawImage(ch.fog===2?wqUnk():ch.fogcv,X,Y,w,h)}
 g.imageSmoothingEnabled=false}
// the frame's signature (frame skipping): the quads in view and their versions
function wqSig(vx0,vy0,vx1,vy1){const S=WHQ*16,qx0=clamp(Math.floor(vx0/S),0,WQ.n-1),qx1=clamp(Math.floor(vx1/S),0,WQ.n-1),qy0=clamp(Math.floor(vy0/S),0,WQ.n-1),qy1=clamp(Math.floor(vy1/S),0,WQ.n-1);
 for(let y=qy0;y<=qy1;y++)for(let x=qx0;x<=qx1;x++){const q=wqAt(x,y);wsg(q);if(q){wsg(q.ver);wsg(q.cv)}}}
// a sprite drawn among the trees: put back the tall things standing in front of its feet (g: the world transform, art px)
function wqOcclude(g,e,x,y){if(!WQ.n)return;const S=WHQ*16,x0=x+e.x0,x1=x+e.x1,y0=y+e.y0,y1=y+e.y1,a=clamp(Math.floor((x0-16)/S),0,WQ.n-1),b=clamp(Math.floor((x1+16)/S),0,WQ.n-1),c=clamp(Math.floor(y/S),0,WQ.n-1),d=clamp(Math.floor((y1+26)/S),0,WQ.n-1);
 let sm=false;for(let qy=c;qy<=d;qy++)for(let qx=a;qx<=b;qx++){const q=WQ.list[qy*WQ.n+qx];if(!q||!q.items)continue;
  for(const it of q.items){if(it.y<=y+.05)continue;const ie=it.e,ix0=it.x-ie.ax,iy0=it.y-ie.ay;if(ix0>=x1||ix0+ie.w<=x0||iy0>=y1||iy0+ie.h<=y0)continue;
   if(!sm){sm=true;g.imageSmoothingEnabled=true}g.drawImage(wvSprCv(ie),ix0,iy0,ie.w,ie.h)}}
 if(sm)g.imageSmoothingEnabled=false}
