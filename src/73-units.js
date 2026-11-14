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
let usG=null,usOX=0,usOY=0,usZ=0,usGrp=0;const usNC=new Uint8Array(256),usOL=new Uint8Array(256);
function usGrid(w,h){const n=w*h;return{w,h,R:new Array(n).fill(null),F:new Array(n).fill(null),Z:new Uint8Array(n),B:new Int8Array(n)}}
function usWipe(g){g.R.fill(null);g.F.fill(null);g.Z.fill(0);g.B.fill(0)}
function usBegin(big){let g=US.grid[big];const d=US_DIM[big];if(!g){g=US.grid[big]=usGrid(d.w,d.h);US.tmp[big]=usGrid(d.w,d.h)}usWipe(g);usG=g;usOX=d.ax;usOY=d.ay;usZ=0;usGrp=0;return g}
function usPart(nc){if(usZ<250)usZ++;usNC[usZ]=nc?1:0;usOL[usZ]=usGrp;return usZ}
function usI(x,y){x+=usOX;y+=usOY;return x<0||y<0||x>=usG.w||y>=usG.h?-1:y*usG.w+x}
function usP(x,y,r,b){const i=usI(x,y);if(i<0||!r)return;if(typeof r==='string'){usG.R[i]=null;usG.F[i]=r}else{usG.R[i]=r;usG.F[i]=null}usG.Z[i]=usZ;usG.B[i]=b|0}
function usF(x,y,k){const i=usI(x,y);if(i<0)return;if(!usG.Z[i])usG.Z[i]=usZ;usG.F[i]=k}                 // detail pixel, keeps the part beneath
function usB(x,y,d){const i=usI(x,y);if(i>=0&&usG.R[i])usG.B[i]+=d}
function usE(x,y){const i=usI(x,y);if(i<0)return;usG.R[i]=null;usG.F[i]=null;usG.Z[i]=0;usG.B[i]=0}
function usHas(x,y){const i=usI(x,y);return i>=0&&usG.Z[i]>0}
function usRect(x0,y0,x1,y1,r,b){const f=typeof b==='function';for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)usP(x,y,r,f?b(x,y):b)}
function usFlip(g){const w=g.w,R=g.R,F=g.F,Z=g.Z,B=g.B;for(let y=0;y<g.h;y++)for(let a=y*w,b=a+w-1;a<b;a++,b--){let t=R[a];R[a]=R[b];R[b]=t;t=F[a];F[a]=F[b];F[b]=t;t=Z[a];Z[a]=Z[b];Z[b]=t;t=B[a];B[a]=B[b];B[b]=t}}
function usRGB(){const o={};for(const k in PAL){const v=parseInt(PAL[k].slice(1),16);o[k]=[v>>16&255,v>>8&255,v&255]}return o}
/* shade + outline -> canvas */
function usResolve(g,deep){const w=g.w,h=g.h,cv=pxCanvas(w,h);if(!cv||!cv.getContext)return null;const q=cv.getContext('2d');if(!q||!q.createImageData)return null;
 const im=q.createImageData(w,h),d=im.data,R=g.R,F=g.F,Z=g.Z,B=g.B,rgb=US.rgb||(US.rgb=usRGB());
 for(let y=0,i=0;y<h;y++)for(let x=0;x<w;x++,i++){const z=Z[i];let k;
  if(z){k=F[i];const r=R[i];
   const zl=x>0?Z[i-1]:0,zu=y>0?Z[i-w]:0,zr=x<w-1?Z[i+1]:0,zd=y<h-1?Z[i+w]:0,og=usOL[z];
   if((zl>z&&usOL[zl]&&usOL[zl]!==og)||(zu>z&&usOL[zu]&&usOL[zu]!==og)||(zr>z&&usOL[zr]&&usOL[zr]!==og)||(zd>z&&usOL[zd]&&usOL[zd]!==og))k='0';
   else if(!k&&r){let e=0;
    if((zl>z&&!usNC[zl])||(zu>z&&!usNC[zu]))e=-1;
    else{const lit=zl<z||zu<z,dk=!zr||!zd;if(lit&&!dk)e=(!zl&&!zu)?2:1;else if(dk&&!lit)e=-1;
     else if(deep&&!lit&&!dk&&((x<w-2&&!Z[i+2])||(y<h-2&&!Z[i+2*w])))e=-1}
    let t=r.b+B[i]+e;const n=r.t.length;if(t<0)t=0;else if(t>=n)t=n-1;k=r.t[t]}}
  else if((x>0&&Z[i-1])||(x<w-1&&Z[i+1])||(y>0&&Z[i-w])||(y<h-1&&Z[i+w]))k='0';
  if(k){const c=rgb[k];if(c){const j=i*4;d[j]=c[0];d[j+1]=c[1];d[j+2]=c[2];d[j+3]=255}}}
 q.putImageData(im,0,0);return cv}

