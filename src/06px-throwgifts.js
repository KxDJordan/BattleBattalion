/* ================= ICONS for the throwing gifts (MAST.mana_t aura_t qi_t chi_t in 10-data.js; rules: 60p-passives.js) =================
   16 px pixel (Detail Low), as every gift tree: the medallion (m-<tree>) is the ring of the gift's colour around a motif, here a throwing
   axe in flight (IC_MO.gthrow, picked by icMast for a gift tree with aff 'throwing'); each ability (ab-<id>) a composition of drawn icons
   (IC_COMP: the thrown weapon recoloured to the gift, one overlay glyph for what it does); each passive and the capstone (perk-<id>) a
   composition of their own (IC_PKID, 06pv-roles.js) under the tree's colour pip. The thrown weapons are reached through aliases (thr-*),
   since the item icons draw themselves only once ITEMS exists.
   Painted (Detail High): the abilities paint the thrown weapon in the gift's material with its action mark (06pb grammar); the passives the
   art of what they are about, a little smaller, under the gold passive seal with a small emblem (06pv grammar); the medallions a spinning
   throwing axe in the gift's material (06pa grammar). This file only adds entries; nothing else changes its look at either detail. */
/* ---- 16 px pixel ---- */
if(typeof IC_ALIAS==='object')Object.assign(IC_ALIAS,{'thr-knives':'it-tknives','thr-axe':'it-taxe','thr-star':'it-shuriken','thr-ring':'it-chakram','thr-jav':'it-javelin','thr-dart':'it-darts','thr-haxe':'it-francisca'});
const TG_TINT={mana:{q:'F',p:'x',o:'X'},aura:{q:'e',p:'y',o:'Y'},qi:{q:'6',p:'z',o:'Z'},chi:{q:'A',p:'A',o:'B'},ice:{q:'F',p:'F',o:'x'}};
if(typeof IC_COMP==='object')Object.assign(IC_COMP,{
 'ab-conjure':['thr-knives',TG_TINT.mana,'rune','br'],'ab-swarm':['thr-dart',TG_TINT.mana,'x3','br'],
 'ab-ahurl':['thr-axe',TG_TINT.aura,'motion','bl'],'ab-comet':['thr-haxe',TG_TINT.aura,'crack','br'],
 'ab-tstar':['thr-star',TG_TINT.qi,'bolt','br'],'ab-balllight':['thr-ring',TG_TINT.qi,'x3','br'],
 'ab-vthrow':['thr-knives',TG_TINT.chi,'drop','br'],'ab-sever':['thr-jav',TG_TINT.chi,'pin','br']});
if(typeof IC_PKID==='object')Object.assign(IC_PKID,{
 'mana_t.2':['thr-knives',TG_TINT.mana,'up','tr'],'mana_t.3':['ab-mark',null,'plus','br'],'mana_t.4':['skull',null,'rune','br'],'mana_t.5':['thr-knives',null,'plus','br'],'mana_t.cap':['thr-dart',TG_TINT.mana,'star','tr'],
 'aura_t.2':['shield',null,'crack','br'],'aura_t.3':['ranged-lock',null,'motion','bl'],'aura_t.4':['mdef',TG_TINT.aura,'motion','bl'],'aura_t.5':['thr-axe',null,'plus','br'],'aura_t.cap':['thr-axe',TG_TINT.aura,'star','tr'],
 'qi_t.2':['thr-star',TG_TINT.ice,'flake','br'],'qi_t.3':['chill',null,'flame','br'],'qi_t.4':['burn',null,'bolt','br'],'qi_t.5':['thr-star',null,'plus','br'],'qi_t.cap':['thr-ring',TG_TINT.qi,'star','tr'],
 'chi_t.2':['ab-breath',null,'plus','br'],'chi_t.3':['thr-knives',TG_TINT.chi,'dn','br'],'chi_t.4':['chi',null,'eye','br'],'chi_t.5':['bleed',null,'plus','br'],'chi_t.cap':['thr-jav',TG_TINT.chi,'star','tr']});
