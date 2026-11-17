/* ================= TAILOR (shell): dyes, metal finishes, the tailor's shop in town =================
   Per-merc colours m.colors = {cloth, accent, metal}: cloth and accent are keys of DYES, metal a key of FINISH. A missing field
   (or a missing m.colors) is today's look. Units and portraits recolour from it (art: 73-units.js, 07-portraits.js).
   Public: DYES, FINISH, BANNERDYE, dyeRamp(key), finishRamp(key), mercColors(m), colorsFix(c), tailorCost(m,draft),
   tailorView(t) (the town panel tab), tailorPick(part,key), tailorApply(), tailorAll(), tailorBanner(), tailorReset().
   Prices are in crowns, paid when the tailor does the work; going back to the plain look is free. */
const DYES={
 crimson:{n:'Crimson',r:['f','g','h'],p:70},madder:{n:'Madder',r:['f','K','E'],p:45},ember:{n:'Ember',r:['K','E','y'],p:55},
 ochre:{n:'Ochre',r:['a','Y','I'],p:30},saffron:{n:'Saffron',r:['Y','y','e'],p:65},forest:{n:'Forest',r:['3','B','A'],p:35},
 verdigris:{n:'Verdigris',r:['7','5','6'],p:45},sky:{n:'Sky',r:['X','x','F'],p:55},royal:{n:'Royal blue',r:['G','X','x'],p:90},
 violet:{n:'Violet',r:['G','D','C'],p:120},charcoal:{n:'Charcoal',r:['0','G','o'],p:30},grey:{n:'Ash grey',r:['o','p','q'],p:25},
 bone:{n:'Bone',r:['n','m','l'],p:25},white:{n:'Bleached',r:['m','l','r'],p:50},brown:{n:'Walnut',r:['i','j','k'],p:15},
 // eastern dyes (19-east.js): only the tailors of eastern towns have them
 indigo:{n:'Indigo',r:['1','G','X'],p:60,east:1},vermilion:{n:'Vermilion',r:['f','g','E'],p:85,east:1},sakura:{n:'Sakura',r:['g','h','r'],p:95,east:1}};
const FINISH={steel:{n:'Bright steel',r:['o','p','q'],p:0},blackened:{n:'Blackened',r:['0','G','o'],p:80},bronze:{n:'Bronzed',r:['a','u','I'],p:140},gilded:{n:'Gilded',r:['b','c','d'],p:320},
 lacquer:{n:'Black lacquer',r:['0','1','G'],p:180,east:1},shu:{n:'Red lacquer',r:['f','g','h'],p:220,east:1}};
/* the dye that matches each banner colour (tailor's "use banner colours") */
const BANNERDYE={'5':'verdigris',c:'ochre',g:'crimson',x:'sky',D:'violet',l:'bone',G:'charcoal',B:'forest',E:'ember',j:'brown',y:'saffron',p:'grey'};
const TLR_PARTS=[['cloth','Cloth','Tunics, robes, padding, hoods and cloaks'],['accent','Trim','Sashes, trims, plumes, tabards and shield faces'],['metal','Metal','Mail, plate, helmets and scale']];
function dyeRamp(k){const d=DYES[k];return d?d.r.slice():null}
function finishRamp(k){const f=FINISH[k];return f?f.r.slice():null}
/* a clean colours object or null (absent fields are the plain look) */
function colorsFix(c){if(!c||typeof c!=='object'||Array.isArray(c))return null;const o={};if(DYES[c.cloth])o.cloth=c.cloth;if(DYES[c.accent])o.accent=c.accent;if(FINISH[c.metal]&&c.metal!=='steel')o.metal=c.metal;return o.cloth||o.accent||o.metal?o:null}
function mercColors(m){return colorsFix(m&&m.colors)||{}}
function tlrPrice(part,k){if(!k)return 0;if(part==='metal')return FINISH[k]?FINISH[k].p:0;const d=DYES[k];return d?(part==='accent'?Math.round(d.p*.6/5)*5:d.p):0}
/* what dressing merc m in the draft colours costs: each changed part at the new colour's price; plain is free */
function tailorCost(m,draft){const cur=mercColors(m),d=colorsFix(draft)||{};let c=0;for(const [p] of TLR_PARTS)if((cur[p]||null)!==(d[p]||null))c+=tlrPrice(p,d[p]);return c}
/* ---- panel state ---- */
const TLR={id:null,draft:null,mode:'dye',coat:null};
function tlrMerc(){const n=G.roster.length;let i=clamp(+townSel.tailor||0,0,n-1);if(!(i>=0))i=0;townSel.tailor=i;return{m:G.roster[i],i}}
function tlrDraft(m){if(TLR.id!==m.id||!TLR.draft){TLR.id=m.id;TLR.draft=Object.assign({},mercColors(m))}return TLR.draft}
function tailorPick(part,k){const {m}=tlrMerc();if(!m)return;const d=tlrDraft(m);if(k)d[part]=k;else delete d[part];renderTown(townNote)}
function tailorReset(){const {m}=tlrMerc();if(!m)return;TLR.draft=Object.assign({},mercColors(m));renderTown(townNote)}
function tailorBanner(){const {m}=tlrMerc();if(!m)return;const b=typeof bannerFix==='function'?bannerFix(G.banner):{c1:'5',c2:'c'},d=tlrDraft(m);
 d.cloth=BANNERDYE[b.c1]||(BANNERC[b.c1]&&BANNERC[b.c1].dye)||d.cloth;d.accent=BANNERDYE[b.c2]||(BANNERC[b.c2]&&BANNERC[b.c2].dye)||d.accent;renderTown(townNote)}
