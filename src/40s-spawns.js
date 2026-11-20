/* ================= HABITATS, THE NIGHT AND THE WILDS (where the bands of the world come from) =================
   Every monster family has the ground it calls home. A band that forms on the land (spawnParty with no faction named) is placed first
   and its family is drawn second, by the weights below at the tile it forms on, so spiders are met in the forests, serpents in the
   forests, deserts and swamps, goblins in the hills under the mountains, brigands along the roads.

   HABF[fam] = {f (the FACT it fights as), n (its name on the map), units? (its own warband list, [EN id, cost], in place of FACT[f].units:
                the beasts are three families), share (its part of the faction's pool weight), home {biome: weight}, and the modifiers
                peak (x near a peak: within 3 tiles), deep (x in deep forest: 3+ tiles from its edge, half that 2 tiles in; forest edges x.35), ruin (x within 4
                tiles of a ruin, graveyard or dungeon), rift (x within 6 tiles of a rift), civ (1: likes the roads: x1.8 within 2 tiles of a
                town or road, x1.2 within 6, x.5 beyond), old (x by distance from towns: <5 tiles x.5, 8+ x1.6), strict (1: no strays),
                night (1: only by night, gone at dawn), haunt (the band card's line)}
   The biomes are the world's walkable ground: plains forest hills swamp desert snow ('mountains' are impassable: 'peak' reads the
   ground beside them). A family whose home lacks the tile still strays there at HAB.stray unless it is strict.
   The table (home weights; x modifiers):
     goblins      hills 3, forest 2.2, swamp .8, plains .4, snow .6, desert .5; near peaks x2           (hills and forests under the mountains)
     brigands     plains 1.4, forest 1, hills 1, desert .8, swamp .5, snow .5; roads x1.8 .. wild x.5    (near the roads and towns)
     wolves       snow 2.4, hills 2, forest 1.6, plains .5, swamp .3, desert .15                       (forests, hills and tundra)
     webspinners  forest 4, swamp .5, others .02; strict                                  (the forests, almost only)
     owlbear      forest 1; deep forest x4 (2 tiles in x2), edges x.35; strict                                         (deep forest)
     restless dead swamp 3, forest 1, hills 1, desert .9, snow .9, plains .4; ruins x3; NIGHT ONLY       (graveyards, ruins and fens)
     orcs         hills 2, desert 2, plains 1.2, snow 1, forest .4; near peaks x2                       (badlands, steppe and the mountains)
     serpents     desert 3, swamp 3, forest 2.5 (FACT.serpent.biomes: forest desert swamp)                (forests and deserts, and the fens)
     ents         forest 1; deep forest x3, old (far from towns) x1.6                                  (old forests)
     ogres        hills 3, plains .3; near peaks x2.5                                                  (hills and mountains)
     wyverns      snow 1.5, hills 1; near peaks x4                                                     (the mountains and their cliffs)
     riftspawn    anywhere 1; near a rift x5                                                           (rift sites)
     crisis peoples (the Dead March's plain bands are night-bound like the restless dead; the horde and barbarians anywhere).
   The mid/late/end factions keep their hard biomes (FACT[f].biomes) and their spawn ranges (factionPool: gate, minD, startD); habitat
   weights only choose among what may stand there. The East's soldiers never roam as monster bands (FACT.east: the Eastern War's hosts);
   in the eastern lands the monsters follow the ground like anywhere else.

   NIGHT (isNight(): 20:00 .. 05:00, as the battle's Night owl reads it): night-bound bands (NIGHTF factions: undead, dead) only form by
   night: the pool drops them by day, and at dusk the dead rise (nightTick: NIGHTW.rise bands near the company, on their habitat). At dawn
   every free night-bound band sinks into the ground and is gone (a toast when the company can see one: "The dead return to their graves
   at dawn"), chasing or not; the land is refilled by day bands at once (wsKeepBands). A battle under way is never touched (time stands
   still in battle). Exempt, so contracts, crises and quests keep working at any hour: crisis hosts (p.cr), event fights (p.ev), bands
   bound to a contract (p.ctr, p.ambE, p.escR, p.quest), bands locked in a clash with a caravan (they go at the next tick after it).
   Contracts never put undead on the map as parties: their fights wait at the contract's target (a lair, a barrow, a gate), so a
   "Put the restless dead to rest" or a relic hunt can be fought by day. A nest of the dead stays (a lair); its bands march only by night.

   THE WILDS: a band's strength grows with its distance from civilization, cd = tiles (4-step) to the nearest town or road tile:
     wild = clamp((cd - WILD.d0) / (WILD.d1 - WILD.d0), 0, 1),   mult x (WILD.near + (WILD.far - WILD.near) x wild)
   so within 3 tiles of a town or road a band is x.9 (a little gentler than before), x1 at 5.2, x1.2 at 9.6 and x1.4 from 14 tiles out.
   The stronger mult reaches the band's size and rank (battleBudget, foeRank), the band's tier mix shifts with wild (WILD.tierK:
   mid x(1 + 1 wild), late x(1 + 1.5 wild), end x(1 + 2 wild), early x(1 - .35 wild)), and its elites (eliteShare: o.wild, 64e-elites.js).
   p.wild (0..1, two decimals) is kept on the band; p.fam names a beast family. Both are optional (old saves: plain bands).
   Deterministic: every draw is the world's rnd(), like the old spawn code. */
