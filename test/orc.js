// The orcs test:  node test/orc.js [html] [main html]
// The Orc warrior ('orcw'), Orc crusher ('obrute'), Orc warlord ('orcl') and Orc brave ('orcy') at Detail High play the user's drawn frames
// (src/76g-frames.js; atlases src/76j-orcatlas.js from assets/make-orc-atlas.py, src/76n-keyatlas.js from assets/make-keyed-atlas.py) and
// are paper cut-out rigs from the sheets' parts for the idle (src/76k-orc.js). Node part: the rows (the warrior seven a row; the crusher
// eight, seven dead; the warlord seven, six dead; the brave a run of eight, seven, six dead); the frame player's timing (loops by the cycle,
// the blow's frame at AN_HIT_AT, death holding its last frame); the anchors; every rig piece in the atlas with a pivot; the heads; no
// randomness; the warlord's and brave's colour-keyed hands: both found or placed in every frame, exactly the repaired frames marked (the
// warlord's attack 3 and 4, the brave's attack 4 and cast 2), the weapon hand leading the blow; their faces by mood, all in the atlas.
// Browser part: every state x facing x sampled frame draws a non-empty figure whose body centre is over the tile point (idle within 1 art px;
// drawn frames within 2: a raised weapon or a glow pulls the median) and whose feet are on the tile point (1 art px; airborne run frames
// above it); the idle rig is as tall as the board figure and meets the attack row's first frame (height, feet, centre within 1.5 art px);
// the back facings are the front frames; faces 1 and 2 mirrored; every frame is played; the live board frame: the blow's frame at AN_HIT_AT
// and the follow-through after the game's attack, a charge's dash on the run row, War cry on the cast row, the hurt row past the game's
// short flinch, the corpse; the warrior's and crusher's idle expressions; the warlord's and brave's faces follow the mood (wounded, dying,
// after an ability); the warlord's lordaxe through both fists and the brave's hand axe in the weapon fist in every drawn frame and the
// rig, under the figure; no red or blue key colour left on their hands (the warlord's red cape stays); the baked sprite is the figure; the
// pixel orc while it is off; the bars stay where they were; the brave reads smaller than the warrior; in an untouched seeded battle each
// orc's tile centre, ring centre and figure agree within 1 art px; Detail Low draws the same pixels as main for all four orcs.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),os=require('os');
const ROOT=path.join(__dirname,'..'),F=f=>path.join(ROOT,f);
const bad=[];const ok=(c,m)=>{if(!c)bad.push(m)};
const ctx={console,Math,JSON,performance:{now:()=>0},Map,WeakMap,Set,Array,Object,Number,String};vm.createContext(ctx);
const src=f=>fs.readFileSync(F('src/'+f),'utf8');
vm.runInContext(src('73k-humans.js').match(/const HUM_A=[^;]+;/)[0]+'\nconst AN_HIT_AT=.38;',ctx);
vm.runInContext(src('73m-skel.js')+'\n'+src('76g-frames.js')+'\n'+src('76j-orcatlas.js')+'\n'+src('76k-orc.js')+'\n'+src('76n-keyatlas.js')+'\nconst usWdef=()=>({}),usCloth=()=>null;\n'+src('76m-skelsol.js')+'\n'+src('76mo-orcweap.js')+'\n;this.__g={fsIdx,fsHitMs,FS_DEF,ORA,OCA,OLA,OYA,OR_HEADS,OR_FACES,orMood,OR_ANG,OR_HIP,orAng};',ctx);
const {fsIdx,fsHitMs,FS_DEF,ORA,OCA,OLA,OYA,OR_HEADS,OR_FACES,orMood,OR_ANG,OR_HIP,orAng}=ctx.__g,M=240*.38;
const ID4=['orcw','obrute','orcl','orcy'];
// per orc: the atlas, frames a row (run, attack, cast, hurt, death), the blow's frame, and for the colour-keyed sheets the repaired frames and the placed hands
const ORCS={orcw:[ORA,[7,7,7,7,7],5],obrute:[OCA,[8,8,8,8,7],5],orcl:[OLA,[7,7,7,7,6],3,'attack3,attack4','death6:s'],
 orcy:[OYA,[8,7,7,7,6],3,'attack4,cast2','run3:w,run4:w,run5:w,run6:w,run7:w,run8:w,attack4:s']};
