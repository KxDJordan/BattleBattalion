/* ================= TITLE (Detail High): a painted vista, the company standing on the knoll, the gilded wordmark =================
   The scene is painted in code in the figures' own manner: dark ink outlines, flat cel colours with one soft shade, rounded
   shapes. The company in front is drawn by the battle's figure renderer (unitSpritePx, 73-units.js) at a high art scale, so the
   people on the title are the people in the game. Detail Low keeps the pixel dusk of 90-shell.js (paintTitle).
   Layers: back (sky, sun) and front (mountains, hills, castle, knoll) are painted once per size into canvases; each frame draws
   back, the drifting clouds, front, the waving flags and the figures (a slow idle breath). Reduced motion: one still frame.
   Visual only: the noise is thash() (90-shell.js), never the game's seeded stream; the title mercs are built here with fixed
   looks and negative ids (no rnd(), no G). */
const TT={host:null,cv:null,back:null,front:null,W:0,H:0,dpr:1,k:'',raf:0,last:0,figs:null,figK:'',figT:0,clouds:null,flags:[],grass:null,poll:0};
const TT_INK='#141210';
function ttHd(){return typeof hdArt!=='function'||hdArt()}
function ttReduced(){try{return typeof reducedMotion==='function'?reducedMotion():!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}catch(e){return false}}
function ttMix(a,b,t){const A=parseInt(a.slice(1),16),B2=parseInt(b.slice(1),16),m=s=>Math.round(((A>>s)&255)+(((B2>>s)&255)-((A>>s)&255))*t);return'#'+((1<<24)+(m(16)<<16)+(m(8)<<8)+m(0)).toString(16).slice(1)}
// fill a path, shade its lower/right part with a clip (one soft shade), then the ink outline
function ttCel(g,P,fill,o){o=o||{};g.fillStyle=fill;g.fill(P);if(o.shade){g.save();g.clip(P);o.shade(g);g.restore()}if(o.lw!==0){g.lineWidth=o.lw;g.strokeStyle=o.ink||TT_INK;g.lineJoin='round';g.lineCap='round';g.stroke(P)}}
function ttRidge(w,base,amp,f1,f2,ph,step){const pts=[];for(let x=-step;x<=w+step;x+=step){const u=x/w;pts.push([x,base-amp*(.55+.45*Math.sin(u*f1+ph))*(.6+.4*Math.sin(u*f2+ph*2.3))])}return pts}
function ttSmooth(p,pts,close){p.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];p.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2)}const L=pts[pts.length-1];p.lineTo(L[0],L[1])}

/* ---- the back layer: sky, sun ---- */
function ttPaintBack(g,w,h,s){const hz=h*.62;
 const sky=g.createLinearGradient(0,0,0,hz);sky.addColorStop(0,'#2e5b80');sky.addColorStop(.45,'#6fa8c4');sky.addColorStop(.8,'#bfdcd2');sky.addColorStop(1,'#f4dfa6');g.fillStyle=sky;g.fillRect(0,0,w,h);
 const sx=w*.7,sy=hz-h*.17,sr=h*.075;
 const gl=g.createRadialGradient(sx,sy,sr*.5,sx,sy,sr*5);gl.addColorStop(0,'rgba(255,240,190,.75)');gl.addColorStop(.35,'rgba(255,226,160,.28)');gl.addColorStop(1,'rgba(255,226,160,0)');g.fillStyle=gl;g.fillRect(0,0,w,h);
 g.fillStyle='#fff6d6';g.beginPath();g.arc(sx,sy,sr,0,7);g.fill();g.fillStyle='rgba(255,214,120,.5)';g.beginPath();g.arc(sx+sr*.18,sy+sr*.18,sr*.82,0,7);g.fill();g.fillStyle='#fff6d6';g.beginPath();g.arc(sx-sr*.08,sy-sr*.08,sr*.8,0,7);g.fill()}

