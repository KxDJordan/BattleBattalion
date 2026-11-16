/* ================= WORLD ART (pixel-art overworld; contract: drawWorldTilePx, drawWorldTallPx, drawSitePx, siteBoxPx,
   drawBandPx, drawCompanyPx, drawMarkerPx, worldTint, drawWeatherPx, worldKeyColor) =================
   Everything is painted in code with PAL keys only, into palette-index buffers, then cached.
   TERRAIN. A tile is not a square of one material: every art pixel asks "which terrain owns me?" by bilinear weights of
   the four nearest tile centres plus a seamless noise per terrain (period 128 px = 8 tiles), so borders wobble, corners
   round off and diagonals join. The winner's margin over the runner-up is a distance to the border, used for beaches,
   foam, shallows and dithered land-to-land edges. Ground textures are 128x128 seamless buffers sampled at
   ((c&7)*16+i,(r&7)*16+j), so a tile's pixels depend only on (t, 8 neighbours, c&7, r&7, river, road, frame&7).
   Finished tiles live in 512x512 atlas pages (16x16 slots; the tall layer uses 32x32 slots), so a warm draw is one Map
   lookup and one drawImage. Variation never touches the game rnd() stream. */
const WAK=Object.keys(PAL),WAI={};WAK.forEach((k,i)=>WAI[k]=i+1);
const WAP=128,WAM=127,WAMAXP=24;
const WABAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const WA={ok:0,rgb:null,nz:null,fo:null,tex:null,wtex:null,
 tile:{map:new Map(),pend:new Map(),calm:0,pages:[],n:0,size:16,per:1024,im:null,u32:null,sc:null,sg:null},
 tall:{map:new Map(),pend:new Map(),calm:0,pages:[],n:0,size:32,per:256,im:null,u32:null,sc:null,sg:null},
 cl:new Uint8Array(256),s2:new Uint8Array(256),d:new Float32Array(256),sol:new Uint8Array(256),
 rv:new Float32Array(256),rs:new Float32Array(256),rw:new Float32Array(256),rd:new Float32Array(256),rds:new Float32Array(256),
 w8:new Float32Array(8),ix:new Uint8Array(256),tix:new Uint8Array(1024),t9:new Uint8Array(9),
 oc:new Uint8Array(16),wc:new Float32Array(16),spr:new Map(),pool:null,wx:new Map()};
function waRGB(){if(!WA.rgb){WA.rgb=new Uint32Array(WAK.length+1);WAK.forEach((k,i)=>{const n=parseInt(PAL[k].slice(1),16);WA.rgb[i+1]=(0xff000000|(n&255)<<16|(n>>8&255)<<8|n>>16)>>>0})}return WA.rgb}
function waHash(a,b,s){let h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul((s|0)+1,1274126177);h=Math.imul(h^h>>>13,2246822519);return((h^h>>>16)>>>0)/4294967296}
function waRM(){return typeof reduced!=='undefined'&&!!reduced}
function waRng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
/* periodic value noise, WAP x WAP, 0..1 */
function waNoise(seed,cell){const n=WAP/cell,g=new Float32Array(n*n),R=waRng(seed),o=new Float32Array(WAP*WAP);for(let i=0;i<n*n;i++)g[i]=R();
 for(let y=0;y<WAP;y++){const fy=y/cell,iy=fy|0,ty=fy-iy,sy=ty*ty*(3-2*ty),y1=(iy+1)%n;
  for(let x=0;x<WAP;x++){const fx=x/cell,ix=fx|0,tx=fx-ix,sx=tx*tx*(3-2*tx),x1=(ix+1)%n,a=g[iy*n+ix],b=g[iy*n+x1],c=g[y1*n+ix],d=g[y1*n+x1];o[y*WAP+x]=a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy}}return o}
function waFbm(seed,c0){const a=waNoise(seed,c0),b=waNoise(seed+1,c0/2),c=waNoise(seed+2,c0/4),o=new Float32Array(WAP*WAP);for(let i=0;i<o.length;i++)o[i]=a[i]*.5+b[i]*.32+c[i]*.18;
 let lo=1,hi=0;for(let i=0;i<o.length;i++){if(o[i]<lo)lo=o[i];if(o[i]>hi)hi=o[i]}for(let i=0;i<o.length;i++)o[i]=(o[i]-lo)/(hi-lo);return o}

/* ---- one-time tables: ownership noise, ground textures, water frames ---- */
function waInit(){if(WA.ok)return WA.ok>0;if(typeof document==='undefined'||typeof pxCanvas!=='function'){WA.ok=-1;return false}
 const tc=pxCanvas(1,1);if(!tc||!tc.getContext||!tc.getContext('2d')||!tc.getContext('2d').createImageData){WA.ok=-1;return false}
 for(let i=0;i<16;i++){const u=(i+.5)/16;if(u<.5){WA.oc[i]=0;WA.wc[i]=u+.5}else{WA.oc[i]=2;WA.wc[i]=1.5-u}}
 const N=WAP*WAP,I=WAI,nA=waFbm(11,32),nB=waFbm(23,32),nC=waFbm(37,16),nD=waNoise(53,4);WA.nz=waFbm(71,16);
 WA.fo=new Uint8Array(N);{const f=waFbm(91,16);for(let i=0;i<N;i++)WA.fo[i]=(f[i]*23)&7}
 const T=[];for(let t=0;t<8;t++)T.push(new Uint8Array(N));
 for(let y=0;y<WAP;y++)for(let x=0;x<WAP;x++){const k=y*WAP+x,a=nA[k],b=nB[k],c=nC[k],e=nD[k],h=waHash(x,y,5),by=(WABAY[(y&3)*4+(x&3)]+.5)/16;
  T[1][k]=a>.64&&by<Math.min(.4,(a-.64)*3)?I.A:b<.32&&by<Math.min(.34,(.32-b)*2.5)?I.w:I.v;                                           // plains
  T[2][k]=c<.42&&by<(.42-c)*5?I['3']:h<.035?I.B:I['7'];                                                  // forest floor
  T[3][k]=b>.46&&by<Math.min(.5,(b-.46)*3.2)?I.k:a<.4&&by<Math.min(.5,(.4-a)*3.5)?I.w:(h<.03?I.A:I.v);                               // hills: dry grass
  T[4][k]=c>.6&&by<(c-.6)*5?I.m:c<.38&&by<(.38-c)*5?I.o:(e>.8?I.m:I.n);                                  // mountain scree
  T[5][k]=a>.5&&by<(a-.5)*4.5?I.w:c<.4&&by<(.4-c)*5?I['3']:I['4'];                                       // swamp
  {const u=((y+6*Math.sin(x*Math.PI/32)+(a-.5)*22)%16+16)%16,on=b>.36;                                    // desert dunes
   T[6][k]=on&&u<1?I.e:on&&u<2.6?(by<.75?I.c:I.d):on&&u<4.2&&by<.25?I.c:(h<.02?I.c:I.d)}
  {const u=((y+5*Math.sin(x*Math.PI/32+2)+(b-.5)*26)%16+16)%16,on=a>.56;                                   // snow drifts
   T[7][k]=on&&u>=1&&u<2.4?(by<.7?I.q:I.r):c<.25&&by<(.25-c)*4?I.q:(h<.012?I.F:I.r)}}
 // grass ticks on plains / hills, leaf specks in forest
 const R=waRng(7);for(let i=0;i<520;i++){const x=(R()*WAP)|0,y=(R()*WAP)|0,t=R()<.6?1:3,k=R()<.5?I.w:I.A,p=(xx,yy)=>((yy&WAM)*WAP+(xx&WAM));T[t][p(x,y)]=k;T[t][p(x+1,y-1)]=k;if(R()<.5)T[t][p(x+2,y)]=k}
 WA.tex=T;
 // deep water: 8 frames of drifting crests on flat deep blue
 const WT=[],waves=[],Rw=waRng(19);for(let i=0;i<170;i++)waves.push([(Rw()*WAP)|0,(Rw()*WAP)|0,3+((Rw()*3)|0),(Rw()*8)|0]);
 for(let f=0;f<8;f++){const B=new Uint8Array(N).fill(I.X),p=(xx,yy,k)=>{B[(yy&WAM)*WAP+(xx&WAM)]=k};
  for(const w of waves){const ph=(f+w[3])&7,x=w[0],y=w[1],L=w[2];
   if(ph===0){p(x+1,y,I.x);p(x+2,y,I.x)}else if(ph===1){for(let j=0;j<L;j++)p(x+j,y,I.x)}
   else if(ph===2){for(let j=0;j<L;j++)p(x+j,y,I.x);p(x+1,y,I.F);p(x+1,y-1,I.x);p(x+2,y-1,I.x)}
   else if(ph===3){for(let j=0;j<L;j++)p(x+1+j,y,I.x)}else if(ph===4){p(x+2,y,I.x);p(x+3,y,I.x)}}
  WT.push(B)}
 WA.wtex=WT;WA.ok=1;return true}

/* ---- atlas. Writing to a canvas that is also being drawn from is very slow (the whole page is copied each time), so a
   new tile's pixels wait in a pending list and are drawn through a small scratch canvas; once things are calm (no new
   tiles for a while) the pending ones are written into their atlas page in one go and drawn from there afterwards. ---- */
function waSlot(A){if(A.n>=A.per*WAMAXP){A.map.clear();A.pend.clear();A.n=0}const s=A.n++,pg=(s/A.per)|0;if(!A.pages[pg])A.pages[pg]=pxCanvas(512,512);return s}
function waStore(A,s,ix){const C=waRGB(),o=new Uint32Array(ix.length);for(let k=0;k<o.length;k++)o[k]=ix[k]?C[ix[k]]:0;A.pend.set(s,o);A.calm=0}
function waFlush(A){const sz=A.size,per=512/sz;A.pend.forEach((o,s)=>{const i=s%A.per;A.u32.set(o);A.pages[(s/A.per)|0].getContext('2d').putImageData(A.im,(i%per)*sz,((i/per)|0)*sz)});A.pend.clear()}
function waDrawSlot(q,A,s,x,y){const sz=A.size;
 if(!A.sc){A.sc=pxCanvas(sz,sz);A.sg=A.sc.getContext('2d',{willReadFrequently:true});A.im=A.sg.createImageData(sz,sz);A.u32=new Uint32Array(A.im.data.buffer)}
 if(A.pend.size){const o=A.pend.get(s);if(o!==undefined){A.u32.set(o);A.sg.putImageData(A.im,0,0);q.drawImage(A.sc,x,y);if(A.pend.size>=2048)waFlush(A);return}
  if(++A.calm>700)waFlush(A)}
 const per=512/sz,i=s%A.per;q.drawImage(A.pages[(s/A.per)|0],(i%per)*sz,((i/per)|0)*sz,sz,sz,x,y,sz,sz)}
function waKey(t,n,c,r,river,road,f){let k=t;for(let i=0;i<8;i++)k=k*8+(n[i]&7);return(((k*64+((c&7)|(r&7)<<3))*16+river)*16+road)*8+f}
const WAN=[[0,0,0,0,0,0,0,0],[1,1,1,1,1,1,1,1],[2,2,2,2,2,2,2,2],[3,3,3,3,3,3,3,3],[4,4,4,4,4,4,4,4],[5,5,5,5,5,5,5,5],[6,6,6,6,6,6,6,6],[7,7,7,7,7,7,7,7]];

/* ---- ownership: fills WA.cl (winner), WA.s2 (runner-up or 255), WA.d (distance to the border in px, 99 = far) ---- */
function waClass(t,n,c,r){const T9=WA.t9,cl=WA.cl,s2=WA.s2,D=WA.d;T9[0]=n[7];T9[1]=n[0];T9[2]=n[1];T9[3]=n[6];T9[4]=t;T9[5]=n[2];T9[6]=n[5];T9[7]=n[4];T9[8]=n[3];
 let uni=true;for(let i=0;i<8;i++)if(n[i]!==t){uni=false;break}
 if(uni){cl.fill(t);s2.fill(255);D.fill(99);return true}
 const OC=WA.oc,WC=WA.wc,W8=WA.w8,NZ=WA.nz,vx=(c&7)<<4,vy=(r&7)<<4,q4=[0,0,0,0];
 for(let j=0;j<16;j++){const oy=OC[j],wy=WC[j],Y=vy+j;
  for(let i=0;i<16;i++){const k=j*16+i,ox=OC[i],wx=WC[i],tB=T9[3+ox],tC=T9[oy*3+1],tD=T9[oy*3+ox];
   if(t===tB&&t===tC&&t===tD){cl[k]=t;s2[k]=255;D[k]=99;continue}
   const X=vx+i;W8[t]=W8[tB]=W8[tC]=W8[tD]=0;W8[t]+=wx*wy;W8[tB]+=(1-wx)*wy;W8[tC]+=wx*(1-wy);W8[tD]+=(1-wx)*(1-wy);
   q4[0]=t;q4[1]=tB;q4[2]=tC;q4[3]=tD;let b=255,bs=-9,s=255,ss=-9;
   for(let m=0;m<4;m++){const tt=q4[m],w=W8[tt];if(w<0)continue;W8[tt]=-1;
    const sc=w+(NZ[((Y+tt*23)&WAM)*WAP+((X+tt*41)&WAM)]-.5)*.62*(w<.2?w*5:1);
    if(sc>bs){s=b;ss=bs;b=tt;bs=sc}else if(sc>ss){s=tt;ss=sc}}
   cl[k]=b;s2[k]=s;D[k]=s===255?99:(bs-ss)*8}}
 return false}

/* ---- rivers and roads: cubic arms from edge crossings (shared with the neighbour tile) to a jittered centre ---- */
function waSegs(mask,c,r,salt,J,wBase,n,kind){
 const ej=(cc,rr,ax)=>Math.round((waHash(cc&7,rr&7,salt+ax)-.5)*2*J),cx=8.5+Math.round((waHash(c&7,r&7,salt+2)-.5)*1.6*J),cy=8.5+Math.round((waHash(c&7,r&7,salt+3)-.5)*1.6*J);
 const E={1:[8.5+ej(c,r,0),0,0,1,0],8:[0,8.5+ej(c,r,1),1,0,6],2:[16,8.5+ej(c+1,r,1),-1,0,2],4:[8.5+ej(c,r+1,0),16,0,-1,4]},bits=[];
 for(const b of [1,8,2,4])if(mask&b)bits.push(b);
 const S=[];let s=0;
 const wOf=b=>kind===1&&n[E[b][4]]===0?wBase+2.4:wBase;
 const cubic=(x0,y0,x1,y1,x2,y2,x3,y3,w0,w1)=>{let px=x0,py=y0;for(let i=1;i<=7;i++){const u=i/7,v=1-u,a=v*v*v,b2=3*v*v*u,c2=3*v*u*u,d=u*u*u,x=a*x0+b2*x1+c2*x2+d*x3,y=a*y0+b2*y1+c2*y2+d*y3,L=Math.hypot(x-px,y-py);
   S.push(px,py,x,y,s,L,w0+(w1-w0)*(i-1)/7,w0+(w1-w0)*u);s+=L;px=x;py=y}};
 const L=4.5;
 if(bits.length===2){const a=E[bits[0]],b=E[bits[1]];let tx=b[0]-a[0],ty=b[1]-a[1];const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
  S.push(a[0]-a[2]*3,a[1]-a[3]*3,a[0],a[1],-3,3,wOf(bits[0]),wOf(bits[0]));
  cubic(a[0],a[1],a[0]+a[2]*L,a[1]+a[3]*L,cx-tx*3,cy-ty*3,cx,cy,wOf(bits[0]),wBase);cubic(cx,cy,cx+tx*3,cy+ty*3,b[0]+b[2]*L,b[1]+b[3]*L,b[0],b[1],wBase,wOf(bits[1]));
  S.push(b[0],b[1],b[0]-b[2]*3,b[1]-b[3]*3,s,3,wOf(bits[1]),wOf(bits[1]))}
 else for(const bt of bits){const a=E[bt],wC=bits.length===1&&kind===1?wBase*.6:wBase,mx=cx+(a[0]-cx)*.35,my=cy+(a[1]-cy)*.35;
  if(bt===1||bt===8){S.push(a[0]-a[2]*3,a[1]-a[3]*3,a[0],a[1],s-3,3,wOf(bt),wOf(bt));cubic(a[0],a[1],a[0]+a[2]*L,a[1]+a[3]*L,mx,my,cx,cy,wOf(bt),wC)}
  else{cubic(cx,cy,mx,my,a[0]+a[2]*L,a[1]+a[3]*L,a[0],a[1],wC,wOf(bt));S.push(a[0],a[1],a[0]-a[2]*3,a[1]-a[3]*3,s,3,wOf(bt),wOf(bt))}}
 return S}
function waDist(S,D,SS,WW){for(let j=0;j<16;j++)for(let i=0;i<16;i++){const x=i+.5,y=j+.5;let bd=1e9,bsv=0,bw=0;
  for(let q=0;q<S.length;q+=8){const x0=S[q],y0=S[q+1],dx=S[q+2]-x0,dy=S[q+3]-y0,l2=dx*dx+dy*dy;let u=l2>0?((x-x0)*dx+(y-y0)*dy)/l2:0;u=u<0?0:u>1?1:u;const ex=x0+dx*u-x,ey=y0+dy*u-y,d=ex*ex+ey*ey;
   if(d<bd){bd=d;bsv=S[q+4]+S[q+5]*u;bw=S[q+6]+(S[q+7]-S[q+6])*u}}
  const k=j*16+i;D[k]=Math.sqrt(bd);if(SS)SS[k]=bsv;if(WW)WW[k]=bw}}
/* fills the river/road fields for a tile (used by both layers) */
function waPaths(t,n,c,r,river,road){if(river){waDist(waSegs(river,c,r,40,3,1.9,n,1),WA.rv,WA.rs,WA.rw)}if(road){waDist(waSegs(road,c,r,60,2,1.5,n,2),WA.rd,WA.rds,null)}}

