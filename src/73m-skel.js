/* ================= SKELETAL ANIMATION (Detail High person figures; DragonBones-like, data in code) =================
   The parts-sheet figures of 73k-humans.js are a 2D skeleton animated in real time instead of baked frames:
   - Bones (canonical screen space of the view, sheet px "SU", feet at 0,0): root -> hip -> legA / legB (thigh+boot piece),
     hip -> torso (lean) -> shoulderW / shoulderO -> armW / armO (one-bone IK towards a hand target, with a little stretch)
     -> handW / handO; torso -> neck -> head (half the lean); handW -> weapon (world angle: inheritRotation off); handO ->
     shield / bow / off-hand weapon; torso -> back gear, hip gear; hip -> skirt; ground -> a dropped weapon. root carries the fall.
   - Slots draw attachments on bones in a draw order that depends on the view, on which arm is near (faces 1 and 3 are composed
     with the hand roles swapped, then mirrored, so everyone stays right-handed) and on the animation (shield front / back art,
     weapon dropped, bow string and arrow, spark). Attachments are images baked once per look: the part-sheet pieces of
     73q-parts2.js (p2Assets: head with hair / beard / helmet, torso with its surcoat, arms, hands, legs) and the vector gear
     (weapons, shields, bows, back gear) rendered at device resolution in their bone's local frame.
   - Animations (HUM_AN): keyframe tracks in body space (x forward) for the hand targets, weapon angle, lean, bob, legs, kneel and
     fall, plus stepped slot keys (grip, bow drawn, arrow, spark, drop, fire, rod, crank); per-segment easing (l linear, i in, o out,
     io in-out, or [x1,y1,x2,y2] cubic-bezier). idle and walk / flee loop; the rest run 0..1 over the state's duration taken from
     74-anim.js (unitPose: P.ph, P.cyc), the melee blow lands at AN_HIT_AT like the effects expect.
   - Runtime: humSkFrame(L,face,state,t) -> a display list (attachment + world matrix per slot, live vector callbacks); the board
     (70-render.js drawUnitPx) blits it each frame with setTransform + drawImage (humSkDraw); unitSpritePx still returns a baked
     canvas of a sampled pose for everything else (effects, tailor, tests). No rnd(). */
const HSK={frames:0,ms:0,bakes:0,bakeMs:0,draws:0,drawMs:0};
/* ---- easing ---- */
function hskBez(x1,y1,x2,y2,x){let a=0,b=1,t=x;for(let i=0;i<14;i++){t=(a+b)/2;const u=1-t,X=3*u*u*t*x1+3*u*t*t*x2+t*t*t;if(X<x)a=t;else b=t}const u=1-t;return 3*u*u*t*y1+3*u*t*t*y2+t*t*t}
function hskEase(e,u){if(!e||e==='l')return u;if(e==='i')return u*u;if(e==='o')return 1-(1-u)*(1-u);if(e==='io')return u*u*(3-2*u);if(Array.isArray(e))return hskBez(e[0],e[1],e[2],e[3],u);return u}
/* ---- animation data: [t, {fields}, ease to the next key]; fields override the class guard (w / o hand targets [x forward, y down]
   from their shoulder, wa weapon angle deg, lean deg, bob SU, lA / lB leg swing deg, uA / uB foot lift, kneel 0..1, fall 0..1,
   dw / do / dwa offsets to the guard; flags step: g grip, bd bow drawn, ar arrow, sp spark size, dr dropped, fi fire, rd rod, ck crank) ---- */
// rest poses (the guard every animation starts from and returns to): w the hand from its shoulder [forward, down], wa the weapon angle
// (0 forward, 90 down, -90 up, 180 back). One-handed weapons level and pointing forward; two-handers trailing down behind like dragged;
// spears, polearms and staves leaning back over the shoulder from a hand held forward
const HUM_GUARD={swing:{w:[30,70],wa:0},dagger:{w:[30,72],wa:0},two:{w:[-6,84],wa:145},thrust:{w:[30,16],wa:-118},staff:{w:[30,16],wa:-114},bow:{o:[24,78],w:[0,86]},gun:{w:[44,64],wa:-6,g:1},fist:{w:[6,86]},
 lgun:{w:[10,52],wa:-32,g:1},pgun:{w:[36,56],wa:14}};   // the gun backgrounds' fix: long guns at port arms (diagonal across the body, both hands on it), pistols held low and forward
