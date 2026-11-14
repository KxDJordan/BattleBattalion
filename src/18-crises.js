/* ================= CRISES (phase 8, crises agent; CONTRACT.md "Crises") =================
   One crisis a run, chosen from the seed at new game (G.crisisKind; old saves with a crisis under way: 'sunder').
   CRISES[k] = {n, d, icon, f (its faction), start(G), day(G,news) -> doom gained today, ended(G) -> won?, win(G), lose(G), after(G,news),
                marks() -> [{x,y,kind,label,f?}], sheet() -> html (the body of the crisis sheet), line() -> one short status line}
   keys: sunder deadmarch horde barbarian.
   G.crisis = {k, day (started), ended, won, lost, late, fin (the ending has been applied), doom 0..100, str (escalation), closed, total, ...state}
     closed/total: progress toward victory (rifts closed, lieutenants slain, ...), read by older code as the rift count.
   The framework: crisisDay(news) (worldDay calls it once a day) starts the crisis on its day, runs its day, escalates (str), adds the
   day's doom and ends it: a victory (ended(G)) or, at doom 100, a defeat that scars the world (lose(G)) and does not end the run. After a
   defeat the crisis's last stand (the camp, the throne) can still be broken: a late victory (c.late) that heals the scar.
   Towns: crFall(i, f) a crisis faction takes a town (t.held = f, t.fallen = {by, day}, a situation SITS.haunted / occupied / sacked).
          crFree(i, how) frees it. A held town is closed to the company: arriving there offers the fight to take it back (crTownSheet).
   Hosts: G.parties with goal 'raid' and p.cr ('host' | 'lt' | 'band' | 'chief' | 'raid' | 'hhost'), marching on town p.to; on arrival they
          besiege it (p.siegeT) and two days later it falls unless it holds. Beaten hosts lift sieges and give clues (the Dead March).
   Battles: src {type:'crisis', k, what, i?} (crisisBattleEnd from worldBattleEnd). Multi-stage assaults (the horde camp, the Emperor's
          camp) step through c.as = {stage} with G.note = 'crisisNext' between fights.
   Public: CRISES CRKEYS crisisKindOf(seed) runCrisisKind(seed) crisisInit(g) crisisRepair(g) crisisStartDay() crisisOn(k?) crisisKey()
           crisisFacts() crisisDay(news) startCrisis() crisisEnd(won) crisisSheet() crisisLine() crisisMarks() crisisOutcome() crisisNews()
           crTownHeld(i) townOwner(i) crTownSheet(i) crPartyBattle(p,o) crisisBattleEnd(s,win) crSiteSheet(s) crAssault(k) */
const CRKEYS=['sunder','deadmarch','horde','barbarian'];
const CRK={start:18,doomLose:100,hostCap:4,siegeDays:3,fallDoom:6,freeDoom:-6,beatDoom:-1.5,ltDoom:-7,renown:150,crowns:1500};
const CRTITLE={sunder:'Sealers of the Sky',deadmarch:'Breakers of the Bone Throne',horde:'Bane of the Great Horde',barbarian:'Emperor-Slayers'};
const CRTROPHY={sunder:'crshard',deadmarch:'crbonecrown',horde:'crwartusk',barbarian:'crempcrown'};
const CR_LTN=['Morvane the Unburied','Sister Ashgrave','Old Hollowmouth','Corvus Pale','the Widow Marrow','Bishop Sallow'];
const CR_CHIEFN=['Gorrash Skullbreaker','Uzbag Ironjaw','Mother Grukka','Thrak the Unbowed'];
const CR_EMPN=['Hrothgar Ice-Crown','Skarde the Wolf-Father','Ulfrik Winterborn','Brannoc of the Thousand Spears'];
const CR_CHAMPN=['Ketil Bear-Arm','Sigrun Red-Shield','Orm the Silent','Hakon Grey-Beard','Thyra Axe-Song','Bjarke Oathsworn'];

/* ---- crisis peoples: units (stats here, abilities in 64-foes.js, sprites in 78-crisis-art.js) ---- */
Object.assign(EN,{
 // the Dead March
 gknight:{n:'Grave knight',hp:115,arm:180,helm:150,ms:66,md:12,rd:18,init:70,d:[40,58],ap:8,xp:380,role:'line',brv:99,fearless:1,abs:['vreap']},
 necrolt:{n:'Necromancer lieutenant',hp:95,arm:60,helm:40,ms:50,md:10,rd:30,init:95,d:[16,26],xp:520,role:'caster',brv:90,fearless:1,lead:1,max:1,sub:'necro',res:{mana:[36,8]},abs:['nbolt','nraise','dgloom']},
 bthrone:{n:'The Bone Throne',hp:430,arm:220,helm:220,ms:70,md:0,rd:22,init:85,d:[42,62],ap:9,big:1,boss:1,kbImm:1,anchored:1,xp:1700,role:'boss',brv:99,fearless:1,lead:1,noCorpse:1,res:{mana:[40,9]},abs:['nbolt','nraise','bsummon','bnova'],
  crph:[{at:.6,n:'The throne wakes',say:'The Bone Throne shudders: the dead of a hundred graves answer.',summon:['skel','skelhal']},{at:.3,n:'Last rites',say:'Grave-cold pours off the throne. Its servants fight with the strength of the dead.',enrage:{dmg:.25,ms:8,ap:2}}]},
 // the Great Horde
 hstd:{n:'Horde standard-bearer',hp:115,arm:100,helm:70,ms:60,md:8,rd:8,init:85,d:[30,46],xp:300,role:'line',brv:80,banner:1,max:2,sub:'orcw',tire:1,fury:6,fatMax:70,wfat:15,abs:['owarcry']},
 hchief:{n:'Orc warchief',hp:250,arm:230,helm:180,ms:80,md:14,rd:12,init:95,d:[60,88],kb:2,kbCh:.5,big:1,boss:1,xp:1300,role:'boss',brv:95,fearless:1,lead:1,max:1,sub:'orcw',tire:1,fury:6,fatMax:110,wfat:16,abs:['owarcry','ocharge','osmash'],
  crph:[{at:.5,n:'Blood frenzy',say:'The warchief roars and the horde roars with him.',summon:['orcy','orcy'],enrage:{dmg:.25,ms:6,ap:2}}]},
 // the Barbarian War
 barbz:{n:'Berserker',hp:100,arm:40,helm:20,ms:66,md:0,rd:0,init:118,d:[34,52],w:'greataxe',xp:230,role:'flanker',brv:75,fury:6,enrage:.5,abs:['ocharge']},
 barbax:{n:'Axe thrower',hp:62,arm:40,helm:25,ms:50,rs:60,md:6,rd:12,init:112,d:[22,34],rng:3,xp:200,role:'sniper',brv:55,flee:.25,abs:['aimed'],side:{n:'Bearded axe',wt:'axe',d:[18,30],ap:4,fat:0,rng:1,ign:.25}},
 barbhound:{n:'War hound',hp:62,arm:20,ms:58,md:12,rd:10,init:150,d:[20,32],ap:11,quad:1,xp:130,role:'flanker',brv:55,pack:1},
 barbskald:{n:'Skald',hp:62,arm:35,helm:20,ms:46,md:6,rd:10,init:104,d:[12,20],xp:260,role:'caster',brv:70,lead:1,max:1,sub:'barbz',res:{mana:[24,6]},abs:['bsong']},
 barbhus:{n:'Huscarl champion',hp:155,arm:170,helm:130,ms:72,md:14,rd:14,init:92,d:[44,64],w:'waraxe',xp:450,role:'line',brv:90,shield:{hp:64,md:12,rd:12},abs:['shieldwall','osmash']},
 emperor:{n:'The Barbarian Emperor',hp:340,arm:270,helm:210,ms:84,md:16,rd:12,init:108,d:[64,90],kb:2,kbCh:.6,big:1,boss:1,xp:2000,role:'boss',brv:99,fearless:1,lead:1,ign:.35,abs:['ecleave','ehorn','ocharge'],
  crph:[{at:.66,n:'The war-horn',say:'The Emperor sounds the war-horn. Berserkers come howling over the palisade.',summon:['barbz','barbz']},{at:.33,n:'The last oath',say:'Bleeding, the Emperor swears on his crown: he will not fall alone.',enrage:{dmg:.3,ms:10,md:5,ap:2},heal:.12}]}
});
Object.assign(FACT,{
 dead:{n:'The Dead March',g:'U',col:'#8a8f7a',skin:'#e4e0cf',tier:'crisis',crisis:'deadmarch',biomes:null,lair:'Break a risen host',units:[['skel',15],['zomb',14],['skelhal',21],['necro',30],['gknight',52]],rank:[.32,1.4,0,17],loot:['shortsword','kite','mail','halberd','bill','scale'].filter(id=>ITEMS[id])},
 horde:{n:'The Great Horde',g:'O',col:'#5e7a3a',skin:'#7c9b62',tier:'crisis',crisis:'horde',biomes:null,lair:'Break a horde war band',units:[['gob',10],['gobarch',12],['orcy',38],['orcw',62],['obrute',60],['hstd',58]],rank:[.46,1.55,.3,19],loot:['handaxe','waraxe','greataxe','leather','scale','maul','spiked'].filter(id=>ITEMS[id])},
 barb:{n:'Barbarians',g:'B',col:'#8a5a3a',skin:'#e0b48e',tier:'crisis',crisis:'barbarian',biomes:null,lair:'Break a barbarian war party',units:[['barbz',40],['barbax',30],['barbhound',22],['barbskald',36],['barbhus',70]],rank:[.46,1.5,.3,19],loot:['handaxe','waraxe','greataxe','roundshield','leather','mail','scale','spear'].filter(id=>ITEMS[id])}
});
if(FACT.void)FACT.void.crisis='sunder';
// situations of a town in a crisis (prices, recruits, contracts, prosperity; drawn on the world by 41-worldart.js)
Object.assign(SITS,{
 crsiege:{n:'Besieged',d:'A crisis host is camped before the walls. In two days the town falls unless someone breaks the siege.',icon:'sit-siege',price:{buy:1.2,sell:.85,food:1.6},recruits:.6,contracts:{crdefend:3,defend:2},dur:[2,3],pros:-3,stock:.7},
 haunted:{n:'Haunted',d:'The dead hold the town. Its people have fled or joined the march. Nothing is sold here until it is cleansed.',icon:'sit-plague',price:{buy:1.5,sell:.6,food:2},recruits:0,contracts:{},dur:[60,60],pros:-6,stock:0},
 occupied:{n:'Held by the horde',d:'Orc war banners fly from the walls. The horde holds the town until it is liberated.',icon:'sit-raided',price:{buy:1.5,sell:.6,food:2},recruits:0,contracts:{},dur:[60,60],pros:-5,stock:0},
 sacked:{n:'Sacked',d:'Barbarians burned the town and carried off its stores. Goods are scarce and the survivors want vengeance.',icon:'sit-raided',price:{buy:1.3,sell:.8,food:1.6},recruits:.5,contracts:{crhunt:2,bounty:1.5},dur:[6,10],pros:-4,stock:.6},
 burned:{n:'Held by barbarians',d:'Sacked three times, the town is now a barbarian holdfast. It must be retaken.',icon:'sit-raided',price:{buy:1.5,sell:.6,food:2},recruits:0,contracts:{},dur:[60,60],pros:-6,stock:0}
});
// the victory trophies: legendary-tier placeholders (round B gives them their powers). Kind 't': carried, sold, never on a stall.
Object.assign(ITEMS,{
 crshard:{k:'t',n:'Shard of the Sealed Sky',d:'A splinter of the last rift, cold as starlight. A trophy of the Sundering.',price:2500,uniq:1,tier:5,trophy:1,icon:'it-crshard'},
 crbonecrown:{k:'t',n:'Crown of the Bone Throne',d:'Black iron grown through bone. The Dead March ended when it fell.',price:2500,uniq:1,tier:5,trophy:1,icon:'it-crbonecrown'},
 crwartusk:{k:'t',n:'The Warchief\'s Tusk',d:'A great tusk carved with a hundred tallies, torn from the warchief of the Great Horde.',price:2500,uniq:1,tier:5,trophy:1,icon:'it-crwartusk'},
 crempcrown:{k:'t',n:'The Ice Crown',d:'The circlet of the Barbarian Emperor: rough gold set with blue northern ice that never melts.',price:2500,uniq:1,tier:5,trophy:1,icon:'it-crempcrown'}
});

