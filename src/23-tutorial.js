/* ================= THE TUTORIAL CONTRACT (phase 8, systems) =================
   An optional first job for new players (the new-company sheet): goblins camped on the road a few leagues from the first town.
   Guided steps put a hint bubble over the real UI; every step finishes itself when the player has done the thing:
     go       march to the camp (the Contract button and the marker on the land)
     move     battle: plan a move (first tap) and make it (second tap)
     forecast tap a foe: the forecast window gives the odds before you commit
     attack   strike (tap again, or the forecast's Strike)
     end      end the turn (the End turn button, or Space)
     win      finish the fight
     heal     back in town: the inn rests the wounded, the temple treats injuries
     pay      the notice board: collect the pay
   Skippable at any step (tutSkip); remembered once done or skipped (TUTKEY in localStorage), so it is never offered again by default.
   State: G.tut = {step, cid (the contract id), t0 (the home town), done}. The bubble reads the state only (no rnd). */
const TUTKEY='wyrdmarch_tut_v1';
const TUTSTEPS=['go','move','forecast','attack','end','win','heal','pay'];
const TUTTXT={
 go:{h:'Your first contract',t:'Goblins are camped on the road. Tap the land near the marker to march there; time only passes while you move. The Contract button shows the job.',at:'#wbContract'},
 move:{h:'Move',t:'Tap a lit tile once to plan a move: the path, the AP it costs and what you could do from there. Tap the same tile again to go.',at:null},
 forecast:{h:'Read the odds',t:'Tap a goblin. Before anything happens, the forecast shows the chance to hit, the damage and what it does to their armor.',at:null},
 attack:{h:'Strike',t:'Happy with the odds? Tap the goblin again (or Strike in the forecast) to attack. A foe out of reach needs a move first.',at:'#fcw'},
 end:{h:'End the turn',t:'Each sword has action points (AP). When one has done all it can, end its turn here (or press Space).',at:'#bend'},
 win:{h:'Finish them',t:'Keep at it: move, read the odds, strike, end the turn. High ground helps you hit; wounded foes may break and run.',at:null},
 heal:{h:'Patch them up',t:'Back to town. Enter it, then visit the Inn to rest the wounded (or the Temple to treat injuries).',at:null},
 pay:{h:'Take the pay',t:'Open the Contracts board and collect what you are owed. That is the whole trade: work, blood, coin.',at:null}};
function tutDone(){return storeGet(TUTKEY)==='1'}
function tutWanted(){return!tutDone()}
function tutOn(){return!!(G&&G.tut&&!G.tut.done&&TUTSTEPS.includes(G.tut.step))}
function tutRepair(g){const t=g.tut;if(!svObj(t)){delete g.tut;return}g.tut={step:TUTSTEPS.includes(t.step)?t.step:'go',cid:svFin(t.cid)?Math.floor(t.cid):0,t0:Number.isInteger(t.t0)&&t.t0>=0&&t.t0<g.towns.length?t.t0:0,done:!!t.done}}
// the contract type: never on a board, made only here
if(typeof ctrRegister==='function')ctrRegister('tutorial',{n:'First contract',d:'A small job to learn the trade: drive off the goblins on the road and come back for the pay.',icon:'hint',board:false,w:()=>0,gen:()=>null});
/* tutStart(g): at new game (85-game.js createCampaign, after the towns are stocked). Draws the camp's place and the contract id from the stream. */
function tutStart(g){if(!g||!Array.isArray(g.towns)||!g.towns.length||typeof ctrNew!=='function')return null;const t=g.towns[0];
 const p=typeof randOk==='function'?randOk(t.x,t.y,3*TS,5*TS):{x:t.x+4*TS,y:t.y};
 const c=ctrNew('tutorial',t,0,1,'Goblins on the road');c.f='gob';c.x=p.x;c.y=p.y;c.pay=Math.round(140*diffK('pay')/10)*10;c.pay0=c.pay;
 c.stages=[{k:'go',x:p.x,y:p.y,kind:'lair',label:'Goblin camp',fight:{f:'gob',k:.55}},ctrHome(0,'Collect the pay')];c.due=g.day+12;c.taken=g.day;c.tickDay=g.day;
 g.contract=c;if(typeof ctrSync==='function')ctrSync(c);g.tut={step:'go',cid:c.id,t0:0,done:false};return c}