const HAB={stray:.06};
const WILD={d0:3,d1:14,near:.9,far:1.4,tierK:{early:-.35,mid:1,late:1.5,end:2,crisis:0}};
const NIGHTF=new Set(['undead','dead']);
const NIGHTW={rise:2,boost:1.5};
const HABF={
 gob:{f:'gob',n:'Goblins',home:{hills:3,forest:2.2,swamp:.8,plains:.4,snow:.6,desert:.5},peak:2,haunt:'Haunts hills and forests under the mountains'},
 bandit:{f:'bandit',n:'Brigands',home:{plains:1.4,forest:1,hills:1,desert:.8,swamp:.5,snow:.5},civ:1,haunt:'Haunts the roads and the towns\' outskirts'},
 wolf:{f:'beast',n:'Wolves',share:.4,units:[['wolf',21]],home:{snow:2.4,hills:2,forest:1.6,plains:.5,swamp:.3,desert:.15},haunt:'Haunts forests, hills and tundra'},
 spider:{f:'beast',n:'Webspinners',share:.5,units:[['spider',20],['spider',20],['spider',20],['wolf',21]],home:{forest:4,swamp:.5,hills:.02,plains:.02,desert:.02,snow:.02},strict:1,haunt:'Haunts the forests'},
 owlbear:{f:'beast',n:'Owlbear',share:.2,units:[['bear',58],['bear',58],['spider',20],['wolf',21]],home:{forest:1},deep:4,strict:1,haunt:'Haunts the deep forest'},
 undead:{f:'undead',n:'Restless dead',home:{swamp:3,forest:1,hills:1,desert:.9,snow:.9,plains:.4},ruin:3,night:1,haunt:'Rises from graves and fens by night'},
 dead:{f:'dead',n:'The Dead March',home:{swamp:2,forest:1,hills:1,desert:1,snow:1,plains:1},ruin:3,night:1,haunt:'Rises from the graves by night'},
 orc:{f:'orc',n:'Orcs',home:{hills:2,desert:2,plains:1.2,snow:1,forest:.4},peak:2,haunt:'Haunts the badlands, the steppe and the mountains'},
 serpent:{f:'serpent',n:'Serpents',home:{desert:3,swamp:3,forest:2.5},haunt:'Haunts forests, deserts and fens'},
 ent:{f:'ent',n:'Ents',home:{forest:1},deep:3,old:1,strict:1,haunt:'Haunts the old forests'},
 ogre:{f:'ogre',n:'Ogres',home:{hills:3,plains:.3},peak:2.5,haunt:'Haunts the hills under the mountains'},
 wyvern:{f:'wyvern',n:'Wyverns',home:{snow:1.5,hills:1},peak:4,haunt:'Haunts the peaks'},
 void:{f:'void',n:'Riftspawn',home:{plains:1,forest:1,hills:1,swamp:1,desert:1,snow:1},rift:5,haunt:'Pours out of the rifts'}};
const HABOF={};for(const k in HABF){const f=HABF[k].f;(HABOF[f]||(HABOF[f]=[])).push(k)}   // faction -> its families
function habFams(f){return HABOF[f]||[f]}
function habDef(fam){return HABF[fam]||{f:fam,home:null}}
function nightBoundF(f){return NIGHTF.has(f)}
// a band that comes and goes with the night: a free band of a night-bound faction, not bound to any contract, crisis or event
function nightBound(p){return !!p&&NIGHTF.has(p.f)&&!p.cr&&!p.ev&&p.ctr==null&&!p.ambE&&p.escR==null&&!p.quest&&!p.clash&&(!p.goal||p.goal==='roam'||p.goal==='nest'||p.goal==='raid')}
/* habFields(): per world tile, cd (4-step tiles to the nearest town or road) and fd (4-step tiles from the nearest non-forest tile:
   0 off the forest, 1 its edge, 3+ deep forest). Cached per world and town list, like worldFields. */
function habFields(){if(!W||!G)return null;const sig=W.seed+'|'+WN+'|'+G.towns.length;if(W.hab&&W.hab.sig===sig)return W.hab;const tw=new Set();
 for(const t of G.towns){const tx=Math.floor(t.x/TS),ty=Math.floor(t.y/TS);if(tx>=0&&ty>=0&&tx<WN&&ty<WN)tw.add(ty*WN+tx)}
 const cd=wgBfs(i=>tw.has(i)||(!!W.road&&!!W.road[i])),fd=wgBfs(i=>W.tiles[i]!==2);W.hab={sig,cd,fd};return W.hab}
