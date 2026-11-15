/* ================= PAINTED ICONS, package C (2): shields, body armor, helmets (see 06pc-items.js) ================= */
/* ======== shields (front view) ======== */
function pkcEmblem(o){const e=o.em,C=pkcM(o.ec||'white'),lw=PK.lw*.8;if(!e)return null;
 return(g,w,h)=>{const a=w/2,b=h/2,MM=pkMat(pkcM(o.mat||'wood'));
  if(e==='cross')pkFill(g,pkS(`M${-a*.2} ${-b} L${a*.2} ${-b} L${a*.2} ${-b*.32} L${a} ${-b*.32} L${a} ${b*.06} L${a*.2} ${b*.06} L${a*.2} ${b} L${-a*.2} ${b} L${-a*.2} ${b*.06} L${-a} ${b*.06} L${-a} ${-b*.32} L${-a*.2} ${-b*.32} Z`),C,{k:.6,lw});
  else if(e==='quarter'){pkFill(g,pkRect(0,-b-1,a+1,b+1,0),C,{k:.6,lw});pkFill(g,pkRect(-a-1,0,a+1,b+2,0),C,{k:.6,lw})}
  else if(e==='stripe')pkFill(g,pkRect(-a*.28,-b-1,a*.56,h+2,0),C,{k:.6,lw});
  else if(e==='bend')pkFill(g,pkTube([-a-1,-b-1,a+1,b+1],w*.3,'flat'),C,{k:.6,lw});
  else if(e==='chevron')pkFill(g,pkS(`M${-a-1} ${b*.2} L0 ${-b*.45} L${a+1} ${b*.2} L${a+1} ${b*.62} L0 ${-b*.03} L${-a-1} ${b*.62} Z`),C,{k:.6,lw});
  else if(e==='planks'){let d='';for(let x=-a*.5;x<a;x+=a*.5)d+=`M${x} ${-b} L${x} ${b} `;pkLine(g,d,.7,MM[0],.55)}
  else if(e==='rings'){g.lineWidth=.8;for(const r of [.8,.58,.36]){g.strokeStyle=MM[0];g.globalAlpha=.65;g.beginPath();g.ellipse(0,0,a*r,b*r,0,0,Math.PI*2);g.stroke()}g.globalAlpha=1}
  else if(e==='scales'){g.lineWidth=.6;for(let y=-b+1.5,r=0;y<b+2;y+=2.4,r++)for(let x=-a+(r&1)*1.5;x<a+2;x+=3){g.strokeStyle=MM[0];g.globalAlpha=.6;g.beginPath();g.arc(x,y,1.5,0,Math.PI);g.stroke();g.strokeStyle=MM[4];g.globalAlpha=.3;g.beginPath();g.arc(x,y-.3,1.2,Math.PI*1.1,Math.PI*1.6);g.stroke()}g.globalAlpha=1}
  else if(e==='studs'){const S=pkMat(pkcM(o.ec||'brass'));for(let i=0;i<10;i++){const t=i*Math.PI/5,x=Math.sin(t)*a*.7,y=-Math.cos(t)*b*.7;g.fillStyle=PK.ink;g.beginPath();g.arc(x+.15,y+.15,1,0,Math.PI*2);g.fill();g.fillStyle=S[3];g.beginPath();g.arc(x,y,.65,0,Math.PI*2);g.fill()}}
  else if(e==='sun'){const p=[];for(let i=0;i<24;i++){const t=i*Math.PI/12,R=i&1?a*.42:a*.78;p.push(Math.sin(t)*R,-b*.08-Math.cos(t)*R)}pkFill(g,pkPoly(p),C,{k:.6,lw});pkFill(g,pkCirc(0,-b*.08,a*.36),C,{ball:1,k:.6,lw})}
  else if(e==='mirror'){pkLine(g,`M${-a*.62} ${-b*.05} L${-a*.05} ${-b*.62} M${-a*.5} ${b*.38} L${a*.38} ${-b*.5}`,1.5,'#ffffff',.55)}
  else if(e==='diamond')pkFill(g,pkPoly([0,-b*.5,a*.42,0,0,b*.5,-a*.42,0]),C,{k:.6,lw,inside:(g,m)=>{g.fillStyle=m[1];g.globalAlpha=.6;g.fill(new Path2D(`M0 ${b*.5} L${a*.42} 0 L0 0 Z`));g.globalAlpha=1}});
  else if(e==='crossg')pkFill(g,pkS(`M${-a*.14} ${-b*.62} L${a*.14} ${-b*.62} L${a*.14} ${-b*.2} L${a*.5} ${-b*.2} L${a*.5} ${b*.08} L${a*.14} ${b*.08} L${a*.14} ${b*.62} L${-a*.14} ${b*.62} L${-a*.14} ${b*.08} L${-a*.5} ${b*.08} L${-a*.5} ${-b*.2} L${-a*.14} ${-b*.2} Z`),C,{k:.5,lw})}}
