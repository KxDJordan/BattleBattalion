/* ================= WORLD ART, DETAIL HIGH: who walks the map (the company, bands of every faction, caravans, patrols, raiders, rivals) =================
   Small chibi figures in the battle figures' manner (73k-humans.js: big head, thick ink outline, flat colour and one soft shade), about
   11 art px tall, facing right (mirrored for dir -1), in a loose file under their standard. Each faction keeps the cues of the Low art:
   colours, weapons, the flag it carries; the company and rivals carry their own banners (46-banner.js colours and emblem), house
   patrols ride under the house banner, caravans roll with the owner's pennant and the guard detail cvFigKey describes, raiders carry
   torches (on the lit layer, so they burn bright at night). whBandSprite(kind, o, K) -> a sprite entry (see 41i-worldhd-sites.js). */
const WHRC=new Map();
function whRampOf(h){let r=WHRC.get(h);if(r)return r;const c=whRGB(h),m=(t,k)=>'#'+c.map(v=>Math.round(v+(t-v)*k)).map(v=>(256+clamp(v,0,255)).toString(16).slice(1)).join('');r=[m(0,.62),m(0,.32),h,m(255,.22),m(255,.6)];WHRC.set(h,r);return r}
function whSh(g,S,h,o){o=o||{};whFill(g,S,whRampOf(h),{k:o.k||.3,lw:o.lw==null?.42:o.lw,noRim:o.noRim})}
// faction looks: skin, body (tunic / armour), legs, head kind, hat colour, weapon, shield colour, scale, flag colours
const WHFL={
 gob:{skin:'#9fc25a',body:'#7a5030',legs:'#4c2b17',head:'gob',wpn:'spear',s:.85,flag:['#7cc44c','#3f8a3a','#ffd84a']},
 undead:{skin:'#e4e0cf',body:'#4a4a52',legs:'#2e2e34',head:'skull',wpn:'sword',sh:'#6d737a',flag:['#c9bd98','#6d737a','#14141a'],eye:'#1a1a1a'},
 dead:{skin:'#e4e0cf',body:'#3a3f36',legs:'#262a24',head:'skull',wpn:'sword',flag:['#4a2c80','#1c0c34','#8af0b8'],eye:'#8af0b8'},
 orc:{skin:'#7c9b62',body:'#7e2a22',legs:'#3c2614',head:'orc',wpn:'axe',s:1.12,flag:['#c4493f','#7e2a22','#e8e0c8']},
 horde:{skin:'#7c9b62',body:'#3a3a32',legs:'#22130a',head:'orc',wpn:'axe',s:1.12,flag:['#2f5c2a','#14281a','#c9bd98']},
 bandit:{skin:'#d9b99a',body:'#6a5a48',legs:'#3a3026',head:'hood',hat:'#4a4a56',wpn:'bow',flag:['#5a5a66','#2a2a32','#e8c060']},
 barb:{skin:'#e0b48e',body:'#8a5a3a',legs:'#4c2b17',head:'horns',hat:'#939fa9',wpn:'axe',sh:'#3a6cb4',flag:['#3a6cb4','#1c3c84','#e8eef2']},
 void:{skin:'#b99be6',body:'#4a2c80',head:'wraith',wpn:null,hover:1,flag:['#8656d0','#1a0a34','#e8d8ff'],eye:'#efe2ff'},
 east:{skin:'#f0c8a0',body:'#a8322a',legs:'#2a2228',head:'jingasa',hat:'#26262c',wpn:'spear',flag:['#e8e4da','#c4493f','#26262c']},
 co:{skin:'#f0c8a0',body:'#3f74c0',legs:'#4c3a2a',head:'helm',hat:'#a8b4be',wpn:'spear',flag:['#e8c060','#a26800','#fff6dc']}};
