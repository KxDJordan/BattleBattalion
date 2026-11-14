/* ================= COMPANY UI =================
   One panel, three screens: 'roster' (portrait cards), 'formation' (2-row deployment grid), 'merc'
   (character: paper doll, stats, mastery trees; level-up and the stash picker take over the right pane).
   Formation lives on the merc as m.slot={row:0 front|1 back, col:0..BW-1} (null = deploy by the old rule).
   Phase 5: a helmet slot on the doll (m.eq.h), armor and helmet condition (m.cond) under it and in the stats, resolve (brv) in
   the stats and the level-up picks, injuries (m.inj) on the cards and the character screen, reserves under their own heading. */
let backTo=null;
let coSel=null,coView='main',coSlot='w',coAsk=null,lvFor=null,coScreen='roster',coPerk=null;
const SLOTN={w:'Weapon',s:'Shield',a:'Armor',h:'Helmet'},SLOTKEYS=['w','s','a','h'];
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
function coMastIcon(k){return pnHasPx('m-'+k)?'m-'+k:MAST[k].res||({vanguard:'melee',bulwark:'shield',marksman:'bow',skirmisher:'init'})[k]||'star'}
function coPerkIcon(k,p){if(p.ab)return'ab-'+p.ab;if(p.res)return MAST[k].res;if(p.flag)return({exec:'skull',berserk:'ap',forged:'armor',path:'init',eagle:'ranged'})[p.flag]||'star';
 if(p.st){const q=Object.keys(p.st)[0];return STATIC[q]||(q==='dmg'?'swords':'star')}return'star'}
function coArmorW(m){const a=ITEMS[m.eq.a];return!a?'Unarmored':a.arm<=60?'Light':a.arm<=150?'Medium':'Heavy'}
/* a one-word read of the build, from weapon, shield, armor and awakened gifts */
function coRole(m,s){const w=s.wpn,a=ITEMS[m.eq.a],mt=m.mast;
 if(w.wt==='bow')return'Archer';if(mt.mana>0||('mana' in mt&&w.wt==='staff'))return'Mage';if(mt.chi>0)return'Support';
 if(m.eq.s)return a&&a.arm>=150?'Bulwark':'Shield line';if(w.two)return w.rng>1?'Pikeman':'Striker';if(w.wt==='dagger'||w.wt==='fist')return'Skirmisher';return a&&a.arm>=150?'Man-at-arms':'Fighter'}
function coCard(m,i){const s=calc(m),hp=Math.min(m.hp,s.hp),w=ITEMS[m.eq.w],a=ITEMS[m.eq.a],hl=ITEMS[m.eq.h],cd=cpCond(m),inj=cpInj(m);
 let ms='';for(const k in m.mast){const M=MAST[k];ms+=`<span class="co-m${M.res?' g-'+M.res:''}${m.mast[k]?'':' z'}" title="${M.n}">${coIc(coMastIcon(k))}${m.mast[k]||''}</span>`}
 return`<div class="co-card${m.field?' fld':''}${m.pend||m.pp?' rdy':''}${inj.length?' inj':''}" role="button" tabindex="0" data-merc="${i}" aria-label="${m.name}, level ${m.lvl} ${BG[m.bg].n}${m.field?'':', in reserve'}${inj.length?', '+inj.length+' injur'+(inj.length===1?'y':'ies'):''}" onclick="coPick(${i})">
<span class="co-pt">${portraitHTML(m,64)}<b class="co-lv">${m.lvl}</b></span>
<span class="co-ci"><span class="co-nm"><span>${m.name}</span>${inj.length?`<em class="inj" title="${inj.map(j=>j.n+': '+j.d).join('; ')}">${cpInjIcon(inj[0].id)}${inj.length}</em>`:''}${m.field?'':'<em class="res">RESERVE</em>'}${m.pend?'<em class="up">LEVEL UP</em>':m.pp?'<em class="perk">PERK</em>':''}</span>
<span class="co-role"><b>${coRole(m,s)}</b> · ${BG[m.bg].n}</span>
<span class="co-hp">${pnBar(100*hp/s.hp,'hp')}<b class="${hp<s.hp?'hurt':''}">${hp}/${s.hp}</b></span>
<span class="co-ics"><u title="${s.wpn.n}">${coIc(w?itemIconName(m.eq.w):'fist')}${s.wpn.d[0]}–${s.wpn.d[1]}</u><u title="${a?a.n+(cd.a<cd.aM?', damaged':''):'No armor'}" class="${cd.a<cd.aM?'worn':''}">${coIc(a?itemIconName(m.eq.a):'armor-light','',a?'':'dimi')}${a?cd.a:s.arm}</u>${hl?`<u title="${hl.n}${cd.h<cd.hM?', damaged':''}" class="${cd.h<cd.hM?'worn':''}">${coIc('helmet')}${cd.h}</u>`:''}${m.eq.s?coIc('shield'):''}<span class="co-ms">${ms}</span></span></span></div>`}
/* the fielded twelve first, then the reserves under their own heading */
function coRoster(){const R=G.roster.map((m,i)=>[m,i]),f=R.filter(x=>x[0].field),r=R.filter(x=>!x[0].field);
 let h=`<div class="co-grid"><div class="co-gh"><span>${coIc('swords')}Fielded</span><i>${f.length} of ${MAXFIELD}</i></div>`;f.forEach(([m,i])=>{h+=coCard(m,i)});
 if(r.length){h+=`<div class="co-gh res"><span>${coIc('reserve')}Reserves</span><i>${typeof callReserve==='function'?'One may join a battle each round while fewer than '+MAXFIELD+' stand':'They sit out the battle'}</i></div>`;r.forEach(([m,i])=>{h+=coCard(m,i)})}
 return h+'</div>'}