function pkcShieldI(g,o){const k=o.kind||'heater',rd=k==='round'||k==='buckler',w=o.w||(rd?26:k==='tower'?21:23.5),h=o.h||(rd?26:k==='tower'?27.5:26),cy=o.cy||16;
 pkShield(g,16,cy,{kind:k,w,h,mat:pkcM(o.mat||'wood'),rim:o.rim===null?null:pkcM(o.rim||'iron'),rimW:o.rimW||1.9,boss:o.boss,bossMat:pkcM(o.bossMat||o.fit||'brass'),emblem:pkcEmblem(o)});
 if(o.rivets){const a=w/2-1.05,b=h/2-1.05,S=pkMat(pkcM(o.rim||'iron'));for(let i=0;i<o.rivets;i++){const t=i*Math.PI*2/o.rivets,x=16+Math.sin(t)*a,y=cy-Math.cos(t)*b;g.fillStyle=PK.ink;g.beginPath();g.arc(x+.12,y+.12,.7,0,Math.PI*2);g.fill();g.fillStyle=S[3];g.beginPath();g.arc(x,y,.45,0,Math.PI*2);g.fill()}}
 if(o.spike){const S=pkcM(o.spikeMat||'steel'),r=o.spike*.62,q=o.spike*.78;pkFill(g,pkCirc(16,cy,r),S,{ball:1,k:.8});
  pkFill(g,pkPoly([16-r*.62,cy+r*.5,16-q,cy-q,16+r*.5,cy-r*.62,16+r*.2,cy+r*.2]),S,{k:.5,inside:(g,m)=>pkHi(g,`M${16-r*.35} ${cy-r*.1} L${16-q*.85} ${cy-q*.85}`,.7,.7)})}
 if(o.gem)pkcGem(g,16,cy,o.gemR||2.4,o.gem,o.gemCut||'diamond');
 if(o.glow)pkcGlow(g,16,cy,13,o.glow,.4);
 if(o.boss)pkcGlint(g,16-o.boss*.4,cy-o.boss*.45,1.6)}

/* ======== body armor ======== */
const PKC_BODY={
 tunic:'M9 3.5 L13 3.5 Q16 6.5 19 3.5 L23 3.5 L29.5 9 L27 16 L24.5 14.5 L24.5 28.5 L7.5 28.5 L7.5 14.5 L5 16 L2.5 9 Z',
 coat:'M9 3 L13 3 Q16 6.5 19 3 L23 3 L30 10 L28 19.5 L25 18 L25.6 29.5 L6.4 29.5 L7 18 L4 19.5 L2 10 Z',
 robe:'M10 2.5 L13 2.5 Q16 6 19 2.5 L22 2.5 L30.5 13 L27 18 L24.5 15 L27 30 L5 30 L7.5 15 L5 18 L1.5 13 Z',
 vest:'M8.5 4.5 L13 4.5 Q16 7.5 19 4.5 L23.5 4.5 L25.5 10 L24.6 28.5 L7.4 28.5 L6.5 10 Z',
 cuirass:'M9 5.5 L13 5.5 Q16 8.4 19 5.5 L23 5.5 L25 11 L24 18.5 Q23.6 21 22.6 22 L23.6 28.5 L8.4 28.5 L9.4 22 Q8.4 21 8 18.5 L7 11 Z',
 rags:'M9 3.5 L13 3.5 Q16 6.5 19 3.5 L23 3.5 L29.5 9 L27.6 12.4 L26 16.5 L24.5 14.5 L25 22 L24 27 L22 25 L20.5 29 L18 26 L15.5 29.5 L13 26 L10.5 28.5 L9 25 L7.5 27 L7.5 14.5 L6 16.5 L4.4 12.4 L2.5 9 Z'};
