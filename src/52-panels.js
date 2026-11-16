/* ================= PANELS (two-pane landscape primitive) =================
   showPanel(o) draws a full-viewport panel: header, optional tab rail, list pane, detail pane.
   o = {id, title, sub, banner(html, left of the title), meta(html), note(html), closeLabel, onClose(fn),
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
/* the tailor's sign: a spool of madder thread and a needle (16x16) */
PNOWN.tailor=['................','...........00...','..00000000.0q0..','.0kkkkkkkj00q0..','.0jjjjjjji0q0...','..0hhhhhg0q0....','..0hgggggf0.....','..0hhhhhg00.....','..0hgggggf0.....','..0hhhhhgg0.....','..0hgggggf0.....','.0kkkkkkkj0.....','.0jjjjjjji0.....','..00000000......','................','................'];
PNOWN.dice=['................','................','...0000000000...','..0rrrrrrrrrr0..','..0r00rrrr00q0..','..0r00rrrr00q0..','..0rrrrrrrrrq0..','..0rrrr00rrrq0..','..0rrrr00rrrq0..','..0rrrrrrrrrq0..','..0r00rrrr00q0..','..0r00rrrr00q0..','..0qqqqqqqqqp0..','...0000000000...','................','................'];
function pnHasPx(n){return typeof pxIcon==='function'&&typeof iconRows==='function'&&!!iconRows(n)}
function pnIcon(k,cls,size){const n=PNPX[k]||k,c='pn-i px'+(cls?' '+cls:'');size=size||16;
 if(pnHasPx(n))return pxIcon(n,size,c);
 if(PNOWN[k]&&typeof pkHas==='function'&&pkHas('pa-'+k)&&hdArt()){const u=pkURL('pa-'+k);if(u)return`<i class="${c}" style="width:${size}px;height:${size}px;background-image:url(${u});background-size:100% 100%;image-rendering:auto" aria-hidden="true"></i>`}   // the painted twin (06pa-ui.js) at Detail High
 if(PNOWN[k]){const u=pxURL('pn:'+k,PNOWN[k],1);if(u)return`<i class="${c}" style="width:${size}px;height:${size}px;background-image:url(${u})" aria-hidden="true"></i>`}
 if(!PICON[k])return typeof pxIcon==='function'?pxIcon(n,size,c):'';
 return`<svg class="pn-i${cls?' '+cls:''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${PICON[k]||''}</svg>`}
function itemIconName(id){let it=ITEMS[id];if(!it)return'fist';if(it.k==='c'&&typeof coatIconName==='function')return coatIconName(id);if(it.legend&&pnHasPx('it-'+id))return'it-'+id;if(it.famed&&it.base&&ITEMS[it.base]){id=it.base;it=ITEMS[id]}if(pnHasPx('it-'+id))return'it-'+id;   // each item's own drawing (tier, shield shape)
if(it.k==='t')return typeof tgIcon==='function'?tgIcon(id):'stash';if(it.k==='s')return'shield';if(it.k==='h')return'helmet';if(it.k==='a')return it.arm<=60?'armor-light':it.arm<=150?'armor-medium':'armor-heavy';return it.wt||'sword'}
function pnItemIcon(id,size){const n=itemIconName(id);return pnFamedWrap(id,pnHasPx(n)||PNOWN[n]?pnIcon(n,'',size):pnIcon(n.indexOf('armor')===0?'armor':({mace:'axe',dagger:'sword',fist:'sword'})[n]||n,'',size))}
/* ---- famed items in every list: a gold glow around the icon (.famed wrapper), a gold name, a Famed tag, the improvements ---- */
const TIERN=['','I','II','III','IV','V'];
function pnFamedWrap(id,html){const it=ITEMS[id];return it&&it.legend?`<span class="famed lgd" title="Legendary">${html}</span>`:it&&it.famed?`<span class="famed" title="Famed">${html}</span>`:html}
// the item's name for a list or a heading: famed names in gold (big: with the base item's name under it)
function pnItemName(id,big){const it=ITEMS[id];if(!it)return'';if(!it.famed)return it.n;if(it.legend)return`<span class="fmd-n lgd-n">${it.n}</span>${big?`<small class="fmd-of">Legendary ${(itemKind(id).replace(/^Legendary /,''))}</small>`:''}`;const B=ITEMS[it.base];
 return`<span class="fmd-n">${it.n}</span>${big&&B?`<small class="fmd-of">${B.n}</small>`:''}`}
function pnFamedTag(id){return ITEMS[id]&&ITEMS[id].legend?'<span class="fmd-tag lgd-tag">Legendary</span>':ITEMS[id]&&ITEMS[id].famed?'<span class="fmd-tag">Famed</span>':''}
// the detail block of a famed item: the tag, its flavour, the improvements over the base
function pnFamedBlock(id){const it=ITEMS[id];if(!it||!it.famed)return'';if(it.legend)return pnLegendBlock(id);const L=typeof famedLines==='function'?famedLines(id):[];
 return`<div class="fmd-box">${pnFamedTag(id)}<p class="pn-p dim">${typeof famedFlavour==='function'?famedFlavour(id):''}</p>${L.length?`<ul class="fmd-lines">${L.map(x=>`<li data-fm="${x.k}">${x.t}</li>`).join('')}</ul>`:''}</div>`}
/* a legendary piece (25-legend.js): the tag, its power (name and exact rule), its legend; where it was won */
function pnLegendBlock(id){const it=ITEMS[id],P=it.power||{},R=typeof G==='object'&&G&&G.legend&&G.legend[id];
 return`<div class="fmd-box lgd-box">${pnFamedTag(id)}<div class="lgd-pw">${pnIcon('star','',16)}<span><b>${P.n||'Power'}</b><small>${P.d||''}</small></span></div><p class="pn-p lgd-lore">${it.lore||''}</p>${R?`<p class="pn-p dim lgd-from">Won${R.from?' from '+R.from:''} on day ${R.day}.</p>`:''}</div>`}
