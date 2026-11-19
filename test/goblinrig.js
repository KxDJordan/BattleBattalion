// The goblin frame sheets test:  node test/goblinrig.js [html] [main html]
// The Goblin skirmisher (EN 'gob'), the Goblin archer (EN 'gobarch') and the Goblin shaman (EN 'gobsham') at Detail High play the user's drawn frames (src/76g-frames.js,
// atlas src/76f-gobatlas.js). Node part: the frame player's timing (loops by the cycle; the skirmisher's stab and the archer's knife on
// the blow, AN_HIT_AT of the 240 ms attack; the archer's release frame and the poison arrow's glow when 75-fx.js looses the arrow, 40 ms
// in; the shaman's staff blow on the swing's arc, its hex leaving the staff's skull at the glow's peak 90 ms in, the war chant
// starting on that glow; death holding its last frame), the atlas anchors, no randomness. Browser part: every state x facing x sampled frame draws a
// non-empty figure whose body centre is over the tile point and whose feet are on the ground line (within 1.5 art px), about the
// painted sheet's height; the back facings are the front frames (face 3 = face 0, face 2 = face 1), faces 1 and 2 mirrored; the archer's
// poison arrow plays the cast row and a thrust at a neighbour is timed as a blow; the shaman's chant plays the cast row from the glow; the live board frame shows the impact / release frame
// at its time and the hit row past the game's short flinch, death its last frame; the baked sprite is the figure; the pixel goblin
// is the fallback while it is off; Detail Low draws the same pixels as main for all three goblins.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),os=require('os');
const ROOT=path.join(__dirname,'..'),F=f=>path.join(ROOT,f);
const bad=[];const ok=(c,m)=>{if(!c)bad.push(m)};
const ctx={console,Math,JSON,performance:{now:()=>0},Map,WeakMap,Set,Array,Object,Number,String};vm.createContext(ctx);
const src=f=>fs.readFileSync(F('src/'+f),'utf8');
vm.runInContext(src('73k-humans.js').match(/const HUM_A=[^;]+;/)[0]+'\nconst AN_HIT_AT=.38;',ctx);
vm.runInContext(src('73m-skel.js')+'\n'+src('76f-gobatlas.js')+'\n'+src('76g-frames.js')+'\n;this.__g={fsIdx,fsHitMs,FS_DEF,GBA,GAA,GSA};',ctx);
const {fsIdx,fsHitMs,FS_DEF,GBA,GAA,GSA}=ctx.__g;
ok(GBA.f.idle.length===6&&GBA.f.run.length===6&&GBA.f.attack.length===6&&GBA.f.hit.length===6&&GBA.f.death.length===6,'the skirmisher: five rows of six');
ok(['idle','run','attack','cast','hit','death'].every(k=>GAA.f[k]&&GAA.f[k].length===8),'the archer: six rows of eight');
ok(['idle','run','attack','cast','hit','death'].every(k=>GSA.f[k]&&GSA.f[k].length===8),'the shaman: six rows of eight');
const g=FS_DEF.gob.an,a=FS_DEF.gobarch.an,sh=FS_DEF.gobsham.an,M=fsHitMs(g.attack);ok(fsHitMs(sh.attack)===M&&fsHitMs(sh.cast)===90,'the shaman: blow and spell times');ok(Math.abs(M-91.2)<.01&&fsHitMs(a.attack)===40&&fsHitMs(a.poison)===40&&fsHitMs(a.stab)===M,'impact times');
const blow=(nm,d,n,imp,H,first)=>{ok(fsIdx(n,d,0,H-.5,0)===imp-1,nm+': the frame before the blow is not the wind-up ('+fsIdx(n,d,0,H-.5,0)+')');ok(fsIdx(n,d,0,H,0)===imp,nm+': frame '+imp+' not shown at its time');
 ok(fsIdx(n,d,0,0,0)===first,nm+': does not start on frame '+first);ok(fsIdx(n,d,0,d.ms-1,0)===n-1,nm+': does not end on its last frame')};
