/* ================= BATTLE FLOW ================= */
/* Each step is split in two: a rules half that only changes state and returns plain data
   (resolveBattle, settleBattle), and a presentation half that turns that data into sheets and toasts
   (endBattle, afterBattle). A headless run calls the rules halves, or autoBattle(). */
// How a company unit left the field alive: 'withdrew' (stepped off its own edge, or the retreat was sounded), 'fled' (broke and
// ran), '' (still standing, or fell). The rules mark such a unit; the usual spellings are all read here.
function unitLeft(u){if(!u||u.side!==0||u.down)return'';const l=u.left||u.gone||u.out||u.exit;
 if(l==='fled'||l==='rout'||l==='routed'||u.routed||u.fledOff||u.ranOff||(u.fled&&!u.alive&&u.hp>0))return'fled';
 if(l||u.withdrawn||u.withdrew||u.escaped||u.offField)return'withdrew';return''}
// Injuries a unit took in this battle: the rules' own list when the unit carries one (u.injNew / u.injuries), else whatever
// m.inj holds beyond the snapshot battleSnap() took before the fight, else entries the rules flagged as fresh.
function battleSnap(o){const s={};if(G&&G.roster)G.roster.forEach(m=>{s[m.id]=Array.isArray(m.inj)?m.inj.map(x=>x&&x.id):[]});if(o)o.inj0=s;return s}
function unitNewInj(u,snap){const m=u.m,all=typeof cpInj==='function'?cpInj(m):[];if(!all.length)return[];
 const own=Array.isArray(u.injNew)?u.injNew:Array.isArray(u.injuries)?u.injuries:null;
 if(own){const ids=own.map(x=>x&&typeof x==='object'?x.id:x);return all.filter(j=>ids.includes(j.id))}
 if(snap&&snap[m.id]){const old=snap[m.id].slice();return all.filter(j=>{const i=old.indexOf(j.id);if(i>=0){old.splice(i,1);return false}return true})}
 const raw=m.inj.filter(y=>y&&y.id!=null);return all.filter((j,i)=>!!(raw[i]&&(raw[i].fresh||raw[i].isNew)))}
