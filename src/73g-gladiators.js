/* ================= GLADIATOR LOOKS: their gear on the battle figures, their portraits, the arena school's fighters =================
   Everything here is drawn on the part grid of 73-units.js (so 73h-unitshd.js paints it at Detail High like every other figure, and the
   16 px item icons come from the same drawings: icItemRows -> usWeaponIconRows / usShieldIconRows / usArmorIconRows / usHelmIconRows).
     weapons  gladius gladius2 spatha sica trident fuscina cestus cestus2: usWdef cases (a wrapper; US_WHAND maps the items' looks)
     helmets  galea (a crested bowl), thraex (the griffin crest, a broad brim and a grille), murm (the murmillo's fish crest, brim and grille):
              usHat cases (a wrapper), US_HV maps the items; the portraits get the same three through a ptHat wrapper
     armor    manica (bare chest, a steel arm guard, a red loincloth, a greave), harness (and a belt and shoulder guard), champharness (a bronze
              cuirass over the same): US_AV entries (bare: the body and arms in skin, bareLeg: bare legs)
     shields  roundparma (a round parma, brass rings), towerscutum (the great red scutum with its brass boss and bands): US_SHV variants
   The arena school's fighters (EN gmurm gret gthrax gsecu gchamp): usEnemySpec0 and ptEnemyRows cases (wrappers). No rnd(). */
Object.assign(US_WHAND,{gladius:'gladius',gladius2:'gladius2',spatha:'spatha',sica:'sica',trident:'trident',fuscina:'fuscina',cestus:'cestus',cestus2:'cestus2'});
{const u0=usWdef;usWdef=function(id){if(US_W[id])return US_W[id];const S=USR,c=[],add=(i0,i1,o0,o1,r,g,b)=>{for(let i=i0;i<=i1;i++)for(let o=o0;o<=o1;o++)c.push([i,o,r,b|0,g])};let cls='swing',tip=8,two=0,h2=0;
  switch(id){
   case'gladius':case'gladius2':{const G2=id==='gladius2',hl=G2?S.gold:S.brass;add(-2,-2,0,0,hl,0);c.push([-2,1,hl,1,0]);add(-1,0,0,0,G2?S.red:S.dwood,0);add(1,1,-1,1,hl,1);add(2,6,0,1,G2?S.ice:S.plate,2);c.push([7,0,G2?S.ice:S.plate,1,2],[7,1,S.plate,0,2],[8,0,S.plate,1,2]);tip=8;break}
   case'spatha':add(-2,-2,0,0,S.brass,0);c.push([-2,1,S.brass,1,0]);add(-1,0,0,0,S.dleather,0);add(1,1,-1,1,S.brass,1);add(2,10,0,1,S.plate,2);c.push([11,0,S.plate,1,2]);tip=11;break;
   case'sica':add(-1,0,0,0,S.dwood,0);c.push([-2,0,S.iron,0,0]);add(1,1,0,1,S.iron,1);for(let i=2;i<=8;i++){const o=i<5?0:i<7?1:2;c.push([i,o,S.plate,i===8?1:0,2]);if(i<7)c.push([i,o+1,S.steel,-1,2])}tip=8;break;
   case'trident':case'fuscina':{const F=id==='fuscina';add(-6,10,0,0,S.dwood,0);c.push([-6,0,S.iron,0,0]);add(11,11,-2,2,F?S.brass:S.iron,1);for(const o of [-2,0,2]){add(12,o?15:16,o,o,S.plate,2);c.push([o?16:17,o,S.plate,1,2])}if(F){c.push([14,-3,S.plate,0,2],[14,3,S.plate,0,2]);c.push([10,0,S.brass,0,1])}tip=17;cls='thrust';break}
   case'cestus':case'cestus2':{const K=id==='cestus2';c.push([0,0,S.leather,0,0],[0,1,S.leather,-1,0],[1,0,K?S.steel:S.iron,1,1],[1,1,K?S.steel:S.iron,0,1]);if(K)c.push([2,0,S.plate,1,2],[2,1,S.plate,0,2]);cls='fist';tip=K?2:1;break}
   default:return u0(id)}
  c.sort((a,b)=>a[4]-b[4]);return US_W[id]={id,c,cls,two,h2,tip,gem:null,bow:0,reach:false}}}
