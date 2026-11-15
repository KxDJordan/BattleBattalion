/* ================= CAMP SCREEN (camp) =================
   campOpen(tab?) opens a two-pane panel (showPanel) with five tabs; the world is paused while it is open (sheetOpen).
     Rest     today's camp: six hours, wounds mend twice as fast, armor is repaired with tools (campReport / repairAll)
     Train    a merc drills for CAMP.trainH hours and crowns, for XP; CAMP.trainCap sessions a merc a day (the drillmaster: one more,
              a fifth more XP, a quarter off the price; every tactician perk in the company adds 5% XP)
     Surgery  one salve and CAMP.surgH hours take CAMP.surgDays days off an injury, once per wound a day (the surgeon: one more day
              and an hour less; the best field medic in the company: +1 day with one medic perk, +2 with four)
     Craft    RECIPES (13-craft.js): parts, crowns and hours into gear and supplies
     Parts    the stock of monster parts and where they come from
   campQuickRest() is the one-tap rest (what the world's old Camp button did). None of it uses the seeded RNG
   (advanceTime may roll a new day, which does what any day does), except the camp event a rest may bring (campEvent: eventTick('camp')). */
const CAMP={restH:6,trainH:3,trainCap:2,trainXP:.12,trainXP0:40,surgH:3,surgDays:2};
const CAMPTABS=[['rest','Rest','camp'],['train','Train','level'],['surgery','Surgery','injury'],['craft','Craft','anvil'],['parts','Parts','parts']];
const CM={tab:'rest',sel:{},note:''};
function campSync(){if(G&&typeof craftRepair==='function')craftRepair(G);return G&&G.camp}
function campFol(id){try{return typeof followerHas==='function'&&!!followerHas(id)}catch(e){return false}}
function campDrill(){return campFol('drill')||campFol('drillmaster')}
// the most perks any merc of the company holds in tree key
function campBest(key){let n=0;if(!G||!G.roster)return 0;for(const m of G.roster){let c=0;for(const id of (Array.isArray(m.perks)?m.perks:[])){const P=typeof perkById==='function'?perkById(id):null;if(P&&P.key===key)c++}if(c>n)n=c}return n}
function campMercById(id){return G&&G.roster?G.roster.find(m=>String(m.id)===String(id))||null:null}
function campMaxHp(m){try{return calc(m).hp}catch(e){return m.hp||1}}
// a trait that changes how fast a merc learns: TRAITS mod.trainXP or mod.xp (shares, .1 = +10%)
function campTraitXP(m){if(typeof traitsOf!=='function')return 0;let v=0;try{for(const t of traitsOf(m)||[]){const M=t&&t.mod||{};v+=(+M.trainXP||0)+(+M.xp||0)}}catch(e){}return isFinite(v)?v:0}
/* campTrainInfo(m): {xp, cost, hours, cap, used, why ('' = can train), bonus:[lines]} */
function campTrainInfo(m){const c=campSync()||{tr:{}},lv=m.lvl||1,max=lv>=MAXLV||!XPT[lv+1],gap=max?0:XPT[lv+1]-XPT[lv],drill=campDrill(),tac=campBest('tactician'),tr=campTraitXP(m);
 const mult=Math.max(.1,1+(drill?.2:0)+.05*tac+tr),xp=max?0:Math.round((CAMP.trainXP0+gap*CAMP.trainXP)*mult),cost=Math.round((25+12*lv)*(drill?.75:1)/5)*5;
 const cap=CAMP.trainCap+(drill?1:0),used=c.tr[m.id]||0,bonus=[];
 if(drill)bonus.push('Drillmaster: +20% XP, a quarter off, one more session a day');if(tac)bonus.push(`Tactician perks in the company (${tac}): +${tac*5}% XP`);if(tr)bonus.push(`${tr>0?'Quick':'Slow'} learner: ${tr>0?'+':'−'}${Math.round(Math.abs(tr)*100)}% XP`);
 const why=max?'At the highest level':used>=cap?'Drilled enough for today':m.hp<campMaxHp(m)*.4?'Too badly hurt to drill':(G.crowns||0)<cost?'Not enough crowns':'';
 return{xp,cost,hours:CAMP.trainH,cap,used,why,bonus}}
