/* ================= THE EAST AND THE EASTERN WAR (phase 8a, east agent; CONTRACT.md "East") =================
   The east-most part of every map is an Eastern realm: its own towns (t.east = 1, owned by the faction 'east'), its own art on the
   world map (77-east-art.js), in the town view (51-townview.js) and on the battle board (71-tiles.js), its own soldiers (EN below,
   sprites in 73-units.js) and its own gear (ITEMS below: katana, nodachi, wakizashi, tanto, naginata, yari, yumi, kabuto, menpo,
   lamellar do, o-yoroi; icons are drawn from the same painters as the sprites).

   HOOKS the other owners add (all typeof-guarded; see the east agent's report):
     40-world.js  genWorld: eastGen(w) on the returned world.  worldDay: news.push(...eastDay()) after rvDay.  worldBattleEnd: eastBattleEnd(s,win) at the end.
                  showNote: n==='east'||n==='eastend' -> eastNoteSheet(n).  wsSiegeEnd: s.by==='east' -> return null.
     15-factions  factionsInit(g): eastInit(g) at the end.  humanFact(f): || (f==='east' && G.east).
     20-state.js  repairSave: eastRepair(g).   50-towns.js stockTown: t.stock=eastStock(t,t.stock,maxT); marketPool keeps east:1 items to eastern towns.
     70-render.js eastern towns / hosts / world props through drawEastPx (77-east-art.js).  60-battle-core: B.east = isEast(G.p.x,G.p.y) at startBattle.
   World:    eastGen(w)        marks the region on a generated world: w.east (Uint8Array WN*WN tile mask), w.eastT [town indices];
                               renames those towns with eastern names (new worlds only: a save keeps its stored names). Pure, cached.
             isEast(x,y)       world units (px): is the point inside the Eastern region?   isEastT(tx,ty) the same in tiles.
             townEast(i)       is town i an Eastern town (by region; a town the East took in the war is owned by 'east', not eastern)?
   Faction:  FACT.east         the Shogunate's soldiers (never roams as a monster band: spawn gate 2); FACT.east.east = 1.
             eastInit(G)       sets up G.east = {v, n, short, lord, c1, c2, emblem, war}; flags t.east and gives those towns to 'east';
                               G.rep.east (standing via repOf / repTier / repGain('east', ...)). Idempotent; seed-only (no rnd draw).
             eastRepair(g)     validates G.east in a loaded save (old saves: eastInit). eastHouse() -> {id:'east', n, short, c1, c2, emblem}
             eastBanner()      -> {name, c1, c2, emblem} for bannerHTML / the world map.
   War:      eastDay()         daily (worldDay): the Eastern War's trigger, its hosts, sieges, the houses' answer, contracts, the ending.
             eastStrength()    the company strength the trigger reads (companyPower of the fielded mercs + renown / 8).
             eastWarSheet()    the sheet that explains the war and asks the company to pick a side (G.note 'east' also opens it).
             eastWarChoose(s)  s 'houses' | 'east' | 'out' (acting).   eastWarStatus() -> one line or ''.   eastMarks() -> map markers.
             eastBattleEnd(src,win)  a battle's outcome as the war sees it (contracts, hosts); safe to call more than once.
   G.east.war = null | {stage:'war'|'over', day0, side:null|'houses'|'east'|'out', wave, waves, next, land:{x,y}, hosts:[party ids],
             sieges:[{i, host, end}], taken:[{i, prev, day}], lost:[town ids], ctr:[contract ids], outcome:null|'houses'|'east', end:null|day}
   Parties of the war: {f:'east', goal:'raid' -> 'patrol' (siege), ew:1}. A host that reaches its town besieges it (situation 'siege',
   by 'east'); when the siege runs out the town falls or the host breaks. Breaking it on the field (worldBattleEnd -> townSiegeEnd) frees the town. */

/* ---- tuning ---- */
const EW={minDay:30,thr:120,lateDay:45,lateThr:70,hardDay:60,waves:3,gap:7,len:[5,7],cap:36,mult:[.95,1.1,1.25],hosts:[2,2,3],
 pay:{houses:1500,east:2600},renown:{win:60,lose:20,out:15},rep:{side:-45,ally:25,houseSide:-30}};
const EASTN={roots:['Akane','Kurogane','Hoshino','Shirakawa','Tsukiyama','Kagero','Asahi','Mizuchi'],
 lords:['Lord Akechi Tadamasa','Lady Hoshino Kiyo','Lord Kurogane Ietsugu','Lord Shirakawa Munenori','Lady Tsukiyama Sen','Lord Asahi Nagahide'],
 towns:['Kiyomizu','Hanamura','Tsurugaoka','Matsuzaki','Kagetora','Shiomi','Amagiri','Yukimura','Hotaru-ga-hara','Sakurazaka','Kawaguchi','Ishibashi']};

