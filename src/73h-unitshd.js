/* ================= HD FIGURES (high-resolution battle sprites for 73-units.js and 76-monsters.js) =================
   Every battle figure (mercs, rivals, foes, beasts, monsters, bosses) and the gear drawn on it is painted on the part grid of
   73-units.js: per art pixel a part (Z), a tone ramp (R) or a flat PAL key (F) and a tone bias (B). usResolve shades that grid at
   art resolution. uhOut resolves the SAME grid at twice the resolution instead (Settings > Detail High, hdArt()):
   1. an edge-aware 2x of the grid's labels (scale2x on part + ramp + bias + key): silhouettes, part edges and diagonal shafts
      come out stepped at half an art pixel instead of in 2x2 blocks;
   2. 2x tone ramps (a half step between every pair of PAL tones, one deeper and one brighter end) shaded per HD pixel: light from
      the top-left falls off over 1-2 HD px, shade and contact shadows from parts in front over 2-3, so limbs, heads and blades
      read round; ordered dither between steps, never smoothing;
   3. one-pixel textures of the art (mail checks, lames, scales, studs, quilting) are re-cut at HD as a groove plus a lit lip;
   4. material passes chosen by the ramp: cloth folds, leather grain, wood grain, fur and hair strands, mail rings, plate and
      blade glints, scales, bark, leaves, bone, magic shimmer; faces get eye whites and a glint, cheek and brow shading;
   5. a one-HD-pixel outline (selective: tinted by the colour it borders on the lit side) and one-HD-pixel group outlines.
   The result is cropped to the figure and blitted at half size in art space ({cv, ax, ay, k:2}; cv.hdk 2), so anchors,
   picking, overlays and animation timing are those of the art sprite. Detail Low (hdArt() false) draws the original art.
   Texture coordinates are relative to each part's own box, so patterns ride with the part as it animates. No rnd(): hashes only. */
const UHD={on:true,cls:new WeakMap(),fine:new WeakMap(),rid:new WeakMap(),nr:0,names:null,rcN:-1,builds:0,ms:0,bytes:0,im:new Map(),
 lab:null,src:null,zh:null,out:null,tb:null,ta:null,tx:null,mnx:new Int16Array(256),mny:new Int16Array(256),mxx:new Int16Array(256),mxy:new Int16Array(256)};
const UH_CAP=14,UH_VOL=2.1;
const UH_BAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function uhOn(){return UHD.on&&typeof document!=='undefined'&&(typeof hdArt!=='function'||hdArt())}
/* ---- colours: Uint32 in canvas memory order (little-endian ABGR) ---- */
const UH_LE=new Uint8Array(new Uint32Array([1]).buffer)[0]===1,UH_PC=new Map();
function uhRGB(n){return UH_LE?(0xff000000|(n&255)<<16|(n&0xff00)|(n>>16&255))>>>0:((n<<8)|255)>>>0}
function uhC(k){let v=UH_PC.get(k);if(v!==undefined)return v;const s=PAL[k]||k;v=uhRGB(parseInt(String(s).slice(1),16)||0);UH_PC.set(k,v);return v}
function uhR(c){return UH_LE?c&255:c>>>24}function uhG(c){return UH_LE?c>>8&255:c>>16&255}function uhB(c){return UH_LE?c>>16&255:c>>8&255}
function uhP(r,g,b){r=r<0?0:r>255?255:r|0;g=g<0?0:g>255?255:g|0;b=b<0?0:b>255?255:b|0;return uhRGB(r<<16|g<<8|b)}
function uhMix(a,b,t){return uhP(uhR(a)+(uhR(b)-uhR(a))*t,uhG(a)+(uhG(b)-uhG(a))*t,uhB(a)+(uhB(b)-uhB(a))*t)}
const UH_DK=uhRGB(0x0b1514),UH_LT=uhRGB(0xfff8e0),UH_W=uhRGB(0xffffff);
function uhH(a,b,s){let h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul((s|0)+7,1274126177);h=Math.imul(h^h>>>13,2246822519);return((h^h>>>16)>>>0)/4294967296}
/* ---- 2x ramps: [deeper, t0, (t0+t1)/2, t1, ..., tn, brighter]; tone t at fine index 2t+1 ---- */
function uhFine(r){let f=UHD.fine.get(r);if(f)return f;const t=r.t,n=t.length,C=[];for(let i=0;i<n;i++)C.push(uhC(t[i]));const o=[uhMix(C[0],UH_DK,.42)];
 for(let i=0;i<n;i++){o.push(C[i]);if(i<n-1)o.push(uhMix(C[i],C[i+1],.5))}o.push(uhMix(C[n-1],UH_LT,C[n-1]===UH_W?0:.3));f=o;UHD.fine.set(r,f);return f}
