/* ================= TOWNS & CONTRACTS ================= */
/* ---- hunts: the factions on offer come from the rules' factionPool(ctx) (40-world.js: tiers, biomes, how far out each lives),
   with the old list as the fallback. The lair is set on one of the faction's own biomes at the distance the pool gives;
   tougher factions pay more (CTR_TIERK). ---- */
const CTR_TIERK={early:1,mid:1.35,late:1.7,end:2.6,crisis:1.5};
function ctrPool(t,ti){let L=null;
 if(typeof factionPool==='function'){try{L=factionPool({x:t.x,y:t.y,town:t,ti,day:G.day,purpose:'contract',contract:true})}catch(e){L=null}}
 if(L&&!Array.isArray(L)&&typeof L==='object')L=Array.isArray(L.list)?L.list:Array.isArray(L.pool)?L.pool:Object.keys(L).map(f=>Object.assign({f},typeof L[f]==='object'?L[f]:{w:+L[f]||1}));
 const out=[];if(Array.isArray(L))for(const e of L){const o=typeof e==='string'?{f:e}:e&&typeof e==='object'?e:null;if(!o)continue;const f=o.f||o.id||o.k||o.fact;if(!FACT[f])continue;
  const dr=Array.isArray(o.d)?o.d:Array.isArray(o.dist)?o.dist:null,lo=svNum(o.dmin,svNum(o.min,dr?dr[0]:4)),hi=svNum(o.dmax,svNum(o.max,dr?dr[1]:lo+6));
  out.push({f,w:Math.max(0,svNum(o.w,svNum(o.weight,1))),lo:Math.max(2,lo),hi:Math.max(lo+1,hi)})}
 if(out.some(x=>x.w>0))return out.filter(x=>x.w>0);
 const fs=['gob','bandit','beast','undead'];if(G.day>5)fs.push('orc');if(G.crisis)fs.push('void');const out2=fs.map(f=>({f,w:1,lo:4,hi:10}));
 // the new factions by tier, further out (the rules' factionPool refines this with company strength)
 for(const [f,day,w,lo,hi] of [['serpent',6,1,6,12],['ent',10,.8,7,13],['ogre',10,.8,7,13],['wyvern',30,.35,Math.max(8,18-Math.floor((G.day-30)/6)),20]])if(FACT[f]&&G.day>=day)out2.push({f,w,lo,hi:Math.max(lo+2,hi)});
 return out2}
// is world position (x,y) on one of faction f's biomes? ('mountains' = within 2 tiles of a peak). No biomes listed: anywhere.
function ctrBiomeOk(f,x,y){const B=FACT[f]&&FACT[f].biomes;if(!Array.isArray(B)||!B.length||typeof tileAt!=='function'||!W)return true;const t=tileAt(x,y);
 if(B.includes(BIOKEY[t]))return true;if(B.includes('mountains')){const cx=Math.floor(x/TS),cy=Math.floor(y/TS);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(tileAt((cx+dx+.5)*TS,(cy+dy+.5)*TS)===4)return true}return false}
function ctrLairAt(t,f,lo,hi){let pos=null;for(let k=0;k<40;k++){const p=randOk(t.x,t.y,lo,hi);if(!pos)pos=p;if(ctrBiomeOk(f,p.x,p.y))return p}return pos}
function ctrTitle(f,t){return String(FACT[f].lair||'Hunt').replace('{place}',t.name)}
function genContract(t){const ti=G.towns.indexOf(t),rep=1+G.renown/300;
 if(rnd()<.25){let to;do{to=ri(0,G.towns.length-1)}while(to===ti);const o=G.towns[to],d=Math.hypot(o.x-t.x,o.y-t.y)/TS;return{type:'deliver',to,diff:1,pay:Math.round((60+d*10)*rep/10)*10,title:'Carry sealed cargo to '+o.name}}
 const P=ctrPool(t,ti);let tot=0;P.forEach(x=>tot+=x.w);let r=rnd()*tot,e=P[P.length-1];for(const x of P){r-=x.w;if(r<=0){e=x;break}}
 const f=e.f,diff=pick([1,1,2,2,3]),pos=ctrLairAt(t,f,e.lo,e.hi),tk=CTR_TIERK[FACT[f].tier]||1;
 return{type:'hunt',f,diff,x:pos.x,y:pos.y,pay:Math.round((200+G.day*8+fielded().length*25)*[1,1.6,2.5][diff-1]*tk*rep/10)*10,title:ctrTitle(f,t)}}
/* ---- markets stock by tier: hamlets tier 1-2, towns tier 3 from day 8, cities tier 3 from day 6, 4 from day 16, 5 from day 30 ----
   Famed and unique items are never on the stalls. */
function marketTier(size,day){size=size||1;day=day||1;if(size>=3)return day>=30?5:day>=16?4:day>=6?3:2;if(size===2)return day>=8?3:2;return day>=20?3:2}
function marketPool(maxT){return Object.keys(ITEMS).filter(k=>{const i=ITEMS[k];return!i.uniq&&!i.famed&&(i.tier||1)<=maxT})}
function stockPick(ids,maxT){const by={};for(const k of ids)(by[ITEMS[k].tier||1]||(by[ITEMS[k].tier||1]=[])).push(k);
 const T=Object.keys(by).map(Number).sort((a,b)=>a-b),w=T.map(t=>t===maxT?1.2:t===maxT-1?2:1.6);let tot=0;w.forEach(x=>tot+=x);let x=rnd()*tot,j=0;for(;j<T.length-1;j++){x-=w[j];if(x<=0)break}
 return pick(by[T[j]])}
function stockTown(t){t.ref=G.day;t.recruits=[];for(let i=0;i<4;i++)t.recruits.push(newMerc(wpickBG()));
 const maxT=marketTier(t.size,G.day),ids=marketPool(maxT);t.stock=[];for(let i=0;i<9;i++)t.stock.push(stockPick(ids,maxT));
 {const hs=ids.filter(k=>ITEMS[k].k==='h');if(hs.length&&t.stock.length&&!t.stock.some(id=>ITEMS[id].k==='h')){const lo=hs.filter(k=>(ITEMS[k].tier||1)<=Math.min(maxT,3));t.stock[t.stock.length-1]=pick(lo.length?lo:hs)}}   // every market has a helmet on the stalls
 t.contracts=[];for(let i=0;i<3;i++)t.contracts.push(genContract(t))}