// itemFacts with the rows a famed item improves over its base marked (class fmd-up)
function pnFamedFacts(id){const it=ITEMS[id],F=itemFacts(id);if(!it||!it.famed||!ITEMS[it.base])return F;const B={};itemFacts(it.base).filter(Boolean).forEach(([k,v])=>B[k]=String(v));
 return F.map(r=>r&&B[r[0]]!==undefined&&B[r[0]]!==String(r[1])?[r[0],`<span class="fmd-up">${r[1]}</span>`]:r&&B[r[0]]===undefined?[r[0],`<span class="fmd-up">${r[1]}</span>`]:r)}
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
 if(a&&a.k==='t')return out;
 if(a&&a.k==='c'){add((a.brv||0)-(b&&b.brv||0),'resolve');add((a.md||0)-(b&&b.md||0),'melee def');add((a.rd||0)-(b&&b.rd||0),'ranged def');add((a.init||0)-(b&&b.init||0),'initiative');add((b?b.fat||0:0)-(a.fat||0),'fatigue');return out}
 if(b&&a&&b.k!==a.k&&(a.k==='w'||a.k==='s')&&(b.k==='w'||b.k==='s')){   // the shield slot: a shield against an off-hand weapon (11w-dualwield.js)
  const sh=a.k==='s'?a:b,sg=a.k==='s'?1:-1;add(sg*(sh.md||0),'melee def');add(sg*(sh.rd||0),'ranged def');const w=a.k==='w'?a:b;add(-sg*Math.round((w.d[0]+w.d[1])/2),'off-hand dmg');return out}
 if(a.k==='w'){const c=b||FIST;add(Math.round((a.d[0]+a.d[1]-c.d[0]-c.d[1])/2),'dmg');add((c.ap||4)-(a.ap||4),'AP');add((a.hit||0)-(c.hit||0),'to hit');add(Math.round(((a.ign||0)-(c.ign||0))*100),'% pierce');add((a.rng||1)-(c.rng||1),'range')}
 else if(a.k==='s'){add(a.md-(b?b.md:0),'melee def');add(a.rd-(b?b.rd:0),'ranged def');add((b?b.fat:0)-a.fat,'fatigue')}
 else{add(a.arm-(b?b.arm:0),a.k==='h'?'head armor':'armor');add((a.md||0)-(b&&b.md||0),'melee def');add((a.rd||0)-(b&&b.rd||0),'ranged def');add((b?b.fat||0:0)-(a.fat||0),'fatigue')}return out}
function pnDeltaChips(id,cur){if(id===cur)return'<span class="pn-d same">Same</span>';if(ITEMS[id]&&ITEMS[id].k==='t')return'<span class="pn-d tg">Trade good · '+pnTgWorth(ITEMS[id])+' crowns</span>';const d=itemDeltas(id,cur);if(!d.length)return'<span class="pn-d same">No change</span>';
 return d.map(x=>`<span class="pn-d ${x.v>0?'up':'dn'}">${x.v>0?'+':'−'}${Math.abs(x.v)} ${x.u}</span>`).join('')}
/* trade goods (ITEMS kind 't'): worth, where they are made, where they sell best */
function pnTgWorth(i){const v=+(i.v!=null?i.v:i.price!=null?i.price:i.val!=null?i.val:i.cost)||0;return Math.round(v)}
function pnTgFacts(id){const i=ITEMS[id],G0=typeof GOODS==='object'&&GOODS&&i.good?GOODS[i.good]:null,made=G0&&typeof G!=='undefined'&&G&&Array.isArray(G.towns)?G.towns.filter(t=>t&&(t.good===i.good||(Array.isArray(t.goods)&&t.goods.includes(i.good)))).map(t=>t.name):[];
 return[['Worth',pnTgWorth(i)+' crowns'],G0?['Trade good',G0.n]:null,made.length?['Made in',made.slice(0,3).join(', ')+(made.length>3?' and '+(made.length-3)+' more':'')]:null,['Sells best','Where it is not made'],['Weight','Rides in the wagons']]}
function itemFacts(id){if(ITEMS[id]&&ITEMS[id].k==='t')return pnTgFacts(id);if(ITEMS[id]&&ITEMS[id].k==='c'){const i=ITEMS[id];return[['Resolve','+'+(i.brv||0)],i.md?['Melee defense','+'+i.md]:null,i.rd?['Ranged defense','+'+i.rd]:null,i.init?['Initiative','+'+i.init]:null,['Fatigue',i.fat?'−'+i.fat:'0'],['Worn','Over the body armor'],['Colours',typeof coatColoursText==='function'?coatColoursText():'The banner']]}const i=ITEMS[id],rg=typeof isRangedW==='function'&&isRangedW(i),sg=v=>(v<0?'−':'+')+Math.abs(v),df=x=>x.md||x.rd?[x.md?['Melee defense',sg(x.md)]:null,x.rd?['Ranged defense',sg(x.rd)]:null]:[];
 if(i.k==='w')return[['Damage',`${i.d[0]}–${i.d[1]}`],['AP a swing',i.ap],['Fatigue a swing',i.fat],[rg?'Range':'Reach',i.rng>1?i.rng+' tiles':'Adjacent'],['Ignores armor',Math.round(i.ign*100)+'%'],i.hit?['To hit',sg(i.hit)]:null,i.reload?['Reload',i.reload.ap+' AP']:null,i.crush?['Crushes armor','+'+Math.round(i.crush*100)+'%']:null,i.stun?['Stun chance',Math.round(i.stun*100)+'%']:null,i.spell?['Spell damage','+'+Math.round(i.spell*100)+'%']:null,['Grip',i.two?'Two-handed':'One-handed']];
 if(i.k==='s')return[['Melee defense','+'+i.md],['Ranged defense','+'+i.rd],['Shield hitpoints',i.hp||48],['Fatigue','−'+i.fat],i.guard?['Covers allies','−'+i.guard+' to be shot']:null,i.wallB?['Shield wall','+'+i.wallB]:null,i.spike?['Spiked bash',i.spike[0]+'–'+i.spike[1]]:null];
 if(i.k==='h')return[['Head armor',i.arm],['Fatigue','−'+(i.fat||0)],...df(i),['Guards','Blows to the head']];return[['Armor',i.arm],['Fatigue','−'+i.fat],...df(i)]}