/* ---- ground decorations (stay inside the cell and inside their own terrain) ---- */
const WADECO={
 tuft:[['A.A','.w.'],['.A.','w.A'],['A..','.wA']],
 flower:[['*..*','.B..','..*B'],['.*.','*B*'],['*.','B*']],
 rock:[['.qp.','qppo','.oo.'],['qp','po']],
 bush:[['.AA.','AvBB','wBB7','.77.'],['.Av.','vBB7','.77.']],
 moundL:[['...7777....','..7AAvv77..','.7AAvvvww7.','7AAvvvvwwB7','7AvvvvwwwBB'],['....777....','..77AAv77..','.7AAAvvvw7.','7AAvvvvwwB7','.vvvvwwwBB.']],
 moundS:[['..777..','.7AAv7.','7AvvwB7','.vvwwB.'],['.7777.','7AAvw7','7AvwwB']],
 pool:[['..3333..','.3ZZZZ3.','3ZZ5ZZZ3','.3ZZZZ3.','..3333..'],['.3333.','3ZZ5Z3','3ZZZZ3','.3333.'],['..33333...','.3ZZZZZ33.','3ZZZ5ZZZZ3','3ZZZZZZ5Z3','.33ZZZZZ3.','...33333..']],
 reed:[['K..K.','c.Kc.','c.cc.','.bcb.'],['.K.','Kc.','ccb'],['K.K','c.c','b.b']],
 lily:[['AA.','.AA'],['.A.','A6A']],
 log:[['.jjkj.','ijjjji']],
 cactus:[['..A..','B.B..','B.B.A','BBB.B','..BBB','..B..','..7..'],['.A.','.B.','BBB','.B.','.7.'],['A.A.','BABB','.BB.','.7..']],
 drock:[['.kt..','ktuu.','juui.'],['kt','ui'],['..k..','.ktu.','ktuui','juuii']],
 bones:[['l.l.','.ll.','l..m'],['lll.','..lm']],
 dbush:[['b.b','.b.','b.j']],
 srock:[['.rr.','rqpo','poo.'],['rq','po']],
 ice:[['.FFFFF.','FFxFFFF','FFFFrFF','.FFFF..'],['.FFF.','FFrFF','.FxF.']],
 stuft:[['m.m','.n.'],['.m.','n.m']],
 scree:[['m.','on'],['.m.','mno','.o.'],['qm.','mno','.oo']],
 shroom:[['hg','.l'],['.g.','ghg','.l.']]
};
const WADSET=[null,
 {n:3,l:[['tuft',.3],['flower',.12],['rock',.03],['bush',.05]]},
 {n:1,l:[['shroom',.1]]},
 {n:4,l:[['moundL',.34],['moundS',.3],['rock',.08],['tuft',.1]]},
 {n:2,l:[['scree',.6]]},
 {n:4,l:[['pool',.3],['reed',.3],['lily',.08],['log',.05]]},
 {n:2,l:[['drock',.12],['cactus',.1],['bones',.03],['dbush',.1]]},
 {n:2,l:[['ice',.04],['srock',.08],['stuft',.12]]}];
const WAFLC=['r','y','h','C','e'];
function waDecoStamp(ix,sol,rows,x,y,star){const h=rows.length,w=rows[0].length;if(x<0||y<0||x+w>16||y+h>16)return false;
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){const ch=rows[j][i];if(ch!=='.'&&!sol[(y+j)*16+x+i])return false}
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){let ch=rows[j][i];if(ch==='.')continue;if(ch==='*')ch=star;const k=(y+j)*16+x+i;ix[k]=WAI[ch];sol[k]=0}
 for(let j=-1;j<=h;j++)for(let i=-1;i<=w;i++){const xx=x+i,yy=y+j;if(xx>=0&&yy>=0&&xx<16&&yy<16)sol[yy*16+xx]=0}return true}
function waDecos(ix,t,c,r,uni,river,road){const set=WADSET[t];if(!set)return;const sol=WA.sol,cl=WA.cl,D=WA.d,c7=c&7,r7=r&7;
 for(let k=0;k<256;k++)sol[k]=(uni||(cl[k]===t&&D[k]>2.4))&&(!river||WA.rv[k]-WA.rw[k]>1.6)&&(!road||WA.rd[k]>2.8)?1:0;
 for(let a=0;a<set.n;a++){let h=waHash(c7,r7,310+a*7),rows=null;for(const e of set.l){if(h<e[1]){const L=WADECO[e[0]];rows=L[(waHash(c7,r7,311+a*7)*L.length)|0];break}h-=e[1]}
  if(!rows)continue;const w=rows[0].length,hh=rows.length,x=(waHash(c7,r7,312+a*7)*(17-w))|0,y=(waHash(c7,r7,313+a*7)*(17-hh))|0;
  waDecoStamp(ix,sol,rows,x,y,WAFLC[(waHash(c7,r7,314+a*7)*WAFLC.length)|0])}}

/* ---- the tile shader: fills WA.ix with palette indices for one 16x16 cell ---- */
const WAROADC=[['k','j','m'],['k','j','m'],['k','i','m'],['k','j','m'],['m','o','l'],['j','i','k'],['k','b','t'],['m','n','k']];
function waShadeTile(t,n,c,r,river,road,f){const ix=WA.ix,uni=waClass(t,n,c,r),vx=(c&7)<<4,vy=(r&7)<<4,cl=WA.cl,s2=WA.s2,D=WA.d,TX=WA.tex,WT=WA.wtex[f],FO=WA.fo,I=WAI;
 for(let j=0;j<16;j++)for(let i=0;i<16;i++){const k=j*16+i,X=vx+i,Y=vy+j,tk=Y*WAP+X,b=cl[k],d=D[k];let v;
  if(d>=7)v=b?TX[b][tk]:WT[tk];
  else{const s=s2[k],by=(WABAY[(Y&3)*4+(X&3)]+.5)/16;
   if(b===0){const ph=(f+FO[tk])&7;                                             // water near land: foam, shallows
    if(s===5)v=d<1.2?(ph<3?I['5']:I.Z):d<3.4?I.Z:d<5&&by<(5-d)/1.6?I.Z:WT[tk];
    else if(s===4)v=d<1?(ph<3?I.r:I.F):d<2.6?I.x:d<4.2&&by<(4.2-d)/1.6?I.x:WT[tk];
    else if(d<1)v=ph<3?I.r:ph<5?I.F:(d<.55?I.r:I.F);
    else if(d<2.1)v=ph<3?I.F:I.x;
    else if(d<4.4)v=I.x;
    else v=by<(6.6-d)/2.2?I.x:WT[tk]}
   else if(s===0){                                                              // land near water: beach, cliff, mud, ice
    if(b===4)v=d<.7?I.G:d<1.6?I.o:TX[b][tk];
    else if(b===5)v=d<1.7?(by<.4?I.Z:I['3']):TX[b][tk];
    else if(b===7)v=d<1?I.F:d<2.4&&by<.6?I.q:TX[b][tk];
    else{const B=b===1?2.7:b===6?3.4:b===3?2.2:1.6;v=d<.9?I.e:d<B?(waHash(X,Y,9)<.08?I.c:I.d):by<(B+1.6-d)/1.6?(waHash(X,Y,9)<.3?I.c:I.d):TX[b][tk]}}
   else v=TX[d<2.6&&by<.5-d/5.2?s:b][tk]}                                       // land to land: dithered, irregular
  ix[k]=v}
 if(river||road)waPaths(t,n,c,r,river,road);
 if(river){const rv=WA.rv,rw=WA.rw,rs=WA.rs;for(let k=0;k<256;k++){if(cl[k]===0)continue;const e=rv[k]-rw[k];
   if(e<-.5){const u=(((Math.floor(rs[k])-f)%7)+7)%7;ix[k]=rv[k]<.8&&u<2?I.F:I.x}else if(e<.5)ix[k]=cl[k]===7?I.x:I.X}}
 if(road){const rd=WA.rd,rds=WA.rds,rv=WA.rv,rw=WA.rw;for(let k=0;k<256;k++){const d=rd[k];if(d>=2.6)continue;const b=cl[k],br=b===0||(river&&rv[k]-rw[k]<1.7);
   if(br){ix[k]=d>=1.5?I.a:(Math.floor(rds[k])&1?I.k:I.j)}
   else{const C=WAROADC[b],h=waHash(vx+(k&15),vy+(k>>4),13);if(d<1.5)ix[k]=h<.08?I[C[1]]:h>.94?I[C[2]]:I[C[0]];else if(h<.5)ix[k]=I[C[1]]}}}
 waDecos(ix,t,c,r,uni,river,road)}

function drawWorldTilePx(q,x,y,o){if(!waInit())return false;const t=o.t&7,n=o.n||WAN[t],river=o.river&15,road=o.road&15,c=o.c|0,r=o.r|0;
 let anim=t===0||river>0;if(!anim)for(let i=0;i<8;i++)if(n[i]===0){anim=true;break}
 if(anim&&waRM())anim=false;const f=anim?(o.frame|0)&7:0,A=WA.tile,key=waKey(t,n,c,r,river,road,f);let s=A.map.get(key);
 if(s===undefined){waShadeTile(t,n,c,r,river,road,f);s=waSlot(A);waStore(A,s,WA.ix);A.map.set(key,s)}
 waDrawSlot(q,A,s,x,y);return anim}

/* ---- tall layer: trees, peaks. Sprites are generated once into a pool of palette-index bitmaps (w,h,d,ax,ay = base centre). ---- */
function waBmp(w,h,ax,ay){const d=new Uint8Array(w*h),B={w,h,d,ax,ay,p(x,y,k){x|=0;y|=0;if(x>=0&&y>=0&&x<w&&y<h)d[y*w+x]=WAI[k]||0},g(x,y){return x>=0&&y>=0&&x<w&&y<h?d[y*w+x]:0}};return B}
function waOutlineBmp(B,k,keepBelow){const w=B.w,h=B.h,d=B.d,o=new Uint8Array(d),ki=WAI[k];for(let y=0;y<h;y++){if(keepBelow!=null&&y>keepBelow)break;for(let x=0;x<w;x++){const i=y*w+x;if(d[i])continue;if((x>0&&d[i-1])||(x<w-1&&d[i+1])||(y>0&&d[i-w])||(y<h-1&&d[i+w]))o[i]=ki}}d.set(o)}
function waTreeRound(seed,rx,ry,pal,trunk){const w=Math.ceil(rx)*2+5,h=Math.ceil(ry)*2+5+trunk,B=waBmp(w,h,w>>1,h-2),cx=(w>>1),cy=Math.ceil(ry)+1.5,R=waRng(seed);
 const lobes=[[0,0,rx,ry],[-rx*.45,ry*.35,rx*.62,ry*.62],[rx*.45,ry*.4,rx*.62,ry*.6],[(R()-.5)*rx*.6,-ry*.3,rx*.6,ry*.6]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let inn=false;for(const L of lobes){const a=(x+.5-cx-L[0])/L[2],b=(y+.5-cy-L[1])/L[3];if(a*a+b*b<=1){inn=true;break}}if(!inn)continue;
  const nx=(x+.5-cx)/rx,ny=(y+.5-cy)/ry,l=-nx*.5-ny*.8+(waHash(x>>1,y,seed)-.5)*.55;B.p(x,y,l>.62?pal[0]:l>.18?pal[1]:l>-.38?pal[2]:pal[3])}
 const ty=Math.round(cy+ry)-1;for(let j=0;j<trunk+1;j++){B.p(cx-1,ty+j,'j');B.p(cx,ty+j,'i')}
 waOutlineBmp(B,pal[4]);B.ay=ty+trunk;return B}
function waTreePine(seed,H,pal,snow){const w=13,h=H+5,B=waBmp(w,h,6,h-2),cx=6,th=snow?4:4;
 for(let y=0;y<H;y++){const tier=(y/th)|0,wi=y%th,hw=.6+wi*.95+tier*.75;for(let x=0;x<w;x++){const dx=x+.5-cx-.5;if(Math.abs(dx)>hw)continue;const edge=Math.abs(dx)>hw-1;
   let k=dx<-.2?(wi<2?pal[0]:pal[1]):(wi===th-1||edge?pal[3]:pal[2]);if(snow&&wi<2)k=dx<.3?'r':'q';else if(snow&&wi===2&&dx<-1&&waHash(x,y,seed)<.5)k='r';B.p(x,1+y,k)}}
 B.p(cx,1+H,'i');B.p(cx,2+H,'i');waOutlineBmp(B,pal[4]);B.ay=2+H;return B}
function waRowsBmp(rows,ol){const w=rows[0].length+2,h=rows.length+2,B=waBmp(w,h,w>>1,h-2);for(let y=0;y<rows.length;y++)for(let x=0;x<rows[0].length;x++)if(rows[y][x]!=='.')B.p(x+1,y+1,rows[y][x]);if(ol)waOutlineBmp(B,ol);return B}
/* a peak: lit left face, shadowed right face, wandering ridge, jagged snow line. st: 0 temperate, 1 desert rock, 2 deep snow */
function waPeak(seed,W,H,st){const w=32,h=32,B=waBmp(w,h,16,30),R=waRng(seed),by=30,ay=by-H,ax=16+Math.round((R()-.5)*W*.22),xl=16-W/2,xr=16+W/2;
 const C=st===1?{l:'t',l2:'s',ls:'u',d:'i',ds:'a',sl:'k',sd:'j'}:{l:'m',l2:'l',ls:'n',d:'o',ds:'G',sl:'r',sd:'q'},snowF=st===2?.6:st===1?.16:.27+R()*.1;
 let jl=0,jr=0,rw=0;const sh=(R()*7)|0;
 for(let y=ay;y<=by;y++){const tt=(y-ay)/H,e=Math.pow(tt,1.06);if(R()<.45)jl=clamp(jl+(R()<.5?-1:1),-1,1);if(R()<.45)jr=clamp(jr+(R()<.5?-1:1),-1,1);if(R()<.4)rw=clamp(rw+(R()<.5?-1:1),-1,2);
  const l=Math.round(ax-(ax-xl)*e+(tt>.15?jl:0)),r=Math.round(ax+(xr-ax)*e+(tt>.15?jr:0)),rx=Math.round(ax+tt*W*.1+(tt>.1?rw:0));
  for(let x=l;x<=r;x++){const lit=x<rx,sy=ay+H*snowF+((x+sh)%5<2?-1.5:(x+sh)%5===4?1.5:0)+(lit?0:1.5);let k;
   if(y<sy)k=lit?C.sl:(x===rx||waHash(x,y,seed)<.2?(st===1?C.d:'p'):C.sd);
   else if(lit)k=((x+y*2+sh)%7===0&&tt>.3)||x===l?C.ls:(x===rx-1&&waHash(x,y,seed)<.6)||waHash(x,y,seed+1)<.08?C.l2:C.l;
   else k=((x*2-y+sh+64)%6===0&&tt>.25)||x===rx?C.ds:C.d;
   B.p(x,y,k)}}
 waOutlineBmp(B,'1',by-1);return B}
function waPool(){if(WA.pool)return WA.pool;const P={round:[],dark:[],pine:[],spine:[],peak:[[],[],[]],hill:[]};
 const GA=['A','v','B','7','3'],GB=['v','B','7','3','2'],GC=['v','w','B','7','3'],GP=['w','B','7','3','2'],GS=['w','7','3','2','1'];
 for(let i=0;i<5;i++)P.round.push(waTreeRound(100+i,4.6+(i%3)*.5,4.2+(i%2)*.5,i%2?GC:GA,2));
 for(let i=0;i<4;i++)P.dark.push(waTreeRound(140+i,4.4+(i%2)*.6,4+(i%3)*.4,GB,2));
 P.small=[waTreeRound(170,3.2,3,GA,1),waTreeRound(171,3.4,2.8,GC,1),waTreeRound(172,3,3,GB,1)];
 for(let i=0;i<3;i++)P.pine.push(waTreePine(200+i,11+i,GP,false));
 for(let i=0;i<3;i++)P.spine.push(waTreePine(220+i,10+i,GS,true));
 P.bush=[waRowsBmp(['.AAv.','AvvBB','vBB77'],'3'),waRowsBmp(['.Av.','vBB7'],'3'),waRowsBmp(['.vB.','wB77'],'3')];
 P.dead=[waRowsBmp(['j...j..','.j.j..j','.jij.j.','..iij..','..ii...','..ii...','.aiia..'],'1'),waRowsBmp(['.j..j','j.ij.','.ii..','.ii..','.ii..','aii..'],'1')];
 P.swtree=[waTreeRound(180,3.8,3.2,['w','4','7','3','2'],2),waTreeRound(181,4.2,3.4,['w','7','4','3','2'],3)];
 P.cactus=[waRowsBmp(['..A..','..B..','A.B..','B.B.A','B.B.B','BBBBB','..B7.','..B..','..7..'],'1'),waRowsBmp(['.A.','.B.','ABA','BBB','.B.','.7.'],'1')];
 P.spire=[waRowsBmp(['..s..','.stu.','.ttu.','sttui','ttuui','ttuii'],'1'),waRowsBmp(['.st.','sttu','ttui'],'1')];
 P.boulder=[waRowsBmp(['.qqp..','qqppo.','qpppoo','ppoooG'],'1'),waRowsBmp(['.qp.','qppo','pooG'],'1')];
 P.sboulder=[waRowsBmp(['.rrr..','rrqpo.','rqppoo','ppoooG'],'1')];
 for(let st=0;st<3;st++)for(let i=0;i<6;i++)P.peak[st].push(waPeak(300+st*20+i,24+(i%3)*2,17+((i*5)%6),st));
 for(let st=0;st<3;st++)for(let i=0;i<3;i++)P.peak[st].push(waPeak(380+st*20+i,14+i*2,9+i*2,st));       // 6..8: foothills
 WA.pool=P;return P}
