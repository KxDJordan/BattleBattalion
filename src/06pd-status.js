/* ================= PAINTED ICONS, package D: statuses, status squares, trade goods, monster parts, quarry, crises =================
   Adds PAINT entries only (style and kit: 06p-iconspaint.js, docs/icons-paint-guide.md). Status glyphs are one bold shape in one
   colour so they still read inside the tiny squares over units (8 art px, about 12 device px at Detail High); PK_SQ gives a status
   its own square glyph when the icon it resolves to belongs to another family (ab-*, items) or is too busy for 12 px. */
/* ---- small shared shapes ---- */
/* an elliptic ring (a link, a halo): centre, radii, thickness t, rotation in degrees */
function pdRing(cx,cy,rx,ry,t,rot){const p=new Path2D(),a=(rot||0)*Math.PI/180;p.ellipse(cx,cy,rx,ry,a,0,Math.PI*2);p.ellipse(cx,cy,Math.max(.2,rx-t),Math.max(.2,ry-t),a,Math.PI*2,0,true);const r=Math.max(rx,ry);return{p,b:[cx-r,cy-r,cx+r,cy+r]}}
/* a chevron pointing up (dir 1) or down (-1): apex at (cx,y), half width w, height h, thickness t */
function pdChev(cx,y,w,h,t,dir){const d=dir===-1?-1:1;return pkPoly([cx-w,y+h*d,cx,y,cx+w,y+h*d,cx+w,y+(h+t)*d,cx,y+t*d,cx-w,y+(h+t)*d])}
/* a block arrow from (x0,y0) to the tip (x1,y1): shaft width w, head width hw, head length hl */
function pdArrow(x0,y0,x1,y1,w,hw,hl){const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,nx=-uy,ny=ux,bx=x1-ux*hl,by=y1-uy*hl,a=w/2,h=hw/2;
 return pkPoly([x0+nx*a,y0+ny*a,bx+nx*a,by+ny*a,bx+nx*h,by+ny*h,x1,y1,bx-nx*h,by-ny*h,bx-nx*a,by-ny*a,x0-nx*a,y0-ny*a])}
/* a puffy cloud from circles [cx,cy,r,...] on a flat base at y */
function pdCloud(c,base){const S=[];for(let i=0;i<c.length;i+=3)S.push(pkCirc(c[i],c[i+1],c[i+2]));if(base)S.push(pkRect(base[0],base[1],base[2],base[3],base[3]/2));return pkU.apply(null,S)}
/* an eye (almond) centred on (cx,cy), half width w, half height h */
const pdEyeS=(cx,cy,w,h)=>pkS(`M${cx-w} ${cy} Q${cx} ${cy-h*2} ${cx+w} ${cy} Q${cx} ${cy+h*2} ${cx-w} ${cy} Z`);
function pdEye(g,cx,cy,w,h,iris,o){o=o||{};pkFill(g,pdEyeS(cx,cy,w,h),o.white||'white',{k:.8,inside:(g,m)=>{pkFill(g,pkCirc(cx+(o.dx||0),cy,h*.98),iris||'blue',{ball:1,k:.6,lw:PK.lw*.8});
  g.fillStyle=PK.ink;g.fill(pkCirc(cx+(o.dx||0),cy,h*.44).p);pkSpec(g,cx+(o.dx||0)-h*.35,cy-h*.38,h*.32,.95)}})}
/* a simple sword pointing along angle a with the guard at (x,y) (a smaller kit sword) */
const pdSword=(g,x,y,a,len,w,hilt)=>pkSword(g,x,y,a,{len,w,guard:w*2.7,grip:w*1.1,hilt});
/* a shield in front view: kind, centre, size, face material, rim material, emblem */
const pdShield=(g,kind,x,y,w,h,mat,rim,emb,a)=>pkShield(g,x,y,{kind,w,h,mat,rim,rimW:1.8,emblem:emb,a});
const pdCross=(g,s,mat)=>pkFill(g,pkS(`M${-1.5*s} ${-6.5*s} L${1.5*s} ${-6.5*s} L${1.5*s} ${-3*s} L${4.6*s} ${-3*s} L${4.6*s} 0 L${1.5*s} 0 L${1.5*s} ${6*s} L${-1.5*s} ${6*s} L${-1.5*s} 0 L${-4.6*s} 0 L${-4.6*s} ${-3*s} L${-1.5*s} ${-3*s} Z`),mat||'gold',{k:.5,lw:PK.lw*.8});
/* a running figure (fleeing) in material m */
function pdRunner(g,m,sk){const B=(d,w,mm)=>pkFill(g,pkTube(d,w,'round'),mm||m,{k:.6});
 B([14.5,17,9.5,22.5,5,22],3.6);B([14.5,17,18,22.5,15.5,29],3.6);B([18.5,8,14,17],6.2);B([17.5,10,22.5,13,26,10.5],3);B([17,10.5,11.5,13.5,8.5,12],3);
 pkFill(g,pkCirc(20.5,4.8,3.8),sk||m,{ball:1,k:.6})}
/* ======== statuses (the icon and, unless PK_SQ says otherwise, the square's glyph) ======== */
const pdP=PAINT;
pdP.buff=g=>{pkFill(g,pdChev(16,3,12.5,9.5,6.4),'teal',{k:1});pkFill(g,pdChev(16,14,12.5,9.5,6.4),'teal',{k:1})};
pdP.fresh=g=>{pkFill(g,pdChev(16,3,12.5,9.5,6.4),'cloth',{k:1});pkFill(g,pdChev(16,14,12.5,9.5,6.4),'cloth',{k:1})};
pdP.spent=g=>{pkFill(g,pdChev(16,18,12.5,9.5,6.4,-1),'iron',{k:1});pkFill(g,pdChev(16,29,12.5,9.5,6.4,-1),'iron',{k:1})};
const PD_ROOT=['#2a180b','#6b4424','#a87545','#d6a46a','#f2d2a0'];
pdP.root=g=>{pkFill(g,pkEll(16,27.5,14,3.4),'darkwood',{k:.8});const R=(pts,w)=>pkFill(g,pkTube(pts,w,'round'),PD_ROOT,{k:1});
 R(pkQ(8.5,27,2,17,6.5,4.5,10),[6,1.8]);R(pkQ(23.5,27,30,17,25.5,4.5,10),[6,1.8]);R(pkQ(13.5,27,11.5,15,16,2,10),[6.4,2]);R(pkQ(18.5,27,21.5,18,20.5,9.5,8),[4.6,1.6]);
 R(pkQ(4.6,14,1,12,1.5,8.5,6),[2.4,1]);R(pkQ(27.6,14,31,12,30.5,8.5,6),[2.4,1]);R(pkQ(12.5,13,9,10,10,6.5,6),[2.4,1])};
pdP.webbed=g=>{const S=[];for(let i=0;i<4;i++){const a=i*Math.PI/4;S.push(pkTube([16-Math.sin(a)*14.5,16+Math.cos(a)*14.5,16+Math.sin(a)*14.5,16-Math.cos(a)*14.5],2.4,'round'))}
 for(const r of [5.2,10.2]){const p=[];for(let i=0;i<=8;i++){const a=i*Math.PI/4,a2=a+Math.PI/8;p.push(16+Math.sin(a)*r,16-Math.cos(a)*r);if(i<8)p.push(16+Math.sin(a2)*r*.82,16-Math.cos(a2)*r*.82)}S.push(pkTube(p,2.1,'round'))}
 pkFill(g,pkU.apply(null,S),'white',{k:.6})};
pdP.hexed=g=>{for(const [x,h] of [[10,6],[16.5,8],[22.5,5]])pkDrop(g,x,24+h,h+1,'void');pdEye(g,16,15,14.2,6.8,'void',{white:'bone'});pkPost(g=>pkGlint(g,9.5,9,2))};
pdP.enraged=g=>{const E=s=>pkAt(g,16,16,0,1,g=>{g.scale(s,1);pkFill(g,pkS('M1.6 8 L13.5 2.5 Q14.5 9.5 9 13 Q3.5 13.5 1.6 8 Z'),'fire',{k:1,inside:(g,m)=>{pkFill(g,pkCirc(8.5,8.6,2),'holy',{ball:1,lw:0,noShade:1})}});
  pkFill(g,pkS('M.5 3.5 L14.5 -4.5 L15 -.5 L1.5 6.5 Z'),'blood',{k:.6})});E(1);E(-1)};
pdP.telegraph=g=>{pkFill(g,pkS('M16 2.5 Q17.6 2.5 18.6 4.2 L30 25.4 Q30.8 28.5 28 28.5 L4 28.5 Q1.2 28.5 2 25.4 L13.4 4.2 Q14.4 2.5 16 2.5 Z'),'fire',{k:1.5});
 g.fillStyle=PK.ink;g.fill(pkS('M14 10 L18 10 L17.2 20 L14.8 20 Z').p);g.fill(pkCirc(16,24.2,2.2).p)};
pdP.charging=g=>{for(const [y,x,l] of [[10.5,1.5,6],[16,1,5],[21.5,1.5,6]])pkFill(g,pkRect(x,y-1.3,l,2.6,1.3),'white',{k:.4,lw:PK.lw*.8});pkFill(g,pdArrow(9,16,30.5,16,9,20,10.5),'cloth',{k:1.2})};
pdP.shielded=g=>{pkGlow(g,16,16,16,'#8ccfff',.45);pkFill(g,pkCirc(16,16,13.4),'frost',{ball:1,k:1.4,inside:(g,m)=>{pkHi(g,'M7 11 Q9.5 5.5 16 4.6',2.2,.8);pkLine(g,'M24 21 Q21 26 15 27',1.2,m[1],.6)}});
 pkAt(g,16,16.5,0,.5,g=>pkShield(g,0,0,{kind:'heater',w:20,h:23,mat:'white',rim:'silver'}))};
