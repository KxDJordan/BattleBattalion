/* ================= SHELL (chrome): settings, modal, toast, mode switching, transitions, title, menu ================= */
/* ---- settings ----
   SET is the player's preferences, kept under SETKEY (separate from the save, survives a new company).
     SET.speed    1 normal | .35 fast   (copied to SPEEDF, which scales every battle delay)
     SET.confirm  true: the first tap on a foe shows the forecast, the second strikes. Default: on for touch, off for mouse.
     SET.motion   'auto' (follow the device) | 'reduce'
   reducedMotion() is true when either SET.motion==='reduce' or the device asks for it; #app carries class .rm then. */
const SETKEY='wyrdmarch_settings_v1';
const SET={speed:1,confirm:false,motion:'auto',deploy:true};
let _setConfirmUser=false,_rmq=null;
function coarsePointer(){try{return!!window.matchMedia('(pointer:coarse)').matches}catch(e){return false}}
function reducedMotion(){let dev=false;try{dev=!!(_rmq&&_rmq.matches===true)}catch(e){}return SET.motion==='reduce'||dev}
function applyMotion(){const rm=reducedMotion();try{const a=$('app');if(a)a.classList.toggle('rm',rm)}catch(e){}
 if(typeof reduced!=='undefined')reduced=rm;if(rm&&typeof Wipe!=='undefined')Wipe.stop();return rm}
function loadSettings(){SET.confirm=coarsePointer();
 try{const o=JSON.parse(storeGet(SETKEY)||'null');if(o&&typeof o==='object'){if(o.speed===1||o.speed===.35)SET.speed=o.speed;
   if(typeof o.confirm==='boolean'){SET.confirm=o.confirm;_setConfirmUser=true}if(o.motion==='auto'||o.motion==='reduce')SET.motion=o.motion;if(typeof o.deploy==='boolean')SET.deploy=o.deploy}}catch(e){}
 SPEEDF=SET.speed;
 try{_rmq=window.matchMedia('(prefers-reduced-motion: reduce)');const f=()=>applyMotion();if(_rmq.addEventListener)_rmq.addEventListener('change',f);else if(_rmq.addListener)_rmq.addListener(f)}catch(e){_rmq=null}
 applyMotion()}
function saveSettings(){const o={v:1,speed:SET.speed,motion:SET.motion,deploy:SET.deploy};if(_setConfirmUser)o.confirm=SET.confirm;return storeSet(SETKEY,JSON.stringify(o))}
function setOpt(k,v){if(k==='speed'){SET.speed=v===.35?.35:1;if(SPEEDF>0)SPEEDF=SET.speed}
 else if(k==='deploy'){SET.deploy=!!v}
 else if(k==='confirm'){SET.confirm=!!v;_setConfirmUser=true;if(typeof fcClear==='function')fcClear()}
 else if(k==='motion'){SET.motion=v==='reduce'?'reduce':'auto';applyMotion()}
 saveSettings();settingsRefresh();if(mode==='battle'&&B)updateBUI()}