/* ---- formation ---- */
const FM={pick:null,drag:null,bound:false,skip:0};
function fmCols(){return typeof BW==='number'?BW:12}
function fmOrder(){if(typeof COLS!=='undefined')return COLS;const n=fmCols(),m=(n-1)/2,a=[];for(let i=0;i<n;i++)a.push(i);return a.sort((x,y)=>Math.abs(x-m)-Math.abs(y-m)||x-y)}
function fmBack(m){const w=ITEMS[m.eq.w];return!!((w&&w.wt==='bow')||('mana' in m.mast&&m.mast.mana>0))}
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
function coSlotBtn(m,i,k,cls){const id=m.eq[k],it=ITEMS[id],fit=G.stash.filter(x=>ITEMS[x].k===k).length,on=coView==='slot'&&coSlot===k,blocked=k==='s'&&m.eq.w&&ITEMS[m.eq.w].two;
 const ic=id?pnItemIcon(id,32):coIc(k==='w'?'fist':k==='s'?'shield':k==='h'?'helmet':'armor-light',32);
 return`<button type="button" class="pd-s${id?'':' none'}${on?' on':''}${cls?' '+cls:''}" data-slot="${k}" aria-label="${SLOTN[k]}: ${it?it.n:'empty'}. ${fit} in the stash." onclick="slotSheet(${i},'${k}')"><span>${ic}${fit?`<i>${fit}</i>`:''}</span>${cls?'':`<b>${it?it.n:blocked?'Both hands full':k==='w'?'Bare fists':'No shield'}</b><small>${it?(k==='w'?it.d[0]+'–'+it.d[1]:'+'+it.md+' / +'+it.rd):SLOTN[k]}</small>`}</button>`}