// one figure, feet at (x, by), facing right. sp: the look; tab: tabard colours [field, trim] (company, rivals, guards)
function whFig(g,x,by,sp,step,bob,o){o=o||{};const s=sp.s||1;g.save();g.translate(x,by);g.scale(s,s);whShadowE(g,.2,0,2.6,.85,.28);g.translate(0,-bob/s);
 const wp=o.wpn!==undefined?o.wpn:sp.wpn,body=o.body||sp.body,skin=sp.skin;
 if(sp.head==='wraith'){const P=new Path2D();P.moveTo(-2.4,-7);P.quadraticCurveTo(-2.8,-2,-1.6,-.4);P.lineTo(-.6,-1.4);P.lineTo(.4,-.2);P.lineTo(1.4,-1.4);P.lineTo(2.4,-.6);P.quadraticCurveTo(3,-4,2.4,-7);P.closePath();
  whFill(g,{p:P,b:[-2.8,-7,3,0]},whRampOf(body),{k:.3,lw:.42});whFill(g,whBlob([[.2,-8.4,2.7,2.6]]),whRampOf(body),{k:.3,lw:.42});g.fillStyle='#120820';g.beginPath();g.ellipse(.9,-8.1,1.6,1.5,0,0,Math.PI*2);g.fill();
  whDot(g,.4,-8.2,.33,sp.eye);whDot(g,1.6,-8.2,.33,sp.eye);g.restore();return}
 // legs
 const la=step?.7:-.1,lb=step?-.5:.3;for(const [lx,dx] of [[-.9,lb],[.6,la]]){whSh(g,pkRect(lx+dx-.6,-2.8,1.3,2.9,.5),o.legs||sp.legs||'#4c3a2a',{k:.2})}
 // back arm, body, head
 if(wp==='bow'||wp==='shield')whDot(g,-1.9,-4.2,.7,skin);
 whSh(g,pkRect(-2.1,-6.6,4.2,4.3,1.3),body,{k:.35});
 if(o.tab){g.save();g.beginPath();g.rect(-1.2,-6.4,2.4,4.2);g.clip();g.fillStyle=o.tab[0];g.fillRect(-1.2,-6.6,2.4,4.6);g.fillStyle=o.tab[1];g.fillRect(-.25,-6.6,.5,4.6);g.restore();whLine(g,[-1.2,-6.3,-1.2,-2.3],.25,WHINK,.6);whLine(g,[1.2,-6.3,1.2,-2.3],.25,WHINK,.6)}
 whLine(g,[-2,-3.2,2,-3.2],.35,'#2a1a0e',.8);
 const hx=.35,hy=-8.7,hr=2.45,hd=sp.head;
 if(hd==='skull'){whSh(g,whBlob([[hx,hy,hr*.95,hr*.9]]),skin,{k:.3});whDot(g,hx+.7,hy-.1,.55,'#14141a');whDot(g,hx+1.9,hy-.1,.45,'#14141a');whDot(g,hx+.7,hy-.1,.22,sp.eye||'#14141a');whLine(g,[hx+.6,hy+1.3,hx+1.8,hy+1.3],.3,'#14141a')}
 else{whSh(g,whBlob([[hx,hy,hr,hr*.95]]),skin,{k:.3});
  if(hd==='gob'){whSh(g,whPolyS([hx-1.4,hy-1,hx-4.4,hy-2.4,hx-1.8,hy+.2]),skin,{k:.2});whSh(g,whPolyS([hx+1.6,hy-1.4,hx+3.2,hy-3.6,hx+2.2,hy-.4]),skin,{k:.2})}
  whDot(g,hx+1.1,hy+.1,.33,'#14141a');whDot(g,hx+2,hy+.1,.3,'#14141a');
  if(hd==='orc'){whLine(g,[hx+1.2,hy+1.4,hx+1.3,hy+.8],.45,'#f4eedc');whLine(g,[hx+2,hy+1.3,hx+2.1,hy+.7],.45,'#f4eedc');whSh(g,whBlob([[hx-.6,hy-2.2,1.3,.8]]),'#2a2018',{k:.2})}
  else if(hd==='helm'||hd==='horns'||hd==='plume'){const c=o.hat||sp.hat||'#a8b4be';const P=new Path2D();P.moveTo(hx-hr-.2,hy+.3);P.arc(hx,hy+.3,hr+.2,Math.PI,0);P.lineTo(hx+hr+.2,hy+.3);P.closePath();whFill(g,{p:P,b:[hx-hr,hy-hr,hx+hr,hy+.3]},whRampOf(c),{k:.25,lw:.42});
   whLine(g,[hx-hr,hy+.2,hx+hr,hy+.2],.5,whRampOf(c)[1]);whLine(g,[hx+1.4,hy,hx+1.4,hy+1.5],.5,whRampOf(c)[1]);
   if(hd==='horns'){for(const d of [-1,1]){const P2=[hx+d*1.8,hy-1.6,hx+d*3,hy-3.6,hx+d*2.6,hy-4.4];whLine(g,P2,1.1,WHINK);whLine(g,P2,.55,'#f4eedc')}}
   if(hd==='plume'||o.plume){const pc=o.plume||'#c4493f';whFill(g,whBlob([[hx-.6,hy-hr-.6,1.6,.9],[hx-1.8,hy-hr,1,.8]]),whRampOf(pc),{k:.2,lw:.4,noRim:1})}}
  else if(hd==='hood'){const c=sp.hat||'#4a4a56',P=new Path2D();P.moveTo(hx+2,hy+2.2);P.quadraticCurveTo(hx-3.2,hy+3,hx-2.8,hy-.4);P.quadraticCurveTo(hx-2,hy-3.4,hx+.6,hy-2.8);P.quadraticCurveTo(hx+2.8,hy-2.2,hx+2.4,hy-.6);P.quadraticCurveTo(hx+.6,hy-1.2,hx+.4,hy+.6);P.closePath();whFill(g,{p:P,b:[hx-3,hy-3,hx+3,hy+3]},whRampOf(c),{k:.25,lw:.42})}
  else if(hd==='jingasa'){const c=sp.hat||'#26262c';whFill(g,whPolyS([hx-3.6,hy-.4,hx,hy-3.2,hx+3.6,hy-.4,hx+3.2,hy+.1,hx-3.2,hy+.1]),whRampOf(c),{k:.2,lw:.42});whDot(g,hx,hy-1.5,.45,'#c4493f')}
  else whSh(g,whBlob([[hx-.5,hy-1.3,hr*.85,1.3]]),o.hair||'#6b4a2b',{k:.2})}
 // front arm and the weapon
 const ax=2,ay=-4.2;
 if(wp==='spear'){const P=[ax+.3,ay+3.4,ax+1,ay-8.6];whLine(g,P,.95,WHINK);whLine(g,P,.45,'#8c5e34');whFill(g,whPolyS([ax+.6,ay-8.4,ax+1.1,ay-10.6,ax+1.6,ay-8.3]),PKM.steel,{k:.15,lw:.35,noRim:1})}
 else if(wp==='sword'){const P=[ax+.2,ay-.2,ax+2.4,ay-4.4];whLine(g,P,1.1,WHINK);whLine(g,P,.55,'#dfe6ec');whLine(g,[ax-.4,ay-.6,ax+.9,ay+.4],.8,WHINK);whLine(g,[ax-.4,ay-.6,ax+.9,ay+.4],.4,'#cfa443')}
 else if(wp==='axe'||wp==='club'){const P=[ax+.1,ay+2.4,ax+.7,ay-4.6];whLine(g,P,wp==='club'?1.7:1,WHINK);whLine(g,P,wp==='club'?1.1:.5,'#8c5e34');if(wp==='axe')whFill(g,whPolyS([ax+.5,ay-4.4,ax+2.6,ay-5.6,ax+2.8,ay-2.8,ax+.6,ay-3.2]),PKM.steel,{k:.2,lw:.38,noRim:1});else whSh(g,whBlob([[ax+.8,ay-4.8,1.3,1.6]]),'#8c5e34',{k:.25})}
 else if(wp==='bow'){g.strokeStyle=WHINK;g.lineWidth=.9;g.beginPath();g.arc(ax-.6,ay-.4,3.6,-1.15,1.15);g.stroke();g.strokeStyle='#8c5e34';g.lineWidth=.45;g.stroke();whLine(g,[ax+.85,ay-3.7,ax+.85,ay+2.9],.18,'#e8e0c8')}
 else if(wp==='torch'){whLine(g,[ax+.2,ay+1.4,ax+.8,ay-4],1,WHINK);whLine(g,[ax+.2,ay+1.4,ax+.8,ay-4],.5,'#6a4024');if(o.L){pkFlame(o.L,ax+.9,ay-3.8,2.6,'fire');whGlowAt(o.L,ax+.9,ay-5,4,'rgba(255,150,60,.9)',.45)}}
 else if(wp==='staff'){whLine(g,[ax+.2,ay+3,ax+.7,ay-6],.95,WHINK);whLine(g,[ax+.2,ay+3,ax+.7,ay-6],.45,'#8c5e34')}
 whDot(g,ax,ay,.75,WHINK);whDot(g,ax,ay,.5,skin);
 if(wp==='shield'||o.shield){const c=o.shield||sp.sh||'#c4493f';whSh(g,whEllS(ax+.7,ay+.4,1.7,2.1),c,{k:.25});whDot(g,ax+.9,ay+.3,.45,'#cfa443')}
 g.restore()}
