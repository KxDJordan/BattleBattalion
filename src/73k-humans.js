/* ================= PERSON FIGURES (Detail High): who is a person, the look's body spec, weapons, shields, the vector beard =================
   Every person on the board (player mercs, rivals, fabled warriors, house soldiers, brigands, gladiators, barbarians, the
   Shogunate, necromancers ...) is composed at Detail High from the user's part sheets (73q-parts2.js, P2A) on the skeleton of
   73m-skel.js. This file holds what that needs: humWant (is this look a person drawn so), humSpec (race, sex, colours and
   proportions per look), the weapon, bow and shield painters (vector art in the sheets' style: thick black outline, flat fill
   and one shade; 73-units.js usWdef gives the class, length and materials), the vector beard (elves) and the frame budget.
   Until the part sheets have decoded (humImg / humReady) a person draws as the pixel figure, as at Detail Low.
   Output {cv, ax, ay, k, smooth:true, hk, r} like the painted sheets (76s-sheets.js): cv at device resolution (k = backing px per
   art px, from artScale()), cropped to the figure; ax/ay the feet in art px. 73-units.js caches it per look x face x state x
   frame (L.fr) and rebuilds when k or the art revision changes. Detail Low and non-humans never come here. No rnd(). */
const HUM={on:true,builds:0,ms:0,hits:0,bytes:0,fifo:[],cap:56e6};
const HUM_A=1/14.4;                 // art px per sheet px: an unhelmeted figure stands ~27 art px (the old figure was 23 + hat)
const HUM_LW=9;                     // gear outline width (SU), the sheet's stroke
const HUM_INK='#141210';
// the part sheets (73q-parts2.js P2A) once decoded, else null (starts their loading): until then a person draws as the pixel figure
function humImg(){return typeof p2On==='function'&&p2On()?P2A:null}
function humReady(){return!!humImg()}
function humK(){let s=1;try{s=typeof artScale==='function'?artScale():1}catch(e){}return Math.max(3,Math.min(7,Math.round(s)||3))}
/* ---- who is a person: mercs (any race), and the human enemy types ---- */
const HUM_NOT=new Set(['gob','gobarch','gobsham','skel','skelhal','zomb','orcy','orcw','orcl','obrute','hstd','hchief','imp','vknight','vmage','tyrant','gknight','bthrone']);
function humPerson(L){if(L.hum!==undefined)return L.hum;let r=false;const S=L.S;
 if(S&&S.kind==='hum'&&typeof L.key==='string'){if(L.key[0]==='m')r=true;else if(L.key[0]==='e'){const id=L.key.split(':')[1];r=!HUM_NOT.has(id)&&!(typeof SHEETS==='object'&&SHEETS[id])&&!!US_BUILD&&S.b!==US_BUILD.thin&&S.b!==US_BUILD.gob&&S.b!==US_BUILD.orc&&S.b!==US_BUILD.imp&&S.b!==US_BUILD.bloat&&S.b!==US_BUILD.tyrant&&!(S.armor==='rags'&&S.wd&&S.wd.cls==='fist'&&!S.hair&&!S.hat&&!S.beard)}}   // the stock spec a monster without its own falls back to is no person
 L.hum=r;return r}
function humWant(L){return HUM.on&&typeof document!=='undefined'&&typeof Path2D==='function'&&typeof CanvasRenderingContext2D==='function'&&typeof P2A==='object'&&(typeof hdArt!=='function'||hdArt())&&!!L&&humPerson(L)}

