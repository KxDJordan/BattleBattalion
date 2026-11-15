/* ================= PAINTED ICONS, package B: abilities (ab-*) =================
   Every ability icon of the battle bar, talents and statuses that reuse an ability glyph (st-indom -> ab-indom, ...).
   Grammar: the weapon or subject in its material (steel blades, wood hafts, brass fittings) or in the gift colour
   (mana blue, aura gold, qi teal, chi green), plus ONE action mark: a cut arc (pbArcCut), an impact star (pbImpact),
   speed lines (pbSpeed), rings (pbRing), sound arcs, a bolt (pbBolt), a plus (pbPlus) or chevron (pbChev).
   Monster abilities are drawn in the monster's palette (PBM). Weapons point to the upper right like the rest of the set.
   Kit: src/06p-iconspaint.js; guide: docs/icons-paint-guide.md. */
const pbP=PAINT;
const PBM={
 earth:['#1c1208','#46301a','#6e4e2c','#9a7446','#cfa874'],
 rot:['#132410','#34552a','#5f8a48','#94bc72','#d8f0b8'],
 hide:['#1e1006','#4a2a12','#7a4a22','#a87440','#dcae78'],
 serp:['#2a2006','#5e4c12','#9a8226','#cbb44e','#f4e8a0'],
 wyv:['#2e0a06','#6a1a10','#a8341e','#d8643c','#ffb48c'],
 ogre:['#20140c','#4e3424','#82604a','#b08a6c','#e0c4a6'],
 spider:['#0c0a12','#26203a','#463c62','#6e6290','#b0a6d0'],
 nail:['#1a1408','#3e3418','#6a5e34','#958a5c','#cfc69a']};
const PB_GLOW={mana:'#8ccfff',aura:'#ffe576',qi:'#8cf2dc',chi:'#b4ea7c',void:'#c49eff',fire:'#ffb12e',frost:'#bfeaff',poison:'#c0ef5c',blood:'#ff6a6a',holy:'#fff2b0'};
/* post effects at the current transform (pkPost runs in the 32-unit frame of the icon; nested parts need their own frame) */
function pbPost(g,fn){const m=g.getTransform();pkPost(o=>{o.save();o.setTransform(m);fn(o);o.restore()})}
const pbGlint=(g,x,y,r,c)=>pbPost(g,o=>pkGlint(o,x,y,r,c));
/* a glow BEHIND the finished icon (no ink halo): drawn after the outline pass with destination-over */
function pbGlow(g,x,y,r,mat,a){const c=PB_GLOW[mat]||mat;pbPost(g,o=>{o.globalCompositeOperation='destination-over';pkGlow(o,x,y,r,c,a==null?.55:a)})}
/* reuse another painting (a reference icon) centred on (cx,cy) at scale s, rotated rot degrees */
function pbUse(g,name,cx,cy,s,rot){pkAt(g,cx,cy,rot||0,s||1,g=>{g.translate(-16,-16);const n0=PK.post?PK.post.length:0,m=g.getTransform();PAINT[name](g,32);
 if(PK.post)for(let i=n0;i<PK.post.length;i++){const f=PK.post[i];PK.post[i]=o=>{o.save();o.setTransform(m);f(o);o.restore()}}})}
/* tube whose width follows f(t), t 0..1 along the points (crescents, tapering trails, claw marks) */
function pbTubeF(pts,f){const n=pts.length>>1,L=[],R=[];
 for(let i=0;i<n;i++){const a=Math.max(0,i-1),c=Math.min(n-1,i+1);let dx=pts[c*2]-pts[a*2],dy=pts[c*2+1]-pts[a*2+1];const m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;const h=Math.max(.05,f(n>1?i/(n-1):0))/2;
  L.push(pts[i*2]-dy*h,pts[i*2+1]+dx*h);R.push(pts[i*2]+dy*h,pts[i*2+1]-dx*h)}
 const o=L.slice();for(let i=n-1;i>=0;i--)o.push(R[i*2],R[i*2+1]);return pkPoly(o)}
const pbCres=w=>t=>w*Math.sin(Math.PI*Math.min(1,Math.max(0,t)))**.8;                   // 0 -> w -> 0
const pbTaper=(w,w0)=>t=>(w0||.2)+(w-(w0||.2))*t;                                          // thin -> w
/* a cut arc (crescent tapering at both ends) around (cx,cy) radius r from a0 to a1 (0 = up, clockwise) */
function pbArcCut(g,cx,cy,r,a0,a1,w,mat,o){o=o||{};pkFill(g,pbTubeF(pkArc(cx,cy,r,a0,a1,28),o.tail?pbTaper(w):pbCres(w)),mat||'white',{k:w*.22,lw:PK.lw*.85,noRim:o.noRim})}
/* speed lines: [[x0,y0,x1,y1,w],...], thin at (x0,y0) */
function pbSpeed(g,L,mat){const M=pkMat(mat||'white');pbPost(g,o=>{for(const l of L){const S=pbTubeF([l[0],l[1],(l[0]+l[2])/2,(l[1]+l[3])/2,l[2],l[3]],pbTaper((l[4]||2.2)*1.25,.4));
  o.lineJoin='round';o.lineWidth=1.5;o.strokeStyle=PK.ink;o.stroke(S.p);o.fillStyle=M[3];o.fill(S.p)}})}
/* impact star */
function pbImpact(g,x,y,r,mat,n){pkFill(g,pkStarS(x,y,r,n||8,r*.46),mat||'aura',{k:r*.09});pbGlint(g,x,y,r*.42)}
/* ring (ellipse band) */
function pbRing(g,cx,cy,rx,ry,t,mat,o){o=o||{};const r=(o.rot||0)*Math.PI/180,c=Math.cos(r),sn=Math.sin(r),q=[],n=40,R=Math.max(rx,ry);
 for(let i=0;i<=n+1;i++){const a=i/n*Math.PI*2,x=Math.sin(a)*(rx-t/2),y=-Math.cos(a)*(ry-t/2*ry/rx);q.push(cx+x*c-y*sn,cy+x*sn+y*c)}
 pkFill(g,pkU(pbTubeF(q,()=>t)),mat,{k:o.k||t*.3,lw:o.lw})}
/* arcs (sound / shock waves) */
function pbArcs(g,cx,cy,rs,a0,a1,w,mat){for(const r of rs)pkFill(g,pbTubeF(pkArc(cx,cy,r,a0,a1,16),pbCres(w*1.35)),mat,{k:.5,lw:PK.lw*.85})}
/* lightning bolt centred on (x,y), ~28 units tall at s=1 */
function pbBolt(g,x,y,s,a,mat){pkAt(g,x,y,a||0,s||1,g=>pkFill(g,pkPoly([3,-14,-7.5,1.5,-1,1.5,-4.5,14,8,-2.5,1.6,-2.5,7,-14]),mat||'aura',{k:.8,inside:(g,m)=>pkHi(g,'M2.4 -12 L-4.6 .4',1,.7)}))}
/* plus / cross and chevron */
function pbPlus(g,x,y,r,t,mat){pkFill(g,pkS(`M${x-t} ${y-r} L${x+t} ${y-r} L${x+t} ${y-t} L${x+r} ${y-t} L${x+r} ${y+t} L${x+t} ${y+t} L${x+t} ${y+r} L${x-t} ${y+r} L${x-t} ${y+t} L${x-r} ${y+t} L${x-r} ${y-t} L${x-t} ${y-t} Z`),mat,{k:t*.35})}
function pbChev(g,x,y,w,h,t,mat){pkFill(g,pkPoly([x-w/2,y+h/2-t*.2,x,y-h/2,x+w/2,y+h/2-t*.2,x+w/2,y+h/2+t*.9,x,y-h/2+t*1.15,x-w/2,y+h/2+t*.9]),mat||'white',{k:.6})}
/* ground: a mound / slab with a flat base */
function pbGround(g,cx,y,w,h,mat){pkFill(g,pkS(`M${cx-w/2} ${y+h*.45} Q${cx-w*.36} ${y-h*.55} ${cx} ${y-h*.55} Q${cx+w*.36} ${y-h*.55} ${cx+w/2} ${y+h*.45} Z`),mat||PBM.earth,{k:.8})}
/* a boot (toe to the right) at (x,y) = centre of the 32 frame, scale s */
function pbBoot(g,x,y,s,mat){pkAt(g,x,y,0,s||1,g=>{g.translate(-16,-16);
 pkFill(g,pkS('M8.5 4 L19.5 4 L19.8 15.2 C20.4 17.2 22.4 18.2 24.6 18.8 L27.4 19.6 C29.6 20.2 30.6 21.8 30.6 24.2 L30.6 26 L8.2 26 C7.4 20 7.8 10 8.5 4 Z'),mat||'leather',{k:1.4,inside:(g,m)=>{pkLine(g,'M19.8 15.4 C17 16.2 13 16 9 15',.9,m[0],.7);pkHi(g,'M10.6 7 L10.4 13',1.4,.45)}});
 pkFill(g,pkRect(7.2,3,13.6,4.6,1.4),mat==='leather'||!mat?'darkwood':mat,{k:.6});
 pkFill(g,pkRect(7.6,24.6,23.6,3.8,1.4),'darkwood',{k:.6})})}
/* a clenched fist seen from the front, knuckles up; centre of the 32 frame at (x,y) */
function pbFist(g,x,y,s,mat,sleeve){pkAt(g,x,y,0,s||1,g=>{g.translate(-16,-16);const M=mat||'skin';
 pkFill(g,pkRect(10,23.5,12,7,1.6),sleeve||'cloth',{k:.8});
 pkFill(g,pkRect(6.6,11.5,19,14.5,5),M,{k:1.6});
 for(let i=0;i<4;i++)pkFill(g,pkRect(6.8+i*4.6,7.6,4.8,9.4,2.4),M,{k:.8,inside:(g,m)=>pkHi(g,`M${8.2+i*4.6} 9.4 L${8.2+i*4.6} 11.4`,1.1,.55)});
 pkFill(g,pkTube([8,19.6,18.6,17.4],4.6,'round'),M,{k:.8})})}
/* an open hand, fingers up; o.claw: curved nails (monsters) */
function pbPalm(g,x,y,s,mat,o){o=o||{};pkAt(g,x,y,o.rot||0,s||1,g=>{g.translate(-16,-16);const M=mat||'skin';
 if(!o.noWrist)pkFill(g,pkRect(11,25,10.4,6,1.5),o.sleeve||'cloth',{k:.8});
 const S=pkU(pkRect(8.6,13.5,15.4,13.5,5.2),pkTube([10.6,16,10,6.6],3.7,'round'),pkTube([14.3,15,14.2,3.8],3.8,'round'),pkTube([18,15,18.4,4.4],3.8,'round'),pkTube([21.6,16,22.8,8],3.6,'round'),pkTube([10,22,4.6,15],3.9,'round'));
 pkFill(g,S,M,{k:1.4,inside:(g,m)=>{pkLine(g,'M12.4 14.6 L12.2 10 M16.2 14 L16.2 9 M19.9 15 L20.4 10.5',.7,m[0],.7);pkHi(g,'M10 8 L10.4 12',1,.5)}});
 if(o.claw){const n=PBM.nail;for(const c of [[10,6.6,9,3.6],[14.2,3.8,13.6,.8],[18.4,4.4,18.8,1.4],[22.8,8,24.2,5.4],[4.6,15,3,12.4]])pkFill(g,pkTube([c[0],c[1],c[2],c[3]],[2.2,.5],'round'),n,{k:.3,lw:PK.lw*.8})}})}
