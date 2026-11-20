/* ================= FRAME SHEETS: foes drawn from the user's frame-by-frame animation sheets (Detail High) =================
   A foe whose sheet holds its animations as drawn frames (the Direwolf: run, hurt, death, paw scratch, bite; the Goblin skirmisher:
   idle, run, attack, hit, death; the Goblin archer, the Goblin shaman and the Owlbear: idle, run, attack, cast, hit, death) plays them frame by frame on the game's
   animation clock (74-anim.js). Loops (idle, walk, flee) run on unitPose's cycle P.cyc (rate: row cycles per animation cycle).
   One-shots run on their own clock in ms from the moment 74-anim.js started them (the attack's s.at0, the blow's s.hitT, the death's
   s.deadT; normalised by the game speed), so a drawn swing or yelp is not squeezed into the game's 240 ms attack or 230 ms flinch:
   - a blow: the frames from `from` up to the impact frame `imp` share the wind-up, `imp` shows at the impact (hit: 'melee' =
     AN_HIT_AT of the 240 ms attack, when 75-fx.js lands a melee blow; 'shot' = 40 ms, when it looses a plain or poison arrow; 'spell'
     = 90 ms, when it launches a bolt spell such as the shaman's hex), the
     rest share the follow-through until `ms`; the figure keeps playing them after unitPose has gone back to idle, until a newer
     event (a move, a blow taken, death) takes over.
   - hit: the hurt row over `ms` from the blow landing; death: over the collapse and its hold (420 + 150 ms at normal speed), then its
     last frame stays while the corpse fades.
   - Registry FS_DEF[enemy id] = {atl() -> the generated atlas (76e-wolfatlas.js WFA, 76f-gobatlas.js GBA / GAA / GSA, 76i-owlatlas.js OBA), an: {state or variant:
     row}, pick(u, st, s) -> a variant row (the wolf's bite, the archer's poison arrow and knife, the shaman's chant, the owlbear's
     swipe and charge), rig + rigSt: the states
     drawn as a cut-out skeleton instead (the wolf's idle and howl, 76h-wolf.js), dress(Fr, id, u, K, row, frame, dy): adds the unit's
     own gear to a frame (the skeleton soldiers' weapon and shield in their colour-keyed hands, 76m-skelsol.js)}.
   - Frames are anchored on the body's centre over the feet (the atlas's ax / ay); a figure stands SHEETS[id].h art px tall like its
     old painted sheet, its feet SHEETS[id].dy art px under the tile point as the painted figure's were. Faces: the sheets face screen-right
     (the front three-quarter view): face 0 as drawn, face 1 mirrored, the back facings the front frames (face 3 = face 0, face 2 =
     face 1), as the ogre's.
   - Runtime: fsLiveFrame(u, v) -> a display list for 70-render.js drawUnitPx (humSkDraw: the turn outline, tint and hit flash apply);
     fsBuild bakes one for sheetSpritePx (effects, tests, the first frames). null at Detail Low, before the atlas has loaded or for any
     other foe: the pixel figure is drawn then. No rnd(). */
