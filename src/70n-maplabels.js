/* ================= BAND NAMES ON THE WORLD MAP =================
   A small name plate under every rival mercenary company and every town guard the player can see on the world map:
     - a rival company (goal 'merc'): its name, r.n ("The Iron Wolves"); zoomed out, r.short ("Iron Wolves");
     - a town's garrison out on a sally (43-garrisons.js, p.gar): "<Town> Watch" for a free town's watch, "<Town> Garrison" for a house town;
     - a house patrol on the roads between its towns: "<Town> Guard" after the town it marched from (p.from), else "<House> Patrol";
       a house's riders hunting the company: "<House> Riders". Sieging hosts and crisis hosts are armies, not guards: no plate.
   Names are derived from what the save already holds (no rnd draws, nothing stored). The plate carries the band's colours: a rival in
   its livery (a little banner at Detail High, a two-colour swatch at Detail Low), a guard in its house's colours (the free towns' grey
   green for a watch); a band out to fight the company (partyHostile) gets a red rim.
   Drawn after the scene in device pixels, like the towns' plates (70-render.js): Detail High in Fredoka, Detail Low in the map's own pixel
   capitals (WFONT). One cached canvas per text / colours / stance / detail / dpr. Only bands drawn this frame get a plate (fog of war:
   drawWorld's own visibility test). Zoomed out (below .8 of the default scale) the names shorten; at the farthest zoom only rival
   companies keep theirs. Plates never cover a town's plate or each other: the most important first (out to fight the company, then a
   rival company, then the nearest), a plate wholly inside the scene and clear of the HUD's overlays (the bars and rail, the minimap, a toast, a readout card: mlBlocked), a plate shown last frame keeps its place against a newcomer; the losers fade out, newcomers fade in.
   Settings > "Band names on map" (SET.bandNames, default on). Tapping a plate is tapping its band (worldPick).
   Public: mlOn mlName mlBegin mlCand mlLayout mlSig mlDraw mlPick */
const ML={st:new Map(),c:[],n:0,cache:new Map(),live:false,far:0,drawn:[],dn:0,bx:0,by:0,sc:1};
function mlOn(){return!(typeof SET==='object'&&SET&&SET.bandNames===false)}
function mlHex(k,d){if(typeof BANNERC==='object'&&BANNERC[k]&&Array.isArray(BANNERC[k].r)&&PAL[BANNERC[k].r[1]])return PAL[BANNERC[k].r[1]];return PAL[k]||d}
// what band p is called on the map, or null: {t (the text), k ('rival' | 'guard'), bn (a banner for the plate), c1, c2 (PAL keys), host}
// far: 0 the full name, 1 shortened, 2 the farthest zoom (rivals only)
function mlName(p,far){if(!p||p.gone)return null;far=far|0;
 if(p.goal==='merc'){const r=typeof rivalById==='function'?rivalById(p.f):null;if(!r||!r.n)return null;const sh=r.short||String(r.n).replace(/^The /,'');
  return{t:far?sh:r.n,k:'rival',bn:{name:r.n,c1:r.c1,c2:r.c2,emblem:r.emblem,div:r.div,c3:r.c3,shape:r.shape},c1:r.c1,c2:r.c2}}
 if(p.goal!=='patrol'||far>=2||p.cr||p.siege!=null||p.siegeT!=null)return null;
 const T=i=>G&&G.towns&&Number.isInteger(i)&&G.towns[i]?G.towns[i].name:'',h=typeof houseById==='function'?houseById(p.f):null,col=h?{c1:h.c1,c2:h.c2,bn:{name:h.n,c1:h.c1,c2:h.c2,emblem:h.emblem,div:h.div,c3:h.c3,shape:h.shape}}:{c1:'5',c2:'l',bn:null};
 let t='';if(p.gar!=null){const n=T(p.gar);if(!n)return null;t=n+(p.f==='free'||!h?' Watch':' Garrison')}
 else if(!h)return null;
 else if(p.hunt)t=(far?h.short||h.n:h.n)+' Riders';
 else{const n=T(p.from);t=n?n+' Guard':(far?h.short||h.n:h.n)+' Patrol'}
 return{t,k:'guard',bn:col.bn,c1:col.c1,c2:col.c2}}