/* ---- the Shogunate's soldiers ---- */
Object.assign(EN,{
 ashi:{n:'Ashigaru spearman',hp:50,arm:45,helm:25,ms:52,md:8,rd:10,init:100,d:[22,34],w:'suyari',xp:110,role:'line',brv:35,flee:.25,east:1,abs:['spearwall','thrust']},
 ashiy:{n:'Ashigaru archer',hp:44,arm:35,helm:28,ms:42,rs:56,md:5,rd:8,init:105,d:[22,36],w:'hankyu',rng:6,xp:120,role:'sniper',brv:30,flee:.35,east:1,abs:['quick'],side:'tanto'},
 shinobi:{n:'Shinobi',hp:55,arm:25,helm:12,ms:62,md:20,rd:24,init:150,ap:11,d:[24,36],w:'wakizashi',xp:220,role:'flanker',brv:45,flee:.2,dive:1,east:1,abs:['footwork','slash']},
 sohei:{n:'Warrior monk',hp:85,arm:50,helm:20,ms:60,md:10,rd:10,init:104,d:[40,58],w:'naginata',xp:260,role:'line',brv:88,east:1,abs:['nsweep','hook']},
 onna:{n:'Onna-musha',hp:75,arm:95,helm:65,ms:62,md:14,rd:12,init:116,d:[38,56],w:'naginata',xp:280,role:'line',brv:72,east:1,abs:['nsweep','trip']},
 samurai:{n:'Samurai',hp:86,arm:110,helm:85,ms:62,md:12,rd:12,init:108,d:[34,48],w:'katana',xp:300,role:'line',brv:72,east:1,abs:['iaido','slash','riposte']},
 taisho:{n:'Samurai general',hp:140,arm:180,helm:140,ms:72,md:16,rd:14,init:112,d:[48,68],w:'katana2',xp:600,role:'caster',brv:90,lead:1,banner:1,max:1,sub:'samurai',east:1,abs:['brally','iaido','riposte']}
});
const EASTLOOT=['tanto','kunai','wakizashi','katana','suyari','jumonji','hankyu','naginata','jingasa','hachigane','kabuto','tatami','do','kesa'];
FACT.east={n:'The Shogunate',g:'K',col:'#c4493f',skin:'#f0c8a0',tier:'early',spawn:{gate:2,d0:0,d1:0},east:1,biomes:null,lair:'Break an eastern war camp',
 units:[['ashi',20],['ashi',20],['ashiy',24],['shinobi',40],['sohei',48],['onna',60],['samurai',74],['taisho',120]],rank:[.5,.85,.3,19],loot:EASTLOOT};

/* ---- eastern gear: every family across the tiers; east:1 marks it for the eastern markets ----
   Skills: katana -> the sword tree (slash, riposte) plus Iaijutsu; nodachi -> greatsword; wakizashi / tanto -> sword / dagger;
   naginata -> polearm (hook) plus Naginata sweep; yari -> spear (thrust, spear wall; the omi yari impales at reach 2); yumi -> bow. */
Object.assign(ITEMS,{
 tanto:{k:'w',n:'Tanto',wt:'dagger',d:[16,26],ap:3,fat:4,rng:1,ign:.3,hit:5,price:85,tier:1},
 kunai:{k:'w',n:'Kunai',wt:'dagger',d:[16,26],ap:3,fat:4,rng:1,ign:.3,price:150,tier:2},   // a shinobi's tool: stabs, and throws on a cord (kthrow)
 yoroidoshi:{k:'w',n:'Yoroi-doshi',wt:'dagger',d:[26,40],ap:3,fat:5,rng:1,ign:.6,hit:10,price:1250,tier:4},
 wakizashi:{k:'w',n:'Wakizashi',wt:'sword',d:[24,34],ap:4,fat:6,rng:1,ign:.25,hit:10,price:240,tier:2},
 katana:{k:'w',n:'Katana',wt:'sword',d:[36,50],ap:4,fat:9,rng:1,ign:.25,hit:10,price:820,tier:3},
 katana2:{k:'w',n:'Folded-steel katana',wt:'sword',d:[44,60],ap:4,fat:9,rng:1,ign:.3,hit:10,price:1900,tier:4},
 katana3:{k:'w',n:'Moon-temper katana',wt:'sword',d:[52,70],ap:4,fat:9,rng:1,ign:.3,hit:15,price:3400,tier:5},
 nodachi:{k:'w',n:'Nodachi',wt:'greatsword',two:1,d:[50,72],ap:6,fat:16,rng:2,ign:.25,hit:10,price:1300,tier:4},
 odachi:{k:'w',n:'Odachi',wt:'greatsword',two:1,d:[64,90],ap:6,fat:18,rng:2,ign:.3,hit:10,price:3200,tier:5},
 naginata:{k:'w',n:'Naginata',wt:'polearm',two:1,d:[40,58],ap:6,fat:14,rng:2,ign:.3,hit:5,price:640,tier:3},
 naginata2:{k:'w',n:'Temple naginata',wt:'polearm',two:1,d:[54,76],ap:6,fat:15,rng:2,ign:.35,hit:5,price:2000,tier:5},
 suyari:{k:'w',n:'Su yari',wt:'spear',d:[24,34],ap:4,fat:9,rng:1,ign:.2,hit:20,price:130,tier:1},
 jumonji:{k:'w',n:'Jumonji yari',wt:'spear',d:[36,48],ap:4,fat:11,rng:1,ign:.3,hit:20,price:900,tier:3},
 omiyari:{k:'w',n:'Omi yari',wt:'spear',two:1,d:[54,76],ap:6,fat:16,rng:2,ign:.3,hit:5,price:1500,tier:4},
 bo:{k:'w',n:'Bo staff',wt:'staff',two:1,d:[22,36],ap:4,fat:7,rng:1,ign:.25,spell:.1,price:120,tier:2},
 hankyu:{k:'w',n:'Hankyu',wt:'bow',two:1,d:[26,42],ap:4,fat:9,rng:6,ign:.25,hit:5,price:240,tier:2,shot:'arrow'},
 yumi:{k:'w',n:'Yumi',wt:'bow',two:1,d:[40,60],ap:5,fat:12,rng:8,ign:.3,price:980,tier:4,shot:'arrow'},
 daikyu:{k:'w',n:'Lacquered daikyu',wt:'bow',two:1,d:[50,74],ap:5,fat:13,rng:8,ign:.35,hit:10,price:2600,tier:5,shot:'arrow'},
 jingasa:{k:'h',n:'Jingasa',arm:35,fat:1,price:50,tier:1},
 hachigane:{k:'h',n:'Hachigane',arm:45,fat:1,price:90,tier:1},
 kabuto:{k:'h',n:'Suji kabuto',arm:120,fat:6,price:700,tier:3},
 menpo:{k:'h',n:'Kabuto and menpo',arm:185,fat:10,price:1600,tier:4},
 kawari:{k:'h',n:'Kawari kabuto',arm:250,fat:14,price:3300,tier:5},
 kesa:{k:'a',n:'Monk\'s kesa',arm:55,fat:2,price:240,tier:2},
 tatami:{k:'a',n:'Tatami do',arm:85,fat:8,price:300,tier:2},
 do:{k:'a',n:'Lamellar do',arm:150,fat:15,price:1050,tier:3},
 domaru:{k:'a',n:'Do-maru',arm:210,fat:22,price:1900,tier:4},
 oyoroi:{k:'a',n:'O-yoroi',arm:300,fat:33,price:4600,tier:5}
});
const EASTITEMS=['tanto','kunai','yoroidoshi','wakizashi','katana','katana2','katana3','nodachi','odachi','naginata','naginata2','suyari','jumonji','omiyari','hankyu','yumi','daikyu','bo','jingasa','hachigane','kabuto','menpo','kawari','kesa','tatami','do','domaru','oyoroi'];
/* the two eastern weapon skills (executed by the common rules: once, mult, hit, bleed, tgt 'aoe', status) */
Object.assign(AB,{
 iaido:{n:'Iaijutsu',ap:4,fat:16,tgt:'enemy',wpn:1,needs:['sword','greatsword'],fresh:1,mult:1.4,hit:15,bleed:2,fx:'slash',d:'The draw-cut: the blade leaves the scabbard and strikes in one motion. Only as the first action of a turn: 140% damage, +15 to hit, and a wound that reaches flesh bleeds for 2 turns.'},
 nsweep:{n:'Naginata sweep',ap:6,fat:22,tgt:'aoe',wpn:1,needs:'polearm',two:1,mult:.8,hit:5,status:{daze:1},fx:'spin',d:'A wide, low arc of the naginata: strike every adjacent foe at 80% damage, +5 to hit, and leave each one hit dazed.'}
});
{const SK={katana:['slash','riposte','iaido'],katana2:['slash','riposte','iaido'],katana3:['slash','riposte','iaido'],wakizashi:['slash','riposte'],nodachi:['halfsword','gswing','iaido'],odachi:['halfsword','gswing','iaido'],
  naginata:['hook','nsweep'],naginata2:['hook','nsweep'],suyari:['thrust','spearwall'],jumonji:['thrust','spearwall'],omiyari:['impale'],tanto:['puncture'],kunai:['puncture','kthrow'],yoroidoshi:['puncture'],hankyu:['quick'],yumi:['quick'],daikyu:['quick']};
 for(const id of EASTITEMS){const i=ITEMS[id];i.east=1;i.look=i.look||id;if(i.k==='w')i.sk=SK[id]||(typeof WSK==='object'&&WSK[i.wt])||[]}}

