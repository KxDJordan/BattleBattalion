/* ================= THE RUN (phase 8, systems): difficulty, ironman, save slots, export / import, the run record and summary,
   the hall of the fallen =================
   Rules first (no DOM), then the sheets. Nothing here draws on the game stream (rnd): ids and hashes come from the seed.
   Shared API (CONTRACT.md):
     DIFF[k] = {n, d, budget, pay, injury, death, crisisDay, ...}   k in DIFFK (story normal hard brutal)
     diffK(key)            -> the running company's factor for key (1 when there is no company or no such key)
                              budget: enemy strength (battle budget) · pay: contract pay · injury: odds of an injury when struck down ·
                              death: odds that a struck-down sword dies · crisisDay: the day the crisis starts (G.crisisDay is already
                              scaled at new game: readers of G.crisisDay need not apply it again) · wage / price / heal: see DIFF
     G.diff, G.ironman     (set at new game; ironman: one book, written on its own, no reload; death or retirement ends it)
     G.run                 the run record: {id, day0, battles, won, lost, fled, kills, fallen, contracts, peak, crisis, end}
     runSummary(kind)      -> the summary record of the running company (kind 'retire' | 'wipe' | 'victory' | 'live')
     runEnd(kind)          acting: ends the run (retire / wipe): summary kept in the chronicle, the book cleared, the summary sheet shown
     runCrisisEnd(win)     the crises agent's call when the run's crisis is won or lost (also polled from CRISES[k].win / lose)
     hallAdd(m, how, o)    a fallen sword into the hall of the fallen (localStorage, across runs); hallAll() -> entries, newest first
     saveSlots()           -> [{slot, state, name, day, ...}] for the 3 books; slotUse(i) makes slot i the running book
     exportSave(slot?)     -> a text code of a book ('' when empty); importSave(text, slot?) -> {ok, why?, name, day, slot} */

const DIFFK=['story','normal','hard','brutal'];
const DIFF={
 story:{n:'Story',icon:'heart',d:'For the tale more than the struggle. Smaller warbands, better pay, and the fallen usually get back up.',
  budget:.78,pay:1.25,injury:.6,death:.45,crisisDay:1.35,wage:.85,line:['Enemies 22% weaker','Pay +25%','Deaths far rarer','The crisis comes late']},
 normal:{n:'Normal',icon:'swords',d:'The march as it was meant to be: hard choices, fair odds and a crisis that will not wait for you.',
  budget:1,pay:1,injury:1,death:1,crisisDay:1,wage:1,line:['Fair odds','The usual pay','Steel kills','The crisis on time']},
 hard:{n:'Hard',icon:'skull',d:'Bands are larger and employers tighter. A struck-down sword is more likely to stay down.',
  budget:1.15,pay:.9,injury:1.2,death:1.3,crisisDay:.85,wage:1.1,line:['Enemies 15% stronger','Pay -10%','More deaths','The crisis comes early']},
 brutal:{n:'Brutal',icon:'flame',d:'For veterans of the march. Every fight is a gamble with the company\'s life, and the world turns against you fast.',
  budget:1.32,pay:.8,injury:1.4,death:1.65,crisisDay:.72,wage:1.2,line:['Enemies 32% stronger','Pay -20%','Death is common','The crisis comes very early']}};
function diffOf(g){g=g||G;return g&&DIFF[g.diff]?g.diff:'normal'}
function diffK(key){const D=DIFF[diffOf()];const v=D&&D[key];return typeof v==='number'&&isFinite(v)?v:1}
// the run's crisis kind for an old save or a fresh world: the crises agent's own pick when present, else a hash of the seed
const RUN_CRISES=['sunder','deadmarch','horde','barbarian'];
function runCrisisPick(seed){if(typeof crisisKindOf==='function'){try{const k=crisisKindOf(seed);if(typeof k==='string'&&k)return k}catch(e){}}
 if(typeof CRISES!=='object'||!CRISES)return'sunder';const L=Object.keys(CRISES);   // no crisis framework: the Sundering, as ever
 let h=((seed|0)^0x51ed27)>>>0;h=Math.imul(h^h>>>15,0x2c1b3c6d)>>>0;h=(h^h>>>12)>>>0;return L[h%L.length]||'sunder'}

