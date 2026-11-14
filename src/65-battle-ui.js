function endTurn(){if(B&&!B.busy&&!B.over&&B.cur.side===0)nextTurn()}
/* ---- adapters over the Phase 5 rules: every reader works whether or not a rule is loaded, and never throws ---- */
const SHV={rev:0};                                                    // bumped whenever unit state may have changed: cached overlays re-read their unit
function shStatuses(u){let L=null;try{if(typeof statusList==='function')L=statusList(u);else if(typeof unitStatuses==='function')L=unitStatuses(u)}catch(e){}
 if(!Array.isArray(L)){L=[];const st=u.st||{};for(const k in st)if(st[k]>0)L.push({key:k,turns:st[k]});if(u.rooted&&!(st.root>0))L.push({key:'root',turns:0});
  for(const b of u.buffs||[]){if(b.foe)continue;const k=b.key||(b.indom?'indom':'buff');if(!L.some(x=>x.key===k))L.push({key:k,turns:b.dur})}}
 for(let i=L.length-1;i>=0;i--){const x=L[i];if(!x||!x.key||(x.key==='buff'&&x.turns>999)){L.splice(i,1);continue}if(!(x.turns<99))x.turns=0}   // a carrier buff that never ends (the foes' passives) is not a status; endless ones show no count
 return L}
function shStatus(k){const S=typeof STATUS==='object'&&STATUS&&STATUS[k];return S||SH_ST[k]||null}
const SH_ST={burn:{n:'Burning',d:'Takes damage at the start of each of its turns.',good:0},chill:{n:'Chilled',d:'Loses action points on its next turn.',good:0},root:{n:'Rooted',d:'Cannot move.',good:0},stun:{n:'Stunned',d:'Loses its next turn.',good:0},
 indom:{n:'Indomitable',d:'Takes half damage and cannot be knocked back.',good:1},buff:{n:'Bolstered',d:'Under a helpful effect.',good:1}};
function shMor(u){return u&&typeof u.mor==='number'&&!u.fearless?clamp(u.mor|0,0,4):-1}           // -1: this unit never tests morale (or the rules have none)
const shMorN=m=>(typeof MORN==='object'&&MORN&&MORN[m])||['Fleeing','Breaking','Wavering','Steady','Confident'][m]||'';
const SH_MORC=['#ef8a78','#ff8a3c','#ecc64f','#9fe0cd','#f3d98b'];
function shBrv(u){try{return typeof u.brv==='number'?Math.round(eff(u,'brv')):null}catch(e){return null}}
function shLos(u,t,a){try{if(typeof losInfo==='function'){const l=losInfo(u,t,a);if(l)return l}}catch(e){}return SH_NOLOS}
const SH_NOLOS={blocked:false,cover:0,ff:[]};
function shEdge(u){return typeof EDGE==='object'&&EDGE?EDGE[u.side?1:0]:u.side?0:BH-1}
function shTiles(x){return x&&x.keys?x.keys:null}                                                  // a telegraph's tile keys (B.tele entries are {u,n,keys})
function shReserves(){return B&&Array.isArray(B.reserves)?B.reserves:[]}
function shCanReserve(){try{return typeof canCallReserve==='function'&&!!canCallReserve()}catch(e){return false}}
function shWhyNoReserve(){if(!B)return'';if(!shReserves().length)return'Nobody is waiting in reserve.';if(B.retreat)return'The retreat has been sounded.';
 if(B.resRound===B.round)return'One reserve a round: the next can come in when the round turns.';
 if(B.units.filter(u=>u.alive&&u.side===0).length>=(typeof MAXFIELD==='number'?MAXFIELD:12))return'The field is full: twelve swords at most.';
 return'No free ground on your edge of the field.'}
/* ---- arms: the weapon in hand, the backup, the shield, the ranged lock (rules in 60-battle-core / 61-talents; readers here never throw) ---- */
function shItem(x){if(!x)return null;if(typeof x==='object')return x;return typeof ITEMS==='object'&&ITEMS[x]||null}
function shHand(u){if(!u)return null;if(u.wid!==undefined)return shItem(u.wid)||(u.wid==null?(typeof FIST==='object'?FIST:null):u.wpn);return u.wpn||null}
function shAlt(u){if(!u)return null;if(!u.m&&u.wpnAlt)return u.wpnAlt;if(u.m&&u.alt!==undefined)return shItem(u.alt)||(u.alt===null&&u.hand==='b'&&u.wid!=null?(typeof FIST==='object'?FIST:null):null);if(u.altW)return shItem(u.altW);if(u.m&&u.m.eq&&u.m.eq.b)return shItem(u.m.eq.b);if(u.def&&u.def.side){const sw=u.wpn&&u.def.rng&&u.wpn.wt!=='bow';return sw?{n:'Bow',wt:'bow',two:1}:shItem(u.def.side)}return null}
function shWIcon(w){const wt=w&&w.wt;return wt&&typeof icHas==='function'&&icHas(wt)?wt:wt==='bow'?'bow':w?'sword':'fist'}
function shWName(w){return w?w.n||(w.wt?w.wt[0].toUpperCase()+w.wt.slice(1):'Weapon'):'Bare hands'}
// a shield that is carried but slung on the back (two-handed weapon in hand): no defence, no shield skills
function shSlung(u){if(!u||!(u.shpMax>0))return false;if(u.slung!==undefined)return!!u.slung&&u.shp>0;if(!u.shield)return false;try{if(typeof shieldSlung==='function')return!!shieldSlung(u)}catch(e){}if(u.shUp!==undefined)return!u.shUp;const w=shHand(u);return!!(w&&w.two)}
function shBowAb(u,a){if(!a||a.magic)return false;return a.needs==='bow'||(!!a.wpn&&!!u.wpn&&u.wpn.wt==='bow')}
function shLockedNow(u){if(!u||!u.alive||!B)return false;try{if(typeof rangedLocked==='function')return!!rangedLocked(u)}catch(e){}
 return B.units.some(e=>e.alive&&e.side!==u.side&&!e.gone&&mdist(e,u)===1&&e.mor!==0&&!(e.st&&e.st.stun))}
