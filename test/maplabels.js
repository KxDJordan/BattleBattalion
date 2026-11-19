// Band names on the world map (70n-maplabels.js).
// Usage: node test/maplabels.js [html]   (default: the built index.html; MLSHOTS=<dir> also saves screenshots)
// On a staged map with several rival companies, garrisons (a free town's watch, a house town's garrison), a house patrol, a hunt and
// other bands around the company:
//   - every rival company and every guard band in sight gets a plate with the right name (r.n; "<Town> Watch", "<Town> Garrison",
//     "<Town> Guard", "<House> Riders"); other bands (monsters, raiders, caravans, a siege host) get none;
//   - a band out of sight (fog of war) gets none;
//   - two bands on the same spot: one plate, the more important one (a hostile company over a friendly one); no plate covers a town's plate;
//   - zoomed far out: rival companies keep a short name, guards lose theirs;
//   - Detail High draws Fredoka plates, Detail Low the pixel ones (whole device pixels, one step under the towns' plates); High -> Low leaves no painted plate;
//   - Settings "Band names on map" off: no plates (and the setting is saved); a tap on a plate picks its band;
//   - the cost of the layout and drawing per frame stays small.
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');
const f=path.resolve(process.argv[2]||path.join(__dirname,'..','index.html')),SHOTS=process.env.MLSHOTS||'';
let fails=0;const fail=m=>{fails++;console.log('FAIL '+m)},ok=(c,m)=>{if(!c)fail(m)};
function stage(o){o=o||{};seedRng(11);newGame(true,{shape:'continent',biomes:'temperate'});for(let i=0;i<6&&sheetOpen;i++)closeSheet(true);window.ambNotify=()=>{};if(typeof eventTick==='function')window.eventTick=()=>false;
 W.seen.fill(1);W.fogRev++;G.hour=13;G.weather={kind:'clear'};
 const T=TS;let best=0,bi=-1;for(let y=10;y<WN-10;y++)for(let x=10;x<WN-10;x++){let n=0;for(let j=-6;j<=6;j++)for(let i=-9;i<=9;i++)if(W.tiles[(y+j)*WN+x+i]>0)n++;if(n>best){best=n;bi=y*WN+x}}
 const p={x:(bi%WN+.5)*T,y:((bi/WN|0)+.5)*T};G.p.x=p.x;G.p.y=p.y;
 // three towns in view: a free town, a house town, and the patrol's home
 const h=G.houses[0],h2=G.houses[1]||h;const tf=G.towns[0],th=G.towns[1],tp=G.towns[2];
 tf.own='free';tf.x=p.x-6*T;tf.y=p.y-4*T;tf.size=2;th.own=h.id;th.x=p.x+6*T;th.y=p.y-4*T;th.size=3;tp.own=h2.id;tp.x=p.x+9*T;tp.y=p.y+5*T;tp.size=1;
 for(let i=3;i<G.towns.length;i++){const t=G.towns[i];if(Math.hypot(t.x-p.x,t.y-p.y)<16*T){t.x=p.x+40*T*(i&1?1:-1);t.y=p.y+40*T}}
 while(G.rivals.length<4&&typeof rvForm==='function')rvForm([]);
 G.rivals.slice(0,4).forEach(r=>{r.alive=true;r.hired=false;r.calm=null});
 G.parties.length=0;const A=(o)=>{G.parties.push(Object.assign({tx:0,ty:0,mult:1},o))};
 A({id:900,x:p.x-4*T,y:p.y+1.6*T,f:G.rivals[0].id,goal:'merc'});
 A({id:901,x:p.x+3.5*T,y:p.y+1.4*T,f:G.rivals[1].id,goal:'merc'});
 A({id:902,x:p.x-1*T,y:p.y-2.4*T,f:G.rivals[2].id,goal:'merc'});
 A({id:910,x:tf.x+1.5*T,y:tf.y+1.6*T,f:'free',goal:'patrol',gar:0,tgt:-1,from:0,oh:0});
 A({id:911,x:th.x-1.5*T,y:th.y+1.8*T,f:h.id,goal:'patrol',gar:1,tgt:-1,from:1,oh:0});
 A({id:912,x:p.x+6*T,y:p.y+3.9*T,f:h2.id,goal:'patrol',from:2,to:2});
 A({id:913,x:p.x-5.5*T,y:p.y+3.4*T,f:h.id,goal:'patrol',from:1,hunt:1});
 A({id:920,x:p.x+1*T,y:p.y+3.8*T,f:'gob',goal:'roam'});A({id:921,x:p.x-2*T,y:p.y+4.5*T,f:'orc',goal:'raid',to:0});
 A({id:922,x:p.x+5*T,y:p.y-1*T,f:h.id,goal:'caravan',from:1,to:0});A({id:923,x:p.x-8*T,y:p.y-1*T,f:h.id,goal:'patrol',siege:0});
 A({id:930,x:p.x+11*T,y:p.y-.5*T,f:G.rivals[3].id,goal:'merc'});   // out of sight
 window.__hide=new Set([930]);const vis=(x,y)=>!(Math.abs(x-(p.x+11*T))<T*.6&&Math.abs(y-(p.y-.5*T))<T*.6);
 window.visibleWithin=(tx,ty)=>vis((tx+.5)*T,(ty+.5)*T);window.visibleAt=(tx,ty)=>vis((tx+.5)*T,(ty+.5)*T);
 G.zoom=1;WV.boot=true;WV.free=false;G.moving=false;G.path=[];return{rv:G.rivals.slice(0,4).map(r=>[r.n,r.short]),tf:tf.name,th:th.name,tp:tp.name,h:h.n}}
