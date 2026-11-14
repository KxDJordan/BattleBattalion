/* ================= MONSTERS: battle sprites, portraits, world bands, ability icons (monsterart) =================
   monsterSpritePx(u,face,state,frame) -> {cv,ax,ay} | null   battle figure; ax/ay = the feet (size-2: the footprint centre)
   monsterPortrait(key)                -> 32x32 canvas | null  key: an EN id, a unit, or an EN def
   monsterFrames(u,state)              -> frames of that state for this figure (74-anim.js asks; else UNIT_FRAMES)
   monsterKind(u)                      -> 'adder' 'viper' 'gserpent' 'thorn' 'ent' 'elder' 'ogre' 'aogre' 'wyvern' 'hatch' 'wagon' | null
   monsterInfo(u)                      -> {kind,size,fly,lift,top,wide} what the board needs to place it
   Figures are painted with the part grid of 73-units.js (usGrid / usPart / usP / usResolve): every part is filled flat in
   design coordinates (feet at 0,0, y up is negative, facing screen-right), then one pass shades it from the top-left
   and outlines it. Two views (v 0: front three-quarter, 1: back three-quarter) mirrored for the other two facings.
   An attack or cast can come in variants (anVariant(u) in 74-anim.js: 'sting' 'buffet' 'dive' 'slam' 'roots' ...).
   PAL colours only; nothing here touches the seeded game stream. */
const MS={grids:new Map(),fr:new Map(),kind:new WeakMap(),key:new WeakMap(),pt:new Map(),ptu:new Map(),en:null,err:0,builds:0,ms:0};
const MS_FR={idle:2,walk:4,attack:3,cast:3,hit:2,death:3};
/* kinds: grid (working canvas w,h, anchor ax,ay), frames per state, size on the board, flight lift (art px), overlay top (art px above the feet) */
const MSK={
 adder:{g:[56,44,28,36],top:16,wide:12},
 viper:{g:[56,52,28,44],top:25,wide:12},
 gserpent:{g:[96,80,48,70],big:1,top:44,wide:20},
 thorn:{g:[52,52,26,45],top:24,wide:9},
 ent:{g:[96,92,48,84],big:1,top:76,wide:18},
 elder:{g:[104,100,52,92],big:1,top:86,wide:20},
 ogre:{g:[96,84,48,74],big:1,top:52,wide:18},
 aogre:{g:[100,88,50,78],big:1,top:56,wide:19},
 wyvern:{g:[152,132,76,112],size:2,fly:1,lift:14,top:74,wide:30,fr:{idle:4,walk:4,attack:3,cast:3,hit:2,death:3}},
 hatch:{g:[60,52,30,44],fly:1,lift:8,top:30,wide:10,fr:{idle:4}},
 wagon:{g:[68,56,34,44],top:29,wide:15,bigSh:1,ally:1}
};
/* which figure an enemy is: its EN id or name (the monsters agent's ids are read as they land) */
const MS_ID={gserp:'gserpent',whatch:'hatch',adder:'adder',viper:'viper',spitter:'viper',sviper:'viper',gserpent:'gserpent',serpent:'gserpent',bigserpent:'gserpent',thornling:'thorn',sapling:'thorn',thorn:'thorn',
 ent:'ent',elder:'elder',eent:'elder',elderent:'elder',ogre:'ogre',aogre:'aogre',ogrea:'aogre',armogre:'aogre',wyvern:'wyvern',hatch:'hatch',hatchling:'hatch',wyvhatch:'hatch'};
function msEnKey(def){if(!def||typeof EN!=='object')return null;let k=MS.key.get(def);if(k!==undefined)return k;k=null;for(const e in EN)if(EN[e]===def){k=e;break}
 if(!k&&def.n)for(const e in EN)if(EN[e].n===def.n){k=e;break}MS.key.set(def,k);return k}
function msKindOfId(id,def){const s=((id||'')+' '+(def&&def.n||'')).toLowerCase();if(MS_ID[id])return MS_ID[id];
 if(/hatch|whelp|wyrmling/.test(s))return'hatch';if(/wyvern|drake|wyrm/.test(s))return'wyvern';
 if(/armou?r|iron|plate|ironhide/.test(s)&&/ogre/.test(s))return'aogre';if(/ogre/.test(s))return'ogre';
 if(/elder|ancient|old ?growth/.test(s)&&/ent|tree|oak|grove/.test(s))return'elder';if(/thorn|sapling|sprout|briar|twig/.test(s))return'thorn';
 if(/\bent\b|treant|tree ?folk|barkhide|^ent/.test(s))return'ent';
 if(/spit|viper|cobra|spray/.test(s))return'viper';if(/great|giant|python|constrict|basilisk/.test(s)&&/serpent|snake/.test(s))return'gserpent';if(/adder|asp|snake|serpent/.test(s))return def&&(def.big||def.size>1)?'gserpent':'adder';
 return null}
function monsterKind(u){if(!u||!u.def||u.m)return null;if(u.vip==='wagon'||(typeof CVIP==='object'&&CVIP&&u.def===CVIP.wagon))return'wagon';let k=MS.kind.get(u.def);if(k!==undefined)return k;k=null;try{k=msKindOfId(msEnKey(u.def)||u.eid||'',u.def)}catch(e){k=null}MS.kind.set(u.def,k);return k}
function monsterInfo(u){const k=monsterKind(u),K=k&&MSK[k];const sz=u&&u.def&&u.def.size>1?u.def.size:K&&K.size||1;return{kind:k,size:sz,fly:!!(K&&K.fly)||!!(u&&u.def&&u.def.fly),lift:K?K.lift||0:0,top:K?K.top:u&&u.def&&u.def.big?48:32,wide:K?K.wide:u&&u.def&&u.def.big?14:8,bigSh:!!(K&&K.bigSh)}}
function monsterFrames(u,st){const k=monsterKind(u);if(!k)return 0;const K=MSK[k],F=K.fr;return F&&F[st]?F[st]:MS_FR[st]||0}

/* ---- painter: shapes filled into the part grid (design coordinates) ---- */
function msBegin(K){const g0=K.g,id=g0[0]+'x'+g0[1];let g=MS.grids.get(id);if(!g){g=usGrid(g0[0],g0[1]);MS.grids.set(id,g)}usWipe(g);usG=g;usOX=g0[2];usOY=g0[3];usZ=0;usGrp=0;return g}
const msT0=()=>0;
function msE(cx,cy,rx,ry,R,tex){tex=tex||msT0;const y0=Math.floor(cy-ry-1),y1=Math.ceil(cy+ry+1),x0=Math.floor(cx-rx-1),x1=Math.ceil(cx+rx+1);
 for(let y=y0;y<=y1;y++){const b=(y+.5-cy)/ry;if(b*b>1)continue;for(let x=x0;x<=x1;x++){const a=(x+.5-cx)/rx;if(a*a+b*b<=1)usP(x,y,R,tex(x,y))}}}
function msD(cx,cy,r,R,tex){if(r<.75){usP(Math.floor(cx),Math.floor(cy),R,tex?tex(Math.floor(cx),Math.floor(cy)):0);return}msE(cx,cy,r,r,R,tex)}
function msPoly(pts,R,tex){tex=tex||msT0;let y0=1e9,y1=-1e9;for(const p of pts){if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1]}const n=pts.length;
 for(let y=Math.floor(y0);y<=Math.ceil(y1);y++){const yc=y+.5,X=[];for(let i=0,j=n-1;i<n;j=i++){const a=pts[i],b=pts[j];if((a[1]>yc)!==(b[1]>yc))X.push(a[0]+(yc-a[1])*(b[0]-a[0])/(b[1]-a[1]))}X.sort((p,q)=>p-q);
  for(let k=0;k+1<X.length;k+=2)for(let x=Math.round(X[k]);x<Math.round(X[k+1]);x++)usP(x,y,R,tex(x,y))}}
function msL(x0,y0,x1,y1,R,b){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy;
 for(;;){usP(x0,y0,R,b|0);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx}if(e2<=dx){e+=dx;y0+=sy}}}
function msFL(x0,y0,x1,y1,k){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy;
 for(;;){usF(x0,y0,k);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx}if(e2<=dx){e+=dx;y0+=sy}}}
/* a smooth tube through control points (Catmull-Rom), radius r(t) (t 0..1 along the length), tex(x,y,t) */
function msSpline(P,step){const out=[];const n=P.length;if(n<2)return P.slice();for(let i=0;i<n-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(n-1,i+2)],L=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]),m=Math.max(2,Math.ceil(L/(step||.5)));
  for(let j=0;j<m;j++){const t=j/m,t2=t*t,t3=t2*t;out.push([.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)])}}
 out.push(P[n-1].slice());return out}
function msTube(P,rf,R,tex){const S=msSpline(P,.5),n=S.length;let L=0;const cl=[0];for(let i=1;i<n;i++){L+=Math.hypot(S[i][0]-S[i-1][0],S[i][1]-S[i-1][1]);cl.push(L)}
 for(let i=0;i<n;i++){const t=L?cl[i]/L:0,r=typeof rf==='function'?rf(t):rf;msD(S[i][0],S[i][1],r,R,tex?(x,y)=>tex(x,y,t):null)}return S}
const msRound=Math.round;
/* palette ramps (dark -> light, resting tone) */
const MSR={
 adder:usRamp('aHjk',2),adderB:usRamp('jkdl',2),
 viper:usRamp('BwvA',2),viperH:usRamp('abcd',2),
 gs:usRamp('0aHbcd',2),gsB:usRamp('jkdl',2),
 bark:usRamp('aijk',2),barkL:usRamp('aijk',2),bark2:usRamp('0Gonp',2),moss:usRamp('Bwv',1),leaf:usRamp('BwvA',1),leafL:usRamp('BwvA',2),lich:usRamp('nmlr',1),gold:usRamp('Ybcd',1),amber:usRamp('KEyd',1),
 eld:usRamp('2opq',1),eldL:usRamp('Gonm',2),
 og:usRamp('iuts',2),ogD:usRamp('aiut',2),fur:usRamp('aijk',1),furD:usRamp('0aij',2),club:usRamp('aijk',2),iron:usRamp('Gopq',1),ironL:usRamp('Gopq',2),cloth:usRamp('fKg',1),bone:usRamp('nmlr',2)};
function msTX(f){return(x,y)=>f(x,y)}

/* ================= SERPENTS ================= */
/* a serpent's head facing right: wedge skull, snout, eye, open jaw with fangs, forked tongue. s: scale (1 adder, 2 great serpent) */
function msSnakeHead(hx,hy,s,R,v,o){const eye=o.dead?'0':o.eye||'g';usPart();
 msE(hx,hy,3.2*s,2.2*s,R,(x,y)=>y<hy-s?1:0);msE(hx+2.1*s,hy+.4*s,2*s,1.6*s,R);
 if(s>1){for(let i=0;i<4;i++)usB(Math.round(hx-3+i*2),Math.round(hy-3.2*s+1),-1);usB(Math.round(hx+2),Math.round(hy-2*s),-1)}
 const ex=Math.round(hx+.6*s),ey=Math.round(hy-.9*s);
 if(s>1){usF(ex,ey,eye);usF(ex+1,ey,o.dead?'0':'y');usF(ex,ey+1,'0');usB(ex-1,ey-1,-2);usB(ex,ey-1,-2);usB(ex+1,ey-1,-2)}
 else if(v===0){usF(ex,ey,eye);usB(ex-1,ey-1,-1)}else usF(ex,ey,o.dead?'0':'a');
 usF(Math.round(hx+3.6*s),Math.round(hy-.2*s),'0');
 if(o.jaw&&!o.dead){usPart();const jy=hy+1.6*s;msPoly([[hx-2*s,jy-.5],[hx+3.6*s,jy+.3*s],[hx+3*s,jy+1.6*s],[hx-1.5*s,jy+1.1*s]],o.belly||R);
  for(let x=Math.round(hx-s);x<=Math.round(hx+3*s);x++)usF(x,Math.round(jy),'f');usF(Math.round(hx+2.8*s),Math.round(jy-1),'r');if(s>1){usF(Math.round(hx+1.6*s),Math.round(jy-1),'r');usF(Math.round(hx+2.8*s),Math.round(jy),'r');usF(Math.round(hx+.2*s),Math.round(jy),'g')}}
 if(o.tongue&&!o.dead){usPart();const tx=Math.round(hx+4*s),ty=Math.round(hy+.6*s);usP(tx,ty,'g');usP(tx+1,ty,'g');if(s>1){usP(tx+2,ty,'g');usP(tx+3,ty-1,'g');usP(tx+3,ty+1,'g')}else{usP(tx+2,ty-1,'g');usP(tx+2,ty+1,'g')}}}