function waTallBuild(t,n,c,r,river,road){const ix=WA.tix,uni=waClass(t,n,c,r),P=waPool(),cl=WA.cl,D=WA.d,c7=c&7,r7=r&7,L=[];ix.fill(0);if(river||road)waPaths(t,n,c,r,river,road);
 const H=(i,sx)=>waHash(c7*16+i,r7*16+(sx|0),500+i),pk=(arr,h)=>arr[(h*arr.length)|0];
 if(t===4){let de=0,sn=0;for(let i=0;i<8;i++){if(n[i]===6)de++;else if(n[i]===7)sn++}const st=t===4&&de>=3?1:sn>=3?2:0,h=H(40),big=n[0]===4||n[4]===4||n[2]===4||n[6]===4;
  L.push([P.peak[st][big?(h*6)|0:3+((h*3)|0)],8+Math.round((H(41)-.5)*5),15]);
  if(H(42)<.4)L.push([P.peak[st][6+((H(43)*3)|0)],H(44)<.5?2:13,15+0.5])}
 for(let g=0;g<4;g++){const ax=clamp(4+(g&1)*8+Math.round((H(g)-.5)*5),0,15),ay=clamp(7+(g>>1)*8+Math.round((H(g+4)-.5)*4)-1,0,15),k=ay*16+ax,b=cl[k],d=D[k],h=H(g+8),h2=H(g+12);
  if(b===0||b===4||d<1.1)continue;
  if(road){if(WA.rd[k]<4.2||WA.rd[Math.max(0,ay-5)*16+ax]<3.2)continue}if(river){if(WA.rv[k]-WA.rw[k]<3.2||WA.rv[Math.max(0,ay-5)*16+ax]-WA.rw[k]<2.4)continue}
  let sp=null;
  if(b===2){const cold=n.indexOf(7)>=0||t===7,pine=cold?h2<.75:WA.nz[((r7*16+ay)*WAP+c7*16+ax+3000)%(WAP*WAP)]>.68?h2<.8:h2<.06;
   if(d<3.2&&h<.5)sp=h<.22?null:pk(P.bush,h2);else if(h<.05)sp=pk(P.small,h2);else sp=pine?pk(P.pine,h):h2>.55?pk(P.dark,h):pk(P.round,h)}
  else if(b===7){if(h<.13)sp=pk(P.spine,h2);else if(h<.16)sp=P.sboulder[0]}
  else if(b===5){if(h<.12)sp=pk(P.dead,h2);else if(h<.3)sp=pk(P.swtree,h2)}
  else if(b===1){const gr=WA.nz[((r7*16+ay)*WAP+c7*16+ax+7000)%(WAP*WAP)];if(gr>.6){if(h<.07)sp=pk(P.round,h2);else if(h<.13)sp=pk(P.small,h2);else if(h<.2)sp=pk(P.bush,h2)}else if(h<.012)sp=pk(P.bush,h2)}
  else if(b===3){if(h<.05)sp=pk(P.small,h2);else if(h<.1)sp=pk(P.boulder,h2);else if(h<.13)sp=pk(P.pine,h2)}
  else if(b===6){if(h<.05)sp=pk(P.cactus,h2);else if(h<.085)sp=pk(P.spire,h2)}
  if(sp)L.push([sp,ax,ay])}
 if(!L.length)return false;L.sort((a,b)=>a[2]-b[2]);
 for(const e of L){const S=e[0],x0=8+e[1]-S.ax,y0=16+Math.floor(e[2])-S.ay;for(let j=0;j<S.h;j++){const yy=y0+j;if(yy<0||yy>=32)continue;for(let i=0;i<S.w;i++){const v=S.d[j*S.w+i],xx=x0+i;if(v&&xx>=0&&xx<32)ix[yy*32+xx]=v}}}
 return true}
function drawWorldTallPx(q,x,y,o){if(!waInit())return;const t=o.t&7,n=o.n||WAN[t],river=o.river&15,road=o.road&15,c=o.c|0,r=o.r|0,A=WA.tall,key=waKey(t,n,c,r,river,road,0);let s=A.map.get(key);
 if(s===undefined){if(waTallBuild(t,n,c,r,river,road)){s=waSlot(A);waStore(A,s,WA.tix)}else s=-1;A.map.set(key,s)}
 if(s>=0)waDrawSlot(q,A,s,x-8,y-16);return s>=0}   // false: this tile has no tall part (nothing was drawn)

// for the renderer's one-time measure of how far tall parts reach: a tile's tall part as palette indices (32x32, drawn at x-8,y-16), or null
function worldTallIxPx(o){if(!waInit())return null;const t=o.t&7,n=o.n||WAN[t];return waTallBuild(t,n,o.c|0,o.r|0,o.river&15,o.road&15)?WA.tix:null}

/* ================= SPRITES: locations, bands, the company, markers =================
   Painted once per (kind, variant, animation frame) into a palette-index buffer, outlined with '0', cached as a canvas.
   P.flat=true paints pixels that take no outline (ground patches, smoke, sparks, glows). */
function waP(w,h){const d=new Uint8Array(w*h),sol=new Uint8Array(w*h),P={w,h,d,sol,flat:false,
 p(x,y,k){x|=0;y|=0;if(x<0||y<0||x>=w||y>=h)return;const i=y*w+x,v=WAI[k]||0;d[i]=v;sol[i]=v&&!P.flat?1:0},
 g(x,y){x|=0;y|=0;return x>=0&&y>=0&&x<w&&y<h?d[y*w+x]:0},
 r(x,y,ww,hh,k){for(let j=0;j<hh;j++)for(let i=0;i<ww;i++)P.p(x+i,y+j,k)},
 s(x,y,rows,flip,map){const n=rows[0].length;for(let j=0;j<rows.length;j++)for(let i=0;i<n;i++){let ch=rows[j][flip?n-1-i:i];if(ch==='.'||ch===' ')continue;if(map&&map[ch])ch=map[ch];P.p(x+i,y+j,ch)}},
 ell(cx,cy,rx,ry,fn){for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++){const a=(x+.5-cx)/rx,b=(y+.5-cy)/ry;if(a*a+b*b<=1){const k=fn(x,y,a,b);if(k)P.p(x,y,k)}}},
 outline(k){const o=[],ki=WAI[k||'0'];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(sol[i])continue;if((x>0&&sol[i-1])||(x<w-1&&sol[i+1])||(y>0&&sol[i-w])||(y<h-1&&sol[i+w]))o.push(i)}for(const i of o){d[i]=ki;sol[i]=1}},
 mirror(){for(let y=0;y<h;y++)for(let x=0;x<w>>1;x++){const a=y*w+x,b=y*w+w-1-x;let t=d[a];d[a]=d[b];d[b]=t;t=sol[a];sol[a]=sol[b];sol[b]=t}}};return P}
function waCanvas(P){const c=pxCanvas(P.w,P.h),g=c.getContext('2d'),im=g.createImageData(P.w,P.h),o=new Uint32Array(im.data.buffer),C=waRGB();for(let i=0;i<o.length;i++)o[i]=P.d[i]?C[P.d[i]]:0;g.putImageData(im,0,0);return c}
function waSprite(key,w,h,ax,ay,paint){let s=WA.spr.get(key);if(s)return s;const P=waP(w,h);paint(P);s={cv:waCanvas(P),ax,ay,w,h};WA.spr.set(key,s);return s}
function waShadow(q,x,y,w,h){const key='sh'+w+'x'+h;let s=WA.spr.get(key);if(!s){const P=waP(w,h);P.ell(w/2,h/2,w/2,h/2,()=>'0');s={cv:waCanvas(P)};WA.spr.set(key,s)}
 const a=q.globalAlpha;q.globalAlpha=a*.3;q.drawImage(s.cv,Math.round(x-w/2),Math.round(y-h/2));q.globalAlpha=a}
const WARAMP={red:['h','g','f'],slate:['q','p','o'],thatch:['d','c','b'],verd:['6','5','7'],blue:['x','X','G'],hide:['t','u','i']},WAWALL={pl:['l','m'],st:['q','p'],wd:['k','j'],dk:['p','o']};
function waHouse(P,x,y,w,wh,rh,R,Wc,o){o=o||{};const wt=y-wh+1,rt=wt-rh;P.r(x,wt,w,wh,Wc[0]);P.r(x+w-1,wt,1,wh,Wc[1]);P.r(x,wt,w,1,Wc[1]);
 for(let j=0;j<rh;j++){const ins=j===0&&rh>2?1:0;for(let i=-1+ins;i<=w-ins;i++){let k=j===0?R[0]:j===rh-1?R[2]:R[1];if(j>0&&j<rh-1&&((i+j*2)&3)===0)k=R[2];if(i>=w-1&&j>0)k=R[2];if(i===-1+ins&&j>0&&j<rh-1)k=R[0];P.p(x+i,rt+j,k)}}
 if(o.door!==0){const dh=Math.min(3,wh-1);P.r(x+(o.dx!=null?o.dx:(w>>1)-1),y-dh+1,2,dh,'a')}
 if(o.win)for(const wx of o.win){P.p(x+wx,wt+1,o.night?'y':'X');if(wh>3)P.p(x+wx,wt+2,o.night?'E':'X')}
 if(o.ch!=null){P.r(x+o.ch,rt-1,2,2,'n');P.p(x+o.ch+1,rt-1,'o');P.p(x+o.ch+1,rt,'o')}}
function waSmoke(P,x,y,f,k){const fl=P.flat;P.flat=true;const a=f&3;P.p(x+[0,1,0,-1][a],y-a,k||'q');P.p(x+[1,0,-1,0][a],y-2-a,k||'q');if(a>1)P.p(x+[0,0,1,-1][a],y-4-a,'p');P.flat=fl}
function waFire(P,x,y,f){const a=f&3;P.p(x-1,y,'i');P.p(x+1,y,'i');P.p(x,y,'E');P.p(x,y-1,a&1?'y':'E');P.p(x+(a>>1?1:-1),y-1,'E');P.p(x,y-2,a===2?'E':'y');if(a===1||a===3)P.p(x+(a===1?1:0),y-3,'y');waSmoke(P,x,y-5,f,'p')}
function waWall(P,x,y,w,h,seed){P.r(x,y,w,h,'p');P.r(x,y,w,1,'q');P.r(x,y+h-1,w,1,'o');for(let i=0;i<w;i+=2)P.p(x+i,y-1,'q');for(let j=1;j<h-1;j++)for(let i=0;i<w;i++)if(waHash(x+i,y+j,seed)<.14)P.p(x+i,y+j,'o')}
function waTower(P,x,y,w,h,roof){P.r(x,y-h+1,w,h,'p');P.r(x,y-h+1,1,h,'q');P.r(x+w-1,y-h+1,1,h,'o');P.r(x,y-h+1,w,1,'q');P.p(x+(w>>1),y-h+4,'a');P.p(x+(w>>1),y-h+5,'a');
 if(roof){const R=WARAMP[roof];for(let j=0;j<=(w>>1);j++){const ww=w+2-j*2;if(ww<1)break;for(let i=0;i<ww;i++)P.p(x-1+j+i,y-h-j,i<ww/2-1?R[0]:i>=ww-1-(j?0:1)?R[2]:R[1])}}
 else for(let i=0;i<w;i+=2)P.p(x+i,y-h,'q')}
function waTent(P,cx,by,hw,h,R){for(let j=0;j<h;j++){const ww=Math.round(hw*(j+1)/h);for(let i=-ww;i<=ww;i++)P.p(cx+i,by-h+1+j,i<-ww*.2?R[0]:i>ww*.5?R[2]:R[1])}for(let j=0;j<Math.min(4,h-2);j++){const ww=j>1?1:0;for(let i=-ww;i<=ww;i++)P.p(cx+i,by-3+j,'a')}P.p(cx,by-h,'i')}
function waFlag(P,x,y,w,h,C,f,dir,em){for(let i=0;i<w;i++){const yo=((i+(f&3))>>1)&1;for(let j=0;j<h;j++){if(i===w-1&&h>2&&j>0&&j<h-1&&(h<5||j===(h>>1)))continue;P.p(x+dir*(1+i),y+j+yo,j===0?C[0]:j===h-1?C[2]:C[1])}}
 if(em){const ex=x+dir*(1+(w>>1)),ey=y+(h>>1)+((((w>>1)+(f&3))>>1)&1);P.p(ex,ey,em);if(w>5){P.p(ex-dir,ey,em);if(h>4)P.p(ex,ey-1,em)}}}
function waBlob(P,lobes,fn){const fl=P.flat;for(let y=0;y<P.h;y++)for(let x=0;x<P.w;x++){let L=null;for(const l of lobes){const a=(x+.5-l[0])/l[2],b=(y+.5-l[1])/(l[3]||l[2]);if(a*a+b*b<=1){L=l;break}}if(!L)continue;
  const lx=-(x-L[0])/L[2]*.55-(y-L[1])/(L[3]||L[2])*.8;const k=fn(x,y,lx);if(k)P.p(x,y,k)}P.flat=fl}
function waGround(P,cx,cy,rx,ry,k,k2){const fl=P.flat;P.flat=true;P.ell(cx,cy,rx,ry,(x,y,a,b)=>{const e=a*a+b*b,h=waHash(x,y,77);return e<.55||h<(1-e)*1.6?(k2&&h>.8?k2:k):null});P.flat=fl}

const WASITE={town1:{w:34,h:24},town2:{w:44,h:36},town3:{w:56,h:48},lair:{w:36,h:30},eyrie:{w:40,h:52},ruin:{w:34,h:28},portal:{w:30,h:40}};
function waSiteDim(o){if(o.kind==='lair'&&o.f==='wyvern')return WASITE.eyrie;if(o.kind==='nest')return WASITE['nest'+clamp(o.tier|0||1,1,3)]||WASITE.lair;return o.kind==='town'?WASITE['town'+clamp(o.size|0||1,1,3)]:WASITE[o.kind]||WASITE.ruin}
function siteBoxPx(o){const d=waSiteDim(o||{});return{w:d.w,h:d.h}}
function waTown(P,size,night,f){const W=P.w,B=P.h-3,o=(a)=>Object.assign({night},a),R=WARAMP,WL=WAWALL;
 if(size<=1){waGround(P,17,B-2,15,5,'k','j');
  waHouse(P,4,B-6,8,3,4,R.thatch,WL.pl,o({win:[1,5],ch:5}));waHouse(P,21,B-7,9,3,4,R.thatch,WL.wd,o({win:[2,6]}));
  P.s(24,B-3,['.dd.','dccd','dcbb','cbbb']);for(let x=2;x<9;x++){P.p(x,B-1,'k');if(x%3===2){P.p(x,B,'j');P.p(x,B-2,'k')}}
  waHouse(P,12,B,9,4,5,R.thatch,WL.pl,o({win:[1,7],dx:4,ch:1}));
  P.outline();waSmoke(P,10,B-15,f);waSmoke(P,14,B-11,f+2)}
 else if(size===2){waGround(P,22,B-3,20,7,'k','m');
  waHouse(P,4,B-14,8,3,4,R.red,WL.pl,o({win:[2,5]}));waHouse(P,30,B-15,10,3,4,R.red,WL.pl,o({win:[2,6],ch:6}));waHouse(P,13,B-17,7,3,4,R.slate,WL.pl,o({win:[1,4]}));
  // chapel: nave and bell tower with a spire
  waHouse(P,18,B-8,10,5,4,R.slate,WL.st,o({win:[1,7],dx:4}));P.r(21,B-25,4,13,'l');P.r(24,B-25,1,13,'m');P.r(22,B-22,2,2,night?'y':'a');
  for(let j=0;j<6;j++){const ww=j<1?6:j<3?4:2;for(let i=0;i<ww;i++)P.p(23-(ww>>1)+i,B-26-j,i<ww/2?'p':'o')}P.p(22,B-26,'q');P.p(22,B-33,'c');P.p(22,B-34,'d');P.p(21,B-33,'c');P.p(23,B-33,'c');P.p(22,B-32,'c');
  waHouse(P,2,B-6,9,4,4,R.slate,WL.pl,o({win:[1,6],dx:3}));waHouse(P,32,B-6,10,4,4,R.red,WL.wd,o({win:[1,7],dx:4,ch:2}));
  waHouse(P,10,B,9,4,5,R.red,WL.pl,o({win:[1,7],dx:4,ch:6}));waHouse(P,23,B,10,4,5,R.thatch,WL.pl,o({win:[2,7],dx:4}));
  P.s(36,B-2,['.Av.','vBB7','.ii.']);P.s(20,B-2,['pq','op']);
  P.outline();waSmoke(P,37,B-24,f);waSmoke(P,17,B-11,f+1);waSmoke(P,35,B-16,f+3)}
 else{waGround(P,28,B-3,27,8,'k','m');
  waWall(P,8,B-31,40,4,3);waTower(P,5,B-25,6,10,'red');waTower(P,45,B-25,6,10,'red');
  // houses inside the walls
  const rs=[R.red,R.slate,R.thatch,R.verd,R.red,R.slate];let hi=0;
  for(const row of [[B-19,[9,16,35,42]],[B-13,[8,15,35,43]],[B-8,[10,17,25,33,41]]])for(const hx of row[1]){const rr=rs[hi++%rs.length];waHouse(P,hx,row[0],6,3,3,rr,hi%3?WL.pl:WL.wd,o({win:[1,4],door:0}))}
  // keep
  P.r(22,B-34,12,18,'q');P.r(31,B-34,3,18,'p');for(let i=0;i<12;i+=2)P.p(22+i,B-35,'q');for(const wy of [B-30,B-25])for(const wx of [24,28])P.r(wx,wy,1,2,night?'y':'a');P.r(27,B-19,2,3,'a');
  for(let j=B-33;j<B-17;j++)for(let i=22;i<34;i++)if(waHash(i,j,5)<.1)P.p(i,j,i>30?'o':'p');
  P.r(26,B-40,4,6,'q');P.r(29,B-40,1,6,'p');P.p(27,B-38,night?'y':'a');for(let j=0;j<3;j++)for(let i=j;i<6-j;i++)P.p(25+i,B-41-j,i<3-j?'h':i>4-j?'f':'g');
  P.r(28,B-46,1,3,'a');waFlag(P,28,B-46,4,2,R.red,f>>1,1);
  // side walls, front wall, gate
  P.r(6,B-27,3,22,'p');P.r(6,B-27,1,22,'q');P.r(8,B-27,1,22,'o');P.r(47,B-27,3,22,'p');P.r(47,B-27,1,22,'q');P.r(49,B-27,1,22,'o');
  waWall(P,6,B-6,44,7,9);waTower(P,2,B,6,13,'red');waTower(P,48,B,6,13,'red');waTower(P,20,B,5,12,null);waTower(P,31,B,5,12,null);
  P.r(25,B-5,6,6,'a');P.p(25,B-5,'p');P.p(30,B-5,'p');P.r(26,B-4,4,5,'j');P.r(27,B-4,2,5,'i');P.p(27,B-2,'a');P.p(28,B-2,'a');
  if(night){P.p(22,B-8,'y');P.p(33,B-8,'y')}
  P.outline();waSmoke(P,13,B-25,f);waSmoke(P,39,B-19,f+2);waSmoke(P,19,B-14,f+1)}}
