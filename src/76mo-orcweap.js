/* ================= THE ORCS' WEAPONS, DRAWN LIVE (Detail High; 76k-orc.js figures) =================
   The four orcs (the warrior 'orcw', the crusher 'obrute', the warlord 'orcl', the brave 'orcy') hold the unit's own weapon, drawn in real
   time with the painted item art the skeletons use (76m-skelsol.js skGear / skBake: humWIc + humDrawWAny, the weapon icons): a swapped or
   looted weapon shows as itself, a two-hander (the warrior's war axe swapped for a great axe ...) is held two-handed. No sheet paints a
   weapon any more: the warrior's axe and the crusher's war hammer were erased from their drawn frames (assets/orcweapons.py, run by
   assets/make-orc-atlas.py), which records the hands per frame (76j-orcatlas.js .grip[row][i] = {w, s: the weapon / off hand, WU from the
   anchor; fw, fs: the fist round each as its own piece}; .rg: the rig's); the warlord's and brave's hands are their colour keys (.hands).
   - The angle is not the line through the hands (side by side, that lies flat into the next tile): OR_ANG gives each orc's weapon a
     per-frame angle (deg, screen, the figure facing right; -90 straight up, 0 forward, +x of the weapon towards its head). The attack is
     a swing: raised and drawn back through the wind-up frames (the angle falling to its most drawn-back), swept forward over the top
     to the blow on the impact frame (the angle rising to it; FS an.attack.imp), following through and back to the guard; in the run,
     the hurt row and the idle the weapon is carried head up, 30 to 60 deg off the vertical. Death lets it fall with the body.
   - One-handed: the grip on the weapon fist. Two-handed (the crusher's maul, the warlord's great axe): the haft through the weapon fist
     at the frame's angle, its head 110 SU past that fist (as the skeletons' halberd), the off fist along it as near as the frame has it.
   - Layer: under the figure (the frame's own fist closes over the grip; a weapon raised behind the head stays behind it), or, where the
     crusher holds his hammer across his body (OR_OVER), over it with the frame's fists (their pieces) drawn over the haft again.
   - Cast (the war cry, any cast row): no weapon in the hands. It hangs at the belt on the near hip (OR_HIP, from the anchor in the
     attack row's heights), head down and swung back behind the near leg, at its own size; a long one slants further back so its head
     clears the ground.
   - Size: the gear at the figure's own scale (SHEETS[id].h over a man's 27 art px; the warlord's great axe half again).
   The idle rig (76k-orc.js orRig) draws it in place of the old cut-out piece (the warrior's 'axe', the crusher's 'hammer' slot: the
   weapon at that slot's depth, swaying with it), and the warlord's and brave's rigs at their weapon hand, under the figure. No rnd(). */
const OR_WPN={orcw:'waraxe',obrute:'maul',orcl:'lordaxe',orcy:'handaxe'},OR_GS={orcl:1.15};
// per frame angles (deg); a number: every frame of the row
const OR_ANG={
 orcw:{idle:-52,run:[-48,-52,-56,-52,-48,-45,-46],attack:[-55,-80,-108,-150,-72,14,-38],hurt:[-50,-56,-64,-58,-52,-50,-50],death:[-50,-36,-20,-4,6,8,8]},
 obrute:{idle:-48,run:[-48,-51,-54,-51,-48,-45,-44,-46],attack:[-50,-74,-112,-152,-62,24,-32,-44],hurt:[-48,-54,-62,-58,-52,-50,-50,-48],death:[-48,-34,-18,0,2,2,2]},
 orcl:{idle:-50,run:[-48,-51,-54,-51,-48,-45,-46],attack:[-50,-86,-140,-14,34,-30,-44],hurt:[-50,-55,-60,-56,-52,-50,-50],death:[-50,-38,-14,0,2,2]},
 orcy:{idle:-55,run:[-52,-56,-60,-56,-52,-48,-46,-49],attack:[-55,-95,-135,-20,30,-36,-50],hurt:[-52,-58,-64,-58,-52,-50,-52],death:[-52,-40,-16,-2,4,6]}};
// frames where the weapon is held in front of the body (over the frame, its fists over the haft)
const OR_OVER={obrute:{run:1,attack:[0,1,4,5,6,7],hurt:1,death:1}};
// the belt on the near hip (share of the atlas's H from the anchor)
const OR_HIP={orcw:[-.2,-.4],obrute:[-.21,-.38],orcl:[-.2,-.42],orcy:[-.18,-.42]};
function orAng(id,row,i){const T=OR_ANG[id],v=T&&T[row||'idle'];return typeof v==='number'?v:v&&v.length?v[Math.min(i,v.length-1)]:T?T.idle:-50}
function orOver(id,row,i){const o=OR_OVER[id]&&OR_OVER[id][row];return o===1||!!(o&&o.indexOf(i)>=0)}
function orGear(id,u){let S=null;try{S=u&&typeof usLook==='function'?usLook(u).S:null}catch(e){S=null}
 const W=S&&S.wd||usWdef(OR_WPN[id]),wi=typeof humWIc==='function'?humWIc(W,S&&S.wdI):humWInfo(W);
 return{W,wi,two:!!(W.two||wi.fam==='polearm'||wi.fam==='spear'&&W.two)}}
