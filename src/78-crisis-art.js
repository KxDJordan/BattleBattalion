/* ================= CRISIS ART (crises agent): battle figures of the crisis peoples, the Bone Throne, item and crisis icons =================
   Humanoids (barbarians, the horde's standard-bearer and warchief, grave knights, necromancer lieutenants) draw with the humanoid rig of
   73-units.js: CR_LOOKS[id](h) -> a spec for usHuman, read by usEnemySpec in 73-units.js.
   The war hound is the direwolf rig. The Bone Throne is a monster kind of 76-monsters.js (MSK / MSD / MS_ID 'bthrone').
   Icons: it-<trophy> for the four victory trophies, cr-<crisis key> for the crisis sheets and the map legend. PAL colours only. */
const CR_LOOKS={
 barbz:h=>({b:h.B.brute,skin:h.sk('tan'),armor:'bare',hair:'mohawk',hairR:h.hr('K'),beard:'full',beardR:h.hr('K'),brow:1,paint:'x',wd:usWdef('greataxe'),nobelt:0}),
 barbax:h=>({b:h.B.human,skin:h.sk('fair'),armor:'leather',hat:'furcap',hair:'tail',hairR:h.hr('I'),beard:'short',beardR:h.hr('I'),wd:usWdef('handaxe')}),
 barbskald:h=>({b:h.B.slim,skin:h.sk('fair'),armor:'fur',hat:'band',hatR:h.C('blue'),hair:'mane',hairR:h.hr('W'),beard:'long',beardR:h.hr('W'),beads:'x',wd:usWdef('staff'),cape:h.C('blue')}),
 barbhus:h=>({b:h.B.knight,skin:h.sk('fair'),armor:'mail',hat:'spangen',beard:'full',beardR:h.hr('I'),wd:usWdef('waraxe'),shield:'round',shR:h.C('blue'),cape:h.C('blue'),Aov:{paul:h.R.iron}}),
 emperor:h=>{const R=h.R;return{b:h.B.lord,skin:h.sk('fair'),armor:'scale',hat:'crown',beard:'long',beardR:h.hr('W'),hair:'mane',hairR:h.hr('W'),wd:usWdef('lordaxe'),ws:2,cape:h.C('blue'),trimR:R.gold,eye:'x',
  Aov:{body:R.steel,up:.5,fore:R.iron,leg:R.iron,boot:R.dleather,paul:R.steel,joint:1},
  mid:c=>{if(c.lie)return;const y=c.ty;usPart();for(let x=c.x0-1;x<=c.x1+1;x++)for(let j=-1;j<=2;j++){if(j===2&&((x+c.x0)&1))continue;if(j===-1&&(x<c.x0+2||x>c.x1-2))continue;usP(x,y+j,R.white,((x*7+j*5)%6<2)?1:((x*3+j*7)%5===0?-1:0))}}}},
 hstd:h=>({b:h.B.orc,skin:h.sk('dorc'),ears:'orc',tusk:1,brow:1,eye:'g',armor:'mail',hat:'nasal',wd:usWdef('spear'),Aov:{paul:h.R.iron},spike:1,
  back:c=>{if(c.lie)return;const x=c.v?c.x1+2:c.x0-2,R=h.R,top=c.ty-22;usPart();for(let y=top;y<=c.ty+c.S.b.th+6;y++)usP(x,y,R.wood,0);usPart();const d=c.v?-1:1;
   for(let j=0;j<9;j++)for(let i=1;i<=7;i++){if(j>6&&(i+j)%3===0)continue;usP(x+d*i,top+1+j+((i>>1)&1?0:0),R.red,j===0?1:(i===7?-1:0))}
   usPart(1);usP(x+d*3,top+4,R.bone);usP(x+d*4,top+4,R.bone);usP(x+d*3,top+5,R.bone);usP(x+d*4,top+5,R.bone);usF(x+d*3,top+5,'0');usF(x+d*5,top+3,'l')}}),
 hchief:h=>{const S=h.f0('orcl');return Object.assign(S,{cape:h.C('verd'),hat:'horns',hornR:h.R.bone,paint:'f'})},
 gknight:h=>{const S=h.f0('skel');return Object.assign(S,{b:h.B.knight,armor:'plate',hat:'great',wd:usWdef('greatsword'),shield:null,cape:h.C('night'),Aov:{body:h.R.iron},eye:'6'})},
 necrolt:h=>{const S=h.f0('necro');return Object.assign(S,{robeC:'black',hatR:h.C('black'),trim:h.R.gold,cape:h.C('purple'),eye:'6',beads:'6'})},
 barbhound:()=>({kind:'quad',Q:US_WOLF})
};
// the humanoid rig (73-units.js usEnemySpec) asks CR_LOOKS itself

