// The Owlbear frame sheet test:  node test/owlbear.js [html] [main html]
// The Owlbear (EN 'bear') at Detail High plays the user's drawn frames (src/76g-frames.js, atlas src/76i-owlatlas.js from
// assets/make-owlbear-atlas.py). Node part: six rows of eight; the frame player's timing (loops by the cycle; the claw swipe's swoosh
// frame on the blow, AN_HIT_AT of the 240 ms attack; Swipe's purple arcs on the blow; death holding its last frame); the atlas
// anchors; the swoosh cut off the next figure stays with its own frame. Browser part: every state x facing x sampled frame draws a
// non-empty figure whose body centre is over the tile point (2 art px with a swoosh or glow: the anchor is the figure's alone) and whose feet are on the ground line (within 1.5 art px), about its board
// height (SHEETS.bear); the back facings are the front frames (face 3 = face 0, face 2 = face 1), faces 1 and 2 mirrored; every frame
// is played; the live board frame: the claw at the blow and its follow-through after the game's attack, Swipe on the cast row, Trample
// galloping on the run row while it charges, the hit row past the game's short flinch, the corpse; the baked sprite is the figure; the
// pixel owlbear while it is off; the painted sheet is gone; Detail Low draws the same pixels as main.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),os=require('os');
const ROOT=path.join(__dirname,'..'),F=f=>path.join(ROOT,f);
const bad=[];const ok=(c,m)=>{if(!c)bad.push(m)};
const ctx={console,Math,JSON,performance:{now:()=>0},Map,WeakMap,Set,Array,Object,Number,String};vm.createContext(ctx);
const src=f=>fs.readFileSync(F('src/'+f),'utf8');
vm.runInContext(src('73k-humans.js').match(/const HUM_A=[^;]+;/)[0]+'\nconst AN_HIT_AT=.38;',ctx);
vm.runInContext(src('73m-skel.js')+'\n'+src('76g-frames.js')+'\n'+src('76i-owlatlas.js')+'\n;this.__g={fsIdx,fsHitMs,FS_DEF,OBA};',ctx);
const {fsIdx,fsHitMs,FS_DEF,OBA}=ctx.__g,an=FS_DEF.bear.an,M=fsHitMs(an.attack);
ok(['idle','run','attack','cast','hit','death'].every(k=>OBA.f[k]&&OBA.f[k].length===8),'six rows of eight');
ok(Math.abs(M-91.2)<.01&&fsHitMs(an.swipe)===M,'blow times');
const blow=(nm,d,imp,first)=>{ok(fsIdx(8,d,0,M-.5,0)===imp-1,nm+': the frame before the blow is not the wind-up');ok(fsIdx(8,d,0,M,0)===imp,nm+': frame '+imp+' not at the blow');
 ok(fsIdx(8,d,0,0,0)===first,nm+': does not start on frame '+first);ok(fsIdx(8,d,0,d.ms-1,0)===7,nm+': does not end on its last frame')};