const HUM_AN={
 idle:{loop:1,k:[[0,{},'io'],[.5,{bob:3,dw:[0,3],do:[0,3],dwa:-2},'io'],[1,{}]]},
 walk:{loop:1,k:[[0,{lA:16,lB:-14,uB:7,dw:[-12,0],do:[12,0],bob:1},'o'],[.25,{bob:-7,uA:0,uB:2},'i'],[.5,{lA:-14,uA:7,lB:16,dw:[12,0],do:[-12,0],bob:1},'o'],[.75,{bob:-7,uA:2},'i'],[1,{lA:16,lB:-14,uB:7,dw:[-12,0],do:[12,0],bob:1}]]},
 flee:{loop:1,k:[[0,{lA:22,lB:-20,uB:10,w:[-30,40],o:[-24,36],lean:-8,bob:1},'o'],[.25,{bob:-9,lean:-8,w:[-30,40],o:[-24,36]},'i'],[.5,{lA:-20,uA:10,lB:22,w:[-24,36],o:[-30,40],lean:-8,bob:1},'o'],[.75,{bob:-9,lean:-8,w:[-24,36],o:[-30,40]},'i'],[1,{lA:22,lB:-20,uB:10,w:[-30,40],o:[-24,36],lean:-8,bob:1}]]},
 swing:{k:[[0,{},'o'],[.24,{w:[-8,-62],wa:-132,lean:-8,lA:-6,lB:4,bob:3},[.6,0,1,.4]],[.38,{w:[84,44],wa:12,lean:10,lA:18,lB:-10},'o'],[.56,{w:[58,72],wa:50,lean:7,lA:14,lB:-8},'io'],[1,{}]]},
 two:{k:[[0,{g:1},'o'],[.26,{w:[-14,-78],wa:-138,lean:-10,lA:-8,lB:6,bob:4,g:1},[.7,0,1,.3]],[.38,{w:[88,26],wa:8,lean:12,lA:20,lB:-12,g:1},'o'],[.6,{w:[60,70],wa:58,lean:9,lA:16,lB:-10,bob:3,g:1},'io'],[1,{g:1}]]},
 thrust:{k:[[0,{},'o'],[.26,{w:[-36,54],wa:-8,lean:-7,lA:-6,lB:6},[.6,0,1,.5]],[.38,{w:[86,40],wa:-5,lean:12,lA:22,lB:-14},'o'],[.62,{w:[70,42],wa:-5,lean:9,lA:18,lB:-12},'io'],[1,{}]]},
 dagger:{k:[[0,{},'o'],[.26,{w:[-22,40],wa:-72,lean:-6},[.6,0,1,.5]],[.38,{w:[92,44],wa:-2,lean:11,lA:18,lB:-10},'o'],[.55,{w:[66,58],wa:16,lean:6},'io'],[1,{}]]},
 punch:{k:[[0,{},'o'],[.26,{w:[-26,60],lean:-6},[.6,0,1,.5]],[.38,{w:[98,12],lean:11,lA:18,lB:-10},'o'],[.55,{w:[60,40]},'io'],[1,{}]]},
 bash:{k:[[0,{},'o'],[.24,{o:[-10,40],lean:-8,lA:-6,lB:6},[.6,0,1,.5]],[.38,{o:[70,30],lean:14,lA:22,lB:-14},'o'],[.6,{o:[50,34],lean:8},'io'],[1,{}]]},
 staff:{k:[[0,{},'o'],[.24,{w:[-2,-60],wa:-112,lean:-6,bob:2},[.6,0,1,.4]],[.38,{w:[76,24],wa:-12,lean:9,lA:14,lB:-8},'o'],[.58,{w:[46,60],wa:30,lean:5},'io'],[1,{}]]},
 gun:{k:[[0,{},'io'],[.2,{w:[62,52],wa:-3,lA:6},'l'],[.36,{w:[62,52],wa:-3,lA:6},'l'],[.38,{w:[50,44],wa:-18,lean:-7,lA:6,fi:1},'o'],[.55,{w:[58,50],wa:-6,lean:-2,lA:6},'io'],[1,{}]]},
 // long guns (lgun: hand cannon to wall gun): raised to the shoulder and levelled, cheek to the stock (.2-.36), the shot kicks the muzzle up and the
 // body back (.38, fi: the flash), then down to port arms; pistols (pgun): the arm straight out at the foe, the recoil flips the barrel up
 lgun:{k:[[0,{},'io'],[.2,{w:[64,-6],wa:-3,lean:4,head:7,lA:7,lB:-4},'l'],[.36,{w:[64,-6],wa:-3,lean:4,head:7,lA:7,lB:-4},'l'],[.38,{w:[48,-12],wa:-15,lean:-6,head:3,lA:7,lB:-4,fi:1},'o'],
  [.55,{w:[58,-6],wa:-6,lean:0,head:5,lA:7,lB:-4},'io'],[1,{}]]},
 pgun:{k:[[0,{},'io'],[.2,{w:[88,8],wa:-2,lean:3,lA:6,lB:-3},'l'],[.36,{w:[88,8],wa:-2,lean:3,lA:6,lB:-3},'l'],[.38,{w:[76,-6],wa:-30,lean:-4,lA:6,lB:-3,fi:1},'o'],
  [.55,{w:[82,4],wa:-8,lean:1,lA:6,lB:-3},'io'],[1,{}]]},
 bow:{k:[[0,{},'o'],[.14,{o:[86,26],w:[92,22],ar:1,lA:8,lB:-4},'io'],[.34,{o:[86,26],w:[16,30],bd:1,ar:1,lean:-3,lA:8,lB:-4},'l'],[.4,{o:[86,26],w:[16,30],bd:1,ar:1,lean:-3,lA:8,lB:-4},'o'],[.44,{o:[88,24],w:[-8,40],lean:-1,lA:8,lB:-4},'io'],[.72,{o:[80,30],w:[-6,44],lA:6,lB:-3},'io'],[1,{}]]},
 cast:{k:[[0,{g:0},'io'],[.22,{w:[52,44],o:[30,40],wa:-80,sp:1,g:0},'io'],[.5,{w:[16,-84],o:[-6,-86],wa:-92,bob:-6,sp:3,g:0},[.6,0,1,.5]],[.66,{w:[88,-10],o:[62,24],wa:-52,lean:8,sp:2,lA:12,lB:-6,g:0},'io'],[1,{g:0}]]},
 hit:{k:[[0,{},'o'],[.22,{lean:-14,bob:3,dw:[-26,-12],do:[-22,-16],dwa:-26,lA:-8,lB:-6,head:-8},'io'],[1,{}]]},
 death:{k:[[0,{g:0},'o'],[.18,{lean:-22,bob:5,w:[-30,30],o:[-24,24],wa:-140,lA:-10,lB:-6,head:-10,g:0},'io'],[.5,{kneel:1,lean:16,w:[30,80],o:[34,80],wa:30,dr:1,head:12,g:0},'i'],[.82,{fall:1,dr:1,w:[4,88],o:[-4,88],g:0},'o'],[1,{fall:1,dr:1,w:[4,88],o:[-4,88],g:0}]]},
 swap:{k:[[0,{},'io'],[.3,{w:[-40,-36],wa:-150,lean:-3,g:0},'l'],[.62,{w:[-40,-36],wa:-150,lean:-3,g:0},'io'],[1,{}]]},
 reloadX:{k:[[0,{w:[26,84],wa:84,o:[18,34],g:0,ck:1},'io'],[.33,{w:[26,84],wa:84,o:[34,26],g:0,ck:2},'io'],[.66,{w:[26,84],wa:84,o:[26,44],g:0,ck:3},'io'],[1,{w:[26,84],wa:84,o:[18,34],g:0,ck:1}]]},
 reloadG:{k:[[0,{w:[26,82],wa:-86,o:[30,-30],g:0,rd:1},'io'],[.5,{w:[26,82],wa:-86,o:[30,-6],g:0,rd:1},'io'],[1,{w:[26,82],wa:-86,o:[30,-30],g:0,rd:1}]]},
 // reloading a long gun: muzzle up and forward, the butt at the hip, the off hand working the ramrod into the muzzle (rdo: how far the rod stands out of it);
 // a pistol: muzzle up before the chest, the same rod
 reloadL:{k:[[0,{w:[20,58],wa:-26,g:0,rd:1,rdo:50,head:-4},'io'],[.5,{w:[20,60],wa:-26,g:0,rd:1,rdo:4,head:-4},'io'],[1,{w:[20,58],wa:-26,g:0,rd:1,rdo:50,head:-4}]]},
 reloadP:{k:[[0,{w:[34,36],wa:-78,g:0,rd:1,rdo:44},'io'],[.5,{w:[34,38],wa:-78,g:0,rd:1,rdo:4},'io'],[1,{w:[34,36],wa:-78,g:0,rd:1,rdo:44}]]},
 reloadB:{k:[[0,{},'io'],[.4,{w:[-46,-30]},'io'],[.7,{w:[-40,-14]},'io'],[1,{}]]},
 reload:{k:[[0,{},'io'],[.5,{w:[14,82]},'io'],[1,{}]]},
 // throws (74-anim.js animThrow): wind-up with the weapon back over the shoulder and the off hand pointing at the foe, the arm whips over
 // the top and lets go at AN_THR_REL (.3: em, the hand empty from there), follows through across the body, then draws a fresh one from
 // the belt (throw) or over the shoulder (throwJ, javelins thrown point first); throwK keeps the weapon in hand (a conjured blade leaves it)
 throw:{k:[[0,{},[.4,0,.6,1]],[.17,{w:[-36,-34],wa:-160,o:[52,6],lean:-11,lA:-9,lB:8,bob:3,head:-4},[.5,0,.9,.6]],[.25,{w:[-2,-76],wa:-96,o:[40,22],lean:-1,lA:4,lB:0,bob:1},'l'],
  [.3,{w:[70,-62],wa:-36,o:[20,40],lean:11,lA:18,lB:-10,em:1},'o'],[.5,{w:[82,44],wa:40,o:[-8,56],lean:15,lA:22,lB:-12,bob:3,em:1},'io'],[.72,{w:[-8,84],wa:90,lean:4,lA:8,lB:-4,em:1},'io'],[.8,{w:[-8,82],wa:84,lean:3,lA:6,lB:-3},'io'],[1,{}]]},
 throwJ:{k:[[0,{},[.4,0,.6,1]],[.17,{w:[-50,-14],wa:-16,o:[56,8],lean:-13,lA:-9,lB:8,bob:3,head:-4},[.5,0,.9,.6]],[.3,{w:[68,-54],wa:-14,o:[24,36],lean:12,lA:18,lB:-10,em:1},'o'],
  [.5,{w:[84,40],wa:20,o:[-6,54],lean:15,lA:22,lB:-12,bob:3,em:1},'io'],[.72,{w:[-16,-24],wa:-118,lean:2,lA:6,lB:-3,em:1},'io'],[.8,{w:[-14,-20],wa:-118,lean:1},'io'],[1,{}]]}};
