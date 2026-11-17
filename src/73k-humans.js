/* ================= HUMAN FIGURES FROM THE PARTS SHEET (Detail High; human and elf battle figures) =================
   Every person on the board (player mercs, rivals, fabled warriors, house soldiers, brigands, gladiators, barbarians, the
   Shogunate, necromancers ...) is composed at Detail High from the modular body parts of assets/human-parts.webp (HPA in
   73j-humanatlas.js): head (human or elf), torso (man or woman), shoulder+forearm, hand, leg (trousers or shorts), each a front
   (facing bottom-right) and a back (facing top-left) piece. Faces 1 and 3 are faces 0 and 2 mirrored.
   1. Tint (per look, once): each piece's fill layers are grey shade multiplied by the look's colours (skin, the armour's body /
      sleeve / forearm / glove / trousers / boots from usArmor(S) of 73-units.js) and the black outline layer goes back on top.
      Armour texture (mail rows, lames, scales, lamellar lacing, studs, quilting, robe trim, tabard / surcoat with the emblem)
      is painted over the tinted torso (source-atop, so it never leaves the piece) under the outline.
   2. Pose (per frame): a small rig in sheet px ("SU", feet at 0,0, forward = +x in body space): the hands are placed by the
      pose and the arms aimed at them from the shoulders (rotate + a little stretch), legs swing from the hips, the upper body
      leans and bobs. Layer order, front view: stowed gear, off arm + hand (far), far leg, near leg, skirt, torso, head + hair +
      helmet, shield (on the far arm, ahead of the body), near arm, weapon, near hand. Back view: shield (away from the camera),
      weapon arm (far) + weapon + hand, legs, torso, back gear (quiver, cape, sheath), head, near arm + hand.
   3. Gear is vector art in the sheet's style (thick black outline, flat fill and one shade): hair, beards, every helmet shape,
      shields by family and device, every weapon family (73-units.js usWdef: the class, length and materials), stowed gear.
   Output {cv, ax, ay, k, smooth:true, hk, r} like the painted sheets (76s-sheets.js): cv at device resolution (k = backing px per
   art px, from artScale()), cropped to the figure; ax/ay the feet in art px. 73-units.js caches it per look x face x state x
   frame (L.fr) and rebuilds when k or the art revision changes. Detail Low and non-humans never come here. No rnd(). */
const HUM={on:true,img:null,ok:false,builds:0,ms:0,hits:0,bytes:0,fifo:[],cap:56e6,tint:0};
const HUM_A=1/14.4;                 // art px per sheet px: an unhelmeted figure stands ~27 art px (the old figure was 23 + hat)
const HUM_LW=9;                     // gear outline width (SU), the sheet's stroke
const HUM_INK='#141210';
function humImg(){if(HUM.img)return HUM.ok?HUM.img:null;if(typeof Image==='undefined'||typeof HPA!=='object')return null;const I=new Image();I.decoding='async';
 I.onload=()=>{HUM.ok=true};I.src=HPA.src;HUM.img=I;if(I.complete&&I.naturalWidth)HUM.ok=true;return HUM.ok?I:null}
function humReady(){return!!humImg()}
function humK(){let s=1;try{s=typeof artScale==='function'?artScale():1}catch(e){}return Math.max(3,Math.min(7,Math.round(s)||3))}
/* ---- who is a person: mercs (any race), and the human enemy types ---- */
const HUM_NOT=new Set(['gob','gobarch','gobsham','skel','skelhal','zomb','orcy','orcw','orcl','obrute','hstd','hchief','imp','vknight','vmage','tyrant','gknight','bthrone']);
function humPerson(L){if(L.hum!==undefined)return L.hum;let r=false;const S=L.S;
 if(S&&S.kind==='hum'&&typeof L.key==='string'){if(L.key[0]==='m')r=true;else if(L.key[0]==='e'){const id=L.key.split(':')[1];r=!HUM_NOT.has(id)&&!(typeof SHEETS==='object'&&SHEETS[id])&&!!US_BUILD&&S.b!==US_BUILD.thin&&S.b!==US_BUILD.gob&&S.b!==US_BUILD.orc&&S.b!==US_BUILD.imp&&S.b!==US_BUILD.bloat&&S.b!==US_BUILD.tyrant&&!(S.armor==='rags'&&S.wd&&S.wd.cls==='fist'&&!S.hair&&!S.hat&&!S.beard)}}   // the stock spec a monster without its own falls back to is no person
 L.hum=r;return r}
function humWant(L){return HUM.on&&typeof document!=='undefined'&&typeof Path2D==='function'&&typeof CanvasRenderingContext2D==='function'&&typeof HPA==='object'&&(typeof hdArt!=='function'||hdArt())&&!!L&&humPerson(L)}

