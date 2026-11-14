/* ================= UNIT SPRITES (battle figures; PAL only) =================
   unitSpritePx(u,face,state,frame) -> {cv,ax,ay}: cached canvas at native art resolution, anchor = feet centre.
   A sprite is assembled from posed parts on a grid of (ramp, part) cells: every part is painted flat, then one
   pass shades it (light from the top-left, cast shadows from parts in front) and adds the 1px outline. Because
   shading runs after mirroring / laying a figure down, all four facings and the fallen pose stay lit correctly.
   Two views are drawn (front and back three-quarter, facing screen-right) and mirrored for the other two; the
   weapon stays in the right hand and the shield on the left arm, so which arm is nearer the camera changes.
   face: 0 bottom-right, 1 bottom-left, 2 top-left, 3 top-right. Nothing here touches rnd(). */
const UNIT_FRAMES={idle:2,walk:4,attack:3,cast:3,hit:2,death:3,swap:3,reload:3};
const UNIT_FPS={idle:2,walk:8,attack:9,cast:7,hit:8,death:5,swap:9,reload:6};
const US_ST=['idle','walk','attack','cast','hit','death','swap','reload'],US_OFF={},US_WARM=['idle','walk','attack','cast','hit','death'];   // swap frames are built on demand
const US_NF=(()=>{let n=0;US_ST.forEach(s=>{US_OFF[s]=n;n+=UNIT_FRAMES[s]});return n})();
const US_DIM=[{w:52,h:52,ax:26,ay:45},{w:88,h:80,ax:44,ay:71}];   // working canvas: standard (24x32 figure), large (40x48 figure)
const US={looks:new Map(),byUnit:new WeakMap(),en:null,grid:[null,null],tmp:[null,null],rgb:null,builds:0,ms:0};

/* ---- cell grid painter ---- */
let usG=null,usOX=0,usOY=0,usZ=0,usGrp=0,usGl=0;const usNC=new Uint8Array(256),usOL=new Uint8Array(256),usGL=new Uint8Array(256);
function usGrid(w,h){const n=w*h;return{w,h,R:new Array(n).fill(null),F:new Array(n).fill(null),Z:new Uint8Array(n),B:new Int8Array(n)}}
function usWipe(g){g.R.fill(null);g.F.fill(null);g.Z.fill(0);g.B.fill(0)}
function usBegin(big){let g=US.grid[big];const d=US_DIM[big];if(!g){g=US.grid[big]=usGrid(d.w,d.h);US.tmp[big]=usGrid(d.w,d.h)}usWipe(g);usG=g;usOX=d.ax;usOY=d.ay;usZ=0;usGrp=0;usGl=0;usGL.fill(0);return g}
function usPart(nc){if(usZ<250)usZ++;usNC[usZ]=nc?1:0;usOL[usZ]=usGrp;usGL[usZ]=usGl;return usZ}
function usI(x,y){x+=usOX;y+=usOY;return x<0||y<0||x>=usG.w||y>=usG.h?-1:y*usG.w+x}
function usP(x,y,r,b){x+=usOX;y+=usOY;const g=usG;if(x<0||y<0||x>=g.w||y>=g.h||!r)return;const i=y*g.w+x;if(typeof r==='string'){g.R[i]=null;g.F[i]=r}else{g.R[i]=r;g.F[i]=null}g.Z[i]=usZ;g.B[i]=b|0}   // usI inlined: the hottest call of a sprite build
function usF(x,y,k){const i=usI(x,y);if(i<0)return;if(!usG.Z[i])usG.Z[i]=usZ;usG.F[i]=k}                 // detail pixel, keeps the part beneath
function usB(x,y,d){const i=usI(x,y);if(i>=0&&usG.R[i])usG.B[i]+=d}
function usE(x,y){const i=usI(x,y);if(i<0)return;usG.R[i]=null;usG.F[i]=null;usG.Z[i]=0;usG.B[i]=0}
function usHas(x,y){const i=usI(x,y);return i>=0&&usG.Z[i]>0}
function usRect(x0,y0,x1,y1,r,b){const f=typeof b==='function';for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)usP(x,y,r,f?b(x,y):b)}
function usFlip(g){const w=g.w,R=g.R,F=g.F,Z=g.Z,B=g.B;for(let y=0;y<g.h;y++)for(let a=y*w,b=a+w-1;a<b;a++,b--){let t=R[a];R[a]=R[b];R[b]=t;t=F[a];F[a]=F[b];F[b]=t;t=Z[a];Z[a]=Z[b];Z[b]=t;t=B[a];B[a]=B[b];B[b]=t}}
function usRGB(){const o={};for(const k in PAL){const v=parseInt(PAL[k].slice(1),16);o[k]=[v>>16&255,v>>8&255,v&255]}return o}
/* shade + outline -> canvas (usResolveKeys: the same pass -> rows of PAL keys, for icons and portraits) */
// Little-endian (every phone): one 32-bit write per pixel, into one ImageData per grid size reused across builds (no garbage per sprite).
const US_LE=new Uint8Array(new Uint32Array([1]).buffer)[0]===1,US_ID=new Map();
function usP32(){const o={};for(const k in PAL){const v=parseInt(PAL[k].slice(1),16);o[k]=(0xff000000|(v&255)<<16|(v&0xff00)|(v>>16&255))>>>0}return o}
function usResolve(g,deep){const w=g.w,h=g.h,cv=pxCanvas(w,h);if(!cv||!cv.getContext)return null;const q=cv.getContext('2d');if(!q||!q.createImageData)return null;
 if(US_LE){const id=w*65536+h;let e=US_ID.get(id);if(!e){const im=q.createImageData(w,h);e={im,d:new Uint32Array(im.data.buffer),y0:0,y1:h-1};US_ID.set(id,e)}const d=e.d,P=US.p32||(US.p32=usP32());d.fill(0,e.y0*w,(e.y1+1)*w);   // clear the rows the last sprite used
  const bx=usShade(g,deep,(i,k)=>{const c=P[k];if(c)d[i]=c});if(!bx){e.y0=0;e.y1=-1;return cv}e.y0=bx[1];e.y1=bx[3];q.putImageData(e.im,0,0,bx[0],bx[1],bx[2]-bx[0]+1,bx[3]-bx[1]+1);return cv}
 const im=q.createImageData(w,h),d=im.data,rgb=US.rgb||(US.rgb=usRGB());usShade(g,deep,(i,k)=>{const c=rgb[k];if(c){const j=i*4;d[j]=c[0];d[j+1]=c[1];d[j+2]=c[2];d[j+3]=255}});q.putImageData(im,0,0);return cv}
function usResolveKeys(g,deep){const w=g.w,o=[];for(let y=0;y<g.h;y++)o.push(new Array(w).fill('.'));usShade(g,deep,(i,k)=>{o[(i/w)|0][i%w]=k});return o.map(r=>r.join(''))}
/* a private grid of any size for icons / portraits: usBeginAt(w,h,ox,oy) ... usResolveKeys(usG) */
const US_GX=new Map();function usBeginAt(w,h,ox,oy){const k=w+'x'+h;let g=US_GX.get(k);if(!g){g=usGrid(w,h);US_GX.set(k,g)}usWipe(g);usG=g;usOX=ox|0;usOY=oy|0;usZ=0;usGrp=0;return g}
// Only the box round the painted cells (plus the outline ring) can produce a pixel: find it with one cheap pass over Z, shade
// inside it in the same row-major order, and return it [x0,y0,x1,y1] (null: nothing painted) for a partial putImageData.
const US_BOX=[0,0,0,0];
function usShade(g,deep,put){const w=g.w,h=g.h,R=g.R,F=g.F,Z=g.Z,B=g.B;let bx0=w,bx1=-1,by0=-1,by1=-1;
 for(let y=0,r=0;y<h;y++,r+=w){let a=0;while(a<w&&!Z[r+a])a++;if(a===w)continue;let b=w-1;while(!Z[r+b])b--;if(a<bx0)bx0=a;if(b>bx1)bx1=b;if(by0<0)by0=y;by1=y}
 if(by0<0)return null;const X0=bx0>0?bx0-1:0,X1=bx1<w-1?bx1+1:w-1,Y0=by0>0?by0-1:0,Y1=by1<h-1?by1+1:h-1;US_BOX[0]=X0;US_BOX[1]=Y0;US_BOX[2]=X1;US_BOX[3]=Y1;
 for(let y=Y0;y<=Y1;y++)for(let x=X0,i=y*w+X0;x<=X1;x++,i++){const z=Z[i];let k;
  if(z){k=F[i];const r=R[i];
   const zl=x>0?Z[i-1]:0,zu=y>0?Z[i-w]:0,zr=x<w-1?Z[i+1]:0,zd=y<h-1?Z[i+w]:0,og=usOL[z];
   if((zl>z&&usOL[zl]&&usOL[zl]!==og)||(zu>z&&usOL[zu]&&usOL[zu]!==og)||(zr>z&&usOL[zr]&&usOL[zr]!==og)||(zd>z&&usOL[zd]&&usOL[zd]!==og))k='0';
   else if(!k&&r){let e=0;
    if((zl>z&&!usNC[zl])||(zu>z&&!usNC[zu]))e=-1;
    else{const lit=zl<z||zu<z,dk=!zr||!zd;if(lit&&!dk)e=(!zl&&!zu)?2:1;else if(dk&&!lit)e=-1;
     else if(deep&&!lit&&!dk&&((x<w-2&&!Z[i+2])||(y<h-2&&!Z[i+2*w])))e=-1}
    let t=r.b+B[i]+e;const n=r.t.length;if(t<0)t=0;else if(t>=n)t=n-1;k=r.t[t]}}
  else if((x>0&&Z[i-1])||(x<w-1&&Z[i+1])||(y>0&&Z[i-w])||(y<h-1&&Z[i+w]))k='0';
  if(k)put(i,k)}
 return US_BOX}

/* ---- ramps: tones dark -> light, b = resting tone ---- */
function usRamp(t,b){return{t,b:b==null?1:b}}
const USR={steel:usRamp('opqr',1),plate:usRamp('opqr',2),iron:usRamp('Gopq',1),brass:usRamp('abcde',2),wood:usRamp('aijk',2),dwood:usRamp('aij',1),
 leather:usRamp('aijk',2),dleather:usRamp('0aij',2),bone:usRamp('nmlr',2),void:usRamp('GGDC',1),voidl:usRamp('GDCr',1),rift:usRamp('GDCr',2),ice:usRamp('XxFr',2),
 hex:usRamp('BAe',1),fur:usRamp('aijk',1),white:usRamp('nmlr',2),red:usRamp('fgh',1),horn:usRamp('nmlr',1),dhorn:usRamp('Gop',1),ember:usRamp('KEy',1),
 mana:usRamp('XxF',1),aura:usRamp('Yyd',1),qi:usRamp('Zz6',1),chi:usRamp('BAe',1),string:usRamp('nml',1),
 blk:usRamp('0Gop',1),bronze:usRamp('auId',2),gold:usRamp('bcde',2)};
const US_RC=new Map();
function usCloth(n){let r=US_RC.get('c'+n);if(!r){const c=(typeof PT_CLOTH!=='undefined'&&PT_CLOTH[n])||['i','j','k'];r=usRamp(c.join(''),1);US_RC.set('c'+n,r)}return r}
function usSkin(a){const k='s'+a.join('');let r=US_RC.get(k);if(!r){r=usRamp(a[2]+a[1]+a[0],2);US_RC.set(k,r)}return r}
/* ---- tailor: m.colors = {cloth, accent, metal}; dyes from dyeRamp (47-tailor.js), finishes are 4-tone metal ramps ---- */
const US_DYE={crimson:['f','g','h'],madder:['f','K','h'],red:['f','g','h'],ochre:['b','c','d'],gold:['b','c','d'],forest:['4','w','v'],green:['4','w','v'],verdigris:['7','5','6'],teal:['Z','z','6'],sky:['X','x','F'],
 royal:['G','X','x'],blue:['G','X','x'],violet:['G','D','C'],purple:['G','D','C'],charcoal:['1','G','o'],black:['0','1','3'],bone:['n','m','l'],brown:['a','i','j'],tan:['i','j','k'],white:['m','l','r'],grey:['o','p','q'],rust:['a','K','E']};
const US_FIN={steel:['opqr','Gopq'],blackened:['0Gop','00Go'],bronze:['auId','aauI'],gilded:['bcde','abcd'],iron:['Gopq','1Gop'],silver:['pqrr','opqr']};
function usDye(k){if(!k)return null;let r=US_RC.get('d'+k);if(r!==undefined)return r;let a=null;try{if(typeof dyeRamp==='function')a=dyeRamp(k)}catch(e){}
 if(!Array.isArray(a)||a.length<3||!a.every(x=>PAL[x]))a=US_DYE[k]||null;r=a?Object.assign(usRamp(a.slice(0,3).join(''),1),{dye:1}):null;US_RC.set('d'+k,r);return r}
const US_HI={o:'p',p:'q',q:'r',I:'d',d:'e',c:'d',G:'o',k:'d',m:'l',l:'r',x:'F',y:'e'};
function usFinOf(k){let f=null;try{let t=typeof finishRamp==='function'?finishRamp(k):null;if(!t&&typeof FINISH==='object'&&FINISH&&FINISH[k]){const F=FINISH[k];t=Array.isArray(F)?F:F.r||F.ramp||null}
  if(Array.isArray(t)&&t.length>=3&&t.every(x=>PAL[x])){const a=t.slice(0,3);if(t.length>=4&&PAL[t[3]])a.push(t[3]);else a.push(US_HI[a[2]]||a[2]);f=[a.join(''),a[0]+a.slice(0,3).join('')]}}catch(e){}
 return f||US_FIN[k]||null}
function usFin(k){if(!k||k==='steel')return null;let r=US_RC.get('f'+k);if(r!==undefined)return r;const f=usFinOf(k);r=f?{steel:usRamp(f[0],1),plate:usRamp(f[0],2),iron:usRamp(f[1],1),fin:k}:null;US_RC.set('f'+k,r);return r}
function usColSig(m){const c=typeof mercLook==='function'?mercLook(m):m&&m.colors;return c&&typeof c==='object'?(c.cloth||'')+'/'+(c.accent||'')+'/'+(c.metal||''):''}
function usLivery(S,m){const col=typeof mercLook==='function'?mercLook(m):m&&m.colors;if(!col||typeof col!=='object')return;const cr=usDye(col.cloth),ar=usDye(col.accent),mf=usFin(col.metal);
 if(cr){S.clothR=cr;S.legR=usRamp(cr.t,0);if(S.hat==='hood')S.hatR=cr}
 if(ar){S.accR=ar;S.shR=ar;S.tabR=ar;S.sashR=ar;S.trim=ar;if(S.hat==='band'||S.hat==='feather')S.hatR=ar}
 if(mf)S.MR=Object.assign({},USR,mf)}
function usHairR(a){const k='h'+a.join('');let r=US_RC.get(k);if(!r){r=usRamp(a.join(''),1);US_RC.set(k,r)}return r}

/* ---- weapons: cells along an axis from the grip. [i, off, ramp, bias, group] ---- */
const USD={DL:[-1,1,0,0,0],U:[0,-1,0,0,0],UL2:[0,-1,-1,0,2],UR2:[0,-1,1,0,2],UL3:[0,-1,-1,0,3],UR3:[0,-1,1,0,3],UL:[-1,-1,0,0,0],UR:[1,-1,0,0,0],R:[1,0,0,0,0],RD2:[1,0,0,1,2],RU2:[1,0,0,-1,2],RD3:[1,0,0,1,3],RU3:[1,0,0,-1,3],RD:[1,1,0,0,0],L:[-1,0,0,0,0],D:[0,1,0,0,0]};
const US_W={};
function usWdef(id){let w=US_W[id];if(w)return w;if(id.indexOf('*')>=0)return US_W[id]=usFamedW(usWdef(id.replace('*','')),id);if(id.slice(0,2)==='g:'){w=usWgen(id);w.id=w.id||id;return US_W[id]=w}if(typeof US_CRW==='object'&&US_CRW[id.replace(/:L$/,'')])return US_W[id]=usCraftW(id);const c=[],S=USR,add=(i0,i1,o0,o1,r,g,b)=>{for(let i=i0;i<=i1;i++)for(let o=o0;o<=o1;o++)c.push([i,o,r,b|0,g])};
 let cls='swing',two=0,h2=0,tip=8,gem=null;
 const sword=(len,wide,blade,guard)=>{add(-2,-2,0,0,guard||S.brass,0);add(-1,0,0,0,S.dleather,0);add(1,1,-1,wide?2:1,guard||S.brass,1);add(2,len+1,0,wide?1:0,blade,2);add(len+2,len+2,0,0,blade,2);tip=len+2};
 const axehead=(top,sz,side)=>{const s=side||1;for(let k=0;k<sz+2;k++){const i=top-k,n=k===0?Math.max(1,sz-1):k<=sz-1?sz:k===sz?sz-1:1,o0=k>sz-1?(k===sz?2:sz):1;for(let o=o0;o<=Math.max(o0,n+(k>sz-1?1:0));o++)c.push([i,o*s,S.plate,o>=sz?1:0,2])}};
 switch(id){
  case'knife':add(-1,0,0,0,S.dleather,0);add(1,4,0,0,S.plate,2);tip=4;break;
  case'rondel':add(-2,-2,0,0,S.brass,0);add(-1,0,0,0,S.dleather,0);add(1,1,-1,1,S.brass,1);add(2,6,0,0,S.plate,2);tip=6;break;
  case'shortsword':sword(6,0,S.plate);break;
  case'arming':sword(8,1,S.plate);break;
  case'runeblade':sword(10,1,S.plate);c.push([4,0,S.ice,1,2],[6,1,S.ice,1,2],[8,0,S.ice,1,2],[10,1,S.ice,1,2]);gem=1;break;
  case'riftedge':sword(10,1,S.rift,S.iron);c.push([1,0,'C',0,1],[1,1,'r',0,1]);break;
  case'tyrblade':add(-3,-3,0,0,'C',0);add(-2,0,0,0,S.iron,0);add(1,1,-2,3,S.void,1);c.push([1,0,'E',0,1],[1,1,'y',0,1]);add(2,13,0,1,S.rift,2);add(14,14,0,0,S.rift,2);c.push([5,0,'r',0,2],[8,1,'r',0,2],[11,0,'r',0,2]);tip=14;two=1;h2=-2;cls='two';break;
  case'club':add(-1,3,0,0,S.wood,0);add(4,8,0,1,S.wood,2);c.push([6,1,S.wood,-1,2],[9,0,S.wood,0,2]);tip=9;break;
  case'mace':add(-1,5,0,0,S.dwood,0);add(-2,-2,0,0,S.brass,0);c.push([6,0,S.steel,0,2],[10,0,S.brass,0,2]);add(7,9,-1,1,S.steel,2);c.push([8,0,S.brass,0,2]);tip=10;break;
  case'handaxe':add(-2,8,0,0,S.wood,0);axehead(8,2);tip=8;break;
  case'waraxe':add(-2,10,0,0,S.dwood,0);axehead(10,3);c.push([9,-1,S.plate,0,2]);tip=10;break;
  case'greataxe':add(-6,15,0,0,S.dwood,0);axehead(15,3);axehead(15,3,-1);c.push([16,0,S.plate,0,2],[-6,0,S.brass,0,0]);tip=16;two=1;h2=-4;cls='two';break;
  case'lordaxe':add(-4,9,0,0,S.dwood,0);axehead(9,3);axehead(9,3,-1);c.push([10,0,S.plate,0,2],[-4,0,S.brass,0,0],[5,0,S.brass,0,0]);tip=10;two=1;h2=-3;cls='two';break;
  case'spear':add(-6,9,0,0,S.wood,0);c.push([10,0,S.plate,0,2],[11,-1,S.plate,0,2],[11,0,S.plate,0,2],[11,1,S.plate,0,2],[12,0,S.plate,0,2],[13,0,S.plate,0,2]);tip=13;cls='thrust';break;
  case'warspear':add(-6,9,0,0,S.dwood,0);c.push([10,0,S.brass,0,1],[9,1,'g',0,1],[8,1,'f',0,1]);add(11,12,-1,1,S.plate,2);add(13,15,0,0,S.plate,2);tip=15;cls='thrust';break;
  case'pike':add(-9,17,0,0,S.wood,0);c.push([18,0,S.brass,0,1]);add(19,19,-1,1,S.plate,2);add(20,22,0,0,S.plate,2);tip=22;cls='thrust';two=1;h2=-5;break;
  case'shortbow':cls='bow';two=1;tip=5;break;
  case'warbow':cls='bow';two=1;tip=7;break;
  case'staff':add(-7,10,0,0,S.wood,0);c.push([10,0,S.wood,1,0],[9,0,S.wood,-1,0],[-7,0,S.wood,-1,0]);tip=10;cls='staff';two=1;h2=-4;break;
  case'focus':add(-7,9,0,0,S.dwood,0);c.push([10,0,S.brass,0,1],[11,-1,S.brass,0,1],[11,1,S.brass,0,1],[11,0,'GEM',0,2],[12,-1,'GEM',0,2],[12,0,'r',0,2],[12,1,'GEM',0,2],[13,0,'GEM',0,2]);tip=12;cls='staff';two=1;h2=-4;gem=1;break;
  case'shamstaff':add(-6,9,0,0,S.wood,0);add(10,11,-1,1,S.bone,2);c.push([12,0,S.bone,0,2],[10,-1,'0',0,2],[10,1,'0',0,2],[8,1,'g',0,1],[7,1,'g',0,1],[6,1,'f',0,1],[8,-1,'l',0,1]);tip=11;cls='staff';two=1;h2=-4;break;
  case'necstaff':add(-7,10,0,0,S.dwood,0);c.push([11,-1,S.bone,0,1],[11,1,S.bone,0,1],[12,-2,S.bone,0,1],[12,2,S.bone,0,1],[11,0,'B',0,2],[12,-1,'A',0,2],[12,0,'e',0,2],[12,1,'B',0,2],[13,0,'A',0,2]);tip=12;cls='staff';two=1;h2=-4;break;
  case'voidstaff':add(-7,9,0,0,S.iron,0);c.push([10,0,S.voidl,0,1],[11,-1,S.voidl,0,1],[11,1,S.voidl,0,1],[11,0,S.ice,0,2],[12,-1,S.ice,0,2],[12,0,'r',0,2],[12,1,S.ice,0,2],[13,0,S.ice,0,2],[14,0,S.ice,1,2]);tip=13;cls='staff';two=1;h2=-4;break;
  /* ---- arms update: hammers, polearms, greatswords, crossbows, flintlocks ---- */
  case'warhammer':add(-2,-2,0,0,S.brass,0);add(-1,8,0,0,S.dwood,0);c.push([7,0,S.iron,0,1]);add(8,10,-1,1,S.iron,2);add(8,10,2,2,S.plate,2,1);c.push([9,-2,S.plate,0,2],[9,-3,S.plate,1,2],[11,0,S.plate,1,2]);tip=11;break;
  case'pickhammer':add(-2,-2,0,0,S.brass,0);add(-1,9,0,0,S.dwood,0);c.push([8,0,S.brass,0,1]);add(9,10,-1,1,S.plate,2);add(9,10,2,2,S.plate,2,1);c.push([10,-2,S.plate,0,2],[9,-3,S.plate,0,2],[8,-4,S.plate,1,2],[11,0,S.plate,1,2],[12,0,S.plate,1,2]);tip=12;break;
  case'maul':add(-6,11,0,0,S.dwood,0);c.push([-6,0,S.iron,0,0],[-1,0,S.dleather,0,0],[-2,0,S.dleather,0,0]);add(12,15,-2,2,S.iron,2);add(12,15,2,2,S.plate,2,1);add(12,15,-2,-2,S.plate,2,-1);tip=15;two=1;h2=-4;cls='two';break;
  case'warmaul':add(-6,11,0,0,S.dwood,0);c.push([-6,0,S.brass,0,0],[-1,0,S.dleather,0,0],[-2,0,S.dleather,0,0],[11,0,S.brass,0,1]);add(12,15,-2,2,S.iron,2);add(12,12,-2,2,S.brass,2);add(15,15,-2,2,S.brass,2,-1);
   c.push([13,3,S.plate,1,2],[14,3,S.plate,0,2],[13,-3,S.plate,0,2],[14,-3,S.plate,-1,2],[16,0,S.plate,1,2]);tip=16;two=1;h2=-4;cls='two';break;
  case'bill':add(-9,12,0,0,S.wood,0);c.push([13,0,S.iron,0,1]);add(14,18,0,1,S.plate,2);c.push([16,-1,S.plate,0,2],[17,-2,S.plate,1,2],[15,2,S.plate,-1,2],[19,0,S.plate,1,2],[20,0,S.plate,1,2]);tip=20;two=1;h2=-6;cls='thrust';break;
  case'halberd':add(-9,12,0,0,S.dwood,0);c.push([12,0,S.brass,0,1],[13,0,S.brass,0,1],[-9,0,S.iron,0,0]);add(13,16,1,2,S.plate,2);c.push([12,2,S.plate,-1,2],[17,2,S.plate,-1,2],[13,3,S.plate,0,2],[14,3,S.plate,0,2],[15,3,S.plate,-1,2],[16,3,S.plate,-1,2],
   [14,-1,S.plate,0,2],[14,-2,S.plate,0,2],[15,-3,S.plate,1,2]);add(14,20,0,0,S.plate,2,1);tip=20;two=1;h2=-6;cls='thrust';break;
  case'glaive':add(-9,11,0,0,S.dwood,0);c.push([-9,0,S.brass,0,0],[11,0,S.brass,0,1],[12,0,S.brass,0,1],[12,1,S.brass,0,1],[14,-1,S.plate,0,2]);add(13,19,0,1,S.plate,2);c.push([15,2,S.plate,-1,2],[16,2,S.plate,-1,2],[17,2,S.plate,-1,2],[20,0,S.plate,1,2],[21,0,S.plate,1,2]);tip=21;two=1;h2=-6;cls='thrust';break;
  case'greatsword':add(-4,-4,0,0,S.brass,0);add(-3,0,0,0,S.dleather,0);add(1,1,-2,3,S.brass,1);add(2,14,0,1,S.plate,2);c.push([15,0,S.plate,0,2],[16,0,S.plate,1,2]);tip=16;two=1;h2=-3;cls='two';break;
  case'zweihander':add(-5,-5,0,0,S.iron,0);add(-4,0,0,0,S.dleather,0);add(1,1,-3,4,S.iron,1);add(2,4,0,1,S.steel,2);c.push([4,-1,S.iron,0,2],[4,2,S.iron,0,2]);add(5,16,0,1,S.plate,2);c.push([17,0,S.plate,0,2],[18,0,S.plate,1,2]);tip=18;two=1;h2=-4;cls='two';break;
  case'runegreat':c.push([-4,0,'GEM',0,0]);add(-3,0,0,0,S.dleather,0);add(1,1,-2,3,S.brass,1);c.push([1,0,'GEM',0,1]);add(2,15,0,1,S.plate,2);c.push([16,0,S.plate,0,2],[17,0,S.plate,1,2],[4,0,'GEM',1,2],[7,1,'GEM',1,2],[10,0,'GEM',1,2],[13,1,'GEM',1,2]);tip=17;two=1;h2=-3;cls='two';gem=1;break;
  case'xbow':case'xbow:L':case'arbalest':case'arbalest:L':case'xbow:H':case'xbow:H:L':case'xbow:R':case'xbow:R:L':case'xbow:W':case'xbow:W:L':case'arbalest:D':case'arbalest:D:L':{const heavy=id[0]==='a',L=id.slice(-2)===':L',md=id.slice(0,6),hv=md==='xbow:H',rp=md==='xbow:R',hu=md==='xbow:W',dw=id.slice(0,10)==='arbalest:D',pw=heavy?5:hv?5:hu?3:4;
   if(hu)c.push([-5,0,S.wood,0,0],[2,-1,'g',0,0]);if(dw)c.push([2,1,S.brass,0,0],[5,1,S.brass,0,0],[-6,0,S.brass,0,0],[6,-1,S.brass,0,1],[6,1,S.brass,0,1]);
   add(-4,6,0,0,hv?S.dwood:S.wood,0);add(-4,-2,1,1,S.wood,0);c.push([-4,0,heavy||hv?S.iron:S.dwood,0,0],[1,1,S.iron,0,0]);if(heavy)c.push([-5,-1,S.iron,0,0],[-5,0,S.iron,0,0],[-5,1,S.brass,0,0],[-6,-1,S.brass,0,0]);
   if(hv)c.push([3,-1,S.brass,0,0],[4,-1,S.brass,0,0],[-5,0,S.brass,0,0]);if(rp){add(2,5,-2,-1,S.dwood,1);c.push([1,-2,S.wood,0,1],[6,-2,S.iron,0,1],[3,-3,S.dwood,1,1])}
   for(let o=-pw;o<=pw;o++)c.push([7+(Math.abs(o)>=pw-1?-1:0),o,dw?S.brass:heavy?S.steel:hv?S.iron:hu?S.horn:S.dwood,Math.abs(o)===pw?-1:o<0?1:0,1]);c.push([8,0,S.iron,0,1]);
   if(L){for(let k=1;k<pw;k++){const ii=6-Math.round(k*4/pw);c.push([ii,-pw+k,'m',0,1],[ii,pw-k,'m',0,1])}c.push([2,0,'l',0,1]);add(2,8,-1,-1,S.wood,2);c.push([9,-1,S.plate,1,2],[2,-2,'g',0,2])}
   else for(let o=-pw+1;o<pw;o++)c.push([6,o,'m',0,1]);
   tip=L?9:8;two=1;h2=3;cls='xbow';break}
  case'pistol:D':c.push([-1,1,S.dwood,0,0],[-1,2,S.dwood,-1,0],[-2,2,S.brass,0,0],[0,0,S.dwood,0,0],[0,1,S.dwood,0,0],[0,-1,S.brass,1,1],[1,-1,S.brass,0,1],[-2,1,S.brass,0,0]);add(1,8,0,0,S.steel,2);c.push([1,1,S.dwood,-1,0],[2,1,S.brass,-1,0],[9,0,S.brass,0,2],[5,0,S.brass,0,2]);tip=9;cls='gun';break;
  case'pistol:B':c.push([-1,1,S.wood,0,0],[-1,2,S.wood,-1,0],[0,0,S.wood,0,0],[0,1,S.wood,0,0],[0,-1,S.iron,1,1],[1,-1,S.brass,0,1]);add(1,5,0,0,S.brass,2);c.push([6,-1,S.brass,1,2],[6,0,S.brass,0,2],[6,1,S.brass,-1,2],[1,1,S.wood,-1,0]);tip=6;cls='gun';break;
  case'pistol:C':add(-3,0,0,0,S.wood,0);add(1,6,0,1,S.iron,2);c.push([1,-1,S.iron,0,1],[0,-1,'E',0,1],[7,0,S.iron,1,2],[7,1,S.iron,-1,2]);tip=7;cls='gun';break;
  case'musket:C':add(-8,-1,0,0,S.wood,0);add(0,6,-1,1,S.iron,2);c.push([7,-1,S.iron,1,2],[7,0,S.iron,0,2],[7,1,S.iron,-1,2],[-1,-1,'E',0,1],[-8,0,S.iron,0,0],[3,0,S.brass,0,2]);tip=7;two=1;h2=-5;cls='gun';break;
  case'musket:B':case'musket:A':case'musket:L':{const m=id.slice(-1);add(-6,-1,0,1,m==='A'?S.dwood:S.wood,0);c.push([-6,0,S.brass,0,0],[-6,1,S.brass,-1,0],[-2,2,S.wood,-1,0],[0,-1,S.iron,1,1],[1,-1,S.brass,0,1]);
   const L=m==='L'?18:m==='B'?12:15;add(0,L-1,0,0,m==='A'?S.steel:S.iron,2);add(0,L-5,1,1,m==='A'?S.dwood:S.wood,0);
   if(m==='B'){c.push([L,-1,S.brass,1,2],[L,0,S.brass,0,2],[L,1,S.brass,-1,2],[L-1,0,S.brass,0,2])}else c.push([L,0,S.brass,0,2]);
   if(m==='A'){c.push([0,-2,'g',0,1],[-1,-2,'E',1,1],[4,1,S.brass,0,1])}if(m==='L'){c.push([6,1,S.brass,0,1],[12,1,S.brass,0,1],[L-6,-1,S.iron,0,2])}tip=L;two=1;h2=6;cls='gun';break}
  case'pistol':c.push([-1,1,S.wood,0,0],[-1,2,S.wood,-1,0],[-2,2,S.brass,0,0],[0,0,S.wood,0,0],[0,1,S.wood,0,0],[0,-1,S.iron,1,1],[1,-1,S.brass,0,1]);add(1,6,0,0,S.iron,2);c.push([1,1,S.wood,-1,0],[7,0,S.brass,0,2]);tip=7;cls='gun';break;
  case'musket':add(-6,-1,0,1,S.wood,0);c.push([-6,0,S.brass,0,0],[-6,1,S.brass,-1,0],[-2,2,S.wood,-1,0],[0,-1,S.iron,1,1],[1,-1,S.brass,0,1]);add(0,15,0,0,S.iron,2);add(0,11,1,1,S.wood,0);c.push([5,1,S.brass,0,1],[10,1,S.brass,0,1],[16,0,S.brass,0,2]);tip=16;two=1;h2=6;cls='gun';break;
  /* ---- the East (19-east.js): wrapped hilts (tsuka-ito over ray skin), round tsuba, a brass habaki, curved blades with a bright edge ---- */
  case'tanto':case'yoroidoshi':{const yd=id==='yoroidoshi';for(let i=-2;i<=0;i++)c.push([i,0,(i&1)?S.blk:S.white,0,0]);c.push([1,0,S.gold,0,1]);if(yd)c.push([1,-1,S.iron,0,1],[1,1,S.iron,0,1]);
   add(2,yd?6:5,0,0,S.plate,2);if(yd)add(2,4,1,1,S.steel,2,-1);c.push([yd?7:6,0,S.plate,1,2]);tip=yd?7:6;break}
  case'wakizashi':case'katana':case'katana2':case'katana3':case'nodachi':case'odachi':{const L={wakizashi:8,katana:12,katana2:12,katana3:13,nodachi:16,odachi:18}[id],hl={wakizashi:2,katana:4,katana2:4,katana3:4,nodachi:6,odachi:7}[id],
    wr=id==='katana2'?S.red:id==='odachi'?S.red:S.blk,ts=id==='katana3'||id==='katana2'?S.gold:id==='odachi'?S.brass:S.iron,bl=id==='katana3'?S.ice:S.plate;
   c.push([-hl-1,0,ts===S.iron?S.iron:S.gold,0,0]);for(let i=-hl;i<=0;i++)c.push([i,0,(i&1)?wr:S.white,0,0]);
   add(1,1,-1,1,ts,1);if(L>=12)c.push([1,-2,ts,-1,1],[1,2,ts,1,1]);c.push([2,0,S.gold,0,1]);
   const bend=Math.round(L*.62);for(let i=3;i<=L+2;i++){const o=i>bend+2?-1:0;c.push([i,o,bl,i===L+2?1:0,2]);if(L>=12&&i<=bend&&(i&1))c.push([i,o+1,S.steel,-1,2])}   // the sori: the upper third of the blade bows back
   if(id==='katana3')c.push([5,0,'r',1,2],[9,0,'F',1,2]);tip=L+2;if(L>=16){two=1;h2=-hl+1;cls='two'}break}
  case'naginata':case'naginata2':{const n2=id==='naginata2',pole=n2?S.red:S.blk;add(-9,11,0,0,pole,0);c.push([-9,0,S.gold,0,0],[-4,0,S.gold,0,0],[3,0,S.gold,0,0],[12,0,S.gold,0,1],[12,1,S.iron,0,1],[12,-1,S.iron,0,1]);
   add(13,17,0,1,S.plate,2);c.push([18,0,S.plate,0,2],[19,-1,S.plate,0,2],[20,-1,S.plate,1,2],[13,1,S.steel,-1,2]);if(n2)c.push([14,0,'d',0,2],[16,1,'r',1,2]);tip=20;two=1;h2=-6;cls='thrust';break}
  case'suyari':add(-7,10,0,0,S.wood,0);c.push([11,0,S.iron,0,1],[-7,0,S.iron,0,0]);add(12,15,0,0,S.plate,2);c.push([13,-1,S.steel,0,2],[13,1,S.steel,0,2],[16,0,S.plate,1,2]);tip=16;cls='thrust';break;
  case'jumonji':add(-7,10,0,0,S.blk,0);c.push([11,0,S.gold,0,1],[-7,0,S.gold,0,0],[3,0,S.gold,0,0]);add(12,17,0,0,S.plate,2);c.push([13,-1,S.plate,0,2],[13,1,S.plate,0,2],[13,-2,S.plate,0,2],[13,2,S.plate,0,2],[14,-3,S.plate,1,2],[14,3,S.plate,1,2],[18,0,S.plate,1,2]);tip=18;cls='thrust';break;
  case'omiyari':add(-10,17,0,0,S.blk,0);c.push([18,0,S.gold,0,1],[-10,0,S.gold,0,0],[4,0,S.gold,0,0],[-3,0,S.gold,0,0]);add(19,23,0,0,S.plate,2);c.push([20,1,S.steel,-1,2],[24,0,S.plate,1,2]);tip=24;cls='thrust';two=1;h2=-5;break;
  case'hankyu':cls='bow';two=1;tip=6;break;
  case'yumi':case'daikyu':cls='bow';two=1;tip=9;break;
  case'bo':add(-8,10,0,0,S.dwood,0);c.push([-8,0,S.iron,0,0],[-7,0,S.iron,-1,0],[10,0,S.iron,1,0],[9,0,S.iron,0,0]);tip=10;cls='staff';two=1;h2=-4;break;
  default:cls='fist';tip=0}
 c.sort((a,b)=>a[4]-b[4]);const EB=US_EBOW[id];return US_W[id]=Object.assign({id,c,cls,two,h2,tip,gem,bow:id==='warbow'?7:id==='shortbow'?5:0,reach:cls==='thrust'&&two||/great|zwei|nodachi|odachi/.test(id)},EB||{})}