const ROWS=['run','attack','cast','hurt','death'];
for(const id in ORCS){const [A,NS,imp,fixed,hid]=ORCS[id],an=FS_DEF[id].an,n=NS[1],nd=NS[4],nr=NS[0];
 ROWS.forEach((k,j)=>ok(A.f[k]&&A.f[k].length===NS[j],id+': row '+k+' has '+(A.f[k]||[]).length));ok(an.attack.imp===imp,id+': the blow frame '+an.attack.imp);
 ok(Math.abs(fsHitMs(an.attack)-M)<.01,id+': the blow time');
 const N=A.f.attack.length,d=an.attack;ok(fsIdx(N,d,0,M-.5,0)===d.imp-1&&fsIdx(N,d,0,M,0)===d.imp&&fsIdx(N,d,0,0,0)===0&&fsIdx(N,d,0,d.ms-1,0)===N-1,id+': attack timing');
 for(let i=0;i<nr;i++)ok(fsIdx(nr,an.walk,(i+.5)/nr,0,0)===i,id+': run frame '+i+' at its share of the cycle');
 ok(fsIdx(nd,an.death,0,0,1)===nd-1&&fsIdx(nd,an.death,0,0,0)===0,id+': death holds its last frame');ok(fsIdx(n,an.hit,0,an.hit.ms-1,0)===n-1,id+': the hurt row ends on its last frame');
 ok(an.charge.f==='run'&&an.cast.f==='cast',id+': charge on the run row, cast on the cast row');
 for(const k in A.f)A.f[k].forEach((R,i)=>{ok(R.ax>R.w*.15&&R.ax<R.w*.85,id+' '+k+i+': anchor x '+R.ax+' of '+R.w);ok(R.ay>=R.h-3&&R.ay<R.h+60,id+' '+k+i+': anchor y '+R.ay+' vs '+R.h)});
 for(const s of A.set){ok(!!A.p[s[1]]&&A.p[s[1]].pv.length===2,id+': setup piece '+s[1]+' not in the atlas')}
 // the weapon's swing (76mo-orcweap.js OR_ANG): every drawn frame has an angle; the attack raises the weapon back (the angle falling) to its
 // wind-up's peak, then sweeps it forward (rising) to the blow; never within 15 deg of the horizontal but on the blow; run, hurt and the
 // idle carry it head up, 30 to 60 deg off the vertical
 {const T=OR_ANG[id],L=T.attack,horiz=a=>{const x=((a%180)+180)%180;return Math.min(x,180-x)<15};
  for(const k of['run','attack','hurt','death'])ok(Array.isArray(T[k])&&T[k].length===A.f[k].length,id+': '+k+' angles for every frame');
  let pk=0;for(let i=1;i<imp;i++)if(L[i]<L[pk])pk=i;
  for(let i=1;i<=pk;i++)ok(L[i]<L[i-1],id+': the wind-up does not raise the weapon back at attack'+(i+1)+': '+L);
  for(let i=pk+1;i<=imp;i++)ok(L[i]>L[i-1],id+': the swing does not sweep forward at attack'+(i+1)+': '+L);
  ok(pk>0&&pk<imp&&L[pk]<=-100,id+': no drawn-back wind-up before the blow: '+L);
  L.forEach((a,i)=>{if(i!==imp)ok(!horiz(a),id+' attack'+(i+1)+': the weapon lies flat ('+a+' deg)')});
  for(const k of['run','hurt'])T[k].forEach((a,i)=>ok(a>=-60.5&&a<=-29.5,id+' '+k+(i+1)+': carried at '+a+' deg (head up, 30-60 off the vertical)'));
  ok(T.idle>=-60.5&&T.idle<=-29.5,id+': the idle carries it at '+T.idle);ok(OR_HIP[id]&&OR_HIP[id][1]<-.3&&OR_HIP[id][1]>-.5,id+': no belt')}
 if(A.grip){// the warrior's and crusher's hands, found on the erased haft (or the far fist where none was painted), every frame, with their fists as pieces
  const two=id==='obrute';let nh=0;
  for(const k of ROWS)A.f[k].forEach((R,i)=>{const h=A.grip[k]&&A.grip[k][i],tg=id+' '+k+(i+1);if(!h||!h.w){bad.push(tg+': no weapon hand');return}
   for(const q of[h.w,h.s])if(q)ok(Math.abs(q[0])<A.H&&q[1]<10&&q[1]>-A.H*1.2,tg+': a hand far off the figure '+q);
   if(h.by==='haft')nh++;ok(!!(h.fw&&A.p[h.fw]&&A.p[h.fw].pv),tg+': the weapon fist is not a piece');if(h.s)ok(!!(h.fs&&A.p[h.fs]),tg+': the off fist is not a piece');
   if(h.by==='haft')ok(!!h.hd&&Math.hypot(h.hd[0]-h.w[0],h.hd[1]-h.w[1])>8,tg+': the painted head not recorded')});
  ok(nh===(two?34:14),id+': hands found on the haft in '+nh+' frames');ok(!!(A.rg&&A.rg.w&&(A.rg.s||!two)&&A.set.some(s=>s[0]===A.rg.slot)),id+': the rig\'s hands');
  {const h=A.grip.attack[imp];ok(h.w[0]>0,id+': the weapon hand is not forward at the blow')}}
 if(!fixed){ok(OR_HEADS.every(h=>!!A.p[h]),id+': the eight heads');continue}
 // the colour-keyed hands
 const fx=[],hd=[];for(const k in A.hands)A.hands[k].forEach((h,i)=>{if(!h.w||!h.s)bad.push(id+' '+k+(i+1)+': a hand missing');if(h.fix)fx.push(k+(i+1));if(h.hid)for(const c of h.hid)hd.push(k+(i+1)+':'+c);
  ok(isFinite(h.wa1)&&(h.wa2==null||isFinite(h.wa2)),id+' '+k+(i+1)+': weapon angles');for(const q of[h.w,h.s])if(q)ok(Math.abs(q[0])<A.H&&q[1]<10&&q[1]>-A.H,id+' '+k+(i+1)+': a hand far off the figure '+q)});
 ok(Object.keys(A.hands).length===5&&ROWS.every((k,j)=>A.hands[k].length===NS[j]),id+': hands for every frame');
 ok(fx.join()===fixed,id+': repaired frames '+fx);ok(hd.join()===hid,id+': placed hands '+hd);ok(!!(A.rh&&A.rh.w&&A.rh.s),id+': the rig\'s hands');
 {const h=A.hands.attack[imp];ok(h.w[0]>h.s[0]+5&&h.w[1]<h.s[1],id+': the weapon hand does not lead the blow: '+JSON.stringify(h))}
 ok(A.heads.length===(id==='orcl'?7:8)&&A.heads.every(h=>!!A.p[h])&&A.heads[A.heads.length-1]==='head_dead',id+': the heads '+A.heads);
 for(const m in OR_FACES[id])ok(!!A.p['head_'+OR_FACES[id][m]],id+': mood '+m+' face '+OR_FACES[id][m]+' not in the atlas');
 ok(typeof FS_DEF[id].dress==='function'&&typeof FS_DEF[id].moodKey==='function',id+': not dressed or no mood');}
