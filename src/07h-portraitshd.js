/* ================= HD PORTRAITS (64x64 busts painted at twice the art resolution) =================
   The 32x32 bust of 07-portraits.js is the layout: ptHDBust replays ptBust step by step, keeping every layer apart
   (backdrop, prop, torso, shield, weapon, head: skin, features, marks, hair, ears, beard, headgear, veil...), so the
   HD bust has exactly the same parts, colours and gear as the low one. Each layer is enlarged with an edge-aware
   scale2x (diagonals stay smooth, no blur), gets a 1 HD px outline instead of a 2 px one, and is repainted per
   material: the face is shaded on a 7-step skin ramp from a head-shaped normal (light from the upper left) and gets
   its eyes (lids, whites, iris, pupil, catch-light), brows, nose and mouth redrawn at HD; hair and beards get strands;
   mail rings, scales, plate bevels and specular streaks, cloth weave and folds, leather grain, fur, wood grain and
   brass glints are painted in HD pixels. Colours step along ramps with an ordered dither, never smoothed.
   Monster portraits (76-monsters.js monsterPortrait, 32x32 canvases) go through the same scale2x + material pass.
   Everything derives from the merc's hash (ptMercSpec) and pixel positions; the seeded game rnd() is never used.
   hdArt() false (Settings > Detail > Low) => portraitURL draws the old 32x32 busts (07-portraits.js). */
const PTHD={N:64,url:new Map(),max:400,ms:0,n:0};
/* ---- colours: Uint32 in canvas memory order (little-endian ABGR) ---- */
const PTHD_LE=new Uint8Array(new Uint32Array([1]).buffer)[0]===1;
function phP(r,g,b){r=r<0?0:r>255?255:r|0;g=g<0?0:g>255?255:g|0;b=b<0?0:b>255?255:b|0;return(PTHD_LE?(0xff000000|b<<16|g<<8|r):(r<<24|g<<16|b<<8|255))>>>0}
function phR(c){return PTHD_LE?c&255:c>>>24}function phG(c){return PTHD_LE?c>>8&255:c>>16&255}function phB(c){return PTHD_LE?c>>16&255:c>>8&255}
function phMix(a,b,t){return phP(phR(a)+(phR(b)-phR(a))*t,phG(a)+(phG(b)-phG(a))*t,phB(a)+(phB(b)-phB(a))*t)}
const PHK=new Map();   // PAL key -> colour
function phK(k){let c=PHK.get(k);if(c!==undefined)return c;const s=PAL[k];if(!s){PHK.set(k,0);return 0}const n=parseInt(s.slice(1),16);c=phP(n>>16,n>>8&255,n&255);PHK.set(k,c);return c}
function phLum(c){return phR(c)*.3+phG(c)*.55+phB(c)*.15}
/* one ramp step lighter (s>0, warm) or darker (s<0, cool); halves allowed */
const PHS=new Map(),PH_LT=phP(255,246,214),PH_DK=phP(10,14,34);
function phSh(c,s){if(!s||!c)return c;const id=c*16+((s*2)|0)+8;let o=PHS.get(id);if(o!==undefined)return o;
 o=s>0?phMix(c,PH_LT,Math.min(.85,.15*s)):phMix(c,PH_DK,Math.min(.9,.2*-s));PHS.set(id,o);return o}
const PH_BAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function phDi(v,X,Y){const i=Math.floor(v),f=v-i;return f<.44?i:f>.56?i+1:((X+Y)&1)?i+1:i}
function phDiB(v,X,Y){const i=Math.floor(v);return(v-i)*16>PH_BAY[(X&3)+(Y&3)*4]+.5?i+1:i}   // full ordered dither (metal gradients)
function phH(x,y,s){let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041))|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296}
/* ---- 32-grid helpers ---- */
const PH_STEEL={o:1,p:1,q:1,r:1},PH_BRASS={b:1,c:1,d:1,e:1},PH_WOOD={i:1,j:1,k:1,H:1};
function phGrid(L){const g=new Uint8Array(1024);for(let y=0;y<32;y++){const r=L[y];for(let x=0;x<32;x++){const k=r[x];if(k&&k!=='.'&&k!==' ')g[y*32+x]=k.charCodeAt(0)}}return g}
/* strip the 1 px '0' ring that ptOut added (a '0' touching empty); off-grid counts as filled, so a torso cut by the frame keeps its edge */
function phStrip(g){const o=g.slice(),E=(x,y)=>x>=0&&y>=0&&x<32&&y<32&&!g[y*32+x];for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=y*32+x;if(g[i]===48&&(E(x-1,y)||E(x+1,y)||E(x,y-1)||E(x,y+1)))o[i]=0}return o}
/* scale2x (EPX) on keys, tags carried with the chosen source */
function phS2x(k,t){const N=64,K=new Uint8Array(4096),T=new Uint8Array(4096),g=(x,y)=>x<0||y<0||x>31||y>31?0:k[y*32+x];
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=y*32+x,P=k[i],A=g(x,y-1),B=g(x+1,y),C=g(x-1,y),D=g(x,y+1),tp=t?t[i]:0,
   ti=(xx,yy)=>t?t[yy*32+xx]:0,o=y*2*N+x*2;
  let e0=P,e1=P,e2=P,e3=P,t0=tp,t1=tp,t2=tp,t3=tp;
  if(C===A&&C!==D&&A!==B){e0=A;t0=ti(x,y-1)}
  if(A===B&&A!==C&&B!==D){e1=B;t1=ti(x+1,y)}
  if(D===C&&D!==B&&C!==A){e2=C;t2=ti(x-1,y)}
  if(B===D&&B!==A&&D!==C){e3=D;t3=ti(x,y+1)}
  // never grow a layer into empty space on a lone corner: only the outer silhouette may change by scale2x when both sides agree
  K[o]=e0;K[o+1]=e1;K[o+N]=e2;K[o+N+1]=e3;T[o]=t0;T[o+1]=t1;T[o+N]=t2;T[o+N+1]=t3}
 return{K,T}}