function tlrSet(m,d){const c=colorsFix(d);if(c)m.colors=c;else delete m.colors}
function tailorApply(){const {m}=tlrMerc();if(!m)return false;const d=tlrDraft(m),c=tailorCost(m,d);if(!c&&JSON.stringify(colorsFix(d))===JSON.stringify(colorsFix(m.colors)))return false;
 if(G.crowns<c){toast('Not enough crowns');return false}G.crowns-=c;tlrSet(m,d);TLR.draft=Object.assign({},mercColors(m));tlrRefresh();toast(`${m.name} is fitted out${c?' for '+c+' crowns':''}`);renderTown(townNote);if(typeof save==='function')save();return true}
function tailorAllCost(d){return G.roster.reduce((s,x)=>s+tailorCost(x,d),0)}
function tailorAll(){const {m}=tlrMerc();if(!m)return false;const d=tlrDraft(m),c=tailorAllCost(d);if(G.crowns<c){toast('Not enough crowns');return false}
 G.crowns-=c;G.roster.forEach(x=>tlrSet(x,d));TLR.draft=Object.assign({},mercColors(m));tlrRefresh();toast(`The whole company wears the same colours${c?' for '+c+' crowns':''}`);renderTown(townNote);if(typeof save==='function')save();return true}
/* sprite caches keyed by merc id must drop a merc whose colours changed (art's caches key on m.colors once they recolour) */
function tlrRefresh(){try{if(typeof US!=='undefined'&&US.byUnit&&US.byUnit.clear)US.byUnit.clear()}catch(e){}}
/* ---- pictures ---- */
function tlrRampCSS(r){return r?`linear-gradient(90deg,${PAL[r[0]]} 0 33%,${PAL[r[1]]} 33% 67%,${PAL[r[2]]} 67%)`:''}
function tlrSwatch(part,k,on,title){const r=k?part==='metal'?finishRamp(k):dyeRamp(k):null;
 return`<button type="button" class="tl-sw${on?' on':''}${k?'':' plain'}" aria-pressed="${on}" title="${title}" aria-label="${title}" onclick="tailorPick('${part}',${k?`'${k}'`:'null'})"><i style="${r?'background:'+tlrRampCSS(r):''}"></i></button>`}