function openTown(i){G.town=i;const t=G.towns[i];if(G.day-t.ref>=3)stockTown(t);let note='';const c=G.contract;
 if(c&&((c.type==='deliver'&&c.to===i)||(c.type==='hunt'&&c.done&&c.town===i))){G.crowns+=c.pay;G.renown+=8*c.diff;note=`<p class="good">Contract fulfilled. You are paid ${c.pay} crowns.</p>`;G.contract=null}
 townTab='contracts';townSel={contracts:0,tavern:0,market:'food',temple:0,tailor:0};if(typeof TLR!=='undefined')TLR.draft=null;panelForget('town:');
 townAt=typeof tvCan==='function'&&tvCan()?'scene':'panel';renderTown(note);save()}
function mastChips(m){return tlTrees(m).filter(x=>x.kind!=='weapon'&&x.kind!=='armor').map(x=>{const r=tlGiftRes(x.key);return`<span class="chip" style="${r?'border-color:'+RESC[r]+';color:'+RESC[r]:''}">${x.kind==='gift'?tlGiftLabel(x.key):x.tree.n}</span>`}).join('')}
/* ---- town panel (two-pane, see 52-panels.js) ---- */
/* townAt: 'scene' = the illustrated town square (51-townview.js) is in front, 'panel' = one of its four places is open.
   Without a real canvas (headless tests) the scene is skipped and the town is the panel alone, as before. */
let townNote='',townSel={contracts:0,tavern:0,market:'food',temple:0,tailor:0},townAt='panel';
const TOWNTABS=[['contracts','Contracts'],['tavern','Tavern'],['market','Market'],['tailor','Tailor'],['inn','Inn'],['temple','Temple']];
const TOOLLOT=10;   // tools are sold by the lot
function toolPrice(n){return Math.max(1,Math.round((typeof TOOLPRICE==='number'&&TOOLPRICE>0?TOOLPRICE:3)*(n||TOOLLOT)))}
function townGo(k){townTab=k;renderTown()}
function townPick(k){townSel[townTab]=k;renderTown(townNote)}
function leaveTown(){if(typeof tvHide==='function')tvHide();townAt='panel';if(!closePanel()&&typeof closeSheet==='function')closeSheet()}
function townBack(){if(typeof tvCan==='function'&&tvCan()){townAt='scene';renderTown();if(townAt==='scene')return}leaveTown()}
function compass(dx,dy){return['east','south-east','south','south-west','west','north-west','north','north-east'][((Math.round(Math.atan2(dy,dx)/(Math.PI/4))%8)+8)%8]}
function leagues(a,b){return Math.max(1,Math.round(Math.hypot(a.x-b.x,a.y-b.y)/TS))}
/* ---- pixel helpers for the town panel (art's pxIcon / company's portraitHTML, with fallbacks until they exist) ---- */
function twIcon(n,sz,fb){if(typeof pxIcon==='function'){try{if(typeof iconRows!=='function'||iconRows(n))return pxIcon(n,sz||16);if(PNOWN[n])return pnIcon(n,'',sz||16);return pxIcon(n,sz||16)}catch(e){}}return fb?pnIcon(fb):''}
function twItemIcon(id,sz){const it=ITEMS[id];if(typeof pxIcon!=='function'||!it||pnHasPx(itemIconName(id)))return pnItemIcon(id,sz||32);let h;if(it.k==='h')h=twIcon('helmet',sz||32);else h=pxIcon(it.k==='s'?'shield':it.k==='a'?(it.arm<=60?'armor-light':it.arm<=150?'armor-medium':'armor-heavy'):it.wt||'sword',sz||32);return pnFamedWrap(id,h)}
function twPortrait(m,sz){if(typeof portraitHTML==='function'){try{const h=portraitHTML(m,sz||32);if(h)return`<span class="tw-por">${h}</span>`}catch(e){}}const r=tlRes(m);return`<span class="tw-por none" style="width:${sz||32}px;height:${sz||32}px"><span class="pn-pip${r?' g-'+r:''}"></span></span>`}
function twSkulls(n,of){if(typeof pxIcon!=='function')return pnSkulls(n,of);let h='';for(let i=0;i<(of||n);i++)h+=`<span class="${i<n?'':'off'}">${pxIcon('skull',16)}</span>`;return`<span class="tw-skulls" aria-label="Danger ${n} of ${of||n}">${h}</span>`}
function twStat(ic,v,fb){return`<span class="tw-s">${twIcon(ic,16)}${fb&&typeof pxIcon!=='function'?fb+' ':''}${v}</span>`}
function twItemStats(id){const i=ITEMS[id];return(i&&i.famed?'<span class="tw-t fmd-tag">Famed</span>':'')+(typeof pxIcon==='function'?twItemStats0(id):itemDesc(id))}
function twItemStats0(id){const i=ITEMS[id];
 if(i.k==='w')return twStat(i.rng>2?'ranged':'melee',`${i.d[0]}–${i.d[1]}`)+twStat('ap',i.ap)+`<span class="tw-t">${i.two?'2H':'1H'}</span>`+(i.rng>1?`<span class="tw-t">reach ${i.rng}</span>`:'')+(i.spell?`<span class="tw-t">+${Math.round(i.spell*100)}% spell</span>`:'');
 if(i.k==='s')return twStat('mdef','+'+i.md)+twStat('rdef','+'+i.rd)+twStat('fatigue','−'+i.fat);if(i.k==='h')return twStat('helmet',i.arm)+twStat('fatigue','−'+(i.fat||0))+'<span class="tw-t">head</span>';return twStat('armor',i.arm)+twStat('fatigue','−'+i.fat)}
