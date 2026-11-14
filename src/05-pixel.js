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
/* Fast path (load time): sprites are written with ONE putImageData instead of one fillRect per pixel. Each colour
   string is parsed once into a Uint32 (RGBA bytes in memory order). Only fully opaque '#rgb' / '#rrggbb' / '#rrggbbff'
   colours take the fast path; anything else (alpha, named colours) is still painted with fillRect after the
   putImageData, so the pixels are exactly what the old per-pixel fillRect produced. */
const _pxLE=new Uint8Array(new Uint32Array([1]).buffer)[0]===1;
const _pxU32=new Map();   // colour string -> Uint32 pixel, or 0 when it needs the fillRect path
function _pxCol(col){let v=_pxU32.get(col);if(v!==undefined)return v;v=0;
 const m=/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{6}ff)$/i.exec(col);
 if(m){let h=m[1];if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  v=(_pxLE?(0xff000000|b<<16|g<<8|r):(r<<24|g<<16|b<<8|0xff))>>>0}
 _pxU32.set(col,v);return v}
let _pxSlow=false;   // set when the last _pxPaint had to fall back to fillRect (the context's fillStyle was touched)
/* paint rows at integer scale s into a fresh canvas; returns null with no DOM */
function _pxPaint(rows,map,s){const h=rows.length,w=rows[0].length,W=w*s,c=pxCanvas(W,h*s);_pxSlow=false;if(!c||!c.getContext)return null;const g=c.getContext('2d');if(!g)return null;
 let id=null,buf=null,slow=null;
 for(let y=0;y<h;y++){const r=rows[y];for(let x=0;x<w;x++){let k=r[x];if(k==='.'||k===' '||k===undefined)continue;if(map&&map[k])k=map[k];const col=PAL[k];if(!col)continue;
  const v=_pxCol(col);if(!v){(slow||(slow=[])).push(x,y,col);continue}
  if(!buf){if(!g.createImageData||!g.putImageData){(slow||(slow=[])).push(x,y,col);continue}id=g.createImageData(W,h*s);buf=new Uint32Array(id.data.buffer)}
  if(s===1)buf[y*W+x]=v;else{let o=y*s*W+x*s;for(let j=0;j<s;j++,o+=W)for(let i=0;i<s;i++)buf[o+i]=v}}}
 if(buf)g.putImageData(id,0,0);
 if(slow){_pxSlow=true;for(let i=0;i<slow.length;i+=3){g.fillStyle=slow[i+2];g.fillRect(slow[i]*s,slow[i+1]*s,s,s)}}
 return c}
/* rows -> canvas at native size. map: optional {fromKey:toKey} recolour. */
function px(rows,map){return _pxPaint(rows,map,1)}
/* stack same-size row arrays; later layers win where not transparent */
function pxLayer(){const L=Array.prototype.filter.call(arguments,Boolean);if(!L.length)return[];return L[0].map((_,y)=>{let s='';for(let x=0;x<L[0][0].length;x++){let k='.';for(const l of L){const q=l[y]&&l[y][x];if(q&&q!=='.'&&q!==' ')k=q}s+=k}return s})}
function pxFlip(rows){return rows.map(r=>r.split('').reverse().join(''))}
/* cached scaled canvas for a keyed sprite. Row arrays are painted straight at the target scale (same pixels as
   px() + a nearest-neighbour drawImage); a canvas source, or a sprite needing the fillRect path, goes the old way. */
function pxScaled(key,rows,scale,map){scale=Math.max(1,Math.round(scale||1));const id=key+'@'+scale;let c=_pxCache.get(id);if(c!==undefined)return c;
 if(Array.isArray(rows)){c=_pxPaint(rows,map,scale);if(!c){_pxCache.set(id,null);return null}
  if(!_pxSlow){c.getContext('2d').imageSmoothingEnabled=false;_pxCache.set(id,c);return c}   // same context state as the drawImage copy below
  if(scale>1){c=px(rows,map)}}
 const src=Array.isArray(rows)?c:rows;if(!src){_pxCache.set(id,null);return null}
 c=pxCanvas(src.width*scale,src.height*scale);const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(src,0,0,c.width,c.height);_pxCache.set(id,c);return c}
/* Data URL straight from the rows, without a canvas (load time: ~400 icon URLs are made at boot, and canvas +
   putImageData + toDataURL cost ~0.35 ms each on a slow phone). Writes a small indexed-colour PNG (uncompressed
   deflate) that decodes to exactly the pixels the canvas would hold; returns null (=> canvas + toDataURL as before)
   for anything the fast path cannot reproduce exactly: alpha / named colours, >256 colours, no DOM. */