/* ---- the run record ---- */
function runNew(g){g=g||G;const st=g&&g.amb&&g.amb.st||{};
 return{id:((svNum(g&&g.seed,0)|0)>>>0).toString(36)+'-'+Math.max(1,Math.floor(svNum(g&&g.day,1))).toString(36),day0:g&&svFin(g.day)?Math.floor(g.day):1,
  battles:Math.floor(svNum(st.wins,0)),won:Math.floor(svNum(st.wins,0)),lost:0,fled:0,kills:Math.floor(svNum(st.kills,0)),fallen:0,contracts:Math.floor(svNum(st.contracts,0)),peak:Math.floor(svNum(g&&g.renown,0)),crisis:null,end:null}}
function runRepair(g){g.diff=DIFF[g.diff]?g.diff:'normal';g.ironman=!!g.ironman;const r=svObj(g.run)?g.run:runNew(g),n=k=>Math.max(0,Math.floor(svNum(r[k],0)));
 g.run={id:typeof r.id==='string'&&r.id?r.id.slice(0,24):runNew(g).id,day0:Math.max(1,Math.floor(svNum(r.day0,1))),battles:n('battles'),won:n('won'),lost:n('lost'),fled:n('fled'),kills:n('kills'),
  fallen:n('fallen'),contracts:n('contracts'),peak:Math.max(n('peak'),Math.floor(svNum(g.renown,0))),crisis:r.crisis==='won'||r.crisis==='lost'?r.crisis:null,end:null};
 if(r.vshown)g.run.vshown=1;
 if(svObj(g.ironFight)&&svFin(g.ironFight.day))g.ironFight={day:Math.floor(g.ironFight.day),f:typeof g.ironFight.f==='string'?g.ironFight.f:''};else delete g.ironFight;
 if(typeof tutRepair==='function')tutRepair(g);return''}
function runRec(){if(!G)return null;if(!svObj(G.run))G.run=runNew(G);return G.run}
/* one battle into the record (called once per battle, from the resolveBattle hook in 85-game.js). b = the battle, res = its result.
   Kills: u.kills when the rules count them, else the merc's quarry tally grown since the battle began (B.runSlain0). */
function runOnBattle(res,b){const R=runRec();if(!R||!res||res._run)return;res._run=1;R.battles++;if(res.win)R.won++;else if(res.fled)R.fled++;else R.lost++;
 let k=0;const s0=b&&b.runSlain0||{};
 for(const u of (b&&b.units)||[]){if(u.side!==0||!u.m)continue;const m=u.m;let n=svFin(u.kills)?u.kills:Math.max(0,slainSum(m)-(s0[m.id]||0));n=Math.floor(n);if(n>0){m.kills=(m.kills||0)+n;k+=n}}
 const foes=(res.slain||[]).length+(res.rival&&res.rival.dead?res.rival.dead.length:0);R.kills+=Math.max(k,foes);R.peak=Math.max(R.peak,Math.floor(G.renown||0));
 // the fallen of this battle: the merc objects are still on the field units
 const dead=(res.men||[]).filter(r=>r.state==='dead');if(dead.length&&b){const fn=FACT[b.opts&&b.opts.f]?FACT[b.opts.f].n:'the enemy',rv=res.rival&&res.rival.n;
  for(const row of dead){const u=b.units.find(x=>x.side===0&&x.m&&x.m.id===row.id);if(!u)continue;const by=u.killer||u.killedBy||u.lastHitBy||null,byN=typeof by==='string'?by:by&&by.name?by.name:null;
   hallAdd(u.m,(byN?'Slain by '+byN:'Fell fighting '+(rv||fn))+runWhere(b),{foe:rv||fn})}}}
function slainSum(m){let n=0;if(m&&m.slain&&typeof m.slain==='object')for(const k in m.slain)n+=+m.slain[k]||0;return n}
function runWhere(b){try{const s=b&&b.opts&&b.opts.src,p=G&&G.p;if(!p||typeof nearestTown!=='function')return'';const t=G.towns[nearestTown(p.x,p.y)];return t?' near '+t.name:''}catch(e){return''}}
function runOnContract(){const R=runRec();if(R)R.contracts++}
// the crisis outcome; win: a summary of the victory is shown once (the run goes on)
function runCrisisEnd(win){const R=runRec();if(!R||R.crisis)return false;R.crisis=win?'won':'lost';if(win&&typeof runVictorySheet==='function'&&typeof document!=='undefined')runVictoryLater=1;return true}
let runVictoryLater=0;
function runCrisisPoll(){if(!G||!G.run||G.run.crisis)return;const C=typeof CRISES==='object'&&CRISES?CRISES[G.crisisKind]:null;if(!C)return;
 let w=false,l=false;try{w=typeof C.win==='function'&&!!C.win(G);l=!w&&typeof C.lose==='function'&&!!C.lose(G)}catch(e){}if(w||l)runCrisisEnd(w)}