/* faction emblems: a heater shield in the faction's colours with its mark (16x16, drawn here) */
const TWSHIELD=['................','.00000000000000.','.0++++++++++++0.','.0+##########-0.','.0+##########-0.','.0+##########-0.','.0+##########-0.','.0+##########-0.','.0+##########-0.','.0+##########-0.','.0+#########--0.','..0+########-0..','..0+#######--0..','...0+#####--0...','....00----00....','......0000......'];
const TWMARK={
 gob:{f:'bca',m:['A......A','AA.AA.AA','.AAAAAA.','.AyAAyA.','.AAAAAA.','..A00A..','...AA...','........']},
 undead:{f:'341',m:['.llllll.','llllllll','l00ll00l','l00ll00l','lll00lll','.llllll.','.l0ll0l.','........']},
 beast:{f:'jki',m:['..l..l..','.ll..ll.','.ll..ll.','........','..llll..','.llllll.','.llllll.','..l..l..']},
 orc:{f:'753',m:['qq.kk.qq','qqqkkqqq','qpqkkqpq','qq.kk.qq','...kk...','...kk...','...kk...','...jj...']},
 bandit:{f:'ghf',m:['...qq...','...qq...','...qp...','...qp...','.cccccc.','...jj...','...jj...','...cc...']},
 void:{f:'DCG',m:['...ee...','..eCCe..','.eCxxCe.','eCx00xCe','.eCxxCe.','..eCCe..','...ee...','........']},
 serpent:{f:'wv3',m:['..yyyy0g','.yy.....','.yy.....','..yyyy..','.....yy.','.....yy.','.yyyyy..','yy......']},
 ent:{f:'ija',m:['..AAAA..','.AABAAA.','AABAABAA','.AAAAAA.','...kk...','...kk...','..kkkk..','.k.kk.k.']},
 ogre:{f:'nmo',m:['..tttt..','.tttttt.','t00tt00t','tttttttt','ttuuuutt','tlu..ult','.tuuuut.','..tttt..']},
 wyvern:{f:'fga',m:['d......d','dd....dd','ddd..ddd','.dddddd.','..dccd..','...dd...','...cd...','..d..c..']}};
const TWCARGO=['................','................','..000000000000..','.0kkkkkckkkkkk0.','.0kjjjjbjjjjji0.','.0kjjjjbjjjjji0.','.0cbbbghgbbbbb0.','.0kjjjgggjjjji0.','.0kjjjfgfjjjji0.','.0kjjjjbjjjjji0.','.0kjjjjbjjjjji0.','.0jiiiibiiiiii0.','..000000000000..','................','................','................'];
function twEmblemRows(c){if(c.type!=='hunt'||!TWMARK[c.f])return TWCARGO;const M=TWMARK[c.f];return TWSHIELD.map((r,y)=>{let o='';for(let x=0;x<16;x++){const k=r[x],mk=y>=3&&y<11&&x>=4&&x<12?M.m[y-3][x-4]:'.';o+=mk!=='.'?mk:k==='#'?M.f[0]:k==='+'?M.f[1]:k==='-'?M.f[2]:k}return o})}
function twEmblem(c,sz){const key=c.type==='hunt'?c.f:'cargo',u=typeof pxURL==='function'?pxURL('twem-'+key,twEmblemRows(c),1):'';
 if(!u)return pnIcon(c.type==='deliver'?'contracts':'skull');return`<i class="tw-em" style="width:${sz||32}px;height:${sz||32}px;background-image:url(${u})" aria-hidden="true"></i>`}
function twHead(icon,kick,title){return`<div class="tw-head">${icon?`<span class="tw-hi">${icon}</span>`:''}<div><div class="pn-kick">${kick}</div><div class="pn-h">${title}</div></div></div>`}

function giftRow(m){const r=tlRes(m),g=tlGift(m),st=g&&MAST[g].style;return`<div class="pn-gifts">${RESK.map(k=>`<span class="pn-gift g-${k}${k===r?' on':''}">${typeof pxIcon==='function'?pxIcon(k,16):'<i></i>'}${RESN[k]}</span>`).join('')}</div><p class="pn-p dim">${r?`Carries the gift of ${RESN[r]}${st&&TL_STYN[st]?', shaped to a '+TL_STYN[st].toLowerCase()+' hand':''}: <b class="tw-gv g-${r}">${tlGiftLabel(g)}</b>. The first perk learned in it awakens the gift.`:'No gift stirs here. This one fights with steel alone.'}</p>`}
/* the recruit's trees, one line each: style trees with their theme, the gift variant, then the weapon families from level 3 */
function twTreeList(m){const T=tlTrees(m),wl=tlTierLv('weapon',1),abN=x=>[].concat(...tlTiers(x.tree)).filter(p=>p&&p.ab&&AB[p.ab]).map(p=>AB[p.ab].n||p.n);
 let h=T.filter(x=>x.kind!=='weapon'&&x.kind!=='armor').map(x=>{const r=tlGiftRes(x.key),ab=abN(x);return`<div class="pn-mast tw-mast${r?' g-'+r:''}" data-tree="${x.key}">${twIcon(tlTreeIcon(x.key),32)}<b>${x.kind==='gift'?tlGiftLabel(x.key):x.tree.n}</b><span>${x.tree.d||''}</span>${ab.length?`<small>${ab.slice(0,3).join(', ')}${ab.length>3?'…':''}</small>`:''}</div>`}).join('');
 const W=T.filter(x=>x.kind==='weapon');
 h+=W.length?`<div class="tw-wts">${W.map(x=>`<span class="tw-wt" title="${x.tree.n}${x.tree.d?': '+x.tree.d:''}">${twIcon(tlTreeIcon(x.key),16)}${TL_WTN[x.tree.wt]||x.tree.n}</span>`).join('')}<small>weapon trees, from level ${wl}</small></div>`
  :`<p class="pn-p dim">No weapon trees${(tlWtAllowed(m).length?'':' for this background')}.</p>`;
 const A=T.filter(x=>x.kind==='armor');if(A.length)h+=`<div class="tw-wts tw-ats">${A.map(x=>{const ac=tlTreeArm(x.key);return`<span class="tw-wt" title="${x.tree.n}${x.tree.d?': '+x.tree.d:''}">${twIcon(tlTreeIcon(x.key),16)}${ac?TL_ARMN[ac]:x.tree.n}</span>`}).join('')}<small>armor trees, from level ${tlTierLv('armor',1)}, each only in its class</small></div>`;
 const no=(RACE[m.race]&&RACE[m.race].noWt)||[],lost=no.filter(w=>(BG[m.bg].wt||[]).includes(w));if(lost.length)h+=`<p class="pn-p dim">A ${RACE[m.race].n.toLowerCase()} never learns the ${lost.map(w=>(TL_WTN[w]||w).toLowerCase()).join(' or ')} tree.</p>`;
 return h}
