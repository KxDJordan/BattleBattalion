/* ================= ICONS for the Twin blades tree (rules: 11w-dualwield.js, 64w-dualwield.js) =================
   Painted (06p kit, docs/icons-paint-guide.md): the medallion m-dualwield, the abilities ab-twinstrike ab-dwfeint ab-bladeflurry, the passive
   perks perk-dualwield.1 / .3 / .6 and the capstone perk-dualwield.cap. Two blades crossed or side by side: the main hand a sword pointing
   to the upper right like the rest of the set, the off hand a shorter dagger mirrored to the upper left; one action mark each.
   16 px pixel fallbacks (Detail Low, and the HD pixel sheet): the abilities are compositions of drawn pixel icons with a corner glyph
   (IC_COMP); the perks come from what each improves (IC_PKMOD / IC_PKFLAG -> icPerk); the medallion from the duelist's motif (IC_MO).
   This file only adds entries; it loads after 06-icons and the other 06p packages, before anything resolves an icon. */
/* ---- 16 px pixel fallbacks ---- */
Object.assign(IC_COMP,{
 'ab-twinstrike':['ab-parry',{r:'h',q:'g',p:'f'},'x2','br'],'ab-dwfeint':['dagger',null,'drop','br'],'ab-bladeflurry':['ab-flurry',{r:'6',q:'5',p:'7'},'x3','bl']});
Object.assign(IC_PKMOD,{dwDef:'ab-parry',dwOffDmg:'dagger',dwOffHit:'dagger'});
Object.assign(IC_PKFLAG,{dwTrain:'dagger',dwAmbi:'ab-parry'});
if(typeof IC_MO==='object'&&IC_MO){if(IC_MO.duelist&&!IC_MO.dualwield)IC_MO.dualwield=IC_MO.duelist}
/* ---- painted ---- */
(function(){const P=PAINT;
// the main blade (upper right) and the off-hand dagger (upper left), crossed at (cx, cy)
const dwMain=(g,x,y,o)=>pkSword(g,x,y,45,Object.assign({len:17,w:4.4,guard:10,grip:4.6},o||{}));
const dwOff=(g,x,y,o)=>pkSword(g,x,y,-45,Object.assign({len:12,w:4.4,guard:8,grip:4.2,hilt:'brass'},o||{}));
/* medallion */
P['m-dualwield']=g=>paMedal(g,'brass','dark',g=>{dwMain(g,10,23,{len:15,w:4.6,guard:9});dwOff(g,22,23,{len:12,w:4.6,guard:8,mat:'iron'})},.7);
/* abilities */
P['ab-twinstrike']=g=>{dwMain(g,9.6,22.6);dwOff(g,22.4,22.6,{mat:'iron'});pbArcCut(g,16,18,13.4,300,420,3.6,'white');pbImpact(g,16,6.4,3.6,'white',4)};
P['ab-dwfeint']=g=>{dwOff(g,24,22,{mat:'iron',len:11});pbSpeed(g,[[30,10,25,13,1.8],[30,15.6,26,17,1.6]],'teal');dwMain(g,8.6,22.6,{len:16});pkDrop(g,24.6,30.4,7.4,'blood')};
P['ab-bladeflurry']=g=>{pbArcCut(g,16,17,13,205,335,3.8,'white');pbArcCut(g,16,17,9.4,25,155,3.4,'white');dwMain(g,10,22,{len:15});dwOff(g,22,22,{mat:'iron',len:11});pbGlint(g,26.4,6.4,2.2)};
/* passive perks and the capstone */
P['perk-dualwield.1']=g=>{dwOff(g,18,24,{len:13,w:5,guard:9,mat:'iron'});pbChev(g,8,9.6,9,6,2.4,'verd');pbChev(g,8,15.4,9,6,2.4,'verd')};
P['perk-dualwield.3']=g=>{dwMain(g,9,23.6,{len:16});dwOff(g,23,23.6,{len:16,guard:9,hilt:'gold'});pbImpact(g,16,9.6,4.4,'white',4)};
P['perk-dualwield.6']=g=>{pbRing(g,16,17,13.6,13.6,1.6,'gold');dwMain(g,10.4,22.6,{len:14,w:4.4,hilt:'gold'});dwOff(g,21.6,22.6,{len:14,w:4.4,hilt:'gold'});pkPost(g=>pkGlint(g,16,6,2))};
P['perk-dualwield.cap']=g=>{pbGlow(g,16,16,13,'aura',.32);pbArcCut(g,16,16,13.6,200,340,3.6,'gold');pbArcCut(g,16,16,13.6,20,160,3.6,'gold');dwMain(g,10.4,22.6,{len:14,hilt:'gold',mat:'silver'});dwOff(g,21.6,22.6,{len:14,hilt:'gold',mat:'silver'});pkStar(g,16,8,3.8,'gold',5,1.7)};
})();
