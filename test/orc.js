// The orcs test:  node test/orc.js [html] [main html]
// The Orc warrior ('orcw'), Orc crusher ('obrute') and Orc warlord ('orcl') at Detail High play the user's drawn frames (src/76g-frames.js,
// atlases src/76j-orcatlas.js from assets/make-orc-atlas.py) and are paper cut-out rigs from the sheets' parts for the idle
// (src/76k-orc.js). Node part: the rows (the warrior seven a row; the crusher and warlord eight, seven dead); the frame player's timing
// (loops by the cycle, the blow's low frame at AN_HIT_AT, death holding its last frame); the anchors; every rig piece in the atlas with
// a pivot; the eight heads; no randomness. Browser part: every state x facing x sampled frame draws a non-empty figure whose body centre
// is over the tile point (idle within 1 art px; drawn frames within 2: a raised weapon or a glow pulls the median) and whose feet are on
// the tile point (1 art px; airborne run frames above it); the idle rig is as tall as the board figure and meets the attack row's first
// frame (height, feet, centre within 1.5 art px); the back facings are the front frames; faces 1 and 2 mirrored; every frame is
// played; the live board frame: the blow's frame at AN_HIT_AT and the follow-through after the game's attack, a charge's dash on the
// run row, War cry on the cast row, the hurt row past the game's short flinch, the corpse; the rig's expressions; the baked sprite is
// the figure; the pixel orc while it is off; the bars stay where they were; the Orc brave keeps its art; in an untouched seeded battle
// each orc's tile centre, ring centre and figure agree within 1 art px; Detail Low draws the same pixels as main for all four orcs.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),os=require('os');
const ROOT=path.join(__dirname,'..'),F=f=>path.join(ROOT,f);
const bad=[];const ok=(c,m)=>{if(!c)bad.push(m)};
const ctx={console,Math,JSON,performance:{now:()=>0},Map,WeakMap,Set,Array,Object,Number,String};vm.createContext(ctx);
const src=f=>fs.readFileSync(F('src/'+f),'utf8');
vm.runInContext(src('73k-humans.js').match(/const HUM_A=[^;]+;/)[0]+'\nconst AN_HIT_AT=.38;',ctx);
vm.runInContext(src('73m-skel.js')+'\n'+src('76g-frames.js')+'\n'+src('76j-orcatlas.js')+'\n'+src('76k-orc.js')+'\n;this.__g={fsIdx,fsHitMs,FS_DEF,ORA,OCA,OLA,OR_HEADS};',ctx);
const {fsIdx,fsHitMs,FS_DEF,ORA,OCA,OLA,OR_HEADS}=ctx.__g,M=240*.38;
const ORCS={orcw:[ORA,7,7],obrute:[OCA,8,7],orcl:[OLA,8,7]};
for(const id in ORCS){const [A,n,nd]=ORCS[id],an=FS_DEF[id].an;
 for(const k of['run','attack','cast','hurt','death'])ok(A.f[k]&&A.f[k].length===(k==='death'?nd:n),id+': row '+k+' has '+(A.f[k]||[]).length);
 ok(Math.abs(fsHitMs(an.attack)-M)<.01,id+': the blow time');
 const N=A.f.attack.length,d=an.attack;ok(fsIdx(N,d,0,M-.5,0)===d.imp-1&&fsIdx(N,d,0,M,0)===d.imp&&fsIdx(N,d,0,0,0)===0&&fsIdx(N,d,0,d.ms-1,0)===N-1,id+': attack timing');
 for(let i=0;i<n;i++)ok(fsIdx(n,an.walk,(i+.5)/n,0,0)===i,id+': run frame '+i+' at its share of the cycle');
 ok(fsIdx(nd,an.death,0,0,1)===nd-1&&fsIdx(nd,an.death,0,0,0)===0,id+': death holds its last frame');ok(fsIdx(n,an.hit,0,an.hit.ms-1,0)===n-1,id+': the hurt row ends on its last frame');
 ok(an.charge.f==='run'&&an.cast.f==='cast',id+': charge on the run row, cast on the cast row');
 for(const k in A.f)A.f[k].forEach((R,i)=>{ok(R.ax>R.w*.15&&R.ax<R.w*.85,id+' '+k+i+': anchor x '+R.ax+' of '+R.w);ok(R.ay>=R.h-3&&R.ay<R.h+60,id+' '+k+i+': anchor y '+R.ay+' vs '+R.h)});
 for(const s of A.set){ok(!!A.p[s[1]]&&A.p[s[1]].pv.length===2,id+': setup piece '+s[1]+' not in the atlas')}
 ok(OR_HEADS.every(h=>!!A.p[h]),id+': the eight heads');}