/* a hammer: haft (x0,y0)->(x1,y1); head at (x1,y1): kind 'war' (face + back spike) | 'maul' (block) */
function pbHammer(g,x0,y0,x1,y1,o){o=o||{};const a=Math.atan2(x1-x0,-(y1-y0))*180/Math.PI;pkHaft(g,x0,y0,x1+(x1-x0)*.06,y1+(y1-y0)*.06,o.w||3,o.haft||'wood');
 pkAt(g,x1,y1,a,o.s||1,g=>{const M=o.mat||'steel';
  if(o.kind==='maul'){pkFill(g,pkRect(-7.5,-4.6,15,9.2,1.6),M,{k:1.2,inside:(g,m)=>{pkFill(g,pkRect(-2.4,-5,4.8,10,.8),o.band||'iron',{k:.5,lw:PK.lw*.8});pkHi(g,'M-6 -3 L-3.4 -3',1.2,.6)}})}
  else{pkFill(g,pkPoly([-1,-2.4,-9,-.2,-9,.6,-1,2.4]),M,{k:.6});pkFill(g,pkRect(0,-4.4,8.2,8.8,1.2),M,{k:1,inside:(g,m)=>{pkFill(g,pkRect(6,-4.6,2.6,9.2,.6),M,{k:.4,lw:PK.lw*.7});pkHi(g,'M1.4 -2.8 L5 -2.8',1.1,.6)}});
   pkFill(g,pkRect(-2.2,-5.4,4.4,10.8,1),o.band||'brass',{k:.5})}})}
/* a spear: haft (x0,y0)->(x1,y1) and a leaf blade beyond */
function pbSpear(g,x0,y0,x1,y1,o){o=o||{};const a=Math.atan2(x1-x0,-(y1-y0))*180/Math.PI;pkHaft(g,x0,y0,x1,y1,o.w||3,o.haft||'wood');
 pkAt(g,x1,y1,a,1,g=>{pkFill(g,pkRect(-2,-1,4,4,.8),'brass',{k:.5});pkBlade(g,{len:o.len||13,w:o.bw||6.8,tip:'leaf',mat:o.mat||'steel'})})}
/* a halberd-like pole head at the end of a haft: kind 'halberd' | 'glaive' | 'bill' | 'scythe' */
function pbPole(g,x0,y0,x1,y1,kind,o){o=o||{};const a=Math.atan2(x1-x0,-(y1-y0))*180/Math.PI;pkHaft(g,x0,y0,x1,y1,o.w||2.9,o.haft||'wood');
 pkAt(g,x1,y1,a,o.s||1,g=>{const M=o.mat||'steel';
  if(kind==='glaive')pkFill(g,pkS('M-2 3 L-2.2 -4 C-2.4 -10 -.6 -15 3.6 -19.5 C5.4 -13 5 -6 2.2 3 Z'),M,{k:1,inside:(g,m)=>{pkHi(g,'M-.8 1 C-1 -6 .2 -11 3 -16',1,.6);pkLine(g,'M3.6 -19.5 C5.4 -13 5 -6 2.2 3',1.6,m[4],.4)}});
  else if(kind==='scythe')pkFill(g,pkS('M-1.5 -1 C2 -6 9 -8 17 -5 C11 -5.4 5 -3 1.6 2.4 Z'),M,{k:1,inside:(g,m)=>pkHi(g,'M1 -2 C4.6 -5 9 -6 14 -5.4',1,.6)});
  else{pkBlade(g,{len:9,w:3.4,mat:M});pkFill(g,pkS('M1.6 -1.2 L7 -5.6 C9.6 -2.6 9.8 2.4 7.4 6.4 L1.6 3 Z'),M,{k:1,inside:(g,m)=>pkLine(g,'M7 -5.6 C9.6 -2.6 9.8 2.4 7.4 6.4',1.6,m[4],.45)});
   pkFill(g,pkS('M-1.6 -.6 L-6.4 -3 L-5.2 .4 L-1.6 2 Z'),M,{k:.5})}
  pkFill(g,pkRect(-2,-.6,4,4.2,.8),'brass',{k:.5})})}
/* a pistol pointing right (32 frame centred at (x,y)); muzzle at about (29.5,12) of the frame */
function pbPistol(g,x,y,s,a){pkAt(g,x,y,a||0,s||1,g=>{g.translate(-16,-16);
 pkFill(g,pkS('M6 9.6 L17 9.6 L18 14.6 L14.6 15.6 L11.4 26.6 C10.8 28.4 8.6 29 6.6 28.4 L4.6 27.6 C3.6 27.2 3.4 26 3.8 25 L8 15.6 C6.4 14.6 5.4 12.2 6 9.6 Z'),'wood',{k:1.3,inside:(g,m)=>pkHi(g,'M7.6 11.4 L15.4 11.4',1,.5)});
 pkFill(g,pkRect(10.5,9.2,18.4,4.4,1.4),'iron',{k:.8,inside:(g,m)=>pkHi(g,'M12 10.4 L27 10.4',1,.6)});
 pkFill(g,pkRect(27.6,8.4,2.6,6,1),'brass',{k:.4});
 pkFill(g,pkRect(12.6,13,5.6,3.2,1),'brass',{k:.4});
 pkFill(g,pkTube([12.6,9.6,11,6.6,12.6,5.6],1.8,'round'),'iron',{k:.3});
 pkFill(g,pbTubeF(pkArc(16.4,17.2,2.6,100,260,10),()=>1.3),'brass',{k:.2,lw:PK.lw*.7});
 pkFill(g,pkEll(6,27.6,2.8,1.9,-20),'brass',{ball:1,k:.4})})}
/* the crossbow reference painting, scaled */
const pbXbow=(g,x,y,s)=>pbUse(g,'w-xbow',x,y,s);

/* ======================= basic and weapon abilities ======================= */
pbP['ab-shove']=g=>{pkFill(g,pkRect(24.5,3,5,26,1.4),'stone',{k:.8,inside:(g,m)=>pkLine(g,'M24.5 11 L29.5 11 M24.5 20 L29.5 20',.8,m[0],.6)});
 pkFill(g,pkS('M2 11.5 L13 11.5 L13 5.5 L23.5 16 L13 26.5 L13 20.5 L2 20.5 Z'),'aura',{k:1.2,inside:(g,m)=>pkHi(g,'M3.5 13 L13.6 13',1.2,.6)})};
pbP['ab-aimed']=g=>{pbRing(g,16,16,12.5,12.5,3,'brass');
 for(const [x,y,w,h] of [[14.2,1.5,3.6,8],[14.2,22.5,3.6,8],[1.5,14.2,8,3.6],[22.5,14.2,8,3.6]])pkFill(g,pkRect(x,y,w,h,1),'steel',{k:.5});
 pkFill(g,pkCirc(16,16,3.6),'blood',{ball:1,k:.6});pbGlint(g,14.8,14.8,1.4)};
pbP['ab-pin']=g=>{pbGround(g,16,26,28,7);pkLine(g,'M10 26.5 L8 29 M22 26.5 L24.5 29 M16 27.4 L16 30',1,PK.ink,.7);
 pkArrow(g,16,3.5,16,26,{w:2.8,head:8});pbSpeed(g,[[9,9,11,18,1.8],[23,9,21,18,1.8]],'white')};
pbP['ab-footwork']=g=>{pbSpeed(g,[[1,9.5,8.5,9.5,2.2],[1.5,15,8.5,15,2.2],[1,20.5,8.5,20.5,2.2]]);pbBoot(g,19,16,.9)};
pbP['ab-adren']=g=>{for(let i=0;i<8;i++){const a=i*Math.PI/4,r0=9,r1=i&1?13.2:15;pkFill(g,pbTubeF([16+Math.sin(a)*r0,16-Math.cos(a)*r0,16+Math.sin(a)*r1,16-Math.cos(a)*r1],pbTaper(.6,2.8)),'aura',{k:.3,lw:PK.lw*.8})}
 pbGlow(g,16,16,14,'aura',.5);pkGem(g,16,16,8.4,'aura')};
pbP['ab-indom']=g=>pkShield(g,16,16,{kind:'heater',w:24,h:27,mat:'white',rim:'gold',emblem:g=>pkFill(g,pkS('M-2 -10.5 L2 -10.5 L2 -4.6 L8.6 -4.6 L8.6 -.6 L2 -.6 L2 10 L-2 10 L-2 -.6 L-8.6 -.6 L-8.6 -4.6 L-2 -4.6 Z'),'gold',{k:.6,lw:PK.lw*.8})});
/* sword, spear, staff, dagger, mace */
pbP['ab-thrust']=g=>{pbSpeed(g,[[2,17,9,10,2],[7,24,14,17,2]]);pbSpear(g,4.5,28.5,19.5,13.5,{len:13});pbImpact(g,27,5.5,4.2,'white',4)};
pbP['ab-impale']=g=>{pkHaft(g,3,29.5,17,15.5,3,'wood');pkAt(g,18,14,0,.56,g=>{g.translate(-16,-16);pkFill(g,pkS(PK_HEART),'blood',{k:2.4,inside:()=>pkHi(g,'M6 9.5 Q6.4 6.6 9.2 6.2',2.4,.8)})});
 pkHaft(g,19,13,22,10,3,'wood');pkAt(g,22,10,45,1,g=>{pkFill(g,pkRect(-2,-1,4,4,.8),'brass',{k:.5});pkBlade(g,{len:10,w:6.4,tip:'leaf'})});pkDrop(g,12,30,7,'blood')};
pbP['ab-sweep']=g=>{pbArcCut(g,16,17,13.5,200,345,4.4,'white');pkHaft(g,2.5,22,29.5,12,3.2,'wood');pkFill(g,pkTube([2.5,22,5.6,20.9],3.6,'round'),'brass',{k:.4});pkFill(g,pkTube([26.4,13.1,29.5,12],3.6,'round'),'brass',{k:.4});pbArcCut(g,16,15,13.5,20,165,4.4,'white')};
pbP['ab-stunblow']=g=>{pbUse(g,'mace',14,18,.84);pkStar(g,6,7,4.6,'gold',5,2);pkStar(g,28,19,4,'gold',5,1.8);pkStar(g,23,27.5,3.2,'gold',5,1.4)};
pbP['ab-puncture']=g=>{pkFill(g,pkS('M13 4 C19 2.6 26 2.6 30 4 L30 18 C26 21.6 19 22.6 13 20 Z'),'iron',{k:1.4,inside:(g,m)=>{pkHi(g,'M15 6 C19 5 24 5 28 6',1.2,.6);for(const [x,y] of [[16,7],[27.5,7],[16,17.4],[27.5,16]])pkFill(g,pkCirc(x,y,.9),'brass',{k:.2,lw:.5})}});
 pkSword(g,9.5,23.5,45,{len:15,w:4.4,guard:9.5,grip:5});pkLine(g,'M19.6 13.4 L22.4 10.8 M21 15 L23.6 15.6 M18.6 11.6 L18.2 8.6',.9,PK.ink,.85);pkDrop(g,23,30.5,7,'blood')};
