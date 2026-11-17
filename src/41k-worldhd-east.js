/* ================= WORLD ART, DETAIL HIGH: the East (19-east.js, 77-east-art.js) =================
   Eastern towns (white walls, dark timber, curved kawara roofs, a pagoda, a castle keep at size 3, a vermilion torii), the Shogunate's
   hosts (ashigaru in red lacquer under jingasa hats, the nobori in the regent's colours) and the region's scenery (torii, pagodas,
   cherries, pines, rice terraces, shrines), painted like the rest of the Detail High world. whEastSprite(o, K) -> a sprite entry. */
function whERoof(g,cx,by,hw,h,ramp,ridge){const R=whRampN(ramp||'kawara'),P=new Path2D();P.moveTo(cx-hw-1.4,by-1.3);P.quadraticCurveTo(cx,by+.5,cx+hw+1.4,by-1.3);P.quadraticCurveTo(cx+hw*.55,by-h*.3,cx+hw*.35,by-h);P.lineTo(cx-hw*.35,by-h);P.quadraticCurveTo(cx-hw*.55,by-h*.3,cx-hw-1.4,by-1.3);P.closePath();
 whFill(g,{p:P,b:[cx-hw-1.4,by-h,cx+hw+1.4,by]},R,{k:.4,lw:.5,inside:(g,m)=>{g.strokeStyle=m[1];g.globalAlpha=.6;g.lineWidth=.25;for(let x=cx-hw;x<=cx+hw;x+=1.1){g.beginPath();g.moveTo(x,by-.4);g.lineTo(cx+(x-cx)*.35,by-h);g.stroke()}g.globalAlpha=1}});
 if(ridge){whLine(g,[cx-hw*.35-.4,by-h,cx+hw*.35+.4,by-h],.9,WHINK);whLine(g,[cx-hw*.35-.4,by-h,cx+hw*.35+.4,by-h],.45,ridge)}}
function whEWall(g,L,x,by,w,h,night,win){whFill(g,pkRect(x,by-h,w,h,.1),whRampN('plaster'),{k:.3,lw:.45,inside:(g)=>{g.strokeStyle='#2a1a10';g.lineWidth=.35;g.beginPath();g.moveTo(x,by-.6);g.lineTo(x+w,by-.6);for(let i=0;i<=w;i+=2.6){g.moveTo(x+i,by-h);g.lineTo(x+i,by)}g.stroke()}});
 if(win)for(let i=1.4;i<w-1.6;i+=3.6)whWin(g,L,x+i,by-h*.7,1.2,1,night)}
function whEHouse(g,L,x,by,w,night){whEWall(g,L,x,by,w,3.4,night,1);whERoof(g,x+w/2,by-3.2,w/2+.4,3.4)}
function whETorii(g,cx,by,w,h){const L0=cx-w/2+1,R0=cx+w/2-1,V=['#3a0e0b','#8a2418','#c8402a','#e8704a','#ffc4b4'];for(const x of [L0,R0])whFill(g,pkRect(x-.6,by-h+1.6,1.2,h-1.6,.2),V,{k:.2,lw:.4});
 whFill(g,pkRect(L0-1,by-h+2.2,w-.2+.2-2+2,1,.1),V,{k:.15,lw:.4,noRim:1});const P=new Path2D();P.moveTo(L0-2.4,by-h+.2);P.quadraticCurveTo(cx,by-h+1.4,R0+2.4,by-h+.2);P.lineTo(R0+2.2,by-h+1.1);P.quadraticCurveTo(cx,by-h+2,L0-2.2,by-h+1.1);P.closePath();whFill(g,{p:P,b:[L0-2.4,by-h,R0+2.4,by-h+2]},whRampN('kawara'),{k:.2,lw:.42})}
function whEPagoda(g,L,cx,by,n,night){let y=by;for(let k=0;k<n;k++){const hw=Math.max(1.8,3.8-k*.6);whFill(g,pkRect(cx-hw+.6,y-2.4,hw*2-1.2,2.4,.1),k?['#3a0e0b','#7e2a22','#b8402e','#e2715f','#ffc4b4']:whRampN('plaster'),{k:.2,lw:.4});if(night&&k===0){L.fillStyle='#ffd36a';L.fillRect(cx-.5,y-1.9,1,1.4);whGlowAt(L,cx,y-1.2,2.4,'rgba(255,190,90,.9)',.5)}
  whERoof(g,cx,y-2.2,hw+.6,2);y-=3.8}whLine(g,[cx,y+1.6,cx,y-2.2],.9,WHINK);whLine(g,[cx,y+1.6,cx,y-2.2],.45,'#cfa443');for(let i=0;i<3;i++)whDot(g,cx,y+1-i*1.1,.45,'#cfa443')}