function settingsHTML(){const fs=canFullscreen(),full=isFullscreen();
 const seg=(k,opts,cur)=>'<div class="seg" role="radiogroup">'+opts.map(o=>'<button class="pxb sm'+(o[0]===cur?' on':'')+'" role="radio" aria-checked="'+(o[0]===cur)+'" onclick="'+(k==='full'?'settingsFull()':'setOpt(\''+k+'\','+JSON.stringify(o[0]).replace(/"/g,"'")+')')+'">'+o[1]+'</button>').join('')+'</div>';
 const row=(icon,svg,t,d,ctl)=>'<div class="setr"><span class="seti">'+pic(icon,32,svg)+'</span><div class="sett"><b>'+t+'</b><small>'+d+'</small></div>'+ctl+'</div>';
 return'<div class="row sp seth"><h2>Settings</h2><button class="pri" onclick="closeSheet()">Done</button></div><div class="setl">'
 +row('fast','fast','Battle speed','How quickly foes and comrades act',seg('speed',[[1,'Normal'],[.35,'Fast']],SET.speed===.35?.35:1))
 +row('swords','sword','Confirm attacks','First tap shows the forecast, second tap strikes',seg('confirm',[[true,'On'],[false,'Off']],!!SET.confirm))
 +row('company','company','Deployment','Place your swords before each battle',seg('deploy',[[true,'On'],[false,'Off']],SET.deploy!==false))
 +row('info','sun','Motion','Auto follows this device'+(reducedMotion()&&SET.motion!=='reduce'?' (it asks for less motion)':''),seg('motion',[['auto','Auto'],['reduce','Reduced']],SET.motion))
 +(fs?row('fullscreen','full','Fullscreen','Hide the browser frame',seg('full',[[true,'On'],[false,'Off']],full)):'')
 +'</div><p class="dim setn">Kept on this device, apart from the company\'s save.</p>'}
function settingsSheet(){sheet(settingsHTML())}
function settingsOpen(){try{const b=$('sheetBody');return!!(sheetOpen&&b&&b.querySelector&&b.querySelector('.setl'))}catch(e){return false}}
function settingsRefresh(){if(!settingsOpen())return;const b=$('sheetBody'),st=b.scrollTop;b.innerHTML=settingsHTML();b.scrollTop=st}
function settingsFull(){toggleFullscreen();setTimeout(settingsRefresh,60);setTimeout(settingsRefresh,400)}

/* ---- transitions: a low-resolution canvas over everything, drawn in hard steps. It never takes input
   (pointer-events:none), so a tap during a wipe lands on what is underneath. Off under reduced motion.
   Wipe.play('dither'|'iris', rect?, ms?)  reveal the screen (or one rect of it) out of solid pine. ---- */
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const Wipe={cv:null,g:null,raf:0,job:null,
 ensure(){if(this.cv)return this.cv;try{const app=$('app');if(!app||typeof document==='undefined')return null;const c=document.createElement('canvas');c.id='wipe';c.setAttribute('aria-hidden','true');
   const g=c.getContext&&c.getContext('2d');if(!g||!g.fillRect)return null;app.appendChild(c);this.cv=c;this.g=g;return c}catch(e){return null}},
 stop(){if(this.raf){try{cancelAnimationFrame(this.raf)}catch(e){}this.raf=0}this.job=null;if(this.cv)this.cv.style.display='none'},
 play(kind,rect,ms){if(reducedMotion()||SPEEDF===0||typeof requestAnimationFrame!=='function')return false;const c=this.ensure();if(!c)return false;
  const W=window.innerWidth,H=window.innerHeight,cell=Math.max(4,Math.round(H/90)),w=Math.ceil(W/cell),h=Math.ceil(H/cell);if(!(w>0&&h>0))return false;
  if(c.width!==w||c.height!==h){c.width=w;c.height=h}c.style.width=w*cell+'px';c.style.height=h*cell+'px';c.style.display='block';
  const r=rect?{x:Math.floor(rect.left/cell),y:Math.floor(rect.top/cell),w:Math.ceil(rect.right/cell)-Math.floor(rect.left/cell),h:Math.ceil(rect.bottom/cell)-Math.floor(rect.top/cell)}:{x:0,y:0,w,h};
  this.job={kind,r,ms:ms||220,t0:performance.now(),steps:kind==='iris'?9:8,last:-1,w,h,close:!!rect};
  if(this.raf)cancelAnimationFrame(this.raf);this.draw(0);const tick=()=>{const j=this.job;if(!j){this.raf=0;return}const s=Math.floor((performance.now()-j.t0)/j.ms*j.steps);
   if(s>=j.steps){this.stop();return}if(s!==j.last)this.draw(s);this.raf=requestAnimationFrame(tick)};this.raf=requestAnimationFrame(tick);return true},
 draw(s){const j=this.job,g=this.g,r=j.r;j.last=s;g.clearRect(0,0,j.w,j.h);g.fillStyle=PAL['0'];
  if(j.kind==='iris'){const cx=r.x+r.w/2,cy=r.y+r.h/2,R=s/(j.steps-1)*(r.w/2+r.h/2+2);
   for(let y=r.y;y<r.y+r.h;y++){const hw=Math.floor(R-Math.abs(y+.5-cy));if(hw<=0){g.fillRect(r.x,y,r.w,1);continue}const a=Math.max(r.x,Math.floor(cx-hw)),b=Math.min(r.x+r.w,Math.ceil(cx+hw));
    if(a>r.x)g.fillRect(r.x,y,a-r.x,1);if(b<r.x+r.w)g.fillRect(b,y,r.x+r.w-b,1);
    if(b-a>2){g.fillRect(a,y,1,1);g.fillRect(b-1,y,1,1);g.clearRect(a-1,y,1,1);g.clearRect(b,y,1,1)}}}   // toothed edge
  else{const th=Math.round((s+1)/j.steps*16);for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(BAYER[(y&3)*4+(x&3)]>=th)g.fillRect(x,y,1,1)}}};
/* press feedback: every button flashes for a few frames even when the tap is shorter than a frame */
function wirePress(){try{document.addEventListener('pointerdown',e=>{if(reducedMotion())return;const b=e.target&&e.target.closest&&e.target.closest('button,[role=button]');if(!b||b.disabled)return;
  b.classList.add('prs');setTimeout(()=>b.classList.remove('prs'),110)},true)}catch(e){}}

/* ---- modal dialog ---- */
let _closing=false,_uiMode='';
function sheet(h){const b=$('sheetBody'),s=$('sheet'),was=sheetOpen;b.innerHTML=h;s.classList.remove('hidden');b.scrollTop=0;sheetOpen=true;
 if(Wipe.job&&Wipe.job.close)Wipe.stop();
 b.classList.remove('in');s.classList.remove('swin','swap');void b.offsetWidth;b.classList.add('in');s.classList.add(was?'swap':'swin')}
function closeSheet(quiet){const s=$('sheet'),was=sheetOpen&&!s.classList.contains('hidden');let rc=null;
 if(was&&!reducedMotion()){try{rc=$('sheetBody').getBoundingClientRect()}catch(e){}}
 s.classList.add('hidden');
 if(!_closing&&typeof closePanel==='function'){_closing=true;try{closePanel(quiet)}catch(e){}_closing=false}
 if(!_closing&&typeof closeMap==='function'){_closing=true;try{closeMap(quiet)}catch(e){}_closing=false}
 sheetOpen=false;if(G)G.townOpen=false;if(!quiet)save();
 if(rc&&rc.width>0&&!(Wipe.job&&!Wipe.job.close))Wipe.play('dither',rc,130)}
let toastT=0;function toast(t){const e=$('toast');e.textContent=t;e.classList.toggle('top',typeof panelOpen==='function'&&!!panelOpen());e.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove('on'),2600)}
function setUI(){const w=mode==='world',b=mode==='battle',t=mode==='title';
 $('title').classList.toggle('hidden',!t);
 ['hud','wbar','wmap'].forEach(id=>$(id).classList.toggle('hidden',!w));
 ['bTop','bLeft','bRight','bBot'].forEach(id=>$(id).classList.toggle('hidden',!b));
 if(typeof hudModeChange==='function')hudModeChange();
 if(t)renderTitle();if(b)updateBUI();if(w)worldChrome();
 Layout.update();
 if(_uiMode!==mode){const from=_uiMode;_uiMode=mode;if(from)Wipe.play(b?'iris':'dither',null,b?240:200)}}

/* ---- fullscreen (only ever from a click; silently ignored where refused) ---- */
function canFullscreen(){try{const d=document,e=d.documentElement;return!!((d.fullscreenEnabled||d.webkitFullscreenEnabled)&&(e.requestFullscreen||e.webkitRequestFullscreen))}catch(e){return false}}
function isFullscreen(){try{return!!(document.fullscreenElement||document.webkitFullscreenElement)}catch(e){return false}}
function toggleFullscreen(){try{const d=document,e=d.documentElement;
  if(isFullscreen()){const x=d.exitFullscreen||d.webkitExitFullscreen;if(x){const p=x.call(d);if(p&&p.catch)p.catch(()=>{})}}
  else{const rq=e.requestFullscreen||e.webkitRequestFullscreen;if(!rq)return;const p=rq.call(e);
   const lock=()=>{try{const q=screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape');if(q&&q.catch)q.catch(()=>{})}catch(e){}};
   if(p&&p.then)p.then(lock).catch(()=>{});else lock()}}catch(e){}}
function playAnyway(){Layout.anyway=true;Layout.update()}

/* ---- world chrome: contract marker on the rail, stand-in minimap until the scene agent's drawMinimap exists ---- */
function worldChrome(){if(mode!=='world'||!G)return;const cb=$('wbContract');
 if(cb){const c=G.contract;cb.classList.toggle('has',!!c);cb.classList.toggle('done',!!(c&&(c.done||c.type==='deliver')))}
 const zb=$('wbZoom');if(zb)zb.classList.toggle('on',G.zoom!==1&&G.zoom!=null);
 if(typeof drawMinimap!=='function'&&W&&W.img){const m=$('mini');if(!m)return;const x=m.getContext('2d'),k=m.width/WS;x.imageSmoothingEnabled=true;x.drawImage(W.img,0,0,m.width,m.height);
  x.fillStyle='#101d1c';for(const t of G.towns||[])x.fillRect(t.x*k-4,t.y*k-4,8,8);x.fillStyle='#e9e0c9';for(const t of G.towns||[])x.fillRect(t.x*k-2.5,t.y*k-2.5,5,5);
  x.fillStyle='#d1a94e';x.strokeStyle='#101d1c';x.lineWidth=2;x.beginPath();x.arc(G.p.x*k,G.p.y*k,6,0,7);x.fill();x.stroke()}}
function chromeTick(){if(mode==='battle'&&B&&B.cur){if(B.auto&&!B.busy&&!B.over&&B.cur.side===0&&!sheetOpen)nextAuto();else updateBUI()}else if(mode==='world')worldChrome()}

/* ---- menu ---- */
function mbtn(icon,label,sub,on,cls,svg){return`<button class="mi ${cls||''}" onclick="${on}">${pic(icon,32,svg)}<span><b>${label}</b><small>${sub}</small></span></button>`}
function menuSheet(){
 sheet(`<div class="row sp"><h2>The ledger</h2><span class="chip pxtag">Day ${G?G.day:1}</span></div>
<p class="dim">The company's book is kept in this browser. It is written whenever you enter a town or finish a battle.</p>
<div class="menu">${mbtn('back','Back to the march','Close this menu','closeSheet()','pri','play')}
${mbtn('save','Save now','Write the ledger','menuSave()','','save')}
${mbtn('settings','Settings','Speed, confirm, motion','settingsSheet()','','sun')}
${mbtn('close','Quit to title','Saves first','quitToTitle()','','door')}
${mbtn('skull','Abandon company','Start over from nothing','confirmNew()','warn','skull')}</div>`)}
function menuSave(){save();toast('Saved');closeSheet()}
function quitToTitle(){save();closeSheet(true);mode='title';setUI()}
function confirmNew(){sheet(`<h2>Start over?</h2><p>This company and its world are lost for good.</p><div class="row"><button class="warn" onclick="newGame()">Start over</button><button class="pri" style="flex:1" onclick="closeSheet()">${mode==='title'?'Keep the old company':'Keep playing'}</button></div>`)}

/* ---- title: a pixel dusk drawn at low resolution in PAL colours and shown at an integer scale ---- */
function thash(x,y){let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296}   // visual only, never the game stream
const TMAN=['....p','....j','.00.j','.00.j','0000j','0000j','.00.j','.0.0.','.0.0.'],
 TBAN=['c........','jgggggg..','jghgggg..','jggggg...','jgggggg..','j........','j.00.....','j.00.....','j0000....','j0000....','j.00.....','..0.0....','..0.0....'];
function paintTitle(g,w,h){const dot=(x,y,k)=>{g.fillStyle=PAL[k];g.fillRect(x,y,1,1)},box=(x,y,a,b,k)=>{g.fillStyle=PAL[k];g.fillRect(x,y,a,b)};
 const hz=Math.round(h*.72),bands=[[0,'0'],[.13,'1'],[.27,'2'],[.4,'3'],[.52,'4'],[.64,'n'],[.76,'m'],[.9,'d']];
 for(let y=0;y<hz;y++){let i=0;while(i+1<bands.length&&y>=Math.round(bands[i+1][0]*hz))i++;const k=bands[i][1],nx=bands[i+1],d=nx?Math.round(nx[0]*hz)-y:99;box(0,y,w,1,k);
  if(nx&&d<=3)for(let x=0;x<w;x++){const on=d===1?((x+y)&1)||!((x+2*y)&3):d===2?(x+y)&1:!((x+2*y)&3);if(on)dot(x,y,nx[1])}}
 for(let y=1;y<hz*.5;y++)for(let x=0;x<w;x++){const r=thash(x,y);if(r<.0035)dot(x,y,r<.0012?'l':'n')}
 const sx=Math.round(w*.72),sy=hz-Math.round(h*.19),sr=Math.max(5,Math.round(h*.075));
 for(let y=-sr-3;y<=sr+3;y++)for(let x=-sr-3;x<=sr+3;x++){const d=Math.sqrt(x*x+y*y);if(d<=sr-1.2)dot(sx+x,sy+y,'e');else if(d<=sr+.2)dot(sx+x,sy+y,'d');else if(d<=sr+2.6&&((x+y)&1))dot(sx+x,sy+y,'d')}
 [[.35,1.25],[.7,1.6]].forEach(([dy,k])=>{const y=sy+Math.round(sr*dy),a=Math.round(sx-sr*k);box(a,y,Math.round(sr*2*k),1,'m');box(a+3,y+1,Math.round(sr*2*k)-7,1,'m')});
 const ridge=(base,amp,f1,f2,ph,jag)=>{const o=[];for(let x=0;x<w;x++){const u=x/w;o.push(Math.round(base-amp*(.55+.45*Math.sin(u*f1+ph))*(.5+.5*Math.sin(u*f2+ph*2))-(thash(x>>1,ph*97|0)-.5)*jag))}return o};
 const fill=(R,k,rim)=>{for(let x=0;x<w;x++){box(x,R[x],1,h-R[x],k);if(rim&&(x===0||R[x-1]>=R[x]))dot(x,R[x],rim)}};
 fill(ridge(hz+h*.01,h*.2,7.2,23,1.3,3),'7','5');
 for(let y=hz-Math.round(h*.05);y<hz+2;y++)for(let x=0;x<w;x++)if(!((x+y*2)&3)&&thash(x>>2,y)<.7)dot(x,y,'4');          // mist in the valley
 fill(ridge(hz+h*.03,h*.13,5.1,17,2.7,2),'3','4');
 const hill=[];for(let x=0;x<w;x++){const u=x/w;hill.push(Math.round(hz+h*.075-h*.05*Math.sin(u*3.3+.4)-h*.035*Math.exp(-Math.pow((u-.66)/.2,2))+(u<.3?(.3-u)*h*.1:0)))}
 fill(hill,'2','3');
 const mx=Math.round(w*.57);for(let i=0;i<7;i++){const x=mx+i*7+(thash(i,7)*2|0);pxDraw(g,'tman',TMAN,x,hill[Math.min(w-1,x+2)]-9,1)}
 {const x=mx+7*7+2;pxDraw(g,'tban',TBAN,x,hill[Math.min(w-1,x+3)]-13,1)}
 const pine=(cx,by,ph,k,k2)=>{for(let i=0;i<ph;i++){const hw=Math.round((i%5)*.7+i*.24);box(cx-hw,by-ph+i,hw*2+1,1,k);if(k2&&hw>0)dot(cx-hw,by-ph+i,k2)}box(cx,by,1,2,k)};
 for(let x=-2;x<w+4;x+=4+(thash(x,3)*5|0)){const y=Math.min(h-1,hill[clamp(x,0,w-1)]+Math.round(h*.06)+(thash(x,5)*5|0));pine(x,y,7+(thash(x,9)*6|0),'1','2')}
 const fg=[];for(let x=0;x<w;x++){const u=x/w;fg.push(Math.round(h*.9-h*.03*Math.sin(u*4.2+1)+(thash(x>>2,11)-.5)*2))}fill(fg,'1','2');
 for(let x=-4;x<w+8;x+=8+(thash(x,13)*10|0)){const u=x/w,big=u<.12||u>.9;pine(x,Math.min(h+6,fg[clamp(x,0,w-1)]+6+(thash(x,17)*6|0)),(big?30:16)+(thash(x,19)*12|0),'0',big?'1':null)}}
function drawTitleArt(){try{const host=$('titleArt');if(!host||typeof document==='undefined')return;const W=window.innerWidth,H=window.innerHeight;if(!(W>0&&H>0))return;
  const s=Math.max(2,Math.ceil(H/150)),w=Math.ceil(W/s),h=Math.ceil(H/s),k=w+'x'+h+'@'+s;let c=host._cv;if(c&&c._k===k)return;
  if(!c){c=document.createElement('canvas');if(!c||!c.getContext)return;c.className='tart';host.innerHTML='';host.appendChild(c);host._cv=c}
  c._k=k;c.width=w;c.height=h;c.style.width=w*s+'px';c.style.height=h*s+'px';const g=c.getContext('2d');if(!g||!g.fillRect)return;g.imageSmoothingEnabled=false;paintTitle(g,w,h)}catch(e){}}
function renderTitle(){drawTitleArt();
 const s=loadSave(),has=!!(s&&s.roster),fs=canFullscreen();
 $('titleBox').innerHTML=`<p class="over">A free company chronicle</p><h1>Wyrdmarch</h1><div class="rule" aria-hidden="true"><i></i></div>
<p class="lede">Lead a free company across a wild land. Take contracts, bury friends, and learn what the four gifts are worth.</p>
<div class="gifts" aria-hidden="true">${RESK.map(k=>`<span style="--gc:${RESC[k]}">${RESN[k]}</span>`).join('')}</div>
<div class="tbtns">${has?`<button class="pri big" onclick="continueGame()"><b>Continue</b><small>Day ${s.day||1} · ${s.roster.length} sword${s.roster.length===1?'':'s'} · ${s.crowns||0} crowns</small></button>`:''}
<button class="${has?'':'pri '}big" onclick="${has?'confirmNew()':'newGame()'}"><b>${has?'New company':'Raise a company'}</b><small>${has?'Abandon the old banner':'Four swords and a banner'}</small></button></div>`;
 const T=$('title');let tc=T.querySelector('.tcorner');
 if(!tc){tc=document.createElement('div');tc.className='tcorner';T.appendChild(tc);
  tc.innerHTML=(fs?'<button class="ghost fsb" onclick="toggleFullscreen()">'+pic('fullscreen',16,'full')+'<span>Fullscreen</span></button>':'')+'<button class="ghost fsb setb" onclick="settingsSheet()">'+pic('settings',16,'sun')+'<span>Settings</span></button>'}}

function boot(){loadSettings();wirePress();if(typeof initBattleHud==='function')initBattleHud();resize();mode='title';setUI();
 const lay=()=>{Layout.update();if(mode==='title')drawTitleArt()};window.addEventListener('resize',lay);window.addEventListener('orientationchange',()=>{lay();setTimeout(lay,250)});
 try{if(window.visualViewport)window.visualViewport.addEventListener('resize',lay)}catch(e){}
 ['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{lay();setTimeout(lay,250);settingsRefresh()}));
 try{window.matchMedia('(pointer:coarse)').addEventListener('change',()=>{if(!_setConfirmUser)SET.confirm=coarsePointer();lay()})}catch(e){}
 try{if(document.fonts&&document.fonts.ready)document.fonts.ready.then(lay)}catch(e){}
 setInterval(chromeTick,250);requestAnimationFrame(frame)}
boot();
