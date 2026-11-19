// The Direwolf test:  node test/wolfrig.js [html] [main html]
// The Direwolf at Detail High plays the user's drawn frames (src/76g-frames.js: run, paw scratch, bite, hurt, death; atlas
// src/76e-wolfatlas.js) and is a paper cut-out rig for its idle and howl (src/76h-wolf.js); its DragonBones project
// (assets/foes/direwolf_ske.json + direwolf_tex.json + direwolf_tex.png) is generated from both.
// Node part: the DragonBones files hold together (armature, bone parents, slots on bones, every skin display in the atlas and inside its
// image, timelines naming bones / slots that exist and summing to their animation's duration, display indices in range), replaying the
// rig animations' bone timelines gives the in-game rig's bones at every frame, and every display timeline shows the in-game frame / head /
// torso / tail; the frame player's timing (loops by the cycle, the impact frame at the blow, death holding its last frame); the
// atlas anchors; no randomness.
// Browser part: every state x facing x sampled time draws a non-empty figure whose body centre is over the tile point and whose feet are
// on the ground line (within 2 art px), about the painted wolf's height; the back facings are the front frames (face 3 = face 0, face 2
// = face 1), faces 1 and 2 mirrored; the expressions follow the state; a bite ability plays the bite, a plain attack the scratch or (two
// in five) the bite; the live board frame plays the scratch's impact frame at the blow and the hurt row past the game's short flinch; the
// baked sprite is the figure; the painted sheet is the fallback while it is off; the war hound keeps its art; Detail Low draws the same
// pixels as main for the wolf and the war hound.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),os=require('os');
const ROOT=path.join(__dirname,'..'),F=f=>path.join(ROOT,f);
const bad=[];const ok=(c,m)=>{if(!c)bad.push(m)};
/* ---------- node: the DragonBones files ---------- */
const ske=JSON.parse(fs.readFileSync(F('assets/foes/direwolf_ske.json'),'utf8')),tex=JSON.parse(fs.readFileSync(F('assets/foes/direwolf_tex.json'),'utf8'));
const png=fs.readFileSync(F('assets/foes/direwolf_tex.png'));const pw=png.readUInt32BE(16),ph=png.readUInt32BE(20);
ok(png.slice(1,4).toString()==='PNG','direwolf_tex.png is not a PNG');ok(pw===tex.width&&ph===tex.height,'atlas size '+pw+'x'+ph+' vs json '+tex.width+'x'+tex.height);
ok(tex.imagePath==='direwolf_tex.png'&&tex.name===ske.name,'atlas name / imagePath');
const sub={};for(const s of tex.SubTexture){sub[s.name]=s;ok(s.x>=0&&s.y>=0&&s.width>0&&s.height>0&&s.x+s.width<=tex.width&&s.y+s.height<=tex.height,'texture '+s.name+' outside the atlas')}
ok(ske.version==='5.5'&&ske.frameRate===60&&ske.armature.length===1&&ske.armature[0].name==='direwolf','ske header (one armature: the game mirrors it)');
const A=ske.armature[0],B={},S={},D={};
A.bone.forEach((b,i)=>{ok(!B[b.name],'bone twice '+b.name);B[b.name]=b;ok(i===0?!b.parent:!!B[b.parent],'bone '+b.name+' before / without its parent')});
A.slot.forEach(s=>{S[s.name]=s;ok(!!B[s.parent],'slot '+s.name+' on no bone')});
for(const sk of A.skin)for(const s of sk.slot){ok(!!S[s.name],'skin slot '+s.name);D[s.name]=s.display;for(const d of s.display)ok(d.type==='image'&&!!sub[d.name]&&isFinite(d.transform.x),'display '+d.name+' not in the atlas')}
ok(['idle','howl','walk','flee','attack','bite','hit','death'].every(w=>A.animation.some(a=>a.name===w)),'missing animations');
ok(D.head&&D.head.length===8&&D.torso.length===3&&D.tail.length===4,'head / torso / tail displays');ok(D.frames&&D.frames.length===35,'the frames slot shows the 35 drawn frames');
const sum=fr=>fr.reduce((s,f)=>s+f.duration,0);let nTl=0;
for(const a of A.animation){ok(a.duration>0&&(a.playTimes===0||a.playTimes===1),a.name+': duration / playTimes');
 for(const t of a.bone||[]){ok(!!B[t.name],a.name+': timeline for no bone '+t.name);for(const k of['translateFrame','rotateFrame','scaleFrame'])if(t[k]){nTl++;ok(sum(t[k])===a.duration,a.name+' '+t.name+' '+k+' sums to '+sum(t[k]))}}
 for(const t of a.slot||[]){ok(!!S[t.name],a.name+': timeline for no slot '+t.name);ok(sum(t.displayFrame)===a.duration,a.name+' '+t.name+': display frames sum');ok(t.displayFrame.every(f=>f.value>=-1&&f.value<D[t.name].length),a.name+': display index out of range')}}
