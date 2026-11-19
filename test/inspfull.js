// Inspect full-text test (Playwright on the built file): node test/inspfull.js [html]
// The battle details card (82-inspect.js) keeps its compact, clamped rows, and every row can be read whole:
//   - a unit with long statuses, a buff, injuries, arms, perks and abilities: the card opens (right-click with the mouse, a long press
//     with a finger), rows the card cuts short carry .ins-more, and only those (their text really overflows);
//   - touching the card pins it (close button), a tap on a status, an ability chip, a perk, an injury and a foe's mastery opens
//     #insfull with the game's own rule text (STATUS[k].d, abDesc(), the perk's d, the injury's numbers and words, FOEMAST perks),
//     unclipped and inside the viewport;
//   - a tap outside closes the full text first (and does nothing else), Escape likewise, then the card; the right column scrolls when
//     it is taller than the screen and its last row can be reached; a pinned card follows the battle (hitpoints) and closes when
//     its unit falls; a long press on the unit chip lists its tooltips without opening the card; the forecast window too;
//   - opening and closing never moves the board, and a closed card takes no touches;
// at 1334x750 (mouse) and 667x375 (touch, phone landscape).
'use strict';
const {chromium}=require('playwright'),path=require('path');
const FILE=path.resolve(process.argv[2]||'dist/index.html');
let failed=false;
function fail(msg){failed=true;console.error('\nFAIL: '+msg);process.exit(1)}
function ok(c,msg){if(!c)fail(msg)}
process.on('unhandledRejection',e=>fail('unhandled rejection: '+(e&&e.stack||e)));
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();

async function battle(b,W,H,touch){
 const ctx=await b.newContext({viewport:{width:W,height:H},hasTouch:true,isMobile:false,deviceScaleFactor:1});const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
 await p.goto('file://'+FILE);await p.waitForTimeout(300);
 await p.evaluate(()=>{seedRng(424242);newGame();closeSheet();startBattle({f:'bandit',mult:1,src:{type:'party',id:-1}})});
 await p.waitForFunction(()=>mode==='battle'&&B&&B.cur&&B.cur.side===0&&!B.busy,null,{timeout:20000});
 const S=await p.evaluate(()=>{const u=B.cur,m=u.m;
  const ids=Object.keys(PERKIX).filter(id=>{const r=PERKIX[id];return r&&r.tree&&r.perk&&r.tree.kind!=='hunter'&&!r.perk.ab&&(r.perk.d||'').length>90&&m.trees.some(k=>MAST[k]===r.tree)}).sort().slice(0,4);
  m.perks=ids;
  u.st=Object.assign(u.st||{},{burn:2,bleed:3,webbed:1,riposte:2,tired:10});   // tired: the fatigue penalty's status (its number is the size, −10 at full exhaustion)
  u.buffs=(u.buffs||[]).concat([{dmg:.2,dr:.25,ms:5,md:5,dur:3}]);m.inj=[{id:'fracturedskull',days:5},{id:'missingeye',days:-1}];
  if(!(u.abs||[]).some(id=>AB[id]&&id!=='swap'))u.abs=(u.abs||[]).concat(['shieldwall']);
  updateBUI();return{name:u.name,perks:ids,foe:B.units.filter(x=>x.side===1&&x.alive&&Array.isArray(x.fpk)&&x.fpk.length).map(x=>x.name)[0]||null}});
 ok(S.perks.length>=2,'no long perks to test with: '+S.perks);
 // the camera glides to the acting unit at the start: let it settle before aiming at units on the screen
 let cam='';for(let i=0;i<40;i++){await p.waitForTimeout(150);const c=await p.evaluate(()=>JSON.stringify([B.cam.x,B.cam.y,B.cam.z]));if(c===cam)break;cam=c}
 return{ctx,p,errs,S}}
// a point on the screen over the unit (and over the canvas, not a HUD window)
async function unitPoint(p,sel){return p.evaluate(sel=>{const u=sel==='cur'?B.cur:B.units.find(x=>x.name===sel);const cv=document.getElementById('cv');
 for(let y=40;y<innerHeight-40;y+=5)for(let x=40;x<innerWidth-40;x+=5){const q=boardXY(x,y);if(unitAtBoard(q.x,q.y)===u&&document.elementFromPoint(x,y)===cv)return{x,y}}return null},sel)}
