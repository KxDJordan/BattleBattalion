/* ================= UNIT ANIMATION + OVERLAY (animfx) =================
   unitPose(u)                    -> reused {state,frame,dc,dr,ox,oy,alpha,flash,shadow, lift,tint}  (see CONTRACT.md)
   drawUnitOverlayPx(q,u,x,y,o)   -> HP/armor micro bar, status icons, active chevron, target brackets (art-pixel space)
   animEvent(type,data)           -> fed by fxEvent (FX.on); the controller also polls grid positions and `alive`,
                                     so units that never emit events (or appear mid-battle) still animate.
   animImpact(t,u,at,miss)        -> 75-fx.js tells the controller when a blow visibly lands (after wind-up / flight)
   Rules move units instantly and then sleep(); every duration here is the matching sleep scaled by SPEEDF, so the
   picture never trails the rules. SPEEDF<=0 or `reduced` snaps (reduced keeps flashes and a short death fade).
   Extra, optional pose fields beyond the contract: `lift` (board units of oy that are height above the ground, so the
   shadow can stay on the floor) and `tint` (a PAL key while a status colours the unit, else null). */
const AN_FR={idle:4,walk:4,attack:4,cast:4,hit:2,death:4},AN_FPS={idle:3,walk:10,attack:14,cast:11,hit:10,death:8};
const AN_WALK=0,AN_KB=1,AN_LEAP=2,AN_BLINK=3,AN_DASH=4,AN_STEP=5,AN_DIVE=6;
const AN_HIT_AT=.38;                       // share of a melee attack spent winding up before the blow lands
const ANIM=new WeakMap();
const POSE={state:'idle',frame:0,dc:0,dr:1,ox:0,oy:0,alpha:1,flash:0,shadow:1,lift:0,tint:null};
const ANB={t:-1e9,rot:-9,cx:32,cy:16,rx:-32,ry:16,hy:-16};   // board-space basis of +c, +r, +h under the current view
function anNow(){return typeof now==='number'&&now>0?now:typeof performance!=='undefined'?performance.now():0}
function anSp(){return(typeof reduced!=='undefined'&&reduced)||!(SPEEDF>0)?0:SPEEDF}
function anN(st,u){if(u&&typeof monsterFrames==='function'){const m=monsterFrames(u,st);if(m>0)return m}const F=typeof UNIT_FRAMES!=='undefined'&&UNIT_FRAMES?UNIT_FRAMES:null,n=F&&F[st]>0?F[st]:AN_FR[st];return n>0?n|0:1}
function anFps(st){const F=typeof UNIT_FPS!=='undefined'&&UNIT_FPS?UNIT_FPS:null;return F&&F[st]>0?F[st]:AN_FPS[st]}
function anBasis(t){const rot=typeof VIEW!=='undefined'&&VIEW?VIEW.rot|0:0;if(rot===ANB.rot&&t-ANB.t<400)return;ANB.rot=rot;ANB.t=t;
 try{const o=tpos(0,0,0),a=tpos(1,0,0),b=tpos(0,1,0),h=tpos(0,0,1);ANB.cx=a.x-o.x;ANB.cy=a.y-o.y;ANB.rx=b.x-o.x;ANB.ry=b.y-o.y;ANB.hy=h.y-o.y}catch(e){}}
/* the height a unit stands at: the highest tile of its footprint (size-2 units stand on 4 tiles) */
function anUH(u,c,r){const sz=u&&(u.sz||(u.def&&u.def.size>1?u.def.size:1))||1;if(sz<2)return anTileH(c,r);let h=0;for(let y=0;y<sz;y++)for(let x=0;x<sz;x++){if(c+x<BW&&r+y<BH){const v=anTileH(c+x,r+y);if(v>h)h=v}}return h}
function anTileH(c,r){const b=typeof B!=='undefined'?B:null;if(!b||!b.tiles)return 0;const tl=b.tiles[r*BW+c];return tl?tl.h:0}
function anOf(u){let s=ANIM.get(u);if(s)return s;const h=anUH(u,u.c,u.r);
 s={c:u.c,r:u.r,h,fc:u.c,fr:u.r,fh:h,vc:u.c,vr:u.r,vh:h,lift:0,va:1,mv:false,mt0:-1e9,mdur:1,mk:0,hop:0,wt0:-1e9,mend:-1e9,next:-1,
  dc:0,dr:u.side===0?-1:1,act:0,at0:-1e9,adur:1,lc:0,lr:0,hold:false,
  hitT:-1e9,hdur:1,hc:0,hr:0,dgT:-1e9,dead:!u.alive,deadT:-1e9,
  stm:0,hp:u.hp,arm:u.arm,helm:u.helm||0,lag:u.hp,lag0:u.hp,lagT:-1e9,spT:-1e9,spD:1,spK:0,wd:false,rev:-1,revT:-1e9,icn:0,ic:[null,null,null,null],tint:null,run:false,gath:false,hw:undefined,ha:undefined,swT:-1e9,swD:1,ow:null,oa:null,lkR:-1,ph:(((u.id|0)*7+(u.c|0)*3+(u.r|0)*5)%16)/16};
 ANIM.set(u,s);return s}