function runCrisisName(){const C=typeof CRISES==='object'&&CRISES&&G?CRISES[G.crisisKind]:null;return C&&C.n?C.n:G&&G.crisisKind==='sunder'?'The Sundering':'The crisis'}
function runCrisisText(){const R=runRec();if(!R)return'';if(R.crisis==='won')return'Won';if(R.crisis==='lost')return'Lost, and the land is scarred';
 return G.crisis?'Still raging':G.day<(G.crisisDay||18)?'Not yet begun':'Unfinished'}
/* the summary record. best: the three greatest swords of the run, the living and this run's fallen, by level and kills */
function runScore(x){return(x.lvl||1)*10+(x.kills||0)*2}
function runSummary(kind){if(!G)return null;const R=runRec(),fallen=hallAll().filter(e=>e.run===R.id);
 const live=G.roster.map(m=>({look:hallLook(m),name:m.name,bg:m.bg,lvl:m.lvl||1,kills:m.kills||0,alive:true,fabled:m.fabled||null}));
 const best=live.concat(fallen.map(e=>({look:e.look,name:e.name,bg:e.bg,lvl:e.lvl,kills:e.kills,alive:false,how:e.how}))).sort((a,b)=>runScore(b)-runScore(a)).slice(0,3);
 return{kind:kind||'live',run:R.id,name:companyName(),banner:G.banner,day:G.day,days:Math.max(1,G.day-R.day0+1),battles:R.battles,won:R.won,lost:R.lost,fled:R.fled,kills:R.kills,
  renown:Math.floor(G.renown||0),peak:Math.max(R.peak,Math.floor(G.renown||0)),contracts:R.contracts,fallen:Math.max(R.fallen,fallen.length),swords:G.roster.length,crowns:G.crowns,
  crisis:{k:G.crisisKind||null,n:runCrisisName(),out:R.crisis||null,text:runCrisisText()},diff:diffOf(),ironman:!!G.ironman,origin:G.origin||'free',wsize:G.wsize,best}}
/* the chronicle: the summaries of finished runs (newest first, at most 30), across companies */
const RUNSKEY='wyrdmarch_runs_v1';
function runsAll(){let L=null;try{L=JSON.parse(storeGet(RUNSKEY)||'[]')}catch(e){L=null}return Array.isArray(L)?L.filter(x=>svObj(x)&&typeof x.name==='string'&&svFin(x.day)):[]}
function runsKeep(s){const L=runsAll().filter(x=>!(x.run===s.run&&x.kind===s.kind));L.unshift(s);return storeSet(RUNSKEY,JSON.stringify(L.slice(0,30)))}
/* ends the run: 'retire' (the player lays the banner down) or 'wipe' (nobody left). The book is cleared; the summary is kept and shown. */
function runEnd(kind){if(!G)return null;const s=runSummary(kind);if(!s)return null;s.at=Date.now?Date.now():0;runsKeep(s);
 G.run.end=kind;clearSave();if(kind==='wipe'&&typeof sheet==='function')runSummarySheet(s);return s}

/* ---- the hall of the fallen (localStorage, across runs and slots) ---- */
const HALLKEY='wyrdmarch_hall_v1',HALLMAX=300;
function hallAll(){let L=null;try{L=JSON.parse(storeGet(HALLKEY)||'[]')}catch(e){L=null}return Array.isArray(L)?L.filter(e=>svObj(e)&&typeof e.name==='string'&&typeof e.k==='string'):[]}
// what the portrait needs (07-portraits.js ptMercSpec reads id, name, race, bg, eq, colors; mercRes reads trees / perks / gift)
function hallLook(m){const e=m.eq||{};const o={id:m.id|0,name:String(m.name||'').slice(0,40),race:m.race,bg:m.bg,base:{},eq:{w:e.w||null,b:e.b||null,s:e.s||null,a:e.a||null,h:e.h||null}};
 if(m.colors)o.colors=m.colors;if(m.gift)o.gift=m.gift;if(Array.isArray(m.trees))o.trees=m.trees.slice(0,8);if(Array.isArray(m.perks))o.perks=m.perks.slice(0,40);if(m.fabled)o.fabled=m.fabled;return o}