function mlFar(){const r=WV.sc/Math.max(1,WV.sdef);return r<.6?2:r<.8?1:0}

/* ---- the plate canvases ---- */
function mlPlateHD(t,c1,c2,host,bn,far,dpr){const fs=Math.round((far?10:11)*dpr),h=Math.round((far?14:15)*dpr),pad=Math.round(4*dpr),tail=Math.round(3*dpr),lw=Math.max(1,Math.round(1.2*dpr)),ic=bn?Math.round(h*.62):Math.round(4*dpr),gap=Math.round(3*dpr);
 const font='500 '+fs+'px "Fredoka","Alegreya Sans",sans-serif',m=pxCanvas(4,4).getContext('2d');m.font=font;const tw=Math.ceil(m.measureText(t).width),w=pad+ic+gap+tw+pad+lw*2,H=h+tail+Math.round(dpr);
 const c=pxCanvas(w,H),q=c.getContext('2d'),A=mlHex(c1,'#3f8a7a'),B=mlHex(c2,'#e8e0c8'),rim=host?'#e0503c':bnHexMixSafe(A,'#ffffff',.25),y0=tail,r=Math.round(h/2);
 // shadow, body, rim, the tail pointing up at the band
 q.fillStyle='rgba(6,12,11,.45)';rrect(q,lw,y0+Math.round(dpr),w-lw*2,h,r);q.fill();
 q.fillStyle='rgba(11,21,20,.86)';rrect(q,lw/2,y0,w-lw,h-lw/2,r);q.fill();q.lineWidth=lw;q.strokeStyle=rim;rrect(q,lw/2,y0,w-lw,h-lw/2,r);q.stroke();
 q.fillStyle=rim;q.beginPath();q.moveTo(w/2-tail,y0+lw/2);q.lineTo(w/2,0);q.lineTo(w/2+tail,y0+lw/2);q.closePath();q.fill();
 // the colours: a little banner (or a two-colour bar)
 const ix=pad+lw;if(bn&&typeof bnPaintCanvas==='function'){let b=null;try{b=bnPaintCanvas(bn,Math.max(24,ic*2))}catch(e){b=null}
  if(b){const bh=Math.round(h*.74),bw=Math.round(bh*b.width/b.height);q.imageSmoothingEnabled=true;q.drawImage(b,ix+Math.round((ic-bw)/2),y0+Math.round((h-bh)/2),bw,bh)}else{q.fillStyle=A;q.fillRect(ix,y0+lw*2,ic,h-lw*4);q.fillStyle=B;q.fillRect(ix+ic/3,y0+lw*2,ic/3,h-lw*4)}}
 else{q.fillStyle=A;rrect(q,ix,y0+Math.round(h*.25),ic,Math.round(h*.5),Math.round(dpr));q.fill();q.fillStyle=B;q.fillRect(ix+Math.round(ic*.35),y0+Math.round(h*.25),Math.max(1,Math.round(ic*.3)),Math.round(h*.5))}
 q.font=font;q.textBaseline='middle';q.textAlign='left';q.fillStyle=host?'#ffd2c8':'#f2ead2';q.fillText(t,ix+ic+gap,y0+h/2+dpr*.5);return c}