pdP.held=g=>{const F=(x,y)=>pkFill(g,pdRing(x,y,8.6,5.6,3,45),'steel',{k:.9});F(8.5,8.5);F(23.5,23.5);
 pkFill(g,pkU(pkTube([12.4,12.4,19.6,19.6],5.6,'round')),'steel',{k:.8,inside:(g,m)=>pkLine(g,'M13.4 13.4 L18.6 18.6',1.2,m[0],.8)});pkPost(g=>pkGlint(g,5.5,4.5,2))};
pdP.fleeing=g=>{pdRunner(g,'bone');pkLine(g,'M23 18 L29 18 M24 22.5 L29.5 22.5 M22 27 L27 27',1.6,'#ffffff',.9)};
pdP.harried=g=>{pkFill(g,pkS('M2 6 Q16 2 30 6 L30 11 Q16 7.5 2 11 Z'),'blood',{k:.8});pkFill(g,pkS('M3 26 Q16 30 29 26 L29 22 Q16 25 3 22 Z'),'blood',{k:.8});
 const T=(x,y,h,d)=>pkFill(g,pkS(`M${x-2.6} ${y} Q${x} ${y+h*.25*d} ${x+2.6} ${y} Q${x+1.4} ${y+h*.6*d} ${x} ${y+h*d} Q${x-1.4} ${y+h*.6*d} ${x-2.6} ${y} Z`),'bone',{k:.5,lw:PK.lw*.85});
 T(6.5,9.5,9,1);T(12.5,8.5,6,1);T(19.5,8.5,6,1);T(25.5,9.5,9,1);T(9.5,23.5,7,-1);T(16,24.5,5,-1);T(22.5,23.5,7,-1)};
pdP.winded=g=>{for(const [x,y] of [[10,30],[19,31.5]])pkDrop(g,x,y,8,'frost');pkFill(g,pdCloud([9,15,6,16.5,11,8,24,15.5,6],[3,15,26,7.5]),'white',{k:1.4,inside:(g,m)=>pkLine(g,'M7 19.5 Q12 17.5 15 19.5 Q19 21.5 24 19',1,m[1],.8)})};
pdP.injury=g=>{pkAt(g,16,16,45,1,g=>{const bone=(y0,y1)=>pkFill(g,pkU(pkRect(-2.6,y0,5.2,y1-y0,1),pkCirc(-2.4,y0<0?y0:y1,3),pkCirc(2.4,y0<0?y0:y1,3)),'bone',{k:.8});
  bone(-13,-1.5);bone(1.5,13)});pkFill(g,pkU(pkTube([5,5,27,27],4.2,'round'),pkTube([27,5,5,27],4.2,'round')),'blood',{k:.9})};
pdP.cover=g=>{pkFill(g,pkRect(2,12,28,17,1.5),'stone',{k:1.6,inside:(g,m)=>{pkLine(g,'M2 17.6 L30 17.6 M2 23.2 L30 23.2 M10 12 L10 17.6 M21 12 L21 17.6 M5.5 17.6 L5.5 23.2 M16 17.6 L16 23.2 M26 17.6 L26 23.2 M11 23.2 L11 29 M21 23.2 L21 29',1,m[0],.7);pkHi(g,'M3.5 13.4 L28.5 13.4',1,.5)}});
 pkArrow(g,5,13,19,2.5,{w:1.8,head:5.4})};
pdP['los-blocked']=g=>{pdEye(g,16,16,14,6.6,'blue');pkFill(g,pkTube([5,27,27,5],4.2,'round'),'blood',{k:.9})};
pdP['friendly-fire']=g=>{pkFill(g,pkS('M3 30 C3 21 7.5 17.5 13.5 17.5 C19.5 17.5 24 21 24 30 Z'),'verd',{k:1.4});pkFill(g,pkCirc(13.5,10,6.4),'skin',{ball:1,k:1});
 pkArrow(g,30,3,18.5,21,{w:1.9,head:5.6,fletch:'cloth'});pkPost(g=>pkGlint(g,19,21,2.6,'#ffd0c0'))};
pdP.allybars=g=>{pkFill(g,pkS('M5 30.5 C5 22.5 9.5 19.5 16 19.5 C22.5 19.5 27 22.5 27 30.5 Z'),'verd',{k:1.4});pkFill(g,pkCirc(16,13.5,5.6),'skin',{ball:1,k:1});
 g.fillStyle=PK.ink;g.fill(pkRect(3,1.5,26,6,2).p);pkFill(g,pkRect(4.4,2.9,16,3.2,1),'teal',{k:.4,lw:0,inside:g=>pkHi(g,'M5 3.5 L19.5 3.5',.8,.7)})};
pdP['ranged-lock']=g=>{pkArrow(g,3.5,28.5,28,4,{w:3,head:8.4,fletch:'cloth',shaft:PD_ROOT});pkArrow(g,28.5,28.5,4,4,{w:3,head:8.4,fletch:'cloth',shaft:PD_ROOT})};
pdP.unloaded=g=>{pkFill(g,pkTube(pkQ(3,15,16,4,29,15,14),3.8,'round'),'steel',{k:.8});pkLine(g,'M4 15.5 L16 19 L28 15.5',1.1,'#efe6c8');
 pkFill(g,pkRect(13.4,6,5.2,24.5,1.8),PD_ROOT,{k:1});pkFill(g,pkRect(12.6,10.5,6.8,3.4,1),'iron',{k:.5});
 pkFill(g,pkU(pkTube([2.5,21,9.5,28],3.6,'round'),pkTube([9.5,21,2.5,28],3.6,'round')),'blood',{k:.7})};
pdP.shieldwall=g=>{pdShield(g,'heater',11,14,17,21,'teal','iron');pdShield(g,'heater',19.5,18,18,22,'silver','brass',g=>pdCross(g,1,'gold'))};
pdP.bonewall=g=>{pdShield(g,'heater',11,14,17,21,'bone','darkwood');pdShield(g,'heater',19.5,18,18,22,'silver','bone',g=>pkGem(g,0,-1,3.6,'gold'))};
pdP.riposte=g=>{pdSword(g,10.5,22,45,19,5.4);pkFill(g,pkTube(pkArc(15.5,15.5,12.5,200,325,16),4.2,'flat'),'gold',{k:.8});pkFill(g,pkPoly([1,18,9.5,17.5,4.5,25.5]),'gold',{k:.6})};
pdP.spearwall=g=>{for(const x of [6,16,26]){pkHaft(g,x,30.5,x,14,3,'wood');pkAt(g,x,14.5,0,1,g=>pkBlade(g,{len:12.5,w:7.6,tip:'leaf',fuller:false}))}
 pkFill(g,pkRect(1.5,21.5,29,3.6,1.4),'darkwood',{k:.6})};
pdP.rallied=g=>{pkFill(g,pkS('M2.5 13.5 L5 13.5 L19 9 Q22 3 27.5 2.5 L27.5 22.5 Q22 22 19 16 L5 15.6 L2.5 15.6 Z'),'brass',{k:1.3,inside:(g,m)=>{pkLine(g,'M19 9 Q20.5 12.5 19 16',1,m[1],.9);pkHi(g,'M7 13.3 L18 10.4',1,.7)}});
 pkFill(g,pkEll(27.5,12.5,2.4,10),'brass',{k:.7,inside:(g,m)=>pkFill(g,pkEll(27.8,12.5,1.2,7.6),'dark',{lw:0,noRim:1})});
 for(const [x0,y0,x1,y1] of [[8,22,5,28],[14,21.5,13.5,28.5],[20.5,22.5,22.5,28.5]])pkFill(g,pkTube([x0,y0,x1,y1],2.2,'round'),'gold',{k:.4,lw:PK.lw*.8})};
pdP.indom=g=>{pkFill(g,pkS('M6 30 L7.5 12 L5 12 L5 4 L9.5 4 L9.5 7 L13.6 7 L13.6 4 L18.4 4 L18.4 7 L22.5 7 L22.5 4 L27 4 L27 12 L24.5 12 L26 30 Z'),'stone',{k:1.6,
  inside:(g,m)=>{pkLine(g,'M7 18 L25 18 M6.6 24 L25.4 24 M12 12 L12 18 M20 12 L20 18 M16 18 L16 24 M11 24 L11 30 M21 24 L21 30',.8,m[1],.8);g.fillStyle=PK.ink;g.fill(pkS('M13.8 30 L13.8 25.5 Q16 23 18.2 25.5 L18.2 30 Z').p);pkHi(g,'M6.5 5 L6.5 11',1,.6)}})};
pdP.banner=g=>pkFlag(g,7,4.5,{w:20,h:14,mat:'cloth',pole:24,wave:2.2,tip:'gold'});
pdP['st-tired']=g=>{pkDrop(g,13,30,25,'white');pkFill(g,pdArrow(25.5,1.5,25.5,15.5,4.6,10.5,6.6),'blood',{k:.8})};
pdP['st-fleet']=g=>{pkFill(g,pkS('M10 4 L19.5 4 L19 18 Q24 19 29 22 Q30.5 24 29.5 28.5 L10 28.5 Q8.5 22 10 18 Z'),'leather',{k:1.4,inside:(g,m)=>{pkFill(g,pkRect(8,25.5,23,4,1),'darkwood',{k:.5});pkLine(g,'M10 8.5 L19.5 8.5',1.2,m[0],.7);pkHi(g,'M11.5 10 L11.5 20',1.2,.4)}});
 pkFill(g,pkS('M10 12 Q4.5 9.5 1.5 4.5 Q6 5.5 7.5 7.5 Q5 4 5.5 1.5 Q8.5 3.5 10 7 Q9.5 4 10.5 2.5 Q13 6 12.5 12 Z'),'white',{k:.8})};
pdP['st-dance']=g=>{const F=(x,y,a)=>pkAt(g,x,y,a,1,g=>{pkFill(g,pkEll(0,-2.5,3.7,5.6),'teal',{k:.8});pkFill(g,pkEll(0,6.4,2.8,2.8),'teal',{k:.6})});F(10,13,-18);F(22,19,14);
 pkLine(g,'M3 28 Q16 33 29 27',1.4,PKM.teal[3],.9)};