function waLair(P,fk,night,f){const B=P.h-3,R=WARAMP;
 if(fk==='gob'){waGround(P,18,B-1,16,4,'j','i');
  P.ell(18,B+1,13,13,(x,y,a,b)=>{if(y>B)return null;const l=-a*.6-b*.8+(waHash(x,y,3)-.5)*.3;return b<-.93+Math.abs(a)*.1||(l>.9&&waHash(x,y,4)<.6)?(waHash(x,y,6)<.5?'w':'v'):l>.62?'k':l>.2?'j':'i'});
  P.r(14,B-6,9,1,'k');P.r(14,B-6,1,7,'k');P.r(22,B-6,1,7,'j');P.r(15,B-5,7,6,'0');P.r(16,B-6,5,1,'j');P.p(15,B-5,'i');P.p(21,B-5,'i');P.p(17,B-3,night||f&4?'y':'0');P.p(19,B-3,night||f&4?'y':'0');
  for(const s of [[5,5],[7,7],[9,5],[27,6],[29,7],[31,5]]){P.r(s[0],B-s[1]+1,1,s[1],s[0]%4===1?'j':'k');P.p(s[0],B-s[1],'l')}
  P.r(25,B-20,1,8,'i');P.s(24,B-23,['lll','0l0','.l.']);P.p(23,B-19,'g');P.p(27,B-19,'g');
  P.r(10,B-20,1,9,'i');waFlag(P,10,B-20,4,3,['A','B','7'],f>>1,1,'y');
  waFire(P,12,B,f);P.outline()}
 else if(fk==='undead'){waGround(P,18,B-1,17,5,'3','4');
  P.s(3,B-17,['j...j..','.j.j..j','.jij.j.','..iij..','..ii...','..ii...','..ii...','.aiia..']);
  P.r(12,B-11,12,12,'p');P.r(21,B-11,3,12,'o');P.r(12,B-11,12,1,'q');P.r(12,B-10,1,11,'q');for(let j=0;j<5;j++){const ww=14-j*3;if(ww<2)break;for(let i=0;i<ww;i++)P.p(18-(ww>>1)+i,B-12-j,i<ww*.6?'q':'p')}P.r(11,B-12,14,1,'J');
  P.r(16,B-7,4,8,'0');P.p(16,B-7,'p');P.p(19,B-7,'o');const gl=['Z','z','Z','7'][f&3];P.p(17,B-3,gl);P.p(18,B-4,gl);P.p(18,B-2,'Z');P.s(17,B-15,['ll','00']);
  for(let j=B-9;j<B;j++)for(let i=13;i<23;i++)if((i<16||i>19)&&waHash(i,j,8)<.12)P.p(i,j,'o');
  for(const g of [[4,B-1,0],[8,B,1],[27,B,0],[31,B-2,1],[28,B-5,1]]){if(g[2])P.s(g[0],g[1]-3,['.J.','JJJ','.J.','.p.']);else P.s(g[0],g[1]-2,['.J.','JJp','JJp'])}
  P.outline();if(night){const fl=P.flat;P.flat=true;P.p(6+(f&3),B-8-(f&1),'z');P.p(29-(f&3),B-9+(f&1),'z');P.flat=fl}}
 else if(fk==='beast'){waGround(P,18,B-1,16,4,'j','i');
  waBlob(P,[[18,B-9,9,9],[10,B-5,7,6],[26,B-4,7,6],[22,B-12,6,5]],(x,y,l)=>{const h=waHash(x,y,9);l+=(h-.5)*.35;return y>B?null:l>.75?'m':l>.3?'n':l>-.25?'o':'G'});
  for(let i=0;i<9;i++){const x=7+((waHash(i,1,12)*22)|0),y=B-14+((waHash(i,2,12)*10)|0);if(P.g(x,y)){P.p(x,y,'G');P.p(x+1,y+1,'G')}}
  P.ell(18,B-2,4.5,5,(x,y,a,b)=>y>B?null:'0');P.p(16,B-4,f&4?'0':'y');P.p(19,B-4,f&4?'0':'y');
  P.s(5,B-1,['l.l','.l.','l.l']);P.s(24,B-1,['lll.','..lm']);P.s(27,B-3,['.ll.','l0l0','.ll.']);P.s(1,B-3,['.Av.','vBB7','wB77']);P.s(30,B-10,['.vB.','wB77']);
  P.s(9,B-10,['G..','.G.','..G']);P.outline()}
 else if(fk==='orc'){waGround(P,18,B-1,17,5,'j','i');
  waTent(P,10,B-6,5,9,R.hide);waTent(P,23,B-7,5,9,R.hide);
  P.r(28,B-17,1,12,'i');P.r(32,B-17,1,12,'i');P.r(27,B-18,7,1,'j');P.r(27,B-20,7,1,'k');P.p(27,B-19,'i');P.p(33,B-19,'i');for(let j=0;j<3;j++)for(let i=j;i<9-j;i++)P.p(26+i,B-22-j,i<4?'t':'u');
  P.r(17,B-25,1,15,'i');waFlag(P,17,B-25,5,4,R.red,f>>1,1,'l');
  for(let x=2;x<=33;x++){if(x>=15&&x<=20)continue;const hh=6+(x%3===0?1:0)+(x===14||x===21?3:0),k=x%3===0?'k':x%3===1?'j':'i';P.r(x,B-hh+1,1,hh,k);if(x%3===0||x===14||x===21)P.p(x,B-hh,'l')}
  P.s(13,B-12,['lll','0l0']);P.s(20,B-12,['lll','0l0']);
  waFire(P,18,B-1,f);P.outline()}
 else if(fk==='bandit'){waGround(P,18,B-1,17,5,'k','j');
  const tp=[3,1,2,4,2,5,6,4];for(let i=0;i<8;i++){const top=B-21+tp[i];for(let y=top;y<=B;y++)P.p(19+i,y,i<2?'m':i>5?'o':(waHash(i,y,5)<.15?'o':'n'))}
  P.r(22,B-14,2,3,night?'y':'a');P.r(22,B-3,2,4,'a');P.r(20,B-27,1,8,'i');waFlag(P,20,B-27,4,3,['o','G','1'],f>>1,1,'g');
  waTent(P,9,B-1,6,9,['l','m','n']);P.s(28,B-3,['kjk','jij','kjk']);P.s(31,B-4,['.jj.','jkji','jkji','.ii.']);P.s(14,B-2,['.jj.','jkji','.ii.']);
  for(let x=1;x<5;x++){P.r(x,B-4-(x&1),1,5+(x&1),x&1?'j':'k')}
  waFire(P,17,B,f);P.outline()}

 else if(fk==='serpent'){waGround(P,18,B-1,17,5,'k','j');
  P.ell(18,B-2,10,4.2,(x,y,a,b)=>{const e=a*a+b*b;return e>.72?(waHash(x,y,5)<.5?'p':'o'):e>.4?'1':'0'});
  for(const r of [[7,B-2],[29,B-3],[11,B+1],[25,B+1]])P.s(r[0]-1,r[1]-1,['.pq','opp','.o.']);
  P.s(12,B-9,['..jj.','.jkk0','.j...','.jk..','..jk.']);P.s(20,B-11,['..bb.','.bccE','.b...','.bc..','.bc..','..bc.']);
  P.s(1,B-8,['.w.v','.wvw','w.wv','.ww.','.w..','.w..','.w..']);P.s(31,B-9,['v.w.','wvw.','vw.w','.ww.','..w.','..w.','..w.','..w.']);
  P.s(26,B-1,['lll','l0l']);P.outline();const fl=P.flat;P.flat=true;if(night||(f&4)){P.p(15,B-8,'g');P.p(23,B-10,'E')}P.flat=fl}
 else if(fk==='ent'){waGround(P,18,B-1,17,5,'B','w');
  const tree=(cx,by,r,ry,face)=>{P.r(cx-1,by-8,3,9,'i');P.p(cx-2,by,'i');P.p(cx+2,by,'i');P.p(cx+1,by-6,'j');
   P.ell(cx,by-9-ry,r,ry,(x,y,a,b)=>{const l=-a*.6-b*.8+(waHash(x,y,7)-.5)*.5;return l>.6?'v':l>.1?'w':'B'});if(face){P.p(cx-1,by-5,night||(f&4)?'y':'0');P.p(cx+1,by-5,night||(f&4)?'y':'0');P.p(cx,by-3,'0')}};
  tree(8,B-1,6,5,0);tree(28,B-1,6,5,0);tree(18,B+1,8,7,1);
  P.s(4,B,['.g.','glg','.l.']);P.s(30,B+1,['.g.','gmg','.m.']);P.s(13,B+1,['jj.','.jj']);P.outline();
  const fl=P.flat;P.flat=true;for(let i=0;i<4;i++){const ph=(f+i*2)&7;P.p(6+i*8+(ph&1),B-12-ph,ph<5?'A':'B')}P.flat=fl}
 else if(fk==='ogre'){waGround(P,18,B-1,17,5,'j','i');
  waTent(P,12,B-1,9,12,WARAMP.hide);P.r(10,B-5,4,5,'0');
  P.r(29,B-16,1,16,'i');P.s(27,B-20,['.lll.','ll0ll','.l0l.','..l..']);P.s(25,B-12,['l...l','.l.l.']);
  P.ell(23,B-3,3.5,3,(x,y,a,b)=>b<-.4?'o':'G');P.p(21,B-6,'o');P.p(25,B-6,'o');waFire(P,23,B+1,f);
  P.s(2,B,['ll.lll','.lmll.']);P.s(31,B+1,['kjk','jij']);P.outline();const fl=P.flat;P.flat=true;waSmoke(P,23,B-8,f,'q');P.flat=fl}
 else if(fk==='wyvern'){waGround(P,20,B-1,18,5,'p','o');
  const cr=[[20,B-34,5],[19,B-28,7],[20,B-20,9],[20,B-12,11],[20,B-5,13]];   // the crag: a rock spire, lit from the left
  for(let y=B-36;y<=B;y++){const t=(y-(B-36))/36,hw=Math.round(3+t*11+(waHash(y,1,51)-.5)*2),xo=Math.round(Math.sin(y*.4)*1.2);for(let x=-hw;x<=hw;x++){const k=x<-hw*.4?'q':x>hw*.4?'o':'p';P.p(20+x+xo,y,waHash(x,y,52)<.12?'o':k)}}
  for(let i=0;i<6;i++)P.p(14+i*2,B-26+(i&1)*7,'n');
  P.r(15,B-37,11,2,'j');P.r(14,B-36,13,1,'k');P.p(18,B-38,'l');P.p(20,B-38,'l');P.p(19,B-39,'m');   // the nest, eggs in it
  const up=(f>>1)&1;P.s(19,B-46-up,up?['g......','Dg.....','DDg..q.','DDgXXg0','.gXXXX.','X..q.q.']:['.......','.....q.','gggXXg0','DDXXXXX','.DDgX..','X..q.q.']);
  P.s(5,B-1,['l.l','lll']);P.s(30,B,['ll.l','.lll']);P.outline()}
 else{waGround(P,18,B-1,17,5,'D','G');const a=f&3;
  waBlob(P,[[18,B-8,9,8],[9,B-4,6,5],[27,B-4,6,5]],(x,y,l)=>{if(y>B)return null;const h=waHash(x,y,21);l+=(h-.5)*.4;return l>.85?'C':l>.2?'D':'G'});
  for(const s of [[14,B-15,5,-1],[19,B-16,8,0],[24,B-13,5,1],[7,B-8,4,-1],[29,B-8,4,1]])for(let j=0;j<s[2];j++){const x=s[0]+Math.round(s[3]*j*.4);P.p(x,s[1]-j,j===s[2]-1?'r':'C');if(j<s[2]-2)P.p(x+1,s[1]-j,'D')}
  for(const pd of [[12,B-4,0],[18,B-9,1],[25,B-3,2]]){const ph=(a+pd[2])&3,c1=ph===0?'r':ph===2?'C':'F',c2=ph===0?'F':'C';P.r(pd[0]-1,pd[1]-1,3,3,c2);P.p(pd[0],pd[1],c1);P.p(pd[0]-1,pd[1]-1,'D');P.p(pd[0]+1,pd[1]+1,'D');P.p(pd[0]+1,pd[1]-1,'D');P.p(pd[0]-1,pd[1]+1,'D')}
  P.outline();const fl=P.flat;P.flat=true;for(let i=0;i<5;i++){const ph=(f+i*3)&7;P.p(6+i*6+(ph&1),B-12-ph*2-(i&1)*3,ph<5?'C':'D')}P.flat=fl}}
function waRuin(P){const B=P.h-3;waGround(P,17,B-1,16,5,'m','n');
 const col=(x,by,h,broken)=>{P.r(x-1,by,5,1,'m');P.p(x+3,by,'n');for(let j=1;j<=h;j++){P.p(x,by-j,'l');P.p(x+1,by-j,j%3===0?'m':'l');P.p(x+2,by-j,'n')}
  if(broken){P.p(x,by-h-1,'l');P.p(x+1,by-h-1,'m');P.p(x,by-h-2,'l')}else{P.r(x-1,by-h-1,5,1,'l');P.p(x+3,by-h-1,'m')}};
 const hs=[3,5,4,6,5,3,2];for(let i=0;i<7;i++)for(let j=0;j<hs[i];j++)P.p(17+i,B-2-j,waHash(i,j,31)<.25?'n':j===hs[i]-1?'l':'m');
 col(6,B-1,15,false);col(14,B-1,15,false);P.r(4,B-19,15,2,'l');P.r(4,B-18,15,1,'m');P.r(16,B-19,3,1,'m');P.p(18,B-18,'n');P.p(11,B-19,'n');P.p(12,B-18,'n');
 col(24,B,8,true);col(30,B-1,3,true);
 P.s(9,B-1,['.ml.','mnnm']);P.s(20,B,['lmn']);P.r(2,B,4,1,'l');P.r(2,B+1,4,1,'m');P.p(1,B,'m');
 for(let i=0;i<22;i++){const x=4+((waHash(i,3,33)*28)|0),y=B-18+((waHash(i,4,33)*18)|0);if(P.g(x,y)){P.p(x,y,i&1?'B':'w');if(i%3===0&&P.g(x,y+1))P.p(x,y+1,'B')}}
 P.s(27,B-1,['.Av.','vBB7']);P.s(0,B-3,['.vB.','wB77']);P.outline()}
const WAREALM={ashen:['f','g','E','y','e'],hollow:['G','D','C','C','r'],glass:['Z','z','6','F','r']};
function waPortal(P,realm,f){const B=P.h-3,C=WAREALM[realm]||WAREALM.hollow,cx=15;waGround(P,15,B-1,13,4,'G',C[0]);
 const stone=(x,lean)=>{for(let j=0;j<22;j++){const y=B-j,ww=j>18?2:j>14?3:4,xo=x+Math.round(lean*j/7);for(let i=0;i<ww;i++)P.p(xo+i+(ww<4&&lean<0?4-ww:0),y,i===0?'p':i===ww-1?'G':(waHash(i,j,x)<.15?'G':'o'))}
  for(let j=4;j<18;j+=5)P.p(x+Math.round(lean*j/7)+1,B-j,((f>>1)+j)&1?C[2]:C[1])};
 stone(3,1);stone(23,-1);P.s(8,B-1,['op','Go']);P.s(20,B,['po']);P.outline();
 const fl=P.flat;P.flat=true;
 for(let y=B-31;y<=B-1;y++){const u=(y-(B-31))/30,hw=5.2*Math.pow(Math.sin(Math.PI*u),.65)+(waHash(y,f&7,41)-.5)*1.6;if(hw<.5){P.p(cx,y,C[1]);continue}
  for(let dx=-Math.ceil(hw);dx<=Math.ceil(hw);dx++){const a=Math.abs(dx+.0);if(a>hw)continue;const sw=((y*2+(f&7)*3+dx*2)%9+9)%9;
   P.p(cx+dx,y,a>hw-1?C[0]:a>hw-2.1?C[1]:a>hw*.3?(sw<2?C[3]:C[2]):(sw<4?C[4]:C[3]))}}
 for(let i=0;i<6;i++){const ph=(f+i*3)&7;P.p(cx+(i%2?1:-1)*(7+(i%3))-(ph>4?(i%2?1:-1):0),B-4-ph*3-(i%3)*2,ph<5?C[2]:C[1])}
 P.p(cx-4,B,C[1]);P.p(cx+3,B,C[1]);P.p(cx-1,B+1,C[2]);P.p(cx+1,B,C[2]);P.flat=fl}
