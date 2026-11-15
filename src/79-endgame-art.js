/* ================= ENDGAME SCREENS (endgame agent): the portal node map, entrance sheets, after-battle sheets =================
   egMapShow() / egMapHide() / egMapOpen(): the node map of G.portalRun, a full-screen overlay (#egmap, endgame.css) over the world. Its
   picture is pixel art in PAL drawn on a small canvas (EGM.W x EGM.H, scaled up by CSS, pixelated): the realm's sky and ground, the paths
   between the nodes (lit where the company may go next), a sprite per node kind on a stone plinth, the rift it came through and the
   company's banner where it stands. Tap a node (or its button in the list) to read it, then march to it. The canvas is redrawn only
   when its signature changes (realm, position, selection, done marks, size), and once a quarter second for the embers / glints while open
   (never when reduced motion is on).
   egPortalSheet(id) (portalSheet), dungeonSheet(id) (siteSheet), egAfterSheet(out) (afterBattle): the entrance sheets state the danger
   honestly, the after sheets what was won. Nothing here draws from the game's rnd(). */
const EGM={root:null,cv:null,q:null,sel:-1,sig:'',t:0,raf:0,W:224,H:120,ev:null};
// 12x12 node sprites (PAL keys, '.' clear, a '0' outline)
const EGSPR={
 battle:['..0......0..','.0r0....0r0.','.0qr0..0rq0.','..0qr00rq0..','...0qrrq0...','....0qq0....','...0kqqk0...','..0k0000k0..','.0k0....0k0.','0bb0....0bb0','0bb0....0bb0','.00......00.'],
 elite:['.c0......0c.','.dc0....0cd.','..dc0000cd..','..0llllll0..','.0llllllll0.','.0l00ll00l0.','.0l0gl0gl0..','.0llll0lll0.','..0lllllll0.','...0l0l0l0..','...0lmlml0..','....00000...'],
 rest:['............','.....0......','....0E0.....','...0EyE0....','...0yey0.0..','..0EyeyE0E0.','..0EeeeyE0..','.00jEeEj00..','0kjj0EE0jjk0','0iiijjjjiii0','.0000000000.','............'],
 treasure:['............','..00000000..','.0cddddddc0.','0bccccccccb0','0bbbbbbbbbb0','0aaaa00aaaa0','0bbb0dd0bbb0','0ccc0dd0ccc0','0bbbb00bbbb0','0bbbbbbbbbb0','0aaaaaaaaaa0','.0000000000.'],
 event:['....0000....','..00CCCC00..','.0CCrrrrCC0.','.0Cr0000rC0.','0Cr0FFFF0rC0','0Cr0F00F0rC0','0Cr0F00F0rC0','0Cr0FFFF0rC0','.0Cr0000rC0.','.0CCrrrrCC0.','..00CCCC00..','....0000....'],
 boss:['.d..d..d..d.','0d0dc0dc0d0.','0ddcddcdddd0','0cccccccccc0','.0000000000.','.0llllllll0.','0ll00ll00ll0','0l0gg00gg0l0','0llll00llll0','.0llmllmll0.','..0l0l0l0l0.','...000000...']};
const EGKIND={battle:['Battle','A fixed host blocks the way.'],elite:['Elite','Picked fighters: the hardest fights short of the boss, and a purse for beating them.'],rest:['Rest','A still place: every sword recovers 35% of its hitpoints.'],
 treasure:['Treasure','A cache left by the last company to come this way.'],event:['Event','Something waits by the path.'],boss:['Boss','The tyrant of this world. Kill it and the rift closes behind you.']};