const US_EBOW={hankyu:{bow:6,bowR:'blk',wrap:1,bands:1},yumi:{bow:9,bowR:'blk',asym:2,wrap:1,bands:1},daikyu:{bow:10,bowR:'red',asym:2,wrap:1,bands:1,nock:1}};
/* ---- item looks: every weapon, armor, helmet and shield id draws its own way ----
   usLookOf(id) -> the art key of an item: its `look` (unique per item), else its id; a famed item ('f:'+n) draws as its base
   item plus gold accents. Weapons: usWpnOf(id) -> a sprite weapon name: a hand-built one (usWdef switch) or 'g:<wt>:<two>:<tier>:<key>',
   which usWgen() builds from the family, the tier and keywords in the key (falchion, estoc, bearded, morningstar, partisan...). */
const US_LK={n:-1,dup:null,c:new Map()};
function usItemsN(){let n=0;if(typeof ITEMS!=='undefined')for(const k in ITEMS)n++;return n}
function usLookDup(){const n=usItemsN();if(US_LK.n!==n){US_LK.n=n;US_LK.c.clear();const d={},o={};for(const k in ITEMS){const I=ITEMS[k];if(I.famed||!I.look)continue;d[I.look]=(d[I.look]||0)+1}for(const k in d)if(d[k]>1)o[k]=1;US_LK.dup=o}return US_LK.dup}
function usFamedBase(id){const I=typeof ITEMS!=='undefined'&&ITEMS[id];return I&&I.famed&&I.base&&ITEMS[I.base]&&I.base!==id?I.base:null}
function usLookOf(id){const b=usFamedBase(id);if(b)return usLookOf(b);const I=typeof ITEMS!=='undefined'&&ITEMS[id];if(!I)return String(id);const dup=usLookDup();return I.look&&!dup[I.look]?I.look:id}
function usTierN(id){const I=ITEMS[id];if(I&&I.tier)return clamp(I.tier|0,1,5);const p=(I&&I.price)||0;return p<150?1:p<450?2:p<1100?3:p<2400?4:5}
/* the sprite weapon an item id draws as: hand-built shapes for the first-generation looks, generated ones for the rest */
const US_WHAND={knife:'knife',rondel:'rondel',club:'club',cudgel:'club',mace:'mace',flanged:'mace',shortsword:'shortsword',arming:'arming',runeblade:'runeblade',runed:'runeblade',handaxe:'handaxe',waraxe:'waraxe',greataxe:'greataxe',
 spear:'spear',warspear:'warspear',pike:'pike',shortbow:'shortbow',warbow:'warbow',staff:'staff',quarterstaff:'staff',focus:'focus',riftedge:'riftedge',
 mallet:'warhammer',hammer:'warhammer',warhammer:'pickhammer',pickhammer:'pickhammer',maul:'maul',warmaul:'warmaul',bill:'bill',billhook:'bill',halberd:'halberd',glaive:'glaive',
 greatsword:'greatsword',zweihander:'zweihander',runegreat:'runegreat',lightxbow:'xbow',crossbow:'xbow:H',xbow:'xbow',arbalest:'arbalest',pistol:'pistol',duelpistol:'pistol:D',musket:'musket',
 tanto:'tanto',yoroidoshi:'yoroidoshi',wakizashi:'wakizashi',katana:'katana',katana2:'katana2',katana3:'katana3',nodachi:'nodachi',odachi:'odachi',naginata:'naginata',naginata2:'naginata2',
 suyari:'suyari',jumonji:'jumonji',omiyari:'omiyari',hankyu:'hankyu',yumi:'yumi',daikyu:'daikyu',bo:'bo'};