blow('claw swipe',an.attack,4,0);blow('Swipe',an.swipe,5,2);ok(an.swipe.f==='cast'&&an.charge.f==='run'&&an.charge.loop,'Swipe on the cast row, Trample on the run row');
for(const d of[an.idle,an.walk]){const r=d.rate||1;for(let i=0;i<8;i++)ok(fsIdx(8,d,(i+.5)/8/r,0,0)===i,d.f+' frame '+i+' at its share of the cycle')}
ok(fsIdx(8,an.death,0,0,1)===7&&fsIdx(8,an.death,0,0,0)===0,'death holds its last frame');ok(fsIdx(8,an.hit,0,an.hit.ms-1,0)===7,'the hit row ends on its last frame');
for(const k in OBA.f)OBA.f[k].forEach((R,i)=>{ok(R.ax>R.w*.15&&R.ax<R.w*.85,k+i+': anchor x '+R.ax+' of '+R.w);ok(R.ay>=R.h-3&&R.ay<R.h+60,k+i+': anchor y '+R.ay+' vs '+R.h)});
// the swoosh drawn touching the next figure belongs to the swing's frame 5: that frame is the widest of the row, frame 6 not much wider than the rest
{const W=OBA.f.attack.map(R=>R.w);ok(W[4]===Math.max(...W)&&W[5]<W[4],'the swoosh is not with frame 5: widths '+W)}
ok(!/src:'data/.test(src('76s-sheets.js').match(/\n bear:[^\n]*/)[0]),'the painted owlbear sheet is still there');
/* ---------- browser ---------- */
const {chromium}=require('playwright');
(async()=>{const html=path.resolve(process.argv[2]||'dist/index.html');let main=process.argv[3];
 if(!main){main=path.join(os.tmpdir(),'owlbear-main.html');try{fs.writeFileSync(main,cp.execSync('git show HEAD:index.html',{cwd:ROOT,maxBuffer:1<<30}))}catch(e){main=''}}
 const b=await chromium.launch(),errs=[];
 const open=async f=>{const p=await b.newPage({viewport:{width:667,height:375}});p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
  await p.goto('file://'+f);await p.waitForTimeout(300);await p.evaluate(()=>{newGame();closeSheet();if(typeof fsImg==='function')fsImg('bear')});
  await p.waitForFunction(()=>typeof fsImg!=='function'||!FS_DEF.bear||!!fsImg('bear'),null,{timeout:20000});return p};
 const p=await open(html);
 const R=await p.evaluate(()=>{const bad=[],n={frames:0},id='bear';let uid=950;
  const c=document.createElement('canvas');c.width=400;c.height=260;const q=c.getContext('2d');
  const measure=Fr=>{q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,c.width,c.height);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Fr,50,55);q.setTransform(1,0,0,1,0,0);
   const d=q.getImageData(0,0,c.width,c.height).data,xs=[];let y0=1e9,y1=-1;for(let j=3;j<d.length;j+=4)if(d[j]>128){const i=j>>2,x=i%c.width,y=(i/c.width)|0;xs.push(x);if(y<y0)y0=y;if(y>y1)y1=y}
   xs.sort((a,b)=>a-b);return{n:xs.length,mx:xs.length?(xs[xs.length>>1]-200)/4:0,lo:(y1+1-220)/4,h:(y1+1-y0)/4}};
  const u=mkEnemy(id,'beast');u.id=++uid;const S=SHEETS[id],A=FS_DEF[id].atl(),K=4*HUM_A*fsSc(id);
  if(!fsOn(u))bad.push('the owlbear is not drawn from its sheet');if(S.src||S.fr)bad.push('the painted sheet is still there');
  const air=new Set();A.f.run.forEach((R,i)=>{if(R.ay>R.h+1)air.add('run'+i)});
  const rows=[['idle',8,i=>({c:(i+.5)/16})],['walk',8,i=>({c:(i+.5)/8})],['flee',8,i=>({c:(i+.5)/8})],['attack',8,i=>({el:[0,30,60,80,91.2,300,400,550][i]})],
   ['attack',8,i=>({el:[0,45,91.2,200,350,500,600,630][i],row:'swipe'})],['attack',8,i=>({c:(i+.5)/8,row:'charge'})],['cast',8,i=>({el:(i+.5)/8*760})],
   ['hit',8,i=>({el:(i+.5)/8*600})],['death',8,i=>({t:(i+.5)/8})],['swap',1,()=>({c:0})],['reload',1,()=>({c:0})]];
  const seen={};
  for(const face of[0,1,2,3])for(const [st,N,tf] of rows)for(let i=0;i<N;i++){const tm=tf(i),Fr=fsFrame(id,face,st,tm,K,0);n.frames++;const tag='f'+face+' '+st+' '+JSON.stringify(tm)+' '+Fr.anim+Fr.fi;seen[Fr.anim+Fr.fi]=1;
   if(Fr.mir!==(face===1||face===2))bad.push(tag+': mirror');if(!Fr.list.length||Fr.list.some(x=>!(x.a&&x.a.cv&&x.a.cv.width>0)))bad.push(tag+': empty');
   const m=measure(Fr);if(m.n<1500)bad.push(tag+': nearly empty ('+m.n+')');
   if(Math.abs(m.mx)>(/^(attack|cast)/.test(Fr.anim)?2:1.5))bad.push(tag+': body centre '+m.mx.toFixed(2)+' art px off the tile point');
   if(!air.has(Fr.anim+Fr.fi)&&Math.abs(m.lo-S.dy)>1.5)bad.push(tag+': feet '+m.lo.toFixed(2)+' art px under the tile point (want '+S.dy+')');
   if(st==='idle'&&Math.abs(m.h-S.h)>S.h*.15)bad.push(tag+': height '+m.h.toFixed(1)+' vs '+S.h)}
  for(const k in A.f)A.f[k].forEach((_,i)=>{if(!seen[k+i])bad.push('frame '+k+i+' never drawn')});
  for(const [st,N,tf] of rows)for(let i=0;i<N;i++)for(const [b2,f2] of[[3,0],[2,1]]){const X=fsFrame(id,b2,st,tf(i),K,0),Y=fsFrame(id,f2,st,tf(i),K,0);if(X.mir!==Y.mir||X.list[0].a!==Y.list[0].a||X.list[0].m.some((v,j)=>Math.abs(v-Y.list[0].m[j])>1e-9))bad.push('face '+b2+' is not face '+f2+' '+st)}
  // the live board frame on the game's clock
  const s=anOf(u),SP=SPEEDF,N0=now;SPEEDF=1;const v={pS:'attack',pF:1,pPh:.5,pCy:0,pD:0,pAn:''},row=()=>{const Fr=fsLiveFrame(u,v);return Fr?Fr.anim+Fr.fi:'none'};const T0=60000,tt=el=>{now=T0+el};
  s.act=1;s.adur=240;s.at0=T0;s.hitT=-1e9;s.dead=false;s.vaId='';s.mv=false;
  tt(89);if(row()!=='attack3')bad.push('before the blow: '+row());tt(92);if(row()!=='attack4')bad.push('at the blow: '+row());v.pS='idle';tt(450);if(!/^attack[67]$/.test(row()))bad.push('follow-through: '+row());
  animEvent('cast',{u,ab:Object.assign({id:'bswipe'},AB.bswipe||{tgt:'aoe',wpn:1,fx:'sweep'})});s.act=1;s.at0=T0;s.vaT=T0;v.pS='attack';tt(89);if(row()!=='cast4')bad.push('Swipe before the blow: '+row());tt(92);if(row()!=='cast5')bad.push('Swipe at the blow: '+row());
  animEvent('turn',{u});s.act=0;s.mv=true;s.mk=AN_DASH;s.mt0=T0;v.pS='attack';v.pPh=.2;const runs=new Set();for(let el=0;el<600;el+=20){tt(el);runs.add(row())}if(![...runs].every(r=>/^run/.test(r))||runs.size<4)bad.push('Trample does not gallop: '+[...runs]);s.mv=false;v.pPh=.5;
  s.act=0;s.hitT=T0+1000;v.pS='idle';tt(1300);if(!/^hit/.test(row()))bad.push('the hit row is not playing 300 ms after the blow: '+row());tt(1700);if(/^hit/.test(row()))bad.push('still hurt 700 ms after');
  s.dead=true;s.deadT=T0;v.pS='death';v.pPh=1;tt(3000);if(row()!=='death7')bad.push('the corpse is '+row());s.dead=false;s.deadT=-1e9;s.hitT=-1e9;SPEEDF=SP;now=N0;
  if(humLiveFrame(u,{pS:'idle',pD:0}))bad.push('drawn as a person');
  for(const face of[0,1,2,3]){const o=monsterSpritePx(u,face,'attack',1);if(!o||o.fs!==id){bad.push('f'+face+': the sprite is not the figure');continue}if(monsterSpritePx(u,face,'attack',1)!==o)bad.push('f'+face+': rebuilt')}
  FS.off=1;{if(sheetSpritePx(u,0,'idle',0))bad.push('a sheet sprite while off');const o=unitSpritePx(u,0,'idle',0);if(!o||o.fs||o.smooth)bad.push('no pixel fallback while off');if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push('a live figure while off')}FS.off=0;
  SET.detail='low';artChanged();if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push('figure at Detail Low');{const o=unitSpritePx(u,0,'idle',0);if(!o||o.fs)bad.push('Detail Low drew the figure')}SET.detail='high';artChanged();
  return{bad,n}});
 for(const x of R.bad)bad.push(x);
 const lowSig=async pg=>pg.evaluate(()=>{SET.detail='low';artChanged();const out={};const u=mkEnemy('bear','beast');u.id=991;for(const st of['idle','walk','attack','cast','hit','death'])for(let fr=0;fr<4;fr++)for(const face of[0,1,2,3]){let o=null;try{o=unitSpritePx(u,face,st,fr)}catch(e){}
   if(!o||!o.cv){out[st+fr+face]='-';continue}const d=o.cv.getContext('2d').getImageData(0,0,o.cv.width,o.cv.height).data;let h=2166136261;for(let i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619)>>>0}out[st+fr+face]=o.cv.width+'x'+o.cv.height+':'+o.ax+','+o.ay+':'+h}return out});
 let lowN=0;if(main&&fs.existsSync(main)){const pm=await open(main);const X=await lowSig(p),Mm=await lowSig(pm);for(const k in Mm){lowN++;if(X[k]!==Mm[k])bad.push('Detail Low differs from main: '+k)}}else console.log('(main build not found: Detail Low comparison skipped)');
 for(const e of errs)bad.push(e);
 console.log(JSON.stringify({frames:R.n.frames,lowCompared:lowN,bad:bad.length}));
 if(bad.length)console.log('FAIL:\n'+bad.slice(0,40).join('\n')+(bad.length>40?'\n... '+(bad.length-40)+' more':''));else console.log('OK');
 await b.close();process.exit(bad.length?1:0)})();
