/* ================= PAINTED ICONS, package C: items (it-*), weapon / shield / armor / helm families =================
   One painter per family (sword, axe, mace, hammer, polearm, spear, staff, bow, crossbow, gun, shield, body armor, helm).
   Every item is a spec {f: family, ...shape} (PKC_IT) merged over the materials of its tier (PKC_TIER: iron -> steel with
   bronze -> steel with brass -> steel with gold trim -> silver blade, gold and a gem), so better gear reads better.
   Famed and fabled pieces (it-f:N, it-fb:*) are their base item with gilded fittings and their own colours (PKC_IT entries
   with base) inside a gold frame; legendary pieces (it-lg:*) have their own colours and a glow inside a violet frame with
   ember corners, like the pixel icons mark them. Items without a spec (famed f:N made in play, new items) are painted from
   their base item or their family through PK_DYN. Local frames: a weapon is drawn pointing up (-y) and laid on the
   diagonal by pkcDiag (butt lower left, point upper right). */
function pkcPt(g,x,y){const m=g.getTransform(),p=m.transformPoint(new DOMPoint(x,y));return[p.x/PK.u,p.y/PK.u,Math.hypot(m.a,m.b)/PK.u]}
const pkcGlint=(g,x,y,r,col)=>{const [X,Y,s]=pkcPt(g,x,y);pkPost(o=>pkGlint(o,X,Y,r*s,col))};
const pkcGlow=(g,x,y,r,col,a)=>{const [X,Y,s]=pkcPt(g,x,y);pkPost(o=>{o.save();o.globalCompositeOperation='screen';pkGlow(o,X,Y,r*s,col,a==null?.6:a);o.restore()})};
function pkcGem(g,x,y,r,mat,cut){const n=PK.post?PK.post.length:0;pkGem(g,x,y,r,mat,cut||'round');if(PK.post){PK.post.length=n;if(r>1.6)pkcGlint(g,x-r*.35,y-r*.4,r*.32)}}
/* lay a weapon drawn from y=+a (butt) to y=-b (point) on the box diagonal, centred, scaled to fit */
function pkcDiag(g,a,b,fn,s){s=s||Math.min(1,37.5/(a+b));pkAt(g,16,16,45,s,g=>{g.translate(0,(b-a)/2);fn(g)})}
const PKC_M={
 fang:['#1c3418','#55804a','#a9d494','#e0f6cc','#ffffff'],
 redsteel:['#2a0c0c','#6e2a26','#b0544c','#e0948a','#fff0ec'],
 ember:['#4a1a04','#a8461a','#ec8a2e','#ffc46a','#fff2cc'],
 moon:['#1c2c48','#5577a8','#a9c6ea','#e2f0ff','#ffffff'],
 lacquer:['#050608','#15171d','#2a2d36','#4a4e5a','#8a90a0'],
 redlac:['#2a0606','#6a1010','#a8221c','#d8503c','#ffb09a'],
 heart:['#2a0c06','#5e2412','#94401e','#c46a3a','#f0a878'],
 hide:['#20140c','#4a3220','#7a5636','#a8805a','#d8b48c'],
 blackfur:['#050506','#15161a','#2c2e34','#4a4d56','#868a94'],
 ogre:['#16200f','#34482a','#5a7448','#86a06c','#c8dcae'],
 serp:['#0c2410','#1f5226','#3a8a3c','#74c460','#cff2b0'],
 wyv:['#2c0808','#6a1616','#ac2e26','#de6448','#ffc0a0'],
 saffron:['#3e2204','#94600e','#dca22a','#f6d066','#fff6d0'],
 navy:['#060c22','#14245a','#25409a','#4c72d0','#bcd4ff'],
 pale:['#3a4048','#8a94a0','#ccd4dc','#eef2f6','#ffffff'],
 gilt:['#4a2c00','#a26800','#e8ad1c','#ffd95a','#fffbe0']};
const pkcM=m=>typeof m==='string'&&PKC_M[m]?PKC_M[m]:m;
const PKC_TIER=[null,
 {bl:'iron',fit:'iron',hf:'wood',gr:'leather',tr:'iron'},
 {bl:'steel',fit:'bronze',hf:'wood',gr:'leather',tr:'bronze'},
 {bl:'steel',fit:'brass',hf:'wood',gr:'leather',tr:'brass'},
 {bl:'steel',fit:'gold',hf:'darkwood',gr:'madder',tr:'gold'},
 {bl:'silver',fit:'gold',hf:'darkwood',gr:'navy',tr:'gold'},
 {bl:'silver',fit:'gold',hf:'darkwood',gr:'purple',tr:'gold'}];

/* ======== blades ======== */
/* blade outline: left / right edge points (base -> point) and the midline; shapes: point leaf thin falchion curve wavy kris seax knife */
function pkcBladePts(o){const L=o.len,w=o.w,h=w/2,sh=o.shape||'point',wav=sh==='wavy'||sh==='kris',n=wav?30:16,c=o.curve||0,lf=[],rt=[],md=[];
 const P=a=>t=>t<a?1:Math.max(0,(1-t)/(1-a));let xl,xr,bend=t=>c*t*t;
 if(sh==='leaf'){const p=P(1-1.2*w/L),f=t=>.82+.42*Math.sin(Math.PI*Math.min(1,t/.9));xl=t=>-h*f(t)*p(t);xr=t=>h*f(t)*p(t)}
 else if(sh==='thin'){const p=P(.45);xl=t=>-h*(1-.2*t)*p(t);xr=t=>h*(1-.2*t)*p(t)}
 else if(sh==='falchion'){xl=t=>t<.86?-h:-h+(t-.86)/.14*h*.5;xr=t=>t<.7?h*(1+1.5*t*t):h*1.735-(h*2.235)*Math.pow((t-.7)/.3,1.6)}
 else if(sh==='curve'){const a=1-1.5*w/L;xl=t=>t<.94?-h:-h*(1-t)/.06;xr=t=>t<a?h:h*Math.pow((1-t)/(1-a),.55)}
 else if(sh==='wavy'||sh==='kris'){const p=P(1-1.2*w/L),k=sh==='kris'?1-.35:1;bend=t=>(sh==='kris'?1.1:.85)*Math.sin(t*Math.PI*(sh==='kris'?5:7))*(1-t*.7);xl=t=>-h*(1-(1-k)*t)*p(t);xr=t=>h*(1-(1-k)*t)*p(t)}
 else if(sh==='seax'){xl=t=>t<.55?-h:-h+(t-.55)/.45*1.5*h;xr=t=>t<.8?h:h-(t-.8)/.2*.5*h}
 else if(sh==='knife'){xl=t=>t<.9?-h:-h+(t-.9)/.1*.45*h;xr=t=>t<.45?h:h-1.55*h*Math.pow((t-.45)/.55,2)}
 else{const p=P(1-1.25*w/L);xl=t=>-h*p(t);xr=t=>h*p(t)}
 for(let i=0;i<=n;i++){const t=i/n,y=-L*t,b=bend(t),l=xl(t),r=xr(t);lf.push(b+l,y);rt.push(b+r,y);md.push(b+(l+r)/2,y)}
 return{lf,rt,md,n:n+1}}