pdP['st-marked']=g=>{pkFill(g,pkU(pdRing(16,16,11.2,11.2,3.6),pkRect(14.2,1.5,3.6,8,1),pkRect(14.2,22.5,3.6,8,1),pkRect(1.5,14.2,8,3.6,1),pkRect(22.5,14.2,8,3.6,1)),'blood',{k:.9});pkFill(g,pkCirc(16,16,2.4),'blood',{ball:1,k:.5})};
pdP['st-weak']=g=>{pdSword(g,20.5,9,180,18,5.4,'iron');pkFill(g,pdArrow(7,2.5,7,18,5,11.5,7),'blood',{k:.8})};
pdP['st-undying']=g=>{pkSkull(g,14,17.5,1.2,'gold');pkFill(g,pdArrow(26.5,15,26.5,1.5,4,9.5,6),'chi',{k:.7});pkPost(g=>pkGlint(g,7.5,7.5,2.4))};
pdP.undying=pdP['st-undying'];
pdP['st-evasive']=g=>{pkFill(g,pdCloud([8,18,6.4,16,13,8.5,24,18,6.4],[2.5,17,27,9]),'stone',{k:1.4});pdEye(g,16,18.5,8.6,4.2,'void')};
pdP['st-steady']=g=>{const L=s=>pkAt(g,16,0,0,1,g=>{g.scale(s,1);pkFill(g,pkS('M1.6 10 Q4 7 9 8 Q13.5 10 13.5 19 Q13.5 26.5 9.5 28.5 Q4.5 30 2.5 26 Q1 22 1.6 10 Z'),'chi',{k:1.3})});L(1);L(-1);
 pkFill(g,pkS('M14.4 2 L17.6 2 L17.6 10 Q19.5 12 21 15 L19 16 Q17.5 13.5 16 12.6 Q14.5 13.5 13 16 L11 15 Q12.5 12 14.4 10 Z'),'chi',{k:.6})};
pdP['st-venom']=g=>{pkDrop(g,16,30,28,'poison');pkFill(g,pkCirc(16,20.5,4.2),'void',{ball:1,k:.6});pkFill(g,pkCirc(16,20.5,1.6),'dark',{lw:0,noRim:1})};
pdP['st-coiled']=g=>{const band=(y,w)=>pkFill(g,pkS(`M${16-w} ${y} Q16 ${y-4} ${16+w} ${y} L${16+w} ${y+5} Q16 ${y+1} ${16-w} ${y+5} Z`),'chi',{k:.9,inside:(g,m)=>pkLine(g,`M${16-w+2} ${y+2.4} Q16 ${y-1.2} ${16+w-2} ${y+2.4}`,1,m[3],.7)});
 band(23,13);band(16.5,12);band(10,10.5);pkFill(g,pkEll(22.5,6,5.2,3.6,-15),'chi',{k:.7});g.fillStyle=PK.ink;g.fill(pkCirc(24,5,1).p);pkLine(g,'M27.5 7.5 L30.5 9 M29 8.2 L30.5 6.8',.9,PKM.blood[2])};
pdP['st-entangled']=g=>{const V=(pts,w)=>pkFill(g,pkTube(pts,w,'round'),'green',{k:.9});V(pkQ(3,29,6,10,27,4,14),[4.4,1.6]);V(pkQ(29,29,24,12,5,5,14),[4.4,1.6]);
 const Lf=(x,y,a)=>pkAt(g,x,y,a,1,g=>pkFill(g,pkS('M0 0 C-3.4 -3 -3.4 -6.5 0 -9 C3.4 -6.5 3.4 -3 0 0 Z'),'chi',{k:.6}));Lf(10.5,14,-60);Lf(21.5,15,60);Lf(16,9,0);
 pkFill(g,pkEll(16,28.5,13,2.6),'darkwood',{k:.5})};
pdP['st-bark']=g=>{pkFill(g,pkS('M4 4 Q16 1.5 28 4 Q29.5 18 16 30 Q2.5 18 4 4 Z'),'wood',{k:1.6,inside:(g,m)=>{pkLine(g,'M9 5 Q8 14 12 24 M15.5 4 Q14.5 15 16 28 M22 5 Q23.5 14 19.5 24 M26 7 Q26 13 23.5 18',1.4,m[0],.8);pkHi(g,'M7 6 Q6.5 12 9 18',1.2,.45)}})};
pdP['st-regrow']=g=>{pkFill(g,pkEll(15,28,10.5,3),'darkwood',{k:.6});pkFill(g,pkTube(pkQ(15,28,14,20,16,12,8),2.8,'round'),'green',{k:.6});
 const Lf=(x,y,a,s)=>pkAt(g,x,y,a,s,g=>pkFill(g,pkS('M0 0 C-4.4 -3.6 -4.4 -8.5 0 -12 C4.4 -8.5 4.4 -3.6 0 0 Z'),'chi',{k:.8,inside:(g,m)=>pkLine(g,'M0 -1 L0 -10',.7,m[1],.9)}));Lf(15.5,17,-58,1.05);Lf(16,14,52,.95);
 pkSparkle(g,25.5,6.5,5,'chi')};
pdP['st-diving']=g=>{const W=s=>pkAt(g,16,0,0,1,g=>{g.scale(s,1);pkFill(g,pkS('M1.5 19 L13.5 2 Q15 9 13 12 Q15.5 13.5 12.5 16 Q13.5 18 10 20 L4 25 Z'),'cloth',{k:1.1})});W(1);W(-1);
 pkFill(g,pkS('M16 15 L20 20 L16 30.5 L12 20 Z'),'gold',{k:.7})};
pdP['st-grounded']=g=>{pkFill(g,pkRect(1,26.5,30,4,1.8),'stone',{k:.6});pkFill(g,pkS('M3 27 L12.5 5 L29 9.5 L27 16.5 Q23 15 22 20 Q18 18 16 23.5 Q12 21.5 10 27 Z'),'cloth',{k:1.3,inside:(g,m)=>pkLine(g,'M12.5 5 L10 27 M12.5 5 L16 23.5 M12.5 5 L22 20 M12.5 5 L27 16.5',1,m[0],.6)});
 pkFill(g,pkTube([3,27,12.5,5,29,9.5],2.6,'round'),'leather',{k:.4,lw:PK.lw*.8});pkFill(g,pkCirc(12.5,5,2),'bone',{ball:1,lw:.7})};
pdP['st-slammed']=g=>{pkFill(g,pdCloud([7,24,5,16,22,6.4,25,24,5],[2,24,28,6]),'canvas',{k:1.2});pkStar(g,16,9.5,8,'gold',5,3.6);pkPost(g=>pkGlint(g,26,6,2.4))};
/* status squares: statuses shown by an ability / item icon (other packages) or by a busy picture get their own glyph */
PK_SQ['st-bleed']=g=>pkDrop(g,16,30,28,'blood');
PK_SQ['st-stun']=g=>{pkStar(g,13.5,17.5,13.2,'gold',5,5.6);pkStar(g,25.5,6.5,6,'gold',5,2.6)};
PK_SQ['st-poison']=g=>pkDrop(g,16,30,28,'poison');
PK_SQ['st-splitshield']=g=>{pkAt(g,-1.5,0,-8,1,g=>pkFill(g,pkS('M4 4 L15 4 L13 10 L16.5 14 L13.5 19 L15.5 23 L14 29.5 Q4 25.5 4 14 Z'),'wood',{k:1.2}));
 pkAt(g,1.5,0,8,1,g=>pkFill(g,pkS('M17 4 L28 4 L28 14 Q28 25.5 16.5 29.5 L18 23 L16 19 L19 14 L15.5 10 Z'),'wood',{k:1.2}))};
PK_SQ['st-sunder']=PK_SQ['st-splitshield'];
pdP.splitshield=PK_SQ['st-splitshield'];
PK_SQ['st-indom']=pdP.indom;
PK_SQ['st-reinforce']=g=>{pdShield(g,'heater',14,17,23,26,'steel','iron');pkFill(g,pkS('M22.4 1 L26.6 1 L26.6 6.4 L32 6.4 L32 10.6 L26.6 10.6 L26.6 16 L22.4 16 L22.4 10.6 L17 10.6 L17 6.4 L22.4 6.4 Z'),'chi',{k:.7})};
PK_SQ['st-empower']=g=>{pkGlow(g,16,12,14,'#ffb12e',.45);pkSword(g,16,22,0,{len:19,w:6,guard:15,grip:5,mat:'gold',hilt:'bronze'})};
PK_SQ['st-bastion']=g=>pdShield(g,'tower',16,16,22,28,'iron','brass',g=>pkLine(g,'M0 -11 L0 11 M-8 -1 L8 -1',1.4,PKM.iron[0],.7));
PK_SQ['st-parry']=g=>{pdSword(g,8,24,45,19,4.6);pdSword(g,24,24,-45,19,4.6)};
PK_SQ['st-phalanx']=g=>{pkHaft(g,5,30,24,4,2.8,'wood');pkAt(g,24,4.2,37,1,g=>pkBlade(g,{len:6,w:5,tip:'leaf',fuller:false}));pkShield(g,13.5,18.5,{kind:'round',w:21,h:21,mat:'cloth',rim:'brass',rimW:2,boss:3.6})};
PK_SQ['st-holdfast']=g=>{const S=pkU(pkTube([16,8,16,27],4,'round'),pkTube(pkArc(16,16,12,118,242,18),4,'round'),pkTube([9.5,11.5,22.5,11.5],3.4,'round'),pdRing(16,5.4,4.4,4.4,2.6));
 pkFill(g,S,'iron',{k:1});pkFill(g,pkPoly([1.5,23,7,19.5,7.5,26]),'iron',{k:.5});pkFill(g,pkPoly([30.5,23,25,19.5,24.5,26]),'iron',{k:.5})};
