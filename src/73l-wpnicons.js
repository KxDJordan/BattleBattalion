/* ================= WEAPONS IN HAND AS THEIR ITEM ICONS (Detail High battle figures) =================
   The skeletal figures (73m-skel.js) hold the painted art of the item they carry: the same family painter, spec, materials and
   colours as the item's icon (06pc-items.js pkcSwordL / pkcAxeL / ... over PKC_TIER, famed / fabled / legendary entries included),
   unrotated from the icon's diagonal and laid along the weapon's local frame (grip at the origin, +x towards the point, +y the
   edge / head side, SU). Lengths follow the figure's weapon (humWInfo: the old sprite weapon's length and butt), so poses, hand
   placement and the tip-above-ground checks stay as they were; widths, heads, guards and fittings keep the icon's proportions at
   HWI_SC SU per icon unit. The outline pass of the icons (pkRender) is redone here with the line widths scaled so the silhouette
   reads as thick as the figure's own ink (HUM_LW). Bows are painted from the icon's materials on the figure's bow curve (the same
   tips, so the live string and arrow of the skeleton still anchor there); crossbows show the string spanned with a bolt or slack;
   guns keep the muzzle flash. A weapon whose item cannot be found or has no painter keeps the old vector weapon (humDrawW).
   Units only carry the sprite weapon (S.wd = usWdef(usWpnOf(item))): mercs put the item ids on the look spec (S.wdI, S.owId,
   S.altI); enemies' sprite weapons are mapped back to the item that draws them (hwiRev). Rendered weapons are cached per item,
   state and device scale (HWI.cv), and the skeleton bakes them once per look like the rest of its gear. Detail Low never comes here. */
const HWI={on:true,rev:null,cv:new Map(),fifo:[],cap:320,n:0,ms:0,ink:1};
const HWI_SC=6;                        // SU per icon unit
const HWI_INF=new WeakMap();
/* sprite weapon id -> the item drawn with it (plain items first, then famed / legendary ones for their own sprites) */
function hwiRev(){if(HWI.rev)return HWI.rev;const R=new Map();if(typeof ITEMS!=='object'||!ITEMS||typeof usWpnOf!=='function')return R;
 for(const pass of[0,1])for(const id in ITEMS){const I=ITEMS[id];if(!I||I.k!=='w'||!!(I.famed||I.legend)!==!!pass)continue;let s=null;try{s=usWpnOf(id)}catch(e){}if(s&&!R.has(s))R.set(s,id)}
 HWI.rev=R;return R}
const hwiBase=id=>String(id||'').replace(/:L$/,'');
function hwiItem(W,iid){if(!W||!W.id)return null;const wid=hwiBase(W.id);
 if(typeof iid==='string'&&ITEMS[iid]&&ITEMS[iid].k==='w'){let s=null;try{s=usWpnOf(iid)}catch(e){}if(s===wid)return iid}
 const R=hwiRev();return R.get(wid)||R.get(wid.replace(/\*/g,''))||null}
/* the item's painted spec (06pc-specs.js); the gladiators' trident has its own painter in the icon set */
const HWI_TRI={trident:{f:'tri'},fuscina:{f:'tri',bl:'silver',barbs:1,collar:1}};
function hwiSpec(id){if(HWI_TRI[id])return Object.assign({},PKC_TIER[3],HWI_TRI[id]);return typeof pkcSpec==='function'?pkcSpec(id):null}
/* the figure's weapon info with the item's icon spec and geometry (or the plain info when it falls back) */
function humWIc(W,iid){const wi=humWInfo(W);if(!HWI.on||!W||wi.fam==='fist'||typeof PKC_IT!=='object')return wi;const it=hwiItem(W,iid);if(!it)return wi;
 let m=HWI_INF.get(W);if(!m){m=new Map();HWI_INF.set(W,m)}let o=m.get(it);if(o!==undefined)return o||wi;
 let sp=null;try{sp=hwiSpec(it)}catch(e){sp=null}
 if(!sp||!HWI_P[sp.f]||(wi.fam==='bow')!==(sp.f==='bw')){m.set(it,null);return wi}
 o=Object.assign({},wi,{id:wi.id+'#'+it,iid:it,ic:sp});if(sp.str)o.str=sp.str;hwiGeo(o);m.set(it,o);return o}