function usH(s){let h=2166136261;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function usWpnKey(id){const b=usFamedBase(id);if(b){const k=usWpnKey(b);return k?k+'*':k}const I=ITEMS[id];if(!I||I.k!=='w')return null;const lk=usLookOf(id);if(US_WHAND[lk])return US_WHAND[lk];
 return'g:'+(I.wt||'sword')+':'+(I.two?1:0)+':'+usTierN(id)+':'+lk+(I.n?'|'+String(I.n).toLowerCase():'')}
/* generated weapons: a family builder steered by keywords in the look key / name, sized by tier, small details from a hash */
function usWgen(id){const p=id.split(':'),wt=p[1],two=p[2]==='1',T=+p[3]||1,nm=p.slice(4).join(':'),h=usH(nm),S=USR,c=[],K=r=>r.test(nm);
 const add=(i0,i1,o0,o1,r,g,b)=>{for(let i=i0;i<=i1;i++)for(let o=o0;o<=o1;o++)c.push([i,o,r,b|0,g])},put=(i,o,r,g,b)=>c.push([i,o,r,b|0,g]);
 let cls='swing',tw=0,h2=0,tip=8,gem=null,bow=0;
 const mt=K(/black|night|grave|dark|shadow/)?S.blk:K(/bronze|brass|gild|gold|sun/)?S.bronze:K(/rift|void|abyss/)?S.rift:K(/frost|ice|rime/)?S.ice:K(/bone|ivory/)?S.bone:S.plate;
 const gR=K(/gild|gold|noble|royal|ornate|parade/)?S.brass:[S.brass,S.iron,S.steel,S.brass][h&3],wrap=[S.dleather,S.leather,S.red,S.dleather][(h>>2)&3];
 const grip=(n,r)=>add(-n,0,0,0,r||wrap,0);
 const pom=(i,k)=>{if(k==='gem'){put(i,0,'GEM',0);gem=1}else if(k==='wheel'){put(i,0,gR,0);put(i,-1,gR,0);put(i,1,gR,-1)}else if(k==='ring'){put(i,-1,gR,0);put(i,1,gR,0);put(i-1,0,gR,0)}else if(k==='long'){put(i,0,gR,0);put(i-1,0,gR,1)}else if(k!=='none')put(i,0,gR,0)};
 const guard=(i,w,k)=>{const o1=w;if(k==='none')return;if(k==='disc'){add(i,i,-1,o1+1,gR,1);add(i+1,i+1,-1,o1+1,gR,1,-1);return}
  if(k==='S'){add(i,i,0,o1,gR,1);put(i,-1,gR,1);put(i-1,-2,gR,1);put(i,o1+1,gR,1);put(i+1,o1+2,gR,1,-1);return}
  if(k==='swept'){add(i,i,-1,o1+1,gR,1);put(i+1,-2,gR,1,1);put(i+1,o1+2,gR,1,-1);return}
  if(k==='basket'){add(i,i,-2,o1+1,gR,1);put(i-1,-2,gR,1);put(i-2,-2,gR,1);put(i-3,-1,gR,1,-1);return}
  if(k==='ring'){add(i,i,-1,o1+1,gR,1);put(i-1,-2,gR,1);put(i+1,-2,gR,1);return}
  const n=k==='wide'?3:k==='cross'?2:1;add(i,i,-n,o1+n,gR,1)};
 /* a blade from i0 for len cells, w 0 (one cell) or 1 (two); shapes: falchion sabre wavy leaf estoc broad */
 const blade=(i0,len,w,r,sh)=>{const i1=i0+len-1;for(let i=i0;i<=i1;i++){const t=(i-i0)/Math.max(1,len-1);let a=0,b=w;
   if(sh==='falchion'&&t>.45){b=w+1;if(i===i1)a=1}else if(sh==='sabre'){const s=t>.66?-1:0;a+=s;b+=s}else if(sh==='wavy'){const s=((i-i0)>>1)&1;a+=s;b+=s}else if(sh==='leaf'&&t>.3&&t<.8){a=-1;b=w+1}else if(sh==='broad'){a=-1}else if(sh==='cleaver'&&t>.2){b=w+1+(t>.6?1:0)}
   for(let o=a;o<=b;o++)put(i,o,r,2,(K(/fuller|long|bastard/)&&w&&o===0&&t>.1&&t<.85)?-1:K(/notch|waster|old/)&&o===b&&(i%3===1)?-2:o<0?1:0)}
  const tp=sh==='sabre'?-1:sh==='falchion'?w+1:sh==='cleaver'?w+2:0;if(sh!=='cleaver'&&sh!=='flat')put(i1+1,tp,r,2,1);return sh==='cleaver'||sh==='flat'?i1:i1+1};
 const runes=(i0,i1,r)=>{for(let i=i0;i<=i1;i+=3)put(i,(i>>1)&1,r,2,1);gem=1};
 const axeh=(top,sz,side,beard,r)=>{const s=side||1;for(let k=0;k<sz+2;k++){const i=top-k,n=k===0?Math.max(1,sz-1):k<=sz-1?sz:k===sz?sz-1:1,o0=k>sz-1?(k===sz?2:sz):1;for(let o=o0;o<=Math.max(o0,n+(k>sz-1?1:0));o++)put(i,o*s,r||S.plate,2,o>=sz?1:0)}
  if(beard)for(let k=1;k<=beard;k++){put(top-sz-1-k,sz*s,r||S.plate,2,-1);if(k<beard)put(top-sz-1-k,(sz-1)*s,r||S.plate,2,0)}};
 const haft=(i0,i1,r)=>add(i0,i1,0,0,r||S.wood,0);
 switch(wt){
  case'dagger':{const L=K(/stiletto|misericorde|needle/)?6:K(/dirk|bollock|long/)?5:K(/parry|main|sword.?break/)?4:K(/kris|wavy/)?5:K(/hunt|skin|seax/)?4:2+T;grip(1);pom(-2,K(/bollock/)?'wheel':K(/ear/)?'ring':T>2?'ball':'none');
   guard(1,0,K(/parry|main/)?'swept':K(/bollock|seax|hunt|skin|knife/)?'none':T>3?'cross':'bar');const sh=K(/kris|wavy/)?'wavy':K(/seax|skin|hunt|knife/)?'falchion':null;
   tip=blade(2,L,K(/stiletto|misericorde|needle/)?0:(K(/seax|parry|dirk/)?1:0),mt,sh);if(K(/rune|glyph/))runes(3,tip-1,S.ice);break}
  case'sword':case'greatsword':{const G=wt==='greatsword'||two,sh=K(/falchion|messer|cleav/)?'falchion':K(/sabre|saber|scimitar|shamshir|tulwar|curv/)?'sabre':K(/flamberge|flame|wavy|kris/)?'wavy':K(/leaf|gladius|xiphos/)?'leaf':K(/execution|headsman/)?'flat':K(/broad|claymore|nodachi/)&&!G?'broad':null;
   const est=K(/estoc|tuck|rapier|needle|epee/),L=G?11+T+(K(/claymore/)?0:K(/execution/)?-2:0):est?10+(T>3?1:0):K(/long|bastard|hand.?and/)?10:K(/short|gladius|xiphos/)?5+(T>2?1:0):6+T,w=est?0:G||K(/broad|falchion|long|bastard|execution/)?1:T>=2?1:0;
   const gl=G?3:K(/long|bastard|estoc|hand.?and/)?2:1;grip(gl);pom(-gl-1,K(/rune|gem|jewel|crystal/)?'gem':K(/wheel|knight|arming/)?'wheel':G||K(/long|bastard/)?'long':K(/rapier|sabre|sword.?break/)?'none':'ball');
   guard(1,w,K(/rapier|basket|schiav/)?'basket':K(/sabre|saber|scimitar/)?'S':K(/claymore/)?'swept':K(/estoc|tuck|long|bastard|zwei|knight/)?'cross':G?'wide':K(/falchion|messer/)?'bar':K(/ring|swiss/)?'ring':K(/gladius|short|leaf/)?'disc':T>=3?'cross':'bar');
   if(G&&K(/zwei|parry|lug/)){put(4,-1,S.iron,2);put(4,w+1,S.iron,2)}
   tip=blade(2,L,w,mt,sh);if(K(/rune|glyph|sigil|ward/))runes(4,tip-2,K(/fire|ember|sun/)?S.ember:S.ice);if(K(/fire|ember|sun|flame/)&&!K(/rune/))put(4,0,S.ember,2,1);
   if(G){tw=1;h2=-gl;cls='two'}break}
  case'axe':{const big=two||K(/great|broad|dane|bardiche/),L=big?13+T:6+T+(K(/hatchet|throw/)?-2:0),sz=big?3+(T>3?1:0):K(/hatchet|throw/)?2:T>=3?3:2;
   haft(big?-6:-2,L,K(/iron|steel|black/)?S.iron:big?S.dwood:S.wood);if(big)put(big?-6:-2,0,S.brass,0);
   axeh(L,sz,1,K(/bearded|dane|skeggox|beard/)?2:0,mt);if(K(/double|labrys|twin|great|lord/)&&!K(/dane|bearded/))axeh(L,sz-1,-1,0,mt);else if(K(/spike|pick|war/)){put(L-1,-1,S.plate,2);put(L-1,-2,S.plate,2,1)}
   put(L+1,0,K(/spike|top|war/)?S.plate:S.iron,2,1);if(K(/langet|iron|war/))add(L-4,L-2,1,1,S.iron,0);tip=L+1;if(big){tw=1;h2=-4;cls='two'}break}
  case'mace':{const L=6+(T>2?1:0)+(two?6:0);
   if(K(/club|cudgel|branch|bat/)){haft(-1,L-3,S.wood);add(L-2,L+1,0,1,S.wood,2);put(L+2,0,S.wood,2);if(K(/stud|nail|spik|iron/)){put(L-1,2,S.iron,2);put(L+1,-1,S.iron,2);put(L,2,S.iron,2,-1)}tip=L+2;break}
   haft(-1,L-1,K(/iron|steel/)?S.iron:S.dwood);put(-2,0,gR,0);
   if(K(/morning|star|spik/)){add(L,L+2,-1,1,S.iron,2);put(L+1,0,S.steel,2,1);put(L+1,-2,S.plate,2);put(L+1,2,S.plate,2,-1);put(L+3,0,S.plate,2,1);put(L-1,-1,S.plate,2,-1);put(L-1,1,S.plate,2,-1);tip=L+3}
   else if(K(/flail|chain/)){put(L,0,S.iron,1);put(L+1,1,S.iron,1);put(L+2,1,S.iron,1);add(L+3,L+5,1,3,S.iron,2);put(L+4,0,S.plate,2);put(L+4,4,S.plate,2,-1);put(L+6,2,S.plate,2,1);tip=L+6}
   else if(K(/knob|ball|round/)){add(L,L+2,-1,1,S.steel,2);put(L+3,0,S.steel,2,1);tip=L+3}
   else if(K(/bell|cathedral|holy/)){add(L,L+1,-1,1,S.steel,2);add(L+2,L+3,-2,2,S.brass,2);put(L+4,0,S.brass,2,1);put(L+4,-1,S.brass,2);put(L+4,1,S.brass,2,-1);put(L+5,0,'e',2,1);tip=L+5}
   else if(K(/pernach|winged|feather/)){add(L,L+3,-2,2,S.plate,2);for(const o of[-1,1])add(L,L+3,o,o,S.iron,2,-1);put(L+4,0,S.plate,2,1);tip=L+4}
   else{add(L+1,L+3,-1,1,S.steel,2);put(L,0,S.steel,2);put(L+2,0,S.brass,2);put(L+4,0,gR,2);tip=L+4}
   if(two){tw=1;h2=-4;cls='two'}break}
  case'hammer':{const big=two,L=big?11+(T>3?1:0):7+(T>2?1:0);haft(big?-6:-2,L,K(/iron|steel/)?S.iron:S.dwood);put(big?-6:-2,0,gR,0);
   const hw=big?2:1;add(L+1,L+2+(big?1:0),-hw,hw,K(/mallet|wood|smith/)&&!big?S.wood:S.iron,2);add(L+1,L+2+(big?1:0),hw+1,hw+1,mt,2,1);
   if(K(/pick|crow|bec|horseman/))for(let k=1;k<=3;k++)put(L+2-(k>>1),-hw-k,mt,2,k===3?1:0);else add(L+1,L+2+(big?1:0),-hw-1,-hw-1,mt,2,-1);
   if(K(/lucern|spike|war|top/)||T>=4){put(L+3+(big?1:0),0,S.plate,2,1);put(L+4+(big?1:0),0,S.plate,2,1)}if(K(/lucern/)){put(L+2,-hw-2,S.plate,2);put(L+2,hw+2,S.plate,2)}
   tip=L+4+(big?1:0);if(big){tw=1;h2=-4;cls='two'}break}
  case'spear':case'polearm':{const P=wt==='polearm'||two,L=P?11+(T>3?1:0):8+(T>2?1:0);haft(P?-9:-6,L,K(/iron|steel|ash/)?S.dwood:S.wood);if(K(/butt|iron|war/)||P)put(P?-9:-6,0,S.iron,0);
   const i=L+1;cls='thrust';
   if(K(/trident|fork|fuscina/)){put(i,0,S.iron,1);add(i,i,-2,2,S.iron,1);add(i+1,i+3,-2,-2,mt,2);add(i+1,i+4,0,0,mt,2);add(i+1,i+3,2,2,mt,2);tip=i+4}
   else if(K(/partisan|corseque|ranseur/)){put(i,0,S.brass,1);add(i+1,i+4,0,1,mt,2);put(i+1,-1,mt,2);put(i+1,2,mt,2);put(i+2,-2,mt,2,1);put(i+2,3,mt,2,-1);if(K(/ranseur|corseque/)){put(i+3,-2,mt,2,1);put(i+3,3,mt,2,-1)}put(i+5,0,mt,2,1);tip=i+5}
   else if(K(/wing/)){put(i,0,S.iron,1);put(i+1,-2,S.iron,1,1);put(i+1,2,S.iron,1,-1);put(i,-1,S.iron,1);put(i,1,S.iron,1);add(i+2,i+5,0,0,mt,2);add(i+3,i+4,-1,1,mt,2);put(i+6,0,mt,2,1);tip=i+6}
   else if(K(/boar|lug/)){put(i,-1,S.iron,1);put(i,1,S.iron,1);put(i,0,S.iron,1);add(i+1,i+3,-1,1,mt,2);add(i+4,i+5,0,0,mt,2);tip=i+5}
   else if(K(/lucern|hammer/)){put(i,0,S.brass,1);add(i,i+1,-2,1,S.iron,2);put(i-1,-2,mt,2);put(i+2,-2,mt,2,1);add(i,i+1,2,3,mt,2,-1);put(i+1,4,mt,2,-1);add(i+2,i+5,0,0,mt,2,1);tip=i+5}
   else if(K(/voulge|cleaver|bardiche|lochaber/)){add(i-3,i+3,1,2+(K(/bardiche/)?1:0),mt,2);put(i+4,1,mt,2,1);put(i+4,0,mt,2,1);put(i-4,1,mt,2,-1);tip=i+4}
   else if(K(/poleaxe|pollaxe|bec/)){put(i,0,S.brass,1);add(i,i+2,1,2,mt,2);put(i+1,3,mt,2,-1);add(i,i+1,-2,-1,S.iron,2);add(i+1,i+4,0,0,mt,2,1);tip=i+4}
   else if(K(/guisarme|hook/)){add(i,i+4,0,1,mt,2);put(i+2,-1,mt,2);put(i+3,-2,mt,2,1);put(i+5,0,mt,2,1);tip=i+5}
   else if(K(/javelin|dart|short/)){add(i,i+2,0,0,mt,2);put(i+1,-1,mt,2);put(i+1,1,mt,2,-1);tip=i+2}
   else if(K(/awl|pike|lance|needle/)){put(i,0,S.brass,1);add(i+1,i+1,-1,1,mt,2);add(i+2,i+4,0,0,mt,2,1);tip=i+4}
   else if(K(/rune|glyph/)){put(i,0,S.brass,1);add(i+1,i+4,-1,1,mt,2);put(i+2,0,S.ice,2,1);put(i+4,0,S.ice,2,1);add(i+5,i+6,0,0,mt,2,1);gem=1;tip=i+6}
   else{put(i,0,gR,1);add(i+1,i+3,-1,1,mt,2);add(i+4,i+5,0,0,mt,2);if(T>=3)put(i,1,'g',1);tip=i+5}
   if(P){tw=1;h2=-6+(L<12?1:0)}break}
  case'staff':{haft(-7,9+(T>3?1:0),K(/iron|steel/)?S.iron:K(/bone/)?S.bone:K(/dark|black|night|grave/)?S.dwood:S.wood);const t=10+(T>3?1:0);cls='staff';tw=1;h2=-4;
   if(K(/crook|shepherd/)){put(t,0,S.wood,0);put(t+1,0,S.wood,0);put(t+2,1,S.wood,0);put(t+2,2,S.wood,0);put(t+1,3,S.wood,0,-1);tip=t+2}
   else if(K(/orb|globe|moon/)){put(t,0,S.brass,1);add(t+1,t+3,-1,1,'GEM',2);put(t+2,0,'r',2);gem=1;tip=t+3}
   else if(K(/skull|bone|grave|death/)){add(t,t+2,-1,1,S.bone,2);put(t+1,-1,'0',2);put(t+1,1,'0',2);put(t+3,0,S.bone,2,1);tip=t+3}
   else if(K(/crystal|shard|prism|gem|focus|rune/)){put(t,-1,S.brass,1);put(t,1,S.brass,1);add(t+1,t+3,0,0,'GEM',2);put(t+2,-1,'GEM',2);put(t+2,1,'GEM',2);put(t+4,0,'r',2);gem=1;tip=t+4}
   else if(K(/ward|ring|circle/)){put(t,0,S.brass,1);put(t+1,-1,S.brass,1);put(t+1,1,S.brass,1);put(t+2,-1,S.brass,1);put(t+2,1,S.brass,1);put(t+3,0,S.brass,1);put(t+2,0,'GEM',2);gem=1;tip=t+3}
   else if(K(/witch|hex|thorn|briar/)){put(t,0,S.wood,0);put(t+1,-1,S.wood,0);put(t+2,-2,S.wood,0,1);put(t+1,1,S.wood,0);put(t+2,2,S.wood,0,-1);put(t+1,0,'GEM',2);put(t+2,0,'A',2);put(t-2,1,'B',1);gem=1;tip=t+2}
   else if(K(/arch|magus|crescent|sun/)){put(t,0,S.gold,1);put(t+1,-1,S.gold,1);put(t+2,-2,S.gold,1,1);put(t+1,1,S.gold,1);put(t+2,2,S.gold,1,-1);put(t+3,-2,S.gold,1,1);put(t+3,2,S.gold,1,-1);add(t+2,t+3,-1,1,'GEM',2);put(t+3,0,'r',2);put(t+4,0,'GEM',2);gem=1;tip=t+4}
   else if(K(/pilgrim|walking|palmer/)){put(t,0,S.wood,0,1);put(t+1,0,S.wood,0,1);put(t-1,-1,S.wood,0);put(t-1,1,S.wood,0);put(t-3,1,S.brass,1);put(t-4,1,'k',1);put(t-4,2,'j',1,-1);put(t-3,2,'k',1);tip=t+1}
   else{put(t,0,S.iron,0);put(-7,0,S.iron,0);if(K(/iron|shod|steel/)){put(t-1,0,S.iron,0);put(-6,0,S.iron,0);put(t+1,0,S.iron,0,1)}add(t-4,t-3,0,0,S.dleather,0);tip=t+(K(/iron|shod/)?1:0)}break}
  case'bow':{cls='bow';tw=1;bow=K(/great|long/)?8:K(/war/)?7:K(/short|self/)?5:6;tip=bow;break}
  case'crossbow':return usWdef(K(/windlass|dwarf/)?'arbalest:D':K(/hunt/)?'xbow:W':K(/arbal|siege/)?'arbalest':K(/heavy|steel|great/)?'xbow:H':K(/repeat|chu|box/)?'xbow:R':K(/hand|pistol|light/)?'xbow':T>=4?'arbalest':T>=3?'xbow:H':'xbow');
  case'flintlock':return usWdef(two?(K(/gonne|cannon/)?'musket:C':K(/blunder|scatter|dragon/)?'musket:B':K(/arque|match|caliver/)?'musket:A':K(/long|rifle|jezail/)?'musket:L':'musket'):(K(/duel|fine|long/)?'pistol:D':K(/blunder|dragon|scatter/)?'pistol:B':K(/hand.?cannon|cannon/)?'pistol:C':'pistol'));
  default:return usWdef(wt==='fist'?'fist':'shortsword')}
 c.sort((a,b)=>a[4]-b[4]);return{id,c,cls,two:tw,h2,tip,gem,bow,bowR:wt==='bow'?(K(/horn|compos|recurve/)?'horn':K(/black|night|elf|elv/)?'blk':K(/war|ash/)?'dwood':'wood'):null,recurve:wt==='bow'&&K(/recurve|compos|horn|elf|elv/),nock:wt==='bow'&&K(/elf|elv|great|royal|gild/)?'gold':null,wrap:wt==='bow'&&K(/hunt/)?'red':null,reach:cls==='thrust'&&tw||wt==='greatsword'}}
/* a famed item: its base weapon with a gilded guard and pommel, a gold collar below the head and one gold inlay on the blade; W.famed marks it for the glint */
function usFamedW(B,id){const G=USR.gold;if(B.cls==='bow')return Object.assign({},B,{id,famed:1,nock:'gold'});let im=0;for(const q of B.c)if(q[0]<im)im=q[0];const c=B.c.map(q=>{const r=q[2];let r2=r;if(q[4]===1&&typeof r==='object')r2=G;else if(q[4]===0&&q[0]===im&&typeof r==='object'&&r!==USR.dleather&&r!==USR.leather&&r!==USR.red)r2=G;return[q[0],q[1],r2,q[3],q[4]]});
 const bl=c.filter(q=>q[4]===2);if(bl.length){const m=bl[(bl.length*.4)|0];c.push([m[0],m[1],'e',0,2])}
 let h0=1e9;for(const q of c)if(q[4]>=1&&q[0]<h0)h0=q[0];if(h0===1e9)h0=B.tip-1;if(!c.some(q=>q[4]===1)){c.push([h0-1,0,G,1,1]);c.push([h0-2,0,G,0,1])}else if(!c.some(q=>q[4]===1&&q[0]===h0-1)&&h0>1){c.push([h0-1,0,G,1,1]);c.push([h0-2,0,G,0,1])}
 if(h0>=9){const m=Math.round(h0*.45);c.push([m,0,G,1,0],[m+1,0,G,0,0])}
 if(B.cls==='staff'){let t=-9;for(const q of c)if(q[0]>t)t=q[0];c.push([t+1,0,G,1,2])}c.sort((a,b)=>a[4]-b[4]);
 return Object.assign({},B,{id,c,famed:1})}
function usAx(d,i,o){const k=d[4],m=k?Math.floor(i/k):0;o[0]=d[0]*i+d[2]*m;o[1]=d[1]*i+d[3]*m;return o}
const usT2=[0,0];
function usWeapon(W,gx,gy,d,sc,gemR,clip){const nx=d[0]===0?1:0,ny=d[0]===0?0:1;let g=-1;sc=sc||1;const gl0=usGl;usGl=W.famed&&usG===US.grid[0]||W.famed&&usG===US.grid[1]?1:0;
 for(const c of W.c){if(c[4]!==g){g=c[4];usPart()}let r=c[2];if(r==='GEM')r=gemR||USR.ice;
  for(let a=0;a<sc;a++)for(let b=0;b<sc;b++){usAx(d,c[0]*sc+a,usT2);const x=gx+usT2[0]+nx*(c[1]*sc+b),y=gy+usT2[1]+ny*(c[1]*sc+b);if(clip&&y>-1)continue;usP(x,y,r,c[3])}}usGl=gl0}
/* bow: limb curving toward +x, string behind it; st 0 rest, 1 drawn (to px,py), 2 loosed */
function usBow(n,gx,gy,st,px_,py_,s,W){const war=(W&&W.bow||n)>=7&&!(W&&W.bowR),wr=W&&W.bowR?USR[W.bowR]:war?USR.dwood:USR.wood,rc=W&&W.recurve,as=W&&W.asym||0,top=n+as,bot=n-as;usPart();s=s||1;
 const cur=k=>{const a=Math.abs(k),L=k<0?top:bot;return(a<=L*.45?0:a<L-1?-1:rc?0:-2)*s};   // W.asym: the yumi's grip sits below the middle (a longer upper limb)
 if(st===1){for(const q of[-1,1]){const x0=gx-2,y0=gy+(q<0?-top:bot),dx=px_-x0,dy=py_-y0,m=Math.max(Math.abs(dx),Math.abs(dy));for(let i=1;i<=m;i++)usP(x0+Math.round(dx*i/m),y0+Math.round(dy*i/m),'m')}
  for(let x=px_;x<=gx+2;x++)usP(x,py_,x>=gx+2?'q':x===px_?'l':'k')}
 else for(let k=-top+1;k<bot;k++)usP(gx-2*s,gy+k,'m');
 usPart();for(let k=-top;k<=bot;k++){usP(gx+cur(k),gy+k,wr,W&&W.bands&&k%4===0?1:0);if((k===-top||k===bot)&&(war||(W&&W.nock)))usP(gx+cur(k),gy+k,W&&W.nock?USR.gold:USR.brass)}
 if(rc){usP(gx+s,gy-top-1,wr,1);usP(gx+s,gy+bot+1,wr,-1)}usP(gx,gy,W&&W.famed?USR.gold:W&&W.wrap?USR.red:USR.leather);if(W&&(W.wrap||W.famed))usP(gx,gy+1,W.wrap?USR.red:USR.gold,-1)}
/* shields: every look draws its own outline and face at any size. family from the look key (looks start with it: kite2, round3...),
   face device per look. usShield(look,cx,cy,col,inside) on the battle sprite; usShieldAt(look,cx,top,k,col) for portraits and icons. */
const US_SHF=['buckler','targe','round','spiked','heater','kite','tower','pavise'];
const US_SHD={buckler:[5,5],targe:[7,7],round:[7,7],spiked:[7,7],heater:[7,8],kite:[7,11],tower:[7,10],pavise:[9,11]};   // base width, height (battle sprite)
function usShFam(k){k=String(k||'');for(const f of US_SHF)if(k.slice(0,f.length)===f)return f;return/tower/.test(k)?'tower':/pavis/.test(k)?'pavise':/spik/.test(k)?'spiked':/targe/.test(k)?'targe':/round/.test(k)?'round':/kite/.test(k)?'kite':/heater/.test(k)?'heater':'buckler'}
/* the face of each look: dev (device), rim, boss, field ('c' cloth dye / a ramp name), alt (second tincture) */
const US_SHV={buckler:{dev:'plain',field:'wood',rim:'iron',boss:'brass'},buckler2:{dev:'rings',field:'steel',rim:'plate',boss:'spike'},
 targe:{dev:'studs',field:'leather',rim:'dleather',boss:'brass',alt:'brass'},round:{dev:'halves',field:'c',rim:'dwood',boss:'steel',alt:'wood'},round2:{dev:'cross',field:'c',rim:'iron',boss:'steel',alt:'white'},
 round3:{dev:'runes',field:'steel',rim:'brass',boss:'brass',alt:'brass'},spiked:{dev:'plain',field:'c',rim:'iron',boss:'spike'},spiked2:{dev:'bands',field:'c',rim:'iron',boss:'spike',alt:'iron',spikes:1},
 kite:{dev:'pale',field:'c',rim:'none',boss:'brass',alt:'white'},kite2:{dev:'chevron',field:'c',rim:'brass',boss:'none',alt:'white'},heater:{dev:'cross',field:'c',rim:'none',boss:'none',alt:'white'},
 heater2:{dev:'quarter',field:'c',rim:'brass',boss:'none',alt:'brass'},tower:{dev:'bands',field:'c',rim:'brass',boss:'brass',alt:'brass'},tower2:{dev:'rivets',field:'steel',rim:'plate',boss:'none',alt:'c'},
 pavise:{dev:'ridge',field:'c',rim:'wood',boss:'none',alt:'white'}};
function usShVar(k){let v=US_SHV[k];if(v)return v;if(k.slice(-1)==='*'){v=Object.assign({},usShVar(k.slice(0,-1)),{rim:'gold',gold:1});if(v.boss==='steel'||v.boss==='none')v.boss='brass';US_SHV[k]=v;return v}const f=usShFam(k),h=usH(k),D=['plain','cross','pale','chevron','quarter','bands','rivets','halves','studs','bend'];
 v=Object.assign({},US_SHV[f]||US_SHV.round,{dev:D[h%D.length],rim:['iron','brass','dwood','plate'][(h>>4)&3]});US_SHV[k]=v;return v}
function usShHalf(f,t){switch(f){case'buckler':case'targe':case'round':case'spiked':{const u=2*t-1;return Math.sqrt(Math.max(0,1-u*u))*1.04}
  case'heater':return t<.5?1:Math.max(0,1-Math.pow((t-.5)/.5,1.5));case'kite':return t<.18?.55+.45*Math.sqrt(t/.18):t<.34?1:Math.max(0,1-(t-.34)/.66);
  case'tower':return t<.05||t>.95?.86:1;case'pavise':return t<.06?.72:t<.12?.9:1}return 1}
function usShGeom(look,k){const f=usShFam(look),d=US_SHD[f];let W=Math.round(d[0]*k),H=Math.round(d[1]*k);if(!(W&1))W++;if(f!=='kite'&&f!=='heater'&&f!=='tower'&&f!=='pavise'&&H!==W)H=W;
 const n=(W-1)/2,r=[];for(let j=0;j<H;j++){const t=H<2?0:j/(H-1);let hw=Math.round(usShHalf(f,t)*n);if(f==='kite'||f==='heater')hw=Math.max(j===H-1?0:1,hw);if((f==='round'||f==='targe'||f==='spiked'||f==='buckler')&&(j===0||j===H-1))hw=Math.min(hw,Math.max(1,Math.round(n*.45)));r.push([-hw,hw])}
 return{f,W,H,n,r}}
const US_SHG=new Map();function usShG(look,k){const id=look+'@'+k;let g=US_SHG.get(id);if(!g){g=usShGeom(look,k);US_SHG.set(id,g)}return g}
function usShR(n,col){return n==='c'?col:n==='white'?USR.white:USR[n]||col}
/* paint a shield with its top-left of the shape box at (cx - n, top) */
function usShieldAt(look,cx,top,k,col,inside){const G=usShG(look,k),V=usShVar(look),f=G.f,H=G.H,n=G.n,F=usShR(V.field,col),A=usShR(V.alt||'white',col),Rm=V.rim==='none'?null:usShR(V.rim,col),big=k>=1.5;
 usGrp=2;usPart();usGrp=0;
 for(let j=0;j<H;j++){const r=G.r[j],y=top+j,t=H<2?0:j/(H-1);for(let x=r[0];x<=r[1];x++){const edge=x===r[0]||x===r[1]||j===0||j===H-1||(j>0&&(x<G.r[j-1][0]||x>G.r[j-1][1]))||(j<H-1&&(x<G.r[j+1][0]||x>G.r[j+1][1]));
   if(inside){usP(cx+x,y,edge&&Rm&&V.rim!=='dwood'&&V.rim!=='wood'?Rm:V.field==='steel'?USR.iron:V.field==='leather'?USR.leather:USR.wood,-1);continue}
   const u=n?x/n:0,edge0=x===r[0]||x===r[1]||j===0||j===H-1||(j>0&&(x<G.r[j-1][0]||x>G.r[j-1][1]))||(j<H-1&&(x<G.r[j+1][0]||x>G.r[j+1][1]));
   let R=F,b=0;
   switch(V.dev){case'halves':if(x>0)R=A;break;case'cross':if(Math.abs(x)<=(big?1:0)||Math.abs(t-.4)*H<=(big?1:.5))R=A;break;case'pale':if(x===0||(big&&x===-1))R=A;break;
    case'chevron':{const cy=.25+Math.abs(u)*.35;if(Math.abs(t-cy)*H<(big?1.6:1))R=A;break}case'quarter':if((x>0)!==(t>.45))R=A;break;
    case'bands':if(Math.abs(t-.25)*H<.6||Math.abs(t-.75)*H<.6)R=A;break;case'bend':if(Math.abs(u-(t*2-1))<(big?.3:.4))R=A;break;
    case'rivets':if(!edge&&(((x+j)&3)===0)&&Math.abs(x)!==0)b=1;if(x===0)R=A;break;case'studs':{const d=Math.hypot(u,2*t-1);if(Math.abs(d-.62)<(big?.12:.2)&&((x+j)&1)===0)R=A;break}
    case'rings':{const d=Math.hypot(u,2*t-1);if(Math.abs(d-.6)<(big?.1:.22))b=-1;break}case'runes':{const d=Math.hypot(u,2*t-1);if(Math.abs(d-.58)<(big?.12:.2)&&((x*3+j)%3===0))R=A;break}
    case'ridge':if(x===0){R=A;b=1}else if(x===1)R=A;break;case'scales':if((j&1)===0?((x&1)===0):((x&1)===1))b=-1;else if(((x+j)%3)===0)b=1;break}
   if(edge&&Rm)R=Rm;usP(cx+x,y,R,b+(edge&&Rm?(x>0||t>.6?-1:0):0))}}
 if(inside){const m=top+(H>>1);usPart();usP(cx,m-1,USR.dleather);usP(cx-1,m-1,USR.dleather);usP(cx,m+1,USR.dleather);usP(cx-1,m+1,USR.dleather);return G}
 const my=top+(f==='kite'?Math.round(H*.36):f==='heater'?Math.round(H*.4):H>>1),bs=Math.max(0,Math.round(k)-1);
 if(V.boss==='brass'||V.boss==='steel'){usGrp=2;usPart();usGrp=0;const B=USR[V.boss];for(let a=-bs-(f==='round'||f==='targe'||f==='tower'?1:0);a<=bs+1;a++)for(let b2=-bs-1;b2<=bs+1;b2++)if(Math.abs(a)+Math.abs(b2)<=bs+1)usP(cx+a,my+b2,B,a+b2<0?1:a+b2>0?-1:0)}
 if(V.leaf){usPart();for(const [a,q,k2] of[[-1,-1,'B'],[0,-2,'A'],[1,-1,'A'],[0,0,'c'],[-2,1,'B'],[2,1,'B']])usP(cx+a,my+q,USR.leaf,k2==='A'?1:k2==='c'?0:-1);usF(cx,my,'c')}
 if(V.boss==='spike'){usGrp=2;usPart();usGrp=0;usP(cx,my,USR.plate,1);usP(cx-1,my,USR.iron);usP(cx+1,my,USR.iron,-1);usP(cx,my-1,USR.iron,1);usP(cx,my+1,USR.iron,-1);if(big){usP(cx,my-2,USR.plate,1);usP(cx+1,my-1,USR.plate)}
  if(V.spikes||f==='spiked'){usPart();usP(cx,top-1,USR.plate,1);usP(cx,top+H,USR.plate,-1);if(V.spikes){usP(cx-n-1,my,USR.plate,0);usP(cx+n+1,my,USR.plate,-1);if(big){usP(cx,top-2,USR.plate,1);usP(cx-n-2,my,USR.plate)}}}}
 return G}
function usShield(type,cx,cy,col,inside){if(usCrk&&!inside){usCrk=0;usShield(type,cx,cy,col,inside);usCrk=1;usShCrack(type,cx,cy);return}const G=usShG(type,1);usGl=!inside&&type.slice(-1)==='*'?1:0;usShieldAt(type,cx,cy-((G.H-1)>>1),1,col||usCloth('red'),inside);usGl=0}
function usShCrack(type,cx,cy){const G=usShG(type,1),n=G.H,top=cy-((n-1)>>1);usGrp=2;usPart(1);usGrp=0;for(let j=0;j<n;j++){const r=G.r[j],x=cx+((j%3)===1?0:-1)+(j>n/2?1:0);if(x>=cx+r[0]&&x<=cx+r[1])usP(x,top+j,'0')}
 const r0=G.r[0];usE(cx+r0[1],top);if(n>4){usE(cx+r0[1],top+1);usP(cx+G.r[n-2][0],top+n-2,'0')}}
/* a shield's look key (its own `look`, unique per item; famed: the base's) */
function usShLook(id){const I=typeof ITEMS!=='undefined'&&ITEMS[id];if(!I)return usShFam(id)===id?id:'buckler';return usLookOf(id)+(usFamedBase(id)?'*':'')}
let usCrk=0;                                                                                              // set per build: the shield in hand is past half its hitpoints
/* ---- the same weapon, off the figure: 16x16 item icon (diagonal) and the 32x32 portrait's weapon over the shoulder (upright) ----
   Drawn with the sprite's own cells, shading and outline, so a weapon is the same object in battle, in the bust and in the bag. */
function usWpts(W,d,sc,L,thick){const C=W.c;if(!C.length)return[];let i0=1e9,i1=-1e9,h0=1e9;for(const c of C){if(c[0]<i0)i0=c[0];if(c[0]>i1)i1=c[0];if(c[4]>=1&&c[0]<h0)h0=c[0]}if(h0>i1)h0=i0;
 const span=i1-i0,hl=i1-h0,map=i=>{if(!L||span<=L)return i-i0;if(hl<=L-3){const hs=L-hl-1,k=Math.max(1,h0-i0);return i>=h0?hs+1+(i-h0):Math.round((i-i0)*hs/k)}return Math.round((i-i0)*L/span)};
 const nx=d[0]===0?1:0,ny=1-nx,o=[];
 for(const c of C){const ii=map(c[0]);for(let a=0;a<sc;a++)for(let b=0;b<sc+(thick?1:0);b++){usAx(d,ii*sc+a,usT2);o.push([usT2[0]+nx*(c[1]*sc+b),usT2[1]+ny*(c[1]*sc+b),c])}}return o}
function usWdraw(pts,dx,dy,gem){let g=-1;for(const p of pts){const c=p[2];if(c[4]!==g){g=c[4];usPart()}let r=c[2];if(r==='GEM')r=gem||USR.ice;usP(p[0]+dx,p[1]+dy,r,c[3])}}
/* icon form of a hafted weapon: the head (guard / head / blade cells) at 2x, the haft below it squeezed into hl cells */
function usWpts2(W,d,hl){const C=W.c;let i0=1e9,h0=1e9;for(const c of C){if(c[0]<i0)i0=c[0];if(c[4]>=1&&c[0]<h0)h0=c[0]}if(h0===1e9)return null;const k=Math.max(1,h0-i0),o=[];
 for(const c of C){const hd=c[0]>=h0;if(!hd&&c[4]>=1)continue;const sc=hd?2:1,ii=hd?hl+(c[0]-h0)*2:Math.round((c[0]-i0)*(hl-1)/k);for(let a=0;a<sc;a++)for(let b=0;b<2;b++){usAx(d,ii+a,usT2);o.push([usT2[0]+(d[0]===0?1:0)*(c[1]*2+b),usT2[1]+(d[0]===0?0:1)*(c[1]*2+b),c])}}
 o.sort((a,b)=>a[2][4]-b[2][4]);return o}
function usBbox(pts){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const p of pts){if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1]}return{x0,x1,y0,y1}}
const US_WI=new Map();let US_ICD="UR2";
function usWeaponIconRows(key){let r=US_WI.get('i'+key);if(r)return r;const W=usWdef(key);usBeginAt(16,16,0,0);
 if(W.cls==='bow'){const n=Math.min(W.bow||5,6);usBow(n,9,8,0,0,0,1,W);usPart();for(let x=4;x<=12;x++)usP(x,8,x>=12?USR.plate:x<=5?USR.red:USR.wood,x>=12?1:0)}
 else if(W.c.length){const cnt={};let a2=1e9,b2=-1e9,wd=0;for(const c of W.c)if(c[4]===2){cnt[c[0]]=(cnt[c[0]]||0)+1;if(cnt[c[0]]>wd)wd=cnt[c[0]];if(c[0]<a2)a2=c[0];if(c[0]>b2)b2=c[0]}
  const d=USD[W.cls!=='gun'&&W.cls!=='xbow'&&(wd>=3&&b2-a2<=7||/^g:(axe|mace|hammer):0|^(handaxe|club|warhammer)$/.test(W.id||''))?'UR2':'UR'];let pts=usWpts(W,d,2,0),b=usBbox(pts);
  if(b.x1-b.x0>13||b.y1-b.y0>13){for(let hl=6;hl>=3;hl--){const p2=usWpts2(W,d,hl);if(!p2)break;const b2=usBbox(p2);if(b2.x1-b2.x0<=13&&b2.y1-b2.y0<=13){pts=p2;b=b2;break}}}
  if(b.x1-b.x0>13||b.y1-b.y0>13){pts=usWpts(W,d,1,0,1);b=usBbox(pts)}
  if(b.x1-b.x0>13||b.y1-b.y0>13){for(let L=12;L>=4;L--){pts=usWpts(W,d,1,L,1);b=usBbox(pts);if(b.x1-b.x0<=13&&b.y1-b.y0<=13)break}}
  usWdraw(pts,1+((13-(b.x1-b.x0))>>1)-b.x0,1+((13-(b.y1-b.y0)+1)>>1)-b.y0,W.gem?USR.ice:null)}
 r=usResolveKeys(usG,0);US_WI.set('i'+key,r);return r}
/* portrait: upright at 2x, the tip near the top, the rest hidden behind the shoulder */
function usWeaponPtRows(key){let r=US_WI.get('p'+key);if(r)return r;const W=usWdef(key);usBeginAt(32,32,0,0);
 if(W.cls==='bow'){const n=(W.bow||5)+6;usBow(n,26,n+1,0,0,0,1,W)}
 else if(W.c.length){const sc=W.tip<=6?2:2,pts=usWpts(W,USD.U,sc,0),b=usBbox(pts),cx=W.cls==='xbow'?24:b.y1-b.y0<=21?27:26;
  usWdraw(pts,cx-Math.round((b.x0+b.x1)/2),b.y1-b.y0<=21?23-b.y1:1-b.y0,W.gem?USR.ice:null)}
 r=usResolveKeys(usG,0);US_WI.set('p'+key,r);return r}
/* ---- helmets: look -> the shape drawn on the head (sprite, bust, icon) ---- */
const US_HV={jingasa:'jingasa',hachigane:'hachigane',kabuto:'kabuto',menpo:'menpo',kawari:'kawari',armcap:'armcap',cap:'cap',hood:'hood',coif:'coif',spangen:'spangen',kettle:'kettle',nasal:'nasal',barbute:'barbute',bascinet:'bascinet',sallet:'sallet',armet:'armet',greathelm:'great',great:'great'};
function usHelmHat(id){const lk=ITEMS[id]?usLookOf(id):id;if(US_HV[lk])return US_HV[lk];const I=ITEMS[id]||{},s=(lk+' '+(I.n||'')).toLowerCase();
 return/kabuto|kawari/.test(s)?(/menpo/.test(s)?'menpo':/kawari/.test(s)?'kawari':'kabuto'):/jingasa/.test(s)?'jingasa':/great|pot|bucket/.test(s)?'great':/armet|close|visor/.test(s)?'armet':/bascinet|hounskull/.test(s)?'bascinet':/sallet/.test(s)?'sallet':/barbut/.test(s)?'barbute':/spangen|conical/.test(s)?'spangen':/nasal|norman/.test(s)?'nasal':/kettle|chapel|morion/.test(s)?'kettle':/coif|mail|chain/.test(s)?'coif':/hood|cowl/.test(s)?'hood':/arming|padded|quilt/.test(s)?'armcap':'cap'}
/* ---- off-figure armor, helmet and shield icons (16x16), from the rig's own painters ---- */
const US_IB={tw:8,th:8,ll:6,lw:3,aw:2,hw:10,hh:9,er:4,eh:2,jaw:1},US_IA={tw:8,th:8,ll:5,lw:3,aw:2,hw:8,hh:8};
function usArmorIconRows(id){let r=US_WI.get('a'+id);if(r)return r;const av=usArmorV(id),S={kind:'hum',seed:3,b:US_IA,skin:usSkin(['s','t','u','i']),armor:av.k,av,robeC:'blue',ragC:'tan'};
 if(av.trim==='white')S.trim=USR.white;else if(av.trim==='steel')S.trim=USR.steel;else if(av.trim==='gold')S.trim=USR.gold;if(av.spikes)S.spike=1;if(av.spikeR)S.spikeR=USR[av.spikeR];
 const A=usArmor(S),P={st:'idle',fr:0,lg:[0,0,0,0]};usBeginAt(16,16,8,15);const x0=-4,x1=3,ty=-13,sy=ty+1;
 usArm(S,A,x0-2,sy,x0-4,sy+6,1);usArm(S,A,x1+1,sy,x1+3,sy+6,1);usTorso(S,A,0,P,x0,ty);usSkirt(S,A,0,P,x0,ty);
 if(A.paul){usPart();for(const xs of[x0-3,x1+1])for(let x=xs;x<=xs+2;x++){usP(x,sy-1,A.paul,x>0?-1:1);usP(x,sy,A.paul,x>0?-1:0)}if(S.spike){usP(x0-2,sy-2,A.paul,1);usP(x1+2,sy-2,A.paul,1)}}
 if(!av.collar&&!av.mantle){usE(-1,ty);usE(0,ty);if(av.k!=='plate'&&av.k!=='robe'){usE(-1,ty+1);usE(0,ty+1)}}
 r=usResolveKeys(usG,av.k==='plate');US_WI.set('a'+id,r);return r}
function usHelmIconRows(id){let r=US_WI.get('h'+id);if(r)return r;const hat=usHelmHat(id),S={kind:'hum',seed:3,b:US_IB,skin:usRamp('234',1),hat,famH:!!usFamedBase(id),hatR:hat==='hood'?usCloth('brown'):null};
 S.skin=usSkin(['s','t','u','i']);usBeginAt(16,16,0,0);usHead(S,0,8,hat==='spangen'||hat==='bascinet'||hat==='armet'?5:4);r=usResolveKeys(usG,0);US_WI.set('h'+id,r);return r}
function usShieldIconRows(id){let r=US_WI.get('s'+id);if(r)return r;const lk=usShLook(id),f=usShFam(lk),d=US_SHD[f],k=Math.min(13/d[1],13/d[0]),G=usShG(lk,k);
 usBeginAt(16,16,0,0);usShieldAt(lk,7,1+((14-G.H)>>1),k,usCloth('red'),0);r=usResolveKeys(usG,0);US_WI.set('s'+id,r);return r}
/* the 32x32 bust's shield, at about twice the battle size, on the left of the frame */
function usShieldPtRows(look,col){const id='P'+look+':'+(col&&col.t||'');let r=US_WI.get(id);if(r)return r;const f=usShFam(look),k=f==='buckler'?2.2:f==='pavise'?1.6:1.8;usBeginAt(32,32,0,0);const G=usShG(look,k);
 usShieldAt(look,G.n,Math.max(12,33-G.H),k,col||usCloth('red'),0);r=usResolveKeys(usG,0);US_WI.set(id,r);return r}
/* ---- stowed gear: the weapon not in hand (u.alt / m.eq.b / an enemy's def.side) and a shield slung on the back ----
   'belt' a dagger in its sheath at the belt, 'sword' a scabbard at the hip, 'axe' / 'mace' hung from the belt,
   'bow' carried across the back, 'back' a long or two-handed weapon slung diagonally across the back. */
function usStowCls(W){if(!W||W.cls==='fist'||!W.c)return W&&W.cls==='bow'?'bow':null;if(W.cls==='bow')return'bow';if(W.two||W.cls==='thrust'||W.cls==='staff')return'back';
 const id=W.id||'';if(W.cls==='gun')return'pistol';if(/hammer/.test(id))return'hammer';if(/knife|rondel|dagger/.test(id))return'belt';if(/axe/.test(id))return'axe';if(/club|mace/.test(id))return'mace';return'sword'}
function usWeaponSeg(W,gx,gy,d,i0,i1){const nx=d[0]===0?1:0,ny=1-nx;let g=-1;
 for(const c of W.c){if(c[0]<i0||c[0]>i1)continue;if(c[4]!==g){g=c[4];usPart()}let r=c[2];if(r==='GEM')r=USR.ice;usAx(d,c[0]-i0,usT2);const y=gy+usT2[1]+ny*c[1];if(y>-1)continue;usP(gx+usT2[0]+nx*c[1],y,r,c[3])}}
function usPC(x,y,r,b){if(y<=-1)usP(x,y,r,b)}                                                           // stowed parts never dip below the ground line
/* back-mounted: a bow, a long weapon, a slung shield. v 0: drawn behind the body (only the ends show); v 1: over the back */
function usStowBack(S,v,x0,x1,ty,th){const W=S.alt,cl=S.altCls,b=S.b,by=ty+th-(th>=8?2:1);
 if(S.slung){const cx=v?((x0+x1)>>1):x0-2,cy=ty+(usShFam(S.slung)==='buckler'?3:4);usShield(S.slung,cx,cy,S.shR||usCloth('red'),0)}
 if(cl==='bow'){const n=W.bow||5,xa=v?x0:x0-1,ya=ty-2-Math.max(0,n-5),xb=v?x1:x1+1,yb=by+2+(n>7?1:0),m=Math.max(Math.abs(xb-xa),Math.abs(yb-ya));usPart();
  for(let i=0;i<=m;i++)usPC(xa+Math.round((xb-xa)*i/m)+1,ya+Math.round((yb-ya)*i/m)-1,'m');
  const br=W.bowR?USR[W.bowR]:n>5?USR.dwood:USR.wood;usPart();for(let i=0;i<=m;i++){const t=i/m,bg=Math.round(Math.sin(Math.PI*t)*1.6);usPC(xa+Math.round((xb-xa)*t)-bg,ya+Math.round((yb-ya)*t)+bg,br,i===0||i===m?1:0)}
  if(W.recurve){usPC(xa-1,ya,br,1);usPC(xb+1,yb,br,-1)}if(n>5&&!W.bowR||W.nock){const nk=W.nock?USR.gold:USR.brass;usPC(xa,ya,nk);usPC(xb,yb,nk)}if(W.wrap){const t=.5,bg=2;usPC(xa+Math.round((xb-xa)*t)-bg+1,ya+Math.round((yb-ya)*t)+bg-1,USR.red)}if(W.famed)usPC(xa+Math.round((xb-xa)*.5)-1,ya+Math.round((yb-ya)*.5)+1,USR.gold)}
 else if(cl==='back'){const tip=W.tip;let im=0;for(const c of W.c)if(c[0]<im)im=c[0];const i0=Math.max(im,tip-16);if(v)usWeaponSeg(W,x0+1,by+1,USD.UR2,i0,tip+1);else usWeaponSeg(W,x1,by+2,USD.UL2,i0,tip+1)}}
