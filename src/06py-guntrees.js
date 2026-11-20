/* ================= ICONS for the gun trees (MAST.gunner / pistol / powder in 10-data.js; rules: 64u-guntrees.js) =================
   16 px pixel (Detail Low): the three medallions (m-gunner m-pistol m-powder: the brass ring of a style tree around a motif of its own,
   IC_MO: crossed muskets, a pistol with its flash, a lit bomb), a bomb glyph of its own (bomb), the abilities (ab-gvolley ab-qdraw ab-pwhip
   ab-grenade ab-petard) and every passive and capstone (perk-<id>) as compositions of drawn pixel icons (IC_COMP / IC_PKID) with an overlay glyph.
   Painted (Detail High): the same in the 06p kit, the passives under the gold passive seal (06pv grammar), the medallions in the 06pt frame.
   This file only adds entries (and gives Musketry a medallion of its own in place of the Sharpshooter's). */
/* ---- 16 px pixel ---- */
if(typeof IC_MO==='object'&&IC_MO){
 IC_MO.gunner=['................','................','................','...q........q...','...rq......qr...','....rq....qr....','.....rd..dr.....','.......dd.......','......kddk......','.....kj..jk.....','....kj....jk....','...kj......jk...','...j........j...','................','................','................'];
 IC_MO.pistol=['................','................','................','.............y..','...rqqqqqqqd.yey','...pppppppc...y.','....cbkkji......','....dckji.......','.....kkji.......','....kkji........','...kkji.........','...kji..........','................','................','................','................'];
 IC_MO.powder=['................','................','..........y.....','.........yey....','........k.y.....','.......k........','.....rqqd.......','....rqqqqp......','...rqqqqqqp.....','...qqqqqqqp.....','...qqqqqqpp.....','...pqqqqppp.....','....pqqppp......','.....pppp.......','................','................']}
if(typeof ICONS==='object'&&typeof _icOutline==='function'&&!ICONS.bomb){ICONS.bomb=_icOutline(['................','................','..........ey....','.........eyy....','........k.e.....','.......k........','.....rqqd.......','....rqqqqp......','...rqqqqqqp.....','...qqqqqqqp.....','...qqqqqqpp.....','...pqqqqppp.....','....pqqppp......','.....pppp.......','................','................']);
 if(typeof icCss==='function')icCss('bomb')}
if(typeof IC_COMP==='object')Object.assign(IC_COMP,{
 'ab-gvolley':['w-musket',null,'x3','br'],'ab-qdraw':['w-pistol',null,'motion','bl'],'ab-pwhip':['w-pistol',null,'star','br'],
 'ab-grenade':['bomb',null,'flame','br'],'ab-petard':['bomb',null,'shield','br']});
if(typeof IC_PKID==='object')Object.assign(IC_PKID,{
 'gunner.1':['w-musket',null,'up','tr'],'gunner.2':['w-musket',null,'x3','br'],'gunner.cap':['w-musket',null,'star','tr'],
 'pistol.1':['w-pistol',null,'plus','br'],'pistol.3':['w-pistol',null,'pin','br'],'pistol.5':['w-pistol',null,'eye','br'],'pistol.6':['w-pistol',null,'x2','br'],'pistol.cap':['w-pistol',null,'star','tr'],
 'powder.1':['rdef',null,'motion','bl'],'powder.3':['bomb',null,'up','tr'],'powder.5':['morale-1',null,'flame','br'],'powder.6':['burn',null,'x3','br'],'powder.cap':['bomb',null,'star','tr'],
 'weapons.flintlock':['ab-reload',null,'dn','br'],'fab.mattias.1':['w-musket',null,'eye','br'],'fab.mattias.2':['mdef',null,'motion','bl'],'fab.mattias.cap':['ab-reload',null,'star','tr'],
 'fab.hakon.4':['ab-footwork',null,'motion','bl'],'fab.mirela.4':['ab-aimed',null,'eye','br'],'fab.brannoc.4':['ab-crush',null,'crack','br']});
