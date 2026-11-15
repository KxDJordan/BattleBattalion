/* ================= PAINTED ICONS (Settings > Detail: High) =================
   Clean line art, high contrast, painted: every icon with a PAINT entry is drawn as anti-aliased vector art (Canvas 2D paths)
   at device resolution and replaces the pixel icon while Detail is High. Detail Low keeps the original 16 px pixel icons.
   Icons without a PAINT entry keep the 32x32 HD pixel drawing of 06h-iconshd.js until they get one.
   Style (docs/icons-paint-guide.md):
     - one light, from the upper left; every fill is painted in three values (lit / mid / shadow) plus a deep core shadow
       crescent on the lower right and a bright rim on the upper left (pkFill does all of it from a 5-tone material ramp)
     - near-black ink: inner lines PK.lw (1.1 units), and the outer silhouette is thickened by the outline pass (pkRender) so
       the icon reads against any background; nothing thinner than ~0.8 unit (0.4 CSS px at 16 px)
     - drawing space is 32x32 units whatever the output size (PAINT[name](g,px): g is already scaled; px = canvas pixels)
     - keep shapes big and simple: an icon must read at 16 CSS px; one subject, at most one secondary element
   Pipeline: pxIcon() -> icHdUse(n) (06h) -> pkURL(n) paints lazily on first use, once per icon, and the data URL goes into the
   same <style id="pxi-hd"> rule as the HD pixel icons (+ image-rendering:auto). pkCanvas(name,px) gives canvases the art.
   Status squares over units: pkBadgeCanvas(id,tone,turns,px) (74-anim.js). */
const PK={u:1,lw:1.1,ol:1.15,ink:'#0c0d12',ms:0,n:0,post:null,cv:new Map(),url:new Map(),bdg:new Map(),scr:{}};
const PAINT={};
/* ---- materials: 5-tone ramps [deep, shadow, mid, lit, highlight] ---- */
const PKM={
 steel:['#1b2633','#4a5b6c','#8797a8','#c6d2de','#ffffff'],
 iron:['#15191e','#353e47','#5f6b76','#939fa9','#e4eaee'],
 dark:['#08090c','#1d2128','#353b45','#59616d','#9aa3ad'],
 silver:['#2a3440','#6d7c8c','#b4c0cc','#e6edf3','#ffffff'],
 bronze:['#3a1d08','#7a4418','#b8742e','#e3a65e','#fff0cc'],
 brass:['#3a2808','#86621f','#cfa443','#f2d98a','#fffbe8'],
 gold:['#462a00','#a26800','#e8ad1c','#ffd95a','#fffbe0'],
 wood:['#2a180b','#5c3a1f','#8c5e34','#bd8a52','#e8c28c'],
 darkwood:['#1a0f08','#3d2615','#62402a','#8a6243','#b89270'],
 leather:['#22130a','#4c2b17','#76472a','#a26a3d','#d29a66'],
 cloth:['#360a0e','#7a1a20','#c2342c','#ec6a4e','#ffc0a4'],
 madder:['#360a0e','#7a1a20','#c2342c','#ec6a4e','#ffc0a4'],
 blue:['#0b1a40','#1c3c84','#3166c4','#6aa0ec','#cfe6ff'],
 green:['#0d2a12','#235a26','#3f9440','#7cc864','#d6f6b8'],
 teal:['#062e2a','#16675b','#2fa58e','#7edcc4','#e2fff6'],
 verd:['#0b2b26','#2c6a5d','#58b39c','#9fe0cd','#effffa'],
 purple:['#1c0c34','#43247e','#7546c0','#ab84ec','#efe2ff'],
 bone:['#3e3628','#867a5e','#c9bd98','#ece4c7','#ffffff'],
 vellum:['#3c3626','#8a7f62','#cfc29e','#efe6c8','#fffdf2'],
 canvas:['#3a2f1c','#7d6a45','#c2ab7c','#e6d4a8','#fff6dc'],
 skin:['#3a1e10','#9a6444','#d09a72','#f0c8a0','#fff0de'],
 meat:['#2c0e08','#6e2416','#b04a2c','#de7c4c','#ffc49a'],
 stone:['#1c2024','#454c52','#767e84','#a9b0b4','#e2e6e8'],
 white:['#3a4450','#9aa6b2','#dfe6ec','#f6f9fb','#ffffff'],
 /* gifts and elements */
 mana:['#0a1a52','#1d4aa6','#3c8aee','#8ccfff','#ffffff'],
 aura:['#4a2c00','#a87400','#eebc22','#ffe576','#ffffff'],
 qi:['#03342e','#0b7a68','#25c4a6','#8cf2dc','#ffffff'],
 chi:['#10360c','#327a22','#6cbd3e','#b4ea7c','#ffffff'],
 fire:['#5a0c04','#b42a0a','#ff6418','#ffb12e','#fff6b8'],
 frost:['#0c2c5a','#2a6cb4','#64bcf2','#beeaff','#ffffff'],
 poison:['#173608','#3a7a10','#78c824','#c0ef5c','#f4ffd0'],
 blood:['#360006','#760a14','#c41c26','#f04c52','#ffb4b0'],
 void:['#1a0a34','#46268a','#8656d0','#c49eff','#ffffff'],
 holy:['#4a3a10','#b08a2a','#f2d060','#fff2b0','#ffffff']};
const PK_GIFT={mana:'mana',aura:'aura',qi:'qi',chi:'chi'};
function pkMat(m){return Array.isArray(m)?m:PKM[m]||PKM.steel}
/* ---- shapes: {p:Path2D, b:[x0,y0,x1,y1]} in the current (local) units ---- */
function pkBox(d){const t=String(d).match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g)||[];let i=0,cmd='M',x=0,y=0,sx=0,sy=0;const b=[1e9,1e9,-1e9,-1e9];
 const add=(X,Y)=>{if(X<b[0])b[0]=X;if(Y<b[1])b[1]=Y;if(X>b[2])b[2]=X;if(Y>b[3])b[3]=Y},n=()=>+t[i++];
 while(i<t.length){if(/[a-zA-Z]/.test(t[i])){cmd=t[i++];if(cmd==='Z'||cmd==='z'){x=sx;y=sy;continue}}
  const rel=cmd!==cmd.toUpperCase(),C=cmd.toUpperCase(),ox=rel?x:0,oy=rel?y:0;
  if(C==='M'||C==='L'||C==='T'){x=ox+n();y=oy+n();add(x,y);if(C==='M'){sx=x;sy=y;cmd=rel?'l':'L'}}
  else if(C==='H'){x=ox+n();add(x,y)}else if(C==='V'){y=oy+n();add(x,y)}
  else if(C==='C'){for(let k=0;k<3;k++){const X=ox+n(),Y=oy+n();add(X,Y);if(k===2){x=X;y=Y}}}
  else if(C==='S'||C==='Q'){for(let k=0;k<2;k++){const X=ox+n(),Y=oy+n();add(X,Y);if(k===1){x=X;y=Y}}}
  else if(C==='A'){const rx=n(),ry=n();n();n();n();const X=ox+n(),Y=oy+n();add(x-rx,y-ry);add(x+rx,y+ry);add(X-rx,Y-ry);add(X+rx,Y+ry);x=X;y=Y}
  else i++}
 if(b[0]>b[2])return[0,0,32,32];return b}
