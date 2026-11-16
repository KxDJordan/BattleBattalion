/* ================= THE COLOSSEUM: its sheets (rules: 29-colosseum.js; styles: colosseum.css) =================
   colSheet(id, tab?) opens the colosseum's sheet: the fight card (each bout: rule, opponents as the arena will field them against the swords
   that would fight it, the purse, the entry fee, renown, a prize, Enter), the arena armory (gladiator gear for sale) and the record (wins,
   losses, the streak, the titles of its ladder). Bouts with a set number of swords show a sword picker (COLUI.pick[bout] = merc ids; the
   strongest by default) and the card recomputes the opponents for the swords picked. colAfterSheet(out) tells the outcome of a bout.
   Nothing here draws from the game's rnd(). */
const COLUI={id:null,tab:'card',pick:{},open:-1};
const colEsc=s=>typeof htmlEsc==='function'?htmlEsc(s):String(s);
const colIc=(n,s)=>typeof pxIcon==='function'?pxIcon(n,s||16):'';
function colFoes(roster){const by=new Map();for(const e of roster){const k=e.id+'|'+Math.round(e.lvl)+'|'+(e.elite?1:0)+'|'+(e.name||'');const o=by.get(k);if(o)o.n+=e.n||1;else by.set(k,{e,n:e.n||1})}
 return[...by.values()].map(({e,n})=>{const d=EN[e.id]||{n:e.id},el=e.elite&&Array.isArray(e.el)&&typeof ELITES==='object'&&ELITES[e.el[0]]?ELITES[e.el[0]].n:'';
  const por=typeof portraitHTML==='function'?portraitHTML(e.id,32):'',rk=Math.round(e.lvl||1);
  return`<span class="cl-foe${e.elite?' champ':''}" title="${colEsc((e.name?e.name+', ':'')+(el?el.toLowerCase()+' ':'')+d.n+(rk>1?' (rank '+rk+')':''))}">${por}<b>${n>1?n+'×':''}</b><i>${colEsc(e.name||d.n)}${el?' · '+colEsc(el):''}</i><em>r${rk}</em></span>`}).join('')}
function colRecLine(c){const r=c.rec,T=COLTITLE[r.title]||COLTITLE[0];return`<span class="cl-title">${colIc('laurel')}<b>${colEsc(T.n)}</b></span> <span class="dim">${r.w} won · ${r.l} lost${r.y?' · '+r.y+' yielded':''}${r.streak?` · <span class="good">${r.streak} in a row</span>`:''}</span>`}
function colPickOf(c,i){const b=colBout(c,i),R=b&&COLRULE[b.rule];if(!R||!R.swords)return null;const k=c.id+':'+c.card.ep+':'+i,L=COLUI.pick[k];return colSwords(b,Array.isArray(L)?L:null).map(m=>m.id)}
function colPickTap(id,i,mid){const c=colOf(id),b=colBout(c,i),R=b&&COLRULE[b.rule];if(!R||!R.swords)return;const k=c.id+':'+c.card.ep+':'+i;let L=colPickOf(c,i)||[];
 if(L.includes(mid))L=L.filter(x=>x!==mid);else{if(L.length>=R.swords)L=L.slice(1);L.push(mid)}COLUI.pick[k]=L;COLUI.open=i;colSheet(id,'card')}