function egMapOpen(){return!!(EGM.root&&EGM.root.classList.contains('on'))}
function egEsc(s){return typeof htmlEsc==='function'?htmlEsc(s):String(s)}
// the node positions on the picture: the rift at the left, four layers to the boss at the right
function egNodeXY(run,i){const n=run.nodes[i],cnt=run.nodes.filter(x=>x.L===n.L).length,W=EGM.W,H=EGM.H;return{x:Math.round(46+n.L*((W-70)/3.2)),y:Math.round(cnt===1?H*.64:n.j===0?H*.47:H*.81)}}
function egGateXY(){return{x:16,y:Math.round(EGM.H*.64)}}
/* ---- the picture ---- */
const EGSKY={ashen:['0','1','f','f','g','E'],hollow:['0','1','1','D','D','C'],glass:['1','Z','Z','z','6','F']},EGGRD={ashen:['a','i','f','0'],hollow:['1','2','D','0'],glass:['7','Z','4','0']};
function egHash(a,b){let h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263);h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296}
function egPaint(run,fr){const W=EGM.W,H=EGM.H,C=typeof waRGB==='function'?null:null,img=EGM.q.createImageData(W,H),o=new Uint32Array(img.data.buffer),rgb={};
 const col=k=>{let v=rgb[k];if(v===undefined){const n=parseInt((PAL[k]||'#000000').slice(1),16);v=rgb[k]=(0xff000000|(n&255)<<16|(n>>8&255)<<8|n>>16)>>>0}return v};
 const p=(x,y,k)=>{x|=0;y|=0;if(x>=0&&y>=0&&x<W&&y<H&&k&&k!=='.')o[y*W+x]=col(k)};
 const S=EGSKY[run.realm]||EGSKY.hollow,Gd=EGGRD[run.realm]||EGGRD.hollow,hz=Math.round(H*.34);
 // sky: dithered bands toward the horizon, a few stars or embers
 for(let y=0;y<hz;y++){const t=y/hz*(S.length-1),a=Math.floor(t),f=t-a;for(let x=0;x<W;x++){const d=((x&3)+(y&3)*4)/16;p(x,y,S[Math.min(S.length-1,a+(f>d?1:0))])}}
 for(let i=0;i<40;i++){const x=Math.floor(egHash(i,7)*W),y=Math.floor(egHash(i,9)*hz*.8),tw=(fr+i)%7===0;p(x,y,run.realm==='ashen'?(tw?'y':'E'):run.realm==='glass'?(tw?'r':'F'):(tw?'r':'C'))}
 // far ridge, then the ground: dithered dark, rubble, glints
 for(let x=0;x<W;x++){const r=Math.round(hz-3-5*Math.abs(Math.sin(x*.07+run.id))-3*egHash(x>>2,3));for(let y=r;y<hz;y++)p(x,y,y===r?Gd[1]:Gd[3])}
 for(let y=hz;y<H;y++)for(let x=0;x<W;x++){const h=egHash(x,y);p(x,y,h<.06?Gd[1]:h<.5-.3*(y-hz)/(H-hz)?Gd[0]:Gd[3]==='0'&&h>.97?Gd[2]:Gd[0]==='a'&&h>.93?'i':Gd[0])}
 for(let i=0;i<70;i++){const x=Math.floor(egHash(i,21)*W),y=hz+2+Math.floor(egHash(i,22)*(H-hz-3));p(x,y,Gd[2]);p(x+1,y,Gd[1])}
 if(run.realm==='ashen')for(let i=0;i<26;i++){const x=Math.floor(egHash(i,31)*W),y=hz+3+Math.floor(egHash(i,32)*(H-hz-5)),f=(fr+i)&3;p(x,y,f?'E':'y');if(f===1)p(x,y-1,'E')}
 if(run.realm==='glass')for(let i=0;i<22;i++){const x=Math.floor(egHash(i,41)*W),y=hz+4+Math.floor(egHash(i,42)*(H-hz-6));p(x,y,'F');p(x,y-1,'6');p(x,y-2,(fr+i)%5?'6':'r');p(x+1,y,'z')}
 if(run.realm==='hollow')for(let i=0;i<18;i++){const x=Math.floor(egHash(i,51)*W),y=hz+3+Math.floor(egHash(i,52)*(H-hz-5));p(x,y,'D');p(x+1,y,'C');p(x,y-1,'D')}
 // paths: dotted; lit (vellum) when the company may take them, walked (brass), else dark
 const nx=portalNext(run),line=(a,b,k1,k2,dash)=>{const dx=b.x-a.x,dy=b.y-a.y,L=Math.max(1,Math.hypot(dx,dy));for(let d=0;d<L;d++){if(dash&&(d%4)>1)continue;const x=a.x+dx*d/L,y=a.y+dy*d/L;p(x,y+1,'0');p(x,y,k1);if(k2)p(x,y-1,k2)}};
 const on=(i,t)=>run.path.includes(i)&&run.path.includes(t)&&run.path.indexOf(t)===run.path.indexOf(i)+1;
 run.nodes.forEach((n,i)=>{if(n.L!==0)return;const g=egGateXY(),b=egNodeXY(run,i);line(g,b,run.path[0]===i?'c':run.at<0?'l':'2',run.path[0]===i?'b':null,run.at<0&&run.path[0]!==i)});
 run.nodes.forEach((n,i)=>n.edges.forEach(t=>{const a=egNodeXY(run,i),b=egNodeXY(run,t);line(a,b,on(i,t)?'c':i===run.at&&nx.includes(t)?'l':'2',on(i,t)?'b':null,!on(i,t))}));
 // the rift at the gate
 {const g=egGateXY(),R=run.realm==='ashen'?['f','g','E','y']:run.realm==='glass'?['Z','z','F','r']:['D','C','C','r'];for(let y=-14;y<=0;y++){const w=Math.round(4*Math.sin(Math.PI*(y+14)/15));for(let x=-w;x<=w;x++){const a=Math.abs(x);p(g.x+x,g.y+y-2,a===w?'0':a===w-1?R[0]:((y+fr)&3)?R[1]:R[2])}}p(g.x,g.y-9,R[3])}
 // nodes: a plinth, the sprite (dimmed once done), a ring on the selected one
 const spr=(rows,x0,y0,dim)=>{for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++){let k=rows[y][x];if(k==='.')continue;if(dim&&k!=='0')k=(x+y)&1?'n':'o';p(x0+x,y0+y,k)}};
 run.nodes.forEach((n,i)=>{const c=egNodeXY(run,i),big=n.k==='boss';for(let x=-8;x<=8;x++){p(c.x+x,c.y+4,'0');if(Math.abs(x)<8){p(c.x+x,c.y+3,'n');p(c.x+x,c.y+2,Math.abs(x)<7?'m':'0')}}
  const rows=EGSPR[n.k]||EGSPR.battle;if(big){for(let y=0;y<12;y++)for(let x=0;x<12;x++){const k=rows[y][x];if(k==='.')continue;const kk=n.done&&k!=='0'?'o':k;p(c.x-12+x*2,c.y-22+y*2,kk);p(c.x-11+x*2,c.y-22+y*2,kk);p(c.x-12+x*2,c.y-21+y*2,kk);p(c.x-11+x*2,c.y-21+y*2,kk)}}
  else spr(rows,c.x-6,c.y-10,n.done);
  if(n.done){p(c.x+5,c.y-1,'0');p(c.x+6,c.y-2,'A');p(c.x+7,c.y-3,'A');p(c.x+4,c.y-2,'A');p(c.x+5,c.y-1,'A')}
  if(i===EGM.sel||(nx.includes(i)&&EGM.sel<0&&(fr&2))){const r=big?15:9,k=i===EGM.sel?'d':'l';for(let a=0;a<28;a++){const t=a/28*6.283;if(a%2)continue;p(c.x+Math.round(Math.cos(t)*r),c.y-4+Math.round(Math.sin(t)*r*.8),k)}}});
 // the company's banner where it stands
 {const c=run.at<0?egGateXY():egNodeXY(run,run.at),x=c.x+(run.at<0?7:9),y=c.y-14;for(let j=0;j<14;j++){p(x,y+j,'i');p(x+1,y+j,'0')}for(let j=0;j<5;j++)for(let i=0;i<6-(j===2?1:0);i++)p(x+2+i,y+j+((i+fr)&2?0:0),j===0||j===4?'0':i===5?'0':'c')}
 EGM.q.putImageData(img,0,0)}