/* ---- choosing and starting ---- */
function crisisKindOf(seed){const r=mulberry(((seed|0)^0x3c6ef372)>>>0);r();return CRKEYS[Math.floor(r()*CRKEYS.length)%CRKEYS.length]}
function runCrisisKind(seed){return crisisKindOf(seed)}
function crisisInit(g){g=g||G;if(!g)return g;if(typeof g.crisisKind!=='string'||!CRISES[g.crisisKind])g.crisisKind=svObj(g.crisis)&&!g.crisis.k?'sunder':crisisKindOf(g.seed);return g}
function crDiff(k){let v=1;if(typeof diffK==='function'){try{v=+diffK(k)}catch(e){v=1}}return v>0&&isFinite(v)?v:1}
function crisisStartDay(){const d=svFin(G&&G.crisisDay)?G.crisisDay:CRK.start;return Math.max(4,Math.round(d*crDiff('crisisDay')))}
function crisisKey(){return G&&G.crisis?G.crisis.k||'sunder':G&&G.crisisKind||null}
function crisisOn(k){const c=G&&G.crisis;return !!(c&&!c.ended&&(!k||(c.k||'sunder')===k))}
// the crisis factions in play now (riftspawn during the Sundering...): spawn pools and contracts read this
function crisisFacts(){const c=G&&G.crisis;if(!c)return[];const k=c.k||'sunder',out=[];if(c.ended&&!c.lost&&k!=='sunder')return out;for(const f in FACT)if(FACT[f].crisis===k)out.push(f);return out}
function startCrisis(){if(!G)return null;crisisInit(G);const k=G.crisisKind,C=CRISES[k];
 G.crisis={k,day:G.day,ended:false,won:false,lost:false,late:false,fin:0,doom:0,str:1,closed:0,total:3,beaten:0};
 try{C.start(G)}catch(e){if(typeof console!=='undefined')console.warn('crisis start failed',e)}
 crHousesUnite();worldNews(C.news0());
 if(typeof sheetOpen!=='undefined'&&sheetOpen)G.note='crisis';else if(typeof sheet==='function')crisisSheet();   // a day can turn inside a town (inn): announce once the town is left
 return G.crisis}
// the houses set their quarrels aside: wars end, relations warm
function crHousesUnite(){if(!Array.isArray(G.houses))return;if(Array.isArray(G.wars)&&G.wars.length){G.wars=[];worldNews('The houses set their wars aside before the common foe')}
 if(G.hrel&&typeof G.hrel==='object')for(const k in G.hrel)G.hrel[k]=clamp(G.hrel[k]+25,-100,100)}

/* ---- the day ---- */
function crisisDay(news){if(!G)return;news=news||[];crisisInit(G);const c=G.crisis;
 if(!c){if(G.day>=crisisStartDay())startCrisis();return}
 if(!c.k)c.k='sunder';const C=CRISES[c.k];if(!C)return;crEnsure();
 if(!c.fin){
  if(c.ended||C.ended(G)){crisisEnd(true);return}
  const age=G.day-c.day;c.str=Math.round(clamp(1+age*.018,1,2.3)*Math.sqrt(crDiff('budget'))*100)/100;
  let dm=0;try{dm=+C.day(G,news)||0}catch(e){if(typeof console!=='undefined')console.warn('crisis day failed',e)}
  c.doom=clamp(Math.round((c.doom+dm)*10)/10,0,CRK.doomLose);crSieges(news);crHousesAct(news);crRivalsAct(news);
  if(C.ended(G))crisisEnd(true);else if(c.doom>=CRK.doomLose)crisisEnd(false)}
 else{try{if(C.after)C.after(G,news)}catch(e){}crSieges(news)}
 G.parties=G.parties.filter(p=>!p.gone)}
// ends the crisis: a victory (rewards, the title, the trophy) or a defeat (the scar). A late victory after a defeat heals the scar.
function crisisEnd(won){const c=G.crisis;if(!c)return;const C=CRISES[c.k];const late=!!c.lost&&won;
 c.ended=true;c.fin=1;if(won){c.won=true;c.late=late;c.wonDay=G.day}else{c.lost=true;c.lostDay=G.day}
 try{won?C.win(G,late):C.lose(G)}catch(e){if(typeof console!=='undefined')console.warn('crisis end failed',e)}
 if(won){const rk=late?.5:1,rn=Math.round(CRK.renown*rk),cr=Math.round(CRK.crowns*rk*(typeof diffK==='function'?crDiff('pay'):1));G.renown+=rn;G.crowns+=cr;c.reward={renown:rn,crowns:cr,item:CRTROPHY[c.k],title:late?null:CRTITLE[c.k]};
  if(ITEMS[CRTROPHY[c.k]])G.stash.push(CRTROPHY[c.k]);if(!late){if(!Array.isArray(G.titles))G.titles=[];if(!G.titles.includes(CRTITLE[c.k]))G.titles.push(CRTITLE[c.k])}
  if(Array.isArray(G.houses))for(const h of G.houses)if(typeof repGain==='function')repGain(h.id,late?6:12,'Ended '+C.n);
  if(typeof repGain==='function')repGain('free',late?6:12,'Ended '+C.n);
  if(Array.isArray(G.crScar))G.crScar=G.crScar.filter(s=>s.k!==c.k);
  worldNews(late?`${G.name||'The company'} broke ${C.n} at last`:`${G.name||'The company'} ended ${C.n}`);if(typeof ambEvent==='function'){try{ambEvent('crisis',{k:c.k})}catch(e){}}}
 else{if(!Array.isArray(G.crScar))G.crScar=[];G.crScar.push({k:c.k,day:G.day,t:C.scar});worldNews(C.scar)}
 G.note=G.note&&G.note!=='crisisEnd'?G.note:'crisisEnd'}
// the end of every host that is not besieging anything: parties of the crisis faction leave the map when the crisis is won
function crDisband(f){for(const p of G.parties)if(p.f===f&&p.cr)p.gone=1}

/* ---- towns ---- */
function crTownHeld(i){const t=G&&G.towns&&G.towns[i];return t&&typeof t.held==='string'&&FACT[t.held]?t.held:null}
function townOwner(i){const t=G&&G.towns&&G.towns[i];if(!t)return null;return crTownHeld(i)||t.own||'free'}
const CRSIT={dead:'haunted',horde:'occupied',barb:'burned'};
function crFall(i,f,news){const t=G.towns[i];if(!t||crTownHeld(i)||i===0&&G.crisis&&G.crisis.k!=='deadmarch'&&false)return false;t.held=f;t.fallen={by:f,day:G.day,prev:t.own||'free'};
 if(typeof townSitDel==='function'){townSitDel(i,'crsiege');townSitAdd(i,CRSIT[f]||'occupied',60)}t.pros=clamp(svNum(t.pros,50)-25,0,100);t.contracts=[];t.recruits=[];
 if(G.crisis&&!G.crisis.fin){G.crisis.doom=clamp(G.crisis.doom+CRK.fallDoom,0,CRK.doomLose);G.crisis.fell=(G.crisis.fell|0)+1}
 const w=f==='dead'?`${t.name} has fallen to the Dead March. Its streets are haunted now`:f==='horde'?`The Great Horde has taken ${t.name}`:`Barbarians hold the burned walls of ${t.name}`;
 worldNews(w);if(news)news.unshift(w);if(G.contract&&G.contract.town===i&&typeof ctrFail==='function'&&!G.contract.failed&&G.contract.type!=='crlib')ctrFail(G.contract,t.name+' fell');return true}