function shLocked(u,a){if(!u)return false;if(a){if(!shBowAb(u,a)||a.noBow||(a.needs&&u.wpn&&u.wpn.wt!==a.needs))return false}else if(!(u.wpn&&u.wpn.wt==='bow'))return false;return shLockedNow(u)}
const SH_LOCKTXT='Ranged lock: an enemy is adjacent';
function shCanSwap(u){try{if(typeof canSwap==='function')return!!canSwap(u)}catch(e){}return!!shAlt(u)}
/* why an ability cannot be used now, in a few words ('' when it can) */
function shWhyNot(u,a){if(!u||!a)return'';try{if(canUse(u,a)&&!shLocked(u,a))return''}catch(e){}if(u.mor===0)return'Fleeing: will not take orders';
 if(shLocked(u,a))return SH_LOCKTXT;
 if((a.swapW||a.id==='swap')&&!shCanSwap(u))return'No backup weapon';
 try{if(typeof useBlock==='function'){const r=useBlock(u,a);if(r)return r}}catch(e){}
 if(u.ap<a.ap)return'Needs '+a.ap+' AP ('+u.ap+' left)';if(u.fat+(a.fat||0)>u.fatMax)return'Too tired: '+(u.fatMax-u.fat)+' stamina left';
 if(a.cost&&(!u.res[a.cost[0]]||u.res[a.cost[0]].cur<a.cost[1]))return'Needs '+a.cost[1]+' '+(RESN[a.cost[0]]||a.cost[0]);
 if(a.needs&&u.wpn&&u.wpn.wt!==a.needs)return'Needs a '+a.needs+' in hand';if(a.two&&!(u.wpn&&u.wpn.two))return'Needs a two-handed weapon in hand';
 if(a.shield)return shSlung(u)?'Shield slung: a two-handed weapon is in hand':'No intact shield';
 if(a.once&&u.used&&u.used[a.id])return'Already used this battle';if(a.withdraw)return'Only from your own edge of the field';return'Not usable now'}
function endTurn(){if(B&&!B.busy&&!B.over&&B.cur.side===0)nextTurn()}
/* Sound the retreat: the text says what the rules will do (soundRetreat in 60-battle-core.js, the crowns in 68-battle-flow.js). */
function retreat(){if(!B||B.busy||B.over)return;const us=B.units.filter(u=>u.alive&&u.side===0),eng=us.filter(u=>B.units.some(e=>e.alive&&e.side!==u.side&&mdist(e,u)===1)),lost=G.crowns-Math.floor(G.crowns*.9),src=B.opts&&B.opts.src||{};
 const hasR=typeof soundRetreat==='function';let p;
 if(!hasR)p='<p>The company breaks off and scatters.</p>';
 else if(!eng.length)p='<p>No sword is locked in melee: all '+us.length+' leave the field at once, alive.</p>';
 else p='<p>'+(us.length-eng.length?(us.length-eng.length)+' of your swords are free and leave at once. ':'')+'<b class="bad">'+eng.length+' '+(eng.length===1?'is':'are')+' engaged</b>: each takes a free blow from every foe beside '+(eng.length===1?'it':'them')+' first, then leaves if still standing.</p><p class="dim">Engaged: '+eng.map(u=>esc(u.name)).join(', ')+'.</p>';
 const cost=[];if(src.type==='lair')cost.push('the contract fought here is forfeit');else if(src.type==='dun')cost.push('the rift throws you out');if(lost>0)cost.push('you drop a tenth of your crowns on the run (<span class="coin">'+lost+'</span>)');
 cost.push('nobody earns xp or loot');
 sheet('<h2>Sound the retreat?</h2>'+p+'<p>'+cost.join(', ').replace(/^./,c=>c.toUpperCase())+'.</p>'+(hasR?'<p class="dim">One sword can also slip away alone: stand on your own edge of the field and use Withdraw.</p>':'')
  +'<div class="row"><button class="warn" onclick="closeSheet();doRetreat()">Sound the retreat</button><button class="pri" style="flex:1" onclick="closeSheet()">Fight on</button></div>')}
function doRetreat(){if(!B||B.over)return;G.crowns=Math.floor(G.crowns*.9);fcClear();
 if(typeof soundRetreat==='function'){try{const p=soundRetreat();if(p&&p.catch)p.catch(()=>{});updateBUI();return}catch(e){}}
 B.over=true;B.busy=true;B.fled=true;endBattle(false)}
/* Reserves: who waits behind the line, and the one tap that brings a sword in (callReserve). */
function reservesSheet(){if(!B||B.over)return;const R=shReserves(),ok=shCanReserve()&&!B.busy&&B.cur&&B.cur.side===0&&!B.auto;let h='<h2>Reserves</h2>';
 h+='<p class="'+(ok?'dim':'bad')+'">'+(ok?'One reserve may enter each round, on your own edge of the field. It acts from the next round.':shCanReserve()?'Wait for one of your own turns to call a reserve in.':shWhyNoReserve())+'</p><div class="rsv">';
 for(const m of R){let st=null;try{st=calc(m)}catch(e){}const c=typeof armorCond==='function'?armorCond(m):null,w=st&&st.wpn?st.wpn.n:'',inj=Array.isArray(m.inj)?m.inj.length:0;
  h+='<button class="rsv-m" '+(ok?'':'disabled')+' onclick="hudCallReserve('+m.id+')">'+port(m,32)+'<span class="rsv-b"><b>'+esc(m.name)+'<small>'+m.lvl+'</small></b><span>'+pic('hp',16,'heart')+m.hp+(st?'/'+st.hp:'')
   +(c&&c.hMax?' '+pic('helmet',16,'shield')+c.h:'')+(c&&c.aMax?' '+pic('armor',16,'shield')+c.a:'')+(inj?' '+pic('injury',16,'skull')+inj:'')+'</span><i>'+esc(w)+'</i></span></button>'}
 sheet(h+'</div><button class="pri" onclick="closeSheet()">Close</button>')}
function hudCallReserve(id){if(!B||B.over||B.busy||!shCanReserve())return;closeSheet(true);let u=null;try{u=callReserve(id)}catch(e){}if(!u)toast(shWhyNoReserve());else{B.cam.tx=u.sx;B.cam.ty=u.sy-10}updateBUI()}
function selAb(id){const u=B.cur;if(B.busy||u.side!==0)return;fcClear();const a=abilityInfo(u,id);
 if(a.withdraw){if(!canUse(u,a))return;if(B.sel===id){useAbility(u,a,key(u.c,u.r));return}B.sel=id;B.targets=new Set([key(u.c,u.r)]);B.selKind='move';updateBUI();return}   // irreversible: the first tap arms it, the second (or a tap on the unit) leaves
 if(B.sel===id){B.sel=null;B.targets=null;updateBUI();return}if(!canUse(u,a)||shLocked(u,a)){abHint(id);if(shLocked(u,a))fxLockPopSafe(u);return}
 if(a.tgt==='self'){useAbility(u,a,key(u.c,u.r));return}
 if(a.tgt==='aoe'){if(!B.units.some(t=>t.alive&&t.side!==u.side&&mdist(u,t)===1)){toast('No foe is adjacent');return}useAbility(u,a,key(u.c,u.r));return}
 const ts=validTargets(u,a);if(!ts.size){toast('Nothing in reach for '+a.n);return}B.sel=id;B.targets=ts;B.selKind=a.tgt;updateBUI()}
// The tile (or the unit standing in front of it) under a board-space point; -1 off the board.
function pickKey(mx,my){if(typeof pickAtBoard==='function')return pickAtBoard(mx,my);   // the renderer's picking follows the view rotation and the cliffs
 const us=B.units.filter(x=>x.alive).sort((a,b)=>(b.c+b.r)-(a.c+a.r));for(const x of us)if(Math.abs(mx-x.sx)<15&&my<x.sy+6&&my>x.sy-46)return key(x.c,x.r);
 for(let d=BW+BH-2;d>=0;d--)for(let c=0;c<BW;c++){const r=d-c;if(r<0||r>=BH)continue;const p=tpos(c,r,B.tiles[key(c,r)].h);if(Math.abs(mx-p.x)/HW+Math.abs(my-p.y)/HH<=1)return key(c,r)}return -1}