function egSig(run){return[run.id,run.realm,run.at,run.path.join('.'),run.nodes.map(n=>n.done?1:0).join(''),EGM.sel,EGM.ev?1:0].join('|')}
function egDraw(force){const run=G&&G.portalRun;if(!run||!EGM.q)return;const fr=typeof reduced!=='undefined'&&reduced?0:Math.floor(egNow()/250)&255,sig=egSig(run)+'|'+fr;if(!force&&sig===EGM.sig)return;EGM.sig=sig;egPaint(run,fr)}
function egNow(){return typeof performance!=='undefined'&&performance.now?performance.now():Date.now()}
function egLoop(){EGM.raf=0;if(!egMapOpen())return;egDraw(false);if(!(typeof reduced!=='undefined'&&reduced))EGM.raf=requestAnimationFrame(egLoop)}
/* ---- the overlay ---- */
function egRoot(){if(EGM.root)return EGM.root;const r=document.createElement('div');r.id='egmap';r.setAttribute('role','dialog');r.setAttribute('aria-modal','true');r.setAttribute('aria-label','Portal world');
 r.innerHTML=`<div class="eg-view"><canvas id="egcv" width="${EGM.W}" height="${EGM.H}" aria-label="The paths of the portal world"></canvas></div><div class="eg-side"><div class="eg-head"><b class="pxh" id="egTitle"></b><button type="button" class="pxb sm" onclick="egRetreatAsk()">Retreat</button></div><div class="eg-rules" id="egRules"></div><div class="eg-card inset" id="egCard"></div><div class="eg-list" id="egList"></div></div>`;
 const app=typeof $==='function'&&$('app')||document.body,sh=typeof $==='function'?$('sheet'):null;if(sh&&sh.parentNode===app)app.insertBefore(r,sh);else app.appendChild(r);
 EGM.root=r;EGM.cv=r.querySelector('#egcv');EGM.q=EGM.cv&&EGM.cv.getContext?EGM.cv.getContext('2d'):null;
 if(EGM.cv&&EGM.cv.addEventListener)EGM.cv.addEventListener('pointerdown',e=>{const run=G&&G.portalRun;if(!run)return;const b=EGM.cv.getBoundingClientRect(),x=(e.clientX-b.left)/b.width*EGM.W,y=(e.clientY-b.top)/b.height*EGM.H;let best=-1,bd=14;
  run.nodes.forEach((n,i)=>{const c=egNodeXY(run,i),d=Math.hypot(c.x-x,c.y-4-y);if(d<bd){bd=d;best=i}});if(best>=0){EGM.sel=best;EGM.ev=null;egSide();egDraw(true)}});
 ['touchmove','wheel'].forEach(ev=>r.addEventListener(ev,e=>e.stopPropagation(),{passive:true}));return r}