function coLeft(m,i,s,ask){const r=mercRes(m),a=ITEMS[m.eq.a],cd=cpCond(m);
 let h=`<div class="ch"><div class="ch-id">${portraitHTML(m,64)}<div class="ch-idm"><div class="pn-kick">${RACE[m.race].n} ${BG[m.bg].n.toLowerCase()}</div><div class="pn-h">${m.name}</div>
<div class="ch-xp"><b>Lv ${m.lvl}</b>${pnBar(m.lvl<MAXLV?100*(m.xp-XPT[m.lvl])/(XPT[m.lvl+1]-XPT[m.lvl]):100,'xp')}<small>${m.lvl<MAXLV?m.xp+'/'+XPT[m.lvl+1]:'max'}</small></div>
<div class="ch-res">`;
 for(const k in s.res)h+=`<span class="pn-chip g-${k}">${coIc(k)}${RESN[k]} ${s.res[k].max} <small>+${s.res[k].regen}</small></span>`;
 if(r&&!s.res[r])h+=`<span class="pn-chip g-${r} dorm">${coIc(r)}${RESN[r]} sleeps</span>`;
 if(!r)h+=`<span class="pn-chip dorm">No gift</span>`;
 h+=`</div></div></div>
${coInjList(m)}<div class="pd" aria-label="Equipment">${coSlotBtn(m,i,'w')}<div class="pd-fig" style="background-image:url(${coDoll()})">${coSlotBtn(m,i,'h','helm')}${coSlotBtn(m,i,'a','arm')}</div>${coSlotBtn(m,i,'s')}
<div class="pd-cs">${coCondRow('h',m.eq.h,cd.h,cd.hM)}${coCondRow('a',m.eq.a,cd.a,cd.aM)}</div></div>
<div class="cst2">${coStatKeys(m,s).map(k=>coStat(m,s,k)).join('')}</div>`;
 h+=ask?`<div class="ch-ask">Send ${m.name} away for good? Their gear returns to the stash.<div><button type="button" class="pn-btn" onclick="coRender()">Keep</button><button type="button" class="pn-btn warn solid" onclick="dismiss(${i})">Dismiss</button></div></div>`
  :`<div class="ch-act"><button type="button" class="pn-btn sm${m.field?' on':''}" aria-pressed="${!!m.field}" onclick="toggleField(${i})">${coIc('swords')}<span>${m.field?'Fielded':'In reserve'}</span></button><button type="button" class="pn-btn sm warn" onclick="coDismissAsk(${i})">Dismiss</button></div>`;
 return h+'</div>'}
function coPerkPick(k,j){coPerk={id:coSel,k,j};coRender()}
function coTrees(m,i){const ks=Object.keys(m.mast);
 if(!coPerk||coPerk.id!==m.id||!(coPerk.k in m.mast)||coPerk.j>=MAST[coPerk.k].p.length){const k=ks.find(k=>m.mast[k]<MAST[k].p.length)||ks[0];coPerk={id:m.id,k,j:Math.min(m.mast[k],MAST[k].p.length-1)}}
 let h=`<div class="pn-sech" style="margin-top:0"><span>Masteries</span><em class="${m.pp?'has':''}">${m.pp} perk point${m.pp===1?'':'s'}</em></div>`;
 ks.forEach(k=>{const M=MAST[k],n=m.mast[k];h+=`<div class="mt${M.res?' g-'+M.res:''}"><div class="mt-h"><b>${M.n}</b><span>${M.d}</span><small>${n}/${M.p.length}</small></div><div class="mt-c"><span class="mt-root" title="${M.n}">${coIc(coMastIcon(k),32)}</span>`;
  M.p.forEach((p,j)=>{const got=j<n,next=j===n,can=next&&m.pp>0,sel=coPerk.k===k&&coPerk.j===j;
   h+=`<i class="mt-l${got?' got':next?' next':''}"></i><button type="button" class="mt-n ${got?'got':next?'next':'no'}${can?' can':''}${sel?' sel':''}" data-perk="${k}:${j}" aria-pressed="${sel}" aria-label="${p.n}, ${got?'learned':can?'can be learned':'locked'}" onclick="coPerkPick('${k}',${j})">${coIc(coPerkIcon(k,p),32)}${got?`<em>${coIc('check')}</em>`:!next?`<em>${coIc('lock')}</em>`:''}</button>`});
  h+='</div></div>'});
 const k=coPerk.k,j=coPerk.j,M=MAST[k],p=M.p[j],n=m.mast[k],got=j<n,next=j===n;
 const foot=`<span class="mt-foot">${coIc(coPerkIcon(k,p),32)}<div><b>${p.n}<em class="${got?'got':next&&m.pp?'can':''}">${got?'Learned':next?(m.pp?'Ready to learn':'Needs a perk point'):'Locked: learn '+M.p[n].n+' first'}</em></b><small>${p.d}</small></div></span>
<button type="button" class="pn-btn pri" ${next&&m.pp?'':'disabled'} onclick="learn(${i},'${k}')">Learn</button>`;
 return{detail:h,foot,key:'m'+m.id}}