/* ---- region ---- */
const EASTC=new Map();   // seed|WN -> {mask, towns}
function eastNum(x,d){return typeof x==='number'&&isFinite(x)?x:d}
function eastRegion(w){if(!w||!w.tiles||!Array.isArray(w.towns))return null;const key=(w.seed|0)+'|'+WN+'|'+w.towns.length+(typeof WSHK==='string'?'|'+WSHK+'|'+WBMK:'');let R=EASTC.get(key);if(R)return R;
 const T=w.towns,nT=T.length,N=WN*WN,mask=new Uint8Array(N);
 const k=nT<2?0:Math.max(1,Math.min(nT-1,Math.round(nT*.2)));
 const order=T.map((t,i)=>i).filter(i=>i>0).sort((a,b)=>T[b].x-T[a].x||a-b),east=order.slice(0,k).sort((a,b)=>a-b),isE=new Uint8Array(nT);for(const i of east)isE[i]=1;
 let minX=1e9;for(const i of east)minX=Math.min(minX,T[i].x/TS);
 if(east.length)for(let y=0;y<WN;y++)for(let x=0;x<WN;x++){const i=y*WN+x;if(!w.tiles[i]||x<minX-4)continue;let b=-1,bd=1e18;const px=(x+.5)*TS,py=(y+.5)*TS;
  for(let j=0;j<nT;j++){const d=(T[j].x-px)*(T[j].x-px)+(T[j].y-py)*(T[j].y-py);if(d<bd){bd=d;b=j}}if(b>=0&&isE[b])mask[i]=1}
 R={mask,towns:east,minX};EASTC.set(key,R);return R}
function eastGen(w){const R=eastRegion(w);if(!R)return w;w.east=R.mask;w.eastT=R.towns.slice();
 // new worlds: the eastern towns take eastern names (deterministic from the seed; the cached town objects are renamed once)
 const r=mulberry(((w.seed|0)^0x2e57a11)>>>0),names=EASTN.towns.slice();for(let i=names.length-1;i>0;i--){const j=Math.floor(r()*(i+1)),t=names[i];names[i]=names[j];names[j]=t}
 R.towns.forEach((ti,k)=>{const t=w.towns[ti];if(t&&!t.eastN){t.eastN=1;t.name=names[k%names.length]}t.east=1});return w}