/* quadrupeds and monsters (feet at (x, by), facing right) */
function whWolf(g,x,by,step,bob,big,col){const s=big?1.5:1;g.save();g.translate(x,by);g.scale(s,s);whShadowE(g,0,0,4,.9,.28);g.translate(0,-bob);const c=col||'#7a7f86';
 for(const [lx,d] of [[-2.6,step?.5:-.3],[-1.6,step?-.4:.3],[1.6,step?.4:-.3],[2.6,step?-.5:.3]])whLine(g,[lx,-2.4,lx+d,0],.95,WHINK),whLine(g,[lx,-2.4,lx+d,-.1],.5,whRampOf(c)[1]);
 if(!big)whLine(g,[-3.4,-3.4,-5,-4.6+(step?.4:0)],1,WHINK),whLine(g,[-3.4,-3.4,-5,-4.6+(step?.4:0)],.5,c);
 whSh(g,whBlob([[0,-3.4,3.8,1.9]]),c,{k:.3});whSh(g,whBlob([[3.6,-4.6,1.7,1.5],[5,-4.1,1,.75]]),c,{k:.25});
 if(!big){whSh(g,whPolyS([2.8,-5.6,3.2,-7,3.9,-5.8]),c,{k:.1})}else whDot(g,2.8,-5.8,.6,c);whDot(g,4.1,-4.9,.28,'#ffd84a');whDot(g,5.8,-4.2,.3,WHINK);g.restore()}