/* ---- the bust, layer by layer (mirrors ptBust; the composite equals ptBust(P)) ---- */
function phSnap(L){return L.map(r=>r.slice())}
function phDiff(A,B){const o=ptL();for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(B[y][x]!==A[y][x])o[y][x]=B[y][x];return o}
const PHT={skin:1,feat:2,mark:3,hair:4,ears:5,beard:6,hat:7,veil:8,over:9,soot:10,hback:11};
function phCapture(P){const R=ptRng(P.seed||1),bg=P.bg||['3','2'],C=ptL(bg[0]);
 for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(x+y>38||y>=29)C[y][x]=bg[1];
 if(bg[2])for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(x+y<16)C[y][x]=bg[2];
 const c0=phSnap(C);if(P.under)P.under(C);const under=phDiff(c0,C);const c1=phSnap(C);if(P.prop)ptProp(C,P);const prop=phDiff(c1,C);
 const sh=ptShield(P),wp=ptWeapon(P),torso=P.liv?ptLivTorso(ptTorso(P),P):ptTorso(P);
 ptOver(C,torso);if(sh)ptOver(C,sh);if(wp)ptOver(C,wp);
 const hd=ptHead(P,R),L=hd.L,E=hd.E,tag=new Uint8Array(1024),mark=(A,t)=>{for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(L[y][x]!==A[y][x])tag[y*32+x]=t};
 // skin base vs features vs marks
 {const base=phSkinBase(P,E),nm=ptHead(Object.assign({},P,{marks:{}}),R).L;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const k=L[y][x];if(k==='.')continue;const i=y*32+x;tag[i]=k!==nm[y][x]?PHT.mark:k!==base[y][x]?PHT.feat:PHT.skin}}
 let s=phSnap(L);
 if(P.hairBack){P.hairBack(L,E);mark(s,PHT.hback);s=phSnap(L)}
 ptHair(L,P,E,R);mark(s,PHT.hair);s=phSnap(L);
 if((P.ears==='elf'&&P.hat!=='hood')||P.ears==='gob'){ptEars(L,P,E);mark(s,PHT.ears);s=phSnap(L)}
 ptBeard(L,P,E);mark(s,PHT.beard);s=phSnap(L);
 if(P.liv&&(P.liv.mt||P.liv.ac)&&P.hat){const B=L.map(r=>r.slice());ptHat(L,P,E);const mm=/coif|kettle|nasal|great|barbute|spangen|sallet|bascinet|armet/.test(P.hat)?ptLivMap(P.liv.mt):null,ac=P.liv.ac,pm=ac&&P.hat==='great'?{f:ac[0],g:ac[1],h:ac[2]}:null;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const k=L[y][x];if(k===B[y][x])continue;if(mm&&mm[k])L[y][x]=mm[k];else if(pm&&pm[k])L[y][x]=pm[k]}}
 else ptHat(L,P,E);
 if(P.famH&&P.hat){const ey=P.ey||14;for(let y=ey-3;y>=E.y0-6;y--){let n=0;for(let x=8;x<24;x++){const k=L[y]&&L[y][x];if(k&&k!=='.'&&k!==P.skin[0]&&k!==P.skin[1]&&k!==P.skin[2]&&!(P.hairC&&P.hairC.includes(k))){n++}}if(n>=8){for(let x=8;x<24;x++){const k=L[y][x];if(k!=='.'&&k!==P.skin[0]&&k!==P.skin[1])L[y][x]=x<16?'d':'c'}L[y][11]='e';break}}}
 mark(s,PHT.hat);s=phSnap(L);
 ptVeil(L,P,E);mark(s,PHT.veil);s=phSnap(L);
 if(P.marks&&P.marks.soot){ptSoot(L,P,E);mark(s,PHT.soot);s=phSnap(L)}
 if(P.over){P.over(L,E);mark(s,PHT.over)}
 const head=phSnap(L);ptOver(C,ptOut(L));
 const c2=phSnap(C);if(P.top)P.top(C,E);const top=phDiff(c2,C);
 let gem=null;if(P.gem){const g=PT_RESK[P.gem];if(g){const c3=phSnap(C);ptSt(C,PT_GEM,0,0,{a:g[0],b:g[1]});gem=phDiff(c3,C)}}
 return{rows:C.map(r=>r.join('')),bg,under,prop,torso,sh,wp,head,tag,E,top,gem}}
/* the bare head shape and ears (the first lines of ptHead), to tell features from skin */
function phSkinBase(P,E){const L=ptL(),sk=P.skin,h=P.head,n=h.w.length;
 for(let i=0;i<n;i++){const y=h.y+i,x0=E.X0(y),x1=E.X1(y);ptH(L,x0,x1,y,sk[0]);ptS(L,x1,y,sk[1]);ptS(L,x1-1,y,sk[1]);if(i>n/2-1)ptS(L,x1,y,sk[2]);if(i>=n-3){ptS(L,x1-2,y,sk[1]);ptS(L,x1-1,y,sk[2])}if(i===n-1){ptH(L,x0+1,x1,y,sk[1]);ptH(L,x1-2,x1,y,sk[2])}}
 if(P.ears!=='elf'&&P.ears!=='gob')ptEars(L,P,E);return L}
/* ---- HD canvas ---- */
function phBuf(){return new Uint32Array(4096)}
const PH_OL=phP(11,21,20);
/* paint one layer: K/T from phS2x; shade(i,X,Y,k,t) -> colour. Outline: 1 HD px ring outside the layer (4-neighbour) */
function phLay(D,K,T,shade,ol){const N=64;
 if(ol!==false)for(let Y=0;Y<N;Y++)for(let X=0;X<N;X++){const i=Y*N+X;if(K[i])continue;
  if((X>0&&K[i-1])||(X<N-1&&K[i+1])||(Y>0&&K[i-N])||(Y<N-1&&K[i+N]))D[i]=ol||PH_OL}
 for(let Y=0;Y<N;Y++)for(let X=0;X<N;X++){const i=Y*N+X,k=K[i];if(!k)continue;const c=shade(i,X,Y,k,T?T[i]:0);if(c)D[i]=c}}