function anFace(s,dc,dr){if(!dc&&!dr)return;if(Math.abs(dc)>=Math.abs(dr)){s.dc=dc>0?1:-1;s.dr=0}else{s.dc=0;s.dr=dr>0?1:-1}}
function anAct(s,kind,t,dur,lc,lr){s.act=dur>0?kind:0;s.at0=t;s.adur=dur>0?dur:1;s.lc=lc;s.lr=lr}
/* visual grid position (fractional) at time t */
function anVis(u,s,t){if(!s.mv){s.vc=s.c;s.vr=s.r;s.vh=s.h;s.lift=0;s.va=1;return}
 let a=(t-s.mt0)/s.mdur;
 if(a>=1){const k=s.mk,drop=s.fh-s.h;s.mv=false;s.mend=t;s.vc=s.c;s.vr=s.r;s.vh=s.h;s.lift=0;s.va=1;
  if(typeof fxAnimLand==='function')try{fxAnimLand(u,k,drop)}catch(e){}return}
 if(a<0)a=0;const k=s.mk;let e=a,ev=a;s.va=1;
 if(k===AN_KB){e=1-(1-a)*(1-a);ev=s.h<s.fh?a*a:e}
 else if(k===AN_LEAP){e=a*a*(3-2*a);ev=e}
 else if(k===AN_DASH){e=1-(1-a)*(1-a)*(1-a);ev=e}
 else if(k===AN_STEP){e=1-(1-a)*(1-a);ev=e}
 else if(k===AN_DIVE){e=a*a;ev=e}
 else if(k===AN_BLINK){e=a<.5?0:1;ev=e;s.va=a<.38?1-a/.38:a>.62?(a-.62)/.38:0}
 s.vc=s.fc+(s.c-s.fc)*e;s.vr=s.fr+(s.r-s.fr)*e;s.vh=s.fh+(s.h-s.fh)*ev;s.lift=s.hop?Math.sin(Math.PI*a)*s.hop:0}
function anMove(u,s,kind){const t=anNow(),sp=anSp(),nh=anUH(u,u.c,u.r),oc=s.c,or=s.r,dc=u.c-oc,dr=u.r-or,dist=Math.abs(dc)+Math.abs(dr);
 anVis(u,s,t);if(kind<0)kind=s.next>=0?s.next:dist>1?AN_LEAP:AN_WALK;s.next=-1;
 s.fc=s.vc;s.fr=s.vr;s.fh=s.vh;s.c=u.c;s.r=u.r;s.h=nh;if(kind!==AN_KB)anFace(s,dc,dr);
 if(!sp){s.mv=false;s.vc=s.c;s.vr=s.r;s.vh=nh;s.lift=0;s.va=1;return}
 const dh=nh-s.fh,ah=Math.abs(dh);
 s.mdur=Math.max(30,(kind===AN_WALK?105:kind===AN_KB?120:kind===AN_STEP?170:kind===AN_DIVE?260:200)*sp);s.mt0=kind===AN_KB&&s.hitT>t?s.hitT:t;s.mk=kind;
 s.hop=kind===AN_DIVE?0:s.fly&&kind===AN_WALK?0:kind===AN_WALK?(ah>.05?8+ah*6:0):kind===AN_LEAP?26+dist*8:kind===AN_STEP?8:kind===AN_KB?(dh>.05?10:4):0;
 if(kind===AN_WALK&&(!s.mv&&t-s.mend>90))s.wt0=t;
 s.mv=true;if(typeof fxAnimMove==='function')try{fxAnimMove(u,kind,oc,or,dist)}catch(e){}}