function whSnake(g,x,by,h,col,bob){g.save();g.translate(x,by-bob*.3);whShadowE(g,0,0,3.2,.8,.25);const P=[-3.2,0,-1,-.4,0,-1.6,-.8,-3,.4,-h];whLine(g,P,1.9,WHINK);whLine(g,P,1.15,col);whSh(g,whBlob([[.9,-h-.2,1.3,.9]]),col,{k:.2});whDot(g,1.4,-h-.5,.25,'#ffd84a');whLine(g,[2.1,-h,2.9,-h+.3],.2,'#c4493f');g.restore()}
function whEnt(g,x,by,step,bob,big){const s=big?1.3:1;g.save();g.translate(x,by);g.scale(s,s);whShadowE(g,0,0,3.4,.9,.28);g.translate(0,-bob);
 for(const [lx,d] of [[-1,step?.6:-.2],[1,step?-.5:.3]])whLine(g,[lx,-3,lx+d,0],1.3,WHINK),whLine(g,[lx,-3,lx+d,-.1],.8,'#5e3e22');
 whSh(g,pkRect(-1.5,-8,3,5.4,.8),'#6a4628',{k:.25});whLine(g,[1.4,-6.4,3.4,-8.4],.9,WHINK);whLine(g,[1.4,-6.4,3.4,-8.4],.45,'#6a4628');
 whFill(g,whBlob([[0,-10.6,3.8,3],[-2.4,-9.6,2.2,1.8],[2.4,-9.4,2.2,1.8]]),WHR.leaf,{k:.35,lw:.45});whDot(g,.6,-6.6,.3,'#ffd84a');whDot(g,1.4,-6.6,.3,'#ffd84a');g.restore()}
function whOgre(g,x,by,step,bob,armour){whFig(g,x,by,{skin:armour?'#c9b48c':'#b59a72',body:armour?'#6d737a':'#7a5a36',legs:'#4c2b17',head:armour?'helm':'none',hat:'#6d737a',wpn:'club',s:1.45},step,bob,{hair:'#3a2a1a'})}
function whWyvern(g,x,by,f,big){const fl=f&1,hv=(f>>1)&1,s=big?1.2:1;whShadowE(g,x,by,7*s,1.6*s,.25);g.save();g.translate(x,by-16-hv);g.scale(s,s);
 const wing=up=>whFill(g,whPolyS(up?[-1,-1,-6,-8,-3.4,-4.4,-8,-5,-2,1]:[-1,-1,-7,2,-3.4,1.6,-6,5,-1,1.4]),['#1a0a1a','#4a1c3a','#7a2a50','#a84a6a','#e8a0b0'],{k:.25,lw:.42});
 wing(!fl);whFill(g,whBlob([[0,0,4.4,1.8],[4.6,-1.6,1.8,1.3]]),['#0b1a40','#24508f','#3f74c0','#6ea4e4','#d4ecff'],{k:.3,lw:.42});whLine(g,[-4,0,-8,1.6,-9.6,.6],1.1,WHINK);whLine(g,[-4,0,-8,1.6,-9.6,.6],.55,'#3f74c0');
 whLine(g,[4.4,-2.6,5.4,-4],.5,'#e8eef2');whDot(g,5.4,-1.8,.3,'#ffd84a');g.save();g.translate(1,0);wing(fl);g.restore();g.restore()}