/* ---- the Bone Throne: a monster figure (76-monsters.js part grid). A crowned skeleton king grown into a throne of bones. ---- */
const CR_BT={bone:usRamp('nmlr',2),dbone:usRamp('pnml',1),iron:usRamp('0Gop',1),gold:usRamp('bcde',2),robe:usRamp('1GD',1),glow:usRamp('56Z',1)};
function msBthrone(v,st,fr){const B=CR_BT,dead=st==='death'&&fr>=1,lie=st==='death'&&fr===2,cast=st==='cast'||(st==='attack'&&fr!==2),lean=st==='attack'&&fr===1?2:0,hit=st==='hit'?-1:0,bob=st==='idle'&&fr===1?1:0;
 const tx=(x,y)=>((x*5+y*3)%7===0)?-1:((x+y*2)%9===0)?1:0;
 // the throne: a heap of skulls and long bones, a high back of ribs
 usPart();msPoly([[-22,0],[-19,-7],[-14,-11],[14,-11],[19,-7],[22,0]],B.dbone,tx);
 for(let i=0;i<9;i++){const sx=-18+i*4.5,sy=-3-((i*7)%3);usPart();msE(sx,sy,2.4,2.1,B.bone,tx);usF(Math.round(sx-1),Math.round(sy),'0');usF(Math.round(sx+1),Math.round(sy),'0')}
 if(!lie){usPart();msPoly([[-13,-11],[-12,-34],[-9,-42],[-4,-46],[4,-46],[9,-42],[12,-34],[13,-11]],B.dbone,(x,y)=>((y&3)===0)?-1:0);
  for(let y=-40;y<=-14;y+=4){usPart(1);for(let x=-11;x<=11;x++)if(Math.abs(x)>2)usP(x,y,B.bone,(x&1)?0:1)}
  usPart(1);for(const [x,y] of [[-12,-44],[12,-44],[-8,-48],[8,-48],[0,-49]]){msE(x,y,2.2,2,B.bone,0);usF(x-1,y,'0');usF(x+1,y,'0')}
  // the seat and the arms
  usPart();msPoly([[-15,-11],[-15,-18],[15,-18],[15,-11]],B.bone,tx);for(const s of[-1,1]){usPart();msPoly([[s*13,-18],[s*17,-19],[s*17,-25],[s*13,-24]],B.bone,tx);usF(s*17,-26,'0')}}
 if(dead){usPart(1);for(let i=0;i<6;i++)usP(-10+i*4,-12-(i&1),B.bone,1);return}
 // the king: robed, crowned, a staff of black iron
 const kx=lean,ky=-18+bob+hit;usGrp=2;usPart();msPoly([[kx-7,ky],[kx-6,ky-14],[kx-3,ky-17],[kx+3,ky-17],[kx+6,ky-14],[kx+7,ky]],B.robe,(x,y)=>((x+y)%5===0)?1:0);
 usPart(1);for(let y=ky-15;y<=ky-4;y+=3)for(let x=kx-3;x<=kx+3;x++)if(x!==kx)usP(x,y,B.bone,0);usP(kx,ky-10,B.gold,1);
 const hx=kx+(v?0:1),hy=ky-22;usPart(2);msE(hx,hy,4,4.2,B.bone,0);usF(hx-2,hy,cast?'Z':'6');usF(hx+1,hy,cast?'Z':'6');usF(hx-1,hy+2,'0');usF(hx,hy+3,'0');usF(hx-2,hy+3,'0');usF(hx+1,hy+3,'0');
 usPart(2);for(let x=-4;x<=4;x++)usP(hx+x,hy-4,B.gold,0);for(const x of[-4,-1,2,4])usP(hx+x,hy-5,B.gold,1);usP(hx-1,hy-6,B.gold,1);usP(hx+2,hy-6,B.gold,1);usF(hx,hy-4,'E');
 // arms on the armrests, one raised with the staff when it casts or strikes
 for(const s of[-1,1]){const ax=kx+s*7,ay=ky-12,up=s===1&&cast;usPart(2);const ex=ax+s*(up?3:5),ey=up?ay-6:ay+5;msL(ax,ay,ex,ey,B.bone,0);msL(ex,ey,ex+s,ey+(up?-3:2),B.bone,0)}
 {const sx=kx+(cast?11:12),sy0=cast?ky-34:ky-26;usPart(2);msL(sx,sy0,sx-1,ky+1,B.iron,0);usPart(2);msE(sx,sy0-1,2.2,2.2,B.glow,0);if(cast){usF(sx,sy0-4,'Z');usF(sx-3,sy0-1,'6');usF(sx+3,sy0-1,'6')}}
 usGrp=0}
