/* ================= COMPANY BANNER (shell) =================
   G.banner = {name, c1, c2, emblem, div, c3, shape}: c1 (field) and c2 (border, stripe and charge) are keys of BANNERC (PAL keys),
   emblem a key of EMBLEMS; the optional div (a key of BNDIV: plain, per pale, quarterly, ...), c3 (the division's second field
   colour) and shape (a key of BNSHAPE: swallowtail, banner, pennon, gonfalon) default to plain / a bone or sable c3 / swallowtail,
   which is exactly the old look, so old saves, houses and rivals keep their flags. bannerFix() fills every field.
   Public: BANNERC, EMBLEMS, BNDIV, BNSHAPE, BANNERDEF, bannerFix(b), bannerRows(banner), bannerHTML(banner,size), bannerCanvas(banner),
   bannerURL(banner,scale), emblemRows(key,c,field), emblemHTML(key,c,field,size), bnOf(houseOrRival), bnExtraFix(obj), bnVariety(seed,c1,c2),
   bnBlazon(b), bnPickHTML(state,setFn,rollFn), bannerEditSheet(back).
   Two looks: Detail Low (and the world map) draw the 24x32 pixel flag; Detail High paints the same flag in the painted icon style
   (06p-iconspaint.js: clean dark outline, one light from the upper left) at device resolution: a cloth hanging from a crossbar by
   tabs, folds and shading, the field and its division, the trim, a fringe or tails by shape, the emblem as vector art. The painted
   image is a CSS rule (<style id="bnr-hd">, disabled at Detail Low) over the pixel background, so switching Detail is live.
   Pixel art in PAL keys only; nothing here touches the game rnd() stream (cosmetic rolls use Math.random, houses/rivals a hash).
   Emblem rows: '#' charge, '+' its light, '-' its shade, '=' a cut-out showing the field's shade; the 1px '0' outline is added here.
   The newer emblems are vector shapes (BNVEC) rasterised to the same 16x16 rows at load. */
const BANNERC={
 '5':{n:'Verdigris',r:['7','5','6']},c:{n:'Brass',r:['b','c','d']},g:{n:'Madder',r:['f','g','h']},x:{n:'Azure',r:['X','x','F']},
 D:{n:'Violet',r:['G','D','C']},l:{n:'Bone',r:['m','l','r']},G:{n:'Sable',r:['0','G','o']},B:{n:'Forest',r:['3','B','A']},
 E:{n:'Ember',r:['K','E','y']},j:{n:'Russet',r:['i','j','k']},y:{n:'Saffron',r:['Y','y','e']},p:{n:'Steel',r:['o','p','q']},
 'β':{n:'Crimson',r:['α','β','γ'],dye:'crimson'},'ε':{n:'Wine',r:['δ','ε','ζ'],dye:'madder'},'θ':{n:'Rose',r:['η','θ','ι'],dye:'crimson'},'λ':{n:'Navy',r:['κ','λ','μ'],dye:'royal'},
 'ξ':{n:'Teal',r:['ν','ξ','ο'],dye:'verdigris'},'ρ':{n:'Plum',r:['π','ρ','σ'],dye:'violet'},'υ':{n:'Olive',r:['τ','υ','φ'],dye:'forest'},'ψ':{n:'Tawny',r:['χ','ψ','ω'],dye:'ember'},
 q:{n:'Argent',r:['p','q','r'],dye:'white'},F:{n:'Sky',r:['x','F','r'],dye:'sky'}};
/* the order the pickers show them in (light and dark, reds, yellows, greens, blues, purples) */
const BNORDER=['l','q','p','G','g','β','ε','θ','E','ψ','j','y','c','υ','B','5','ξ','F','x','λ','D','ρ'];
const BANNERDEF={name:'The Free Company',c1:'5',c2:'c',emblem:'swords',div:'plain',c3:'l',shape:'swallow'};
const EMBLEMS={
 swords:{n:'Crossed swords',r:['................','.++..........++.','.+#+........+#+.','..+#+......+#+..','...+#+....+#+...','....+#+..+#+....','.....+#++#+.....','......+##+......',
  '......+##+......','.....+#++#+.....','..-.+#+..+#+.-..','..-##+....+##-..','...-#......#-...','..-#-#....#-#-..','.-#-..........#.','................']},
 wolf:{n:'Wolf',r:['................','..........#..#..','.........##.##..','.........#####..','........+#####-.','.......+#=####-.','....+++######-..','..++#########-..',
  '.+###########-..','..-----######-..','.......+#####-..','.......+######-.','........+#####-.','.........+####-.','..........+###-.','................']},
 lion:{n:'Lion',r:['................','....#.#..#.#....','...#+#+##+#+#...','..#+########-#..','..#+#+####+#-#..','.#+#=##++##=#-#.','.#+##########-#.','.#+#+######+#-#.',
  '..#+##-##-##-#..','..#+#-====-#-#..','...#+#-==-#-#...','....#+####-#....','.....#+##-#.....','......####......','.......##.......','................']},
 tower:{n:'Tower',r:['................','...##.##.##.##..','...+#.+#.+#.+-..','...+#########-..','....+#######-...','....+###=###-...','....+###=###-...','....+#######-...',
  '....+#######-...','....+##=#=##-...','....+##=#=##-...','....+#######-...','....+##===##-...','...+###===###-..','...++#######--..','................']},
 skull:{n:'Skull',r:['................','.....######.....','...+########-...','..+##########-..','..+##########-..','..+#===##===#-..','..+#===##===#-..','..+#===##===#-..',
  '..+####=####-...','...+###=###-....','....+######-....','....+#=#=##-....','....+######-....','.....##.##......','................','................']},
 sun:{n:'Sun',r:['................','.......+#.......','..+#...+#...+#..','...+#..##..+#...','.....+####-.....','....+######-....','.++#+##++##-#--.','.+##+#+##+#-##-.',
  '....+######-....','....+######-....','.....+####-.....','...+#..##..-#...','..+#...+#...-#..','.......+#.......','................','................']},
 moon:{n:'Moon',r:['................','.....+###.......','...+###-........','..+###-.........','..+##-..........','.+###-..........','.+###-..........','.+###-..........',
  '.+###-..........','.+####-.........','..+####-.......#','..+######----##.','...+##########..','.....+######....','................','................']},
 stag:{n:'Stag',r:['................','.+.+......+.+...','.+.+..+...+.+..+','..++.+.....++.+.','...+++......+++.','....++##..##++..','......+####-....','......+#==#-....',
  '......+####-....','.......+##-.....','.......+##-.....','.......+##-.....','........##......','................','................','................']},
 raven:{n:'Raven',r:['................','.........+##....','........+####...','........+#=##++.','........+####...','.......+####....','..+++..+####....','.+#####+####-...',
  '..+##########-..','....+#########-.','......+######-..','........+###-...','........#..#....','.......##..##...','................','................']},
 oak:{n:'Oak',r:['................','.....+##.##.....','...+#####+##-...','..+##+######-#..','.+#####+######-.','.+##+#######+#-.','..+###########-.','.+#####+#####-..',
  '..+-##-####-#-..','....--+##----...','.......##-......','.......##-......','......+##-......','....++####--....','...+#-.##.-#-...','................']},
 anchor:{n:'Anchor',r:['................','.......##.......','......#==#......','......#==#......','.......##.......','....+######-....','.......##.......','.......##.......',
  '.......##.......','.+.....##.....-.','.+#....##....#-.','..+#...##...#-..','...+##.##.##-...','.....######.....','................','................']},
 crown:{n:'Crown',r:['................','................','..#....#....#...','.+#+..+#+..+#-..','..#...+#+...#...','..+#..###..#-...','..+##+###+##-...','..+#########-...',
  '..+##=##=##=#-..','..+#########-...','..----------....','..+#########-...','...+#######-....','................','................','................']},
 boar:{n:'Boar',r:['................','................','......+.+##.....','.....+#######-..','....+#########-.','...+#=########-.','..+###########-.','.l+###########-.',
  '.+-###########-.','..-+##########..','....###....###..','....##......##..','....--......--..','................','................','................']},
 rose:{n:'Rose',r:['................','......+##.......','....+#+####.....','...+#+##=###-...','..+##+#==##-#-..','..+#+#=##=#-#-..','..+##+####-##-..','...+###++###-...',
  '....+######-....','......+##-......','..++...##...--..','...++..##..--...','....+####--.....','.......##.......','................','................']},
 fleur:{n:'Fleur',r:['................','.......##.......','......+##-......','......+##-......','..++..+##-..--..','.+##+.+##-.-##-.','.+#..++##--..#-.','..+#.+####-.#-..',
  '...+########-...','....--####--....','...+#########...','....--+##---....','.....+#--#-.....','....+#-..-#-....','................','................']}
};
/* ---- vector emblems: shapes in a 32x32 box (y down), used by the painted flags (all emblems) and rasterised to 16x16 pixel rows
   for the emblems that have no hand-drawn rows. A part is {r: role, P: [polygon [x,y,...], ...]} or a line {r, d: 'svg path'}.
   Roles: b body (charge colour; consecutive b parts are one shape, inked only outside), b2 a second body layer over it (its own
   ink line), bd a darker body (manes), h a lighter part (muzzles, centres), w a light part with a full line (tusks, strings),
   c a cut-out in the field's shade (eyes, windows); lines: l ink, lc the charge's shade, lh a highlight. ---- */
function bnPath(d,seg){seg=seg||8;const t=String(d).match(/[MLHVQCZ]|-?(?:\d+\.?\d*|\.\d+)/g)||[],P=[];let cur=null,i=0,c='M',x=0,y=0,sx=0,sy=0;const n=()=>+t[i++];
 while(i<t.length){if(/[A-Z]/.test(t[i]))c=t[i++];
  if(c==='Z'){if(cur&&cur.length>4)P.push(cur);cur=null;x=sx;y=sy;continue}
  if(c==='M'){if(cur&&cur.length>4)P.push(cur);x=n();y=n();sx=x;sy=y;cur=[x,y];c='L';continue}
  if(!cur)cur=[x,y];
  if(c==='L'){x=n();y=n();cur.push(x,y)}else if(c==='H'){x=n();cur.push(x,y)}else if(c==='V'){y=n();cur.push(x,y)}
  else if(c==='Q'){const cx=n(),cy=n(),X=n(),Y=n();for(let k=1;k<=seg;k++){const s=k/seg,u=1-s;cur.push(u*u*x+2*u*s*cx+s*s*X,u*u*y+2*u*s*cy+s*s*Y)}x=X;y=Y}
  else if(c==='C'){const ax=n(),ay=n(),bx=n(),by=n(),X=n(),Y=n();for(let k=1;k<=seg;k++){const s=k/seg,u=1-s;cur.push(u*u*u*x+3*u*u*s*ax+3*u*s*s*bx+s*s*s*X,u*u*u*y+3*u*u*s*ay+3*u*s*s*by+s*s*s*Y)}x=X;y=Y}
  else i++}
 if(cur&&cur.length>4)P.push(cur);return P}
