/* ================= PANELS (two-pane landscape primitive) =================
   showPanel(o) draws a full-viewport panel: header, optional tab rail, list pane, detail pane.
   o = {id, title, sub, meta(html), note(html), closeLabel, onClose(fn),
        tabs:[{k,n,icon,badge}], tab, onTab(fn(k)), railEnd:[{n,icon,fn}],
        list(html), listKey, detail(html), detailKey, foot(html)}
   The list keeps its scroll position per listKey; the detail keeps it while detailKey is unchanged.
   closePanel(quiet) hides it and clears sheetOpen / G.townOpen exactly like closeSheet does. */
const PN={root:null,id:null,lkey:null,dkey:null,scroll:{},h:[],over:false,town:false};
const PICON={
 contracts:'<path d="M6 3.5h12v13.5l-3.5 3.5H6z"/><path d="M14.5 20.5V17H18"/><path d="M9 8h6M9 11.5h6M9 15h2.5"/>',
 tavern:'<path d="M6 9h9v9.5a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 6 18.5z"/><path d="M15 11h2a2 2 0 0 1 2 2v1.5a2 2 0 0 1-2 2h-2"/><path d="M6 9c-.6-2.6 1.4-4.4 3.3-3.6.9-1.7 3.4-1.7 4.2 0 1.6-.3 2.3 1.4 1.5 3.6"/><path d="M9 12.5v4M12 12.5v4"/>',
 market:'<path d="M12 4v16M7.5 20h9M5.5 7.5h13"/><path d="M5.5 7.5L3 13.5a2.6 2.6 0 0 0 5 0zM18.5 7.5L16 13.5a2.6 2.6 0 0 0 5 0z"/>',
 inn:'<path d="M3 19v-9M3 15h18v4M21 15v-1.5a3 3 0 0 0-3-3h-7V15"/><circle cx="7" cy="12" r="1.7"/><path d="M15.5 3.2a3 3 0 1 0 3.3 4 3.4 3.4 0 0 1-3.3-4z"/>',
 company:'<path d="M6 3v18"/><path d="M6 4.5h12.5l-3 4 3 4H6"/>',
 coin:'<circle cx="12" cy="12" r="8.2"/><path d="M12 7.6l3.4 4.4-3.4 4.4L8.6 12z"/>',
 food:'<path d="M4 12.5C4 9.4 6 7 9 7h6c3 0 5 2.4 5 5.5V17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9.5 7.2l-1 3.3M13.5 7l-1 3.5M17 8l-1 2.5"/>',
 skull:'<path d="M12 3.5a7 7 0 0 0-7 7c0 2.3 1 4 2.6 5v3.2h8.8v-3.2c1.6-1 2.6-2.7 2.6-5a7 7 0 0 0-7-7z"/><circle cx="9.3" cy="11.2" r="1.5" fill="currentColor" stroke="none"/><circle cx="14.7" cy="11.2" r="1.5" fill="currentColor" stroke="none"/><path d="M10.6 18.5v-2M13.4 18.5v-2"/>',
 sword:'<path d="M19.5 4.5h-3.4L7.8 12.8l3.4 3.4 8.3-8.3z"/><path d="M6 11.5l6.5 6.5M8.4 15.6L4.5 19.5"/>',
 axe:'<path d="M5 20.5L15.5 6"/><path d="M12.2 5.2c3-2.2 6.8-1 8 2.6-2.2 1.4-4.4 1.6-6.6.7z"/>',
 spear:'<path d="M4 20l10.5-10.5"/><path d="M13 8.2L20 4l-4.2 7z"/>',
 bow:'<path d="M7 3.5c7.5 1.5 12 6 13.5 13.5"/><path d="M7 3.5L20.5 17"/><path d="M3.5 20.5L14 10M14 10l-4 .4M14 10l-.4 4"/>',
 staff:'<path d="M6 21l9.5-14"/><circle cx="16.8" cy="5" r="2.2"/>',
 shield:'<path d="M12 3.5l7 2.3v5.7c0 4.4-2.9 7.5-7 9-4.1-1.5-7-4.6-7-9V5.8z"/><path d="M12 3.5v17M5 10.5h14"/>',
 armor:'<path d="M8.5 4L12 6l3.5-2 4.5 3-2 3.6V20H6v-9.4L4 7z"/><path d="M12 6v14M6 14.5h12"/>',
 x:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
 back:'<path d="M13.5 6l-6 6 6 6M8 12h10"/>',
 chev:'<path d="M9.5 6l6 6-6 6"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 star:'<path d="M12 3.6l2.5 5.3 5.8.7-4.3 4 1.1 5.8-5.1-2.8-5.1 2.8 1.1-5.8-4.3-4 5.8-.7z" fill="currentColor" stroke="none"/>',
 up:'<path d="M12 19V6M6.5 11.5L12 6l5.5 5.5"/>'
};
/* pnIcon(k,cls,size): a pixel icon (art's pxIcon) when one exists for k, else the old line glyph. size 16/32/48. */
const PNPX={contracts:'contract',x:'close',up:'level',armor:'armor-medium',sword:'sword',coin:'coin',food:'food',skull:'skull',star:'star',check:'check',back:'back',company:'company',tavern:'tavern',market:'market',inn:'inn'};
const PNOWN={chev:['................','................','.....00.........','.....0c0........','.....0cc0.......','.....0ccc0......','.....0cccc0.....','.....0ccccc0....','.....0cbbb0.....','.....0cbb0......','.....0cb0.......','.....0b0........','.....00.........','................','................','................']};
function pnHasPx(n){return typeof pxIcon==='function'&&typeof iconRows==='function'&&!!iconRows(n)}
function pnIcon(k,cls,size){const n=PNPX[k]||k,c='pn-i px'+(cls?' '+cls:'');size=size||16;
 if(pnHasPx(n))return pxIcon(n,size,c);
 if(PNOWN[k]){const u=pxURL('pn:'+k,PNOWN[k],1);if(u)return`<i class="${c}" style="width:${size}px;height:${size}px;background-image:url(${u})" aria-hidden="true"></i>`}
 if(!PICON[k])return typeof pxIcon==='function'?pxIcon(n,size,c):'';
 return`<svg class="pn-i${cls?' '+cls:''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${PICON[k]||''}</svg>`}