// the mood: from the unit's state, not a cycle
{const U=(hp,mor)=>({hp,hpMax:100,mor});ok(orMood(U(100,3),'idle')==='calm'&&orMood(U(50,3),'idle')==='wounded'&&orMood(U(20,3),'idle')==='dying'&&orMood(U(90,1),'idle')==='shaken'&&orMood(U(100,4),'idle')==='confident'&&orMood(U(100,3),'swap')==='busy','orMood')}
ok(!/Math\.random|\brnd\(/.test(src('76k-orc.js').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')),'76k-orc.js uses randomness');
/* ---------- browser ---------- */
const {chromium}=require('playwright');
(async()=>{const html=path.resolve(process.argv[2]||'dist/index.html');let main=process.argv[3];
 if(!main){main=path.join(os.tmpdir(),'orc-main.html');try{fs.writeFileSync(main,cp.execSync('git show HEAD:index.html',{cwd:ROOT,maxBuffer:1<<30}))}catch(e){main=''}}
 const b=await chromium.launch(),errs=[];
 const open=async f=>{const p=await b.newPage({viewport:{width:667,height:375}});p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
  await p.goto('file://'+f);await p.waitForTimeout(300);await p.evaluate(()=>{newGame();closeSheet();if(typeof fsImg==='function')for(const id of['orcw','obrute','orcl','orcy'])if(FS_DEF[id])fsImg(id)});
  await p.waitForFunction(()=>typeof fsImg!=='function'||['orcw','obrute','orcl','orcy'].every(id=>!FS_DEF[id]||!!fsImg(id)),null,{timeout:20000});return p};
 const p=await open(html);
 const R=await p.evaluate(()=>{const bad=[],n={frames:0};let uid=950;
  const c=document.createElement('canvas');c.width=500;c.height=320;const q=c.getContext('2d');
  const measure=Fr0=>{const Fr=Object.assign({},Fr0,{list:Fr0.list.filter(x=>x.tag!=='weapon'&&x.tag!=='shield')});q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,c.width,c.height);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Fr,62.5,70);q.setTransform(1,0,0,1,0,0);
   const d=q.getImageData(0,0,c.width,c.height).data,xs=[];let y0=1e9,y1=-1;for(let j=3;j<d.length;j+=4)if(d[j]>128){const i=j>>2,x=i%c.width,y=(i/c.width)|0;xs.push(x);if(y<y0)y0=y;if(y>y1)y1=y}
   xs.sort((a,b)=>a-b);return{n:xs.length,mx:xs.length?(xs[xs.length>>1]-250)/4:0,lo:(y1+1-280)/4,h:(y1+1-y0)/4}};
  for(const id of['orcw','obrute','orcl','orcy']){const u=mkEnemy(id,'orc');u.id=++uid;const S=SHEETS[id],A=FS_DEF[id].atl(),K=4*HUM_A*fsSc(id),N=A.f.attack.length,nd=A.f.death.length,NR=A.f.run.length,keyed=!!A.hands;
   if(!fsOn(u))bad.push(id+': not drawn from its sheet');if(S.dy)bad.push(id+': dy '+S.dy+' (the feet belong on the tile centre)');
   const air=new Set();A.f.run.forEach((R,i)=>{if(R.ay>R.h+1)air.add('run'+i)});
   const rows=[['idle',8,i=>({c:i/8})],['walk',NR,i=>({c:(i+.5)/NR})],['flee',NR,i=>({c:(i+.5)/NR})],['attack',N,i=>{const H=240*AN_HIT_AT,d=FS_DEF[id].an.attack;return{el:i<d.imp?(i+.5)/d.imp*H:H+(i-d.imp+.5)/(N-d.imp)*(d.ms-H)}}],
    ['attack',NR,i=>({c:(i+.5)/NR,row:'charge'})],['cast',N,i=>({el:(i+.5)/N*760})],['hit',N,i=>({el:(i+.5)/N*600})],['death',nd,i=>({t:(i+.5)/nd})],['swap',1,()=>({c:0})],['reload',1,()=>({c:0})]];
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
   if(!keyed){const seenH={};for(let t=0;t<4;t+=.01)seenH[fsFrame(id,0,'idle',{c:t},K,3).face]=1;if(!(seenH.neutral&&seenH.stern&&seenH.grit))bad.push(id+': idle expressions '+Object.keys(seenH))}
   else{// the face follows the mood, not the clock
    const F=OR_FACES[id],face=()=>fsFrame(id,0,'idle',{c:.3},K,3,u).face,hp0=u.hp,mor0=u.mor,s0=anOf(u),va0=[s0.vaId,s0.vaT];
    {const seenH={};for(let t=0;t<4;t+=.05)seenH[fsFrame(id,0,'idle',{c:t},K,3,u).face]=1;if(Object.keys(seenH).join()!==F.calm)bad.push(id+': the idle face cycles '+Object.keys(seenH))}
    u.mor=3;u.hp=u.hpMax*.5;if(face()!==F.wounded)bad.push(id+': wounded face '+face());u.hp=u.hpMax*.2;if(face()!==F.dying)bad.push(id+': dying face '+face());
    u.hp=u.hpMax;u.mor=4;if(face()!==F.confident)bad.push(id+': confident face '+face());u.mor=3;if(fsFrame(id,0,'swap',{c:0},K,3,u).face!==F.busy)bad.push(id+': busy face');
    s0.vaId='owarcry';s0.vaT=fsNow();if(face()!==F.cry)bad.push(id+': face after an ability '+face());s0.vaId=va0[0];s0.vaT=va0[1];u.hp=hp0;u.mor=mor0;
    // no key colour left on the hands: blue nowhere in the atlas, no red key round a hand
    const I=fsImg(id),c2=document.createElement('canvas');c2.width=I.naturalWidth;c2.height=I.naturalHeight;const q2=c2.getContext('2d');q2.drawImage(I,0,0);const d=q2.getImageData(0,0,c2.width,c2.height).data;let nb=0,nr=0;
    for(let j=0;j<d.length;j+=4)if(d[j+3]>128&&d[j+2]>90&&d[j+2]-d[j]>45&&d[j+2]-d[j+1]>25)nb++;
    for(const k in A.hands)A.hands[k].forEach((h,i)=>{const R=A.f[k][i];if(h.s&&!(h.hid||'').includes('s')){const cx=(R.ax+h.s[0])*A.k+R.r[0],cy=(R.ay+h.s[1])*A.k+R.r[1];
     for(let y=Math.floor(cy-4);y<=cy+4;y++)for(let x=Math.floor(cx-4);x<=cx+4;x++){const j=(y*c2.width+x)*4;if(d[j+3]>128&&d[j]>120&&d[j]-d[j+1]>85&&d[j]-d[j+2]>85)nr++}}});
    if(nb>4)bad.push(id+': '+nb+' blue key pixels left');if(nr)bad.push(id+': '+nr+' red key pixels left on the hands')}
   // no painted weapon left in the warrior's and crusher's frames: round each frame's old weapon head (5 frame px) no steel (bright, grey) and
   // nearly nothing opaque (the head was held out beside the body)
   if(A.grip){const I=fsImg(id),c2=document.createElement('canvas');c2.width=I.naturalWidth;c2.height=I.naturalHeight;const q2=c2.getContext('2d');q2.drawImage(I,0,0);const d=q2.getImageData(0,0,c2.width,c2.height).data;let nf=0;
    for(const k in A.grip)A.grip[k].forEach((h,i)=>{if(!h.hd)return;nf++;const R=A.f[k][i],cx=(R.ax+h.hd[0])*A.k+R.r[0],cy=(R.ay+h.hd[1])*A.k+R.r[1],r=5*A.k;let st=0,op=0,n=0;
     for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++){if((x-cx)**2+(y-cy)**2>r*r||x<R.r[0]||y<R.r[1]||x>=R.r[0]+R.r[2]||y>=R.r[1]+R.r[3])continue;n++;const j=(y*c2.width+x)*4;
      if(d[j+3]>128){op++;const mx=Math.max(d[j],d[j+1],d[j+2]),mn=Math.min(d[j],d[j+1],d[j+2]);if(mx-mn<24&&mx>125)st++}}
     if(st>1||op>n*.25)bad.push(id+' '+k+(i+1)+': the painted weapon is still there ('+st+' steel, '+op+'/'+n+' opaque px round its head)')});
    if(nf!==(id==='obrute'?34:14))bad.push(id+': '+nf+' frames with an erased weapon')}
   // the unit's weapon, drawn live (76mo-orcweap.js): in the weapon hand in every drawn frame but the cast's and in the rig, at the frame's
   // swing angle; at the belt on the near hip, head down, in every cast frame; the crusher's across his body (over the frame, his fists over
   // the haft), the rest under the figure; a two-hander's haft through the weapon fist
   {const two=id==='orcl'||id==='obrute',WD={orcw:'waraxe',obrute:'maul',orcl:'lordaxe',orcy:'handaxe'}[id];
    for(const [row,anim,NN] of[['run','walk',NR],['attack','attack',N],['cast','cast',N],['hurt','hit',N],['death','death',nd],['','idle',1]])for(let i=0;i<NN;i++){
     const tm=anim==='walk'||anim==='idle'?{c:(i+.5)/NN}:anim==='death'?{t:(i+.5)/NN}:{el:anim==='attack'?(()=>{const H=240*AN_HIT_AT,d=FS_DEF[id].an.attack;return i<d.imp?(i+.5)/d.imp*H:H+(i-d.imp+.5)/(N-d.imp)*(d.ms-H)})():(i+.5)/NN*(anim==='cast'?760:600)};
     const Fr=fsFrame(id,0,anim,tm,K,0,u),tg=id+' '+(row||'rig')+(row?Fr.fi+1:'');if(row&&Fr.anim!==row)continue;
     const H=row?(A.grip||A.hands)[row][Fr.fi]:(A.rg||A.rh),Ws=Fr.list.filter(x=>x.tag==='weapon'),W=Ws[0];
     if(Ws.length!==1){bad.push(tg+': '+Ws.length+' weapons');continue}if(Fr.list.some(x=>x.tag==='shield'))bad.push(tg+': a shield');
     if(!Fr.gear||Fr.gear.two!==two||!Fr.gear.w.startsWith(WD))bad.push(tg+': not its own weapon '+JSON.stringify(Fr.gear));
     const deg=Math.atan2(W.m[1],W.m[0])*180/Math.PI,dy=fsDy(id),bob=row?0:(Fr.pose&&Fr.pose.bob||0),fr=Fr.list.findIndex(x=>x.tag!=='weapon'&&x.tag!=='fist'),wi=Fr.list.indexOf(W);
     if(row==='cast'){// none in hand: at the belt on the near hip, head down and back
      const hp=OR_HIP[id];if(Fr.gear.at!=='belt')bad.push(tg+': the weapon not at the belt');if(!(deg>95&&deg<175))bad.push(tg+': hung at '+deg.toFixed(0)+' deg');
      if(wi>fr)bad.push(tg+': the hung weapon over the figure');if(Fr.list.some(x=>x.tag==='fist'))bad.push(tg+': fists over a weapon at the belt');
      const L=Fr.gear&&1,ax=W.m[4],ay=W.m[5]-dy;if(Math.hypot(ax-hp[0]*A.H,ay-hp[1]*A.H)>.25*A.H)bad.push(tg+': the weapon is not at the hip ('+ax.toFixed(1)+','+ay.toFixed(1)+')');
      for(const q of[H.w,H.s])if(q&&Math.abs(-Math.sin(deg*Math.PI/180)*(q[0]-ax)+Math.cos(deg*Math.PI/180)*(q[1]-ay))<3&&Math.hypot(q[0]-ax,q[1]-ay)<.5*A.H)bad.push(tg+': a hand on the hung weapon');
      continue}
     if(Fr.gear.at!=='hand')bad.push(tg+': the weapon not in hand');
     const want=orAng(id,row,Fr.fi);if(row&&Math.abs(deg-want)>.5)bad.push(tg+': the weapon at '+deg.toFixed(1)+' deg, not the frame\'s '+want);
     if(!row&&Math.abs(deg-want)>3)bad.push(tg+': the rig holds it at '+deg.toFixed(1));
     let hw=[H.w[0],H.w[1]+dy+bob];if(!row&&A.rg){const B=Fr.bones[A.rg.slot],sl=A.set.find(s=>s[0]===A.rg.slot);if(Math.hypot(B[4]-sl[2],B[5]-dy-sl[3])>3)bad.push(tg+': the rig\'s weapon slot has moved')}
     const a=deg*Math.PI/180,dx=hw[0]-W.m[4],dd=hw[1]-W.m[5],perp=Math.abs(-Math.sin(a)*dx+Math.cos(a)*dd),along=Math.cos(a)*dx+Math.sin(a)*dd;
     if(!two&&Math.hypot(dx,dd)>(row?.01:3))bad.push(tg+': the grip '+Math.hypot(dx,dd).toFixed(2)+' WU off the weapon fist');
     if(two&&(perp>(row?.01:3)||along<0))bad.push(tg+': the weapon fist '+perp.toFixed(2)+' WU off the haft');
     const over=Fr.gear.layer==='over';if(over!==(id==='obrute'&&row!==''&&!(row==='attack'&&(Fr.fi===2||Fr.fi===3))))bad.push(tg+': layer '+Fr.gear.layer);
     if(over){if(wi<fr)bad.push(tg+': under the figure');const F=Fr.list.filter(x=>x.tag==='fist');if(!F.length||F.some(x=>Fr.list.indexOf(x)<wi))bad.push(tg+': no fists over the haft')}
     else if(Fr.gear.layer==='under'&&wi>fr)bad.push(tg+': over the figure')}}
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
  {const K=id=>4*HUM_A*fsSc(id),hgt=id=>{const Fr=fsFrame(id,0,'attack',{el:0},K(id),0);let y0=1e9,y1=-1;q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,c.width,c.height);q.setTransform(4,0,0,4,0,0);humSkDraw(q,Object.assign({},Fr,{list:Fr.list.filter(x=>x.tag==='frame')}),62.5,70);q.setTransform(1,0,0,1,0,0);
    const d=q.getImageData(0,0,c.width,c.height).data;for(let j=3;j<d.length;j+=4)if(d[j]>128){const y=((j>>2)/c.width)|0;if(y<y0)y0=y;if(y>y1)y1=y}return(y1-y0)/4};
   const b=hgt('orcy'),w=hgt('orcw');if(!(b<w-1.5))bad.push('the brave ('+b.toFixed(1)+') does not read smaller than the warrior ('+w.toFixed(1)+')')}
  // the sizes on the board (the user's): the brave a little larger than a man, the warrior and the crusher larger again (~1.2x), the warlord a little
  // larger than them (~1.3x): the idle sprites' opaque heights without the weapon, against the company's men
  {const ht=o=>{const q=o.cv.getContext('2d'),d=q.getImageData(0,0,o.cv.width,o.cv.height).data;let y0=1e9,y1=-1;for(let j=3;j<d.length;j+=4)if(d[j]>128){const y=((j>>2)/o.cv.width)|0;if(y<y0)y0=y;if(y>y1)y1=y}return(y1-y0+1)/o.k};
   const men=G.roster.slice(0,4).map(u=>ht(unitSpritePx(u,0,'idle',0))),man=Math.max(...men),H={};let k=980;
   for(const id of['orcy','orcw','obrute','orcl']){const u=mkEnemy(id,'orc');u.id=++k;const D=FS_DEF[id].dress;FS_DEF[id].dress=null;FS.bk.clear();H[id]=ht(unitSpritePx(u,0,'idle',0));FS_DEF[id].dress=D;FS.bk.clear()}
   const r=id=>H[id]/man,want={orcy:[1.03,1.14],orcw:[1.14,1.27],obrute:[1.14,1.27],orcl:[1.25,1.38]};
   for(const id in want)if(!(r(id)>=want[id][0]&&r(id)<=want[id][1]))bad.push(id+' stands '+r(id).toFixed(2)+'x a man ('+H[id].toFixed(1)+' vs '+man.toFixed(1)+' art px)');
   if(!(H.orcy>man+.5&&H.orcw>H.orcy+1.5&&H.orcl>H.orcw+1&&H.orcl<H.orcw*1.2&&Math.abs(H.obrute-H.orcw)<1.5))bad.push('the orcs\' sizes out of order: '+JSON.stringify(H)+' man '+man)}
  return{bad,n}});
 for(const x of R.bad)bad.push(x);
 // an untouched seeded battle: each orc's tile centre, its ring's centre and its figure (body centre over the feet) agree within 1 art px
 await p.evaluate(()=>{SET.detail='high';artChanged();SET.deploy=false;seedRng(77);newGame(true);closeSheet();seedRng(78);startBattle({f:'orc',mult:1,foes:['orcw','obrute','orcl','orcy'],src:{type:'sim'}});try{if(typeof deployDone==='function')deployDone()}catch(e){}});
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
  if(new Set(out).size<4)bad.push('the seeded battle has '+[...new Set(out)]);return{bad}});
 for(const x of T.bad)bad.push(x);
 const lowSig=async pg=>pg.evaluate(()=>{SET.detail='low';artChanged();const out={};let uid=990;for(const id of['orcw','obrute','orcl','orcy']){const u=mkEnemy(id,'orc');u.id=++uid;for(const st of['idle','walk','attack','cast','hit','death'])for(let fr=0;fr<4;fr++)for(const face of[0,1,2,3]){let o=null;try{o=unitSpritePx(u,face,st,fr)}catch(e){}
   if(!o||!o.cv){out[id+st+fr+face]='-';continue}const d=o.cv.getContext('2d').getImageData(0,0,o.cv.width,o.cv.height).data;let h=2166136261;for(let i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619)>>>0}out[id+st+fr+face]=o.cv.width+'x'+o.cv.height+':'+o.ax+','+o.ay+':'+h}}return out});
 let lowN=0;if(main&&fs.existsSync(main)){const pm=await open(main);const X=await lowSig(p),Mm=await lowSig(pm);for(const k in Mm){lowN++;if(X[k]!==Mm[k])bad.push('Detail Low differs from main: '+k)}}else console.log('(main build not found: Detail Low comparison skipped)');
 for(const e of errs)bad.push(e);
 console.log(JSON.stringify({frames:R.n.frames,lowCompared:lowN,bad:bad.length}));
 if(bad.length)console.log('FAIL:\n'+bad.slice(0,50).join('\n')+(bad.length>50?'\n... '+(bad.length-50)+' more':''));else console.log('OK');
 await b.close();process.exit(bad.length?1:0)})();