function eastW(){if(typeof W!=='undefined'&&W&&W.tiles){if(!W.east)eastGen(W);return W}return null}
function isEastT(tx,ty){const w=eastW();tx|=0;ty|=0;if(!w||!w.east||tx<0||ty<0||tx>=WN||ty>=WN)return false;const m=w.east,i=ty*WN+tx;if(m[i]===1)return true;if(w.tiles[i])return false;   // a shore or river tile counts with the land beside it
 return(tx>0&&m[i-1]===1)||(tx<WN-1&&m[i+1]===1)||(ty>0&&m[i-WN]===1)||(ty<WN-1&&m[i+WN]===1)}
function isEast(x,y){return isEastT(Math.floor(x/TS),Math.floor(y/TS))}
function townEast(i){const t=typeof G!=='undefined'&&G&&G.towns&&G.towns[i];return!!(t&&t.east)}
function eastTowns(){const L=[];if(G&&G.towns)G.towns.forEach((t,i)=>{if(t.east)L.push(i)});return L}

/* ---- the faction ---- */
function eastInit(g){g=g||(typeof G!=='undefined'?G:null);if(!g||!Array.isArray(g.towns)||g.towns.length<3)return g;
 const w=typeof W!=='undefined'&&W&&(W.seed|0)===(g.seed|0)&&W.tiles?W:genWorld(g.seed),R=eastRegion(w);if(!R)return g;if(!w.east)eastGen(w);
 const r=mulberry(((g.seed|0)^0x7ea57)>>>0),T=g.towns,fresh=!eastOk(g.east);
 if(fresh){const root=EASTN.roots[Math.floor(r()*EASTN.roots.length)],lord=EASTN.lords[Math.floor(r()*EASTN.lords.length)];
  g.east={v:1,n:'The '+root+' Shogunate',short:root,lord,c1:'l',c2:'g',emblem:'sun',war:null}}
 // the towns of the region (matched by position: W.towns and G.towns are the same list for every save of this seed)
 const ids=[];for(const ti of R.towns){if(ti>0&&ti<T.length&&Math.abs(T[ti].x-w.towns[ti].x)<1&&Math.abs(T[ti].y-w.towns[ti].y)<1)ids.push(ti)}
 for(const ti of ids){const t=T[ti];t.east=1;if(t.own!=='east'){if(typeof t.eastPrev0!=='string')t.eastPrev0=typeof t.own==='string'?t.own:'free';t.own='east'}}   // the region's towns are always the Shogunate's
 // a house whose seat fell inside the region moves it to its largest other town (or the nearest free one)
 if(Array.isArray(g.houses))for(const h of g.houses){if(!T[h.seat]||!T[h.seat].east)continue;let best=-1;
  T.forEach((t,i)=>{if(t.east||g.houses.some(o=>o.seat===i))return;if(t.own===h.id&&(best<0||t.size>T[best].size))best=i});
  if(best<0){let bd=1e18;T.forEach((t,i)=>{if(t.east||i===0||g.houses.some(o=>o.seat===i))return;const d=Math.hypot(t.x-T[h.seat].x,t.y-T[h.seat].y);if(d<bd){bd=d;best=i}})}
  if(best>=0){h.seat=best;T[best].own=h.id}}
 if(!g.rep||typeof g.rep!=='object')g.rep={};if(!eastNumOk(g.rep.east))g.rep.east=0;
 return g}
function eastNumOk(x){return typeof x==='number'&&isFinite(x)}
function eastOk(e){return!!e&&typeof e==='object'&&!Array.isArray(e)&&typeof e.n==='string'&&typeof e.short==='string'}
function eastRepair(g){if(!g||!Array.isArray(g.towns))return g;if(!eastOk(g.east))g.east=null;
 if(g.east){const e=g.east;if(typeof e.lord!=='string')e.lord=EASTN.lords[0];if(typeof e.c1!=='string')e.c1='l';if(typeof e.c2!=='string')e.c2='g';if(typeof e.emblem!=='string')e.emblem='sun';
  if(e.war!=null&&!eastWarOk(e.war))e.war=null}
 for(const t of g.towns)if(t&&t.east!==undefined&&t.east!==1)delete t.east;
 if(!g.east||!g.towns.some(t=>t&&t.east))eastInit(g);
 if(g.rep&&!eastNumOk(g.rep.east))g.rep.east=0;return g}
function eastWarOk(v){if(!v||typeof v!=='object'||Array.isArray(v))return false;if(v.stage!=='war'&&v.stage!=='over')return false;
 for(const k of ['hosts','sieges','taken','ctr'])if(!Array.isArray(v[k]))v[k]=[];v.sieges=v.sieges.filter(s=>s&&eastNumOk(s.i)&&eastNumOk(s.end));v.taken=v.taken.filter(s=>s&&eastNumOk(s.i));
 if(!eastNumOk(v.day0))v.day0=1;if(!eastNumOk(v.wave))v.wave=1;if(!eastNumOk(v.waves))v.waves=EW.waves;if(!eastNumOk(v.next))v.next=v.day0+EW.gap;
 if(v.side!==null&&v.side!=='houses'&&v.side!=='east'&&v.side!=='out')v.side=null;if(!v.land||!eastNumOk(v.land.x)||!eastNumOk(v.land.y))v.land={x:0,y:0};return true}
function eastName(){return G&&G.east?G.east.n:FACT.east.n}
function eastNameL(){return eastName().replace(/^The /,'the ')}
function eastHouse(){const e=G&&G.east;return e?{id:'east',n:e.n,short:e.short,c1:e.c1,c2:e.c2,emblem:e.emblem,seat:-1,pers:'proud'}:null}
function eastBanner(){const e=G&&G.east;return e?{name:e.n,c1:e.c1,c2:e.c2,emblem:e.emblem}:{name:FACT.east.n,c1:'l',c2:'g',emblem:'sun'}}
/* 15-factions.js: humanFact('east') and factName('east') know the Shogunate (standing like a house) */