function gearRows(m){return[['w','Weapon']].concat(m.eq&&m.eq.b?[['b','Backup']]:[],[['s','Shield'],['a','Armor'],['h','Helmet']]).map(([k,n])=>{const id=m.eq[k];return`<div class="pn-gear${id?'':' none'}">${id?twItemIcon(id,32):twIcon(k==='w'?'fist':k==='s'?'shield':k==='h'?'helmet':'armor-light',32,k==='w'?'sword':k==='s'?'shield':'armor')}<span class="pn-rmain"><span class="pn-rt">${id?pnItemName(id):k==='w'?'Unarmed':'No '+n.toLowerCase()}</span>${id?`<span class="pn-rs tw-line">${twItemStats(id)}</span>`:''}</span><span class="pn-slot">${n}</span></div>`}).join('')}
function statGrid(m,s){const c=(ic,v,n)=>`<div><b>${v}</b>${twIcon(ic,16)}<span>${n}</span></div>`;
 return`<div class="pn-stats tw-stats${typeof s.brv==='number'?' five':''}">${c('hp',m.hp<s.hp?m.hp+'<small>/'+s.hp+'</small>':s.hp,'HP')}${c('armor',s.arm,'Armor')}${c('fatigue',s.fat,'Fatigue')}${c('init',s.init,'Init')}${c('melee',s.ms,'Melee')}${c('ranged',s.rs,'Ranged')}${c('mdef',s.md,'M def')}${c('rdef',s.rd,'R def')}${typeof s.helm==='number'?c('helmet',s.helm,'Helmet'):''}${typeof s.brv==='number'?c('resolve',s.brv,'Resolve'):''}</div>`}
function marketCompare(id){const k=ITEMS[id].k;return G.roster.map(m=>{const cur=m.eq[k],w=ITEMS[m.eq.w];let x='';
  if(k==='s'&&!tlEquipRule(m,'s',id).ok)x='<span class="pn-d same">Hands full</span>';else{x=pnDeltaChips(id,cur);if(k==='w'&&id!==cur&&tlDropsShield(m,'w',id))x+='<span class="pn-d same">drops shield</span>';if(k==='s'&&tlSlung(m))x+='<span class="pn-d same">slung</span>'}
  return`<div class="pn-cmp${m.field?'':' res'}">${twPortrait(m,32)}<span class="pn-cn"><b>${htmlEsc(m.name)}</b><small>${cur?pnItemName(cur):k==='w'?'Unarmed':'None'}</small></span><span class="pn-cd">${x}</span></div>`}).join('')}