const pkS=d=>({p:new Path2D(d),b:pkBox(d),d});                                   // from SVG path data (absolute or relative)
function pkCirc(cx,cy,r){const p=new Path2D();p.arc(cx,cy,r,0,Math.PI*2);return{p,b:[cx-r,cy-r,cx+r,cy+r]}}
function pkEll(cx,cy,rx,ry,rot){const p=new Path2D();p.ellipse(cx,cy,rx,ry,(rot||0)*Math.PI/180,0,Math.PI*2);const r=Math.max(rx,ry);return{p,b:rot?[cx-r,cy-r,cx+r,cy+r]:[cx-rx,cy-ry,cx+rx,cy+ry]}}
function pkRect(x,y,w,h,r){const p=new Path2D();r=Math.min(r||0,w/2,h/2);if(r>0){p.moveTo(x+r,y);p.arcTo(x+w,y,x+w,y+h,r);p.arcTo(x+w,y+h,x,y+h,r);p.arcTo(x,y+h,x,y,r);p.arcTo(x,y,x+w,y,r);p.closePath()}else p.rect(x,y,w,h);return{p,b:[x,y,x+w,y+h]}}
function pkPoly(pts,open){const p=new Path2D();const b=[1e9,1e9,-1e9,-1e9];for(let i=0;i<pts.length;i+=2){const x=pts[i],y=pts[i+1];i?p.lineTo(x,y):p.moveTo(x,y);if(x<b[0])b[0]=x;if(y<b[1])b[1]=y;if(x>b[2])b[2]=x;if(y>b[3])b[3]=y}if(!open)p.closePath();return{p,b}}
function pkU(){const p=new Path2D(),b=[1e9,1e9,-1e9,-1e9];for(const s of arguments){if(!s)continue;p.addPath(s.p);b[0]=Math.min(b[0],s.b[0]);b[1]=Math.min(b[1],s.b[1]);b[2]=Math.max(b[2],s.b[2]);b[3]=Math.max(b[3],s.b[3])}return{p,b}}
/* a tube along a polyline / sampled curve: pts [x,y,...], w = width or [w0,w1] (tapers), caps: 'round' | 'flat' */
function pkTube(pts,w,caps){const n=pts.length>>1,W=i=>Array.isArray(w)?w[0]+(w[1]-w[0])*(n>1?i/(n-1):0):w,L=[],R=[];
 for(let i=0;i<n;i++){const a=Math.max(0,i-1),c=Math.min(n-1,i+1);let dx=pts[c*2]-pts[a*2],dy=pts[c*2+1]-pts[a*2+1];const m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;const h=W(i)/2;
  L.push(pts[i*2]-dy*h,pts[i*2+1]+dx*h);R.push(pts[i*2]+dy*h,pts[i*2+1]-dx*h)}
 const p=new Path2D(),b=[1e9,1e9,-1e9,-1e9],ad=(x,y)=>{if(x<b[0])b[0]=x;if(y<b[1])b[1]=y;if(x>b[2])b[2]=x;if(y>b[3])b[3]=y};
 p.moveTo(L[0],L[1]);ad(L[0],L[1]);for(let i=1;i<n;i++){p.lineTo(L[i*2],L[i*2+1]);ad(L[i*2],L[i*2+1])}
 if(caps==='round'&&W(n-1)>.2){const ex=pts[n*2-2],ey=pts[n*2-1],dx=ex-pts[n*2-4],dy=ey-pts[n*2-3],a=Math.atan2(dy,dx);p.arc(ex,ey,W(n-1)/2,a-Math.PI/2,a+Math.PI/2)}
 for(let i=n-1;i>=0;i--){p.lineTo(R[i*2],R[i*2+1]);ad(R[i*2],R[i*2+1])}
 if(caps==='round'&&W(0)>.2){const dx=pts[2]-pts[0],dy=pts[3]-pts[1],a=Math.atan2(dy,dx);p.arc(pts[0],pts[1],W(0)/2,a+Math.PI/2,a+Math.PI*1.5)}
 p.closePath();return{p,b}}
/* sample curves into a point list for pkTube / pkPoly: quadratic (x0,y0,cx,cy,x1,y1) and arc (cx,cy,r,a0,a1 in degrees, 0 = up, clockwise) */
function pkQ(x0,y0,cx,cy,x1,y1,n){n=n||12;const o=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t;o.push(u*u*x0+2*u*t*cx+t*t*x1,u*u*y0+2*u*t*cy+t*t*y1)}return o}
function pkArc(cx,cy,r,a0,a1,n){n=n||16;const o=[];for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n)*Math.PI/180;o.push(cx+Math.sin(a)*r,cy-Math.cos(a)*r)}return o}
/* ---- light: a global direction (upper left), mapped into the current transform so rotated parts are lit the same way ---- */
function pkVec(g,vx,vy){const m=g.getTransform(),X=vx*PK.u,Y=vy*PK.u,det=m.a*m.d-m.b*m.c||1;return[(m.d*X-m.c*Y)/det,(-m.b*X+m.a*Y)/det]}
const PK_L=[-.62,-.78];
/* ---- the painted fill: gradient body, core shadow crescent (lower right), rim light (upper left), ink line ----
   o: {ball: spherical light, flat: one tone + rims, k: crescent size (units, 1.5), lw: line width (PK.lw; 0 = none), ink,
       inside(g): more painting clipped to the shape before the line, noRim, noShade, rule: 'evenodd', glow} */
function pkFill(g,S,mat,o){o=o||{};const M=pkMat(mat),b=S.b,cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2,L=pkVec(g,PK_L[0],PK_L[1]),lm=Math.hypot(L[0],L[1])||1,lx=L[0]/lm,ly=L[1]/lm,rule=o.rule||'nonzero';
 if(o.flat)g.fillStyle=M[2];
 else if(o.ball){const r=Math.max(b[2]-b[0],b[3]-b[1])/2,gr=g.createRadialGradient(cx+lx*r*.45,cy+ly*r*.45,r*.05,cx,cy,r*1.15);gr.addColorStop(0,M[4]);gr.addColorStop(.22,M[3]);gr.addColorStop(.62,M[2]);gr.addColorStop(1,M[1]);g.fillStyle=gr}
 else{const e=Math.abs(lx)*(b[2]-b[0])/2+Math.abs(ly)*(b[3]-b[1])/2,gr=g.createLinearGradient(cx+lx*e,cy+ly*e,cx-lx*e,cy-ly*e);gr.addColorStop(0,M[3]);gr.addColorStop(.42,M[2]);gr.addColorStop(1,M[1]);g.fillStyle=gr}
 g.fill(S.p,rule);
 g.save();g.clip(S.p,rule);const k=o.k||1.5,band=(sh,col,a)=>{const v=pkVec(g,sh*PK_L[0],sh*PK_L[1]),q=new Path2D();q.rect(b[0]-40,b[1]-40,b[2]-b[0]+80,b[3]-b[1]+80);q.addPath(S.p,new DOMMatrix([1,0,0,1,v[0],v[1]]));g.globalAlpha=a;g.fillStyle=col;g.fill(q,'evenodd')};
 if(!o.noShade){band(k*2.2,M[0],.22);band(k,M[0],.42)}
 if(!o.noRim){band(-k*.75,M[4],.5)}
 g.globalAlpha=1;if(o.inside)o.inside(g,M);g.restore();
 const lw=o.lw===undefined?PK.lw:o.lw;if(lw){g.lineJoin='round';g.lineCap='round';g.lineWidth=lw;g.strokeStyle=o.ink||PK.ink;g.stroke(S.p)}}
/* strokes: ink detail lines and painted highlight / shadow strokes (SVG path data or a shape) */
function pkLine(g,d,w,col,a){g.save();g.globalAlpha=a==null?1:a;g.lineCap='round';g.lineJoin='round';g.lineWidth=w||PK.lw*.9;g.strokeStyle=col||PK.ink;g.stroke(typeof d==='string'?new Path2D(d):d.p||d);g.restore()}
const pkHi=(g,d,w,a,col)=>pkLine(g,d,w||1,col||'#ffffff',a==null?.75:a);
/* a soft specular dot and a 4-point glint (sparkle) */
function pkSpec(g,x,y,r,a){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,'+(a==null?.95:a)+')');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}
function pkGlint(g,x,y,r,col){g.save();g.fillStyle=col||'#ffffff';const p=new Path2D(),t=r*.18;p.moveTo(x,y-r);p.quadraticCurveTo(x+t,y-t,x+r,y);p.quadraticCurveTo(x+t,y+t,x,y+r);p.quadraticCurveTo(x-t,y+t,x-r,y);p.quadraticCurveTo(x-t,y-t,x,y-r);g.fill(p);g.restore()}
function pkGlow(g,x,y,r,col,a){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.save();g.globalAlpha=a==null?.6:a;g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);g.restore()}
/* draws after the outline pass (glows, sparkles that should not get the heavy silhouette line) */
function pkPost(fn){if(PK.post)PK.post.push(fn)}
/* place a part: translate to (x,y), rotate a degrees (0 = the part points up, clockwise), scale s */
function pkAt(g,x,y,a,s,fn){g.save();g.translate(x,y);if(a)g.rotate(a*Math.PI/180);if(s&&s!==1)g.scale(s,s);fn(g);g.restore()}
/* ======== parts (local coordinates: base at 0,0, pointing up -y) ======== */
/* blade: o {len, w, mat, tip:'point'|'leaf'|'round'|'clip', fuller} */
function pkBlade(g,o){const L=o.len||18,w=o.w||3.6,h=w/2,t=o.tip||'point',M=o.mat||'steel';let d;
 if(t==='leaf')d=`M${-h*.8} 0 C${-h*1.4} ${-L*.45} ${-h*1.6} ${-L*.65} 0 ${-L} C${h*1.6} ${-L*.65} ${h*1.4} ${-L*.45} ${h*.8} 0 Z`;
 else if(t==='round')d=`M${-h} 0 L${-h} ${-L+h} A${h} ${h} 0 0 1 ${h} ${-L+h} L${h} 0 Z`;
 else if(t==='clip')d=`M${-h} 0 L${-h} ${-L+w*.3} L${h*.2} ${-L} L${h} ${-L+w*1.6} L${h} 0 Z`;
 else d=`M${-h} 0 L${-h} ${-L+w*1.25} L0 ${-L} L${h} ${-L+w*1.25} L${h} 0 Z`;
 const S=pkS(d);pkFill(g,S,M,{k:1,inside:(g,m)=>{g.fillStyle=m[0];g.globalAlpha=.32;g.fillRect(0,-L-1,h+1,L+2);g.globalAlpha=1;     // the far bevel in shadow
   if(o.fuller!==false&&L>9)pkLine(g,`M0 ${-1} L0 ${-L+w*1.6}`,Math.max(.6,w*.18),m[1],.8);
   pkHi(g,`M${-h*.5} ${-.5} L${-h*.5} ${-L+w*1.4}`,Math.max(.5,w*.16),.7)}})}
