/* ================= ICONS for the roles update (rules: 64v-roles.js; the trees: MAST in 10-data.js) =================
   16 px pixel (Detail Low): a perk's icon is the drawn icon of its first mod key (IC_PKMOD) with the tree's colour pip, as every passive;
   the new keys are mapped to drawn icons here, and the new status (Suppressed) is a composition of drawn icons (IC_COMP).
   Painted (Detail High): every new or changed perk gets perk-<id> in the manner of the masteries update (06pt-arms.js): the painted art of
   what it is about, a little smaller, under the gold passive seal, with a small emblem of its role where two perks would look alike.
   This file only adds entries. */
if(typeof IC_PKMOD==='object')Object.assign(IC_PKMOD,{chargeHit:'ab-lunge',chargeDmg:'ab-lunge',shock:'ab-warcry',shakenHit:'morale-1',shakenDmg:'morale-1',killFear:'skull',
 holdDef:'ab-indom',holdMit:'armor-heavy',armDmg:'ab-batter',shelter:'shieldwall',intercept:'ab-slam',isoHit:'ab-mark',isoDmg:'ab-mark',duelDef:'riposte',mvDef:'st-fleet',
 twoIgn:'ab-crush',twoCrush:'ab-crush',sweep:'ab-whirl',twoDaze:'daze',hurtDmg:'bleed',mvShot:'ab-quickshot',suppress:'ab-pin',bowDmg:'ab-pin',holdHit:'ab-aimed',holdHead:'ab-aimed',
 primeHit:'ab-reload',primeDmg:'ab-reload',mixHit:'ab-tstrike',mixDmg:'ab-tstrike',ordersAP:'ab-command',healLow:'ab-surge',shrug:'ab-poison',spotMark:'st-marked',arrowBurn:'burn',
 zocHit:'w-halberd'});
if(typeof IC_COMP==='object')Object.assign(IC_COMP,{suppr:['ab-pin',null,'dn','br']});
/* perks whose first key's drawn icon would not read as what they are: a composition of drawn icons of their own, with the tree's pip
   (Immovable: plate planted, a down arrow; Juggernaut: plate charging, motion lines). Only these ids; every other perk icon is untouched. */
const IC_PKID={'heavyarmor.1':['armor-heavy',null,'dn','br'],'heavyarmor.3':['armor-heavy',null,'motion','bl']};
if(typeof icPerk==='function'&&!icPerk.rl){const ip0=icPerk;icPerk=function(id){const c=IC_PKID[id];if(c&&typeof icCompose==='function'){const rows=icCompose(...c);
  if(rows){const T=MAST&&MAST[String(id).split('.')[0]],k=IC_TREEK[icTreeTone(T)]||IC_TREEK.brass;return icStamp(rows,_icMap(IC_PIP,{L:k.d,M:k.c,N:k.b}),'tl')}}return ip0(id)};icPerk.rl=1}
