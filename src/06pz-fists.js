/* ================= ICONS for the fist trees and the fist weapons (MAST.wrestle / pugilist / willow in 10-data.js; rules: 64x-fists.js;
   the items: 11x-fists.js) =================
   16 px pixel (Detail Low): the three medallions (m-wrestle m-pugilist m-willow: the brass ring of a style tree around a motif of its own,
   IC_MO: two forearms locked in a hold, a fist with its motion lines, a willow bough), the abilities (ab-hipthrow ab-suplex ab-onetwo
   ab-pflurry ab-flykick) and every passive and capstone (perk-<id>) as compositions of drawn pixel icons (IC_COMP / IC_PKID) with an overlay
   glyph; the fist weapons' 16 px icons come from their cells on the figures (73x-fists.js, icItemRows).
   Painted (Detail High): the same in the 06p kit, the passives under the gold passive seal (06pv grammar), the medallions in the 06pt frame,
   and the fist weapons (it-wraps it-knuckles it-baghnakh it-shuko it-gauntlet it-katar). This file only adds entries. */
/* ---- 16 px pixel ---- */
if(typeof IC_MO==='object'&&IC_MO){const G=L=>L.map(r=>(r+'................').slice(0,16));
 IC_MO.wrestle=G(['','','','...su......us','....su....us','.....su..us','......skks','......kkkk','......skks','.....us..su','....us....su','...us......su']);
 IC_MO.pugilist=G(['','','','......usussu','......usussu','.....sssssstu','..r..sstttttu','.rr..sssstttu','..r...ssstu','......ssstu','......kkkji','......kkjji']);
 IC_MO.willow=G(['','','','...kkkkkj','..k.....jj','..6.6.6...j','..6.6.6.6..j','..5.6.5.6.6.j','....5.5.6.6..','......5.5.6','........5'])}
if(typeof IC_COMP==='object')Object.assign(IC_COMP,{
 'ab-hipthrow':['ab-palm',null,'motion','br'],'ab-suplex':['ab-oslam',null,'star','tr'],'ab-onetwo':['fist',null,'x2','bl'],
 'ab-pflurry':['fist',{k:'q',j:'p',i:'o'},'x3','bl'],'ab-flykick':['ab-footwork',null,'up','tr']});
if(typeof IC_PKID==='object')Object.assign(IC_PKID,{
 'wrestle.1':['winded',null,'plus','br'],'wrestle.3':['winded',null,'up','tr'],'wrestle.5':['winded',null,'x3','br'],'wrestle.6':['held',null,'star','tr'],'wrestle.cap':['held',null,'star','tr'],
 'pugilist.1':['fist',null,'dn','br'],'pugilist.3':['fatigue',null,'dn','br'],'pugilist.4':['fist',null,'x2','br'],'pugilist.6':['ap',null,'up','tr'],'pugilist.cap':['fist',{k:'d',j:'c',i:'b'},'star','tr'],
 'willow.1':['mdef',null,'plus','br'],'willow.3':['mdef',null,'motion','bl'],'willow.4':['ab-footwork',null,'shield','br'],'willow.5':['ab-parry',null,'motion','bl'],'willow.6':['ap',null,'motion','bl'],
 'willow.cap':['ab-footwork',{k:'6',j:'5',i:'7'},'star','tr']});
/* the fist weapons' 16 px icons (and the gladiators' cestus and spiked cestus): the fist icon dressed in each one (IC_HANDW: an item's icon drawn by hand, recoloured), not the few cells
   the figures hold (those read as a sliver at 16 px) */
