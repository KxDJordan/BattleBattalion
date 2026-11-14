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
  res={win:!!win,fled:!!b.fled,stuck:false,f:b.opts.f,rounds:b.round,turns:b.turns,foes:b.units.filter(u=>u.side===1).length,down:[],dead:[],levels:[],xp:0,share:0,crowns:0,loot:[],
   withdrew:[],routed:[],injuries:[],men:[],armorLost:0,helmLost:0,repair:0,toolsNeed:0,tools:0};
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
 if(win){const en=b.units.filter(u=>u.side===1);en.forEach(e=>res.xp+=e.def&&e.def.xp||0);const surv=pu.filter(u=>!dead.includes(u.m)).map(u=>u.m);res.share=Math.round(res.xp/Math.max(1,surv.length));
  surv.forEach(m=>{const l=m.lvl;gainXP(m,res.share);if(m.lvl>l){res.levels.push({name:m.name,lvl:m.lvl,from:l,opens:brOpens(l,m.lvl)});const r=rows.get(m);r.lvl=m.lvl;r.from=l}});
  res.crowns=Math.round(res.xp*(.15+rnd()*.15));G.crowns+=res.crowns;en.forEach(e=>{const L=FACT[e.f]?FACT[e.f].loot:[];if(L.length&&rnd()<.18)res.loot.push(pick(L))});
  // helmets come off the fallen too, where the faction's own loot table carries none
  {const L=FACT[b.opts.f]&&FACT[b.opts.f].loot||[],H=Object.keys(ITEMS).filter(k=>ITEMS[k].k==='h'&&!ITEMS[k].uniq);
   if(H.length&&L.length&&!L.some(id=>ITEMS[id]&&ITEMS[id].k==='h')){const top=Math.max(...L.map(id=>ITEMS[id]?ITEMS[id].price||0:0)),ok=H.filter(k=>(ITEMS[k].price||0)<=top);
    if(ok.length)en.forEach(()=>{if(rnd()<.07)res.loot.push(pick(ok))})}}
  res.loot.forEach(id=>G.stash.push(id))}
 if(typeof cpDamageAll==='function'){res.repair=cpDamageAll();res.toolsNeed=Math.ceil(res.repair/cpToolPts());res.tools=cpTools()}
 b.result=res;return res}
/* what a level-up from level a to level b opens: ['New tier unlocked', 'Weapon trees open', ...] (tierLevel from the rules, else t / 3t) */
function brTierLv(kind,t){if(typeof tlTierLv==='function')return tlTierLv(kind,t);if(typeof tierLevel==='function'){try{const v=tierLevel(kind,t);if(typeof v==='number')return v}catch(e){}}return kind==='weapon'?3*t:t}
function brOpens(a,b){const out=[],R=['I','II','III','IV','V','VI','VII','VIII','IX'];if(!(b>a))return out;
 for(let t=1;t<=9;t++){const L=brTierLv('style',t);if(L>a&&L<=b&&t<=6)out.push('New tier unlocked: tier '+R[t-1])}
 for(let t=1;t<=3;t++){const L=brTierLv('weapon',t);if(L>a&&L<=b)out.push(t===1?'Weapon trees open':'Weapon tier '+R[t-1]+' opens')}
 return out}
/* the results dialog: outcome, spoils, then one line per sword that has something to report */
function brIcon(n,sz){return typeof cpIcon==='function'?cpIcon(n,sz||16):''}
function brItem(id){const it=ITEMS[id];if(!it)return'';return`<span class="br-it">${typeof pnItemIcon==='function'?pnItemIcon(id,32):''}<b>${it.n}</b></span>`}
function brMan(r){const u=B&&B.units?B.units.find(u=>u.side===0&&u.m&&u.m.id===r.id):null,por=u&&typeof portraitHTML==='function'?portraitHTML(u.m,32):'';
 const tag={down:['bad','Struck down'],dead:['dead','Dead'],withdrew:['dim','Withdrew'],fled:['warn','Fled']}[r.state],bits=[];
 if(r.state==='down')bits.push('Lives, at 1 hitpoint');
 if(r.shield)bits.push('<span class="br-w">'+brIcon('shield')+'shield lost</span>');
 if(r.arm||r.helm)bits.push(`<span class="br-w">${r.arm?brIcon('armor')+'−'+r.arm:''}${r.helm?brIcon('helmet')+'−'+r.helm:''}</span>`);
 const inj=r.inj.map(j=>`<span class="br-inj">${typeof cpInjIcon==='function'?cpInjIcon(j.id):''}<b>${j.n}</b> ${j.d}${j.perm?', for good':j.days>0?', '+j.days+' day'+(j.days===1?'':'s'):''}</span>`).join('');
 return`<div class="br-man ${r.state}">${por}<div><span class="br-nm"><b>${r.name}</b>${tag?`<em class="${tag[0]}">${tag[1]}</em>`:''}${r.lvl?`<em class="up">Level ${r.lvl}</em>`:''}</span>${bits.length?`<span class="br-bits">${bits.join(' ')}</span>`:''}${r.lvl?brOpens(r.from!=null?r.from:r.lvl-1,r.lvl).map(t=>`<span class="br-tier">${brIcon(/Weapon/.test(t)?'swords':'level')}${t}</span>`).join(''):''}${inj}</div></div>`}