/* ---- colours ---- */
function humHex(k){const s=typeof PAL==='object'&&PAL[k];return s||(/^#/.test(k)?k:'#888888')}
function humRGB(h){const v=parseInt(String(h).slice(1),16)||0;return[v>>16&255,v>>8&255,v&255]}
function humMix(a,b,t){const A=humRGB(a),B=humRGB(b);return'#'+A.map((c,i)=>Math.round(c+(B[i]-c)*t).toString(16).padStart(2,'0')).join('')}
function humDk(c,t){return humMix(c,'#000000',t==null?.22:t)}
function humLt(c,t){return humMix(c,'#ffffff',t==null?.22:t)}
// a ramp of 73-units.js ({t: PAL keys dark -> light, b: resting tone}) -> the lit colour a grey shade layer is multiplied by
function humRC(r,d){if(!r)return'#888888';if(typeof r==='string')return humHex(r);const t=r.t,n=t.length;let i=(r.b==null?1:r.b)+(d||0);i=i<0?0:i>=n?n-1:i;return humHex(t[i])}
function humLit(r){if(!r||typeof r==='string')return humRC(r);const n=r.t.length,b=r.b==null?1:r.b;return b+1<n?humMix(humRC(r),humRC(r,1),.2):humRC(r)}

/* ---- the rig: pivots read from the layer boxes of each piece (sheet px), so a re-cut sheet keeps working ---- */
function humBox(n,m){const P=HPA.p[n];const l=P&&P.L[m];return l?{x:l[4],y:l[5],w:l[6],h:l[7]}:{x:0,y:0,w:P?P.w:1,h:P?P.h:1}}
const HUM_RIG={};   // torso: the shoulder caps sit at the torso's upper corners, below the collar (sa / sb)
function humRig(n){let R=HUM_RIG[n];if(R)return R;const P=HPA.p[n];R={w:P.w,h:P.h};
 if(/^([od]?head|elf)/.test(n)){const s=humBox(n,'s'),f=/_f$/.test(n),el=n[0]==='e',oc=n[0]==='o',dw=n[0]==='d';   // the skull: a circle in the skin box (ears stick out of it)
  const sx0=s.x+(el?(f?20:22):oc?(f?26:12):dw?(f?14:8):0),sx1=s.x+s.w-(el&&!f?22:0);R.cx=(sx0+sx1)/2+(f?4:-2);R.cy=s.y+s.h*.5;R.r=oc||dw?Math.max(sx1-sx0,s.h)*.5:Math.min(sx1-sx0,s.h)*.5;R.px=R.cx+(f?-4:4);R.py=s.y+s.h-6}
 else if(/^[od]?torso/.test(n)){const c=humBox(n,'c'),b=humBox(n,'b'),f=/f$/.test(n);R.hx=b.x+b.w/2;R.hy=b.y+b.h*.55;R.nx=c.x+c.w*(f?.52:.5);R.ny=c.y+(f?2:8);
  R.px=R.hx;R.py=R.hy;R.sa={x:c.x+2,y:c.y+c.h*(f?.5:.44)};R.sb={x:c.x+c.w-2,y:c.y+c.h*(f?.5:.44)};R.top=c.y;R.bot=b.y+b.h;R.x0=c.x;R.x1=c.x+c.w}
 else if(/^[od]?arm/.test(n)){const c=humBox(n,'c'),s=humBox(n,'s');R.px=c.x+c.w/2;R.py=c.y+10;R.wx=s.x+s.w/2;R.wy=s.y+s.h-12}
 else if(/^[od]?hand/.test(n)){const s=humBox(n,'s');R.px=s.x+s.w/2;R.py=s.y+s.h*.45}
 else if(/^[od]?leg/.test(n)){const p=humBox(n,'p'),k=humBox(n,'k');R.px=p.x+p.w/2;R.py=p.y+14;R.fy=k.y+k.h-4;R.fx=k.x+k.w/2}
 R.len=R.wx!=null?Math.hypot(R.wx-R.px,R.wy-R.py):0;R.ang=R.wx!=null?Math.atan2(R.wy-R.py,R.wx-R.px):0;HUM_RIG[n]=R;return R}

/* ---- per look: the body spec (pieces, colours, proportions), computed once ---- */
function humSpec(L){if(L.hs)return L.hs;const S=L.S,A=S.A||(S.A=usArmor(S)),bd=S.b||US_BUILD.human,big=!!bd.big;
 const race=L.key[0]!=='m'?'':S.b===US_BUILD.dwarf?'dwarf':S.b===US_BUILD.halforc?'halforc':S.b===US_BUILD.elf?'elf':'human',orc=race==='halforc'&&!!HPA.p.ohead_f,dw=race==='dwarf'&&!!HPA.p.dhead_f,el=S.ears==='elf'&&!orc&&!dw,fem=!!S.fem,a=S.armor;
 const shorts=a==='rags'||a==='bare'||a==='fur';
 const sk=S.skin||usSkin(['s','t','u','i']),skin=humMix(humRC(sk),humRC(sk,-1),.38);
 const C={skin,skinD:humDk(skin,.2),body:humLit(A.body),slv:humLit(A.slv||A.body),fore:A.fore===sk?skin:humLit(A.fore||A.slv||A.body),hand:A.hand&&A.hand!==sk?humLit(A.hand):skin,leg:humLit(A.leg),boot:humLit(A.boot),
  shin:A.shin?humLit(A.shin):null,belt:humLit(S.av&&S.av.gold?USR.gold:S.sashR&&a!=='robe'?S.sashR:a==='robe'?(S.trim||USR.brass):a==='rags'?USR.dwood:USR.dleather),buckle:humLit(S.av&&S.av.gold?USR.gold:USR.brass)};
 if(a==='bare'){C.body=C.slv=C.fore=skin}if(a==='robe'){C.leg=C.body}
 const wid=dw||orc?1:bd===US_BUILD.brute||bd===US_BUILD.knight?1.1:bd===US_BUILD.slim?.95:bd===US_BUILD.dwarf?1.16:1;
 const sc=big?1.3:bd===US_BUILD.knight?1.04:1,legk=bd===US_BUILD.dwarf&&!dw?.74:1;
 const pre=orc?'o':dw?'d':'',sx=fem?'w':'m';
 const hs={S,A,C,el,orc,dw,race,fem,shorts,wid,sc,legk,big,
  pn:(kind,v,side)=>kind==='head'?(pre?pre+(fem?'head2_':'head_')+v:el?'elf_'+v:'head_'+v):kind==='torso'?pre+'torso_'+sx+v:kind==='leg'?pre+'leg_'+(shorts?'s':'p')+v+'_'+side:pre+kind+'_'+sx+v+'_'+side,
  col:{head:{s:skin,c:'#efe7cf',b:humDk(skin,.18),p:humDk(skin,.18)},torso:{c:C.body,s:skin,b:C.belt,g:C.buckle,p:humDk(C.body,.15)},arm:{c:C.slv,s:C.fore,b:humDk(C.fore,.2),p:humDk(C.slv,.15)},
   hand:{s:C.hand,b:humDk(C.hand,.2),p:humDk(C.hand,.2),c:C.hand},leg:{p:C.leg,k:C.boot,s:C.shin||skin,b:C.boot,c:C.leg}},pc:new Map()};
 L.hs=hs;return hs}
/* a tinted piece canvas (atlas resolution), cached per look */
const HUM_TMP={c:null};
function humTmp(w,h){let c=HUM_TMP.c;if(!c){c=HUM_TMP.c=document.createElement('canvas')}if(c.width<w||c.height<h){c.width=Math.max(c.width,w);c.height=Math.max(c.height,h)}const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.clearRect(0,0,c.width,c.height);return c}
function humPiece(hs,n,col,deco,key,dl){const id=n+'|'+(key||'');let c=hs.pc.get(id);if(c)return c;const I=humImg(),P=HPA.p[n];if(!I||!P)return null;const k=HPA.k,W=Math.ceil(P.w*k)+2,H=Math.ceil(P.h*k)+2;
 c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');HUM.tint++;dl=dl||'c';
 const lay=m=>{const l=P.L[m],cl=col[m];if(!l||!cl)return;const t=humTmp(l[2],l[3]),q=t.getContext('2d');
  q.drawImage(I,l[0],l[1],l[2],l[3],0,0,l[2],l[3]);q.globalCompositeOperation='multiply';q.fillStyle=cl;q.fillRect(0,0,l[2],l[3]);q.globalCompositeOperation='destination-in';q.drawImage(I,l[0],l[1],l[2],l[3],0,0,l[2],l[3]);
  g.drawImage(t,0,0,l[2],l[3],l[4]*k,l[5]*k,l[6]*k,l[7]*k)};
 lay(dl);   // the layer the deco is painted on goes first, so source-atop keeps the deco on it alone
 if(deco&&P.L[dl]){g.save();g.globalCompositeOperation='source-atop';g.scale(k,k);g.lineJoin='round';g.lineCap='round';try{deco(g,P)}catch(e){if(!HUM.err){HUM.err=1;console.error('human deco',n,e)}}g.restore()}
 for(const m in P.L)if(m!=='o'&&m!==dl)lay(m);
 const o=P.L.o;if(o)g.drawImage(I,o[0],o[1],o[2],o[3],o[4]*k,o[5]*k,o[6]*k,o[7]*k);
 if(key==='mb'&&P.L.g&&P.L.b){   // a composition that is mirrored afterwards: the buckle moves to the other end of the belt, so it keeps its side
  const q=P.L.g,bl=P.L.b,r=Math.max(q[6],q[7])/2,cx=q[4]+q[6]/2,cy=q[5]+q[7]/2,mx=P.w-cx,by0=bl[5]+7,by1=bl[5]+bl[7]-7;g.save();g.scale(k,k);
  g.fillStyle=col.b||'#4a3020';g.fillRect(cx-r-5,by0,2*r+10,by1-by0);humSh(g,humCirc(mx,cy,r*.8),col.g||'#d1a94e',{lw:6,dk:.25});g.restore()}
 hs.pc.set(id,c);return c}
/* ---- weapons: family + size + materials from the sprite weapon (usWdef) ---- */
const HUM_CELL=15;                  // SU per weapon cell (one art px of the old sprite weapon)
const HUM_WF=[[/^(knife|rondel|tanto|yoroidoshi|kunai|dagger|stiletto|dirk|fang)/,'dagger'],[/^(katana|wakizashi|nodachi|odachi|sica|scimitar|sabre|saber|falchion|tachi)/,'curved'],
 [/^(greatsword|zweihander|runegreat|tyrblade|claymore|flamberge)/,'great'],[/^(shortsword|arming|runeblade|riftedge|gladius|spatha|sword|longsword)/,'sword'],
 [/^(greataxe|lordaxe)/,'greataxe'],[/^(handaxe|waraxe|axe|hatchet)/,'axe'],[/^(warmaul|maul|sledge)/,'maul'],[/^(warhammer|pickhammer|hammer|pick)/,'hammer'],[/^(mace|flail|morning)/,'mace'],[/^(club|cudgel)/,'club'],
 [/^(trident)/,'trident'],[/^(pike|spear|warspear|suyari|jumonji|omiyari|lance|javelin)/,'spear'],[/^(halberd|poleaxe)/,'halberd'],[/^(bill|billhook)/,'bill'],[/^(glaive|naginata|voulge)/,'glaive'],
 [/^(focus)/,'orb'],[/^(staff|shamstaff|necstaff|voidstaff|bo)/,'staff'],[/^(shortbow|warbow|hankyu|yumi|daikyu|longbow|recurve|bow)/,'bow'],[/^(xbow|arbalest|crossbow)/,'xbow'],[/^(pistol)/,'pistol'],[/^(musket|arquebus)/,'musket']];
const HUM_WT={dagger:'dagger',sword:'sword',axe:'axe',mace:'mace',spear:'spear',bow:'bow',staff:'staff',hammer:'hammer',polearm:'halberd',greatsword:'great',crossbow:'xbow',flintlock:'pistol',fist:'fist'};
function humWBase(id){id=String(id||'').replace(/\*/g,'').replace(/:L$/,'');if(typeof US_CRW==='object'&&US_CRW[id])return humWBase(US_CRW[id].b);if(typeof US_LGW==='object'&&US_LGW[id])return humWBase(US_LGW[id].b);return id}
function humWFam(W){if(!W||W.cls==='fist'||(!W.c||!W.c.length)&&W.cls!=='bow')return'fist';const b=humWBase(W.id);
 if(b.slice(0,2)==='g:'){const p=b.split(':'),wt=p[1],two=p[2]==='1';if(wt==='axe')return two?'greataxe':'axe';if(wt==='hammer')return two?'maul':'hammer';if(wt==='sword')return two?'great':/sabre|saber|scim|falch|curv/.test(b)?'curved':'sword';if(wt==='flintlock')return two?'musket':'pistol';if(wt==='polearm')return/glaive|voulge|naginata/.test(b)?'glaive':/bill/.test(b)?'bill':'halberd';return HUM_WT[wt]||'sword'}
 for(const q of HUM_WF)if(q[0].test(b))return q[1];
 return W.cls==='bow'?'bow':W.cls==='xbow'?'xbow':W.cls==='gun'?(W.two?'musket':'pistol'):W.cls==='staff'?'staff':W.cls==='thrust'?'spear':W.cls==='two'?'great':'sword'}
const HUM_WI=new WeakMap();
function humWInfo(W){let o=HUM_WI.get(W);if(o)return o;const fam=humWFam(W),C=W.c||[];let i0=0,i1=0,o1=0;const by={0:new Map(),1:new Map(),2:new Map()};let gem=null;
 for(const c of C){if(c[0]<i0)i0=c[0];if(c[0]>i1)i1=c[0];if(c[4]===2&&Math.abs(c[1])>o1)o1=Math.abs(c[1]);const r=c[2]==='GEM'?null:c[2];if(c[2]==='GEM')gem=1;if(r!=null){const m=by[c[4]>=2?2:c[4]<=0?0:1];m.set(r,(m.get(r)||0)+1)}}
 const top=m=>{let b=null,n=-1;for(const [r,k] of m)if(k>n){n=k;b=r}return b};
 const gripR=(C.find(c=>c[0]===-1&&c[1]===0)||C.find(c=>c[4]===0)||[])[2];
 const pomR=(C.find(c=>c[0]===i0)||[])[2];
 const blade=top(by[2])||USR.plate,guard=top(by[1])||USR.brass,haft=top(by[0])||USR.wood;
 const col=r=>r==='GEM'||r==null?null:humLit(r);
 o={fam,id:W.id,len:Math.max(fam==='dagger'?6:4,i1)*HUM_CELL,back:Math.max(1,-i0)*HUM_CELL,wid:o1,famed:!!W.famed||/\*/.test(W.id||''),gem:gem||W.gem,two:!!W.two,h2:W.h2||0,
  blade:col(blade)||'#c8d0d6',guard:col(guard)||'#c79a3c',haft:col(haft)||'#8a5a32',grip:col(gripR)||col(haft)||'#5a3a22',pom:col(pomR)||col(guard)||'#c79a3c',
  bowc:W.bowR?humLit(USR[W.bowR]||W.bowR):null,bow:W.bow||(fam==='bow'?6:0),recurve:!!W.recurve||W.asym>0,nock:W.nock?humLit(USR[W.nock]||USR.gold):null,wrap:W.wrap?(typeof W.wrap==='string'&&USR[W.wrap]?humLit(USR[W.wrap]):'#e8e0d0'):null,
  gemc:W.gemR?humLit(USR[W.gemR]||W.gemR):null};
 if(o.famed&&fam!=='bow'){o.guard=humHex('c');o.pom=humHex('c')}
 HUM_WI.set(W,o);return o}

/* ---- poses: body space (x forward, y down, SU), hands relative to their own shoulder; wa the weapon angle (deg, 0 forward, -90 up) ---- */
function humWCls(fam,W){return fam==='bow'?'bow':fam==='xbow'||fam==='pistol'||fam==='musket'?'gun':fam==='dagger'?'dagger':fam==='fist'?'fist':fam==='staff'||fam==='orb'?'staff':
 fam==='spear'||fam==='trident'||fam==='halberd'||fam==='bill'||fam==='glaive'?'thrust':fam==='great'||fam==='greataxe'||fam==='maul'||(W&&W.two&&W.cls==='two')?'two':'swing'}
function humPose(cls,st,fr,hs){const P={w:[6,86],o:[-4,86],wa:-62,oa:0,lean:0,bob:0,lg:[0,0,0,0],kneel:0,lie:0,grip:0,bowD:0,arrow:0,spark:0,drop:0,rod:0,crank:0};
 // guard positions per class
 switch(cls){case'swing':P.w=[0,86];P.wa=-42;break;case'dagger':P.w=[0,86];P.wa=-28;break;case'two':P.w=[30,74];P.wa=-58;P.grip=1;break;case'thrust':P.w=[-16,82];P.wa=-104;P.grip=hs&&hs.two?1:0;break;
  case'staff':P.w=[-16,82];P.wa=-100;break;case'bow':P.o=[24,78];P.w=[0,86];break;case'gun':P.w=[44,64];P.wa=-6;P.grip=1;break;case'fist':P.w=[6,86];break}
 const set=(o)=>Object.assign(P,o);
 switch(st){
  case'idle':if(fr===1)P.bob=4;break;
  case'walk':{const a=fr&3;if(a===0)set({lg:[16,0,-14,6],w:[P.w[0]-10,P.w[1]],o:[P.o[0]+12,P.o[1]]});else if(a===2)set({lg:[-14,6,16,0],w:[P.w[0]+12,P.w[1]],o:[P.o[0]-10,P.o[1]]});else set({bob:-6});break}
  case'attack':
   if(cls==='swing'||cls==='two'||cls==='staff'){const g=cls==='two'?1:0;
    if(fr===0)set({w:[-6,-64],wa:-128,lean:-7,lg:[-6,0,4,0],bob:2,grip:g});else if(fr===1)set({w:[82,44],wa:10,lean:9,lg:[16,0,-10,0],grip:g});else set({w:[50,74],wa:52,lean:5,lg:[10,0,-4,0],grip:g})}
   else if(cls==='dagger'){if(fr===0)set({w:[-20,40],wa:-70,lean:-5});else if(fr===1)set({w:[90,44],wa:-2,lean:10,lg:[16,0,-10,0]});else set({w:[50,68],wa:24,lean:4})}
   else if(cls==='thrust'){if(fr===0)set({w:[-34,54],wa:-8,lean:-6,lg:[-6,0,6,0]});else if(fr===1)set({w:[82,40],wa:-5,lean:11,lg:[20,0,-14,0]});else set({w:[30,52],wa:-6,lean:3,lg:[8,0,-4,0]});P.grip=hs&&hs.two?1:0}
   else if(cls==='gun'){if(fr===1)set({w:[56,46],wa:-16,lean:-6,lg:[6,0,0,0]});else set({w:[62,52],wa:-3,lg:[6,0,0,0]})}
   else if(cls==='bow'){set({o:[86,26],oa:0,lg:[8,0,-4,0]});if(fr===0)set({w:[92,22],bowD:0,arrow:1});else if(fr===1)set({w:[18,30],bowD:1,arrow:1,lean:-3});else set({w:[-4,40],bowD:0})}
   else{if(fr===0)set({w:[-24,62],lean:-5});else if(fr===1)set({w:[96,10],lean:10,lg:[16,0,-10,0]});else set({w:[48,54]})}
   break;
  case'cast':if(fr===0)set({w:[52,44],o:[30,40],wa:-80,spark:1});else if(fr===1)set({w:[16,-84],o:[-6,-86],wa:-92,bob:-6,spark:3});else set({w:[86,-10],o:[60,24],wa:-52,lean:7,spark:2,lg:[12,0,-6,0]});P.grip=0;break;
  case'hit':if(fr===0)set({lean:-13,bob:3,w:[-26,70],o:[-22,66],wa:P.wa-24,lg:[-8,0,-6,0]});else set({lean:-5,bob:2});break;
  case'death':if(fr===0)set({lean:-20,bob:5,w:[-30,30],o:[-24,24],wa:-140,lg:[-10,0,-6,0]});else if(fr===1)set({kneel:1,lean:14,bob:0,w:[30,80],o:[34,80],wa:30,drop:1});else set({lie:1,drop:1,w:[4,88],o:[-4,88]});P.grip=0;break;
  case'swap':if(fr<2)set({w:[-40,-36],wa:-150,lean:-3,grip:0});else set({w:[30,60],wa:-50,lean:3});break;
  case'reload':if(cls==='gun'&&hs&&hs.fam==='xbow')set({w:[26,84],wa:84,o:[[18,34],[34,26],[26,44]][fr],grip:0,crank:fr+1});
   else if(cls==='gun')set({w:[26,82],wa:-86,o:[30,-30+fr*12],grip:0,rod:1});else if(cls==='bow')set({w:[-46,-30+fr*10]});else set({w:[14,82]});break}
 return P}

/* ---- drawing helpers: flat fill + one shade (the lower-back side) + the thick outline; bbox tracking in device px ---- */
const HUM_BB=[0,0,0,0];
function humBBr(){HUM_BB[0]=HUM_BB[1]=1e9;HUM_BB[2]=HUM_BB[3]=-1e9}
function humBBp(g,x,y,r){const m=g.getTransform(),X=m.a*x+m.c*y+m.e,Y=m.b*x+m.d*y+m.f,s=(r||0)*Math.hypot(m.a,m.b)+3;if(X-s<HUM_BB[0])HUM_BB[0]=X-s;if(Y-s<HUM_BB[1])HUM_BB[1]=Y-s;if(X+s>HUM_BB[2])HUM_BB[2]=X+s;if(Y+s>HUM_BB[3])HUM_BB[3]=Y+s}
function humBBbox(g,x0,y0,x1,y1){humBBp(g,x0,y0);humBBp(g,x1,y0);humBBp(g,x0,y1);humBBp(g,x1,y1)}
function humSh(g,p,fill,o){o=o||{};const lw=o.lw==null?HUM_LW:o.lw;g.fillStyle=o.flat?fill:humDk(fill,o.dk==null?.2:o.dk);g.fill(p);
 if(!o.flat){g.save();g.clip(p);g.translate(o.sx==null?6:o.sx,o.sy==null?-5:o.sy);g.fillStyle=fill;g.fill(p);g.restore()}
 if(lw>0){g.lineWidth=lw;g.strokeStyle=HUM_INK;g.lineJoin='round';g.lineCap='round';g.stroke(p)}}
function humLine(g,pts,col,w){g.beginPath();g.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)g.lineTo(pts[i],pts[i+1]);g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.lineJoin='round';g.stroke()}
function humInkLine(g,pts,col,w){humLine(g,pts,HUM_INK,w+HUM_LW);humLine(g,pts,col,w)}
function humP(f){const p=new Path2D();f(p);return p}
function humRR(p,x,y,w,h,r){r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);p.moveTo(x+r,y);p.arcTo(x+w,y,x+w,y+h,r);p.arcTo(x+w,y+h,x,y+h,r);p.arcTo(x,y+h,x,y,r);p.arcTo(x,y,x+w,y,r);p.closePath()}
function humCirc(x,y,r){return humP(p=>p.arc(x,y,r,0,Math.PI*2))}
function humEll(x,y,rx,ry,a){return humP(p=>p.ellipse(x,y,rx,ry,a||0,0,Math.PI*2))}
function humPoly(a,close){return humP(p=>{p.moveTo(a[0],a[1]);for(let i=2;i<a.length;i+=2)p.lineTo(a[i],a[i+1]);if(close!==false)p.closePath()})}