// Rules: casualties, xp, crowns and loot; armor wear and injuries carried home. Returns the result record (also kept as B.result).
// res.men lists every sword that was fielded: {id,name,state:'ok'|'down'|'dead'|'withdrew'|'fled',hp,hpMax,arm,helm,inj:[{id,n,d,days,perm}],lvl}
// (arm / helm = armor points lost in this battle; shield = its shield was destroyed; lvl = the new level when one was gained, else 0).
function resolveBattle(win){const b=B;if(typeof battleSync==='function')battleSync();const pu=b.units.filter(u=>u.side===0&&u.m),dead=[],snap=b.opts&&b.opts.inj0||null,
  res={win:!!win,fled:!!b.fled,stuck:false,famed:[],f:b.opts.f,rounds:b.round,turns:b.turns,foes:b.units.filter(u=>u.side===1).length,down:[],dead:[],levels:[],xp:0,share:0,crowns:0,loot:[],
   withdrew:[],routed:[],injuries:[],men:[],armorLost:0,helmLost:0,repair:0,toolsNeed:0,tools:0,slain:[],foeKeys:[],parts:[],xpK:1};
 res.obj=b.obj?b.obj.state||'ok':null;res.objK=b.obj?b.obj.k:null;if(b.obj&&b.obj.vip)res.vip={name:b.obj.vip.name,alive:!!b.obj.vip.alive,hp:Math.max(0,Math.round(b.obj.vip.hp)),hpMax:b.obj.vip.hpMax};if(b.bossU)res.boss={name:b.bossU.name,slain:!b.bossU.alive};
 // the foes by EN key: every one that took the field (foeKeys) and those killed (slain); partsDrop and the ambitions read them
 {const ek=enKeyOf();for(const u of b.units)if(u.side===1&&u.def){const k=ek.get(u.def)||u.eid||u.key||null;if(!k)continue;res.foeKeys.push(k);if(!u.alive&&!u.left&&!u.withdrawn)res.slain.push(k)}}
 const num=v=>typeof v==='number'&&isFinite(v),rows=new Map();
 for(const u of pu){const m=u.m,left=unitLeft(u),c0=typeof cpCond==='function'?cpCond(m):{a:0,aM:0,h:0,hM:0},row={id:m.id,name:m.name,state:'ok',hp:0,hpMax:u.hpMax,arm:0,helm:0,shield:u.shpMax>0&&!u.shield,inj:[],lvl:0};
  if(left){m.hp=Math.max(1,Math.min(num(u.hp)?Math.round(u.hp):1,calc(m).hp));row.state=left;(left==='fled'?res.routed:res.withdrew).push(m.name)}
  else if(u.alive)m.hp=Math.max(1,Math.min(u.hp,calc(m).hp));else if(u.down){m.hp=1;row.state='down';res.down.push(m.name)}else{dead.push(m);row.state='dead'}
  if(row.state!=='dead'){   // armor does not mend itself: what is left of it goes home on the merc
   const a=num(u.arm)?clamp(Math.round(u.arm),0,c0.aM):c0.a,h=num(u.helm)?clamp(Math.round(u.helm),0,c0.hM):c0.h;
   if(typeof setArmorCond==='function')setArmorCond(m,a,h);
   else if(a<c0.aM||h<c0.hM||m.cond){const c=m.cond&&typeof m.cond==='object'?m.cond:(m.cond={});if(a<c0.aM)c.a=a;else delete c.a;if(h<c0.hM)c.h=h;else delete c.h;if(c.a===undefined&&c.h===undefined)delete m.cond}
   row.arm=Math.max(0,c0.a-a);row.helm=Math.max(0,c0.h-h);res.armorLost+=row.arm;res.helmLost+=row.helm;row.hp=m.hp;
   row.inj=unitNewInj(u,snap).map(j=>({id:j.id,n:j.n,d:j.d,days:j.days,perm:j.perm}));row.inj.forEach(j=>res.injuries.push({name:m.name,id:j.id,n:j.n,d:j.d,days:j.days,perm:j.perm}))}
  rows.set(m,row);res.men.push(row)}
 G.roster=G.roster.filter(m=>!dead.includes(m));dead.forEach(m=>{res.dead.push(m.name);if(win)['w','b','s','a','h'].forEach(k=>{if(m.eq[k])G.stash.push(m.eq[k])})});
 if(b.rival)rivalResolve(b,res,win);   // the rival company's dead, wounded and fled; its purse, gear and a beaten sword who asks to join
 if(win)res.cargo=caravanCargo(b.opts.src);
 if(win){const en=b.units.filter(u=>u.side===1);en.forEach(e=>res.xp+=e.def&&e.def.xp||(e.m?rivalXP(e.m):0));const surv=pu.filter(u=>!dead.includes(u.m)).map(u=>u.m);res.xpK=typeof followerHas==='function'&&followerHas('drill')?1.2:1;res.share=Math.round(res.xp*res.xpK/Math.max(1,surv.length));   // the drillmaster: +20%
  surv.forEach(m=>{const l=m.lvl;gainXP(m,res.share);if(m.lvl>l){res.levels.push({name:m.name,lvl:m.lvl,from:l,opens:brOpens(l,m.lvl)});const r=rows.get(m);r.lvl=m.lvl;r.from=l}});
  res.crowns=Math.round(res.xp*(.15+rnd()*.15));G.crowns+=res.crowns;en.forEach(e=>{const L=FACT[e.f]&&!e.m?(FACT[e.f].loot||[]).filter(id=>ITEMS[id]):[];if(L.length&&rnd()<.18)res.loot.push(pick(L))});
  // helmets come off the fallen too, where the faction's own loot table carries none
  {const L=FACT[b.opts.f]&&FACT[b.opts.f].loot||[],H=Object.keys(ITEMS).filter(k=>ITEMS[k].k==='h'&&!ITEMS[k].uniq&&!ITEMS[k].famed);
   if(!b.rival&&H.length&&L.length&&!L.some(id=>ITEMS[id]&&ITEMS[id].k==='h')){const top=Math.max(...L.map(id=>ITEMS[id]?ITEMS[id].price||0:0)),ok=H.filter(k=>(ITEMS[k].price||0)<=top);
    if(ok.length)en.forEach(()=>{if(rnd()<.07)res.loot.push(pick(ok))})}}
  res.famed=battleFamed(b,en);res.famed.forEach(id=>res.loot.push(id));
  res.loot.forEach(id=>G.stash.push(id));
  // monster parts (13-craft.js partsDrop), the herbalist adding one more of a kind half the time
  if(typeof partsDrop==='function'){let L=null;try{L=partsDrop(res)}catch(e){L=null}
   if(Array.isArray(L)){const herb=typeof followerHas==='function'&&followerHas('herbalist'),by={};
    for(const x of L){if(!x||typeof x.key!=='string'||!(x.n>0))continue;if(typeof PARTS!=='undefined'&&!PARTS[x.key])continue;by[x.key]=(by[x.key]||0)+Math.floor(x.n)}
    if(!G.parts||typeof G.parts!=='object')G.parts={};for(const k in by){let n=by[k];if(herb&&rnd()<.5)n++;G.parts[k]=(G.parts[k]||0)+n;res.parts.push({key:k,n})}}}}
 if(typeof ambEvent==='function')ambEvent('battle',res);
 if(typeof cpDamageAll==='function'){res.repair=cpDamageAll();res.toolsNeed=Math.ceil(res.repair/cpToolPts());res.tools=cpTools()}
 b.result=res;return res}