/* the merc as it would look: the battle sprite (idle, facing the viewer) drawn 3x, or swatches when the art cannot draw it */
function tlrSpriteHTML(m,sc,face){if(typeof unitSpritePx!=='function'||typeof document==='undefined')return'';try{const u={m,side:0,hp:1},f=unitSpritePx(u,face==null?1:face,'idle',0),cv=f&&(f.cv||f),k=f&&f.k||1;if(!cv||!cv.width)return'';
  let bx=0,by=0,bw=cv.width,bh=cv.height;try{const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let x0=bw,y0=bh,x1=-1,y1=-1;     // crop to the figure
   for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)if(d[(y*bw+x)*4+3]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}if(x1>=0){bx=x0;by=y0;bw=x1-x0+1;bh=y1-y0+1}}catch(e){}
  sc=Math.max(1,Math.min(sc,Math.floor(100*k/bh)||1,Math.floor(84*k/bw)||1));   // k 2: an HD figure, shown at the art size (its canvas px fill a 2x screen)
  const c=document.createElement('canvas');c.width=bw*sc;c.height=bh*sc;const g=c.getContext('2d');if(!g||!g.drawImage)return'';g.imageSmoothingEnabled=false;g.drawImage(cv,bx,by,bw,bh,0,0,c.width,c.height);
  const url=c.toDataURL();return url&&url.slice(0,5)==='data:'?`<img class="tl-spr" alt="" src="${url}" width="${c.width/k}" height="${c.height/k}">`:''}catch(e){return''}}
function tlrSwatchesOf(c){c=c||{};return TLR_PARTS.map(([p])=>{const r=c[p]?p==='metal'?finishRamp(c[p]):dyeRamp(c[p]):null;return`<i class="tl-dot${r?'':' plain'}" style="${r?'background:'+tlrRampCSS(r):''}"></i>`}).join('')}
function tlrName(part,k){return!k?part==='metal'?FINISH.steel.n:'Plain':part==='metal'?FINISH[k].n:DYES[k].n}
/* the town panel tab: {list, detail, foot, key} like the other tabs of townView */
function tailorView(t){if(TLR.mode==='coat'&&typeof tailorCoatView==='function')return tailorCoatView(t);let list=pnSec('The company',G.roster.length),detail='',foot='';const {m,i}=tlrMerc();if(!m)return{list:list+pnEmpty('Nobody to dress.'),detail,foot,key:'tailor'};
 G.roster.forEach((x,j)=>{const c=mercColors(x),n=Object.keys(c).length;list+=pnRow({on:`townPick(${j})`,sel:j===i,cls:'tw-row tl-row',lead:twPortrait(x,32),title:x.name,sub:`<span class="tw-line tl-dots">${tlrSwatchesOf(c)}<span class="tw-t0">${n?c.cloth?DYES[c.cloth].n+(c.accent?' and '+DYES[c.accent].n.toLowerCase():''):c.accent?DYES[c.accent].n+' trim':FINISH[c.metal].n:'Plain colours'}</span></span>`})});
 const d=tlrDraft(m),pv=Object.assign({},m,{colors:colorsFix(d)||undefined}),cost=tailorCost(m,d),all=tailorAllCost(d),same=JSON.stringify(colorsFix(d))===JSON.stringify(colorsFix(m.colors)),b=typeof bannerFix==='function'?bannerFix(G.banner):null;
 if(!pv.colors)delete pv.colors;
 const spr=tlrSpriteHTML(pv,4);
 detail=tlrModeTabs()+`<div class="tl-top"><div class="tl-stage">${spr||`<span class="tl-noart">${tlrSwatchesOf(d)}</span>`}</div><div class="tl-id">${twPortrait(pv,64)}<div><div class="pn-kick">${RACE[m.race].n} ${BG[m.bg].n.toLowerCase()}</div><div class="pn-h">${m.name}</div>
  <div class="tl-qa"><button type="button" class="pn-btn sm" onclick="tailorBanner()" ${b?'':'disabled'}>${b&&typeof bannerHTML==='function'?bannerHTML(b,24):''}<span>Banner colours</span></button><button type="button" class="pn-btn sm" onclick="tailorReset()" ${same?'disabled':''}>${pnIcon('back')}<span>Undo</span></button></div></div></div></div>`;
 for(const [p,n,desc] of TLR_PARTS){const eok=k=>{const T=p==='metal'?FINISH:DYES;return!k||!T[k].east||k===(mercColors(m)[p]||null)||(typeof townEast==='function'&&G.town!=null&&townEast(G.town))},opts=(p==='metal'?Object.keys(FINISH):[null].concat(Object.keys(DYES))).filter(eok),cur=d[p]||null,pr=tlrPrice(p,cur),chg=(mercColors(m)[p]||null)!==cur;
  detail+=`<div class="tl-part"><div class="tl-ph"><b>${n}</b><span class="tl-pn">${tlrName(p,cur)}</span>${chg&&pr?`<span class="tl-pr">${pnIcon('coin')}${pr}</span>`:chg?'<span class="tl-pr free">free</span>':''}<small>${desc}</small></div>
  <div class="tl-sws" role="radiogroup" aria-label="${n}">${opts.map(k=>tlrSwatch(p,k==='steel'?null:k,(k==='steel'?null:k)===cur,tlrName(p,k==='steel'?null:k)+(k&&k!=='steel'?', '+tlrPrice(p,k)+' crowns':', free'))).join('')}</div></div>`}
 detail+=`<p class="pn-p dim">New recruits arrive in their own plain colours. The gift's stone stays its own colour whatever the cloth.</p>`;
 foot=`<span class="pn-fl">${pnCoin(cost,'big'+(G.crowns<cost?' short':''))}<small>${same?'Nothing to change':G.crowns<cost?'<em>Not enough crowns</em>':'for '+m.name}</small></span>`
  +`<button type="button" class="pn-btn${G.crowns<all||!all&&same?' off':''}" id="tlAll" onclick="tailorAll()" title="Dress every sword in these colours">Whole company${all?' · '+all:''}</button>`
  +`<button type="button" class="pn-btn pri${same||G.crowns<cost?' off':''}" id="tlApply" onclick="tailorApply()">${cost?'Dye for '+cost:'Fit out'}</button>`;
 return{list,detail,foot,key:'tailor:'+i}}