/* ---- weapon painter: local frame, grip at the origin, +x towards the tip, +y the edge / head side ---- */
function humGrip(g,wi,x0,x1,w){humSh(g,humP(p=>humRR(p,x0,-w/2,x1-x0,w,w/2)),wi.grip,{dk:.25});g.save();g.strokeStyle=humDk(wi.grip,.35);g.lineWidth=2.5;for(let x=x0+7;x<x1-3;x+=9){g.beginPath();g.moveTo(x,-w/2+2);g.lineTo(x+5,w/2-2);g.stroke()}g.restore()}
function humBlade(g,wi,x0,x1,w,tipL,col){const h=w/2;humSh(g,humPoly([x0,-h,x1-tipL,-h,x1,0,x1-tipL,h,x0,h]),col||wi.blade,{dk:.18,sy:-4,sx:0});g.save();g.strokeStyle=humLt(col||wi.blade,.45);g.lineWidth=3;g.beginPath();g.moveTo(x0+6,-1);g.lineTo(x1-tipL-2,-1);g.stroke();g.restore()}
function humHaft(g,wi,x0,x1,w,col){humSh(g,humP(p=>humRR(p,x0,-w/2,x1-x0,w,w/2)),col||wi.haft,{dk:.22,sx:0,sy:-3})}
function humGem(g,x,y,r,wi){humSh(g,humCirc(x,y,r),wi.gemc||'#7ad0ff',{dk:.25});g.fillStyle='#ffffff';g.beginPath();g.arc(x-r*.35,y-r*.35,r*.28,0,7);g.fill()}
function humDrawW(g,wi,o){o=o||{};const L=wi.len,B=wi.back,f=wi.fam,bb=(x,y,r)=>humBBp(g,x,y,r);bb(-B-10,0,30);bb(L+10,0,40);bb(L*.75,0,50);
 const id=humWBase(wi.id);
 switch(f){
  case'dagger':case'sword':case'great':case'curved':{const gl=f==='great'?Math.max(B,40):f==='dagger'?Math.max(18,B*.8):Math.max(26,B),bw=f==='great'?30:f==='dagger'?18:wi.wid>=1?25:21,gw=f==='great'?96:f==='dagger'?40:66;
   humGrip(g,wi,-gl,0,f==='great'?17:15);
   if(f==='curved'){humSh(g,humEll(-gl-5,0,9,12),wi.pom);const bl=humP(p=>{p.moveTo(10,-bw/2);p.quadraticCurveTo(L*.55,-bw/2+2,L,-bw*1.1);p.quadraticCurveTo(L*.6,bw/2+6,10,bw/2);p.closePath()});humSh(g,bl,wi.blade,{dk:.2,sx:0,sy:-4});
    g.save();g.clip(bl);g.strokeStyle=humLt(wi.blade,.55);g.lineWidth=4;g.beginPath();g.moveTo(14,-bw/2+3);g.quadraticCurveTo(L*.55,-bw/2+4,L-6,-bw*1.05+3);g.stroke();g.restore();humSh(g,humEll(6,0,7,gw*.32),wi.guard,{dk:.25})}
   else{humSh(g,humCirc(-gl-8,0,f==='great'?14:11),wi.pom);humBlade(g,wi,10,L,bw,Math.min(32,bw*1.3));
    if(/runeblade|runegreat|lg_/.test(id)||wi.gem){g.fillStyle=wi.gemc||'#8fe3ff';for(let x=32;x<L-30;x+=26){g.beginPath();g.arc(x,0,3.5,0,7);g.fill()}}
    if(/riftedge|tyrblade|void/.test(id)){g.fillStyle='#d7a8ff';for(let x=26;x<L-26;x+=22){g.fillRect(x,-3,9,6)}}
    if(f==='great'&&/zwei|flamberge/.test(id)){humSh(g,humRR2(36,-bw/2-12,10,bw+24,4),wi.guard)}
    humSh(g,humP(p=>humRR(p,0,-gw/2,12,gw,6)),wi.guard,{dk:.25,sx:0,sy:-3})}
   break}
  case'axe':case'greataxe':{const hl=f==='greataxe'?Math.max(L,200):Math.max(L,130);humHaft(g,wi,-B,hl+6,f==='greataxe'?17:15);if(f==='greataxe')humSh(g,humCirc(-B,0,9),wi.pom);
   const head=s=>{const x=hl-34,hw=f==='greataxe'?52:wi.wid>=3?46:38;humSh(g,humP(p=>{p.moveTo(x-6,0);p.lineTo(x+6,s*10);p.quadraticCurveTo(x-18,s*(hw*.55),x-24,s*hw);p.quadraticCurveTo(x+22,s*(hw+10),x+50,s*hw*.95);p.quadraticCurveTo(x+40,s*hw*.5,x+34,s*10);p.lineTo(x+40,0);p.closePath()}),wi.blade,{dk:.22,sx:4,sy:-s*4});
    g.save();g.strokeStyle=humLt(wi.blade,.5);g.lineWidth=4;g.beginPath();g.moveTo(x-20,s*(hw-4));g.quadraticCurveTo(x+18,s*(hw+5),x+44,s*(hw-6));g.stroke();g.restore()};
   head(1);if(f==='greataxe'||/lordaxe/.test(id))head(-1);else humSh(g,humPoly([hl-24,-8,hl-6,-22,hl+4,-8]),wi.blade);humSh(g,humP(p=>humRR(p,hl-30,-11,26,22,6)),wi.guard,{dk:.2});break}
  case'club':{humSh(g,humP(p=>{p.moveTo(-B,-8);p.lineTo(L*.45,-12);p.quadraticCurveTo(L+16,-26,L+12,0);p.quadraticCurveTo(L+16,26,L*.45,12);p.lineTo(-B,8);p.closePath()}),wi.haft,{dk:.22,sx:0,sy:-4});
   g.fillStyle=humDk(wi.haft,.35);for(const [x,y] of [[L*.62,-8],[L*.8,7],[L*.9,-10]]){g.beginPath();g.arc(x,y,3.5,0,7);g.fill()}break}
  case'mace':{humHaft(g,wi,-B,L-24,14);humSh(g,humCirc(-B-4,0,9),wi.guard);const cx=L-14;for(const a of[-1,0,1])humSh(g,humPoly([cx-20,a*14-6,cx+22,a*18-6,cx+24,a*18+6,cx-20,a*14+6]),humDk(wi.blade,.08),{dk:.2});
   humSh(g,humEll(cx,0,24,22),wi.blade,{dk:.22});humSh(g,humCirc(cx+26,0,8),wi.guard);break}
  case'hammer':case'maul':{const big=f==='maul',hx=Math.max(L,big?190:140)-22;humHaft(g,wi,-B,hx,big?16:14);if(big){humSh(g,humCirc(-B,0,9),wi.pom);humGrip(g,wi,-34,-4,18)}
   const hw=big?36:24,hh=big?78:48;humSh(g,humP(p=>humRR(p,hx-hw/2,-hh/2,hw,hh,6)),wi.blade,{dk:.22,sx:4,sy:-4});
   if(!big){humSh(g,humPoly([hx-8,-hh/2+2,hx-2,-hh/2-34,hx+8,-hh/2+2]),wi.blade,{dk:.2});humSh(g,humPoly([hx+hw/2-2,-8,hx+hw/2+20,0,hx+hw/2-2,8]),wi.blade)}
   else{g.strokeStyle=humDk(wi.blade,.3);g.lineWidth=4;g.beginPath();g.moveTo(hx-hw/2+6,-hh/2+14);g.lineTo(hx+hw/2-6,-hh/2+14);g.moveTo(hx-hw/2+6,hh/2-14);g.lineTo(hx+hw/2-6,hh/2-14);g.stroke()}break}
  case'spear':case'trident':case'halberd':case'bill':case'glaive':{const tipL=f==='spear'?Math.max(44,L*.14):f==='trident'?40:Math.max(56,L*.2),sh=L-tipL+(f==='spear'?6:12);humHaft(g,wi,-B,sh,13);humSh(g,humP(p=>humRR(p,-B-6,-8,14,16,5)),wi.guard,{dk:.2});
   if(f==='spear'){humSh(g,humP(p=>{p.moveTo(sh-6,-9);p.quadraticCurveTo(sh+tipL*.35,-21,L,0);p.quadraticCurveTo(sh+tipL*.35,21,sh-6,9);p.closePath()}),wi.blade,{dk:.2,sx:0,sy:-4});
    if(/jumonji/.test(id))humSh(g,humPoly([sh+8,-40,sh+22,-40,sh+22,40,sh+8,40]),wi.blade);if(/warspear/.test(id)){humSh(g,humPoly([sh-30,6,sh-16,8,sh-24,30]),humHex('g'))}}
   else if(f==='trident'){humSh(g,humP(p=>{p.moveTo(sh-8,-26);p.lineTo(sh+10,-26);p.lineTo(sh+10,26);p.lineTo(sh-8,26);p.closePath()}),wi.blade);for(const y of[-22,0,22])humSh(g,humPoly([sh+8,y-6,L-(y?10:0),y-4,L+10-(y?10:0),y,L-(y?10:0),y+4,sh+8,y+6]),wi.blade,{dk:.2})}
   else if(f==='halberd'){humSh(g,humPoly([sh-4,-7,L,0,sh-4,7]),wi.blade);humSh(g,humP(p=>{p.moveTo(sh-30,6);p.lineTo(sh+20,6);p.quadraticCurveTo(sh+28,30,sh+16,50);p.quadraticCurveTo(sh-14,46,sh-34,52);p.quadraticCurveTo(sh-40,24,sh-30,6);p.closePath()}),wi.blade,{dk:.22,sy:-4});humSh(g,humPoly([sh-14,-6,sh-2,-6,sh-24,-34]),wi.blade)}
   else if(f==='bill'){humSh(g,humP(p=>{p.moveTo(sh-28,-8);p.lineTo(L-8,-8);p.quadraticCurveTo(L+16,-8,L+8,16);p.quadraticCurveTo(L-10,4,L-22,18);p.lineTo(sh-6,26);p.lineTo(sh-28,8);p.closePath()}),wi.blade,{dk:.22,sy:-4});humSh(g,humPoly([sh+6,-8,sh+18,-8,sh+4,-30]),wi.blade)}
   else{humSh(g,humP(p=>{p.moveTo(sh-20,-9);p.lineTo(sh+tipL*.4,-10);p.quadraticCurveTo(L-4,-12,L+18,-30);p.quadraticCurveTo(L+4,6,sh+tipL*.4,14);p.lineTo(sh-20,9);p.closePath()}),wi.blade,{dk:.2,sy:-4})}
   humSh(g,humP(p=>humRR(p,sh-24,-10,16,20,5)),wi.guard,{dk:.2});break}
  case'staff':case'orb':{const top=Math.max(L,170);humHaft(g,wi,-B-20,top,15);
   if(f==='orb'){for(const s of[-1,1])humSh(g,humP(p=>{p.moveTo(top-10,s*6);p.quadraticCurveTo(top+6,s*30,top+30,s*22)}),wi.guard,{flat:1});humGem(g,top+26,0,18,wi)}
   else if(/necstaff/.test(id)){humSh(g,humEll(top+14,0,22,19),'#e8e0c8',{dk:.2});g.fillStyle=HUM_INK;g.beginPath();g.arc(top+18,-7,4.5,0,7);g.arc(top+18,7,4.5,0,7);g.fill();g.fillStyle='#b080ff';g.beginPath();g.arc(top+18,-7,2,0,7);g.fill()}
   else if(/shamstaff/.test(id)){humSh(g,humPoly([top-4,-18,top+28,-26,top+20,0,top+28,26,top-4,18]),'#e8e0c8');humSh(g,humCirc(top-30,14,7),humHex('g'))}
   else if(/voidstaff/.test(id)){humSh(g,humPoly([top,-12,top+40,0,top,12,top-12,0]),'#a87cf0',{dk:.25})}
   else if(/heart/.test(id)){humSh(g,humCirc(top+10,0,18),'#5aa040');humGem(g,top+12,0,8,{gemc:'#ffd26a'})}
   else if(/bo$/.test(id)){humSh(g,humP(p=>humRR(p,top-18,-9,18,18,4)),humHex('p'));humSh(g,humP(p=>humRR(p,-B-26,-9,18,18,4)),humHex('p'))}
   else{humSh(g,humEll(top+8,0,16,13),wi.haft,{dk:.25});if(wi.gem)humGem(g,top+10,0,8,wi)}break}
  case'xbow':{humSh(g,humP(p=>{p.moveTo(-B-18,-6);p.lineTo(L,-7);p.lineTo(L,7);p.lineTo(-10,9);p.lineTo(-B-12,22);p.lineTo(-B-24,14);p.closePath()}),wi.haft,{dk:.22,sx:0,sy:-4});
   const px=L-18,pw=/arbalest/.test(id)?70:56;humSh(g,humP(p=>{p.moveTo(px-6,-pw);p.quadraticCurveTo(px+22,0,px-6,pw);p.lineTo(px+6,pw);p.quadraticCurveTo(px+34,0,px+6,-pw);p.closePath()}),wi.guard==='#c79a3c'?humHex('p'):wi.blade,{dk:.25});
   g.strokeStyle='#e8e0d0';g.lineWidth=2.5;g.beginPath();const sx=o.loaded===false?px-4:px-36;g.moveTo(px-4,-pw+4);g.lineTo(sx,0);g.lineTo(px-4,pw-4);g.stroke();
   if(o.loaded!==false){humSh(g,humPoly([sx,-3,L+14,-3,L+24,0,L+14,3,sx,3]),'#c8b090',{lw:4})}if(o.crank){humSh(g,humCirc(-B-6,0,9),humHex('c'))}break}
  case'pistol':case'musket':{const big=f==='musket',bl=Math.max(L,big?200:90);humSh(g,humP(p=>{if(big){p.moveTo(-B-40,-4);p.lineTo(bl*.62,-9);p.lineTo(bl*.62,8);p.lineTo(0,12);p.lineTo(-B-34,26);p.lineTo(-B-50,18);p.closePath()}else{p.moveTo(-6,-10);p.lineTo(20,-10);p.lineTo(20,8);p.lineTo(4,10);p.lineTo(-12,34);p.lineTo(-26,28);p.lineTo(-10,6);p.closePath()}}),wi.haft,{dk:.22,sx:0,sy:-4});
   humSh(g,humP(p=>humRR(p,big?0:8,-10,bl-(big?0:8),10,4)),wi.blade,{dk:.25,sx:0,sy:-3});humSh(g,humP(p=>humRR(p,bl-8,-12,10,14,3)),wi.guard);humSh(g,humPoly([8,-10,16,-22,22,-10]),humDk(wi.blade,.2));
   if(o.fire){humSh(g,humPoly([bl+4,-6,bl+30,-16,bl+22,-4,bl+40,0,bl+22,4,bl+30,14,bl+4,4]),'#ffd060',{lw:4})}break}
  default:break}}
function humRR2(x,y,w,h,r){return humP(p=>humRR(p,x,y,w,h,r))}
/* a bow held upright in the off hand: local frame, grip at the origin, the belly towards +x (forward) */
function humDrawBow(g,wi,draw,arrow,hx){const n=Math.max(5,wi.bow||6),H=n*22+30,bend=draw?30:18,bc=wi.bowc||(n>=7?humHex('a'):humHex('i'));humBBp(g,0,-H,10);humBBp(g,0,H,10);humBBp(g,bend+10,0,10);humBBp(g,hx!=null?hx:-40,0,10);
 const sx=draw&&hx!=null?hx:-6;g.strokeStyle='#ece4d2';g.lineWidth=2.5;g.beginPath();g.moveTo(-4,-H+6);g.lineTo(sx,0);g.lineTo(-4,H-6);g.stroke();
 const rc=wi.recurve?12:0,path=humP(p=>{p.moveTo(-4-rc,-H);p.quadraticCurveTo(bend*2.2,-H*.55,bend,0);p.quadraticCurveTo(bend*2.2,H*.55,-4-rc,H)});
 g.strokeStyle=HUM_INK;g.lineWidth=HUM_LW+9;g.lineCap='round';g.stroke(path);g.strokeStyle=bc;g.lineWidth=9;g.stroke(path);g.strokeStyle=humLt(bc,.3);g.lineWidth=3;g.save();g.translate(-2,-2);g.stroke(path);g.restore();
 if(wi.wrap){g.strokeStyle=wi.wrap;g.lineWidth=9;g.beginPath();g.moveTo(bend+1,-14);g.lineTo(bend+1,14);g.stroke()}
 if(arrow){const ax=sx;humSh(g,humPoly([ax,-2.5,bend+46,-2.5,bend+46,2.5,ax,2.5]),'#c8a070',{lw:4});humSh(g,humPoly([bend+42,-8,bend+62,0,bend+42,8]),'#c0c8d0',{lw:4});humSh(g,humPoly([ax-2,-2,ax+16,-10,ax+18,-2]),humHex('g'),{lw:3})}}

/* ---- shields: family outline, field + device + rim + boss (front), planks and a strap (back) ---- */
const HUM_SHS={buckler:[42,42],targe:[60,60],round:[66,66],spiked:[66,66],heater:[62,74],kite:[58,96],tower:[66,100],pavise:[74,110]};
function humShPath(fam,s){const [w,h]=HUM_SHS[fam]||HUM_SHS.round;if(fam==='buckler'||fam==='targe'||fam==='round'||fam==='spiked')return humCirc(0,0,w*s);
 if(fam==='heater')return humP(p=>{p.moveTo(-w*s,-h*s);p.lineTo(w*s,-h*s);p.lineTo(w*s,-h*.1*s);p.quadraticCurveTo(w*.9*s,h*.7*s,0,h*s);p.quadraticCurveTo(-w*.9*s,h*.7*s,-w*s,-h*.1*s);p.closePath()});
 if(fam==='kite')return humP(p=>{p.moveTo(-w*s,-h*.62*s);p.quadraticCurveTo(0,-h*s*1.05,w*s,-h*.62*s);p.quadraticCurveTo(w*s,0,0,h*s);p.quadraticCurveTo(-w*s,0,-w*s,-h*.62*s);p.closePath()});
 return humP(p=>humRR(p,-w*s,-h*s,2*w*s,2*h*s,fam==='pavise'?10:22))}