/* ---- a cloud sprite: puffs in a row, a flat base, a cool shade underneath, ink outline ---- */
function ttCloud(s,seed){const n=3+(thash(seed,1)*3|0),r0=26*s,pad=6*s,puffs=[];let x=0;
 for(let i=0;i<n;i++){const r=r0*(.7+thash(seed,i+3)*.6)*(i===0||i===n-1?.75:1);puffs.push([x+r,r]);x+=r*1.35}
 const W=Math.ceil(x+r0*.8+pad*2),H=Math.ceil(r0*2.6+pad*2),c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');if(!g)return null;
 const base=H-pad-r0*.35,P=new Path2D();for(const [cx,r] of puffs){P.moveTo(pad+cx+r,base-r*.55);P.arc(pad+cx,base-r*.55,r,0,Math.PI*2)}P.rect(pad+puffs[0][0]-puffs[0][1]*.2,base-r0*.6,x-puffs[0][0],r0*.6);
 g.lineWidth=5*s;g.strokeStyle=TT_INK;g.lineJoin='round';g.stroke(P);g.fillStyle='#fbfaf3';g.fill(P);
 g.save();g.clip(P);g.fillStyle='#dde8ec';g.beginPath();for(const [cx,r] of puffs)g.ellipse(pad+cx+r*.3,base+r*.12,r*.95,r*.42,0,0,7);g.fill();g.restore();
 return c}

/* ---- the front layer: far mountains, two rows of hills with a castle and trees, the knoll ---- */
function ttTree(g,x,y,r,s,dark){const lw=3*s,c1=dark?'#3f7f4a':'#4f9a4c',c2=dark?'#326840':'#3e7f3d',c3=dark?'#5c9a5a':'#6cb35a';
 const T=new Path2D();T.rect(x-r*.13,y-r*.6,r*.26,r*.75);ttCel(g,T,'#7a5232',{lw});
 const P=new Path2D();[[0,-1.25,.62],[-.45,-.85,.5],[.45,-.85,.52],[0,-.7,.55]].forEach(([dx,dy,rr])=>{P.moveTo(x+dx*r+rr*r,y+dy*r);P.arc(x+dx*r,y+dy*r,rr*r,0,Math.PI*2)});
 g.lineWidth=lw*2;g.strokeStyle=TT_INK;g.lineJoin='round';g.stroke(P);g.fillStyle=c1;g.fill(P);g.save();g.clip(P);g.fillStyle=c2;g.beginPath();g.ellipse(x+r*.35,y-r*.5,r*.9,r*.6,-.4,0,7);g.fill();g.fillStyle=c3;g.beginPath();g.ellipse(x-r*.25,y-r*1.45,r*.32,r*.2,-.3,0,7);g.fill();g.restore()}
function ttCastle(g,x,y,s,flags){const lw=3.2*s,stone='#d9cdb2',st2='#b5a68a',roof='#c4493f',rf2='#99332d',u=s*1.25;
 const shadeR=(x0)=>g2=>{g2.fillStyle=st2;g2.fillRect(x0,-1e4,2e4,2e4)};
 const wall=new Path2D();const wy=y-34*u;wall.moveTo(x-70*u,y);wall.lineTo(x-70*u,wy);for(let i=0;i<8;i++){const a=x-70*u+i*17.5*u;wall.lineTo(a,wy-6*u);wall.lineTo(a+9*u,wy-6*u);wall.lineTo(a+9*u,wy);wall.lineTo(a+17.5*u,wy)}wall.lineTo(x+70*u,y);wall.closePath();
 ttCel(g,wall,stone,{lw,shade:g2=>{g2.fillStyle=st2;g2.fillRect(x-70*u,y-9*u,140*u,9*u)}});
 const gate=new Path2D();gate.moveTo(x-11*u,y);gate.lineTo(x-11*u,y-16*u);gate.arc(x,y-16*u,11*u,Math.PI,0);gate.lineTo(x+11*u,y);gate.closePath();ttCel(g,gate,'#3a2a1c',{lw});
 const tower=(cx,tw,th,rh,flag)=>{const T=new Path2D();T.rect(cx-tw/2,y-th,tw,th);ttCel(g,T,stone,{lw,shade:shadeR(cx+tw*.18)});
  const W2=new Path2D();W2.moveTo(cx-3*u,y-th+22*u);W2.lineTo(cx-3*u,y-th+13*u);W2.arc(cx,y-th+13*u,3*u,Math.PI,0);W2.lineTo(cx+3*u,y-th+22*u);W2.closePath();ttCel(g,W2,'#2a2018',{lw:lw*.8});
  const R=new Path2D();R.moveTo(cx-tw/2-5*u,y-th);R.quadraticCurveTo(cx-tw*.15,y-th-rh*.5,cx,y-th-rh);R.quadraticCurveTo(cx+tw*.15,y-th-rh*.5,cx+tw/2+5*u,y-th);R.closePath();
  ttCel(g,R,roof,{lw,shade:g2=>{g2.fillStyle=rf2;g2.fillRect(cx+tw*.1,y-th-rh,tw,rh)}});
  if(flag)flags.push({x:cx,y:y-th-rh,pole:16*u,w:22*u,h:12*u,s,ph:cx*.013,small:true})};
 tower(x-62*u,26*u,70*u,30*u,true);tower(x+62*u,26*u,70*u,30*u,true);tower(x-22*u,30*u,96*u,40*u,false);tower(x+24*u,34*u,118*u,46*u,true)}