/* ---- colours ---- */
function humHex(k){const s=typeof PAL==='object'&&PAL[k];return s||(/^#/.test(k)?k:'#888888')}
function humRGB(h){const v=parseInt(String(h).slice(1),16)||0;return[v>>16&255,v>>8&255,v&255]}
function humMix(a,b,t){const A=humRGB(a),B=humRGB(b);return'#'+A.map((c,i)=>Math.round(c+(B[i]-c)*t).toString(16).padStart(2,'0')).join('')}
function humDk(c,t){return humMix(c,'#000000',t==null?.22:t)}
function humLt(c,t){return humMix(c,'#ffffff',t==null?.22:t)}
// a ramp of 73-units.js ({t: PAL keys dark -> light, b: resting tone}) -> the lit colour a grey shade layer is multiplied by
function humRC(r,d){if(!r)return'#888888';if(typeof r==='string')return humHex(r);const t=r.t,n=t.length;let i=(r.b==null?1:r.b)+(d||0);i=i<0?0:i>=n?n-1:i;return humHex(t[i])}
function humLit(r){if(!r||typeof r==='string')return humRC(r);const n=r.t.length,b=r.b==null?1:r.b;return b+1<n?humMix(humRC(r),humRC(r,1),.2):humRC(r)}

/* ---- per look: the body spec (race, sex, colours, proportions), computed once ---- */
function humSpec(L){if(L.hs)return L.hs;const S=L.S,A=S.A||(S.A=usArmor(S)),bd=S.b||US_BUILD.human,big=!!bd.big;
 const race=L.key[0]!=='m'?'':S.b===US_BUILD.dwarf?'dwarf':S.b===US_BUILD.halforc?'halforc':S.b===US_BUILD.elf?'elf':'human',orc=race==='halforc',dw=race==='dwarf',el=S.ears==='elf'&&!orc&&!dw,fem=!!S.fem;
 const sk=S.skin||usSkin(['s','t','u','i']),skin=humMix(humRC(sk),humRC(sk,-1),.38);
 const C={skin,body:S.armor==='bare'?skin:humLit(A.body)};
 const sc=big?1.3:bd===US_BUILD.knight?1.04:1,legk=bd===US_BUILD.dwarf&&!dw?.74:1;
 const hs={S,A,C,el,orc,dw,race,fem,sc,legk,big};
 L.hs=hs;return hs}
/* a scratch canvas for tinting a layer (73q-parts2.js) */
const HUM_TMP={c:null};
function humTmp(w,h){let c=HUM_TMP.c;if(!c){c=HUM_TMP.c=document.createElement('canvas')}if(c.width<w||c.height<h){c.width=Math.max(c.width,w);c.height=Math.max(c.height,h)}const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.clearRect(0,0,c.width,c.height);return c}
/* ---- weapons: family + size + materials from the sprite weapon (usWdef) ---- */
const HUM_CELL=15;                  // SU per weapon cell (one art px of the old sprite weapon)
const HUM_WF=[[/^(knife|rondel|tanto|yoroidoshi|kunai|dagger|stiletto|dirk|fang)/,'dagger'],[/^(katana|wakizashi|nodachi|odachi|sica|scimitar|sabre|saber|falchion|tachi)/,'curved'],
 [/^(greatsword|zweihander|runegreat|tyrblade|claymore|flamberge)/,'great'],[/^(shortsword|arming|runeblade|riftedge|gladius|spatha|sword|longsword)/,'sword'],
 [/^(greataxe|lordaxe)/,'greataxe'],[/^(handaxe|waraxe|axe|hatchet)/,'axe'],[/^(warmaul|maul|sledge)/,'maul'],[/^(warhammer|pickhammer|hammer|pick)/,'hammer'],[/^(mace|flail|morning)/,'mace'],[/^(club|cudgel)/,'club'],
 [/^(trident)/,'trident'],[/^(pike|spear|warspear|suyari|jumonji|omiyari|lance|javelin)/,'spear'],[/^(halberd|poleaxe)/,'halberd'],[/^(bill|billhook)/,'bill'],[/^(glaive|naginata|voulge)/,'glaive'],
 [/^(focus)/,'orb'],[/^(staff|shamstaff|necstaff|voidstaff|bo)/,'staff'],[/^(shortbow|warbow|hankyu|yumi|daikyu|longbow|recurve|bow)/,'bow'],[/^(xbow|arbalest|crossbow)/,'xbow'],[/^(pistol)/,'pistol'],[/^(musket|arquebus)/,'musket']];
const HUM_WT={dagger:'dagger',sword:'sword',axe:'axe',mace:'mace',spear:'spear',bow:'bow',staff:'staff',hammer:'hammer',polearm:'halberd',greatsword:'great',crossbow:'xbow',flintlock:'pistol',throwing:'dagger',fist:'fist'};
function humWBase(id){id=String(id||'').replace(/\*/g,'').replace(/:L$/,'');if(typeof US_CRW==='object'&&US_CRW[id])return humWBase(US_CRW[id].b);if(typeof US_LGW==='object'&&US_LGW[id])return humWBase(US_LGW[id].b);return id}
function humWFam(W){if(!W||W.cls==='fist'||(!W.c||!W.c.length)&&W.cls!=='bow')return'fist';const b=humWBase(W.id);
 if(b.slice(0,2)==='g:'){const p=b.split(':'),wt=p[1],two=p[2]==='1';if(wt==='axe')return two?'greataxe':'axe';if(wt==='hammer')return two?'maul':'hammer';if(wt==='sword')return two?'great':/sabre|saber|scim|falch|curv/.test(b)?'curved':'sword';if(wt==='flintlock')return two?'musket':'pistol';if(wt==='throwing')return/axe|francisca|hurlbat/.test(b)?'axe':/hammer/.test(b)?'hammer':/jav|pil/.test(b)?'spear':'dagger';if(wt==='polearm')return/glaive|voulge|naginata/.test(b)?'glaive':/bill/.test(b)?'bill':'halberd';return HUM_WT[wt]||'sword'}
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
 {const B=o.back,gl=fam==='great'?Math.max(B,40):fam==='dagger'?Math.max(18,B*.8):Math.max(26,B);o.gripC=fam==='dagger'||fam==='sword'||fam==='great'||fam==='curved'?-gl/2:0}   // where the hand closes, along the weapon (73m-skel.js, part sheets)
 HUM_WI.set(W,o);return o}

/* ---- poses: body space (x forward, y down, SU), hands relative to their own shoulder; wa the weapon angle (deg, 0 forward, -90 up) ---- */
function humWCls(fam,W){return fam==='bow'?'bow':fam==='xbow'||fam==='pistol'||fam==='musket'?'gun':fam==='dagger'?'dagger':fam==='fist'?'fist':fam==='staff'||fam==='orb'?'staff':
 fam==='spear'||fam==='trident'||fam==='halberd'||fam==='bill'||fam==='glaive'?'thrust':fam==='great'||fam==='greataxe'||fam==='maul'||(W&&W.two&&W.cls==='two')?'two':'swing'}
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
/* hx false: the bow body only (the skeleton draws the string and the arrow live, humDrawBowString) */
function humDrawBowString(g,wi,draw,arrow,hx){const n=Math.max(5,wi.bow||6),H=n*22+30,bend=draw?30:18,sx=draw&&hx!=null?hx:-6;g.strokeStyle=wi.str||'#ece4d2';g.lineWidth=2.5;g.lineCap='round';g.beginPath();g.moveTo(-4,-H+6);g.lineTo(sx,0);g.lineTo(-4,H-6);g.stroke();
 if(arrow){const ax=sx;humSh(g,humPoly([ax,-2.5,bend+46,-2.5,bend+46,2.5,ax,2.5]),'#c8a070',{lw:4});humSh(g,humPoly([bend+42,-8,bend+62,0,bend+42,8]),'#c0c8d0',{lw:4});humSh(g,humPoly([ax-2,-2,ax+16,-10,ax+18,-2]),humHex('g'),{lw:3})}}
function humDrawBow(g,wi,draw,arrow,hx){const n=Math.max(5,wi.bow||6),H=n*22+30,bend=draw?30:18,bc=wi.bowc||(n>=7?humHex('a'):humHex('i'));humBBp(g,0,-H,10);humBBp(g,0,H,10);humBBp(g,bend+10,0,10);humBBp(g,hx!=null&&hx!==false?hx:-40,0,10);
 const sx=draw&&hx!=null&&hx!==false?hx:-6;if(hx!==false){g.strokeStyle='#ece4d2';g.lineWidth=2.5;g.beginPath();g.moveTo(-4,-H+6);g.lineTo(sx,0);g.lineTo(-4,H-6);g.stroke()}
 const rc=wi.recurve?12:0,path=humP(p=>{p.moveTo(-4-rc,-H);p.quadraticCurveTo(bend*2.2,-H*.55,bend,0);p.quadraticCurveTo(bend*2.2,H*.55,-4-rc,H)});
 g.strokeStyle=HUM_INK;g.lineWidth=HUM_LW+9;g.lineCap='round';g.stroke(path);g.strokeStyle=bc;g.lineWidth=9;g.stroke(path);g.strokeStyle=humLt(bc,.3);g.lineWidth=3;g.save();g.translate(-2,-2);g.stroke(path);g.restore();
 if(wi.wrap){g.strokeStyle=wi.wrap;g.lineWidth=9;g.beginPath();g.moveTo(bend+1,-14);g.lineTo(bend+1,14);g.stroke()}
 if(arrow&&hx!==false){const ax=sx;humSh(g,humPoly([ax,-2.5,bend+46,-2.5,bend+46,2.5,ax,2.5]),'#c8a070',{lw:4});humSh(g,humPoly([bend+42,-8,bend+62,0,bend+42,8]),'#c0c8d0',{lw:4});humSh(g,humPoly([ax-2,-2,ax+16,-10,ax+18,-2]),humHex('g'),{lw:3})}}

/* ---- shields: family outline, field + device + rim + boss (front), planks and a strap (back) ---- */
const HUM_SHS={buckler:[42,42],targe:[60,60],round:[66,66],spiked:[66,66],heater:[62,74],kite:[58,96],tower:[66,100],pavise:[74,110]};
function humShPath(fam,s){const [w,h]=HUM_SHS[fam]||HUM_SHS.round;if(fam==='buckler'||fam==='targe'||fam==='round'||fam==='spiked')return humCirc(0,0,w*s);
 if(fam==='heater')return humP(p=>{p.moveTo(-w*s,-h*s);p.lineTo(w*s,-h*s);p.lineTo(w*s,-h*.1*s);p.quadraticCurveTo(w*.9*s,h*.7*s,0,h*s);p.quadraticCurveTo(-w*.9*s,h*.7*s,-w*s,-h*.1*s);p.closePath()});
 if(fam==='kite')return humP(p=>{p.moveTo(-w*s,-h*.62*s);p.quadraticCurveTo(0,-h*s*1.05,w*s,-h*.62*s);p.quadraticCurveTo(w*s,0,0,h*s);p.quadraticCurveTo(-w*s,0,-w*s,-h*.62*s);p.closePath()});
 return humP(p=>humRR(p,-w*s,-h*s,2*w*s,2*h*s,fam==='pavise'?10:22))}
function humDrawShield(g,look,colR,front,crack){const fam=usShFam(look),V=usShVar(look),[w,h]=HUM_SHS[fam]||HUM_SHS.round,col=n=>n==='c'?humLit(colR||usCloth('red')):n==='white'?'#e8e4da':n==='none'?null:humLit(USR[n]||USR.wood);
 humBBp(g,-w,-h,8);humBBp(g,w,h,8);const P=humShPath(fam,1),field=col(V.field)||humLit(usCloth('red')),alt=col(V.alt||'white')||'#e8e4da',rim=col(V.rim),boss=V.boss&&V.boss!=='none'&&V.boss!=='spike'?col(V.boss):null;
 if(!front){   // the inside: planks (or plain metal / leather lining), battens, the rim, enarmes or a centre grip; no device, no boss face
  const met=V.field==='steel',lea=V.field==='leather',base=met?'#aab3bc':lea?'#8b5a34':'#a5733f',round=fam==='buckler'||fam==='targe'||fam==='round'||fam==='spiked';
  humSh(g,P,base,{dk:.18,lw:0});g.save();g.clip(P);g.strokeStyle=humDk(base,.38);g.lineWidth=3;
  if(!met&&!lea)for(let x=-w+16;x<w;x+=17){g.beginPath();g.moveTo(x,-h);g.lineTo(x,h);g.stroke()}
  if(lea){g.fillStyle=humDk(base,.15);for(let y=-h+10;y<h;y+=16)for(let x=-w+10+((y/16|0)&1)*8;x<w;x+=16){g.beginPath();g.arc(x,y,2.4,0,7);g.fill()}}
  if(!round)for(const y of[-h*.45,h*.45])humInkLine(g,[-w,y,w,y],humDk(base,.12),10);
  g.restore();
  if(rim){g.lineWidth=HUM_LW+9;g.strokeStyle=HUM_INK;g.stroke(P);g.lineWidth=8;g.strokeStyle=humDk(rim,.15);g.stroke(P)}else{g.lineWidth=HUM_LW;g.strokeStyle=HUM_INK;g.stroke(P)}
  const strap='#5e3b22';
  if(round){humSh(g,humCirc(0,0,fam==='buckler'?12:16),humDk(base,.35),{dk:.1,lw:5});humInkLine(g,[-w*.28,0,w*.28,0],strap,9);if(fam!=='buckler')humInkLine(g,[-w*.62,-h*.35,-w*.62,h*.35],strap,8)}
  else{humInkLine(g,[-w*.55,-h*.22,w*.4,-h*.12],strap,9);humInkLine(g,[-w*.15,h*.12,w*.5,h*.2],strap,9);g.fillStyle=humHex('c');for(const [x,y] of[[-w*.55,-h*.22],[w*.4,-h*.12],[-w*.15,h*.12],[w*.5,h*.2]]){g.beginPath();g.arc(x,y,3.5,0,7);g.fill()}}
  return}
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

/* ---- the vector beard (elves at Detail High, 73q-parts2.js): head space (origin the skull centre, R its radius, forward +x) ---- */
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
/* ---- a company emblem in 16x16 cells (the title screen's banner) ---- */
function humEmblem(g,key,x,y,s,col){const E=typeof EMBLEMS==='object'?(EMBLEMS[key]||EMBLEMS.swords):null;if(!E||!E.r)return;const R=E.r,c=s/16;
 for(let j=0;j<16;j++){const row=R[j];for(let i=0;i<16;i++){const ch=row[i];if(ch==='#'||ch==='+'||ch==='-'||ch==='l'){g.fillStyle=ch==='+'||ch==='l'?humLt(col,.25):ch==='-'?humDk(col,.25):col;g.fillRect(x-s/2+i*c-.3,y-s/2+j*c-.3,c+.6,c+.6)}}}}
/* ---- the frame builder ---- */
const HUM_SPK={mana:'#7ab8ff',aura:'#ffe27a',qi:'#7affd0',chi:'#ff9a5a',hex:'#c87aff',void:'#b07aff',ice:'#a8e8ff',fire:'#ffb040'};
/* humBuild (one baked frame) and the live figure are in 73m-skel.js: the skeleton, its slots and its animations */
/* frame memory: the frames of every look share one budget; the oldest built are dropped (rebuilt on demand) */
function humKeep(L,i,o){if(!o||!o.hum||!o.cv)return o;const b=o.cv.width*o.cv.height*4;HUM.fifo.push([L,i,o,b]);HUM.live=(HUM.live||0)+b;
 while(HUM.live>HUM.cap&&HUM.fifo.length>1){const e=HUM.fifo.shift();HUM.live-=e[3];if(e[0].fr[e[1]]===e[2])e[0].fr[e[1]]=null}return o}
/* the height of the figure's head top above the feet (art px), for the bars and statuses: unitSpriteBox */
function humBoxH(L){const hs=humSpec(L);return Math.round((typeof p2On==='function'&&p2On()?(hs.race==='dwarf'?29:33):30)*hs.sc)}   // the part-sheet figures (73q-parts2.js) stand a little taller in their helmets
