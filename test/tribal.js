// Tribal heads and armour test (browser):  node test/tribal.js [html] [--ref other.html]
// The user's tribal heads sheet (assets/parts2/tribal-heads.webp, cut by assets/make-tribal-atlas.py into trh0..19 with the face overlays
// trf0..7 / trff0..7) and tribal armour sheet (assets/parts2/tribal-armor.webp, assets/make-tribal-armor.py: torso51..62) as the Detail High
// figures use them (73q-parts2.js p2Tribal, p2TriHead, p2Armor):
//  - all 20 heads cut with their layers (own colours, skin, marking, outline ring), in head0's frame with head0's anchors, their silhouette on
//    head0's (IoU) and their ear on its ear; the 16 face overlays cut, no skin in them;
//  - human Wildlings (men and women) and the barbarian crisis warriors wear them; other backgrounds, dwarves, elves, half-orcs do not;
//  - every expression draws its face overlay (women the lashed one), and the face sits where the human head's does: the eye whites' and the
//    face ink's centres within 4 SU of the human head of the same expression;
//  - the marking: all 20 and every paint turn up over many Wildlings, stable per merc, the paint changes the marking's pixels only;
//  - hair, beards and helmets: drawn as on a human head (no hair under a helmet, the helmet over the crown, the beard on head0's mouth);
//  - tribal armour: a Wildling in hide / leather / rags / padded / jack / studded wears one of the 12 tribal armours (stable), others keep theirs;
//    the tailor's dyes recolour it;
//  - Detail Low unchanged; with --ref (a build of main) non-tribal humans, dwarves, elves and half-orcs are compared pixel for pixel, High and Low.
const {chromium}=require('playwright'),path=require('path');
const args=process.argv.slice(2),ri=args.indexOf('--ref'),ref=ri>=0?path.resolve(args[ri+1]):null,f=path.resolve(args.filter((a,i)=>a!=='--ref'&&(ri<0||i!==ri+1))[0]||'dist/index.html');
async function open(b,file){const p=await b.newPage({viewport:{width:667,height:375}});const errs=[];
 p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
 await p.goto('file://'+file);await p.waitForTimeout(300);
 await p.evaluate(()=>{newGame();closeSheet();humImg()});await p.waitForFunction(()=>typeof humReady==='function'&&humReady()&&typeof p2On==='function'&&p2On(),null,{timeout:30000});return{p,errs}}
// sprite digests of non-tribal figures (fixed ids, names, races, backgrounds, gear): High idle / attack in three faces, and Detail Low
const DIGEST=()=>{const base=G.roster[0],out={};
 const mk=(id,race,bg,eq)=>{const m=JSON.parse(JSON.stringify(base));m.id=id;m.name='Ref'+id;m.race=race;m.bg=bg;m.colors=null;m.gift=null;m.mast={};m.perks=[];m.traits=[];m.lvl=1;m.kills=0;delete m.pseed;delete m.fabled;
  m.eq=Object.assign({w:null,b:null,s:null,a:null,h:null,c:null},eq);return mkPlayerUnit(m)};
 const dg=o=>{if(!o||!o.cv)return'none';const d=o.cv.getContext('2d').getImageData(0,0,o.cv.width,o.cv.height).data;let h=2166136261;for(let i=0;i<d.length;i+=1){h^=d[i];h=Math.imul(h,16777619)}return o.cv.width+'x'+o.cv.height+':'+(h>>>0)};
 const G4=[{w:'arming',s:'heater2',a:'mail'},{w:'greataxe',a:'hide',h:'kettle'},{w:'knife',a:'padded'},{w:'spear',a:'leather',h:'hood'},{w:'handaxe',a:'rags'}];
 const L=[];for(const race of['human','dwarf','elf','halforc'])for(const bg of race==='human'?['sellsword','hunter','nomad','knight']:['wildling','sellsword'])for(let i=0;i<G4.length;i++)L.push(mk(65000+L.length,race,bg,G4[i]));
 for(const u of L)for(const [face,st] of[[0,'idle'],[1,'attack'],[2,'idle']])out['hi '+u.m.race+' '+u.m.bg+' '+u.m.id+' f'+face+' '+st]=dg(unitSpritePx(u,face,st,0));
 SET.detail='low';artChanged();for(const u of L)out['lo '+u.m.race+' '+u.m.bg+' '+u.m.id]=dg(unitSpritePx(u,0,'idle',0));
 // Detail Low of tribal figures too: unchanged by this work
 for(let i=0;i<4;i++){const u=mk(65900+i,'human','wildling',G4[i]);out['lo wildling '+i]=dg(unitSpritePx(u,0,'idle',0))}
 SET.detail='high';artChanged();return out};