/* belt-mounted, drawn over the torso in both views */
function usStowHip(S,v,x0,x1,ty,th){const cl=S.altCls,by=ty+th-(th>=8?2:1),R=USR,W=S.alt;if(!cl||cl==='bow'||cl==='back')return;usPart();
 let im=0;for(const c of W.c)if(c[0]<im)im=c[0];const hilt=(x,y)=>usWeaponSeg(W,x,y-(1-im),USD.D,im,1);   // the weapon's own pommel, grip and guard, upright above its sheath
 let o0=9,o1=-9;for(const c of W.c)if(c[4]===2){if(c[1]<o0)o0=c[1];if(c[1]>o1)o1=c[1]}const sw=o1-o0>=1?1:0;
 if(cl==='belt'){const x=v?x0+2:x1-1,n=Math.min(6,Math.max(3,W.tip-2));for(let j=1;j<=n;j++){usPC(x,by+j,R.dleather,j===n?-1:0);if(sw)usPC(x+1,by+j,R.dleather,-1)}usPC(x,by+n+1,R.brass,-1);hilt(x,by);return}
 const hx=v?x0+1:x1;
 if(cl==='sword'){const n=Math.min(9,Math.max(4,W.tip-3));for(let i=0;i<n;i++){usPC(hx-((i+1)>>1),by+1+i,R.dleather,i===n-1?-1:0);if(sw&&i<n-1)usPC(hx-((i+1)>>1)+1,by+1+i,R.dleather,-1)}usPC(hx-((n+1)>>1),by+1+n,R.brass,-1);hilt(hx,by);return}
 if(cl==='pistol'){const x=v?x0+1:x1;usPC(x,by,R.dleather,0);for(let j=1;j<=4;j++)usPC(x-(j>>2),by+j,R.dleather,j===4?-1:0);usPC(x-1,by+1,R.dleather,-1);usPC(x-1,by+5,R.iron,-1);usWeaponSeg(W,x,by-1-(0-im),USD.D,im,0);return}
 /* axes, maces, hammers: hung head up through a belt loop */
 usPC(hx,by,R.dleather);usWeaponSeg(W,hx,by+3,USD.U,W.tip-6,W.tip+1)}
/* body armor looks: k the drawn kind (rig + texture), then per-look details. Unknown looks: kind by keywords, details by hash. */
const US_AV={rags:{k:'rags'},jack:{k:'padded',body:'straw',tex:'diamond',collar:1},padded:{k:'padded'},hide:{k:'leather',body:'fur',tex:'hide',mantle:1},leather:{k:'leather'},
 studded:{k:'leather',body:'dleather',tex:'studs'},robe:{k:'robe'},sigilrobe:{k:'robe',sig:1,trim:'white'},archrobe:{k:'robe',trim:'gold',mantle:1,sig:2},mailrobe:{k:'robe',mailtop:1,trim:'steel'},
 kesa:{k:'robe',body:'straw',trim:'gold',kesa:1},tatami:{k:'lamellar',A:{body:'blk',paul:'blk',skB:'blk'},odo:'X'},do:{k:'lamellar',A:{body:'blk',paul:'blk',skB:'blk',shin:'blk'},odo:'g',sode:1},
 domaru:{k:'lamellar',A:{body:'red',paul:'red',skB:'red',shin:'blk'},odo:'y',sode:1},oyoroi:{k:'lamellar',A:{body:'blk',paul:'red',skB:'blk',shin:'blk',fore:'blk'},odo:'g',sode:2,gild:1},
 brigandine:{k:'brig'},mail:{k:'mail'},lamellar:{k:'lamellar'},scale:{k:'scale'},coatplates:{k:'coat'},plate:{k:'plate'},gothic:{k:'plate',tex:'flute',spikes:1}};
function usArmorV(id){if(usFamedBase(id)){const lk=usLookOf(id)+'*';return US_AV[lk]||(US_AV[lk]=Object.assign({},usArmorV(usFamedBase(id)),{gold:1}))}const lk=ITEMS[id]?usLookOf(id):id;let v=US_AV[lk];if(v)return v;const I=ITEMS[id]||{},s=(lk+' '+(I.n||'')).toLowerCase(),h=usH(lk);
 const k=/robe|vest|mantle|cassock/.test(s)?'robe':/plate|cuirass|harness/.test(s)&&!/coat/.test(s)?'plate':/coat/.test(s)?'coat':/lamell/.test(s)?'lamellar':/scale/.test(s)?'scale':/brig/.test(s)?'brig':/mail|chain|hauberk|byrnie/.test(s)?'mail':/leather|hide|jerkin/.test(s)?'leather':/pad|gambes|quilt|jack|aketon/.test(s)?'padded':(I.arm||0)>=200?'plate':(I.arm||0)>=130?'mail':(I.arm||0)>=80?'leather':'padded';
 v={k,tex:['diamond','studs','flute',null][h&3],trim:['gold','white','steel',null][(h>>2)&3],mantle:(h>>4)&1};US_AV[lk]=v;return v}
/* per-look details over the torso (front view v 0; a few on the back) */
function usArmDet(S,A,v,x0,x1,ty,th,fc){const V=S.av;if(!V)return;const a=S.armor,y1=ty+th-1;
 if(V.gold){for(let x=x0+1;x<=x1-1;x++)usF(x,ty,x<fc?'d':'c');usF(x0+1,ty+2,'e');usF(x1-1,ty+3,'d')}
 if(V.tex==='studs')for(let y=ty+1;y<y1-1;y+=2)for(let x=x0+1+((y>>1)&1);x<x1;x+=2)usF(x,y,'p');
 if(a==='brig')for(let y=ty+1;y<y1-1;y+=2)for(let x=x0+1;x<x1;x+=2)if(x!==fc)usF(x,y,v?'b':'c');
 if(a==='lamellar')for(let y=ty+2;y<y1-1;y+=3)for(let x=x0+((y>>1)&1);x<=x1;x+=2)usF(x,y,'g');
 if(a==='coat'){for(let y=ty+2;y<y1-1;y+=3)for(let x=x0+1;x<x1;x+=3)usF(x,y,'q');if(v===0)for(let j=1;j<th-2;j++)usB(fc,ty+j,-1)}
 if(V.collar){usPart();for(let x=x0+1;x<=x1-1;x++)usP(x,ty-1,A.body,x>fc?-1:1)}
 if(V.mantle){usPart();const r=a==='robe'?(S.accR||usCloth('purple')):USR.fur;for(let x=x0-1;x<=x1+1;x++){usP(x,ty,r,((x*7)%5===0)?1:0);usP(x,ty+1,r,-1);if(x>x0&&x<x1&&((x+ty)&1))usP(x,ty+2,r,-1)}if(a==='robe'&&v===0){usF(fc,ty+1,'c');usF(fc-1,ty+1,'d')}}
 if(V.mailtop&&v===0){for(let x=x0+1;x<=x1-1;x++)usF(x,y1,'4')}
 if(V.sig&&v===0){const g=S.res?USR[S.res].t[1]:'x',G2=S.res?USR[S.res].t[2]||'r':'F';const ys=V.sig===2?[ty+2,ty+4,ty+6]:[ty+3,ty+5];for(const y of ys){usF(x0+1,y,g);usF(x1-1,y,g)}usF(x0+1,ty+1,G2);if(V.sig===2){usF(x1-1,ty+1,G2);usF(fc+1,ty+2,'d')}}
 if(V.odo){const ok=V.odo;for(let y=ty+2;y<y1;y+=3)for(let x=x0;x<=x1;x++)if(((x-x0)%3)!==2)usF(x,y,ok);   // odoshi: bands of coloured lacing across the lames
 if(V.gild){for(let x=x0;x<=x1;x++)usF(x,ty,x<fc?'d':'c');usF(fc,ty+2,'e')}
  if(V.sode&&v===0){usPart();const sw=V.sode>1?3:2;for(let j=0;j<=V.sode+2;j++)for(let i=0;i<sw;i++)usP(x1+1+i-(sw-2),ty+j,(j&1)?USR[ok==='g'?'red':ok==='y'?'gold':'mana']||USR.red:(S.av.A&&USR[S.av.A.paul])||USR.blk,j===V.sode+2?-1:0)}}
 if(V.kesa&&v===0){for(let y=ty;y<=y1;y++){const x=x0+Math.round((y-ty)*(x1-x0)/(y1-ty||1));usF(x,y,'g');if(x+1<=x1)usF(x+1,y,'f')}}
 if(V.tex==='flute'&&v===0){usF(x0+1,ty+1,'r');usF(fc,ty+th-3,'r')}if(V.cr)usArmCraft(S,A,v,x0,x1,ty,th,fc)}
/* ---- humanoid rig ---- */
const US_BUILD={human:{hw:8,hh:8,tw:8,th:8,ll:7,lw:3,aw:2,jaw:1},elf:{hw:8,hh:8,tw:7,th:8,ll:8,lw:3,aw:2,jaw:2},
 dwarf:{hw:8,hh:7,tw:10,th:7,ll:4,lw:4,aw:3,jaw:0,er:3,eh:1},halforc:{hw:9,hh:8,tw:10,th:9,ll:7,lw:4,aw:3,jaw:0},
 gob:{hw:8,hh:6,tw:6,th:5,ll:4,lw:2,aw:2,jaw:2,er:2,eh:2,hunch:1},orc:{hw:9,hh:8,tw:11,th:9,ll:7,lw:4,aw:3,jaw:0},
 brute:{hw:8,hh:8,tw:10,th:8,ll:7,lw:4,aw:3,jaw:0},bloat:{hw:8,hh:7,tw:12,th:9,ll:5,lw:4,aw:3,jaw:0,er:3,eh:1,hunch:1},
 thin:{hw:8,hh:8,tw:6,th:8,ll:8,lw:1,aw:1,jaw:1,bony:1},imp:{hw:7,hh:6,tw:5,th:5,ll:4,lw:2,aw:2,jaw:2,er:2,eh:2,hunch:1},
 knight:{hw:8,hh:8,tw:10,th:9,ll:8,lw:4,aw:3,jaw:1},slim:{hw:8,hh:8,tw:7,th:8,ll:8,lw:3,aw:2,jaw:2},
 lord:{hw:11,hh:10,tw:18,th:13,ll:10,lw:7,aw:5,jaw:0,er:5,eh:2,big:1,taper:1},tyrant:{hw:12,hh:11,tw:22,th:15,ll:11,lw:8,aw:6,jaw:0,er:5,eh:2,big:1,taper:1,hunch:2}};
function usArmor(S){const a=S.armor,sk=S.skin,R=S.MR||USR,C=usCloth,cl=S.clothR,lg=S.legR||C('brown');let A;
 switch(a){
  case'robe':A={body:cl||C(S.robeC||'blue'),up:1,hand:sk,leg:cl||C(S.robeC||'blue'),boot:R.dleather,skirt:-1};break;
  case'padded':A={body:cl||R.white,up:1,hand:sk,leg:lg,boot:R.dleather,skirt:2};break;
  case'leather':A={body:R.leather,up:.5,fore:sk,hand:sk,leg:lg,boot:R.dleather,skirt:1,bracer:1};break;
  case'mail':A={body:R.steel,up:.6,fore:R.leather,hand:R.leather,leg:lg,boot:R.dleather,skirt:3};break;
  case'scale':A={body:R.steel,up:.5,fore:R.leather,hand:R.leather,leg:lg,shin:R.steel,boot:R.steel,skirt:2,paul:S.accR||R.brass};break;
  case'plate':A={body:R.plate,up:1,hand:R.steel,leg:R.plate,boot:R.steel,skirt:2,paul:R.plate,joint:1};break;
  case'brig':A={body:cl||C('red'),up:.6,fore:R.steel,hand:R.leather,leg:lg,boot:R.dleather,skirt:3,skB:R.steel,bracer:1};break;
  case'lamellar':A={body:R.steel,up:.7,fore:R.leather,hand:R.leather,leg:lg,shin:R.iron,boot:R.dleather,skirt:3,paul:R.steel};break;
  case'coat':A={body:R.steel,up:.5,fore:R.steel,hand:R.steel,leg:lg,shin:R.steel,boot:R.dleather,skirt:2,skB:cl||C('night'),paul:R.iron};break;
  case'bare':A={body:sk,up:1,hand:sk,leg:sk,boot:sk,skirt:0};break;
  case'fur':A={body:R.fur,up:.25,fore:sk,hand:sk,leg:lg,boot:R.dleather,skirt:2};break;
  case'void':A={body:R.void,up:1,hand:R.voidl,leg:R.void,boot:R.void,skirt:2,paul:R.voidl,joint:1};break;
  default:A={body:cl||C(S.ragC||'tan'),up:.2,fore:sk,hand:sk,leg:lg,boot:sk,skirt:1}}
 const V=S.av;if(V){if(V.body)A.body=typeof PT_CLOTH!=='undefined'&&PT_CLOTH[V.body]?(cl||C(V.body)):V.body==='fur'?R.fur:R[V.body]||A.body;if(V.mailtop){A.skB=A.body;A.body=R.steel;A.slv=cl||C(S.robeC||'blue')}if(V.tex==='flute'){A.paul=R.steel}}
 A.slv=A.slv||A.body;A.fore=A.fore||A.slv;if(S.b.bony){A.slv=A.fore=A.hand=A.leg=A.boot=R.bone;A.shin=null;A.skirt=Math.min(A.skirt,1)}
 if(V&&V.A)for(const k in V.A)A[k]=R[V.A[k]]||USR[V.A[k]]||A[k];if(S.Aov)Object.assign(A,S.Aov);return A}
function usTex(S){const a=S.armor,t=S.av&&S.av.tex,m3=y=>((y%3)+3)%3;
 if(S.av&&S.av.mailtop)return(x,y)=>((x+y)&1)?0:-1;
 if(t==='scales')return(x,y)=>(y&1)?((x&1)?-1:0):((x&1)?0:1);if(t==='diamond')return(x,y)=>(((x+y)&3)===0||((x-y)&3)===0)?-1:0;if(t==='hide')return(x,y)=>((x*5+y*3)%7<2)?1:((x*3+y)%5===0?-1:0);if(t==='flute')return(x,y)=>(((x%3)+3)%3===0)?1:((((x%3)+3)%3===2)?-1:0);
 if(a==='lamellar')return(x,y)=>m3(y)===2?-1:(x&1)?0:1;if(a==='coat')return(x,y)=>m3(y)===0?-2:0;if(a==='brig')return(x,y)=>(m3(y)===0)?-1:0;
 if(a==='mail')return(x,y)=>((x+y)&1)?0:-1;
 if(a==='scale')return(x,y)=>(y&1)?((x&1)?-1:0):((x&1)?1:-1);
 if(a==='fur')return(x,y)=>((x*7+y*5)%6<2)?1:((x*3+y*7)%5===0?-1:0);
 if(a==='padded')return(x,y)=>((x%3+3)%3===1)?-1:0;
 return 0}
function usPoseOf(S,st,fr,v,wslot){const b=S.b,al=b.th-3,W=S.wd,cls=W.cls,oW=wslot==='L'?-1:1,k=b.big?2:1,D=USD;
 const P={ub:0,ln:0,hx:0,hy:0,lg:[0,0,0,0],kneel:0,lie:0,W:{x:0,y:al-2,o:0,d:D.U},O:{x:0,y:al,o:0,on:null},bow:0,spark:null,drop:0,fr,st};
 const fwdD=v?D.RU2:D.RD2,lowD=v?D.R:D.RD,tilt=oW<0?D.UL2:D.UR2,far=(v===0)===(wslot==='R');
 if(cls==='swing'){P.W.y=al-2;P.W.o=1;P.W.d=oW<0?D.UL2:D.UR2}else if(cls==='fist'){P.W.y=al}else if(cls==='two'){P.W.y=al-1;P.W.d=oW<0?D.UL3:D.UR3}
 else if(cls==='xbow'){P.W.x=v?1:2;P.W.y=al-2;P.W.d=v?D.RU2:D.RD2;P.O.on=W.h2}else if(cls==='gun'){if(W.two){P.W.y=al-2;P.W.d=D.U}else{P.W.y=al-1;P.W.d=D.RD}}
 if(S.shield){P.O.x=1;P.O.y=al-2}
 if(S.zomb){P.W.x=2;P.W.y=1;P.O.x=2;P.O.y=2}
 const both=(x,y)=>{P.W.x=x;P.W.y=y;if(!S.shield){P.O.x=x;P.O.y=y}};
 switch(st){
  case'idle':if(fr===1)P.ub=1;break;
  case'walk':{const a=fr&3;if(a===0){P.lg=[2*k,0,-1*k,1];P.W.x-=cls==='swing'?0:1;P.O.x+=S.shield?0:1}else if(a===2){P.lg=[-1*k,1,2*k,0];P.W.x+=1;P.O.x-=S.shield?0:1}else P.ub=-1;break}
  case'attack':
   if(cls==='swing'||cls==='two'||cls==='staff'){const t=cls!=='swing'&&!(v&&far);
    if(fr===0){P.ln=-1;P.W.x=-1;P.W.o=1;P.W.y=-2*k;P.W.d=far||v?D.U:D.UL;if(t)P.O.on=W.h2;P.lg=[-1,0,0,0]}
    else if(fr===1){P.ln=1;P.W.x=(far?3:5)*k;P.W.y=(v?0:2)*k;P.W.d=fwdD;if(v&&far){P.W.x=1;P.W.y=-1;P.W.d=D.UR2}if(t)P.O.on=W.h2;P.lg=[2*k,0,-1,0];if(S.shield){P.O.x=0}}
    else{P.W.x=(far?2:3)*k;P.W.y=al-2;P.W.d=lowD;if(v&&far){P.W.x=1;P.W.y=al-3;P.W.d=D.UR}if(t)P.O.on=W.h2;P.lg=[1,0,0,0]}}
   else if(cls==='thrust'){P.W.d=v?D.RU3:D.RD3;if(W.two)P.O.on=W.h2;
    if(fr===0){P.ln=-1;P.W.x=-2;P.W.y=1;P.lg=[-1,0,0,0]}else if(fr===1){P.ln=1;P.W.x=far?4:5;P.W.y=2;P.lg=[2,0,-1,0]}else{P.W.x=1;P.W.y=2;P.lg=[1,0,0,0]}}
   else if(cls==='xbow'||cls==='gun'){const two=W.two;P.W.o=0;if(two)P.O.on=W.h2;if(!far&&v===0)P.W.x+=two?5:6;
    const fx=P.W.x;if(fr===0){P.W.x=fx+(two?2:4);P.W.y=1;P.W.d=D.R;P.lg=[1,0,0,0]}else if(fr===1){P.ln=-1;P.W.x=fx+(two?1:3);P.W.y=0;P.W.d=D.RU2;P.lg=[1,0,-1,0];P.recoil=1}else{P.W.x=fx+(two?2:3);P.W.y=1;P.W.d=D.R;P.lg=[1,0,0,0]}}
   else if(cls==='bow'){P.W.abs=1;P.W.y=v?0:1;P.bow=fr===0?1:2;if(fr===2){P.W.y=2;P.bow=3}else if(fr===1)P.ln=-1}
   else{if(fr===0){P.ln=-1;P.W.x=-1;P.W.y=2;P.O.x=1;P.O.y=2}else if(fr===1){P.ln=1;P.W.x=(far?4:5)*k;P.W.y=1+(v?-1:1);P.O.x=0;P.O.y=3;P.lg=[2*k,0,-1,0]}else{P.W.x=2;P.W.y=3;P.O.x=1;P.O.y=3}}
   break;
  case'cast':
   if(fr===0){both(1,2);P.W.d=D.U;P.spark={s:0}}
   else if(fr===1){P.W.x=0;P.W.o=1;P.W.y=-3*k;P.W.d=D.U;if(!S.shield){P.O.x=0;P.O.o=1;P.O.y=-3*k}P.ub=-1;P.spark={s:2}}
   else{both(3*k,0);P.W.d=cls==='staff'?(v?D.UR:D.UR2):D.U;P.ln=1;P.spark={s:1}}
   break;
  case'swap':{const hi=cls==='bow'||!!W.two||cls==='thrust'||cls==='staff';   // 0 the weapon in hand goes to its place, 1 the other comes out of its place, 2 brought to guard
   if(fr<2){if(hi){P.W.x=-2;P.W.y=-3*k;P.W.o=1;P.W.d=D.U;P.ub=-1;P.hx=-1}else{P.W.x=-2;P.W.y=al+1;P.W.o=0;P.W.d=D.D;P.ln=fr?0:-1}P.O.y=al-1;P.lg=[fr?1:0,0,0,0]}
   else{P.W.x=k;P.W.y=-1;P.W.o=1;P.W.d=oW<0?D.UL2:D.UR2;P.ln=1;P.lg=[1,0,0,0]}break}
  case'reload':{P.lg=[1,0,0,0];P.O.on=null;if(cls==='xbow'){P.W.x=2;P.W.y=al;P.W.d=D.D;P.ub=fr===1?1:0;const C=[[1,al-5],[3,al-4],[2,al-3]][fr];P.O.x=C[0];P.O.y=C[1];P.crank=fr+1}
   else if(cls==='gun'){P.W.x=1;P.W.y=al-3;P.W.d=D.U;P.rod=fr;if(W.two)P.W.sh=8}
   else{P.W.x=1;P.W.y=al-2;P.W.d=D.U;P.O.y=al-3+fr}break}
  case'hit':if(fr===0){P.ln=-2;P.hx=-1;P.W.x=-1;P.W.o=1;P.W.y=al-3;P.O.x=-1;P.O.o=1;P.O.y=al-3;P.W.d=tilt;P.lg=[-1,0,-1,0]}else{P.ln=-1;P.ub=1}break;
  case'death':if(fr===0){P.ln=-2;P.ub=1;P.hx=-1;P.W.x=-1;P.W.o=2;P.W.y=0;P.O.x=-1;P.O.o=2;P.O.y=1;P.W.d=v||far?D.U:D.UL;P.lg=[-2,0,-1,0]}
   else if(fr===1){P.kneel=1;P.ub=b.ll-3;P.hx=1;P.hy=1;P.W.y=al;P.O.y=al;P.O.x=0;P.drop=1}else{P.lie=1;P.drop=1;P.W.y=al;P.O.y=al;P.O.x=0}break}
 if(S.zomb&&(st==='attack')){P.O.x=P.W.x;P.O.y=P.W.y+1}
 return P}
function usArm(S,A,x0,y0,x1,y1,far){const aw=S.b.aw,dx=x1-x0,dy=y1-y0,n=Math.max(Math.abs(dx),Math.abs(dy),1),bi=far?-1:0,up=Math.round(n*A.up);usPart();
 for(let i=0;i<=n;i++){const x=x0+Math.round(dx*i/n),y=y0+Math.round(dy*i/n),r=i<up||A.up>=1?A.slv:(A.bracer&&i>=n-1?USR.dleather:A.fore);for(let a=0;a<aw;a++)for(let c=0;c<aw;c++)usP(x+a,y+c,r,bi+(A.joint&&n>=4&&i===(n>>1)&&c===0?-2:0)+(aw>3&&i===up&&up<n?-1:0))}
 usPart();for(let a=0;a<aw;a++)for(let c=0;c<aw;c++)usP(x1+a,y1+c,S.claw&&c===aw-1&&(aw<3||(a&1)===0)?USR.bone:A.hand,bi)}
function usLegs(S,A,v,P,nearL){const b=S.b,ll=b.ll,lw=b.lw,tw=b.tw,xl=-(tw>>1),xr=xl+tw-lw,bh=b.big?4:ll>=6?2:1;
 if(P.kneel){usPart();const y0=-(b.big?5:3);usRect(xl,y0,xl+tw+1,-1,A.leg);usRect(xl-(b.big?4:2),-(b.big?3:2),xl-1,-1,A.boot);usRect(xl+tw,y0,xl+tw+1,-1,A.shin||A.leg,-1);return}
 const leg=(x,dx,lift,far)=>{usPart();const n=ll+1-lift;for(let i=0;i<n;i++){const y=-ll-1+i,sx=x+Math.round(dx*i/ll),bt=i>=n-bh,r=bt?A.boot:(A.shin&&i>=n-bh-(b.big?4:2)?A.shin:A.leg);const kn=A.joint?(i===n-bh-(b.big?5:3)?-2:b.big&&(i===n-bh-6||i===n-bh-7)?1:0):0;for(let c=0;c<lw;c++)usP(sx+c,y,r,(far?-1:0)+kn)}
  if(v===0&&!b.bony&&lw>1)usP(x+dx+lw,-1-lift,A.boot,far?-1:0);if(b.bony){usP(x+dx+1,-1-lift,A.boot);usP(x+dx-(v?1:0),-1-lift,A.boot)}};
 if(nearL){leg(xr,P.lg[2],P.lg[3],1);leg(xl,P.lg[0],P.lg[1],0)}else{leg(xl,P.lg[2],P.lg[3],1);leg(xr,P.lg[0],P.lg[1],0)}}
function usSkirt(S,A,v,P,x0,ty){const b=S.b,tw=b.tw,ll=b.ll,y0=ty+b.th,tex=usTex(S),x1_=x0+tw-1;if(!A.skirt)return;usPart();
 if(A.skirt<0){const flo=S.float,y1=flo?y0+ll-1:-2,sw=P.st==='walk'?(P.fr&1?0:(P.fr&2?1:-1)):0;
  for(let y=y0;y<=y1;y++){const t=(y-y0)/Math.max(1,y1-y0),ex=flo?(t>.75?-2:t>.4?-1:0):(t>.45?1:0),sh=t>.6?sw:0;
   for(let x=x0-ex+sh;x<=x0+tw-1+ex+sh;x++){if(flo&&y>=y1-1&&((x*3+y)%3===0||(y===y1&&(x&1))))continue;usP(x,y,A.skB||A.body,y===y1&&!flo?-1:0)}}
  if(!flo){const fc=v?x0+Math.round(tw*.4)-1:x0+Math.round(tw*.6),V=S.av||{};for(let y=y0;y<=y1;y++){const xx=fc+(y-y0>(y1-y0)*.6?sw:0);usP(xx,y,S.trim||USR.brass);if(V.trim==='gold'&&v===0)usP(xx-1,y,USR.gold,1)}
   if(V.sig&&v===0){const g=S.res?USR[S.res].t[1]:'x';for(let x=x0;x<=x0+tw-1;x+=2)usF(x+sw,y1,g)}if(V.trim==='gold')for(let x=x0-1;x<=x0+tw;x++)usP(x+sw,y1,USR.gold,-1)}
  return}
 const n=Math.min(A.skirt*(b.big?2:1),ll-2);
 for(let j=0;j<n;j++){const y=y0+j;for(let x=x0;x<=x0+tw-1;x++){if(S.armor==='rags'&&j===n-1&&((x+S.seed)%3===0))continue;usP(x,y,A.skB||A.body,(tex?tex(x,y):0)+(j===n-1&&S.armor!=='plate'?-1:0))}}
 if(S.armor==='scale')for(let x=x0;x<=x0+tw-1;x++)usP(x,y0+n-1,S.accR||USR.brass,(x&1)?-1:0);
 if(S.tabR&&(S.armor==='mail'||S.armor==='scale'||S.armor==='plate')&&!b.big){const fc=v?x0+Math.round(tw*.4)-1:x0+Math.round(tw*.6),t0=v?fc:fc-1;for(let j=0;j<n;j++)for(let x=t0;x<=t0+1;x++)if(!(j===n-1&&((x+j)&1)))usP(x,y0+j,S.tabR,(x===t0+1?-1:0)+(j===n-1?-1:0))}
 if(S.armor==='plate'||S.armor==='void'){const c=x0+(tw>>1);for(let j=0;j<n;j++){usB(c,y0+j,-2);usB(c-1,y0+j,v?0:1)}if(b.big&&S.trimR)for(let x=x0;x<=x1_;x++)if(x!==c)usP(x,y0+n-1,S.trimR,x>c?-1:0)}}
