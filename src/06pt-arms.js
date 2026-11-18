/* ================= ICONS for the masteries update: throwing weapons, the new firearms, Gunnery and Throwing arms (11t-arms.js) =================
   Painted (06p kit; docs/icons-paint-guide.md): every new item in PKC_IT (06pc-specs.js), so the item icon and the weapon in hand at Detail
   High (73l-wpnicons.js hwiSpec) share one spec. Axes, hammers, javelins, pila and the guns use the family painters; knives, darts,
   shuriken, the chakram and the bolas have painters here (f:'fn' for the icon; hand: the in-hand painter of HWI_P, 73l-wpnicons.js).
   Also the abilities (ab-dthrow ab-dcharge ab-tstrike), the statuses (st-hobbled st-offbal st-touched), the tree medallions
   (m-gunner m-thrower) and the family icon (throwing). 16 px pixel fallbacks: the items draw themselves from their battle sprites
   (73-units.js usWgen 'throwing'); the rest are compositions of drawn pixel icons (IC_COMP). This file only adds entries. */
/* ---- 16 px pixel fallbacks ---- */
if(typeof IC_COMP==='object'){Object.assign(IC_COMP,{
 'ab-dthrow':['ab-quick',null,'x2','br'],'ab-dcharge':['w-pistol',null,'up','tr'],'ab-tstrike':['ab-slash',null,'motion','bl'],
 hobbled:['root',null,'dn','br'],offbal:['mdef',null,'dn','br'],touched:['buff',null,'up','tr']})}
if(typeof IC_PKMOD==='object')Object.assign(IC_PKMOD,{smokeDef:'rdef',gunPB:'w-pistol',gunPBHit:'w-pistol',gunSteady:'w-pistol',gunIgn:'w-pistol',gunCrush:'w-pistol',gunLine:'banner',
 ammoB:'bow',recover:'bow',ricochet:'bow',throwRng:'bow',pressHit:'sword',pressDmg:'sword',missAP:'shield',hobbleShot:'root',momentum:'ab-footwork',counter:'riposte',chainHit:'sword',
 follow:'ab-cleave',bindOff:'shield',steadyV:'rallied',seizeAP:'banner',fieldTri:'ab-bandage',farDef:'rdef',furyHit:'ab-rage',overpen:'bow',fistDaze:'daze',clinch:'fist',koDmg:'stun',
 sfHit:'sword',sfDmg:'sword',doomHurt:'skull',cheapBlind:'daze',oppHit:'sword',oppDmg:'sword',afterImg:'mdef',payHit:'sword',payDmg:'sword',pinKillAP:'webbed',crowdDef:'laurel',crowdDmg:'laurel',
 readOpp:'ab-mark',dwBleed:'bleed',dwFlow:'mdef',spellBurn:'burn',echo:'ab-bolt',spellArc:'ab-chain',manaWard:'shield',manaHit:'ab-bolt',manaDmg:'ab-bolt',bindRoot:'root',auraHit:'ab-astrike',
 auraCrush:'ab-crush',auraAdj:'ab-astrike',auraIgn:'ab-astrike',auraDaze:'daze',chillCh:'chill',galeKb:'ab-gale',qiDaze:'daze',staticChg:'ab-tarrow',breathFat:'fatigue',healBuff:'ab-empower',
 healAP:'ab-swift',flowDmg:'fist',ppHead:'ab-pparrow'});