function pkcPattern(g,m,o,x0,y0,x1,y1){const p=o.pat,C=o.patC?pkMat(pkcM(o.patC)):m;
 if(p==='mail'){g.lineWidth=.55;for(let y=y0;y<y1;y+=2.2)for(let x=x0+((y/2.2|0)&1)*1.1;x<x1;x+=2.2){g.strokeStyle=m[0];g.globalAlpha=.55;g.beginPath();g.arc(x,y,.85,0,Math.PI*2);g.stroke();g.strokeStyle=m[4];g.globalAlpha=.35;g.beginPath();g.arc(x-.2,y-.2,.85,Math.PI,Math.PI*1.5);g.stroke()}g.globalAlpha=1}
 else if(p==='scale'){g.lineWidth=.65;for(let y=y0,r=0;y<y1;y+=2.5,r++)for(let x=x0+(r&1)*1.6;x<x1;x+=3.2){g.strokeStyle=C[0];g.globalAlpha=.7;g.beginPath();g.arc(x,y,1.6,0,Math.PI);g.stroke();g.strokeStyle=C[4];g.globalAlpha=.35;g.beginPath();g.arc(x,y-.4,1.2,Math.PI*1.05,Math.PI*1.6);g.stroke()}g.globalAlpha=1}
 else if(p==='lam'){const L=pkMat(pkcM(o.laces||'cloth'));for(let y=y0;y<y1;y+=3.3){let d='';for(let x=x0;x<x1;x+=1.9)d+=`M${x} ${y+.4} L${x} ${y+2.8} `;pkLine(g,d,.5,m[0],.65);pkLine(g,`M${x0} ${y+3} L${x1} ${y+3}`,.9,L[2],.95);pkLine(g,`M${x0} ${y+.3} L${x1} ${y+.3}`,.6,m[4],.35)}}
 else if(p==='quilt'){let d='';for(let x=x0-30;x<x1;x+=3.2)d+=`M${x} ${y0} L${x+(y1-y0)} ${y1} M${x+(y1-y0)} ${y0} L${x} ${y1} `;pkLine(g,d,.55,m[0],.5)}
 else if(p==='rows'){let d='';for(let y=y0+2;y<y1;y+=2.6)d+=`M${x0} ${y} L${x1} ${y} `;pkLine(g,d,.6,m[0],.6);let e='';for(let y=y0+2,r=0;y<y1;y+=2.6,r++)for(let x=x0+1+(r&1)*1.3;x<x1;x+=2.6)e+=`M${x} ${y} L${x} ${y+2.6} `;pkLine(g,e,.45,m[0],.45)}
 else if(p==='plates'){for(let y=y0+3;y<y1;y+=3.6){pkLine(g,`M${x0} ${y} L${x1} ${y}`,.8,m[0],.75);pkLine(g,`M${x0} ${y+.7} L${x1} ${y+.7}`,.6,m[4],.35)}}
 else if(p==='fluted'){for(let x=x0+2;x<x1;x+=2.6){pkLine(g,`M${x} ${y0} L${x} ${y1}`,.7,m[4],.45);pkLine(g,`M${x+1} ${y0} L${x+1} ${y1}`,.6,m[0],.45)}}
 else if(p==='hide'){pkLine(g,`M${x0+5} ${y0+8} Q${x0+8} ${y0+12} ${x0+6} ${y0+17} M${x1-6} ${y0+9} Q${x1-9} ${y0+14} ${x1-7} ${y0+20}`,.7,m[0],.45)}
 else if(p==='seams')pkLine(g,'M16 7 L16 22 M9 12 Q12 13 12 22 M23 12 Q20 13 20 22',.6,m[0],.5);
 if(o.studs){const S=pkMat(pkcM(o.studs));for(let y=y0+2.6,r=0;y<y1;y+=3.4,r++)for(let x=x0+1.6+(r&1)*1.7;x<x1;x+=3.4){g.fillStyle=PK.ink;g.globalAlpha=.8;g.beginPath();g.arc(x+.15,y+.15,.75,0,Math.PI*2);g.fill();g.globalAlpha=1;g.fillStyle=S[3];g.beginPath();g.arc(x,y,.55,0,Math.PI*2);g.fill()}}}
