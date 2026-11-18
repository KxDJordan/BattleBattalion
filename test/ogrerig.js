// The ogre rig test:  node test/ogrerig.js [html] [main html]
// The plain Ogre at Detail High is a paper cut-out skeleton from the user's sheet (src/76d-ogre.js on the people's keyframe engine, atlas
// src/76c-ogreatlas.js), and its DragonBones project (assets/foes/ogre_ske.json + ogre_tex.json + ogre_tex.png) is generated from that rig.
// Node part: the DragonBones files hold together (the parts of the 5.5 format they use: armature type, bone parents, slots on bones, every
// skin display in the atlas and inside the atlas image, animation durations, every timeline naming a bone / slot that exists and summing
// to the animation's duration, display indices and z-order entries in range), and replaying the file's timelines (a small DragonBones
// transform player: setup + translate / rotate / skew / scale, linear tweens, parent chains) gives the in-game rig's bones at every frame.
// Browser part: every state x facing x sampled time draws a non-empty frame with the main slots, feet on the ground (a blow may reach a
// little below it, the legs swing as the people's) and about the painted
// sheet's height; the faces follow the state; faces 1 and 3 are mirrored; the board's live frame and the baked sprite come from the rig;
// the painted sheet is the fallback while the rig is off; the armoured ogre keeps its art; Detail Low draws the same pixels as main.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),F=f=>path.join(ROOT,f);
const bad=[];const ok=(c,m)=>{if(!c)bad.push(m)};
/* ---------- node: the DragonBones files ---------- */
const ske=JSON.parse(fs.readFileSync(F('assets/foes/ogre_ske.json'),'utf8')),tex=JSON.parse(fs.readFileSync(F('assets/foes/ogre_tex.json'),'utf8'));
const png=fs.readFileSync(F('assets/foes/ogre_tex.png'));const pw=png.readUInt32BE(16),ph=png.readUInt32BE(20);
ok(png.slice(1,4).toString()==='PNG','ogre_tex.png is not a PNG');ok(pw===tex.width&&ph===tex.height,'atlas size '+pw+'x'+ph+' vs json '+tex.width+'x'+tex.height);
ok(tex.imagePath==='ogre_tex.png'&&tex.name===ske.name,'atlas name / imagePath');
const sub={};for(const s of tex.SubTexture){sub[s.name]=s;ok(s.x>=0&&s.y>=0&&s.width>0&&s.height>0&&s.x+s.width<=tex.width&&s.y+s.height<=tex.height,'texture '+s.name+' outside the atlas')}
ok(ske.version==='5.5'&&ske.frameRate>0&&Array.isArray(ske.armature)&&ske.armature.length===2,'ske header');
let nTl=0;
for(const A of ske.armature){const an=A.name;ok(A.type==='Armature','armature type '+an);
 const B={};A.bone.forEach((b,i)=>{ok(!B[b.name],an+': bone twice '+b.name);B[b.name]=b;ok(i===0?!b.parent:!!B[b.parent],an+': bone '+b.name+' before / without its parent');ok(b.transform&&isFinite(b.transform.x),an+': bone '+b.name+' transform')});
 const S={};A.slot.forEach(s=>{S[s.name]=s;ok(!!B[s.parent],an+': slot '+s.name+' on no bone')});
 const D={};for(const sk of A.skin)for(const s of sk.slot){ok(!!S[s.name],an+': skin slot '+s.name);D[s.name]=s.display;for(const d of s.display){ok(d.type==='image'&&!!sub[d.name],an+': display '+d.name+' not in the atlas');ok(d.transform&&isFinite(d.transform.x),an+': display transform')}}
 for(const s of A.slot)ok(D[s.name]&&D[s.name].length>(s.displayIndex|0),an+': slot '+s.name+' has no display '+(s.displayIndex|0));
 const want=['idle','walk','flee','attack','sweep','slam','hurl','cast','hit','death'];ok(want.every(w=>A.animation.some(a=>a.name===w)),an+': missing animations');
 for(const a of A.animation){const tag=an+'/'+a.name;ok(a.duration>0,tag+': duration');ok(a.playTimes===0||a.playTimes===1,tag+': playTimes');
  const sum=fr=>fr.reduce((s,f)=>s+f.duration,0);
  for(const t of a.bone||[]){ok(!!B[t.name],tag+': timeline for no bone '+t.name);for(const k of['translateFrame','rotateFrame','scaleFrame'])if(t[k]){nTl++;ok(sum(t[k])===a.duration,tag+' '+t.name+' '+k+' sums to '+sum(t[k]));ok(t[k].every(f=>f.tweenEasing===0||f.tweenEasing==null),tag+': easing')}}
  for(const t of a.slot||[]){ok(!!S[t.name],tag+': timeline for no slot '+t.name);if(t.displayFrame){ok(sum(t.displayFrame)===a.duration,tag+': display frames sum');ok(t.displayFrame.every(f=>f.value>=-1&&f.value<D[t.name].length),tag+': display index out of range')}}
  if(a.zOrder){ok(sum(a.zOrder.frame)===a.duration,tag+': z-order frames sum');for(const f of a.zOrder.frame){const z=f.zOrder||[],n=A.slot.length,pos=new Set();for(let i=0;i<z.length;i+=2){ok(z[i]>=0&&z[i]<n&&(i===0||z[i]>z[i-2]),tag+': z-order slot index');const p=z[i]+z[i+1];ok(p>=0&&p<n&&!pos.has(p),tag+': z-order target');pos.add(p)}}}}
 // the faces: three on the front head, the back of the head on the back armature
 ok(an==='ogre'?D.head.map(d=>d.name).join()==='head_neutral,head_angry,head_grin':D.head.map(d=>d.name).join()==='head_back',an+': head displays '+D.head.map(d=>d.name))}