async function longPress(p,x,y,ms){const c=await p.context().newCDPSession(p);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 await p.waitForTimeout(ms||650);await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach()}
async function tap(p,x,y){const c=await p.context().newCDPSession(p);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();await p.waitForTimeout(120)}
async function press(p,touch,loc){const bb=await loc.boundingBox();ok(bb,'nothing to press');const x=bb.x+Math.min(bb.width/2,40),y=bb.y+Math.min(bb.height/2,9);
 if(touch)await tap(p,x,y);else{await p.mouse.click(x,y);await p.waitForTimeout(120)}}
const cardState=p=>p.evaluate(()=>{const e=document.getElementById('inspect'),f=document.getElementById('insfull');return{on:!!e&&e.classList.contains('on'),pin:!!e&&e.classList.contains('pin'),live:!!e&&e.classList.contains('live'),full:!!f&&f.classList.contains('on')}});
// the open full card: its text, and whether all of it is visible (inside the viewport, nothing clipped)
const fullState=p=>p.evaluate(()=>{const f=document.getElementById('insfull'),r=f.getBoundingClientRect();
 return{text:f.textContent,name:(f.querySelector('.if-t b')||{}).textContent||'',d:(f.querySelector('.if-d')||{}).textContent||'',inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5,
  unclipped:f.scrollHeight<=f.clientHeight+1,w:r.width,h:r.height}});