if(typeof IC_PKFLAG==='object')Object.assign(IC_PKFLAG,{drawLoose:'bow',hitRun:'ab-footwork',angel:'undying',deadArc:'bow',noStray:'cover'});
if(typeof IC_MO==='object'&&IC_MO){if(IC_MO.sharpshooter&&!IC_MO.gunner)IC_MO.gunner=IC_MO.sharpshooter;if(IC_MO.marksman&&!IC_MO.thrower)IC_MO.thrower=IC_MO.marksman}
if(typeof IC_ALIAS==='object'&&!IC_ALIAS.throwing)IC_ALIAS.throwing='it-taxe';
/* ---- painted ---- */
const PKT={
 // a fan of three throwing knives (knives: also the darts' fletched heads, the hand painter)
 knives(g,o){const k=Object.assign({},o,{len:11.6,w:4,grip:4.8,shape:'knife',gd:'none',pom:'ring',fuller:false,s:.86,wrap:'cloth',wrapC:o.wrapC||'#3a2a1c'});
  for(const [a,dx,dy] of [[-30,-3.6,1.2],[30,3.6,1.2],[0,0,0]])pkAt(g,16+dx,16+dy,a,1.08,g=>{g.translate(-16,-16);pkcSword(g,k)})},
 darts(g,o){for(const [a,dx] of [[-22,-3],[22,3],[0,0]])pkAt(g,16+dx,17,a,.8,g=>{g.translate(-16,-16);pkcDiag(g,8,12,g=>{const M=pkcM(o.bl);
   pkFill(g,pkRect(-.9,-6,1.8,13,.6),pkcM(o.hf||'wood'),{k:.4,lw:PK.lw*.8});pkFill(g,pkPoly([0,-12,2.2,-6.4,0,-5,-2.2,-6.4]),M,{k:.5});
   for(const s of [-1,1])pkFill(g,pkPoly([0,4.6,s*3.6,7.8,s*2.8,9.6,0,7.4]),'blood',{k:.3,lw:PK.lw*.7})},1)})},
 star(g,o,cx,cy,R){cx=cx==null?16:cx;cy=cy==null?16:cy;R=R||13.4;const S=pkStarS(cx,cy,R,4,R*.32),P=new Path2D();P.addPath(S.p);P.addPath(pkCirc(cx,cy,R*.17).p);
  pkFill(g,{p:P,b:S.b},pkcM(o.bl||'steel'),{rule:'evenodd',k:1.1,inside:(g,m)=>pkHi(g,`M${cx-R*.1} ${cy-R*.85} L${cx-R*.05} ${cy-R*.3}`,.8,.6)});pkPost(g=>pkGlint(g,cx-R*.25,cy-R*.6,1.6))},
 chakram(g,o,cx,cy,R){cx=cx==null?16:cx;cy=cy==null?16:cy;R=R||13;pkFill(g,pdRing(cx,cy,R,R,R*.3),pkcM(o.bl||'steel'),{rule:'evenodd',k:1.1,inside:(g,m)=>pkHi(g,`M${cx-R*.62} ${cy-R*.5} Q${cx-R*.2} ${cy-R*.92} ${cx+R*.32} ${cy-R*.8}`,.8,.6)});
  pkFill(g,pdRing(cx,cy,R*.72,R*.72,R*.12),pkcM(o.fit||'brass'),{rule:'evenodd',k:.4,lw:PK.lw*.8});pkPost(g=>pkGlint(g,cx-R*.6,cy-R*.6,2))},
 bolas(g,o){const C='#6a4a2a';for(const [x,y] of [[7,24],[25,22],[16,7]])pkLine(g,`M16 16.6 Q${(16+x)/2+2} ${(16.6+y)/2-2} ${x} ${y}`,1.4,C,1);
  pkFill(g,pkCirc(16,16.6,2.2),'leather',{k:.4,lw:PK.lw*.8});for(const [x,y] of [[7,24],[25,22],[16,7]])pkFill(g,pkCirc(x,y,4.4),pkcM(o.bl||'iron'),{ball:1,k:.6})},
 // the new guns: a dragon's flared muzzle, an over-and-under pair of barrels
 dragon(g,o){pkcPistol(g,o);pkFill(g,pkS('M27.4 7.4 L31.4 5.2 L31.4 14.2 L27.4 12 Z'),pkcM(o.fit||'brass'),{k:.5,inside:(g,m)=>pkHi(g,'M29 6.8 L29 12.4',.6,.5)})},
 twin(g,o){const bm=pkcM(o.barrel||'iron');pkFill(g,pkRect(5.6,3.6,22.6,3.8,1.3),bm,{k:.7,inside:(g,m)=>pkHi(g,'M7 4.7 L26.8 4.7',.7,.6)});pkFill(g,pkRect(27.4,3.2,2.2,4.6,.7),pkcM(o.fit||'brass'),{k:.3,lw:PK.lw*.8});pkcPistol(g,o)}};
// in-hand painters (local frame: grip at the origin, the weapon along -y, icon units; 73l-wpnicons.js HWI_P)
const PKT_HAND={
 knife:(g,o,G)=>pkcSwordL(g,Object.assign({},o,{len:Math.max(7,G.b||8),grip:Math.max(3.4,G.gl||4),w:3.8,guard:4,shape:'knife',gd:'none',pom:'ring',fuller:false,wrap:'cloth',wrapC:'#3a2a1c'})),
 star:(g,o,G)=>{g.translate(0,-3.6);PKT.star(g,o,0,0,4.6)},
 ring:(g,o,G)=>{g.translate(0,-4.4);PKT.chakram(g,o,0,0,5)},
 bolas:(g,o,G)=>{pkLine(g,'M0 0 L-2.6 5.2 M0 0 L2.4 5.6 M0 0 L0 -4.8',.9,'#6a4a2a',1);for(const [x,y] of [[-2.6,5.6],[2.4,6],[0,-5.2]])pkFill(g,pkCirc(x,y,1.8),pkcM(o.bl||'iron'),{ball:1,k:.4,lw:PK.lw*.7})}};