// one training session for merc id; returns the XP gained or false
function campTrain(id){const m=campMercById(id);if(!m)return false;const T=campTrainInfo(m);if(T.why){campToast(T.why);return false}
 G.crowns-=T.cost;const l0=m.lvl;gainXP(m,T.xp);if(typeof advanceTime==='function')advanceTime(T.hours);const c=campSync();c.tr[m.id]=(c.tr[m.id]||0)+1;
 const up=m.lvl>l0;campNote(`<p class="good">${htmlEsc(m.name)} drills for ${T.hours} hours: +${T.xp} XP${up?`. <b>Level ${m.lvl}!</b> A perk point to spend in the Company screen`:''}.</p>`);
 if(typeof save==='function')save();campRender();return T.xp}
/* campSurgInfo(m, injId): {days (taken off), hours, why ('' = can operate), heals (the wound closes), bonus:[lines], j} */
function campSurgInfo(m,injId){const c=campSync()||{sg:{}},j=Array.isArray(m.inj)?m.inj.find(x=>x&&x.id===injId):null,I=typeof INJ==='object'&&INJ[injId]||{};
 const surg=campFol('surgeon'),med=campBest('medic'),days=CAMP.surgDays+(surg?1:0)+(med>=4?2:med>=1?1:0),hours=CAMP.surgH-(surg?1:0),bonus=[];
 if(surg)bonus.push('Surgeon: +1 day, one hour quicker');if(med)bonus.push(`Field medic in the company (${med} perk${med===1?'':'s'}): +${med>=4?2:1} day${med>=4?'s':''}`);
 const perm=!j||j.days<0||!!I.perm,why=!j?'No such wound':perm?'Permanent: no knife can mend it':c.sg[m.id+':'+injId]?'Treated today: the wound needs a night':(G.salve||0)<1?'No salves: make some on the Craft tab':'';
 return{days,hours,why,heals:!!j&&!perm&&j.days<=days,bonus,j}}
function campSurgery(id,injId){const m=campMercById(id);if(!m)return false;const S=campSurgInfo(m,injId);if(S.why){campToast(S.why);return false}
 const nm=typeof INJ==='object'&&INJ[injId]&&INJ[injId].n||injId;G.salve--;S.j.days-=S.days;if(S.j.days<=0)m.inj=m.inj.filter(x=>x!==S.j);
 m.hp=clamp(m.hp,1,campMaxHp(m));if(typeof advanceTime==='function')advanceTime(S.hours);const c=campSync();if(Array.isArray(m.inj)&&m.inj.includes(S.j))c.sg[m.id+':'+injId]=1;
 campNote(`<p class="good">${S.heals?`${htmlEsc(m.name)}'s ${String(nm).toLowerCase()} is mended`:`${htmlEsc(m.name)}'s ${String(nm).toLowerCase()}: ${S.days} days sooner, ${S.j.days} to go`}. One salve used, ${S.hours} hours.</p>`);
 if(typeof save==='function')save();campRender();return true}
// rest six hours: heal at double rate, repair with tools. Returns the report line.
function campRestNow(){if(!G)return'';G.moving=false;G.route=[];const hp0=G.roster.reduce((n,m)=>n+m.hp,0);let msg;
 if(typeof campRest==='function')msg=campRest(CAMP.restH);   // the world's direct rest path (40-world.js): advanceTime(h,2), campReport, toast, save
 else{if(typeof advanceTime==='function')advanceTime(CAMP.restH,2);msg=typeof campReport==='function'?campReport(CAMP.restH):(typeof repairAll==='function'&&repairAll(),'Made camp for six hours')}
 const hp=G.roster.reduce((n,m)=>n+m.hp,0)-hp0;msg=String(msg||'Made camp for six hours');if(hp>0)msg+=`. ${hp} hitpoints mended`;return msg}
function campQuickRest(){if(!G)return'';if(G.moving){G.moving=false;G.route=[];return''}const msg=campRestNow();if(typeof campRest!=='function')campToast(msg);if(typeof save==='function')save();campEvent();return msg}
/* ---- the hour-by-hour rest (campSim): in a real page the Make camp button plays the hours forward, CSIM.ms a step, in a popup over the
   camp panel, and keeps going until the player taps Break camp (any time). Every hour is listed: the clock, the company's hitpoints
   (healing %), its armor (repair %), food eaten and wages paid (both fall due at midnight, in newDay). Each hour is advanceTime(1, 2) and
   repairAll(k): up to CSIM.rate tools an hour, the rate set at the start so the armor that needs mending is mended over CAMP.restH hours
   when there are tools enough. Headless (no document) campRestTab rests CAMP.restH hours in one step. ---- */
