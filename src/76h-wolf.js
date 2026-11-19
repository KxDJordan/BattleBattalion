/* ================= THE DIREWOLF (Detail High; the user's two Direwolf sheets, assets/foes/direwolf.webp + direwolf-anims.webp) =================
   The Direwolf (EN 'wolf') plays the user's drawn frames for what they cover (76g-frames.js: walk and flee = the run, attack = the paw
   scratch, the bite, hit = the hurt row, death) and is a paper cut-out skeleton from the part sheet for the rest: idle (breathing,
   tail sway, a blink and now and then a snarl) and the howl (cast). The rig's pieces and its setup pose (fitted to the sheet's compiled
   wolf, the same size and anchor as the drawn frames' first poses) are generated into WFA (76e-wolfatlas.js by assets/make-wolf-atlas.py).
   - Bones (WU, the part sheet's px; feet at 0,0, y down, facing screen-right): root (the feet under the tile point) -> body (bob, and the
     lean about the hind hip) -> tail, the two upper hind and fore legs, torso (breathing) -> head; the lower legs (paws) stay on the
     ground under root. Displays: eight heads (neutral, snarl, roar, hurt, angry, rest = eyes closed, howl, bark), three torsos (c the
     standing one, a hunched for the howl's wind-up, b the chest thrown up for the howl), four tails (0 curled up at rest, 1 raised
     stiff while it snarls, 2 straight out behind the howl, 3 the spare: the DragonBones skin).
   - Attacks: the paw scratch, or the bite when the attack is a bite ability (an fx 'bite' ability used in the last 2.5 s, 74-anim.js
     s.vaId) or, for the plain attack, on two attacks in five (chosen from the attack's start time and the unit's id: no rnd()).
   - assets/make-wolf-db.js samples this rig and the frame rows into the DragonBones project (assets/foes/direwolf_ske.json). */
const WF={k:0};
// rig poses: [t, {lean deg (front down +), bob WU (down +), head deg, tail deg, br breath 0..1}, ease to the next]
const WF_AN={
 cast:{k:[[0,{},'io'],[.2,{lean:4,bob:6,head:8,tail:-6},'io'],[.32,{lean:-7,bob:-4,head:-14,tail:10},'o'],[.6,{lean:-8,bob:-5,head:-16,tail:12},'io'],[.84,{lean:-7,bob:-4,head:-13,tail:10},'io'],[1,{}]]}};
const WF_NUM=['lean','bob','head','tail','br'];
function wfPose(st,t){if(st==='idle'){const c=t-Math.floor(t),b=.5-.5*Math.cos(c*Math.PI*4);return{lean:0,bob:4*b,head:1.5*Math.sin(c*Math.PI*4-.6),tail:7*Math.sin(c*Math.PI*4+.9),br:b}}
 const K=(WF_AN[st]||WF_AN.cast).k;t=t<0?0:t>1?1:t;let i=0;while(i<K.length-2&&t>=K[i+1][0])i++;const k0=K[i],k1=K[i+1]||k0,sp=k1[0]-k0[0],u=sp>0?hskEase(k0[2],Math.min(1,(t-k0[0])/sp)):0,P={};
 for(const n of WF_NUM){const a=k0[1][n]||0,b=k1[1][n]||0;P[n]=a+(b-a)*u}return P}
// the displays at t: idle neutral with a blink and, now and then, a snarl with the tail raised (from the unit's seed); the howl's swaps
function wfLook(st,t,seed){if(st==='idle'){const c=((t+(seed||0))%4+4)%4;if(c>=3.2&&c<3.75)return{head:'head_snarl',torso:'torso_c',tail:'tail_1'};
  if((c>=1&&c<1.05)||(c>=2.9&&c<2.95))return{head:'head_rest',torso:'torso_c',tail:'tail_0'};return{head:'head_neutral',torso:'torso_c',tail:'tail_0'}}
 return t<.06||t>=.9?{head:'head_neutral',torso:'torso_c',tail:'tail_0'}:t<.3?{head:'head_angry',torso:'torso_a',tail:'tail_0'}:{head:'head_howl',torso:'torso_b',tail:'tail_2'}}
const WF_HIP=[-60,-70];                   // the body's lean pivot (WU): over the hind hips
const WF_BODY={tail:1,huF:1,fuF:1,torso:1,huN:1,fuN:1,head:1};
/* the rig's display list for the idle (t: the loop cycle) or the howl (t 0..1); dy: the feet under the tile point (WU). K: device px per
   WU (0: no images, piece names only, for the DragonBones export) */
function wfRig(st,t,K,seed,dy){if(st!=='cast')st='idle';const A=WFA,P=wfPose(st,t),L=wfLook(st,t,seed),g=new HskRec(),bones={};const bone=n=>{bones[n]=g.m.slice()};
 g.translate(0,dy||0);bone('root');const root=g.m.slice();
 g.translate(WF_HIP[0],WF_HIP[1]+P.bob);g.rotate(P.lean*Math.PI/180);g.translate(-WF_HIP[0],-WF_HIP[1]);bone('body');const body=g.m.slice();
 for(const [slot,pc0,x,y,rot0,sc0] of A.set){const pc=slot==='head'?L.head:slot==='torso'?L.torso:slot==='tail'?L.tail:pc0,alt=A.alt[pc],rot=(alt?alt[0]:rot0)+(slot==='head'?P.head:slot==='tail'?P.tail:0),sc=alt?alt[1]:sc0;
  g.m=(WF_BODY[slot]?body:root).slice();
  let yy=y;if(slot==='head')yy+=P.bob*.5+(P.br||0)*2;            // the head rides the breath a little more than the body
  g.translate(x,yy);g.rotate(rot*Math.PI/180);if(slot==='torso'&&P.br)g.scale(1,1+.03*P.br);bone(slot);g.scale(sc,sc);
  const R=A.p[pc];if(K){const a=fsPc('wolf',pc,R,R.pv[0],R.pv[1],K);if(a)g.img(a,slot)}else g.list.push({n:pc,m:g.m.slice(),tag:slot})}
 return{list:g.list,tags:A.set.map(s=>s[0]),bones,pose:P,anim:st==='idle'?'idle':'howl',face:L.head.slice(5),look:L,rig:1}}
// the attack: a bite ability, else the scratch or (two in five) the bite
function wfPick(u,st,s){if(st!=='attack'||!s)return'';if(s.vaId&&fsNow()-(s.vaT||-1e9)<2500&&typeof AB==='object'&&AB[s.vaId]&&AB[s.vaId].fx==='bite')return'bite';
 return(((Math.round(s.at0||0)*7919+(u&&u.id|0)*104729)>>>0)%5<2)?'bite':''}
FS_DEF.wolf={atl:()=>typeof WFA==='object'?WFA:null,rig:wfRig,rigSt:{idle:1,cast:1,swap:1,reload:1},pick:wfPick,
 an:{walk:{f:'run',loop:1,rate:1},flee:{f:'run',loop:1,rate:1},attack:{f:'scratch',imp:3,hit:'melee',ms:520},bite:{f:'bite',imp:3,hit:'melee',ms:560},hit:{f:'hurt',ms:640},death:{f:'death'}}};