function usTorso(S,A,v,P,x0,ty){const b=S.b,tw=b.tw,th=b.th,a=S.armor,x1=x0+tw-1,tex=usTex(S),k=b.big?2:1,fc=v?x0+Math.round(tw*.4)-1:x0+Math.round(tw*.6),by=ty+th-(th>=8?2:1);
 const tap=j=>b.taper?(j>th*.8?2:j>th*.5?1:0):0;
 usPart();
 for(let j=0;j<th;j++){const y=ty+j,ins=(j===0?1:0)+tap(j),w=(S.fem&&th>=8&&j>=th-4&&j<=th-3)?1:0;for(let x=x0+ins+(v?0:w);x<=x1-ins-(v?w:0);x++)usP(x,y,A.body,tex?tex(x,y):0)}
 if(S.belly){for(let j=3;j<th;j++){usP(x1+1,ty+j,A.body);usP(x0-1,ty+j,A.body)}usF(fc,ty+th-3,S.skin.t[0])}
 const sk=S.skin,res=S.res?USR[S.res]:null;
 if(k>1&&(a==='plate'||a==='void')){const r1=Math.round(th*.42),tr=S.trimR,dl=a==='void'?1:-1;
  for(let x=x0+1;x<=x1-1;x++)if(x!==fc&&x!==fc-1)usB(x,ty+r1,dl*2);for(let j=1;j<r1;j++){usB(fc,ty+j,-1);usB(fc-1,ty+j,1)}
  if(dl>0)for(let j=2;j<r1-1;j++)for(let x=x0+3;x<fc-2;x++)if(j===2||x===x0+3)usB(x,ty+j,1);
  for(let j=r1+2;j<th-3;j+=2)for(let x=x0+1+tap(j);x<=x1-1-tap(j);x++)usB(x,ty+j,dl);
  for(let x=fc-3;x<=fc+2;x++){usB(x,ty,-1);if(tr)usP(x,ty+1,tr,x>fc?-1:0)}
  if(tr){for(let j=2;j<r1;j++){usP(x0+(v?1:2),ty+j,tr,0);usP(x1-(v?2:1),ty+j,tr,-1)}}
  usF(x0+3,ty+r1-1,tr?'e':'r');usF(x1-3,ty+r1-1,tr?'c':'q')}
 else if(v===0){
  if(a==='rags'||a==='fur'){usP(fc,ty,sk,-1);usP(fc-1,ty,sk);usP(fc,ty+1,sk,-1);if(k>1){usP(fc+1,ty,sk,-1);usP(fc-2,ty,sk);usP(fc-1,ty+1,sk);usP(fc,ty+2,sk,-1)}
   if(a==='rags'){usP(x0+1,ty+th-3,USR.white,-1);usP(x0+2,ty+th-3,USR.white,-2);usB(x1-1,ty+3,-1);usB(x1-2,ty+4,-1)}else usF(fc,ty+2*k,'l')}
  else if(a==='robe'){for(let j=0;j<th;j++)usP(fc,ty+j,S.trim||USR.brass);usP(fc-1,ty,S.trim||USR.brass,1);usP(fc+1,ty,S.trim||USR.brass,-1);
   const g=res?res.t[1]:'F';usF(x0+2,ty+2,g);usF(x0+1,ty+3,g);usF(x0+3,ty+3,g);usF(x0+2,ty+4,g);usF(x0+2,ty+3,'r')}
  else if(a==='padded'){for(let x=x0+2;x<=x1-1;x++)usB(x,ty,1);usF(fc,ty+2,'j');usF(fc,ty+4,'j')}
  else if(a==='leather'){usP(fc-1,ty,USR.white,-1);usP(fc,ty,USR.white,-2);for(let i=0;i<th-2;i++)usB(x0+1+Math.round(i*(tw-3)/(th-3)),ty+1+i,-1);usF(x0+1,ty+1,'c')}
  else if(a==='mail'){for(let i=0;i<th-2;i++){const x=x1-1-Math.round(i*(tw-3)/(th-3));usP(x,ty+1+i,USR.dleather,0)}}
  else if(a==='scale'){for(let x=x0+1;x<=x1-1;x++)usP(x,ty,USR.brass,x<fc?0:-1);usF(fc,ty,'g')}
  else if(a==='plate'){for(let j=1;j<th-2;j++){usB(fc,ty+j,-1);usB(fc-1,ty+j,1)}for(let x=x0+2;x<=x1-2;x++)usB(x,ty,-1);for(let x=x0;x<=x1;x++)usB(x,ty+th-3,-2);usF(x0+1,ty+th-4,'c');usF(x1-1,ty+th-4,'b')}
  else if(a==='void'){for(let j=1;j<th-2;j++)usB(fc,ty+j,-1);usF(fc-1,ty+2*k,'C');usF(fc-1,ty+2*k+1,'D');usF(fc-2*k,ty+3*k,'D');usF(fc+k,ty+3*k,'D');if(k>1){usF(fc-1,ty+6,'C');usF(fc-2,ty+7,'C');usF(fc,ty+7,'E');usF(fc-1,ty+7,'y');usF(fc-1,ty+8,'E');usF(fc+1,ty+8,'D');usF(fc-3,ty+8,'D')}}
  else if(a==='bare'){usB(fc-1,ty+2,-1);usB(fc+1,ty+2,-1)}
 }else{
  if(a==='leather'||a==='mail'){for(let i=0;i<th-2;i++){const x=x0+1+Math.round(i*(tw-3)/(th-3));if(a==='mail')usP(x,ty+1+i,USR.dleather,0);else usB(x,ty+1+i,-1)}}
  else if(a==='plate'){for(let j=1;j<th-2;j++)usB(fc,ty+j,-1);for(let x=x0;x<=x1;x++)usB(x,ty+th-3,-2)}
  else if(a==='scale'){for(let x=x0+1;x<=x1-1;x++)usP(x,ty,USR.brass,-1)}
  else if(a==='void'){for(let j=1;j<th-2;j++)usB(fc,ty+j,-1);usF(fc,ty+2*k,'D')}
  else if(a==='robe'){usP(fc,ty+1,A.body,-1);usP(fc+1,ty+1,A.body,-1);usP(fc,ty+2,A.body,-1)}
 }
 usArmDet(S,A,v,x0,x1,ty,th,fc);
 // livery: a tabard in the accent colour over mail, scale and plate
 if(S.tabR&&(a==='mail'||a==='scale'||a==='plate')&&!b.big){const t0=v?fc:fc-1,tr=S.tabR,y0=ty+(a==='plate'?1:2);for(let j=y0;j<th+ty;j++)for(let x=t0;x<=t0+1;x++)usP(x,j,tr,(x===t0+1)?-1:0);
  if(v===0&&tw>=8){usP(t0-1,y0,tr,0);usP(t0+2,y0,tr,-1)}}
 // belt or resource sash
 if(a!=='bare'&&!S.nobelt){const br=S.av&&S.av.gold?USR.gold:res||S.sashR||(a==='robe'?(S.trim||USR.brass):a==='rags'?USR.dwood:USR.dleather);for(let x=x0+tap(th-2);x<=x1-tap(th-2);x++){usP(x,by,br,0);if(k>1)usP(x,by+1,br,-1)}
  if(res){const sx=v?x1-1:x0+1;usP(sx,by+1,res,0);usP(sx,by+2,res,-1);if(k>1)usP(sx,by+3,res,-1);usF(fc,by,'r')}else if(a!=='rags')usF(fc,by,a==='robe'?'e':'c')}
 if(res&&v===0&&a!=='robe'){usF(fc-1,ty+1,res.t[1]);usF(fc-1,ty+2,res.t[0])}
 if(S.beads&&v===0){usF(fc-2,ty+1,S.beads);usF(fc-1,ty+2,S.beads);usF(fc+1,ty+1,S.beads)}}
function usHeadShape(b,v,r){const hw=b.hw,hh=b.hh,j=b.jaw==null?1:b.jaw,bg=hw>=11;
 if(r===0)return bg?[2,2]:[1,1];if(bg&&r===1)return[1,1];
 if(v){if(r===hh-1)return j===2?[2,2]:[1,1];return[0,0]}
 if(r===hh-1)return j===2?[3,2]:j===1?[2,1]:[1,1];if(r===hh-2)return j===2?[2,1]:j===1?[1,0]:[0,0];return[0,0]}
function usHair(S,v,x0,y0){const st=S.hair,hc=S.hairR;if(!st||st==='bald'||!hc)return;const b=S.b,hw=b.hw,hh=b.hh,H=(c,r,bi)=>usP(x0+c,y0+r,hc,bi),mid=(hw>>1)-1;usPart(1);
 const lng=st==='long'||st==='mane'||st==='braids',vol=st==='curly'||st==='mane'||st==='shaggy';
 if(st==='mohawk'){if(v===0){for(let r=-2;r<=1;r++)for(let c=2;c<=hw-2;c++)if(r>-2||(c>2&&c<hw-2))H(c,r,r===1?-1:0)}else for(let r=-2;r<=hh-3;r++)for(let c=mid;c<=mid+1;c++)H(c,r);return}
 if(st==='topknot'){if(v===0){H(0,0);H(0,1);H(0,2);H(1,0);H(0,3);H(-1,3);H(1,1)}else{H(0,0);H(hw-1,0);for(let c=0;c<hw;c++)H(c,1);H(0,2);H(hw-1,2)}H(mid,-1);H(mid+1,-1);H(mid,-2,1);H(mid+(v?0:-1),-2,-1);return}   // the chonmage: a shaven crown, a tied knot
 if(st==='tonsure'){if(v===0){H(0,1);H(1,1);H(2,1);H(hw-1,1);H(0,2);H(1,2);H(0,3);H(0,4)}else{for(let r=2;r<=4;r++)for(let c=0;c<hw;c++)H(c,r);H(0,1);H(hw-1,1)}return}
 if(st==='wisps'){if(v===0){H(1,0);H(3,0);H(0,1);H(5,0);H(0,3);H(-1,2)}else{H(1,0);H(4,0);H(2,1);H(6,1);H(0,2);H(5,3);H(3,3)}return}
 if(v===0){
  for(let c=1;c<hw-1;c++)H(c,0);for(let c=0;c<hw;c++)H(c,1);
  if(vol)for(let c=1;c<hw-1;c++)H(c,-1);if(st==='swept'){for(let c=3;c<hw;c++)H(c,-1);H(hw,0)}
  const fr=st==='crop'?[0,1]:st==='short'?[0,1,2,4]:st==='shaggy'?[0,1,2,4,hw-1]:st==='bowl'?[0,1,2,3,4,5,6,7,8]:st==='swept'?[0,1,hw-1]:st==='curly'?[0,1,2,5,hw-1]:st==='mane'?[0,1,2,3,hw-1]:[0,1,2,hw-1];
  fr.forEach(c=>{if(c<hw)H(c,2)});
  const s0=lng?hh-1:st==='crop'?3:st==='bowl'?3:5,s1=lng?hh-2:3;for(let r=3;r<=s0;r++)H(0,r);for(let r=3;r<=s1;r++)H(1,r);
  if(lng){for(let r=hh;r<=hh+(st==='braids'?3:2);r++){H(0,r);if(st!=='braids')H(1,r)}if(st!=='braids')for(let r=1;r<=hh;r++)H(-1,r);if(st==='braids')usF(x0,y0+hh+3,'c')}
  if(st==='tail'){H(-1,1);H(-1,2);H(-2,2);H(-2,3);H(-2,4);H(-3,5);H(-2,5)}
  if(st==='bun'){H(0,-1);H(1,-1);H(0,-2);H(1,-2);H(-1,-1);H(-1,0)}
  if(st==='curly'){H(-1,1);H(-1,2);H(hw,1);H(-1,3)}
  if(st==='shaggy'){H(-1,2);H(-1,3);H(0,6)}
 }else{
  const end=st==='crop'?hh-4:hh-3;for(let r=0;r<=end;r++)for(let c=(r===0?1:0);c<hw-(r===0?1:0);c++)H(c,r);
  if(st!=='crop')for(let c=1;c<hw-1;c++)H(c,end+1);
  if(vol)for(let c=1;c<hw-1;c++)H(c,-1);if(st==='swept')for(let c=2;c<hw-1;c++)H(c,-1);
  if(st==='long'||st==='mane'){for(let r=end+1;r<=hh+2;r++)for(let c=(st==='mane'?0:1);c<hw-(st==='mane'?0:1);c++)if(r<hh+2||(c&1))H(c,r,r>=hh?-1:0)}
  if(st==='braids'){for(let r=end+1;r<=hh+3;r++){H(1,r,r&1?0:-1);H(hw-2,r,r&1?0:-1)}}
  if(st==='tail'){for(let r=end;r<=hh+2;r++){H(mid,r);H(mid+1,r,-1)}usF(x0+mid,y0+end+1,'g');usF(x0+mid+1,y0+end+1,'f')}
  if(st==='bun'){H(mid,-1);H(mid+1,-1);H(mid,-2);H(mid+1,-2);H(mid-1,-1);H(mid+2,-1)}
  if(st==='curly'||st==='shaggy'){H(-1,1);H(-1,2);H(hw,1);H(hw,2)}
 }}
function usBeard(S,v,x0,y0){const bd=S.beard,hc=S.beardR||S.hairR;if(!bd||!hc||v)return;const b=S.b,hw=b.hw,hh=b.hh,er=b.er==null?hh>>1:b.er,eh=b.eh||(hh>=8?2:1),my=er+eh,H=(c,r,bi)=>usP(x0+c,y0+r,hc,bi);usPart(1);
 if(bd==='stache'){H(hw-4,my);H(hw-3,my);H(hw-2,my);return}
 if(bd==='goatee'){H(hw-4,hh-1);H(hw-3,hh-1);H(hw-3,hh);return}
 if(bd==='chops'){H(1,my-1);H(1,my);H(2,my);return}
 const sh=usHeadShape;for(let r=my;r<hh;r++){const s=sh(b,0,r);for(let c=s[0];c<hw-s[1];c++)if(!(r===my&&c>=hw-4&&c<=hw-2&&bd==='short'))H(c,r,r===hh-1?-1:0)}
 if(bd==='short')return;
 if(bd==='full'){for(let c=2;c<hw-1;c++)H(c,hh,-1);return}
 if(bd==='long'){for(let r=hh;r<=hh+2;r++)for(let c=3+(r-hh>1?1:0);c<hw-1-(r-hh>1?1:0);c++)H(c,r,r>hh?-1:0);return}
 const n=bd==='fork'?4:4;for(let j=0;j<n;j++){const r=hh+j,i0=j<2?1:j,i1=j<2?hw-1:hw-j;for(let c=i0;c<=i1;c++){if(bd==='fork'&&j>=2&&c===(hw>>1))continue;H(c,r,(c===(hw>>1)||j===n-1)?-1:0)}}
 if(S.ring)usF(x0+(hw>>1)+1,y0+hh+2,'c')}
function usHat(S,v,x0,y0,er){const t=S.hat;if(!t)return;if(US_EHAT[t]){usHatEast(S,v,x0,y0,er);return}if(usHatBg(S,v,x0,y0,er))return;const b=S.b,hw=b.hw,hh=b.hh,c=S.hatR||USR.leather,R=S.MR||USR,k=hw>=11?2:1;
 const dome=(r,rim)=>{for(let x=1;x<hw-1;x++)usP(x0+x,y0-1,r);for(let y=0;y<=rim;y++)for(let x=0;x<hw;x++)usP(x0+x,y0+y,r)};
 if(t==='hood'||t==='coif'){const r=t==='coif'?R.steel:c,tex=t==='coif'?((x,y)=>((x+y)&1)?0:-1):null,put=(x,y,bi)=>usP(x0+x,y0+y,r,(tex?tex(x,y):0)+(bi|0));usPart();
  for(let x=1;x<hw-1;x++)put(x,-1);
  for(let y=0;y<hh;y++){const s=usHeadShape(b,v,y);for(let x=s[0];x<hw-s[1];x++)if(v||y<3||x<2||(y<=3&&x===hw-1))put(x,y)}
  if(t==='hood'){for(let y=0;y<hh;y++)put(-1,y,-1);put(-2,1,-1);put(-2,2,-1);if(v){for(let y=0;y<hh;y++)put(hw,y)}}
  for(let x=v?0:-1;x<hw-(v?0:2);x++)put(x,hh,-1);if(v===0){put(hw-2,hh);put(hw-1,hh,-1)}
  if(S.mask&&v===0){usPart(1);for(let y=er+(b.eh||2);y<hh;y++){const s=usHeadShape(b,0,y);for(let x=2;x<hw-s[1];x++)usP(x0+x,y0+y,R.red)}}
  return}
 const mailS=(y0r,y1r,r)=>{for(let y=y0r;y<=y1r;y++){usP(x0-1,y0+y,r,((y)&1)?-1:0);if(v){for(let x=0;x<hw;x++)usP(x0+x,y0+y,r,((x+y)&1)?0:-1)}else{usP(x0,y0+y,r,((y+1)&1)?0:-1)}}};
 if(t==='armcap'){const r=S.hatR&&S.hatR.dye?S.hatR:R.white;usPart();dome(r,1);for(let x=0;x<hw;x+=2)usB(x0+x,y0,-1);for(let y=2;y<=er+1;y++){usP(x0-1,y0+y,r,-1);if(v)usP(x0+hw,y0+y,r,-1)}if(v===0){usP(x0,y0+er+1,r,-1);usP(x0+1,y0+hh-1,R.dleather,-1);usP(x0+2,y0+hh,R.dleather,-1)}return}
 if(t==='spangen'){usPart();const a=hw>>1;usP(x0+a-1,y0-3,R.steel,1);usP(x0+a,y0-3,R.steel);for(let x=2;x<hw-2;x++)usP(x0+x,y0-2,R.steel,x<a?1:0);for(let x=1;x<hw-1;x++)usP(x0+x,y0-1,R.steel);for(let x=0;x<hw;x++){usP(x0+x,y0,R.steel);usP(x0+x,y0+1,R.brass,x>hw-3?-1:0)}
  for(const bx of[1,a,hw-2])for(let y=-2;y<=0;y++)if(usHas(x0+bx,y0+y))usP(x0+bx,y0+y,R.brass,y===-2?1:0);usPart();mailS(2,hh,R.steel);if(v===0){usP(x0+hw-2,y0+er-1,R.steel);usP(x0+hw-4,y0+er-1,R.steel);usP(x0+hw-3,y0+er-1,R.steel,1)}return}
 if(t==='sallet'){usPart();dome(R.steel,er-1);for(let x=0;x<hw;x++)usB(x0+x,y0+er-2,-1);if(v===0){for(let x=2;x<hw;x++)usF(x0+x,y0+er-1,'0');usF(x0+hw-3,y0+er-1,'o')}else for(let x=0;x<hw;x++)usP(x0+x,y0+er,R.steel,-1);
  usPart();for(let i=0;i<3;i++){usP(x0-1-i,y0+er-2+i,R.steel,-1);usP(x0-1-i,y0+er-1+i,R.steel,-1);if(v)usP(x0+hw+i,y0+er-1+i,R.steel,-1)}usP(x0+(hw>>1),y0-2,R.steel,1);return}
 if(t==='bascinet'){usPart();for(let x=1;x<hw-2;x++)usP(x0+x,y0-1,R.steel,1);usP(x0+(v?hw-4:2),y0-2,R.steel,1);usP(x0+(v?hw-3:3),y0-2,R.steel,1);for(let y=0;y<hh-1;y++)for(let x=0;x<hw;x++)usP(x0+x,y0+y,R.steel,y>=er+2?-1:0);
  if(v===0){usPart();for(let y=er-1;y<=er+2;y++)for(let x=hw-3;x<=hw+(y===er||y===er+1?1:0);x++)usP(x0+x,y0+y,R.plate,y>er?-1:1);usF(x0+hw-2,y0+er,'0');usF(x0+hw-1,y0+er,'0');usF(x0+hw,y0+er+1,'0');usF(x0+hw-1,y0+er+2,'o');usF(x0+hw-3,y0+er+1,'0')}
  usPart();for(let x=-1;x<=hw;x++)usP(x0+x,y0+hh-1,R.steel,((x)&1)?-1:0);if(v===0)usF(x0+1,y0+er,'c');return}
 if(t==='armet'){usPart();for(let x=1;x<hw-1;x++)usP(x0+x,y0-1,R.plate,1);for(let y=0;y<hh;y++){const s=y===hh-1?[1,1]:[0,0];for(let x=s[0];x<hw-s[1];x++)usP(x0+x,y0+y,R.plate,y>er+1?-1:0)}
  if(v===0){for(let x=3;x<hw;x++)usF(x0+x,y0+er,'0');for(let x=2;x<hw;x++)usB(x0+x,y0+er+2,-2);usF(x0+hw-2,y0+er+3,'0');usF(x0+hw-3,y0+er+4<y0+hh-1?y0+er+4:y0+hh-1,'0');usPart();usP(x0-1,y0+er+1,R.brass,1);usP(x0-1,y0+er+2,R.brass,-1);usP(x0-2,y0+er+1,R.brass,-1)}
  else{for(let x=1;x<hw-1;x++)usB(x0+x,y0+er+1,-1);usPart();usP(x0+hw,y0+er+1,R.brass)}usPart();usP(x0+(hw>>1),y0-2,R.plate,1);usP(x0+(hw>>1)-1,y0-2,R.plate,1);return}
 if(t==='kettle'){usPart();dome(R.steel,0);usPart();for(let x=-1;x<=hw;x++)usP(x0+x,y0+1,R.steel);return}
 if(t==='cap'){usPart();dome(c,1);return}
 if(t==='straw'){usPart();for(let x=2;x<hw-2;x++)usP(x0+x,y0-2,R.brass);for(let x=1;x<hw-1;x++)usP(x0+x,y0-1,R.brass);for(let x=1;x<hw-1;x++)usP(x0+x,y0,R.brass,-1);usPart();for(let x=-2;x<=hw+1;x++)usP(x0+x,y0+1,R.brass);return}
 if(t==='band'||t==='feather'){usPart(1);for(let x=0;x<hw;x++)usP(x0+x,y0+2,c);if(t==='band'){if(v===0)usP(x0-1,y0+3,c,-1);else{usP(x0+3,y0+3,c,-1);usP(x0+3,y0+4,c,-1)}}
  else{usPart();const fx=v?hw-2:1,d=v?1:-1;[[0,-1],[0,-2],[d,-2],[d,-3],[2*d,-3],[d,-4],[2*d,-4],[2*d,-5]].forEach(([a,c2],i)=>usP(x0+fx+a,y0+c2,i<2?S.accR||R.red:R.white,i>5?0:-1))}return}
 if(t==='circlet'){usPart(1);for(let x=v?0:1;x<hw;x++)usP(x0+x,y0+2,R.brass);if(v===0){usF(x0+hw-3,y0+2,S.gemC||'x');}return}
 if(t==='nasal'){usPart();dome(R.steel,1);for(let x=0;x<hw;x++)usP(x0+x,y0+2,R.brass,x>hw-3?-1:0);usP(x0+(hw>>1),y0-2,R.steel);
  if(v===0){usP(x0+hw-3,y0+3,R.steel);usP(x0+hw-3,y0+4,R.steel);for(let y=3;y<hh-2;y++){usP(x0,y0+y,R.steel);usP(x0+1,y0+y,R.steel,-1)}}else for(let y=3;y<hh-1;y++)for(let x=0;x<hw;x++)usP(x0+x,y0+y,R.steel,y===hh-2?-1:0);return}
 if(t==='great'||t==='voidhelm'||t==='barbute'){const r=t==='great'?R.plate:t==='barbute'?R.steel:R.void;usPart();for(let x=1;x<hw-1;x++)usP(x0+x,y0-1,r);
  for(let y=0;y<hh;y++){const s=y===0?[1,1]:y===hh-1?[1,1]:[0,0];for(let x=s[0];x<hw-s[1];x++)usP(x0+x,y0+y,r)}
  if(v===0&&t==='barbute'){for(let x=3;x<hw;x++)usF(x0+x,y0+er,x===hw-4?'o':S.skin&&S.skin.t?S.skin.t[S.skin.b]:'t');for(let y=er+1;y<hh;y++)usF(x0+hw-3,y0+y,'0');for(let x=2;x<hw;x++)usB(x0+x,y0+er-1,-1);usF(x0+hw-2,y0+er,'0');usF(x0+hw-5<x0+3?x0+3:x0+hw-5,y0+er,'0')}
  else if(v===0){if(t==='great'){for(let x=2;x<hw;x++)usF(x0+x,y0+er,'0');usF(x0+hw-4,y0+er,'o');for(let y=er+1;y<hh-1;y++)usB(x0+hw-4,y0+y,1);usF(x0+hw-2,y0+er+2,'o');usF(x0+hw-2,y0+er+3>y0+hh-1?y0+hh-1:y0+er+3,'o');for(let x=0;x<hw;x++)usB(x0+x,y0+er-1,-1)}
   else{for(let x=2;x<hw;x++)usF(x0+x,y0+er,x===hw-4?'G':'C');usF(x0+hw-2,y0+er,'r');usF(x0+3,y0+er,'r');for(let y=er+1;y<hh;y++)usB(x0+hw-4,y0+y,1)}}
  else for(let x=1;x<hw-1;x++)usB(x0+x,y0+hh-3,-1);
  usPart();
  if(t==='barbute'){usP(x0+(hw>>1),y0-2,r,1);return}
  if(t==='great'){const pr=S.res?USR[S.res]:S.accR||R.red,bx=v?hw-3:2,d=v?1:-1;usP(x0+bx,y0-2,pr);usP(x0+bx+d,y0-2,pr);usP(x0+bx-d,y0-2,pr,1);usP(x0+bx+d,y0-3,pr,1);usP(x0+bx+2*d,y0-3,pr);usP(x0+bx+2*d,y0-2,pr);usP(x0+bx+3*d,y0-2,pr,-1);usP(x0+bx+3*d,y0-1,pr,-1);usP(x0+bx+4*d,y0-1,pr,-1);usP(x0+bx+4*d,y0,pr,-1)}
  else{for(const s of[0,1]){const hx=s?hw-1:0,d=s?1:-1;usP(x0+hx,y0-2,R.voidl);usP(x0+hx+d,y0-3,R.voidl);usP(x0+hx+d,y0-4,R.voidl,1);usP(x0+hx,y0-1,R.voidl)}}
  return}
 if(t==='skullcap'){usPart();for(let x=1;x<hw-1;x++)usP(x0+x,y0-2,R.bone);for(let y=-1;y<=1;y++)for(let x=0;x<hw;x++)usP(x0+x,y0+y,R.bone);
  if(v===0){usF(x0+hw-2,y0,'0');usF(x0+hw-5,y0,'0');usF(x0+hw-3,y0+1,'n');usF(x0+hw-4,y0+1,'n')}usPart();usP(x0-1,y0-2,R.red);usP(x0-1,y0-3,R.red);usP(x0-2,y0-4,R.red,1);return}
 if(t==='horns'||t==='hornhelm'||t==='crown'){const hr=t==='horns'?(S.hornR||R.dhorn):R.horn;
  if(t!=='horns'){const r=t==='crown'?R.brass:R.iron;usPart();if(t==='hornhelm'){for(let x=2;x<hw-2;x++)usP(x0+x,y0-1,r);for(let y=0;y<=2;y++)for(let x=(y===0?1:0);x<hw-(y===0?1:0);x++)usP(x0+x,y0+y,r);for(let x=0;x<hw;x++)usP(x0+x,y0+3,R.brass,x>hw-4?-1:0);if(v===0){usP(x0+hw-4,y0+4,r);usP(x0+hw-4,y0+5,r)}}
   else{for(let x=1;x<hw-1;x++){usP(x0+x,y0,r);usP(x0+x,y0-1,r,x&1?0:-1);if(x%3===1)usP(x0+x,y0-2,r,1)}usF(x0+(v?4:hw-5),y0,'E');usF(x0+(v?7:hw-8),y0,'C')}}
  usPart();for(const s of[0,1]){const hx=s?hw-1:0,d=s?1:-1,ys=t==='horns'?-1:1;
   if(k===1){usP(x0+hx,y0+ys,hr);usP(x0+hx+d,y0+ys-1,hr);usP(x0+hx+d,y0+ys-2,hr,1);if(t!=='horns'){usP(x0+hx+d,y0+ys,hr);usP(x0+hx+2*d,y0+ys-1,hr);usP(x0+hx+2*d,y0+ys-2,hr);usP(x0+hx+2*d,y0+ys-3,hr,1)}}
   else{const L=t==='crown'?[[0,2],[1,2],[1,1],[2,1],[2,0],[3,0],[3,-1],[4,-1],[4,-2],[4,-3],[5,-2],[5,-3],[5,-4],[4,-4],[4,-5],[5,-5],[4,-6],[3,-7],[3,-6],[0,1],[1,0],[2,2],[3,1],[5,-1]]:[[0,2],[1,2],[1,1],[2,1],[2,0],[3,0],[3,-1],[3,-2],[4,-1],[4,-2],[4,-3],[3,-3],[3,-4],[0,1],[2,2]];
    L.forEach(([a,c2])=>usP(x0+hx+d*a,y0+c2,hr,c2<-3?1:0))}}
  return}}
/* ---- eastern headgear (19-east.js): jingasa, hachigane, kabuto (lacquered bowl, flared shikoro, turned-back fukigaeshi), menpo, kawari kabuto.
   S.odoR: the lacing colour of the lames (default red); S.lacqR the lacquer (default black) */