function itemDetail(id){const it=ITEMS[id];return`${twHead(twItemIcon(id,48),itemKind(id)+(it.tier?' · tier '+it.tier:''),pnItemName(id,1))}${pnFamedBlock(id)}${pnFacts(pnFamedFacts(id))}${pnHead('Against what the company carries')}<div class="pn-cmps">${marketCompare(id)}</div>`}
function twRecruitLine(m){const b=BG[m.bg];return`${m.eq.w?twItemIcon(m.eq.w,16):twIcon('fist',16)}${m.eq.b?twItemIcon(m.eq.b,16):''}${m.eq.s?twItemIcon(m.eq.s,16):''}${m.eq.a?twItemIcon(m.eq.a,16):''}<span class="tw-t0">${RACE[m.race].n} ${b.n.toLowerCase()}</span>`}
/* the recruit's build at a glance: style trees, the gift in its colour with its variant, the weapon families */
function twRecruitTrees(m){const g=tlGift(m);return`${typeof coTreeStrip==='function'?coTreeStrip(m):''}${g?`<span class="tw-gv g-${tlGiftRes(g)}">${MAST[g].n}</span>`:''}`}
function townView(t){let list='',detail='',foot='',key=townTab;
 if(townTab==='contracts'){const n=t.contracts.length,i=clamp(+townSel.contracts||0,0,n-1);townSel.contracts=i;key+=':'+i;
  if(G.contract)list+=`<div class="pn-hint tw-hint">${twEmblem(G.contract,32)}<span><b>Contract in hand</b>${G.contract.title}</span></div>`;
  list+=pnSec('Notice board',n);
  if(!n){list+=pnEmpty('No work posted.');detail=`<div class="pn-blank">${twIcon('board',48,'contracts')}<p>${G.contract?'You already hold a contract. Finish or abandon it before taking another.':'No work posted. New notices go up every three days.'}</p></div>`}
  t.contracts.forEach((c,j)=>{list+=pnRow({on:`townPick(${j})`,sel:j===i,cls:'wrap tw-row',lead:twEmblem(c,32),title:c.title,sub:c.type==='deliver'?'Delivery':'Hunt, '+FACT[c.f].n.toLowerCase(),right:pnCoin(c.pay)+twSkulls(c.diff,3)})});
  if(n){const c=t.contracts[i],hunt=c.type==='hunt',o=hunt?c:G.towns[c.to];
   detail=`${twHead(twEmblem(c,48),hunt?'Hunt':'Delivery',c.title)}
   <p class="pn-p">${hunt?`The lair lies about ${leagues(o,t)} leagues ${compass(o.x-t.x,o.y-t.y)} of ${t.name}. Once you take the work it is marked on the map with a red skull. Come back to ${t.name} for your pay.`:`Carry the sealed cargo to ${o.name}, about ${leagues(o,t)} leagues to the ${compass(o.x-t.x,o.y-t.y)}. You are paid on arrival.`}</p>
   ${pnFacts([hunt?['Foe',FACT[c.f].n]:['Bound for',o.name],['Danger',twSkulls(c.diff,3)+' '+['Light','Serious','Grave'][c.diff-1]],['Pay',twIcon('coin',16)+c.pay+' crowns'],['Renown',twIcon('renown',16)+'+'+8*c.diff]])}
   ${G.contract?'<p class="pn-p warn">You already hold a contract. Finish or abandon it before taking another.</p>':''}`;
   foot=`<span class="pn-fl">${pnCoin(c.pay,'big')}<small>crowns on completion</small></span><button type="button" class="pn-btn pri" ${G.contract?'disabled':''} onclick="acceptContract(${i})">Accept contract</button>`}}
 else if(townTab==='tavern'){const n=t.recruits.length,i=clamp(+townSel.tavern||0,0,n-1),full=G.roster.length>=MAXROSTER;townSel.tavern=i;key+=':'+i;
  list+=pnSec('Looking for work',`Roster ${G.roster.length} of ${MAXROSTER}`);
  if(!n){list+=pnEmpty('Nobody is looking for work today.');detail=`<div class="pn-blank">${twIcon('tavern',48,'tavern')}<p>Nobody is looking for work today. New faces drift in every three days.</p></div>`}
  t.recruits.forEach((m,j)=>{const b=BG[m.bg];list+=pnRow({on:`townPick(${j})`,sel:j===i,cls:'tw-row',lead:twPortrait(m,32),title:htmlEsc(m.name),sub:`<span class="tw-line">${twRecruitLine(m)}</span><span class="tw-line co-trees tw-trees">${twRecruitTrees(m)}</span>`,right:pnCoin(b.cost,G.crowns<b.cost?'short':'')})});
  if(n){const m=t.recruits[i],b=BG[m.bg],s=calc(m);
   detail=`${twHead(twPortrait(m,64),`${RACE[m.race].n} ${b.n.toLowerCase()}, level ${m.lvl}`,htmlEsc(m.name))}${statGrid(m,s)}
   ${pnHead('The four gifts')}${giftRow(m)}
   ${pnHead('Trees')}${twTreeList(m)}
   ${pnHead('Starting gear')}<div class="pn-gears">${gearRows(m)}</div>`;
   foot=`<span class="pn-fl">${pnCoin(b.cost,'big'+(G.crowns<b.cost?' short':''))}<small>${full?'<em>The roster is full</em>':G.crowns<b.cost?'<em>Not enough crowns</em>':'+ '+b.wage+' a day'}</small></span><button type="button" class="pn-btn pri${full||G.crowns<b.cost?' off':''}" onclick="hire(${i})">Hire</button>`}}
 else if(townTab==='market'){const v=marketView(t);list=v.list;detail=v.detail;foot=v.foot;key+=':'+v.key}
 else if(townTab==='tailor'&&typeof tailorView==='function'){const v=tailorView(t);list=v.list;detail=v.detail;foot=v.foot;key=v.key}
 else if(townTab==='temple'){const L=[];G.roster.forEach((m,mi)=>cpInj(m).forEach(j=>L.push({m,mi,j,cost:cpInjCost(m,j.id)})));const n=L.length,i=clamp(+townSel.temple||0,0,n-1);townSel.temple=i;key+=':'+i+':'+n;
  list+=pnSec('The injured',n?n+' wound'+(n===1?'':'s'):'None');
  if(!n){list+=pnEmpty('Nobody in the company carries a wound.');
   detail=`${twHead(twIcon('temple',48,'inn'),'Temple','The healers’ hall')}<p class="pn-p">The priests set bones, draw fevers and stitch what the field surgeon only bound. A wound they treat is gone the same hour.</p><p class="pn-p dim">Injuries come from heavy blows and from being struck down. Left alone, most heal in days and weaken the sword who carries them until then. Some never heal, and those no temple can mend.</p>`}
  L.forEach((x,k)=>{list+=pnRow({on:`townPick(${k})`,sel:k===i,cls:'tw-row tw-inj'+(x.j.perm?' perm':''),lead:twPortrait(x.m,32),title:`${htmlEsc(x.m.name)}: ${x.j.n}`,sub:`<span class="tw-line">${cpInjIcon(x.j.id)}<span class="tw-t0">${x.j.d}</span></span>`,right:x.cost==null?'<span class="tw-t perm">For good</span>':pnCoin(x.cost,G.crowns<x.cost?'short':'')+`<small class="tw-days">${x.j.days} day${x.j.days===1?'':'s'}</small>`})});
  if(n){const x=L[i],j=x.j,m=x.m;
   detail=`${twHead(cpInjIcon(j.id,48),htmlEsc(m.name)+', '+(m.field?'fielded':'in reserve'),j.n)}${j.lore?`<p class="pn-p">${j.lore}</p>`:''}
   ${pnFacts([['Effect',`<span class="tw-bad">${j.d}</span>`],['Heals by itself',j.perm?'Never':'In '+j.days+' day'+(j.days===1?'':'s')],['Treatment',x.cost==null?'Beyond the healers':twIcon('coin',16)+x.cost+' crowns']])}
   ${x.cost==null?'<p class="pn-p warn">This one is for good. The priests can ease it, not undo it.</p>':`<p class="pn-p dim">Treated now, ${htmlEsc(m.name)} fights at full strength again today.</p>`}`;
   foot=x.cost==null?`<span class="pn-fl"><small>Cannot be treated</small></span><button type="button" class="pn-btn pri" disabled>Treat</button>`
    :`<span class="pn-fl">${pnCoin(x.cost,'big'+(G.crowns<x.cost?' short':''))}<small>${G.crowns<x.cost?'<em>Not enough crowns</em>':'to treat '+j.n.toLowerCase()}</small></span><button type="button" class="pn-btn pri${G.crowns<x.cost?' off':''}" id="twTreat" onclick="templeTreat(${x.mi},'${j.id}')">Treat</button>`}}
 else{const cost=G.roster.length*10;let hurt=0;const need=cpDamageAll(),needT=Math.ceil(need/cpToolPts()),have=cpTools(),inj=cpInjured().length;list+=pnSec('The company',G.roster.length);
  G.roster.forEach(m=>{const mx=calc(m).hp,h=Math.min(m.hp,mx),d=cpDamage(m),c=cpCond(m);if(h<mx)hurt++;list+=`<div class="pn-row static tw-row"><span class="pn-lead">${twPortrait(m,32)}</span><span class="pn-rmain"><span class="pn-rt">${htmlEsc(m.name)}</span><span class="tw-bar${h<mx?' hurt':''}"><i style="width:${Math.round(100*h/mx)}%"></i></span></span><span class="pn-rr"><span class="pn-hp tw-hp${h<mx?' hurt':''}">${twIcon('hp',16)}${h}<small>/${mx}</small></span>${d?`<span class="pn-hp tw-hp worn" title="Armor and helmet points left">${twIcon('armor',16)}${c.a+c.h}<small>/${c.aM+c.hM}</small></span>`:''}</span></div>`});
  detail=`${twHead(twIcon('inn',48,'inn'),'Inn','A bed for the night')}<p class="pn-p">A night under a roof heals every wound of the flesh, and the company’s tools go to work on its armor.</p>
  ${pnFacts([['Wounded',twIcon('hp',16)+(hurt?hurt+' of '+G.roster.length:'None')],['Armor to mend',need?twIcon('tools',16)+`${need} points, ${needT} tool${needT===1?'':'s'} <small>(${have} carried)</small>`:twIcon('armor',16)+'None'],['Beds',twIcon('coin',16)+G.roster.length+' at 10 crowns'],['Time',twIcon('day',16)+'8 hours']])}
  ${need&&have<needT?`<p class="pn-p warn">Not enough tools to mend everything. The market sells them.</p>`:''}${inj?`<p class="pn-p dim">${inj===1?'One sword carries':inj+' swords carry'} an injury that sleep will not cure. The temple treats those.</p>`:''}
  ${pnHead('Common-room talk')}<p class="pn-p dim">${G.crisis?(G.crisis.ended?'Travelers say new rifts still open now and then.':`Rifts closed: ${G.crisis.closed} of ${G.crisis.total}.`):`The innkeeper’s seer mutters about a sundering sky, perhaps ${Math.max(1,G.crisisDay-G.day)} days off.`}</p>`;
  foot=`<span class="pn-fl">${pnCoin(cost,'big'+(G.crowns<cost?' short':''))}<small>${G.crowns<cost?'<em>Not enough crowns</em>':'for the whole company'}</small></span><button type="button" class="pn-btn pri${G.crowns<cost?' off':''}" onclick="innRest()">Rest the night</button>`}
 return{list,detail,foot,key}}