HUM_AN.throwK={k:HUM_AN.throw.k.map(k=>[k[0],Object.assign({},k[1],{em:0}),k[2]])};
const HUM_ATK={swing:'swing',two:'two',thrust:'thrust',dagger:'dagger',staff:'staff',gun:'gun',bow:'bow',fist:'punch',lgun:'lgun',pgun:'pgun'};
const HSK_NUM=['lean','bob','lA','lB','uA','uB','kneel','fall','head','wa','rdo'],HSK_FLG={g:'grip',bd:'bowD',ar:'arrow',sp:'spark',dr:'drop',fi:'fire',rd:'rod',ck:'crank',em:'empty'};
function hskName(state,cls,fam,va){if(state==='attack'){if(va&&HUM_AN[va])return va;return HUM_ATK[cls]||'swing'}if(state==='reload')return fam==='xbow'?'reloadX':cls==='lgun'?'reloadL':cls==='pgun'?'reloadP':cls==='gun'?'reloadG':cls==='bow'?'reloadB':'reload';
 return HUM_AN[state]?state:'idle'}
// the firearms' own poses: a long gun (family musket) 'lgun', a pistol 'pgun'; crossbows keep 'gun'
function hskGunCls(cls,fam){return cls==='gun'?fam==='musket'?'lgun':fam==='pistol'?'pgun':cls:cls}
const HSK_PSC=1.3;   // a pistol drawn this much bigger than its old sprite size, so it reads in the hand at battle size
// the muzzle in the weapon's own frame (SU, grip at 0,0, +x the barrel): the painted gun's (73l-wpnicons.js hwiDraw's flash) or the vector one's (humDrawW)
function hskMuzzleL(wi){const G=wi.hg,s=typeof HWI_SC==='number'?HWI_SC:6;if(wi.ic&&G&&typeof HWI_P==='object'&&HWI_P[wi.ic.f])return{x:G.b*s,y:(G.my||0)*s};return{x:Math.max(wi.len,wi.fam==='musket'?200:90),y:-1}}
// resolve a key against the guard: full numbers + flags
const HSK_RK=new WeakMap();
function hskKey(G,key,thrust2){const o={w:key.w?key.w.slice():[G.w[0]+((key.dw||[0,0])[0]),G.w[1]+((key.dw||[0,0])[1])],o:key.o?key.o.slice():[G.o[0]+((key.do||[0,0])[0]),G.o[1]+((key.do||[0,0])[1])]};
 for(const n of HSK_NUM)o[n]=key[n]!=null?key[n]:n==='wa'?G.wa:0;if(key.dwa)o.wa+=key.dwa;for(const f in HSK_FLG)o[HSK_FLG[f]]=key[f]!=null?key[f]:(f==='g'?G.grip:0);return o}
/* the pose at time t (0..1 of the state; loops wrap): the same fields humBuild's pose used, kneel / fall continuous */
function humAnimPose(cls,state,t,hs,va){cls=hskGunCls(cls,hs&&hs.fam);const gd=HUM_GUARD[cls]||HUM_GUARD.swing,G={w:gd.w||[6,86],o:gd.o||[-4,86],wa:gd.wa!=null?gd.wa:-62,grip:gd.g||(cls==='thrust'&&hs&&hs.two)?1:0};
 const nm=hskName(state,cls,hs&&hs.fam,va),A=HUM_AN[nm]||HUM_AN.idle,K=A.k;t=A.loop?((t%1)+1)%1:t<0?0:t>1?1:t;
 let i=0;while(i<K.length-2&&t>=K[i+1][0])i++;const k0=K[i],k1=K[i+1]||k0,span=k1[0]-k0[0],u=span>0?hskEase(k0[2],Math.min(1,Math.max(0,(t-k0[0])/span))):0;
 const a=hskKey(G,k0[1]),b=hskKey(G,k1[1]),L=(x,y)=>x+(y-x)*u,P={name:nm,w:[L(a.w[0],b.w[0]),L(a.w[1],b.w[1])],o:[L(a.o[0],b.o[0]),L(a.o[1],b.o[1])],oa:0};
 for(const n of HSK_NUM)P[n]=L(a[n],b[n]);P.lg=[P.lA,P.uA,P.lB,P.uB];for(const f in HSK_FLG){const n=HSK_FLG[f];P[n]=a[n]}
 if(nm==='bow'||nm==='gun'||nm==='lgun'||nm==='pgun'||nm==='cast')P.grip=nm==='gun'||nm==='lgun'?1:0;if(cls==='thrust'&&hs&&hs.two&&nm!=='cast'&&nm!=='death'&&nm!=='swap'&&state!=='reload')P.grip=1;
 if(state==='death'&&t>=.5)P.drop=1;return P}

/* ---- a transform recorder (the canvas API's save / translate / rotate / scale) that collects slots instead of drawing ---- */
function HskRec(){this.m=[1,0,0,1,0,0];this.st=[];this.list=[]}
HskRec.prototype.save=function(){this.st.push(this.m.slice())};HskRec.prototype.restore=function(){this.m=this.st.pop()||[1,0,0,1,0,0]};
HskRec.prototype.translate=function(x,y){const m=this.m;m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y};
HskRec.prototype.rotate=function(r){const m=this.m,c=Math.cos(r),s=Math.sin(r),a=m[0],b=m[1],cc=m[2],d=m[3];m[0]=a*c+cc*s;m[1]=b*c+d*s;m[2]=-a*s+cc*c;m[3]=-b*s+d*c};
HskRec.prototype.scale=function(x,y){const m=this.m;m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y};
HskRec.prototype.img=function(a,tag,al){if(a&&a.cv)this.list.push({a,m:this.m.slice(),tag:tag||'',al:al==null?1:al})};          // an attachment {cv,x,y,w,h} (local SU)
HskRec.prototype.fn=function(f,tag){this.list.push({f,m:this.m.slice(),tag:tag||''})};                      // live vector (bow string, spark, rod)
function hskMul(A,B){return[A[0]*B[0]+A[2]*B[1],A[1]*B[0]+A[3]*B[1],A[0]*B[2]+A[2]*B[3],A[1]*B[2]+A[3]*B[3],A[0]*B[4]+A[2]*B[5]+A[4],A[1]*B[4]+A[3]*B[5]+A[5]]}