pbP['ab-roundswing']=g=>{pbArcCut(g,16,16,13,-160,150,4.8,'white',{tail:1});pkSword(g,16,21,0,{len:15,w:4.4,guard:10.5,grip:4.4})};
pbP['ab-whirl']=g=>{pbArcCut(g,16,16,13,-150,160,4.8,'blood',{tail:1});pbSpeed(g,[[1,26,7,24,1.8],[3,30.5,10,28,1.8]]);pkSword(g,16,21,0,{len:15,w:4.4,guard:10.5,grip:4.4})};
pbP['ab-cleave']=g=>{pbArcCut(g,16,17,13.5,-150,160,4.8,'aura',{tail:1});pkHaft(g,16,29,16,6,3,'wood');pkAt(g,16,9,0,.9,g=>{pkAxeHead(g,{s:1});pkAt(g,0,0,180,1,g=>pkAxeHead(g,{s:1}))})};
pbP['ab-masterstroke']=g=>{pkSword(g,11,21,45,{len:18,w:4.4,guard:11,grip:5});pbArcCut(g,5,30,22.5,14,86,5,'blood');pkStar(g,25,7,5.6,'gold',4,2)};
pbP['ab-decap']=g=>{pkSword(g,11,20,45,{len:17,w:4.4,guard:10.5,grip:5,mat:['#2a1418','#6a3238','#b07078','#e0aab0','#ffffff']});pbArcCut(g,5,29,21,14,86,4.6,'blood');pkSkull(g,23.8,24.4,.48,'bone')};
pbP['ab-flurry']=g=>{pkSword(g,10.5,21.5,45,{len:18,w:4.4,guard:11,grip:5});pbArcCut(g,6,30,20,10,82,4,'white');pbArcCut(g,9.5,31,25.5,18,76,3.4,'white')};
pbP['ab-lunge']=g=>{pbSpeed(g,[[1,13,8,13,2],[1,19,7,19,2],[2,25,9,23,2]]);pkSword(g,10,18.5,62,{len:19,w:4.4,guard:11,grip:4.6});pbImpact(g,28.5,8.5,3.6,'white',4)};
pbP['ab-parry']=g=>{pkSword(g,10,21,45,{len:18,w:4.2,guard:10.5,grip:4.6});pkSword(g,22,21,-45,{len:18,w:4.2,guard:10.5,grip:4.6,hilt:'gold'});pbImpact(g,16,10,4.6,'white',4)};
pbP['ab-runeedge']=g=>{pbGlow(g,19,13,11,'mana',.55);pkSword(g,10.5,21.5,45,{len:20,w:4.8,guard:12,grip:5,mat:['#14254a','#3c5c96','#7aa0d8','#c0d8f6','#ffffff']});
 pkAt(g,18,14,45,1,g=>pkLine(g,'M0 -1.6 L1.2 -3 L0 -4.4 M0 -6.6 L-1.1 -8 L1.1 -9',.9,'#e8f6ff',.95));pbRing(g,25,25,4.6,4.6,1.7,'mana')};
pbP['ab-overload']=g=>{pbGlow(g,19,13,11,'mana',.5);pkSword(g,10.5,21.5,45,{len:20,w:4.8,guard:12,grip:5,mat:['#14254a','#3c5c96','#7aa0d8','#c0d8f6','#ffffff']});pbBolt(g,25,22,.38,20,'qi');pbBolt(g,22,6,.26,-30,'mana')};
pbP['ab-halfsword']=g=>{pbSpeed(g,[[22,30,27,25,1.8]]);pkSword(g,8,24,45,{len:24,w:4.4,guard:11,grip:5});
 pkAt(g,16.5,15.5,45,1,g=>{pkFill(g,pkRect(-4.6,-3.6,9.2,7.2,2.6),'leather',{k:.8,inside:(g,m)=>{pkLine(g,'M-4.6 -1.2 L4.6 -1.2 M-4.6 1.2 L4.6 1.2',.7,m[0],.7);pkHi(g,'M-3 -2.6 L2 -2.6',1,.5)}})})};
pbP['ab-gswing']=g=>{pbArcCut(g,8,26,21,-12,84,5,'aura');pkSword(g,9,23,45,{len:21,w:5,guard:13,grip:6.4})};
pbP['ab-gsweep']=g=>{pbArcCut(g,16,17,14,-110,110,5,'white',{tail:1});pkSword(g,9,23,45,{len:21,w:5,guard:13,grip:6.4})};
pbP['ab-mordhau']=g=>{pbArcCut(g,8,22,17,-10,70,4,'white',{tail:1});pkSword(g,18,14,225,{len:17,w:4.6,guard:12,grip:5});pbImpact(g,26,6,6,'aura')};
pbP['ab-staffquake']=g=>{pbRing(g,9,27,8,3,1.7,'aura');pbRing(g,9,27,12.4,4.6,1.6,'aura');pbUse(g,'staff',17,15.5,.9)};
/* axes, hammers, polearms */
pbP['ab-batter']=g=>{pkFill(g,pkCirc(21.5,20.5,9),'iron',{ball:1,k:1.2,inside:(g,m)=>{pkLine(g,'M17 17 L20 21 L18 24 M20 21 L24 20',.9,PK.ink,.8);pkHi(g,'M15 16 Q17 13 20 12.4',1.2,.6)}});
 pbHammer(g,3,29,9.5,9.5,{kind:'war'});pbImpact(g,15.6,12.8,4,'aura',6)};
pbP['ab-hsmash']=g=>{pbArcCut(g,22,22,15,-80,-10,3.8,'white',{tail:1});pbGround(g,16,28,30,5);pkLine(g,'M13 26.2 L14.8 28.4 L13.2 30 M19 26.2 L17.6 28.4 L19.6 30.4',.9,PK.ink,.8);
 pbHammer(g,28.5,6,17,20,{kind:'maul',s:1.05});pbImpact(g,9,25,3.6,'white',4);pbImpact(g,24,25.5,3.2,'white',4)};
pbP['ab-ringblow']=g=>{pbHelmGreat(g,22,19,.62);pbHammer(g,3,29,10,9.5,{kind:'war'});pbArcs(g,22,19,[11.5,14.5],20,100,1.8,'aura')};
function pbHelmGreat(g,x,y,s){pkAt(g,x,y,0,s,g=>{g.translate(-16,-16);pkHelmGreat(g,'steel','brass')})}
pbP['ab-demolish']=g=>{pkFill(g,pkStarS(21,20,10.5,9,5),'fire',{k:1});pkFill(g,pkStarS(21,20,5.6,7,3),[PKM.fire[2],PKM.fire[3],PKM.fire[4],'#ffffff','#ffffff'],{lw:0,noShade:1});
 for(const [x,y,s] of [[29,28,2.4],[13,29.5,2],[30,11,1.8]])pkFill(g,pkPoly([x-s,y,x-s*.2,y-s*1.1,x+s,y-s*.3,x+s*.4,y+s*.9]),'stone',{k:.4});pbHammer(g,3,29,10,9,{kind:'maul'})};
pbP['ab-sunder']=g=>{pkFill(g,pkS('M15 15 L29 15 L29 23 C27 28 22 30.5 22 30.5 C22 30.5 17 28 15 23 Z'),'iron',{k:1.2,inside:(g,m)=>pkLine(g,'M22 15 L20.5 19 L23.4 22 L21.4 26 L22 30',1.1,PK.ink,.9)});
 pbUse(g,'mace',12,15,.78);pbImpact(g,21.5,14,3.6,'white',4)};
pbP['ab-earthsplit']=g=>{pbGround(g,16,27.5,31,6);pkLine(g,'M16 25.4 L13.4 27.6 L15 29.6 L12 31 M16 25.4 L19 27.4 L18 29.8 L21 31.4',1.2,PK.ink,.9);
 pkHaft(g,28,2.5,15,19,3.2,'wood');pkAt(g,16,17.5,40,1.25,g=>pkAxeHead(g,{s:1}));pbSpeed(g,[[30,13,26,19,1.8],[22,1.5,19,8,1.8]]);pbImpact(g,7,22.5,3.4,'white',4);pbImpact(g,25,22.5,3,'white',4)};
pbP['ab-fb_quake']=g=>{pbGround(g,16,27.5,31,6,'stone');pkLine(g,'M16 25.4 L13.4 27.6 L15 29.6 L12 31 M16 25.4 L19 27.4 L18 29.8 L21 31.4',1.2,PK.ink,.9);
 pbArcCut(g,18,24,15.5,-95,-15,4.2,'aura',{tail:1});pbHammer(g,28,4,16,18.5,{kind:'maul',s:1.25,mat:'stone',band:'gold'});pbImpact(g,6.5,22.5,3.6,'aura',6)};
pbP['ab-reap']=g=>{pbArcCut(g,15,19,13.5,-120,110,4.4,'white',{tail:1});pbPole(g,6,29,19,9,'halberd')};
pbP['ab-hook']=g=>{pkHaft(g,4,29.5,17,13,3,'wood');pkFill(g,pbTubeF(pkArc(20.2,9.8,6.2,250,525,22),t=>3.6-2.8*t),'steel',{k:.8,inside:(g,m)=>pkHi(g,'M15 8.6 Q17.6 4 22 4',1,.5)});
 pkFill(g,pkRect(14.8,12,4.2,4.2,.8),'brass',{k:.5});pkFill(g,pkS('M30.5 21.5 L23 21.5 L23 17.5 L16.5 24 L23 30.5 L23 26.5 L30.5 26.5 Z'),'aura',{k:.6})};