function egCan(){try{return typeof window!=='undefined'&&typeof document!=='undefined'&&typeof HTMLCanvasElement!=='undefined'&&typeof ImageData!=='undefined'&&!!document.body}catch(e){return false}}
function egMapShow(){const run=G&&G.portalRun;if(!run||!egCan())return false;const r=egRoot();if(!EGM.q)return false;if(typeof closeSheet==='function'&&sheetOpen&&!egMapOpen())closeSheet(true);
 const nx=portalNext(run);if(EGM.sel<0||run.nodes[EGM.sel]&&run.nodes[EGM.sel].done)EGM.sel=nx.length?nx[0]:-1;EGM.ev=null;
 r.classList.add('on');sheetOpen=true;egSide();egDraw(true);if(!EGM.raf&&typeof requestAnimationFrame==='function')EGM.raf=requestAnimationFrame(egLoop);return true}
function egMapHide(){if(!EGM.root)return false;const was=egMapOpen();EGM.root.classList.remove('on');if(was)sheetOpen=false;return was}
function egFoeLine(roster){const by={};for(const e of roster){const k=e.id+'|'+(e.lvl||1)+'|'+(e.elite?1:0)+'|'+(e.name||'');by[k]=(by[k]||0)+(e.n==null?1:e.n)}
 return Object.keys(by).map(k=>{const [id,l,el,nm]=k.split('|'),n=by[k],d=EN[id];return nm?`<b>${egEsc(nm)}</b>`:`${n} ${el==='1'?'elite ':''}${(d?d.n:id).toLowerCase()}${n>1?'s':''} <i>(rank ${Math.round(+l)})</i>`}).join(', ')}
function egSide(){const run=G.portalRun,r=EGM.root;if(!run||!r)return;const E=ENDGAME[run.realm],nx=portalNext(run);
 r.querySelector('#egTitle').textContent=E.n;r.querySelector('#egRules').innerHTML=realmLines(run.realm).map(x=>`<p><b>${x[0]}</b> ${x[1]}</p>`).join('');
 const i=EGM.sel,n=run.nodes[i];let h='';
 if(EGM.ev&&n&&n.k==='event'){const V=E.event;h=`<p class="eg-ct"><b>${V.n}</b></p><p>${V.d}</p><div class="eg-btns"><button type="button" class="pxb pri" onclick="egEvent(1)">${V.a[0]}</button><button type="button" class="pxb" onclick="egEvent(0)">${V.b[0]}</button></div><p class="dim">${V.a[0]}: ${V.a[1]}</p>`}
 else if(n){const K=EGKIND[n.k],F=n.fight?E.fights[n.fight]:null,can=portalCan(i);
  h=`<p class="eg-ct"><span class="pxtag ${n.k==='boss'||n.k==='elite'?'bad':''}">${K[0]}</span><b>${F?egEsc(F.n):K[0]}</b></p><p>${K[1]}</p>`;
  if(F)h+=`<p class="eg-foes">${egFoeLine(F.roster)}${F.boss?`. <b>${egEsc(F.boss.name)}</b> fights in ${F.boss.phases.length+1} phases`:''}.</p>`;
  h+=n.done?'<p class="good">Done.</p>':can?`<button type="button" class="pxb pri eg-go" onclick="egGo(${i})">${n.k==='battle'||n.k==='elite'||n.k==='boss'?'March and fight':'Go there'}</button>`:'<p class="dim">Not on your path from here.</p>'}
 else h='<p>Choose a path.</p>';
 r.querySelector('#egCard').innerHTML=h;
 const hp=G.roster.reduce((a,m)=>a+m.hp,0),mx=G.roster.reduce((a,m)=>a+calc(m).hp,0);
 r.querySelector('#egList').innerHTML=`<p class="dim">The company: ${Math.round(100*hp/Math.max(1,mx))}% of its hitpoints. Wounds carry from fight to fight.</p>`+nx.map(j=>{const m=run.nodes[j],F=m.fight?E.fights[m.fight]:null;return`<button type="button" class="pxb sm eg-pick${j===i?' on':''}" onclick="egSel(${j})">${EGKIND[m.k][0]}${F?': '+egEsc(F.n):''}</button>`}).join('')}