function crFree(i,how,news){const t=G.towns[i];if(!t||!t.held)return false;const f=t.held;t.held=null;delete t.held;const prev=t.fallen&&t.fallen.prev;delete t.fallen;
 if(typeof townSitDel==='function'){townSitDel(i,'haunted');townSitDel(i,'occupied');townSitDel(i,'burned')}t.pros=clamp(svNum(t.pros,50)+8,0,100);t.ref=-99;
 if(G.crisis&&!G.crisis.fin)G.crisis.doom=clamp(G.crisis.doom+CRK.freeDoom,0,CRK.doomLose);
 const w=how==='company'?`${G.name||'The company'} ${f==='dead'?'cleansed':'liberated'} ${t.name}`:how&&how!=='end'?`${factName(how)} retook ${t.name}`:`${t.name} is free again`;
 if(how==='company'){if(typeof repGain==='function'){repGain(t.own||'free',15,(f==='dead'?'Cleansed ':'Liberated ')+t.name);if(prev&&prev!==t.own)repGain(prev,6,'Freed '+t.name)}G.renown+=10;if(G.crisis)G.crisis.freed=(G.crisis.freed|0)+1}
 worldNews(w);if(news)news.unshift(w);return true}
// a crisis host besieging town i (or null)
function crSiegeHost(i){for(const p of G.parties)if(p.cr&&!p.gone&&p.siegeT===i)return p;return null}
// sieges run their course: two days after a host camps before a town, it falls unless it holds
function crSieges(news){for(const p of G.parties){if(!p.cr||p.gone||p.siegeT==null)continue;const i=p.siegeT,t=G.towns[i];if(!t||crTownHeld(i)){p.siegeT=null;p.gone=1;continue}
  if(G.day-p.sday<CRK.siegeDays+(G.crisis&&G.day-G.crisis.day<12?2:0))continue;   // the first sieges of a crisis are slower: time to answer them
  const H=Array.isArray(G.houses)&&G.houses.find(h=>h.seat===i),hold=clamp(.32+.08*(t.size|0)+(H?.15:0)+.05*(G.crisis&&G.crisis.fell|0)-.12*((p.mult||1)-1),.1,.7);   // each fallen town stiffens the rest
  if(p.cr==='raid'){crSack(i,p,news);continue}
  if(rnd()<hold){p.gone=1;townSitDel(i,'crsiege');const w=`${t.name} held against ${factName(p.f).replace(/^The /,'the ')}`;worldNews(w);news.push(w);continue}
  p.gone=1;crFall(i,p.f,news)}}
function crSack(i,p,news){const t=G.towns[i];townSitDel(i,'crsiege');townSitAdd(i,'sacked',8);t.pros=clamp(svNum(t.pros,50)-18,0,100);t.sacks=(t.sacks|0)+1;const c=G.crisis;if(c&&!c.fin)c.doom=clamp(c.doom+4,0,CRK.doomLose);
 if(t.sacks>=3&&!crTownHeld(i)&&i!==0){crFall(i,'barb',news);p.gone=1;return}
 const w=`Barbarians sacked ${t.name}`;worldNews(w);news.push(w);crHomeward(p)}
// a barbarian raid goes home with its plunder
function crHomeward(p){const c=G.crisis,cp=c&&c.camp;p.siegeT=null;if(!cp){p.gone=1;return}const r=wsPathTo(p.x,p.y,cp.x,cp.y);if(!r){p.gone=1;return}p.pts=r;p.pi=0;p.back=1;p.tx=r[0].x;p.ty=r[0].y;p.goal='raid'}
// houses fight back: their patrols retake held towns now and then
function crHousesAct(news){if(!Array.isArray(G.houses))return;G.towns.forEach((t,i)=>{if(!crTownHeld(i))return;const h=G.houses.find(h=>h.id===(t.fallen&&t.fallen.prev));if(!h)return;
  if(G.day-(t.fallen.day|0)<6)return;if(rnd()<.035*(houseTowns(h.id).length>=2?1:.5))crFree(i,h.id,news)})}
// rival companies fight crisis hosts they meet (the crisis contracts they take are resolved in rvResolve)
function crRivalsAct(news){if(typeof rivalAlive!=='function')return;for(const r of rivalAlive()){const rp=typeof rivalParty==='function'?rivalParty(r):null;if(!rp)continue;
  for(const p of G.parties){if(!p.cr||p.gone||Math.hypot(p.x-rp.x,p.y-rp.y)>3*TS)continue;if(rnd()>=.25)break;const win=rnd()<clamp(.55+(rvMult(r)-(p.mult||1))*.4,.2,.85);
   if(win){p.gone=1;r.renown+=8;if(G.crisis&&!G.crisis.fin)G.crisis.doom=Math.max(0,G.crisis.doom-1);if(p.siegeT!=null)townSitDel(p.siegeT,'crsiege');rvDeed(r,`Routed ${crHostName(p)}`);const w=`${r.n} routed ${crHostName(p)}`;worldNews(w);news.push(w)}
   else{r.rest=2;rvDeed(r,`Beaten back by ${crHostName(p)}`);if(r.roster.length>1&&rnd()<.4)r.roster.pop()}break}}}

/* ---- hosts ---- */
// spawns a crisis host at (x,y) marching on town `to`; extra fields copied (cr, lt, spd, mult)
function crHost(f,x,y,to,o){if(!G.towns[to])return null;const p=wsSpawnRaid(f,x,y,to,o&&o.mult||Math.round((.8+rnd()*.25)*(G.crisis?G.crisis.str:1)*100)/100);if(!p)return null;p.cr='host';p.spd=7;if(o)Object.assign(p,o);return p}
function crHosts(f){return G.parties.filter(p=>p.cr&&!p.gone&&(!f||p.f===f))}
function crHostName(p){if(!p)return'a host';const C=G.crisis;if(p.cr==='lt'&&C&&C.lts&&C.lts[p.lt])return`the host of ${C.lts[p.lt].n}`;if(p.cr==='chief')return'the warchief\'s band';
 if(p.cr==='hhost')return`a host of ${factName(p.f)}`;return p.f==='dead'?'a risen host':p.f==='horde'?'a horde war band':p.f==='barb'?'a barbarian war party':'a crisis host'}
// the nearest towns to (x,y) not yet held, nearest first (index list)
function crTownsNear(x,y,n,skip){const L=[];G.towns.forEach((t,i)=>{if(!crTownHeld(i)&&!(skip&&skip(i)))L.push(i)});L.sort((a,b)=>Math.hypot(G.towns[a].x-x,G.towns[a].y-y)-Math.hypot(G.towns[b].x-x,G.towns[b].y-y)||a-b);return L.slice(0,n||L.length)}
function crTargeted(i){for(const p of G.parties)if(p.cr&&!p.gone&&(p.to===i&&!p.back||p.siegeT===i))return true;return false}
// a host reaches the end of its march (wsArrive in 40-world.js asks first): true when it has handled it
function crArrive(p){if(!p.cr)return false;if(p.back){p.gone=1;const c=G.crisis;if(c&&c.camp)c.camp.str=clamp((c.camp.str|0)+4,0,100);return true}
 if(p.cr==='hhost'){crHouseHostArrive(p);return true}
 const i=p.to,t=G.towns[i];if(!t||crTownHeld(i)){p.gone=1;return true}
 p.siegeT=i;p.sday=G.day;p.pts=null;p.pi=0;townSitAdd(i,'crsiege',CRK.siegeDays+1);const w=`${crHostName(p).replace(/^./,s=>s.toUpperCase())} has camped before ${t.name}`;worldNews(w);
 const a=(p.id%8)*.785,q={x:t.x+Math.cos(a)*1.3*TS,y:t.y+Math.sin(a)*1.3*TS};if(okAt(q.x,q.y)){p.x=q.x;p.y=q.y}p.tx=p.x;p.ty=p.y;p.pts=[{x:Math.round(p.x),y:Math.round(p.y)}];p.pi=0;p.camped=1;return true}
// a wild spot: walkable, at least minT tiles from every town, scored by fn(tx,ty) (higher is better); from a seeded stream of its own
function crSpot(minT,score,salt,avoid){const r=mulberry(((G.seed|0)^(salt|0)^0x2545f491)>>>0),F=typeof worldFields==='function'?worldFields():null;let best=null,bv=-1e9;
 for(let k=0;k<1400;k++){const x=2+Math.floor(r()*(WN-4)),y=2+Math.floor(r()*(WN-4)),i=y*WN+x;if(!W.ok[i]||W.road[i]||W.river[i])continue;if(F&&F.td[i]<minT)continue;
  const px=(x+.5)*TS,py=(y+.5)*TS;if(avoid&&avoid.some(a=>Math.hypot(a.x-px,a.y-py)<(a.r||6)*TS))continue;if(G.towns.some(t=>Math.hypot(t.x-px,t.y-py)<minT*TS))continue;
  const v=score(x,y)+r()*.01;if(v>bv){bv=v;best={x:px,y:py}}}
 return best||randOk(G.towns[0].x,G.towns[0].y,10,26)}
function crSite(kind,x,y,o){const s=Object.assign({id:G.nid++,kind,x,y,n:0,cr:1},o||{});if(!Array.isArray(G.sites))G.sites=[];G.sites.push(s);return s}
function crSiteOf(kind){return Array.isArray(G.sites)?G.sites.find(s=>s.kind===kind):null}
function crDropSite(kind){if(Array.isArray(G.sites))G.sites=G.sites.filter(s=>s.kind!==kind)}

