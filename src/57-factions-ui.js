/* ================= FACTIONS SCREEN (look, phase 7) =================
   factionsSheet(sel): the noble houses, the free towns and the monster hosts. A house shows its banner (46-banner.js), personality,
   seat, the towns it holds (with their situations and prosperity), its wars and friendships with the other houses, your standing
   with it on a -100..100 bar split into the reputation tiers, what that tier does in its towns, and the recent changes.
   Tabs: Houses (list + detail) and Standing (the whole reputation log, newest first). Reached from the company screen's rail.
   Reads the world agent's data and helpers (G.houses, G.rep, G.repLog, G.wars, REPT, REPK, HPERS, repTier, houseRelation,
   houseTowns, townHostile) with typeof fallbacks; the panel shell is 52-panels.js (showPanel). Nothing here touches rnd(). */
const FXUI={tab:'houses',sel:null,back:null,rsel:null};
const FXTIERC={hostile:'g',cold:'X',neutral:'p',friendly:'5',allied:'c'};
function fxuEsc(s){return typeof htmlEsc==='function'?htmlEsc(s):String(s)}
function fxuIc(n,sz,cls){if(typeof pnIcon==='function')return pnIcon(n,cls||'',sz||16);return typeof pxIcon==='function'?pxIcon(n,sz||16):''}
function fxuTiers(){return typeof REPT==='object'&&Array.isArray(REPT)&&REPT.length?REPT:[{k:'hostile',n:'Hostile',min:-100},{k:'cold',n:'Cold',min:-40},{k:'neutral',n:'Neutral',min:-10},{k:'friendly',n:'Friendly',min:15},{k:'allied',n:'Allied',min:50}]}
function fxuFacts(){const L=[];if(G&&Array.isArray(G.houses))for(const h of G.houses)if(h&&h.id)L.push(h.id);if(G&&G.towns&&G.towns.some(t=>t.own==='free')||(G&&G.rep&&typeof G.rep.free==='number'))L.push('free');return L}
function fxuTowns(f){if(typeof houseTowns==='function'&&f!=='free'){try{return houseTowns(f)}catch(e){}}const L=[];if(G&&G.towns)G.towns.forEach((t,i)=>{if(t.own===f)L.push(i)});return L}
function fxuRel(a,b){if(typeof houseRelation==='function'){try{return houseRelation(a,b)}catch(e){}}if(G&&Array.isArray(G.wars)&&G.wars.some(w=>(w.a===a&&w.b===b)||(w.a===b&&w.b===a)))return'war';return'peace'}
const FXRELN={war:'At war',tense:'Tense',peace:'At peace',ally:'Friends'};
/* the standing bar: tier segments from -100 to 100, a pin at the value */
function fxuBar(f,big){const v=clamp(Math.round(lkRep(f)),-100,100),T=fxuTiers(),cur=lkRepTier(f);let seg='';
 for(let i=0;i<T.length;i++){const a=T[i].min,b=i+1<T.length?T[i+1].min:101,w=(b-a)/201*100;seg+=`<i class="t-${T[i].k}${T[i].k===cur.k?' on':''}" style="width:${w.toFixed(2)}%"${big?` title="${fxuEsc(T[i].n)}"`:''}></i>`}
 return`<span class="fx-bar${big?' big':''}" role="img" aria-label="Standing ${v} of 100, ${fxuEsc(cur.n)}">${seg}<b style="left:${((v+100)/200*100).toFixed(2)}%"></b></span>`}
function fxuTierChip(f){const t=lkRepTier(f);return`<span class="fx-tier t-${t.k}">${fxuIc('rep-'+t.k,16)}${fxuEsc(t.n)}</span>`}
function fxuBanner(f,sz){const h=lkHouse(f);if(h&&typeof bannerHTML==='function')return bannerHTML({name:h.n,c1:h.c1,c2:h.c2,emblem:h.emblem},sz||32);
 if(f==='free')return`<i class="fx-free" style="width:${Math.round((sz||32)*.75)}px;height:${sz||32}px">${fxuIc('market',16)}</i>`;return fxuIc('skull',sz||32)}