function bnEll(cx,cy,rx,ry,rot,n){n=n||28;const o=[],a=(rot||0)*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);for(let i=0;i<n;i++){const t=i/n*Math.PI*2,x=Math.cos(t)*rx,y=Math.sin(t)*ry;o.push(cx+x*ca-y*sa,cy+x*sa+y*ca)}return o}
function bnStar(cx,cy,r,n,ri,rot){const o=[],a0=(rot||0)*Math.PI/180;for(let i=0;i<n*2;i++){const a=a0+i*Math.PI/n,R=i&1?ri:r;o.push(cx+Math.sin(a)*R,cy-Math.cos(a)*R)}return o}
/* arc points (degrees, 0 = up, clockwise; a1 < a0 runs the other way) */
function bnArc(cx,cy,r,a0,a1,n){n=n||18;const o=[];for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n)*Math.PI/180;o.push(cx+Math.sin(a)*r,cy-Math.cos(a)*r)}return o}
function bnQpts(x0,y0,cx,cy,x1,y1,n){n=n||14;const o=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t;o.push(u*u*x0+2*u*t*cx+t*t*x1,u*u*y0+2*u*t*cy+t*t*y1)}return o}
/* a smooth curve through the points (Catmull-Rom) */
function bnSpline(p,seg){seg=seg||6;const n=p.length>>1,o=[],P=i=>{i=Math.max(0,Math.min(n-1,i));return[p[i*2],p[i*2+1]]};
 for(let i=0;i<n-1;i++){const a=P(i-1),b=P(i),c=P(i+1),d=P(i+2);for(let k=0;k<seg;k++){const t=k/seg,t2=t*t,t3=t2*t;
  o.push(.5*((2*b[0])+(-a[0]+c[0])*t+(2*a[0]-5*b[0]+4*c[0]-d[0])*t2+(-a[0]+3*b[0]-3*c[0]+d[0])*t3),.5*((2*b[1])+(-a[1]+c[1])*t+(2*a[1]-5*b[1]+4*c[1]-d[1])*t2+(-a[1]+3*b[1]-3*c[1]+d[1])*t3))}}
 o.push(p[n*2-2],p[n*2-1]);return o}
/* a stroke as a polygon: width w0 -> w1 along the points, round caps unless flat */
function bnTube(p,w0,w1,flat){w1=w1==null?w0:w1;const n=p.length>>1,L=[],R=[],D=[];
 for(let i=0;i<n;i++){const a=Math.max(0,i-1),c=Math.min(n-1,i+1);let dx=p[c*2]-p[a*2],dy=p[c*2+1]-p[a*2+1];const m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;D.push(dx,dy);
  const h=(w0+(w1-w0)*(n>1?i/(n-1):0))/2;L.push(p[i*2]-dy*h,p[i*2+1]+dx*h);R.push(p[i*2]+dy*h,p[i*2+1]-dx*h)}
 const o=L.slice(),cap=(i,h,dir)=>{const x=p[i*2],y=p[i*2+1],dx=D[i*2]*dir,dy=D[i*2+1]*dir,nx=-dy,ny=dx;for(let k=1;k<6;k++){const f=k/6*Math.PI;o.push(x+h*(nx*Math.cos(f)+dx*Math.sin(f)),y+h*(ny*Math.cos(f)+dy*Math.sin(f)))}};
 if(!flat)cap(n-1,w1/2,1);for(let i=n-1;i>=0;i--)o.push(R[i*2],R[i*2+1]);if(!flat)cap(0,w0/2,-1);return o}
/* a crescent: circle 1 minus circle 2 */
function bnCres(x1,y1,r1,x2,y2,r2){const dx=x2-x1,dy=y2-y1,d=Math.hypot(dx,dy),a=(r1*r1-r2*r2+d*d)/(2*d),h=Math.sqrt(Math.max(0,r1*r1-a*a)),ux=dx/d,uy=dy/d,px=x1+ux*a,py=y1+uy*a,
  I1=[px-uy*h,py+ux*h],I2=[px+uy*h,py-ux*h],ang=(cx,cy,P)=>Math.atan2(P[1]-cy,P[0]-cx),o=[],n=26;
 let a0=ang(x1,y1,I1),a1=ang(x1,y1,I2),far=Math.atan2(-uy,-ux);const sweep=(s,e,m)=>{let d1=e-s;while(d1<0)d1+=Math.PI*2;let dm=m-s;while(dm<0)dm+=Math.PI*2;return dm<=d1?d1:d1-Math.PI*2};
 let sw=sweep(a0,a1,far);for(let i=0;i<=n;i++){const t=a0+sw*i/n;o.push(x1+Math.cos(t)*r1,y1+Math.sin(t)*r1)}
 const b0=ang(x2,y2,I2),b1=ang(x2,y2,I1),near=Math.atan2(-uy,-ux);sw=sweep(b0,b1,near);for(let i=1;i<n;i++){const t=b0+sw*i/n;o.push(x2+Math.cos(t)*r2,y2+Math.sin(t)*r2)}return o}
