// Writes the Direwolf's DragonBones 5.5 project from the in-game figure:  node assets/make-wolf-db.js
//   assets/foes/direwolf_ske.json   armature "direwolf" (front three-quarter facing right: the game's face 0; the game mirrors it for
//                                   the other facings): the cut-out rig's bones and slots (tail, the four legs as upper + lower pieces,
//                                   torso, head) plus one "frames" slot on its own bone that shows the drawn frames; animations idle
//                                   (four breathing cycles: the blink and the snarl are head / tail display timelines) and howl (cast)
//                                   from the rig, walk, flee (the run), attack (the paw scratch), bite, hit (hurt) and death as image
//                                   sequences (display timelines on the frames slot, the rig's slots hidden; the rig animations hide the
//                                   frames slot)
//   (direwolf_tex.json + direwolf_tex.png, the texture atlas, come from assets/make-wolf-atlas.py)
// The figure is the game's own (src/76g-frames.js fsFrame, src/76h-wolf.js wfRig on the people's keyframe engine of src/73m-skel.js),
// loaded here and sampled at 60 fps over the game's real durations at normal speed: each rig bone's local transform is its world
// matrix under its parent's inverse, written as translate / rotate / scale timelines (linear between the dense samples). Units: WU (the
// part sheet's px), y down, the feet at 0,0. No randomness: the output is the same every run.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),S=f=>fs.readFileSync(path.join(ROOT,'src',f),'utf8');
const ctx={console,Math,JSON,performance:{now:()=>0},Map,WeakMap,Set,Array,Object,Number,String};vm.createContext(ctx);
const pick=(src,re)=>{const m=src.match(re);if(!m)throw new Error('missing '+re);return m[0]};
vm.runInContext(pick(S('73k-humans.js'),/const HUM_A=[^;]+;/)+'\nconst HUM_CELL=15;\nconst SHEETS={wolf:{h:22,dy:0}};const AN_HIT_AT=.38;',ctx);
vm.runInContext(S('73m-skel.js')+'\n;this.__m={hskMul};',ctx);
vm.runInContext(S('76e-wolfatlas.js')+'\n'+S('76g-frames.js')+'\n'+S('76h-wolf.js')+'\n;this.__w={WFA,fsFrame,FS_DEF};',ctx);
const {WFA,fsFrame,FS_DEF}=ctx.__w,{hskMul}=ctx.__m;
const tex=JSON.parse(fs.readFileSync(path.join(ROOT,'assets','foes','direwolf_tex.json'),'utf8'));
const R2=x=>Math.round(x*100)/100,R1=x=>Math.round(x*10)/10||0,R3=x=>Math.round(x*1000)/1000,DEG=180/Math.PI;
function simp(v,tol,put,id){const N=v.length-1;if(v.every(x=>x.every((y,j)=>Math.abs(y-id[j])<tol)))return null;const keep=[0];let a=0;
 for(let b=2;b<=N;b++){let ok=true;for(let i=a+1;i<b&&ok;i++){const u=(i-a)/(b-a);for(let j=0;j<v[i].length;j++)if(Math.abs(v[a][j]+(v[b][j]-v[a][j])*u-v[i][j])>tol){ok=false;break}}
  if(!ok){keep.push(b-1);a=b-1}}keep.push(N);
 return keep.map((k,i)=>{const f={duration:i<keep.length-1?keep[i+1]-k:0,tweenEasing:0};put(f,v[k]);return f})}
const inv=m=>{const d=m[0]*m[3]-m[1]*m[2];return[m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d]};
const dec=m=>({x:m[4],y:m[5],skX:Math.atan2(-m[2],m[3])*DEG,skY:Math.atan2(m[1],m[0])*DEG,scX:Math.hypot(m[0],m[1]),scY:Math.hypot(m[2],m[3])});
const SLOTS=WFA.set.map(s=>s[0]);   // the rig's slots in draw order
const PAR=n=>n==='root'?null:n==='body'||n==='frames'||/^(hlF|flF|hlN|flN)$/.test(n)?'root':'body';
const BONES=['root','body',...SLOTS.filter(n=>PAR(n)==='body'),...SLOTS.filter(n=>PAR(n)==='root'),'frames'].map(n=>[n,PAR(n)]);
const HEADS=['head_neutral','head_snarl','head_roar','head_hurt','head_angry','head_rest','head_howl','head_bark'],TORSOS=['torso_c','torso_a','torso_b'],TAILS=['tail_0','tail_1','tail_2','tail_3'];
const FRAMES=[];for(const k in WFA.f)WFA.f[k].forEach((_,i)=>FRAMES.push(k+'_'+i));
const DISP={head:HEADS,torso:TORSOS,tail:TAILS,frames:FRAMES};
// animations: name, state, frames at 60 fps, loop, timing of frame i
const ANIMS=[['idle','idle',624,1,i=>({c:i/156})],['howl','cast',23,0,i=>({t:i/23})],
 ['walk','walk',30,1,i=>({c:i/30})],['flee','flee',17,1,i=>({c:i/17})],
 ['attack','attack',31,0,i=>({el:i*1000/60})],['bite','attack',34,0,i=>({el:i*1000/60,row:'bite'})],
 ['hit','hit',38,0,i=>({el:i*1000/60})],['death','death',34,0,i=>({t:Math.min(1,i/34)})]];