function animEvent(type,d){if(!d)return;const t=anNow(),sp=anSp();
 if(type==='move'){if(d.u)anMove(d.u,anOf(d.u),-1)}
 else if(type==='kb'){if(d.t)anMove(d.t,anOf(d.t),AN_KB)}
 else if(type==='cast'){const u=d.u;if(!u)return;const s=anOf(u),ab=d.ab||{};if(ab.id==='swap'||ab.swap){anSwapPoll(u,s,anNow(),anSp());return}
  const fx=ab.fx||'';s.va=AN_VAR[fx]||'';s.vaT=t;s.next=fx==='dive-land'?AN_DIVE:ab.id==='blink'||fx==='blink'?AN_BLINK:ab.id==='gale'?AN_LEAP:ab.id==='footwork'||fx==='dash'?AN_STEP:ab.dash||fx==='charge'?AN_DASH:ab.tgt==='move'&&ab.leap?AN_LEAP:-1;s.hold=false;
  if(d.t&&d.t!==u)anFace(s,d.t.c-u.c,d.t.r-u.r);else if(d.k>=0&&ab.tgt==='tile')anFace(s,d.k%BW-u.c,((d.k/BW)|0)-u.r);
  if(ab.reloadW||ab.id==='reload'){anAct(s,3,t,Math.max(1,560*sp),0,0);return}
  if(ab.tgt==='aoe')anAct(s,1,t,260*sp,0,0);else if(!(ab.wpn||ab.id==='shove'||fx==='shove'||ab.tgt==='move'||ab.withdraw)){anAct(s,2,t,380*sp,0,0);s.hold=true}}
 else if(type==='spawn'){const u=d.u;if(!u)return;const s=anOf(u);s.dead=false;s.wd=false;s.c=u.c;s.r=u.r;s.h=anTileH(u.c,u.r);s.mv=false;s.hp=u.hp;s.lag=s.lag0=u.hp;s.arm=u.arm;s.helm=u.helm||0;if(!sp)return;
  s.spT=t;s.spK=u.side===0?0:u.risen?1:2;s.spD=(s.spK===1?620:s.spK===2?420:260)*sp;
  if(s.spK===0){const e=typeof EDGE==='object'&&EDGE?EDGE[0]:BH-1;s.fc=u.c;s.fr=u.r+(e>BH/2?1.4:-1.4);s.fh=s.h;s.mv=true;s.mt0=t;s.mdur=460*sp;s.mk=AN_WALK;s.hop=0;s.wt0=t;anFace(s,0,u.r-s.fr)}}   // a reserve walks in from beyond its own edge
 else if(type==='withdraw'){const u=d.u;if(!u)return;const s=anOf(u);s.wd=true;s.dead=false}
 else if(type==='hit'||type==='miss'){const u=d.u,tg=d.t;if(!u||!tg||u===tg)return;const s=anOf(u),dc=tg.c-u.c,dr=tg.r-u.r,ad=Math.abs(dc)+Math.abs(dr);anFace(s,dc,dr);
  if(t-(s.ffT||-1e9)<900&&type==='hit')return;                                                          // a stray shot's hit on the ally: the shooter already loosed it
  const ln=ad===1||(ad===2&&(!dc||!dr)&&tg.alive&&u.wpn&&(u.wpn.rng|0)>=2&&!(typeof isRangedW==='function'&&isRangedW(u.wpn)));
  if(s.hold&&s.act===2){s.adur=Math.max(s.adur,t-s.at0+240*sp)}else anAct(s,1,t,240*sp,ln?s.dc:0,ln?s.dr:0)}
 else if(type==='ff'){if(d.u)anOf(d.u).ffT=t}
 else if(type==='death'){const tg=d.t;if(!tg)return;const s=anOf(tg);if(!s.dead){s.dead=true;s.deadT=SPEEDF>0?Math.max(t,s.hitT):-1e9}}
 else if(type==='turn'){if(d.u){const s=anOf(d.u);s.hold=false;s.va=''}}
 else if(type==='heal'){const tg=d.t;if(tg&&tg.def&&tg.def.regen){const s=anOf(tg);s.va='regen';s.vaT=t;anAct(s,2,t,520*sp,0,0)}}}