const bnMirP=p=>{const o=[];for(let i=0;i<p.length;i+=2)o.push(32-p[i],p[i+1]);return o};
/* shift (and scale) every x,y pair of an absolute M/L/Q/C path */
const bnXf=(d,ox,oy,s)=>{s=s||1;let k=0;return String(d).replace(/-?(?:\d+\.?\d*|\.\d+)/g,v=>{const r=(k++&1)?(+v*s+oy):(+v*s+ox);return(+r.toFixed(2))+''})};
/* part builders: B(role, ...geometry) where geometry is an svg path string, a polygon or a list of polygons */
function bnPart(r){const P=[];for(let i=1;i<arguments.length;i++){const g=arguments[i];if(typeof g==='string')P.push.apply(P,bnPath(g));else if(Array.isArray(g)&&g.length&&Array.isArray(g[0]))P.push.apply(P,g);else if(Array.isArray(g))P.push(g)}return{r,P}}
const bnL=(r,d)=>({r,d});
const BNVEC={};
{const B=bnPart,L=bnL,E=bnEll,T=bnTube,M=bnMirP,S=bnStar;
 BNVEC.wolf=[B('b','M3.5 17.5 L7 13.5 Q11 11 14 9.5 L16 2.5 L19.5 8.5 L22.5 2.5 L24.5 9.5 Q28.5 13 28.5 19.5 L28 29.2 L18.5 29.2 Q18 24.5 14 22.5 L9 22.5 L5.5 21 Z'),
  B('c','M15.4 13.4 L19.6 12 L18.6 14.4 Z','M17 5.6 L18.6 8.8 L16.6 9.4 Z',E(4.7,17.5,1.2,1)),L('l','M5.6 20.4 L12.4 19.8'),L('lc','M22 15.5 Q24.2 20 22.6 24.5 M25.2 14.6 Q27.4 19.2 25.8 23.6')];
 BNVEC.lion=[B('bd',S(16,16.6,14.6,14,11.4)),B('b',E(9.4,8.6,2.9,2.7),E(22.6,8.6,2.9,2.7)),B('b2',E(16,17.6,8.6,9.6)),
  B('c','M10.6 15.6 Q12.5 13.6 14.4 15.4 Q12.6 16.8 10.6 15.6 Z',M(bnPath('M10.6 15.6 Q12.5 13.6 14.4 15.4 Q12.6 16.8 10.6 15.6 Z')[0]),'M13.8 19.6 H18.2 L16 22.4 Z'),
  L('l','M16 22.4 V24 M12.6 24.8 Q16 23.2 19.4 24.8'),L('lc','M11 12.4 Q12.6 11.4 14.2 12.2 M21 12.4 Q19.4 11.4 17.8 12.2')];
 BNVEC.tower=[B('b','M6 4 H11 V7.5 H13.5 V4 H18.5 V7.5 H21 V4 H26 V10.5 L24 12.5 V25 L26 27 V29.5 H6 V27 L8 25 V12.5 L6 10.5 Z'),
  B('c','M14.6 18.6 V14.8 Q16 12.6 17.4 14.8 V18.6 Z','M12.8 29.5 V25.6 Q16 20.8 19.2 25.6 V29.5 Z'),L('lc','M8 12.5 H24 M8 17 H12.6 M19.4 17 H24 M8 21.6 H11.4 M20.6 21.6 H24')];
 BNVEC.sun=[B('b',S(16,16,15,12,10.4,15)),B('b2',E(16,16,8.6,8.6)),B('c',E(13.2,14.6,1.1,1.3),E(18.8,14.6,1.1,1.3)),L('l','M12.6 18.4 Q16 21.4 19.4 18.4')];
 BNVEC.moon=[B('b',bnCres(14.6,16.6,12.6,21,12,10.2)),L('lh','M6.4 10 Q3.6 16 6.6 22.4')];
 {const beam=T(bnQpts(13,13.6,7,10,5.6,2.6),2.8,1.8),t1=T([8.4,10,3.6,8.2],2,1.6),t2=T([7.2,7,9.8,2.8],2,1.6);
  BNVEC.stag=[B('b',beam,t1,t2,M(beam),M(t1),M(t2),'M12.6 14.6 L6.4 12.8 Q7.8 16.8 12.4 17.4 Z',M(bnPath('M12.6 14.6 L6.4 12.8 Q7.8 16.8 12.4 17.4 Z')[0])),
   B('b2','M16 29.6 Q13 29.2 12.4 25 L11 17.4 Q10.8 13.8 13.4 13 H18.6 Q21.2 13.8 21 17.4 L19.6 25 Q19 29.2 16 29.6 Z'),
   B('c',E(13.4,18,1,1.3),E(18.6,18,1,1.3),E(16,27.4,1.9,1.2)),L('lc','M16 20.4 V24.6')]}
 BNVEC.raven=[B('b','M7.5 26.5 Q4.5 21 8 15.5 Q11.5 11 17 11.5 L18.6 8.4 Q19.8 4 23.6 4 Q26.6 4.4 27.2 7.4 L30.6 8.8 L27 10.4 Q26 13.4 24.2 15.4 Q24 21.6 19 24.4 L13.8 25.8 L4.4 30 Z',
   T([15.5,24.5,14.8,29],1.6),T([19,23.5,19.6,29],1.6),T([12.6,29.2,17,29.2],1.4),T([17.6,29.2,22,29.2],1.4)),
  B('b2','M9 17 Q13.5 13.2 20 14.6 Q22.4 19.4 17.6 22.8 L7.6 27 Q6.4 21.6 9 17 Z'),B('c',E(23.8,7.2,1.1,1.1)),L('lc','M10.6 22.6 L17.4 18 M11.6 25.2 L18.4 20.6'),L('l','M27.2 8.9 L29.8 8.8')];
 BNVEC.oak=[B('b','M13.6 15 L13.2 23.5 Q12.8 27 9.4 29.6 H22.6 Q19.2 27 18.8 23.5 L18.4 15 Z'),
  B('b2',E(16,10,7.6,6.8),E(9,13.6,5.6,5.2),E(23,13.6,5.6,5.2),E(11,7,4.8,4.4),E(21,7,4.8,4.4),E(16,15.6,6.4,4.6)),
  L('lc','M8.6 12.4 Q10.8 10.2 13.2 11.2 M18.8 11.2 Q21.2 9.6 23.4 11.8 M13.6 6.6 Q16 5 18.4 6.6 M12.6 16.4 Q16 18.2 19.4 16.4'),L('l','M16 20 V27')];
 {const fl='M3.2 15.4 L9.4 17.4 L5.6 21.6 Z';
  BNVEC.anchor=[B('b',E(16,5,3.5,3.5),T([16,7.6,16,26.4],3.2,3.2,1),T([9,11,23,11],2.8),T(bnArc(16,16.4,10.6,250,110,22),3),fl,M(bnPath(fl)[0])),B('c',E(16,5,1.5,1.5))]}
 BNVEC.crown=[B('b','M4.5 25 L3.5 10.5 L10 16.5 L16 6.4 L22 16.5 L28.5 10.5 L27.5 25 Z',E(3.5,9.2,2.2,2.2),E(16,4.8,2.3,2.3),E(28.5,9.2,2.2,2.2)),
  B('b2','M3.8 20.4 H28.2 V26.2 H3.8 Z'),B('c',E(10,23.3,1.3,1.4),E(16,23.3,1.6,1.6),E(22,23.3,1.3,1.4))];
 BNVEC.boar=[B('b','M2.8 17.2 Q3.6 14.6 7 14 L9.2 10.6 Q14 7.6 21 8.4 Q27.2 9.4 29.2 14 Q30.2 19.4 27.6 22.2 L27.2 27.6 L24.4 27.6 L24 23.4 L14.4 23.8 L13.8 27.6 L11 27.6 L10.6 22.6 Q6.6 21.6 5 19.6 L2.8 19.2 Z'),
  B('b2','M12.2 10.6 L14.2 5.6 L16.6 10.8 Z'),B('w','M5.6 18.8 Q3.8 16.4 6.2 14.2 Q6.2 16.6 7.8 18.4 Z'),B('c',E(9.8,13.6,1,1),E(3.4,17.6,.6,.8)),L('lc','M14 15 Q18 17.6 24 15.4 M22.6 12 Q25 14 25.6 17.6')];
 {const pet=[];for(let k=0;k<5;k++){const a=k*Math.PI*2/5;pet.push(E(16+Math.sin(a)*4.8,11-Math.cos(a)*4.8,4.9,4.9))}
  BNVEC.rose=[B('b',T([16,15,16,29.6],2.4,2.4,1),'M16 23.4 Q10 18.6 5.6 21.8 Q10.4 26.6 16 23.4 Z','M16 20.4 Q22 15.6 26.4 18.8 Q21.6 23.6 16 20.4 Z'),B('b2',pet),B('h',E(16,11,3.2,3.2)),B('c',E(16,11,1.3,1.3)),
   L('lc','M16 4.2 V6.8 M9.6 9 L12 10 M22.4 9 L20 10 M12 16.6 L13.4 14.6 M20 16.6 L18.6 14.6')]}
 {const sp='M13.2 19.5 Q6 19.6 3.8 14.6 Q2.4 9.6 6.2 8 Q4.8 11.8 7.8 13.8 Q10.6 15.8 13.6 15.6 Z';
  BNVEC.fleur=[B('b','M16 2.5 Q20.8 8 19.8 14 Q19 18 16 20.5 Q13 18 12.2 14 Q11.2 8 16 2.5 Z',sp,M(bnPath(sp)[0]),'M12.2 21.5 L10.8 27.5 Q13.4 26.2 16 22.6 Q18.6 26.2 21.2 27.5 L19.8 21.5 Z','M14.6 21.5 L16 29.6 L17.4 21.5 Z'),
   B('b2','M9.2 18.2 H22.8 Q23.6 20 22.8 21.8 H9.2 Q8.4 20 9.2 18.2 Z'),L('lc','M16 5.6 V17.4')]}
 /* ---- the newer emblems ---- */
 BNVEC.bear=[B('b',E(7.6,8.6,4,4),E(24.4,8.6,4,4)),B('b2',E(16,18,11.2,10.2)),B('c',E(7.9,8.9,1.8,1.8),E(24.1,8.9,1.8,1.8)),B('h',E(16,22,5.6,4.4)),
  B('c','M13.4 19.6 Q16 18 18.6 19.6 Q17.6 21.8 16 22 Q14.4 21.8 13.4 19.6 Z',E(11.2,15,1.3,1.5),E(20.8,15,1.3,1.5)),L('l','M16 22 V23.8 M13.4 24.8 Q16 23.4 18.6 24.8')];
 {const tuft='M6.6 4.2 L12.2 9.6 L7 12 Z';
  BNVEC.owl=[B('b',E(16,18.4,10,11.4),tuft,M(bnPath(tuft)[0]),T([12.6,28.6,12,30.4],1.8),T([19.4,28.6,20,30.4],1.8)),B('h',E(11.8,14.2,4.8,4.8),E(20.2,14.2,4.8,4.8)),B('c',E(11.8,14.4,2.3,2.3),E(20.2,14.4,2.3,2.3)),
   B('b2','M14.6 17.8 H17.4 L16 21.8 Z'),L('lc','M10.6 23.2 Q12.8 25 15 23.2 M17 23.2 Q19.2 25 21.4 23.2 M13 26.6 Q15 28.2 17 26.6 M8 17 Q7.6 22 10 26.4 M24 17 Q24.4 22 22 26.4')]}
 /* the eagle displayed: wings raised, the primaries spread from the pinion like fingers under a band of coverts, head in profile
    to dexter, a fanned tail and the talons */
 {const arm=bnQpts(13.8,12.2,11,3.4,3.6,2.8,12),aq=t=>{const u=1-t;return[u*u*13.8+2*u*t*11+t*t*3.6,u*u*12.2+2*u*t*3.4+t*t*2.8]},
   ts=[1,.8,.6,.42,.24],tips=[[.9,7.4],[.8,11.6],[1.8,15.6],[4.2,19],[7.8,21.4]],F=[],sep=[],f=v=>(+v).toFixed(2);
  ts.forEach((t,i)=>{const r=aq(t);F.push(T([r[0],r[1],tips[i][0],tips[i][1]],3.6,2.6))});
  for(let i=0;i<ts.length-1;i++){const a=aq(ts[i]),b=aq(ts[i+1]),rx=(a[0]+b[0])/2,ry=(a[1]+b[1])/2,mx=(tips[i][0]+tips[i+1][0])/2-rx,my=(tips[i][1]+tips[i+1][1])/2-ry;
   for(const s of [1,-1]){const X=x=>s>0?x:32-x;sep.push(`M${f(X(rx+mx*.4))} ${f(ry+my*.4)} L${f(X(rx+mx*.94))} ${f(ry+my*.94)}`)}}
  const base='M13.8 12.2 L8 5 L3.6 2.8 L2 8 L2 15 L5 18.6 L8.4 20.2 L12.8 19.4 Z',cov=T(arm,4.6,3.4),
   leg=[T([14.2,21.2,10.8,24.4],2.4,1.8),T([10.8,24.4,7.8,23.8],1.3,.9),T([10.8,24.4,8.2,26.6],1.3,.9),T([10.8,24.4,10.6,27.6],1.3,.9)],
   tail='M14.2 20.6 L11.4 28.4 L13.6 27.4 L14.8 29.8 L16 28.2 L17.2 29.8 L18.4 27.4 L20.6 28.4 L17.8 20.6 Z';
  BNVEC.eagle=[B('b',F,F.map(M),base,M(bnPath(base)[0]),leg,leg.map(M),tail),B('b2',cov,M(cov)),
   B('b2','M16 9.4 Q19.6 10.4 19.4 14.8 Q19.2 19.6 17.4 22 L14.6 22 Q12.8 19.6 12.6 14.8 Q12.4 10.4 16 9.4 Z',E(16.4,6.8,3,2.9),'M14 5.2 L10.2 6.4 Q10.2 9 12.4 8.6 L14.4 8.6 Z'),
   B('c',E(15.4,6,.85,.85)),L('l','M10.4 7.1 L13.4 7.4'),
   L('lc',sep.join(' ')+' M14.2 14.6 Q16 15.8 17.8 14.6 M14.4 17.6 Q16 18.8 17.6 17.6 M16 22.4 V27.4'),
   L('lh','M12.2 9.6 Q9.8 4 4.4 2.4 M19.8 9.6 Q22.2 4 27.6 2.4')]}
 /* the dragon rampant to dexter: horned head with open jaws, one bat wing raised behind, a raised foreclaw, the legs, a coiled tail and its barb */
 {const wing='M15 13.4 L18.8 6.4 Q19.8 4.6 21.6 4 L29 1.2 Q27.4 5.2 30.8 8.4 Q27 10.6 29.6 14.8 Q24.4 13 19.8 15.6 Q17 15.2 15 13.4 Z';
  BNVEC.dragon=[B('b','M2.2 7.8 Q3.8 5.2 7.6 4.6 L10.4 4.4 Q12.8 5 13 7.6 Q13.4 10.2 15.6 11.4 Q20.6 13.4 21.6 18.6 Q22 22.6 18.6 24 Q14.6 24.4 12.4 21.4 Q10 18 9.6 15 Q9.4 12.6 8 11.4 L5.4 11.6 L2.8 10.6 L6.6 8.8 Z',
   T(bnQpts(10.2,5.4,12.8,2.6,15.8,1.6,6),2.2,.7),T([11.4,15.2,7.6,16.8,4.8,14.6],2.6,1.8),T([4.8,14.6,3,13.8],1.2,.8),T([4.8,14.6,3.4,16],1.2,.8),
   T([19,21,17.4,25.6,15.8,28.6],3.6,2.4),T([15.8,28.6,12.6,29.2],2.2,1.4),T([15.6,22.4,12,25,9.6,24.2],2.8,1.8),T([9.6,24.2,8,23],1.2,.8),
   T(bnSpline([20.4,21.4, 24.6,23.6, 27.4,27.6, 30,26.4, 29.8,23],5),3.4,1.4),'M27.8 23.6 L29.8 19.4 L31.8 23.6 L29.8 22.6 Z'),
   B('b2',wing),B('c',E(8.8,6.8,.95,.85)),L('l','M3.6 8.4 L6.4 8.8'),
   L('lc','M21.4 5 L30.2 8.4 M21 5.6 L28.8 14 M10.8 14.4 Q12.2 19.6 16.6 22.6 M13 22.8 Q11.6 23.2 11.2 21.8'),L('lh','M16.4 12.4 L20 5.6 Q21 4.6 28 1.8')]}
 /* the serpent nowed: a loop knotted in its body, the head raised to dexter with a forked tongue, scales along the back */
 {const sp=bnSpline([19,6.4, 22.6,8.6, 23.2,13, 20.4,17.6, 15,21, 9.6,21.4, 6.6,17.6, 8,13.4, 12.6,12.6, 17.4,15.4, 21.6,20.4, 24.4,24.8, 22.6,28.6, 17,29.4, 12.4,28, 10,25.6],6),
   n=sp.length>>1,wd=i=>5-3.8*(i/(n-1)),edge=(i0,i1,s)=>{let d='';for(let i=i0;i<=i1;i++){const a=Math.max(0,i-1),c=Math.min(n-1,i+1);let dx=sp[c*2]-sp[a*2],dy=sp[c*2+1]-sp[a*2+1];const m=Math.hypot(dx,dy)||1,h=wd(i)/2*s;
     d+=(i===i0?'M':'L')+(sp[i*2]-dy/m*h).toFixed(2)+' '+(sp[i*2+1]+dx/m*h).toFixed(2)+' '}return d},
   sc=[];for(let i=5;i<n-6;i+=4){const a=i-1,c=i+1;let dx=sp[c*2]-sp[a*2],dy=sp[c*2+1]-sp[a*2+1];const m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;const h=wd(i)*.26,x=sp[i*2],y=sp[i*2+1];
     sc.push(`M${(x-dy*h-dx*.9).toFixed(2)} ${(y+dx*h-dy*.9).toFixed(2)} L${x.toFixed(2)} ${y.toFixed(2)} L${(x+dy*h-dx*.9).toFixed(2)} ${(y-dx*h-dy*.9).toFixed(2)}`)}
  BNVEC.serpent=[B('b',T(sp,5,1.2)),B('b2','M18.6 3.6 Q14 2.4 9.6 4.4 Q7.6 5.8 9.4 7.4 Q13.6 9.4 18.4 9.2 Q21.6 8.4 21.4 6.2 Q21 4.2 18.6 3.6 Z'),B('c',E(14.4,5.4,1,.9)),
   L('l',edge(51,62,1)+edge(51,62,-1)+'M9 6 L5.6 6 L3.6 4.2 M5.6 6 L3.6 7.8'),L('lc',sc.join(' ')),L('lh','M10.6 4.6 Q14 3.4 17.6 4.2')]}
 BNVEC.castle=[B('b','M3 29.6 V11 H4.6 V8.4 H6.6 V11 H7.8 V8.4 H9.8 V11 H11.4 V14.6 H12.6 V12.4 H14.6 V14.6 H17.4 V12.4 H19.4 V14.6 H20.6 V11 H22.2 V8.4 H24.2 V11 H25.4 V8.4 H27.4 V11 H29 V29.6 Z'),
  B('c','M13 29.6 V23.2 Q16 19.4 19 23.2 V29.6 Z','M6.2 17 V14.6 Q7.2 13.2 8.2 14.6 V17 Z','M23.8 17 V14.6 Q24.8 13.2 25.8 14.6 V17 Z'),L('lc','M11.4 14.6 V29.4 M20.6 14.6 V29.4 M3.2 21.4 H11.2 M20.8 21.4 H28.8')];
 BNVEC.key=[B('b',E(16,7.6,5.8,5.8),T([16,12,16,29.4],3.4,3.4,1),'M12.6 12.2 H19.4 V14.8 H12.6 Z','M17.6 21.8 H23 V29.4 H17.6 Z'),B('c',E(16,7.6,2.5,2.5),'M19.8 24.2 H23 V26.4 H19.8 Z')];
 BNVEC.ship=[B('b',T([16,2.2,16,20],2),'M2.4 19 H29.6 L27 25.6 Q16 29 5 25.6 Z','M3.2 19.2 V15.2 H8.6 V19.2 Z','M23.4 19.2 V15.2 H28.8 V19.2 Z','M16.8 2.2 L22.4 3.8 L16.8 5.4 Z'),
  B('b2','M8.2 5.8 Q16 4 23.8 5.8 Q22.4 11 23.8 16.4 Q16 14.8 8.2 16.4 Q9.6 11 8.2 5.8 Z'),L('lc','M16 5.2 V15.4 M9 10.8 Q16 9.4 23 10.8'),L('l','M4.4 22.2 Q16 24.6 27.6 22.2')];
 BNVEC.hammer=[B('b',T([16,10.6,16,29.4],3.4,3.4,1),E(16,29.4,2.4,1.4)),B('b2','M5.6 4.4 H26.4 Q27.4 7.6 26.4 10.8 H5.6 Q4.6 7.6 5.6 4.4 Z'),L('lc','M9.6 4.8 V10.4 M22.4 4.8 V10.4 M14.4 21 L17.6 19.4 M14.4 24.4 L17.6 22.8')];
 BNVEC.axe=[B('b',T([18.2,3.2,18.2,29.8],3)),B('b2','M18.8 6.4 Q12 4.4 4.4 8.4 Q2.6 15 7.8 21.2 Q11.8 18.4 13 14.8 L18.8 14.6 Z'),L('lh','M4.9 9.6 Q3.6 15 7.6 20.2'),L('lc','M13 14.8 Q12.2 10 13.6 6.6')];
 BNVEC.bow=[B('w',T([10.4,3.4,10.4,28.6],1.7)),B('b',T(bnQpts(10,3,34,16,10,29,20),3.4),T([4.6,16,27,16],1.9),'M25.6 12.8 L31 16 L25.6 19.2 Z'),
  B('bd','M4.4 16 L2 12.8 L7 12.8 L9.4 16 L7 19.2 L2 19.2 Z'),B('b2','M20.6 13.8 H24 V18.2 H20.6 Z')];
 BNVEC.trident=[B('b',T([16,11,16,30],2.8,2.8,1),T([7.6,4.4,7.6,9,9.4,11.6,16,12.6,22.6,11.6,24.4,9,24.4,4.4],2.8),T([16,12,16,6],2.8,2.8,1),
   'M5.2 6 L7.6 1.8 L10 6 Z','M13.6 7 L16 2.2 L18.4 7 Z','M22 6 L24.4 1.8 L26.8 6 Z'),B('b2','M13.4 12.8 H18.6 V15.6 H13.4 Z')];
 BNVEC.star=[B('b',S(16,17,14.8,5,6.2)),L('lc','M16 17 L16 5 M16 17 L27.4 13.4 M16 17 L23 26.6 M16 17 L9 26.6 M16 17 L4.6 13.4')];
 {const G=[];for(const tip of [[9.6,6.4],[16,3.6],[22.4,6.4]]){const bx=16,by=26,dx=tip[0]-bx,dy=tip[1]-by,l=Math.hypot(dx,dy),ux=dx/l,uy=dy/l,a=Math.atan2(uy,ux)*180/Math.PI+90;
   for(const f of [.5,.62,.74,.86])for(const s of [-1,1])G.push(E(bx+dx*f-uy*s*1.5,by+dy*f+ux*s*1.5,1,2,a+s*22));G.push(E(bx+dx*.98,by+dy*.98,1,2.1,a))}
  BNVEC.wheat=[B('b',T([16,29.4,9.8,7],1.7),T([16,29.4,16,4],1.7),T([16,29.4,22.2,7],1.7)),B('b2',G),B('h','M12 20.6 Q16 22 20 20.6 L20.2 23.4 Q16 24.8 11.8 23.4 Z')]}
 {const H=[];for(const a of [250,214,146,110])H.push(E(16+Math.sin(a*Math.PI/180)*9.8,15-Math.cos(a*Math.PI/180)*9.8,.85,1.2));
  BNVEC.horseshoe=[B('b',T(bnArc(16,15,9.8,302,58,24),6.4,6.4,1),'M4.6 6.6 H11.6 V10.2 H4.6 Z','M20.4 6.6 H27.4 V10.2 H20.4 Z'),B('c',H),L('lh','M7.8 13 Q7 21 12.6 24')]}
 BNVEC.cross=[B('b','M10 3 H22 Q18.6 9 17.8 14.2 Q23 13.4 29 10 V22 Q23 18.6 17.8 17.8 Q18.6 23 22 29 H10 Q13.4 23 14.2 17.8 Q9 18.6 3 22 V10 Q9 13.4 14.2 14.2 Q13.4 9 10 3 Z'),L('lh','M11.6 4.4 H16 M4.4 11.6 V16')];
 BNVEC.flame=[B('b',bnXf('M0 0 C-8 0 -11 -6 -10 -11 C-9 -15 -6 -17 -6 -21 C-3 -19 -2 -16 -2 -14 C-1 -18 1 -23 0 -28 C5 -24 8 -19 7 -14 C9 -15 10 -17 10 -19 C12 -15 12 -10 10 -6 C8 -2 4 0 0 0 Z',16,30)),
  B('h',bnXf('M0 -2 C-5 -2 -6.5 -5.5 -6 -8.5 C-5.5 -11.5 -3 -12.5 -2.5 -15.5 C-.5 -12.5 .5 -11.5 1 -14 C4 -11.5 6 -8.5 5 -5.5 C4 -3 2.5 -2 0 -2 Z',16,30))];
 BNVEC.chalice=[B('b','M6 4 H26 Q26.4 13.6 19.4 16.4 L17.6 17 V22.6 Q17.8 25.2 22.4 26.6 V29.4 H9.6 V26.6 Q14.2 25.2 14.4 22.6 V17 L12.6 16.4 Q5.6 13.6 6 4 Z'),
  B('b2',E(16,20,2.9,1.6)),B('c',E(16,9.4,1.8,1.8)),L('lh','M8.6 6 Q9 11.4 13 13.8'),L('lc','M6.4 7 H25.6')];
}
/* the newer emblems' names and order (the hand-drawn fifteen come first) */
const BNNEW=[['eagle','Eagle'],['bear','Bear'],['dragon','Dragon'],['owl','Owl'],['serpent','Serpent'],['castle','Castle'],['key','Key'],['ship','Ship'],['hammer','Hammer'],
 ['axe','Axe'],['bow','Bow'],['trident','Trident'],['star','Star'],['wheat','Wheat'],['horseshoe','Horseshoe'],['cross','Cross'],['flame','Flame'],['chalice','Chalice']];
