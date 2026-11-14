/* ================= GAME ================= */
// Rules: rolls a world and a starting company. No UI. Returns G.
function createCampaign(){let best=null;
 for(let tries=0;tries<60;tries++){const seed=(rnd()*1e9)|0,w=genWorld(seed);   // the generator almost always gives 11 or 12 towns on a broad mainland; reroll the rare cramped world
  if(!best||w.towns.length>best.towns.length||(w.towns.length===best.towns.length&&w.size>best.size))best=w;
  if(w.towns.length>=10&&w.size>=1500)break}
 W=best;G={seed:W.seed,nid:1,towns:placeTowns()};G.sites=worldSites(W,G.nid);G.nid+=G.sites.length;
 Object.assign(G,{v:SAVEVER,day:1,hour:8,crowns:1200,food:50,tools:20,renown:0,roster:[],stash:['spear','buckler'],parties:[],portals:[],contract:null,crisis:null,crisisDay:18,dun:null,grace:4,healAcc:0,zoom:1,path:[],route:[],moving:false,dest:null,town:null,note:null,fog:null,
  weather:{kind:'clear',t:0,dur:10},p:{x:G.towns[0].x,y:G.towns[0].y+.65*TS}});
 if(!okAt(G.p.x,G.p.y))G.p.y=G.towns[0].y;fogStart();
 ['sellsword','squire','hunter','acolyte'].forEach(b=>{const m=newMerc(b);m.field=true;G.roster.push(m)});
 G.towns.forEach(stockTown);for(let i=0;i<7;i++)spawnParty();return G}
// newGame(): start a fresh campaign. If the browser holds a save this version cannot read (newer or damaged),
// it explains that first instead of silently replacing it; newGame(true) goes ahead (a copy of the old data is kept).
function newGame(force){if(!force){const st=saveStatus();if(st.state==='newer'||st.state==='corrupt'){saveNotice(st);return}}
 else backupUnreadableSave();
 createCampaign();renderWorldImg();mode='world';setUI();const mage=G.roster[3];
 sheet(`<h2>A company is raised</h2><p>Four swords, ${G.crowns} crowns, and a banner nobody has heard of. ${G.towns[0].name} is behind you.</p>
 <p class="dim">Tap the map to march; time only passes while you move. Roads are quick, rivers are slow except at a bridge. Tap a town to enter it and take contracts. Banners on the move are hostile bands. Every sword starts with one perk point: open Company to spend it, and awaken ${RESN[mercRes(G.roster[1])||'aura']} or ${RESN[mercRes(mage)||'chi']} in those who carry the gift.</p>
 <p class="dim">In battle, tap a lit tile to move, tap a foe to attack, or pick an ability first. High ground helps you hit. Drag to pan.</p><button class="pri" onclick="closeSheet()">March</button>`);save()}
function saveNotice(st){const playing=mode==='world'&&G&&G.roster&&G.roster.length;
 sheet((st.state==='newer'
  ?`<h2>A save from a newer version</h2><p>This browser holds a company saved by a newer version of Wyrdmarch (save format ${st.v}; this version reads up to ${SAVEVER}). It cannot be opened here.</p><p class="dim">Reload the latest version of the game to continue that company. Raising a new company now replaces it; a copy is set aside.</p>`
  :`<h2>The save could not be read</h2><p>The company saved in this browser is damaged and cannot be opened${st.why?' ('+st.why+')':''}.</p><p class="dim">Raising a new company replaces it; a copy of the damaged data is set aside.</p>`)
  +`<div class="row" style="margin-top:14px">${playing?'<button onclick="closeSheet(true)">Keep playing</button>':''}<button class="pri" style="flex:1" onclick="newGame(true)">Raise a new company</button></div>`)}
function continueGame(){const r=readSave();if(r.state==='none'){newGame();return}if(r.state!=='ok'){saveNotice(r);return}
 G=r.g;setRngState(G.rng);W=genWorld(G.seed);
 if(!okAt(G.p.x,G.p.y)){const t=G.towns.find(t=>okAt(t.x,t.y))||G.towns[0];G.p={x:t.x,y:t.y}}
 if(!fogLoad(G.fog))fogStart();else fogReveal();
 if(!G.parties.length)for(let i=0;i<7;i++)spawnParty();          // a company that has just marched in from an older save meets a land with bands in it
 renderWorldImg();mode='world';setUI();closeSheet(true)}