/* which variant of its attack / cast a monster shows (its sprite has poses per variant: a wyvern's sting, buffet or dive, an ogre's
   overhead slam, an ent's roots or bark): from the ability's fx hint, for 2.5 s after it was used */
const AN_VAR={sting:'sting',buffet:'buffet','dive-land':'dive',dive:'takeoff',smash:'slam',quake:'slam',crush:'coil',coil:'coil',spit:'spit',roots:'roots',bark:'bark',summon:'roots',lash:'',bite:''};
function anVariant(u){const s=ANIM.get(u);if(!s||!s.va)return'';return anNow()-s.vaT<2500?s.va:''}
/* called by the effects when a blow will visibly land on `tg` at time `at` (ms, same clock as `now`) */
function animImpact(tg,u,at,miss){if(!tg)return;const s=anOf(tg),sp=anSp();
 if(u&&u!==tg)anFace(s,u.c-tg.c,u.r-tg.r);
 if(miss){s.dgT=sp?at:-1e9;return}
 s.hitT=SPEEDF>0?at:-1e9;s.hdur=Math.max(130,230*(sp||1));s.hc=0;s.hr=0;
 if(u&&u!==tg&&sp){const dc=tg.c-u.c,dr=tg.r-u.r;if(Math.abs(dc)>=Math.abs(dr))s.hc=dc>0?1:-1;else s.hr=dr>0?1:-1}}
/* ---- weapon swap: the rules exchange u.wid / u.alt (an enemy's u.wpn) at once; the figure takes ~0.45 s to follow:
   swap frame 0 puts the old weapon away (still drawn: anHandOv hands the old pair to the sprite), 1 draws the other from its place, 2 brings it to guard */
const AN_H={w:null,a:null},AN_HO={w:null,a:null};
function anSwapPoll(u,s,t,sp){if(typeof usHand!=='function'||t-s.swT<s.swD*.34)return;const pw=s.hw,pa=s.ha;usHand(u,AN_H);
 if(pw!==undefined&&(AN_H.w!==pw||AN_H.a!==pa)&&u.alive&&!s.dead){if(sp){s.swT=t;s.swD=Math.max(240,460*sp);s.ow=pw;s.oa=pa}if(typeof fxSwap==='function')try{fxSwap(u,s.swD)}catch(e){}}
 s.hw=AN_H.w;s.ha=AN_H.a}