function orGs(id){const S=typeof SHEETS==='object'&&SHEETS[id];return(S?S.h:27)/27*(OR_GS[id]||1)}
// the hands of a drawn frame (row, i) or of the rig ('' : the setup pose)
function orHands(id,A,row,i){if(A.grip)return row?A.grip[row]&&A.grip[row][i]:A.rg;return row?A.hands&&A.hands[row]&&A.hands[row][i]:A.rh}
function orDress(Fr,id,u,K,row,i,dy){if(!K)return;const A=FS_DEF[id].atl();if(!A)return;const H=orHands(id,A,row,i);if(!H||!H.w)return;
 const G=orGear(id,u),sc=Fr.sc/orGs(id),Ksu=K/sc,inv=1/sc,cast=row==='cast',bob=row?0:(Fr.pose&&Fr.pose.bob||0);
 const att=skBake('w:'+G.wi.id+':'+(G.wi.ic?1:0),Ksu,[-260,-200,620,200],g=>humDrawWAny(g,G.wi,{}));if(!att)return;
 let deg,o;
 if(cast){// hung at the belt on the near hip: the haft through the belt near its butt, the head down and back behind the near leg
  const hp=OR_HIP[id]||[-.2,-.4],bx=hp[0]*A.H,by=hp[1]*A.H+(dy||0),L=Math.max(40,G.wi.len||120)*inv,drop=-by*.74,s=Math.min(.94,drop/(L*.82));
  deg=180-Math.asin(Math.max(.2,s))*180/Math.PI;const a=deg*Math.PI/180,k=L*.18;o=[bx-Math.cos(a)*k,by-Math.sin(a)*k]}
 else{let w=[H.w[0],H.w[1]+(dy||0)+bob];
  if(!row&&A.rg&&Fr.bones){// the rig: follow its weapon slot's bone (the warrior's arm sway)
   const sl=A.set.find(s=>s[0]===A.rg.slot),M=Fr.bones[A.rg.slot];
   if(sl&&M){const r=-sl[4]*Math.PI/180,lx=A.rg.w[0]-sl[2],ly=A.rg.w[1]-sl[3],qx=lx*Math.cos(r)-ly*Math.sin(r),qy=lx*Math.sin(r)+ly*Math.cos(r);
    w=[M[0]*qx+M[2]*qy+M[4],M[1]*qx+M[3]*qy+M[5]]}}
  deg=orAng(id,row,i);
  if(!row&&A.rg&&Fr.bones){const sl=A.set.find(s=>s[0]===A.rg.slot),M=Fr.bones[A.rg.slot];if(sl&&M)deg+=Math.atan2(M[1],M[0])*180/Math.PI-sl[4]}
  o=w;if(G.two){const k=(G.wi.len-110)*inv,a=deg*Math.PI/180;o=[w[0]-Math.cos(a)*k,w[1]-Math.sin(a)*k]}}
 const g=new HskRec();g.translate(o[0],o[1]);g.rotate(deg*Math.PI/180);g.scale(inv,inv);g.img(att,'weapon');const item=g.list[0];
 const over=!cast&&row&&orOver(id,row,i)&&A.grip,fists=[];
 if(over)for(const k of['fw','fs']){const n=H[k],R=n&&A.p[n];if(!R)continue;const a=fsPc(id,'pc:'+n,R,R.pv[0],R.pv[1],K);if(!a)continue;const q=H[k==='fw'?'w':'s'];
  const h=new HskRec();h.translate(q[0],q[1]+(dy||0));h.img(a,'fist');fists.push(h.list[0])}
 const slot=!row&&A.rg?Fr.list.findIndex(x=>x.tag===A.rg.slot):-1;
 if(slot>=0){Fr.list=Fr.list.slice();Fr.list[slot]=item;Fr.tags=Fr.tags.map(t=>t===A.rg.slot?'weapon':t)}   // the rig: in place of the old cut-out piece
 else if(over){Fr.list=Fr.list.concat([item],fists);Fr.tags=Fr.tags.concat(['weapon'],fists.length?['fist']:[])}
 else{Fr.list=[item].concat(Fr.list);Fr.tags=['weapon'].concat(Fr.tags)}
 Fr.gear={two:G.two,w:G.wi.id,deg,at:cast?'belt':'hand',layer:slot>=0?'slot':over?'over':'under',hand:cast?null:H.w}}
for(const id of['orcw','obrute','orcl','orcy'])if(FS_DEF[id])Object.assign(FS_DEF[id],{dress:orDress,dressKey:u=>{const G=orGear(id,u);return G.wi.id+':'+orGs(id)}});