function ttPaintFront(g,w,h,s){const hz=h*.62;
 // far mountains: blue-grey peaks with snow caps
 const M=new Path2D(),peaks=[];let x=-40*s;M.moveTo(x,hz+h*.05);for(let i=0;x<w+60*s;i++){const pw=(70+thash(i,21)*90)*s,ph=h*(.12+thash(i,22)*.16);peaks.push([x+pw/2,hz-ph,pw]);M.lineTo(x+pw/2,hz-ph);x+=pw;M.lineTo(x,hz-h*.02-thash(i,23)*h*.04)}M.lineTo(w+60*s,hz+h*.05);M.closePath();
 ttCel(g,M,'#9fb6c9',{lw:3*s,ink:'#2b3440',shade:g2=>{g2.fillStyle='#86a0b8';for(const [px,py,pw] of peaks){g2.beginPath();g2.moveTo(px,py);g2.lineTo(px+pw*.6,hz+h*.05);g2.lineTo(px+pw*.12,hz+h*.05);g2.closePath();g2.fill()}
  g2.fillStyle='#f4f7fa';for(const [px,py,pw] of peaks){const d=h*.045;g2.beginPath();g2.moveTo(px,py-2);g2.lineTo(px+pw*.26,py+d);g2.lineTo(px+pw*.12,py+d*.8);g2.lineTo(px,py+d*1.15);g2.lineTo(px-pw*.12,py+d*.75);g2.lineTo(px-pw*.26,py+d);g2.closePath();g2.fill()}}});
 // haze over the foot of the mountains
 const hzg=g.createLinearGradient(0,hz-h*.06,0,hz+h*.03);hzg.addColorStop(0,'rgba(232,236,214,0)');hzg.addColorStop(1,'rgba(232,236,214,.75)');g.fillStyle=hzg;g.fillRect(0,hz-h*.06,w,h*.09);
 // the castle on the back hill, far right (above the company's heads), the hill raised under it to hide its footing
 const flags=[];const cx=w*.87,cs=h/750*.72,by0=hz+h*.035;ttCastle(g,cx,by0,cs,flags);
 // back hills
 const back=ttRidge(w,hz+h*.03,h*.07,5.3,13,1.7,40*s);for(const p of back){const d=(p[0]-cx)/(105*cs*1.25);p[1]=Math.min(p[1],p[1]*(1-Math.exp(-d*d*d*d))+(by0-6*cs)*Math.exp(-d*d*d*d))}const B1=new Path2D();ttSmooth(B1,back);B1.lineTo(w+80*s,h);B1.lineTo(-80*s,h);B1.closePath();
 ttCel(g,B1,'#79ad73',{lw:3.5*s,shade:g2=>{g2.fillStyle='#6a9c66';g2.fillRect(0,hz+h*.07,w,h)}});
 for(let i=0;i<14;i++){const tx=(i+.5)/14*w+(thash(i,31)-.5)*40*s,u=tx/w,by=hz+h*.03-h*.07*(.55+.45*Math.sin(u*5.3+1.7))*(.6+.4*Math.sin(u*13+1.7*2.3))+h*.018;if(thash(i,33)<.5&&Math.abs(tx-cx)>110*cs)ttTree(g,tx,by,(9+thash(i,32)*5)*s,s*.8,true)}
 // the castle on the mid hill
 const mid=ttRidge(w,hz+h*.1,h*.06,3.1,9,.4,40*s),cy=hz+h*.08;
 const M2=new Path2D();ttSmooth(M2,mid);M2.lineTo(w+80*s,h);M2.lineTo(-80*s,h);M2.closePath();
 ttCel(g,M2,'#8cc463',{lw:4*s,shade:g2=>{g2.fillStyle='#79b155';g2.beginPath();for(let i=0;i<5;i++){const ex=(i+.3)/5*w;g2.ellipse(ex,hz+h*.2,w*.12,h*.05,0,0,7)}g2.fill();}});
 // a winding road from the castle gate to the knoll
 const R=new Path2D();R.moveTo(cx-6*s,cy+h*.012);R.bezierCurveTo(cx-w*.05,hz+h*.16,cx-w*.25,hz+h*.15,cx-w*.22,h*.9);R.lineTo(cx-w*.12,h*.9);R.bezierCurveTo(cx-w*.14,hz+h*.16,cx-w*.02,hz+h*.14,cx+8*s,cy+h*.012);R.closePath();
 g.save();g.clip(M2);ttCel(g,R,'#e2c98f',{lw:3*s,shade:g2=>{g2.fillStyle='#cfb378';g2.fillRect(cx-w*.3,hz+h*.2,w*.3,h)}});g.restore();
 for(let i=0;i<9;i++){const tx=(i+.5)/9*w*.62+(thash(i,41)-.5)*50*s,u=tx/w,by=hz+h*.1-h*.06*(.55+.45*Math.sin(u*3.1+.4))*(.6+.4*Math.sin(u*9+.4*2.3))+h*.03+thash(i,43)*h*.04;if(thash(i,42)<.55)ttTree(g,tx,by,(13+thash(i,44)*6)*s,s)}
 // the knoll in front, where the company stands
 const ka=Math.min(1,w/h/1.4),kn=[];for(let x2=-40*s;x2<=w+40*s;x2+=30*s){const u=x2/w;kn.push([x2,h*.85-ka*h*.06*Math.exp(-Math.pow((u-.76)/.24,2))+ka*h*.02*Math.sin(u*7.3)])}
 const K=new Path2D();ttSmooth(K,kn);K.lineTo(w+80*s,h+10);K.lineTo(-80*s,h+10);K.closePath();
 ttCel(g,K,'#9fd168',{lw:5*s,shade:g2=>{g2.fillStyle='#8cc65a';g2.beginPath();g2.ellipse(w*.3,h*1.04,w*.42,h*.09,0,0,7);g2.ellipse(w*.85,h*1.05,w*.3,h*.08,0,0,7);g2.fill();g2.fillStyle='#b6e07c';for(const p of kn){g2.beginPath();g2.ellipse(p[0],p[1]+7*s,16*s,3*s,0,0,7);g2.fill()}}});
 // grass tufts
 g.lineWidth=2.4*s;g.strokeStyle='#5f9a3f';g.lineCap='round';for(let i=0;i<60;i++){const tx=thash(i,51)*w,ty=h*.86+thash(i,52)*h*.13;g.beginPath();g.moveTo(tx-4*s,ty);g.lineTo(tx-6*s,ty-7*s);g.moveTo(tx,ty);g.lineTo(tx,ty-9*s);g.moveTo(tx+4*s,ty);g.lineTo(tx+7*s,ty-6*s);g.stroke()}
 return{flags,knoll:kn}}

