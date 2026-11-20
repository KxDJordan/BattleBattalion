// The skeleton soldiers test:  node test/skeleton.js [html] [main html]
// The Skeleton legionary ('skel') and Skeleton halberdier ('skelhal') at Detail High play the user's drawn frames (src/76g-frames.js, atlas
// src/76l-skelatlas.js from assets/make-skel-atlas.py) and the orcs' parts rig for the idle (src/76m-skelsol.js), dressed with their own
// weapon and shield in the sheet's colour-keyed hands. Node part: the rows (seven each); every frame's weapon and shield fist found (the
// weapon hand of walk 5, hidden behind the body, placed between its neighbours'); exactly attack 4 and cast 2 fixed (both fists red); the
// frame player's timing (the reach frame at AN_HIT_AT, loops, death held); anchors; no randomness. Browser part: no red or blue key colour
// left on any fist in the atlas (the skirt stays red); every state x facing x sampled frame draws a non-empty figure centred on the tile
// point with its feet on it; the legionary carries a one-handed weapon in the weapon fist (its grip on the fist) and a shield on the
// shield fist, the halberdier a two-handed halberd through both fists and no shield; a broken shield is gone; the idle rig meets the
// walk row's first frame; back facings are the front frames; every frame is played; the live clock (the reach frame at the blow, hurt,
// corpse); bars where they were; the zombie keeps its art; an untouched seeded battle: tile, ring and figure agree within 1 art px;
// Detail Low draws the same pixels as main.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),os=require('os');
const ROOT=path.join(__dirname,'..'),F=f=>path.join(ROOT,f);
const bad=[];const ok=(c,m)=>{if(!c)bad.push(m)};
const ctx={console,Math,JSON,performance:{now:()=>0},Map,WeakMap,Set,Array,Object,Number,String};vm.createContext(ctx);
const src=f=>fs.readFileSync(F('src/'+f),'utf8');
vm.runInContext(src('73k-humans.js').match(/const HUM_A=[^;]+;/)[0]+'\nconst AN_HIT_AT=.38;',ctx);
vm.runInContext(src('73m-skel.js')+'\n'+src('76g-frames.js')+'\n'+src('76j-orcatlas.js')+'\n'+src('76k-orc.js')+'\n'+src('76l-skelatlas.js')+'\nconst usWdef=()=>({}),usCloth=()=>null;\n'+src('76m-skelsol.js')+'\n;this.__g={fsIdx,fsHitMs,FS_DEF,SKA};',ctx);
const {fsIdx,fsHitMs,FS_DEF,SKA}=ctx.__g,M=240*.38;
for(const k of['run','attack','cast','hurt','death'])ok(SKA.f[k]&&SKA.f[k].length===7,'row '+k+' has '+(SKA.f[k]||[]).length);
{const fixed=[],hid=[];for(const k in SKA.hands)SKA.hands[k].forEach((h,i)=>{if(!h.w||!h.s)bad.push(k+(i+1)+': a fist missing');if(h.fix)fixed.push(k+(i+1));if(h.hid)hid.push(k+(i+1)+':'+h.hid);
  ok(isFinite(h.wa1)&&(h.wa2==null||isFinite(h.wa2)),k+(i+1)+': weapon angles');for(const q of[h.w,h.s])if(q)ok(Math.abs(q[0])<120&&q[1]<10&&q[1]>-160,k+(i+1)+': a fist far off the figure '+q)});
 ok(fixed.join()==='attack4,cast2','fixed frames '+fixed);ok(hid.join()==='run5:w','hidden fists '+hid);
 ok(!!(SKA.rh&&SKA.rh.w&&SKA.rh.s),'the rig\'s fists');
 // the weapon hand leads the strike: at the reach frame it is the foremost and highest fist
 const h=SKA.hands.attack[3];ok(h.w[0]>h.s[0]+20&&h.w[1]<h.s[1],'the weapon fist does not lead the strike: '+JSON.stringify(h))}
for(const id of['skel','skelhal']){const an=FS_DEF[id].an,d=an.attack,N=7;
 ok(Math.abs(fsHitMs(d)-M)<.01&&fsIdx(N,d,0,M-.5,0)===d.imp-1&&fsIdx(N,d,0,M,0)===d.imp&&d.imp===3&&fsIdx(N,d,0,0,0)===0&&fsIdx(N,d,0,d.ms-1,0)===N-1,id+': attack timing');
 for(let i=0;i<N;i++)ok(fsIdx(N,an.walk,(i+.5)/N,0,0)===i,id+': run frame '+i);ok(fsIdx(N,an.death,0,0,1)===N-1,id+': death held');ok(typeof FS_DEF[id].dress==='function',id+': not dressed')}
