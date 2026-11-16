/* ================= ICONS for the colosseum: gladiator gear, the Gladiator and Arena champion trees, the arena (rules: 64g / 29 / 11) =================
   Painted (06p kit, docs/icons-paint-guide.md): every gladiator item (it-*: specs in PKC_IT where a family fits, own painters for the
   trident, cestus, manica and the three crested helmets), the medallions m-gladiator m-champion, the abilities (ab-*), the passive perks
   and capstones (perk-*), the statuses (st-taunted st-netted st-crowd st-feint st-secondwind), the Showman trait and the colosseum itself.
   16 px pixel fallbacks: the items draw themselves from their battle sprites (73g-gladiators.js); abilities and statuses are compositions
   of drawn pixel icons with a corner glyph (IC_COMP); perks from what they improve (IC_PKMOD / IC_PKFLAG); 'colosseum' is drawn here.
   This file only adds entries; it loads after the other 06p packages, before anything resolves an icon. */
/* ---- 16 px pixel fallbacks ---- */
Object.assign(IC_COMP,{
 'ab-taunt':['ab-warcry',null,'eye','tr'],'ab-gtaunt':['ab-warcry',{r:'h',q:'g',p:'f'},'eye','tr'],'ab-netthrow':['webbed',null,'up','tr'],'ab-gnet':['webbed',{l:'h',m:'g'},'up','tr'],
 'ab-showstop':['sword',null,'star','tr'],'ab-crowdroar':['laurel',null,'up','br'],'ab-feint':['sword',null,'motion','bl'],'ab-iugula':['sword',{r:'h',q:'g',p:'f'},'skull','br'],
 taunted:['ab-warcry',null,'dn','br'],netted:['webbed',null,'x2','br'],crowd:['laurel',null,'up','br'],feint:['ab-feint'],secondwind:['undying',null,'up','tr']});
Object.assign(IC_PKMOD,{crowdKill:'laurel',pinDmg:'webbed',pinHit:'webbed',soloHit:'sword',soloDmg:'sword'});
Object.assign(IC_PKFLAG,{secondWind:'undying',showman:'laurel'});
if(typeof IC_MO==='object'&&IC_MO){if(IC_MO.duelist&&!IC_MO.gladiator)IC_MO.gladiator=IC_MO.duelist;if(IC_MO.shieldbearer&&!IC_MO.champion)IC_MO.champion=IC_MO.shieldbearer}
// the colosseum (map legend, the sheet's header): tiers of arches on an oval wall, a banner on top
if(typeof ICONS==='object'&&!ICONS.colosseum&&typeof _icOutline==='function'){ICONS.colosseum=_icOutline([
 '................','.......gf.......','.......g........','...ddddddddd....','..dcmcmcmcmcd...','.dcm0m0m0m0mcd..','.dcmcmcmcmcmcd..','.dcccccccccccd..',
 '.dcm0m0m0m0mcd..','.dcmcmcmcmcmcd..','.dbbbbbbbbbbbd..','.dbm0m0m0m0mbd..','.dbmbmbmbmbmbd..','..bbbbbbbbbbb...','...kkkkkkkkk....','................'].map(r=>r.slice(0,16)));
 if(typeof icCss==='function')icCss('colosseum')}