/* ================= SURCOATS AND LIVERY =================
   A second body layer: m.eq.c holds a surcoat (ITEMS kind 'c', 10-data.js), worn over whatever armor is on. A surcoat has no colours
   of its own: it is drawn in the wearer's livery {c1 (the field), c2 (the charge: emblem and trims), emblem}, read through bannerFix
   (46-banner.js), so a changed banner re-dresses the company and banner fields this file does not know are ignored.
     the company's swords -> G.banner (companyLivery)            a rival company's merc -> that rival's banner
     house soldiers (units of a house faction on either side: patrols, garrisons, hosts, caravan guards) -> houseLivery(houseId)
     a battle's o.livery ({c1,c2,emblem} or a house id: garrison battles) dresses every enemy humanoid in it.
   Public: houseLivery(id) -> {c1,c2,emblem,sig} | null, liveryOf(x), companyLivery(), mercLivery(m), coatOf(m), coatCut(id), coatIds(),
   unitLivery(u), unitCoat(u) -> {id, cut, liv} | null (what a battle figure wears), coatPrice(id), coatSold(id), coatIconName(id,liv),
   coatColoursText(); the tailor's tab: tailorMode(k), tailorCoatPick(id), tailorCoatFit(), tailorCoatBuy(), tailorCoatAll(), tailorCoatOff().
   Liveries are frozen objects cached per colours (identity holds for the sprite caches). Nothing here draws rnd(). */
const LIVC=new Map();
function livMake(c1,c2,emblem){const raw=c1+'.'+c2+'.'+emblem;let v=LIVC.get(raw);if(v)return v;   // read every frame: a hit allocates nothing but the key
 const b=typeof bannerFix==='function'?bannerFix({c1,c2,emblem}):{c1:c1||'5',c2:c2||'c',emblem:emblem||'swords'},k=b.c1+'.'+b.c2+'.'+b.emblem;
 v=LIVC.get(k)||Object.freeze({c1:b.c1,c2:b.c2,emblem:b.emblem,sig:k});LIVC.set(k,v);LIVC.set(raw,v);return v}
function houseLivery(id){const h=typeof houseById==='function'?houseById(id):null;if(h)return livMake(h.c1,h.c2,h.emblem);
 const r=typeof rivalById==='function'?rivalById(id):null;return r?livMake(r.c1,r.c2,r.emblem):null}