function drawSitePx(q,x,y,o){if(!waInit())return;o=o||{};const D=waSiteDim(o),rm=waRM(),f=rm?0:o.frame|0,night=o.night?1:0,kind=o.kind;let key,paint;
 if(kind==='town'){const sz=clamp(o.size|0||1,1,3);key='town'+sz+'|'+night+'|'+(f&3);paint=P=>waTown(P,sz,night,f&3)}
 else if(kind==='lair'){const fk=FACT&&FACT[o.f]?o.f:'bandit';key='lair'+fk+'|'+night+'|'+(f&7);paint=P=>waLair(P,fk,night,f&7)}
 else if(kind==='nest'){const fk=typeof FACT==='object'&&FACT[o.f]?o.f:'bandit',ti=clamp(o.tier|0||1,1,3);key='nest'+fk+ti+'|'+night+'|'+(f&7);paint=P=>waNestPaint(P,fk,ti,night,f&7)}
 else if(kind==='portal'){const rl=WAREALM[o.realm]?o.realm:'hollow';key='portal'+rl+'|'+(f&7);paint=P=>waPortal(P,rl,f&7)}
 else{key='ruin';paint=P=>waRuin(P)}
 const s=waSprite(key,D.w,D.h,D.w>>1,D.h-2,paint);waShadow(q,x,y,D.w-4,7);q.drawImage(s.cv,Math.round(x)-s.ax,Math.round(y)-s.ay)}

/* ---- map figures (about 7-11 px tall, facing right; mirrored for dir -1) ---- */
const WAFIG={
 gob:{b:['v.vvv.v','.vv0v0.','..vvv..','..jjj..','.vjkjv.'],la:['..w.w..'],lb:['.w...w.'],flag:['A','B','7','y'],wpn:'spear',gap:7},
 undead:{b:['..lll..','.lllll.','.l0l0l.','..lml..','.lmlml.','l.lml.l','..lll..'],la:['..l.l..','..l.l..','.ll.ll.'],lb:['..l.l..','.l...l.','ll...ll'],flag:['l','m','n','0'],wpn:'sword',gap:8},
 orc:{b:['...www...','..wwwww..','..w0w0w..','..lwwwl..','.oowwwoo.','woogggoow','w.ooooo.w','v.iiiii.v'],la:['..ii.ii..','..ii.ii..','..aa.aa..'],lb:['..ii.ii..','.ii...ii.','.aa...aa.'],flag:['h','g','f','l'],wpn:'axe',gap:10},
 bandit:{b:['..GGG..','.GGGGG.','.GGsss.','.Ggggg.','.iijii.','iijjjii','i.jjj.s','..iai..'],la:['.oo.oo.','.oo.oo.','.aa.aa.'],lb:['.oo.oo.','oo...oo','aa...aa'],flag:['p','o','G','g'],wpn:'bow',gap:8},
 void:{b:['C.....C','DC...CD','.DDDDD.','.DrDrD.','.DDDDD.','CDDCDDC','C.DDD.C','..DDD..'],la:['..DD...','...D...','.......'],lb:['...DD..','...D...','.......'],flag:['C','D','G','F'],wpn:null,gap:8,hover:1},
 co:{b:['..qqq..','.qqqpo.','..sst..','.55555.','p5c55ps','p55557.','.aaaaa.'],la:['.oo.oo.','.oo.oo.','.ii.ii.'],lb:['.oo.oo.','oo...oo','ii...ii'],flag:['d','c','b','5'],wpn:'spear',gap:8}};
const WAWOLF={b:['.........H.H','j.......HHHH','jHHHHHHHHH0l','.HHHHHHHHHl.','.HjHHHHjH...'],la:['.H.H...H.H..','.H.H...H.H..'],lb:['.HH.....HH..','H.......H.H.']},
 WABEAR={b:['....HHHH......','..HHHHHHHH.H.H','.HiiiiiiiiHHHH','iiiiiiiiiiii0j','iiiiiiiiiiiijj','iiHiiiiiiHii..'],la:['.ii.ii..ii.ii.','.ii.ii..ii.ii.'],lb:['.iii....iii...','ii......i..ii.']};
function waFigure(P,F,x,by,step,up,kit){const h=F.b.length+F.la.length,y=by-h+1-up,w=F.b[0].length,x0=x-(w>>1);P.s(x0,y,F.b,false,kit);P.s(x0,y+F.b.length,step?F.lb:F.la,false,kit);return{x0,y,w}}
function waWeapon(P,kind,B){const x=B.x0+B.w,y=B.y;
 if(kind==='spear'){for(let j=-2;j<8;j++)P.p(x,y+j,'j');P.p(x,y-3,'q');P.p(x,y-4,'r')}
 else if(kind==='sword'){P.p(x,y+5,'u');P.p(x,y+4,'p');P.p(x,y+3,'q');P.p(x,y+2,'q');P.p(x+1,y+1,'r')}
 else if(kind==='axe'){for(let j=0;j<7;j++)P.p(x,y+1+j,'j');P.s(x-1,y-1,['.qq','pqq','.pq'])}
 else if(kind==='bow'){P.p(x,y+3,'j');P.p(x+1,y+4,'j');P.p(x+1,y+5,'j');P.p(x+1,y+6,'j');P.p(x,y+7,'j')}
 else if(kind==='shield'){P.s(B.x0+B.w-3,y+4,['565','5c5','757'])}}
/* a band: k figures in a loose file, the standard carried in the middle, flag trailing behind the march */
function waBandPaint(P,fk,k,f,moving,co){const B=P.h-4,cx=P.w>>1,F=WAFIG[fk];
 if(fk==='beast'){const L=k>=3?[[WABEAR,cx+1,B-1],[WAWOLF,cx-12,B+1],[WAWOLF,cx+12,B-6]]:k===2?[[WAWOLF,cx-5,B-2],[WAWOLF,cx+4,B+1]]:[[WAWOLF,cx,B]];L.sort((a,b)=>a[2]-b[2]);
  L.forEach((e,i)=>{const st=moving?((f+i)&1):0;waFigure(P,e[0],e[1],e[2],st,moving&&((f+i)&3)===1?1:0)});P.outline();return}
 const n=co?co.k:k,gap=F.gap,x1=cx+((n-1)*gap>>1)+(co?1:0),L=[];
 for(let i=0;i<n;i++)L.push({i,x:x1-i*gap,y:B-(i&1?2:0)+(n===1?0:1)-(i===3?1:0)});
 const bi=n>=2?1:0,fs=co?co.fs:k,fw=[4,6,8,10][fs-1],fh=[3,4,5,6][fs-1],ph=co?16+fs:11+fs*2+(fk==='gob'?-3:fk==='orc'?1:0);
 L.slice().sort((a,b)=>a.y-b.y).forEach(e=>{const i=e.i,st=moving?((f+i)&1):0,up=F.hover?((f+i*2)>>1)&1:moving&&((f+i)&3)===1?1:0;
  if(i===bi){const px=e.x-(F.b[0].length>>1)-1,py=e.y-up,bn=co&&co.bn;if(bn){const ph2=ph+3;P.r(px,py-ph2,1,ph2+1,'a');P.p(px,py-ph2-1,'e');waBanner(P,px,py-ph2,bn,moving?f:f>>1)}else{P.r(px,py-ph,1,ph+1,co?'a':'i');if(co){P.p(px,py-ph-1,'e')}waFlag(P,px,py-ph,fw,fh,F.flag,moving?f:f>>1,-1,F.flag[3]);}if(co&&fs>2){for(let j=1;j<fh-1;j++)P.p(px-2,py-ph+j,'6')}}
  const kit=co?[null,{'5':'7','c':'5'},{'q':'7','p':'3','o':'3'},null][i]:(i===2&&fk==='orc'?{'g':'u'}:i===1&&fk==='bandit'?{'g':'X'}:null),bx=waFigure(P,F,e.x,e.y,st,up,kit);
  const wp=co?['spear','sword','bow','shield'][i]:(i===bi&&n>1?null:F.wpn);if(wp&&!(i===bi&&n===1&&co))waWeapon(P,wp,bx);
  if(co&&i===0){P.p(bx.x0+3,bx.y-1,'6');P.p(bx.x0+2,bx.y-2,'6');P.p(bx.x0+1,bx.y-2,'5')}});
 P.outline()}

/* ---- the monster factions (monsterart): serpents, ents, ogres, wyverns. Bands are drawn here; their figures face right ---- */
const WAMON={
 adder:{b:['......HH.','.....HjkH','.H..Hj...','HjHHj....'],la:[],lb:[]},
 adder2:{b:['.......HH.','......Hjk0','..HH.Hj...','HjjjHj....'],la:[],lb:[]},
 gserp:{b:['...bbb..','..bccbE.','..bc.b..','..bc....','...bc...','....bc..','.bbbbcb.','bcccdcb.','.bbbbbb.'],la:[],lb:[]},
 ent:{b:['...BvvB....','.BvvAvvvB..','BvAvvvvAvB.','.BvvvBvvB..','...jjjj....','..jkyjyj...','.j.jkjj.j..','j..jkjj..j.','...jkjj....'],la:['...jj.jj...','..jj...jj..'],lb:['...jjjj....','...jj.jj...']},
 elder:{b:['..ddcddcd...','.dcddcddcd..','dcdcddcdcdc.','.ddcdddcd...','...oooo.....','..onzozo....','.o.onoo.o...','o..onoo..o..','...onmmo....','...onmmo....'],la:['...oo.oo....','..oo...oo...'],lb:['...oooo.....','...oo.oo....']},
 thorn:{b:['.vAv.','vvgvv','.vjv.','..j..','.jkj.'],la:['.j.j.'],lb:['..jj.']},
 ogre:{b:['....ttt....','...tt0t0...','...ttttt...','..utttttu..','.uttttttu..','.ut.ttt.tu.','.u..jjj..u.','....jij....'],la:['....t.t....','...uu.uu...'],lb:['...t...t...','..uu...uu..']},
 aogre:{b:['..l.....l..','...lpppl...','...prrpp...','..oppppqo..','.oppqqqppo.','.op.ppp.po.','.o..jjj..o.','....jij....'],la:['....o.o....','...GG.GG...'],lb:['...o...o...','..GG...GG..']}};
const WAWYV=[['..g.............g..','..gD...........fg..','...gD.........fg...','...gDD.......ffg...','....gDD.....ffg....','....gDDg...gffg.q..','.....gDgggggfg.gXg.','..gg.XXXXXXXXXXXXg0','.g..gXxxxxxX.......','g....q..q..........'],   // the wyvern after the owner's reference: indigo body,
 ['...................','...................','...................','................q..','......gggggggg.gXg.','..gg.XXXXXXXXXXXXg0','.g..fgXxxxxXgf.....','g..Dgff.q.q.ffgf...','..DgD.........fgf..','..g.............g..']];   // crimson ridge and spars, plum membrane, ice horns and claws
function waMonFig(P,F,x,by,step,up,flip){const n=F.b[0].length,h=F.b.length+F.la.length,y=by-h+1-up,x0=x-(n>>1);P.s(x0,y,F.b,flip);if(F.la.length)P.s(x0,y+F.b.length,step?F.lb:F.la,flip);return{x0,y,w:n}}
function waClub(P,B,iron){const x=B.x0+B.w,y=B.y+3;for(let j=0;j<6;j++)P.p(x-(j>>2),y+j,'j');P.p(x,y-1,iron?'p':'k');P.p(x+1,y-1,iron?'p':'k');P.p(x,y-2,iron?'q':'k');P.p(x+1,y-2,iron?'p':'j');P.p(x+1,y,iron?'o':'j')}
function waMonBand(P,fk,k,f,moving){const B=P.h-4,cx=P.w>>1,st=i=>moving?((f+i)&1):0,up=i=>moving&&((f+i)&3)===1?1:0;
 if(fk==='serpent'){const L=k>=3?[['gserp',cx+2,B-1],['adder',cx-10,B+1],['adder2',cx+12,B+2]]:k===2?[['adder',cx-6,B],['adder2',cx+5,B+2]]:[['adder2',cx,B+1]];
  L.forEach((e,i)=>{const F=WAMON[e[0]];waMonFig(P,F,e[1]+(moving&&(f+i)&1?1:0),e[2],0,0)})}
 else if(fk==='ent'){const L=k>=3?[['elder',cx+1,B],['thorn',cx-11,B+1],['thorn',cx+12,B+2]]:k===2?[['ent',cx-4,B],['thorn',cx+8,B+2]]:[['ent',cx,B]];
  L.forEach((e,i)=>waMonFig(P,WAMON[e[0]],e[1],e[2],st(i),0))}
 else if(fk==='ogre'){const L=k>=3?[['aogre',cx+2,B],['ogre',cx-9,B+1],['gob',cx+13,B+2]]:k===2?[['ogre',cx-5,B],['ogre',cx+7,B+2]]:[['ogre',cx,B]];
  L.forEach((e,i)=>{if(e[0]==='gob'){const b=waFigure(P,WAFIG.gob,e[1],e[2],st(i),up(i));waWeapon(P,'spear',b);return}const b=waMonFig(P,WAMON[e[0]],e[1],e[2],st(i),up(i));waClub(P,b,e[0]==='aogre')})}
 else if(fk==='wyvern'){const fl=f&1,hv=(f>>1)&1,W=WAWYV[fl];const fl2=P.flat;P.flat=true;P.ell(cx,B,9,2,()=>'0');P.flat=fl2;   // its shadow on the ground, then the wyvern on the wing above it
  P.s(cx-10,B-18-hv,W,false);if(k>=2){const h2=WAWYV[1-fl].map(r=>r.slice(10));P.s(cx-14,B-8+hv,['g..g','gXXg','.XXg']);if(k>=3)P.s(cx+9,B-6-hv,['g..g','gXXg','.XXg'])}}
 P.outline()}
function waBandSprite(fk,k,f,dir,moving,co){const key='band'+fk+'|'+(co?co.k+'.'+co.fs+(co.bn?'.'+co.bn.sig:''):k)+'|'+(f&3)+'|'+(dir<0?0:1)+'|'+(moving?1:0),w=co?48:40,h=co?38:30;
 return waSprite(key,w,h,w>>1,h-3,P=>{if(WAMONF[fk])waMonBand(P,fk,k,f&3,moving);else waBandPaint(P,fk,k,f&3,moving,co);if(dir<0)P.mirror()})}
const WAMONF={serpent:1,ent:1,ogre:1,wyvern:1};
function drawBandPx(q,x,y,o){if(!waInit())return;o=o||{};const gl=o.goal;if(gl==='caravan'||gl==='patrol'||gl==='raid'||gl==='merc'){drawGoalPx(q,x,y,o);return} const fk=WAFIG[o.f]||o.f==='beast'||WAMONF[o.f]?o.f:'bandit',k=clamp(Math.round(+o.str||1),1,3),f=waRM()?0:o.frame|0,s=waBandSprite(fk,k,f,o.dir<0?-1:1,!!o.moving&&!waRM(),null);
 if(fk!=='wyvern')waShadow(q,x,y,fk==='beast'||fk==='serpent'?12+k*5:fk==='ogre'||fk==='ent'?11+k*7:8+k*7,5);q.drawImage(s.cv,Math.round(x)-s.ax,Math.round(y)-s.ay)}
/* the company banner (G.banner {c1,c2,emblem}, 46-banner.js): a waving flag in the field colour c1, a c2 border and the emblem shrunk to fit.
   Absent (old saves, no banner module): the brass and verdigris pennant as before. Recomputed only when the banner changes. */
const WABN={sig:null,v:null};
function waBannerOf(){const G0=typeof G!=='undefined'?G:null,b0=G0&&G0.banner;if(!b0||typeof BANNERC!=='object')return null;let b=b0;try{if(typeof bannerFix==='function')b=bannerFix(b0)}catch(e){}
 const sig=b.c1+'.'+b.c2+'.'+b.emblem+(b.div&&b.div!=='plain'?'.'+b.div+b.c3:'');if(WABN.sig===sig)return WABN.v;const ramp=k=>{const c=BANNERC[k];return c&&Array.isArray(c.r)?c.r:PAL[k]?[k,k,k]:null},A=ramp(b.c1);
 let v=null;if(A){const C=ramp(b.c2===b.c1?'l':b.c2)||['m','l','r'],E=typeof EMBLEMS==='object'&&EMBLEMS[b.emblem]?EMBLEMS[b.emblem].r:null;
  let em=null;if(E){const n=E.length,m=8,pick={'#':3,'+':2,'-':1,'=':2};em=[];for(let y=0;y<m;y++){let r='';for(let x=0;x<m;x++){let best='.',bw=0;for(let j=0;j<2;j++)for(let i=0;i<2;i++){const ch=(E[y*2+j]||'')[x*2+i]||'.',w=pick[ch]||0;if(w>bw){bw=w;best=ch}}r+=best}em.push(r)}}
  v={A,C,em,sig,D:b.div&&b.div!=='plain'?ramp(b.c3):null,dv:b.div}}WABN.sig=sig;WABN.v=v;return v}
function waBanner(P,x,y,bn,f){const W=14,H=10,A=bn.A,C=bn.C;
 for(let i=0;i<W;i++){const yo=((i+(f&3))>>2)&1,xx=x-1-i;for(let j=0;j<H;j++){if(i===W-1&&j>=3&&j<=H-4)continue;if(i>=W-2&&(j===H>>1))continue;
   const bd=j===0||j===H-1||i===W-1||i===W-2&&(j<3||j>H-4);const F=bn.D&&waBnDiv(bn,i,j,W,H)?bn.D:A;P.p(xx,y+j+yo,bd?(j===H-1||i>=W-2?C[0]:C[1]):(j===1?F[2]:j>=H-2?F[0]:F[1]))}}
 if(bn.em){const ox=x-1-3,oy=y+1;for(let j=0;j<8;j++)for(let i=0;i<8;i++){const ch=bn.em[j][i];if(ch==='.')continue;const fi=3+(7-i),yo=((fi+(f&3))>>2)&1;P.p(ox-(7-i),oy+j+yo,ch==='-'?C[0]:ch==='+'?C[2]:ch==='='?A[0]:C[1])}}}