/* a horse and its rider (house patrols): the caparison in the house colours */
function whKnight(g,x,by,step,bob,bn,lead,f){const A=whBnA(bn),C=whBnC(bn);g.save();g.translate(x,by);whShadowE(g,0,0,5,1.1,.3);g.translate(0,-bob);
 for(const [lx,d] of [[-3,step?.6:-.3],[-2,step?-.5:.3],[2.4,step?.5:-.3],[3.4,step?-.6:.3]])whLine(g,[lx,-3,lx+d,0],1,WHINK),whLine(g,[lx,-3,lx+d,-.1],.55,'#5c3a1f');
 whLine(g,[-4.2,-4.4,-5.4,-2],1,WHINK);whLine(g,[-4.2,-4.4,-5.4,-2],.55,'#3a2414');
 whSh(g,whBlob([[0,-4.6,4.6,1.9]]),'#8c5e34',{k:.3});whSh(g,whPolyS([3.2,-5.4,5.4,-8.6,6.8,-8,6.6,-7,4.6,-4.4]),'#8c5e34',{k:.2});
 // caparison
 whFill(g,whPolyS([-4.2,-6,3.6,-6,4.2,-3.2,2.8,-2.4,-2.8,-2.4,-4.4,-3.2]),whRampOf(A[1]),{k:.25,lw:.42});whLine(g,[-4.2,-3,4.1,-3],.35,C[1]);
 g.restore();whFig(g,x-.2,by-4.4-bob,{skin:'#f0c8a0',body:A[1],legs:A[0],head:lead?'plume':'helm',hat:'#a8b4be',wpn:null},0,0,{plume:C[1],tab:[A[1],C[1]]});
 g.save();g.translate(x,by-bob);const lx=1.8,ly=-8.6;if(lead){whPole(g,lx,ly-12,ly+3.2);whBanner(g,lx-3.2,ly-11.4,bn,f,.85)}else{whLine(g,[lx-1,ly+3,lx+2.4,ly-9],.9,WHINK);whLine(g,[lx-1,ly+3,lx+2.4,ly-9],.45,'#bfa070');whPennant(g,lx+2.3,ly-8.8,[A[1],A[0],C[1]],f,3,1.8,-1)}g.restore()}
function whBnA(bn){return bn&&bn.A?bn.A.map(k=>PAL[k]||'#c4493f'):['#7e2a22','#c4493f','#e2715f']}
function whBnC(bn){return bn&&bn.C?bn.C.map(k=>PAL[k]||'#e8e0c8'):['#8a7f62','#e8e0c8','#ffffff']}
/* the caravan: covered wagon, ox, drover, the owner's pennant, the guard detail */
function whCaravan(g,L,k,f,mv,bn,gd){const A=whBnA(bn),C=whBnC(bn),wx=-7;
 whShadowE(g,wx+.5,0,9,1.4,.3);
 // the wagon
 const wh=(x,a)=>{whDot(g,x,-1.7,1.9,WHINK);whDot(g,x,-1.7,1.45,'#8c5e34');whDot(g,x,-1.7,.55,'#3a2414');for(let i=0;i<3;i++){const t=a+i*Math.PI/3;whLine(g,[x-Math.cos(t)*1.3,-1.7-Math.sin(t)*1.3,x+Math.cos(t)*1.3,-1.7+Math.sin(t)*1.3],.25,'#3a2414')}};
 whSh(g,pkRect(wx-6,-5.4,12,2.8,.3),'#8c5e34',{k:.25});
 whFill(g,{p:(()=>{const p=new Path2D();p.moveTo(wx-6,-5.2);p.bezierCurveTo(wx-6,-10.6,wx+6,-10.6,wx+6,-5.2);p.closePath();return p})(),b:[wx-6,-10,wx+6,-5]},PKM.canvas,{k:.45,lw:.45,inside:(g,m)=>{for(let i=-4;i<=4;i+=2.6)whLine(g,[wx+i,-9.2,wx+i*1.05,-5.4],.3,m[1],.7)}});
 const a=mv?(f&3)*Math.PI/6:0;wh(wx-3.6,a);wh(wx+3.6,a+.5);whLine(g,[wx+6,-3.6,wx+9.6,-3.6],.8,WHINK);
 if(bn){whPole(g,wx-6.4,-15,-5);whPennant(g,wx-6.4,-14.8,[A[1],A[0],C[1]],f,4,2.6,-1)}
 // the ox and the drover
 g.save();g.translate(wx+14,0);const st=mv?f&1:0;whShadowE(g,0,0,3.6,.9,.28);for(const [lx,d] of [[-2.4,st?.4:-.3],[-1.4,st?-.4:.3],[1.6,st?.4:-.3],[2.6,st?-.4:.3]])whLine(g,[lx,-2.6,lx+d,0],1.05,WHINK),whLine(g,[lx,-2.6,lx+d,-.1],.6,'#5c3a1f');
 whSh(g,whBlob([[0,-3.8,3.8,2]]),'#8a6248',{k:.3});whSh(g,whBlob([[3.8,-4.4,1.6,1.4]]),'#8a6248',{k:.2});whLine(g,[3.2,-5.6,3,-6.8,2.2,-7],.7,WHINK);whLine(g,[3.2,-5.6,3,-6.8,2.2,-7],.3,'#f4eedc');whDot(g,4.6,-4.6,.25,WHINK);g.restore();
 whFig(g,wx+2.4,-5.2,{skin:'#f0c8a0',body:'#8a6a3a',legs:'#4c3a2a',head:'none',wpn:null,s:.8},0,0,{hair:'#6b4a2b'});
 // the guards
 const gs=typeof gd==='string'&&gd[0]==='g'?gd:'',t=gs?+gs[1]||1:k>=2?1:0,n=gs?+gs[2]||0:Math.max(0,k-1),cap=gs?+gs[3]||0:0;
 const spots=[[wx-11,1],[wx+22,1],[wx+8,2.2]],wps=t<=2?['spear','bow','spear']:['shield','bow','sword'];
 for(let i=0;i<Math.min(3,n);i++){const isCap=cap&&i===2,look=t<=1?{skin:'#e8c0a0',body:'#7a5030',legs:'#4c3a2a',head:'none',wpn:wps[i]}:t===2?{skin:'#e8c0a0',body:'#5c4a36',legs:'#3a3026',head:'helm',hat:'#7d8892',wpn:wps[i]}:{skin:'#e8c0a0',body:A[1],legs:A[0],head:isCap?'plume':'helm',hat:'#a8b4be',wpn:isCap?'sword':wps[i]};
  whFig(g,spots[i][0],spots[i][1],look,mv?(f+i)&1:0,mv&&((f+i)&3)===1?.5:0,{tab:t>=3?[A[1],C[1]]:null,plume:C[1],shield:wps[i]==='shield'&&!isCap?A[1]:null})}}