/* ---- rival companies (CONTRACT.md) ----
   rivalResolve(b,res,win) writes res.rival = {id, n, dead:[names], down:[names], fled:[names], ok:[names], routed, purse, renown,
   loot:[{id,k,worn:[left,max]|null}], joiner:{id,name,lvl,bg,bgN,room,taken,declined}|null, wiped} and applies it:
     the killed leave the rival's roster (m.dead is set); everyone else keeps what the battle left them: hitpoints (1 for the struck
     down), armor and helmet condition (setArmorCond), a split shield is gone, injuries stay (inflicted on m during the fight);
     a won battle: each item of the killed drops with chance RIVAL.loot (armor and helmets keep the wear they died in, in res.rival.loot;
     one beaten to nothing, or a split shield, does not drop), and one struck-down sword may ask to join (RIVAL.join[pers]; rivalJoin(res) takes him on).
   The rival's war chest, renown both ways, standing, news and a wipe-out are the world's (worldBattleEnd -> rvBattleEnd in settleBattle,
   which hands back {crowns, renown, rival}); rr.purse / rr.renown are filled from that report there, for the toast.
   Order of the seeded draws: per killed merc in unit order, per item w b s a h; then the joiner rolls, struck-down in unit order. */
const RIVAL={loot:.45,join:{honour:.3,cutthroat:.55,greedy:.5,glory:.35},xp:[70,22]};
const rivalXP=m=>RIVAL.xp[0]+RIVAL.xp[1]*(m.lvl||1);
function rivalResolve(b,res,win){const r=typeof battleRival==='function'?battleRival(b.rival):null,rr={id:b.rival,n:r?rivalName(r):'The rivals',dead:[],down:[],fled:[],ok:[],loot:[],purse:0,renown:0,joiner:null,routed:!!(b.rout&&b.rout[1]),wiped:false};
 res.rival=rr;if(!r)return rr;const num=v=>typeof v==='number'&&isFinite(v),gone=[],downU=[];
 for(const u of b.units){if(u.side!==1||!u.m)continue;const m=u.m,st=u.alive?'ok':u.gone?'fled':u.down?'down':'dead';rr[st].push(m.name);
  if(st==='dead'){gone.push(u);continue}if(st==='down')downU.push(u);
  m.hp=st==='down'?1:Math.max(1,Math.min(num(u.hp)?Math.round(u.hp):1,calc(m).hp));
  const c=armorCond(m);if(typeof setArmorCond==='function')setArmorCond(m,num(u.arm)?u.arm:c.a,num(u.helm)?u.helm:c.h);
  if(u.shpMax>0&&!u.shield&&!u.slung&&m.eq.s)m.eq.s=null}                                  // a split shield does not march on
 for(const u of gone){const m=u.m;if(win){const c=armorCond(m),a=num(u.arm)?clamp(Math.round(u.arm),0,c.aMax):c.a,h=num(u.helm)?clamp(Math.round(u.helm),0,c.hMax):c.h;   // the wear it died in
   for(const k of ['w','b','s','a','h']){const id=m.eq[k];if(!id||!ITEMS[id])continue;if(k==='s'&&u.shpMax>0&&!u.shield&&!u.slung)continue;const worn=k==='a'?[a,c.aMax]:k==='h'?[h,c.hMax]:null;   // a split shield is firewood
    if(worn&&worn[1]>0&&worn[0]<=0)continue;if(rnd()<RIVAL.loot)rr.loot.push({id,k,worn:worn&&worn[0]<worn[1]?worn:null})}}m.dead=true}
 r.roster=r.roster.filter(m=>!gone.some(u=>u.m===m));
 if(win){rr.loot.forEach(x=>res.loot.push(x.id));
  const jc=RIVAL.join[r.pers]!=null?RIVAL.join[r.pers]:.4;
  for(const u of downU.slice().sort((x,y)=>(y.m.lvl||1)-(x.m.lvl||1)||x.id-y.id)){if(rnd()<jc){const m=u.m;rr.joiner={id:m.id,name:m.name,lvl:m.lvl,bg:m.bg,bgN:BG[m.bg]?BG[m.bg].n:m.bg,room:G.roster.length<MAXROSTER,taken:false,declined:false};break}}}
 if(!r.roster.length)rr.wiped=true;   // the world wipes it out (worldBattleEnd -> rvBattleEnd)
 return rr}
