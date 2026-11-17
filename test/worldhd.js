// World map art at Detail High (41h-worldhd.js, 41i-worldhd-sites.js, 41j-worldhd-bands.js, 41k-worldhd-east.js) and Detail Low (41-worldart.js).
// Usage: node test/worldhd.js [html]
// For several map shapes and climates, day and night, clear and foul weather, with every kind of site (towns of each size with every
// dressing, ruins, dungeons open and cleared, the colosseum, crisis sites, rifts, nests of every faction and tier), every band kind
// (each faction, caravans, house patrols, raiders, a rival company, a host of the East), the contract markers, a route, the march's
// destination and the destination beacon on the screen:
//   - no page errors;
//   - Detail High draws the painted path: WVHD on, the view's terrain quads painted at the settled scale, every sprite on the draw list
//     a painted one (hd), markers and plates painted; Detail Low draws the pixel path: WVHD off, no quads, pixel sprites only;
//   - switching High -> Low gives the very same Low picture as a fresh Low start (reduced motion, so nothing moves);
//   - the painted cache stays under its pixel cap;
//   - a frame-time budget while panning across the map at High (drawWorld's own cost: mean and 95th percentile).
const {chromium}=require('playwright'),path=require('path');
const f=path.resolve(process.argv[2]||'dist/index.html');
const SCENES=[
 {n:'continent temperate day',shape:'continent',biomes:'temperate',hour:12},
 {n:'continent temperate night rain',shape:'continent',biomes:'temperate',hour:22,wx:'rain'},
 {n:'archipelago dry day',shape:'archipelago',biomes:'dry',hour:10,wx:'sand'},
 {n:'inland frozen dusk snow',shape:'inland',biomes:'frozen',hour:19,wx:'snow'},
 {n:'highlands wild night fog',shape:'highlands',biomes:'wild',hour:2,wx:'fog'},
 {n:'coast mixed day storm',shape:'coast',biomes:'mixed',hour:14,wx:'storm'}];
const PAN_MEAN=12,PAN_P95=30;   // ms of drawWorld per frame while panning (desktop CI; a phone is a few times slower)
let fails=0;const fail=(s,m)=>{fails++;console.log('FAIL ['+s+'] '+m)};
// everything the map can show, placed around the company (in page)
function stage(sc){seedRng(7);newGame(true,{shape:sc.shape,biomes:sc.biomes});for(let i=0;i<6&&sheetOpen;i++)closeSheet(true);window.ambNotify=()=>{};if(typeof eventTick==='function')window.eventTick=()=>false;
 W.seen.fill(1);W.fogRev++;G.hour=sc.hour;G.weather={kind:sc.wx||'clear'};
 // a land spot with room around it
 const T=TS;let best=0,bi=-1;for(let y=8;y<WN-8;y++)for(let x=8;x<WN-8;x++){let n=0;for(let j=-6;j<=6;j++)for(let i=-8;i<=8;i++)if(W.tiles[(y+j)*WN+x+i]>0)n++;if(n>best){best=n;bi=y*WN+x}}
 const p={x:(bi%WN+.5)*T,y:((bi/WN|0)+.5)*T};G.p.x=p.x;G.p.y=p.y;
 const site=(kind,dx,dy,o)=>G.sites.push(Object.assign({id:G.nid++,kind,x:p.x+dx*T,y:p.y+dy*T,n:0},o||{}));if(!Array.isArray(G.sites))G.sites=[];
 site('ruin',-7,-3);site('dgn',-3,-3.5,{n:0});site('dgn',1,-3.5,{n:1});site('dgnc',5,-3.5,{n:2});site('dgn',8,-3.5,{n:3});site('colo',-7,4.5);
 site('grave',-3,5);site('throne',1,5.5);site('hcamp',5,5);site('ecamp',9,5.5);
 G.portals.push({id:G.nid++,x:p.x-9*T,y:p.y,realm:'ashen'},{id:G.nid++,x:p.x+9*T,y:p.y+1*T,realm:'glass'},{id:G.nid++,x:p.x+9*T,y:p.y-2*T,realm:'hollow'});
 if(!Array.isArray(G.nests))G.nests=[];['gob','undead','beast','orc','bandit','void','serpent','ent','ogre','wyvern'].forEach((fk,i)=>G.nests.push({id:G.nid++,x:p.x+(-8+i*1.8)*T,y:p.y+(i&1?7:8.4)*T,f:fk,str:1+(i%3)*.8,day:1,n:0}));
 // towns: every size, every dressing, an owner, an eastern one
 const sits=['raided','festival','famine','plague','boom','siege','crsiege','haunted','occupied','sacked','burned'],h=G.houses&&G.houses[0];
 G.towns.slice(0,12).forEach((t,i)=>{t.x=p.x+(-10+(i%6)*4)*T;t.y=p.y+(i<6?-6.5:10.5)*T;t.size=1+(i%3);t.sit=[{k:sits[i%sits.length]}];if(h&&i%2)t.own=h.id;t.pros=i%3===0?10:i%3===1?90:50;t.east=i===5});
 // bands of every kind
 G.parties.length=0;const fs=['gob','undead','beast','orc','bandit','void','serpent','ent','ogre','wyvern','dead','horde','barb'];
 fs.forEach((fk,i)=>G.parties.push({id:900+i,x:p.x+(-6+(i%7)*2)*T,y:p.y+(i<7?-1.2:1.4)*T,tx:0,ty:0,f:fk,mult:.6+(i%3)*.35,goal:'roam'}));
 if(h){G.parties.push({id:950,x:p.x+7*T,y:p.y+2.8*T,f:h.id,mult:1.3,goal:'patrol'},{id:951,x:p.x-4*T,y:p.y+2.8*T,f:h.id,mult:1.2,goal:'caravan',from:0,to:1})}
 G.parties.push({id:952,x:p.x,y:p.y+3*T,f:'orc',mult:1,goal:'raid'},{id:953,x:p.x+3*T,y:p.y+3*T,f:'east',mult:1.2,goal:'roam'});
 if(Array.isArray(G.rivals)&&G.rivals[0])G.parties.push({id:954,x:p.x-7*T,y:p.y+1.5*T,f:G.rivals[0].id,mult:1.1,goal:'merc'});
 window.visibleWithin=()=>true;window.visibleAt=()=>true;
 // a contract (markers, the beacon), a route with waypoints and the march's destination
 for(let i=0;i<80&&!G.contract;i++){const c=genContract2(G.towns[1],1);if(c)ctrAccept(c)}
 G.route=[{x:p.x,y:p.y},{x:p.x+2*T,y:p.y-2*T},{x:p.x+5*T,y:p.y-1*T}];G.path=[{x:p.x+T,y:p.y},{x:p.x+2*T,y:p.y+T}];G.moving=true;G.dest=null;
 WV.boot=true;WV.free=false;return true}