/* geometry in icon units along the weapon: a = butt behind the hand, b = reach in front of it (the old weapon's extents), gl = grip */
function hwiGeo(o){const s=HWI_SC,f=o.fam,L=o.len,B=o.back,sp=o.ic,G={a:B/s,b:L/s,gl:0,my:0};
 switch(f){
  case'dagger':case'sword':case'great':case'curved':{const gl0=f==='great'?Math.max(B,40):f==='dagger'?Math.max(18,B*.8):Math.max(26,B);G.b=L/s;G.gl=f==='great'||f==='curved'?Math.max(sp.grip||5,gl0/s):(sp.grip||5);
   G.a=G.gl+(sp.pr||Math.max(1.5,(sp.w||4)*.44))*2.2;o.gripC=-G.gl*s/2;break}
  case'axe':case'greataxe':G.b=((f==='greataxe'?Math.max(L,200):Math.max(L,130))+6)/s;break;
  case'club':G.b=(L+14)/s;break;
  case'mace':G.b=(L+10)/s;G.a=(B+4)/s;break;
  case'hammer':case'maul':{const big=f==='maul';G.b=(Math.max(L,big?190:140)-22)/s+(big?5.4:3.4);break}
  case'spear':case'trident':case'halberd':case'bill':case'glaive':G.a=(B+6)/s;break;
  case'staff':case'orb':G.b=(Math.max(L,170)+(f==='orb'?40:24))/s;G.a=(B+20)/s;break;
  case'xbow':G.b=(L+6)/s;G.a=9;break;
  case'pistol':{G.b=Math.max(L,90)/s;G.k=G.b/19.4;G.a=7*G.k;G.my=-3.3*G.k;break}
  case'musket':G.b=Math.max(L,200)/s;G.a=sp.pole?(B+50)/s:11.5;break}
 if(sp.f==='bw'){const n=Math.max(5,o.bow||6);G.H=(n*22+30)/s;G.rc=(o.recurve?12:0)/s}
 o.hg=G;return o}
/* ---- painters: 'up' draw like the icon (point up, -y; the hand at 0,0); 'fwd' draw in the weapon frame (+x forward) ---- */
const hwiTri=(g,o,G)=>{const M=pkcM(o.bl||'steel'),hy=-G.b+12.4;pkHaft(g,0,G.a,0,hy+2,2.8,pkcM(o.hf==='wood'?'darkwood':o.hf||'darkwood'));
 pkAt(g,0,hy,0,1,g=>{pkFill(g,pkS('M-5.6 2 Q0 4.6 5.6 2 L5.2 4.2 Q0 6.6 -5.2 4.2 Z'),M,{k:.4});
  for(const x of[-4.6,0,4.6]){pkFill(g,pkTube([x*.5,2.2,x,-2,x,-9+(x?1.4:0)],1.7,'round'),M,{k:.3,lw:PK.lw*.8});pkFill(g,pkPoly([x-1.4,-8+(x?1.4:0),x,-12.4+(x?1.4:0),x+1.4,-8+(x?1.4:0)]),M,{k:.3,lw:PK.lw*.7})}
  if(o.barbs)for(const x of[-4.6,4.6])pkFill(g,pkPoly([x,-5,x+(x<0?-2:2),-3.6,x,-3]),M,{k:.2,lw:PK.lw*.6})});
 if(o.collar)pkFill(g,pkTube([0,hy+5.6,0,hy+3.2],3.4,'round'),'gold',{k:.3,lw:PK.lw*.7})};
