/* ================= PART SHEETS 2: THE BATTLE FIGURES BUILT FROM THE USER'S MODULAR PARTS (Detail High) =================
   The parts (assets/parts2/*, cut into P2A by assets/make-parts2-atlas.py) replace the earlier parts sheet on the skeleton of 73m-skel.js:
   one human head per expression, the two hands, five leg colours, 30 hair styles, 40 helmets and 51 armours (torso + its shoulder caps).
   Paper cut-out facing: there is only front art (three-quarter, facing bottom-right), used for all four faces and mirrored for the ones that
   look left (1 bottom-left, 2 top-left). The weapon hand stays the character's right after the mirror (73m-skel.js composes those faces
   with the hands swapped), so swords and shields keep their sides.
   Tables below, easy to edit: P2_ARMOR (the 51 sets, with the leg colour each wears), P2_ARMOR_OF (game armour look / item -> set),
   P2_HELM (the 40 helmets) and P2_HELM_OF (helmet shape -> helmet), P2_HAIR / P2_HAIR_OF (hair styles), HEAD_RULES (expressions).
   No hair under any helmet. Skin and hair are recoloured per merc (the sheet's skin / hair layers are grey shade, multiplied). Elves get a
   pointed ear, half-orcs green-grey skin, a pointed ear and tusks, dwarves their braided beard (vector overlays in the sheet's style).
   The separate eye overlay (73o-eyes.js) is off for these heads (P2.eyes false); its code and data stay for later eye parts. No rnd(). */
const P2={on:true,img:[],ok:0,eyes:false,sc:.88,k:0,neck:.36,earX:0,earY:0,handA:[-.08,-.05]};
// a helmet's body top (fraction of the piece height) where a crest, plume, feather, wings or antlers stand above it: it is sized and placed by its body
// per-helmet fit after that: [scale, dx, dy] (dx, dy in head radii; up is negative)
const P2_HADJ={29:[1.06,-.07,-.04],3:[1.09,0,.1],25:[1.09,0,.1],26:[1.09,0,.1],33:[1.22,-.06,.26],4:[1.08,-.02,.1],5:[1.14,-.05,.16],24:[1,0,.12],30:[1.12,-.04,.04],31:[1.08,-.06,-.04],22:[1.04,0,-.06],23:[1.04,0,-.06]};
// crested / winged / crowned helmets are fitted by their steel bowl alone (P2A anchors mtop: the bowl's top), the crest rises above it
const P2_BOWL={13:1,14:1,15:1,28:1,29:1};
const P2_HTOP={4:.3,5:.16,24:.38,30:.34,32:.3};
// the five leg colours (legs.png): tan, blue, green, rust, grey
const P2_LEGS=['tan','blue','green','rust','grey'];
// the 51 armours, sheet order (armor.webp: torso rows A-F, each followed by its shoulder row); [name, leg colour]
const P2_ARMOR=[
 ['plate','blue'],['plate fluted','grey'],['plate gilded white','tan'],['plate blackened','grey'],['plate gold','tan'],['plate riveted','grey'],['plate, blue fleur-de-lis surcoat','blue'],['plate, white crusader cross','grey'],['plate ornate silver','grey'],['red samurai plate','rust'],
 ['tunic tan','tan'],['tunic blue','blue'],['tunic green','green'],['tunic rust','rust'],['tunic grey','grey'],['fur-collared leather','rust'],['white and gold','tan'],
 ['red and gold jacket','rust'],['green ranger','green'],['navy officer','blue'],['fur coat','rust'],['purple mage, gem','grey'],['teal eastern robe','green'],['steel and gold','grey'],['brown leather, pouches','rust'],['white star tabard','blue'],['black, red and gold','grey'],
 ['rags','tan'],['torn leather','rust'],['quilted gambeson','tan'],['red studded','rust'],['mail','blue'],['brigandine','rust'],['scale','grey'],['lamellar','grey'],['red lamellar','rust'],['blue robe','blue'],
 ['monk robe','tan'],['purple mage robe','grey'],['blue cross tabard','blue'],['dark red cloak','rust'],['green ranger, baldric','green'],['brown jerkin','rust'],['quilted, laced','tan'],['dark leather','grey'],['blue patterned robe','blue'],['red and gold vestment','rust'],
 ['black, crescent','grey'],['white and blue wrap','blue'],['green leaf robe','green'],['dark rogue','grey']];
