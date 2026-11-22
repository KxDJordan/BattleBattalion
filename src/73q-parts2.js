/* ================= PART SHEETS 2: THE BATTLE FIGURES BUILT FROM THE USER'S MODULAR PARTS (Detail High) =================
   The parts (assets/parts2/*, cut into P2A by assets/make-parts2-atlas.py) replace the earlier parts sheet on the skeleton of 73m-skel.js:
   one human head per expression, the two hands, five leg colours, 30 hair styles, 24 beards, 40 helmets and 51 armours (torso + its shoulder caps).
   Paper cut-out facing: there is only front art (three-quarter, facing bottom-right), used for all four faces and mirrored for the ones that
   look left (1 bottom-left, 2 top-left). The weapon hand stays the character's right after the mirror (73m-skel.js composes those faces
   with the hands swapped), so swords and shields keep their sides.
   Tables below, easy to edit: P2_ARMOR (the 51 sets, with the leg colour each wears), P2_ARMOR_OF (game armour look / item -> set),
   P2_HELM (the 40 helmets) and P2_HELM_OF (helmet shape -> helmet), P2_HAIR / P2_HAIR_OF (hair styles), HEAD_RULES (expressions).
   No hair under any helmet. Skin and hair are recoloured per merc (the sheet's skin / hair layers are grey shade, multiplied). Elves get a
   pointed ear, half-orcs green-grey skin, a pointed ear and tusks (vector overlays in the sheet's style); men and dwarves a sheet beard (P2_BEARD).
   The heads carry their own eyes (one head per expression). No rnd(). */
const P2={oBeard:1.12,on:true,img:[],ok:0,sc:.88,k:0,neck:.36,skin0:'#fdb48c',earX:0,earY:0,handA:[-.08,-.05],coatDy:0};
// a helmet's body top (fraction of the piece height) where a crest, plume, feather, wings or antlers stand above it: it is sized and placed by its body
// per-helmet fit after that: [scale, dx, dy] (dx, dy in head radii; up is negative)
const P2_HADJ={29:[1.06,-.07,-.04],3:[1.09,0,.1],25:[1.09,0,.1],26:[1.09,0,.1],33:[1.22,-.06,.26],4:[1.08,-.02,.1],5:[1.14,-.05,.16],24:[1,0,.12],30:[1.16,-.04,.22],31:[1.08,-.06,-.04],22:[1.04,0,-.06],23:[1.04,0,-.06]};
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
 ['black, crescent','grey'],['white and blue wrap','blue'],['green leaf robe','green'],['dark rogue','grey'],
 // 51-62: the tribal armour sheet (tribal-armor.webp, assets/make-tribal-armor.py), worn by the tribal figures (P2_TRIBAL_ARMOR)
 ['tribal fur vest','rust'],['stitched hide','tan'],['claw necklace vest','rust'],['hide wraps, red sash','tan'],['dark hide, claws','grey'],['painted spirals','rust'],
 ['scaled hide vest','grey'],['cord and pendant tunic','tan'],['studded hide','rust'],['fur mantle','tan'],['green wrap','green'],['tooth necklace vest','rust']];
/* each armour's class for recolouring (sheet order, then the tribal sheet's 12): p metal body (plate, mail, scale, lamellar: its primary follows the metal finish), l leather body,
   c cloth body (tunics, robes, gambesons, tabards). See p2Dress. */
const P2_ACLASS='pppppppcpp'+'ccccclcccc'+'lccplccclc'+'lplpppcccc'+'cclclcccccc'+'lllclllcllcl';   // + the tribal sheet (51-62)
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
/* half-orcs (Detail High): their own heads (halforc-heads.webp row 1, cut by assets/make-halforc-atlas.py into orch0..7, one per expression in
   P2_FACE order) for men and women alike (the sheet's heads are not sexed: the hair tells them apart), and their own ten styles (row 2, ohair0..9).
   A hair's drawn ear is only its placement cue: the build cuts it out and fits the hair by it; the head's ear (oear, cut from orch0) is drawn
   over the hair, so the sideburn passes behind the one ear. Skin: the sheet's olive is the common half-orc tone (PT_SKIN.orc), other tones
   (ash) multiply the skin layer. The look's hair style (ptMercSpec: bald, mohawk, crop, tail, shaggy, bun / tail, braids, mohawk, long, bun)
   keeps its kind; within a kind the merc's seed picks among the closest of the ten (P2_OHAIR_OF), so every style turns up. Bald stays bald. */
const P2_OHAIR=['spiky crop','swept spikes','slicked back','shaggy','topknot','ponytail','braids','long mane','high tail and braid','mohawk'];
const P2_OHAIR_OF={m:{crop:[0,1,2],short:[1,0,2],spiky:[0,1],swept:[2,1],mohawk:[9],tail:[4,5],topknot:[4,8],bun:[4,8],shaggy:[3,7],mane:[7,3],long:[7,5],braids:[6],curly:[3],bowl:[1],tonsure:[2],wisps:[2,3]},
 w:{tail:[5,8],braids:[6],mohawk:[9],long:[7,5],bun:[4,8],topknot:[8,4],short:[1,0,2],crop:[0,2],shaggy:[3,7],mane:[7],swept:[2],curly:[3],bowl:[1],wisps:[7]}};
const P2_OSKIN='#968b62';   // the sheet's olive (its skin layer's light tone): hands and bare arms of the common tone match the head
function p2OHair(S,fem){const st=S.hair;if(!st||st==='bald')return-1;const L=P2_OHAIR_OF[fem?'w':'m'][st],h=(((S.seed|0)*2654435761)>>>0)>>>7;return L?L[h%L.length]:h%P2_OHAIR.length}
function p2Orc(hs,S){return hs.race==='halforc'&&!!P2A.p.orch0}
/* tribal heads (Detail High): the user's sheet of 20 bald heads with tribal markings and no face (tribal-heads.webp, cut by
   assets/make-tribal-atlas.py into trh0..19, in head0's frame with head0's anchors, so hair, beards and helmets sit as on a human head).
   Their faces are lifted off the human heads (trf0..7 men, trff0..7 women: the same eight expressions, P2_FACE order) and drawn over the
   marking (a band across the eyes lies under them), the head's outline ring over all. The marking (layer p, grey shade) takes a paint:
   P2_PAINT, the sheet's dark red by default. Who: human Wildlings (the tribal background) and the barbarian crisis warriors (P2_TRIBAL_FOE);
   the marking by the merc's id (a foe type by its key), the paint by the portrait's war-paint colour (07-portraits.js marks.paintC: red,
   woad, white) for most, green or soot for some (the id again). Only red, blue, green, black, and white clay on dark skin
   (P2_PAINT_DARK; on light skin the portrait's white becomes one of the four). No yellow. No rnd(). */