function humDrawShield(g,look,colR,front,crack){const fam=usShFam(look),V=usShVar(look),[w,h]=HUM_SHS[fam]||HUM_SHS.round,col=n=>n==='c'?humLit(colR||usCloth('red')):n==='white'?'#e8e4da':n==='none'?null:humLit(USR[n]||USR.wood);
 humBBp(g,-w,-h,8);humBBp(g,w,h,8);const P=humShPath(fam,1),field=col(V.field)||humLit(usCloth('red')),alt=col(V.alt||'white')||'#e8e4da',rim=col(V.rim),boss=V.boss&&V.boss!=='none'&&V.boss!=='spike'?col(V.boss):null;
 if(!front){humSh(g,P,humDk(V.field==='steel'?'#b8c0c8':'#9a6a3e',.15),{dk:.15});g.save();g.clip(P);g.strokeStyle=humDk('#9a6a3e',.45);g.lineWidth=3;for(let x=-w+16;x<w;x+=18){g.beginPath();g.moveTo(x,-h);g.lineTo(x,h);g.stroke()}g.restore();
  humInkLine(g,[-w*.45,0,w*.45,0],'#6b4426',8);g.lineWidth=HUM_LW;g.strokeStyle=HUM_INK;g.stroke(P);return}
 humSh(g,P,field,{dk:.16,sx:7,sy:-4,lw:0});g.save();g.clip(P);g.fillStyle=alt;const d=V.dev;
 if(d==='cross'){g.fillRect(-9,-h,18,2*h);g.fillRect(-w,-h*.28-9,2*w,18)}else if(d==='pale'){g.fillRect(-w*.3,-h,w*.6,2*h)}else if(d==='chevron'){g.beginPath();g.moveTo(-w,h*.3);g.lineTo(0,-h*.25);g.lineTo(w,h*.3);g.lineTo(w,h*.62);g.lineTo(0,h*.08);g.lineTo(-w,h*.62);g.closePath();g.fill()}
 else if(d==='quarter'){g.fillRect(0,-h,w,h);g.fillRect(-w,0,w,h)}else if(d==='halves'){g.fillRect(0,-h,w,2*h)}else if(d==='bend'){g.beginPath();g.moveTo(-w,-h);g.lineTo(-w+30,-h);g.lineTo(w,h-30);g.lineTo(w,h);g.lineTo(w-30,h);g.lineTo(-w,-h+30);g.closePath();g.fill()}
 else if(d==='bands'){for(let y=-h+h*.35;y<h;y+=h*.6)g.fillRect(-w,y-6,2*w,12)}else if(d==='rings'){g.strokeStyle=alt;g.lineWidth=6;g.beginPath();g.arc(0,0,w*.62,0,7);g.stroke()}
 else if(d==='rivets'||d==='studs'){for(let y=-h+14;y<h;y+=22)for(let x=-w+14;x<w;x+=22){g.beginPath();g.arc(x,y,3.5,0,7);g.fill()}}else if(d==='ridge'){g.fillRect(-7,-h,14,2*h)}else if(d==='runes'){g.fillStyle='#8fe3ff';for(let a=0;a<6;a++){g.fillRect(Math.cos(a)*w*.6-3,Math.sin(a)*w*.6-3,6,6)}}
 g.fillStyle='rgba(255,255,255,.16)';g.beginPath();g.ellipse(w*.35,-h*.4,w*.35,h*.22,-.6,0,7);g.fill();g.restore();
 if(rim){g.lineWidth=HUM_LW+9;g.strokeStyle=HUM_INK;g.stroke(P);g.lineWidth=8;g.strokeStyle=rim;g.stroke(P)}else{g.lineWidth=HUM_LW;g.strokeStyle=HUM_INK;g.stroke(P)}
 if(boss)humSh(g,humCirc(0,fam==='kite'?-h*.25:0,fam==='buckler'?14:17),boss,{dk:.25});
 if(V.boss==='spike'){humSh(g,humCirc(0,0,15),'#c8d0d6');humSh(g,humPoly([-8,-4,0,-26,8,-4]),'#dfe5ea')}
 if(V.spikes)for(let a=0;a<8;a++){const c=Math.cos(a*Math.PI/4),s=Math.sin(a*Math.PI/4);humSh(g,humPoly([c*w-s*6,s*w+c*6,c*(w+16),s*(w+16),c*w+s*6,s*w-c*6]),'#dfe5ea',{lw:5})}
 if(crack){g.strokeStyle=HUM_INK;g.lineWidth=4;g.beginPath();g.moveTo(-w*.2,-h*.9);g.lineTo(w*.05,-h*.35);g.lineTo(-w*.15,h*.05);g.lineTo(w*.12,h*.55);g.stroke()}}

/* ---- head gear: head space (origin the skull centre, R its radius, forward +x; back = the back view, no face) ---- */
function humDome(r,yF,yB,sag){const a1=Math.asin(Math.max(-.99,Math.min(.99,yF/r))),a0=Math.PI-Math.asin(Math.max(-.99,Math.min(.99,yB/r)));
 return humP(p=>{p.arc(0,0,r,a0,Math.PI*2+a1,false);const x1=Math.cos(a1)*r,y1=Math.sin(a1)*r,x0=Math.cos(a0)*r,y0=Math.sin(a0)*r;p.quadraticCurveTo((x0+x1)/2,(y0+y1)/2+(sag||0),x0,y0);p.closePath()})}
function humMailTex(g,P,x0,y0,x1,y1,c){g.save();g.clip(P);g.strokeStyle=humDk(c,.38);g.lineWidth=2.6;for(let y=y0,j=0;y<y1;y+=11,j++){g.beginPath();for(let x=x0+(j&1?6:0);x<x1;x+=12){g.moveTo(x+5,y);g.arc(x,y,5,0,Math.PI,false)}g.stroke()}g.restore()}
function humHair(g,S,R,back,part){const st=S.hair;if(!st||st==='bald')return;const hr=S.hairR||usHairR(['i','H','k']),c=humMix(humRC(hr),humRC(hr,1),.2),r=R+6;
 const longS=st==='long'||st==='braids'||st==='mane',
  sh=(P,o)=>humSh(g,P,c,Object.assign({dk:.25,sx:7,sy:-6},o||{}));
 if(part==='behind'){if(longS&&!back){const P=humP(p=>{p.moveTo(-R*.95,-R*.1);p.quadraticCurveTo(-R*1.25,R*.9,-R*1.05,R*(st==='mane'?1.55:1.75));p.quadraticCurveTo(-R*.6,R*1.9,-R*.15,R*1.45);p.lineTo(-R*.1,R*.3);p.closePath()});sh(P);humBBp(g,-R*1.3,R*1.8,6)}
  if(st==='tail'&&!back){sh(humP(p=>{p.moveTo(-R*.8,R*.15);p.quadraticCurveTo(-R*1.35,R*.5,-R*1.15,R*1.25);p.quadraticCurveTo(-R*.95,R*.9,-R*.62,R*.45);p.closePath()}))}
  return}
 if(part==='over'){if(back&&(longS||st==='tail')){const L=st==='tail'?1.65:st==='mane'?1.75:2.05,w=st==='tail'?.3:.82;
   sh(humP(p=>{p.moveTo(-R*w,R*.1);p.bezierCurveTo(-R*(w+.12),R*L*.7,-R*w*.8,R*L,0,R*L);p.bezierCurveTo(R*w*.8,R*L,R*(w+.12),R*L*.7,R*w,R*.1);p.closePath()}));humBBp(g,0,R*L,R*.9);
   g.strokeStyle=humDk(c,.32);g.lineWidth=3;if(st==='braids'){for(const x of[-R*.35,R*.35])for(let y=R*.55;y<R*(L-.1);y+=16){g.beginPath();g.moveTo(x-8,y);g.quadraticCurveTo(x,y+10,x+8,y);g.stroke()}}
   else for(const x of[-R*.4,0,R*.4]){g.beginPath();g.moveTo(x,R*.6);g.quadraticCurveTo(x*1.1,R*L*.8,x*.9,R*(L-.08));g.stroke()}}
  return}
 // the cap of hair over the skull
 let P;
 if(back){const nape=st==='crop'||st==='tonsure'?.38:st==='mohawk'?0:.55;
  if(st==='mohawk')P=humP(p=>{p.moveTo(-R*.25,R*.3);p.quadraticCurveTo(-R*.3,-R*1.3,0,-R*1.3);p.quadraticCurveTo(R*.3,-R*1.3,R*.25,R*.3);p.closePath()});
  else P=humP(p=>{p.arc(0,0,r,Math.PI-Math.asin(nape),Math.PI*2+Math.asin(nape),false);p.quadraticCurveTo(0,R*(nape+.18),Math.cos(Math.PI-Math.asin(nape))*r,nape*r);p.closePath()});
  sh(P);if(st==='tonsure'){humSh(g,humEll(0,-R*.45,R*.42,R*.3),humLit(S.skin),{dk:.15})}}
 else{const brow={bowl:.12,swept:-.1,shaggy:.05,curly:-.05,mane:-.05,crop:-.28,tonsure:-.2,topknot:-.25,bun:-.2,tail:-.22,wisps:-.4,long:-.12,braids:-.15}[st];const b=brow==null?-.2:brow;
  if(st==='mohawk')P=humP(p=>{p.arc(0,0,R*1.3,-2.75,-.95,false);p.arc(0,0,R*.92,-.8,-2.9,true);p.closePath()});
  else if(st==='wisps')P=humP(p=>{p.arc(0,0,r-2,Math.PI*1.25,Math.PI*1.75,false);p.quadraticCurveTo(0,-R*.65,-Math.cos(Math.PI*.25)*r,-Math.sin(Math.PI*.25)*r);p.closePath()});
  else P=humP(p=>{const a1=Math.asin(b),a0=Math.PI-Math.asin(st==='crop'?.2:.62);p.arc(0,0,r,a0,Math.PI*2+a1,false);
   if(st==='bowl')p.lineTo(-R*.2,b*R+R*.02);else if(st==='swept'){p.quadraticCurveTo(R*.6,-R*.05,R*.15,-R*.32);p.quadraticCurveTo(-R*.35,-R*.05,-R*.55,R*.3)}else p.quadraticCurveTo(R*.05,-R*.42,-R*.55,R*.3);
   p.lineTo(Math.cos(a0)*r,Math.sin(a0)*r);p.closePath()});
  sh(P);if(st==='tonsure')humSh(g,humEll(-R*.05,-R*.78,R*.5,R*.2),humLit(S.skin),{dk:.15})}
 if(st==='curly'||st==='shaggy'||st==='mane'){g.save();g.strokeStyle=humDk(c,.3);g.lineWidth=3;for(let a=-2.7;a<-.3;a+=.42){g.beginPath();g.arc(Math.cos(a)*R*.72,Math.sin(a)*R*.72,9,a+1.8,a+4,false);g.stroke()}g.restore()}
 else{g.save();g.clip(P);g.strokeStyle=humLt(c,.25);g.lineWidth=3.5;for(const a of[-2.2,-1.75,-1.3]){g.beginPath();g.arc(0,0,R*.82,a,a+.35);g.stroke()}g.restore()}
 if(st==='bun'||st==='topknot'){const x=st==='bun'?-R*.65:-R*.25,y=st==='bun'?-R*.75:-R*1.08;humSh(g,humCirc(x,y,R*.27),c,{dk:.25});if(st==='topknot')humInkLine(g,[x+R*.18,y+R*.05,x+R*.33,y-R*.1],humHex('g'),5);humBBp(g,x,y,R*.3)}
 if(st==='topknot'&&back){}}
function humBeard(g,S,R,dw){const bd=S.beard;if(!bd)return;const br=S.beardR||S.hairR||usHairR(['i','H','k']),c=humMix(humRC(br),humRC(br,1),.2),sh=P=>humSh(g,P,c,{dk:.25,sx:6,sy:-6});
 if(bd==='dwarf'||(dw&&(bd==='long'||bd==='fork'||bd==='full'))){   // the dwarves' signature: a big beard over the chest, braided
  const L=bd==='long'?1.95:bd==='fork'?1.8:1.7,W=1.12;sh(humP(p=>{p.moveTo(-R*.5,R*.12);p.quadraticCurveTo(-R*.55,R*L*.75,-R*.05,R*L);if(bd==='fork'){p.lineTo(R*.22,R*(L-.35));p.lineTo(R*.5,R*L)}else p.quadraticCurveTo(R*.5,R*(L+.08),R*.85,R*(L*.72));
   p.quadraticCurveTo(R*W,R*.5,R*.98,R*.25);p.quadraticCurveTo(R*.62,R*.6,R*.6,R*.56);p.quadraticCurveTo(R*.12,R*.68,-R*.12,R*.36);p.closePath()}));
  humSh(g,humP(p=>{p.moveTo(R*.2,R*.6);p.quadraticCurveTo(R*.55,R*.44,R*.98,R*.5);p.quadraticCurveTo(R*.65,R*.7,R*.2,R*.6);p.closePath()}),humDk(c,.12),{dk:.2});
  g.strokeStyle=humDk(c,.32);g.lineWidth=3;for(const x of[-.15,.15,.45]){g.beginPath();g.moveTo(R*x,R*.8);g.quadraticCurveTo(R*(x+.06),R*(L*.75),R*(x+.02),R*(L*.92));g.stroke()}
  for(const x of bd==='fork'?[.05,.45]:[.2]){const ring=S.ring?humHex('c'):humDk(c,.25);humSh(g,humP(p=>humRR(p,R*x-11,R*(L-.32),22,14,5)),ring,{lw:5})}
  humBBp(g,R*.2,R*L,R*.9);return}
 switch(bd){
  case'stache':sh(humP(p=>{p.moveTo(R*.2,R*.6);p.quadraticCurveTo(R*.5,R*.42,R*.85,R*.5);p.quadraticCurveTo(R*.6,R*.68,R*.2,R*.6);p.closePath()}));break;
  case'goatee':sh(humP(p=>{p.moveTo(R*.3,R*.7);p.quadraticCurveTo(R*.55,R*.6,R*.75,R*.62);p.quadraticCurveTo(R*.75,R*1.05,R*.48,R*1.12);p.quadraticCurveTo(R*.3,R*1,R*.3,R*.7);p.closePath()}));break;
  case'chops':sh(humP(p=>{p.moveTo(-R*.42,R*.25);p.quadraticCurveTo(-R*.2,R*.3,-R*.1,R*.85);p.quadraticCurveTo(-R*.32,R*.95,-R*.5,R*.62);p.closePath()}));sh(humP(p=>{p.moveTo(R*.85,R*.3);p.quadraticCurveTo(R*.95,R*.5,R*.9,R*.62);p.quadraticCurveTo(R*.75,R*.62,R*.76,R*.35);p.closePath()}));break;
  default:{const L=bd==='long'?1.55:bd==='full'?1.22:bd==='fork'?1.45:1.02;
   sh(humP(p=>{p.moveTo(-R*.42,R*.2);p.quadraticCurveTo(-R*.25,R*(L*.8),R*.25,R*L);if(bd==='fork'){p.lineTo(R*.4,R*(L-.25));p.lineTo(R*.58,R*L)}else p.quadraticCurveTo(R*.7,R*L,R*.88,R*(L*.65));
    p.quadraticCurveTo(R*1.02,R*.42,R*.94,R*.3);p.quadraticCurveTo(R*.6,R*.6,R*.62,R*.55);p.quadraticCurveTo(R*.15,R*.66,-R*.08,R*.42);p.closePath()}));
   humBBp(g,R*.3,R*L,10);g.strokeStyle=humDk(c,.32);g.lineWidth=3;for(const x of[.1,.35,.6]){g.beginPath();g.moveTo(R*x,R*(.72+x*.1));g.lineTo(R*(x+.04),R*(L*.85));g.stroke()}}}}