/* metal families: 5 keys dark..light -> a 9-step ramp, a lookup set and a luminance -> ramp index map.
   Steel and brass always; a livery finish (ptLivMap) adds its own. A 32 dither / checker in a family becomes a gradient at HD. */
const PHF=new Map();
function phFam(keys){const id=keys.join('');let F=PHF.get(id);if(F)return F;const o=[],set={};for(const k of keys)set[k]=1;
 for(let i=0;i<4;i++){o.push(phK(keys[i]));o.push(phMix(phK(keys[i]),phK(keys[i+1]),.5))}o.push(phK(keys[4]));
 const a=phLum(phK(keys[0])),b=Math.max(a+1,phLum(phK(keys[4])));F={set,ramp:o,idx:l=>clamp((l-a)/(b-a)*8,0,8)};PHF.set(id,F);return F}
const PH_FST=phFam(['G','o','p','q','r']),PH_FBR=phFam(['a','b','c','d','e']);
function phLivFam(P){const mt=P&&P.liv&&P.liv.mt;if(!mt)return null;const ks=[mt[4]||mt[0],mt[0],mt[1],mt[2],mt[3]];return ks.every(k=>PAL[k])?phFam(ks):null}
function phTone(g,set){const T=new Float32Array(1024),lk=k=>phLum(phK(String.fromCharCode(k)));
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){let s=0,n=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const xx=x+i,yy=y+j;if(xx<0||yy<0||xx>31||yy>31)continue;const k=g[yy*32+xx];if(!k||!set[String.fromCharCode(k)])continue;const w=i||j?1:2;s+=lk(k)*w;n+=w}T[y*32+x]=n?s/n:-1}
 return(X,Y)=>{const x=clamp((X+.5)/2-.5,0,31),y=clamp((Y+.5)/2-.5,0,31),x0=x|0,y0=y|0,x1=Math.min(31,x0+1),y1=Math.min(31,y0+1),fx=x-x0,fy=y-y0,c=T[(Y>>1)*32+(X>>1)],
  q=(xx,yy)=>{const v=T[yy*32+xx];return v<0?c:v};return q(x0,y0)*(1-fx)*(1-fy)+q(x1,y0)*fx*(1-fy)+q(x0,y1)*(1-fx)*fy+q(x1,y1)*fx*fy}}
/* mail at 32: pixels in a checker of two keys of one metal family (coifs, mail shirts, mail tops, gilt scale), in patches of 10+ px,
   grown by one into the checker's edge. Returns family index + 1 per pixel. */
function phMail(g,fams){const M=new Uint8Array(1024),fo=i=>{const k=g[i];if(!k)return 0;const ch=String.fromCharCode(k);for(let f=0;f<fams.length;f++)if(fams[f].set[ch])return f+1;return 0};
 const F=new Uint8Array(1024);for(let i=0;i<1024;i++)F[i]=fo(i);
 for(let y=1;y<31;y++)for(let x=1;x<31;x++){const i=y*32+x,f=F[i];if(!f)continue;let d=0,s=0;for(const j of [i-1,i+1,i-32,i+32])if(F[j]===f&&g[j]!==g[i])d++;for(const j of [i-33,i-31,i+31,i+33])if(g[j]===g[i])s++;if(d>=3&&s>=2)M[i]=f}
 const C=new Uint8Array(1024);let tot=0;for(let y=1;y<31;y++)for(let x=1;x<31;x++){const i=y*32+x;if(!M[i])continue;let n=0;for(const j of [i-1,i+1,i-32,i+32,i-33,i-31,i+31,i+33])n+=M[j]?1:0;if(n>=2){C[i]=M[i];tot++}}
 if(tot<10)return null;
 const O=C.slice();for(let y=1;y<31;y++)for(let x=1;x<31;x++){const i=y*32+x;if(C[i]||!F[i])continue;let n=0;for(const j of [i-1,i+1,i-32,i+32,i-33,i-31,i+31,i+33])n+=C[j]===F[i]?1:0;if(n>=3)O[i]=F[i]}return O}
/* HD mail rings at 4x3 HD px (brick offset): lit top-left arc, dark lower-right arc, hollow centre */
function phRing(X,Y){const r=Y%3,c=(X+((Y/3|0)&1)*2)&3;if(r===0)return c===1||c===2?1.3:-.7;if(r===1)return c===0?.9:c===3?-1:c===1?-2.4:-1.6;return c===1||c===2?-1.4:-.5}
function phN1(x,seed){const i=Math.floor(x),f=x-i,u=f*f*(3-2*f),a=phH(i,0,seed),b=phH(i+1,0,seed);return a+(b-a)*u}
/* generic material shading for gear, headgear, clothes, props, monsters: bevel (lit rim up-left, shade rim down-right), grooves,
   mail rings, brushed and glinting metal, brass glints, wood grain (o.leather: grain specks), cloth folds (o.cloth) */