PK_SQ['st-rage']=g=>{pkGlow(g,16,19,14,'#ff4040',.45);pkFlame(g,16,30,28,'blood')};
PK_SQ['st-manashield']=g=>{pkGlow(g,16,16,16,'#8ccfff',.55);pdShield(g,'heater',16,16,24,27,'mana','silver');pkPost(g=>pkGlint(g,11,10,2.8))};
PK_SQ['st-avatar']=g=>{pkGlow(g,16,15,16,'#ffd95a',.5);pkHelmGreat(g,'gold','bronze')};
PK_SQ['st-chant']=g=>{pkFill(g,pkU(pkRect(11.5,5,3.4,20,1),pkRect(23.5,3,3.4,19,1),pkS('M11.5 5 L26.9 2 L26.9 8 L11.5 11 Z')),'void',{k:.8});
 pkFill(g,pkEll(9.5,25.5,5,3.8,-20),'void',{k:.8});pkFill(g,pkEll(21.5,22.5,5,3.8,-20),'void',{k:.8})};
PK_SQ['st-pack']=g=>{pkFill(g,pkS('M16 15.5 C21.5 15.5 26 21 25 25.5 C24.4 28.5 21 29 16 27.5 C11 29 7.6 28.5 7 25.5 C6 21 10.5 15.5 16 15.5 Z'),'leather',{k:1.3});
 for(const [x,y,a] of [[5.5,13,-30],[11.5,7.5,-10],[20.5,7.5,10],[26.5,13,30]])pkFill(g,pkEll(x,y,3.4,4.6,a),'leather',{k:.8})};
pdP.pack=PK_SQ['st-pack'];
PK_SQ['st-warcry']=g=>{pkFill(g,pkStarS(16,16,15,9,8.5),'blood',{k:1.4});g.fillStyle=PK.ink;g.fill(pkS('M14.2 8.5 L17.8 8.5 L17.2 18 L14.8 18 Z').p);g.fill(pkCirc(16,21.8,2).p)};
PK_SQ['st-ward']=g=>{pkGlow(g,16,16,16,'#c49eff',.5);pdShield(g,'kite',16,16,23,28,'void','silver',g=>pkFill(g,pkCirc(0,-2,3.2),'holy',{ball:1,k:.5}))};
PK_SQ['st-nova']=g=>{pkGlow(g,16,18,15,'#c49eff',.55);pkFill(g,pkS('M16 2.5 Q17.6 2.5 18.6 4.2 L30 25.4 Q30.8 28.5 28 28.5 L4 28.5 Q1.2 28.5 2 25.4 L13.4 4.2 Q14.4 2.5 16 2.5 Z'),'void',{k:1.5});
 g.fillStyle='#ffffff';g.fill(pkS('M14 10 L18 10 L17.2 20 L14.8 20 Z').p);g.fill(pkCirc(16,24.2,2.2).p)};
PK_SQ['st-lucky']=g=>{for(const a of [0,90,180,270])pkAt(g,16,14.5,a+45,1,g=>pkFill(g,pkS('M0 0 C-7 -3 -8.5 -9 -4.6 -11.5 C-2.4 -12.6 -.6 -11.6 0 -10 C.6 -11.6 2.4 -12.6 4.6 -11.5 C8.5 -9 7 -3 0 0 Z'),'chi',{k:.9}));
 pkFill(g,pkTube(pkQ(16,15,17,25,22,30.5,8),2.6,'round'),'green',{k:.5})};
PK_SQ['st-fort']=g=>pdShield(g,'heater',16,16,24,27,'wood','iron',g=>pkLine(g,'M-11 -3 L11 -3 M-11 3.4 L11 3.4',1,PKM.wood[0],.6));
PK_SQ['st-slung']=g=>{pkFill(g,pkTube([3,9,29,25],2.6,'round'),'leather',{k:.5});pkShield(g,18,16,{kind:'round',w:20,h:20,mat:'wood',rim:'iron',rimW:2,boss:3.6,a:20})};
PK_SQ['st-web']=pdP.webbed;
/* ======== trade goods (tg-*), cargo, stash ======== */
/* sack standing on (x,y), height h: body, ruffled neck, tie; top(g) paints what heaps out of it */
function pdSack(g,x,y,h,mat,tie,top){pkAt(g,x,y,0,h/26,g=>{
  pkFill(g,pkS('M-4.6 -20 Q-12.5 -16 -12 -7.5 Q-11.5 0 0 0 Q11.5 0 12 -7.5 Q12.5 -16 4.6 -20 Z'),mat||'canvas',{k:2,inside:(g,m)=>{pkLine(g,'M-4 -16 Q-6 -9 -4.5 -3 M3.5 -15 Q5 -10 3 -5',1,m[1],.6);pkHi(g,'M-9 -13 Q-10 -9 -8.6 -5.6',1.4,.5)}});
  pkFill(g,pkS('M-4.6 -20 L-7.4 -25.5 Q-3.5 -24 0 -25.8 Q3.5 -24 7.4 -25.5 L4.6 -20 Z'),mat||'canvas',{k:.8});
  if(top)top(g);pkFill(g,pkRect(-5.6,-21.4,11.2,2.8,1.2),tie||'brass',{k:.5})})}
function pdBarrel(g,cx,cy,w,h,mat,hoop){const a=w/2,b=h/2;pkFill(g,pkS(`M${cx-a*.82} ${cy-b} Q${cx-a*1.12} ${cy} ${cx-a*.82} ${cy+b} L${cx+a*.82} ${cy+b} Q${cx+a*1.12} ${cy} ${cx+a*.82} ${cy-b} Z`),mat||'wood',{k:1.8,inside:(g,m)=>{
  for(const f of [-.4,0,.4])pkLine(g,`M${cx+a*f*.9} ${cy-b} Q${cx+a*f*1.2} ${cy} ${cx+a*f*.9} ${cy+b}`,.8,m[0],.55);
  for(const f of [-.62,.62])pkFill(g,pkS(`M${cx-a} ${cy+b*f-1.3} Q${cx} ${cy+b*f+.6} ${cx+a} ${cy+b*f-1.3} L${cx+a} ${cy+b*f+1.3} Q${cx} ${cy+b*f+3.2} ${cx-a} ${cy+b*f+1.3} Z`),hoop||'iron',{k:.5,lw:PK.lw*.8});
  pkHi(g,`M${cx-a*.66} ${cy-b*.4} Q${cx-a*.78} ${cy} ${cx-a*.66} ${cy+b*.3}`,1.3,.5)}})}
function pdFish(g,x,y,s,mat,flip){pkAt(g,x,y,0,s,g=>{if(flip)g.scale(-1,1);pkFill(g,pkS('M-12 0 Q-5 -6.5 4 -5 Q9 -4 10.5 0 Q9 4 4 5 Q-5 6.5 -12 0 Z M8.5 0 L14 -5.5 L13 0 L14 5.5 Z'),mat||'silver',{k:1.2,inside:(g,m)=>{
  pkLine(g,'M-3 -4.6 Q-1 0 -3 4.6',.8,m[1],.8);pkHi(g,'M-8 -1.6 Q-2 -4.5 5 -3.4',1.1,.6)}});
  pkFill(g,pkS('M-1 -5 L3.5 -8 L5.5 -4.6 Z'),mat||'silver',{k:.4,lw:PK.lw*.8});g.fillStyle=PK.ink;g.fill(pkCirc(-8.2,-1.2,1).p)})}
/* crate / chest: x,y top-left, w,h; lid, two bands, optional lock */
function pdChest(g,x,y,w,h,mat,band,lock){pkFill(g,pkRect(x,y+h*.36,w,h*.64,1.4),mat||'wood',{k:1.6,inside:(g,m)=>pkLine(g,`M${x} ${y+h*.68} L${x+w} ${y+h*.68}`,.8,m[0],.6)});
 pkFill(g,pkS(`M${x} ${y+h*.38} L${x} ${y+h*.2} Q${x+w/2} ${y-h*.12} ${x+w} ${y+h*.2} L${x+w} ${y+h*.38} Z`),mat||'wood',{k:1,inside:(g,m)=>pkHi(g,`M${x+2} ${y+h*.2} Q${x+w/2} ${y} ${x+w-3} ${y+h*.17}`,1,.5)});
 for(const bx of [x+w*.2,x+w*.8]){const t=y+h*.2-(1-Math.abs(bx-x-w/2)/(w/2))*h*.32+h*.02;pkFill(g,pkRect(bx-1.7,t,3.4,y+h-t,.6),band||'iron',{k:.5,lw:PK.lw*.8})}
 if(lock)pkFill(g,pkRect(x+w/2-2.8,y+h*.3,5.6,5.8,1),lock,{k:.5,inside:g=>{g.fillStyle=PK.ink;g.fill(pkCirc(x+w/2,y+h*.3+2.4,.9).p)}})}
pdP.tg=g=>{pkFill(g,pkRect(3,6,26,23,1.4),'wood',{k:1.8,inside:(g,m)=>{pkLine(g,'M3 13.6 L29 13.6 M3 21.4 L29 21.4',.9,m[0],.7);pkHi(g,'M5 8 L27 8',1,.45)}});
 pkFill(g,pkU(pkRect(3,6,26,3.4,1),pkRect(3,25.6,26,3.4,1),pkRect(3,6,3.4,23,1),pkRect(25.6,6,3.4,23,1),pkTube([5,27,27,8],3.6,'flat')),'darkwood',{k:.8});
 for(const [x,y] of [[4.7,7.7],[27.3,7.7],[4.7,27.3],[27.3,27.3]])pkFill(g,pkCirc(x,y,1.1),'iron',{ball:1,lw:.5})};
pdP.stash=g=>{pdChest(g,3,6,26,22,'darkwood','brass','gold');pkPost(g=>pkGlint(g,24.5,8.5,2.6))};
pdP.cargo=g=>{pkFill(g,pkTube([20,19,30.5,13.5],2.4,'round'),'wood',{k:.5});pdSack(g,8.5,16,12,'canvas','brass');pdBarrel(g,18,10.5,9,11,'wood');
 pkFill(g,pkRect(2,15,22,8,1.2),'wood',{k:1.2,inside:(g,m)=>pkLine(g,'M2 19 L24 19',.8,m[0],.6)});
 for(const x of [7,19]){pkFill(g,pkCirc(x,25,5),'darkwood',{k:.8,inside:(g,m)=>pkLine(g,`M${x-4} 25 L${x+4} 25 M${x} 21 L${x} 29`,1,m[0],.8)});pkFill(g,pkCirc(x,25,1.6),'iron',{ball:1,lw:.6})}};
