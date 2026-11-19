// Title screen and fonts test (Playwright on the built file): node test/title.js [html]
// The title (89-title.js, 90-shell.js renderTitle) and the embedded fonts (build.js, assets/fonts):
//   - the fonts are embedded: no request leaves the file (no Google Fonts), the @font-face rules are data: URLs, and Lilita One,
//     Fredoka and Alegreya Sans are loaded (document.fonts.check) once the title is up; the old pixel face is gone;
//   - at 1334x750 and 667x375 (phone landscape, 2x): the painted vista is drawn (Detail High: a full-screen canvas, not blank, the
//     figures standing right of the menu), the wordmark canvas is drawn and the h1 still reads Wyrdmarch, every button is visible,
//     inside the viewport and clear of the safe areas, nothing in the menu overflows;
//   - every button does its job: with no save, Raise a company opens the company setup, Books, The fallen, Achievements, Settings,
//     How to play and Credits open their sheets, and there is no Continue; with a save, Continue (present) goes back to the march
//     and New company is there; Settings still works (Detail Low swaps in the pixel dusk, High brings the vista back);
//   - drawing the title never touches the seeded stream (rngState) and under reduced motion no frame loop runs;
//   - names and labels in the hi-res face do not overflow: the battle HUD, the company roster and the battle's results.
'use strict';
const {chromium}=require('playwright'),path=require('path');
const FILE=path.resolve(process.argv[2]||'dist/index.html');
let failed=false;
function fail(msg){failed=true;console.error('\nFAIL: '+msg);process.exit(1)}
function ok(c,msg){if(!c)fail(msg)}
process.on('unhandledRejection',e=>fail('unhandled rejection: '+(e&&e.stack||e)));

async function page(b,W,H,dpr,opts){const ctx=await b.newContext(Object.assign({viewport:{width:W,height:H},deviceScaleFactor:dpr||1},opts||{}));const p=await ctx.newPage();const errs=[],net=[];
 p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
 p.on('request',r=>{const u=r.url();if(!/^(file|data|blob):/.test(u))net.push(u)});
 await p.goto('file://'+FILE);await p.waitForFunction(()=>typeof mode!=='undefined'&&mode==='title',null,{timeout:10000});
 await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);return{ctx,p,errs,net}}
// every visible button of the title: its box inside the viewport and the safe area, its text not clipped
const titleButtons=p=>p.evaluate(()=>[...document.querySelectorAll('#title button')].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect(),cl=[...e.querySelectorAll('b,small,span,.tcn')].filter(x=>getComputedStyle(x).overflow==='hidden'&&x.scrollWidth>x.clientWidth+1).map(x=>x.textContent);
 return{t:e.textContent.replace(/\s+/g,' ').trim(),on:e.getAttribute('onclick'),x:r.left,y:r.top,r:r.right,b:r.bottom,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5,clip:cl}}));
async function titleChecks(p,tag,W,H){
 const st=await p.evaluate(()=>{const c=document.querySelector('#titleArt canvas.thd'),L=document.querySelector('#titleBox .tlogo'),h1=document.querySelector('#titleBox h1');let lit=0,cols=new Set();
  if(c){const g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;for(let i=0;i<d.length;i+=4*997){if(d[i+3])lit++;cols.add(d[i]>>4<<8|d[i+1]>>4<<4|d[i+2]>>4)}}
  const lr=L&&L.getBoundingClientRect();
  // figures: the canvas right of the menu holds the ink of their outlines and their colours
  return{hd:document.getElementById('title').classList.contains('hd'),cv:!!c,cw:c&&c.width,ch:c&&c.height,lit,cols:cols.size,logo:!!L&&L.classList.contains('on'),lw:lr&&lr.width,lh:lr&&lr.height,
   lin:!!lr&&lr.left>=0&&lr.top>=0&&lr.right<=innerWidth+.5&&lr.bottom<=innerHeight+.5,h1:h1&&h1.textContent.trim(),figs:TT.figs?TT.figs.filter(f=>f.s).length:0,ready:!!TT.ready}});
 ok(st.hd&&st.cv,tag+': the painted vista is not up '+JSON.stringify(st));ok(st.lit>50&&st.cols>40,tag+': the vista canvas is blank '+JSON.stringify(st));
 ok(st.logo&&st.lw>150&&st.lh>50&&st.lin,tag+': the wordmark is not drawn inside the screen '+JSON.stringify(st));ok(st.h1==='Wyrdmarch','h1 reads '+st.h1);
 ok(st.figs>=3,tag+': fewer than three figures on the knoll '+JSON.stringify(st));
 const B=await titleButtons(p);ok(B.length>=7,tag+': only '+B.length+' buttons');
 for(const x of B){ok(x.inside,tag+': button outside the screen '+JSON.stringify(x));ok(!x.clip.length,tag+': clipped text in '+x.t+': '+x.clip.join(' | '))}
 const box=await p.evaluate(()=>{const r=document.getElementById('titleBox').getBoundingClientRect();return{t:r.top,b:r.bottom,l:r.left,r:r.right}});
 ok(box.t>=0&&box.b<=H+.5&&box.l>=0&&box.r<=W+.5,tag+': the menu runs off the screen '+JSON.stringify(box));
 return B}