function coLevel(m,i){if(!m.rolls){m.rolls={};lvSel=[]}
 for(const k in ROLL)if(typeof m.rolls[k]!=='number'){const t=m.tal[k]||0;m.rolls[k]=ri(ROLL[k][0]+Math.floor(t/2),ROLL[k][1]+Math.ceil(t/2))}   // also fills an attribute added since the roll was made
 if(lvFor!==m.id){lvSel=[];lvFor=m.id}
 let h=`<div class="pn-kick">${coIc('level')}Level up${m.pend>1?', '+m.pend+' waiting':''}</div><div class="pn-h">${m.name} reaches level ${m.lvl-m.pend+1}</div><p class="pn-p dim">Choose three attributes to raise. Stars mark natural talent.</p><div class="pn-picks">`;
 for(const k in ROLL)h+=`<div class="pn-pick${lvSel.includes(k)?' on':''}${lvSel.length>=3&&!lvSel.includes(k)?' dimmed':''}" role="button" tabindex="0" data-pick="${k}" aria-pressed="${lvSel.includes(k)}" onclick="lvPick(${i},'${k}')"><b>${coStatIc(k)}+${m.rolls[k]}</b>${pnStars(m.tal[k]||0)}<span>${coStatName(k)}</span><small>now ${typeof m.base[k]==='number'?m.base[k]:0}</small></div>`;
 h+='</div>';
 return{detail:h,key:'l'+m.id,foot:`<span class="pn-fl"><span class="pn-count">${[0,1,2].map(j=>`<i class="${j<lvSel.length?'on':''}"></i>`).join('')}</span><small>${lvSel.length} of 3 chosen</small></span><button type="button" class="pn-btn pri" ${lvSel.length===3?'':'disabled'} onclick="lvConfirm(${i})">Raise attributes</button>`}}
function coSlotView(m,i,k){const cur=m.eq[k],list=G.stash.map((id,j)=>[id,j]).filter(([id])=>ITEMS[id].k===k);
 let h=`<div class="pn-kick">${m.name}, ${SLOTN[k].toLowerCase()} slot</div><div class="pn-h">${{w:'Weapons',s:'Shields',a:'Armor',h:'Helmets'}[k]} in the stash</div>
 <div class="pn-gear cur${cur?'':' none'}">${cur?pnItemIcon(cur,32):coIc(k==='w'?'fist':k==='s'?'shield':k==='h'?'helmet':'armor-light',32)}<span class="pn-rmain"><span class="pn-rt">${cur?ITEMS[cur].n:'Nothing equipped'}</span><span class="pn-rs">${cur?coItemDesc(cur)+coWornNote(m,k):k==='w'?'Fighting with bare fists':k==='h'?'Bare-headed: a blow to the head lands in full':'Empty '+SLOTN[k].toLowerCase()+' slot'}</span></span><span class="pn-slot">In use</span></div>`;
 if(!list.length)h+=`<p class="pn-p dim">Nothing that fits. Buy gear at a market or take it from the fallen.</p>`;else h+=pnHead('Tap to equip');
 list.forEach(([id,j])=>{h+=`<div class="pn-gear tap" role="button" tabindex="0" data-equip="${j}" onclick="equip(${i},'${k}',${j})">${pnItemIcon(id,32)}<span class="pn-rmain"><span class="pn-rt">${ITEMS[id].n}</span><span class="pn-rs">${coItemDesc(id)}</span></span><span class="pn-cd">${pnDeltaChips(id,cur)}</span></div>`});
 return{detail:h,key:'s'+m.id+k,foot:`<span class="pn-fl">${cur?`<button type="button" class="pn-btn sm" onclick="equip(${i},'${k}',-1)">Unequip</button>`:''}</span><button type="button" class="pn-btn pri" onclick="mercSheet(${i})">${coIc('back')}<span>Back</span></button>`}}