/* ---- market: two tabs. Purchase = the town's stock plus provisions and tools; Inventory = everything the company carries:
   spare pieces in the stash (sold from here) and what each sword wears (read-only here; taken off in the company screen).
   townSel.market keeps the selection: 'food' | 'tools' | 'b<stock i>' (Purchase), 's<stash i>' | 'e<roster i>.<slot>' | 'inv' (Inventory). ---- */
const MK_SLOTS=[['w','Weapon'],['b','Backup'],['s','Shield'],['a','Armor'],['h','Helmet']];
function mkWorn(){const L=[];G.roster.forEach((m,mi)=>{for(const [k,n] of MK_SLOTS){const id=m.eq&&m.eq[k];if(id&&ITEMS[id])L.push({m,mi,k,n,id})}});return L}
function mkTabOf(sel){sel=String(sel==null?townSel.market||'food':sel);return sel[0]==='s'||sel[0]==='e'||sel==='inv'?'inv':'buy'}
function mkTab(k){if(k===mkTabOf())return;if(k==='inv'){const W=mkWorn();townSel.market=G.stash.length?'s0':W.length?'e'+W[0].mi+'.'+W[0].k:'inv'}else townSel.market='food';renderTown(townNote)}
function mkTabs(cur,nBuy,nInv){const b=(k,n,ic,c)=>`<button type="button" role="tab" class="mk-tab${cur===k?' on':''}" id="mkTab-${k}" aria-selected="${cur===k}" onclick="mkTab('${k}')">${twIcon(ic,16)}<span>${n}</span><i>${c}</i></button>`;
 return`<div class="mk-tabs" role="tablist" aria-label="Market">${b('buy','Purchase','coin',nBuy)}${b('inv','Inventory','armor',nInv)}</div>`}