/* a file of figures under a standard */
function whFile(g,L,n,gap,look,f,mv,o){o=o||{};const L0=[],x1=((n-1)*gap)/2;for(let i=0;i<n;i++)L0.push({i,x:x1-i*gap,y:(i&1?-1.6:0)+(n===1?0:.8)-(i===3?.8:0)});
 const bi=o.bearer==null?(n>=2?1:0):o.bearer;
 for(const e of L0.slice().sort((a,b)=>a.y-b.y)){const i=e.i,st=mv?(f+i)&1:0,bob=look.hover?((f+i*2)>>1&1)*.6:mv&&((f+i)&3)===1?.5:0,lk=o.lookOf?o.lookOf(i):look;
  if(i===bi&&o.flag!==false){const px=e.x-1.8,ph=o.ph||14;whPole(g,px,e.y-bob-ph,e.y-bob-1);if(o.bn)whBanner(g,px-3.3,e.y-bob-ph+.6,o.bn,f>>1,o.bs||.9);else whPennant(g,px,e.y-bob-ph+.3,o.fc||look.flag,f>>1,5,3.4,-1)}
  const ex=o.extra?o.extra(i):{};whFig(g,e.x,e.y,lk,st,bob,Object.assign({L,wpn:i===bi&&n>1&&o.flag!==false?null:o.wpnOf?o.wpnOf(i):undefined},ex))}}