/* rivalJoin(res?): the struck-down rival sword of res.rival.joiner (default B.result) leaves the rival's roster for the company's,
   as he is (1 hitpoint, injuries, gear). Refused when the roster holds MAXROSTER. Returns the merc, or null. No randomness. */
function rivalJoin(res){res=res||(typeof B!=='undefined'&&B&&B.result)||null;const rr=res&&res.rival,j=rr&&rr.joiner;if(!j||j.taken||j.declined)return null;
 if(G.roster.length>=MAXROSTER){j.room=false;return null}const r=battleRival(rr.id),i=r?r.roster.findIndex(m=>m.id===j.id):-1;if(i<0)return null;
 const m=r.roster.splice(i,1)[0];if(G.roster.some(x=>x.id===m.id)||!Number.isInteger(m.id))m.id=G.nid++;delete m.rv;delete m.dead;m.slot=null;m.hp=Math.max(1,m.hp);
 m.field=G.roster.filter(x=>x.field).length<MAXFIELD;G.roster.push(m);j.taken=true;j.id=m.id;if(!r.roster.length){rr.wiped=true;if(!(typeof B!=='undefined'&&B)&&typeof rvWipe==='function')rvWipe(r,'when its last sword joined '+(G.name||'the company'))}return m}   // before settleBattle the world wipes it itself
// The cargo of the caravan a won battle was against, for the results sheet: {good, text} (cargoText, 40-world.js), or null.
// It is the world's to hand over (cargoTake, from worldBattleEnd in settleBattle); this only reads it.
function caravanCargo(s){if(!s||s.type!=='party'||!G||!Array.isArray(G.parties))return null;const p=G.parties.find(q=>q.id===s.id);if(!p||p.goal!=='caravan'||!p.cargo)return null;
 let text='';if(typeof cargoText==='function'){try{text=String(cargoText(p.cargo)||'')}catch(e){text=''}}if(!text&&p.cargo.crowns>0)text=Math.round(p.cargo.crowns)+' crowns';return{good:p.cargo.good||null,text}}
// What cargoTake reported through worldBattleEnd, as one line (a string, or {text|t|lines}).
function cargoLine(w){const c=w&&(w.cargo||w.took||w.loot);if(!c)return'';if(typeof c==='string')return c;if(Array.isArray(c))return c.map(x=>typeof x==='string'?x:x&&(x.t||x.text||x.n)||'').filter(Boolean).join(', ');
 if(typeof c==='object')return String(c.text||c.t||(Array.isArray(c.lines)?c.lines.join(', '):'')||'');return''}
/* famed drops of a won battle (12-famed.js famedPlan): guaranteed from end-game kills, else a chance late in the campaign
   that grows with the foes' rank and the day. Draws game randomness only when a drop is possible. Returns the new item ids. */
function enKeyOf(){const m=new Map();if(typeof EN==='object'&&EN)for(const k in EN)m.set(EN[k],k);return m}
function battleFamed(b,en){if(typeof famedPlan!=='function'||typeof makeFamed!=='function')return[];
 const rank=b.frank&&b.frank.x>1?Math.log2(b.frank.x):0,plan=famedPlan(en,{day:G.day,rank,f:b.opts.f}),out=[];
 for(const s of plan.sure){const id=makeFamed(famedBasePick(s.power,b.opts.f),s.power,{from:s.from,day:G.day});if(id)out.push(id)}
 if(!out.length&&plan.p>0&&rnd()<plan.p){const id=makeFamed(famedBasePick(plan.power,b.opts.f),plan.power,{from:'a '+(FACT[b.opts.f]?FACT[b.opts.f].n.toLowerCase().replace(/s$/,''):'foe')+' band',day:G.day});if(id)out.push(id)}
 return out}