const P2_PAINT={red:null,woad:'#3a5ca8',green:'#3c7a3a',soot:'#2b2624',clay:'#ece4d2'};   // the paints (the user's: red, blue, green, black; white clay on dark skin only; yellow does not read): red the sheet's own (TRA.mark)
const P2_PAINT_OF={g:'red',f:'red',X:'woad',x:'woad',l:'clay'};   // the portrait's war-paint; white on light skin and none: one of the four by the id
const P2_PAINT_DARK=170;   // white clay only on skin darker than this (luma of the skin tone: tan 145; fair 192, pale 218 never)
const P2_TRIBAL_BG={wildling:1};
const P2_TRIBAL_FOE={barbz:1,barbax:1,barbskald:1,barbhus:1};
function p2Hash(s){let h=2166136261;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}h^=h>>>16;h=Math.imul(h,2246822507);h^=h>>>13;h=Math.imul(h,3266489909);h^=h>>>16;return h>>>0}   // FNV-1a, then mixed (murmur3's finaliser): every bit counts
// the tribal head of a look: {i (marking 0..19), paint (colour name)} or null
function p2Tribal(L,hs){if(!P2A.p.trh0||!L.key)return null;const k=L.key.split(':');let id;
 if(k[0]==='m'){if(hs.race!=='human'||hs.el||hs.orc||!P2_TRIBAL_BG[k[4]])return null;id='m'+k[1]}
 else if(k[0]==='e'){if(!P2_TRIBAL_FOE[k[1]])return null;id='e'+k[1]}else return null;
 const h=p2Hash(id),i=h%20,v=(h>>>8)%10,sk=p2Hex(hs.C.skin),dark=.3*sk[0]+.59*sk[1]+.11*sk[2]<P2_PAINT_DARK,four=['red','woad','green','soot'];
 let pc=P2_PAINT_OF[L.S.paint]||(dark?four.concat('clay'):four)[(h>>>12)%(dark?5:4)];if(pc==='clay'&&!dark)pc=four[(h>>>12)%4];
 return{i,h,paint:v===8?'green':v===9?'soot':pc}}
function p2PaintCol(n){return P2_PAINT[n]||(typeof TRA==='object'&&TRA.mark)||'#8f3421'}
// a layer of piece P drawn on g (canvas origin = the piece's top-left with p2Piece's 1 px margin), col multiplies it
function p2Lay(g,P,m,col){const l=P.L[m];if(!l)return;const I=p2Img(l[0]);if(!I)return;const k=P2A.k;if(!col){g.drawImage(I,l[1],l[2],l[3],l[4],1+l[5]*k,1+l[6]*k,l[7]*k,l[8]*k);return}
 const t=humTmp(l[3],l[4]),q=t.getContext('2d');q.drawImage(I,l[1],l[2],l[3],l[4],0,0,l[3],l[4]);q.globalCompositeOperation='multiply';q.fillStyle=col;q.fillRect(0,0,l[3],l[4]);q.globalCompositeOperation='destination-in';q.drawImage(I,l[1],l[2],l[3],l[4],0,0,l[3],l[4]);
 g.drawImage(t,0,0,l[3],l[4],1+l[5]*k,1+l[6]*k,l[7]*k,l[8]*k)}
// the tribal head canvas for an expression: head (skin toned), its marking in the paint, the face (inside the head), the outline ring
function p2TriHead(T,ex,fem,tone){const id='tri|'+T.i+'|'+ex+'|'+(fem?1:0)+'|'+(tone||'')+'|'+T.paint;let c=P2_PC.get(id);if(c)return c;
 const hn='trh'+T.i,P=P2A.p[hn],fn=(fem?'trff':'trf')+ex,F=P2A.p[fn],base=p2Piece(hn,tone);if(!P||!base)return base;
 c=document.createElement('canvas');c.width=base.width;c.height=base.height;c.pk=base.pk;const g=c.getContext('2d');g.drawImage(base,0,0);
 p2Lay(g,P,'p',p2PaintCol(T.paint));
 if(F){g.globalCompositeOperation='source-atop';p2Lay(g,F,'c');g.globalCompositeOperation='source-over'}
 p2Lay(g,P,'o');
 if(P2_PC.size>900)P2_PC.delete(P2_PC.keys().next().value);c.pid=id;P2_PC.set(id,c);return c}
// expressions: the eight heads (heads.webp)
const P2_FACE=['neutral','gritted','shouting','happy','content','surprised','nervous','knocked out'];
// per-hair tweak after the ear-hole alignment: [dx, dy (head radii), scale]
const P2_EHAIRADJ={9:[0,0,1.14]};   // elf styles whose ear tip the build misreads (blond hair), or drawn narrower (the braid)
const P2_HAIRADJ={8:[0,.1,1],11:[0,.1,1]};   // [dx, dy (head radii), scale] on top of the placement: bob and long sit a little lower (user review)   // [dx, dy (head radii), scale]: styles whose ear notch the build reads too high (long hair covering the ear)   // [dx, dy (head radii), scale]: hairs whose ear notch is hidden by a strand or merged into the face opening
const HEAD_HOLD=380;
/* HEAD_RULES: [name, test(c) -> expression | null], first match wins; c (the unit's situation: state, morale, statuses, buffs, kills) plus heal (ms since healed); the rules
   marked ho are the half-orcs' alone (their sheet's mapping; c.ho), with c.hpf (hp / max), c.lvl (ms since a level gained), c.miss (ms since
   a big blow missed them: two-handed or a big monster's, 74-anim.js headNote), c.drop (ms since their morale fell to wavering or worse),
   c.blink (an idle half-orc's few calm moments: a 1.4 s window in every ~7 s, by unit id and the clock, no rnd()) */