/* the zig-zag / blotches on a serpent's back */
function msZig(S,t0,t1,k,d,per){const n=S.length;for(let i=Math.floor(n*t0);i<n*t1;i++){const p=S[i],ph=Math.floor(i/(per||3))&1;usB(Math.round(p[0]),Math.round(p[1]-k+ph*k*2*.5),d)}}
function msAdderPose(st,fr,v){const o={P:[[-14,-2],[-11,-5],[-6,-6],[-2,-4],[2,-2],[6,-3],[8,-7],[9,-10]],hx:12,hy:-12,jaw:0,tongue:0,dead:0};
 switch(st){
  case'idle':if(fr&1){o.tongue=1;o.hy-=1;o.P[7][1]-=1}break;
  case'walk':{const a=fr&3;o.P=o.P.map((p,i)=>[p[0]+(a&1?1:0),p[1]+(i<6?Math.round(Math.sin(i*1.25+a*1.5708)*1.4):0)]);o.hx+=a&1?1:0;o.hy+=a===1?-1:0;break}
  case'attack':if(fr===0){o.P=[[-14,-2],[-11,-5],[-6,-6],[-2,-4],[1,-3],[3,-6],[4,-10],[4,-13]];o.hx=8;o.hy=-15}
   else if(fr===1){o.P=[[-12,-2],[-8,-4],[-3,-4],[2,-3],[7,-4],[12,-6]];o.hx=17;o.hy=-7;o.jaw=1}else{o.hx=14;o.hy=-11;o.P[7]=[11,-9]}break;
  case'cast':if(fr===0){o.P[6]=[6,-8];o.P[7]=[8,-12];o.hx=11;o.hy=-15}else{o.P[6]=[6,-8];o.P[7]=[8,-12];o.hx=11+fr;o.hy=-14;o.jaw=1;o.tongue=fr===2?1:0}break;
  case'hit':if(fr===0){o.P[6]=[5,-7];o.P[7]=[6,-11];o.hx=8;o.hy=-13}else{o.hy+=1}break;
  case'death':if(fr===0){o.P=[[-12,-4],[-9,-7],[-4,-6],[0,-3],[4,-5],[6,-9],[8,-12]];o.hx=11;o.hy=-12;o.jaw=1}
   else if(fr===1){o.P=[[-14,-3],[-10,-4],[-5,-2],[0,-2],[5,-3],[8,-4]];o.hx=11;o.hy=-5;o.jaw=1}else{o.P=[[-14,-2],[-10,-3],[-5,-2],[0,-2],[5,-2],[8,-3]];o.hx=11;o.hy=-3;o.dead=1}break}
 if(v===1){o.P=o.P.map(p=>[p[0],p[1]-Math.round(p[0]*.12)]);o.hy-=1}
 return o}
function msAdder(v,st,fr){const o=msAdderPose(st,fr,v),R=o.dead===1&&st==='death'?MSR.adderB:MSR.adder;usPart();
 const S=msTube(o.P,t=>t<.2?.6+t/.2*1.5:t>.9?2.1-(t-.9)*3:2.1,R);
 if(!o.dead){const n=S.length;for(let i=Math.floor(n*.1);i<n*.9;i+=6){const p=S[i],x=Math.round(p[0]),y=Math.round(p[1]),k=((i/6)|0)&1?1:0;usF(x,y-k,'a');usF(x-1,y-k,'a');usF(x+1,y-k,'a');usF(x,y-1-k,'a');usF(x,y+1-k,'i');usB(x,y-2-k,1)}
  if(v===0)for(let i=Math.floor(n*.2);i<n;i+=1){const p=S[i];usB(Math.round(p[0]),Math.round(p[1]+1.6),2)}}
 msSnakeHead(o.hx,o.hy,1.25,R,v,o);if(!o.dead){usF(Math.round(o.hx-1),Math.round(o.hy-1),'a');usF(Math.round(o.hx),Math.round(o.hy-2),'a');usF(Math.round(o.hx-2),Math.round(o.hy),'a')}}
function msViperPose(st,fr,va){if(st==='attack'&&va==='spit')st='cast';const o={coil:0,B:[[3,-5],[5,-9],[4,-14],[3,-18]],hx:6,hy:-21,jaw:0,tongue:0,dead:0,hood:1,spit:0,sway:0};
 switch(st){
  case'idle':o.sway=fr&1;if(fr&1){o.tongue=1}break;
  case'walk':{const a=fr&3;o.coil=a;o.sway=a===1?1:a===3?-1:0;break}
  case'attack':if(fr===0){o.B=[[3,-5],[3,-9],[1,-14],[0,-18]];o.hx=3;o.hy=-21}else if(fr===1){o.B=[[3,-5],[7,-8],[11,-10],[14,-12]];o.hx=17;o.hy=-13;o.jaw=1;o.hood=0}else{o.B=[[3,-5],[6,-9],[6,-14],[5,-17]];o.hx=8;o.hy=-20}break;
  case'cast':if(fr===0){o.B=[[3,-5],[3,-10],[1,-15],[0,-19]];o.hx=3;o.hy=-23}else{o.B=[[3,-5],[6,-9],[6,-14],[6,-18]];o.hx=9;o.hy=-21;o.jaw=1;o.spit=fr}break;
  case'hit':if(fr===0){o.B=[[3,-5],[3,-9],[0,-13],[-1,-17]];o.hx=2;o.hy=-19}else o.hy+=1;break;
  case'death':if(fr===0){o.B=[[3,-5],[6,-9],[7,-13],[8,-16]];o.hx=11;o.hy=-17;o.jaw=1}else if(fr===1){o.B=[[3,-5],[7,-6],[10,-7],[13,-7]];o.hx=16;o.hy=-6;o.hood=0;o.jaw=1}
   else{o.B=[[3,-4],[7,-3],[11,-3],[14,-3]];o.hx=17;o.hy=-3;o.hood=0;o.dead=1}break}
 if(o.sway){o.B=o.B.map((p,i)=>[p[0]+(i>1?o.sway:0),p[1]]);o.hx+=o.sway}return o}
function msViper(v,st,fr,va){const o=msViperPose(st,fr,va),R=MSR.viper,H=MSR.viperH,ph=o.coil;
 // the coil on the ground: two rings, back half first
 const ring=(cx,cy,rx,ry,r,a0,a1)=>{const P=[];for(let i=0;i<=10;i++){const a=a0+(a1-a0)*i/10;P.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry])}usPart();msTube(P,r,R);return P};
 const d=ph*.6;usGrp=1;ring(-2,-3,7,3,1.8,Math.PI+d,2*Math.PI+d);const tail=[[-9+(ph&1),-2],[-12,-3+(ph===2?1:0)],[-14,-2]];usPart();msTube(tail,t=>1.6-t*1.1,R);
 usGrp=2;const rr=ring(-2,-3,7,3,1.9,d,Math.PI+d);msZig(rr,0,1,1,-2,3);usGrp=3;ring(-1,-6,5,2.4,1.7,Math.PI*.1+d,Math.PI*1.9+d);usGrp=0;
 // the rising neck and the hood
 const B0=o.B.slice(),hood=o.hood&&!o.dead;
 if(hood&&v===1){usPart();const hx=B0[3][0],hy=B0[3][1];msE(hx-.5,hy+2,5.5,4.5,R);for(const s of[-1,1]){usF(Math.round(hx-.5+s*2),Math.round(hy),'d');usF(Math.round(hx-.5+s*2),Math.round(hy+1),'c');usF(Math.round(hx-.5+s*2.6),Math.round(hy+1),'0')}}
 usPart();const S=msTube([[-1,-6]].concat(B0),t=>1.7-t*.3,R);
 if(hood&&v===0){usGrp=4;usPart();const hx=B0[3][0],hy=B0[3][1];msE(hx-.5,hy+2,5.5,4.5,R);usGrp=0;usPart(1);msE(hx,hy+3,2.2,3.6,H,(x,y)=>((y-Math.round(hy))%2===0)?-1:0);usF(Math.round(hx-3),Math.round(hy+1),'0');usF(Math.round(hx+3),Math.round(hy+1),'0')}
 else if(v===0&&!o.dead){for(let i=Math.floor(S.length*.4);i<S.length;i++)usB(Math.round(S[i][0]+1),Math.round(S[i][1]),1)}
 msSnakeHead(o.hx,o.hy,1,R,v,Object.assign(o,{eye:'y',belly:H}));
 if(o.spit===1){usPart(1);for(const [x,y] of [[o.hx+5,o.hy+1],[o.hx+7,o.hy],[o.hx+8,o.hy+2],[o.hx+10,o.hy+1]])usP(x,y,'A');usF(o.hx+7,o.hy,'r')}
 if(o.spit===2){usPart(1);for(const [x,y] of [[o.hx+11,o.hy+2],[o.hx+13,o.hy+1],[o.hx+14,o.hy+3]])usP(x,y,'A')}}
function msGsPose(st,fr,va){if(st==='attack'&&va==='coil'&&fr!==1)st='cast';const o={B:[[9,-13],[14,-22],[10,-31],[13,-38]],hx:20,hy:-42,jaw:0,tongue:0,dead:0,sq:0,ph:0};
 switch(st){
  case'idle':if(fr&1){o.tongue=1;o.hy-=1;o.B[3][1]-=1}break;
  case'walk':{const a=fr&3;o.ph=a;o.B=o.B.map((p,i)=>[p[0]+(a===1?1:a===3?-1:0)*(i>1?1:0),p[1]+(a&1?0:i>1?-1:0)]);o.hx+=a===1?1:a===3?-1:0;break}
  case'attack':if(fr===0){o.B=[[8,-12],[10,-21],[7,-30],[7,-38]];o.hx=12;o.hy=-45;o.jaw=1}else if(fr===1){o.B=[[8,-12],[15,-17],[22,-20],[28,-21]];o.hx=34;o.hy=-21;o.jaw=1}else{o.B=[[8,-12],[13,-20],[14,-28],[17,-34]];o.hx=22;o.hy=-37}break;
  case'cast':o.sq=fr===1?2:1;o.B=[[8,-14],[12,-23],[10,-32],[12,-39]];o.hx=17;o.hy=-44;o.jaw=1;o.tongue=fr===2?1:0;break;
  case'hit':if(fr===0){o.B=[[8,-12],[10,-20],[7,-28],[7,-34]];o.hx=11;o.hy=-37}else{o.hy+=1;o.B[3][1]+=1}break;
  case'death':if(fr===0){o.B=[[8,-12],[14,-18],[17,-26],[21,-30]];o.hx=26;o.hy=-31;o.jaw=1}else if(fr===1){o.B=[[8,-10],[15,-12],[22,-11],[28,-9]];o.hx=34;o.hy=-8;o.jaw=1}
   else{o.B=[[8,-7],[15,-5],[22,-4],[28,-4]];o.hx=34;o.hy=-5;o.dead=1}break}
 return o}
function msGserpent(v,st,fr,va){const o=msGsPose(st,fr,va),R=MSR.gs,Bl=MSR.gsB,ph=o.ph,sq=o.sq;
 const blot=(x,y)=>{const a=Math.floor((x+40)/5),b=Math.floor((y+80)/3),h=((a*7+b*13)&7),cx=(x+40)%5,cy=(y+80)%3;return(a+b)&1&&h<6?(cx>0&&cx<4&&cy===1?-2:-1):(cy===0&&cx===2?1:0)};
 const ring=(cx,cy,rx,ry,r,a0,a1)=>{const P=[];for(let i=0;i<=14;i++){const a=a0+(a1-a0)*i/14;P.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry])}usPart();return msTube(P,r,R,blot)};
 const d=ph*.35,lift=sq?-1-sq:0;
 // tail tip curling out, the back half of the lower coil, the front half, then the upper coil
 usGrp=1;usPart();msTube([[-12,-4],[-19,-3],[-24,-5],[-25,-8]],t=>3.4-t*2.6,R,blot);
 ring(-3,-6+lift*.3,15,6,4.6,Math.PI+d,2*Math.PI+d);usGrp=2;ring(-3,-6+lift*.3,15,6,4.8,d,Math.PI+d);
 usGrp=3;ring(-2,-13+lift,10.5,4.5,4.4,Math.PI*.05+d,Math.PI*1.95+d);
 // the rising body; its belly faces the camera in the front view
 usGrp=4;const B0=[[-3,-16+lift]].concat(o.B);usPart();const S=msTube(B0,t=>6.2-t*2,R,blot);usGrp=0;
 if(v===0&&!o.dead){usPart(1);for(let i=Math.floor(S.length*.15);i<S.length;i++){const p=S[i],r=6.2-(i/S.length)*2;for(let k=1;k<r;k++)usP(Math.round(p[0]+k*.8),Math.round(p[1]+k*.4),Bl,((Math.round(p[1])&1)?0:-1))}}
 if(v===1&&!o.dead)msZig(S,.1,.95,2,-1,4);
 // head: big wedge, a horned crest, amber eyes
 if(!o.dead){usPart();for(const [x,y] of [[-5,-2],[-6,0],[-4,-4],[-6,-3]])usP(o.hx+x,o.hy+y,MSR.bone,y<-2?1:0)}
 msSnakeHead(o.hx,o.hy,2.7,R,v,{jaw:o.jaw,tongue:o.tongue,dead:o.dead,eye:'E',belly:Bl});
 if(sq===2&&!o.dead){for(let i=0;i<5;i++)usB(-10+i*5,-14,1)}}