const P2A_IDX=n=>{for(let i=0;i<P2_ARMOR.length;i++)if(P2_ARMOR[i][0]===n)return i;return 0};
// game armour (item id, its look, or the figure's armour kind) -> armour set
const P2_ARMOR_OF={
 rags:'rags',robe:'monk robe',padded:'quilted gambeson',jack:'quilted, laced',leather:'brown leather, pouches',hide:'fur-collared leather',studded:'red studded',brigandine:'brigandine',
 mail:'mail',scale:'scale',lamellar:'lamellar',plate:'plate',gothic:'plate fluted',coatplates:'plate riveted',sigilrobe:'blue patterned robe',archrobe:'purple mage robe',mailrobe:'blue robe',
 manica:'torn leather',harness:'steel and gold',champharness:'plate gilded white',serpjerkin:'green ranger',owlcoat:'fur coat',barkrobe:'green leaf robe',ogreharness:'black, red and gold',wyvcuirass:'plate blackened',
 kesa:'red and gold vestment',tatami:'lamellar',do:'lamellar',domaru:'red lamellar',oyoroi:'red samurai plate',
 'fb:palecloak':'white and blue wrap','fb:wolfpelt':'fur coat','fb:shroud':'dark rogue','fb:cranedo':'white and gold','fb:demonarmor':'black, red and gold','fb:lotusrobe':'teal eastern robe',
 'fb:riftmail':'black, crescent','fb:bearhide':'fur-collared leather','fb:snowdo':'white and blue wrap',
 'lg:aegisplate':'plate gold','lg:shadowweave':'dark rogue','lg:pilgrimmantle':'dark red cloak','lg:thousandbattles':'plate ornate silver',
 // the figure's armour kinds (enemies, unknown items)
 k_rags:'rags',k_padded:'quilted gambeson',k_leather:'dark leather',k_mail:'mail',k_scale:'scale',k_plate:'plate',k_brig:'brigandine',k_lamellar:'lamellar',k_coat:'plate riveted',
 k_fur:'fur coat',k_bare:'torn leather',k_void:'black, crescent',k_robe:'monk robe'};
// robes by their colour, an unarmoured figure's tunic by its cloth
const P2_ROBE={purple:'purple mage robe',blue:'blue robe',white:'monk robe',red:'dark red cloak',black:'dark rogue',green:'green leaf robe'};
const P2_TUNIC=[['tunic tan','#c9b48e'],['tunic blue','#55739c'],['tunic green','#6f7d44'],['tunic rust','#a65a37'],['tunic grey','#686868']];
// the 40 helmets (helmets.webp, rows of 10)
const P2_HELM=['leather cap','arming cap','red bandana','green hood','feathered hat','blue beret','skull cap','skull cap, ridge','skull cap, banded','conical helm',
 'nasal helm','nasal helm, riveted','nasal helm, cheeks','crested galea','winged helm','gold-crested helm','armet','sallet','bascinet','gold-visored helm',
 'great helm','gilded great helm','wolf pelt','bear pelt','stag skull','purple mage hood','circlet hood','laurel helm','winged gold helm','crowned helm',
 'kabuto','lamellar cap','horned helm','straw kasa','ninja mask','turban, gem','wrapped cloth','aviator cap','visor helm A','visor helm B'];
const P2H=n=>{const i=P2_HELM.indexOf(n);return i<0?0:i};
// the figure's hat shape (73-units.js usHelmHat / the looks' hats) -> helmet; '*' a famed variant
const P2_HELM_OF={cap:'leather cap',armcap:'arming cap',hood:'green hood',cowl:'green hood',coif:'skull cap',skullcap:'skull cap',kettle:'skull cap, banded',spangen:'conical helm',
 nasal:'nasal helm',barbute:'nasal helm, cheeks',sallet:'sallet',bascinet:'bascinet',armet:'armet',great:'great helm','great*':'gilded great helm',galea:'crested galea',thraex:'gold-crested helm',murm:'gold-visored helm',
 jingasa:'lamellar cap',hachigane:'red bandana',kabuto:'kabuto',menpo:'kabuto',kawari:'kabuto',lgoni:'kabuto',lgcrown:'crowned helm',crown:'crowned helm',circlet:'circlet hood',
 ogreskull:'stag skull',tuskbarbute:'horned helm',wyvcrest:'winged gold helm',hornhelm:'horned helm',horns:'horned helm',voidhelm:'visor helm A',
 feather:'feathered hat',feathercap:'feathered hat',wide:'feathered hat',capotain:'feathered hat',straw:'straw kasa',band:'red bandana',bandana:'red bandana',furcap:'wolf pelt',
 scholar:'purple mage hood',miner:'aviator cap',wrap:'wrapped cloth',mask:'ninja mask'};