/* ---- painted ---- */
(function(){const P=PAINT;
// the net: a weighted mesh (cx, cy, r), drawn as a fillable web with lead weights at the rim
const glNet=(g,cx,cy,r,o)=>{o=o||{};const M=o.mat||'canvas',lw=PK.lw*.65,T=(pts,w)=>pkFill(g,pkTube(pts,w||1.1,'round'),M,{k:.25,lw});
 for(const a of [0,45,90,135]){const c=Math.cos(a*Math.PI/180)*r,s=Math.sin(a*Math.PI/180)*r;T([cx-c,cy-s,cx+c,cy+s])}
 T(pkArc(cx,cy,r*.55,0,360,24));T(pkArc(cx,cy,r,0,360,36),1.4);
 for(let i=0;i<6;i++){const a=(i*60+22)*Math.PI/180;pkFill(g,pkCirc(cx+Math.sin(a)*r,cy-Math.cos(a)*r,1.5),'iron',{ball:1,k:.3,lw:PK.lw*.7})}};
// a crested bowl helm, front three-quarter: mat, the brim, the crest (feathers / a griffin / a fish), the face (open, grille)
function glHelm(g,o){const M=o.mat||'bronze',C=o.crest||'cloth',lw8=PK.lw*.8;
 if(o.kind==='fish'){pkFill(g,pkS('M7 8.6 C9 2.4 16 .6 23 2.2 L26.6 .8 L25.6 4.6 L27.6 7 L23.6 6.4 C19 5.6 13 6.4 9.6 10 Z'),M,{k:.8,inside:(g,m)=>pkLine(g,'M12 6 L13.2 3.2 M15.6 5 L16.6 2.4 M19 4.6 L19.8 2.2',.7,m[1],.8)})}
 else if(o.kind==='griffin'){pkFill(g,pkS('M13.4 9 C12 4 16 .6 21 1.4 C24.4 2 26.4 4.4 25.6 7.6 L23 6 C22.4 8 20.2 8.6 18.4 8.2 Z'),M,{k:.7,inside:(g,m)=>pkLine(g,'M21.4 3.2 L23.6 4.6',.8,m[0],.8)});pkFill(g,pkS('M21.6 2 L25.4 .6 L24.2 3.6 Z'),M,{k:.3,lw:lw8})}
 else pkFill(g,pkS('M8.6 9.6 C8 3.6 12 .8 16.6 .8 C21.4 .8 25 3.8 24 9.6 C21.6 6.4 18.6 5.4 16.4 5.4 C13.6 5.4 10.8 6.6 8.6 9.6 Z'),C,{k:.9,inside:(g,m)=>{for(const x of [11,13.4,16,18.6,21])pkLine(g,`M${x} ${7.4-(x===16?1:0)} L${x+.4} ${2.6+(x===16?-.6:0)}`,.6,m[1],.7)}});
 pkFill(g,pkS('M7 18 C6.4 10 10.6 6 16 6 C21.4 6 25.6 10 25 18 Z'),M,{k:1.4,inside:(g,m)=>{pkHi(g,'M9.6 14 Q10 9.4 14.6 7.6',1.3,.55);pkLine(g,'M16 6.4 L16 17.6',.8,m[1],.7)}});
 if(o.brim)pkFill(g,pkS('M1.6 19.6 Q16 13.4 30.4 19.6 Q29.6 22.2 27 22 Q16 18.6 5 22 Q2.4 22.2 1.6 19.6 Z'),M,{k:.6,inside:(g,m)=>pkHi(g,'M4 19.4 Q10 17 15 16.6',.9,.5)});
 if(o.face==='grille'){pkFill(g,pkS('M8.6 18.6 L23.4 18.6 L22.8 28.6 Q16 31 9.2 28.6 Z'),M,{k:.8});pkFill(g,pkS('M10.6 20 L21.4 20 L21 27.4 Q16 29.2 11 27.4 Z'),'dark',{k:.3,lw:lw8,noRim:1});
  for(const x of [12.6,14.8,17.2,19.4])pkLine(g,`M${x} 20 L${x} 28`,.9,PKM[M][3]||'#c9a46a',.95);for(const y of [22.6,25.4])pkLine(g,`M10.8 ${y} L21.2 ${y}`,.9,PKM[M][3]||'#c9a46a',.95)}
 else if(o.face==='visor'){pkFill(g,pkS('M8.6 18 L23.4 18 L23 27 Q16 30.4 9 27 Z'),M,{k:.8,inside:(g,m)=>{pkLine(g,'M11 21.6 L14.6 21.6 M17.4 21.6 L21 21.6',1.3,PK.ink);pkHi(g,'M10 19.6 L13 19.6',.8,.5)}})}
 else{pkFill(g,pkS('M8.4 18 L11 18 L11.4 26 Q9.6 26.4 8.6 25 Z'),M,{k:.5});pkFill(g,pkS('M23.6 18 L21 18 L20.6 26 Q22.4 26.4 23.4 25 Z'),M,{k:.5});pkFill(g,pkS('M11 18 L21 18 L20.6 24 Q16 26 11.4 24 Z'),'skin',{k:.5,lw:lw8,noRim:1})}
 pkPost(g=>pkGlint(g,11,10,1.8))}
P['it-galea']=g=>glHelm(g,{mat:'bronze',crest:'cloth',brim:0,face:'open'});
P['it-thraexhelm']=g=>glHelm(g,{mat:'bronze',kind:'griffin',brim:1,face:'grille'});
P['it-murmhelm']=g=>glHelm(g,{mat:'steel',kind:'fish',brim:1,face:'grille'});
// the trident: a long haft and three barbed prongs, pointing to the upper right
const glTrident=(g,o)=>{o=o||{};const M=o.mat||'steel';pkHaft(g,4,28.5,20.6,11.8,2.8,o.hf||'darkwood');
 pkAt(g,22,10.4,45,1,g=>{pkFill(g,pkS('M-5.6 2 Q0 4.6 5.6 2 L5.2 4.2 Q0 6.6 -5.2 4.2 Z'),M,{k:.4});for(const x of [-4.6,0,4.6]){pkFill(g,pkTube([x*.5,2.2,x,-2,x,-9+(x?1.4:0)],1.7,'round'),M,{k:.3,lw:PK.lw*.8});pkFill(g,pkPoly([x-1.4,-8+(x?1.4:0),x,-12.4+(x?1.4:0),x+1.4,-8+(x?1.4:0)]),M,{k:.3,lw:PK.lw*.7})}
  if(o.barbs)for(const x of [-4.6,4.6])pkFill(g,pkPoly([x,-5,x+(x<0?-2:2),-3.6,x,-3]),M,{k:.2,lw:PK.lw*.6})});pkPost(g=>pkGlint(g,25,6,1.8))};
P['it-trident']=g=>glTrident(g,{});
P['it-fuscina']=g=>{glTrident(g,{barbs:1,mat:'silver'});pkFill(g,pkTube([18,14.2,19.6,12.6],3.4,'round'),'gold',{k:.3,lw:PK.lw*.7})};
// the cestus: a fist bound in leather thongs with a metal plate over the knuckles (spiked: studs)
const glCestus=(g,spk)=>{pbFist(g,15,17,.92,'skin');pkFill(g,pkS('M6 19 L26 15.6 L27 22 L7 25.6 Z'),'leather',{k:.6,inside:(g,m)=>{for(const x of [9,13,17,21])pkLine(g,`M${x} ${23.6-(x-9)*.18} L${x+1.2} ${17.2-(x-9)*.18}`,.8,m[0],.8)}});
 pkFill(g,pkS('M8.4 9.6 L24.6 8 L25.4 13.6 L9 15.2 Z'),spk?'steel':'iron',{k:.6,inside:(g,m)=>pkHi(g,'M10 10.6 L22 9.6',.8,.5)});
 if(spk)for(const x of [11,15,19,23])pkFill(g,pkPoly([x-1.3,10.2-(x-11)*.1,x,5.4-(x-11)*.1,x+1.3,10-(x-11)*.1]),'steel',{k:.2,lw:PK.lw*.6});pkPost(g=>pkGlint(g,12,10.6,1.6))};
P['it-cestus']=g=>glCestus(g,0);P['it-cestus2']=g=>glCestus(g,1);
// the manica: a segmented arm guard over a broad belt
const glManica=(g,mat,belt)=>{for(let i=0;i<6;i++){const y=3+i*3.6,w=7.6-i*.5;pkFill(g,pkS(`M${16-w} ${y} Q16 ${y-1.6} ${16+w} ${y} L${16+w-.4} ${y+3.6} Q16 ${y+2.2} ${16-w+.4} ${y+3.6} Z`),mat,{k:.5,lw:PK.lw*.85,inside:(g,m)=>pkHi(g,`M${16-w+1.4} ${y+.6} Q14 ${y-.4} 16 ${y-.4}`,.7,.5)})}
 pkFill(g,pkRect(4,25,24,5.4,1.6),belt||'leather',{k:.6,inside:(g,m)=>{pkLine(g,'M4.6 27.6 L27.4 27.6',.6,m[0],.6);for(const x of [9,16,23])pkFill(g,pkCirc(x,27.6,1.3),'brass',{ball:1,k:.3,lw:.5})}})};
P['it-manica']=g=>glManica(g,'bronze','leather');
/* the rest by family spec (06pc-specs.js) */
Object.assign(PKC_IT,{
 gladius:{f:'sw',len:15,w:5.8,grip:5,shape:'leaf',gd:'disc',guard:8,pom:'disc'},
 gladius2:{f:'sw',len:16,w:6,grip:5.2,shape:'leaf',gd:'disc',guard:8.6,pom:'disc',bl:'silver',fit:'gold',gr:'madder'},
 spatha:{f:'sw',len:21,w:4.8,grip:5.4,gd:'disc',guard:9,pom:'disc'},
 sica:{f:'sw',len:15,w:5,grip:5,shape:'curve',curve:2.4,gd:'bolster',guard:6.6,pom:'cap',fuller:false},
 parma:{f:'sh',kind:'round',w:23,h:23,mat:'cloth',rim:'brass',rimW:2.2,boss:4.4,bossMat:'brass',em:'rings'},
 scutum:{f:'sh',kind:'tower',w:22,h:28,mat:'cloth',rim:'brass',boss:4.6,bossMat:'brass',em:'cross',ec:'gold'},
 harness:{f:'ar',shape:'vest',mat:'leather',pat:'lam',paul:'bronze',belt:1,beltMat:'leather'},
 champharness:{f:'ar',shape:'cuirass',mat:'bronze',pat:'fluted',paul:'gold',paulTrim:'gold',faulds:1}});
for(const id of ['gladius','gladius2','spatha','sica','parma','scutum','harness','champharness'])P['it-'+id]=g=>pkcPaintItem(g,id);
/* medallions */
P['m-gladiator']=g=>paMedal(g,'brass','dark',g=>{pkAt(g,16,17,0,.9,g=>{g.translate(-16,-16);glHelm(g,{mat:'bronze',crest:'cloth',face:'open'})})},.72);
P['m-champion']=g=>paMedal(g,'gold','dark',g=>{paLaurel(g,16,17,11,{n:5,top:38,mat:'green',s:1.05});pkSword(g,16,22,0,{len:15,w:4.6,guard:8,grip:4.4})},.72);
/* abilities */
P['ab-taunt']=g=>{pbPalm(g,13,18,.86,'skin',{rot:-20});pbArcs(g,13,14,[9,13],30,95,1.8,'gold');pkPost(g=>pkGlint(g,26,6,2))};
P['ab-gtaunt']=g=>{pbPalm(g,13,18,.86,'skin',{rot:-20});pbArcs(g,13,14,[9,13],30,95,1.8,'blood')};
P['ab-netthrow']=g=>{glNet(g,18,14,11);pbSpeed(g,[[2,26,8,21,2],[5,30,11,25,1.8]],'white')};
P['ab-gnet']=g=>{glNet(g,16,15,12,{mat:'vellum'});pkFill(g,pkCirc(16,15,3.2),'blood',{ball:1,k:.4})};
P['ab-showstop']=g=>{pbArcCut(g,17,17,12.6,200,330,4.4,'gold');pkSword(g,11,22,45,{len:16,w:5.6,guard:8,grip:4.6,tip:'leaf'});pkStar(g,25.6,6.4,4.2,'gold',5,1.9)};
P['ab-crowdroar']=g=>{paLaurel(g,16,18,10.6,{n:5,top:44,mat:'green'});pbArcs(g,16,10,[5,8.6],300,420,1.9,'gold');pkPost(g=>pkGlint(g,16,5,2))};
P['ab-feint']=g=>{pkSword(g,12,21,45,{len:15,w:5,guard:8,grip:4.4});pbSpeed(g,[[30,8,22,12,2.2],[30,14,24,16,1.8],[28,20,23,20.6,1.6]],'teal');pbChev(g,8,9,8,5.4,2.2,'white')};
P['ab-iugula']=g=>{pkSword(g,16,7,180,{len:17,w:5.6,guard:9,grip:4.6,tip:'leaf'});pkDrop(g,9,30,8,'blood');pkDrop(g,24,30.6,7,'blood');pbGlow(g,16,24,8,'blood',.35)};
/* passive perks and the capstones */
P['perk-gladiator.1']=g=>{paLaurel(g,16,17,11.6,{n:5,top:42,mat:'green'});pkAt(g,16,16.6,0,.62,g=>{g.translate(-16,-16);pkFill(g,pkAt0(),'blood',{k:1.6})})};
P['perk-gladiator.4']=g=>{glNet(g,13,18,10,{mat:'canvas'});glTrident(g,{})};
P['perk-gladiator.cap']=g=>{paCrown(g,'gold','blood',{y0:3,y1:14,x0:6});paLaurel(g,16,21,9.6,{n:5,top:50,mat:'green'})};
P['perk-champion.1']=g=>{pkFill(g,pkS('M1.6 30 Q8 20 16 20 Q24 20 30.4 30 Z'),'vellum',{k:.8,inside:(g,m)=>pkLine(g,'M6 27 Q11 24 15 24.4 M17 25.4 Q22 24.6 26 27.4',.7,m[1],.7)});pkShield(g,16,13,{kind:'round',w:16,h:16,mat:'cloth',rim:'brass',boss:3,bossMat:'brass'})};
P['perk-champion.3']=g=>{pkSword(g,9,23,40,{len:15,w:5.4,guard:8,grip:4.4,tip:'leaf'});pkSword(g,23,23,-40,{len:15,w:5.4,guard:8,grip:4.4,tip:'leaf',mat:'iron'});pkFill(g,pkCirc(16,9,3),'gold',{ball:1,k:.4})};
P['perk-champion.4']=g=>{pbGround(g,16,28,30,6,'vellum');pbBoot(g,11,16,.7);pbBoot(g,21,17,.7);pkFill(g,pdArrow0(16,3,16,10),'gold',{k:.4})};
P['perk-champion.6']=g=>{paLaurel(g,16,18,11,{n:5,top:40,mat:'gold'});pkFill(g,pkS('M16 27 C10 22.6 7.4 19.4 7.4 16 C7.4 13.2 9.6 11.4 12 11.4 C14 11.4 15.2 12.6 16 14 C16.8 12.6 18 11.4 20 11.4 C22.4 11.4 24.6 13.2 24.6 16 C24.6 19.4 22 22.6 16 27 Z'),'blood',{k:1.2});pbChev(g,16,6,8,5.4,2.2,'verd')};
P['perk-champion.cap']=g=>{paLaurel(g,16,17,12,{n:6,top:36,mat:'gold'});pkFill(g,pkStarS(16,15,7,5,3),'gold',{k:.8});pkPost(g=>pkGlint(g,16,8,2))};
/* statuses (the overhead squares too) */
P['st-taunted']=P['ab-gtaunt'];P['st-netted']=g=>glNet(g,16,16,12.4,{mat:'vellum'});P['st-crowd']=P['ab-crowdroar'];P['st-feint']=P['ab-feint'];P['st-secondwind']=P['perk-champion.6'];
for(const n of ['st-taunted','st-netted'])if(typeof PK_SQ==='object'&&PK_SQ)PK_SQ[n]=P[n];
/* the Showman trait, the colosseum */
if(typeof paTrait==='function')P['trait-showman']=paTrait('showman',g=>{paLaurel(g,16,17,11.6,{n:5,top:42,mat:'green'});pkStar(g,16,15,6.6,'gold',5,2.8)},.8);
P.colosseum=g=>{glColo(g)};
function glColo(g){const W=(y,h,n,mat,x0,x1)=>{pkFill(g,pkS(`M${x0} ${y+h} L${x0} ${y} Q16 ${y-3.4} ${x1} ${y} L${x1} ${y+h} Z`),mat,{k:.9,inside:(g,m)=>{for(let i=0;i<n;i++){const x=x0+2+(x1-x0-4)*(i+.5)/n;pkFill(g,pkS(`M${x-1.3} ${y+h-.8} L${x-1.3} ${y+2.4} Q${x} ${y+.8} ${x+1.3} ${y+2.4} L${x+1.3} ${y+h-.8} Z`),'dark',{lw:.4,noRim:1,k:.2})}}})};
 pbGround(g,16,29.6,30,4.4,'vellum');W(19.6,9,7,'vellum',2.4,29.6);W(12.6,7,6,'stone',3.4,28.6);W(7,5.6,5,'vellum',4.8,27.2);
 pkFill(g,pkTube([24,7.6,24,1.4],1.2,'round'),'darkwood',{k:.2});pkFill(g,pkS('M24.4 1.4 L30 2.8 L24.4 4.6 Z'),'cloth',{k:.3,lw:PK.lw*.7})}
// a small heart and an arrow without the shared helpers (local)
function pkAt0(g){return pkS('M16 26 C9 21 5.6 17 5.6 13 C5.6 9.6 8.4 7.6 11 7.6 C13.4 7.6 15 9 16 10.6 C17 9 18.6 7.6 21 7.6 C23.6 7.6 26.4 9.6 26.4 13 C26.4 17 23 21 16 26 Z')}
function pdArrow0(x0,y0,x1,y1){return pkPoly([x0,y1,x0-4,y1-4.6,x0-1.6,y1-4.6,x0-1.6,y0,x0+1.6,y0,x0+1.6,y1-4.6,x0+4,y1-4.6])}
})();
// the world-map colosseum painted at Detail High (41-worldart.js asks glColoSite for a canvas k times the art size; null at Detail Low)
const GLSITE=new Map();
function glColoSiteDraw(q,W,H,night){const K=W/64,X=x=>x*K,Y=y=>y*K;q.save();q.scale(K,K);q.lineJoin='round';q.lineCap='round';
 const ink='#0c0d12',grad=(y0,y1,c)=>{const G=q.createLinearGradient(0,y0,0,y1);c.forEach((s,i)=>G.addColorStop(i/(c.length-1),s));return G};
 const ell=(cx,cy,rx,ry)=>{q.beginPath();q.ellipse(cx,cy,rx,ry,0,0,Math.PI*2)};
 // shadow and ground
 q.fillStyle='rgba(12,13,18,.32)';ell(33,40.5,30,5.4);q.fill();
 // the outer wall: an oval ring seen from above and the south; three storeys of arches on the near face
 const wallTop=12,wallBot=37,rx=28,ryT=8,ryB=6;
 q.fillStyle=grad(wallTop,wallBot,['#e9d6a6','#d2b57c','#b08a55','#8c6a40']);q.beginPath();q.ellipse(32,wallTop+ryT,rx,ryT,0,Math.PI,0,false);q.lineTo(32+rx,wallBot-ryB+2);q.ellipse(32,wallBot-ryB+2,rx,ryB,0,0,Math.PI,false);q.closePath();q.fill();q.strokeStyle=ink;q.lineWidth=.55;q.stroke();
 // the arena inside: the far stands, the sand
 q.fillStyle=grad(wallTop,wallTop+14,['#9c7a4c','#c9a874']);ell(32,wallTop+ryT,rx-2.4,ryT-1.8);q.fill();
 q.fillStyle=grad(wallTop+6,wallTop+14,['#e6cf96','#d9b878']);ell(32,wallTop+ryT+2.4,rx-9,ryT-4.2);q.fill();q.strokeStyle='rgba(12,13,18,.55)';q.lineWidth=.4;q.stroke();
 // the crowd on the far stands: dots of colour
 const C=['#c4493f','#ecc64f','#62a6ee','#e9e0c9','#9bd96f','#b98cf0'];for(let i=0;i<70;i++){const a=Math.PI*(1.05+.9*((i*37)%70)/70),r=(rx-4.6)+((i*13)%3)*.9,x=32+Math.cos(a)*r,y=wallTop+ryT+Math.sin(a)*(ryT-2.6)-.6+((i*7)%3)*.5;if(y>wallTop+ryT-1)continue;q.fillStyle=C[i%C.length];q.fillRect(x-.35,y-.35,.7,.7)}
 // two gladiators on the sand
 for(const [x,c] of [[28.5,'#c4493f'],[35,'#62a6ee']]){q.fillStyle=ink;q.fillRect(x-.6,wallTop+ryT+1,1.2,2.4);q.fillStyle=c;q.fillRect(x-.5,wallTop+ryT+1.2,1,1.2);q.fillStyle='#d8dde2';q.fillRect(x+.7,wallTop+ryT+.6,.3,2)}
 // the near wall: three storeys of arches with pilasters
 const rows=[[wallTop+ryT+1.2,7.2,'#3a2a1e'],[wallTop+ryT+8.6,7.4,'#2e2016'],[wallTop+ryT+16.2,5.8,'#24180e']];
 for(let s=0;s<3;s++){const [y0,h,dk]=rows[s],n=13-s;for(let i=0;i<n;i++){const t=(i+.5)/n,a=Math.PI*(1-t),x=32+Math.cos(a)*(rx-.6),sy=Math.sin(a),yy=y0+sy*ryB*.5,w=3.4*Math.max(.35,sy),hh=h*(.82+.18*sy);
   q.fillStyle=night?'#ffb04a':dk;q.beginPath();q.moveTo(x-w/2,yy+hh);q.lineTo(x-w/2,yy+w*.5);q.quadraticCurveTo(x,yy-w*.25,x+w/2,yy+w*.5);q.lineTo(x+w/2,yy+hh);q.closePath();q.fill();
   if(sy>.45){q.fillStyle='rgba(255,246,214,.55)';q.fillRect(x-w/2-.55,yy,.45,hh)}}
  q.strokeStyle='rgba(12,13,18,.45)';q.lineWidth=.45;q.beginPath();q.ellipse(32,rows[s][0]+rows[s][1]+.6,rx-.2,ryB*.55,0,0,Math.PI,false);q.stroke()}
 // the attic storey and its masts, the velarium awning over a part of the stands
 q.strokeStyle=ink;q.lineWidth=.5;for(let i=0;i<9;i++){const a=Math.PI*(1.05+i*.11),x=32+Math.cos(a)*rx,y=wallTop+ryT+Math.sin(a)*ryT;q.beginPath();q.moveTo(x,y);q.lineTo(x,y-4.4);q.stroke()}
 q.fillStyle='rgba(226,90,70,.85)';q.beginPath();q.moveTo(8,wallTop+1);q.quadraticCurveTo(18,wallTop+4,26,wallTop-.6);q.lineTo(24,wallTop+4.4);q.quadraticCurveTo(16,wallTop+6.2,9.4,wallTop+5.2);q.closePath();q.fill();q.strokeStyle=ink;q.lineWidth=.4;q.stroke();
 for(const [x,c] of [[14,'#ecc64f'],[50,'#c4493f']]){q.strokeStyle='#3a2a1e';q.lineWidth=.6;q.beginPath();q.moveTo(x,wallTop+2);q.lineTo(x,wallTop-6);q.stroke();q.fillStyle=c;q.beginPath();q.moveTo(x+.3,wallTop-6);q.lineTo(x+5,wallTop-4.6);q.lineTo(x+.3,wallTop-3);q.closePath();q.fill()}
 // the great gate
 q.fillStyle='#1a120c';q.beginPath();q.moveTo(29,wallBot+1.4);q.lineTo(29,wallBot-5);q.quadraticCurveTo(32,wallBot-8.2,35,wallBot-5);q.lineTo(35,wallBot+1.4);q.closePath();q.fill();q.strokeStyle='#c9a46a';q.lineWidth=.35;for(const x of [30.2,31.4,32.6,33.8]){q.beginPath();q.moveTo(x,wallBot-6);q.lineTo(x,wallBot+1.2);q.stroke()}
 // light: a rim on the upper left, a glow of torches at night
 q.globalCompositeOperation='source-atop';const L=q.createLinearGradient(4,4,60,40);L.addColorStop(0,'rgba(255,250,230,.22)');L.addColorStop(.5,'rgba(255,250,230,0)');L.addColorStop(1,'rgba(20,10,0,.25)');q.fillStyle=L;q.fillRect(0,0,64,44);q.globalCompositeOperation='source-over';
 if(night){q.globalCompositeOperation='lighter';const R=q.createRadialGradient(32,wallTop+ryT+3,1,32,wallTop+ryT+3,18);R.addColorStop(0,'rgba(255,170,70,.45)');R.addColorStop(1,'rgba(255,170,70,0)');q.fillStyle=R;q.fillRect(0,0,64,44);q.globalCompositeOperation='source-over'}
 q.restore()}
function glColoSite(w,h,k,night){if(typeof hdArt==='function'&&!hdArt())return null;if(typeof document==='undefined'||!document.createElement)return null;const id=w+'x'+h+'@'+k+(night?'n':'d');let c=GLSITE.get(id);if(c!==undefined)return c;
 c=null;try{c=document.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);const q=c.getContext('2d');if(!q||!q.ellipse){c=null}else glColoSiteDraw(q,c.width,c.height,night)}catch(e){c=null}GLSITE.set(id,c);return c}