/* ---- a waving flag (pole, cloth in the company's colours with its charge), drawn each frame ---- */
function ttBannerCols(){const b=(typeof _titleBn==='object'&&_titleBn&&_titleBn.b)||(typeof BANNERDEF==='object'?BANNERDEF:null),C=typeof BANNERC==='object'?BANNERC:{},pal=k=>typeof PAL==='object'&&PAL[k]||'#888888';
 const r1=b&&C[b.c1]?C[b.c1].r:null,r2=b&&C[b.c2]?C[b.c2].r:null;return{f:r1?pal(r1[1]):'#3f8f7c',fd:r1?pal(r1[2]):'#2c6b5c',c:r2?pal(r2[1]):'#d1a94e',em:b&&b.emblem||'swords'}}
function ttFlag(g,f,t,cols,big){const s=f.s,lw=(big?3.6:2.6)*s,wv=(i,n)=>Math.sin(t*2.6+f.ph-i/n*3.2)*f.h*.16*(i/n);
 const P=new Path2D();P.rect(f.x-lw*.45,f.y-f.pole,lw*.9,f.pole+(big?f.h*.2:0));g.fillStyle=TT_INK;g.fill(P);
 const n=8,top=[],bot=[],x0=f.x+lw*.3,y0=f.y-f.pole+lw;for(let i=0;i<=n;i++){const x=x0+f.w*i/n,d=wv(i,n);top.push([x,y0+d]);bot.push([x,y0+f.h+d])}
 const C=new Path2D();C.moveTo(top[0][0],top[0][1]);for(let i=1;i<=n;i++)C.lineTo(top[i][0],top[i][1]);
 if(big){const m=bot[n],tp=top[n];C.lineTo(m[0]-f.w*.18,(tp[1]+m[1])/2);}C.lineTo(bot[n][0],bot[n][1]);for(let i=n-1;i>=0;i--)C.lineTo(bot[i][0],bot[i][1]);C.closePath();
 g.lineJoin='round';g.lineWidth=lw*2;g.strokeStyle=TT_INK;g.stroke(C);g.fillStyle=cols.f;g.fill(C);
 g.save();g.clip(C);const sg=g.createLinearGradient(x0,0,x0+f.w,0);for(let i=0;i<=n;i++){const c=Math.cos(t*2.6+f.ph-i/n*3.2)*(i/n);sg.addColorStop(i/n,c>0?'rgba(20,18,16,'+(c*.32).toFixed(3)+')':'rgba(255,255,255,'+(-c*.16).toFixed(3)+')')}g.fillStyle=sg;g.fillRect(x0,y0-f.h,f.w+2,f.h*3);
 g.fillStyle=cols.c;g.fillRect(x0,top[0][1]-f.h,f.w*.12,f.h*3);g.restore();
 if(big&&cols.em==='swords'){const mi=n>>1,cx=(top[mi][0]+top[mi+1][0])/2,cy=(top[mi][1]+bot[mi][1])/2,r=f.h*.34;g.save();g.translate(cx,cy);g.lineCap='round';
  for(const a of [-1,1]){g.save();g.rotate(a*.78);g.lineWidth=r*.34;g.strokeStyle=TT_INK;g.beginPath();g.moveTo(0,-r);g.lineTo(0,r*.95);g.stroke();g.lineWidth=r*.17;g.strokeStyle='#eef2f5';g.beginPath();g.moveTo(0,-r*.95);g.lineTo(0,r*.45);g.stroke();
   g.lineWidth=r*.2;g.strokeStyle=TT_INK;g.beginPath();g.moveTo(-r*.32,r*.5);g.lineTo(r*.32,r*.5);g.stroke();g.lineWidth=r*.1;g.strokeStyle=cols.c;g.beginPath();g.moveTo(-r*.28,r*.5);g.lineTo(r*.28,r*.5);g.moveTo(0,r*.55);g.lineTo(0,r*.9);g.stroke();g.restore()}g.restore()}
 else if(big&&typeof humEmblem==='function'){const mi=n>>1,cx=(top[mi][0]+top[mi+1][0])/2,cy=(top[mi][1]+bot[mi][1])/2;try{g.save();g.translate(cx,cy);humEmblem(g,cols.em,-f.h*.32,-f.h*.32,f.h*.64,cols.c);g.restore()}catch(e){g.restore()}}
 g.fillStyle='#f3d98b';g.beginPath();g.arc(f.x,f.y-f.pole,lw*1.1,0,7);g.fill();g.lineWidth=lw*.7;g.strokeStyle=TT_INK;g.stroke()}