// the 30 hair styles (hair.webp: rows of 8, 8, 8, 6)
const P2_HAIR=['short, side part','spiky','spiky, swept up','undercut','swept back','shaggy','bowl','short topknot',
 'bob','tousled','long straight','long','ponytail','bun','braid','twin tails',
 'short, side part 2','spiky 2','undercut 2','messy','curly','swept, grey','shaggy 2','top bun',
 'bob 2','long 2','long wavy','long side-swept','high ponytail','twin buns'];
// the look's hair style (ptMercSpec) -> hair part, for men / women
const P2_HAIR_OF={m:{crop:'short, side part',short:'short, side part 2',shaggy:'shaggy',mohawk:'undercut',tail:'short topknot',bun:'top bun',braids:'braid',long:'long straight',curly:'curly',
  mane:'shaggy 2',bowl:'bowl',swept:'swept back',tonsure:'bowl',topknot:'short topknot',wisps:'swept, grey',spiky:'spiky'},
 w:{long:'long',short:'bob',bun:'bun',braids:'braid',tail:'ponytail',bowl:'bob 2',swept:'long side-swept',curly:'long wavy',mane:'twin tails',crop:'tousled',shaggy:'messy',mohawk:'undercut 2',topknot:'high ponytail',wisps:'long 2'}};
// expressions: the eight heads (heads.webp)
const P2_FACE=['neutral','gritted','shouting','happy','content','surprised','nervous','knocked out'];
// per-hair tweak after the ear-hole alignment: [dx, dy (head radii), scale]
const P2_EHAIRADJ={2:[-.23,-.75,1],11:[-.24,-.74,1],13:[-.02,-.12,1.16]};   // elf styles whose ear tip the build misreads (blond hair), or drawn narrower (the braid)
const P2_HAIRADJ={11:[0,1.5,1],15:[0,1.27,1],26:[0,1.1,1]};   // [dx, dy (head radii), scale]: styles whose ear notch the build reads too high (long hair covering the ear)   // [dx, dy (head radii), scale]: hairs whose ear notch is hidden by a strand or merged into the face opening
const HEAD_HOLD=380;
/* HEAD_RULES: [name, test(c) -> expression | null], first match wins; c as eyePick's (73o-eyes.js) plus heal (ms since healed) */
const HEAD_RULES=[
 ['dead',c=>c.st==='death'?(c.t<.18?'surprised':'knocked out'):null],
 ['hit',c=>c.st==='hit'?'surprised':null],
 ['stunned',c=>c.sts.stun||c.sts.daze?'knocked out':null],
 ['fleeing',c=>c.an==='flee'||c.mor<=1?'nervous':null],
 ['cast',c=>c.st==='cast'?'shouting':null],
 ['big attack',c=>c.st==='attack'&&(c.cls==='two'||c.buffs.rallied||c.sts.fury||c.sts.enrage||c.sts.warcry)?(c.t<.3?'gritted':'shouting'):null],
 ['attack',c=>c.st==='attack'?(c.cls==='bow'||c.cls==='gun'?(c.t<.36?'gritted':'neutral'):'gritted'):null],
 ['battle cry',c=>c.buffs.rallied||c.sts.warcry||c.sts.taunted||c.buffs.shieldwall?'shouting':null],
 ['won',c=>c.won?'happy':null],
 ['kill',c=>c.kill<1600?'happy':null],
 ['wavering',c=>c.mor===2?'nervous':null],
 ['healed',c=>c.heal<1500?'content':null],
 ['confident',c=>c.mor>=4&&c.st==='idle'?'content':null],
 ['rest',()=>'neutral']];