// What a tap on tile k would strike with right now: the armed ability, else the plain attack. null when it would not strike.
function aimAt(k){if(!B||B.busy||B.over||!B.cur||B.cur.side!==0||B.auto||k<0)return null;const u=B.cur,t=unitAt(k%BW,(k/BW)|0);if(!t||t.side===u.side)return null;
 if(B.sel){const a=abilityInfo(u,B.sel);if(a.tgt!=='enemy')return null;if(B.targets&&B.targets.has(k))return{u,t,a,k,blocked:false};
  if(mdist(u,t)<=a.rng&&shLocked(u,a))return{u,t,a,k,blocked:true,lock:true};
  return mdist(u,t)<=a.rng&&canUse(u,a)&&shLos(u,t,a).blocked?{u,t,a,k,blocked:true}:null}
 const a=abilityInfo(u,'attack');if(mdist(u,t)<=a.rng&&shLocked(u,a))return{u,t,a,k,blocked:true,lock:true};return mdist(u,t)<=a.rng&&canUse(u,a)?{u,t,a,k,blocked:!!shLos(u,t,a).blocked}:null}
function unitLine(t){const m=shMor(t);return t.name+': '+t.hp+'/'+t.hpMax+' HP'+(t.helmMax>0?', helmet '+t.helm:'')+(t.armMax>0?', armor '+t.arm:'')+(t.shpMax>0?(t.shield?', shield '+t.shp:shSlung(t)?', shield slung':', shield split'):'')+(m>=0&&m!==3?', '+shMorN(m).toLowerCase():'')}
function battleTap(mx,my){if(!B||B.busy||B.over||B.cur.side!==0)return;const u=B.cur,k=pickKey(mx,my);logClose();
 if(k<0){fcClear();B.sel=null;B.targets=null;updateBUI();return}const c=k%BW,r=(k/BW)|0,t=unitAt(c,r),aim=aimAt(k);
 if(aim&&aim.blocked){fcShow(aim,false);if(aim.lock){say(SH_LOCKTXT+': '+u.name+' cannot shoot. Swap to a sidearm or step away.');fxLockPopSafe(u)}else say('No line of fire to '+t.name+'.');updateBUI();return}
 if(aim){if(SET.confirm&&!(FC.armed&&FC.k===k&&FC.id===aim.a.id)){fcShow(aim,true);updateBUI();return}fcClear();useAbility(u,aim.a,k);return}
 fcClear();
 if(B.sel){if(B.targets.has(k)){useAbility(u,abilityInfo(u,B.sel),k);return}B.sel=null;B.targets=null;updateBUI();return}
 if(t&&t.side===1){const a=abilityInfo(u,'attack');say(unitLine(t)+(mdist(u,t)<=a.rng?'':', out of reach')+'.');return}
 if(t&&t.side===0){say(unitLine(t)+'.');return}
 if(B.reach&&B.reach.has(k)&&k!==key(u.c,u.r)){const path=pathTo(B.reach,k);B.busy=true;B.reach=null;walkPath(u,path).then(()=>{B.busy=false;afterAction()});return}
 const tl=B.tiles[k];say(`${tl.t==='block'?'Impassable':tl.t==='rough'?'Rough ground':tl.t==='haz'?'Burning ground':'Open ground'}, height ${tl.h}.`)}

