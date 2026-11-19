/* ================= LAYOUT (chrome) =================
   Layout.update()  recompute everything (called from setUI(), resize, orientationchange, fullscreenchange)
   Layout.w/.h      viewport, CSS px
   Layout.safe      {t,r,b,l} safe-area insets, px (read from a probe element, so env() and test overrides both work)
   Layout.scene     {x,y,w,h} viewport area not covered by rails / top strip for the current mode
   Layout.mini      {x,y,w,h} minimap frame rect in world mode (it floats over the scene's bottom-left corner), else null
   Layout.tall      viewport is taller than wide (rails become two bottom panels in battle)
   Layout.touch     primary pointer is coarse
   Layout.rotate    the rotate prompt is showing
   Calls onLayoutChange() afterwards when that global exists. */
const Layout={w:0,h:0,safe:{t:0,r:0,b:0,l:0},scene:{x:0,y:0,w:0,h:0},mini:null,tall:false,touch:false,rotate:false,anyway:false,
 _px(v){const n=parseFloat(v);return isFinite(n)?n:0},
 _rect(id){const e=$(id);if(!e||e.classList.contains('hidden'))return null;const r=e.getBoundingClientRect();return r.width||r.height?r:null},
 readSafe(){const p=$('safeProbe');if(!p)return;let cs=null;try{cs=getComputedStyle(p)}catch(e){}if(!cs)return;
  this.safe={t:this._px(cs.paddingTop),r:this._px(cs.paddingRight),b:this._px(cs.paddingBottom),l:this._px(cs.paddingLeft)}},
 update(){const app=$('app');this.w=window.innerWidth;this.h=window.innerHeight;this.readSafe();
  let coarse=false;try{coarse=window.matchMedia('(pointer:coarse)').matches}catch(e){}
  this.touch=coarse;this.tall=this.h>this.w;this.rotate=this.touch&&this.tall&&!this.anyway;
  if(app){app.classList.toggle('tall',this.tall);app.classList.toggle('touch',this.touch);
   ['title','world','battle'].forEach(m=>app.classList.toggle('m-'+m,mode===m))}
  const ro=$('rotate');if(ro)ro.classList.toggle('hidden',!this.rotate);
  if(mode==='world'&&typeof hudFit==='function'){try{hudFit()}catch(e){}}
  const s=this.safe;let x0=s.l,y0=s.t,x1=this.w-s.r,y1=this.h-s.b;this.mini=null;
  if(mode==='world'){const top=this._rect('hud'),rr=this._rect('wbar'),mm=this._rect('wmap');
   if(top)y0=Math.max(y0,top.bottom);if(rr)x1=Math.min(x1,rr.left);if(mm)this.mini={x:mm.left,y:mm.top,w:mm.width,h:mm.height}}
  else if(mode==='battle'){x0+=6;x1-=6;y0+=this.tall?104:54;y1-=66}   // floating HUD: unit chip + turn tokens above, ability bar below
  this.scene={x:Math.round(x0),y:Math.round(y0),w:Math.max(1,Math.round(x1-x0)),h:Math.max(1,Math.round(y1-y0))};
  if(app){app.style.setProperty('--scx',(this.scene.x+this.scene.w/2)+'px');app.style.setProperty('--scw',this.scene.w+'px');app.style.setProperty('--scb',(this.h-this.scene.y-this.scene.h)+'px')
   const tx=this.mini?Math.max(this.scene.x,this.mini.x+this.mini.w):this.scene.x,tw=this.scene.x+this.scene.w-tx;   // toast lane: clear of the minimap
   app.style.setProperty('--tcx',(tx+tw/2)+'px');app.style.setProperty('--tcw',tw+'px')}
  const bb=$('bBot');if(bb)bb.style.top=(this.scene.y+this.scene.h)+'px';   // marker: lower edge of the battle scene
  if(typeof onLayoutChange==='function'){try{onLayoutChange()}catch(e){}}
  else if(mode==='battle'&&B&&typeof layoutBattle==='function'){try{layoutBattle()}catch(e){}}}};   // pre-scene-agent renderer reads #bTop/#bBot