/* helmets */
Object.assign(US_HV,{galea:'galea',thraexhelm:'thraex',murmhelm:'murm'});
{const h0=usHat;usHat=function(S,v,x0,y0,er){const t=S.hat;if(t!=='galea'&&t!=='thraex'&&t!=='murm')return h0(S,v,x0,y0,er);const b=S.b,hw=b.hw,hh=b.hh,R=USR,M=t==='murm'?R.steel:R.brass,front=v?-99:hw-1,a=hw>>1;
  usPart();for(let x=1;x<hw-1;x++)usP(x0+x,y0-1,M,1);for(let y=0;y<=1;y++)for(let x=0;x<hw;x++)usP(x0+x,y0+y,M,y?-1:0);   // the bowl
  if(t==='galea'){usPart();for(let y=2;y<=er+2;y++){usP(x0-1,y0+y,M,-1);if(v)usP(x0+hw,y0+y,M,-1)}if(v===0){for(let y=er-1;y<=er+2;y++)usP(x0+hw-1,y0+y,M,-1)}   // cheek and neck guards
   usPart();for(let x=1;x<hw-1;x++){usP(x0+x,y0-2,R.red,x<a?1:0);if(x>1&&x<hw-2)usP(x0+x,y0-3,R.red,1)}usP(x0+a,y0-4,R.red,1);return}
  // a broad brim
  usPart();for(let x=-2;x<=hw+1;x++)usP(x0+x,y0+2,M,x<0||x>=hw?-1:0);
  if(v===0){usPart();for(let y=3;y<=er+3&&y<hh;y++)for(let x=hw-4;x<=hw-1;x++)usP(x0+x,y0+y,M,((x+y)&1)?-1:0);for(let y=3;y<=er+2&&y<hh;y++)for(const x of [hw-3,hw-1])usF(x0+x,y0+y,'0')}   // the grille over the face
  else{usPart();for(let y=3;y<=er+1;y++)for(let x=0;x<hw;x++)usP(x0+x,y0+y,M,-1)}
  usPart();if(t==='thraex'){usP(x0+a,y0-2,R.brass,1);usP(x0+a+1,y0-3,R.brass,1);usP(x0+a+2,y0-3,R.red,1);usP(x0+a+3,y0-2,R.red);usP(x0+a-1,y0-2,R.brass)}   // the griffin's head and its red plume
  else{for(let x=1;x<hw-1;x++){usP(x0+x,y0-2,M,1);if(x>2&&x<hw-2)usP(x0+x,y0-3,M,x===a?1:0)}usP(x0+a,y0-4,M,1);usP(x0+a+1,y0-4,M)}   // the fish crest
 }}
/* armor */
Object.assign(US_AV,{manica:{k:'leather',bare:1,bareLeg:1,A:{fore:'steel',skB:'red',shin:'brass',boot:'dleather'},nobelt:0},
 harness:{k:'leather',bare:1,bareLeg:1,A:{fore:'steel',skB:'red',shin:'brass',paul:'brass',boot:'dleather'},tex:'studs'},
 champharness:{k:'plate',A:{body:'brass',fore:'steel',paul:'gold',shin:'brass',skB:'red',boot:'dleather',leg:'brass'},trim:'gold'}});
{const a0=usArmor;usArmor=function(S){const A=a0(S),V=S.av;if(V&&V.bare){A.body=S.skin;A.slv=S.skin;A.up=1}if(V&&V.bareLeg)A.leg=S.skin;return A}}
/* shields */
Object.assign(US_SHV,{roundparma:{dev:'rings',field:'c',rim:'brass',boss:'brass',alt:'brass'},towerscutum:{dev:'bands',field:'c',rim:'brass',boss:'brass',alt:'brass'}});
/* the arena school (FACT.pit, 11-gladiators.js) */
const GL_LOOK={
 gmurm:h=>({b:h.B.brute,skin:h.sk('tan'),armor:'leather',av:usArmorV('manica'),hat:'murm',wd:usWdef('gladius'),shield:'towerscutum',shR:h.C('red'),brow:1}),
 gret:h=>({b:h.B.slim,skin:h.sk('fair'),armor:'leather',av:usArmorV('manica'),hair:'short',hairR:h.hr('H'),beard:'short',wd:usWdef('trident'),brow:1}),
 gthrax:h=>({b:h.B.human,skin:h.sk('fair'),armor:'leather',av:usArmorV('harness'),hat:'thraex',wd:usWdef('sica'),shield:'roundparma',shR:h.C('green')}),
 gsecu:h=>({b:h.B.brute,skin:h.sk('tan'),armor:'leather',av:usArmorV('harness'),hat:'galea',wd:usWdef('gladius'),shield:'towerscutum',shR:h.C('blue'),brow:1}),
 gchamp:h=>({b:h.B.knight,skin:h.sk('fair'),armor:'plate',av:usArmorV('champharness'),hat:'murm',wd:usWdef('spatha'),shield:'towerscutum',shR:h.C('red'),cape:h.C('red'),ws:1,brow:1})};
{const e0=usEnemySpec0;usEnemySpec0=function(id,u){const L=GL_LOOK[id];if(!L)return e0(id,u);const SK=typeof PT_SKIN!=='undefined'?PT_SKIN:{},HC=typeof PT_HAIRC!=='undefined'?PT_HAIRC:{};
  const h={B:US_BUILD,R:USR,C:usCloth,sk:n=>usSkin(SK[n]||['s','t','u','i']),hr:n=>usHairR(HC[n]||['0','G','o'])};return Object.assign({kind:'hum',seed:id.length*17+3,b:US_BUILD.human,skin:h.sk('fair'),armor:'rags',wd:usWdef('fist')},L(h))}}