function pkGuard(g,o){const w=o.w||9,h=o.h||2.2;pkFill(g,pkRect(-w/2,-h/2,w,h,h/2),o.mat||'brass',{k:.7})}
function pkGrip(g,o){const L=o.len||6,w=o.w||2.2;pkFill(g,pkRect(-w/2,0,w,L,w*.3),o.mat||'leather',{k:.7,inside:g=>{for(let y=1.4;y<L-.4;y+=1.6)pkLine(g,`M${-w/2} ${y+.5} L${w/2} ${y-.5}`,.5,PK.ink,.55)}})}
function pkPommel(g,o){pkFill(g,pkCirc(0,0,o.r||1.7),o.mat||'brass',{ball:1,k:.6})}
/* a whole sword at (x,y) = the guard, angle a: o {len, w, mat, hilt, grip, guard} */
function pkSword(g,x,y,a,o){o=o||{};const L=o.len||18,w=o.w||3.4;pkAt(g,x,y,a,1,g=>{const gl=o.grip||L*.28;pkGrip(g,{len:gl,w:w*.62,mat:o.gripMat});pkAt(g,0,gl+1.3,0,1,g=>pkPommel(g,{r:w*.5,mat:o.hilt}));
  pkBlade(g,{len:L,w,mat:o.mat,tip:o.tip});pkGuard(g,{w:o.guard||w*2.8,h:w*.62,mat:o.hilt})})}
/* haft (wood) from (x0,y0) to (x1,y1), width w; grain lines */
function pkHaft(g,x0,y0,x1,y1,w,mat){const S=pkTube([x0,y0,x1,y1],w||2.2,'round');pkFill(g,S,mat||'wood',{k:.8,inside:(g,m)=>{const dx=x1-x0,dy=y1-y0,l=Math.hypot(dx,dy)||1,nx=-dy/l*(w||2.2)*.18,ny=dx/l*(w||2.2)*.18;
  pkLine(g,`M${x0+dx*.15+nx} ${y0+dy*.15+ny} L${x0+dx*.45+nx} ${y0+dy*.45+ny} M${x0+dx*.6-nx} ${y0+dy*.6-ny} L${x0+dx*.85-nx} ${y0+dy*.85-ny}`,.45,m[0],.5)}})}
/* axe head (local: haft along y, head centred at 0,0, blade to the left); o {s, mat, beard} */
function pkAxeHead(g,o){const s=o.s||1;pkAt(g,0,0,0,s,g=>{const S=pkS('M2 -3 L-2.5 -2.6 Q-6.5 -8 -10.5 -7.5 Q-13 0 -10.5 7.5 Q-6.5 8 -2.5 2.6 L2 3 Z');
  pkFill(g,S,o.mat||'steel',{inside:(g,m)=>{pkLine(g,'M-10.5 -7.5 Q-13 0 -10.5 7.5',2.4,m[4],.55);pkLine(g,'M-8.6 -6.4 Q-10.6 0 -8.6 6.4',.6,m[1],.7)}})})}
/* shield shapes centred on (0,0) of size w x h: 'heater', 'round', 'kite', 'tower', 'buckler' */
function pkShieldShape(kind,w,h){const a=w/2,b=h/2;
 if(kind==='round'||kind==='buckler')return pkEll(0,0,a,b);
 if(kind==='kite')return pkS(`M${-a} ${-b*.62} Q${-a} ${-b} 0 ${-b} Q${a} ${-b} ${a} ${-b*.62} Q${a*.8} ${b*.2} 0 ${b} Q${-a*.8} ${b*.2} ${-a} ${-b*.62} Z`);
 if(kind==='tower')return pkS(`M${-a} ${-b*.8} Q0 ${-b*1.1} ${a} ${-b*.8} L${a} ${b*.75} Q0 ${b*1.08} ${-a} ${b*.75} Z`);
 return pkS(`M${-a} ${-b} L${a} ${-b} L${a} ${-b*.15} Q${a} ${b*.6} 0 ${b} Q${-a} ${b*.6} ${-a} ${-b*.15} Z`)}
/* shield: o {kind, w, h, mat, rim (material or null), boss, emblem(g, w, h)} */
function pkShield(g,x,y,o){pkAt(g,x,y,o.a||0,1,g=>{const w=o.w||20,h=o.h||22,S=pkShieldShape(o.kind||'heater',w,h);
  if(o.rim){pkFill(g,S,o.rim,{k:1.2});const t=o.rimW||1.9,I=pkShieldShape(o.kind||'heater',w-t*2,h-t*2.1);pkAt(g,0,(o.kind==='heater'||!o.kind)?-.2:0,0,1,g=>pkFill(g,I,o.mat||'teal',{lw:PK.lw*.8,inside:o.emblem?g=>o.emblem(g,w,h):null}))}
  else pkFill(g,S,o.mat||'teal',{inside:o.emblem?g=>o.emblem(g,w,h):null});
  if(o.boss)pkFill(g,pkCirc(0,0,o.boss),o.bossMat||'brass',{ball:1,k:.8})})}
/* gem: cut 'diamond' | 'round' | 'long' at (x,y), radius r */
function pkGem(g,x,y,r,mat,cut){const M=pkMat(mat);pkAt(g,x,y,0,1,g=>{let S;
 if(cut==='round'){S=pkCirc(0,0,r);pkFill(g,S,M,{ball:1,k:r*.18,inside:(g,m)=>{pkLine(g,`M${-r*.5} ${-r*.1} L0 ${-r*.55} L${r*.5} ${-r*.1} L0 ${r*.5} Z`,.5,m[4],.35)}});pkSpec(g,-r*.35,-r*.4,r*.4);return}
 const h=cut==='long'?r*1.5:r,w=cut==='long'?r*.72:r;S=pkPoly([0,-h,w,0,0,h,-w,0]);
 pkFill(g,S,M,{k:r*.16,inside:(g,m)=>{g.fillStyle=m[3];g.globalAlpha=.8;g.fill(new Path2D(`M0 ${-h} L${-w} 0 L${-w*.35} 0 Z`));g.fillStyle=m[4];g.globalAlpha=.55;g.fill(new Path2D(`M0 ${-h} L${-w*.35} 0 L0 ${-h*.1} Z`));
  g.fillStyle=m[1];g.globalAlpha=.8;g.fill(new Path2D(`M${w} 0 L0 ${h} L${w*.3} 0 Z`));g.fillStyle=m[0];g.globalAlpha=.35;g.fill(new Path2D(`M0 ${h} L${w*.3} 0 L0 ${h*.15} Z`));g.globalAlpha=1;
  pkLine(g,`M${-w} 0 L${w} 0 M0 ${-h} L0 ${h}`,.4,m[0],.35)}});pkPost(g=>pkGlint(g,x-w*.35,y-h*.45,r*.55))})}
/* flame of height h standing on (x,y); mat: 'fire' | 'frost' | gift colour */
function pkFlame(g,x,y,h,mat){const M=pkMat(mat||'fire');pkAt(g,x,y,0,h/28,g=>{const O=pkS('M0 0 C-8 0 -11 -6 -10 -11 C-9 -15 -6 -17 -6 -21 C-3 -19 -2 -16 -2 -14 C-1 -18 1 -23 0 -28 C5 -24 8 -19 7 -14 C9 -15 10 -17 10 -19 C12 -15 12 -10 10 -6 C8 -2 4 0 0 0 Z');
  pkFill(g,O,[M[0],M[1],M[2],M[2],M[3]],{k:2});
  pkFill(g,pkS('M0 -1.5 C-5 -1.5 -6.5 -5 -6 -8 C-5.5 -11 -3 -12 -2.5 -15 C-.5 -12 .5 -11 1 -13.5 C4 -11 6 -8 5 -5 C4 -2.5 2.5 -1.5 0 -1.5 Z'),[M[2],M[2],M[3],M[3],M[4]],{lw:0,k:1.2,noShade:1});
  pkFill(g,pkS('M0 -2.5 C-2.6 -2.5 -3.2 -4.6 -2.6 -6.4 C-2 -8 -.5 -8.6 0 -10.5 C1.2 -8.6 2.6 -7.4 2.4 -5.4 C2.2 -3.4 1.4 -2.5 0 -2.5 Z'),[M[3],M[3],M[4],M[4],'#ffffff'],{lw:0,noShade:1,noRim:1})})}