/* ================= ENTS ================= */
/* walking bark giants: root legs, a gnarled trunk with a face in it, long branch arms, a leaf crown. C: the variant (ent / elder) */
const MS_ENT={k:1,bark:'bark',leaf:'leaf',eye:['y','e'],beard:6,crown:[[-13,-72,8,6],[1,-79,10,7],[14,-72,8,6],[-5,-70,6,4],[8,-68,6,4]],runes:0,lich:0};
const MS_ELD={k:1.12,bark:'bark2',leaf:'gold',eye:['A','r'],beard:13,crown:[[-14,-72,9,6],[0,-80,11,7],[14,-72,9,6],[-6,-68,7,4],[8,-67,7,4],[-20,-64,5,4],[20,-64,5,4]],runes:1,lich:1};
function msEntPose(st,fr,va){const p={bx:0,by:0,nl:[0,0],fl:[0,0],na:[17,-24],fa:[-15,-26],eye:0,sway:0,lean:0,dead:0,low:0,glow:0};
 switch(st){
  case'idle':p.by=fr&1?-1:0;p.sway=fr&1;p.na=[17,-25+(fr&1?-1:0)];break;
  case'walk':{const a=fr&3;p.nl=a===0?[3,2]:a===2?[-2,0]:[0,0];p.fl=a===2?[3,2]:a===0?[-2,0]:[0,0];p.by=a&1?-1:0;p.bx=a===0?1:a===2?-1:0;p.na=a===0?[13,-25]:a===2?[19,-23]:[17,-24];p.fa=a===0?[-17,-24]:a===2?[-12,-27]:[-15,-26];p.sway=a&1;break}
  case'attack':if(va==='slam'){if(fr===0){p.na=[8,-82];p.fa=[-6,-82];p.by=-2;p.lean=-1}else if(fr===1){p.na=[18,-4];p.fa=[10,-4];p.lean=2;p.by=2}else{p.na=[18,-14];p.fa=[-12,-18]}}
   else if(fr===0){p.na=[4,-82];p.lean=-1;p.bx=-1}else if(fr===1){p.na=[30,-26];p.lean=2;p.bx=2}else{p.na=[22,-18];p.lean=1}break;
  case'cast':p.glow=1;if(va==='bark'){p.na=[3,-38];p.fa=[-1,-40];p.by=fr===1?1:0}else if(va==='regen'){p.na=[24,-56-fr];p.fa=[-22,-56-fr];p.sway=fr&1}
   else{if(fr===0){p.na=[14,-74];p.fa=[-12,-74];p.by=-1}else{p.na=[14,-2];p.fa=[-10,-3];p.by=2;p.lean=1}}break;
  case'hit':p.bx=fr===0?-2:-1;p.lean=fr===0?-2:-1;p.na=[16,-30];break;
  case'death':if(fr===0){p.bx=-2;p.lean=-2;p.na=[18,-40];p.fa=[-18,-40]}else if(fr===1){p.low=10;p.lean=3;p.na=[20,-6];p.fa=[-14,-6];p.eye=1}else p.dead=1;break}
 return p}
function msEnt(v,st,fr,va,C){C=C||MS_ENT;const p=msEntPose(st,fr,va),k=C.k,R=MSR[C.bark],L=MSR[C.leaf],M=MSR.moss;
 if(p.dead){msEntDead(v,C);return}
 const X=x=>p.bx+x*k,Y=y=>Math.round(y*k)+p.by+p.low,lx=y=>Math.round(p.lean*(-y)/60),
  grain=(x,y)=>{const g=(((x+200)*5+Math.floor((y+200)/7)*3)%9);return g===0?-2:g===1?-1:g===4?1:0};
 // far root leg, far arm (behind the trunk)
 const leg=(x0,dx,lift)=>{usPart();msTube([[X(x0),Y(-22)],[X(x0+dx*.5),Y(-11)-lift],[X(x0+dx),-2-lift]],t=>4.6*k-t*1.4,R,grain);
  usPart();for(const [a,b] of [[-4,1],[0,2],[4,1]])msTube([[X(x0+dx),-2-lift],[X(x0+dx+a),b-1-lift]],1.2,R)};
 const arm=(sx,sy,ex,ey,near)=>{usPart();const mx=(sx+ex)/2+(near?3:-3),my=(sy+ey)/2-4;msTube([[sx,sy],[mx,my],[ex,ey]],t=>3.4*k-t*1.6,R,grain);
  usPart();for(const [a,b] of [[-3,3],[0,4],[3,2]])msTube([[ex,ey],[ex+a,ey+b]],.9,R);if(near)usB(Math.round(mx),Math.round(my)-1,1)};
 usGrp=1;if(v===0){leg(-7,p.fl[0]*-1,p.fl[1])}else leg(6,p.fl[0],p.fl[1]);
 usGrp=2;arm(X(-10)+lx(-48),Y(-48),X(p.fa[0])+lx(p.fa[1]),Y(p.fa[1]),0);
 usGrp=3;if(v===0)leg(6,p.nl[0],p.nl[1]);else leg(-7,-p.nl[0],p.nl[1]);
 // the trunk: wide at the shoulders, a waist, roots at the hips
 usGrp=0;usPart();const T=[[-10,-20],[-12,-28],[-11,-38],[-14,-48],[-13,-55],[-9,-62],[-2,-65],[5,-64],[11,-60],[14,-52],[13,-44],[11,-34],[12,-26],[9,-20],[3,-17],[-4,-17]].map(q=>[X(q[0])+lx(q[1]),Y(q[1])]);
 msPoly(T,R,grain);
 // moss on the shoulders, lichen (elder), knots
 usPart(1);for(const [x,y,w] of [[-11,-53,4],[9,-56,5],[-4,-30,2]])for(let i=0;i<w;i++)usF(Math.round(X(x+i)+lx(y)),Y(y)+((i*7)&1),i&1?'w':'B');
 if(C.lich)for(const [x,y] of [[-6,-40],[-5,-41],[7,-35],[8,-36],[-8,-26],[3,-50]])usF(Math.round(X(x)+lx(y)),Y(y),'m');
 usF(Math.round(X(4)+lx(-28)),Y(-28),'0');usF(Math.round(X(5)+lx(-28)),Y(-28),'a');usF(Math.round(X(4)+lx(-27)),Y(-27),'a');
 // the face (front view): a heavy brow, deep sockets, eyes that glow, a crack of a mouth, a hanging moss beard
 if(v===0){const fx=Math.round(X(2)+lx(-52)),fy=Y(-52),ec=p.eye?'0':C.eye[p.glow?1:0];
  for(let i=-7;i<=7;i++){usB(fx+i,fy-3,2);usF(fx+i,fy-2,'a')}for(const ex of [fx-5,fx+3]){usF(ex,fy,'0');usF(ex+1,fy,'0');usF(ex+2,fy,'0');usF(ex,fy+1,'0');usF(ex+1,fy+1,ec);usF(ex+2,fy+1,'0');if(!p.eye){usF(ex+1,fy,C.eye[1])}}
  for(let i=-3;i<=3;i++)usF(fx+i,fy+6+(i&1),'0');usF(fx-1,fy+3,'a');usF(fx,fy+4,'a');
  if(!p.eye&&p.glow){usF(fx-3,fy+1,'r');usF(fx+4,fy+1,'r')}
  usPart(1);for(let i=-4;i<=4;i++){const n=C.beard-Math.abs(i)*(C.lich?2:1)-((i*3)&1)*2;for(let j=0;j<n;j++)usP(fx+i+(j>6&&i<0?1:0),fy+7+j,C.lich?MSR.lich:M,(i&1)?-1:j===0?1:0)}}
 else{const fx=Math.round(X(0)+lx(-50)),fy=Y(-50);for(let i=0;i<5;i++)usB(fx-2+i,fy+((i*3)&3),-1)}
 if(C.runes&&v===0){const ph=st==='cast'?'r':'z';for(const [x,y] of [[-5,-36],[-4,-35],[-5,-34],[6,-44],[7,-43]])usF(Math.round(X(x)+lx(y)),Y(y),ph)}
 // branches and the crown of leaves
 usPart();for(const [x0,y0,x1,y1] of [[-6,-62,-13,-71],[2,-64,1,-78],[8,-60,14,-71],[-11,-56,-17,-62],[12,-54,18,-60]])msTube([[X(x0)+lx(y0),Y(y0)],[X(x1)+lx(y1)+p.sway,Y(y1)]],1.6,R);
 usGrp=4;for(const c of C.crown){usPart();msE(X(c[0])+lx(c[1])+p.sway,Y(c[1]),c[2]*k,c[3]*k,L,(x,y)=>((x*3+y*5)%7===0)?-1:((x+y*3)%11===0)?1:0)}
 if(p.glow&&st==='cast'&&va==='regen'){usPart(1);for(const c of C.crown)usF(Math.round(X(c[0])+p.sway),Y(c[1])-1,'A')}
 usGrp=0;
 // near arm, in front of the trunk
 usGrp=5;arm(X(10)+lx(-48),Y(-48),X(p.na[0])+lx(p.na[1]),Y(p.na[1]),1);usGrp=0;
 if(st==='cast'&&va==='bark'){usPart(1);for(const [x,y] of [[-8,-30],[-6,-44],[8,-50],[9,-28],[0,-24]])usF(Math.round(X(x)),Y(y),'p')}}
/* a fallen ent: the trunk on its side, the crown spilled to the right */
function msEntDead(v,C){const k=C.k,R=MSR[C.bark],L=MSR[C.leaf];usPart();msPoly([[-26*k,-2],[-24*k,-11],[16*k,-12],[18*k,-2]],R,(x,y)=>((y*5+x)%9===0)?-1:0);
 usPart();for(const [a,b] of [[-30,-4],[-29,-8],[-28,-1]])msTube([[-24*k,-6],[a*k,b]],1.4,R);
 usGrp=4;for(const [x,y,rx,ry] of [[24,-6,8,5],[30,-12,7,5],[20,-14,6,4]]){usPart();msE(x*k,y,rx*k,ry,L,(x,y)=>((x*3+y*5)%7===0)?-1:0)}usGrp=0;
 if(v===0){usF(Math.round(8*k),-7,'0');usF(Math.round(11*k),-7,'0');for(let i=0;i<4;i++)usF(Math.round(7*k)+i,-4,'0')}}
function msElder(v,st,fr,va){msEnt(v,st,fr,va,MS_ELD)}
/* a thornling: a walking sapling, twig arms with thorns, a crown of leaves and red berries */
function msThorn(v,st,fr,va){const R=MSR.barkL,L=MSR.leafL;let bx=0,by=0,nl=[0,0],fl=[0,0],na=[7,-10],fa=[-6,-11],dead=0,lean=0;
 switch(st){case'idle':by=fr&1?-1:0;break;
  case'walk':{const a=fr&3;nl=a===0?[2,1]:a===2?[-1,0]:[0,0];fl=a===2?[2,1]:a===0?[-1,0]:[0,0];by=a&1?-1:0;break}
  case'attack':if(fr===0){na=[2,-24];lean=-1}else if(fr===1){na=[13,-12];lean=1;bx=1}else na=[10,-9];break;
  case'cast':na=[8,-22+fr];fa=[-7,-22+fr];break;
  case'hit':bx=-1;lean=-1;break;
  case'death':if(fr===0){lean=-2;bx=-1}else if(fr===1){by=4;lean=2}else dead=1;break}
 if(dead){usPart();msTube([[-8,-2],[8,-3]],2,R);usGrp=4;usPart();msE(11,-4,4,3,L);usGrp=0;usF(12,-5,'g');usF(9,-3,'g');return}
 const lx=y=>Math.round(lean*(-y)/14);
 const leg=(x,d)=>{usPart();msTube([[bx+x,by-7],[bx+x+d[0],-1-d[1]]],1.3,R);usP(bx+x+d[0]+1,-1-d[1],R)};
 usGrp=1;leg(-2,fl);usGrp=2;usPart();msTube([[bx-1+lx(-12),by-12],[bx+fa[0],by+fa[1]]],1,R);
 usGrp=3;leg(2,nl);usGrp=0;usPart();msTube([[bx,by-6],[bx+lx(-12),by-12],[bx+lx(-17),by-17]],t=>2.6-t*.8,R,(x,y)=>(x+y)%4===0?-1:0);
 if(v===0){const fx=bx+1+lx(-13),fy=by-13;usF(fx-1,fy,'0');usF(fx+2,fy,'0');usF(fx-1,fy+1,'y');usF(fx+2,fy+1,'y');usF(fx,fy+3,'0');usF(fx+1,fy+3,'0')}
 usGrp=4;for(const [x,y,rx,ry] of [[-4,-21,4,3],[3,-23,5,3.4],[0,-18,4,2.5]]){usPart();msE(bx+x+lx(y),by+y,rx,ry,L,(x,y)=>((x*3+y*5)%7===0)?-1:0)}
 usGrp=0;usPart(1);for(const [x,y] of [[-5,-21],[4,-24],[1,-18],[6,-21]])usP(bx+x+lx(y),by+y,'g');
 usGrp=5;usPart();msTube([[bx+1+lx(-12),by-12],[bx+na[0],by+na[1]]],1,R);usPart(1);usP(bx+na[0]+1,by+na[1],'m');usP(bx+(na[0]>>1)+1,by+((na[1]-12)>>1)-1,'m');usGrp=0}