/* paint a blade: body, far bevel in shadow, fuller, highlight; o.runes (colour), o.notch, o.hamon (colour), o.crack */
function pkcBlade(g,o){const B=pkcBladePts(o),n=B.n,out=B.lf.slice(),half=B.md.slice();for(let i=n-1;i>=0;i--){out.push(B.rt[i*2],B.rt[i*2+1]);half.push(B.rt[i*2],B.rt[i*2+1])}
 const S=pkPoly(out),L=o.len;
 pkFill(g,S,pkcM(o.mat||'steel'),{k:o.k||1,inside:(g,m)=>{g.fillStyle=m[0];g.globalAlpha=.3;g.fill(pkPoly(half).p);g.globalAlpha=1;
  const hl=[],fl=[],hm=[];for(let i=1;i<n-1;i++){const t=i/(n-1);if(t<.84)hl.push(B.lf[i*2]*.55+B.md[i*2]*.45,B.lf[i*2+1]);if(t>.05&&t<.7)fl.push(B.md[i*2],B.md[i*2+1]);if(t>.03&&t<.88)hm.push(B.rt[i*2]*.55+B.md[i*2]*.45+Math.sin(t*40)*.25,B.rt[i*2+1])}
  if(o.hamon)pkLine(g,pkPoly(hm,1),.7,o.hamon,.9);
  if(o.fuller!==false&&L>9&&fl.length>3)pkLine(g,pkPoly(fl,1),Math.max(.6,o.w*.15),m[1],.8);
  if(hl.length>3)pkHi(g,pkPoly(hl,1),Math.max(.5,o.w*.14),.7);
  if(o.runes){for(let k=0;k<4;k++){const i=Math.round((.16+k*.13)*(n-1)),x=B.md[i*2],y=B.md[i*2+1];pkLine(g,`M${x-.6} ${y+.6} L${x} ${y-.7} L${x+.6} ${y+.6}${k&1?` M${x-.7} ${y} L${x+.7} ${y}`:''}`,.6,o.runes,1)}}
  if(o.notch){for(const t of [.3,.48,.62]){const i=Math.round(t*(n-1)),x=B.rt[i*2],y=B.rt[i*2+1];pkLine(g,`M${x+.4} ${y-.9} L${x-1} ${y} L${x+.4} ${y+.9}`,.6,PK.ink,.9)}}
  if(o.crack){const i=Math.round(.55*(n-1)),x=B.md[i*2],y=B.md[i*2+1];pkLine(g,`M${x-o.w/2} ${y+1} L${x-.3} ${y-.4} L${x+.4} ${y+.8} L${x+o.w/2} ${y-.6}`,.75,o.crack,1)}}});
 if(o.runes||o.glow){const i=Math.round(.45*(n-1));pkcGlow(g,B.md[i*2],B.md[i*2+1],L*.45,o.glow||o.runes,o.glowA||.45)}}
function pkcGrip(g,o){const L=o.grip,w=o.gw;
 if(o.wrap)pkFill(g,pkRect(-w/2,0,w,L,w*.3),pkcM(o.wrap),{k:.6,inside:(g,m)=>{const s=w*1.15;let d='';for(let y=0;y<L;y+=s)d+=`M${-w/2} ${y} L${w/2} ${y+s} M${w/2} ${y} L${-w/2} ${y+s} `;pkLine(g,d,.7,o.wrapC||'#e8e0c8',.8)}});
 else pkGrip(g,{len:L,w,mat:pkcM(o.gr)})}
function pkcGuard(g,o,mat){const w=o.guard||o.w*2.6,gh=o.gh||Math.max(1.9,o.w*.5),d=o.gd||'bar';mat=pkcM(mat);
 if(d==='none')return;
 if(d==='disc')pkFill(g,pkEll(0,0,w/2,gh*.8),mat,{k:.6,inside:(g,m)=>pkHi(g,`M${-w*.32} ${-gh*.2} L${w*.15} ${-gh*.35}`,.7,.6)});
 else if(d==='bolster')pkFill(g,pkRect(-w/2,-gh*.6,w,gh*1.2,gh*.4),mat,{k:.5});
 else if(d==='curve')pkFill(g,pkTube(pkQ(-w/2,-gh*1.5,0,gh*1.3,w/2,-gh*1.5,10),gh,'round'),mat,{k:.7});
 else pkFill(g,pkRect(-w/2,-gh/2,w,gh,gh/2),mat,{k:.7})}
/* sword family (knives, daggers, swords, greatswords, katana): local, guard at 0 */
function pkcSwordL(g,o){const gw=o.gw||Math.max(2.2,o.w*.58),gl=o.grip,pr=o.pr||Math.max(1.5,o.w*.44),fit=pkcM(o.fit);
 pkcGrip(g,{grip:gl,gw,wrap:o.wrap,wrapC:o.wrapC,gr:o.gr});
 const pm=o.pom||'ball';
 if(pm==='ball')pkFill(g,pkCirc(0,gl+pr*.8,pr),fit,{ball:1,k:.6});
 else if(pm==='disc')pkFill(g,pkEll(0,gl+pr*.55,pr*1.25,pr*.75),fit,{k:.6});
 else if(pm==='cap')pkFill(g,pkRect(-gw/2-.35,gl-.4,gw+.7,2,.8),fit,{k:.5});
 else if(pm==='ring'){const R=new Path2D();R.arc(0,gl+pr,pr*1.1,0,Math.PI*2);R.arc(0,gl+pr,pr*.45,0,Math.PI*2,true);pkFill(g,{p:R,b:[-pr*1.1,gl-pr*.1,pr*1.1,gl+pr*2.1]},fit,{k:.5})}
 if(o.lugs){const y=-o.lugs,h=o.w/2;pkFill(g,pkPoly([-h+.2,y+1.4,-h-2.6,y+.2,-h+.2,y-1.6]),fit,{k:.4,lw:PK.lw*.8});pkFill(g,pkPoly([h-.2,y+1.4,h+2.6,y+.2,h-.2,y-1.6]),fit,{k:.4,lw:PK.lw*.8})}
 pkcBlade(g,o);pkcGuard(g,o,fit);
 if(o.gem)pkcGem(g,0,0,Math.max(1.3,(o.gh||o.w*.5)*.62),o.gem,'round')}