function phRuns(K){const N=64,A=new Uint8Array(4096),B=new Uint8Array(4096);for(let Y=0;Y<N;Y++){let X=0;while(X<N){if(!K[Y*N+X]){X++;continue}let e=X;while(e+1<N&&K[Y*N+e+1])e++;for(let x=X;x<=e;x++){A[Y*N+x]=X;B[Y*N+x]=e}X=e+1}}return{A,B}}
function phGen(K,seed,o,g){o=o||{};const N=64,lumK=k=>phLum(phK(String.fromCharCode(k))),FA=o.fam?[o.fam,PH_FST,PH_FBR]:[PH_FST,PH_FBR],ML=g?phMail(g,FA):null,TN=ML?FA.map(f=>phTone(g,f.set)):null,RU=phRuns(K);
 return(i,X,Y,k)=>{const ch=String.fromCharCode(k);let c=phK(ch);if(!c)return 0;if(ch==='0')return c;
  const up=Y>0?K[i-N]:0,lf=X>0?K[i-1]:0,dn=Y<N-1?K[i+N]:0,rt=X<N-1?K[i+1]:0,met=PH_STEEL[ch],br=PH_BRASS[ch],wd=PH_WOOD[ch];
  const mf=ML?ML[(Y>>1)*32+(X>>1)]:0;if(mf&&FA[mf-1].set[ch]){const F=FA[mf-1];let v=F.idx(TN[mf-1](X,Y))+phRing(X,Y);if(!up||up===48||!lf||lf===48)v+=1;else if(!rt||rt===48||!dn||dn===48)v-=1;return F.ramp[clamp(phDi(v,X,Y),0,8)]}
  let s=0;const L=lumK(k),eu=!up||up===48,el=!lf||lf===48,ed=!dn||dn===48,er=!rt||rt===48;
  if(eu||el)s+=met||br?1.5:1;
  else if(ed||er)s-=1;
  else{if(up!==k&&lumK(up)<L-30)s+=met||br?1:.5;else if(dn!==k&&lumK(dn)<L-30&&!met)s-=.5}
  if(met){const a=RU.A[i],b=RU.B[i],w=b-a;if(w>=6){const t=(X-a)/w;if(t>.14&&t<.3)s+=.5;else if(t>.8)s-=.5}if(o.brush&&phH(X>>2,Y,seed)<.1)s-=.5}
  else if(br){if(phH(X,Y,seed)<.07)s+=1.5}
  else if(wd&&o.leather){const f=phN1((X+Y*.2)/6,seed+11);if(f<.25)s-=.5;else if(f>.78)s+=.5;if(phH(X,Y,seed+5)<.015)s-=1}
  else if(wd){const q=phH(X,(Y+((phH(X,0,seed)*9)|0))>>2,seed+7);if(q<.22)s-=.5;else if(q>.9)s+=.5}
  else if(o.cloth){const f=phN1((X+Y*.25)/5.5,seed+13);if(f<.28)s-=.5;else if(f>.76)s+=.5;if(f>.45&&f<.52)s-=.5}
  return phSh(c,s)}}
/* ---- skin and face ---- */
function phSkinRamp(sk){const a=phK(sk[0]),b=phK(sk[1]),c=phK(sk[2]),d=phK(sk[3]||sk[2]);return[phMix(c,d,.45),c,phMix(c,b,.5),b,phMix(b,a,.5),a,phMix(a,PH_LT,.3)]}
/* head-shaped lighting at HD pixel X,Y: 0..6 on the skin ramp */
function phFaceL(P,E,X,Y){const h=P.head,n=h.w.length,x=(X+.5)/2,y=(Y+.5)/2,yy=clamp(Math.floor(y),h.y,h.y+n-1),w=h.w[yy-h.y]+.6,
  u=clamp((x-16)/w,-1.2,1.2),v=clamp((y-(h.y+n*.42))/(n*.62),-1,1.2),nx=u,ny=v*.55,nz=Math.sqrt(Math.max(0,1-Math.min(1,u*u)-ny*ny*.6));
 let d=nx*-.55+ny*-.4+nz*.73;return 2.75+d*3.1}
function phHead(D,P,cap){const N=64,g=phGrid(cap.head),{K,T}=phS2x(g,cap.tag),sk=P.skin,SR=phSkinRamp(sk),E=cap.E,seed=P.seed>>>0,hc=P.hairC||PT_HAIRC.H,bc=P.beardC||hc,
  isSkin=t=>t===PHT.skin||t===PHT.feat||t===PHT.ears,gen=phGen(K,seed,{cloth:1,fam:phLivFam(P)},g);
 const my2=((P.my||(P.ey||14)+5))*2,HR=c=>{const a=phK(c[0]),b=phK(c[1]),l=phK(c[2]);return[phMix(a,PH_DK,.35),a,phMix(a,b,.5),b,phMix(b,l,.5),l,phMix(l,PH_LT,.35)]},HRm=HR(hc),BRm=HR(bc);
 const hairIdx=(ch,c)=>ch===c[0]?1.4:ch===c[1]?3:ch===c[2]?4.8:-1;
 phLay(D,K,T,(i,X,Y,k,t)=>{const ch=String.fromCharCode(k);
  if(isSkin(t)||(t===PHT.mark&&(ch===sk[1]||ch===sk[2]))){
   let v=phFaceL(P,E,X,Y);if(t===PHT.ears){v=X<32?4.2:1.6;if(ch===sk[2]||ch===sk[3])v-=1.2}
   // contact shadow under hair / hat / beard
   for(let j=1;j<=3;j++){const q=i-j*N;if(q<0)break;const tq=T[q];if(tq===PHT.hair||tq===PHT.hat||tq===PHT.hback){v-=(4-j)*.45;break}if(K[q]&&!isSkin(tq))break}
   // jaw / chin shade: the bottom two HD rows of the head
   if(Y+1<N&&(!K[i+N]||!isSkin(T[i+N]))&&t!==PHT.ears&&Y>E.y0*2+10)v-=1;
   if(Y+2<N&&K[i+2*N]&&!isSkin(T[i+2*N])&&T[i+2*N]===PHT.beard)v-=.5;
   if(X>0&&!K[i-1])v+=.5;if(X<N-1&&!K[i+1])v-=.7;
   return SR[clamp(phDi(v,X,Y),0,6)]}
  if(t===PHT.hair||t===PHT.hback||t===PHT.beard){const R=t===PHT.beard?BRm:HRm,c=t===PHT.beard?bc:hc;let v=hairIdx(ch,c);if(v<0)return gen(i,X,Y,k);
   // strands: vertical dashes with a per-column phase, a sheen across the crown
   const bx=t===PHT.beard?32+(X-32)*(1-clamp((Y-my2)/40,0,.6)):X,cl=phN1(bx/2.2,seed+t),cl2=phN1(bx/1.1+3,seed+t+9);
   v+=(cl-.5)*1.5;if(cl2>.84&&v>2.4)v+=.8;else if(cl2<.14)v-=.7;
   if(Y>0&&(!K[i-N]||T[i-N]!==t)&&t!==PHT.beard)v+=.6;
   if(X<N-1&&!K[i+1])v-=.8;
   return R[clamp(phDi(v,X,Y),0,6)]}
  if(t===PHT.hat||t===PHT.veil)return gen(i,X,Y,k);
  return gen(i,X,Y,k)});
 phFace(D,P,E,K,T,SR);
 return{K,T}}