/* drop (tear) standing on (x,y) of height h */
const pkDropS=(x,y,h)=>{const s=h/24;return pkS(`M${x} ${y-h} C${x} ${y-h} ${x+8*s} ${y-12*s} ${x+8*s} ${y-7.5*s} C${x+8*s} ${y-3*s} ${x+4.4*s} ${y} ${x} ${y} C${x-4.4*s} ${y} ${x-8*s} ${y-3*s} ${x-8*s} ${y-7.5*s} C${x-8*s} ${y-12*s} ${x} ${y-h} ${x} ${y-h} Z`)};
function pkDrop(g,x,y,h,mat){const s=h/24;pkFill(g,pkDropS(x,y,h),mat||'blood',{k:Math.max(.8,1.6*s)});pkSpec(g,x-3.2*s,y-8.5*s,2.6*s,.9);pkHi(g,`M${x-5.4*s} ${y-9*s} Q${x-4.6*s} ${y-13*s} ${x-2*s} ${y-17*s}`,1.1*s,.6)}
/* skull centred on (x,y), width ~s*20 */
function pkSkull(g,x,y,s,mat){pkAt(g,x,y,0,s||1,g=>{const S=pkS('M0 -11 C7 -11 10.5 -6.5 10.5 -1.5 C10.5 2 9 3.8 7 4.6 L7 8 C7 9.6 5.6 10.6 4 10.6 L-4 10.6 C-5.6 10.6 -7 9.6 -7 8 L-7 4.6 C-9 3.8 -10.5 2 -10.5 -1.5 C-10.5 -6.5 -7 -11 0 -11 Z');
  pkFill(g,S,mat||'bone',{k:1.6,inside:(g,m)=>{pkLine(g,'M-3.3 6.8 L-3.3 10.6 M0 7 L0 10.6 M3.3 6.8 L3.3 10.6',.9,PK.ink,.85);pkLine(g,'M-6.8 -7 Q-4 -9 -1 -9.5',1.2,m[4],.6)}});
  const eye=x=>pkFill(g,pkS(`M${x-3.3} -1 C${x-3.3} -3.6 ${x+3.3} -3.6 ${x+3.3} -.6 C${x+3.3} 2 ${x-3.3} 2.2 ${x-3.3} -1 Z`),'dark',{noRim:1,lw:.6});eye(-4);eye(4);
  pkFill(g,pkS('M0 2.6 L1.6 5.4 L-1.6 5.4 Z'),'dark',{noRim:1,lw:.5})})}
/* flag: pole at x, from y top, o {w, h, mat, pole, wave, tatter} */
function pkFlag(g,x,y,o){o=o||{};const w=o.w||17,h=o.h||11,ph=o.pole||25;
 pkHaft(g,x,y-1,x,y+ph,2.3,o.poleMat||'wood');
 const t=o.tatter,wv=o.wave==null?2:o.wave,x1=x+1,x2=x+w;let d=`M${x1} ${y} C${x1+w*.35} ${y-wv} ${x1+w*.6} ${y+wv} ${x2} ${y+(o.droop||0)}`;
 if(t)d+=` L${x2-2.5} ${y+h*.35+(o.droop||0)} L${x2+.5} ${y+h*.6+(o.droop||0)} L${x2-3} ${y+h*.75+(o.droop||0)} L${x2-1.5} ${y+h+(o.droop||0)*1.4}`;else d+=` L${x2-3.2} ${y+h*.5+(o.droop||0)} L${x2} ${y+h+(o.droop||0)*1.3}`;
 d+=` C${x1+w*.6} ${y+h+wv+(o.droop||0)} ${x1+w*.35} ${y+h-wv} ${x1} ${y+h} Z`;
 pkFill(g,pkS(d),o.mat||'cloth',{inside:(g,m)=>{pkLine(g,`M${x1+w*.42} ${y+1} Q${x1+w*.38} ${y+h*.5} ${x1+w*.45} ${y+h-1}`,1.2,m[1],.5);pkHi(g,`M${x1+w*.2} ${y+1.2} Q${x1+w*.18} ${y+h*.5} ${x1+w*.22} ${y+h-1.5}`,1,.4)}});
 pkFill(g,pkCirc(x,y-1.6,1.9),o.tip||'brass',{ball:1,k:.6})}
/* coin centred on (x,y) radius r; mark(g) draws the stamp */
function pkCoin(g,x,y,r,mat,mark){pkAt(g,x,y,0,1,g=>{pkFill(g,pkCirc(0,0,r),mat||'gold',{k:r*.13,inside:(g,m)=>{g.lineWidth=r*.12;g.strokeStyle=m[1];g.globalAlpha=.9;g.beginPath();g.arc(0,0,r*.78,0,Math.PI*2);g.stroke();g.globalAlpha=1;
   if(mark)mark(g,m,r)}});pkPost(g=>pkGlint(g,x-r*.48,y-r*.5,r*.42))})}
/* arrow from (x0,y0) (fletching) to (x1,y1) (point): o {w, mat, head, fletch} */
function pkArrow(g,x0,y0,x1,y1,o){o=o||{};const a=Math.atan2(x1-x0,-(y1-y0))*180/Math.PI,L=Math.hypot(x1-x0,y1-y0);pkAt(g,x0,y0,a,1,g=>{const w=o.w||1.5,hl=o.head||5;
 pkFill(g,pkRect(-w/2,-L+hl*.6,w,L-hl*.6,w/2),o.shaft||'wood',{k:.5,lw:PK.lw*.85});
 pkFill(g,pkS(`M0 ${-L} L${hl*.55} ${-L+hl*1.05} L0 ${-L+hl*.8} L${-hl*.55} ${-L+hl*1.05} Z`),o.mat||'steel',{k:.6});
 const f=o.fletch||'cloth';pkFill(g,pkS(`M${-w/2} 1 L${-w/2-2.6} 2.8 L${-w/2-2.6} -2 L${-w/2} -4.4 Z`),f,{k:.6,lw:PK.lw*.85});pkFill(g,pkS(`M${w/2} 1 L${w/2+2.6} 2.8 L${w/2+2.6} -2 L${w/2} -4.4 Z`),f,{k:.6,lw:PK.lw*.85})})}
/* star with n points at (x,y), outer radius r */
function pkStarS(x,y,r,n,ri){n=n||5;ri=ri||r*.45;const p=[];for(let i=0;i<n*2;i++){const a=i*Math.PI/n,R=i&1?ri:r;p.push(x+Math.sin(a)*R,y-Math.cos(a)*R)}return pkPoly(p)}
function pkStar(g,x,y,r,mat,n,ri){pkFill(g,pkStarS(x,y,r,n,ri),mat||'gold',{k:r*.12,inside:(g,m)=>{for(let i=0;i<(n||5);i++){const a=i*Math.PI*2/(n||5);pkLine(g,`M${x} ${y} L${x+Math.sin(a)*r*.8} ${y-Math.cos(a)*r*.8}`,.5,i===0||i===(n||5)-1?m[4]:m[1],.5)}}})}
/* 4-point sparkle (a solid star, outlined) */
function pkSparkle(g,x,y,r,mat){const t=r*.22,S=pkS(`M${x} ${y-r} Q${x+t} ${y-t} ${x+r} ${y} Q${x+t} ${y+t} ${x} ${y+r} Q${x-t} ${y+t} ${x-r} ${y} Q${x-t} ${y-t} ${x} ${y-r} Z`);pkFill(g,S,mat||'gold',{k:r*.12})}
/* swirl (spiral tube) centred on (x,y), radius r, turns */
function pkSwirl(g,x,y,r,mat,turns){turns=turns||1.6;const p=[];const n=Math.round(40*turns);for(let i=0;i<=n;i++){const t=i/n,a=t*turns*Math.PI*2,R=r*(1-t*.85);p.push(x+Math.sin(a)*R,y-Math.cos(a)*R)}
 pkFill(g,pkTube(p,[r*.34,r*.1],'round'),mat||'white',{k:.8})}