/* what a level-up from level a to level b opens: ['New tier unlocked', 'Weapon trees open', ...] (tierLevel from the rules, else t / 3t) */
function brTierLv(kind,t){if(typeof tlTierLv==='function')return tlTierLv(kind,t);if(typeof tierLevel==='function'){try{const v=tierLevel(kind,t);if(typeof v==='number')return v}catch(e){}}return kind==='weapon'?3*t:t}
function brOpens(a,b){const out=[],R=['I','II','III','IV','V','VI','VII','VIII','IX'];if(!(b>a))return out;
 for(let t=1;t<=9;t++){const L=brTierLv('style',t);if(L>a&&L<=b&&t<=6)out.push('New tier unlocked: tier '+R[t-1])}
 for(let t=1;t<=3;t++){const L=brTierLv('weapon',t);if(L>a&&L<=b)out.push(t===1?'Weapon trees open':'Weapon tier '+R[t-1]+' opens')}
 return out}
/* the battle objective's outcome, one line (escort / hold / siege, and a named foe) */
function brObjLine(res){let t='';if(res.objK==='escort')t=res.vip&&res.vip.alive?`<p class="good">${res.vip.name} came through (${res.vip.hp}/${res.vip.hpMax}).</p>`:`<p class="bad">The ${(res.vip?res.vip.name:'wagon').toLowerCase()} is lost.</p>`;
 else if(res.objK==='hold'&&res.obj==='won'&&res.win)t=`<p class="good">The line held for ${res.rounds-1} rounds. The raiders give it up.</p>`;else if(res.objK==='siege'&&res.win)t='<p class="good">The siege lines are broken.</p>';
 if(res.boss)t+=res.boss.slain?`<p class="good">${res.boss.name} is dead.</p>`:'';return t}
/* the results dialog: outcome, spoils, then one line per sword that has something to report */
function brIcon(n,sz){return typeof cpIcon==='function'?cpIcon(n,sz||16):''}
function brItem(id){const it=ITEMS[id];if(!it)return'';return`<span class="br-it${it.famed?' fmd':''}">${typeof pnItemIcon==='function'?pnItemIcon(id,32):''}<b>${typeof pnItemName==='function'?pnItemName(id):it.n}</b>${it.famed?`<small class="fmd-tag">Famed</small>`:''}</span>`}
function brMan(r){const u=B&&B.units?B.units.find(u=>u.side===0&&u.m&&u.m.id===r.id):null,por=u&&typeof portraitHTML==='function'?portraitHTML(u.m,32):'';
 const tag={down:['bad','Struck down'],dead:['dead','Dead'],withdrew:['dim','Withdrew'],fled:['warn','Fled']}[r.state],bits=[];
 if(r.state==='down')bits.push('Lives, at 1 hitpoint');
 if(r.shield)bits.push('<span class="br-w">'+brIcon('shield')+'shield lost</span>');
 if(r.arm||r.helm)bits.push(`<span class="br-w">${r.arm?brIcon('armor')+'−'+r.arm:''}${r.helm?brIcon('helmet')+'−'+r.helm:''}</span>`);
 const inj=r.inj.map(j=>`<span class="br-inj">${typeof cpInjIcon==='function'?cpInjIcon(j.id):''}<b>${j.n}</b> ${j.d}${j.perm?', for good':j.days>0?', '+j.days+' day'+(j.days===1?'':'s'):''}</span>`).join('');
 return`<div class="br-man ${r.state}">${por}<div><span class="br-nm"><b>${r.name}</b>${tag?`<em class="${tag[0]}">${tag[1]}</em>`:''}${r.lvl?`<em class="up">Level ${r.lvl}</em>`:''}</span>${bits.length?`<span class="br-bits">${bits.join(' ')}</span>`:''}${r.lvl?brOpens(r.from!=null?r.from:r.lvl-1,r.lvl).map(t=>`<span class="br-tier">${brIcon(/Weapon/.test(t)?'swords':'level')}${t}</span>`).join(''):''}${inj}</div></div>`}