/* ---- the Eastern War ---- */
function eastStrength(){let p=0;try{p=typeof companyPower==='function'?companyPower():0}catch(e){p=0}return Math.round((p+eastNum(G&&G.renown,0)/8)*10)/10}
function eastWarDue(){if(!G||!G.east||G.east.war)return false;const d=eastNum(G.day,1);if(d<EW.minDay)return false;const s=eastStrength();
 return s>=EW.thr||(d>=EW.lateDay&&s>=EW.lateThr)||d>=EW.hardDay}
function eastWar(){return G&&G.east&&G.east.war||null}
function eastWarOn(){const v=eastWar();return!!(v&&v.stage==='war')}
// the landing: a coast tile of the region, far east, on the mainland
function eastLanding(){const w=eastW();if(!w)return null;let best=-1,bv=-1e9;for(let i=0;i<WN*WN;i++){if(!w.east||!w.east[i]||!w.ok[i])continue;const x=i%WN,y=(i/WN)|0;let sea=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<WN&&ny<WN&&w.tiles[ny*WN+nx]===0)sea++}if(!sea)continue;
  const v=x+((x*7+y*13)%5)*.1;if(v>bv){bv=v;best=i}}
 if(best<0){const L=eastTowns();if(!L.length)return null;const t=G.towns[L[0]];return{x:t.x,y:t.y}}return{x:(best%WN+.5)*TS,y:(((best/WN)|0)+.5)*TS}}
function eastTargets(x,y){const L=[];G.towns.forEach((t,i)=>{if(t.own==='east')return;if(townSit(i,'siege'))return;L.push([i,Math.hypot(t.x-x,t.y-y)])});L.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);return L.map(a=>a[0])}
function eastSpawnHost(x,y,to,mult){if(typeof wsSpawnRaid!=='function')return null;const p=wsSpawnRaid('east',x,y,to,mult);if(!p)return null;p.ew=1;p.host=1;
 if(typeof fabledFor==='function'){try{const v=eastWar(),id=fabledFor({k:'east',f:'east',salt:p.id,exclude:G.parties.filter(q=>q.ew&&q.fab).map(q=>q.fab)});if(id&&(v&&v.wave>=2||rnd()<.35))p.fab=id}catch(e){}}   // a fabled leader rides with some hosts (partyBattle: o.fabled=[p.fab])
 return p}
function eastStart(){const e=G.east,land=eastLanding();if(!land)return null;
 e.war={stage:'war',day0:G.day,side:null,wave:0,waves:EW.waves,next:G.day,land,hosts:[],sieges:[],taken:[],lost:[],ctr:[],outcome:null,end:null};
 eastNews(`The fleets of ${eastNameL()} land on the eastern coast. The Eastern War has begun`,true);
 // the houses: unite or not (a seeded draw for each pair at war)
 if(Array.isArray(G.wars)&&G.wars.length){G.wars=G.wars.filter(w=>{if(rnd()<.55){if(G.hrel)G.hrel[hrKey(w.a,w.b)]=Math.max(eastNum(G.hrel[hrKey(w.a,w.b)],0),5);eastNews(`${factName(w.a)} and ${factName(w.b)} set aside their quarrel against the invader`);return false}return true})}
 eastWave();if(!G.note){G.note='east';e.war.asked=1}return e.war}
function eastWave(){const v=eastWar();if(!v||v.wave>=v.waves)return;const k=v.wave,n=EW.hosts[k]||2,m=EW.mult[k]||1.2;v.wave++;v.next=G.day+EW.gap;
 const T=eastTargets(v.land.x,v.land.y);for(let j=0;j<n&&T.length;j++){const to=T[Math.min(j,T.length-1)],pos=typeof randOk==='function'?randOk(v.land.x,v.land.y,0,1.5):v.land,p=eastSpawnHost(pos.x,pos.y,to,Math.round((m+rnd()*.15)*100)/100);if(p)v.hosts.push(p.id)}
 if(k>0)eastNews(`A ${k===v.waves-1?'last ':''}wave of ${eastNameL()} lands on the coast`)}
