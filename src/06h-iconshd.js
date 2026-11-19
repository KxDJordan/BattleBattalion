/* ================= HD ICONS (Settings > Detail: High) =================
   Every icon in ICONS stays a 16x16 sprite in PAL keys (tests, composers and canvas users read those rows); this file paints a
   second, 32x32 drawing of each one and shows it in the same .pxi slot at the same CSS size, so layout never changes.
   Pipeline, per icon name, lazily the first time pxIcon() emits it (icHdUse):
     1. Scale2x on the PAL keys (edge-aware: diagonals become smooth staircases, never blurred)
     2. the 1px art outline (2 HD px after scaling) is thinned to 1 HD px on the outside, so lines are half as heavy
     3. colour passes in RGB: a midtone between every two tones of one ramp, a lit rim on the top-left and a shade rim on
        the bottom-right of every region, hue-shifted (warm lights, cool shadows), metal glints, gem facets, wood grain,
        cloth weave, and a selective outline (tinted by what it borders on the lit side)
   The HD rules live in their own <style> after the base sheet; Detail Low disables it, so the original icons show again
   with no re-render. ICONS rows replaced later (icCss) are repainted on the spot. iconHdCanvas(name) gives canvases the HD art. */
const ICHD={st:null,cv:null,done:new Map(),ms:0,n:0,lo:new Set(),boot:new Set(Object.keys(ICONS))};
/* material of each PAL key; R: ramp order (dark..light) used for midtones */
const ICHD_MAT={};
(function(){const M={O:'0',D:'1234',V:'7564',B:'abcde',R:'fgh',W:'ijk',L:'nml',S:'opqr',K:'uts',G:'wv',X:'XxF',Y:'Yy',Z:'Zz',A:'BA',C:'DC',E:'E',H:'GHIJK'};
 for(const m in M)for(const k of M[m])if(!ICHD_MAT[k])ICHD_MAT[k]=m})();
const ICHD_METAL={B:1,S:1},ICHD_GEM={X:1,Y:1,Z:1,A:1,C:1,E:1};
const IHD_RGB=new Map();
function ihdRGB(k){let c=IHD_RGB.get(k);if(c!==undefined)return c;const s=PAL[k];c=null;if(s){const n=parseInt(s.slice(1),16);c=[n>>16&255,n>>8&255,n&255]}IHD_RGB.set(k,c);return c}
const ihdLum=c=>c[0]*.3+c[1]*.59+c[2]*.11;
function ihdMix(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
const IHD_WARM=[255,246,214],IHD_COOL=[16,22,52],IHD_INK=ihdRGB('0')||[11,21,20];
const ihdLit=(c,t)=>ihdMix(c,IHD_WARM,t),ihdShd=(c,t)=>ihdMix(c,IHD_COOL,t);
function ihdHash(x,y,s){let h=(x*374761393+y*668265263+s*1442695041)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296}
/* ---- 1. Scale2x on keys ---- */
function ihdScale2x(rows){const h=rows.length,w=rows[0].length,W=w*2,H=h*2,K=new Array(W*H),src=new Array(W*H);
 const at=(x,y)=>{if(x<0||y<0||x>=w||y>=h)return'.';const k=rows[y][x];return k===' '||k===undefined||!PAL[k]?'.':k};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const P=at(x,y),A=at(x,y-1),B=at(x+1,y),C=at(x-1,y),D=at(x,y+1);let e0=P,e1=P,e2=P,e3=P;
  if(C===A&&C!==D&&A!==B)e0=A;if(A===B&&A!==C&&B!==D)e1=B;if(D===C&&D!==B&&C!==A)e2=C;if(B===D&&B!==A&&D!==C)e3=D;
  const i=2*y*W+2*x;K[i]=e0;K[i+1]=e1;K[i+W]=e2;K[i+W+1]=e3;src[i]=src[i+1]=src[i+W]=src[i+W+1]=P}
 return{W,H,K,src}}