/* ---- baking attachments: draw a piece of vector gear (local SU frame) into its own canvas at device resolution, cropped by alpha ---- */
const HSK_SCR={c:null};
function hskBake(K,ext,fn){const t0=performance.now(),x0=ext[0],y0=ext[1],w=ext[2]-ext[0],h=ext[3]-ext[1],W=Math.max(2,Math.ceil(w*K)),H=Math.max(2,Math.ceil(h*K));let c=HSK_SCR.c;if(!c)c=HSK_SCR.c=document.createElement('canvas');
 if(c.width<W||c.height<H){c.width=Math.max(c.width,W);c.height=Math.max(c.height,H)}const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.clearRect(0,0,W,H);g.imageSmoothingEnabled=true;try{g.imageSmoothingQuality='high'}catch(e){}
 g.setTransform(K,0,0,K,-x0*K,-y0*K);g.lineJoin='round';g.lineCap='round';humBBr();try{fn(g)}catch(e){if(!HSK.err){HSK.err=1;console.error('skeleton bake',e)}}
 g.setTransform(1,0,0,1,0,0);let d;try{d=g.getImageData(0,0,W,H).data}catch(e){return null}let a0=W,a1=-1,b0=H,b1=-1;
 for(let y=0;y<H;y++){const r=y*W*4;for(let x=0;x<W;x++)if(d[r+x*4+3]>2){if(x<a0)a0=x;if(x>a1)a1=x;if(y<b0)b0=y;b1=y}}
 HSK.bakes++;HSK.bakeMs+=performance.now()-t0;if(a1<0)return null;a0=Math.max(0,a0-1);b0=Math.max(0,b0-1);a1=Math.min(W-1,a1+1);b1=Math.min(H-1,b1+1);
 const cw=a1-a0+1,ch=b1-b0+1,cv=document.createElement('canvas');cv.width=cw;cv.height=ch;cv.getContext('2d').drawImage(c,a0,b0,cw,ch,0,0,cw,ch);
 return{cv,x:x0+a0/K,y:y0+b0/K,w:cw/K,h:ch/K}}
// a body piece canvas (atlas resolution, p2Piece) as an attachment with its pivot at the local origin
function hskPc(c,R){if(!c)return null;const hk=c.pk;return{cv:c,x:-R.px-1/hk+(c.ox||0),y:-R.py-1/hk+(c.oy||0),w:c.width/hk,h:c.height/hk}}

/* ---- per look x face x device scale: the rig constants and the baked attachments (lazily) ---- */
function humSkAssets(L,face,k){const c=L.skA||(L.skA={});const key=face+':'+k+':1';let A=c[key];if(A)return A;
 if(c.k!==k){for(const n in c)if(n!=='k')delete c[n];c.k=k}
 A=p2Assets(L,face,k);c[key]=A;return A}   // the user's part sheets (73q-parts2.js)
// a baked attachment of the look (cached by name)
function hskAtt(A,name,ext,fn){let a=A.bk.get(name);if(a!==undefined)return a;a=hskBake(A.K,ext,fn);A.bk.set(name,a);return a}
function hskTorsoAtt(A){const T=A.T;return hskAtt(A,'torso',[-260,-300,260,200],g=>{const pk=T.c.pk,R=T.R;g.drawImage(T.c,-R.px-1/pk+(T.c.ox||0),-R.py-1/pk+(T.c.oy||0),T.c.width/pk,T.c.height/pk)})}
function hskBackAtt(A){const S=A.S,back=A.back,shA=A.shA,shB=A.shB,sw0=A.sw0,UBy=A.UBy0;if(!(S.cape||S.slung||S.alt&&(S.altCls==='back'||S.altCls==='bow')||S.quiver||S.back&&/usSashi/.test(String(S.back))))return null;
 return hskAtt(A,'back',[-420,-560,420,420],g=>{const bx={x:sw0*10,y:-70};
  if(S.cape){const c=humLit(S.cape),y1=-40-UBy,y2=-18-UBy,P2=humP(q=>{q.moveTo(shA.x-6,shA.y-8);q.lineTo(shB.x+6,shB.y-8);q.quadraticCurveTo(shB.x+30,y1,shB.x+26,y2);q.quadraticCurveTo(0,-6-UBy,shA.x-26,y2);q.quadraticCurveTo(shA.x-30,y1,shA.x-6,shA.y-8);q.closePath()});humSh(g,P2,c,{dk:.25})}
  if(S.slung){g.save();g.translate(bx.x,bx.y);g.scale(.8,.8);humDrawShield(g,S.slung,S.shR,back,0);g.restore()}
  if(S.alt&&(S.altCls==='back'||S.altCls==='bow')){const oi=humWIc(S.alt,S.altI);g.save();g.translate(bx.x,bx.y+30);if(oi.fam==='bow'){g.rotate(-sw0*.45);g.scale(sw0*.9,.9)}else g.rotate(sw0*.7-Math.PI/2);if(oi.fam==='bow')humDrawBowAny(g,oi,0,0,null);else{g.translate(-oi.len*.35,0);humDrawWAny(g,oi,{})}g.restore()}
  if(S.back&&/usSashi/.test(String(S.back))){const fl=/R\.blk/.test(String(S.back))?'#2a2a34':'#efe9da';g.save();g.translate(sw0*30,-60);humInkLine(g,[0,40,0,-300],humLit(USR.dwood),7);
   const F=humP(p=>{p.moveTo(0,-290);p.lineTo(sw0*62,-290);p.lineTo(sw0*62,-150);p.lineTo(0,-150);p.closePath()});humSh(g,F,fl,{dk:.12});g.fillStyle=fl==='#2a2a34'?humHex('c'):humHex('g');g.beginPath();g.arc(sw0*31,-220,15,0,7);g.fill();g.restore()}
  if(S.quiver){g.save();g.translate(sw0*34,-120);g.rotate(-sw0*.45);humSh(g,humP(p=>humRR(p,-16,-20,32,96,10)),humLit(USR.leather),{dk:.25});for(let i=0;i<3;i++){humSh(g,humPoly([-12+i*10,-20,-6+i*10,-46,0+i*10,-20]),'#e8e2d4',{lw:4})}g.restore()}})}
function hskHipAtt(A){const S=A.S;if(!S.alt||S.altCls==='back'||S.altCls==='bow'||!S.altCls)return null;const oi=humWIc(S.alt,S.altI),so0=A.so0;
 return hskAtt(A,'hip',[-360,-200,360,420],g=>{g.save();g.translate(so0*24,-18);g.rotate(so0*.35+Math.PI/2);g.scale(.85,.85);humDrawWAny(g,oi,{});g.restore()})}