pbP['ab-trip']=g=>{pbBoot(g,20,21,.62);pkHaft(g,2.5,28,12,6,3,'wood');pkFill(g,pbTubeF(pkArc(15.2,9.2,5.4,320,560,20),t=>3.4-2.6*t),'steel',{k:.8});pbSpeed(g,[[25,4.5,22,10,1.8],[30,7,26,12,1.8]])};
pbP['ab-glaivecut']=g=>{pbArcCut(g,4,30,23,10,86,5,'blood');pbPole(g,4.5,29,17.5,14,'glaive',{s:1.05});pkDrop(g,26,30.5,7,'blood')};
pbP['ab-scythe']=g=>{pbArcCut(g,14,22,12,90,250,4.2,'void');pkHaft(g,10,30,13,4,3,'darkwood');pkFill(g,pkS('M11 5 C14 1 24 0.5 30 7 C24 5 18 6 14 9.6 Z'),'steel',{k:1,inside:(g,m)=>pkHi(g,'M14 4.4 C18 2.4 23 2.6 27 5',1.1,.6)});pkFill(g,pkRect(10.8,6.4,4.6,3.2,.8),'iron',{k:.4})};
/* shields */
const pbHeater=(g,x,y,w,h,mat,rim,emb)=>pkShield(g,x,y,{kind:'heater',w,h,mat,rim:rim||'silver',emblem:emb});
const pbCross=(s,mat)=>g=>pkAt(g,0,0,0,s,g=>pkFill(g,pkS('M-1.4 -7 L1.4 -7 L1.4 -3.4 L5 -3.4 L5 -.6 L1.4 -.6 L1.4 6.5 L-1.4 6.5 L-1.4 -.6 L-5 -.6 L-5 -3.4 L-1.4 -3.4 Z'),mat||'white',{k:.5,lw:PK.lw*.8}));
pbP['ab-slam']=g=>{pbSpeed(g,[[2,8,6,11,1.8],[1,16,5,16,1.8]]);pbHeater(g,14,17,19,22,'teal','silver',pbCross(1));pkStar(g,25,7,4.2,'gold',5,1.9);pkStar(g,28.5,15.5,3.4,'gold',5,1.5);pkStar(g,21,3.6,2.8,'gold',5,1.3)};
pbP['ab-spikebash']=g=>{pkShield(g,14,17,{kind:'round',w:23,h:23,mat:'dark',rim:'iron',rimW:2.2});pkFill(g,pkPoly([10.6,13.6,23,6,17.4,20.4]),'steel',{k:.6});pkFill(g,pkCirc(14,17,4.6),'iron',{ball:1,k:.8});pbImpact(g,25.5,6.5,4.4,'white',6)};
pbP['ab-scharge']=g=>{pbSpeed(g,[[1,9,8,9,2.2],[1,15.5,6.5,15.5,2.2],[1,22,8,22,2.2]]);pkShield(g,19,15.5,{kind:'kite',w:18,h:25,mat:'cloth',rim:'silver'});pbGround(g,17,28.4,26,3.6)};
pbP['ab-fortress']=g=>{for(const x of [7,16,25])pkShield(g,x,15,{kind:'tower',w:9.8,h:25,mat:'blue',rim:'silver',rimW:1.4,emblem:g=>pkFill(g,pkRect(-1.1,-4,2.2,6,.6),'gold',{k:.3,lw:PK.lw*.7})});pkFill(g,pkRect(1.5,27.4,29,2.8,1),PBM.earth,{k:.4})};
pbP['ab-phalanx']=g=>{for(const [x,y] of [[7,14],[25,14],[16,17]])pkShield(g,x,y,{kind:'heater',w:12,h:15,mat:'teal',rim:'silver',rimW:1.4,emblem:pbCross(.7)});pbChev(g,16,4,10,5,1.8,'aura')};
pbP['ab-bastion']=g=>{pkShield(g,16,16,{kind:'tower',w:21,h:27,mat:'white',rim:'gold',rimW:1.9,boss:4,bossMat:'gold',emblem:g=>pkLine(g,'M-6 -9 L6 -9 M-6 9 L6 9',.9,PKM.white[1],.8)})};
pbP['ab-holdfast']=g=>{pkFill(g,pkS('M3 8 C9 9 16 10.6 22 7 L27 3 L29 15 L23.6 13.4 C17 13 10 14 5 17 Z'),'brass',{k:1.2,inside:(g,m)=>{pkFill(g,pkRect(10,7,2.4,9,.6),'darkwood',{k:.3,lw:PK.lw*.6});pkHi(g,'M6 10 C12 11 17 11.4 22 9',1,.6)}});pkFill(g,pkEll(28,9,1.8,6,10),'darkwood',{k:.4});
 pkShield(g,13,23,{kind:'heater',w:11,h:13,mat:'teal',rim:'silver',rimW:1.3})};
pbP['ab-swap']=g=>pbUse(g,'swap',16,16,1);
pbP['ab-splitshield']=g=>{const half=(dx,dy,poly)=>{g.save();g.translate(dx,dy);g.beginPath();const pp=new Path2D();pp.moveTo(poly[0],poly[1]);for(let i=2;i<poly.length;i+=2)pp.lineTo(poly[i],poly[i+1]);pp.closePath();g.clip(pp);
  pkShield(g,16,17,{kind:'round',w:25,h:25,mat:'wood',rim:'iron',rimW:2.2,emblem:g=>pkLine(g,'M-11 -3 L11 -3 M-11 3.4 L11 3.4',.8,PKM.wood[0],.6)});pkLine(g,'M17 2 L14.6 9 L18 14 L14 20 L17.4 26 L15.6 32',1.6,PK.ink);g.restore()};
 half(-2,1.2,[0,0,17,0,14.6,9,18,14,14,20,17.4,26,15.6,32,0,32]);half(2,-1,[17,0,32,0,32,32,15.6,32,17.4,26,14,20,18,14,14.6,9]);pbImpact(g,17,4,4.6,'white',6)};
/* bows */
const pbAr=(g,o)=>pkArrow(g,4.5,27.5,26.5,5.5,Object.assign({w:2.5,head:7.6},o||{}));
pbP['ab-quickshot']=g=>{pbSpeed(g,[[1,20,6,15,1.8],[9,29,14,24,1.8]]);pkArrow(g,3,22,21,4,{w:2.3,head:7});pkArrow(g,10,29,28,11,{w:2.3,head:7})};
pbP['ab-doubleshot']=g=>{pkArrow(g,4,28,14,3.5,{w:2.3,head:7});pkArrow(g,4,28,28.5,18,{w:2.3,head:7})};
pbP['ab-poisonarrow']=g=>{pbAr(g,{mat:'poison'});pkDrop(g,24,29.5,10,'poison');pkDrop(g,29,20.5,6,'poison')};
pbP['ab-aarrow']=g=>{pbGlow(g,22,10,11,'aura',.6);pbAr(g,{mat:'aura',shaft:'brass',fletch:'aura'});pbSpeed(g,[[3,18,10,13,1.8],[12,28.5,18,23,1.8]],'aura');pbGlint(g,26,6,3)};
pbP['ab-farrow']=g=>{pbGlow(g,22,9,10,'fire',.6);pkAt(g,23.5,9.5,45,1,g=>pkFlame(g,0,4,15,'fire'));pbAr(g,{mat:'fire'})};
pbP['ab-iarrow']=g=>{pbGlow(g,23,9,10,'frost',.6);pbAr(g,{mat:'frost',fletch:'frost'});pkSparkle(g,18,6,4,'frost');pkSparkle(g,28,15,3.4,'frost')};
pbP['ab-tarrow']=g=>{pbGlow(g,22,9,10,'qi',.55);pbAr(g,{mat:'qi',fletch:'qi'});pbBolt(g,26.5,18,.42,20,'qi');pbBolt(g,15,6,.3,-30,'qi')};
pbP['ab-seeker']=g=>{pkFill(g,pbTubeF(pkQ(3,29,4,8,19,9,20),pbTaper(3.4,.3)),'mana',{k:.6,lw:PK.lw*.8});pkArrow(g,15,11,29,7,{w:2.4,head:7,mat:'mana',fletch:'mana'});pbGlow(g,27,7,7,'mana',.5)};
pbP['ab-spiritarrow']=g=>{pbGlow(g,16,16,15,'chi',.5);pbAr(g,{mat:'chi',shaft:'chi',fletch:'chi',w:2.8,head:8.4});pbGlint(g,25,7,3)};
pbP['ab-pparrow']=g=>{pbAr(g);pbGlow(g,25,8,8,'chi',.6);pkSparkle(g,25.5,7,6.4,'chi');pkSparkle(g,10,9,3.2,'chi')};
pbP['ab-carrow']=g=>{pkArrow(g,3,29,21,11,{w:2.6,head:.1});pkFill(g,pkCirc(22.5,9.5,4.6),'iron',{ball:1,k:.8});pbArcs(g,22.5,9.5,[7.6,10.6],0,110,1.8,'aura');pbGlint(g,21,8,1.6)};
pbP['ab-sunarrow']=g=>{pbGlow(g,23,9,12,'aura',.7);pkArrow(g,3,29,22,10,{w:2.5,head:7.4});pkStar(g,23.5,8.5,8,'gold',10,4.2);pkFill(g,pkCirc(23.5,8.5,3.4),'holy',{ball:1,k:.4})};
pbP['ab-starpierce']=g=>{pbGlow(g,17,15,15,'mana',.45);pkFill(g,pbTubeF(pkQ(3,29,15,17,29,3,14),t=>.6+5*t*(1-t*.65)),'mana',{k:.8,inside:(g,m)=>pkHi(g,'M6 25 Q15 16.4 26 5.6',1.1,.8)});pkSparkle(g,27.5,4.5,4.4,'white');pkSparkle(g,9,14,2.6,'mana');pkSparkle(g,20,26,2.2,'mana')};
pbP['ab-bindshot']=g=>{pbAr(g);pbRing(g,14.5,17.5,8,3.6,1.8,'mana',{rot:-45});pkAt(g,14.5,17.5,0,1,g=>{for(const [x,y] of [[-6,-1],[1,-6.5],[5,4],[-3,6]])pkFill(g,pkPoly([x,y-1.4,x+1.1,y,x,y+1.4,x-1.1,y]),'mana',{k:.3,lw:.6})})};
pbP['ab-avolley']=g=>{pbAr(g,{mat:'mana',fletch:'mana'});pbGlow(g,24,9,9,'mana',.6);pkSparkle(g,21,4.5,3.4,'mana');pkSparkle(g,29,12,3,'mana');pkSparkle(g,27.5,3,2.4,'white');pkSparkle(g,17,12,2.2,'mana')};
pbP['ab-pvolley']=g=>{pbSpeed(g,[[1,23,8,16,2],[6,30,13,23,2]],'aura');pkArrow(g,7,25,29,3,{w:2.6,head:7.6,mat:'aura',fletch:'aura'});pbRing(g,14,18,4.2,4.2,1.5,'aura');pbRing(g,21,11,4.2,4.2,1.5,'aura')};
pbP['ab-pshot']=g=>{for(const x of [12,22])pkFill(g,pkCirc(x,16,5.6),'blood',{ball:1,k:.8,inside:(g,m)=>{g.strokeStyle=m[4];g.globalAlpha=.6;g.lineWidth=.9;g.beginPath();g.arc(x,16,2.8,0,Math.PI*2);g.stroke();g.globalAlpha=1}});pkArrow(g,1.5,16,30.5,16,{w:2.4,head:6.6})};
pbP['ab-tempest']=g=>{pkArrow(g,3,29,13,3.5,{w:2.3,head:6.6,mat:'fire'});pkArrow(g,3,29,28.5,18.5,{w:2.3,head:6.6,mat:'frost',fletch:'frost'});pkArrow(g,3,29,24,7.5,{w:2.3,head:6.6,mat:'qi',fletch:'qi'});
 pkAt(g,14,5,20,1,g=>pkFlame(g,0,3,8,'fire'));pkSparkle(g,29,22,3,'frost');pbBolt(g,28,4,.22,10,'qi')};
pbP['ab-volley']=g=>{pbRing(g,16,26.5,11,3.8,2,'blood');for(const [x0,y0,x1,y1] of [[3,1.5,10,23],[13,1,16,24],[23,1.5,22,23]])pkArrow(g,x0,y0,x1,y1,{w:2.1,head:6})};
pbP['ab-headshot']=g=>{pkAt(g,19,17,0,.74,g=>{g.translate(-16,-16);PAINT.helmet(g)});pkArrow(g,2.5,30,19.5,13,{w:2.4,head:7});pbImpact(g,20.4,11.6,3,'white',4)};
pbP['ab-cripple']=g=>{pbBoot(g,13,17,.82);pkArrow(g,30,1,17,15,{w:2.4,head:7});pkDrop(g,24.5,30.5,7,'blood')};
pbP['ab-mark']=g=>{pbRing(g,16,16,12,12,2.8,'blood');pbRing(g,16,16,5.4,5.4,2,'blood');for(const [x,y,w,h] of [[14.4,1.5,3.2,7.5],[14.4,23,3.2,7.5],[1.5,14.4,7.5,3.2],[23,14.4,7.5,3.2]])pkFill(g,pkRect(x,y,w,h,1),'blood',{k:.4});pkFill(g,pkCirc(16,16,1.6),'white',{k:.2,lw:.6})};
/* crossbow and firearms */
pbP['ab-xaim']=g=>{pbXbow(g,14,18,.86);pbRing(g,24.5,7.5,6,6,1.8,'blood');pkFill(g,pkCirc(24.5,7.5,1.6),'blood',{k:.2,lw:.6})};
pbP['ab-xheart']=g=>{pbXbow(g,13.5,18.5,.84);pkAt(g,24,9,0,.44,g=>{g.translate(-16,-16);pkFill(g,pkS(PK_HEART),'blood',{k:2.4,inside:()=>pkHi(g,'M6 9.5 Q6.4 6.6 9.2 6.2',2.6,.8)})})};
pbP['ab-xpin']=g=>{pbGround(g,16,26.5,28,7);pkLine(g,'M10 27 L8 29.5 M22 27 L24.5 29.5',1,PK.ink,.7);
 pkFill(g,pkRect(14.4,6,3.2,20,1),'darkwood',{k:.5});pkFill(g,pkS('M16 1.5 L19.4 7.4 L12.6 7.4 Z'),'steel',{k:.5});
 pkFill(g,pkS('M14.4 22 L10.6 26 L10.6 20.6 L14.4 17 Z'),'iron',{k:.4});pkFill(g,pkS('M17.6 22 L21.4 26 L21.4 20.6 L17.6 17 Z'),'iron',{k:.4})};