const CSIM={on:false,ms:650,tm:0};
function campStat(){let hp=0,hpM=0,ar=0,arM=0;for(const m of G.roster){const mx=campMaxHp(m);hp+=Math.min(m.hp,mx);hpM+=mx;if(typeof armorCond==='function'){const c=armorCond(m);ar+=c.a+c.h;arM+=c.aMax+c.hMax}}
 return{hp,hpM,ar,arM,hpP:hpM?Math.round(hp/hpM*100):100,arP:arM?Math.round(ar/arM*100):100,food:G.food||0,crowns:G.crowns||0,n:G.roster.length}}
function campSimCan(){return typeof document!=='undefined'&&!!document.getElementById&&!!document.getElementById('pn')&&typeof setTimeout==='function'}
function campSimStart(){if(!G||CSIM.on)return false;G.moving=false;G.route=[];const n=CAMP.restH,tp=typeof cpToolPts==='function'?cpToolPts():15,need=typeof cpDamageAll==='function'?cpDamageAll():0;
 const T=Math.min(typeof cpTools==='function'?cpTools():0,Math.ceil(need/Math.max(1,tp))),s0=campStat();
 Object.assign(CSIM,{on:true,done:false,full:false,rate:Math.max(1,Math.ceil(T/n)),h:0,T,tools:0,pts:0,s0,last:s0,rows:[],food:0,wages:0,notes:[],day0:G.day,hour0:G.hour});
 campSimDraw();CSIM.tm=setTimeout(campSimTick,CSIM.ms);return true}
function campSimStep(){const c0=G.crowns||0,f0=G.food||0,d0=G.day,r0=G.roster.length;
 advanceTime(1,2);const tp=typeof cpToolPts==='function'?cpToolPts():15,need=typeof cpDamageAll==='function'?cpDamageAll():0,k=Math.min(CSIM.rate,typeof cpTools==='function'?cpTools():0,Math.ceil(need/Math.max(1,tp)));if(k>0&&typeof repairAll==='function'){const r=repairAll(k);CSIM.tools+=r.tools;CSIM.pts+=r.pts}
 const s=campStat(),row={clock:campHour(),day:G.day,hpP:s.hpP,dHp:s.hp-CSIM.last.hp,arP:s.arP,dAr:s.ar-CSIM.last.ar,food:0,wage:0,note:''};
 if(G.day!==d0){row.wage=Math.max(0,c0-(G.crowns||0));row.food=Math.max(0,f0-(G.food||0));CSIM.wages+=row.wage;CSIM.food+=row.food;
  let msg='';try{const e=document.getElementById('toast');msg=e&&e.textContent||''}catch(e){}if(msg.indexOf('Day '+G.day)===0)row.note=msg;else row.note='A new day: Day '+G.day;if(G.roster.length<r0&&!/desert/.test(row.note))row.note+=' (someone left)'}
 if(!CSIM.full&&s.hp>=s.hpM&&(s.ar>=s.arM||!(typeof cpTools==='function'&&cpTools()))){CSIM.full=true;row.note=(row.note?row.note+'. ':'')+(s.ar>=s.arM?'Everyone is healed and mended':'Everyone is healed; no tools left for the armor')}
 CSIM.rows.push(row);if(CSIM.rows.length>72)CSIM.rows.shift();CSIM.last=s;CSIM.h++}
function campSimTick(){CSIM.tm=0;if(!CSIM.on||CSIM.done)return;campSimStep();campSimDraw();CSIM.tm=setTimeout(campSimTick,CSIM.ms)}
function campSimMsg(){const s=CSIM.last,s0=CSIM.s0,h=CSIM.h;return`Made camp for ${h} hour${h===1?'':'s'}`+(s.hp>s0.hp?`. ${s.hp-s0.hp} hitpoints mended`:'')+(CSIM.pts?`. Repaired ${CSIM.pts} armor with ${CSIM.tools} tool${CSIM.tools===1?'':'s'}`:'')+(CSIM.food?`. ${CSIM.food} food eaten`:'')+(CSIM.wages?`. ${CSIM.wages} crowns paid in wages`:'')}
// Break camp: stops the clock at once (between hours), saves, and returns to the camp panel; a camp event may follow.
function campSimClose(){if(CSIM.tm){clearTimeout(CSIM.tm);CSIM.tm=0}const el=document.getElementById('csim');if(el)el.remove();if(!CSIM.on)return;CSIM.on=false;CSIM.done=true;if(typeof save==='function')save();
 const msg=CSIM.h?campSimMsg():'You struck camp before the first hour was out';if(typeof toast==='function')toast(msg);campNote(`<p class="good">${htmlEsc(msg)}.</p>`);campRender();
 campEvent(()=>{if(typeof panelOpen==='function'&&panelOpen()==='camp')campRender()})}