function itemIconName(id){const it=ITEMS[id];if(!it)return'fist';if(it.k==='s')return'shield';if(it.k==='h')return'helmet';if(it.k==='a')return it.arm<=60?'armor-light':it.arm<=150?'armor-medium':'armor-heavy';return it.wt||'sword'}
function pnItemIcon(id,size){const n=itemIconName(id);return pnHasPx(n)||PNOWN[n]?pnIcon(n,'',size):pnIcon(n.indexOf('armor')===0?'armor':({mace:'axe',dagger:'sword',fist:'sword'})[n]||n,'',size)}
function pnSkulls(n,of){let h='';for(let i=0;i<(of||n);i++)h+=pnIcon('skull',i<n?'':'off');return`<span class="pn-skulls" aria-label="Danger ${n} of ${of||n}">${h}</span>`}
function pnStars(n){let h='';for(let i=0;i<n;i++)h+=pnIcon('star');return n?`<span class="pn-stars" aria-label="${n} talent star${n===1?'':'s'}">${h}</span>`:''}
/* the purse shown in panel headers: crowns, rations, tools */
function pnPurse(){return pnCoin(G.crowns)+`<span class="pn-food" title="Rations">${pnIcon('food')}<b>${G.food}</b></span><span class="pn-food pn-tools${cpDamageAll()&&!cpTools()?' short':''}" title="Tools: each mends ${cpToolPts()} points of armor at camp or an inn">${pnIcon('tools')}<b>${cpTools()}</b></span>`}
function pnCoin(n,cls){return`<span class="pn-coin${cls?' '+cls:''}">${pnIcon('coin')}<b>${n}</b></span>`}
/* pixel meter: pnBar(pct, cls) ; cls picks the colour (hp, xp, or a g-<gift>) */
function pnBar(p,cls){return`<span class="pn-bar pxbar${cls?' '+cls:''}"><i style="width:${clamp(Math.round(p),0,100)}%"></i></span>`}
/* list row: {on:'js', sel, lead(html), title, sub, right(html), cls} */
function pnRow(o){return`<div class="pn-row${o.sel?' on':''}${o.cls?' '+o.cls:''}" role="button" tabindex="0"${o.sel?' aria-current="true"':''} onclick="${o.on}">${o.lead?`<span class="pn-lead">${o.lead}</span>`:''}<span class="pn-rmain"><span class="pn-rt">${o.title}</span>${o.sub?`<span class="pn-rs">${o.sub}</span>`:''}</span>${o.right?`<span class="pn-rr">${o.right}</span>`:''}</div>`}
function pnSec(t,n){return`<div class="pn-sec"><span>${t}</span>${n===undefined?'':`<i>${n}</i>`}</div>`}
function pnHead(t){return`<div class="pn-sech"><span>${t}</span></div>`}
function pnFacts(rows){rows=rows.filter(Boolean);return`<div class="pn-facts${rows.length>4?' two':''}">${rows.map(([k,v])=>`<span>${k}</span><b>${v}</b>`).join('')}</div>`}
function pnEmpty(t){return`<div class="pn-empty">${t}</div>`}
/* signed comparison chips between an item and what a slot holds now */
function itemDeltas(id,cur){const a=ITEMS[id],b=cur?ITEMS[cur]:null,out=[],add=(v,u)=>{if(v)out.push({v,u})};
 if(a.k==='w'){const c=b||FIST;add(Math.round((a.d[0]+a.d[1]-c.d[0]-c.d[1])/2),'dmg');add((a.hit||0)-(c.hit||0),'to hit');add((a.rng||1)-(c.rng||1),'range')}
 else if(a.k==='s'){add(a.md-(b?b.md:0),'melee def');add(a.rd-(b?b.rd:0),'ranged def');add((b?b.fat:0)-a.fat,'fatigue')}
 else{add(a.arm-(b?b.arm:0),a.k==='h'?'head armor':'armor');add((b?b.fat||0:0)-(a.fat||0),'fatigue')}return out}