const FS={img:{},pc:new Map(),bk:new Map(),bkN:[],off:0,err:0,frames:0,bakes:0};
const FS_SHOT_MS=40,FS_SPELL_MS=90;       // 75-fx.js: a plain or poison arrow leaves the bow 40 ms after the shot; a bolt spell (the hex) 90 ms after the cast
const FS_DEF={
 gob:{atl:()=>typeof GBA==='object'?GBA:null,an:{idle:{f:'idle',loop:1,rate:2},walk:{f:'run',loop:1,rate:1},flee:{f:'run',loop:1,rate:1},
  attack:{f:'attack',imp:3,hit:'melee',ms:520},hit:{f:'hit',ms:600},death:{f:'death'},cast:{f:'idle',loop:1,rate:2},swap:{f:'idle',loop:1,rate:2},reload:{f:'idle',loop:1,rate:2}}},
 gobarch:{atl:()=>typeof GAA==='object'?GAA:null,an:{idle:{f:'idle',loop:1,rate:2},walk:{f:'run',loop:1,rate:1},flee:{f:'run',loop:1,rate:1},
  attack:{f:'attack',from:3,imp:5,hit:'shot',ms:560},stab:{f:'attack',from:3,imp:5,hit:'melee',ms:560},poison:{f:'cast',from:4,imp:5,hit:'shot',ms:640},
  cast:{f:'cast',ms:760},hit:{f:'hit',ms:600},death:{f:'death'},swap:{f:'idle',loop:1,rate:2},reload:{f:'idle',loop:1,rate:2}},
  // the poison arrow plays the cast row (the purple glow on the bow as it looses); a knife thrust at a neighbour (the attack lunges) is timed as a blow
  pick:(u,st,s)=>st!=='attack'||!s?'':s.vaId==='gpoison'&&fsNow()-(s.vaT||-1e9)<2500?'poison':(s.lc||s.lr)?'stab':''},
 // the shaman: a spell (the hex, any bolt) gathers the glow in the hand and lets it go from the staff's skull (cast frame 5) when the bolt
 // leaves; the war chant (no bolt: its rings start at once) begins on the skull's glow; a staff blow lands on the swing's arc (attack frame 5)
 gobsham:{atl:()=>typeof GSA==='object'?GSA:null,an:{idle:{f:'idle',loop:1,rate:2},walk:{f:'run',loop:1,rate:1},flee:{f:'run',loop:1,rate:1},
  attack:{f:'attack',imp:4,hit:'melee',ms:600},cast:{f:'cast',from:2,imp:4,hit:'spell',ms:760},chant:{f:'cast',from:4,ms:700},hit:{f:'hit',ms:600},death:{f:'death'},
  swap:{f:'idle',loop:1,rate:2},reload:{f:'idle',loop:1,rate:2}},
  pick:(u,st,s)=>st==='cast'&&s&&s.vaId==='gchant'&&fsNow()-(s.vaT||-1e9)<2500?'chant':''},
 // the owlbear: its claw swipe lands on the swoosh (attack frame 5); Swipe (bswipe, every adjacent foe) is the cast row: the purple glow
 // gathers in the claws and its purple arcs (cast frame 6) rake at the blow; Trample (bcharge) gallops on the run row while it charges,
 // then strikes with the attack row; any other cast plays the cast row whole
 bear:{atl:()=>typeof OBA==='object'?OBA:null,an:{idle:{f:'idle',loop:1,rate:2},walk:{f:'run',loop:1,rate:1},flee:{f:'run',loop:1,rate:1},
  attack:{f:'attack',imp:4,hit:'melee',ms:600},swipe:{f:'cast',from:2,imp:5,hit:'melee',ms:640},charge:{f:'run',loop:1,cyc:300},cast:{f:'cast',ms:760},
  hit:{f:'hit',ms:600},death:{f:'death'},swap:{f:'idle',loop:1,rate:2},reload:{f:'idle',loop:1,rate:2}},
  pick:(u,st,s)=>st!=='attack'||!s?'':s.mv&&s.mk===(typeof AN_DASH==='number'?AN_DASH:4)?'charge':s.vaId==='bswipe'&&fsNow()-(s.vaT||-1e9)<2500?'swipe':''}};
function fsNow(){return typeof anNow==='function'?anNow():0}
function fsId(u){if(!u||!u.def||u.m)return null;const id=typeof msEnKey==='function'?msEnKey(u.def):null;return id&&FS_DEF[id]?id:null}
function fsImg(id){const D=FS_DEF[id],A=D&&D.atl();if(!A||typeof Image==='undefined'||FS.off)return null;const ik=D.img||id;let I=FS.img[ik];if(!I){I=FS.img[ik]=new Image();I.decoding='async';I.src=A.src}return I.complete&&I.naturalWidth?I:null}
function fsOn(u){const id=fsId(u);return!!id&&(typeof hdArt!=='function'||hdArt())&&typeof document!=='undefined'&&!!fsImg(id)}
// the figure's scale: SHEETS[id].h art px for the atlas's standing height H (WU, the atlas's units); dy: the feet under the tile point (WU)
function fsSc(id){const A=FS_DEF[id].atl(),S=typeof SHEETS==='object'&&SHEETS[id];return(S?S.h:22)/A.H/HUM_A}
function fsDy(id){const A=FS_DEF[id].atl(),S=typeof SHEETS==='object'&&SHEETS[id];return S?(S.dy||0)*A.H/S.h:0}
function fsK(id){return Math.round(humK()*HUM_A*fsSc(id)*400)/400}   // device px per WU
// an atlas record (frame or piece) as an attachment at K device px per WU, its origin at (ox, oy) (record px); cached per scale
function fsPc(id,key,R,ox,oy,K){const k=id+':'+key+':'+K;let a=FS.pc.get(k);if(a)return a;const I=fsImg(id);if(!I||!R)return null;
 const W=Math.max(2,Math.ceil(R.w*K)+2),H=Math.max(2,Math.ceil(R.h*K)+2),cv=document.createElement('canvas');cv.width=W;cv.height=H;const q=cv.getContext('2d');if(!q)return null;
 q.imageSmoothingEnabled=true;try{q.imageSmoothingQuality='high'}catch(e){}q.drawImage(I,R.r[0],R.r[1],R.r[2],R.r[3],1,1,R.w*K,R.h*K);FS.bakes++;
 const tn=FS_DEF[id]&&FS_DEF[id].tint;if(tn){q.globalCompositeOperation='source-atop';q.fillStyle=tn;q.fillRect(0,0,W,H);q.globalCompositeOperation='source-over'}   // a figure sharing another's atlas, darker (the Elder ent)
 a={cv,x:-ox-1/K,y:-oy-1/K,w:W/K,h:H/K};FS.pc.set(k,a);return a}