/* ---- materials, from the ramp: named ramps of the painters first, then a guess from the tones ---- */
const UH_M={plain:0,metal:1,wood:2,cloth:3,leather:4,skin:5,hair:6,fur:7,bone:8,magic:9,scales:10,bark:11,leaf:12,gold:13,mem:14};
const UH_NM=[[/^(steel|plate|iron|ironL|blk|nail|scale)$/,'metal'],[/^(brass|bronze|gold)$/,'gold'],[/^(wood|dwood|club|haft|wheel|woodD|crate)$/,'wood'],
 [/^(leather|dleather|belt|hide)$/,'leather'],[/^(fur|furD)$/,'fur'],[/^(bone|horn|dhorn|dbone|claw|spar|lich)$/,'bone'],
 [/^(void|voidl|rift|ice|hex|ember|mana|aura|qi|chi|glow)$/,'magic'],[/^(adder|adderB|viper|viperH|gs|gsB|body|bodyD|belly)$/,'scales'],
 [/^(bark|barkL|bark2|eld|eldL)$/,'bark'],[/^(moss|leaf|leafL|amber)$/,'leaf'],[/^(og|ogD|sk|skH)$/,'skin'],[/^hair$/,'hair'],[/^(mem|memF)$/,'mem'],
 [/^(white|red|cloth|robe|can|canS|sack)$/,'cloth']];
function uhNames(){const m=new Map(),add=(T,over)=>{if(!T||typeof T!=='object')return;for(const k in T){const r=T[k];if(!r||typeof r!=='object')continue;if(r.t&&typeof r.t==='string'){let c=null;for(const q of UH_NM)if(q[0].test(k)){c=q[1];break}if(over)c=over;if(c&&!m.has(r))m.set(r,UH_M[c])}}};
 try{if(typeof MSW==='object'){add({plate:MSW.plate},'scales')}}catch(e){}
 try{add(USR);add(typeof MSR==='object'?MSR:null);add(typeof MSO==='object'?MSO:null);add(typeof MSW==='object'?MSW:null);add(typeof MSG==='object'?MSG:null);add(typeof CR_BT==='object'?CR_BT:null)}catch(e){}
 try{for(const [k,r] of US_RC){if(!r||typeof r!=='object')continue;const p=k[0];if(r.t){if(!m.has(r))m.set(r,p==='s'?UH_M.skin:p==='h'?UH_M.hair:UH_M.cloth)}else{for(const q of ['steel','plate','iron'])if(r[q]&&!m.has(r[q]))m.set(r[q],UH_M.metal)}}}catch(e){}
 UHD.names=m;UHD.rcN=typeof US_RC==='object'?US_RC.size:0;return m}
function uhGuess(t){if(/^[0Gopqr]+$/.test(t))return UH_M.metal;if(/^[abcdeIuY]+$/.test(t)&&/[cd]/.test(t))return UH_M.gold;if(/[stu]/.test(t)&&!/[opq]/.test(t))return UH_M.skin;if(/^[0aijkH]+$/.test(t))return UH_M.leather;
 if(/^[nmlr]+$/.test(t))return UH_M.bone;if(/^[GDCXxFr]+$/.test(t)&&/[CF]/.test(t))return UH_M.magic;return UH_M.cloth}
function uhCls(r){let c=UHD.cls.get(r);if(c!==undefined)return c;let m=UHD.names;if(!m||(typeof US_RC==='object'&&US_RC.size!==UHD.rcN))m=uhNames();c=m.get(r);if(c===undefined)c=uhGuess(r.t);UHD.cls.set(r,c);return c}
function uhRid(r){let i=UHD.rid.get(r);if(i===undefined){i=++UHD.nr;UHD.rid.set(r,i)}return i}
/* ---- scratch buffers, grown to the largest grid seen ---- */
function uhBufs(n,N){if(!UHD.lab||UHD.lab.length<n){UHD.lab=new Float64Array(n);UHD.tb=new Float32Array(n);UHD.ta=new Uint8Array(n);UHD.tx=new Float32Array(n)}
 if(!UHD.src||UHD.src.length<N){UHD.src=new Int32Array(N);UHD.zh=new Uint8Array(N);UHD.out=new Uint32Array(N)}}