function pkcSword(g,o){const pr=o.pr||Math.max(1.5,o.w*.44);pkcDiag(g,o.grip+pr*(o.pom==='cap'?.4:1.9),o.len+.5,g=>pkcSwordL(g,o),o.s)}

/* ======== hafted weapons (local: haft from y=+a to y=-b, head near the top; the head's working side is +x) ======== */
function pkcShaft(g,o,a,b){const w=o.hw||2.8,hf=pkcM(o.hf||'wood');
 if(o.metalHaft)pkFill(g,pkRect(-w/2,-b,w,a+b,w/2),pkcM(o.metalHaft),{k:.7,inside:(g,m)=>pkHi(g,`M${-w*.22} ${a-1} L${-w*.22} ${-b+1}`,.6,.5)});
 else pkHaft(g,0,a,0,-b,w,hf);
 if(o.bands){const M=pkcM(o.bandMat||o.fit);for(const y of o.bands)pkFill(g,pkRect(-w/2-.35,y-.75,w+.7,1.5,.5),M,{k:.3,lw:PK.lw*.8})}
 if(o.wrapG)pkFill(g,pkRect(-w/2-.25,a-o.wrapG-1,w+.5,o.wrapG,.8),pkcM(o.gr||'leather'),{k:.5,inside:g=>{let d='';for(let y=a-o.wrapG;y<a-1.4;y+=1.5)d+=`M${-w/2} ${y+1.1} L${w/2} ${y} `;pkLine(g,d,.5,PK.ink,.55)}});
 if(o.butt!==false)pkFill(g,pkRect(-w/2-.3,a-1.6,w+.6,2.3,1),pkcM(o.fit),{k:.4,lw:PK.lw*.8})}
/* axe bit on side sx (+1 / -1) around y=hy: reach E, upper / lower horns H1 / H2, edge bulge */
function pkcBit(g,o,sx,hy,M){const E=o.E,H1=o.H1,H2=o.H2,bu=o.bulge||1.6,r0=1.5,top=hy-(o.neck||2.4),bot=hy+(o.neck||2.4);
 const d=`M${sx*r0} ${top} Q${sx*E*.55} ${top+.2} ${sx*E} ${hy-H1} Q${sx*(E+bu)} ${hy+(H2-H1)/2} ${sx*E} ${hy+H2} Q${sx*E*.5} ${hy+H2*.3} ${sx*r0} ${bot} Z`;
 pkFill(g,pkS(d),M,{k:1,inside:(g,m)=>{pkLine(g,`M${sx*E} ${hy-H1} Q${sx*(E+bu)} ${hy+(H2-H1)/2} ${sx*E} ${hy+H2}`,2.2,m[4],.55);pkLine(g,`M${sx*(E-1.9)} ${hy-H1+1.2} Q${sx*(E-1.9+bu)} ${hy+(H2-H1)/2} ${sx*(E-1.9)} ${hy+H2-1.2}`,.6,m[1],.75);
  if(o.runes)pkLine(g,`M${sx*E*.45} ${hy-1.2} L${sx*E*.6} ${hy+.4} L${sx*E*.45} ${hy+1.6} M${sx*E*.68} ${hy-1.4} L${sx*E*.68} ${hy+1.6}`,.7,o.runes,1)}})}
function pkcAxeL(g,o,a,b){const hy=-b+(o.top||3.4),M=pkcM(o.bl);pkcShaft(g,o,a,b);
 if(o.spike&&!o.dbl)pkFill(g,pkPoly([-1.5,hy-2,-1.5-o.spike,hy+.3,-1.5,hy+2]),M,{k:.5});
 pkcBit(g,o,1,hy,M);if(o.dbl)pkcBit(g,o,-1,hy,M);
 pkFill(g,pkRect(-2.2,hy-(o.neck||2.4)-.9,4.4,(o.neck||2.4)*2+1.8,1),pkcM(o.collar||o.fit),{k:.6});
 if(o.gem)pkcGem(g,0,hy,1.5,o.gem,'round');
 if(o.glow)pkcGlow(g,o.E*.6,hy,o.E*1.3,o.glow,.5)}