function fxuPers(h){const P=typeof HPERS==='object'&&HPERS&&h?HPERS[h.pers]:null;return P||null}
/* what the tier does in that faction's towns, in plain words */
function fxuEffects(f){const t=lkRepTier(f),K=typeof REPK==='object'&&REPK?REPK[t.k]:null,L=[];if(!K)return L;const pc=k=>{const p=Math.round((k-1)*100);return(p>0?'+':'')+p+'%'};
 if(K.closed)L.push(['Markets','<span class="fx-bad">Closed to you</span>']);else{if(K.buy!==1)L.push(['Buying',`<span class="${K.buy<1?'fx-good':'fx-bad'}">${pc(K.buy)}</span>`]);if(K.sell!==1)L.push(['Selling',`<span class="${K.sell>1?'fx-good':'fx-bad'}">${pc(K.sell)}</span>`])}
 if(K.hire!==1)L.push(['Hiring',`<span class="${K.hire<1?'fx-good':'fx-bad'}">${pc(K.hire)}</span>`]);if(K.ctr!=null&&K.ctr!==1)L.push(['Work offered',`<span class="${K.ctr>1?'fx-good':'fx-bad'}">x${K.ctr}</span>`]);
 if(K.recruit!=null&&K.recruit!==1)L.push(['Recruits',`<span class="${K.recruit>1?'fx-good':'fx-bad'}">x${K.recruit}</span>`]);
 if(K.patience!=null)L.push(['Haggling',K.patience?K.patience+' round'+(K.patience===1?'':'s')+' of patience':'<span class="fx-bad">None</span>']);
 if(K.hunt)L.push(['Patrols','<span class="fx-bad">Attack on sight</span>']);if(!L.length)L.push(['Prices','As listed']);return L}
function fxuNext(f){const v=lkRep(f),T=fxuTiers(),i=T.findIndex(t=>t.k===lkRepTier(f).k);const up=T[i+1],dn=i>0?T[i]:null;
 return(up?`${up.min-v} to ${fxuEsc(up.n)}`:'The highest standing')+(dn&&i>0?` · ${fxuEsc(T[i-1].n)} below ${dn.min}`:'')}
function fxuLog(f,n){const L=G&&Array.isArray(G.repLog)?G.repLog:[],out=[];for(let i=L.length-1;i>=0&&out.length<(n||99);i--){const e=L[i];if(e&&(!f||e.f===f))out.push(e)}return out}
function fxuLogRow(e,showF){const d=Math.round(+e.n||0);return`<div class="fx-log${d<0?' neg':''}">${showF?`<span class="fx-lb">${fxuBanner(e.f,24)}</span>`:''}<b class="fx-d">${d>0?'+':d<0?'−':''}${Math.abs(d)}</b><span class="fx-why">${showF?`<em>${fxuEsc(lkFacName(e.f))}</em>`:''}${fxuEsc(e.why||'Standing changed')}</span><small>Day ${e.day|0}</small></div>`}
/* ---- the house list ---- */
function fxuList(){const F=fxuFacts();if(!F.length)return pnEmpty('No houses rule this land yet.');let h='';
 F.forEach(f=>{const n=fxuTowns(f).length,P=fxuPers(lkHouse(f));
  h+=pnRow({on:`factionsPick('${f}')`,sel:f===FXUI.sel,cls:'wrap fx-row',lead:fxuBanner(f,40),title:fxuEsc(lkFacName(f)),sub:`${fxuTierChip(f)}<span class="fx-n">${n} town${n===1?'':'s'}${P?' · '+fxuEsc(P.n):''}</span>${fxuBar(f)}`})});
 const M=typeof FACT==='object'&&FACT?Object.keys(FACT).filter(k=>!FACT[k].house&&k!=='free'):[];
 if(M.length)h+=`<div class="fx-mon">${pnSec('Always hostile')}<div class="fx-monl">${M.map(k=>`<span title="${fxuEsc(FACT[k].n||k)}">${typeof twEmblem==='function'?twEmblem({type:'hunt',f:k},24):''}<b>${fxuEsc(FACT[k].n||k)}</b></span>`).join('')}</div></div>`;
 return h}