function bnHexMixSafe(a,b,t){if(typeof bnHexMix==='function'&&/^#[0-9a-f]{6}$/i.test(a))return bnHexMix(a,b,t);return a}
// Detail Low: the towns' plate in miniature (70-render.js wvPlate): the map's pixel capitals on dark, a swatch of the colours, a red rim if hostile
function mlPlateLow(t,c1,c2,host){const G_=[];let w=0;for(const ch of String(t).toUpperCase()){const s=WFONT[ch];if(!s)continue;const r=s.split('/');G_.push(r);w+=r[0].length+1}
 const sw=4,W_=3+sw+2+w+2,H_=10+2,c=mkCanvas(W_,H_),q=c.getContext('2d'),y0=2,A=PAL[c1]?c1:'5',B=PAL[c2]?c2:'l';
 q.fillStyle=PAL[host?'g':'0'];q.fillRect(1,y0,W_-2,10);q.fillRect(0,y0+1,W_,8);q.fillRect((W_>>1)-1,y0-1,3,1);q.fillRect(W_>>1,y0-2,1,1);   // the rim and a nub pointing up at the band
 q.fillStyle=PAL['1'];q.fillRect(1,y0+1,W_-2,8);q.fillStyle=PAL[A];q.fillRect(3,y0+2,sw,6);q.fillStyle=PAL[B];q.fillRect(4,y0+2,2,6);
 q.fillStyle=PAL[host?'r':'l'];let x=3+sw+2;for(const r of G_){for(let y=0;y<6;y++)for(let i=0;i<r[y].length;i++)if(r[y][i]==='#')q.fillRect(x+i,y0+2+y,1,1);x+=r[0].length+1}return c}
function mlPlate(N,host,far){const hd=WVHD,fok=hd&&typeof document==='object'&&document.fonts&&document.fonts.check?document.fonts.check('11px "Fredoka"'):true,id=(hd?'h':'l')+N.t+'|'+N.c1+N.c2+(host?1:0)+far+(hd?dpr+''+(fok?1:0)+(N.bn?N.bn.emblem+N.bn.div+N.bn.c3+N.bn.shape:''):'');
 let c=ML.cache.get(id);if(c)return c;if(ML.cache.size>120)ML.cache.clear();c=hd?mlPlateHD(N.t,N.c1,N.c2,host,N.bn,far,dpr):mlPlateLow(N.t,N.c1,N.c2,host);ML.cache.set(id,c);return c}
if(typeof onArtChange==='function')onArtChange(()=>ML.cache.clear());

/* ---- each frame (drawWorld): candidates from the bands drawn, then the layout, the draw list, the drawing ---- */
function mlBegin(){ML.n=0;ML.far=mlFar();ML.live=false}
function mlCand(o,x,y){if(!mlOn())return;const N=mlName(o,ML.far);if(!N)return;const i=ML.n++,C=ML.c[i]||(ML.c[i]={});C.o=o;C.x=x;C.y=y;C.N=N;C.host=typeof partyHostile==='function'&&!!partyHostile(o)}
const ML_GAP=2;
function mlLayout(dt,plates,P){const sc=WV.sc,bx=WV.bx,by=WV.by,dp=ML.dp=Math.max(2,Math.round(dpr*1.5)-1),R=[];ML.bx=bx;ML.by=by;ML.sc=sc;ML.dn=0;
 // the towns' plates are fixed obstacles
 for(let i=0;i<WV.np;i++){const q=plates[i],w=q.c.width*(q.hd?1:P),h=q.c.height*(q.hd?1:P),x=Math.round(bx+q.x*sc-w/2),y=Math.round(by+q.y*sc-h);R.push(x,y,x+w,y+h)}
 mlBlocked(R);
 const cx=G.p.x/WVU,cy=G.p.y/WVU,L=[];
 for(let i=0;i<ML.n;i++){const C=ML.c[i],c=mlPlate(C.N,C.host,ML.far),w=c.width*(WVHD?1:dp),h=c.height*(WVHD?1:dp),st=ML.st.get(C.o.id);
  C.c=c;C.w=w;C.h=h;C.sx=Math.round(bx+Math.round(C.x*sc)-w/2);C.sy=Math.round(by+Math.round((C.y+2)*sc));
  C.pr=(C.host?4:0)+(C.N.k==='rival'?2:0)+(st&&st.on?1.5:0)-Math.min(1.4,Math.hypot(C.x-cx,C.y-cy)/400);L.push(C)}
 L.sort((a,b)=>b.pr-a.pr||a.o.id-b.o.id);
 const k=reduced||WV.boot?1:1-Math.exp(-(dt||0)*9),seen=ML.seen||(ML.seen=new Set());seen.clear();
 const ex0=SR.x*dpr,ey0=SR.y*dpr,ex1=(SR.x+SR.w)*dpr,ey1=(SR.y+SR.h)*dpr;   // inside the scene: not under the bars and rails
 for(const C of L){let ok=C.sx>=ex0&&C.sy>=ey0&&C.sx+C.w<=ex1&&C.sy+C.h<=ey1;const x0=C.sx-ML_GAP,y0=C.sy-ML_GAP,x1=C.sx+C.w+ML_GAP,y1=C.sy+C.h+ML_GAP;
  if(ok)for(let j=0;j<R.length;j+=4)if(x0<R[j+2]&&x1>R[j]&&y0<R[j+3]&&y1>R[j+1]){ok=false;break}
  if(ok)R.push(C.sx,C.sy,C.sx+C.w,C.sy+C.h);
  let st=ML.st.get(C.o.id);if(!st){st={a:reduced||WV.boot?(ok?1:0):0,on:false};ML.st.set(C.o.id,st)}st.on=ok;const tg=ok?1:0;st.a+=(tg-st.a)*k;if(Math.abs(tg-st.a)<.02)st.a=tg;else ML.live=true;
  seen.add(C.o.id);C.a=st.a;if(st.a>.01){const D=ML.drawn[ML.dn]||(ML.drawn[ML.dn]={});ML.dn++;D.c=C.c;D.x=C.sx;D.y=C.sy;D.w=C.w;D.h=C.h;D.a=Math.round(st.a*50)/50;D.o=C.o}}
 for(const id of ML.st.keys())if(!seen.has(id))ML.st.delete(id)}   // a band out of sight loses its plate at once (and fades in again when seen)
function mlSig(wsg){wsg(ML.dn);for(let i=0;i<ML.dn;i++){const D=ML.drawn[i];wsg(D.c);wsg(D.x);wsg(D.y);wsg(D.a)}}
function mlDraw(g){if(!ML.dn)return;const a0=g.globalAlpha;g.imageSmoothingEnabled=false;for(let i=0;i<ML.dn;i++){const D=ML.drawn[i];g.globalAlpha=a0*D.a;g.drawImage(D.c,D.x,D.y,D.w,D.h)}g.globalAlpha=a0}
// the HUD's overlays on the scene (the minimap, a toast, the readout card of a tapped town or band, a cost popup, the bars and rail):
// device-px rects every plate keeps clear of. Read from the page at most every 200 ms (a getBoundingClientRect each, no work per frame).
const ML_OVL=['wmap','toast','inspect','costPop','hud','wbar'];
function mlBlocked(R){if(typeof document!=='object'||!document||!document.getElementById)return;const t=typeof performance==='object'?performance.now():0;
 if(!ML.bk||t-ML.bkt>200||t<ML.bkt){ML.bkt=t;const B=ML.bk=[];for(const id of ML_OVL){const e=document.getElementById(id);if(!e||e.hidden||e.classList.contains('hidden'))continue;
   if((id==='toast'||id==='inspect')&&!e.classList.contains('on'))continue;let cs=null;try{cs=getComputedStyle(e)}catch(x){}if(cs&&(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0))continue;
   const r=e.getBoundingClientRect();if(r.width>0&&r.height>0)B.push(Math.floor(r.left*dpr),Math.floor(r.top*dpr),Math.ceil(r.right*dpr),Math.ceil(r.bottom*dpr))}}
 for(let i=0;i<ML.bk.length;i++)R.push(ML.bk[i])}
// worldPick: a tap on a plate is a tap on its band (world coords in, the band out)
function mlPick(wx,wy){if(!ML.dn||!(ML.sc>0))return null;const sx=ML.bx+wx/WVU*ML.sc,sy=ML.by+wy/WVU*ML.sc;
 for(let i=ML.dn-1;i>=0;i--){const D=ML.drawn[i];if(D.a<.5)continue;if(sx>=D.x-4&&sx<=D.x+D.w+4&&sy>=D.y-2&&sy<=D.y+D.h+4&&G.parties.includes(D.o)&&!D.o.gone)return D.o}return null}