function liveryOf(x){if(!x)return null;if(typeof x==='string')return houseLivery(x);if(typeof x==='object'&&x.c1)return livMake(x.c1,x.c2,x.emblem);return null}
function companyLivery(){const b=typeof G!=='undefined'&&G&&G.banner||null;return b?livMake(b.c1,b.c2,b.emblem):livMake()}
function mercLivery(m){const r=typeof rivalOfMerc==='function'?rivalOfMerc(m):null;return r?livMake(r.c1,r.c2,r.emblem):companyLivery()}
function coatIds(){const L=[];for(const k in ITEMS)if(ITEMS[k].k==='c')L.push(k);return L}
function coatCut(id){const i=ITEMS[id];return i&&i.k==='c'?i.coat||'tabard':null}
function coatOf(m){const id=m&&m.eq&&m.eq.c;return ITEMS[id]&&ITEMS[id].k==='c'?id:null}
/* house soldiers' cut by unit type (HOUSEUNITS): the line in tabards, the raiders in surcoats, the captain in a heraldic coat */
const COAT_EN={thug:'tabard',bmark:'tabard',bxbow:'tabard',braid:'surcoat',blead:'heraldcoat'};
function unitLivery(u){if(!u||u.m)return null;if(u.liv)return liveryOf(u.liv);
 const b=typeof B!=='undefined'&&B&&B.opts?B.opts:null;if(b&&b.livery&&u.side===1&&!u.ally)return liveryOf(b.livery);
 return typeof isHouse==='function'&&isHouse(u.f)?houseLivery(u.f):null}
function unitCoat(u){if(!u)return null;if(u.m){const id=coatOf(u.m);return id?{id,cut:coatCut(id),liv:mercLivery(u.m)}:null}
 const liv=unitLivery(u);if(!liv)return null;const id=COAT_EN[u.eid]||'surcoat';return{id,cut:coatCut(id)||'surcoat',liv}}
function coatColoursText(liv){const b=liv||companyLivery();if(typeof BANNERC!=='object'||!BANNERC[b.c1])return'The banner';
 return`${BANNERC[b.c2].n} ${typeof EMBLEMS==='object'&&EMBLEMS[b.emblem]?EMBLEMS[b.emblem].n.toLowerCase():''} on ${BANNERC[b.c1].n.toLowerCase()}`}
/* the icon of a surcoat in a livery: 'it-c:<id>:<livery>' registered once per colours (pixel rows in ICONS, the painted twin in PAINT) */
function coatIconName(id,liv){liv=liv||companyLivery();const n='it-c:'+id+':'+liv.sig;if(typeof ICONS!=='object')return'armor-light';if(Object.prototype.hasOwnProperty.call(ICONS,n))return n;
 let r=null;try{r=typeof usCoatIconRows==='function'?usCoatIconRows(id,liv):null}catch(e){r=null}if(!r)return'armor-light';
 ICONS[n]=r;if(typeof IC_MADE==='object')IC_MADE[n]='item';if(typeof PAINT==='object'&&typeof pkcCoat==='function'&&!Object.prototype.hasOwnProperty.call(PAINT,n))PAINT[n]=g=>pkcCoat(g,id,liv);
 try{if(typeof icCss==='function')icCss(n)}catch(e){}return n}
/* ---- the tailor's surcoats: a second mode of the tab (Dyes | Surcoats) ---- */
function coatPrice(id){const it=ITEMS[id];if(!it)return 0;let k=1;try{if(typeof townPriceK==='function'&&typeof G!=='undefined'&&G&&G.town!=null)k=townPriceK(G.town,'buy',id)}catch(e){k=1}return Math.max(5,Math.round(it.price*k/5)*5)}
function coatSold(id){const it=ITEMS[id];return!!(it&&it.k==='c'&&(!it.east||(typeof townEast==='function'&&typeof G!=='undefined'&&G&&G.town!=null&&townEast(G.town))))}
function tailorMode(k){TLR.mode=k==='coat'?'coat':'dye';renderTown(townNote)}
function tlrModeTabs(){const on=TLR.mode||'dye',b=(k,n,ic)=>`<button type="button" role="tab" class="mk-tab${on===k?' on':''}" id="tlMode-${k}" aria-selected="${on===k}" onclick="tailorMode('${k}')">${typeof twIcon==='function'?twIcon(ic,16):''}<span>${n}</span></button>`;
 return`<div class="mk-tabs tl-modes" role="tablist" aria-label="Tailor">${b('dye','Dyes','tailor')}${b('coat','Surcoats','armor-light')}</div>`}