function pnDeltaChips(id,cur){if(id===cur)return'<span class="pn-d same">Same</span>';const d=itemDeltas(id,cur);if(!d.length)return'<span class="pn-d same">No change</span>';
 return d.map(x=>`<span class="pn-d ${x.v>0?'up':'dn'}">${x.v>0?'+':'−'}${Math.abs(x.v)} ${x.u}</span>`).join('')}
function itemFacts(id){const i=ITEMS[id];if(i.k==='w')return[['Damage',`${i.d[0]}–${i.d[1]}`],['AP a swing',i.ap],['Fatigue a swing',i.fat],['Reach',i.rng>1?i.rng+' tiles':'Adjacent'],['Ignores armor',Math.round(i.ign*100)+'%'],i.hit?['To hit','+'+i.hit]:null,i.stun?['Stun chance',Math.round(i.stun*100)+'%']:null,i.spell?['Spell damage','+'+Math.round(i.spell*100)+'%']:null,['Grip',i.two?'Two-handed':'One-handed']];
 if(i.k==='s')return[['Melee defense','+'+i.md],['Ranged defense','+'+i.rd],['Fatigue','−'+i.fat]];if(i.k==='h')return[['Head armor',i.arm],['Fatigue','−'+(i.fat||0)],['Guards','Blows to the head']];return[['Armor',i.arm],['Fatigue','−'+i.fat]]}
function itemKind(id){const i=ITEMS[id];return i.k==='s'?'Shield':i.k==='a'?'Armor':i.k==='h'?'Helmet':({dagger:'Dagger',mace:'Mace',sword:'Sword',axe:'Axe',spear:'Spear',bow:'Bow',staff:'Staff'})[i.wt]||'Weapon'}

