/* ================= THE OGRE AS A PAPER CUT-OUT SKELETON (Detail High; the user's Ogre sheet, assets/foes/ogre.webp) =================
   The plain Ogre (EN 'ogre', 76-monsters.js kind 'ogre') is drawn from the pieces of the user's sheet (cut and packed into OGA by
   assets/make-ogre-atlas.py: three faces, the torso, two arms (each one piece, shoulder to fist), two legs,
   the club) and animated exactly like the Detail High people of 73m-skel.js: the same keyframe engine (humAnimPose's interpolation, HUM_AN
   keys, hskEase curves; OG_GUARD the rest pose), the same bones and the same draw (humSkDraw display lists, so the board's outline, tint and
   hit flash apply as to a person). Rigid flat pieces, no mesh: they only turn and (kneeling legs, as the people's) squash.
   - Bones (sheet px "OU", feet at 0,0, y down, facing screen-right in the front view): root (fall) -> hip line (bob, kneel) -> legs
     (lA / lB swing, uA / uB foot lift) and the waist (lean) -> torso -> neck -> head (half the lean + head) and two shoulders -> arms.
     An arm is one rigid piece (shoulder to fist, bent at the elbow as painted) on one bone that turns on the shoulder toward its
     hand target (P.w weapon hand, P.o off hand, from the shoulder, x forward): only the direction counts, the reach is the piece's.
     The club sits in the weapon fist at its own world angle (P.wa), under the fist; with P.grip the off arm turns so its fist lands
     on the haft behind the weapon hand (where its reach meets the haft's line); P.drop leaves the club on the ground.
   - Facings: the sheet is front three-quarter only, so every facing draws the front animations, mirrored to face the way the ogre
     goes: face 0 (bottom-right) as painted, face 1 (bottom-left) the people's mirrored composition (the club in the far hand, the
     layers by which arm is near), face 3 (top-right) exactly face 0's frames and face 2 (top-left) exactly face 1's. In face 1
     (and so 2) the club hand is the outer one, and the rest pose holds the club upright (OG_GUARD_OUT) instead of resting its head
     on the ground, so it stays over the ogre's own tile. Faces swap: neutral, angry snarl while attacking, roaring and hurt, a grin now and then
     when idle.
   - Animations: idle, walk, flee, hit and death are the people's own (HUM_AN), so an ogre breathes, steps, flinches and falls like a
     merc; its moves are keys of the same form (OG_AN): ogSmash (the basic attack: an overhead club smash), ogSweep (Sweeping blow: a
     wide swing), ogHurl (Hurl: a two-handed upswing that throws the foe), ogSlam (Ground slam and any 'slam' variant: both hands,
     a big wind-up and a body drop), ogRoar (cast: club raised, a war cry). Every blow lands at AN_HIT_AT (the slam at the quake's
     later impact). Hand targets and bob are the people's SU times OG.Q (a heavier, bigger body).
   - Runtime: ogreLiveFrame(u, v) -> the display list for 70-render.js drawUnitPx; ogreBuild bakes a sampled pose for sheetSpritePx
     (effects, tests, the first frames). null at Detail Low, before the atlas has loaded, or for any other unit: the pixel ogre is
     drawn then (76s-sheets.js SHEETS.ogre keeps only its size on the board). assets/make-ogre-db.js samples ogFrame into the DragonBones
     project (assets/foes/ogre_ske.json). No rnd(); the idle grin comes from the unit's id. */
const OG={img:null,pc:new Map(),bk:new Map(),bkN:[],frames:0,ms:0,bakes:0,off:0,err:0,
 Q:1.45,                                  // OU per people SU for hand targets and bob
 H:457,                                   // the setup figure's height (feet to the top of the skull), OU
 hipY0:-152,waist:30,legX:[-78,78],       // the legs' pivot line, the waist below it, the legs' x (near, far)
 neck:[4,-104],sh:[[-86,-110],[100,-117]], // from the waist: the neck, the near / far shoulder (fitted to the sheet's compiled figure)
 arm:1,club:.9,                           // the arm pieces' and the club's scale
 fall:[202,-69]};
