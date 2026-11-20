/* ================= PAINTED SPRITE SHEETS (enemy figures from artist sheets) =================
   SHEETS[enId] = {src (an image data URL: one atlas of trimmed frames), ref (source px height of the front idle frame), h (the art px
   height it is drawn at), dy (art px the figure sits lower than its lowest claw: a four-footed body's middle,
   not its front paw, belongs on the tile centre), fr: [[view 'f'|'b', state, frame, x, y, w, h, ax, ay], ...]}: ax/ay = the feet in the frame (source px).
   Two views as in 73-units.js (front and back three-quarter, facing screen-right), mirrored for faces 1 (front) and 2 (back);
   face: 0 bottom-right, 1 bottom-left, 2 top-left, 3 top-right. States without frames (swap, reload) show idle. An attack or cast with a variant (anVariant(u) in 74-anim.js: 'slam' ...) uses that
   variant's row when the sheet has one.
   sheetSpritePx(u, face, state, frame) -> {cv, ax, ay, k, smooth} | null: the board (70-render.js drawUnitPx) blits cv at 1/k size with
   smoothing on (painted art); null until the atlas has loaded, for an enemy without a sheet, or when Settings > Detail is Low (hdArt()),
   so the original figure is drawn then. monsterSpritePx (76-monsters.js) asks here first. No rnd().
   The Ogre is drawn from the user's part sheet as a skeleton (76d-ogre.js), the Direwolf, the Goblin skirmisher, the Goblin archer,
   the Goblin shaman, the Owlbear, the Orc warrior, crusher, warlord and brave, the Skeleton legionary and halberdier, the Ent, the Elder
   ent, the Thornling and the Webspinner (a forest and a sand spider) from the user's
   frame sheets (76g-frames.js, the wolf's idle a rig: 76h-wolf.js). Their entries here keep only the size on the board
   (h, dy: those figures are scaled to it, and sheetTop hangs the bars by it, or at top); their painted sheets are gone, so until the new atlas has
   decoded (a frame or two) they draw as the pixel figure, as at Detail Low. */
const SHEETS={
 bear:{h:28,dy:0},   // the owlbear's drawn frames stand side-on, all four paws on one line: that line on the tile centre (the painted owlbear's 3 was for its near paw)
 ogre:{h:36,dy:2},
 gob:{h:22,dy:1},
 gobarch:{h:22,dy:1},
 gobsham:{h:25,dy:1},
 wolf:{h:22,dy:0},   // the wolf's drawn frames and rig stand side-on: the paw line on the tile centre
 orcw:{h:32,dy:0,top:38},   // the orcs' drawn frames and rigs (76k-orc.js), by the user's sizes: the warrior and the crusher well over a man (about 1.2x),
 obrute:{h:32,dy:0,top:38},
 orcl:{h:35,dy:0,top:44},   // the warlord a little larger than the warriors (about 1.3x a man; his horned helm adds to the frame)
 orcy:{h:29,dy:0,top:35},   // the brave (76k-orc.js, the colour-keyed sheet) a little larger than a man (about 1.08x); bars just over each head
 skel:{h:26,dy:0,top:32},   // the skeleton soldiers' drawn frames and rig (76m-skelsol.js), their weapon and shield added
 skelhal:{h:26,dy:0,top:32},
 spider:{h:20,dy:5},   // the Webspinner's drawn frames and rig (76o-spider.js) sit in their tile: the legs splay round it, the near tips 5 under the
 sspider:{h:22.5,dy:6},   // tile centre (inside the ring), the body over it; its sand spider (a desert battle): the same body, longer legs (run frames 115 / 102 px)
 ent:{h:42,dy:0},      // the ents' drawn frames and rigs (76o-ents.js): the Ent towers over a man like the ogre; the Elder ent (the Ent's
 elder:{h:48,dy:0},    // atlas, darker) taller still; the Thornling a wiry treeling a little under a man's height
 thorn:{h:24,dy:0}};
const SHT={img:new Map(),cv:new Map(),idx:new Map()};
function sheetImg(id){const S=SHEETS[id];if(!S||!S.src||typeof Image==='undefined')return null;let I=SHT.img.get(id);if(!I){I=new Image();I.decoding='async';I.src=S.src;SHT.img.set(id,I)}return I.complete&&I.naturalWidth?I:null}
function sheetIdx(id){let X=SHT.idx.get(id);if(X)return X;X={};for(const f of SHEETS[id].fr){const k=f[0]+':'+f[1];(X[k]||(X[k]=[]))[f[2]]=f}SHT.idx.set(id,X);return X}
function sheetSpritePx(u,face,state,frame){if(!u||!u.def||u.m||(typeof hdArt==='function'&&!hdArt()))return null;if(typeof ogreBuild==='function'){const o=ogreBuild(u,face,state,frame);if(o)return o}   // the ogre's skeleton from the user's sheet (76d-ogre.js) first
 if(typeof fsBuild==='function'){const o=fsBuild(u,face,state,frame);if(o)return o}   // the direwolf and the goblins from the user's frame sheets (76g-frames.js)
const id=typeof msEnKey==='function'?msEnKey(u.def):typeof enKey==='function'?enKey(u.def):null;
 if(!id||!SHEETS[id])return null;const I=sheetImg(id);if(!I||typeof document==='undefined')return null;const S=SHEETS[id],X=sheetIdx(id);face=((face|0)%4+4)%4;
 const view=face<2?'f':'b',mir=face===1||face===2;let L=null;if((state==='attack'||state==='cast')&&typeof anVariant==='function'){let va='';try{va=anVariant(u)||''}catch(e){}if(va)L=X[view+':'+va]}   // a variant row (the ogre's slam) stands in for the attack or cast
 if(!L||!L.length)L=X[view+':'+state];if(!L||!L.length)L=X[view+':idle'];if(!L||!L.length)return null;const F=L[((frame|0)%L.length+L.length)%L.length];
 const key=id+':'+face+':'+F[1]+':'+F[2];let c=SHT.cv.get(key);
 if(!c){const cv=document.createElement('canvas');cv.width=F[5];cv.height=F[6];const g=cv.getContext('2d');if(!g)return null;if(mir){g.translate(F[5],0);g.scale(-1,1)}g.drawImage(I,F[3],F[4],F[5],F[6],0,0,F[5],F[6]);
  const k=S.ref/S.h;c={cv,k,ax:(mir?F[5]-F[7]:F[7])/k,ay:F[8]/k-(S.dy||0),smooth:true};SHT.cv.set(key,c)}
 return c}
if(typeof onArtChange==='function')onArtChange(()=>{});   // nothing cached depends on the setting: sheetSpritePx reads hdArt() every call
// the height the board hangs the bars and statuses at for a sheet figure (art px above the feet), or 0 (use the figure's own)
function sheetTop(u){if(!u||!u.def||u.m||(typeof hdArt==='function'&&!hdArt()))return 0;const id=typeof msEnKey==='function'?msEnKey(u.def):null;const S=id&&SHEETS[id];return S?S.top||S.h-(S.dy||0)+6:0}