/* ---- the company: five mercs with fixed looks, drawn by the battle's figure renderer ---- */
const TT_CO=[['knight','human','Aldric',{w:'arming',s:'kite',a:'mail',h:'nasal'},1],['hunter','elf','Wren',{w:'huntbow',a:'leather',h:'hood'},1],
 ['hedgeknight','dwarf','Brann',{w:'beardaxe',a:'brigandine',h:'spangen'},1],['brigand','halforc','Gorm',{w:'greatsword',a:'hide'},1],['hedge','human','Sorrel',{w:'staff',a:'robe',h:'hood'},1]];
function ttMerc(i,bg,race,name,eq){const m={id:-900-i,name,bg,race,lvl:3,xp:0,pp:0,pend:0,base:{hp:60,fat:100,init:100,ms:50,rs:35,md:2,rd:2,brv:40},tal:{},trees:[],gift:null,perks:[],
  eq:Object.assign({w:null,b:null,s:null,a:null,h:null,c:null},eq),hp:60,field:false,inj:[],traits:[],slain:{}};
 if(typeof fixHands==='function')fixHands(m);if(typeof syncMast==='function')syncMast(m);return m}
// the figure at art scale k (device px per art unit, 3..7): {cv,ax,ay,k}; artScale() is pinned to k only while it is drawn
function ttFigure(m,k,face){if(typeof unitSpritePx!=='function')return null;const o=typeof ARTSC_O!=='undefined'?ARTSC_O:0;try{ARTSC_O=k;const s=unitSpritePx({m,side:0,hp:1},face,'idle',0);return s&&s.cv&&s.cv.width?s:null}catch(e){return null}finally{ARTSC_O=o}}
function ttFigs(unit){const k=Math.max(3,Math.min(7,Math.round(unit))),ready=typeof humReady!=='function'||humReady(),key=k+'|'+ready;if(TT.figs&&TT.figK===key)return TT.figs;
 if(!TT.mercs)TT.mercs=TT_CO.map((c,i)=>ttMerc(i,c[0],c[1],c[2],c[3]));
 TT.figs=TT.mercs.map((m,i)=>({s:ttFigure(m,k,TT_CO[i][4]),ph:i*1.7}));TT.figK=key;TT.ready=ready;return TT.figs}

