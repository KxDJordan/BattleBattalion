/* ================= ICONS for the rogues' trees (Assassin, Rogue, Shadowdancer; rules in 64r-rogues.js) =================
   Painted (06p kit, docs/icons-paint-guide.md): the medallions m-assassin m-rogue m-shadow, every ability (ab-*), the passive perks
   (perk-<id>, capstones included) and the statuses (st-doomed st-blinded st-blur st-untouchable st-slipaway st-flow). Light from the upper
   left, ink outline from the render pass, one subject and at most one action mark; daggers point to the upper right like the rest of the set.
   16 px pixel fallbacks (Detail Low, and the HD pixel sheet): compositions of drawn pixel icons with a corner glyph (IC_COMP), and the
   perk icons from what each perk improves (IC_PKMOD / IC_PKFLAG -> icPerk). This file only adds entries; it loads after 06-icons and
   the other 06p packages, before anything resolves an icon. */
/* ---- 16 px pixel fallbacks ---- */
Object.assign(IC_COMP,{
 'ab-shadowstrike':['ab-backstab',null,'star','tr'],'ab-deathmark':['ab-mark',null,'skull','br'],'ab-coupdegrace':['dagger',{r:'h',q:'g',p:'f'},'skull','br'],
 'ab-pickpocket':['coin',null,'up','br'],'ab-pocketsand':['fist',null,'eye','tr'],'ab-slipaway':['ab-footwork',null,'dn','tl'],
 'ab-blur':['riposte',{r:'6',q:'5',p:'7'},'motion','bl'],'ab-untouchable':['shielded',null,'star','tr'],
 doomed:['skull',{l:'h',m:'g',n:'f',r:'h'},'dn','br'],blinded:['ab-stunblow',null,'eye','tr'],blur:['ab-blur'],untouchable:['ab-untouchable'],slipaway:['ab-slipaway'],flow:['st-dance',null,'up','br']});