/* is flag cell (i from the pole, j down) in the banner's division (46-banner.js BNDIV)? A bordure is the ring inside the border */
function waBnDiv(bn,i,j,W,H){if(bn.dv==='bordure')return i===1||i===W-3||j===1||j===H-2;return typeof bnDivAt==='function'&&bnDivAt(bn.dv,(i+.5)/W,(j+.5)/H)}
function drawCompanyPx(q,x,y,o){if(!waInit())return;o=o||{};const n=Math.max(1,o.n|0),k=n<=3?1:n<=6?2:n<=9?3:4,fs=n<=5?2:n<=10?3:4,f=waRM()?0:o.frame|0,bn=waBannerOf(),s=waBandSprite('co',k,f,o.dir<0?-1:1,!!o.moving&&!waRM(),{k,fs,bn});
 waShadow(q,x,y,10+k*8,6);q.drawImage(s.cv,Math.round(x)-s.ax,Math.round(y)-s.ay)}

/* ---- markers (anchor: bottom centre) ---- */
const WAMARK={contract:['..ggggg..','.ghggggf.','gh.lll.gf','gglllllff','ggl0l0lff','gf.lll.ff','.gfl.lff.','..gffff..','...gff...','....f....'],
 turnin:['..ddd..','.deddc.','dedaccb','deaaacb','dddaccb','.dccbb.','..bbb..'],
 dest:['l66655...','l665557..','l65577...','l577.....','l........','l........','l........','l........','m........'],
 dest2:['l.66655..','l6655557.','l655577..','l.577....','l........','l........','l........','l........','m........'],
 waypoint:['.d.','dcb','.b.']};
function drawMarkerPx(q,x,y,o){if(!waInit())return;o=o||{};const f=waRM()?0:o.frame|0,kind=WAMARK[o.kind]?o.kind:'waypoint',a=kind==='dest'&&(f&1)?'dest2':kind,sp=kind==='turnin'?(f&3):0,key='mk'+a+sp;
 const rows=WAMARK[a],s=waSprite(key,rows[0].length+4,rows.length+4,0,0,P=>{P.s(2,2,rows);P.outline();if(kind==='turnin'){P.flat=true;const c=[[1,1],[P.w-2,2],[P.w-2,P.h-2],[1,P.h-3]][sp];P.p(c[0],c[1],'r');P.p(c[0]+1,c[1],'e');P.p(c[0],c[1]+1,'e')}});
 const bob=kind==='contract'||kind==='turnin'?((f>>1)&1):0;
 if(kind==='dest'){waShadow(q,x,y,7,3);q.drawImage(s.cv,Math.round(x)-3,Math.round(y)-s.h+3)}
 else q.drawImage(s.cv,Math.round(x)-(s.w>>1),Math.round(y)-s.h+2-bob+(kind==='waypoint'?3:0))}

/* ---- time of day and weather ---- */
function waHex3(r,g,b){return'#'+((1<<24)|clamp(Math.round(r),0,255)<<16|clamp(Math.round(g),0,255)<<8|clamp(Math.round(b),0,255)).toString(16).slice(1)}
const WAWTINT={rain:['#b6c3d2',.42,'#000000'],storm:['#8d9ab6',.62,'#04060c'],fog:['#dfe6e4',.5,'#3c4644'],snow:['#e2eaf4',.34,'#1c2228'],sand:['#ffd7a0',.5,'#2c1e0a']};
/* -> {mul, add, a}: multiply by lerp(white,mul,a), then add `add` at alpha a. Clear noon returns a = 0. */
function worldTint(hour,weather){const h=((+hour||0)%24+24)%24,wk=weather&&typeof weather==='object'?weather.kind:weather,
  n=h<4.5||h>=20.5?1:h<6.5?(6.5-h)/2:h>18.5?(h-18.5)/2:0,wd=Math.max(0,1-Math.abs(h-18.6)/1.9),wm=Math.max(0,1-Math.abs(h-6.4)/1.6),wr=Math.max(wd,wm);
 let m=[255,255,255],ad=[0,0,0];const mulBy=(hex,a)=>{const v=parseInt(hex.slice(1),16);m[0]*=(255+((v>>16)-255)*a)/255;m[1]*=(255+((v>>8&255)-255)*a)/255;m[2]*=(255+((v&255)-255)*a)/255},
  addBy=(hex,a)=>{const v=parseInt(hex.slice(1),16);ad[0]+=(v>>16)*a;ad[1]+=(v>>8&255)*a;ad[2]+=(v&255)*a};
 if(wr>0)mulBy(wd>=wm?'#ffb48c':'#ffd2b4',wr*.6*(1-n*.8));
 if(n>0){mulBy('#7484d6',n*.8);addBy('#04081c',n*.8)}
 const T=WAWTINT[wk];if(T){mulBy(T[0],T[1]);addBy(T[2],T[1]*(1-n*.6))}
 if(m[0]>254.5&&m[1]>254.5&&m[2]>254.5&&ad[0]+ad[1]+ad[2]<1)return{mul:'#ffffff',add:'#000000',a:0};
 return{mul:waHex3(m[0],m[1],m[2]),add:waHex3(ad[0],ad[1],ad[2]),a:1}}
/* weather patterns: 64x64 seamless tiles of hard pixels, scrolled; two layers each */
function waWx(kind,layer){const key=kind+layer;let c=WA.wx.get(key);if(c)return c;const S=kind==='fog'?128:64,P=waP(S,S),R=waRng(900+layer*7+kind.length),put=(x,y,k)=>P.p(((x%S)+S)%S,((y%S)+S)%S,k);
 if(kind==='rain'||kind==='storm'){const n=kind==='storm'?(layer?34:26):(layer?20:14);for(let i=0;i<n;i++){const x=(R()*S)|0,y=(R()*S)|0,L=layer?3:5,k=layer?'p':'q';for(let j=0;j<L;j++)put(x-(j>>1),y+j,j===L-1&&!layer?'r':k)}}
 else if(kind==='snow'){const n=layer?26:16;for(let i=0;i<n;i++){const x=(R()*S)|0,y=(R()*S)|0;put(x,y,layer?'q':'r');if(!layer&&R()<.4){put(x+1,y,'r');put(x,y+1,'q')}}}
 else if(kind==='sand'){const n=layer?30:18;for(let i=0;i<n;i++){const x=(R()*S)|0,y=(R()*S)|0,L=layer?2+((R()*3)|0):4+((R()*5)|0);for(let j=0;j<L;j++)put(x+j,y+(j>L*.6?1:0),layer?'c':'d')}for(let i=0;i<40;i++)put((R()*S)|0,(R()*S)|0,'e')}
 else{const nz=waFbm(950+layer*5,32);for(let y=0;y<S;y++)for(let x=0;x<S;x++){const v=nz[((y*2)&WAM)*WAP+(x&WAM)],by=(WABAY[(y&3)*4+(x&3)]+.5)/16;if(v>.5&&by<(v-.5)*3.2)P.p(x,y,layer?'q':'l')}}
 c=waCanvas(P);WA.wx.set(key,c);return c}
function waTile(q,c,w,h,ox,oy){const S=c.width;ox=((Math.round(ox)%S)+S)%S;oy=((Math.round(oy)%S)+S)%S;for(let y=oy-S;y<h;y+=S)for(let x=ox-S;x<w;x+=S)q.drawImage(c,x,y)}
/* o = {kind, frame, wind}. `frame` may be fractional and may run faster than the tile counter: motion is frame * px per frame
   (rain falls 9 px a frame, so ~10 fps or more reads best); reduced motion freezes the pattern. */
function drawWeatherPx(q,w,h,o){if(!waInit()||!o)return;const kind=o.kind;if(!kind||kind==='clear')return;const rm=waRM(),f=rm?0:+o.frame||0,wind=o.wind==null?.4:clamp(+o.wind,-1,1),a0=q.globalAlpha;q.save();q.beginPath();q.rect(0,0,w,h);q.clip();
 if(kind==='rain'||kind==='storm'){const sp=kind==='storm'?12:9;if(wind<0){q.translate(w,0);q.scale(-1,1)}
  q.globalAlpha=a0*.45;waTile(q,waWx(kind,1),w,h,-f*sp*.3,f*sp*.62);q.globalAlpha=a0*.7;waTile(q,waWx(kind,0),w,h,-f*sp*.5,f*sp);
  if(kind==='storm'&&!rm){const fi=Math.floor(f),cyc=Math.floor(fi/36),at=(waHash(cyc,7,3)*30)|0,d=fi%36-at;if(d===0||d===2){q.globalAlpha=a0*(d?.16:.3);q.fillStyle=PAL.r;q.fillRect(0,0,w,h)}}}
 else if(kind==='snow'){q.globalAlpha=a0*.7;waTile(q,waWx(kind,1),w,h,f*wind*1.2+Math.sin(f*.21)*3,f*1.1);q.globalAlpha=a0*.95;waTile(q,waWx(kind,0),w,h,f*wind*2+Math.sin(f*.17+1)*4,f*1.9)}
 else if(kind==='sand'){const d=wind<0?-1:1;q.globalAlpha=a0*.5;waTile(q,waWx(kind,1),w,h,d*f*7,Math.sin(f*.13)*3);q.globalAlpha=a0*.75;waTile(q,waWx(kind,0),w,h,d*f*13,f*.6)}
 else if(kind==='fog'){const d=wind<0?-1:1;q.globalAlpha=a0*.38;waTile(q,waWx(kind,1),w,h,d*f*.35,20);q.globalAlpha=a0*.5;waTile(q,waWx(kind,0),w,h,d*f*.8+40,0)}
 q.restore();q.globalAlpha=a0}
const WAKEYC=['X','v','B','k','p','4','d','r'];
function worldKeyColor(t,river,road){return road?(t===7?'n':t===6?'j':'m'):river&&t!==0?'x':WAKEYC[t&7]||'X'}

/* ================= Phase 7 (look): parties by goal, nests, town dressing =================
   drawBandPx(q,x,y,{goal,house,...}): goal 'caravan' (a covered wagon behind an ox team), 'patrol' (mounted knights in the
   house's colours under its banner), 'raid' (the faction's band carrying torches), anything else (roam, a nest's guard band)
   the roaming band as before. Nests (G.nests) are sites: drawSitePx({kind:'nest',f,tier}) grows from burrow to fortified lair. drawTownDecoPx(q,x,y,{size,own,sit,pros,frame,night}) paints an overlay on the
   town sprite (same box and anchor): the owner's pennant, fires and smoke when raided, bunting at a festival, the plague flag,
   bare stalls in famine, market awnings in a boom, siege tents, a poorer or richer look by prosperity.
   All sprites are cached per variant (waSprite); nothing is allocated per frame. */
const WABNS=new Map();
function waBnOf(b0){if(!b0||typeof BANNERC!=='object')return null;let b=b0;try{if(typeof bannerFix==='function')b=bannerFix(b0)}catch(e){}
 const sig=b.c1+'.'+b.c2+'.'+b.emblem+(b.div&&b.div!=='plain'?'.'+b.div+b.c3:'');let v=WABNS.get(sig);if(v!==undefined)return v;const ramp=k=>{const c=BANNERC[k];return c&&Array.isArray(c.r)?c.r:PAL[k]?[k,k,k]:null},A=ramp(b.c1);
 v=null;if(A){const C=ramp(b.c2===b.c1?'l':b.c2)||['m','l','r'],E=typeof EMBLEMS==='object'&&EMBLEMS[b.emblem]?EMBLEMS[b.emblem].r:null;
  let em=null;if(E){const m=8,pick={'#':3,'+':2,'-':1,'=':2};em=[];for(let y=0;y<m;y++){let r='';for(let x=0;x<m;x++){let best='.',bw=0;for(let j=0;j<2;j++)for(let i=0;i<2;i++){const ch=(E[y*2+j]||'')[x*2+i]||'.',w=pick[ch]||0;if(w>bw){bw=w;best=ch}}r+=best}em.push(r)}}
  v={A,C,em,sig,D:b.div&&b.div!=='plain'?ramp(b.c3):null,dv:b.div}}if(WABNS.size>40)WABNS.clear();WABNS.set(sig,v);return v}
/* a small pennant (w x h) in a banner's colours, swallowtail, waving with f; dir 1 flies right */
function waPennant(P,x,y,w,h,bn,f,dir){const A=bn?bn.A:['f','g','h'],C=bn?bn.C:['m','l','r'];
 for(let i=0;i<w;i++){const yo=((i+(f&3))>>1)&1;for(let j=0;j<h;j++){if(i===w-1&&j===(h>>1)&&h>2)continue;const k=j===0?A[2]:j===h-1?A[0]:A[1];P.p(x+dir*(1+i),y+j+yo,k)}}
 if(w>3&&h>2){const cx=x+dir*(1+(w>>1)-1),yo=((((w>>1)-1)+(f&3))>>1)&1;P.p(cx,y+(h>>1)+yo,C[1]);if(h>3)P.p(cx+dir,y+(h>>1)+yo,C[2])}}

/* ---- the caravan: covered wagon, ox team, drover; guards at k >= 2 ---- */
const WAOX={b:['..........l.','.........lHl','..HHHHHHHHH0','.jHHHHHHHHHk','.jjHHHHHHjj.'],la:['.j.j....j.j.','.j.j....j.j.'],lb:['..jj.....jj.','.j..j..j...j']};
const WACART=['..lllllllllll....','.llllllllllllm...','lllmllllmlllmmn..','llllllllllllmmn..','mmmmmmmmmmmmmnn..','kkkkkkkkkkkkkkkkj','jjjjjjjjjjjjjjjji'];
function waWheel(P,x,y,f){P.s(x,y,f&1?['.iii.','i.k.i','ik.ki','i.k.i','.iii.']:['.iii.','ik.ki','i.a.i','ik.ki','.iii.'])}
function waCaravanPaint(P,k,f,moving,bn,gd){const B=P.h-4,cx=P.w>>1,st=i=>moving?((f+i)&1):0,up=i=>moving&&((f+i)&3)===1?1:0;
 // wagon behind (left), ox in front (right), the drover walks beside the ox
 const wx=cx-15,wy=B-11+up(3)*0;P.s(wx,wy,WACART);for(let i=2;i<12;i+=4)P.p(wx+i,wy,'m');
 P.p(wx+3,wy+2,'c');P.p(wx+4,wy+2,'c');P.p(wx+3,wy+3,'b');P.p(wx+4,wy+3,'b');   // a brass lantern hook / painted mark
 waWheel(P,wx+1,wy+6,moving?f:0);waWheel(P,wx+10,wy+6,moving?f+1:0);
 for(let i=0;i<4;i++)P.p(wx+17+i,wy+6,'j');   // the shaft to the yoke
 waFigure(P,WAOX,cx+9,B,st(0),up(0));
 P.s(wx+13,wy-3,['.HH.','HssH','.ks.','kkkk']);   // the drover on the bench
 if(bn){P.r(wx+1,wy-7,1,8,'j');P.p(wx+1,wy-8,'d');waPennant(P,wx+1,wy-7,5,3,bn,moving?f:f>>1,-1)}   // the owner's pennant on the tailboard
 if(typeof gd==='string'&&gd[0]==='g'){waCaravanGuards(P,cx,B,+gd[1]||1,+gd[2]||0,+gd[3]||0,st,up,bn);P.outline();return}   // the guard detail (42-caravans.js): 'g' tier figures captain
 if(k>=2){const gd=waFigure(P,WAFIG.co,cx-19,B+1,st(2),up(2),{'5':'j',c:'k',q:'p',p:'o'});waWeapon(P,'spear',gd)}
 if(k>=3){const gd=waFigure(P,WAFIG.co,cx+18,B+1,st(3),up(3),{'5':'j',c:'k',q:'p',p:'o'});waWeapon(P,'spear',gd)}
 P.outline()}
/* the caravan's guards beside the wagon, by the quality its town could pay for: militia in brown with spears and a hunting bow (tier 1-2),
   guards in the owner's colours (else steel grey) with shields and crossbows (3+), and a captain with a plumed helm and a sword (cap) */
function waCaravanGuards(P,cx,B,t,n,cap,st,up,bn){const A=bn?bn.A:['4','o','p'],C=bn?bn.C:['m','l','r'];
 const mil={'5':'j',c:'k',q:'p',p:'o'},hir={'5':'H','7':'i',c:'k',q:'p',p:'o'},liv={'5':A[1],'7':A[0],c:C[1],q:'q',p:'p'},kit=t<=1?mil:t===2?hir:liv;
 const spots=[[cx-19,B+1],[cx+18,B+1],[cx-4,B+2]],wp=t<=2?['spear','bow','spear']:['shield','bow','sword'];
 for(let i=0;i<Math.min(3,n);i++){const isCap=cap&&i===2,b=waFigure(P,WAFIG.co,spots[i][0],spots[i][1],st(2+i),up(2+i),isCap?Object.assign({},liv,{q:'q',p:'q'}):kit);waWeapon(P,isCap?'sword':wp[i],b);
  if(isCap){P.p(b.x0+3,b.y-1,C[1]);P.p(b.x0+2,b.y-2,C[2]);P.p(b.x0+1,b.y-2,C[1]);P.p(b.x0+1,b.y-3,C[2])}}}

/* ---- house patrol: mounted knights in the house's caparison, the lead under the house banner ---- */
const WAKNIGHT={b:['.....qq........','....qrqp.......','....q0qp.......','...SPRPS.......','...PPPPP....kk.','....PPs....kHHj','.kHHRPPRHHkHHj0','kHHHPPPPPHHHjH.','HkHHPPPPPHj..j.','.jHHSSSSSj.....'],
 la:['.H.j....H.j....','.H.j....H.j....','.o.o....o.o....'],lb:['..Hj...H..j....','.H..j.H....j...','.o..o.o.....o..']};