// weapon / bow / shield attachments do not depend on the face: shared by the look at this scale (A0: face 0's asset record)
function hskShared(L,k){return humSkAssets(L,0,k)}
function hskWpnAtt(L,k,wi,o,key,sc){const A=hskShared(L,k);return hskAtt(A,'w:'+wi.id+':'+key+(sc?':x'+sc:''),[-260,-200,620,200],g=>{if(sc)g.scale(sc,sc);humDrawWAny(g,wi,o)})}   // sc: baked bigger (pistols, HSK_PSC)
function hskBowAtt(L,k,wi,drawn){const A=hskShared(L,k);return hskAtt(A,'b:'+wi.id+':'+drawn,[-80,-360,140,360],g=>humDrawBowAny(g,wi,drawn,0,false))}
function hskShieldAtt(L,k,look,colR,front,crack){const A=hskShared(L,k);return hskAtt(A,'s:'+look+':'+front+':'+crack,[-130,-150,130,150],g=>humDrawShield(g,look,colR,front,crack))}

/* ---- one frame: pose the skeleton and list the slots in draw order (world matrices in canonical SU space) ---- */
function humSkFrame(L,face,state,t,k,va,ex){const t0=performance.now(),A=humSkAssets(L,face,k),hs=A.hs,S=A.S,f=A.f,back=A.back,mf=A.mf,mir=A.mir,hA=hs.A;
 let W=S.wd;const att=state==='attack';if(W&&W.cls==='xbow'&&!/:L$/.test(W.id)&&((S.ld&&state!=='reload')||(att&&t<.38))){try{W=usWdef(W.id+':L')}catch(e){}}
 const wi=humWIc(W,S.wdI),cls=humWCls(wi.fam,W);hs.fam=wi.fam;hs.two=wi.two;
 const P=humAnimPose(cls,state,t,{two:wi.two,fam:wi.fam},att&&S.shield&&(va==='bash'||va==='shieldbash')?'bash':att&&(va==='throw'||va==='throwK')?(cls==='thrust'?'throwJ':va):'');
 if(S.wall&&S.shield&&cls!=='bow'&&!P.grip&&state!=='death'){const far=face===0||face===3,hi=face===3?(att?[-34,22]:state==='hit'?[-30,24]:[-38,16]):far?(att?[62,22]:state==='hit'?[54,24]:[66,16]):(att?[30,30]:state==='hit'?[22,30]:[36,24]);P.o=[hi[0],hi[1]-(P.bob||0)];P.wall=1;if((cls==='swing'||cls==='dagger')&&!att)P.wa+=(cls==='dagger'?-28:-42)}   // braced (approved look): the blade held up as before   // Shield wall (usWall)
 if(ex===undefined){try{ex=headPick(null,L,state,t,P.name,cls)}catch(e){ex=null}}   // the baked path: the expression from the state alone
 if(S.spearw&&cls==='thrust'&&P.name!=='throwJ'&&state!=='death'&&state!=='walk'&&state!=='swap'&&state!=='reload'){   // Spear wall: braced, knees bent, the spear levelled forward
  const two=wi.two||!S.shield,hit=state==='hit'?Math.sin(Math.PI*Math.min(1,t/.5)):0,lunge=att?Math.max(0,Math.sin(Math.PI*Math.min(1,Math.max(0,(t-.2)/.5)))):0;
  P.lA=16;P.lB=-14;P.uA=0;P.uB=0;P.lg=[P.lA,0,P.lB,0];P.bob=12;P.lean=8+lunge*6-hit*10;P.head=-4;P.kneel=0;
  if(two){P.w=[40+lunge*46-hit*14,46];P.wa=-6;P.grip=1}else{P.w=[46+lunge*40-hit*10,36];P.wa=-3;P.grip=0}}
 const g=new HskRec(),tags=[],kn=Math.max(0,Math.min(1,P.kneel||0)),fall=Math.max(0,Math.min(1,P.fall||0));
 if(fall>0){const e=fall;g.translate(f*170*e,-58*e);g.rotate(-f*Math.PI/2*e)}
 // bones: hip, torso (lean), shoulders, neck
 const hipY=A.hipY0*(1-.5*kn)+(P.bob>0?P.bob*.5:0),UB={x:0,y:hipY-14+P.bob},rot=f*P.lean*Math.PI/180,cr=Math.cos(rot),sr=Math.sin(rot);
 const up=(p)=>({x:UB.x+p.x*cr-p.y*sr,y:UB.y+p.x*sr+p.y*cr}),shA=up(A.shA),shB=up(A.shB),neck=up(A.neck);
 const wSide=A.wSide,oSide=A.oSide,sW=wSide==='a'?shA:shB,sO=oSide==='a'?shA:shB,nearW=wSide==='a';
 const AW=A.AW,AO=A.AO,HW=A.HW,HO=A.HO;
 const aim=(p,sh,tx,ty,mx)=>{const R=p.R,dx=tx-sh.x,dy=ty-sh.y,d=Math.hypot(dx,dy)||1,s=Math.max(.72,Math.min(mx||1.28,d/R.len)),th=Math.atan2(dy,dx),L2=R.len*s;return{th,s,wx:sh.x+Math.cos(th)*(L2+12),wy:sh.y+Math.sin(th)*(L2+12),sh}};
 const rest=(sh,o)=>({x:sh.x+f*o[0],y:sh.y+o[1]});
 const gc=hskGunCls(cls,wi.fam),gun=gc==='lgun'||gc==='pgun',ps=gc==='pgun'?HSK_PSC:1;   // the firearms' own poses (hskGunCls)
 const fSh=f*shA.x>f*shB.x?shA:shB,rSh=fSh===shA?shB:shA,abs=cls==='bow'||(cls==='gun'&&gc!=='pgun');
 const tw0=rest(abs?rSh:sW,P.w),armW=aim(AW,sW,tw0.x,tw0.y);
 const wa=P.wa*Math.PI/180,wdx=f*Math.cos(wa),wdy=Math.sin(wa);
 const grip=P.grip&&!P.drop&&cls!=='bow';let to0=rest(abs?fSh:sO,P.o);if(P.wall&&S.shield)to0={x:neck.x+A.R0*.3,y:neck.y+A.R0*.6};   // braced: the off hand behind the raised shield
 const gd=gc==='lgun'?Math.max(4.5*HUM_CELL,wi.len*.55):(wi.h2||-3)*HUM_CELL*(cls==='gun'?.8:1);   // a long gun: the off hand on the forestock, in front of the trigger hand
 if(grip){const d=gd;to0={x:armW.wx+wdx*d,y:armW.wy+wdy*d}}
 let armO=aim(AO,sO,to0.x,to0.y,abs&&sO===rSh?1.5:1.28);
 // the part sheets: weapons are held at the palm (the centre of the hand part, after its offset), not the wrist
 const palm=(a,h)=>{const o=h.n==='hand_a'?P2.handA:[0,0],lx=h.R.w*(.5+o[0])-h.R.px,ly=h.R.h*(.55+o[1])-h.R.py,r=a.th-Math.PI/2,c=Math.cos(r),s_=Math.sin(r);return{x:a.wx+lx*c-ly*s_,y:a.wy+lx*s_+ly*c}};
 {let pW=palm(armW,HW);armW.gx=pW.x;armW.gy=pW.y;let pO=palm(armO,HO);
  if(grip&&gc==='lgun'){let bx=to0.x,by=to0.y,be=1e9;const mzL=hskMuzzleL(wi).x-24;   // a long gun: the off palm onto the forestock (damped steps, keeps the best); where the arm cannot fold that short, further along the barrel
   for(let d=gd;d<=Math.max(gd,mzL);d+=24){const tx=pW.x+wdx*d,ty=pW.y+wdy*d;let ax=tx,ay=ty;
    for(let it=0;it<10;it++){armO=aim(AO,sO,ax,ay,1.5);pO=palm(armO,HO);const ex=tx-pO.x,ey=ty-pO.y,e=Math.hypot(ex,ey)+(d-gd)*.05;if(e<be){be=e;bx=ax;by=ay}ax+=ex*.6;ay+=ey*.6}if(be<6)break}
   armO=aim(AO,sO,bx,by,1.5);pO=palm(armO,HO)}
  else if(grip){const d=gd+(wi.gripC||0);for(let it=0;it<2;it++){const tx=pW.x+wdx*d,ty=pW.y+wdy*d;armO=aim(AO,sO,to0.x+(tx-pO.x),to0.y+(ty-pO.y),1.4);to0={x:to0.x+(tx-pO.x),y:to0.y+(ty-pO.y)};pO=palm(armO,HO)}}
  if(gun){const mz=hskMuzzleL(wi),X=mz.x*ps,Y=mz.y*ps;armW.mz={x:pW.x+f*(wdx*f*X-wdy*Y),y:pW.y+wdy*X+(f*wdx)*Y};   // the muzzle (world SU): the weapon frame is translate, scale(f,1), rotate(wa)
   if(P.rod&&!P.drop){const ux=wdx,uy=wdy,tx0=armW.mz.x+ux*(P.rdo||0),ty0=armW.mz.y+uy*(P.rdo||0);armW.rod=[armW.mz.x-ux*70*ps,armW.mz.y-uy*70*ps,tx0+ux*8,ty0+uy*8];   // the ramrod along the barrel, standing out of the muzzle
    let tx=tx0,ty=ty0;for(let it=0;it<3;it++){armO=aim(AO,sO,tx,ty,1.5);pO=palm(armO,HO);tx+=tx0-pO.x;ty+=ty0-pO.y}}}
  armO.gx=pO.x;armO.gy=pO.y}
 // slots
 const pcImg=(p,tag)=>g.img(hskPc(p.c,p.R),tag);
 const drawArm=(p,a)=>{{const h=p===AW?HW:HO,o=h.n==='hand_a'?P2.handA:null;g.save();g.translate(a.wx,a.wy);g.rotate(a.th-Math.PI/2);if(o)g.translate(o[0]*h.R.w,o[1]*h.R.h);pcImg(h,'hand');g.restore()}   // the right hand (near arm) sits a little outward and up, under its sleeve's curve   // the part sheets: the hand under its own sleeve cap
  g.save();g.translate(a.sh.x,a.sh.y);g.rotate(a.th);g.scale(a.s,1);g.rotate(-p.R.ang);pcImg(p,'arm');g.restore()};
 const drawHand=()=>{};   // the part sheets: each hand is drawn with its arm (drawArm)
 const fire=cls==='gun'&&att&&P.fire,loaded=S.ld!==0&&!(att&&t>=.38);
 const drawWeapon=()=>{if(P.drop||P.empty||cls==='bow'||wi.fam==='fist')return;let wa2=wa;
  if(P.wa>95&&state!=='death'){const tip=wi.len-(wi.gripC||0)+8,sn=Math.sin(wa);if(armW.gy+sn*tip>-4){const s2=Math.max(.05,Math.min(1,(-4-armW.gy)/tip));wa2=Math.PI-Math.asin(s2)}}   // trailing behind: lowered only until the tip touches the ground
  g.save();g.translate(armW.gx,armW.gy);g.scale(f,1);g.rotate(wa2);if(wi.gripC)g.translate(-wi.gripC,0);{const hang=P.wa>95?0:Math.max(0,Math.min(1,(P.wa-45)/45));let back=0;if(hang>0&&(wi.fam==='axe'||wi.fam==='mace'||wi.fam==='hammer'||wi.fam==='club'))back=wi.len*.62*hang;
  if(hang>0&&state!=='death'){const tip=wi.len-(wi.gripC||0)-back+8,low=armW.gy+Math.sin(wa)*tip;if(low>-6)back+=(low+6)/Math.max(.3,Math.sin(wa))}   // hanging: the tip stops just above the ground
  if(back)g.translate(-back,0)}   // hanging at the side: a hafted weapon is held up by its neck, its head just under the fist
  g.img(hskWpnAtt(L,k,wi,{loaded,fire,crank:P.crank},(loaded?'L':'u')+(fire?'F':'')+(P.crank||''),ps!==1?ps:0),'weapon');g.restore();
  if(P.rod&&armW.rod){const r=armW.rod;g.fn(q=>humInkLine(q,r,humLit(USR.steel),5),'rod')}else if(P.rod){g.save();g.translate(armO.gx,armO.gy);g.fn(q=>humInkLine(q,[0,-20,0,60],humLit(USR.steel),5),'rod');g.restore()}};
 const drawOW=()=>{if(!S.ow||P.drop||state==='cast')return;const oi=humWIc(S.ow,S.owId);g.save();g.translate(armO.gx,armO.gy);g.scale(f,1);g.rotate((P.wa-8)*Math.PI/180);if(oi.gripC)g.translate(-oi.gripC,0);g.img(hskWpnAtt(L,k,oi,{},'ow',oi.fam==='pistol'?HSK_PSC:0),'offweapon');g.restore()};
 const drawBow=()=>{if(cls!=='bow'||P.drop)return;g.save();g.translate(armO.gx,armO.gy);g.scale(f,1);if(!att)g.rotate(-.12);const bd=!!P.bowD,hx=(armW.gx-armO.gx)*f;g.img(hskBowAtt(L,k,wi,bd),'bow');
  g.fn(q=>humDrawBowString(q,wi,bd,!!P.arrow,hx),'string');g.restore()};
 const shFar=oSide==='b',shieldAt=()=>({x:armO.gx+(shFar?Math.sign(sO.x)*22:f*6),y:armO.gy-6});   // part sheets: the shield's centre at the off hand's palm
 const drawShield=front=>{if(!S.shield||P.drop||P.wall)return;tags.push(front?'front':'back');const c=shieldAt();g.save();g.translate(c.x,c.y);g.scale(front?mf:f*mf*.92,1.1);g.img(hskShieldAtt(L,k,S.shield,S.shR,front,!!S.shCrack),front?'shieldF':'shieldB');g.restore()};
 const torsoBone=fn=>{g.save();g.translate(UB.x,UB.y);g.rotate(rot);fn();g.restore()};
 const drawBackGear=()=>{const a=hskBackAtt(A);if(a)torsoBone(()=>g.img(a,'back'))};
 const drawHip=()=>{const a=hskHipAtt(A);if(a)torsoBone(()=>g.img(a,'hip'))};
 const drawTorso=()=>{tags.push('torso');torsoBone(()=>g.img(hskTorsoAtt(A),'torso'))};
 const headBone=fn=>{g.save();g.translate(neck.x,neck.y);g.rotate(rot*.5+f*(P.head||0)*Math.PI/180);fn();g.restore()};
 const drawHead=()=>headBone(()=>g.img(p2HeadAtt(A,ex&&ex.head!=null?ex.head:0),'head'));
 const drawLegs=()=>{const lg=P.lg;for(const [p,side,ix] of[[A.LB,'b',2],[A.LA,'a',0]]){const x=(side==='a'?-A.hx:A.hx),r=-f*lg[ix]*Math.PI/180,lift=lg[ix+1]||0,kr=-f*(side==='a'?.9:.15),ks=side==='a'?.55:.7;
   g.save();g.translate(x+f*(side==='a'?24:-10)*kn,hipY+(A.legY!=null?A.legY:6)-lift*(1-kn));const lk=A.legk!=null?A.legk:hs.legk;g.rotate(r*(1-kn)+kr*kn);g.scale(1,lk+(ks-lk)*kn);pcImg(p,'leg');g.restore()}};
 const drawSpark=()=>{if(!P.spark)return;const col=HUM_SPK[S.spark||S.res]||'#ffe27a';let x,y;const R0=A.R0,sk={x:neck.x+A.skull.x,y:neck.y+A.skull.y};
  if(cls==='staff'){x=armW.wx+wdx*(Math.max(wi.len,170)+20);y=armW.wy+wdy*(Math.max(wi.len,170)+20)}else if(P.spark===3){x=sk.x;y=sk.y-R0-50}else{x=(armW.wx+armO.wx)/2+f*30;y=(armW.wy+armO.wy)/2}
  const r=P.spark===3?30:P.spark===2?22:14;g.save();g.translate(x,y);g.fn(q=>{q.fillStyle=col;q.globalAlpha*=.35;q.beginPath();q.arc(0,0,r*1.6,0,7);q.fill();q.globalAlpha/=.35;const st4=humP(p=>{for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i&1?r*.4:r;i?p.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):p.moveTo(rr,0)}p.closePath()});humSh(q,st4,humLt(col,.3),{lw:5,flat:1})},'spark');g.restore()};
 // ---- draw order (weapon arm near: faces 0 and 3; far: faces 1 and 2, before the mirror)
 const offHand=()=>{if(S.shield){drawHand(HO,armO);drawShield(true)}else if(cls==='bow'){drawBow();drawHand(HO,armO)}else{if(!grip)drawOW();if(!grip)drawHand(HO,armO)}};
 const wSet=()=>{drawWeapon();drawArm(AW,armW)};   // part sheets: the weapon under the hand, the hand under its sleeve
 const wall=!!(P.wall&&S.shield&&!P.drop);
 // Shield wall: the shield's front raised in front of body and head, its top just below the eyes of the head drawn now (all faces)
 let wDone=0;const drawWallShield=()=>{if(!wall||wDone)return;const fam=usShFam(S.shield),D=HUM_SHS[fam]||HUM_SHS.round,sy=1.1,top=fam==='kite'?D[1]*.86:fam==='buckler'||fam==='targe'||fam==='round'||fam==='spiked'?D[0]:D[1];
  const hn=(A.hf||'head')+(ex&&ex.head!=null?ex.head:0),HA=P2A.p[hn].a,eyb=HA.eyb-HA.ny,cx=HA.cx-HA.nx+A.R0*.18;
  const c={x:neck.x+cx,y:neck.y+eyb+4+top*sy};tags.push('front');g.save();g.translate(c.x,c.y);g.scale(mf,sy);g.img(hskShieldAtt(L,k,S.shield,S.shR,true,!!S.shCrack),'shieldF');g.restore()};
 const farShield=()=>{if(!wall)drawShield(false);drawArm(AO,armO);drawHand(HO,armO)};
 const lgOver=gc==='lgun'&&(grip||P.rod)&&!P.drop&&!S.shield;   // a long gun held in both hands: the off hand on the forestock over the gun (its arm across the chest)
 if(!back&&lgOver){drawBackGear();if(!nearW)drawArm(AW,armW);drawLegs();drawTorso();drawHip();drawWeapon();if(nearW)drawArm(AW,armW);drawArm(AO,armO);drawHead();drawSpark()}   // a long gun in both hands: across the body, under the head (cheek to the stock), both hands on it
 else if(!back){drawBackGear();
  if(nearW){if(S.shield)farShield();else{if(!lgOver)drawArm(AO,armO);if(!grip&&cls!=='bow'){drawOW();drawHand(HO,armO)}}}else wSet();
  drawLegs();drawTorso();drawHip();drawHead();
  if(nearW){if(cls==='bow'){drawBow();drawHand(HO,armO)}if(wall){drawWallShield();wDone=1}wSet();if(lgOver)drawArm(AO,armO)}else{drawArm(AO,armO);offHand()}   // braced, weapon arm near: the sword arm ready in front of the shield
  if(grip)drawHand(HO,armO);drawWallShield();drawSpark()}
 else{
  if(nearW){if(S.shield)farShield();else{drawArm(AO,armO);if(cls==='bow')drawBow();if(!grip&&cls!=='bow')drawOW();drawHand(HO,armO)}}else wSet();
  drawLegs();drawTorso();drawBackGear();drawHip();drawHead();
  if(nearW){wSet();if(grip)drawHand(HO,armO)}else{if(cls==='bow')drawBow();drawArm(AO,armO);if(S.shield){drawHand(HO,armO);drawShield(true)}else{if(!grip&&cls!=='bow')drawOW();drawHand(HO,armO)}}drawWallShield();drawSpark()}
 // the weapon on the ground once dropped (ground bone: not part of the falling body)
 if(P.drop&&W&&(W.c&&W.c.length||cls==='bow')){const m0=g.m;g.m=[1,0,0,1,0,0];g.save();g.translate(fall>.5?-f*30:f*70,-8);g.scale(f,1);if(cls==='bow'){g.rotate(Math.PI/2);g.img(hskBowAtt(L,k,wi,false),'dropped')}else{g.translate(fall>.5?-wi.len*.4:-wi.back,0);g.img(hskWpnAtt(L,k,wi,{},'u'),'dropped')}g.restore();g.m=m0}
 HSK.frames++;HSK.ms+=performance.now()-t0;
  return{list:g.list,tags,pose:P,anim:P.name,wpn:{id:wi.id,iid:wi.iid||null,fam:wi.fam,cls:gc,grip:!!grip,hw:[armW.gx,armW.gy],ho:[armO.gx,armO.gy],mz:armW.mz?[armW.mz.x,armW.mz.y]:null},eyes:ex||null,hand:{w:wSide,o:oSide,right:face===0||face===3?'a':'b',shield:S.shield&&!P.drop?oSide:null,layers:tags.join(',')},mir,sc:hs.sc*P2.sc*(hs.race==='dwarf'?.96:1),p2:true}}