// replay: a DragonBones transform player against the in-game rig
const ctx={console,Math,JSON,performance:{now:()=>0},Map,WeakMap,Set,Array,Object,Number,String};vm.createContext(ctx);
const src=f=>fs.readFileSync(F('src/'+f),'utf8');
vm.runInContext(src('73k-humans.js').match(/const HUM_A=[^;]+;/)[0]+'\nconst HUM_CELL=15;\nconst SHEETS={ogre:{h:36}};',ctx);
vm.runInContext(src('73m-skel.js')+'\n'+src('76c-ogreatlas.js')+'\n'+src('76d-ogre.js')+'\n;this.__o={ogFrame,hskMul};',ctx);
const {ogFrame,hskMul}=ctx.__o,RAD=Math.PI/180;
const mat=t=>{const skX=(t.skX||0)*RAD,skY=(t.skY||0)*RAD,sx=t.scX==null?1:t.scX,sy=t.scY==null?1:t.scY;return[Math.cos(skY)*sx,Math.sin(skY)*sx,-Math.sin(skX)*sy,Math.cos(skX)*sy,t.x||0,t.y||0]};
const at=(fr,i,f)=>{if(!fr)return null;let t=0;for(let k=0;k<fr.length;k++){const d=fr[k].duration;if(i<t+d||k===fr.length-1){const a=fr[k],b=fr[k+1];if(!b||!d||a.tweenEasing==null)return f(a);const u=(i-t)/d,A=f(a),Bv=f(b);return A.map((x,j)=>x+(Bv[j]-x)*u)}t+=d}return null};
const RIG={ogre:0,ogre_back:3},ANIM={idle:['idle',''],walk:['walk',''],flee:['flee',''],attack:['attack','ogSmash'],sweep:['attack','ogSweep'],slam:['attack','ogSlam'],hurl:['attack','ogHurl'],cast:['cast',''],hit:['hit',''],death:['death','']};
let worst=0,nCmp=0;
for(const A of ske.armature)for(const a of A.animation){const [st,mv]=ANIM[a.name],N=a.duration,loop=a.playTimes===0,tl={};for(const t of a.bone||[])tl[t.name]=t;
 for(let i=0;i<=N;i++){const tt=a.name==='death'?Math.min(1,i/25):i/N,Fr=ogFrame(RIG[A.name],st,tt,mv,0,0),W={};
  for(const b of A.bone){const T=Object.assign({},b.transform),t=tl[b.name];
   if(t){const tr=at(t.translateFrame,i,f=>[f.x||0,f.y||0]),ro=at(t.rotateFrame,i,f=>[f.rotate||0,f.skew||0]),sc=at(t.scaleFrame,i,f=>[f.x==null?1:f.x,f.y==null?1:f.y]);
    if(tr){T.x+=tr[0];T.y+=tr[1]}if(ro){T.skY=(T.skY||0)+ro[0];T.skX=(T.skX||0)+ro[0]+ro[1]}if(sc){T.scX=(T.scX==null?1:T.scX)*sc[0];T.scY=(T.scY==null?1:T.scY)*sc[1]}}
   const m=mat(T);W[b.name]=b.parent?hskMul(W[b.parent],m):m;
   const g=Fr.bones[b.name];if(g&&!(b.name==='club'&&(Fr.pose.drop)))for(const [px,py] of[[0,0],[100,0]]){const X=W[b.name][0]*px+W[b.name][2]*py+W[b.name][4],Y=W[b.name][1]*px+W[b.name][3]*py+W[b.name][5],X2=g[0]*px+g[2]*py+g[4],Y2=g[1]*px+g[3]*py+g[5];const e=Math.hypot(X-X2,Y-Y2);nCmp++;if(e>worst)worst=e;if(e>3)bad.push(A.name+'/'+a.name+' frame '+i+': bone '+b.name+' off the rig by '+e.toFixed(1))}}
  // the face on the head slot
  if(A.name==='ogre'){const df=(a.slot||[]).find(s=>s.name==='head');const v=df?at(df.displayFrame.map(f=>Object.assign({},f,{tweenEasing:null})),Math.min(i,N-1),f=>[f.value])[0]:0;const want=['neutral','angry','grin'].indexOf(Fr.face);if(i<N&&v!==want){bad.push(A.name+'/'+a.name+' frame '+i+': face '+v+' vs the rig '+Fr.face);}}}}