function p2Img(i){const I=P2.img[i];if(I)return I.complete&&I.naturalWidth?I:null;if(typeof Image==='undefined'||typeof P2A!=='object'||!P2A.src[i])return null;const J=new Image();J.decoding='async';J.src=P2A.src[i];P2.img[i]=J;return J.complete&&J.naturalWidth?J:null}
function p2Ready(){if(typeof P2A!=='object')return false;let ok=true;for(let i=0;i<P2A.src.length;i++)if(!p2Img(i))ok=false;return ok}
function p2On(){return P2.on&&typeof P2A==='object'&&p2Ready()}
const P2_PC=new Map();   // tinted piece canvases, by piece + colour
// a piece canvas at atlas resolution (P2A.k px per SU), its own colours; skin (s) / hair (h) multiplied by col; pk = canvas px per SU
function p2Piece(n,skin,hair){const id=n+'|'+(skin||'')+'|'+(hair||'');let c=P2_PC.get(id);if(c)return c;const P=P2A.p[n];if(!P)return null;const k=P2A.k,W=Math.ceil(P.w*k)+2,H=Math.ceil(P.h*k)+2;
 c=document.createElement('canvas');c.width=W;c.height=H;c.pk=k;const g=c.getContext('2d');
 const lay=(m,col)=>{const l=P.L[m];if(!l)return;const I=p2Img(l[0]);if(!I)return;if(!col){g.drawImage(I,l[1],l[2],l[3],l[4],1+l[5]*k,1+l[6]*k,l[7]*k,l[8]*k);return}
  const t=humTmp(l[3],l[4]),q=t.getContext('2d');q.drawImage(I,l[1],l[2],l[3],l[4],0,0,l[3],l[4]);q.globalCompositeOperation='multiply';q.fillStyle=col;q.fillRect(0,0,l[3],l[4]);q.globalCompositeOperation='destination-in';q.drawImage(I,l[1],l[2],l[3],l[4],0,0,l[3],l[4]);
  g.drawImage(t,0,0,l[3],l[4],1+l[5]*k,1+l[6]*k,l[7]*k,l[8]*k)};
 lay('c');if(skin)lay('s',skin);if(P.L.h)lay('h',hair||'#6b4a2b');
 P2_PC.set(id,c);return c}