function anHandOv(u){const s=ANIM.get(u);if(!s||!(anNow()-s.swT<s.swD*.34))return null;AN_HO.w=s.ow;AN_HO.a=s.oa;return AN_HO}
function anLunge(a){return a<.2?-.07*(a/.2):a<AN_HIT_AT?-.07+.41*((a-.2)/(AN_HIT_AT-.2)):a<.56?.34:.34*(1-(a-.56)/.44)*(1-(a-.56)/.44)}
function unitPose(u){const P=POSE,s=anOf(u),t=anNow(),sp=anSp();anBasis(t);
 if(u.c!==s.c||u.r!==s.r)anMove(u,s,-1);
 if(!u.alive&&!s.dead&&!s.wd){if(u.gone)s.wd=true;else{s.dead=true;s.deadT=SPEEDF>0?Math.max(t,s.hitT):-1e9}}else if(u.alive&&(s.dead||s.wd)){s.dead=false;s.wd=false}
 anVis(u,s,t);anSwapPoll(u,s,t,sp);
 // displayed hp/armor follow the rules only once the blow has visibly landed
 if(t>=s.hitT){if(u.hp<s.hp){s.lag0=Math.max(s.lag,s.hp);s.lagT=t}s.hp=u.hp;s.arm=u.arm;s.helm=u.helm||0;if(s.rev!==SHV.rev||t-s.revT>700)anStRefresh(u,s,t)}else{if(u.hp>s.hp)s.hp=u.hp;if(u.arm>s.arm)s.arm=u.arm;if(u.helm>s.helm)s.helm=u.helm}
 {const k=(t-s.lagT-300)/260;s.lag=k<=0?s.lag0:k>=1?s.hp:s.lag0+(s.hp-s.lag0)*k;if(s.lag<s.hp)s.lag=s.lag0=s.hp}
 let gx=s.vc-u.c,gy=s.vr-u.r,lift=s.lift,state='idle',frame=0,alpha=s.va,flash=0,n;
 const dt=t-s.deadT,hb=(t-s.hitT)/s.hdur;
 if(s.dead&&dt>=0){n=anN('death',u);const C=sp?Math.max(210,420*sp):1,hold=sp?150:60,fade=sp?320:220;state='death';
  frame=n<2?0:dt>=C?n-1:Math.min(n-2,(dt/C*(n-1))|0);alpha=dt<C+hold?1:Math.max(0,1-(dt-C-hold)/fade);if(dt<90)flash=1-dt/90;
  if(hb>=0&&hb<1){const k=.14*(1-hb)*(1-hb);gx+=s.hc*k;gy+=s.hr*k}}
 else{
  if(hb>=0&&hb<1){n=anN('hit',u);state='hit';frame=Math.min(n-1,(hb*n)|0);flash=hb<.42?1-hb/.42:0;const k=.14*(1-hb)*(1-hb);gx+=s.hc*k;gy+=s.hr*k}
  else if(s.mv&&t>=s.mt0){const k=s.mk;
   if(k===AN_BLINK){n=anN('cast',u);state='cast';frame=Math.min(n-1,n>>1)}
   else if(k===AN_KB){n=anN('hit',u);state='hit';frame=n-1}
   else if(k===AN_DASH){state='attack';frame=0}
   else{n=anN('walk',u);state='walk';frame=(((t-s.wt0)*anFps('walk')/1000/Math.max(sp,.5))|0)%n;if(frame<0)frame=0}}
  else if(t-s.swT<s.swD){const a=(t-s.swT)/s.swD;state='swap';frame=a<.34?0:a<.67?1:2;if(anN('swap',u)<3)state='idle',frame=0}
  else if(s.act&&t-s.at0<s.adur){const a=(t-s.at0)/s.adur;
   if(s.act===1){n=anN('attack',u);state='attack';frame=Math.min(n-1,(a*n)|0);if(s.lc||s.lr){const L=anLunge(a);gx+=s.lc*L;gy+=s.lr*L}}
   else if(s.act===3){n=anN('reload',u);state=n>1?'reload':'cast';frame=Math.min(n-1,((t-s.at0)*anFps('reload')/1000/Math.max(sp,.45))|0)%n}
   else{n=anN('cast',u);state='cast';frame=Math.min(n-1,((t-s.at0)*anFps('cast')/1000/Math.max(sp,.45))|0)}}
  else if(sp&&s.gath){n=anN('cast',u);state='cast';frame=Math.min(n-1,1);lift+=((t/120)|0)&1?2:0}                       // gathering a telegraphed attack: arms raised, trembling
  else if(sp&&s.run){n=anN('walk',u);state='walk';frame=((t*14/1000+s.ph*n)|0)%n;gx+=(((t/90)|0)&1?.03:-.03)}               // fleeing: runs on the spot, shaking, until its turn takes it away
  else if(sp){n=anN('idle',u);frame=((t*anFps('idle')/1000+s.ph*n)|0)%n}
  const db=sp?(t-s.dgT)/(210*sp):-1;if(db>=0&&db<1){const k=.17*Math.sin(Math.PI*db);gx+=s.dr*k-s.dc*k*.5;gy+=s.dc*k-s.dr*k*.5}}
 lift=Math.round(lift/2)*2;
 P.state=state;P.frame=frame;P.dc=s.dc;P.dr=s.dr;
 P.ox=Math.round((gx*ANB.cx+gy*ANB.rx)/2)*2;P.oy=Math.round((gx*ANB.cy+gy*ANB.ry+(s.vh-s.h)*ANB.hy)/2)*2-lift;
  let rise=0;if(s.wd)alpha=0;                                                                                         // a unit that left the field is drawn by the effect that walks it off
 else if(t-s.spT<s.spD){const a=Math.max(0,(t-s.spT)/s.spD);if(s.spK===1){rise=Math.round((1-a)*9)*2;alpha*=a<.15?0:((t/60)|0)&1&&a<.5?.55:1}else if(s.spK===2)alpha*=a<.3?0:a<.6?(((t/50)|0)&1?.9:.3):1;else alpha*=Math.min(1,a*2.5)}
 const hv=anHover(u,s,t,sp);if(hv){lift+=hv;P.oy-=hv}
 P.alpha=alpha;P.flash=flash;P.lift=lift;P.shadow=alpha*(1-Math.min(.6,lift/70));P.oy+=rise;P.tint=!s.dead&&t>=s.hitT?(s.gath&&((t/160)|0)&1?'C':s.tint):null;return P}