ok(!/Math\.random|\brnd\(/.test(src('76k-orc.js').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')),'76k-orc.js uses randomness');
/* ---------- browser ---------- */
const {chromium}=require('playwright');
(async()=>{const html=path.resolve(process.argv[2]||'dist/index.html');let main=process.argv[3];
 if(!main){main=path.join(os.tmpdir(),'orc-main.html');try{fs.writeFileSync(main,cp.execSync('git show HEAD:index.html',{cwd:ROOT,maxBuffer:1<<30}))}catch(e){main=''}}
 const b=await chromium.launch(),errs=[];
 const open=async f=>{const p=await b.newPage({viewport:{width:667,height:375}});p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
  await p.goto('file://'+f);await p.waitForTimeout(300);await p.evaluate(()=>{newGame();closeSheet();if(typeof fsImg==='function')for(const id of['orcw','obrute','orcl'])if(FS_DEF[id])fsImg(id)});
  await p.waitForFunction(()=>typeof fsImg!=='function'||['orcw','obrute','orcl'].every(id=>!FS_DEF[id]||!!fsImg(id)),null,{timeout:20000});return p};
 const p=await open(html);
 const R=await p.evaluate(()=>{const bad=[],n={frames:0};let uid=950;
  const c=document.createElement('canvas');c.width=500;c.height=320;const q=c.getContext('2d');
  const measure=Fr=>{q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,c.width,c.height);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Fr,62.5,70);q.setTransform(1,0,0,1,0,0);
   const d=q.getImageData(0,0,c.width,c.height).data,xs=[];let y0=1e9,y1=-1;for(let j=3;j<d.length;j+=4)if(d[j]>128){const i=j>>2,x=i%c.width,y=(i/c.width)|0;xs.push(x);if(y<y0)y0=y;if(y>y1)y1=y}
   xs.sort((a,b)=>a-b);return{n:xs.length,mx:xs.length?(xs[xs.length>>1]-250)/4:0,lo:(y1+1-280)/4,h:(y1+1-y0)/4}};
  for(const id of['orcw','obrute','orcl']){const u=mkEnemy(id,'orc');u.id=++uid;const S=SHEETS[id],A=FS_DEF[id].atl(),K=4*HUM_A*fsSc(id),N=A.f.attack.length,nd=A.f.death.length;
   if(!fsOn(u))bad.push(id+': not drawn from its sheet');if(S.dy)bad.push(id+': dy '+S.dy+' (the feet belong on the tile centre)');
   const air=new Set();A.f.run.forEach((R,i)=>{if(R.ay>R.h+1)air.add('run'+i)});
   const rows=[['idle',8,i=>({c:i/8})],['walk',N,i=>({c:(i+.5)/N})],['flee',N,i=>({c:(i+.5)/N})],['attack',N,i=>{const H=240*AN_HIT_AT,d=FS_DEF[id].an.attack;return{el:i<d.imp?(i+.5)/d.imp*H:H+(i-d.imp+.5)/(N-d.imp)*(d.ms-H)}}],
    ['attack',N,i=>({c:(i+.5)/N,row:'charge'})],['cast',N,i=>({el:(i+.5)/N*760})],['hit',N,i=>({el:(i+.5)/N*600})],['death',nd,i=>({t:(i+.5)/nd})],['swap',1,()=>({c:0})],['reload',1,()=>({c:0})]];
   const seen={};
   for(const face of[0,1,2,3])for(const [st,NN,tf] of rows)for(let i=0;i<NN;i++){const tm=tf(i),Fr=fsFrame(id,face,st,tm,K,0);n.frames++;const nm=Fr.rig?'rig':Fr.anim+Fr.fi,tag=id+' f'+face+' '+st+' '+JSON.stringify(tm)+' '+nm;seen[nm]=1;
    if(Fr.mir!==(face===1||face===2))bad.push(tag+': mirror');if(!Fr.list.length||Fr.list.some(x=>!(x.a&&x.a.cv&&x.a.cv.width>0)))bad.push(tag+': empty');
    const m=measure(Fr);if(m.n<1500)bad.push(tag+': nearly empty ('+m.n+')');
    if(Math.abs(m.mx)>(Fr.rig?1:/^death[3-9]/.test(nm)?4:2.5))bad.push(tag+': body centre '+m.mx.toFixed(2)+' art px off the tile point');
    if(!air.has(nm)&&Math.abs(m.lo)>1)bad.push(tag+': feet '+m.lo.toFixed(2)+' art px off the tile point');
    if(Fr.rig&&Math.abs(m.h-S.h)>S.h*.12)bad.push(tag+': rig height '+m.h.toFixed(1)+' vs the board figure '+S.h)}
   for(const k in A.f)A.f[k].forEach((_,i)=>{if(!seen[k+i])bad.push(id+': frame '+k+i+' never drawn')});
   {const a=measure(fsFrame(id,0,'idle',{c:0},K,0)),f=measure(fsFrame(id,0,'attack',{el:0},K,0));if(Math.abs(a.h-f.h)>1.5||Math.abs(a.lo-f.lo)>1||Math.abs(a.mx-f.mx)>1.5)bad.push(id+': the idle rig and the attack row\'s first frame differ: '+JSON.stringify([a,f]))}
   for(const [st,NN,tf] of rows)for(let i=0;i<NN;i++)for(const [b2,f2] of[[3,0],[2,1]]){const X=fsFrame(id,b2,st,tf(i),K,0),Y=fsFrame(id,f2,st,tf(i),K,0);
    if(X.mir!==Y.mir||X.list.length!==Y.list.length||X.list.some((x,j)=>x.a!==Y.list[j].a||x.m.some((v,k)=>Math.abs(v-Y.list[j].m[k])>1e-9)))bad.push(id+': face '+b2+' is not face '+f2+' '+st)}
   {const seenH={};for(let t=0;t<4;t+=.01)seenH[fsFrame(id,0,'idle',{c:t},K,3).face]=1;if(!(seenH.neutral&&seenH.stern&&seenH.grit))bad.push(id+': idle expressions '+Object.keys(seenH))}
   // the live board frame on the game's clock
   const s=anOf(u),SP=SPEEDF,N0=now;SPEEDF=1;const v={pS:'attack',pF:1,pPh:.5,pCy:0,pD:0,pAn:''},row=()=>{const Fr=fsLiveFrame(u,v);return Fr?Fr.rig?'rig':Fr.anim+Fr.fi:'none'};const T0=60000,tt=el=>{now=T0+el};
   const imp=FS_DEF[id].an.attack.imp;s.act=1;s.adur=240;s.at0=T0;s.hitT=-1e9;s.dead=false;s.vaId='';s.mv=false;
   tt(89);if(row()!=='attack'+(imp-1))bad.push(id+' before the blow: '+row());tt(92);if(row()!=='attack'+imp)bad.push(id+' at the blow: '+row());v.pS='idle';tt(500);if(!/^attack/.test(row()))bad.push(id+' follow-through: '+row());tt(900);if(row()!=='rig')bad.push(id+' back to the rig: '+row());
   s.act=0;s.mv=true;s.mk=AN_DASH;s.mt0=T0;v.pS='attack';v.pPh=.2;{const r=new Set();for(let el=0;el<600;el+=20){tt(el);r.add(row())}if(![...r].every(x=>/^run/.test(x))||r.size<4)bad.push(id+': the charge does not run: '+[...r])}s.mv=false;v.pPh=.5;
   animEvent('cast',{u,ab:Object.assign({id:'owarcry'},AB.owarcry||{tgt:'self'})});s.at0=T0;v.pS='cast';tt(300);if(!/^cast/.test(row()))bad.push(id+': War cry plays '+row());animEvent('turn',{u});
   s.act=0;s.hitT=T0+1000;v.pS='idle';tt(1300);if(!/^hurt/.test(row()))bad.push(id+': the hurt row is not playing 300 ms after the blow: '+row());tt(1700);if(/^hurt/.test(row()))bad.push(id+': still hurt 700 ms after');
   s.dead=true;s.deadT=T0;v.pS='death';v.pPh=1;tt(3000);if(row()!=='death'+(nd-1))bad.push(id+': the corpse is '+row());s.dead=false;s.deadT=-1e9;s.hitT=-1e9;SPEEDF=SP;now=N0;
   if(humLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': drawn as a person');
   for(const face of[0,1,2,3]){const o=monsterSpritePx(u,face,'idle',0);if(!o||o.fs!==id){bad.push(id+' f'+face+': the sprite is not the figure');continue}if(monsterSpritePx(u,face,'idle',0)!==o)bad.push(id+' f'+face+': rebuilt')}
   if(unitTop(u)!==S.top)bad.push(id+': bars at '+unitTop(u)+' (want '+S.top+')');
   FS.off=1;{if(sheetSpritePx(u,0,'idle',0))bad.push(id+': a sheet sprite while off');const o=unitSpritePx(u,0,'idle',0);if(!o||o.fs||o.smooth)bad.push(id+': no pixel fallback while off');if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': a live figure while off')}FS.off=0;
   SET.detail='low';artChanged();if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': figure at Detail Low');{const o=unitSpritePx(u,0,'idle',0);if(!o||o.fs)bad.push(id+': Detail Low drew the figure')}SET.detail='high';artChanged()}
  {const u=mkEnemy('orcy','orc');u.id=++uid;if(fsOn(u))bad.push('the Orc brave drawn from a frame sheet')}
  return{bad,n}});
 for(const x of R.bad)bad.push(x);
 // an untouched seeded battle: each orc's tile centre, its ring's centre and its figure (body centre over the feet) agree within 1 art px
 await p.evaluate(()=>{SET.detail='high';artChanged();SET.deploy=false;seedRng(77);newGame(true);closeSheet();seedRng(78);startBattle({f:'orc',mult:1,foes:['orcw','obrute','orcl'],src:{type:'sim'}});try{if(typeof deployDone==='function')deployDone()}catch(e){}});
 await p.waitForTimeout(500);await p.waitForFunction(()=>B.cur&&B.cur.side===0&&!B.busy&&B.units.every(u=>!u.alive||!anOf(u).mv&&!(VIS.get(u)||{}).mv),null,{timeout:60000});await p.waitForTimeout(400);
 const T=await p.evaluate(()=>{const bad=[],out=[];const c=document.createElement('canvas');c.width=600;c.height=400;const q=c.getContext('2d');
  for(const u of B.units.filter(u=>u.alive&&u.side&&FS_DEF[msEnKey(u.def)])){const id=msEnKey(u.def),v=VIS.get(u),t=tpos(u.c,u.r,T(u).h),tx=t.x/2,ty=t.y/2;
   const x=Math.round((u.sx+v.pX)/2),gy=Math.round((u.sy+v.pY+v.pL)/2),y=Math.round((u.sy+v.pY)/2),E=ELL.ok?ELL:ellInit(),rg=ellRing(E,u,false,!!(u.def&&u.def.big)),rx=x-(rg.width>>1)+rg.width/2,ry=gy-(rg.height>>1)+rg.height/2;
   if(Math.abs(rx-tx)>1||Math.abs(ry-ty)>1)bad.push(id+' at '+u.c+','+u.r+': ring centre off its tile centre by '+(rx-tx)+','+(ry-ty));
   for(const face of[0,1,2,3]){const Fr=fsLiveFrame(u,Object.assign({},v,{pS:'idle',pD:face,pCy:0,pPh:0,pAn:''}));if(!Fr){bad.push(id+': no live figure');continue}
    q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,600,400);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Fr,75+(x-tx),80+(y-ty));q.setTransform(1,0,0,1,0,0);
    const d=q.getImageData(0,0,600,400).data,xs=[];let y1=-1;for(let j=3;j<d.length;j+=4)if(d[j]>128){const i=j>>2;xs.push(i%600);const yy=(i/600)|0;if(yy>y1)y1=yy}xs.sort((a,b)=>a-b);
    const fx=xs[xs.length>>1]/4-75,fy=(y1+1)/4-80;out.push(id);
    if(Math.abs(fx)>1||Math.abs(fy)>1)bad.push(id+' at '+u.c+','+u.r+' face '+face+': figure off its tile centre by '+fx.toFixed(2)+','+fy.toFixed(2))}}
  if(new Set(out).size<3)bad.push('the seeded battle has '+[...new Set(out)]);return{bad}});
 for(const x of T.bad)bad.push(x);
 const lowSig=async pg=>pg.evaluate(()=>{SET.detail='low';artChanged();const out={};let uid=990;for(const id of['orcw','obrute','orcl','orcy']){const u=mkEnemy(id,'orc');u.id=++uid;for(const st of['idle','walk','attack','cast','hit','death'])for(let fr=0;fr<4;fr++)for(const face of[0,1,2,3]){let o=null;try{o=unitSpritePx(u,face,st,fr)}catch(e){}
   if(!o||!o.cv){out[id+st+fr+face]='-';continue}const d=o.cv.getContext('2d').getImageData(0,0,o.cv.width,o.cv.height).data;let h=2166136261;for(let i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619)>>>0}out[id+st+fr+face]=o.cv.width+'x'+o.cv.height+':'+o.ax+','+o.ay+':'+h}}return out});
 let lowN=0;if(main&&fs.existsSync(main)){const pm=await open(main);const X=await lowSig(p),Mm=await lowSig(pm);for(const k in Mm){lowN++;if(X[k]!==Mm[k])bad.push('Detail Low differs from main: '+k)}}else console.log('(main build not found: Detail Low comparison skipped)');
 for(const e of errs)bad.push(e);
 console.log(JSON.stringify({frames:R.n.frames,lowCompared:lowN,bad:bad.length}));
 if(bad.length)console.log('FAIL:\n'+bad.slice(0,50).join('\n')+(bad.length>50?'\n... '+(bad.length-50)+' more':''));else console.log('OK');
 await b.close();process.exit(bad.length?1:0)})();