const PD_SPICE=['#4a0e04','#9a2a08','#e2541a','#ff9a3c','#ffe0a0'];
const pdSpiceTop=g=>pkFill(g,pkS('M-7.6 -21 Q-4.5 -29.5 0 -30.5 Q4.5 -29.5 7.6 -21 Z'),PD_SPICE,{k:1,inside:(g,m)=>{g.fillStyle=m[4];for(const [x,y] of [[-3,-26],[2,-28],[4,-24],[-5,-23]])g.fill(pkCirc(x,y,.8).p)}});
pdP['tg-spice']=g=>pdSack(g,16,30.5,24,'leather','cloth',pdSpiceTop);
pdP['tg-spices']=g=>{pdSack(g,11.5,30.5,22,'leather','cloth',pdSpiceTop);pdSack(g,24,30.5,15,'bronze','brass',pdSpiceTop)};
pdP['tg-salt']=g=>{pkFill(g,pkS('M2 28 Q6 18 11 13 Q14 9 16 9 Q18 9 21 13 Q26 18 30 28 Z'),'white',{k:1.8,inside:(g,m)=>{for(const [x,y] of [[11,20],[16,15],[20,22],[13,25],[24,25],[8,26]])pkFill(g,pkRect(x-.9,y-.9,1.8,1.8,.3),m,{k:.2,lw:.4});pkHi(g,'M8 22 Q11 15 15.5 11',1.5,.7)}});
 pkFill(g,pkRect(1,27,30,3.4,1.4),'wood',{k:.5})};
pdP['tg-saltbrick']=g=>{const B=(x,y,w,h)=>pkFill(g,pkRect(x,y,w,h,1.2),'white',{k:1.2,inside:(g,m)=>pkLine(g,`M${x+1.5} ${y+h*.5} L${x+w-1.5} ${y+h*.5}`,.6,m[1],.6)});B(2,19,14,10);B(16.5,19,13.5,10);B(8.5,9,15,10);pkFill(g,pkTube([3,24,29,24],1.4,'flat'),'leather',{k:.3,lw:PK.lw*.7})};
const PD_ROLL=(g,cx,cy)=>pkFill(g,pkEll(cx,cy,5.4,7.4),PD_ROOT,{k:1.2,inside:(g,m)=>{g.lineWidth=1.1;g.strokeStyle=m[0];g.beginPath();g.ellipse(cx+.2,cy+.3,3,4.2,0,0,6.3);g.stroke();g.beginPath();g.ellipse(cx+.6,cy+.5,1.2,1.6,0,0,6.3);g.stroke()}});
pdP['tg-furs']=g=>{pkFill(g,pkS('M5 12 L26 12 Q29.5 15 28.5 19 Q30 23 26 27 L6 27 Z'),'leather',{k:1.8,inside:(g,m)=>{pkLine(g,'M12 13 Q10 19 12 26 M18 12.5 Q16 19 18 26.5 M23.5 12.5 Q22 19 23.5 26.5',.8,m[0],.6);pkHi(g,'M8 13.5 Q16 12.5 25 13',1,.45)}});
 PD_ROLL(g,6,19.5);pkFill(g,pkS('M26 22 Q30 25 28.5 30 Q27 27 23.5 26 Z'),'leather',{k:.5})};
pdP['tg-furbale']=g=>{let d='M4 9';for(let x=4;x<28;x+=3)d+=` Q${x+1.5} ${6.4} ${x+3} 9`;d+=' Q29.5 18 28 27';for(let x=28;x>4;x-=3)d+=` Q${x-1.5} ${29.6} ${x-3} 27`;d+=' Q2.5 18 4 9 Z';
 pkFill(g,pkS(d),['#2c2016','#5e4a36','#94785a','#c4a882','#efdcbc'],{k:2,inside:(g,m)=>{for(const x of [8,13,19,24])pkLine(g,`M${x} 10 Q${x-1.6} 18 ${x} 26`,.8,m[1],.7);pkHi(g,'M7 11 Q15 9.6 24 11',1.1,.45)}});
 for(const x of [10,22])pkFill(g,pkRect(x-1.6,5.5,3.2,25,1),'leather',{k:.4,lw:PK.lw*.8})};
const PD_CRYS=(g,mat)=>{const C=(x,y,h,w,a)=>pkAt(g,x,y,a,1,g=>pkFill(g,pkS(`M${-w} 0 L${-w} ${-h*.72} L0 ${-h} L${w} ${-h*.72} L${w} 0 Z`),mat,{k:.8,inside:(g,m)=>{g.fillStyle=m[3];g.globalAlpha=.7;g.fill(new Path2D(`M${-w} 0 L${-w} ${-h*.72} L0 ${-h} L0 0 Z`));g.globalAlpha=1;pkLine(g,`M0 ${-h} L0 0`,.5,m[4],.5)}}));
 C(9,26,16,3.6,-28);C(23,26,15,3.6,26);C(16,27,24,4.6,0);C(12,27,10,3,-6)};
pdP['tg-glass']=g=>{PD_CRYS(g,'void');pkFill(g,pkEll(16,27,13,3.4),'stone',{k:.8});pkPost(g=>pkGlint(g,14,7,2.4))};
pdP['tg-riftglass']=g=>{pkGlow(g,16,16,16,'#c49eff',.6);PD_CRYS(g,['#1a0a34','#5a2aa0','#a06ae8','#d8b8ff','#ffffff']);pkFill(g,pkEll(16,27,13,3.4),'dark',{k:.8});pkPost(g=>{pkGlint(g,14,7,2.6);pkGlint(g,25,12,1.8,'#e0c8ff')})};
pdP['tg-ale']=g=>{pdBarrel(g,16,16.5,24,26,'wood','iron');pkFill(g,pkEll(16,4.2,9.6,2.2),'darkwood',{k:.5,lw:PK.lw*.8});pkFill(g,pkCirc(16,16.5,1.6),'darkwood',{lw:.7,noRim:1})};
pdP['tg-alecask']=g=>{pkAt(g,16,15,90,1,g=>pdBarrel(g,0,0,20,27,'wood','iron'));pkFill(g,pkRect(14.4,23,3.2,5,1),'brass',{k:.5});pkFill(g,pkRect(11.5,27,9,2.6,1),'darkwood',{k:.4});
 pkFill(g,pkEll(3.5,15,2.2,9.4),'darkwood',{k:.5,lw:PK.lw*.8})};
pdP['tg-grain']=g=>{pdSack(g,14,30.5,25,'canvas','brass');const E=(x,y,a)=>pkAt(g,x,y,a,1,g=>{pkLine(g,'M0 0 L0 -9',1,PKM.gold[1]);for(let i=0;i<4;i++){const yy=-3.5-i*2.3;pkFill(g,pkEll(-1.5,yy,1.3,2.1,-25),'gold',{k:.3,lw:.6});pkFill(g,pkEll(1.5,yy,1.3,2.1,25),'gold',{k:.3,lw:.6})}});
 E(24.5,14,18);E(28,16.5,38)};
pdP['tg-flour']=g=>{pdSack(g,14,30.5,25,'white','brass',g=>pkFill(g,pdCloud([-4,-25,3,1,-27,3.6,5,-24.5,2.6]),'white',{k:.6}));pkFill(g,pkEll(26,28.5,4.6,2),'white',{k:.4})};
pdP['tg-fish']=g=>{pdFish(g,15,10.5,1.05,'silver');pdFish(g,17,22.5,1.05,'silver',1)};
pdP['tg-saltfish']=g=>{pdFish(g,15,10.5,1.05,'canvas');pdFish(g,17,22.5,1.05,'canvas',1);g.fillStyle='#ffffff';for(const [x,y] of [[10,10],[16,9],[20,11.5],[13,23],[19,21.5],[23,23.5]])g.fill(pkRect(x-.7,y-.7,1.4,1.4,.2).p)};
pdP['tg-timber']=g=>{const Lg=(x,y,l)=>{pkFill(g,pkRect(x,y-3.6,l,7.2,1),'wood',{k:1,inside:(g,m)=>pkLine(g,`M${x+2} ${y-1} L${x+l-6} ${y-1} M${x+4} ${y+1.6} L${x+l-3} ${y+1.6}`,.6,m[1],.7)});
  pkFill(g,pkEll(x+l,y,3,3.6),PD_ROOT,{k:.6,inside:(g,m)=>{g.lineWidth=.6;g.strokeStyle=m[1];g.beginPath();g.ellipse(x+l,y,1.6,2,0,0,6.3);g.stroke()}})};
 Lg(2,24,24);Lg(5,16.6,22);Lg(2,9.2,20)};
const pdSprig=(g,x,y,a,s)=>pkAt(g,x,y,a,s,g=>{pkFill(g,pkTube([0,0,0,-20],1.8,'round'),'green',{k:.4,lw:PK.lw*.8});const L=(yy,sd)=>pkAt(g,0,yy,sd*55,1,g=>pkFill(g,pkS('M0 0 C-3 -2.6 -3 -6 0 -8 C3 -6 3 -2.6 0 0 Z'),'chi',{k:.6}));
 L(-5,-1);L(-9,1);L(-13,-1);L(-16,1);pkFill(g,pkS('M0 -18 C-2.6 -20 -2.4 -23.5 0 -25 C2.4 -23.5 2.6 -20 0 -18 Z'),'chi',{k:.6})});