/* ---- 2. thin the outer outline: an outline pixel that touches the outside but no colour goes ---- */
function ihdThin(G){const{W,H,K}=G,k=(x,y)=>x<0||y<0||x>=W||y>=H?'.':K[y*W+x],fill=q=>q!=='.'&&q!=='0',kill=[];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(K[y*W+x]!=='0')continue;let f=false,o=false;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const q=k(x+dx,y+dy);if(fill(q))f=true;else if(q==='.'&&(!dx||!dy))o=true}
  if(o&&!f)kill.push(y*W+x)}
 for(const i of kill)K[i]='.'}
/* connected regions of one material (4-neighbour) */
function ihdRegions(G){const{W,H,K}=G,lab=new Int32Array(W*H).fill(-1),R=[];
 for(let i=0;i<W*H;i++){const k=K[i];if(lab[i]>=0||k==='.'||k==='0')continue;const m=ICHD_MAT[k],st=[i],px=[];lab[i]=R.length;
  while(st.length){const j=st.pop();px.push(j);const x=j%W,y=(j/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=H)continue;const q=Y*W+X;
    if(lab[q]<0&&K[q]!=='.'&&K[q]!=='0'&&ICHD_MAT[K[q]]===m){lab[q]=R.length;st.push(q)}}}
  R.push({m,px})}
 return{lab,R}}