function pnSheetUp(){const s=$('sheet');return!!(s&&!s.classList.contains('hidden')&&s.getClientRects().length)}
function pnAssert(){if(!PN.id)return;sheetOpen=true;if(G&&PN.town)G.townOpen=true}
function panelRoot(){if(PN.root)return PN.root;const r=document.createElement('div');r.id='pn';r.setAttribute('role','dialog');r.setAttribute('aria-modal','true');
 r.innerHTML=`<div class="pn-head"><div class="pn-title"><b id="pnTitle"></b><span id="pnSub"></span></div><div class="pn-meta" id="pnMeta"></div><button type="button" class="pn-btn" id="pnClose" onclick="pnDo(0)"></button></div>
<div class="pn-note" id="pnNote"></div>
<div class="pn-body"><div class="pn-rail" id="pnRail" role="tablist"></div><div class="pn-list" id="pnList"></div><div class="pn-detail"><div class="pn-dscroll" id="pnDetail"></div><div class="pn-foot" id="pnFoot"></div></div></div>`;
 const app=$('app')||document.body,sh=$('sheet');if(sh&&sh.parentNode===app)app.insertBefore(r,sh);else app.appendChild(r);   // generic dialogs and toasts stay above the panel
 // the page sets touch-action:none and other code may listen for drags: keep pane scrolling to ourselves
 ['touchmove','wheel'].forEach(ev=>r.addEventListener(ev,e=>e.stopPropagation(),{passive:true}));
 r.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.getAttribute&&e.target.getAttribute('role')==='button'){e.preventDefault();e.target.click()}});
 // a sheet() dialog can open above the panel (a crisis notice during an inn stay); closing it must not strand or close the panel
 if(sh&&typeof MutationObserver!=='undefined')new MutationObserver(()=>{const up=pnSheetUp();if(up&&PN.id)PN.over=true;else if(!up&&PN.over){PN.over=false;pnAssert()}}).observe(sh,{attributes:true});
 PN.root=r;return r}
function pnDo(i){const f=PN.h[i];if(f)f()}
function showPanel(o){const r=panelRoot(),fresh=!PN.id,L=$('pnList'),D=$('pnDetail');
 if(fresh&&pnSheetUp()&&typeof closeSheet==='function')closeSheet(true);
 if(PN.lkey)PN.scroll[PN.lkey]=L.scrollTop;
 const sameD=!fresh&&PN.id===o.id&&PN.dkey===o.detailKey,dTop=sameD?D.scrollTop:0;
 PN.id=o.id;PN.h=[o.onClose||closePanel];const act=f=>'pnDo('+(PN.h.push(f)-1)+')';
 r.dataset.panel=o.id;r.dataset.view=o.view||'';r.classList.toggle('pn-norail',!(o.tabs&&o.tabs.length));r.classList.toggle('pn-single',!!o.single);
 $('pnTitle').textContent=o.title||'';$('pnSub').textContent=o.sub||'';$('pnMeta').innerHTML=o.meta||'';
 $('pnClose').innerHTML=pnIcon(o.closeIcon||'x')+`<span>${o.closeLabel||'Close'}</span>`;
 const N=$('pnNote');N.innerHTML=o.note||'';N.classList.toggle('on',!!o.note);
 $('pnRail').innerHTML=(o.tabs||[]).map(t=>`<button type="button" role="tab" class="pn-tab${t.k===o.tab?' on':''}" aria-selected="${t.k===o.tab}" onclick="${act(()=>o.onTab(t.k))}">${pnIcon(t.icon||t.k,'',32)}<span>${t.n}</span>${t.badge?`<i>${t.badge}</i>`:''}</button>`).join('')
  +((o.railEnd||[]).length?'<span class="pn-railgap"></span>'+o.railEnd.map(t=>`<button type="button" class="pn-tab alt" onclick="${act(t.fn)}">${pnIcon(t.icon,'',32)}<span>${t.n}</span>${t.badge?`<i>${t.badge}</i>`:''}</button>`).join(''):'');
 L.innerHTML=o.list||'';D.innerHTML=o.detail||'';const F=$('pnFoot');F.innerHTML=o.foot||'';F.classList.toggle('on',!!o.foot);
 r.classList.add('pn-on');if(fresh){r.classList.remove('pn-in');void r.offsetWidth;r.classList.add('pn-in')}
 L.scrollTop=PN.scroll[o.listKey]||0;PN.lkey=o.listKey;
 D.scrollTop=dTop;PN.dkey=o.detailKey;if(!sameD){D.classList.remove('pn-fade');void D.offsetWidth;D.classList.add('pn-fade')}
 const s=L.querySelector('.pn-row.on');if(typeof o.after==='function'){try{o.after(r)}catch(e){}}if(s){const a=s.offsetTop,b=a+s.offsetHeight;if(b<=L.scrollTop+30||a>=L.scrollTop+L.clientHeight)L.scrollTop=Math.max(0,a-Math.max(30,(L.clientHeight-s.offsetHeight)/2))}
 PN.town=!!(G&&G.townOpen);sheetOpen=true}