/* scroll: rolled parchment centred on (x,y), w x h */
function pkScroll(g,x,y,w,h,mat){const a=w/2,b=h/2;pkFill(g,pkRect(x-a+1.5,y-b+1.2,w-3,h-2.4,.6),mat||'vellum',{inside:(g,m)=>{for(let i=0;i<3;i++)pkLine(g,`M${x-a+4} ${y-b+4+i*2.6} L${x+a-4-(i===2?3:0)} ${y-b+4+i*2.6}`,.7,m[1],.8)}});
 const roll=yy=>pkFill(g,pkRect(x-a,yy-1.6,w,3.2,1.6),mat||'vellum',{k:.6});roll(y-b+1.2);roll(y+b-1.2)}
/* a slash / swoosh arc (cut trail): centre (cx,cy), radius r, from a0 to a1 degrees (0 = up, clockwise), width w, colour */
function pkSwoosh(g,cx,cy,r,a0,a1,w,mat,o){o=o||{};const pts=pkArc(cx,cy,r,a0,a1,24),S=pkTube(pts,[.2,w],'round');pkFill(g,S,mat||'white',{k:w*.25,lw:o.lw==null?PK.lw*.8:o.lw,noRim:1})}
/* rounded square badge (statuses, traits): tone 'good' | 'bad' | 'neutral' | material; fills the 32 units */
const PK_TONE={good:'verd',bad:'blood',neutral:'brass',buff:'verd',debuff:'blood'};
function pkBadgeBack(g,tone,o){o=o||{};const M=pkMat(PK_TONE[tone]||tone||'brass'),x=o.x||1.2,w=o.w||29.6,r=o.r||6;
 g.fillStyle=PK.ink;g.fill(pkRect(x-.6,x-.6,w+1.2,w+1.2,r+.6).p);
 const F=pkRect(x,x,w,w,r),gr=g.createLinearGradient(x,x,x+w,x+w);gr.addColorStop(0,M[3]);gr.addColorStop(.5,M[2]);gr.addColorStop(1,M[1]);g.fillStyle=gr;g.fill(F.p);
 const t=o.t||2.6,I=pkRect(x+t,x+t,w-t*2,w-t*2,Math.max(1,r-t*.8)),bg=g.createLinearGradient(0,x+t,0,x+w-t);bg.addColorStop(0,o.bg0||'#2a323c');bg.addColorStop(1,o.bg1||'#0e1217');
 g.fillStyle=PK.ink;g.fill(pkRect(x+t-.7,x+t-.7,w-t*2+1.4,w-t*2+1.4,Math.max(1,r-t*.8)+.7).p);g.fillStyle=bg;g.fill(I.p);
 g.save();g.clip(I.p);g.globalAlpha=.18;g.fillStyle=M[2];g.fill(pkEll(x+w/2,x+t,w*.45,w*.25).p);g.restore();
 pkLine(g,`M${x+r*.6} ${x+.9} L${x+w-r} ${x+.9}`,.8,M[4],.6)}
/* ======== render pipeline ======== */
function pkPx(){const d=typeof window==='object'&&window.devicePixelRatio||1;return d>=2.5?160:d>=1.5?128:96}
function pkScratch(k,px){let c=PK.scr[k];if(!c||c.width!==px){c=PK.scr[k]=pxCanvas(px,px)}else c.getContext('2d').clearRect(0,0,px,px);return c}
/* paint PAINT[name] (or a drawing function) at px x px: the drawing, then the outer silhouette line under it, then post effects */
function pkRender(f,px,noOutline){if(typeof document==='undefined')return null;const t0=typeof performance==='object'?performance.now():0;
 const L=pkScratch('l',px);if(!L)return null;const q=L.getContext('2d');q.setTransform(px/32,0,0,px/32,0,0);PK.u=px/32;PK.post=[];
 try{f(q,px)}catch(e){PK.post=null;return null}
 const out=pxCanvas(px,px),o=out.getContext('2d');
 if(!noOutline){const S=pkScratch('s',px),s=S.getContext('2d');s.globalCompositeOperation='source-over';s.drawImage(L,0,0);s.globalCompositeOperation='source-in';s.fillStyle=PK.ink;s.fillRect(0,0,px,px);s.globalCompositeOperation='source-over';
  const r=PK.ol*px/32;for(let i=0;i<16;i++){const a=i*Math.PI/8;o.drawImage(S,Math.cos(a)*r+r*.12,Math.sin(a)*r+r*.2)}}
 o.drawImage(L,0,0);
 if(PK.post.length){o.setTransform(px/32,0,0,px/32,0,0);for(const fn of PK.post){try{fn(o)}catch(e){}}o.setTransform(1,0,0,1,0,0)}
 PK.post=null;if(t0)PK.ms+=performance.now()-t0;PK.n++;return out}
const pkHas=n=>Object.prototype.hasOwnProperty.call(PAINT,n)&&typeof PAINT[n]==='function';
/* data URL of a painted icon (resolved name), '' when it has none */
function pkURL(n){let u=PK.url.get(n);if(u!==undefined)return u;u='';if(pkHas(n)){const c=pkRender(PAINT[n],pkPx());try{if(c)u=c.toDataURL()}catch(e){u=''}}PK.url.set(n,u);return u}
/* canvas of a painted icon at px device pixels (for canvas users); null when Detail is Low or the icon has no painting */
function pkCanvas(name,px){if(!hdArt())return null;let n=String(name);try{n=icResolve(name)}catch(e){}if(!pkHas(n))return null;px=Math.max(8,px|0||64);const id=n+'@'+px;
 let c=PK.cv.get(id);if(c!==undefined)return c;c=pkRender(PAINT[n],px);PK.cv.set(id,c);return c}
/* ---- status squares over units: a rounded square framed by tone (good / bad / neutral), dark inside, the painted glyph
   (or the existing HD pixel icon when there is no painting yet), and the turns left in the corner. px = device pixels ---- */
function pkBadgeCanvas(id,tone,turns,N){N=Math.max(10,N|0);turns=turns>0&&turns<10?turns|0:0;const k=id+'|'+tone+'|'+turns+'|'+N;let c=PK.bdg.get(k);if(c!==undefined)return c;
 c=pxCanvas(N,N);if(!c){PK.bdg.set(k,null);return null}const q=c.getContext('2d');q.setTransform(N/32,0,0,N/32,0,0);PK.u=N/32;pkBadgeBack(q,tone,{t:2.4,r:7});
 let n='none';try{n=icResolve(id)}catch(e){}const gp=Math.round(N*.8),gx=(N-gp)/2,gy=(N-gp)/2;q.setTransform(1,0,0,1,0,0);
 if(pkHas(n)){const gl=pkCanvas(n,gp);if(gl){q.imageSmoothingEnabled=true;q.drawImage(gl,gx,gy)}}
 else{const r=typeof iconHdCanvas==='function'?iconHdCanvas(n):null,src=r||(typeof iconRows==='function'&&iconRows(id)?px(iconRows(id)):null);   // the HD pixel icon until this status gets a painting
  if(src){q.save();q.beginPath();q.rect(N*.1,N*.1,N*.8,N*.8);q.clip();q.imageSmoothingEnabled=gp<src.width;const s=Math.round(N*.74);q.drawImage(src,Math.round((N-s)/2),Math.round((N-s)/2),s,s);q.restore()}}
 if(turns){const fs=Math.max(7,Math.round(N*.42));q.font='800 '+fs+'N system-ui,-apple-system,"Segoe UI",sans-serif';q.textAlign='right';q.textBaseline='alphabetic';const tx=N-N*.07,ty=N-N*.06;
  q.lineJoin='round';q.lineWidth=Math.max(2,fs*.3);q.strokeStyle=PK.ink;q.strokeText(String(turns),tx,ty);q.fillStyle='#ffffff';q.fillText(String(turns),tx,ty)}
 if(PK.bdg.size>400)PK.bdg.clear();PK.bdg.set(k,c);return c}
onArtChange(()=>{PK.cv.clear();PK.bdg.clear()});

/* ================= REFERENCE ICONS (phase 1) ================= */
const pkP=PAINT;
/* ---- HUD stats ---- */
const PK_HEART='M16 28 C6.5 21.5 2.5 15.5 2.5 10.5 C2.5 6.2 5.6 3.2 9.4 3.2 C12.4 3.2 14.6 5 16 7.6 C17.4 5 19.6 3.2 22.6 3.2 C26.4 3.2 29.5 6.2 29.5 10.5 C29.5 15.5 25.5 21.5 16 28 Z';
pkP.hp=g=>{pkFill(g,pkS(PK_HEART),'blood',{k:2,inside:(g,m)=>{pkHi(g,'M6 9.5 Q6.4 6.6 9.2 6.2',2.2,.85)}});pkPost(g=>pkGlint(g,8.6,7.6,2.6))};
const pkHelmGreat=(g,mat,band)=>{const S=pkS('M5 26 L5 10 C5 5 9.5 2.5 16 2.5 C22.5 2.5 27 5 27 10 L27 26 C23 28.5 9 28.5 5 26 Z');
 pkFill(g,S,mat||'steel',{k:2,inside:(g,m)=>{g.fillStyle=pkMat(band||'brass')[2];pkFill(g,pkRect(3,9,26,4,0),band||'brass',{k:.8,lw:PK.lw});pkFill(g,pkRect(14.4,13,3.2,14.5,0),band||'brass',{k:.6,lw:PK.lw});
   g.fillStyle=PK.ink;g.fill(pkRect(6.5,15,6.5,2.2,1).p);g.fill(pkRect(19,15,6.5,2.2,1).p);for(const x of [8,10.5,21.5,24])g.fill(pkCirc(x,21.5,.75).p);pkHi(g,'M8 6.5 Q11 4.4 15 4.2',1.5,.7)}})};