// a piece's rig record (SU, origin at the pivot): what 73m-skel.js reads (px, py, wx, wy, len, ang, fy, ...)
function p2Rig(n,px,py,extra){const P=P2A.p[n];const R=Object.assign({w:P.w,h:P.h,px,py},extra||{});if(R.wx!=null){R.len=Math.hypot(R.wx-R.px,R.wy-R.py);R.ang=Math.atan2(R.wy-R.py,R.wx-R.px)}return R}
/* ---- choosing the parts of a look ---- */
function p2Hex(c){return(String(c).match(/[0-9a-f]{2}/gi)||['80','80','80']).map(h=>parseInt(h,16))}
function p2Near(col,list){const a=p2Hex(col);let best=0,bd=1e9;list.forEach((q,i)=>{const b=p2Hex(q[1]);const d=(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;if(d<bd){bd=d;best=i}});return best}
function p2AvKey(av){if(!av||typeof US_AV!=='object')return null;for(const k in US_AV)if(US_AV[k]===av)return k;return null}
function p2Armor(L){const S=L.S,hs=humSpec(L);let n=null;const id=S.armId;
 if(id){n=P2_ARMOR_OF[id]||null;if(!n&&typeof usFamedBase==='function'&&usFamedBase(id))n=P2_ARMOR_OF[usFamedBase(id)]||null;if(!n&&typeof usLookOf==='function')n=P2_ARMOR_OF[usLookOf(id)]||null}
 if(!n&&L.key[0]==='m'&&!id){const t=P2_TUNIC[p2Near(hs.C.body,P2_TUNIC)];n=t[0]}   // no armour: the plain tunic in the look's cloth colour
 if(!n){const k=p2AvKey(S.av);if(k)n=P2_ARMOR_OF[k]||null}
 if(!n&&S.armor==='robe'){const c=S.robeC||'';n=P2_ROBE[c]||null}
 if(!n)n=P2_ARMOR_OF['k_'+S.armor]||'rags';
 if(S.coat){const F=humLit(S.coat.F),plate=/plate/.test(n),fc=p2Hex(F),blue=fc[2]>fc[0]+20,red=fc[0]>fc[2]+40&&fc[0]>fc[1]+20,light=fc[0]+fc[1]+fc[2]>500;   // a surcoat / house coat: the tabards
  n=plate?(blue?'plate, blue fleur-de-lis surcoat':'plate, white crusader cross'):blue?'blue cross tabard':red?'dark red cloak':light?'white star tabard':'blue cross tabard'}
 return P2A_IDX(n)}
function p2Helm(S){const t=S.hat;if(!t)return-1;const fam=S.helmId&&typeof usFamedBase==='function'&&usFamedBase(S.helmId);const n=(fam&&P2_HELM_OF[t+'*'])||P2_HELM_OF[t];
 if(t==='hood'&&S.hatR&&/[DC]/.test(S.hatR.t||''))return P2H('purple mage hood');return n?P2H(n):P2H('leather cap')}
// elves wear only the elf styles (elf-hair.webp: row 1 men 0-7, row 2 women 8-15)
const P2_EHAIR=['elf short, side part','elf spiky','elf spiky swept','elf undercut','elf swept back','elf long low ponytail','elf top knot','elf shaggy',
 'elf bob, bangs','elf long straight','elf long wavy','elf side ponytail','elf twin buns','elf braid','elf twin tails','elf high bun, long'];
const P2_EHAIR_OF={m:{crop:0,short:0,swept:4,shaggy:7,mane:7,mohawk:3,tail:5,long:5,topknot:6,bun:6,braids:5,curly:1,bowl:0,tonsure:0,wisps:4,spiky:1},
 w:{short:8,bowl:8,long:9,swept:9,curly:10,mane:10,tail:11,bun:15,topknot:15,braids:13,crop:8,shaggy:10,mohawk:11,wisps:14}};
function p2EHair(S,fem){const st=S.hair;if(!st||st==='bald')return-1;const i=P2_EHAIR_OF[fem?'w':'m'][st];return i!=null?i:fem?9:0}
function p2Hair(S,fem){const st=S.hair;if(!st||st==='bald')return-1;const n=(P2_HAIR_OF[fem?'w':'m'][st])||(fem?'long':'short, side part');return P2_HAIR.indexOf(n)}

/* ---- the asset record of a look x face (same fields as humSkAssets, from these parts) ---- */
function p2Assets(L,face,k){const hs=humSpec(L),S=L.S,mir=face===1||face===2,f=1,K=k*HUM_A*hs.sc*P2.sc*(hs.race==='dwarf'?.96:1),mf=mir?-1:1;
 const ai=p2Armor(L),leg=P2_LEGS.indexOf(P2_ARMOR[ai][1]),skin=hs.orc?humLit(hs.S.skin):hs.C.skin,fem=!!hs.fem;
 const tone=hs.race==='human'&&!hs.orc&&/^s/.test((S.skin&&S.skin.t)||'')?null:skin;   // the sheet's own skin is a fair human's
 const tn='torso'+ai,TP=P2A.p[tn].a,T={n:tn,R:p2Rig(tn,TP.hx,TP.hy),c:p2Piece(tn,tone)};
 const ln=s=>'leg'+leg+'_'+s,LPa=P2A.p[ln('a')].a,LPb=P2A.p[ln('b')].a;
 const LA={n:ln('a'),R:p2Rig(ln('a'),LPa.px,LPa.py,{fy:LPa.fy}),c:p2Piece(ln('a'))},LB={n:ln('b'),R:p2Rig(ln('b'),LPb.px,LPb.py,{fy:LPb.fy}),c:p2Piece(ln('b'))};
 const wSide=face===0||face===3?'a':'b',oSide=wSide==='a'?'b':'a',sw0=wSide==='a'?-1:1,so0=-sw0;
 const arm=s=>{const n='sh'+ai+'_'+s,a=P2A.p[n].a;return{n,R:p2Rig(n,a.px,a.py,{wx:a.wx,wy:a.wy}),c:p2Piece(n)}};
 const hand=n=>{   // hand_a the character's right (the near arm, image left in face 0), hand_b the left (far arm); a hand stays on its own arm
 const a=P2A.p[n].a;return{n,R:p2Rig(n,a.px,a.py),c:p2Piece(n,tone)}};
 const legk=hs.race==='dwarf'?.62:1,legL=(LA.R.fy-LA.R.py)*legk,legY=-24*legk,hipY0=-(legL+legY),hx=P2A.p[ln('a')].w*.36;
 const loc=(x,y)=>({x,y}),shA=loc(TP.sax-16-TP.hx,TP.sy+4-TP.hy),shB=loc(TP.sbx+16-TP.hx,TP.sy+4-TP.hy),neck=loc(TP.nx-TP.hx+4,-TP.hy+P2A.p.torso10.h*P2.neck);   // the chin sits in the collar: the head overlaps the torso's top by P2.neck of a tunic's height (same for every torso)   // the sleeves sit at the torso's upper corners, half outside it
 const hf=hs.el?(fem?'elff':'elfm'):fem?'headf':'head',HP=P2A.p[hf+'0'].a,hR=p2Rig(hf+'0',HP.nx,HP.ny,{cx:HP.cx,cy:HP.cy,r:HP.r}),skull=loc(HP.cx-HP.nx,HP.cy-HP.ny);
 return{p2:1,hs,S,v:'f',f,mir,K,back:false,mf,face,T,LA,LB,tR:T.R,tw:1,legL,legY,legk,hx,hipY0,UBy0:hipY0-14,shA,shB,neck,wSide,oSide,sw0,so0,
  head:{n:'head0',R:hR,c:null},hR,R0:hR.r,skull,AW:arm(wSide),AO:arm(oSide),HW:hand(wSide==='a'?'hand_a':'hand_b'),HO:hand(oSide==='a'?'hand_a':'hand_b'),bk:new Map(),armor:ai,leg,tone,
  hf,helm:p2Helm(S),hair:hs.el?p2EHair(S,fem):p2Hair(S,fem),ehair:!!hs.el,hairC:humMix(humRC(S.hairR||usHairR(['i','H','k'])),humRC(S.hairR||usHairR(['i','H','k']),1),.25)}}
/* the head attachment for an expression: head piece, hair (none under a helmet), helmet, race cues */
function p2HeadAtt(A,ex){const S=A.S,hs=A.hs,R0=A.R0,sk=A.skull;
 return hskAtt(A,'p2head:'+ex,[-480,-640,480,420],g=>{const n=(A.hf||'head')+ex,c=p2Piece(n,A.tone),R=A.hR,pk=P2A.k;
  const top=sk.y-A.hR.h*.5;   // the head's top (SU, from the neck point)
  const put=(pn,canvas,s,dx,dy)=>{if(!canvas)return;g.drawImage(canvas,dx-1/pk*s,dy-1/pk*s,canvas.width/pk*s,canvas.height/pk*s)};
  // hair behind the head (long styles hang behind the neck): the whole hair piece first, the head over it, then the hair again clipped to above the eyes
  const hp=A.helm<0&&A.hair>=0?(A.ehair?'ehair':'hair')+A.hair:null,HPc=hp?(A.ehair?p2Piece(hp,A.tone||'#ffffff',A.hairC):p2Piece(hp,null,A.hairC)):null,Ha=hp?P2A.p[hp].a:null,HA=P2A.p[n].a,ha=(A.ehair?P2_EHAIRADJ[A.hair]:P2_HAIRADJ[A.hair])||[0,0,1],hs_=Ha?ha[2]:1;   // the hair sheet is drawn to the heads' scale
  // the hair's ear notch (the left edge of its face opening, P2A ehx / ehy) is the TOP of the ear: it goes on the head's ear top (etx / ety);
  // an elf style's drawn ear tip (tipx / tipy) goes on the elf head's ear tip
  let hx=0,hy=0;if(Ha){if(A.ehair&&Ha.tipx!=null&&HA.tipx!=null){hx=HA.tipx-R.px-Ha.tipx*hs_+ha[0]*R0;hy=HA.tipy-R.py-Ha.tipy*hs_+ha[1]*R0}
   else if(Ha.ehx!=null){hx=HA.etx-R.px+P2.earX*R0-Ha.ehx*hs_+ha[0]*R0;hy=HA.ety-R.py+P2.earY*R0-Ha.ehy*hs_+ha[1]*R0}else{hx=sk.x-R0*.1-Ha.bcx*hs_;hy=top-R0*.12-Ha.btop*hs_}}
  A.drawn={hair:hp,helm:A.helm>=0?'helm'+A.helm:null,head:n};   // for the tests: no hair under a helmet
  if(hs.orc){g.save();g.translate(sk.x,sk.y);humSh(g,humP(p=>{p.moveTo(-R0*.8,-R0*.05);p.quadraticCurveTo(-R0*1.5,-R0*.55,-R0*1.62,-R0*.62);p.quadraticCurveTo(-R0*1.25,R0*.05,-R0*.78,R0*.32);p.closePath()}),A.tone||'#f5bb8f',{dk:.18});g.restore()}
  if(c)put(n,c,1,-R.px,-R.py);
  if(HPc)put(hp,HPc,hs_,hx,hy);   // the hair straight over the head: its art leaves the face and the ear open
  g.save();g.translate(sk.x,sk.y);
  if(hs.orc&&ex!==7)for(const x of[R0*.3,R0*.68])humSh(g,humPoly([x-8,R0*.72,x,R0*.4,x+8,R0*.72]),'#f2ead6',{lw:6});
  if(S.beard&&(hs.dw||S.beard))humBeard(g,S,R0*.98,hs.dw);
  g.restore();
  if(A.helm>=0){const hn='helm'+A.helm,Hc=p2Piece(hn),Hm=P2A.p[hn].a,bt=P2_BOWL[A.helm]&&Hm.mtop!=null?Hm.mtop-.08*P2A.p[hn].h:P2_HTOP[A.helm]!=null?P2_HTOP[A.helm]*P2A.p[hn].h:Hm.btop,adj=P2_HADJ[A.helm]||[1,0,0],HP=P2A.p[(A.hf||'head')+ex].a,x0=HP.sx0-HP.nx,x1=HP.sx1-HP.nx,s=((x1-x0)*1.06)/Hm.bw*adj[0];   // the helmet's body spans the skull's back and front edges with a margin
   put(hn,Hc,s,(x0+x1)/2+R0*adj[1]-Hm.bcx*s,top-R0*(.2-adj[2])-bt*s)}})}
/* which head: HEAD_RULES over the unit's situation (eyePick's context), held HEAD_HOLD ms, instant on hit and death */
const P2_MEM=new WeakMap();
function headPick(u,L,st,t,an,cls){const S=L.S,now=typeof anNow==='function'?anNow():performance.now();
 const sts={},buffs={};if(u&&u.st)for(const k in u.st)if(u.st[k]>0)sts[k]=1;if(u&&Array.isArray(u.buffs))for(const b of u.buffs)if(b&&b.key)buffs[b.key]=1;
 let M=u?P2_MEM.get(u):null;if(u&&!M){M={cur:-1,t0:-1e9,kills:u.m?u.m.kills|0:0,killT:-1e9,hp:u.hp,healT:-1e9};P2_MEM.set(u,M)}
 if(M){if(u.m&&(u.m.kills|0)>M.kills){M.kills=u.m.kills|0;M.killT=now}if(u.hp>M.hp)M.healT=now;M.hp=u.hp}
 const won=!!(u&&typeof B==='object'&&B&&B.over&&B.result&&B.result.win!=null?(B.result.win===(u.side===0)):false);
 const c={u,S,st,t,an,cls,mor:u&&u.mor!=null?u.mor:3,sts,buffs,won,kill:M?now-M.killT:1e9,heal:M?now-M.healT:1e9};
 let name='neutral';for(const r of HEAD_RULES){let v=null;try{v=r[1](c)}catch(e){}if(v){name=v;break}}
 let h=P2_FACE.indexOf(name);if(h<0)h=0;if(!M)return{head:h,name};
 if(M.cur<0||(h!==M.cur&&(now-M.t0>=HEAD_HOLD||st==='hit'||st==='death'))){M.cur=h;M.name=name;M.t0=now}
 return{head:M.cur,name:M.name}}
