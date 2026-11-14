/* ================= COMPANY UI =================
   One panel, three screens: 'roster' (portrait cards), 'formation' (2-row deployment grid), 'merc'
   (character: paper doll, stats, mastery trees; level-up and the stash picker take over the right pane).
   Formation lives on the merc as m.slot={row:0 front|1 back, col:0..BW-1} (null = deploy by the old rule).
   Phase 5: a helmet slot on the doll (m.eq.h), armor and helmet condition (m.cond) under it and in the stats, resolve (brv) in
   the stats and the level-up picks, injuries (m.inj) on the cards and the character screen, reserves under their own heading. */
let backTo=null;
let coSel=null,coView='main',coSlot='w',coAsk=null,lvFor=null,coScreen='roster',coPerk=null;   // coPerk={id: merc id, pid: selected perk id}
const SLOTN={w:'Weapon',b:'Backup',s:'Shield',a:'Armor',h:'Helmet'},SLOTKEYS=['w','b','s','a','h'];
const STATIC={hp:'hp',arm:'armor',helm:'helmet',fat:'fatigue',init:'init',ms:'melee',rs:'ranged',md:'mdef',rd:'rdef',brv:'resolve'};
const STATSHORT={hp:'Hitpoints',arm:'Armor',helm:'Helmet',fat:'Fatigue',init:'Initiative',ms:'Melee',rs:'Ranged',md:'Melee def',rd:'Ranged def',brv:'Resolve'};
const STATMAX={hp:120,arm:300,helm:300,fat:140,init:160,ms:100,rs:100,md:50,rd:50,brv:100};
function coStatName(k){return STATSHORT[k]||(typeof STATN!=='undefined'&&STATN[k])||k}
function coStatIc(k,size){return STATIC[k]?coIc(STATIC[k],size):coIc('star',size)}
/* resolve as the rules compute it (calc), else the raw attribute; null while the rules do not know it */
function coBrv(m,s){return typeof s.brv==='number'&&isFinite(s.brv)?s.brv:m.base&&typeof m.base.brv==='number'?m.base.brv:null}
function coIndex(){let i=G.roster.findIndex(m=>m.id===coSel);if(i<0){i=clamp(coLast,0,G.roster.length-1);coSel=G.roster[i].id;coView='main'}coLast=i;return i}
let coLast=0;
function coPick(i){mercSheet(i)}
function coClose(){if(G.townOpen)renderTown();else if(!closePanel()&&typeof closeSheet==='function')closeSheet()}
function coBack(){coScreen='roster';coView='main';coRender()}
function coTabGo(k){coScreen=k;coView='main';FM.pick=null;coRender()}
function coStep(d){const n=G.roster.length;mercSheet(((coIndex()+d)%n+n)%n)}
function coDismissAsk(i){coAsk=G.roster[i].id;coRender()}
function coIc(n,size,cls){return pnIcon(n,cls||'',size||16)}
function coMastIcon(k){return tlTreeIcon(k)}
function coPerkIcon(k,p){return tlPerkIcon({key:k,perk:p,id:p&&p.id})}
function coArmorW(m){const a=ITEMS[m.eq.a];return!a?'Unarmored':a.arm<=60?'Light':a.arm<=150?'Medium':'Heavy'}
/* a one-word read of the build, from weapon, shield, armor and awakened gifts */
function tlGiftStyle(k){const T=MAST[k];return!T?'':T.style||({mana:'caster',chi:'support'})[T.res]||'melee'}
function coRole(m,s){const w=s.wpn||FIST,a=ITEMS[m.eq.a],g=tlGift(m),r=g?MAST[g].res:null,gs=g?tlGiftStyle(g):'',woke=!!(r&&s.res&&s.res[r]&&s.res[r].max>0);
 if(w.wt==='bow')return'Archer';if((woke&&gs==='caster')||(r==='mana'&&w.wt==='staff'))return'Mage';if(woke&&gs==='support')return'Support';
 if(m.eq.s&&!w.two)return a&&a.arm>=150?'Bulwark':'Shield line';if(w.two)return w.rng>1?'Pikeman':'Striker';if(w.wt==='dagger'||w.wt==='fist')return'Skirmisher';return a&&a.arm>=150?'Man-at-arms':'Fighter'}
/* the merc's trees at a glance: style trees (perks learned), the gift in its colour, then the weapon families it may train */
function coTreeStrip(m,O){O=O||tlOpts(m);let h='',sep=false;
 for(const x of tlTrees(m)){const n=O.filter(o=>o.key===x.key&&o.owned).length,r=tlGiftRes(x.key);
  if(x.kind==='weapon'){if(!sep){sep=true;h+='<i class="co-sep" aria-hidden="true"></i>'}h+=`<span class="co-w${n?' on':''}${m.lvl<tlTierLv('weapon',1)?' lk':''}" title="${x.tree.n}: weapon tree, opens at level ${tlTierLv('weapon',1)}">${coIc(tlTreeIcon(x.key))}${n?`<b>${n}</b>`:''}</span>`;continue}
  h+=`<span class="co-m${r?' g-'+r:''}${n?'':' z'}" title="${x.kind==='gift'?tlGiftLabel(x.key)+' (gift)':x.tree.n}">${coIc(tlTreeIcon(x.key))}${n||''}</span>`}
 return h}