/* ================= OGRES ================= */
/* hunched brutes: short thick legs, a belly, huge shoulders, a small low head with tusks, a tree-trunk club (armored: plates, horned helm, a maul) */
function msOgrePose(st,fr,va){const p={bx:0,by:0,nl:[0,0],fl:[0,0],h:[17,-25],a:68,f:[-15,-24],lean:0,low:0,dead:0,mouth:0,two:0};
 switch(st){
  case'idle':p.by=fr&1?-1:0;p.h=[17,-25+(fr&1?-1:0)];break;
  case'walk':{const a=fr&3;p.nl=a===0?[3,2]:a===2?[-2,0]:[0,0];p.fl=a===2?[3,2]:a===0?[-2,0]:[0,0];p.by=a&1?-1:0;p.bx=a===0?1:a===2?-1:0;p.a=a===0?62:a===2?76:68;p.h=[17,-27];p.f=a===0?[-17,-26]:[-13,-23];break}
  case'attack':if(va==='slam'){p.two=1;if(fr===0){p.h=[2,-66];p.a=-120;p.lean=-2;p.by=-1;p.f=[-2,-62]}else if(fr===1){p.h=[24,-26];p.a=62;p.lean=3;p.by=2;p.f=[18,-28]}else{p.h=[22,-20];p.a=78;p.lean=2;p.by=2;p.f=[16,-22]}}
   else if(fr===0){p.h=[-8,-52];p.a=-150;p.lean=-2;p.bx=-2}else if(fr===1){p.h=[24,-36];p.a=-8;p.lean=3;p.bx=3}else{p.h=[10,-20];p.a=150;p.lean=1;p.bx=1}break;
  case'cast':if(va==='slam'||va==='quake'){p.two=1;if(fr<2){p.h=[2,-66];p.a=-115;p.by=-2;p.f=[-2,-62]}else{p.h=[22,-20];p.a=78;p.lean=3;p.by=3;p.f=[16,-22]}}
   else{p.mouth=1;p.h=[24,-48];p.a=-60;p.f=[-24,-46];p.lean=-1}break;
  case'hit':p.bx=fr===0?-3:-1;p.lean=fr===0?-2:-1;p.h=[14,-26];p.a=120;break;
  case'death':if(fr===0){p.bx=-2;p.lean=-3;p.h=[16,-34];p.a=60}else if(fr===1){p.low=10;p.lean=3;p.h=[20,-6];p.a=20;p.f=[-14,-6]}else p.dead=1;break}
 return p}
function msOgre(v,st,fr,va,arm){const p=msOgrePose(st,fr,va),S=MSR.og,F=MSR.fur,I=MSR.iron,lx=y=>Math.round(p.lean*(-y)/50);
 if(p.dead){msOgreDead(v,arm);return}
 const X=x=>p.bx+x,Y=y=>y+p.by+p.low,sk=(x,y)=>0;
 const leg=(x0,d,near)=>{usPart();const kx=X(x0+d[0]*.4+(near?1:-1)),ky=Y(-11)-d[1];msTube([[X(x0)+lx(-20),Y(-21)],[kx,ky],[X(x0+d[0]),-4-d[1]]],t=>5.2-t*1.4,arm?I:S,arm?null:sk);
  usPart();msE(X(x0+d[0])+2,-2.5-d[1],5,2.6,arm?I:MSR.ogD);if(arm){usF(Math.round(kx),Math.round(ky),'c');usB(Math.round(kx),Math.round(ky)-1,1)}};
 const limb=(sx,sy,ex,ey,near)=>{usPart();const mx=(sx+ex)/2+(near?3:-3),my=(sy+ey)/2+2;msTube([[sx,sy],[mx,my],[ex,ey]],t=>5.4-t*1.6,S,sk);
  if(arm){usPart();msTube([[mx,my],[ex,ey]],t=>4.6-t*.8,I)}usPart();msE(ex,ey,4.2,3.8,arm?I:S);if(near)usB(Math.round(ex)-1,Math.round(ey)-2,1)};
 const club=(hx,hy,a,front)=>{const r=a*Math.PI/180,c=Math.cos(r),s_=Math.sin(r),L=arm?30:28,bx_=hx-c*6,by_=hy-s_*6,ex=hx+c*L,ey=hy+s_*L;usPart();
  if(arm){msTube([[bx_,by_],[ex,ey]],1.6,MSR.club);usPart();const hx2=hx+c*(L-3),hy2=hy+s_*(L-3),nx=-s_,ny=c;msPoly([[hx2-c*5+nx*7,hy2-s_*5+ny*7],[hx2+c*5+nx*7,hy2+s_*5+ny*7],[hx2+c*5-nx*7,hy2+s_*5-ny*7],[hx2-c*5-nx*7,hy2-s_*5-ny*7]],MSR.ironL);
   for(const k of[-5,5])usF(Math.round(hx2+nx*k),Math.round(hy2+ny*k),'c');usF(Math.round(hx2),Math.round(hy2),'0')}
  else{msTube([[bx_,by_],[hx+c*L*.5,hy+s_*L*.5],[ex,ey]],t=>1.8+t*t*3.6,MSR.club,(x,y)=>((x+y)%5===0)?-1:0);for(let i=0;i<4;i++){const t=.62+i*.11,sx=hx+c*L*t,sy=hy+s_*L*t;usF(Math.round(sx-s_*3),Math.round(sy+c*3),'p');usF(Math.round(sx+s_*3),Math.round(sy-c*3),'q')}}};
 // far leg, far arm, the club when it is behind the body
 usGrp=1;leg(v===0?-7:6,v===0?[-p.fl[0],p.fl[1]]:p.fl,0);
 usGrp=2;limb(X(-13)+lx(-40),Y(-40),X(p.f[0])+lx(p.f[1]),Y(p.f[1]),0);
 const behind=p.a<-100||(st==='attack'&&fr===0);if(behind){usGrp=2;club(X(p.h[0])+lx(p.h[1]),Y(p.h[1]),p.a)}
 usGrp=3;leg(v===0?6:-7,v===0?p.nl:[-p.nl[0],p.nl[1]],1);
 // loincloth, belly, chest and shoulders
 usGrp=0;usPart();msPoly([[X(-12),Y(-26)],[X(13),Y(-26)],[X(14),Y(-15)],[X(9),Y(-13)],[X(6),Y(-16)],[X(2),Y(-12)],[X(-2),Y(-16)],[X(-7),Y(-13)],[X(-12),Y(-16)]],F,(x,y)=>((x*3+y)%5===0)?-1:0);
 usPart();msE(X(1)+lx(-30),Y(-30),13,10,S,sk);msE(X(0)+lx(-40),Y(-40),16,8,S,sk);if(v===0&&!arm){usPart(1);for(let i=-9;i<=9;i++)if(Math.abs(i)>1)usB(X(i)+lx(-36),Y(-35)+(Math.abs(i)>>2),-1)}
 if(v===0){usPart(1);usB(X(3)+lx(-30),Y(-26),-1);for(let i=-2;i<=3;i++)usB(X(i+1)+lx(-22),Y(-22),-1)}
 usPart();msPoly([[X(-12)+lx(-24),Y(-25)],[X(14)+lx(-24),Y(-25)],[X(14)+lx(-24),Y(-22)],[X(-12)+lx(-24),Y(-22)]],MSR.furD);usF(X(4)+lx(-24),Y(-24),'l');usF(X(5)+lx(-24),Y(-24),'l');usF(X(4)+lx(-24),Y(-23),'m');
 if(arm){usPart();msE(X(1)+lx(-36),Y(-36),13,9,I,(x,y)=>((y+80)%5===0)?-1:0);for(const [x,y] of [[-9,-39],[10,-39],[-8,-30],[9,-30]])usF(X(x)+lx(y),Y(y),'c');
  usGrp=4;for(const sx of [-14,13]){usPart();msE(X(sx)+lx(-45),Y(-45),7,5,MSR.ironL);usF(X(sx)+lx(-45),Y(-46),'c');for(let i=-5;i<=5;i+=2)usB(X(sx+i)+lx(-41),Y(-41),-1)}usGrp=0}
 // the head: low and forward, small eyes, a brow, an underbite with tusks (in front of the near arm unless that arm is raised)
 const head=()=>{const hx=X(v===0?9:6)+lx(-51),hy=Y(-51);usGrp=7;usPart();
 if(arm){msE(hx,hy,7.5,7,MSR.ironL,(x,y)=>y===Math.round(hy)-1?-1:0);usPart();for(const s2 of[-1,1]){const bx2=hx+s2*6;msTube([[bx2,hy-4],[bx2+s2*4,hy-9],[bx2+s2*3,hy-13]],t=>1.8-t*1.2,MSR.bone)}
  if(v===0){for(let i=-4;i<=5;i++)usF(hx+i,hy,'0');usF(hx-2,hy,'E');usF(hx+3,hy,'E');for(let j=2;j<6;j++)usF(hx+1,hy+j,j&1?'0':'p');usPart();msE(hx+1,hy+6,4,2,S);usF(hx-1,hy+5,'l');usF(hx+3,hy+5,'l')}
  else{for(let i=-5;i<=5;i+=2)usF(hx+i,hy-2,'c')}}
 else{msE(hx,hy,6.5,6.5,S,sk);usPart();msE(hx+(v===0?1:0),hy+4,5.5,3.5,S);
  if(v===0){for(let i=-4;i<=4;i++)usB(hx+i,hy-3,-2);usF(hx-2,hy-1,'0');usF(hx+3,hy-1,'0');usF(hx-2,hy-2,'y');usF(hx+3,hy-2,'y');usF(hx+1,hy+1,'u');usF(hx,hy+1,'u');
   for(let i=-3;i<=4;i++)usF(hx+i,hy+4,p.mouth?(i>-2&&i<3?'f':'0'):'0');if(p.mouth)for(let i=-2;i<=2;i++)usF(hx+i,hy+5,'f');usPart();usP(hx-3,hy+3,'l');usP(hx-3,hy+2,'l');usP(hx+4,hy+3,'l');usP(hx+4,hy+2,'l')}
  else{usF(hx-1,hy-6,'G');usF(hx,hy-7,'G');usF(hx+1,hy-6,'G')}
  usPart();msE(hx-6,hy-1,1.6,2.2,S);usPart();for(let i=0;i<3;i++)usP(hx-1+i,hy-7,'G');usP(hx,hy-8,'G')}usGrp=0};
 const hiArm=p.h[1]<-44;if(hiArm)head();
 // near arm, then the club in front of it
 usGrp=5;limb(X(12)+lx(-40),Y(-40),X(p.h[0])+lx(p.h[1]),Y(p.h[1]),1);
 if(!behind){usGrp=6;club(X(p.h[0])+lx(p.h[1]),Y(p.h[1]),p.a);usGrp=5;usPart();msE(X(p.h[0])+lx(p.h[1]),Y(p.h[1]),3.6,3.4,arm?I:S)}
 if(p.two&&p.f){usGrp=6;usPart();msE(X(p.f[0])+lx(p.f[1]),Y(p.f[1]),3.4,3.2,arm?I:S)}usGrp=0;if(!hiArm)head()}
function msOgreDead(v,arm){const S=MSR.og,I=MSR.iron;usPart();msE(-6,-5,14,4.5,MSR.fur);usPart();msE(4,-7,15,6,arm?I:S);usPart();msE(20,-6,6,5,arm?MSR.ironL:S);if(v===0){usF(21,-7,'0');usF(23,-7,'0')}
 usPart();msTube([[-24,-3],[-10,-3]],3.6,arm?I:S);usPart();msTube([[8,-2],[30,-2]],t=>1.5+t*3,arm?I:MSR.club)}
function msAogre(v,st,fr,va){msOgre(v,st,fr,va,1)}