pkP.armor=g=>pkHelmGreat(g,'steel','brass');
pkP.helmet=g=>{const S=pkS('M3.5 21 C3.5 10 9 4 16 4 C23 4 28.5 10 28.5 21 L28.5 24.5 C24 27.5 8 27.5 3.5 24.5 Z');
 pkFill(g,S,'steel',{k:2,inside:(g,m)=>{pkFill(g,pkS('M7 15 L25 15 L25 22.5 C21 24.5 11 24.5 7 22.5 Z'),'dark',{k:.8,noRim:1,lw:PK.lw});
   for(const x of [10.5,14,18,21.5])pkFill(g,pkRect(x-.8,15,1.6,8.5,0),'steel',{k:.3,lw:.6,noShade:1});pkFill(g,pkRect(2,13.2,28,3,1.4),'steel',{k:.6});pkHi(g,'M7.5 11 Q10 6.5 15 6',1.6,.75);pkLine(g,'M16 4 L16 13',1,m[1],.7)}})};
pkP.fatigue=g=>{pkDrop(g,16,29,26,'white');pkLine(g,'M11.5 21 Q13 24.5 17 24.6',1.1,PKM.white[1],.9)};
pkP.init=g=>{pkFill(g,pkRect(13.5,1.5,5,3.6,1),'brass',{k:.5});pkFill(g,pkCirc(16,18,12.6),'brass',{k:1.6});
 pkFill(g,pkCirc(16,18,9.6),'vellum',{k:1.4,noRim:1,inside:(g,m)=>{for(let i=0;i<12;i++){const a=i*Math.PI/6,r0=i%3?7.8:6.8;pkLine(g,`M${16+Math.sin(a)*r0} ${18-Math.cos(a)*r0} L${16+Math.sin(a)*8.7} ${18-Math.cos(a)*8.7}`,i%3?.6:1,PK.ink,.8)}}});
 pkLine(g,'M16 18 L16 11 M16 18 L20.5 20.5',1.8,PK.ink);pkFill(g,pkCirc(16,18,1.5),'blood',{k:.4,lw:.6});pkPost(g=>pkGlint(g,9.5,11.5,2.4))};
pkP.melee=g=>pkSword(g,16,22,0,{len:19,w:4.2,guard:12});
pkP.ranged=g=>pkArrow(g,6.5,26,26.5,5.5,{w:1.9,head:6.5});
const pkHeaterCross=(g,mat,crossMat)=>pkShield(g,16,16,{kind:'heater',w:24,h:27,mat:mat||'teal',rim:'silver',emblem:g=>{pkFill(g,pkS('M-1.7 -9 L1.7 -9 L1.7 -4 L6 -4 L6 -.8 L1.7 -.8 L1.7 8.5 L-1.7 8.5 L-1.7 -.8 L-6 -.8 L-6 -4 L-1.7 -4 Z'),crossMat||'white',{k:.6,lw:PK.lw*.8})}});
pkP.mdef=g=>pkHeaterCross(g);
pkP.rdef=g=>{pkShield(g,14.5,16.5,{kind:'heater',w:23,h:26,mat:'teal',rim:'silver'});pkArrow(g,4.5,29,27,4,{w:1.8,head:6,fletch:'cloth'})};
pkP.ap=g=>{pkGem(g,16,16,13.5,'aura');};
pkP.xp=g=>{pkSparkle(g,16,16,14,'gold');pkSpec(g,13.5,13,3.6,.9);pkPost(g=>{pkGlint(g,26,6,3.2);pkGlint(g,6.5,25.5,2.2)})};
/* morale: a flag on a pole; steadier = fuller flag. 0 is a fleeing figure */
pkP['morale-4']=g=>{pkFlag(g,6,4,{w:22,h:14,mat:'gold',pole:24,wave:2.6});pkPost(g=>pkGlint(g,22,8,2.6))};
pkP['morale-3']=g=>pkFlag(g,6,4.5,{w:20,h:13,mat:'teal',pole:24});
pkP['morale-2']=g=>pkFlag(g,6,5,{w:18,h:11,mat:'brass',pole:24,wave:1,droop:3,tatter:1});
pkP['morale-1']=g=>pkFlag(g,6,5,{w:17,h:11,mat:'fire',pole:24,wave:2.4,droop:1.5,tatter:1});
pkP['morale-0']=g=>{const B=(d,m,w)=>pkFill(g,pkTube(d,w,'round'),m,{k:.6});
 B([14,15,9.5,21.5,6,23],'cloth',3.2);B([14,15,17,21.5,14.5,27.5],'cloth',3.2);           // legs
 B([17.5,8,13.5,15.5],'madder',5.6);                                                    // body
 B([16.5,10,21.5,12.5,24.5,10],'skin',2.4);B([16,10,11,12.8,8.5,11],'skin',2.4);
 pkFill(g,pkCirc(19.5,5.2,3.3),'skin',{ball:1,k:.6});pkLine(g,'M23 16 L28.5 16 M24 20 L29 20 M22 24 L27 24',1.4,'#ffffff',.85)};
/* gifts */
pkP.mana=g=>pkGem(g,16,16,13,'mana','long');
pkP.aura=g=>{pkFill(g,pkS('M4 26 L3.5 11 L10 17 L16 4 L22 17 L28.5 11 L28 26 Z'),'aura',{k:1.6,inside:(g,m)=>{pkFill(g,pkRect(3,21.5,26,4.5,1),'aura',{k:.6})}});pkGem(g,16,23.8,2.2,'blood','round');pkPost(g=>{pkGlint(g,16,4.5,3);pkGlint(g,3.8,11.2,2);pkGlint(g,28.2,11.2,2)})};
pkP.qi=g=>{pkFill(g,pkS('M16 3 C24 3 29.5 9 29.5 16 C29.5 23.5 23.5 29 16.5 29 C9.5 29 4.5 24 4.5 18 C4.5 13 8.5 10 12.5 10.5 C16.5 11 18.5 14 18 17 C17.6 19.5 15 20.5 13.5 19.5 C15.5 18 14.5 14.6 11.6 15 C9 15.4 8 18.6 9.6 21.6 C11.5 25 16.5 25.8 20.5 23.6 C24.5 21.2 25.6 15.6 23.4 11.4 C21.4 7.6 17 5.6 12 6.6 C13.2 4.4 14.6 3 16 3 Z'),'qi',{k:1.5})};
pkP.chi=g=>{const leaf=(a,s,m)=>pkAt(g,16,27,a,s,g=>pkFill(g,pkS('M0 0 C-6 -6 -6 -14 0 -21 C6 -14 6 -6 0 0 Z'),m,{k:1.2,inside:(g,mm)=>pkLine(g,'M0 -1 L0 -17',.8,mm[1],.9)}));
 leaf(-52,.82,'chi');leaf(52,.82,'chi');leaf(0,1.05,'chi')};
/* ---- UI ---- */
pkP.coin=g=>pkCoin(g,16,16,13,'gold',(g,m,r)=>{pkFill(g,pkPoly([0,-r*.48,r*.48,0,0,r*.48,-r*.48,0]),'gold',{k:.8,lw:PK.lw*.8,inside:(g,mm)=>{g.fillStyle=mm[1];g.globalAlpha=.6;g.fill(new Path2D(`M0 ${r*.48} L${r*.48} 0 L0 0 Z`))}})});
pkP.food=g=>{pkFill(g,pkTube([21.5,10.5,27,5],2.8,'round'),'bone',{k:.5});pkFill(g,pkCirc(27,4,2.4),'bone',{ball:1,k:.5});pkFill(g,pkCirc(28.3,6.4,2.2),'bone',{ball:1,k:.5});
 pkFill(g,pkS('M22.5 10 C25 15 23 22.5 16 26.5 C10 30 3.5 27.5 3.5 21.5 C3.5 15 10 10.5 16 9.5 C18.5 9 21 8.5 22.5 10 Z'),'meat',{k:2,inside:(g,m)=>{pkHi(g,'M8 18 Q11 13.5 16.5 12.4',1.8,.55);pkLine(g,'M10 24.5 Q15 24 19 19.5',1,m[0],.5)}})};