// the medallion motif: a throwing axe tumbling end over end (head L/M/N in the gift's tones, a wood haft), the arc of its spin in dots
if(typeof IC_MO==='object'&&IC_MO&&!IC_MO.gthrow)IC_MO.gthrow=['................','................','................','..........LLL...','.........LMMMN..','....L...kLMMNN..','...L...kjLMNN...','...L..kj..NN....','....Lkj.........','....kj..........','...kj.......L...','...j.......L....','........LLL.....','................','................','................'];
/* ---- painted ---- */
(function(){if(typeof PAINT!=='object'||!PAINT)return;const P=PAINT;
 const item=(g,id,over)=>{const o=typeof pkcSpec==='function'?pkcSpec(id):null;if(!o)return;const x=Object.assign({},o,over||{});PKC_F[x.f](g,x)};   // an item's painter with its blade in another material
 const at=(g,x,y,a,s,fn)=>pkAt(g,x,y,a,s,g=>{g.translate(-16,-16);fn(g)});
 const knife=(g,mat)=>{const o=Object.assign({},typeof pkcSpec==='function'?pkcSpec('tknives'):{},{len:13,w:4.6,grip:5.4,shape:'knife',gd:'none',pom:'ring',fuller:false,s:1,wrap:'cloth',wrapC:'#3a2a1c',bl:mat,mat});pkcSword(g,o)};
 const spin=(g,mat)=>{pbArcCut(g,16,16,13.4,200,300,2.4,mat,{tail:1,noRim:1})};
 // the abilities
 P['ab-conjure']=g=>{pbGlow(g,18,14,14,'mana',.6);at(g,15,17,0,1,g=>knife(g,'mana'));pkSparkle(g,26,6,4.6,'white');pkSparkle(g,7.5,9,2.6,'mana');pkSparkle(g,24,22,2.2,'mana')};
 P['ab-swarm']=g=>{pbGlow(g,17,15,15,'mana',.55);for(const [a,dx,dy,s] of [[-28,-4.6,2,.8],[28,4.6,2,.8],[0,0,-1,.9]])at(g,16+dx,16+dy,a,s,g=>knife(g,'mana'));pkSparkle(g,27,5,3.6,'white')};
 P['ab-ahurl']=g=>{pbGlow(g,21,11,12,'aura',.6);at(g,18,14,0,.86,g=>item(g,'taxe',{bl:'aura'}));pbSpeed(g,[[2,14,9,12,2.2],[3,20,11,17,2.2],[6,26,13,22,2]],'aura')};
 P['ab-comet']=g=>{pbGlow(g,22,10,13,'aura',.7);pkFill(g,pbTubeF(pkQ(2,30,8,20,18,13,18),pbTaper(6,.4)),'aura',{k:.6,lw:PK.lw*.8});pbImpact(g,26,6,4,'holy',8);at(g,20,12,0,.78,g=>item(g,'francisca',{bl:'aura'}))};
 P['ab-tstar']=g=>{pbGlow(g,14,17,13,'qi',.6);at(g,14,17,15,.8,g=>item(g,'shuriken',{bl:'qi'}));pbBolt(g,25,9,.5,25,'qi');pbBolt(g,26,24,.32,60,'qi')};
 P['ab-balllight']=g=>{pbGlow(g,16,16,15,'qi',.7);at(g,16,16,0,.78,g=>item(g,'chakram',{bl:'qi'}));for(const [x,y,a] of [[5,7,-40],[27,8,40],[26,26,140],[6,25,-140]])pbBolt(g,x,y,.28,a,'qi')};
 P['ab-vthrow']=g=>{pbGlow(g,17,14,12,'chi',.5);at(g,14,17,0,1,g=>knife(g,'chi'));pkDrop(g,25,27,8,'blood');pkSparkle(g,25.5,6,3.4,'chi')};
 P['ab-sever']=g=>{pbGlow(g,18,14,13,'chi',.5);at(g,15,17,0,.95,g=>item(g,'javelin',{bl:'chi'}));pbArcCut(g,22,21,9,110,230,3.2,'blood');pkDrop(g,8,27,6.4,'blood')};
 // the medallions: a throwing axe in flight, in the gift's material, the arc of its spin behind it
 const med=(k,mat)=>{P['m-'+k]=g=>paMedal(g,mat,'dark',g=>{pkLine(g,'M6 23 Q4 12 12 6',2,PKM[mat]?PKM[mat][3]:'#ffffff',.9);pkLine(g,'M26 10 Q28 20 20 26',2,PKM[mat]?PKM[mat][3]:'#ffffff',.9);at(g,16,16,10,.95,g=>item(g,'taxe',{bl:mat}))},.72)};
 med('mana_t','mana');med('aura_t','aura');med('qi_t','qi');med('chi_t','chi');
 // the passives and capstones: the art of what they are about under the gold seal, with an emblem where two would look alike
 const seal=g=>{pkFill(g,pkCirc(25.4,25.4,5.4),'gold',{k:.7,lw:PK.lw*.9});pkFill(g,pkCirc(25.4,25.4,3.4),pkcM('lacquer'),{k:.3,lw:PK.lw*.7});pkLine(g,'M23.4 26.4 L25.4 24.2 L27.4 26.4',1,'#ffd860',1)};
 const EM={up:g=>pkFill(g,pkPoly([5.5,1.5,10,7,7,7,7,10.5,4,10.5,4,7,1,7]),'gold',{k:.4,lw:PK.lw*.7}),
  dn:g=>pkFill(g,pkPoly([5.5,10.5,10,5,7,5,7,1.5,4,1.5,4,5,1,5]),'gold',{k:.4,lw:PK.lw*.7}),
  ring:g=>{pkFill(g,pkCirc(5.5,5.5,4.4),'steel',{k:.4,lw:PK.lw*.7});pkFill(g,pkCirc(5.5,5.5,2.2),pkcM('lacquer'),{k:.2,lw:0})},
  drop:g=>pkDrop(g,5.5,9,4.4,'blood'),bolt:g=>pkFill(g,pkPoly([6.5,1,2,6.5,5,6.5,3.5,11,9,4.5,6,4.5,8,1]),'gold',{k:.4,lw:PK.lw*.7}),
  eye:g=>{pkFill(g,pkS('M1 6 C3 2.4 9 2.4 11 6 C9 9.6 3 9.6 1 6 Z'),'white',{k:.4,lw:PK.lw*.7});pkFill(g,pkCirc(6,6,1.9),'dark',{ball:1,k:.3,lw:0})},
  plus:g=>pkFill(g,pkS('M4.4 1 L7.6 1 L7.6 4.4 L11 4.4 L11 7.6 L7.6 7.6 L7.6 11 L4.4 11 L4.4 7.6 L1 7.6 L1 4.4 L4.4 4.4 Z'),'white',{k:.4,lw:PK.lw*.7}),
  flake:g=>{for(const a of [0,60,120])pkAt(g,5.5,5.5,a,1,g=>pkFill(g,pkRect(-.8,-4.6,1.6,9.2,.6),'frost',{k:.3,lw:PK.lw*.6}))}};
 const from=(base,em)=>g=>{if(P[base])pkAt(g,14,14,0,.82,g=>{g.translate(-16,-16);P[base](g)});if(em&&EM[em])EM[em](g);seal(g)};
 const M={'mana_t.2':['ab-conjure','up'],'mana_t.3':['ab-mark','plus'],'mana_t.4':['skull','drop'],'mana_t.5':['it-tknives','plus'],'mana_t.cap':['ab-swarm','eye'],
  'aura_t.2':['ab-splitshield','bolt'],'aura_t.3':['ranged-lock','dn'],'aura_t.4':['st-offbal','bolt'],'aura_t.5':['it-taxe','plus'],'aura_t.cap':['ab-comet','ring'],
  'qi_t.2':['it-shuriken','flake'],'qi_t.3':['burn','flake'],'qi_t.4':['ab-tstar','plus'],'qi_t.5':['it-shuriken','plus'],'qi_t.cap':['ab-balllight','ring'],
  'chi_t.2':['ab-breath','up'],'chi_t.3':['st-hobbled','drop'],'chi_t.4':['chi','eye'],'chi_t.5':['bleed','plus'],'chi_t.cap':['ab-sever','ring']};
 for(const id in M)P['perk-'+id]=from(M[id][0],M[id][1]);
 // Soul-drinker: the skull of the slain, its mana drawn off in a stream
 P['perk-mana_t.4']=g=>{pbGlow(g,20,10,10,'mana',.5);pkAt(g,14,15,0,.8,g=>{g.translate(-16,-16);P.skull(g)});pkFill(g,pbTubeF(pkQ(17,12,22,6,28,4,12),pbTaper(3.2,.4)),'mana',{k:.4,lw:PK.lw*.8});EM.drop(g);seal(g)}})();
/* the ids above, for the tests and the icon sheet */
const TG_ICONS=['m-mana_t','m-aura_t','m-qi_t','m-chi_t','ab-conjure','ab-swarm','ab-ahurl','ab-comet','ab-tstar','ab-balllight','ab-vthrow','ab-sever'].concat(
 ['mana_t','aura_t','qi_t','chi_t'].flatMap(k=>[2,3,4,5,'cap'].map(t=>'perk-'+k+'.'+t)));