const OG_PC={a:'arm_r',b:'arm_l',legA:'leg_r',legB:'leg_l'};
// the ogre's rest pose (the club held low and forward, its head resting on the ground: seen in every facing) and its moves, in the
// people's keyframe language (73m-skel.js HUM_AN; t 0..1 of the state, a blow lands at AN_HIT_AT .38, the slam at .44 like the quake)
const OG_GUARD={w:[12,68],wa:36,o:[-2,80]},OG_GUARD_OUT={w:[0,60],wa:-80,o:[-2,80]};
const OG_AN={
 ogSmash:{k:[[0,{},'o'],[.16,{w:[-14,-64],wa:-150,lean:-9,lA:-6,lB:4,bob:-2,head:-5},'io'],[.28,{w:[-24,-82],wa:-168,lean:-13,lA:-8,lB:6,bob:-4,head:-8},[.7,0,1,.3]],
  [.38,{w:[88,34],wa:24,lean:15,lA:20,lB:-12,bob:9,head:7},'o'],[.6,{w:[80,56],wa:36,lean:12,lA:17,lB:-10,bob:8,head:5},'io'],[1,{}]]},
 ogSweep:{k:[[0,{},'o'],[.26,{w:[-56,34],wa:168,lean:-11,lA:-6,lB:8,bob:4,head:-6},[.6,0,1,.4]],[.33,{w:[6,50],wa:104,wsq:.62,lean:2,lA:6,bob:6},'l'],
  [.38,{w:[84,40],wa:10,lean:13,lA:18,lB:-12,bob:6,head:4},'o'],[.58,{w:[46,10],wa:-38,wsq:.3,lean:9,lA:14,lB:-10,bob:4},'io'],[1,{}]]},
 ogHurl:{k:[[0,{g:1},'o'],[.26,{w:[-38,64],wa:152,lean:-8,lA:-6,lB:6,bob:8,g:1},[.6,0,1,.4]],[.38,{w:[74,34],wa:-18,lean:8,lA:16,lB:-8,bob:2,g:1},'o'],
  [.56,{w:[46,-62],wa:-108,lean:-10,lA:10,lB:-6,bob:-4,head:-10,g:1},'io'],[1,{g:1}]]},
 ogSlam:{k:[[0,{g:1},'o'],[.3,{w:[-6,-96],wa:-124,lean:-14,lA:-6,lB:4,bob:-6,head:-9,g:1},[.7,0,1,.25]],[.44,{w:[70,92],wa:78,lean:24,lA:22,lB:-14,bob:26,kneel:.3,head:8,g:1},'o'],
  [.72,{w:[64,90],wa:74,lean:20,lA:20,lB:-12,bob:22,kneel:.25,head:6,g:1},'io'],[1,{g:1}]]},
 ogRoar:{k:[[0,{},'io'],[.2,{w:[0,10],o:[34,30],wa:-110,lean:5,bob:4,head:4},'io'],[.4,{w:[-34,-86],o:[46,-34],wa:-64,lean:-15,bob:-6,head:-16,lA:6,lB:-4},[.6,0,1,.5]],
  [.72,{w:[-30,-82],o:[44,-30],wa:-68,lean:-13,bob:-5,head:-14,lA:6,lB:-4},'io'],[1,{}]]}};
/* the pose at t: humAnimPose's interpolation (hskKey, hskEase, HSK_NUM, HSK_FLG of 73m-skel.js) over the people's HUM_AN for idle, walk,
   flee, hit and death and OG_AN for the ogre's moves; wsq (the club foreshortened 0..1 while it swings toward the eye) is the ogre's own */
function ogAnimPose(nm,t,gd){gd=gd||OG_GUARD;const G={w:gd.w,o:gd.o,wa:gd.wa,grip:0},A=OG_AN[nm]||HUM_AN[nm]||HUM_AN.idle,K=A.k;t=A.loop?((t%1)+1)%1:t<0?0:t>1?1:t;
 let i=0;while(i<K.length-2&&t>=K[i+1][0])i++;const k0=K[i],k1=K[i+1]||k0,span=k1[0]-k0[0],u=span>0?hskEase(k0[2],Math.min(1,Math.max(0,(t-k0[0])/span))):0;
 const a=hskKey(G,k0[1]),b=hskKey(G,k1[1]),L=(x,y)=>x+(y-x)*u,P={name:nm,w:[L(a.w[0],b.w[0]),L(a.w[1],b.w[1])],o:[L(a.o[0],b.o[0]),L(a.o[1],b.o[1])]};
 for(const n of HSK_NUM)P[n]=L(a[n],b[n]);P.lg=[P.lA,P.uA,P.lB,P.uB];for(const f in HSK_FLG){const n=HSK_FLG[f];P[n]=a[n]}
 P.wsq=L(k0[1].wsq||0,k1[1].wsq||0);if(nm==='death'&&t>=.5)P.drop=1;return P}