/* vector -> 16x16 rows: 2x2 samples a pixel (half of them in = filled); the body's upper-left edge is '+', its lower-right '-' */
function bnInPoly(P,x,y){let c=false;for(let i=0,j=P.length-2;i<P.length;j=i,i+=2){const xi=P[i],yi=P[i+1],xj=P[j],yj=P[j+1];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}
function bnRaster(V){const at=(x,y)=>{let r='.';for(const p of V){if(!p.P)continue;let hit=false;for(const P of p.P)if(bnInPoly(P,x,y)){hit=true;break}if(!hit)continue;
   const k=p.r==='c'?'=':p.r==='h'?'+':p.r==='w'?'l':'#';if(k==='#'||k==='l'||r!=='.')r=k}return r};
 const g=[];for(let y=0;y<16;y++){const row=[];for(let x=0;x<16;x++){const n={};let f=0;for(let j=0;j<2;j++)for(let i=0;i<2;i++){const k=at(x*2+.5+i,y*2+.5+j);if(k!=='.'){f++;n[k]=(n[k]||0)+1}}
   let best='.',bn=0;for(const k of ['#','l','+','='])if((n[k]||0)>bn||(n[k]||0)===bn&&bn>0&&k!=='#'){best=k;bn=n[k]||0}row.push(f>=2?best:'.')}g.push(row)}
 const on=(x,y)=>x>=0&&y>=0&&x<16&&y<16&&g[y][x]!=='.';
 return g.map((r,y)=>r.map((k,x)=>{if(k!=='#')return k;const ul=!on(x-1,y)||!on(x,y-1),dr=!on(x+1,y)||!on(x,y+1);return ul&&!dr?'+':dr&&!ul?'-':k}).join(''))}
/* hand-drawn rows where the rasterised shape is too fine at 16 px */
const BNHAND={wheat:['................','.......+#.......','....+#.+#-.+#...','....+#-+#-+#-...','.....+#+#-#-....','....+#-+#-+#-...','.....+#+#+#-....','....+#-+#-+#-...','.....+#+#+#-....','......+###-.....','......++++-.....','......+###-.....','.....+#-#-#-....','....+#-.#-.#-...','...+#-..#-..#-..','................']};
/* hand-drawn rows for the dragon, the serpent and the eagle: the same designs as their vector drawings, pixel by pixel */
Object.assign(BNHAND,{dragon:['................','......+......+#.','..+##+......+##.','.+#=##-....+##-.','.+#--##...+##-#.','..-.+##-.+###-..','....+##-+###-#..','.+#-+#######-...',
  '..+-+######-....','.....+####-..+..','......+###-.+#-.','...+#-+##-#..#..','......+#-.+-.#..','......+#-..+#-..','....+##-........','................'],
 serpent:['................','....+##-........','..+##=##+-......','.-.--####+#-....','..........+#-...','..........+#-...','....+##-..+-....','...+-..+#.......',
  '..+#....+-......','..+#..+-.+#-....','...+##-...+#-...','...........+#-..','...........+#-..','......+-..+#-...','.......+###-....','................'],
 eagle:['................','.+.....+#.....+.','.#+..++=#-...+#.','.##+..-##-..+##.','.#-#+.+##-.+#-#.','..##-++##-+-##..','.##-##+##-##-##.','.#-##-+--#-##-#.',
  '..##-#+##-#-##..','.---##+##-##---.','...---+##----...','.....-+##--.....','.....++##--.....','...#+.+#--.#-...','....-.+..-.-....','................']
});
for(const [k,n] of BNNEW)if(!EMBLEMS[k])EMBLEMS[k]={n,r:BNHAND[k]||bnRaster(BNVEC[k])};
/* the painted emblems: generic from BNVEC; the swords and the skull use the kit's own parts */
const BNEP={swords:(g,M)=>{for(const s of [-1,1])pkSword(g,16+s*6.4,22.4,s*-40,{len:21,w:5.2,mat:M,hilt:M,gripMat:bnShift(M,-1),guard:11,grip:4.6})},
 skull:(g,M)=>pkSkull(g,16,16,1.28,M)};
/* ---- divisions of the field (c3 is the second colour) and flag shapes. Division regions are polygons in the field box
   (u across 0..1, v down 0..1), shared by the pixel flag (cell centres) and the painted one (paths); the bordure follows the edge. ---- */
const BNDIV={plain:{n:'Plain'},pale:{n:'Per pale',p:[[.5,-1,2,-1,2,2,.5,2]]},fess:{n:'Per fess',p:[[-1,.5,2,.5,2,2,-1,2]]},bend:{n:'Per bend',p:[[-1,-1,2,2,-1,2]]},
 quarter:{n:'Quarterly',p:[[.5,-1,2,-1,2,.5,.5,.5],[-1,.5,.5,.5,.5,2,-1,2]]},chevron:{n:'Per chevron',p:[[-1,1.74,.5,.45,2,1.74,2,3,-1,3]]},
 saltire:{n:'Saltire',p:[[-1.13,-.87,1.87,2.13,2.13,1.87,-.87,-1.13],[2.13,-.87,-.87,2.13,-1.13,1.87,1.87,-1.13]]},
 cross:{n:'Cross',p:[[.38,-1,.62,-1,.62,2,.38,2],[-1,.33,2,.33,2,.52,-1,.52]]},chief:{n:'Chief',p:[[-1,-1,2,-1,2,.27,-1,.27]]},canton:{n:'Canton',p:[[-1,-1,.42,-1,.42,.36,-1,.36]]},
 bordure:{n:'Bordure',bord:1},barry:{n:'Barry',p:[1,3,5].map(k=>[-1,k/6,2,k/6,2,(k+1)/6,-1,(k+1)/6])},paly:{n:'Paly',p:[1,3,5].map(k=>[k/6,-1,(k+1)/6,-1,(k+1)/6,2,k/6,2])}};
const BNSHAPE={swallow:{n:'Swallowtail'},banner:{n:'Fringed banner'},pennon:{n:'Pennon'},gonfalon:{n:'Gonfalon'}};
function bnDivAt(div,u,v){const D=BNDIV[div];if(!D||!D.p)return false;for(const P of D.p)if(bnInPoly(P,u,v))return true;return false}
/* a second field colour that differs from both: bone, else sable, brass, madder */
function bnC3(c1,c2){for(const k of ['l','G','c','g','x'])if(k!==c1&&k!==c2)return k;return'l'}
/* clean any banner object (old saves, tampered data). The new fields are filled with the old look's defaults. */
function bannerFix(b,name){const o=b&&typeof b==='object'?b:{},d=BANNERDEF;
 const c1=BANNERC[o.c1]?o.c1:d.c1;let c2=BANNERC[o.c2]?o.c2:d.c2;if(c2===c1)c2=c1==='c'?'5':'c';let c3=BANNERC[o.c3]?o.c3:'';if(!c3||c3===c1||c3===c2)c3=bnC3(c1,c2);
 const nm=typeof o.name==='string'&&o.name.trim()?o.name:typeof o.n==='string'&&o.n.trim()?o.n:'';
 return{name:nm?nm.trim().slice(0,28):name||d.name,c1,c2,emblem:EMBLEMS[o.emblem]?o.emblem:d.emblem,div:BNDIV[o.div]?o.div:'plain',c3,shape:BNSHAPE[o.shape]?o.shape:'swallow'}}
/* the banner of a house, a rival, the East (objects with n, c1, c2, emblem and maybe div, c3, shape) */
function bnOf(h){return h&&typeof h==='object'?{name:h.name||h.n,c1:h.c1,c2:h.c2,emblem:h.emblem,div:h.div,c3:h.c3,shape:h.shape}:null}
/* drop invalid optional fields from a stored house / rival (save repair); valid ones stay */
function bnExtraFix(o){if(!o||typeof o!=='object')return o;if(o.div!==undefined&&!BNDIV[o.div])delete o.div;if(o.shape!==undefined&&!BNSHAPE[o.shape])delete o.shape;
 if(o.c3!==undefined&&(!BANNERC[o.c3]||o.c3===o.c1||o.c3===o.c2))delete o.c3;return o}
/* deterministic variety for a new house or rival (a string hash, never the game stream): {div, c3, shape} */
function bnVariety(seed,c1,c2,plainW){let h=2166136261>>>0;const s=String(seed);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
 h=Math.imul(h^h>>>16,0x85ebca6b)>>>0;h=Math.imul(h^h>>>13,0xc2b2ae35)>>>0;h=(h^h>>>16)>>>0||1;   // mix: seeds differ only in a digit or two
 const R=()=>{h^=h<<13;h>>>=0;h^=h>>>17;h^=h<<5;h>>>=0;return h/4294967296},dv=Object.keys(BNDIV).filter(k=>k!=='plain'),sh=Object.keys(BNSHAPE);
 const div=R()<(plainW==null?.3:plainW)?'plain':dv[Math.floor(R()*dv.length)],cs=Object.keys(BANNERC).filter(k=>k!==c1&&k!==c2),c3=cs[Math.floor(R()*cs.length)]||bnC3(c1,c2);
 return{div,c3,shape:sh[Math.floor(R()*sh.length)]}}
/* words for a banner: "Brass crossed swords on verdigris, per pale bone · Pennon" */
function bnBlazon(b){b=bannerFix(b);const C=k=>BANNERC[k].n;return`${C(b.c2)} ${EMBLEMS[b.emblem].n.toLowerCase()} on ${C(b.c1).toLowerCase()}${b.div!=='plain'?`, ${BNDIV[b.div].n.toLowerCase()} ${C(b.c3).toLowerCase()}`:''}${b.shape!=='swallow'?` · ${BNSHAPE[b.shape].n}`:''}`}
function bnOutline(rows){const h=rows.length,w=rows[0].length,on=(x,y)=>y>=0&&y<h&&x>=0&&x<w&&rows[y][x]!=='.';
 return rows.map((r,y)=>{let s='';for(let x=0;x<w;x++)s+=on(x,y)?r[x]:(on(x-1,y)||on(x+1,y)||on(x,y-1)||on(x,y+1))?'0':'.';return s})}
/* an emblem in PAL keys: charge in ramp c ([dark,mid,light]), cut-outs in the field's shade */
function emblemRows(key,c,field){const E=EMBLEMS[key]||EMBLEMS[BANNERDEF.emblem],R=(BANNERC[c]||BANNERC.c).r,F=(BANNERC[field]||BANNERC['5']).r;
 const m={'#':R[1],'+':R[2],'-':R[0],'=':F[0],l:R[2]};return bnOutline(E.r.map(r=>r.replace(/[.]/g,'.').split('').map(ch=>ch==='.'?'.':(m[ch]||R[1])).join('')))}
/* the flag: 24 x 32 art px. A crossbar on a finial, a field of c1 with a c2 border and a band across the top, the emblem in the middle,
   a swallowtail below (or the shape's bottom). When c1 and c2 are the same colour the charge is drawn in bone so it still reads.
   A division paints part of the field in c3 (field box x 2..21, y 7..30). The plain swallowtail is the original drawing, pixel for pixel. */
const BN_W=24,BN_H=32;
function bannerRows(banner,noEm){const b=bannerFix(banner),A=BANNERC[b.c1].r,Cc=b.c2===b.c1?'l':b.c2,C=BANNERC[Cc].r,Dr=BANNERC[b.c3].r,g=[];
 for(let y=0;y<BN_H;y++)g.push(new Array(BN_W).fill('.'));const set=(x,y,k)=>{if(x>=0&&y>=0&&x<BN_W&&y<BN_H)g[y][x]=k};
 // crossbar with brass finials
 for(let x=1;x<BN_W-1;x++){set(x,1,'j');set(x,2,'i')}set(0,1,'c');set(0,2,'b');set(BN_W-1,1,'c');set(BN_W-1,2,'b');set(0,0,'d');set(BN_W-1,0,'d');
 const x0=2,x1=BN_W-3,y0=3,y1=BN_H-2,dv=b.div,bord=dv==='bordure',fd=(x,y)=>dv!=='plain'&&!bord&&bnDivAt(dv,(x+.5-x0)/20,(y+.5-7)/24),FR=new Set();
 let inside,edge;
 if(b.shape==='swallow'){   // cloth: x 2..21, y 3..30 with a swallowtail notch
  const notch=y=>{const d=y-(y1-6);return d<0?-1:Math.min(5,d)},mid=(x0+x1)/2;
  inside=(x,y)=>{if(x<x0||x>x1||y<y0||y>y1)return false;const n=notch(y);return!(n>=0&&Math.abs(x+.5-mid-.5)<=n)};
  edge=(x,y)=>{const n=notch(y);return x<=x0+1||x>=x1-1||y<=y0+3||(n>=0&&Math.abs(x+.5-mid-.5)<=n+2)||(n<0&&y>=y1-1)}}
 else{const yb=b.shape==='banner'?y1-2:y1;
  inside=(x,y)=>{if(x<x0||x>x1||y<y0||y>yb)return false;const c=Math.abs(x+.5-12);
   if(b.shape==='pennon'){if(y<19)return true;const hw=10-(y-18)*9.5/12;return c<=hw}
   if(b.shape==='gonfalon'){if(y<25)return true;if(x===8||x===15)return false;if(y===y1){const t=x<8?[2,7]:x<15?[9,14]:[16,21];return x!==t[0]&&x!==t[1]}}
   return true};
  edge=(x,y)=>{if(y<=y0+3||x<=x0+1||x>=x1-1)return true;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]])if(!inside(x+dx,y+dy))return true;return false};
  if(b.shape==='banner')for(let x=x0;x<=x1;x++){FR.add(x+','+(y1-1));if(!(x&1))FR.add(x+','+y1)}}
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(FR.has(x+','+y)){set(x,y,y===y1?'b':(x&1?'b':'c'));continue}if(!inside(x,y))continue;
  const e=edge(x,y),R=!e&&(fd(x,y)||bord&&y>y0+3&&(()=>{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(!inside(x+dx,y+dy)||edge(x+dx,y+dy))return true;return false})())?Dr:A;
  let k=e?C[1]:R[1];if(!e&&(x===x0+2))k=R[2];if(!e&&(x===x1-2||y===y1-7&&b.shape==='swallow'&&!(y-(y1-6)>=0)))k=R[0];
  if(e&&(x===x0))k=C[2];if(e&&x===x1)k=C[0];if(e&&b.shape!=='swallow'&&x>x0&&x<x1&&y>y0+3){if(!inside(x+1,y)||!inside(x,y+1))k=C[0];else if(!inside(x-1,y))k=C[2]}
  if(y===y0+3&&x>x0+1&&x<x1-1)k=C[0];set(x,y,k)}
 // emblem centred on the field