if(typeof ICONS==='object'&&ICONS.fist&&typeof IC_HANDW==='object'){const F=ICONS.fist.map(r=>r.replace(/0/g,'.').split('')),K=()=>F.map(r=>r.slice()),O=g=>g.map(r=>r.join(''));
 const skin={s:1,t:1,u:1},paint=(g,y,f)=>{for(let x=0;x<16;x++)if(skin[g[y][x]])g[y][x]=f(x,g[y][x])},set=(g,L)=>{for(const [x,y,k] of L)if(g[y])g[y][x]=k};
 const W={};
 {const g=K();for(const y of [6,8,10])paint(g,y,(x,k)=>k==='s'?'l':'m');for(const y of [7,9])paint(g,y,()=>'m');W.wraps=g}
 {const g=K();for(const y of [3,4])paint(g,y,(x,k)=>k==='s'?'d':k==='t'?'c':'b');set(g,[[2,3,'c'],[2,4,'b']]);W.knuckles=g}
 {const g=K();paint(g,6,()=>'p');for(const x of [3,6,9,12])set(g,[[x,0,'q'],[x,1,'q'],[x,2,'p']]);W.baghnakh=g}
 {const g=K();paint(g,7,()=>'p');paint(g,8,()=>'o');for(const x of [4,8,12])set(g,[[x,1,'q'],[x,2,'p']]);W.shuko=g}
 {const g=K(),M={s:'q',t:'p',u:'o',k:'q',j:'p',i:'o'};for(const r of g)for(let x=0;x<16;x++)if(M[r[x]])r[x]=M[r[x]];set(g,[[4,4,'r'],[5,3,'r']]);W.gauntlet=g}
 W.katar=['.......r........','.......q........','......rqp.......','......qqp.......','......qqp.......','......qqp.......','......qqp.......','......qpo.......','....ccccccc.....','....p.....p.....','....p.kkk.p.....','....pcccccp.....','....p.jjj.p.....','....pcccccp.....','....o.....o.....','................'].map(r=>r.split(''));
 for(const k of ['cestus','cestus2']){const g=K();for(const y of [7,8,9])paint(g,y,(x,c)=>c==='s'?'k':c==='t'?'j':'i');for(const y of [3,4])paint(g,y,(x,c)=>k==='cestus2'?(c==='s'?'q':'p'):(c==='s'?'p':'o'));if(k==='cestus2')for(const x of [4,7,10])set(g,[[x,1,'q'],[x,2,'q']]);W[k]=g}   // the gladiators' cestus, drawn the same way
 for(const id in W){ICONS['w-'+id]=O(W[id]);IC_HANDW[id]=['w-'+id]}}