// The rival company's part of the results sheet: who fell, the purse, worn gear, the sword who asks to join.
function brRival(res){const rr=res.rival;if(!rr)return'';const r=typeof battleRival==='function'?battleRival(rr.id):null,bn=r&&typeof rivalBannerHTML==='function'?rivalBannerHTML(r,32):'',L=(a,w)=>a.length?`${a.length} ${w} (${a.join(', ')})`:'';
 const parts=[L(rr.dead,'dead'),L(rr.down,'struck down'),L(rr.fled,rr.routed?'routed':'fled')].filter(Boolean);
 let h=`<div class="br-rv" style="display:flex;gap:8px;align-items:center">${bn}<p><b>${rr.n}</b>${res.win?rr.wiped?' are wiped out.':rr.routed?' break and run.':' are beaten.':' hold the field.'}${parts.length?' '+parts.join('; ')+'.':''}</p></div>`;
 if(res.win)h+=`<p class="br-rvp dim">Their war chest and the renown of beating them are yours as you march on.</p>`;
 const worn=rr.loot.filter(x=>x.worn);if(res.win&&worn.length)h+=`<p class="dim br-worn">Worn: ${worn.map(x=>`${ITEMS[x.id].n} (${x.worn[0]}/${x.worn[1]})`).join(', ')}.</p>`;
 const j=rr.joiner;if(res.win&&j){const m=r?r.roster.find(x=>x.id===j.id):null,mm=m||(G.roster.find(x=>x.id===j.id)),por=mm&&typeof portraitHTML==='function'?portraitHTML(mm,32):'';
  if(j.taken)h+=`<div class="br-join" style="display:flex;gap:8px;align-items:flex-start">${por}<p class="good"><b>${j.name}</b> joins the company, at 1 hitpoint, wounds and all.</p></div>`;
  else if(j.declined)h+=`<p class="dim br-join">${j.name} is left where he fell.</p>`;
  else h+=`<div class="br-join" style="display:flex;gap:8px;align-items:flex-start">${por}<p><b>${j.name}</b>, a level ${j.lvl} ${String(j.bgN).toLowerCase()}, was struck down but lives, and asks to join you.${j.room?'':` <span class="bad">No room: the roster holds ${MAXROSTER}.</span>`}</p><div class="row">${j.room?`<button class="pri" onclick="brJoin(1)">Take him on</button>`:''}<button onclick="brJoin(0)">Leave him</button></div></div>`}
 return h}
// The joiner's answer from the results sheet (UI: no randomness). Redraws the sheet.
function brJoin(yes){const res=B&&B.result;if(!res||!res.rival||!res.rival.joiner)return;const j=res.rival.joiner;if(yes){if(!rivalJoin(res)&&typeof toast==='function')toast(j.room?'He cannot join now':'The roster is full')}else j.declined=true;
 if(typeof sheet==='function')sheet(battleResultHTML(res))}
function battleResultHTML(res){const men=(res.men||[]).filter(r=>r.state!=='ok'||r.inj.length||r.arm||r.helm||r.lvl||r.shield),fine=(res.men||[]).length-men.length;let h;
 if(res.win)h=`<h2>Victory</h2><p>Each survivor earns ${res.share} xp. You strip <span class="coin">${res.crowns} crowns</span> from the field${res.loot.length?' and carry off:':'.'}</p>`;
 else h=`<h2>${res.fled?'Retreat':'Defeat'}</h2><p>${res.fled?'The company breaks away and regroups.':'The line is broken.'}</p>`;
 h+=brObjLine(res);
 if(res.win&&res.loot.length)h+=`<div class="br-loot">${res.loot.map(brItem).join('')}</div>`;
 h+=brRival(res);
 if(res.win&&res.cargo)h+=`<p class="br-cargo">${brIcon(['cargo','stash'])}<span>The caravan's cargo is yours${res.cargo.text?': '+res.cargo.text:''}.</span></p>`;
 if(res.win&&res.parts&&res.parts.length)h+=`<div class="br-parts"><span class="br-ph">${brIcon(['parts','stash'])}Monster parts${typeof followerHas==='function'&&followerHas('herbalist')?' <small>(herbalist)</small>':''}</span>${res.parts.map(x=>{const P=typeof PARTS!=='undefined'&&PARTS[x.key]||{};return`<span class="br-pt">${typeof pxIcon==='function'?pxIcon(P.icon||'part-'+x.key,16):''}<b>${P.n||x.key}</b><i>x${x.n}</i></span>`}).join('')}</div>`;
 if(res.win&&res.xpK>1)h+=`<p class="dim br-drill">${brIcon('xp')}The drillmaster drives them on: +${Math.round((res.xpK-1)*100)}% experience.</p>`;
 if(res.win&&res.famed&&res.famed.length)h+=res.famed.map(id=>{const L=typeof famedLines==='function'?famedLines(id):[];return`<p class="br-fm"><b class="fmd-n">${ITEMS[id].n}</b>: a famed ${ITEMS[ITEMS[id].base].n.toLowerCase()}. ${L.map(x=>x.t).join(', ')}.</p>`}).join('');
 // the plain lines stay (and stay first) for anyone reading the dialog as text
 const lines=res.down.map(n=>`${n} was struck down but lives.`).concat(res.dead.map(n=>`<span class="bad">${n} is dead.</span>`),res.levels.map(l=>`<span class="coin">${l.name} reached level ${l.lvl}${(l.opens||[]).length?'. '+l.opens.join('. '):''}.</span>`),
  (res.withdrew||[]).map(n=>`${n} withdrew from the field.`),(res.routed||[]).map(n=>`<span class="bad">${n} broke and fled.</span>`),(res.injuries||[]).map(j=>`<span class="bad">${j.name}: ${j.n.toLowerCase()} (${j.d}).</span>`));
 if(men.length)h+=`<div class="br-men">${men.map(brMan).join('')}</div><div class="br-txt">${lines.map(l=>`<p>${l}</p>`).join('')}</div>`;
 else h+=lines.map(l=>`<p>${l}</p>`).join('');
 if(men.length&&fine>0)h+=`<p class="dim br-fine">${fine===1?'One sword':fine+' swords'} came through untouched.</p>`;
 if(res.repair>0)h+=`<p class="br-rep ${res.tools>=res.toolsNeed?'':'short'}">${brIcon('tools')}<span>Armor and helmets need <b>${res.repair}</b> points of mending: <b>${res.toolsNeed} tool${res.toolsNeed===1?'':'s'}</b>. You carry ${res.tools}.${res.tools>=res.toolsNeed?' Make camp or rest at an inn to repair.':' Buy tools at a market.'}</span></p>`;
 return`<div class="br">${h}</div><button class="pri" onclick="afterBattle(${res.win?1:0})">Continue</button>`}