/* ---- the face at HD: brows, eyes, nose, mouth, freckles, stubble ---- */
function phFace(D,P,E,K,T,SR){const N=64,f=P.face||{},sk=P.skin,ey=(P.ey||14)*2,my=(P.my||(P.ey||14)+5)*2,
  sk1=sk[1].charCodeAt(0),sk2=sk[2].charCodeAt(0),ok=(X,Y)=>{if(X<0||Y<0||X>=N||Y>=N)return false;const i=Y*N+X,t=T[i];return K[i]&&(t===PHT.skin||t===PHT.feat||(t===PHT.mark&&(K[i]===sk1||K[i]===sk2)))},
  put=(X,Y,c)=>{if(c&&ok(X,Y))D[Y*N+X]=c},mir=(X,Y,c,c2)=>{put(X,Y,c);put(63-X,Y,c2===undefined?c:c2)},
  shade=(X,Y,s)=>{if(ok(X,Y))D[Y*N+X]=phSh(D[Y*N+X],s)},
  col=k=>typeof k==='number'?k:phK(k),lineC=phMix(phK(sk[3]||'0'),PH_DK,.25),midC=SR[2],
  bc=col(f.browC||sk[2]),bcD=phSh(bc,-1.2),bcL=phSh(bc,.7);
 // eye sockets: a soft shade over the upper lid, a crease under the brow
 const es=f.eye||0,bs=f.brow||0;
 // ---- brows (y = brow row of the 32 bust, HD rows 2by..2by+1)
 const by=ey-4;
 if(bs!==9){const B=[];   // [x (left eye side), y, thickness]
  if(bs===1)B.push([22,by+2,1],[23,by+1,1],[24,by,2],[25,by,2],[26,by,2],[27,by+1,2]);                    // arched
  else if(bs===2)B.push([21,by,1],[22,by,2],[23,by+1,2],[24,by+1,2],[25,by+2,2],[26,by+2,2],[27,by+3,1]);   // stern
  else if(bs===3)B.push([21,by-1,3],[22,by-2,4],[23,by-2,4],[24,by-2,4],[25,by-2,4],[26,by-1,3],[27,by,2]);  // heavy
  else if(bs===4)B.push([24,by+1,1],[25,by+1,1],[26,by+1,1],[27,by+1,1]);                                   // thin
  else if(bs===5){for(let X=19;X<=31;X++)B.push([X,by+(X<23?0:X<28?1:0),X>=22&&X<=28?3:2])}                 // ridge
  else B.push([22,by+1,1],[23,by,2],[24,by,2],[25,by,2],[26,by,2],[27,by+1,1]);                            // plain
  for(const [X,Y,th] of B)for(let j=0;j<th;j++){const c=j===0&&th>1?bcL:j===th-1?bcD:bc;mir(X,Y+j,c,j===0&&th>1?bc:j===th-1?bcD:bcD)}
  for(const [X,Y,th] of B)if(bs!==5){shade(X,Y+th,-.6);shade(63-X,Y+th,-.6)}}
 // ---- eyes: left eye spans HD x 22..27 (the 32 bust's 11..13), mirrored
 const ic=col(f.iris||'0'),icD=phSh(ic,-1.5),icL=phSh(ic,1.2),wh=col(f.white||'r'),whS=phMix(wh,SR[3],.45),pup=phMix(icD,PH_DK,.5),HL=phK('r');
 if(es===1){for(const X of [23,24,25,26]){mir(X,ey,X===23?lineC:icD);mir(X,ey-1,lineC)}mir(25,ey,ic)}            // narrow
 else if(es===3){for(let X=22;X<=27;X++)for(let Y=ey-2;Y<=ey+1;Y++)mir(X,Y,(X===22||X===27)&&(Y===ey-2||Y===ey+1)?undefined:Y===ey+1?whS:wh);   // big round (goblin)
  for(let X=23;X<=26;X++)mir(X,ey-3,lineC);mir(24,ey-1,ic);mir(25,ey-1,ic);mir(24,ey,icD);mir(25,ey,pup);mir(24,ey-1,HL,ic);mir(26,ey,ic,icD)}
 else if(es===4){for(let X=22;X<=27;X++){mir(X,ey,X===22||X===27?ic:icL);mir(X,ey+1,X===22||X===27?undefined:ic);mir(X,ey-1,X===22?undefined:icD)}mir(24,ey,HL);mir(25,ey,HL)}   // glowing
 else if(es===5){for(let X=21;X<=28;X++)for(let Y=ey-2;Y<=ey+3;Y++)mir(X,Y,(X===21||X===28)&&(Y===ey-2||Y===ey+3)?undefined:phK('0'));mir(24,ey,ic);mir(25,ey,ic);mir(24,ey+1,phSh(ic,-1));mir(25,ey+1,ic);mir(24,ey,phSh(ic,1.5))}   // sockets
 else if(es!==9){   // default: lid line, white, iris, pupil, catch-light (iris toward the nose, as the 32 bust)
  const lash=f.lash,lid=f.lid;
  for(let X=22;X<=27;X++)mir(X,ey-1,X===22&&!lash?undefined:lineC);
  if(lash){mir(21,ey-2,lineC);mir(22,ey-1,lineC);mir(21,ey-1,lineC)}
  if(lid){for(let X=23;X<=27;X++)mir(X,ey-2,phSh(SR[3],-.4))}
  mir(23,ey,whS);mir(24,ey,wh);mir(25,ey,ic);mir(26,ey,ic);mir(27,ey,phMix(ic,lineC,.5));
  mir(23,ey+1,undefined);mir(24,ey+1,whS);mir(25,ey+1,icD);mir(26,ey+1,pup);mir(27,ey+1,whS);
  mir(25,ey,HL,icL);   // catch-light (left eye bright, right eye softer)
  if(f.bags){for(let X=23;X<=27;X++)shade(X,ey+3,-1),shade(63-X,ey+3,-1.3)}
  else for(let X=23;X<=26;X++)shade(X,ey+2,-.4),shade(63-X,ey+2,-.6)}
 // ---- nose (32 bust: x 15..16, rows ey+1..ey+3)
 const ns=f.nose||0,ny=ey+2,nH=SR[6],nS=SR[2],nD=SR[1];
 if(ns===1){for(let Y=ny-2;Y<=ny+3;Y++){put(31,Y,Y<ny+2?nH:undefined);put(33,Y,nS)}put(30,ny+4,nS);put(31,ny+4,nD);put(32,ny+4,nS);put(33,ny+4,nD);put(34,ny+4,nS);put(30,ny+5,nS);put(33,ny+5,nS)}
 else if(ns===2){for(let Y=ny;Y<=ny+2;Y++){put(31,Y,nH);put(33,Y,nS)}for(let X=28;X<=35;X++)put(X,ny+4,X<=29||X>=34?nS:X===30||X===33?nD:SR[4]);put(29,ny+3,nS);put(34,ny+3,nS);put(31,ny+3,nH);for(let X=29;X<=34;X++)put(X,ny+5,SR[3])}
 else if(ns===3){const nc=P.noseC?phK(P.noseC):SR[4];for(let X=28;X<=35;X++)for(let Y=ny;Y<=ny+5;Y++){const dx=(X-31.5)/4.2,dy=(Y-ny-2.6)/3.2;if(dx*dx+dy*dy>1)continue;const v=dx*-.6+dy*-.5;put(X,Y,v>.35?nH:v>-.05?(P.noseC?nc:SR[5]):v>-.45?SR[3]:nS)}put(30,ny+5,nD);put(33,ny+5,nD);put(30,ny+1,phSh(nH,.5))}
 else if(ns===4){put(30,ny+2,lineC);put(30,ny+3,lineC);put(33,ny+2,lineC);put(33,ny+3,lineC);put(31,ny+1,SR[2]);put(32,ny+1,SR[2])}
 else if(ns===5){for(let Y=ny-2;Y<=ny+5;Y++){put(33,Y,nS);put(32,Y,Y<ny+4?SR[5]:nS)}for(let Y=ny;Y<=ny+6;Y++)put(31,Y,Y<ny+5?nH:nS);put(30,ny+5,nS);put(30,ny+6,nD);put(31,ny+7,nD);put(32,ny+6,nD)}
 else if(ns!==9){for(let Y=ny;Y<=ny+2;Y++){put(33,Y,nS)}put(31,ny+1,nH);put(31,ny+2,nH);put(30,ny+3,nS);put(31,ny+3,SR[4]);put(32,ny+3,nS);put(33,ny+3,nD);put(30,ny+4,undefined);put(31,ny+4,nS);put(32,ny+4,nS)}
 // ---- mouth (32 bust row my; HD rows 2my-1..2my+2)
 const ms=f.mouth||0,lc=f.lip?phMix(phK(f.lip),lineC,.3):phMix(SR[1],lineC,.35),lipL=f.lip?phMix(phK(f.lip),SR[5],.45):SR[3],lipU=f.lip?phMix(phK(f.lip),SR[4],.25):SR[3];
 const M=(x0,x1,dy)=>{for(let X=x0;X<=x1;X++)put(X,my+(dy||0),lc)};
 const lips=(x0,x1)=>{if(f.nolip)return;for(let X=x0+1;X<=x1-1;X++){put(X,my+1,X===x0+1||X===x1-1?phMix(lipL,SR[3],.5):lipL);put(X,my+2,SR[4])}put(x0+3,my+1,phSh(lipL,.8));if(f.lip)for(let X=x0+2;X<=x1-2;X++)put(X,my-1,lipU)};
 if(ms===1){M(30,33);lips(30,33)}
 else if(ms===2){M(26,37);put(26,my-1,lc);put(37,my-1,lc);lips(26,37)}
 else if(ms===3){M(28,34);put(35,my-1,lc);put(36,my-2,lc);lips(28,34)}
 else if(ms===4){M(28,35);put(27,my+1,lc);put(36,my+1,lc);lips(28,35)}
 else if(ms===5){const T2=phK('l'),T3=phK('m');for(let X=26;X<=37;X++){put(X,my-1,lineC);put(X,my,X===26||X===37?lineC:(X&1)?T3:T2);put(X,my+1,X===26||X===37?lineC:(X%3===0?T3:T2));put(X,my+2,lineC)}}
 else if(ms===6||ms===7||ms===8){const g=ms===7;for(let X=g?24:26;X<=(g?39:37);X++)put(X,my,phK(sk[3]));for(let X=27;X<=36;X++)put(X,my+1,SR[3]);
  const tusk=(X,h)=>{for(let j=0;j<h;j++){put(X,my-1-j,j===h-1?phK('r'):phK('l'));put(X+1,my-1-j,j>=h-2?phK('l'):phK('m'))}};
  if(ms===8){tusk(26,3);put(36,my,phK('m'))}else{tusk(g?24:26,g?6:3);tusk(g?38:36,g?6:3)}}
 else if(ms!==9){M(28,35);put(27,my+1,phMix(lc,SR[3],.5));put(36,my+1,phMix(lc,SR[3],.5));lips(28,35)}
 // ---- marks
 const mk=P.marks||{};
 if(mk.freckles)for(const [X,Y] of [[21,ey+5],[23,ey+6],[25,ey+5],[22,ey+7],[38,ey+5],[40,ey+6],[42,ey+5],[41,ey+7]])shade(X,Y,-1.2);
 if(mk.blush)for(let X=20;X<=26;X++)for(let Y=ey+5;Y<=ey+7;Y++)if(((X+Y)&1)||Y===ey+6){put(X,Y,phMix(D[Y*N+X],phK('h'),.45));put(63-X,Y,phMix(D[Y*N+(63-X)],phK('h'),.35))}
 if(mk.stubble)for(let Y=ey+5;Y<64;Y++)for(let X=16;X<48;X++){if(!ok(X,Y))continue;const inMouth=Y>=my-1&&Y<=my+2&&X>=27&&X<=36,jaw=Y>=my-3||X<22||X>41;if(inMouth||!jaw)continue;const q=phH(X,Y,P.seed);if(q<.3)shade(X,Y,q<.08?-1.2:-.6)}}