(function(){if(typeof PAINT!=='object'||!PAINT)return;const P=PAINT;
 const seal=g=>{pkFill(g,pkCirc(25.4,25.4,5.4),'gold',{k:.7,lw:PK.lw*.9});pkFill(g,pkCirc(25.4,25.4,3.4),pkcM('lacquer'),{k:.3,lw:PK.lw*.7});pkLine(g,'M23.4 26.4 L25.4 24.2 L27.4 26.4',1,'#ffd860',1)};
 // small emblems in the upper left: what sets the perk apart from its tree's others
 const EM={
  up:g=>pkFill(g,pkPoly([5.5,1.5,10,7,7,7,7,10.5,4,10.5,4,7,1,7]),'gold',{k:.4,lw:PK.lw*.7}),                    // forward
  ring:g=>{pkFill(g,pkCirc(5.5,5.5,4.4),'steel',{k:.4,lw:PK.lw*.7});pkFill(g,pkCirc(5.5,5.5,2.2),pkcM('lacquer'),{k:.2,lw:0})},   // held ground
  drop:g=>pkDrop(g,5.5,9,4.4,'blood'),
  bolt:g=>pkFill(g,pkPoly([6.5,1,2,6.5,5,6.5,3.5,11,9,4.5,6,4.5,8,1]),'gold',{k:.4,lw:PK.lw*.7}),
  eye:g=>{pkFill(g,pkS('M1 6 C3 2.4 9 2.4 11 6 C9 9.6 3 9.6 1 6 Z'),'white',{k:.4,lw:PK.lw*.7});pkFill(g,pkCirc(6,6,1.9),'dark',{ball:1,k:.3,lw:0})},
  dn:g=>pkFill(g,pkPoly([5.5,10.5,10,5,7,5,7,1.5,4,1.5,4,5,1,5]),'gold',{k:.4,lw:PK.lw*.7}),                    // planted
  plus:g=>pkFill(g,pkS('M4.4 1 L7.6 1 L7.6 4.4 L11 4.4 L11 7.6 L7.6 7.6 L7.6 11 L4.4 11 L4.4 7.6 L1 7.6 L1 4.4 L4.4 4.4 Z'),'white',{k:.4,lw:PK.lw*.7})};
 const from=(base,em)=>g=>{if(P[base])pkAt(g,14,14,0,.82,g=>{g.translate(-16,-16);P[base](g)});if(em&&EM[em])EM[em](g);seal(g)};
 // Suppressed: arrows standing in the ground around a cowering helm
 P['st-suppr']=g=>{pkFill(g,pkS('M8 22 Q8 12 16 11 Q24 12 24 22 Z'),'steel',{k:1});pkFill(g,pkRect(6,21,20,3.4,1),'darkwood',{k:.4});
  for(const [x,a] of [[5,-14],[14,4],[25,16]])pkAt(g,x,14,a,1,g=>{pkFill(g,pkRect(-.7,-11,1.4,12,.4),'wood',{k:.3,lw:PK.lw*.7});pkFill(g,pkPoly([0,-12.5,2.2,-9,-2.2,-9]),'cloth',{k:.3,lw:PK.lw*.7})})};
 if(typeof PK_SQ==='object'&&PK_SQ)PK_SQ['st-suppr']=P['st-suppr'];
 const M={'vanguard.1':['ab-lunge','up'],'vanguard.3':['ab-warcry','bolt'],'vanguard.5':['morale-1','up'],'vanguard.6':['ab-decap','drop'],
  'bulwark.2':['armor-heavy','ring'],'bulwark.5':['ab-batter','bolt'],'bulwark.cap':['armor-heavy','plus'],
  'marksman.1':['ab-quickshot','up'],'marksman.6':['st-suppr',null],'skirmisher.3':['st-fleet','up'],'duelist.3':['ab-mark','eye'],'duelist.5':['riposte','ring'],
  'brute.3':['ab-crush',null],'brute.4':['ab-whirl',null],'brute.5':['daze','bolt'],'shieldbearer.3':['shieldwall','plus'],'shieldbearer.5':['ab-slam','up'],
  'tactician.5':['ab-command','up'],'survivor.4':['ab-poison','up'],'medic.5':['ab-surge','plus'],'scout.5':['st-marked','eye'],'berserker.4':['enraged','drop'],
  'sharpshooter.5':['ab-aimed','ring'],'gunner.3':['ab-reload','bolt'],'thrower.5':['ab-tstrike','up'],'qi_r.2':['ab-farrow',null],'chi_m.5':['ab-reinforce','ring'],
  'weapons.sword':['sword','ring'],'weapons.axe':['axe','bolt'],'weapons.mace':['mace','bolt'],'weapons.dagger':['dagger','drop'],'weapons.spear':['spear','up'],'weapons.shield':['shield','plus'],
  'medarmor.1':['armor-medium','plus'],'heavyarmor.1':['armor-heavy','dn'],'heavyarmor.2':['armor-heavy','plus'],'heavyarmor.3':['armor-heavy',null]};
 for(const id in M)P['perk-'+id]=from(M[id][0],M[id][1]);
 // Juggernaut: the plate charging forward, speed lines behind it
 P['perk-heavyarmor.3']=g=>{pkLine(g,'M1.5 9 L8 9 M0.5 14.5 L7 14.5 M1.5 20 L8 20',1.8,'#ffffff',.85);if(P['armor-heavy'])pkAt(g,17,14,-8,.8,g=>{g.translate(-16,-16);P['armor-heavy'](g)});seal(g)}})();
/* the ids above, for the tests and the icon sheet */
const RL_ICONS=['vanguard.1','vanguard.3','vanguard.5','vanguard.6','bulwark.2','bulwark.5','bulwark.cap','marksman.1','marksman.6','skirmisher.3','duelist.3','duelist.5',
 'brute.3','brute.4','brute.5','shieldbearer.3','shieldbearer.5','tactician.5','survivor.4','medic.5','scout.5','berserker.4','sharpshooter.5','gunner.3','thrower.5','qi_r.2','chi_m.5',
 'weapons.sword','weapons.axe','weapons.mace','weapons.dagger','weapons.spear','weapons.shield','medarmor.1','heavyarmor.1','heavyarmor.2','heavyarmor.3'];