function pkcArmor(g,o){const sh=o.shape||'tunic',M=pkcM(o.mat||'leather'),T=pkcM(o.trim||o.fit||'brass');
 if(sh==='do')return pkcDo(g,o);
 pkFill(g,pkS(PKC_BODY[sh]),M,{k:1.8,inside:(g,m)=>{pkcPattern(g,m,o,2,4,30,30);
  if(sh==='robe'){pkFill(g,pkS('M14.6 5.5 L17.4 5.5 L17.8 30 L14.2 30 Z'),T,{k:.4,lw:PK.lw*.8});pkFill(g,pkS('M5 27.4 L27 27.4 L27.4 30.6 L4.6 30.6 Z'),T,{k:.4,lw:PK.lw*.8});pkFill(g,pkS('M1 12.6 L5.6 18.6 L4.4 19.6 L0 13.6 Z M31 12.6 L26.4 18.6 L27.6 19.6 L32 13.6 Z'),T,{k:.3,lw:PK.lw*.7})}
  if(sh==='coat')pkLine(g,'M16 6 L16 29.5',.9,PK.ink,.7);
  if(o.sash)pkFill(g,pkTube([8,3,25,27],4.6,'flat'),pkcM(o.sash),{k:.6,lw:PK.lw*.8});
  if(o.tabard)pkFill(g,pkS('M11 6.2 Q16 9 21 6.2 L21.6 29 L10.4 29 Z'),pkcM(o.tabard),{k:.8,lw:PK.lw*.8});
  if(o.cross)pkFill(g,pkS('M14.8 9 L17.2 9 L17.2 12.6 L20.6 12.6 L20.6 15 L17.2 15 L17.2 21.4 L14.8 21.4 L14.8 15 L11.4 15 L11.4 12.6 L14.8 12.6 Z'),pkcM(o.cross),{k:.4,lw:PK.lw*.8});
  if(o.sigil){pkFill(g,pkStarS(16,14.4,4.4,o.sigilN||6,2),pkcM(o.sigil),{k:.4,lw:PK.lw*.8})}
  if(o.belt){const by=o.beltY||22;pkFill(g,pkRect(5,by,22,2.8,0),pkcM(o.beltMat||'leather'),{k:.5,lw:PK.lw*.8});pkFill(g,pkRect(14.3,by-.2,3.4,3.2,.6),T,{k:.3,lw:.6})}
  if(o.faulds)for(const y of [23.4,26])pkLine(g,`M8 ${y} L24 ${y}`,.8,m[0],.8);
  if(sh==='cuirass'){pkLine(g,'M16 8.6 L16 21',.8,m[1],.8);pkHi(g,'M12 10.4 Q11.4 15 12.4 19.5',1.2,.55)}}});
 if(o.sigil)pkcGlow(g,16,14.4,7,o.sigilGlow||'#8ccfff',.5);
 if(o.fur)pkFill(g,pkS('M8.5 2.6 L13 3.6 Q16 7.2 19 3.6 L23.5 2.6 L26.6 5 L24.4 6.4 L25.4 8.6 L22 8.2 L20.4 10.4 L18.2 8.8 L16 11 L13.8 8.8 L11.6 10.4 L10 8.2 L6.6 8.6 L7.6 6.4 L5.4 5 Z'),pkcM(o.fur),{k:.6});
 if(o.paul){const P=pkcM(o.paul);for(const s of [-1,1])pkAt(g,16+s*9.8,8.4,s*28,1,g=>pkFill(g,pkS('M-5.6 2.6 Q-5.6 -3.4 0 -3.8 Q5.6 -3.4 5.6 2.6 Q0 4.4 -5.6 2.6 Z'),P,{k:1,inside:(g,m)=>{pkLine(g,'M-5.2 .4 Q0 2.2 5.2 .4',.7,m[0],.75);pkHi(g,'M-3.4 -1.8 Q0 -3 3 -1.8',.8,.55);if(o.paulTrim)pkLine(g,'M-5.4 2.4 Q0 4.2 5.4 2.4',1.1,pkMat(pkcM(o.paulTrim))[2],1)}}))}
 if(o.feathers)for(const [x,y,r] of [[4.6,12.6,-30],[27.4,12.6,30],[6.6,17.6,-15],[25.4,17.6,15]])pkAt(g,x,y,r,1,g=>pkFill(g,pkS('M0 -4 C1.8 -2 1.8 2 0 4 C-1.8 2 -1.8 -2 0 -4 Z'),'canvas',{k:.4,lw:PK.lw*.8}));
 if(o.gem)pkcGem(g,16,o.gemY||13,2.2,o.gem,'diamond');
 if(o.glow)pkcGlow(g,16,15,13,o.glow,.35)}
/* eastern do: shoulder boards (sode), laced chest, skirt panels (kusazuri) */
function pkcDo(g,o){const M=pkcM(o.mat||'lacquer'),L=o.laces||'cloth',T=pkcM(o.trim||'gold'),big=o.big;
 const lam=(S,mat)=>pkFill(g,S,mat||M,{k:1,inside:(g,m)=>pkcPattern(g,m,{pat:'lam',laces:L},S.b[0],S.b[1]+.4,S.b[2],S.b[3])});
 for(const s of [-1,1])pkAt(g,16+s*(big?10.6:10),big?11:10.4,s*(big?16:12),1,g=>lam(pkRect(-(big?4.8:3.9),-6,big?9.6:7.8,big?14.4:12,1)));
 for(let i=0;i<4;i++)lam(pkRect(7.4+i*4.3,19.4,4.6,10,.8));
 lam(pkS('M8 5.6 L24 5.6 L24.8 20.4 L7.2 20.4 Z'));
 pkFill(g,pkS('M8 5.4 Q16 8.6 24 5.4 L24.2 9.4 Q16 12 7.8 9.4 Z'),pkcM(o.top||M),{k:.6,lw:PK.lw*.8,inside:(g,m)=>pkLine(g,'M8 9.2 Q16 11.8 24 9.2',.9,pkMat(T)[2],1)});
 if(o.mon)pkFill(g,pkCirc(16,14.8,2.5),pkcM(o.mon),{ball:1,k:.4,lw:PK.lw*.8});
 if(o.glow)pkcGlow(g,16,15,13,o.glow,.35)}

