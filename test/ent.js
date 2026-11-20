// The ents test:  node test/ent.js [html] [main html]
// The Ent ('ent'), the Elder ent ('elder', the Ent's atlas drawn bigger and darker) and the Thornling ('thorn') at Detail High play the
// user's drawn frames (src/76g-frames.js; atlas src/76n-keyatlas.js ENA / TNA from assets/make-keyed-atlas.py) and the parts rig for the
// idle (src/76o-ents.js, 76k-orc.js orRig). Node part: the rows (eight a row, seven dead); the blow on the reach frame (the 4th) at
// AN_HIT_AT; loops; death held; anchors; the colour-keyed hands found or placed in every frame, exactly attack 4 and cast 2 repaired (the
// right hand keyed red); eight heads, every mood's face in the atlas; no randomness. Browser part: every state x facing x sampled frame
// draws a non-empty figure centred on the tile point with its feet on it (airborne run frames above it); no weapon drawn (an ent's fists
// are its own); no red or blue key colour left in the atlases; the idle rig meets the attack row's first frame; back facings are the
// front frames; every frame played; the face follows the mood, not the clock; the live clock (the blow, a cast, the hurt row, the corpse);
// the Ent towers over a man (27 art px) and the Elder over the Ent, darker; the Thornling about a man's height or less; bars over the
// head; Detail Low and the pixel fallback untouched; an untouched seeded forest battle: each figure's tile centre, ring centre and feet
// agree within 1 art px; Detail Low draws the same pixels as main.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),os=require('os');
const ROOT=path.join(__dirname,'..'),F=f=>path.join(ROOT,f);
const bad=[];const ok=(c,m)=>{if(!c)bad.push(m)};
const ctx={console,Math,JSON,performance:{now:()=>0},Map,WeakMap,Set,Array,Object,Number,String};vm.createContext(ctx);
const src=f=>fs.readFileSync(F('src/'+f),'utf8');
vm.runInContext(src('73k-humans.js').match(/const HUM_A=[^;]+;/)[0]+'\nconst AN_HIT_AT=.38;',ctx);
vm.runInContext(src('73m-skel.js')+'\n'+src('76g-frames.js')+'\n'+src('76k-orc.js')+'\n'+src('76n-keyatlas.js')+'\n'+src('76o-ents.js')+'\n;this.__g={fsIdx,fsHitMs,FS_DEF,ENA,TNA,OR_FACES};',ctx);
const {fsIdx,fsHitMs,FS_DEF,ENA,TNA,OR_FACES}=ctx.__g,M=240*.38,IDS=['ent','elder','thorn'];
for(const [nm,A] of[['ENA',ENA],['TNA',TNA]]){
 ['run','attack','cast','hurt','death'].forEach(k=>ok(A.f[k]&&A.f[k].length===(k==='death'?7:8),nm+': row '+k+' has '+(A.f[k]||[]).length));
 const fx=[];for(const k in A.hands)A.hands[k].forEach((h,i)=>{if(!h.w||!h.s)bad.push(nm+' '+k+(i+1)+': a hand missing');if(h.fix)fx.push(k+(i+1));
  for(const q of[h.w,h.s])if(q)ok(Math.abs(q[0])<A.H&&q[1]<10&&q[1]>-A.H,nm+' '+k+(i+1)+': a hand far off the figure '+q)});
 ok(fx.join()==='attack4,cast2',nm+': repaired frames '+fx);ok(!!(A.rh&&A.rh.w&&A.rh.s),nm+': the rig\'s hands');
 {const h=A.hands.attack[3];ok(h.w[0]>h.s[0]+5&&h.w[1]<h.s[1],nm+': the right hand does not lead the punch '+JSON.stringify(h))}
 ok(A.heads.length===8&&A.heads[7]==='head_dead'&&A.heads.every(h=>!!A.p[h]),nm+': the heads '+A.heads);
 for(const k in A.f)A.f[k].forEach((R,i)=>{ok(R.ax>R.w*.15&&R.ax<R.w*.85,nm+' '+k+i+': anchor x');ok(R.ay>=R.h-3&&R.ay<R.h+60,nm+' '+k+i+': anchor y')});
 for(const s of A.set)ok(!!A.p[s[1]]&&A.p[s[1]].pv.length===2,nm+': setup piece '+s[1])}