/* ---- the resolver: grid -> {cv (2x, cropped), ax, ay (art px), k:2, gl} | null ---- */
function uhOut(g,deep,ax,ay,glint,lgd){if(typeof document==='undefined')return null;const t0=typeof performance!=='undefined'?performance.now():0;
 const w=g.w,h=g.h,Z=g.Z,R=g.R,F=g.F,Bb=g.B;let bx0=w,bx1=-1,by0=-1,by1=-1;
 for(let y=0,r=0;y<h;y++,r+=w){let a=0;while(a<w&&!Z[r+a])a++;if(a===w)continue;let b=w-1;while(!Z[r+b])b--;if(a<bx0)bx0=a;if(b>bx1)bx1=b;if(by0<0)by0=y;by1=y}
 if(by0<0)return null;
 const X0=bx0-1,Y0=by0-1,aw=bx1-bx0+3,ah=by1-by0+3,W=aw*2,H=ah*2,n=aw*ah,N=W*H;uhBufs(n,N);
 const lab=UHD.lab,src=UHD.src,zh=UHD.zh,out=UHD.out,tb=UHD.tb,ta=UHD.ta,tx=UHD.tx;
 const gi=(lx,ly)=>{const x=lx+X0,y=ly+Y0;return x<0||y<0||x>=w||y>=h?-1:y*w+x};
 /* labels (0 = empty) */
 for(let ly=0;ly<ah;ly++)for(let lx=0;lx<aw;lx++){const i=gi(lx,ly),o=ly*aw+lx;if(i<0||!Z[i]){lab[o]=0;continue}const r=R[i],f=F[i];
  lab[o]=Z[i]+256*(Bb[i]+128)+65536*(f?f.charCodeAt(0):0)+16777216*(r?uhRid(r):0)}
 /* scale2x on the labels -> each HD pixel's source art pixel */
 const L=(lx,ly)=>lx<0||ly<0||lx>=aw||ly>=ah?0:lab[ly*aw+lx];
 for(let ly=0;ly<ah;ly++)for(let lx=0;lx<aw;lx++){const P=lab[ly*aw+lx],A=L(lx,ly-1),Bn=L(lx+1,ly),C=L(lx-1,ly),D=L(lx,ly+1),ip=P?gi(lx,ly):-1;
  const iA=A?gi(lx,ly-1):-1,iB=Bn?gi(lx+1,ly):-1,iC=C?gi(lx-1,ly):-1,iD=D?gi(lx,ly+1):-1,o=ly*2*W+lx*2;
  src[o]=C===A&&C!==D&&A!==Bn?iA:ip;src[o+1]=A===Bn&&A!==C&&Bn!==D?iB:ip;src[o+W]=D===C&&D!==Bn&&C!==A?iC:ip;src[o+W+1]=Bn===D&&Bn!==A&&D!==C?iD:ip}
 /* part boxes in HD (texture anchors) */
 const mnx=UHD.mnx,mny=UHD.mny,mxx=UHD.mxx,mxy=UHD.mxy;mnx.fill(32767);mny.fill(32767);mxx.fill(-1);mxy.fill(-1);
 for(let y=0,j=0;y<H;y++)for(let x=0;x<W;x++,j++){const s=src[j];if(s<0){zh[j]=0;continue}const z=Z[s];zh[j]=z;if(x<mnx[z])mnx[z]=x;if(y<mny[z])mny[z]=y;if(x>mxx[z])mxx[z]=x;if(y>mxy[z])mxy[z]=y}
 /* one-pixel textures at art resolution: ta bit 1 vertical isolation, 2 horizontal; tb the surrounding bias, tx the deviation */
 for(let ly=0;ly<ah;ly++)for(let lx=0;lx<aw;lx++){const o=ly*aw+lx;ta[o]=0;const i=gi(lx,ly);if(i<0||!Z[i]||!R[i]||F[i]){tb[o]=i>=0?Bb[i]:0;tx[o]=0;continue}
  const z=Z[i],r=R[i],b=Bb[i],same=q=>q>=0&&Z[q]===z&&R[q]===r&&!F[q],u=gi(lx,ly-1),d=gi(lx,ly+1),l=gi(lx-1,ly),rr=gi(lx+1,ly);let a=0,m=b;
  const vi=same(u)&&same(d)&&Bb[u]!==b&&Bb[d]!==b&&Bb[u]===Bb[d],hi=same(l)&&same(rr)&&Bb[l]!==b&&Bb[rr]!==b&&Bb[l]===Bb[rr];
  if(vi&&hi){a=3;m=(Bb[u]+Bb[l])/2}else if(vi){a=1;m=Bb[u]}else if(hi){a=2;m=Bb[l]}ta[o]=a;tb[o]=m;tx[o]=b-m}
 const NC=usNC,OL=usOL,zA=(x,y)=>x<0||y<0||x>=W||y>=H?0:zh[y*W+x];
 /* mail: a metal part whose art texture is a checker of one-pixel dots is re-cut as rings */
 const ml=UHD.ml||(UHD.ml=new Uint16Array(512));ml.fill(0);
 for(let o=0;o<n;o++){const i=gi(o%aw,(o/aw)|0);if(i<0||!Z[i]||!R[i]||F[i])continue;const c=uhCls(R[i]);if(c!==1&&c!==13)continue;ml[Z[i]*2]++;if(ta[o]===3)ml[Z[i]*2+1]++}
 const eyes=UHD.eyes||(UHD.eyes=[]);eyes.length=0;
 for(let y=0,j=0;y<H;y++)for(let x=0;x<W;x++,j++){const s=src[j];if(s<0){out[j]=0;continue}const z=Z[s],og=OL[z];
  if(og){const zl=zA(x-1,y),zu=zA(x,y-1),zr=zA(x+1,y),zd=zA(x,y+1);
   if((zl>z&&OL[zl]&&OL[zl]!==og)||(zu>z&&OL[zu]&&OL[zu]!==og)||(zr>z&&OL[zr]&&OL[zr]!==og)||(zd>z&&OL[zd]&&OL[zd]!==og)){out[j]=UH_DK;continue}}
  const f=F[s],r=R[s];
  if(f){const c=uhFlat(f,s,x,y,Z,R,F,w,z,eyes);if(c){out[j]=c;continue}if(!r){out[j]=uhC(f);continue}}
  if(!r){out[j]=0;continue}
  /* light: top-left rim over 1-2 px, shade toward the empty lower-right over 2-4, contact shadows from parts in front */
  let e=0,cast=0;for(let d=1;d<=3;d++){const zl=zA(x-d,y),zu=zA(x,y-d);if((zl>z&&!NC[zl])||(zu>z&&!NC[zu])){cast=d;break}}
  const sx=x&1,sy=y&1,lx=x>>1,ly=y>>1,o=ly*aw+lx;let rim=0;
  if(cast&&cast<=2)e=-2;
  else{const zl1=zA(x-1,y),zu1=zA(x,y-1),zl2=zA(x-2,y),zu2=zA(x,y-2);let lit=0;
   if(zl1<z||zu1<z){lit=!zl1&&!zu1?3:2;rim=1}else if(zl2<z||zu2<z)lit=1;
   let dk=0;if(!zA(x+1,y)||!zA(x,y+1))dk=-2;else if(!zA(x+2,y)||!zA(x,y+2))dk=-1;else if(deep&&(!zA(x+3,y)||!zA(x,y+3)||!zA(x+4,y)||!zA(x,y+4)))dk=-1;
   if(dk)rim=0;e=lit+dk;if(cast===3)e-=1}
  /* volume: a normal from the distances to the part's own outline (pixels behind it), lit from the top-left */
  let dl=1,dr=1,du=1,dd=1;const CAP=UH_CAP;
  for(;dl<CAP&&zA(x-dl,y)>=z;dl++);for(;dr<CAP&&zA(x+dr,y)>=z;dr++);for(;du<CAP&&zA(x,y-du)>=z;du++);for(;dd<CAP&&zA(x,y+dd)>=z;dd++);
  const nx=(dl-dr)/(dl+dr),ny=(du-dd)/(du+dd);e+=(-nx*.55-ny*.7)*UH_VOL;
  const m=uhCls(r),u=x-mnx[z],v=y-mny[z];let p=2*(r.b+tb[o])+e;const a=ta[o],dv=tx[o];
  if((m===1||m===13)&&ml[z*2+1]*3>ml[z*2])p+=uhMail(u,v);
  else{if(a){const sg=dv<0?1:-1;if(a===3)p+=!sx&&!sy?2*dv:(sx^sy)?dv:sg;else if(a===1)p+=!sy?2*dv:sg;else p+=!sx?2*dv:sg}
   else if(Bb[s]!==tb[o])p+=2*(Bb[s]-tb[o]);
   p+=uhTex(m,u,v,z,rim,mxx[z]-mnx[z]+1,mxy[z]-mny[z]+1,nx,ny)}
  const C=uhFine(r),nC=C.length-1;const q=p+1;let i0=Math.floor(q);const fr=q-i0;if(fr>.62||(fr>.38&&fr*16>UH_BAY[(x&3)+(y&3)*4]+.5))i0++;out[j]=C[i0<0?0:i0>nC?nC:i0]}
 if(eyes.length)uhFace(eyes,src,out,Z,R,F,W,H);
 /* outline: one HD pixel; on the lit (top/left) side tinted by what it borders */
 for(let y=0,j=0;y<H;y++)for(let x=0;x<W;x++,j++){if(src[j]>=0)continue;const r=x<W-1&&src[j+1]>=0,d=y<H-1&&src[j+W]>=0,l=x>0&&src[j-1]>=0,u=y>0&&src[j-W]>=0;
  if(!(r||d||l||u)){out[j]=0;continue}if((r||d)&&!l&&!u){const c=out[r?j+1:j+W];out[j]=c?uhMix(c,UH_DK,.74):UH_DK}else out[j]=UH_DK}
 /* to a canvas */
 const cv=pxCanvas(W,H);if(!cv||!cv.getContext)return null;const q=cv.getContext('2d');if(!q||!q.createImageData)return null;
 const im=q.createImageData(W,H);if(!im||!im.data||!im.data.buffer||im.data.length<N*4||!q.putImageData)return null;new Uint32Array(im.data.buffer,0,N).set(out.subarray(0,N));q.putImageData(im,0,0);cv.hdk=2;
 let gl=null;if(glint&&typeof usGL!=='undefined'){const a=[],on=j=>j>=0&&j<N&&src[j]>=0&&usGL[zh[j]];for(let j=0;j<N;j++)if(on(j)&&(!on(j-1)||!on(j+1)||!on(j-W)||!on(j+W)))a.push(j);
  if(a.length){a.sort((p,q2)=>(p%W-((p/W)|0))-(q2%W-((q2/W)|0)));gl={a,w:W,lg:!!lgd}}}
 UHD.builds++;UHD.bytes+=N*4;if(t0)UHD.ms+=performance.now()-t0;
 return{cv,ax:ax-X0,ay:ay-Y0,k:2,gl}}