function endBattle(win){const b=B;if(!b)return null;if(b.result)return b.result;b.over=true;b.busy=true;const res=resolveBattle(win);
 if(!b.opts.quiet&&typeof sheet==='function')sheet(battleResultHTML(res));if(b.onEnd)b.onEnd(res);return res}
// Rules: leaves the battle and applies its consequences to the campaign. Returns what happened:
// {kind:'wiped',days} | {kind:'world',toast?} | {kind:'dunNext',stage,realm} | {kind:'dunDone',pay,ended}
// src is only given when there is no battle to read it from (a withdrawal before the first blow, see fleeEncounter).
function settleBattle(win,src){const s=src||B&&B.opts.src||{},B0res=B&&B.result||null;B=null;mode='world';
 if(!G.roster.length){clearSave();return{kind:'wiped',days:G.day}}
 G.grace=3;const out={kind:'world',toast:null};
 // the world's consequences first (caravan loot, reputation, sieges broken, nests cleared: 40-world.js), while the beaten party is still on the map
 if(typeof worldBattleEnd==='function'){try{out.world=worldBattleEnd(s,win,B0res)}catch(e){out.world=null}}   // (the result record rides along: res.rival, res.cargo)
 out.cargo=cargoLine(out.world);
 if(B0res&&B0res.rival&&out.world){const rr=B0res.rival;rr.purse=Math.max(0,Math.round(+out.world.crowns||0));rr.renown=Math.max(0,Math.round(+out.world.renown||0));out.rival=rr}
 if(s.type==='nest'&&win){const c=G.contract;if(c&&!c.failed&&c.type==='nest'&&c.nest===s.id&&typeof ctrBattleEnd==='function'){const st=ctrStage(c);if(st&&st.k==='go'&&st.fight)out.toast=ctrBattleEnd(c,true,B0res)}else if(typeof nestClear==='function'&&Array.isArray(G.nests)&&G.nests.some(n=>n.id===s.id))nestClear(s.id)}
 if(s.type==='party'){if(win){G.parties=G.parties.filter(p=>p.id!==s.id);G.renown+=3}}
 else if(s.type==='lair'&&typeof ctrBattleEnd==='function'){const c=G.contract;if(c&&!c.failed&&(s.id==null||s.id===c.id)){out.toast=ctrBattleEnd(c,win,B0res)||null}}
 else if(s.type==='twist'){if(!win&&G.contract&&G.contract.id===s.id&&typeof ctrFail==='function'){/* a lost ambush costs the cargo */const c=G.contract;if(c.type==='deliver'||c.type==='escort'||c.type==='relic'){ctrFail(c,'Lost the cargo to an ambush');out.toast='Contract failed: the cargo is lost'}}}
 else if(s.type==='lair'){const c=G.contract;if(c&&c.type==='hunt'&&!c.done){if(win){c.done=true;if(typeof ambEvent==='function')ambEvent('lair',{f:c.f,diff:c.diff});out.toast='Contract done. Return to '+G.towns[c.town].name+' for pay'}else{G.contract=null;G.renown=Math.max(0,G.renown-5);out.toast='Contract failed'}}}
 else if(s.type==='dun'&&G.dun){const d=G.dun;
  if(!win){G.dun=null;out.toast='The rift spits you back out'}
  else if(d.stage<2){d.stage++;G.roster.forEach(m=>{const mx=calc(m).hp;m.hp=Math.min(mx,m.hp+Math.round(mx*.15))});return{kind:'dunNext',stage:d.stage,realm:d.realm}}
  else{const pay=Math.round((800+G.day*20)*(typeof originK==='function'?originK('rift'):1));G.crowns+=pay;G.renown+=50;G.stash.push('riftedge');if(typeof ambEvent==='function')ambEvent('rift');G.portals=G.portals.filter(p=>p.id!==d.id);G.dun=null;let ended=false;
   if(G.crisis){G.crisis.closed++;if(!G.crisis.ended&&G.crisis.closed>=G.crisis.total)G.crisis.ended=ended=true}
   return{kind:'dunDone',pay,ended}}}
 return out}
