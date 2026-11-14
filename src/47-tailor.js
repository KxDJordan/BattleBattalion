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
 bone:{n:'Bone',r:['n','m','l'],p:25},white:{n:'Bleached',r:['m','l','r'],p:50},brown:{n:'Walnut',r:['i','j','k'],p:15}};
const FINISH={steel:{n:'Bright steel',r:['o','p','q'],p:0},blackened:{n:'Blackened',r:['0','G','o'],p:80},bronze:{n:'Bronzed',r:['a','u','I'],p:140},gilded:{n:'Gilded',r:['b','c','d'],p:320}};
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
const TLR={id:null,draft:null};
function tlrMerc(){const n=G.roster.length;let i=clamp(+townSel.tailor||0,0,n-1);if(!(i>=0))i=0;townSel.tailor=i;return{m:G.roster[i],i}}
function tlrDraft(m){if(TLR.id!==m.id||!TLR.draft){TLR.id=m.id;TLR.draft=Object.assign({},mercColors(m))}return TLR.draft}
function tailorPick(part,k){const {m}=tlrMerc();if(!m)return;const d=tlrDraft(m);if(k)d[part]=k;else delete d[part];renderTown(townNote)}
function tailorReset(){const {m}=tlrMerc();if(!m)return;TLR.draft=Object.assign({},mercColors(m));renderTown(townNote)}
function tailorBanner(){const {m}=tlrMerc();if(!m)return;const b=typeof bannerFix==='function'?bannerFix(G.banner):{c1:'5',c2:'c'},d=tlrDraft(m);
 d.cloth=BANNERDYE[b.c1]||d.cloth;d.accent=BANNERDYE[b.c2]||d.accent;renderTown(townNote)}
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
function tlrSpriteHTML(m,sc){if(typeof unitSpritePx!=='function'||typeof document==='undefined')return'';try{const u={m,side:0,hp:1},f=unitSpritePx(u,1,'idle',0),cv=f&&(f.cv||f);if(!cv||!cv.width)return'';
  let bx=0,by=0,bw=cv.width,bh=cv.height;try{const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let x0=bw,y0=bh,x1=-1,y1=-1;     // crop to the figure
   for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)if(d[(y*bw+x)*4+3]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}if(x1>=0){bx=x0;by=y0;bw=x1-x0+1;bh=y1-y0+1}}catch(e){}
  sc=Math.max(1,Math.min(sc,Math.floor(100/bh)||1,Math.floor(84/bw)||1));
  const c=document.createElement('canvas');c.width=bw*sc;c.height=bh*sc;const g=c.getContext('2d');if(!g||!g.drawImage)return'';g.imageSmoothingEnabled=false;g.drawImage(cv,bx,by,bw,bh,0,0,c.width,c.height);
  const url=c.toDataURL();return url&&url.slice(0,5)==='data:'?`<img class="tl-spr" alt="" src="${url}" width="${c.width}" height="${c.height}">`:''}catch(e){return''}}
function tlrSwatchesOf(c){c=c||{};return TLR_PARTS.map(([p])=>{const r=c[p]?p==='metal'?finishRamp(c[p]):dyeRamp(c[p]):null;return`<i class="tl-dot${r?'':' plain'}" style="${r?'background:'+tlrRampCSS(r):''}"></i>`}).join('')}
function tlrName(part,k){return!k?part==='metal'?FINISH.steel.n:'Plain':part==='metal'?FINISH[k].n:DYES[k].n}
/* the town panel tab: {list, detail, foot, key} like the other tabs of townView */
function tailorView(t){let list=pnSec('The company',G.roster.length),detail='',foot='';const {m,i}=tlrMerc();if(!m)return{list:list+pnEmpty('Nobody to dress.'),detail,foot,key:'tailor'};
 G.roster.forEach((x,j)=>{const c=mercColors(x),n=Object.keys(c).length;list+=pnRow({on:`townPick(${j})`,sel:j===i,cls:'tw-row tl-row',lead:twPortrait(x,32),title:x.name,sub:`<span class="tw-line tl-dots">${tlrSwatchesOf(c)}<span class="tw-t0">${n?c.cloth?DYES[c.cloth].n+(c.accent?' and '+DYES[c.accent].n.toLowerCase():''):c.accent?DYES[c.accent].n+' trim':FINISH[c.metal].n:'Plain colours'}</span></span>`})});
 const d=tlrDraft(m),pv=Object.assign({},m,{colors:colorsFix(d)||undefined}),cost=tailorCost(m,d),all=tailorAllCost(d),same=JSON.stringify(colorsFix(d))===JSON.stringify(colorsFix(m.colors)),b=typeof bannerFix==='function'?bannerFix(G.banner):null;
 if(!pv.colors)delete pv.colors;
 const spr=tlrSpriteHTML(pv,4);
 detail=`<div class="tl-top"><div class="tl-stage">${spr||`<span class="tl-noart">${tlrSwatchesOf(d)}</span>`}</div><div class="tl-id">${twPortrait(pv,64)}<div><div class="pn-kick">${RACE[m.race].n} ${BG[m.bg].n.toLowerCase()}</div><div class="pn-h">${m.name}</div>
  <div class="tl-qa"><button type="button" class="pn-btn sm" onclick="tailorBanner()" ${b?'':'disabled'}>${b&&typeof bannerHTML==='function'?bannerHTML(b,24):''}<span>Banner colours</span></button><button type="button" class="pn-btn sm" onclick="tailorReset()" ${same?'disabled':''}>${pnIcon('back')}<span>Undo</span></button></div></div></div></div>`;
 for(const [p,n,desc] of TLR_PARTS){const opts=p==='metal'?Object.keys(FINISH):[null].concat(Object.keys(DYES)),cur=d[p]||null,pr=tlrPrice(p,cur),chg=(mercColors(m)[p]||null)!==cur;
  detail+=`<div class="tl-part"><div class="tl-ph"><b>${n}</b><span class="tl-pn">${tlrName(p,cur)}</span>${chg&&pr?`<span class="tl-pr">${pnIcon('coin')}${pr}</span>`:chg?'<span class="tl-pr free">free</span>':''}<small>${desc}</small></div>
  <div class="tl-sws" role="radiogroup" aria-label="${n}">${opts.map(k=>tlrSwatch(p,k==='steel'?null:k,(k==='steel'?null:k)===cur,tlrName(p,k==='steel'?null:k)+(k&&k!=='steel'?', '+tlrPrice(p,k)+' crowns':', free'))).join('')}</div></div>`}
 detail+=`<p class="pn-p dim">New recruits arrive in their own plain colours. The gift's stone stays its own colour whatever the cloth.</p>`;
 foot=`<span class="pn-fl">${pnCoin(cost,'big'+(G.crowns<cost?' short':''))}<small>${same?'Nothing to change':G.crowns<cost?'<em>Not enough crowns</em>':'for '+m.name}</small></span>`
  +`<button type="button" class="pn-btn${G.crowns<all||!all&&same?' off':''}" id="tlAll" onclick="tailorAll()" title="Dress every sword in these colours">Whole company${all?' · '+all:''}</button>`
  +`<button type="button" class="pn-btn pri${same||G.crowns<cost?' off':''}" id="tlApply" onclick="tailorApply()">${cost?'Dye for '+cost:'Fit out'}</button>`;
 return{list,detail,foot,key:'tailor:'+i}}