if(!noEm){const E=emblemRows(b.emblem,Cc,b.c1),ex=4,ey=b.shape==='pennon'?8:9;for(let y=0;y<16;y++)for(let x=0;x<16;x++){const k=E[y][x];if(k!=='.')set(ex+x,ey+y,k)}}
 return bnOutline(g.map(r=>r.join('')))}
function bannerKey(b){b=bannerFix(b);return'bn:'+b.c1+b.c2+b.emblem+(b.div!=='plain'?'.'+b.div+b.c3:'')+(b.shape!=='swallow'?'.'+b.shape:'')}
function bannerCanvas(banner,scale){const b=bannerFix(banner);return typeof pxScaled==='function'?pxScaled(bannerKey(b),bannerRows(b),scale||1):null}
function bannerURL(banner,scale,noEm){const b=bannerFix(banner);return typeof pxURL==='function'?pxURL(bannerKey(b)+(noEm?'~':''),bannerRows(b,noEm),scale||1):''}

/* ================= PAINTED FLAGS (Detail High) =================
   Drawing space 48 x 64 units (the pixel flag's 24 x 32 at 2 units a pixel). Materials are 5-tone ramps made from each BANNERC colour. */
const BNMAT=new Map();
function bnHexMix(a,b,t){const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16),f=s=>Math.round(((A>>s)&255)*(1-t)+((B>>s)&255)*t);return'#'+((1<<24)|f(16)<<16|f(8)<<8|f(0)).toString(16).slice(1)}
function bnMat(k){let m=BNMAT.get(k);if(m)return m;const R=(BANNERC[k]||BANNERC.c).r.map(x=>PAL[x]||'#888888');m=[bnHexMix(R[0],'#000000',.45),R[0],R[1],R[2],bnHexMix(R[2],'#ffffff',.6)];BNMAT.set(k,m);return m}
/* a ramp one step darker (-1) or lighter (+1) */
function bnShift(M,d){return d<0?[bnHexMix(M[0],'#000000',.3),M[0],M[1],M[2],M[3]]:[M[1],M[2],M[3],M[4],'#ffffff']}
function bnShape(P){const p=new Path2D(),b=[1e9,1e9,-1e9,-1e9];for(let Q of P){let ar=0;for(let i=0,j=Q.length-2;i<Q.length;j=i,i+=2)ar+=(Q[j]-Q[i])*(Q[j+1]+Q[i+1]);if(ar<0){const R=[];for(let i=Q.length-2;i>=0;i-=2)R.push(Q[i],Q[i+1]);Q=R}for(let i=0;i<Q.length;i+=2){const x=Q[i],y=Q[i+1];i?p.lineTo(x,y):p.moveTo(x,y);if(x<b[0])b[0]=x;if(y<b[1])b[1]=y;if(x>b[2])b[2]=x;if(y>b[3])b[3]=y}p.closePath()}return{p,b,u:P.length>1?1:0}}
/* pkFill for a shape of overlapping parts (tubes over a body): the kit's shade and rim bands cut the shape with evenodd, which
   toggles where the parts overlap, so a union gets its bands from a scratch canvas instead (the union, minus its shifted copy) */