pdP['tg-herbs']=g=>{pdSprig(g,12,30,-14,1.05);pdSprig(g,20,30,16,1);pdSprig(g,16,30,0,1.1)};
pdP['tg-herbbundle']=g=>{pdSprig(g,13,29,-22,1);pdSprig(g,19,29,22,1);pdSprig(g,16,30,0,1.05);pkFill(g,pkRect(11.5,21,9,3.6,1.4),'canvas',{k:.5})};
const PD_SILK2=['#1c0c34','#5a2e9e','#9466dc','#c8a8f4','#ffffff'];
pdP['tg-silk']=g=>{pkFill(g,pkS('M3 14 Q16 8 29 14 L29 22 Q16 16 3 22 Z'),'purple',{k:1});pkFill(g,pkS('M3 22 Q16 16 29 22 L29 27 Q16 21 3 27 Z'),PD_SILK2,{k:.8});
 pkFill(g,pkS('M3 9 Q16 3 29 9 L29 14 Q16 8 3 14 Z'),PD_SILK2,{k:.8,inside:g=>pkHi(g,'M6 9.5 Q16 4.5 26 8.6',1.2,.6)});pkPost(g=>pkGlint(g,9,7,2))};
pdP['tg-wine']=g=>{pkFill(g,pkS('M13 2.5 L19 2.5 L19 10 Q27 13.5 27 21 Q27 29.5 16 29.5 Q5 29.5 5 21 Q5 13.5 13 10 Z'),'blood',{k:2,inside:(g,m)=>{pkHi(g,'M9 16.5 Q8 21 9.6 25',1.8,.65);pkFill(g,pkRect(12,2,8,4,1),'canvas',{k:.4})}});pkPost(g=>pkGlint(g,10.5,15,2.2))};
const pdStaves=(g,n)=>{for(let i=0;i<n;i++){const o=i*4.2-(n-1)*2.1;pkFill(g,pkTube([4+o,29-o*.2,27+o*.2,4+o],2.8,'round'),'wood',{k:.6})}};
pdP['tg-yew']=g=>{pdStaves(g,4);for(const t of [.35,.68]){const x=4+23*t,y=29-25*t;pkAt(g,x,y,45,1,g=>pkFill(g,pkRect(-8,-1.6,16,3.2,1),'cloth',{k:.4}))}};
pdP['tg-yewstaves']=g=>{pdStaves(g,5);for(const t of [.3,.7]){const x=4+23*t,y=29-25*t;pkAt(g,x,y,45,1,g=>pkFill(g,pkRect(-10,-1.6,20,3.2,1),'leather',{k:.4}))}};
pdP['tg-leather']=g=>{const P=(y,m)=>pkFill(g,pkS(`M3 ${y} Q16 ${y-2.6} 29 ${y} L29 ${y+6} Q16 ${y+3.4} 3 ${y+6} Z`),m,{k:.8,inside:(g,mm)=>pkHi(g,`M5 ${y+1} Q16 ${y-1.2} 27 ${y+1}`,.8,.4)});
 P(21,'darkwood');P(14.5,'leather');P(8,'leather');pkFill(g,pkRect(14,6,4,21.5,1),'brass',{k:.4,lw:PK.lw*.8})};
pdP['tg-hides']=g=>{pkFill(g,pkS('M8 4 Q16 6.5 24 4 L27 9 Q24 16 28 24 L25 29 Q16 26 7 29 L4 24 Q8 16 5 9 Z'),'leather',{k:1.8,inside:(g,m)=>{pkLine(g,'M16 7 Q14 16 16 26',1,m[1],.7);pkHi(g,'M8 7 Q10.5 9 9 16',1.2,.45)}});
 for(const [x,y] of [[6,5],[26,5],[5,27],[26,27]])pkFill(g,pkCirc(x,y,1.5),'iron',{ball:1,lw:.6})};
pdP['tg-gems']=g=>pkGem(g,16,16,13.5,'blue','diamond');
pdP['tg-ironbar']=g=>{const I=(x,y)=>pkFill(g,pkS(`M${x} ${y} L${x+2.5} ${y-4.5} L${x+11.5} ${y-4.5} L${x+14} ${y} Z`),'steel',{k:.9,inside:(g,m)=>pkHi(g,`M${x+3} ${y-3.4} L${x+11} ${y-3.4}`,.9,.7)});
 I(1.5,28);I(16.5,28);I(9,22.5);I(1.5,17);I(16.5,17);I(9,11.5);pkPost(g=>pkGlint(g,12,7.5,2.2))};
/* ======== monster parts (part-*), crafting ======== */
pdP['part-pelt']=g=>{pkFill(g,pkS('M16 3 Q19 3 19.5 6 L22 9 L29 7 L26 13 L24 15 L24 20 L26 22 L28.5 28 L22 25.5 L18 27 L16.5 31 L14 27 L10 25.5 L3.5 28 L6 22 L8 20 L8 15 L6 13 L3 7 L10 9 L12.5 6 Q13 3 16 3 Z'),'silver',{k:1.6,
  inside:(g,m)=>{pkFill(g,pkS('M16 7 Q19 9 19 16 Q19 22 16 26 Q13 22 13 16 Q13 9 16 7 Z'),'iron',{lw:0,k:.6,noRim:1});pkHi(g,'M10 11 Q9 15 10.5 19',1,.5)}})};
pdP['part-silk']=g=>{pkLine(g,'M20 20 Q24 26 30 30',1.3,'#efe6c8');pkFill(g,pkEll(14,13.5,9.4,11.5,-30),'white',{k:1.8,inside:(g,m)=>{for(const d of [-5,-1,3,7])pkLine(g,`M${4+d} ${9+d*.3} Q${14+d} ${4+d} ${22+d*.6} ${12+d}`,.8,m[1],.7);pkHi(g,'M7 9 Q9 5 13 4',1.4,.7)}})};
pdP['part-meat']=g=>{pkFill(g,pkTube([18,19,24.5,25.5],3.2,'round'),'bone',{k:.5});pkFill(g,pkCirc(25,27.6,2.6),'bone',{ball:1,k:.5});pkFill(g,pkCirc(27.3,25.2,2.6),'bone',{ball:1,k:.5});
 pkFill(g,pkS('M5 7 Q10 1.5 17 3 Q24 5 23 13 Q22 19 17 21 Q10 23 6 18 Q2 13 5 7 Z'),'blood',{k:2,inside:(g,m)=>{pkLine(g,'M8 10 Q12 8 16 10 M9 15 Q13 13 18 15',1.1,m[4],.55);pkHi(g,'M7 7.5 Q10 4.5 14 4.4',1.4,.7)}})};
pdP['part-trinket']=g=>{pkLine(g,'M4 2 Q8 14 16 16 Q24 14 28 2',1.2,PKM.leather[3]);for(const [x,y,mm] of [[5.6,7,'cloth'],[8.4,11.5,'gold'],[23.6,11.5,'mana'],[26.4,7,'chi']])pkFill(g,pkCirc(x,y,2),mm,{ball:1,k:.4,lw:.7});
 pkSkull(g,16,23,.66,'bone')};
pdP['part-bonedust']=g=>{pdSack(g,13,29.5,24,'leather','canvas',g=>pkFill(g,pdCloud([-3.5,-25,3.2,1.5,-27.5,3.8,5.5,-24.5,2.6]),'bone',{k:.6}));pkFill(g,pkS('M21 29.5 Q24 23.5 28 24 Q31 26 30.5 29.5 Z'),'bone',{k:.6})};
pdP['part-scrap']=g=>{pkFill(g,pkPoly([2,17,8,9,16,11,14.5,19,8,21]),'iron',{k:1.2,inside:(g,m)=>pkHi(g,'M4 16 L8.5 10.5',1,.6)});pkFill(g,pkPoly([11,29,13,22,22,20,24,26,18,30]),'steel',{k:1.2});
 pkFill(g,pkPoly([19,13,23,5,30,7,28.5,15,22.5,16]),'iron',{k:1,inside:(g,m)=>pkLine(g,'M23 7.5 L25 14',.8,m[0],.7)});pkPost(g=>pkGlint(g,16,22.5,2))};
pdP['part-venom']=g=>{pkFill(g,pkTube([16,5,16,1.5],2.6,'round'),'meat',{k:.4});pkFill(g,pkCirc(16,13,9),'blood',{ball:1,k:1.4,inside:(g,m)=>pkLine(g,'M10 12 Q13 9 16 11 M15 17 Q19 15 21 17',.9,m[1],.8)});pkDrop(g,16,31,9,'poison');pkPost(g=>pkGlint(g,12,9,2))};
const pdScale=(g,mat)=>pkFill(g,pkS('M16 2 Q27 8 27 17 Q27 26 16 30 Q5 26 5 17 Q5 8 16 2 Z'),mat,{k:1.8,inside:(g,m)=>{pkLine(g,'M16 6 L16 26',1.2,m[1],.8);for(const y of [11,17,23])pkLine(g,`M16 ${y} L10 ${y+3.5} M16 ${y} L22 ${y+3.5}`,.8,m[1],.6);pkHi(g,'M9.5 10 Q12 6 15 4.6',1.4,.6)}});
pdP['part-scale']=g=>{pdScale(g,'chi');pkPost(g=>pkGlint(g,11,9,2))};
pdP['part-wscale']=g=>{pdScale(g,'blood');pkPost(g=>pkGlint(g,11,9,2))};
pdP['part-tusk']=g=>{pkFill(g,pkTube(pkQ(5,28,25,25,27,3,14),[7,1.2],'round'),'bone',{k:.5,inside:(g,m)=>pkHi(g,'M7 25.5 Q20 21 23.5 7',1,.6)});pkFill(g,pkEll(5,28,3.2,3.2),'leather',{k:.5})};
pdP['part-owlhide']=g=>{pkFill(g,pkS('M4 8 L28 8 Q26 18 28 28 L4 28 Q6 18 4 8 Z'),'leather',{k:1.6,inside:(g,m)=>pkLine(g,'M9 12 L23 12 M8.5 24 L23.5 24',.8,m[1],.6)});
 for(let i=0;i<5;i++){const x=6+i*5;pkFill(g,pkS(`M${x-2.6} 9 Q${x} 1 ${x+2.6} 9 Z`),'canvas',{k:.4,lw:PK.lw*.8})}};
