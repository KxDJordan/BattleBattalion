// The world map's top bar against the order rail on real phone landscape sizes (70-render.js hudFit, style.css #hud).
// Usage: node test/topbar.js [html]   (default: the built index.html; TBSHOTS=<dir> saves topbar_<device>.png)
// For each size, with the notch's safe-area insets where the phone has one (emulated through --sal/--sar/--sab) and with the browser's
// toolbars taking height, a company with long values (six-figure purse, day 123, a renown tier, an ambition taken, rain at night, a long
// name): every top bar item is wholly on screen, inside the safe area, left of the rail and not overlapping another; the day/time is
// shown; the purse, food, renown and ambition buttons are visible and tappable (elementFromPoint at their centre is the button).
// The same for the town screen's top strip (51-townview.js .tv-top): on screen and clear of its buttons.
const {chromium,devices}=require('playwright'),path=require('path'),fs=require('fs');
const f=path.resolve(process.argv[2]||path.join(__dirname,'..','index.html')),SHOTS=process.env.TBSHOTS||'';
const DEV=[['iphone-se',667,375,0],['iphone-13',844,390,47],['iphone-15',852,393,59],['iphone-13-safari-bars',844,340,47],['iphone-promax',926,428,47],['iphone-15promax',932,430,59],
 ['pixel-7',915,412,0],['pixel-7-chrome-bars',915,356,0],['galaxy-s20',800,360,0],['small-640',640,360,0],['playwright-iphone13-landscape',0,0,47]];