function fsHitMs(d){return d.hit==='shot'?FS_SHOT_MS:d.hit==='spell'?FS_SPELL_MS:d.hit==='melee'?240*(typeof AN_HIT_AT==='number'?AN_HIT_AT:.38):0}
/* which frame of a row (n frames): loops by the cycle c; timed rows by el (ms since the event, at normal speed); others by the phase t */
function fsIdx(n,d,c,el,t){if(n<=1)return 0;if(d.loop){const x=c*(d.rate||1);return Math.min(n-1,Math.floor((x-Math.floor(x))*n))}
 if(d.ms){el=Math.max(0,el);const a=d.from|0;if(d.imp!=null){const H=fsHitMs(d);if(el<H)return Math.min(d.imp-1,a+Math.floor(el/H*(d.imp-a)));return Math.min(n-1,d.imp+Math.floor((el-H)/(d.ms-H)*(n-d.imp)))}
  return Math.min(n-1,a+Math.floor(el/d.ms*(n-a)))}
 t=t<0?0:t>1?1:t;return Math.min(n-1,Math.floor(t*n))}
/* ---- one frame. st: the state; tm: {c: the loop cycle, el: ms since the event, t: the phase 0..1, row: a variant row}.
   Returns {list, tags, bones, sc, mir, anim, fi, face, fs} ---- */
function fsFrame(id,face,st,tm,K,seed,u){const D=FS_DEF[id],A=D.atl();face=((face|0)%4+4)%4;face=face===3?0:face===2?1:face;const mir=face===1;
 if(!st||!D.an[st]&&!(D.rigSt&&D.rigSt[st]))st='idle';
 const dy=fsDy(id);
 if(D.rigSt&&D.rigSt[st]){const Fr=D.rig(st,st==='idle'?tm.c||0:tm.t||0,K,seed||0,dy,u);Fr.mir=mir;Fr.sc=fsSc(id);Fr.fs=id;FS.frames++;if(D.dress)D.dress(Fr,id,u,K,'',0,dy);return Fr}
 const d=tm.row&&D.an[tm.row]||D.an[st],L=A.f[d.f],i=fsIdx(L.length,d,tm.c||0,tm.el!=null?tm.el:(tm.t||0)*(d.imp!=null?240:d.ms||1),tm.t||0),R=L[i],g=new HskRec();g.translate(0,dy);
 if(K){const a=fsPc(id,d.f+i,R,R.ax,R.ay,K);if(a)g.img(a,'frame')}else g.list.push({n:d.f+'_'+i,m:g.m.slice(),tag:'frame'});
 FS.frames++;const Fr={list:g.list,tags:['frame'],bones:{frame:g.m.slice()},anim:d.f,fi:i,face:d.f+i,mir,sc:fsSc(id),fs:id,row:tm.row||st};if(D.dress)D.dress(Fr,id,u,K,d.f,i,dy);return Fr}
function fsSeed(u){return(((u&&u.id|0)*2654435761)>>>0)%997/997*4}
/* the state and its timing for a unit on the board (see the header): unitPose's state, unless a drawn attack, cast or hurt row started
   later is still playing */