const HUM_HATS=['cap','skullcap','armcap','coif','hood','cowl','kettle','nasal','spangen','sallet','barbute','bascinet','armet','great','hornhelm','horns','feather','feathercap','straw','band','bandana','circlet','crown','wide','capotain','furcap','scholar','miner','wrap','mask',
 'jingasa','hachigane','kabuto','menpo','kawari','murm','galea','thraex','ogreskull','tuskbarbute','wyvcrest','lgcrown','lgoni','voidhelm'];
// the helmet's colours: cloth / leather hats from S.hatR, metal from the merc's finish (S.MR), famed helmets gilt
function humHatCols(S){const M=S.MR||USR,steel=humLit(M.steel),cl=S.hatR?humLit(S.hatR):null;return{steel,iron:humLit(M.iron||USR.iron),cloth:cl||humLit(usCloth('brown')),leather:cl||humLit(USR.leather),gold:humLit(USR.gold),brass:humLit(USR.brass),
 lac:humLit(S.lacqR||USR.blk),odo:humLit(S.odoR||USR.red),trim:S.famH?humLit(USR.gold):null}}
function humHat(g,S,R,back,part){const t=S.hat;if(!t)return false;const C=humHatCols(S),sh=(P,c,o)=>humSh(g,P,c,o),r=R+7,ink=HUM_INK;
 const slit=(x0,x1,y,h)=>{if(back)return;g.fillStyle=ink;g.beginPath();humRR(g,x0,y-h/2,x1-x0,h,h/2);g.fill()};
 const gild=P=>{if(!C.trim)return;g.save();g.lineWidth=5;g.strokeStyle=C.trim;g.stroke(P);g.restore()};
 const plume=(x,y,c)=>{const P=humP(p=>{p.moveTo(x,y);p.quadraticCurveTo(x-R*.2,y-R*.9,x-R*1.05,y-R*.75);p.quadraticCurveTo(x-R*.55,y-R*.45,x+R*.12,y-R*.05);p.closePath()});sh(P,c||humLit(S.hatR||usCloth('red')));humBBp(g,x-R*1.05,y-R*.9,6)};
 const dome=(yF,yB,c,ext,sag)=>{const P=humDome(r+(ext||0),yF*R,yB*R,sag||0);sh(P,c,{dk:.2,sx:8,sy:-6});gild(P);return P};
 const hl=(c)=>{g.save();g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=5;g.beginPath();g.arc(0,0,R*.78,-2.3,-1.7);g.stroke();g.restore()};
 const hoodP=(c,mail)=>{const P=humP(p=>{p.moveTo(-R*1.05,R*1.18);p.quadraticCurveTo(-R*1.25,R*.2,-R*1.0,-R*.5);p.quadraticCurveTo(-R*.6,-R*1.25,R*.15,-R*1.12);p.quadraticCurveTo(R*1.05,-R*.95,R*1.08,R*.15);p.quadraticCurveTo(R*1.1,R*.95,R*.85,R*1.18);p.closePath();
   if(!back){p.moveTo(R*.5+R*.6*Math.cos(-.15),R*.36+R*.6*Math.sin(-.15));p.ellipse(R*.5,R*.36,R*.6,R*.56,-.15,0,Math.PI*2,true)}});g.save();g.fillStyle=humDk(c,.2);g.fill(P,'evenodd');g.clip(P,'evenodd');g.translate(8,-6);g.fillStyle=c;g.fill(P,'evenodd');g.restore();
  if(mail)humMailTex(g,P,-R*1.3,-R*1.3,R*1.2,R*1.3,c);g.lineWidth=HUM_LW;g.strokeStyle=ink;g.stroke(P);humBBp(g,0,R*1.2,R*1.2);return P};
 if(part==='behind'){if(t==='hood'||t==='cowl'||t==='coif'){if(!back)return true}return false}
 switch(t){
  case'cap':{dome(-.12,.1,C.leather,2);if(!back)sh(humP(p=>{p.moveTo(R*.5,-R*.2);p.quadraticCurveTo(R*1.15,-R*.22,R*1.35,-R*.02);p.quadraticCurveTo(R*.9,R*.02,R*.55,-R*.06);p.closePath()}),C.leather);break}
  case'skullcap':dome(-.3,-.1,humLit(USR.bone),0);break;
  case'armcap':{const P=dome(.05,.45,'#e8e2d4',4);g.save();g.clip(P);g.strokeStyle='#b9b1a0';g.lineWidth=3;for(let x=-R;x<R;x+=22){g.beginPath();g.moveTo(x,-R*1.2);g.quadraticCurveTo(x+10,0,x,R*.6);g.stroke()}g.restore();break}
  case'coif':hoodP(C.steel,1);break;
  case'hood':case'cowl':{hoodP(C.cloth);if(!back)humInkLine(g,[-R*.9,-R*.3,-R*1.35,-R*.05],C.cloth,14);break}
  case'kettle':{dome(.02,.12,C.steel,0);hl();const P=humEll(0,R*.05,R*1.5,R*.25);sh(P,C.steel,{dk:.25,sx:0,sy:-6});gild(P);humBBp(g,R*1.5,0,6);humBBp(g,-R*1.5,0,6);break}
  case'nasal':case'spangen':case'hornhelm':{const P=humP(p=>{p.moveTo(-r,R*.12);p.quadraticCurveTo(-r,-R*.9,R*.05,-R*1.32);p.quadraticCurveTo(r,-R*.9,r,R*.02);p.quadraticCurveTo(0,R*.06,-r,R*.12);p.closePath()});sh(P,C.steel,{dk:.2,sx:8,sy:-6});gild(P);hl();
   const rim=humP(p=>{p.moveTo(-r-2,R*.02);p.quadraticCurveTo(0,-R*.06,r+2,-R*.1);p.lineTo(r+2,R*.06);p.quadraticCurveTo(0,R*.12,-r-2,R*.18);p.closePath()});sh(rim,t==='spangen'?C.brass:C.iron,{flat:1});
   if(t==='spangen'){g.save();g.clip(P);for(const x of[-R*.45,R*.1,R*.62])humInkLine(g,[x,R*.05,R*.05,-R*1.3],C.brass,7);g.restore()}
   if(!back){sh(humP(p=>humRR(p,R*.42,-R*.02,R*.18,R*.55,6)),t==='spangen'?C.brass:C.iron,{flat:1})}
   if(t==='hornhelm'){for(const s of[-1,1]){const x=s<0?-R*.85:R*.7;sh(humP(p=>{p.moveTo(x-12,-R*.45);p.quadraticCurveTo(x+s*R*.6,-R*.6,x+s*R*.55,-R*1.3);p.quadraticCurveTo(x+s*R*.25,-R*.75,x+12,-R*.6);p.closePath()}),'#ece2c6');humBBp(g,x+s*R*.6,-R*1.3,6)}}
   break}
  case'sallet':{const P=humP(p=>{p.moveTo(R*1.1,R*.22);p.quadraticCurveTo(R*1.15,-R*1.15,-R*.2,-R*1.12);p.quadraticCurveTo(-R*1.2,-R*.95,-R*1.15,R*.25);p.quadraticCurveTo(-R*1.3,R*.55,-R*1.6,R*.72);p.quadraticCurveTo(-R*.8,R*.62,-R*.4,R*.3);p.quadraticCurveTo(R*.4,R*.24,R*1.1,R*.22);p.closePath()});
   sh(P,C.steel,{dk:.2,sx:8,sy:-6});gild(P);hl();slit(R*.15,R*1.05,R*.08,R*.1);humBBp(g,-R*1.6,R*.72,4);break}
  case'barbute':case'tuskbarbute':{const P=humP(p=>{p.moveTo(-r,R*.2);p.quadraticCurveTo(-r-6,-R*1.12,0,-R*1.1);p.quadraticCurveTo(r+8,-R*1.1,r+2,R*.15);p.quadraticCurveTo(R*1.05,R*.85,R*.6,R*.95);p.lineTo(-R*.4,R*.9);p.quadraticCurveTo(-R*1.05,R*.75,-r,R*.2);p.closePath()});
   sh(P,C.steel,{dk:.2,sx:8,sy:-6});gild(P);hl();if(!back){g.fillStyle=ink;g.beginPath();g.moveTo(R*.12,-R*.02);g.lineTo(R*1.02,-R*.06);g.lineTo(R*1.02,R*.18);g.lineTo(R*.72,R*.2);g.lineTo(R*.7,R*.9);g.lineTo(R*.46,R*.9);g.lineTo(R*.44,R*.22);g.lineTo(R*.12,R*.22);g.closePath();g.fill()}
   if(t==='tuskbarbute'&&!back)for(const x of[R*.3,R*.85])sh(humPoly([x-8,R*.8,x+4,R*1.2,x+10,R*.8]),'#efe6cc');break}
  case'bascinet':case'armet':case'voidhelm':case'wyvcrest':{const P=humP(p=>{p.moveTo(-r,R*.3);p.quadraticCurveTo(-r-4,-R*.9,t==='bascinet'?-R*.25:0,t==='bascinet'?-R*1.38:-R*1.12);p.quadraticCurveTo(r+10,-R*1.0,r+4,R*.2);p.quadraticCurveTo(R*1.1,R*.9,R*.4,R*1.0);p.lineTo(-R*.5,R*.9);p.closePath()});
   sh(P,t==='voidhelm'?'#3c3550':C.steel,{dk:.2,sx:8,sy:-6});gild(P);hl();
   if(!back){if(t==='bascinet'){sh(humP(p=>{p.moveTo(R*.2,-R*.25);p.quadraticCurveTo(R*1.0,-R*.3,R*1.55,R*.32);p.quadraticCurveTo(R*1.0,R*.85,R*.2,R*.75);p.closePath()}),C.steel,{dk:.22});slit(R*.45,R*1.15,R*.08,R*.09);g.fillStyle=ink;for(let i=0;i<3;i++){g.beginPath();g.arc(R*(1.0+i*.12),R*(.38+i*.06),3.5,0,7);g.fill()}humBBp(g,R*1.55,R*.3,6)}
    else{humInkLine(g,[R*.05,R*.38,R*1.08,R*.3],humDk(C.steel,.15),5);slit(R*.25,R*1.06,R*.12,R*.11);g.fillStyle=ink;for(let i=0;i<4;i++){g.beginPath();g.arc(R*(.6+i*.12),R*.62,3,0,7);g.fill()}}}
   if(t==='wyvcrest')sh(humP(p=>{p.moveTo(R*.4,-R*1.0);p.quadraticCurveTo(-R*.2,-R*1.7,-R*1.1,-R*1.4);p.quadraticCurveTo(-R*.6,-R*1.15,-R*.7,-R*.9);p.closePath()}),humLit(USR.red||usCloth('red')));
   if(S.plume||S.coat)plume(-R*.1,-R*1.05,S.coat?humLit(S.coat.K):null);break}
  case'great':{const P=humP(p=>humRR(p,-r-4,-R*1.08,2*r+12,R*2.05,R*.35));sh(P,C.steel,{dk:.2,sx:10,sy:-6});gild(P);g.save();g.clip(P);g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=6;g.beginPath();g.moveTo(-R*.5,-R*.95);g.lineTo(-R*.5,R*.8);g.stroke();g.restore();
   if(!back){g.fillStyle=ink;g.fillRect(R*.05,R*.0,R*1.07,R*.17);humInkLine(g,[R*.62,-R*1.0,R*.62,-R*.06],humDk(C.steel,.2),6);humInkLine(g,[R*.62,R*.22,R*.62,R*.9],humDk(C.steel,.2),6);g.fillStyle=ink;for(let y=R*.38;y<R*.8;y+=14){g.beginPath();g.arc(R*.85,y,3.2,0,7);g.arc(R*.98,y,3.2,0,7);g.fill()}}
   humBBp(g,-r,R*.97,4);if(S.coat||S.plume)plume(-R*.15,-R*1.05,S.coat?humLit(S.coat.K):null);break}
  case'horns':{dome(-.18,0,humLit(USR.iron),0);for(const s of[-1,1]){const x=s*R*.62;sh(humP(p=>{p.moveTo(x-12,-R*.6);p.quadraticCurveTo(x+s*R*.75,-R*.7,x+s*R*.5,-R*1.45);p.quadraticCurveTo(x+s*R*.35,-R*.9,x+12,-R*.85);p.closePath()}),'#ece2c6');humBBp(g,x+s*R*.75,-R*1.45,6)}break}
  case'feather':case'feathercap':{const c=humLit(S.hatR||usCloth('red'));sh(humP(p=>{p.moveTo(-R*1.05,-R*.15);p.quadraticCurveTo(-R*.9,-R*1.35,R*.35,-R*1.15);p.quadraticCurveTo(R*1.35,-R*.9,R*1.05,-R*.3);p.quadraticCurveTo(0,-R*.5,-R*1.05,-R*.15);p.closePath()}),c);
   plume(-R*.4,-R*.9,humLit(USR.white));break}
  case'straw':case'jingasa':{const c=t==='straw'?humLit(usCloth('straw')):C.lac,P=humP(p=>{p.moveTo(-R*1.75,-R*.05);p.quadraticCurveTo(-R*.4,-R*1.0,0,-R*1.32);p.quadraticCurveTo(R*.4,-R*1.0,R*1.75,-R*.12);p.quadraticCurveTo(0,R*.1,-R*1.75,-R*.05);p.closePath()});sh(P,c,{dk:.22,sx:0,sy:-8});
   if(t==='jingasa'){g.save();g.lineWidth=5;g.strokeStyle=humLit(USR.gold);g.stroke(humP(p=>{p.moveTo(-R*1.68,-R*.08);p.quadraticCurveTo(0,R*.07,R*1.68,-R*.14)}));g.restore();humSh(g,humCirc(0,-R*.65,10),C.gold)}
   else{g.save();g.clip(P);g.strokeStyle=humDk(c,.25);g.lineWidth=2.5;for(let x=-R*1.6;x<R*1.6;x+=16){g.beginPath();g.moveTo(0,-R*1.3);g.lineTo(x,0);g.stroke()}g.restore()}humBBp(g,-R*1.75,0,6);humBBp(g,R*1.75,0,6);humBBp(g,0,-R*1.32,6);break}
  case'band':case'hachigane':{const c=t==='hachigane'?humLit(S.hatR||USR.white):humLit(S.hatR||usCloth('red'));const P=humP(p=>{p.moveTo(-r,-R*.28);p.quadraticCurveTo(0,-R*.5,r,-R*.38);p.lineTo(r,-R*.12);p.quadraticCurveTo(0,-R*.24,-r,-R*.02);p.closePath()});sh(P,c,{flat:1});
   if(t==='hachigane'&&!back)sh(humP(p=>humRR(p,R*.38,-R*.5,R*.5,R*.36,6)),C.steel);if(back)humInkLine(g,[-R*.9,-R*.12,-R*1.3,R*.35],c,10);break}
  case'bandana':{dome(-.22,.15,humLit(S.hatR||usCloth('red')),3);humInkLine(g,[-R*.95,R*.05,-R*1.35,R*.45],humLit(S.hatR||usCloth('red')),11);break}
  case'circlet':case'crown':case'lgcrown':{const P=humP(p=>{const y0=-R*.62,y1=-R*.32;p.moveTo(-r,y1);p.lineTo(-r,y0);const n=t==='circlet'?0:5;for(let i=0;i<=n;i++){const x=-r+i*2*r/n;if(n){p.lineTo(x-10,y0);p.lineTo(x,y0-(t==='circlet'?0:R*.38));p.lineTo(x+10,y0)}}p.lineTo(r,y0);p.lineTo(r,y1+4);p.quadraticCurveTo(0,y1+12,-r,y1);p.closePath()});
   sh(P,C.gold,{dk:.25,sx:6,sy:-3});if(t!=='circlet'){g.fillStyle=t==='lgcrown'?'#ff5a6e':'#d23c3c';g.beginPath();g.arc(R*.1,-R*.48,6,0,7);g.fill()}if(t==='circlet'&&!back)humSh(g,humCirc(R*.6,-R*.5,7),'#5ac8ff');humBBp(g,0,-R*1.0,6);break}
  case'wide':case'capotain':{const c=humLit(S.hatR||USR.leather),hgt=t==='capotain'?1.6:1.05;sh(humP(p=>{p.moveTo(-R*.85,-R*.25);p.lineTo(-R*.7,-R*hgt);p.quadraticCurveTo(0,-R*(hgt+.15),R*.7,-R*hgt);p.lineTo(R*.85,-R*.3);p.closePath()}),c);if(t==='capotain')humInkLine(g,[-R*.78,-R*.55,R*.78,-R*.6],humLit(USR.dleather),9);
   sh(humEll(0,-R*.28,R*1.6,R*.22,-.04),c,{dk:.25,sx:0,sy:-6});humBBp(g,-R*1.6,-R*.3,6);humBBp(g,R*1.6,-R*.3,6);humBBp(g,0,-R*hgt,6);break}
  case'furcap':{const c=humLit(USR.fur||usCloth('brown'));const P=dome(-.1,.12,c,8,10);g.save();g.strokeStyle=humDk(c,.3);g.lineWidth=3;for(let a=-3;a<0;a+=.3){g.beginPath();g.moveTo(Math.cos(a)*(r+4),Math.sin(a)*(r+4));g.lineTo(Math.cos(a)*(r-10),Math.sin(a)*(r-10));g.stroke()}g.restore();break}
  case'scholar':{const c=humLit(S.hatR||usCloth('night'));sh(humP(p=>{p.moveTo(-R*1.0,-R*.2);p.quadraticCurveTo(-R*1.2,-R*1.3,R*.2,-R*1.2);p.quadraticCurveTo(R*1.3,-R*1.1,R*1.0,-R*.3);p.quadraticCurveTo(0,-R*.45,-R*1.0,-R*.2);p.closePath()}),c);humSh(g,humCirc(-R*.9,-R*.9,R*.17),c);break}
  case'miner':{dome(-.15,.05,humLit(USR.leather),2);if(!back){humSh(g,humP(p=>humRR(p,R*.55,-R*.75,R*.4,R*.3,6)),C.brass);humSh(g,humCirc(R*.95,-R*.6,8),'#fff2a0')}break}
  case'wrap':{const c=humLit(S.hatR||usCloth('straw')),P=dome(-.05,.15,c,10,8);g.save();g.clip(P);g.strokeStyle=humDk(c,.28);g.lineWidth=4;for(let i=0;i<4;i++){g.beginPath();g.moveTo(-R*1.2,-R*(.05+i*.28));g.quadraticCurveTo(0,-R*(.45+i*.28),R*1.2,-R*(.2+i*.28));g.stroke()}g.restore();if(S.veilR&&!back)sh(humP(p=>{p.moveTo(R*.05,R*.45);p.lineTo(R*1.06,R*.35);p.quadraticCurveTo(R*1.05,R*.9,R*.5,R*.98);p.quadraticCurveTo(R*.1,R*.85,R*.05,R*.45);p.closePath()}),humLit(S.veilR));break}
  case'mask':break;
  case'kabuto':case'menpo':case'kawari':case'lgoni':{const L=C.lac,shk=humP(p=>{p.moveTo(-R*1.08,-R*.3);p.quadraticCurveTo(-R*1.3,R*.3,-R*1.62,R*.62);p.quadraticCurveTo(-R*1.0,R*.86,-R*.42,R*.66);p.quadraticCurveTo(-R*.25,R*.25,R*.1,R*.0);p.closePath()});
   sh(shk,L,{dk:.25});g.save();g.clip(shk);for(let y=R*.08;y<R*.8;y+=R*.18)humLine(g,[-R*1.75,y+R*.12,R*.3,y-R*.12],C.odo,5);g.restore();
   const P=humDome(r+4,R*.05,R*.1,0);sh(P,L,{dk:.2,sx:8,sy:-6});g.save();g.clip(P);g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=3;for(let a=-2.9;a<-.2;a+=.24){g.beginPath();g.moveTo(0,R*.05);g.lineTo(Math.cos(a)*r*1.2,Math.sin(a)*r*1.2);g.stroke()}g.restore();
   if(!back){sh(humP(p=>{p.moveTo(R*.95,-R*.3);p.quadraticCurveTo(R*1.35,-R*.4,R*1.3,R*.1);p.quadraticCurveTo(R*1.1,-R*.05,R*.92,-R*.05);p.closePath()}),L);
    if(t!=='kawari'){for(const s of[-1,1])sh(humP(p=>{p.moveTo(R*.45,-R*.85);p.quadraticCurveTo(R*(.45+s*.55),-R*1.4,R*(.5+s*.45),-R*1.95);p.quadraticCurveTo(R*(.5+s*.2),-R*1.4,R*.55,-R*.8);p.closePath()}),C.gold,{dk:.3});humBBp(g,R*1.0,-R*1.95,6);humBBp(g,0,-R*1.95,6)}
    if(t==='menpo'||t==='lgoni')sh(humP(p=>{p.moveTo(R*.12,R*.45);p.quadraticCurveTo(R*.6,R*.38,R*1.08,R*.3);p.quadraticCurveTo(R*1.05,R*.95,R*.5,R*1.0);p.quadraticCurveTo(R*.15,R*.85,R*.12,R*.45);p.closePath()}),t==='lgoni'?'#c8322c':C.odo,{dk:.25});
    if(t==='lgoni')for(const x of[R*.1,R*.8])sh(humPoly([x-8,-R*.8,x,-R*1.5,x+8,-R*.8]),'#ece2c6')}
   if(t==='kawari'){sh(humP(p=>{p.moveTo(-R*.4,-R*.9);p.quadraticCurveTo(-R*.2,-R*2.3,R*.35,-R*2.1);p.quadraticCurveTo(R*.1,-R*1.5,R*.35,-R*.95);p.closePath()}),C.gold,{dk:.3});humBBp(g,0,-R*2.3,8)}
   gild(P);break}
  case'murm':case'galea':case'thraex':{const P=humP(p=>{p.moveTo(-r,R*.3);p.quadraticCurveTo(-r-6,-R*1.1,0,-R*1.08);p.quadraticCurveTo(r+8,-R*1.05,r+4,R*.25);p.quadraticCurveTo(R*1.0,R*.9,R*.4,R*.95);p.lineTo(-R*.5,R*.9);p.closePath()});sh(P,C.brass,{dk:.22,sx:8,sy:-6});
   if(t!=='galea'){sh(humEll(0,R*.12,R*1.45,R*.2),C.brass,{dk:.25,sx:0,sy:-6});humBBp(g,R*1.45,0,6);humBBp(g,-R*1.45,0,6);if(!back){g.save();g.beginPath();g.ellipse(R*.65,R*.48,R*.32,R*.3,0,0,7);g.fillStyle=ink;g.fill();g.strokeStyle=humLit(USR.steel);g.lineWidth=3;for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(R*(.65+i*.12),R*.2);g.lineTo(R*(.65+i*.12),R*.76);g.stroke()}g.restore()}}
   else if(!back){slit(R*.2,R*1.04,R*.14,R*.16);sh(humP(p=>humRR(p,R*.1,R*.3,R*.42,R*.62,10)),C.brass,{dk:.25})}
   const cr=t==='thraex'?humP(p=>{p.moveTo(R*.5,-R*.9);p.quadraticCurveTo(R*.9,-R*1.6,R*.3,-R*1.75);p.quadraticCurveTo(-R*.5,-R*1.6,-R*.95,-R*.6);p.quadraticCurveTo(-R*.3,-R*1.2,R*.5,-R*.9);p.closePath()}):humP(p=>{p.moveTo(R*.6,-R*.8);p.quadraticCurveTo(R*.4,-R*1.6,-R*.5,-R*1.5);p.quadraticCurveTo(-R*1.2,-R*1.2,-R*1.05,-R*.5);p.quadraticCurveTo(-R*.5,-R*1.05,R*.6,-R*.8);p.closePath()});
   sh(cr,t==='thraex'?C.brass:humLit(S.hatR||usCloth('red')),{dk:.25});humBBp(g,0,-R*1.75,8);break}
  case'ogreskull':{dome(-.05,.2,'#e6dcc0',6);if(!back){g.fillStyle=HUM_INK;g.beginPath();g.ellipse(R*.55,-R*.45,R*.16,R*.12,0,0,7);g.fill();for(let x=-R*.6;x<R*1.0;x+=R*.3)humSh(g,humPoly([x,-R*.05,x+8,R*.25,x+16,-R*.05]),'#f2ead6',{lw:4})}break}
  default:dome(-.12,.1,C.leather,2)}
 return true}