function panelOpen(){return PN.id}
function panelForget(prefix){for(const k in PN.scroll)if(!prefix||k.indexOf(prefix)===0)delete PN.scroll[k]}
function closePanel(quiet){if(!PN.id)return false;
 if(PN.over||pnSheetUp()){PN.over=false;Promise.resolve().then(pnAssert);return false}   // the close was meant for a dialog stacked above us
 if(PN.lkey)PN.scroll[PN.lkey]=$('pnList').scrollTop;
 PN.root.classList.remove('pn-on','pn-in');PN.id=PN.lkey=PN.dkey=null;PN.h=[];PN.town=false;
 sheetOpen=false;if(G)G.townOpen=false;if(!quiet&&typeof save==='function')save();return true}

/* ================= PHASE 5 SHAPES (helmets, armor condition, tools, injuries, resolve) =================
   Readers and actions shared by the company, town, deployment and results screens. Each one prefers the
   rules' own function (repairAll, treatInjury, injuryCost, INJ) and falls back to a plain local rule
   when that is not there, so the screens work on any build. Nothing here touches the DOM. */
/* own 16x16 fallbacks for icons the art set may not carry yet (pnIcon prefers the art set when it has the name) */
function pnOut(rows){const R=rows.slice(0,16).map(r=>(r+'................').slice(0,16));while(R.length<16)R.push('................');
 const on=(x,y)=>y>=0&&y<16&&x>=0&&x<16&&R[y][x]!=='.';return R.map((r,y)=>{let s='';for(let x=0;x<16;x++)s+=on(x,y)?r[x]:(on(x-1,y)||on(x+1,y)||on(x,y-1)||on(x,y+1))?'0':'.';return s})}
