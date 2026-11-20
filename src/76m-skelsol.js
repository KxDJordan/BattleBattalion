/* ================= THE SKELETON SOLDIERS (Detail High; the user's Skeleton soldier sheet, assets/foes/skeleton-soldier.webp) =================
   The Skeleton legionary (EN 'skel') and the Skeleton halberdier ('skelhal') share one sheet (76l-skelatlas.js SKA): drawn frames for
   walk and flee (the run), attack (a strike with the weapon hand, its reach frame (4) at AN_HIT_AT), cast (an open-hand gesture), hit
   and death (held), and the orcs' parts rig for the idle (76k-orc.js orRig, with the sheet's heads: neutral, now and then a glare or a
   smug look). The sheet draws no weapon and no shield: its fists were colour keys (red the shield hand, blue the weapon hand), found,
   recoloured to bone and recorded by assets/make-skel-atlas.py. Here each frame is dressed with the unit's own gear, as its pixel
   figure carries it (73-units.js usLook: the legionary's short sword and tower shield, the halberdier's halberd, a swapped weapon, a
   broken shield gone), drawn with the people's weapon and shield art (73k-humans.js humDrawWAny / humDrawShield, the painted weapon
   icons at Detail High):
   - a one-handed weapon in the weapon fist at the frame's arm angle (wa1: along a raised or thrust arm, tilted up from a hanging one),
     under the figure (the fist closes over its grip); the shield on the shield fist, over the figure;
   - a two-handed weapon (the halberd) through both fists (wa2: the shield fist to the weapon fist; its head just past the weapon fist, the haft
     back through the shield fist), under the figure; no shield. The shield lies down with the falling body.
   The gear is drawn in the people's units (SU, 1/HUM_A per art px): a skeleton's sword is a man's sword. The Orc warlord and the Orc
   brave (76k-orc.js) are dressed by the same skDress from their own atlases' hands (the warlord's lordaxe two-handed, the brave's hand
   axe). No rnd(). */
OR_FIG.skel={atl:()=>typeof SKA==='object'?SKA:null,sway:{},look:(t,seed)=>{const c=((t+(seed||0))%4+4)%4;return c>=2.2&&c<2.6?'head_glare':c>=3.3&&c<3.65?'head_smug':'head_neutral'}};
const SK_GEAR={skel:{w:'shortsword',sh:'tower'},skelhal:{w:'halberd',sh:null},orcl:{w:'lordaxe',sh:null,gs:1.5},orcy:{w:'handaxe',sh:null}};
const SK_BK=new Map();
// the unit's gear: its look's weapon (and the painted icon's info) and shield; without a unit, the type's own
function skGear(id,u){let S=null;try{S=u&&typeof usLook==='function'?usLook(u).S:null}catch(e){S=null}
 const W=S&&S.wd||usWdef(SK_GEAR[id].w),wi=typeof humWIc==='function'?humWIc(W,S&&S.wdI):humWInfo(W);
 return{W,wi,two:!!(W.two||wi.fam==='polearm'||wi.fam==='spear'&&W.two),sh:S?S.shield||null:SK_GEAR[id].sh,shR:S&&S.shR||usCloth('red'),crack:S&&S.shCrack?1:0}}
function skBake(key,Ksu,ext,fn){const k=key+':'+Ksu;let a=SK_BK.get(k);if(a!==undefined)return a;a=hskBake(Ksu,ext,fn);SK_BK.set(k,a);if(SK_BK.size>64)SK_BK.delete(SK_BK.keys().next().value);return a}
function skDress(Fr,id,u,K,row,i,dy){if(!K)return;const A=FS_DEF[id].atl(),H=row?A.hands[row]&&A.hands[row][i]:A.rh;if(!H)return;const G=skGear(id,u),gs=SK_GEAR[id].gs||1,sc=Fr.sc/gs,Ksu=K/sc,inv=1/sc;   // gs: the gear drawn larger than a man's (the warlord's great axe in his big fists)
 const bob=row?0:(Fr.pose&&Fr.pose.bob||0),pt=p=>[p[0],p[1]+(dy||0)+bob],under=[],over=[];
 const put=(L,p,deg,att,tag)=>{if(!att)return;const g=new HskRec();g.translate(p[0],p[1]);g.rotate(deg*Math.PI/180);g.scale(inv,inv);g.img(att,tag);L.push(g.list[0])};
 if(H.w){const two2=G.two&&H.wa2!=null&&H.s,ang=two2?H.wa2:G.two?H.wa1-25:H.wa1;
  let o=pt(H.w);if(G.two){const k=(G.wi.len-110)*inv,a=ang*Math.PI/180;o=[o[0]-Math.cos(a)*k,o[1]-Math.sin(a)*k]}   // a two-hander's head 110 SU past the weapon fist, its haft back through the other
  put(under,o,ang,skBake('w:'+G.wi.id+':'+(G.wi.ic?1:0),Ksu,[-260,-200,620,200],g=>humDrawWAny(g,G.wi,{})),'weapon')}
 if(G.sh&&!G.two&&H.s)put(over,pt(H.s),row==='death'?[0,0,10,40,80,90,90][i]||0:0,skBake('s:'+G.sh+':'+G.crack+':'+(G.shR&&G.shR.join?G.shR.join(''):''),Ksu,[-130,-150,130,150],g=>humDrawShield(g,G.sh,G.shR,true,G.crack)),'shield');
 Fr.list=under.concat(Fr.list,over);Fr.tags=Fr.tags.concat(under.length?['weapon']:[],over.length?['shield']:[]);Fr.gear={two:G.two,w:G.wi.id,sh:G.sh}}
for(const id of['skel','skelhal'])FS_DEF[id]={atl:OR_FIG.skel.atl,rig:(st,t,K,seed,dy)=>orRig('skel',st,t,K,seed,dy),rigSt:{idle:1,swap:1,reload:1},pick:OR_DASH,dress:skDress,
 dressKey:u=>{const G=skGear(id,u);return G.wi.id+':'+G.sh+':'+G.crack},
 an:{walk:{f:'run',loop:1,rate:1},flee:{f:'run',loop:1,rate:1},attack:{f:'attack',imp:3,hit:'melee',ms:560},charge:{f:'run',loop:1,cyc:300},
  cast:{f:'cast',ms:760},hit:{f:'hurt',ms:600},death:{f:'death'}}};
// the Orc warlord and the Orc brave (76k-orc.js, 76n-keyatlas.js OLA / OYA): their colour-keyed hands dressed the same way
for(const id of['orcl','orcy'])if(FS_DEF[id])Object.assign(FS_DEF[id],{dress:skDress,dressKey:u=>{const G=skGear(id,u);return G.wi.id+':'+G.sh+':'+G.crack}});