(async()=>{const b=await chromium.launch();
for(const sc of SCENES){const p=await b.newPage({viewport:{width:667,height:375},deviceScaleFactor:2});const errs=[];
 p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
 await p.goto('file://'+f);await p.waitForTimeout(250);await p.evaluate(`window.stage=${stage.toString()}`);
 await p.evaluate(()=>{const w0=wvSprite;window.__spr=[];window.wvSprite=function(key,base,kind,o){const e=w0(key,base,kind,o);__spr.push({kind,k:o&&(kind==='east'?o.k:o.kind||o.goal||o.k||o.f)||'',hd:!!(e&&(e.hd||e.k>1))});return e}});
 // ---- Detail High
 await p.evaluate(sc=>{SET.detail='high';artChanged();stage(sc);G.moving=false},sc).catch(e=>errs.push('stage: '+e));
 await p.waitForTimeout(3000);
 const H=await p.evaluate(()=>{__spr.length=0;WSG.ok=false;drawWorld(0);const S=WHQ*16,vx0=WV.vx0,vy0=WV.vy0,vx1=WV.vx1,vy1=WV.vy1;let need=0,have=0;
  for(let y=Math.max(0,Math.floor(vy0/S));y<=Math.min(WQ.n-1,Math.floor(vy1/S));y++)for(let x=Math.max(0,Math.floor(vx0/S));x<=Math.min(WQ.n-1,Math.floor(vx1/S));x++){need++;const q=wqAt(x,y);if(q&&q.cv&&q.cv.K===WQ.K)have++}
  const kinds={};for(const s of __spr){const k=s.kind+':'+s.k;kinds[k]=kinds[k]||{n:0,hd:0};kinds[k].n++;if(s.hd)kinds[k].hd++}
  let plates=0;for(let i=0;i<WV.np;i++)if(WV.plates[i].hd)plates++;
  return{on:WVHD,need,have,K:WQ.K,s:WV.s,kinds,px:WQ.px,cap:WQ.cap,list:WSN,plates,np:WV.np,cont:!!G.contract}});
 if(!H.on)fail(sc.n,'High: the painted path is off');
 if(H.have<H.need)fail(sc.n,`High: ${H.need-H.have} of ${H.need} quads in view not painted at K=${H.K}`);
 if(H.K!==Math.max(1,Math.min(8,H.s)))fail(sc.n,'High: quads at K '+H.K+' for scale '+H.s);
 for(const k in H.kinds)if(H.kinds[k].hd<H.kinds[k].n)fail(sc.n,`High: ${k} drawn with a pixel sprite (${H.kinds[k].hd}/${H.kinds[k].n})`);
 const want=['site:town','site:ruin','site:dgn','site:dgnc','site:grave','site:throne','site:hcamp','site:ecamp','site:nest','site:portal','deco:','band:caravan','band:patrol','band:raid','band:gob','band:wyvern','band:beast','co:','east:town','east:band'];
 for(const k of want)if(!Object.keys(H.kinds).some(x=>x.startsWith(k)))fail(sc.n,'High: nothing drawn of '+k);
 if(H.plates!==H.np)fail(sc.n,`High: ${H.np-H.plates} name plates in pixel letters`);
 if(H.px>H.cap*1.25)fail(sc.n,`High: painted cache ${H.px} px over the cap ${H.cap}`);
 // the frame budget while panning (High)
 const P=await p.evaluate(async()=>{const T=[],dw=drawWorld;window.drawWorld=function(dt){const a=performance.now();dw(dt);T.push(performance.now()-a)};G.moving=false;
  await new Promise(res=>{const s=performance.now();const st=()=>{worldPan(-2.6,-1);if(performance.now()-s<2200)requestAnimationFrame(st);else res()};requestAnimationFrame(st)});
  window.drawWorld=dw;T.sort((a,b)=>a-b);return{n:T.length,mean:T.reduce((a,b)=>a+b,0)/Math.max(1,T.length),p95:T[Math.floor(T.length*.95)]||0}});
 if(P.mean>PAN_MEAN||P.p95>PAN_P95)fail(sc.n,`High: panning costs ${P.mean.toFixed(1)} ms a frame (p95 ${P.p95.toFixed(1)}), budget ${PAN_MEAN} / ${PAN_P95}`);
 // ---- Detail Low (after High), then a fresh Low start: the same picture
 const lowShot=async()=>p.evaluate(async sc=>{reduced=true;stage(sc);G.moving=false;G.path=[];await new Promise(r=>setTimeout(r,1400));G.hour=sc.hour;WSG.ok=false;drawWorld(0);
  const sp=[];for(let i=0;i<WSN;i++){const e=WSL[i].e;if(e.hd)sp.push(i)}return{on:WVHD,px:WQ.px,hdSprites:sp.length,url:document.getElementById('cv').toDataURL()}},sc);
 await p.evaluate(()=>{SET.detail='low';artChanged();PERF.wn=0;PERF.acc=0;PERF.n=0;setRes();refreshScene()});const L1=await lowShot();   // (a slow headless pan may have halved the backing store: back to full)
 if(L1.on)fail(sc.n,'Low: the painted path is still on');
 if(L1.hdSprites)fail(sc.n,`Low: ${L1.hdSprites} painted sprites on the draw list`);
 const p2=await b.newPage({viewport:{width:667,height:375},deviceScaleFactor:2});p2.on('pageerror',e=>errs.push(String(e)));await p2.goto('file://'+f);await p2.waitForTimeout(250);
 await p2.evaluate(`window.stage=${stage.toString()}`);
 const L2=await p2.evaluate(async sc=>{SET.detail='low';artChanged();reduced=true;stage(sc);G.moving=false;G.path=[];await new Promise(r=>setTimeout(r,1400));G.hour=sc.hour;WSG.ok=false;drawWorld(0);return{url:document.getElementById('cv').toDataURL()}},sc);
 if(L1.url!==L2.url){fail(sc.n,'Low after High differs from a fresh Low start');if(process.env.WHDUMP){require('fs').writeFileSync('/tmp/l1.png',Buffer.from(L1.url.split(',')[1],'base64'));require('fs').writeFileSync('/tmp/l2.png',Buffer.from(L2.url.split(',')[1],'base64'))}}
 await p2.close();
 if(errs.length)fail(sc.n,'page errors: '+errs.slice(0,4).join(' | '));
 console.log(`${sc.n}: high K=${H.K}, ${H.have}/${H.need} quads, ${H.list} sprites (${Object.keys(H.kinds).length} kinds), ${(H.px/1e6).toFixed(1)} Mpx cached; pan ${P.mean.toFixed(2)} ms (p95 ${P.p95.toFixed(2)}) over ${P.n} frames; low ok`);
 await p.close()}
await b.close();console.log(fails?fails+' FAILURES':'world hd: all ok');process.exit(fails?1:0)})();