/* ---- one faction ---- */
function fxuDetail(f){const h=lkHouse(f),P=fxuPers(h),towns=fxuTowns(f),v=Math.round(lkRep(f)),t=lkRepTier(f);let d='';
 const seat=h&&G.towns[h.seat]?G.towns[h.seat].name:null;
 d+=`<div class="fx-hero">${fxuBanner(f,72)}<div><div class="pn-kick">${h?'Noble house':'Independent'}${P?' · '+fxuEsc(P.n):''}</div><div class="pn-h">${fxuEsc(lkFacName(f))}</div>
  <p class="pn-p">${h?(seat?'Seat at <b>'+fxuEsc(seat)+'</b>. ':'')+(P?fxuEsc(P.d):''):'Towns that answer to no lord. Their councils hire swords like anyone else and remember who kept the roads safe.'}</p></div></div>`;
 d+=pnHead('Your standing')+`<div class="fx-stand">${fxuTierChip(f)}<b class="fx-v">${v>0?'+':''}${v}</b><small>${fxuNext(f)}</small></div>${fxuBar(f,true)}<div class="fx-ticks">${fxuTiers().map(x=>`<span>${fxuEsc(x.n)}</span>`).join('')}</div>`;
 d+=pnHead('In '+(h?'its':'their')+' towns at '+fxuEsc(t.n.toLowerCase()))+pnFacts(fxuEffects(f));
 if(h&&G.houses.length>1){const R=G.houses.filter(o=>o.id!==f).map(o=>{const r=fxuRel(f,o.id);return`<div class="fx-rel r-${r}">${fxuBanner(o.id,28)}<span><b>${fxuEsc(o.n)}</b><small>${fxuEsc(FXRELN[r]||r)}</small></span>${r==='war'?fxuIc('swords',16):''}</div>`}).join('');
  d+=pnHead('Other houses')+`<div class="fx-rels">${R}</div>`}
 d+=pnHead('Towns held')+(towns.length?`<div class="fx-towns">${towns.map(i=>{const T=G.towns[i],S=lkSits(T),hp=lkHostile(i);
  return`<div class="fx-town${h&&h.seat===i?' seat':''}"><b>${fxuEsc(T.name)}${h&&h.seat===i?' <em>seat</em>':''}</b><span class="fx-sits">${S.map(s=>`<span title="${fxuEsc(lkSitDef(s.k||s).n)}">${fxuIc(lkSitIcon(s.k||s),16)}</span>`).join('')}${hp?'<span class="fx-bad">closed</span>':''}</span>${typeof T.pros==='number'?`<span class="fx-pros" title="Prosperity ${Math.round(T.pros)}">${pnBar(T.pros,'pros')}</span>`:''}</div>`}).join('')}</div>`:pnEmpty('No towns.'));
 const L=fxuLog(f,8);d+=pnHead('Recent')+(L.length?`<div class="fx-logs">${L.map(e=>fxuLogRow(e,false)).join('')}</div>`:pnEmpty('Nothing yet. Contracts, battles and choices on the road change your standing.'));
 return d}
function fxuStanding(){const L=fxuLog(null,30);let h=`<div class="fx-sum">${fxuFacts().map(f=>`<div class="fx-sumi" role="button" tabindex="0" onclick="factionsPick('${f}')">${fxuBanner(f,32)}<span><b>${fxuEsc(lkFacName(f))}</b>${fxuTierChip(f)}${fxuBar(f)}</span></div>`).join('')}</div>`;
 const N=G&&Array.isArray(G.news)?G.news.slice(-12).reverse():[];if(N.length)h+=pnHead('News from the roads')+`<div class="fx-logs">${N.map(e=>`<div class="fx-log">${fxuIc('day',16)}<span class="fx-why">${fxuEsc(e.t||'')}</span><small>Day ${e.day|0}</small></div>`).join('')}</div>`;
 h+=pnHead('Reputation log')+(L.length?`<div class="fx-logs all">${L.map(e=>fxuLogRow(e,true)).join('')}</div>`:pnEmpty('No changes yet. Contracts, battles and choices on the road change your standing.'));return h}