/* ---- battles ---- */
// a fabled warrior may lead a crisis army or guard its boss (21-fabled.js)
function crFabled(o,ctx){if(typeof fabledFor!=='function')return o;let id=null;try{id=fabledFor(Object.assign({k:'crisis',crisis:G.crisis&&G.crisis.k,salt:(G.crisis&&G.crisis.beaten|0)+(G.day|0)*7,exclude:[]},ctx||{}))}catch(e){id=null}
 if(id)o.fabled=Array.isArray(id)?id.slice(0,2):[id];return o}
function crBiomeAt(x,y){const t=tileAt(x,y);return BIOKEY[t]&&BIO[BIOKEY[t]]?BIOKEY[t]:'plains'}
// partyBattle (40-world.js) hands crisis hosts here: lieutenants and chiefs fight as bosses
function crPartyBattle(p,o){const c=G.crisis;if(!p.cr||!c)return o;o.src.cr=p.cr;
 if(p.cr==='lt'&&c.lts&&c.lts[p.lt]){const L=c.lts[p.lt];o.boss=crBoss('necrolt',L.n,'Lieutenant of the Dead March');o.fixed=['necrolt'];o.mult=Math.max(o.mult,1)}
 if(p.siegeT!=null){o.obj={k:'siege'};o.src.siege=p.siegeT}
 return o}
// boss options for startBattle (60-battle-core / 21-fabled bossSetup): phases from the EN entry (crph), enrage round
function crBoss(id,name,title,er){const o={id,name,title};const d=EN[id];if(d&&Array.isArray(d.crph))o.phases=d.crph.map(p=>Object.assign({},p));if(er)o.enrageRound=er;return o}
function crBattle(k,what,o){o=Object.assign({src:{type:'crisis',k,what}},o);return o}
/* worldBattleEnd hands crisis battles and crisis hosts here (before the party is removed). Returns true when it handled the src. */
function crisisBattleEnd(s,win,out){const c=G.crisis;if(!c)return false;
 if(s.type==='party'){const p=G.parties.find(q=>q.id===s.id);if(!p||!p.cr)return false;if(!win)return true;
  const C=CRISES[c.k];c.beaten=(c.beaten|0)+1;if(!c.fin)c.doom=clamp(c.doom+CRK.beatDoom,0,CRK.doomLose);
  if(p.siegeT!=null){const t=G.towns[p.siegeT];townSitDel(p.siegeT,'crsiege');if(t){if(typeof repGain==='function')repGain(t.own||'free',10,'Broke the siege of '+t.name);worldNews(`${G.name||'The company'} broke the siege of ${t.name}`)}}
  else if(p.to!=null&&G.towns[p.to]&&!p.back&&typeof repGain==='function')repGain(G.towns[p.to].own||'free',5,'Stopped a host bound for '+G.towns[p.to].name);
  try{if(C.onBeat)C.onBeat(G,p)}catch(e){}
  if(out){out.crowns=(out.crowns||0)+Math.round(40+30*(p.mult||1))}G.renown+=4;G.parties=G.parties.filter(q=>q.id!==p.id);return true}
 if(s.type!=='crisis')return false;const C=CRISES[s.k||c.k];if(!C)return true;
 if(s.what==='town'){if(win){crFree(s.i,'company');if(out)out.crowns=(out.crowns||0)+150}return true}
 if(C.onBattle){try{C.onBattle(G,s,win,out)}catch(e){if(typeof console!=='undefined')console.warn('crisis battle',e)}}return true}

/* ---- multi-stage assaults: c.as = {k, stage} ---- */
function crAssault(k){const c=G.crisis,C=CRISES[k||c&&c.k];if(!c||!C||!C.stages)return null;c.as={stage:0};return crAssaultFight()}
function crAssaultFight(){const c=G.crisis,C=c&&CRISES[c.k];if(!c||!c.as||!C)return null;const o=C.stages(G,c.as.stage);if(!o)return null;G.moving=false;G.route=[];engage(o);return o}
function crAssaultNext(){const c=G.crisis;if(!c||!c.as)return;if(typeof closeSheet==='function')closeSheet(true);crAssaultFight()}
function crAssaultStop(){const c=G.crisis;if(c)c.as=null;if(typeof closeSheet==='function')closeSheet()}
// after a won stage: the company catches its breath, and the next fight waits behind a sheet (G.note 'crisisNext')
function crAssaultWon(n){const c=G.crisis;c.as.stage++;G.roster.forEach(m=>{const mx=calc(m).hp;m.hp=Math.min(mx,m.hp+Math.round(mx*.15))});if(c.as.stage<n)G.note='crisisNext';else c.as=null}
function crNextSheet(){const c=G.crisis,C=c&&CRISES[c.k];if(!c||!c.as||!C)return;const st=C.stageInfo(c.as.stage);
 sheet(`<h2>${st.n}</h2><p>${st.d}</p><p class="dim">The company catches its breath (+15% HP). Fight ${c.as.stage+1} of ${C.nStages}.</p><div class="row"><button class="pri" style="flex:1" onclick="crAssaultNext()">Press on</button><button onclick="crAssaultStop()">Fall back</button></div>`)}

/* ---- sheets ---- */
function crBar(v,col){const p=clamp(Math.round(v),0,100);return`<div class="cr-bar" role="img" aria-label="${p} of 100" style="height:8px;background:#1f2a2a;border:1px solid #0b1212;margin:4px 0 8px"><div style="width:${p}%;height:100%;background:${col||'#c0503a'}"></div></div>`}
function crisisSheet(){const k=crisisKey(),C=CRISES[k];if(!C)return;const c=G.crisis;let body=C.sheet();
 if(c){const st=c.won?(c.late?'<p class="good">Broken at last. The scar heals.</p>':'<p class="good">Victory. The crisis is over.</p>'):c.lost?`<p class="bad">${C.scar}</p>`:`<p class="dim">Doom: ${Math.round(c.doom)} of 100. At 100 the crisis wins and leaves its scar on the land.</p>${crBar(c.doom)}`;
  body+=st}
 sheet(`<h2>${C.n}</h2>${body}<button class="pri" onclick="closeSheet()">${c&&!c.ended?'To arms':'Close'}</button>`)}
function crisisEndSheet(){const c=G.crisis,C=c&&CRISES[c.k];if(!C)return;let h='';
 if(c.won){const R=c.reward||{};h=`<h2>${C.n}: ${c.late?'broken at last':'victory'}</h2><p>${C.winText}</p><p>The company gains <b>${R.renown||0} renown</b> and <span class="coin">${R.crowns||0} crowns</span>${R.item&&ITEMS[R.item]?`, and carries off <b>${ITEMS[R.item].n}</b>`:''}.</p>${R.title?`<p class="good">The land has a name for you now: <b>${R.title}</b>.</p>`:''}`}
 else h=`<h2>${C.n}: the land is lost</h2><p>${C.loseText}</p><p class="bad">${C.scar}</p><p class="dim">The run goes on. ${C.lateText}</p>`;
 sheet(h+'<button class="pri" onclick="closeSheet()">March on</button>')}
function crisisLine(){const c=G&&G.crisis,C=c&&CRISES[c.k||'sunder'];if(!C)return G&&G.crisisKind&&G.day<crisisStartDay()?'The seers mutter about dark days ahead.':'';if(c.won)return C.n+': over'+(c.late?' (broken late)':'');if(c.lost&&!c.won)return C.n+': lost. '+C.scar;return C.line()+` · doom ${Math.round(c.doom)}`}
function crisisOutcome(){const c=G&&G.crisis,C=c&&CRISES[c.k||'sunder'];if(!c)return{k:G&&G.crisisKind||null,n:G&&CRISES[G.crisisKind]?CRISES[G.crisisKind].n:'',state:'none',line:'The crisis never came'};
 const state=c.won?(c.late?'late':'won'):c.lost?'lost':'active';return{k:c.k,n:C.n,state,title:c.won&&!c.late?CRTITLE[c.k]:null,doom:Math.round(c.doom),line:state==='won'?`Ended ${C.n}`:state==='late'?`Lost to ${C.n}, then broke it`:state==='lost'?`Lost to ${C.n}`:`${C.n} still rages`}}
function crisisNews(){return Array.isArray(G&&G.news)?G.news.slice(-6).reverse():[]}
// map markers of the crisis: its sites and hosts the company knows of
function crisisMarks(){const c=G&&G.crisis;if(!c)return[];const C=CRISES[c.k];let L=[];try{L=C.marks()}catch(e){L=[]}
 for(const p of G.parties)if(p.cr&&!p.gone&&p.cr!=='hhost'&&typeof seenAt==='function'&&seenAt(Math.floor(p.x/TS),Math.floor(p.y/TS)))L.push({x:p.x,y:p.y,kind:p.siegeT!=null?'crsiege':'crhost',label:crHostName(p),f:p.f});
 G.towns.forEach((t,i)=>{if(crTownHeld(i))L.push({x:t.x,y:t.y,kind:'crheld',label:t.name+': '+(SITS[CRSIT[t.held]]||{n:'held'}).n,f:t.held,town:i})});return L}
// arriving at a town the crisis holds: the fight to take it back
function crTownSheet(i){const t=G.towns[i],f=crTownHeld(i);if(!t||!f)return false;const S=SITS[CRSIT[f]]||SITS.occupied;
 sheet(`<h2>${htmlEsc(t.name)}: ${S.n.toLowerCase()}</h2><p>${S.d}</p><p class="dim">${f==='dead'?'The dead stand guard in the gateway. Cut down their warden and the rest crumble.':'The gates are barred and the walls are manned. Kill their leader and the rest will break.'}</p>
 <div class="row"><button class="pri" style="flex:1" onclick="crTownFight(${i})">${f==='dead'?'Cleanse the town':'Storm the gate'}</button><button onclick="closeSheet()">Withdraw</button></div>`);return true}