function campSimDraw(){const root=document.getElementById('pn');if(!root)return;let el=document.getElementById('csim');if(!el){el=document.createElement('div');el.id='csim';el.className='cs-wrap';el.setAttribute('role','dialog');el.setAttribute('aria-label','Camp');root.appendChild(el)}
 const C=CSIM,s=C.last,pct=Math.round(((G.hour||0)%24)/24*100),sg=v=>v>0?`<em class="good">+${v}</em>`:'',
  head=`<div class="cs-top">${campIc('camp',32)}<div><div class="pn-kick">In camp · Day ${G.day}${C.full?' · <span class="good">all rested</span>':''}</div><div class="pn-h">${campHour()} <small>${C.h} hour${C.h===1?'':'s'} in camp</small></div></div></div>
  <div class="cs-bar"><i style="width:${pct}%"></i></div>
  <div class="cs-sum"><span>${campIc('hp',16)}<b>${s.hpP}%</b><small>healed</small></span><span>${campIc('armor',16)}<b>${s.arP}%</b><small>armor</small></span><span>${campIc('food',16)}<b>${C.food}</b><small>food eaten</small></span><span>${campIc('coin',16)}<b>${C.wages}</b><small>wages paid</small></span></div>`,
  rows=C.rows.map((r,i)=>`<tr${i===C.rows.length-1?' class="now"':''}><td>${r.clock}</td><td>${r.hpP}% ${sg(r.dHp)}</td><td>${r.arP}% ${sg(r.dAr)}</td><td>${r.food?`<em class="bad">−${r.food}</em>`:'·'}</td><td>${r.wage?`<em class="bad">−${r.wage}</em>`:'·'}</td></tr>${r.note?`<tr class="cs-note"><td colspan="5">${htmlEsc(r.note)}</td></tr>`:''}`).reverse().join(''),
  tbl=`<div class="cs-log"><table><thead><tr><th>Hour</th><th>Healing</th><th>Armor</th><th>Food</th><th>Wages</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="dim">The fire is lit…</td></tr>'}</tbody></table></div>`,
  foot=`<p class="cs-msg dim">Time runs on until you break camp. Wages and food fall due at midnight.</p><button type="button" class="pn-btn pri" onclick="campSimClose()">${campIc('camp')}<span>Break camp</span></button>`;
 el.innerHTML=`<div class="cs-pop">${head}${tbl}<div class="cs-foot">${foot}</div></div>`}
function campRestTab(){if(campSimCan()){campSimStart();return}const msg=campRestNow();campNote(`<p class="good">${msg}.</p>`);if(typeof save==='function')save();campRender();campEvent(()=>{if(typeof panelOpen==='function'&&panelOpen()==='camp')campRender()})}
// a camp event may follow a rest (17-events.js eventTick('camp'): seeded, at most once a day); then runs when its card closes
function campEvent(then){if(typeof eventTick!=='function')return false;try{return eventTick('camp',then?{then}:{})}catch(e){return false}}
function campCraft(id){const why=typeof craftWhy==='function'?craftWhy(id):'Crafting is not available';if(why){campToast(why);return false}const r=craftDo(id);if(!r)return false;
 campNote(`<p class="good">Crafted ${htmlEsc(recipeOut(id))} in ${r.hours} hour${r.hours===1?'':'s'}${r.out.item?': it waits in the stash':''}.</p>`);if(typeof save==='function')save();campRender();return r}
function campToast(t){if(t&&typeof toast==='function')toast(t)}
function campNote(h){CM.note=h||''}

/* ---- screen ---- */
function campOpen(tab){if(!G||!Array.isArray(G.roster))return false;if(G.moving){G.moving=false;G.route=[]}campSync();
 if(tab&&CAMPTABS.some(t=>t[0]===tab))CM.tab=tab;CM.note='';campRender();return true}