pbP['ab-reload']=g=>{pbXbow(g,13.5,18,.82);pkFill(g,pbTubeF(pkArc(22,10,7,-60,190,24),()=>2.8),'aura',{k:.5});pkFill(g,pkPoly([12.2,9,19.6,12.6,13.2,15.8]),'aura',{k:.4})};
pbP['ab-blast']=g=>{pbPistol(g,13,18,.86);pkFill(g,pkStarS(28,14.6,4.6,7,2.2),'fire',{k:.4});for(const [x,y,r] of [[29,6,1.8],[24,4,1.5],[30.5,22,1.7],[25.6,25.6,1.5],[30.5,13.5,1.2]])pkFill(g,pkCirc(x,y,r),'iron',{ball:1,k:.3,lw:PK.lw*.8})};
pbP['ab-fdeafen']=g=>{pbPistol(g,10,19,.8);pbImpact(g,21.6,15,4.4,'fire',8);pbArcs(g,21.6,15,[6.4,9.4],35,145,1.9,'white')};
pbP['ab-fexecute']=g=>{pbPistol(g,13,13,.86);pkFill(g,pkStarS(28,9.6,3.6,7,1.8),'fire',{k:.4});pkSkull(g,22.6,24.8,.5,'bone')};

/* ======================= gift abilities: mana (blue) ======================= */
pbP['ab-bolt']=g=>{pbGlow(g,20,12,13,'mana',.6);pkFill(g,pbTubeF(pkQ(2.5,29.5,6,19,16,13,16),pbTaper(8.4,.4)),'mana',{k:.8,lw:PK.lw*.9,inside:(g,m)=>pkHi(g,'M5 25 Q8 18 15 14.4',1.2,.6)});
 pkFill(g,pkCirc(21,11,7.4),'mana',{ball:1,k:1});pkFill(g,pkCirc(19.8,9.8,3.4),['#8ccfff','#8ccfff','#cfeaff','#ffffff','#ffffff'],{ball:1,lw:0,noShade:1,noRim:1});pbGlint(g,18.6,8.6,2.2)};
pbP['ab-blink']=g=>{pbRing(g,8.5,24,5.6,5.6,2,'mana');for(const [x,y,r] of [[13.4,19.2,1.3],[16,16.4,1.5],[18.6,13.6,1.7]])pkFill(g,pkCirc(x,y,r),'mana',{ball:1,k:.3,lw:PK.lw*.8});
 pbGlow(g,23,9,10,'mana',.7);pkSparkle(g,23,9,9,'mana');pkSparkle(g,28.5,18,2.6,'white')};
pbP['ab-chain']=g=>{pbGlow(g,15,15,15,'mana',.45);pbBolt(g,13,15,.98,-18,'mana');pbBolt(g,26,23,.4,30,'mana');pbBolt(g,26.5,6.5,.3,-10,'mana')};
pbP['ab-starfall']=g=>{pbGround(g,18,28.5,26,4.6,'stone');pkFill(g,pbTubeF(pkQ(2,2,8,10,17,19,14),pbTaper(7,.3)),'mana',{k:.6,lw:PK.lw*.85,inside:(g,m)=>pkHi(g,'M5 6 Q10 12 15 17',1,.6)});
 pbGlow(g,20,21,11,'holy',.7);pkStar(g,20,21,8,'holy',5,3.6);pbGlint(g,20,21,3)};
pbP['ab-manashield']=g=>{pbGlow(g,16,16,15,'mana',.4);pkShield(g,16,16.5,{kind:'heater',w:15,h:17,mat:'silver',rim:'mana',rimW:1.5});pbRing(g,16,16,14.6,14.6,2.4,'mana');
 for(const a of [30,150,270]){const r=13.4,x=16+Math.sin(a*Math.PI/180)*r,y=16-Math.cos(a*Math.PI/180)*r;pkFill(g,pkPoly([x,y-2.4,x+1.8,y,x,y+2.4,x-1.8,y]),'white',{k:.3,lw:PK.lw*.8})}};
pbP['ab-blinkstrike']=g=>{for(const [x,y,r] of [[5,9,1.8],[9,4.6,1.4],[3.6,14,1.2]])pkFill(g,pkCirc(x,y,r),'mana',{ball:1,k:.3,lw:PK.lw*.8});
 pbGlow(g,20,12,10,'mana',.45);pkSword(g,10.5,21.5,45,{len:20,w:4.6,guard:12,grip:5});pkSparkle(g,26.5,23,4.6,'mana');pkSparkle(g,17,6,3.4,'mana')};
pbP['ab-vanish']=g=>{pkFill(g,pkS('M16 2.5 C24 2.5 27.4 10 27.4 17 L28.4 27 L3.6 27 L4.6 17 C4.6 10 8 2.5 16 2.5 Z'),'dark',{k:1.4,inside:(g,m)=>pkHi(g,'M8 13 Q9 6 15 4.4',1.3,.5)});
 pkFill(g,pkS('M16 8.6 C21 8.6 22.6 13 22.6 17 C22.6 21 19 23 16 23 C13 23 9.4 21 9.4 17 C9.4 13 11 8.6 16 8.6 Z'),['#000000','#030406','#07080b','#101318','#1c2028'],{lw:PK.lw*.8,noRim:1});
 pbPost(g,o=>{pkGlow(o,12.8,16,3.4,'#9ff6ff',.9);pkGlow(o,19.2,16,3.4,'#9ff6ff',.9);o.fillStyle='#e8ffff';o.fill(pkEll(12.8,16,1.5,.9,-12).p);o.fill(pkEll(19.2,16,1.5,.9,12).p)});
 const sm=['#2c3440','#5a6676','#9aa6b4','#cdd6e0','#ffffff'];for(const [x,y,r] of [[5.4,26.6,4],[12.4,28.4,4.6],[19.8,28.2,4.4],[26.8,26.4,3.9]])pkFill(g,pkCirc(x,y,r),sm,{ball:1,k:.8})};
/* ======================= aura (gold) ======================= */
pbP['ab-astrike']=g=>{pbGlow(g,18,14,14,'aura',.6);pkSword(g,10.5,21.5,45,{len:21,w:4.8,guard:12.5,grip:5.2,mat:'aura',hilt:'brass'});pkSparkle(g,26.5,5.5,5.4,'holy');pbGlint(g,26.5,5.5,2)};
pbP['ab-awave']=g=>{pbGlow(g,12,16,13,'aura',.4);for(const [r,w] of [[8,4.4],[14,4.8],[20,5]])pbArcCut(g,3,16,r,38,142,w,'aura')};
pbP['ab-crush']=g=>{pbGround(g,16,28.5,31,5);pkLine(g,'M10 27 L8.6 29.4 L10.4 31 M22 27 L23.6 29.4 L21.8 31',.9,PK.ink,.8);pkHaft(g,16,1.5,16,12,3.2,'wood');
 pkFill(g,pkRect(6.4,11,19.2,11,2),'aura',{k:1.2,inside:(g,m)=>{pkFill(g,pkRect(13.6,10.6,4.8,11.8,.8),'brass',{k:.5,lw:PK.lw*.8});pkHi(g,'M8 13 L12 13',1.2,.7)}});
 pbImpact(g,4.5,24,3.6,'white',4);pbImpact(g,27.5,24,3.6,'white',4)};
pbP['ab-adash']=g=>{pbGlow(g,20,16,12,'aura',.45);pbSpeed(g,[[1,8,11,9.6,2.4],[1,23,11,21.6,2.4],[13,4,21,7,1.8]],'aura');pkSword(g,11,16,90,{len:18,w:4.8,guard:11.5,grip:4.6,mat:'steel',hilt:'gold'})};
pbP['ab-avatar']=g=>{pbGlow(g,16,15,15,'aura',.6);pkFill(g,pkStarS(16,15,15,12,9),'holy',{k:.6});
 pkFill(g,pkU(pkCirc(16,7.2,3.6),pkRect(12.3,10.6,7.4,10.4,3),pkTube([13,13,7.5,5.5],3,'round'),pkTube([19,13,24.5,5.5],3,'round'),pkTube([14.2,19.5,12,29],3.4,'round'),pkTube([17.8,19.5,20,29],3.4,'round')),'bronze',{k:1})};
/* ======================= qi (teal) ======================= */
pbP['ab-flame']=g=>{pbGlow(g,19,13,13,'fire',.6);pkAt(g,22,12,45,1,g=>pkFlame(g,0,6,19,'fire'));pkSword(g,10.5,21.5,45,{len:19,w:4.6,guard:12,grip:5,mat:['#5a0c04','#b42a0a','#ff7a28','#ffc04a','#fff6b8']})};
pbP['ab-frost']=g=>{pbGlow(g,19,13,13,'frost',.6);pkSword(g,10.5,21.5,45,{len:20,w:4.8,guard:12,grip:5,mat:'frost'});pkSparkle(g,26.5,14.5,4.4,'white');pkSparkle(g,17,5.5,3.4,'frost');pkSparkle(g,27,5,2.4,'white')};
function pbCurl(g,x0,y,x1,r,w,mat){const p=[];for(let x=x0;x<x1;x+=2)p.push(x,y);p.push(...pkArc(x1,y-r,r,180,-80,14));pkFill(g,pbTubeF(p,t=>w*(1-.75*t*t)),mat,{k:.6,lw:PK.lw*.9})}
pbP['ab-gale']=g=>{pbCurl(g,2,12.5,20,5,3.6,'qi');pbCurl(g,6,21,24,4.2,3.4,'qi');pbSpeed(g,[[2,27,18,27,2.4]],'qi')};
pbP['ab-thunder']=g=>{pbGlow(g,16,16,14,'qi',.45);pbRing(g,16,16,13.6,13.6,2.8,'qi');pbBolt(g,16.4,16,.74,12,'qi')};
pbP['ab-dragon']=g=>{const p1=pkQ(4,29,25,28,16,18,12),p2=pkQ(16,18,6,9.6,21,6,12);pkFill(g,pbTubeF(p1,pbTaper(4.2,1)),'frost',{k:.8});pkFill(g,pbTubeF(p2,pbTaper(6,4.2)),'fire',{k:.9});
 pkFill(g,pkTube([22,4.4,26,1.5],1.6,'round'),'bone',{k:.2});pkFill(g,pkEll(23.4,6.8,5,3.6,-15),'fire',{ball:1,k:.8});pkFill(g,pkPoly([26.5,7,30.6,9.5,26,9.6]),'fire',{k:.3});
 g.fillStyle='#fff6b8';g.fill(pkCirc(23.6,5.8,1).p);pkSparkle(g,6,22,2.6,'frost');pkSparkle(g,28,17,2.6,'fire')};