/* ---- ramps: tones dark -> light, b = resting tone ---- */
function usRamp(t,b){return{t,b:b==null?1:b}}
const USR={steel:usRamp('opqr',1),plate:usRamp('opqr',2),iron:usRamp('Gopq',1),brass:usRamp('abcde',2),wood:usRamp('aijk',2),dwood:usRamp('aij',1),
 leather:usRamp('aijk',2),dleather:usRamp('0aij',2),bone:usRamp('nmlr',2),void:usRamp('GGDC',1),voidl:usRamp('GDCr',1),rift:usRamp('GDCr',2),ice:usRamp('XxFr',2),
 hex:usRamp('BAe',1),fur:usRamp('aijk',1),white:usRamp('nmlr',2),red:usRamp('fgh',1),horn:usRamp('nmlr',1),dhorn:usRamp('Gop',1),ember:usRamp('KEy',1),
 mana:usRamp('XxF',1),aura:usRamp('Yyd',1),qi:usRamp('Zz6',1),chi:usRamp('BAe',1),string:usRamp('nml',1)};
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
function usColSig(m){const c=m&&m.colors;return c&&typeof c==='object'?(c.cloth||'')+'/'+(c.accent||'')+'/'+(c.metal||''):''}
function usLivery(S,m){const col=m&&m.colors;if(!col||typeof col!=='object')return;const cr=usDye(col.cloth),ar=usDye(col.accent),mf=usFin(col.metal);
 if(cr){S.clothR=cr;S.legR=usRamp(cr.t,0);if(S.hat==='hood')S.hatR=cr}
 if(ar){S.accR=ar;S.shR=ar;S.tabR=ar;S.sashR=ar;S.trim=ar;if(S.hat==='band'||S.hat==='feather')S.hatR=ar}
 if(mf)S.MR=Object.assign({},USR,mf)}
function usHairR(a){const k='h'+a.join('');let r=US_RC.get(k);if(!r){r=usRamp(a.join(''),1);US_RC.set(k,r)}return r}

/* ---- weapons: cells along an axis from the grip. [i, off, ramp, bias, group] ---- */
const USD={DL:[-1,1,0,0,0],U:[0,-1,0,0,0],UL2:[0,-1,-1,0,2],UR2:[0,-1,1,0,2],UL3:[0,-1,-1,0,3],UR3:[0,-1,1,0,3],UL:[-1,-1,0,0,0],UR:[1,-1,0,0,0],R:[1,0,0,0,0],RD2:[1,0,0,1,2],RU2:[1,0,0,-1,2],RD3:[1,0,0,1,3],RU3:[1,0,0,-1,3],RD:[1,1,0,0,0],L:[-1,0,0,0,0],D:[0,1,0,0,0]};
const US_W={};
function usWdef(id){let w=US_W[id];if(w)return w;const c=[],S=USR,add=(i0,i1,o0,o1,r,g,b)=>{for(let i=i0;i<=i1;i++)for(let o=o0;o<=o1;o++)c.push([i,o,r,b|0,g])};
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
  case'xbow':case'xbow:L':case'arbalest':case'arbalest:L':{const heavy=id[0]==='a',L=id.slice(-2)===':L',pw=heavy?5:4;
   add(-4,6,0,0,S.wood,0);add(-4,-2,1,1,S.wood,0);c.push([-4,0,heavy?S.iron:S.dwood,0,0],[1,1,S.iron,0,0]);if(heavy)c.push([-5,-1,S.iron,0,0],[-5,0,S.iron,0,0],[-5,1,S.brass,0,0],[-6,-1,S.brass,0,0]);
   for(let o=-pw;o<=pw;o++)c.push([7+(Math.abs(o)>=pw-1?-1:0),o,heavy?S.steel:S.dwood,Math.abs(o)===pw?-1:o<0?1:0,1]);c.push([8,0,S.iron,0,1]);
   if(L){for(let k=1;k<pw;k++){const ii=6-Math.round(k*4/pw);c.push([ii,-pw+k,'m',0,1],[ii,pw-k,'m',0,1])}c.push([2,0,'l',0,1]);add(2,8,-1,-1,S.wood,2);c.push([9,-1,S.plate,1,2],[2,-2,'g',0,2])}
   else for(let o=-pw+1;o<pw;o++)c.push([6,o,'m',0,1]);
   tip=L?9:8;two=1;h2=3;cls='xbow';break}
  case'pistol':c.push([-1,1,S.wood,0,0],[-1,2,S.wood,-1,0],[-2,2,S.brass,0,0],[0,0,S.wood,0,0],[0,1,S.wood,0,0],[0,-1,S.iron,1,1],[1,-1,S.brass,0,1]);add(1,6,0,0,S.iron,2);c.push([1,1,S.wood,-1,0],[7,0,S.brass,0,2]);tip=7;cls='gun';break;
  case'musket':add(-6,-1,0,1,S.wood,0);c.push([-6,0,S.brass,0,0],[-6,1,S.brass,-1,0],[-2,2,S.wood,-1,0],[0,-1,S.iron,1,1],[1,-1,S.brass,0,1]);add(0,15,0,0,S.iron,2);add(0,11,1,1,S.wood,0);c.push([5,1,S.brass,0,1],[10,1,S.brass,0,1],[16,0,S.brass,0,2]);tip=16;two=1;h2=6;cls='gun';break;
  default:cls='fist';tip=0}
 c.sort((a,b)=>a[4]-b[4]);return US_W[id]={id,c,cls,two,h2,tip,gem,bow:id==='warbow'?7:id==='shortbow'?5:0,reach:cls==='thrust'&&two||/great|zwei/.test(id)}}