const OG_VAR={ohurl:'ogHurl',osweep:'ogSweep',oslam:'ogSlam'};
function ogImg(){if(typeof Image==='undefined'||typeof OGA!=='object'||OG.off)return null;let I=OG.img;if(!I){I=OG.img=new Image();I.decoding='async';I.src=OGA.src}return I.complete&&I.naturalWidth?I:null}
function ogIs(u){return!!(u&&u.def&&!u.m&&typeof monsterKind==='function'&&monsterKind(u)==='ogre')}
function ogOn(u){return ogIs(u)&&(typeof hdArt!=='function'||hdArt())&&typeof document!=='undefined'&&!!ogImg()}
// which move an attack is: the ability last used (74-anim.js keeps its id for 2.5 s), else a 'slam' variant, else the smash
function ogMove(u){const s=typeof ANIM==='object'?ANIM.get(u):null;if(s&&s.vaId&&anNow()-(s.vaT||-1e9)<2500&&OG_VAR[s.vaId])return OG_VAR[s.vaId];
 let va='';try{va=typeof anVariant==='function'?anVariant(u)||'':''}catch(e){}return va==='slam'?'ogSlam':'ogSmash'}
// the face: neutral; snarling while it attacks, roars or is hurt; a grin now and then when idle (from the unit's id)
function ogFace(st,t,nm,seed){if(st==='hit')return'angry';if(st==='death')return t<.5?'angry':'neutral';if(st==='attack'||st==='cast')return t>.06&&t<.9?'angry':'neutral';
 if(st==='idle'){const c=(t+(seed||0))%4;return c>2.35&&c<3.1?'grin':'neutral'}return'neutral'}
// a piece at K device px per OU (cut from the atlas once per scale); x, y: its top left from its pivot
function ogPc(n,K){const k=n+':'+K;let a=OG.pc.get(k);if(a)return a;const I=ogImg(),P=OGA.p[n];if(!I||!P)return null;
 const W=Math.max(2,Math.ceil(P.w*K)+2),H=Math.max(2,Math.ceil(P.h*K)+2),cv=document.createElement('canvas');cv.width=W;cv.height=H;const q=cv.getContext('2d');if(!q)return null;
 q.imageSmoothingEnabled=true;try{q.imageSmoothingQuality='high'}catch(e){}q.drawImage(I,P.r[0],P.r[1],P.r[2],P.r[3],1,1,P.w*K,P.h*K);OG.bakes++;
 const pv=P.a.pv;a={cv,x:-pv[0]-1/K,y:-pv[1]-1/K,w:W/K,h:H/K};OG.pc.set(k,a);return a}
function ogAng(n){const P=OGA.p[n],A=P.a;return Math.atan2(A.ax[1]-A.pv[1],A.ax[0]-A.pv[0])}
function ogLen(n){const A=OGA.p[n].a;return Math.hypot(A.ax[0]-A.pv[0],A.ax[1]-A.pv[1])}
const OG_SC=()=>OG.H>0?(typeof SHEETS==='object'&&SHEETS.ogre?SHEETS.ogre.h:36)/OG.H/HUM_A:1;   // the board size of the old painted sheet (76s-sheets.js SHEETS.ogre.h)
/* ---- one frame: the pose of the state at t (0..1; idle / walk / flee loop), the slots in draw order. K: device px per OU (0: no
   images, bones only, for the DragonBones export). Returns {list, tags, bones, sc, mir, anim, face} ---- */