/* ================= WYVERNS ================= */
/* a 2x2 flier after the owner's reference (shots/ref/wyvern-ref.jpg): an indigo body with a pale-blue belly, a segmented ridge of
   crimson plates from the brow down the neck, back and the whole tail, two raised swept-back wings (crimson bones, plum membrane,
   ice-pale claws at the wrists), an angular head with pale swept horns, two hanging legs with red bands and ice claws, and a long
   tail curling down and forward under the body to a red spade with a pale spike. Design units: the ground under it at y 0, x forward
   (screen-right), y down; the whole figure is posed by msWyPose and scaled by k (1.1 the wyvern, .46 a hatchling, which also gets a
   bigger head, stubbier wings and fewer plates). Wing phases: 0 raised (the reference), 1 level, 2 down, 3 swept forward (buffet),
   4 folded (dive), 5 high (takeoff). v 0 front three-quarter (belly, eye), v 1 back three-quarter (the ridge and the wing tops). */
const MSW={body:usRamp('1GDXx',3),bodyD:usRamp('1GD',1),belly:usRamp('DXxF',1),plate:usRamp('0ffgg',3),bone:usRamp('0fg',1),spar:usRamp('0fgg',1),
 mem:usRamp('01fD',2),memF:usRamp('01ff',2),horn:usRamp('XxFqr',3),claw:usRamp('XFqr',2)};
/* wings: offsets from the shoulder in the reference (raised) phase. e elbow, w wrist (the claw), t the tips (t[0] the long top one), b where the membrane meets the back */
const MSW_NEAR={s:[9,-55],e:[-5,-18],w:[-14,-35],t:[[-38,-42],[-37,-21],[-27,-8]],b:[-20,3]},
 MSW_FAR={s:[17,-59],e:[5,-14],w:[9,-30],t:[[-17,-40],[-19,-22],[-13,-8]],b:[-10,1]};
/* phase -> how the wing offsets are posed: [x scale, y scale, rotation (+ forward)] */
const MSW_PH=[[1,1,0],[1.06,.42,.12],[.96,-.5,.2],[.9,.95,.75],[.55,.5,-.35],[.86,1.18,-.12]];
function msWyPose(st,fr,va){const p={ph:0,pitch:0,bx:0,by:0,head:[36,-49],ha:.48,neck:[21,-60],jaw:0,tail:null,legs:0,dead:0,low:0,eye:0};
 const wave=[0,1,2,1];
 switch(st){
  case'idle':p.ph=wave[fr&3];p.by=[0,1,2,1][fr&3]-1;p.head=[37,-49+((fr&3)===2?1:0)];break;
  case'walk':p.ph=wave[fr&3];p.by=[-1,1,2,1][fr&3];p.pitch=.08;p.bx=1;p.head=[38,-48];break;
  case'attack':
   if(va==='sting'){p.ph=fr===2?0:1;p.head=fr===1?[35,-47]:[36,-51];
    p.tail=fr===0?[[-12,-40],[-26,-44],[-36,-56],[-34,-70],[-22,-80],[-10,-78]]:fr===1?[[-14,-44],[-22,-36],[-14,-24],[2,-20],[22,-22],[42,-24]]:[[-14,-44],[-28,-44],[-38,-36],[-40,-24],[-34,-14],[-24,-10]]}
   else if(va==='buffet'){p.ph=fr===0?5:fr===1?3:2;p.pitch=fr===1?-.06:0;p.head=fr===0?[34,-53]:[38,-49];p.jaw=fr===1?1:0}
   else if(va==='dive'){if(fr===0){p.ph=4;p.pitch=.38;p.head=[40,-44];p.ha=.6}else if(fr===1){p.ph=5;p.pitch=.14;p.legs=1;p.jaw=1;p.head=[41,-44]}else{p.ph=2;p.legs=1;p.by=2}}
   else{p.ph=fr===1?1:0;if(fr===0){p.head=[28,-60];p.neck=[17,-60];p.ha=0}else if(fr===1){p.head=[47,-42];p.neck=[30,-52];p.jaw=1;p.pitch=.1;p.ha=.25}else{p.head=[39,-48]}}break;
  case'cast':if(va==='takeoff'||va==='land'){p.ph=[5,2,1][fr];p.legs=va==='land'?1:0;p.by=fr===1?3:0}
   else{p.ph=fr?5:0;p.head=[34,-57+fr];p.neck=[20,-60];p.jaw=fr>0?1:0;p.pitch=-.08;p.ha=-.15}break;
  case'hit':p.ph=fr===0?5:1;p.pitch=-.14;p.head=[31,-55];p.ha=0;p.bx=-3;p.eye=fr===0?1:0;break;
  case'death':if(fr===0){p.ph=5;p.pitch=-.2;p.head=[29,-58];p.ha=-.3;p.jaw=1;p.eye=1}
   else if(fr===1){p.ph=2;p.pitch=.3;p.low=18;p.head=[40,-38];p.ha=.8;p.jaw=1;p.eye=1}else p.dead=1;break}
 return p}
/* a filled ellipse painted only where the figure already is (belly light, bands) */
function msEin(cx,cy,rx,ry,R,b){const y0=Math.floor(cy-ry-1),y1=Math.ceil(cy+ry+1),x0=Math.floor(cx-rx-1),x1=Math.ceil(cx+rx+1);
 for(let y=y0;y<=y1;y++){const q=(y+.5-cy)/ry;if(q*q>1)continue;for(let x=x0;x<=x1;x++){const a=(x+.5-cx)/rx;if(a*a+q*q<=1&&usHas(x,y))usP(x,y,R,typeof b==='function'?b(x,y):b|0)}}}
/* the ridge: a row of crimson plates along a spline S (screen px) on the side the normal points to (out = +1 left of travel).
   Each plate is its own part (the shading pass lights its top-left edge and darkens the next one's overlap); alternating outline
   groups give the crisp dark seams between plates of the reference. */
function msRidge(S,t0,t1,step,rf,off,out,grp){const n=S.length;let L=0;const cl=[0];for(let i=1;i<n;i++){L+=Math.hypot(S[i][0]-S[i-1][0],S[i][1]-S[i-1][1]);cl.push(L)}
 const g0=usGrp,pts=[];for(let d=L*t0;d<=L*t1;d+=step){let i=1;while(i<n-1&&cl[i]<d)i++;const a=S[i-1],b=S[i],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,t=d/(L||1);
  const r=rf(t),o=off(t);pts.push([a[0]+(b[0]-a[0])*.5-dy/l*o*out,a[1]+(b[1]-a[1])*.5+dx/l*o*out,r,dx/l,dy/l])}
 pts.forEach((q,j)=>{if(grp)usGrp=grp+(j&1);usPart();const r=q[2];msE(q[0],q[1],r*1.05,r*.85,MSW.plate);
  if(r>2.6&&(j%3)===1){const hx=Math.round(q[0]-r*.3),hy=Math.round(q[1]-r*.45);usF(hx,hy,'h')}});usGrp=g0;return pts}
function msWyvern(v,st,fr,va,k,juv){k=k||1;const p=msWyPose(st,fr,va),W=MSW;
 if(p.dead){msWyDead(v,k,juv);return}
 const big=k>.7,hs=juv?1.5:1.3,ws=juv?.88:1,DY=6,cs=Math.cos(p.pitch),sn=Math.sin(p.pitch),
  T=(x,y)=>{const dx=x,dy=y+46;return[(dx*cs-dy*sn+p.bx)*k,(-46+dx*sn+dy*cs+DY+p.by+p.low)*k]},TL=L=>L.map(q=>T(q[0],q[1])),R=r=>Math.max(.7,r*k),BD=juv?msT0:(x,y)=>((x+y)&1)?0:-1,PR=r=>big?r*k:Math.min(1.7,r*k*.9);
 /* ---- a wing (far: behind the body, near: in front) ---- */
 const wing=(far)=>{const D=far?MSW_FAR:MSW_NEAR,ph=MSW_PH[p.ph],ca=Math.cos(ph[2]),sa=Math.sin(ph[2]),s0=D.s,
   P=q=>{let x=q[0]*ph[0]*ws,y=q[1]*ph[1]*ws;const xr=x*ca-y*sa,yr=x*sa+y*ca;return T(s0[0]+xr,s0[1]+yr)};
  const s=T(s0[0],s0[1]),e=P(D.e),w=P(D.w),t=D.t.map(P),b=P(D.b),lerp=(a,c,f)=>[a[0]+(c[0]-a[0])*f,a[1]+(c[1]-a[1])*f],
   sc=(a,c)=>{const m=lerp(a,c,.5);return lerp(m,w,.2)};
  const mem=far?W.memF:W.mem,dith=(x,y)=>far?0:((x&1)&&!((x+y)&3))?1:0;
  usPart();msPoly([s,e,w,t[0],sc(t[0],t[1]),t[1],sc(t[1],t[2]),t[2],sc(t[2],b),b],mem,(x,y)=>dith(x,y)-(far?0:0));
  if(far&&big){for(const f of[[.35,.3],[.55,.55],[.25,.62]]){const q=lerp(lerp(w,t[0],f[0]),lerp(t[1],b,f[0]),f[1]),x=Math.round(q[0]),y=Math.round(q[1]);
   for(const d of[[0,0],[1,0],[2,0],[-1,1],[0,1],[1,1],[2,1],[0,2],[1,2]])if(usHas(x+d[0],y+d[1]))usF(x+d[0],y+d[1],'X');if(usHas(x,y))usF(x,y,'x')}}
  else if(big){for(const f of[[.4,.35],[.6,.6]]){const q=lerp(lerp(w,t[0],f[0]),lerp(t[1],b,f[0]),f[1]),x=Math.round(q[0]),y=Math.round(q[1]);for(const d of[[0,0],[1,0],[0,1],[1,1],[2,1]])if(usHas(x+d[0],y+d[1]))usF(x+d[0],y+d[1],'X');if(usHas(x,y))usF(x,y,'x')}}
  // finger bones: thin crimson, a pale highlight along each
  for(let i=1;i<3;i++){usPart();msL(w[0],w[1],t[i][0],t[i][1],W.bone,0);if(big){const a=lerp(w,t[i],.2),c=lerp(w,t[i],.62);msFL(a[0],a[1],c[0],c[1],'q')}}
  // the leading edge (wrist to the long tip): a plated crimson spar
  usPart();msTube([w,lerp(w,t[0],.5),t[0]],u=>R(1.5-u*.9),W.spar);if(big){const a=lerp(w,t[0],.08),c=lerp(w,t[0],.7);msFL(a[0],a[1]-1,c[0],c[1]-1,'g')}
  // the arm: shoulder, elbow, wrist, thick and plated
  usPart();const A=msTube([s,e,w],u=>R(2.7-u*1.2),W.spar);if(big)for(let i=4;i<A.length-2;i+=6){const q=A[i];usB(Math.round(q[0]+1),Math.round(q[1]+1),-1);usB(Math.round(q[0]+2),Math.round(q[1]),-1)}
  if(big){const a=lerp(s,e,.3),c=lerp(e,w,.6);msFL(a[0]-1,a[1]-1,c[0]-1,c[1]-1,'q')}
  // the wrist claw: an ice-pale spike out of the joint
  const dx=w[0]-e[0],dy=w[1]-e[1],l=Math.hypot(dx,dy)||1;usPart();msL(w[0],w[1],w[0]+dx/l*R(4),w[1]+dy/l*R(4)-R(1),W.claw,1)};
 /* ---- a hind leg: thigh, red band, shin, ice claws ---- */
 const leg=(far)=>{const o=far?[10,-2]:[0,0],h=[-5+o[0],-39+o[1]],kn=p.legs?[h[0]+8,h[1]+7]:[h[0]-3,h[1]+11],an=p.legs?[kn[0]+6,kn[1]+3]:[kn[0]-2,kn[1]+7],
   fo=p.legs?[an[0]+3,an[1]+1]:[an[0]+1,an[1]+2],RB=far?W.bodyD:W.body;
  usPart();const th=T((h[0]+kn[0])/2,(h[1]+kn[1])/2);msE(th[0],th[1],R(juv?4.4:5.4),R(juv?5:6.6),RB,far?0:BD);
  if(big){usPart(1);const q=T(kn[0]+(h[0]-kn[0])*.2,kn[1]+(h[1]-kn[1])*.2);msEin(q[0],q[1],R(5.6),R(1.7),W.plate,0)}
  usPart();msTube(TL([kn,an,fo]),u=>R(3.1-u*1.1),RB,far?null:BD);if(big&&!far){usPart(1);const q=T(an[0],an[1]-1);msEin(q[0],q[1],R(3),R(1.2),W.plate,0)}
  usPart();const f=T(fo[0],fo[1]);const cl=p.legs?[[3,-1],[3,1.5],[1.5,3]]:[[-1.6,3],[.4,3.6],[2.4,2.8]];
  if(juv){usP(Math.round(f[0]),Math.round(f[1]+1),W.claw,0);usP(Math.round(f[0]+1),Math.round(f[1]+1),W.claw,0)}else for(const c of cl)msL(f[0]+c[0]*.2*k,f[1]+c[1]*.2*k,f[0]+c[0]*k,f[1]+c[1]*k,W.claw,0)};
 /* ---- far wing, far leg ---- */
 usGrp=1;wing(1);usGrp=2;if(v===0)leg(1);
 /* ---- the tail (in front of the body in the back view) ---- */
 const tail=()=>{usPart();const S=msTube(TL(p.tail||[[-11,-39],[-21,-40],[-28,-33],[-29,-22],[-23,-12],[-14,-8],[-6,-9]]),u=>R((juv?4.4:6)-u*(juv?2.6:3.8)),W.body,BD);
  const n=S.length;if(v===0&&big)for(let i=4;i<n-6;i++){const a=S[i-1],b=S[i],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,r=(5.4-i/n*3.4)*k*.55;usB(Math.round(b[0]+dy/l*r),Math.round(b[1]-dx/l*r),1)}
  msRidge(S,.02,juv?.8:.9,big?3.8:3.4,u=>PR(Math.max(1.5,3.2-u*1.8)),u=>Math.max(.6,(5.4-u*3.4)*k*(juv?.7:.92)),-1,big?10:0);
  const e=S[n-1],e2=S[Math.max(0,n-8)],dx=e[0]-e2[0],dy=e[1]-e2[1],l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l,nx=-uy,ny=ux,s2=k*(juv?1.6:1.05);
  // the spade: a crimson arrowhead with barbs, a pale spike rising out of it
  usPart();msPoly([[e[0]-ux*2*s2,e[1]-uy*2*s2],[e[0]-ux*4*s2+nx*4.5*s2,e[1]-uy*4*s2+ny*4.5*s2],[e[0]+ux*8*s2,e[1]+uy*8*s2],[e[0]-ux*4*s2-nx*4.5*s2,e[1]-uy*4*s2-ny*4.5*s2]],W.plate);
  const sp=[-ux*.4+nx*.92,-uy*.4+ny*.92],sg=sp[1]>0?-1:1;usPart();msL(e[0]+ux*s2,e[1]+uy*s2,e[0]+ux*s2+sp[0]*sg*6*s2,e[1]+uy*s2+sp[1]*sg*6*s2,W.horn,1);
  if(big)usF(Math.round(e[0]+ux*4*s2),Math.round(e[1]+uy*4*s2),'h')};
 usGrp=3;if(v===0)tail();
 /* ---- body: haunch and chest, the pale belly, the ridge down the back ---- */
 usGrp=8;usPart();const bc=T(-6,-40),cc=T(7,-51);msE(bc[0],bc[1],R(juv?10:11.5),R(juv?8:8.6),W.body,BD);msE(cc[0],cc[1],R(juv?9:10.5),R(juv?8:9.6),W.body,BD);
 if(v===0){usPart(1);const q=T(2,-40);msEin(q[0],q[1],R(15),R(4.2),W.belly,(x,y)=>(y&1)&&big&&((x+y)&3)===0?-1:0);
  if(big){const q2=T(-6,-38.5);for(let x=-6;x<=6;x+=4)usB(Math.round(q2[0]+x),Math.round(q2[1]),1)}}
 // neck (its own tube, so the head turns on it)
 const hd=juv?[p.head[0]-7,p.head[1]-5]:[p.head[0]-3,p.head[1]-4],nk=juv?[p.neck[0]-3,p.neck[1]-3]:[p.neck[0]-2,p.neck[1]-6];usPart();const NS=msTube(TL([[7,-55],nk,[(nk[0]+hd[0])/2,(nk[1]+hd[1])/2-1],[hd[0]-5,hd[1]-1]]),u=>R((juv?6.5:6.2)-u*2),W.body,BD);
 if(v===0){usPart(1);for(let i=2;i<NS.length-4;i++){const q=NS[i];usP(Math.round(q[0]+R(2.6)),Math.round(q[1]+R(2.6)),W.belly,(i&3)===0&&big?-1:0);if(big)usP(Math.round(q[0]+R(3.6)),Math.round(q[1]+R(2.1)),W.belly,0)}}
 // ridge: neck base to the tail root (behind the wings), then the neck
 const back=msSpline(TL([[-14,-45],[-6,-51],[2,-57],[10,-60]]),.5);
 msRidge(back,0,1,big?4.2:3,u=>PR(v===1?4:3.8),u=>(v===1?1.2:2.6)*k,1,big?12:0);
 if(v===1&&big)msRidge(msSpline(TL([[-16,-45],[-6,-48],[6,-51],[14,-53]]),.5),0,1,3.6,u=>PR(3),u=>1.6*k,1,big?14:0);
 msRidge(NS,.02,.92,big?3.6:3,u=>PR(3.6-u*1.1),u=>(v===1?2.4:3.6)*k*(juv?1.2:1),1,big?12:0);
 /* ---- head: an angular skull pointing down-forward, crimson crown and snout ridge, blue cheek and jaw ---- */
 msWyHead(T(hd[0],hd[1]),p.ha*(juv?.6:1)+p.pitch,k*hs,v,p.jaw,p.eye,big,BD);
 /* ---- near leg, near wing ---- */
 usGrp=4;if(v===0)leg(0);
 if(v===1){usGrp=3;tail()}
 usGrp=5;wing(0);usGrp=0}