const ITKIND={dagger:'Dagger',mace:'Mace',sword:'Sword',axe:'Axe',spear:'Spear',bow:'Bow',staff:'Staff',hammer:'Hammer',polearm:'Polearm',greatsword:'Greatsword',crossbow:'Crossbow',flintlock:'Firearm'};
function itemKind(id){const i=ITEMS[id],k=i.k==='c'?'Surcoat':i.k==='t'?'Trade good':i.k==='s'?'Shield':i.k==='a'?'Armor':i.k==='h'?'Helmet':ITKIND[i.wt]||'Weapon';return i.legend?'Legendary '+k.toLowerCase():i.famed?'Famed '+k.toLowerCase():k}

function pnSheetUp(){const s=$('sheet');return!!(s&&!s.classList.contains('hidden')&&s.getClientRects().length)}
function pnAssert(){if(!PN.id)return;sheetOpen=true;if(G&&PN.town)G.townOpen=true}
function panelRoot(){if(PN.root)return PN.root;const r=document.createElement('div');r.id='pn';r.setAttribute('role','dialog');r.setAttribute('aria-modal','true');
 r.innerHTML=`<div class="pn-head"><span class="pn-ban" id="pnBan"></span><div class="pn-title"><b id="pnTitle"></b><span id="pnSub"></span></div><div class="pn-meta" id="pnMeta"></div><button type="button" class="pn-btn" id="pnClose" onclick="pnDo(0)"></button></div>
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
/* A tap re-renders the whole panel through showPanel, so it keeps the forced layouts to one: both scroll offsets are read before the
   first write, an offset is written back only when it or the new one is non-zero (a zero one cannot have moved; always on opening), the fade and slide-in
   animations restart on a style flush (pnRestyle) instead of a layout, and header pieces whose html did not change are left alone
   (pnSet; never while focus is inside them, so focus is lost exactly as before). The DOM that results is the same.
   The list and the detail go through pnMorph: the new html is parsed off-document, and every node equal to the one it would replace
   (isEqualNode) is kept, so a tap that changes one row restyles and lays out one row, not the whole pane. CSS animations in the pane
   are restarted as a rebuild would restart them. Form fields are never kept, and a pane holding the focus is rebuilt outright. */
function pnRestyle(e){try{if(typeof getComputedStyle==='function'){void getComputedStyle(e).animationName;return}}catch(x){}void e.offsetWidth}
function pnSet(e,h){if(e._ph===h){const a=typeof document!=='undefined'&&document.activeElement;if(!(a&&a!==document.body&&e.contains&&e.contains(a)))return}e.innerHTML=h;e._ph=h}
let PN_T=null;
function pnFocusIn(e){const a=typeof document!=='undefined'&&document.activeElement;return!!(a&&a!==document.body&&e.contains&&e.contains(a))}
function pnTpl(){if(PN_T===null){try{const T=document.createElement('template');PN_T=typeof DocumentFragment!=='undefined'&&T.content instanceof DocumentFragment?T:false}catch(x){PN_T=false}}return PN_T||null}   // false: no real DOM (the headless tests)
function pnMorph(e,h){const T=pnTpl();
 if(!T||pnFocusIn(e)||typeof e.isEqualNode!=='function'){e.innerHTML=h;return}
 T.innerHTML=h;const kept=pnKids(e,T.content);T.innerHTML='';
 if(kept&&typeof e.getAnimations==='function'){try{for(const a of e.getAnimations({subtree:true}))if(a.effect&&a.effect.target!==e&&typeof CSSAnimation!=='undefined'&&a instanceof CSSAnimation)a.currentTime=0}catch(x){}}}
// makes e's children equal to those of the parsed fragment (or element) n, moving nodes out of it; returns how many old nodes were kept.
// An old node is kept where it equals the new one at its place or, among up to 64 siblings, anywhere (the turn order shifts by one);
// an element that differs only inside keeps itself and its attributes and is matched child by child.
function pnKids(e,n){const o=Array.from(e.childNodes),m=Array.from(n.childNodes),no=o.length,nm=m.length;if(!no||!nm){e.textContent='';while(n.firstChild)e.appendChild(n.firstChild);return 0}
 const used=new Uint8Array(no),R=new Array(nm),scan=no<=64&&nm<=64;let kept=0;
 for(let i=0;i<nm;i++){const b=m[i];if(pnField(b))continue;
  if(i<no&&!used[i]&&o[i].nodeType===b.nodeType&&o[i].isEqualNode(b)){used[i]=1;R[i]=o[i];kept++;continue}
  if(scan&&b.nodeType===1)for(let j=0;j<no;j++)if(!used[j]&&o[j].nodeType===1&&o[j].isEqualNode(b)){used[j]=1;R[i]=o[j];kept++;break}}
 for(let i=0;i<nm;i++){if(R[i])continue;const b=m[i],a=i<no&&!used[i]?o[i]:null;
  if(a&&a.nodeType===1&&b.nodeType===1&&a.tagName===b.tagName&&!pnField(b)&&pnSameAttrs(a,b)){used[i]=1;R[i]=a;kept+=1+pnKids(a,b)}else R[i]=b}
 for(let j=0;j<no;j++)if(!used[j])e.removeChild(o[j]);
 for(let i=0;i<nm;i++){const c=e.childNodes[i];if(c!==R[i])e.insertBefore(R[i],c||null)}
 return kept}
/* pnParts(e, parts): e's contents become parts.join(''), where each part is a whole element (or nothing): a part whose html is the
   same as one already there keeps its nodes, wherever it moved, and only new parts are parsed. For long strips rebuilt often
   (the battle turn order: one token changes on a hit, all shift by one on a new turn). Animations restart as after a rebuild. */
function pnParts(e,P){const T=pnTpl();if(!T||pnFocusIn(e)){e.innerHTML=P.join('');e._pp=null;return}
 let old=e._pp;if(old){let n=0;for(const q of old)for(const x of q.n){if(x.parentNode!==e){old=null;break}n++}if(old&&n!==e.childNodes.length)old=null}
 if(!old){e.textContent='';old=[]}
 const at=new Map();for(let j=0;j<old.length;j++){const L=at.get(old[j].s);if(L)L.push(j);else at.set(old[j].s,[j])}
 const used=new Uint8Array(old.length),R=new Array(P.length);let kept=0;
 for(let i=0;i<P.length;i++){const s=P[i];let j=-1;if(i<old.length&&!used[i]&&old[i].s===s)j=i;else{const L=at.get(s);if(L)for(const q of L)if(!used[q]){j=q;break}}
  if(j>=0){used[j]=1;R[i]=old[j];kept++}else{T.innerHTML=s;R[i]={s,n:Array.from(T.content.childNodes)}}}
 T.innerHTML='';for(let j=0;j<old.length;j++)if(!used[j])for(const x of old[j].n)e.removeChild(x);
 let k=0;for(const q of R)for(const x of q.n){const c=e.childNodes[k];if(c!==x)e.insertBefore(x,c||null);k++}
 e._pp=R;
 if(kept&&typeof e.getAnimations==='function'){try{for(const a of e.getAnimations({subtree:true}))if(a.effect&&a.effect.target!==e&&typeof CSSAnimation!=='undefined'&&a instanceof CSSAnimation)a.currentTime=0}catch(x){}}}
function pnField(x){const t=x.nodeType===1&&x.tagName;return t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||(t&&x.querySelector&&!!x.querySelector('input,textarea,select'))}
function pnSameAttrs(a,b){const A=a.attributes,B=b.attributes;if(A.length!==B.length)return false;for(let i=0;i<A.length;i++){const x=A[i];if(b.getAttribute(x.name)!==x.value)return false}return true}
/* the market's inventory: one button sells every trade good in the stash (world agent's sellTrade / tradePrice), with the total stated */
function pnTradeBar(o){if(o.id!=='town'||typeof townTab==='undefined'||townTab!=='market'||typeof sellTrade!=='function'||!G||!Array.isArray(G.stash)||typeof o.list!=='string'||o.list.indexOf('sellTrade(')>=0)return;
 let n=0,v=0;for(const id of G.stash){const it=ITEMS[id];if(!it||it.k!=='t')continue;n++;let q=null;if(typeof tradePrice==='function'){try{q=tradePrice(id,G.town)}catch(e){}}v+=q&&q.v!=null?+q.v:typeof q==='number'?q:pnTgWorth(it)}
 if(!n)return;const at=o.list.indexOf('<div class="pn-sec"><span>Spare in the stash');if(at<0)return;
 const bar=`<div class="mk-trade"><span>${pnIcon('tg','',32)}<span><b>${n} trade good${n===1?'':'s'}</b><small>Sell for ${Math.round(v)} crowns here</small></span></span><button type="button" class="pn-btn pri" onclick="sellTrade()">Sell all</button></div>`;
 o.list=o.list.slice(0,at)+bar+o.list.slice(at)}
function showPanel(o){try{pnTradeBar(o)}catch(e){}const r=panelRoot(),fresh=!PN.id,L=$('pnList'),D=$('pnDetail');
 if(fresh&&pnSheetUp()&&typeof closeSheet==='function')closeSheet(true);
 const l0=L.scrollTop,d0=D.scrollTop;
 if(PN.lkey)PN.scroll[PN.lkey]=l0;
 const sameD=!fresh&&PN.id===o.id&&PN.dkey===o.detailKey,dTop=sameD?d0:0;
 PN.id=o.id;PN.h=[o.onClose||closePanel];const act=f=>'pnDo('+(PN.h.push(f)-1)+')';
 r.dataset.panel=o.id;r.dataset.view=o.view||'';r.classList.toggle('pn-norail',!(o.tabs&&o.tabs.length));r.classList.toggle('pn-single',!!o.single);
 $('pnTitle').textContent=o.title||'';{const bn=$('pnBan');if(bn){pnSet(bn,o.banner||'');bn.classList.toggle('on',!!o.banner)}}$('pnSub').textContent=o.sub||'';pnSet($('pnMeta'),o.meta||'');
 pnSet($('pnClose'),pnIcon(o.closeIcon||'x')+`<span>${o.closeLabel||'Close'}</span>`);
 const N=$('pnNote');pnSet(N,o.note||'');N.classList.toggle('on',!!o.note);
 pnSet($('pnRail'),(o.tabs||[]).map(t=>`<button type="button" role="tab" class="pn-tab${t.k===o.tab?' on':''}" aria-selected="${t.k===o.tab}" onclick="${act(()=>o.onTab(t.k))}">${pnIcon(t.icon||t.k,'',32)}<span>${t.n}</span>${t.badge?`<i>${t.badge}</i>`:''}</button>`).join('')
  +((o.railEnd||[]).length?'<span class="pn-railgap"></span>'+o.railEnd.map(t=>`<button type="button" class="pn-tab alt" onclick="${act(t.fn)}">${pnIcon(t.icon,'',32)}<span>${t.n}</span>${t.badge?`<i>${t.badge}</i>`:''}</button>`).join(''):''));
 $('pnRail').style.setProperty('--pn-n',String(Math.max(1,(o.tabs||[]).length+(o.railEnd||[]).length)));   // tab height comes from the viewport, not the grid track (Safari sized it wrong on first open)
 pnMorph(L,o.list||'');pnMorph(D,o.detail||'');const F=$('pnFoot');pnSet(F,o.foot||'');F.classList.toggle('on',!!o.foot);
 r.classList.add('pn-on');if(fresh){r.classList.remove('pn-in');pnRestyle(r);r.classList.add('pn-in')}
 {const lt=PN.scroll[o.listKey]||0;if(fresh||lt||l0)L.scrollTop=lt}PN.lkey=o.listKey;
 if(fresh||dTop||d0)D.scrollTop=dTop;PN.dkey=o.detailKey;if(!sameD){D.classList.remove('pn-fade');pnRestyle(D);D.classList.add('pn-fade')}
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
PNOWN.swap=pnOut(['','.....d','....dd','...ddddddddddd','..dcccccccccc','...ccb','....cb','.....b','........b','........bc','........bcc','..bbbbbbbbbbcc','..ccccccccccc','.........cc','.........c','']);
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
// the swords the temple can do something for: at least one injury that is not permanent (the temple badges count these)
function cpTreatable(){return G&&G.roster?G.roster.filter(m=>cpInj(m).some(j=>!j.perm&&cpInjCost(m,j.id)!=null)):[]}
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

/* ================= TALENT READERS (trees, perks, gift variant, weapon trees, equip rules) =================
   One place where the out-of-battle screens read the talents API (mercTrees, perkOptions, canLearn, learnPerk,
   perkById, giftVariant, weaponTrees, mercStyle, tierLevel, equipRules). Each prefers the rules' own function and
   falls back to reading MAST and the merc directly (old m.mast saves, tier-less trees), so every screen still
   runs while the rules move. Nothing here touches the DOM or the seeded RNG. */
const TL_WTN={sword:'Sword',axe:'Axe',mace:'Mace',hammer:'Hammer',dagger:'Dagger',spear:'Spear',polearm:'Polearm',greatsword:'Greatsword',bow:'Bow',crossbow:'Crossbow',flintlock:'Firearm',staff:'Staff',fist:'Fist',shield:'Shield'};
const TL_STYN={melee:'Melee',ranged:'Ranged',caster:'Caster',support:'Support'};
function tlTry(f,d){try{const v=f();return v===undefined?d:v}catch(e){return d}}
function tlKind(T){return!T?'style':T.kind||(T.wt?'weapon':T.res?'gift':'style')}
/* a tree's tiers as [[perk,...],...]; old trees (p:[...]) read as one perk a tier */
function tlTiers(T){if(!T)return[];if(Array.isArray(T.tiers))return T.tiers.map(t=>Array.isArray(t)?t:[t]);return Array.isArray(T.p)?T.p.map(p=>[p]):[]}
function tlTierLv(kind,t){if(typeof tierLevel==='function'){const v=tlTry(()=>tierLevel(kind,t),null);if(cpNum(v))return v}return kind==='weapon'?3*t:kind==='armor'?3*t-1:t}   // weapon: its one tier at 3
/* ---- armor-class trees (MAST kind 'armor': lightarmor medarmor heavyarmor, tiers at 2 / 5 / 8, active only while wearing that class).
   Classes are normalised to 'light' | 'medium' | 'heavy' (null = unarmored). The rules' armorClass(m) decides; the fallback reads body armor points. ---- */
const TL_ARMN={light:'Light',medium:'Medium',heavy:'Heavy'},TL_ARMK=['light','medium','heavy'];
function tlArmNorm(c){if(c==null||c===false)return null;if(typeof c==='object')c=c.key||c.k||c.cls||c.n||'';c=String(c).toLowerCase();
 return/heavy|plate/.test(c)?'heavy':/med|mid/.test(c)?'medium':/light|lt/.test(c)?'light':null}
function tlArmTrees(){const L=[];for(const k in MAST)if(tlKind(MAST[k])==='armor')L.push(k);return L.sort((a,b)=>TL_ARMK.indexOf(tlTreeArm(a))-TL_ARMK.indexOf(tlTreeArm(b)))}
function tlTreeArm(key){const T=MAST[key]||{};return tlArmNorm(T.ac||T.cls||T.armor||T.aw||T.wt)||tlArmNorm(key)}
function tlArmClass(m){if(!m)return null;if(typeof armorClass==='function'){const c=tlTry(()=>armorClass(m),undefined);if(c!==undefined)return tlArmNorm(c)}
 const a=ITEMS[m.eq&&m.eq.a];return!a?null:a.arm<=60?'light':a.arm<=150?'medium':'heavy'}
/* the armor trees this merc's background allows (BG[bg].at via mercTrees), and a short line naming them */
function tlArmKeys(m){return tlTrees(m).filter(x=>x.kind==='armor').map(x=>x.key)}
function tlBgA(m){const n=BG[m.bg]?BG[m.bg].n.toLowerCase():'sword';return(/^[aeiou]/.test(n)?'an ':'a ')+n}
function tlArmNote(m,short){const L=tlArmKeys(m).map(k=>(TL_ARMN[tlTreeArm(k)]||MAST[k].n).toLowerCase()),b=tlBgA(m),J=L.join(' and ');
 if(short)return L.length?J[0].toUpperCase()+J.slice(1)+' only':'None';if(!L.length)return'No armor tree for '+b;
 return(b[0].toUpperCase()+b.slice(1))+' learns '+(L.length===1?'only the '+J+' armor tree':'only the '+J+' armor trees')}
function tlPid(k,p,t,j){return p&&p.id!=null?String(p.id):k+'#'+t+'.'+j}
function tlLegacy(m){return!Array.isArray(m.perks)&&!!m.mast&&typeof m.mast==='object'}
/* the merc's gift tree key (its variant), or null */
function tlGift(m){if(!m)return null;if(typeof giftVariant==='function'){const g=tlTry(()=>giftVariant(m),null);if(typeof g==='string'&&MAST[g])return g;if(g&&g.key&&MAST[g.key])return g.key}
 if(m.gift&&MAST[m.gift])return m.gift;if(m.mast)for(const k in m.mast)if(MAST[k]&&MAST[k].res)return k;return null}
function tlRes(m){const g=tlGift(m);if(g&&MAST[g].res)return MAST[g].res;if(typeof mercRes==='function')return tlTry(()=>mercRes(m),null);return null}
function tlStyle(m){if(typeof mercStyle==='function'){const s=tlTry(()=>mercStyle(m),null);if(s)return s}const b=BG[m.bg]||{};return b.style||'melee'}
/* the gift label: "Aura: Archer's way" */
function tlGiftLabel(g){const T=MAST[g];if(!T)return'';const r=T.res&&typeof RESN!=='undefined'?RESN[T.res]:'';return r&&T.n.indexOf(r)!==0?r+': '+T.n:T.n}
/* the weapon families this merc's background allows (minus its race's), and the weapon tree key of each (MAST.weapons holds them all) */
function tlWtAllowed(m){const b=BG[m.bg]||{},no=(RACE[m.race]&&RACE[m.race].noWt)||[];return(Array.isArray(b.wt)?b.wt:[]).filter(w=>!no.includes(w))}
function tlWtKey(w){if(MAST[w]&&tlKind(MAST[w])==='weapon')return w;for(const k in MAST)if(tlKind(MAST[k])==='weapon'&&(MAST[k].wt===w||(MAST[k].tiers||[]).some(t=>t.some(p=>p&&p.wt===w))))return k;return null}
function tlWeaponKeys(m){if(typeof weaponTrees==='function'){const L=tlTry(()=>weaponTrees(m),null);if(Array.isArray(L))return L.map(x=>typeof x==='string'?(MAST[x]?x:tlWtKey(x)):x&&x.key).filter(k=>k&&MAST[k])}
 return tlWtAllowed(m).map(tlWtKey).filter(Boolean)}
function tlStyleKeys(m){const g=tlGift(m);if(Array.isArray(m.trees))return m.trees.filter(k=>MAST[k]&&k!==g&&tlKind(MAST[k])!=='gift'&&tlKind(MAST[k])!=='weapon');return m.mast?Object.keys(m.mast).filter(k=>MAST[k]&&!MAST[k].res):[]}
/* [{key,tree,kind}]: style trees, then the gift, then the weapon trees */
function tlTrees(m){if(typeof mercTrees==='function'){const L=tlTry(()=>mercTrees(m),null);if(Array.isArray(L)&&L.length)return L.map(x=>typeof x==='string'?{key:x,tree:MAST[x],kind:tlKind(MAST[x])}:{key:x.key,tree:x.tree||MAST[x.key],kind:x.kind||tlKind(x.tree||MAST[x.key])}).filter(x=>x.tree).map(x=>x.tree&&tlKind(x.tree)==='armor'?Object.assign(x,{kind:'armor'}):x)}
 const out=tlStyleKeys(m).map(k=>({key:k,tree:MAST[k],kind:'style'})),g=tlGift(m);if(g)out.push({key:g,tree:MAST[g],kind:'gift'});
 tlWeaponKeys(m).forEach(k=>out.push({key:k,tree:MAST[k],kind:'weapon'}));return out}
/* every perk of every tree the merc has: [{id,perk,key,tree,tier,kind,owned,unlocked,need}] */
function tlOpts(m){if(typeof perkOptions==='function'&&!tlLegacy(m)){const L=tlTry(()=>perkOptions(m),null),C=typeof capOptions==='function'?tlTry(()=>capOptions(m),[]):[];if(Array.isArray(L)&&L.length)return L.concat(Array.isArray(C)?C:[]).map(o=>Object.assign({},o,{kind:o.kind||tlKind(o.tree||MAST[o.key]),tree:o.tree||MAST[o.key],need:cpNum(o.need)?o.need:tlTierLv(o.kind||tlKind(MAST[o.key]),o.tier)}))}
 const own=Array.isArray(m.perks)?m.perks.map(String):[],out=[];
 tlTrees(m).forEach(({key,tree,kind})=>{const legacy=tlLegacy(m)&&!Array.isArray(tree.tiers),n=legacy?(m.mast[key]|0):0;
  tlTiers(tree).forEach((ps,ti)=>ps.forEach((p,j)=>{const t=ti+1,id=tlPid(key,p,t,j),need=tlTierLv(kind,t);
   out.push({id,perk:p,key,tree,tier:t,kind,owned:legacy?ti<n:own.includes(id),unlocked:legacy?ti<=n&&m.lvl>=need:m.lvl>=need,need})}))});
 return out}
function tlOpt(m,id){return tlOpts(m).find(o=>o.id===String(id))||null}
function tlOwnedIn(m,key){return tlOpts(m).filter(o=>o.key===key&&o.owned).length}
function tlCan(m,id){if(!m||!(m.pp>0))return false;const o=tlOpt(m,id);if(!o||o.owned)return false;
 if(typeof canLearn==='function'&&!tlLegacy(m))return!!tlTry(()=>canLearn(m,o.id),false);return!!o.unlocked}
/* learns perk id; returns true when a point was spent */
function tlLearn(m,id){const o=tlOpt(m,id);if(!o||o.owned||!(m.pp>0))return false;
 if(typeof learnPerk==='function'&&!tlLegacy(m)){const pp=m.pp,r=tlTry(()=>learnPerk(m,o.id),false);return!!r||m.pp<pp}
 if(!o.unlocked)return false;const p=o.perk;
 if(tlLegacy(m))m.mast[o.key]=(m.mast[o.key]|0)+1;else{(m.perks||(m.perks=[])).push(o.id)}
 m.pp--;if(p.st&&p.st.hp&&typeof calc==='function'){const s=calc(m);m.hp=Math.min(s.hp,m.hp+p.st.hp)}return true}
/* the first perk of tree key the merc can learn now (lowest tier first), for old learn(i, treeKey) callers */
function tlFirstIn(m,key){const L=tlOpts(m).filter(o=>o.key===key&&!o.owned&&o.unlocked).sort((a,b)=>a.tier-b.tier);return L.length?L[0].id:null}
const TL_STIC={hp:'hp',fat:'fatigue',init:'init',ms:'melee',rs:'ranged',md:'mdef',rd:'rdef',brv:'resolve',arm:'armor',dmg:'swords',ap:'ap'};
/* a tree's icon: the art's m-<key> when drawn, else the weapon family / gift, else the tree's first ability or stat */
function tlTreeIcon(key){const T=MAST[key]||{};if(pnHasPx('m-'+key))return'm-'+key;if(T.icon&&pnHasPx(T.icon))return T.icon;if(T.wt)return T.wt;if(T.res)return T.res;
 const old=({vanguard:'melee',bulwark:'shield',marksman:'bow',skirmisher:'init'})[key];if(old)return old;
 const P=[].concat(...tlTiers(T));for(const p of P)if(p&&p.ab&&pnHasPx('ab-'+p.ab))return'ab-'+p.ab;
 for(const p of P)if(p&&p.st)for(const q in p.st)if(TL_STIC[q])return TL_STIC[q];return'star'}
function tlPerkIcon(o){const p=o.perk||{};if(p.ab)return'ab-'+p.ab;if(pnHasPx('perk-'+o.id))return'perk-'+o.id;return tlTreeIcon(o.key)}
function tlGiftRes(key){const T=MAST[key];return T&&T.res||''}
/* ---- arms: one- and two-handed, the backup weapon, the shield ---- */
function tlTwo(id){const it=ITEMS[id];return!!(it&&it.k==='w'&&it.two)}
function tlGrip(id){const it=ITEMS[id];return it&&it.k==='w'?(it.two?'2H':'1H'):''}
/* {ok, why}: can item id go into slot ('w' main, 'b' backup, 's' shield, 'a', 'h') of merc m? equipRules decides when present. */
function tlEquipRule(m,slot,id){const it=ITEMS[id];if(!it)return{ok:false,why:'Unknown item'};const want=slot==='b'?'w':slot;if(it.k!==want&&!(slot==='s'&&it.k==='w'))return{ok:false,why:'That does not go in this slot'};
 if(typeof equipRules==='function'){const r=tlTry(()=>equipRules(m,slot,id),undefined);
  if(r===true||r===null)return{ok:true,why:''};if(r===false)return{ok:false,why:'Cannot be equipped'};if(typeof r==='string')return r?{ok:false,why:r}:{ok:true,why:''};
  if(r&&typeof r==='object'){const why=r.why||r.reason||r.msg||r.err||'';return{ok:r.ok!==false&&!r.err,why,drop:r.drop||null}}}
 const e=m.eq||{};if(slot==='s'&&tlTwo(e.w)&&tlTwo(e.b))return{ok:false,why:'Both hands are full: a shield needs a one-handed weapon in one of the two weapon slots'};return{ok:true,why:''}}
/* would putting weapon id into slot ('w'|'b') leave a shield with no one-handed weapon to go with? */
function tlDropsShield(m,slot,id){const e=m.eq||{};if(!e.s)return false;if(typeof equipRules==='function'){const r=tlTry(()=>equipRules(m,slot,id),null);return!!(r&&Array.isArray(r.drops)&&r.drops.includes('s'))}if(!tlTwo(id))return false;const other=slot==='b'?e.w:e.b;return tlTwo(other)}
/* the shield slot holds an off-hand weapon (11w-dualwield.js); tlSlung: a shield slung, or an off-hand weapon idle, with the main weapon in hand */
function tlOffW(m){const id=m&&m.eq&&m.eq.s;return!!(id&&ITEMS[id]&&ITEMS[id].k==='w')}
function tlSlung(m){const e=m.eq||{};if(!e.s)return false;if(tlOffW(m))return!(typeof dwMainOK==='function'&&dwMainOK(ITEMS[e.w]));return tlTwo(e.w)}
/* ================= TRAITS in every UI =================
   trList(m) -> [{key,n,d,good,fx}] from m.traits (rules: TRAITS[key] = {n,d,good,st,flag,mod,wage,opp}); traitsOf(m) when keys are missing.
   traitChips(m,o) -> HTML: o.compact (icons only, battle chip), o.size (16), o.full (icon, name and the exact effects in a list),
   default: icon + name chips with the description as a tooltip. Works anywhere (town tavern, inspect, panels); '' when the merc has none. */
function trList(m){if(!m)return[];const T=typeof TRAITS==='object'&&TRAITS?TRAITS:{},out=[];let keys=Array.isArray(m.traits)?m.traits.slice(0,4):[];
 if(!keys.length&&typeof traitsOf==='function'){let L=null;try{L=traitsOf(m)}catch(e){L=null}if(Array.isArray(L))L.forEach(d=>{if(!d)return;let k=d.key||d.id||null;if(!k)for(const q in T)if(T[q]===d){k=q;break}if(k)keys.push(k)})}
 for(const k of keys){const d=T[k];if(!d&&typeof k!=='string')continue;const good=d&&typeof d.good==='boolean'?d.good:(typeof trGood==='function'?trGood(k):true);
  out.push({key:k,n:d&&d.n||String(k).replace(/^\w/,c=>c.toUpperCase()),d:d&&d.d||'',good,fx:trFx(d)})}return out}
function trFx(d){if(!d)return'';const a=[];const s=typeof cpStDesc==='function'&&d.st?cpStDesc(d.st):'';if(s)a.push(s);if(cpNum(d.wage)&&d.wage)a.push((d.wage>0?'+':'−')+(Math.abs(d.wage)<1?Math.round(Math.abs(d.wage)*100)+'% wages':Math.abs(d.wage)+' wage a day'));return a.join(', ')}
function trEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c])}
function traitChips(m,o){o=o||{};const L=trList(m);if(!L.length)return o.full?'<div class="tr-none">No notable traits.</div>':'';const sz=o.size||16,ic=t=>typeof trIconHTML==='function'?trIconHTML(t.key,sz):'';
 if(o.compact)return`<span class="tr-chips compact" aria-label="Traits: ${trEsc(L.map(t=>t.n).join(', '))}">${L.map(t=>`<span class="tr-c ${t.good?'good':'bad'}" title="${trEsc(t.n+(t.d?': '+t.d:''))}">${ic(t)}</span>`).join('')}</span>`;
 if(o.full)return`<div class="tr-list">${L.map(t=>`<div class="tr-row ${t.good?'good':'bad'}">${ic(t)}<div><b>${trEsc(t.n)}</b><span>${trEsc(t.d||t.fx||'')}</span></div></div>`).join('')}</div>`;
 return`<span class="tr-chips">${L.map(t=>`<span class="tr-c ${t.good?'good':'bad'}" title="${trEsc(t.n+(t.d?': '+t.d:''))}">${ic(t)}<b>${trEsc(t.n)}</b></span>`).join('')}</span>`}

/* ================= MONSTER HUNTER, KILLS AND THE SOLO RUN (readers) =================
   QUARRY[k] = {n, one, tag, en:[EN ids], per, cap} (k = the hunter perk id), m.slain = {k: kills}; the rules' quarryInfo(m,k) /
   quarryVs(u,t) decide, the fallbacks follow the contract (+QUARRYB% once learned, +per% damage and floor(kills x per / 2) to hit per kill, up to cap).
   canRecruit() closes every way to add a sword on a solo run; tlSoloWhy() is the reason the screens show. */
function tlQuarries(){return typeof QUARRY==='object'&&QUARRY?Object.keys(QUARRY):[]}
function tlQuarryOf(o){if(!o)return null;const p=o.perk||o,Q=typeof QUARRY==='object'&&QUARRY;if(!Q)return null;for(const k of [p.quarry,p.q,o.id,p.id])if(k&&Q[k])return k;return null}
function tlQuarryIcon(k){return typeof icQuarry==='function'?icQuarry(k):'skull'}
function tlSlain(m,k){const s=m&&m.slain&&typeof m.slain==='object'?m.slain:null;return s&&cpNum(s[k])?Math.max(0,Math.floor(s[k])):0}
function tlQuarryInfo(m,k){const Q=typeof QUARRY==='object'&&QUARRY&&QUARRY[k];if(!Q)return null;const own=Array.isArray(m&&m.perks)&&m.perks.map(String).includes(k),slain=tlSlain(m,k),cap=cpNum(Q.cap)?Q.cap:30,per=cpNum(Q.per)?Q.per:1,base=typeof QUARRYB==='number'?QUARRYB:5;
 let r=null;if(typeof quarryInfo==='function')r=tlTry(()=>quarryInfo(m,k),null);r=r&&typeof r==='object'?r:{};
 const kills=cpNum(r.kills)?r.kills:cpNum(r.n)?r.n:cpNum(r.stack)?r.stack:Math.min(slain,cap),learned=r.learned!=null?!!r.learned:r.on!=null?!!r.on:r.own!=null?!!r.own:own;
 const dmg=cpNum(r.dmg)?r.dmg:cpNum(r.dmgPct)?r.dmgPct:learned?base+per*kills:0,hit=cpNum(r.hit)?r.hit:learned?Math.floor(kills*per/2):0;
 return{key:k,n:Q.n,one:Q.one||Q.n,tag:Q.tag||Q.n,slain:cpNum(r.slain)?r.slain:slain,kills,cap,per,base,learned,dmg,hit,max:kills>=cap,
  dmgMax:base+per*cap,hitMax:Math.floor(per*cap/2),dmgIf:base+per*kills,hitIf:Math.floor(kills*per/2)}}
/* "12 slain: +11% damage, +3 to hit" (what it would give, when not yet learned) */
function tlQuarryLine(I,short){if(!I)return'';const d=I.learned?I.dmg:I.dmgIf,h=I.learned?I.hit:I.hitIf,cap=I.max?' (at the cap)':'';
 return`${I.slain} slain${short?'':cap}: +${d}% damage${h?', +'+h+' to hit':''}${I.learned||short?'':' once learned'}`}
function tlSlainList(m){const s=m&&m.slain&&typeof m.slain==='object'?m.slain:{},out=[];
 for(const k of tlQuarries()){const n=tlSlain(m,k);if(n>0)out.push(Object.assign(tlQuarryInfo(m,k),{icon:tlQuarryIcon(k)}))}
 for(const k in s)if(!(typeof QUARRY==='object'&&QUARRY&&QUARRY[k])&&cpNum(s[k])&&s[k]>0)out.push({key:k,n:k,slain:s[k],learned:false,icon:tlQuarryIcon(k)});
 return out}
function tlCanRecruit(){if(typeof canRecruit==='function')return tlTry(()=>canRecruit(),true)!==false;return true}
function tlSolo(){if(typeof isSolo==='function')return!!tlTry(()=>isSolo(),false);const O=typeof ORIGINS==='object'&&ORIGINS&&typeof G==='object'&&G&&ORIGINS[G.origin];return!!(O&&O.solo)||!tlCanRecruit()}
function tlSoloWhy(){if(typeof recruitWhy==='function'){const w=tlTry(()=>recruitWhy(),'');if(w)return String(w)}return'You ride alone'}
