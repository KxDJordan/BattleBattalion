/* ================= GAME ================= */
// Rules: rolls a world and a starting company. No UI. Returns G.
// opts = {name, wsize, banner, origin (an ORIGINS key, default 'free')} from the new-company setup; absent fields take the defaults (a small world, the brass and verdigris banner).
function createCampaign(opts){opts=opts||{};const wk=setWorldSize(opts.wsize),AK=worldK(),NT=WORLDSZ[wk].towns;let best=null;
 for(let tries=0;tries<60;tries++){const seed=(rnd()*1e9)|0,w=genWorld(seed);   // the generator almost always gives its full count of towns on a broad mainland; reroll the rare cramped world
  if(!best||w.towns.length>best.towns.length||(w.towns.length===best.towns.length&&w.size>best.size))best=w;
  if(w.towns.length>=NT-2&&w.size>=1500*AK)break}
 W=best;G={seed:W.seed,nid:1,towns:placeTowns()};G.sites=worldSites(W,G.nid);G.nid+=G.sites.length;
 const name=cleanName(opts.name);
 Object.assign(G,{v:SAVEVER,name,wsize:wk,banner:bannerFix(Object.assign({},opts.banner||{},{name}),name),day:1,hour:8,crowns:1200,food:50,tools:20,renown:0,roster:[],stash:['spear','buckler'],parties:[],portals:[],contract:null,crisis:null,crisisDay:18,dun:null,grace:4,healAcc:0,zoom:1,path:[],route:[],moving:false,dest:null,town:null,note:null,fog:null,
  weather:{kind:'clear',t:0,dur:10},p:{x:G.towns[0].x,y:G.towns[0].y+.65*TS}});
 if(!okAt(G.p.x,G.p.y))G.p.y=G.towns[0].y;fogStart();
 ['sellsword','squire','hunter','acolyte'].forEach(b=>{const m=newMerc(b);m.field=true;G.roster.push(m)});
 G.parts={};if(typeof companyNew==='function')companyNew(G);else{G.retinue=[];G.amb={cur:null,done:[],offered:[]}}   // renown tiers, ambitions, the retinue (14-company.js)
 if(typeof factionsInit==='function')factionsInit(G);   // houses, town owners, reputation (15-factions.js): before the origin, which touches reputation
 G.evt=typeof evtNew==='function'?evtNew():{seen:{},flags:{}};if(typeof originApply==='function')originApply(G,opts.origin);else G.origin='free';   // 17-events.js
 G.towns.forEach(stockTown);for(let i=0;i<7;i++)spawnParty();return G}
// newGame(): start a fresh campaign. If the browser holds a save this version cannot read (newer or damaged),
// it explains that first instead of silently replacing it; newGame(true) goes ahead (a copy of the old data is kept).
// newGame(force, opts): opts as createCampaign. Without opts it raises the default company at once (tests, "Raise a new company" after a wipe);
// the title's New company button opens newCompanySetup() (90-shell.js) instead, which calls newGame(false, opts).
let _ngOpts=null;
function newGame(force,opts){if(opts)_ngOpts=opts;if(!force){const st=saveStatus();if(st.state==='newer'||st.state==='corrupt'){saveNotice(st);return}}
 else backupUnreadableSave();
 const o=_ngOpts;_ngOpts=null;createCampaign(o);renderWorldImg();mode='world';setUI();const mage=G.roster[3],nm=htmlEsc(G.name);
 const O=typeof ORIGINS==='object'&&ORIGINS[G.origin]&&G.origin!=='free'?ORIGINS[G.origin]:null;
 const solo=typeof isSolo==='function'&&isSolo(),nSw=G.roster.length;
 sheet(`<h2>${nm} is raised</h2><p>${O?htmlEsc(O.d)+' ':''}${solo?'One sword':nSw===4?'Four swords':nSw+' swords'}, ${G.crowns} crowns, and a banner nobody has heard of yet. ${G.towns[0].name} is behind you; ${G.towns.length-1} more towns lie in this ${WORLDSZ[G.wsize].name.toLowerCase()} land.</p>${O?`<p class="ev-orule"><b>${htmlEsc(O.n)}.</b> ${htmlEsc(O.rule)}</p>`:''}
 <p class="dim">Tap the map to march; time only passes while you move. Roads are quick, rivers are slow except at a bridge. Tap a town to enter it and take contracts. Banners on the move are hostile bands. Pick a company ambition (in any town, or the Ambitions button) for renown and rewards. ${solo?`The slayer starts at level ${G.roster[0].lvl} with ${G.roster[0].pp} perk points: open Company to spend them, and take a Monster hunter perk for the beasts you mean to hunt (kills count from the first one).`:`Every sword starts with one perk point: open Company to spend it, and awaken ${RESN[mercRes(G.roster[1])||'aura']} or ${RESN[mercRes(mage)||'chi']} in those who carry the gift.`}</p>
 <p class="dim">In battle, tap a lit tile to move, tap a foe to attack, or pick an ability first. High ground helps you hit. Drag to pan.</p><button class="pri" onclick="closeSheet()">March</button>`);save()}
function saveNotice(st){const playing=mode==='world'&&G&&G.roster&&G.roster.length;
 sheet((st.state==='newer'
  ?`<h2>A save from a newer version</h2><p>This browser holds a company saved by a newer version of Wyrdmarch (save format ${st.v}; this version reads up to ${SAVEVER}). It cannot be opened here.</p><p class="dim">Reload the latest version of the game to continue that company. Raising a new company now replaces it; a copy is set aside.</p>`
  :`<h2>The save could not be read</h2><p>The company saved in this browser is damaged and cannot be opened${st.why?' ('+st.why+')':''}.</p><p class="dim">Raising a new company replaces it; a copy of the damaged data is set aside.</p>`)
  +`<div class="row" style="margin-top:14px">${playing?'<button onclick="closeSheet(true)">Keep playing</button>':''}<button class="pri" style="flex:1" onclick="newGame(true)">Raise a new company</button></div>`)}
function continueGame(){const r=readSave();if(r.state==='none'){newGame();return}if(r.state!=='ok'){saveNotice(r);return}
 G=r.g;if(typeof companyRepair==='function')companyRepair(G);if(typeof evtRepair==='function')evtRepair(G);setWorldSize(G.wsize);setRngState(G.rng);W=genWorld(G.seed);
 if(!okAt(G.p.x,G.p.y)){const t=G.towns.find(t=>okAt(t.x,t.y))||G.towns[0];G.p={x:t.x,y:t.y}}
 if(!fogLoad(G.fog))fogStart();else fogReveal();
 if(!G.parties.length)for(let i=0;i<7;i++)spawnParty();          // a company that has just marched in from an older save meets a land with bands in it
 renderWorldImg();mode='world';setUI();closeSheet(true)}