/* ======================= chi (green) ======================= */
pbP['ab-reinforce']=g=>pkShield(g,16,16,{kind:'heater',w:24,h:27,mat:'chi',rim:'silver',emblem:g=>{pbChev(g,0,-1.4,13,8,3,'white');pbChev(g,0,6,9,5,2.4,'white')}});
pbP['ab-mend']=g=>{pbGlow(g,15,17,14,'chi',.5);pbPlus(g,15,17,12,4.4,'chi');pkSparkle(g,26.5,5.5,4.6,'white');pkSparkle(g,5,5,2.6,'chi')};
pbP['ab-empower']=g=>{pbGlow(g,14,17,13,'chi',.5);pbFist(g,13.5,17.5,.9,'chi','leather');pbChev(g,26,12,9.6,6,2.8,'aura');pbChev(g,26,5,9.6,6,2.8,'aura')};
pbP['ab-swift']=g=>{pbSpeed(g,[[1,10,11,12,2.4],[1,16,9,16,2.4],[1,22,11,20,2.4]],'chi');pbGlow(g,20,16,11,'chi',.5);pkGem(g,20.5,16,9.6,'chi')};
pbP['ab-breath']=g=>{const L='M14 9 C8.6 8 3.6 14 3.6 21 C3.6 26.6 6.6 28.6 10 28 C13 27.4 14.5 24 14.5 20 Z';
 pkFill(g,pkS(L),'chi',{k:1.4,inside:(g,m)=>pkHi(g,'M6 18 Q7 13 11 11',1.2,.5)});pkAt(g,32,0,0,1,g=>{g.scale(-1,1);pkFill(g,pkS(L),'chi',{k:1.4})});
 pkFill(g,pkU(pkTube([16,1.8,16,13],3.2,'round'),pkTube([16,12,12.4,16],2.4,'round'),pkTube([16,12,19.6,16],2.4,'round')),'vellum',{k:.5})};
pbP['ab-lotus']=g=>{pbGlow(g,16,18,14,'chi',.5);pkFill(g,pkEll(16,27,13,3.4),'teal',{k:.6});
 const pet=(a,s)=>pkAt(g,16,25,a,s,g=>pkFill(g,pkS('M0 0 C-5.5 -5 -5.5 -13 0 -19 C5.5 -13 5.5 -5 0 0 Z'),'chi',{k:1,inside:(g,mm)=>pkLine(g,'M0 -2 L0 -15',.7,mm[1],.7)}));
 pet(-72,.75);pet(72,.75);pet(-38,.92);pet(38,.92);pet(0,1.05);pkFill(g,pkCirc(16,22.5,2.4),'gold',{ball:1,k:.4})};
pbP['ab-palm']=g=>{pbGlow(g,17,13,14,'chi',.5);pkFill(g,pkStarS(18,13,14,10,8),'chi',{k:.8});pbPalm(g,15,17,.86,'skin')};
pbP['ab-hundred']=g=>{pbPalm(g,8,18,.62,'chi',{rot:-28,noWrist:1});pbPalm(g,24,18,.62,'chi',{rot:28,noWrist:1});pbPalm(g,16,15,.8,'chi',{sleeve:'leather'});pbSpeed(g,[[3,30,9,27,1.8],[29,30,23,27,1.8]],'chi')};
pbP['ab-shatter']=g=>{pbGlow(g,22,14,11,'chi',.5);pbPalm(g,12,17,.82,'chi',{rot:-12});
 for(const [x,y,a,s] of [[24,8,20,1],[28,15,70,.8],[23.5,21,130,.9]])pkAt(g,x,y,a,s,g=>pkFill(g,pkPoly([0,-4,2.4,1.6,-2,2.2]),'white',{k:.4}));pbImpact(g,21,14.5,3.4,'white',4)};
pbP['ab-surge']=g=>{pbGlow(g,16,16,15,'chi',.6);pkSparkle(g,16,16,14.5,'chi');pbPlus(g,16,16,5,1.8,'white');pkSparkle(g,27,5,3.4,'white');pkSparkle(g,5.5,26,2.6,'chi')};
pbP['ab-secwind']=g=>{pkAt(g,12.5,16,0,.7,g=>{g.translate(-16,-16);pkFill(g,pkS(PK_HEART),'blood',{k:2.2,inside:()=>pkHi(g,'M6 9.5 Q6.4 6.6 9.2 6.2',2.4,.8)})});pbPost(g,o=>pkGlint(o,7.8,10.6,1.8));
 pbCurl(g,20,10,27,3.2,2.8,'white');pbSpeed(g,[[21,17,30,17,2.4]]);pbCurl(g,19,24.5,26,3,2.6,'white')};
pbP['ab-triage']=g=>{pbPlus(g,14,15,11.5,4.3,'vellum');pkDrop(g,25,30.5,11,'blood');pkSparkle(g,27,5,3.4,'white')};
/* ======================= command, fists, feet, heads ======================= */
pbP['ab-command']=g=>{pkFill(g,pkRect(1,11.5,5.4,13.6,1.6),'cloth',{k:.6});
 pkFill(g,pkU(pkRect(5,12.6,12.6,11.4,4),pkTube([14,15.2,28.6,9.4],3.8,'round'),pkTube([8.6,13.6,13,8.4],3.4,'round')),'skin',{k:1.2,inside:(g,m)=>pkLine(g,'M8 18 L16.4 17.6 M8 21.4 L15.8 21',.8,m[0],.7)});
 for(const x of [19.5,24.5,29.5])pkGem(g,x,25,2.6,'aura')};
pbP['ab-headbutt']=g=>{pkFill(g,pkCirc(16,19,11),'skin',{ball:1,k:1.4,inside:(g,m)=>{pkLine(g,'M9 15 L14 17 M23 15 L18 17',1.5,PK.ink);g.fillStyle=PK.ink;g.fill(pkCirc(12,19.4,1.2).p);g.fill(pkCirc(20,19.4,1.2).p);pkLine(g,'M12.6 25 Q16 23.4 19.4 25',1.2,PK.ink)}});
 pkFill(g,pkEll(16,9.4,5,2.6),'blood',{k:.4,lw:PK.lw*.8});pkStar(g,5,6,4,'gold',5,1.8);pkStar(g,27,6,4,'gold',5,1.8);pkStar(g,16,2.6,2.6,'gold',5,1.2)};
pbP['ab-rage']=g=>{pbGlow(g,16,17,15,'blood',.5);for(const s of [-1,1])pkFill(g,pkS(`M${16+s*7} 8 C${16+s*10} 5 ${16+s*11} 2.5 ${16+s*13.5} 1.5 C${16+s*12.6} 5 ${16+s*12} 8 ${16+s*10.4} 10 Z`),'bone',{k:.4});
 pkFill(g,pkCirc(16,17.5,12),'blood',{ball:1,k:1.4,inside:(g,m)=>{g.fillStyle='#fff3c0';for(const s of [-1,1]){const e=new Path2D();e.moveTo(16+s*2.4,15.6);e.lineTo(16+s*9,12.4);e.lineTo(16+s*8,17);e.closePath();g.fill(e);g.lineWidth=1;g.strokeStyle=PK.ink;g.stroke(e)}
   pkFill(g,pkRect(10,21.4,12,4.6,1.2),'white',{k:.4,inside:g=>pkLine(g,'M13 21.4 L13 26 M16 21.4 L16 26 M19 21.4 L19 26 M10 23.7 L22 23.7',.8,PK.ink)})}})};
pbP['ab-kick']=g=>{pbSpeed(g,[[1,20,7,18,2.2],[2,26,8,23,2.2]]);pkAt(g,14,17,-28,1,g=>pbBoot(g,0,0,.86));pbImpact(g,26.5,10,5,'aura')};
pbP['ab-haymaker']=g=>{pbSpeed(g,[[1,23,6,21,2.2],[2,29,7,26,2.2]]);pbFist(g,14,18,.86,'skin');pbImpact(g,25.5,7.5,6,'aura')};
pbP['ab-grapple']=g=>{pbPalm(g,10,18,.74,'skin',{rot:38,sleeve:'cloth'});pkAt(g,22,18,0,1,g=>{g.scale(-1,1);pbPalm(g,0,0,.74,'skin',{rot:38,sleeve:'leather'})})};
pbP['ab-tumble']=g=>{pkFill(g,pbTubeF(pkArc(16,17,11.5,-115,85,24),pbTaper(3.4,.6)),'white',{k:.6,lw:PK.lw*.85});pkFill(g,pkPoly([23.5,23,30.6,17.5,30.4,26]),'white',{k:.4});pbBoot(g,14,20,.62)};
/* ======================= monsters: necro, void, goblins, beasts ======================= */
pbP['ab-raise']=g=>{pbGlow(g,16,16,14,'void',.5);pbPalm(g,10,13,.62,'bone',{rot:-14,noWrist:1});pbPalm(g,21,10.5,.72,'bone',{rot:10,noWrist:1});pbGround(g,16,27,31,10);
 pkFill(g,pkPoly([5,22.6,6.4,18,7.6,22.6]),'green',{k:.3,lw:PK.lw*.8});pkFill(g,pkPoly([25,22,26.6,17.6,27.8,22]),'green',{k:.3,lw:PK.lw*.8})};
pbP['ab-web']=g=>{pbPost(g,o=>{const W=new Path2D();for(let i=0;i<8;i++){const a=i*Math.PI/4+.2;W.moveTo(16,16);W.lineTo(16+Math.sin(a)*15,16-Math.cos(a)*15)}
  for(const r of [5.4,9.6,13.6]){for(let i=0;i<=8;i++){const a=i*Math.PI/4+.2,x=16+Math.sin(a)*r,y=16-Math.cos(a)*r;i?W.lineTo(x,y):W.moveTo(x,y)}}
  o.lineJoin='round';o.lineCap='round';o.strokeStyle=PK.ink;o.lineWidth=3;o.stroke(W);o.strokeStyle='#efe9d8';o.lineWidth=1.4;o.stroke(W);
  pkFill(o,pkEll(16,16.6,3,3.8),PBM.spider,{ball:1,k:.6});pkFill(o,pkCirc(16,12.6,2),PBM.spider,{ball:1,k:.4})})};
pbP['ab-pack']=g=>{for(const [x0,y0,x1,y1] of [[13,2.5,3.5,25],[20.5,3.5,11,29],[28.5,5.5,19,30]])pkFill(g,pbTubeF(pkQ(x0,y0,(x0+x1)/2+2.4,(y0+y1)/2+1,x1,y1,16),pbCres(4.6)),'blood',{k:.9,inside:(g,m)=>pkHi(g,`M${x0-.6} ${y0+3} Q${(x0+x1)/2+1.4} ${(y0+y1)/2} ${x1+1} ${y1-4}`,1,.7)})};
pbP['ab-warcry']=g=>{pkFill(g,pkS('M4 9 C4 4 8 2 11.6 2.6 C15.6 3.2 17.6 6.6 17.4 10.4 L19.6 15.4 L17 16 L17.4 21 C17.4 24 15 25 12 24.6 L11.4 29 L4 29 C3 23 3.6 16 4 9 Z'),'skin',{k:1.4,inside:(g,m)=>{pkLine(g,'M11.6 9 L16 10.6',1.4,PK.ink);
  pkFill(g,pkS('M13.4 15.8 L19.4 15.2 L18.6 21.6 L13.8 20.6 Z'),'dark',{k:.4,lw:PK.lw*.8})}});pbArcs(g,15,18,[8.6,12.4,16],48,132,2,'blood')};
