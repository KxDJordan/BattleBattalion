/* ================= PIXEL ART ENGINE (style lock for all art from Phase 2 on) =================
   Every sprite is an array of equal-length strings; each character is a PAL key, '.' or ' ' is transparent.
   One fixed palette, integer scaling only, nearest-neighbour. No document (headless tests) => functions return null/''. */
const PAL={
 '0':'#0b1514','1':'#101d1c','2':'#182a28','3':'#213a36','4':'#35554f',           // outline, pine darks, line
 '5':'#58b39c','6':'#9fe0cd','7':'#2c6a5d',                                         // verdigris mid / light / dark
 'a':'#3a2c12','b':'#8a6a2a','c':'#d1a94e','d':'#f3d98b','e':'#fff4c8',           // brass ramp
 'f':'#5a1f1c','g':'#c4493f','h':'#ef8a78',                                         // madder ramp
 'i':'#4a3826','j':'#7a5a38','k':'#a98455',                                         // wood / leather ramp
 'l':'#e9e0c9','m':'#b9ad8f','n':'#7d8f86',                                         // vellum, vellum shade, grey-green
 'o':'#4d5a5c','p':'#8d99a6','q':'#c8d0d8','r':'#ffffff',                           // steel ramp, white
 's':'#f0c8a0','t':'#d09a72','u':'#9a6444',                                         // skin light / mid / dark
 'v':'#8fb56a','w':'#5f8244',                                                       // green skin light / dark
 'x':'#62a6ee','X':'#2f5fa8','y':'#ecc64f','Y':'#a8801f',                           // Mana, Aura
 'z':'#3fd0b6','Z':'#1f8573','A':'#9bd96f','B':'#4f8f3a',                           // Qi, Chi
 'C':'#b98cf0','D':'#5a3a9a','E':'#ff8a3c','F':'#8fd8ff',                           // void, fire, ice
 'G':'#2a2a34','H':'#6b4a2b','I':'#c9a24a','J':'#b8b8c0','K':'#a8482a'              // hair: black, brown, blond, grey, red
};
const PX={icon:16,portrait:32,unit:[24,32],tile:[32,16]};   // locked native sizes (px); display at integer multiples
const _pxCache=new Map();
function pxCanvas(w,h){if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=w;c.height=h;return c}
/* rows -> canvas at native size. map: optional {fromKey:toKey} recolour. */
function px(rows,map){const h=rows.length,w=rows[0].length,c=pxCanvas(w,h);if(!c||!c.getContext)return null;const g=c.getContext('2d');if(!g)return null;
 for(let y=0;y<h;y++){const r=rows[y];for(let x=0;x<w;x++){let k=r[x];if(k==='.'||k===' '||k===undefined)continue;if(map&&map[k])k=map[k];const col=PAL[k];if(!col)continue;g.fillStyle=col;g.fillRect(x,y,1,1)}}return c}
/* stack same-size row arrays; later layers win where not transparent */
function pxLayer(){const L=Array.prototype.filter.call(arguments,Boolean);if(!L.length)return[];return L[0].map((_,y)=>{let s='';for(let x=0;x<L[0][0].length;x++){let k='.';for(const l of L){const q=l[y]&&l[y][x];if(q&&q!=='.'&&q!==' ')k=q}s+=k}return s})}
function pxFlip(rows){return rows.map(r=>r.split('').reverse().join(''))}
/* cached scaled canvas for a keyed sprite */
function pxScaled(key,rows,scale,map){scale=Math.max(1,Math.round(scale||1));const id=key+'@'+scale;let c=_pxCache.get(id);if(c!==undefined)return c;
 const src=Array.isArray(rows)?px(rows,map):rows;if(!src){_pxCache.set(id,null);return null}
 c=pxCanvas(src.width*scale,src.height*scale);const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(src,0,0,c.width,c.height);_pxCache.set(id,c);return c}
/* cached data URL (for CSS backgrounds / <img>); '' when there is no DOM */
function pxURL(key,rows,scale,map){const id='u:'+key+'@'+(scale||1);let u=_pxCache.get(id);if(u!==undefined)return u;const c=pxScaled(key,rows,scale,map);u='';try{if(c)u=c.toDataURL()}catch(e){}_pxCache.set(id,u);return u}
/* draw a sprite on a 2D context at integer scale, crisp */
function pxDraw(g,key,rows,x,y,scale,map){const c=pxScaled(key,rows,scale,map);if(!c)return;const s=g.imageSmoothingEnabled;g.imageSmoothingEnabled=false;g.drawImage(c,Math.round(x),Math.round(y));g.imageSmoothingEnabled=s}