/* ---- 3. colour passes ---- */
function ihdPaint(rows){const G=ihdScale2x(rows);ihdThin(G);const{W,H,K}=G,N=W*H,col=new Array(N),out=new Array(N);
 for(let i=0;i<N;i++)col[i]=K[i]==='.'?null:ihdRGB(K[i]);
 const kk=(x,y)=>x<0||y<0||x>=W||y>=H?'.':K[y*W+x],mat=q=>q==='.'?'.':q==='0'?'0':ICHD_MAT[q];
 const{lab,R}=ihdRegions(G);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,k=K[i];if(k==='.'){out[i]=null;continue}let c=col[i];
  if(k==='0'){out[i]=c;continue}
  const m=ICHD_MAT[k],L=ihdLum(c);
  /* midtone: a corner pixel Scale2x moved across a colour boundary becomes the step between the two tones (inner anti-alias, still crisp) */
  let mid=null;const sk=G.src[i];if(sk!==k&&sk!=='.'&&sk!=='0'){const c2=ihdRGB(sk);if(c2)mid=ihdMix(c,c2,.5)}
  if(mid)c=mid;
  /* rims: light from the top-left. Against the outline / outside: strong; against another material: soft */
  const edge=(dx,dy)=>{const q=kk(x+dx,y+dy),mm=mat(q);return mm==='.'||mm==='0'?2:mm!==m?1:0};
  const up=edge(0,-1),lf=edge(-1,0),dn=edge(0,1),rt=edge(1,0),ul=edge(-1,-1),dr=edge(1,1);
  const lit=Math.max(up,lf),shd=Math.max(dn,rt);
  if(lit&&!shd)c=ihdLit(c,lit===2?.2:.07);else if(shd&&!lit)c=ihdShd(c,shd===2?.24:.09);
  else if(!lit&&!shd){if(ul===2)c=ihdLit(c,.08);else if(dr===2)c=ihdShd(c,.1);
   else{const up2=mat(kk(x,y-2)),lf2=mat(kk(x-2,y)),dn2=mat(kk(x,y+2)),rt2=mat(kk(x+2,y));if((up2==='0'||up2==='.'||lf2==='0'||lf2==='.')&&!(dn2==='0'||dn2==='.'||rt2==='0'||rt2==='.'))c=ihdLit(c,.07);else if((dn2==='0'||dn2==='.'||rt2==='0'||rt2==='.'))c=ihdShd(c,.07)}}
  out[i]=c}
 /* per-region detail */
 for(const r of R){const n=r.px.length;if(n<2)continue;let sx=0,sy=0;for(const j of r.px){sx+=j%W;sy+=(j/W)|0}const cx=sx/n,cy=sy/n;
  if(ICHD_GEM[r.m]&&n>=6){/* facets: the upper-left half catches light, a bright table and a glint */
   for(const j of r.px){const x=j%W,y=(j/W)|0,s=(x-cx)+(y-cy);if(s<-1.5)out[j]=ihdLit(out[j],.14);else if(s>1.5)out[j]=ihdShd(out[j],.16);else if(Math.abs((x-cx)-(y-cy))<.8&&n>=14)out[j]=ihdLit(out[j],.08)}}
  if(r.m==='W'&&n>=10){/* wood / leather grain along the long axis */
   let xx=0,yy=0,xy=0;for(const j of r.px){const dx=j%W-cx,dy=((j/W)|0)-cy;xx+=dx*dx;yy+=dy*dy;xy+=dx*dy}const a=.5*Math.atan2(2*xy,xx-yy),mx=-Math.sin(a),my=Math.cos(a);
   for(const j of r.px){const x=j%W,y=(j/W)|0,v=(x*mx+y*my)*.62+ihdHash(x>>2,y>>2,7)*.7,f=v-Math.floor(v);if(f<.22)out[j]=ihdShd(out[j],.16);else if(f>.9&&ihdHash(x,y,3)<.35)out[j]=ihdLit(out[j],.1)}}
  if((r.m==='R'||r.m==='L')&&n>=40){/* cloth / vellum: a faint weave */
   for(const j of r.px){const x=j%W,y=(j/W)|0;if(((x+y)&3)===0&&ihdHash(x,y,5)<.7)out[j]=ihdShd(out[j],.06)}}
  if(ICHD_METAL[r.m]||ICHD_GEM[r.m]){/* glint: the brightest pixel nearest the top-left goes near-white, a cross of light around it on big regions */
   let best=-1,bv=-1e9;for(const j of r.px){const x=j%W,y=(j/W)|0,v=ihdLum(out[j])-1.6*((x-cx)+(y-cy))*(n>30?.6:1);if(v>bv){bv=v;best=j}}
   if(best>=0&&n>=4){const x=best%W,y=(best/W)|0;out[best]=ihdMix(out[best],[255,255,250],.75);
    if(n>=24)for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const q=(y+dy)*W+x+dx;if(x+dx>=0&&x+dx<W&&y+dy>=0&&y+dy<H&&lab[q]===lab[best])out[q]=ihdLit(out[q],.3)}}
   if(ICHD_METAL[r.m]&&n>=40){/* long metal: a second, fainter highlight along the lit edge */
    for(const j of r.px){const x=j%W,y=(j/W)|0;if(x+y===Math.round(cx+cy)-3&&lab[j]===lab[best])out[j]=ihdLit(out[j],.12)}}}}
 /* selective outline: on the lit side the line takes a dark tone of what it borders; elsewhere it stays ink */
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(K[i]!=='0')continue;let f=null,side=0;
  for(const [dx,dy,s] of [[0,1,1],[1,0,1],[0,-1,0],[-1,0,0]]){const q=kk(x+dx,y+dy);if(q!=='.'&&q!=='0'){f=col[(y+dy)*W+x+dx];side=s;break}}
  const outside=kk(x-1,y)==='.'||kk(x+1,y)==='.'||kk(x,y-1)==='.'||kk(x,y+1)==='.';
  if(f&&side&&outside)out[i]=ihdMix(IHD_INK,ihdShd(f,.5),.24);else if(f&&outside)out[i]=ihdMix(IHD_INK,f,.1)}
 return{W,H,out}}