function hallAdd(m,how,o){if(!m||typeof m!=='object')return null;o=o||{};const R=G?runRec():null,run=R?R.id:'?',k=run+':'+(m.id|0);if(R)R.fallen++;const L=hallAll();if(L.some(e=>e.k===k))return null;   // the record counts every death; the hall keeps one entry a sword

 const e={k,run,name:String(m.name||'Nameless').slice(0,40),bg:m.bg,bgN:BG[m.bg]?BG[m.bg].n:'',race:m.race,lvl:Math.max(1,m.lvl|0),kills:Math.max(0,(m.kills|0)),
  how:String(how||'Fell in the field').slice(0,120),co:G?companyName():'',banner:G&&G.banner?G.banner:null,day:G?G.day:1,diff:G?diffOf():'normal',ironman:!!(G&&G.ironman),look:hallLook(m)};
 if(m.fabled)e.fabled=m.fabled;if(Array.isArray(m.traits))e.traits=m.traits.slice(0,2);L.unshift(e);storeSet(HALLKEY,JSON.stringify(L.slice(0,HALLMAX)));return e}
function hallClear(){return storeDel(HALLKEY)}

/* ---- save slots ---- */
const SLOTKEY='wyrdmarch_slot_v1';
function slotLoad(){const v=parseInt(storeGet(SLOTKEY),10);SLOT=Number.isInteger(v)&&v>=0&&v<SLOTS?v:0;return SLOT}
function slotUse(i){if(!(Number.isInteger(i)&&i>=0&&i<SLOTS))return false;SLOT=i;storeSet(SLOTKEY,String(i));return true}
function saveSlots(){const L=[];for(let i=0;i<SLOTS;i++){const s=saveStatus(i);s.slot=i;s.cur=i===SLOT;L.push(s)}return L}
function slotFree(){for(let i=0;i<SLOTS;i++)if(saveStatus(i).state==='none')return i;return -1}

/* ---- export / import: 'WYRD1.' + 8 hex of an FNV hash of the JSON + '.' + base64 of the UTF-8 JSON. Imports go through
   migrateSave and repairSave (readSaveRaw) before anything is written; a plain JSON save is accepted too. ---- */
const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64enc(bin){let o='';for(let i=0;i<bin.length;i+=3){const a=bin.charCodeAt(i),b=i+1<bin.length?bin.charCodeAt(i+1):NaN,c=i+2<bin.length?bin.charCodeAt(i+2):NaN,n=(a<<16)|((b|0)<<8)|(c|0);
  o+=B64[n>>18&63]+B64[n>>12&63]+(isNaN(b)?'=':B64[n>>6&63])+(isNaN(c)?'=':B64[n&63])}return o}
function b64dec(s){s=s.replace(/[^A-Za-z0-9+/=]/g,'');if(s.length%4)throw new Error('the code is cut short');let o='';
 for(let i=0;i<s.length;i+=4){const q=[0,1,2,3].map(j=>s[i+j]==='='?-1:B64.indexOf(s[i+j]));if(q[0]<0||q[1]<0)throw new Error('the code is damaged');const n=(q[0]<<18)|(q[1]<<12)|((q[2]<0?0:q[2])<<6)|(q[3]<0?0:q[3]);
  o+=String.fromCharCode(n>>16&255);if(q[2]>=0)o+=String.fromCharCode(n>>8&255);if(q[3]>=0)o+=String.fromCharCode(n&255)}return o}
function runHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')}
function exportSave(slot){if(slot==null&&G&&mode==='world')save();const raw=storeGet(slotKey(slot));if(!raw)return'';return'WYRD1.'+runHash(raw)+'.'+b64enc(unescape(encodeURIComponent(raw)))}
function importDecode(text){text=String(text==null?'':text).trim();if(!text)return{ok:false,why:'Nothing to import: the code is empty.'};let raw;
 if(text[0]==='{')raw=text;
 else{const m=/^WYRD1\.([0-9a-f]{8})\.([\s\S]+)$/.exec(text.replace(/\s+/g,''));if(!m)return{ok:false,why:'This is not a Wyrdmarch save code.'};
  try{raw=decodeURIComponent(escape(b64dec(m[2])))}catch(e){return{ok:false,why:'The code is damaged or cut short.'}}
  if(runHash(raw)!==m[1])return{ok:false,why:'The code is damaged: it does not match its own check.'}}
 const r=readSaveRaw(raw);if(r.state==='newer')return{ok:false,why:'This company was saved by a newer version of Wyrdmarch (format '+r.v+').'};
 if(r.state==='none')return{ok:false,why:'That company has nobody left in it.'};if(r.state!=='ok')return{ok:false,why:'The save inside the code cannot be read'+(r.why?' ('+r.why+')':'')+'.'};
 return{ok:true,raw,g:r.g}}