const HEAD_RULES=[
 ['dead',c=>c.st==='death'?(c.t<.18?'surprised':'knocked out'):null],
 ['ho hit braced',c=>c.ho&&c.st==='hit'&&(c.S.wall||c.S.spearw||c.buffs.shieldwall||c.sts.brace)?'gritted':null],
 ['hit',c=>c.st==='hit'?'surprised':null],
 ['ho missed by a big blow',c=>c.ho&&c.miss<900?'surprised':null],
 ['ho shaken',c=>c.ho&&c.drop<700?'surprised':null],
 ['ho attack',c=>c.ho&&c.st==='attack'&&c.cls!=='bow'&&c.cls!=='gun'?(c.t<.22?'gritted':'shouting'):null],
 ['ho aim',c=>c.ho&&(c.st==='attack'||c.st==='reload')?'gritted':null],
 ['stunned',c=>c.sts.stun||c.sts.daze?'knocked out':null],
 ['fleeing',c=>c.an==='flee'||c.mor<=1?'nervous':null],
 ['cast',c=>c.st==='cast'?'shouting':null],
 ['big attack',c=>c.st==='attack'&&(c.cls==='two'||c.buffs.rallied||c.sts.fury||c.sts.enrage||c.sts.warcry)?(c.t<.3?'gritted':'shouting'):null],
 ['attack',c=>c.st==='attack'?(c.cls==='bow'||c.cls==='gun'?(c.t<.36?'gritted':'neutral'):'gritted'):null],
 ['ho braced',c=>c.ho&&(c.S.wall||c.S.spearw||c.buffs.shieldwall)&&c.st==='idle'?'gritted':null],
 ['battle cry',c=>c.buffs.rallied||c.sts.warcry||c.sts.taunted||c.buffs.shieldwall?'shouting':null],
 ['won',c=>c.won?'happy':null],
 ['kill',c=>c.kill<1600?'happy':null],
 ['ho level up',c=>c.ho&&c.lvl<2400?'happy':null],
 ['ho low hp',c=>c.ho&&c.hpf<.3&&c.st!=='attack'?'nervous':null],
 ['wavering',c=>c.mor===2?'nervous':null],
 ['healed',c=>c.heal<1500?'content':null],
 ['ho calm',c=>c.ho&&c.blink&&c.st==='idle'&&c.mor>=3?'content':null],
 ['confident',c=>c.mor>=4&&c.st==='idle'?'content':null],
 ['rest',()=>'neutral']];

function p2Img(i){const I=P2.img[i];if(I)return I.complete&&I.naturalWidth?I:null;if(typeof Image==='undefined'||typeof P2A!=='object'||!P2A.src[i])return null;const J=new Image();J.decoding='async';J.src=P2A.src[i];P2.img[i]=J;return J.complete&&J.naturalWidth?J:null}
function p2Ready(){if(typeof P2A!=='object')return false;let ok=true;for(let i=0;i<P2A.src.length;i++)if(!p2Img(i))ok=false;return ok}
function p2On(){return P2.on&&typeof P2A==='object'&&p2Ready()}
const P2_PC=new Map();   // tinted piece canvases, by piece + colour
// a piece canvas at atlas resolution (P2A.k px per SU), its own colours; skin (s) / hair (h) multiplied by col; pk = canvas px per SU;
// k1 / k2 a leg's cloth; R {r,g,b,y,m} an armour piece's colour-mask regions (primary, secondary, metal, emblem, straps), each multiplied by its colour
function p2Piece(n,skin,hair,k1,k2,R){const rs=R?(R.r||'')+','+(R.g||'')+','+(R.b||'')+','+(R.y||'')+','+(R.m||''):'';const id=n+'|'+(skin||'')+'|'+(hair||'')+'|'+(k1||'')+'|'+(k2||'')+'|'+rs;let c=P2_PC.get(id);if(c)return c;const P=P2A.p[n];if(!P)return null;const k=P2A.k,W=Math.ceil(P.w*k)+2,H=Math.ceil(P.h*k)+2;
 c=document.createElement('canvas');c.width=W;c.height=H;c.pk=k;const g=c.getContext('2d');
 const lay=(m,col)=>{const l=P.L[m];if(!l)return;const I=p2Img(l[0]);if(!I)return;if(!col){g.drawImage(I,l[1],l[2],l[3],l[4],1+l[5]*k,1+l[6]*k,l[7]*k,l[8]*k);return}
  const t=humTmp(l[3],l[4]),q=t.getContext('2d');q.drawImage(I,l[1],l[2],l[3],l[4],0,0,l[3],l[4]);q.globalCompositeOperation='multiply';q.fillStyle=col;q.fillRect(0,0,l[3],l[4]);q.globalCompositeOperation='destination-in';q.drawImage(I,l[1],l[2],l[3],l[4],0,0,l[3],l[4]);
  g.drawImage(t,0,0,l[3],l[4],1+l[5]*k,1+l[6]*k,l[7]*k,l[8]*k)};
 lay('c');if(k1)lay('k1',k1);if(k2)lay('k2',k2||k1);if(R)for(const m of['r','g','b','y','m'])if(R[m])lay(m,R[m]);if(skin)lay('s',skin);if(P.L.h)lay('h',hair||'#6b4a2b');   // k1 / k2: a leg's cloth recoloured; r / g / b / y: the armour's mask regions; h hair / beard multiplied by the hair colour
 if(P2_PC.size>900)P2_PC.delete(P2_PC.keys().next().value);
 c.pid=id;P2_PC.set(id,c);return c}