function eastNews(t,big){if(typeof worldNews==='function')worldNews(t);const L=G.eastNews||(G.eastNews=[]);if(big||L.length<3)L.push(t)}
function eastHostOf(id){return G.parties.find(p=>p.id===id)||null}
function eastSiegeOf(i){const v=eastWar();return v?v.sieges.find(s=>s.i===i)||null:null}
// the daily step of the war
function eastWarDay(){const v=eastWar();if(!v||v.stage!=='war')return;
 if(!v.side&&!v.asked&&G.note==null){G.note='east';v.asked=1}   // the side sheet waits for a free moment (another note was showing)
 if(v.wave<v.waves&&G.day>=v.next)eastWave();
 v.hosts=v.hosts.filter(id=>!!eastHostOf(id));
 // hosts that reached their town besiege it
 for(const id of v.hosts){const p=eastHostOf(id);if(!p||p.siege!=null)continue;const t=G.towns[p.to];if(!t||t.own==='east'){const T=eastTargets(p.x,p.y);if(T.length){const r=typeof wsPathTo==='function'?wsPathTo(p.x,p.y,G.towns[T[0]].x,G.towns[T[0]].y):null;if(r){p.to=T[0];p.goal='raid';p.pts=r;p.pi=0;p.life=undefined}}continue}
  const d=Math.hypot(p.x-t.x,p.y-t.y)/TS;if(d<=2.6||p.goal!=='raid'){if(townSit(p.to,'siege')&&!eastSiegeOf(p.to)){p.goal='raid';continue}
   const len=ri(EW.len[0],EW.len[1]);townSitAdd(p.to,'siege',len+2,{by:'east'});p.goal='patrol';p.siege=p.to;p.pts=null;p.life=undefined;const pos=randOk(t.x,t.y,1,1.6);p.x=pos.x;p.y=pos.y;p.tx=pos.x;p.ty=pos.y;
   v.sieges.push({i:p.to,host:p.id,end:G.day+len});eastNews(`${eastName()} besieges ${t.name}`,true)}}
 // sieges run their course
 for(const s of v.sieges.slice()){const t=G.towns[s.i],p=eastHostOf(s.host);
  if(!p||p.siege!==s.i){v.sieges=v.sieges.filter(q=>q!==s);townSitDel(s.i,'siege');continue}            // the host was broken on the field
  if(G.day<s.end)continue;v.sieges=v.sieges.filter(q=>q!==s);townSitDel(s.i,'siege');
  const united=!G.wars||!G.wars.length,ch=clamp(.34+(p.mult-1)*.5-(united?.1:0)-(v.side==='houses'?.12:0)+(v.side==='east'?.14:0)-t.size*.07-(G.houses&&G.houses.some(h=>h.seat===s.i)?.15:0),.12,.85);
  if(rnd()<ch){const prev=t.own;t.own='east';t.pros=clamp(eastNum(t.pros,50)-10,0,100);t.ref=-99;v.taken.push({i:s.i,prev,day:G.day});eastNews(`${eastName()} took ${t.name}${prev&&prev!=='free'?' from '+factName(prev):''}`,true);
   p.gone=1;G.parties=G.parties.filter(q=>q!==p)}   // the host garrisons the town it took
  else{p.gone=1;G.parties=G.parties.filter(q=>q!==p);eastNews(`The siege of ${t.name} failed: the host of ${eastNameL()} breaks`,true)}}
 // the houses strike back at the towns the East holds
 for(const tk of v.taken){const t=G.towns[tk.i];if(!t||t.own!=='east'||townSit(tk.i,'siege'))continue;const h=G.houses&&G.houses.find(h=>h.id===tk.prev);if(!h||rnd()>=.1)continue;
  townSitAdd(tk.i,'siege',ri(SITS.siege.dur[0],SITS.siege.dur[1]),{by:h.id});const pos=randOk(t.x,t.y,1,1.6);if(typeof wsAdd==='function')wsAdd({x:pos.x,y:pos.y,f:h.id,goal:'patrol',siege:tk.i,mult:Math.round((1+rnd()*.3)*100)/100});eastNews(`${h.n} marches to retake ${t.name}`)}
 // eastern war contracts on the boards
 eastPostWork();
 // the end: every wave landed and no host left, or the war has run its course
 const quiet=v.wave>=v.waves&&!v.hosts.length&&!v.sieges.length;if(quiet||G.day-v.day0>=EW.cap)eastEnd()}
function eastHeld(){const v=eastWar();if(!v)return 0;let n=0;for(const tk of v.taken)if(G.towns[tk.i]&&G.towns[tk.i].own==='east')n++;return n}
function eastEnd(){const v=eastWar();if(!v||v.stage!=='war')return;const held=eastHeld(),won=held>=2||(held>=1&&v.hosts.length>0);
 v.stage='over';v.end=G.day;v.outcome=won?'east':'houses';for(const id of v.hosts){const p=eastHostOf(id);if(p)p.gone=1}G.parties=G.parties.filter(p=>!p.ew);v.hosts=[];
 for(const s of v.sieges)townSitDel(s.i,'siege');v.sieges=[];
 if(!won){for(const tk of v.taken){const t=G.towns[tk.i];if(t&&t.own==='east'){t.own=tk.prev||'free';t.ref=-99}}eastNews(`The Eastern War is over: ${eastNameL()} sails home, and the houses keep their land`,true)}
 else eastNews(`The Eastern War is over: ${eastNameL()} keeps ${held} town${held===1?'':'s'} of the west`,true);
 const side=v.side||'out',H=Array.isArray(G.houses)?G.houses:[],why='The Eastern War';
 if(side==='houses'){if(!won){G.renown=eastNum(G.renown,0)+EW.renown.win;G.crowns=eastNum(G.crowns,0)+EW.pay.houses;for(const h of H)repGain(h.id,EW.rep.ally,why);eastTitle('Bane of the East')}else G.renown=eastNum(G.renown,0)+EW.renown.lose;
  repGain('east',Math.max(0,-30-repOf('east')),'The war is over')}
 else if(side==='east'){if(won){G.renown=eastNum(G.renown,0)+EW.renown.win;G.crowns=eastNum(G.crowns,0)+EW.pay.east;repGain('east',EW.rep.ally,why);eastTitle('Sword of the Shogun')}else G.renown=eastNum(G.renown,0)+EW.renown.lose;
  for(const h of H)if(repOf(h.id)<-30)repGain(h.id,-30-repOf(h.id),'The war is over')}
 else{G.renown=eastNum(G.renown,0)+EW.renown.out}
 if(typeof achEvent==='function')achEvent('east',{won,side});   // achievements (28-achieve.js)
 if(G.note==null)G.note='eastend'}
