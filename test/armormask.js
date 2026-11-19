// Armour colour mask and surcoat sheet test (browser):  node test/armormask.js [html]
// The colour mask of the armour sheet (assets/parts2/armor-mask.png, assets/make-armor-mask.py) and the surcoat sheet (assets/parts2/surcoats.webp
// cut by assets/make-surcoats.py) as the Detail High figures use them (73q-parts2.js: p2Dress, p2Piece, p2CoatTorso):
//  - the mask is the armour sheet's size, every piece's silhouette matches (IoU >= .98), only the six key colours, every armour has a primary;
//  - a merc in plain colours wears the armour exactly as drawn (no recolour layer drawn); a cloth / accent / metal dye changes its regions' hue
//    and leaves the others alone (per armour class); the tailor's preview at High changes with every dye and finish;
//  - the 10 surcoat designs: cut, mask aligned, no skin left, the company's emblem drawn where the sheet's charge was, the colours follow the banner.
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');
const ROOT=path.resolve(__dirname,'..'),u64=f=>'data:image/'+(/\.webp$/.test(f)?'webp':'png')+';base64,'+fs.readFileSync(path.join(ROOT,f)).toString('base64');
(async()=>{const f=path.resolve(process.argv[2]||'dist/index.html');const b=await chromium.launch(),p=await b.newPage({viewport:{width:667,height:375}});const errs=[];
p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
await p.goto('file://'+f);await p.waitForTimeout(300);
await p.evaluate(()=>{newGame();closeSheet();humImg()});await p.waitForFunction(()=>typeof humReady==='function'&&humReady(),null,{timeout:30000});
const IM={sheet:u64('assets/parts2/armor.webp'),mask:u64('assets/parts2/armor-mask.png'),sc:u64('assets/parts2/surcoats-cut.png'),scm:u64('assets/parts2/surcoats-cut-mask.png')};
const R=await p.evaluate(async IM=>{const bad=[],n={};const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=s});
 const px=I=>{const c=document.createElement('canvas');c.width=I.width;c.height=I.height;const g=c.getContext('2d');g.drawImage(I,0,0);return{w:I.width,h:I.height,d:g.getImageData(0,0,I.width,I.height).data}};
 const S=px(await load(IM.sheet)),M=px(await load(IM.mask));
 // ---- the mask: size, keys, silhouettes ----
 if(S.w!==M.w||S.h!==M.h)bad.push('mask size '+[M.w,M.h]+' vs sheet '+[S.w,S.h]);
 const KEYS=['0,0,0','255,0,0','0,255,0','0,0,255','255,255,0','255,0,255'];let odd=0;
 for(let i=0;i<M.d.length;i+=4){const a=M.d[i+3];if(a===0)continue;if(a!==255||KEYS.indexOf(M.d[i]+','+M.d[i+1]+','+M.d[i+2])<0)odd++}
 if(odd)bad.push(odd+' mask pixels are not a flat key colour');
 // pieces: 8-connected components of the sheet's alpha (> 24), the big ones; IoU with the mask's alpha in each one's box
 const W=S.w,H=S.h,on=new Uint8Array(W*H),lab=new Int32Array(W*H).fill(-1);for(let i=0;i<W*H;i++)on[i]=S.d[i*4+3]>24?1:0;
 let np=0,low=[];for(let s0=0;s0<W*H;s0++){if(!on[s0]||lab[s0]>=0)continue;const st=[s0];lab[s0]=np;let x0=W,y0=H,x1=0,y1=0,cnt=0;
  while(st.length){const q=st.pop(),x=q%W,y=(q/W)|0;cnt++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(on[j]&&lab[j]<0){lab[j]=np;st.push(j)}}}
  if(cnt>=200){let I=0,U=0;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const j=y*W+x,a=lab[j]===np,m=M.d[j*4+3]>0;if(a&&m)I++;if(a||m)U++}if(I/U<.98)low.push(np+': '+(I/U).toFixed(3));n.pieces=(n.pieces||0)+1}np++}
 if(low.length)bad.push('silhouette IoU under .98: '+low.join(', '));if(!(n.pieces>=120))bad.push('only '+n.pieces+' pieces found in the sheet');
 // every armour has a primary region (its torso's r layer), its shoulders follow it
 for(let i=0;i<P2_ARMOR.length;i++){const T=P2A.p['torso'+i];if(!T||!T.L.r)bad.push('armour '+i+' has no primary region');if(P2_ACLASS.length!==P2_ARMOR.length||!/^[plc]$/.test(P2_ACLASS[i]))bad.push('armour '+i+': no class')}
 // ---- recolouring ----
 const base=G.roster[0];let id=98000;
 const merc=(ai,cs)=>{const m=JSON.parse(JSON.stringify(base));m.id=++id;m.name='M'+ai;m.race='human';m.bg='sellsword';m.eq={w:'arming',a:'__t'+ai,h:null,s:null,c:null,b:null};if(cs)m.colors=cs;else delete m.colors;
  P2_ARMOR_OF['__t'+ai]=P2_ARMOR[ai][0];ITEMS['__t'+ai]=Object.assign({},ITEMS.padded,{n:'t'});return m};
 const look=m=>usLook(mkPlayerUnit(m));
 // a layer's coverage in its piece canvas (alpha of the layer drawn alone)
 const cov=(pn,m)=>{const P=P2A.p[pn],l=P.L[m];const k=P2A.k,Wd=Math.ceil(P.w*k)+2,Hd=Math.ceil(P.h*k)+2,c=document.createElement('canvas');c.width=Wd;c.height=Hd;if(!l)return null;
  c.getContext('2d').drawImage(p2Img(l[0]),l[1],l[2],l[3],l[4],1+l[5]*k,1+l[6]*k,l[7]*k,l[8]*k);return c.getContext('2d').getImageData(0,0,Wd,Hd).data};
 const hue=(r,g,b)=>{const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(!d)return-1;let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;return(h*60+360)%360};
 // mean |difference| of two canvases where a layer covers (alpha > 200) and where none of the recoloured layers do
 const diff=(c0,c1,pn,keys)=>{const a=c0.getContext('2d').getImageData(0,0,c0.width,c0.height).data,b=c1.getContext('2d').getImageData(0,0,c1.width,c1.height).data,L={};for(const m of['r','g','b','y','m'])L[m]=cov(pn,m);
  const res={};for(const m of keys.concat(['rest'])){let s=0,c=0;for(let i=0;i<a.length;i+=4){if(a[i+3]<200)continue;const inm=m==='rest'?['r','g','b','y','m'].every(q=>!L[q]||L[q][i+3]<40):L[m]&&L[m][i+3]>200;if(!inm)continue;s+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);c++}res[m]=c?s/c/3:null}return res};
 n.plain=0;n.dyed=0;
 for(let ai=0;ai<P2_ARMOR.length;ai++){const L0=look(merc(ai,null));if(p2Dress(L0,ai)!==null)bad.push('armour '+ai+': a plain merc is recoloured');
  const A0=humSkAssets(L0,0,humK());if(A0.T.c.pid!=='torso'+ai+'|'+(A0.tone||'')+'||||')bad.push('armour '+ai+': the plain torso is not the sheet drawing ('+A0.T.c.pid+')');else n.plain++;
  const cls=P2_ACLASS[ai],has=m=>!!P2A.p['torso'+ai].L[m];
  // cloth dye: cloth / leather primary, or a metal armour's cloth (g)
  const test=(cs,want,label)=>{const L1=look(merc(ai,cs)),A1=humSkAssets(L1,0,humK()),D=diff(A0.T.c,A1.T.c,'torso'+ai,want);
   for(const m of want)if(has(m)&&!(D[m]>6))bad.push(`armour ${ai} (${cls}) ${label}: region ${m} barely changes (${D[m]&&D[m].toFixed(1)})`);
   if(D.rest>2.5)bad.push(`armour ${ai} ${label}: the regions it does not dye change too (${D.rest.toFixed(2)})`);n.dyed++};
  test({cloth:'royal'},cls==='p'?['g']:['r'],'cloth');
  test({accent:'crimson'},cls==='p'?['y']:['g'],'accent');
  test({metal:'gilded'},cls==='p'?['r','b']:['b'],'metal')}
 // the hue follows the dye: royal blue cloth on a tunic
 {const ai=P2A_IDX('tunic tan'),A1=humSkAssets(look(merc(ai,{cloth:'royal'})),0,humK()),c=A1.T.c,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,Lr=cov('torso'+ai,'r');let hs=[];
  for(let i=0;i<d.length;i+=4)if(Lr[i+3]>200&&d[i+3]>200){const h=hue(d[i],d[i+1],d[i+2]);if(h>=0)hs.push(h)}hs.sort((a,b)=>a-b);const med=hs[hs.length>>1];if(!(med>190&&med<260))bad.push('royal blue tunic: hue '+med)}
 // the legs follow the cloth dye
 {const ai=P2A_IDX('plate'),A1=humSkAssets(look(merc(ai,{cloth:'crimson'})),0,humK());if(!/\|#/.test(A1.LA.c.pid))bad.push('the trousers do not take the cloth dye')}
 // ---- the tailor's preview at Detail High: every dye and finish changes it ----
 {openTown(0);townTab='tailor';townSel.tailor=0;TLR.mode='dye';const m=G.roster[0];TLR.id=null;TLR.draft=null;m.eq.c=null;m.eq.a='padded';delete m.colors;
  const img=()=>{const v=tailorView(G.towns[0]),x=/class="tl-spr"[^>]*src="([^"]+)"/.exec(v.detail)||/src="([^"]+)"[^>]*class="tl-spr"/.exec(v.detail);return x?x[1]:null};
  const i0=img();if(!i0)bad.push('the tailor shows no figure');const seen=new Set([i0]);n.swatch=0;
  for(const [part,T] of[['cloth',DYES],['accent',DYES],['metal',FINISH]])for(const k of Object.keys(T)){if(k==='steel')continue;tailorPick(part,k);const s=img();if(seen.has(s)&&part!=='metal')bad.push('tailor: '+part+' '+k+' does not change the figure');seen.add(s);n.swatch++;tailorPick(part,null)}
  m.eq.a='plate';TLR.draft=null;const j0=img();tailorPick('metal','gilded');if(img()===j0)bad.push('tailor: a metal finish does not change plate');tailorPick('metal',null);closeSheet&&closeSheet()}
 // ---- surcoats ----
 const SC=px(await load(IM.sc)),SM=px(await load(IM.scm)),cw=SC.w/5,ch=SC.h/2;n.coats=0;
 for(let d=0;d<10;d++){if(!P2A.p['coat'+d]||!P2A.p['coat'+d].L.r)bad.push('surcoat design '+d+' missing');const ox=(d%5)*cw,oy=(d/5|0)*ch;let I=0,U=0,skin=0,yel=0;
  for(let y=oy;y<oy+ch;y++)for(let x=ox;x<ox+cw;x++){const j=(y*SC.w+x)*4,a=SC.d[j+3]>24,m=SM.d[j+3]>0;if(a&&m)I++;if(a||m)U++;if(a){const r=SC.d[j],g=SC.d[j+1],bb=SC.d[j+2];if(r>150&&r-bb>45&&g>r*.45&&g<r*.85&&bb>r*.4&&bb<r*.7&&!(SM.d[j]|SM.d[j+1]|SM.d[j+2]))skin++}if(m&&SM.d[j]===255&&SM.d[j+1]===255&&SM.d[j+2]===0)yel++}
  if(I/U<.98)bad.push('surcoat '+d+': mask IoU '+(I/U).toFixed(3));if(skin>40)bad.push('surcoat '+d+': '+skin+' skin pixels left');if((d>=6)!==(yel>0))bad.push('surcoat '+d+': emblem region '+yel);n.coats++}
 // over the torso: emblem drawn at the charge's place, colours from the banner
 {const ai=P2A_IDX('mail'),m=merc(ai,null);m.eq.c='tabard';G.banner=bannerFix({c1:'g',c2:'y',emblem:'lion',div:'plain'});G.wearCol={coat:true,cloth:false};
  const A=humSkAssets(look(m),0,humK()),c=A.T.c;if(!(c.coat>=6))bad.push('a plain banner\'s tabard is not a charged design: '+c.coat);else{const Ca=P2A.p['coat'+c.coat].a,k=P2A.k,TP=P2A.p['torso'+ai];
   const ox=TP.a.nx-Ca.nx-c.ox,oy=TP.a.ny-Ca.ny-c.oy,g=c.getContext('2d');
   const at=(sx,sy)=>g.getImageData(Math.round((ox+sx)*k)+1,Math.round((oy+sy)*k)+1,1,1).data;
   // the field: madder (red); the emblem's place differs from the field around it
   let red=0,em=0,N=0;for(let t=-.3;t<=.3;t+=.1)for(let s=-.3;s<=.3;s+=.1){const q=at(Ca.ex+s*Ca.ew,Ca.ey+t*Ca.eh);N++;if(Math.abs(q[0]-q[1])>40&&q[0]>q[2]+30)red++;if(q[1]>q[2]+30&&q[0]>120&&q[1]>100)em++}
   let fr=0;const ring=[[-.62,-.3],[.62,-.3],[-.62,.3],[.62,.3],[-.62,0],[.62,0]];for(const [s,t] of ring){const q=at(Ca.ex+s*Ca.ew,Ca.ey+t*Ca.eh);if(q[0]>q[1]+40&&q[0]>q[2]+40)fr++}
   if(fr<4)bad.push('the field round the emblem is not the banner\'s madder ('+fr+'/6)');if(!(em>=4))bad.push('no saffron emblem at the charge\'s place ('+em+'/'+N+')')}
  G.banner=bannerFix({c1:'x',c2:'l',emblem:'lion',div:'pale',c3:'G'});const A2=humSkAssets(look(Object.assign({},m,{id:++id})),0,humK());if(A2.T.c.coat!==1)bad.push('a per pale banner does not give the per pale surcoat: '+A2.T.c.coat);
  G.banner=bannerFix({c1:'x',c2:'l',emblem:'lion',div:'bordure',c3:'G'});const A3=humSkAssets(look(Object.assign({},m,{id:++id})),0,humK());if(A3.T.c.coat!==5)bad.push('a bordure banner does not give the bordure surcoat')}
 return{bad,n}},IM);
console.log(JSON.stringify(R.n));if(errs.length)R.bad.push('page errors: '+errs.slice(0,3).join(' | '));
if(R.bad.length){console.log(R.bad.slice(0,40).join('\n'));console.log('FAIL',R.bad.length);process.exitCode=1}else console.log('armormask test passed');await b.close()})();