const WHCHERRY=['#5a2440','#b45a86','#e88ab4','#ffc0dc','#fff0f6'],WHJPINE=['#0b2018','#1d3f2c','#2f5f40','#4a8058','#9ac8a0'];
function whECherry(g,x,by,s){g.save();g.translate(x,by);whTree(g,500+(s|0),4,3.4,2.2,WHCHERRY);g.restore()}
function whEPine(g,x,by,s){const R=waRng(600+(s|0)),lean=R()<.5?-1:1;g.save();g.translate(x,by);whShadowE(g,1,.2,4,1,.22);const T=[0,0,lean*.8,-3,lean*2.2,-6.4];whLine(g,T,1.5,WHINK);whLine(g,T,.9,'#6a4628');
 for(const c of [[lean*2.4,-7.4,4,1.3],[-lean*1.6,-5,3.2,1.1],[lean*3.4,-4.4,2.6,1]])whFill(g,whBlob([[c[0],c[1],c[2],c[3]],[c[0]-c[2]*.4,c[1]+.3,c[2]*.6,c[3]*.8]]),WHJPINE,{k:.3,lw:.42});g.restore()}
function whETerrace(g,s,w){for(let r=0;r<4;r++){const y=-r*2.6,x0=-w/2+r*1.6,x1=w/2-r*.9;whFill(g,pkRect(x0,y-2.4,x1-x0,2.4,.6),r&1?['#0c2c3a','#2a6080','#5aa0c4','#9cd0e8','#e8f8ff']:WHR.leaf,{k:.2,lw:.4,inside:(g)=>{g.strokeStyle='#2e5a2a';g.lineWidth=.25;for(let x=x0+1+((s|0)%2);x<x1;x+=1.4){g.beginPath();g.moveTo(x,y-.4);g.lineTo(x,y-1.6);g.stroke()}}})}}
function whEShrine(g,L,cx,by){whFill(g,pkRect(cx-3.2,by-3.6,6.4,3.6,.1),WHR.wood,{k:.3,lw:.42});g.fillStyle=WHINK;g.fillRect(cx-.8,by-2.8,1.6,2.8);whERoof(g,cx,by-3.4,4.2,3,'kawara','#cfa443');for(const x of [cx-6,cx+6])whFill(g,pkRect(x-.6,by-2.4,1.2,2.4,.2),whRampN('stone'),{k:.2,lw:.38})}
function whETown(g,L,size,night,f){const S=whRampN('stone');
 if(size<=1){whGround(g,0,-2.5,16,5,'#b8a27a');whEHouse(g,L,-14,-5,9,night);whEHouse(g,L,4,-6,10,night);whECherry(g,15,-1,1);whEHouse(g,L,-5,0,10,night);whETorii(g,-14,1,7,7)}
 else if(size===2){whGround(g,0,-4,21,8,'#b8a27a');whEHouse(g,L,-19,-13,9,night);whEHouse(g,L,8,-14,11,night);whEPagoda(g,L,-2,-10,4,night);whEHouse(g,L,-20,-4,9,night);whEHouse(g,L,10,-4,10,night);whECherry(g,19,-1,2);whEHouse(g,L,-8,0,10,night);whETorii(g,6,1.5,8,8)}
 else{whGround(g,0,-4,27,9,'#b8a27a');
  // the castle: a stone base, the white keep, stacked roofs
  whFill(g,whPolyS([-11,-16,11,-16,9,-24,-9,-24]),S,{k:.4,lw:.5});let y=-24;for(let k=0;k<3;k++){const hw=8-k*2.2;whEWall(g,L,-hw,y,hw*2,4,night,1);whERoof(g,0,y-3.8,hw+.6,3.2,'kawara',k===2?'#cfa443':null);y-=6.2}
  whEHouse(g,L,-25,-12,9,night);whEHouse(g,L,16,-12,9,night);whEPagoda(g,L,-17,-17,3,night);
  whWallC(g,-27,27,-.4,4.4);whEHouse(g,L,-22,0,9,night);whEHouse(g,L,13,0,9,night);whETorii(g,0,1.6,9,9);whECherry(g,26,1,3)}}
function whEastSprite(o,K){const f=(o.frame|0)&3,night=!!o.night;
 if(o.k==='town'){const sz=clamp(o.size|0||1,1,3),D=eastBoxPx(o);const e=whMakeL(D.w+12,D.h+14,(D.w+12)/2,D.h+8,K,night,(g,L)=>whETown(g,L,sz,night,f));e.x0=-D.w/2;e.x1=D.w/2;e.y0=-(D.h+2);e.y1=2;return e}
 if(o.k==='band'){const n=+o.n||+o.str||1,k=n>=1.35?3:n>=1.1?2:1,mv=!!o.moving,bn=typeof waBnOf==='function'&&typeof eastBanner==='function'?waBnOf(eastBanner()):null;
  return whMakeL(64,58,32,46,K,false,(g,L)=>{if(o.dir<0)g.scale(-1,1);whFile(g,L,k+1,6.6,WHFL.east,f,mv,{bn,ph:17,bs:.8})})}
 const v=o.v||'cherry',s=o.s|0,D=eastBoxPx(o);const e=whMakeL(D.w+12,D.h+12,(D.w+12)/2,D.h+6,K,false,(g,L)=>{
  if(v==='torii')whETorii(g,0,0,10,11);else if(v==='pagoda')whEPagoda(g,L,0,0,5,false);else if(v==='pine')whEPine(g,0,0,s);else if(v==='terrace')whETerrace(g,s,20);else if(v==='shrine')whEShrine(g,L,0,0);else whECherry(g,0,0,s)});e.x0=-D.w/2;e.x1=D.w/2;e.y0=-D.h;e.y1=1;return e}