Object.assign(PKC_IT,{
 tknives:{f:'fn',fn:PKT.knives,hand:'knife'},
 darts:{f:'fn',fn:PKT.darts,hand:'knife'},
 taxe:{f:'ax',a:8.4,b:11,E:6.4,H1:3,H2:4.2,bulge:1.4,hw:2.4,bl:'iron',top:2.6},
 bolas:{f:'fn',fn:PKT.bolas,hand:'bolas'},
 javelin:{f:'sp',hd:'leaf',HL:9,HW:4.4,a:14,b:18,hw:2},
 shuriken:{f:'fn',fn:(g,o)=>PKT.star(g,o),hand:'star',bl:'lacquer'},
 throwhammer:{f:'hm',hd:'war',a:9,b:11.6},
 francisca:{f:'ax',a:9.4,b:12,E:8.6,H1:2.4,H2:7.6,bulge:2.8,hw:2.6,top:2.8},
 pilum:{f:'sp',hd:'tri',HL:12,HW:3.4,a:12,b:19,hw:2.2},
 chakram:{f:'fn',fn:(g,o)=>PKT.chakram(g,o),hand:'ring'},
 hurlbat:{f:'ax',a:9.4,b:12.4,E:8,H1:3,H2:7.4,bulge:1.6,hw:2.6,top:3},
 stormaxes:{f:'ax',a:9.6,b:12.4,E:7.6,H1:4.6,H2:4.6,bulge:2,dbl:1,hw:2.8,runes:'#8ccfff'},
 caliver:{f:'gn',a:13,b:17.6,bands:[-8,0]},
 dragon:{f:'fn',fn:PKT.dragon,hand:'ps',stock:'darkwood'},
 carbine:{f:'gn',a:12.4,b:15.8,bw:2.6,stock:'darkwood'},
 twinpistol:{f:'fn',fn:PKT.twin,hand:'ps',inlay:'silver'},
 jezail:{f:'gn',a:14.4,b:19.6,bw:2,stock:'redlac',bands:[-14,-6,0]},
 wallgun:{f:'gn',a:13.2,b:20,bw:3.2,bell:1,bellMat:'iron',stock:'darkwood'}});
if(typeof PKC_WT==='object')PKC_WT.throwing='taxe';
const PKT_IDS=['tknives','darts','taxe','bolas','javelin','shuriken','throwhammer','francisca','pilum','chakram','hurlbat','stormaxes','caliver','dragon','carbine','twinpistol','jezail','wallgun'];
(function(){const P=PAINT;
 for(const id of PKT_IDS)if(!Object.prototype.hasOwnProperty.call(P,'it-'+id))P['it-'+id]=g=>pkcPaintItem(g,id);   // (this file loads before 11t-arms.js: the ids are listed here)
 P.throwing=g=>pkcPaintItem(g,'taxe');
 P['ab-dthrow']=g=>{pkAt(g,11,18,-20,.7,g=>{g.translate(-16,-16);pkcPaintItem(g,'taxe')});pkAt(g,21,13,20,.7,g=>{g.translate(-16,-16);pkcPaintItem(g,'taxe')});pkLine(g,'M3 28 Q10 20 13 22 M13 12 Q18 6 26 4',1.1,'#f4ead0',.8)};
 P['ab-dcharge']=g=>{pkGlow(g,25,9,9,'#ffb040',.7);pkcPaintItem(g,'pistol');pkFill(g,pkStarS(28,9,4.6,7,2),'fire',{k:.4,lw:PK.lw*.7})};
 P['ab-tstrike']=g=>{pkcPaintItem(g,'taxe');pkLine(g,'M4 6 Q14 4 24 12',1.4,'#f4ead0',.8)};
 P['st-hobbled']=g=>{pkFill(g,pkS('M12 4 L18 4 L18 18 L24 24 L20 28 L13 21 L12 21 Z'),'skin',{k:1});pkFill(g,pkRect(10.6,13,9,3.4,1),'blood',{k:.4});pkLine(g,'M4 26 L10 20 M5 21 L9 25',1.4,PKM.blood[2],1)};
 P['st-offbal']=g=>{pkFill(g,pkS('M16 4 L26 9 L24 22 Q20 27 16 29 Q12 27 8 22 L6 9 Z'),'steel',{k:1});pkLine(g,'M8 26 Q16 18 26 24',1.6,'#ffd27a',1);pkLine(g,'M22 20 L26 24 L21 25',1.2,'#ffd27a',1)};
 P['st-touched']=g=>{pkGlow(g,16,16,13,'#9bd96f',.6);pkFill(g,pkStarS(16,16,12,8,5),'chi',{k:.6})};
 const med=(draw,mat)=>g=>{pkFill(g,pkCirc(16,16,14),mat||'bronze',{k:1.2});pkFill(g,pkCirc(16,16,11),pkcM('lacquer'),{k:.6});pkAt(g,16,16,0,.66,g=>{g.translate(-16,-16);draw(g)})};
 P['m-gunner']=med(g=>pkcPaintItem(g,'pistol'));P['m-thrower']=med(g=>pkcPaintItem(g,'taxe'));
 if(typeof PK_SQ==='object'&&PK_SQ)for(const n of ['st-hobbled','st-offbal','st-touched'])PK_SQ[n]=P[n]})();