function eastTitle(t){const e=G.east;e.title=t;if(Array.isArray(G.titles)){if(!G.titles.includes(t))G.titles.push(t)}}
function eastWarChoose(side){const v=eastWar();if(!v||v.stage!=='war'||v.side)return false;if(side!=='houses'&&side!=='east'&&side!=='out')return false;v.side=side;const H=Array.isArray(G.houses)?G.houses:[];
 if(side==='houses'){repGain('east',EW.rep.side,'Took up arms against '+eastNameL());for(const h of H)repGain(h.id,8,'Stood with the houses against the East');
  // the houses band together behind the company
  if(Array.isArray(G.wars)&&G.wars.length){for(const w of G.wars)eastNews(`${factName(w.a)} and ${factName(w.b)} make peace to face the East`);G.wars=[]}}
 else if(side==='east'){repGain('east',EW.rep.ally,'Took '+eastNameL()+'’s coin');for(const h of H)repGain(h.id,EW.rep.houseSide,'Sold its swords to the invader')}
 eastNews(side==='houses'?'The company stands with the houses':side==='east'?`The company takes the coin of ${eastNameL()}`:'The company stays out of the Eastern War');
 eastPostWork(true);if(typeof save==='function')try{save()}catch(e){}return true}
// contracts of the war: a free hand in every town to break an eastern siege (houses / out), or to take a town for the East (east / out)
function eastPostWork(force){const v=eastWar();if(!v||v.stage!=='war'||typeof ctrNew!=='function'||typeof ctrPayBase!=='function')return;const side=v.side||'out';
 const has=(t,k,i)=>Array.isArray(t.contracts)&&t.contracts.some(c=>c&&c.ew&&c.ew.k===k&&c.ew.i===i);
 if(side!=='east')for(const s of v.sieges){const at=G.towns[s.i];if(!at)continue;let best=-1,bd=1e18;G.towns.forEach((t,i)=>{if(t.own==='east')return;const d=Math.hypot(t.x-at.x,t.y-at.y);if(d<bd){bd=d;best=i}});
  const t=G.towns[best];if(!t||has(t,'siege',s.i)||!Array.isArray(t.contracts))continue;const p=typeof ctrBeside==='function'?ctrBeside(at):{x:at.x+TS,y:at.y},diff=clamp(2+Math.round((eastNum((eastHostOf(s.host)||{}).mult,1.2)-1)*5),2,5);
  const c=ctrNew('siege',t,best,diff,'Break the eastern siege of '+at.name);c.f='east';c.at=s.i;c.pay=ctrPayBase(diff,1.6);c.ew={k:'siege',i:s.i};
  c.stages=[{k:'go',x:p.x,y:p.y,kind:'siege',label:'Eastern siege lines',fight:{f:'east',k:1.1,obj:{k:'siege'}}},typeof ctrHome==='function'?ctrHome(best):{k:'town',ti:best,kind:'turnin',label:'Collect the pay'}];c.due=s.end;t.contracts.push(c);v.ctr.push(c.id)}
 if(side==='east'||side==='out')for(const ti of eastTowns()){const t=G.towns[ti];if(!Array.isArray(t.contracts)||t.contracts.some(c=>c&&c.ew&&c.ew.k==='take'))continue;
  const T=eastTargets(t.x,t.y).filter(i=>i!==0&&G.towns[i].own!=='east');if(!T.length)continue;const at=G.towns[T[0]],own=at.own||'free';if(!FACT[own])continue;
  const p=typeof ctrBeside==='function'?ctrBeside(at):{x:at.x+TS,y:at.y},diff=clamp(3+at.size-1,2,5),c=ctrNew('siege',t,ti,diff,`Take ${at.name} for the Shogunate`);
  c.emp='east';c.f=own;c.at=T[0];c.pay=ctrPayBase(diff,1.8);c.ew={k:'take',i:T[0]};c.stages=[{k:'go',x:p.x,y:p.y,kind:'siege',label:'The walls of '+at.name,fight:{f:own,k:1.15,obj:{k:'siege'}}},typeof ctrHome==='function'?ctrHome(ti):{k:'town',ti,kind:'turnin',label:'Collect the pay'}];
  c.due=G.day+8;t.contracts.push(c);v.ctr.push(c.id)}
 if(v.ctr.length>40)v.ctr.splice(0,v.ctr.length-40)}
// the war reads a battle's outcome: a won war contract fight frees a town / takes one; called by worldBattleEnd (hook) and polled daily
function eastBattleEnd(src,win){const v=eastWar();if(!v||v.stage!=='war'||!win)return false;const c=G.contract;if(!c||!c.ew||c.ewDone)return false;if(!(c.stage>=1||c.done))return false;
 c.ewDone=1;const i=c.ew.i,t=G.towns[i];if(!t)return false;
 if(c.ew.k==='siege'){const s=eastSiegeOf(i);if(s){const p=eastHostOf(s.host);if(p){p.gone=1;G.parties=G.parties.filter(q=>q!==p)}v.sieges=v.sieges.filter(q=>q!==s);townSitDel(i,'siege');
   repGain(t.own,12,'Broke the eastern siege of '+t.name);repGain('east',-8,'Broke an eastern siege');eastNews(`The company broke the eastern siege of ${t.name}`,true)}return true}
 if(c.ew.k==='take'&&t.own!=='east'){const prev=t.own;t.own='east';t.ref=-99;v.taken.push({i,prev,day:G.day});if(prev&&prev!=='free')repGain(prev,-15,'Stormed '+t.name+' for the East');repGain('east',10,'Took '+t.name);eastNews(`The company stormed ${t.name} for ${eastNameL()}`,true);return true}
 return false}
function eastWarStatus(){const v=eastWar();if(!v)return'';if(v.stage==='over')return v.outcome==='east'?`The East won the war (day ${v.end})`:`The houses won the Eastern War (day ${v.end})`;
 const s=v.side==='houses'?'fighting for the houses':v.side==='east'?'in eastern pay':v.side==='out'?'staying out':'no side chosen';
 return`The Eastern War, day ${G.day-v.day0+1}: ${v.hosts.length} host${v.hosts.length===1?'':'s'} in the field, ${v.sieges.length} siege${v.sieges.length===1?'':'s'}, ${eastHeld()} town${eastHeld()===1?'':'s'} taken (${s})`}