blow('skirmisher stab',g.attack,6,3,M,0);blow('archer shot',a.attack,8,5,40,3);blow('archer poison arrow',a.poison,8,5,40,4);blow('archer knife',a.stab,8,5,M,3);blow('shaman staff blow',sh.attack,8,4,M,0);blow('shaman spell',sh.cast,8,4,90,2);
ok(sh.chant.f==='cast'&&fsIdx(8,sh.chant,0,0,0)===4&&fsIdx(8,sh.chant,0,sh.chant.ms-1,0)===7,'the war chant: the cast row from the glow on the skull');
ok(a.poison.f==='cast','the poison arrow plays the cast row');
for(const [nm,d,n] of[['skirmisher idle',g.idle,6],['skirmisher run',g.walk,6],['archer idle',a.idle,8],['archer run',a.walk,8],['shaman idle',sh.idle,8],['shaman run',sh.walk,8]]){const r=d.rate||1;for(let i=0;i<n;i++)ok(fsIdx(n,d,(i+.5)/n/r,0,0)===i,nm+' frame '+i+' at its share of the cycle');ok(fsIdx(n,d,1/r+.001,0,0)===0,nm+' loops')}
for(const [nm,d,n] of[['skirmisher',g,6],['archer',a,8],['shaman',sh,8]]){ok(fsIdx(n,d.death,0,0,1)===n-1&&fsIdx(n,d.death,0,0,0)===0,nm+': death holds its last frame');ok(fsIdx(n,d.hit,0,d.hit.ms-1,0)===n-1,nm+': the hit row ends on its last frame')}
for(const [nm,A] of[['skirmisher',GBA],['archer',GAA],['shaman',GSA]])for(const k in A.f)A.f[k].forEach((R,i)=>{ok(R.ax>R.w*.15&&R.ax<R.w*.85,nm+' '+k+i+': anchor x '+R.ax+' of '+R.w);ok(R.ay>=R.h-3&&R.ay<R.h+60,nm+' '+k+i+': anchor y '+R.ay+' vs '+R.h)});
ok(!/Math\.random|\brnd\(/.test(src('76g-frames.js').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')),'76g-frames.js uses randomness');
/* ---------- browser ---------- */
const {chromium}=require('playwright');
(async()=>{const html=path.resolve(process.argv[2]||'dist/index.html');let main=process.argv[3];
 if(!main){main=path.join(os.tmpdir(),'goblinrig-main.html');try{fs.writeFileSync(main,cp.execSync('git show HEAD:index.html',{cwd:ROOT,maxBuffer:1<<30}))}catch(e){main=''}}
 const b=await chromium.launch(),errs=[];
 const open=async f=>{const p=await b.newPage({viewport:{width:667,height:375}});p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
  await p.goto('file://'+f);await p.waitForTimeout(300);await p.evaluate(()=>{newGame();closeSheet();if(typeof fsImg==='function'){fsImg('gob');fsImg('gobarch');fsImg('gobsham')}});
  await p.waitForFunction(()=>typeof fsImg!=='function'||['gob','gobarch','gobsham'].every(id=>!FS_DEF[id]||!!fsImg(id)),null,{timeout:20000});return p};
 const p=await open(html);
 const R=await p.evaluate(()=>{const bad=[],n={frames:0};let uid=950;
  const c=document.createElement('canvas');c.width=300;c.height=240;const q=c.getContext('2d');
  const measure=Fr=>{q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,c.width,c.height);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Fr,37.5,50);q.setTransform(1,0,0,1,0,0);
   const d=q.getImageData(0,0,c.width,c.height).data,xs=[];let y0=1e9,y1=-1;for(let j=3;j<d.length;j+=4)if(d[j]>128){const i=j>>2,x=i%c.width,y=(i/c.width)|0;xs.push(x);if(y<y0)y0=y;if(y>y1)y1=y}
   xs.sort((a,b)=>a-b);return{n:xs.length,mx:xs.length?(xs[xs.length>>1]-150)/4:0,lo:(y1+1-200)/4,h:(y1+1-y0)/4}};
  for(const id of['gob','gobarch','gobsham']){const u=mkEnemy(id,'gob');u.id=++uid;const S=SHEETS[id],A=FS_DEF[id].atl(),K=4*HUM_A*fsSc(id);
   if(!fsOn(u))bad.push(id+': not drawn from its sheet');
   const air=new Set();A.f.run.forEach((R,i)=>{if(R.ay>R.h+1)air.add('run'+i)});
   const rows=[['idle',A.f.idle.length,i=>({c:(i+.5)/A.f.idle.length/2})],['walk',A.f.run.length,i=>({c:(i+.5)/A.f.run.length})],['flee',A.f.run.length,i=>({c:(i+.5)/A.f.run.length})],['hit',A.f.hit.length,i=>({el:(i+.5)/A.f.hit.length*FS_DEF[id].an.hit.ms})],
    ['death',A.f.death.length,i=>({t:(i+.5)/A.f.death.length})],['attack',8,i=>({el:[0,10,20,30,39,41,200,500][i]})],['swap',1,()=>({c:0})],['reload',1,()=>({c:0})]];
   if(id==='gobarch')rows.push(['attack',8,i=>({el:[0,20,39,41,200,300,500,630][i],row:'poison'})],['attack',8,i=>({el:[0,50,91.2,200,300,400,500,550][i],row:'stab'})],['cast',8,i=>({el:(i+.5)/8*760})]);
   else if(id==='gobsham')rows.push(['attack',8,i=>({el:[0,30,60,89,91.2,250,400,580][i]})],['cast',8,i=>({el:[0,40,89,91,200,350,500,700][i]})],['cast',4,i=>({el:[0,200,400,690][i],row:'chant'})]);
   else rows.push(['attack',6,i=>({el:[0,40,80,91.2,300,500][i]})],['cast',2,i=>({c:i/2})]);
   const seen={};
   for(const face of[0,1,2,3])for(const [st,N,tf] of rows)for(let i=0;i<N;i++){const tm=tf(i),Fr=fsFrame(id,face,st,tm,K,0);n.frames++;const tag=id+' f'+face+' '+st+' '+JSON.stringify(tm)+' '+Fr.anim+Fr.fi;seen[Fr.anim+Fr.fi]=1;
    if(Fr.mir!==(face===1||face===2))bad.push(tag+': mirror');if(!Fr.list.length||Fr.list.some(x=>!(x.a&&x.a.cv&&x.a.cv.width>0)))bad.push(tag+': empty');
    const m=measure(Fr);if(m.n<800)bad.push(tag+': nearly empty ('+m.n+')');
    if(Math.abs(m.mx)>1.5)bad.push(tag+': body centre '+m.mx.toFixed(2)+' art px off the tile point');
    if(!air.has(Fr.anim+Fr.fi)&&Math.abs(m.lo-S.dy)>1.5)bad.push(tag+': feet '+m.lo.toFixed(2)+' art px under the tile point (want '+S.dy+')');
    if(st==='idle'&&Math.abs(m.h-S.h)>S.h*.15)bad.push(tag+': height '+m.h.toFixed(1)+' vs the painted '+S.h)}
   // every frame plays, but the archer's first three draw frames: its arrow leaves 40 ms after the shot, so the shot starts at full draw
   // likewise the shaman's first two cast frames: its bolt leaves 90 ms after the cast, so the spell starts with the glow in the hand
   for(const k in A.f)A.f[k].forEach((_,i)=>{if(!seen[k+i]&&!(id==='gobarch'&&k==='attack'&&i<3)&&!(id==='gobsham'&&k==='cast'&&i<2))bad.push(id+': frame '+k+i+' never drawn')});
   // the back facings draw the front frames
   for(const [st,N,tf] of rows)for(let i=0;i<N;i++)for(const [b2,f2] of[[3,0],[2,1]]){const X=fsFrame(id,b2,st,tf(i),K,0),Y=fsFrame(id,f2,st,tf(i),K,0);if(X.mir!==Y.mir||X.list[0].a!==Y.list[0].a||X.list[0].m.some((v,j)=>Math.abs(v-Y.list[0].m[j])>1e-9))bad.push(id+': face '+b2+' is not face '+f2+' '+st)}
   // the live board frame on the game's clock
   const s=anOf(u),SP=SPEEDF,N0=now;SPEEDF=1;const v={pS:'attack',pF:1,pPh:.5,pCy:0,pD:0,pAn:''},row=()=>{const Fr=fsLiveFrame(u,v);return Fr?Fr.anim+Fr.fi:'none'};const T0=60000,tt=el=>{now=T0+el};
   s.act=1;s.adur=240;s.at0=T0;s.hitT=-1e9;s.dead=false;s.vaId='';s.lc=s.lr=0;
   if(id==='gob'){tt(89);if(row()!=='attack2')bad.push('gob before the blow: '+row());tt(92);if(row()!=='attack3')bad.push('gob at the blow: '+row());v.pS='idle';tt(450);if(row()!=='attack5')bad.push('gob follow-through: '+row());tt(600);if(row()!=='idle'+fsIdx(6,FS_DEF.gob.an.idle,v.pCy,0,0))bad.push('gob back to idle: '+row())}
   else if(id==='gobsham'){tt(89);if(row()!=='attack3')bad.push('shaman before the blow: '+row());tt(92);if(row()!=='attack4')bad.push('shaman at the blow: '+row());
    s.act=2;s.adur=380;v.pS='cast';tt(89);if(row()!=='cast3')bad.push('shaman spell before the bolt: '+row());tt(91);if(row()!=='cast4')bad.push('shaman spell when the bolt leaves: '+row());v.pS='idle';tt(500);if(row()!=='cast6')bad.push('shaman spell after the game\'s cast: '+row());
    animEvent('cast',{u,ab:Object.assign({id:'gchant'},AB.gchant||{})});s.at0=T0;s.vaT=T0;v.pS='cast';tt(1);if(row()!=='cast4')bad.push('the war chant starts on '+row());animEvent('turn',{u})}
   else{tt(39);if(row()!=='attack4')bad.push('archer before the release: '+row());tt(41);if(row()!=='attack5')bad.push('archer release: '+row());
    animEvent('cast',{u,ab:Object.assign({id:'gpoison'},AB.gpoison||{})});s.act=1;s.at0=T0;s.vaT=T0;v.pS='attack';tt(20);if(row()!=='cast4')bad.push('poison arrow before the release: '+row());tt(41);if(row()!=='cast5')bad.push('poison arrow release: '+row());
    animEvent('turn',{u});s.act=1;s.at0=T0;s.lc=1;tt(89);if(row()!=='attack4')bad.push('knife before the blow: '+row());tt(92);if(row()!=='attack5')bad.push('knife at the blow: '+row());s.lc=0}
   s.act=0;s.hitT=T0+1000;v.pS='idle';tt(1300);if(!/^hit/.test(row()))bad.push(id+': the hit row is not playing 300 ms after the blow: '+row());tt(1700);if(/^hit/.test(row()))bad.push(id+': still hurt 700 ms after');
   s.dead=true;s.deadT=T0;v.pS='death';v.pPh=1;tt(3000);if(row()!=='death'+(A.f.death.length-1))bad.push(id+': the corpse is '+row());s.dead=false;s.deadT=-1e9;s.hitT=-1e9;SPEEDF=SP;now=N0;
   // sprites, fallback
   if(humLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': drawn as a person');
   for(const face of[0,1,2,3]){const o=monsterSpritePx(u,face,'attack',1);if(!o||o.fs!==id){bad.push(id+' f'+face+': the sprite is not the figure');continue}if(monsterSpritePx(u,face,'attack',1)!==o)bad.push(id+' f'+face+': rebuilt')}
   FS.off=1;{if(sheetSpritePx(u,0,'idle',0))bad.push(id+': a sheet sprite while off');const o=unitSpritePx(u,0,'idle',0);if(!o||o.fs||o.smooth)bad.push(id+': no pixel fallback while off');if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': a live figure while off')}FS.off=0;
   SET.detail='low';artChanged();if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': figure at Detail Low');{const o=unitSpritePx(u,0,'idle',0);if(!o||o.fs)bad.push(id+': Detail Low drew the figure')}SET.detail='high';artChanged()}
  return{bad,n}});
 for(const x of R.bad)bad.push(x);
 const lowSig=async pg=>pg.evaluate(()=>{SET.detail='low';artChanged();const out={};let uid=990;
  for(const id of['gob','gobarch','gobsham']){const u=mkEnemy(id,'gob');u.id=++uid;for(const st of['idle','walk','attack','cast','hit','death'])for(let fr=0;fr<4;fr++)for(const face of[0,1,2,3]){let o=null;try{o=unitSpritePx(u,face,st,fr)}catch(e){}
   if(!o||!o.cv){out[id+st+fr+face]='-';continue}const d=o.cv.getContext('2d').getImageData(0,0,o.cv.width,o.cv.height).data;let h=2166136261;for(let i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619)>>>0}out[id+st+fr+face]=o.cv.width+'x'+o.cv.height+':'+o.ax+','+o.ay+':'+h}}return out});
 let lowN=0;if(main&&fs.existsSync(main)){const pm=await open(main);const X=await lowSig(p),M=await lowSig(pm);for(const k in M){lowN++;if(X[k]!==M[k])bad.push('Detail Low differs from main: '+k)}}else console.log('(main build not found: Detail Low comparison skipped)');
 for(const e of errs)bad.push(e);
 console.log(JSON.stringify({frames:R.n.frames,lowCompared:lowN,bad:bad.length}));
 if(bad.length)console.log('FAIL:\n'+bad.slice(0,40).join('\n')+(bad.length>40?'\n... '+(bad.length-40)+' more':''));else console.log('OK');
 await b.close();process.exit(bad.length?1:0)})();
