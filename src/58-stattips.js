/* ================= STAT TOOLTIPS =================
   Tap (or click) any element carrying data-stat="<key>" on the roster, character sheet or tavern to see what the stat does.
   Keys: hp arm helm fat init ms rs md rd brv dmg sh. The text states the actual rules (60-battle-core.js: hitChance, hurt,
   headChance, tiredPen, moraleCheck; turn order by initiative). Optional data-v="<value>" adds the merc's number to the title.
   UI only: no game state, no randomness. A tap inside a roster card shows the tip instead of opening the card. */
const STATTIP={
 hp:{n:'Hitpoints',d:'Damage that gets past armor comes off these. At 0 the sword is struck down: they may die, or live with an injury. Hitpoints come back with rest: on the road, in camp, and fastest at an inn.'},
 arm:{n:'Body armor',d:'Soaks hits to the body before they reach hitpoints. Each weapon pierces part of it (its armor-ignore share goes straight to hitpoints). Armor is beaten down in battle and stays damaged until mended with tools.'},
 helm:{n:'Helmet',d:'Soaks hits to the head. About 1 hit in 4 lands on the head (25%), and a head hit does ×1.5 damage to hitpoints once past the helmet. Mended with tools like armor.'},
 fat:{n:'Fatigue',d:'Stamina for the fight. Every step and blow costs fatigue, and 15 comes back each turn. Past half of it, a tired sword loses up to 10 to hit and is up to 10 easier to hit. Armor and helmets lower the maximum by their weight.'},
 init:{n:'Initiative',d:'Turn order. Each round the highest initiative acts first (with a small random spread), so a quick sword can strike before the foe moves.'},
 ms:{n:'Melee skill',d:'Chance to hit in close combat. The hit chance is melee skill minus the target’s melee defense, plus the weapon’s accuracy and the situation (height, flanking, morale, fatigue), always between 5% and 95%.'},
 rs:{n:'Ranged skill',d:'Chance to hit with bows, crossbows, throwing weapons and firearms. The hit chance is ranged skill minus the target’s ranged defense, minus 2 for every tile past the second and 15 per step of cover, between 5% and 95%.'},
 md:{n:'Melee defense',d:'Makes you harder to hit in close combat: every point takes one point off the attacker’s chance to hit. Shields add to it. Quicksilver (light armor) adds a tenth of initiative.'},
 rd:{n:'Ranged defense',d:'Makes you harder to hit with arrows, bolts and shots: every point takes one point off the shooter’s chance. Shields and cover add to it. Quicksilver (light armor) adds a tenth of initiative.'},
 brv:{n:'Resolve',d:'Nerve. When allies fall, heavy blows land or the line is surrounded, each sword rolls against resolve: a failed check drops morale a step (steady, wavering, breaking, fleeing), and kills give a chance to rise. Higher is steadier.'},
 dmg:{n:'Weapon damage',d:'The damage range of the weapon in hand, rolled on every hit before armor. Part of it ignores armor (the weapon’s armor-ignore share); the rest is soaked by armor or helmet first.'},
 sh:{n:'Shield',d:'Raised, a shield adds to melee and ranged defense. Some blows split it; slung on the back (for a two-handed weapon) it gives nothing.'}};
const STTIP={el:null,t:0,cur:null,at:0};
function stTipEl(){if(STTIP.el)return STTIP.el;if(typeof document==='undefined')return null;const e=document.createElement('div');e.className='st-tip';e.setAttribute('role','tooltip');e.hidden=true;document.body.appendChild(e);STTIP.el=e;return e}
function stTipHide(){const e=STTIP.el;if(e)e.hidden=true;STTIP.cur=null;if(STTIP.t){clearTimeout(STTIP.t);STTIP.t=0}}
function stTipShow(target){const k=target&&target.getAttribute('data-stat'),T=STATTIP[k];if(!T)return false;const e=stTipEl();if(!e)return false;
 if(STTIP.cur===target&&!e.hidden){stTipHide();return true}                                 // a second tap on the same stat closes it
 const v=target.getAttribute('data-v'),ic=typeof STATIC==='object'&&STATIC[k]?STATIC[k]:k==='dmg'?'swords':k==='sh'?'shield':k==='arm'?'armor-light':k==='helm'?'helmet':null;
 e.innerHTML=`<b>${typeof pnIcon==='function'&&ic?pnIcon(ic,'',16):''}${htmlEsc(T.n)}${v!=null&&v!==''?`<span class="st-v">${htmlEsc(v)}</span>`:''}</b><p>${htmlEsc(T.d)}</p>`;
 e.hidden=false;STTIP.cur=target;STTIP.at=Date.now();
 const r=target.getBoundingClientRect(),W=window.innerWidth,H=window.innerHeight,w=Math.min(280,W-16);e.style.width=w+'px';
 const h=e.offsetHeight,x=Math.max(8,Math.min(W-w-8,r.left+r.width/2-w/2)),below=r.bottom+8+h<=H-8,y=below?r.bottom+8:Math.max(8,r.top-8-h);
 e.style.left=Math.round(x)+'px';e.style.top=Math.round(y)+'px';
 if(STTIP.t)clearTimeout(STTIP.t);STTIP.t=setTimeout(stTipHide,7000);return true}
if(typeof document!=='undefined'&&document.addEventListener){
 document.addEventListener('click',ev=>{const t=ev.target&&ev.target.closest?ev.target.closest('[data-stat]'):null;
  if(t&&STATTIP[t.getAttribute('data-stat')]){ev.stopPropagation();ev.preventDefault();stTipShow(t);return}
  if(STTIP.cur)stTipHide()},true);                                                          // capture: the tip wins over the card's own tap
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&STTIP.cur)stTipHide()});
 window.addEventListener('resize',()=>{if(STTIP.cur)stTipHide()});
 document.addEventListener('scroll',()=>{if(STTIP.cur&&Date.now()-STTIP.at>400)stTipHide()},true)}   // the tap's own scroll-into-view does not close it
