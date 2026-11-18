// Writes the ogre's DragonBones 5.5 project from the in-game rig:  node assets/make-ogre-db.js
//   assets/foes/ogre_ske.json   armature "ogre" (front three-quarter facing right, club in the near hand: the game's face 0; the game
//                               mirrors it for the other facings), bones, slots,
//                               skin displays, and the animations idle, walk, flee, attack (the overhead smash), sweep, slam, hurl,
//                               cast (the roar), hit, death
//   (ogre_tex.json + ogre_tex.png, the texture atlas, come from assets/make-ogre-atlas.py)
// The rig is the game's own (src/76d-ogre.js ogFrame on the people's keyframe engine of src/73m-skel.js), loaded here and sampled at every
// frame (60 fps, the game's real durations at normal speed): each bone's local transform is its world matrix under its parent's inverse,
// written as translate / rotate / scale timelines (linear between the dense samples, rotations unwrapped); one bone and one slot per
// arm (each a single rigid piece); the face is a display timeline on the head slot; the far arm coming over the torso to grip the club
// (slam, hurl) and the dropped club are z-order timelines. Units: sheet px,
// y down, the feet at 0,0. No randomness: the output is the same every run.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),S=f=>fs.readFileSync(path.join(ROOT,'src',f),'utf8');
const ctx={console,Math,JSON,performance:{now:()=>0},Map,WeakMap,Set,Array,Object,Number,String};vm.createContext(ctx);
// the rig needs: 73k (HUM_A), 73m (engine), 76c (atlas anchors), 76d (the ogre); SHEETS.ogre.h fixes the size (76s is not loaded: 36)
const pick=(src,re)=>{const m=src.match(re);if(!m)throw new Error('missing '+re);return m[0]};
vm.runInContext(pick(S('73k-humans.js'),/const HUM_A=[^;]+;/)+'\nconst HUM_CELL=15;\nconst SHEETS={ogre:{h:36}};',ctx);
vm.runInContext(S('73m-skel.js')+'\n;this.__m={HUM_AN,hskMul};',ctx);
vm.runInContext(S('76c-ogreatlas.js')+'\n'+S('76d-ogre.js')+'\n;this.__o={OG,OGA,ogFrame,ogLen,ogAng,OG_AN};',ctx);
const {OG,OGA,ogFrame}=ctx.__o,{hskMul}=ctx.__m;
const tex=JSON.parse(fs.readFileSync(path.join(ROOT,'assets','foes','ogre_tex.json'),'utf8'));
const R2=x=>Math.round(x*100)/100,R1=x=>Math.round(x*10)/10||0,R3=x=>Math.round(x*1000)/1000,DEG=180/Math.PI;
// a timeline sampled at every frame (values v[0..N]) as keyframes: a frame is dropped where the line between its kept neighbours passes
// within tol of every sample between them; null when the whole timeline stays at the setup value (id)
function simp(v,tol,put,id){const N=v.length-1;if(v.every(x=>x.every((y,j)=>Math.abs(y-id[j])<tol)))return null;const keep=[0];let a=0;
 for(let b=2;b<=N;b++){let ok=true;for(let i=a+1;i<b&&ok;i++){const u=(i-a)/(b-a);for(let j=0;j<v[i].length;j++)if(Math.abs(v[a][j]+(v[b][j]-v[a][j])*u-v[i][j])>tol){ok=false;break}}
  if(!ok){keep.push(b-1);a=b-1}}keep.push(N);
 return keep.map((k,i)=>{const f={duration:i<keep.length-1?keep[i+1]-k:0,tweenEasing:0};put(f,v[k]);return f})}
const inv=m=>{const d=m[0]*m[3]-m[1]*m[2];return[m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d]};
// DragonBones: a = cos(skY) scX, b = sin(skY) scX, c = -sin(skX) scY, d = cos(skX) scY
const dec=m=>({x:m[4],y:m[5],skX:Math.atan2(-m[2],m[3])*DEG,skY:Math.atan2(m[1],m[0])*DEG,scX:Math.hypot(m[0],m[1]),scY:Math.hypot(m[2],m[3])});
const BONES=[['root',null],['hip','root'],['legF','hip'],['legN','hip'],['torso','root'],['head','torso'],['armN','torso'],['armF','torso'],['club','armN']];
const ANIMS=[ // name, state, move, frames at 60 fps, loop, phase: t of frame i
 ['idle','idle','',156,1],['walk','walk','',24,1],['flee','flee','',17,1],
 ['attack','attack','ogSmash',15,0],['sweep','attack','ogSweep',16,0],['slam','attack','ogSlam',15,0],['hurl','attack','ogHurl',15,0],
 ['cast','cast','',23,0],['hit','hit','',14,0],['death','death','',34,0,i=>Math.min(1,i/25)]];