let BNSCR=null;
function bnFillU(g,S,M,k){if(!S.u||typeof document!=='object'||!g.canvas||!g.getTransform)return pkFill(g,S,M,{k});pkFill(g,S,M,{k,noShade:1,noRim:1});
 const W=g.canvas.width,H=g.canvas.height;if(!BNSCR)BNSCR=document.createElement('canvas');if(BNSCR.width!==W||BNSCR.height!==H){BNSCR.width=W;BNSCR.height=H}const q=BNSCR.getContext('2d'),T=g.getTransform();if(!q)return;
 const band=(sh,col,a)=>{const v=pkVec(g,sh*PK_L[0],sh*PK_L[1]);q.setTransform(1,0,0,1,0,0);q.globalCompositeOperation='source-over';q.clearRect(0,0,W,H);q.setTransform(T);q.fillStyle=col;q.fill(S.p);
  q.globalCompositeOperation='destination-out';q.translate(v[0],v[1]);q.fill(S.p);q.globalCompositeOperation='source-over';g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=a;g.drawImage(BNSCR,0,0);g.restore()};
 band(k*2.2,M[0],.22);band(k,M[0],.42);band(-k*.75,M[4],.5)}
/* paint an emblem in the 32-unit box: charge ramp M, field ramp F (cut-outs) */
function bnEmPaint(g,key,M,F){if(BNEP[key])return BNEP[key](g,M,F);const V=BNVEC[key]||BNVEC.tower;let i=0;
 const Fc=[bnHexMix(F[0],PK.ink,.5),F[0],F[1],F[2],F[3]];
 while(i<V.length){const p=V[i];
  if(p.d){if(p.r==='lh')pkHi(g,p.d,1,.45);else pkLine(g,p.d,p.r==='l'?.95:.8,p.r==='l'?PK.ink:M[1],p.r==='l'?.9:.85);i++;continue}
  const P=[];let j=i;while(j<V.length&&V[j].P&&V[j].r===p.r){P.push.apply(P,V[j].P);j++;if(p.r!=='b')break}i=j;const S=bnShape(P);
  if(p.r==='b'||p.r==='b2')bnFillU(g,S,M,p.r==='b'?1.3:1);else if(p.r==='bd')bnFillU(g,S,bnShift(M,-1),1.3);
  else if(p.r==='h')pkFill(g,S,bnShift(M,1),{k:.7,lw:PK.lw*.7,noShade:0});else if(p.r==='w')pkFill(g,S,bnShift(M,1),{k:.6});
  else if(p.r==='c')pkFill(g,S,Fc,{k:.5,noRim:1,lw:PK.lw*.7})}}
/* cloth outlines by shape (units); the field box is x 4..44, y 12.5..62 */
const BNCLOTH={swallow:'M4 7 H44 V62 H39.4 L24 47.6 L8.6 62 H4 Z',banner:'M4 7 H44 V57 H4 Z',pennon:'M4 7 H44 V37 Q44 45 24 63 Q4 45 4 37 Z',
 gonfalon:'M4 7 H44 V56 Q44 62 38 62 Q32 62 32 56 V51.5 H30 V56 Q30 62 24 62 Q18 62 18 56 V51.5 H16 V56 Q16 62 10 62 Q4 62 4 56 Z'};
const BNFB=[4,12.5,40,49.5];
function bnDivPath(div){const D=BNDIV[div],p=new Path2D();if(!D||!D.p)return null;const [X,Y,W,H]=BNFB;for(const P of D.p){for(let i=0;i<P.length;i+=2){const x=X+P[i]*W,y=Y+P[i+1]*H;i?p.lineTo(x,y):p.moveTo(x,y)}p.closePath()}return p}
/* fill with a ramp's gradient along the light (upper left lit), no line */
function bnWash(g,p,M){const gr=g.createLinearGradient(4,7,44,62);gr.addColorStop(0,M[3]);gr.addColorStop(.45,M[2]);gr.addColorStop(1,M[1]);g.fillStyle=gr;g.fill(p)}
function bnPaint(g,banner,noEm){const b=bannerFix(banner),A=bnMat(b.c1),C=bnMat(b.c2===b.c1?'l':b.c2),D=bnMat(b.c3),cl=new Path2D(BNCLOTH[b.shape]||BNCLOTH.swallow),S={p:cl,b:[4,7,44,63]};
 // crossbar (dark wood) on gilt finials
 pkHaft(g,3.4,4.4,44.6,4.4,2.5,'darkwood');for(const x of [2.6,45.4])pkFill(g,pkCirc(x,4.4,2.1),'gold',{ball:1,k:.6});
 // the cloth: field, division, bordure, trim, hem, emblem, then the folds and the light over all of it
 g.save();g.clip(cl);bnWash(g,cl,A);
 const dp=bnDivPath(b.div);if(dp){bnWash(g,dp,D);g.save();g.lineWidth=.7;g.strokeStyle=PK.ink;g.globalAlpha=.55;g.stroke(dp);g.restore()}
 if(b.div==='bordure'){g.save();g.lineWidth=13.4;g.strokeStyle=PK.ink;g.globalAlpha=.6;g.stroke(cl);g.globalAlpha=1;g.lineWidth=12.6;const gr=g.createLinearGradient(4,7,44,62);gr.addColorStop(0,D[3]);gr.addColorStop(.45,D[2]);gr.addColorStop(1,D[1]);g.strokeStyle=gr;g.stroke(cl);g.restore()}
 g.save();g.lineWidth=5.2;g.strokeStyle=PK.ink;g.stroke(cl);g.lineWidth=4.2;const tg=g.createLinearGradient(4,7,44,62);tg.addColorStop(0,C[3]);tg.addColorStop(.5,C[2]);tg.addColorStop(1,C[1]);g.strokeStyle=tg;g.stroke(cl);g.restore();
 {const hm=pkRect(0,6,48,6.6,0);g.fillStyle=PK.ink;g.fillRect(0,12.1,48,.9);const gr=g.createLinearGradient(0,6,0,12.6);gr.addColorStop(0,C[3]);gr.addColorStop(.6,C[2]);gr.addColorStop(1,C[1]);g.fillStyle=gr;g.fill(hm.p);
  g.globalAlpha=.5;g.fillStyle=C[4];g.fillRect(0,7.2,48,.7);g.globalAlpha=1}
 if(!noEm){const pn=b.shape==='pennon',sc=pn?.8:.9,cy=pn?30.5:33.5;pkAt(g,24-16*sc,cy-16*sc,0,sc,g=>bnEmPaint(g,b.emblem,C,A))}
 {const f=g.createLinearGradient(4,0,44,0),st=[[0,'rgba(255,255,255,.16)'],[.12,'rgba(255,255,255,0)'],[.27,'rgba(0,0,0,.2)'],[.42,'rgba(255,255,255,.12)'],[.6,'rgba(0,0,0,.18)'],[.76,'rgba(255,255,255,.08)'],[.9,'rgba(0,0,0,.12)'],[1,'rgba(0,0,0,.32)']];
  for(const [o,c] of st)f.addColorStop(o,c);g.fillStyle=f;g.fillRect(0,7,48,57);
  const v=g.createLinearGradient(0,12.5,0,64);v.addColorStop(0,'rgba(0,0,0,.3)');v.addColorStop(.12,'rgba(0,0,0,0)');v.addColorStop(.8,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.22)');g.fillStyle=v;g.fillRect(0,12.5,48,52);
  const band=(sh,col,a)=>{const q=new Path2D();q.rect(-20,-20,90,110);q.addPath(cl,new DOMMatrix([1,0,0,1,sh*PK_L[0],sh*PK_L[1]]));g.globalAlpha=a;g.fillStyle=col;g.fill(q,'evenodd');g.globalAlpha=1};
  band(3.2,'#000000',.16);band(1.5,'#000000',.24);band(-1.2,'#ffffff',.22)}
 g.restore();
 g.lineJoin='round';g.lineWidth=1.25;g.strokeStyle=PK.ink;g.stroke(cl);
 // tabs over the bar, the fringe of a banner
 for(const x of [8.5,18.8,29.2,39.5]){const T=pkRect(x-2.6,1.6,5.2,8.4,1.6);pkFill(g,T,C,{k:.7,lw:PK.lw*.9,inside:(g,m)=>{g.fillStyle=PK.ink;g.globalAlpha=.35;g.fillRect(x-2.6,6.4,5.2,.8);g.globalAlpha=1}})}
 if(b.shape==='banner'){const G=pkMat('gold');pkFill(g,pkRect(4,56.4,40,2.2,.6),'gold',{k:.5,lw:PK.lw*.8});for(let x=5;x<43.6;x+=1.95){const a=Math.round((x-5)/1.95)&1;pkFill(g,pkRect(x,58.4,1.45,a?4.4:4.9,.6),'gold',{k:.3,lw:.55,noRim:1})}}
 return b}