function campGo(k){if(CM.tab===k)return;CM.tab=k;CM.note='';campRender()}
function campPick(k){CM.sel[CM.tab]=k;campRender()}
function campClose(){CM.note='';if(typeof closePanel==='function')closePanel()}
function campIc(n,sz,cls){return typeof pnIcon==='function'?pnIcon(n,cls||'',sz||16):''}
function campItemIc(id,sz){return typeof pnItemIcon==='function'?pnItemIcon(id,sz||32):campIc('sword',sz)}
function campPor(m,sz){if(typeof portraitHTML==='function'){try{const h=portraitHTML(m,sz||32);if(h)return`<span class="cm-por">${h}</span>`}catch(e){}}return`<span class="cm-por none" style="width:${sz||32}px;height:${sz||32}px"></span>`}
function campHead(icon,kick,title){return`<div class="cm-head">${icon?`<span class="cm-hi">${icon}</span>`:''}<div><div class="pn-kick">${kick}</div><div class="pn-h">${title}</div></div></div>`}
function campHour(){const h=Math.floor(G.hour||0);return(h<10?'0':'')+h+':00'}
function campMeta(){return(typeof pnPurse==='function'?pnPurse():'')+`<span class="pn-food cm-salve" title="Salves: one a field surgery">${campIc('salve')}<b>${G.salve||0}</b></span><span class="pn-food cm-pcount" title="Monster parts">${campIc('parts')}<b>${typeof partsTotal==='function'?partsTotal():0}</b></span>`}
function campBtn(label,js,on,cls){return`<button type="button" class="pn-btn ${cls||'pri'}${on?'':' off'}" onclick="${js}">${label}</button>`}
function campCost(cr,h,extra){return`<span class="pn-fl">${cr?typeof pnCoin==='function'?pnCoin(cr,'big'+(G.crowns<cr?' short':'')):cr+' crowns':''}<small>${extra?extra+' · ':''}${h} hour${h===1?'':'s'}</small></span>`}
function campRender(){if(!G)return;const v=CM.tab==='train'?campTrainView():CM.tab==='surgery'?campSurgView():CM.tab==='craft'?campCraftView():CM.tab==='parts'?campPartsView():campRestView();
 const inj=G.roster.filter(m=>Array.isArray(m.inj)&&m.inj.some(j=>j&&j.days>0)).length,craft=Object.keys(RECIPES).filter(craftCan).length;
 showPanel({id:'camp',title:'Camp',sub:`Day ${G.day}, ${campHour()}`,meta:campMeta(),note:CM.note,closeLabel:'Break camp',onClose:campClose,
  tabs:CAMPTABS.map(([k,n,icon])=>({k,n,icon,badge:k==='surgery'?inj||'':k==='craft'?craft||'':''})),tab:CM.tab,onTab:campGo,
  list:v.list,listKey:'camp:'+CM.tab,detail:v.detail,detailKey:'camp:'+CM.tab+':'+v.key,foot:v.foot})}
function campMercSub(m){const mx=campMaxHp(m),hurt=m.hp<mx;return`<span class="cm-line"><span class="pn-hp${hurt?' hurt':''}">${m.hp}<small>/${mx} hp</small></span>${typeof pnBar==='function'?pnBar(m.hp/mx*100,'hp'):''}</span>`}
function campXpPct(m){const lv=m.lvl||1;if(lv>=MAXLV||!XPT[lv+1])return 100;return(m.xp-XPT[lv])/(XPT[lv+1]-XPT[lv])*100}
function campRow(o){return typeof pnRow==='function'?pnRow(o):`<div class="pn-row${o.sel?' on':''}" onclick="${o.on}">${o.title}</div>`}

/* Rest */
function campRestView(){let list='',detail='',foot='';const need=typeof cpDamageAll==='function'?cpDamageAll():0,tools=typeof cpTools==='function'?cpTools():G.tools||0,tp=typeof cpToolPts==='function'?cpToolPts():15;
 const hurt=G.roster.filter(m=>m.hp<campMaxHp(m)),inj=G.roster.filter(m=>Array.isArray(m.inj)&&m.inj.length);
 list+=typeof pnSec==='function'?pnSec('Make camp'):'';
 list+=campRow({on:'',sel:true,cls:'static cm-row',lead:campIc('camp',32),title:'Make camp',sub:`Rest until you break camp: wounds mend twice as fast; armor is mended with tools`});
 list+=pnSec('Wounded',hurt.length);if(!hurt.length)list+=pnEmpty('Everyone is fit to march.');
 hurt.forEach(m=>{list+=campRow({on:'',cls:'static cm-row merc',lead:campPor(m,32),title:htmlEsc(m.name),sub:campMercSub(m)})});
 const mend=Math.min(need,tools*tp);
 detail=campHead(campIc('camp',48),'Today\'s camp','Make camp')+`<p class="pn-p">The company pitches tents, lights a fire and sleeps in shifts, hour after hour until you break camp. Hitpoints come back at <b>2 an hour</b> for every sword, and every tool mends <b>${tp} points</b> of armor, the fielded and the worst damaged first (all of it within about ${CAMP.restH} hours when there are tools enough).</p>`
  +pnFacts([['Wounded',hurt.length?hurt.length+' of '+G.roster.length:'None'],['Carrying injuries',inj.length||'None'],['Armor to mend',need?need+' points':'None'],['Tools',tools],need?['Tools will mend',mend+' points']:null,['Time',campHour()+', until you break camp']])
  +(need>tools*tp?`<p class="pn-p warn">${tools?'Not enough tools to mend everything: forge more from scrap iron on the Craft tab, or buy them in town.':'No tools: armor stays broken. Forge some from scrap iron on the Craft tab, or buy them in town.'}</p>`:'')
  +'<p class="pn-p dim">Injuries heal a day at a time whatever you do; field surgery on the Surgery tab speeds them up.</p>';
 foot='<span class="pn-fl"><small>Until you break camp · wages and food fall due at midnight</small></span>'+campBtn(campIc('camp')+'<span>Make camp</span>','campRestTab()',true);
 return{list,detail,foot,key:'rest'}}