/* fliers hover over the ground (the board draws their shadow on it): higher while gathering a dive, falling when killed,
   down on the ground while grounded. Eased, in board units. */
function anHover(u,s,t,sp){const mi=typeof umon==='function'?umon(u):null;if(!mi||!mi.fly){s.fly=false;return 0}s.fly=true;
 const gr=u.st&&u.st.grounded>0,dv=u.st&&u.st.diving>0,tg=s.dead||gr||!u.alive?0:mi.lift*2+(dv?64:0),dt=Math.min(100,t-(s.hvT||t));s.hvT=t;
 if(s.hv==null||!sp)s.hv=tg;else{const k=1-Math.exp(-dt/(tg<s.hv?(s.dead?120:150):260));s.hv+=(tg-s.hv)*k;if(Math.abs(tg-s.hv)<.5)s.hv=tg}
 const bob=sp&&!s.dead&&!gr&&tg>0?Math.round(Math.sin(t/260+s.ph*6.28)*1.5)*2:0;return Math.round((s.hv+bob)/2)*2}
/* true while the unit is still worth drawing after death (collapse + fade) */
function unitVisible(u){if(u.alive)return true;const s=anOf(u);return anNow()-s.deadT<1100}

/* ---------------- overlay: bars, statuses, markers (art-pixel space) ---------------- */
const AN_OV={cur:false,big:false,tgt:false},AN_SPR={};
const AN_CHEV=['.0000000.','0ddddddd0','.0ccccc0.','..0cbc0..','...0b0...','....0....'];
function anSprite(id){let c=AN_SPR[id];if(c!==undefined)return c;c=null;
 if(id==='chev0')c=px(AN_CHEV);else if(id==='chev1')c=px(AN_CHEV,{d:'h',c:'g',b:'f'});
 else{const rows=typeof iconRows==='function'?iconRows(id):null;      // status icon with a 1px dark outline, 18x18
  if(rows){const ic=px(rows),m={};for(const k in PAL)m[k]='0';const sil=px(rows,m);c=pxCanvas(18,18);
   if(c&&ic&&sil){const q=c.getContext('2d');q.drawImage(sil,0,1);q.drawImage(sil,2,1);q.drawImage(sil,1,0);q.drawImage(sil,1,2);q.drawImage(ic,1,1)}else c=null}}
 AN_SPR[id]=c;return c}
/* what hangs over a unit, re-read only when something happened (SHV.rev) or every 0.7 s: the morale flag when it is not steady,
   then up to three statuses from the rules' list, the pressing ones first; also the body tint and the fleeing / gathering poses */
const AN_PRI={stun:0,nova:0,webbed:1,web:1,root:1,grab:1,daze:2,bleed:2,poison:2,burn:2,chill:3,hex:3,panic:1,enrage:1};
const AN_TINT={chill:'F',webbed:'l',web:'l',poison:'A',hex:'C',enrage:'g',ward:'x'};
function anStRefresh(u,s,t){s.rev=SHV.rev;s.revT=t;const ic=s.ic;let n=0,tint=null,tp=9;const m=typeof shMor==='function'?shMor(u):-1;
 s.run=m===0||!!(u.st&&u.st.panic);s.gath=!!(u.st&&u.st.nova);
 if(m>=0&&m!==3){const c=anSprite('morale-'+m);if(c)ic[n++]=c}
 let lk=false;try{lk=typeof shLocked==='function'&&shLocked(u)}catch(e){}if(lk){const c=anSprite('ranged-lock');if(c)ic[n++]=c}
 let L=null;try{L=shStatuses(u)}catch(e){}
 if(L){for(let pass=0;pass<4&&n<4;pass++)for(let i=0;i<L.length&&n<4;i++){const k=L[i].key,S=shStatus(k),pr=AN_PRI[k]!=null?AN_PRI[k]:S&&S.good?5:4,band=pr<=1?0:pr<=3?1:pr===4?2:3;if(band!==pass)continue;
    const c=anSprite('st-'+k);if(!c)continue;let dup=false;for(let j=0;j<n;j++)if(ic[j]===c)dup=true;if(!dup)ic[n++]=c}
  for(let i=0;i<L.length;i++){const k=L[i].key,pr=AN_PRI[k]!=null?AN_PRI[k]:6;if(AN_TINT[k]&&pr<tp){tp=pr;tint=AN_TINT[k]}}}
 s.icn=n;s.tint=tint}