function pkcAxe(g,o){const a=o.a||11,b=o.b||13;pkcDiag(g,a,b,g=>pkcAxeL(g,o,a,b),o.s)}
/* mace heads: flange knob spike bell club spiked-club bone flail */
function pkcMaceL(g,o,a,b){const M=pkcM(o.bl),F=pkcM(o.fit),k=o.hd,top=-b;
 if(k==='club'||k==='bone'){const w0=o.hw||3,w1=o.cw||7.4;const S=pkTube([0,a,0,top+w1*.5],[w0,w1],'round');pkFill(g,S,pkcM(k==='bone'?'bone':o.hf||'wood'),{k:1.2,inside:(g,m)=>{pkLine(g,`M${-w1*.15} ${top+6} L${-w1*.1} ${top+13} M${w1*.15} ${top+9} L${w1*.12} ${top+15}`,.5,m[0],.5)}});
  if(k==='bone'){pkFill(g,pkCirc(-w1*.42,top+w1*.4,w1*.42),'bone',{ball:1,k:.6});pkFill(g,pkCirc(w1*.42,top+w1*.4,w1*.42),'bone',{ball:1,k:.6});pkFill(g,pkRect(-1.8,a-6,3.6,5,1),'leather',{k:.5})}
  if(o.nails)for(const [x,y,s] of [[-1,top+3.5,-1],[1.2,top+6,1],[-1.6,top+9,-1],[1.6,top+11.5,1],[0,top+1.2,0]]){const nx=s?s*w1*.5:0;pkFill(g,pkPoly(s?[nx,y-1.1,nx+s*2.4,y,nx,y+1.1]:[-1.1,top+.6,0,top-2,1.1,top+.6]),'iron',{k:.3,lw:PK.lw*.8})}
  if(o.wrapG)pkFill(g,pkRect(-w0/2-.3,a-o.wrapG-1,w0+.6,o.wrapG,.8),'leather',{k:.4});return}
 if(k==='flail'){pkcShaft(g,o,a,-top-14);const sy=top+14;pkFill(g,pkRect(-1.8,sy-1.6,3.6,2.4,.8),F,{k:.4});
  const ch=[[0,sy-2],[1.6,sy-4.2],[3.4,sy-6.2],[4.6,sy-8.6]];for(const [x,y] of ch){const R=new Path2D();R.ellipse(x,y,.95,1.5,-.5,0,Math.PI*2);R.ellipse(x,y,.35,.8,-.5,0,Math.PI*2);pkFill(g,{p:R,b:[x-1.5,y-1.5,x+1.5,y+1.5]},'iron',{k:.3,rule:'evenodd',lw:PK.lw*.7})}
  const cx=6.4,cy=sy-13.2,p=[];for(let i=0;i<16;i++){const t=i*Math.PI/8,R=i&1?4.4:6.6;p.push(cx+Math.sin(t)*R,cy-Math.cos(t)*R)}pkFill(g,pkPoly(p),M,{k:.8});pkFill(g,pkCirc(cx,cy,4.3),M,{ball:1,k:.8,lw:PK.lw*.8});return}
 pkcShaft(g,o,a,b-(k==='bell'?6:5));const hy=top+6;
 pkFill(g,pkRect(-1.9,hy+3.2,3.8,3.4,.8),F,{k:.5});
 if(k==='spike'){const p=[];for(let i=0;i<16;i++){const t=i*Math.PI/8,R=i&1?5.6:8.8;p.push(Math.sin(t)*R,hy-Math.cos(t)*R)}pkFill(g,pkPoly(p),M,{k:1.1});pkFill(g,pkCirc(0,hy,5.5),M,{ball:1,k:1,lw:PK.lw*.8})}
 else if(k==='knob'){pkFill(g,pkEll(0,hy,5.2,6.4),M,{ball:1,k:1});for(const [x,y] of [[-4.6,hy-2.4],[4.6,hy-2.4],[-4.6,hy+2.6],[4.6,hy+2.6],[0,hy-6.4]])pkFill(g,pkCirc(x,y,1.7),M,{ball:1,k:.4,lw:PK.lw*.8});if(o.gem)pkcGem(g,0,hy,1.8,o.gem,'round')}
 else{const bell=k==='bell',W=bell?7.4:6.4,H=bell?8.6:7.6;
  const d=bell?`M0 ${hy-H-1.6} L${W*.45} ${hy-H} L${W} ${hy-H*.3} L${W*.8} ${hy+H*.55} L${W*.25} ${hy+H*.62} L${-W*.25} ${hy+H*.62} L${-W*.8} ${hy+H*.55} L${-W} ${hy-H*.3} L${-W*.45} ${hy-H} Z`
   :`M0 ${hy-H-.6} L${W*.3} ${hy-H*.55} L${W} ${hy-H*.62} L${W*.55} ${hy-.2} L${W} ${hy+H*.5} L${W*.3} ${hy+H*.66} L${-W*.3} ${hy+H*.66} L${-W} ${hy+H*.5} L${-W*.55} ${hy-.2} L${-W} ${hy-H*.62} L${-W*.3} ${hy-H*.55} Z`;
  pkFill(g,pkS(d),M,{k:1.1,inside:(g,m)=>{pkLine(g,`M0 ${hy-H+.6} L0 ${hy+H*.6} M${-W*.5} ${hy-H*.55} L${-W*.4} ${hy+H*.55} M${W*.5} ${hy-H*.55} L${W*.4} ${hy+H*.55}`,.7,m[0],.7);pkHi(g,`M${-W*.62} ${hy-H*.35} L${-W*.55} ${hy+H*.3}`,.9,.6)}});
  if(bell)pkFill(g,pkRect(-W*.85,hy+H*.35,W*1.7,2,.8),F,{k:.4,lw:PK.lw*.8});
  if(o.gem)pkcGem(g,0,hy-1,1.9,o.gem,'round')}
 if(o.glow)pkcGlow(g,0,hy,10,o.glow,.55)}
function pkcMace(g,o){const a=o.a||11,b=o.b||14;pkcDiag(g,a,b,g=>pkcMaceL(g,o,a,b),o.s)}
/* hammer heads (cross-wise on the haft top): mallet war pick knight maul warmaul */
function pkcHammerL(g,o,a,b){const M=pkcM(o.bl),F=pkcM(o.fit),k=o.hd,big=k==='maul'||k==='warmaul',hy=-b+(big?5.4:3.4);pkcShaft(g,o,a,b-(big?.5:0));
 if(k==='mallet')pkFill(g,pkRect(-5.8,hy-3,11.6,6,1),M,{k:.9,inside:(g,m)=>pkHi(g,`M-4.6 ${hy-1.9} L4 ${hy-1.9}`,.9,.6)});
 else if(big){const W=k==='warmaul'?8.8:8.6,H=k==='warmaul'?6.2:5.8;pkFill(g,pkRect(-W,hy-H,W*2,H*2,1.4),M,{k:1.3,inside:(g,m)=>{pkHi(g,`M${-W+1.4} ${hy-H+1.3} L${W-2} ${hy-H+1.3}`,1.1,.6);pkLine(g,`M${-W+2.4} ${hy-H} L${-W+2.4} ${hy+H} M${W-2.4} ${hy-H} L${W-2.4} ${hy+H}`,.7,m[0],.6)}});
  if(k==='warmaul'){for(const x of [-W+2.4,W-2.4])pkFill(g,pkRect(x-1.1,hy-H-.4,2.2,H*2+.8,.6),F,{k:.4,lw:PK.lw*.8});pkFill(g,pkPoly([0,hy-H-3.4,1.9,hy-H+.2,-1.9,hy-H+.2]),M,{k:.4})}
  if(o.gem)pkcGem(g,0,hy,2.4,o.gem,'diamond');if(o.runes)pkLine(g,`M-3 ${hy-1.6} L-1.6 ${hy+1.6} L-.2 ${hy-1.6} M1.2 ${hy+1.6} L1.2 ${hy-1.6} L3 ${hy}`,.8,o.runes,1)}
 else{const face=k==='pick'?2.6:k==='knight'?3.4:3.1;
  if(k==='pick'||k==='war'||k==='knight')pkFill(g,pkS(`M1.4 ${hy-1.8} Q7 ${hy-1.4} ${k==='pick'?11.5:9.5} ${hy+(k==='pick'?4.6:2.6)} Q6 ${hy+.4} 1.4 ${hy+1.6} Z`),M,{k:.7,inside:(g,m)=>pkHi(g,`M2.5 ${hy-1} Q6.5 ${hy-.7} 8.5 ${hy+1.4}`,.6,.6)});
  pkFill(g,pkRect(-6.4,hy-face,6.4+1.6,face*2,.8),M,{k:.8,inside:(g,m)=>{pkHi(g,`M-5.6 ${hy-face+1} L-.5 ${hy-face+1}`,.8,.6);if(k==='knight')pkLine(g,`M-6.4 ${hy-1.1} L-5 ${hy-1.1} M-6.4 ${hy+1.1} L-5 ${hy+1.1}`,.6,PK.ink,.8)}});
  if(k==='knight'||k==='war')pkFill(g,pkPoly([-1.4,hy-face+.2,0,hy-face-(k==='knight'?6.4:4.2),1.4,hy-face+.2]),M,{k:.5});
  pkFill(g,pkRect(-1.9,hy-face-.3,3.8,face*2+3.4,.8),F,{k:.4,lw:PK.lw*.8})}
 if(o.glow)pkcGlow(g,0,hy,11,o.glow,.5)}