const US_EHAT={jingasa:1,hachigane:1,kabuto:1,menpo:1,kawari:1};
function usHatEast(S,v,x0,y0,er){const t=S.hat,b=S.b,hw=b.hw,hh=b.hh,R=USR,L=S.lacqR||R.blk,O=S.odoR||R.red,G=R.gold,front=v?-99:hw-1,a=hw>>1;
 if(t==='jingasa'){usPart();for(let x=a-2;x<=a+1;x++)usP(x0+x,y0-2,L,x<a?1:0);for(let x=0;x<hw;x++)usP(x0+x,y0-1,L,x<a-1?1:x>a?-1:0);   // a wide, low cone of lacquered card
  usPart();for(let x=-3;x<=hw+2;x++)usP(x0+x,y0,L,x<0||x>=hw?-1:0);usF(x0-3,y0,'0');usF(x0+hw+2,y0,'0');usF(x0+a-1+(v?0:1),y0-1,S.monK||'c');
  usPart(1);if(v===0){usP(x0+hw-2,y0+er+2,R.white,-1)}return}
 if(t==='hachigane'){const c=S.hatR||R.white;usPart(1);for(let x=0;x<hw;x++)usP(x0+x,y0+1,c,x===front?-1:0);
  if(v===0){usPart();usP(x0+hw-4,y0+1,R.steel,1);usP(x0+hw-3,y0+1,R.steel);usP(x0+hw-2,y0+1,R.steel,-1);usPart(1);usP(x0-1,y0+2,c,-1);usP(x0-2,y0+3,c,-1);usP(x0-1,y0+3,c,-1)}
  else{usPart(1);usP(x0+a,y0+2,c,-1);usP(x0+a-1,y0+3,c,-1);usP(x0+a+1,y0+3,c,-1)}return}
 // the kabuto: a bowl of riveted plates
 usPart();for(let x=2;x<hw-2;x++)usP(x0+x,y0-2,L,1);for(let x=1;x<hw-1;x++)usP(x0+x,y0-1,L,(x&1)?1:0);for(let x=0;x<hw;x++)usP(x0+x,y0,L,(x&1)?0:-1);
 usF(x0+a,y0-3,G===R.gold?'c':'c');usF(x0+a-1,y0-3,'b');
 // the shikoro: three flared lames laced in O over the neck (and both sides seen from the back)
 usPart();for(let j=1;j<=3;j++){const y=y0+j;if(v===0){for(let x=-j+1;x<=2-((j>2)?1:0);x++)usP(x0+x-1,y,j&1?L:O,j===3?-1:0)}else for(let x=-j;x<hw+j;x++)usP(x0+x,y,j&1?L:O,j===3?-1:0)}
 if(v===0){usPart();usP(x0+hw-1,y0+1,L,1);usP(x0+hw,y0,L,1);usP(x0+hw,y0+1,O);usF(x0+hw,y0,'c')}   // fukigaeshi
 usPart(1);for(let x=0;x<hw;x++)usP(x0+x,y0+1,O,x===front?-1:0);
 if(t==='menpo'||t==='kawari'){if(v===0){const m=S.menR||R.red;usPart(1);for(let y=er+1;y<hh;y++){const sp=usHeadShape(b,0,y);for(let x=hw-4;x<hw-sp[1];x++)usP(x0+x,y0+y,m,y===hh-1?-1:0)}
   usF(x0+hw-3,y0+er+2,'l');usF(x0+hw-2,y0+er+2,'l');usF(x0+hw-2,y0+er+3,'0');usP(x0+hw,y0+er+1,m,1);for(let x=-1;x<=1;x++)usP(x0+hw-3+x,y0+hh,O,-1)}}   // the menpo: a red mask with a white moustache and a throat guard
 if(t==='kawari'){usPart();const cx=v?x0+a:x0+hw-3;usP(cx,y0-3,G,1);usP(cx-1,y0-4,G,1);usP(cx+1,y0-4,G,1);usP(cx-2,y0-5,G,1);usP(cx+2,y0-5,G);usP(cx-2,y0-6,G,1);usP(cx+2,y0-6,G);usP(cx-3,y0-7,G,1);usP(cx+3,y0-7,G,-1);usF(cx,y0-2,'g')}   // a gilt kuwagata crest
}
function usHatGold(S,v,x0,y0){if(!S.famH||!S.hat)return;const hw=S.b.hw;usPart(1);for(let x=0;x<hw;x++){const y=y0-1+((S.hat==='hood'||S.hat==='coif'||S.hat==='armcap')?1:0);if(usHas(x0+x,y))usP(x0+x,y,USR.gold,x<(hw>>1)?1:-1)}usF(x0+(v?hw-3:2),y0-1,'e')}
function usHead(S,v,cx,y0){const b=S.b,hw=b.hw,hh=b.hh,x0=cx-(hw>>1),sk=S.skin,er=b.er==null?hh>>1:b.er,eh=b.eh||(hh>=8?2:1),bg=hw>=11;
 usPart();for(let r=0;r<hh;r++){const s=usHeadShape(b,v,r);for(let c=s[0];c<hw-s[1];c++)usP(x0+c,y0+r,sk)}
 const ex1=hw-2-(bg?1:0),ex0=ex1-3-(bg?2:0),ew=bg?2:1;
 if(S.ears==='elf'){if(v===0){usP(x0-1,y0+er,sk);usP(x0-2,y0+er-1,sk);usP(x0-1,y0+er+1,sk,-1)}else{usP(x0-1,y0+er,sk);usP(x0-2,y0+er-1,sk);usP(x0+hw,y0+er,sk,-1);usP(x0+hw+1,y0+er-1,sk,-1)}}
 else if(S.ears==='gob'){const e=(d,x,sm)=>{usP(x,y0+er,sk);usP(x+d,y0+er,sk);usP(x+d,y0+er-1,sk);if(!sm){usP(x+2*d,y0+er-1,sk);usP(x+3*d,y0+er-2,sk);usP(x,y0+er+1,sk,-1)}};e(-1,x0-1,0);e(1,x0+hw,v===0)}
 else if(S.ears==='orc'){usP(x0-1,y0+er,sk);if(v)usP(x0+hw,y0+er,sk,-1)}
 if(v===0){
  if(S.face)S.face(x0,y0,er,ex0,ex1);
  else{const ek=S.eye||'0';for(let j=0;j<eh;j++)for(let a=0;a<ew;a++){usF(x0+ex0+a,y0+er+j,ek);usF(x0+ex1+a,y0+er+j,ek)}
   if(S.brow){for(let a=-1;a<ew;a++){usB(x0+ex0+a,y0+er-1,-1);usB(x0+ex1+a,y0+er-1,-1)}}
   if(S.tusk){usF(x0+ex0+(bg?1:0),y0+er+eh+1,'l');usF(x0+ex1,y0+er+eh+1,'l');if(bg){usF(x0+ex0+1,y0+er+eh,'l');usF(x0+ex1,y0+er+eh,'l');for(let x=ex0+2;x<ex1;x++)usF(x0+x,y0+er+eh+2,'0')}}
   if(S.nose){usP(x0+hw,y0+er+1,sk);usB(x0+hw-1,y0+er+2,-1)}
   if(S.patch){for(let j=0;j<eh;j++)usF(x0+ex1,y0+er+j,'0');usF(x0+ex1-1,y0+er-1,'0');usF(x0+ex1+1,y0+er-1,'0')}
   if(S.paint){usF(x0+ex0-1,y0+er+eh,S.paint);usF(x0+ex0+1,y0+er+eh,S.paint);if(ex1+1<hw)usF(x0+ex1+1,y0+er+eh,S.paint)}
   if(S.stubble){for(let c=2;c<hw-1;c++)usB(x0+c,y0+hh-1,-1)}}
 }else if(S.bface)S.bface(x0,y0,er);
 usHair(S,v,x0,y0);usBeard(S,v,x0,y0);usHat(S,v,x0,y0,er);usHatGold(S,v,x0,y0)}
/* spark for cast frames: s 0 small, 1 mid, 2 large */
function usSpark(x,y,s,col){const lt=col[1],dk=col[0];usPart();usP(x,y,'r');
 if(s>=1){usP(x-1,y,lt);usP(x+1,y,lt);usP(x,y-1,lt);usP(x,y+1,lt)}
 if(s>=2){usP(x-2,y,dk);usP(x+2,y,dk);usP(x,y-2,dk);usP(x,y+2,dk);usP(x-1,y-1,lt);usP(x+1,y+1,lt);usP(x+1,y-1,lt);usP(x-1,y+1,lt)}}
const US_SPK={mana:['X','x'],aura:['Y','y'],qi:['Z','z'],chi:['B','A'],hex:['B','A'],void:['D','C'],ice:['x','F'],fire:['K','E']};
function usHuman(S,v,mir,st,fr){const b=S.b,tw=b.tw,th=b.th,ll=b.ll,aw=b.aw,A=S.A||(S.A=usArmor(S)),W=S.wd.cls==='xbow'&&!/:L$/.test(S.wd.id)&&((S.ld&&st!=='reload')||(st==='attack'&&fr===0))?usWdef(S.wd.id+':L'):S.wd;
 const nearL=v===0,wslot=mir?(nearL?'R':'L'):(nearL?'L':'R'),P=usPoseOf(S,st,fr,v,wslot);
 if(P.lie){usLie(S,v,mir,P);return}
 const hov=S.float?(st==='idle'?(fr?3:4):st==='walk'?(fr&1?4:3):st==='death'?(fr?0:2):st==='cast'&&fr===1?5:4):0;
 const x0=-(tw>>1)+P.ln,x1=x0+tw-1,ty=-ll-th+P.ub-hov,sy=ty+1,hcx=P.ln+P.hx+1,hy0=ty-b.hh+P.hy+(b.hunch||0);
 const shx=s=>s==='L'?(nearL?x0-aw:x0-1):(nearL?x1-aw+2:x1+1);
 const oOf=s=>s==='L'?-1:1,oslot=wslot==='L'?'R':'L';
 const wh={x:P.W.abs?x1+2:shx(wslot)+P.W.x+oOf(wslot)*P.W.o,y:sy+P.W.y},d=P.W.d,sc=S.ws||1;
 const gx=wh.x+(d[0]>0?aw-1:d[0]<0?0:(wslot==='R'?aw:-1)),gy=wh.y+(d[0]===0?0:(aw>>1));
 let oh={x:shx(oslot)+P.O.x+oOf(oslot)*P.O.o,y:sy+P.O.y};
 if(P.O.on!=null&&!P.drop){usAx(d,P.O.on*sc,usT2);const tx=gx+usT2[0]-(aw>>1),ty2=gy+usT2[1]-(aw>>1),ox=shx(oslot),ddx=tx-ox,ddy=ty2-sy,m=Math.max(Math.abs(ddx),Math.abs(ddy)),lim=b.th-1;
  oh=m>lim?{x:ox+Math.round(ddx*lim/m),y:sy+Math.round(ddy*lim/m)}:{x:tx,y:ty2}}
 let rodP=null;if(P.rod!=null&&!P.drop){usAx(d,(W.tip-(P.W.sh||0))*sc,usT2);const tx=gx+usT2[0],ty3=gy+usT2[1];rodP={x:tx,y0:ty3-(P.rod===1?3:7),y1:ty3+1};oh={x:tx-(aw>>1),y:rodP.y0-1}}
 let bowp=null,bows=1;if(W.cls==='bow'&&!P.drop){if(st==='attack')bowp={x:wh.x+aw+1,y:wh.y};else{bows=oOf(wslot);bowp={x:bows<0?wh.x-3:wh.x+aw+2,y:wh.y}}if(P.bow){oh={x:P.bow===1?x0+1:P.bow===2?x0-2:x0,y:P.bow===3?sy+3:bowp.y}}}
 const ctx={S,v,P,x0,x1,ty,hcx,hy0,fr,st,gx,gy,d,mir};
 const wFar=(wslot==='L')!==nearL,bowA=W.cls==='bow'&&st==='attack',aimF=(W.cls==='xbow'||W.cls==='gun')&&(st==='attack'||st==='reload')&&v===0&&wFar&&!P.drop;   // aiming across the chest: drawn over the body
 const drawW=()=>{if(P.drop)return;if(W.cls==='bow')usGrp=1;if(W.cls==='bow'){usGl=W.famed?1:0;usBow(W.bow,bowp.x,bowp.y,P.bow===1?1:0,oh.x+(aw>>1),oh.y,bows,W);usGl=0}
  else if(W.c.length){let wx=gx,wy=gy;if(P.W.sh){usAx(d,-P.W.sh*sc,usT2);wx+=usT2[0];wy+=usT2[1]}usWeapon(W,wx,wy,d,sc,S.res?USR[S.res]:S.gemR,st!=='death')}
  if(rodP){usPart();for(let y=rodP.y0;y<=rodP.y1;y++)usP(rodP.x,y,USR.steel,y===rodP.y0?1:0)}
  if(P.crank){usPart();const cx=oh.x+(aw>>1),cy=oh.y+aw;usP(cx,cy,USR.brass,1);usP(cx+(P.crank===2?1:-1),cy+(P.crank===3?-1:1),USR.iron)}
  usGrp=0};
 const drawWA=far=>usArm(S,A,shx(wslot),sy,wh.x,wh.y,far),drawOA=far=>usArm(S,A,shx(oslot),sy,oh.x,oh.y,far);
 const shc=()=>({x:oh.x+(aw>>1)+oOf(oslot)*(v?1:0)+(v?0:1),y:oh.y+(usShFam(S.shield)==='buckler'?0:-1)});
 const pauld=(s,far)=>{if(!A.paul)return;const x=shx(s),o=s==='L'?-1:1,bi=far?-1:0,cxp=x+(aw>>1),sp=S.spikeR||A.paul;usPart();
  if(b.big){for(let xx=x+1;xx<=x+aw-2;xx++)usP(xx,sy-3,A.paul,bi);for(let xx=x;xx<=x+aw-1;xx++)usP(xx,sy-2,A.paul,bi);usRect(x-1,sy-1,x+aw,sy+1,A.paul,bi);for(let xx=x-1;xx<=x+aw;xx++)usP(xx,sy+2,S.trimR||A.paul,bi-(S.trimR?0:1));
   if(S.spike){usPart();usP(cxp,sy-4,sp);usP(cxp-o,sy-4,sp,-1);usP(cxp,sy-5,sp);usP(cxp+o,sy-6,sp,1);usP(cxp,sy-6,sp);usP(cxp+o,sy-7,sp,1)}}
  else{for(let xx=x;xx<=x+aw-1;xx++)usP(xx,sy-1,A.paul,bi);for(let xx=x-(far?0:1);xx<=x+aw-(far?1:0);xx++)usP(xx,sy,A.paul,bi);if(S.spike){usP(cxp+(aw&1?0:(o<0?-1:0)),sy-2,sp,1);usP(cxp+(aw&1?0:(o<0?-1:0))+o,sy-3,sp,1)}}};
 // ---- behind the body
 if(S.back)S.back(ctx);
 if(v===0&&!b.big&&(S.altCls==='bow'||S.altCls==='back'||S.slung))usStowBack(S,0,x0,x1,ty,th);
 if(S.cape&&v===0){usPart();const cr=S.cape;for(let y=ty+2;y<=-3+(P.kneel?2:0);y++){const e=y>ty+th?1:0;for(let x=x0-e;x<=x1+e;x++)if(y<-3||((x+y)&1))usP(x,y,cr,-1)}}
 if(v===1&&S.shield){const c=shc();usShield(S.shield,c.x+(wFar?1:-1)*(usShFam(S.shield)==='buckler'?1:0),c.y,S.shR,1)}
 if(bowA&&v)drawW();
 if(wFar){if(!aimF){if(!bowA)drawW();drawWA(1)}pauld(wslot,1)}else{drawOA(1);pauld(oslot,1)}
 if(!S.float)usLegs(S,A,v,P,nearL);
 usGl=S.av&&S.av.gold?1:0;usTorso(S,A,v,P,x0,ty);usSkirt(S,A,v,P,x0,ty);usGl=0;
 if(S.cape&&v===1){usPart();const cr=S.cape;for(let y=ty;y<=-3+(P.kneel?2:0);y++){const e=y>ty+th?1:0;for(let x=x0-e+(y===ty?1:0);x<=x1+e-(y===ty?1:0);x++)if(y<-3||((x+y)&1))usP(x,y,cr,b.big?(((x-x0)%5===2&&y>ty+1)?1:((x-x0)%5===3&&y>ty+3)?-1:0):((x===x0+2||x===x1-2)&&y>ty+2?-1:0))}
  if(b.big&&S.trimR){usP(x0+1,ty,S.trimR);usP(x0+2,ty,S.trimR,-1);usP(x1-1,ty,S.trimR,-1);usP(x1-2,ty,S.trimR);if(S.capeFn)S.capeFn(ctx)}}
 if(S.quiver){usPart();if(v){for(let i=0;i<th-1;i++){const x=x0+1+Math.round(i*.5);usP(x,ty+i,USR.dleather);usP(x+1,ty+i,USR.dleather,-1)}usP(x0,ty-1,'l');usP(x0+1,ty-1,'g');usP(x0,ty-2,'l')}else{usP(x0,ty-1,USR.dleather);usP(x0-1,ty-2,'l');usP(x0,ty-2,'g')}}
 if(!b.big){if(v===1&&(S.altCls==='bow'||S.altCls==='back'||S.slung))usStowBack(S,1,x0,x1,ty,th);if(S.altCls)usStowHip(S,v,x0,x1,ty,th)}
 if(S.mid)S.mid(ctx);
 usHead(S,v,hcx,hy0);
 if(v===0&&S.shield&&wFar===false){const c=shc();/* shield on the far arm, held ahead of the body */usShield(S.shield,c.x,c.y,S.shR,0)}
 if(wFar){if(bowA&&!v)drawW();if(aimF){drawWA(1);drawW()}drawOA(0);pauld(oslot,0);if(v===0&&S.shield){const c=shc();usShield(S.shield,c.x-1,c.y,S.shR,0)}}
 else{if(!bowA)drawW();else if(!v)drawW();drawWA(0);pauld(wslot,0)}
 if(P.drop&&W.c.length){usWeapon(W,x1+3,-1,USD.R,sc,S.res?USR[S.res]:S.gemR,0)}else if(P.drop&&W.cls==='bow'){usPart();for(let i=0;i<=W.bow*2;i++)usP(x1+2+i,-1-(i>1&&i<W.bow*2-1?1:0),USR.wood)}
 if(S.over)S.over(ctx);
 if(P.spark){const col=US_SPK[S.spark||S.res]||['b','d'];let sx,sy2;
  if(W.cls==='staff'&&P.spark.s){usAx(d,(W.tip+2)*sc,usT2);sx=gx+usT2[0];sy2=gy+usT2[1]}
  else if(P.spark.s===2){sx=hcx;sy2=hy0-(b.big?7:5)}else if(P.spark.s===1){sx=x1+aw+(b.big?6:4);sy2=sy+(v?-1:1)}else{sx=x1+aw+1;sy2=sy+2}
  usSpark(sx,sy2,P.spark.s,col)}
 if(mir)usFlip(usG)}
/* fallen pose: build the figure standing, arms down, then lay it on its back (re-shaded afterwards) */
function usLie(S,v,mir,P){const big=S.b.big?1:0,g=usG,t=US.tmp[big],w=g.w,h=g.h,W=S.wd;
 const P2=S._lieP;S._lie=1;usHumanStand(S,v);S._lie=0;
 let mn=1e9,mx=-1e9,top=1e9;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(g.Z[y*w+x]){if(x<mn)mn=x;if(x>mx)mx=x;if(y<top)top=y}
 usWipe(t);const H=usOY-top,off=usOX+(H>>1)+1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!g.Z[i])continue;const up=usOY-1-y,nx=off-up-1,ny=v?usOY-1-(mx-x):usOY-1-(x-mn);if(nx<0||nx>=w||ny<0||ny>=h)continue;const j=ny*w+nx;t.R[j]=g.R[i];t.F[j]=g.F[i];t.Z[j]=g.Z[i];t.B[j]=g.B[i]}
 for(let i=0;i<w*h;i++){g.R[i]=t.R[i];g.F[i]=t.F[i];g.Z[i]=t.Z[i];g.B[i]=t.B[i]}
 usZ=200;if(W.c.length)usWeapon(W,-((W.tip*(S.ws||1))>>1)+2,1,USD.R,S.ws||1,S.res?USR[S.res]:S.gemR,0);else if(W.cls==='bow'){usPart();for(let i=0;i<=W.bow*2;i++)usP(-W.bow+i,1+(i>1&&i<W.bow*2-1?1:0),USR.wood)}
 if(mir)usFlip(g)}
function usHumanStand(S,v){const b=S.b,tw=b.tw,th=b.th,ll=b.ll,aw=b.aw,A=S.A,al=th-3,nearL=v===0,x0=-(tw>>1),x1=x0+tw-1,ty=-ll-th,sy=ty+1;
 const P={ub:0,ln:0,hx:0,hy:0,lg:[1,0,-1,0],kneel:0,st:'death',fr:2},shx=s=>s==='L'?(nearL?x0-aw:x0-1):(nearL?x1-aw+2:x1+1);
 const ctx={S,v,P,x0,x1,ty,hcx:0,hy0:ty-b.hh,fr:2,st:'death',lie:1};
 if(S.back)S.back(ctx);
 usArm(S,A,shx(nearL?'R':'L'),sy,shx(nearL?'R':'L')+(nearL?1:-1),sy+al-1,1);
 if(!S.float)usLegs(S,A,v,P,nearL);usTorso(S,A,v,P,x0,ty);usSkirt(S,A,v,P,x0,ty);
 if(S.cape&&v===1){usPart();for(let y=ty;y<=-3;y++)for(let x=x0;x<=x1;x++)usP(x,y,S.cape,0)}
 usHead(S,v,0,ty-b.hh);
 if(S.shield&&v===0)usShield(S.shield,nearL?x1:x0,sy+3,S.shR,0);
 usArm(S,A,shx(nearL?'L':'R'),sy,shx(nearL?'L':'R')+(nearL?-1:1),sy+al-2,0);
 if(S.over)S.over(ctx)}

/* ---- background looks on the battle figure (07-portraits.js ptBgLook): headwear, cloth, a garb overlay over the torso ---- */
function usLookSpec(S,P){if(!P)return;if(P.bgCloth){const r=usCloth(P.bgCloth);S.clothR=r;S.legR=usRamp(r.t,0)}
 if(P.garbC)S.garbR=usRamp(P.garbC.join(''),1);if(P.garb){S.garb=P.garb;S.mid=usGarb}if(P.bgTrim&&!S.trim)S.trim=P.bgTrim==='gold'?USR.gold:P.bgTrim==='white'?USR.white:USR.steel;if(P.veil)S.veilR=usCloth(P.veil)}
function usGarb(ctx){const S=ctx.S,v=ctx.v,x0=ctx.x0,x1=ctx.x1,ty=ctx.ty,b=S.b,th=b.th,tw=b.tw,g=S.garb,a=S.armor,y1=ty+th-1,fc=v?x0+Math.round(tw*.4)-1:x0+Math.round(tw*.6),R=USR,ac=S.garbR||R.red;
 if(b.big)return;const light=a==='rags'||a==='padded'||a==='leather'||a==='fur'||a==='robe'||a==='bare'||a==='brig';
 const diag=(xa,ya,xb,yb,r)=>{usPart();const n=Math.max(Math.abs(xb-xa),Math.abs(yb-ya));for(let i=0;i<=n;i++)usP(Math.round(xa+(xb-xa)*i/n),Math.round(ya+(yb-ya)*i/n),r,0)};
 switch(g){
  case'apron':case'butcher':case'smith':{const r=g==='butcher'?R.white:g==='smith'?R.dleather:(S.garbR||R.white);usPart();
   if(v===0){for(let y=ty+3;y<=y1+2;y++)for(let x=x0+1;x<=x1-1;x++)usP(x,y,r,x===x1-1?-1:0);usP(fc,ty+1,r,0);usP(fc,ty+2,r,0);usP(fc-2,ty+1,r,0);usP(fc-2,ty+2,r,0);
    if(g==='butcher'){usF(x0+2,ty+4,'g');usF(x1-2,ty+6,'f');usF(fc,ty+5,'g');usF(x0+3,y1+1,'g')}else if(g==='smith'){usF(x0+1,ty+3,'c');usF(x1-1,ty+3,'c')}}
   else{for(let x=x0;x<=x1;x++)usP(x,ty+3,r,-1);usP(fc,ty+4,r,0);usP(fc+1,ty+5,r,-1)}break}
  case'fine':if(v===0){usPart(1);for(let x=x0+1;x<=x1-1;x++)usP(x,ty,R.gold,x<fc?1:0);usF(fc,ty+2,'d');usF(fc,ty+4,'d');usF(fc,ty+6,'c');usF(x0+1,ty+2,'c');usF(x1-1,ty+3,'b')}else{usPart(1);for(let x=x0+1;x<=x1-1;x++)usP(x,ty,R.gold,0)}break;
  case'rope':case'welts':{const by=y1-1;usPart(1);for(let x=x0;x<=x1;x++)usP(x,by,R.wood,(x&1)?0:-1);if(v===0){usP(fc,by+1,R.wood,-1);usP(fc,by+2,R.wood,-1)}
   if(g==='welts'){usF(x0+1,ty+2,'g');usF(x0+2,ty+3,'f');usF(x1-2,ty+1,'g');usF(x1-1,ty+2,'f');usF(fc-1,ty+4,'g')}break}
  case'sash':diag(v?x1:x0,ty,v?x0:x1,y1,ac);break;
  case'bandolier':diag(v?x0:x1,ty,v?x1:x0,y1,R.dleather);if(v===0){usF(fc-1,ty+3,'c')}break;
  case'trophies':diag(v?x0:x1,ty,v?x1:x0,y1,R.dleather);if(v===0){usF(fc+1,ty+2,'l');usF(fc-1,ty+4,'l');usF(fc-1,ty+5,'m');usF(fc-3,ty+6,'g')}else{usF(fc,ty+3,'l')}break;
  case'straps':diag(x0,ty,x1,y1,R.dleather);diag(x1,ty,x0,y1,R.dleather);usF(fc,ty+(th>>1),'q');break;
  case'braces':usPart(1);for(let y=ty;y<=y1;y++){usP(x0+1,y,R.dleather,0);usP(x1-1,y,R.dleather,-1)}break;
  case'tabard':{usPart();const t0=v?fc:fc-1;for(let y=ty+1;y<=y1+1;y++)for(let x=t0;x<=t0+1;x++)usP(x,y,ac,x===t0+1?-1:0);if(v===0)usF(t0,ty+3,'l');break}
  case'stripes':if(light){for(let y=ty+1;y<=y1;y+=2){usPart();for(let x=x0;x<=x1;x++)usP(x,y,ac,0)}}break;
  case'plaid':if(light){for(let y=ty;y<=y1;y++)for(let x=x0;x<=x1;x++)if(((x-x0)%3===1)||((y-ty)%3===1))usB(x,y,-1)}break;
  case'motley':if(light){usPart();for(let y=ty;y<=y1;y++)for(let x=x0;x<=(v?x1:fc-1);x++)if(v?x>=fc:true)usP(x,y,ac,0)}break;
  case'patches':if(light){usF(x0+1,ty+2,'j');usF(x0+2,ty+2,'k');usF(x0+1,ty+3,'j');usF(x1-1,ty+5,'v');usF(x1-2,ty+5,'w')}break;
  case'fleece':case'pelt':{const r=g==='fleece'?R.white:R.fur;usPart();for(let x=x0-1;x<=x1+1;x++){usP(x,ty,r,((x*5)%3===0)?1:0);if((x&1))usP(x,ty-1,r,1);if(x>x0&&x<x1&&!(x&1))usP(x,ty+1,r,-1)}break}
  case'vials':{const by=y1-1;for(let x=x0;x<=x1;x++)usF(x,by,(x&1)?'a':'i');if(v===0){usF(x0+1,by+1,'A');usF(fc,by+1,'x');usF(x1-1,by+1,'g')}break}
  case'eye':if(v===0){usF(fc-2,ty+3,'C');usF(fc-1,ty+2,'C');usF(fc,ty+2,'D');usF(fc+1,ty+3,'D');usF(fc-1,ty+3,'0');usF(fc,ty+3,'0');usF(fc-1,ty+4,'D');usF(fc,ty+4,'D')}break;
  case'tatters':{const sk=S.skin.t[S.skin.b];usF(x0+1,ty+3,sk);usF(x1-1,ty+5,sk);usF(fc,y1,'0');usF(x0,y1,'0');usF(x1,y1-1,'0');break}
  case'manica':{usPart();const sx=v?x1:x0;for(let y=ty-1;y<=ty+2;y++)for(let k=-1;k<=1;k++)usP(sx+(v?-k:k),y,(y&1)?R.steel:R.iron,k<0?1:0);diag(v?x0:x1,ty,v?x1:x0,y1,R.dleather);break}
 }
 if(S.trim&&!S.av&&v===0){}}
function usHatBg(S,v,x0,y0,er){if(usHatCraft(S,v,x0,y0,er))return true;const t=S.hat,b=S.b,hw=b.hw,hh=b.hh,c=S.hatR||USR.leather,R=S.MR||USR,front=v?0:hw-1;
 const dome=(r,y1,top)=>{for(let x=1;x<hw-1;x++)usP(x0+x,y0-1-(top||0),r,1);if(top)for(let x=2;x<hw-2;x++)usP(x0+x,y0-1,r);for(let y=0;y<=y1;y++)for(let x=0;x<hw;x++)usP(x0+x,y0+y,r,x>=hw-2?-1:0)};
 switch(t){
  case'wide':case'capotain':{usPart();const tall=t==='capotain';for(let y=tall?-4:-2;y<=0;y++)for(let x=1;x<hw-1;x++)usP(x0+x,y0+y,c,(x===1?1:x>=hw-2?-1:0));
   usPart();for(let x=-2;x<=hw+1;x++)usP(x0+x,y0+1,c,x<1?1:x>hw-2?-1:0);for(let x=1;x<hw-1;x++)usP(x0+x,y0,S.garbR||USR.blk,0);if(tall&&v===0)usF(x0+hw-3,y0,'c');return true}
  case'feathercap':{usPart();for(let x=0;x<=hw;x++){usP(x0+x,y0-1,c,x<2?1:0);usP(x0+x,y0,c,x>hw-2?-1:0)}for(let x=1;x<hw-1;x++)usP(x0+x,y0-2,c,1);usP(x0+(v?hw:0),y0+1,c,-1);
   usPart();const fx=v?hw-1:1,d=v?1:-1,f=S.garbR||USR.white;[[0,-3],[d,-4],[d,-5],[2*d,-6],[2*d,-7]].forEach(([a,q],i)=>usP(x0+fx+a,y0+q,i<2?f:USR.white,i>2?1:0));return true}
  case'cowl':{usPart();for(let y=-4;y<0;y++){const w=Math.max(1,(y+5));for(let x=(hw>>1)-w;x<(hw>>1)+w;x++)usP(x0+x,y0+y,c,x<(hw>>1)?1:-1)}
   for(let y=0;y<=hh;y++)for(let x=-1;x<=hw;x++)usP(x0+x,y0+y,c,x>=hw-1?-1:x<=0?0:0);if(v===0){const ex1=hw-2,ex0=ex1-3;usF(x0+ex0,y0+er,'0');usF(x0+ex1,y0+er,'0')}return true}
  case'wrap':{usPart();for(let y=-2;y<=2;y++)for(let x=(y===-2?1:-1);x<=hw-(y===-2?2:0);x++)usP(x0+x,y0+y,c,((x+y*2)%4===0)?-1:x>=hw-1?-1:0);
   if(v===0){usPart();for(let y=er+(b.eh||2);y<hh;y++)for(let x=2;x<hw;x++)usP(x0+x,y0+y,S.veilR||c,0)}else{usPart();for(let y=3;y<=hh;y++)usP(x0+hw,y0+y,c,-1)}return true}
  case'bandana':{usPart();for(let x=1;x<hw-1;x++)usP(x0+x,y0-1,c,1);for(let y=0;y<=1;y++)for(let x=-1;x<=hw;x++)usP(x0+x,y0+y,c,((x+y)%3===0)?-1:0);
   usPart();const kx=v?x0+hw:x0-1,d=v?1:-1;usP(kx,y0+2,c,0);usP(kx+d,y0+3,c,-1);usP(kx,y0+3,c,-1);if(S.veilR&&v===0){usPart();for(let y=er+(b.eh||2);y<hh;y++)for(let x=2;x<hw;x++)usP(x0+x,y0+y,S.veilR,0)}return true}
  case'furcap':{usPart();for(let x=1;x<hw-1;x++)usP(x0+x,y0-2,c,1);for(let y=-1;y<=1;y++)for(let x=-1;x<=hw;x++)usP(x0+x,y0+y,c,((x*7+y*5)%4===0)?-1:x>=hw-1?-1:0);for(let y=2;y<=er+1;y++){usP(x0-1,y0+y,c,-1);if(v)usP(x0+hw,y0+y,c,-1)}return true}
  case'scholar':{usPart();const r=USR.blk;dome(r,1);for(let y=2;y<=er+1;y++){usP(x0-1,y0+y,r,0);if(v)usP(x0+hw,y0+y,r,0)}return true}
  case'miner':{usPart();dome(USR.leather,0);for(let x=-1;x<=hw;x++)usP(x0+x,y0+1,USR.dleather,0);usPart();const cx=x0+(v?2:hw-3);usP(cx,y0-2,USR.white,1);usP(cx,y0-3,USR.white,0);usF(cx,y0-4,'E');usF(cx,y0-5,'y');return true}}
 if(S.veilR&&v===0&&(t==='hood')){usPart();for(let y=er+(b.eh||2);y<hh;y++)for(let x=2;x<hw;x++)usP(x0+x,y0+y,S.veilR,0)}
 return false}