function egSel(i){EGM.sel=i;EGM.ev=null;egSide();egDraw(true)}
function egGo(i){const r=portalGo(i);if(!r)return;if(r.kind==='fight'){if(typeof save==='function')save();return}
 if(r.kind==='rest'&&typeof toast==='function')toast('The company rests: hitpoints recovered');
 if(r.kind==='treasure'&&typeof toast==='function')toast(`Found ${r.crowns} crowns${r.item?' and '+ITEMS[r.item].n:''}`);
 if(r.kind==='event')EGM.ev=1;else{const nx=portalNext();EGM.sel=nx.length?nx[0]:-1}
 if(typeof save==='function')save();egSide();egDraw(true)}
function egEvent(take){portalEvent(!!take);EGM.ev=null;const nx=portalNext();EGM.sel=nx.length?nx[0]:-1;if(typeof toast==='function')toast(take?'It is done':'You walk on');if(typeof save==='function')save();egSide();egDraw(true)}
function egRetreatAsk(){const c=EGM.root&&EGM.root.querySelector('#egCard');if(!c)return;c.innerHTML=`<p class="eg-ct"><b>Retreat through the rift?</b></p><p>The way back burns: a tenth of your crowns spill and every sword loses 15% of its hitpoints. The rift stays open; the paths you cleared do not.</p><div class="eg-btns"><button type="button" class="pxb pri" onclick="egRetreat()">Retreat</button><button type="button" class="pxb" onclick="egSide()">Stay</button></div>`}
function egRetreat(){const r=portalRetreat();egMapHide();if(typeof setUI==='function')setUI();if(r&&typeof toast==='function')toast(`Back through the rift: ${r.crowns} crowns lost on the way`);if(typeof save==='function')save()}
/* ---- sheets ---- */
function egDanger(){return'<p class="eg-danger">Made for a company of veterans: twelve swords of level 11 to 13 in tier 4 and 5 steel, with their talents chosen well. Every fight here is fixed and will not shrink for a smaller or greener company.</p>'}
function egPortalSheet(id){const p=portalOf(id);if(!p)return;const E=ENDGAME[p.realm]||ENDGAME.hollow,B0=E.fights[E.boss],run=G.portalRun&&G.portalRun.id===id?G.portalRun:null,other=G.portalRun&&G.portalRun.id!==id;
 sheet(`<div class="eg-sheet eg-${p.realm}"><h2>A rift to ${E.n}</h2><p>${E.d}</p><div class="eg-rules">${realmLines(p.realm).map(x=>`<p><b>${x[0]}</b> ${x[1]}</p>`).join('')}</div>
 <p>Beyond it: five to seven places on branching paths (fights, elites, rest, treasure, strange things), and at the end <b>${egEsc(B0.boss.name)}</b>, ${egEsc(B0.boss.title)}. Wounds carry from fight to fight. Retreat costs a tenth of your crowns.</p>${egDanger()}
 ${run?'<p class="good">Your company has a path open in there.</p>':''}${other?'<p class="bad">Another rift holds your path: leaving it there will lose it.</p>':''}
 <div class="row"><button class="pri" style="flex:1" onclick="closeSheet(true);${other?'G.portalRun=null;':''}enterRift(${id})">${run?'Return':'Step through'}</button><button onclick="closeSheet()">Not yet</button></div></div>`)}