// Rules: the company declines a battle it has not yet joined. The same price as sounding the retreat in one: a tenth of the
// crowns dropped on the run, and whatever settleBattle() makes of a lost fight of that kind (a hunt is forfeit, a rift closes).
function fleeEncounter(o){const c0=G.crowns;G.crowns=Math.floor(G.crowns*.9);const out=settleBattle(false,o&&o.src||{});out.lost=c0-G.crowns;return out}
function afterBattle(win){if(!B)return null;const f0=B.opts&&B.opts.f;const out=settleBattle(win);setUI();closeSheet(true);
 if(out.kind==='wiped'){sheet(`<h2>The company is no more</h2><p>Nobody is left to carry the banner. It lasted ${out.days} days.</p><button class="pri" onclick="if(typeof newCompanySetup==='function')newCompanySetup();else newGame()">Raise a new company</button>`);return out}
 if(out.kind==='dunNext'){sheet(`<h2>${BIO[out.realm].n}</h2><p>${out.stage===1?'The path winds deeper. The air tastes of iron.':'A throne of fused stone. Something vast stirs upon it.'}</p><p class="dim">The company catches its breath (+15% HP). Battle ${out.stage+1} of 3.</p><button class="pri" onclick="dunBattle()">Press on</button>`);return out}
 if(out.kind==='dunDone'){let msg=`<h2>The rift collapses</h2><p>The tyrant falls and the tear in the world seals behind you. You carry out <span class="coin">${out.pay} crowns</span> of strange gold and a rift-forged blade.</p>`;
  if(out.ended)msg+=`<p class="good">The last of the three rifts is closed. The Sundering is over, though lesser rifts may still open.</p>`;
  sheet(msg+`<button class="pri" onclick="closeSheet()">Return to the world</button>`)}
 else if(out.toast)toast(out.toast);
 if(out.kind==='world'&&out.cargo&&typeof toast==='function')toast('Taken from the caravan: '+out.cargo);
 if(out.kind==='world'&&win&&out.rival&&(out.rival.purse||out.rival.renown)&&typeof toast==='function')toast(`${out.rival.n}' war chest: ${out.rival.purse} crowns${out.rival.renown?`, +${out.rival.renown} renown`:''}`);
 save();if(typeof ambNotify==='function'&&!sheetOpen)ambNotify();
 if(win&&out.kind==='world'&&typeof eventTick==='function'&&!sheetOpen){try{eventTick('after',{win:true,f:f0})}catch(e){}}   // a battle-aftermath event (17-events.js)
 return out}
// Headless: fight o to the end with the AI on both sides and no result sheet. Resolves with the result record
// (result.stuck is set if o.turnCap was hit), or null if nobody can be fielded. Follow with settleBattle(result.win).
function autoBattle(o){return new Promise(done=>{const p=Object.assign({},o,{auto:true,quiet:true,onEnd:done});battleSnap(p);if(!startBattle(p))done(null)})}
function portalSheet(id){const p=G.portals.find(p=>p.id===id);if(!p)return;sheet(`<h2>A rift to ${BIO[p.realm].n}</h2><p>The tear hums. Beyond it lies another world: three battles with no rest, ending in a tyrant. Wounds carry over between fights.</p><div class="row"><button class="pri" style="flex:1" onclick="enterRift(${id})">Step through</button><button onclick="closeSheet()">Not yet</button></div>`)}
function enterRift(id){const p=G.portals.find(p=>p.id===id);if(!p)return;G.dun={id:p.id,stage:0,realm:p.realm};dunBattle()}
function dunBattle(){const d=G.dun;if(!d)return;engage({f:'void',mult:[1,1.3,1][d.stage]||1,biome:d.realm,fixed:d.stage===2?['tyrant']:null,src:{type:'dun'}})}