/* ================= CRAFTED GEAR (13-craft.js: craft:1, look 'craft_<id>' or a shield look) =================
   Monster materials as ramps; weapons are a hand-built base re-cut in those materials plus their own extra cells
   (US_CRW: base weapon, ramp remap, extra cells, field overrides); armor through US_AV (body ramp, texture, pm = the
   bust's colour remap, ptC = the bust's cloth, cr = an extra painter: feathers leaves bones spines), helmets as new hats
   (ogreskull tuskbarbute wyvcrest), shields through US_SHV (scales dev, leaf boss). Icons follow from the same painters. */
Object.assign(USR,{ivory:usRamp('mlr',1),serp:usRamp('4wv',1),wyv:usRamp('fKgh',1),venom:usRamp('BAe',1),vglass:usRamp('GDCF',1),heart:usRamp('aibc',2),owl:usRamp('iHnm',1),ogre:usRamp('4nm',1),leaf:usRamp('wBA',1)});
const US_CRW={
 craft_fangknife:{b:'rondel',m:{plate:'ivory',brass:'venom',dleather:'serp'},x:[[7,0,'ivory',1,2],[3,1,'A',0,2]]},
 craft_tuskspear:{b:'warspear',m:{plate:'ivory',brass:'dleather'},x:[[13,2,'ivory',-1,2],[14,2,'ivory',-1,2],[12,-2,'ivory',1,2]]},
 craft_heartstave:{b:'staff',m:{wood:'heart'},x:[[11,-1,'leaf',1,2],[11,1,'leaf',-1,2],[12,0,'leaf',1,2],[12,-1,'leaf',1,2],[8,1,'leaf',0,1],[7,-1,'leaf',0,1],[10,0,'c',1,2]]},
 craft_bonemaul:{b:'maul',m:{dwood:'ivory',iron:'bone',plate:'ivory'},x:[[11,0,'iron',0,1],[-3,0,'iron',0,0],[16,0,'ivory',1,2],[13,3,'ivory',-1,2]]},
 craft_sinewxbow:{b:'xbow:H',m:{dwood:'ivory',iron:'bone',brass:'red',wood:'dwood'}},
 craft_tailglaive:{b:'glaive',m:{plate:'wyv',brass:'ivory'},x:[[18,2,'ivory',-1,2],[15,-1,'ivory',1,2],[22,0,'wyv',1,2]]},
 craft_voidgreat:{b:'greatsword',m:{plate:'vglass',brass:'iron',dleather:'blk'},x:[[5,0,'C',1,2],[9,1,'C',1,2],[13,0,'r',1,2]],o:{gem:1}},
 craft_silkbow:{b:'warbow',o:{bowR:'white',recurve:1,nock:'gold',wrap:1}}};
for(const k in US_CRW)US_WHAND[k]=k;
function usCraftW(id){const L=/:L$/.test(id),k=id.replace(/:L$/,''),D=US_CRW[k],B=usWdef(D.b+(L?':L':'')),rev=new Map();for(const n in USR)rev.set(USR[n],n);const m=D.m||{};
 const c=B.c.map(q=>{let r=q[2];if(r&&typeof r==='object'){const n=rev.get(r);if(n&&m[n])r=USR[m[n]]}return[q[0],q[1],r,q[3],q[4]]});
 if(D.x)for(const e of D.x)c.push([e[0],e[1],USR[e[2]]||e[2],e[3]|0,e[4]|0]);c.sort((a,b)=>a[4]-b[4]);return Object.assign({},B,{id,c},D.o||{})}
Object.assign(US_AV,{
 craft_serpjerkin:{k:'leather',body:'serp',tex:'scales',collar:1,pm:{i:'4',j:'w',k:'v',a:'2'},A:{fore:'serp'}},
 craft_owlcoat:{k:'leather',body:'owl',tex:'hide',mantle:1,cr:'feathers',pm:{i:'H',j:'n',k:'m'}},
 craft_barkrobe:{k:'robe',body:'heart',trim:'gold',sig:1,cr:'leaves',ptC:['a','i','b'],A:{leg:'heart'}},
 craft_ogreharness:{k:'brig',body:'ogre',tex:'studs',cr:'bones',ptC:['4','n','m'],A:{paul:'ivory',skB:'ivory'}},
 craft_wyvcuirass:{k:'scale',body:'wyv',cr:'spines',spikes:1,spikeR:'ivory',pm:{o:'f',p:'K',q:'g',r:'h'},A:{paul:'wyv',shin:'wyv',boot:'wyv',fore:'wyv'}}});
Object.assign(US_HV,{craft_ogrehelm:'ogreskull',craft_tuskhelm:'tuskbarbute',craft_wyvhelm:'wyvcrest'});
Object.assign(US_SHV,{targe_serpent:{dev:'scales',field:'serp',rim:'dleather',boss:'brass',alt:'serp'},round_heart:{dev:'rings',field:'heart',rim:'dwood',boss:'none',alt:'heart',leaf:1},
 kite_wyvern:{dev:'scales',field:'wyv',rim:'iron',boss:'spike',alt:'wyv'}});
/* sprite headgear for the crafted helmets (called from usHatBg) */
function usHatCraft(S,v,x0,y0,er){const t=S.hat,b=S.b,hw=b.hw,hh=b.hh,R=USR;
 if(t==='tuskbarbute'){S.hat='barbute';try{usHat(S,v,x0,y0,er)}finally{S.hat=t}usPart();const fx=v?x0+hw:x0+hw-1,sx=v?x0-1:x0;
  for(const [x,d] of[[sx,-1],[v?x0+hw:fx,1]]){usP(x,y0+er+2,R.ivory,0);usP(x+d,y0+er+1,R.ivory,1);usP(x+d,y0+er,R.ivory,1)}return true}
 if(t==='wyvcrest'){S.hat='great';const ac=S.accR,rs=S.res;S.accR=R.wyv;S.res=null;try{usHat(S,v,x0,y0,er)}finally{S.hat=t;S.accR=ac;S.res=rs}usPart();
  for(let x=1;x<hw-1;x++){usP(x0+x,y0-2,R.wyv,x<(hw>>1)?1:0);if(x>1&&x<hw-2)usP(x0+x,y0-3,R.wyv,(x&1)?1:-1)}usP(x0+(hw>>1),y0-4,R.wyv,1);return true}
 if(t==='ogreskull'){usPart();for(let x=2;x<hw-2;x++)usP(x0+x,y0-4,R.bone,1);for(let x=1;x<hw-1;x++)usP(x0+x,y0-3,R.bone,1);for(let y=-2;y<=2;y++)for(let x=-1;x<=hw;x++)usP(x0+x,y0+y,R.bone,x>=hw-1?-1:y<0?1:0);
  if(v===0){for(const sx of[hw-2,hw-5]){usF(x0+sx,y0-1,'0');usF(x0+sx+1,y0-1,'0');usF(x0+sx,y0,'0');usF(x0+sx+1,y0,sx===hw-2?'f':'g')}usF(x0+hw-3,y0+1,'0');for(let x=1;x<=hw;x++)usF(x0+x,y0+2,(x&1)?'r':'0');
   usPart();usP(x0+hw+1,y0+3,R.ivory,0);usP(x0+hw+1,y0+2,R.ivory,1);usP(x0+hw,y0+1,R.ivory,1);usP(x0-1,y0+3,R.ivory,0);usP(x0-2,y0+2,R.ivory,1)}
  else{usF(x0+2,y0-1,'n');usF(x0+hw-3,y0,'n');usF(x0+3,y0+1,'n')}return true}
 return false}
function usArmCraft(S,A,v,x0,x1,ty,th,fc){const V=S.av,c=V.cr,y1=ty+th-1;
 if(c==='feathers'){usPart(1);for(let x=x0-1;x<=x1+1;x++){usP(x,ty+((x&1)?1:2),USR.white,(x&1)?0:-1)}}
 else if(c==='leaves'){usF(x0+1,ty+2,'A');usF(x0+2,ty+3,'B');usF(x1-1,ty+4,'A');usF(x1-2,ty+5,'B');usF(x0+1,y1-1,'B')}
 else if(c==='bones'){if(v===0){usPart();usP(fc,ty+2,USR.ivory,1);usP(fc-1,ty+3,USR.ivory,0);usP(fc+1,ty+3,USR.ivory,-1);usP(x0+1,ty+5,USR.ivory,0)}}
 else if(c==='spines'){usPart();for(let x=x0+1;x<=x1-1;x+=2)usP(x,ty-1,USR.ivory,1)}}

/* ---- looks: mercs from the portrait spec, enemies per type ---- */
const US_WMAP={knife:'knife',rondel:'rondel',club:'club',mace:'mace',shortsword:'shortsword',arming:'arming',runeblade:'runeblade',handaxe:'handaxe',waraxe:'waraxe',greataxe:'greataxe',spear:'spear',warspear:'warspear',pike:'pike',shortbow:'shortbow',warbow:'warbow',staff:'staff',focus:'focus',riftedge:'riftedge',
 mallet:'warhammer',warhammer:'pickhammer',maul:'maul',warmaul:'warmaul',bill:'bill',halberd:'halberd',glaive:'glaive',greatsword:'greatsword',zweihander:'zweihander',runegreat:'runegreat',
 lightxbow:'xbow',crossbow:'xbow',arbalest:'arbalest',pistol:'pistol',duelpistol:'pistol',musket:'musket'};
const US_WT={dagger:'knife',sword:'shortsword',axe:'handaxe',mace:'club',spear:'spear',bow:'shortbow',staff:'staff',fist:'fist',hammer:'warhammer',polearm:'halberd',greatsword:'greatsword',crossbow:'xbow',flintlock:'pistol'},
 US_WT2={axe:'greataxe',spear:'pike',bow:'warbow',sword:'runeblade',staff:'staff',mace:'mace',hammer:'maul',polearm:'halberd',greatsword:'greatsword',crossbow:'xbow',flintlock:'musket'};
/* the new families draw by tier: an item's `look` when it names a drawn weapon, else its price rank among its family (same hands) */
const US_TIERS={hammer:['warhammer','pickhammer'],hammer2:['maul','warmaul'],polearm2:['bill','halberd','glaive'],greatsword2:['greatsword','zweihander','runegreat'],crossbow2:['xbow','arbalest'],flintlock:['pistol'],flintlock2:['musket'],
 polearm:['bill','halberd','glaive'],greatsword:['greatsword','zweihander','runegreat'],crossbow:['xbow','arbalest']};
const US_LOOKW={warhammer:'warhammer',hammer:'warhammer',pick:'pickhammer',pickhammer:'pickhammer',horsemanspick:'pickhammer',maul:'maul',warmaul:'warmaul',sledge:'maul',bill:'bill',billhook:'bill',halberd:'halberd',glaive:'glaive',voulge:'glaive',poleaxe:'halberd',
 greatsword:'greatsword',zweihander:'zweihander',flamberge:'zweihander',runegreat:'runegreat',runed:'runegreat',crossbow:'xbow',xbow:'xbow',light:'xbow',arbalest:'arbalest',heavy:'arbalest',pistol:'pistol',musket:'musket',arquebus:'musket',blunderbuss:'musket'};
const US_TR=new Map();
function usTierOf(id){let t=US_TR.get(id);if(t!==undefined)return t;const I=ITEMS[id],L=[];for(const k in ITEMS){const J=ITEMS[k];if(J.k==='w'&&J.wt===I.wt&&!!J.two===!!I.two&&!J.uniq)L.push(k)}
 L.sort((a,b)=>(ITEMS[a].price||0)-(ITEMS[b].price||0));const T=US_TIERS[I.wt+(I.two?'2':'')]||US_TIERS[I.wt]||[],i=Math.max(0,L.indexOf(id)),n=L.length;
 t=!T.length?null:I.uniq?T[T.length-1]:T[n<=1?0:Math.min(T.length-1,Math.round(i*(T.length-1)/(n-1)))];US_TR.set(id,t);return t}
/* any weapon (item id, an enemy's sidearm object, null) -> the sprite weapon drawn for it */
function usWpnOf(x){if(!x)return'fist';if(typeof x==='object'){const w=x.wt||'fist';return x.look&&US_LOOKW[x.look]?US_LOOKW[x.look]:x.two?US_WT2[w]||US_WT[w]||'fist':US_WT[w]||'knife'}
 {const k=typeof ITEMS!=='undefined'&&ITEMS[x]?usWpnKey(x):null;if(k)return k}
 if(US_WMAP[x])return US_WMAP[x];const I=typeof ITEMS!=='undefined'&&ITEMS[x];if(!I||I.k!=='w')return'fist';const w=I.wt||'fist';
 if(I.look&&US_LOOKW[I.look])return US_LOOKW[I.look];if(US_TIERS[w]||US_TIERS[w+'2']){const t=usTierOf(x);if(t)return t}
 if(I.two)return US_WT2[w]||US_WT[w]||'fist';if(w==='sword')return(I.price||0)>=500?'arming':'shortsword';if(w==='mace')return(I.price||0)>=300?'mace':'club';if(w==='axe')return(I.price||0)>=400?'waraxe':'handaxe';if(w==='dagger')return(I.price||0)>=200?'rondel':'knife';return US_WT[w]||'fist'}
function usSetAlt(S,a){S.alt=null;S.altCls=null;if(!a)return;const W=a&&a.c&&a.cls?a:usWdef(usWpnOf(a));const cl=usStowCls(W);if(cl){S.alt=W;S.altCls=cl}}
function usMercSpec(m,H){let P=null;try{if(typeof ptMercSpec==='function')P=ptMercSpec(m)}catch(e){}
 const eq=m.eq||{},race=typeof RACE!=='undefined'&&RACE[m.race]?m.race:'human',S={kind:'hum',seed:P?P.seed&255:(m.id|0)&255};
 S.b=US_BUILD[race];S.fem=P?P.fem:0;if(S.fem&&race==='human')S.b=Object.assign({},S.b,{jaw:2});
 const skA=P&&P.skin?P.skin:['s','t','u','i'];S.skin=usSkin(skA);S.hair=P?P.hair:'short';S.hairR=usHairR(P&&P.hairC?P.hairC:['i','H','k']);
 S.ears=race==='elf'?'elf':race==='halforc'?'orc':null;S.tusk=race==='halforc';S.brow=race==='halforc'||race==='dwarf';
 if(P){S.beard=P.beard||null;if(P.beardC)S.beardR=usHairR(P.beardC);S.ring=P.ring;S.stubble=P.marks&&P.marks.stubble;S.patch=P.marks&&P.marks.patch;if(P.marks&&P.marks.paint)S.paint=P.marks.paintC;
  if(P.face&&P.face.iris&&P.face.iris!=='0'&&race==='elf')S.eye='1';S.hat=P.hat||null;if(P.hatC)S.hatR=usCloth(P.hatC);S.famH=!!(ITEMS[eq.h]&&ITEMS[eq.h].famed);if(P.gemC)S.gemC=P.gemC[0];if(P.beads)S.beads=P.beads[0];
  S.ragC=P.ragC;S.robeC=P.robeC;if(P.shC)S.shR=usCloth(P.shC)}
 {const av=ITEMS[eq.a]&&ITEMS[eq.a].k==='a'?usArmorV(eq.a):US_AV.rags;S.armor=av.k;S.av=av;S.famA=!!(ITEMS[eq.a]&&ITEMS[eq.a].famed);if(av.spikes)S.spike=1;if(av.spikeR)S.spikeR=USR[av.spikeR];
  if(av.trim==='white')S.trim=USR.white;else if(av.trim==='steel')S.trim=USR.steel;else if(av.trim==='gold')S.trim=USR.gold}if(!(typeof ptHelmsExist==='function'&&ptHelmsExist())){if(S.armor==='plate')S.hat='great';else if(S.armor==='scale')S.hat='nasal'}   // helmets are gear now (eq.h -> P.hat); without that rule the armor tier still picks one
 if(S.hat==='cap'&&ITEMS[eq.h])S.hatR=USR.leather;
 if(/^(hood|great|kettle|cap|straw|nasal|coif|barbute|armcap|spangen|sallet|bascinet|armet)$/.test(S.hat||'')){if(S.hair==='mohawk'||S.hair==='bun'||S.hair==='curly'||S.hair==='mane'||S.hair==='shaggy'||S.hair==='swept')S.hair='short'}
 const wid=H?H.w:eq.w,alt=H?H.a:(eq.b||null);S.wd=usWdef(usWpnOf(wid));
 const two=typeof wid==='string'&&ITEMS[wid]?!!ITEMS[wid].two:!!S.wd.two;
 if(ITEMS[eq.s]){if(two)S.slung=eq.s;else S.shield=eq.s;if(!S.shR)S.shR=usCloth('red')}
 usSetAlt(S,alt);
 S.res=typeof mercRes==='function'?mercRes(m):null;S.quiver=S.wd.cls==='bow'||S.altCls==='bow';
 if(S.shield||S.slung){const k=usShLook(eq.s);if(S.shield)S.shield=k;else S.slung=k}
 S.famed=!!(S.wd&&S.wd.famed)||!!(S.av&&S.av.gold)||/\*$/.test(S.shield||'')||S.famH;usLookSpec(S,P);usLivery(S,m);return S}
/* the sashimono: a banner pole up the back with a narrow flag and the mon (fl: the flag ramp, mk: the mon's key, big: a gilt finial) */
function usSashi(c,fl,mk,big){if(c.lie)return;const S=c.S,dir=c.v?1:-1,x=c.v?((c.x0+c.x1)>>1)+1:c.x0+1,top=c.hy0-(big?9:8),y1=c.ty+3,sw=c.st==='walk'?(c.fr&1):0;usPart();for(let y=top;y<=y1;y++)usP(x,y,USR.dwood,y===top?1:0);
 if(big){usPart();usP(x,top-1,USR.gold,1);usP(x+dir,top-2,USR.gold);usP(x-dir,top-2,USR.gold,1)}
 usPart();for(let j=0;j<7;j++)for(let i=1;i<=3;i++){const y=top+1+j+(i===3?sw:0);usP(x+dir*i,y,fl,i===3?-1:j===0?1:0)}
 usF(x+dir*2,top+3+(sw&0),mk);usF(x+dir*2,top+4,mk);usF(x+dir*1,top+3,mk);if(big)usF(x+dir*3,top+4,mk)}
function usEnemySpec(id,u){const R=USR,C=usCloth,SK=typeof PT_SKIN!=='undefined'?PT_SKIN:{},sk=n=>usSkin(SK[n]||['s','t','u','i']),HC=typeof PT_HAIRC!=='undefined'?PT_HAIRC:{},hr=n=>usHairR(HC[n]||['0','G','o']);
 const B=US_BUILD,S={kind:'hum',seed:7,b:B.human,skin:sk('fair'),armor:'rags',wd:usWdef('fist')},set=o=>Object.assign(S,o);
 switch(id){
  case'gob':return set({b:B.gob,skin:sk('gob'),ears:'gob',nose:1,eye:'y',armor:'rags',ragC:'brown',hat:'cap',hatR:R.leather,wd:usWdef('knife')});
  case'gobarch':return set({b:B.gob,skin:sk('gob'),ears:'gob',nose:1,eye:'y',armor:'leather',hat:'hood',hatR:C('brown'),wd:usWdef('shortbow'),quiver:1});
  case'gobsham':return set({b:B.gob,skin:sk('gob'),ears:'gob',nose:1,eye:'C',armor:'fur',hat:'skullcap',wd:usWdef('shamstaff'),spark:'hex',beads:'l',paint:'l',
   over:c=>{if(c.lie)return;usPart();const x=c.v?c.x0-1:c.x1+1,y=c.ty+c.S.b.th;usP(x,y,R.bone);usP(x,y+1,R.red);usP(c.v?c.x1+1:c.x0-1,y,R.red)}});
  case'skel':return set({b:B.thin,skin:R.bone,armor:'mail',hat:'kettle',wd:usWdef('shortsword'),shield:'tower',shR:C('red'),Aov:{body:R.iron,skirt:1},eye:'F',nobelt:0,
   face:(x0,y0,er,ex0,ex1)=>{usF(x0+ex0,y0+er,'0');usF(x0+ex1,y0+er,'0');usF(x0+ex0,y0+er+1,'F');usF(x0+ex1,y0+er+1,'F');usF(x0+ex1-1,y0+er+2,'n');for(let x=3;x<=6;x++)usF(x0+x,y0+7,x&1?'n':'0');usB(x0+2,y0+6,-1);usB(x0+7,y0+6,-1)},
   bface:(x0,y0)=>{usB(x0+3,y0+6,-1);usB(x0+4,y0+6,-1)}});
  case'skelhal':return set({b:B.thin,skin:R.bone,armor:'mail',hat:'kettle',wd:usWdef('halberd'),Aov:{body:R.iron,skirt:1},eye:'F',nobelt:0,
   face:(x0,y0,er,ex0,ex1)=>{usF(x0+ex0,y0+er,'0');usF(x0+ex1,y0+er,'0');usF(x0+ex0,y0+er+1,'F');usF(x0+ex1,y0+er+1,'F');usF(x0+ex1-1,y0+er+2,'n');for(let x=3;x<=6;x++)usF(x0+x,y0+7,x&1?'n':'0');usB(x0+2,y0+6,-1);usB(x0+7,y0+6,-1)},
   bface:(x0,y0)=>{usB(x0+3,y0+6,-1);usB(x0+4,y0+6,-1)}});
  case'zomb':return set({b:B.bloat,skin:sk('rot'),armor:'rags',ragC:'night',hair:'wisps',hairR:hr('N'),eye:'A',zomb:1,belly:1,
   face:(x0,y0,er,ex0,ex1)=>{usF(x0+ex0,y0+er,'A');usF(x0+ex1,y0+er,'0');usF(x0+ex1-1,y0+er+2,'0');usF(x0+ex1-2,y0+er+2,'f');usF(x0+ex0-1,y0+er-2,'g');usF(x0+1,y0+er+1,'f')},
   over:c=>{if(c.lie)return;usF(c.x0+2,c.ty+4,'f');usF(c.x0+3,c.ty+5,'g');usF(c.x0+3,c.ty+4,'f')}});
  case'necro':return set({b:B.slim,skin:sk('ash'),armor:'robe',robeC:'purple',hat:'hood',hatR:C('purple'),eye:'A',wd:usWdef('necstaff'),spark:'hex',beads:'l',trim:R.bone});
  case'orcy':return set({b:B.orc,skin:sk('dorc'),ears:'orc',tusk:1,brow:1,eye:'g',armor:'fur',hair:'bun',hairR:hr('G'),paint:'g',wd:usWdef('handaxe')});
  case'orcw':return set({b:B.orc,skin:sk('dorc'),ears:'orc',tusk:1,brow:1,eye:'g',armor:'mail',hat:'nasal',wd:usWdef('waraxe'),Aov:{paul:R.iron},spike:1});
  case'obrute':return set({b:B.orc,skin:sk('dorc'),ears:'orc',tusk:1,brow:1,eye:'g',armor:'mail',hat:'nasal',wd:usWdef('maul'),Aov:{paul:R.iron},spike:1});
  case'orcl':return set({b:B.lord,skin:sk('dorc'),ears:'orc',tusk:1,brow:1,eye:'E',armor:'plate',hat:'hornhelm',wd:usWdef('lordaxe'),ws:2,cape:C('red'),spike:1,spikeR:R.horn,trimR:R.brass,paint:'g',
   Aov:{body:R.steel,slv:sk('dorc'),up:.5,fore:R.iron,hand:sk('dorc'),leg:R.iron,boot:R.dleather,paul:R.steel,joint:1},
   mid:c=>{if(c.lie)return;const f=R.fur,y=c.ty;usPart();for(let x=c.x0-1;x<=c.x1+1;x++)for(let j=-1;j<=2;j++){if(j===2&&((x+c.x0)&1))continue;if(j===-1&&(x<c.x0+2||x>c.x1-2))continue;usP(x,y+j,f,((x*7+j*5)%6<2)?1:((x*3+j*7)%5===0?-1:0))}},
   over:c=>{if(c.lie)return;const b=c.S.b,by=c.ty+b.th-2;
    if(!c.v){const fc=c.x0+Math.round(b.tw*.6);usPart();usRect(fc-2,by-1,fc+1,by+1,R.bone);usF(fc-2,by+1,'0');usF(fc+1,by+1,'0');usF(fc-2,by,'0');usF(fc,by,'0');usP(fc-1,by+2,R.bone,-1);usP(fc,by+2,R.bone,-1);
     const cx=c.hcx-5,y=c.hy0;usPart();for(let i=0;i<6;i++){usP(cx+3+i,y-2,R.ember,-1);if(i>0&&i<5)usP(cx+3+i,y-3,R.ember);if(i>1&&i<4)usP(cx+3+i,y-4,R.ember,1)}}}});
  case'thug':return set({b:B.brute,skin:sk('fair'),armor:'rags',ragC:'brown',hair:'bald',stubble:1,brow:1,wd:usWdef('club')});
  case'bmark':return set({b:B.human,skin:sk('tan'),armor:'leather',hat:'hood',hatR:C('night'),mask:1,wd:usWdef('warbow'),quiver:1});
  case'bxbow':return set({b:B.human,skin:sk('tan'),armor:'leather',hat:'hood',hatR:C('night'),mask:1,wd:usWdef('xbow')});
  case'braid':return set({b:B.human,skin:sk('fair'),armor:'mail',hair:'short',hairR:hr('H'),beard:'short',hat:'kettle',wd:usWdef('arming'),shield:'heater',shR:C('night')});
  case'blead':return set({b:B.knight,skin:sk('fair'),armor:'scale',hair:'mane',hairR:hr('G'),beard:'full',hat:'feather',hatR:C('red'),patch:1,wd:usWdef('arming'),cape:C('red'),ws:1});
  case'imp':return set({b:B.imp,skin:sk('void'),ears:'gob',eye:'E',armor:'bare',hat:'horns',claw:1,nobelt:1,
   back:c=>{const f=c.st==='walk'?(c.fr&1):c.st==='idle'?c.fr:c.st==='attack'?(c.fr===1?1:0):c.st==='death'?1:0,y=c.ty+1,wr=usRamp('GGD',1);
    const UP=[[1,0,1],[2,-1,1],[3,-2,1],[4,-3,1],[5,-4,1],[2,0,0],[3,-1,0],[4,-2,0],[3,0,0],[4,-1,0],[5,-2,0],[5,-3,0],[5,-1,0],[4,1,0]],DN=[[1,0,1],[2,0,1],[3,-1,1],[4,-1,1],[5,0,1],[6,1,1],[2,1,0],[3,0,0],[3,1,0],[4,0,0],[4,1,0],[5,1,0],[3,2,0],[5,2,0]];
    for(const s of[-1,1]){const bx=s<0?c.x0-1:c.x1+1;usPart();(f?DN:UP).forEach(([a,b2,bn])=>usP(bx+s*a,y+b2,wr,bn))}
    if(!c.lie){const tx=c.v?c.x1+1:c.x0-1,d=c.v?1:-1;usPart();usP(tx,-4,c.S.skin,-1);usP(tx+d,-3,c.S.skin,-1);usP(tx+2*d,-3,c.S.skin,-1);usP(tx+3*d,-4,c.S.skin,-1);usP(tx+3*d,-5,c.S.skin);usP(tx+4*d,-6,'E')}}});
  case'vknight':return set({b:B.knight,skin:sk('void'),armor:'void',hat:'voidhelm',wd:usWdef('riftedge'),cape:R.voidl,spike:1,spark:'void'});
  case'vmage':return set({b:B.slim,skin:usRamp('00G',1),armor:'robe',robeC:'purple',hat:'hood',hatR:C('purple'),eye:'F',float:1,wd:usWdef('voidstaff'),spark:'void',trim:R.voidl,
   face:(x0,y0,er,ex0,ex1)=>{usF(x0+ex0,y0+er,'F');usF(x0+ex1,y0+er,'F');usF(x0+ex0,y0+er+1,'x');usF(x0+ex1,y0+er+1,'x')},
   over:c=>{if(c.lie)return;const t=(c.st==='idle'?c.fr*2:c.fr)&3,pts=[[-8,-12],[7,-20],[8,-6],[-7,-24]];usPart();for(let i=0;i<3;i++){const p=pts[(i+t)%4];usP(p[0],p[1]+(i&1),'C')}}});
  case'tyrant':return set({b:B.tyrant,skin:usRamp('0GDC',2),ears:'orc',tusk:1,brow:1,eye:'E',armor:'void',hat:'crown',wd:usWdef('tyrblade'),ws:2,cape:usRamp('GGD',1),spike:1,spikeR:R.horn,trimR:R.brass,spark:'void',claw:1,
   Aov:{slv:usRamp('0GDC',2),up:.5,fore:R.void,hand:usRamp('0GDC',2),paul:R.void,leg:R.void,boot:R.void},
   face:(x0,y0,er,ex0,ex1)=>{for(const ex of[ex0,ex1]){usF(x0+ex,y0+er,'E');usF(x0+ex+1,y0+er,'y');usF(x0+ex,y0+er+1,'K');usF(x0+ex+1,y0+er+1,'E');usB(x0+ex,y0+er-1,-2);usB(x0+ex+1,y0+er-1,-2);usB(x0+ex-1,y0+er-1,-2);usB(x0+ex+2,y0+er-2,-1)}
    usF(x0+ex0+1,y0+er+4,'l');usF(x0+ex1,y0+er+4,'l');usF(x0+ex0+1,y0+er+3,'r');usF(x0+ex1,y0+er+3,'r');for(let x=ex0+2;x<ex1;x++)usF(x0+x,y0+er+4,'0');usF(x0+ex0+3,y0+er+4,'l');
    usF(x0+2,y0+er+2,'C');usF(x0+3,y0+er+3,'C');usF(x0+2,y0+er+3,'r');usB(x0+ex1-2,y0+er+2,-1);usB(x0+ex1-2,y0+er+1,-1)},
   capeFn:c=>{const cx=(c.x0+c.x1)>>1,y=c.ty+7;[[0,-3,'C'],[-1,-2,'C'],[1,-2,'C'],[-2,-1,'C'],[2,-1,'C'],[-3,0,'C'],[3,0,'C'],[-2,1,'C'],[2,1,'C'],[-1,2,'C'],[1,2,'C'],[0,3,'C'],[0,0,'y'],[0,-1,'E'],[0,1,'E'],[-1,0,'E'],[1,0,'E']].forEach(([a,j,k2])=>usF(cx+a,y+j,k2))},
   mid:c=>{if(c.lie)return;const y=c.ty;usPart();for(let x=c.x0+2;x<=c.x1-2;x+=3){usP(x,y-1,R.horn);usP(x,y-2,R.horn,1);usP(x+1,y-1,R.horn,-1)}},
   over:c=>{if(c.lie||c.v)return;const b=c.S.b,fc=c.x0+Math.round(b.tw*.6),y=c.ty,by=y+b.th-2;
    [[-1,6,'E'],[0,6,'y'],[1,6,'E'],[-1,7,'y'],[0,7,'r'],[1,7,'y'],[-1,8,'E'],[0,8,'y'],[1,8,'E'],[0,5,'K'],[0,9,'K'],[-2,7,'K'],[2,7,'K'],[-3,5,'E'],[-4,4,'K'],[3,9,'E'],[4,10,'K'],[-3,9,'K'],[3,5,'K'],[-5,3,'K'],[5,11,'K']].forEach(([a,j,k2])=>usF(fc-1+a,y+j,k2));
    usPart();for(const sx of[fc-5,fc-1,fc+3]){usRect(sx,by,sx+2,by+1,R.bone);usF(sx,by+1,'0');usF(sx+2,by+1,'0');usP(sx+1,by+2,R.bone,-1)}}});

  /* ---- the Shogunate (19-east.js): lacquered lamellar laced in colour, kabuto and jingasa, sashimono banners with the mon on their backs ---- */
  case'ashi':return set({b:B.human,skin:sk('fair'),hair:'topknot',hairR:hr('G'),armor:'lamellar',av:usArmorV('tatami'),hat:'jingasa',wd:usWdef('suyari'),sashR:R.red,back:c=>usSashi(c,R.white,'g',0)});
  case'ashiy':return set({b:B.human,skin:sk('fair'),hair:'topknot',hairR:hr('G'),armor:'lamellar',av:usArmorV('tatami'),hat:'jingasa',wd:usWdef('hankyu'),quiver:1,sashR:R.red,back:c=>usSashi(c,R.white,'g',0)});
  case'shinobi':return set({b:B.slim,skin:sk('fair'),armor:'padded',clothR:C('black'),legR:usRamp('013',0),hat:'hood',hatR:C('black'),mask:1,eye:'0',wd:usWdef('wakizashi'),sashR:R.red});
  case'sohei':return set({b:B.brute,skin:sk('tan'),armor:'robe',robeC:'white',av:usArmorV('kesa'),hat:'hood',hatR:C('white'),beads:'i',brow:1,wd:usWdef('naginata'),trim:R.gold});
  case'onna':return set({b:B.slim,skin:sk('pale'),hair:'long',hairR:hr('G'),armor:'lamellar',av:usArmorV('do'),hat:'hachigane',hatR:R.white,wd:usWdef('naginata'),sashR:R.white,odoR:R.red});
  case'samurai':return set({b:B.human,skin:sk('fair'),hair:'topknot',hairR:hr('G'),armor:'lamellar',av:usArmorV('domaru'),hat:'kabuto',odoR:R.gold,wd:usWdef('katana'),brow:1,sashR:R.white,back:c=>usSashi(c,R.blk,'c',1)});
  case'taisho':return set({b:B.knight,skin:sk('fair'),hair:'topknot',hairR:hr('G'),beard:'short',armor:'lamellar',av:usArmorV('oyoroi'),hat:'kawari',odoR:R.red,wd:usWdef('katana2'),cape:R.red,brow:1,sashR:R.gold,trimR:R.gold}); }
 return S}