for(const id of IDS){const D=FS_DEF[id],an=D.an,A=D.atl(),d=an.attack,N=8;ok(!!A,id+': no atlas');
 ok(Math.abs(fsHitMs(d)-M)<.01&&d.imp===3&&fsIdx(N,d,0,M-.5,0)===2&&fsIdx(N,d,0,M,0)===3&&fsIdx(N,d,0,d.ms-1,0)===N-1,id+': attack timing');
 for(let i=0;i<N;i++)ok(fsIdx(N,an.walk,(i+.5)/N,0,0)===i,id+': run frame '+i);ok(fsIdx(7,an.death,0,0,1)===6,id+': death held');
 ok(!D.dress,id+': dressed (an ent carries no weapon)');for(const m in OR_FACES[id])ok(!!A.p['head_'+OR_FACES[id][m]],id+': mood '+m+' face '+OR_FACES[id][m]+' missing')}
ok(FS_DEF.elder.atl()===ENA&&FS_DEF.elder.tint&&FS_DEF.elder.img==='ent','the Elder ent is not the Ent\'s atlas, darker');
ok(!/Math\.random|\brnd\(/.test(src('76o-ents.js').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')),'76o-ents.js uses randomness');
/* ---------- browser ---------- */
const {chromium}=require('playwright');
(async()=>{const html=path.resolve(process.argv[2]||'dist/index.html');let main=process.argv[3];
 if(!main){main=path.join(os.tmpdir(),'ent-main.html');try{fs.writeFileSync(main,cp.execSync('git show HEAD:index.html',{cwd:ROOT,maxBuffer:1<<30}))}catch(e){main=''}}
 const b=await chromium.launch(),errs=[];
 const open=async f=>{const p=await b.newPage({viewport:{width:667,height:375}});p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
  await p.goto('file://'+f);await p.waitForTimeout(300);await p.evaluate(()=>{newGame();closeSheet();if(typeof fsImg==='function')for(const id of['ent','elder','thorn'])if(FS_DEF[id])fsImg(id)});
  await p.waitForFunction(()=>typeof fsImg!=='function'||['ent','elder','thorn'].every(id=>!FS_DEF[id]||!!fsImg(id)),null,{timeout:20000});return p};
 const p=await open(html);
 const R=await p.evaluate(()=>{const bad=[],n={frames:0};let uid=950;
  const c=document.createElement('canvas');c.width=600;c.height=440;const q=c.getContext('2d');
  const measure=Fr=>{q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,c.width,c.height);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Fr,75,100);q.setTransform(1,0,0,1,0,0);
   const d=q.getImageData(0,0,c.width,c.height).data,xs=[];let y0=1e9,y1=-1,lum=0;for(let j=3;j<d.length;j+=4)if(d[j]>128){const i=j>>2,x=i%c.width,y=(i/c.width)|0;xs.push(x);if(y<y0)y0=y;if(y>y1)y1=y;lum+=d[j-3]+d[j-2]+d[j-1]}
   xs.sort((a,b)=>a-b);return{n:xs.length,mx:xs.length?(xs[xs.length>>1]-300)/4:0,lo:(y1+1-400)/4,h:(y1+1-y0)/4,lum:lum/Math.max(1,xs.length)}};
  const H={};
  for(const id of['ent','elder','thorn']){const u=mkEnemy(id,'ent');u.id=++uid;const S=SHEETS[id],A=FS_DEF[id].atl(),K=4*HUM_A*fsSc(id),N=A.f.attack.length,nd=A.f.death.length,NR=A.f.run.length;
   if(!fsOn(u))bad.push(id+': not drawn from its sheet');if(S.dy)bad.push(id+': dy '+S.dy+' (the feet belong on the tile centre)');
   const air=new Set();A.f.run.forEach((R,i)=>{if(R.ay>R.h+1)air.add('run'+i)});
   const rows=[['idle',8,i=>({c:i/8})],['walk',NR,i=>({c:(i+.5)/NR})],['flee',NR,i=>({c:(i+.5)/NR})],['attack',N,i=>{const Hh=240*AN_HIT_AT,d=FS_DEF[id].an.attack;return{el:i<d.imp?(i+.5)/d.imp*Hh:Hh+(i-d.imp+.5)/(N-d.imp)*(d.ms-Hh)}}],
    ['attack',NR,i=>({c:(i+.5)/NR,row:'charge'})],['cast',N,i=>({el:(i+.5)/N*760})],['hit',N,i=>({el:(i+.5)/N*600})],['death',nd,i=>({t:(i+.5)/nd})],['swap',1,()=>({c:0})],['reload',1,()=>({c:0})]];
   const seen={};
   for(const face of[0,1,2,3])for(const [st,NN,tf] of rows)for(let i=0;i<NN;i++){const tm=tf(i),Fr=fsFrame(id,face,st,tm,K,0,u);n.frames++;const nm=Fr.rig?'rig':Fr.anim+Fr.fi,tag=id+' f'+face+' '+st+' '+JSON.stringify(tm)+' '+nm;seen[nm]=1;
    if(Fr.mir!==(face===1||face===2))bad.push(tag+': mirror');if(!Fr.list.length||Fr.list.some(x=>!(x.a&&x.a.cv&&x.a.cv.width>0)))bad.push(tag+': empty');
    if(Fr.list.some(x=>x.tag==='weapon'||x.tag==='shield'))bad.push(tag+': a weapon drawn');
    const m=measure(Fr);if(m.n<1500)bad.push(tag+': nearly empty ('+m.n+')');
    if(Math.abs(m.mx)>(Fr.rig?1:/^death[3-9]/.test(nm)?4.5:2.5))bad.push(tag+': body centre '+m.mx.toFixed(2)+' art px off the tile point');
    if(!air.has(nm)&&Math.abs(m.lo)>1)bad.push(tag+': feet '+m.lo.toFixed(2)+' art px off the tile point');
    if(Fr.rig&&Math.abs(m.h-S.h)>S.h*.12)bad.push(tag+': rig height '+m.h.toFixed(1)+' vs the board figure '+S.h)}
   for(const k in A.f)A.f[k].forEach((_,i)=>{if(!seen[k+i])bad.push(id+': frame '+k+i+' never drawn')});
   {const a=measure(fsFrame(id,0,'idle',{c:0},K,0)),f=measure(fsFrame(id,0,'attack',{el:0},K,0));H[id]=f;if(Math.abs(a.h-f.h)>1.5||Math.abs(a.lo-f.lo)>1||Math.abs(a.mx-f.mx)>1.5)bad.push(id+': the idle rig and the attack row\'s first frame differ: '+JSON.stringify([a,f]))}
   for(const [st,NN,tf] of rows)for(let i=0;i<NN;i++)for(const [b2,f2] of[[3,0],[2,1]]){const X=fsFrame(id,b2,st,tf(i),K,0),Y=fsFrame(id,f2,st,tf(i),K,0);
    if(X.mir!==Y.mir||X.list.length!==Y.list.length||X.list.some((x,j)=>x.a!==Y.list[j].a||x.m.some((v,k)=>Math.abs(v-Y.list[j].m[k])>1e-9)))bad.push(id+': face '+b2+' is not face '+f2+' '+st)}
   {const F=OR_FACES[id],face=()=>fsFrame(id,0,'idle',{c:.3},K,3,u).face,s0=anOf(u);const seenH={};for(let t=0;t<4;t+=.05)seenH[fsFrame(id,0,'idle',{c:t},K,3,u).face]=1;
    if(Object.keys(seenH).join()!==F.calm)bad.push(id+': the idle face cycles '+Object.keys(seenH));
    u.hp=u.hpMax*.5;if(face()!==F.wounded)bad.push(id+': wounded face '+face());u.hp=u.hpMax*.2;if(face()!==F.dying)bad.push(id+': dying face '+face());u.hp=u.hpMax;
    s0.vaId='entangle';s0.vaT=fsNow();if(face()!==F.cry)bad.push(id+': face after an ability '+face());s0.vaId='';s0.vaT=-1e9}
   // the live board frame on the game's clock
   const s=anOf(u),SP=SPEEDF,N0=now;SPEEDF=1;const v={pS:'attack',pF:1,pPh:.5,pCy:0,pD:0,pAn:''},row=()=>{const Fr=fsLiveFrame(u,v);return Fr?Fr.rig?'rig':Fr.anim+Fr.fi:'none'};const T0=60000,tt=el=>{now=T0+el};
   const imp=FS_DEF[id].an.attack.imp;s.act=1;s.adur=240;s.at0=T0;s.hitT=-1e9;s.dead=false;s.vaId='';s.mv=false;
   tt(89);if(row()!=='attack'+(imp-1))bad.push(id+' before the blow: '+row());tt(92);if(row()!=='attack'+imp)bad.push(id+' at the blow: '+row());v.pS='idle';tt(500);if(!/^attack/.test(row()))bad.push(id+' follow-through: '+row());tt(900);if(row()!=='rig')bad.push(id+' back to the rig: '+row());
   s.act=2;s.adur=380;s.at0=T0;v.pS='cast';tt(300);if(!/^cast/.test(row()))bad.push(id+': a cast plays '+row());
   s.act=0;s.hitT=T0+1000;v.pS='idle';tt(1300);if(!/^hurt/.test(row()))bad.push(id+': the hurt row is not playing 300 ms after the blow: '+row());tt(1700);if(/^hurt/.test(row()))bad.push(id+': still hurt 700 ms after');
   s.dead=true;s.deadT=T0;v.pS='death';v.pPh=1;tt(3000);if(row()!=='death'+(nd-1))bad.push(id+': the corpse is '+row());s.dead=false;s.deadT=-1e9;s.hitT=-1e9;SPEEDF=SP;now=N0;
   if(humLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': drawn as a person');
   for(const face of[0,1,2,3]){const o=monsterSpritePx(u,face,'idle',0);if(!o||o.fs!==id){bad.push(id+' f'+face+': the sprite is not the figure');continue}if(monsterSpritePx(u,face,'idle',0)!==o)bad.push(id+' f'+face+': rebuilt')}
   {const t=unitTop(u);if(!(t>=S.h&&t<=S.h+12))bad.push(id+': bars at '+t+' for a figure '+S.h+' tall')}
   FS.off=1;{if(sheetSpritePx(u,0,'idle',0))bad.push(id+': a sheet sprite while off');const o=unitSpritePx(u,0,'idle',0);if(!o||o.fs)bad.push(id+': no pixel fallback while off');if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': a live figure while off')}FS.off=0;
   SET.detail='low';artChanged();if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': figure at Detail Low');{const o=unitSpritePx(u,0,'idle',0);if(!o||o.fs)bad.push(id+': Detail Low drew the figure')}SET.detail='high';artChanged()}
  // sizes: a man stands ~27 art px
  if(!(H.ent.h>=27*1.4))bad.push('the Ent is '+H.ent.h+' art px: not towering over a man');if(!(H.elder.h>H.ent.h+3))bad.push('the Elder ent is not taller than the Ent');
  if(!(H.elder.lum<H.ent.lum*.9))bad.push('the Elder ent is not darker than the Ent');if(!(H.thorn.h<=27&&H.thorn.h>=19))bad.push('the Thornling is '+H.thorn.h+' art px');
  // no key colour left in the atlases
  for(const id of['ent','thorn']){const I=fsImg(id),c2=document.createElement('canvas');c2.width=I.naturalWidth;c2.height=I.naturalHeight;const q2=c2.getContext('2d');q2.drawImage(I,0,0);const d=q2.getImageData(0,0,c2.width,c2.height).data;let nb=0,nr=0;
   for(let j=0;j<d.length;j+=4)if(d[j+3]>128){if(d[j+2]>90&&d[j+2]-d[j]>45&&d[j+2]-d[j+1]>25)nb++;if(d[j]>120&&d[j]-d[j+1]>85&&d[j]-d[j+2]>85&&Math.abs(d[j+1]-d[j+2])<40)nr++}
   if(nb>4)bad.push(id+': '+nb+' blue key pixels left');if(nr>4)bad.push(id+': '+nr+' red key pixels left')}
  return{bad,n}});
 for(const x of R.bad)bad.push(x);
 // an untouched seeded forest battle: each figure's tile centre, its ring's centre and its feet agree within 1 art px
 await p.evaluate(()=>{SET.detail='high';artChanged();SET.deploy=false;seedRng(77);newGame(true);closeSheet();seedRng(78);startBattle({f:'ent',biome:'forest',mult:1,foes:['ent','thorn','elder'],src:{type:'sim'}});try{if(typeof deployDone==='function')deployDone()}catch(e){}});
 await p.waitForTimeout(500);await p.waitForFunction(()=>B.cur&&B.cur.side===0&&!B.busy&&B.units.every(u=>!u.alive||!anOf(u).mv&&!(VIS.get(u)||{}).mv),null,{timeout:60000});await p.waitForTimeout(400);
 const T=await p.evaluate(()=>{const bad=[],out=[];const c=document.createElement('canvas');c.width=600;c.height=440;const q=c.getContext('2d');
  for(const u of B.units.filter(u=>u.alive&&u.side&&FS_DEF[msEnKey(u.def)])){const id=msEnKey(u.def),v=VIS.get(u),t=tpos(u.c,u.r,T(u).h),tx=t.x/2,ty=t.y/2;
   const x=Math.round((u.sx+v.pX)/2),gy=Math.round((u.sy+v.pY+v.pL)/2),y=Math.round((u.sy+v.pY)/2),E=ELL.ok?ELL:ellInit(),rg=ellRing(E,u,false,!!(u.def&&u.def.big)),rx=x-(rg.width>>1)+rg.width/2,ry=gy-(rg.height>>1)+rg.height/2;
   if(Math.abs(rx-tx)>1||Math.abs(ry-ty)>1)bad.push(id+' at '+u.c+','+u.r+': ring centre off its tile centre by '+(rx-tx)+','+(ry-ty));
   for(const face of[0,1,2,3]){const Fr=fsLiveFrame(u,Object.assign({},v,{pS:'idle',pD:face,pCy:0,pPh:0,pAn:''}));if(!Fr){bad.push(id+': no live figure');continue}
    q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,600,440);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Fr,75+(x-tx),100+(y-ty));q.setTransform(1,0,0,1,0,0);
    const d=q.getImageData(0,0,600,440).data,xs=[];let y1=-1;for(let j=3;j<d.length;j+=4)if(d[j]>128){const i=j>>2;xs.push(i%600);const yy=(i/600)|0;if(yy>y1)y1=yy}xs.sort((a,b)=>a-b);
    const fx=xs[xs.length>>1]/4-75,fy=(y1+1)/4-100;out.push(id);
    if(Math.abs(fx)>1||Math.abs(fy)>1)bad.push(id+' at '+u.c+','+u.r+' face '+face+': figure off its tile centre by '+fx.toFixed(2)+','+fy.toFixed(2))}}
  if(new Set(out).size<3)bad.push('the seeded battle has '+[...new Set(out)]);return{bad}});
 for(const x of T.bad)bad.push(x);
 const lowSig=async pg=>pg.evaluate(()=>{SET.detail='low';artChanged();const out={};let uid=990;for(const id of['ent','elder','thorn']){const u=mkEnemy(id,'ent');u.id=++uid;for(const st of['idle','walk','attack','cast','hit','death'])for(let fr=0;fr<4;fr++)for(const face of[0,1,2,3]){let o=null;try{o=unitSpritePx(u,face,st,fr)}catch(e){}
   if(!o||!o.cv){out[id+st+fr+face]='-';continue}const d=o.cv.getContext('2d').getImageData(0,0,o.cv.width,o.cv.height).data;let h=2166136261;for(let i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619)>>>0}out[id+st+fr+face]=o.cv.width+'x'+o.cv.height+':'+o.ax+','+o.ay+':'+h}}return out});
 let lowN=0;if(main&&fs.existsSync(main)){const pm=await open(main);const X=await lowSig(p),Mm=await lowSig(pm);for(const k in Mm){lowN++;if(X[k]!==Mm[k])bad.push('Detail Low differs from main: '+k)}}else console.log('(main build not found: Detail Low comparison skipped)');
 for(const e of errs)bad.push(e);
 console.log(JSON.stringify({frames:R.n.frames,lowCompared:lowN,bad:bad.length}));
 if(bad.length)console.log('FAIL:\n'+bad.slice(0,50).join('\n')+(bad.length>50?'\n... '+(bad.length-50)+' more':''));else console.log('OK');
 await b.close();process.exit(bad.length?1:0)})();