if(typeof MSK==='object'&&MSK){MSK.bthrone={g:[72,72,36,62],big:1,top:56,wide:16,kbImm:1};if(typeof MSD==='object')MSD.bthrone=msBthrone;if(typeof MS_ID==='object')MS_ID.bthrone='bthrone'}

/* ---- icons: 16x16 rows, PAL keys, '.' clear; _icOutline adds the 1px '0' outline ---- */
const CR_IC={
 'it-crshard':['................','................','.......l........','......lFl.......','......xFx.......','.....xFrFx......','.....XFFFX......','....XxFrFxX.....','....XxFFFxX.....','.....XxFxX......','.....XxFxX......','......XFX.......','......XxX.......','.......X........','................','................'],
 'it-crbonecrown':['................','................','................','..d..d...d..d...','..dd.dd.dd.dd...','..dddddddddd....','..nnnnnnnnnnn...','..nm0nnmnn0mn...','..nnnnnnnnnnn...','..mnm0nmn0mnm...','..nnnnnnnnnnn...','...mmmmmmmmm....','................','................','................','................'],
 'it-crwartusk':['................','................','...........n....','..........nm....','.........nml....','........nml.....','.......nml......','......nmlm......','.....nmlmm......','....nmmmm.......','...nmmmm........','..jmmmm.........','..jjjm..........','..jj............','................','................'],
 'it-crempcrown':['................','................','................','................','..c..c..c..c....','..cc.cc.cc.cc...','..cXcxcFcXcxc...','..ccccccccccc...','..dcdXdcdXdcd...','..ddddddddddd...','...ddddddddd....','................','................','................','................','................'],
 'cr-sunder':['................','................','......DDDD......','....DDCCCCDD....','...DCCrrrrCCD...','...DCr0000rCD...','..DCr00GG00rCD..','..DCr0GDDG0rCD..','..DCr0GDDG0rCD..','..DCr00GG00rCD..','...DCr0000rCD...','...DCCrrrrCCD...','....DDCCCCDD....','......DDDD......','................','................'],
 'cr-deadmarch':['................','................','.....nnnnnn.....','....nmmmmmmn....','...nmmmmmmmmn...','...nm00mm00mn...','...nm00mm00mn...','...nmmm00mmmn...','....nmmmmmmn....','.....n0n0n0.....','.....nnnnnn.....','................','....lll.lll.....','.....lmlml......','....lll.lll.....','................'],
 'cr-horde':['................','................','..j.........j...','..jj.......jj...','..wjj.....jjw...','..ww4444444ww...','...4wwwwwww4....','...4w00w00w4....','...4wwwwwww4....','...4wnwwwnw4....','....4wnwnw4.....','.....44444......','................','................','................','................'],
 'cr-barbarian':['................','................','.......p........','......ppp.......','.....pqqqp......','....pqqqqqp.....','...ppqqqqqpp....','...p.pqqqp.p....','.....ppqpp......','.......j........','.......j........','.......j........','.......j........','.......j........','.......k........','................']
};
if(typeof ICONS==='object'&&typeof _icOutline==='function')for(const k in CR_IC){try{ICONS[k]=_icOutline(CR_IC[k])}catch(e){}}