/* Train */
function campTrainView(){let list='',detail='',foot='';const R=G.roster.slice().sort((a,b)=>(b.field?1:0)-(a.field?1:0));let m=campMercById(CM.sel.train);if(!m)m=R[0];if(!m)return{list:pnEmpty('No one to train.'),detail:'',foot:'',key:'none'};
 CM.sel.train=m.id;list+=pnSec('Drill a sword',R.length);
 R.forEach(x=>{const T=campTrainInfo(x);list+=campRow({on:`campPick(${JSON.stringify(String(x.id)).replace(/"/g,'&quot;')})`,sel:x===m,cls:'cm-row merc'+(T.why?' cm-dimrow':''),lead:campPor(x,32),title:`${htmlEsc(x.name)} <small class="cm-lv">Lv ${x.lvl}</small>`,
  sub:`<span class="cm-line">${pnBar(campXpPct(x),'xp')}<span class="cm-t">${T.used}/${T.cap} today</span></span>`,right:T.why?`<span class="cm-why">${T.why==='Not enough crowns'?pnCoin(T.cost,'short'):T.why==='At the highest level'?'Max':T.used>=T.cap?'Done':'Hurt'}</span>`:pnCoin(T.cost)})});
 const T=campTrainInfo(m),lv=m.lvl||1,max=lv>=MAXLV||!XPT[lv+1],toNext=max?0:XPT[lv+1]-m.xp;
 detail=campHead(campPor(m,48),`${BG[m.bg]?BG[m.bg].n:'Mercenary'} · level ${lv}`,htmlEsc(m.name))
  +`<div class="cm-xp">${pnBar(campXpPct(m),'xp')}<small>${max?'Highest level':`${m.xp} XP · ${toNext} to level ${lv+1}`}</small></div>`
  +`<p class="pn-p">Sparring, drills and forced marches under a sergeant's eye: <b>${T.hours} hours</b> and coin for experience. A sword can drill <b>${T.cap} times a day</b>; the price and the lesson grow with rank.</p>`
  +pnFacts([['XP a session',max?'None':'+'+T.xp+(toNext&&T.xp>=toNext?' (levels up)':'')],['Price',T.cost+' crowns'],['Time',T.hours+' hours'],['Today',T.used+' of '+T.cap+' sessions']])
  +(T.bonus.length?`<ul class="cm-bonus">${T.bonus.map(b=>`<li>${b}</li>`).join('')}</ul>`:`<p class="pn-p dim">A drillmaster in the retinue makes drills cheaper and better; so do tactician perks in the company.</p>`)
  +(T.why?`<p class="pn-p warn">${T.why}.</p>`:'');
 foot=campCost(T.cost,T.hours,`+${T.xp} XP`)+campBtn(campIc('level')+'<span>Drill</span>',`campTrain(${JSON.stringify(String(m.id)).replace(/"/g,'&quot;')})`,!T.why);
 return{list,detail,foot,key:'m'+m.id}}