/* paint into a canvas; reuse: one shared scratch canvas (data URLs are taken straight off it) */
function ihdCanvas(P,reuse){if(typeof document==='undefined')return null;let c=reuse&&ICHD.cv;if(!c||c.width!==P.W||c.height!==P.H){c=pxCanvas(P.W,P.H);if(!c)return null;if(reuse)ICHD.cv=c}
 const g=c.getContext('2d');if(!g||!g.createImageData)return null;
 const im=g.createImageData(P.W,P.H),d=im.data;for(let i=0;i<P.out.length;i++){const c2=P.out[i];if(!c2)continue;d[i*4]=c2[0]<0?0:c2[0]>255?255:c2[0];d[i*4+1]=c2[1]<0?0:c2[1]>255?255:c2[1];d[i*4+2]=c2[2]<0?0:c2[2]>255?255:c2[2];d[i*4+3]=255}
 g.putImageData(im,0,0);return c}
function ihdArt(n,rows){return ihdPaint(rows)}
/* the HD canvas for an icon name (null when Detail is Low or there is no DOM): for code that draws icons on canvases */
const ICHD_CV=new Map();
function iconHdCanvas(name){if(!hdArt())return null;let n='none';try{n=icResolve(name)}catch(e){}const rows=Object.prototype.hasOwnProperty.call(ICONS,n)?ICONS[n]:null;if(!rows)return null;
 const h=ICHD_CV.get(n);if(h&&h.rows===rows)return h.c;let c=null;try{c=ihdCanvas(ihdArt(n,rows))}catch(e){c=null}ICHD_CV.set(n,{rows,c});return c}
function ihdURL(n,rows){const t0=typeof performance==='object'?performance.now():0;let u='';try{const c=ihdCanvas(ihdArt(n,rows),1);if(c)u=c.toDataURL()}catch(e){u=''}
 if(t0)ICHD.ms+=performance.now()-t0;ICHD.n++;return u}
function ihdSheet(){if(ICHD.st)return ICHD.st;if(typeof document==='undefined'||!document.head||!document.createElement)return null;
 const st=document.createElement('style');st.id='pxi-hd';document.head.appendChild(st);ICHD.st=st;st.disabled=!hdArt();return st}
/* called by pxIcon() for every icon it emits (and by icCss() with force when an icon's rows change) */
function icHdUse(n,force){if(typeof document==='undefined')return;
 if(!force&&!ICHD.lo.has(n)){ICHD.lo.add(n);if(!ICHD.boot.has(n)&&Object.prototype.hasOwnProperty.call(ICONS,n)){ICHD.lo.add(n);icCss(n)}}   // icons other files set without icCss() (crisis gear) get their 16 px rule too
 const hd=hdArt();if(ICHD.st&&ICHD.st.disabled===hd)ICHD.st.disabled=!hd;if(!hd)return;const rows=Object.prototype.hasOwnProperty.call(ICONS,n)?ICONS[n]:null;if(!rows||!Array.isArray(rows)||!rows.length)return;
 const pf=typeof pkHas==='function'&&pkHas(n)?PAINT[n]:null,mark=pf||rows;   // 06p-iconspaint.js: a painted icon wins over the HD pixel one (and is smoothed, not pixelated)
 const d=ICHD.done.get(n);if(d===mark||(force&&d===undefined))return;ICHD.done.set(n,mark);const st=ihdSheet();if(!st)return;
 const u=pf?pkURL(n):ihdURL(n,rows);if(!u||u.slice(0,5)!=='data:')return;const rule='.pxi-'+icCls(n)+'{background-image:url('+u+')'+(pf?';image-rendering:auto!important':'')+'}';
 try{st.sheet.insertRule(rule,st.sheet.cssRules.length)}catch(e){st.appendChild(document.createTextNode(rule))}}
/* Detail switch: Low hides the HD sheet; High shows it and paints every icon on screen that has no HD rule yet */
function ihdOnScreen(){if(typeof document==='undefined'||!document.querySelectorAll)return;const cls=new Map();for(const n in ICONS)cls.set('pxi-'+icCls(n),n);
 for(const el of document.querySelectorAll('.pxi'))for(const c of el.classList){const n=cls.get(c);if(n)icHdUse(n)}}
onArtChange(()=>{ICHD_CV.clear();const st=ihdSheet();if(!st)return;st.disabled=!hdArt();if(hdArt())ihdOnScreen()});