(async()=>{const b=await chromium.launch();
 for(const [W,H,dpr] of [[1334,750,1],[667,375,2]]){const tag=W+'x'+H;console.log('\n== '+tag+' ==');
  const {ctx,p,errs,net}=await page(b,W,H,dpr);
  // fonts: embedded and loaded
  const F=await p.evaluate(async()=>{await document.fonts.load('16px "Lilita One"');await document.fonts.load('600 16px "Fredoka"');await document.fonts.load('16px "Alegreya Sans"');
   const faces=[...document.fonts].map(f=>f.family.replace(/["']/g,'')+':'+f.status);let data=0,remote=0;
   for(const s of document.styleSheets){let R=[];try{R=[...s.cssRules]}catch(e){remote++}for(const r of R)if(r instanceof CSSFontFaceRule){if(/url\(["']?data:font\/woff2;base64,/.test(r.cssText))data++;else remote++}}
   return{faces,data,remote,lil:document.fonts.check('16px "Lilita One"'),fre:document.fonts.check('600 16px "Fredoka"'),ale:document.fonts.check('16px "Alegreya Sans"'),
    jersey:/Jersey/.test(document.documentElement.outerHTML),links:[...document.querySelectorAll('link[rel=stylesheet],link[rel=preconnect]')].length,
    h1:getComputedStyle(document.querySelector('#titleBox h1 .tword')||document.body).fontFamily,ui:getComputedStyle(document.querySelector('#titleBox .tm')).fontFamily}});
  console.log(JSON.stringify(F));
  ok(F.lil&&F.fre&&F.ale,tag+': fonts not loaded '+JSON.stringify(F));ok(F.data>=5&&!F.remote&&!F.links,tag+': fonts not all embedded '+JSON.stringify(F));ok(!F.jersey,'the old pixel face is still named');
  ok(/^"?Lilita One/.test(F.h1)&&/^"?Fredoka/.test(F.ui),tag+': wrong faces on the title '+F.h1+' / '+F.ui);
  // the title, no save
  const r0=await p.evaluate(()=>rngState());
  let B=await titleChecks(p,tag+' (no save)',W,H);
  ok(!B.some(x=>/continueGame/.test(x.on)),tag+': Continue without a save');
  ok(await p.evaluate(r=>rngState()===r,r0),tag+': the title drew from the seeded stream');
  // each button opens its sheet
  const sheetOpen=()=>p.evaluate(()=>!document.getElementById('sheet').classList.contains('hidden'));
  const want={'newCompanySetup()':/Company name|Raise/,'slotsSheet()':/book/i,'hallSheet()':/fallen|Fallen|fell/i,'achSheet()':/chievement/,'settingsSheet()':/Detail/,'howSheet()':/How to play/,'creditsSheet()':/Lilita One/};
  for(const x of B){if(!x.on||/toggleFullscreen/.test(x.on))continue;const loc=p.locator(`#title button[onclick="${x.on}"]`).first();await loc.click();await p.waitForTimeout(150);
   const txt=await p.evaluate(()=>document.getElementById('sheetBody').textContent);ok(await sheetOpen(),tag+': '+x.t+' opened nothing');
   if(want[x.on])ok(want[x.on].test(txt),tag+': '+x.t+' opened the wrong sheet: '+txt.slice(0,80));
   await p.evaluate(()=>{if(typeof NCS==='object')NCS.open=false;closeSheet(true)});await p.waitForTimeout(80);ok(!(await sheetOpen()),tag+': the sheet of '+x.t+' did not close')}
  // Settings still works: Detail Low brings the pixel dusk, High the vista
  await p.evaluate(()=>setOpt('detail','low'));await p.waitForTimeout(200);
  let d=await p.evaluate(()=>({hd:document.getElementById('title').classList.contains('hd'),px:!!document.querySelector('#titleArt canvas.tart'),thd:!!document.querySelector('#titleArt canvas.thd')}));
  ok(!d.hd&&d.px&&!d.thd,tag+': Detail Low did not bring the pixel title '+JSON.stringify(d));
  await p.evaluate(()=>setOpt('detail','high'));await p.waitForTimeout(300);
  d=await p.evaluate(()=>({hd:document.getElementById('title').classList.contains('hd'),thd:!!document.querySelector('#titleArt canvas.thd')}));ok(d.hd&&d.thd,tag+': Detail High did not bring the vista back');
  // with a save: Continue present and working, New company there
  await p.evaluate(()=>{seedRng(7);newGame();closeSheet(true);save();quitToTitle()});await p.waitForTimeout(400);
  B=await titleChecks(p,tag+' (save)',W,H);
  ok(B.some(x=>/continueGame/.test(x.on))&&B.some(x=>/newCompanySetup/.test(x.on)),tag+': no Continue / New company with a save '+B.map(x=>x.t).join(', '));
  await p.locator('#title button[onclick="continueGame()"]').click();await p.waitForTimeout(300);ok(await p.evaluate(()=>mode==='world'),tag+': Continue did not go back to the march');
  ok(await p.evaluate(()=>!TT.raf),tag+': the title loop still runs on the march');
  // overflow of the hi-res face: company roster, battle HUD, results
  const over=sel=>p.evaluate(sel=>[...document.querySelectorAll(sel)].filter(e=>e.offsetParent&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent.trim()+' '+e.scrollWidth+'>'+e.clientWidth),sel);
  await p.evaluate(()=>companySheet());await p.waitForTimeout(400);
  let o=await over('#pn .co-nm,#pn .co-nm b,#pn .co-role,#pn .co-st');   // (the panel's own title is ellipsized on a phone, as it was with the pixel face)ok(!o.length,tag+': company names overflow: '+o.join('; '));
  await p.evaluate(()=>{closePanel(true);closeSheet(true)});
  await p.evaluate(()=>{seedRng(424242);startBattle({f:'bandit',mult:1,src:{type:'party',id:-1}})});
  await p.waitForFunction(()=>mode==='battle'&&B&&B.cur&&B.cur.side===0&&!B.busy,null,{timeout:30000});await p.waitForTimeout(300);
  o=await over('.uname b,.uname,.ustats,#bTop .pxn,#bTop b');ok(!o.length,tag+': battle HUD text overflows: '+o.join('; '));
  await p.evaluate(()=>{for(const u of B.units)if(u.side===1)u.alive=false;endBattle(true)});await p.waitForFunction(()=>!document.getElementById('sheet').classList.contains('hidden')&&document.querySelector('#sheetBody .aar-c'),null,{timeout:15000});
  o=await over('#sheetBody .br-nm b,#sheetBody .br-nm,#sheetBody h2,#sheetBody .aar-xpn');ok(!o.length,tag+': results text overflows: '+o.join('; '));
  ok(!errs.length,tag+': page errors:\n'+errs.join('\n'));ok(!net.length,tag+': network requests: '+net.join(', '));
  await ctx.close();console.log(tag+' ok')}
 // reduced motion: one still frame, no loop
 {const {ctx,p,errs}=await page(b,1334,750,1,{reducedMotion:'reduce'});await p.waitForTimeout(400);
  const r=await p.evaluate(()=>({raf:TT.raf,hd:document.getElementById('title').classList.contains('hd'),cv:!!TT.cv}));ok(r.hd&&r.cv&&!r.raf,'reduced motion: a frame loop runs '+JSON.stringify(r));
  ok(!errs.length,'reduced motion: page errors '+errs.join('\n'));await ctx.close();console.log('reduced motion ok')}
 await b.close();if(!failed)console.log('\ntitle: OK')})();