/* flat detail pixels. Eyes (a dark key on a skin part): the upper art pixel keeps a lid row and gets a catch-light, the lower one
   keeps its top row and gives the bottom row back to the skin (0: shade as the part), so an eye is 3 HD px tall with a glint.
   Single studs / rivets / gems: a lit corner and a shaded one. */
function uhFlat(f,s,x,y,Z,R,F,w,z,eyes){const c=uhC(f),sx=x&1,sy=y&1;const nb=q=>q>=0&&q<Z.length&&Z[q]===z&&F[q]===f;
 const dark=f==='0'||f==='1'||f==='G'||f==='2'||f==='3';
 if(dark&&R[s]&&uhCls(R[s])===UH_M.skin){const up=nb(s-w),dn=nb(s+w),lf=nb(s-1);
  if(!up&&!sx&&!sy&&!lf)eyes.push(x,y,z,dn?1:0);
  if(!up){if(sy===0)return c;return!lf&&!sx?uhC('l'):c}
  if(sy===0)return c;return 0}
 const iso=!nb(s-1)&&!nb(s+1)&&!nb(s-w)&&!nb(s+w);if(!iso)return c;if(dark)return c;
 if(sx===0&&sy===0)return uhMix(c,UH_LT,.4);if(sx===1&&sy===1)return uhMix(c,UH_DK,.35);return c}