/* Surgery */
function campSurgList(){const L=[];G.roster.forEach(m=>{(typeof cpInj==='function'?cpInj(m):[]).forEach(j=>L.push({m,j}))});return L.sort((a,b)=>(a.j.perm?1:0)-(b.j.perm?1:0))}
function campSurgView(){let list='',detail='',foot='';const L=campSurgList();
 list+=pnSec('Wounds',L.length);
 if(!L.length){list+=pnEmpty('No one carries an injury.');detail=`<div class="pn-blank">${campIc('injury',48)}<p>Nobody needs the knife. Salves in the wagons: <b>${G.salve||0}</b>.</p></div>`;return{list,detail,foot,key:'none'}}
 let cur=L.find(x=>CM.sel.surgery===x.m.id+':'+x.j.id)||L[0];CM.sel.surgery=cur.m.id+':'+cur.j.id;
 L.forEach(x=>{const S=campSurgInfo(x.m,x.j.id),k=x.m.id+':'+x.j.id;list+=campRow({on:`campPick('${String(k).replace(/['"\\]/g,'')}')`,sel:x===cur,cls:'cm-row merc'+(S.why?' cm-dimrow':''),lead:campPor(x.m,32),
  title:`${htmlEsc(x.m.name)}`,sub:`<span class="cm-line">${typeof cpInjIcon==='function'?cpInjIcon(x.j.id,16):campIc('injury')}<span class="cm-t">${htmlEsc(x.j.n)}</span></span>`,right:`<span class="cm-days${x.j.perm?' perm':''}">${typeof cpInjDays==='function'?cpInjDays(x.j):x.j.days+' days'}</span>`})});
 const {m,j}=cur,S=campSurgInfo(m,j.id);
 detail=campHead(typeof cpInjIcon==='function'?cpInjIcon(j.id,48):campIc('injury',48),htmlEsc(m.name),htmlEsc(j.n))+`<p class="pn-p">${htmlEsc(j.d)}${j.lore?`<br><span class="dim">${htmlEsc(j.lore)}</span>`:''}</p>`
  +(j.perm?'<p class="pn-p warn">A permanent wound. Neither the knife nor the temple can mend it.</p>':
   pnFacts([['Heals in',j.days+' day'+(j.days===1?'':'s')],['Surgery',S.heals?'Mends it now':'−'+S.days+' days'],['Salves',(G.salve||0)+' (uses 1)'],['Time',S.hours+' hours']])
   +`<p class="pn-p">Clean the wound, set the bone, stitch and salve it: one salve and <b>${S.hours} hours</b> take <b>${S.days} days</b> off the healing. A wound can go under the knife once a day.</p>`
   +(S.bonus.length?`<ul class="cm-bonus">${S.bonus.map(b=>`<li>${b}</li>`).join('')}</ul>`:'<p class="pn-p dim">A surgeon in the retinue or a field medic in the company makes surgery faster and better.</p>')
   +(S.why?`<p class="pn-p warn">${S.why}.</p>`:''));
 if(!j.perm)foot=`<span class="pn-fl"><span class="pn-coin big${(G.salve||0)<1?' short':''}">${campIc('salve')}<b>1</b></span><small>${S.hours} hours · ${G.salve||0} salves left</small></span>`+campBtn(campIc('injury')+'<span>Operate</span>',`campSurgery(${JSON.stringify(String(m.id)).replace(/"/g,'&quot;')},'${String(j.id).replace(/['"\\]/g,'')}')`,!S.why);
 return{list,detail,foot,key:CM.sel.surgery}}