/* the head (H its centre on screen, ha its tilt, hk its scale): horns, skull, crimson crown, eye, jaw */
function msWyHead(H,ha,hk,v,jaw,eye,big,BD){const W=MSW,hc=Math.cos(ha),hsn=Math.sin(ha),
  Q=(u,w)=>[H[0]+(u*hc-w*hsn)*hk,H[1]+(u*hsn+w*hc)*hk],QL=L=>L.map(q=>Q(q[0],q[1]));usGrp=8;
 // horns first (behind the skull): two pale swept-back horns
 usPart();msTube(QL([[-4,-4],[-9,-9],[-14,-11]]),u=>Math.max(.6,(1.7-u*1.3)*hk),W.horn);usPart();msTube(QL([[0,-5],[-3,-10],[-7,-14]]),u=>Math.max(.6,(1.6-u*1.2)*hk),W.horn);
 usPart();msPoly(QL([[-8,-3.5],[-3,-7],[3,-6.2],[9,-3],[10.8,-.4],[10,2.4],[4,3],[-3,4.6],[-8,2.6]]),W.body,BD);
 usGrp=9;usPart();msPoly(QL([[-8,-3.5],[-5,-6],[-3,-7.4],[-1,-6.2],[1,-7.4],[3,-6.4],[9,-3.2],[10.8,-.8],[9,-.8],[4,-3],[-2,-3.4],[-7,-1.4]]),W.plate);
 if(big){usF(...Q(4,-4.3).map(Math.round),'h');usF(...Q(7,-3.2).map(Math.round),'h')}usGrp=8;
 if(v===0||!big){const ey=Q(1,-1.6).map(Math.round);if(eye){usF(ey[0],ey[1],'0');usF(ey[0]+1,ey[1],'0')}else{usF(ey[0],ey[1],'F');usF(ey[0]+1,ey[1],'r');if(big){usF(ey[0]-1,ey[1]-1,'0');usF(ey[0],ey[1]-1,'0');usF(ey[0]+1,ey[1]-1,'0')}}}
 {const ns=Q(9.6,-.4).map(Math.round);usF(ns[0],ns[1],'0')}
 // the jaw: closed a blue line with pale teeth; open, dropped, the red mouth showing
 if(jaw){usPart();msPoly(QL([[-3,3],[3,4.6],[10,8.6],[9,10.4],[2,8],[-4,5.2]]),W.body);usPart(1);msPoly(QL([[1,3.2],[10.4,2.4],[9.6,7.4],[2,5]]),usRamp('0fg',1));
  if(big){for(const u of[3.5,6,8.5]){usF(...Q(u,2.6).map(Math.round),'r');usF(...Q(u+.3,5.8+u*.2).map(Math.round),'q')}}}
 else{usPart();msPoly(QL([[-3,3],[4,3],[9.8,2.4],[9.4,4.6],[3,5.6],[-4,5]]),W.body);if(big)for(const u of[3,5.5,8])usF(...Q(u,3.2).map(Math.round),'q');usF(...Q(9,3.2).map(Math.round),'0')}
 if(v===0&&big){usPart(1);const c=Q(-1,3);msEin(c[0],c[1],2.6*hk,1.4*hk,W.belly,0)}}
function msWyDead(v,k,juv){const W=MSW,R=r=>Math.max(.7,r*k),big=k>.7,hs=juv?1.4:1,T=(x,y)=>[x*k,y*k];usGrp=3;
 usPart();const S=msTube([T(-14,-6),T(-30,-5),T(-42,-8),T(-52,-4),T(-58,-3)],u=>R(4.6-u*3),W.body);
 msRidge(S,.05,.9,3.4,u=>Math.max(1,(2.8-u*1.4)*(big?k:k*1.6)),u=>R(3-u*2),-1,big?10:0);
 {const e=S[S.length-1],s2=k*(juv?1.6:1.05);usPart();msPoly([[e[0]+2*s2,e[1]],[e[0]-1*s2,e[1]-4*s2],[e[0]-8*s2,e[1]],[e[0]-1*s2,e[1]+2*s2]],W.plate)}
 usGrp=8;usPart();const b=T(-2,-8);msE(b[0],b[1],R(16),R(7),W.body);usPart(1);msEin(b[0]+R(1),b[1]+R(4.5),R(14),R(2.6),W.belly,0);
 usPart();const N=msTube([T(10,-9),T(20,-7),T(28,-5)],u=>R(5.4-u*2),W.body);msRidge(N,.1,.9,3.2,u=>2.6*(big?k:k*1.4),u=>R(3),1,big?12:0);
 msRidge(msSpline([T(-16,-12),T(-4,-15),T(10,-13)],.5),0,1,3.6,u=>3*(big?k:k*1.5),u=>R(1.6),1,big?12:0);
 const hk=k*hs,H=T(34,-5),Q=(u,w)=>[H[0]+u*hk,H[1]+w*hk],QL=L=>L.map(q=>Q(q[0],q[1]));usGrp=8;
 usPart();msTube(QL([[-4,-3],[-10,-6],[-14,-6]]),u=>Math.max(.6,(1.6-u*1.2)*hk),W.horn);
 usPart();msPoly(QL([[-8,-3],[-3,-5],[3,-4.5],[11,-1.5],[12.5,1],[11,3.5],[3,4],[-8,3]]),W.body);usGrp=9;usPart();msPoly(QL([[-8,-3],[-3,-5.2],[3,-4.7],[11,-1.7],[12.5,.5],[4,-1.8],[-7,-.5]]),W.plate);usGrp=8;
 if(v===0){const e=Q(1,-.8).map(Math.round);usF(e[0],e[1],'0');usF(e[0]+1,e[1],'0')}
 usPart();for(const c of[[-8,-1],[-6,-1]]){const f=T(c[0],c[1]);msL(f[0],f[1],f[0]+2*k,f[1],W.claw,0)}
 // a wing draped over it, the other crumpled behind
 usGrp=5;const s=T(4,-12),w=T(-14,-26),t0=T(-40,-20),t1=T(-34,-6),t2=T(-20,-3);usPart();msPoly([s,w,t0,[(t0[0]+t1[0])/2+2*k,(t0[1]+t1[1])/2-1*k],t1,t2,T(-6,-8)],W.mem,(x,y)=>(x+y)&1);
 usPart();msTube([s,w],u=>R(2.4-u*.8),W.plate);usPart();msTube([w,t0],u=>R(1.3-u*.5),W.plate);usPart();msL(w[0],w[1],t1[0],t1[1],W.bone,0);usPart();msL(w[0],w[1],t2[0],t2[1],W.bone,0);
 usPart();msL(w[0],w[1],w[0]+2*k,w[1]-3*k,W.claw,1);usGrp=0}
function msHatch(v,st,fr,va){msWyvern(v,st,fr,va,.46,1)}

/* ================= CARAVAN WAGON (the escort contract's VIP: CVIP.wagon of 16-contracts.js) ================= */
/* a covered merchant wagon: a plank bed on two pairs of spoked wheels, a canvas cover over hoops with a madder stripe, a driver's
   bench with a sack and a crate up front, a tongue and yoke for the (absent) ox, a pennant on a pole. Drawn in world units
   (a along the wagon, + to the front; b across, + the near side; h up) and projected iso: v 0 the front goes screen-down-right
   (the near side and the front end show), v 1 the front goes up-right (the near side and the open rear show). States: idle (the
   pennant flutters), hit (a jolt), death (a wheel breaks off, the bed slumps, the cover caves in). */
const MSG={wood:usRamp('aijk',2),woodD:usRamp('0aij',2),wheel:usRamp('aijk',2),iron:usRamp('Gop',1),can:usRamp('nmle',2),canS:usRamp('fgh',1),
 crate:usRamp('ijkc',2),sack:usRamp('jkmn',2),dark:usRamp('01a',1)};