async function run(b,W,H,touch,shot){const tag=W+'x'+H+(touch?' touch':' mouse');console.log('\n== '+tag+' ==');
 const {ctx,p,errs,S}=await battle(b,W,H,touch);
 const board0=await p.evaluate(()=>JSON.stringify(document.getElementById('cv').getBoundingClientRect())+JSON.stringify(B.cam&&{x:Math.round(B.cam.x),y:Math.round(B.cam.y),z:B.cam.z}));
 const pt=await unitPoint(p,'cur');ok(pt,tag+': the acting unit is not on screen');
 // open the card
 if(touch)await longPress(p,pt.x,pt.y);else{await p.mouse.click(pt.x,pt.y,{button:'right'});await p.waitForTimeout(150)}
 let st=await cardState(p);ok(st.on&&st.live,tag+': the card did not open live '+JSON.stringify(st)+' '+JSON.stringify(pt)+' '+await p.evaluate(()=>document.querySelector('#inspect .ins-n').textContent+' cur '+B.cur.name));
 // clamped rows: .ins-more exactly where the text overflows, and the perks among them
 const cl=await p.evaluate(()=>{const R=[...document.querySelectorAll('#inspect .ins-ab')],bad=[];let more=0,perk=0;
  for(const r of R){const s=r.querySelector(':scope>div>span');if(!s)continue;const h=s.clientHeight;let over=s.scrollWidth>s.clientWidth+1;if(!over){s.style.webkitLineClamp='none';s.style.display='block';over=s.scrollHeight>h+1;s.style.webkitLineClamp='';s.style.display=''}const m=r.classList.contains('ins-more');
   if(over!==m)bad.push((r.querySelector('b')||{}).textContent+(over?' overflows unmarked':' marked but whole'));if(m)more++;if(m&&r.classList.contains('ins-pk'))perk++}
  const bol=[...document.querySelectorAll('#inspect .ins-s')].filter(r=>(r.querySelector('b')||{}).textContent==='Bolstered').length;if(bol!==1)bad.push('Bolstered listed '+bol+' times');
  const tired=[...document.querySelectorAll('#inspect .ins-s')].find(r=>(r.querySelector('b')||{}).textContent===STATUS.tired.n);
  return{bad,more,perk,rows:R.length,tiredClamped:!!tired&&tired.classList.contains('ins-more')}});
 ok(!cl.bad.length,tag+': chevrons wrong: '+cl.bad.join('; '));ok(cl.more>=2&&cl.perk>=1,tag+': expected clamped rows (perks among them): '+JSON.stringify(cl));
 if(shot)await p.screenshot({path:shot+'_panel_unpinned.png'});
 // a long press lifted: the card lingers, then a touch on it pins it
 if(touch){await p.waitForTimeout(1500);st=await cardState(p);ok(st.on&&!st.pin,tag+': the card should linger after the finger lifts')}
 await press(p,touch,p.locator('#inspect .ins-n'));st=await cardState(p);ok(st.on&&st.pin,tag+': touching the card did not pin it '+JSON.stringify(st));
 ok(await p.locator('#inspect .ins-x').isVisible(),tag+': no close button on the pinned card');
 if(touch){await p.waitForTimeout(4600);st=await cardState(p);ok(st.on&&st.pin,tag+': the pinned card faded on its own')}
 const board1=await p.evaluate(()=>JSON.stringify(document.getElementById('cv').getBoundingClientRect())+JSON.stringify(B.cam&&{x:Math.round(B.cam.x),y:Math.round(B.cam.y),z:B.cam.z}));
 ok(board0===board1,tag+': the board moved when the card opened '+board0+' '+board1);
 if(shot)await p.screenshot({path:shot+'_panel.png'});
 // full text: a status, an ability, a perk, an injury
 const open=async(sel,what)=>{if((await cardState(p)).full){await p.keyboard.press('Escape');await p.waitForTimeout(60)}const loc=p.locator(sel).first();ok(await loc.count(),tag+': no row for '+what+' ('+sel+')');await loc.scrollIntoViewIfNeeded();await press(p,touch,loc);
  const f=await fullState(p);st=await cardState(p);ok(st.full&&st.on,tag+': the full text did not open for '+what+' '+JSON.stringify(st));ok(f.inside,tag+': the full text of '+what+' is not inside the screen '+JSON.stringify(f));
  ok(f.unclipped,tag+': the full text of '+what+' is clipped');return f};
 const want=await p.evaluate(()=>{const u=B.cur,m=u.m,ab=[...document.querySelectorAll('#inspect .ins-trees>span[data-insm]')][0],id=ab?Object.keys(AB).find(k=>AB[k].n===ab.querySelector('b').textContent&&(u.abs||[]).includes(k)):null;
  const pk=m.perks.map(id=>PERKIX[id].perk);
  return{tired:STATUS.tired.d,burn:STATUS.burn.d,ab:id?{n:AB[id].n,d:abDesc(id,u)}:null,perks:pk.map(p=>({n:p.n,d:insPerkFx(p).replace(/^Ability:\s*/,'')})),inj:{n:INJ.fracturedskull.n,d:INJ.fracturedskull.d,st:Object.keys(INJ.fracturedskull.st).map(k=>insSt(k,INJ.fracturedskull.st[k])).join(', ')}}});
 let f=await open(`#inspect .ins-s:has(> div > b:text-is("${await p.evaluate(()=>STATUS.tired.n)}"))`,'the Tired status');
 ok(norm(f.d)===norm(want.tired),tag+': the Tired text is not STATUS.tired.d: '+f.d);ok(/−10 to hit and defense/.test(f.text),tag+': the Tired card lacks its live number');
 if(shot)await p.screenshot({path:shot+'_full_status.png'});
 // a tap outside closes the full text only, and does nothing else (the card stays, nothing is planned or selected)
 const before=await p.evaluate(()=>JSON.stringify({sel:B.sel,plan:!!B.plan,cur:B.cur.name,ap:B.cur.ap}));
 const far=await p.evaluate(()=>{const e=document.getElementById('inspect').getBoundingClientRect(),cv=document.getElementById('cv');for(const x of [20,innerWidth-20,innerWidth/2])for(const y of [innerHeight/2,innerHeight*.75,innerHeight*.3]){if(x>=e.left-4&&x<=e.right+4)continue;if(document.elementFromPoint(x,y)===cv)return{x,y}}return null});
 ok(far,tag+': no free board point beside the card');
 if(touch)await tap(p,far.x,far.y);else{await p.mouse.click(far.x,far.y);await p.waitForTimeout(150)}
 st=await cardState(p);ok(!st.full&&st.on&&st.pin,tag+': a tap outside should close the full text and keep the card '+JSON.stringify(st));
 ok(before===await p.evaluate(()=>JSON.stringify({sel:B.sel,plan:!!B.plan,cur:B.cur.name,ap:B.cur.ap})),tag+': the tap that closed the full text also acted on the board');
 if(want.ab){f=await open(`#inspect .ins-trees>span[data-insm]:has(> b:text-is("${want.ab.n}"))`,'an ability');ok(norm(f.d)===norm(want.ab.d),tag+': ability text is not abDesc(): '+f.d+' / '+want.ab.d)}
 else fail(tag+': no ability chip on the card');
 for(let i=0;i<2;i++){const pk=want.perks[i];f=await open(`#inspect .ins-pk >> nth=${i}`,'the perk '+pk.n);ok(f.name===pk.n&&norm(f.d)===norm(pk.d),tag+': perk text differs: '+f.name+' '+f.d+' / '+pk.n+' '+pk.d)}
 if(shot)await p.screenshot({path:shot+'_full.png'});
 // Escape closes the full text only; the card stays
 await p.keyboard.press('Escape');await p.waitForTimeout(80);st=await cardState(p);ok(!st.full&&st.on,tag+': Escape should close the full text first '+JSON.stringify(st));
 f=await open(`#inspect .ins-s:has(> div > b:text-is("${want.inj.n}"))`,'an injury');ok(f.d.includes(want.inj.st)&&f.text.includes(want.inj.d)&&/5 days/.test(f.text),tag+': injury card lacks its numbers or words: '+f.text);
 f=await open(`#inspect .ins-s:has(> div > b:text-is("${await p.evaluate(()=>STATUS.burn.n)}"))`,'Burning');ok(norm(f.d)===norm(want.burn)&&/2 turns/.test(f.text),tag+': burning card: '+f.text);
 // a tap on the full text keeps it; its close button closes it and keeps the card
 await press(p,touch,p.locator('#insfull .if-d'));st=await cardState(p);ok(st.full&&st.on,tag+': a tap on the full text closed it');
 await press(p,touch,p.locator('#insfull .if-x'));st=await cardState(p);ok(!st.full&&st.on&&st.pin,tag+': the full text close button failed '+JSON.stringify(st));
 // the right column scrolls when taller than its box, and its last row can be reached
 const sc=await p.evaluate(()=>{const r=document.querySelector('#inspect .ins-r'),b=document.querySelector('#inspect .ins-body');if(!r)return{none:1};const over=r.scrollHeight>r.clientHeight+1;r.scrollTop=1e6;const last=r.lastElementChild.getBoundingClientRect(),box=r.getBoundingClientRect();
  return{over,top:r.scrollTop,lastIn:last.bottom<=box.bottom+1&&last.bottom<=innerHeight,ov:getComputedStyle(r).overflowY,bodyOK:b.scrollHeight<=b.clientHeight+1||getComputedStyle(b).overflowY==='auto',card:document.getElementById('inspect').getBoundingClientRect().bottom<=innerHeight}});
 ok(sc.ov==='auto'&&sc.lastIn&&sc.bodyOK&&sc.card,tag+': the card cannot be scrolled to its end '+JSON.stringify(sc));if(H<=400)ok(sc.over&&sc.top>0,tag+': the phone card should scroll '+JSON.stringify(sc));
 if(!touch){await p.evaluate(()=>{document.querySelector('#inspect .ins-r').scrollTop=0});const rb=await p.locator('#inspect .ins-r').boundingBox();await p.mouse.move(rb.x+20,rb.y+40);await p.mouse.wheel(0,300);await p.waitForTimeout(200);
  const t=await p.evaluate(()=>document.querySelector('#inspect .ins-r').scrollTop);if(sc.over)ok(t>0,tag+': the wheel does not scroll the card');ok((await cardState(p)).on,tag+': the wheel over the card closed it')}
 await p.evaluate(()=>{document.querySelector('#inspect .ins-r').scrollTop=0});
 // a pinned card follows the battle
 const hp=await p.evaluate(()=>{const u=B.cur;u.hp=Math.max(1,u.hp-7);updateBUI();return u.hp+'/'+u.hpMax});
 ok((await p.locator('#inspect .ins-bar.hp').textContent()).includes(hp),tag+': the pinned card did not follow the hitpoints');
 await p.keyboard.press('Escape');await p.waitForTimeout(80);st=await cardState(p);ok(!st.on&&!st.full,tag+': Escape should close the card');
 // closed: no touch lands on it
 ok(await p.evaluate(({x,y})=>document.elementFromPoint(x,y)===document.getElementById('cv'),pt),tag+': a closed card still takes touches');
 // a foe's masteries
 if(S.foe){const fp=await unitPoint(p,S.foe);if(fp){if(touch)await longPress(p,fp.x,fp.y);else{await p.mouse.click(fp.x,fp.y,{button:'right'});await p.waitForTimeout(150)}
   const fm=await p.evaluate(()=>{const r=document.querySelector('#inspect .ins-fm');if(!r)return null;const n=r.querySelector('b').textContent,id=Object.keys(PERKIX).find(k=>PERKIX[k].perk&&PERKIX[k].perk.n===n);return{n,d:insPerkFx(PERKIX[id].perk).replace(/^Ability:\s*/,'')}});
   ok(fm,tag+': the foe card shows no masteries');f=await open(`#inspect .ins-fm:has(> div > b:text-is("${fm.n}"))`,'a foe mastery');ok(norm(f.d)===norm(fm.d),tag+': mastery text differs');
   st=await cardState(p);ok(st.pin,tag+': tapping a row should pin the card');
   if(touch){await tap(p,far.x,far.y);await tap(p,far.x,far.y)}else{await p.keyboard.press('Escape');await p.keyboard.press('Escape')}await p.waitForTimeout(100);
   st=await cardState(p);ok(!st.on&&!st.full,tag+': two taps outside should close the full text, then the card '+JSON.stringify(st))}}
 // the HUD chip: a tap opens the card pinned; a long press lists its tooltips instead (statuses with their rule text)
 await p.locator('#uinfo').click();await p.waitForTimeout(120);st=await cardState(p);ok(st.on&&st.pin,tag+': a tap on the unit chip should open the card pinned');
 if(await p.evaluate(()=>{const r=document.getElementById('uinfo').getBoundingClientRect();return document.getElementById('inspect').contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))}))
  {ok(H<=400,tag+': the pinned card covers the unit chip on a big screen');await p.locator('#inspect .ins-x').click()}else await p.locator('#uinfo').click();
 await p.waitForTimeout(120);st=await cardState(p);ok(!st.on,tag+': a second tap on the chip (or the close button) should close it');
 {const bb=await p.locator('#uinfo').boundingBox();await longPress(p,bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(150);st=await cardState(p);f=await fullState(p);
  ok(st.full&&!st.on,tag+': a long press on the chip should list its tooltips, not open the card '+JSON.stringify(st));ok(f.inside&&(f.unclipped||await p.evaluate(()=>{const e=document.getElementById('insfull');e.scrollTop=1e6;const ok=e.scrollTop>0&&getComputedStyle(e).overflowY==='auto';e.scrollTop=0;return ok})),tag+': the chip tooltips are clipped and do not scroll');
  ok(f.text.includes(await p.evaluate(()=>STATUS.burn.d)),tag+': the chip list lacks the Burning rule text');await p.keyboard.press('Escape');await p.waitForTimeout(60)}
 // the forecast window's tooltips by a long press (no strike)
 const fc=await p.evaluate(()=>{B.sel=null;const u=B.cur;
  // a foe brought next to the acting unit (placement only, no rules run) so the forecast has someone to read
  if(!B.units.some(t=>t.side===1&&t.alive&&aimAt(key(t.c,t.r)))){const t=B.units.find(x=>x.side===1&&x.alive&&(x.sz||1)===1);if(t)for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const c=u.c+dc,r=u.r+dr;if(inb(c,r)&&footFree(c,r,1,t)){t.c=c;t.r=r;if(typeof reseatUnits==='function')reseatUnits();break}}}
  for(const t of B.units){if(t.side!==1||!t.alive)continue;const a=aimAt(key(t.c,t.r));if(a&&a.t){fcShow(a,true);return{ap:u.ap,hp:t.hp,n:t.name}}}return null});
 if(fc&&await p.locator('#fcw').isVisible()){const bb=await p.locator('#fcw').boundingBox();await longPress(p,bb.x+bb.width/2,bb.y+Math.min(20,bb.height/2));await p.waitForTimeout(250);
  const after=await p.evaluate(n=>({ap:B.cur.ap,hp:B.units.find(x=>x.name===n).hp,busy:B.busy}),fc.n);st=await cardState(p);f=await fullState(p);
  ok(after.ap===fc.ap&&after.hp===fc.hp&&!after.busy,tag+': the long press on the forecast struck');ok(st.full&&/Forecast/.test(f.name)&&f.inside,tag+': no forecast tooltip list '+JSON.stringify(f));
  console.log('forecast tooltips: '+norm(f.d).slice(0,120));await p.keyboard.press('Escape')}
 else console.log('forecast: no target in reach this seed, skipped');
 if(shot){await p.evaluate(()=>{fcClear&&fcClear();updateBUI()})}
 ok(!errs.length,tag+': page errors:\n'+errs.join('\n'));
 console.log(tag+': card, clamps, pin, full text (status, ability, 2 perks, injury, mastery), outside tap, Escape, scroll, refresh, chip, forecast: ok');
 await ctx.close()}

(async()=>{const b=await chromium.launch();const SHOT=process.env.INSP_SHOTS||'';
 await run(b,1334,750,false,SHOT?SHOT+'/desk':'');
 await run(b,667,375,true,SHOT?SHOT+'/phone':'');
 await b.close();console.log('\ninspfull: ok');process.exit(0)})();