function waKnight(P,x,by,step,up,bn){const A=bn?bn.A:['f','g','h'],C=bn?bn.C:['m','l','r'];return waFigure(P,WAKNIGHT,x,by,step,up,{P:A[1],R:A[2],Q:A[0],S:C[1]})}
function waPatrolPaint(P,k,f,moving,bn){const B=P.h-4,cx=P.w>>1,st=i=>moving?((f+i)&1):0,up=i=>moving&&((f+i)&3)===1?1:0;
 const L=k>=3?[[cx+8,B-1],[cx-8,B+1],[cx+1,B+3]]:k===2?[[cx+5,B-1],[cx-7,B+1]]:[[cx,B]];
 L.forEach((e,i)=>{const kb=waKnight(P,e[0],e[1],st(i),up(i),bn);const lx=kb.x0+9,ly=kb.y;
  if(i===0){// the banner on a tall staff
   const ph=12;P.r(lx,ly-ph,1,ph+5,'j');P.p(lx,ly-ph-1,'d');if(bn&&bn.em)waBanner(P,lx,ly-ph,bn,moving?f:f>>1);else waPennant(P,lx,ly-ph,6,4,bn,moving?f:f>>1,-1)}
  else{// a lance with a pennon
   P.r(lx+1,ly-7,1,11,'k');P.p(lx+1,ly-8,'q');P.p(lx+1,ly-9,'r');waPennant(P,lx+1,ly-7,3,2,bn,moving?f+i:(f+i)>>1,-1)}});
 P.outline()}

/* ---- raiders: the faction's band with torches ---- */
function waTorch(P,B,f,i){const x=B.x0+B.w,y=B.y;for(let j=0;j<6;j++)P.p(x,y+1+j,'j');const fl=P.flat;P.flat=true;const a=(f+i)&3;
 P.p(x,y,'E');P.p(x,y-1,a&1?'y':'E');P.p(x+(a>>1?1:-1),y-1,'E');P.p(x,y-2,a===2?'e':'y');if(a!==0)P.p(x+(a===1?1:0),y-3,'y');P.p(x+((a&1)?-1:1),y-4-(a>>1),'p');P.flat=fl}
function waRaidPaint(P,fk,k,f,moving){const B=P.h-4,cx=P.w>>1,F=WAFIG[fk]||WAFIG.bandit,n=clamp(k+1,2,4),gap=F.gap,x1=cx+((n-1)*gap>>1),L=[],T=[];
 for(let i=0;i<n;i++)L.push({i,x:x1-i*gap,y:B-(i&1?2:0)+1});
 L.slice().sort((a,b)=>a.y-b.y).forEach(e=>{const i=e.i,st=moving?((f+i)&1):0,up=F.hover?((f+i*2)>>1)&1:moving&&((f+i)&3)===1?1:0;
  if(i===1){const px=e.x-(F.b[0].length>>1)-1,py=e.y-up,ph=12;P.r(px,py-ph,1,ph+1,'i');waFlag(P,px,py-ph,5,4,F.flag,moving?f:f>>1,-1,F.flag[3])}
  const bx=waFigure(P,F,e.x,e.y,st,up,null);if(i!==1)T.push([bx,i]);else waWeapon(P,F.wpn==='bow'?'sword':F.wpn||'sword',bx)});
 P.outline();for(const t of T)waTorch(P,t[0],f,t[1])}

/* ---- nests: the lair grows with its tier (1 a burrow, 2 the lair, 3 the lair with outworks, totems and a war banner) ---- */
WASITE.nest1={w:30,h:22};WASITE.nest2={w:36,h:30};WASITE.nest3={w:48,h:36};
const WANESTC={gob:['v','w','B'],undead:['l','m','n'],beast:['j','i','H'],orc:['t','u','i'],bandit:['p','o','G'],void:['C','D','G'],serpent:['5','7','3'],ent:['A','B','w'],ogre:['t','u','i'],wyvern:['g','f','D']};
function waNestPaint(P,fk,tier,night,f){const B=P.h-3,cx=P.w>>1,C=WANESTC[fk]||WANESTC.bandit;
 if(tier<=1){waGround(P,cx,B-1,12,4,'j','i');
  P.ell(cx,B+1,8,7,(x,y,a,b)=>{if(y>B)return null;const l=-a*.6-b*.8+(waHash(x,y,3)-.5)*.35;return l>.7?'k':l>.15?'j':'i'});
  P.ell(cx+1,B-1,3.2,3,(x,y)=>y>B?null:'0');P.p(cx,B-2,night||(f&4)?'y':'0');P.p(cx+2,B-2,night||(f&4)?'y':'0');
  for(const s of [[cx-9,B],[cx+8,B-1],[cx-6,B+1]])P.s(s[0],s[1]-1,['l.l','.l.']);P.r(cx-5,B-12,1,6,'i');P.s(cx-6,B-14,['.'+C[0]+'.',C[0]+C[1]+C[0]]);
  P.outline();return}
 const dx=tier>=3?6:0;if(tier>=3){waGround(P,cx,B-1,23,6,'i','j')}
 // the lair itself, drawn into a 36 x 30 sub-box centred
 const sub=waP(36,30);sub.h=30;waLair(sub,WAFIG[fk]||WAMONF[fk]||fk==='beast'?fk:'bandit',night,f);
 for(let y=0;y<30;y++)for(let x=0;x<36;x++){const v=sub.d[y*36+x];if(v){const X=x+dx,Y=y+(P.h-30);if(X>=0&&Y>=0&&X<P.w&&Y<P.h){P.d[Y*P.w+X]=v;P.sol[Y*P.w+X]=sub.sol[y*36+x]}}}
 if(tier>=3){// palisade wings, skull totems and a tall war banner in the faction's colours
  for(let x=1;x<=7;x++){const hh=5+(x&1),k=x&1?'j':'k';P.r(x,B-hh+1,1,hh,k);P.p(x,B-hh,'l')}for(let x=P.w-8;x<=P.w-2;x++){const hh=5+(x&1),k=x&1?'j':'k';P.r(x,B-hh+1,1,hh,k);P.p(x,B-hh,'l')}
  for(const tx of [4,P.w-5]){P.r(tx,B-14,1,8,'i');P.s(tx-1,B-17,['lll','0l0','.l.'])}
  P.r(cx+1,B-34,1,16,'i');waFlag(P,cx+1,B-34,6,4,[C[0],C[1],C[2]],f>>1,1,'l');
  P.outline();const fl=P.flat;P.flat=true;if(night||(f&4)){P.p(4,B-16,'g');P.p(P.w-5,B-16,'g')}P.flat=fl}}
function waNestTier(n){if(typeof nestTier==='function'){try{const t=nestTier(n);if(t>=1)return clamp(t|0,1,3)}catch(e){}}const s=+(n&&n.str)||1;return s<1.7?1:s<2.5?2:3}

/* ---- town dressing overlay ---- */
const WARAIDF=[null,[[8,-8],[17,-5],[25,-9]],[[8,-14],[27,-6],[35,-12]],[[14,-21],[38,-14],[24,-7],[46,-8]]];
const WAFLAME=[['..y..','.yEy.','.EyE.','EEKEE','.KEK.'],['.y...','.Ey.y','EyEE.','EEyKE','.KEK.'],['...y.','y.yE.','.EEyE','EKyEE','.KEK.'],['..y..','.yE..','.EyEy','EEKEE','.KEK.']];
function waBigFire(P,x,y,f){P.s(x-2,y-4,WAFLAME[f&3])}
const WASITK=['raided','festival','famine','plague','boom','siege'];
function waTownSitMask(t){let m=0;const S=t&&Array.isArray(t.sit)?t.sit:[];for(const s of S){const k=s&&(s.k||s);const i=WASITK.indexOf(k);if(i>=0)m|=1<<i}return m}
function waTownDeco(P,size,own,mask,pr,night,f){const O=4,B=P.h-3,sz=clamp(size|0||1,1,3),TW=WASITE['town'+sz].w,TH=WASITE['town'+sz].h,fl0=P.flat,X=x=>O+x;
 const has=k=>!!(mask&(1<<WASITK.indexOf(k)));
 // prosperity: 0 poor (soot and patched roofs, a broken fence), 2 rich (a kept garden, a cart of goods)
 if(pr===0){P.flat=true;for(let i=0;i<10;i++){const x=X(3+((waHash(i,sz,61)*(TW-6))|0)),y=B-4-((waHash(i,sz,62)*(TH*.6))|0);P.p(x,y,'o');P.p(x+1,y,'n')}P.flat=fl0;P.s(X(TW-6),B-1,['j.k.j','jk.kj'])}
 else if(pr===2){P.s(X(-3),B-1,['.Av.h','vBByB','.ii.i']);P.s(X(TW-3),B,['.dc.','kjjk','.i.i'])}
 // the owner's pennant: a tall pole beside the town with the house banner
 if(own){const px=X(sz===3?TW-7:sz===2?TW-3:TW-2),py=B-(sz===3?44:sz===2?34:24);P.r(px,py,1,B-py+1,'j');P.p(px,py-1,'d');P.p(px-1,B,'i');P.p(px+1,B,'i');
  if(own.em&&sz>=2)waBanner(P,px,py,own,f>>1);else waPennant(P,px,py,7,5,own,f>>1,-1)}
 if(has('festival')){// bunting across the roofs, coloured pennons, lanterns at night
  const y0=B-(sz===3?26:sz===2?18:12),x0=X(1),x1=X(TW-2),cols=['g','y','x','A','C','E'];
  for(let x=x0;x<=x1;x++){const t=(x-x0)/(x1-x0),y=Math.round(y0+Math.sin(t*Math.PI)*3);P.p(x,y,'m');if((x-x0)%3===1){const c=cols[((x-x0)/3|0)%cols.length];P.p(x,y+1,c);P.p(x+1,y+1,c);P.p(x,y+2,c)}}
  P.r(x0-1,y0-1,1,B-y0+2,'j');P.r(x1+1,y0-1,1,B-y0+2,'j');P.p(x0-1,y0-2,'d');P.p(x1+1,y0-2,'d')}
 if(has('boom')){// a striped market awning and stacked goods by the road
  const ax=X(TW>>1);P.s(ax-14,B-4,['ggrrggrr','grrggrrg','j......j','j.dc.kj.','kjjjjjjk']);P.s(ax+8,B-2,['.ll.','kjjk','kjji'])}
 if(has('famine')){// bare stalls
  P.s(X((TW>>1)-13),B-2,['j......j','j......j','kjjjjjjk']);P.s(X((TW>>1)+7),B-1,['.kk.','k..k','.ii.'])}
 if(has('plague')){// a black plague flag by the road
  const gx=X(-2);P.r(gx,B-14,1,15,'i');P.p(gx,B-15,'d');P.s(gx+1,B-14,['GGGGG','GGgGG','GgggG','GGgGG','GGGGG'])}
 if(has('siege')){// besiegers' tents and a ram before the gate
  waTent(P,X(-1),B+1,3,7,['l','m','n']);waTent(P,X(TW),B+1,3,7,['l','m','n']);P.s(X((TW>>1)-4),B-1,['.kkkkkk.','kjjjjjjk','.i.ii.i.'])}
 if(has('raided'))WARAIDF[sz].forEach((p,i)=>waBigFire(P,X(p[0]),B+p[1],f+i));
 P.outline();P.flat=true;
 if(has('festival')&&night){const y0=B-(sz===3?26:sz===2?18:12),x0=X(1),x1=X(TW-2);for(let i=0;i<4;i++){const x=x0+3+i*((x1-x0-6)/3|0),y=Math.round(y0+Math.sin((x-x0)/(x1-x0)*Math.PI)*3)+2;P.p(x,y,'y');P.p(x,y+1,'E')}}
 if(has('famine')){const a=f&3;for(const c of [[X(2+a),B-TH+6],[X(TW-6-a),B-TH+10]]){P.p(c[0],c[1]+(a&1),'0');P.p(c[0]-1,c[1]-1,'0');P.p(c[0]+1,c[1]-1,'0')}}
 if(has('plague'))for(let i=0;i<8;i++){const ph=(f+i*2)&7,x=X(2+((waHash(i,3,71)*(TW-4))|0)),y=B-4-((waHash(i,4,71)*(TH*.55))|0)-(ph>>1);P.p(x,y,ph<4?'A':'B')}
 if(has('raided')){// soot and columns of smoke over the burning roofs
  for(let i=0;i<16;i++){const x=X(3+((waHash(i,sz,81)*(TW-6))|0)),y=B-2-((waHash(i,sz,82)*(TH*.55))|0);P.p(x,y,'0');P.p(x+1,y,'1')}
  WARAIDF[sz].forEach((p,i)=>{const sx=X(p[0]),sy=p[1]-6;for(let j=0;j<7;j++){const ph=(f+i+j)&3,xx=sx+((j+ph)&1)-(j>>1),yy=sy-j*2-(ph>>1)+B;const k=j<2?'4':j<4?'o':'n';P.p(xx,yy,k);P.p(xx+1,yy,k);if(j>1&&j<5)P.p(xx,yy-1,k)}})}
 P.flat=fl0}
function drawTownDecoPx(q,x,y,o){if(!waInit())return;o=o||{};const sz=clamp(o.size|0||1,1,3),D=WASITE['town'+sz],W=D.w+8,H=D.h+18,f=waRM()?0:(o.frame|0)&3,night=o.night?1:0,mask=o.mask|0,pr=o.pr==null?1:o.pr|0,own=o.own||null;
 if(!mask&&!own&&pr===1)return;const key='deco'+sz+'|'+mask+'|'+pr+'|'+(own?own.sig:'-')+'|'+night+'|'+f;
 const s=waSprite(key,W,H,W>>1,H-2,P=>waTownDeco(P,sz,own,mask,pr,night,f));   // 4 px wider each side and 18 px taller than the town box, same ground line
 q.drawImage(s.cv,Math.round(x)-s.ax,Math.round(y)-s.ay)}
/* ---- a rival mercenary company (goal 'merc'): a file of swords in the rival's livery (cloth c1, trim c2) under its banner;
   k = 1..4 figures by strength, a captain with a c2 plume leads from k >= 3 ---- */
function waMercPaint(P,k,f,moving,bn){const B=P.h-4,cx=P.w>>1,F=WAFIG.co,n=clamp(k,1,4)+1,gap=7,x1=cx+((n-1)*gap>>1)+1,L=[],A=bn?bn.A:['f','g','h'],C=bn?bn.C:['m','l','r'];
 for(let i=0;i<n;i++)L.push({i,x:x1-i*gap,y:B-(i&1?2:0)+1-(i===3?1:0)});
 const kits=[{'5':A[1],'7':A[0],c:C[1]},{'5':A[1],'7':A[0],c:C[1],q:C[1],p:C[0],o:C[0]},{'5':C[1],'7':C[0],c:A[1],q:'p',p:'o'},{'5':A[1],'7':A[0],c:C[2],q:'o',p:'o'},{'5':A[0],'7':A[0],c:C[1]}];
 const wps=['sword','spear','bow','shield','axe'],bi=1;
 L.slice().sort((a,b)=>a.y-b.y).forEach(e=>{const i=e.i,st=moving?((f+i)&1):0,up=moving&&((f+i)&3)===1?1:0;
  if(i===bi){const px=e.x-(F.b[0].length>>1)-1,py=e.y-up,ph=21;P.r(px,py-ph,1,ph+1,'i');P.p(px,py-ph-1,'d');
   if(bn&&bn.em)waBanner(P,px,py-ph,bn,moving?f:f>>1);else waPennant(P,px,py-ph,8,5,bn,moving?f:f>>1,-1)}
  const bx=waFigure(P,F,e.x,e.y,st,up,kits[i%kits.length]);if(i!==bi)waWeapon(P,wps[i%wps.length],bx);
  if(i===0&&k>=3){P.p(bx.x0+3,bx.y-1,C[1]);P.p(bx.x0+2,bx.y-2,C[2]);P.p(bx.x0+1,bx.y-2,C[1]);P.p(bx.x0+1,bx.y-3,C[2])}});
 P.outline()}
function drawGoalPx(q,x,y,o){const gl=o.goal,k=clamp(Math.round(+o.str||1),1,3),f=waRM()?0:o.frame|0,mv=!!o.moving&&!waRM(),dir=o.dir<0?-1:1;let key,paint,w=48,h=40;
 if(gl==='caravan'){const bn=waBnOf(o.house),gd=typeof o.guard==='string'?o.guard:'';key='car'+k+gd+(bn?bn.sig:'-');paint=P=>waCaravanPaint(P,k,f&3,mv,bn,gd)}
 else if(gl==='patrol'){const bn=waBnOf(o.house);key='pat'+k+(bn?bn.sig:'-');paint=P=>waPatrolPaint(P,k,f&3,mv,bn);h=44}
 else if(gl==='merc'){const bn=waBnOf(o.house),kk=clamp(Math.round(+o.str||1)+(o.n>8?1:0),1,4);key='mrc'+kk+(bn?bn.sig:'-');paint=P=>waMercPaint(P,kk,f&3,mv,bn);w=52;h=44}
 else{const fk=WAFIG[o.f]?o.f:'bandit';key='raid'+fk+k;paint=P=>waRaidPaint(P,fk,k,f&3,mv)}
 const s=waSprite(key+'|'+(f&3)+'|'+(dir<0?0:1)+'|'+(mv?1:0),w,h,w>>1,h-3,P=>{paint(P);if(dir<0)P.mirror()});
 waShadow(q,x,y,gl==='caravan'?30:gl==='patrol'?14+k*8:gl==='merc'?16+k*7:10+k*7,6);q.drawImage(s.cv,Math.round(x)-s.ax,Math.round(y)-s.ay)}

/* Warm-up: the ground textures and the tree/peak pool are pure tables. Made while the title is idle, the first world frame after a
   new game does not wait for them (the same tables, only made earlier; nothing is drawn). */
if(typeof window!=='undefined'&&typeof document!=='undefined'&&typeof HTMLCanvasElement!=='undefined'){const waWarm=()=>{if(WA.ok||(typeof mode!=='undefined'&&mode!=='title'))return;try{if(waInit())waPool()}catch(e){}};
 setTimeout(()=>{if(typeof requestIdleCallback==='function')requestIdleCallback(waWarm,{timeout:3000});else waWarm()},2500)}   // well after load, while the title waits for a tap