/* ---- painted ---- */
(function(){if(typeof PAINT!=='object'||!PAINT)return;const P=PAINT;
 const at=(g,x,y,a,s,fn)=>pkAt(g,x,y,a,s,g=>{g.translate(-16,-16);fn(g)});
 // a forearm with its fist, from (x0,y0) (the elbow) to (x1,y1) (the knuckles)
 const arm=(g,x0,y0,x1,y1,w,mat)=>{pkFill(g,pkTube([x0,y0,x1,y1],w||5.2,'round'),mat||'skin',{k:.9})};
 const fist=(g,x,y,s,mat,a)=>at(g,x,y,a||0,s,g=>pbFist(g,16,16,1,mat||'skin','cloth'));
 const breath=(g,x,y,s)=>{pkFill(g,pkS(`M${x} ${y} C${x+3*s} ${y-3*s} ${x+7*s} ${y-1*s} ${x+9*s} ${y-4*s}`),'white',{k:.2});for(const [dx,dy,r] of [[2,-1,2.2],[6,-2.6,2.6],[10,-4.4,1.8]])pkFill(g,pkCirc(x+dx*s,y+dy*s,r*s),'white',{k:.25,lw:PK.lw*.6})};
 const leaf=(g,x,y,a,s)=>pkAt(g,x,y,a,s,g=>pkFill(g,pkS('M0 0 C2.4 3 2.4 8 0 11 C-2.4 8 -2.4 3 0 0 Z'),'verd',{k:.4,lw:PK.lw*.7}));
 // the fist weapons (also the item icons): over a fist seen from the front, knuckles up
 const wrapBands=(g,mat)=>{for(const y of [12,16.4,20.8,25])pkFill(g,pkRect(6.8,y,18.4,3.6,1.4),mat||'vellum',{k:.5,lw:PK.lw*.8})};
 const IT={
  wraps:g=>{pbFist(g,16,17,.92,'skin','vellum');wrapBands(g,'vellum');pkLine(g,'M24 26 Q28 29 27 31',1.4,'#e9e0c9',1)},
  knuckles:g=>{pbFist(g,16,17,.92,'skin','leather');pkFill(g,pkS('M5.6 9.6 L26.4 9.6 L26.4 13.8 L5.6 13.8 Z'),'brass',{k:.7});for(let i=0;i<4;i++)pkFill(g,pkCirc(8.4+i*5,9.4,2.6),'brass',{k:.5,inside:(g,m)=>pkHi(g,`M${7.4+i*5} 8.4 L${8.6+i*5} 8.2`,.8,.6)});pkPost(g=>pkGlint(g,9,9,1.4))},
  baghnakh:g=>{pbFist(g,16,19,.86,'skin','leather');pkFill(g,pkRect(5.4,15.6,21.2,3.4,1.2),'iron',{k:.5});for(let i=0;i<4;i++){const x=8+i*5.2;pkFill(g,pkS(`M${x-1.6} 15.8 Q${x+1} 9 ${x+2.8} 3.6 Q${x+1.4} 9.6 ${x+1.6} 15.8 Z`),'steel',{k:.3,lw:PK.lw*.7})}pkPost(g=>pkGlint(g,24,5,1.2))},
  shuko:g=>{pbFist(g,16,17,.92,'skin','leather');pkFill(g,pkRect(6,15.6,20,6,2),'iron',{k:.6,inside:(g,m)=>pkHi(g,'M8 17 L24 17',.8,.5)});for(const x of [10,16,22])pkFill(g,pkPoly([x-2,15.8,x+2,15.8,x+.6,9.6,x,8.6]),'steel',{k:.3,lw:PK.lw*.7});pkFill(g,pkRect(10.6,24,10.8,4,1.2),'darkwood',{k:.5})},
  gauntlet:g=>{pbFist(g,16,17,.92,'steel','steel');pkFill(g,pkRect(6.2,7.8,19.6,4.6,2),'steel',{k:.6,inside:(g,m)=>pkHi(g,'M8 9 L24 9',.8,.6)});pkFill(g,pkRect(6.6,13.2,18.8,5.4,2),'iron',{k:.6});pkFill(g,pkRect(9,24,14,6.4,1.6),'steel',{k:.6});pkPost(g=>pkGlint(g,10,9.4,1.6))},
  katar:g=>{pkFill(g,pkS('M13.4 15 L18.6 15 L17 3.6 L16 1.4 L15 3.6 Z'),'steel',{k:.5,inside:(g,m)=>pkLine(g,'M16 4 L16 14',.7,m[0],.7)});pkFill(g,pkRect(10.4,14.6,11.2,2.6,1),'brass',{k:.5});
   for(const x of [10.4,19.8])pkFill(g,pkRect(x,14.6,1.8,15.4,.8),'iron',{k:.5});for(const y of [20.4,24.6])pkFill(g,pkRect(11.6,y,8.8,2,.8),'brass',{k:.4});pkPost(g=>pkGlint(g,15.4,6,1.2))}};
 for(const id in IT)P['it-'+id]=IT[id];
 // the abilities
 P['ab-hipthrow']=g=>{pkFill(g,pkS('M4 27 Q16 2 29 20'),'white',{k:.1});pkLine(g,'M4 27 Q16 2 29 20',1.6,'#f4ead0',.7);arm(g,6,24,15,12,5.2);fist(g,15,11,.5);pbBoot(g,24,19,.5,'leather');pbImpact(g,27,25,4.6,'holy',8)};
 P['ab-suplex']=g=>{pbGround(g,16,28.6,30,4.6,'darkwood');arm(g,7,22,14,9,5);arm(g,25,22,18,9,5);fist(g,16,8,.55);pbImpact(g,16,25,6.4,'aura',9);for(const x of [5,27])pkLine(g,`M${x} 26 L${x+(x<16?-2:2)} 21`,1.4,'#f4ead0',.9)};
 P['ab-onetwo']=g=>{pbSpeed(g,[[1,20,8,20,2],[2,25,9,25,2]],'white');fist(g,12,19,.62);fist(g,21,11,.62);pbImpact(g,28,5,3.6,'holy',8)};
 P['ab-pflurry']=g=>{pbSpeed(g,[[1,8,6,8,1.6],[1,15,6,15,1.6],[1,22,6,22,1.6]],'white');for(const [x,y] of [[11,8],[20,12],[12,21],[22,24]])fist(g,x,y,.42);pbImpact(g,28,6,3.2,'holy',8)};
 P['ab-flykick']=g=>{pkLine(g,'M3 29 Q8 14 16 12',1.4,'#f4ead0',.7);pbSpeed(g,[[2,20,9,16,2],[4,26,11,21,2]],'white');at(g,18,12,-35,.72,g=>pbBoot(g,16,16,1,'leather'));pbImpact(g,27,5,4.4,'holy',8)};
 // the medallions: two forearms locked in a hold (Wrestler), a fist with its motion lines (Pugilist), a willow bough (Willow style)
 const med=draw=>g=>{pkFill(g,pkCirc(16,16,14),'bronze',{k:1.2});pkFill(g,pkCirc(16,16,11),pkcM('lacquer'),{k:.6});pkAt(g,16,16,0,.66,g=>{g.translate(-16,-16);draw(g)})};
 P['m-wrestle']=med(g=>{arm(g,4,28,24,6,6);arm(g,28,28,8,6,6);pkFill(g,pkRect(11,13.6,10,5.6,2),'leather',{k:.6})});
 P['m-pugilist']=med(g=>{pbSpeed(g,[[1,12,8,12,2],[0,18,7,18,2],[1,24,8,24,2]],'white');pbFist(g,19,17,1,'skin','cloth')});
 P['m-willow']=med(g=>{pkLine(g,'M3 5 Q16 0 28 12',2.4,'#7a5a38',1);for(const [x,y,a] of [[7,6,10],[11,5,4],[15,6,-6],[19,8,-14],[23,10,-24],[9,14,6],[14,15,-4],[19,17,-12],[24,18,-24],[13,24,-6],[18,25,-14]])leaf(g,x,y,a,1)});
 // the passives and capstones: their art a little smaller under the gold passive seal, with an emblem
 const seal=g=>{pkFill(g,pkCirc(25.4,25.4,5.4),'gold',{k:.7,lw:PK.lw*.9});pkFill(g,pkCirc(25.4,25.4,3.4),pkcM('lacquer'),{k:.3,lw:PK.lw*.7});pkLine(g,'M23.4 26.4 L25.4 24.2 L27.4 26.4',1,'#ffd860',1)};
 const EM={up:g=>pkFill(g,pkPoly([6,1,11,6.5,8,6.5,8,11,4,11,4,6.5,1,6.5]),'gold',{k:.4,lw:PK.lw*.7}),dn:g=>pkFill(g,pkPoly([6,11,11,5.5,8,5.5,8,1,4,1,4,5.5,1,5.5]),'gold',{k:.4,lw:PK.lw*.7}),
  plus:g=>pkFill(g,pkS('M4.4 1 L7.6 1 L7.6 4.4 L11 4.4 L11 7.6 L7.6 7.6 L7.6 11 L4.4 11 L4.4 7.6 L1 7.6 L1 4.4 L4.4 4.4 Z'),'white',{k:.4,lw:PK.lw*.7}),
  two:g=>{pkFill(g,pkCirc(4,6,3),'steel',{k:.4,lw:PK.lw*.7});pkFill(g,pkCirc(8.5,6,3),'steel',{k:.4,lw:PK.lw*.7})},
  star:g=>pkFill(g,pkStarS(6,6,5.4,5,2.4),'gold',{k:.4,lw:PK.lw*.7}),run:g=>pkLine(g,'M1 3 L8 3 M2 6 L10 6 M1 9 L7 9',1.3,'#f4ead0',1),
  shield:g=>pkFill(g,pkS('M6 1 L11 3 L10 7.6 Q8.4 10.4 6 11.4 Q3.6 10.4 2 7.6 L1 3 Z'),'steel',{k:.4,lw:PK.lw*.7})};
 const pk=(id,draw,em)=>{P['perk-'+id]=g=>{pkAt(g,14,14,0,.82,g=>{g.translate(-16,-16);draw(g)});if(em&&EM[em])EM[em](g);seal(g)}};
 pk('wrestle.1',g=>{arm(g,4,24,26,24,6);arm(g,4,14,26,14,6);breath(g,9,8,1.1)},'plus');                                     // Bear hug
 pk('wrestle.3',g=>{fist(g,14,18,.8);breath(g,18,8,1)},'up');                                                              // Grind
 pk('wrestle.5',g=>{pbPalm(g,16,17,.9,'skin');breath(g,6,9,1);breath(g,18,6,.9)},'run');                                  // Smother
 pk('wrestle.6',g=>{arm(g,4,26,26,8,6);arm(g,26,26,6,8,6);pkFill(g,pkStarS(16,17,6,5,2.6),'gold',{k:.4})},'');          // Breaking hold
 pk('wrestle.cap',g=>{arm(g,4,26,24,8,6.4);arm(g,28,26,8,8,6.4);pkFill(g,pkRect(10.6,14,10.8,6,2),'iron',{k:.6})},'star');   // Grip of iron
 pk('pugilist.1',g=>{pbSpeed(g,[[1,14,8,14,2],[2,20,9,20,2]],'white');fist(g,19,16,.8)},'dn');                              // Snap jab
 pk('pugilist.3',g=>{fist(g,16,17,.8);pkLine(g,'M4 6 Q8 2 12 6 M20 6 Q24 2 28 6',1.6,'#8fd8ff',1)},'dn');                   // Loose shoulders
 pk('pugilist.4',g=>{fist(g,11,19,.62);fist(g,21,12,.62)},'two');                                                           // Double jab
 pk('pugilist.6',g=>{fist(g,14,18,.78);pbImpact(g,25,7,5,'aura',8)},'up');                                                  // Rapid hands
 pk('pugilist.cap',g=>{for(const [x,y] of [[10,9],[21,9],[10,21],[21,21]])fist(g,x,y,.44)},'star');                        // Thousand fists
 pk('willow.1',g=>{pbPalm(g,11,17,.72,'skin',{rot:-12});pbPalm(g,21,17,.72,'skin',{rot:12})},'plus');                      // Empty hands
 pk('willow.3',g=>{pbBoot(g,14,18,.8,'leather');pbSpeed(g,[[18,10,29,10,1.8],[20,15,30,15,1.8]],'white')},'run');           // Hard to pin
 pk('willow.4',g=>{pbBoot(g,18,18,.8,'leather');pkLine(g,'M3 26 Q6 12 14 8',1.4,'#f4ead0',.8)},'shield');                 // Slip away
 pk('willow.5',g=>{pbPalm(g,13,18,.86,'skin',{rot:-30});pkSwoosh(g,16,16,12,-150,-40,2.4,'white')},'shield');               // Turn the blow
 pk('willow.6',g=>{for(const [x,y,a] of [[8,10,40],[14,14,60],[20,18,80]])leaf(g,x,y,a,1);pbSpeed(g,[[2,24,14,24,2]],'white')},'up');   // Wind step
 pk('willow.cap',g=>{pkLine(g,'M3 5 Q16 0 28 12',2.2,'#7a5a38',1);for(const [x,y,a] of [[8,7,8],[14,7,-6],[20,9,-16],[11,15,2],[17,16,-10]])leaf(g,x,y,a,1);at(g,20,22,-20,.5,g=>pbBoot(g,16,16,1,'leather'))},'star');   // Willow in the storm
 })();
/* the ids above, for the tests and the icon sheet */
const FS_ICONS=['m-wrestle','m-pugilist','m-willow','ab-hipthrow','ab-suplex','ab-onetwo','ab-pflurry','ab-flykick',
 'perk-wrestle.1','perk-wrestle.3','perk-wrestle.5','perk-wrestle.6','perk-wrestle.cap','perk-pugilist.1','perk-pugilist.3','perk-pugilist.4','perk-pugilist.6','perk-pugilist.cap',
 'perk-willow.1','perk-willow.3','perk-willow.4','perk-willow.5','perk-willow.6','perk-willow.cap','it-wraps','it-knuckles','it-baghnakh','it-shuko','it-gauntlet','it-katar'];
