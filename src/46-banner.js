/* ================= COMPANY BANNER (shell) =================
   G.banner = {name, c1, c2, emblem}: c1 (field) and c2 (border, stripe and charge) are keys of BANNERC (PAL keys), emblem a key of
   EMBLEMS. Public: BANNERC, EMBLEMS, BANNERDEF, bannerFix(b), bannerRows(banner), bannerHTML(banner,size), bannerCanvas(banner),
   bannerURL(banner,scale), emblemRows(key,c,field). Pixel art in PAL keys only; nothing here touches the game rnd() stream.
   Emblem rows: '#' charge, '+' its light, '-' its shade, '=' a cut-out showing the field's shade; the 1px '0' outline is added here. */
const BANNERC={
 '5':{n:'Verdigris',r:['7','5','6']},c:{n:'Brass',r:['b','c','d']},g:{n:'Madder',r:['f','g','h']},x:{n:'Azure',r:['X','x','F']},
 D:{n:'Violet',r:['G','D','C']},l:{n:'Bone',r:['m','l','r']},G:{n:'Sable',r:['0','G','o']},B:{n:'Forest',r:['3','B','A']},
 E:{n:'Ember',r:['K','E','y']},j:{n:'Russet',r:['i','j','k']},y:{n:'Saffron',r:['Y','y','e']},p:{n:'Steel',r:['o','p','q']}};