function crTownFight(i){const t=G.towns[i],f=crTownHeld(i);if(!t||!f)return null;const c=G.crisis,str=c?c.str:1;if(typeof closeSheet==='function')closeSheet(true);
 const o=crBattle(c?c.k:'',`town`,{f,mult:Math.round(clamp(1.05*str,.9,2.4)*100)/100,obj:{k:'siege'},biome:crBiomeAt(t.x,t.y)});o.src.i=i;G.moving=false;G.route=[];engage(o);return o}
// arriving at a crisis site (siteSheet in 40-world.js asks first): true when it was one
function crSiteSheet(s){if(!s||!s.cr)return false;const c=G.crisis,C=c&&CRISES[c.k];if(C&&C.site&&C.site(s))return true;
 sheet(`<h2>${htmlEsc(CRSITEN[s.kind]||'A dark place')}</h2><p>${CRSITED[s.kind]||'Nothing stirs here now.'}</p><button class="pri" onclick="closeSheet()">Move on</button>`);return true}
const CRSITEN={grave:'A risen graveyard',throne:'The Bone Throne',hcamp:'The horde camp',ecamp:'The Emperor\'s Camp',hruin:'Haunted ruins'};
const CRSITED={grave:'Open graves and broken coffins. The earth is turned as if something dug its way out.',throne:'A hill of bones.',hcamp:'Trampled ground and cold fires: the horde has moved on.',ecamp:'Charred palisade stakes in the snow.',hruin:'Cold stones. Nobody lingers here.'};
function crSiteBtn(label,fn){return`<div class="row"><button class="pri" style="flex:1" onclick="${fn}">${label}</button><button onclick="closeSheet()">Not yet</button></div>`}

/* ---- saves ---- */
function crEnsure(){if(!G||!Array.isArray(G.towns))return;for(const t of G.towns){if(t.held&&!FACT[t.held]){delete t.held;delete t.fallen}if(t.held&&typeof t.sit==='object'&&Array.isArray(t.sit)&&!t.sit.some(s=>s.k===CRSIT[t.held]))t.sit.push({k:CRSIT[t.held]||'occupied',days:60})}}
function crisisRepair(g){g=g||G;if(!g)return'';crisisInit(g);
 if(svObj(g.crisis)){const c=g.crisis;if(!CRISES[c.k])c.k='sunder';c.closed=Math.max(0,Math.floor(svNum(c.closed,0)));c.total=Math.max(1,Math.floor(svNum(c.total,3)));c.ended=!!c.ended;
  c.day=Math.max(1,Math.floor(svNum(c.day,svNum(g.day,1))));c.doom=clamp(svNum(c.doom,0),0,CRK.doomLose);c.str=clamp(svNum(c.str,1),1,4);c.won=!!c.won;c.lost=!!c.lost;c.late=!!c.late;c.beaten=Math.max(0,Math.floor(svNum(c.beaten,0)));
  if(c.fin==null)c.fin=c.ended?1:0;c.fin=c.fin?1:0;if(c.ended&&!c.won&&!c.lost&&c.k==='sunder'){c.won=true;c.fin=1}
  if(c.as&&!(svObj(c.as)&&Number.isInteger(c.as.stage)))c.as=null;if(c.camp&&!(svObj(c.camp)&&svFin(c.camp.x)&&svFin(c.camp.y)))c.camp=null;if(c.camp)c.camp.str=clamp(svNum(c.camp.str,100),0,100);
  if(c.lts&&!Array.isArray(c.lts))c.lts=null;if(Array.isArray(c.lts))c.lts=c.lts.filter(svObj).map(l=>({n:typeof l.n==='string'?l.n.slice(0,40):'A lieutenant',alive:!!l.alive,day:svNum(l.day,0)}));
  const C=CRISES[c.k];if(C&&C.repair)try{C.repair(g,c)}catch(e){}}
 else g.crisis=null;
 if(Array.isArray(g.towns))for(const t of g.towns){if(t.held!=null&&!(typeof t.held==='string'&&FACT[t.held]&&FACT[t.held].crisis)){delete t.held;delete t.fallen}if(t.fallen&&!svObj(t.fallen))delete t.fallen;if(t.sacks!=null)t.sacks=Math.max(0,Math.floor(svNum(t.sacks,0)))}
 if(g.crScar!=null&&!Array.isArray(g.crScar))g.crScar=[];if(Array.isArray(g.crScar))g.crScar=g.crScar.filter(s=>svObj(s)&&CRISES[s.k]).slice(0,4);
 if(g.titles!=null&&!Array.isArray(g.titles))delete g.titles;if(Array.isArray(g.titles))g.titles=g.titles.filter(x=>typeof x==='string').slice(0,12);
 if(Array.isArray(g.parties))for(const p of g.parties){if(p.cr!=null&&typeof p.cr!=='string')delete p.cr;if(p.siegeT!=null&&!(Number.isInteger(p.siegeT)&&p.siegeT>=0&&p.siegeT<(g.towns||[]).length))p.siegeT=null}
 return''}