/* faces: a shaded brow over each eye, and under a pair of eyes a nose shadow and a mouth, where the skin shows */
function uhFace(E,src,out,Z,R,F,W,H){const skin=(x,y,z)=>{if(x<0||y<0||x>=W||y>=H)return-1;const j=y*W+x,s=src[j];return s>=0&&Z[s]===z&&!F[s]&&R[s]&&uhCls(R[s])===UH_M.skin?j:-1};
 const dk=(x,y,z,t,c)=>{const j=skin(x,y,z);if(j>=0&&out[j])out[j]=uhMix(out[j],c||UH_DK,t)};
 for(let i=0;i<E.length;i+=4){const x=E[i],y=E[i+1],z=E[i+2];for(let k=-1;k<=2;k++)dk(x+k,y-1,z,.22);}
 for(let i=0;i<E.length;i+=4)for(let k=i+4;k<E.length;k+=4){if(E[k+2]!==E[i+2]||Math.abs(E[k+1]-E[i+1])>1)continue;const z=E[i+2],xl=Math.min(E[i],E[k]),xr=Math.max(E[i],E[k]),y=Math.max(E[i+1],E[k+1]),h=E[i+3]?4:2;
  if(xr-xl<4)continue;dk(xr-1,y+h,z,.3);dk(xr-2,y+h+1,z,.18);const my=y+h+(h>2?3:2),mc=uhC('f');for(let x=xl+2;x<=xr-1;x++)dk(x,my,z,x===xl+2||x===xr-1?.18:.38,mc);dk(xl+3,my+1,z,.12)}}