/* blit a frame: base = the target context's transform at the feet, in art px (x right, y down); mirror for faces 1 and 3.
   mapImg(cv) may swap an attachment for its tinted / silhouette version (70-render.js tintedOf / silOf, cached per canvas). */
function humSkDraw(q,Fr,x,y,mapImg,skipFn){const t0=performance.now(),s=HUM_A*Fr.sc,m0=q.getTransform(),B0=[m0.a,m0.b,m0.c,m0.d,m0.e,m0.f],base=hskMul(B0,[Fr.mir?-s:s,0,0,s,x,y]);
 const ga=q.globalAlpha;for(const it of Fr.list){const m=hskMul(base,it.m);q.setTransform(m[0],m[1],m[2],m[3],m[4],m[5]);if(it.a){const a=it.a,cv=mapImg?mapImg(a.cv):a.cv;if(it.al<1){q.globalAlpha=ga*it.al;q.drawImage(cv,a.x,a.y,a.w,a.h);q.globalAlpha=ga}else q.drawImage(cv,a.x,a.y,a.w,a.h)}else if(it.f&&!skipFn){q.save();try{it.f(q)}catch(e){}q.restore()}}
 q.setTransform(m0);HSK.draws++;HSK.drawMs+=performance.now()-t0}
/* the frame's box in canonical SU (union of the slot rectangles) */
function humSkBox(Fr){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const it of Fr.list){const m=it.m;const pts=it.a?[[it.a.x,it.a.y],[it.a.x+it.a.w,it.a.y],[it.a.x,it.a.y+it.a.h],[it.a.x+it.a.w,it.a.y+it.a.h]]:[[-40,-40],[40,40]];
  for(const [px,py] of pts){const X=m[0]*px+m[2]*py+m[4],Y=m[1]*px+m[3]*py+m[5];if(X<x0)x0=X;if(X>x1)x1=X;if(Y<y0)y0=Y;if(Y>y1)y1=Y}}return[x0,y0,x1,y1]}