/* ---- sizing and the frame loop ---- */
function ttBox(){const e=typeof document==='object'&&document.getElementById('titleBox');if(!e)return null;const r=e.getBoundingClientRect();return r&&r.width?r:null}
function ttSize(force){const host=document.getElementById('titleArt');if(!host)return false;const W=window.innerWidth,H=window.innerHeight;if(!(W>0&&H>0))return false;
 const dpr=Math.min(2,window.devicePixelRatio||1),k=W+'x'+H+'@'+dpr;
 if(!TT.cv||TT.host!==host||!host.contains(TT.cv)){const c=document.createElement('canvas');if(!c.getContext)return false;c.className='thd';host.innerHTML='';host.appendChild(c);TT.cv=c;TT.host=host;force=true}
 if(TT.k===k&&!force)return true;TT.k=k;TT.W=W;TT.H=H;TT.dpr=dpr;const w=Math.round(W*dpr),h=Math.round(H*dpr),s=Math.max(.55,Math.min(W,H*1.6)/1200)*dpr;TT.s=s;
 TT.cv.width=w;TT.cv.height=h;TT.cv.style.width=W+'px';TT.cv.style.height=H+'px';
 const mk=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};TT.back=mk();TT.front=mk();
 const gb=TT.back.getContext('2d'),gf=TT.front.getContext('2d');if(!gb||!gf)return false;ttPaintBack(gb,w,h,s);const F=ttPaintFront(gf,w,h,s);TT.flags=F.flags;TT.knoll=F.knoll;
 TT.clouds=[];for(let i=0;i<6;i++){const c=ttCloud(s*(.7+thash(i,61)*.6),i+7);if(c)TT.clouds.push({c,x:thash(i,62)*w,y:h*(.06+thash(i,63)*.3),v:(6+thash(i,64)*8)*s})}
 return true}
function ttKnollY(x){const K=TT.knoll;if(!K||!K.length)return TT.H*TT.dpr*.82;for(let i=1;i<K.length;i++)if(K[i][0]>=x){const a=K[i-1],b=K[i],t=(x-a[0])/((b[0]-a[0])||1);return a[1]+(b[1]-a[1])*t}return K[K.length-1][1]}
function ttFrame(ts){const c=TT.cv;if(!c)return;const g=c.getContext('2d');if(!g)return;const w=c.width,h=c.height,s=TT.s,dpr=TT.dpr,t=(ts||0)/1000,still=ttReduced();
 g.setTransform(1,0,0,1,0,0);g.drawImage(TT.back,0,0);
 for(const q of TT.clouds){const span=w+q.c.width*2,x=((q.x+(still?0:t*q.v))%span+span)%span-q.c.width;g.drawImage(q.c,Math.round(x),Math.round(q.y))}
 g.drawImage(TT.front,0,0);
 const cols=ttBannerCols(),tt=still?0:t;for(const f of TT.flags)ttFlag(g,f,tt,cols,false);
 // the company: on the knoll right of the menu (below it when the screen is tall)
 const box=ttBox(),tall=TT.H>TT.W*1.05,x0=tall?w*.08:box?Math.max(w*.42,(box.right+16)*dpr):w*.5,x1=w-(tall?w*.08:Math.max(24*dpr,w*.03)),avail=x1-x0;
 let fh=Math.min(h*(tall?.22:.27),avail/1.55,7*30);const unit=fh/30,figs=ttFigs(unit);const n=Math.max(1,Math.min(figs.length,Math.floor(avail/(fh*.42))));
 const order=[2,0,4,1,3].slice(0,n),gap=avail/(n+.6),bx=x0+gap*.8;
 // the company's standard, planted behind the second figure
 const sx=bx+gap*(n>1?1.45:.5),sy=Math.max(ttKnollY(sx)+fh*.02,tall&&box?box.bottom*dpr+fh*1.06:0);ttFlag(g,{x:sx,y:sy,pole:fh*1.65,w:fh*.62,h:fh*.4,s:s*Math.max(.8,fh/(160*dpr)),ph:1.3},tt,cols,true);
 order.forEach((fi,j)=>{const F=figs[fi];if(!F||!F.s)return;const S=F.s,k=S.k||1,x=bx+gap*j+(j&1?gap*.08:0),y=Math.max(ttKnollY(x)+fh*(j&1?.06:.0)+fh*.04,tall&&box?box.bottom*dpr+fh*1.1:0),f=unit/k,br=still?0:Math.sin(t*1.9+F.ph);
  const sc=f*(1+br*.012),scx=f*(1-br*.006);
  g.save();g.fillStyle='rgba(20,18,16,.28)';g.beginPath();g.ellipse(x,y,fh*.24,fh*.055,0,0,7);g.fill();g.restore();
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(S.cv,x-S.ax*k*scx,y-S.ay*k*sc,S.cv.width*scx,S.cv.height*sc)});
 // a soft dark veil on the menu's side so its text reads
 const vg=tall?g.createLinearGradient(0,0,0,h*.75):g.createLinearGradient(0,0,box?Math.min(w*.8,(box.right+180)*dpr):w*.62,0);
 [[0,.74],[.35,.66],[.6,.42],[.8,.15],[1,0]].forEach(([o,a])=>vg.addColorStop(o,'rgba(11,21,20,'+a+')'));g.fillStyle=vg;g.fillRect(0,0,w,h)}
