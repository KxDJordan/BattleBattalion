// Town view (51-townview.js, 51h-townhd.js): every service the town has is its own building on the street, each tap target
// opens its tab, labels stay apart and clear of the fixed boxes, the arrival note sits on top and fades, no page errors.
// Usage: node test/townview.js [html]
const {chromium}=require('playwright'),path=require('path');
const f=path.resolve(process.argv[2]||'dist/index.html');
const ALL=['notice','tavern','market','inn','temple','armorer','college','hall','weaponsmith','fletcher','harbour'];
const SOME=['notice','tavern','market','inn','temple','armorer','fletcher'];
const NONE=['notice','tavern','market','inn'];
const CFG=[
 {n:'no extras',bld:NONE,bio:'plains',tod:'day',taps:1},
 {n:'all extras',bld:ALL,bio:'plains',tod:'day',taps:1,drag:1,note:1},
 {n:'all extras, night, east',bld:ALL,bio:'forest',tod:'night',east:1,taps:1},
 {n:'harbour only, dusk',bld:NONE.concat(['harbour']),bio:'swamp',tod:'dusk',taps:1},
 {n:'all extras, detail low',bld:ALL,bio:'plains',tod:'day',low:1,taps:1},
 {n:'all extras, low, night, east',bld:ALL,bio:'snow',tod:'night',low:1,east:1},
 ...['plains','forest','hills','swamp','desert','snow'].map(bio=>({n:'some extras, '+bio,bld:SOME,bio,tod:bio==='snow'?'dawn':'day'})),
 {n:'all extras 568',bld:ALL,bio:'hills',tod:'day',w:568,h:320,taps:1},
 {n:'all extras 568 low',bld:ALL,bio:'desert',tod:'night',w:568,h:320,low:1},
 {n:'no extras 568',bld:NONE,bio:'plains',tod:'day',w:568,h:320},
 {n:'all extras iPad',bld:ALL,bio:'plains',tod:'day',w:1024,h:768},
 {n:'all extras 1280',bld:ALL,bio:'forest',tod:'dusk',w:1280,h:720},
];
let fails=0;const fail=(c,m)=>{fails++;console.log('FAIL ['+c.n+'] '+m)};
const ov=(a,b,m)=>a.left<b.right-(m||0)&&a.right>b.left+(m||0)&&a.top<b.bottom-(m||0)&&a.bottom>b.top+(m||0);
(async()=>{const b=await chromium.launch();
for(const c of CFG){const p=await b.newPage({viewport:{width:c.w||667,height:c.h||375},deviceScaleFactor:2});const errs=[];
 p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
 await p.goto('file://'+f);await p.waitForTimeout(200);
 const info=await p.evaluate(c=>{seedRng(11);newGame();closeSheet();window.ambNotify=()=>{};SET.detail=c.low?'low':'high';if(typeof artChanged==='function')artChanged();
  const t=G.towns[0];t.east=!!c.east;t.bld=c.bld.slice();TV.force={tod:c.tod,bio:c.bio};G.p.x=t.x;G.p.y=t.y;if(typeof eventTick==='function')window.eventTick=()=>false;openTown(0);
  const want=TVPLACES.map(x=>x[0]).concat(tvExtras(t));
  return{shown:!!(TV.shown&&TV.root.classList.contains('on')),hd:TV.hd,ms:Math.round(TV.paintMs),places:[...document.querySelectorAll('#tvPlaces .tv-place')].map(e=>e.getAttribute('onclick').match(/tvGo\('(\w+)'\)/)[1]),want,panMax:TV.panMax}},c);
 if(!info.shown){fail(c,'town view not shown');await p.close();continue}
 if(info.hd!==!c.low)fail(c,'detail level: hd='+info.hd);
 const got=info.places.slice().sort().join(','),want=info.want.slice().sort().join(',');if(got!==want)fail(c,'places '+got+' != '+want);
 if(new Set(info.places).size!==info.places.length)fail(c,'a place twice');
 // labels apart and clear of the fixed boxes, at several pan positions
 const pans=info.panMax>0?[0,info.panMax*.25,info.panMax*.5,info.panMax*.75,info.panMax]:[0];
 for(const pan of pans){const L=await p.evaluate(pan=>{tvPanTo(pan);const vw=innerWidth,R=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
   const plates=[...document.querySelectorAll('#tvPlaces .tv-plate')].map(e=>{const r=R(e),bd=e.querySelector('.tv-badge');if(bd){const q=R(bd);r.left=Math.min(r.left,q.left);r.right=Math.max(r.right,q.right);r.top=Math.min(r.top,q.top)}r.n=e.textContent;return r}).filter(r=>r.right>0&&r.left<vw);
   const fixed=[['name',document.querySelector('#tv .tv-name')],['purse',document.getElementById('tvRes')],['Company',document.getElementById('tvCo')],['Leave',document.getElementById('tvLeave')],['pan',document.getElementById('tvPan')]].filter(x=>x[1]&&x[1].offsetParent).map(([n,e])=>Object.assign(R(e),{n}));
   return{plates,fixed}},pan);
  for(let i=0;i<L.plates.length;i++){for(let j=i+1;j<L.plates.length;j++)if(ov(L.plates[i],L.plates[j]))fail(c,`labels overlap at pan ${Math.round(pan)}: ${L.plates[i].n} / ${L.plates[j].n}`);
   for(const q of L.fixed)if(ov(L.plates[i],q))fail(c,`label ${L.plates[i].n} under the ${q.n} box at pan ${Math.round(pan)}`)}}
 // every tap target opens its tab (a real click on the label, after bringing it into view)
 if(c.taps)for(const k of info.places){const pt=await p.evaluate(k=>{tvPanTo(0);const e=[...document.querySelectorAll('#tvPlaces .tv-place')].find(x=>x.getAttribute('onclick')===`tvGo('${k}')`);TV.panA=null;tvPanShow(e);if(TV.panA){TV.pan=TV.panA.to;TV.panA=null;tvPanApply()}
   const r=e.querySelector('.tv-plate').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}},k);
  await p.waitForTimeout(30);await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(60);
  const r=await p.evaluate(()=>({tab:townTab,panel:typeof panelOpen==='function'&&!!panelOpen(),scene:TV.shown&&TV.root.classList.contains('on')}));
  if(r.tab!==k||!r.panel)fail(c,`tap ${k}: tab ${r.tab}, panel ${r.panel}`);
  await p.evaluate(()=>townBack());await p.waitForTimeout(40);
  if(!await p.evaluate(()=>TV.shown&&TV.root.classList.contains('on')))fail(c,'back to the street after '+k)}
 // a drag pans the street and does not open a building
 if(c.drag&&info.panMax>0){await p.evaluate(()=>tvPanTo(0));const y=Math.round((c.h||375)*.55);await p.mouse.move(400,y);await p.mouse.down();for(let i=1;i<=8;i++)await p.mouse.move(400-i*30,y);await p.mouse.up();await p.waitForTimeout(80);
  const r=await p.evaluate(()=>({pan:TV.pan,panel:typeof panelOpen==='function'&&!!panelOpen()}));if(r.pan<150)fail(c,'drag did not pan: '+r.pan);if(r.panel)fail(c,'a drag opened a panel')}
 // the arrival note: on top of every label, clear of the fixed boxes, gone after ~7 s
 if(c.note){const N=await p.evaluate(()=>{tvPanTo(0);TV.note='';tvShow('<p class="good">Contract fulfilled. You are paid 120 crowns and gain 16 renown.</p>');const n=document.getElementById('tvNote'),r=n.getBoundingClientRect(),R=e=>e.getBoundingClientRect();
   const bad=[];for(const e of document.querySelectorAll('#tvPlaces .tv-plate')){const q=R(e);const x0=Math.max(q.left,r.left),x1=Math.min(q.right,r.right),y0=Math.max(q.top,r.top),y1=Math.min(q.bottom,r.bottom);if(x1>x0&&y1>y0){const h=document.elementFromPoint((x0+x1)/2,(y0+y1)/2);if(!h||!n.contains(h))bad.push('under '+e.textContent)}}
   for(const [k,e] of [['name',document.querySelector('#tv .tv-name')],['purse',document.getElementById('tvRes')],['Company',document.getElementById('tvCo')],['Leave',document.getElementById('tvLeave')]]){const q=R(e);if(r.left<q.right&&r.right>q.left&&r.top<q.bottom&&r.bottom>q.top)bad.push('covers '+k)}
   return{on:n.classList.contains('on')&&r.height>10,bad}});
  if(!N.on)fail(c,'paid note not shown');for(const x of N.bad)fail(c,'note '+x);
  await p.waitForTimeout(8000);if(await p.evaluate(()=>document.getElementById('tvNote').classList.contains('on')))fail(c,'note still up after 8 s')}
 if(errs.length)fail(c,'page errors: '+errs.join(' | '));
 console.log(`${c.n}: ${info.places.length} places, ${info.hd?'high':'low'}, paint ${info.ms} ms, pan ${Math.round(info.panMax)} px`);
 await p.close()}
await b.close();console.log(fails?fails+' FAILURES':'town view: all ok');process.exit(fails?1:0)})();