function armature(name){
 const sample=(st,tm)=>fsFrame('wolf',0,st,tm,0,0);
 const F0=sample('idle',{c:0}),W0=F0.bones;W0.frames=[1,0,0,1,0,0];
 const loc=(W,b,par)=>dec(par?hskMul(inv(W[par]),W[b]):W[b]);
 const bone=BONES.map(([n,p])=>{const L=loc(W0,n,p),o={name:n,transform:{x:R2(L.x),y:R2(L.y),skX:R2(L.skX),skY:R2(L.skY),scX:R2(L.scX),scY:R2(L.scY)}};if(p)o.parent=p;return o});
 const slot=[...SLOTS.map(s=>({name:s,parent:s,displayIndex:0})),{name:'frames',parent:'frames',displayIndex:-1}];
 const setSc={};for(const [s,pc,,, ,sc] of WFA.set)setSc[pc]=sc;for(const n in WFA.alt)setSc[n]=WFA.alt[n][1];
 // a rig display: the piece's centre in its bone (drawn at its scale, its pivot on the bone); a frame: its centre from the anchor
 const disp=n=>{const P=WFA.p[n],sc=setSc[n]||(n.startsWith('head_')?setSc.head_neutral:1),t={x:R2(sc*(P.w/2-P.pv[0])),y:R2(sc*(P.h/2-P.pv[1]))};if(sc!==1){t.scX=sc;t.scY=sc}return{name:n,type:'image',transform:t}};
 const fdisp=n=>{const [k,i]=[n.slice(0,n.lastIndexOf('_')),+n.slice(n.lastIndexOf('_')+1)],R=WFA.f[k][i];return{name:n,type:'image',transform:{x:R2(R.w/2-R.ax),y:R2(R.h/2-R.ay)}}};
 const skin=[{name:'',slot:[...SLOTS.map(s=>({name:s,display:DISP[s]?DISP[s].map(disp):[disp(WFA.set.find(x=>x[0]===s)[1])]})),{name:'frames',display:FRAMES.map(fdisp)}]}];
 const animation=ANIMS.map(([an,st,N,loop,tm])=>{
  const fr=[];for(let i=0;i<=N;i++)fr.push(sample(st,tm(i)));const rig=!!fr[0].rig;
  const bone=[];if(rig)for(const [n,p] of BONES){if(n==='frames')continue;const tv=[],rv=[],sv=[];let prev=null;const s0=loc(W0,n,p);
   for(let i=0;i<=N;i++){const W=fr[i].bones;const L=loc(W,n,p);let r=L.skY-s0.skY;if(prev!=null){while(r-prev>180)r-=360;while(r-prev<-180)r+=360}prev=r;
    tv.push([L.x-s0.x,L.y-s0.y]);rv.push([r,(L.skX-L.skY)-(s0.skX-s0.skY)]);sv.push([L.scX/s0.scX,L.scY/s0.scY])}
   const o={name:n},T=simp(tv,.25,(f,v)=>{f.x=R1(v[0]);f.y=R1(v[1])},[0,0]),Ro=simp(rv,.25,(f,v)=>{f.rotate=R1(v[0]);if(Math.abs(v[1])>.05)f.skew=R1(v[1])},[0,0]),Sc=simp(sv,.004,(f,v)=>{f.x=R3(v[0]);f.y=R3(v[1])},[1,1]);
   if(T)o.translateFrame=T;if(Ro)o.rotateFrame=Ro;if(Sc)o.scaleFrame=Sc;if(T||Ro||Sc)bone.push(o)}
  const a={name:an,duration:N,playTimes:loop?0:1,fadeInTime:.1,bone,slot:[]};
  // display timelines: runs of the same display index
  const runs=vals=>{const df=[];let cur=null,run=0;for(let i=0;i<N;i++){const v=vals(i);if(v!==cur){if(run)df.push({duration:run,value:cur});cur=v;run=0}run++}df.push({duration:run,value:cur});return df};
  for(const s of SLOTS){const D=DISP[s];if(rig&&!D)continue;a.slot.push({name:s,displayFrame:runs(i=>!rig?-1:D.indexOf(fr[i].look[s]))})}
  a.slot.push({name:'frames',displayFrame:runs(i=>rig?-1:FRAMES.indexOf(fr[i].anim+'_'+fr[i].fi))});
  return a});
 return{type:'Armature',frameRate:60,name,aabb:{x:-170,y:-230,width:340,height:250},bone,slot,skin,animation,defaultActions:[{gotoAndPlay:'idle'}]}}
const ske={frameRate:60,name:'direwolf',version:'5.5',compatibleVersion:'5.5',armature:[armature('direwolf')]};
fs.writeFileSync(path.join(ROOT,'assets','foes','direwolf_ske.json'),JSON.stringify(ske));
const A=ske.armature[0];
console.log('direwolf_ske.json: '+A.bone.length+' bones, '+A.slot.length+' slots, '+A.animation.length+' animations, '+(fs.statSync(path.join(ROOT,'assets','foes','direwolf_ske.json')).size>>10)+' KB; atlas '+tex.SubTexture.length+' textures');