/* ---- armour and clothing over the tinted torso (piece coords; painted only on the cloth layer, under the outline) ---- */
function humEmblem(g,key,x,y,s,col){const E=typeof EMBLEMS==='object'?(EMBLEMS[key]||EMBLEMS.swords):null;if(!E||!E.r)return;const R=E.r,c=s/16;
 for(let j=0;j<16;j++){const row=R[j];for(let i=0;i<16;i++){const ch=row[i];if(ch==='#'||ch==='+'||ch==='-'||ch==='l'){g.fillStyle=ch==='+'||ch==='l'?humLt(col,.25):ch==='-'?humDk(col,.25):col;g.fillRect(x-s/2+i*c-.3,y-s/2+j*c-.3,c+.6,c+.6)}}}}
function humTorsoDeco(hs,v,n){const S=hs.S,A=hs.A,a=S.armor,V=S.av||{},C=hs.C,b=humBox(n,'c'),x0=b.x,y0=b.y,x1=b.x+b.w,y1=b.y+b.h,cx=x0+b.w*(v==='f'?.56:.5),body=C.body,dk=humDk(body,.32),lt=humLt(body,.35);
 return g=>{const L=(pts,c,w)=>humLine(g,pts,c,w);
  switch(a){
   case'mail':g.save();g.strokeStyle=dk;g.lineWidth=2.6;for(let y=y0+4,j=0;y<y1;y+=10,j++){g.beginPath();for(let x=x0+(j&1?6:0);x<x1+6;x+=12){g.moveTo(x+5,y);g.arc(x,y,5,0,Math.PI,false)}g.stroke()}g.restore();if(v==='f')L([x1-8,y0+6,x0+18,y1-4],humLit(USR.dleather),7);break;
   case'scale':for(let y=y0+2,j=0;y<y1+8;y+=12,j++)for(let x=x0+(j&1?7:0)-7;x<x1+8;x+=14){g.fillStyle=humDk(body,.12);g.beginPath();g.arc(x,y,8,0,Math.PI);g.fill();g.strokeStyle=dk;g.lineWidth=2.4;g.beginPath();g.arc(x,y,8,0,Math.PI);g.stroke();g.fillStyle=lt;g.fillRect(x-4,y+1,3,3)}
    if(v==='f')L([x0,y0+4,x1,y0+4],humLit(S.accR||USR.brass),8);break;
   case'lamellar':{const od=humLit(V.odo?(USR[{X:'mana',g:'red',y:'gold'}[V.odo]]||USR.red):USR.red);for(let y=y0+8;y<y1;y+=14){g.fillStyle=dk;for(let x=x0;x<x1;x+=9)g.fillRect(x,y,2,10);L([x0,y+12,x1,y+12],od,4)}if(V.gild)L([x0,y0+3,x1,y0+3],humLit(USR.gold),6);break}
   case'plate':g.fillStyle=lt;g.beginPath();g.ellipse(cx-14,y0+b.h*.35,10,b.h*.32,0,0,7);g.fill();L([cx,y0+8,cx,y1-28],dk,4);for(const y of[y1-26,y1-14])L([x0,y,x1,y],dk,3.5);
    g.fillStyle=humLit(USR.brass);for(const x of[x0+10,x1-10]){g.beginPath();g.arc(x,y0+14,3.2,0,7);g.fill()}if(V.tex==='flute'){for(let x=x0+14;x<x1;x+=14)L([x,y0+b.h*.55,x+4,y1],dk,2.5)}break;
   case'coat':case'brig':{const r=humLit(a==='coat'?USR.steel:USR.brass);for(let y=y0+10;y<y1;y+=14)for(let x=x0+8+((y/14|0)&1)*7;x<x1;x+=14){g.fillStyle=HUM_INK;g.beginPath();g.arc(x,y,3.8,0,7);g.fill();g.fillStyle=r;g.beginPath();g.arc(x-.6,y-.6,2.4,0,7);g.fill()}if(a==='coat')L([cx,y0+6,cx,y1],dk,3);break}
   case'padded':for(let x=x0+10;x<x1;x+=14)L([x,y0,x,y1],dk,2.6);if(V.tex==='diamond')for(let y=y0;y<y1;y+=16)L([x0,y,x1,y+30],dk,2);if(V.collar)L([x0+10,y0+4,x1-10,y0+4],humDk(body,.15),9);break;
   case'leather':if(V.tex==='studs'){g.fillStyle=humLit(USR.steel);for(let y=y0+10;y<y1;y+=14)for(let x=x0+8+((y/14|0)&1)*7;x<x1;x+=14){g.beginPath();g.arc(x,y,3,0,7);g.fill()}}
    if(V.tex==='hide')for(let i=0;i<9;i++){g.fillStyle=humDk(body,.2);g.beginPath();g.ellipse(x0+((i*37)%b.w),y0+((i*23)%b.h),7,4,i,0,7);g.fill()}
    if(v==='f'){L([x0+16,y0+4,x1-6,y1-8],humLit(USR.dleather),7);g.fillStyle=humLit(USR.brass);g.beginPath();g.arc(x0+b.w*.55,y0+b.h*.5,4,0,7);g.fill()}else L([x1-12,y0+4,x0+8,y1-8],humLit(USR.dleather),7);break;
   case'fur':for(let i=0;i<14;i++){const x=x0+((i*29)%b.w),y=y0+((i*17)%b.h);L([x,y,x+5,y+9],dk,2.5)}L([x0,y0+6,x1,y0+6],humLt(body,.2),12);break;
   case'robe':{const tr=humLit(S.trim||USR.brass);if(v==='f'){L([cx,y0,cx,y1],tr,9);if(V.sig){g.fillStyle=S.res&&USR[S.res]?humLit(USR[S.res]):'#7ad0ff';for(let y=y0+16;y<y1-10;y+=20){g.beginPath();g.arc(x0+14,y,4,0,7);g.fill()}}}else L([x0+10,y0+6,x1-10,y0+6],tr,6);
    if(V.kesa)L([x0,y0+6,x1,y1],humLit(USR.gold),12);if(V.mailtop)humMailTex(g,humP(p=>p.rect(x0,y0,b.w,b.h*.45)),x0,y0,x1,y0+b.h*.45,humLit(USR.steel));break}
   case'rags':{if(v==='f'){g.fillStyle=humDk(body,.15);g.fillRect(x0+14,y0+b.h*.45,22,18);g.strokeStyle=dk;g.lineWidth=2;g.strokeRect(x0+14,y0+b.h*.45,22,18)}for(let x=x0+6;x<x1;x+=18)L([x,y1,x+6,y1-10,x+12,y1],dk,2.5);break}
   case'bare':L([cx-18,y0+b.h*.35,cx-4,y0+b.h*.42],dk,3);L([cx+4,y0+b.h*.42,cx+20,y0+b.h*.35],dk,3);L([cx,y0+b.h*.55,cx,y1-6],dk,2.5);break}
  // a tabard of the livery's accent over mail, scale and plate
  if(S.tabR&&!S.coat&&(a==='mail'||a==='scale'||a==='plate')){const tc=humLit(S.tabR);g.fillStyle=tc;g.fillRect(cx-16,y0-4,32,b.h+8);g.strokeStyle=humDk(tc,.35);g.lineWidth=3;g.strokeRect(cx-16,y0-4,32,b.h+8)}
  // background garb
  if(S.garb&&!S.coat){const gc=S.garbR?humLit(S.garbR):humLit(USR.red),gb=S.garb;
   if(gb==='sash'||gb==='bandolier'||gb==='rope'){L([x0+6,y0+2,x1-4,y1-6],gb==='rope'?'#c8a868':gc,gb==='rope'?6:11);if(gb==='bandolier'){g.fillStyle=humLit(USR.brass);for(let t=.2;t<.9;t+=.18){g.beginPath();g.arc(x0+6+(b.w-10)*t,y0+2+(b.h-8)*t,3.5,0,7);g.fill()}}}
   else if(gb==='braces'||gb==='straps'){L([x0+b.w*.3,y0,x0+b.w*.3,y1],gc,7);L([x0+b.w*.75,y0,x0+b.w*.75,y1],gc,7)}
   else if(gb==='tabard'||gb==='fine'){g.fillStyle=gc;g.fillRect(cx-18,y0-4,36,b.h+8)}
   else if(gb==='apron'||gb==='smith'||gb==='butcher'){g.fillStyle=gb==='butcher'?'#e8e4da':humLit(USR.leather);g.fillRect(cx-26,y0+b.h*.3,52,b.h);if(gb==='butcher'){g.fillStyle='#b83a32';g.beginPath();g.arc(cx+6,y0+b.h*.7,6,0,7);g.fill()}}
   else if(gb==='stripes'||gb==='motley'||gb==='plaid'){for(let x=x0+(gb==='motley'?0:6);x<x1;x+=gb==='motley'?b.w/2:18){g.fillStyle=gc;if(gb==='motley')g.fillRect(x,y0,b.w/4,b.h);else g.fillRect(x,y0,6,b.h)}if(gb==='plaid')for(let y=y0+8;y<y1;y+=18)g.fillRect(x0,y,b.w,5)}
   else if(gb==='eye'&&v==='f'){g.fillStyle=gc;g.beginPath();g.ellipse(cx,y0+b.h*.45,16,10,0,0,7);g.fill();g.fillStyle=HUM_INK;g.beginPath();g.arc(cx,y0+b.h*.45,5,0,7);g.fill()}
   else if(gb==='pelt'||gb==='fleece'||gb==='trophies'){L([x0,y0+8,x1,y0+8],gb==='fleece'?'#eee8da':humLit(USR.fur),16)}
   else if(gb==='patches'||gb==='tatters'||gb==='welts'){g.fillStyle=gc;g.fillRect(x0+b.w*.6,y0+b.h*.2,16,14);g.fillRect(x0+10,y0+b.h*.6,14,12)}
   else if(gb==='vials'){for(let i=0;i<3;i++){g.fillStyle=['#62c06a','#5aa0e8','#d860a0'][i];g.fillRect(x0+14+i*12,y0+b.h*.5,7,14)}}
   else if(gb==='manica'){}}
  if(V.gold||V.lg)L([x0+8,y0+4,x1-8,y0+4],humLit(USR.gold),6)}}