for(const k in SKA.f)SKA.f[k].forEach((R,i)=>{ok(R.ax>R.w*.15&&R.ax<R.w*.85,k+i+': anchor x');ok(R.ay>=R.h-3&&R.ay<R.h+60,k+i+': anchor y')});
ok(!/Math\.random|\brnd\(/.test(src('76m-skelsol.js').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')),'76m-skelsol.js uses randomness');
/* ---------- browser ---------- */
const {chromium}=require('playwright');
(async()=>{const html=path.resolve(process.argv[2]||'dist/index.html');let main=process.argv[3];
 if(!main){main=path.join(os.tmpdir(),'skeleton-main.html');try{fs.writeFileSync(main,cp.execSync('git show HEAD:index.html',{cwd:ROOT,maxBuffer:1<<30}))}catch(e){main=''}}
 const b=await chromium.launch(),errs=[];
 const open=async f=>{const p=await b.newPage({viewport:{width:667,height:375}});p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
  await p.goto('file://'+f);await p.waitForTimeout(300);await p.evaluate(()=>{newGame();closeSheet();if(typeof fsImg==='function')for(const id of['skel','skelhal'])if(FS_DEF[id])fsImg(id)});
  await p.waitForFunction(()=>typeof fsImg!=='function'||['skel','skelhal'].every(id=>!FS_DEF[id]||!!fsImg(id)),null,{timeout:20000});return p};
 const p=await open(html);
 const R=await p.evaluate(()=>{const bad=[],n={frames:0};let uid=950;
  const c=document.createElement('canvas');c.width=500;c.height=320;const q=c.getContext('2d');
  const measure=Fr0=>{const Fr=Object.assign({},Fr0,{list:Fr0.list.filter(x=>x.tag!=='weapon'&&x.tag!=='shield')});q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,c.width,c.height);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Fr,62.5,70);q.setTransform(1,0,0,1,0,0);
   const d=q.getImageData(0,0,c.width,c.height).data,xs=[];let y0=1e9,y1=-1;for(let j=3;j<d.length;j+=4)if(d[j]>128){const i=j>>2,x=i%c.width,y=(i/c.width)|0;xs.push(x);if(y<y0)y0=y;if(y>y1)y1=y}
   xs.sort((a,b)=>a-b);return{n:xs.length,mx:xs.length?(xs[xs.length>>1]-250)/4:0,lo:(y1+1-280)/4,h:(y1+1-y0)/4}};
  for(const id of['skel','skelhal']){const u=mkEnemy(id,'undead');u.id=++uid;const S=SHEETS[id],A=FS_DEF[id].atl(),K=4*HUM_A*fsSc(id),N=A.f.attack.length,nd=A.f.death.length;
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
    if(false)bad.push(tag+': rig height '+m.h.toFixed(1)+' vs the board figure '+S.h)}
   for(const k in A.f)A.f[k].forEach((_,i)=>{if(!seen[k+i])bad.push(id+': frame '+k+i+' never drawn')});
   {const bare=Fr=>Object.assign({},Fr,{list:Fr.list.filter(x=>x.tag!=='weapon'&&x.tag!=='shield')});const a=measure(bare(fsFrame(id,0,'idle',{c:0},K,0,u))),f=measure(bare(fsFrame(id,0,'walk',{c:.01},K,0,u)));if(Math.abs(a.h-f.h)>1.5||Math.abs(a.lo-f.lo)>1||Math.abs(a.mx-f.mx)>1.5)bad.push(id+': the idle rig and the walk row\'s first frame differ: '+JSON.stringify([a,f]))}
   // the gear: on its fists, following them; the legionary one-handed with a shield, the halberdier two-handed without
   {const two=id==='skelhal',A2=SKA,inv=x=>x;for(const [row,anim] of[['run','walk'],['attack','attack'],['cast','cast'],['hurt','hit'],['death','death']])for(let i=0;i<7;i++){const n=A2.f[row].length,tm=anim==='walk'?{c:(i+.5)/n}:anim==='death'?{t:(i+.5)/n}:{el:(i+.5)/n*(anim==='attack'?560:anim==='cast'?760:600)};const Fr=fsFrame(id,0,anim,tm,K,0,u);if(Fr.anim!==row)continue;
     const H=A2.hands[row][Fr.fi],W=Fr.list.find(x=>x.tag==='weapon'),Sh=Fr.list.find(x=>x.tag==='shield');
     if(!W){bad.push(id+' '+row+Fr.fi+': no weapon');continue}if(Fr.list.indexOf(W)>Fr.list.findIndex(x=>x.tag==='frame'))bad.push(id+' '+row+Fr.fi+': the weapon over the figure');
     if(two){if(Sh)bad.push(id+': a shield on the halberdier');const a=Math.atan2(W.m[1],W.m[0]);if(H.wa2!=null){const ex=H.wa2*Math.PI/180;if(Math.abs(Math.atan2(Math.sin(a-ex),Math.cos(a-ex)))>.01)bad.push(id+' '+row+Fr.fi+': the halberd off the fists\' line');
       // both fists on the haft's line
       for(const q of[H.w,H.s]){const dx=q[0]-W.m[4],dy=q[1]-W.m[5],perp=Math.abs(-Math.sin(a)*dx+Math.cos(a)*dy);if(perp>1)bad.push(id+' '+row+Fr.fi+': a fist '+perp.toFixed(1)+' WU off the haft')}}}
     else{if(Math.hypot(W.m[4]-H.w[0],W.m[5]-H.w[1])>.01)bad.push(id+' '+row+Fr.fi+': the weapon grip off the weapon fist');if(!Sh)bad.push(id+' '+row+Fr.fi+': no shield');else if(Math.hypot(Sh.m[4]-H.s[0],Sh.m[5]-H.s[1])>.01)bad.push(id+' '+row+Fr.fi+': the shield off the shield fist');
       if(Fr.list.indexOf(Sh)<Fr.list.findIndex(x=>x.tag==='frame'))bad.push(id+' '+row+Fr.fi+': the shield under the figure')}}
    const G=skGear(id,u);if(two!==G.two)bad.push(id+': two-handed '+G.two);if(!two&&!G.sh)bad.push(id+': no shield in its gear')}
   for(const [st,NN,tf] of rows)for(let i=0;i<NN;i++)for(const [b2,f2] of[[3,0],[2,1]]){const X=fsFrame(id,b2,st,tf(i),K,0),Y=fsFrame(id,f2,st,tf(i),K,0);
    if(X.mir!==Y.mir||X.list.length!==Y.list.length||X.list.some((x,j)=>x.a!==Y.list[j].a||x.m.some((v,k)=>Math.abs(v-Y.list[j].m[k])>1e-9)))bad.push(id+': face '+b2+' is not face '+f2+' '+st)}
   {const seenH={};for(let t=0;t<4;t+=.01)seenH[fsFrame(id,0,'idle',{c:t},K,3).face]=1;if(!(seenH.neutral&&seenH.glare&&seenH.smug))bad.push(id+': idle expressions '+Object.keys(seenH))}
   // the live board frame on the game's clock
   const s=anOf(u),SP=SPEEDF,N0=now;SPEEDF=1;const v={pS:'attack',pF:1,pPh:.5,pCy:0,pD:0,pAn:''},row=()=>{const Fr=fsLiveFrame(u,v);return Fr?Fr.rig?'rig':Fr.anim+Fr.fi:'none'};const T0=60000,tt=el=>{now=T0+el};
   const imp=FS_DEF[id].an.attack.imp;s.act=1;s.adur=240;s.at0=T0;s.hitT=-1e9;s.dead=false;s.vaId='';s.mv=false;
   tt(89);if(row()!=='attack'+(imp-1))bad.push(id+' before the blow: '+row());tt(92);if(row()!=='attack'+imp)bad.push(id+' at the blow: '+row());v.pS='idle';tt(500);if(!/^attack/.test(row()))bad.push(id+' follow-through: '+row());tt(900);if(row()!=='rig')bad.push(id+' back to the rig: '+row());
   s.act=0;s.mv=true;s.mk=AN_DASH;s.mt0=T0;v.pS='attack';v.pPh=.2;{const r=new Set();for(let el=0;el<600;el+=20){tt(el);r.add(row())}if(![...r].every(x=>/^run/.test(x))||r.size<4)bad.push(id+': the charge does not run: '+[...r])}s.mv=false;v.pPh=.5;
   s.act=2;s.adur=380;s.at0=T0;v.pS='cast';tt(300);if(!/^cast/.test(row()))bad.push(id+': a cast plays '+row());
   s.act=0;s.hitT=T0+1000;v.pS='idle';tt(1300);if(!/^hurt/.test(row()))bad.push(id+': the hurt row is not playing 300 ms after the blow: '+row());tt(1700);if(/^hurt/.test(row()))bad.push(id+': still hurt 700 ms after');
   s.dead=true;s.deadT=T0;v.pS='death';v.pPh=1;tt(3000);if(row()!=='death'+(nd-1))bad.push(id+': the corpse is '+row());s.dead=false;s.deadT=-1e9;s.hitT=-1e9;SPEEDF=SP;now=N0;
   if(humLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': drawn as a person');
   for(const face of[0,1,2,3]){const o=monsterSpritePx(u,face,'idle',0);if(!o||o.fs!==id){bad.push(id+' f'+face+': the sprite is not the figure');continue}if(monsterSpritePx(u,face,'idle',0)!==o)bad.push(id+' f'+face+': rebuilt')}
   if(unitTop(u)!==S.top)bad.push(id+': bars at '+unitTop(u)+' (want '+S.top+')');
   FS.off=1;{if(sheetSpritePx(u,0,'idle',0))bad.push(id+': a sheet sprite while off');const o=unitSpritePx(u,0,'idle',0);if(!o||o.fs||o.smooth)bad.push(id+': no pixel fallback while off');if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': a live figure while off')}FS.off=0;
   SET.detail='low';artChanged();if(fsLiveFrame(u,{pS:'idle',pD:0}))bad.push(id+': figure at Detail Low');{const o=unitSpritePx(u,0,'idle',0);if(!o||o.fs)bad.push(id+': Detail Low drew the figure')}SET.detail='high';artChanged()}
  {const z=mkEnemy('zomb','undead');z.id=++uid;if(fsOn(z))bad.push('the zombie drawn from a frame sheet')}
  // a broken shield is gone (the pixel figure drops it too)
  {const u=mkEnemy('skel','undead');u.id=++uid;u.shp=0;u.shpMax=u.shpMax||40;const L=usLook(u);const K=4*HUM_A*fsSc('skel'),Fr=fsFrame('skel',0,'idle',{c:0},K,0,u);if(!L.S.shield&&Fr.list.some(x=>x.tag==='shield'))bad.push('a broken shield still drawn')}
  // no red or blue key colour left on the fists: every frame's fist areas in the atlas
  {const I=fsImg('skel'),A=SKA,c=document.createElement('canvas');c.width=I.naturalWidth;c.height=I.naturalHeight;const q=c.getContext('2d');q.drawImage(I,0,0);const d=q.getImageData(0,0,c.width,c.height).data;let nb=0,nr=0;
   for(const k in A.hands)A.hands[k].forEach((h,i)=>{const R=A.f[k][i];for(const [key,p] of[['w',h.w],['s',h.s]]){if(!p||(h.hid||'').includes(key))continue;const cx=(R.ax+p[0])*A.k+R.r[0],cy=(R.ay+p[1])*A.k+R.r[1];
     for(let y=Math.floor(cy-7);y<=cy+7;y++)for(let x=Math.floor(cx-7);x<=cx+7;x++){if(x<R.r[0]||y<R.r[1]||x>=R.r[0]+R.r[2]||y>=R.r[1]+R.r[3])continue;const j=(y*c.width+x)*4,r=d[j],g=d[j+1],b=d[j+2];if(d[j+3]<128)continue;
      if(b>90&&b-r>45&&b-g>25)nb++;if((x-cx)**2+(y-cy)**2<12&&r>130&&r-g>55&&r-b>60)nr++}}});
   for(let j=0;j<d.length;j+=4)if(d[j+3]>128&&d[j+2]>90&&d[j+2]-d[j]>45&&d[j+2]-d[j+1]>25)nb++;
   if(nb)bad.push(nb+' blue key pixels left');if(nr)bad.push(nr+' red key pixels left on the fists')}
  return{bad,n}});
 for(const x of R.bad)bad.push(x);
 // an untouched seeded battle: each skeleton's tile centre, its ring's centre and its figure (body centre over the feet) agree within 1 art px
 await p.evaluate(()=>{SET.detail='high';artChanged();SET.deploy=false;seedRng(77);newGame(true);closeSheet();seedRng(78);startBattle({f:'undead',mult:1,foes:['skel','skelhal','skel'],src:{type:'sim'}});try{if(typeof deployDone==='function')deployDone()}catch(e){}});
 await p.waitForTimeout(500);await p.waitForFunction(()=>B.cur&&B.cur.side===0&&!B.busy&&B.units.every(u=>!u.alive||!anOf(u).mv&&!(VIS.get(u)||{}).mv),null,{timeout:60000});await p.waitForTimeout(400);
 const T=await p.evaluate(()=>{const bad=[],out=[];const c=document.createElement('canvas');c.width=600;c.height=400;const q=c.getContext('2d');
  for(const u of B.units.filter(u=>u.alive&&u.side&&FS_DEF[msEnKey(u.def)])){const id=msEnKey(u.def),v=VIS.get(u),t=tpos(u.c,u.r,T(u).h),tx=t.x/2,ty=t.y/2;
   const x=Math.round((u.sx+v.pX)/2),gy=Math.round((u.sy+v.pY+v.pL)/2),y=Math.round((u.sy+v.pY)/2),E=ELL.ok?ELL:ellInit(),rg=ellRing(E,u,false,!!(u.def&&u.def.big)),rx=x-(rg.width>>1)+rg.width/2,ry=gy-(rg.height>>1)+rg.height/2;
   if(Math.abs(rx-tx)>1||Math.abs(ry-ty)>1)bad.push(id+' at '+u.c+','+u.r+': ring centre off its tile centre by '+(rx-tx)+','+(ry-ty));
   for(const face of[0,1,2,3]){const Fr=fsLiveFrame(u,Object.assign({},v,{pS:'idle',pD:face,pCy:0,pPh:0,pAn:''}));if(!Fr){bad.push(id+': no live figure');continue}
    Fr.list=Fr.list.filter(x=>x.tag!=='weapon'&&x.tag!=='shield');q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,600,400);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Fr,75+(x-tx),80+(y-ty));q.setTransform(1,0,0,1,0,0);
    const d=q.getImageData(0,0,600,400).data,xs=[];let y1=-1;for(let j=3;j<d.length;j+=4)if(d[j]>128){const i=j>>2;xs.push(i%600);const yy=(i/600)|0;if(yy>y1)y1=yy}xs.sort((a,b)=>a-b);
    const fx=xs[xs.length>>1]/4-75,fy=(y1+1)/4-80;out.push(id);
    if(Math.abs(fx)>1||Math.abs(fy)>1)bad.push(id+' at '+u.c+','+u.r+' face '+face+': figure off its tile centre by '+fx.toFixed(2)+','+fy.toFixed(2))}}
  if(new Set(out).size<2)bad.push('the seeded battle has '+[...new Set(out)]);return{bad}});
 for(const x of T.bad)bad.push(x);
 const lowSig=async pg=>pg.evaluate(()=>{SET.detail='low';artChanged();const out={};let uid=990;for(const id of['skel','skelhal','zomb','necro']){const u=mkEnemy(id,'undead');u.id=++uid;for(const st of['idle','walk','attack','cast','hit','death'])for(let fr=0;fr<4;fr++)for(const face of[0,1,2,3]){let o=null;try{o=unitSpritePx(u,face,st,fr)}catch(e){}
   if(!o||!o.cv){out[id+st+fr+face]='-';continue}const d=o.cv.getContext('2d').getImageData(0,0,o.cv.width,o.cv.height).data;let h=2166136261;for(let i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619)>>>0}out[id+st+fr+face]=o.cv.width+'x'+o.cv.height+':'+o.ax+','+o.ay+':'+h}}return out});
 let lowN=0;if(main&&fs.existsSync(main)){const pm=await open(main);const X=await lowSig(p),Mm=await lowSig(pm);for(const k in Mm){lowN++;if(X[k]!==Mm[k])bad.push('Detail Low differs from main: '+k)}}else console.log('(main build not found: Detail Low comparison skipped)');
 for(const e of errs)bad.push(e);
 console.log(JSON.stringify({frames:R.n.frames,lowCompared:lowN,bad:bad.length}));
 if(bad.length)console.log('FAIL:\n'+bad.slice(0,50).join('\n')+(bad.length>50?'\n... '+(bad.length-50)+' more':''));else console.log('OK');
 await b.close();process.exit(bad.length?1:0)})();