function pkcHammer(g,o){const a=o.a||12,b=o.b||13;pkcDiag(g,a,b,g=>pkcHammerL(g,o,a,b),o.s)}
/* spear heads: leaf wing boar tri cross long tusk */
function pkcSpearL(g,o,a,b){const M=pkcM(o.bl),k=o.hd||'leaf',HL=o.HL||13,HW=o.HW||6.4,base=-b+HL;
 pkcShaft(g,o,a,b-HL+1);
 if(o.tassel){const T=pkcM(o.tassel);pkFill(g,pkS(`M-1.6 ${base+2.6} Q-4.6 ${base+6} -3.4 ${base+10.5} L-1.4 ${base+8} L-.6 ${base+11.5} L.6 ${base+7.6} Q1.6 ${base+5} 1.6 ${base+2.6} Z`),T,{k:.6})}
 if(k==='tusk'){pkFill(g,pkS(`M-2.2 ${base+1} Q-3.6 ${base-HL*.55} 1.6 ${-b} Q1.6 ${base-HL*.5} 2.2 ${base+1} Z`),'bone',{k:1,inside:(g,m)=>{pkLine(g,`M-1.8 ${base-3} L1.6 ${base-2.4} M-1.4 ${base-6.5} L1 ${base-6}`,.6,m[1],.7);pkHi(g,`M-1.2 ${base-1} Q-1.8 ${base-HL*.5} .4 ${-b+2}`,.7,.6)}});
  pkFill(g,pkRect(-2.1,base-.6,4.2,3.6,.8),'leather',{k:.4});return}
 if(k==='wing'||k==='boar'){const y=base-1.6,s=k==='wing'?4.6:3.2;pkFill(g,pkPoly([-1.2,y,-1.2-s,y-(k==='wing'?2.8:1),-1.2,y-2.8]),M,{k:.4,lw:PK.lw*.8});pkFill(g,pkPoly([1.2,y,1.2+s,y-(k==='wing'?2.8:1),1.2,y-2.8]),M,{k:.4,lw:PK.lw*.8})}
 if(k==='cross'){pkAt(g,0,base-HL*.35,0,1,g=>{pkFill(g,pkS('M-1 1.2 Q-4 1.5 -7.2 -2.2 Q-3.6 -.6 -1 -1.6 Z'),M,{k:.5});pkFill(g,pkS('M1 1.2 Q4 1.5 7.2 -2.2 Q3.6 -.6 1 -1.6 Z'),M,{k:.5})})}
 pkAt(g,0,base,0,1,g=>pkBlade(g,{len:HL,w:k==='tri'||k==='long'?Math.min(HW,4.2):HW,tip:k==='leaf'||k==='wing'||k==='boar'?'leaf':'point',mat:M,fuller:true}));
 if(o.runes)pkLine(g,`M0 ${base-2} L0 ${base-HL*.55} M-.8 ${base-3.6} L.8 ${base-4.6} M-.8 ${base-5.6} L.8 ${base-6.6}`,.7,o.runes,1);
 pkFill(g,pkRect(-1.9,base-.8,3.8,3.6,.9),pkcM(o.fit),{k:.5});
 if(o.glow)pkcGlow(g,0,base-HL*.5,HL*.9,o.glow,.55)}
function pkcSpear(g,o){const a=o.a||16,b=o.b||18;pkcDiag(g,a,b,g=>pkcSpearL(g,o,a,b),o.s)}
/* polearm heads: bill halberd glaive voulge lucerne fork naginata tail */
function pkcPoleL(g,o,a,b){const M=pkcM(o.bl),F=pkcM(o.fit),k=o.hd,top=-b;
 const sock=y=>pkFill(g,pkRect(-1.9,y,3.8,4,.9),F,{k:.5});
 if(k==='fork'){pkcShaft(g,o,a,b-9);for(const x of [-3.4,0,3.4])pkFill(g,pkTube([x*.4,top+10.5,x,top+6,x,top+.8],1.6,'round'),M,{k:.3,lw:PK.lw*.8});pkFill(g,pkS(`M-4.4 ${top+7} Q0 ${top+11.5} 4.4 ${top+7} L3.6 ${top+9} Q0 ${top+12.6} -3.6 ${top+9} Z`),M,{k:.4});sock(top+10.2);return}
 if(k==='naginata'||k==='tail'){pkcShaft(g,o,a,b-14);const L=15,base=top+L;
  if(k==='tail'){pkFill(g,pkS(`M-2.2 ${base} Q-2.6 ${base-8} 2.6 ${top} Q4.6 ${base-9} 2.6 ${base} Z`),M,{k:1,inside:(g,m)=>{for(let i=1;i<5;i++)pkLine(g,`M-2 ${base-i*2.6} L2.6 ${base-i*2.6-1.2}`,.6,m[0],.6);pkHi(g,`M-1.2 ${base-1} Q-1.4 ${base-7} 1.8 ${top+2}`,.7,.6)}});
   pkFill(g,pkRect(-2.2,base-.4,4.4,3.6,.9),'leather',{k:.4});return}
  pkAt(g,0,base,0,1,g=>pkcBlade(g,{len:L,w:4.6,shape:'curve',curve:2.6,mat:M,fuller:false,hamon:o.hamon}));pkAt(g,0,base+.8,0,1,g=>pkcGuard(g,{guard:6.4,gh:1.8,gd:'disc',w:4},F));
  pkFill(g,pkRect(-1.7,base+1.4,3.4,4,.6),pkcM(o.collar||'lacquer'),{k:.4});return}
 if(k==='glaive'||k==='voulge'){pkcShaft(g,o,a,b-(k==='glaive'?13:12));const L=k==='glaive'?16:15,base=top+L;
  const d=k==='glaive'?`M-1.8 ${base} L-1.8 ${base-L*.55} Q-1.6 ${top+2} 0 ${top} Q4.8 ${base-L*.55} 4.6 ${base-2.6} Q3.4 ${base} 1.8 ${base} Z`
   :`M-1.8 ${base} L-1.8 ${top+2.6} L.4 ${top} Q5.4 ${top+3.4} 5.6 ${base-L*.35} Q5 ${base-1} 1.8 ${base+1.4} Z`;
  pkFill(g,pkS(d),M,{k:1,inside:(g,m)=>{pkLine(g,k==='glaive'?`M3.2 ${base-2.2} Q3.6 ${base-L*.5} .4 ${top+1.4}`:`M4.4 ${base-1} Q4.6 ${top+5} .8 ${top+1.4}`,1.6,m[4],.5);pkHi(g,`M-.9 ${base-1} L-.9 ${top+3}`,.6,.5);
   if(o.runes)pkLine(g,`M.8 ${base-3} L1.6 ${base-5} L.8 ${base-7} M1.6 ${base-8.6} L1.6 ${base-10.6}`,.7,o.runes,1)}});
  if(k==='glaive')pkFill(g,pkPoly([-1.8,base-3.4,-4.8,base-5.4,-1.8,base-6.4]),M,{k:.4,lw:PK.lw*.8});
  sock(base-.6);if(o.glow)pkcGlow(g,1.4,base-L*.5,L*.8,o.glow,.55);return}
 // axe-on-pole family: bill halberd lucerne: spike on top, blade/hook/hammer at the side
 pkcShaft(g,o,a,b-11);const hy=top+11.5;
 pkAt(g,0,hy-3,0,1,g=>pkBlade(g,{len:k==='bill'?9:10.5,w:k==='bill'?4:3.6,mat:M,fuller:false}));
 if(k==='halberd'){pkcBit(g,{E:8.6,H1:5,H2:4.4,bulge:1.6,neck:2.2},1,hy,M);pkFill(g,pkS(`M-1.4 ${hy-1.6} Q-4.4 ${hy-1.6} -6.6 ${hy-4.8} Q-5.4 ${hy+.4} -1.4 ${hy+1.6} Z`),M,{k:.5})}
 else if(k==='bill'){pkFill(g,pkS(`M-1.5 ${hy-3} Q3.4 ${hy-3.4} 6 ${hy-.4} Q7.6 ${hy+3.6} 4.4 ${hy+5.6} Q5.2 ${hy+2.6} 3.6 ${hy+1.4} Q1.6 ${hy+.6} -1.5 ${hy+2.6} Z`),M,{k:.8,inside:(g,m)=>pkLine(g,`M.5 ${hy-2.4} Q4.4 ${hy-2.4} 5.8 ${hy+.6}`,1.4,m[4],.5)});
  pkFill(g,pkPoly([-1.5,hy-1.4,-5,hy-3.6,-1.5,hy+.6]),M,{k:.4})}
 else{pkFill(g,pkS(`M1.2 ${hy-3} L5.2 ${hy-4.2} L4.4 ${hy-1.6} L6.6 ${hy-1.4} L6.6 ${hy+1.4} L4.4 ${hy+1.6} L5.2 ${hy+4.2} L1.2 ${hy+3} Z`),M,{k:.7});
  pkFill(g,pkS(`M-1.4 ${hy-1.6} Q-4.4 ${hy-1.6} -6.4 ${hy-4.6} Q-5.2 ${hy+.4} -1.4 ${hy+1.6} Z`),M,{k:.5})}
 sock(hy+1.6);if(o.glow)pkcGlow(g,2,hy-2,10,o.glow,.5)}
