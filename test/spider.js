// The Webspinner test:  node test/spider.js [html] [main html]
// The Webspinner (EN 'spider') at Detail High plays the user's drawn frames (src/76g-frames.js; atlases src/76n-spideratlas.js from
// assets/make-spider-atlas.py: SPA the forest spider, SSA the sand spider) and the orcs' parts rig for the idle (src/76o-spider.js): the
// sand spider in a desert battle, the forest spider everywhere else. Node part: the rows (run 8, attack / cast / hurt 7, death 7 and the
// sand spider's 6); the rig's pieces (eight legs on the ground, plate, abdomen, the neutral head and the seven row heads); the frame
// player's timing (the bite's low strike at AN_HIT_AT, the spitting frame when the web leaves (75-fx.js: 60 ms), loops, death held);
// anchors; no randomness. Browser part: which sheet (desert / forest / spv); every state x facing x sampled frame draws a non-empty figure
// centred on the tile point and sitting in it (the lowest leg tips SHEETS dy under the tile point, the figure's centroid just above it); back facings are the front frames; every frame is played; the idle rig against the run
// row's first frame; the rig's face by state and mood (neutral, squint, angry, fury, glow, glare, hurt, dead), the baked sprite with it; the live clock (the bite at the blow, Spit web at the web's launch, the charge runs, hurt, corpse);
// about a wolf's size on the board; the pixel fallback while off and at Detail Low; in untouched seeded forest and desert battles each
// spider's tile, ring and figure agree (body centre over the tile, tips dy under it, centroid on it); Detail Low: the forest spider is
// main's pixels 3 px lower (US_SPDY: it sits in its tile too), the sand spider a brown recolour of it.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),os=require('os');
const ROOT=path.join(__dirname,'..'),F=f=>path.join(ROOT,f);
const bad=[];const ok=(c,m)=>{if(!c)bad.push(m)};
const ctx={console,Math,JSON,performance:{now:()=>0},Map,WeakMap,Set,Array,Object,Number,String};vm.createContext(ctx);
const src=f=>fs.readFileSync(F('src/'+f),'utf8');
vm.runInContext(src('73k-humans.js').match(/const HUM_A=[^;]+;/)[0]+'\nconst AN_HIT_AT=.38;',ctx);
vm.runInContext(src('73m-skel.js')+'\n'+src('76g-frames.js')+'\n'+src('76j-orcatlas.js')+'\n'+src('76k-orc.js')+'\n'+src('76n-spideratlas.js')+'\n'+src('76o-spider.js')+'\n;this.__g={fsIdx,fsHitMs,FS_DEF,SPA,SSA,FS_WEB_MS};',ctx);
const {fsIdx,fsHitMs,FS_DEF,SPA,SSA,FS_WEB_MS}=ctx.__g,M=240*.38;
const LEGS=['leg_l1','leg_l2','leg_l3','leg_l4','leg_r1','leg_r2','leg_r3','leg_r4'],HEADS=['neutral','angry','fury','glow','glare','squint','hurt','dead'];
for(const [nm,A,nd] of[['forest',SPA,7],['sand',SSA,6]]){
 for(const [k,n] of[['run',8],['attack',7],['cast',7],['hurt',7],['death',nd]])ok(A.f[k]&&A.f[k].length===n,nm+': row '+k+' has '+(A.f[k]||[]).length+' (want '+n+')');
 ok(Object.keys(A.f).length===5,nm+': rows '+Object.keys(A.f));
 for(const p of LEGS.concat(['plate','abdomen'],HEADS.map(h=>'head_'+h)))ok(A.p[p]&&A.p[p].w>0&&A.p[p].pv,nm+': piece '+p);
 ok(A.set.length===11&&A.set[0][0]==='abdomen'&&A.set[A.set.length-1][0]==='head'&&A.set[A.set.length-1][1]==='head_neutral',nm+': setup '+A.set.map(s=>s[0]));
 ok(LEGS.every(l=>A.set.some(s=>s[0]===l)),nm+': a leg missing from the setup');
 // the row heads brought to the part head's size
 for(const h of HEADS)ok(Math.abs(A.p['head_'+h].w/A.p.head_neutral.w-1)<.12,nm+': head '+h+' width '+A.p['head_'+h].w+' vs '+A.p.head_neutral.w);
 for(const k in A.f)A.f[k].forEach((R,i)=>{ok(R.ax>R.w*.2&&R.ax<R.w*.8,nm+' '+k+i+': anchor x '+R.ax+' of '+R.w);ok(R.ay>=R.h-3&&R.ay<R.h+40,nm+' '+k+i+': anchor y')})}