/* The bars and the target brackets are painted once into small canvases (per unit / per bracket shape) and re-painted only when
   what they show changes (a numeric key of every input), so a frame costs one drawImage per unit instead of ~20 fillRects.
   The pixels are the same: the canvas holds exactly the rects the frame used to fill, blitted at whole art pixels. Only when
   the board is drawn at a whole-number scale (o.exact, set by the board): mid-zoom or mid-rotation the rects are filled
   directly as before, since a scaled fillRect and a scaled blit round their edges differently. */
const AN_BOB=[0,1,2,1],AN_BRK=new Map();
function anOvCv(c,w,h){if(!c)c=pxCanvas(w,h);else if(c.width!==w||c.height!==h){c.width=w;c.height=h}else c.getContext('2d').clearRect(0,0,w,h);return c}
// brackets round a target, origin (X,Y) = (l-1, a-1) of the old code: W = 2hw+2p+4 wide, H = hh+2p+1 tall
function anBrkPaint(q,X,Y,hw,hh,L,p){const W=2*hw+2*p+4,H=hh+2*p+1,l=X+1,r=X+W-2,a=Y+1,b=Y+H-2;
 q.fillStyle=PAL['0'];q.fillRect(l-1,a-1,L+2,3);q.fillRect(l-1,a-1,3,L+2);q.fillRect(r-L,a-1,L+2,3);q.fillRect(r-1,a-1,3,L+2);
 q.fillRect(l-1,b-1,L+2,3);q.fillRect(l-1,b-L,3,L+2);q.fillRect(r-L,b-1,L+2,3);q.fillRect(r-1,b-L,3,L+2);
 q.fillStyle=PAL[p?'e':'h'];q.fillRect(l,a,L,1);q.fillRect(l,a,1,L);q.fillRect(r-L+1,a,L,1);q.fillRect(r,a,1,L);
 q.fillRect(l,b,L,1);q.fillRect(l,b-L+1,1,L);q.fillRect(r-L+1,b,L,1);q.fillRect(r,b-L+1,1,L)}
function anBrackets(hw,hh,L,p){const id=((hw*64+hh)*16+L)*2+p;let c=AN_BRK.get(id);if(c)return c;
 c=anOvCv(null,2*hw+2*p+4,hh+2*p+1);if(!c)return null;anBrkPaint(c.getContext('2d'),0,0,hw,hh,L,p);AN_BRK.set(id,c);return c}
// bars, origin (X,Y) = (x0, top-3): w+5 wide (frame + shield pip), bh+3 tall (the pip may reach 3 rows above the frame)
function anBarsPaint(q,X,Y,w,bh,helm,arm,ah,aa,hw,lw,low,foe,sw,scol){const x0=X,top=Y+3,hx=x0+1,hy=top+bh-3;
 q.fillStyle=PAL['0'];q.fillRect(x0+1,top,w,bh);q.fillRect(x0,top+1,w+2,bh-2);
 if(helm){q.fillStyle=PAL['3'];q.fillRect(hx,top+1,w,1);if(ah){q.fillStyle=PAL['c'];q.fillRect(hx,top+1,ah,1);q.fillStyle=PAL['e'];q.fillRect(hx+ah-1,top+1,1,1)}}
 if(arm){const ay=top+(helm?3:1);q.fillStyle=PAL['3'];q.fillRect(hx,ay,w,1);if(aa){q.fillStyle=PAL['q'];q.fillRect(hx,ay,aa,1);q.fillStyle=PAL['r'];q.fillRect(hx+aa-1,ay,1,1)}}
 q.fillStyle=PAL['2'];q.fillRect(hx,hy,w,2);
 if(lw>hw){q.fillStyle=PAL['e'];q.fillRect(hx+hw,hy,lw-hw,2)}
 if(hw){q.fillStyle=PAL[foe?'h':'6'];q.fillRect(hx,hy,hw,1);q.fillStyle=PAL[foe?'g':'5'];q.fillRect(hx,hy+1,hw,1);
  if(low){q.fillStyle=PAL['r'];q.fillRect(hx,hy,hw,1)}
  q.fillStyle=PAL[foe?'f':'7'];for(let i=4;i<hw;i+=4)q.fillRect(hx+i-1,hy+1,1,1)}
 if(sw){q.fillStyle=PAL['0'];q.fillRect(x0+w+2,top+bh-7,3,7);q.fillStyle=PAL['3'];q.fillRect(x0+w+3,top+bh-6,1,5);q.fillStyle=PAL[scol?'E':'k'];q.fillRect(x0+w+3,top+bh-1-sw,1,sw)}}   // shield hitpoints: a wooden pip beside the bars
