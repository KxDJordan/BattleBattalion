/* ================= PAINTED ICONS, PACKAGE A: shared family helpers =================
   UI, HUD, resources, contracts / sites / buildings / goals / reputation / origins / personalities / followers, traits,
   difficulty, menus and masteries (06pa-ui.js, 06pa-people.js, 06pa-mast.js). Only PAINT entries and local pa* helpers;
   everything is drawn with the kit of 06p-iconspaint.js (docs/icons-paint-guide.md). */
/* draw a 32-unit drawing scaled s about (cx,cy) (default: the centre) */
function paIn(g,s,fn,cx,cy){pkAt(g,cx==null?16:cx,cy==null?16:cy,0,s,g=>{g.translate(-16,-16);fn(g)})}
const paEye=(g,x,y,rx,ry)=>{g.fillStyle=PK.ink;g.fill(pkEll(x,y,rx||.9,ry||1.2).p)};
/* a leaf (base at 0,0, pointing up) */
const PA_LEAF='M0 0 C-2.4 -1.8 -2.5 -5.2 0 -7.6 C2.5 -5.2 2.4 -1.8 0 0 Z';
function paLeaf(g,x,y,a,s,mat){pkAt(g,x,y,a,s||1,g=>pkFill(g,pkS(PA_LEAF),mat||'green',{k:.6,lw:PK.lw*.85,inside:(g,m)=>pkLine(g,'M0 -.6 L0 -6',.5,m[1],.8)}))}
/* laurel: two branches on a circle (cx,cy,r), from the bottom up to the angle top (deg from up) */
function paLaurel(g,cx,cy,r,o){o=o||{};const n=o.n||5,top=o.top==null?42:o.top,mat=o.mat||'green',s=o.s||1;
 for(const side of [-1,1]){const a0=180,a1=side<0?360-top:top,pts=[];for(let i=0;i<=12;i++){const a=(a0+(side<0?(a1-a0):(a1-a0))*i/12)*Math.PI/180;pts.push(cx+Math.sin(a)*r,cy-Math.cos(a)*r)}
  pkFill(g,pkTube(pts,[1.6*s,.8*s],'round'),o.stem||'wood',{k:.4,lw:PK.lw*.8});
  for(let i=0;i<n;i++){const t=(i+.6)/(n+.2),a=a0+(a1-a0)*t,ar=a*Math.PI/180,x=cx+Math.sin(ar)*r,y=cy-Math.cos(ar)*r,tan=side<0?a+90:a-90;
   paLeaf(g,x,y,tan+side*32,s*(.85+.25*t),mat);paLeaf(g,x,y,tan-side*38,s*(.75+.2*t),mat)}}}
/* crown: band from y1-5 to y1, points up to y0; mat, gem material */
function paCrown(g,mat,gem,o){o=o||{};const y0=o.y0==null?4:o.y0,y1=o.y1==null?23:o.y1,x0=o.x0==null?3:o.x0,x1=32-x0,h=y1-y0;
 const S=pkS(`M${x0+.8} ${y1} L${x0} ${y0+h*.3} L${x0+(x1-x0)*.25} ${y0+h*.62} L16 ${y0+h*.1} L${x1-(x1-x0)*.25} ${y0+h*.62} L${x1} ${y0+h*.3} L${x1-.8} ${y1} Z`);
 pkFill(g,S,mat,{k:1.5,inside:(g,m)=>{pkFill(g,pkRect(x0,y1-h*.27,x1-x0,h*.27,.8),mat,{k:.6,lw:PK.lw*.9,inside:(g,mm)=>pkHi(g,`M${x0+1.5} ${y1-h*.27+1} L${x1-6} ${y1-h*.27+1}`,.8,.6)})}});
 for(const [x,y] of [[x0,y0+h*.3],[16,y0+h*.1],[x1,y0+h*.3]])pkFill(g,pkCirc(x,y-1,o.ball||1.9),mat,{ball:1,k:.5});
 if(gem)pkGem(g,16,y1-h*.135,o.gr||2.6,gem,'round')}
/* rounded-square badge for followers (dark teal, like the old portrait frames) with a clip for the bust */
const PA_FOLM=['#061a18','#123c37','#24645a','#3f8a7c','#9fd8c8'];
/* a person seen from the front, chest up: o {body, skin, hair(g), hat(g), beard(g), chest(g,m), tool(g)} */
function paBust(g,o){const sk=o.skin||'skin';
 pkFill(g,pkS('M3.5 33 C3.5 25 8.5 21.4 16 21.4 C23.5 21.4 28.5 25 28.5 33 Z'),o.body||'cloth',{k:1.3,inside:(g,m)=>{if(o.chest)o.chest(g,m);else pkLine(g,'M16 22 L16 31',.7,m[1],.8)}});
 pkFill(g,pkRect(13.6,17,4.8,5.6,1.6),sk,{k:.6,noRim:1});
 if(o.back)o.back(g);
 pkFill(g,pkEll(16,13.4,5.9,6.8),sk,{ball:1,k:.9,lw:PK.lw*.9});
 paEye(g,13.7,13.8,.8,1.05);paEye(g,18.3,13.8,.8,1.05);
 if(o.beard)o.beard(g);else pkLine(g,'M14.6 17.6 Q16 18.4 17.4 17.6',.7,PKM.skin[0],.8);
 if(o.hair)o.hair(g);if(o.hat)o.hat(g)}