function mkGear(mi,k){if(typeof slotSheet==='function'&&G.roster[mi])slotSheet(mi,k)}
function marketView(t){let list='',detail='',foot='';const W=mkWorn();let sel=String(townSel.market||'food'),kind=sel[0],i=+sel.slice(1),wi=-1;
 if(sel==='inv')kind='n';
 else if(kind==='b'){i=Math.min(i,t.stock.length-1);if(!(i>=0))kind='f'}
 else if(kind==='s'){i=Math.min(i,G.stash.length-1);if(!(i>=0))kind=W.length?'e':'n';if(kind==='e')wi=0}
 else if(kind==='e'){const p=sel.slice(1).split('.');wi=W.findIndex(x=>x.mi===+p[0]&&x.k===p[1]);if(wi<0)wi=W.length?Math.min(W.length-1,Math.max(0,W.findIndex(x=>x.mi>=+p[0]))):-1;if(wi<0)kind=G.stash.length?'s':'n';if(kind==='s')i=0}
 else if(kind!=='t')kind='f';
 sel=townSel.market=kind==='f'?'food':kind==='t'?'tools':kind==='n'?'inv':kind==='e'?'e'+W[wi].mi+'.'+W[wi].k:kind+i;
 const tab=mkTabOf(sel);list+=mkTabs(tab,t.stock.length,G.stash.length+W.length);
 if(tab==='buy'){const need=cpDamageAll(),needT=Math.ceil(need/cpToolPts()),tp=toolPrice();
  list+=pnSec('Provisions and tools',2);
  list+=pnRow({on:`townPick('food')`,sel:kind==='f',cls:'tw-row',lead:twIcon('food',32,'food'),title:'Provisions',sub:'10 days for one man',right:pnCoin(30,G.crowns<30?'short':'')});
  list+=pnRow({on:`townPick('tools')`,sel:kind==='t',cls:'tw-row',lead:twIcon('tools',32,'armor'),title:'Tools',sub:`Each mends ${cpToolPts()} armor`+(needT>cpTools()?` <span class="tw-t warn">need ${needT}</span>`:''),right:pnCoin(tp,G.crowns<tp?'short':'')});
  list+=pnSec('For sale',t.stock.length);if(!t.stock.length)list+=pnEmpty('The stalls are bare. Fresh goods arrive every three days.');
  t.stock.forEach((id,j)=>{const it=ITEMS[id];list+=pnRow({on:`townPick('b${j}')`,sel:kind==='b'&&j===i,cls:'tw-row',lead:twItemIcon(id,32),title:pnItemName(id),sub:`<span class="tw-line">${it.tier?`<span class="pn-tier t${it.tier}" title="Tier ${it.tier}">${TIERN[it.tier]}</span>`:''}${twItemStats(id)}</span>`,right:pnCoin(it.price,G.crowns<it.price?'short':'')})});
  if(kind==='f'){const men=G.roster.length;detail=`${twHead(twIcon('food',48,'food'),'Provisions','Salt pork and hard bread')}<p class="pn-p">10 days for one man. Every sword eats one ration a day, and a starving company bleeds.</p>${pnFacts([['In the wagons',twIcon('food',16)+G.food+' rations'],['Mouths to feed',twIcon('swords',16)+men],['Lasts the company',twIcon('day',16)+Math.floor(G.food/Math.max(1,men))+' days']])}`;
   foot=`<span class="pn-fl">${pnCoin(30,'big'+(G.crowns<30?' short':''))}<small>${G.crowns<30?'<em>Not enough crowns</em>':'for 10 rations'}</small></span><button type="button" class="pn-btn pri${G.crowns<30?' off':''}" onclick="buyFood()">Buy for 30</button>`}
  else if(kind==='t'){const have=cpTools(),more=Math.max(0,needT-have),mp=toolPrice(more);
   detail=`${twHead(twIcon('tools',48,'armor'),'Hammers, rivets and rings','Repair tools')}<p class="pn-p">Armor and helmets do not mend themselves. One tool puts back <b>${cpToolPts()} points</b> on a body armor or a helmet whenever the company makes camp or rests at an inn. The fielded and the worst damaged go first.</p>
   ${pnFacts([['In the wagons',twIcon('tools',16)+have+' tool'+(have===1?'':'s')],['Armor to mend',twIcon('armor',16)+(need?need+' points':'None')],['Tools that takes',need?twIcon('tools',16)+needT+(more?` <small>(${more} short)</small>`:''):'None'],['Price',twIcon('coin',16)+toolPrice(1)+' crown'+(toolPrice(1)===1?'':'s')+' a tool']])}
   ${need?`<p class="pn-p ${more?'warn':'dim'}">${more?`You are ${more} tool${more===1?'':'s'} short of mending everything.`:'You carry enough to mend everything at the next camp.'}</p>`:'<p class="pn-p dim">Nothing needs mending right now. A spare lot costs little and weighs less.</p>'}`;
   foot=`<span class="pn-fl">${pnCoin(tp,'big'+(G.crowns<tp?' short':''))}<small>${G.crowns<tp?'<em>Not enough crowns</em>':'for '+TOOLLOT+' tools'}</small></span>${more&&more!==TOOLLOT?`<button type="button" class="pn-btn${G.crowns<mp?' off':''}" id="twToolsNeed" onclick="buyTools(${more})">Buy ${more} for ${mp}</button>`:''}<button type="button" class="pn-btn pri${G.crowns<tp?' off':''}" id="twTools" onclick="buyTools()">Buy ${TOOLLOT} for ${tp}</button>`}
  else{const id=t.stock[i],it=ITEMS[id],own=G.stash.filter(x=>x===id).length;detail=itemDetail(id);
   foot=`<span class="pn-fl">${pnCoin(it.price,'big'+(G.crowns<it.price?' short':''))}<small>${G.crowns<it.price?'<em>Not enough crowns</em>':own?own+' in the stash':'to the stash'}</small></span><button type="button" class="pn-btn pri${G.crowns<it.price?' off':''}" onclick="buyItem(${i})">Buy for ${it.price}</button>`}}
 else{let worth=0;G.stash.forEach(id=>worth+=sellPrice(id));
  list+=`<div class="mk-sum"><span title="Every piece the company carries">${twIcon('armor',16)}<b>${G.stash.length+W.length}</b> carried</span><span title="Spare pieces in the stash">${twIcon('stash',16,'armor')}<b>${G.stash.length}</b> spare</span><span title="Worn or held by a sword">${twIcon('swords',16)}<b>${W.length}</b> equipped</span></div>`;
  list+=pnSec('Spare in the stash',G.stash.length?`${G.stash.length} · sells for ${worth}`:0);if(!G.stash.length)list+=pnEmpty('Nothing spare. Loot from battles lands here.');
  G.stash.forEach((id,j)=>{const it=ITEMS[id];list+=pnRow({on:`townPick('s${j}')`,sel:kind==='s'&&j===i,cls:'own tw-row mk-spare'+(it.famed?' fmd-row':''),lead:twItemIcon(id,32),title:pnItemName(id),sub:`<span class="tw-line"><span class="mk-tag spare">Spare</span>${twItemStats(id)}</span>`,right:pnCoin(sellPrice(id),'sell')})});
  list+=pnSec('Equipped',W.length);if(!W.length)list+=pnEmpty('Nobody wears anything. Equip gear in the company screen.');
  W.forEach((x,j)=>{const it=ITEMS[x.id];list+=pnRow({on:`townPick('e${x.mi}.${x.k}')`,sel:kind==='e'&&j===wi,cls:'tw-row mk-worn'+(it.famed?' fmd-row':''),lead:twItemIcon(x.id,32),title:pnItemName(x.id),sub:`<span class="tw-line"><span class="mk-tag eq">${x.n}</span><span class="tw-t0">${htmlEsc(x.m.name)}</span></span>`,right:`<span class="mk-who">${twPortrait(x.m,16)}</span>`})});
  if(kind==='n'){detail=`<div class="pn-blank">${twIcon('armor',48,'armor')}<p>The company carries nothing at all. Buy gear on the Purchase tab or take it from the fallen.</p></div>`}
  else if(kind==='s'){const id=G.stash[i],it=ITEMS[id];detail=`<div class="mk-state spare">${twIcon('stash',16,'armor')}<b>Spare</b><span>in the stash, not worn by anyone</span></div>`+itemDetail(id);
   foot=`<span class="pn-fl">${pnCoin(sellPrice(id),'big')}<small>${it.famed?'a famed piece: the dealers pay well':'worth '+it.price+' new'}</small></span><button type="button" class="pn-btn${it.famed?' warn':''}" onclick="sellItem(${i})">Sell for ${sellPrice(id)}</button>`}
  else{const x=W[wi],it=ITEMS[x.id],nm=htmlEsc(x.m.name);detail=`<div class="mk-state eq">${twIcon('swords',16)}<b>Equipped</b><span>${nm}, ${x.n.toLowerCase()} slot</span></div>`+itemDetail(x.id)+`<p class="pn-p dim">Worn gear is not for sale. Take it off in the company screen and it goes to the stash, where it can be sold for ${sellPrice(x.id)}.</p>`;
   foot=`<span class="pn-fl">${pnCoin(sellPrice(x.id),'big')}<small>once taken off</small></span><button type="button" class="pn-btn" onclick="mkGear(${x.mi},'${x.k}')">${pnIcon('company')}<span>${nm}’s gear</span></button>`}}
 return{list,detail,foot,key:sel}}
