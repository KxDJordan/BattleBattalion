/* ================= FIST WEAPONS ON THE FIGURES (the fists update; the items: 11x-fists.js) =================
   Detail Low: each fist weapon is drawn on the part grid of 73-units.js around the fist (usWdef cases, a wrapper like the gladiators' cestus,
   73g-gladiators.js; US_WHAND maps the items' looks), cls 'fist' (punch poses); the 16 px item icons come from the same cells.
   Detail High: the composed figures (73m-skel.js) draw no weapon for a fist; fsHandWear(q, id, R) paints the fist weapon over the hand part of
   the weapon arm (and, for wraps, cestus and gauntlets, the off hand too), in the hand's own frame (R: its part rectangle), called from drawArm.
   Every fist weapon is drawn: the wraps, knuckle-dusters, tiger claws, hand hooks, mailed gauntlets, the katar, and the cestus and spiked cestus.
   No rnd(). */
Object.assign(US_WHAND,{wraps:'wraps',knuckles:'knuckles',baghnakh:'baghnakh',shuko:'shuko',gauntlet:'gauntlet',katar:'katar'});
{const u0=usWdef;usWdef=function(id){if(US_W[id])return US_W[id];const S=USR,c=[];let tip=1;
  switch(id){
   case'wraps':c.push([0,0,S.white,0,0],[0,1,S.white,-1,0],[1,0,S.white,1,1],[1,1,S.white,0,1]);tip=1;break;
   case'knuckles':c.push([0,0,S.leather,0,0],[0,1,S.leather,-1,0],[1,-1,S.brass,0,1],[1,0,S.brass,1,1],[1,1,S.brass,0,1],[1,2,S.brass,-1,1]);tip=1;break;
   case'baghnakh':c.push([0,0,S.leather,0,0],[0,1,S.leather,-1,0],[1,0,S.iron,1,1],[1,1,S.iron,0,1],[2,-1,S.plate,1,2],[2,1,S.plate,1,2],[3,-1,S.plate,0,2],[3,1,S.plate,0,2],[2,0,S.plate,0,2]);tip=3;break;
   case'shuko':c.push([-1,0,S.dleather,0,0],[0,0,S.iron,0,0],[0,1,S.iron,-1,0],[1,0,S.iron,1,1],[2,0,S.plate,1,2],[2,1,S.plate,0,2],[2,-1,S.plate,0,2]);tip=2;break;
   case'gauntlet':c.push([-1,0,S.steel,0,0],[-1,1,S.steel,-1,0],[0,0,S.plate,1,1],[0,1,S.plate,0,1],[1,0,S.plate,1,1],[1,1,S.steel,0,1],[0,-1,S.steel,0,1]);tip=1;break;
   case'katar':c.push([0,-1,S.iron,0,0],[0,1,S.iron,0,0],[0,0,S.dwood,0,0],[1,-1,S.iron,1,1],[1,0,S.brass,1,1],[1,1,S.iron,0,1],[2,0,S.plate,1,2],[3,0,S.plate,1,2],[4,0,S.plate,0,2],[5,0,S.plate,1,2]);tip=5;break;
   default:return u0(id)}
  c.sort((a,b)=>a[4]-b[4]);return US_W[id]={id,c,cls:'fist',two:0,h2:0,tip,gem:null,bow:0,reach:false}}}
/* ---- Detail High: the fist weapon over the hand part. R: the hand part's rectangle (w, h, px, py: the wrist's pivot); the hand's local
   frame has +y along the arm toward the knuckles, +x across the back of the hand. ---- */
const FS_HANDW={wraps:'wraps',knuckles:'knuckles',baghnakh:'baghnakh',shuko:'shuko',gauntlet:'gauntlet',katar:'katar',cestus:'cestus',cestus2:'cestus2'};
const fsBoth=id=>id==='wraps'||id==='cestus'||id==='cestus2'||id==='gauntlet';   // worn on both hands
function fsHandWear(q,id,R,off){if(typeof humSh!=='function')return;const L=r=>humLit(r),cx=R.w*.5-R.px,cy=R.h*.55-R.py,w=R.w*.5,h=R.h*.5;
 const band=(y0,y1,col,k)=>humSh(q,humP(p=>humRR(p,cx-w*(k||.96),cy+y0*h,2*w*(k||.96),(y1-y0)*h,Math.min(10,(y1-y0)*h*.4))),col,{dk:.22,lw:4});
 const blade=(x,len,col)=>humSh(q,humPoly([cx+x-7,cy+h*.75,cx+x+7,cy+h*.75,cx+x+2,cy+h*.75+len,cx+x,cy+h*.75+len+8]),col,{dk:.15,lw:4});
 switch(id){
  case'wraps':for(const y of [-.8,-.15,.5])band(y,y+.55,'#ece4cf',1.02);break;
  case'cestus':case'cestus2':band(-.8,-.2,L(USR.leather));band(-.15,.75,L(id==='cestus2'?USR.steel:USR.iron));
   if(id==='cestus2'&&!off)for(const x of [-.6,0,.6])humSh(q,humPoly([cx+x*w-6,cy+h*.74,cx+x*w+6,cy+h*.74,cx+x*w,cy+h*1.08]),L(USR.plate),{dk:.1,lw:4});break;
  case'knuckles':band(-.55,-.15,L(USR.leather));band(.35,.85,L(USR.brass),1.12);for(const x of [-.55,0,.55])humSh(q,humP(p=>p.arc(cx+x*w,cy+h*.6,7,0,7)),L(USR.brass),{dk:.3,lw:4});break;
  case'baghnakh':band(-.25,.25,L(USR.iron));for(const x of [-.6,-.2,.2,.6])humSh(q,humP(p=>{p.moveTo(cx+x*w-5,cy+h*.2);p.quadraticCurveTo(cx+x*w+10,cy+h*.9,cx+x*w+2,cy+h*1.45);p.lineTo(cx+x*w-3,cy+h*.9);p.closePath()}),L(USR.plate),{dk:.1,lw:4});break;
  case'shuko':band(-.9,-.5,L(USR.dleather));band(-.3,.3,L(USR.iron),1.1);for(const x of [-.55,0,.55])humSh(q,humP(p=>{p.moveTo(cx+x*w-6,cy+h*.2);p.lineTo(cx+x*w+6,cy+h*.2);p.lineTo(cx+x*w+3,cy+h*.75);p.closePath()}),L(USR.plate),{dk:.15,lw:4});break;
  case'gauntlet':band(-1.05,-.45,L(USR.steel),1.14);band(-.42,.12,L(USR.plate),1.1);band(.15,.9,L(USR.plate),1.06);break;
  case'katar':if(off)break;for(const x of [-1.02,1.02])humSh(q,humP(p=>humRR(p,cx+x*w-5,cy-h*.6,10,h*1.4,4)),L(USR.iron),{dk:.2,lw:4});band(.55,.82,L(USR.brass),1.16);
   humSh(q,humPoly([cx-11,cy+h*.82,cx+11,cy+h*.82,cx+3,cy+h*.82+110,cx,cy+h*.82+124,cx-3,cy+h*.82+110]),L(USR.plate),{dk:.12,lw:4});break}}