function humArmDeco(hs){const S=hs.S,a=S.armor,c=hs.C.slv,dk=humDk(c,.32);
 return(g,P)=>{const b=humBoxOf(P,'c');if(!b)return;if(a==='mail'||(S.av&&S.av.mailtop))(()=>{g.save();g.strokeStyle=dk;g.lineWidth=2.6;for(let y=b.y+4,j=0;y<b.y+b.h;y+=10,j++){g.beginPath();for(let x=b.x+(j&1?6:0);x<b.x+b.w+6;x+=12){g.moveTo(x+5,y);g.arc(x,y,5,0,Math.PI,false)}g.stroke()}g.restore()})();
  else if(a==='plate'||a==='coat'||a==='scale'||a==='lamellar'){for(let y=b.y+b.h*.45;y<b.y+b.h;y+=14)humLine(g,[b.x,y,b.x+b.w,y-4],dk,3)}
  else if(a==='padded')for(let x=b.x+10;x<b.x+b.w;x+=14)humLine(g,[x,b.y,x,b.y+b.h],dk,2.5)}}
function humBoxOf(P,m){const l=P&&P.L[m];return l?{x:l[4],y:l[5],w:l[6],h:l[7]}:null}
function humLegDeco(hs){const a=hs.S.armor,c=hs.C.leg;return(g,P)=>{const b=humBoxOf(P,'p');if(!b)return;if(a==='plate'||a==='void'){humSh(g,humEll(b.x+b.w*.55,b.y+b.h*.55,18,14),humLt(c,.1),{lw:4})}
 else if(hs.C.shin&&a!=='plate'){g.fillStyle=hs.C.shin;g.fillRect(b.x,b.y+b.h*.6,b.w,b.h*.4);humLine(g,[b.x,b.y+b.h*.6,b.x+b.w,b.y+b.h*.6],HUM_INK,4)}}}