const PD_AMBER=['#4a2400','#a05a00','#e89a1c','#ffc85a','#fff4c8'];
pdP['part-sap']=g=>{pkGlow(g,16,19,13,'#ffb12e',.4);pkDrop(g,16,30,27,PD_AMBER)};
pdP['part-heartwood']=g=>{pkFill(g,pkCirc(16,16,13.5),'wood',{k:1.6,inside:(g,m)=>{g.lineWidth=.9;g.strokeStyle=m[0];g.globalAlpha=.6;for(const r of [11.4]){g.beginPath();g.arc(16,16,r,0,6.3);g.stroke()}g.globalAlpha=1}});
 pkFill(g,pkCirc(16,16,10.3),PD_ROOT,{lw:0,k:1,noRim:1,inside:(g,m)=>{g.lineWidth=.8;g.strokeStyle=m[1];g.globalAlpha=.7;for(const r of [4.2,7.4]){g.beginPath();g.arc(16,16,r,0,6.3);g.stroke()}g.globalAlpha=1}});
 pkGlow(g,16,16,7,'#ffd95a',.8);pkFill(g,pkCirc(16,16,3),'gold',{ball:1,k:.5,lw:.7})};
pdP['part-ogrehide']=g=>{pkFill(g,pkS('M5 6 L13 4 L18 6.5 L27 4.5 L28 14 L26 20 L28.5 27 L18 28.5 L12 26.5 L4 28 L5.5 19 L3.5 13 Z'),'skin',{k:1.8,inside:(g,m)=>{pkLine(g,'M10 10 L22 22',1,m[1],.9);for(let i=0;i<5;i++){const x=11+i*2.6,y=11+i*2.6;pkLine(g,`M${x-1.6} ${y+1.6} L${x+1.6} ${y-1.6}`,.8,PK.ink,.85)}}})};
pdP['part-ogrebone']=g=>pkAt(g,16,16,45,1,g=>pkFill(g,pkU(pkRect(-2.8,-10,5.6,20,1),pkCirc(-3,-11.5,3.8),pkCirc(3,-11.5,3.8),pkCirc(-3,11.5,3.8),pkCirc(3,11.5,3.8)),'bone',{k:1.2,inside:g=>pkHi(g,'M-1.4 -9 L-1.4 9',1,.6)}));
pdP['part-voidshard']=g=>{pkGlow(g,16,16,15,'#c49eff',.55);pkFill(g,pkPoly([19,2,26,12,14,30,7,19]),'void',{k:1.2,inside:(g,m)=>{g.fillStyle=m[3];g.globalAlpha=.7;g.fill(new Path2D('M19 2 L7 19 L14 30 L15 17 Z'));g.globalAlpha=1}});pkPost(g=>{pkGlint(g,13,14,2.6);pkGlint(g,27,24,1.8,'#e0c8ff')})};
pdP['part-wvenom']=g=>{pkFill(g,pkS('M13 3 L19 3 L19 11 Q27 14 27 21.5 Q27 29.5 16 29.5 Q5 29.5 5 21.5 Q5 14 13 11 Z'),'white',{k:1.4,inside:(g,m)=>{pkFill(g,pkS('M5 19 Q16 16 27 19 L27 30 L5 30 Z'),'poison',{lw:0,k:1,noRim:1});pkHi(g,'M9 15 Q8 19 9 24',1.6,.7)}});
 pkFill(g,pkRect(12,1.5,8,4,1),'wood',{k:.4});pkPost(g=>pkGlint(g,10,14,2))};
pdP['part-membrane']=g=>{pkFill(g,pkS('M3 5 Q12 8 29 4 L27 13 Q23 16 22 22 Q17 21 14 26 Q10 23 5 27 Q7 16 3 5 Z'),'cloth',{k:1.6,inside:(g,m)=>pkLine(g,'M3 5 L14 26 M14 7 L22 22 M22 5.5 L27 13',1.4,m[0],.7)});
 pkFill(g,pkTube([3,5,29,4],2.4,'round'),'bone',{k:.4,lw:PK.lw*.8})};
pdP.salve=g=>{pkFill(g,pkS('M8 12 L24 12 Q28.5 16 28 22 Q27.5 29.5 16 29.5 Q4.5 29.5 4 22 Q3.5 16 8 12 Z'),'bronze',{k:1.8,inside:g=>pkHi(g,'M7.5 17 Q6.5 20.5 7.5 24',1.4,.55)});
 pkFill(g,pkS('M7 11 Q9 2.5 16 3 Q23 2.5 25 11 Z'),'chi',{k:.9,inside:g=>pkHi(g,'M10 8 Q12 5 15.5 4.6',1.2,.6)});pkFill(g,pkRect(5.5,10.5,21,3.4,1.4),'leather',{k:.4,lw:PK.lw*.8})};
pdP.anvil=g=>{pkFill(g,pkRect(9,22,14,8,1),'wood',{k:.8});pkFill(g,pkS('M2 6 L23 6 Q30 6 31 9 Q26 10.5 23 13 L20 13 L20 18 L24 22.5 L8 22.5 L12 18 L12 13 Q5.5 12.5 2 6 Z'),'steel',{k:1.6,inside:g=>pkHi(g,'M4 7.4 L24 7.4',1.2,.8)});pkPost(g=>pkGlint(g,18,7,2.2))};
pdP.parts=g=>{pkFill(g,pkTube(pkQ(9,11,16,2,23,11,10),1.8,'round'),'leather',{k:.3,lw:PK.lw*.8});pkFill(g,pkS('M6 11 Q16 7 26 11 Q30 20 26 27 Q16 31 6 27 Q2 20 6 11 Z'),'leather',{k:2,inside:(g,m)=>pkHi(g,'M8 14 Q6.5 19 8 24',1.3,.5)});
 pkFill(g,pkS('M6 11 Q16 7 26 11 L24 18 Q16 15.5 8 18 Z'),'leather',{k:.8});pkFill(g,pkRect(13.5,14,5,5,1.2),'brass',{k:.5})};
/* ======== quarry (q-*), bosses, crises (cr-*) ======== */
const PD_SPID=['#0a1414','#1d3634','#33605a','#5a948a','#a8e0d4'];
pdP['q-wolf']=g=>{pkFill(g,pkS('M16 30 L10.5 25 L5.5 15 L4.5 2.5 L12 8.5 L16 7.6 L20 8.5 L27.5 2.5 L26.5 15 L21.5 25 Z'),'steel',{k:1.8,inside:(g,m)=>{
  pkFill(g,pkS('M7 5.5 L11 9 L8.6 12 Z M25 5.5 L21 9 L23.4 12 Z'),'meat',{lw:0,k:.4,noRim:1});pkFill(g,pkS('M11 18 Q16 15 21 18 L19 25 L16 28 L13 25 Z'),'white',{lw:PK.lw*.8,k:.6});
  pkFill(g,pkS('M9 14 L14 15.5 L12.5 17 Z'),'gold',{lw:.6,k:.2});pkFill(g,pkS('M23 14 L18 15.5 L19.5 17 Z'),'gold',{lw:.6,k:.2});g.fillStyle=PK.ink;g.fill(pkEll(16,24.6,2.4,1.6).p)}})};
pdP['q-spider']=g=>{for(const s of [1,-1])pkAt(g,16,0,0,1,g=>{g.scale(s,1);for(const [y0,x1,y1,x2,y2] of [[13,6,6,2,10],[15,4,13,1,19],[18,5,20,2,27],[20,8,25,6,30.5]])pkFill(g,pkTube([-3,y0,x1-16,y1,x2-16,y2],2.2,'round'),PD_SPID,{k:.4,lw:PK.lw*.85})});
 pkFill(g,pkEll(16,21,7,8.5),PD_SPID,{k:1.4,inside:g=>pkFill(g,pkS('M13.5 17 L18.5 17 L16 21 L18.5 25 L13.5 25 L16 21 Z'),'blood',{lw:.6,k:.3})});
 pkFill(g,pkCirc(16,11,4.6),PD_SPID,{ball:1,k:.8});g.fillStyle='#ff5050';for(const x of [14.4,17.6])g.fill(pkCirc(x,10,.9).p)};
pdP['q-serpent']=g=>{pkFill(g,pkTube(pkQ(6,29,30,22,14,17,10).concat(pkQ(14,17,2,11,14,8,10).slice(2)),[2.4,5.6],'round'),'chi',{k:1.2,inside:(g,m)=>pkLine(g,'M8 28 Q24 24 15 18.6',1,m[3],.7)});
 pkFill(g,pkEll(18.5,7,6.4,4.4,-12),'chi',{k:.9});g.fillStyle=PK.ink;g.fill(pkCirc(20,5.6,1.1).p);pkLine(g,'M24.5 8 L28.5 9.5 M27 9 L29.5 7.5 M27 9 L29 11.5',.9,PKM.blood[2])};
pdP['q-bear']=g=>{pkFill(g,pkS('M4 9 L3 2.5 L10 6 Q16 4 22 6 L29 2.5 L28 9 Q31 16 28 23 Q24 30 16 30 Q8 30 4 23 Q1 16 4 9 Z'),'leather',{k:1.8,inside:(g,m)=>{
  pkFill(g,pkS('M16 10 Q12 6 7 8.5 Q4 13 7 18 Q12 20 16 16 Q20 20 25 18 Q28 13 25 8.5 Q20 6 16 10 Z'),'canvas',{lw:PK.lw*.8,k:.6})}});
 for(const x of [10.5,21.5]){pkFill(g,pkCirc(x,13,3.6),'gold',{ball:1,k:.4,lw:PK.lw*.8});g.fillStyle=PK.ink;g.fill(pkCirc(x,13,1.6).p)}
 pkFill(g,pkS('M13 17.5 L19 17.5 L16 25 Z'),'brass',{k:.5})};