function renderTown(note){G.townOpen=true;townNote=note||'';
 if(townAt==='scene'){if(typeof tvShow==='function'&&tvShow(note))return;townAt='panel'}
 const t=G.towns[G.town],v=townView(t),ready=G.roster.filter(m=>m.pend||m.pp).length,sq=typeof tvCan==='function'&&tvCan();
 showPanel({id:'town',title:t.name,sub:`Day ${G.day}`,meta:pnPurse()+`<button type="button" class="pn-btn ico pn-cobtn" aria-label="Company${ready?', '+ready+' ready to advance':''}" title="Company" onclick="companySheet()">${pnIcon('company','',32)}${ready?`<i>${ready}</i>`:''}</button>`,note:townNote,closeLabel:sq?'Town square':'Leave town',closeIcon:sq?'back':'x',onClose:sq?townBack:leaveTown,
  tabs:TOWNTABS.map(([k,n])=>({k,n,badge:k==='temple'?cpInjured().length||'':''})),tab:townTab,onTab:townGo,
  list:v.list,listKey:'town:'+townTab+(townTab==='market'?':'+mkTabOf():''),detail:v.detail,detailKey:'town:'+v.key,foot:v.foot})}
function acceptContract(i){const t=G.towns[G.town];if(G.contract)return;G.contract=Object.assign({town:G.town,done:false},t.contracts.splice(i,1)[0]);toast('Contract accepted');renderTown();save()}
function hire(i){const t=G.towns[G.town],m=t.recruits[i],c=BG[m.bg].cost;if(G.roster.length>=MAXROSTER){toast('The roster is full');return}if(G.crowns<c){toast('Not enough crowns');return}
 G.crowns-=c;t.recruits.splice(i,1);m.field=G.roster.filter(x=>x.field).length<MAXFIELD;G.roster.push(m);toast(m.name+' joins the company');renderTown();save()}
function buyFood(){if(G.crowns<30){toast('Not enough crowns');return}G.crowns-=30;G.food+=10;renderTown()}
function buyItem(i){const t=G.towns[G.town],id=t.stock[i];if(G.crowns<ITEMS[id].price){toast('Not enough crowns');return}G.crowns-=ITEMS[id].price;G.stash.push(id);t.stock.splice(i,1);renderTown()}
/* tools: a company stock like food. n defaults to one lot. */
function buyTools(n){n=Math.max(1,Math.round(+n||TOOLLOT));const c=toolPrice(n);if(G.crowns<c){toast('Not enough crowns');return false}G.crowns-=c;G.tools=cpTools()+n;renderTown();return true}
/* temple: treat injury id of roster[i] for crowns */
function templeTreat(i,id){const m=G.roster[i];if(!m)return false;const j=cpInj(m).find(x=>x.id===id);if(!j)return false;const r=cpTreat(m,id);if(!r.ok){toast(r.why);return false}
 toast(`${m.name}: ${j.n.toLowerCase()} treated`);renderTown(`<p class="good">The healers see to ${htmlEsc(m.name)}. ${j.n} is mended for ${r.cost} crowns.</p>`);save();return true}
function sellItem(i){const id=G.stash.splice(i,1)[0];if(!id)return;G.crowns+=sellPrice(id);renderTown()}
function innRest(){const cost=G.roster.length*10;if(G.crowns<cost){toast('Not enough crowns');return}G.crowns-=cost;G.roster.forEach(m=>m.hp=calc(m).hp);const d0=G.day;advanceTime(8);G.roster.forEach(m=>m.hp=calc(m).hp);const rep=cpRepair(),rt=cpRepairText(rep);let note=rt?`<p class="${rep.pts?'good':'bad'}">${rt}.</p>`:'';
 if(G.day!==d0){let msg='';try{const e=$('toast');msg=e&&typeof e.textContent==='string'?e.textContent:''}catch(e){}   // newDay() only toasts its report; the next toast would replace it
  if(msg.indexOf('Day '+G.day)===0)note=`<p class="${/desert|cannot|starves/.test(msg)?'bad':'dim'}">${msg}.</p>`+note;if(G.note==='crisis')note+='<p class="bad">Something is wrong with the sky. Word of it will meet you at the gate.</p>'}
 toast(rep.pts?`The company is rested. ${rep.pts} armor mended`:'The company is rested');renderTown(note);save();return rep}
function contractSheet(){const c=G.contract;let h='<h2>Contract</h2>';
 if(!c)h+='<p class="dim">You hold no contract. Towns post work on their notice boards.</p>';
 else{const t=G.towns[c.town];h+=`<div class="card"><b>${c.title}</b><p class="dim">${c.type==='deliver'?'Deliver to '+G.towns[c.to].name+'.':c.done?'Done. Return to '+t.name+' for your pay.':'Marked on the map with a red skull. Posted in '+t.name+'.'}</p><span class="coin">${c.pay} crowns</span></div><button class="warn" onclick="G.contract=null;G.renown=Math.max(0,G.renown-5);closeSheet();toast('Contract abandoned')">Abandon contract</button> `}
 sheet(h+'<button onclick="closeSheet()">Close</button>')}