/* portraits: the three helmets on a bust (over a kettle or barbute drawn by ptHat), and the school's fighters */
if(typeof ptHat==='function'){const p0=ptHat;ptHat=function(L,P,E){const t=P.hat;if(t!=='galea'&&t!=='thraex'&&t!=='murm')return p0(L,P,E);const ey=P.ey||14,y0=E.y0;
  P.hat=t==='galea'?'kettle':'barbute';try{p0(L,P,E)}finally{P.hat=t}
  const br=['b','c','d','e'],st=['o','p','q','r'],M=t==='murm'?st:br;
  for(let y=y0-3;y<ey-2;y++)for(let x=4;x<28;x++){const k=ptG(L,x,y);const i=['o','p','q','r'].indexOf(k);if(i>=0&&t!=='murm')ptS(L,x,y,br[i])}   // bronze where the base helm is steel
  if(t==='galea'){for(let x=11;x<=20;x++){ptS(L,x,y0-5,x<16?'h':'g');ptS(L,x,y0-6,x<16?'g':'f')}for(let x=13;x<=18;x++)ptS(L,x,y0-7,'h');ptS(L,15,y0-8,'h');ptS(L,16,y0-8,'g');return}
  for(let x=4;x<=27;x++)ptS(L,x,ey-3,x<16?M[2]:M[1]);ptH(L,5,26,ey-2,M[0]);   // the brim
  for(let y=ey-1;y<=ey+5;y++)for(let x=11;x<=20;x++){ptS(L,x,y,(x===12||x===15||x===18)?M[3]:(y===ey+1||y===ey+4)?M[2]:'0')}   // the grille
  if(t==='thraex'){for(const [x,y,k] of [[17,y0-5,M[2]],[18,y0-6,M[3]],[19,y0-7,M[2]],[20,y0-7,'g'],[21,y0-6,'g'],[22,y0-5,'f'],[16,y0-4,M[1]],[17,y0-4,M[2]]])ptS(L,x,y,k)}
  else{for(let x=12;x<=20;x++){ptS(L,x,y0-5,M[x<16?3:2]);if(x>13&&x<19)ptS(L,x,y0-6,M[2])}ptS(L,16,y0-7,M[3]);ptS(L,17,y0-7,M[2])}}}
if(typeof ptEnemyRows==='function'){const r0=ptEnemyRows;ptEnemyRows=function(id,f,co){const D=EN[id];if(!D||!D.glad||typeof ptBust!=='function'||typeof PT_HEAD==='undefined')return r0(id,f,co);
  const w=k=>{try{return typeof usWeaponPtRows==='function'?usWeaponPtRows(k):null}catch(e){return null}},sh=(lk,c)=>{try{return typeof usShieldPtRows==='function'?usShieldPtRows(lk,usRamp(PT_CLOTH[c].join(''),1)):null}catch(e){return null}};
  const base={seed:ptHash('en:'+id),bg:['f','1'],head:PT_HEAD.human,skin:PT_SKIN.fair,build:'broad',armor:'leather',face:{iris:'0',brow:3,browC:'0',nose:1,mouth:3},marks:{}};
  const S=o=>ptBust(Object.assign({},base,o));
  switch(id){
   case'gmurm':return S({skin:PT_SKIN.tan,hat:'murm',wrows:w('gladius'),shield:'towerscutum',shRows:sh('towerscutum','red'),marks:{scar:1}});
   case'gret':return S({build:'normal',hair:'short',hairC:PT_HAIRC.H,beard:'short',wrows:w('trident')});
   case'gthrax':return S({hat:'thraex',wrows:w('sica'),shield:'roundparma',shRows:sh('roundparma','green')});
   case'gsecu':return S({skin:PT_SKIN.tan,hat:'galea',wrows:w('gladius'),shield:'towerscutum',shRows:sh('towerscutum','blue')});
   case'gchamp':return S({armor:'plate',hat:'murm',wrows:w('spatha'),shield:'towerscutum',shRows:sh('towerscutum','red'),marks:{scar:2}})}
  return r0(id,f,co)}}