/* ---- rival companies (rivals round): the list (banner, personality, renown, swords, standing; the wiped out greyed) and one company ---- */
function fxuRivals(){const L=typeof lkRivals==='function'?lkRivals().filter(Boolean):[];return L.slice().sort((a,b)=>(b.alive!==false)-(a.alive!==false)||(+b.renown||0)-(+a.renown||0))}
function fxuRvList(){const L=fxuRivals();if(!L.length)return pnEmpty('No other companies ride these roads yet.');let h='';const live=L.filter(r=>r.alive!==false),dead=L.filter(r=>r.alive===false);
 const row=r=>{const P=lkRivalPers(r),T=lkRivalTier(r),n=lkRivalSwords(r),dd=r.alive===false;
  return pnRow({on:`factionsRival('${r.id}')`,sel:r.id===FXUI.rsel,cls:'wrap fx-row fx-rv'+(dd?' dead':''),lead:rivalBannerHTML(r,32),title:fxuEsc(r.n)+(dd?' <span class="fx-dead">Wiped out</span>':''),
   sub:dd?`<span class="fx-n">${fxuIc(P.icon,16)}${fxuEsc(P.n)}</span>`:`${fxuTierChip(r.id)}<span class="fx-n">${fxuIc(P.icon,16)}${fxuEsc(P.n)} · ${fxuEsc(T.n)} · ${n} sword${n===1?'':'s'}</span>${fxuBar(r.id)}`})};
 h+=pnSec('Rival companies',live.length);live.forEach(r=>h+=row(r));if(dead.length){h+=pnSec('Fallen',dead.length);dead.forEach(r=>h+=row(r))}return h}
function fxuRvDetail(id){const r=lkRival(id);if(!r)return pnEmpty('No company.');const P=lkRivalPers(r),T=lkRivalTier(r),dd=r.alive===false,job=typeof rvJob==='function'?rvJob(r):'',home=G.towns[r.home],v=lkRivalStance(r),n=lkRivalSwords(r);let d='';
 d+=`<div class="fx-hero">${rivalBannerHTML(r,64)}<div><div class="pn-kick">${fxuIc(P.icon,16)} Mercenary company · ${fxuEsc(P.n)}</div><div class="pn-h">${fxuEsc(r.n)}${dd?' <span class="fx-dead">Wiped out</span>':''}</div>
  <p class="pn-p">${job&&!dd?'<b>'+fxuEsc(job)+'.</b> ':''}${fxuEsc(P.d)}</p></div></div>`;
 const s=dd?0:lkRivalStr(r);
 d+=pnFacts([['Renown',`${fxuEsc(T.n)} · ${Math.round(+r.renown||0)}`],['Swords',dd?'None':String(n)],home?['Home',fxuEsc(home.name)]:null,!dd?['Against you',`<span class="${s<=1?'fx-good':s>=3?'fx-bad':''}">${lkStrWord(s)}</span>`]:null,r.hired&&!dd?['Hired by',`<span class="fx-bad">${fxuEsc(lkFacName(r.hired.by))}, to hunt you</span>`]:null]);
 if(!dd){d+=pnHead('Their stance toward you')+`<div class="fx-stand">${fxuTierChip(r.id)}<b class="fx-v">${v>0?'+':''}${v}</b><small>${fxuNext(r.id)}</small></div>${fxuBar(r.id,true)}<div class="fx-ticks">${fxuTiers().map(x=>`<span>${fxuEsc(x.n)}</span>`).join('')}</div>`;
  const R=(Array.isArray(r.roster)?r.roster.filter(Boolean):[]).slice().sort((a,b)=>(+b.lvl||1)-(+a.lvl||1)).slice(0,6);
  if(R.length)d+=pnHead('Their best swords')+`<div class="fx-mercs">${R.map(m=>`<div class="fx-merc">${typeof portraitHTML==='function'?portraitHTML(m,32):''}<span><b>${fxuEsc(m.name||'')}</b><small>Level ${m.lvl|0}${typeof BG==='object'&&BG[m.bg]?' '+fxuEsc(BG[m.bg].n.toLowerCase()):''}</small></span></div>`).join('')}</div>`}
 const D=Array.isArray(r.deeds)?r.deeds.slice(-8).reverse():[];
 d+=pnHead('Deeds')+(D.length?`<div class="fx-logs">${D.map(e=>`<div class="fx-log${/wiped|beaten|broken|deserted|fell/i.test(e.t||'')?' neg':''}">${fxuIc(/wiped|broken|beaten/i.test(e.t||'')?'skull':/took|contract|work|done/i.test(e.t||'')?'contract':'banner',16)}<span class="fx-why">${fxuEsc(e.t||'')}</span><small>Day ${e.day|0}</small></div>`).join('')}</div>`:pnEmpty('Nothing of note yet.'));
 const L=fxuLog(r.id,6);if(L.length)d+=pnHead('Between you')+`<div class="fx-logs">${L.map(e=>fxuLogRow(e,false)).join('')}</div>`;
 return d}