function ogFrame(face,st,t,mv,K,seed,opt){const t0=typeof performance==='object'?performance.now():0;face=((face|0)%4+4)%4;face=face===3?0:face===2?1:face;   // the back facings: the front frames
 const back=face>=2,f=back?-1:1,mir=face===1||face===3,wSide=face===0||face===3?'a':'b',oSide=wSide==='a'?'b':'a',nearW=wSide==='a',Q=OG.Q;
 if(st==='swap'||st==='reload'||!st)st='idle';
 const nm=st==='attack'?(mv||'ogSmash'):st==='cast'?'ogRoar':HUM_AN[st]?st:'idle';
 const P=ogAnimPose(nm,t,face===1||face===3?OG_GUARD_OUT:OG_GUARD),bare=!!(opt&&opt.setup);if(bare){P.w=[-21,92];P.o=[10,97];P.wa=90}   // the setup pose (the DragonBones setup, the review image): arms hanging, no club
 const ex=ogFace(st,t,nm,seed);
 const g=new HskRec(),tags=[],bones={},bone=(n,m)=>{bones[n]=m.slice()},kn=Math.max(0,Math.min(1,P.kneel||0)),fall=Math.max(0,Math.min(1,P.fall||0));
 if(fall>0){g.translate(f*OG.fall[0]*fall,OG.fall[1]*fall);g.rotate(-f*Math.PI/2*fall)}
 bone('root',g.m);
 const bob=(P.bob||0)*Q,hipY=OG.hipY0*(1-.5*kn)+(bob>0?bob*.5:0),W={x:0,y:hipY+OG.waist+bob*.5},rot=f*P.lean*Math.PI/180,cr=Math.cos(rot),sr=Math.sin(rot);
 const up=p=>({x:W.x+p[0]*cr-p[1]*sr,y:W.y+p[0]*sr+p[1]*cr}),shA=up(OG.sh[0]),shB=up(OG.sh[1]),neck=up(OG.neck);
 const sW=wSide==='a'?shA:shB,sO=oSide==='a'?shA:shB;
 // an arm: one rigid bone from the shoulder turned toward the target; the fist at the piece's reach
 const aim=(side,sh,tx,ty)=>{const L=ogLen(OG_PC[side])*OG.arm,th=Math.atan2(ty-sh.y,tx-sh.x);return{side,sh,th,L,wx:sh.x+Math.cos(th)*L,wy:sh.y+Math.sin(th)*L}};
 const rest=(sh,o)=>({x:sh.x+f*o[0]*Q,y:sh.y+o[1]*Q});
 const tw=rest(sW,P.w),armW=aim(wSide,sW,tw.x,tw.y),wa=P.wa*Math.PI/180,wdx=f*Math.cos(wa),wdy=Math.sin(wa);
 const grip=!!(P.grip&&!P.drop);let to=rest(sO,P.o);
 if(grip){const L=ogLen(OG_PC[oSide])*OG.arm,px=armW.wx-sO.x,py=armW.wy-sO.y,b=px*wdx+py*wdy,c=px*px+py*py-L*L,disc=b*b-c;   // the off fist on the haft's line, behind the weapon hand
  let d=-62;if(disc>=0){const r1=-b-Math.sqrt(disc),r2=-b+Math.sqrt(disc);d=Math.abs(r1+62)<Math.abs(r2+62)?r1:r2}to={x:armW.wx+wdx*d,y:armW.wy+wdy*d}}
 const armO=aim(oSide,sO,to.x,to.y);
 bone('hip',hskMul(g.m,[1,0,0,1,0,hipY]));
 // slots
 const img=(n,tag)=>{if(K){const a=ogPc(n,K);if(a)g.img(a,tag)}else g.list.push({n,m:g.m.slice(),tag})};
 const drawArm=a=>{const pc=OG_PC[a.side];g.save();g.translate(a.sh.x,a.sh.y);g.rotate(a.th);bone(a.side==='a'?'armN':'armF',g.m);g.scale(OG.arm,OG.arm);g.rotate(-ogAng(pc));img(pc,'arm');g.restore()};
 const drawClub=()=>{if(P.drop||bare)return;let wa2=wa;const tip=ogLen('club')*OG.club;
  if(st!=='death'){const sn=Math.sin(wa);if(sn>0&&armW.wy+sn*tip>-44){const s2=Math.max(-1,Math.min(1,(-44-armW.wy)/tip)),a2=Math.asin(s2);wa2=Math.cos(wa)>=0?a2:Math.PI-a2}}   // lowered only until its head touches the ground (a blow stops on it)
  g.save();g.translate(armW.wx,armW.wy);g.scale(f,1);g.rotate(wa2);if(P.wsq)g.scale(1-P.wsq*.75,1);bone('club',g.m);g.scale(OG.club,OG.club);g.rotate(-ogAng('club'));img('club','weapon');g.restore();tags.push('weapon')};
 const torsoBone=fn=>{g.save();g.translate(W.x,W.y);g.rotate(rot);fn();g.restore()};
 const drawTorso=()=>{tags.push('torso');torsoBone(()=>{bone('torso',g.m);g.scale(f,1);img('torso','torso')})};
 const drawHead=()=>{tags.push('head');g.save();g.translate(neck.x,neck.y);g.rotate(rot*.5+f*(P.head||0)*Math.PI/180);bone('head',g.m);g.scale(f,1);img('head_'+ex,'head');g.restore()};
 const drawLegs=()=>{const lg=P.lg;for(const [n,side,ix] of[[OG_PC.legB,'b',2],[OG_PC.legA,'a',0]]){const x=OG.legX[side==='a'?0:1],r=-f*lg[ix]*Math.PI/180,lift=(lg[ix+1]||0)*Q,kr=-f*(side==='a'?.9:.15),ks=side==='a'?.55:.7;
   g.save();g.translate(x+f*(side==='a'?24:-10)*Q*kn,hipY-lift*(1-kn));g.rotate(r*(1-kn)+kr*kn);g.scale(1,1+(ks-1)*kn);bone(side==='a'?'legN':'legF',g.m);img(n,'leg');g.restore()}tags.push('legs')};
 const wSet=()=>{drawClub();drawArm(armW)};   // the club under the fist
 // draw order: the far arm, legs, torso, head, the near arm (the weapon arm near for faces 0 and 3); gripping with the far hand, the
 // far arm comes over the torso so its fist shows on the haft
 if(nearW){if(!grip)drawArm(armO);drawLegs();drawTorso();if(grip)drawArm(armO);drawHead();wSet()}
 else{wSet();drawLegs();drawTorso();drawHead();drawArm(armO)}
 tags.push(nearW?'wNear':'wFar');
 // the club on the ground once dropped (ground bone: not part of the falling body)
 if(P.drop){const m0=g.m;g.m=[1,0,0,1,0,0];g.save();g.translate(fall>.5?-f*40:f*90,-30);g.scale(f,1);g.rotate(-.06);bone('club',g.m);g.scale(OG.club,OG.club);g.rotate(-ogAng('club'));img('club','dropped');g.restore();g.m=m0;tags.push('dropped')}
 OG.frames++;if(t0)OG.ms+=performance.now()-t0;
 return{list:g.list,tags,bones,pose:P,anim:nm,face:ex,mir,sc:OG_SC(),ogre:1,hand:{w:wSide,o:oSide,right:face===0||face===3?'a':'b',layers:tags.join(',')}}}