PNOWN.helmet=pnOut(['','','......qqqq','....qqrrqqpp','...qrrqqqqppp','...qrqqqqqppo','...qqqqqqpppo','...qqqqqppppo','...dccccccbbb','...qp..pp..po','...qp..pp..po','...qp..po..po','....p..po..o','.......po']);
PNOWN.tools=pnOut(['','..qqqqqqqqq','.qrrqqqqqppo','.qqqqqqqpppo','.ppppppppooo','.....kj','.....kj...p','.....kj..pqp','.....kj...p','.....kj...p','.....kj..cdc','.....kj...b','.....ji...b','.....ji']);
PNOWN.resolve=pnOut(['','','...ccc..ccc','..cdddccdddc','..cdedddddcb','..cddddddccb','..cdddddcccb','...cdddcccb','....cdcccb','.....cccb','......cb','','']);
PNOWN.injury=pnOut(['','..ll........ll','..lml......lml','...lml....lml','....lml..lml','.....lmgglm','......ghhg','......ghgg','.....lmgglm','....lml..lml','...lml....lml','..lml......lml','..ll........ll']);
PNOWN.temple=pnOut(['.......c','......ccc','.......c','......pqp','.....pqcqp','.....pqcqp','....gggggggh','...gggggggggh','..fqqqqqqqqqpf','...qqqyyqqqpp','...qqyeeyqqpp','...qqyeeyqqpp','...qqqjjqqqpp','...qqqjjqqqpp','...oooooooooo']);
PNOWN.reserve=pnOut(['','','....jjjjjj','...jkkkkkkj','..jkkkkkkkkj','..jkkiiiikkj','..jkkkkkkkkj','..jkkkkkkkkj','...jkkkkkkj','...ji....ij','...ji....ij','...ji....ij','...ii....ii']);
function cpIcon(names,size,cls){for(const n of [].concat(names))if(pnHasPx(n)||PNOWN[n])return pnIcon(n,cls||'',size||16);return pnIcon([].concat(names).pop(),cls||'',size||16)}
function cpNum(v){return typeof v==='number'&&isFinite(v)}
function cpTools(){return G&&cpNum(G.tools)?Math.max(0,Math.floor(G.tools)):0}
function cpHasHelms(){for(const k in ITEMS)if(ITEMS[k].k==='h')return true;return false}
/* armor and helmet points left: {a,aM,h,hM}. m.cond={a,h}; an absent value means the piece is whole. */
function cpCond(m){const e=m.eq||{},a=ITEMS[e.a],h=ITEMS[e.h],c=m.cond||{},aM=a&&a.k==='a'?a.arm||0:0,hM=h&&h.k==='h'?h.arm||0:0,f=(v,mx)=>cpNum(v)?clamp(Math.round(v),0,mx):mx;
 return{a:f(c.a,aM),aM,h:f(c.h,hM),hM}}
function cpDamage(m){const c=cpCond(m);return c.aM-c.a+c.hM-c.h}
function cpDamageAll(){let n=0;if(G&&G.roster)G.roster.forEach(m=>n+=cpDamage(m));return n}
const CPSTAT={hp:'hitpoints',fat:'fatigue',init:'initiative',ms:'melee skill',rs:'ranged skill',md:'melee defense',rd:'ranged defense',brv:'resolve',arm:'armor',dmg:'damage',ap:'AP'};
function cpStDesc(st){if(!st||typeof st!=='object')return'';const out=[];for(const k in st){const v=st[k];if(!cpNum(v)||!v)continue;const pct=Math.abs(v)<1;out.push((v>0?'+':'−')+(pct?Math.round(Math.abs(v)*100)+'%':Math.abs(v))+' '+(CPSTAT[k]||k))}return out.join(', ')}
/* a merc's injuries, ready to show: [{id,days,perm,n,d,lore}] (d = the effect in numbers, lore = the rules' own line about it) */
function cpInj(m){if(!m||!Array.isArray(m.inj))return[];const T=typeof INJ!=='undefined'&&INJ?INJ:{};
 return m.inj.filter(x=>x&&x.id!=null).map(x=>{const D=T[x.id]||{},perm=cpNum(x.days)?x.days<0:!!D.perm,fx=cpStDesc(D.st);
  return{id:x.id,days:cpNum(x.days)?x.days:0,perm,n:D.n||String(x.id).replace(/^./,c=>c.toUpperCase()).replace(/[_-]/g,' '),d:fx||D.d||'Fights below strength',lore:fx&&D.d?D.d:''}})}