/* ---- painted ---- */
(function(){if(typeof PAINT!=='object'||!PAINT)return;const P=PAINT;
 const at=(g,x,y,a,s,fn)=>pkAt(g,x,y,a,s,g=>{g.translate(-16,-16);fn(g)});
 const item=(g,id)=>{try{pkcPaintItem(g,id)}catch(e){}};
 const puff=(g,x,y,r,a)=>{pkFill(g,pkCirc(x,y,r),'white',{k:.25,lw:PK.lw*.6,a:a==null?.85:a})};
 const smoke=(g,L)=>{for(const [x,y,r] of L)puff(g,x,y,r)};
 // a round iron bomb with its fuse burning (x,y the centre, s the scale)
 const bomb=(g,x,y,s,lit)=>pkAt(g,x,y,0,s||1,g=>{pkFill(g,pkCirc(0,2,9),'iron',{ball:1,k:.8});pkFill(g,pkRect(-3,-9.4,6,3.6,1),'bronze',{k:.4});
  pkLine(g,'M0 -9.6 Q2.6 -13 6 -12.6',1.5,'#c8a86a',1);if(lit!==false){pkGlow(g,7,-13,6,'#ffb040',.8);pkFill(g,pkStarS(7,-13,3.6,6,1.4),'fire',{k:.3,lw:PK.lw*.6})}});
 const flash=(g,x,y,r)=>{pkGlow(g,x,y,r*1.6,'#ffb040',.7);pkFill(g,pkStarS(x,y,r,7,r*.42),'fire',{k:.4,lw:PK.lw*.7})};
 P.bomb=g=>bomb(g,16,17,1.2);
 // the abilities
 P['ab-gvolley']=g=>{for(const [dy,s] of [[-7,.62],[0,.66],[7,.62]])at(g,14,16+dy,-8,s,g=>item(g,'musket'));flash(g,27,7,3);flash(g,28.5,15,3.2);flash(g,27,23,3)};
 P['ab-qdraw']=g=>{at(g,15,17,0,.92,g=>item(g,'pistol'));pbSpeed(g,[[2,9,9,9,2],[2,15,8,15,2],[3,21,9,20,1.8]],'white');flash(g,27.5,10,3.4)};
 P['ab-pwhip']=g=>{at(g,17,15,-90,.9,g=>item(g,'pistol'));pbImpact(g,7,24,5.4,'holy',8);pkLine(g,'M26 26 Q22 16 14 12',1.2,'#f4ead0',.8)};
 P['ab-grenade']=g=>{pkLine(g,'M3 28 Q8 10 18 9',1.2,'#f4ead0',.6);bomb(g,19,18,1.05)};
 P['ab-petard']=g=>{pkFill(g,pkS('M16 3 L27 7 L25.5 20 Q21.5 26.5 16 29 Q10.5 26.5 6.5 20 L5 7 Z'),'wood',{k:1});pkLine(g,'M9 11 L23 21 M22 9 L12 24',1.4,'#2a1c12',.9);
  bomb(g,17,17,.72);pbImpact(g,25,7,4.6,'fire',8)};
 // the medallions: crossed muskets (Musketry), a pistol with its flash (Pistolier), a lit bomb (Grenadier)
 const med=draw=>g=>{pkFill(g,pkCirc(16,16,14),'bronze',{k:1.2});pkFill(g,pkCirc(16,16,11),pkcM('lacquer'),{k:.6});pkAt(g,16,16,0,.66,g=>{g.translate(-16,-16);draw(g)})};
 P['m-gunner']=med(g=>{at(g,16,16,0,.92,g=>item(g,'musket'));at(g,16,16,0,.92,g=>{g.translate(32,0);g.scale(-1,1);item(g,'musket')})});
 P['m-pistol']=med(g=>{item(g,'pistol');flash(g,28,9,3.4)});
 P['m-powder']=med(g=>bomb(g,15,18,1.2));
 // the passives and capstones: their art a little smaller under the gold passive seal, with an emblem
 const seal=g=>{pkFill(g,pkCirc(25.4,25.4,5.4),'gold',{k:.7,lw:PK.lw*.9});pkFill(g,pkCirc(25.4,25.4,3.4),pkcM('lacquer'),{k:.3,lw:PK.lw*.7});pkLine(g,'M23.4 26.4 L25.4 24.2 L27.4 26.4',1,'#ffd860',1)};
 const EM={up:g=>pkFill(g,pkPoly([5.5,1.5,10,7,7,7,7,10.5,4,10.5,4,7,1,7]),'gold',{k:.4,lw:PK.lw*.7}),
  plus:g=>pkFill(g,pkS('M4.4 1 L7.6 1 L7.6 4.4 L11 4.4 L11 7.6 L7.6 7.6 L7.6 11 L4.4 11 L4.4 7.6 L1 7.6 L1 4.4 L4.4 4.4 Z'),'white',{k:.4,lw:PK.lw*.7}),
  eye:g=>{pkFill(g,pkS('M1 6 C3 2.4 9 2.4 11 6 C9 9.6 3 9.6 1 6 Z'),'white',{k:.4,lw:PK.lw*.7});pkFill(g,pkCirc(6,6,1.9),'dark',{ball:1,k:.3,lw:0})},
  two:g=>{pkFill(g,pkCirc(4,6,3),'steel',{k:.4,lw:PK.lw*.7});pkFill(g,pkCirc(8.5,6,3),'steel',{k:.4,lw:PK.lw*.7})},
  star:g=>pkFill(g,pkStarS(6,6,5.4,5,2.4),'gold',{k:.4,lw:PK.lw*.7}),
  run:g=>pkLine(g,'M1 3 L8 3 M2 6 L10 6 M1 9 L7 9',1.3,'#f4ead0',1),
  flame:g=>pkFill(g,pkS('M6 1 C9 4 10.5 6.5 9.5 9 C8.6 11 3.4 11 2.5 9 C1.6 6.6 3.6 5.6 4.4 3.4 C5 5 6 5.4 6 1 Z'),'fire',{k:.4,lw:PK.lw*.7}),
  skull:g=>{pkFill(g,pkS('M2 5 C2 1.6 10 1.6 10 5 L10 7.6 L8 8.4 L8 10.4 L4 10.4 L4 8.4 L2 7.6 Z'),'bone',{k:.4,lw:PK.lw*.7});pkFill(g,pkCirc(4.4,5.6,1.2),'dark',{k:.2,lw:0});pkFill(g,pkCirc(7.6,5.6,1.2),'dark',{k:.2,lw:0})},
  smoke:g=>{puff(g,4,7,3);puff(g,8,5,3.2)}};
 const pk=(id,draw,em)=>{P['perk-'+id]=g=>{pkAt(g,14,14,0,.82,g=>{g.translate(-16,-16);draw(g)});if(em&&EM[em])EM[em](g);seal(g)}};
 pk('gunner.1',g=>{at(g,16,16,-10,.9,g=>item(g,'musket'));pbImpact(g,25,8,4,'fire',8)},'up');                          // Rolling volley
 P['perk-gunner.2']=P['ab-gvolley'];                                                                                    // Volley fire (the ability's own)
 pk('gunner.cap',g=>{at(g,16,16,0,.9,g=>item(g,'musket'));at(g,16,16,0,.9,g=>{g.translate(32,0);g.scale(-1,1);item(g,'musket')})},'star');   // Fire by ranks
 pk('pistol.1',g=>{item(g,'pistol');flash(g,28,9,3)},'plus');                                                          // Arm's length
 pk('pistol.3',g=>{item(g,'pistol');pbSpeed(g,[[18,22,30,22,2],[20,27,30,27,1.8]],'white')},'run');                   // Wing the runner
 pk('pistol.5',g=>{item(g,'duelpistol')},'eye');                                                                       // Ten paces
 pk('pistol.6',g=>{at(g,13,18,-12,.72,g=>item(g,'pistol'));at(g,19,13,12,.72,g=>item(g,'pistol'))},'two');            // Brace of pistols
 pk('pistol.cap',g=>{at(g,15,17,0,.9,g=>item(g,'dragon'));flash(g,28,9,3)},'star');                                   // Gunslinger
 pk('powder.1',g=>{at(g,13,18,0,.8,g=>item(g,'handgonne'));smoke(g,[[22,9,5],[27,14,4],[18,5,3.6]])},'smoke');         // Powder smoke
 pk('powder.3',g=>bomb(g,15,18,1.05),'up');                                                                            // Blasting powder
 pk('powder.5',g=>{bomb(g,14,18,.9);pbImpact(g,24,8,4.4,'holy',8)},'skull');                                          // Shellshock
 pk('powder.6',g=>{bomb(g,14,18,.9);for(const [x,y] of [[24,10],[7,8]])pkFill(g,pkS(`M${x} ${y-6} C${x+3} ${y-3} ${x+4} ${y} ${x+3} ${y+3} C${x+2} ${y+5} ${x-2} ${y+5} ${x-3} ${y+3} C${x-4} ${y} ${x-1} ${y-1} ${x} ${y-6} Z`),'fire',{k:.4})},'flame');   // Wildfire
 pk('powder.cap',g=>{bomb(g,12,19,.8);bomb(g,22,13,.7,false)},'star');                                                // Master sapper
 pk('weapons.flintlock',g=>{item(g,'musket');pkLine(g,'M6 26 L26 6',1.4,'#c8a86a',1)},'plus');                       // Ramrod drill
 pk('fab.mattias.1',g=>item(g,'jezail'),'eye');pk('fab.mattias.2',g=>{item(g,'pistol');smoke(g,[[22,10,5],[26,16,4]])},'smoke');pk('fab.mattias.cap',g=>{item(g,'musket');flash(g,27,8,3)},'star');
 })();
/* the ids above, for the tests and the icon sheet */
const GT_ICONS=['m-gunner','m-pistol','m-powder','bomb','ab-gvolley','ab-qdraw','ab-pwhip','ab-grenade','ab-petard',
 'perk-gunner.1','perk-gunner.2','perk-gunner.cap','perk-pistol.1','perk-pistol.3','perk-pistol.5','perk-pistol.6','perk-pistol.cap',
 'perk-powder.1','perk-powder.3','perk-powder.5','perk-powder.6','perk-powder.cap','perk-weapons.flintlock','perk-fab.mattias.1','perk-fab.mattias.2','perk-fab.mattias.cap'];