function usAx(d,i,o){const k=d[4],m=k?Math.floor(i/k):0;o[0]=d[0]*i+d[2]*m;o[1]=d[1]*i+d[3]*m;return o}
const usT2=[0,0];
function usWeapon(W,gx,gy,d,sc,gemR,clip){const nx=d[0]===0?1:0,ny=d[0]===0?0:1;let g=-1;sc=sc||1;
 for(const c of W.c){if(c[4]!==g){g=c[4];usPart()}let r=c[2];if(r==='GEM')r=gemR||USR.ice;
  for(let a=0;a<sc;a++)for(let b=0;b<sc;b++){usAx(d,c[0]*sc+a,usT2);const x=gx+usT2[0]+nx*(c[1]*sc+b),y=gy+usT2[1]+ny*(c[1]*sc+b);if(clip&&y>-1)continue;usP(x,y,r,c[3])}}}
/* bow: limb curving toward +x, string behind it; st 0 rest, 1 drawn (to px,py), 2 loosed */
function usBow(n,gx,gy,st,px_,py_,s){const war=n>=7,wr=war?USR.dwood:USR.wood;usPart();s=s||1;
 const cur=k=>{const a=Math.abs(k);return(a<=n*.45?0:a<n-1?-1:-2)*s};
 if(st===1){for(const q of[-1,1]){const x0=gx-2,y0=gy+q*n,dx=px_-x0,dy=py_-y0,m=Math.max(Math.abs(dx),Math.abs(dy));for(let i=1;i<=m;i++)usP(x0+Math.round(dx*i/m),y0+Math.round(dy*i/m),'m')}
  for(let x=px_;x<=gx+2;x++)usP(x,py_,x>=gx+2?'q':x===px_?'l':'k')}
 else for(let k=-n+1;k<n;k++)usP(gx-2*s,gy+k,'m');
 usPart();for(let k=-n;k<=n;k++){usP(gx+cur(k),gy+k,wr);if(Math.abs(k)===n&&war)usP(gx+cur(k),gy+k,USR.brass)}
 usP(gx,gy,USR.leather)}
/* shields: centred on (cx,cy); inside = seen from behind the arm */
const US_SH={buckler:{y:-2,r:[[-1,1],[-2,2],[-2,2],[-2,2],[-1,1]]},kite:{y:-4,r:[[-2,1],[-3,2],[-3,2],[-3,2],[-3,2],[-3,2],[-2,1],[-2,1],[-1,0],[-1,0]]},
 heater:{y:-3,r:[[-3,3],[-3,3],[-3,3],[-3,3],[-3,3],[-2,2],[-1,1],[0,0]]},tower:{y:-4,r:[[-2,2],[-3,3],[-3,3],[-3,3],[-3,3],[-3,3],[-3,3],[-3,3],[-2,2]]},
 round:{y:-3,r:[[-1,1],[-2,2],[-3,3],[-3,3],[-3,3],[-2,2],[-1,1]]},spiked:{y:-3,r:[[-1,1],[-2,2],[-3,3],[-3,3],[-3,3],[-2,2],[-1,1]]}};