/* ================= BATTLE HUD =================
   Small floating pixel windows over a full-bleed map: unit chip + one-line log (top left), turn tokens (top),
   command buttons (top right), ability tiles + end turn (bottom right), a hint label above them, and two
   windows made here at run time: the forecast (#fcw, floats beside the target) and the log drawer (#logw).
   Icons come from pxIcon() and portraits from portraitHTML() when those exist; inline SVG / initials otherwise. */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ico=(n,c)=>`<svg class="ic ${c||''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
function pic(name,size,svg){size=size||16;if(typeof pxIcon==='function'){try{return pxIcon(name,size,'pxi')}catch(e){}}
 if(typeof iconRows==='function'){try{const r=iconRows(name),u=r?pxURL('hud:'+name,r,1):'';if(u)return'<img class="pxi" src="'+u+'" width="'+size+'" height="'+size+'" alt="" draggable="false" style="display:block;flex:none;width:'+size+'px;height:'+size+'px;image-rendering:pixelated">'}catch(e){}}
 return ico(svg||name)}
function uInit(n){const w=String(n).trim().split(/\s+/);return(w.length>1?w[0][0]+w[1][0]:w[0].slice(0,2)).replace(/^./,c=>c.toUpperCase())}
const _portC=typeof WeakMap==='function'?new WeakMap():null;
function port(u,size){size=size||32;if(typeof portraitHTML==='function'){try{const c=_portC&&_portC.get(u);if(c&&c[size])return c[size];const h=portraitHTML(u,size);if(h){if(_portC){const o=c||{};o[size]=h;_portC.set(u,o)}return h}}catch(e){}}
 return'<span class="pfb s'+u.side+'" style="width:'+size+'px;height:'+size+'px">'+esc(uInit(u.name))+'</span>'}
function setHTML(id,h){const e=$(id);if(!e||e._h===h)return false;const st=e.scrollTop,sl=e.scrollLeft;e.innerHTML=h;e._h=h;e.scrollTop=st;e.scrollLeft=sl;return true}
function focusUnit(id){if(!B)return;const u=B.units[id];if(!u||!u.alive)return;B.cam.tx=u.sx;B.cam.ty=u.sy-10;say(unitLine(u)+'.')}
const ABICO={shove:'a-shove',aimed:'a-aim',pin:'a-pin',footwork:'a-step',adren:'a-bolt',indom:'a-ward',bolt:'a-orb',fireball:'a-flame',blink:'a-blink',chain:'a-chain',astrike:'a-slash',awave:'a-wave',crush:'a-hammer',adash:'a-dash',flame:'a-flame',frost:'a-snow',gale:'a-wind',thunder:'a-burst',reinforce:'a-guard',mend:'a-cross',empower:'a-up',swift:'a-clock'};
const WTICO={sword:1,axe:1,mace:1,dagger:1,spear:1,bow:1,staff:1,fist:1};
function abIcon(u,id,size){if(id==='attack'||id==='aoo'){const wt=u.wpn&&u.wpn.wt;return pic(WTICO[wt]?wt:'ab-attack',size,wt==='bow'?'a-bow':'sword')}
 if(id==='spell')return pic('ab-bolt',size,'a-orb');return pic('ab-'+id,size,ABICO[id]||'a-burst')}
const STSVG={burn:'a-flame',chill:'a-snow',root:'a-pin',stun:'a-burst',buff:'a-up',indom:'a-ward'},STC={burn:'#ff8a3c',chill:'#8fd8ff',root:'#9bd96f',stun:'#ecc64f',buff:'#e9e0c9',indom:'#c8d0d8'};
/* one status badge: icon, a count (turns, or `extra` such as a chance), colour by what it does to the bearer */
function stIcon(k,n,extra){const S=shStatus(k),col=STC[k]||(S&&S.good?'#9bd96f':'#ef8a78'),nm=S?S.n:k;
 return'<span class="sd'+(S&&S.good?' gd':'')+'" style="--sc:'+col+'" title="'+esc(nm+(n>0?' ('+n+(n===1?' turn':' turns')+')':'')+(S&&S.d?': '+S.d:''))+'">'+pic('st-'+k,16,STSVG[k]||'a-burst')+(n>1||extra?'<b>'+(extra||n)+'</b>':'')+'</span>'}
let ABDESC=null;
function abDesc(id,u){if(id==='attack')return u.wpn.wt==='bow'?'Loose an arrow at a foe in range':'Strike a foe in reach';if(AB[id]&&AB[id].d)return AB[id].d;
 if(!ABDESC){ABDESC={};for(const k in MAST){const T=MAST[k],L=Array.isArray(T.tiers)?[].concat(...T.tiers):Array.isArray(T.p)?T.p:[];for(const p of L)if(p&&p.ab&&p.d)ABDESC[p.ab]=p.d.replace(/^Unlocks[^.]*\.\s*/,'').replace(/^Ability:\s*/,'')}}
 const d=ABDESC[id]||'';return d?d[0].toUpperCase()+d.slice(1):''}
function abLine(u,a){const d=abDesc(a.id,u);return'<b>'+esc(a.n)+'</b><span>'+a.ap+' AP'+(a.fat>0?' · '+a.fat+' fat':'')+(a.cost?' · <em style="color:'+RESC[a.cost[0]]+'">'+a.cost[1]+' '+RESN[a.cost[0]]+'</em>':'')+'</span>'+(d&&d.toLowerCase()!==String(a.n).toLowerCase()?'<i>'+esc(d)+'</i>':'')}
let abPeek=null,abPeekT=0;
function abHint(id){abPeek=id;clearTimeout(abPeekT);abPeekT=setTimeout(()=>{abPeek=null;updateBUI()},2600);updateBUI()}
function orderHTML(u){const tok=(x,cls)=>{const hp=Math.max(0,Math.round(100*x.hp/x.hpMax)),m=shMor(x),fl=m===0,tele=B.tele&&B.tele.length&&B.tele.some(q=>q.u===x);
  return'<button class="oc s'+x.side+' '+cls+(fl?' flee':m===1?' brk':'')+(tele?' tele':'')+'" onclick="focusUnit('+x.id+')" aria-label="'+esc(x.name)+', '+x.hp+' of '+x.hpMax+' hitpoints'+(m>=0&&m!==3?', '+shMorN(m).toLowerCase():'')+'" title="'+esc(x.name)+(fl?' (fleeing)':'')+'">'+port(x,32)
   +(fl?'<span class="omk">'+pic('morale-0',16,'flag')+'</span>':tele?'<span class="omk">'+pic('telegraph',16,'a-burst')+'</span>':'')+'<i class="ohp'+(hp<34?' low':'')+'"><b style="width:'+hp+'%"></b></i></button>'};
 const rest=B.order.filter(x=>x&&x.alive);
 return'<span class="rnd" title="Round '+B.round+'"><small>RND</small>'+B.round+'</span>'+tok(u,'cur')+rest.map(x=>tok(x,'')).join('')}
function statI(icon,svg,val,cls,title,col){return'<span class="si '+cls+'" title="'+title+'"'+(col?' style="color:'+col+'"':'')+'>'+pic(icon,16,svg)+'<b>'+val+'</b></span>'}
function chipStatuses(u){let h='';const L=shStatuses(u);for(let i=0;i<L.length&&i<6;i++)h+=stIcon(L[i].key,L[i].turns|0);if(L.length>6)h+='<span class="sd" style="--sc:#b9ad8f"><b>+'+(L.length-6)+'</b></span>';return h}
/* unit chip: name, level, morale (flag icon in the state's colour) with resolve, statuses; hitpoints, head and body armor, shield, stamina, gifts; action pips */
function cardHTML(u){const mine=u.side===0,n=Math.max(u.apMax,u.ap),m=shMor(u),brv=shBrv(u);let pips='';for(let i=0;i<n;i++)pips+='<i class="'+(i<u.ap?'on':'')+(i>=u.apMax?' x':'')+'"></i>';
 let h='<span class="uport s'+u.side+'">'+port(u,32)+'</span><div class="ubody"><div class="uname"><b>'+esc(u.name)+'</b>'+(mine?'<small class="ulv" title="Level '+u.lvl+'">'+u.lvl+'</small>':'')+chipArms(u)+chipStatuses(u)+'</div><div class="ustats">'+statI('hp','heart',u.hp,'hp','Hitpoints '+u.hp+' of '+u.hpMax);
 if(u.helmMax>0)h+=statI('helmet','shield',u.helm,'arm hd'+(u.helm<=0?' out':''),'Head armor '+u.helm+' of '+u.helmMax);
 if(u.armMax>0)h+=statI('armor','shield',u.arm,'arm'+(u.arm<=0?' out':''),'Body armor '+u.arm+' of '+u.armMax);
 if(u.shpMax>0){const sl=shSlung(u),ok=u.shield||sl;h+=statI(!ok?'st-splitshield':sl?'slung':'shield','shield',ok?u.shp:0,'arm sh'+(ok?'':' out')+(sl?' sl':''),!ok?'Shield split':sl?'Shield slung on the back ('+u.shp+' of '+u.shpMax+'): no defence and no shield skills while a two-handed weapon is in hand':'Shield raised: '+u.shp+' of '+u.shpMax)}
 h+='</div><div class="urow"><div class="pips" title="Action points '+u.ap+'">'+pips+'</div>';
 if(m>=0)h+='<span class="umor m'+m+'" style="--sc:'+SH_MORC[m]+'" title="'+shMorN(m)+(brv!=null?': resolve '+brv:'')+'">'+pic('morale-'+m,16,'flag')+(brv!=null?'<b>'+brv+'</b>':'')+'</span>';
 else if(u.fearless)h+='<span class="umor" style="--sc:#c8d0d8" title="Fearless: never tests morale">'+pic('resolve',16,'flag')+'</span>';
 if(u.fatMax<=999)h+=statI('fatigue','drop',u.fatMax-u.fat,'fat','Stamina left: fatigue '+u.fat+' of '+u.fatMax);
 for(const k in u.res)h+=statI(k,'gem',u.res[k].cur,'res',RESN[k]+' '+u.res[k].cur+' of '+u.res[k].max,RESC[k]);
 return h+'</div></div>'}
/* the weapon in hand (and, small, the backup) on the chip's name row; a lock when a bow in hand is pinned by an adjacent foe */
function chipArms(u){const w=shHand(u),a=shAlt(u);if(!w&&!a)return'';const lk=shLocked(u);
 return'<span class="uwp'+(lk?' lk':'')+'" title="'+esc('In hand: '+shWName(w)+(a?' · backup: '+shWName(a):'')+(lk?' · '+SH_LOCKTXT:''))+'">'+pic(shWIcon(w),16,'sword')+(a?'<i>'+pic(shWIcon(a),16,'sword')+'</i>':'')+(lk?pic('ranged-lock',16,'a-burst'):'')+'</span>'}
function chipInspect(){try{if(!B||!B.cur||typeof Inspect==='undefined'||typeof unitCard!=='function')return;if(Inspect.visible){Inspect.hide();return}const r=$('uinfo').getBoundingClientRect();Inspect.show(unitCard(B.cur),r.left+8,r.bottom+60,false);Inspect.release()}catch(e){}}
function cmdHTML(u,mine){const act=mine&&!B.busy&&!B.over,R=shReserves(),rok=act&&shCanReserve(),canR=typeof canRetreat==='function'?canRetreat():true;
 return'<button class="tg pxb icon '+(SPEEDF<1?'on':'')+'" aria-pressed="'+(SPEEDF<1)+'" aria-label="Fast battle speed" title="Fast" onclick="toggleFast()">'+pic('fast',32,'fast')+'</button>'
 +'<button class="tg pxb icon '+(B.auto?'on':'')+'" aria-pressed="'+!!B.auto+'" aria-label="Auto-battle" title="Auto-battle" '+(B.over?'disabled':'')+' onclick="toggleAuto()">'+pic('auto',32,'auto')+'</button>'
 +'<button class="tg pxb icon warn" aria-label="Sound the retreat" title="Sound the retreat" '+(act&&canR?'':'disabled')+' onclick="retreat()">'+pic('retreat',32,'flag')+'</button>'
 +'<button class="tg pxb icon" aria-label="Settings" title="Settings" onclick="settingsSheet()">'+pic('settings',32,'sun')+'</button>'
 +'<span class="vw">'+(R.length?'<button class="tg pxb icon sm rsvb'+(rok?' rdy':'')+'" aria-label="Reserves: '+R.length+' waiting'+(rok?', one can be called in':'')+'" title="Reserves ('+R.length+')" '+(B.over?'disabled':'')+' onclick="reservesSheet()">'+pic('reserve',16,'flag')+'<em>'+R.length+'</em></button>':'')
 +(typeof rotateView==='function'&&typeof viewIcon==='function'?'<button class="tg pxb icon sm" aria-label="Turn the view left" title="Turn left (Q)" onclick="rotateView(-1)">'+viewIcon('rotl',16)+'</button>'
  +'<button class="tg pxb icon sm" aria-label="Turn the view right" title="Turn right (E)" onclick="rotateView(1)">'+viewIcon('rotr',16)+'</button>'
  +'<button class="tg pxb icon sm '+(VIEW.heights?'on':'')+'" aria-pressed="'+!!VIEW.heights+'" aria-label="Show heights" title="Heights (H)" onclick="toggleHeights()">'+viewIcon('heights',16)+'</button>':'')+'</span>'}
/* the ability ids on the bar: attack, the unit's own, and Withdraw while it stands on its own edge of the field */
function barIds(u){const ids=['attack'];for(const id of u.abs||[])if(id!=='attack'&&id!=='swap'&&AB[id]&&!AB[id].swap&&!ids.includes(id))ids.push(id);
 if(AB.withdraw&&!ids.includes('withdraw')&&u.r===shEdge(u))ids.push('withdraw');return ids}
function updateBUI(){if(!B)return;const u=B.cur;if(!u)return;const mine=u.side===0&&!B.auto&&u.mor!==0;fcCheck();
 if(setHTML('order',orderHTML(u))){const o=$('order');if(o)o.scrollLeft=0}
 setHTML('uinfo',cardHTML(u));
 const bl=$('blog');if(bl&&bl.textContent!==(B.log||''))bl.textContent=B.log||'';
 let hdr='',h='',dense=false;
 if(!mine)h='<div class="await s'+u.side+'"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><b>'+esc(u.name)+'</b><span>'+(u.mor===0?'fleeing':u.side===0?'auto':'acting')+'</span></div>';
 else{const ids=barIds(u),show=B.sel||(FC.t?FC.id:null)||(ids.includes(abPeek)?abPeek:null);dense=ids.length>6;
  const swapOK=AB.swap&&(shAlt(u)||shCanSwap(u));if(abPeek==='swap'&&swapOK&&!show)show='swap';
  if(show){const sa=abilityInfo(u,show),why=B.sel===show||FC.t?'':shWhyNot(u,sa);hdr=(show==='swap'?pic('swap',16,'a-burst'):abIcon(u,show,16))+abLine(u,sa)+(FC.armed?'<u>Tap again to strike</u>':FC.t&&FC.lock?'<u class="bad">'+SH_LOCKTXT+'</u>':FC.t&&FC.blocked?'<u class="bad">No line of fire</u>':B.sel?'<u>'+(sa.withdraw?'Tap again to leave the field':'Tap a '+(sa.tgt==='move'?'tile':sa.tgt==='ally'?'comrade':'foe'))+'</u>':why?'<u class="bad">'+(why===SH_LOCKTXT?pic('ranged-lock',16,'a-burst'):'')+esc(why)+'</u>':'')}
  ids.forEach(id=>{const a=abilityInfo(u,id),lk=shLocked(u,a),ok=!lk&&canUse(u,a)&&!B.busy;
   h+='<button class="ab pxb '+(B.sel===id?'sel on':'')+(a.withdraw?' wd':'')+(ok?'':' off')+(lk?' lk':'')+'" aria-disabled="'+!ok+'" aria-pressed="'+(B.sel===id)+'" aria-label="'+esc(a.n)+', '+a.ap+' AP'+(a.cost?', '+a.cost[1]+' '+RESN[a.cost[0]]:'')+(lk?', '+SH_LOCKTXT.toLowerCase():'')+'" title="'+esc(a.n+(lk?' ('+SH_LOCKTXT.toLowerCase()+')':''))+'" onpointerdown="abHint(\''+id+'\')" onclick="selAb(\''+id+'\')"'+(a.cost?' style="--rc:'+RESC[a.cost[0]]+'"':'')+'>'+abIcon(u,id,32)+'<b class="apc">'+a.ap+'</b>'+(a.cost?'<em class="rcc">'+a.cost[1]+'</em>':'')+(lk?'<i class="lkb">'+pic('lock',16,'a-burst')+'</i>':'')+'</button>'})}
 const hd=$('ahdr');if(hd&&hd._h!==hdr){hd.innerHTML=hdr;hd._h=hdr;hd.classList.toggle('on',!!hdr);hd.classList.toggle('aim',!!(mine&&(B.sel||FC.armed)))}
 const ab=$('abar');if(ab&&ab._d!==dense){ab._d=dense;ab.classList.toggle('dense',dense)}
 setHTML('abar',h);setHTML('bcmd',cmdHTML(u,mine));
 setHTML('bend',swapHTML(u,mine)+'<button class="pri end pxb" aria-label="End turn" title="End turn" '+(mine&&!B.busy&&!B.over?'':'disabled')+' onclick="endTurn()">'+pic('endturn',32,'glass')+'</button>')}
/* weapon swap control beside the end-turn button: the weapon in hand (big), the backup (small), the cost (AP or FREE) */
function swapCost(u,a){a=a||abilityInfo(u,'swap');let ap=a.ap|0;try{if(typeof swapAP==='function'){const v=swapAP(u);if(typeof v==='number')ap=v}}catch(e){}return ap}
function swapHTML(u,mine){if(!mine||!AB.swap||!u||u.side!==0)return'';const alt=shAlt(u);if(!alt&&!(u.abs||[]).includes('swap'))return'';
 const a=abilityInfo(u,'swap'),w=shHand(u),ap=swapCost(u,a),ok=!!alt&&shCanSwap(u)&&canUse(u,a)&&!B.busy&&!B.over,why=ok?'':!alt?'No backup weapon':shWhyNot(u,a)||'Not now',free=ap<=0;
 return'<button class="swp pxb'+(ok?'':' off')+(free?' free':'')+'" aria-disabled="'+!ok+'" aria-label="Swap weapons: '+esc(shWName(w))+' in hand, '+esc(alt?shWName(alt):'no backup')+' stowed, '+(free?'free':ap+' AP')+(ok?'':'. '+esc(why))+'" title="'+esc('Swap to '+(alt?shWName(alt):'nothing')+(ok?'':' ('+why+')'))+'" onpointerdown="abHint(\'swap\')" onclick="hudSwap()">'
  +'<span class="swh">'+pic(shWIcon(w),32,'sword')+'</span><span class="swa">'+pic('swap',16,'a-burst')+(alt?pic(shWIcon(alt),16,'sword'):'')+'</span><b class="apc">'+(free?'FREE':ap)+'</b></button>'}
function hudSwap(){if(!B||B.busy||B.over)return;const u=B.cur;if(!u||u.side!==0||B.auto)return;const a=abilityInfo(u,'swap');if(!shCanSwap(u)||!canUse(u,a)){abHint('swap');return}fcClear();B.sel=null;B.targets=null;useAbility(u,a,key(u.c,u.r))}
function fxLockPopSafe(u){try{if(typeof fxLockPop==='function')fxLockPop(u,true)}catch(e){}}
function toggleFast(){const f=SPEEDF<1?1:.35;SPEEDF=f;if(typeof SET!=='undefined'){SET.speed=f;if(typeof saveSettings==='function')saveSettings();if(typeof settingsRefresh==='function')settingsRefresh()}updateBUI()}
function toggleAuto(){if(!B||B.over)return;fcClear();if(B.auto){B.auto=false;updateBUI();return}B.auto=true;if(!B.busy)nextAuto();else updateBUI()}
async function nextAuto(){const u=B.cur;if(u.side!==0||B.busy)return;B.busy=true;B.reach=null;updateBUI();await aiTurn(u);if(B.over)return;nextTurn()}

/* ---- forecast window: what the armed strike would do to the foe under the pointer ----
   Mouse: hovering a valid foe shows it. Touch (SET.confirm): the first tap shows it and arms the strike,
   a second tap on the same foe, or a tap on the window itself, strikes. */
const FC={el:null,u:null,t:null,a:null,k:-1,id:null,armed:false,blocked:false,lock:false,raf:0,sel:null};
function fcEl(){if(FC.el)return FC.el;try{const app=$('app');if(!app||typeof document==='undefined')return null;const e=document.createElement('button');e.id='fcw';e.className='pxf hidden';e.type='button';
  e.addEventListener('click',()=>{if(FC.armed)fcStrike()});app.appendChild(e);FC.el=e;return e}catch(e){return null}}
/* Everything forecast() reports has a place here, as icons and numbers:
     name row   the foe's hitpoints, head armor, body armor, shield
     hit row    chance to hit; cover steps (already in the chance); what morale adds on both sides; a riposte waiting on a miss
     body row   damage to hitpoints and to body armor        head row   chance of a head hit, damage to hitpoints and to the helmet
     shield row (shield-splitting blows) damage to the shield, and whether it breaks
     last row   lethal marker, statuses with chance and turns, knockback, a morale check, a likely injury, allies in the line of fire
   A field this build's forecast() does not return is skipped; one it adds and this window does not know is ignored. */
function fcRange(lo,hi){return lo===hi?''+lo:lo+'–'+hi}
function fcLoc(icon,svg,title,pct,L,armNow){if(!L)return'';
 return'<span class="fcl'+(L.sure?' sure':L.kill?' kill':'')+'" title="'+title+'">'+pic(icon,16,svg)+(pct!=null?'<em>'+pct+'%</em>':'')+'<span class="fcd hp">'+pic('hp',16,'heart')+'<b>'+fcRange(L.hpMin,L.hpMax)+'</b></span>'
  +(armNow>0||L.armMax>0?'<span class="fcd arm" title="Armor lost"><i class="pip"></i><b>'+fcRange(L.armMin,L.armMax)+'</b></span>':'')+(L.kill?pic('skull',16,'skull'):'')+'</span>'}
function fcHTML(u,t,a,armed){const lock=shLocked(u,a);if(lock){FC.blocked=true;FC.lock=true;const alt=shAlt(u),sw=AB.swap&&alt&&alt.wt!=='bow';
  return'<span class="fcp">'+port(t,32)+'</span><span class="fcb"><span class="fcn"><b>'+esc(t.name)+'</b><i>'+pic('hp',16,'heart')+t.hp+'</i></span><span class="fcr"><span class="fch lo blk" title="'+SH_LOCKTXT+': a bow cannot be used with a foe this close">'+pic('ranged-lock',16,'a-burst')+'<b>'+SH_LOCKTXT+'</b></span></span>'
   +'<span class="fcs fclk">'+(sw?pic('swap',16,'a-burst')+'<i>Swap to '+esc(shWName(alt))+', or step away</i>':'<i>Step away first, or fight hand to hand</i>')+'</span></span>'}
 FC.lock=false;let f=null;try{f=forecast(u,t,a)}catch(e){}f=f||{};const blocked=!!f.blocked;let st='',mods='',rows='';FC.blocked=blocked;
 if(f.cover>0)mods+='<span class="fcm bad" title="'+f.cover+(f.cover===1?' unit':' units')+' in the line of fire: −'+f.cover*(typeof COVERPEN==='number'?COVERPEN:15)+' to hit (already counted)">'+pic('cover',16,'shield')+'<b>'+(f.cover>1?'×'+f.cover:'')+'</b></span>';
 if(f.mor&&(f.mor.att||f.mor.def)){const v=(f.mor.att||0)-(f.mor.def||0);if(v)mods+='<span class="fcm '+(v>0?'good':'bad')+'" title="Morale: '+(f.mor.att?'yours '+(f.mor.att>0?'+':'')+f.mor.att:'')+(f.mor.att&&f.mor.def?', ':'')+(f.mor.def?'theirs '+(f.mor.def>0?'−':'+')+Math.abs(f.mor.def):'')+' (already counted)">'+pic('morale-'+(v>0?4:1),16,'flag')+'<b>'+(v>0?'+':'−')+Math.abs(v)+'</b></span>'}
 if(f.riposte)mods+='<span class="fcm bad" title="A miss draws a riposte">'+pic('riposte',16,'sword')+'<b>!</b></span>';
 if(f.shield){const S=f.shield;rows+='<span class="fcl'+(S.sure?' sure':S.brk?' kill':'')+'" title="Damage to the shield ('+S.hp+' left)">'+pic('shield',16,'shield')+'<span class="fcd arm"><i class="pip"></i><b>'+fcRange(S.min,S.max)+'</b><small>/'+S.hp+'</small></span>'+(S.brk?'<span class="fck'+(S.sure?' sure':'')+'">'+pic('st-splitshield',16,'shield')+'<b>'+(S.sure?'Splits':'May split')+'</b></span>':'')+'</span>'}
 else if(a.noDmg)rows+='<span class="fcl"><span class="fcd" title="No damage">'+esc(a.n)+'</span></span>';
 else if(f.body!==undefined||f.head!==undefined){
  rows+=fcLoc('armor','shield','A hit on the body',f.head&&f.body?100-f.headCh:null,f.body,t.arm);
  rows+=fcLoc('helmet','shield','A hit on the head: '+(typeof HEADMULT==='number'?'×'+HEADMULT+' to hitpoints':'more to hitpoints'),f.headCh,f.head,t.helm)}
 else rows+=fcLoc('armor','shield','A hit',null,{hpMin:f.hpMin,hpMax:f.hpMax,armMin:f.armMin,armMax:f.armMax,kill:f.kill,sure:f.sure},t.arm);
 if(f.pierce)st+='<span class="sd" style="--sc:#f3d98b" title="Bypasses armor altogether">'+pic('ab-puncture',16,'a-burst')+'</span>';
 if(f.kill)st+='<span class="fck'+(f.sure?' sure':'')+'" title="'+(f.sure?'A hit kills':'A strong hit kills')+'">'+pic('skull',16,'skull')+'<b>'+(f.sure?'Kills':'Lethal')+'</b></span>';
 for(const s of f.statuses||[])st+=stIcon(s.k,s.n,s.ch<1?Math.round(s.ch*100)+'%':s.n>1?s.n:'');
 if(f.kb&&f.kb.ch>0)st+='<span class="sd" style="--sc:#ecc64f" title="Knocked back '+f.kb.n+'">'+pic('ab-shove',16,'a-shove')+'<b>'+(f.kb.ch<1?Math.round(f.kb.ch*100)+'%':f.kb.n)+'</b></span>';
 if(f.shake)st+='<span class="sd" style="--sc:#ff8a3c" title="A heavy hit: the target must test its morale">'+pic('morale-1',16,'flag')+'</span>';
 if(f.injure)st+='<span class="sd" style="--sc:#ef8a78" title="A heavy hit can injure">'+pic('injury',16,'skull')+'</span>';
 let ff='';if(f.ff&&f.ff.length){ff='<span class="fcff" title="A miss can stray into '+f.ff.map(x=>esc(x.t.name)+' ('+Math.max(1,Math.round(x.ch))+'%)').join(', ')+'">'+pic('friendly-fire',16,'a-burst');
  for(let i=0;i<f.ff.length&&i<3;i++)ff+='<span class="fcfa">'+port(f.ff[i].t,16)+'<b>'+Math.max(1,Math.round(f.ff[i].ch))+'%</b></span>';if(f.ff.length>3)ff+='<b>+'+(f.ff.length-3)+'</b>';ff+='</span>'}
 return'<span class="fcp">'+port(t,32)+'</span><span class="fcb"><span class="fcn"><b>'+esc(t.name)+'</b><i>'+pic('hp',16,'heart')+t.hp+(t.helmMax>0?' '+pic('helmet',16,'shield')+t.helm:'')+(t.armMax>0?' '+pic('armor',16,'shield')+t.arm:'')+(t.shield&&t.shpMax>0?' '+pic('shield',16,'shield')+t.shp:'')+'</i></span>'
 +(blocked?'<span class="fcr"><span class="fch lo blk" title="Something stands in the way: this cannot be ordered">'+pic('los-blocked',16,'a-burst')+'<b>No line of fire</b></span></span>'
  :'<span class="fcr"><span class="fch'+(f.hit>=75?' hi':f.hit<45?' lo':'')+'" title="Chance to hit">'+abIcon(u,a.id,16)+'<b>'+f.hit+'%</b></span>'+mods+'</span>'+rows
  +(st?'<span class="fcs">'+st+'</span>':'')+ff)+'</span>'}
function fcShow(aim,armed){const e=fcEl();FC.u=aim.u;FC.t=aim.t;FC.a=aim.a;FC.k=aim.k;FC.id=aim.a.id;FC.armed=!!armed;FC.sel=B.sel;if(!e)return;
 let h='';try{h=fcHTML(aim.u,aim.t,aim.a,armed)}catch(err){h=''}if(!h){fcClear();return}
 if(e._h!==h){e.innerHTML=h;e._h=h}e.classList.remove('hidden');e.classList.toggle('armed',!!armed);e.setAttribute('aria-label',armed?'Strike '+aim.t.name:'Forecast against '+aim.t.name);
 fcPlace();if(!FC.raf&&typeof requestAnimationFrame==='function'){const tick=()=>{FC.raf=0;if(!FC.t)return;fcPlace();FC.raf=requestAnimationFrame(tick)};FC.raf=requestAnimationFrame(tick)}}
function fcClear(){const had=FC.armed;FC.u=FC.t=FC.a=null;FC.k=-1;FC.id=null;FC.armed=false;FC.blocked=false;FC.lock=false;if(FC.el){FC.el.classList.add('hidden')}return had}
// Drops a forecast that no longer describes the board (the turn moved on, the foe died, another ability was armed).
function fcCheck(){if(!FC.t)return;if(!B||B.busy||B.over||B.auto||B.cur!==FC.u||!FC.t.alive||FC.sel!==B.sel||mode!=='battle'||!aimAt(FC.k)){fcClear();return}
 const e=FC.el;if(e){let h='';try{h=fcHTML(FC.u,FC.t,FC.a,FC.armed)}catch(err){}if(h&&e._h!==h){e.innerHTML=h;e._h=h}}}
function fcStrike(){if(!FC.t||!B||B.busy||B.over)return;const aim=aimAt(FC.k);if(!aim||aim.a.id!==FC.id||aim.blocked){fcClear();updateBUI();return}fcClear();useAbility(aim.u,aim.a,aim.k)}
// Beside the target, never on it: right of the figure when there is room, else left; kept clear of the HUD rows.
function fcPlace(){const e=FC.el,t=FC.t;if(!e||!t||!B||typeof VC==='undefined')return;const c=B.cam,z=c.z||1,x=VC.x+(t.sx-c.x)*z,y=VC.y+(t.sy-c.y)*z,w=e.offsetWidth||150,h=e.offsetHeight||60;
 const W=window.innerWidth,H=window.innerHeight,s=typeof Layout!=='undefined'?Layout.safe:{t:0,r:0,b:0,l:0},gap=20*z+8;
 let lx=x+gap;if(lx+w>W-s.r-6)lx=x-gap-w;if(lx<s.l+6){lx=clamp(x-w/2,s.l+6,Math.max(s.l+6,W-s.r-6-w));}
 let ty=y-24*z-h/2;const top=s.t+54,bot=H-s.b-70;
 if(lx<x+gap&&lx+w>x-gap)ty=y-52*z-h-6<top?y+14*z:y-52*z-h-6;          // no room at either side: above the head, else under the feet
 ty=clamp(ty,top,Math.max(top,bot-h));lx=Math.round(clamp(lx,s.l+6,Math.max(s.l+6,W-s.r-6-w)));ty=Math.round(ty);
 if(e._x!==lx||e._y!==ty){e._x=lx;e._y=ty;e.style.transform='translate('+lx+'px,'+ty+'px)'}}
function fcHover(sx,sy){if(FC.armed)return;if(!B||mode!=='battle'||sheetOpen||B.busy||B.over){if(FC.t)fcClear();return}const p=boardXY(sx,sy),aim=aimAt(pickKey(p.x,p.y));
 if(!aim){if(FC.t)fcClear();return}if(FC.t!==aim.t||FC.id!==aim.a.id||FC.sel!==B.sel)fcShow(aim,false)}

/* ---- combat log: every say() line plus hits, misses and heals; the one-line log opens a drawer of the last 40 ---- */
const HLOG={b:null,lines:[],open:false,el:null,max:40};
function logPush(t,cls,side){if(!B||!t)return;if(HLOG.b!==B){HLOG.b=B;HLOG.lines=[]}const L=HLOG.lines;L.push({t:String(t),c:cls||'say',s:side==null?-1:side,r:B.round||1});if(L.length>HLOG.max)L.splice(0,L.length-HLOG.max);if(HLOG.open)logRender()}
function logEvent(type,d){if(!B||!d)return;
 if(type==='hit'){const u=d.u,t=d.t;if(!t)return;logPush((u?u.name+' hits '+t.name:t.name+' is hurt')+(d.head?' on the head':'')+': '+(d.dmg>0?'-'+d.dmg+' HP':'no wound')+(d.armor>0?', -'+d.armor+(d.head?' helmet':' armor'):''),'hit',u?u.side:-1)}
 else if(type==='miss'&&d.u&&d.t)logPush(d.u.name+' misses '+d.t.name,'miss',d.u.side);
 else if(type==='heal'&&d.t&&d.n>0)logPush(d.t.name+' recovers '+d.n+' HP','heal',d.t.side);
 else if(type==='morale'&&d.u&&d.to!==0)logPush(d.u.name+(d.to>d.from?' takes heart: ':' falters: ')+shMorN(d.to).toLowerCase(),d.to>d.from?'heal':'miss',d.u.side);
 else if(type==='status'&&d.t&&d.key!=='splitshield'){const S=shStatus(d.key);if(S)logPush(d.t.name+': '+S.n.toLowerCase()+(d.n>1?' ('+d.n+' turns)':''),S.good?'heal':'miss',d.t.side)}
 else if(type==='spawn'&&d.u&&d.u.side===1)logPush(d.u.name+' enters the fight','say',1);
 else if(type==='blocked'&&d.u&&d.t)logPush(d.u.name+' has no line of fire to '+d.t.name,'miss',d.u.side)}
{const say0=FX.say,emit0=FX.emit;
 FX.say=function(t){say0(t);try{logPush(t,'say',B&&B.cur?B.cur.side:-1)}catch(e){}};
 FX.emit=function(type,d){try{SHV.rev++;logEvent(type,d)}catch(e){}return emit0.call(FX,type,d)}}
function logRender(){const e=HLOG.el;if(!e)return;const L=HLOG.b===B?HLOG.lines:[];let h='',r=0;
 for(const l of L){if(l.r!==r){r=l.r;h+='<h4>Round '+r+'</h4>'}h+='<p class="'+l.c+(l.s>=0?' s'+l.s:'')+'">'+esc(l.t)+'</p>'}
 const bd=e.querySelector('.logb');if(!bd)return;const stick=bd.scrollTop+bd.clientHeight>=bd.scrollHeight-8;bd.innerHTML=h||'<p class="say">Nothing has happened yet.</p>';if(stick||!bd._seen){bd.scrollTop=bd.scrollHeight;bd._seen=1}}
function logOpen(){try{const host=$('bLeft');if(!host||typeof document==='undefined')return;let e=HLOG.el;
  if(!e){e=document.createElement('div');e.id='logw';e.className='pxf';e.setAttribute('role','log');e.setAttribute('aria-label','Combat log');
   e.innerHTML='<div class="logh"><b>Combat log</b><button class="pxb sm icon" aria-label="Close the log" onclick="logClose()">'+pic('close',16,'door')+'</button></div><div class="logb"></div>';host.appendChild(e);HLOG.el=e}
  e.classList.remove('hidden');HLOG.open=true;const bd=e.querySelector('.logb');if(bd)bd._seen=0;logRender();const b=$('blog');if(b){b.classList.add('open');b.setAttribute('aria-expanded','true')}}catch(e){}}
function logClose(){if(!HLOG.open)return;HLOG.open=false;try{if(HLOG.el)HLOG.el.classList.add('hidden');const b=$('blog');if(b){b.classList.remove('open');b.setAttribute('aria-expanded','false')}}catch(e){}}
function logToggle(){if(HLOG.open)logClose();else logOpen()}
// Called by setUI(): the windows made here belong to battle mode only.
function hudModeChange(){if(mode!=='battle'){fcClear();logClose()}}
function initBattleHud(){try{if(typeof document==='undefined')return;const app=$('app');
  if(app){let has=false,hasB=false;try{for(const s of document.styleSheets)for(const r of s.cssRules){const q=r.selectorText||'';if(/\.pxf(?![\w-])/.test(q))has=true;if(/\.pxb(?![\w-])/.test(q))hasB=true}}catch(e){}
   app.classList.toggle('nopxf',!has);app.classList.toggle('nopxb',!hasB)}
  const u=$('uinfo'),a=$('ahdr');if(u){u.classList.add('pxf');u.addEventListener('click',chipInspect)}if(a)a.classList.add('pxf');
  const b=$('blog');if(b){b.setAttribute('role','button');b.setAttribute('tabindex','0');b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','Combat log');b.addEventListener('click',logToggle);
   b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();logToggle()}})}
  const c=typeof cv!=='undefined'?cv:$('cv');if(c&&c.addEventListener){
   c.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&!e.buttons)fcHover(e.clientX,e.clientY)});
   c.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!FC.armed&&FC.t)fcClear()});
   c.addEventListener('pointerdown',()=>{logClose()})}
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){logClose();if(fcClear()&&B)updateBUI()}})}catch(e){}}