function whBandSprite(kind,o,K){const f=o.frame|0,mv=!!o.moving&&!(typeof reduced!=='undefined'&&reduced),dir=o.dir<0?-1:1,k=clamp(Math.round(+o.str||1),1,3);
 return whMakeL(64,58,32,46,K,o.goal==='raid',(g,L)=>{if(dir<0){g.scale(-1,1);L.scale(-1,1)}
  if(kind==='co'){const n=Math.max(1,o.n|0),kk=n<=3?1:n<=6?2:n<=9?3:4,bn=typeof waBannerOf==='function'?waBannerOf():null,A=whBnA(bn),C=whBnC(bn),wps=['spear','sword','bow','shield'];
   whFile(g,L,kk+1,6.4,WHFL.co,f,mv,{bn,ph:18+kk,bs:1.05,lookOf:i=>Object.assign({},WHFL.co,{body:i===2?C[1]:A[1],legs:A[0]}),wpnOf:i=>wps[i%4],extra:i=>({tab:[A[1],C[1]],shield:i%4===3?A[1]:null,plume:i===0?C[1]:null,hat:'#b6c0ca'})});return}
  const gl=o.goal;
  if(gl==='caravan'){g.translate(-2,0);L.translate(-2,0);whCaravan(g,L,k,f,mv,typeof waBnOf==='function'?waBnOf(o.house):null,typeof o.guard==='string'?o.guard:'');return}
  if(gl==='patrol'){const bn=typeof waBnOf==='function'?waBnOf(o.house):null,P=k>=3?[[7,-1.4],[-8,0],[0,2]]:k===2?[[5,-1],[-7,1]]:[[0,0]];
   P.map((p,i)=>[p,i]).sort((a,b)=>a[0][1]-b[0][1]).forEach(([p,i])=>whKnight(g,p[0],p[1],mv?(f+i)&1:0,mv&&((f+i)&3)===1?.5:0,bn,i===0,f>>1));return}
  if(gl==='merc'){const bn=typeof waBnOf==='function'?waBnOf(o.house):null,A=whBnA(bn),C=whBnC(bn),kk=clamp(k+(o.n>8?1:0),1,4),wps=['sword','spear','bow','shield','axe'];
   whFile(g,L,kk+1,6.4,WHFL.co,f,mv,{bn,ph:20,lookOf:i=>Object.assign({},WHFL.co,{body:i===2?C[1]:A[1],legs:A[0],head:i===0&&kk>=3?'plume':'helm'}),wpnOf:i=>wps[i%5],extra:i=>({tab:[A[1],C[1]],shield:i%5===3?A[1]:null,plume:C[1],hat:'#8d99a6'})});return}
  const fk=WHFL[o.f]?o.f:o.f;
  if(gl==='raid'){const look=WHFL[fk]&&WHFL[fk].head!=='wraith'?WHFL[fk]:WHFL.bandit;whFile(g,L,clamp(k+1,2,4),7,look,f,mv,{wpnOf:i=>i===1?look.wpn||'sword':'torch'});return}
  if(fk==='beast'){const P=k>=3?[[1,-1,1],[-9,1,0],[9,-2.4,0]]:k===2?[[-4,-1,0],[4,1,0]]:[[0,0,0]];P.slice().sort((a,b)=>a[1]-b[1]).forEach((p,i)=>whWolf(g,p[0],p[1],mv?(f+i)&1:0,mv&&((f+i)&3)===1?.5:0,!!p[2],p[2]?'#6b4a2e':'#7a7f86'));return}
  if(fk==='serpent'){const P=k>=3?[[1,-1,11,'#7a8a3a'],[-8,1,6,'#5d7a3a'],[9,1.5,6,'#a7b85a']]:k===2?[[-5,0,7,'#5d7a3a'],[4,1.5,7,'#a7b85a']]:[[0,0,7,'#a7b85a']];P.forEach((p,i)=>whSnake(g,p[0]+(mv&&(f+i)&1?.5:0),p[1],p[2],p[3],0));return}
  if(fk==='ent'){const P=k>=3?[[1,0,1],[-9,1,0],[9,1.6,0]]:k===2?[[-4,0,1],[6,1.6,0]]:[[0,0,1]];P.forEach((p,i)=>whEnt(g,p[0],p[1],mv?(f+i)&1:0,0,!!p[2]));return}
  if(fk==='ogre'){const P=k>=3?[[2,0,1],[-8,1,0]]:k===2?[[-4,0,0],[6,1.6,0]]:[[0,0,0]];P.forEach((p,i)=>whOgre(g,p[0],p[1],mv?(f+i)&1:0,mv&&((f+i)&3)===1?.5:0,!!p[2]));if(k>=3)whFig(g,11,2,WHFL.gob,mv?f&1:0,0);return}
  if(fk==='wyvern'){whWyvern(g,0,0,f,true);if(k>=2)whWyvern(g,-10,3,f+1,false);if(k>=3)whWyvern(g,10,4,f+2,false);return}
  const look=WHFL[fk]||WHFL.bandit;whFile(g,L,clamp(k+1,2,4),look.s>1?7.5:6.6,look,f,mv,{})})}