const BANNERDEF={name:'The Free Company',c1:'5',c2:'c',emblem:'swords'};
const EMBLEMS={
 swords:{n:'Crossed swords',r:['................','.++..........++.','.+#+........+#+.','..+#+......+#+..','...+#+....+#+...','....+#+..+#+....','.....+#++#+.....','......+##+......',
  '......+##+......','.....+#++#+.....','..-.+#+..+#+.-..','..-##+....+##-..','...-#......#-...','..-#-#....#-#-..','.-#-..........#.','................']},
 wolf:{n:'Wolf',r:['................','..........#..#..','.........##.##..','.........#####..','........+#####-.','.......+#=####-.','....+++######-..','..++#########-..',
  '.+###########-..','..-----######-..','.......+#####-..','.......+######-.','........+#####-.','.........+####-.','..........+###-.','................']},
 lion:{n:'Lion',r:['................','....#.#..#.#....','...#+#+##+#+#...','..#+########-#..','..#+#+####+#-#..','.#+#=##++##=#-#.','.#+##########-#.','.#+#+######+#-#.',
  '..#+##-##-##-#..','..#+#-====-#-#..','...#+#-==-#-#...','....#+####-#....','.....#+##-#.....','......####......','.......##.......','................']},
 tower:{n:'Tower',r:['................','...##.##.##.##..','...+#.+#.+#.+-..','...+#########-..','....+#######-...','....+###=###-...','....+###=###-...','....+#######-...',
  '....+#######-...','....+##=#=##-...','....+##=#=##-...','....+#######-...','....+##===##-...','...+###===###-..','...++#######--..','................']},
 skull:{n:'Skull',r:['................','.....######.....','...+########-...','..+##########-..','..+##########-..','..+#===##===#-..','..+#===##===#-..','..+#===##===#-..',
  '..+####=####-...','...+###=###-....','....+######-....','....+#=#=##-....','....+######-....','.....##.##......','................','................']},
 sun:{n:'Sun',r:['................','.......+#.......','..+#...+#...+#..','...+#..##..+#...','.....+####-.....','....+######-....','.++#+##++##-#--.','.+##+#+##+#-##-.',
  '....+######-....','....+######-....','.....+####-.....','...+#..##..-#...','..+#...+#...-#..','.......+#.......','................','................']},
 moon:{n:'Moon',r:['................','.....+###.......','...+###-........','..+###-.........','..+##-..........','.+###-..........','.+###-..........','.+###-..........',
  '.+###-..........','.+####-.........','..+####-.......#','..+######----##.','...+##########..','.....+######....','................','................']},
 stag:{n:'Stag',r:['................','.+.+......+.+...','.+.+..+...+.+..+','..++.+.....++.+.','...+++......+++.','....++##..##++..','......+####-....','......+#==#-....',
  '......+####-....','.......+##-.....','.......+##-.....','.......+##-.....','........##......','................','................','................']},
 raven:{n:'Raven',r:['................','.........+##....','........+####...','........+#=##++.','........+####...','.......+####....','..+++..+####....','.+#####+####-...',
  '..+##########-..','....+#########-.','......+######-..','........+###-...','........#..#....','.......##..##...','................','................']},
 oak:{n:'Oak',r:['................','.....+##.##.....','...+#####+##-...','..+##+######-#..','.+#####+######-.','.+##+#######+#-.','..+###########-.','.+#####+#####-..',
  '..+-##-####-#-..','....--+##----...','.......##-......','.......##-......','......+##-......','....++####--....','...+#-.##.-#-...','................']},
 anchor:{n:'Anchor',r:['................','.......##.......','......#==#......','......#==#......','.......##.......','....+######-....','.......##.......','.......##.......',
  '.......##.......','.+.....##.....-.','.+#....##....#-.','..+#...##...#-..','...+##.##.##-...','.....######.....','................','................']},
 crown:{n:'Crown',r:['................','................','..#....#....#...','.+#+..+#+..+#-..','..#...+#+...#...','..+#..###..#-...','..+##+###+##-...','..+#########-...',
  '..+##=##=##=#-..','..+#########-...','..----------....','..+#########-...','...+#######-....','................','................','................']},
 boar:{n:'Boar',r:['................','................','......+.+##.....','.....+#######-..','....+#########-.','...+#=########-.','..+###########-.','.l+###########-.',
  '.+-###########-.','..-+##########..','....###....###..','....##......##..','....--......--..','................','................','................']},
 rose:{n:'Rose',r:['................','......+##.......','....+#+####.....','...+#+##=###-...','..+##+#==##-#-..','..+#+#=##=#-#-..','..+##+####-##-..','...+###++###-...',
  '....+######-....','......+##-......','..++...##...--..','...++..##..--...','....+####--.....','.......##.......','................','................']},
 fleur:{n:'Fleur',r:['................','.......##.......','......+##-......','......+##-......','..++..+##-..--..','.+##+.+##-.-##-.','.+#..++##--..#-.','..+#.+####-.#-..',
  '...+########-...','....--####--....','...+#########...','....--+##---....','.....+#--#-.....','....+#-..-#-....','................','................']}
};
/* clean any banner object (old saves, tampered data) */
function bannerFix(b,name){const o=b&&typeof b==='object'?b:{},d=BANNERDEF;
 const c1=BANNERC[o.c1]?o.c1:d.c1;let c2=BANNERC[o.c2]?o.c2:d.c2;if(c2===c1)c2=c1==='c'?'5':'c';
 return{name:typeof o.name==='string'&&o.name.trim()?o.name.trim().slice(0,28):name||d.name,c1,c2,emblem:EMBLEMS[o.emblem]?o.emblem:d.emblem}}
function bnOutline(rows){const h=rows.length,w=rows[0].length,on=(x,y)=>y>=0&&y<h&&x>=0&&x<w&&rows[y][x]!=='.';
 return rows.map((r,y)=>{let s='';for(let x=0;x<w;x++)s+=on(x,y)?r[x]:(on(x-1,y)||on(x+1,y)||on(x,y-1)||on(x,y+1))?'0':'.';return s})}
/* an emblem in PAL keys: charge in ramp c ([dark,mid,light]), cut-outs in the field's shade */
function emblemRows(key,c,field){const E=EMBLEMS[key]||EMBLEMS[BANNERDEF.emblem],R=(BANNERC[c]||BANNERC.c).r,F=(BANNERC[field]||BANNERC['5']).r;
 const m={'#':R[1],'+':R[2],'-':R[0],'=':F[0],l:R[2]};return bnOutline(E.r.map(r=>r.replace(/[.]/g,'.').split('').map(ch=>ch==='.'?'.':(m[ch]||R[1])).join('')))}
