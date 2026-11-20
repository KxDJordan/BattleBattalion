/* ================= THE ENTS (Detail High; the user's Ent and Thornling sheets, assets/foes/ent.webp, thornling.webp) =================
   The Ent (EN 'ent', 76n-keyatlas.js ENA) and the Thornling ('thorn', TNA) are 'parts + frames' figures like the orcs (76k-orc.js): the
   drawn frames for walk and flee (the run), attack (a punch, its blow on the reach frame (the 4th) at AN_HIT_AT; Limb crush the same), cast
   (a raised open hand: Entangle, Bramble, Barkskin, any cast), hit and death (held), and the parts rig for the idle (and swap, reload, the
   still sprite), its face an expression by mood (orMood: OR_FACES below), not an idle cycle. The sheets' hands were colour keys (red the
   left hand, blue the right): no weapon is drawn, so assets/make-keyed-atlas.py recoloured them as bark fists and recorded them
   (.hands, ready if a weapon is ever drawn). The Elder ent ('elder') has always shared the Ent's figure (76-monsters.js msElder: the ent
   bigger and darker): it plays the Ent's atlas drawn larger (SHEETS) and darker (tint). No rnd(). */
OR_FACES.ent=OR_FACES.elder=OR_FACES.thorn={calm:'neutral',busy:'bored',cry:'roar',struck:'grit',dying:'shut',shaken:'glare',wounded:'stern',confident:'glare'};
const ENT_FIG={ent:{atl:()=>typeof ENA==='object'?ENA:null,ms:720},elder:{atl:()=>typeof ENA==='object'?ENA:null,ms:760,img:'ent',tint:'rgba(28,34,18,.34)'},
 thorn:{atl:()=>typeof TNA==='object'?TNA:null,ms:560}};
for(const id in ENT_FIG){const E=ENT_FIG[id];OR_FIG[id]={atl:E.atl,sway:{},look:orFace(id)};
 FS_DEF[id]={atl:E.atl,img:E.img,tint:E.tint,rig:(st,t,K,seed,dy,u)=>orRig(id,st,t,K,seed,dy,u),rigSt:{idle:1,swap:1,reload:1},pick:OR_DASH,moodKey:(u,st)=>orMood(u,st),
  an:{walk:{f:'run',loop:1,rate:1},flee:{f:'run',loop:1,rate:1},attack:{f:'attack',imp:3,hit:'melee',ms:E.ms},charge:{f:'run',loop:1,cyc:300},
   cast:{f:'cast',ms:760},hit:{f:'hurt',ms:600},death:{f:'death'}}}}