/* a shield's look: the item's `look`, else its id when that names a drawn shape */
function usShLook(id){const I=typeof ITEMS!=='undefined'&&ITEMS[id];const k=I&&I.look||id;return US_SH[k]?k:/tower|pavise/.test(k)?'tower':/spik/.test(k)?'spiked':/round|targe/.test(k)?'round':/kite/.test(k)?'kite':/heater/.test(k)?'heater':'buckler'}
let usCrk=0;                                                                                              // set per build: the shield in hand is past half its hitpoints
function usShCrack(type,cx,cy){const s=US_SH[type]||US_SH.buckler,n=s.r.length;usGrp=2;usPart(1);usGrp=0;for(let j=0;j<n;j++){const r=s.r[j],x=cx+((j%3)===1?0:-1)+(j>n/2?1:0);if(x>=cx+r[0]&&x<=cx+r[1])usP(x,cy+s.y+j,'0')}
 const r0=s.r[0];usE(cx+r0[1],cy+s.y);if(n>4){usE(cx+r0[1],cy+s.y+1);usP(cx+s.r[n-2][0],cy+s.y+n-2,'0')}}
function usShield(type,cx,cy,col,inside){if(usCrk&&!inside){usCrk=0;usShield(type,cx,cy,col,inside);usCrk=1;usShCrack(type,cx,cy);return}const s=US_SH[type]||US_SH.buckler,f=inside?USR.wood:type==='buckler'?(col&&col.dye?col:USR.wood):col||usCloth('red');usGrp=2;usPart();usGrp=0;
 s.r.forEach((r,j)=>{for(let x=r[0];x<=r[1];x++)usP(cx+x,cy+s.y+j,f,inside?-1:0)});
 if(inside){usP(cx,cy-1,USR.dleather);usP(cx-1,cy-1,USR.dleather);usP(cx,cy+1,USR.dleather);usP(cx-1,cy+1,USR.dleather);return}
 if(type==='round'||type==='spiked'){const n=s.r.length,I=type==='spiked'?USR.iron:USR.dwood;s.r.forEach((r,j)=>{const y=cy+s.y+j;usP(cx+r[0],y,I,j>n/2?-1:0);usP(cx+r[1],y,I,-1);if(j===0||j===n-1)for(let x=r[0];x<=r[1];x++)usP(cx+x,y,I,j?-1:0)});
  if(type==='round'){usP(cx-1,cy-2,USR.white,0);usP(cx+1,cy+2,USR.white,-1)}
  usGrp=2;usPart();usGrp=0;usP(cx,cy,USR.steel,1);usP(cx-1,cy,USR.steel,0);usP(cx+1,cy,USR.steel,-1);usP(cx,cy-1,USR.steel,1);usP(cx,cy+1,USR.steel,-1);
  if(type==='spiked'){usP(cx,cy,'r');usPart();usP(cx,cy+s.y-1,USR.plate,1);usP(cx,cy+s.y+n,USR.plate,-1);usP(cx-4,cy,USR.plate,0);usP(cx+4,cy,USR.plate,-1)}return}
 if(type==='buckler'){usGrp=2;usPart();usGrp=0;usP(cx,cy,USR.brass);usP(cx-1,cy,USR.brass,-1);usP(cx,cy-1,USR.brass,1);usP(cx+1,cy,USR.brass,-1);usP(cx,cy+1,USR.brass,-1)}
 else if(type==='kite'){for(let j=0;j<10;j++){usP(cx-1,cy-4+j,USR.white,j>6?-1:0);if(j<8)usP(cx,cy-4+j,USR.white,-1)}usP(cx-1,cy-1,USR.brass);usP(cx,cy-1,USR.brass,-1)}
 else if(type==='heater'){for(let j=0;j<8;j++)usP(cx,cy-3+j,USR.white,j>4?-1:0);for(let x=-3;x<=3;x++)usP(cx+x,cy-1,USR.white,x>0?-1:0);usP(cx,cy-1,USR.brass)}
 else{for(let x=-2;x<=2;x++){usP(cx+x,cy-4,USR.brass,0);usP(cx+x,cy+4,USR.brass,-1)}usGrp=2;usPart();usGrp=0;usRect(cx-1,cy-1,cx+1,cy+1,USR.brass,(x,y)=>x===cx&&y===cy?1:-1);usP(cx,cy,USR.brass,1)}}

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
 if(S.slung){const cx=v?((x0+x1)>>1):x0-2,cy=ty+(S.slung==='buckler'?3:4);usShield(S.slung,cx,cy,S.shR||usCloth('red'),0)}
 if(cl==='bow'){const n=W.bow||5,xa=v?x0:x0-1,ya=ty-2-(n>5?1:0),xb=v?x1:x1+1,yb=by+2,m=Math.max(Math.abs(xb-xa),Math.abs(yb-ya));usPart();
  for(let i=0;i<=m;i++)usPC(xa+Math.round((xb-xa)*i/m)+1,ya+Math.round((yb-ya)*i/m)-1,'m');
  usPart();for(let i=0;i<=m;i++){const t=i/m,bg=Math.round(Math.sin(Math.PI*t)*1.6);usPC(xa+Math.round((xb-xa)*t)-bg,ya+Math.round((yb-ya)*t)+bg,n>5?USR.dwood:USR.wood,i===0||i===m?1:0)}
  if(n>5){usPC(xa,ya,USR.brass);usPC(xb,yb,USR.brass)}}
 else if(cl==='back'){const tip=W.tip,i0=Math.max(-3,tip-12);if(v)usWeaponSeg(W,x0+1,by+1,USD.UR2,i0,tip+1);else usWeaponSeg(W,x1,by+2,USD.UL2,i0,tip+1)}}