/* the flag: 24 x 32 art px. A crossbar on a finial, a field of c1 with a c2 border and a band across the top, the emblem in the middle,
   a swallowtail below. When c1 and c2 are the same colour the charge is drawn in bone so it still reads. */
const BN_W=24,BN_H=32;
function bannerRows(banner){const b=bannerFix(banner),A=BANNERC[b.c1].r,Cc=b.c2===b.c1?'l':b.c2,C=BANNERC[Cc].r,g=[];
 for(let y=0;y<BN_H;y++)g.push(new Array(BN_W).fill('.'));const set=(x,y,k)=>{if(x>=0&&y>=0&&x<BN_W&&y<BN_H)g[y][x]=k};
 // crossbar with brass finials
 for(let x=1;x<BN_W-1;x++){set(x,1,'j');set(x,2,'i')}set(0,1,'c');set(0,2,'b');set(BN_W-1,1,'c');set(BN_W-1,2,'b');set(0,0,'d');set(BN_W-1,0,'d');
 // cloth: x 2..21, y 3..30 with a swallowtail notch
 const x0=2,x1=BN_W-3,y0=3,y1=BN_H-2,notch=y=>{const d=y-(y1-6);return d<0?-1:Math.min(5,d)};
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const n=notch(y),mid=(x0+x1)/2;if(n>=0&&Math.abs(x+.5-mid-.5)<=n)continue;
  const edge=x<=x0+1||x>=x1-1||y<=y0+3||(n>=0&&Math.abs(x+.5-mid-.5)<=n+2)||(n<0&&y>=y1-1);
  let k=edge?C[1]:A[1];if(!edge&&(x===x0+2))k=A[2];if(!edge&&(x===x1-2||y===y1-7&&n<0))k=A[0];if(edge&&(x===x0))k=C[2];if(edge&&x===x1)k=C[0];if(y===y0+3&&x>x0+1&&x<x1-1)k=C[0];set(x,y,k)}
 // emblem centred on the field
 const E=emblemRows(b.emblem,Cc,b.c1),ex=4,ey=9;for(let y=0;y<16;y++)for(let x=0;x<16;x++){const k=E[y][x];if(k!=='.')set(ex+x,ey+y,k)}
 return bnOutline(g.map(r=>r.join('')).map(r=>r))}