/* ---- the baked path (unitSpritePx for effects, the tailor, tests and the first frames): one sampled pose in a canvas ---- */
const HSK_SAMPLE={idle:[0,.5],walk:[0,.25,.5,.75],attack:[.24,.38,.56],throw:[.17,.27,.5,.8],throwK:[.17,.27,.5,.8],cast:[.22,.5,.66],hit:[.22,.8],death:[.18,.5,1],swap:[.3,.62,.9],reload:[0,.33,.66]};
function humSkT(state,fr){const a=HSK_SAMPLE[state]||HSK_SAMPLE.idle;return a[Math.max(0,Math.min(a.length-1,fr|0))]}
function humBuild(L,face,st,fr,tt){const I=humImg();if(!I||typeof document==='undefined')return null;const t0=performance.now(),k=humK();
 const th=st==='throw'||st==='throwK',Fr=humSkFrame(L,face,th?'attack':st,tt!=null?tt:humSkT(st,fr),k,th?st:'');const b=humSkBox(Fr),s=HUM_A*Fr.sc;
 let X0=b[0]*s,X1=b[2]*s;if(Fr.mir){const t=X0;X0=-X1;X1=-t}const Y0=b[1]*s,Y1=b[3]*s,w=Math.max(2,Math.ceil((X1-X0)*k)+2),h=Math.max(2,Math.ceil((Y1-Y0)*k)+2);
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.hdk=k;const q=cv.getContext('2d');q.imageSmoothingEnabled=true;try{q.imageSmoothingQuality='high'}catch(e){}
 const ax=-X0+1/k,ay=-Y0+1/k;q.setTransform(k,0,0,k,0,0);humSkDraw(q,Fr,ax,ay);HUM.builds++;HUM.bytes+=w*h*4;HUM.ms+=performance.now()-t0;
 return{cv,ax,ay,k,smooth:true,hk:k,hum:1,hand:Fr.hand,anim:Fr.anim,r:typeof ARTHD==='object'?ARTHD.rev:0}}