function tlcDraft(m){if(!(TLR.coat&&coatSold(TLR.coat)))TLR.coat=coatOf(m)&&coatSold(coatOf(m))?coatOf(m):coatIds().filter(coatSold)[0]||null;return TLR.coat}
function tailorCoatPick(id){if(!coatSold(id))return false;TLR.coat=id;renderTown(townNote);return true}
/* fit the chosen surcoat on the selected merc: from the stash when one is there, else bought; what they wore goes to the stash */
function tailorCoatFit(){const {m}=tlrMerc(),id=m&&tlcDraft(m);if(!m||!id||coatOf(m)===id)return false;const j=G.stash.indexOf(id),c=j>=0?0:coatPrice(id);
 if(G.crowns<c){toast('Not enough crowns');return false}G.crowns-=c;if(j>=0)G.stash.splice(j,1);if(m.eq.c)G.stash.push(m.eq.c);m.eq.c=id;tlrRefresh();
 toast(`${m.name} wears the ${ITEMS[id].n.toLowerCase()}${c?' for '+c+' crowns':' from the stash'}`);renderTown(townNote);if(typeof save==='function')save();return true}
function tailorCoatBuy(){const {m}=tlrMerc(),id=m&&tlcDraft(m);if(!id)return false;const c=coatPrice(id);if(G.crowns<c){toast('Not enough crowns');return false}
 G.crowns-=c;G.stash.push(id);toast(`A ${ITEMS[id].n.toLowerCase()} goes to the stash for ${c} crowns`);renderTown(townNote);if(typeof save==='function')save();return true}
function tlcAllCost(id){const n=G.roster.filter(x=>coatOf(x)!==id).length,st=G.stash.filter(x=>x===id).length;return{n,c:Math.max(0,n-st)*coatPrice(id)}}
function tailorCoatAll(){const {m}=tlrMerc(),id=m&&tlcDraft(m);if(!id)return false;const L=G.roster.filter(x=>coatOf(x)!==id);if(!L.length)return false;const c=tlcAllCost(id).c;
 if(G.crowns<c){toast('Not enough crowns');return false}G.crowns-=c;for(const x of L){const j=G.stash.indexOf(id);if(j>=0)G.stash.splice(j,1);if(x.eq.c)G.stash.push(x.eq.c);x.eq.c=id}tlrRefresh();
 toast(`The whole company wears the ${ITEMS[id].n.toLowerCase()}${c?' for '+c+' crowns':''}`);renderTown(townNote);if(typeof save==='function')save();return true}