function paFol(o){return g=>{pkBadgeBack(g,PA_FOLM,{bg0:'#2e5a54',bg1:'#0e1d1b'});
 const C=pkRect(3.9,3.9,24.2,24.2,3.8);g.save();g.clip(C.p);pkAt(g,16,17,0,1.02,g=>{g.translate(-16,-17);paBust(g,o)});g.restore();if(o.tool)o.tool(g)}}
/* trait badge: green frame (good) or red (bad) by the trait's own rule, the glyph (a 32-unit drawing) at scale s */
function paTrait(key,fn,s){return g=>{let good=true;try{good=trGood(key)}catch(e){}pkBadgeBack(g,good?'good':'bad');paIn(g,s||.74,fn,16,16.2)}}
/* mastery medallion: ring + dark field + emblem (a 32-unit drawing at scale s) */
function paMedal(g,ring,field,fn,s){pkFill(g,pkCirc(16,16,14.6),ring,{k:1.6,inside:(g,m)=>pkHi(g,'M5.2 10.5 Q8 4.6 14.5 3.2',1.2,.6)});
 pkFill(g,pkCirc(16,16,10.9),field||'dark',{k:1,noRim:1,inside:(g,m)=>{const gr=g.createRadialGradient(13,11,1,16,16,11);gr.addColorStop(0,'rgba(255,255,255,.14)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(4,4,24,24)}});
 if(fn)paIn(g,s||.66,fn)}
/* a rounded face (reputation): mat, mouth path, brows path */
function paFace(g,mat,mouth,brows,o){o=o||{};pkFill(g,pkRect(3.2,3.6,25.6,25,9.5),mat,{ball:1,k:2,inside:(g,m)=>pkHi(g,'M7.5 10 Q8.5 6.6 12.5 6.2',1.6,.6)});
 paEye(g,11.6,14.4,1.7,2.3);paEye(g,20.4,14.4,1.7,2.3);g.fillStyle='#ffffff';g.globalAlpha=.85;g.fill(pkCirc(11,13.4,.6).p);g.fill(pkCirc(19.8,13.4,.6).p);g.globalAlpha=1;
 if(brows)pkLine(g,brows,1.9,PK.ink);if(mouth)pkLine(g,mouth,1.9,PK.ink)}
/* covered wagon (side view): cover material */
function paWagon(g,cover,o){o=o||{};pkFill(g,pkS('M5 19 C4.5 9 9 5.5 16.5 5.5 C24 5.5 28.5 9 28 19 Z'),cover||'canvas',{k:1.6,inside:(g,m)=>pkLine(g,'M11.5 7 Q10 13 10.5 19 M17 5.6 L17 19 M22.5 7 Q24 13 23.5 19',.8,m[1],.8)});
 pkFill(g,pkRect(2.5,18,27,5,1),'wood',{k:.8,inside:(g,m)=>pkLine(g,'M3 20.5 L29 20.5',.6,m[1],.7)});
 pkLine(g,'M29.5 21 L31.3 23',1.6,PKM.wood[1]);
 const wheel=(x)=>pkFill(g,pkCirc(x,25,4.6),'darkwood',{k:.8,inside:(g,m)=>{pkLine(g,`M${x-3.4} 25 L${x+3.4} 25 M${x} 21.6 L${x} 28.4`,.8,m[3],.8);pkFill(g,pkCirc(x,25,1.3),'iron',{ball:1,k:.3,lw:.6})}});wheel(8.5);wheel(23.5);
 if(o.extra)o.extra(g)}
/* open book (front view), cover material */
function paBook(g,cover,o){o=o||{};const y=o.y||9;pkFill(g,pkS(`M1.5 ${y+2} L1.5 ${y+19} Q9 ${y+16.5} 16 ${y+20} Q23 ${y+16.5} 30.5 ${y+19} L30.5 ${y+2} Z`),cover||'blue',{k:1});
 const page=(d)=>pkFill(g,pkS(d),'vellum',{k:1.1,inside:(g,m)=>{}});
 page(`M3 ${y} Q9.5 ${y-2} 16 ${y+1.5} L16 ${y+17.5} Q9.5 ${y+14} 3 ${y+16.5} Z`);page(`M29 ${y} Q22.5 ${y-2} 16 ${y+1.5} L16 ${y+17.5} Q22.5 ${y+14} 29 ${y+16.5} Z`);
 for(let i=0;i<4;i++){pkLine(g,`M5.5 ${y+3+i*3} Q10 ${y+1.6+i*3} 13.6 ${y+4.2+i*3}`,.7,PKM.vellum[1],.85);pkLine(g,`M18.4 ${y+4.2+i*3} Q22 ${y+1.6+i*3} 26.5 ${y+3+i*3}`,.7,PKM.vellum[1],.85)}
 pkLine(g,`M16 ${y+1.5} L16 ${y+17.5}`,1,PK.ink,.9)}
/* arrow shape (a block arrow) pointing in direction deg (0 = up) about (cx,cy) */
function paBlockArrow(g,cx,cy,deg,s,mat){pkAt(g,cx,cy,deg,s||1,g=>pkFill(g,pkS('M0 -12 L10 -1.5 L4 -1.5 L4 11 L-4 11 L-4 -1.5 L-10 -1.5 Z'),mat||'gold',{k:1.1}))}
/* stack of papers / documents (export, import) */
function paPapers(g){for(const [y,m] of [[24.5,'canvas'],[21,'vellum'],[17.5,'vellum']])pkFill(g,pkS(`M3 ${y} Q4 ${y-2.6} 7 ${y-2.6} L29 ${y-2.6} Q27.5 ${y} 28.5 ${y+3.4} L5 ${y+3.4} Q2.5 ${y+3} 3 ${y} Z`),m,{k:.8,inside:(g,mm)=>pkLine(g,`M8 ${y+.4} L24 ${y+.4}`,.6,mm[1],.7)})}
/* paw print (pad + four toes) at (x,y), scale s, material */
function paPaw(g,x,y,s,mat,rot){pkAt(g,x,y,rot||0,s||1,g=>{const m=mat||'leather';pkFill(g,pkS('M0 -1.5 C4 -1.5 7 2 7 5.5 C7 8.2 4.5 8.8 2.6 8 C1.4 7.5 -1.4 7.5 -2.6 8 C-4.5 8.8 -7 8.2 -7 5.5 C-7 2 -4 -1.5 0 -1.5 Z'),m,{k:1.1});
 for(const [tx,ty,r] of [[-7.4,-3.6,2.5],[-2.7,-7.6,2.7],[2.7,-7.6,2.7],[7.4,-3.6,2.5]])pkFill(g,pkEll(tx,ty,r*.85,r*1.1),m,{ball:1,k:.6})})}
/* pennant-hung banner (vertical, swallowtail) from a crossbar: x left of cloth, y top, w, h */
function paBanner(g,x,y,w,h,mat,emblem){pkFill(g,pkS(`M${x} ${y} L${x+w} ${y} L${x+w} ${y+h} L${x+w/2} ${y+h-w*.42} L${x} ${y+h} Z`),mat,{k:1.3,inside:(g,m)=>{pkHi(g,`M${x+1.6} ${y+1.5} L${x+1.6} ${y+h-2.5}`,1,.4);if(emblem)emblem(g,m)}})}
/* simple straight sword drawn by the kit, iron by default */
const paSword=(g,x,y,a,o)=>pkSword(g,x,y,a,Object.assign({len:17,w:4,guard:10,grip:4.6},o||{}));
/* canvas of a painted pa-* twin (own glyphs outside ICONS: objective marks) at px device pixels; null at Detail Low */
function paCanvas(n,px){if(!hdArt()||!pkHas(n))return null;px=Math.max(8,px|0);const id='pa:'+n+'@'+px;let c=PK.cv.get(id);if(c===undefined){c=pkRender(PAINT[n],px);PK.cv.set(id,c)}return c}
/* the static icons of body.html (world buttons, HUD) never pass through pxIcon(): give them their painted rule once the page is up */
if(typeof window==='object'&&window.addEventListener)window.addEventListener('load',()=>{try{if(hdArt()&&typeof ihdOnScreen==='function')ihdOnScreen()}catch(e){}});
/* anvil (trait hardhead, Grimhild's tree) */
const paAnvil=(g,mat)=>pkFill(g,pkS('M2 6 L27 6 L27 9 Q29 9.5 31 8.5 Q30.5 13 26 14 L22 14 L20.5 20 L25 23 L25 27 L7 27 L7 23 L11.5 20 L10 14 C5 14 2.5 10 2 6 Z'),mat||'iron',{k:1.4,inside:()=>pkHi(g,'M4 7.6 L25 7.6',1.2,.6)});