function ttLoop(ts){TT.raf=0;if(typeof mode!=='undefined'&&mode!=='title'||!TT.cv||!ttHd())return;if(document.hidden){TT.raf=requestAnimationFrame(ttLoop);return}
 if(!TT.last||ts-TT.last>=32){TT.last=ts;ttFrame(ts)}if(!ttReduced())TT.raf=requestAnimationFrame(ttLoop);else ttWaitArt()}
// with no animation, draw again once the figure art and the fonts have arrived
function ttWaitArt(){if(TT.poll)return;if(TT.ready)return;TT.poll=setTimeout(()=>{TT.poll=0;if(typeof mode!=='undefined'&&mode!=='title')return;ttFrame(performance.now());ttWaitArt()},400)}
function drawTitleHd(force){try{if(!ttSize(force))return false;ttFrame(performance.now());if(!TT.raf&&!ttReduced())TT.raf=requestAnimationFrame(ttLoop);else if(ttReduced())ttWaitArt();return true}catch(e){return false}}

/* ---- the wordmark: Lilita One, gilded (a warm vertical ramp, a bevel under it, a gloss band), a thick ink outline and a drop
   shadow, over a madder ribbon carrying the tagline. Drawn to a canvas at device resolution; the h1 keeps the word as text. ---- */