function coCard(m,i){const s=calc(m),hp=Math.min(m.hp,s.hp),w=ITEMS[m.eq.w],bk=ITEMS[m.eq.b],a=ITEMS[m.eq.a],hl=ITEMS[m.eq.h],cd=cpCond(m),inj=cpInj(m),g=tlGift(m);
 return`<div class="co-card${m.field?' fld':''}${m.pend||m.pp?' rdy':''}${inj.length?' inj':''}" role="button" tabindex="0" data-merc="${i}" aria-label="${m.name}, level ${m.lvl} ${BG[m.bg].n}${g?', '+tlGiftLabel(g):''}${m.field?'':', in reserve'}${inj.length?', '+inj.length+' injur'+(inj.length===1?'y':'ies'):''}" onclick="coPick(${i})">
<span class="co-pt">${portraitHTML(m,64)}<b class="co-lv">${m.lvl}</b></span>
<span class="co-ci"><span class="co-nm"><span>${m.name}</span>${inj.length?`<em class="inj" title="${inj.map(j=>j.n+': '+j.d).join('; ')}">${cpInjIcon(inj[0].id)}${inj.length}</em>`:''}${m.field?'':'<em class="res">RESERVE</em>'}${m.pend?'<em class="up">LEVEL UP</em>':m.pp?'<em class="perk">PERK</em>':''}</span>
<span class="co-role"><b>${coRole(m,s)}</b> · ${BG[m.bg].n}${g?` · <span class="co-gv g-${tlGiftRes(g)}">${MAST[g].n}</span>`:''}</span>
<span class="co-hp">${pnBar(100*hp/s.hp,'hp')}<b class="${hp<s.hp?'hurt':''}">${hp}/${s.hp}</b></span>
<span class="co-ics"><u title="${s.wpn.n}${w?' ('+(w.two?'two':'one')+'-handed)':''}">${coIc(w?itemIconName(m.eq.w):'fist')}${s.wpn.d[0]}–${s.wpn.d[1]}</u>${bk?`<u class="bk" title="Backup: ${bk.n}">${coIc(itemIconName(m.eq.b))}</u>`:''}<u title="${a?a.n+(cd.a<cd.aM?', damaged':''):'No armor'}" class="${cd.a<cd.aM?'worn':''}">${coIc(a?itemIconName(m.eq.a):'armor-light','',a?'':'dimi')}${a?cd.a:s.arm}</u>${hl?`<u title="${hl.n}${cd.h<cd.hM?', damaged':''}" class="${cd.h<cd.hM?'worn':''}">${coIc('helmet')}${cd.h}</u>`:''}${m.eq.s?`<u class="${tlSlung(m)?'slung':''}" title="${ITEMS[m.eq.s].n}${tlSlung(m)?', slung':''}">${coIc('shield')}</u>`:''}</span>
<span class="co-trees">${coTreeStrip(m)}</span></span></div>`}
/* the fielded twelve first, then the reserves under their own heading */
function coRoster(){const R=G.roster.map((m,i)=>[m,i]),f=R.filter(x=>x[0].field),r=R.filter(x=>!x[0].field);
 let h=`<div class="co-grid"><div class="co-gh"><span>${coIc('swords')}Fielded</span><i>${f.length} of ${MAXFIELD}</i></div>`;f.forEach(([m,i])=>{h+=coCard(m,i)});
 if(r.length){h+=`<div class="co-gh res"><span>${coIc('reserve')}Reserves</span><i>${typeof callReserve==='function'?'One may join a battle each round while fewer than '+MAXFIELD+' stand':'They sit out the battle'}</i></div>`;r.forEach(([m,i])=>{h+=coCard(m,i)})}
 return h+'</div>'}

/* ---- formation ---- */
const FM={pick:null,drag:null,bound:false,skip:0};
function fmCols(){return typeof BW==='number'?BW:12}
function fmOrder(){if(typeof COLS!=='undefined')return COLS;const n=fmCols(),m=(n-1)/2,a=[];for(let i=0;i<n;i++)a.push(i);return a.sort((x,y)=>Math.abs(x-m)-Math.abs(y-m)||x-y)}
function fmBack(m){const w=ITEMS[m.eq.w];if(w&&w.wt==='bow')return true;const g=tlGift(m);if(!g||tlGiftStyle(g)!=='caster'&&tlGiftStyle(g)!=='ranged')return false;const r=MAST[g].res,s=calc(m);return!!(s.res&&s.res[r]&&s.res[r].max>0)}
function fmValid(s){return!!s&&(s.row===0||s.row===1)&&Number.isInteger(s.col)&&s.col>=0&&s.col<fmCols()}
/* where every fielded merc stands: stored slots first, the rest by the battle's own default rule */
function formation(){const f=fielded(),used={},out=[],ord=fmOrder();
 f.forEach(m=>{if(fmValid(m.slot)&&!used[m.slot.row+':'+m.slot.col]){used[m.slot.row+':'+m.slot.col]=1;out.push({m,row:m.slot.row,col:m.slot.col,set:true})}});
 const rest=f.filter(m=>!out.some(o=>o.m===m)),put=(m,row)=>{for(const r of [row,1-row])for(const c of ord)if(!used[r+':'+c]){used[r+':'+c]=1;out.push({m,row:r,col:c,set:false});return}};
 rest.filter(m=>!fmBack(m)).forEach(m=>put(m,0));rest.filter(fmBack).forEach(m=>put(m,1));return out}
function fmCommit(){formation().forEach(o=>{o.m.slot={row:o.row,col:o.col}})}
function fmAnySet(){return G.roster.some(m=>m.field&&fmValid(m.slot))}
function fmReset(){G.roster.forEach(m=>{m.slot=null});FM.pick=null;toast('Lines reset to the default order');coRender();save()}
function fmPlace(i,row,col){const m=G.roster[i];if(!m||!fmValid({row,col}))return;fmCommit();
 const o=G.roster.find(x=>x!==m&&x.field&&x.slot&&x.slot.row===row&&x.slot.col===col);
 if(m.field){if(o)o.slot=m.slot;m.slot={row,col}}
 else{if(o){o.field=false;o.slot=null}else if(G.roster.filter(x=>x.field).length>=MAXFIELD){toast('Twelve is the most you can field');return}m.field=true;m.slot={row,col}}
 FM.pick=null;coRender();save()}
function fmBench(i){const m=G.roster[i];if(!m||!m.field)return;
 if(fmAnySet())fmCommit();m.field=false;m.slot=null;FM.pick=null;coRender();save()}
function fmField(i){const m=G.roster[i];if(!m||m.field)return;if(G.roster.filter(x=>x.field).length>=MAXFIELD){toast('Twelve is the most you can field');return}
 m.slot=null;m.field=true;if(fmAnySet())fmCommit();FM.pick=null;coRender();save()}
function fmTap(i,ptrClick){if(ptrClick)return;   // pointer taps arrive through pointerup; a click with detail 0 is the keyboard
 const m=G.roster[i],p=FM.pick;if(!m)return;
 if(p==null||!G.roster[p]){FM.pick=i;coRender();return}if(p===i){FM.pick=null;coRender();return}
 const q=G.roster[p];if(m.field){if(q.field)fmCommit();fmPlace(p,(m.slot||fmSlotOf(m)).row,(m.slot||fmSlotOf(m)).col)}
 else if(q.field){const s=q.slot||fmSlotOf(q);fmPlace(i,s.row,s.col)}else{FM.pick=i;coRender()}}