function battleResultHTML(res){const men=(res.men||[]).filter(r=>r.state!=='ok'||r.inj.length||r.arm||r.helm||r.lvl||r.shield),fine=(res.men||[]).length-men.length;let h;
 if(res.win)h=`<h2>Victory</h2><p>Each survivor earns ${res.share} xp. You strip <span class="coin">${res.crowns} crowns</span> from the field${res.loot.length?' and carry off:':'.'}</p>`;
 else h=`<h2>${res.fled?'Retreat':'Defeat'}</h2><p>${res.fled?'The company breaks away and regroups.':'The line is broken.'}</p>`;
 if(res.win&&res.loot.length)h+=`<div class="br-loot">${res.loot.map(brItem).join('')}</div>`;
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
function settleBattle(win,src){const s=src||B&&B.opts.src||{};B=null;mode='world';
 if(!G.roster.length){clearSave();return{kind:'wiped',days:G.day}}
 G.grace=3;const out={kind:'world',toast:null};
 if(s.type==='party'){if(win){G.parties=G.parties.filter(p=>p.id!==s.id);G.renown+=3}}
 else if(s.type==='lair'){const c=G.contract;if(c&&c.type==='hunt'&&!c.done){if(win){c.done=true;out.toast='Contract done. Return to '+G.towns[c.town].name+' for pay'}else{G.contract=null;G.renown=Math.max(0,G.renown-5);out.toast='Contract failed'}}}
 else if(s.type==='dun'&&G.dun){const d=G.dun;
  if(!win){G.dun=null;out.toast='The rift spits you back out'}
  else if(d.stage<2){d.stage++;G.roster.forEach(m=>{const mx=calc(m).hp;m.hp=Math.min(mx,m.hp+Math.round(mx*.15))});return{kind:'dunNext',stage:d.stage,realm:d.realm}}
  else{const pay=800+G.day*20;G.crowns+=pay;G.renown+=50;G.stash.push('riftedge');G.portals=G.portals.filter(p=>p.id!==d.id);G.dun=null;let ended=false;
   if(G.crisis){G.crisis.closed++;if(!G.crisis.ended&&G.crisis.closed>=G.crisis.total)G.crisis.ended=ended=true}
   return{kind:'dunDone',pay,ended}}}
 return out}
// Rules: the company declines a battle it has not yet joined. The same price as sounding the retreat in one: a tenth of the
// crowns dropped on the run, and whatever settleBattle() makes of a lost fight of that kind (a hunt is forfeit, a rift closes).
function fleeEncounter(o){const c0=G.crowns;G.crowns=Math.floor(G.crowns*.9);const out=settleBattle(false,o&&o.src||{});out.lost=c0-G.crowns;return out}
function afterBattle(win){if(!B)return null;const out=settleBattle(win);setUI();closeSheet(true);
 if(out.kind==='wiped'){sheet(`<h2>The company is no more</h2><p>Nobody is left to carry the banner. It lasted ${out.days} days.</p><button class="pri" onclick="newGame()">Raise a new company</button>`);return out}
 if(out.kind==='dunNext'){sheet(`<h2>${BIO[out.realm].n}</h2><p>${out.stage===1?'The path winds deeper. The air tastes of iron.':'A throne of fused stone. Something vast stirs upon it.'}</p><p class="dim">The company catches its breath (+15% HP). Battle ${out.stage+1} of 3.</p><button class="pri" onclick="dunBattle()">Press on</button>`);return out}
 if(out.kind==='dunDone'){let msg=`<h2>The rift collapses</h2><p>The tyrant falls and the tear in the world seals behind you. You carry out <span class="coin">${out.pay} crowns</span> of strange gold and a rift-forged blade.</p>`;
  if(out.ended)msg+=`<p class="good">The last of the three rifts is closed. The Sundering is over, though lesser rifts may still open.</p>`;
  sheet(msg+`<button class="pri" onclick="closeSheet()">Return to the world</button>`)}
 else if(out.toast)toast(out.toast);
 save();return out}
// Headless: fight o to the end with the AI on both sides and no result sheet. Resolves with the result record
// (result.stuck is set if o.turnCap was hit), or null if nobody can be fielded. Follow with settleBattle(result.win).
function autoBattle(o){return new Promise(done=>{const p=Object.assign({},o,{auto:true,quiet:true,onEnd:done});battleSnap(p);if(!startBattle(p))done(null)})}
function portalSheet(id){const p=G.portals.find(p=>p.id===id);if(!p)return;sheet(`<h2>A rift to ${BIO[p.realm].n}</h2><p>The tear hums. Beyond it lies another world: three battles with no rest, ending in a tyrant. Wounds carry over between fights.</p><div class="row"><button class="pri" style="flex:1" onclick="enterRift(${id})">Step through</button><button onclick="closeSheet()">Not yet</button></div>`)}
function enterRift(id){const p=G.portals.find(p=>p.id===id);if(!p)return;G.dun={id:p.id,stage:0,realm:p.realm};dunBattle()}
function dunBattle(){const d=G.dun;if(!d)return;engage({f:'void',mult:[1,1.3,1][d.stage]||1,biome:d.realm,fixed:d.stage===2?['tyrant']:null,src:{type:'dun'}})}