function drawTitleLogo(){const c=typeof document==='object'&&document.querySelector('#titleBox .tlogo');if(!c||!c.getContext)return;const g=c.getContext('2d');if(!g)return;
 const dpr=Math.min(3,Math.max(1,window.devicePixelRatio||1)),F=96*dpr,word='Wyrdmarch',tag=(c.getAttribute('data-tag')||'').toUpperCase();
 g.font=F+'px "Lilita One","Fredoka",sans-serif';const tw=g.measureText(word).width,ol=F*.075,pad=ol*2+F*.04,W=Math.ceil(tw+pad*2+F*.06),ry=F*1.12,rh=F*.36,H=Math.ceil(ry+rh+F*.1);
 c.width=W;c.height=H;c.style.aspectRatio=W+'/'+H;g.font=F+'px "Lilita One","Fredoka",sans-serif';g.textBaseline='alphabetic';g.lineJoin='round';g.miterLimit=2;
 const x=pad,y=F*.9;
 // ribbon behind the bottom of the word: a band with folded tails
 const rx0=W*.16,rx1=W*.84,ft=rh*.9,R=new Path2D(),T1=new Path2D(),T2=new Path2D();
 T1.moveTo(rx0+ft*.4,ry+rh*.25);T1.lineTo(rx0-ft,ry+rh*.25);T1.lineTo(rx0-ft*.55,ry+rh*.75);T1.lineTo(rx0-ft,ry+rh*1.25);T1.lineTo(rx0+ft*.4,ry+rh*1.25);T1.closePath();
 T2.moveTo(rx1-ft*.4,ry+rh*.25);T2.lineTo(rx1+ft,ry+rh*.25);T2.lineTo(rx1+ft*.55,ry+rh*.75);T2.lineTo(rx1+ft,ry+rh*1.25);T2.lineTo(rx1-ft*.4,ry+rh*1.25);T2.closePath();
 R.moveTo(rx0,ry);R.quadraticCurveTo(W/2,ry-rh*.28,rx1,ry);R.lineTo(rx1,ry+rh);R.quadraticCurveTo(W/2,ry+rh*.72,rx0,ry+rh);R.closePath();
 const lw=F*.045;for(const P of [T1,T2]){g.lineWidth=lw*2;g.strokeStyle=TT_INK;g.stroke(P);g.fillStyle='#8f2f2a';g.fill(P)}
 g.lineWidth=lw*2;g.strokeStyle=TT_INK;g.stroke(R);g.fillStyle='#c4493f';g.fill(R);g.save();g.clip(R);g.fillStyle='#a63a33';g.fillRect(0,ry+rh*.62,W,rh);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,ry-rh,W,rh*1.18);g.restore();
 if(tag){let fs=rh*.62;g.font='600 '+fs+'px "Fredoka","Alegreya Sans",sans-serif';const lsp=fs*.12,tw2=g.measureText(tag).width+lsp*(tag.length-1),room=(rx1-rx0)*.86;if(tw2>room){fs*=room/tw2;g.font='600 '+fs+'px "Fredoka","Alegreya Sans",sans-serif'}
  const tw3=g.measureText(tag).width+fs*.12*(tag.length-1);let tx=W/2-tw3/2;const ty=ry+rh*.5+fs*.36;g.fillStyle='#f6e7c4';
  for(const ch of tag){g.fillStyle='rgba(20,18,16,.55)';g.fillText(ch,tx+fs*.04,ty+fs*.06);g.fillStyle='#f8ebc9';g.fillText(ch,tx,ty);tx+=g.measureText(ch).width+fs*.12}}
 g.font=F+'px "Lilita One","Fredoka",sans-serif';
 // drop shadow and the thick ink outline
 g.fillStyle=TT_INK;g.strokeStyle=TT_INK;g.lineWidth=ol*2;g.strokeText(word,x+F*.02,y+F*.07);g.fillText(word,x+F*.02,y+F*.07);g.strokeText(word,x,y);
 // bevel: the deep gold of the letters' lower edge
 g.fillStyle='#8a4f17';g.fillText(word,x,y+F*.045);
 // the gilded face
 // the gilded face and its gloss (a light band over the upper half of the letters) on a canvas of their own, so the gloss lands on the gold only
 const o=document.createElement('canvas');o.width=W;o.height=H;const q=o.getContext('2d')||g;q.font=g.font;q.textBaseline='alphabetic';
 const gr=q.createLinearGradient(0,y-F*.78,0,y+F*.05);gr.addColorStop(0,'#fff8d8');gr.addColorStop(.38,'#ffd75e');gr.addColorStop(.7,'#eda23a');gr.addColorStop(1,'#c9741f');q.fillStyle=gr;q.fillText(word,x,y);
 if(q!==g){q.globalCompositeOperation='source-atop';q.fillStyle='rgba(255,255,255,.38)';q.beginPath();q.moveTo(0,y-F*.82);q.lineTo(W,y-F*.82);q.lineTo(W,y-F*.5);q.quadraticCurveTo(W/2,y-F*.36,0,y-F*.48);q.closePath();q.fill();g.drawImage(o,0,0)}
 // a thin dark line inside the outline gives the gold its edge
 g.lineWidth=F*.012;g.strokeStyle='rgba(120,60,10,.55)';g.strokeText(word,x,y);
 c.classList.add('on')}
function ttLogoWhenReady(){drawTitleLogo();try{if(document.fonts&&document.fonts.load)Promise.all([document.fonts.load('96px "Lilita One"'),document.fonts.load('600 20px "Fredoka"')]).then(()=>drawTitleLogo()).catch(()=>{})}catch(e){}}
if(typeof onArtChange==='function')onArtChange(()=>{TT.figs=null;TT.figK='';TT.k='';if(typeof mode!=='undefined'&&mode==='title'&&typeof drawTitleArt==='function')try{drawTitleArt(true)}catch(e){}});