// the in-game figure (vm): rig replay and display timelines
const ctx={console,Math,JSON,performance:{now:()=>0},Map,WeakMap,Set,Array,Object,Number,String};vm.createContext(ctx);
const src=f=>fs.readFileSync(F('src/'+f),'utf8');
vm.runInContext(src('73k-humans.js').match(/const HUM_A=[^;]+;/)[0]+'\nconst HUM_CELL=15;\nconst SHEETS={wolf:{h:22,dy:0}};const AN_HIT_AT=.38;',ctx);
vm.runInContext(src('73m-skel.js')+'\n'+src('76e-wolfatlas.js')+'\n'+src('76g-frames.js')+'\n'+src('76h-wolf.js')+'\n;this.__w={fsFrame,fsIdx,fsHitMs,FS_DEF,WFA,hskMul};',ctx);
const {fsFrame,fsIdx,fsHitMs,FS_DEF,WFA,hskMul}=ctx.__w,RAD=Math.PI/180;
const mat=t=>{const skX=(t.skX||0)*RAD,skY=(t.skY||0)*RAD,sx=t.scX==null?1:t.scX,sy=t.scY==null?1:t.scY;return[Math.cos(skY)*sx,Math.sin(skY)*sx,-Math.sin(skX)*sy,Math.cos(skX)*sy,t.x||0,t.y||0]};
const at=(fr,i,f)=>{if(!fr)return null;let t=0;for(let k=0;k<fr.length;k++){const d=fr[k].duration;if(i<t+d||k===fr.length-1){const a=fr[k],b=fr[k+1];if(!b||!d||a.tweenEasing==null)return f(a);const u=(i-t)/d,X=f(a),Y=f(b);return X.map((x,j)=>x+(Y[j]-x)*u)}t+=d}return null};
const dispAt=(df,i)=>{let t=0;for(const f of df){if(i<t+f.duration)return f.value;t+=f.duration}return df[df.length-1].value};
const TM={idle:['idle',i=>({c:i/156})],howl:['cast',i=>({t:i/23})],walk:['walk',i=>({c:i/30})],flee:['flee',i=>({c:i/17})],attack:['attack',i=>({el:i*1000/60})],bite:['attack',i=>({el:i*1000/60,row:'bite'})],hit:['hit',i=>({el:i*1000/60})],death:['death',i=>({t:Math.min(1,i/34)})]};
const FRN=[];for(const k in WFA.f)WFA.f[k].forEach((_,i)=>FRN.push(k+'_'+i));
let worst=0,nCmp=0;
for(const a of A.animation){const [st,tm]=TM[a.name],N=a.duration,tl={};for(const t of a.bone||[])tl[t.name]=t;const sl={};for(const t of a.slot||[])sl[t.name]=t;
 for(let i=0;i<=N;i++){const Fr=fsFrame('wolf',0,st,tm(i),0,0),W={};
  if(Fr.rig){for(const b of A.bone){const T=Object.assign({},b.transform),t=tl[b.name];
    if(t){const tr=at(t.translateFrame,i,f=>[f.x||0,f.y||0]),ro=at(t.rotateFrame,i,f=>[f.rotate||0,f.skew||0]),sc=at(t.scaleFrame,i,f=>[f.x==null?1:f.x,f.y==null?1:f.y]);
     if(tr){T.x+=tr[0];T.y+=tr[1]}if(ro){T.skY=(T.skY||0)+ro[0];T.skX=(T.skX||0)+ro[0]+ro[1]}if(sc){T.scX=(T.scX==null?1:T.scX)*sc[0];T.scY=(T.scY==null?1:T.scY)*sc[1]}}
    const m=mat(T);W[b.name]=b.parent?hskMul(W[b.parent],m):m;const g=Fr.bones[b.name];
    if(g)for(const [px,py] of[[0,0],[100,0]]){const X=W[b.name][0]*px+W[b.name][2]*py+W[b.name][4],Y=W[b.name][1]*px+W[b.name][3]*py+W[b.name][5],X2=g[0]*px+g[2]*py+g[4],Y2=g[1]*px+g[3]*py+g[5],e=Math.hypot(X-X2,Y-Y2);nCmp++;if(e>worst)worst=e;if(e>3)bad.push(a.name+' frame '+i+': bone '+b.name+' off the rig by '+e.toFixed(1))}}}
  if(i<N){for(const s of['head','torso','tail']){const v=sl[s]?dispAt(sl[s].displayFrame,i):0,want=Fr.rig?D[s].map(d=>d.name).indexOf(Fr.look[s]):-1;if(v!==want)bad.push(a.name+' frame '+i+': '+s+' display '+v+' vs '+want)}
   const v=dispAt(sl.frames.displayFrame,i),want=Fr.rig?-1:FRN.indexOf(Fr.anim+'_'+Fr.fi);if(v!==want)bad.push(a.name+' frame '+i+': frames display '+v+' vs '+want)}}}