pkP.tools=g=>{pkFill(g,pkS('M3 20 L23 20 C23 22 25 22.5 29 22.5 L29 24.5 L22 24.5 L21 26.5 L23.5 29 L8.5 29 L11 26.5 L10 24.5 C6 24.5 4 23 3 20 Z'),'iron',{k:1.4});
 pkAt(g,16,17,-40,1,g=>{pkHaft(g,0,0,0,-14,2.4,'wood');pkFill(g,pkRect(-6,-17.5,12,5,1),'steel',{k:1,inside:(g,m)=>pkHi(g,'M-4.5 -16.4 L4 -16.4',1,.6)})})};
pkP.camp=g=>{pkFill(g,pkS('M16 4 L29.5 27 L2.5 27 Z'),'canvas',{k:1.6,inside:(g,m)=>{pkLine(g,'M16 6 L10 27 M16 6 L22 27',.8,m[1],.8)}});
 pkFill(g,pkS('M16 12 L20.5 27 L11.5 27 Z'),'darkwood',{k:.8,noRim:1});pkLine(g,'M16 4 L13 1.5 M16 4 L19 1.5',1.4,PKM.wood[1]);pkLine(g,'M1.5 27.5 L30.5 27.5',1.6,PK.ink)};
pkP.settings=g=>{const n=8,p=[];for(let i=0;i<n*4;i++){const a=(i/(n*4))*Math.PI*2-Math.PI/(n*4)*1.5,R=(i%4===0||i%4===1)?14:10.6;p.push(16+Math.sin(a)*R,16-Math.cos(a)*R)}
 const S=pkPoly(p),h=new Path2D(S.p);h.arc(16,16,4.6,0,Math.PI*2,true);pkFill(g,{p:h,b:S.b},'steel',{k:1.6,rule:'evenodd',inside:(g,m)=>{g.lineWidth=1;g.strokeStyle=m[1];g.beginPath();g.arc(16,16,7.6,0,Math.PI*2);g.stroke()}})};
pkP.endturn=g=>{const plate=y=>pkFill(g,pkRect(5,y,22,3.4,1.2),'brass',{k:.7});
 pkFill(g,pkS('M8 6 L24 6 C24 11 19 13.5 17.6 16 C19 18.5 24 21 24 26 L8 26 C8 21 13 18.5 14.4 16 C13 13.5 8 11 8 6 Z'),'frost',{k:1.2,inside:(g,m)=>{
   pkFill(g,pkS('M10.6 9.5 L21.4 9.5 C20 12 17.4 13.5 16 15.6 C14.6 13.5 12 12 10.6 9.5 Z'),'canvas',{lw:0,k:.6,noRim:1});pkFill(g,pkS('M16 17 L16.6 21 C19 21.8 22 23 22.8 26 L9.2 26 C10 23 13 21.8 15.4 21 Z'),'canvas',{lw:0,k:.6,noRim:1});
   pkHi(g,'M10.5 7.5 Q11 10 13.5 12',1.1,.7)}});pkLine(g,'M16 16 L16 21',.8,PKM.canvas[2]);
 pkFill(g,pkRect(5.5,5,2.2,22,1),'wood',{k:.4});pkFill(g,pkRect(24.3,5,2.2,22,1),'wood',{k:.4});plate(2.5);plate(26)};
pkP.swap=g=>{pkFill(g,pkS('M3 8 L19 8 L19 3.5 L28.5 11 L19 18.5 L19 14 L3 14 Z'),'gold',{k:1});pkFill(g,pkS('M29 18 L13 18 L13 13.5 L3.5 21 L13 28.5 L13 24 L29 24 Z'),'white',{k:1})};
pkP.close=g=>{pkFill(g,pkU(pkTube([6,6,26,26],5.4,'round'),pkTube([26,6,6,26],5.4,'round')),'gold',{k:1.2})};
pkP.check=g=>{pkFill(g,pkS('M2.5 16.5 L7 12 L12.5 17.5 L25 5 L29.5 9.5 L12.5 26.5 Z'),'teal',{k:1.3})};
pkP.star=g=>{pkStar(g,16,17,14.5,'gold',5,6.4);pkPost(g=>pkGlint(g,11,10,2.6))};
pkP.skull=g=>pkSkull(g,16,16.5,1.3,'bone');
/* ---- weapons (diagonal, point to the upper right, like the pixel set) ---- */
pkP.sword=g=>pkSword(g,11.5,20.5,45,{len:19,w:3.6,guard:10.5});
pkP.dagger=g=>pkSword(g,13,19,45,{len:12,w:3.6,guard:9,grip:5});
pkP.axe=g=>{pkHaft(g,5,28,21.5,7.5,2.6,'wood');pkAt(g,22,8.5,38,1,g=>pkAxeHead(g,{s:1.02}))};
pkP.mace=g=>{pkHaft(g,5,28,19,11,2.6,'wood');pkFill(g,pkRect(-1.8,-1.3,3.6,2.6,.6),'brass');
 const p=[];for(let i=0;i<16;i++){const a=i*Math.PI/8,R=i&1?5.6:8.6;p.push(22+Math.sin(a)*R,9-Math.cos(a)*R)}pkFill(g,pkPoly(p),'steel',{k:1.2});pkFill(g,pkCirc(22,9,5.2),'steel',{ball:1,k:1,lw:PK.lw*.8})};
pkP.spear=g=>{pkHaft(g,4.5,28.5,20,12,2.2,'wood');pkFill(g,pkRect(-1.5,-1.5,3,3,.5),'brass');pkAt(g,19.5,12.5,45,1,g=>{pkFill(g,pkRect(-1.6,-1,3.2,3.4,.6),'brass',{k:.5});pkBlade(g,{len:13,w:5.6,tip:'leaf',fuller:true})})};
pkP.bow=g=>{const limb=pkTube(pkQ(9,3,27,16,9,29,20).concat([]),[2.2,2.2],'round');pkLine(g,'M9.4 3.4 L9.4 28.6',1,'#efe6c8');
 pkFill(g,pkTube(pkQ(9,2.8,26.5,16,9,29.2,24),[2,3.4].length?2.6:2.6,'round'),'wood',{k:.8});pkFill(g,pkRect(14,13.5,3.6,5,1),'leather',{k:.5})};
pkP['w-xbow']=g=>{pkLine(g,'M5.5 9 L16 19.5 L22.5 26',.9,'#efe6c8');
 pkFill(g,pkTube(pkQ(4,10.5,12,4,21,4.5,14),2.6,'round'),'wood',{k:.7});pkFill(g,pkTube(pkQ(21.5,4,27.5,12,21.5,21,14),2.6,'round'),'wood',{k:.7});
 pkFill(g,pkTube([5.5,26.5,24,8],3.6,'round'),'darkwood',{k:1});pkFill(g,pkRect(-1.8,-1.8,3.6,3.6,.6),'steel');pkAt(g,14.8,17.2,45,1,g=>pkFill(g,pkRect(-2.2,-2,4.4,4,1),'steel',{k:.6}));
 pkFill(g,pkTube([4,28,8.5,23.5],4,'round'),'leather',{k:.6})};
pkP.staff=g=>{pkHaft(g,5,28.5,21.5,11,2.6,'wood');pkFill(g,pkTube([21.5,11,24,8.5],2.2,'round'),'brass',{k:.5});pkGlow(g,25,7,8,'#8ccfff',.55);pkGem(g,25,7,4.4,'mana','round');pkPost(g=>pkGlint(g,26,3,2))};
pkP.shield=g=>pkShield(g,16,16,{kind:'round',w:27,h:27,mat:'wood',rim:'iron',rimW:2.2,boss:4.6,emblem:g=>{pkLine(g,'M-11 -3 L11 -3 M-11 3.4 L11 3.4',.8,PKM.wood[0],.6)}});
/* ---- abilities ---- */
pkP['ab-attack']=g=>{pkSwoosh(g,14,19,12,-60,70,4,'mana');pkSword(g,11,21,45,{len:17,w:3.4,guard:9.5})};
pkP['ab-slash']=g=>{pkSword(g,12,20.5,45,{len:17,w:3.4,guard:9.5});pkSwoosh(g,6,30,22,15,85,4.6,'blood')};
pkP['ab-fireball']=g=>{pkAt(g,0,0,0,1,g=>{pkFill(g,pkS('M17 15 C12 12 8 8 3 5 C8 5.5 9 4 7 2 C13 4 17 6 22 9 Z'),'fire',{k:.8,lw:PK.lw*.8});pkFill(g,pkS('M15 21 C10 21 5 22 2 24 C4 20 3 18.5 1.5 17 C7 16.6 11 16 16 15 Z'),'fire',{k:.8,lw:PK.lw*.8})});
 pkGlow(g,20,18,12,'#ffb12e',.6);pkFill(g,pkCirc(20,18,8.6),'fire',{ball:1,k:1.4});pkFill(g,pkCirc(19,17,4.6),[ '#ffb12e','#ffb12e','#ffe07a','#fff6b8','#ffffff'],{ball:1,lw:0,noShade:1,noRim:1})};