/* belt-mounted, drawn over the torso in both views */
function usStowHip(S,v,x0,x1,ty,th){const cl=S.altCls,by=ty+th-(th>=8?2:1),R=USR;if(!cl||cl==='bow'||cl==='back')return;usPart();
 if(cl==='belt'){const x=v?x0+2:x1-1;for(let j=1;j<=3;j++)usPC(x,by+j,R.dleather,j===3?-1:0);usPC(x,by+4,R.brass,-1);usPart();usPC(x,by,R.brass);usPC(x,by-1,R.dleather);usPC(x,by-2,R.brass,1);return}
 const hx=v?x0+1:x1;
 if(cl==='sword'){const n=S.alt.tip>8?7:S.alt.tip>6?6:5;for(let i=0;i<n;i++)usPC(hx-((i+1)>>1),by+1+i,R.dleather,i===n-1?-1:0);usPC(hx-((n+1)>>1),by+1+n,R.brass,-1);
  usPart();usPC(hx-1,by,R.brass);usPC(hx,by,R.brass);usPC(hx+1,by,R.brass,-1);usPC(hx+1,by-1,R.dleather);usPC(hx+2,by-2,R.brass,1);return}
 if(cl==='axe'){for(let i=0;i<5;i++)usPC(hx-(i>>1),by-1+i,R.wood,0);usPart();usPC(hx+1,by-2,R.plate,1);usPC(hx+1,by-1,R.plate,0);usPC(hx+2,by-2,R.plate,0);usPC(hx+2,by-1,R.plate,-1);usPC(hx+2,by,R.plate,-1);usPC(hx,by-2,R.plate,0);return}
 if(cl==='hammer'){for(let i=0;i<5;i++)usPC(hx-(i>>1),by-1+i,R.dwood,0);usPart();const y=by+4,pk=/pick/.test(S.alt.id||'');usPC(hx-4,y,R.steel,0);usPC(hx-3,y,R.steel,0);usPC(hx-2,y,R.iron,0);usPC(hx-1,y,R.iron,-1);usPC(hx,y,R.steel,-1);usPC(hx-2,y+1,R.iron,-1);usPC(hx-3,y+1,R.iron,-1);if(pk)usPC(hx+1,y+1,R.steel,-1);else usPC(hx,y+1,R.steel,-1);return}
 if(cl==='pistol'){const x=v?x0+1:x1;usPC(x,by-1,R.wood,1);usPC(x-1,by-1,R.brass,0);usPC(x,by,R.dleather,0);usPart();for(let j=1;j<=4;j++)usPC(x-(j>>2),by+j,R.dleather,j===4?-1:0);usPC(x-1,by+1,R.dleather,-1);usPC(x-1,by+5,R.iron,-1);return}
 if(cl==='mace'){const club=/club/.test(S.alt.id||'');for(let i=0;i<4;i++)usPC(hx-(i>>1),by-1+i,club?R.wood:R.dwood,0);usPart();const r=club?R.wood:R.steel,y=by+3;usPC(hx-2,y,r,0);usPC(hx-1,y,r,0);usPC(hx-2,y+1,r,-1);usPC(hx-1,y+1,r,-1);if(!club)usPC(hx-1,y+2,R.brass,-1);return}}

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
  case'bare':A={body:sk,up:1,hand:sk,leg:sk,boot:sk,skirt:0};break;
  case'fur':A={body:R.fur,up:.25,fore:sk,hand:sk,leg:lg,boot:R.dleather,skirt:2};break;
  case'void':A={body:R.void,up:1,hand:R.voidl,leg:R.void,boot:R.void,skirt:2,paul:R.voidl,joint:1};break;
  default:A={body:cl||C(S.ragC||'tan'),up:.2,fore:sk,hand:sk,leg:lg,boot:sk,skirt:1}}
 A.slv=A.slv||A.body;A.fore=A.fore||A.slv;if(S.b.bony){A.slv=A.fore=A.hand=A.leg=A.boot=R.bone;A.shin=null;A.skirt=Math.min(A.skirt,1)}
 if(S.Aov)Object.assign(A,S.Aov);return A}