function colBoutHTML(c,i){const b=colBout(c,i),R=COLRULE[b.rule],T=COLTHEME[b.theme],why=colWhy(c,i),ids=colPickOf(c,i),ms=R.swords?ids.map(id=>G.roster.find(m=>m.id===id)).filter(Boolean):fielded();
 const ros=ms.length?colRoster(b,ms):[],purse=colPurse(c,b),fee=colFee(c,b),ren=colRenown(b),pr=colPrize(c,b),open=COLUI.open===i;
 const tags=[R.swords?`${R.swords} against ${R.swords}`:'Your fielded company',R.noYield?'No yielding':'You may yield',R.haz?'Fire pits':'',R.champ?'A champion':'',R.beast?'Beasts':''].filter(Boolean);
 let pick='';if(R.swords){const L=G.roster.filter(colFit).slice().sort((x,y)=>colPower([y])-colPower([x])||x.id-y.id);
  pick=`<div class="cl-pick"><span class="dim">${R.swords===1?'Your champion':'Your '+R.swords}: tap to choose</span><div>${L.map(m=>`<button type="button" class="cl-sw${ids.includes(m.id)?' on':''}" aria-pressed="${ids.includes(m.id)}" onclick="colPickTap(${c.id},${i},${m.id})" title="${colEsc(m.name)}, level ${m.lvl}">${typeof portraitHTML==='function'?portraitHTML(m,32):''}<i>${colEsc(m.name)}</i><em>L${m.lvl}</em></button>`).join('')}</div></div>`}
 const st=b.done==='won'?'<em class="good">Won</em>':b.done==='lost'?'<em class="bad">Lost</em>':b.done==='yield'?'<em class="dim">Yielded</em>':'';
 return`<li class="cl-bout${b.done?' done':''}${open?' open':''}" data-rule="${b.rule}"><div class="cl-bh">${colIc(colRuleIcon(b.rule),32)}<div><b>${colEsc(R.n)}</b> <span class="cl-th">${colEsc(T.n)}</span> ${st}<br><span class="cl-tags">${tags.map(t=>`<i>${colEsc(t)}</i>`).join('')}</span></div></div>
  <p class="dim cl-rd">${colEsc(R.d)}</p><div class="cl-foes">${colFoes(ros)}</div>${b.done?'':pick}
  <div class="cl-pay"><span>${colIc('coin')}Purse <b class="coin">${purse}</b>${c.rec.streak?` <small class="good">+${Math.round((colStreakK(c)-1)*100)}% streak</small>`:''}</span><span>${colIc('laurel')}+${ren} renown</span>${pr?`<span class="cl-prize">${typeof pnItemIcon==='function'?pnItemIcon(pr,16):''}Prize: ${colEsc(ITEMS[pr].n)}</span>`:''}<span class="dim">Entry ${fee}</span></div>
  ${b.done?'':`<div class="row"><button class="pri" style="flex:1" ${why?'disabled':''} onclick="colGo(${c.id},${i})">${why?colEsc(why):'Enter the arena'}</button></div>`}</li>`}
function colRuleIcon(k){return{melee:'swords',duel:'sword',trio:'retinue',six:'retinue',pit:'paw',champ:'crown',hazard:'burn',sine:'skull'}[k]||'swords'}
function colGo(id,i){const c=colOf(id);if(!c)return;const ids=colPickOf(c,i);colEnter(id,i,ids)}
function colArmoryHTML(c){const A=colArmory(c);if(!A.stock.length)return'<p class="dim">The armory is bare until the next card.</p>';
 return`<p class="dim">The lanista sells what the school does not need. Gear of the sand, found nowhere else.</p><div class="cl-arm">${A.stock.map((id,k)=>{const it=ITEMS[id],p=colPrice(id);
  return`<div class="cl-it">${typeof pnItemIcon==='function'?pnItemIcon(id,32):''}<div><b>${colEsc(it.n)}</b><span class="dim">${colEsc(typeof itemDesc==='function'?itemDesc(id):'')}</span></div><button ${G.crowns<p?'disabled':''} onclick="if(colBuy(${c.id},${k}))colSheet(${c.id},'arm')">${colIc('coin')}${p}</button></div>`}).join('')}</div>`}
function colRecordHTML(c){const r=c.rec;return`<p>${colRecLine(c)}</p><p class="dim">Best streak ${r.best}. Purses won: <span class="coin">${r.purse}</span> crowns.</p>
 <ol class="cl-ladder">${COLTITLE.map((T,k)=>`<li class="${k<=r.title?'got':''}"><b>${colEsc(T.n)}</b> <span class="dim">${T.w} wins${T.ren?' · +'+T.ren+' renown':''}: ${colEsc(T.d)}</span></li>`).join('')}</ol>
 <p class="dim">The crowd's acclaim: ${COL.acclaim.map(([n,v])=>`${n} wins in a row +${v} renown`).join(', ')}. Every win in a row adds ${Math.round(COL.streak.per*100)}% to the next purse (up to ${Math.round(COL.streak.max*100)}%); a loss or a yield ends the streak.</p>`}