function eastMarks(){const v=eastWar(),L=[];if(!v||v.stage!=='war')return L;L.push({x:v.land.x,y:v.land.y,kind:'east-land',label:'Eastern landing'});
 for(const s of v.sieges){const t=G.towns[s.i];if(t)L.push({x:t.x,y:t.y,kind:'east-siege',label:'Besieged by the East',town:s.i})}return L}

/* ---- daily ---- */
function eastDay(news){if(!G||!Array.isArray(G.towns))return[];if(!G.east)eastInit(G);if(!G.east)return[];G.eastNews=[];
 if(eastWarDue())eastStart();else if(eastWarOn())eastWarDay();
 if(G.contract&&G.contract.ew)eastBattleEnd(null,true);
 const out=G.eastNews||[];G.eastNews=null;if(Array.isArray(news))for(const t of out)news.push(t);return out}

/* ---- the war sheet ---- */
function eastWarSheet(){const v=eastWar();if(!v||typeof sheet!=='function')return false;const e=G.east,H=Array.isArray(G.houses)?G.houses:[],hn=H.map(h=>h.short||h.n).join(', ');
 const ban=typeof bannerHTML==='function'?(()=>{try{return bannerHTML(eastBanner(),48)}catch(x){return''}})():'';
 if(v.stage==='over'){sheet(`<div class="ew-sheet"><div class="ew-head">${ban}<div><div class="pn-kick">The Eastern War</div><h2>${v.outcome==='east'?e.n+' keeps its gains':'The East is driven back'}</h2></div></div>
  <p>${v.outcome==='east'?`${eastHeld()} town${eastHeld()===1?'':'s'} of the west now fly${eastHeld()===1?'s':''} the red sun of ${e.short}. The houses lick their wounds.`:`The last eastern host is broken. The fleets sail home and the towns they took are returned to their lords.`}</p>
  <p class="dim">${v.side==='houses'?(v.outcome==='houses'?'The houses pay the company and remember who stood with them.':'The company fought on the losing side.'):v.side==='east'?(v.outcome==='east'?`${e.lord} pays the company in gold and honour.`:'The eastern coin is spent; the houses remember.'):'The company stayed out and kept its swords for other work.'}</p>
  <div class="ew-row"><button class="pri" onclick="closeSheet()">Onward</button></div></div>`,'ew');return true}
 const ch=v.side,btn=(k,t,d)=>`<button class="ew-opt${ch===k?' on':''}"${ch?' disabled':''} onclick="eastWarChoose('${k}');eastWarSheet()"><b>${t}</b><span>${d}</span></button>`;
 sheet(`<div class="ew-sheet"><div class="ew-head">${ban}<div><div class="pn-kick">The Eastern War</div><h2>${e.n} lands on the coast</h2></div></div>
 <p>The fleets of ${eastNameL()} have landed on the eastern shore. ${e.lord} leads samurai, warrior monks and ashigaru inland in ${v.waves} waves, one about every ${EW.gap} days. Each host marches on the nearest town and lays siege to it: if the siege runs ${EW.len[0]}–${EW.len[1]} days the town may fall. Break a host in the field and the siege is lifted.</p>
 <p class="dim">The houses (${hn||'the lords of the west'}) must band together or fall one by one. The war ends when every wave has landed and no host is left, or after ${EW.cap} days. If the East holds two towns at the end, it keeps them.</p>
 <div class="ew-opts">${btn('houses','Fight for the houses',`Eastern standing −${-EW.rep.side} (hostile), the houses +8 and they make peace with each other. If the East is driven back: ${EW.pay.houses} crowns, +${EW.renown.win} renown and the houses' gratitude.`)}
 ${btn('east','Take eastern coin',`The Shogunate +${EW.rep.ally}, every house ${EW.rep.houseSide}. Contracts to storm western towns. If the East keeps its gains: ${EW.pay.east} crowns, +${EW.renown.win} renown.`)}
 ${btn('out','Stay out and profit','No standing changes. War contracts from both sides stay open to the company. +'+EW.renown.out+' renown when it is over.')}</div>
 ${ch?`<p class="ew-chosen">${ch==='houses'?'The company stands with the houses.':ch==='east'?'The company is in eastern pay.':'The company stays out of it.'}</p><div class="ew-row"><button class="pri" onclick="closeSheet()">To the war</button></div>`:''}</div>`,'ew');return true}
function eastNoteSheet(n){if(n==='east'||n==='eastend')return eastWarSheet();return false}

/* ---- markets: eastern stalls carry eastern gear (about two thirds of the stock), western stalls almost none ----
   eastStock(t, stock, maxT) -> the stock list (draws rnd: call it where stockTown rolls the stalls). */
function eastStock(t,stock,maxT){if(!t||!Array.isArray(stock)||typeof marketPool!=='function'||typeof stockPick!=='function')return stock;const pool=marketPool(maxT),E=pool.filter(id=>ITEMS[id].east),Wp=pool.filter(id=>!ITEMS[id].east);
 const eastern=!!t.east||t.own==='east';return stock.map((id,k)=>{const it=ITEMS[id];if(!it||it.k==='t')return id;
  if(eastern)return!it.east&&E.length&&(k%3!==2)?stockPick(E.filter(e=>ITEMS[e].k===it.k).length?E.filter(e=>ITEMS[e].k===it.k):E,maxT):id;
  return it.east&&Wp.length&&rnd()<.9?stockPick(Wp.filter(e=>ITEMS[e].k===it.k).length?Wp.filter(e=>ITEMS[e].k===it.k):Wp,maxT):id})}