function habCivD(x,y){const H=habFields();if(!H)return 0;const tx=clamp(Math.floor(x/TS),0,WN-1),ty=clamp(Math.floor(y/TS),0,WN-1);return H.cd[ty*WN+tx]}
function wildOf(cd){return clamp((cd-WILD.d0)/(WILD.d1-WILD.d0),0,1)}
function wildK(w){return WILD.near+(WILD.far-WILD.near)*clamp(w||0,0,1)}
// the ground at world tile i as the habitats read it
function habEnv(i){const F=worldFields(),H=habFields(),x=i%WN,y=(i/WN)|0,px=(x+.5)*TS,py=(y+.5)*TS;let ruin=99,rift=99;
 for(const s of (G.sites||[]))if(s&&(s.kind==='ruin'||s.kind==='grave'||s.kind==='dgn'||s.kind==='dgnc')){const d=Math.hypot(s.x-px,s.y-py)/TS;if(d<ruin)ruin=d}
 for(const s of (G.portals||[]))if(s){const d=Math.hypot(s.x-px,s.y-py)/TS;if(d<rift)rift=d}
 return{i,b:TERRN[W.tiles[i]]||'plains',md:F?F.md[i]:99,td:F?F.td[i]:99,cd:H?H.cd[i]:0,fd:H?H.fd[i]:0,ruin,rift}}
// how much family fam likes the ground env (0 = never)
function habW(fam,env){const H=habDef(fam);if(!H.home)return 1;let w=H.home[env.b]||0;
 if(H.peak&&env.md<=3)w=(w||.5)*H.peak;
 if(H.deep)w*=env.b!=='forest'?1:env.fd>=3?H.deep:env.fd>=2?H.deep/2:.35;
 if(H.ruin&&env.ruin<=4)w=(w||.5)*H.ruin;
 if(H.rift&&env.rift<=6)w=(w||.5)*H.rift;
 if(H.civ)w*=env.cd<=2?1.8:env.cd<=6?1.2:.5;
 if(H.old)w*=env.td>=8?1.6:env.td>=5?1:.5;
 if(!H.strict)w=Math.max(w,HAB.stray);return w}
// a beast (or any) faction's family for a band of faction f formed at (x,y): weighted by habitat. Seeded (one rnd draw when it has more than one).
function habFamAt(f,x,y){const L=habFams(f);if(L.length<2||!W)return L[0];const tx=clamp(Math.floor(x/TS),0,WN-1),ty=clamp(Math.floor(y/TS),0,WN-1),env=habEnv(ty*WN+tx);
 let tot=0;const ws=L.map(k=>{const w=(HABF[k].share||1)*Math.max(habW(k,env),HAB.stray);tot+=w;return w});let v=rnd()*tot;for(let j=0;j<L.length;j++){if(v<ws[j])return L[j];v-=ws[j]}return L[L.length-1]}
// the faction among fs whose kind likes (x,y) best, by weight (a new nest). Seeded.
function habPickF(fs,x,y){if(!fs.length)return null;if(!W)return pick(fs);const tx=clamp(Math.floor(x/TS),0,WN-1),ty=clamp(Math.floor(y/TS),0,WN-1),env=habEnv(ty*WN+tx);let tot=0;
 const ws=fs.map(f=>{let w=0;for(const k of habFams(f))w+=(HABF[k]?HABF[k].share||1:1)*habW(k,env);w=Math.max(w,HAB.stray);tot+=w;return w});let v=rnd()*tot;for(let j=0;j<fs.length;j++){if(v<ws[j])return fs[j];v-=ws[j]}return fs[fs.length-1]}
/* habCands(ctx, env): the families that may form at env now, [{f, fam, w, tier}]. ctx.only: factions; ctx.night (default isNight());
   the pool (factionPool) gives each faction's weight, minD, startD and hard biomes. */
function habCands(ctx,env,pool){const out=[],night=ctx.night!=null?ctx.night:isNight(),st=G.towns[0],px=(env.i%WN+.5)*TS,py=(((env.i/WN)|0)+.5)*TS,wild=wildOf(env.cd);
 for(const e of pool){if(ctx.only&&!ctx.only.includes(e.f))continue;if(NIGHTF.has(e.f)&&!night)continue;
  if(env.td<Math.max(2.5,e.minD||0))continue;if(e.biomes&&!biomeHas(env.i,e.biomes))continue;if(st&&e.startD&&Math.hypot(st.x-px,st.y-py)<e.startD*TS)continue;
  const tk=1+(WILD.tierK[e.tier]||0)*wild,nk=NIGHTF.has(e.f)?NIGHTW.boost:1;
  for(const fam of habFams(e.f)){const H=habDef(fam),w=e.w*(H.share||1)*habW(fam,env)*tk*nk;if(w>0)out.push({f:e.f,fam,w,tier:e.tier})}}
 return out}