/* a non-square painted render with the kit's outline pass (the silhouette thickened in ink, nudged down-right) */
function bnRender(f,W,H,uw){if(typeof document==='undefined'||typeof Path2D!=='function')return null;const s=W/uw,L=pxCanvas(W,H);if(!L)return null;const q=L.getContext('2d');if(!q||!q.setTransform)return null;
 q.setTransform(s,0,0,s,0,0);const u0=PK.u;PK.u=s;PK.post=[];try{f(q)}catch(e){PK.post=null;PK.u=u0;return null}
 const out=pxCanvas(W,H),o=out.getContext('2d'),S=pxCanvas(W,H),sg=S.getContext('2d');sg.drawImage(L,0,0);sg.globalCompositeOperation='source-in';sg.fillStyle=PK.ink;sg.fillRect(0,0,W,H);
 const r=PK.ol*.85*s;for(let i=0;i<16;i++){const a=i*Math.PI/8;o.drawImage(S,Math.cos(a)*r+r*.12,Math.sin(a)*r+r*.2)}o.drawImage(L,0,0);
 if(PK.post.length){o.setTransform(s,0,0,s,0,0);for(const fn of PK.post){try{fn(o)}catch(e){}}o.setTransform(1,0,0,1,0,0)}PK.post=null;PK.u=u0;return out}
function bnPaintCanvas(banner,H,noEm){H=Math.max(24,H|0);const W=Math.round(H*.75);return bnRender(g=>{g.translate(.6,.5);g.scale(46.8/48,63/64);bnPaint(g,banner,noEm)},W,H,48)}
function bnEmCanvas(key,c,field,px){const M=bnMat(c),F=bnMat(field);return typeof pkRender==='function'?pkRender(g=>{g.translate(1.6,1.6);g.scale(.9,.9);bnEmPaint(g,key,M,F)},Math.max(16,px|0)):null}
/* painted rules: one class per banner (and size bucket), its image in <style id="bnr-hd"> (disabled at Detail Low). Painting is
   synchronous for the first ~16 ms of a burst (so the first look is already painted), the rest on the next frames. */
const BNHD={st:null,id:new Map(),n:0,done:new Set(),want:new Map(),q:[],raf:0,t:-1e9,spent:0};
function bnHdOK(){return typeof document==='object'&&!!document&&typeof Path2D==='function'&&typeof window==='object'&&hdArt()}
function bnBucket(css,sq){const d=typeof window==='object'&&window.devicePixelRatio||1,need=css*d,L=sq?[24,32,48,64,96,128,192]:[48,64,96,128,192,256,384];for(const v of L)if(v>=need-.5)return v;return L[L.length-1]}
function bnHdSheet(){if(BNHD.st)return BNHD.st;try{const s=document.createElement('style');s.id='bnr-hd';(document.head||document.body).appendChild(s);s.disabled=!hdArt();BNHD.st=s}catch(e){BNHD.st=null}return BNHD.st}
function bnHdRule(id){const w=BNHD.want.get(id);if(!w||BNHD.done.has(id))return;BNHD.done.add(id);let u='';
 try{const c=w.em?bnEmCanvas(w.em,w.c,w.f,w.px):bnPaintCanvas(w.b,w.px,w.noEm);if(c)u=c.toDataURL()}catch(e){u=''}
 if(!u){bnHdFree(id);return}const s=bnHdSheet();if(!s||!s.sheet)return;try{s.sheet.insertRule(`.bnr.${id}{background-image:url(${u})!important;image-rendering:auto!important}`,s.sheet.cssRules.length)}catch(e){}}
// a painting that failed: drop its hold so the pixel flag shows
function bnHdFree(id){const s=BNHD.st;if(!s||!s.sheet)return;try{const R=s.sheet.cssRules;for(let i=R.length-1;i>=0;i--)if(R[i].selectorText==='.bnr.'+id)s.sheet.deleteRule(i)}catch(e){}}
// a flag waiting its turn shows nothing rather than the pixel flag, so it does not flash from low to high resolution (the painted rule, added later, wins)
function bnHdHold(id){const s=bnHdSheet();if(!s||!s.sheet)return;try{s.sheet.insertRule(`.bnr.${id}{background-image:none!important}`,s.sheet.cssRules.length)}catch(e){}}
function bnHdTick(){BNHD.raf=0;if(!bnHdOK()){BNHD.q.length=0;return}const t0=performance.now();while(BNHD.q.length&&performance.now()-t0<10)bnHdRule(BNHD.q.shift());if(BNHD.q.length)BNHD.raf=requestAnimationFrame(bnHdTick)}
function bnHdNeed(id){if(BNHD.done.has(id)||!bnHdOK())return;const now=performance.now();if(now-BNHD.t>80){BNHD.t=now;BNHD.spent=0}
 const w=BNHD.want.get(id),big=!!(w&&w.px>=64);                   // a big flag (the setup and banner previews) is always painted at once: it is what the eye is on
 if(big||BNHD.spent<24){bnHdRule(id);BNHD.spent+=performance.now()-now;return}
 if(!BNHD.q.includes(id)){BNHD.q.push(id);bnHdHold(id)}if(!BNHD.raf&&typeof requestAnimationFrame==='function')BNHD.raf=requestAnimationFrame(bnHdTick)}
function bnHdClass(key,w){let id=BNHD.id.get(key);if(!id){if(BNHD.id.size>900){BNHD.id.clear();BNHD.want.clear();BNHD.done.clear();BNHD.q.length=0;if(BNHD.st)try{BNHD.st.textContent=''}catch(e){}}
  id='bh'+(++BNHD.n).toString(36);BNHD.id.set(key,id);BNHD.want.set(id,w)}bnHdNeed(id);return id}
onArtChange(()=>{const s=BNHD.st;if(s)s.disabled=!hdArt();if(!bnHdOK())return;for(const id of BNHD.want.keys())if(!BNHD.done.has(id)&&!BNHD.q.includes(id))BNHD.q.push(id);
 if(BNHD.q.length&&!BNHD.raf&&typeof requestAnimationFrame==='function')BNHD.raf=requestAnimationFrame(bnHdTick)});