function pkcPole(g,o){const a=o.a||16,b=o.b||18.5;pkcDiag(g,a,b,g=>pkcPoleL(g,o,a,b),o.s)}
/* staff tops: plain gem crook gnarl arch leaf bo lantern lotus iron */
function pkcStaffL(g,o,a,b){const k=o.hd||'plain',top=-b,F=pkcM(o.fit);
 if(k==='gnarl'){const S=pkTube([0,a,.6,a*.4,-.6,0,.8,-b*.5,-.4,top+5,1.6,top+2.4],[2.6,3.4],'round');pkFill(g,S,pkcM(o.hf||'darkwood'),{k:.8,inside:(g,m)=>pkLine(g,`M.2 ${a*.6} L.6 ${a*.2} M-.2 ${-b*.3} L.4 ${-b*.6}`,.5,m[0],.6)});
  pkFill(g,pkTube([1.4,top+4,3.6,top+1.4,3,top-1.6],1.6,'round'),pkcM(o.hf||'darkwood'),{k:.4});pkFill(g,pkTube([1.4,top+4,-1.4,top+1,-1.2,top-1.6],1.6,'round'),pkcM(o.hf||'darkwood'),{k:.4});
  pkcGlow(g,1,top+.6,7,o.glow||'#9cf06a',.6);pkcGem(g,1,top+.6,2.6,o.gem||'chi','round');return}
 pkcShaft(g,o,a,b-(k==='plain'||k==='bo'||k==='iron'?0:3));
 if(k==='plain'||k==='bo'||k==='iron'){const w=(o.hw||2.8)/2+.35,M=pkcM(k==='bo'?o.fit:k==='iron'?'iron':o.fit);
  for(const [y,h] of k==='iron'?[[top,4.5],[a-4.5,4.5],[-1.5,3]]:k==='bo'?[[top,2.6],[a-2.6,2.6],[-3,1.4],[1.6,1.4]]:[[top,2.2],[a-2.2,2.2],[-4,5]]){pkFill(g,pkRect(-w,y,w*2,h,.8),k==='plain'&&h===5?pkcM(o.gr||'leather'):M,{k:.4,lw:PK.lw*.85})}
  if(k==='bo'&&o.lotus){pkcGlow(g,0,top+1,6,'#ffb0d0',.5);for(const t of [-50,0,50])pkAt(g,0,top+3.4,t,1,g=>pkFill(g,pkS('M0 0 C-2.4 -2 -2 -5 0 -6.4 C2 -5 2.4 -2 0 0 Z'),['#3a0c22','#8a2a5a','#e070a8','#ffb0d4','#fff0f8'],{k:.4,lw:PK.lw*.8}))}
  return}
 if(k==='crook'){pkFill(g,pkTube(pkArc(-3,top+3.6,3.6,90,-120,12),2.6,'round'),pkcM(o.hf||'wood'),{k:.5});pkFill(g,pkRect(-1.6,top+3,3.2,2.2,.6),F,{k:.3});
  pkFill(g,pkEll(3,top+9,1.9,2.6),'canvas',{k:.4,lw:PK.lw*.8});pkFill(g,pkEll(3,top+12.6,2.6,3),'canvas',{ball:1,k:.5});pkLine(g,`M0 ${top+7} L2.2 ${top+7.4}`,.6,PK.ink,.8);return}
 if(k==='lantern'){pkFill(g,pkTube(pkArc(-2,top+3.4,3.2,90,-90,10),2,'round'),'bone',{k:.4});pkcSkullTop(g,0,top+3.4);
  pkLine(g,`M-5.2 ${top+3.4} L-5.2 ${top+6.6}`,.8,PK.ink,.9);pkcGlow(g,-5.2,top+9.4,6.5,'#9cf0c8',.75);pkFill(g,pkRect(-7.4,top+6.6,4.4,5.4,1.2),['#0d2b26','#2a6a58','#7edcc0','#c8fff0','#ffffff'],{k:.5,inside:(g,m)=>pkLine(g,`M-7.4 ${top+9.3} L-3 ${top+9.3} M-5.2 ${top+6.6} L-5.2 ${top+12}`,.6,'#2a4840',.9)});return}
 const hy=top+3.4;
 if(k==='arch'||k==='star'){pkFill(g,pkS(`M-1.6 ${hy+3} Q-5.6 ${hy+1} -4.6 ${hy-4} Q-3.2 ${hy-1} -1 ${hy-1} Z`),F,{k:.4});pkFill(g,pkS(`M1.6 ${hy+3} Q5.6 ${hy+1} 4.6 ${hy-4} Q3.2 ${hy-1} 1 ${hy-1} Z`),F,{k:.4});}
 if(k==='leaf'){for(const [r,s] of [[-55,1],[55,1],[-20,.8]])pkAt(g,0,hy+1.6,r,s,g=>pkFill(g,pkS('M0 0 C-2.4 -2.6 -2.2 -6 0 -8.4 C2.2 -6 2.4 -2.6 0 0 Z'),'chi',{k:.5,lw:PK.lw*.85}))}
 pkFill(g,pkRect(-2,hy+1.4,4,3.4,.8),F,{k:.5});
 const gr=k==='leaf'?2.6:k==='arch'||k==='star'?4:3.6;pkcGlow(g,0,hy-gr*.3,gr*2.6,o.glow||'#8ccfff',.6);
 if(k==='arch'||k==='star')pkcGem(g,0,hy-2.2,gr,o.gem||'mana','long');else pkcGem(g,0,hy-gr*.5,gr,o.gem||'mana','round');
 if(k==='star')pkPost&&[[-6,hy-6,2.2],[5.6,hy+1,1.6],[4.4,hy-8,1.4]].forEach(([x,y,r])=>pkcGlint(g,x,y,r,'#fff6c8'))}