function armature(name,face){
 const piece=n=>n.startsWith('head_')?'head':n.startsWith('torso')?'torso':n==='club'?'club':n.startsWith('leg_')?(n==='leg_r'?'legN':'legF'):({arm_r:'armN',arm_l:'armF'})[n];
 const sample=(st,mv,t)=>ogFrame(face,st,t,mv,0,0);
 const F0=sample('idle',0,0);
 // setup: the rest pose (idle at 0); the slot order is its draw order
 const W0=F0.bones,loc=(W,b,par)=>dec(par?hskMul(inv(W[par]),W[b]):W[b]);
 const bone=BONES.map(([n,p])=>{const L=loc(W0,n,p),o={name:n,transform:{x:R2(L.x),y:R2(L.y),skX:R2(L.skX),skY:R2(L.skY),scX:R2(L.scX),scY:R2(L.scY)}};if(p)o.parent=p;
  const len={armN:OG.arm*145,armF:OG.arm*141,legN:150,legF:150,club:260,head:120,torso:130}[n];if(len)o.length=Math.round(len);return o});
 const order=[];for(const it of F0.list){const s=piece(it.n);if(order.indexOf(s)<0)order.push(s)}
 const heads=['head_neutral','head_angry','head_grin'];
 const slot=order.map(s=>({name:s,parent:s,displayIndex:0}));
 // a display: the piece's centre and turn in its bone (the rig draws it scaled by sc, turned by -ang, its pivot on the bone)
 const disp=(n)=>{const P=OGA.p[n],pv=P.a.pv,base=n.startsWith('head')?'head':n.startsWith('torso')?'torso':n,sc=/^arm_/.test(n)?OG.arm:n==='club'?OG.club:1,
   ang=P.a.ax?Math.atan2(P.a.ax[1]-pv[1],P.a.ax[0]-pv[0]):0,cx=P.w/2-pv[0],cy=P.h/2-pv[1],c=Math.cos(-ang),s=Math.sin(-ang);
   const t={x:R2(sc*(cx*c-cy*s)),y:R2(sc*(cx*s+cy*c))};if(ang){t.skX=R2(-ang*DEG);t.skY=R2(-ang*DEG)}if(sc!==1){t.scX=sc;t.scY=sc}return{name:n,type:'image',transform:t}};
 const pieceOf={head:null,torso:'torso',armN:'arm_r',armF:'arm_l',legN:'leg_r',legF:'leg_l',club:'club'};
 const skin=[{name:'',slot:order.map(s=>({name:s,display:s==='head'?heads.map(disp):[disp(pieceOf[s])]}))}];
 const animation=ANIMS.map(([an,st,mv,N,loop,ph])=>{
  const fr=[];for(let i=0;i<=N;i++){const t=ph?ph(i):loop?i/N:i/N;fr.push(sample(st,mv,t))}
  const bone=[];for(const [n,p] of BONES){const tv=[],rv=[],sv=[];let prev=null;const s0=loc(W0,n,p);
   for(let i=0;i<=N;i++){const W=fr[i].bones;if(!W[n])W[n]=W0[n];if(p&&!W[p])W[p]=W0[p];const L=loc(W,n,p);let r=L.skY-s0.skY;if(prev!=null){while(r-prev>180)r-=360;while(r-prev<-180)r+=360}prev=r;
    tv.push([L.x-s0.x,L.y-s0.y]);rv.push([r,(L.skX-L.skY)-(s0.skX-s0.skY)]);sv.push([L.scX/s0.scX,L.scY/s0.scY])}
   const o={name:n},T=simp(tv,.25,(f,v)=>{f.x=R1(v[0]);f.y=R1(v[1])},[0,0]),Ro=simp(rv,.25,(f,v)=>{f.rotate=R1(v[0]);if(Math.abs(v[1])>.05)f.skew=R1(v[1])},[0,0]),Sc=simp(sv,.004,(f,v)=>{f.x=R3(v[0]);f.y=R3(v[1])},[1,1]);
   if(T)o.translateFrame=T;if(Ro)o.rotateFrame=Ro;if(Sc)o.scaleFrame=Sc;if(T||Ro||Sc)bone.push(o)}
  const anim={name:an,duration:N,playTimes:loop?0:1,fadeInTime:.1,bone};
  {const df=[];let cur=-1,run=0;for(let i=0;i<N;i++){const v=heads.indexOf('head_'+fr[i].face);if(v!==cur){if(run)df.push({duration:run,value:cur});cur=v;run=0}run++}df.push({duration:run,value:cur});anim.slot=[{name:'head',displayFrame:df}]}
  // z order: the slots in each frame's draw order, as offsets from the setup order
  const zf=[];let curZ=null,runZ=0;for(let i=0;i<N;i++){const o=[];for(const it of fr[i].list){const s=piece(it.n);if(o.indexOf(s)<0)o.push(s)}for(const s of order)if(o.indexOf(s)<0)o.push(s);
   const z=[];order.forEach((s,j)=>{const k=o.indexOf(s);if(k!==j)z.push(j,k-j)});const key=JSON.stringify(z);if(key!==curZ){if(runZ)zf.push({duration:runZ,zOrder:JSON.parse(curZ)});curZ=key;runZ=0}runZ++}
  zf.push({duration:runZ,zOrder:JSON.parse(curZ)});if(zf.some(f=>f.zOrder.length))anim.zOrder={frame:zf.map(f=>f.zOrder.length?f:{duration:f.duration})};
  return anim});
 return{type:'Armature',frameRate:60,name,aabb:{x:-260,y:-560,width:520,height:600},bone,slot,skin,animation,defaultActions:[{gotoAndPlay:'idle'}]}}
const ske={frameRate:60,name:'ogre',version:'5.5',compatibleVersion:'5.5',armature:[armature('ogre',0)]};
fs.writeFileSync(path.join(ROOT,'assets','foes','ogre_ske.json'),JSON.stringify(ske));
const nb=ske.armature[0].bone.length,ns=ske.armature[0].slot.length;
console.log('ogre_ske.json: '+ske.armature.length+' armature, '+nb+' bones, '+ns+' slots, '+ske.armature[0].animation.length+' animations, '+(fs.statSync(path.join(ROOT,'assets','foes','ogre_ske.json')).size>>10)+' KB; atlas '+tex.SubTexture.length+' textures');