pbP['ab-chant']=g=>{pkFill(g,pkTube([5,3,15,12],2.4,'round'),'wood',{k:.4});pkFill(g,pkTube([27,3,17,12],2.4,'round'),'wood',{k:.4});
 pkFill(g,pkS('M4 14 L28 14 L26.6 27 C22 30 10 30 5.4 27 Z'),'cloth',{k:1.4,inside:(g,m)=>{pkLine(g,'M6 16 L11 26 L16 16 L21 26 L26 16',1,PKM.vellum[2],.85);pkFill(g,pkRect(3,24.6,26,3,1),'brass',{k:.4,lw:PK.lw*.8})}});
 pkFill(g,pkEll(16,14,12.4,3.6),'vellum',{k:.6,inside:(g,m)=>pkHi(g,'M7 13.4 Q12 11.4 19 11.6',1,.6)});pkFill(g,pkCirc(5.4,3.4,2),'bone',{ball:1,k:.3});pkFill(g,pkCirc(26.6,3.4,2),'bone',{ball:1,k:.3})};
pbP['ab-nova']=g=>{pbGlow(g,16,16,16,'void',.6);pkFill(g,pkStarS(16,16,15,12,8.6),'void',{k:.8});pkFill(g,pkCirc(16,16,7.4),'void',{ball:1,k:1});
 pkFill(g,pkCirc(15.2,15.2,3.4),['#c49eff','#c49eff','#efe2ff','#ffffff','#ffffff'],{ball:1,lw:0,noShade:1,noRim:1});pbGlint(g,14.6,14.6,2)};
pbP['ab-summon']=g=>{pbGlow(g,16,16,14,'void',.6);pbRing(g,16,16,13.8,13.8,3.2,'void');
 pkFill(g,pkU(pkCirc(16,9.4,3),pkRect(13.2,12.4,5.6,8.4,2),pkTube([13.4,14,9.4,19],2.4,'round'),pkTube([18.6,14,22.6,19],2.4,'round'),pkTube([14.6,19.6,13.2,25.6],2.6,'round'),pkTube([17.4,19.6,18.8,25.6],2.6,'round')),'bone',{k:.8})};
pbP['ab-gather']=g=>{pbGlow(g,16,16,13,'void',.6);for(let i=0;i<8;i++){const a=i*Math.PI/4,r0=i&1?11.5:14.6,r1=8.6;pkFill(g,pbTubeF([16+Math.sin(a)*r0,16-Math.cos(a)*r0,16+Math.sin(a)*r1,16-Math.cos(a)*r1],pbTaper(2.6,.6)),'void',{k:.3,lw:PK.lw*.8})}
 pkFill(g,pkCirc(16,16,6.6),'void',{ball:1,k:.9});pkFill(g,pkCirc(15.2,15.2,2.8),['#c49eff','#c49eff','#efe2ff','#ffffff','#ffffff'],{ball:1,lw:0,noShade:1,noRim:1})};
pbP['ab-riftstep']=g=>{pbGlow(g,16,16,15,'void',.55);pkSwirl(g,16,16,14,'void',2);pkSparkle(g,27,26,3,'white')};
pbP['ab-nbolt']=g=>{pbGlow(g,20,12,12,'void',.6);pkFill(g,pbTubeF(pkQ(2,30,5,20,15,15,16),pbTaper(9,.4)),'void',{k:.8,lw:PK.lw*.9});pkSkull(g,20.5,12,.72,'bone')};
pbP['ab-vlance']=g=>{pbGlow(g,16,16,15,'void',.5);pkFill(g,pbTubeF(pkQ(3.5,28.5,15,17,26,6,14),t=>t<.74?2.2+3.2*t:4.6*(1-t)/.26+.3),'void',{k:.8,inside:(g,m)=>pkHi(g,'M6 25.6 L21 10.6',.9,.8)});
 pkFill(g,pkStarS(26,6,5,8,2.4),'fire',{k:.4});pkFill(g,pkStarS(5,27,4.4,7,2),'void',{k:.4})};
pbP['ab-vward']=g=>{pbGlow(g,16,16,15,'void',.5);pbRing(g,16,16,14.4,14.4,3,'void');pkShield(g,16,16.4,{kind:'heater',w:15,h:17,mat:'silver',rim:'void',rimW:1.5});pkSparkle(g,25,6,3,'white')};
pbP['ab-gslip']=g=>{pbSpeed(g,[[1,9.5,8.5,9.5,2.2],[1.5,15,8.5,15,2.2],[1,20.5,8.5,20.5,2.2]],'green');pbBoot(g,19,16,.9,'green')};
pbP['ab-backstab']=g=>{pkFill(g,pkS('M3 31 C3 23 5.6 18.6 10 16.6 C10.6 11 13 8 16.4 8 C19.8 8 22.4 11 23 16.6 C27.4 18.6 30 23 30 31 Z'),'leather',{k:1.6,inside:(g,m)=>{pkLine(g,'M10 16.6 C13 19 20 19 23 16.6 M16.4 19 L16.4 31',1,m[0],.7);pkHi(g,'M12 12.6 Q13.4 9.6 16 9.2',1.2,.5)}});
 pkSword(g,22.5,8,205,{len:7,w:4,guard:8.6,grip:5});pkDrop(g,21,29,7.5,'blood')};
pbP['ab-zgrab']=g=>{pbPalm(g,16,15,.96,PBM.rot,{claw:1,sleeve:PBM.earth});pkFill(g,pkCirc(14.6,20,1.2),'blood',{k:.2,lw:.5})};
pbP['ab-sbite']=g=>{pkFill(g,pkS('M2 4 C8 1.6 24 1.6 30 4 L28 11 C22 13 10 13 4 11 Z'),PBM.spider,{k:1.2,inside:(g,m)=>{g.fillStyle='#ff4040';for(const x of [11,14,18,21])g.fill(pkCirc(x,6.4,1).p)}});
 for(const s of [-1,1])pkFill(g,pbTubeF(pkQ(16+s*6.4,10,16+s*8.6,19,16+s*3,26,14),t=>4.2-3.6*t),'bone',{k:.6});
 pkDrop(g,19,31,6.5,'poison');pkDrop(g,11.4,30,5,'poison')};
pbP['ab-vbite']=g=>{pkFill(g,pkS('M2 3 C10 1 22 1 30 3 L29 10 C24 12.4 8 12.4 3 10 Z'),'meat',{k:1.2,inside:(g,m)=>pkHi(g,'M5 5 Q16 3 27 5',1.2,.5)});
 for(const s of [-1,1])pkFill(g,pkS(`M${16+s*4} 10 C${16+s*6.6} 13 ${16+s*6.4} 18 ${16+s*4.6} 23.6 C${16+s*3.6} 19 ${16+s*2.4} 15 ${16+s*1.6} 10.6 Z`),'bone',{k:.6});
 pkDrop(g,11.4,31,7,'poison');pkDrop(g,20.6,31,7,'poison')};
pbP['ab-trample']=g=>{pbSpeed(g,[[1,9,8,9,2.2],[1,16,6,16,2.2],[1,23,8,23,2.2]],'blood');
 pkFill(g,pkS('M11.6 20 C11.6 14.6 15 12 19.4 12 C23.8 12 27.2 14.6 27.2 20 C27.2 25 23.6 28.6 19.4 28.6 C15.2 28.6 11.6 25 11.6 20 Z'),PBM.hide,{k:1.2});
 for(const [x,y] of [[11,9.4],[15.6,6],[21.6,5.6],[26.6,8.6]]){pkFill(g,pkPoly([x-1.2,y-2.2,x+.4,y-6,x+1.6,y-2.2]),'bone',{k:.2,lw:PK.lw*.8});pkFill(g,pkEll(x,y,2.8,3.3),PBM.hide,{ball:1,k:.5})}};
/* ======================= serpent ======================= */
function pbSnakeHead(g,x,y,a,s){pkAt(g,x,y,a,s,g=>{pkLine(g,'M0 -8 L0 -10.6 L-1.4 -12.2 M0 -10.6 L1.4 -12.2',.9,'#d82a2a');
 pkFill(g,pkS('M0 4 C-4 4 -5 0 -4 -4 C-3 -7 -1 -8 0 -8 C1 -8 3 -7 4 -4 C5 0 4 4 0 4 Z'),PBM.serp,{k:.8});g.fillStyle=PK.ink;g.fill(pkEll(-2,-3.6,.9,1.3).p);g.fill(pkEll(2,-3.6,.9,1.3).p)})}
pbP['ab-slither']=g=>{pbSpeed(g,[[1,26,6,24,2],[1,30.6,8,29,2]],'white');const p=pkQ(4,30,24,27,15,18,10).concat(pkQ(15,18,6,9,21,8,10).slice(2));
 pkFill(g,pbTubeF(p,pbTaper(5,1.2)),PBM.serp,{k:1,inside:(g,m)=>{for(let i=8;i<p.length-4;i+=6)pkLine(g,`M${p[i]-1.4} ${p[i+1]-1.4} L${p[i]+1.4} ${p[i+1]+1.4}`,.8,m[0],.6)}});pbSnakeHead(g,23,7,70,1)};
pbP['ab-vspit']=g=>{pkFill(g,pbTubeF([1,31,4,27.6,7.4,24.6],()=>5.6),PBM.serp,{k:.8});pbSnakeHead(g,10,21,45,1.25);
 for(const [x,y,h] of [[20,15,7],[26,9,6.4],[27.5,18.5,5]])pkDrop(g,x,y,h,'poison')};
function pbCoil(g,x,y,s){pkAt(g,x,y,0,s,g=>{for(const [cy,rx,ry] of [[9,12,4.6],[3,10,4],[-2.6,8,3.4]])pkFill(g,pkEll(0,cy,rx,ry),PBM.serp,{k:1,inside:(g,m)=>{for(let i=-2;i<=2;i++)pkLine(g,`M${i*rx*.36} ${cy+ry*.2} l1 ${ry*.6}`,.8,m[0],.6)}});pbSnakeHead(g,1,-6.6,0,.9)})}
pbP['ab-coil']=g=>pbCoil(g,16,17,1.1);
pbP['ab-constrict']=g=>{pbCoil(g,16,18,.98);for(const s of [-1,1])pkFill(g,pkPoly([16+s*15.4,10,16+s*15.4,22,16+s*11.2,16]),'blood',{k:.4});pbImpact(g,16,28,3,'white',4)};
/* ======================= ent (wood) ======================= */
pbP['ab-bramble']=g=>{const p=pkQ(3,29,9,9,28,4,18);pkFill(g,pbTubeF(p,t=>4.2-2*t),'darkwood',{k:.6,inside:(g,m)=>pkHi(g,'M5 25 Q9 12 20 6.6',.9,.4)});
 for(let i=4;i<p.length-4;i+=6){const x=p[i],y=p[i+1],u=(i/6)&1;pkFill(g,pkPoly([x-1.2,y,x+1.2,y,x+(u?3.4:-3.2),y+(u?1:-3.4)]),'bone',{k:.2,lw:PK.lw*.8})}
 pkFill(g,pkS('M10 18 C13 15 17 15 18 17 C15 19.6 12 19.6 10 18 Z'),'green',{k:.5});pkFill(g,pkCirc(28,4.6,2.2),'blood',{ball:1,k:.3})};