function pkcSkullTop(g,x,y){pkFill(g,pkS(`M${x-3.4} ${y+2} C${x-3.6} ${y-1} ${x-2} ${y-3.4} ${x} ${y-3.4} C${x+2} ${y-3.4} ${x+3.6} ${y-1} ${x+3.4} ${y+2} L${x+2} ${y+2.4} L${x+2} ${y+4} L${x-2} ${y+4} L${x-2} ${y+2.4} Z`),'bone',{k:.6});
 g.fillStyle=PK.ink;g.fill(pkCirc(x-1.3,y,.8).p);g.fill(pkCirc(x+1.3,y,.8).p)}
function pkcStaff(g,o){const a=o.a||16.5,b=o.b||18;pkcDiag(g,a,b,g=>pkcStaffL(g,o,a,b),o.s)}

/* ======== bows (upright, belly to the right, string at the left) and crossbows / guns (diagonal) ======== */
function pkcBow(g,o){const y0=o.y0||2.4,y1=o.y1||29.6,sx=o.sx||8,ap=o.ap||18.5,asym=o.asym||0,cy=(y0+y1)/2+asym,cx=2*ap-sx,M=pkcM(o.mat||'wood'),w=o.w||3.4;
 pkLine(g,`M${sx+.6} ${y0+.4} L${sx+.6} ${y1-.4}`,o.sw||1.2,o.str||'#efe6c8');
 if(o.rc){for(const [y,d] of [[y0,-1],[y1,1]])pkFill(g,pkTube(pkQ(sx,y,sx-1.4,y+d*1.8,sx-3,y+d*1.2,6),[w*.8,w*.5],'round'),M,{k:.4})}
 pkFill(g,pkTube(pkQ(sx,y0,cx,cy,sx,y1,24),o.wt||[w*.7,w*.7],'round'),M,{k:.9,inside:(g,m)=>{pkHi(g,`M${sx+2.2} ${y0+2.6} Q${(sx+ap)/2+1} ${y0+6} ${ap-1} ${cy-4}`,.9,.45);if(o.bands)for(const t of o.bands){const u=1-t,x=u*u*sx+2*u*t*cx+t*t*sx,y=u*u*y0+2*u*t*cy+t*t*y1;pkLine(g,`M${x-2} ${y-.6} L${x+2} ${y+.6}`,1,pkMat(o.bandMat||'blood')[2],1)}}});
 if(o.tips)for(const y of [y0,y1])pkFill(g,pkCirc(sx+.3,y,1.4),pkcM(o.tips),{ball:1,k:.3,lw:PK.lw*.8});
 const gy=(y0+2*cy+y1)/4+(o.gy||0),gx=(sx+ap)/2+.2;pkFill(g,pkRect(gx-2.1,gy-3.2,4.2,6.4,1),pkcM(o.grip||'leather'),{k:.5});
 if(o.arrow)pkArrow(g,3.5,23.5,28.5,8,{w:1.8,head:5.6,fletch:o.fletch||'cloth',mat:o.head||'steel'});
 if(o.glow)pkcGlow(g,ap-1,cy,13,o.glow,.45)}
/* crossbow (local, stock along y, prod across the front) */
function pkcXbowL(g,o,a,b){const P=o.P||12,py=-b+3.6,F=pkcM(o.fit),pm=pkcM(o.prod||'steel'),sm=pkcM(o.stock||'wood'),nut=py+9;
 pkLine(g,`M${-P+.6} ${py+3.2} L0 ${nut} L${P-.6} ${py+3.2}`,o.sw||.95,o.str||'#efe6c8');
 if(o.stirrup){const R=new Path2D();R.ellipse(0,py-3.2,2.4,2.8,0,0,Math.PI*2);R.ellipse(0,py-3.2,1.2,1.6,0,0,Math.PI*2);pkFill(g,{p:R,b:[-2.4,py-6,2.4,py-.4]},F,{rule:'evenodd',k:.4,lw:PK.lw*.8})}
 pkFill(g,pkS(`M-2.1 ${-b+1} L2.1 ${-b+1} L2.6 ${a-8} L3.6 ${a-1} Q0 ${a+1.2} -3.6 ${a-1} L-2.6 ${a-8} Z`),sm,{k:.9,inside:(g,m)=>{pkLine(g,`M0 ${-b+3} L0 ${nut-1}`,.7,m[0],.7);pkHi(g,`M-1.2 ${-b+2} L-1.6 ${a-9}`,.6,.5)}});
 pkFill(g,pkTube(pkQ(-P,py+3.4,0,py-4.6,P,py+3.4,16),o.pw||[2.6,2.6],'round'),pm,{k:.7,inside:(g,m)=>pkHi(g,`M${-P*.7} ${py+.4} Q0 ${py-3} ${P*.5} ${py-.2}`,.7,.55)});
 if(o.sinew)for(const x of [-P*.55,P*.55])pkFill(g,pkRect(x-1,py-.8,2,2.4,.4),'blood',{k:.3,lw:PK.lw*.7});
 pkFill(g,pkRect(-2.6,py-1.6,5.2,3.4,.9),F,{k:.5});
 pkFill(g,pkRect(-1.8,nut-1.1,3.6,2.2,.8),F,{k:.4,lw:PK.lw*.8});
 pkFill(g,pkTube([1.6,a-11,3.6,a-7.5],1.3,'round'),F,{k:.3,lw:PK.lw*.8});
 if(o.mag)pkFill(g,pkRect(-3.6,py+1.6,7.2,9.6,1.2),pkcM(o.mag),{k:.7,inside:(g,m)=>pkLine(g,`M-3.6 ${py+4.6} L3.6 ${py+4.6} M-3.6 ${py+7.6} L3.6 ${py+7.6}`,.6,m[0],.7)});
 if(o.crank){pkFill(g,pkRect(-5.4,a-4.8,10.8,2,.8),F,{k:.4});for(const x of [-5.4,5.4])pkFill(g,pkCirc(x,a-3.8,1.6),F,{ball:1,k:.3,lw:PK.lw*.8})}
 if(o.glow)pkcGlow(g,0,py,12,o.glow,.5)}