Object.assign(IC_PKMOD,{stabDmg:'ab-backstab',stabHit:'ab-backstab',wakeDmg:'ab-shadowstrike',lightBleed:'bleed',lightPoison:'ab-poison',dirtyDmg:'daze',dirtyHit:'daze',flow:'st-dance',readInit:'init',firstHit:'init',firstDmg:'init'});
if(typeof IC_MO==='object'&&IC_MO){if(IC_MO.duelist&&!IC_MO.assassin)IC_MO.assassin=IC_MO.duelist;if(IC_MO.brawler&&!IC_MO.rogue)IC_MO.rogue=IC_MO.brawler;if(IC_MO.skirmisher&&!IC_MO.shadow)IC_MO.shadow=IC_MO.skirmisher}   // medallion motifs of the pixel set
Object.assign(IC_PKFLAG,{lightFingers:'coin',quickstep:'ab-footwork'});
/* ---- painted ---- */
(function(){const P=PAINT;
const RG_NIGHT=['#07080d','#161a26','#2a3044','#424a66','#7a86ac'];   // the assassin's cloak: night blue-black
const rgDagger=(g,x,y,a,o)=>{o=o||{};pkSword(g,x,y,a,{len:o.len||13,w:o.w||4.6,guard:o.guard||8,grip:o.grip||4.4,mat:o.mat,hilt:o.hilt||'brass',tip:o.tip})};
// a hooded head and shoulders, facing us, the face in shadow (cloak material m)
const rgHood=(g,x,y,s,m)=>pkAt(g,x,y,0,s||1,g=>{g.translate(-16,-16);
 pkFill(g,pkS('M3 31 C3 22 6 17.4 10.4 15.6 C10 8.6 12.6 4 16 4 C19.4 4 22 8.6 21.6 15.6 C26 17.4 29 22 29 31 Z'),m||RG_NIGHT,{k:1.6,inside:(g,mm)=>{pkHi(g,'M11.6 13 Q12 7.4 15.4 5.6',1.2,.5);pkLine(g,'M10.4 15.6 C13 18.4 19 18.4 21.6 15.6',1,mm[0],.7)}});
 pkFill(g,pkEll(16,13.6,3.6,4.4),'dark',{lw:.6,noRim:1,k:.4});g.fillStyle='#e6f0ff';g.globalAlpha=.9;g.fill(pkCirc(14.6,13.4,.75).p);g.fill(pkCirc(17.4,13.4,.75).p);g.globalAlpha=1});
// a leather coin purse with a drawstring
const rgPurse=(g,x,y,s)=>pkAt(g,x,y,0,s||1,g=>{g.translate(-16,-16);
 pkFill(g,pkS('M10.4 9.6 Q16 12 21.6 9.6 L23.4 12 C29 16 29.4 26 24 29 Q16 31.6 8 29 C2.6 26 3 16 8.6 12 Z'),'leather',{k:1.8,inside:(g,m)=>{pkHi(g,'M7.8 17 Q8.4 13.6 11 12.4',1.4,.5);pkLine(g,'M9 13.4 Q16 15.6 23 13.4',.9,m[0],.7)}});
 pkFill(g,pkS('M11 4 Q16 6.6 21 4 L21.6 9.8 Q16 12.2 10.4 9.8 Z'),'leather',{k:.8,inside:(g,m)=>pkLine(g,'M12.6 5.4 L12.4 9.6 M16 6.2 L16 10.6 M19.4 5.4 L19.6 9.6',.7,m[0],.6)});
 pkFill(g,pkTube([10.4,10.4,16,12.6,21.6,10.4],1.7,'round'),'brass',{k:.3,lw:.7})});
/* medallions (paMedal: brass ring, dark field, the emblem) */
P['m-assassin']=g=>paMedal(g,'brass','dark',g=>{rgDagger(g,10,22,45,{len:17,w:5.4,guard:10,grip:5});pkDrop(g,24.5,30,9,'blood')},.66);
P['m-rogue']=g=>paMedal(g,'brass','dark',g=>{pkFill(g,pkS('M2 13 C6 8.6 12 9 16 12.4 C20 9 26 8.6 30 13 C29.6 19 26 22.6 21 22 C18.6 21.6 17.4 19.4 16 18 C14.6 19.4 13.4 21.6 11 22 C6 22.6 2.4 19 2 13 Z'),'cloth',{k:1.4,inside:(g,m)=>{pkHi(g,'M4.6 13 Q7 10.4 11 10.6',1.2,.55)}});
 for(const x of [9.6,22.4])pkFill(g,pkEll(x,15.4,3.3,2.3),'dark',{lw:.6,noRim:1,k:.3})},.72);
P['m-shadow']=g=>paMedal(g,'brass','dark',g=>{pkFill(g,pkS('M20 2.5 C11 3.6 5 10.8 5 18.4 C5 25.4 10.6 30.6 18.4 30.6 C23.4 30.6 27.4 28.4 29.6 24.6 C27.6 25.6 25.4 26.2 23 26.2 C15.4 26.2 10.6 20.6 10.6 14 C10.6 8.6 14.4 4.4 20 2.5 Z'),'silver',{k:1.4,inside:(g,m)=>pkHi(g,'M8.4 15 Q9.2 8.6 15 5.6',1.3,.55)});
 for(const [x,y,w] of [[18,12,7],[20,18,8.5],[18,24,7]])pkLine(g,`M${x} ${y} L${x+w} ${y}`,1.7,PKM.teal[3],.9)},.72);
/* abilities */
P['ab-shadowstrike']=g=>{pbGlow(g,11,19,11,'void',.45);rgHood(g,11.5,18,.8);rgDagger(g,15,21,45,{len:12,w:4.6});pbImpact(g,27,6.6,4.2,'white',4)};
P['ab-deathmark']=g=>{pbRing(g,16,16,13.4,13.4,2.4,'blood');for(const [x,y,w,h] of [[14.6,.8,2.8,5.4],[14.6,25.8,2.8,5.4],[.8,14.6,5.4,2.8],[25.8,14.6,5.4,2.8]])pkFill(g,pkRect(x,y,w,h,.9),'blood',{k:.3});pkSkull(g,16,16.6,.86,'bone')};
P['ab-coupdegrace']=g=>{pbArcCut(g,30,4,24,200,262,4.4,'blood');rgDagger(g,16,9.5,180,{len:14,w:5,guard:9,grip:4.6});pkDrop(g,8,30,9,'blood');pkDrop(g,25,29,7,'blood')};
P['ab-pickpocket']=g=>{rgPurse(g,13,17,.84);pkCoin(g,25,9,4.6,'gold');pkCoin(g,20.6,4.6,3.4,'gold');pbSpeed(g,[[30.5,15,24.5,13.6,1.8],[30.5,20.5,25,19.4,1.8]]);pbGlint(g,23.6,7.6,2.2)};
P['ab-pocketsand']=g=>{pbFist(g,9.5,22,.62,'skin');const S=[];for(const [x,y,r] of [[18,15,2.1],[21.6,11.4,1.8],[24,16,1.9],[26.6,9,1.6],[28.4,14,1.5],[22.6,6.4,1.3],[19.6,9,1.4],[26,21,1.4]])S.push(pkCirc(x,y,r));
 pkFill(g,pkU.apply(null,S),'vellum',{k:.4,lw:PK.lw*.8});pbSpeed(g,[[13,10,19,6,1.6]],'vellum')};
P['ab-slipaway']=g=>{for(const [x,y,r] of [[6,25,4.4],[10.4,28,3.6],[4,19.6,3]])pkFill(g,pkCirc(x,y,r),'stone',{ball:1,k:.5,lw:PK.lw*.8});pkFill(g,pbTubeF(pkQ(5,13,15,2,29,8,22),pbTaper(4.2,.6)),'teal',{k:.6,lw:PK.lw*.85});pbBoot(g,20,19,.66)};
P['ab-blur']=g=>{pbArcCut(g,16,16,12.6,205,335,4.2,'teal');pbArcCut(g,16,16,12.6,25,155,4.2,'teal');rgDagger(g,10.6,21.4,45,{len:13,w:4.6});pbGlint(g,25.6,6.4,2.2)};
P['ab-untouchable']=g=>{pbRing(g,16,17,14,14,1.6,'teal');rgHood(g,16,17.4,.74);pbSpeed(g,[[1,10,6,13,1.8],[31,10,26,13,1.8]]);pbGlint(g,26.4,26,2.4)};
/* passive perks (the talent cards; capstones too) */
P['perk-assassin.1']=g=>{rgHood(g,13,18,.86);rgDagger(g,17,23,45,{len:12,w:4.6});pkDrop(g,27,31,7,'blood')};
P['perk-assassin.3']=g=>{pkFill(g,pkS('M3 12 Q13 21 23 12 Q13 17.4 3 12 Z'),'white',{k:.6});for(const x of [6,10,14,18])pkLine(g,`M${x} ${15.4+(x===6||x===18?-.6:0)} L${x-.8} ${18.6}`,1.1,PK.ink);
 rgDagger(g,13,29,45,{len:12,w:4.4});pkFill(g,pkS('M23 2 L30 2 L30 3.8 L25.6 8 L30 8 L30 10 L23 10 L23 8.2 L27.4 4 L23 4 Z'),'teal',{k:.3,lw:.7})};
P['perk-assassin.5']=g=>{rgDagger(g,10,22,45,{len:15,w:5,guard:9});pkDrop(g,24,20,8,'blood');pkDrop(g,28.6,29,7,'blood');pkDrop(g,19,30.4,6,'blood')};
P['perk-assassin.cap']=g=>{pkSkull(g,16,18,1.05,'bone');rgDagger(g,7,26,45,{len:21,w:4.6,hilt:'gold',guard:9});pbGlow(g,16,18,12,'blood',.35)};
P['perk-rogue.1']=g=>{for(const [x,y] of [[11,26],[11,22],[11,18]])pkFill(g,pkEll(x,y,8.4,3.2),'gold',{k:.6,inside:(g,m)=>pkLine(g,`M${x-7} ${y} L${x+7} ${y}`,.6,m[1],.6)});pkCoin(g,22.6,12.6,6.4,'gold');pkSparkle(g,26.6,4.6,3.4,'white')};
P['perk-rogue.3']=g=>{pbGlow(g,19,13,9,'poison',.5);rgDagger(g,10,22,45,{len:16,w:5,guard:9});pkDrop(g,26,30,9,'poison');pkDrop(g,20.6,24,6,'poison')};
P['perk-rogue.5']=g=>{pkAt(g,13,13,32,1,g=>pbBoot(g,0,0,.78));pbImpact(g,24,25,5.6,'aura');pkFill(g,pdArrow(26.5,2,26.5,13.5,3.4,8,5),'blood',{k:.5})};
P['perk-rogue.cap']=g=>{pkFill(g,pkS('M4 24 L6 9 L11.4 15.6 L16 6 L20.6 15.6 L26 9 L28 24 Z'),'gold',{k:1.2,inside:(g,m)=>{pkHi(g,'M7.4 12 L8 20',1.1,.5);for(const x of [10,16,22])pkFill(g,pkCirc(x,20,1.5),'cloth',{ball:1,k:.3,lw:.5})}});pkFill(g,pkRect(3.4,23.4,25.2,4.6,1.2),'gold',{k:.5});pkCoin(g,25.6,25.6,5,'gold')};
P['perk-shadow.1']=g=>{pkFill(g,pkS('M27 2.6 C17 4 9.6 12 7.6 24.6 L5 29.6 L7 30 L9.6 25.2 C20 23 26 15 27 2.6 Z'),'white',{k:1.2,inside:(g,m)=>{pkLine(g,'M24 6 L9 26',.9,m[1],.8);for(let i=0;i<5;i++){const t=.18+i*.15,x=24-15*t,y=6+20*t;pkLine(g,`M${x} ${y} L${x+4} ${y+1.6}`,.6,m[1],.6)}}});pbSpeed(g,[[1,9,8,9,1.8],[1,15,6,15,1.8]])};
P['perk-shadow.3']=g=>{pkSwirl(g,16,16,13,'teal',1.7);pkFill(g,pkCirc(16,16,2.4),'white',{ball:1,k:.4})};
P['perk-shadow.4']=g=>{rgDagger(g,7,29,45,{len:25,w:4.6,guard:9});pdEye(g,18.6,12.6,10,4.4,'teal')};
P['perk-shadow.5']=g=>{pbBolt(g,18,16,1,12,'aura');pbChev(g,7,9,9,6,2.4,'white');pbChev(g,7,16,9,6,2.4,'white')};
P['perk-shadow.cap']=g=>{P['m-shadow']&&pkAt(g,16,16,0,1.08,g=>{g.translate(-16,-16);pkFill(g,pkS('M20 2.5 C11 3.6 5 10.8 5 18.4 C5 25.4 10.6 30.6 18.4 30.6 C23.4 30.6 27.4 28.4 29.6 24.6 C27.6 25.6 25.4 26.2 23 26.2 C15.4 26.2 10.6 20.6 10.6 14 C10.6 8.6 14.4 4.4 20 2.5 Z'),'silver',{k:1.4})});rgHood(g,21,22,.44);pbGlow(g,20,20,10,'qi',.4)};
/* statuses (the overhead squares paint these glyphs too) */
P['st-doomed']=g=>{pkFill(g,pkU(pdRing(16,16,13.6,13.6,3),pkRect(14.4,.8,3.2,6.4,1),pkRect(14.4,24.8,3.2,6.4,1),pkRect(.8,14.4,6.4,3.2,1),pkRect(24.8,14.4,6.4,3.2,1)),'blood',{k:.8});pkSkull(g,16,16.6,.8,'bone')};
P['st-blinded']=g=>{pdEye(g,16,15,12,5.2,'blue');const S=[];for(const [x,y,r] of [[8,9,3.4],[13,6.6,2.8],[19,6,3.2],[24.6,8.4,3],[11,23.6,2.6],[21.6,24,2.8]])S.push(pkCirc(x,y,r));pkFill(g,pkU.apply(null,S),'vellum',{k:.4,lw:PK.lw*.8})};
P['st-blur']=P['ab-blur'];P['st-untouchable']=P['ab-untouchable'];P['st-slipaway']=P['ab-slipaway'];P['st-flow']=P['perk-shadow.3'];
for(const [n,f] of [['st-doomed',P['st-doomed']],['st-blinded',P['st-blinded']]])if(typeof PK_SQ==='object'&&PK_SQ)PK_SQ[n]=f;
})();