function ogSeed(u){return(((u&&u.id|0)*2654435761)>>>0)%997/997*4}
function ogK(){return Math.round(humK()*HUM_A*OG_SC()*400)/400}   // device px per OU
/* ---- the live figure on the board (70-render.js drawUnitPx): null when not the ogre or not drawable now ---- */
const OG_LOOP={idle:1,walk:1,flee:1};
function ogreLiveFrame(u,v){if(!ogOn(u))return null;let st=v.pS||'idle';const an=v.pAn||'';if(st==='walk'&&an==='flee')st='flee';
 let t=OG_LOOP[st]?(v.pCy||0):(v.pPh!=null&&v.pPh>0?v.pPh:humSkT(st,v.pF));if(st==='idle'&&typeof reduced!=='undefined'&&reduced)t=0;
 try{return ogFrame(v.pD,st,t,st==='attack'?ogMove(u):'',ogK(),ogSeed(u))}catch(e){if(!OG.err){OG.err=1;console.error('ogre skeleton',e)}OG.off=1;return null}}
/* ---- the baked path (sheetSpritePx: effects, tests, the first frames): a sampled pose in a canvas, cached per pose ---- */
function ogreBuild(u,face,state,frame){if(!ogOn(u))return null;face=((face|0)%4+4)%4;const st=state||'idle',mv=st==='attack'?ogMove(u):'',k=humK(),key=face+':'+st+':'+(frame|0)+':'+mv+':'+k;
 let o=OG.bk.get(key);if(o)return o;
 let Fr;try{Fr=ogFrame(face,st,humSkT(st,frame),mv,ogK(),0)}catch(e){if(!OG.err){OG.err=1;console.error('ogre skeleton',e)}OG.off=1;return null}
 const b=humSkBox(Fr),s=HUM_A*Fr.sc;let X0=b[0]*s,X1=b[2]*s;if(Fr.mir){const t=X0;X0=-X1;X1=-t}const Y0=b[1]*s,Y1=b[3]*s,w=Math.max(2,Math.ceil((X1-X0)*k)+2),h=Math.max(2,Math.ceil((Y1-Y0)*k)+2);
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;const q=cv.getContext('2d');if(!q)return null;q.imageSmoothingEnabled=true;try{q.imageSmoothingQuality='high'}catch(e){}
 const ax=-X0+1/k,ay=-Y0+1/k;q.setTransform(k,0,0,k,0,0);humSkDraw(q,Fr,ax,ay);o={cv,ax,ay,k,smooth:true,ogre:1,face:Fr.face,anim:Fr.anim};
 OG.bk.set(key,o);OG.bkN.push(key);if(OG.bkN.length>96)OG.bk.delete(OG.bkN.shift());return o}