/* ---- the frame builder ---- */
const HUM_SCR={c:null};
const HUM_SPK={mana:'#7ab8ff',aura:'#ffe27a',qi:'#7affd0',chi:'#ff9a5a',hex:'#c87aff',void:'#b07aff',ice:'#a8e8ff',fire:'#ffb040'};
function humBuild(L,face,st,fr){const I=humImg();if(!I||typeof document==='undefined')return null;const t0=typeof performance!=='undefined'?performance.now():0;
 const hs=humSpec(L),S=L.S,v=face>=2?'b':'f',f=v==='f'?1:-1,mir=face===1||face===3,k=humK(),K=k*HUM_A*hs.sc,A=hs.A,C=hs.C;
 let W=S.wd;if(W&&W.cls==='xbow'&&!/:L$/.test(W.id)&&((S.ld&&st!=='reload')||(st==='attack'&&fr===0))){try{W=usWdef(W.id+':L')}catch(e){}}
 const wi=humWInfo(W),cls=humWCls(wi.fam,W),P=humPose(cls,st,fr,{two:wi.two,fam:wi.fam});
 const SW=1100,SH=1250,OX=550,OY=980;let sc=HUM_SCR.c;if(!sc)sc=HUM_SCR.c=document.createElement('canvas');const cw=Math.ceil(SW*K),ch=Math.ceil(SH*K);if(sc.width<cw||sc.height<ch){sc.width=Math.max(sc.width,cw);sc.height=Math.max(sc.height,ch)}
 const g=sc.getContext('2d');g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.globalAlpha=1;g.clearRect(0,0,sc.width,sc.height);g.imageSmoothingEnabled=true;try{g.imageSmoothingQuality='high'}catch(e){}
 g.setTransform(K,0,0,K,OX*K,OY*K);humBBr();g.lineJoin='round';g.lineCap='round';
 const hk=HPA.k,pc=(kind,side,deco,dl,key)=>{const n=hs.pn(kind,v,side);return{n,R:humRig(n),c:humPiece(hs,n,hs.col[kind],deco,key||'',dl)}};
 const draw=(p,x,y,rot,sx,sy)=>{if(!p.c)return;g.save();g.translate(x,y);if(rot)g.rotate(rot);if(sx!=null)g.scale(sx,sy==null?1:sy);const R=p.R;g.drawImage(p.c,-R.px-1/hk,-R.py-1/hk,p.c.width/hk,p.c.height/hk);
  humBBbox(g,-R.px,-R.py,p.R.w-R.px,p.R.h-R.py);g.restore()};
 const lie=!!P.lie,kneel=!!P.kneel;
 if(lie){g.save();g.translate(f*170,-58);g.rotate(-f*Math.PI/2);Object.assign(P,{w:[4,88],o:[-4,88],lean:0,bob:0,lg:[4,0,-4,0]})}
 // ---- skeleton (screen space of the canonical view; feet at 0,0)
 const T=pc('torso',null,humTorsoDeco(hs,v,hs.pn('torso',v)),'c',mir&&HPA.p[hs.pn('torso',v)].L.g?'mb':''),LA=pc('leg','a',humLegDeco(hs),'p'),LB=pc('leg','b',humLegDeco(hs),'p');
 const legL=(LA.R.fy-LA.R.py)*hs.legk,hipY=-(legL+4)*(kneel?.5:1)+(P.bob>0?P.bob*.5:0),hx=24*hs.wid;
 const UB={x:0,y:hipY-14+P.bob},rot=f*P.lean*Math.PI/180;
 const up=(x,y)=>{const c=Math.cos(rot),s=Math.sin(rot);return{x:UB.x+x*c-y*s,y:UB.y+x*s+y*c}};   // upper-body frame -> screen
 const tR=T.R,tw=hs.wid,shA=up((tR.sa.x-tR.hx)*tw,tR.sa.y-tR.hy),shB=up((tR.sb.x-tR.hx)*tw,tR.sb.y-tR.hy),neck=up((tR.nx-tR.hx)*tw*.6,tR.ny-tR.hy+18);
 // handedness: the composition is mirrored for faces 1 and 3, so there the weapon goes in the other hand before the mirror and every figure
 // stays right-handed. The near arm is always piece 'a'; the character's right arm is the near one in faces 0 and 3, the far one in 1 and 2.
 const wSide=face===0||face===3?'a':'b',oSide=wSide==='a'?'b':'a',sW=wSide==='a'?shA:shB,sO=oSide==='a'?shA:shB,nearW=wSide==='a',sw0=wSide==='a'?-1:1,so0=-sw0,mf=mir?-1:1;
 const AW=pc('arm',wSide,humArmDeco(hs),'c'),AO=pc('arm',oSide,humArmDeco(hs),'c'),HW=pc('hand',wSide,null,'s'),HO=pc('hand',oSide,null,'s');
 const aim=(p,sh,tx,ty)=>{const R=p.R,dx=tx-sh.x,dy=ty-sh.y,d=Math.hypot(dx,dy)||1,s=Math.max(.72,Math.min(1.28,d/R.len)),th=Math.atan2(dy,dx),L2=R.len*s;return{th,s,wx:sh.x+Math.cos(th)*(L2+12),wy:sh.y+Math.sin(th)*(L2+12),sh}};
 const rest=(sh,o)=>({x:sh.x+f*o[0],y:sh.y+o[1]});
 let tw0=rest(sW,P.w);const armW=aim(AW,sW,tw0.x,tw0.y);
 const wa=P.wa*Math.PI/180,wdx=f*Math.cos(wa),wdy=Math.sin(wa);
 const grip=P.grip&&!P.drop&&cls!=='bow';let to0=rest(sO,P.o);
 if(grip){const d=(wi.h2||-3)*HUM_CELL*(cls==='gun'?.8:1);to0={x:armW.wx+wdx*d,y:armW.wy+wdy*d}}
 const armO=aim(AO,sO,to0.x,to0.y);
 const drawArm=(p,a)=>{if(!p.c)return;g.save();g.translate(a.sh.x,a.sh.y);g.rotate(a.th);g.scale(a.s,1);g.rotate(-p.R.ang);const R=p.R;g.drawImage(p.c,-R.px-1/hk,-R.py-1/hk,p.c.width/hk,p.c.height/hk);humBBbox(g,-R.px,-R.py,R.w-R.px,R.h-R.py);g.restore();
  if(A.paul||(S.av&&S.av.sode)){g.save();g.translate(a.sh.x,a.sh.y);g.rotate(a.th-Math.PI/2);const pc2=humLit(A.paul||USR.steel);if(S.av&&S.av.sode){const P2=humP(q=>humRR(q,-30,-6,60,58,6));humSh(g,P2,humLit(USR[(S.av.A||{}).paul]||USR.blk),{dk:.2});g.save();g.clip(P2);for(let y=8;y<56;y+=14)humLine(g,[-32,y,32,y],humLit(USR.red),4);g.restore()}
   else{const P2=humP(q=>{q.moveTo(-34,8);q.quadraticCurveTo(-36,-30,0,-30);q.quadraticCurveTo(36,-30,34,8);q.quadraticCurveTo(0,20,-34,8);q.closePath()});humSh(g,P2,pc2,{dk:.22});if(S.spike)humSh(g,humPoly([-8,-26,0,-56,8,-26]),humLit(S.spikeR||USR.steel))}humBBp(g,0,-30,40);g.restore()}};
 const drawHand=(p,a,r2)=>draw(p,a.wx,a.wy,a.th-Math.PI/2+(r2||0));
 const drawWeapon=()=>{if(P.drop||cls==='bow'||wi.fam==='fist')return;g.save();g.translate(armW.wx,armW.wy);g.scale(f,1);g.rotate(wa);humDrawW(g,wi,{loaded:S.ld!==0&&!(st==='attack'&&fr>=1),fire:cls==='gun'&&st==='attack'&&fr===1,crank:P.crank});g.restore();
  if(P.rod){g.save();g.translate(armO.wx,armO.wy);humInkLine(g,[0,-20,0,60],humLit(USR.steel),5);g.restore()}};
 const drawOW=()=>{if(!S.ow||P.drop||st==='cast')return;const oi=humWInfo(S.ow);g.save();g.translate(armO.wx,armO.wy);g.scale(f,1);g.rotate((P.wa-8)*Math.PI/180);humDrawW(g,oi,{});g.restore()};
 const drawBow=()=>{if(cls!=='bow'||P.drop)return;g.save();g.translate(armO.wx,armO.wy);g.scale(f,1);if(st!=='attack')g.rotate(-.12);humDrawBow(g,wi,!!P.bowD,!!P.arrow,(armW.wx-armO.wx)*f);g.restore()};
 const shieldAt=()=>({x:armO.wx+f*24+(back?Math.sign(sO.x)*22:0),y:armO.wy-18});   // from behind, the rim peeks out past the body
 const drawShield=front=>{if(!S.shield||P.drop)return;const c=shieldAt();g.save();g.translate(c.x,c.y);g.scale(f*mf*(front?1:.92),1.1);humDrawShield(g,S.shield,S.shR,front,!!S.shCrack);g.restore()};
 const head=pc('head',null,null,'s'),hR=head.R,skull={x:neck.x+(hR.cx-hR.px),y:neck.y+(hR.cy-hR.py)},R0=hR.r;
 const inHead=fn=>{g.save();g.translate(skull.x,skull.y);g.rotate(rot*.5);g.scale(f,1);try{fn()}catch(e){if(!HUM.err){HUM.err=1;console.error('human head gear',e)}}g.restore()};
 const back=v==='b';
 // stowed gear on the back (S.alt with a stow class), a slung shield, the quiver, a cape
 const drawBackGear=()=>{const bx=up(sw0*10,-70);
  if(S.cape){g.save();const c=humLit(S.cape),P2=humP(q=>{q.moveTo(shA.x-6,shA.y-8);q.lineTo(shB.x+6,shB.y-8);q.quadraticCurveTo(shB.x+30,-40,shB.x+26,-18);q.quadraticCurveTo(0,-6,shA.x-26,-18);q.quadraticCurveTo(shA.x-30,-40,shA.x-6,shA.y-8);q.closePath()});humSh(g,P2,c,{dk:.25});humBBp(g,0,-18,80);g.restore()}
  if(S.slung){g.save();g.translate(bx.x,bx.y);g.scale(.8,.8);humDrawShield(g,S.slung,S.shR,back,0);g.restore()}
  if(S.alt&&(S.altCls==='back'||S.altCls==='bow')){const oi=humWInfo(S.alt);g.save();g.translate(bx.x,bx.y+30);if(oi.fam==='bow'){g.rotate(-sw0*.45);g.scale(sw0*.9,.9)}else g.rotate(sw0*.7-Math.PI/2);if(oi.fam==='bow')humDrawBow(g,oi,0,0,null);else{g.translate(-oi.len*.35,0);humDrawW(g,oi,{})}g.restore()}
  if(S.back&&/usSashi/.test(String(S.back))){const big=/1\)$/.test(String(S.back).trim())||/,1\)/.test(String(S.back)),q=up(sw0*30,-60),fl=/R\.blk/.test(String(S.back))?'#2a2a34':'#efe9da';g.save();g.translate(q.x,q.y);humInkLine(g,[0,40,0,-300],humLit(USR.dwood),7);
   const F=humP(p=>{p.moveTo(0,-290);p.lineTo(sw0*62,-290);p.lineTo(sw0*62,-150);p.lineTo(0,-150);p.closePath()});humSh(g,F,fl,{dk:.12});g.fillStyle=fl==='#2a2a34'?humHex('c'):humHex('g');g.beginPath();g.arc(sw0*31,-220,15,0,7);g.fill();humBBp(g,sw0*62,-300,8);humBBp(g,0,40,8);g.restore()}
  if(S.quiver){const q=up(sw0*34,-120);g.save();g.translate(q.x,q.y);g.rotate(-sw0*.45);humSh(g,humP(p=>humRR(p,-16,-20,32,96,10)),humLit(USR.leather),{dk:.25});for(let i=0;i<3;i++){humSh(g,humPoly([-12+i*10,-20,-6+i*10,-46,0+i*10,-20]),'#e8e2d4',{lw:4})}humBBp(g,0,-46,30);humBBp(g,0,80,30);g.restore()}};
 const drawHip=()=>{if(!S.alt||S.altCls==='back'||S.altCls==='bow'||!S.altCls)return;const oi=humWInfo(S.alt),p=up(so0*24,-18);g.save();g.translate(p.x,p.y);g.rotate(so0*.35+Math.PI/2);g.scale(.85,.85);humDrawW(g,oi,{});g.restore()};
 const drawLegs=()=>{const lg=P.lg;for(const [p,side,ix] of[[LB,'b',2],[LA,'a',0]]){const x=(side==='a'?-hx:hx),r=-f*lg[ix]*Math.PI/180,lift=lg[ix+1]||0;
   if(kneel){draw(p,x+f*(side==='a'?24:-10),hipY+6,-f*(side==='a'?.9:.15),1,side==='a'?.55:.7)}else draw(p,x,hipY+6-lift,r,1,hs.legk)}};
 const drawSkirt=()=>{const n=A.skirt;if(!n||n===1)return;const c=n<0?C.body:humLit(A.skB||A.body),y0=UB.y-6,ln=n<0?(-y0-(kneel?6:24)):n===2?36:56,w=60*hs.wid;
  const P2=humP(p=>{p.moveTo(-w,y0);p.lineTo(w,y0);p.lineTo(w+(n<0?14:6),y0+ln);p.quadraticCurveTo(0,y0+ln+8,-w-(n<0?14:6),y0+ln);p.closePath()});humSh(g,P2,c,{dk:.2});humBBbox(g,-w-14,y0,w+14,y0+ln+8);
  if(S.armor==='mail'||n===3&&S.armor!=='brig'&&S.armor!=='lamellar')humMailTex(g,P2,-w-14,y0,w+14,y0+ln+8,c);if(S.armor==='lamellar'){g.save();g.clip(P2);for(let y=y0+12;y<y0+ln;y+=14)humLine(g,[-w-10,y,w+10,y],humLit(USR.red),4);g.restore()}
  if(n<0){humLine(g,[f*14,y0+4,f*18,y0+ln],humLit(S.trim||USR.brass),7)}};
 const drawCoat=()=>{if(!S.coat)return;const F=humLit(S.coat.F),K=humLit(S.coat.K),cut=S.coat.cut,long=cut==='surcoat'||cut==='herald'||cut==='jinbaori',bot=long?66:cut==='quilted'?44:28,w=(cut==='tabard'||cut==='mantle'?36:44)*tw;
  g.save();g.translate(UB.x,UB.y);g.rotate(rot);const top=tR.top-tR.hy+22,P2=humP(p=>{p.moveTo(-w,top);p.lineTo(w,top);p.lineTo(w+8,bot);if(long&&!back){p.lineTo(f*6+5,bot);p.lineTo(f*6,bot-30);p.lineTo(f*6-5,bot)}p.lineTo(-w-8,bot);p.closePath()});
  humSh(g,P2,F,{dk:.18});if(cut==='herald'){g.save();g.clip(P2);g.strokeStyle=K;g.lineWidth=10;g.stroke(P2);g.restore();g.lineWidth=HUM_LW;g.strokeStyle=HUM_INK;g.stroke(P2)}
  humBBbox(g,-w-8,top,w+8,bot);humInkLine(g,[-w+4,-4,w-4,-4],C.belt,8);if(!back||cut==='jinbaori'){const es=Math.min(2*w*.8,50);g.save();g.translate(f*4,top+(-4-top)*.5);g.scale(mf,1);humEmblem(g,S.coat.em,0,0,es,K);g.restore()}g.restore();
  if(cut==='mantle'){const m=humP(p=>{p.moveTo(shA.x-12,shA.y+6);p.quadraticCurveTo(neck.x,neck.y-36,shB.x+12,shB.y+6);p.quadraticCurveTo(neck.x,neck.y+26,shA.x-12,shA.y+6);p.closePath()});humSh(g,m,K)}};
 const drawTorso=()=>{draw(T,UB.x,UB.y,rot,tw,1);drawCoat();if(S.av&&S.av.mantle){const c=humLit(S.armor==='robe'?(S.accR||usCloth('purple')):USR.fur),m=humP(p=>{p.moveTo(shA.x-14,shA.y+4);p.quadraticCurveTo(neck.x,neck.y-40,shB.x+14,shB.y+4);p.quadraticCurveTo(neck.x,neck.y+20,shA.x-14,shA.y+4);p.closePath()});humSh(g,m,c)}};
 const drawHead=()=>{inHead(()=>{humHair(g,S,R0,back,'behind');humHat(g,S,R0,back,'behind');if(back&&!/^(great|barbute|tuskbarbute|armet|bascinet|voidhelm|wyvcrest|coif|hood|cowl)$/.test(S.hat||''))humHair(g,S,R0,back,'over')});draw(head,neck.x,neck.y,rot*.5);
  inHead(()=>{const hat=S.hat;const covers=/^(great|barbute|tuskbarbute|armet|bascinet|voidhelm|wyvcrest|sallet|coif|hood|cowl|murm|galea|thraex)$/.test(hat||'');
   if(!back&&!covers){if(S.patch){const ex=mir?.1:.8,ey=mir?.44:.28;humLine(g,[-R0*.7,-R0*.3,R0*1.0,R0*(ey-.25)],HUM_INK,4);humSh(g,humEll(R0*ex,R0*ey,R0*.17,R0*.15),HUM_INK,{flat:1,lw:0})}
    if(S.paint){humLine(g,[R0*.0,R0*.55,R0*.95,R0*.48],humHex(S.paint),6)}if(S.stubble){g.fillStyle='rgba(30,25,20,.22)';g.beginPath();g.ellipse(R0*.45,R0*.75,R0*.5,R0*.22,0,0,7);g.fill()}
    if(S.tusk&&!hs.orc){for(const x of[R0*.35,R0*.85])humSh(g,humPoly([x-6,R0*.72,x,R0*.5,x+6,R0*.72]),'#efe7cf',{lw:4})}}
   if(!covers&&!/^(kabuto|menpo|kawari|lgoni|jingasa)$/.test(hat||''))humHair(g,S,R0,back,'cap');else if(/^(kabuto|menpo|kawari|jingasa|lgoni)$/.test(hat||'')&&S.hair==='topknot')humHair(g,S,R0,back,'cap');
   if(!back&&!covers)humBeard(g,S,R0,hs.dw);
   if(S.mask&&!back){humSh(g,humP(p=>{p.moveTo(-R0*.2,R0*.42);p.lineTo(R0*1.08,R0*.28);p.quadraticCurveTo(R0*1.05,R0*.95,R0*.45,R0*1.0);p.quadraticCurveTo(-R0*.1,R0*.9,-R0*.2,R0*.42);p.closePath()}),humLit(S.hatR||usCloth('night')))}
   humHat(g,S,R0,back,'over')})};
 const drawSpark=()=>{if(!P.spark)return;const col=HUM_SPK[S.spark||S.res]||'#ffe27a';let x,y;if(cls==='staff'){x=armW.wx+wdx*(Math.max(wi.len,170)+20);y=armW.wy+wdy*(Math.max(wi.len,170)+20)}else if(P.spark===3){x=skull.x;y=skull.y-R0-50}else{x=(armW.wx+armO.wx)/2+f*30;y=(armW.wy+armO.wy)/2}
  const r=P.spark===3?30:P.spark===2?22:14;g.save();g.translate(x,y);g.fillStyle=col;g.globalAlpha=.35;g.beginPath();g.arc(0,0,r*1.6,0,7);g.fill();g.globalAlpha=1;const st4=humP(p=>{for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i&1?r*.4:r;i?p.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):p.moveTo(rr,0)}p.closePath()});humSh(g,st4,humLt(col,.3),{lw:5,flat:1});humBBp(g,0,0,r*1.6);g.restore()};
 // ---- layers (weapon arm near: faces 0 and 3; far: faces 1 and 2 before the mirror)
 const offHand=()=>{if(S.shield){drawHand(HO,armO);drawShield(true)}else if(cls==='bow'){drawBow();drawHand(HO,armO)}else{if(!grip)drawOW();if(!grip)drawHand(HO,armO)}};
 const wSet=()=>{drawArm(AW,armW);drawWeapon();drawHand(HW,armW)};
 if(!back){drawBackGear();inHead(()=>humHair(g,S,R0,false,'behind'));
  if(nearW){drawArm(AO,armO);if(!grip&&cls!=='bow'&&!S.shield){drawOW();drawHand(HO,armO)}}else wSet();
  drawLegs();drawSkirt();drawTorso();drawHip();drawHead();
  if(nearW){if(S.shield)drawHand(HO,armO);drawShield(true);if(cls==='bow'){drawBow();drawHand(HO,armO)}wSet()}else{drawArm(AO,armO);offHand()}
  if(grip)drawHand(HO,armO);drawSpark()}
 else{drawShield(false);
  if(nearW){drawArm(AO,armO);if(cls==='bow')drawBow();if(!grip&&cls!=='bow')drawOW();drawHand(HO,armO)}else wSet();
  drawLegs();drawSkirt();drawTorso();drawBackGear();drawHip();drawHead();
  if(nearW){wSet();if(grip)drawHand(HO,armO)}else{if(cls==='bow')drawBow();drawArm(AO,armO);if(!grip&&cls!=='bow')drawOW();drawHand(HO,armO)}drawSpark()}
 if(lie){g.restore();if(W&&(W.c&&W.c.length||cls==='bow')){g.save();g.translate(-f*30,-8);g.scale(f,1);if(cls==='bow'){g.rotate(Math.PI/2);humDrawBow(g,wi,0,0,null)}else{g.translate(-wi.len*.4,0);humDrawW(g,wi,{})}g.restore()}}
 else if(P.drop&&W&&(W.c&&W.c.length||cls==='bow')){g.save();g.translate(f*70,-8);g.scale(f,1);if(cls==='bow'){g.rotate(Math.PI/2);humDrawBow(g,wi,0,0,null)}else{g.translate(-wi.back,0);humDrawW(g,wi,{})}g.restore()}
 // ---- crop to the figure, mirror for faces 1 and 3
 g.setTransform(1,0,0,1,0,0);const x0=Math.max(0,Math.floor(HUM_BB[0])),y0=Math.max(0,Math.floor(HUM_BB[1])),x1=Math.min(sc.width,Math.ceil(HUM_BB[2])),y1=Math.min(sc.height,Math.ceil(HUM_BB[3]));
 if(!(x1>x0&&y1>y0))return null;const w=x1-x0,h=y1-y0,cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.hdk=k;const q=cv.getContext('2d');
 if(mir){q.translate(w,0);q.scale(-1,1)}q.drawImage(sc,x0,y0,w,h,0,0,w,h);
 const fx=OX*K-x0,ax=(mir?w-fx:fx)/k,ay=(OY*K-y0)/k;HUM.builds++;HUM.bytes+=w*h*4;if(t0)HUM.ms+=performance.now()-t0;
 return{cv,ax,ay,k,smooth:true,hk:k,hum:1,hand:{w:wSide,o:oSide,right:face===0||face===3?'a':'b',shield:S.shield&&!P.drop?oSide:null},r:typeof ARTHD==='object'?ARTHD.rev:0}}
/* frame memory: the frames of every look share one budget; the oldest built are dropped (rebuilt on demand) */
function humKeep(L,i,o){if(!o||!o.hum||!o.cv)return o;const b=o.cv.width*o.cv.height*4;HUM.fifo.push([L,i,o,b]);HUM.live=(HUM.live||0)+b;
 while(HUM.live>HUM.cap&&HUM.fifo.length>1){const e=HUM.fifo.shift();HUM.live-=e[3];if(e[0].fr[e[1]]===e[2])e[0].fr[e[1]]=null}return o}
/* the height of the figure's head top above the feet (art px), for the bars and statuses: unitSpriteBox */
function humBoxH(L){const hs=humSpec(L);return Math.round(30*hs.sc)}