function factionsRival(id){FXUI.rsel=id;FXUI.tab='rivals';fxuRender()}
function fxuRender(){if(!G)return;const F=fxuFacts();if(FXUI.sel==null||!F.includes(FXUI.sel))FXUI.sel=F[0]||null;
 const o={id:'factions',view:FXUI.tab,title:'Factions',sub:(G.houses?G.houses.length:0)+' houses · '+(n=>n+(n===1?' rival company':' rival companies'))(fxuRivals().filter(r=>r.alive!==false).length)+(Array.isArray(G.wars)&&G.wars.length?' · '+G.wars.length+(G.wars.length===1?' war':' wars')+' under way':' · at peace'),
  banner:`<span class="fx-ban">${fxuIc('factions',32)}</span>`,meta:'',closeLabel:FXUI.back?'Back':'Close',closeIcon:FXUI.back?'back':'x',onClose:()=>{const b=FXUI.back;FXUI.back=null;if(b){b()}else closePanel()},
  tabs:[{k:'houses',n:'Houses',icon:'factions'},{k:'rivals',n:'Rivals',icon:'rival',badge:fxuRivals().filter(r=>r.alive!==false&&(r.hired||lkRivalStance(r)<=-40)).length||undefined},{k:'standing',n:'Standing',icon:'rep-friendly'}],tab:FXUI.tab,onTab:k=>{FXUI.tab=k;fxuRender()}};
 if(FXUI.tab==='rivals'){const R=fxuRivals();if(!R.some(r=>r.id===FXUI.rsel))FXUI.rsel=R.length?R[0].id:null;o.list=fxuRvList();o.listKey='fx:rv';o.detail=FXUI.rsel?fxuRvDetail(FXUI.rsel):pnEmpty('No rival companies.');o.detailKey='fx:rv:'+FXUI.rsel}
 else if(FXUI.tab==='standing'){o.single=true;o.list=fxuStanding();o.listKey='fx:log'}
 else{o.list=fxuList();o.listKey='fx:list';o.detail=FXUI.sel?fxuDetail(FXUI.sel):pnEmpty('No houses.');o.detailKey='fx:'+FXUI.sel}
 showPanel(o)}
function factionsPick(f){FXUI.sel=f;FXUI.tab='houses';fxuRender()}
function factionsSheet(sel,back){if(typeof showPanel!=='function'||!G)return;let rv=false;if(typeof sel==='string'&&typeof lkIsRival==='function'&&lkIsRival(sel)){FXUI.rsel=sel;rv=true;sel=null}if(typeof worldEnsure==='function'){try{worldEnsure()}catch(e){}}if(sel)FXUI.sel=sel;FXUI.back=typeof back==='function'?back:null;if(rv)FXUI.tab='rivals';else if(panelOpen()!=='factions')FXUI.tab='houses';fxuRender()}