/* Craft */
function campPartChips(id){const R=RECIPES[id];return Object.keys(R.parts).map(k=>{const h=partsHave(k),n=R.parts[k];return`<span class="cm-pc${h>=n?' ok':''}" title="${PARTS[k]?PARTS[k].n:k}: ${h} of ${n}">${campIc('part-'+k)}<b>${h}/${n}</b></span>`}).join('')}
function campOutIc(id,sz){const o=RECIPES[id].out;return o.item?campItemIc(o.item,sz):campIc(o.tools?'tools':o.food?'food':'salve',sz)}
function campCraftView(){let list='',detail='',foot='';const ids=Object.keys(RECIPES);let id=RECIPES[CM.sel.craft]?CM.sel.craft:(ids.find(craftCan)||ids[0]);CM.sel.craft=id;
 for(const [c,cn] of RECIPECAT){const L=ids.filter(i=>RECIPES[i].cat===c);if(!L.length)continue;list+=pnSec(cn,L.filter(craftCan).length+'/'+L.length);
  L.forEach(i=>{const R=RECIPES[i],ok=craftCan(i),it=R.out.item&&ITEMS[R.out.item];list+=campRow({on:`campPick('${i}')`,sel:i===id,cls:'cm-row cm-rc'+(ok?' cm-ready':' cm-dimrow'),lead:campOutIc(i,32),
   title:`${it&&it.tier?`<span class="pn-tier t${it.tier}">${TIERN[it.tier]}</span> `:''}${htmlEsc(R.n)}`,sub:`<span class="cm-chips">${campPartChips(i)}</span>`,right:ok?`<span class="cm-ok">${campIc('check')}</span>`:!craftMissing(i).length&&R.crowns?pnCoin(R.crowns,'short'):''})})}
 const R=RECIPES[id],o=R.out,why=craftWhy(id),it=o.item&&ITEMS[o.item];
 detail=campHead(campOutIc(id,48),it?(typeof itemKind==='function'?itemKind(o.item):'Gear')+(it.tier?' · tier '+it.tier:'')+' · crafted':'Supplies',htmlEsc(it?it.n:R.n))+`<p class="pn-p">${htmlEsc(R.d)}</p>`;
 if(it)detail+=(typeof itemFacts==='function'?pnFacts(itemFacts(o.item)):'')+(typeof marketCompare==='function'?`${pnHead('Against what the company carries')}<div class="pn-cmps">${(()=>{try{return marketCompare(o.item)}catch(e){return''}})()}</div>`:'');
 else detail+=pnFacts([['Makes',recipeOut(id)],o.tools?['Tools now',typeof cpTools==='function'?cpTools():G.tools]:o.food?['Rations now',G.food]:['Salves now',G.salve||0]]);
 detail+=pnHead('Needs')+`<div class="cm-needs">${Object.keys(R.parts).map(k=>{const h=partsHave(k),n=R.parts[k];return`<div class="cm-need${h>=n?' ok':''}">${campIc('part-'+k,32)}<span><b>${PARTS[k].n}</b><small>${h} of ${n} in the wagons</small></span></div>`}).join('')}</div>`
  +(why?`<p class="pn-p warn">${why}.</p>`:'');
 foot=campCost(R.crowns,R.hours,recipeOut(id))+campBtn(campIc('anvil')+'<span>Craft</span>',`campCraft('${id}')`,!why);
 return{list,detail,foot,key:id}}

/* Parts */
function campPartsView(){let list='',detail='',foot='';const ks=PARTORDER.slice().sort((a,b)=>(partsHave(b)>0)-(partsHave(a)>0)||PARTS[a].tier-PARTS[b].tier);let k=PARTS[CM.sel.parts]?CM.sel.parts:ks[0];CM.sel.parts=k;
 const own=ks.filter(x=>partsHave(x)>0);list+=pnSec('In the wagons',own.length?partsTotal():0);if(!own.length)list+=pnEmpty('No parts yet. Beasts and monsters leave them when they fall.');
 const row=x=>campRow({on:`campPick('${x}')`,sel:x===k,cls:'cm-row'+(partsHave(x)?'':' cm-dimrow'),lead:campIc('part-'+x,32),title:`<span class="pn-tier t${PARTS[x].tier}">${TIERN[PARTS[x].tier]}</span> ${PARTS[x].n}`,sub:`<span class="cm-t">${partSources(x).slice(0,2).map(s=>s.n).join(', ')}</span>`,right:`<b class="cm-n">${partsHave(x)}</b>`});
 own.forEach(x=>list+=row(x));const none=ks.filter(x=>!partsHave(x));if(none.length){list+=pnSec('Not yet found',none.length);none.forEach(x=>list+=row(x))}
 const P=PARTS[k],src=partSources(k),uses=Object.keys(RECIPES).filter(i=>RECIPES[i].parts[k]);
 detail=campHead(campIc('part-'+k,48),`Monster part · tier ${P.tier}`,P.n)+`<p class="pn-p">${P.d}</p>`+pnFacts([['In the wagons',partsHave(k)],['Used in',uses.length+' recipe'+(uses.length===1?'':'s')]])
  +pnHead('Taken from')+`<div class="cm-src">${src.map(s=>`<span><b>${htmlEsc(s.n)}</b><small>${s.ch>=1?(Math.round(s.ch*10)/10)+' a kill':Math.round(s.ch*100)+'% a kill'}</small></span>`).join('')}</div>`
  +(uses.length?pnHead('Goes into')+`<div class="cm-uses">${uses.map(i=>`<button type="button" class="cm-use" onclick="CM.tab='craft';CM.sel.craft='${i}';campRender()">${campOutIc(i,16)}<span>${htmlEsc(RECIPES[i].n)}</span><small>×${RECIPES[i].parts[k]}</small></button>`).join('')}</div>`:'')
  +(craftFollower('herbalist')?'<p class="pn-p dim">The herbalist finds one more of each kind of part half the time.</p>':'');
 return{list,detail,foot,key:k}}