/* the bow on the figure's curve (humDrawBow: tips at x = -4 - rc, y = +-H; the belly's apex at x = bend), in the icon's materials */
function hwiBow(g,o,G,op){const s=HWI_SC,bend=(op.drawn?30:18)/s,tx=-4/s-G.rc,H=G.H,M=pkcM(o.mat||'wood'),w=o.w||3.4,wt=o.wt||[w*.7,w*.7],ay=(o.asym||0)/14*H;
 const q1=pkQ(tx,-H,bend*2.2,-H*.55+ay*.5,bend,ay,14),q2=pkQ(bend,ay,bend*2.2,H*.55+ay*.5,tx,H,14),pts=q1.concat(q2.slice(2)),n=pts.length>>1;
 if(o.rc){for(const d of[-1,1])pkFill(g,pkTube(pkQ(tx,d*H,tx-1.4,d*(H+1.8),tx-3,d*(H+1.2),6),[wt[0]*1.15,wt[0]*.7],'round'),M,{k:.4})}
 pkFill(g,pkTube(pts,wt,'round'),M,{k:.9,inside:(g,m)=>{const hl=[];for(let i=2;i<n*.45;i++)hl.push(pts[i*2]-wt[0]*.18,pts[i*2+1]);pkHi(g,pkPoly(hl,1),.9,.45);
  if(o.bands)for(const t of o.bands){const i=Math.max(1,Math.min(n-2,Math.round(t*(n-1)))),x=pts[i*2],y=pts[i*2+1],dx=pts[i*2+2]-pts[i*2-2],dy=pts[i*2+3]-pts[i*2-1],l=Math.hypot(dx,dy)||1,nx=-dy/l*wt[0]*.75,ny=dx/l*wt[0]*.75;
   pkLine(g,`M${x-nx} ${y-ny} L${x+nx} ${y+ny}`,1,pkMat(o.bandMat||'blood')[2],1)}}});
 if(o.tips)for(const d of[-1,1])pkFill(g,pkCirc(tx+.3,d*H,1.4),pkcM(o.tips),{ball:1,k:.3,lw:PK.lw*.8});
 pkFill(g,pkRect(bend-wt[0]*.5-.9,ay-3.2,wt[0]+1.8,6.4,1),pkcM(o.grip||'leather'),{k:.5});
 if(o.glow)pkcGlow(g,bend,ay,13,o.glow,.45)}
const HWI_P={
 sw:{paint:(g,o,G)=>pkcSwordL(g,Object.assign({},o,{len:G.b,grip:G.gl}))},
 ax:{paint:(g,o,G)=>pkcAxeL(g,o,G.a,G.b)},
 mc:{paint:(g,o,G)=>pkcMaceL(g,o,G.a,G.b)},
 hm:{paint:(g,o,G)=>pkcHammerL(g,o,G.a,G.b)},
 sp:{paint:(g,o,G)=>pkcSpearL(g,o,G.a,G.b)},
 pl:{paint:(g,o,G)=>pkcPoleL(g,o,G.a,G.b)},
 st:{paint:(g,o,G)=>pkcStaffL(g,o,G.a,G.b)},
 tri:{paint:hwiTri},
 xb:{paint:(g,o,G,op)=>{const a=13,h=a-9,b=G.b-h,P=o.P||12,py=-b+3.6,nut=py+9,q=Object.assign({},o);g.translate(0,-h);   // the trigger in the hand
  if(op.loaded===false){pkLine(g,`M${-P+.6} ${py+3.2} L${P-.6} ${py+3.2}`,o.sw||.95,o.str||'#efe6c8');q.str='rgba(0,0,0,0)'}
  pkcXbowL(g,q,a,b);if(op.loaded!==false)pkArrow(g,0,nut+.6,0,-b-3,{w:1.3,head:3.8,mat:'steel'})}},
 gn:{paint:(g,o,G)=>{if(o.pole){pkcGunL(g,o,G.a,G.b);return}const a=o.a||13.5,h=a-11.5;g.translate(0,-h);pkcGunL(g,o,a,G.b-h)}},
 ps:{fr:'fwd',paint:(g,o,G)=>{g.scale(G.k,G.k);g.translate(-11,-13);pkcPistol(g,o)},box:G=>[-8*G.k,-8*G.k,22*G.k,18*G.k]},
 bw:{fr:'fwd',paint:hwiBow,box:(G,op)=>[-4/HWI_SC-G.rc-5,-G.H-5,(op.drawn?30:18)*2.2/HWI_SC+4,G.H+5]}};
/* render one weapon (cached): the icon pipeline (paint, ink outline pass, post glints) on a canvas in the weapon frame */
const HWI_SCR={l:null,s:null};
function hwiCanvas(k,W,H){let c=HWI_SCR[k];if(!c)c=HWI_SCR[k]=document.createElement('canvas');if(c.width<W||c.height<H){c.width=Math.max(c.width,W);c.height=Math.max(c.height,H)}
 const q=c.getContext('2d');q.setTransform(1,0,0,1,0,0);q.globalAlpha=1;q.globalCompositeOperation='source-over';q.clearRect(0,0,W,H);return c}