// timing: loops by the cycle; the impact frame shows from the blow (AN_HIT_AT of the 240 ms attack) on; death holds its last frame
{const an=FS_DEF.wolf.an,H=fsHitMs(an.attack);ok(Math.abs(H-91.2)<.01,'the melee impact time '+H);
 for(const k of['attack','bite']){const d=an[k],n=WFA.f[d.f].length;ok(fsIdx(n,d,0,H-.5,0)===d.imp-1,k+': the frame before the blow is not the wind-up');ok(fsIdx(n,d,0,H,0)===d.imp,k+': the impact frame is not shown at the blow');
  ok(fsIdx(n,d,0,0,0)===0,k+': does not start on its first frame');ok(fsIdx(n,d,0,d.ms-1,0)===n-1,k+': does not end on its last frame')}
 const rn=an.walk,nr=WFA.f.run.length;for(let i=0;i<nr;i++)ok(fsIdx(nr,rn,(i+.5)/nr,0,0)===i,'run frame '+i+' at its share of the cycle');ok(fsIdx(nr,rn,1.01,0,0)===0,'the run loops');
 ok(fsIdx(8,an.death,0,0,1)===7&&fsIdx(8,an.death,0,0,.999)===7&&fsIdx(8,an.death,0,0,0)===0,'death holds its last frame');ok(fsIdx(8,an.hit,0,an.hit.ms-1,0)===7,'the hurt row ends on its last frame')}
