/* ================= PAINTED ICONS, PACKAGE A: UI, HUD, town, contracts, sites, buildings, goals, reputation,
   origins, personalities, ranks, difficulty, menus (helpers in 06pa-kit.js) ================= */
(function(){const P=PAINT;
/* ---- HUD and resources ---- */
P.level=g=>{const ch=y=>pkS(`M2.5 ${y+9} L16 ${y-3} L29.5 ${y+9} L29.5 ${y+15} L16 ${y+3.4} L2.5 ${y+15} Z`);pkFill(g,ch(14),'gold',{k:1.1});pkFill(g,ch(4.5),'gold',{k:1.1,inside:()=>pkHi(g,'M5 12.6 L15.5 3.4',1,.6)})};
P.renown=g=>{paCrown(g,'gold','blood',{y0:5,y1:26});pkPost(g=>pkGlint(g,8.6,13.6,2.2))};
P.day=g=>{pkFill(g,pkStarS(16,16,15,12,10.4),'gold',{k:1.1});pkFill(g,pkCirc(16,16,8.4),'aura',{ball:1,k:1.2});pkPost(g=>pkGlint(g,12.8,12.6,2.4))};
P.company=g=>{pkFlag(g,6,5,{w:22,h:14,mat:'cloth',pole:24,wave:2.4});pkStar(g,16.5,12,4.2,'gold',5,1.9)};
P.contract=g=>{pkScroll(g,14,15,24,24,'vellum');pkFill(g,pkS('M20 21 L18.5 30.5 L21.5 28.5 L23.5 30.5 L24 21.5 Z'),'cloth',{k:.5});pkFill(g,pkCirc(22,20.5,5),'blood',{ball:1,k:.9,inside:(g,m)=>{g.lineWidth=.7;g.strokeStyle=m[1];g.beginPath();g.arc(22,20.5,3,0,Math.PI*2);g.stroke()}})};
P.zoom=g=>{pkFill(g,pkTube([18.5,18.5,28,28],5,'round'),'wood',{k:.9});pkFill(g,pkRect(16.5,15.8,4,4.5,1,0),'brass',{k:.4});
 const R=new Path2D();R.arc(13,13,10.6,0,Math.PI*2);R.arc(13,13,7.4,0,Math.PI*2,true);pkFill(g,{p:R,b:[2.4,2.4,23.6,23.6]},'brass',{k:1,rule:'evenodd'});
 pkFill(g,pkCirc(13,13,7.4),'frost',{ball:1,k:.9,lw:PK.lw*.7,noShade:1});pkHi(g,'M8.6 11.5 Q9.4 8.6 12.4 8',1.5,.8)};
P.menu=g=>{for(const y of [4.5,13.2,21.9])pkFill(g,pkRect(3,y,26,5.6,2.4),'gold',{k:.8})};
P.fullscreen=g=>{const L=(x,y,sx,sy)=>pkFill(g,pkS(`M${x} ${y} L${x+sx*10.5} ${y} L${x+sx*10.5} ${y+sy*4.4} L${x+sx*4.4} ${y+sy*4.4} L${x+sx*4.4} ${y+sy*10.5} L${x} ${y+sy*10.5} Z`),'gold',{k:.7});
 L(3,3,1,1);L(29,3,-1,1);L(3,29,1,-1);L(29,29,-1,-1)};
P.fast=g=>{pkFill(g,pkS('M2.5 5 L16 16 L2.5 27 Z'),'gold',{k:1});pkFill(g,pkS('M15.5 5 L29.5 16 L15.5 27 Z'),'gold',{k:1})};
P.auto=g=>{const arr=(a0,a1,head)=>{pkFill(g,pkTube(pkArc(16,16,10.5,a0,a1,16),4.2,'flat'),'gold',{k:.8});pkAt(g,16+Math.sin(a1*Math.PI/180)*10.5,16-Math.cos(a1*Math.PI/180)*10.5,a1+90,1,g=>pkFill(g,pkS('M0 -5 L5.4 2.6 L-5.4 2.6 Z'),'gold',{k:.6}))};
 arr(-60,100);arr(120,280)};
P.retreat=g=>pkFlag(g,6,4.5,{w:22,h:15,mat:'white',pole:24,wave:2.8,droop:1.5,tatter:1});
P.back=g=>{pkFill(g,pkS('M2.5 16 L14.5 4 L14.5 11 L29 11 L29 21 L14.5 21 L14.5 28 Z'),'gold',{k:1.1,inside:()=>pkHi(g,'M5.6 15 L13.4 7.2',1,.6)})};
P.save=g=>{pkFill(g,pkRect(3.5,3,25,26,2.4),'cloth',{k:1.6,inside:(g,m)=>{pkFill(g,pkRect(3.5,3,4.4,26,1.6),'cloth',{k:.5,lw:PK.lw*.8,inside:(g,mm)=>{g.fillStyle=mm[0];g.globalAlpha=.25;g.fillRect(3.5,3,4.4,26);g.globalAlpha=1}});
   for(const [x,y,d] of [[28.5,3,'M28.5 3 L22.5 3 L28.5 9 Z'],[28.5,29,'M28.5 29 L22.5 29 L28.5 23 Z']])pkFill(g,pkS(d),'brass',{k:.4,lw:.8})}});
 pkFill(g,pkRect(14,11,11,8,1.6),'brass',{k:.8,inside:(g,m)=>{pkFill(g,pkRect(18.6,13.6,1.8,3.4,.8),'dark',{lw:0,noRim:1})}});pkPost(g=>pkGlint(g,15.8,12.4,1.8))};
P.lock=g=>{const R=new Path2D();R.moveTo(8.5,15);R.lineTo(8.5,10.5);R.arc(16,10.5,7.5,Math.PI,0);R.lineTo(23.5,15);R.lineTo(19.6,15);R.lineTo(19.6,10.5);R.arc(16,10.5,3.6,0,Math.PI,true);R.lineTo(12.4,15);R.closePath();
 pkFill(g,{p:R,b:[8.5,3,23.5,15]},'steel',{k:.9});pkFill(g,pkRect(5,14,22,15.5,2.4),'gold',{k:1.5,inside:(g,m)=>{pkFill(g,pkS('M16 17.5 C17.8 17.5 18.6 19.8 17.1 21.2 L17.8 25.5 L14.2 25.5 L14.9 21.2 C13.4 19.8 14.2 17.5 16 17.5 Z'),'dark',{lw:.6,noRim:1});pkHi(g,'M7 16.3 L13 16.3',1,.6)}})};
/* ---- town ---- */
P.tavern=g=>{const R=new Path2D();R.moveTo(22,12);R.bezierCurveTo(31,11,31,25,22,24);R.lineTo(22,20.6);R.bezierCurveTo(26.4,21,26.4,15,22,15.4);R.closePath();pkFill(g,{p:R,b:[22,11,29,25]},'wood',{k:.6});
 pkFill(g,pkRect(4.5,9,18.5,20,2),'wood',{k:1.5,inside:(g,m)=>{for(const y of [12,24.5])pkFill(g,pkRect(4.5,y,18.5,2.6,0),'iron',{k:.4,lw:.7});pkLine(g,'M10.5 15 L10.5 24 M16.5 15 L16.5 24',.7,m[1],.8)}});
 pkFill(g,pkS('M3.5 10.5 C2 7.5 4.5 4.5 7.5 5 C8.5 2.5 12.5 2 14.5 4 C16.5 2.4 20.5 3 21 5.5 C24 5.5 25.5 8.5 23.5 10.5 C20 12 7 12 3.5 10.5 Z'),'white',{k:.9})};
P.market=g=>{pkFill(g,pkRect(5,16,22,13,1),'wood',{k:1.2,inside:(g,m)=>{pkFill(g,pkRect(5,16,22,3.4,0),'darkwood',{k:.4,lw:.8});pkLine(g,'M5 24 L27 24',.7,m[1],.8)}});
 for(const x of [5.5,25])pkFill(g,pkRect(x,9,1.6,8,0),'darkwood',{k:.3,lw:.8});
 pkFill(g,pkS('M2 4 L30 4 L30 11 Q28.25 13.6 26.5 11 Q24.75 13.6 23 11 Q21.25 13.6 19.5 11 Q17.75 13.6 16 11 Q14.25 13.6 12.5 11 Q10.75 13.6 9 11 Q7.25 13.6 5.5 11 Q3.75 13.6 2 11 Z'),'white',{k:1,inside:(g,m)=>{
   for(let i=0;i<4;i++)pkFill(g,pkRect(5.5+i*7,2,3.5,12,0),'cloth',{k:.4,lw:0})}});
 pkFill(g,pkCirc(10,15.5,2.4),'fire',{ball:1,k:.4,lw:.8});pkFill(g,pkCirc(15.5,15,2.6),'green',{ball:1,k:.4,lw:.8});pkFill(g,pkCirc(21,15.5,2.4),'gold',{ball:1,k:.4,lw:.8})};
P.inn=g=>{pkFill(g,pkRect(2,9,3.2,20,1),'wood',{k:.5});pkFill(g,pkRect(27,15,3,14,1),'wood',{k:.5});
 pkFill(g,pkRect(3,19.5,26.5,5,1),'wood',{k:.8});pkFill(g,pkEll(9.5,15.2,5,3),'white',{k:.8});
 pkFill(g,pkS('M10 13.5 L28.5 13.5 Q30 13.5 30 15 L30 20.5 L10 20.5 Z'),'cloth',{k:1.2,inside:(g,m)=>{pkLine(g,'M13.5 13.6 L13.5 20.4',.8,m[1],.8);pkHi(g,'M15 15 L27 15',1,.45)}})};
P.board=g=>{for(const x of [6.5,23])pkFill(g,pkRect(x,20,2.8,10,.6),'darkwood',{k:.4});pkFill(g,pkRect(2.5,3,27,19,1.6),'wood',{k:1.5,inside:(g,m)=>pkLine(g,'M2.5 9.5 L29.5 9.5 M2.5 15.5 L29.5 15.5',.6,m[1],.7)});
 const note=(x,y,w,h,a)=>{pkAt(g,x,y,a,1,g=>{pkFill(g,pkRect(-w/2,0,w,h,.4),'vellum',{k:.7,inside:(g,m)=>{for(let i=0;i<3;i++)pkLine(g,`M${-w/2+1.4} ${2.6+i*2.2} L${w/2-1.4-(i==2?2:0)} ${2.6+i*2.2}`,.6,m[1],.8)}});pkFill(g,pkCirc(0,1.2,1.2),'blood',{ball:1,k:.2,lw:.6})})};
 note(9.5,5,8.5,11,-4);note(21.5,5.5,8,9.5,5)};
P.temple=g=>{pkFill(g,pkS('M16 2.5 L30 10.5 L2 10.5 Z'),'white',{k:1,inside:(g,m)=>pkFill(g,pkS('M16 5.6 L23.5 9.6 L8.5 9.6 Z'),'stone',{lw:.7,k:.4,noRim:1})});
 pkFill(g,pkRect(2.5,10.5,27,2.6,.4),'white',{k:.5});for(const x of [5,10.5,16,21.5])pkFill(g,pkRect(x,13,3.6,11.5,0),'white',{k:.7,inside:(g,m)=>pkLine(g,`M${x+1.8} 13.6 L${x+1.8} 24`,.5,m[1],.8)});
 pkFill(g,pkRect(26,13,0,0,0),'white',{lw:0});pkFill(g,pkRect(2.5,24.5,27,2.6,.4),'white',{k:.5});pkFill(g,pkRect(1,27,30,3,.4),'stone',{k:.6});pkFill(g,pkCirc(16,2.4,1.9),'chi',{ball:1,k:.4})};
P.quill=g=>{pkLine(g,'M3 29 L13 29',1.6,PKM.gold[2]);pkFill(g,pkS('M5 27 C9 20 15 12 28 3 C27.5 9 24 15 19 18.5 L15.5 18.5 L17 20.5 C13 23 9 25 5 27 Z'),'white',{k:1.2,inside:(g,m)=>{pkLine(g,'M6 26 C12 19.5 18 13 26 5.5',.8,m[1],.9);pkLine(g,'M14 18.5 L18.5 15 M18 15.4 L22 11.4',.6,m[1],.6)}});
 pkFill(g,pkS('M2.5 29.5 L4.4 25.4 L6.6 27.4 Z'),'dark',{k:.3})};
P.plus=g=>pkFill(g,pkS('M12 3 L20 3 L20 12 L29 12 L29 20 L20 20 L20 29 L12 29 L12 20 L3 20 L3 12 L12 12 Z'),'gold',{k:1.2,inside:()=>pkHi(g,'M13.6 5 L13.6 12.4 L5 13.6',1,.6)});
P.minus=g=>pkFill(g,pkRect(3,12,26,8,2.6),'gold',{k:1,inside:()=>pkHi(g,'M5.5 13.8 L26 13.8',1,.6)});
P.info=g=>{pkFill(g,pkCirc(16,16,14),'gold',{ball:1,k:1.6});pkFill(g,pkCirc(16,8.4,2.6),'dark',{lw:0,noRim:1});pkFill(g,pkS('M12 13 L18.4 13 L18.4 23 L20.5 23 L20.5 26 L11.5 26 L11.5 23 L13.6 23 L13.6 16 L12 16 Z'),'dark',{lw:0,noRim:1})};
P.resolve=g=>{pkHaft(g,5,3,5,30,2.6,'wood');pkFill(g,pkRect(4,3.6,24,2.4,1),'wood',{k:.4});paBanner(g,7.5,6,19,21,'teal',(g,m)=>pkStar(g,17,13.6,5,'gold',5,2.3));pkFill(g,pkCirc(5,2.4,1.9),'brass',{ball:1,k:.5})};
P.reserve=g=>{pkFill(g,pkS('M2.5 30 C2.5 22 5.5 18.5 10.5 18.5 C15.5 18.5 18.5 22 18.5 30 Z'),'teal',{k:1.2});pkFill(g,pkCirc(10.5,12,5.4),'skin',{ball:1,k:.8});
 pkFill(g,pkS('M17 13 L24 13 L24 8 L31 15.5 L24 23 L24 18 L17 18 Z'),'gold',{k:.8})};
P.withdraw=g=>{pkFill(g,pkRect(2.5,3,3.6,26,1.2),'gold',{k:.6});pkFill(g,pkS('M8 16 L18 6 L18 12 L29.5 12 L29.5 20 L18 20 L18 26 Z'),'gold',{k:1})};
/* ---- contracts ---- */
P['ct-deliver']=g=>{pkFill(g,pkS('M3 13 Q3 5.5 10 5.5 L22 5.5 Q29 5.5 29 13 Z'),'wood',{k:.9,inside:(g,m)=>pkLine(g,'M4 10 L28 10',.6,m[1],.7)});
 pkFill(g,pkRect(3,13,26,15,1),'wood',{k:1.4,inside:(g,m)=>pkLine(g,'M3 20.5 L29 20.5',.6,m[1],.7)});
 for(const x of [7,23])pkFill(g,pkRect(x-1.5,5.6,3,22.4,0),'brass',{k:.4,lw:.8});pkFill(g,pkRect(13,10.5,6,7,1),'brass',{k:.5});pkFill(g,pkCirc(16,19.5,3),'blood',{ball:1,k:.5})};
P['ct-hunt']=g=>paPaw(g,16,15.5,1.25,'leather');
P['ct-escort']=g=>paWagon(g,'canvas',{extra:g=>pkShield(g,16.5,12.6,{kind:'heater',w:8,h:9,mat:'teal',rim:'silver',rimW:1.1})});
P['ct-defend']=g=>{pkFill(g,pkS('M4 3 L8.5 3 L8.5 6 L13.5 6 L13.5 3 L18.5 3 L18.5 6 L23.5 6 L23.5 3 L28 3 L28 22 Q28 27 16 30 Q4 27 4 22 Z'),'stone',{k:1.5});
 pkShield(g,16,17,{kind:'heater',w:13,h:14.5,mat:'teal',rim:'silver',rimW:1.4,emblem:g=>pkStar(g,0,-.6,3.6,'gold',5,1.6)})};
P['ct-patrol']=g=>{pkFill(g,pkTube([2,30,30,20],5,'flat'),'canvas',{k:.6,inside:(g,m)=>pkLine(g,'M6 28 L9 27 M14 25.2 L17 24.1 M22 22.3 L25 21.2',.9,m[4],.8)});pkFlag(g,9,4,{w:16,h:10,mat:'cloth',pole:20})};
P['ct-beast']=g=>{for(const [x,o] of [[7,0],[15,-1.5],[23,0]])pkFill(g,pkTube(pkQ(x-3,2.5+o,x+3.5,15,x-3,29.5+o,10),[1.4,4.2],'round'),'blood',{k:.7})};
P['ct-relic']=g=>{pkFill(g,pkS('M5 4 L27 4 C27 13 22 17.5 18 18 L18 23 C21 23.5 24 25 24.5 28.5 L7.5 28.5 C8 25 11 23.5 14 23 L14 18 C10 17.5 5 13 5 4 Z'),'gold',{k:1.6,inside:(g,m)=>{pkFill(g,pkEll(16,5,10.4,2),'gold',{k:.3,lw:.7,noShade:1});pkHi(g,'M8.5 7.5 Q9 12 12.5 15',1.3,.7)}});pkGem(g,16,11,2.4,'blood','round');pkPost(g=>pkGlint(g,8,9,2))};
P['ct-siege']=g=>{pkFill(g,pkS('M3 4 L6 4 L6 6 L9 6 L9 4 L12 4 L12 6 L15 6 L15 4 L18 4 L18 29.5 L3 29.5 Z'),'stone',{k:1.4,inside:(g,m)=>{pkLine(g,'M3 12 L18 12 M3 20 L18 20 M10 6 L10 12 M7 12 L7 20 M13.5 20 L13.5 29.5',.6,m[1],.7);pkFill(g,pkRect(8.6,14,3.2,4.6,1.4),'dark',{lw:.6,noRim:1})}});
 const rail=(x0,y0,x1,y1)=>pkFill(g,pkTube([x0,y0,x1,y1],2.4,'round'),'wood',{k:.4,lw:PK.lw*.85});for(let i=0;i<5;i++){const t=i/4.6+.08;pkLine(g,`M${16+t*8} ${29-t*24} L${22+t*8} ${30.5-t*24}`,2,PK.ink);pkLine(g,`M${16+t*8} ${29-t*24} L${22+t*8} ${30.5-t*24}`,1,PKM.wood[3])}
 rail(16,29.5,24,4.5);rail(22,31,30,6)};
P['ct-nest']=g=>{pkFill(g,pkS('M2 18 Q16 15 30 18 Q29 28 16 29.5 Q3 28 2 18 Z'),'wood',{k:1.4,inside:(g,m)=>{for(let i=0;i<5;i++)pkLine(g,`M${3+i*1.5} ${19+i*2} Q16 ${17+i*2.8} ${29-i*1.5} ${19+i*2}`,.7,i&1?m[0]:m[3],.75)}});
 for(const [x,y,r,a] of [[10,13,4.6,-12],[22,13,4.6,12],[16,10.5,5.4,0]])pkFill(g,pkEll(x,y,r*.82,r*1.1,a),'bone',{ball:1,k:.9,inside:(g,m)=>{g.fillStyle=m[1];g.globalAlpha=.6;g.fill(pkCirc(x+1.4,y+1.2,.8).p);g.fill(pkCirc(x-1.5,y+2.4,.6).p);g.globalAlpha=1}})};
P['ct-bounty']=g=>{pkFill(g,pkRect(4,2,24,28,1),'vellum',{k:1.4,inside:(g,m)=>{pkFill(g,pkS('M8.5 21.5 C8.5 16.6 11.8 15 16 15 C20.2 15 23.5 16.6 23.5 21.5 Z'),'cloth',{k:.6,lw:.8});
   pkFill(g,pkEll(16,10.6,4.4,5),'skin',{ball:1,k:.5,lw:.8});pkFill(g,pkS('M11.4 10 C11.6 5 20.4 5 20.6 10 L18.5 8.6 L13.5 8.6 Z'),'dark',{k:.3,lw:.7});pkLine(g,'M13.2 11.8 L18.8 11.8',1.5,PK.ink);
   pkFill(g,pkRect(7,23.5,18,2.6,.4),'blood',{k:.2,lw:.6});pkLine(g,'M8 28 L24 28',.7,m[1],.9)}});pkFill(g,pkCirc(16,3.2,1.4),'iron',{ball:1,k:.2,lw:.6})};
/* ---- situations in towns ---- */
P['sit-famine']=g=>{for(const [x,a] of [[11,-14],[16,0],[21,14]])pkAt(g,x,18,a,1,g=>{pkFill(g,pkTube([0,0,0,-12],1.4,'round'),'canvas',{k:.3,lw:PK.lw*.8});pkFill(g,pkTube(pkQ(0,-8,-2,-10,-3.5,-9.5,5),1.2,'round'),'canvas',{k:.2,lw:PK.lw*.7});pkFill(g,pkTube(pkQ(0,-5,2,-7,3.5,-6.5,5),1.2,'round'),'canvas',{k:.2,lw:PK.lw*.7})});
 pkFill(g,pkS('M2 17 L30 17 Q29 27 18 28 L14 28 Q3 27 2 17 Z'),'wood',{k:1.6,inside:(g,m)=>pkFill(g,pkEll(16,17,14,2.4),'darkwood',{k:.3,lw:.8,noRim:1})});pkFill(g,pkRect(11,27.4,10,2.6,.8),'wood',{k:.4})};
P['sit-raided']=g=>{pkFill(g,pkRect(5,16,22,13,.6),'white',{k:1.4,inside:(g,m)=>{pkFill(g,pkRect(13,20.5,6,8.5,2.6),'darkwood',{k:.4,lw:.8});pkFill(g,pkRect(7.5,19,3.6,3.6,.5),'dark',{lw:.6,noRim:1})}});
 pkFill(g,pkS('M2 17.5 L16 6.5 L30 17.5 Z'),'canvas',{k:1.3,inside:(g,m)=>pkLine(g,'M8 13 L24 13',.6,m[1],.7)});pkGlow(g,18,9,10,'#ff8a3c',.55);pkFlame(g,13,15,12,'fire');pkFlame(g,21,14.5,15,'fire')};
P['sit-festival']=g=>{for(const x of [3.5,28.5])pkHaft(g,x,3,x,30,2.6,'wood');pkLine(g,'M3.5 5 Q16 13 28.5 5',.9,PK.ink);
 const cols=['cloth','gold','teal','blue','cloth','green'];for(let i=0;i<5;i++){const t=(i+.6)/5.2,x=3.5+25*t,y=5+8*(4*t*(1-t))*.98;pkFill(g,pkS(`M${x-2.2} ${y-.4} L${x+2.2} ${y+.4} L${x+.3} ${y+5} Z`),cols[i],{k:.3,lw:PK.lw*.8})}
 pkLine(g,'M16 9 L16 15',1,PK.ink);pkFill(g,pkEll(16,21,5.5,6.4),'fire',{ball:1,k:1,inside:(g,m)=>pkLine(g,'M10.6 21 L21.4 21',.6,m[0],.6)});pkFill(g,pkRect(13.5,14,5,2.4,.6),'brass',{k:.3,lw:.8});pkFill(g,pkRect(14.2,27,3.6,2,.5),'brass',{k:.2,lw:.8})};
P['sit-plague']=g=>{pkFill(g,pkS('M6 30 L6 9 Q6 2.5 16 2.5 Q26 2.5 26 9 L26 30 Z'),'wood',{k:1.6,inside:(g,m)=>{pkLine(g,'M11.5 4.5 L11.5 30 M16 2.6 L16 30 M20.5 4.5 L20.5 30',.6,m[1],.75);for(const y of [9,23])pkFill(g,pkRect(5,y,22,2.6,.3),'iron',{k:.3,lw:.7})}});
 pkFill(g,pkU(pkTube([9,10,23,25],3.6,'round'),pkTube([23,10,9,25],3.6,'round')),'blood',{k:.5,lw:PK.lw*.8});pkFill(g,pkCirc(22.5,17.5,1.2),'brass',{ball:1,k:.2,lw:.6})};
P['sit-boom']=g=>{for(let i=0;i<4;i++)pkFill(g,pkEll(9.5,26.5-i*4,7.2,2.6),'gold',{k:.6,lw:PK.lw*.9});pkFill(g,pkEll(22,26.5,7,2.6),'gold',{k:.6,lw:PK.lw*.9});pkFill(g,pkEll(22,22.5,7,2.6),'gold',{k:.6,lw:PK.lw*.9});
 pkFill(g,pkS('M17 15.5 L23 4.5 L29.5 15.5 L25.6 15.5 L25.6 19 L20.4 19 L20.4 15.5 Z'),'chi',{k:.8})};
P['sit-siege']=g=>{for(const [x0,x1] of [[4,28],[28,4]])pkFill(g,pkTube([x0,28,x1+(x1>x0?-2:2),3],2.4,'round'),'wood',{k:.3,lw:PK.lw*.8});
 for(const [x,a] of [[4.6,-40],[27.4,40]])pkAt(g,x,4,a,1,g=>pkBlade(g,{len:6,w:4,tip:'leaf',fuller:false}));
 pkFill(g,pkS('M4 11 L8 11 L8 13 L12 13 L12 11 L20 11 L20 13 L24 13 L24 11 L28 11 L28 29 L4 29 Z'),'stone',{k:1.5,inside:(g,m)=>pkLine(g,'M4 18 L10 18 M22 18 L28 18 M7 24 L10 24 M22 24 L25 24',.6,m[1],.7)});
 pkFill(g,pkS('M10.5 29 L10.5 22 Q10.5 16 16 16 Q21.5 16 21.5 22 L21.5 29 Z'),'dark',{k:.6,noRim:1,inside:(g,m)=>pkLine(g,'M13 18 L13 29 M16 16.5 L16 29 M19 18 L19 29 M10.5 23 L21.5 23',.6,m[3],.9)})};
/* ---- buildings ---- */
P['bld-armorer']=g=>{pkFill(g,pkRect(14.4,24,3.2,5,0),'darkwood',{k:.3});pkFill(g,pkRect(8,28,16,2.6,.8),'darkwood',{k:.3});
 pkFill(g,pkS('M8 6 L12 4.5 Q16 7 20 4.5 L24 6 L29.5 9 L28 15 L24.5 14 L23.5 25 Q16 27 8.5 25 L7.5 14 L4 15 L2.5 9 Z'),'steel',{k:1.6,inside:(g,m)=>{pkLine(g,'M16 7.5 L16 25.6',.9,m[1],.8);pkLine(g,'M7.6 14 Q16 17 24.4 14',.7,m[1],.8);pkHi(g,'M10.5 9 Q11 16 13 22',1.4,.55)}});pkPost(g=>pkGlint(g,11,10.5,2))};
P['bld-weaponsmith']=g=>{pkFill(g,pkS('M2 9 L22 9 L22 11 Q26 11 30 9 Q29 14 24 15.5 L19 15.5 L18 20 L22 22 L22 25 L8 25 L8 22 L12 20 L11 15.5 C7 15.5 3.5 13 2 9 Z'),'iron',{k:1.4,inside:()=>pkHi(g,'M4 10.4 L20 10.4',1,.6)});
 pkFill(g,pkRect(6,25,18,4.5,.6),'darkwood',{k:.5});pkAt(g,21,7,-50,1,g=>{pkHaft(g,0,0,0,-10,2.2,'wood');pkFill(g,pkRect(-4.6,-13.5,9.2,4.6,1),'steel',{k:.6})});pkSparkle(g,6.5,4.6,3.6,'fire');pkPost(g=>pkGlint(g,6.5,4.6,1.6))};
P['bld-college']=g=>{paBook(g,'blue',{y:12});pkGlow(g,16,6,7,'#8ccfff',.6);pkGem(g,16,6,4.4,'mana')};
P['bld-hall']=g=>{pkFill(g,pkRect(14.2,10,3.6,18,.6),'wood',{k:.5});pkFill(g,pkRect(4,13,24,3.4,1.2),'wood',{k:.5});pkFill(g,pkRect(10,28,12,2.4,.8),'darkwood',{k:.3});
 pkFill(g,pkS('M11 14 L21 14 L20 25 L12 25 Z'),'canvas',{k:1,inside:(g,m)=>{pkLine(g,'M11.4 18.5 L20.6 18.5 M11.8 22 L20.2 22',.6,m[1],.8)}});pkFill(g,pkCirc(16,7.5,4.6),'canvas',{ball:1,k:.8,inside:(g,m)=>pkLine(g,'M12.5 9 L19.5 9',.6,m[1],.8)});
 pkFill(g,pkPoly([13,24.6,15,24.6,11,30,9,30]),'canvas',{k:.2,lw:.7})};
P['bld-fletcher']=g=>{for(const [x,a] of [[10.5,-8],[16,0],[21.5,8]])pkAt(g,x,18,a,1,g=>{pkFill(g,pkRect(-.9,-14,1.8,14,.6),'wood',{k:.2,lw:PK.lw*.8});pkFill(g,pkS('M-.9 -8.4 L-3 -10 L-3 -15 L-.9 -13.4 Z'),'white',{k:.2,lw:PK.lw*.7});pkFill(g,pkS('M.9 -8.4 L3 -10 L3 -15 L.9 -13.4 Z'),'white',{k:.2,lw:PK.lw*.7})});
 pkFill(g,pkRect(5,14,22,15.5,1),'wood',{k:1.5,inside:(g,m)=>{pkLine(g,'M5 19 L27 19 M5 24.5 L27 24.5',.6,m[1],.75);pkFill(g,pkRect(13,20.6,6,2.4,.6),'brass',{k:.2,lw:.6})}})};
P['bld-harbour']=g=>{const S=pkU(pkTube([16,8,16,28],3.4,'flat'),pkTube([9,11.6,23,11.6],3,'round'),pkTube(pkArc(16,16,11,108,252,18),3.4,'round'));pkFill(g,S,'steel',{k:1});
 for(const [x,a] of [[5.6,-55],[26.4,55]])pkAt(g,x,19,a,1,g=>pkFill(g,pkS('M0 -4 L3 1.6 L-3 1.6 Z'),'steel',{k:.3}));
 const R=new Path2D();R.arc(16,5.6,3.4,0,Math.PI*2);R.arc(16,5.6,1.5,0,Math.PI*2,true);pkFill(g,{p:R,b:[12.6,2.2,19.4,9]},'steel',{k:.4,rule:'evenodd'});pkPost(g=>pkGlint(g,14,15,1.8))};
/* ---- goals of rival companies on the map ---- */
P['goal-roam']=g=>{paPaw(g,7,26,.46,'leather',20);paPaw(g,18,22,.46,'leather',40);paPaw(g,13,12.5,.46,'leather',20);paPaw(g,24,9,.42,'leather',40)};
P['goal-caravan']=g=>paWagon(g,'canvas',{extra:g=>{pkFill(g,pkRect(26,11.5,4,7,.6),'wood',{k:.3,lw:.8})}});
P['goal-patrol']=g=>{pkFill(g,pkS('M16 8 C14 4 15 1.5 19 1 C17.5 3 19 5 21 6.5 Z'),'cloth',{k:.6});
 pkFill(g,pkS('M4.5 28 L4.5 15 C4.5 9 9.5 6 16 6 C22.5 6 27.5 9 27.5 15 L27.5 28 C23 30 9 30 4.5 28 Z'),'steel',{k:2,inside:(g,m)=>{pkFill(g,pkRect(4,15.5,24,4,1.4),'dark',{k:.4,noRim:1,lw:PK.lw*.9});pkLine(g,'M16 6.5 L16 15',1,m[1],.7);pkHi(g,'M7.5 12 Q9.5 8.4 14 7.6',1.4,.7);for(const x of [11,13.5,18.5,21])g.fillStyle=PK.ink,g.fill(pkCirc(x,24,.7).p)}})};
P['goal-raid']=g=>{pkFill(g,pkTube(pkQ(8,30,10,20,17,13,8),[2.8,4.4],'round'),'wood',{k:.8});pkFill(g,pkRect(14.5,11,6,4.4,1),'iron',{k:.4});pkGlow(g,19.5,7,9,'#ff8a3c',.55);pkFlame(g,19,12,12,'fire')};
/* ---- reputation faces ---- */
P['rep-hostile']=g=>paFace(g,'blood','M10.5 24 Q16 19 21.5 24 M12 22 L12 23.5 M16 20.6 L16 22.4 M20 22 L20 23.5','M8 9.5 L13.6 12 M24 9.5 L18.4 12');
P['rep-cold']=g=>paFace(g,'blue','M10.5 24 Q16 19.6 21.5 24',null);
P['rep-neutral']=g=>paFace(g,'stone','M11 22.4 L21 22.4',null);
P['rep-friendly']=g=>paFace(g,'teal','M10 20.6 Q16 26 22 20.6',null);
P['rep-allied']=g=>{paLaurel(g,16,16.5,13.5,{n:4,top:30,s:1});pkAt(g,16,16.5,0,.82,g=>{g.translate(-16,-16);paFace(g,'gold',null,null);pkFill(g,pkS('M9.5 19.6 Q16 28 22.5 19.6 Z'),'dark',{lw:PK.lw*1.2,noRim:1,inside:(g,m)=>pkFill(g,pkRect(10,19.4,12,2,0),'white',{lw:0,noShade:1})})})};
/* ---- origins ---- */
P['or-free']=g=>{pkFlag(g,7,4,{w:20,h:12,mat:'teal',pole:24,wave:2,tatter:1});pkStar(g,15.5,10,3.4,'gold',5,1.6)};
P['or-deserters']=g=>{pkAt(g,10,22,45,1,g=>{pkGrip(g,{len:5,w:2.8});pkAt(g,0,6.4,0,1,g=>pkPommel(g,{r:2.2}));pkFill(g,pkS('M-2.4 0 L-2.4 -9 L-.4 -10.6 L1 -8.6 L2.4 -10 L2.4 0 Z'),'iron',{k:1,inside:(g,m)=>pkHi(g,'M-1.2 -.6 L-1.2 -8.6',.7,.6)});pkGuard(g,{w:11,h:2.8})});
 pkAt(g,23.5,8.5,40,1,g=>pkFill(g,pkS('M-2.4 4 L-1 2 L.6 3.4 L2.4 2.2 L2.4 -4 L0 -7.5 L-2.4 -4 Z'),'iron',{k:.8}))};
P['or-noble']=g=>{pkShield(g,16,19,{kind:'heater',w:22,h:20,mat:'cloth',rim:'gold',rimW:1.6,emblem:g=>pkGem(g,0,-1,3.6,'gold')});paCrown(g,'gold',null,{y0:1.4,y1:9.6,x0:7,ball:1.4})};
P['or-academy']=g=>{paBook(g,'blue',{y:12});pkGlow(g,16,6,7,'#8ccfff',.6);pkStar(g,16,6,5.4,'mana',4,2)};
P['or-hunters']=g=>{const ant=s=>{const X=x=>16+s*x;pkFill(g,pkU(pkTube(pkQ(X(4),13,X(9),9,X(10),2,8),[2.8,1.6],'round'),pkTube(pkQ(X(7.6),10.2,X(11),9,X(14),6.5,6),[2,1.2],'round'),pkTube(pkQ(X(9.6),5.5,X(12),5,X(13),2,5),[1.6,1],'round')),'bone',{k:.5})};ant(-1);ant(1);
 for(const s of [-1,1])pkFill(g,pkEll(16+s*8,15,3.6,2,s*-25),'leather',{k:.4});
 pkFill(g,pkS('M10 13 C10 9.5 22 9.5 22 13 C22 18 20 21 19 26 C18.4 29 13.6 29 13 26 C12 21 10 18 10 13 Z'),'leather',{k:1.2,inside:(g,m)=>pkFill(g,pkEll(16,25.4,3,2.6),'dark',{k:.4,lw:.7,noRim:1})});paEye(g,13.2,15.5,.9,1.2);paEye(g,18.8,15.5,.9,1.2)};
P['or-pilgrims']=g=>{pkHaft(g,9,10,9,30,2.8,'wood');pkFill(g,pkTube(pkQ(9,10,9,5,13,4,6),2.4,'round'),'wood',{k:.4});pkGlow(g,14,4.5,6,'#c49eff',.5);pkGem(g,14,5.4,4.4,'void');
 pkFill(g,pkS('M17 19 C17 15 27 15 27 19 C29 22 28.5 28 22 28.5 C15.5 28 15 22 17 19 Z'),'void',{k:1.2,inside:(g,m)=>pkLine(g,'M18 18.6 Q22 20.4 26 18.6',.8,m[0],.8)});pkFill(g,pkRect(19.5,15,5,3.4,1),'purple',{k:.3,lw:.8})};
P.factions=g=>{pkShield(g,16,17.5,{kind:'heater',w:24,h:24,mat:'teal',rim:'silver',rimW:1.6,emblem:g=>{g.fillStyle=PKM.cloth[2];g.fillRect(-12,-12,12,11);g.fillStyle=PKM.gold[2];g.fillRect(0,-1,12,14);
   g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,-1,12,14);pkLine(g,'M0 -12 L0 14 M-12 -1 L12 -1',.9,PK.ink,.9)}});paCrown(g,'gold',null,{y0:.5,y1:7.4,x0:9,ball:1.2})};
P.negotiate=g=>{pkFill(g,pkRect(15,4,2.4,22,.8),'brass',{k:.4});pkFill(g,pkRect(9,26,14,3.4,1),'brass',{k:.5});pkFill(g,pkTube([3.5,7,28.5,7],2.4,'round'),'brass',{k:.4});
 for(const x of [7,25]){pkLine(g,`M${x} 7.5 L${x-4.6} 18 M${x} 7.5 L${x+4.6} 18`,.8,PK.ink);pkFill(g,pkS(`M${x-6} 18 L${x+6} 18 Q${x} 23.5 ${x-6} 18 Z`),'gold',{k:.6})}pkFill(g,pkCirc(16.2,3.4,2),'gold',{ball:1,k:.4})};
P['goal-merc']=g=>{pkFlag(g,6,4,{w:17,h:12,mat:'cloth',pole:25,tatter:1});pkSword(g,16,26,45,{len:12,w:3.4,guard:8,grip:3.6})};
P.rival=g=>{const man=(x,body)=>{pkFill(g,pkS(`M${x-7} 30 C${x-7} 22 ${x-4.5} 19 ${x} 19 C${x+4.5} 19 ${x+7} 22 ${x+7} 30 Z`),body,{k:1});
  pkFill(g,pkS(`M${x-5} 16 L${x-5} 11 C${x-5} 7 ${x-2.8} 5 ${x} 5 C${x+2.8} 5 ${x+5} 7 ${x+5} 11 L${x+5} 16 C${x+3} 18 ${x-3} 18 ${x-5} 16 Z`),'steel',{k:1.2,inside:(g,m)=>pkFill(g,pkRect(x-5.4,10.5,10.8,2.6,1),'dark',{lw:PK.lw*.8,noRim:1})})};man(9.5,'cloth');man(22.5,'blue')};
P.parley=g=>pkFlag(g,6,4,{w:22,h:16,mat:'vellum',pole:24,wave:3.2});
/* ---- personalities of rival captains ---- */
P['pers-honour']=g=>pkHeaterCross(g,'white','gold');
P['pers-cutthroat']=g=>{pkSword(g,10.5,21.5,45,{len:19,w:4.4,guard:10,grip:5});pkAt(g,10.5,21.5,45,1,g=>{g.save();g.clip(pkS('M-2.2 -19.2 L2.2 -19.2 L2.2 -9 L-2.2 -9 Z').p);pkFill(g,pkS('M-3 -21 L3 -21 L3 -10 Q2 -8.4 1.2 -10.6 Q.4 -13 -.4 -11 Q-1.2 -7.4 -2 -11.4 L-3 -12 Z'),'blood',{lw:PK.lw*.7,k:.4});g.restore()});pkDrop(g,27,22,6.5,'blood')};
P['pers-greedy']=g=>{pkFill(g,pkS('M11 9 C5 13 3 18 3.5 22.5 C4 28 9 29.5 15.5 29.5 C22 29.5 27 28 27.5 22.5 C28 18 26 13 20 9 Z'),'leather',{k:1.8,inside:(g,m)=>pkHi(g,'M7.5 17 Q9 13 12 11',1.2,.45)});pkFill(g,pkS('M11 9 L20 9 L22.5 3.5 Q15.5 5.5 8.5 3.5 Z'),'leather',{k:.5});pkFill(g,pkRect(10,7.8,11,2.4,1),'gold',{k:.3,lw:.8});
 pkCoin(g,22.5,24.5,6,'gold');pkCoin(g,13,21,5.2,'gold')};
P['pers-glory']=g=>{paLaurel(g,16,14,12.5,{n:4,top:52});pkStar(g,16,19,6.2,'gold',5,2.8);pkPost(g=>pkGlint(g,14,16,1.8))};
/* ---- rival ranks: a crown per rank, its pips below ---- */
const RT=[null,['iron','stone'],['bronze','blood'],['teal','blood'],['silver','mana'],['gold','blood'],['gold','void']];
for(let i=1;i<=6;i++)P['rt-'+i]=g=>{const [m,gem]=RT[i];paCrown(g,m,gem,{y0:3,y1:20.5,x0:3});const w=i*4.2+(i-1)*.4,x0=16-w/2+2.1;for(let j=0;j<i;j++)pkFill(g,pkCirc(x0+j*4.6,26.5,1.9),m,{ball:1,k:.4,lw:PK.lw*.9})};
/* ---- company screens, menus ---- */
P.ambition=g=>{pkFill(g,pkS('M1 29.5 L12.5 9 L16 13 L19 10 L31 29.5 Z'),'stone',{k:1.6,inside:(g,m)=>{pkFill(g,pkS('M8.4 16.4 L12.5 9 L16 13 L19 10 L22.6 15.8 L19.6 14.4 L17 17 L14 14.6 L11 18 Z'),'white',{k:.4,lw:.7});pkLine(g,'M12.5 9 L9 30 M19 10 L23 30',.6,m[1],.6)}});
 pkHaft(g,12.5,1.5,12.5,9.5,1.6,'darkwood');pkFill(g,pkS('M13.4 1.5 L21 3.4 L13.4 6 Z'),'cloth',{k:.4,lw:PK.lw*.85})};
P.retinue=g=>{const man=(x,y,s,body,hood)=>pkAt(g,x,y,0,s,g=>{pkFill(g,pkS('M-8 13 C-8 4 -4.5 1.5 0 1.5 C4.5 1.5 8 4 8 13 Z'),body,{k:1});pkFill(g,pkS('M-5.6 -1 C-5.6 -7 -3 -9.5 0 -9.5 C3 -9.5 5.6 -7 5.6 -1 C5.6 2 3.5 3 0 3 C-3.5 3 -5.6 2 -5.6 -1 Z'),hood,{k:.8});pkFill(g,pkEll(0,-1.4,3.2,3.6),'skin',{ball:1,k:.4,lw:.8})});
 man(8,13,.85,'leather','leather');man(24,13,.85,'leather','leather');man(16,19,1,'teal','teal')};
P['diff-story']=g=>paBook(g,'leather',{y:7});
P['diff-normal']=g=>{pkSword(g,8,24,45,{len:22,w:4.2,guard:10.5,grip:4.4});pkSword(g,24,24,-45,{len:22,w:4.2,guard:10.5,grip:4.4})};
P['diff-hard']=g=>pkSkull(g,16,16.5,1.3,'bone');
P['diff-brutal']=g=>{for(const s of [-1,1])pkFill(g,pkTube(pkQ(16+s*7,8,16+s*14,6,16+s*12.5,0.8,8),[3.4,.6],'round'),'bone',{k:.5});pkSkull(g,16,17,1.25,'blood');
 pkFill(g,pkS('M5 28 Q16 33 27 28 L25 31 L7 31 Z'),'dark',{lw:0})};
P.ironman=g=>{pkFill(g,pkS('M5 27 L5 12 C5 6 9.5 2.5 16 2.5 C22.5 2.5 27 6 27 12 L27 27 C23 29.5 9 29.5 5 27 Z'),'steel',{k:2,inside:(g,m)=>{for(const y of [11.5,17.5])pkFill(g,pkRect(4,y,24,2.8,1.2),'dark',{k:.4,noRim:1,lw:PK.lw*.9});pkLine(g,'M16 3 L16 11.5',1,m[1],.7);pkHi(g,'M8 8.5 Q10.5 4.6 15 4.4',1.5,.7)}})};
P.hall=g=>{pkFill(g,pkS('M6 27 L6 10 Q6 3 16 3 Q26 3 26 10 L26 27 Z'),'stone',{k:1.8,inside:(g,m)=>{pkFill(g,pkS('M14.6 7 L17.4 7 L17.4 10.6 L21 10.6 L21 13.4 L17.4 13.4 L17.4 21 L14.6 21 L14.6 13.4 L11 13.4 L11 10.6 L14.6 10.6 Z'),'dark',{lw:0,noRim:1});pkHi(g,'M8.5 10 Q9 5.6 13 5',1.3,.5)}});
 pkFill(g,pkS('M2 30 Q4 25.5 8 26.5 Q11 24 16 25.5 Q21 24 24 26.5 Q28 25.5 30 30 Z'),'green',{k:.8})};
P.ledger=g=>{pkFill(g,pkS('M6 4 L27 4 L27 27 L6 27 Z'),'vellum',{k:.6});pkFill(g,pkS('M3.5 5.5 L24.5 5.5 L24.5 29.5 L3.5 29.5 Z'),'cloth',{k:1.6,inside:(g,m)=>{pkFill(g,pkRect(3.5,13.5,21,5,0),'gold',{k:.4,lw:.8});pkLine(g,'M6.5 5.5 L6.5 29.5',.8,m[0],.6);pkHi(g,'M8 7.6 L22 7.6',.9,.45)}});
 pkLine(g,'M25 6.5 L25 29 M26 5.5 L26 28',.6,PKM.vellum[1],.9);pkFill(g,pkS('M17 29.5 L17 32 L18.6 30.8 L20.2 32 L20.2 29.5 Z'),'gold',{k:.2,lw:.7})};
P['export']=g=>{paPapers(g);paBlockArrow(g,16,8.5,0,.62,'gold')};
P['import']=g=>{paPapers(g);paBlockArrow(g,16,7.6,180,.62,'gold')};
P.hint=g=>{pkFill(g,pkS('M5 3 L27 3 Q30 3 30 6 L30 21 Q30 24 27 24 L13 24 L6 30 L7.5 24 L5 24 Q2 24 2 21 L2 6 Q2 3 5 3 Z'),'vellum',{k:1.4});pkFill(g,pkCirc(16,7.6,2.2),'teal',{ball:1,k:.3,lw:.8});pkFill(g,pkS('M13.4 11 L18.2 11 L18.2 18.4 L19.8 18.4 L19.8 21 L12.6 21 L12.6 18.4 L14.2 18.4 L14.2 13.4 L13.4 13.4 Z'),'teal',{k:.4,lw:.8})};
P.laurel=g=>{paLaurel(g,16,14.5,12.5,{n:5,top:38});pkFill(g,pkS('M12.5 25 L19.5 25 L21.5 30 L16 28 L10.5 30 Z'),'cloth',{k:.4,lw:PK.lw*.85});pkFill(g,pkCirc(16,25,2.6),'gold',{ball:1,k:.4})};
/* ---- own-drawn panel glyphs (52-panels PNOWN) and battle view buttons (70-render VICON): painted twins pa-<name> ---- */
P['pa-chev']=g=>pkFill(g,pkS('M10 4 L23 16 L10 28 L10 21 L15.5 16 L10 11 Z'),'gold',{k:.8});
P['pa-tailor']=g=>{pkFill(g,pkRect(5,6,15,3.4,1.2),'wood',{k:.5});pkFill(g,pkRect(5,23,15,3.4,1.2),'wood',{k:.5});
 pkFill(g,pkRect(7,9.2,11,14,0),'cloth',{k:1.1,inside:(g,m)=>{for(let y=10.6;y<23;y+=2.2)pkLine(g,`M7 ${y} L18 ${y+.8}`,.6,m[0],.6)}});
 pkFill(g,pkTube([12,26,27,3.5],1.8,'round'),'silver',{k:.3});const R=new Path2D();R.ellipse(25.6,6,1,2.2,Math.atan2(15,22.5)-Math.PI/2+Math.PI,0,Math.PI*2);g.fillStyle=PK.ink;g.fill(R);pkLine(g,'M18 15 Q26 18 25.5 6',.9,PKM.cloth[2])};
P['pa-dice']=g=>{pkFill(g,pkRect(3.5,3.5,25,25,5),'white',{k:1.6,inside:(g,m)=>{for(const [x,y] of [[9.5,9.5],[22.5,9.5],[16,16],[9.5,22.5],[22.5,22.5]])pkFill(g,pkCirc(x,y,2.4),'blood',{lw:0,ball:1,noRim:1})}})};
P['pa-rotl']=g=>{pkFill(g,pkTube(pkArc(16,17,9.5,-90,150,20),4,'flat'),'silver',{k:.6});pkFill(g,pkS('M7.4 5.6 L7.4 15.4 L1.4 10.5 Z'),'silver',{k:.4})};
P['pa-rotr']=g=>{g.translate(32,0);g.scale(-1,1);P['pa-rotl'](g)};
P['pa-heights']=g=>{pkFill(g,pkRect(3,18,10,10,.6),'stone',{k:.8});pkFill(g,pkRect(11,12,10,16,.6),'stone',{k:.8});pkFill(g,pkRect(19,5,10,23,.6),'stone',{k:1});pkFill(g,pkRect(2,27,28,2.6,.6),'dark',{k:.3})};
P['pa-bars']=g=>{pkFill(g,pkRect(2,2.5,28,5,1),'dark',{k:.3,inside:()=>{pkFill(g,pkRect(2,2.5,19,5,1),'blood',{k:.4,lw:0});pkFill(g,pkRect(21,2.5,9,5,0),'stone',{k:.3,lw:0})}});pkFill(g,pkRect(2,9,28,3,1),'dark',{k:.3,inside:()=>pkFill(g,pkRect(2,9,14,3,1),'silver',{lw:0,k:.3})});
 pkFill(g,pkS('M8 30 C8 24 11.5 22 16 22 C20.5 22 24 24 24 30 Z'),'blue',{k:.8});pkFill(g,pkCirc(16,18.2,4),'skin',{ball:1,k:.5})};
P['pa-objvip']=g=>{pkShield(g,16,15,{kind:'heater',w:26,h:28,mat:'gold',rim:'brass',rimW:1.8,emblem:g=>pkStar(g,0,-1.4,6,'white',5,2.6)})};
P['pa-objlead']=g=>paCrown(g,'blood','gold',{y0:6,y1:26});
})();