function usTex(S){const a=S.armor;
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
   for(let x=x0-ex+sh;x<=x0+tw-1+ex+sh;x++){if(flo&&y>=y1-1&&((x*3+y)%3===0||(y===y1&&(x&1))))continue;usP(x,y,A.body,y===y1&&!flo?-1:0)}}
  if(!flo){const fc=v?x0+Math.round(tw*.4)-1:x0+Math.round(tw*.6);for(let y=y0;y<=y1;y++)usP(fc+(y-y0>(y1-y0)*.6?sw:0),y,S.trim||USR.brass)}
  return}
 const n=Math.min(A.skirt*(b.big?2:1),ll-2);
 for(let j=0;j<n;j++){const y=y0+j;for(let x=x0;x<=x0+tw-1;x++){if(S.armor==='rags'&&j===n-1&&((x+S.seed)%3===0))continue;usP(x,y,A.body,(tex?tex(x,y):0)+(j===n-1&&S.armor!=='plate'?-1:0))}}
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
 // livery: a tabard in the accent colour over mail, scale and plate
 if(S.tabR&&(a==='mail'||a==='scale'||a==='plate')&&!b.big){const t0=v?fc:fc-1,tr=S.tabR,y0=ty+(a==='plate'?1:2);for(let j=y0;j<th+ty;j++)for(let x=t0;x<=t0+1;x++)usP(x,j,tr,(x===t0+1)?-1:0);
  if(v===0&&tw>=8){usP(t0-1,y0,tr,0);usP(t0+2,y0,tr,-1)}}
 // belt or resource sash
 if(a!=='bare'&&!S.nobelt){const br=res||S.sashR||(a==='robe'?(S.trim||USR.brass):a==='rags'?USR.dwood:USR.dleather);for(let x=x0+tap(th-2);x<=x1-tap(th-2);x++){usP(x,by,br,0);if(k>1)usP(x,by+1,br,-1)}
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
function usHat(S,v,x0,y0,er){const t=S.hat;if(!t)return;const b=S.b,hw=b.hw,hh=b.hh,c=S.hatR||USR.leather,R=S.MR||USR,k=hw>=11?2:1;
 const dome=(r,rim)=>{for(let x=1;x<hw-1;x++)usP(x0+x,y0-1,r);for(let y=0;y<=rim;y++)for(let x=0;x<hw;x++)usP(x0+x,y0+y,r)};
 if(t==='hood'||t==='coif'){const r=t==='coif'?R.steel:c,tex=t==='coif'?((x,y)=>((x+y)&1)?0:-1):null,put=(x,y,bi)=>usP(x0+x,y0+y,r,(tex?tex(x,y):0)+(bi|0));usPart();
  for(let x=1;x<hw-1;x++)put(x,-1);
  for(let y=0;y<hh;y++){const s=usHeadShape(b,v,y);for(let x=s[0];x<hw-s[1];x++)if(v||y<3||x<2||(y<=3&&x===hw-1))put(x,y)}
  if(t==='hood'){for(let y=0;y<hh;y++)put(-1,y,-1);put(-2,1,-1);put(-2,2,-1);if(v){for(let y=0;y<hh;y++)put(hw,y)}}
  for(let x=v?0:-1;x<hw-(v?0:2);x++)put(x,hh,-1);if(v===0){put(hw-2,hh);put(hw-1,hh,-1)}
  if(S.mask&&v===0){usPart(1);for(let y=er+(b.eh||2);y<hh;y++){const s=usHeadShape(b,0,y);for(let x=2;x<hw-s[1];x++)usP(x0+x,y0+y,R.red)}}
  return}
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
 usHair(S,v,x0,y0);usBeard(S,v,x0,y0);usHat(S,v,x0,y0,er)}
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
 const drawW=()=>{if(P.drop)return;if(W.cls==='bow')usGrp=1;if(W.cls==='bow')usBow(W.bow,bowp.x,bowp.y,P.bow===1?1:0,oh.x+(aw>>1),oh.y,bows);
  else if(W.c.length){let wx=gx,wy=gy;if(P.W.sh){usAx(d,-P.W.sh*sc,usT2);wx+=usT2[0];wy+=usT2[1]}usWeapon(W,wx,wy,d,sc,S.res?USR[S.res]:S.gemR,st!=='death')}
  if(rodP){usPart();for(let y=rodP.y0;y<=rodP.y1;y++)usP(rodP.x,y,USR.steel,y===rodP.y0?1:0)}
  if(P.crank){usPart();const cx=oh.x+(aw>>1),cy=oh.y+aw;usP(cx,cy,USR.brass,1);usP(cx+(P.crank===2?1:-1),cy+(P.crank===3?-1:1),USR.iron)}
  usGrp=0};
 const drawWA=far=>usArm(S,A,shx(wslot),sy,wh.x,wh.y,far),drawOA=far=>usArm(S,A,shx(oslot),sy,oh.x,oh.y,far);
 const shc=()=>({x:oh.x+(aw>>1)+oOf(oslot)*(v?1:0)+(v?0:1),y:oh.y+(S.shield==='buckler'?0:-1)});
 const pauld=(s,far)=>{if(!A.paul)return;const x=shx(s),o=s==='L'?-1:1,bi=far?-1:0,cxp=x+(aw>>1),sp=S.spikeR||A.paul;usPart();
  if(b.big){for(let xx=x+1;xx<=x+aw-2;xx++)usP(xx,sy-3,A.paul,bi);for(let xx=x;xx<=x+aw-1;xx++)usP(xx,sy-2,A.paul,bi);usRect(x-1,sy-1,x+aw,sy+1,A.paul,bi);for(let xx=x-1;xx<=x+aw;xx++)usP(xx,sy+2,S.trimR||A.paul,bi-(S.trimR?0:1));
   if(S.spike){usPart();usP(cxp,sy-4,sp);usP(cxp-o,sy-4,sp,-1);usP(cxp,sy-5,sp);usP(cxp+o,sy-6,sp,1);usP(cxp,sy-6,sp);usP(cxp+o,sy-7,sp,1)}}
  else{for(let xx=x;xx<=x+aw-1;xx++)usP(xx,sy-1,A.paul,bi);for(let xx=x-(far?0:1);xx<=x+aw-(far?1:0);xx++)usP(xx,sy,A.paul,bi);if(S.spike){usP(cxp+(aw&1?0:(o<0?-1:0)),sy-2,sp,1);usP(cxp+(aw&1?0:(o<0?-1:0))+o,sy-3,sp,1)}}};
 // ---- behind the body
 if(S.back)S.back(ctx);
 if(v===0&&!b.big&&(S.altCls==='bow'||S.altCls==='back'||S.slung))usStowBack(S,0,x0,x1,ty,th);
 if(S.cape&&v===0){usPart();const cr=S.cape;for(let y=ty+2;y<=-3+(P.kneel?2:0);y++){const e=y>ty+th?1:0;for(let x=x0-e;x<=x1+e;x++)if(y<-3||((x+y)&1))usP(x,y,cr,-1)}}
 if(v===1&&S.shield){const c=shc();usShield(S.shield,c.x+(wFar?1:-1)*(S.shield==='buckler'?1:0),c.y,S.shR,1)}
 if(bowA&&v)drawW();
 if(wFar){if(!aimF){if(!bowA)drawW();drawWA(1)}pauld(wslot,1)}else{drawOA(1);pauld(oslot,1)}
 if(!S.float)usLegs(S,A,v,P,nearL);
 usTorso(S,A,v,P,x0,ty);usSkirt(S,A,v,P,x0,ty);
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
  if(P.face&&P.face.iris&&P.face.iris!=='0'&&race==='elf')S.eye='1';S.hat=P.hat||null;if(P.hatC)S.hatR=usCloth(P.hatC);if(P.gemC)S.gemC=P.gemC[0];if(P.beads)S.beads=P.beads[0];
  S.ragC=P.ragC;S.robeC=P.robeC;if(P.shC)S.shR=usCloth(P.shC)}
 S.armor=ITEMS[eq.a]?eq.a:'rags';if(!(typeof ptHelmsExist==='function'&&ptHelmsExist())){if(S.armor==='plate')S.hat='great';else if(S.armor==='scale')S.hat='nasal'}   // helmets are gear now (eq.h -> P.hat); without that rule the armor tier still picks one
 if(S.hat==='cap'&&ITEMS[eq.h])S.hatR=USR.leather;
 if(S.hat==='hood'||S.hat==='great'||S.hat==='kettle'||S.hat==='cap'||S.hat==='straw'||S.hat==='nasal'||S.hat==='coif'||S.hat==='barbute'){if(S.hair==='mohawk'||S.hair==='bun'||S.hair==='curly'||S.hair==='mane'||S.hair==='shaggy'||S.hair==='swept')S.hair='short'}
 const wid=H?H.w:eq.w,alt=H?H.a:(eq.b||null);S.wd=usWdef(usWpnOf(wid));
 const two=typeof wid==='string'&&ITEMS[wid]?!!ITEMS[wid].two:!!S.wd.two;
 if(ITEMS[eq.s]){if(two)S.slung=eq.s;else S.shield=eq.s;if(!S.shR)S.shR=usCloth('red')}
 usSetAlt(S,alt);
 S.res=typeof mercRes==='function'?mercRes(m):null;S.quiver=S.wd.cls==='bow'||S.altCls==='bow';
 if(S.shield||S.slung){const k=usShLook(eq.s);if(S.shield)S.shield=k;else S.slung=k}
 usLivery(S,m);return S}
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
 }
 return S}