/* ======== helmets ======== */
const pkcDark=(g,S)=>pkFill(g,S,'dark',{k:.8,noRim:1,lw:PK.lw});
function pkcRivets(g,T,pts){const C=pkMat(T)[3];for(const [x,y] of pts){g.fillStyle=PK.ink;g.beginPath();g.arc(x+.15,y+.15,.8,0,Math.PI*2);g.fill();g.fillStyle=C;g.beginPath();g.arc(x,y,.55,0,Math.PI*2);g.fill()}}
function pkcFace(g,x,y,rx,ry){pkFill(g,pkEll(x,y,rx,ry),'skin',{k:1.1,lw:PK.lw*.8,inside:()=>{g.fillStyle=PK.ink;g.fill(pkEll(x-rx*.42,y-ry*.08,.75,1.05).p);g.fill(pkEll(x+rx*.42,y-ry*.08,.75,1.05).p)}})}
function pkcHelm(g,o){const k=o.hd,M=pkcM(o.mat||'steel'),T=pkcM(o.trim||o.fit||'brass'),lw8=PK.lw*.8;
 if(k==='cap'||k==='armcap'){pkFill(g,pkS('M4.5 22.5 C4.5 11 9.5 5 16 5 C22.5 5 27.5 11 27.5 22.5 Z'),M,{k:1.8,inside:(g,m)=>{if(k==='armcap')pkcPattern(g,m,{pat:'quilt'},4,5,28,23);else pkLine(g,'M16 5 L16 21 M10.4 7.4 Q8.4 14 8.6 21 M21.6 7.4 Q23.6 14 23.4 21',.7,m[0],.7);pkHi(g,'M8 13 Q9.6 8.4 14 6.8',1.4,.6)}});
  pkFill(g,pkRect(3.4,20.2,25.2,4.4,2),pkcM(o.band||M),{k:.6,inside:(g,m)=>pkLine(g,'M5 22.4 L27 22.4',.5,m[0],.5)});
  if(k==='armcap'){pkFill(g,pkTube([6.4,24.4,7.6,29.4],1.6,'round'),M,{k:.3,lw:lw8});pkFill(g,pkTube([25.6,24.4,24.4,29.4],1.6,'round'),M,{k:.3,lw:lw8})}
  else pkFill(g,pkCirc(16,4.8,1.7),pkcM(o.band||M),{ball:1,k:.3,lw:lw8});return}
 if(k==='hood'||k==='coif'){pkFill(g,pkS('M16 3 C23.5 3 27.5 9 27.5 16 C27.5 20 28.5 24 30 28.5 L2 28.5 C3.5 24 4.5 20 4.5 16 C4.5 9 8.5 3 16 3 Z'),M,{k:1.8,inside:(g,m)=>{if(k==='coif')pkcPattern(g,m,{pat:'mail'},3,4,30,29);else pkLine(g,'M8 22 Q7 25 6 28.5 M24 22 Q25 25 26 28.5',.7,m[0],.6);pkHi(g,'M8.5 12 Q9.5 6.6 14.5 5',1.4,.55)}});
  pkcDark(g,pkEll(16,17.4,6.6,7.6));pkcFace(g,16,18.8,5,5.8);
  if(k==='coif')pkFill(g,pkS('M9.4 12.4 Q16 8.8 22.6 12.4 L22.2 14.4 Q16 11.2 9.8 14.4 Z'),pkcM(o.band||'leather'),{k:.4,lw:lw8});return}
 if(k==='kettle'){pkcDark(g,pkEll(16,22,10,3.4));pkFill(g,pkS('M8 19.5 C8 11 11.5 5.5 16 5.5 C20.5 5.5 24 11 24 19.5 Z'),M,{k:1.6,inside:(g,m)=>{pkLine(g,'M16 5.6 L16 19',.8,m[1],.75);pkHi(g,'M10.6 14 Q11.2 9 14 7.2',1.3,.6)}});
  pkFill(g,pkS('M1.5 20 Q16 15 30.5 20 Q30 23.4 26 23 Q16 19.6 6 23 Q2 23.4 1.5 20 Z'),M,{k:.9,inside:(g,m)=>pkHi(g,'M4 19.6 Q16 16 28 19.6',.9,.5)});
  pkFill(g,pkRect(7.6,16.8,16.8,2.6,1),T,{k:.4,lw:lw8});pkcRivets(g,T,[[10,18.1],[16,18.1],[22,18.1]]);return}
 if(k==='nasal'||k==='spangen'){if(k==='spangen')pkFill(g,pkS('M5 19 L27 19 L28.4 29 L3.6 29 Z'),'iron',{k:1,inside:(g,m)=>pkcPattern(g,m,{pat:'mail'},3,19,29,29.5)});
  pkcDark(g,pkRect(7.5,19,17,8.6,3));pkcFace(g,16,23.4,6.6,4.6);
  pkFill(g,pkS(k==='nasal'?'M5.5 21 C5.5 14 9.5 5.5 16 3 C22.5 5.5 26.5 14 26.5 21 Z':'M5 21 C5 11.5 10 4.5 16 4.5 C22 4.5 27 11.5 27 21 Z'),M,{k:1.8,inside:(g,m)=>{
    if(k==='spangen'){pkFill(g,pkTube([16,4.4,16,21],2.4,'flat'),T,{k:.3,lw:PK.lw*.7});pkFill(g,pkTube(pkQ(10.4,6.6,7.6,12,7.4,21,8),2.2,'flat'),T,{k:.3,lw:PK.lw*.7});pkFill(g,pkTube(pkQ(21.6,6.6,24.4,12,24.6,21,8),2.2,'flat'),T,{k:.3,lw:PK.lw*.7})}
    else pkLine(g,'M16 3.4 L16 19',.9,m[1],.7);pkHi(g,'M9 14 Q10.4 8.6 14 5.8',1.4,.6)}});
  pkFill(g,pkRect(4.4,18.4,23.2,3.8,1.6),k==='spangen'?T:M,{k:.6});pkFill(g,pkS('M14.3 20 L17.7 20 L17.4 28.4 Q16 29.6 14.6 28.4 Z'),M,{k:.5});pkcRivets(g,T,[[7.4,20.3],[11.4,20.3],[20.6,20.3],[24.6,20.3]]);return}
 if(k==='sallet'){pkFill(g,pkS('M3.6 20.5 C3.4 10.5 9 4.5 16.5 4.5 C23 4.5 27.2 9 28 14.5 C28.6 18.4 30 21.4 31 24 L21.6 22.6 L21.2 26 L5 26 C4 24.4 3.6 22.4 3.6 20.5 Z'),M,{k:1.8,inside:(g,m)=>{pkLine(g,'M4 18.6 Q12 17.6 21.6 18.4 L21.6 26',.8,m[0],.8);pkHi(g,'M8.6 10.6 Q12 6.6 17 6',1.4,.6);pkLine(g,'M16.5 4.6 Q24 6 27.6 13',.8,m[1],.7)}});
  pkcDark(g,pkS('M3.8 13.2 L17 13.2 L17.4 15.6 L4 15.6 Z'));pkcRivets(g,T,[[19.6,15],[19.6,21]]);return}
 if(k==='barbute'||k==='tusk'){
  pkFill(g,pkS('M5 27 L5 12 C5 6 10 2.8 16 2.8 C22 2.8 27 6 27 12 L27 27 C23 28.8 9 28.8 5 27 Z'),M,{k:2,inside:(g,m)=>{pkHi(g,'M8 11 Q9 5.6 14.6 4.4',1.5,.6);pkLine(g,'M16 3 L16 12',.9,m[1],.7)}});
  pkcDark(g,pkS('M8.4 12.4 L23.6 12.4 L23.6 16.2 L18.6 16.2 L18.4 28.4 L13.6 28.4 L13.4 16.2 L8.4 16.2 Z'));
  if(o.crown){pkFill(g,pkS('M5.6 8 L7.4 1 L10.6 5 L13.4 .4 L16 4.4 L18.6 .4 L21.4 5 L24.6 1 L26.4 8 Q16 5 5.6 8 Z'),pkcM(o.crown),{k:.5});pkcGem(g,16,5.6,1.5,'blood','round')}
  pkcRivets(g,T,[[7,21],[7,24.6],[25,21],[25,24.6]]);
  if(k==='tusk')for(const s of [-1,1])pkFill(g,pkTube(pkQ(16+s*7.4,27,16+s*15.8,24,16+s*13.6,9,12),[3.8,.7],'round'),pkcM(o.tusk||'bone'),{k:.7,inside:(g,m)=>pkHi(g,`M${16+s*11} ${25.6} Q${16+s*13.4} ${22} ${16+s*12.8} ${14}`,.8,.55)});return}
 if(k==='bascinet'){pkFill(g,pkS('M3.6 21.5 L28.4 21.5 L29.6 30 L2.4 30 Z'),'iron',{k:1,inside:(g,m)=>pkcPattern(g,m,{pat:'mail'},2,22,30,30.5)});
  pkFill(g,pkS('M5 24 L5 13 C5 7 10 2.4 16 1.4 C22 2.4 27 7 27 13 L27 24 Z'),M,{k:2,inside:(g,m)=>pkHi(g,'M8.4 11 Q9.6 5.8 14.6 3.4',1.4,.6)});
  pkFill(g,pkS('M7 11.2 L25 11.2 Q26.4 17 16 26.6 Q5.6 17 7 11.2 Z'),M,{k:1.2,inside:(g,m)=>{pkLine(g,'M15.6 11.4 L15.6 26',1,m[4],.55);pkLine(g,'M16.6 11.6 L16.6 25.6',.7,m[0],.6)}});
  pkcDark(g,pkRect(8.6,14,6,1.8,.8));pkcDark(g,pkRect(17.4,14,6,1.8,.8));g.fillStyle=PK.ink;for(const [x,y] of [[12.2,19],[13.6,21.2],[19.8,19],[18.4,21.2]]){g.beginPath();g.arc(x,y,.6,0,Math.PI*2);g.fill()}
  pkcRivets(g,T,[[6,12.4],[26,12.4]]);return}
 if(k==='armet'){pkFill(g,pkS('M4.6 22 C4 10 9 3 16.4 3 C24 3 28 10 27.4 22 Q27 27.4 16 28.6 Q5 27.4 4.6 22 Z'),M,{k:2,inside:(g,m)=>{pkLine(g,'M4.8 16.6 Q16 22.6 27.2 16.6',.9,m[0],.8);pkLine(g,'M5.2 20.6 Q16 26 26.8 20.6',.7,m[1],.7);pkHi(g,'M8.6 10 Q10 5.8 15 4.6',1.4,.6);pkLine(g,'M16.4 3 L16.4 10',1.2,m[4],.5)}});
  pkcDark(g,pkS('M7.2 12.6 L24.8 12.6 L24.4 15 L7.6 15 Z'));pkFill(g,pkCirc(23.6,22,2.2),T,{ball:1,k:.4});return}
 if(k==='great'){if(o.crest)pkFill(g,pkS('M6.6 10 L7.6 1.6 L10.6 5.4 L12.6 .6 L15 4.6 L17.4 .6 L19.6 4.6 L22.2 .6 L24 5.4 L26.6 1.6 L26 10 Z'),pkcM(o.crest),{k:.6});
  pkAt(g,16,o.crown||o.crest?17.4:16.4,0,o.crown||o.crest?.88:.94,g=>{g.translate(-16,-16);pkHelmGreat(g,M,T)});
  if(o.crown){pkFill(g,pkS('M5.6 8.2 L6.6 1 L10.2 5 L13 .4 L16 4.2 L19 .4 L21.8 5 L25.4 1 L26.4 8.2 Q16 5.6 5.6 8.2 Z'),pkcM(o.crown),{k:.6});for(const x of [10.4,16,21.6])pkcGem(g,x,6.4,1.2,'blood','round')}
  if(o.plume)pkFill(g,pkS('M17 3.6 C19 -1.4 27 -.6 29.5 3.6 C26.5 2.6 22.5 3.6 20 6.6 Z'),pkcM(o.plume),{k:.8});
  if(o.glow)pkcGlow(g,16,16,12,o.glow,.35);return}
 if(k==="jingasa"){pkcFace(g,16,24.6,7.4,6);pkFill(g,pkTube([9.4,22.6,13,29.4],1.3,'round'),'cloth',{k:.3,lw:lw8});pkFill(g,pkTube([22.6,22.6,19,29.4],1.3,'round'),'cloth',{k:.3,lw:lw8});
  pkcDark(g,pkEll(16,21.8,12,2.6));pkFill(g,pkS('M1 21 L16 8 L31 21 Q16 25.6 1 21 Z'),M,{k:1.4,inside:(g,m)=>{pkHi(g,'M4.6 19.6 L15.6 10',1,.55);pkLine(g,'M16 8.4 L16 23.4',.6,m[0],.6)}});
  pkFill(g,pkCirc(16,17.6,2.8),T,{ball:1,k:.4,lw:lw8});return}
 if(k==='hachigane'){pkcFace(g,16,18.6,10.4,11.2);
  pkFill(g,pkS('M5.8 16.4 C5.8 8.4 10 5 16 5 C22 5 26.2 8.4 26.2 16.4 Z'),'lacquer',{k:1});
  pkFill(g,pkTube([25,15.2,29.4,20.4,30.4,26.6],[2.4,1.6],'round'),pkcM(o.band||'white'),{k:.4,lw:lw8});
  pkFill(g,pkS('M4.2 13.4 Q16 9.4 27.8 13.4 L27.8 18.4 Q16 14.6 4.2 18.4 Z'),pkcM(o.band||'white'),{k:.6});
  pkFill(g,pkS('M10 11.6 Q16 10.2 22 11.6 L22 16.8 Q16 15.4 10 16.8 Z'),M,{k:.6,inside:(g,m)=>pkHi(g,'M11 12.6 Q16 11.4 21 12.6',.7,.6)});pkcRivets(g,T,[[11.4,14.2],[20.6,14.2]]);return}
 if(k==='kabuto'||k==='menpo'||k==='kawari'){const S2=pkcM(o.side||'redlac'),Lc=o.laces||'cloth';
  if(k==='kawari')for(const s of [-1,1])pkFill(g,pkTube(pkQ(16+s*2,9,16+s*10,8,16+s*12.6,.8,10),[2.8,.8],'round'),T,{k:.5});
  const lamP=S=>pkFill(g,S,M,{k:1,inside:(g,m)=>pkcPattern(g,m,{pat:'lam',laces:Lc},S.b[0],S.b[1]+.4,S.b[2],S.b[3])});
  pkcDark(g,pkRect(10,15,12,13.4,2));if(k==='kabuto')pkcFace(g,16,22,5.4,5.4);
  lamP(pkS('M5.6 15.6 L11 15.6 L11.6 27.8 L2 27.8 Z'));lamP(pkS('M26.4 15.6 L21 15.6 L20.4 27.8 L30 27.8 Z'));
  pkFill(g,pkS('M5.4 17.4 C5.4 9 10.2 4.4 16 4.4 C21.8 4.4 26.6 9 26.6 17.4 Z'),M,{k:1.4,inside:(g,m)=>{pkLine(g,'M11 6.4 Q9 11 9 17 M16 4.6 L16 17 M21 6.4 Q23 11 23 17',.8,pkMat(T)[2],.9);pkHi(g,'M8.4 13 Q9.4 8 13.6 6',1.2,.5)}});
  pkFill(g,pkRect(4.2,15.4,23.6,2.6,1),S2,{k:.4,lw:lw8});
  for(const s of [-1,1])pkFill(g,pkS(`M${16+s*10.4} 14.4 L${16+s*15.4} 13.2 L${16+s*14.8} 20.6 L${16+s*10.6} 19 Z`),S2,{k:.5,lw:lw8});
  pkFill(g,pkCirc(16,4.6,1.6),T,{ball:1,k:.3,lw:lw8});
  if(k==='kawari')pkcGem(g,16,12.6,2.6,o.gem||'gold','round');
  else pkFill(g,pkS('M13.6 13.8 Q16 10 18.4 13.8 Q16 15 13.6 13.8 Z'),T,{k:.3,lw:lw8});
  if(k!=='kabuto'){pkFill(g,pkS('M10.2 19.6 L21.8 19.6 Q22.6 25 20 28.4 L12 28.4 Q9.4 25 10.2 19.6 Z'),pkcM(o.mask||'redlac'),{k:1,inside:(g,m)=>{pkLine(g,'M16 19.8 L16 23.2',1.1,m[0],.8);pkLine(g,'M12.4 24.4 Q14.4 23.2 16 24.6 Q17.6 23.2 19.6 24.4',1,'#f0ece0',.95)}});
   if(o.horns)for(const s of [-1,1])pkFill(g,pkTube(pkQ(16+s*7,7,16+s*12,4,16+s*11,-.4,8),[2.4,.5],'round'),T,{k:.4})}
  return}
 if(k==='onimask'){for(const s of [-1,1])pkFill(g,pkTube(pkQ(16+s*7,7,16+s*13,4.6,16+s*12,-.2,10),[3.4,.7],'round'),T,{k:.6});
  pkFill(g,pkS('M5 9 Q16 3.4 27 9 L27.6 19 Q26 28 16 29.6 Q6 28 4.4 19 Z'),M,{k:1.8,inside:(g,m)=>{pkLine(g,'M7.6 11.4 L13.4 13.4 M24.4 11.4 L18.6 13.4',1.5,PK.ink,.9);pkLine(g,'M16 13 L16 19',1,m[0],.8);pkHi(g,'M8 9.6 Q12 6.6 16 6.4',1.2,.55)}});
  for(const s of [-1,1])pkFill(g,pkEll(16+s*5,15.6,2.5,1.5,s*-12),'gold',{k:.3,lw:lw8});g.fillStyle=PK.ink;g.fill(pkCirc(11,15.6,.75).p);g.fill(pkCirc(21,15.6,.75).p);
  pkcDark(g,pkS('M9.6 21.2 Q16 19.2 22.4 21.2 Q21 26 16 26.4 Q11 26 9.6 21.2 Z'));
  for(const x of [11.8,20.2])pkFill(g,pkPoly([x-1.1,20.9,x+1.1,20.9,x,24.4]),'white',{k:.2,lw:PK.lw*.7});for(const x of [14.2,17.8])pkFill(g,pkPoly([x-.9,26.1,x+.9,26.1,x,23.2]),'white',{k:.2,lw:PK.lw*.7});return}
 if(k==='ogre'){for(const s of [-1,1])pkFill(g,pkTube(pkQ(16+s*5.4,26,16+s*10,23,16+s*9.6,15,8),[3,.6],'round'),'bone',{k:.5});
  pkFill(g,pkS('M3 20 L29 20 L28 25 L4 25 Z'),pkcM(o.band||'hide'),{k:.5});pkSkull(g,16,14.4,1.22,pkcM(o.mat||'bone'));
  pkFill(g,pkRect(2.4,19,4.4,6.4,1),pkcM(o.band||'hide'),{k:.4});pkFill(g,pkRect(25.2,19,4.4,6.4,1),pkcM(o.band||'hide'),{k:.4});pkcRivets(g,'iron',[[4.6,22.2],[27.4,22.2]]);return}}