function msWgPose(st,fr){const p={ox:0,oy:0,ta:0,tb:0,dh:0,sq:1,sag:0,brk:0,fl:fr&1,dead:0};
 switch(st){
  case'hit':if(fr===0){p.ox=-2;p.oy=-1;p.ta=.08;p.tb=.1}else{p.ox=1;p.ta=-.04};break;
  case'death':if(fr===0){p.ox=-1;p.ta=.08;p.tb=.1;p.brk=1}else if(fr===1){p.ta=-.1;p.tb=-.14;p.dh=-1;p.sq=.8;p.sag=.25;p.brk=2}else{p.dead=1;p.ta=-.08;p.tb=-.18;p.dh=-3;p.sq=.42;p.sag=.5;p.brk=2}break}
 return p}
function msWagon(v,st,fr){const p=msWgPose(st,fr),G=MSG,vis=v===0?1:-1,R=Math.round;
 // world -> screen (the bed's tilt and drop apply to everything fixed to it)
 const K=1.15,Wg=(a,b,h)=>{a*=K;b*=K;h*=K;return v===0?[a-b+p.ox,(a+b)/2-h+p.oy]:[a+b+p.ox,(b-a)/2-h+p.oy]},W=(a,b,h)=>Wg(a,b,h+a*p.ta+b*p.tb+p.dh);   // world scale K: a touch bigger than a man   // on the ground (no tilt)
 const quad=(P,Rp,tex)=>msPoly(P,Rp,tex);
 const A0=-11,A1=9,B0=5,H0=4,H1=9;
 // a wheel in the a-h plane at (a0,b0), hub height hh, radius r; spokes 6; br: 0 whole, 1 cracked
 const wheel=(a0,b0,hh,r,fixed,br)=>{const T=fixed?W:Wg;usPart();const pts=[];for(let i=0;i<24;i++){const t=i/24*Math.PI*2;pts.push(T(a0+Math.cos(t)*r,b0,hh+Math.sin(t)*r))}msPoly(pts,G.wheel);
  for(let rho=0;rho<=1.001;rho+=.08)for(let t=0;t<Math.PI*2;t+=.05){const q=T(a0+Math.cos(t)*r*rho,b0,hh+Math.sin(t)*r*rho),x=Math.floor(q[0]+.5),y=Math.floor(q[1]+.5);
   if(rho>.74){if(rho>.92)usF(x,y,'i')}else if(rho<.3)usF(x,y,rho<.15?'G':'o');
   else{const sp=((t*6/(Math.PI*2))%1+1)%1;const on=sp<.17||sp>.83;if(!on||(br&&t>2.2&&t<3.4&&rho>.5))usF(x,y,'1');else usF(x,y,(t>Math.PI?'k':'j'))}}};
 const flatWheel=(a0,b0,r)=>{usPart();const pts=[];for(let i=0;i<24;i++){const t=i/24*Math.PI*2;pts.push(Wg(a0+Math.cos(t)*r,b0+Math.sin(t)*r,.5))}msPoly(pts,G.wheel);
  for(let rho=0;rho<.74;rho+=.08)for(let t=0;t<Math.PI*2;t+=.05){const q=Wg(a0+Math.cos(t)*r*rho,b0+Math.sin(t)*r*rho,.5),x=Math.floor(q[0]+.5),y=Math.floor(q[1]+.5),sp=((t*6/(Math.PI*2))%1+1)%1;
   usF(x,y,rho<.3?'o':sp<.17||sp>.83?'j':'a')}};
 const hubH=p.dead?3:4.6;
 // far wheels (behind the bed)
 usGrp=1;if(!p.dead||true){wheel(-6,-B0-1,hubH,4.6,1,0);if(!p.dead)wheel(5,-B0-1,hubH-.6,4,1,0)}
 // tongue and yoke at the far end (v 1: the front is away from us)
 const tongue=()=>{usPart();const t0=W(A1,0,3.4),t1=p.dead?Wg(A1+7,0,.5):Wg(A1+7,0,2);msL(t0[0],t0[1],t1[0],t1[1],G.woodD,0);const y0=p.dead?Wg(A1+7,-3,.5):Wg(A1+7,-3,2),y1=p.dead?Wg(A1+7,3,.5):Wg(A1+7,3,2);msL(y0[0],y0[1],y1[0],y1[1],G.woodD,1)};
 if(v===1){usGrp=6;tongue()}
 // the bed: floor, near side, visible end
 usGrp=2;usPart();quad([W(A0,-B0,H1-1),W(A1,-B0,H1-1),W(A1,B0,H1-1),W(A0,B0,H1-1)],G.woodD);
 usPart();quad([W(A0,B0,H0),W(A1,B0,H0),W(A1,B0,H1),W(A0,B0,H1)],G.wood,(x,y)=>0);
 for(let a=A0;a<=A1;a+=.5){for(const hh of [H0+2.5]){const q=W(a,B0,hh);usB(Math.floor(q[0]+.5),Math.floor(q[1]+.5),-1)}}
 for(const a of [A0+1,A1-1,(A0+A1)/2]){const q0=W(a,B0,H0+.5),q1=W(a,B0,H1-.5);msFL(q0[0],q0[1],q1[0],q1[1],'o')}
 const ae=vis>0?A1:A0;usPart();quad([W(ae,B0,H0),W(ae,-B0,H0),W(ae,-B0,H1),W(ae,B0,H1)],G.wood);
 {const q0=W(ae,B0,H0+2.5),q1=W(ae,-B0,H0+2.5);for(let i=0;i<=10;i++){usB(R(q0[0]+(q1[0]-q0[0])*i/10),R(q0[1]+(q1[1]-q0[1])*i/10),-1)}}
 // the bench and the load up front (v 0 in view; v 1 behind the cover)
 const front=()=>{usGrp=4;const sk=W(6.5,1.5,H1);usPart();msE(sk[0],sk[1]-2,2.6,2.3,G.sack);usF(R(sk[0]),R(sk[1])-4,'j');
  const cr=W(4.5,-2.5,H1);usPart();msPoly([[cr[0]-3,cr[1]],[cr[0]+3,cr[1]+0],[cr[0]+3,cr[1]-4],[cr[0]-3,cr[1]-4]],G.crate);for(let i=-2;i<=2;i++)usF(R(cr[0])+i,R(cr[1])-2,'i');
  usPart();const b0=W(A1-.5,B0,H1+1),b1=W(A1-.5,-B0,H1+1);msL(b0[0],b0[1],b1[0],b1[1],G.wood,1)};
 const pen=()=>{usGrp=4;usPart();const s0=W(A1-1,-B0+.5,H1),s1=W(A1-1,-B0+.5,H1+13);msL(s0[0],s0[1],s1[0],s1[1],G.woodD,1);usPart(1);const tx=R(s1[0]),ty=R(s1[1]),d=vis>0?-1:1,f=p.fl;
  for(let i=0;i<5;i++)for(let j=0;j<=Math.max(0,2-(i>>1));j++){usP(tx+d*(i+1),ty+j+(i>2&&f?1:0),G.canS,j===0?1:0)}};
 if(!p.dead&&v===1){pen();front()}
 // the cover: half an ellipse-cylinder over the bed, ribs every few units, a madder stripe low on the side
 const C0=-10,C1=3.5,CR=B0+.6,CH=8*p.sq,ch0=H1;
 usGrp=3;usPart();
 const cov=(a,th)=>{const s=1-p.sag*Math.sin(Math.PI*(a-C0)/(C1-C0))*Math.sin(th);return W(a,CR*Math.cos(th),ch0+CH*Math.sin(th)*s)};
 for(let a=C0;a<=C1;a+=.25)for(let th=0;th<=Math.PI;th+=.04){if(Math.cos(th)+.9*Math.sin(th)<-.05)continue;const q=cov(a,th),x=Math.floor(q[0]+.5),y=Math.floor(q[1]+.5);
  const rib=[C0+.5,C0+4.8,C0+9.1,C1-.4].some(r=>Math.abs(a-r)<.3),dg=th*180/Math.PI;
  const stripe=dg>18&&dg<34;let b=dg>60&&dg<125?1:dg<10?-1:0;if(rib)b-=1;if(p.sag&&((x*3+y*5)%7===0))b-=1;usP(x,y,stripe?G.canS:G.can,b)}
 // the visible end of the cover: v 0 the front (the driver's side, a dark mouth), v 1 the rear (the mouth shows crates inside)
 {const ce=vis>0?C1:C0;usPart();for(let rho=0;rho<=1.001;rho+=.05)for(let th=0;th<=Math.PI;th+=.03){const q=W(ce,CR*rho*Math.cos(th),ch0+CH*rho*Math.sin(th)*(1-p.sag*.5)),x=Math.floor(q[0]+.5),y=Math.floor(q[1]+.5);
   if(rho>.8)usP(x,y,G.can,rho>.93?0:-1);else usP(x,y,G.dark,rho<.5?-1:0)}
  if(v===1&&!p.dead){usPart();const c=W(ce,1.5,ch0),c2=W(ce,-2,ch0);msPoly([[c[0]-1,c[1]],[c[0]+3,c[1]],[c[0]+3,c[1]-3],[c[0]-1,c[1]-3]],G.crate);usF(R(c[0])+1,R(c[1])-2,'b');
   usPart();msE(c2[0]+1,c2[1]-2,2,2.2,G.sack)}}
 if(!p.dead&&v===0){front();pen()}
 if(v===0){usGrp=6;tongue()}
 // near wheels
 usGrp=5;wheel(-6,B0+1,hubH,4.6,1,p.brk===1?1:0);if(p.brk<2)wheel(5,B0+1,hubH-.6,4,1,p.brk);
 if(p.brk>=2){usGrp=7;flatWheel(p.dead?9:6,B0+5,4);if(p.dead){usPart();const c=Wg(2,B0+7,0);msPoly([[c[0]-3,c[1]],[c[0]+3,c[1]+1],[c[0]+4,c[1]-3],[c[0]-2,c[1]-4]],G.crate);usF(R(c[0]),R(c[1])-2,'i');
   usPart();msE(c[0]+8,c[1]-1,2.6,2,G.sack)}}
 // broken hoops poking out of the collapsed cover
 if(p.dead){usGrp=3;usPart();for(const [a,bb] of [[-6,3],[0,-2]]){const q0=W(a,bb,ch0+CH*.5),q1=W(a+1,bb+1,ch0+CH+4);msL(q0[0],q0[1],q1[0],q1[1],G.woodD,0)}}
 usGrp=0}