/* mail rings: offset rows of small rings, a lit upper rim and a dark lower one */
function uhMail(u,v){const r=(v/3)|0,a=(u+(r&1)*2)&3,b=v%3;return b===0?(a===1||a===2?1.4:-.6):b===1?(a===0?.6:a===3?-1.4:-.4):(a===1||a===2?-1.6:-.2)}
/* material texture, in fine tone steps; (u,v) part-local HD coords, rim 1 on the lit outer edge, (pw,ph) the part box, (nx,ny) its normal */
function uhTex(m,u,v,z,rim,pw,ph,nx,ny){switch(m){
 case 1:return rim?1.6:(nx<-.2&&ny<-.2&&nx>-.6&&ny>-.6)?.6:0;                                                               // steel: edge glints, a soft sheen up-left
 case 13:return rim?1.2:0;                                                                                                   // brass / gold
 case 2:{if(pw<3&&ph<3)return 0;const L=ph>=pw*1.6?u:pw>=ph*1.6?v:(u-v)>>1,T=ph>=pw*1.6?v:pw>=ph*1.6?u:(u+v);const k=uhH(L,(T/5)|0,z+11);return k<.22?-1.1:k>.9?.8:0}   // wood: grain along the length
 case 3:{if(pw<8||ph<6)return 0;const c=uhH(u,0,z+3);if(c<.17&&uhH(u,v>>3,z+5)<.7)return-1.1;if(uhH(u-1,0,z+3)<.17)return .7;return 0}  // cloth: fold lines with a lit side
 case 4:return uhH(u,v,z+5)>.95?.8:0;                                                                                        // leather: a few scuffs that catch the light
 case 7:{const r=(v/3)|0,k=uhH(u>>1,r,z+9),s=(u+(r&1)*2+(v%3))%4;return s===0&&k<.7?-1.2:s===2&&k>.55?.7:0}                     // fur: short slanting tufts
 case 6:{const s=(u+(v>>2))%3;return s===0?-1:s===1&&v<6?.8:0}                                                              // hair: strands, a sheen on top
 case 8:return uhH(u,v>>1,z+4)<.05?-1:0;                                                                                     // bone: hairline cracks
 case 9:return((u+v+(z&3))%5===0)?1:0;                                                                                      // magic: shimmer lines
 case 10:{const r=(v/3)|0,a=(u+(r&1)*2)&3,b=v%3;return b===0?(a===1||a===2?.9:0):b===2?(a===0||a===3?-.6:-1.4):a===0?-.5:0}       // scales: offset rows, lit crowns, dark lower rims
 case 11:{const k=uhH(u>>1,v>>2,z+13);return k<.3?-1.5:k>.8?1:0}                                                           // bark: furrows
 case 12:{const k=uhH(u>>1,v>>1,z+17);return k<.22?-1.2:k>.82?1:0}                                                         // leaves
 case 14:return((u-v)&7)===0?-1:0;                                                                                          // wing membrane: veins
 default:return 0}}
/* Detail switched at runtime: drop every built frame (looks and monsters rebuild on demand; frames carry the art revision too) */
if(typeof onArtChange==='function')onArtChange(()=>{try{for(const L of US.looks.values())L.fr.fill(null)}catch(e){}try{if(typeof MS==='object')MS.fr.clear()}catch(e){}UHD.bytes=0});