let _pxCRC=null;
function _pxPNG(rows,map,s){if(typeof document==='undefined'||typeof btoa!=='function')return null;
 const h=rows.length,w=rows[0].length;if(!w||!h)return null;const idx=new Uint8Array(w*h),cols=[],seen=new Map();let tr=false;
 for(let y=0;y<h;y++){const r=rows[y];for(let x=0;x<w;x++){let k=r[x];if(k==='.'||k===' '||k===undefined){tr=true;continue}if(map&&map[k])k=map[k];const col=PAL[k];if(!col){tr=true;continue}
  const v=_pxCol(col);if(!v)return null;let i=seen.get(v);if(i===undefined){i=cols.length+1;seen.set(v,i);cols.push(v)}idx[y*w+x]=i}}
 if(cols.length>255)return null;
 const n=cols.length+1,bd=n<=2?1:n<=4?2:n<=16?4:8,W=w*s,H=h*s,rb=Math.ceil(W*bd/8),raw=new Uint8Array((rb+1)*H);
 for(let y=0;y<H;y++){const o=y*(rb+1)+1,sy=((y/s)|0)*w;for(let x=0;x<W;x++){const v=idx[sy+((x/s)|0)];if(v){const b=x*bd;raw[o+(b>>3)]|=v<<(8-bd-(b&7))}}}
 if(!_pxCRC){_pxCRC=new Int32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;_pxCRC[i]=c}}
 const nb=Math.max(1,Math.ceil(raw.length/65535)),zl=2+5*nb+raw.length+4,np=3*n,
  B=new Uint8Array(8+25+12+np+(tr?13:0)+12+zl+12);let o=0;
 const u32=v=>{B[o++]=v>>>24&255;B[o++]=v>>>16&255;B[o++]=v>>>8&255;B[o++]=v&255};
 const head=(t,l)=>{u32(l);for(let i=0;i<4;i++)B[o++]=t.charCodeAt(i);return o-4};
 const crc=st=>{let c=-1;for(let i=st;i<o;i++)c=_pxCRC[(c^B[i])&255]^(c>>>8);u32(~c)};
 B.set([137,80,78,71,13,10,26,10]);o=8;
 let st=head('IHDR',13);u32(W);u32(H);B[o++]=bd;B[o++]=3;o+=3;crc(st);
 st=head('PLTE',np);o+=3;for(const v of cols){if(_pxLE){B[o++]=v&255;B[o++]=v>>>8&255;B[o++]=v>>>16&255}else{B[o++]=v>>>24&255;B[o++]=v>>>16&255;B[o++]=v>>>8&255}}crc(st);
 if(tr){st=head('tRNS',1);B[o++]=0;crc(st)}   // palette index 0 = fully transparent black, as the canvas stores it
 st=head('IDAT',zl);B[o++]=0x78;B[o++]=0x01;   // zlib stream of stored (uncompressed) deflate blocks
 for(let k=0,p=0;k<nb;k++,p+=65535){const l=Math.min(65535,raw.length-p);B[o++]=k===nb-1?1:0;B[o++]=l&255;B[o++]=l>>8;B[o++]=~l&255;B[o++]=~l>>8&255;B.set(raw.subarray(p,p+l),o);o+=l}
 let a=1,b2=0;for(let i=0;i<raw.length;i++){a+=raw[i];if(a>=65521)a-=65521;b2+=a;if(b2>=65521)b2-=65521}u32(((b2<<16)|a)>>>0);crc(st);
 st=head('IEND',0);crc(st);
 let bin='';for(let i=0;i<o;i+=8192)bin+=String.fromCharCode.apply(null,B.subarray(i,Math.min(o,i+8192)));return'data:image/png;base64,'+btoa(bin)}
/* cached data URL (for CSS backgrounds / <img>); '' when there is no DOM */
function pxURL(key,rows,scale,map){const id='u:'+key+'@'+(scale||1);let u=_pxCache.get(id);if(u!==undefined)return u;
 if(Array.isArray(rows)&&rows.length){try{u=_pxPNG(rows,map,Math.max(1,Math.round(scale||1)))}catch(e){u=null}if(u){_pxCache.set(id,u);return u}}
 const c=pxScaled(key,rows,scale,map);u='';try{if(c)u=c.toDataURL()}catch(e){}_pxCache.set(id,u);return u}
/* draw a sprite on a 2D context at integer scale, crisp */
function pxDraw(g,key,rows,x,y,scale,map){const c=pxScaled(key,rows,scale,map);if(!c)return;const s=g.imageSmoothingEnabled;g.imageSmoothingEnabled=false;g.drawImage(c,Math.round(x),Math.round(y));g.imageSmoothingEnabled=s}
