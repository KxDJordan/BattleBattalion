/* ================= THE WEBSPINNER (Detail High; the user's forest and sand spider sheets, assets/foes/forest-spider.webp, sand-spider.webp) =================
   The Webspinner (EN 'spider') plays the user's drawn frames (76g-frames.js; atlases 76n-spideratlas.js: SPA the forest spider, SSA the
   sand spider): walk and flee = the run (8 frames); attack = the bite (Venom bite the same), its low forward strike (frame 5) at AN_HIT_AT;
   a charge's dash runs; cast = rear up and spit (Spit web and any other cast): the crouch and rear-up in the 60 ms before the web
   leaves (75-fx.js 'web'), the spitting frame (4) as it does, then the settle; hit = the hurt row; death held on its last frame (the
   legs curled). The idle (and swap, reload, the still sprite) is the orcs'
   parts rig (76k-orc.js orRig) from the sheet's parts: eight legs planted on the ground, the plate, the head and the abdomen riding the
   breath (the abdomen swelling with it), sized and centred on the run row's first frame. Faces: the sheet's heads are expressions, not
   an idle cycle: the rig wears the one for the spider's state and mood (spMood; the frame rows draw their own faces):
     dead (a corpse drawn by the rig: the still sprite) 'dead' (X eyes); for 1.6 s after the hurt row (a blow taken) 'squint';
     for 2.5 s after its bite 'angry', or 'fury' when wounded (hp <= 35%); for 2.5 s after a cast (Spit web) 'glow' (glowing eyes);
     on its own turn 'glare'; wounded at rest 'hurt'; else the part row's head 'neutral' (round red eyes, as the frames draw it).
   Which sheet: the sand spider ('sspider', an FS_DEF entry of its own, SHEETS.sspider its size) when the battle is fought on desert
   ground (B.bk 'desert'; a unit's spv 'sand' / 'forest' overrides), the forest spider everywhere else. Same unit, same stats and name.
   No rnd(). */
const SP_LEGS={leg_l1:1,leg_l2:1,leg_l3:1,leg_l4:1,leg_r1:1,leg_r2:1,leg_r3:1,leg_r4:1};
// the expression for the spider's state and mood (see the header); the game's clock, normalised by the game speed
function spMood(u){if(!u)return'neutral';const s=typeof ANIM==='object'?ANIM.get(u):null,sp=typeof anSp==='function'&&anSp()||1,now0=fsNow(),el=t=>t>-1e8?(now0-t)/sp:1e9,
  hurt=u.hp!=null&&u.hpMax>0&&u.hp<=u.hpMax*.35;
 if(u.alive===false||s&&s.dead)return'dead';if(s){const h=el(s.hitT);if(h>=0&&h<2200)return'squint';const a=el(s.at0);if(a>=0&&a<2500){if(s.act===2)return'glow';if(s.act===1)return hurt?'fury':'angry'}}
 if(typeof B==='object'&&B&&B.cur===u)return'glare';return hurt?'hurt':'neutral'}
function spLook(t,seed,u){return'head_'+spMood(u)}
OR_FIG.spider={atl:()=>typeof SPA==='object'?SPA:null,sway:{},legs:SP_LEGS,breathe:'abdomen',look:spLook};
OR_FIG.sspider={atl:()=>typeof SSA==='object'?SSA:null,sway:{},legs:SP_LEGS,breathe:'abdomen',look:spLook};
// the sheet a Webspinner is drawn from: the sand spider in a desert battle
function spVary(u){const v=u&&u.spv;if(v)return v==='sand'?'sspider':'';return typeof B==='object'&&B&&B.bk==='desert'?'sspider':''}
for(const id of['spider','sspider'])FS_DEF[id]={atl:OR_FIG[id].atl,rig:(st,t,K,seed,dy,u)=>orRig(id,st,t,K,seed,dy,u),dressKey:spMood,rigSt:{idle:1,swap:1,reload:1},pick:OR_DASH,vary:spVary,
 an:{walk:{f:'run',loop:1,rate:1},flee:{f:'run',loop:1,rate:1},attack:{f:'attack',imp:4,hit:'melee',ms:620},charge:{f:'run',loop:1,cyc:300},
  cast:{f:'cast',imp:3,hit:'web',ms:760},hit:{f:'hurt',ms:600},death:{f:'death'}}};