pdP['q-ent']=g=>{pkFill(g,pdCloud([7,9,6,16,6,7,25,9,6],[2,8,28,7]),'green',{k:1.4});pkFill(g,pkS('M7 13 L25 13 L26 27 L29 30 L3 30 L6 27 Z'),'wood',{k:1.6,inside:(g,m)=>{pkLine(g,'M10 14 L9.5 28 M22 14 L22.5 28',.9,m[1],.7);
  g.fillStyle=PK.ink;g.fill(pkS('M10 17.5 L14.5 18.5 L13.5 21 L10.5 20.5 Z M22 17.5 L17.5 18.5 L18.5 21 L21.5 20.5 Z M12 24.5 Q16 22.5 20 24.5 L19 27 Q16 26 13 27 Z').p);
  g.fillStyle='#7cf0d0';g.fill(pkCirc(12.4,19.4,.9).p);g.fill(pkCirc(19.6,19.4,.9).p)}})};
pdP['q-ogre']=g=>{pkFill(g,pkS('M8 5 Q16 1 24 5 Q29 9 29 17 Q29 26 22 29.5 L10 29.5 Q3 26 3 17 Q3 9 8 5 Z'),'skin',{k:2,inside:(g,m)=>{
  pkFill(g,pkS('M5 12.5 Q16 9 27 12.5 L27 15 Q16 12 5 15 Z'),m,{lw:PK.lw*.8,k:.4});g.fillStyle=PK.ink;g.fill(pkCirc(11.5,16.4,1.4).p);g.fill(pkCirc(20.5,16.4,1.4).p);
  pkFill(g,pkS('M14 17.5 L18 17.5 L19 21.5 L13 21.5 Z'),m,{lw:PK.lw*.8,k:.3});pkFill(g,pkS('M8.5 24 Q16 21.5 23.5 24 L23 26.5 Q16 25 9 26.5 Z'),'meat',{lw:PK.lw*.8,k:.3})}});
 pkFill(g,pkS('M9 25 L8 19.5 L11.5 24.5 Z'),'bone',{k:.3,lw:PK.lw*.8});pkFill(g,pkS('M23 25 L24 19.5 L20.5 24.5 Z'),'bone',{k:.3,lw:PK.lw*.8})};
const pdXBones=g=>{for(const a of [45,-45])pkAt(g,16,20,a,1,g=>pkFill(g,pkU(pkRect(-1.8,-12,3.6,24,1),pkCirc(-1.8,-12,2.4),pkCirc(1.8,-12,2.4),pkCirc(-1.8,12,2.4),pkCirc(1.8,12,2.4)),'bone',{k:.7}))};
pdP['q-dead']=g=>{pdXBones(g);pkSkull(g,16,13.5,.95,'bone')};
pdP['q-rift']=g=>{pkGlow(g,16,16,16,'#c49eff',.4);pkFill(g,pkS('M7 10 Q3 6 2 1.5 Q8 3.5 11 7.5 Q16 6 21 7.5 Q24 3.5 30 1.5 Q29 6 25 10 Q28.5 15 27 21 Q24 29.5 16 30 Q8 29.5 5 21 Q3.5 15 7 10 Z'),'void',{k:1.8,inside:(g,m)=>{
  g.fillStyle=PK.ink;g.fill(pkS('M8.5 15 L14.5 17.5 L13 20 L9 19 Z M23.5 15 L17.5 17.5 L19 20 L23 19 Z M9.5 23 Q16 27 22.5 23 Q21 27.5 16 28 Q11 27.5 9.5 23 Z').p);
  g.fillStyle='#ffb12e';g.fill(pkCirc(11.6,18.2,1.1).p);g.fill(pkCirc(20.4,18.2,1.1).p);g.fillStyle='#ffffff';g.fill(pkS('M12 24.6 L13.4 26.6 L14.6 25.2 Z M20 24.6 L18.6 26.6 L17.4 25.2 Z').p)}})};
pdP['q-gob']=g=>{pkFill(g,pkS('M8 11 L1 7 L3.5 14 L7 18 Q8 27 16 29 Q24 27 25 18 L28.5 14 L31 7 L24 11 Q20 6.5 16 6.5 Q12 6.5 8 11 Z'),'chi',{k:1.8,inside:(g,m)=>{
  g.fillStyle=PK.ink;g.fill(pkS('M9.5 14.5 L14.5 16 L13.5 18.5 L10 17.6 Z M22.5 14.5 L17.5 16 L18.5 18.5 L22 17.6 Z M10.5 22 Q16 25 21.5 22 Q20.5 26.5 16 27 Q11.5 26.5 10.5 22 Z').p);
  g.fillStyle='#ff3c30';g.fill(pkCirc(12.3,16.6,1).p);g.fill(pkCirc(19.7,16.6,1).p);g.fillStyle='#ffffff';g.fill(pkS('M12 22.8 L13.2 25 L14.4 23.4 Z M20 22.8 L18.8 25 L17.6 23.4 Z').p);pkLine(g,'M16 17 L15 20.5 L17 20.5',.8,m[1],.9)}})};
pdP['or-slayer']=g=>{const H=s=>pkAt(g,16,0,0,1,g=>{g.scale(s,1);pkFill(g,pkTube(pkQ(-5,9,-14,10,-14,1.5,10),[4.6,1.4],'round'),'bone',{k:.6})});H(1);H(-1);
 pkFill(g,pkS('M16 6 Q24 6 24 13 Q24 18 20 21 L19 29 Q16 31 13 29 L12 21 Q8 18 8 13 Q8 6 16 6 Z'),'bone',{k:1.6,inside:(g,m)=>{g.fillStyle=PK.ink;g.fill(pkS('M10.5 13 L14.5 14 L13.5 17 L11 16 Z M21.5 13 L17.5 14 L18.5 17 L21 16 Z').p);pkLine(g,'M14.5 25 L14.5 28 M17.5 25 L17.5 28',.9,m[1],.9)}});
 pkFill(g,pkS('M16 1 L18 6.5 L14 6.5 Z'),'gold',{k:.4})};
pdP.boss=g=>{pkSkull(g,16,19,1.05,'bone');pkFill(g,pkS('M5 10 L5 1.5 L10 6 L16 .5 L22 6 L27 1.5 L27 10 Z'),'gold',{k:1,inside:g=>pkGem(g,16,6.4,2,'blood','round')});
 g.fillStyle='#ff4040';for(const x of [11.8,20.2])g.fill(pkCirc(x,18.6,1.3).p);pkPost(g=>pkGlint(g,7,3.5,2.2))};
pdP['cr-sunder']=g=>{pkGlow(g,16,16,16,'#c49eff',.6);pkFill(g,pdRing(16,16,13.5,13.5,4.6),'void',{k:1.2});pkFill(g,pkCirc(16,16,8.9),'dark',{ball:1,k:1,noRim:1,lw:0});
 pkSwirl(g,16,16,8,['#1a0a34','#46268a','#8656d0','#c49eff','#ffffff'],1.3);pkPost(g=>pkGlint(g,9,8.5,2.4))};
pdP['cr-deadmarch']=g=>{pdXBones(g);pkSkull(g,16,13.5,.95,'bone');g.fillStyle='#7cf06a';for(const x of [12.2,19.8])g.fill(pkCirc(x,12.6,1.5).p);pkPost(g=>{pkGlow(g,12.2,12.6,4,'#7cf06a',.6);pkGlow(g,19.8,12.6,4,'#7cf06a',.6)})};
pdP['cr-horde']=g=>{const H=s=>pkAt(g,16,0,0,1,g=>{g.scale(s,1);pkFill(g,pkTube(pkQ(-8,8,-15,6,-14,-.5,8),[4.4,1.4],'round'),'bone',{k:.6})});H(1);H(-1);
 pkFill(g,pkS('M6 9 Q16 4 26 9 L27 21 Q22 30 16 30 Q10 30 5 21 Z'),'green',{k:1.8,inside:(g,m)=>{pkFill(g,pkS('M6 9 Q16 4 26 9 L26.5 15 Q16 11 5.5 15 Z'),'iron',{lw:PK.lw*.8,k:.6});
  g.fillStyle=PK.ink;g.fill(pkS('M9 16.5 L14.5 18 L13.5 20.5 L10 19.5 Z M23 16.5 L17.5 18 L18.5 20.5 L22 19.5 Z').p);g.fillStyle='#ffb12e';g.fill(pkCirc(12,18.8,.9).p);g.fill(pkCirc(20,18.8,.9).p)}});
 pkFill(g,pkS('M10.5 25 L11 21 L13 24.6 Z'),'bone',{k:.3,lw:PK.lw*.8});pkFill(g,pkS('M21.5 25 L21 21 L19 24.6 Z'),'bone',{k:.3,lw:PK.lw*.8})};
pdP['cr-barbarian']=g=>{pkHaft(g,16,30.5,16,14,3.2,'wood');pkFill(g,pkRect(13.6,14.5,4.8,3,1),'iron',{k:.4});const p=[];for(let i=0;i<20;i++){const a=i*Math.PI/10,R=i&1?7:11.5;p.push(16+Math.sin(a)*R,9.5-Math.cos(a)*R)}
 pkFill(g,pkPoly(p),'steel',{k:1});pkFill(g,pkCirc(16,9.5,7.2),'iron',{ball:1,k:1,lw:PK.lw*.8});pkPost(g=>pkGlint(g,13,6.5,2))};
/* ======== canvas users ======== */
/* the active unit's chevron over its head (74-anim.js), painted at N device px: brass for the player's units, madder for foes */
const PD_CHEV=new Map();
function pdChevCanvas(foe,N){N=Math.max(8,N|0);const k=(foe?1:0)+'|'+N;let c=PD_CHEV.get(k);if(c!==undefined)return c;
 c=pkRender(g=>pkFill(g,pkS('M2 8 L30 8 Q31.5 8 30.4 9.6 L17.4 26 Q16 27.6 14.6 26 L1.6 9.6 Q.5 8 2 8 Z'),foe?'cloth':'brass',{k:1.6,inside:()=>pkHi(g,'M5 10.4 L27 10.4',1.4,.7)}),N);
 if(PD_CHEV.size>16)PD_CHEV.clear();PD_CHEV.set(k,c);return c}
onArtChange(()=>PD_CHEV.clear());