function dungeonSheet(id){const d=dgnOf(id);if(!d)return;const D=DUNGEONS[d.k],L=(D.loot||[]).filter(k=>ITEMS[k]).map(k=>`<b class="fmd-n">${egEsc(ITEMS[k].n)}</b>`);
 if(d.cleared){sheet(`<div class="eg-sheet"><h2>${D.n}</h2><p>The halls lie silent. ${egEsc(D.fights[D.fights.length-1].boss.name)} is dead; nothing here will rise again.</p><button class="pri" onclick="closeSheet()">Move on</button></div>`);return}
 const F=D.fights.map((f,i)=>`<li class="${i<d.stage?'done':''}"><b>${f.n}</b>${i<d.stage?' <em class="good">cleared</em>':''}<br><span class="dim">${f.d} ${egFoeLine(f.roster)}.</span></li>`).join('');
 sheet(`<div class="eg-sheet"><h2>${D.n}</h2><p>${D.d}</p><ol class="eg-fights">${F}</ol><p>${D.fights.length} fights, one after another, wounds and all. You may fall back between them: the halls you cleared stay clear.</p>${L.length?`<p>Its lord guards one of: ${L.join(', ')}.</p>`:''}${egDanger()}
 <div class="row"><button class="pri" style="flex:1" onclick="dungeonEnter(${id})">${d.stage?'Go back in':'Enter'}</button><button onclick="closeSheet()">Not yet</button></div></div>`)}
function egItem(id){return id&&ITEMS[id]?`<p class="eg-loot">${typeof brItem==='function'?brItem(id):`<b class="fmd-n">${egEsc(ITEMS[id].n)}</b>`}</p>`:''}
function egAfterSheet(out){const k=out.kind;let h='';
 if(k==='portalNext'){h=`<h2>The path is clear</h2><p>${out.node==='elite'?'The picked fighters are down. Their purse is yours: 350 crowns.':'The host is broken.'} The company catches its breath where it stands; there is no healing between fights but the rest you find.</p><button class="pri" onclick="closeSheet(true);egMapShow()">Back to the paths</button>`}
 else if(k==='portalLost')h=`<h2>Thrown out</h2><p>The rift spits the company back into the world, bleeding. The tear stays open, and the paths beyond it close.</p><button class="pri" onclick="closeSheet()">Return to the world</button>`;
 else if(k==='portalDone'){h=`<h2>The rift collapses</h2><p>${out.boss?egEsc(out.boss)+' falls':'The tyrant falls'} and the tear in the world seals behind you. You carry out <span class="coin">${out.pay} crowns</span> of strange gold and a rift-forged blade.</p>${egItem(out.legend)}${out.deeds&&out.deeds.length?`<p class="good">${out.deeds.length} swords stood to the end: a deed of legend.</p>`:''}${out.ended?'<p class="good">The last of the three rifts is closed. The Sundering is over, though lesser rifts may still open.</p>':''}<button class="pri" onclick="closeSheet()">Return to the world</button>`}
 else if(k==='dgnNext'){const d=dgnOf(out.id),D=d&&DUNGEONS[d.k],F=D&&D.fights[d.stage];h=`<h2>${egEsc(out.n)}</h2><p>Fight ${out.stage} of ${out.of} is won.</p>${F?`<p>Ahead: <b>${F.n}</b>. ${F.d}</p>`:''}<p class="dim">Wounds carry on if you press on now.</p><div class="row"><button class="pri" style="flex:1" onclick="closeSheet(true);dungeonEnter(${out.id})">Press on</button><button onclick="closeSheet()">Fall back</button></div>`}
 else if(k==='dgnLost')h=`<h2>Beaten back</h2><p>The company falls back out of ${egEsc(out.n)}. The halls already cleared stay clear.</p><button class="pri" onclick="closeSheet()">Return to the world</button>`;
 else if(k==='dgnDone')h=`<h2>${egEsc(out.n)} is cleared</h2><p>${out.boss?egEsc(out.boss)+' is dead. ':''}You carry out <span class="coin">${out.crowns} crowns</span>.</p>${egItem(out.legend)}${out.deeds&&out.deeds.length?`<p class="good">${out.deeds.length} swords cleared it: a deed of legend.</p>`:''}<button class="pri" onclick="closeSheet()">Return to the world</button>`;
 if(h&&typeof sheet==='function')sheet(`<div class="eg-sheet">${h}</div>`)}