function fmSlotOf(m){const o=formation().find(o=>o.m===m);return o?{row:o.row,col:o.col}:{row:0,col:0}}
function fmCell(row,col){if(FM.pick==null)return;fmPlace(FM.pick,row,col)}
function fmTok(m,i,size){return`<span class="fm-tok${FM.pick===i?' sel':''}" role="button" tabindex="0" data-fm="${i}" aria-label="${m.name}${FM.pick===i?', picked':''}" onclick="event.stopPropagation();fmTap(${i},event.detail)">${portraitHTML(m,size||32)}</span>`}
function coFormation(){if(fmAnySet())fmCommit();const F=formation(),n=fmCols(),big=typeof innerWidth==='number'&&innerWidth>=1100&&innerHeight>=600,sz=big?64:32;
 const row=r=>{let h=`<div class="fm-row${r?' back':''}">`;for(let c=0;c<n;c++){const o=F.find(o=>o.row===r&&o.col===c);
   h+=`<div class="fm-cell${FM.pick!=null?' can':''}" data-cell="${r}:${c}" role="button" tabindex="0" aria-label="${r?'Back':'Front'} row, tile ${c+1}${o?', '+o.m.name:''}" onclick="fmCell(${r},${c})">${o?fmTok(o.m,G.roster.indexOf(o.m),sz):''}</div>`}return h+'</div>'};
 const res=G.roster.map((m,i)=>[m,i]).filter(([m])=>!m.field),p=FM.pick!=null?G.roster[FM.pick]:null;
 let info;if(p){const s=calc(p);info=`${portraitHTML(p,32)}<p><b>${p.name}</b> <span class="dim">Level ${p.lvl} ${BG[p.bg].n.toLowerCase()}, ${coRole(p,s).toLowerCase()}</span><small>${p.field?'Tap a tile to move, or another sword to trade places.':'Tap a tile to field this sword there.'}</small></p>
  ${p.field?`<button type="button" class="pn-btn sm" onclick="fmBench(${FM.pick})">To reserve</button>`:`<button type="button" class="pn-btn sm pri" onclick="fmField(${FM.pick})">Field</button>`}<button type="button" class="pn-btn sm" onclick="mercSheet(${FM.pick})">Open</button>`}
 else info=`<p><b>Set the lines</b><small>Drag a sword to a tile, or tap one and then tap where it should stand. Swords you never place line up on their own.</small></p><button type="button" class="pn-btn sm" ${fmAnySet()?'':'disabled'} onclick="fmReset()">Reset</button>`;
 return`<div class="fm"><div class="fm-foe">${coIc('skull')}The enemy comes from here</div>
<div class="fm-rows" style="--fmn:${n}"><span class="fm-lab">Front</span>${row(0)}<span class="fm-lab">Back</span>${row(1)}</div>
<div class="fm-info">${info}</div>
<div class="fm-bench" data-bench="1"><span>Reserve</span>${res.length?res.map(([m,i])=>`<span class="fm-bt">${fmTok(m,i,32)}</span>`).join(''):'<em>Everyone is fielded. Drag a sword here to rest it.</em>'}</div></div>`}
/* pointer drag (mouse, pen, touch). A press that does not travel is a tap. */
// 16 columns do not fit a phone at 36px a tile: the lines scroll sideways, starting centred (deployment fills from the middle out).
function fmScroll(root){try{const e=root&&root.querySelector?root.querySelector('.fm-rows'):null;if(!e||e.scrollWidth<=e.clientWidth+1)return;e.scrollLeft=FM.sx!=null?FM.sx:(e.scrollWidth-e.clientWidth)/2;if(!e._fs){e._fs=1;e.addEventListener('scroll',()=>{FM.sx=e.scrollLeft},{passive:true})}}catch(e){}}
function fmBind(root){fmScroll(root);if(FM.bound||!root||typeof root.addEventListener!=='function'||typeof document==='undefined'||!document.elementFromPoint)return;FM.bound=true;
 const at=(x,y)=>{const e=document.elementFromPoint(x,y);return e&&e.closest?e.closest('[data-cell],[data-bench]'):null},
  hot=t=>{root.querySelectorAll('.hot').forEach(e=>e.classList.remove('hot'));if(t)t.classList.add('hot')},
  end=()=>{const d=FM.drag;FM.drag=null;if(!d)return;if(d.ghost&&d.ghost.parentNode)d.ghost.parentNode.removeChild(d.ghost);if(d.el)d.el.classList.remove('drag');hot(null);try{root.releasePointerCapture(d.id)}catch(e){}};
 root.addEventListener('pointerdown',e=>{if(coScreen!=='formation'||PN.id!=='company'||FM.drag||(e.button!=null&&e.button>0))return;const t=e.target&&e.target.closest?e.target.closest('[data-fm]'):null;if(!t)return;
  FM.drag={i:+t.dataset.fm,x:e.clientX,y:e.clientY,on:false,el:t,id:e.pointerId,ghost:null};try{root.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
 root.addEventListener('pointermove',e=>{const d=FM.drag;if(!d||e.pointerId!==d.id)return;
  if(!d.on){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<7)return;d.on=true;d.el.classList.add('drag');const g=document.createElement('div');g.id='fmGhost';g.innerHTML=portraitHTML(G.roster[d.i],64,'bare');root.appendChild(g);d.ghost=g}
  d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';hot(at(e.clientX,e.clientY));e.preventDefault()});
 root.addEventListener('pointerup',e=>{const d=FM.drag;if(!d||e.pointerId!==d.id)return;const t=d.on?at(e.clientX,e.clientY):null,i=d.i,on=d.on;end();FM.skip=Date.now();
  if(!on){fmTap(i);return}if(!t)return;if(t.dataset.bench){fmBench(i);return}const rc=t.dataset.cell.split(':');fmPlace(i,+rc[0],+rc[1])});
 root.addEventListener('pointercancel',end)}

/* ---- character ---- */
let coDollU=null;
function coDoll(){if(coDollU!==null)return coDollU;coDollU='';try{const L=ptL();
  ptR(L,13,1,18,7,'4');ptH(L,14,17,0,'4');ptH(L,14,17,8,'4');ptR(L,14,9,17,9,'3');ptR(L,10,10,21,21,'4');ptR(L,7,10,9,21,'4');ptR(L,22,10,24,21,'4');ptR(L,7,22,9,23,'4');ptR(L,22,22,24,23,'4');
  ptR(L,11,22,15,29,'4');ptR(L,16,22,20,29,'4');ptR(L,10,30,15,30,'4');ptR(L,16,30,21,30,'4');ptV(L,13,1,7,'n');ptV(L,10,10,21,'n');ptV(L,7,10,23,'n');ptV(L,11,22,29,'n');ptH(L,10,21,10,'n');
  ptV(L,21,11,21,'3');ptV(L,24,10,23,'3');ptV(L,20,22,29,'3');ptV(L,18,1,7,'3');ptV(L,15,23,29,'3');ptS(L,9,10,'3');ptS(L,22,10,'n');
  coDollU=pxURL('co:doll',ptOut(L).map(r=>r.join('')),1)||''}catch(e){}return coDollU}
function coStat(m,s,k){const t=m.tal[k]||0,cd=cpCond(m);let v=k==='brv'?coBrv(m,s):k==='helm'?cd.hM:k==='arm'?(ITEMS[m.eq.a]?cd.aM:s.arm):s[k],cur=k==='hp'?Math.min(m.hp,v):k==='arm'&&ITEMS[m.eq.a]?cd.a:k==='helm'?cd.h:v;
 if(typeof v!=='number'||!isFinite(v))v=cur=0;const hurt=cur<v;
 return`<div class="cst${hurt&&k!=='hp'?' worn':''}" data-stat="${k}">${coStatIc(k)}<span>${coStatName(k)}${pnStars(t)}</span><b>${hurt?cur+'<small>/'+v+'</small>':v}</b>${pnBar(100*cur/(STATMAX[k]||100),k==='hp'?'hp':hurt?'worn':'st')}</div>`}
function coStatKeys(m,s){const ks=['hp','arm'];if(m.eq.h||cpHasHelms())ks.push('helm');ks.push('fat','init','ms','rs','md','rd');if(coBrv(m,s)!==null)ks.push('brv');return ks}
/* condition line under the doll: piece, points left of its full value, a meter */
function coCondRow(k,id,cur,mx){const it=ITEMS[id];if(!it)return`<div class="pd-c none">${coIc(k==='h'?'helmet':'armor-light')}<b>${k==='h'?'No helmet':'No armor'}</b><small>${k==='h'?'head hits land in full':'unarmored'}</small></div>`;
 return`<div class="pd-c${cur<mx?' worn':''}" data-cond="${k}">${k==='h'?coIc('helmet'):pnItemIcon(id,16)}<b>${it.n}</b><small>${cur<mx?cur+'/'+mx:mx}</small>${pnBar(mx?100*cur/mx:0,cur<mx?'worn':'ar')}</div>`}
function coInjList(m){const L=cpInj(m);if(!L.length)return'';
 return`<div class="ch-inj" aria-label="Injuries">${L.map(j=>`<div class="ch-ij${j.perm?' perm':''}" data-inj="${j.id}" title="${j.lore}">${cpInjIcon(j.id)}<span><b>${j.n}</b><small>${j.d}</small></span><em>${cpInjDays(j)}</em></div>`).join('')}</div>`}
function coSlotIcon(k){return k==='w'||k==='b'?'fist':k==='s'?'shield':k==='h'?'helmet':'armor-light'}
function coSlotFit(k){const want=k==='b'?'w':k;return G.stash.filter(x=>ITEMS[x]&&ITEMS[x].k===want).length}
function coSlotBtn(m,i,k,cls){const id=m.eq[k],it=ITEMS[id],fit=coSlotFit(k),on=coView==='slot'&&coSlot===k,e=m.eq,blocked=k==='s'&&!id&&tlTwo(e.w)&&tlTwo(e.b),slung=k==='s'&&tlSlung(m);
 const ic=id?pnItemIcon(id,32):coIc(coSlotIcon(k),32),wsub=x=>`${x.d[0]}–${x.d[1]} · ${x.two?'2H':'1H'}`;
 const name=it?it.n:blocked?'Both hands full':k==='w'?'Bare fists':k==='b'?'No backup':'No shield',
  sub=it?(k==='w'||k==='b'?wsub(it):k==='s'?(slung?'<em>Slung</em>':'+'+it.md+' / +'+it.rd):''):k==='b'?'a sidearm to swap to':SLOTN[k];
 if(k==='b')return`<button type="button" class="pd-s bk${id?'':' none'}${on?' on':''}" data-slot="b" aria-label="Backup weapon: ${it?it.n:'empty'}. ${fit} in the stash." onclick="slotSheet(${i},'b')"><span>${ic}${fit?`<i>${fit}</i>`:''}</span><b>${name}</b><small>${it?'Backup · '+wsub(it):'Backup · '+sub}</small></button>`;
 return`<button type="button" class="pd-s${id?'':' none'}${on?' on':''}${slung?' slung':''}${cls?' '+cls:''}" data-slot="${k}" aria-label="${SLOTN[k]}: ${it?it.n:'empty'}${slung?', slung while a two-handed weapon is in hand':''}. ${fit} in the stash." onclick="slotSheet(${i},'${k}')"><span>${ic}${fit?`<i>${fit}</i>`:''}</span>${cls?'':`<b>${name}</b><small>${sub}</small>`}</button>`}
function coGiftChips(m,s){const g=tlGift(m),r=g?MAST[g].res:null;let h='';
 for(const k in s.res)if(k!==r)h+=`<span class="pn-chip g-${k}">${coIc(k)}${RESN[k]} ${s.res[k].max} <small>+${s.res[k].regen}</small></span>`;
 if(r){const R=s.res[r],lab=tlGiftLabel(g);h+=R&&R.max>0?`<span class="pn-chip g-${r}" title="${lab}">${coIc(r)}${RESN[r]} ${R.max} <small>+${R.regen}</small></span>`:`<span class="pn-chip g-${r} dorm" title="${lab}: sleeps until a perk of the tree is learned">${coIc(r)}${RESN[r]} sleeps</span>`}
 else h+=`<span class="pn-chip dorm">No gift</span>`;return h}
function coLeft(m,i,s,ask){const cd=cpCond(m),g=tlGift(m),st=tlStyle(m);
 let h=`<div class="ch"><div class="ch-id">${portraitHTML(m,64)}<div class="ch-idm"><div class="pn-kick">${RACE[m.race].n} ${BG[m.bg].n.toLowerCase()}${TL_STYN[st]?' · '+TL_STYN[st].toLowerCase():''}</div><div class="pn-h">${m.name}</div>
<div class="ch-xp"><b>Lv ${m.lvl}</b>${pnBar(m.lvl<MAXLV?100*(m.xp-XPT[m.lvl])/(XPT[m.lvl+1]-XPT[m.lvl]):100,'xp')}<small>${m.lvl<MAXLV?m.xp+'/'+XPT[m.lvl+1]:'max'}</small></div>
<div class="ch-res">${coGiftChips(m,s)}</div>${g?`<div class="ch-gv g-${tlGiftRes(g)}">${tlGiftLabel(g)}</div>`:''}</div></div>
${coInjList(m)}<div class="pd" aria-label="Equipment">${coSlotBtn(m,i,'w')}<div class="pd-fig" style="background-image:url(${coDoll()})">${coSlotBtn(m,i,'h','helm')}${coSlotBtn(m,i,'a','arm')}</div>${coSlotBtn(m,i,'s')}
<div class="pd-bkr">${coSlotBtn(m,i,'b')}<button type="button" class="pn-btn sm ico pd-swap" data-swap="1" aria-label="Swap main and backup weapons" title="Swap main and backup" ${m.eq.w||m.eq.b?'':'disabled'} onclick="coSwap(${i})">${coIc('swap')}</button></div>
${tlSlung(m)?`<div class="pd-an slung">${coIc('shield')}<span><b>Shield slung</b> <small>while a two-handed weapon is in hand: no defense from it until the backup is drawn</small></span></div>`:''}
<div class="pd-cs">${coCondRow('h',m.eq.h,cd.h,cd.hM)}${coCondRow('a',m.eq.a,cd.a,cd.aM)}</div></div>
<div class="cst2">${coStatKeys(m,s).map(k=>coStat(m,s,k)).join('')}</div>`;
 h+=ask?`<div class="ch-ask">Send ${m.name} away for good? Their gear returns to the stash.<div><button type="button" class="pn-btn" onclick="coRender()">Keep</button><button type="button" class="pn-btn warn solid" onclick="dismiss(${i})">Dismiss</button></div></div>`
  :`<div class="ch-act"><button type="button" class="pn-btn sm${m.field?' on':''}" aria-pressed="${!!m.field}" onclick="toggleField(${i})">${coIc('swords')}<span>${m.field?'Fielded':'In reserve'}</span></button><button type="button" class="pn-btn sm warn" onclick="coDismissAsk(${i})">Dismiss</button></div>`;
 return h+'</div>'}

/* ---- talents: a tier grid. Columns are tiers (tier t opens at level t; weapon tiers at 3, 6, 9), one row per tree.
   Any open perk can be learned with a point, in any order: nothing in a tree waits on another perk. ---- */
let coAuto=null;
const TG_ROM=['I','II','III','IV','V','VI','VII','VIII','IX'];
function coPerkPick(pid){coPerk={id:coSel,pid:String(pid)};coAuto=null;coRender()}
function coAutoAsk(on){coAuto=on?coSel:null;coRender()}
function tgState(m,o){return o.owned?'got':!o.unlocked?'lock':m.pp>0&&tlCan(m,o.id)?'can':'open'}
function tgNode(m,o){const st=tgState(m,o),sel=coPerk&&coPerk.pid===o.id,p=o.perk;
 return`<button type="button" class="tg-n ${st}${sel?' sel':''}${p.ab?' ab':''}" data-perk="${o.id}" aria-pressed="${sel}" aria-label="${p.n}, tier ${o.tier}, ${st==='got'?'learned':st==='can'?'can be learned now':st==='open'?'open, needs a point':'opens at level '+o.need}" onclick="coPerkPick('${o.id}')">${coIc(tlPerkIcon(o),32)}${st==='got'?`<em>${coIc('check')}</em>`:st==='lock'?`<em>${coIc('lock')}</em>`:''}</button>`}
function tgTreeHead(m,x,O){const n=O.filter(o=>o.key===x.key&&o.owned).length,r=tlGiftRes(x.key),T=x.tree;
 return`<div class="tg-th">${coIc(tlTreeIcon(x.key))}<b>${x.kind==='gift'?tlGiftLabel(x.key):T.n}</b><span>${T.d||''}</span>${n?`<small>${n} learned</small>`:''}</div>`}
function tgAbFacts(p){const a=p.ab&&AB[p.ab];if(!a)return'';const f=['Ability'];if(a.ap!=null)f.push(a.ap+' AP');else if(a.wpn)f.push('weapon AP');if(a.fat)f.push(a.fat+' fatigue');if(a.cost)f.push(a.cost[1]+' '+(RESN[a.cost[0]]||a.cost[0]));if(a.rng>1)f.push('range '+a.rng);return f.join(' · ')}
function coTalents(m,i){const O=tlOpts(m),T=tlTrees(m),lv=m.lvl,pts=m.pp|0;
 if(!coPerk||coPerk.id!==m.id||!O.some(o=>o.id===coPerk.pid)){const d=O.find(o=>tgState(m,o)==='can')||O.find(o=>!o.owned&&o.unlocked)||O.find(o=>!o.owned)||O[0];coPerk={id:m.id,pid:d?d.id:null}}
 const nCan=O.filter(o=>tgState(m,o)==='can').length,maxT=Math.max(1,...T.filter(x=>x.kind!=='weapon').map(x=>tlTiers(x.tree).length)),cols=Math.max(6,maxT),
  nextT=[];for(let t=1;t<=cols;t++)if(tlTierLv('style',t)>lv){nextT.push(t);break}
 const wk=T.filter(x=>x.kind==='weapon'),wLv=tlTierLv('weapon',1);
 let h=`<div class="tg${pts?' has':''}" style="--tgc:${cols}"><div class="tg-ban">${coIc(pts?'star':'level',16)}<span><b>${pts?pts+' point'+(pts===1?'':'s')+' to spend':'No points to spend'}</b><small>${pts?(nCan?'Learn any open perk, in any order':'Nothing open left to learn yet'):nextT.length?'Level '+(lv+1)+' brings a point and opens tier '+nextT[0]:lv<MAXLV?'Level '+(lv+1)+' brings a point':'Every point is spent'}</small></span>`
  +`<button type="button" class="pn-btn sm tg-auto" ${pts&&nCan?'':'disabled'} onclick="coAutoAsk(1)">${coIc('auto')}<span>Auto</span></button></div>`;
 h+=`<div class="tg-hd" aria-hidden="true"><span class="tg-hl">Tier</span>${Array.from({length:cols},(_,j)=>{const t=j+1,need=tlTierLv('style',t);return`<span class="tg-hc${need>lv?' lk':need===lv?' new':''}"><b>${TG_ROM[j]||t}</b><small>Lv ${need}</small></span>`}).join('')}</div>`;
 for(const x of T.filter(x=>x.kind!=='weapon')){const r=tlGiftRes(x.key),tiers=tlTiers(x.tree);
  h+=`<div class="tg-tree k-${x.kind}${r?' g-'+r:''}" data-tree="${x.key}">${tgTreeHead(m,x,O)}<div class="tg-row">`;
  for(let t=1;t<=cols;t++){const L=O.filter(o=>o.key===x.key&&o.tier===t);h+=`<div class="tg-c${tlTierLv(x.kind,t)>lv?' lk':''}">${L.map(o=>tgNode(m,o)).join('')}</div>`}
  h+='</div></div>'}
 if(wk.length){const wt=Math.max(1,...wk.map(x=>tlTiers(x.tree).length)),span=Math.max(1,Math.floor(cols/wt));
  h+=`<div class="tg-wh${lv<wLv?' lk':''}">${coIc(lv<wLv?'lock':'swords')}<b>Weapon trees</b><span>${lv<wLv?'Open at level '+wLv:'Work only while a weapon of the family is in hand'}</span></div>`;
  h+=`<div class="tg-hd w" aria-hidden="true"><span class="tg-hl">Lv</span>${Array.from({length:wt},(_,j)=>{const need=tlTierLv('weapon',j+1);return`<span class="tg-hc${need>lv?' lk':need===lv?' new':''}" style="grid-column:span ${span}"><b>${TG_ROM[j]}</b><small>Lv ${need}</small></span>`}).join('')}</div>`;
  for(const x of wk){h+=`<div class="tg-tree k-weapon" data-tree="${x.key}">${tgTreeHead(m,x,O)}<div class="tg-row">`;
   for(let t=1;t<=wt;t++){const L=O.filter(o=>o.key===x.key&&o.tier===t);h+=`<div class="tg-c w${tlTierLv('weapon',t)>lv?' lk':''}" style="grid-column:span ${span}">${L.map(o=>tgNode(m,o)).join('')}</div>`}
   h+='</div></div>'}}
 else h+=`<div class="tg-wh lk">${coIc('swords')}<b>Weapon trees</b><span>None for a ${BG[m.bg].n.toLowerCase()}${RACE[m.race]&&RACE[m.race].noWt?' of this blood':''}</span></div>`;
 h+='</div>';
 let foot;
 if(coAuto===m.id)foot=`<span class="mt-foot">${coIc('auto',32)}<div><b>Auto build</b><small>Spend ${pts} point${pts===1?'':'s'} on a build that suits ${m.name} as ${(/^[AEIOU]/.test(coRole(m,calc(m)))?'an ':'a ')+coRole(m,calc(m)).toLowerCase()}. Learned perks stay learned.</small></div></span><button type="button" class="pn-btn" onclick="coAutoAsk(0)">Cancel</button><button type="button" class="pn-btn pri" onclick="coAutoLearn(${i})">Spend</button>`;
 else{const o=O.find(o=>o.id===coPerk.pid);
  if(!o)foot=`<span class="mt-foot"><div><b>No trees</b><small>This sword has nothing to learn.</small></div></span>`;
  else{const p=o.perk,st=tgState(m,o),tag=st==='got'?'Learned':st==='can'?'Ready to learn':st==='open'?'Needs a perk point':'Opens at level '+o.need,
    gift=o.kind==='gift'&&!O.some(q=>q.key===o.key&&q.owned)?`<small class="tg-wake">Awakens ${RESN[tlGiftRes(o.key)]||'the gift'}: the first perk of this tree grants its base pool.</small>`:'',
    wpn=o.kind==='weapon'?`<small class="tg-wake">Works while a ${(TL_WTN[o.tree.wt]||o.tree.n).toLowerCase()} is in hand.</small>`:'';
   foot=`<span class="mt-foot">${coIc(tlPerkIcon(o),32)}<div><b>${p.n}<em class="${st}">${tag}</em></b><small class="tg-at">Tier ${o.tier} · ${o.kind==='gift'?tlGiftLabel(o.key):o.tree.n}${o.kind==='weapon'?' · Lv '+o.need:''}${p.ab?' · '+tgAbFacts(p):''}</small><small>${p.d||''}</small>${gift}${wpn}</div></span>
<button type="button" class="pn-btn pri" ${st==='can'?'':'disabled'} onclick="learn(${i},'${o.id}')">Learn</button>`}}
 return{detail:h,foot,key:'m'+m.id}}
function coTrees(m,i){return coTalents(m,i)}
function coLevel(m,i){if(!m.rolls){m.rolls={};lvSel=[]}
 for(const k in ROLL)if(typeof m.rolls[k]!=='number'){const t=m.tal[k]||0;m.rolls[k]=ri(ROLL[k][0]+Math.floor(t/2),ROLL[k][1]+Math.ceil(t/2))}   // also fills an attribute added since the roll was made
 if(lvFor!==m.id){lvSel=[];lvFor=m.id}
 let h=`<div class="pn-kick">${coIc('level')}Level up${m.pend>1?', '+m.pend+' waiting':''}</div><div class="pn-h">${m.name} reaches level ${m.lvl-m.pend+1}</div>${coLvOpens(m.lvl-m.pend+1)}<p class="pn-p dim">Choose three attributes to raise. Stars mark natural talent.</p><div class="pn-picks">`;
 for(const k in ROLL)h+=`<div class="pn-pick${lvSel.includes(k)?' on':''}${lvSel.length>=3&&!lvSel.includes(k)?' dimmed':''}" role="button" tabindex="0" data-pick="${k}" aria-pressed="${lvSel.includes(k)}" onclick="lvPick(${i},'${k}')"><b>${coStatIc(k)}+${m.rolls[k]}</b>${pnStars(m.tal[k]||0)}<span>${coStatName(k)}</span><small>now ${typeof m.base[k]==='number'?m.base[k]:0}</small></div>`;
 h+='</div>';
 return{detail:h,key:'l'+m.id,foot:`<span class="pn-fl"><span class="pn-count">${[0,1,2].map(j=>`<i class="${j<lvSel.length?'on':''}"></i>`).join('')}</span><small>${lvSel.length} of 3 chosen</small></span><button type="button" class="pn-btn pri" ${lvSel.length===3?'':'disabled'} onclick="lvConfirm(${i})">Raise attributes</button>`}}
/* what reaching level L opens: a new tier of every style and gift tree, a weapon tier at 3 / 6 / 9 */
function coLvTiers(L){const out=[];for(let t=1;t<=9;t++){if(tlTierLv('style',t)===L)out.push({kind:'style',t});if(tlTierLv('weapon',t)===L&&t<=3)out.push({kind:'weapon',t})}return out}
function coLvOpens(L){const T=coLvTiers(L);if(!T.length)return'';
 return`<div class="pn-p tg-lvup">${T.map(x=>x.kind==='weapon'?`<span class="tg-tag w">${coIc('swords')}${x.t===1?'Weapon trees open':'Weapon tier '+TG_ROM[x.t-1]+' opens'}</span>`:`<span class="tg-tag">${coIc('level')}New tier unlocked: tier ${TG_ROM[x.t-1]}</span>`).join('')}</div>`}
function coSlotView(m,i,k){const cur=m.eq[k],want=k==='b'?'w':k,list=G.stash.map((id,j)=>[id,j]).filter(([id])=>ITEMS[id]&&ITEMS[id].k===want),N={w:'Weapons',b:'Weapons',s:'Shields',a:'Armor',h:'Helmets'};
 let h=`<div class="pn-kick">${m.name}, ${k==='b'?'backup weapon':SLOTN[k].toLowerCase()} slot</div><div class="pn-h">${N[k]} in the stash</div>
 <div class="pn-gear cur${cur?'':' none'}">${cur?pnItemIcon(cur,32):coIc(coSlotIcon(k),32)}<span class="pn-rmain"><span class="pn-rt">${cur?ITEMS[cur].n:'Nothing equipped'}${cur?coGripTag(cur):''}</span><span class="pn-rs">${cur?coItemDesc(cur)+coWornNote(m,k):k==='w'?'Fighting with bare fists':k==='b'?'No sidearm to swap to':k==='h'?'Bare-headed: a blow to the head lands in full':'Empty '+SLOTN[k].toLowerCase()+' slot'}</span></span><span class="pn-slot">${k==='b'?'At the hip':'In use'}</span></div>`;
 if(k==='b')h+=`<p class="pn-p dim">The backup rides at the hip. In battle, <b>Swap weapons</b> (4 AP) puts it in hand. A bow cannot shoot with a foe standing next to you: an archer wants a dagger or a sword here.</p>`;
 if(k==='s'&&tlTwo(m.eq.w)&&tlTwo(m.eq.b))h+=`<p class="pn-p warn">${tlEquipRule(m,'s',list.length?list[0][0]:'buckler').why||'Both hands are full: a shield needs a one-handed weapon in one of the two weapon slots'}.</p>`;
 else if(k==='s'&&tlTwo(m.eq.w))h+=`<p class="pn-p dim">A shield is slung while a two-handed weapon is in hand: it gives no defense until the backup is drawn, but its weight still counts.</p>`;
 if(!list.length)h+=`<p class="pn-p dim">Nothing that fits. Buy gear at a market or take it from the fallen.</p>`;else h+=pnHead('Tap to equip');
 list.forEach(([id,j])=>{const r=tlEquipRule(m,k,id),drop=(k==='w'||k==='b')&&r.ok&&tlDropsShield(m,k,id);
  h+=`<div class="pn-gear tap${r.ok?'':' no'}" role="button" tabindex="0" data-equip="${j}" ${r.ok?'':`aria-disabled="true" title="${r.why}"`} onclick="equip(${i},'${k}',${j})">${pnItemIcon(id,32)}<span class="pn-rmain"><span class="pn-rt">${ITEMS[id].n}${coGripTag(id)}</span><span class="pn-rs">${r.ok?coItemDesc(id):`<span class="pn-why">${r.why}</span>`}</span></span><span class="pn-cd">${pnDeltaChips(id,cur)}${drop?'<span class="pn-d same">shield to stash</span>':''}</span></div>`});
 return{detail:h,key:'s'+m.id+k,foot:`<span class="pn-fl">${cur?`<button type="button" class="pn-btn sm" onclick="equip(${i},'${k}',-1)">Unequip</button>`:''}${(k==='w'||k==='b')&&(m.eq.w||m.eq.b)?`<button type="button" class="pn-btn sm" onclick="coSwap(${i},1)">${coIc('swap')}<span>Swap</span></button>`:''}</span><button type="button" class="pn-btn pri" onclick="mercSheet(${i})">${coIc('back')}<span>Back</span></button>`}}
function coGripTag(id){const g=tlGrip(id);return g?` <span class="pn-grip">${g}</span>`:''}
function coItemDesc(id){const it=ITEMS[id];if(it&&it.k==='h')return`${it.arm} head armor, −${it.fat||0} fatigue`;return itemDesc(id)}
function coWornNote(m,k){if(k!=='a'&&k!=='h')return'';const c=cpCond(m),cur=k==='a'?c.a:c.h,mx=k==='a'?c.aM:c.hM;return cur<mx?` · ${cur}/${mx} left, repaired with tools at camp`:''}
function coRender(){const ask=coAsk;coAsk=null;const sel=coIndex(),nf=G.roster.filter(m=>m.field).length,ready=G.roster.filter(m=>m.pend||m.pp).length;
 const o={id:'company',view:coScreen,title:'The company',sub:`Fielded ${nf}/${MAXFIELD}  ·  Renown ${G.renown}  ·  Stash ${G.stash.length}`,meta:pnPurse(),
  closeLabel:G.townOpen?'Back to town':'Close',closeIcon:G.townOpen?'back':'x',onClose:coClose,
  tabs:[{k:'roster',n:'Roster',icon:'company',badge:ready||''},{k:'formation',n:'Lines',icon:'swords'}],tab:coScreen,onTab:coTabGo,after:fmBind};
 if(coScreen==='merc'){const m=G.roster[sel],s=calc(m);m.hp=Math.min(m.hp,s.hp);
  const v=m.pend?coLevel(m,sel):coView==='slot'?coSlotView(m,sel,coSlot):coTalents(m,sel);
  o.title=m.name;o.sub=`${sel+1} of ${G.roster.length}`;o.closeLabel='Roster';o.closeIcon='back';o.onClose=coBack;
  o.meta=`<button type="button" class="pn-btn sm ico" aria-label="Previous sword" onclick="coStep(-1)">${coIc('back')}</button><button type="button" class="pn-btn sm ico" aria-label="Next sword" onclick="coStep(1)">${coIc('back',16,'flipx')}</button>`;
  o.list=coLeft(m,sel,s,ask===m.id);o.listKey='co:m'+m.id;o.detail=v.detail;o.detailKey='co:'+v.key;o.foot=v.foot}
 else if(coScreen==='formation'){o.single=true;o.list=coFormation();o.listKey='co:form'}
 else{o.single=true;o.list=coRoster();o.listKey='co:roster'}
 showPanel(o)}
function companySheet(){if(panelOpen()!=='company'){coScreen='roster';coView='main';FM.pick=null}coRender()}
function toggleField(i){const m=G.roster[i];if(!m.field&&G.roster.filter(x=>x.field).length>=MAXFIELD){toast('Twelve is the most you can field');return}
 if(m.field){if(fmAnySet())fmCommit();m.field=false;m.slot=null}else{m.slot=null;m.field=true;if(fmAnySet())fmCommit()}coRender()}
function mercSheet(i){const m=G.roster[i];coSel=m.id;coLast=i;coView='main';coScreen='merc';coRender()}
/* learn(i, perkId): spend a point on that perk. learn(i, treeKey) (old callers) learns the lowest open perk of that tree. */
function learn(i,k){const m=G.roster[i];if(!m||!(m.pp>0))return false;let id=String(k);
 if(!tlOpt(m,id)&&MAST[k]){id=tlFirstIn(m,k);if(!id)return false}
 if(!tlCan(m,id))return false;const o=tlOpt(m,id),gift=o.kind==='gift'&&!tlOwnedIn(m,o.key);if(!tlLearn(m,id))return false;
 coPerk={id:m.id,pid:id};coAuto=null;if(typeof toast==='function')toast(gift?`${m.name} learns ${o.perk.n}. ${RESN[tlGiftRes(o.key)]||'The gift'} awakens`:`${m.name} learns ${o.perk.n}`);mercSheet(i);save();return true}
/* Auto: autoLearn(m) spends every point on a build for the merc's role; without it, the lowest open tiers first */
function coAutoLearn(i){const m=G.roster[i];if(!m)return[];const before=new Set(tlOpts(m).filter(o=>o.owned).map(o=>o.id));
 if(typeof autoLearn==='function'&&!tlLegacy(m)){try{autoLearn(m)}catch(e){}}
 else{let g=0;while(m.pp>0&&g++<40){const o=tlOpts(m).filter(o=>!o.owned&&tlCan(m,o.id)).sort((a,b)=>a.kind==='gift'?-1:b.kind==='gift'?1:a.tier-b.tier)[0];if(!o||!tlLearn(m,o.id))break}}
 const got=tlOpts(m).filter(o=>o.owned&&!before.has(o.id));coAuto=null;coPerk=got.length?{id:m.id,pid:got[got.length-1].id}:coPerk;
 if(typeof toast==='function')toast(got.length?`${m.name} learns ${got.map(o=>o.perk.n).join(', ')}`:'Nothing to learn');if(typeof PN!=='undefined'&&PN.id==='company')mercSheet(i);save();return got.map(o=>o.id)}
/* swap the main and backup weapons */
function coSwap(i,stay){const m=G.roster[i];if(!m||!(m.eq.w||m.eq.b))return false;const w=m.eq.w;m.eq.w=m.eq.b||null;m.eq.b=w||null;
 if(typeof toast==='function')toast(m.eq.w?`${ITEMS[m.eq.w].n} in hand`+(m.eq.b?`, ${ITEMS[m.eq.b].n} at the hip`:''):'Bare hands, '+ITEMS[m.eq.b].n+' at the hip');
 if(stay&&coView==='slot')slotSheet(i,coSlot);else mercSheet(i);save();return true}
function dismiss(i){if(G.roster.length<=1){toast('A company needs at least one sword');return}const m=G.roster.splice(i,1)[0];SLOTKEYS.forEach(k=>{if(m.eq&&m.eq[k])G.stash.push(m.eq[k])});toast(m.name+' leaves the company');FM.pick=null;coScreen='roster';coRender()}
function slotSheet(i,k){coSel=G.roster[i].id;coLast=i;coView='slot';coSlot=k;coScreen='merc';coRender()}
/* equip(i, slot, stashIndex): slot 'w' main weapon, 'b' backup weapon, 's' shield, 'a' armor, 'h' helmet; stashIndex -1 unequips.
   The rules' equipRules decides what may go where; a refusal is toasted with its reason and nothing changes. */
function equip(i,k,j){const m=G.roster[i];if(!m)return false;if(!('b' in m.eq))m.eq.b=null;const was=m.eq[k];
 if(j>=0){const id=G.stash[j],want=k==='b'?'w':k;if(!ITEMS[id]||ITEMS[id].k!==want)return false;const r=tlEquipRule(m,k,id);if(!r.ok){if(typeof toast==='function')toast(r.why||'Cannot be equipped');return false}
  const drop=(k==='w'||k==='b')&&tlDropsShield(m,k,id);G.stash.splice(j,1);if(m.eq[k])G.stash.push(m.eq[k]);m.eq[k]=id;
  if(drop&&m.eq.s){G.stash.push(m.eq.s);m.eq.s=null;if(typeof toast==='function')toast('Both hands full: the shield goes to the stash')}}
 else if(m.eq[k]){G.stash.push(m.eq[k]);m.eq[k]=null}
 if((k==='a'||k==='h')&&m.eq[k]!==was&&m.cond&&typeof m.cond==='object'){delete m.cond[k];if(m.cond.a===undefined&&m.cond.h===undefined)delete m.cond}   // a piece from the stash is whole
 mercSheet(i);save();return m.eq[k]!==was}
let lvSel=[];
function levelSheet(i){coSel=G.roster[i].id;coLast=i;coScreen='merc';coRender()}
function lvPick(i,k){const j=lvSel.indexOf(k);if(j>=0)lvSel.splice(j,1);else if(lvSel.length<3)lvSel.push(k);levelSheet(i)}
function lvConfirm(i){const m=G.roster[i];if(lvSel.length!==3)return;lvSel.forEach(k=>{m.base[k]+=m.rolls[k];if(k==='hp')m.hp+=m.rolls[k]});m.rolls=null;m.pend--;lvSel=[];save();mercSheet(i)}