pkP['ab-bash']=g=>{pkShield(g,13,17,{kind:'heater',w:19,h:22,mat:'teal',rim:'silver',emblem:g=>pkFill(g,pkS('M-1.4 -7 L1.4 -7 L1.4 -3.4 L5 -3.4 L5 -.6 L1.4 -.6 L1.4 6.5 L-1.4 6.5 L-1.4 -.6 L-5 -.6 L-5 -3.4 L-1.4 -3.4 Z'),'white',{k:.5,lw:PK.lw*.8})});
 pkFill(g,pkStarS(25,8.5,7,8,3),'aura',{k:.6});pkPost(g=>pkGlint(g,25,8.5,2.6))};
pkP['ab-bandage']=g=>{pkFill(g,pkTube(pkQ(19,20,20,28,5,27.5,12),[5,4.2],'flat'),'vellum',{k:.8,inside:(g,m)=>pkLine(g,'M13 25 L12.5 29 M9 25 L8.5 29',.6,m[1],.8)});
 pkFill(g,pkEll(20,13,8.2,9,0),'vellum',{k:1.6,inside:(g,m)=>{pkFill(g,pkPoly([15.5,10,18.5,7,21.5,10,24.5,13,21.5,16,18.5,19,15.5,16,12.5,13].slice(0,0).concat([18.6,10.4,21.4,10.4,21.4,7.8,18.6,7.8])),'blood',{lw:0});}});
 pkFill(g,pkEll(21,12,3.4,3.8,0),'canvas',{k:.6,noRim:1,inside:(g,m)=>{g.lineWidth=.7;g.strokeStyle=m[1];g.beginPath();g.arc(21,12,1.8,0,Math.PI*2);g.stroke()}});
 pkFill(g,pkS('M9.4 6.6 L12.6 6.6 L12.6 9.4 L15.4 9.4 L15.4 12.6 L12.6 12.6 L12.6 15.4 L9.4 15.4 L9.4 12.6 L6.6 12.6 L6.6 9.4 L9.4 9.4 Z'),'blood',{k:.6,lw:PK.lw*.8})};
/* ---- statuses ---- */
pkP.bleed=g=>{pkDrop(g,16,20,17,'blood');pkDrop(g,7.5,29,11,'blood');pkDrop(g,24.5,30,11,'blood')};
pkP.burn=g=>{pkGlow(g,16,19,14,'#ff8a3c',.5);pkFlame(g,16,30,28,'fire')};
pkP.chill=g=>{pkGlow(g,16,16,15,'#8fd8ff',.45);const arms=[];for(let i=0;i<6;i++)pkAt(g,16,16,i*60,1,g=>arms.push(g.getTransform()));
 const S=[];for(let i=0;i<6;i++){const a=i*60;const r=(x,y)=>{const t=a*Math.PI/180;return[16+x*Math.cos(t)-y*Math.sin(t),16+x*Math.sin(t)+y*Math.cos(t)]};
  const A=r(0,-1),B=r(0,-13.5),C=r(0,-8),D=r(-4,-11.5),E=r(4,-11.5);S.push(pkTube([A[0],A[1],B[0],B[1]],2.4,'round'),pkTube([C[0],C[1],D[0],D[1]],1.9,'round'),pkTube([C[0],C[1],E[0],E[1]],1.9,'round'))}
 pkFill(g,pkU.apply(null,S),'frost',{k:.9});pkFill(g,pkPoly([16,12.5,19,14.2,19,17.8,16,19.5,13,17.8,13,14.2]),'white',{k:.6,lw:PK.lw*.8})};
pkP.poisoned=g=>{pkDrop(g,16,29,26,'poison');g.fillStyle=PK.ink;g.fill(pkEll(12.6,19,1.5,2.2).p);g.fill(pkEll(19.4,19,1.5,2.2).p);pkLine(g,'M13 24.2 Q16 22.6 19 24.2',1,PK.ink)};
pkP['ab-poison']=g=>{pkSword(g,12.5,19.5,45,{len:15,w:3.4,guard:9});pkDrop(g,21,30,9,'poison');pkDrop(g,27.5,25,6.5,'poison')};
pkP.stun=g=>{pkFill(g,pkEll(16,20,12.5,5),'aura',{k:.8,rule:'evenodd',lw:0,flat:1,noShade:1});const R=new Path2D();R.ellipse(16,20,12.5,5,0,0,Math.PI*2);R.ellipse(16,20,9.5,3.2,0,0,Math.PI*2);
 pkFill(g,{p:R,b:[3.5,15,28.5,25]},'aura',{rule:'evenodd',k:.6});pkStar(g,8,12,5.5,'gold',5,2.4);pkStar(g,24,9,6.5,'gold',5,2.8);pkStar(g,17,24,4.4,'gold',5,2)};
pkP.daze=g=>{pkSwirl(g,16,16,13.5,'white',2.2);pkPost(g=>pkGlint(g,26.5,5.5,2.4))};
/* ---- items ---- */
pkP['it-mail']=g=>{const S=pkS('M9 3.5 L13 3.5 Q16 6.5 19 3.5 L23 3.5 L29.5 9 L27 16 L24.5 14.5 L24.5 28.5 L7.5 28.5 L7.5 14.5 L5 16 L2.5 9 Z');
 pkFill(g,S,'iron',{k:1.8,inside:(g,m)=>{g.lineWidth=.55;for(let y=5;y<29;y+=2.2)for(let x=3+((y/2.2|0)&1)*1.1;x<29;x+=2.2){g.strokeStyle=m[0];g.globalAlpha=.55;g.beginPath();g.arc(x,y,.85,0,Math.PI*2);g.stroke();g.strokeStyle=m[4];g.globalAlpha=.35;g.beginPath();g.arc(x-.2,y-.2,.85,Math.PI,Math.PI*1.5);g.stroke()}g.globalAlpha=1;
   pkFill(g,pkRect(7.5,24.5,17,4,0),'leather',{k:.6,lw:PK.lw*.8});pkFill(g,pkRect(14.2,24.8,3.6,3.4,.6),'brass',{k:.4,lw:.6})}})};
pkP['it-greathelm']=g=>{pkFill(g,pkS('M17 4 C19 -1 27 0 29.5 4 C26.5 3 22.5 4 20 7 Z'),'cloth',{k:.8});pkAt(g,1,2,0,.94,g=>pkHelmGreat(g,'steel','brass'))};
pkP['it-longbow']=g=>{pkLine(g,'M7.4 2 L7.4 30',.9,'#efe6c8');pkFill(g,pkTube(pkQ(7,1.5,24,16,7,30.5,24),2.4,'round'),'wood',{k:.7});pkFill(g,pkRect(14.4,13.5,3.2,5,1),'leather',{k:.5});
 pkArrow(g,4,22.5,27,9,{w:1.4,head:4.8})};
/* ---- a trade good, a mastery, a trait ---- */
pkP['tg-ore']=g=>{pkFill(g,pkS('M3 26 L6 17 L13 14 L18 18 L17 27 Z'),'stone',{k:1.4});pkFill(g,pkS('M14 27 L16 15 L23 11 L29.5 17 L28.5 27 Z'),'stone',{k:1.4,inside:g=>{pkGem(g,22,19,3,'gold');}});pkGem(g,9.5,21,2.4,'gold');pkPost(g=>pkGlint(g,23,16,2))};
pkP['m-vanguard']=g=>{pkFill(g,pkCirc(16,16,14.5),'brass',{k:1.6});pkFill(g,pkCirc(16,16,10.8),'dark',{k:1,noRim:1});pkSword(g,16,20,0,{len:13,w:3.4,guard:9,grip:4})};
pkP['trait-brave']=g=>{pkBadgeBack(g,'good');pkAt(g,16,16.5,0,.66,g=>{g.translate(-16,-16);pkFill(g,pkS(PK_HEART),'blood',{k:2.4,inside:()=>pkHi(g,'M6 9.5 Q6.4 6.6 9.2 6.2',2.4,.8)})})};
pkP['trait-craven']=g=>{pkBadgeBack(g,'bad');pkAt(g,16,16,0,.7,g=>{g.translate(-16,-16);pkFlag(g,8,6,{w:17,h:11,mat:'white',pole:22,wave:1.2,droop:2.5})})};
