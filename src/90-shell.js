/* ================= SHELL (chrome): settings, modal, toast, mode switching, transitions, title, menu ================= */
/* ---- settings ----
   SET is the player's preferences, kept under SETKEY (separate from the save, survives a new company).
     SET.speed    1 normal | .35 fast   (copied to SPEEDF, which scales every battle delay)
     SET.confirm  true: the first tap on a foe shows the forecast, the second strikes. Default: on for touch, off for mouse.
     SET.motion   'auto' (follow the device) | 'reduce'
     SET.deploy   true: the deployment screen before each battle
     SET.theme    key of THEMES (08-frames.js): UI colours and the pixel frames, applied live (applyTheme)
     SET.allyBars true: allies' HP and armor bars show on the battle board (the battle HUD toggles it with setOpt('allyBars', v))
     SET.vol / SET.music / SET.sfx  0..1 master, music and effects (ambience rides on effects) volumes; SET.mute true: silent (26-audio.js)
   reducedMotion() is true when either SET.motion==='reduce' or the device asks for it; #app carries class .rm then. */
const SETKEY='wyrdmarch_settings_v1';
const SET={speed:1,confirm:false,motion:'auto',deploy:true,theme:'verdigris',allyBars:true,detail:'high',awake:true,vol:.8,music:.6,sfx:.8,mute:false};
const setVol=v=>typeof v==='number'&&isFinite(v)?Math.round(Math.max(0,Math.min(1,v))*100)/100:null;
let _setConfirmUser=false,_rmq=null;
function coarsePointer(){try{return!!window.matchMedia('(pointer:coarse)').matches}catch(e){return false}}
function reducedMotion(){let dev=false;try{dev=!!(_rmq&&_rmq.matches===true)}catch(e){}return SET.motion==='reduce'||dev}
function applyMotion(){const rm=reducedMotion();try{const a=$('app');if(a)a.classList.toggle('rm',rm)}catch(e){}
 if(typeof reduced!=='undefined')reduced=rm;if(rm&&typeof Wipe!=='undefined')Wipe.stop();return rm}
function loadSettings(){SET.confirm=coarsePointer();
 try{const o=JSON.parse(storeGet(SETKEY)||'null');if(o&&typeof o==='object'){if(o.speed===1||o.speed===.35)SET.speed=o.speed;
   if(typeof o.confirm==='boolean'){SET.confirm=o.confirm;_setConfirmUser=true}if(o.motion==='auto'||o.motion==='reduce')SET.motion=o.motion;if(typeof o.deploy==='boolean')SET.deploy=o.deploy;
   if(typeof THEMES!=='undefined'&&THEMES[o.theme])SET.theme=o.theme;if(typeof o.allyBars==='boolean')SET.allyBars=o.allyBars;if(typeof o.awake==='boolean')SET.awake=o.awake;if(o.detail==='low'||o.detail==='high')SET.detail=o.detail;
   for(const k of ['vol','music','sfx']){const v=setVol(o[k]);if(v!=null)SET[k]=v}if(typeof o.mute==='boolean')SET.mute=o.mute}}catch(e){}
 SPEEDF=SET.speed;
 try{_rmq=window.matchMedia('(prefers-reduced-motion: reduce)');const f=()=>applyMotion();if(_rmq.addEventListener)_rmq.addEventListener('change',f);else if(_rmq.addListener)_rmq.addListener(f)}catch(e){_rmq=null}
 applyMotion();applyTheme(SET.theme)}
function saveSettings(){const o={v:1,speed:SET.speed,motion:SET.motion,deploy:SET.deploy,theme:SET.theme,allyBars:SET.allyBars,detail:SET.detail,awake:SET.awake,vol:SET.vol,music:SET.music,sfx:SET.sfx,mute:SET.mute};if(_setConfirmUser)o.confirm=SET.confirm;return storeSet(SETKEY,JSON.stringify(o))}
function setOpt(k,v){if(k==='speed'){SET.speed=v===.35?.35:1;if(SPEEDF>0)SPEEDF=SET.speed}
 else if(k==='deploy'){SET.deploy=!!v}
 else if(k==='confirm'){SET.confirm=!!v;_setConfirmUser=true;if(typeof fcClear==='function')fcClear()}
 else if(k==='motion'){SET.motion=v==='reduce'?'reduce':'auto';applyMotion()}
 else if(k==='theme'){SET.theme=typeof THEMES!=='undefined'&&THEMES[v]?v:'verdigris';applyTheme(SET.theme)}
 else if(k==='awake'){SET.awake=!!v;if(SET.awake)wakeOn();else wakeOff()}
 else if(k==='allyBars'){SET.allyBars=!!v;try{if(typeof _allyBars!=='undefined')_allyBars=SET.allyBars}catch(e){}}
 else if(k==='detail'){const v2=v==='low'?'low':'high';if(SET.detail!==v2){SET.detail=v2;if(typeof artChanged==='function')artChanged()}}
 else if(k==='mute'){SET.mute=!!v;if(!SET.mute&&typeof AUDIO!=='undefined')AUDIO.unlock();if(typeof AUDIO!=='undefined')AUDIO.apply()}
 else if(k==='vol'||k==='music'||k==='sfx'){const x=setVol(+v);if(x!=null)SET[k]=x;if(typeof AUDIO!=='undefined')AUDIO.apply()}
 saveSettings();settingsRefresh();if(mode==='battle'&&B)updateBUI()}
/* ---- themes: CSS colours rewritten through themeHex (08-frames.js), frames rebuilt, the title and town redrawn ----
   The build's stylesheet text is kept once; each theme is a fresh copy of it with every colour mapped (alpha suffixes kept). */
const THM={base:null,el:null,cur:'verdigris',memo:{}};
function applyTheme(t){if(typeof THEMES==='undefined')return false;t=THEMES[t]?t:'verdigris';
 try{if(typeof applyFrames==='function')applyFrames(t)}catch(e){}
 try{if(typeof document==='undefined'||!document.querySelector)return false;if(!THM.el){THM.el=document.querySelector('head style');if(THM.el)THM.base=THM.el.textContent}
  if(!THM.el||typeof THM.base!=='string')return false;if(t===THM.cur&&THM.done)return true;
  const memo=THM.memo[t]||(THM.memo[t]={});
  THM.el.textContent=t==='verdigris'?THM.base:THM.base.replace(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g,(m0,h)=>{const k=h.toLowerCase();if(memo[k])return memo[k];
   const al=h.length===8?k.slice(6):h.length===4?k[3]+k[3]:'',out=themeHex('#'+(h.length>=6?k.slice(0,6):k.slice(0,3)),t)+al;return memo[k]=out});
  THM.cur=t;THM.done=true;const a=$('app');if(a&&a.dataset)a.dataset.theme=t}catch(e){return false}
 try{if(mode==='title')drawTitleArt(true)}catch(e){}
 return true}