function importSave(text,slot){const d=importDecode(text);if(!d.ok)return d;slot=Number.isInteger(slot)&&slot>=0&&slot<SLOTS?slot:SLOT;
 if(!storeSet(slotKey(slot),d.raw))return{ok:false,why:'The browser refused to store it (storage full or blocked).'};return{ok:true,slot,name:d.g.name,day:d.g.day,ironman:!!d.g.ironman}}

/* ---- ironman: a fight in progress is written down as fled, so closing the page mid-battle is no escape ---- */
function ironOnBattle(o){if(!G||!G.ironman||mode!=='world'||o&&o.quiet)return;G.ironFight={day:G.day,f:o&&o.f||''};save()}
function ironOnLoad(){if(!G||!G.ironFight)return null;const f=G.ironFight;delete G.ironFight;const lost=Math.floor(G.crowns*.1);G.crowns-=lost;const R=runRec();if(R){R.battles++;R.fled++}
 return{lost,f:f.f}}

/* ================= run sheets (title, menu, the end of a run) ================= */
function runIc(n,s){return typeof pnIcon==='function'?pnIcon(n,'',s||16):typeof pic==='function'?pic(n,s||16):''}
function runEsc(s){return typeof htmlEsc==='function'?htmlEsc(s):String(s)}
// the difficulty / ironman chips of a company (the new-company sheet, the slot cards, the summary)
function runChips(diff,iron){const D=DIFF[diff]||DIFF.normal;return`<span class="rn-chip d-${DIFF[diff]?diff:'normal'}">${runIc('diff-'+(DIFF[diff]?diff:'normal'))}${runEsc(D.n)}</span>${iron?`<span class="rn-chip iron">${runIc('ironman')}Ironman</span>`:''}`}
function runStartLine(){if(!G)return'';const t=G.tut&&!G.tut.done;
 return`<p class="rn-start">${runChips(G.diff,G.ironman)}${t?`<span class="rn-chip tutc">${runIc('hint')}Tutorial</span>`:''}<small>${G.ironman?'One book, written as you go. No reloads: death or retirement ends the march.':runEsc(DIFF[diffOf()].d)}</small></p>`}
