// Helmet colour mask test (browser):  node test/helmmask.js [html] [--shots DIR]
// The helmet sheet's colour mask (assets/parts2/helmet-mask.png, assets/make-helmet-mask.py) as the Detail High figures use it (73q-parts2.js:
// P2_HCLASS, p2HelmDress, p2HeadAtt):
//  - the mask is the sheet's size, opaque exactly where the sheet is (alpha > 24), only the six key colours;
//  - every helmet has a class (p metal, c cloth, l leather / fur, n bone / straw) and a primary region if it is recoloured at all;
//  - a cloth / leather helmet's primary takes the tailor's cloth (hue near the dye's) and the parts it does not dye stay as drawn; a steel
//    helmet's metal never takes the cloth (it follows the metal finish); plumes and crests follow the accent; a plain merc's helmet is drawn
//    exactly as the sheet;
//  - through the figure: the hooded / capped merc's head attachment changes with the cloth dye, the tailor's preview at High too;
//  - Detail Low: the pixel figure's and the portrait's cloth / leather caps follow the cloth dye.
// --shots DIR: tailor.png (helmets on figures in three colour schemes) and tailor-ui.png (the tailor screen, a hooded merc dyed).
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');
const ROOT=path.resolve(__dirname,'..'),u64=f=>'data:image/'+(/\.webp$/.test(f)?'webp':'png')+';base64,'+fs.readFileSync(path.join(ROOT,f)).toString('base64');
const ARGV=process.argv.slice(2),SHOTS=ARGV.includes('--shots')?ARGV[ARGV.indexOf('--shots')+1]:null,HTML=ARGV.find((a,i)=>!a.startsWith('--')&&ARGV[i-1]!=='--shots');
(async()=>{const f=path.resolve(HTML||'dist/index.html');const b=await chromium.launch(),p=await b.newPage({viewport:{width:667,height:375}});const errs=[];
p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
await p.goto('file://'+f);await p.waitForTimeout(300);
await p.evaluate(()=>{newGame();closeSheet();humImg()});await p.waitForFunction(()=>typeof humReady==='function'&&humReady(),null,{timeout:30000});
const IM={sheet:u64('assets/parts2/helmets.webp'),mask:u64('assets/parts2/helmet-mask.png')};
const R=await p.evaluate(async([IM,SHOTS])=>{const bad=[],n={};const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=s});
 const px=I=>{const c=document.createElement('canvas');c.width=I.width;c.height=I.height;const g=c.getContext('2d');g.drawImage(I,0,0);return{w:I.width,h:I.height,d:g.getImageData(0,0,I.width,I.height).data}};
 // ---- the mask ----
 const S=px(await load(IM.sheet)),M=px(await load(IM.mask));
 if(S.w!==M.w||S.h!==M.h)bad.push('mask size '+[M.w,M.h]+' vs sheet '+[S.w,S.h]);
 else{const KEYS=['0,0,0','255,0,0','0,255,0','0,0,255','255,255,0','255,0,255'];let odd=0,miss=0,extra=0;n.keyPx={};
  for(let i=0;i<M.d.length;i+=4){const a=M.d[i+3],sa=S.d[i+3]>24;if(sa&&!a)miss++;if(!sa&&a)extra++;if(!a)continue;const k=M.d[i]+','+M.d[i+1]+','+M.d[i+2];if(a!==255||KEYS.indexOf(k)<0)odd++;else n.keyPx[k]=(n.keyPx[k]||0)+1}
  if(odd)bad.push(odd+' mask pixels are not a flat key colour');if(miss)bad.push(miss+' sheet pixels have no mask');if(extra)bad.push(extra+' mask pixels where the sheet is transparent')}
 // ---- classes and layers ----
 if(P2_HCLASS.length!==P2_HELM.length||P2_HELM.length!==40)bad.push('P2_HCLASS '+P2_HCLASS.length+' for '+P2_HELM.length+' helmets');
 const cov=(pn,m)=>{const P=P2A.p[pn],l=P.L[m];const k=P2A.k,c=document.createElement('canvas');c.width=Math.ceil(P.w*k)+2;c.height=Math.ceil(P.h*k)+2;if(!l)return null;
  c.getContext('2d').drawImage(p2Img(l[0]),l[1],l[2],l[3],l[4],1+l[5]*k,1+l[6]*k,l[7]*k,l[8]*k);return c.getContext('2d').getImageData(0,0,c.width,c.height).data};
 const area=d=>{let s=0;if(d)for(let i=3;i<d.length;i+=4)if(d[i]>128)s++;return s};
 n.cls={};
 for(let i=0;i<40;i++){const c=P2_HCLASS[i],P=P2A.p['helm'+i];n.cls[c]=(n.cls[c]||0)+1;if(!/^[pcln]$/.test(c)){bad.push('helmet '+i+': no class');continue}if(!P){bad.push('helmet '+i+' missing');continue}
  const ar=area(cov('helm'+i,'r')),all=area(cov('helm'+i,'c'));
  if(c==='n'){if(['r','g','b','y','m'].some(m=>P.L[m]))bad.push('helmet '+i+' ('+P2_HELM[i]+', n) has recolour layers')}
  else if(!(ar>=all*(c==='p'?.05:.3)))bad.push('helmet '+i+' ('+P2_HELM[i]+', '+c+'): its primary covers '+(ar/all).toFixed(2))}
 // ---- recolouring, every helmet ----
 const base=G.roster[0];let id=99000;
 const merc=(h,cs,mid)=>{const m=JSON.parse(JSON.stringify(base));m.id=mid||++id;m.name='H'+m.id;m.race='human';m.bg='sellsword';m.eq={w:'arming',a:'padded',h:h||null,s:null,c:null,b:null};if(cs)m.colors=cs;else delete m.colors;return m};
 const look=m=>usLook(mkPlayerUnit(m));
 const hue=(r,g,b)=>{const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(d<12)return-1;let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;return(h*60+360)%360};
 const data=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 // mean |difference| where a layer covers, median hue there
 const stat=(c0,c1,pn,m)=>{const a=data(c0),b=data(c1),L=m==='rest'?null:cov(pn,m),Ls=['r','g','b','y','m'].map(q=>cov(pn,q)).filter(Boolean);let s=0,c=0;const hs=[];
  for(let i=0;i<a.length;i+=4){if(a[i+3]<200)continue;const inm=m==='rest'?Ls.every(q=>q[i+3]<40):L&&L[i+3]>200;if(!inm)continue;s+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);c++;const h=hue(b[i],b[i+1],b[i+2]);if(h>=0)hs.push(h)}
  hs.sort((x,y)=>x-y);return{d:c?s/c/3:null,n:c,hue:hs.length?hs[hs.length>>1]:-1}};
 const L0=look(merc('hood',null));if(p2HelmDress(L0,3)!==null)bad.push('a plain merc\'s helmet is recoloured');
 const Lc=look(merc('hood',{cloth:'royal'})),La=look(merc('hood',{accent:'crimson'})),Lm=look(merc('hood',{metal:'gilded'}));n.dyed=0;
 for(let i=0;i<40;i++){const c=P2_HCLASS[i],pn='helm'+i,P0=p2Piece(pn);if(!P0)continue;if(P0.pid!==pn+'|||||')bad.push(pn+': the plain helmet is not the sheet drawing');
  const has=m=>!!P2A.p[pn].L[m],pc=(L)=>p2Piece(pn,null,null,null,null,p2HelmDress(L,i)),Pc=pc(Lc),Pa=pc(La),Pm=pc(Lm);
  if(c==='n'){if(Pc!==P0&&Pc.pid!==P0.pid)bad.push(pn+' (n) changes with the cloth');continue}
  const sc=stat(P0,Pc,pn,'r'),rest=stat(P0,Pc,pn,'rest');
  if(c==='c'||c==='l'){if(!(sc.d>8))bad.push(`${pn} (${P2_HELM[i]}, ${c}): the cloth dye barely changes its primary (${sc.d&&sc.d.toFixed(1)})`);
   if(!(sc.hue>190&&sc.hue<265))bad.push(`${pn} (${P2_HELM[i]}): royal blue cloth gives hue ${sc.hue}`);n.dyed++}
  else{if(sc.d>1)bad.push(`${pn} (${P2_HELM[i]}, steel): its metal takes the cloth dye (${sc.d.toFixed(1)})`);
   const sm=stat(P0,Pm,pn,'r');if(!(sm.d>8))bad.push(`${pn} (${P2_HELM[i]}, steel): a gilded finish barely changes its metal (${sm.d&&sm.d.toFixed(1)})`);
   if(has('g')){const sg=stat(P0,Pc,pn,'g');if(!(sg.d>8))bad.push(`${pn}: its cloth (g) does not take the cloth dye`)}n.dyed++}
  if(rest.d>2.5)bad.push(`${pn}: the parts no dye touches change (${rest.d.toFixed(2)})`);
  if(has('y')){const sy=stat(P0,Pa,pn,'y');if(!(sy.d>8))bad.push(`${pn}: its plume does not take the accent (${sy.d&&sy.d.toFixed(1)})`)}
  if(has('b')){const sb=stat(P0,Pm,pn,'b');if(!(sb.d>4))bad.push(`${pn}: its fittings do not follow the metal finish (${sb.d&&sb.d.toFixed(1)})`)}}
 // the flag mode (company colours on the clothes, no tailoring): a cloth hood takes the livery, a leather cap keeps its leather (as leather armour)
 {const w0=G.wearCol;G.wearCol={coat:true,cloth:true};const m=merc('hood',null);if(typeof mercLivery==='function'&&mercLivery(m)){const L=look(m);
   const Rh=p2HelmDress(L,3),Rl=p2HelmDress(L,0),Rs=p2HelmDress(L,10);if(!Rh||!Rh.r)bad.push('flag mode: the cloth hood keeps its own colour');if(Rl&&Rl.r)bad.push('flag mode: the leather cap is dyed');if(Rs&&Rs.r)bad.push('flag mode: the steel helm is dyed')}G.wearCol=w0}
 // ---- through the figure: the helmet each item gives, its head attachment changes with the dye ----
 const headPx=L=>{const A=humSkAssets(L,0,humK()),a=p2HeadAtt(A,0);return{A,a}};
 for(const [h,hi] of[['hood',3],['armcap',1],['cap',0],['nasal',10]]){const mid=++id,P=headPx(look(merc(h,null,mid))),Q=headPx(look(merc(h,{cloth:'royal'},mid)));
  if(P.A.helm!==hi){bad.push(h+' is drawn as helmet '+P.A.helm+', not '+hi);continue}
  const steel=P2_HCLASS[hi]==='p';if(steel?Q.A.helmR&&Q.A.helmR.r:!(Q.A.helmR&&Q.A.helmR.r))bad.push(h+': helmR '+JSON.stringify(Q.A.helmR));
  const a=data(P.a.cv),c=data(Q.a.cv);let d=0;if(a.length===c.length)for(let i=0;i<a.length;i++)d+=Math.abs(a[i]-c[i]);else d=1e9;
  if(steel?d!==0:d===0)bad.push(h+': the head '+(steel?'changes':'does not change')+' with the cloth dye')}
 // ---- the tailor's preview at Detail High: a hooded merc's figure changes with the cloth dye; the hood's colour piece is the dyed one ----
 {openTown(0);townTab='tailor';townSel.tailor=0;TLR.mode='dye';const m=G.roster[0];TLR.id=null;TLR.draft=null;m.eq.c=null;m.eq.a='padded';m.eq.h='hood';delete m.colors;
  const img=()=>{const v=tailorView(G.towns[0]),x=/class="tl-spr"[^>]*src="([^"]+)"/.exec(v.detail)||/src="([^"]+)"[^>]*class="tl-spr"/.exec(v.detail);return x?x[1]:null};
  const i0=img();tailorPick('cloth','crimson');const i1=img();if(!i0||i0===i1)bad.push('tailor: the hooded merc does not change with the cloth');
  const pc=[...P2_PC.keys()].filter(k=>/^helm3\|.*#/.test(k));if(!pc.length)bad.push('tailor: no dyed hood piece was drawn');n.tailorHood=pc.length;tailorPick('cloth',null);closeSheet&&closeSheet()}
 // ---- Detail Low: the pixel figure's and the portrait's caps follow the cloth ----
 {for(const h of['cap','armcap','hood']){const u=mkPlayerUnit(merc(h,{cloth:'royal'})),L=usLook(u);if(L.S.hat!==h||!L.S.hatR||L.S.hatR!==L.S.clothR)bad.push('Detail Low: the '+h+' does not take the cloth ('+L.S.hat+')')}
  const nasal=usLook(mkPlayerUnit(merc('nasal',{cloth:'royal'})));if(nasal.S.hatR&&nasal.S.hatR===nasal.S.clothR)bad.push('Detail Low: the nasal helm takes the cloth');
  if(typeof ptMercSpec==='function'){const P=ptMercSpec(merc('cap',{cloth:'royal'}));if(P.hat==='cap'&&!P.capC)bad.push('portrait: the cap does not take the cloth');const Q=ptMercSpec(merc('hood',{cloth:'royal'}));if(Q.hat==='hood'&&!Array.isArray(Q.hatC))bad.push('portrait: the hood does not take the cloth')}}
 // ---- render: helmets on figures in three colour schemes ----
 let shot=null;
 {const HL=[3,0,1,25,35,36,22,4,5,13,10,30,31,20],SCH=[null,{cloth:'royal',accent:'saffron',metal:'blackened'},{cloth:'crimson',accent:'forest',metal:'gilded'},{cloth:'forest',accent:'crimson',metal:'bronze'}];
  const cw=150,ch=190,c=document.createElement('canvas');c.width=cw*HL.length+10;c.height=ch*SCH.length+30;const g=c.getContext('2d');g.fillStyle='#d8d4c8';g.fillRect(0,0,c.width,c.height);g.fillStyle='#222';g.font='12px sans-serif';
  let changed=0;
  HL.forEach((hi,j)=>{g.fillText(P2_HELM[hi].slice(0,18)+' ['+P2_HCLASS[hi]+']',j*cw+6,14);let prev=null;
   SCH.forEach((cs,r)=>{const L=look(merc('hood',cs,4242)),A=humSkAssets(L,0,humK());A.helm=hi;A.helmR=p2HelmDress(L,hi);A.bk.clear();const B=humBuild(L,0,'idle',0);if(!B){bad.push('no figure for helmet '+hi);return}
    const s=Math.min((cw-8)/B.cv.width,(ch-10)/B.cv.height);g.drawImage(B.cv,j*cw+4+(cw-8-B.cv.width*s)/2,24+r*ch+(ch-6-B.cv.height*s),B.cv.width*s,B.cv.height*s);
    const u=B.cv.toDataURL();if(prev&&u!==prev)changed++;prev=u})});
  SCH.forEach((cs,r)=>{g.save();g.translate(c.width-4,24+r*ch+ch/2);g.rotate(-Math.PI/2);g.textAlign='center';g.fillText(cs?cs.cloth+' / '+cs.accent+' / '+cs.metal:'plain',0,0);g.restore()});
  if(changed<HL.length)bad.push('render: only '+changed+' figure changes across the schemes');n.rendered=HL.length*SCH.length;if(SHOTS)shot=c.toDataURL()}
 return{bad,n,shot}},[IM,SHOTS]);
console.log(JSON.stringify(R.n));if(errs.length)R.bad.push('page errors: '+errs.slice(0,3).join(' | '));
if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});fs.writeFileSync(path.join(SHOTS,'tailor.png'),Buffer.from(R.shot.split(',')[1],'base64'));
 // the tailor screen at 667x375: a hooded merc after a colour change
 await p.evaluate(()=>{const m=G.roster[0];m.eq.h='hood';m.eq.a='padded';delete m.colors;openTown(0);townSel.tailor=0;TLR.mode='dye';TLR.id=null;TLR.draft=null;tvGo('tailor');tailorPick('cloth','crimson');tailorPick('accent','saffron')});
 await p.waitForTimeout(600);await p.screenshot({path:path.join(SHOTS,'tailor-ui.png')})}
if(R.bad.length){console.log(R.bad.slice(0,40).join('\n'));console.log('FAIL',R.bad.length);process.exitCode=1}else console.log('helmmask test passed');await b.close()})();