/* ---- torso: per armour material ---- */
function phTorso(D,P,cap){const g=phStrip(phGrid(cap.torso)),{K}=phS2x(g,null),N=64,seed=P.seed>>>0,a=P.armor,sk=P.skin||PT_SKIN.fair,
  metal=a==='mail'||a==='scale'||a==='plate'||a==='lamellar'||a==='coat',gen=phGen(K,seed,{cloth:!metal,leather:1,brush:a==='plate',fam:phLivFam(P)},g),SR=phSkinRamp(sk),
  FM=phLivFam(P)||PH_FST,tone=phTone(g,FM.set),ST=FM.ramp,stIdx=FM.idx;
 phLay(D,K,null,(i,X,Y,k)=>{const ch=String.fromCharCode(k);
  if(sk.includes(ch)&&ch!=='0'){   // neck / bare skin: a cylinder lit from the left
   const u=(X-32)/14;let v=4.6-u*2.2-(Y<46?0:.4);if(Y>0&&K[i-N]&&!sk.includes(String.fromCharCode(K[i-N])))v-=1;
   if(X<N-1&&!K[i+1])v-=.8;return SR[clamp(phDi(v,X,Y),0,6)]}
  if(metal&&FM.set[ch]&&ch!==FM_0(FM)&&(a==='mail'||a==='scale'||a==='lamellar')){let v=stIdx(tone(X,Y));
   if(a==='mail'){const r=Y%3,c=(X+((Y/3|0)&1)*2)&3;   // rings: lit top-left arc, dark bottom-right arc, hollow centre
    if(r===0)v+=c===1||c===2?1.4:-.6;else if(r===1)v+=c===0?1:c===3?-1:c===1?-2.2:-1.6;else v+=c===1||c===2?-1.4:-.4}
   else if(a==='scale'){const r=Y%4,c=(X+((Y>>2)&1)*3)%6;   // overlapping scales, a lit crown and a dark lower rim each
    if(r===3)v+=c===0||c===5?-2.5:-1.6;else if(r===0)v+=c===0||c===5?-1:1.2;else v+=c===0?-.8:c===5?-1.4:c<3?.6:0}
   else{const r=Y%3;v+=r===0?-1.8:((X>>1)&1)?.6:-.2}
   if(!K[i-N]||!K[i-1])v+=1;if(!K[i+1])v-=1;
   return ST[clamp(phDi(v,X,Y),0,8)]}
  if(a==='plate'&&FM.set[ch]){let c=gen(i,X,Y,k);   // a specular streak down the lit side of each plate
   const up=Y>0?K[i-N]:0;if(ch==='q'&&up===k&&((X+Y)%9===0))c=phSh(c,1);
   if((X===17||X===18)&&Y>48&&ch!=='o')c=phSh(c,X===17?1.6:.8);return c}
  if(a==='fur'&&!PH_STEEL[ch]){let c=phK(ch);const q=phH(X,Math.floor((Y+phH(X,2,seed)*7)/3),seed);return phSh(c,q<.25?-1:q>.85?1:0)}
  return gen(i,X,Y,k)});
 return K}