pbP['ab-entangle']=g=>{for(const [x0,x1,cx,c] of [[9,4,6,1],[16,17,15,-1],[23,28,26,1]])pkFill(g,pbTubeF(pkQ(x0,26,cx-c*6,14,x1,5,14).concat(pkArc(x1+c*2,5,2,c>0?270:90,c>0?90:270,6)),t=>4.4-3.6*t),PBM.earth,{k:.6});
 for(const [x,y,a] of [[6,14,-40],[19,12,40],[24,17,-30]])pkAt(g,x,y,a,1,g=>pkFill(g,pkS('M0 0 C-2.4 -2 -2.4 -5 0 -7 C2.4 -5 2.4 -2 0 0 Z'),'green',{k:.4}));pbGround(g,16,28.6,31,6)};
function pbLimbs(g){pbGround(g,16,29,31,5);for(const s of [-1,1])pkFill(g,pbTubeF(pkQ(16+s*14,3,16+s*8,10,16-s*5,25,12),t=>5.6-1.8*t),'wood',{k:.8,inside:(g,m)=>pkLine(g,`M${16+s*12} 6 L${16+s*9} 9`,.7,m[0],.6)});
 pkFill(g,pkTube([24,8,28.6,10.6],1.8,'round'),'wood',{k:.2});pkFill(g,pkS('M27.6 10 C29.6 8.4 31 9 31 10.6 C29.4 11.6 28.4 11.2 27.6 10 Z'),'green',{k:.3});pbImpact(g,16,24.6,4.4,'white',6)}
pbP['ab-limbcrush']=pbLimbs;pbP['ab-limb']=pbLimbs;
pbP['ab-groots']=g=>{for(const [x0,y0,cx,cy,x1,y1] of [[6,24,2,10,10,6],[14,23,14,8,20,3],[22,24,30,14,28,6],[18,25,24,18,30,22]])pkFill(g,pbTubeF(pkQ(x0,y0,cx,cy,x1,y1,14),t=>4.6-3.8*t),PBM.earth,{k:.6});
 pbGround(g,16,27,31,9);for(const [x,y] of [[8,26],[24,27],[16,29]])pkFill(g,pkPoly([x-1.6,y,x,y-1.6,x+1.8,y+.4,x,y+1.4]),'stone',{k:.3,lw:PK.lw*.8})};
pbP['ab-grove']=g=>{pbGround(g,16,28.6,29,6);pkFill(g,pkU(pkTube([16,27,16,15],3.6,'flat'),pkTube([16,19,11,14],2,'round'),pkTube([16,17,21,12.4],2,'round')),'wood',{k:.6});
 for(const [x,y,r] of [[10,10,5.6],[22,9,6],[16,6,6.6]])pkFill(g,pkCirc(x,y,r),'green',{ball:1,k:1});pkFill(g,pkCirc(19,9,1.4),'blood',{ball:1,k:.2,lw:.6});pkFill(g,pkCirc(11.6,12.4,1.3),'blood',{ball:1,k:.2,lw:.6});pkSparkle(g,27,20,2.6,'chi')};
pbP['ab-barkskin']=g=>pkShield(g,16,16,{kind:'heater',w:24,h:27,mat:'darkwood',rim:'wood',rimW:2.4,emblem:g=>{for(const x of [-7,-3.4,0,3.6,7])pkLine(g,`M${x} -11 Q${x+1.4} -3 ${x-.6} 4 Q${x+.8} 8 ${x} 11`,1.1,PK.ink,.6);pkFill(g,pkS('M-2 -2 C1 -5 5 -5 6 -2 C3 0 0 0 -2 -2 Z'),'green',{k:.3,lw:PK.lw*.8})}});
/* ======================= ogre ======================= */
function pbClub(g,x0,y0,x1,y1){pkFill(g,pbTubeF([x0,y0,(x0+x1)/2,(y0+y1)/2,x1,y1],t=>2.8+4*t),'darkwood',{k:.9,inside:(g,m)=>pkHi(g,`M${x0+1} ${y0-1.6} L${x1-1.2} ${y1+.6}`,.9,.4)});
 const dx=x1-x0,dy=y1-y0,l=Math.hypot(dx,dy);for(const [t,s] of [[.62,1],[.8,-1],[.95,1]]){const w=(2.8+4*t)/2,nx=-dy/l*s,ny=dx/l*s,x=x0+dx*t+nx*w,y=y0+dy*t+ny*w;pkFill(g,pkPoly([x-dx/l*1.2,y-dy/l*1.2,x+nx*2.4,y+ny*2.4,x+dx/l*1.2,y+dy/l*1.2]),'bone',{k:.2,lw:PK.lw*.8})}}
pbP['ab-ohurl']=g=>{pbClub(g,3,30,11,15);pkFill(g,pbTubeF(pkQ(10,11,19,-1,27.4,10,16),pbTaper(4,1)),'white',{k:.5,lw:PK.lw*.9});pkFill(g,pkPoly([23,9.6,31.4,8.4,28.6,16.4]),'white',{k:.4});pbImpact(g,14,20,3.4,'white',4)};
pbP['ab-osweep']=g=>{pbArcCut(g,13,19,14,-30,160,4.6,'white',{tail:1});pbClub(g,4,29,17,10)};
pbP['ab-oslam']=g=>{pbRing(g,16,26.4,14.6,4.8,2,'white');pbRing(g,16,26.4,9,3,1.8,'white');pbFist(g,16,13,.78,PBM.ogre,'leather');pbImpact(g,4.5,18,2.8,'white',4);pbImpact(g,27.5,18,2.8,'white',4)};
/* ======================= wyvern ======================= */
pbP['ab-wbite']=g=>{pkFill(g,pkS('M3 15 L28 18 L27 21 C21 26 10 26 4 23 Z'),PBM.wyv,{k:1,inside:(g,m)=>{g.fillStyle=PKM.bone[3];for(const x of [8,13,18,23])g.fill(pkPoly([x-1.5,18.6+x*.1,x,13.6+x*.12,x+1.5,18.8+x*.1]).p)}});
 pkFill(g,pkS('M2 9 C9 2.6 21 3 30 9 L29 13 L3 15 Z'),PBM.wyv,{k:1.2,inside:(g,m)=>{g.fillStyle=PKM.bone[3];for(const x of [7,12,17,22,27])g.fill(pkPoly([x-1.6,13.6,x,19,x+1.6,13.4]).p);pkHi(g,'M7 7 Q15 3.6 24 6',1.1,.5)}});
 g.fillStyle='#ffe066';g.fill(pkEll(22,7.6,1.8,1.2,-10).p);g.fillStyle=PK.ink;g.fill(pkEll(22.3,7.6,.5,1).p)};
function pbSting(g,s,drops){pkFill(g,pbTubeF(pkQ(2,30,4,15,18*s+2,14,14),pbTaper(4.8*s,5.6)),PBM.wyv,{k:.8,inside:(g,m)=>pkHi(g,'M3.6 24 Q5 17 11 15',1,.4)});
 pkAt(g,18*s+2.4,14,60,s,g=>{pkFill(g,pkS('M-3 2 C-3 -4 -1 -9 0 -14 C1 -9 3 -4 3 2 Z'),'bone',{k:.6});pkFill(g,pkPoly([-2.4,-1,-6,-3,-2.6,-5]),'bone',{k:.2,lw:PK.lw*.8})});
 for(const d of drops)pkDrop(g,d[0],d[1],d[2],'poison')}
pbP['ab-wsting']=g=>pbSting(g,1.25,[[24,31,8.4],[30,24,6]]);
pbP['ab-hsting']=g=>pkAt(g,2,4,0,.88,g=>pbSting(g,1,[[24,30,8.4]]));
pbP['ab-wbuffet']=g=>{pkFill(g,pkS('M3 4 L13 3 C19 9 21 17 21 28 C17 26 15 24 12.6 22 C11 25 9 26 6.4 26.6 C7 22 6.4 19 4.6 16 C3 13 2.6 8 3 4 Z'),PBM.wyv,{k:1.4,inside:(g,m)=>pkLine(g,'M3 4 L12.6 22 M3 4 L6.4 26.6 M13 3 L21 28',1,m[0],.7)});
 pkFill(g,pkTube([3,4,13,3],2.4,'round'),'bone',{k:.2});pbSpeed(g,[[30,9,22,11,2.4],[31,16,23,17,2.4],[30,23,24,23,2.4]],'white')};
pbP['ab-wdive']=g=>{pkFill(g,pkS('M16 20 C11 14 6 9 1.6 3 C6 5 10 7 13.6 10 L16 6 L18.4 10 C22 7 26 5 30.4 3 C26 9 21 14 16 20 Z'),PBM.wyv,{k:1.2,inside:(g,m)=>pkLine(g,'M16 20 L4 5 M16 20 L28 5',.9,m[0],.6)});
 pkFill(g,pkS('M12.4 20 L19.6 20 L19.6 24 L23.4 24 L16 31 L8.6 24 L12.4 24 Z'),'aura',{k:.6})};
pbP['ab-wdiveb']=g=>{pbGround(g,16,27.6,31,6);pbGlow(g,16,18,13,'aura',.6);pkFill(g,pkStarS(16,18,13,12,6),'aura',{k:.8});pkFill(g,pkCirc(16,18,4.6),'holy',{ball:1,k:.5});
 for(const [x,y,s] of [[4,24,1.8],[28,23,2],[22,29.6,1.4]])pkFill(g,pkPoly([x-s,y,x,y-s,x+s,y+.2,x,y+s*.8]),'stone',{k:.2,lw:PK.lw*.8})};
/* ======================= fabled weapons ======================= */
pbP['ab-fb_demon']=g=>{pbGlow(g,16,16,15,'blood',.4);pbArcCut(g,16,16,13.2,-155,150,4.8,'blood',{tail:1});pkSword(g,16,21.5,0,{len:16,w:4.2,guard:10,grip:4.4,mat:['#1a0606','#4a0e10','#8a1c22','#c84a4a','#ffb0a0'],hilt:'dark'})};
pbP['ab-fb_saint']=g=>{pbGlow(g,16,18,15,'holy',.7);pbRing(g,16,4,3.4,3.4,1.4,'brass');pkFill(g,pkS('M9 10 L23 10 L21 6.6 L11 6.6 Z'),'brass',{k:.5});
 pkFill(g,pkRect(10,10,12,15,2.6),['#8a6a20','#e8c050','#fff2b0','#fffbe8','#ffffff'],{k:.6,inside:g=>pkFlame(g,16,23,11,'holy')});pkLine(g,'M13 10 L13 25 M19 10 L19 25',1.1,PK.ink,.9);
 pkFill(g,pkRect(8.4,24,15.2,4.2,1.4),'brass',{k:.5});pkSparkle(g,4.6,14,2.6,'holy');pkSparkle(g,27.6,16,2.6,'holy')};