/* ---- markers, the march's dots, name plates (drawn each frame at Detail High: a handful of vector shapes) ---- */
function whMark(g,x,y,kind,f,sc){whPU(g,sc,()=>{g.save();g.imageSmoothingEnabled=true;g.lineJoin='round';g.lineCap='round';
 if(kind==='contract'){const b=(f>>1)&1?-.8:0;whShadowE(g,x,y,2.4,.8,.3);const P=new Path2D();P.moveTo(x,y-.6+b);P.bezierCurveTo(x-2.2,y-4+b,x-3.8,y-6+b,x-3.8,y-8.2+b);P.arc(x,y-8.2+b,3.8,Math.PI,0);P.bezierCurveTo(x+3.8,y-6+b,x+2.2,y-4+b,x,y-.6+b);P.closePath();
  whFill(g,{p:P,b:[x-3.8,y-12+b,x+3.8,y+b]},PKM.cloth,{k:.45,lw:.55});whDot(g,x,y-8.2+b,2.3,'#f4ecd8');const c=y-8.2+b;whLine(g,[x-1.3,c-1.3,x+1.3,c+1.3],.55,'#2a2a32');whLine(g,[x+1.3,c-1.3,x-1.3,c+1.3],.55,'#2a2a32');whDot(g,x,c,.5,'#c4493f')}
 else if(kind==='turnin'){const b=(f>>1)&1?-.8:0;whShadowE(g,x,y,2.2,.7,.3);pkCoin(g,x,y-5+b,3,'gold');const a=(f&3)*Math.PI/2;g.save();g.translate(x+2.6,y-7.6+b);g.rotate(a/4);pkSparkle(g,0,0,1.4,'gold');g.restore()}
 else if(kind==='dest'||kind==='dest2'){whShadowE(g,x+.5,y,2.4,.8,.3);whPole(g,x,y-9,y);whPennant(g,x,y-8.8,['#4fb08a','#2c6a5d','#f4ecd8'],f,4.6,3,1)}
 else{whFill(g,whPolyS([x,y-3.4,x+1.6,y-1.6,x,y+.2,x-1.6,y-1.6]),PKM.gold,{k:.3,lw:.45})}
 g.restore()})}
function whDots(g,D,n,R,sc){g.save();g.imageSmoothingEnabled=true;g.fillStyle=WHINK;g.beginPath();for(let i=0;i<n;i+=2){g.moveTo(D[i]+1.2,D[i+1]);g.arc(D[i],D[i+1],1.2,0,Math.PI*2)}g.fill();g.fillStyle='#f4ecd8';g.beginPath();for(let i=0;i<n;i+=2){g.moveTo(D[i]+.7,D[i+1]);g.arc(D[i],D[i+1],.7,0,Math.PI*2)}g.fill();
 if(R&&R.length>1){g.fillStyle='#e8c060';g.globalAlpha=.85;g.beginPath();for(let i=1;i<R.length;i++){const ax=R[i-1].x/WVU,ay=R[i-1].y/WVU,dx=R[i].x/WVU-ax,dy=R[i].y/WVU-ay,L=Math.hypot(dx,dy);for(let d=5;d<L;d+=9){const px=ax+dx*d/L,py=ay+dy*d/L;g.moveTo(px+.55,py);g.arc(px,py,.55,0,Math.PI*2)}}g.fill()}g.restore();void sc}
const WHPL=new Map();
function whPlate(txt,col,bg,dpr){const fok=typeof document==='object'&&document.fonts&&document.fonts.check?document.fonts.check('13px "Jersey 15"'):true,id=txt+'|'+col+bg+dpr+(fok?1:0);let c=WHPL.get(id);if(c)return c;if(WHPL.size>80)WHPL.clear();
 const fs=Math.round(13*dpr),pad=Math.round(6*dpr),h=Math.round(17*dpr),b=Math.max(1,Math.round(1.5*dpr));const m=pxCanvas(4,4).getContext('2d');m.font=fs+'px "Jersey 15","Alegreya Sans",sans-serif';const w=Math.ceil(m.measureText(txt).width)+pad*2;
 c=pxCanvas(w,h+Math.round(2*dpr));const q=c.getContext('2d');q.fillStyle='rgba(11,21,20,.55)';rrect(q,Math.round(2*dpr),Math.round(2*dpr),w-Math.round(2*dpr),h,Math.round(3*dpr));q.fill();
 q.fillStyle=bg==='0'?'#0b1514':'#101d1c';rrect(q,0,0,w-Math.round(2*dpr),h,Math.round(3*dpr));q.fill();q.strokeStyle=bg==='0'?'#26332f':'#35554f';q.lineWidth=b;rrect(q,b/2,b/2,w-Math.round(2*dpr)-b,h-b,Math.round(3*dpr));q.stroke();
 q.font=fs+'px "Jersey 15","Alegreya Sans",sans-serif';q.textBaseline='middle';q.textAlign='center';q.fillStyle=col==='d'?'#f2d98a':col==='n'?'#8d99a6':'#e9e0c9';q.fillText(txt,(w-Math.round(2*dpr))/2,h/2+dpr*.5);WHPL.set(id,c);return c}