function pkcXbow(g,o){const a=o.a||13,b=o.b||14;pkcDiag(g,a,b,g=>pkcXbowL(g,o,a,b),o.s)}
/* long guns: stock from y=+a, barrel to y=-b; o.bell (blunderbuss), o.pole (hand cannon) */
function pkcGunL(g,o,a,b){const sm=pkcM(o.stock||'wood'),bm=pkcM(o.barrel||'iron'),F=pkcM(o.fit),bw=o.bw||2.4;
 if(o.pole){pkHaft(g,0,a,0,-b+11,2.8,sm);pkFill(g,pkRect(-2.6,-b,5.2,12.4,1.2),bm,{k:.9,inside:(g,m)=>pkHi(g,`M-1.4 ${-b+1} L-1.4 ${-b+11}`,.7,.55)});for(const y of [-b+.2,-b+5.6,-b+11])pkFill(g,pkRect(-3,y-.9,6,1.8,.6),F,{k:.3,lw:PK.lw*.8});
  pkFill(g,pkCirc(2.8,-b+9,1),'fire',{ball:1,k:.2,lw:PK.lw*.7});return}
 pkFill(g,pkS(`M-1.9 ${-b+7} L1.9 ${-b+7} L2.1 ${a-12} Q3.6 ${a-8} 3.8 ${a-.6} L-3.2 ${a} Q-2.8 ${a-8} -2.1 ${a-12} Z`),sm,{k:1,inside:(g,m)=>{pkHi(g,`M-1 ${-b+8} L-1.2 ${a-12}`,.6,.45);pkLine(g,`M-3.2 ${a-1.8} L3.8 ${a-2.4}`,1.3,pkMat(F)[1],.9)}});
 const bt=o.bell?-b+3.6:-b;
 pkFill(g,pkRect(-bw/2,bt,bw,(a-15)-bt,bw*.4),bm,{k:.6,inside:(g,m)=>pkHi(g,`M${-bw*.2} ${bt+1} L${-bw*.2} ${a-16}`,.6,.6)});
 if(o.bell)pkFill(g,pkS(`M${-bw/2} ${-b+4.4} L${-3.6} ${-b} L3.6 ${-b} L${bw/2} ${-b+4.4} Z`),pkcM(o.bellMat||F),{k:.5});
 else pkFill(g,pkRect(-bw/2-.4,-b,bw+.8,1.6,.5),F,{k:.3,lw:PK.lw*.8});
 for(const y of o.bands||[-b*.45,0])pkFill(g,pkRect(-2.3,y-.7,4.6,1.4,.5),F,{k:.3,lw:PK.lw*.8});
 pkFill(g,pkRect(-3.2,a-17.6,3.6,4.4,.8),F,{k:.4});
 pkFill(g,pkS(`M2 ${a-16.5} L4.8 ${a-17.6} L4.2 ${a-15.8} Z`),'iron',{k:.2,lw:PK.lw*.7});
 const R=new Path2D();R.ellipse(2.8,a-12.6,1.8,2.4,0,0,Math.PI*2);R.ellipse(2.8,a-12.6,.9,1.4,0,0,Math.PI*2);pkFill(g,{p:R,b:[1,a-15,4.6,a-10.2]},F,{rule:'evenodd',k:.3,lw:PK.lw*.7});
 if(o.glow)pkcGlow(g,0,-b+2,9,o.glow,.55)}
function pkcGun(g,o){const a=o.a||13.5,b=o.b||19;pkcDiag(g,a,b,g=>pkcGunL(g,o,a,b),o.s)}
/* pistol: barrel along the top pointing right, curved grip down to the lower left, ball pommel */
function pkcPistol(g,o){const sm=pkcM(o.stock||'wood'),bm=pkcM(o.barrel||'iron'),F=pkcM(o.fit);
 pkFill(g,pkS('M9 10.2 L17 10.6 Q14 15 12.6 19 Q11.6 23 10.6 26.4 L4.6 25.2 Q6 21 6.8 17.2 Q7.6 13 9 10.2 Z'),sm,{k:1.2,inside:(g,m)=>{pkHi(g,'M8.8 12 Q7.4 17 6.4 22',.7,.5);pkLine(g,'M7.8 21.4 L11.6 22.4',.6,m[0],.6)}});
 pkFill(g,pkCirc(7.4,26,3.1),F,{ball:1,k:.6});
 pkFill(g,pkRect(5.6,7.6,24.4,4.2,1.4),bm,{k:.8,inside:(g,m)=>pkHi(g,'M7 8.8 L28.6 8.8',.8,.6)});
 pkFill(g,pkRect(28,7,2.4,5.4,.8),F,{k:.3,lw:PK.lw*.8});pkFill(g,pkRect(5,7,3.2,5.4,1),F,{k:.4,lw:PK.lw*.8});
 pkFill(g,pkRect(13,8.6,2,3,.4),F,{k:.2,lw:PK.lw*.7});
 pkFill(g,pkCirc(12.4,13.6,2.6),F,{k:.4,inside:(g,m)=>pkLine(g,'M10.6 13.6 L14.2 13.6 M12.4 11.8 L12.4 15.4',.5,m[0],.8)});
 const R=new Path2D();R.ellipse(16.2,14.4,2.2,2.6,0,0,Math.PI*2);R.ellipse(16.2,14.4,1.1,1.5,0,0,Math.PI*2);pkFill(g,{p:R,b:[14,11.8,18.4,17]},F,{rule:'evenodd',k:.3,lw:PK.lw*.7});
 if(o.inlay)pkLine(g,'M19 9.7 L26 9.7',.7,pkMat(o.inlay)[3],1);
 if(o.glow)pkcGlow(g,29,9.4,7,o.glow,.6)}