/* ================= ICONS: monster abilities and statuses (16x16, outlined at load; added to ICONS of 06-icons.js) ================= */
const MS_ICSRC=`
@st-venom
.......A........
......AAB.......
......AeB.......
.....AAeAB......
.....AeAAB......
....AAeAAAB.....
....AeAAAAB.....
...AAeAACAAB....
...AAAACDCAB....
...AAAAACAAB....
...BAAAAAABB....
....BAAAABB.....
.....BBBBB......
@st-coiled
.........kkk....
........kkgkk...
........kkkkk...
.........jjj....
....jjjjjjjj....
...jkkkkkkkkj...
...jjajjajjjj...
....jkkkkkkkkj..
....jjajjajjjj..
...jkkkkkkkkj...
...jjajjajjjj...
....jkkkkkkkj...
.....aaaaaaa....
@st-entangled
..v.........v...
.vBv..j....vBv..
..vj..j.....j...
...jj.j....jj...
....j.jj..j.....
....jj.jjjj.....
.....jjj.j......
...j..jj..j.....
...jj.jjj.jj....
....jjjjjjj.....
..iijjjjjjjii...
.iiiiiiiiiiiii..
@st-bark
..jjjjjjjjjjj...
.jkjkjkjkjkjkj..
.jkajkajkajkaj..
.jkajkmjkajkaj..
.jkajkajkajkaj..
.jkajkajkmjkaj..
..jkajkajkajj...
..jkmjkajkajj...
...jkajkajkj....
....jkajkaj.....
.....jkajj......
......jjj.......
@st-regrow
...........A....
..........AeA...
...........A....
.......AA.......
......AvvA......
..AA..AvvA......
.AvvA..AA.......
.AvvvA.B........
..AvvAB.........
....ABB.........
......B.........
......B.........
....jjjjj.......
...jkkkkkj......
@st-diving
.g...........g..
.gg.........gg..
.ggg.......ggg..
..ggf.....fgg...
...gfK...Kfg....
....fKKhKKf.....
......KhK.......
......KhK.......
.......h........
....y..h..y.....
....yy...yy.....
.....yyyyy......
......yyy.......
.......y........
@st-grounded
..ff............
..fKf...........
..fKKf..........
..fKKKf.........
..fKKKKf........
..fKKKK.........
..fKK.K.f.......
..fK..KKf.......
..f...KKKf......
.......KKf......
........ff......
..nnnnnnnnnnnn..
.nmmmmmmmmmmmmn.
@st-slammed
...y.......y....
..yey.....yey...
...y.......y....
.......d........
......ded.......
.......d........
................
..mmm......mmm..
.mlllm....mlllm.
mllmllm..mllmllm
..0..0.....0....
.0....0...0.0...
@ab-vbite
.ffffffffffff...
.fggggggggggf...
..lll....lll....
..lrl....lrl....
..lrl....lrl....
...rl.....rl....
...rl.....rl....
....l......l....
....A......A....
....A......A....
....AA.....AA...
.....A......A...
@ab-slither
..........jkk...
.........jkgk...
........jkkk....
.......jk.......
......jk........
.....jk.........
....jkkkkj......
.....jjjjkj.....
..........kj....
.........kj.....
..q.....kj......
.qq...jkj.......
qq...jkj........
....jj..........
@ab-vspit
..BBB...........
.BvvvB..........
BvvyvvB.....A...
BvvvvvvvB..AeA..
.BvvvvvvB...A...
..BvvvB...A.....
..BwvB...AeA....
..BwvB....A.....
..BwvB..........
..BwvB.......A..
.BBwvBB.....AeA.
BwwvvvwB.....A..
@ab-coil
........ccc.....
.......ccEcc....
.......ccccc....
........bbb.....
...bbbbbbbbb....
..bccccccccb....
..bbabbabbbb....
...bccccccccb...
...bbabbabbbb...
..bccccccccb....
..bbabbabbbb....
...aaaaaaaa.....
@ab-constrict
........ccc.....
.......ccEcc....
.g.....ccccc..g.
.gg.....bbb..gg.
.ggbbbbbbbbbbgg.
.gbccccccccccbg.
..bbabbabbabbb..
.gbccccccccccbg.
.ggbbabbabbbbgg.
.gg..........gg.
.g............g.
@ab-bramble
............k...
...........kj...
..........kj.g..
.........kj.....
....m...kj......
...mkm.kj.m.....
......kjjmkm....
.....kj..m......
....kj..........
...kj.m.........
..kj.mkm........
.kj...m.........
kj..............
@ab-entangle
..A.........A...
.AvA..j....AvA..
..vj..j.....j...
...jj.j....jj...
....j.jj..j.....
....jj.jjjj.....
.....jjj.j......
...j..jj..j.....
...jj.jjj.jj....
.yy.jjjjjjj.yy..
.yiijjjjjjjiiy..
.iiiiiiiiiiiiii.
@ab-limbcrush
..jj........jj..
..jkj......jkj..
...jkj....jkj...
....jkj..jkj....
.....jkjjkj.....
......jkkj......
.......kk.......
.....y.kk.y.....
....yey..yey....
...y..y..y..y...
..mmmmmmmmmmmm..
.m0mm0mmm0mm0mm.
@ab-groots
.j....j....j....
.jj..jj...jj..j.
..j..j....j..jj.
..jj.jj..jj..j..
...j..j..j..jj..
...jj.jjjj.jj...
....jjjjjjjj....
...jjjjjjjjjj...
..ijjjjjjjjjji..
.iiiijjjjjjiiii.
iiiiiiiiiiiiiiii
@ab-grove
......BvvB......
....BvvAvvB.....
...BvAvvvgvB....
...BvvvgvvAB....
....BvAvvvB.....
......BjB.......
.......j........
.....j.j.j......
......jjj.......
.......j........
....iijjjii.....
...iiiiiiiii....
@ab-ohurl
.........kk.....
........kjk.....
.......kjkp.....
......kjkp......
.....jjk........
....jj..........
...jj......r....
..jj.......rr...
..a....rrrrrrr..
.......rrrrrrrr.
...........rr...
...........r....
@ab-osweep
......kk........
.....kjkp.......
....kjkp........
...jjkp.........
..jj............
.jj.......rr....
.a..........r...
..............r.
...............r
..............r.
............rr..
.......rrrr.....
@ab-oslam
......tts.......
.....tuttt......
.....tuuts......
.....ttttt......
......uut.......
......uut.......
..y...uut...y...
.y.y..uut..y.y..
....y.....y.....
mmmmmm0mm0mmmmmm
mlllm0llll0mllm.
.mm.0.mmmm.0.mm.
@ab-wbite
.............hh.
.gggggggggg.hgh.
gKKKKKKKKKKgggh.
gKe0KKKKKKKKKKg.
gKKKKKKKKKKKKgg.
.ggrgrgrgrgrg...
....fffffff.....
.grgrgrgrgrgg...
gKKKKKKKKKKKKg..
.gggggggggggg...
@ab-wsting
..........pq....
.........pqr....
........pqqr....
.......pqqr.....
......Kpqr......
.....KgKp.......
....KgK.........
...KgK.....A....
..KgK.....AeA...
.KgK.......A....
KgK.............
gK..............
@ab-wbuffet
.ff.............
.fKf............
.fKKf...rrr.....
.fKKKf.....rr...
.fKKKKf......r..
.fKKKKKf...rrr..
.fKKKKKKf.....r.
.fKKKKKKKf..rr..
..fKKKKKKKf.....
...ffKKKKfrrr...
.....fffff...r..
..........rr....
@ab-wdiveb
.......y........
...y...y...y....
....y..y..y.....
.....y.y.y......
.......e........
..yyyyeEeyyyy...
.......e........
.....y.y.y......
....y..y..y.....
.mmmmmmmmmmmmm..
mlll0lllll0llm..
.mm0.mmmm.0.mm..
`;
(function(){if(typeof ICONS!=='object'||typeof _icOutline!=='function')return;let n=null,buf=[];const put=()=>{if(!n)return;const rows=buf.slice(0,16);const top=Math.max(0,Math.floor((15-rows.length)/2));const R=[];for(let i=0;i<16;i++){const r=rows[i-top]||'';R.push((r+'................').slice(0,16))}
  ICONS[n]=_icOutline(R);try{if(typeof icCss==='function')icCss(n)}catch(e){}};
 for(const ln of MS_ICSRC.split('\n')){if(ln[0]==='@'){put();n=ln.slice(1).trim();buf=[]}else if(n&&ln.length)buf.push(ln)}put();
 const al={'ab-barkskin':'st-bark','ab-wdive':'st-diving','ab-hsting':'ab-wsting','ab-limb':'ab-limbcrush'};for(const k in al)if(ICONS[al[k]]&&!ICONS[k]){ICONS[k]=ICONS[al[k]];try{if(typeof icCss==='function')icCss(k)}catch(e){}}})();

/* ================= API: build, cache ================= */
const MSD={adder:msAdder,viper:msViper,gserpent:msGserpent,ent:(v,st,fr,va)=>msEnt(v,st,fr,va,MS_ENT),elder:msElder,thorn:msThorn,ogre:(v,st,fr,va)=>msOgre(v,st,fr,va,0),aogre:msAogre,wyvern:(v,st,fr,va)=>msWyvern(v,st,fr,va,1.1),hatch:msHatch,wagon:msWagon};
const MS_VAR={attack:1,cast:1};
function msBuild(kind,face,st,fr,va){if(typeof document==='undefined')return null;const K=MSK[kind],t0=typeof performance!=='undefined'?performance.now():0,v=face>=2?1:0,mir=face===1||face===2;
 if(typeof usGrid!=='function'||typeof usResolve!=='function')return null;msBegin(K);
 try{MSD[kind](v,st,fr,va||'')}catch(e){if(!MS.err){MS.err=1;if(typeof console!=='undefined')console.error('monster sprite',kind,st,fr,e)}}
 if(mir)usFlip(usG);const cv=usResolve(usG,true);MS.builds++;if(t0)MS.ms+=performance.now()-t0;return cv?{cv,ax:mir?K.g[0]-1-K.g[2]:K.g[2],ay:K.g[3]}:null}
function msNorm(kind,st){const K=MSK[kind];if(!MS_FR[st])st='idle';const F=K.fr&&K.fr[st]||MS_FR[st];return[st,F]}
function monsterSpriteOf(kind,face,state,frame,va){if(!MSK[kind]||!MSD[kind])return null;const n=msNorm(kind,state),st=n[0],F=n[1];face=((face|0)%4+4)%4;frame=((frame|0)%F+F)%F;va=MS_VAR[st]&&va?va:'';
 const id=kind+'|'+face+'|'+st+'|'+frame+'|'+va;let s=MS.fr.get(id);if(s===undefined){s=msBuild(kind,face,st,frame,va);MS.fr.set(id,s)}return s}
function monsterSpritePx(u,face,state,frame){if(typeof document==='undefined')return null;const k=monsterKind(u);if(!k||!MSD[k])return null;let va='';if(MS_VAR[state]&&typeof anVariant==='function'){try{va=anVariant(u)||''}catch(e){}}
 return monsterSpriteOf(k,face,state,frame,va)}
/* pre-build a monster's common frames (the board warms one unit and one facing a frame at the start of a battle) */
function monsterSpriteWarm(u,faces){const k=monsterKind(u);if(!k||!MSD[k])return 0;let n=0;for(let f=0;f<4;f++){if(faces&&faces.indexOf(f)<0)continue;for(const st of['idle','walk','hit']){const F=msNorm(k,st)[1];for(let i=0;i<F;i++){const id=k+'|'+f+'|'+st+'|'+i+'|';if(!MS.fr.has(id)){monsterSpriteOf(k,f,st,i,'');n++}}}}return n}
function monsterSpriteBox(u){const i=monsterInfo(u);return i.kind?{w:i.wide*2,h:i.top}:null}

/* ================= PORTRAITS: a 32x32 window on the figure's front view (idle), over the foes' portrait ground ================= */
const MS_PT={adder:[6,-9],viper:[3,-15],gserpent:[20,-40],thorn:[0,-15],ent:[2,-55],elder:[2,-60],ogre:[7,-45],aogre:[7,-47],wyvern:[34,-54],hatch:[11,-22],wagon:[1,-11]};
function msKindOfKey(x){if(!x)return null;if(typeof x==='string')return EN[x]?msKindOfId(x,EN[x]):MSK[x]?x:null;if(x.def)return monsterKind(x);if(x.n&&typeof EN==='object'){const k=msEnKey(x);return k?msKindOfId(k,x):null}return null}
/* the wyvern's portrait: a head-and-shoulders bust drawn at portrait scale (the battle sprite's head is too small to crop) */
function msWyPortrait(){if(typeof usBeginAt!=='function')return null;const W=MSW,BD=(x,y)=>((x+y)&1)?0:-1;usBeginAt(32,32,0,0);usGrp=5;
 usPart();msPoly([[-2,24],[2,4],[-2,-2],[8,-1],[10,10],[6,22]],W.mem,(x,y)=>(x+y)&1);usPart();msTube([[4,30],[6,14],[9,1]],u=>2.6-u*1,W.plate);msFL(4,22,7,6,'q');usPart();msL(9,1,10,-2,W.claw,1);
 usGrp=8;usPart();const N=msTube([[6,36],[8,27],[12,20],[16,16]],u=>6.4-u*2,W.body,BD);usPart(1);for(let i=0;i<N.length;i++){const q=N[i];msEin(q[0]+4,q[1]+3,1.6,1.6,W.belly,(i&3)===0?-1:0)}
 msRidge(N,0,.85,3.4,u=>3.4-u*.6,u=>4.6,1,12);
 msWyHead([18,15],.4,1.12,0,0,0,true,BD);usGrp=0;return usResolve(usG,true)}
const MS_PTD={wyvern:msWyPortrait};
function monsterPortrait(key){if(typeof document==='undefined')return null;const k=msKindOfKey(key);if(!k||!MSD[k])return null;let c=MS.pt.get(k);if(c!==undefined)return c;c=null;
 try{const s=MS_PTD[k]?{cv:MS_PTD[k](),ax:0,ay:0,own:1}:monsterSpriteOf(k,0,'idle',0,''),cv=pxCanvas(32,32);if(s&&s.cv&&cv){const q=cv.getContext('2d'),al=MSK[k].ally,bg0=al?PAL['3']:PAL.f,bg1=PAL[al?'2':'1'];q.fillStyle=bg0;q.fillRect(0,0,32,32);q.fillStyle=bg1;for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(x+y>38||y>=29)q.fillRect(x,y,1,1);
  const o=s.own?[16,16]:MS_PT[k]||[0,-16];q.imageSmoothingEnabled=false;q.drawImage(s.cv,16-o[0]-s.ax,16-o[1]-s.ay);c=cv}}catch(e){c=null}
 MS.pt.set(k,c);return c}
function monsterPortraitURL(key){const k=msKindOfKey(key);if(!k)return'';let u=MS.ptu.get(k);if(u!==undefined)return u;u='';try{const c=monsterPortrait(key);if(c)u=c.toDataURL()}catch(e){u=''}MS.ptu.set(k,u);return u}