/* ---- painted perk icons for the passives that took the place of abilities (the old ability's art, smaller, under a passive seal), and
   the new trees' perks and capstones ---- */
(function(){const P=PAINT;
 const seal=g=>{pkFill(g,pkCirc(25.4,25.4,5.4),'gold',{k:.7,lw:PK.lw*.9});pkFill(g,pkCirc(25.4,25.4,3.4),pkcM('lacquer'),{k:.3,lw:PK.lw*.7});pkLine(g,'M23.4 26.4 L25.4 24.2 L27.4 26.4',1,'#ffd860',1)};
 const from=(base,alt)=>g=>{const b=P[base]?base:P[alt]?alt:null;if(b)pkAt(g,14,14,0,.82,g=>{g.translate(-16,-16);P[b](g)});seal(g)};
 const M={'vanguard.2':'ab-lunge','bulwark.4':'ab-indom','marksman.3':'ab-pin','marksman.5':'ab-quickshot','skirmisher.2':'ab-footwork','skirmisher.4':'ab-adren','duelist.2':'ab-parry',
  'duelist.6':'ab-flurry','brute.2':'ab-cleave','shieldbearer.4':'ab-slam','tactician.2':'ab-warcry','tactician.4':'ab-command','medic.3':'ab-triage','medic.6':'ab-surge','scout.6':'ab-vanish',
  'berserker.6':'ab-whirl','sharpshooter.6':'ab-pshot','brawler.4':'ab-headbutt','brawler.5':'ab-grapple','brawler.6':'ab-haymaker','assassin.2':'ab-shadowstrike','assassin.4':'ab-deathmark',
  'rogue.4':'ab-pocketsand','rogue.6':'ab-backstab','shadow.6':'ab-untouchable','gladiator.2':'ab-taunt','gladiator.5':'ab-showstop','gladiator.6':'ab-crowdroar','champion.2':'ab-feint',
  'dualwield.4':'ab-dwfeint','dualwield.5':'ab-bladeflurry','mana.2':'ab-fireball','mana.3':'ab-bolt','mana.4':'ab-chain','mana_m.2':'ab-manashield','mana_m.3':'ab-blinkstrike',
  'mana_r.3':'ab-avolley','mana_r.4':'ab-bindshot','aura.2':'ab-awave','aura.3':'ab-crush','aura.4':'ab-adash','aura_r.2':'ab-pvolley','aura_r.4':'ab-carrow','qi.2':'ab-frost','qi.3':'ab-gale',
  'qi.4':'ab-thunder','qi_r.2':'ab-iarrow','qi_r.3':'ab-gale','qi_r.4':'ab-tarrow','chi.1':'ab-reinforce','chi.3':'ab-empower','chi.4':'ab-swift','chi_m.3':'ab-hundred','chi_r.3':'ab-pparrow',
  'gunner.1':'ab-blast','gunner.2':'it-dragon','gunner.3':'ab-xaim','gunner.5':'it-musket','gunner.6':'it-caliver','gunner.cap':'it-jezail',
  'thrower.1':'it-tknives','thrower.2':'it-taxe','thrower.4':'it-chakram','thrower.5':'it-javelin','thrower.6':'it-shuriken','thrower.cap':'it-stormaxes','weapons.throwing':'it-taxe','throwing.cap':'it-francisca'};
 for(const id in M)if(!Object.prototype.hasOwnProperty.call(P,'perk-'+id))P['perk-'+id]=from(M[id],'it-arming')})();