const plates=()=>{WSG.ok=false;drawWorld(0);const L=[];for(let i=0;i<ML.dn;i++){const D=ML.drawn[i],st=ML.st.get(D.o.id);L.push({id:D.o.id,a:D.a,x:D.x,y:D.y,w:D.w,h:D.h,cw:D.c.width,t:mlName(D.o,ML.far).t})}
 const T=[];for(let i=0;i<WV.np;i++){const q=WV.plates[i],P=Math.max(1,Math.round(dpr*1.5)),w=q.c.width*(q.hd?1:P),h=q.c.height*(q.hd?1:P);T.push({x:Math.round(WV.bx+q.x*WV.sc-w/2),y:Math.round(WV.by+q.y*WV.sc-h),w,h})}
 return{L,T,hd:WVHD,far:ML.far,sc:WV.sc,sdef:WV.sdef,dpr}};
(async()=>{const b=await chromium.launch(),errs=[];
 const page=async(w,h,d)=>{const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:d});p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
  await p.goto('file://'+f);await p.waitForTimeout(250);await p.evaluate(`window.stage=${stage.toString()};window.plates=${plates.toString()}`);return p};
 const p=await page(667,375,2);
 const S=await p.evaluate(()=>{SET.detail='high';artChanged();reduced=true;return stage()});
 await p.waitForTimeout(1500);
 const H=await p.evaluate(()=>plates());
 const by=id=>H.L.find(q=>q.id===id&&q.a>.5);
 // names
 for(const [id,i] of [[900,0],[901,1],[902,2]]){const q=by(id);ok(q,`rival ${S.rv[i][0]} has no plate`);if(q)ok(q.t===S.rv[i][0],`rival plate reads "${q.t}", not "${S.rv[i][0]}"`)}
 const want={910:S.tf+' Watch',911:S.th+' Garrison',912:S.tp+' Guard',913:S.h+' Riders'};
 for(const id in want){const q=by(+id);ok(q,`guard band ${id} (${want[id]}) has no plate`);if(q)ok(q.t===want[id],`guard plate reads "${q.t}", not "${want[id]}"`)}
 for(const id of [920,921,922,923])ok(!H.L.some(q=>q.id===id),`band ${id} (not a company or guard) got a plate`);
 ok(!H.L.some(q=>q.id===930),'a band out of sight got a plate');
 ok(H.hd,'Detail High is off');
 // no plate on a town's plate or on another plate
 const hit=(a,c)=>a.x<c.x+c.w&&a.x+a.w>c.x&&a.y<c.y+c.h&&a.y+a.h>c.y,shown=H.L.filter(q=>q.a>.5);
 for(const q of shown){for(const t of H.T)ok(!hit(q,t),`plate ${q.t} covers a town's plate`);for(const r of shown)if(r!==q)ok(!hit(q,r),`plates ${q.t} and ${r.t} overlap`)}
 // the plate is readable on a phone: Fredoka at about 11 CSS px
 const q0=by(900);if(q0)ok(q0.h>=26&&q0.h<=44,`plate height ${q0.h} device px at dpr 2`);
 console.log(`high: ${shown.length} plates: ${shown.map(q=>q.t).join(', ')} (scale ${H.sc}, default ${H.sdef})`);
 if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await p.screenshot({path:path.join(SHOTS,'map_phone.png')})}
 // overlap: a hostile company and a friendly one on the same spot
 const O=await p.evaluate(()=>{const a=G.parties.find(q=>q.id===901),c=G.parties.find(q=>q.id===900);const x0=c.x,y0=c.y;c.x=a.x+4;c.y=a.y;const r=rivalById(c.f);r.hired=true;const L=plates().L.filter(q=>q.id===900||q.id===901);r.hired=false;c.x=x0;c.y=y0;plates();return L});
 const Os=O.filter(q=>q.a>.5);ok(Os.length===1,`two bands on one spot: ${Os.length} plates shown`);if(Os.length===1)ok(Os[0].id===900,'the friendly company took the plate from the hostile one');
 // faded, not cut: without reduced motion the loser eases out
 const F=await p.evaluate(()=>{reduced=false;const a=G.parties.find(q=>q.id===901),c=G.parties.find(q=>q.id===902);const x0=c.x,y0=c.y;drawWorld(0);c.x=a.x-3;c.y=a.y;WSG.ok=false;drawWorld(1/60);const s=ML.st.get(902),s1=ML.st.get(901),m=[s.a,s1.a,ML.live];for(let i=0;i<60;i++){WSG.ok=false;drawWorld(1/30)}m.push(ML.st.get(902).a,ML.st.get(901).a);c.x=x0;c.y=y0;reduced=true;return m});
 ok(F[2]&&((F[0]>0&&F[0]<1)||(F[1]>0&&F[1]<1)),`no fade on a new overlap (${F.slice(0,3)})`);ok(Math.min(F[3],F[4])===0&&Math.max(F[3],F[4])===1,`after the fade: ${F[3]} / ${F[4]}`);
 // the tap: a plate picks its band
 const T=await p.evaluate(()=>{plates();const D=[...Array(ML.dn).keys()].map(i=>ML.drawn[i]).find(d=>d.o.id===910&&d.a>.5);if(!D)return'no plate';const sx=D.x+D.w/2,sy=D.y+D.h-3,wx=(sx-WV.bx)/WV.sc*WVU,wy=(sy-WV.by)/WV.sc*WVU,k=worldPick(wx,wy,true);return k&&k.type==='band'?k.o.id:k&&k.type})
 ok(T===910,'a tap on a plate picks '+T);
 // the cost: the layout and drawing per frame
 const C=await p.evaluate(()=>{const n=200;let t0=performance.now();for(let i=0;i<n;i++){mlBegin();for(const o of G.parties)if(o.id!==930)mlCand(o,o.x/WVU,o.y/WVU);mlLayout(0,WV.plates,3)}const lay=(performance.now()-t0)/n;t0=performance.now();for(let i=0;i<n;i++)mlDraw(cv.getContext('2d'));return{lay,draw:(performance.now()-t0)/n,cache:ML.cache.size}});
 ok(C.lay<.5&&C.draw<.5,`band names cost ${C.lay.toFixed(3)} ms layout + ${C.draw.toFixed(3)} ms draw a frame`);console.log(`cost: layout ${C.lay.toFixed(3)} ms, draw ${C.draw.toFixed(3)} ms a frame, ${C.cache} cached plates`);
 // zoomed far out
 const Z=await p.evaluate(()=>{const out=[];for(const z of [.75,.5]){G.zoom=z;WV.boot=true;worldCam(0);WV.boot=true;const r=plates();out.push({z,far:r.far,sc:r.sc,L:r.L.filter(q=>q.a>.5)})}G.zoom=1;WV.boot=true;return out});
 const zr=Z.find(z=>z.far===2);ok(zr,'no farthest-zoom state: '+Z.map(z=>z.sc+'/'+z.far));
 if(zr){ok(!zr.L.some(q=>q.id>=910&&q.id<920),'guards keep plates at the farthest zoom');for(const q of zr.L)ok(S.rv.some(r=>r[1]===q.t),`far plate "${q.t}" is not a short rival name`);ok(zr.L.length>=1,'no rival plates at the farthest zoom')}
 const z1=Z.find(z=>z.far===1);if(z1){ok(z1.L.some(q=>q.id>=910&&q.id<920),'guards lose plates one step out');ok(z1.L.filter(q=>q.id<910).every(q=>S.rv.some(r=>r[1]===q.t)),'rivals not shortened one step out')}
 console.log('zoom: '+Z.map(z=>`scale ${z.sc} far ${z.far}: ${z.L.map(q=>q.t).join(', ')}`).join(' | '));
 if(SHOTS){await p.evaluate(()=>{G.zoom=.5;WV.boot=true;WSG.ok=false;drawWorld(0)});await p.waitForTimeout(300);await p.screenshot({path:path.join(SHOTS,'map_zoomout.png')});await p.evaluate(()=>{G.zoom=1;WV.boot=true})}
 // the setting
 const Tg=await p.evaluate(()=>{setOpt('bandNames',false);closeSheet&&closeSheet(true);const off=plates().L.length,saved=JSON.parse(storeGet(SETKEY)).bandNames,html=settingsHTML().includes('Band names on map');setOpt('bandNames',true);const on=plates().L.length;return{off,on,saved,html}});
 ok(Tg.off===0,`setting off: ${Tg.off} plates`);ok(Tg.on>0,'setting on again: no plates');ok(Tg.saved===false,'the setting is not saved');ok(Tg.html,'no settings row');
 // Detail Low
 const Lw=await p.evaluate(()=>{SET.detail='low';artChanged();WV.boot=true;const r=plates();return r});
 ok(!Lw.hd,'Detail Low still paints');const lw=Lw.L.filter(q=>q.a>.5);ok(lw.length>=5,`Low: ${lw.length} plates`);
 for(const q of lw)ok(q.w===q.cw*2,`Low plate ${q.t} drawn at ${q.w} px for a ${q.cw} px canvas (want whole device pixels x2)`);
 for(const q of lw){for(const t of Lw.T)ok(!hit(q,t),`Low plate ${q.t} covers a town's plate`)}
 ok(lw.some(q=>q.id===900&&q.t===S.rv[0][0]),'Low: rival plate missing');ok(lw.some(q=>q.id===911&&q.t===S.th+' Garrison'),'Low: garrison plate missing');
 console.log(`low: ${lw.length} plates`);
 await p.close();
 if(SHOTS){for(const [nm,det] of [['map_high.png','high'],['map_low.png','low']]){const q=await page(1334,750,1);await q.evaluate(d=>{SET.detail=d;artChanged();reduced=true;stage()},det);await q.waitForTimeout(2500);await q.evaluate(()=>{WSG.ok=false;drawWorld(0)});await q.screenshot({path:path.join(SHOTS,nm)});await q.close()}}
 if(errs.length)fail('page errors: '+errs.slice(0,4).join(' | '));
 await b.close();console.log(fails?fails+' FAILURES':'map labels: all ok');process.exit(fails?1:0)})();