/* habRoll(ctx): a place and a family for a new band near (ctx.x, ctx.y), ctx.minT..ctx.maxT tiles out (default 9..26): a spot on the
   mainland first, then the family by weight among those that may stand there; up to 24 spots. Returns {f, fam, x, y, wild, cd} or null. */
function habRoll(ctx){ctx=ctx||{};if(!W||!G)return null;const pool=factionPool({crisis:ctx.crisis!=null?ctx.crisis:false}),x=ctx.x!=null?ctx.x:G.p.x,y=ctx.y!=null?ctx.y:G.p.y,minT=ctx.minT||9,maxT=ctx.maxT||26;
 if(!pool.length)return null;
 for(let a=0;a<24;a++){const pos=randOk(x,y,minT,maxT);if(!okAt(pos.x,pos.y))continue;const tx=Math.floor(pos.x/TS),ty=Math.floor(pos.y/TS),env=habEnv(ty*WN+tx),L=habCands(ctx,env,pool);
  let tot=0;for(const c of L)tot+=c.w;if(!(tot>0))continue;let v=rnd()*tot,c=L[L.length-1];for(const q of L){if(v<q.w){c=q;break}v-=q.w}
  return{f:c.f,fam:c.fam,x:pos.x,y:pos.y,cd:env.cd,wild:Math.round(wildOf(env.cd)*100)/100}}
 return null}
// strength from the wilds for a band at (x,y): sets p.wild and scales p.mult (spawnParty)
function habWild(p){const w=Math.round(wildOf(habCivD(p.x,p.y))*100)/100;if(w>0)p.wild=w;else delete p.wild;p.mult*=wildK(w);return p}
// the line the band's card shows ('Haunts the forests'), or ''
function habHaunt(p){if(!p)return'';const H=HABF[p.fam]||HABF[p.f];return H&&H.haunt?H.haunt:''}
// the name on the map: a beast family's own (Wolves, Webspinners, Owlbear), else the faction's
function habName(p){const H=p&&p.fam&&HABF[p.fam];return H&&H.f===p.f?H.n:null}
// a band's own warband list (a beast family), or null: partyBattle0 hands it to the battle as o.units
function habUnits(p){const H=p&&p.fam&&HABF[p.fam];return H&&H.f===p.f&&Array.isArray(H.units)?H.units.filter(u=>EN[u[0]]):null}

/* ---- the night's clock: nightTick(t0) after advanceTime moves the clock from absolute hour t0 (day x 24 + hour) ---- */
const SINKS=[];   // render only (never saved): bands sinking into the ground at dawn, {x, y, f, str, dir, t}
function nightTick(t0){if(!G||!Array.isArray(G.parties)||(typeof mode!=='undefined'&&mode==='battle'))return;const t1=G.day*24+G.hour;
 if(!isNight()){if(G.parties.some(nightBound))dawnPurge();return}
 // dusk: the hour 20:00 was crossed in this step (and it is still night): the dead rise
 const k=Math.floor((t1-WNIGHTDUSK)/24);if(k*24+WNIGHTDUSK>t0&&k*24+WNIGHTDUSK<=t1)duskRise()}
const WNIGHTDUSK=20;
function duskRise(){const near=34*TS;let n=0;for(const p of G.parties)if(nightBound(p)&&Math.hypot(p.x-G.p.x,p.y-G.p.y)<near)n++;
 const want=Math.max(1,Math.round(NIGHTW.rise*Math.sqrt(typeof worldK==='function'?worldK():1)));let made=0;
 for(;n<want;n++){const p=spawnParty(null,{only:[...NIGHTF],night:true});if(!p)break;made++}return made}
function dawnPurge(){const seen=[],keep=[];let vis=false;const now0=typeof now==='number'?now:0;
 for(const p of G.parties){if(!nightBound(p)){keep.push(p);continue}const tx=Math.floor(p.x/TS),ty=Math.floor(p.y/TS);
  if(typeof visibleAt==='function'&&visibleAt(tx,ty)){vis=true;SINKS.push({x:p.x,y:p.y,f:p.f,str:typeof partyStrength==='function'?partyStrength(p):2,dir:(p.tx||0)<p.x?-1:1,t:now0});if(SINKS.length>24)SINKS.shift()}seen.push(p.id)}
 if(!seen.length)return 0;G.parties=keep;if(vis&&typeof toast==='function')toast('The dead return to their graves at dawn');
 if(typeof wsKeepBands==='function')wsKeepBands();return seen.length}