/* <i> with the flag as a crisp background (the painted one over it at Detail High). size = CSS px height (width follows the 3:4 sprite) */
function bannerHTML(banner,size,cls,noEm){size=Math.max(16,Math.round(+size||32));const b=bannerFix(banner),u=bannerURL(b,Math.max(1,Math.ceil(size/BN_H)),noEm),w=Math.round(size*BN_W/BN_H);
 const lab=(b.name||'Banner').replace(/[&<>"]/g,''),px=bnBucket(size),hc=bnHdClass(bannerKey(b)+(noEm?'~':'')+'@'+px,{b,px,noEm});
 return u?`<i class="bnr ${hc}${cls?' '+cls:''}" role="img" aria-label="${lab}" style="width:${w}px;height:${size}px;background-image:url(${u})"></i>`:`<i class="bnr none${cls?' '+cls:''}" style="width:${w}px;height:${size}px;background:${PAL[b.c1]}"></i>`}
/* an emblem alone (setup picker) */
function emblemHTML(key,c,field,size){size=size||32;if(!EMBLEMS[key])key=BANNERDEF.emblem;if(!BANNERC[c])c='c';if(!BANNERC[field])field='5';
 const u=typeof pxURL==='function'?pxURL('em:'+key+c+field,emblemRows(key,c,field),Math.max(1,Math.ceil(size/16))):'';if(!u)return'';const px=bnBucket(size,1),hc=bnHdClass('em:'+key+'.'+c+'.'+field+'@'+px,{em:key,c,f:field,px});
 return`<i class="bnr em ${hc}" style="width:${size}px;height:${size}px;background-image:url(${u})" aria-hidden="true"></i>`}

/* ---- the banner pickers (new company setup and the company's banner sheet). st: {c1,c2,c3,emblem,div,shape};
   set: the name of a global fn(key, value); roll: the name of a global fn() that rolls a banner ---- */
function bnColours(){return BNORDER.filter(k=>BANNERC[k]).concat(Object.keys(BANNERC).filter(k=>!BNORDER.includes(k)))}
/* set a colour, keeping c1, c2 and c3 three different colours (the one it takes from gets the old value) */
function bnSetCol(st,k,v){if(!BANNERC[v]||!/^c[123]$/.test(k))return;for(const o of ['c1','c2','c3'])if(o!==k&&st[o]===v)st[o]=st[k];st[k]=v;if(!st.c3||st.c3===st.c1||st.c3===st.c2)st.c3=bnC3(st.c1,st.c2)}
/* a random banner for the dice (Math.random: cosmetic) */
function bnRoll(st){const ks=bnColours(),R=a=>a[Math.floor(Math.random()*a.length)];st.c1=R(ks);do{st.c2=R(ks)}while(st.c2===st.c1);do{st.c3=R(ks)}while(st.c3===st.c1||st.c3===st.c2);
 st.emblem=R(Object.keys(EMBLEMS));st.div=Math.random()<.4?'plain':R(Object.keys(BNDIV).filter(k=>k!=='plain'));st.shape=Math.random()<.4?'swallow':R(Object.keys(BNSHAPE))}
function bnPickHTML(st,set,roll){const b=bannerFix(st),ks=bnColours();
 const sw=(k,c)=>`<button class="ncs-sw${b[k]===c?' on':''}" role="radio" aria-checked="${b[k]===c}" title="${BANNERC[c].n}" aria-label="${BANNERC[c].n}" onclick="${set}('${k}','${c}')"><i style="background:linear-gradient(180deg,${PAL[BANNERC[c].r[2]]} 0 25%,${PAL[BANNERC[c].r[1]]} 25% 75%,${PAL[BANNERC[c].r[0]]} 75%)"></i></button>`;
 const mini=(o,k,v,n)=>`<button class="ncs-dv${b[k]===v?' on':''}" role="radio" aria-checked="${b[k]===v}" title="${n}" aria-label="${n}" onclick="${set}('${k}','${v}')">${bannerHTML(Object.assign({},b,o,{name:n}),40,'',k==='div')}</button>`;
 return`<div class="ncs-sec"><b>Field</b><small>${BANNERC[b.c1].n}</small>${roll?`<button class="pxb sm ncs-rnd" onclick="${roll}()" title="Roll a banner">${typeof pnIcon==='function'?pnIcon('dice','',16):''}<span>Roll</span></button>`:''}</div><div class="ncs-sws" role="radiogroup" aria-label="Field colour">${ks.map(c=>sw('c1',c)).join('')}</div>
 <div class="ncs-sec"><b>Charge</b><small>${BANNERC[b.c2].n}: the border and the emblem</small></div><div class="ncs-sws" role="radiogroup" aria-label="Charge colour">${ks.map(c=>sw('c2',c)).join('')}</div>
 <div class="ncs-sec"><b>Division</b><small>${BNDIV[b.div].n}${b.div!=='plain'?' · '+BANNERC[b.c3].n:''}</small></div><div class="ncs-dvs" role="radiogroup" aria-label="Division">${Object.keys(BNDIV).map(d=>mini({div:d},'div',d,BNDIV[d].n)).join('')}</div>
 ${b.div!=='plain'?`<div class="ncs-sec"><b>Second colour</b><small>${BANNERC[b.c3].n}: the ${b.div==='bordure'?'bordure':'other part of the field'}</small></div><div class="ncs-sws" role="radiogroup" aria-label="Second colour">${ks.filter(c=>c!==b.c1&&c!==b.c2).map(c=>sw('c3',c)).join('')}</div>`:''}
 <div class="ncs-sec"><b>Shape</b><small>${BNSHAPE[b.shape].n}</small></div><div class="ncs-dvs ncs-shs" role="radiogroup" aria-label="Shape">${Object.keys(BNSHAPE).map(s=>mini({shape:s},'shape',s,BNSHAPE[s].n)).join('')}</div>
 <div class="ncs-sec"><b>Emblem</b><small>${EMBLEMS[b.emblem].n}</small></div><div class="ncs-ems" role="radiogroup" aria-label="Emblem">${Object.keys(EMBLEMS).map(e=>`<button class="ncs-em${b.emblem===e?' on':''}" role="radio" aria-checked="${b.emblem===e}" title="${EMBLEMS[e].n}" aria-label="${EMBLEMS[e].n}" onclick="${set}('emblem','${e}')">${emblemHTML(e,b.c2,b.c1,32)}</button>`).join('')}</div>`}
/* the company's banner sheet (company screen > Banner): the same pickers, the flag raised again on Save; free, cosmetic */
let BNE=null,BNEBACK=null;
function bannerEditSheet(back){if(typeof G!=='object'||!G)return;BNEBACK=typeof back==='function'?back:null;BNE=bannerFix(G.banner,companyName());
 sheet(`<div class="row sp seth ncs-h"><h2>The banner</h2><button onclick="bneClose()">Back</button></div>
<div class="ncs bne"><div class="ncs-l"><div class="ncs-flag" id="bneFlag"></div><button class="pri big ncs-go" onclick="bneSave()"><b>Raise it</b><small>Every flag and pennant of the company</small></button></div><div class="ncs-r" id="bneOpts"></div></div>`,'wide');bneDraw()}
function bneFlag(){const f=$('bneFlag');if(f&&BNE)f.innerHTML=`${bannerHTML(BNE,128,'ncs-big')}<div class="ncs-cap"><b>${htmlEsc(companyName())}</b><small>${htmlEsc(bnBlazon(BNE))}</small></div>`}
function bneDraw(){const o=$('bneOpts');if(!o||!BNE)return;const st=o.scrollTop;o.innerHTML=bnPickHTML(BNE,'bneSet','bneRoll');o.scrollTop=st;bneFlag()}
function bneSet(k,v){if(!BNE)return;if(/^c[123]$/.test(k))bnSetCol(BNE,k,v);else if(k==='emblem'&&EMBLEMS[v]||k==='div'&&BNDIV[v]||k==='shape'&&BNSHAPE[v])BNE[k]=v;bneDraw()}
function bneRoll(){if(!BNE)return;bnRoll(BNE);bneDraw()}
function bneClose(){BNE=null;closeSheet(true);const f=BNEBACK;BNEBACK=null;if(f)f()}
function bneSave(){if(!BNE||typeof G!=='object'||!G)return;G.banner=bannerFix(Object.assign({},BNE,{name:G.banner&&G.banner.name||companyName()}),companyName());
if(typeof save==='function')try{save()}catch(e){}if(typeof toast==='function')try{toast('The new banner is raised.')}catch(e){}bneClose()}
function htmlEsc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function companyName(){return G&&typeof G.name==='string'&&G.name?G.name:BANNERDEF.name}

/* ================= RIVAL COMPANIES (look side) =================
   Readers of the world agent's G.rivals (CONTRACT.md): every screen that shows a rival goes through these, with typeof fallbacks.
   lkRivals() lkRival(id) lkIsRival(f) lkRivalBn(r) lkRivalName(r) lkRivalShort(r) lkRivalPers(r) lkRivalStance(r) lkRivalTier(r)
   lkRivalStr(r) lkRivalSwords(r) rivalBannerHTML(r,size) rivalChipHTML(id,size) rivalOfMerc(m) mercLook(m) (the colours a merc's
   sprite and portrait wear: their own m.colors, else their rival company's livery from its banner). Nothing here touches rnd(). */
const LKRPERS={honour:{n:'Honourable',icon:'pers-honour',d:'Keeps its word and fights fair. Will not ambush, and will not be ambushed without a fight to remember.'},
 cutthroat:{n:'Cutthroats',icon:'pers-cutthroat',d:'Falls on anyone weaker met on the road. Expect no quarter and no warning.'},
 greedy:{n:'Greedy',icon:'pers-greedy',d:'Anything for coin. Sells news and swords, and can be bought off.'},
 glory:{n:'Glory-hounds',icon:'pers-glory',d:'Chase the biggest beasts and the strongest rivals, for the songs as much as the pay.'}};
function lkRivals(){return typeof G!=='undefined'&&G&&Array.isArray(G.rivals)?G.rivals:[]}
function lkRival(id){if(id&&typeof id==='object')return id;if(typeof rivalById==='function'){try{const r=rivalById(id);if(r)return r}catch(e){}}const L=lkRivals();for(let i=0;i<L.length;i++)if(L[i]&&L[i].id===id)return L[i];return null}
function lkIsRival(f){if(f==null)return false;if(typeof isRival==='function'){try{return!!isRival(f)}catch(e){}}return!!lkRival(f)}
function lkRivalBn(r){r=lkRival(r);return r?{name:r.n||'A rival company',c1:r.c1,c2:r.c2,emblem:r.emblem,div:r.div,c3:r.c3,shape:r.shape}:null}
function lkRivalName(r){r=lkRival(r);if(!r)return'A rival company';if(typeof rivalLabel==='function'){try{const s=rivalLabel(r);if(s)return String(s)}catch(e){}}return r.n||'A rival company'}
function lkRivalShort(r){r=lkRival(r);return r?String(r.short||r.n||'Rivals'):'Rivals'}
function lkRivalPers(r){r=lkRival(r);const k=r&&r.pers||'honour',W=typeof RVPERS==='object'&&RVPERS&&RVPERS[k]||typeof RPERS==='object'&&RPERS&&RPERS[k]||null,L=LKRPERS[k]||LKRPERS.honour;return{k,n:W&&W.n||L.n,d:W&&W.d||L.d,icon:L.icon}}
function lkRivalStance(r){r=lkRival(r);if(!r)return 0;const v=typeof r.stance==='number'?r.stance:G&&G.rep&&typeof G.rep[r.id]==='number'?G.rep[r.id]:0;return Math.max(-100,Math.min(100,Math.round(v)))}
function lkRivalTier(r){r=lkRival(r);const v=r?+r.renown||0:0;let t=1;if(typeof renownTier==='function'){try{t=renownTier(v)}catch(e){}}const D=typeof RENOWN==='object'&&Array.isArray(RENOWN)?RENOWN[t-1]:null;return{t,n:D&&D.n||['Unknown','Known','Respected','Famed','Renowned','Legendary'][t-1]||'Unknown'}}
function lkRivalSwords(r){r=lkRival(r);if(!r||!Array.isArray(r.roster))return 0;let n=0;for(let i=0;i<r.roster.length;i++){const m=r.roster[i];if(m&&!(m.hp<=0&&m.dead))n++}return n}   // no allocation: the world view reads it every frame
/* strength against the company, 1 weaker .. 3 stronger (partyStrength's scale); rivalStr(r) when the world has it */
function lkRivalStr(r){r=lkRival(r);if(!r)return 2;if(typeof rivalStr==='function'){try{const s=+rivalStr(r);if(s>0)return s}catch(e){}}
 const lv=m=>+m.lvl||+m.lv||+m.level||1,a=Array.isArray(r.roster)?r.roster.reduce((s,m)=>s+(m?lv(m):0),0):0,b=G&&Array.isArray(G.roster)?G.roster.reduce((s,m)=>s+lv(m),0):1,k=a/Math.max(1,b);return k<.8?1:k<1.15?2:3}
function lkStrWord(s){s=Math.round(+s||2);return s<=1?'Weaker than you':s===2?'An even match':'Stronger than you'}
function rivalBannerHTML(r,size,cls){const b=lkRivalBn(r);if(!b||typeof bannerHTML!=='function')return'';return bannerHTML(b,size||32,'rv-bn'+(cls?' '+cls:'')+(lkRival(r)&&lkRival(r).alive===false?' dead':''))}
function rivalChipHTML(id,size){const r=lkRival(id);if(!r)return'';return`<span class="rv-chip">${rivalBannerHTML(r,size||20)}<b>${htmlEsc(lkRivalShort(r))}</b></span>`}
/* which rival company a merc marches with (null for the company's own and everyone else). A few dozen compares; no allocation. */
function rivalOfMerc(m){if(!m||typeof m!=='object')return null;if(m.rv){const r=lkRival(m.rv);if(r)return r}const L=lkRivals();
 for(let i=0;i<L.length;i++){const R=L[i]&&L[i].roster;if(Array.isArray(R))for(let j=0;j<R.length;j++)if(R[j]===m)return L[i]}return null}
/* the colours a merc wears in the art: their own tailored colours win; a rival's merc without them wears the rival's livery
   (cloth from the banner field c1, trim from c2: the tailor's "banner colours"). The livery object is cached per banner so the
   sprite caches' identity checks hold. */
const LKLIV=new Map();
function rivalLivery(r){r=lkRival(r);if(!r)return null;const k=r.c1+'.'+r.c2;let v=LKLIV.get(k);if(v!==undefined)return v;const D0=typeof BANNERDYE==='object'&&BANNERDYE?BANNERDYE:{},D={},dy=k=>D0[k]||(BANNERC[k]&&BANNERC[k].dye)||undefined;D[r.c1]=dy(r.c1);D[r.c2]=dy(r.c2);
 v=D[r.c1]||D[r.c2]?{cloth:D[r.c1]||undefined,accent:D[r.c2]||undefined,rival:1}:null;if(v){if(!v.cloth)delete v.cloth;if(!v.accent)delete v.accent}LKLIV.set(k,v);return v}
function mercLook(m){const c=m&&m.colors;if(c&&typeof c==='object')return c;const r=rivalOfMerc(m);return r?rivalLivery(r):null}
/* a rival's pennant as a 16x16 icon (turn strip, chips, notices): field c1, border and charge c2. Registered once per colour pair. */
const LKPEN=['................','..d.............','..kyyyyyyyyyy...','..kycbbbbbbby...','..kybbbzbbbay...','..kybbzzzbbay...','..kybbbzbbbay...','..kybbbbbbbay...',
 '..kybbayyabay...','..kybay..ybay...','..kyay....yay...','..kyy......yy...','..j.............','..j.............','..i.............','................'];
function rivalPennantIcon(r){r=lkRival(r);if(!r||typeof ICONS!=='object')return'rival';const n='rvp-'+r.c1+r.c2;if(typeof icHas==='function'&&icHas(n))return n;
 const A=BANNERC[r.c1]?BANNERC[r.c1].r:['f','g','h'],C=BANNERC[r.c2===r.c1?'l':r.c2]?BANNERC[r.c2===r.c1?'l':r.c2].r:['m','l','r'],m={a:A[0],b:A[1],c:A[2],y:C[1],z:C[2]};
 try{ICONS[n]=_icOutline(LKPEN.map(s=>s.split('').map(k=>m[k]||k).join('')));if(typeof icCss==='function')icCss(n)}catch(e){return'rival'}return n}
function rivalMiniHTML(r,size,cls){const n=rivalPennantIcon(r);return typeof pxIcon==='function'?pxIcon(n,size||16,'rv-pen'+(cls?' '+cls:'')):''}