/* ---- the summary sheet ---- */
const RUNKIND={retire:{h:'The banner is laid down',ic:'banner'},wipe:{h:'The company is no more',ic:'skull'},victory:{h:'The crisis is broken',ic:'laurel'},live:{h:'The chronicle so far',ic:'ledger'}};
function runStat(ic,v,l){return`<div class="rs-st">${runIc(ic)}<b class="pxn">${runEsc(v)}</b><small>${runEsc(l)}</small></div>`}
function runSummaryHTML(s){const K=RUNKIND[s.kind]||RUNKIND.live,bn=typeof bannerHTML==='function'&&s.banner?bannerHTML(s.banner,56,'rs-bn'):'';
 const best=(s.best||[]).map((x,i)=>`<div class="rs-m${x.alive?'':' dead'}"><span class="rs-rank">${i+1}</span>${typeof portraitHTML==='function'&&x.look?portraitHTML(x.look,48,'rs-pt'):''}<span class="rs-mt"><b>${runEsc(x.name)}</b><small>${runEsc(BG[x.bg]?BG[x.bg].n:'')} · level ${x.lvl} · ${x.kills} kill${x.kills===1?'':'s'}</small><small class="rs-how">${x.alive?'Marched home':runEsc(x.how||'Fell')}</small></span></div>`).join('');
 const cr=s.crisis||{},co=cr.out==='won'?'good':cr.out==='lost'?'bad':'';
 return`<div class="rs"><div class="rs-hd">${bn}<div class="rs-ht"><span class="rs-kick">${runIc(K.ic)}${runEsc(K.h)}</span><h2>${runEsc(s.name)}</h2><div class="rs-chips">${runChips(s.diff,s.ironman)}<span class="rn-chip">Day ${s.day}</span></div></div></div>
<div class="rs-grid">${runStat('day',s.days,s.days===1?'day':'days')}${runStat('swords',s.battles,'battles')}${runStat('star',s.won,'won')}${runStat('skull',s.kills,'foes slain')}${runStat('renown',s.peak,'renown')}${runStat('contract',s.contracts,'contracts')}${runStat('hall',s.fallen,'fallen')}${runStat('coin',s.crowns,'crowns')}</div>
<div class="rs-cr ${co}">${runIc(cr.out==='won'?'laurel':'boss')}<span><b>${runEsc(cr.n||'The crisis')}</b><small>${runEsc(cr.text||'')}</small></span></div>
${best?`<h3 class="rs-h3">The company's finest</h3><div class="rs-best">${best}</div>`:''}</div>`}
function runSummarySheet(s){const end=s.kind==='retire'||s.kind==='wipe';
 sheet(runSummaryHTML(s)+`<div class="row rs-act">${end?`<button onclick="hallSheet()">${runIc('hall')}<span>Hall of the fallen</span></button><button class="pri" style="flex:1" onclick="closeSheet(true);newCompanySetup()">Raise a new company</button>`:`<button class="pri" style="flex:1" onclick="closeSheet()">${s.kind==='victory'?'March on':'Close'}</button>`}</div>`,'wide rsw')}
function runChronicle(){if(!G)return;runSummarySheet(runSummary('live'))}
function runVictorySheet(){if(!G)return;G.run.vshown=1;runSummarySheet(runSummary('victory'))}
// polled by the shell (chromeTick): the crisis outcome, a pending victory summary
function runTick(){if(!G||mode!=='world')return;runCrisisPoll();if(G.run&&G.run.crisis==='won'&&!G.run.vshown&&!sheetOpen&&!(typeof panelOpen==='function'&&panelOpen()))runVictorySheet()}
/* ---- retire (the menu): the run ends with its summary; an ironman company has no other way out ---- */
function retireConfirm(){if(!G)return;const n=runEsc(companyName());
 sheet(`<h2>Retire ${n}?</h2><p>The swords are paid off and the banner is folded. The march ends here and its chronicle is written${G.ironman?'; an ironman company cannot be taken up again':''}.</p><p class="dim">The book in slot ${SLOT+1} is cleared. The hall of the fallen keeps those who fell.</p>
<div class="row"><button class="warn" onclick="runRetire()">${runIc('banner')}<span>Retire</span></button><button class="pri" style="flex:1" onclick="menuSheet()">Keep marching</button></div>`)}
function runRetire(){const s=runEnd('retire');runToTitle();if(s&&typeof sheet==='function')runSummarySheet(s)}
function runToTitle(){G=null;B=null;mode='title';if(typeof setUI==='function')setUI()}

/* ---- the hall of the fallen ---- */
const HALLUI={tab:'fallen',n:40};
function hallSheet(tab){if(tab)HALLUI.tab=tab;const L=hallAll(),R=runsAll(),back=mode==='title'?'closeSheet(true)':'menuSheet()';
 const tabs=`<div class="seg hl-tabs" role="tablist"><button role="tab" aria-selected="${HALLUI.tab==='fallen'}" class="${HALLUI.tab==='fallen'?'on':''}" onclick="hallSheet('fallen')">The fallen <small>${L.length}</small></button><button role="tab" aria-selected="${HALLUI.tab==='runs'}" class="${HALLUI.tab==='runs'?'on':''}" onclick="hallSheet('runs')">Chronicles <small>${R.length}</small></button></div>`;
 let body='';
 if(HALLUI.tab==='runs')body=R.length?`<div class="hl-list">${R.map((s,i)=>`<button class="hl-run" onclick="hallRun(${i})">${typeof bannerHTML==='function'&&s.banner?bannerHTML(s.banner,36):''}<span class="hl-t"><b>${runEsc(s.name)}</b><small>${runEsc((RUNKIND[s.kind]||RUNKIND.live).h)} · day ${s.day} · ${s.battles} battles · ${s.kills} slain</small></span><span class="hl-c">${runChips(s.diff,s.ironman)}</span></button>`).join('')}</div>`
  :`<p class="hl-empty">${runIc('ledger',32)}<span>No march has ended yet. Retire a company, or lose one, and its chronicle is kept here.</span></p>`;
 else body=L.length?`<div class="hl-list">${L.slice(0,HALLUI.n).map(e=>`<div class="hl-e">${typeof portraitHTML==='function'?portraitHTML(e.look,48,'hl-pt'):''}<span class="hl-t"><b>${runEsc(e.name)}${e.fabled?' <em class="hl-fab">Fabled</em>':''}</b><small>${runEsc(e.bgN||(BG[e.bg]?BG[e.bg].n:''))} · level ${e.lvl} · ${e.kills} kill${e.kills===1?'':'s'}</small><small class="hl-how">${runEsc(e.how)}</small></span><span class="hl-co">${typeof bannerHTML==='function'&&e.banner?bannerHTML(e.banner,28):''}<small>${runEsc(e.co)}<br>Day ${e.day}</small></span></div>`).join('')}</div>${L.length>HALLUI.n?`<button class="hl-more" onclick="HALLUI.n+=40;hallSheet()">Show more (${L.length-HALLUI.n} left)</button>`:''}`
  :`<p class="hl-empty">${runIc('hall',32)}<span>No sword has fallen yet. Those who die under your banner are remembered here, whatever company they marched with.</span></p>`;
 sheet(`<div class="row sp seth"><h2>${runIc('hall',32)} Hall of the fallen</h2><button class="pri" onclick="${back}">Done</button></div>${tabs}${body}${L.length&&HALLUI.tab==='fallen'?`<button class="ghost hl-clr" onclick="hallClearAsk()">Forget the fallen</button>`:''}`,'wide hlw')}
function hallRun(i){const s=runsAll()[i];if(!s)return;sheet(runSummaryHTML(s)+`<div class="row rs-act"><button class="pri" style="flex:1" onclick="hallSheet('runs')">Back</button></div>`,'wide rsw')}
function hallClearAsk(){sheet(`<h2>Forget the fallen?</h2><p>Every name in the hall, from every company, is wiped from this browser. This cannot be undone.</p><div class="row"><button class="warn" onclick="hallClear();hallSheet()">Forget them</button><button class="pri" style="flex:1" onclick="hallSheet()">Keep them</button></div>`)}

/* ---- the three books (save slots), export and import ---- */
function slotCard(s){const i=s.slot,ok=s.state==='ok',bn=ok&&typeof bannerHTML==='function'?bannerHTML(s.banner,40,'sl-bn'):`<span class="sl-empty">${runIc('ledger',32)}</span>`;
 const t=ok?`<b>${runEsc(s.name||'')}</b><small>Day ${s.day} · ${s.swords} sword${s.swords===1?'':'s'} · ${s.crowns} crowns${s.wsize&&WORLDSZ[s.wsize]?' · '+WORLDSZ[s.wsize].name:''}</small><span class="sl-chips">${runChips(s.diff,s.ironman)}</span>`
  :s.state==='none'?`<b>An empty book</b><small>Raise a new company here</small>`:`<b>${s.state==='newer'?'A newer save':'A damaged save'}</b><small>${s.state==='newer'?'Saved by a newer version':'It cannot be read'+(s.why?' ('+runEsc(s.why)+')':'')}</small>`;
 const act=ok?`<button class="pri sm" onclick="slotPlay(${i})">${runIc('endturn')}<span>Play</span></button>${s.ironman?'':`<button class="sm" onclick="exportSheet(${i})">${runIc('export')}<span>Export</span></button>`}<button class="sm warn" onclick="slotDelAsk(${i})" aria-label="Delete book ${i+1}">${runIc('close')}</button>`
  :`<button class="pri sm" onclick="slotNew(${i})">${runIc('banner')}<span>New</span></button><button class="sm" onclick="importSheet(${i})">${runIc('import')}<span>Import</span></button>${s.state!=='none'?`<button class="sm warn" onclick="slotDelAsk(${i})" aria-label="Clear book ${i+1}">${runIc('close')}</button>`:''}`;
 return`<div class="sl-card${s.cur?' cur':''}${ok?'':' off'}"><span class="sl-n pxn">${i+1}</span>${bn}<span class="sl-t">${t}</span><span class="sl-a">${act}</span></div>`}
function slotsSheet(){if(G&&mode==='world')save();const L=saveSlots(),back=mode==='title'?'closeSheet(true)':'menuSheet()';
 sheet(`<div class="row sp seth"><h2>${runIc('ledger',32)} The books</h2><button class="pri" onclick="${back}">Done</button></div><p class="dim sl-p">Three companies can be kept in this browser. Export a book to carry it to another device; an ironman book cannot be copied.</p>
<div class="sl-list">${L.map(slotCard).join('')}</div>${mode==='world'?`<p class="dim sl-p">Switching books saves this company first.</p>`:''}`,'wide slw')}
function slotPlay(i){if(G&&mode==='world'){save();if(i===SLOT){closeSheet(true);return}}slotUse(i);closeSheet(true);continueGame()}
function slotNew(i){if(G&&mode==='world')save();slotUse(i);if(mode!=='title'){runToTitle()}newCompanySetup()}
function slotDelAsk(i){const s=saveStatus(i);sheet(`<h2>Burn book ${i+1}?</h2><p>${s.state==='ok'?`${runEsc(s.name)} (day ${s.day}) is lost for good. Nobody is added to the hall of the fallen.`:'The unreadable data in this book is cleared.'}</p><div class="row"><button class="warn" onclick="slotDel(${i})">Burn it</button><button class="pri" style="flex:1" onclick="slotsSheet()">Keep it</button></div>`)}
function slotDel(i){if(G&&mode==='world'&&i===SLOT)runToTitle();clearSave(i);slotsSheet();if(mode==='title'&&typeof renderTitle==='function')renderTitle()}
function exportSheet(i){const code=exportSave(i),s=saveStatus(i);if(!code){toast('Nothing to export');return}
 sheet(`<div class="row sp seth"><h2>${runIc('export',32)} Export</h2><button class="pri" onclick="slotsSheet()">Done</button></div><p class="dim">${runEsc(s.name||'The company')}, day ${s.day}. Copy the code, or save it as a file. Import it into any book of any browser.</p>
<textarea class="ex-code" id="exCode" readonly spellcheck="false" aria-label="Save code" onfocus="this.select()">${runEsc(code)}</textarea><p class="ex-n dim">${Math.ceil(code.length/1024)} KB</p>
<div class="row"><button onclick="exportCopy()">${runIc('contract')}<span>Copy the code</span></button><button class="pri" style="flex:1" onclick="exportFile(${i})">${runIc('save')}<span>Download a file</span></button></div>`,'wide exw')}
function exportCopy(){const e=$('exCode');if(!e)return;let ok=false;try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(e.value).then(()=>toast('Code copied'),()=>{e.select();toast('Select and copy the code')});return}}catch(x){}
 try{e.focus();e.select();ok=document.execCommand&&document.execCommand('copy')}catch(x){}toast(ok?'Code copied':'Select and copy the code')}