(async()=>{const b=await chromium.launch();const {p,errs}=await open(b,f);
const R=await p.evaluate(()=>{const bad=[],n={};const k=humK(),base=G.roster[0];let mid=0;
 const merc=o=>{let m=null;for(let i=0;i<3000;i++){m=JSON.parse(JSON.stringify(base));m.id=81000+(++mid);m.name='Tr'+mid;m.race=o.race||'human';m.bg=o.bg||'wildling';m.colors=o.colors||null;
   m.eq=Object.assign({w:'handaxe',b:null,s:null,a:'hide',h:null,c:null},o.eq||{});const P=ptMercSpec(m);
   if((o.fem==null||!!P.fem===!!o.fem)&&(o.hair==null||P.hair===o.hair)&&(o.beard===undefined||(P.beard||null)===o.beard)&&(o.hat==null||!P.hat===!o.hat))break}
  return mkPlayerUnit(m)};
 const AS=u=>humSkAssets(usLook(u),0,k);
 const pix=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 // ---- the pieces ----
 const H0=P2A.p.head0;
 for(let i=0;i<20;i++){const P=P2A.p['trh'+i];if(!P){bad.push('trh'+i+' missing');continue}
  for(const l of['c','s','p','o'])if(!P.L[l])bad.push('trh'+i+': no layer '+l);
  if(Math.abs(P.w-H0.w)>.5||Math.abs(P.h-H0.h)>.5)bad.push('trh'+i+' frame '+P.w+'x'+P.h+' vs head0 '+H0.w+'x'+H0.h);
  for(const a of['cx','cy','r','nx','ny','sx0','sx1','eyb','etx','ety','bmx','bmy'])if(P.a[a]!==H0.a[a])bad.push('trh'+i+': anchor '+a+' '+P.a[a]+' vs head0 '+H0.a[a]);
  if(P.a.edx!==0||P.a.edy!==0)bad.push('trh'+i+': ear offset')}
 for(const s of['trf','trff'])for(let e=0;e<8;e++){const F=P2A.p[s+e];if(!F||!F.L.c)bad.push(s+e+' missing');else if(F.L.s)bad.push(s+e+': skin layer in a face')}
 // silhouettes: every head's own colours over head0's (alpha), IoU; and the ear (the lower left) overlap
 {const sil=n=>{const c=p2Piece(n,null),d=pix(c),W=c.width,H=c.height,m=new Uint8Array(W*H);for(let i=0;i<W*H;i++)m[i]=d[i*4+3]>128?1:0;return{m,W,H}};
  const A=sil('head0');let worst=1,ew=1;for(let i=0;i<20;i++){const B=sil('trh'+i);if(B.W!==A.W||B.H!==A.H){bad.push('trh'+i+' canvas size');continue}let I=0,U=0,eI=0,eU=0;
   for(let y=0;y<A.H;y++)for(let x=0;x<A.W;x++){const j=y*A.W+x,a=A.m[j],c=B.m[j];if(a&&c)I++;if(a||c)U++;if(x<A.W*.3&&y>A.H*.45&&y<A.H*.85){if(a&&c)eI++;if(a||c)eU++}}
   worst=Math.min(worst,I/U);ew=Math.min(ew,eI/eU);if(I/U<.93)bad.push('trh'+i+': silhouette IoU with head0 '+(I/U).toFixed(3));if(eI/eU<.85)bad.push('trh'+i+': ear IoU with head0 '+(eI/eU).toFixed(3))}
  n.silIoU=+worst.toFixed(3);n.earIoU=+ew.toFixed(3)}
 // ---- who wears them ----
 for(const fem of[0,1]){const u=merc({fem}),L=usLook(u),A=humSkAssets(L,0,k);if(!A.tri||A.hf!=='trh')bad.push((fem?'woman':'man')+' wildling: no tribal head ('+A.hf+')');
  else for(let e=0;e<8;e++){A.bk.clear();humSkFrame(L,0,'idle',0,k,'',{head:e});if(A.drawn.head!=='trh'+A.tri.i)bad.push('expression '+e+' drew '+A.drawn.head);if(A.drawn.face!==(fem?'trff':'trf')+e)bad.push((fem?'woman':'man')+' expression '+e+': face '+A.drawn.face)}
  for(const face of[0,1,2,3])for(const st of['idle','attack','hit','death']){const o=unitSpritePx(u,face,st,0);if(!o||!o.cv||!o.hum)bad.push('wildling render f'+face+' '+st)}}
 for(const [race,bg] of[['human','sellsword'],['human','hunter'],['human','nomad'],['human','knight'],['dwarf','wildling'],['elf','wildling'],['halforc','wildling']]){for(let j=0;j<6;j++){const A=AS(merc({race,bg}));if(A.tri)bad.push(race+' '+bg+' wears a tribal head')}}
 {let foes=0;for(const id of['barbz','barbax','barbskald','barbhus']){if(!EN[id])continue;const u=mkEnemy(id,'barb'),L=usLook(u);if(L.S.kind!=='hum')continue;const A=humSkAssets(L,0,k);foes++;if(!A.tri)bad.push('barbarian '+id+' has no tribal head');const o=unitSpritePx(u,0,'idle',0);if(!o||!o.hum)bad.push('barbarian '+id+' not drawn')}
  n.foes=foes;if(!foes)bad.push('no barbarian foes found');for(const id of['bandit','brigand','militia','sword']){if(!EN[id])continue;const u=mkEnemy(id,'bandit'),L=usLook(u);if(L.S.kind==='hum'&&humSkAssets(L,0,k).tri)bad.push(id+' (not tribal) wears a tribal head')}}
 // ---- faces aligned with the human heads' ----
 // each check over the face overlay's own solid pixels (the near eye's side): the tribal head drawn with the face against the human head of the
 // same expression; the shift (atlas px) that best overlays the two (eye whites, then the face ink) must be the one that registered the human
 // head on head0 (rdx, rdy) within 1 px, so a face that slipped, got clipped or lost its eyes shows
 {const FW=p2Piece('trh0',null).width,FH=p2Piece('trh0',null).height;
  const white=(r,g,b)=>r>215&&g>215&&b>215&&Math.max(r,g,b)-Math.min(r,g,b)<30,ink=(r,g,b)=>Math.max(r,g,b)<70;
  const best=(td,hd,W,H,F,t)=>{const A=[];for(let y=0;y<FH;y++)for(let x=Math.floor(FW*.4);x<FW;x++){const i=(y*FW+x)*4;if(F[i+3]>200&&t(td[i],td[i+1],td[i+2]))A.push([x,y])}if(A.length<8)return null;
   let b=null;for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){let c=0;for(const [x,y] of A){const X=x-dx,Y=y-dy;if(X<0||Y<0||X>=W||Y>=H)continue;const j=(Y*W+X)*4;if(hd[j+3]>200&&t(hd[j],hd[j+1],hd[j+2]))c++}
    if(!b||c>b.c||c===b.c&&Math.hypot(dx,dy)<Math.hypot(b.dx,b.dy))b={dx,dy,c}}return b.c>=A.length*.6?b:null};
  let worst=0,cnt=0;for(const fem of[0,1])for(let e=0;e<8;e++){const fn=(fem?'trff':'trf')+e,FP=P2A.p[fn],fc=document.createElement('canvas'),hc=p2Piece((fem?'headf':'head')+e,null);
   fc.width=FW;fc.height=FH;p2Lay(fc.getContext('2d'),FP,'c');const F=pix(fc),hd=pix(hc),rx=FP.a.rdx*P2A.k,ry=FP.a.rdy*P2A.k;
   for(const i of[0,3,5,10,17]){const tc=p2TriHead({i,h:0,paint:'red'},e,fem,null),td=pix(tc);if(tc.width!==FW||tc.height!==FH){bad.push('trh'+i+' canvas size');continue}
    for(const [nm,t] of[['eye whites',white],['face ink',ink]]){if(nm==='eye whites'&&(e===3||e===4||e===7))continue;const m=best(td,hd,hc.width,hc.height,F,t);
     if(!m){bad.push('trh'+i+' '+(fem?'f':'m')+e+': its '+nm+' do not match the human head\'s');continue}const d=Math.hypot(m.dx-rx,m.dy-ry)/P2A.k;worst=Math.max(worst,d);cnt++;
     if(d>1.6/P2A.k)bad.push(`trh${i} ${fem?'woman':'man'} ${P2_FACE[e]}: ${nm} ${d.toFixed(1)} SU off the human head's`)}}}
  n.faceOffMax=+worst.toFixed(2);n.faceChecks=cnt}
 // ---- markings and paint ----
 {const seenI={},seenP={};let unstable=0;for(let j=0;j<400;j++){const u=merc({}),A=AS(u);if(!A.tri){bad.push('a wildling without a tribal head');continue}seenI[A.tri.i]=1;seenP[A.tri.paint]=(seenP[A.tri.paint]||0)+1;
   const v=mkPlayerUnit(JSON.parse(JSON.stringify(u.m))),B2=humSkAssets(usLook(v),0,k);if(!B2.tri||B2.tri.i!==A.tri.i||B2.tri.paint!==A.tri.paint)unstable++}
  n.markings=Object.keys(seenI).length;n.paints=seenP;if(n.markings!==20)bad.push('markings seen over 400 wildlings: '+n.markings);
  for(const pn of Object.keys(P2_PAINT))if(!seenP[pn])bad.push('paint '+pn+' never chosen');if(unstable)bad.push(unstable+' wildlings change marking between looks');
  // the paint recolours the marking only: red vs woad differ where the marking is, the rest identical
  const a=pix(p2TriHead({i:3,h:0,paint:'red'},0,0,null)),c=pix(p2TriHead({i:3,h:0,paint:'woad'},0,0,null)),Pm=P2A.p.trh3;let inM=0,out=0;
  const mc=document.createElement('canvas'),c0=p2Piece('trh3',null);mc.width=c0.width;mc.height=c0.height;p2Lay(mc.getContext('2d'),Pm,'p');const md=pix(mc);
  for(let j=0;j<a.length;j+=4){const d=Math.abs(a[j]-c[j])+Math.abs(a[j+1]-c[j+1])+Math.abs(a[j+2]-c[j+2]);if(md[j+3]>100){if(d>30)inM++}else if(md[j+3]===0&&d>3)out++}
  if(inM<50)bad.push('the paint does not change the marking ('+inM+' px)');if(out)bad.push('the paint changes '+out+' px outside the marking');
  // the war-paint band (trh3) lies under the eyes: the eye whites stay white where the band crosses
  const w=pix(p2TriHead({i:3,h:0,paint:'soot'},0,0,null)),hw=pix(p2Piece('head0',null));let ok=0,tot=0;for(let j=0;j<w.length;j+=4){if(hw[j+3]>200&&hw[j]>225&&hw[j+1]>225&&hw[j+2]>225&&md[j+3]>100){tot++;if(w[j]>200&&w[j+1]>200&&w[j+2]>200)ok++}}
  n.bandUnderEyes=tot?+(ok/tot).toFixed(2):'n/a';if(tot&&ok/tot<.9)bad.push('the war-paint band covers the eyes ('+ok+'/'+tot+')')}
 // ---- hair, beards, helmets ----
 {const u=merc({fem:0,hair:'shaggy',hat:0}),L=usLook(u),A=humSkAssets(L,0,k);humSkFrame(L,0,'idle',0,k,'',{head:0});if(!A.drawn||!/^hair\d+$/.test(A.drawn.hair||''))bad.push('a wildling\'s hair not drawn: '+(A.drawn&&A.drawn.hair))}
 {let bd=0;for(let j=0;j<60&&!bd;j++){const u=merc({fem:0}),L=usLook(u),A=humSkAssets(L,0,k);if(!(A.beard>=0))continue;bd=1;humSkFrame(L,0,'idle',0,k,'',{head:2});if(A.drawn.beard!=='beard'+A.beard)bad.push('a wildling\'s beard not drawn')}if(!bd)bad.push('no bearded wildling found')}
 for(const h of['kettle','nasal','hood','cap','spangen','armet']){if(!ITEMS[h])continue;const u=merc({eq:{h,a:'hide'}}),L=usLook(u),A=humSkAssets(L,0,k);humSkFrame(L,0,'idle',0,k,'',{head:0});
  if(!A.tri)bad.push('helmet '+h+': no tribal head');if(A.drawn.hair)bad.push('hair under helmet '+h);if(!A.drawn.helm)bad.push('helmet '+h+' not drawn');
  const B0=Object.assign(Object.create(Object.getPrototypeOf(A)),A,{helm:-1,hair:-1,bk:new Map()});try{const th=p2HeadAtt(A,0).y,tb=p2HeadAtt(B0,0).y;if(!(th<=tb+.5))bad.push('helmet '+h+' does not cover the crown')}catch(e){n.helmSkip=String(e)}}
 // ---- tribal armour ----
 {const seen={};let unstable=0;for(const a of['hide','leather','rags','padded','jack','studded']){for(let j=0;j<40;j++){const u=merc({eq:{a}}),A=AS(u);if(!(A.armor>=51&&A.armor<=62)){bad.push('a wildling in '+a+' wears armour '+A.armor);continue}seen[A.armor]=1;
    const v=mkPlayerUnit(JSON.parse(JSON.stringify(u.m)));if(humSkAssets(usLook(v),0,k).armor!==A.armor)unstable++}}
  n.tribalArmours=Object.keys(seen).length;if(n.tribalArmours!==12)bad.push('tribal armours seen: '+Object.keys(seen).join(','));if(unstable)bad.push(unstable+' wildlings change armour between looks')
  for(const a of['mail','plate','scale']){const A=AS(merc({eq:{a}}));if(A.armor>=51)bad.push('a wildling in '+a+' wears a tribal armour')}
  for(const a of['hide','leather','rags']){const A=AS(merc({bg:'sellsword',eq:{a}}));if(A.armor>=51)bad.push('a sellsword in '+a+' wears a tribal armour')}
  // the tailor's dyes recolour it
  const u0=merc({eq:{a:'hide'}}),A0=AS(u0),m1=JSON.parse(JSON.stringify(u0.m));m1.colors={cloth:'royal',accent:'saffron',metal:'gilded'};const A1=AS(mkPlayerUnit(m1));
  if(A1.armor!==A0.armor)bad.push('dyes change which tribal armour');else{const a=pix(A0.T.c),c=pix(A1.T.c);let d=0;for(let j=0;j<a.length;j+=4)if(Math.abs(a[j]-c[j])+Math.abs(a[j+2]-c[j+2])>40)d++;if(d<200)bad.push('dyes barely change the tribal armour ('+d+' px)')}}
 // ---- Detail Low: the old figure ----
 {const u=merc({});SET.detail='low';artChanged();const lo=unitSpritePx(u,0,'idle',0);if(!lo||lo.hum)bad.push('Detail Low drew the composed figure');SET.detail='high';artChanged()}
 return{bad,n}});
let fails=R.bad.concat(errs);
if(ref){const D1=await p.evaluate(DIGEST);const o=await open(b,ref);const D0=await o.p.evaluate(DIGEST);let diff=[];for(const key in D0)if(D1[key]!==D0[key])diff.push(key);
 R.n.refCompared=Object.keys(D0).length;if(diff.length)fails.push('differs from the reference ('+diff.length+'): '+diff.slice(0,12).join(', '));fails=fails.concat(o.errs)}
else R.n.refCompared='skipped (no --ref)';
console.log(JSON.stringify(R.n));
if(fails.length)console.log('FAIL:\n'+fails.slice(0,40).join('\n'));else console.log('OK');
await b.close();process.exit(fails.length?1:0)})();