function fsTime(u,v,D){let st=v.pS||'idle';const an=v.pAn||'';if(st==='walk'&&an==='flee')st='flee';
 const s=typeof ANIM==='object'?ANIM.get(u):null,now0=fsNow(),sp=typeof anSp==='function'?anSp():1,tm={c:v.pCy||0,t:v.pPh!=null&&v.pPh>0?v.pPh:humSkT(st,v.pF)};
 if(st==='death'){if(s&&s.deadT>-1e8&&sp){const C=Math.max(210,420*sp),hold=150;tm.t=Math.min(1,(now0-s.deadT)/(C+hold))}else tm.t=1;return[st,tm]}
 if(s&&sp&&(st==='idle'||st==='attack'||st==='hit'||st==='cast')){let best=null,bt=-1e18;
  const hr=D.an.hit;if(hr&&hr.ms&&s.hitT>-1e8){const el=(now0-s.hitT)/sp;if(el>=0&&el<hr.ms&&s.hitT>bt){best=['hit',{el}];bt=s.hitT}}
  if((s.act===1||s.act===2)&&s.at0>-1e8){const k=s.act===1?'attack':'cast',row=D.pick?D.pick(u,k,s):'',d=D.an[row]||D.an[k];
   if(d&&d.ms){const el=(now0-s.at0)/sp;if(el>=0&&el<d.ms&&s.at0>bt){best=[k,{el,row}];bt=s.at0}}}
  if(best)return best;
  if(st==='attack'||st==='cast'){const row=D.pick?D.pick(u,st,s):'',d=D.an[row];tm.row=row;if(d&&d.loop)tm.c=(now0-(s.mt0||0))/Math.max(sp,.01)/(d.cyc||300)}}   // a looping variant (the owlbear's charge) runs on its own clock
 if(st==='hit'&&tm.t>0)tm.el=tm.t*((D.an.hit&&D.an.hit.ms)||600);
 if(st==='idle'&&typeof reduced!=='undefined'&&reduced)tm.c=0;
 return[st,tm]}
/* ---- the live figure on the board (70-render.js drawUnitPx): null when not a frame-sheet foe or not drawable now ---- */
function fsLiveFrame(u,v){if(!fsOn(u))return null;const id=fsId(u),[st,tm]=fsTime(u,v,FS_DEF[id]);
 try{return fsFrame(id,v.pD,st,tm,fsK(id),fsSeed(u),u)}catch(e){if(!FS.err){FS.err=1;console.error('frame sheet',e)}FS.off=1;return null}}
/* ---- the baked path (sheetSpritePx): a sampled frame in a canvas, cached per pose ---- */
function fsBuild(u,face,state,frame){if(!fsOn(u))return null;const id=fsId(u),D=FS_DEF[id];face=((face|0)%4+4)%4;const st=state||'idle',loop=st==='idle'||st==='walk'||st==='flee',
 s=typeof ANIM==='object'?ANIM.get(u):null,row=st==='attack'&&D.pick?D.pick(u,st,s):'',tm=loop?{c:(frame|0)/4,t:0}:{t:humSkT(st,frame),row};
 const k=humK(),key=id+':'+face+':'+st+':'+(frame|0)+':'+row+':'+k+(D.dressKey?':'+D.dressKey(u):'')+(D.moodKey?':'+D.moodKey(u,st):'');let o=FS.bk.get(key);if(o)return o;
 let Fr;try{Fr=fsFrame(id,face,st,tm,fsK(id),0,u)}catch(e){if(!FS.err){FS.err=1;console.error('frame sheet',e)}FS.off=1;return null}
 const b=humSkBox(Fr),sc=HUM_A*Fr.sc;let X0=b[0]*sc,X1=b[2]*sc;if(Fr.mir){const q=X0;X0=-X1;X1=-q}const Y0=b[1]*sc,Y1=b[3]*sc,w=Math.max(2,Math.ceil((X1-X0)*k)+2),h=Math.max(2,Math.ceil((Y1-Y0)*k)+2);
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;const q=cv.getContext('2d');if(!q)return null;q.imageSmoothingEnabled=true;try{q.imageSmoothingQuality='high'}catch(e){}
 const ax=-X0+1/k,ay=-Y0+1/k;q.setTransform(k,0,0,k,0,0);humSkDraw(q,Fr,ax,ay);o={cv,ax,ay,k,smooth:true,fs:id,anim:Fr.anim,face:Fr.face};
 FS.bk.set(key,o);FS.bkN.push(key);if(FS.bkN.length>96)FS.bk.delete(FS.bkN.shift());return o}