function exportFile(i){const code=exportSave(i),s=saveStatus(i);if(!code)return;try{const b=new Blob([code],{type:'text/plain'}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download=('wyrdmarch-'+String(s.name||'company').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-day'+s.day+'.wyrd').slice(0,80);document.body.appendChild(a);a.click();setTimeout(()=>{try{URL.revokeObjectURL(u);a.remove()}catch(e){}},500);toast('File saved')}catch(e){toast('This browser cannot save files: copy the code instead')}}
function importSheet(i,err){sheet(`<div class="row sp seth"><h2>${runIc('import',32)} Import into book ${i+1}</h2><button onclick="slotsSheet()">Back</button></div><p class="dim">Paste a save code, or open a .wyrd file. The save is checked before anything is written.</p>
<textarea class="ex-code" id="imCode" spellcheck="false" placeholder="WYRD1.…" aria-label="Save code"></textarea>${err?`<p class="ex-err" role="alert">${runIc('skull')}<span>${runEsc(err)}</span></p>`:''}
<input type="file" id="imFile" accept=".wyrd,.txt,.json,text/plain,application/json" class="hidden" onchange="importFile(this,${i})">
<div class="row"><button onclick="$('imFile').click()">${runIc('ledger')}<span>Open a file</span></button><button class="pri" style="flex:1" onclick="importGo(${i},$('imCode').value)">${runIc('import')}<span>Import</span></button></div>`,'wide exw')}
function importFile(inp,i){const f=inp&&inp.files&&inp.files[0];if(!f)return;if(f.size>8e6){importSheet(i,'That file is far too large to be a save.');return}
 try{const r=new FileReader();r.onload=()=>importGo(i,String(r.result||''));r.onerror=()=>importSheet(i,'The file could not be read.');r.readAsText(f)}catch(e){importSheet(i,'The file could not be read.')}}
function importGo(i,text){const st=saveStatus(i);if(st.state==='ok'&&!(IMPORTOK.i===i&&IMPORTOK.t===text)){const d=importDecode(text);if(!d.ok){importSheet(i,d.why);return}IMPORTOK.i=i;IMPORTOK.t=text;
  sheet(`<h2>Replace ${runEsc(st.name)}?</h2><p>Book ${i+1} holds ${runEsc(st.name)} (day ${st.day}). Importing ${runEsc(d.g.name)} (day ${d.g.day}) replaces it.</p><div class="row"><button class="warn" onclick="importGo(${i},IMPORTOK.t)">Replace</button><button class="pri" style="flex:1" onclick="slotsSheet()">Keep it</button></div>`);return}
 IMPORTOK.i=-1;IMPORTOK.t='';if(G&&mode==='world'&&i===SLOT)runToTitle();const r=importSave(text,i);if(!r.ok){importSheet(i,r.why);return}toast(`${r.name} imported into book ${i+1}`);slotsSheet();if(mode==='title'&&typeof renderTitle==='function')renderTitle()}
const IMPORTOK={i:-1,t:''};