function bannerKey(b){b=bannerFix(b);return'bn:'+b.c1+b.c2+b.emblem}
function bannerCanvas(banner,scale){const b=bannerFix(banner);return typeof pxScaled==='function'?pxScaled(bannerKey(b),bannerRows(b),scale||1):null}
function bannerURL(banner,scale){const b=bannerFix(banner);return typeof pxURL==='function'?pxURL(bannerKey(b),bannerRows(b),scale||1):''}
/* <i> with the flag as a crisp background. size = CSS px height (width follows the 3:4 sprite) */
function bannerHTML(banner,size,cls){size=Math.max(16,Math.round(+size||32));const b=bannerFix(banner),u=bannerURL(b,Math.max(1,Math.ceil(size/BN_H))),w=Math.round(size*BN_W/BN_H);
 const lab=(b.name||'Banner').replace(/[&<>"]/g,'');
 return u?`<i class="bnr${cls?' '+cls:''}" role="img" aria-label="${lab}" style="width:${w}px;height:${size}px;background-image:url(${u})"></i>`:`<i class="bnr none${cls?' '+cls:''}" style="width:${w}px;height:${size}px;background:${PAL[b.c1]}"></i>`}
/* an emblem alone (setup picker) */
function emblemHTML(key,c,field,size){size=size||32;const u=typeof pxURL==='function'?pxURL('em:'+key+c+field,emblemRows(key,c,field),Math.max(1,Math.ceil(size/16))):'';
 return u?`<i class="bnr em" style="width:${size}px;height:${size}px;background-image:url(${u})" aria-hidden="true"></i>`:''}
function htmlEsc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function companyName(){return G&&typeof G.name==='string'&&G.name?G.name:BANNERDEF.name}

/* ================= RIVAL COMPANIES (look side) =================
   Readers of the world agent's G.rivals (CONTRACT.md): every screen that shows a rival goes through these, with typeof fallbacks.
   lkRivals() lkRival(id) lkIsRival(f) lkRivalBn(r) lkRivalName(r) lkRivalShort(r) lkRivalPers(r) lkRivalStance(r) lkRivalTier(r)
   lkRivalStr(r) lkRivalSwords(r) rivalBannerHTML(r,size) rivalChipHTML(id,size) rivalOfMerc(m) mercLook(m) (the colours a merc's
   sprite and portrait wear: their own m.colors, else their rival company's livery from its banner). Nothing here touches rnd(). */
const LKRPERS={honour:{n:'Honourable',icon:'pers-honour',d:'Keeps its word and fights fair. Will not ambush, and will not be ambushed without a fight to remember.'},
 cutthroat:{n:'Cutthroats',icon:'pers-cutthroat',d:'Falls on anyone weaker met on the road. Expect no quarter and no warning.'},
 greedy:{n:'Greedy',icon:'pers-greedy',d:'Anything for coin. Sells news and swords, and can be bought off.'},
 glory:{n:'Glory-hounds',icon:'pers-glory',d:'Chase the biggest beasts and the strongest rivals, for the songs as much as the pay.'}};
function lkRivals(){return typeof G!=='undefined'&&G&&Array.isArray(G.rivals)?G.rivals:[]}
function lkRival(id){if(id&&typeof id==='object')return id;if(typeof rivalById==='function'){try{const r=rivalById(id);if(r)return r}catch(e){}}const L=lkRivals();for(let i=0;i<L.length;i++)if(L[i]&&L[i].id===id)return L[i];return null}
function lkIsRival(f){if(f==null)return false;if(typeof isRival==='function'){try{return!!isRival(f)}catch(e){}}return!!lkRival(f)}
function lkRivalBn(r){r=lkRival(r);return r?{name:r.n||'A rival company',c1:r.c1,c2:r.c2,emblem:r.emblem}:null}
function lkRivalName(r){r=lkRival(r);if(!r)return'A rival company';if(typeof rivalLabel==='function'){try{const s=rivalLabel(r);if(s)return String(s)}catch(e){}}return r.n||'A rival company'}
function lkRivalShort(r){r=lkRival(r);return r?String(r.short||r.n||'Rivals'):'Rivals'}
function lkRivalPers(r){r=lkRival(r);const k=r&&r.pers||'honour',W=typeof RVPERS==='object'&&RVPERS&&RVPERS[k]||typeof RPERS==='object'&&RPERS&&RPERS[k]||null,L=LKRPERS[k]||LKRPERS.honour;return{k,n:W&&W.n||L.n,d:W&&W.d||L.d,icon:L.icon}}
function lkRivalStance(r){r=lkRival(r);if(!r)return 0;const v=typeof r.stance==='number'?r.stance:G&&G.rep&&typeof G.rep[r.id]==='number'?G.rep[r.id]:0;return Math.max(-100,Math.min(100,Math.round(v)))}
function lkRivalTier(r){r=lkRival(r);const v=r?+r.renown||0:0;let t=1;if(typeof renownTier==='function'){try{t=renownTier(v)}catch(e){}}const D=typeof RENOWN==='object'&&Array.isArray(RENOWN)?RENOWN[t-1]:null;return{t,n:D&&D.n||['Unknown','Known','Respected','Famed','Renowned','Legendary'][t-1]||'Unknown'}}
function lkRivalSwords(r){r=lkRival(r);if(!r||!Array.isArray(r.roster))return 0;let n=0;for(let i=0;i<r.roster.length;i++){const m=r.roster[i];if(m&&!(m.hp<=0&&m.dead))n++}return n}   // no allocation: the world view reads it every frame
/* strength against the company, 1 weaker .. 3 stronger (partyStrength's scale); rivalStr(r) when the world has it */
function lkRivalStr(r){r=lkRival(r);if(!r)return 2;if(typeof rivalStr==='function'){try{const s=+rivalStr(r);if(s>0)return s}catch(e){}}
 const lv=m=>+m.lvl||+m.lv||+m.level||1,a=Array.isArray(r.roster)?r.roster.reduce((s,m)=>s+(m?lv(m):0),0):0,b=G&&Array.isArray(G.roster)?G.roster.reduce((s,m)=>s+lv(m),0):1,k=a/Math.max(1,b);return k<.8?1:k<1.15?2:3}
function lkStrWord(s){s=Math.round(+s||2);return s<=1?'Weaker than you':s===2?'An even match':'Stronger than you'}
function rivalBannerHTML(r,size,cls){const b=lkRivalBn(r);if(!b||typeof bannerHTML!=='function')return'';return bannerHTML(b,size||32,'rv-bn'+(cls?' '+cls:'')+(lkRival(r)&&lkRival(r).alive===false?' dead':''))}
function rivalChipHTML(id,size){const r=lkRival(id);if(!r)return'';return`<span class="rv-chip">${rivalBannerHTML(r,size||20)}<b>${htmlEsc(lkRivalShort(r))}</b></span>`}
/* which rival company a merc marches with (null for the company's own and everyone else). A few dozen compares; no allocation. */
function rivalOfMerc(m){if(!m||typeof m!=='object')return null;if(m.rv){const r=lkRival(m.rv);if(r)return r}const L=lkRivals();
 for(let i=0;i<L.length;i++){const R=L[i]&&L[i].roster;if(Array.isArray(R))for(let j=0;j<R.length;j++)if(R[j]===m)return L[i]}return null}
/* the colours a merc wears in the art: their own tailored colours win; a rival's merc without them wears the rival's livery
   (cloth from the banner field c1, trim from c2: the tailor's "banner colours"). The livery object is cached per banner so the
   sprite caches' identity checks hold. */
const LKLIV=new Map();
function rivalLivery(r){r=lkRival(r);if(!r)return null;const k=r.c1+'.'+r.c2;let v=LKLIV.get(k);if(v!==undefined)return v;const D=typeof BANNERDYE==='object'&&BANNERDYE?BANNERDYE:{};
 v=D[r.c1]||D[r.c2]?{cloth:D[r.c1]||undefined,accent:D[r.c2]||undefined,rival:1}:null;if(v){if(!v.cloth)delete v.cloth;if(!v.accent)delete v.accent}LKLIV.set(k,v);return v}
function mercLook(m){const c=m&&m.colors;if(c&&typeof c==='object')return c;const r=rivalOfMerc(m);return r?rivalLivery(r):null}
/* a rival's pennant as a 16x16 icon (turn strip, chips, notices): field c1, border and charge c2. Registered once per colour pair. */
const LKPEN=['................','..d.............','..kyyyyyyyyyy...','..kycbbbbbbby...','..kybbbzbbbay...','..kybbzzzbbay...','..kybbbzbbbay...','..kybbbbbbbay...',
 '..kybbayyabay...','..kybay..ybay...','..kyay....yay...','..kyy......yy...','..j.............','..j.............','..i.............','................'];
function rivalPennantIcon(r){r=lkRival(r);if(!r||typeof ICONS!=='object')return'rival';const n='rvp-'+r.c1+r.c2;if(typeof icHas==='function'&&icHas(n))return n;
 const A=BANNERC[r.c1]?BANNERC[r.c1].r:['f','g','h'],C=BANNERC[r.c2===r.c1?'l':r.c2]?BANNERC[r.c2===r.c1?'l':r.c2].r:['m','l','r'],m={a:A[0],b:A[1],c:A[2],y:C[1],z:C[2]};
 try{ICONS[n]=_icOutline(LKPEN.map(s=>s.split('').map(k=>m[k]||k).join('')));if(typeof icCss==='function')icCss(n)}catch(e){return'rival'}return n}
function rivalMiniHTML(r,size,cls){const n=rivalPennantIcon(r);return typeof pxIcon==='function'?pxIcon(n,size||16,'rv-pen'+(cls?' '+cls:'')):''}