function themeSwatch(t){const T=THEMES[t],c=k=>themeHex(PAL[k],t);return`<span class="thsw" aria-hidden="true"><i style="background:${c('2')}"></i><i style="background:${c('5')}"></i><i style="background:${c('c')}"></i></span>`}
function settingsHTML(){const fs=canFullscreen(),full=isFullscreen();
 const seg=(k,opts,cur)=>'<div class="seg" role="radiogroup">'+opts.map(o=>'<button class="pxb sm'+(o[0]===cur?' on':'')+'" role="radio" aria-checked="'+(o[0]===cur)+'" onclick="'+(k==='full'?'settingsFull()':'setOpt(\''+k+'\','+JSON.stringify(o[0]).replace(/"/g,"'")+')')+'">'+o[1]+'</button>').join('')+'</div>';
 const row=(icon,svg,t,d,ctl,cls)=>'<div class="setr'+(cls?' '+cls:'')+'"><span class="seti">'+pic(icon,32,svg)+'</span><div class="sett"><b>'+t+'</b><small>'+d+'</small></div>'+ctl+'</div>';
 const themes=typeof THEMES==='undefined'?'':'<div class="thg" role="radiogroup" aria-label="Colour theme">'+Object.keys(THEMES).map(t=>'<button class="pxb sm thb'+(t===SET.theme?' on':'')+'" role="radio" aria-checked="'+(t===SET.theme)+'" onclick="setOpt(\'theme\',\''+t+'\')">'+themeSwatch(t)+'<span>'+THEMES[t].n+'</span></button>').join('')+'</div>';
 const vol=(k,t,d)=>'<div class="setr setv'+(SET.mute?' off':'')+'"><span class="seti">'+pic(k==='music'?'ab-chant':k==='sfx'?'ab-slash':'ab-warcry',32,'play')+'</span><div class="sett"><b>'+t+'</b><small>'+d+'</small></div>'
  +'<label class="vol"><input type="range" min="0" max="100" step="5" value="'+Math.round((SET[k]==null?.8:SET[k])*100)+'" aria-label="'+t+'" oninput="setVolume(\''+k+'\',this.value)" onchange="setVolume(\''+k+'\',this.value,1)"'+(SET.mute?' disabled':'')+'><output id="vo-'+k+'">'+Math.round((SET[k]==null?.8:SET[k])*100)+'</output></label></div>';
 const snd=row('ab-chant','play','Sound','Music and sounds made by the game itself'+(typeof AUDIO!=='undefined'&&AUDIO.ok===false&&_auNoCtx()?' (this browser has no sound)':''),seg('mute',[[false,'On'],[true,'Off']],SET.mute===true))
  +vol('vol','Volume','Everything together')+vol('music','Music','The tunes of road, town and battle')+vol('sfx','Effects','Blows, spells, footsteps, the wind and the town');
 return'<div class="row sp seth"><h2>Settings</h2><button class="pri" onclick="closeSheet()">Done</button></div><div class="setl">'
 +snd
 +row('fast','fast','Battle speed','How quickly foes and comrades act',seg('speed',[[1,'Normal'],[.35,'Fast']],SET.speed===.35?.35:1))
 +row('swords','sword','Confirm attacks','First tap shows the forecast, second tap strikes',seg('confirm',[[true,'On'],[false,'Off']],!!SET.confirm))
 +row('company','company','Deployment','Place your swords before each battle',seg('deploy',[[true,'On'],[false,'Off']],SET.deploy!==false))
 +row('sun','sun','Keep screen awake','Stop the phone from dimming and locking while the game is open',seg('awake',[[true,'On'],[false,'Off']],SET.awake!==false))
 +row('hp','heart','Ally bars','Health and armor bars over your own swords in battle',seg('allyBars',[[true,'Show'],[false,'Hide']],SET.allyBars!==false))
 +row('gem','gem','Detail','High-resolution art for battle tiles, figures, gear, icons and portraits; Low draws the original pixel art (lighter on older phones)',seg('detail',[['high','High'],['low','Low']],SET.detail==='low'?'low':'high'))
 +(themes?row('banner','banner','Colours',(THEMES[SET.theme]||THEMES.verdigris).d,themes,'wide'):'')
 +row('info','sun','Motion','Auto follows this device'+(reducedMotion()&&SET.motion!=='reduce'?' (it asks for less motion)':''),seg('motion',[['auto','Auto'],['reduce','Reduced']],SET.motion))
 +(fs?row('fullscreen','full','Fullscreen','Hide the browser frame',seg('full',[[true,'On'],[false,'Off']],full)):'')
 +row('ledger','ledger','Chronicles','Clear the chronicles of every ended march kept on this device ('+(typeof runsAll==='function'?runsAll().length:0)+')','<button class="ghost" onclick="runsClearAsk(\'set\')">Clear</button>')
 +'</div><p class="dim setn">Kept on this device, apart from the company\'s save.</p>'}
function settingsSheet(){sheet(settingsHTML())}
function _auNoCtx(){try{return!(window.AudioContext||window.webkitAudioContext)}catch(e){return true}}
// a volume slider: applied live while dragged (no re-render, so the drag is never broken), saved when let go; a soft tick previews effects
let _volT=0;function setVolume(k,v,done){const x=setVol(+v/100);if(x==null||!(k==='vol'||k==='music'||k==='sfx'))return;SET[k]=x;try{const o=$('vo-'+k);if(o)o.textContent=Math.round(x*100)}catch(e){}
 if(typeof AUDIO!=='undefined'){AUDIO.unlock();AUDIO.apply();if(k!=='music'&&done)AUDIO.play('confirm')}clearTimeout(_volT);_volT=setTimeout(saveSettings,done?0:400)}
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
function sheet(h,cls){const b=$('sheetBody'),s=$('sheet'),was=sheetOpen;b.className=cls||'';b.innerHTML=h;s.classList.remove('hidden');b.scrollTop=0;sheetOpen=true;if(typeof AUDIO!=='undefined')try{AUDIO.sheet(cls)}catch(e){}
 if(Wipe.job&&Wipe.job.close)Wipe.stop();
 b.classList.remove('in');s.classList.remove('swin','swap');void b.offsetWidth;b.classList.add('in');s.classList.add(was?'swap':'swin')}
function closeSheet(quiet){const s=$('sheet'),was=sheetOpen&&!s.classList.contains('hidden');let rc=null;
 if(was&&!reducedMotion()){try{rc=$('sheetBody').getBoundingClientRect()}catch(e){}}
 s.classList.add('hidden');
 if(!_closing&&typeof closePanel==='function'){_closing=true;try{closePanel(quiet)}catch(e){}_closing=false}
 if(!_closing&&typeof closeMap==='function'){_closing=true;try{closeMap(quiet)}catch(e){}_closing=false}
 sheetOpen=false;if(G)G.townOpen=false;if(!quiet)save();
 if(rc&&rc.width>0&&!(Wipe.job&&!Wipe.job.close))Wipe.play('dither',rc,130)}
let toastT=0;function toast(t){const e=$('toast');e.textContent=t;e.classList.toggle('top',(typeof panelOpen==='function'&&!!panelOpen())||(typeof TV!=='undefined'&&!!TV&&!!TV.shown));e.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove('on'),2600)}
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
let _hudCo='';
function worldChrome(){if(mode!=='world'||!G)return;const cb=$('wbContract');
 {const e=$('hCo'),k=G.name+'|'+JSON.stringify(G.banner);if(e&&k!==_hudCo&&typeof bannerHTML==='function'){_hudCo=k;e.innerHTML=bannerHTML(G.banner,24,'hbn')+`<b>${htmlEsc(companyName())}</b>`;e.title=companyName()}}
 hudCompany();
 if(cb){const c=G.contract;cb.classList.toggle('has',!!c);cb.classList.toggle('done',!!(c&&(c.done||c.type==='deliver')))}
 hudRace(cb);hudEscort();
 const zb=$('wbZoom');if(zb)zb.classList.toggle('on',G.zoom!==1&&G.zoom!=null);
 if(typeof drawMinimap!=='function'&&W&&W.img){const m=$('mini');if(!m)return;const x=m.getContext('2d'),k=m.width/WS;x.imageSmoothingEnabled=true;x.drawImage(W.img,0,0,m.width,m.height);
  x.fillStyle='#101d1c';for(const t of G.towns||[])x.fillRect(t.x*k-4,t.y*k-4,8,8);x.fillStyle='#e9e0c9';for(const t of G.towns||[])x.fillRect(t.x*k-2.5,t.y*k-2.5,5,5);
  x.fillStyle='#d1a94e';x.strokeStyle='#101d1c';x.lineWidth=2;x.beginPath();x.arc(G.p.x*k,G.p.y*k,6,0,7);x.fill();x.stroke()}}
/* ---- daily upkeep: tapping the crowns or the food on the world HUD opens a small breakdown (costPop).
   It follows newDay() in 40-world.js exactly: at midnight every sword on the roster (reserves too) draws BG[bg].wage crowns,
   then eats one ration. Unpaid (crowns would go below 0): the purse is emptied and, with more than one sword, there is a 35%
   chance one random sword deserts. Out of food: rations go to 0 and every sword loses 10 hitpoints (never below 1).
   Nothing else is charged by the day. Reads state only; no randomness. ---- */
const CP={el:null,kind:null,key:'',from:null,swallow:0};
function upkeep(){const R=G&&G.roster||[],qm=typeof followerHas==='function'&&followerHas('quarter'),fr=qm?.8:1,   // the same wage and ration rules newDay() pays
 men=R.map(m=>({m,bg:BG[m.bg]||{},wage:typeof wageOf==='function'?wageOf(m):((BG[m.bg]&&BG[m.bg].wage)|0),food:fr})),wage=men.reduce((s,x)=>s+x.wage,0),food=Math.round(men.length*fr*10)/10;
 const hrs=Math.max(0,Math.ceil(24-(G?G.hour:0)));
 return{men,wage,food,hrs,payDays:wage>0?Math.floor(G.crowns/wage):Infinity,foodDays:food>0?Math.floor(G.food/food):Infinity}}
function cpDays(n){return n===Infinity?'no end':n+' day'+(n===1?'':'s')}
function cpBody(){if(CP.kind==='renown')return rnBody();const U=upkeep(),k=CP.kind,ic=(n,s)=>pic(n,s||16),short=G.crowns<U.wage,starve=G.food<U.food;
 const warn=cpWarn(U,short,starve),tile=(kk,icon,amt,unit,days,lab,warn)=>`<div class="cp-t${k===kk?' on':''}${warn?' warn':''}">${ic(icon)}<span><b>−${amt}</b><small>${unit} a day</small></span><span class="cp-d"><b>${cpDays(days)}</b><small>${lab}</small></span></div>`;
 let rows='';const L=U.men.slice();if(k==='crowns')L.sort((a,b)=>b.wage-a.wage);
 for(const x of L)rows+=`<div class="cp-r" role="row"><span class="cp-n" role="cell"><b>${htmlEsc(x.m.name)}</b><small>${htmlEsc(x.bg.n||'')}${x.m.field?'':' · reserve'}</small></span><span class="cp-v c" role="cell">${x.wage}</span><span class="cp-v f" role="cell">${x.food}</span></div>`;
 return`<div class="cp-hd"><span class="cp-ti"><b>Daily upkeep</b><small>Paid at midnight, in ${U.hrs} hour${U.hrs===1?'':'s'} · Day ${G.day}</small></span><button type="button" class="cp-x" aria-label="Close" onclick="costPopClose(true)">${ic('close')}</button></div>
<div class="cp-main"><div class="cp-side"><div class="cp-sum">${tile('crowns','coin',U.wage,'crowns',U.payDays,'of wages in the purse',short)}${tile('food','food',U.food,U.food===1?'ration':'rations',U.foodDays,'of food in the wagons',starve)}</div>${warn}</div>
<div class="cp-tb" role="table" aria-label="Daily cost of each sword"><div class="cp-r cp-h" role="row"><span class="cp-n" role="columnheader">Sword</span><span class="cp-v c" role="columnheader">${ic('coin')}</span><span class="cp-v f" role="columnheader">${ic('food')}</span></div>
<div class="cp-rows">${rows||'<div class="cp-r"><span class="cp-n"><small>Nobody on the roster</small></span></div>'}</div>
<div class="cp-r cp-tot" role="row"><span class="cp-n" role="cell"><b>Total</b><small>${U.men.length} sword${U.men.length===1?'':'s'}</small></span><span class="cp-v c" role="cell">${U.wage}</span><span class="cp-v f" role="cell">${U.food}</span></div></div></div>`}
function cpWarn(U,short,starve){const ic=n=>pic(n,16);return`${short?`<p class="cp-w">${ic('coin')}<span>Tonight's wages are short by ${U.wage-G.crowns}. Unpaid, the purse is emptied${U.men.length>1?' and there is a 35% chance a sword deserts':''}.</span></p>`:''}
${starve?`<p class="cp-w">${ic('food')}<span>${G.food?'Only '+G.food+' of '+U.food+' rations left for tonight':'No food left'}: a starving company loses 10 hitpoints a sword each day.</span></p>`:''}
<p class="cp-note"><span class="cp-nl">Reserves draw wages and eat too. </span>Nothing else is charged by the day<span class="cp-nl">: inns, tools, the temple and the tailor cost only when used</span>.</p>`}
function costPopKey(){return G?[CP.kind,G.renown,G.amb&&G.amb.cur,(G.retinue||[]).length,G.crowns,G.food,G.day,Math.ceil(24-G.hour),G.roster.map(m=>m.id+m.name+m.bg+(m.field?1:0)).join(',')].join('|'):''}
function costPop(kind,btn){if(!G||(mode!=='world'&&kind!=='renown'))return;if(CP.el&&CP.kind===kind&&!CP.el.hidden){costPopClose(true);return}
 let e=CP.el;if(!e){e=document.createElement('div');e.id='costPop';e.className='pxf cp';e.setAttribute('role','dialog');e.setAttribute('aria-label','Daily upkeep');e.tabIndex=-1;$('app').appendChild(e);CP.el=e;
  e.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();costPopClose(true)}});
  document.addEventListener('pointerdown',ev=>{if(!CP.el||CP.el.hidden)return;const t=ev.target;if(CP.el.contains(t)||(t.closest&&t.closest('.hud-tap')))return;costPopClose(false);if(t&&t.id==='cv'){ev.stopPropagation();ev.preventDefault();CP.swallow=Date.now()}},true);
  const sw=ev=>{if(CP.swallow&&Date.now()-CP.swallow<700){ev.stopPropagation();ev.preventDefault();if(ev.type==='click')CP.swallow=0}};document.addEventListener('pointerup',sw,true);document.addEventListener('click',sw,true);
  window.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&CP.el&&!CP.el.hidden){costPopClose(true);ev.stopImmediatePropagation()}},true)}
 CP.kind=kind;CP.from=btn||null;e.hidden=false;costPopRender(true);
 document.querySelectorAll('#hud .hud-tap').forEach(b=>b.setAttribute('aria-expanded',String(b===btn)));
 try{const x=e.querySelector('.cp-x');if(x)x.focus({preventScroll:true})}catch(er){}}
function costPopRender(force){const e=CP.el;if(!e||e.hidden)return;const k=costPopKey();if(!force&&k===CP.key)return;CP.key=k;const st=e.querySelector('.cp-rows'),top=st?st.scrollTop:0;
 e.innerHTML=cpBody();const st2=e.querySelector('.cp-rows');if(st2)st2.scrollTop=top;costPopPlace()}
function costPopPlace(){const e=CP.el,b=CP.from;if(!e||e.hidden)return;const hud=$('hud'),hr=hud?hud.getBoundingClientRect():{bottom:40},vw=innerWidth,br=b&&b.getBoundingClientRect?b.getBoundingClientRect():{left:12};
 const rail=$('wbar'),rx=rail&&!rail.classList.contains('hidden')&&rail.getBoundingClientRect().width?rail.getBoundingClientRect().left:vw,w=e.offsetWidth,left=clamp(Math.round(br.left-8),6,Math.max(6,rx-w-6));e.style.left=left+'px';e.style.top=Math.round(hr.bottom+4)+'px';e.style.maxHeight=Math.max(160,innerHeight-hr.bottom-12)+'px'}
function costPopClose(refocus){const e=CP.el;if(!e||e.hidden)return;e.hidden=true;document.querySelectorAll('#hud .hud-tap').forEach(b=>b.setAttribute('aria-expanded','false'));if(refocus&&CP.from&&CP.from.focus)try{CP.from.focus({preventScroll:true})}catch(er){}CP.from=null}
function chromeTick(){if(typeof AUDIO!=='undefined')try{AUDIO.tick()}catch(e){}if(mode==='battle'&&B&&B.cur){if(B.auto&&!B.busy&&!B.over&&B.cur.side===0&&!sheetOpen)nextAuto();else updateBUI()}else if(mode==='world'){worldChrome();rivalWonCheck();runShellTick()}
 if(typeof tutTick==='function')tutTick();
 if(CP.el&&!CP.el.hidden){if(mode!=='world'||sheetOpen)costPopClose(false);else costPopRender(false)}}

/* ---- a live escort (42-caravans.js): one line under the HUD, "Escorting the caravan to X — N leagues left" (tap: the contract) ---- */
let _hudEsc='';
function hudEscort(){const c=typeof escCtr==='function'?escCtr():null;let e=$('escLine');const on=!!c&&mode==='world'&&!sheetOpen;
 if(!on){if(e&&!e.hidden){e.hidden=true;_hudEsc=''}return}
 if(!e){e=document.createElement('button');e.type='button';e.id='escLine';e.className='esc-line';e.onclick=()=>contractSheet();const app=$('app');if(!app)return;app.appendChild(e)}
 const st=typeof ctrStatus==='function'?ctrStatus(c):'',k=st+'|'+(G.moving?1:0);if(k===_hudEsc&&!e.hidden)return;_hudEsc=k;e.hidden=false;
 const i=st.lastIndexOf(', by day '),line=i>0?st.slice(0,i):st;
 e.innerHTML=`${typeof pic==='function'?pic('goal-caravan',16):''}<span>${htmlEsc(line)}</span>${G.moving?'':'<small>Halted: tap the map to march on</small>'}`}
/* ---- a rival racing the company for its contract's target (16-contracts.js ctrRace): the Contract button wears their pennant and says so ---- */
let _hudRace='';
function hudRace(cb){if(!cb)return;let R=null;if(G.contract&&typeof ctrRace==='function'){try{R=ctrRace(G.contract)}catch(e){R=null}}const k=R?R.r.id+'|'+R.text:'';if(k===_hudRace)return;_hudRace=k;
 cb.classList.toggle('race',!!R);let b=cb.querySelector('.wb-race');if(R){if(!b){b=document.createElement('span');b.className='wb-race';cb.appendChild(b)}b.innerHTML=typeof rivalMiniHTML==='function'?rivalMiniHTML(R.r,16):'';cb.title=R.text;cb.setAttribute('aria-label','Contract. '+R.text)}
 else{if(b)b.remove();cb.removeAttribute('title');cb.removeAttribute('aria-label')}}
/* ---- a race lost to a rival company (16-contracts.js ctrRivalFail sets G.ctrLast.rival): one notice with their banner, once ---- */
function rivalWonCheck(){const L=G&&G.ctrLast;if(!L||!L.rival||L.shown||sheetOpen||typeof sheet!=='function'||typeof lkRival!=='function')return;const r=lkRival(L.rival);L.shown=1;if(!r)return;
 sheet(`<div class="rv-hd">${rivalBannerHTML(r,64)}<div><div class="pn-kick">${typeof lkIc==='function'?lkIc('contract',16):''}Contract lost</div><h2>${htmlEsc(r.n)} got there first</h2><p class="rv-job">${htmlEsc(L.title||'The contract')}</p></div></div>
 <p class="pn-p">${htmlEsc(String(L.why||'A rival company reached the target first and claimed the work').replace(/\.?$/,'.'))}</p><p class="pn-p dim">No standing is lost with the employer: the company did nothing wrong. ${htmlEsc(r.short||r.n)} take the pay and the renown.</p>
 <div class="row"><button onclick="closeSheet();factionsSheet('${r.id}')">${typeof lkIc==='function'?lkIc('rival',16):''}About ${htmlEsc(r.short||r.n)}</button><button class="pri" onclick="closeSheet()">On the road again</button></div>`,'rv')}
/* ---- menu (in the field) ---- */
function mbtn(icon,label,sub,on,cls,svg){return`<button class="mi ${cls||''}" onclick="${on}">${pic(icon,32,svg)}<span><b>${label}</b><small>${sub}</small></span></button>`}
function menuSheet(){const b=G&&typeof bannerHTML==='function'?bannerHTML(G.banner,40,'mhb'):'';
 sheet(`<div class="row sp mhd">${b}<div class="mht"><h2>The ledger</h2><small>${G?htmlEsc(companyName()):''}</small></div><span class="chip pxtag">Day ${G?G.day:1}</span></div>
<p class="dim">The company's book is kept in this browser. It is written whenever you enter a town or finish a battle.</p>
<div class="menu">${mbtn('back','Back to the march','Close this menu','closeSheet()','pri','play')}
${G&&Array.isArray(G.houses)&&G.houses.length&&typeof factionsSheet==='function'?mbtn('factions','Factions','Houses, wars and your standing','closeSheet();factionsSheet()','',''):''}
${G&&G.ironman?mbtn('ironman','Ironman','The book writes itself: no saving, no reloads','toast(\'The ironman book is written as you march\')','',''):mbtn('save','Save now','Write the ledger','menuSave()','','save')}
${menuExtra()}
${mbtn('ledger','Books','Three save books, export and import','slotsSheet()','','')}
${mbtn('laurel','Chronicle','This march so far: battles, kills, the finest','runChronicle()','','')}
${mbtn('hall','Hall of the fallen','Every sword lost, from every company','hallSheet()','','')}
${mbtn('settings','Settings','Speed, colours, motion','settingsSheet()','','sun')}
${mbtn('info','How to play','Controls and the rules of the road','howSheet()','','scroll')}
${mbtn('close','Quit to title','Saves first','quitToTitle()','','door')}
${mbtn('banner','Retire the company','End this march and read its chronicle','retireConfirm()','warn','banner')}</div>`)}
/* entries the content agents' sheets hang on (typeof-guarded): the crisis (18-crises.js crisisSheet), the Eastern War (19-east.js
   eastWarSheet, once the war has come), fabled warriors (21-fabled.js openFabled) */
function menuExtra(){if(!G)return'';let h='';
 if(typeof crisisSheet==='function'&&(G.crisis||G.day>=(G.crisisDay||18)-3)){let n='The crisis';try{const C=typeof CRISES==='object'&&CRISES&&CRISES[G.crisisKind];if(C&&C.n)n=C.n}catch(e){}h+=mbtn('boss',htmlEsc(n),'The crisis sheet: what it is and how to end it','closeSheet(true);crisisSheet()','','')}
 if(typeof eastWarSheet==='function'&&(typeof eastWarOn!=='function'||eastWarOn()))h+=mbtn('flag','The Eastern War','Choose a side, or stay out and profit','closeSheet(true);eastWarSheet()','','flag');
 if(typeof openFabled==='function')h+=mbtn('star','Fabled warriors','Named fighters of legend: met and fallen','closeSheet(true);openFabled()','','gem');
 return h}
// the world shell's run duties (chromeTick): the crisis outcome and the victory summary, an ironman book written every new day
let _ironDay=0;
function runShellTick(){if(!G)return;if(typeof isekaiWatch==='function'&&isekaiWatch())return;if(typeof runTick==='function')runTick();if(G.ironman&&!sheetOpen&&G.day!==_ironDay){if(_ironDay)save();_ironDay=G.day}}
function menuSave(){save();toast('Saved');closeSheet()}
function quitToTitle(){save();closeSheet(true);mode='title';setUI()}
function confirmNew(){const st=saveStatus(),nm=st.name?htmlEsc(st.name):'This company';
 sheet(`<h2>Start over?</h2><p>${nm} and ${st.wsize&&WORLDSZ[st.wsize]?'its '+WORLDSZ[st.wsize].name.toLowerCase()+' world':'its world'} are lost for good.</p><div class="row"><button class="warn" onclick="newCompanySetup()">Start over</button><button class="pri" style="flex:1" onclick="closeSheet()">${mode==='title'?'Keep the old company':'Keep playing'}</button></div>`)}

/* ---- new company setup: name, world size, banner (field, charge, emblem) with a live flag; Begin raises it ----
   NCS holds the choices while the dialog is open. Cosmetic dice use Math.random (never the game stream). */
const NCNAMES=['The Ashen Banner','The Grey Wolves','The Brass Lanterns','The Sundered Oath','Kestrel Company','The Black Hollow','The Last Pennant','Thornmarch Swords','The Hollow Crowns',
 'The Saltmarsh Irregulars','The Iron Ravens','The Lantern Guard','The Oathless','The Ninefold Shield','The Cinder Company','The Wayward Spears','The Stag Riders','The Long Road Company'];
const NCS={name:'',wsize:'small',c1:'5',c2:'c',emblem:'swords',bn:{c1:'5',c2:'c',emblem:'swords',div:'plain',c3:'l',shape:'swallow'},origin:'free',diff:'normal',iron:false,tut:false,slot:0,open:false};
/* origins (events agent's ORIGINS): icon, name, the story, and the one rule each, picked in the setup dialog */
const NCORIC={slayer:'or-slayer',free:'or-free',deserters:'or-deserters',noble:'or-noble',academy:'or-academy',beast:'or-hunters',hunters:'or-hunters',pilgrims:'or-pilgrims'};
function ncOrigins(){const L=typeof ORIGINS==='object'&&ORIGINS?Object.keys(ORIGINS):[],i=L.indexOf('isekai'),j=L.indexOf('slayer');if(i>j&&j>=0){L.splice(i,1);L.splice(j+1,0,'isekai')}return L}   // The Isekai (open from the start) beside the other open origins
function ncOrIcon(k){const O=ORIGINS[k]||{},a=NCORIC[k];if(a&&typeof icHas==='function'&&icHas(a))return a;return O.icon||'banner'}
function ncOriginHTML(){const L=ncOrigins();if(!L.length)return'';const U=k=>typeof originUnlocked!=='function'||originUnlocked(k);if(!ORIGINS[NCS.origin]||!U(NCS.origin))NCS.origin=L.includes('free')?'free':L[0];const O=ORIGINS[NCS.origin];
 return`<div class="ncs-sec"><b>Origin</b><small>How the company began: its first swords, purse and one rule</small></div><div class="ncs-ors" role="radiogroup" aria-label="Origin">${L.map(k=>{const o=ORIGINS[k];if(!U(k)&&typeof achOrLockBtn==='function')return achOrLockBtn(k);return`<button class="ncs-or${NCS.origin===k?' on':''}" role="radio" aria-checked="${NCS.origin===k}" onclick="ncSet('origin','${k}')">${pnIcon(ncOrIcon(k),'',32)}<b>${htmlEsc(o.n)}</b></button>`}).join('')}</div>
 <div class="ncs-ord">${pnIcon(ncOrIcon(NCS.origin),'',32)}<div><b>${htmlEsc(O.n)}</b><p>${htmlEsc(O.d||'')}</p>${O.rule?`<p class="ncs-rule"><i>Rule</i>${htmlEsc(O.rule)}</p>`:''}${O.ncLine?`<p class="ncs-orf">${pnIcon('coin','',16)}${htmlEsc(O.ncLine)}</p>`:typeof O.crowns==='number'?`<p class="ncs-orf">${pnIcon('coin','',16)}${O.crowns} crowns${Array.isArray(O.roster)?` · ${O.roster.length} swords`:''}</p>`:''}</div></div>`}
function ncRand(a){return a[Math.floor(Math.random()*a.length)]}
function newCompanySetup(){let st=saveStatus();if(st.state!=='none'){const f=slotFree();if(f<0){if(st.state==='newer'||st.state==='corrupt'){saveNotice(st);return}ncFull();return}slotUse(f);st=saveStatus()}
 NCS.slot=SLOT;if(typeof ISKS==='object')ISKS.fresh=true;NCS.name=ncRand(NCNAMES);NCS.wsize='small';NCS.origin='free';NCS.diff='normal';NCS.shape='continent';NCS.biomes='temperate';NCS.iron=false;NCS.mods='random';NCS.modPick=[];NCS.tut=typeof tutWanted==='function'?tutWanted():false;const d=BANNERDEF;NCS.c1=d.c1;NCS.c2=d.c2;NCS.emblem=d.emblem;NCS.bn={c1:d.c1,c2:d.c2,emblem:d.emblem,div:'plain',c3:typeof bnC3==='function'?bnC3(d.c1,d.c2):'l',shape:'swallow'};NCS.open=true;
 ncSheet()}
// the dialog itself, with the choices NCS holds (ncReopen: back from The Isekai's hero screens, nothing reset)
function ncReopen(){NCS.open=true;ncSheet()}
function ncSheet(){sheet(`<div class="row sp seth ncs-h"><h2>Raise a company</h2><button onclick="ncCancel()">Back</button></div>
<div class="ncs"><div class="ncs-l"><div class="ncs-flag" id="ncsFlag"></div>
 <label class="ncs-nl" for="ncsName">Company name</label><div class="ncs-name"><input id="ncsName" type="text" maxlength="${NAMEMAX}" autocomplete="off" spellcheck="false" value="${htmlEsc(NCS.name)}" oninput="ncName(this.value)" onkeydown="if(event.key==='Enter'){this.blur()}"><button class="pxb sm icon" aria-label="Suggest a name" title="Suggest a name" onclick="ncDice()">${pnIcon('dice','',16)}</button></div>
 <button class="pri big ncs-go" onclick="ncBegin()"><b id="ncsGoB">Begin</b><small id="ncsGoSub"></small></button></div>
 <div class="ncs-r" id="ncsOpts"></div></div>`,'wide');ncDraw()}
function ncFull(){sheet(`<h2>Every book is full</h2><p>Three companies are already kept in this browser. Burn a book, or export one to keep it safe, to raise a new company.</p><div class="row"><button onclick="${mode==='title'?'closeSheet(true)':'menuSheet()'}">Back</button><button class="pri" style="flex:1" onclick="slotsSheet()">${pic('ledger',16)}<span>The books</span></button></div>`)}
function ncDiffHTML(){const D=DIFF[NCS.diff]||DIFF.normal;
 return`<div class="ncs-sec"><b>Difficulty</b><small>${htmlEsc(D.d)}</small></div><div class="ncs-sizes ncs-diffs" role="radiogroup" aria-label="Difficulty">${DIFFK.map(k=>`<button class="ncs-size ncs-diff d-${k}${NCS.diff===k?' on':''}" role="radio" aria-checked="${NCS.diff===k}" onclick="ncSet('diff','${k}')">${pnIcon('diff-'+k,'',16)}<b>${DIFF[k].n}</b></button>`).join('')}</div>
 <ul class="ncs-dl">${D.line.map(x=>`<li>${htmlEsc(x)}</li>`).join('')}</ul>
 <div class="ncs-tg"><button class="ncs-tog${NCS.iron?' on':''}" role="switch" aria-checked="${NCS.iron}" onclick="ncSet('iron',!NCS.iron)">${pnIcon('ironman','',32)}<span><b>Ironman</b><small>One book that writes itself. No reloads: a lost battle stays lost, and death or retirement ends the march.</small></span><i class="ncs-sw2" aria-hidden="true"></i></button>
 <button class="ncs-tog${NCS.tut?' on':''}" role="switch" aria-checked="${NCS.tut}" onclick="ncSet('tut',!NCS.tut)">${pnIcon('hint','',32)}<span><b>Tutorial contract</b><small>A first, gentle job with hints over the real screens: marching, fighting, the odds, healing and the pay.${typeof tutDone==='function'&&tutDone()?' (You have finished it before.)':''}</small></span><i class="ncs-sw2" aria-hidden="true"></i></button></div>`}
function ncCancel(){NCS.open=false;if(mode==='title')closeSheet(true);else menuSheet()}
function ncName(v){NCS.name=String(v||'').slice(0,NAMEMAX);ncFlag()}
function ncDice(){let n=NCS.name;for(let i=0;i<6&&n===NCS.name;i++)n=ncRand(NCNAMES);NCS.name=n;const e=$('ncsName');if(e)e.value=n;ncFlag()}
function ncSet(k,v){if(k==='c1'&&v===NCS.c2)NCS.c2=NCS.c1;else if(k==='c2'&&v===NCS.c1)NCS.c1=NCS.c2;NCS[k]=v;ncDraw()}
/* the banner choices (NCS.bn: its own object, as NCS.shape is the map's shape) */
function ncBn(k,v){const B=NCS.bn;if(/^c[123]$/.test(k))bnSetCol(B,k,v);else if(k==='emblem'&&EMBLEMS[v]||k==='div'&&BNDIV[v]||k==='shape'&&BNSHAPE[v])B[k]=v;NCS.c1=B.c1;NCS.c2=B.c2;NCS.emblem=B.emblem;ncDraw()}
function ncShuffle(){const B=NCS.bn;bnRoll(B);NCS.c1=B.c1;NCS.c2=B.c2;NCS.emblem=B.emblem;ncDraw()}
function ncFlag(){const f=$('ncsFlag');if(!f)return;const b=Object.assign({},NCS.bn,{name:NCS.name});
 f.innerHTML=`${bannerHTML(b,128,'ncs-big')}<div class="ncs-cap"><b>${htmlEsc(cleanName(NCS.name))}</b><small>${htmlEsc(bnBlazon(b))}</small></div>`;
 {const b=$('ncsGoB');if(b)b.textContent=NCS.origin==='isekai'?'Make your hero':'Begin'}const g=$('ncsGoSub');if(g)g.textContent=`${typeof ORIGINS==='object'&&ORIGINS&&ORIGINS[NCS.origin]&&NCS.origin!=='free'?ORIGINS[NCS.origin].n+', ':''}${WORLDSZ[NCS.wsize].name}${NCS.shape&&NCS.shape!=='continent'&&typeof MAPSHAPES==='object'&&MAPSHAPES[NCS.shape]?' '+MAPSHAPES[NCS.shape].n.toLowerCase():NCS.shape==='random'?' random':''} world${NCS.biomes&&NCS.biomes!=='temperate'&&typeof MAPBIOMES==='object'&&MAPBIOMES[NCS.biomes]?', '+MAPBIOMES[NCS.biomes].n.toLowerCase():''} · ${DIFF[NCS.diff].n}${NCS.mods==='none'?' · no twists':NCS.mods==='pick'&&NCS.modPick&&NCS.modPick.length?' · '+NCS.modPick.length+' twist'+(NCS.modPick.length>1?'s':''):''}${NCS.iron?' · Ironman':''} · book ${NCS.slot+1}`}
function ncDraw(){const o=$('ncsOpts');if(!o)return;const st=o.scrollTop;
 o.innerHTML=ncOriginHTML()+ncDiffHTML()+(typeof ncShapeHTML==='function'?ncShapeHTML():'')+(typeof ncModsHTML==='function'?ncModsHTML():'')+`<div class="ncs-sec"><b>Land</b><small>${WORLDSZ[NCS.wsize].note}</small></div><div class="ncs-sizes" role="radiogroup" aria-label="World size">${Object.keys(WORLDSZ).map(k=>{const z=WORLDSZ[k];return`<button class="ncs-size${NCS.wsize===k?' on':''}" role="radio" aria-checked="${NCS.wsize===k}" onclick="ncSet('wsize','${k}')"><b>${z.name}</b><small>${z.n}×${z.n} · ${z.towns} towns</small></button>`}).join('')}</div>
 ${bnPickHTML(NCS.bn,'ncBn','ncShuffle')}`;
 o.scrollTop=st;ncFlag()}
// Begin: The Isekai first makes its hero (iskOpen, 28i-isekai.js: its own Begin raises the company with ncOpts() and the hero)
function ncOpts(){return{name:cleanName(NCS.name),wsize:NCS.wsize,banner:Object.assign({},NCS.bn),origin:NCS.origin,diff:NCS.diff,shape:NCS.shape,biomes:NCS.biomes,ironman:NCS.iron,tutorial:NCS.tut,slot:NCS.slot,mods:typeof ncModsOpt==='function'?ncModsOpt():undefined}}
function ncBegin(){if(NCS.origin==='isekai'&&typeof iskOpen==='function'){iskOpen();return}NCS.open=false;newGame(false,ncOpts())}

/* ---- how to play, credits ---- */
function howSheet(){const r=(ic,svg,t,d)=>`<div class="how-r">${ic==='map'?'<i class="pxi pxi-map s32" aria-hidden="true"></i>':pic(ic,32,svg)}<div><b>${t}</b><p>${d}</p></div></div>`;
 sheet(`<div class="row sp seth"><h2>How to play</h2><button class="pri" onclick="${mode==='title'?'closeSheet(true)':'menuSheet()'}">Done</button></div><div class="how">
 <h3>On the march</h3>${r('map','flag','March','Tap the land to march there; time passes only while you move. Roads are quick, rivers slow except at a bridge. <kbd>M</kbd> opens the map to plan a route of several stops.')}
 ${r('contract','scroll','Towns and contracts','Tap a town to enter. Take a contract from the notice board, hire at the tavern, buy at the market, dye your colours at the tailor, rest at the inn, heal at the temple.')}
 ${r('camp','camp','Wages and food','Every sword eats a ration and draws a wage each day. Camp to rest; tools mend armor at camp and at inns.')}
 <h3>In battle</h3>${r('swords','sword','Move, then strike','Tap a lit tile once to plan the move (path, AP left, what you could still do), tap it again to go. Tap a foe to see the odds, again to attack, or pick an ability first.')}
 ${r('endturn','play','Turns','Each sword has action points (AP) and fatigue. End the turn when done. High ground helps you hit; shields and cover help you live.')}
 ${r('info','sun','Keys','<kbd>Space</kbd> end turn · <kbd>1</kbd>–<kbd>9</kbd> abilities · <kbd>Esc</kbd> cancel · <kbd>B</kbd> ally bars · drag to pan the field.')}
 <h3>The four gifts</h3>${r('mana','gem','Mana, Aura, Qi, Chi','Some swords carry a gift. Spend a perk in its tree to awaken it: spells, blessings, inner strength or the land\'s own power.')}</div>`)}
function creditsSheet(){sheet(`<div class="row sp seth"><h2>Credits</h2><button class="pri" onclick="closeSheet(true)">Done</button></div>
 <div class="cred">${typeof bannerHTML==='function'?bannerHTML({c1:'5',c2:'c',emblem:'tower'},64):''}<div><p><b>Wyrdmarch</b> is a free company chronicle: tactics, travel and the four gifts.</p>
 <p>Every picture in the game, from the towns to the smallest icon, is pixel art painted in code from one fixed palette. No images are fetched.</p>
 <p class="dim">Type: Jersey 15 and Alegreya Sans (SIL Open Font License). Made with care for small screens and steady hands.</p></div></div>`)}
/* ---- title: a pixel dusk drawn at low resolution in PAL colours and shown at an integer scale ---- */
function thash(x,y){let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296}   // visual only, never the game stream
const TMAN=['....p','....j','.00.j','.00.j','0000j','0000j','.00.j','.0.0.','.0.0.'],
 TBAN=['c........','jgggggg..','jghgggg..','jggggg...','jgggggg..','j........','j.00.....','j.00.....','j0000....','j0000....','j.00.....','..0.0....','..0.0....'];
function paintTitle(g,w,h){const th=typeof themePalKey==='function'?SET.theme:'verdigris',C=k=>PAL[th==='verdigris'?k:themePalKey(k,th)],dot=(x,y,k)=>{g.fillStyle=C(k);g.fillRect(x,y,1,1)},box=(x,y,a,b,k)=>{g.fillStyle=C(k);g.fillRect(x,y,a,b)};
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
 {const x=mx+7*7+2,b=_titleBn&&typeof BANNERC!=='undefined'?_titleBn.b:null,R=b&&BANNERC[b.c1]?BANNERC[b.c1].r:null,mp=R?{g:R[1],h:R[2]}:null;pxDraw(g,'tban'+(R?R.join(''):''),TBAN,x,hill[Math.min(w-1,x+3)]-13,1,mp)}
 const pine=(cx,by,ph,k,k2)=>{for(let i=0;i<ph;i++){const hw=Math.round((i%5)*.7+i*.24);box(cx-hw,by-ph+i,hw*2+1,1,k);if(k2&&hw>0)dot(cx-hw,by-ph+i,k2)}box(cx,by,1,2,k)};
 for(let x=-2;x<w+4;x+=4+(thash(x,3)*5|0)){const y=Math.min(h-1,hill[clamp(x,0,w-1)]+Math.round(h*.06)+(thash(x,5)*5|0));pine(x,y,7+(thash(x,9)*6|0),'1','2')}
 const fg=[];for(let x=0;x<w;x++){const u=x/w;fg.push(Math.round(h*.9-h*.03*Math.sin(u*4.2+1)+(thash(x>>2,11)-.5)*2))}fill(fg,'1','2');
 for(let x=-4;x<w+8;x+=8+(thash(x,13)*10|0)){const u=x/w,big=u<.12||u>.9;pine(x,Math.min(h+6,fg[clamp(x,0,w-1)]+6+(thash(x,17)*6|0)),(big?30:16)+(thash(x,19)*12|0),'0',big?'1':null)}}
function drawTitleArt(force){try{const host=$('titleArt');if(!host||typeof document==='undefined')return;const W=window.innerWidth,H=window.innerHeight;if(!(W>0&&H>0))return;
  const s=Math.max(2,Math.ceil(H/150)),w=Math.ceil(W/s),h=Math.ceil(H/s),k=w+'x'+h+'@'+s;let c=host._cv;if(c&&c._k===k&&!force)return;
  if(!c){c=document.createElement('canvas');if(!c||!c.getContext)return;c.className='tart';host.innerHTML='';host.appendChild(c);host._cv=c}
  c._k=k;c.width=w;c.height=h;c.style.width=w*s+'px';c.style.height=h*s+'px';const g=c.getContext('2d');if(!g||!g.fillRect)return;g.imageSmoothingEnabled=false;paintTitle(g,w,h)}catch(e){}}
/* ---- the main menu: the title block on the left with the save card and the menu under it, the pixel dusk behind ---- */
function titleIcon(){if(typeof gameIconCanvas!=='function')return'';try{const c=gameIconCanvas(48);if(c&&c.toDataURL){const u=c.toDataURL();if(u&&u.slice(0,5)==='data:')return`<img class="ticon" src="${u}" width="48" height="48" alt="">`}}catch(e){}return''}
let _titleBn=null;
function renderTitle(){
 const st=saveStatus(),s=st.state==='ok'?st:null,bk=s&&s.banner?s.banner.c1+s.banner.c2:'';if(bk!==(_titleBn&&_titleBn.k)){_titleBn=s&&s.banner?{k:bk,b:s.banner}:null;drawTitleArt(true)}else drawTitleArt();
 const has=!!s,fs=canFullscreen(),icon=titleIcon();
 const tb=(on,ic,label,cls)=>`<button class="tm ${cls||''}" onclick="${on}">${ic}<span>${label}</span></button>`;
 const card=has?`<button class="pri big tcont" onclick="continueGame()">${typeof bannerHTML==='function'?bannerHTML(s.banner,44,'tbn'):''}<span class="tcm"><b>Continue</b><span class="tcn">${htmlEsc(s.name||BANNERDEF.name)}</span><small>Day ${s.day||1} · ${s.swords} sword${s.swords===1?'':'s'} · ${s.crowns||0} crowns · ${DIFF[s.diff]?DIFF[s.diff].n:'Normal'}${s.ironman?' · Ironman':''} · book ${SLOT+1}</small></span></button>`
  :st.state==='newer'||st.state==='corrupt'?`<button class="big tcont warn" onclick="saveNotice(saveStatus())"><span class="tcm"><b>${st.state==='newer'?'A newer save':'A damaged save'}</b><small>It cannot be opened here. Tap for more</small></span></button>`:'';
 $('titleBox').innerHTML=`<p class="over">${icon}A free company chronicle</p><h1>Wyrdmarch</h1><div class="rule" aria-hidden="true"><i></i></div>
<p class="lede">Lead a free company across a wild land. Take contracts, bury friends, and learn what the four gifts are worth.</p>
<div class="gifts" aria-hidden="true">${RESK.map(k=>`<span style="--gc:${RESC[k]}">${RESN[k]}</span>`).join('')}</div>
<nav class="tmenu" aria-label="Main menu">${card}${has?'':`<button class="pri big tcont" onclick="newCompanySetup()"><span class="tcm"><b>Raise a company</b><small>Name it, choose the land and the banner</small></span></button>`}
<div class="tgrid${has||typeof achSheet==='function'?' six':''}">${has?tb('newCompanySetup()',pic('banner',16,'banner'),'New company'):''}${tb('slotsSheet()',pic('ledger',16),'Books')}${tb('hallSheet()',pic('hall',16),'The fallen')}${typeof achSheet==='function'?tb('achSheet()',pic('ach',16),'Achievements'):''}${tb('settingsSheet()',pic('settings',16,'sun'),'Settings')}${tb('howSheet()',pic('info',16,'scroll'),'How to play')}${has?'':tb('creditsSheet()',pic('star',16,'gem'),'Credits')}</div></nav>`;
 const T=$('title');let tc=T.querySelector('.tcorner');
 if(!tc){tc=document.createElement('div');tc.className='tcorner';T.appendChild(tc)}
 tc.innerHTML=fs?'<button class="ghost fsb" onclick="toggleFullscreen()">'+pic('fullscreen',16,'full')+'<span>Fullscreen</span></button>':''}

function boot(){loadSettings();slotLoad();wirePress();if(typeof initBattleHud==='function')initBattleHud();resize();mode='title';setUI();
 const lay=()=>{Layout.update();if(mode==='title')drawTitleArt()};window.addEventListener('resize',lay);window.addEventListener('orientationchange',()=>{lay();setTimeout(lay,250)});
 try{if(window.visualViewport)window.visualViewport.addEventListener('resize',lay)}catch(e){}
 ['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{lay();setTimeout(lay,250);settingsRefresh()}));
 try{window.matchMedia('(pointer:coarse)').addEventListener('change',()=>{if(!_setConfirmUser)SET.confirm=coarsePointer();lay()})}catch(e){}
 try{if(document.fonts){if(document.fonts.ready)document.fonts.ready.then(lay);if(document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',()=>lay())}}catch(e){}   // the web fonts load after the script (they no longer hold up the first frame): lay out again when they arrive
 setInterval(chromeTick,250);requestAnimationFrame(frame)}
boot();

/* ---- keep the screen awake while playing (Screen Wake Lock API). Browsers grant it only after a tap and drop it when
   the page is hidden, so it is re-requested on every tap while not held and whenever the game becomes visible again.
   Where the API is missing or refused (older iOS, some embedded frames) this does nothing. ---- */
const WAKE={s:null,busy:false};
async function wakeOn(){if(typeof navigator==='undefined'||!navigator.wakeLock||(typeof SET!=='undefined'&&SET.awake===false)||document.hidden||WAKE.s||WAKE.busy)return;
 WAKE.busy=true;try{const s=await navigator.wakeLock.request('screen');WAKE.s=s;s.addEventListener('release',()=>{if(WAKE.s===s)WAKE.s=null})}catch(e){}finally{WAKE.busy=false}}
function wakeOff(){const s=WAKE.s;WAKE.s=null;try{if(s)s.release()}catch(e){}}
if(typeof document!=='undefined'){
 document.addEventListener('pointerdown',()=>{if(!WAKE.s)wakeOn()},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)wakeOn()});
}

/* ---- renown and ambition on the world HUD: a compact tier badge (tap: tiers and what the next one opens) and the active
   ambition as a small progress chip (tap: the ambitions panel). Both from 14-company.js; hidden when it is missing. ---- */
let _hudRn='';
function hudCompany(){const rb=$('hRen'),ab=$('hAmb');if(!rb||!ab||!G)return;if(typeof renownInfo!=='function'){rb.hidden=true;ab.hidden=true;return}
 const R=renownInfo();let am=null;try{am=typeof coAmbNow==='function'?coAmbNow():null}catch(e){}const k=R.tier+'|'+R.renown+'|'+(am?am.id+am.p+'/'+am.goal:'-');if(k===_hudRn)return;_hudRn=k;
 rb.hidden=false;rb.className='stat hud-tap rn t'+R.tier;rb.title=R.n+': '+R.renown+' renown'+(R.next!=null?', '+(R.next-R.renown)+' to '+R.nextN:'');rb.setAttribute('aria-label','Renown '+R.n+', '+R.renown);
 rb.innerHTML=pic('rt-'+R.tier,16)+`<span class="rn-n">${htmlEsc(R.n)}</span><span class="rn-bar" aria-hidden="true"><i style="width:${Math.round(100*R.progress)}%"></i></span>`;
 ab.hidden=false;ab.classList.toggle('none',!am);ab.title=am?am.A.n+': '+am.p+' / '+am.goal:'Choose an ambition';ab.setAttribute('aria-label',am?'Ambition '+am.A.n+', '+am.p+' of '+am.goal:'Choose an ambition');
 ab.innerHTML=pic(am&&am.A.icon&&typeof icHas==='function'&&icHas(am.A.icon)?am.A.icon:'ambition',16)+(am?`<span class="am-n">${htmlEsc(am.A.n)}</span><span class="am-p">${am.p}/${am.goal}</span>`:'<span class="am-n">Ambition</span>')}
function renownPop(btn){costPop('renown',btn)}
function rnBody(){if(typeof renownInfo!=='function')return'';const R=renownInfo(),ic=(n,s)=>pic(n,s||16),nx=R.tier<RENOWN.length?R.tier+1:0,U=nx&&typeof renownUnlocks==='function'?renownUnlocks(nx):[],D=R.def||{};
 let am=null;try{am=typeof coAmbNow==='function'?coAmbNow():null}catch(e){}const sl=typeof followerSlots==='function'?followerSlots():1,rn=(G.retinue||[]).length;
 return`<div class="cp-hd"><span class="rn-big">${ic('rt-'+R.tier,32)}</span><span class="cp-ti"><b>${htmlEsc(R.n)}</b><small>${R.renown} renown · tier ${R.tier} of ${RENOWN.length}</small></span><button type="button" class="cp-x" aria-label="Close" onclick="costPopClose(true)">${ic('close')}</button></div>
<div class="rn-pop"><p class="rn-d">${htmlEsc(D.d||'')}</p>
<div class="rn-prog"><span class="rn-bar big"><i style="width:${Math.round(100*R.progress)}%"></i></span><small>${R.next!=null?`${R.next-R.renown} more renown to <b>${htmlEsc(R.nextN)}</b>`:'The highest tier there is'}</small></div>
${U.length?`<div class="rn-sec">${ic('rt-'+nx)}<b>${htmlEsc(RENOWN[nx-1].n)} opens</b></div><ul class="rn-ul">${U.map(x=>`<li>${htmlEsc(x)}</li>`).join('')}</ul>`:''}
<div class="rn-now"><span>Now: contracts up to ${D.diff} skulls · pay x${D.pay} · ${sl} follower slot${sl===1?'':'s'}</span></div>
<div class="rn-act"><button type="button" class="sm" onclick="costPopClose();openAmbitions()">${ic('ambition')}<span>${am?htmlEsc(am.A.n)+' '+am.p+'/'+am.goal:'Ambitions'}</span></button><button type="button" class="sm" onclick="costPopClose();companySheet();coTabGo('retinue')">${ic('retinue')}<span>Retinue ${rn}/${sl}</span></button></div></div>`}