function colSheet(id,tab){const c=colOf(id);if(!c)return;if(COLUI.id!==id){COLUI.open=-1}COLUI.id=id;COLUI.tab=tab||COLUI.tab||'card';const C=colCard(c),t=G.towns[c.ti],first=!c.seen;c.seen=1;
 const tb=(k,n,ic)=>`<button type="button" class="mk-tab${COLUI.tab===k?' on':''}" aria-selected="${COLUI.tab===k}" onclick="colSheet(${id},'${k}')">${colIc(ic)}${n}</button>`;
 const body=COLUI.tab==='arm'?colArmoryHTML(c):COLUI.tab==='rec'?colRecordHTML(c):`<ol class="cl-card">${C.bouts.map((b,i)=>colBoutHTML(c,i)).join('')}</ol>
  <p class="dim cl-note">A new card in ${colDaysLeft()} day${colDaysLeft()===1?'':'s'}. Every bout is a little stronger than the swords you send into it${typeof diffOf==='function'&&diffOf()!=='normal'?' ('+DIFF[diffOf()].n+')':''}. The gates stay shut: nobody withdraws. You may yield and lose the purse, except sine missione. The crowd spares most of the fallen: a struck-down sword dies ${Math.round(COL.death*100)}% as often as on the road (sine missione: as often).</p>`;
 if(typeof sheet==='function')sheet(`<div class="cl-sheet"><div class="cl-hd">${colIc('colosseum',32)}<div><h2>${colEsc(colName(c))}</h2><p class="cl-sub">${first?`Ten thousand voices and the smell of blood and sand. ${colEsc(t?t.name:'The city')} keeps the games, and pays for them.`:'The crowd is waiting.'}</p><p>${colRecLine(c)}</p></div></div>
 <div class="mk-tabs" role="tablist">${tb('card','The card','swords')}${tb('arm','Armory','shield')}${tb('rec','Record','laurel')}</div>${body}<div class="row"><button onclick="closeSheet()">Leave</button></div></div>`,'cl-wide')}
function colAfterSheet(out){const P=out.prize&&ITEMS[out.prize]?`<p class="eg-loot">${typeof brItem==='function'?brItem(out.prize):colEsc(ITEMS[out.prize].n)}</p>`:'';let h;
 if(out.win)h=`<h2>The crowd is on its feet</h2><p>${colEsc(out.bout)}: won. The editor throws down <span class="coin">${out.purse} crowns</span>${out.show?` (+${out.show}% for the showmen)`:''}; the entry of ${out.fee} is taken from it. +${out.renown} renown.</p>${P}
  ${out.acclaim?`<p class="good">${out.rec.streak} in a row: the crowd chants the company's name (+${out.acclaim} renown).</p>`:''}${out.title?`<p class="good">The company is hailed <b>${colEsc(out.title)}</b> of the arena.</p>`:''}<p>${colIc('laurel')} ${colEsc(out.titleN)} · ${out.rec.w} won, ${out.rec.l} lost · streak ${out.rec.streak}</p>`;
 else if(out.yielded)h=`<h2>Missio</h2><p>${colEsc(out.bout)}: the company yields, and the crowd lets it live. No purse; the entry of ${out.fee} crowns is lost, and the streak with it.</p>`;
 else h=`<h2>Beaten on the sand</h2><p>${colEsc(out.bout)}: lost. The entry of ${out.fee} crowns is lost, and the streak with it.</p>`;
 if(typeof sheet==='function')sheet(`<div class="cl-sheet">${h}<div class="row"><button class="pri" style="flex:1" onclick="colSheet(${out.id},'card')">Back to the card</button><button onclick="closeSheet()">Leave</button></div></div>`)}