function tutSkip(){if(G&&G.tut)G.tut.done=true;storeSet(TUTKEY,'1');tutHide();if(typeof toast==='function')toast('Tutorial skipped: the contract is still yours to finish')}
function tutFinish(){if(G&&G.tut)G.tut.done=true;storeSet(TUTKEY,'1');tutHide();if(typeof sheet==='function')sheet(`<h2>${runIc('laurel',32)} The trade is learned</h2><p>March, fight, heal, get paid. The rest is choices: which work to take, who to hire, when to run. Contracts wait on the board in every town.</p><p class="dim">Hints are off from now on. How to play (in the menu) has the controls.</p><button class="pri" onclick="closeSheet()">March on</button>`)}
function tutNext(){const t=G.tut,i=TUTSTEPS.indexOf(t.step);t.step=TUTSTEPS[i+1]||'pay'}
/* the step logic, run from the shell's tick (4 times a second). Reads B / G / FC / townTab; changes only G.tut. */
const TUT={el:null,key:'',snap:null,hp:null};
function tutTick(){if(!tutOn()){tutHide();return}const t=G.tut,c=G.contract;
 if(t.step!=='pay'&&t.step!=='heal'&&(!c||c.id!==t.cid)){if(G.ctrLast&&G.ctrLast.id===t.cid&&G.ctrLast.ok){tutFinish();return}t.done=true;tutHide();return}   // the job failed or was dropped
 if(mode==='battle'&&B&&!B.over){const S=B.units.filter(u=>u.side===0),E=B.units.filter(u=>u.side===1);
  if(t.step==='go')t.step='move';
  if(!TUT.snap||TUT.snap.b!==B)TUT.snap={b:B,pos:S.map(u=>u.c+','+u.r).join('|'),hp:E.reduce((n,u)=>n+(u.alive?u.hp:0),0),turns:B.turns};
  const moved=S.map(u=>u.c+','+u.r).join('|')!==TUT.snap.pos,hit=E.reduce((n,u)=>n+(u.alive?u.hp:0),0)<TUT.snap.hp;
  if(t.step==='move'&&moved)tutNext();
  if(t.step==='forecast'&&(typeof FC==='object'&&FC&&FC.t))tutNext();
  if((t.step==='forecast'||t.step==='attack')&&hit)t.step='end'
  if(t.step==='end'){if(TUT.snap.endAt==null)TUT.snap.endAt=B.turns;else if(B.turns>TUT.snap.endAt)tutNext()}
 }else if(mode==='world'){if(['move','forecast','attack','end','win'].includes(t.step)){if(c&&c.id===t.cid&&c.stage>0)t.step='heal';else if(c&&c.id===t.cid)t.step='go'}
  if(t.step==='heal'&&G.town!=null&&G.townOpen&&typeof townTab==='string'&&(townTab==='inn'||townTab==='temple'))t.step='pay';
  if(t.step==='pay'&&G.ctrLast&&G.ctrLast.id===t.cid&&G.ctrLast.ok&&(!c||c.id!==t.cid)){tutFinish();return}}
 tutShow()}
// the hint bubble: anchored above / beside a real control when there is one, else at the top of the screen
function tutAnchor(step){const T=TUTTXT[step];if(typeof document==='undefined')return null;let el=null;
 try{if(step==='heal'||step==='pay'){const want=step==='heal'?/^(Inn|Temple)$/:/^Contracts$/;const L=document.querySelectorAll('#pnRail .pn-tab');for(const b of L){const s=b.querySelector&&b.querySelector('span');if(s&&want.test(s.textContent||'')){el=b;break}}}
  else if(T.at)el=document.querySelector(T.at)}catch(e){el=null}
 if(el&&(el.classList&&el.classList.contains('hidden')||el.hidden))el=null;if(el&&el.getBoundingClientRect){const r=el.getBoundingClientRect();if(!(r.width>0&&r.height>0))el=null}return el}
function tutShow(){if(typeof document==='undefined'||!document.createElement)return;const step=G.tut.step,T=TUTTXT[step];if(!T){tutHide();return}
 {const sh=$('sheet');if(sh&&sh.classList&&!sh.classList.contains('hidden')){tutHide();return}}
 let e=TUT.el;if(!e){e=document.createElement('div');e.id='tutTip';e.className='tut hidden';e.setAttribute('role','status');const app=$('app');if(!app||!app.appendChild)return;app.appendChild(e);TUT.el=e}
 const i=TUTSTEPS.indexOf(step)+1,k=step+'|'+i;if(TUT.key!==k){TUT.key=k;e.innerHTML=`<div class="tut-hd">${runIc('hint')}<b>${runEsc(T.h)}</b><span class="tut-n pxn">${i}/${TUTSTEPS.length}</span></div><p>${runEsc(T.t)}</p><div class="tut-ft"><button class="ghost sm tut-skip" onclick="tutSkip()">Skip tutorial</button></div><i class="tut-ar" aria-hidden="true"></i>`}
 e.classList.remove('hidden');e.classList.toggle('in-battle',mode==='battle');tutPlace(e,tutAnchor(step))}
function tutPlace(e,a){const vw=innerWidth,vh=innerHeight,w=Math.min(300,vw-24);e.style.width=w+'px';const h=e.offsetHeight||110;let x,y,dir='';
 if(a){const r=a.getBoundingClientRect(),cx=r.left+r.width/2;
  if(r.left>vw*.6){x=r.left-w-12;y=clamp(r.top+r.height/2-h/2,8,vh-h-8);dir='r'}          // controls on the right rail: the bubble to their left
  else if(r.top>vh*.55){x=clamp(cx-w/2,8,vw-w-8);y=r.top-h-12;dir='d'}
  else{x=clamp(cx-w/2,8,vw-w-8);y=r.bottom+12;dir='u'}
  const ar=e.querySelector('.tut-ar');if(ar){if(dir==='r'){ar.style.left='';ar.style.top=clamp(r.top+r.height/2-y-6,10,h-20)+'px'}else{ar.style.top='';ar.style.left=clamp(cx-x-6,12,w-24)+'px'}}}
 else if(mode==='battle'){x=8;y=vh-h-8}                                   // the board's middle stays clear: low on the left
 else{x=clamp(vw/2-w/2,8,vw-w-8);y=Math.max(52,vh*.16)}
 e.style.left=Math.round(x)+'px';e.style.top=Math.round(Math.max(8,y))+'px';e.dataset.dir=dir}
function tutHide(){if(TUT.el&&!TUT.el.classList.contains('hidden'))TUT.el.classList.add('hidden')}
// the first hint after the "company is raised" sheet closes (and after a load)
function tutKick(){if(tutOn())tutTick()}