/* ================= CRISES on the world map (crises agent): crisis sites, crisis hosts, fallen towns =================
   Sites (G.sites kinds, 18-crises.js): grave (a risen graveyard), throne (the Bone Throne), hcamp (the camp of the Great Horde), ecamp (the
   Emperor's Camp). Hosts: WAFIG.dead / horde / barb (bands and raids). Towns: the crisis situations crsiege / haunted / occupied / sacked /
   burned are bits of the town dressing mask (waTownSitMask), so a fallen town is a new dressing sprite and part of the draw signature. */
Object.assign(WASITE,{grave:{w:36,h:28},throne:{w:44,h:42},hcamp:{w:54,h:40},ecamp:{w:62,h:48}});
Object.assign(WAFIG,{
 dead:{b:['..lll..','.lllll.','.lZlZl.','..lml..','.GmlmG.','l.GmG.l','..lll..'],la:['..l.l..','..l.l..','.ll.ll.'],lb:['..l.l..','.l...l.','ll...ll'],flag:['D','G','1','Z'],wpn:'sword',gap:8},
 horde:{b:['...www...','..wwwww..','..w0w0w..','..lwwwl..','.iiwwwii.','wiijjjiiw','w.iiiii.w','v.aaaaa.v'],la:['..ii.ii..','..ii.ii..','..aa.aa..'],lb:['..ii.ii..','.ii...ii.','.aa...aa.'],flag:['4','w','1','l'],wpn:'axe',gap:10},
 barb:{b:['.n...n.','.nqqqn.','..sts..','.HHHHH.','iHkkkHi','s.jjj.s','..aia..'],la:['.jj.jj.','.jj.jj.','.aa.aa.'],lb:['.jj.jj.','jj...jj','aa...aa'],flag:['x','X','G','n'],wpn:'axe',gap:8}});
// a risen graveyard: a broken fence, leaning stones, open graves and a dead tree; a sick green glow at night
function waGrave(P,night,f){const B=P.h-3;waGround(P,18,B-1,17,5,'3','4');
 for(let x=2;x<=33;x+=3){if(x===17||x===20)continue;const hh=4+(x%5===0?0:1)-((x*7)%4===0?2:0);if(hh<2)continue;P.r(x,B-hh+1,1,hh,'i');P.p(x,B-hh,'j')}P.r(2,B-3,32,1,'i');P.p(18,B-3,'.');
 for(const g of [[6,B-6],[13,B-9],[24,B-8],[29,B-5],[10,B-3]]){P.s(g[0],g[1]-4,['.mm.','mllm','mlpm','mlpm']);}
 for(const g of [[17,B-6],[21,B-10],[8,B-10]]){P.s(g[0],g[1],['jaaaj','a000a','.aaa.'])}
 P.r(27,B-22,1,14,'i');P.s(24,B-24,['j...j..','.j.j..j','..jj.j.','...jj..']);P.s(26,B-15,['j.','.j']);
 P.outline();const fl=P.flat;P.flat=true;const gl=night?'Z':'7';for(let i=0;i<5;i++){const ph=(f+i*3)&7,x=6+((waHash(i,2,91)*24)|0),y=B-4-((waHash(i,3,91)*10)|0)-(ph>>1);if(ph<5)P.p(x,y,ph<2?gl:'6')}P.flat=fl}
// the Bone Throne: a hill of skulls and long bones, a black throne of ribs on top, a crowned skeleton with green eyes
function waThrone(P,night,f){const B=P.h-3,cx=22;waGround(P,cx,B-1,20,5,'4','1');
 P.ell(cx,B+2,18,15,(x,y,a,b)=>{if(y>B)return null;const h=waHash(x,y,93);return h<.12?'0':h<.4?'m':h<.7?'l':'n'});
 for(let i=0;i<14;i++){const x=cx-15+((waHash(i,1,94)*30)|0),y=B-2-((waHash(i,2,94)*10)|0);if(P.g(x,y)){P.p(x,y,'0');P.p(x+2,y,'0')}}
 P.r(cx-6,B-26,12,14,'1');P.r(cx-6,B-26,1,14,'G');P.r(cx+5,B-26,1,14,'0');for(let y=B-24;y<=B-15;y+=3)P.r(cx-5,y,10,1,'m');
 for(const s of [[-7,-28],[6,-28],[-3,-30],[2,-30]])P.s(cx+s[0],B+s[1],['ll','00']);P.r(cx-7,B-13,14,2,'m');P.r(cx-7,B-12,14,1,'n');
 P.s(cx-3,B-22,['.ddd.','dldld','.lll.','.l0l.','..l..','.GDG.','GDDDG','GDlDG','.GDG.']);
 P.r(cx+5,B-26,1,15,'0');P.p(cx+5,B-27,'6');P.outline();const fl=P.flat;P.flat=true;const e=night||(f&4)?'Z':'6';P.p(cx-2,B-19,e);P.p(cx,B-19,e);
 for(let i=0;i<4;i++){const ph=(f+i*2)&7;P.p(cx-9+i*6,B-14-ph,ph<4?'6':'7')}P.flat=fl}
// the horde camp: hide tents, wolf pens, a ditch of stakes, skull totems, the warchief's green banner, cookfires
function waHcamp(P,night,f){const B=P.h-3,cx=27;waGround(P,cx,B-1,26,6,'i','j');
 for(let x=1;x<=52;x+=2){if(x>22&&x<32)continue;const hh=4+((x*5)%3);P.r(x,B-hh+1,1,hh,x%4===1?'j':'k');P.p(x,B-hh,'l')}
 waTent(P,10,B-2,6,10,['t','u','i']);waTent(P,43,B-3,6,10,['t','u','i']);waTent(P,27,B-6,9,16,['u','i','a']);waTent(P,18,B,4,7,['t','u','i']);waTent(P,36,B+1,4,7,['t','u','i']);
 for(const tx of [4,49]){P.r(tx,B-16,1,10,'i');P.s(tx-1,B-19,['lll','0l0','.l.'])}
 P.r(cx,B-38,1,20,'i');waFlag(P,cx,B-38,8,6,['4','w','1'],f>>1,1,'l');P.s(cx+3,B-36,['l.l','.0.']);
 P.outline();waFire(P,22,B+1,f);waFire(P,33,B,f+2)}
// the Emperor's Camp: a ring of black stakes on snow, a longhouse with a carved gable and horns, blue banners, smoke
function waEcamp(P,night,f){const B=P.h-3,cx=31;waGround(P,cx,B-1,30,7,'r','n');
 const hx=cx-12,hw=24;P.r(hx,B-14,hw,9,'j');P.r(hx,B-14,hw,1,'k');P.r(hx+hw-1,B-14,1,9,'i');for(let x=hx+2;x<hx+hw-1;x+=4)P.r(x,B-13,1,8,'i');
 for(let j=0;j<9;j++){const ww=hw+4-j*3;if(ww<2)break;for(let i=0;i<ww;i++)P.p(hx-2+Math.floor(j*1.5)+i,B-15-j,j===0?'a':i<ww*.45?'k':'j')}
 P.s(cx-2,B-28,['n...n','.n.n.','..n..']);P.r(cx-1,B-9,3,4,'0');P.p(cx,B-9,night?'y':'a');
 for(let x=1;x<=60;x+=2){if(x>26&&x<36)continue;const hh=8+((x*7)%3);P.r(x,B-hh+1,1,hh,x%4===1?'1':'G');P.p(x,B-hh,'p');P.p(x,B-hh-1,'q')}
 for(const s of [[25,B+1],[36,B+1]]){P.r(s[0],s[1]-14,2,15,'1');P.p(s[0],s[1]-15,'n');P.p(s[0]+1,s[1]-15,'n')}
 for(const bx of [8,53]){P.r(bx,B-26,1,18,'i');waFlag(P,bx,B-26,6,5,['x','X','G'],f>>1,bx<30?1:-1,'n')}
 P.outline();waSmoke(P,cx+6,B-24,f,'q');waSmoke(P,cx-8,B-22,f+1,'q');if(night){const fl=P.flat;P.flat=true;P.p(cx-6,B-11,'y');P.p(cx+6,B-11,'y');P.flat=fl}}
{const d0=drawSitePx;drawSitePx=function(q,x,y,o){o=o||{};const k=o.kind;if(k!=='grave'&&k!=='throne'&&k!=='hcamp'&&k!=='ecamp')return d0(q,x,y,o);if(!waInit())return;
  const D=waSiteDim(o),f=waRM()?0:o.frame|0,night=o.night?1:0,key=k+'|'+night+'|'+(f&7),paint=k==='grave'?P=>waGrave(P,night,f&7):k==='throne'?P=>waThrone(P,night,f&7):k==='hcamp'?P=>waHcamp(P,night,f&7):P=>waEcamp(P,night,f&7);
  const s=waSprite(key,D.w,D.h,D.w>>1,D.h-2,paint);waShadow(q,x,y,D.w-4,7);q.drawImage(s.cv,Math.round(x)-s.ax,Math.round(y)-s.ay)}}
// fallen and besieged towns: the crisis situations join the dressing mask (bits 6..10)
WASITK.push('crsiege','haunted','occupied','sacked','burned');
{const t0=waTownDeco;waTownDeco=function(P,size,own,mask,pr,night,f){const bit=k=>!!(mask&(1<<WASITK.indexOf(k)));const cr=bit('crsiege')||bit('haunted')||bit('occupied')||bit('sacked')||bit('burned');
  if(!cr)return t0(P,size,own,mask,pr,night,f);
  const O=4,B=P.h-3,sz=clamp(size|0||1,1,3),TW=WASITE['town'+sz].w,TH=WASITE['town'+sz].h,X=x=>O+x,fl0=P.flat;
  if(bit('crsiege')){waTent(P,X(-1),B+1,3,7,['l','m','n']);waTent(P,X(TW),B+1,3,7,['l','m','n']);P.r(X(-3),B-12,1,12,'i');waFlag(P,X(-3),B-12,4,3,['1','G','D'],f>>1,1,'l')}
  if(bit('haunted')){P.flat=true;for(let i=0;i<22;i++){const x=X(3+((waHash(i,sz,63)*(TW-6))|0)),y=B-3-((waHash(i,sz,64)*(TH*.7))|0);P.p(x,y,'0');P.p(x+1,y,'1');P.p(x,y+1,'1');if(i%3===0)P.p(x+1,y+1,'4')}P.flat=fl0;
   P.s(X(-3),B-5,['.mm.','mllm','mlpm','mlpm']);P.s(X(TW-1),B-4,['.mm.','mllm','mlpm']);P.r(X(TW-6),B-26,1,26,'i');P.p(X(TW-6),B-27,'l');waFlag(P,X(TW-6),B-26,9,6,['D','G','1'],f>>1,-1,'Z');for(const gx of [X(4),X(TW>>1),X(TW-10)])P.s(gx,B-2,['.mm.','mllm','mlpm'])}
  if(bit('occupied')){P.r(X(-2),B-28,1,28,'i');P.s(X(-3),B-31,['lll','0l0','.l.']);waFlag(P,X(-2),B-27,9,6,['4','w','1'],f>>1,1,'l');P.r(X(TW),B-22,1,22,'i');P.s(X(TW-1),B-25,['lll','0l0','.l.']);waFlag(P,X(TW),B-21,8,6,['4','w','1'],f>>1,-1,'l');P.r(X(TW>>1),B-TH+4,1,10,'i');waFlag(P,X(TW>>1),B-TH+4,6,4,['4','w','1'],f>>1,1,'l')}
  if(bit('burned')){P.r(X(TW-2),B-26,1,26,'i');waFlag(P,X(TW-2),B-26,9,6,['x','X','G'],f>>1,-1,'n');P.r(X(-2),B-20,1,20,'i');waFlag(P,X(-2),B-20,7,5,['x','X','G'],f>>1,1,'n')}
  if(bit('sacked')||bit('burned'))WARAIDF[sz].forEach((p,i)=>waBigFire(P,X(p[0]),B+p[1],f+i));
  P.outline();P.flat=true;
  if(bit('haunted'))for(let i=0;i<14;i++){const ph=(f*2+i*3)&7,x=X(2+((waHash(i,5,72)*(TW-4))|0)),y=B-5-((waHash(i,6,72)*(TH*.6))|0)-(ph>>1);if(ph<6){P.p(x,y,night?'Z':'6');if(ph<3)P.p(x,y-1,'7')}}
  if(bit('sacked')||bit('burned'))for(let i=0;i<12;i++){const x=X(3+((waHash(i,sz,83)*(TW-6))|0)),y=B-2-((waHash(i,sz,84)*(TH*.55))|0);P.p(x,y,'0');P.p(x+1,y,'1')}
  P.flat=fl0}}

/* ================= DUNGEONS on the world map (endgame agent, 24-endgame.js) =================
   G.sites kinds 'dgn' (open: a dungeon waiting to be cleared, a baleful light in its mouth) and 'dgnc' (cleared: the same place gone dark
   and broken), variant o.n = DUNGEONS[k].art: 0 a drowned barrow mound, 1 a deep lair cave, 2 a black keep, 3 a rotting grove.
   Static sprites keyed by kind and variant (the world draw list carries them, so they are in the WSG signature like every site). */
Object.assign(WASITE,{dgn:{w:40,h:36},dgnc:{w:40,h:36}});
function waDgn(P,v,lit){const B=P.h-3,cx=20,G0=v===0?['B','w']:v===1?['k','j']:v===2?['n','4']:['w','B'];waGround(P,cx,B-1,18,5,G0[0],G0[1]);const glow=lit?(v===3?'A':v===0?'6':'g'):'0',glow2=lit?(v===3?'v':v===0?'5':'h'):'1';
 if(v===0){   // a barrow mound: a turf hump, a stone door, standing stones, reeds
  P.ell(cx,B,16,15,(x,y,a,b)=>y>B-1?null:b<-.82?'v':b<-.7&&a<0?'A':a<-.4?'B':a>.45?'7':'w');P.r(cx-5,B-10,11,10,'n');P.r(cx-5,B-11,11,2,'m');P.r(cx-6,B-11,1,11,'n');P.p(cx-5,B-11,'l');P.r(cx-3,B-8,7,8,'0');P.r(cx-2,B-6,5,6,glow);P.r(cx-1,B-4,3,4,glow2);
  for(const sx of [cx-14,cx+12]){P.r(sx,B-12,3,11,'n');P.r(sx,B-12,1,11,'m');P.p(sx+1,B-13,'m')}P.s(cx+6,B-1,['.x.x','xX.X']);P.s(cx-9,B,['x.x','X.X'])}
 else if(v===1){   // a lair: a rock face with a black mouth, bones before it
  P.ell(cx,B-6,18,14,(x,y,a,b)=>y>B-1?null:b<-.55?'p':a<-.2?'o':a>.5?'G':'o');P.ell(cx,B-3,7,8,(x,y,a,b)=>y>B-1?null:'0');if(lit){P.ell(cx,B-1,4,4,(x,y,a,b)=>y>B-1?null:b>.1?glow:'0');P.p(cx,B-2,glow2);P.p(cx-1,B-1,glow2);P.p(cx+1,B-1,glow2);P.p(cx-3,B-6,glow);P.p(cx+3,B-6,glow)}
  P.s(cx-11,B-1,['l.l','.l.','l.l']);P.s(cx+8,B,['lml']);P.p(cx+11,B-1,'l');P.s(cx-2,B,['l.ll'])}
 else if(v===2){   // a black keep: a broken tower and wall, a lit window
  P.r(cx-6,B-28,12,28,'o');P.r(cx-6,B-28,2,28,'p');P.r(cx+4,B-28,2,28,'G');for(let i=0;i<6;i+=2)P.r(cx-6+i*2,B-31,2,3,'o');P.r(cx-14,B-12,8,12,'o');P.r(cx+6,B-9,9,9,'o');P.r(cx-14,B-12,8,1,'p');P.r(cx+6,B-9,9,1,'p');
  P.r(cx-2,B-8,4,8,'0');P.r(cx-1,B-20,2,4,glow);P.p(cx-1,B-21,glow2);P.r(cx-12,B-8,2,3,glow);P.p(cx+10,B-6,glow2);P.s(cx+12,B-12,['..p','.pp'])}
 else{   // a rotting grove: dead trees about a sick light
  const tree=(x,h,lean)=>{for(let j=0;j<h;j++){const xo=x+Math.round(lean*j/h*3);P.p(xo,B-j,'i');P.p(xo+1,B-j,'j')}const tx=x+lean*3;P.s(tx-4,B-h-3,['i...i.i','.i.i.i.','..iji..']);};
  tree(cx-11,18,-1);tree(cx+9,20,1);tree(cx-3,24,0);P.ell(cx,B-3,6,3,(x,y)=>glow);P.ell(cx,B-3,3,2,(x,y)=>glow2);P.s(cx+3,B-1,['w.w','www'])}
 if(!lit){for(let i=0;i<10;i++){const x=4+((waHash(i,v,91)*32)|0),y=B-2-((waHash(i,v,92)*14)|0);if(P.g(x,y))P.p(x,y,'0')}}
 P.outline();
 if(lit){const fl=P.flat;P.flat=true;for(let i=0;i<5;i++){const x=cx-6+((waHash(i,v,93)*12)|0),y=B-12-((waHash(i,v,94)*10)|0);P.p(x,y,glow2)}P.flat=fl}}
{const d1=drawSitePx;drawSitePx=function(q,x,y,o){o=o||{};const k=o.kind;if(k!=='dgn'&&k!=='dgnc')return d1(q,x,y,o);if(!waInit())return;
  const D=waSiteDim(o),v=clamp(o.n|0,0,3),lit=k==='dgn',s=waSprite(k+v,D.w,D.h,D.w>>1,D.h-2,P=>waDgn(P,v,lit));waShadow(q,x,y,D.w-4,7);q.drawImage(s.cv,Math.round(x)-s.ax,Math.round(y)-s.ay)}}
