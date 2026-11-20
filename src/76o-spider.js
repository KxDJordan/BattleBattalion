/* ================= THE WEBSPINNER (Detail High; the user's forest and sand spider sheets, assets/foes/forest-spider.webp, sand-spider.webp) =================
   The Webspinner (EN 'spider') plays the user's drawn frames (76g-frames.js; atlases 76n-spideratlas.js: SPA the forest spider, SSA the
   sand spider): walk and flee = the run (8 frames); attack = the bite (Venom bite the same), its low forward strike (frame 5) at AN_HIT_AT;
   a charge's dash runs; cast = rear up and spit (Spit web and any other cast), the spitting frame (4) when the web leaves (60 ms, 75-fx.js
   'web'); hit = the hurt row; death held on its last frame (the legs curled). The idle (and swap, reload, the still sprite) is the orcs'
   parts rig (76k-orc.js orRig) from the sheet's parts: eight legs planted on the ground, the plate, the head and the abdomen riding the
   breath (the abdomen swelling with it), sized and centred on the run row's first frame. Faces: the part row's head (round red eyes, as
   the frames draw it) at rest, now and then a glow of the eyes or a squint (from the unit's id); the angry, fury, glare, hurt and dead
   heads stay in the atlases (the frame rows draw their own faces).
   Which sheet: the sand spider ('sspider', an FS_DEF entry of its own, SHEETS.sspider its size) when the battle is fought on desert
   ground (B.bk 'desert'; a unit's spv 'sand' / 'forest' overrides), the forest spider everywhere else. Same unit, same stats and name.
   No rnd(). */
const SP_LEGS={leg_l1:1,leg_l2:1,leg_l3:1,leg_l4:1,leg_r1:1,leg_r2:1,leg_r3:1,leg_r4:1};
function spLook(t,seed){const c=((t+(seed||0))%4+4)%4;return c>=2.1&&c<2.5?'head_glow':c>=3.4&&c<3.6?'head_squint':'head_neutral'}
OR_FIG.spider={atl:()=>typeof SPA==='object'?SPA:null,sway:{},legs:SP_LEGS,breathe:'abdomen',look:spLook};
OR_FIG.sspider={atl:()=>typeof SSA==='object'?SSA:null,sway:{},legs:SP_LEGS,breathe:'abdomen',look:spLook};
// the sheet a Webspinner is drawn from: the sand spider in a desert battle
function spVary(u){const v=u&&u.spv;if(v)return v==='sand'?'sspider':'';return typeof B==='object'&&B&&B.bk==='desert'?'sspider':''}
for(const id of['spider','sspider'])FS_DEF[id]={atl:OR_FIG[id].atl,rig:(st,t,K,seed,dy)=>orRig(id,st,t,K,seed,dy),rigSt:{idle:1,swap:1,reload:1},pick:OR_DASH,vary:spVary,
 an:{walk:{f:'run',loop:1,rate:1},flee:{f:'run',loop:1,rate:1},attack:{f:'attack',imp:4,hit:'melee',ms:620},charge:{f:'run',loop:1,cyc:300},
  cast:{f:'cast',from:2,imp:3,hit:'web',ms:760},hit:{f:'hurt',ms:600},death:{f:'death'}}};