function coItemDesc(id){const it=ITEMS[id];if(it&&it.k==='h')return`${it.arm} head armor, −${it.fat||0} fatigue`;return itemDesc(id)}
function coWornNote(m,k){if(k!=='a'&&k!=='h')return'';const c=cpCond(m),cur=k==='a'?c.a:c.h,mx=k==='a'?c.aM:c.hM;return cur<mx?` · ${cur}/${mx} left, repaired with tools at camp`:''}
function coRender(){const ask=coAsk;coAsk=null;const sel=coIndex(),nf=G.roster.filter(m=>m.field).length,ready=G.roster.filter(m=>m.pend||m.pp).length;
 const o={id:'company',view:coScreen,title:'The company',sub:`Fielded ${nf}/${MAXFIELD}  ·  Renown ${G.renown}  ·  Stash ${G.stash.length}`,meta:pnPurse(),
  closeLabel:G.townOpen?'Back to town':'Close',closeIcon:G.townOpen?'back':'x',onClose:coClose,
  tabs:[{k:'roster',n:'Roster',icon:'company',badge:ready||''},{k:'formation',n:'Lines',icon:'swords'}],tab:coScreen,onTab:coTabGo,after:fmBind};
 if(coScreen==='merc'){const m=G.roster[sel],s=calc(m);m.hp=Math.min(m.hp,s.hp);
  const v=m.pend?coLevel(m,sel):coView==='slot'?coSlotView(m,sel,coSlot):coTrees(m,sel);
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
function learn(i,k){const m=G.roster[i];if(!m.pp||m.mast[k]>=MAST[k].p.length)return;m.mast[k]++;m.pp--;const s=calc(m);if(MAST[k].p[m.mast[k]-1].st&&MAST[k].p[m.mast[k]-1].st.hp)m.hp=Math.min(s.hp,m.hp+MAST[k].p[m.mast[k]-1].st.hp);
 coPerk={id:m.id,k,j:Math.min(m.mast[k],MAST[k].p.length-1)};mercSheet(i);save()}
function dismiss(i){if(G.roster.length<=1){toast('A company needs at least one sword');return}const m=G.roster.splice(i,1)[0];SLOTKEYS.forEach(k=>{if(m.eq[k])G.stash.push(m.eq[k])});toast(m.name+' leaves the company');FM.pick=null;coScreen='roster';coRender()}
function slotSheet(i,k){coSel=G.roster[i].id;coLast=i;coView='slot';coSlot=k;coScreen='merc';coRender()}
function equip(i,k,j){const m=G.roster[i],was=m.eq[k];if(j>=0){const id=G.stash[j];if(!ITEMS[id]||ITEMS[id].k!==k)return;if(k==='s'&&m.eq.w&&ITEMS[m.eq.w].two){toast('Both hands are full');return}
  G.stash.splice(j,1);if(m.eq[k])G.stash.push(m.eq[k]);m.eq[k]=id;if(k==='w'&&ITEMS[id].two&&m.eq.s){G.stash.push(m.eq.s);m.eq.s=null}}
 else if(m.eq[k]){G.stash.push(m.eq[k]);m.eq[k]=null}
 if((k==='a'||k==='h')&&m.eq[k]!==was&&m.cond&&typeof m.cond==='object'){delete m.cond[k];if(m.cond.a===undefined&&m.cond.h===undefined)delete m.cond}   // a piece from the stash is whole
 mercSheet(i);save()}
let lvSel=[];
function levelSheet(i){coSel=G.roster[i].id;coLast=i;coScreen='merc';coRender()}
function lvPick(i,k){const j=lvSel.indexOf(k);if(j>=0)lvSel.splice(j,1);else if(lvSel.length<3)lvSel.push(k);levelSheet(i)}
function lvConfirm(i){const m=G.roster[i];if(lvSel.length!==3)return;lvSel.forEach(k=>{m.base[k]+=m.rolls[k];if(k==='hp')m.hp+=m.rolls[k]});m.rolls=null;m.pend--;lvSel=[];save();mercSheet(i)}