/* ============================================================ THE FOUR CRISES ============================================================ */
const CRISES={
/* ---------- the Sundering: three rifts tear open; riftspawn pour through. Close them all. ---------- */
sunder:{n:'The Sundering',f:'void',icon:'mana',d:'The sky splits. Rifts tear open across the land and riftspawn pour through them.',
 news0:()=>'The sky splits: rifts have torn open across the land',
 scar:'The rifts stay open: riftspawn roam the land and new tears open in the sky.',
 winText:'The last rift collapses behind you and the sky heals over. Lesser rifts may still open now and then.',
 loseText:'The tears in the sky have grown past closing. They have become part of the land.',
 lateText:'Rifts can still be closed, and the last of the old three will end the Sundering yet.',
 start(G){const c=G.crisis;c.total=3;c.closed=0;for(let i=0;i<3;i++)addPortal();for(let i=0;i<3;i++)spawnParty('void')},
 day(G,news){const c=G.crisis,n=G.portals.length,age=G.day-c.day;
  if(age>0&&age%12===0&&n<5){addPortal();const w='A new rift tears open in the sky';worldNews(w);news.push(w)}
  return .45*Math.max(1,G.portals.length)},
 ended(G){const c=G.crisis;return c.closed>=c.total},
 win(G){},lose(G){},
 after(G,news){const c=G.crisis;if(G.day%6===0&&G.portals.length<(c.lost&&!c.won?3:2))addPortal()},
 onBeat(){},
 marks(){return G.portals.filter(p=>seenAt(Math.floor(p.x/TS),Math.floor(p.y/TS))).map(p=>({x:p.x,y:p.y,kind:'rift',label:'A rift to '+(BIO[p.realm]?BIO[p.realm].n:'elsewhere'),f:'void'}))},
 line(){const c=G.crisis;return`Rifts closed: ${c.closed} of ${c.total}`},
 sheet(){const c=G.crisis;return`<p>The sky splits. Rifts have torn open across the land and riftspawn pour through them.</p><p class="dim">Each rift leads to another world: three battles with no rest between them, and a tyrant at the end. Close three rifts to end the Sundering. Every rift left open feeds the doom, and every twelve days a new one tears open.</p>${c?`<p>Rifts closed: <b>${c.closed} of ${c.total}</b>. Open now: <b>${G.portals.length}</b>.</p>`:''}`}},

/* ---------- the Dead March: graveyards raise hosts each night; lieutenants lead them; the Bone Throne commands them ---------- */
deadmarch:{n:'The Dead March',f:'dead',icon:'skull',d:'The graveyards empty. Risen hosts march on the towns, led by necromancer lieutenants, and somewhere the Bone Throne calls them.',
 news0:()=>'The graves are opening: the dead are on the march',
 scar:'The Dead March goes on: the graveyards still raise the dead, and the haunted towns stay haunted.',
 winText:'The Bone Throne breaks apart under your blades. Across the land the risen fall where they stand, and the graveyards are quiet.',
 loseText:'The Bone Throne has gathered enough of the dead to stand forever. The march will never quite end now.',
 lateText:'The Bone Throne can still be broken, if the company can reach it.',
 start(G){const c=G.crisis,n=WN<=64?3:4,av=[];c.total=3;c.closed=0;c.clues=0;
  c.lts=[];const names=CR_LTN.slice();for(let i=0;i<3;i++){const j=ri(0,names.length-1);c.lts.push({n:names.splice(j,1)[0],alive:true,day:0})}
  const T0=G.towns[0];for(let g=0;g<n;g++){const p=crSpot(7,(x,y)=>{const px=(x+.5)*TS,py=(y+.5)*TS;let d=1e9;for(const a of av)d=Math.min(d,Math.hypot(a.x-px,a.y-py));return Math.min(d,30*TS)/TS-Math.abs(Math.hypot(px-T0.x,py-T0.y)/TS-18)*.3},0x9a0+g*77,av.map(a=>({x:a.x,y:a.y,r:9})));
   av.push(p);crSite('grave',p.x,p.y,{n:g})}
  const t=crSpot(8,(x,y)=>Math.hypot((x+.5)*TS-T0.x,(y+.5)*TS-T0.y)/TS,0x7b3,av.map(a=>({x:a.x,y:a.y,r:5})));c.throne={x:t.x,y:t.y,known:0};
  {const g=G.sites.find(s=>s.kind==='grave');if(g)crRaise(g.x,g.y,1)}},
 day(G,news){const c=G.crisis,age=G.day-c.day,cap=Math.min(8,CRK.hostCap+Math.floor(age/10)),H=crHosts('dead');let n=H.length;
  // night: every graveyard may raise a host; haunted towns raise them too
  for(const s of G.sites){if(s.kind!=='grave'||n>=cap)continue;if(rnd()<.12*c.str){if(crRaise(s.x,s.y,1))n++}}
  G.towns.forEach((t,i)=>{if(n<cap&&crTownHeld(i)==='dead'&&rnd()<.12){if(crRaise(t.x,t.y+TS,1,i))n++}});
  // the lieutenants take the field in turn
  for(let i=0;i<c.lts.length;i++){const L=c.lts[i];if(!L.alive||H.some(p=>p.cr==='lt'&&p.lt===i)||G.day-L.day<8||rnd()>=.25)continue;const g=G.sites.filter(s=>s.kind==='grave');const s=g.length?g[i%g.length]:null;if(!s)break;
   if(crRaise(s.x,s.y,1.15,null,{cr:'lt',lt:i})){L.day=G.day;const w=`${L.n} leads a host out of the graves`;worldNews(w);news.push(w)}break}
  if(!c.throne.known&&(c.clues>=4||c.doom>=70))crThroneReveal(news);
  return .5+.25*G.towns.filter((t,i)=>crTownHeld(i)==='dead').length},
 ended(G){return !!G.crisis.throneDown},
 win(G){crDisband('dead');crDropSite('grave');crDropSite('throne');G.towns.forEach((t,i)=>{if(crTownHeld(i)==='dead')crFree(i,'end')})},
 lose(G){crThroneReveal()},
 after(G,news){const c=G.crisis;if(c.won)return;if(G.day%3===0&&crHosts('dead').length<4){const g=G.sites.filter(s=>s.kind==='grave');if(g.length)crRaise(g[G.day%g.length].x,g[G.day%g.length].y,.9)}},
 onBeat(G,p){const c=G.crisis;c.clues=(c.clues|0)+(p.cr==='lt'?2:1);if(p.cr==='lt'&&c.lts[p.lt]&&c.lts[p.lt].alive){const L=c.lts[p.lt];L.alive=false;c.closed++;if(!c.fin)c.doom=clamp(c.doom+CRK.ltDoom,0,CRK.doomLose);worldNews(`${L.n} is destroyed`);
   if(typeof toast==='function')toast(`${L.n} is destroyed. ${c.closed>=2&&!c.throne.known?'Her papers name a hill of bones.':''}`)}
  if(!c.throne.known&&c.clues>=4)crThroneReveal()},
 onBattle(G,s,win){const c=G.crisis;if(s.what==='throne'&&win){c.throneDown=1;c.closed=c.total;if(c.fin&&c.lost)crisisEnd(true)}},
 site(s){const c=G.crisis;if(s.kind==='throne'){sheet(`<h2>The Bone Throne</h2><p>A hill of bones, and on it a throne grown out of them: the heart of the Dead March. Something seated there turns its skull toward you.</p><p class="dim">The throne fights from where it stands, raising the fallen and pouring out grave-cold. Its servants ${c.closed?`are fewer: ${c.closed} of its lieutenants are destroyed`:'are many: none of its lieutenants has fallen'}. Break it and the march ends.</p>${crSiteBtn('Assault the throne','crThroneFight()')}`);return true}
  if(s.kind==='grave'){sheet(`<h2>A risen graveyard</h2><p>Open graves, broken coffins, the earth turned as if from below. Each night another host claws its way out of here.</p><p class="dim">Graveyards cannot be destroyed while the Bone Throne stands: follow the hosts, destroy the lieutenants, and find it.</p><button class="pri" onclick="closeSheet()">Move on</button>`);return true}
  return false},
 marks(){const c=G.crisis,L=[];for(const s of G.sites)if(s.kind==='grave'&&seenAt(Math.floor(s.x/TS),Math.floor(s.y/TS)))L.push({x:s.x,y:s.y,kind:'grave',label:'A risen graveyard',f:'dead'});
  if(c.throne&&c.throne.known)L.push({x:c.throne.x,y:c.throne.y,kind:'throne',label:'The Bone Throne',f:'dead'});return L},
 line(){const c=G.crisis;return`Lieutenants slain: ${c.closed} of 3${c.throne&&c.throne.known?' · the Bone Throne is found':''}`},
 sheet(){const c=G.crisis,held=G.towns.filter((t,i)=>crTownHeld(i)==='dead').length;return`<p>The graveyards are emptying. Each night risen hosts claw their way out and march on the nearest towns. Necromancer lieutenants lead the strongest of them, and somewhere a Bone Throne calls them all.</p>
  <p class="dim">Break the hosts before they reach the walls: a besieged town falls in two days. Each host beaten, and each lieutenant above all, tells you more of where the Bone Throne stands. Destroy the throne to end the march. Towns that fall become haunted: cleanse them to take them back.</p>
  ${c?`<p>Lieutenants: ${c.lts.map(l=>l.alive?`<b>${htmlEsc(l.n)}</b>`:`<s>${htmlEsc(l.n)}</s>`).join(', ')}.</p><p>The Bone Throne: <b>${c.throne&&c.throne.known?'found (marked on the map)':`not yet found (${Math.min(4,c.clues|0)} of 4 clues)`}</b>. Haunted towns: <b>${held}</b>.</p>`:''}`}},

/* ---------- the Great Horde: it gathers in the wilds, sends war bands that take towns; the warchief must fall ---------- */
horde:{n:'The Great Horde',f:'horde',icon:'swords',d:'Orc and goblin tribes gather under one warchief. War bands march out and take the towns one by one.',
 news0:()=>'War drums in the wilds: the orc tribes are gathering into a Great Horde',
 scar:'The Great Horde has carved out a realm: the towns it holds stay under its banners until someone takes them back.',
 winText:'The warchief falls and the Great Horde breaks into a hundred squabbling tribes. Its war bands scatter into the wilds.',
 loseText:'The Great Horde has carved a realm of its own out of the land. Its war camp has become a fortress.',
 lateText:'The warchief still sits in his camp. He can still be killed.',
 nStages:2,
 stageInfo(i){return i===0?{n:'The war camp',d:'Totems, wolf pens and a ditch of stakes. The horde fights from behind its earthworks.'}:{n:'The warchief',d:'In the ring of skulls at the heart of the camp the warchief waits with his standard-bearers.'}},
 start(G){const c=G.crisis,T0=G.towns[0];c.total=1;c.closed=0;c.gather=G.day+3;c.chief={n:pick(CR_CHIEFN),alive:true};
  const p=crSpot(9,(x,y)=>Math.min(34,Math.hypot((x+.5)*TS-T0.x,(y+.5)*TS-T0.y)/TS)-(tileAt((x+.5)*TS,(y+.5)*TS)===3?-2:0),0x51d);c.camp={x:p.x,y:p.y,str:100};crSite('hcamp',p.x,p.y)},
 day(G,news){const c=G.crisis,age=G.day-c.day,cap=Math.min(7,3+Math.floor(age/8));if(G.day<c.gather)return .3;
  let n=crHosts('horde').length;const due=age%Math.max(2,3-Math.floor(age/20))===0;
  if(due&&n<cap){const L=crTownsNear(c.camp.x,c.camp.y,3,i=>crTargeted(i));if(L.length){const to=L[ri(0,L.length-1)];if(crHost('horde',c.camp.x,c.camp.y,to,{cr:'band',spd:8})){n++;const w=`A horde war band marches on ${G.towns[to].name}`;worldNews(w);news.push(w)}}}
  // the towns the horde holds send war bands of their own
  G.towns.forEach((t,i)=>{if(n>=cap||crTownHeld(i)!=='horde'||rnd()>=.12)return;const L=crTownsNear(t.x,t.y,2,j=>crTargeted(j));if(L.length&&crHost('horde',t.x,t.y+TS,L[0],{cr:'band',spd:8}))n++});
  return .5+.25*G.towns.filter((t,i)=>crTownHeld(i)==='horde').length},
 ended(G){return !!(G.crisis.chief&&!G.crisis.chief.alive)},
 win(G){crDisband('horde');crDropSite('hcamp');G.towns.forEach((t,i)=>{if(crTownHeld(i)==='horde'&&rnd()<.5)crFree(i,'end')})},
 lose(G){},
 after(G,news){const c=G.crisis;if(c.won)return;if(G.day%5===0&&crHosts('horde').length<3){const L=crTownsNear(c.camp.x,c.camp.y,3,i=>crTargeted(i));if(L.length)crHost('horde',c.camp.x,c.camp.y,L[0],{cr:'band',spd:8})}},
 stages(G,i){const c=G.crisis,m=Math.round(clamp((.95+c.camp.str/400)*c.str,.9,2.6)*100)/100,bk=crBiomeAt(c.camp.x,c.camp.y);
  if(i===0)return crBattle('horde','camp',{f:'horde',mult:m,obj:{k:'siege'},biome:bk});
  return crFabled(crBattle('horde','chief',{f:'horde',mult:m*.9,fixed:['hchief','hstd'],boss:crBoss('hchief',c.chief.n,'Warchief of the Great Horde',14),biome:bk}),{boss:1})},
 onBattle(G,s,win){const c=G.crisis;if(s.what!=='camp'&&s.what!=='chief')return;if(!c.as)c.as={stage:s.what==='chief'?1:0};
  if(!win){c.as=null;return}if(s.what==='camp'){c.camp.str=Math.max(30,c.camp.str-25);crAssaultWon(2);return}
  c.chief.alive=false;c.closed=1;c.as=null;worldNews(`${c.chief.n}, warchief of the Great Horde, is dead`);if(c.fin&&c.lost)crisisEnd(true)},
 site(s){const c=G.crisis;if(s.kind!=='hcamp')return false;if(!c.chief.alive){sheet(`<h2>The horde camp</h2><p>Cold fires and broken totems. The horde is gone.</p><button class="pri" onclick="closeSheet()">Move on</button>`);return true}
  sheet(`<h2>The camp of the Great Horde</h2><p>A sprawl of hide tents, wolf pens and skull totems behind a ditch of sharpened stakes. ${htmlEsc(c.chief.n)} holds court at its heart.</p><p class="dim">Two fights with no rest between them: storm the earthworks, then face the warchief and his standard-bearers. Every town the horde holds and every day that passes makes them stronger.</p>${crSiteBtn('Attack the camp','crAssault()')}`);return true},
 marks(){const c=G.crisis,L=[];if(c.camp&&(c.campSeen||seenAt(Math.floor(c.camp.x/TS),Math.floor(c.camp.y/TS))||G.day>=c.gather+6))L.push({x:c.camp.x,y:c.camp.y,kind:'hcamp',label:'The camp of the Great Horde',f:'horde'});return L},
 line(){const c=G.crisis,held=G.towns.filter((t,i)=>crTownHeld(i)==='horde').length;return`Towns held by the horde: ${held}${c.chief.alive?'':' · the warchief is dead'}`},
 sheet(){const c=G.crisis,held=G.towns.filter((t,i)=>crTownHeld(i)==='horde').map(t=>htmlEsc(t.name));return`<p>The orc tribes have gathered under one warchief${c?`, ${htmlEsc(c.chief.n)}`:''}. War bands march out of the horde camp and take the towns one by one; every town they hold sends out bands of its own.</p>
  <p class="dim">Meet the bands on the road or break their sieges: a besieged town falls in two days. Towns the horde holds can be liberated. The horde ends when the warchief dies in his camp${c&&c.camp&&G.day>=c.gather+6?' (marked on the map)':''}.</p>${c?`<p>Held by the horde: <b>${held.length?held.join(', '):'none yet'}</b>.</p>`:''}`}},

/* ---------- the Barbarian War: the Emperor's Camp in the far north; raids strike south; break the camp, slay the Emperor ---------- */
barbarian:{n:'The Barbarian War',f:'barb',icon:'swords',d:'A Barbarian Emperor has united the northern clans. From his fortified camp raiding parties strike south at towns, caravans and patrols.',
 news0:()=>'The northern clans have crowned an Emperor: his raiders are coming south',
 scar:'The Barbarian Emperor rules the north: his raiders strike south every few days, and the towns he burned stay his.',
 winText:'The Emperor falls in the snow before his own hall, and the clans that followed him scatter north. The raids are over.',
 loseText:'The Emperor has crowned himself over half the land. His camp has become a city of the north.',
 lateText:'The Emperor\'s Camp still stands in the north. It can still be broken.',
 nStages:3,
 stageInfo(i){return[{n:'The palisade',d:'A wall of black stakes and frozen earth. The clans fight from behind it.'},{n:'The champions',d:'Inside the palisade the Emperor\'s huscarls bar the way to his hall, with a skald singing them on.'},{n:'The Emperor',d:'Before his hall the Barbarian Emperor waits, axe in hand, with his last champions at his side.'}][i]||{n:'',d:''}},
 start(G){const c=G.crisis;c.total=1;c.closed=0;c.emp={n:pick(CR_EMPN),alive:true};c.champs=[pick(CR_CHAMPN),pick(CR_CHAMPN)];c.next=G.day+2;c.hhost=G.day+5;
  const p=crSpot(6,(x,y)=>-y*3+(W.tiles[y*WN+x]===7?4:0),0xe3b);c.camp={x:p.x,y:p.y,str:100};crSite('ecamp',p.x,p.y);
  if(typeof fogRevealAt==='function'){fogRevealAt(p.x,p.y,2.5*TS);W.fogRev++}},
 day(G,news){const c=G.crisis,age=G.day-c.day;let dm=.75;
  if(G.day>=c.next){const n=age>20?2:1;for(let k=0;k<n;k++)crRaid(news);c.next=G.day+Math.max(2,5-Math.floor(age/12))}
  crRaidStep(news);
  // the houses send hosts north
  if(G.day>=c.hhost&&Array.isArray(G.houses)){const h=G.houses[G.day%G.houses.length];c.hhost=G.day+6;const L=houseTowns(h.id);if(L.length){const a=L.reduce((m,i)=>G.towns[i].y<G.towns[m].y?i:m,L[0]),A=G.towns[a],r=wsPathTo(A.x,A.y,c.camp.x,c.camp.y);
    if(r){wsAdd({x:A.x,y:A.y,f:h.id,goal:'patrol',from:a,to:a,cr:'hhost',spd:8,mult:1,pts:r,legs:2});const w=`${h.n} sends a host north against the Emperor`;worldNews(w);news.push(w)}}}
  return dm+.3*G.towns.filter((t,i)=>crTownHeld(i)==='barb').length},
 ended(G){return !!(G.crisis.emp&&!G.crisis.emp.alive)},
 win(G){crDisband('barb');crDropSite('ecamp');G.towns.forEach((t,i)=>{if(crTownHeld(i)==='barb')crFree(i,'end')})},
 lose(G){},
 after(G,news){const c=G.crisis;if(c.won)return;if(G.day>=c.next){crRaid(news);c.next=G.day+6}crRaidStep(news)},
 stages(G,i){const c=G.crisis,m=Math.round(clamp((.9+c.camp.str/300)*c.str,.9,2.8)*100)/100,bk=crBiomeAt(c.camp.x,c.camp.y);
  if(i===0)return crBattle('barbarian','palisade',{f:'barb',mult:m,obj:{k:'siege'},biome:bk});
  if(i===1)return (crBattle('barbarian','champions',{f:'barb',mult:m*.95,fixed:['barbhus','barbhus','barbskald'],boss:crBoss('barbhus',c.champs[0],'Huscarl of the Emperor'),biome:bk}),{});
  return crFabled(crBattle('barbarian','emperor',{f:'barb',mult:m*.85,fixed:['emperor','barbhus'],boss:crBoss('emperor',c.emp.n,'Emperor of the North',16),biome:bk}),{boss:1})},
 onBattle(G,s,win){const c=G.crisis;if(!['palisade','champions','emperor'].includes(s.what))return;if(!c.as)c.as={stage:['palisade','champions','emperor'].indexOf(s.what)};
  if(!win){c.as=null;c.camp.str=Math.min(100,c.camp.str+5);return}
  if(s.what!=='emperor'){c.camp.str=Math.max(10,c.camp.str-20);crAssaultWon(3);return}
  c.emp.alive=false;c.closed=1;c.as=null;worldNews(`${c.emp.n}, the Barbarian Emperor, is slain`);if(c.fin&&c.lost)crisisEnd(true)},
 site(s){const c=G.crisis;if(s.kind!=='ecamp')return false;if(!c.emp.alive){sheet(`<h2>The Emperor's Camp</h2><p>Charred stakes in the snow. The clans are gone north.</p><button class="pri" onclick="closeSheet()">Move on</button>`);return true}
  sheet(`<h2>The Emperor's Camp</h2><p>A palisade of black stakes on the frozen ground, a hall of carved beams behind it, and the smoke of a thousand fires. ${htmlEsc(c.emp.n)} rules the northern clans from here.</p>
  <p class="dim">Three fights with no rest between them: the palisade, the huscarl champions, then the Emperor himself, who fights on when wounded. The camp's defenses: <b>${Math.round(c.camp.str)} of 100</b> (the houses' hosts wear them down).</p>${crBar(c.camp.str,'#8a5a3a')}${crSiteBtn('Storm the camp','crAssault()')}`);return true},
 marks(){const c=G.crisis;return c.camp?[{x:c.camp.x,y:c.camp.y,kind:'ecamp',label:'The Emperor\'s Camp',f:'barb'}]:[]},
 line(){const c=G.crisis;return`The Emperor's Camp: defenses ${Math.round(c.camp.str)}${c.emp.alive?'':' · the Emperor is slain'}`},
 sheet(){const c=G.crisis,sk=G.towns.filter(t=>t.sacks>0).length;return`<p>A Barbarian Emperor${c?`, ${htmlEsc(c.emp.n)},`:''} has united the northern clans and raised a fortified camp in the far north. Every few days raiding parties ride south from it to sack towns and fall on caravans and patrols.</p>
  <p class="dim">Catch the raiders on the road, before they reach the walls or carry their plunder home. The houses send hosts north that wear down the camp's defenses. The war ends when the camp is broken and the Emperor slain: three fights, his champions first.</p>
  ${c?`<p>The camp's defenses: <b>${Math.round(c.camp.str)} of 100</b>. Towns sacked: <b>${sk}</b>.</p>`:''}`}}
};
for(const k of CRKEYS)CRISES[k].key=k;

/* ---- the Dead March helpers ---- */
function crRaise(x,y,k,from,o){const c=G.crisis,L=crTownsNear(x,y,3,i=>crTargeted(i)&&rnd()<.6);if(!L.length)return null;const to=L[ri(0,Math.min(1,L.length-1))];
 const pos=randOk(x,y,0,1.2);return crHost('dead',pos.x,pos.y,to,Object.assign({mult:Math.round((.78+rnd()*.22)*c.str*k*100)/100,spd:6},o||{}))}
function crThroneReveal(news){const c=G.crisis;if(!c||!c.throne||c.throne.known)return;c.throne.known=1;if(!crSiteOf('throne'))crSite('throne',c.throne.x,c.throne.y);
 if(typeof fogRevealAt==='function'){fogRevealAt(c.throne.x,c.throne.y,2*TS);if(W)W.fogRev++}const w='The Bone Throne is found: the hosts all come from one hill of bones';worldNews(w);if(news)news.push(w);if(typeof toast==='function')toast(w)}
function crThroneFight(){const c=G.crisis;if(!c||!c.throne)return null;if(typeof closeSheet==='function')closeSheet(true);const left=c.lts?c.lts.filter(l=>l.alive).length:0;
 const o=crFabled(crBattle('deadmarch','throne',{f:'dead',mult:Math.round(clamp(c.str*(.95+.12*left),.9,2.8)*100)/100,fixed:['bthrone'].concat(left?['necrolt']:[]),boss:crBoss('bthrone','The Bone Throne','Heart of the Dead March',16),obj:{k:'siege'},biome:crBiomeAt(c.throne.x,c.throne.y)}),{boss:1});
 G.moving=false;G.route=[];engage(o);return o}

/* ---- the Barbarian War helpers ---- */
// a raiding party leaves the camp for a town, a caravan or a patrol
function crRaid(news){const c=G.crisis,cp=c.camp;if(!cp)return null;const roll=rnd();let tgt=null,kind='town';
 if(roll<.25){const L=G.parties.filter(p=>p.goal==='caravan'&&!p.gone&&Math.hypot(p.x-cp.x,p.y-cp.y)<40*TS);if(L.length){tgt=L[ri(0,L.length-1)];kind='caravan'}}
 else if(roll<.45){const L=G.parties.filter(p=>p.goal==='patrol'&&!p.cr&&!p.gone&&Math.hypot(p.x-cp.x,p.y-cp.y)<40*TS);if(L.length){tgt=L[ri(0,L.length-1)];kind='patrol'}}
 const T=crTownsNear(cp.x,cp.y,4,i=>crTargeted(i));if(!T.length)return null;const to=tgt?nearestTown(tgt.x,tgt.y):T[ri(0,T.length-1)];
 const p=crHost('barb',cp.x,cp.y+TS*.6,to,{cr:'raid',spd:10,crT:kind,crId:tgt?tgt.id:null,mult:Math.round((.8+rnd()*.3)*c.str*100)/100});if(!p)return null;
 const w=kind==='town'?`Barbarian raiders ride south toward ${G.towns[to].name}`:kind==='caravan'?`Barbarian raiders are hunting a caravan bound for ${G.towns[tgt.to]?G.towns[tgt.to].name:'the south'}`:`Barbarian raiders are hunting a patrol of ${factName(tgt.f)}`;
 worldNews(w);if(news)news.push(w);return p}
// raids that hunt a caravan or a patrol follow it and fall on it when they catch it
function crRaidStep(news){for(const p of G.parties){if(p.cr!=='raid'||p.gone||p.back||!p.crId)continue;const q=G.parties.find(x=>x.id===p.crId&&!x.gone);
  if(!q){p.crId=null;p.crT='town';continue}const d=Math.hypot(q.x-p.x,q.y-p.y);
  if(d<2.5*TS){q.gone=1;const t=G.towns[nearestTown(q.x,q.y)],w=q.goal==='caravan'?`Barbarians fell on a caravan near ${t.name} and carried off its load`:`Barbarians cut down a patrol of ${factName(q.f)} near ${t.name}`;worldNews(w);if(news)news.push(w);
   if(G.crisis&&!G.crisis.fin)G.crisis.doom=clamp(G.crisis.doom+2,0,CRK.doomLose);if(G.crisis&&G.crisis.camp)G.crisis.camp.str=clamp(G.crisis.camp.str+3,0,100);crHomeward(p);continue}
  if(Math.hypot(p.x-G.p.x,p.y-G.p.y)>WSIM.live*TS){const r=wsPathTo(p.x,p.y,q.x,q.y);if(r){p.pts=r;p.pi=0}}}}
// a house host reaches the camp: it wears the defenses down, and is cut to pieces or limps home
function crHouseHostArrive(p){const c=G.crisis;p.gone=1;if(!c||!c.camp||c.fin&&c.won)return;const dmg=8+Math.floor(rnd()*9);c.camp.str=clamp(c.camp.str-dmg,10,100);
 worldNews(`${factName(p.f)}'s host broke against the Emperor's Camp${rnd()<.5?' and was cut to pieces':', and limped home'} (the camp's defenses fall to ${Math.round(c.camp.str)})`)}

/* ---- crisis contracts (16-contracts.js CTYPES; registered from here) ---- */
const CRCT={
 crdefend:{n:'Stand against the host',d:'A crisis host is marching on the town. Meet it at the gate and hold until it breaks.',icon:'shield',
  w:(t,ti)=>crisisOn()&&crHosts().some(p=>p.to===ti&&!p.back&&p.cr!=='hhost')?6:0,
  gen(t,ti){const p=crHosts().find(q=>q.to===ti&&!q.back&&q.cr!=='hhost');if(!p)return null;const diff=clamp(Math.round(1.5+p.mult*1.6),2,5),g=ctrBeside(t),c=ctrNew('crdefend',t,ti,diff,`Hold ${t.name} against ${crHostName(p)}`);
   c.f=p.f;c.host=p.id;c.cr=1;c.pay=ctrPayBase(diff,1.25);c.stages=[{k:'go',x:g.x,y:g.y,kind:'gate',label:'The gate',fight:{f:p.f,k:clamp(p.mult,.8,2.2),obj:{k:'hold',rounds:diff>=4?6:5}}},ctrHome(ti)];c.due=G.day+3;return c},
  onBattle(c){const p=G.parties.find(q=>q.id===c.host);if(p){p.gone=1;if(p.siegeT!=null)townSitDel(p.siegeT,'crsiege')}const cr=G.crisis;if(cr&&!cr.fin){cr.doom=Math.max(0,cr.doom-2);cr.beaten=(cr.beaten|0)+1;if(CRISES[cr.k].onBeat&&p)try{CRISES[cr.k].onBeat(G,p)}catch(e){}}}},
 crlib:{n:'Liberate a town',d:'A town has fallen to the crisis. Storm it and take it back for its people.',icon:'swords',
  w:(t,ti)=>crisisOn()||G.crisis&&G.crisis.lost?(crLibTarget(ti)!=null?2.2:0):0,
  gen(t,ti){const at=crLibTarget(ti);if(at==null)return null;const o=G.towns[at],f=crTownHeld(at),cr=G.crisis,diff=clamp(Math.round(2+(cr?cr.str:1)*1.2),3,5),g=ctrBeside(o),c=ctrNew('crlib',t,ti,diff,`${f==='dead'?'Cleanse':'Liberate'} ${o.name}`);
   c.f=f;c.at=at;c.cr=1;c.pay=ctrPayBase(diff,1.5);c.stages=[{k:'go',x:g.x,y:g.y,kind:'siege',label:o.name,fight:{f,k:1.1,obj:{k:'siege'}}},ctrHome(ti)];c.due=G.day+6+Math.ceil(ctrDist(o,t)/10);return c},
  onBattle(c){crFree(c.at,'company')}},
 crhunt:{n:'Hunt a crisis leader',d:'One of the crisis\'s captains has been seen nearby. Find the host and cut down its leader.',icon:'skull',
  w:(t,ti)=>crisisOn()&&crHuntTarget(t)?1.6:0,
  gen(t,ti){const p=crHuntTarget(t);if(!p)return null;const c0=G.crisis,diff=clamp(Math.round(2+p.mult*1.4),3,5);let boss,title;
   if(p.cr==='lt'){boss={id:'necrolt',name:c0.lts[p.lt].n,title:'Lieutenant of the Dead March'};title='Destroy '+boss.name}
   else if(p.f==='barb'){boss={id:'barbhus',name:pick(CR_CHAMPN),title:'Raid-leader of the north'};title=`Bounty: ${boss.name}, raid-leader`}
   else{boss={id:'hstd',name:pick(['Grubnak','Shagra Two-Teeth','Urzog','Nazgrim']),title:'War-leader of the horde'};title=`Bounty: ${boss.name} of the horde`}
   const c=ctrNew('crhunt',t,ti,diff,title);c.f=p.f;c.host=p.id;c.cr=1;c.boss=boss;c.pay=ctrPayBase(diff,1.35);c.stages=[{k:'go',x:p.x,y:p.y,kind:'camp',label:boss.name+'’s host',fight:{f:p.f,k:clamp(p.mult,.85,2),boss}},ctrHome(ti,'Claim the bounty')];c.due=G.day+6;return c},
  onBattle(c){const p=G.parties.find(q=>q.id===c.host);const cr=G.crisis;if(p){p.gone=1;if(cr){cr.beaten=(cr.beaten|0)+1;if(CRISES[cr.k].onBeat)try{CRISES[cr.k].onBeat(G,p)}catch(e){}}}if(cr&&!cr.fin)cr.doom=Math.max(0,cr.doom-3)}}
};
function crLibTarget(ti){const t=G.towns[ti];if(!t||crTownHeld(ti))return null;let b=null,bd=24;G.towns.forEach((o,i)=>{if(!crTownHeld(i))return;const d=Math.hypot(o.x-t.x,o.y-t.y)/TS;if(d<bd){bd=d;b=i}});return b}
function crHuntTarget(t){let b=null,bd=26;for(const p of G.parties){if(!p.cr||p.gone||p.cr==='hhost'||p.siegeT!=null)continue;if(!(p.cr==='lt'||p.cr==='raid'||(p.cr==='band'&&p.mult>=1.05)))continue;const d=Math.hypot(p.x-t.x,p.y-t.y)/TS;if(d<bd){bd=d;b=p}}return b}
if(typeof CTYPES==='object'&&CTYPES){Object.assign(CTYPES,CRCT);if(typeof CTR_KINDS!=='undefined'&&Array.isArray(CTR_KINDS))for(const k in CRCT)if(!CTR_KINDS.includes(k))CTR_KINDS.push(k)}