/* ---- the live figure on the board: 70-render.js drawUnitPx asks for this frame's display list (null: not a skeletal figure) ---- */
const HSK_LOOP={idle:1,walk:1,flee:1};
function humLiveFrame(u,v){if(!u||!humImg()||(typeof hdArt==='function'&&!hdArt()))return null;if(u.def&&!u.m&&typeof monsterSpritePx==='function'){try{if(monsterSpritePx(u,0,'idle',0))return null}catch(e){}}
 const L=usLook(u);if(!humWant(L))return null;let st=v.pS||'idle';if(st==='walk'&&v.pAn==='flee')st='flee';
 let t=HSK_LOOP[st]?(v.pCy||0):(v.pPh!=null?v.pPh:humSkT(st,v.pF));if(st==='idle'&&typeof reduced!=='undefined'&&reduced)t=0;
 let va='';if(st==='attack'&&(v.pAn==='throw'||v.pAn==='throwK'))va=v.pAn;else if(st==='attack'&&typeof anVariant==='function'){try{va=anVariant(u)||''}catch(e){}}
 const face=((v.pD|0)%4+4)%4;let ex=null;try{const W=L.S.wd,cl=W?humWCls(humWInfo(W).fam,W):'fist';ex=headPick(u,L,st==='flee'?'walk':st,t,st==='flee'?'flee':'',cl)}catch(e){ex=null}
 return humSkFrame(L,face,st==='flee'?'flee':st,t,humK(),va,ex)}
/* warm a look: bake its attachments for every face (one face per call while a deadline allows) */
function humSkWarm(L,until){let n=0;const k=humK();for(let f=0;f<4;f++){const c=L.skA&&L.skA[f+':'+k];if(c&&c.warm)continue;if(until&&performance.now()>=until)return n;
  try{humSkFrame(L,f,'idle',0,k,'');humSkFrame(L,f,'attack',.38,k,'')}catch(e){}humSkAssets(L,f,k).warm=1;n++}return n}
/* the muzzle of a Detail High figure's gun at the shot (attack t .38, the flash), in art px from its feet for facing face (mirror applied);
   null when the unit is not a skeletal figure with a gun. 75-fx.js fxBall starts the ball, the flash and the smoke here (board px: x2). */
function humGunMuzzle(u,face){try{if(!u||!humImg()||(typeof hdArt==='function'&&!hdArt()))return null;const L=usLook(u);if(!humWant(L)||!L.S.wd)return null;
  const Fr=humSkFrame(L,((face|0)%4+4)%4,'attack',.38,humK(),'',null);if(!Fr||!Fr.wpn||!Fr.wpn.mz||(Fr.wpn.fam!=='musket'&&Fr.wpn.fam!=='pistol'))return null;
  const s=HUM_A*Fr.sc;return{x:(Fr.mir?-1:1)*Fr.wpn.mz[0]*s,y:Fr.wpn.mz[1]*s,fam:Fr.wpn.fam}}catch(e){return null}}