/* ---- beasts ---- */
function usBeastPose(st,fr){const p={bx:0,by:0,hx:0,hy:0,lg:[0,0,0,0,0,0,0,0],jaw:0,low:0,lie:0,dead:0};   // lg: near front, near hind, far front, far hind (dx,lift)
 switch(st){
  case'idle':if(fr===1)p.low=1;break;
  case'walk':{const a=fr&3;if(a===0)p.lg=[2,0,-1,1,-1,1,2,0];else if(a===2)p.lg=[-1,1,2,0,2,0,-1,1];else p.by=-1;break}
  case'attack':if(fr===0){p.bx=-2;p.low=1;p.hy=1;p.lg=[1,0,1,0,1,0,1,0]}else if(fr===1){p.bx=4;p.by=-1;p.hx=1;p.jaw=1;p.lg=[3,3,-2,0,2,0,-2,0]}else{p.bx=1;p.lg=[1,0,-1,0,0,0,0,0]}break;
  case'cast':if(fr===1){p.hy=-2;p.jaw=1}else if(fr===2)p.hy=-1;break;
  case'reload':{P.lg=[1,0,0,0];P.O.on=null;if(cls==='xbow'){P.W.x=2;P.W.y=al;P.W.d=D.D;P.ub=fr===1?1:0;const C=[[1,al-5],[3,al-4],[2,al-3]][fr];P.O.x=C[0];P.O.y=C[1];P.crank=fr+1}
   else if(cls==='gun'){P.W.x=1;P.W.y=al-3;P.W.d=D.U;P.rod=fr;if(W.two)P.W.sh=8}
   else{P.W.x=1;P.W.y=al-2;P.W.d=D.U;P.O.y=al-3+fr}break}
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
function usLook(u){let c=US.byUnit.get(u);const m=u.m,e=m&&m.eq,shs=usShs(u),H=usHand(u),hw=H.w,ha=H.a,cs=m?m.colors:null,ld=usLd(u);
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
 const cv=usResolve(usG,L.big||S.armor==='plate');US.builds++;if(t0)US.ms+=performance.now()-t0;return{cv,ax:d.ax,ay:d.ay}}
function unitSpritePx(u,face,state,frame){const L=usLook(u),n=UNIT_FRAMES[state];if(!n){state='idle'}const nf=UNIT_FRAMES[state];
 face=((face|0)%4+4)%4;frame=((frame|0)%nf+nf)%nf;const i=face*US_NF+US_OFF[state]+frame;return L.fr[i]||(L.fr[i]=usBuild(L,face,state,frame))}
/* pre-build every frame of a unit (call at battle start); returns the number of frames built */
function unitSpriteWarm(u,faces){const L=usLook(u);let n=0;for(let f=0;f<4;f++){if(faces&&faces.indexOf(f)<0)continue;for(const st of US_WARM)for(let k=0;k<UNIT_FRAMES[st];k++){const i=f*US_NF+US_OFF[st]+k;if(!L.fr[i]){L.fr[i]=usBuild(L,f,st,k);n++}}}return n}
function unitSpriteBox(u){const L=usLook(u);return L.big?{w:40,h:48}:{w:24,h:32}}