// a piece's rig record (SU, origin at the pivot): what 73m-skel.js reads (px, py, wx, wy, len, ang, fy, ...)
function p2Rig(n,px,py,extra){const P=P2A.p[n];const R=Object.assign({w:P.w,h:P.h,px,py},extra||{});if(R.wx!=null){R.len=Math.hypot(R.wx-R.px,R.wy-R.py);R.ang=Math.atan2(R.wy-R.py,R.wx-R.px)}return R}
/* ---- choosing the parts of a look ---- */
function p2Hex(c){return(String(c).match(/[0-9a-f]{2}/gi)||['80','80','80']).map(h=>parseInt(h,16))}
function p2Near(col,list){const a=p2Hex(col);let best=0,bd=1e9;list.forEach((q,i)=>{const b=p2Hex(q[1]);const d=(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;if(d<bd){bd=d;best=i}});return best}
function p2AvKey(av){if(!av||typeof US_AV!=='object')return null;for(const k in US_AV)if(US_AV[k]===av)return k;return null}
/* the tribal figures (p2Tribal: Wildlings, the barbarian crisis warriors) wear the tribal sheet's armours for the light armours a tribe would
   make (the item, or a foe's armour kind): each item lists the fitting tribal pieces, the figure's id picks one (stable). Every other armour,
   and everyone else, as before. Only the drawing changes, never the item. */
const P2_TRIBAL_ARMOR={rags:[3,7,10],hide:[0,1,2,4,5,6,9,11],leather:[0,1,5,6,8,11],jack:[1,7,8],padded:[7,3,10],studded:[8],
 k_rags:[3,10],k_bare:[2,11],k_fur:[9,0,4],k_leather:[1,8,0,5],k_padded:[7,3]};
function p2Armor(L){const S=L.S,hs=humSpec(L);let n=null;const id=S.armId;
 const tri=p2Tribal(L,hs),tl=tri&&(id?P2_TRIBAL_ARMOR[id]:P2_TRIBAL_ARMOR['k_'+S.armor]);if(tl&&!S.coat)return 51+tl[(tri.h>>>16)%tl.length];
 if(id){n=P2_ARMOR_OF[id]||null;if(!n&&typeof usFamedBase==='function'&&usFamedBase(id))n=P2_ARMOR_OF[usFamedBase(id)]||null;if(!n&&typeof usLookOf==='function')n=P2_ARMOR_OF[usLookOf(id)]||null}
 if(!n&&L.key[0]==='m'&&!id){const t=P2_TUNIC[p2Near(hs.C.body,P2_TUNIC)];n=t[0]}   // no armour: the plain tunic in the look's cloth colour
 if(!n){const k=p2AvKey(S.av);if(k)n=P2_ARMOR_OF[k]||null}
 if(!n&&S.armor==='robe'){const c=S.robeC||'';n=P2_ROBE[c]||null}
 if(!n)n=P2_ARMOR_OF['k_'+S.armor]||'rags';
 if(S.coat&&!P2A.p.coat0){const F=humLit(S.coat.F),plate=/plate/.test(n),fc=p2Hex(F),blue=fc[2]>fc[0]+20,red=fc[0]>fc[2]+40&&fc[0]>fc[1]+20,light=fc[0]+fc[1]+fc[2]>500;   // a surcoat / house coat: the tabards
  const rec=!(typeof G==='object'&&G&&G.wearCol&&G.wearCol.coat===false);   // recoloured to the livery: one tabard of each kind, its colours from the flag
  n=rec?(plate?'plate, blue fleur-de-lis surcoat':'white star tabard'):plate?(blue?'plate, blue fleur-de-lis surcoat':'plate, white crusader cross'):blue?'blue cross tabard':red?'dark red cloak':light?'white star tabard':'blue cross tabard'}
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

/* the 24 beards (beards.webp: row 1 brown: soul patch, chin strap, chin curtain, moustache, moustache and goatee, three full beards growing;
   row 2 brown: two chin straps, four full beards growing, a ringed braid, a long braid; row 3 grey: two chin straps, two full beards, a ringed
   braid, a long ringed braid, two with twin braids). Every beard is recoloured to the merc's beard colour (its grey shade multiplied, as hair),
   so the rows are shapes: grey / white beards pick from the grey row's shapes (old men's), the others from rows 1-2. The portrait's beard kind
   (07-portraits.js) picks the list, the look's seed the beard in it. Dwarves: the big half (full, braided). Men of every race but elves and
   elves (those keep the vector beard of 73k-humans.js humBeard); women none. Half-orc men wear them on the half-orc heads, a little larger
   (P2.oBeard: the broad jaw), their mouth on the head's (orch anchors bmx, bmy: between the tusks' roots) and the head's tusks (otusk<i>) drawn over them. */
const P2_BEARD={stache:[3],goatee:[4,0,2],chops:[1,8],short:[5,8,9,6],full:[6,7,10,11],long:[12,13,14,15],fork:[14,15,22,23],dwarf:[13,14,15]};
const P2_BEARD_GREY={stache:[3],goatee:[4,0],chops:[1,16],short:[16,17,18],full:[18,19,20],long:[20,21,22,23],fork:[22,23],dwarf:[20,21,22,23]};
const P2_BEARD_DW={dark:[7,11,12,13,14,15],grey:[19,20,21,22,23],fork:[14,15,22,23],long:[13,14,15,21]};
// full-face helmets (P2_HELM): no beard under them
const P2_NOBEARD=new Set(['armet','sallet','bascinet','gold-visored helm','great helm','gilded great helm','ninja mask','wrapped cloth','visor helm A','visor helm B'].map(P2H));
function p2BeardCol(S){const br=S.beardR||S.hairR||usHairR(['i','H','k']);return humMix(humRC(br),humRC(br,1),.25)}
function p2Grey(col){const c=p2Hex(col),mx=Math.max(...c),mn=Math.min(...c);return mx>120&&(mx-mn)/mx<.16}
// the sheet beard of a look: its index, or -1 (none / the vector beard)
function p2Beard(S,hs){const bd=S.beard;if(!bd||hs.fem||hs.el||hs.race==='elf'||S.ears==='elf')return-1;if((hs.race==='halforc'||S.b===US_BUILD.halforc)&&!P2A.p.orch0)return-1;   // half-orcs: on their own heads (orch), under their tusks
 const dw=hs.race==='dwarf'||S.b===US_BUILD.dwarf||bd==='dwarf',grey=p2Grey(p2BeardCol(S)),h=((S.seed|0)*167+13)>>>0;
 let L;if(dw)L=bd==='fork'?P2_BEARD_DW.fork:grey?P2_BEARD_DW.grey:bd==='long'?P2_BEARD_DW.long:P2_BEARD_DW.dark;
 else L=(grey?P2_BEARD_GREY:P2_BEARD)[bd]||(grey?P2_BEARD_GREY:P2_BEARD).short;
 const i=L[(h>>3)%L.length];return P2A.p['beard'+i]?i:-1}
/* ---- the asset record of a look x face (same fields as humSkAssets, from these parts) ---- */
/* the colours an armour is drawn in (Detail High), from the colour mask's regions: r primary, g secondary, b metal fittings, y emblem (magenta straps,
   the outline and the skin are never recoloured). The sources, first that applies:
     the merc's own tailored colours (m.colors via mercLook: a rival company's merc without them wears its livery): cloth / accent dyes and a metal finish;
     G.wearCol.cloth (default off): the company's (or a rival's) flag colours as cloth (field c1) and accent (charge c2).
   A surcoat with the coat option (G.wearCol.coat, default on) is drawn over the torso by p2Coat in its livery and leaves the armour's own colours alone.
   Per class (P2_ACLASS): cloth / leather bodies: r <- cloth, g <- accent; metal bodies: r <- metal finish, g (their cloth: surcoats, skirts) <- cloth;
   b <- metal finish always; y (an emblem) <- the colour that is not its ground's (on an r ground the accent, on a g ground the cloth; on metal the accent).
   An armour with no trim or emblem in the accent's way (no g / y region it would dye) gets the accent on its belts and straps (m), so the
   tailor's every swatch shows. In the flag mode leather and metal bodies keep their own primary. Nothing set: null, the armour exactly as drawn.
   Legs: their cloth (k1) <- cloth. */
function p2LivCol(c,i){const B=typeof BANNERC==='object'&&BANNERC[c];return B?humMix(humHex(B.r[1]),humHex(B.r[2]),.35):i?'#d1a94e':'#2f7868'}
function p2RampCol(r){if(!r||!r.t)return null;const n=r.t.length,b=r.b==null?1:r.b;return b+1<n?humMix(humRC(r),humRC(r,1),.3):humRC(r)}
function p2DyeCol(k){return k&&typeof usDye==='function'?p2RampCol(usDye(k)):null}
function p2FinCol(k){if(!k||k==='steel'||typeof usFin!=='function')return null;const f=usFin(k);return f?p2RampCol(f.steel):null}
// the colours a merc's clothes take (cloth, accent, metal finish; flag: the company's livery), or null: worn as drawn
function p2DressCols(L){const w=typeof G==='object'&&G&&G.wearCol||{},m=L.m,cs=m?(typeof mercLook==='function'?mercLook(m):m.colors):null;
 let cl=null,ac=null,mt=null,flag=false;
 if(cs&&typeof cs==='object'&&(cs.cloth||cs.accent||cs.metal)){cl=p2DyeCol(cs.cloth);ac=p2DyeCol(cs.accent);mt=p2FinCol(cs.metal)}
 else if(m&&w.cloth&&typeof mercLivery==='function'){const lv=mercLivery(m);if(lv){cl=p2LivCol(lv.c1,0);ac=p2LivCol(lv.c2,1);flag=true}}
 return cl||ac||mt?{cl,ac,mt,flag}:null}
// a piece's mask regions by its class (P2_ACLASS / P2_HCLASS): eg the emblem's ground key, TL the piece's layers
function p2MaskCols(D,cls,eg,TL){const{cl,ac,mt,flag}=D,R={b:mt};
 if(cls==='n')return null;
 if(cls==='c'){R.r=cl;R.g=ac;R.y=eg==='g'?cl:ac}
 else if(cls==='l'&&!flag){R.r=cl;R.g=ac;R.y=eg==='g'?cl:ac}
 else{R.r=cls==='p'?mt:null;R.g=cl;R.y=ac}
 if(ac&&!flag&&!(TL.g&&(R.g===ac))&&!(TL.y&&R.y===ac))R.m=ac;   // no trim to take the accent: the belts and straps do
 return R.r||R.g||R.b||R.y||R.m?R:null}
function p2Dress(L,ai){const D=p2DressCols(L);if(!D)return null;const T=P2A.p['torso'+ai];
 const R=p2MaskCols(D,P2_ACLASS[ai]||'c',(T.a||{}).eg||'r',T.L);
 return{R:R&&(R.r||R.g||R.b||R.y)?R:null,leg:D.cl}}
/* a helmet's colours (Detail High), from the helmet mask (assets/make-helmet-mask.py: the armour mask's keys) by its class, as an armour's:
   cloth hoods, caps, turbans, bandanas (c) and leather caps / fur pelts (l): r <- cloth, g (a band, a border) <- accent; steel helms (p):
   r <- the metal finish (never the cloth), g (cloth on a helm: a lacquered, laced neck guard) <- cloth; plumes and crests (y) <- accent,
   gold / brass fittings (b) <- the metal finish; bone, horn and straw (n) never. Wings, horns, gems, glass stay as drawn (black in the mask). */
const P2_HCLASS='lcccl'+'cpppp'+'ppppp'+'ppppp'+'ppllnccppp'+'pppncccl'+'pp';
function p2HelmDress(L,hi){if(hi<0)return null;const P=P2A.p['helm'+hi],D=P&&p2DressCols(L);return D?p2MaskCols(D,P2_HCLASS[hi]||'n','r',P.L):null}
/* ---- surcoats (Detail High): the user's surcoat sheet (assets/parts2/surcoats.webp, cut by assets/make-surcoats.py into P2A coat0..9:
   0 plain, 1 per pale, 2 pales, 3 cross, 4 bend, 5 bordure, 6-9 a plain field with the place of a charge) drawn over the torso only, so
   the armour's own shoulders, collar and arms show. The design follows the livery's banner: its division (P2_COATDIV: per pale, paly,
   cross / saltire, bend, bordure) picks the drawing and the division's colour (c3) is its second colour; a plain (or other) banner gives
   the field with the company's emblem, the place by the coat's cut (P2_COATCUT); the heraldic coat is bordered in the charge colour (c2),
   as at Detail Low. The field is c1, the emblem c2, painted by the banner's own emblem painter (46-banner.js bnEmCanvas) at the charge's
   place (P2A anchors ex, ey, ew, eh; the bordure and the plain field borrow coat6's). The four division designs carry no emblem (the
   division is the arms). With the coat option off (G.wearCol.coat false) the design is drawn in the sheet's own colours with a brass emblem. */
const P2_COATDIV={pale:1,paly:2,cross:3,saltire:3,bend:4,bordure:5};
const P2_COATCUT={tabard:6,surcoat:7,quilted:8,mantle:9,jinbaori:9,herald:5};
const P2_COATEM=[1,0,0,0,0,1,1,1,1,1];
function p2CoatDesign(C){const d=P2_COATDIV[C.dv];if(d!=null)return d;const c=P2_COATCUT[C.cut];return c!=null?c:6}
function p2CoatCols(C,d,rec){if(!rec)return{R:null,em:'c',fld:'g'};const sec=d>=1&&d<=4||d===5&&P2_COATDIV[C.dv]===5?C.c3||C.c2:C.c2;
 return{R:{r:p2CoatCol(C.c1),g:d>=1&&d<=5?p2CoatCol(sec):null},em:C.c2,fld:C.c1}}
// a banner colour on the coat's shade: its mid tone a little lifted (the shade's light parts reach it)
function p2CoatCol(c){const B=typeof BANNERC==='object'&&BANNERC[c];return B?humMix(humHex(B.r[1]),humHex(B.r[2]),.12):'#808080'}
// the torso canvas with the surcoat over it (a bigger canvas: c.ox / c.oy its origin in the torso's SU, 73m-skel.js reads them)
function p2CoatTorso(tc,tn,C){const rec=!(typeof G==='object'&&G&&G.wearCol&&G.wearCol.coat===false),d=p2CoatDesign(C),cn='coat'+d,CP=P2A.p[cn];if(!CP||!tc)return tc;
 const id='coat|'+(tc.pid||tn)+'|'+d+'|'+(rec?C.sig:'own');let c=P2_PC.get(id);if(c)return c;
 const cs=p2CoatCols(C,d,rec),cc=p2Piece(cn,null,null,null,null,cs.R);if(!cc)return tc;const k=P2A.k,TP=P2A.p[tn],Ta=TP.a,Ca=CP.a;
 const ox=Ta.nx-Ca.nx,oy=Ta.ny-Ca.ny+P2.coatDy*TP.h,x0=Math.min(0,ox),y0=Math.min(0,oy),x1=Math.max(TP.w,ox+CP.w),y1=Math.max(TP.h,oy+CP.h);
 c=document.createElement('canvas');c.width=Math.ceil((x1-x0)*k)+2;c.height=Math.ceil((y1-y0)*k)+2;c.pk=k;c.ox=x0;c.oy=y0;const g=c.getContext('2d');
 g.drawImage(tc,-x0*k,-y0*k);g.drawImage(cc,(ox-x0)*k,(oy-y0)*k);
 if(P2_COATEM[d]&&typeof bnEmCanvas==='function'){const E=Ca.ex!=null?Ca:P2A.p.coat6.a,sz=Math.min(E.ew,E.eh)*1.05,px=Math.max(16,Math.round(sz*k));
  try{const ec=bnEmCanvas(C.em,cs.em,cs.fld,px);if(ec)g.drawImage(ec,(ox-x0+E.ex-sz/2)*k,(oy-y0+E.ey-sz/2)*k,sz*k,sz*k)}catch(e){}}
 c.coat=d;P2_PC.set(id,c);return c}
function p2Assets(L,face,k){const A=p2Assets0(L,face,k);A.helmR=p2HelmDress(L,A.helm);return A}
function p2Assets0(L,face,k){const hs=humSpec(L),S=L.S,mir=face===1||face===2,f=1,K=k*HUM_A*hs.sc*P2.sc*(hs.race==='dwarf'?.96:1),mf=mir?-1:1;
 const ho=p2Orc(hs,S),ai=p2Armor(L),leg=P2_LEGS.indexOf(P2_ARMOR[ai][1]),skin=ho&&S.skin===usSkin(PT_SKIN.orc)?P2_OSKIN:hs.orc?humLit(hs.S.skin):hs.C.skin,fem=!!hs.fem;
 const tone=hs.race==='human'&&!hs.orc&&/^s/.test((S.skin&&S.skin.t)||'')?null:skin;   // the sheet's own skin is a fair human's
 const dr=p2Dress(L,ai),RC=dr&&dr.R,lk=dr&&dr.leg;   // tailored colours or the company's cloth in the flag's colours
 const tn='torso'+ai,TP=P2A.p[tn].a,T={n:tn,R:p2Rig(tn,TP.hx,TP.hy),c:p2Piece(tn,tone,null,null,null,RC)};
 if(S.coat&&P2A.p.coat0&&T.c)T.c=p2CoatTorso(T.c,tn,S.coat)   // a surcoat over the torso
 const ln=s=>'leg'+leg+'_'+s,LPa=P2A.p[ln('a')].a,LPb=P2A.p[ln('b')].a;
 const LA={n:ln('a'),R:p2Rig(ln('a'),LPa.px,LPa.py,{fy:LPa.fy}),c:p2Piece(ln('a'),null,null,lk)},LB={n:ln('b'),R:p2Rig(ln('b'),LPb.px,LPb.py,{fy:LPb.fy}),c:p2Piece(ln('b'),null,null,lk)};
 const wSide=face===0||face===3?'a':'b',oSide=wSide==='a'?'b':'a',sw0=wSide==='a'?-1:1,so0=-sw0;
 const arm=s=>{const n='sh'+ai+'_'+s,a=P2A.p[n].a;return{n,R:p2Rig(n,a.px,a.py,{wx:a.wx,wy:a.wy}),c:p2Piece(n,null,null,null,null,RC)}};
 const hand=n=>{   // hand_a the character's right (the near arm, image left in face 0), hand_b the left (far arm); a hand stays on its own arm
 const a=P2A.p[n].a;return{n,R:p2Rig(n,a.px,a.py),c:p2Piece(n,tone)}};
 const legk=hs.race==='dwarf'?.62:1,legL=(LA.R.fy-LA.R.py)*legk,legY=-24*legk,hipY0=-(legL+legY),hx=P2A.p[ln('a')].w*.36;
 const loc=(x,y)=>({x,y}),shA=loc(TP.sax-16-TP.hx,TP.sy+4-TP.hy),shB=loc(TP.sbx+16-TP.hx,TP.sy+4-TP.hy),neck=loc(TP.nx-TP.hx+4,-TP.hy+P2A.p.torso10.h*P2.neck);   // the chin sits in the collar: the head overlaps the torso's top by P2.neck of a tunic's height (same for every torso)   // the sleeves sit at the torso's upper corners, half outside it
 const tri=ho?null:p2Tribal(L,hs),hf=ho?'orch':tri?'trh':hs.el?(fem?'elff':'elfm'):fem?'headf':'head',h0=tri?'trh'+tri.i:hf+'0',HP=P2A.p[h0].a,hR=p2Rig(h0,HP.nx,HP.ny,{cx:HP.cx,cy:HP.cy,r:HP.r}),skull=loc(HP.cx-HP.nx,HP.cy-HP.ny);
 return{p2:1,hs,S,v:'f',f,mir,K,back:false,mf,face,T,LA,LB,tR:T.R,tw:1,legL,legY,legk,hx,hipY0,UBy0:hipY0-14,shA,shB,neck,wSide,oSide,sw0,so0,
  head:{n:'head0',R:hR,c:null},hR,R0:hR.r,skull,AW:arm(wSide),AO:arm(oSide),HW:hand(wSide==='a'?'hand_a':'hand_b'),HO:hand(oSide==='a'?'hand_a':'hand_b'),bk:new Map(),armor:ai,leg,tone,
  hf,ho,tri,fem,helm:p2Helm(S),helmR:null,hair:ho?p2OHair(S,fem):hs.el?p2EHair(S,fem):p2Hair(S,fem),ehair:!!hs.el&&!ho,hairC:humMix(humRC(S.hairR||usHairR(['i','H','k'])),humRC(S.hairR||usHairR(['i','H','k']),1),.25),beard:p2Beard(S,hs),beardC:p2BeardCol(S)}}
/* the head attachment for an expression: head piece, hair (none under a helmet), helmet, race cues */
function p2HeadAtt(A,ex){const S=A.S,hs=A.hs,R0=A.R0,sk=A.skull;
 return hskAtt(A,'p2head:'+ex,[-480,-640,480,420],g=>{const n=A.tri?'trh'+A.tri.i:(A.hf||'head')+ex,c=A.tri?p2TriHead(A.tri,ex,A.fem,A.tone):p2Piece(n,A.tone),R=A.hR,pk=P2A.k;
  const top=sk.y-A.hR.h*.5;   // the head's top (SU, from the neck point)
  const put=(pn,canvas,s,dx,dy)=>{if(!canvas)return;g.drawImage(canvas,dx-1/pk*s,dy-1/pk*s,canvas.width/pk*s,canvas.height/pk*s)};
  // hair behind the head (long styles hang behind the neck): the whole hair piece first, the head over it, then the hair again clipped to above the eyes
  let hp=A.helm<0&&A.hair>=0?(A.ho?'ohair':A.ehair?'ehair':'hair')+A.hair:null,HPc=hp?(A.ehair?p2Piece(hp,A.tone||P2.skin0,A.hairC):p2Piece(hp,null,A.hairC)):null,Ha=hp?P2A.p[hp].a:null,HA=P2A.p[n].a,ha=(A.ho?null:A.ehair?P2_EHAIRADJ[A.hair]:P2_HAIRADJ[A.hair])||[0,0,1],hs_=Ha?ha[2]:1;   // the hair sheet is drawn to the heads' scale
  // the hair's ear notch (the left edge of its face opening, P2A ehx / ehy) is the TOP of the ear: it goes on the head's ear top (etx / ety);
  // an elf style's drawn ear tip (tipx / tipy) goes on the elf head's ear tip; a human style is placed as fitted at build time
  // (assets/make-parts2-atlas.py: its ear arc on the head's ear outline, fx / fy / fs)
  let hx=0,hy=0;if(Ha){if(A.ehair&&Ha.tipx!=null&&HA.tipx!=null){hx=HA.tipx-R.px-Ha.tipx*hs_+ha[0]*R0;hy=HA.tipy-R.py-Ha.tipy*hs_+ha[1]*R0}
   else if(Ha.fx!=null){hs_=Ha.fs*ha[2];hx=-R.px+Ha.fx+(HA.edx||0)+ha[0]*R0;hy=-R.py+Ha.fy+(HA.edy||0)+ha[1]*R0}else{hx=sk.x-R0*.1-Ha.bcx*hs_;hy=top-R0*.12-Ha.btop*hs_}}
  A.drawn={hair:hp,helm:A.helm>=0?'helm'+A.helm:null,head:n};if(A.tri){A.drawn.face=(A.fem?'trff':'trf')+ex;A.drawn.paint=A.tri.paint}   // for the tests: no hair under a helmet
  if(hs.orc&&!A.ho){g.save();g.translate(sk.x,sk.y);humSh(g,humP(p=>{p.moveTo(-R0*.8,-R0*.05);p.quadraticCurveTo(-R0*1.5,-R0*.55,-R0*1.62,-R0*.62);p.quadraticCurveTo(-R0*1.25,R0*.05,-R0*.78,R0*.32);p.closePath()}),A.tone||'#f5bb8f',{dk:.18});g.restore()}
  if(c)put(n,c,1,-R.px,-R.py);
  if(HPc)put(hp,HPc,hs_,hx,hy);   // the hair straight over the head: its art leaves the face and the ear open
  if(A.ho&&HPc){const ec=p2Piece('oear',A.tone);put('oear',ec,1,-R.px+(HA.edx||0),-R.py+(HA.edy||0));A.drawn.ear='oear'}   // a half-orc's ear over the hair's sideburn
  g.save();g.translate(sk.x,sk.y);
  if(hs.orc&&!A.ho&&ex!==7)for(const x of[R0*.3,R0*.68])humSh(g,humPoly([x-8,R0*.72,x,R0*.4,x+8,R0*.72]),'#f2ead6',{lw:6});
  if(S.beard&&A.beard<0&&!A.ho)humBeard(g,S,R0*.98,hs.dw);   // elves: the vector beard
  g.restore();
  // the sheet beard: its mouth on the head's mouth (P2A anchors mx, my / bmx, bmy), over the hair, under the helmet; none under a full-face helmet
  if(A.beard>=0&&!P2_NOBEARD.has(A.helm)){const bn='beard'+A.beard,Ba=P2A.p[bn].a,bs=A.ho?P2.oBeard:1;put(bn,p2Piece(bn,null,A.beardC),bs,HA.bmx-R.px-Ba.mx*bs,HA.bmy-R.py-Ba.my*bs);A.drawn.beard=bn;
   const tn='otusk'+ex;if(A.ho&&P2A.p[tn]){put(tn,p2Piece(tn),1,-R.px,-R.py);A.drawn.tusk=tn}}   // a half-orc's tusks in front of the beard
  if(A.helm>=0){const hn='helm'+A.helm,Hc=p2Piece(hn,null,null,null,null,A.helmR),Hm=P2A.p[hn].a,bt=P2_BOWL[A.helm]&&Hm.mtop!=null?Hm.mtop-.08*P2A.p[hn].h:P2_HTOP[A.helm]!=null?P2_HTOP[A.helm]*P2A.p[hn].h:Hm.btop,adj=P2_HADJ[A.helm]||[1,0,0],HP=P2A.p[n].a,x0=HP.sx0-HP.nx,x1=HP.sx1-HP.nx,s=((x1-x0)*1.06)/Hm.bw*adj[0];   // the helmet's body spans the skull's back and front edges with a margin
   put(hn,Hc,s,(x0+x1)/2+R0*adj[1]-Hm.bcx*s,top-R0*(.2-adj[2])-bt*s)}})}
/* which head: HEAD_RULES over the unit's situation, held HEAD_HOLD ms, instant on hit and death */
const P2_MEM=new WeakMap();
// a big blow missed u (74-anim.js on 'miss'): a two-handed weapon's or a big monster's; presentation only
function headNote(u,type,by){if(!u||type!=='miss'||!by)return;const big=!!(by.wpn&&by.wpn.two)||!!(by.def&&(by.def.big||by.def.size>1));if(!big)return;
 let M=P2_MEM.get(u);if(!M)return;M.missT=typeof anNow==='function'?anNow():performance.now()}
function headPick(u,L,st,t,an,cls){const S=L.S,now=typeof anNow==='function'?anNow():performance.now();
 const sts={},buffs={};if(u&&u.st)for(const k in u.st)if(u.st[k]>0)sts[k]=1;if(u&&Array.isArray(u.buffs))for(const b of u.buffs)if(b&&b.key)buffs[b.key]=1;
 let M=u?P2_MEM.get(u):null;if(u&&!M){M={cur:-1,t0:-1e9,kills:u.m?u.m.kills|0:0,killT:-1e9,hp:u.hp,healT:-1e9,lvl:u.m?u.m.lvl|0:0,lvlT:-1e9,mor:u.mor,dropT:-1e9,missT:-1e9};P2_MEM.set(u,M)}
 if(M){if(u.m&&(u.m.kills|0)>M.kills){M.kills=u.m.kills|0;M.killT=now}if(u.hp>M.hp)M.healT=now;M.hp=u.hp;
  if(u.m&&(u.m.lvl|0)>M.lvl){M.lvl=u.m.lvl|0;M.lvlT=now}if(u.mor!=null&&M.mor!=null&&u.mor<M.mor&&u.mor<=2)M.dropT=now;M.mor=u.mor}
 const ho=!!(S.b===US_BUILD.halforc&&L.key&&L.key[0]==='m'&&P2A.p.orch0),hpm=u&&(u.hpMax||u.hp)||1,uid=u?(u.id!=null?u.id:u.m?u.m.id:0)|0:0,ph=((uid*2654435761)>>>0)%7000;
 const won=!!(u&&typeof B==='object'&&B&&B.over&&B.result&&B.result.win!=null?(B.result.win===(u.side===0)):false);
 const c={u,S,st,t,an,cls,mor:u&&u.mor!=null?u.mor:3,sts,buffs,won,kill:M?now-M.killT:1e9,heal:M?now-M.healT:1e9,
  ho,hpf:u?u.hp/hpm:1,lvl:M?now-M.lvlT:1e9,miss:M?now-M.missT:1e9,drop:M?now-M.dropT:1e9,blink:!!u&&((now+ph)%7000)<1400};
 let name='neutral';for(const r of HEAD_RULES){let v=null;try{v=r[1](c)}catch(e){}if(v){name=v;break}}
 let h=P2_FACE.indexOf(name);if(h<0)h=0;if(!M)return{head:h,name};
 if(M.cur<0||(h!==M.cur&&(now-M.t0>=HEAD_HOLD||st==='hit'||st==='death'))){M.cur=h;M.name=name;M.t0=now}
 return{head:M.cur,name:M.name}}