function FM_0(F){return F===PH_FST?'G':''}
/* ---- backdrop ---- */
function phBack(D,bg){const N=64,a=phK(bg[0]),b=phK(bg[1]),c=bg[2]?phK(bg[2]):0;
 for(let Y=0;Y<N;Y++)for(let X=0;X<N;X++){const x=X/2,y=Y/2;let col,s=0;
  if(c&&X+Y<31){col=c;s=(X+Y>27)?-.5:.5}
  else if(X+Y>77||Y>=58){col=b;s=(X+Y<81&&Y<58)||(Y>=58&&Y<60&&X+Y<=77)?.6:-((Y-40)/40)}
  else{col=a;s=.4-Y/48+(X+Y>70?-.3:0)}
  D[Y*N+X]=phSh(col,Math.round(s*2)/2)}}
/* a flat 32 overlay (frame, gem, under) drawn at 2x, keeping its lines */
function phFlat(D,L,bev){const N=64;for(let y=0;y<32;y++)for(let x=0;x<32;x++){const k=L[y][x];if(k==='.')continue;const c=phK(k);if(!c)continue;
 for(let j=0;j<2;j++)for(let i=0;i<2;i++){const X=x*2+i,Y=y*2+j;D[Y*N+X]=bev&&k!=='0'?phSh(c,(i===0&&j===0)?1:(i===1&&j===1)?-.5:0):c}}}
/* ---- bust ---- */
function phLayer(D,L,seed,o){if(!L)return;const g=phStrip(phGrid(L));let n=0;for(let i=0;i<1024;i++)if(g[i]){n=1;break}if(!n)return;const {K}=phS2x(g,null);phLay(D,K,null,phGen(K,seed,o,g))}
function phBust(P){const cap=phCapture(P),D=phBuf(),seed=P.seed>>>0;
 phBack(D,cap.bg);phFlat(D,cap.under);phLayer(D,cap.prop,seed+1);
 phTorso(D,P,cap);phLayer(D,cap.sh,seed+2);phLayer(D,cap.wp,seed+3,{brush:1});
 phHead(D,P,cap);phFlat(D,cap.top,1);if(cap.gem)phFlat(D,cap.gem,1);
 return{D,rows:cap.rows}}
/* monsters and beasts: one 32 image (backdrop + figure) -> scale2x + generic materials over an HD backdrop */
function phImage(rows,bg){const D=phBuf();phBack(D,bg);const fig=rows.map((r,y)=>r.split('').map((k,x)=>{const b=(x+y>38||y>=29)?bg[1]:bg[0];return k===b?'.':k}));
 const g=phStrip(phGrid(fig)),{K}=phS2x(g,null);phLay(D,K,null,phGen(K,7,{}));return D}