function hwiRender(wi,P,op,pu){const t0=performance.now(),G=wi.hg,up=P.fr!=='fwd',s=HWI_SC;
 const bx=up?[-(G.a+3),-15,G.b+3,15]:P.box(G,op),W=Math.ceil((bx[2]-bx[0])*pu)+2,H=Math.ceil((bx[3]-bx[1])*pu)+2;if(!(W>2&&H>2)||W*H>6e6)return null;
 const L=hwiCanvas('l',W,H),q=L.getContext('2d'),ox=1-bx[0]*pu,oy=1-bx[1]*pu;
 const sv=[PK.u,PK.lw,PK.ol,PK.post,PK_L[0],PK_L[1]];
 // the icon lights its art from the upper left with the weapon on the diagonal: keep that light relative to the weapon
 PK.u=pu;PK.post=[];PK.lw=1.1*HWI.ink;PK.ol=1.15*HWI.ink;if(up){const c=Math.SQRT1_2;PK_L[0]=(sv[4]-sv[5])*c;PK_L[1]=(sv[4]+sv[5])*c}
 let out=null;
 try{q.setTransform(pu,0,0,pu,ox,oy);if(up)q.rotate(Math.PI/2);q.lineJoin='round';q.lineCap='round';P.paint(q,wi.ic,G,op);
  out=document.createElement('canvas');out.width=W;out.height=H;const o=out.getContext('2d');
  const S=hwiCanvas('s',W,H),z=S.getContext('2d');z.drawImage(L,0,0);z.globalCompositeOperation='source-in';z.fillStyle=PK.ink;z.fillRect(0,0,W,H);z.globalCompositeOperation='source-over';
  const r=PK.ol*pu,bxo=up?-.057:.12,byo=up?.226:.2;for(let i=0;i<16;i++){const a=i*Math.PI/8;o.drawImage(S,0,0,W,H,Math.cos(a)*r+r*bxo,Math.sin(a)*r+r*byo,W,H)}
  o.drawImage(L,0,0,W,H,0,0,W,H);
  if(PK.post.length){o.setTransform(pu,0,0,pu,0,0);for(const fn of PK.post){try{fn(o)}catch(e){}}o.setTransform(1,0,0,1,0,0)}}
 catch(e){if(!HWI.err){HWI.err=1;console.error('weapon icon',wi.iid,e)}out=null}
 finally{PK.u=sv[0];PK.lw=sv[1];PK.ol=sv[2];PK.post=sv[3];PK_L[0]=sv[4];PK_L[1]=sv[5]}
 HWI.n++;HWI.ms+=performance.now()-t0;if(!out)return null;const k=pu/s;return{cv:out,x:-ox/k,y:-oy/k,w:W/k,h:H/k}}
/* draw the item's weapon at the current transform (the weapon frame, SU); false when it cannot (the caller draws the old one) */
function hwiDraw(g,wi,o){const P=wi.ic&&HWI_P[wi.ic.f];if(!P||typeof document==='undefined')return false;o=o||{};const m=g.getTransform(),ks=Math.hypot(m.a,m.b)||1,pu=Math.max(.4,Math.round(ks*HWI_SC*16)/16);
 const st=(wi.fam==='xbow'?(o.loaded===false?'u':'L'):'')+(o.drawn?'D':''),key=wi.id+'|'+st+'|'+pu;let r=HWI.cv.get(key);
 if(r===undefined){r=hwiRender(wi,P,o,pu);HWI.cv.set(key,r);HWI.fifo.push(key);while(HWI.fifo.length>HWI.cap)HWI.cv.delete(HWI.fifo.shift())}
 if(!r)return false;const G=wi.hg,s=HWI_SC;
 humBBp(g,-G.a*s-10,0,30);humBBp(g,G.b*s+10,0,40);humBBp(g,G.b*s*.75,0,50);
 g.drawImage(r.cv,r.x,r.y,r.w,r.h);
 if(o.fire&&(wi.fam==='pistol'||wi.fam==='musket')){const x=G.b*s,y=G.my*s;humSh(g,humPoly([x+4,y-6,x+30,y-16,x+22,y-4,x+40,y,x+22,y+4,x+30,y+14,x+4,y+4]),'#ffd060',{lw:4})}
 if(o.crank&&wi.fam==='xbow')humSh(g,humCirc(-G.a*s+20,0,9),humHex('c'));
 return true}
/* the skeleton's entry points: the item's art when it has one, else the old painters (73k-humans.js) */
function humDrawWAny(g,wi,o){if(wi&&wi.ic&&wi.ic.f!=='bw'&&hwiDraw(g,wi,o))return;humDrawW(g,wi,o)}
function humDrawBowAny(g,wi,draw,arrow,hx){if(wi&&wi.ic&&wi.ic.f==='bw'&&hwiDraw(g,wi,{drawn:!!draw})){if(hx!==false)humDrawBowString(g,wi,draw,arrow,hx);return}humDrawBow(g,wi,draw,arrow,hx)}