function tailorCoatOff(){const {m}=tlrMerc();if(!m||!coatOf(m))return false;G.stash.push(m.eq.c);m.eq.c=null;tlrRefresh();toast(`${m.name}'s surcoat goes to the stash`);renderTown(townNote);if(typeof save==='function')save();return true}
/* the company's colours on its clothes (G.wearCol, saved): coats in the flag's colours, and everyday fabric too (73q-parts2.js) */
function tailorWear(part,on){if(!G)return;G.wearCol=Object.assign({coat:true,cloth:false},G.wearCol||{});G.wearCol[part]=!!on;tlrRefresh();if(typeof save==='function')try{save()}catch(e){}if(typeof renderTown==='function')try{renderTown(typeof townNote!=='undefined'?townNote:'')}catch(e){}}
function tailorCoatView(t){let list=pnSec('The company',G.roster.length),detail='',foot='';const {m,i}=tlrMerc();if(!m)return{list:list+pnEmpty('Nobody to dress.'),detail,foot,key:'tailor:c'};
 G.roster.forEach((x,j)=>{const c=coatOf(x);list+=pnRow({on:`townPick(${j})`,sel:j===i,cls:'tw-row tl-row',lead:twPortrait(x,32),title:x.name,sub:`<span class="tw-line">${c?pnItemIcon(c,16):''}<span class="tw-t0">${c?ITEMS[c].n:'No surcoat'}</span></span>`})});
 const id=tlcDraft(m),cur=coatOf(m),pv=Object.assign({},m,{eq:Object.assign({},m.eq,{c:id||null})}),b=typeof bannerFix==='function'?bannerFix(G.banner):null;
 detail=tlrModeTabs()+`<div class="tl-top"><div class="tl-stage tl-two">${tlrSpriteHTML(pv,3,0)}${tlrSpriteHTML(pv,3,3)}</div><div class="tl-id">${twPortrait(pv,64)}<div><div class="pn-kick">${cur?'Wears the '+ITEMS[cur].n.toLowerCase():'No surcoat'}</div><div class="pn-h">${m.name}</div>
  <div class="tl-ban">${b&&typeof bannerHTML==='function'?bannerHTML(b,32):''}<span><b>${htmlEsc(b?b.name:'The banner')}</b><small>${coatColoursText()}</small></span></div></div></div></div>`+pnHead('Surcoats');
 for(const k of coatIds()){if(!coatSold(k))continue;const it=ITEMS[k],on=k===id,own=cur===k,st=G.stash.indexOf(k)>=0,p=coatPrice(k);
  detail+=`<div class="pn-gear tap tl-coat${on?' on':''}" role="button" tabindex="0" aria-pressed="${on}" data-coat="${k}" onclick="tailorCoatPick('${k}')">${pnItemIcon(k,32)}<span class="pn-rmain"><span class="pn-rt">${it.n}${own?' <span class="pn-grip">worn</span>':st?' <span class="pn-grip">in the stash</span>':''}</span><span class="pn-rs">${itemDesc(k)}</span></span><span class="pn-cd">${pnCoin(p,G.crowns<p?'short':'')}</span></div>`}
 detail+=`<p class="pn-p dim">Cut in the company's colours with its emblem on the chest and the back, over any armor. It follows the banner when the banner changes.</p>`;
 {const w=G.wearCol||{};detail+=pnHead('The company colours')+`<label class="pn-p tl-wear"><input type="checkbox" id="tlWearCoat" ${w.coat!==false?'checked':''} onchange="tailorWear('coat',this.checked)"> Surcoats and tabards in the flag's colours</label>`
  +`<label class="pn-p tl-wear"><input type="checkbox" id="tlWearCloth" ${w.cloth?'checked':''} onchange="tailorWear('cloth',this.checked)"> Wear the company colours: every sword's tunic, robe and trousers dyed to the flag (no charge; metal, leather and fur stay)</label>`}
 const fromSt=!!id&&G.stash.indexOf(id)>=0,c=id&&!fromSt?coatPrice(id):0,A=id?tlcAllCost(id):{n:0,c:0},same=!id||cur===id;
 foot=`<span class="pn-fl">${pnCoin(c,'big'+(G.crowns<c?' short':''))}<small>${same?(cur?'Already worn':'Pick a surcoat'):fromSt?'from the stash':G.crowns<c?'<em>Not enough crowns</em>':'for '+m.name}</small></span>`
  +(cur?`<button type="button" class="pn-btn" id="tlcOff" onclick="tailorCoatOff()">Take off</button>`:'')
  +`<button type="button" class="pn-btn${!id||G.crowns<coatPrice(id)?' off':''}" id="tlcBuy" onclick="tailorCoatBuy()" title="Buy one for the stash">Buy</button>`
  +`<button type="button" class="pn-btn${!A.n||G.crowns<A.c?' off':''}" id="tlcAll" onclick="tailorCoatAll()" title="Dress every sword in this surcoat">Whole company${A.c?' · '+A.c:''}</button>`
  +`<button type="button" class="pn-btn pri${same||G.crowns<c?' off':''}" id="tlcFit" onclick="tailorCoatFit()">${fromSt||same?'Fit':'Fit for '+c}</button>`;
 return{list,detail,foot,key:'tailor:c'+i}}