/* canvas (32x32, PAL colours) -> rows of PAL keys; null when it is not 32x32 or holds colours outside PAL */
function phRowsOfCanvas(cv){if(!cv||cv.width!==32||cv.height!==32||!cv.getContext)return null;let im=null;try{im=cv.getContext('2d').getImageData(0,0,32,32).data}catch(e){return null}
 const inv=new Map();for(const k in PAL){const n=parseInt(PAL[k].slice(1),16);if(!inv.has(n))inv.set(n,k)}
 const rows=[];for(let y=0;y<32;y++){let s='';for(let x=0;x<32;x++){const o=(y*32+x)*4;if(im[o+3]<128){s+='.';continue}const k=inv.get(im[o]<<16|im[o+1]<<8|im[o+2]);if(!k)return null;s+=k}rows.push(s)}return rows}
/* ---- encoding: indexed PNG when it fits (<=256 colours), else RGB; stored deflate like 05-pixel.js _pxPNG ---- */
function phPNG(D,W,H){if(typeof btoa!=='function')return'';const cols=[],seen=new Map(),idx=new Uint8Array(W*H);let ix=true;
 for(let i=0;i<W*H;i++){const v=D[i];let j=seen.get(v);if(j===undefined){j=cols.length;if(j>=256){ix=false;break}seen.set(v,j);cols.push(v)}idx[i]=j}
 const bd=ix?8:24,rb=ix?W:W*3,raw=new Uint8Array((rb+1)*H);
 for(let y=0;y<H;y++){const o=y*(rb+1)+1;if(ix)raw.set(idx.subarray(y*W,y*W+W),o);else for(let x=0;x<W;x++){const v=D[y*W+x];raw[o+x*3]=phR(v);raw[o+x*3+1]=phG(v);raw[o+x*3+2]=phB(v)}}
 if(!_pxCRC){_pxCRC=new Int32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;_pxCRC[i]=c}}
 const nb=Math.max(1,Math.ceil(raw.length/65535)),zl=2+5*nb+raw.length+4,np=ix?3*cols.length:0,B=new Uint8Array(8+25+(ix?12+np:0)+12+zl+12);let o=0;
 const u32=v=>{B[o++]=v>>>24&255;B[o++]=v>>>16&255;B[o++]=v>>>8&255;B[o++]=v&255};
 const head=(t,l)=>{u32(l);for(let i=0;i<4;i++)B[o++]=t.charCodeAt(i);return o-4};
 const crc=st=>{let c=-1;for(let i=st;i<o;i++)c=_pxCRC[(c^B[i])&255]^(c>>>8);u32(~c)};
 B.set([137,80,78,71,13,10,26,10]);o=8;
 let st=head('IHDR',13);u32(W);u32(H);B[o++]=8;B[o++]=ix?3:2;o+=3;crc(st);
 if(ix){st=head('PLTE',np);for(const v of cols){B[o++]=phR(v);B[o++]=phG(v);B[o++]=phB(v)}crc(st)}
 st=head('IDAT',zl);B[o++]=0x78;B[o++]=0x01;
 for(let k=0,p=0;k<nb;k++,p+=65535){const l=Math.min(65535,raw.length-p);B[o++]=k===nb-1?1:0;B[o++]=l&255;B[o++]=l>>8;B[o++]=~l&255;B[o++]=~l>>8&255;B.set(raw.subarray(p,p+l),o);o+=l}
 let a=1,b2=0;for(let i=0;i<raw.length;i++){a=(a+raw[i])%65521;b2=(b2+a)%65521}u32((b2<<16|a)>>>0);crc(st);
 st=head('IEND',0);crc(st);
 let bin='';for(let i=0;i<o;i+=8192)bin+=String.fromCharCode.apply(null,B.subarray(i,Math.min(o,i+8192)));return'data:image/png;base64,'+btoa(bin)}
/* ---- public: HD data URL for anything portraitURL takes ('' => use the low bust) ---- */
function ptHDURL(x){if(typeof document==='undefined')return'';let key=null;const mk=ptMonKey(x);
 try{key=mk?'mon:'+mk:ptKey(x)}catch(e){key=null}if(!key)return'';let u=PTHD.url.get(key);if(u!==undefined)return u;u='';const t0=typeof performance==='object'?performance.now():0;
 try{let D=null;
  if(mk){const cv=ptMon(x);const rows=phRowsOfCanvas(cv);if(rows){const b=rows[0][0],al=b==='3';D=phImage(rows,al?['3','2']:['f','1'])}}
  else if(key[0]==='m'){const m=x.m&&x.m.base?x.m:x;D=phBust(ptMercSpec(m)).D}
  else{const id=key.slice(2);if(PT_BEAST[id])D=phImage(ptEnemyRows(id,x&&x.f),['f','1']);else D=phEnemy(id,x&&x.f)}
  if(D)u=phPNG(D,64,64)}catch(e){u=''}
 if(PTHD.url.size>PTHD.max)PTHD.url.clear();PTHD.url.set(key,u);if(t0){PTHD.ms+=performance.now()-t0;PTHD.n++}return u}
/* humanoid foes: ptEnemyRows builds ptBust specs; replay it with ptBust swapped for the HD bust */
function phEnemy(id,f){let D=null;const B0=ptBust;try{ptBust=P=>{D=phBust(P).D;return B0(P)};ptEnemyRows(id,f)}finally{ptBust=B0}return D}
/* portraits on screen when Settings > Detail changes: portraitHTML notes which subject each URL shows (bounded), and the
   switch repaints every portrait <img> in the document in place, so screens that are not re-rendered still change */
const PTHD_SEEN=new Map();
function ptSeen(u,x){if(u&&x){if(PTHD_SEEN.size>600)PTHD_SEEN.clear();PTHD_SEEN.set(u,x)}return u}
function ptHDSwap(){if(typeof document==='undefined'||!document.querySelectorAll)return 0;let n=0;
 for(const im of document.querySelectorAll('.ptr img')){const x=PTHD_SEEN.get(im.getAttribute('src'));if(!x)continue;let u='';try{u=portraitURL(x)}catch(e){u=''}if(u&&u!==im.getAttribute('src')){ptSeen(u,x);im.setAttribute('src',u);n++}}return n}
onArtChange(()=>{PTHD.url.clear();ptHDSwap()});