function cpInjIcon(id,size){return cpIcon(['inj-'+id,'injury'],size||16)}
function cpInjDays(j){return j.perm?'Permanent':j.days<=0?'Heals today':j.days===1?'1 day left':j.days+' days left'}
function cpInjured(){return G&&G.roster?G.roster.filter(m=>cpInj(m).length):[]}
/* temple price: the rules' injuryCost when it gives one; else 40 crowns plus 15 a day still to heal (permanent wounds cannot be bought off) */
function cpInjCost(m,id){const j=cpInj(m).find(x=>x.id===id);if(!j)return null;
 if(typeof injuryCost==='function'){let c=null;try{c=injuryCost(m,id)}catch(e){}return cpNum(c)&&c>=0?Math.round(c):null}
 return j.perm?null:40+15*Math.max(1,j.days)}
/* Treats one injury for crowns. Returns {ok,cost,why}. Uses treatInjury (and pays for it if that did not). */
function cpTreat(m,id){const cost=cpInjCost(m,id);if(cost==null)return{ok:false,cost:0,why:'This wound is beyond the temple’s craft'};if(G.crowns<cost)return{ok:false,cost,why:'Not enough crowns'};
 const c0=G.crowns,has=()=>Array.isArray(m.inj)&&m.inj.some(x=>x&&x.id===id);
 if(typeof treatInjury==='function'){let r;try{r=treatInjury(m,id)}catch(e){r=false}if(r===false||has()){G.crowns=Math.min(G.crowns,c0);return{ok:false,cost,why:'The priests can do nothing for this'}}if(G.crowns===c0)G.crowns-=cost}
 else{m.inj=m.inj.filter(x=>!(x&&x.id===id));G.crowns-=cost}
 if(typeof calc==='function'){const mx=calc(m).hp;if(cpNum(mx))m.hp=clamp(m.hp,1,mx)}return{ok:true,cost:c0-G.crowns,why:''}}
/* Repairs armor and helmets with tools. Returns {pts,tools,list:[{name,pts}],left} (left = points still missing).
   The rules' repairAll() does the work when present; whatever it returns, the report is measured from the state. */
const CP_TOOLPTS=25;
function cpToolPts(){return typeof TOOLPTS==='number'&&TOOLPTS>0?TOOLPTS:typeof TOOL_PTS==='number'&&TOOL_PTS>0?TOOL_PTS:typeof TOOLREP==='number'&&TOOLREP>0?TOOLREP:CP_TOOLPTS}
function cpRepair(){const R=G.roster,before=R.map(cpDamage),t0=cpTools();
 if(typeof repairAll==='function'){try{repairAll()}catch(e){}}
 else{let pool=t0*CP_TOOLPTS,used=0;const order=R.map((m,i)=>i).sort((a,b)=>(R[b].field?1:0)-(R[a].field?1:0)||before[b]-before[a]);
  for(const i of order){const m=R[i],c=cpCond(m);for(const [k,cur,mx] of [['a',c.a,c.aM],['h',c.h,c.hM]]){const n=Math.min(mx-cur,pool-used);if(n>0){(m.cond||(m.cond={}))[k]=cur+n;used+=n}}
   if(m.cond){const d=cpCond(m);if(d.a>=d.aM)delete m.cond.a;if(d.h>=d.hM)delete m.cond.h}}
  G.tools=t0-Math.ceil(used/CP_TOOLPTS)}
 const out={pts:0,tools:Math.max(0,t0-cpTools()),list:[],left:0};
 R.forEach((m,i)=>{const d=cpDamage(m),n=before[i]-d;out.left+=d;if(n>0){out.pts+=n;out.list.push({name:m.name,pts:n})}});return out}
function cpRepairText(r){if(!r)return'';if(r.pts>0)return`Repaired ${r.pts} armor with ${r.tools} tool${r.tools===1?'':'s'}`+(r.left?`, ${r.left} still to mend`+(cpTools()?'':' and no tools left'):'');
 return r.left?(cpTools()?'':`No tools: ${r.left} armor stays broken`):''}
/* camp(): one call repairs and returns the line to show. hours is only for the wording. */
function campReport(hours){const r=cpRepair(),t=cpRepairText(r),h=hours===undefined?6:hours;campReport.last=r;
 return`Made camp for ${h===6?'six':h} hours`+(t?'. '+t:'')}