// no randomness in the rig or the scripts
for(const f of['src/76d-ogre.js','assets/make-ogre-db.js'])ok(!/Math\.random|\brnd\(/.test(fs.readFileSync(F(f),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')),f+' uses randomness');
console.log('dragonbones: '+ske.armature.length+' armatures, '+nTl+' bone timelines, replay vs rig worst '+worst.toFixed(2)+' OU over '+nCmp+' points');
/* ---------- browser ---------- */
const {chromium}=require('playwright');
(async()=>{const html=path.resolve(process.argv[2]||'dist/index.html'),main=process.argv[3]||'/home/user/owlbear-wt/index.html';
const b=await chromium.launch(),errs=[];
const open=async f=>{const p=await b.newPage({viewport:{width:667,height:375}});p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
 await p.goto('file://'+f);await p.waitForTimeout(300);await p.evaluate(()=>{newGame();closeSheet();if(typeof ogImg==='function')ogImg();sheetImg('ogre')});await p.waitForFunction(()=>(typeof ogImg!=='function'||!!ogImg())&&!!sheetImg('ogre'),null,{timeout:20000});return p};
const p=await open(html);
const R=await p.evaluate(()=>{const bad=[],n={frames:0,px:0},k=humK(),H=SHEETS.ogre.h;let uid=950;
 const mk=id=>{const u=mkEnemy(id,'ogre');u.id=++uid;return u};const u=mk('ogre');
 if(!ogOn(u))bad.push('the ogre is not drawn as a skeleton');if(monsterKind(u)!=='ogre')bad.push('kind '+monsterKind(u));
 const ST=[['idle',[0,.3,.7,2.7]],['walk',[0,.25,.5,.75]],['flee',[0,.25,.5,.75]],['attack',[0,.15,.28,.38,.5,.8,1]],['cast',[0,.2,.4,.72,1]],['hit',[0,.22,.6,1]],['death',[0,.18,.5,.82,1]],['swap',[.5]],['reload',[.5]]];
 const MV=['ogSmash','ogSweep','ogSlam','ogHurl'],K=k*HUM_A*OG_SC();
 const c=document.createElement('canvas');c.width=360;c.height=300;const q=c.getContext('2d');
 for(const face of[0,1,2,3])for(const [st,T] of ST)for(const mv of st==='attack'?MV:[''])for(const t of T){const Fr=ogFrame(face,st,t,mv,K,0);n.frames++;const tag='f'+face+' '+st+(mv?'/'+mv:'')+' '+t;
  const tags=new Set(Fr.list.map(x=>x.tag));for(const m of['torso','head','leg','arm','hand'])if(!tags.has(m)){bad.push(tag+': no '+m);break}
  if(st!=='death'&&!tags.has('weapon'))bad.push(tag+': no club');if(st==='death'&&t>=.5&&!tags.has('dropped'))bad.push(tag+': the club is not dropped');
  if(Fr.mir!==(face===1||face===3))bad.push(tag+': mirror '+Fr.mir);if((face>=2)!==(Fr.face==='back'))bad.push(tag+': face '+Fr.face);
  if(Fr.list.some(x=>x.a&&!(x.a.cv&&x.a.cv.width>0)))bad.push(tag+': an empty piece');
  // pixels: drawn at 4 device px per art px, feet at (45, 62) art px: the figure is there, stands on the ground, about the sheet's height
  q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,c.width,c.height);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Fr,45,62);q.setTransform(1,0,0,1,0,0);
  const d=q.getImageData(0,0,c.width,c.height).data;let a=0,y0=1e9,y1=-1;for(let j=3;j<d.length;j+=4)if(d[j]>100){const y=((j>>2)/c.width)|0;if(y<y0)y0=y;if(y>y1)y1=y;if(!(j&28))a++}n.px+=a;
  const lo=(y1-248)/4,h=(y1-y0)/4;
  if(st!=='death'&&!(lo>-1.5&&lo<(/^(idle|walk|flee|swap|reload)$/.test(st)?2:7)))bad.push(tag+': lowest point '+lo.toFixed(1)+' art px from the ground');
  if(st==='idle'&&!(Math.abs(h-H)<H*.25))bad.push(tag+': height '+h.toFixed(1)+' vs the sheet '+H);
  if(a<300)bad.push(tag+': nearly empty frame ('+a+')')}
 // the faces follow the state
 const fc=(st,t,mv)=>ogFrame(0,st,t,mv||'',K,0).face;
 if(fc('hit',.22)!=='angry')bad.push('hit without the snarl');if(fc('attack',.38,'ogSmash')!=='angry')bad.push('attacks without the snarl');if(fc('cast',.4)!=='angry')bad.push('roars without the snarl');
 if(fc('idle',0)!=='neutral')bad.push('idle not neutral');{let g=0;for(let t=0;t<8;t+=.05)if(fc('idle',t)==='grin')g++;if(!(g>5&&g<60))bad.push('idle grins '+g+' of 160 samples')}
 // the moves: each ability picks its own (74-anim.js keeps the ability's id)
 for(const [id,mv] of[['ohurl','ogHurl'],['osweep','ogSweep'],['oslam','ogSlam']]){animEvent('cast',{u,ab:Object.assign({id},AB&&AB[id]||{})});if(ogMove(u)!==mv)bad.push(id+' plays '+ogMove(u))}
 animEvent('turn',{u});if(ogMove(u)!=='ogSmash')bad.push('the basic attack plays '+ogMove(u));
 // the blows land at AN_HIT_AT: the smash's club is at its lowest-forward then, and the wind-up is the highest before
 {const tipY=t=>{const Fr=ogFrame(0,'attack',t,'ogSmash',0,0),m=Fr.bones.club;return m[1]*300+m[5]};if(!(tipY(.28)<tipY(.38)-150))bad.push('the smash does not come down by the impact')}
 // the board: live frame and baked sprite from the rig; not a person
 const v={pS:'attack',pF:1,pPh:.38,pCy:0,pD:1,pAn:''};const L=ogreLiveFrame(u,v);if(!L||!L.ogre)bad.push('no live frame');if(humLiveFrame(u,v))bad.push('drawn as a person');
 for(const face of[0,1,2,3]){const o=monsterSpritePx(u,face,'idle',0);if(!o||!o.ogre){bad.push('f'+face+': the sprite is not the rig');continue}if(monsterSpritePx(u,face,'idle',0)!==o)bad.push('f'+face+': rebuilt on the second call');
  const w=o.cv.width/o.k,h=o.cv.height/o.k;if(!(o.ax>=0&&o.ax<=w&&o.ay>0&&o.ay<=h+.5))bad.push('f'+face+': anchor outside the sprite')}
 // the painted sheet is the fallback while the rig is off; the armoured ogre keeps its art
 OG.off=1;{const o=sheetSpritePx(u,0,'idle',0);if(!o||o.ogre)bad.push('no painted fallback with the rig off');if(ogreLiveFrame(u,{pS:'idle',pD:0}))bad.push('a live rig while it is off')}OG.off=0;
 {const a=mk('aogre');if(ogOn(a)||ogreLiveFrame(a,{pS:'idle',pD:0}))bad.push('the armoured ogre drawn with the plain rig');const o=monsterSpritePx(a,0,'idle',0);if(o&&o.ogre)bad.push('the armoured ogre sprite is the rig')}
 // Detail Low: the rig is off
 SET.detail='low';artChanged();if(ogreLiveFrame(u,{pS:'idle',pD:0}))bad.push('rig at Detail Low');{const o=unitSpritePx(u,0,'idle',0);if(!o||o.ogre||o.smooth)bad.push('Detail Low drew '+(o&&o.ogre?'the rig':o?'a painted figure':'nothing'))}
 SET.detail='high';artChanged();if(!monsterSpritePx(u,0,'idle',0).ogre)bad.push('not the rig again after Detail Low');
 return{bad,n,frameMs:+(OG.ms/Math.max(1,OG.frames)).toFixed(3),pieces:OG.pc.size}});
for(const x of R.bad)bad.push(x);
// Detail Low pixels vs main: every state x face x frame of the ogre and the armoured ogre
const lowSig=async pg=>pg.evaluate(()=>{SET.detail='low';artChanged();const out={};let uid=990;
 for(const id of['ogre','aogre']){const u=mkEnemy(id,'ogre');u.id=++uid;for(const st of['idle','walk','attack','cast','hit','death'])for(let fr=0;fr<4;fr++)for(const face of[0,1,2,3]){let o=null;try{o=unitSpritePx(u,face,st,fr)}catch(e){}
  if(!o||!o.cv){out[id+st+fr+face]='-';continue}const d=o.cv.getContext('2d').getImageData(0,0,o.cv.width,o.cv.height).data;let h=2166136261;for(let i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619)>>>0}out[id+st+fr+face]=o.cv.width+'x'+o.cv.height+':'+o.ax+','+o.ay+':'+h}}return out});
let lowN=0;if(fs.existsSync(main)){const pm=await open(main);const A=await lowSig(p),M=await lowSig(pm);for(const k in M){lowN++;if(A[k]!==M[k])bad.push('Detail Low differs from main: '+k)}}else console.log('(main build not found: Detail Low comparison skipped)');
for(const e of errs)bad.push(e);
console.log(JSON.stringify({frames:R.n.frames,frameMs:R.frameMs,pieces:R.pieces,lowCompared:lowN,bad:bad.length}));
if(bad.length)console.log('FAIL:\n'+bad.slice(0,40).join('\n')+(bad.length>40?'\n... '+(bad.length-40)+' more':''));else console.log('OK');
await b.close();process.exit(bad.length?1:0)})();