/* ---- beasts ---- */
function usBeastPose(st,fr){const p={bx:0,by:0,hx:0,hy:0,lg:[0,0,0,0,0,0,0,0],jaw:0,low:0,lie:0,dead:0};   // lg: near front, near hind, far front, far hind (dx,lift)
 switch(st){
  case'idle':if(fr===1)p.low=1;break;
  case'walk':{const a=fr&3;if(a===0)p.lg=[2,0,-1,1,-1,1,2,0];else if(a===2)p.lg=[-1,1,2,0,2,0,-1,1];else p.by=-1;break}
  case'attack':if(fr===0){p.bx=-2;p.low=1;p.hy=1;p.lg=[1,0,1,0,1,0,1,0]}else if(fr===1){p.bx=4;p.by=-1;p.hx=1;p.jaw=1;p.lg=[3,3,-2,0,2,0,-2,0]}else{p.bx=1;p.lg=[1,0,-1,0,0,0,0,0]}break;
  case'cast':if(fr===1){p.hy=-2;p.jaw=1}else if(fr===2)p.hy=-1;break;
  case'hit':if(fr===0){p.bx=-2;p.hy=-1;p.hx=-1;p.lg=[-1,0,-1,0,-1,0,-1,0]}else{p.bx=-1;p.low=1}break;
  case'death':if(fr===0){p.bx=-2;p.hy=-2;p.hx=-1;p.jaw=1;p.lg=[-1,0,-1,0,-1,1,-1,0]}else if(fr===1){p.low=2;p.hy=2;p.dead=1}else{p.lie=1;p.dead=1}break}
 return p}
/* quadruped drawn from a back/belly profile (design coords, facing screen-right); v 0 front, 1 back three-quarter */
function usQuad(Q,v,mir,st,fr){const p=usBeastPose(st,fr),k=Q.big?2:1,n=Q.top.length,fur=Q.fur,lie=p.lie;
 let mb=-99;for(let c=0;c<n;c++)if(Q.bot[c]>mb)mb=Q.bot[c];
 const x0=Q.x0+(lie?0:p.bx*k),cr=p.low===1?k:p.low===2?(Q.ll>>1)+k:0,dy0=lie?-1-mb:p.by*k+cr;
 const sl=c=>lie?0:(c>=n*.55?(v?-k:k):0),T=c=>Q.top[c]+dy0+sl(c)+(lie&&Q.top[c]<mb-Q.flat?mb-Q.flat-Q.top[c]>>1:0),Bt=c=>Q.bot[c]+dy0+sl(c);
 const leg=(L,hind,dx,lift,far)=>{const xb=x0+L.x+(far?L.far:0),cc=Math.min(n-1,Math.max(0,L.x+(L.w>>1)+(far?L.far:0))),yTop=Bt(cc)-1,yEnd=-1-(far?k:0)-lift*k,m=Math.max(1,yEnd-yTop),bi=far?-1:0;usPart();
  for(let y=yTop;y<=yEnd;y++){const s=Math.round(dx*k*(y-yTop)/m),paw=y>yEnd-k;
   if(hind&&y<yTop+L.th){for(let x=xb;x<xb+L.w+k;x++)usP(x,y,fur,bi)}
   else{const xs=xb+(hind?-k:0)+s;for(let x=xs;x<xs+L.w+(paw?k:0);x++)usP(x,y,paw&&Q.paw?Q.paw:fur,bi);if(paw&&Q.claw&&y===yEnd){usF(xs+L.w+k-1,y,Q.claw);if(k>1)usF(xs+L.w-1,y,Q.claw)}}}};
 const liel=(L,far)=>{const xb=x0+L.x+(far?L.far:0);usPart();for(let i=0;i<Q.ll-1;i++)for(let c=0;c<L.w;c++)usP(xb+c+i,-1+(i>>1)+(far?0:1),i>=Q.ll-1-k&&Q.paw?Q.paw:fur,far?-1:0)};
 const tr=(f,ox,oy)=>{if(!f)return;usOX+=ox;usOY+=oy;f(v,p,fr,st);usOX-=ox;usOY-=oy},hox=x0-Q.x0+(lie?0:p.hx*k),hoy=dy0+sl(n-1)+(lie?Q.lieH:p.hy*k+(Q.hup||0));
 if(lie){liel(Q.fl,1);liel(Q.hl,1)}else{leg(Q.fl,0,p.lg[4],p.lg[5],1);leg(Q.hl,1,p.lg[6],p.lg[7],1)}
 if(v===0||lie)tr(Q.tail,x0-Q.x0,dy0+(lie?0:(Q.hup||0)));
 if(v===1&&!lie)tr(Q.head,hox,hoy);
 usPart();for(let c=0;c<n;c++){const t=T(c),b=Bt(c);for(let y=t;y<=b;y++)usP(x0+c,y,Q.under&&Q.under(c,y-t,b-y)?Q.ur:fur,Q.tex?Q.tex(c,y-dy0-sl(c)):0)}
 if(v===1&&!lie)tr(Q.tail,x0-Q.x0,dy0);
 if(lie){liel(Q.hl,0);liel(Q.fl,0)}else{leg(Q.hl,1,p.lg[2],p.lg[3],0);leg(Q.fl,0,p.lg[0],p.lg[1],0)}
 if(v===0||lie){const vv=v;if(lie){const f=Q.head;usOX+=hox;usOY+=hoy;f(0,p,fr,st);usOX-=hox;usOY-=hoy}else tr(Q.head,hox,hoy)}
 if(mir)usFlip(usG)}
const US_WOLF={x0:-9,ll:5,flat:5,lieH:3,fur:usRamp('Gopq',2),ur:usRamp('opqr',2),paw:usRamp('Gop',1),
 top:[-10,-11,-12,-12,-12,-12,-12,-12,-12,-12,-13,-13,-13,-13,-12,-11],bot:[-8,-7,-6,-6,-6,-7,-7,-7,-7,-7,-6,-5,-5,-5,-6,-7],
 hl:{x:1,w:2,th:2,far:3},fl:{x:11,w:2,far:3},
 under:(c,dt,db)=>c>=10&&db<=1,tex:(c,y)=>(y===-11&&c>2&&c<10&&(c&1))?-1:0,
 tail:(v,p)=>{const f=US_WOLF.fur;usPart();
  if(v===0||p.lie)[[-10,-10],[-10,-9],[-11,-9],[-11,-8],[-12,-8],[-12,-7],[-11,-7],[-12,-6],[-11,-10]].forEach(([x,y],i)=>usP(x,y,f,i>6?1:0));
  else[[-9,-9],[-8,-9],[-10,-8],[-9,-8],[-8,-8],[-11,-7],[-10,-7],[-9,-7],[-11,-6],[-10,-6],[-9,-6],[-12,-5],[-11,-5],[-10,-5],[-12,-4],[-11,-4]].forEach(([x,y],i)=>usP(x,y,f,i>10?1:0))},
 head:(v,p)=>{const f=US_WOLF.fur,u=US_WOLF.ur;usPart();
  if(v===0){usRect(3,-17,8,-12,f);usE(3,-17);usE(8,-17);usE(3,-12);
   usP(3,-13,u);usP(4,-13,u);usP(4,-12,u);usP(5,-12,u);
   usPart();usRect(8,-14,11,-12,u);usE(11,-12);usF(11,-14,'0');usB(9,-12,-1);usB(10,-12,-1);
   if(p.jaw){usRect(8,-11,10,-10,f,-1);usF(8,-11,'r');usF(10,-11,'r');usF(9,-11,'g')}
   usPart();usP(3,-18,f);usP(4,-18,f);usP(4,-19,f);usP(7,-18,f);usP(8,-18,f);usP(7,-19,f);usF(4,-18,'h');
   usF(5,-15,p.dead?'0':'y');usF(7,-15,p.dead?'0':'y');usB(5,-16,-1);usB(7,-16,-1);usB(6,-16,-1)}
  else{usRect(5,-17,10,-12,f);usE(5,-17);usE(10,-17);usPart();usP(11,-15,u);usP(12,-15,u);usF(13,-15,'0');usP(11,-14,u,-1);usP(12,-14,u,-1);if(p.jaw)usF(12,-13,'r');
   usPart();usP(5,-18,f);usP(5,-19,f);usP(6,-18,f);usP(10,-18,f);usP(10,-19,f);usP(9,-18,f);usB(7,-15,-1);usB(8,-14,-1)}}};
const US_BEAR={x0:-17,ll:7,big:1,flat:10,lieH:8,hup:-4,fur:usRamp('aijk',2),ur:usRamp('ijkm',2),paw:usRamp('aij',1),claw:'l',
 top:[-21,-23,-24,-25,-25,-25,-25,-25,-26,-26,-26,-26,-26,-26,-28,-28,-28,-28,-30,-30,-30,-30,-30,-30,-29,-29,-27,-25],
 bot:[-11,-9,-8,-8,-8,-8,-8,-8,-8,-9,-9,-9,-9,-9,-9,-9,-8,-8,-8,-8,-8,-8,-8,-8,-8,-9,-10,-12],
 hl:{x:2,w:5,th:4,far:5},fl:{x:18,w:5,far:5},
 under:(c,dt,db)=>c>=13&&dt>5&&db>=0&&((c+dt)%3!==0),
 tex:(c,y)=>c>=12?(((y%3+3)%3===0&&((c+(((y/3)|0)&1)*2)&3)===0)?-1:((y%3+3)%3===1&&((c+(((y/3)|0)&1)*2)&3)===2)?1:0):(((c*5+y*3)%9===0)?-1:0),
 tail:(v,p)=>{usPart();usP(-18,-16,US_BEAR.fur);usP(-18,-15,US_BEAR.fur);usP(-19,-15,US_BEAR.fur,-1)},
 head:(v,p)=>{const f=US_BEAR.fur,fc=usRamp('jkml',2),B=USR.brass,tx=(x,y)=>((x+y*2)%5===0)?-1:0;usPart();
  if(v===0){usRect(0,-33,12,-22,f,tx);[[0,-33],[1,-33],[0,-32],[12,-33],[11,-33],[12,-32],[0,-22],[12,-22],[0,-23],[12,-23],[1,-22],[11,-22]].forEach(([x,y])=>usE(x,y));
   usPart();usP(1,-34,f);usP(2,-34,f);usP(1,-35,f);usP(1,-36,f,1);usP(10,-34,f);usP(11,-34,f);usP(11,-35,f);usP(11,-36,f,1);
   usPart(1);usRect(2,-31,11,-24,fc);[[2,-31],[11,-31],[2,-24],[11,-24],[3,-24],[10,-24],[2,-25],[11,-25]].forEach(([x,y])=>usE(x,y));
   usP(2,-31,f);usP(11,-31,f);usP(2,-24,f);usP(11,-24,f);usP(3,-24,f);usP(10,-24,f);usP(2,-25,f);usP(11,-25,f);
   for(const ex of[3,8]){if(p.dead){usRect(ex,-29,ex+2,-29,'0')}else{usRect(ex,-30,ex+2,-28,'d');usP(ex+1,-29,'0');usP(ex+1,-28,'0');usP(ex,-30,'e');usP(ex+2,-28,'c')}}
   usB(6,-31,-2);usB(7,-31,-2);usB(6,-30,-1);usB(7,-30,-1);usB(5,-31,-1);usB(8,-31,-1);
   usPart();usP(6,-28,B,1);usP(7,-28,B);usP(6,-27,B);usP(7,-27,B,-1);usP(7,-26,B,-1);usP(6,-26,B,-1);if(p.jaw){usP(6,-25,'f');usP(7,-25,'g');usP(6,-24,B,-2);usP(7,-24,B,-2)}}
  else{usRect(0,-33,12,-23,f,tx);[[0,-33],[1,-33],[0,-32],[12,-33],[11,-33],[12,-32]].forEach(([x,y])=>usE(x,y));
   usPart();usP(1,-34,f);usP(2,-34,f);usP(1,-35,f);usP(1,-36,f,1);usP(10,-34,f);usP(11,-34,f);usP(11,-35,f);usP(11,-36,f,1);
   usPart();usP(13,-28,B);usP(13,-27,B,-1);usP(14,-27,B,-1)}}};
function usSpider(v,mir,st,fr){const p=usBeastPose(st,fr),b=usRamp('0Gop',1),lgR=usRamp('0Gop',2),dead=p.lie,bx=p.bx,by=dead?0:p.by+(p.low?1:0),up=st==='attack'&&fr===1;
 const ax=-4+bx,ay=(dead?-6:-9)+by,cxh=4+bx+p.hx,cyh=(dead?-4:(v?-10:-6))+by+(up?-1:0);
 // legs: 4 per side, knee above the body, foot on the ground
 const leg=(sx,sy,kx,ky,fx,fy,far)=>{usPart();const seg=(x0,y0,x1,y1)=>{const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);for(let i=0;i<=n;i++)usP(x0+Math.round((x1-x0)*i/n),y0+Math.round((y1-y0)*i/n),lgR,far?-1:0)};seg(sx,sy,kx,ky);seg(kx,ky,fx,fy);usB(kx,ky,1)};
 const ph=st==='walk'?fr&3:st==='idle'?0:0,cx0=2+bx,cy0=(v?-8:-5)+by;
 for(let pass=0;pass<2;pass++){const far=pass===0,s=far?-1:1,yo=(far?(v?2:-3):(v?-1:1));
  for(let i=0;i<4;i++){const lift=st==='walk'&&((i+pass+ph)&1)?1:0,sp=[-9,-4,3,9][i]+(st==='walk'?(((i+pass+ph)&1)?1:-1):0)+(up&&i>1?2:0);
   if(dead){const kx=cx0-3+i*2,ky=cy0-3-(far?1:0),fx=kx+(i<2?1:-1)+(far?1:0),fy=ky-3+(i&1);if(far)leg(cx0-1+i,cy0,kx,ky,fx,fy,far);else leg(cx0-1+i,cy0+1,kx+(i<2?-3:3),cy0-1,kx+(i<2?-2:2),cy0-4-(i&1),far);continue}
   const kx=cx0+Math.round(sp*.55),ky=cy0-4+(far?-1:0)+(v?(far?2:0):0)-((i===0||i===3)?0:1),fx=cx0+sp+(far?(v?-1:1):0),fy=-1-lift+(far?(v?0:-2):(v?-2:0));
   if(up&&i===3&&!far){leg(cx0+2,cy0,cx0+6,cy0-6,cx0+9,cy0-8,far);continue}
   leg(cx0-2+i+(i>1?1:0),cy0+(far?-1:0),kx,ky,fx,Math.min(-1,fy),far)}
  if(pass===0){// abdomen + head between far and near legs
   usPart();const R0=[[1,5],[0,6],[-1,7],[-1,7],[-1,7],[0,7],[1,6],[2,4]];R0.forEach((r,j)=>{for(let x=r[0];x<=r[1];x++)usP(ax-3+x,ay-3+j+(v?2:0),b,((x+j)%5===0)?1:0)});
   if(!dead){const mx=ax,my=ay-1+(v?2:0);if(v){usF(mx,my,'g');usF(mx+1,my+1,'g');usF(mx-1,my+1,'f');usF(mx,my+2,'g');usF(mx,my+1,'h')}else{usF(mx-1,my,'f');usF(mx,my,'g');usF(mx-1,my+1,'g')}}
   usPart();usRect(cxh-2,cyh-2,cxh+2,cyh+2,b);usE(cxh-2,cyh-2);usE(cxh+2,cyh-2);usE(cxh-2,cyh+2);usE(cxh+2,cyh+2);
   if(v===0&&!dead){usF(cxh,cyh-1,'g');usF(cxh+2,cyh-1,'g');usF(cxh+1,cyh,'h');usF(cxh-1,cyh,'f');usPart();usP(cxh+1,cyh+3,'l');usP(cxh+3,cyh+2,'l');if(p.jaw||up){usP(cxh+1,cyh+4,'l');usP(cxh+4,cyh+3,'l')}}
   else if(!dead){usPart();usP(cxh+3,cyh-1,'l');usP(cxh+2,cyh-3,'l')}}}
 if(mir)usFlip(usG)}

/* ---- cache + public API ---- */
function usEnKey(def){if(!US.en){US.en=new Map();for(const k in EN)US.en.set(EN[k],k)}let k=US.en.get(def);if(!k&&def&&def.n)for(const e in EN)if(EN[e].n===def.n){k=e;break}return k||null}
/* what the unit holds right now: H.w the weapon in hand, H.a the one stowed. Mercs: u.wid / u.alt (the rules' battle fields),
   else m.eq.w / m.eq.b. Enemies: '@main' (their own weapon) or def.side, swapped when the weapon in the rules is no longer the main one.
   During the first beat of a swap animation (anHandOv in 74-anim.js) the figure still shows what it held before. */
const US_H={w:null,a:null};
function usHand(u,o){o=o||US_H;let ov=null;try{if(typeof anHandOv==='function')ov=anHandOv(u)}catch(e){}if(ov){o.w=ov.w;o.a=ov.a;return o}
 if(u&&u.m&&u.m.eq){const e=u.m.eq;o.w=u.wid!==undefined?u.wid:e.w;o.a=u.alt!==undefined?u.alt:(e.b||null);return o}
 const d=u&&u.def;if(!d||!d.side){o.w='@main';o.a=null;return o}
 const base=(u.wpn0&&u.wpn0.wt)||(d.w&&ITEMS[d.w]&&ITEMS[d.w].wt)||(d.rng?'bow':'sword'),sw=!!(u.wpn&&u.wpn.wt&&u.wpn.wt!==base&&!d.spell);o.w=sw?d.side:'@main';o.a=sw?'@main':d.side;return o}
const usHK=x=>x==null?'-':typeof x==='object'?(x.wt||'?')+(x.two?'2':''):String(x);
function usLd(u){return u&&u.loaded===false?0:1}
function usLookKey(u){const H=usHand(u);if(u&&u.m&&u.m.eq){const m=u.m,e=m.eq;return'm:'+m.id+':'+m.name+':'+m.race+':'+m.bg+':'+usHK(H.w)+':'+usHK(H.a)+':'+(e.s||'')+':'+(e.a||'')+':'+(e.h||'')+':'+usShs(u)+':'+(typeof mercRes==='function'?mercRes(m)||'':'')+':'+usColSig(m)+':'+usLd(u)}
 if(u&&u.def)return'e:'+(usEnKey(u.def)||u.eid||'?')+':'+usShs(u)+':'+usHK(H.w)+':'+usHK(H.a)+':'+usLd(u);return'x:?'}
/* what the shield in hand looks like now: 0 whole, 1 cracked (half its hitpoints gone), 2 split (gone); 3 a merc whose shield the foes smashed */
function usShs(u){if(!u)return 0;if(u.shpMax>0)return!(u.shield||(u.slung&&u.shp>0))?2:u.shp<=u.shpMax*.5?1:0;return u.sund?2:0}
function usLook(u){let c=US.byUnit.get(u);const m=u.m,e=m&&m.eq,shs=usShs(u),H=usHand(u),hw=H.w,ha=H.a,cs=m?(typeof mercLook==='function'?mercLook(m):m.colors):null,ld=usLd(u);
 if(c&&c.shs===shs&&c.hw===hw&&c.ha===ha&&c.cs===cs&&c.ld===ld&&(!cs||c.sig===usColSig(m))&&(!e||(c.s===e.s&&c.a===e.a&&c.h===e.h)))return c.L;
 const key=usLookKey(u);let L=US.looks.get(key);
 if(!L){let S=null;try{S=u.m&&u.m.eq?usMercSpec(u.m,{w:hw,a:ha}):usEnemySpec(usEnKey(u.def)||u.eid,u)}catch(er){S=null}
  if(!S)S={kind:'hum',seed:1,b:US_BUILD.human,skin:usSkin(['s','t','u','i']),armor:'rags',wd:usWdef('fist')};
  if(u.def&&S.kind==='hum'){const main=S.wd;if(hw!=='@main'&&hw){S.wd=usWdef(usWpnOf(hw));S.quiver=S.quiver||main.cls==='bow'}if(ha)usSetAlt(S,ha==='@main'?main:ha)}   // an archer's sidearm: in hand once it has swapped, else at the belt
  if(u.def&&S.kind==='hum'&&u.shpMax>0&&!S.shield&&!(S.wd&&S.wd.two)){S.shield=u.shpMax>=60?'heater':'buckler';if(!S.shR)S.shR=usCloth(u.f==='bandit'?'night':'red')}   // an enemy type that carries a shield in the rules shows one
  if(shs===2){S.shield=null;S.slung=null}else if(shs===1&&S.shield)S.shCrack=1;
  const id=u.def?usEnKey(u.def)||u.eid:null;if(id==='wolf')S={kind:'quad',Q:US_WOLF};else if(id==='bear')S={kind:'quad',Q:US_BEAR,b:{big:1}};else if(id==='spider')S={kind:'spider'};
  const big=S.kind==='quad'?(S.Q.big?1:0):S.kind==='spider'?0:(S.b.big?1:0);
  L={key,S,big,fr:new Array(4*US_NF).fill(null)};US.looks.set(key,L);
  if(US.looks.size>160){const k0=US.looks.keys().next().value;US.looks.delete(k0)}}
 L.S.ld=ld;if(u&&typeof u==='object')US.byUnit.set(u,{L,hw,ha,s:e?e.s:0,a:e?e.a:0,h:e?e.h:0,shs,cs,ld,sig:cs?usColSig(m):''});return L}
function usBuild(L,face,st,fr){const t0=typeof performance!=='undefined'?performance.now():0,S=L.S,v=face>=2?1:0,mir=face===1||face===2,d=US_DIM[L.big];
 usBegin(L.big);usCrk=S.shCrack?1:0;
 try{if(S.kind==='quad')usQuad(S.Q,v,mir,st,fr);else if(S.kind==='spider')usSpider(v,mir,st,fr);else usHuman(S,v,mir,st,fr)}catch(e){if(typeof console!=='undefined'&&!US.err){US.err=1;console.error('unit sprite',L.key,st,fr,e)}}
 const cv=usResolve(usG,L.big||S.armor==='plate');let gl=null;if(S.famed&&st!=='death'){const Z=usG.Z,w=usG.w,a=[],on=i=>i>=0&&i<Z.length&&Z[i]&&usGL[Z[i]];for(let i=0;i<Z.length;i++)if(on(i)&&(!on(i-1)||!on(i+1)||!on(i-w)||!on(i+w)))a.push(i);if(a.length){a.sort((p,q)=>(p%w-((p/w)|0))-(q%w-((q/w)|0)));gl={a,w}}}
 US.builds++;if(t0)US.ms+=performance.now()-t0;return{cv,ax:d.ax,ay:d.ay,gl}}
/* famed gear glints: a gold highlight runs along the famed weapon / armor / shield every ~1.5 s (4 precomputed frames per sprite frame, built on demand); still under reduced motion */
function usRM(){try{if(typeof reduced!=='undefined'&&reduced)return true;if(typeof SET!=='undefined'&&SET&&SET.motion==='reduce')return true}catch(e){}return false}
const US_GLN=4,US_GLP=14,US_GLMS=110;
function usGlint(o){if(!o||!o.gl||!o.cv||usRM())return o;const t=typeof performance!=='undefined'?performance.now():Date.now(),ph=Math.floor(t/US_GLMS)%US_GLP;if(ph>=US_GLN)return o;const v=o.gv||(o.gv=[]);return v[ph]||(v[ph]=usGlintFrame(o,ph))}
function usGlintFrame(o,ph){const c=pxCanvas(o.cv.width,o.cv.height);if(!c)return o;const q=c.getContext('2d');q.drawImage(o.cv,0,0);let im;try{im=q.getImageData(0,0,c.width,c.height)}catch(e){return o}
 const d=im.data,A=o.gl.a,w=o.gl.w,dg=i=>i%w-((i/w)|0),d0=dg(A[0]),d1=dg(A[A.length-1]),mid=d0+(d1-d0)*(ph+.5)/US_GLN,rgb=US.rgb||(US.rgb=usRGB());
 for(const i of A){const k=Math.abs(dg(i)-mid);if(k>1)continue;const j=i*4;if(d[j+3]===0)continue;const cc=rgb[k<.75?'e':'d'];d[j]=cc[0];d[j+1]=cc[1];d[j+2]=cc[2]}q.putImageData(im,0,0);return{cv:c,ax:o.ax,ay:o.ay}}
function usMon(u,face,state,frame){if(!u||!u.def||u.m||typeof monsterSpritePx!=='function')return null;try{return monsterSpritePx(u,face,state,frame)||null}catch(e){return null}}   // monster art (76-monsters.js) draws its own enemies first
function unitSpritePx(u,face,state,frame){const M=usMon(u,face,state,frame);if(M)return M;const L=usLook(u),n=UNIT_FRAMES[state];if(!n){state='idle'}const nf=UNIT_FRAMES[state];
 face=((face|0)%4+4)%4;frame=((frame|0)%nf+nf)%nf;const i=face*US_NF+US_OFF[state]+frame;const o=L.fr[i]||(L.fr[i]=usBuild(L,face,state,frame));return o.gl?usGlint(o):o}
/* pre-build every frame of a unit (call at battle start); returns the number of frames built.
   Optional: until (a performance.now() deadline: stops before a build past it and sets US.cut), states (a subset of US_WARM). */
function unitSpriteWarm(u,faces,until,states){US.cut=0;if(usMon(u,0,'idle',0))return 0;const L=usLook(u);let n=0;for(let f=0;f<4;f++){if(faces&&faces.indexOf(f)<0)continue;for(const st of states||US_WARM)for(let k=0;k<UNIT_FRAMES[st];k++){const i=f*US_NF+US_OFF[st]+k;if(!L.fr[i]){if(until&&performance.now()>=until){US.cut=1;return n}L.fr[i]=usBuild(L,f,st,k);n++}}}return n}
function unitSpriteBox(u){if(u&&u.def&&!u.m&&typeof monsterSpriteBox==='function'){try{const b=monsterSpriteBox(u);if(b)return b}catch(e){}}const M=usMon(u,0,'idle',0);if(M&&M.cv)return M.box||{w:M.cv.width,h:Math.max(8,Math.min(M.cv.height,(M.ay|0)||M.cv.height)),mon:1};const L=usLook(u);return L.big?{w:40,h:48}:{w:24,h:32}}
/* crafted items draw their icon from the same painters as their sprite (06-icons.js icItemRows), replacing any stand-in registered earlier */
(function(){if(typeof ITEMS!=='object'||typeof ICONS!=='object'||typeof icItemRows!=='function')return;for(const id in ITEMS){if(!ITEMS[id].craft)continue;const n='it-'+id;let r=null;try{r=icItemRows(id)}catch(e){r=null}if(!r)continue;
 ICONS[n]=r;IC_MADE[n]='item';try{_pxCache.delete('ic:'+n+'@1');_pxCache.delete('u:ic:'+n+'@1');IC_MEMO.delete(n)}catch(e){}icCss(n)}})();