function drawUnitOverlayPx(q,u,x,y,o){if(!u||!u.alive||!q)return;o=o||AN_OV;const s=anOf(u),t=anNow(),big=!!o.big,wide=!!o.wide,w=wide?30:big?22:16,rm=typeof reduced!=='undefined'&&reduced,
  noBars=u.side===0&&(o.bars===false||(typeof SET!=='undefined'&&SET&&SET.allyBars===false));
 x=Math.round(x);y=Math.round(y);const arm=u.armMax>0,helm=u.helmMax>0,bh=4+(arm?2:0)+(helm?2:0),x0=x-(w>>1)-1,top=y-2-bh,foe=u.side!==0;
 if(o.tgt){const hw=wide?32:big?20:12,hh=o.top?o.top+(wide?4:0):big?46:30,p=rm?0:((t/170)|0)&1,L=wide?8:big?6:4,X=x-hw-2-p,Y=y-p,c=o.exact?anBrackets(hw,hh,L,p):null;if(c)q.drawImage(c,X,Y);else anBrkPaint(q,X,Y,hw,hh,L,p)}
 // frame with clipped corners; rows from the top: head armor (brass), body armor (steel), hitpoints
 if(!noBars){const hp=Math.max(0,Math.min(u.hpMax,s.hp)),hw=hp>0?Math.max(1,Math.round(w*hp/u.hpMax)):0,lw=Math.min(w,Math.round(w*Math.max(0,s.lag)/u.hpMax)),
  ah=helm&&s.helm>0?Math.max(1,Math.round(w*Math.min(1,s.helm/u.helmMax))):0,aa=arm&&s.arm>0?Math.max(1,Math.round(w*Math.min(1,s.arm/u.armMax))):0,
  low=hw&&hp<u.hpMax*.3&&!rm&&((t/260)|0)&1?1:0,sw=u.shpMax>0&&u.shield?Math.max(1,Math.round(5*u.shp/u.shpMax)):0,scol=sw&&u.shp<u.shpMax*.4?1:0,lx=lw>hw?lw:0;
  const k=((((((((((w*2+(arm?1:0))*2+(helm?1:0))*32+ah)*32+aa)*32+hw)*32+lx)*2+low)*2+(foe?1:0))*8+sw)*2+scol);   // every input of the picture
  if(!o.exact){anBarsPaint(q,x0,top-3,w,bh,helm,arm,ah,aa,hw,lx,low,foe,sw,scol)}
  else{if(s.obK!==k||!s.obC){s.obK=-1;const c=s.obC=anOvCv(s.obC,w+5,bh+3);if(c){anBarsPaint(c.getContext('2d'),0,0,w,bh,helm,arm,ah,aa,hw,lx,low,foe,sw,scol);s.obK=k}}
   if(s.obK===k)q.drawImage(s.obC,x0,top-3);else anBarsPaint(q,x0,top-3,w,bh,helm,arm,ah,aa,hw,lx,low,foe,sw,scol)}}
 // morale flag and status icons (16x16 native, outlined), packed tighter when there are many
 if(s.rev<0)anStRefresh(u,s,t);
 const n=s.icn>3?3:s.icn;let ty=top;
 if(n){const step=n<3?14:12,ic=s.ic;let ix=x-((n-1)*step>>1)-9;const iy=top-15;ty=top-13;
  for(let i=0;i<n;i++){const c=ic[i];if(c)q.drawImage(c,ix,iy);ix+=step}}
 if(o.cur){const c=anSprite(foe?'chev1':'chev0'),bob=rm?0:AN_BOB[((t/140)|0)&3];if(c)q.drawImage(c,x-4,ty-8-bob)}}