// the atlas: anchors inside the frames, on the feet (the run's airborne frames over the row's ground)
for(const k in WFA.f)WFA.f[k].forEach((R,i)=>{ok(R.ax>R.w*.2&&R.ax<R.w*.8,k+i+': anchor x '+R.ax+' of '+R.w);ok(R.ay>=R.h-3,k+i+': anchor y '+R.ay+' above the feet ('+R.h+')');ok(R.ay<R.h+60,k+i+': anchor far below')});
for(const f of['src/76g-frames.js','src/76h-wolf.js','assets/make-wolf-db.js'])ok(!/Math\.random|\brnd\(/.test(fs.readFileSync(F(f),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')),f+' uses randomness');
console.log('dragonbones: '+nTl+' bone timelines, rig replay worst '+worst.toFixed(2)+' WU over '+nCmp+' points');
/* ---------- browser ---------- */
const {chromium}=require('playwright');
(async()=>{const html=path.resolve(process.argv[2]||'dist/index.html');let main=process.argv[3];
 if(!main){main=path.join(os.tmpdir(),'wolfrig-main.html');try{fs.writeFileSync(main,cp.execSync('git show HEAD:index.html',{cwd:ROOT,maxBuffer:1<<30}))}catch(e){main=''}}
 const b=await chromium.launch(),errs=[];
 const open=async f=>{const p=await b.newPage({viewport:{width:667,height:375}});p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
  await p.goto('file://'+f);await p.waitForTimeout(300);await p.evaluate(()=>{newGame();closeSheet();if(typeof fsImg==='function')fsImg('wolf');sheetImg('wolf')});
  await p.waitForFunction(()=>(typeof fsImg!=='function'||!!fsImg('wolf'))&&!!sheetImg('wolf'),null,{timeout:20000});return p};
 const p=await open(html);
 const R=await p.evaluate(()=>{const bad=[],n={frames:0},S=SHEETS.wolf;let uid=950;
  const mk=id=>{const u=mkEnemy(id,'beast');u.id=++uid;return u};const u=mk('wolf');
  if(!fsOn(u))bad.push('the wolf is not drawn from its sheets');if(fsId(u)!=='wolf')bad.push('id '+fsId(u));
  const K=4*HUM_A*fsSc('wolf'),c=document.createElement('canvas');c.width=400;c.height=240;const q=c.getContext('2d');
  // drawn at 4 device px per art px, the tile point at (50, 50) art px
  const measure=Fr=>{q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,c.width,c.height);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Fr,50,50);q.setTransform(1,0,0,1,0,0);
   const d=q.getImageData(0,0,c.width,c.height).data,xs=[];let y0=1e9,y1=-1;for(let j=3;j<d.length;j+=4)if(d[j]>128){const i=j>>2,x=i%c.width,y=(i/c.width)|0;xs.push(x);if(y<y0)y0=y;if(y>y1)y1=y}
   xs.sort((a,b)=>a-b);return{n:xs.length,mx:xs.length?(xs[xs.length>>1]-200)/4:0,lo:(y1+1-200)/4,h:(y1+1-y0)/4}};
  const ST=[['idle',[{c:0},{c:.3},{c:.7},{c:3.3}]],['cast',[{t:0},{t:.2},{t:.5},{t:.95}]],['walk',[0,1,2,3,4,5,6,7].map(i=>({c:(i+.5)/8}))],['flee',[0,1,2,3,4,5,6,7].map(i=>({c:(i+.5)/8}))],
   ['attack',[0,40,80,91.2,200,400].map(el=>({el}))],['attack',[0,40,80,91.2,200,400,550].map(el=>({el,row:'bite'}))],['hit',[0,80,160,240,320,400,480,600].map(el=>({el}))],['death',[0,.13,.26,.38,.51,.63,.76,1].map(t=>({t}))],['swap',[{c:0}]],['reload',[{c:0}]]];
  const air=new Set();WFA.f.run.forEach((R,i)=>{if(R.ay>R.h+1)air.add('run'+i)});
  for(const face of[0,1,2,3])for(const [st,T] of ST)for(const tm of T){const Fr=fsFrame('wolf',face,st,tm,K,0);n.frames++;const tag='f'+face+' '+st+' '+JSON.stringify(tm)+' '+(Fr.rig?'rig '+Fr.face:Fr.anim+Fr.fi);
   if(Fr.mir!==(face===1||face===2))bad.push(tag+': mirror '+Fr.mir);if(!Fr.list.length||Fr.list.some(x=>!(x.a&&x.a.cv&&x.a.cv.width>0)))bad.push(tag+': an empty piece');
   const M=measure(Fr);if(M.n<1500)bad.push(tag+': nearly empty ('+M.n+')');
   if(Math.abs(M.mx)>(Fr.rig?2.5:1.5))bad.push(tag+': body centre '+M.mx.toFixed(2)+' art px off the tile point');
   if(!air.has(Fr.anim+Fr.fi)&&Math.abs(M.lo-S.dy)>1.5)bad.push(tag+': feet '+M.lo.toFixed(2)+' art px under the tile point (want '+S.dy+')');
   if(air.has(Fr.anim+Fr.fi)&&!(M.lo<S.dy-.5))bad.push(tag+': an airborne run frame on the ground');
   if((st==='idle'||st==='walk')&&Math.abs(M.h-S.h)>S.h*.2)bad.push(tag+': height '+M.h.toFixed(1)+' vs the painted '+S.h)}
  // the rig's idle meets the drawn frames: same height and body centre as the scratch's first frame
  {const a=measure(fsFrame('wolf',0,'idle',{c:0},K,0)),b=measure(fsFrame('wolf',0,'attack',{el:0},K,0));if(Math.abs(a.h-b.h)>1.5||Math.abs(a.mx-b.mx)>1.5||Math.abs(a.lo-b.lo)>1)bad.push('the idle rig and the first drawn frame differ: '+JSON.stringify([a,b]))}
  // the back facings draw the front frames
  for(const [st,T] of ST)for(const tm of T)for(const [b2,f2] of[[3,0],[2,1]]){const X=fsFrame('wolf',b2,st,tm,K,0),Y=fsFrame('wolf',f2,st,tm,K,0);
   if(X.mir!==Y.mir||X.face!==Y.face||X.list.length!==Y.list.length||X.list.some((x,i)=>x.a!==Y.list[i].a||x.m.some((v,j)=>Math.abs(v-Y.list[i].m[j])>1e-9)))bad.push('face '+b2+' is not face '+f2+': '+st+' '+JSON.stringify(tm))}
  // expressions: neutral at rest with a blink and a snarl now and then, the howl
  const look=(st,t)=>fsFrame('wolf',0,st,st==='idle'?{c:t}:{t},K,0).look;if(look('idle',0).head!=='head_neutral')bad.push('idle not neutral');
  {const seen={};for(let t=0;t<4;t+=.01)seen[look('idle',t).head]=(seen[look('idle',t).head]||0)+1;if(!(seen.head_rest>3&&seen.head_snarl>20&&seen.head_neutral>300))bad.push('idle expressions '+JSON.stringify(seen))}
  if(look('cast',.5).head!=='head_howl'||look('cast',.5).tail!=='tail_2'||look('cast',.2).head!=='head_angry')bad.push('the howl: '+JSON.stringify([look('cast',.2),look('cast',.5)]));
  // the bite: a bite ability; the plain attack two in five
  const s=anOf(u);animEvent('cast',{u,ab:{id:'wbite',fx:'bite',tgt:'enemy',wpn:1}});s.at0=anNow();if(wfPick(u,'attack',s)!=='bite')bad.push('a bite ability plays '+wfPick(u,'attack',s));
  animEvent('turn',{u});let nb=0;for(let i=0;i<500;i++){s.at0=1000+i*317;if(wfPick(u,'attack',s)==='bite')nb++}if(!(nb>150&&nb<250))bad.push('plain attacks bite '+nb+' of 500');
  {s.at0=4321;const a=wfPick(u,'attack',s);for(let i=0;i<5;i++)if(wfPick(u,'attack',s)!==a)bad.push('the attack choice changes during an attack')}
  // the live board frame: the scratch's impact frame at the blow; the hurt row past the game's flinch; death
  const SP=SPEEDF,N0=now;SPEEDF=1;const v0={pS:'attack',pF:1,pPh:.5,pCy:0,pD:0,pAn:''},row=()=>{const Fr=fsLiveFrame(u,v0);return Fr?Fr.rig?'rig':Fr.anim+Fr.fi:'none'};
  let A0=50000;while(wfPick(u,'attack',Object.assign({},s,{at0:A0})))A0+=17;s.act=1;s.adur=240;s.at0=A0;s.hitT=-1e9;s.dead=false;s.vaId='';
  const tt=el=>{now=A0+el};
  tt(0);if(row()!=='scratch0')bad.push('the scratch starts on '+row());tt(92);if(row()!=='scratch3')bad.push('at the blow: '+row());tt(89);if(row()!=='scratch2')bad.push('just before the blow: '+row());
  v0.pS='idle';tt(400);if(row()!=='scratch4')bad.push('the follow-through after the game\'s attack: '+row());tt(600);if(row()!=='rig')bad.push('back to the idle rig: '+row());
  s.hitT=A0+700;tt(1000);if(!/^hurt/.test(row()))bad.push('the hurt row is not playing 300 ms after the blow: '+row());tt(1400);if(row()!=='rig')bad.push('after the hurt row: '+row());
  s.dead=true;s.deadT=A0;tt(3000);v0.pS='death';v0.pPh=1;if(row()!=='death7')bad.push('the corpse is '+row());s.dead=false;s.deadT=-1e9;s.act=0;s.hitT=-1e9;SPEEDF=SP;now=N0;
  // board / sprites: not a person; the baked sprite is the figure; the painted sheet while it is off; the war hound keeps its art
  if(humLiveFrame(u,{pS:'idle',pD:0}))bad.push('drawn as a person');
  for(const face of[0,1,2,3]){const o=monsterSpritePx(u,face,'idle',0);if(!o||o.fs!=='wolf'){bad.push('f'+face+': the sprite is not the figure');continue}if(monsterSpritePx(u,face,'idle',0)!==o)bad.push('f'+face+': rebuilt');
   const w=o.cv.width/o.k,h=o.cv.height/o.k;if(!(o.ax>=0&&o.ax<=w&&o.ay>0&&o.ay<=h+.5))bad.push('f'+face+': anchor outside the sprite')}
  FS.off=1;{const o=sheetSpritePx(u,0,'idle',0);if(!o||o.fs)bad.push('no painted fallback while off');if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push('a live figure while off')}FS.off=0;
  {const h=mkEnemy('barbhound','barb');h.id=++uid;if(fsOn(h)||fsLiveFrame(h,{pS:'idle',pD:0}))bad.push('the war hound drawn as the wolf')}
  SET.detail='low';artChanged();if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push('figure at Detail Low');{const o=unitSpritePx(u,0,'idle',0);if(!o||o.fs||o.smooth)bad.push('Detail Low drew '+(o&&o.fs?'the figure':o?'a painted figure':'nothing'))}
  SET.detail='high';artChanged();if(monsterSpritePx(u,0,'idle',0).fs!=='wolf')bad.push('not the figure again after Detail Low');
  return{bad,n}});
 for(const x of R.bad)bad.push(x);
 const lowSig=async pg=>pg.evaluate(()=>{SET.detail='low';artChanged();const out={};let uid=990;
  for(const [id,f] of[['wolf','beast'],['barbhound','barb']]){const u=mkEnemy(id,f);u.id=++uid;for(const st of['idle','walk','attack','cast','hit','death'])for(let fr=0;fr<4;fr++)for(const face of[0,1,2,3]){let o=null;try{o=unitSpritePx(u,face,st,fr)}catch(e){}
   if(!o||!o.cv){out[id+st+fr+face]='-';continue}const d=o.cv.getContext('2d').getImageData(0,0,o.cv.width,o.cv.height).data;let h=2166136261;for(let i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619)>>>0}out[id+st+fr+face]=o.cv.width+'x'+o.cv.height+':'+o.ax+','+o.ay+':'+h}}return out});
 let lowN=0;if(main&&fs.existsSync(main)){const pm=await open(main);const X=await lowSig(p),M=await lowSig(pm);for(const k in M){lowN++;if(X[k]!==M[k])bad.push('Detail Low differs from main: '+k)}}else console.log('(main build not found: Detail Low comparison skipped)');
 for(const e of errs)bad.push(e);
 console.log(JSON.stringify({frames:R.n.frames,lowCompared:lowN,bad:bad.length}));
 if(bad.length)console.log('FAIL:\n'+bad.slice(0,40).join('\n')+(bad.length>40?'\n... '+(bad.length-40)+' more':''));else console.log('OK');
 await b.close();process.exit(bad.length?1:0)})();