ok(SSA.H>SPA.H,'the sand spider (longer legs) is not the taller sheet');
ok(FS_WEB_MS===60&&/case'web':[^\n]*fxo\(T_PROJ,[^,]+,[^,]+,60\*sp,/.test(src('75-fx.js')),'the web leaves 60 ms after the cast (75-fx.js) and the frames know it');
for(const id of['spider','sspider']){const an=FS_DEF[id].an,d=an.attack,c=an.cast,N=7,nd=id==='spider'?7:6;
 ok(Math.abs(fsHitMs(d)-M)<.01&&d.imp===4&&fsIdx(N,d,0,M-.5,0)===3&&fsIdx(N,d,0,M,0)===4&&fsIdx(N,d,0,0,0)===0&&fsIdx(N,d,0,d.ms-1,0)===N-1,id+': bite timing');
 ok(c.f==='cast'&&fsHitMs(c)===60&&fsIdx(N,c,0,0,0)===0&&fsIdx(N,c,0,59.5,0)===2&&fsIdx(N,c,0,60,0)===3&&fsIdx(N,c,0,c.ms-1,0)===N-1,id+': spit timing');
 for(let i=0;i<8;i++)ok(fsIdx(8,an.walk,(i+.5)/8,0,0)===i,id+': run frame '+i);ok(fsIdx(nd,an.death,0,0,1)===nd-1,id+': death held');
 ok(an.hit.f==='hurt'&&an.charge.f==='run'&&FS_DEF[id].rigSt.idle,id+': rows');ok(FS_DEF[id].vary===FS_DEF.spider.vary,id+': vary')}
ok(!/Math\.random|\brnd\(/.test(src('76o-spider.js').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')),'76o-spider.js uses randomness');
/* ---------- browser ---------- */
const {chromium}=require('playwright');
(async()=>{const html=path.resolve(process.argv[2]||'dist/index.html');let main=process.argv[3];
 if(!main){main=path.join(os.tmpdir(),'spider-main.html');try{fs.writeFileSync(main,cp.execSync('git show main:index.html',{cwd:ROOT,maxBuffer:1<<30}))}catch(e){main=''}}
 const b=await chromium.launch(),errs=[];
 const open=async f=>{const p=await b.newPage({viewport:{width:667,height:375}});p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
  await p.goto('file://'+f);await p.waitForTimeout(300);await p.evaluate(()=>{newGame();closeSheet();if(typeof fsImg==='function')for(const id of['spider','sspider','wolf'])if(FS_DEF[id])fsImg(id)});
  await p.waitForFunction(()=>typeof fsImg!=='function'||['spider','sspider','wolf'].every(id=>!FS_DEF[id]||!!fsImg(id)),null,{timeout:20000});return p};
 const p=await open(html);
 const R=await p.evaluate(()=>{const bad=[],n={frames:0,cy:{}};let uid=950;const SP_CY={up:[-8,-2],death:[-7,3]};   // the centroid's band (art px under the tile point): standing (at dy 0 it was -9.7 .. -11), and fallen
  const c=document.createElement('canvas');c.width=500;c.height=320;const q=c.getContext('2d');
  const measure=Fr=>{q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,c.width,c.height);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Fr,62.5,70);q.setTransform(1,0,0,1,0,0);
   const d=q.getImageData(0,0,c.width,c.height).data,xs=[];let y0=1e9,y1=-1,x0=1e9,x1=-1,sy=0;for(let j=3;j<d.length;j+=4)if(d[j]>128){const i=j>>2,x=i%c.width,y=(i/c.width)|0;xs.push(x);sy+=y;if(y<y0)y0=y;if(y>y1)y1=y;if(x<x0)x0=x;if(x>x1)x1=x}
   xs.sort((a,b)=>a-b);return{n:xs.length,mx:xs.length?(xs[xs.length>>1]-250)/4:0,lo:(y1+1-280)/4,h:(y1+1-y0)/4,w:(x1+1-x0)/4,cy:xs.length?(sy/xs.length+.5-280)/4:0}};   // cy: the figure's centroid (art px under the tile point)
  // which sheet
  {const u=mkEnemy('spider','beast');u.id=++uid;const B0=B;
   B={bk:'forest'};if(fsId(u)!=='spider')bad.push('forest battle: '+fsId(u));B={bk:'desert'};if(fsId(u)!=='sspider')bad.push('desert battle: '+fsId(u));
   u.spv='forest';if(fsId(u)!=='spider')bad.push('spv forest in the desert: '+fsId(u));B={bk:'swamp'};u.spv='sand';if(fsId(u)!=='sspider')bad.push('spv sand: '+fsId(u));B=B0;
   const w=mkEnemy('wolf','beast');B={bk:'desert'};if(fsId(w)!=='wolf')bad.push('the wolf varies: '+fsId(w));B=B0}
  for(const [id,spv] of[['spider','forest'],['sspider','sand']]){const u=mkEnemy('spider','beast');u.id=++uid;u.spv=spv;const S=SHEETS[id],A=FS_DEF[id].atl(),K=4*HUM_A*fsSc(id),nd=A.f.death.length;
   if(fsId(u)!==id||!fsOn(u))bad.push(id+': not drawn from its sheet');if(!(S.dy>=4&&S.dy<=6.5))bad.push(id+': dy '+S.dy+' (the legs splay round the tile: the near tips past the ring\'s centre, inside it (9 px tall), the body over the centre)');
   const rows=[['idle',8,i=>({c:i/8})],['walk',8,i=>({c:(i+.5)/8})],['flee',8,i=>({c:(i+.5)/8})],['attack',7,i=>{const H=240*AN_HIT_AT,d=FS_DEF[id].an.attack;return{el:i<d.imp?(i+.5)/d.imp*H:H+(i-d.imp+.5)/(7-d.imp)*(d.ms-H)}}],
    ['attack',7,i=>({c:(i+.5)/7,row:'charge'})],['cast',7,i=>({el:i<3?(i+.5)/3*60:60+(i-3+.5)/4*700})],['hit',7,i=>({el:(i+.5)/7*600})],['death',nd,i=>({t:(i+.5)/nd})],['swap',1,()=>({c:0})],['reload',1,()=>({c:0})]];
   const seen={};
   for(const face of[0,1,2,3])for(const [st,NN,tf] of rows)for(let i=0;i<NN;i++){const tm=tf(i);let Fr=fsFrame(id,face,st,tm,K,0,u);n.frames++;const nm=Fr.rig?'rig':Fr.anim+Fr.fi,tag=id+' f'+face+' '+st+' '+JSON.stringify(tm)+' '+nm;seen[nm]=1;
    if(Fr.mir!==(face===1||face===2))bad.push(tag+': mirror');if(!Fr.list.length||Fr.list.some(x=>!(x.a&&x.a.cv&&x.a.cv.width>0)))bad.push(tag+': empty');
    const m=measure(Fr);if(m.n<1500)bad.push(tag+': nearly empty ('+m.n+')');
    if(Math.abs(m.mx)>(Fr.rig?1:/^(attack|cast)/.test(nm)?2.5:2))bad.push(tag+': body centre '+m.mx.toFixed(2)+' art px off the tile point');
    if(Math.abs(m.lo-S.dy)>1)bad.push(tag+': lowest leg tip '+m.lo.toFixed(2)+' art px under the tile point (want '+S.dy+')');
    // the body sits in the tile: the figure's centroid (the abdomen over the plate) just above the tile point, the near legs below it
    const cb=SP_CY[st==='death'?'death':'up'];if(m.cy<cb[0]||m.cy>cb[1])bad.push(tag+': centroid '+m.cy.toFixed(2)+' art px under the tile point (want '+cb+')');(n.cy[id+st]||(n.cy[id+st]=[9,-9]));n.cy[id+st]=[Math.min(n.cy[id+st][0],+m.cy.toFixed(2)),Math.max(n.cy[id+st][1],+m.cy.toFixed(2))]}
   // the frames not reached by the sampled clock above: drawn straight from the atlas
   for(const k in A.f)A.f[k].forEach((_,i)=>{if(!seen[k+i])bad.push(id+': frame '+k+i+' never drawn')});
   {const a=measure(fsFrame(id,0,'idle',{c:0},K,0,u)),f=measure(fsFrame(id,0,'walk',{c:.01},K,0,u));if(Math.abs(a.h-f.h)>1.5||Math.abs(a.lo-f.lo)>1||Math.abs(a.mx-f.mx)>1.5)bad.push(id+': the idle rig and the run row\'s first frame differ: '+JSON.stringify([a,f]))}
   for(const [st,NN,tf] of rows)for(let i=0;i<NN;i++)for(const [b2,f2] of[[3,0],[2,1]]){const X=fsFrame(id,b2,st,tf(i),K,0,u),Y=fsFrame(id,f2,st,tf(i),K,0,u);
    if(X.mir!==Y.mir||X.list.length!==Y.list.length||X.list.some((x,j)=>x.a!==Y.list[j].a||x.m.some((v,k)=>Math.abs(v-Y.list[j].m[k])>1e-9)))bad.push(id+': face '+b2+' is not face '+f2+' '+st)}
   // the faces are expressions for the state and mood, not an idle cycle: neutral at rest through the whole loop
   {const seenH={};for(let t=0;t<4;t+=.01)seenH[fsFrame(id,0,'idle',{c:t},K,3,u).face]=1;if(Object.keys(seenH).join()!=='neutral')bad.push(id+': idle faces at rest '+Object.keys(seenH))}
   {const s=anOf(u),SP=SPEEDF,N0=now,B0=B,hp=u.hp,T0=90000;SPEEDF=1;now=T0;const face=()=>fsFrame(id,0,'idle',{c:.3},K,0,u).face,want=(w,m)=>{const f=face();if(f!==w)bad.push(id+' '+m+': face '+f+' (want '+w+')')};
    s.hitT=-1e9;s.at0=-1e9;s.act=0;s.dead=false;want('neutral','at rest');
    s.hitT=T0-1200;want('squint','after a blow');s.hitT=T0-2600;want('neutral','long after a blow');
    s.act=1;s.at0=T0-1500;want('angry','after its bite');u.hp=Math.floor(u.hpMax*.3);want('fury','after its bite, wounded');u.hp=hp;
    s.act=2;want('glow','after Spit web');s.at0=T0-3000;want('neutral','long after a cast');
    B={cur:u,bk:'forest'};want('glare','on its turn');B=B0;u.hp=Math.floor(u.hpMax*.3);want('hurt','wounded at rest');u.hp=hp;
    s.dead=true;want('dead','dead');s.dead=false;
    // the baked sprite follows the face
    s.act=1;s.at0=T0-1500;const o1=fsBuild(u,0,'idle',0);s.at0=-1e9;const o2=fsBuild(u,0,'idle',0);if(!o1||!o2||o1===o2)bad.push(id+': the baked idle does not follow the face');
    s.act=0;SPEEDF=SP;now=N0}
   {const Fr=fsFrame(id,0,'idle',{c:0},K,0,u),legs=Fr.list.filter(x=>/^leg_/.test(x.tag)).length;if(legs!==8)bad.push(id+': the rig has '+legs+' legs');
    // legs planted: the legs keep their place through the breath while the head rides it
    const at=t=>{const F2=fsFrame(id,0,'idle',{c:t},0,0,u);return k=>F2.list.find(x=>x.tag===k).m};const a0=at(0),a1=at(.125);
    if(Math.abs(a0('leg_l1')[5]-a1('leg_l1')[5])>1e-6)bad.push(id+': the legs move with the breath');if(Math.abs(a0('head')[5]-a1('head')[5])<.5)bad.push(id+': the head does not ride the breath')}
   // the live board frame on the game's clock
   const s=anOf(u),SP=SPEEDF,N0=now;SPEEDF=1;const v={pS:'attack',pF:1,pPh:.5,pCy:0,pD:0,pAn:''},row=()=>{const Fr=fsLiveFrame(u,v);return Fr?Fr.rig?'rig':Fr.anim+Fr.fi:'none'};const T0=60000,tt=el=>{now=T0+el};
   s.act=1;s.adur=240;s.at0=T0;s.hitT=-1e9;s.dead=false;s.vaId='';s.mv=false;
   tt(89);if(row()!=='attack3')bad.push(id+' before the bite: '+row());tt(92);if(row()!=='attack4')bad.push(id+' at the bite: '+row());v.pS='idle';tt(500);if(!/^attack[56]$/.test(row()))bad.push(id+' follow-through: '+row());tt(900);if(row()!=='rig')bad.push(id+' back to the rig: '+row());
   animEvent('cast',{u,ab:Object.assign({id:'sweb'},AB.sweb)});if(s.act!==2)bad.push(id+': Spit web is not a cast ('+s.act+')');s.at0=T0;v.pS='cast';tt(50);if(row()!=='cast2')bad.push(id+' Spit web before the web leaves: '+row());tt(61);if(row()!=='cast3')bad.push(id+' Spit web as the web leaves: '+row());tt(700);if(!/^cast6$/.test(row()))bad.push(id+' Spit web ends on '+row());
   animEvent('turn',{u});s.act=0;s.mv=true;s.mk=AN_DASH;s.mt0=T0;v.pS='attack';v.pPh=.2;{const r=new Set();for(let el=0;el<600;el+=20){tt(el);r.add(row())}if(![...r].every(x=>/^run/.test(x))||r.size<4)bad.push(id+': the charge does not run: '+[...r])}s.mv=false;v.pPh=.5;
   s.act=0;s.hitT=T0+1000;v.pS='idle';tt(1300);if(!/^hurt/.test(row()))bad.push(id+': the hurt row is not playing 300 ms after the blow: '+row());tt(1700);if(/^hurt/.test(row()))bad.push(id+': still hurt 700 ms after');
   s.dead=true;s.deadT=T0;v.pS='death';v.pPh=1;tt(3000);if(row()!=='death'+(nd-1))bad.push(id+': the corpse is '+row());s.dead=false;s.deadT=-1e9;s.hitT=-1e9;SPEEDF=SP;now=N0;
   if(humLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': drawn as a person');
   for(const face of[0,1,2,3]){const o=monsterSpritePx(u,face,'idle',0);if(!o||o.fs!==id){bad.push(id+' f'+face+': the sprite is not the figure');continue}if(monsterSpritePx(u,face,'idle',0)!==o)bad.push(id+' f'+face+': rebuilt')}
   FS.off=1;{if(sheetSpritePx(u,0,'idle',0))bad.push(id+': a sheet sprite while off');const o=unitSpritePx(u,0,'idle',0);if(!o||o.fs||o.smooth)bad.push(id+': no pixel fallback while off');if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': a live figure while off')}FS.off=0;
   SET.detail='low';artChanged();if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': figure at Detail Low');{const o=unitSpritePx(u,0,'idle',0);if(!o||o.fs)bad.push(id+': Detail Low drew the figure')}SET.detail='high';artChanged()}
  // about a wolf's size on the board (the run's first frame against the wolf's)
  {const sz=(id,u)=>{const Fr=fsFrame(id,0,'walk',{c:.01},4*HUM_A*fsSc(id),0,u);return measure(Fr)},u=mkEnemy('spider','beast');u.spv='forest';const S=sz('spider',u),W=sz('wolf',mkEnemy('wolf','beast'));u.spv='sand';const D=sz('sspider',u);n.size={spider:S,sand:D,wolf:W};
   if(!(S.h>W.h*.75&&S.h<W.h*1.25&&S.w>W.w*.6&&S.w<W.w*1.3))bad.push('the forest spider is not wolf-sized: '+JSON.stringify([S,W]));
   if(Math.abs(D.n/S.n-1)>.35||D.h<S.h)bad.push('the sand spider is not the forest spider\'s size with longer legs: '+JSON.stringify([D,S]))}
  return{bad,n}});
 for(const x of R.bad)bad.push(x);
 // untouched seeded battles in the forest and the desert: each spider's tile centre, ring centre and figure (body centre over its legs) agree within 1 art px
 for(const bio of['forest','desert']){
  await p.evaluate(bio=>{SET.detail='high';artChanged();SET.deploy=false;seedRng(77);newGame(true);closeSheet();seedRng(78);startBattle({f:'beast',mult:1,biome:bio,foes:['spider','spider','wolf'],src:{type:'sim'}});try{if(typeof deployDone==='function')deployDone()}catch(e){}},bio);
  await p.waitForTimeout(500);await p.waitForFunction(()=>B.cur&&B.cur.side===0&&!B.busy&&B.units.every(u=>!u.alive||!anOf(u).mv&&!(VIS.get(u)||{}).mv),null,{timeout:60000});await p.waitForTimeout(400);
  const T=await p.evaluate(bio=>{const bad=[],out=[];const c=document.createElement('canvas');c.width=600;c.height=400;const q=c.getContext('2d');const want=bio==='desert'?'sspider':'spider',CYB=[-7.5,-3];   // idle: the body over the tile centre (-9.7 and -11.4 when the lowest tip stood on it)
   if(B.bk!==bio)bad.push('the battle is fought on '+B.bk+', not '+bio);
   for(const u of B.units.filter(u=>u.alive&&u.side&&msEnKey(u.def)==='spider')){const id=fsId(u),v=VIS.get(u),t=tpos(u.c,u.r,T(u).h),tx=t.x/2,ty=t.y/2;if(id!==want)bad.push(bio+': the spider is drawn from '+id);
    const x=Math.round((u.sx+v.pX)/2),gy=Math.round((u.sy+v.pY+v.pL)/2),y=Math.round((u.sy+v.pY)/2),E=ELL.ok?ELL:ellInit(),rg=ellRing(E,u,false,!!(u.def&&u.def.big)),rx=x-(rg.width>>1)+rg.width/2,ry=gy-(rg.height>>1)+rg.height/2;
    if(Math.abs(rx-tx)>1||Math.abs(ry-ty)>1)bad.push(bio+' spider at '+u.c+','+u.r+': ring centre off its tile centre by '+(rx-tx)+','+(ry-ty));
    for(const face of[0,1,2,3]){const Fr=fsLiveFrame(u,Object.assign({},v,{pS:'idle',pD:face,pCy:0,pPh:0,pAn:''}));if(!Fr){bad.push(bio+': no live spider');continue}
     q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,600,400);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Fr,75+(x-tx),80+(y-ty));q.setTransform(1,0,0,1,0,0);
     const d=q.getImageData(0,0,600,400).data,xs=[];let y1=-1,sy=0;for(let j=3;j<d.length;j+=4)if(d[j]>128){const i=j>>2;xs.push(i%600);const yy=(i/600)|0;sy+=yy;if(yy>y1)y1=yy}xs.sort((a,b)=>a-b);
     const fx=xs[xs.length>>1]/4-75,fy=(y1+1)/4-80,cy=(sy/xs.length+.5)/4-80,dy=SHEETS[id].dy;out.push(u.id);
     if(Math.abs(fx)>1||Math.abs(fy-dy)>1)bad.push(bio+' spider at '+u.c+','+u.r+' face '+face+': body centre / lowest leg tip off by '+fx.toFixed(2)+','+(fy-dy).toFixed(2)+' (the tips '+dy+' under the tile centre)');
     if(cy<CYB[0]||cy>CYB[1])bad.push(bio+' spider at '+u.c+','+u.r+' face '+face+': its body does not sit on the tile: centroid '+cy.toFixed(2)+' art px under the tile centre')}}
   if(new Set(out).size<2)bad.push(bio+': the seeded battle has '+new Set(out).size+' spiders');return{bad}},bio);
  for(const x of T.bad)bad.push(x)}
 // Detail Low: the forest spider as main; the sand spider (spv) a recolour of it: the same shapes, browner
 const lowSig=async(pg,spv)=>pg.evaluate(spv=>{SET.detail='low';artChanged();const out={},col={r:0,g:0,b:0,n:0};let uid=990;for(const id of['spider','wolf']){const u=mkEnemy(id,'beast');u.id=++uid;if(spv&&id==='spider')u.spv=spv;for(const st of['idle','walk','attack','cast','hit','death'])for(let fr=0;fr<4;fr++)for(const face of[0,1,2,3]){let o=null;try{o=unitSpritePx(u,face,st,fr)}catch(e){}
   if(!o||!o.cv){out[id+st+fr+face]='-';continue}const W=o.cv.width,d=o.cv.getContext('2d').getImageData(0,0,W,o.cv.height).data;let h=2166136261,a=0,X0=1e9,Y0=1e9,X1=-1,Y1=-1;
   for(let i=3;i<d.length;i+=4)if(d[i]){const p=i>>2,x=p%W,y=(p/W)|0;if(x<X0)X0=x;if(x>X1)X1=x;if(y<Y0)Y0=y;if(y>Y1)Y1=y}
   for(let y=Y0;y<=Y1;y++)for(let x=X0;x<=X1;x++)for(let k=0;k<4;k++){h^=d[(y*W+x)*4+k];h=Math.imul(h,16777619)>>>0}
   for(let i=0;i<d.length;i+=4)if(d[i+3]>128){a++;if(id==='spider'){col.r+=d[i];col.g+=d[i+1];col.b+=d[i+2];col.n++}}const kk=o.k||1;out[id+st+fr+face]=(X1-X0+1)+'x'+(Y1-Y0+1)+':'+h;out['y:'+id+st+fr+face]=Math.round((Y1+1)/kk-o.ay);out['x:'+id+st+fr+face]=Math.round(X0/kk-o.ax);out['a:'+id+st+fr+face]=a}}out.col=col;return out},spv||'');
 const US_DY=await p.evaluate(()=>US_SPDY);if(US_DY!==3)bad.push('the Detail Low spider sits '+US_DY+' px down (want 3)');
 let lowN=0;if(main&&fs.existsSync(main)){const pm=await open(main);const X=await lowSig(p,'forest'),Mm=await lowSig(pm,'');for(const k in Mm){if(k==='col'||k[1]===':')continue;lowN++;const sp=/^spider/.test(k);
   if(X[k]!==Mm[k]||X['x:'+k]!==Mm['x:'+k])bad.push('Detail Low differs from main: '+k);if(X['y:'+k]!==Mm['y:'+k]+(sp?US_DY:0))bad.push('Detail Low '+k+': the figure\'s foot '+X['y:'+k]+' vs main '+Mm['y:'+k]+(sp?' + '+US_DY:''))}}else console.log('(main build not found: Detail Low comparison skipped)');
 {const X=await lowSig(p,'forest'),Y=await lowSig(p,'sand');let same=0,diff=0;for(const k in X){if(!/^spider/.test(k))continue;if(X[k]===Y[k])same++;else diff++;if(X['a:'+k]!==Y['a:'+k])bad.push('the sand spider at Detail Low is not the same shape: '+k)}
  if(same)bad.push(same+' Detail Low sand spider frames are the forest spider\'s');const c=Y.col,f=X.col,br=c.r/c.n-c.b/c.n,fr=f.r/f.n-f.b/f.n;if(!(br>fr+12))bad.push('the sand spider at Detail Low is not browner: '+[br,fr]);
  if(!(diff>0))bad.push('no Detail Low sand spider frames')}
 for(const e of errs)bad.push(e);
 console.log(JSON.stringify({frames:R.n.frames,size:R.n.size,centroid:R.n.cy,lowCompared:lowN,bad:bad.length}));
 if(bad.length)console.log('FAIL:\n'+bad.slice(0,50).join('\n')+(bad.length>50?'\n... '+(bad.length-50)+' more':''));else console.log('OK');
 await b.close();process.exit(bad.length?1:0)})();