let fails=0;const fail=m=>{fails++;console.log('FAIL '+m)};
(async()=>{const b=await chromium.launch();
for(const [nm,w,h,ins] of DEV){const d=w?{viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true}:Object.assign({},devices['iPhone 13 landscape']);delete d.defaultBrowserType;
 const ctx=await b.newContext(d),p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(String(e)));
 await p.goto('file://'+f);await p.waitForTimeout(300);
 if(ins)await p.addStyleTag({content:`:root{--sal:${ins}px!important;--sar:${ins}px!important;--sab:21px!important}`});
 const R=await p.evaluate(()=>{seedRng(5);newGame(true,{});window.ambNotify=()=>false;if(typeof eventTick==='function')window.eventTick=()=>false;for(let i=0;i<8&&sheetOpen;i++)closeSheet(true);
  G.crowns=123456;G.food=9876;G.day=123;G.hour=22;G.weather={kind:'rain'};G.renown=640;G.name='The Lanternbearers of the Long Road';
  if(typeof AMBITIONS==='object'){const id=Object.keys(AMBITIONS)[0];G.amb=Object.assign(G.amb||{},{cur:id});if(Array.isArray(G.amb.cel))G.amb.cel.length=0}
  if(typeof hudCompany==='function'){try{_hudRn=''}catch(e){}hudCompany()}if(typeof refreshHUD==='function')refreshHUD();Layout.update();return 1}).catch(e=>errs.push('stage: '+e));
 await p.waitForTimeout(600);await p.evaluate(()=>{for(let i=0;i<8&&(sheetOpen||!$('sheet').classList.contains('hidden'));i++)closeSheet(true);Layout.update()});await p.waitForTimeout(250);await p.waitForTimeout(100);
 const M=await p.evaluate(()=>{const box=e=>{const r=e.getBoundingClientRect();return{l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height}};
  const sp=$('safeProbe'),cs=getComputedStyle(sp),sl=parseFloat(cs.paddingLeft)||0,rail=box($('wbar')),hud=$('hud'),items=[];
  for(const e of hud.children){if(getComputedStyle(e).display==='none'||e.hidden)continue;const q=box(e);if(!q.w)continue;items.push(Object.assign(q,{id:e.id||e.className,txt:e.textContent.trim().slice(0,40)}))}
  const tap=[];for(const id of ['hCoinB','hFoodB','hRen','hAmb']){const e=$(id);if(!e||e.hidden)continue;const q=e.getBoundingClientRect();const x=q.left+q.width/2,y=q.top+q.height/2,hit=document.elementFromPoint(x,y);tap.push({id,ok:q.width>=16&&!!hit&&(hit===e||e.contains(hit)),w:q.width,hit:hit?hit.tagName+'#'+hit.id+'.'+hit.className:''})}
  return{vw:innerWidth,vh:innerHeight,sl,rail,items,tap,cls:hud.className,day:$("hDay").textContent,sheet:sheetOpen,hit:String(document.elementFromPoint(100,20)&&document.elementFromPoint(100,20).id)}});
 const tag=`${nm} ${M.vw}x${M.vh}${ins?' inset '+ins:''}`;
 for(const q of M.items){if(q.l<M.sl-.5||q.r>M.rail.l+.5||q.t<-1.5||q.b>M.vh)fail(`${tag}: "${q.txt||q.id}" at ${q.l.toFixed(0)}..${q.r.toFixed(0)} (y ${q.t.toFixed(0)}..${q.b.toFixed(0)}) is off the bar (safe ${M.sl}, rail at ${M.rail.l.toFixed(0)}, sheet ${M.sheet})`)}
 for(let i=0;i<M.items.length;i++)for(let j=i+1;j<M.items.length;j++){const a=M.items[i],c=M.items[j];if(a.l<c.r-.5&&c.l<a.r-.5)fail(`${tag}: "${a.txt||a.id}" overlaps "${c.txt||c.id}"`)}
 if(!M.items.some(q=>/123/.test(q.txt)&&/22:00/.test(q.txt)))fail(`${tag}: the day/time is not shown (${M.day})`);
 for(const t of M.tap)if(!t.ok)fail(`${tag}: ${t.id} is not tappable (${t.hit})`);
 if(M.tap.length<4)fail(`${tag}: only ${M.tap.map(t=>t.id)} of the purse, food, renown and ambition buttons are shown`);
 if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await p.screenshot({path:path.join(SHOTS,`topbar_${nm}.png`)})}
 // the town screen
 const T=await p.evaluate(async()=>{let i=G.towns.findIndex(t=>!t.east);if(i<0)i=0;G.p.x=G.towns[i].x;G.p.y=G.towns[i].y;openTown(i);await new Promise(r=>setTimeout(r,500));
  const r=document.getElementById('tv');if(!r||!r.classList.contains('on'))return null;const box=e=>{const q=e.getBoundingClientRect();return{l:q.left,r:q.right,t:q.top,b:q.bottom,w:q.width}};
  const top=[...r.querySelectorAll('.tv-top *')].filter(e=>e.children.length===0&&e.getBoundingClientRect().width>0).map(e=>Object.assign(box(e),{txt:e.textContent.trim().slice(0,30)}));
  const btn=[...r.querySelectorAll('button')].filter(e=>!e.closest('.tv-top')&&!e.closest('.tv-places')&&e.getBoundingClientRect().width>0).map(e=>Object.assign(box(e),{txt:(e.textContent.trim()||e.getAttribute('aria-label')||'').slice(0,30)}));return{vw:innerWidth,vh:innerHeight,top,btn}});
 if(!T)fail(`${tag}: the town screen did not open`);
 else{for(const q of T.top)if(q.l<-.5||q.r>T.vw+.5||q.t<-.5)fail(`${tag} town: "${q.txt}" off screen`);
  for(const q of T.top)for(const c of T.btn)if(q.l<c.r-.5&&c.l<q.r-.5&&q.t<c.b-.5&&c.t<q.b-.5)fail(`${tag} town: "${q.txt}" under the button "${c.txt}"`);
  if(SHOTS)await p.screenshot({path:path.join(SHOTS,`town_${nm}.png`)})}
 if(errs.length)fail(`${tag}: page errors: ${errs.slice(0,3).join(' | ')}`);
 console.log(`${tag}: ${M.items.length} items, fit ${M.cls.replace(/hidden/,'').trim()||'-'}, "${M.day}"`);
 await ctx.close()}
await b.close();console.log(fails?fails+' FAILURES':'top bar: all ok');process.exit(fails?1:0)})();
