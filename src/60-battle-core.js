/* ================= BATTLE CORE ================= */
/* Rules only. Nothing here touches the DOM or the canvas: every visual goes through FX, every wait
   through sleep() (instant when SPEEDF=0), so a battle can run to completion headless. */
/* Board. BW x BH tiles; the company deploys along the high-r edge, the enemy along r=0.
   Everything below derives from these constants: resize the battlefield by editing them only. */
const BW=16,BH=12,TW=64,TH=32,HW=32,HH=16,HL=16,DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const SPAWN_E=3,SPAWN_P=2;                                               // rows kept free of obstacles at the enemy and company edges
const DEPLOY={p:{front:BH-2,back:BH-1,dir:-1},e:{front:1,back:0,dir:1}};  // melee row, ranged/caster row, overflow direction
const MAXFOES=16;
function centerOut(n){const m=(n-1)/2,a=[];for(let i=0;i<n;i++)a.push(i);return a.sort((x,y)=>Math.abs(x-m)-Math.abs(y-m)||x-y)}
const COLS=centerOut(BW);                                                // deployment order across a row, from the middle outward
const key=(c,r)=>r*BW+c;
/* ---- Footprints (multi-tile units) ----
   u.sz: the side of the unit's square footprint in tiles (1, or 2 for def.size 2). A size-2 unit at (c,r) stands on (c,r) (c+1,r) (c,r+1)
   (c+1,r+1); (c,r) is its anchor (the top-left tile, the one key(u.c,u.r) names). Every rule measures footprints:
     unitTiles(u) [[c,r],...]   occupies(u,c,r)   unitAt(c,r) (any tile of a footprint)   mdist(a,b) (tiles between footprints; 1 = adjacent)
     tdist(c,r,u) (from a tile to u's footprint)   fdist(c,r,s,t) (a size-s footprint anchored at (c,r) to t's footprint)
     footFree(c,r,s,self?) (a size-s footprint at (c,r) lies on the board, on no obstacle and on no other living unit)
     unitCenter(u) {c,r} (fractional: the middle of the footprint, for drawing)   T(u) (the tile under the unit: the highest of its footprint)
   A size-2 unit is never knocked back or dragged. Units with u.fly (def.fly) move over height steps and props (they cannot stop on a prop). */
const usz=u=>u&&u.sz||1;
const gap1=(a,sa,b,sb)=>a>b?Math.max(0,a-b-sb+1):Math.max(0,b-a-sa+1);
const mdist=(a,b)=>{const sa=a.sz||1,sb=b.sz||1;if(sa===1&&sb===1)return Math.abs(a.c-b.c)+Math.abs(a.r-b.r);return gap1(a.c,sa,b.c,sb)+gap1(a.r,sa,b.r,sb)};
const tdist=(c,r,u)=>{const s=u.sz||1;if(s===1)return Math.abs(c-u.c)+Math.abs(r-u.r);return gap1(c,1,u.c,s)+gap1(r,1,u.r,s)};
const fdist=(c,r,s,t)=>{const st=t.sz||1;return gap1(c,s,t.c,st)+gap1(r,s,t.r,st)};
function unitTiles(u){const s=usz(u);if(s===1)return[[u.c,u.r]];const o=[];for(let y=0;y<s;y++)for(let x=0;x<s;x++)o.push([u.c+x,u.r+y]);return o}
const occupies=(u,c,r)=>{const s=u.sz||1;return c>=u.c&&c<u.c+s&&r>=u.r&&r<u.r+s};
function unitCenter(u){const h=(usz(u)-1)/2;return{c:u.c+h,r:u.r+h}}
function T(u){const s=u.sz||1;if(s===1)return B.tiles[key(u.c,u.r)];let best=null;for(let y=0;y<s;y++)for(let x=0;x<s;x++){const c=u.c+x,r=u.r+y;if(!inb(c,r))continue;const t=B.tiles[key(c,r)];if(!best||t.h>best.h)best=t}return best||B.tiles[key(clamp(u.c,0,BW-1),clamp(u.r,0,BH-1))]}
function footFree(c,r,s,self,tiles){const tl=tiles||B.tiles;for(let y=0;y<s;y++)for(let x=0;x<s;x++){const cc=c+x,rr=r+y;if(!inb(cc,rr)||tl[key(cc,rr)].t==='block')return false;if(B&&B.units){const o=unitAt(cc,rr);if(o&&o!==self)return false}}return true}
const inb=(c,r)=>c>=0&&r>=0&&c<BW&&r<BH;
const spawnRow=r=>r<SPAWN_E||r>BH-1-SPAWN_P;
function tpos(c,r,h){return{x:(c-r)*HW,y:(c+r)*HH-h*HL}}
function boardCenter(){return tpos((BW-1)/2,(BH-1)/2,0)}
function unitAt(c,r){const U=B.units;for(let i=0;i<U.length;i++){const u=U[i];if(!u.alive)continue;const s=u.sz||1;if(s===1?u.c===c&&u.r===r:c>=u.c&&c<u.c+s&&r>=u.r&&r<u.r+s)return u}return undefined}
function buffSum(u,k){let s=0;for(const b of u.buffs)s+=b[k]||0;return s}
const eff=(u,k)=>u[k]+buffSum(u,k);
/* FX: the only bridge from rules to presentation.
   FX.float / FX.shot / FX.say write B.floats {x,y,txt,col,t,u}, B.shots {a:{x,y},b:{x,y},col,t} and B.log.
   FX.emit(type,data) forwards to FX.on(type,data) when the scene registers one:
     'hit' {u,t,dmg,armor}  u is null for burning ground, burn, falls and slams
     'miss' {u,t}   'death' {t}   'cast' {u,t,ab}  (t may be null)   'move' {u}   'kb' {t}
     'heal' {t,n}   'buff' {t}    'turn' {u}
   Phase 5: 'hit' also carries head:bool (which armor pool soaked it); and
     'loc' {t,head}          where a weapon or spell hit landed (sent right after its 'hit')
     'morale' {u,from,to}    a unit's morale state changed (0 fleeing .. 4 confident, see MORN)
     'injury' {t,id}         a merc took injury INJ[id]
     'blocked' {u,t}         u has no line of fire to t
     'ff' {u,t,from}         u's missed shot at `from` strays into its own ally t (the 'hit' on t follows). The shot is decided
                             before it flies: B.shots gets ONE projectile, from u to t; the 'miss' on `from` carries stray:t
     'spawn' {u}             a unit entered mid-battle (reserve, summon)
     'withdraw' {u,why}      a unit left the field alive: why is 'withdraw' | 'retreat' | 'fled'
     'status' {t,key,n}      t gained STATUS[key] (n turns, or shield damage for 'splitshield')
   Talents and arms:
     'swap' {u,from,to}      u swapped weapons: from / to are the weapon objects (u.wpn is now `to`; u.wid the item id in hand for mercs)
     'shield' {u,raised}     u's shield went up (raised true) or onto its back (slung) with the swap
   Arms update:
     'reload' {u}            u reloaded the weapon in hand (u.loaded is now true)
     'kb' {t,pull:1}         t was dragged one tile toward the attacker (a hook)
   A throwing FX.on never breaks the rules. */
const FX={on:null,cap:120,err:null,
 clock(){return typeof now==='number'?now:0},
 float(u,txt,col){if(!B)return;const F=B.floats,t=FX.clock();if(F.length>=FX.cap)F.splice(0,F.length-FX.cap+1);
  F.push({x:u.sx,y:u.sy-52-F.filter(f=>f.u===u&&t-f.t<500).length*14,txt,col:col||'#fff',t,u})},
 shot(a,b,col,ya,yb){if(!B)return;const S=B.shots;if(S.length>=FX.cap)S.splice(0,S.length-FX.cap+1);S.push({a:{x:a.sx,y:a.sy-ya},b:{x:b.sx,y:b.sy-yb},col,t:FX.clock()})},
 say(t){if(B)B.log=t;if(typeof document==='undefined')return;const e=$('blog');if(e)e.textContent=t},
 emit(type,data){const f=FX.on;if(typeof f!=='function')return;try{f(type,data)}catch(e){if(!FX.err){FX.err=e;if(typeof console!=='undefined')console.warn('FX.on('+type+') failed: '+(e&&e.message||e))}}},
 ui(){if(typeof updateBUI==='function')updateBUI()}};
function say(t){FX.say(t)}
function float(u,txt,col){FX.float(u,txt,col)}
function genBattleMap(bk){const P=BIO[bk],n=noiseFn(rnd,3.4,Math.max(BW,BH)),tiles=[];
 for(let r=0;r<BH;r++)for(let c=0;c<BW;c++){let h=clamp(Math.floor(Math.pow(n(c,r),1.25)*(P.amp+1)),0,3),t='ground';
  if(!spawnRow(r)){const x=rnd();if(x<P.block)t='block';else if(x<P.block+P.rgh)t='rough';else if(x<P.block+P.rgh+(P.haz||0))t='haz'}tiles.push({h,t})}
 for(let pass=0,ch=true;ch&&pass<40;pass++){ch=false;for(let r=0;r<BH;r++)for(let c=0;c<BW;c++){let mn=9;for(const [a,b] of DIRS)if(inb(c+a,r+b))mn=Math.min(mn,tiles[key(c+a,r+b)].h);const t=tiles[key(c,r)];if(t.h>mn+1){t.h=mn+1;ch=true}}}
 openBattleMap(tiles);return tiles}
// Guarantees every walkable tile can be reached from the company's edge: a chance wall of obstacles is breached.
function openBattleMap(tiles){const N=BW*BH,start=key(COLS[0],BH-1);
 for(let g=0;g<N;g++){const seen=new Uint8Array(N),q=[start];seen[start]=1;
  for(let i=0;i<q.length;i++){const c=q[i]%BW,r=(q[i]/BW)|0;for(const [a,b] of DIRS){const nc=c+a,nr=r+b;if(!inb(nc,nr))continue;const nk=key(nc,nr);if(seen[nk]||tiles[nk].t==='block')continue;seen[nk]=1;q.push(nk)}}
  const prev=new Int32Array(N).fill(-1),vis=seen.slice(),bq=q.slice();let hit=-1;
  for(let i=0;i<bq.length&&hit<0;i++){const c=bq[i]%BW,r=(bq[i]/BW)|0;for(const [a,b] of DIRS){const nc=c+a,nr=r+b;if(!inb(nc,nr))continue;const nk=key(nc,nr);if(vis[nk])continue;vis[nk]=1;prev[nk]=bq[i];if(tiles[nk].t!=='block'){hit=nk;break}bq.push(nk)}}
  if(hit<0)return;for(let k=prev[hit];k>=0&&!seen[k];k=prev[k])tiles[k].t='ground'}}
function buildEnemies(f,budget,fixed,mult,units,o){if(typeof FACT[f].build==='function'&&!(fixed&&fixed.length))return FACT[f].build(budget,mult==null?1:mult).slice(0,MAXFOES);const list=(fixed||[]).slice(),U=Array.isArray(units)&&units.length&&units.every(u=>Array.isArray(u)&&EN[u[0]]&&u[1]>0)?units:FACT[f].units,minC=Math.min(...U.map(u=>u[1]));let g=0;
 const solo=typeof isSolo==='function'&&isSolo()&&!(fixed&&fixed.length);
 // one sword who hunts a monster band it cannot yet afford meets the monster itself, alone (an ogre, not its goblin hangers-on)
 if(solo&&FACT[f].tier==='mid'&&!list.length&&U[0][1]>budget){list.push(U[0][0]);budget=0}
 const most=solo?Math.min(MAXFOES,soloDiff(o).max||SOLOMAX):MAXFOES;
 while(list.length<most&&budget>=minC&&g++<200){const u=pick(U.filter(u=>u[1]<=budget));list.push(u[0]);budget-=u[1]}
 // one sword: a band too poor for a second foe brings one, or a second with the chance its leftover buys (SOLOFLOOR above)
 const floor=SOLOFLOOR&&solo&&list.length===1&&budget<minC*SOLOFLOOR?(budget>0&&rnd()<budget/(minC*SOLOFLOOR)?2:1):2;
 while(list.length<floor)list.push(U[0][0]);return list}
/* Solo runs (ORIGINS[k].solo: one sword) fight bands sized for one. Tuned with test/balance.js (the solo table: the slayer at level 3, 6, 9).
   SOLOBUD: what the one sword adds to the enemy budget, base + lvl a level up to level knee, late a level after it (a company merc adds
   MERCBUD), or the faction's own line FACT[f].solo = [base, a level] where its bands do not follow the common one (a serpent nest
   is never just two hatchlings; an ogre's strength barely follows the budget at all). SOLOMAX: the most foes such a
   band brings. SOLOFLOOR: a band that bought one foe brings a second with the chance leftover / (SOLOFLOOR x the cheapest foe's cost).
   A monster band (tier 'mid') too poor for its lead monster is that monster alone (buildEnemies). */
let SOLOFLOOR=1,SOLOMAX=2;
// Brutal (22-run.js DIFF.brutal.solo): {max: the most foes a solo band brings, instead of SOLOMAX}; {} on the other levels and in the arena
function soloDiff(o){if(typeof diffX!=='function'||o&&o.arena)return{};const x=diffX('solo');return x&&typeof x==='object'?x:{}}
const SOLOBUD={base:6,lvl:7,knee:6,late:4};   // 27 at level 3, 48 at 6, 60 at 9, 72 at 12 (a company merc, mercBud: 25 44 64 85)
/* ---- Units ----
   A battle unit (both sides): side, name, lvl, hp/hpMax, arm/armMax (body armor), helm/helmMax (head armor), ap/apMax, fat/fatMax,
   init, ms, rs, md, rd, brv (resolve), mor (morale 0..4), fearless, wpn, abs, res, flags, dmgB, buffs, st (status turns), alive,
   shield (true while it carries an intact shield), shp/shpMax (shield hitpoints), shb ({md,rd} the shield adds, already in md/rd),
   gone ('withdraw'|'retreat'|'fled' once it has left the field alive), c, r, id, sx, sy. Company units also carry m (the merc);
   enemies def (their EN entry) and f (faction). initUnit() fills whatever a hand-made unit lacks.
   Arms: slung (an intact shield on the back while a two-handed weapon is in hand: shield is false then), swapFree (this turn's swap costs nothing).
   Mercs: hand ('w' main | 'b' sidearm), wid (item id in hand, null = fists), alt (the other item id or null), cld (the calc() the unit's numbers
   came from). Enemies: wpnAlt (their sidearm as a weapon object, from def.side) or null; wid/alt stay null.
   Reload: loaded (bool: the weapon in hand can fire; always true for weapons without reload), ld {weapon key: loaded} for every weapon
   the unit carries (wkey(w): the item id, else '@'+name), so a swapped-away crossbow keeps its bolt. Everyone starts loaded.
   Shields (mercs): shw (Shield wall bonus), spike ([min,max] Spiked bash roll or null), from the shield item. */
const wkey=w=>w?w.id||'@'+(w.n||w.wt||'w'):'@fist';
// Every weapon the unit carries starts the battle loaded.
function initLoad(u){u.ld={};u.am={};for(const w of [u.wpn,u.m?altWeapon0(u):u.wpnAlt]){if(w&&w.reload)u.ld[wkey(w)]=true;if(w&&(w.ammo||w.barrels>1))u.am[wkey(w)]=ammoMax(u,w)}u.loaded=true;return u}   // throws and barrels: 60p-passives.js
function altWeapon0(u){const m=u.m,id=m&&m.eq&&(u.hand==='b'?m.eq.w:m.eq.b);if(!id||!ITEMS[id]||ITEMS[id].k!=='w')return null;return calc(m,{hand:u.hand==='b'?'w':'b'}).wpn}
const EDGE=[BH-1,0,0];   // side 2: caravan guards turned on the company (42-caravans.js) leave by the foe's edge
                                                    // each side's own edge row: withdrawing and fleeing units leave from it
const FREEAB={id:'aoo',n:'aoo',wpn:1,mult:1,melee:1};                   // the free attack: zone of control, riposte, spear wall, a retreat
function initUnit(u){const d=(k,v)=>{if(u[k]===undefined||u[k]===null)u[k]=v};
 d('lvl',1);d('hp',1);d('hpMax',u.hp);d('arm',0);d('armMax',u.arm);d('helm',0);d('helmMax',u.helm);d('apMax',9);d('ap',u.apMax);d('fat',0);d('fatMax',9999);
 d('init',100);d('ms',50);d('rs',0);d('md',0);d('rd',0);d('brv',50);d('mor',3);d('fearless',false);d('wpn',FIST);d('abs',[]);d('res',{});d('flags',{});d('dmgB',0);
 d('buffs',[]);d('st',{});d('alive',true);d('sz',1);d('shield',false);d('shp',0);d('shpMax',u.shp);d('name','Unit');return u}
/* What a merc gets on taking the field beyond calc(m): Night owl (NIGHTOWL in a battle that starts between 20:00 and 05:00, read from
   G.hour), the standard-bearer follower (+5 resolve to every fielded merc, reserves called in too) and the cook (+5 resolve to those who
   start the battle: B.round is 0 until the first round begins). Cocky starts Confident (mkPlayerUnit). */
const isNight=()=>!!(G&&typeof G.hour==='number'&&(G.hour>=20||G.hour<5));
function unitTraitB(m,s,side){const o={ms:0,rs:0,init:0,brv:0},f=s.flags||{};if(f.nightowl&&isNight()){o.ms+=NIGHTOWL.ms;o.rs+=NIGHTOWL.rs;o.init+=NIGHTOWL.init}
 if(side)return o;   // the company's followers serve the company only: a rival's mercs get their traits, not our standard-bearer
 if(fHas('banner')||fHas('standardbearer'))o.brv+=5;if(fHas('cook')&&!(B&&B.round>0))o.brv+=5;return o}
function mkPlayerUnit(m){return mkMercUnit(m,0)}
/* mkMercUnit(m, side): a battle unit for merc m on either side. Side 0 is the company; side 1 a rival company's merc (mkRivalUnit):
   the same calc(m), gear, hands, shield, armor condition, talents, gift resource and abilities, so every merc rule applies to both. */
function mkMercUnit(m,side){const s=calc(m),res={},c=armorCond(m),sh=s.shield;for(const k in s.res)res[k]={cur:s.res[k].max,max:s.res[k].max,regen:s.res[k].regen};
 const caster=!!(m.gift&&MAST[m.gift]&&MAST[m.gift].style==='caster'&&giftAwake(m)),tb=unitTraitB(m,s,side?1:0);
 return initLoad(initUnit({side:side?1:0,mor:s.flags.cocky?4:3,m,name:m.name,lvl:m.lvl,hp:Math.max(1,Math.min(m.hp,s.hp)),hpMax:s.hp,arm:c.a,armMax:s.arm,helm:c.h,helmMax:s.helm,apMax:s.ap,ap:s.ap,fat:0,fatMax:Math.max(30,s.fat),init:s.init+tb.init,ms:s.ms+tb.ms,rs:s.rs+tb.rs,md:s.md,rd:s.rd,brv:s.brv+tb.brv,
  wpn:s.wpn,abs:s.abs.slice(),res,flags:s.flags,dmgB:s.dmg,buffs:[],st:{},alive:true,shield:!!sh&&sh.raised,slung:!!sh&&!sh.raised,shp:sh?sh.hp:0,shpMax:sh?sh.hp:0,shb:sh?{md:sh.md,rd:sh.rd}:null,
  hand:'w',wid:s.wid,alt:s.alt,cld:s,dw:s.dw||null,fabled:m.fabled||null,title:m.fabled&&m.title||'',back:isRangedW(s.wpn)||caster,shw:sh?sh.wallB:0,spike:sh?sh.spike:null,aw:s.aw||0,acl:s.acl||'light'}))}
/* ---- Rival companies (CONTRACT.md) ----
   battleRival(id): the rival company record (rivalById from 15-factions.js / 40-world.js, else G.rivals), or null.
   rivalField(r): the mercs it fields, at most MAXRIVAL: those not benched (m.field!==false) first, in roster order; the dead never.
   mkRivalUnit(m,r): the enemy unit for rival merc m (u.m = m, u.side = 1, u.f = u.rival = r.id). Its formation slot m.slot
   ({row:0 front | 1 back, col}) is mirrored onto the enemy's edge, so the company it faces sees it as its own Lines tab set it.
   rivalPreview(r): what the deployment screen may show of it: [{id,name,bg,bgN,lvl,back,role,hp,hpMax,inj}] (no rnd). */
const MAXRIVAL=12,AMBUSHAP=3;   // o.ambush: every foe loses AMBUSHAP on its first turn; o.duel: a fair start (nothing changes)
function battleRival(id){if(id==null||id===false)return null;if(typeof id==='object')return id&&Array.isArray(id.roster)?id:null;
 if(typeof rivalById==='function'){try{const r=rivalById(id);if(r&&Array.isArray(r.roster))return r}catch(e){}}
 const L=typeof G!=='undefined'&&G&&Array.isArray(G.rivals)?G.rivals:[];for(const r of L)if(r&&r.id===id&&Array.isArray(r.roster))return r;return null}
function rivalName(r){return r&&r.n?String(r.n):'A rival company'}
// The name of whoever the battle is against: a faction, or a rival company.
function battleFoeN(o){const f=o&&o.f;if(FACT[f])return FACT[f].n;const r=battleRival(o&&o.rival||f);return r?rivalName(r):'Foes'}
function rivalField(r){const L=(r&&Array.isArray(r.roster)?r.roster:[]).filter(m=>m&&m.eq&&m.base&&!m.dead&&!(m.hp<=0));
 return L.filter(m=>m.field!==false).concat(L.filter(m=>m.field===false)).slice(0,MAXRIVAL)}
function mkRivalUnit(m,r){const u=mkMercUnit(m,1),s=m.slot;u.f=r.id;u.rival=r.id;if(m.fabled){u.fabled=m.fabled;u.title=m.title||''}
 if(s&&(s.row===0||s.row===1)&&Number.isInteger(s.col)&&s.col>=0&&s.col<BW)u.slot={c:BW-1-s.col,r:s.row?DEPLOY.e.back:DEPLOY.e.front};return u}
function rivalPreview(r){return rivalField(r).map(m=>{const s=calc(m),gk=m.gift&&MAST[m.gift]&&MAST[m.gift].style==='caster'&&giftAwake(m);
 return{id:m.id,name:m.name,bg:m.bg,bgN:BG[m.bg]?BG[m.bg].n:m.bg,lvl:m.lvl,back:!!(isRangedW(s.wpn)||gk),w:s.wid||null,s:m.eq.s||null,hp:Math.max(1,Math.min(m.hp,s.hp)),hpMax:s.hp,inj:Array.isArray(m.inj)?m.inj.length:0}})}
/* Enemy fields read from EN[id] beyond the old ones (all optional): helm (head armor; default 60% of arm), brv (resolve; default from xp),
   fearless (never tests morale; default: mindless undead and bosses), shield (hitpoints, or {hp,md,rd}: md/rd are what breaking it removes), noHead. */
// An enemy's weapon: its own d, from EN[id].w (an item: family, range, reach, reload, crush, to-hit) or a plain blade / bow (rng).
function enemyWpn(d){const it=d.w&&ITEMS[d.w]&&ITEMS[d.w].k==='w'?ITEMS[d.w]:null;
 if(!it)return{n:'',wt:d.rng?'bow':'sword',d:d.d.slice(),ap:4,fat:0,rng:d.rng||1,ign:.25};
 const w={n:it.n,wt:it.wt,d:d.d.slice(),ap:it.ap,fat:0,rng:d.rng||it.rng||1,ign:it.ign!=null?it.ign:.25,id:d.w,sk:it.sk};for(const k of ['hit','two','crush','stun','look','shot','fx','ammo','bleed','wst','ret','barrels','brace'])if(it[k])w[k]=it[k];
 if(it.reload)w.reload=Object.assign({},it.reload);return w}
function mkEnemy(id,f){const d=EN[id],sh=d.shield?typeof d.shield==='object'?d.shield:{hp:d.shield,md:10,rd:10}:null;
 return initLoad(initUnit({side:1,def:d,eid:id,f,name:d.n,lvl:1,hp:d.hp,hpMax:d.hp,arm:d.arm,armMax:d.arm,helm:d.helm!=null?d.helm:Math.round(d.arm*.6),apMax:d.ap||9,ap:9,fat:0,fatMax:9999,init:d.init,ms:d.ms,rs:d.rs||0,md:d.md,rd:d.rd,
  brv:d.brv!=null?d.brv:clamp(Math.round(30+d.xp/10),30,85),fearless:d.fearless!=null?!!d.fearless:!!(d.boss||(f==='undead'&&!d.spell)),noHead:!!d.noHead,
  wpn:enemyWpn(d),abs:[],res:{},flags:{},dmgB:0,buffs:[],st:{},alive:true,shield:!!sh,shp:sh?sh.hp:0,shb:sh?{md:sh.md||0,rd:sh.rd||0}:null,
  spell:d.spell,kbN:d.kb||0,kbCh:d.kbCh||0,onhit:d.onhit,sz:d.size>1?d.size:1,fly:!!d.fly,fw:d.fireWeak||0,back:!!(d.rng||d.spell||(d.w&&isRangedW(ITEMS[d.w]))),wid:null,alt:null,wpnAlt:enemySide(d)}))}
// An enemy's sidearm (def.side: an item id, or {n, wt?, d:[min,max], ap?, rng?, ign?, hit?, stun?, two?}) as a weapon object, or null.
function enemySide(d){const x=d&&d.side;if(!x)return null;const it=typeof x==='string'?ITEMS[x]:x;if(!it||!Array.isArray(it.d))return null;
 return{n:it.n||'',wt:it.wt||'dagger',d:it.d.slice(),ap:it.ap||4,fat:typeof x==='string'?it.fat||0:it.fat||0,rng:it.rng||1,ign:it.ign!=null?it.ign:.25,hit:it.hit||0,stun:it.stun||0,two:it.two?1:0,id:typeof x==='string'?x:null}}
// Deploys units on free, walkable tiles: melee from row `front`, ranged from row `back`, overflowing along dir
// (then the other way). `used` is shared between both sides. Returns the units that found a tile.
// A size-2 unit takes a free 2x2 square: on the enemy side its footprint reaches from row `front` toward the middle (dir), never off the board.
function place(units,front,back,dir,tiles,used){used=used||new Set();const free1=(c,r)=>inb(c,r)&&!used.has(key(c,r))&&!(tiles&&tiles[key(c,r)].t==='block');
 const free=(c,r,s)=>{for(let y=0;y<s;y++)for(let x=0;x<s;x++)if(!free1(c+x,r+y))return false;return true},take=(u,c,r,s)=>{for(let y=0;y<s;y++)for(let x=0;x<s;x++)used.add(key(c+x,r+y));u.c=c;u.r=r};
 const put=(u,r0)=>{const s=u.sz||1,a0=s>1&&dir<0?r0-s+1:r0;for(const d of [dir,-dir])for(let r=clamp(a0,0,BH-s);r>=0&&r<=BH-s;r+=d)for(const c of COLS)if(c<=BW-s&&free(c,r,s)){take(u,c,r,s);return true}return false};
 const ok=new Set();units.forEach(u=>{const s=u.slot;if(s&&free(s.c,s.r,u.sz||1)){take(u,s.c,s.r,u.sz||1);ok.add(u)}});   // formation: a unit with a slot stands there
 const order=L=>L.filter(u=>(u.sz||1)>1).concat(L.filter(u=>!((u.sz||1)>1)));                                          // the large first, while there is room
 order(units.filter(u=>!u.back&&!ok.has(u))).forEach(u=>{if(put(u,front))ok.add(u)});order(units.filter(u=>u.back&&!ok.has(u))).forEach(u=>{if(put(u,back))ok.add(u)});return units.filter(u=>ok.has(u))}
// Who takes the field: o.deploy (the deployment screen's choice, at most MAXFIELD known mercs) or the company's fielded mercs.
function battleField(o){let f=fielded();if(o&&Array.isArray(o.deploy)&&o.deploy.length){const list=[];for(const d of o.deploy){const m=d&&G.roster.find(m=>m.id===d.id);if(m&&!list.includes(m)&&list.length<MAXFIELD)list.push(m)}if(list.length)f=list}return f}
const deployRow=r=>r>BH-1-SPAWN_P&&r<BH;                                 // the company's deployment zone: the SPAWN_P rows at its edge
/* battlePreview(o): what startBattle(o) would roll, for a deployment screen: {bk, tiles, foes:[enemy ids], budget}.
   It draws from the seeded stream exactly as startBattle does; hand the result back as o.tiles and o.foes and the battle
   is the one previewed (startBattle then rolls neither again). */
// Foes scale with the company's strength, not the calendar: each sword adds by level, times gearK for its kit (gearPower 2.3 = starting
// kit: x1; tier 3 ~x1.19, tier 4 ~x1.31, tier 5 ~x1.40). A company that does not improve its gear does not face harder bands.
const MERCBUD={base:7.5,lvl:5.6,sq:.07};   // what a company merc adds to the enemy budget: base + lvl a level + sq a level squared (13.2 at level 1, 31 at 4, 57 at 8, 85 at 12), times gearK (the company's strength: levels and gear, never the day). Level 1 is forgiving on purpose: a struck-down recruit lives only 30% of the time
// Past PPLV (15) a level brings attribute rolls but no mastery point: it counts MERCBUD.late of a level (a level-20 sword as a 17.5)
MERCBUD.late=.5;
const mercBud=L=>{const P=typeof PPLV==='number'?PPLV:99;if(L>P)L=P+MERCBUD.late*(L-P);return MERCBUD.base+MERCBUD.lvl*L+MERCBUD.sq*L*L};
const GEARK=.06;function gearK(m){const g=typeof gearPower==='function'?gearPower(m):2.3;return 1+GEARK*Math.max(0,g-2.3)}
function battleBudget(o){let budget=0;const S=typeof isSolo==='function'&&isSolo()?SOLOBUD:null;const sm=S&&o&&FACT[o.f]&&Array.isArray(FACT[o.f].solo)?FACT[o.f].solo:null;battleField(o).forEach(m=>budget+=(!S?mercBud(m.lvl):sm?sm[0]+sm[1]*m.lvl:S.base+S.lvl*Math.min(m.lvl,S.knee)+S.late*Math.max(0,m.lvl-S.knee))*gearK(m));return budget*(o&&o.mult||1)*(typeof BUDGETK==='number'?BUDGETK:1)*budgetK(o)}   // difficulty: diffK('budget'), Brutal's veterans (budgetK)
/* budgetK(o): the difficulty's factor on the enemy budget: diffK('budget'), times the level's curve over the fielded swords' average level L
   (22-run.js DIFF[k].vet for a company, DIFF[k].solo for a solo run's one sword, or DIFF[k].solo[origin] where an origin has its own: absent = 1):
     x (1 + lo + (hi - lo) x clamp((L - lvl0) / (lvl1 - lvl0), 0, 1))   (lo and hi default 0)
   and for a solo run also x solo.k (the one sword's own factor on top of diffK('budget')). The curve evens the win rate out over the march (a
   raw new company finds Normal harder than a seasoned one does) and, on Brutal, makes the bands grow as the company does (veteran foes, then
   full warbands) so a seasoned company or a geared hero does not outgrow it. Not in the arena (diffK('budget') alone there). */
function diffCurve(V,L){if(!V||typeof V!=='object')return 1;const lo=+V.lo||0,hi=+V.hi||0;if(!lo&&!hi)return 1;const a=+V.lvl0||0,b=+V.lvl1>a?+V.lvl1:a+1;return Math.max(.1,1+lo+(hi-lo)*clamp((L-a)/(b-a),0,1))}
function budgetK(o){let k=runK('budget');if(typeof diffX!=='function'||o&&o.arena)return k;
 const solo=typeof isSolo==='function'&&isSolo(),S=solo?soloDiff(o):null,V=solo?(S[G&&G.origin]&&typeof S[G.origin]==='object'?S[G.origin]:S):diffX('vet');if(!V||typeof V!=='object')return k;
 if(solo&&+V.k>0)k*=+V.k;
 if(V.lo||V.hi){let F=[];try{F=battleField(o)}catch(e){F=[]}if(F.length)k*=diffCurve(V,F.reduce((s,m)=>s+(+m.lvl||1),0)/F.length)}return k}
// The enemy ids startBattle(o) would field, rolled now (seeded). Hand them back as o.foes (or o.fixedAll) to fight exactly these.
// (An EN entry with max and sub fields is capped here: the ones beyond max take the field as EN[sub], so what is previewed is what fights.)
/* ---- Fixed rosters (Phase 8B endgame, CONTRACT.md): o.roster = [{id, n?, lvl?, elite?, at?:{c,r}, name?, hpK?}] is the enemy side exactly as
   listed: no budget, no rank from the company (its size, level, renown, day or power never reach it). lvl sets the foe's rank (lvl 1 = as in EN,
   every 4 levels doubles its strength the way foeRank would), elite marks a picked fighter (ROSTER.elite more rank, 'Elite' in its name), at a
   tile (board coordinates; r 0 is the enemy's own edge), name a proper name, hpK a hitpoint multiplier (named bosses). The one thing allowed to
   move it is the player's own difficulty setting, diffK('budget'), applied the same for everyone as a flat stat multiplier (ROSTER.dhp / dd
   exponents). Summons and the raised dead in such a battle take ROSTER.sumLvl's rank, never foeRank. rosterList(o) expands it (at most MAXFOES). */
const ROSTER={elite:1.6,dhp:.8,dd:.5,sumLvl:5};
const rosterX=e=>Math.pow(2,(Math.max(1,+e.lvl||1)-1)/4)*(e.elite?ROSTER.elite:1);
function rosterList(o){const L=o&&Array.isArray(o.roster)?o.roster:null,out=[];if(!L)return null;
 for(const e of L){if(!e||!EN[e.id])continue;const n=clamp(Math.floor(e.n==null?1:+e.n||0),0,MAXFOES);for(let i=0;i<n&&out.length<MAXFOES;i++)out.push(i?Object.assign({},e,{at:null,name:e.name&&n>1?null:e.name}):e)}
 return out}
function mkRosterUnit(e,f,dk){const u=mkEnemy(e.id,e.f&&FACT[e.f]?e.f:f);u.rx=rosterX(e);u.ros=1;if(typeof enemyInit==='function')enemyInit(u,e.id);initUnit(u);
 if(e.hpK>0){u.hp=u.hpMax=Math.round(u.hpMax*e.hpK)}
 if(dk!==1){u.hp=u.hpMax=Math.round(u.hpMax*Math.pow(dk,ROSTER.dhp));const k=Math.pow(dk,ROSTER.dd);u.wpn.d=[Math.round(u.wpn.d[0]*k),Math.round(u.wpn.d[1]*k)];u.dmgK=(u.dmgK||1)*k}
 {const nm=String(EN[e.id].n).toLowerCase();u.name=e.elite?'Elite '+nm:u.rank>=1.5?'Veteran '+nm:EN[e.id].n}if(e.name)u.name=e.name;   // 'Elite' only for the elite-markedu.elite=e.elite?1:0;
 if(Array.isArray(e.el)&&e.el.length)u.elRos=e.el.slice();   // explicit elite modifiers of a fixed roster entry (64e-elites.js)
 if(e.at&&Number.isInteger(e.at.c)&&Number.isInteger(e.at.r)&&inb(e.at.c,e.at.r))u.slot={c:e.at.c,r:e.at.r};return u}
function previewEnemies(o){if(o&&o.rival&&battleRival(o.rival))return[];if(o&&o.fabledOnly)return[];if(o&&Array.isArray(o.roster))return rosterList(o).map(e=>e.id);if(o&&o.fabledOnly)return[];const L=o.foes||o.fixedAll,n={};return(Array.isArray(L)&&L.length&&L.every(id=>EN[id])?L.slice(0,MAXFOES):buildEnemies(o.f,battleBudget(o)*(typeof eliteKeep==='function'?eliteKeep(o):1),o.fixed,o.mult,o.units,o))
 .map(id=>{const d=EN[id];n[id]=(n[id]||0)+1;return d.max&&d.sub&&EN[d.sub]&&n[id]>d.max?d.sub:id})}
function battlePreview(o){const bk=BIO[o.biome]?o.biome:BIOKEY[tileAt(G.p.x,G.p.y)]||'plains',rv=o.rival?battleRival(o.rival):null,budget=rv||Array.isArray(o.roster)?0:battleBudget(o);
 const tiles=Array.isArray(o.tiles)&&o.tiles.length===BW*BH?o.tiles:genBattleMap(bk);
 if(o.realm&&!tiles.realm&&typeof realmTiles==='function'){realmTiles(tiles,o.realm);tiles.realm=o.realm}   // a portal realm's ground (seeded, so the preview is the battle)
 if(o.obj&&o.obj.k==='siege'&&typeof objFortify==='function'&&!tiles.fortified){objFortify(tiles);tiles.fortified=1}   // the siege works (no rnd)
 if(rv)return{bk,tiles,foes:[],rival:rivalPreview(rv),rv:rv.id,budget};   // a rival company: its own swords, no budget
 if(Array.isArray(o.roster))return{bk,tiles,foes:previewEnemies(o),roster:rosterList(o),realm:o.realm||null,fabled:typeof fabledPreview==='function'?fabledPreview(o):[],budget:0};   // a fixed roster: exactly as listed
 return{bk,tiles,foes:previewEnemies(o),fabled:typeof fabledPreview==='function'?fabledPreview(o):[],budget}}
/* startBattle(o): o = {f, mult, src:{type,...}, biome?, fixed?, rival?} plus optional engine flags:
   rival: a rival company id (CONTRACT.md): the enemy side is its roster (rivalField, mkRivalUnit) instead of EN defs; o.f is set to the
   rival id when it names no faction. B.rival holds the id. An unknown rival (or one with nobody left) falls back to brigands.
   auto (AI plays the company from the first turn), quiet (no result sheet), onEnd(result) callback,
   turnCap (abort as stuck after this many unit turns; tests only), pilot (which AI plays side 0; read by the AI),
   deploy [{id: mercId, c, r}] (who is fielded and where, inside the deployment zone; everyone else is a reserve),
   tiles / foes (a battlePreview() result, so the battle is the one that was shown; fixedAll is read as foes). */
function startBattle(o){const f=battleField(o);if(!f.length)return null;if(typeof closeSheet==='function')closeSheet(true);
 const rv=o.rival?battleRival(o.rival):null,rf=rv?rivalField(rv):null;if(o.rival&&!(rf&&rf.length)){o.rival=null;if(!FACT[o.f])o.f='bandit'}else if(rv){o.rival=rv.id;if(!FACT[o.f])o.f=rv.id}
 const pv=battlePreview(o),bk=pv.bk,dep={};if(Array.isArray(o.deploy))for(const d of o.deploy)if(d&&!dep[d.id]&&Number.isInteger(d.c)&&Number.isInteger(d.r)&&inb(d.c,d.r)&&deployRow(d.r))dep[d.id]={c:d.c,r:d.r};
 const ctr=boardCenter(),b={opts:o,bk,P:BIO[bk],tiles:pv.tiles,units:[],order:[],round:0,turns:0,cur:null,sel:null,targets:null,reach:null,busy:true,over:false,stuck:false,fled:false,result:null,onEnd:o.onEnd||null,
  reserves:o.arena?[]:G.roster.filter(m=>!f.includes(m)),gone:[],rout:[false,false,false],fledN:[0,0,0],resRound:0,retreat:false,synced:false,
  log:'',floats:[],shots:[],cam:{x:ctr.x,y:ctr.y,tx:ctr.x,ty:ctr.y,z:1}};
 if(typeof elitePlan==='function')elitePlan(b,o,pv);   // elite modifiers: their share of the budget, before the foes take their rank (64e-elites.js)
 // B.auto is a live switch: turning it on while the company is waiting for orders hands the turn to the AI at once.
 let auto=!!o.auto;Object.defineProperty(b,'auto',{enumerable:true,get(){return auto},set(v){auto=!!v;if(auto&&B===b)autoKick()}});
 if(Array.isArray(o.roster)){b.frank={f:o.f,x:o.sumX>0?o.sumX:rosterX({lvl:ROSTER.sumLvl})};b.fixedSide=1}   // a fixed roster: summons take a fixed rank, never foeRank
 b.realm=typeof realmOf==='function'?realmOf(o.realm):null;   // portal realm rules (24-endgame.js)
 b.east=!!(o.east||(typeof isEast==='function'&&G&&G.p&&isEast(G.p.x,G.p.y)));   // eastern ground: 71-tiles draws eastern props
 B=b;const used=new Set(),pu=place(f.map(m=>{const u=mkPlayerUnit(m),s=m.slot;if(dep[m.id])u.slot=dep[m.id];else if(s&&(s.row===0||s.row===1)&&Number.isInteger(s.col)&&s.col>=0&&s.col<BW)u.slot={c:s.col,r:s.row?DEPLOY.p.back:DEPLOY.p.front};return u}),DEPLOY.p.front,DEPLOY.p.back,DEPLOY.p.dir,b.tiles,used),
  el=o.rival?rf.map(m=>mkRivalUnit(m,rv)):Array.isArray(o.roster)?rosterList(o).map(e=>mkRosterUnit(e,o.f,o.rosterDk>0?o.rosterDk:runK('budget'))):pv.foes.map(id=>{const e=mkEnemy(id,o.f);if(typeof enemyInit==='function')enemyInit(e,id);return initUnit(e)});
 if(o.fabled&&typeof fabledSpawn==='function')fabledSpawn(el,o);   // fabled warriors mixed into the enemy side (o.fabled: ids)
 const eu=place(el,DEPLOY.e.front,DEPLOY.e.back,DEPLOY.e.dir,b.tiles,used);
 b.rival=o.rival||null;if(o.ambush)for(const u of eu)u.unready=1;   // an ambush (o.ambush, from a parley): the company acts first in round 1, the foe starts unready
 b.units=pu.concat(eu);if(typeof objSetup==='function')objSetup(b,o.boss&&(Array.isArray(o.roster)||o.boss.fabled||(Array.isArray(o.boss.phases)&&EN[o.boss.id]&&EN[o.boss.id].boss))?Object.assign({},o,{boss:null}):o,used);else b.obj=null;if(typeof bossSetup==='function')bossSetup(b,o);if((o.cv||o.cvNames)&&typeof cvSetup==='function')cvSetup(b,o,used);b.units.forEach((u,i)=>{u.id=i;const p=tpos(u.c,u.r,T(u).h);u.sx=p.x;u.sy=p.y});if(typeof eliteSetup==='function')eliteSetup(b,o);auraScan();if(b.realm&&typeof realmStart==='function')realmStart(b);
 mode='battle';if(typeof setUI==='function')setUI();if(typeof layoutBattle==='function')layoutBattle();say(`${battleFoeN(o)} in the ${b.P.n.toLowerCase().replace(/^the /,"")}. ${eu.length} ${b.rival?'swords':'foes'}.`);nextTurn();return b}
/* (A fabled boss, or a phased boss (o.boss.phases) whose EN entry is a boss already (def.boss: the crisis bosses), skips the contract-boss upgrade of objSetup,
   CTR_BOSSK: it is boss-sized as it stands; bossSetup (21-fabled.js) marks it and runs its phases.)
   spawnUnit(u): adds a unit mid-battle (reserves, summons, the raised dead). u needs side and its stats (mkEnemy(id,f) and
   mkPlayerUnit(m) make complete ones); u.c/u.r is where it should appear: the nearest free walkable tile is used when that
   one is taken, blocked or missing. It joins the turn order from the next round. Returns u, or null when the board is full. */
function spawnUnit(u){const b=B;if(!b||!u)return null;initUnit(u);const sz=u.sz||1,free=k=>sz>1?footFree(k%BW,(k/BW)|0,sz,u):b.tiles[k].t!=='block'&&!unitAt(k%BW,(k/BW)|0);
 const c0=Number.isInteger(u.c)?clamp(u.c,0,BW-1):COLS[0],r0=Number.isInteger(u.r)?clamp(u.r,0,BH-1):EDGE[u.side?1:0],seen=new Uint8Array(BW*BH),q=[key(c0,r0)];seen[q[0]]=1;let at=-1;
 for(let i=0;i<q.length&&at<0;i++){const k=q[i];if(free(k)){at=k;break}for(const [x,y] of DIRS){const nc=k%BW+x,nr=((k/BW)|0)+y;if(inb(nc,nr)&&!seen[key(nc,nr)]){seen[key(nc,nr)]=1;q.push(key(nc,nr))}}}
 if(at<0)return null;u.c=at%BW;u.r=(at/BW)|0;u.alive=true;u.gone=null;u.id=b.units.length;if(u.side===1&&!u.f)u.f=b.opts.f;b.units.push(u);const p=tpos(u.c,u.r,T(u).h);u.sx=p.x;u.sy=p.y;auraScan();FX.emit('spawn',{u});return u}
/* ---- Statuses ---- */
// The statuses and timed buffs a unit carries now: [{key, n (name), turns}], keys from STATUS.
function unitStatuses(u){const out=[],add=(key,turns)=>{if(!out.some(x=>x.key===key))out.push({key,n:STATUS[key]?STATUS[key].n:key,turns:turns||0})};
 for(const k in u.st)if(u.st[k]>0)add(k,u.st[k]);if(u.rooted&&!(u.st.root>0)&&!(u.st.webbed>0))add('root',0);if(u.dazed&&!(u.st.daze>0))add('daze',0);
 for(const x of u.buffs)add(x.key&&STATUS[x.key]?x.key:x.indom?'indom':'buff',x.dur);if(u.shpMax>0&&!u.shield&&!u.slung)add('splitshield',0);if(u.slung)add('slung',0);if(u.weakened&&!(u.st.weak>0))add('weak',0);if(u.wpn&&u.wpn.reload&&u.loaded===false)add('unloaded',0);
 if(u.ward>0)add('eward',u.ward);{const tp=tiredPen(u),f=u.flags||{};if(tp>0)add('tired',tp);if(f.dance&&u.dnc>0)add('dance',Math.min(15,f.dance*u.dnc));if(f.flow&&u.dnc>0)add('flow',f.flow*Math.min(3,u.dnc));if(f.fleet&&u.mvd)add('fleet',0)}return out}
const statusList=unitStatuses;                                           // alias: the same list under a name no other file defines
// Gives t status key for n turns (never shortens one it already has) and tells the scene.
function addStatus(t,key,n){if(!t.alive||!(n>0))return;
 if(key==='stun'&&t.flags){if(t.flags.noStun){float(t,'Unshakable','#c8d0d8');return}if(t.flags.roll&&rnd()<t.flags.roll){float(t,'Rolled with it','#c8d0d8');return}}   // armor trees: Unshakable, Rolling with it
const had=t.st[key]||0;t.st[key]=Math.max(had,n);if(t.st[key]>had)FX.emit('status',{t,key,n:t.st[key]})}
function addBuff(t,buff,dur){const x=Object.assign({dur:dur||2},buff);if(x.key)t.buffs=t.buffs.filter(y=>y.key!==x.key);t.buffs.push(x);if(x.key)FX.emit('status',{t,key:x.key,n:x.dur});return x}
function dropBuff(t,k){const n=t.buffs.length;t.buffs=t.buffs.filter(x=>x.key!==k);return t.buffs.length<n}
/* ---- Morale ----
   u.mor: 0 fleeing, 1 breaking, 2 wavering, 3 steady, 4 confident (MORN, MORFX). A check passes with chance resolve + bonus (5..95%).
   Bad news (dir -1) lowers morale one step on a failed check; good news (dir +1) raises it one step on a passed one.
   Checks: an ally dies within 3 tiles (bonus 35, 25 if adjacent); a single hit takes HEAVYHIT of max hitpoints (30);
   starting a turn surrounded: 3+ foes adjacent, or 2+ with no ally adjacent (30); killing a foe (killer +25, allies within 3 tiles -10);
   starting a turn below steady with no foe within 2 tiles (+10, up to steady). A fleeing unit tests to rally at the start of
   its turn (resolve +10, -15 per adjacent foe) and comes back wavering. Fearless units never test. */
function setMorale(u,to){to=clamp(to,0,4);const from=u.mor;if(from===to||!u.alive)return false;u.mor=to;float(u,MORN[to],to>from?'#9bd96f':'#ffd27a');FX.emit('morale',{u,from,to});
 if(to===0){dropBuff(u,'riposte');dropBuff(u,'spearwall');dropBuff(u,'shieldwall');say(`${u.name} breaks and runs.`);checkRout(u.side)}return true}
/* Traits in morale checks (TRAITS in 10-data.js): moraleImmune(u) — Beast-wise against a TRAITF.beast faction takes no bad-news check at all;
   traitMor(u,dir): Craven's badMor on bad news, Superstitious's -superst in a battle against a TRAITF.superst faction. The battle's faction is
   B.opts.f; enemies use no traits. */
const battleF=()=>B&&B.opts&&B.opts.f||null;
function moraleImmune(u){const f=u&&u.flags;return!!(f&&f.beastwise&&u.side===0&&TRAITF.beast.includes(battleF()))}
function traitMor(u,dir){const f=u.flags||{};let v=0;if(dir<0&&f.badMor)v+=f.badMor;if(f.superst&&TRAITF.superst.includes(battleF()))v-=f.superst;return v}
function moraleCheck(u,bonus,dir){if(!B||!u.alive||u.fearless||u.gone)return null;if(dir<0?u.mor<=0:u.mor<=0||u.mor>=4||B.rout[u.side])return null;if(dir<0&&moraleImmune(u))return null;
 const pass=rnd()*100<clamp(eff(u,'brv')+bonus+brvAura(u)+traitMor(u,dir),5,95);if(dir<0&&!pass)setMorale(u,u.mor-1);else if(dir>0&&pass)setMorale(u,u.mor+1);return pass}
// Inspiring presence: the best brvAura of an ally within 3 tiles adds to u's morale checks.
function brvAura(u){let v=0;if(!B)return 0;for(const o of B.units)if(o.alive&&o!==u&&o.side===u.side&&o.flags&&o.flags.brvAura>v&&mdist(o,u)<=3)v=o.flags.brvAura;return v}
// A side of three or more routs when more than half of those still alive (on the field or fled from it) are fleeing: everyone but the fearless runs, and nobody rallies.
// A rival company (B.rival) also breaks once RIVALBRK of the swords it fielded are down, dead or gone: hired men do not die to the last.
const RIVALBRK=.5;
function rivalBroken(b){if(!b.rival)return false;let n=0,l=0;for(const u of b.units)if(u.side===1&&u.m&&!u.spawned){n++;if(!u.alive)l++}return n>=2&&l>=Math.ceil(n*RIVALBRK)}
function checkRout(side){const b=B;if(!b||b.rout[side])return false;const al=b.units.filter(u=>u.alive&&u.side===side),n=al.length+b.fledN[side],f=al.filter(u=>u.mor===0).length+b.fledN[side],rb=side===1&&rivalBroken(b);
 if(!al.length||(!rb&&(n<3||f*2<=n)))return false;b.rout[side]=true;say(side===0?'The company breaks. Every sword for himself!':rb?`${battleFoeN(b.opts)} have lost half their swords. They break and run!`:'The enemy breaks and runs!');
 for(const u of al)if(!u.fearless&&u.mor>0)setMorale(u,0);return true}
const adjFoes=u=>B.units.filter(e=>e.alive&&e.side!==u.side&&mdist(e,u)===1);
// Start-of-turn morale for u. Returns true when u spends this turn fleeing.
function moraleTurn(u){if(u.fearless){u.mor=Math.max(u.mor,3);return false}
 if(u.mor===0){if(!B.rout[u.side]&&rnd()*100<clamp(eff(u,'brv')+10-15*adjFoes(u).length,5,90)){setMorale(u,2);addBuff(u,{key:'rallied',brv:10},2);say(`${u.name} rallies.`);return false}return true}
 const near=adjFoes(u).length;
 if(near>=3||(near>=2&&!B.units.some(x=>x.alive&&x!==u&&x.side===u.side&&mdist(x,u)===1)))moraleCheck(u,30,-1);
 else if(u.mor<3&&!B.units.some(e=>e.alive&&e.side!==u.side&&mdist(e,u)<=2))moraleCheck(u,10,1);
 return u.mor===0}
// A fleeing unit's whole turn: it runs for its own edge and leaves the field when it gets there. Nobody controls it.
async function fleeTurn(u){const b=B,er=EDGE[u.side];if(u.r===er){leaveField(u,'fled');return}if(u.rooted||u.ap<2){await sleep(160);return}
 const D=dijkstra(u,u.ap);let best=-1,bd=Math.abs(u.r-er),bc=0;D.forEach((v,k)=>{if(v.air)return;const d=Math.abs(((k/BW)|0)-er);if(d<bd||(d===bd&&best>=0&&v.cost<bc)){bd=d;bc=v.cost;best=k}});
 const k0=key(u.c,u.r);if(best>=0){await walkPath(u,pathTo(D,best));if(B!==b||!u.alive)return}
 if(u.r===er){leaveField(u,'fled');return}
 if(key(u.c,u.r)===k0){u.stuckN=(u.stuckN||0)+1;if(u.stuckN>=3)leaveField(u,'fled')}else u.stuckN=0;await sleep(120)}   // boxed in for three turns: it slips away where it stands
/* ---- Leaving the field: withdraw, retreat, flight ---- */
// What cannot wait for the result: a merc who left keeps the hitpoints it left with, and a split shield does not come home.
// (Armor condition, m.cond, is written by resolveBattle() from u.arm / u.helm for everyone who lives.)
function syncMerc(u){const m=u.m;if(!m)return;if(u.gone)m.hp=Math.max(1,Math.min(u.hp,calc(m).hp));if(u.shpMax>0&&!u.shield&&!u.slung&&m.eq.s){m.eq.s=null}}
function leaveField(u,why){if(!B||!u.alive)return false;u.alive=false;u.gone=why;u.buffs=[];B.gone.push(u);if(why==='fled')B.fledN[u.side]++;syncMerc(u);
 float(u,why==='fled'?'Fled':'Withdrew','#c8d0d8');say(`${u.name} ${why==='fled'?'flees the field':'leaves the field'}.`);FX.emit('withdraw',{u,why});if(why==='fled')checkRout(u.side);return true}
/* battleSync(): runs once, when the battle is decided and before its result is resolved: hitpoints of those who left the field,
   shields that were split. Units that left alive stay in B.units with alive=false and gone set (they are also listed in B.gone);
   resolveBattle() must count them as survivors, not as casualties. */
function battleSync(){const b=B;if(!b||b.synced)return;b.synced=true;for(const u of b.units)if(u.side===0&&u.m&&(u.alive||u.gone||u.down))syncMerc(u)}
// The foe that punishes u for turning its back: adjacent, able, armed for melee and not yet used this round.
const canFree=e=>e.alive&&!e.st.stun&&e.mor!==0&&!isRangedW(e.wpn)&&!(e.st.blinded>0);   // Pocket sand (Rogue): a blinded foe makes no free attacks
function zocFoe(u){return B.units.find(e=>e.side!==u.side&&mdist(e,u)===1&&canFree(e)&&!e.aoo)||null}
const FREESAY={counter:(e,u)=>`${e.name} turns the blow and cuts back.`,zoc:(e,u)=>`${e.name} strikes as ${u.name} turns away.`,riposte:(e,u)=>`${e.name} ripostes.`,spearwall:(e,u)=>`${e.name} meets ${u.name} with the spear.`,retreat:(e,u)=>`${e.name} cuts at ${u.name}'s back.`};
// One free attack by e on u (zone of control, riposte, spear wall, retreat). Returns true when it hit.
async function freeAttack(e,u,why){if(!canFree(e)||!u.alive)return false;say((FREESAY[why]||FREESAY.zoc)(e,u));return strike(e,u,pvFreeAb(e,why),{free:why})}
const canWithdraw=u=>!!(B&&!B.over&&u&&u.alive&&u.r===EDGE[u.side]&&!u.rooted&&u.ap>=AB.withdraw.ap&&!(B.opts&&B.opts.arena));   // the arena's gates are shut
/* withdraw(u): u leaves the battle alive from its own edge row (2 AP). A foe next to it gets its free attack first; a hit
   holds u on the field. Returns true when u left. Safe to call from the HUD (it then moves the turn on) and from an AI turn. */
async function withdraw(u){const b=B;if(!b||!canWithdraw(u))return false;const ui=!b.busy;if(ui){b.busy=true;b.sel=null;b.targets=null;b.reach=null}u.ap-=AB.withdraw.ap;let held=false;
 const foe=zocFoe(u);if(foe){foe.aoo=1;if(await freeAttack(foe,u,'zoc')){if(u.alive)float(u,'Halted','#ffd27a');held=true}}if(B!==b)return false;
 if(!held&&u.alive)leaveField(u,'withdraw');if(ui){b.busy=false;afterAction()}return u.gone==='withdraw'}
const canRetreat=()=>!!(B&&!B.over&&!B.retreat&&B.units.some(u=>u.alive&&u.side===0&&!u.ally)&&!(B.opts&&B.opts.arena&&B.opts.arena.noYield));   // an arena bout: the retreat is a yield, never in one sine missione
/* soundRetreat(): the whole company quits the field. Units with no foe adjacent leave at once; engaged units take one free attack
   from every foe next to them, then leave if they live. The battle ends as a retreat (result.fled). Returns true when sounded. */
async function soundRetreat(){const b=B;if(!canRetreat())return false;b.retreat=true;b.fled=true;b.busy=true;b.sel=null;b.targets=null;b.reach=null;b.reserves=[];say('The retreat is sounded.');
 for(const u of b.units.filter(u=>u.alive&&u.side===0&&!u.ally)){for(const e of adjFoes(u)){if(B!==b)return true;if(u.alive)await freeAttack(e,u,'retreat')}if(B!==b)return true;if(u.alive)leaveField(u,'retreat')}
 checkEnd();return true}
/* ---- Reserves ---- */
function reserveTile(){const b=B,r=EDGE[0];for(const c of COLS)if(b.tiles[key(c,r)].t!=='block'&&!unitAt(c,r))return key(c,r);return -1}
const canCallReserve=()=>!!(B&&!B.over&&!B.retreat&&B.reserves.length&&B.resRound!==B.round&&B.units.filter(u=>u.alive&&u.side===0&&!u.ally).length<MAXFIELD&&reserveTile()>=0);
/* callReserve(m, k?): brings reserve m (a merc from B.reserves, or its id) onto a free tile of the company's edge row (tile key k,
   or the free one nearest the middle). One reserve a round, and only while fewer than MAXFIELD company units stand on the field.
   The newcomer acts from the next round. Returns its unit, or null. */
function callReserve(m,k){const b=B;if(!canCallReserve())return null;const i=b.reserves.findIndex(x=>x===m||x.id===m);if(i<0)return null;
 if(!(Number.isInteger(k)&&k>=0&&k<BW*BH&&((k/BW)|0)===EDGE[0]&&b.tiles[k].t!=='block'&&!unitAt(k%BW,(k/BW)|0)))k=reserveTile();
 const u=mkPlayerUnit(b.reserves[i]);u.c=k%BW;u.r=(k/BW)|0;if(!spawnUnit(u))return null;b.reserves.splice(i,1);b.resRound=b.round;u.ap=0;say(`${u.name} joins the fight.`);FX.ui();return u}
/* ---- Abilities ---- */
function abilityInfo(u,id){const w=u.wpn,fl=u.flags||{},bowR=w.rng+(w.wt==='bow'?(fl.eagle?1:0)+(fl.rngB||0):0)+(w.wt==='throwing'?fl.throwRng||0:0);
 if(id==='attack'){const o={id,n:w.wt==='throwing'?'Throw':isRangedW(w)?'Shoot':'Attack',ap:w.ap,fat:w.fat||0,rng:B&&B.realm&&B.realm.sight?Math.min(bowR,B.realm.sight):bowR,tgt:'enemy',wpn:1,mult:1};if(w.fx)o.fx=w.fx;return pvAbInfo(u,o)}
 const a=Object.assign({id},AB[id]);if(a.wpn){if(a.ap==null)a.ap=w.ap;if(a.rng==null)a.rng=bowR;if(w.fatCut&&a.fat)a.fat=Math.max(0,a.fat-w.fatCut)}if(a.swapW&&u.swapFree)a.ap=0;
 if(a.reloadW&&w.reload){a.ap=w.reload.ap;a.fat=w.reload.fat}
 if(a.spikeD)a.dmgD=(u.spike||[10,18]).slice();
 if(a.buff&&a.buff.key==='shieldwall'&&u.shw)a.buff=Object.assign({},a.buff,{md:(a.buff.md||0)+u.shw,rd:(a.buff.rd||0)+u.shw});
 if(B&&B.realm&&B.realm.sight&&a.tgt==='enemy'&&a.rng>B.realm.sight)a.rng=B.realm.sight;   // the Hollow: darkness shortens every shot and spell
 return pvAbInfo(u,a)}
/* ---- Arms: the ranged lock and the weapon swap ----
   A ranged weapon attack is an ability that uses a ranged weapon (RANGEDWT: bow, crossbow, flintlock): a.needs one of them, a thrown
   weapon (a.thrown: the kunai's throw), or a weapon
   ability (a.wpn) with one in hand. Spells are not. Reload weapons (wpn.reload) must also be loaded to fire (canFire); reloading is never locked.
   rangedLocked(u): an able foe (alive, not fleeing, not stunned) stands next to u, so it cannot shoot (perk flag noLock lifts it). */
/* a.needs: one weapon family, or a list of them (needsOK). a.fresh: only as the unit's first action of its turn (all its AP left). */
const needsOK=(a,wt)=>!a.needs||(Array.isArray(a.needs)?a.needs.includes(wt):a.needs===wt);
const needsN=a=>Array.isArray(a.needs)?a.needs.join(' or '):a.needs;
function isRangedAtk(u,a){return!!a&&!a.magic&&!a.inHand&&(!!a.thrown||(Array.isArray(a.needs)?a.needs.some(w=>RANGEDWT.includes(w)):RANGEDWT.includes(a.needs))||(!!a.wpn&&isRangedW(u.wpn)))}
// False when a would fire a reload weapon that is not loaded.
const canFire=(u,a)=>!(u.wpn&&u.wpn.reload&&u.loaded===false&&isRangedAtk(u,a))&&!outOfThrows(u,a);   // a throwing weapon with no throws left (60p-passives.js)
function rangedLocked(u){if(!B||!u||!u.alive||(u.flags&&u.flags.noLock))return false;for(const e of B.units)if(e.alive&&e.side!==u.side&&e.mor!==0&&!(e.st&&e.st.stun)&&mdist(e,u)===1)return true;return false}
// The other weapon as a weapon object (what u would hold after a swap), or null when it has nothing to swap to.
function altWeapon(u){if(!canSwap(u))return null;return u.m?calc(u.m,{hand:u.hand==='b'?'w':'b'}).wpn:u.wpnAlt}
// Mercs swap only with a sidearm equipped (m.eq.b; the main hand may be empty: fists); enemies with def.side.
function canSwap(u){return!!(u&&u.alive&&(u.m?!!(u.hand&&u.m.eq&&u.m.eq.b&&u.wid!==u.alt):u.wpnAlt))}
/* swapWeapons(u): exchanges the weapon in hand for the other one, as the swap ability does (no AP paid here). Every number that came
   from the old weapon (weapon-tree perks, skills, damage, range) follows the new one; hitpoints, armor, fatigue, statuses, buffs and
   injuries stay. A shield is raised with a one-handed weapon or none in hand and slung with a two-handed one. Returns true when swapped. */
function swapWeapons(u){if(!canSwap(u))return false;const from=u.wpn;u.ld=Object.assign({},u.ld);if(from&&from.reload)u.ld[wkey(from)]=u.loaded!==false;   // a fresh object: AI look-aheads restore u by a shallow copy
 if(u.m){const hand=u.hand==='b'?'w':'b',s=calc(u.m,{hand}),ld=calc(u.m,{hand:u.hand||'w'}),core=(x,k)=>x[k]-(x.shield&&x.shield.raised&&(k==='md'||k==='rd')?x.shield[k]:0);
  for(const k of ['ms','rs','md','rd','init','brv'])u[k]+=core(s,k)-core(ld,k);
  const dh=s.hp-ld.hp;if(dh){u.hpMax=Math.max(1,u.hpMax+dh);if(dh>0)u.hp+=dh;u.hp=Math.min(u.hp,u.hpMax)}u.fatMax=Math.max(30,u.fatMax+s.fat-ld.fat);u.dmgB=(u.dmgB||0)+s.dmg-ld.dmg;u.apMax+=s.ap-ld.ap;
  const shAbs=id=>AB[id]&&AB[id].shield,keep=u.abs.filter(id=>!ld.abs.includes(id));u.abs=s.abs.filter(id=>!shAbs(id)).concat(keep.filter(id=>!s.abs.includes(id)&&!shAbs(id)));
  for(const k in s.res)if(!u.res[k])u.res[k]={cur:0,max:s.res[k].max,regen:s.res[k].regen};
  u.flags=s.flags;u.wpn=s.wpn;u.hand=hand;u.wid=s.wid;u.alt=s.alt;u.cld=s;u.dw=s.dw||null}   // the off-hand weapon is in use only beside a one-handed melee weapon (11w-dualwield.js)
 else{const w=u.wpn;u.wpn=u.wpnAlt;u.wpnAlt=w;u.abs=u.abs.filter(id=>!(AB[id]&&AB[id].shield))}
 const intact=u.shpMax>0&&u.shp>0&&(u.shield||u.slung),up=!u.wpn.two;
 if(intact&&u.shield&&!up){u.shield=false;u.slung=true;if(u.shb){u.md-=u.shb.md;u.rd-=u.shb.rd}dropBuff(u,'shieldwall');FX.emit('shield',{u,raised:false})}
 else if(intact&&u.slung&&up){u.shield=true;u.slung=false;if(u.shb){u.md+=u.shb.md;u.rd+=u.shb.rd}FX.emit('shield',{u,raised:true})}
 if(u.shield&&u.m){const sh=ITEMS[u.m.eq.s];for(const id of ((sh&&sh.sk)||[]).concat(u.cld.abs.filter(id=>AB[id]&&AB[id].shield)))if(AB[id]&&!u.abs.includes(id))u.abs.push(id)}   // shield skills and shield perks come back with the shield
 {const k=wkey(u.wpn);u.loaded=!u.wpn.reload||u.ld[k]!==false}
 if(!u.m&&u.def&&Array.isArray(u.def.abs))for(const id of u.def.abs)if(AB[id]&&AB[id].shield&&u.shield&&!u.abs.includes(id))u.abs.push(id);
 float(u,u.wpn.n||'Fists','#e9e0c9');FX.emit('swap',{u,from,to:u.wpn});return true}
// Why u cannot use a now ('' when it can): for the HUD. Mirrors canUse().
function useBlock(u,a){if(!u||!a)return'Unavailable';if(u.mor===0)return'Fleeing';if(a.swapW&&!canSwap(u))return'No other weapon';
 if(!needsOK(a,u.wpn.wt))return'Needs a '+({fist:'free hand',bow:'bow in hand'}[a.needs]||needsN(a)+' in hand');if(a.fresh&&u.ap<u.apMax)return'Only as the first action of a turn';if(a.light&&!isLightW(u.wpn))return'Needs a light weapon in hand (a dagger, a one-handed blade of at most '+LIGHTW.fat+' fatigue, or fists)';if(a.offhand&&(u.shield||u.wpn.two||u.dw))return'Needs a free off hand: no shield raised, no off-hand weapon, no two-handed weapon';if(a.dual&&!u.dw)return u.m&&u.cld&&u.cld.dwIdle?'Needs a one-handed melee weapon in hand beside the off-hand weapon':'Needs a weapon in each hand';if(a.two&&!u.wpn.two)return'Needs a two-handed weapon';if(a.oneH&&u.wpn.two)return'Needs a pistol: a one-handed firearm';
 if(a.noBow&&isRangedW(u.wpn))return'Not with a ranged weapon in hand';if(a.shield&&!u.shield)return u.slung?'Shield slung: swap to a one-handed weapon':'Needs a shield';
 if(isRangedAtk(u,a)&&rangedLocked(u))return'Engaged: no shooting with a foe next to you';if(outOfThrows(u,a))return'Out of throws: swap weapons or strike with it in hand';if(!canFire(u,a))return'Not loaded: reload first';
 if(a.reloadW&&!u.wpn.reload)return'Nothing to reload';if(a.reloadW&&u.loaded!==false)return'Already loaded';if(a.withdraw&&!canWithdraw(u))return'Only from your own edge';
 if(a.once&&u.used&&u.used[a.id])return'Already used this battle';if(a.perTurn&&u.usedT&&u.usedT[a.id])return'Already used this turn';if(a.uses&&gtUsesLeft(u,a)<=0)return'None left this battle';if(a.cost&&(!u.res[a.cost[0]]||u.res[a.cost[0]].cur<a.cost[1]))return'Not enough '+(RESN[a.cost[0]]||a.cost[0]);
 if(u.ap<a.ap)return'Not enough AP';if(u.fat+a.fat>u.fatMax)return'Too tired';return''}
function canUse(u,a){if(u.mor===0||u.ap<a.ap||u.fat+a.fat>u.fatMax)return false;if(a.cost&&(!u.res[a.cost[0]]||u.res[a.cost[0]].cur<a.cost[1]))return false;if(!needsOK(a,u.wpn.wt))return false;if(a.fresh&&u.ap<u.apMax)return false;if(a.light&&!isLightW(u.wpn))return false;if(a.offhand&&(u.shield||u.wpn.two||u.dw))return false;if(a.dual&&!u.dw)return false;
 if(a.two&&!u.wpn.two)return false;if(a.shield&&!u.shield)return false;if(a.withdraw&&!canWithdraw(u))return false;if(a.once&&u.used&&u.used[a.id])return false;if(a.perTurn&&u.usedT&&u.usedT[a.id])return false;if(a.uses&&gtUsesLeft(u,a)<=0)return false;if(a.oneH&&u.wpn.two)return false;
 if(a.noBow&&isRangedW(u.wpn))return false;if(a.swapW&&!canSwap(u))return false;if(isRangedAtk(u,a)&&rangedLocked(u))return false;if(!canFire(u,a))return false;
 if(a.reloadW&&(!u.wpn.reload||u.loaded!==false))return false;return true}
function payFor(u,a){u.ap-=a.ap;u.fat+=a.fat;if(a.cost)u.res[a.cost[0]].cur-=a.cost[1];if(a.once)(u.used||(u.used={}))[a.id]=1;if(a.uses){u.used=Object.assign({},u.used);u.used[a.id]=(u.used[a.id]||0)+1}if(a.perTurn){u.usedT=Object.assign({},u.usedT);u.usedT[a.id]=1}if(a.swapW)u.swapFree=false;
 pvPay(u,a);if(u.wpn&&u.wpn.reload&&isRangedAtk(u,a)&&!pvBarrel(u))setLoaded(u,false)}      // firing a reload weapon spends its load (a twin barrel: the second one)
// Loads or unloads the weapon in hand (u.loaded, and its entry in u.ld).
function setLoaded(u,v){u.loaded=!!v;u.ld=Object.assign({},u.ld);u.ld[wkey(u.wpn)]=!!v;if(v&&u.wpn&&u.wpn.barrels>1)setAmmo(u,u.wpn.barrels);if(v)rlPrime(u)}   // Primed (Gunnery, 64v-roles.js)
/* ---- Line of sight and cover ----
   shotKind: 0 a melee blow (adjacent, a free attack, a dash), 1 a reach weapon striking 2+ tiles away (a pike over the front
   rank: walls stop it, bodies do not), 2 a shot (bows, spells, aura waves).
   losInfo(u,t,a?) -> {blocked, cover, ff}. The line runs over the grid from one tile to the other (the same tiles both ways).
   An obstacle, or ground more than 1 step higher than both ends, blocks it. Every unit standing in it is 1 step of cover
   (at most 2; one step less when the shooter stands higher than the target), worth -COVERPEN to hit each. ff lists the
   shooter's own side in the line (an ally standing right in front of the shooter included): a shot that misses strays into one
   of them with chance FFCH, for FFDMG of its damage (every shot: bows, crossbows, firearms, gift arrows, spells, aura waves).
   A reach weapon (polearm, greatsword, pike: kind 1) strikes over the tile between, ally or empty, but not through a wall. */
function shotKind(u,t,a){const d=mdist(u,t);if(d<=1||(a&&(a.melee||a.dash)))return 0;return a&&a.wpn&&!a.magic&&!isRangedW(u.wpn)&&u.wpn.rng>=d?1:2}
// Footprints: the line runs from a tile of the shooter's footprint to a tile of the target's; of all the pairs the clearest one counts
// (not blocked, then the least cover, then the shortest, then the first in tile order). A unit in the line counts once, whatever its size.
function losInfo(u,t,a){const kind=shotKind(u,t,a);if(!kind||!B)return{blocked:false,cover:0,ff:[]};
 if((u.sz||1)===1&&(t.sz||1)===1)return losLine(u,t,u.c,u.r,t.c,t.r,kind);let best=null,bd=0;
 for(const [uc,ur] of unitTiles(u))for(const [tc,tr] of unitTiles(t)){const L=losLine(u,t,uc,ur,tc,tr,kind),d=Math.abs(uc-tc)+Math.abs(ur-tr);
  if(!best||(best.blocked&&!L.blocked)||(best.blocked===L.blocked&&(L.cover<best.cover||(L.cover===best.cover&&d<bd)))){best=L;bd=d}}return best}
function losLine(u,t,uc,ur,tc,tr,kind){const out={blocked:false,cover:0,ff:[]};let pc=uc,pr=ur,qc=tc,qr=tr;if(key(tc,tr)<key(uc,ur)){pc=tc;pr=tr;qc=uc;qr=ur}
 const dc=qc-pc,dr=qr-pr,n=Math.max(Math.abs(dc),Math.abs(dr)),top=Math.max(T(u).h,T(t).h)+1,fromU=pc===uc&&pr===ur;let cov=0,seen=null;
 for(let i=1;i<n;i++){const c=Math.round(pc+dc*i/n),r=Math.round(pr+dr*i/n),tl=B.tiles[key(c,r)];if(tl.t==='block'||tl.h>top){out.blocked=true;continue}
  const x=unitAt(c,r);if(x&&x!==u&&x!==t){if((x.sz||1)>1){if(seen&&seen.includes(x))continue;(seen||(seen=[])).push(x)}cov++;
   if(x.side===u.side&&ffInLine(u,t,x,fromU?i:n-i,n,tl.h))out.ff.push(x)}}
 if(kind===1){out.ff=[];return out}if(T(u).h>T(t).h)cov--;out.cover=clamp(cov,0,2);return out}
/* Which ally in the line a missed shot can stray into (ffInLine). The ally right in front of the shooter (the first tile) is never in
   danger: the shooter aims past them, over their shoulder or over their head. An arcing shot (bows, slings) leaves the shooter and comes
   down on the target, so of the rest only the ally right in front of the target (the last tile) is in its path, and not one standing
   lower than the target (under the arrow's fall); the middle of the line is overhead. Flat shots (crossbows, firearms, spells, aura
   waves) keep the rest of the line. i: the ally's tile counted from the shooter (1..n-1). */
function ffInLine(u,t,x,i,n,h){if(i===1)return false;                     // the ally at the shooter's feet
 const bow=!!(u.wpn&&(u.wpn.wt==='bow'||u.wpn.wt==='sling'))&&!u.wpn.reload;   // an arcing shot: bows (and slings)
 if(!bow)return true;return i===n-1&&h>=T(t).h}
const morOf=u=>MORFX[u.mor==null?3:u.mor]||MORFX[3];
// Chance in percent that u's ability a hits t: 100 for abilities that cannot miss, else 5..95.
/* Talent terms in the hit chance (all 0 without the perks): +15 against a marked foe; the defender's adjDef (an ally next to it) or
   loneDef (none); in melee the attacker's flank (an ally of the attacker also next to the target) and duelHit (one-handed, no shield
   raised); cmd: the best Battle orders of an ally next to the attacker; guard: the best Cover of an ally next to the target, against
   shots and spells; coverIgn steps of cover ignored; longShot: no distance penalty. */
const STBONUS={marked:15},WEAKDMG=.25;
function hasAdj(x,side,not){for(const o of B.units)if(o.alive&&o!==x&&o!==not&&o.side===side&&mdist(o,x)===1)return true;return false}
function bestAdj(x,k){let v=0;for(const o of B.units)if(o.alive&&o!==x&&o.side===x.side&&o.flags&&o.flags[k]>v&&mdist(o,x)===1)v=o.flags[k];return v}
const isDuel=(u,a)=>!a.magic&&!u.wpn.two&&!isRangedW(u.wpn)&&!u.shield&&!u.dw;   // a free off hand: no shield raised, no off-hand weapon (11w-dualwield.js)
/* ---- Rogues: the Assassin, Rogue and Shadowdancer trees (MAST in 10-data.js; abilities, statuses and the rest in 64r-rogues.js) ----
   isLightW(w): a light weapon: bare fists, any dagger, or a one-handed melee weapon of at most LIGHTW.fat fatigue (short swords, the
   wakizashi). notActed(t): t still waits for its turn this round (it is in B.order). impaired(t): dazed, blinded, stunned, rooted,
   webbed or fleeing. quickStep(u): Light step is ready (the first tile u moves this turn costs QSTEP less AP).
   rogueHit / rogueDmg: the to-hit and damage terms of the tree mods, inside hitChance() and dmgBonus(), so forecast() is exact:
     stabHit / stabDmg  (Backstab) light weapon, melee, against a foe one of u's allies also stands next to
     wakeDmg            (Before they wake) light weapon, melee, against a foe that has not acted yet this round
     firstHit / firstDmg (Quicker than thought) melee, against a foe that has not acted yet this round
     dirtyHit / dirtyDmg (Low blow) any weapon attack against an impaired foe */
const LIGHTW={fat:8},QSTEP=2;
const isLightW=w=>!!w&&(w.wt==='fist'||(!w.two&&!isRangedW(w)&&(w.wt==='dagger'||(w.fat||0)<=LIGHTW.fat)));
const notActed=t=>!!(B&&Array.isArray(B.order)&&B.order.includes(t));
const impaired=t=>!!(t&&(t.mor===0||t.dazed||t.st.daze>0||t.st.blinded>0||t.st.stun>0||t.rooted||t.st.root>0||t.st.webbed>0));
const quickStep=u=>!!(u&&u.flags&&u.flags.quickstep&&!u.qsT);
function rogueHit(u,t,a){const f=u.flags;if(a.magic||!f||!(f.stabHit||f.firstHit||f.dirtyHit))return 0;const melee=!!a.melee||mdist(u,t)<=1;let v=0;
 if(melee){if(f.stabHit&&isLightW(u.wpn)&&hasAdj(t,u.side,u))v+=f.stabHit;if(f.firstHit&&notActed(t))v+=f.firstHit}if(f.dirtyHit&&impaired(t))v+=f.dirtyHit;return v}
/* ---- Gladiators: the Gladiator and Arena champion trees (MAST in 10-data.js; abilities, statuses and hooks in 64g-gladiators.js) ----
   pinned(t): netted, rooted or webbed. alone(u,t): no other ally of u stands next to t. glHit / glDmg: inside hitChance() and dmgBonus():
     pinHit / pinDmg   (Pinned prey) any weapon attack against a pinned foe
     soloHit / soloDmg (Single combat) melee, against a foe no other ally of u stands next to */
const pinned=t=>!!(t&&(t.st.netted>0||t.rooted||t.st.root>0||t.st.webbed>0));
const alone=(u,t)=>!hasAdj(t,u.side,u);
function glHit(u,t,a){const f=u.flags;if(a.magic||!f||!(f.pinHit||f.soloHit))return 0;let v=0;if(f.pinHit&&pinned(t))v+=f.pinHit;if(f.soloHit&&(!!a.melee||mdist(u,t)<=1)&&alone(u,t))v+=f.soloHit;return v}
function glDmg(u,t,a){const f=u.flags;if(a.magic||!f||!(f.pinDmg||f.soloDmg))return 0;let x=0;if(f.pinDmg&&pinned(t))x+=f.pinDmg;if(f.soloDmg&&mdist(u,t)<=1&&alone(u,t))x+=f.soloDmg;return x}
function rogueDmg(u,t,a){const f=u.flags;if(a.magic||!f||!(f.stabDmg||f.wakeDmg||f.firstDmg||f.dirtyDmg))return 0;const melee=!!a.melee||mdist(u,t)<=1,lw=melee&&isLightW(u.wpn);let x=0;
 if(lw&&f.stabDmg&&hasAdj(t,u.side,u))x+=f.stabDmg;if(lw&&f.wakeDmg&&notActed(t))x+=f.wakeDmg;if(melee&&f.firstDmg&&notActed(t))x+=f.firstDmg;if(f.dirtyDmg&&impaired(t))x+=f.dirtyDmg;return x}
/* Fatigue. tiredPen(u): 0 up to TIRED.from (half) of its maximum fatigue, then 1 point for every 5% more, to TIRED.max at full
   exhaustion (rounded): 50% 0, 60% 2, 75% 5, 90% 8, 100% 10. A tired attacker loses that much to hit (melee, shots and spells alike)
   and a tired target that much defense (it is that much easier to hit). Units that do not tire (fatMax 999 and up: most foes) never
   pay it; foes with real fatigue (orcs, ogres...) do. */
const TIRED={from:.5,max:10},WINDMAX=100;   // WINDMAX: the breath of a unit that never tires, squeezed out by the fist trees (u.gwind, 64x-fists.js)
function tiredPen(u){if(!u)return 0;const tire=u.fatMax>0&&u.fatMax<999;if(!tire&&!(u.gwind>0))return 0;const r=tire?(u.fat||0)/u.fatMax:u.gwind/WINDMAX;if(r<=TIRED.from)return 0;return Math.round(TIRED.max*Math.min(1,(r-TIRED.from)/(1-TIRED.from)))}
/* Defense t gets from its armor-tree perks against u's ability a (already inside hitChance; forecast().armDef shows it):
   Fleet (moved on its turn, against shots), Fresh legs (fatigue below half), Dancer (misses since its last turn), Layered defense
   (body armor above half). */
function armorDef(u,t,a){const f=t.flags||{};let v=0;if(!(f.fleet||f.freshDef||f.dance||f.layerDef||f.flow))return 0;if(f.flow&&t.dnc>0)v+=f.flow*Math.min(3,t.dnc);   // Flow (Shadowdancer): flow a miss, at most 3 misses
 if(f.fleet&&t.mvd&&!a.magic&&shotKind(u,t,a)===2)v+=f.fleet;if(f.freshDef&&(t.fat||0)<t.fatMax*.5)v+=f.freshDef;if(f.dance&&t.dnc>0)v+=Math.min(15,f.dance*t.dnc);
 if(f.layerDef&&t.armMax>0&&t.arm>t.armMax/2)v+=f.layerDef;return v}
// Hard and Brutal (22-run.js DIFF[k].foeHit): the foes' side (side 1) strikes truer, + that many points on every roll it makes (melee, shots, spells,
// bombs), inside hitChance so the forecast is the strike; still capped at 95. 0 on the other levels and in the arena.
function foeHitB(u){if(!u||u.side!==1||typeof diffX!=='function'||B&&B.opts&&B.opts.arena)return 0;const v=+diffX('foeHit');return v>0&&isFinite(v)?v:0}
function hitChance(u,t,a){if(a.sure||pvSure(u,a))return 100;const d=mdist(u,t),melee=!!a.melee||d<=1,fu=u.flags||{},ft=t.flags||{};let sk,df;
 if(a.magic){sk=72+(u.lvl||1)*2;df=eff(t,'rd')*.5}else{sk=(isRangedAtk(u,a)||a.bomb?eff(u,'rs'):eff(u,'ms'))+(a.dmgD?0:u.wpn.hit||0);df=melee?eff(t,'md'):eff(t,'rd');if(a.bomb&&t.shield&&t.shb)df-=t.shb.rd||0}   // a raised shield is no cover from a bomb (Grenadier)
 let ch=sk-df+(a.hit||0);const hd=T(u).h-T(t).h;ch+=hd>0?10:hd<0?-10:0;if(d>2&&!a.melee&&!fu.longShot)ch-=(d-2)*2;if(t.st.stun)ch+=15;if(t.st.webbed)ch+=10;if(t.st.marked>0)ch+=STBONUS.marked;
 if(ft.adjDef||ft.loneDef){if(hasAdj(t,t.side))ch-=ft.adjDef||0;else ch-=ft.loneDef||0}
 if(melee&&!a.magic){if(fu.flank&&hasAdj(t,u.side,u))ch+=fu.flank;if(fu.duelHit&&isDuel(u,a))ch+=fu.duelHit}else if(fu.reachHit&&shotKind(u,t,a)===1)ch+=fu.reachHit;
 if(B.auraOn){ch+=bestAdj(u,'cmd');if(!melee)ch-=bestAdj(t,'guard')}
 ch+=morOf(u).hit-morOf(t).def;if(u.dazed||u.st.daze)ch-=15;if(!melee)ch-=Math.max(0,losInfo(u,t,a).cover-(fu.coverIgn||0))*COVERPEN;
 ch+=tiredPen(t)-tiredPen(u)-armorDef(u,t,a)+quarryVs(u,t).hit+rogueHit(u,t,a)+glHit(u,t,a)+pvHit(u,t,a,d,melee)+foeHitB(u);return clamp(Math.round(ch),5,95)}   // a Monster hunter's quarry (61-talents.js)
// Chance in percent that a hit lands on the head (the helmet soaks it, and it does HEADMULT to hitpoints). headB (perks) adds to weapon attacks.
// Traits: Hard-headed / Glass-jawed (t.flags.headDef) move it the other way; Steady-handed adds to headB.
function headChance(u,t,a){if(a.noDmg||a.split||t.noHead)return 0;return clamp(HEADCH+(a.head||0)+(a.wpn&&u.flags&&u.flags.headB||0)+rlHead(u,t,a)-((t.flags&&t.flags.headDef)||0),0,100)}   // Deliberate aim (64v-roles.js)
// B.auraOn: some unit gives a Battle orders / Cover bonus to its neighbours (kept fresh at every turn, spawn and swap).
function auraScan(){if(B){B.auraOn=B.units.some(x=>x.alive&&x.flags&&(x.flags.cmd||x.flags.guard));B.wallOn=B.units.some(x=>x.alive&&x.flags&&x.flags.steelWall>0);pvScan()}return!!(B&&B.auraOn)}
/* ---- Damage pieces shared by strike() and forecast(), so the forecast cannot drift ----
   dmgAfter(u,t,a,dmg,o): the rolled damage (weapon roll x mult, or the spell roll with its bonuses) after every multiplier:
   x(1 + damage buffs + dmgB + the talent bonuses that apply) -> x(1 + executioner/vsHurt) below half health -> x splash -> x1.1 from
   higher ground -> round(x max(.2, 1 - damage reduction)). */
function dmgBonus(u,t,a){const f=u.flags||{};let x=0;if(a.magic)return(u.weakened||u.st.weak>0)?-WEAKDMG:0;if(a.bomb)return gtBombDmg(u,t,a);   // a bomb: only the Grenadier's bonuses (64u-guntrees.js)
const bow=isRangedW(u.wpn),melee=mdist(u,t)<=1;if(f.vsArm&&t.arm>0)x+=f.vsArm;
 if(bow)x+=f.dmgRanged||0;else x+=f.dmgMelee||0;if(u.wpn.two&&!bow)x+=f.twoDmg||0;if(f.lowHpDmg&&u.hp<u.hpMax/2)x+=f.lowHpDmg;if(f.hurtDmg&&u.hpMax>0)x+=f.hurtDmg*Math.floor(10*Math.max(0,1-u.hp/u.hpMax))/10;if(f.vsFull&&t.hp>=t.hpMax)x+=f.vsFull;
 if(f.duelDmg&&isDuel(u,a))x+=f.duelDmg;if(f.vsBoss&&isBigFoe(t))x+=f.vsBoss;if(f.flankDmg&&melee&&hasAdj(t,u.side,u))x+=f.flankDmg;x+=rogueDmg(u,t,a)+glDmg(u,t,a)+pvDmg(u,t,a,melee);if(u.weakened||u.st.weak>0)x-=WEAKDMG;return x}
// vsBoss (fabled trees): against a boss, a fabled warrior, a huge (size 2) foe or an EN boss
const isBigFoe=t=>!!(t&&(t.boss||t.fabled||(t.sz||1)>1||(t.def&&t.def.boss)));
/* Nimble (light armor): 30% minus 1.5% per point of armor and helmet weight (t.aw), times (0.5 + 0.5 x the share of stamina left),
   in whole percent. 0 without the perk. */
function nimbleDr(t){const f=t&&t.flags;if(!f||!f.nimble)return 0;const fr=t.fatMax>0&&t.fatMax<999?1-clamp((t.fat||0)/t.fatMax,0,1):1;return Math.round(Math.max(0,30-1.5*(t.aw||0))*(.5+.5*fr))/100}
// The share of damage the armor trees take off a blow on t (inside drOf): Nimble, Brace (first hit between its turns), an ally's Bulwark of steel.
function armorDr(t){const f=t.flags||{};let dr=0;if(f.nimble)dr+=nimbleDr(t);if(f.brace&&!t.brc)dr+=f.brace;if(B&&B.wallOn)dr+=bestAdj(t,'steelWall');return dr}
function drOf(u,t,a){let dr=buffSum(t,'dr')+armorDr(t);const f=t.flags||{};if(f.drB)dr+=f.drB;if(f.lastStand&&t.hp<t.hpMax/2)dr+=f.lastStand;
 if(f.drRanged||f.drMelee){if(shotKind(u,t,a)===2)dr+=f.drRanged||0;else dr+=f.drMelee||0}
 if(t.shield){if(f.shieldDr)dr+=f.shieldDr;if(f.deflect&&shotKind(u,t,a)===2)dr+=f.deflect}return dr+pvDr(u,t,a)}
function dmgAfter(u,t,a,dmg,o){const f=u.flags||{};dmg*=1+buffSum(u,'dmg')+(u.dmgB||0)+dmgBonus(u,t,a)+quarryVs(u,t).dmg;   // quarry: a Monster hunter's bonus against its species
 const hb=(f.exec?.25:0)+(f.vsHurt||0)+(a.vsHurt||0);if(hb&&t.hp<t.hpMax/2)dmg*=1+hb;if(o&&o.splash)dmg*=o.splash;if(T(u).h>T(t).h)dmg*=1.1;if(t.fw&&fireAb(a))dmg*=1+t.fw;
 return Math.round(dmg*Math.max(.2,1-drOf(u,t,a)))}
// Fire: an ability that sets the target burning (or carries fire:1). Foes with def.fireWeak (ents) take that much more from it, and from burning.
const fireAb=a=>!!(a&&(a.fire||(a.status&&a.status.burn>0)));
const burnDmg=u=>Math.round(8*(1+(u.fw||0)));
// Cannot be knocked back or dragged: size-2 units, def.kbImm, Indomitable and the like.
const kbImmune=t=>(t.sz||1)>1||!!(t.def&&t.def.kbImm)||buffSum(t,'indom')>0||!!(t.flags&&t.flags.kbImm);
// Steady footing (medium armor) halves what a step costs in fatigue.
const moveFat=u=>u&&u.flags&&u.flags.footing?1:2;
const spellMult=u=>(1+(u.wpn.spell||0)+(u.flags&&u.flags.spellB||0))*(1+(u.side===0||u.m?u.lvl*.03:0))*(B&&B.realm&&B.realm.spellK||1);   // the Glass Wastes: mana storms (24-endgame.js)   // a merc's level (either side)
const ignOf=(u,a)=>a.magic?a.ign||.5:(a.ignW!=null?a.ignW:u.wpn.ign||.2)+(a.ignB||0)+(!a.bomb&&u.flags&&u.flags.ignB||0)+pvIgn(u,a);
// The damage roll of a weapon ability (a Spiked bash rolls the shield's spike), and the armor crushing of the blow (hammers).
const rollOf=(u,a)=>a.dmgD||u.wpn.d;
const crushOf=(u,a)=>a.magic||a.noDmg?0:(a.dmgD?0:u.wpn.crush||0)+(a.crushB||0)+pvCrush(u,a);
const stunOf=(u,a)=>a.magic||a.nostun||a.dmgD?0:u.wpn.stun||0;
const bleedOf=(u,a)=>Math.max(a.bleed||0,pvBleed(u,a),a.wpn&&!a.magic&&u.flags&&u.flags.bleedOn||0,a.wpn&&!a.magic&&u.flags&&u.flags.lightBleed&&isLightW(u.wpn)?u.flags.lightBleed:0);   // Opening wounds (Assassin)
// Venomed blade (Rogue): turns of poison a hit that reaches hitpoints leaves (a light weapon in hand), else 0.
const poisonOf=(u,a)=>Math.max(a.poison||0,a.wpn&&!a.magic&&u.flags&&u.flags.lightPoison&&isLightW(u.wpn)?u.flags.lightPoison:0);
const splitMult=(u,a)=>(a.smult||1)*(1+(u.flags&&u.flags.splitB||0));
// Undying: a killing blow leaves t at 1 hitpoint, once per battle.
// Lucky (trait): the same, once per battle, after Undying is spent (t.lck marks it used).
const canUndy=t=>!!(t.flags&&((t.flags.undying&&!t.undy)||(t.flags.lucky&&!t.lck)))||!!pvAngel(t);   // Guardian angel (Field medic): an ally's, 60p-passives.js
// Where an Aura dash would land: the free tile next to t that is closest to u (null if none).
function dashSpot(u,t){let best=null,bd=1e9;const s=u.sz||1,st=t.sz||1;
 if(s>1||st>1){for(let r=t.r-s;r<=t.r+st;r++)for(let c=t.c-s;c<=t.c+st;c++){if(fdist(c,r,s,t)!==1||!footFree(c,r,s,u))continue;const d=Math.abs(c-u.c)+Math.abs(r-u.r);if(d<bd){bd=d;best=[c,r]}}return best}
 for(const [x,y] of DIRS){const nc=t.c+x,nr=t.r+y;if(!inb(nc,nr)||B.tiles[key(nc,nr)].t==='block'||unitAt(nc,nr))continue;const d=Math.abs(nc-u.c)+Math.abs(nr-u.r);if(d<bd){bd=d;best=[nc,nr]}}return best}
function validTargets(u,a){const out=new Set();if(isRangedAtk(u,a)&&rangedLocked(u)||!canFire(u,a))return out;
 if(a.tgt==='enemy')B.units.forEach(t=>{if(t.alive&&t.side!==u.side&&mdist(u,t)<=a.rng&&!(a.dash&&mdist(u,t)>1&&u.wpn.rng<mdist(u,t)&&!dashSpot(u,t))&&!(a.needShieldT&&!t.shield)&&!(a.tgtOK&&!a.tgtOK(u,t))&&!losInfo(u,t,a).blocked)for(const [c,r] of unitTiles(t))out.add(key(c,r))});   // any tile of a footprint picks the unit
 else if(a.tgt==='ally')B.units.forEach(t=>{if(t.alive&&t.side===u.side&&mdist(u,t)<=a.rng&&!(a.noSelf&&t===u)&&!(a.tgtOK&&!a.tgtOK(u,t)))out.add(key(t.c,t.r))});
 else if(a.tgt==='move')for(let r=0;r<BH;r++)for(let c=0;c<BW;c++){const d=Math.abs(c-u.c)+Math.abs(r-u.r);if(!d||d>a.rng)continue;const t=B.tiles[key(c,r)];if((u.sz||1)>1){if(!footFree(c,r,u.sz,u))continue}else if(t.t==='block'||unitAt(c,r))continue;if(!a.leap&&t.h-T(u).h>1)continue;out.add(key(c,r))}
 return out}
/* ---- Damage ---- */
const heavyHit=t=>Math.max(8,Math.ceil(t.hpMax*HEAVYHIT));              // hitpoints lost in one blow that shake a unit (and may injure a merc)
// Applies injury id to a unit in the field: its stats drop at once, as they will in calc(m).
function applyInjury(u,id){const st=INJ[id].st;for(const k in st){const v=st[k];if(k==='hp'){u.hpMax=Math.max(5,u.hpMax+v);u.hp=Math.min(u.hp,u.hpMax)}else if(k==='fat')u.fatMax=Math.max(20,u.fatMax+v);else if(k==='dmg')u.dmgB=(u.dmgB||0)+v;else u[k]+=v}}
// Rolls an injury for the merc behind unit t (head or body, permanent or not). Returns its id, or null.
function inflictInjury(t,head,perm,slow){if(!t.m)return null;const id=rollInjury(t.m,head,perm,slow);if(!id)return null;(t.injNew||(t.injNew=[])).push(id);if(t.alive)applyInjury(t,id);float(t,INJ[id].n,'#ff7a6b');say(`${t.name}: ${INJ[id].n.toLowerCase()}.`);FX.emit('injury',{t,id});return id}
/* Difficulty (22-run.js diffK, 1 on Normal): the company's own swords only. 'death' scales the chance a fallen merc is killed rather than
   struck down, 'injury' the chance a heavy blow injures and that a struck-down merc's wound is permanent. Rival mercs keep the plain odds. */
const runK=k=>typeof diffK==='function'?diffK(k):1;
const downBase=t=>Math.max(DOWNCH,(t.flags&&t.flags.downSurv)||0);   // the Survivor's Stubborn raises the chance to live when struck down
const downCh=t=>t.side===0?clamp(1-(1-downBase(t))*runK('death'),0,1):downBase(t);
const injK=t=>t.side===0?runK('injury'):1;
function killUnit(t,src,head){t.hp=0;t.alive=false;if(typeof aarKill==='function')aarKill(t,src);if(src){countSlain(src,t);t.killer=src.name||(src.def&&src.def.n)||'';if(src.m)src.m.kills=(src.m.kills|0)+1}   // the killing blow counts toward the killer's quarry tally (m.slain)
 if(t.m){t.down=B.opts.yield?true:rnd()<(t.side===0&&B.opts.arena&&B.opts.arena.death!=null?clamp(1-(1-downCh(t))*B.opts.arena.death,0,1):downCh(t));if(t.down)inflictInjury(t,head,!B.opts.yield&&rnd()<PERMCH*injK(t),true)}   // a duel to yielding (o.yield): nobody dies   // struck down and alive: always at the price of an injury (a rival's merc too)
 say(`${t.name} ${t.m&&t.down?'is struck down':'falls'}.`);FX.emit('death',{t});
 for(const x of B.units.slice()){if(!x.alive||x===t)continue;const d=mdist(x,t);if(x.side===t.side){if(d<=3)moraleCheck(x,(d<=1?25:35)-((src&&src.flags&&src.flags.killFear)||0),-1)}else if(x===src)moraleCheck(x,25+((x.flags&&x.flags.killMor)||0),1);else if(d<=3)moraleCheck(x,-10,1)}
 if(t.grd&&typeof cvGuardDown==='function')cvGuardDown(t,src);   // a caravan guard falls: struck down by the company, the caravan turns on it (42-caravans.js)
 if(t.side===1&&B.rival)checkRout(1)}
/* ---- Armor mitigation (Armor update) ----
   Besides soaking a blow into its pool, the armor of the struck location turns part of the blow aside altogether: the mitigation, a
   share that rises on a curve with the armor the location still has (light armor turns little, heavy plate a lot, a stripped piece
   nothing):  mit = (MIT.cap + flags.mitCap) x (A / (A + MIT.k)) ^ MIT.p, at most MIT.max, to whole percent, where
   A = the armor left x (1 + flags.mitK) x (1 - the blow's piercing share). A piercing weapon sees less of the armor (a musket at 60%
   piercing meets 40% of it); a crushing one tears the pool faster instead (armorSoak), so the curve falls sooner.
   flags.mitK / flags.mitCap (perks: Battle-forged, Layered defense, Immovable, Unbowed, Turtle; any tree can carry them, they add up):
   mitK makes the armor count for more on the curve, mitCap raises its ceiling. Both are worth more the heavier the armor.
   armorMit(t,a,ign): the share for armor a; armorMitOf(t,head,ign): t's current one at that location (0 without armor). */
const MIT={cap:.65,k:140,p:1.5,max:.75};
function armorMit(t,a,ign){if(!(a>0))return 0;const f=(t&&t.flags)||{},A=a*(1+(f.mitK||0)+rlMitK(t))*Math.max(0,1-(ign||0));   // Rooted (Bulwark, 64v-roles.js): more while t held its groundif(!(A>0))return 0;
 return Math.round(Math.min(MIT.max,(MIT.cap+(f.mitCap||0))*Math.pow(A/(A+MIT.k),MIT.p))*100)/100}
// the piercing share that meets the struck location's armor: Layered defense's padIgn makes it smaller on the body
const locIgn=(t,ign,head)=>!head&&t.flags&&t.flags.padIgn?ign*(1-t.flags.padIgn):ign;
const armorMitOf=(t,head,ign)=>armorMit(t,(head?t.helm:t.arm)||0,locIgn(t,ign,head));
/* armorSoak(t,dmg,ign,head,crush): what a blow of dmg does against the armor of the struck location (hurt() and the forecast's fcSoak
   both call it, so they cannot drift). The mitigation comes off first (d = round(dmg x (1 - mit))); the armor then loses
   round(d x (1 + crush)) (crush > 0: hammers tear it up; crush < 0: light blades and darts glance off) but at most what it has
   (Unbowed caps it further); the hitpoints lose what goes past the armor, or the piercing share of d less a tenth of the armor still
   standing, whichever is more. Returns {arm (armor lost), hp (hitpoints, before the head multiplier), mit, d}. */
function armorSoak(t,dmg,ign,head,crush){const a0=(head?t.helm:t.arm)||0,tf=t.flags||{};if(!(a0>0))return{arm:0,hp:dmg,mit:0,d:dmg};
 const ig=locIgn(t,ign,head),mit=armorMit(t,a0,ig),d=Math.round(dmg*(1-mit));let ad=Math.min(a0,crush?Math.max(0,Math.round(d*(1+crush))):d);if(tf.unbowed)ad=Math.min(ad,armCap(t,head));
 return{arm:ad,hp:Math.max(d-Math.min(a0,d),Math.round(d*ig-(a0-ad)*.1),0),mit,d}}
/* hurt(t,dmg,ign,src,o): applies damage. The armor of the struck location soaks first (o.head: the helmet, else body armor);
   `ign` is the share that pierces it; o.pierce skips armor altogether; head hits do HEADMULT to hitpoints.
   The armor's mitigation and o.crush (hammers tear the armor up, light blades glance off it) work as armorSoak() says.
   src is the attacker (null for terrain, burn and bleeding); o.loc marks a weapon or spell hit (it reports its location and can injure).
   Returns the hitpoints taken. */
/* Armor trees in hurt() (fcSoak mirrors them): Padded under-layer (padIgn: the piercing share against body armor is smaller), Unbowed
   (one blow strips at most unbowed x the location's maximum), and for weapon and spell hits (o.loc) Sidestep (once between its turns a
   blow over sidestep x max hitpoints is halved, after the head multiplier), Juggernaut (hpSoak fewer hitpoints, at least 1); a hit
   spends Brace. Unshakable (noStun): heavy blows do not test morale. */
function hurt(t,dmg,ign,src,o){o=o||{};if(o.loc&&t.ward>0&&typeof eliteWard==='function')dmg=eliteWard(t,dmg);const head=!!o.head,pool=head?'helm':'arm',a0=t[pool]||0,tf=t.flags||{};let hpd;
 if(o.pierce)hpd=dmg;else if(a0>0){const s=armorSoak(t,dmg,ign,head,o.crush);t[pool]=a0-s.arm;hpd=s.hp}else hpd=dmg;
 if(head)hpd=Math.round(hpd*HEADMULT);
 if(o.loc){if(tf.sidestep&&!t.ss&&hpd>t.hpMax*tf.sidestep){hpd=Math.round(hpd/2);t.ss=1;float(t,'Sidestep','#8fd8ff')}
  if(tf.hpSoak&&hpd>0)hpd=Math.max(1,hpd-tf.hpSoak);if(tf.brace)t.brc=1}
 const hp0=t.hp;t.hp-=hpd;const undy=t.hp<=0&&canUndy(t);let lk=false,ang=null;if(undy){if(tf.undying&&!t.undy)t.undy=1;else if(tf.lucky&&!t.lck){t.lck=1;lk=true}else{ang=pvAngel(t);ang.angU=1}t.hp=1}if(typeof aarHit==='function')aarHit(src,t,Math.max(0,hp0-Math.max(0,t.hp)),a0-(t[pool]||0));if(hpd>0||dmg>0)float(t,hpd>0?'-'+hpd:'Armor',hpd>0?'#ff7a6b':'#c8d0d8');FX.emit('hit',o.roll?{u:src||null,t,dmg:hpd,armor:a0-(t[pool]||0),head,roll:o.roll}:{u:src||null,t,dmg:hpd,armor:a0-(t[pool]||0),head});if(o.loc)FX.emit('loc',{t,head});if(undy){float(t,ang?'Guardian angel':lk?'Lucky':'Undying','#ffd27a');if(ang)say(`${ang.name} will not let ${t.name} fall.`);FX.emit('status',{t,key:lk?'lucky':'undying',n:0})}
 if(t.hp<=0){killUnit(t,src||null,head);return hpd}
 if(t.boss&&B.boss)bossHit(t);   // boss phases (21-fabled.js)
 if(hpd>=heavyHit(t)){if(o.loc&&t.m&&rnd()<INJCH*injK(t))inflictInjury(t,head,false);if(!tf.noStun)moraleCheck(t,30,-1)}   // (moraleCheck skips the Beast-wise against beasts)
 return hpd}
// Unbowed: the most armor one blow can strip from t's body armor (or helmet).
const armCap=(t,head)=>Math.max(1,Math.round(((head?t.helmMax:t.armMax)||0)*t.flags.unbowed));
// Shield damage. A shield at 0 is destroyed: its defense and its skills are gone (and a merc's shield does not come home).
function breakShield(t){if(!t.shield)return false;t.shp=0;t.shield=false;if(t.shb){t.md-=t.shb.md;t.rd-=t.shb.rd}dropBuff(t,'shieldwall');
 if(t.flags&&t.flags.shGuard){t.flags=Object.assign({},t.flags);t.flags.guard=(t.flags.guard||0)-t.flags.shGuard;t.flags.shGuard=0;auraScan()}   // a split tower shield covers nobody
 t.abs=t.abs.filter(id=>!(AB[id]&&AB[id].shield));
 float(t,'Shield split','#ffd27a');say(`${t.name}'s shield is split.`);FX.emit('status',{t,key:'splitshield',n:0});return true}
function damageShield(t,n,src){if(!t.shield)return 0;const s0=t.shp,d=Math.min(s0,Math.max(0,n));float(t,'Shield -'+d,'#c8d0d8');if(d>=s0)breakShield(t);else{t.shp=s0-d;FX.emit('status',{t,key:'splitshield',n:d})}return d}
// What a kill gives the killer through its talents: hitpoints (killHeal), its gift resource (killRes).
function onKill(u){const f=u.flags||{};if(f.killHeal&&u.hp<u.hpMax){const h0=u.hp;u.hp=Math.min(u.hpMax,u.hp+f.killHeal);float(u,'+'+(u.hp-h0),'#9bd96f');FX.emit('heal',{t:u,n:u.hp-h0})}
 if(f.killRes){const k=Object.keys(u.res)[0],R=k&&u.res[k];if(R&&R.cur<R.max){R.cur=Math.min(R.max,R.cur+f.killRes);float(u,'+'+f.killRes+' '+(RESN[k]||k),RESC[k]||'#fff')}}}
// Rolling with it (medium armor): a knockback or hook on t fails with chance flags.roll (one seeded draw, only for a bearer of the perk).
function rollsWith(t){if(!(t.flags&&t.flags.roll>0)||rnd()>=t.flags.roll)return false;float(t,'Rolled with it','#c8d0d8');return true}
/* knockback(u,t,n,crash): t is driven up to n tiles straight away from u (from the middle of u's footprint, along the longer axis).
   Something in the way stops it: t takes 8 (a slam), or `crash` when it is thrown into another unit, which takes `crash` too (ogres).
   Size-2 units, def.kbImm and Indomitable never move (kbImmune). */
function kbDir(u,t){const m=unitCenter(u);let dc=t.c-m.c,dr=t.r-m.r;if(Math.abs(dc)>=Math.abs(dr)){dc=Math.sign(dc)||1;dr=0}else{dr=Math.sign(dr);dc=0}return[dc,dr]}
async function knockback(u,t,n,crash){if(kbImmune(t))return;if(rollsWith(t))return;const [dc,dr]=kbDir(u,t);
 for(let i=0;i<n&&t.alive;i++){const nc=t.c+dc,nr=t.r+dr,cur=T(t),x=inb(nc,nr)?unitAt(nc,nr):null;if(!inb(nc,nr)||B.tiles[key(nc,nr)].t==='block'||x||B.tiles[key(nc,nr)].h>cur.h+1){
   if(x&&crash>0){float(t,'Crash','#ffd27a');hurt(t,crash,1);if(x.alive){float(x,'Crash','#ffd27a');hurt(x,crash,1)}FX.emit('kb',{t,crash:x})}else{float(t,'Slam','#ffd27a');hurt(t,8,1)}break}
  const drop=cur.h-B.tiles[key(nc,nr)].h;t.c=nc;t.r=nr;FX.emit('kb',{t});await sleep(120);if(drop>=1)hurt(t,6*drop,1);if(t.alive&&T(t).t==='haz')hurt(t,12,1)}}
/* ---- roll records for the combat log (65-battle-ui.js) ----
   Recording only: these never draw from rnd(); strike() keeps every draw where it was and hands the numbers here.
   Scale 0..99: a draw x in [0,1) shows as floor(x*100), and a roll succeeds when the number shown is BELOW the chance in percent
   (the code's own test is x*100 < chance, or x < chance as a fraction: the same thing for whole percents). rollShow() keeps the shown
   number on the right side of the line even for a fractional chance, so the shown rule always agrees with what happened.
   R: {u,t (names), side, k: 'roll' | 'sure' (cannot miss: no roll decides it) | 'auto' (an arc, a ricochet: no roll) | 'stray' (a missed
   shot landing on an ally), L: [{k, n (shown), c (chance in percent), on, x (the draw), v (a stray's victim)}], logged}. */
function rollRec(u,t,a,o){return{u:u.name,t:t.name,side:u.side,k:o.stray?'stray':o.auto?'auto':a.sure?'sure':'roll',L:[],logged:0}}
function rollShow(x,ch,on){const p=ch*100,c=Math.abs(p-Math.round(p))<1e-6?Math.round(p):Math.round(p*10)/10;let n=Math.floor(x*100);
 if(on&&!(n<c))n=Math.max(0,Math.ceil(c)-1);else if(!on&&n<c)n=Math.ceil(c)>n?Math.ceil(c):n+1;return{n,c}}
function rollAdd(R,k,x,ch,on,v){if(!R)return;const s=rollShow(x,ch,on),e={k,n:s.n,c:s.c,on:!!on,x};if(v)e.v=v;if(k==='hit'&&s.c>=100)R.k='sure';R.L.push(e)}
function rollDone(R){if(R&&!R.logged&&typeof rollLog==='function'){try{rollLog(R)}catch(e){}}}
/* strike(u,t,a,o): one attack of u on t with ability a. Returns true on a hit.
   o: splash (damage factor of a secondary hit), auto (cannot miss: arcs, stray shots), free (a free attack: it provokes neither
   a riposte nor a stray shot), stray (this is a missed shot landing on an ally), noShot (the caller drew the projectile: strays,
   shots flying on through a target, arcs).
   Hit, miss or stray is settled BEFORE anything flies: a shot (2+ tiles away, or a spell) puts ONE projectile in B.shots, to where it
   ends up (the target, or the ally it strays into). A stray emits 'miss' on the target (stray: the ally), then 'ff' {u, t: ally,
   from: target}, then strikes the ally (auto, FFDMG of the damage, no projectile of its own).
   Order of the seeded draws: hit roll; on a miss the stray-shot roll (only with allies in the line) and its victim;
   on a hit the damage roll, the location roll, then whatever hurt() needs (injury, morale), statuses, knockback (never from a stray), a hook's pull, a scare. */
async function strike(u,t,a,o){o=o||{};if(!t.alive||!u.alive)return false;const d=mdist(u,t),shot=(d>1||a.magic)&&!o.noShot&&!o.stray,
  col=a.magic?'#c9a8ff':a.cost?RESC[a.cost[0]]:'#e9e0c9',fly=x=>{if(shot)FX.shot(u,x,col,26,22)};
 if(a.split){fly(t);if(!t.shield)return false;damageShield(t,Math.round(ri(u.wpn.d[0],u.wpn.d[1])*splitMult(u,a)),u);await sleep(240);return true}
 const R=rollRec(u,t,a,o);let hx=0,hc=100;if(!o.auto&&!a.sure){hx=rnd();hc=hitChance(u,t,a);rollAdd(R,'hit',hx,hc/100,hx*100<hc)}   // the hit roll (the same one draw, then hitChance, as ever)
 if(!o.auto&&!a.sure&&hx*100>=hc){let v=null;
  if(!o.free&&shotKind(u,t,a)===2&&!(u.flags&&u.flags.noStray)){const ff=losInfo(u,t,a).ff;if(ff.length){const x=rnd(),on=x<FFCH;if(on)v=ff[Math.floor(rnd()*ff.length)];rollAdd(R,'stray',x,FFCH,on,v&&v.name)}}   // Wind-read: no strays
  fly(v||t);float(t,'Miss','#c8d0d8');FX.emit('miss',v?{u,t,stray:v,roll:R}:{u,t,roll:R});rollDone(R);if(t.flags&&(t.flags.dance||t.flags.flow))t.dnc=Math.min(3,(t.dnc||0)+1);await sleep(230);
  if(v){if(v.alive&&u.alive){say(`${u.name}'s shot strays into ${v.name}.`);FX.emit('ff',{u,t:v,from:t});await strike(u,v,a,{auto:1,stray:1,free:'stray',noShot:1,splash:(o.splash||1)*FFDMG})}}
  else if(!o.free&&!a.magic&&d===1&&t.alive&&u.alive&&buffSum(t,'rip'))await freeAttack(t,u,'riposte');
  pvStruck(u,t,a,o);await pvMiss(u,t,a,o,v,R);return false}
 fly(t);
const hp0=t.hp;let dmg=0;const ign=a.noDmg?1:ignOf(u,a),wd=rollOf(u,a);if(a.noDmg){}else if(a.magic)dmg=ri(a.magic[0],a.magic[1])*spellMult(u);else dmg=ri(wd[0],wd[1])*(a.mult||1);
 if(!a.noDmg)dmg=dmgAfter(u,t,a,dmg,o);
 let hpd=0,head=false;const crush=crushOf(u,a);if(dmg>0){const x=rnd(),hch=headChance(u,t,a);head=x*100<hch;rollAdd(R,'head',x,hch/100,head);hpd=hurt(t,dmg,ign,u,{head,pierce:!!a.pierce,loc:1,crush,roll:R})}else if(a.noDmg)float(t,a.noDmgTxt||'Shoved','#ffd27a');
 rollDone(R);   // no 'hit' came (a shove, a blow that does nothing): the roll still goes to the log
 if(t.alive){const st=Object.assign({},u.elite&&typeof eliteSt==='function'?eliteSt(u,a):a.status||{}),sc=stunOf(u,a),bl=bleedOf(u,a);if(sc){const x=rnd();rollAdd(R,'stun',x,sc,x<sc);if(x<sc)st.stun=Math.max(st.stun||0,1)}if(u.onhit){const x=rnd();rollAdd(R,'root',x,u.onhit.ch,x<u.onhit.ch);if(x<u.onhit.ch)st.root=Math.max(st.root||0,u.onhit.root)}if(bl&&hpd>0)st.bleed=Math.max(st.bleed||0,bl);{const po=poisonOf(u,a);if(po&&hpd>0)st.poison=Math.max(st.poison||0,po)}
  if(!a.noDmg)pvStatus(u,t,a,o,hpd,head,hp0,st,R);for(const k in st)addStatus(t,k,st[k]);pvStruck(u,t,a,o);pvHitDone(u,t,a,o,hpd);
  let kb=a.kb;if(!kb&&u.kbN){const x=rnd();rollAdd(R,'knock',x,u.kbCh,x<u.kbCh);kb=x<u.kbCh?u.kbN:0}if(kb&&!kbImmune(t)&&!o.stray)await knockback(u,t,kb,a.crash||u.crashD||0);
  if(a.pull&&t.alive&&u.alive&&!kbImmune(t))await pullUnit(u,t,a.pull);
  if(a.scare&&t.alive&&!t.fearless)moraleCheck(t,0,-1);rlShock(u,t,a,o,hpd)}   // Shock (Vanguard, 64v-roles.js)
 else{pvStruck(u,t,a,o);pvHitDone(u,t,a,o,hpd);if(u.flags.berserk&&!u.bzk){u.bzk=1;u.ap+=4;float(u,'Berserk','#ffd27a');FX.emit('buff',{t:u})}if(a.killAP&&u.alive&&!o.stray){u.ap+=a.killAP;float(u,'+'+a.killAP+' AP','#ffd27a');FX.emit('buff',{t:u})}if(a.killRally&&u.alive&&!o.stray&&typeof crowdRally==='function')crowdRally(u,a.killRally,4);if(!t.gone&&u.alive){onKill(u);await pvKill(u,t,a,o)}}
 if(a.magic&&u.flags&&u.flags.spellArc&&!o.splash&&!o.auto&&!o.arc&&u.alive)await pvArc(u,t,a);   // Arcing spells (Arcana)
 if(u.flags&&u.flags.sweep&&t.alive&&u.alive)await rlSweep(u,t,a,o);   // Sweeping blows (Brute, 64v-roles.js)
 await sleep(240);return true}
// A hook: t is dragged up to n tiles toward u, along the longer axis, while the next tile is free, walkable and at most 1 step up.
async function pullUnit(u,t,n){if(mdist(u,t)>1&&rollsWith(t))return;for(let i=0;i<n&&t.alive&&mdist(u,t)>1;i++){const m=unitCenter(u);let dc=m.c-t.c,dr=m.r-t.r;if(Math.abs(dc)>=Math.abs(dr)){dc=Math.sign(dc);dr=0}else{dr=Math.sign(dr);dc=0}
  const nc=t.c+dc,nr=t.r+dr;if(!inb(nc,nr)||B.tiles[key(nc,nr)].t==='block'||unitAt(nc,nr)||B.tiles[key(nc,nr)].h>T(t).h+1)break;
  t.c=nc;t.r=nr;float(t,'Hooked','#ffd27a');FX.emit('kb',{t,pull:1});await sleep(120);if(t.alive&&T(t).t==='haz')hurt(t,12,1)}}
/* ---- Movement ---- */
/* Flying (u.fly, unless Grounded): every step costs 2 whatever the ground, height steps do not matter, and props and other units can be
   flown over (a footprint on a prop or a unit is "air": passed through, never stopped on; foes it leaves still get their free attacks,
   but a hit does not bring it down over them). A size-2 walker climbs by the highest tile of its footprint. */
const canFly=u=>!!u.fly&&!(u.st&&u.st.grounded>0);
function footInfo(c,r,s){let h=-1,blk=false,rough=false;for(let y=0;y<s;y++)for(let x=0;x<s;x++){const t=B.tiles[key(c+x,r+y)];if(!t){blk=true;continue}if(t.t==='block')blk=true;else if(t.t==='rough')rough=true;if(t.h>h)h=t.h}return{h,blk,rough}}
const airAt=u=>canFly(u)&&(footInfo(u.c,u.r,u.sz||1).blk||!!footUnit(u.c,u.r,u.sz||1,u));
function stepCost(u,fk,tk){if(canFly(u))return 2;const s=u.sz||1;if(s>1){const a=footInfo(fk%BW,(fk/BW)|0,s),b=footInfo(tk%BW,(tk/BW)|0,s);let c=2;if(b.h>a.h)c++;if(b.rough)c++;return c}
 const a=B.tiles[fk],b=B.tiles[tk];let c=2;if(!u.flags.path){if(b.h>a.h)c++;if(b.t==='rough')c++}return c}
// A unit (other than self) on any tile of a size-s footprint at (c,r), or null.
function footUnit(c,r,s,self){for(let y=0;y<s;y++)for(let x=0;x<s;x++){const o=inb(c+x,r+y)?unitAt(c+x,r+y):null;if(o&&o!==self)return o}return null}
// Reach of a size-2 unit or a flier: keys are anchors; entries over props carry air:1 (pass only).
function dijkstraN(u,max){const s=u.sz||1,fly=canFly(u),D=new Map(),st=key(u.c,u.r),occ=new Uint8Array(BW*BH);
 for(const x of B.units)if(x.alive&&x!==u)for(const [c,r] of unitTiles(x))if(inb(c,r))occ[key(c,r)]=1;
 const onb=(c,r)=>c>=0&&r>=0&&c<=BW-s&&r<=BH-s,taken=(c,r)=>{for(let y=0;y<s;y++)for(let x=0;x<s;x++)if(occ[key(c+x,r+y)])return true;return false};
 D.set(st,{cost:0,prev:-1,h:footInfo(u.c,u.r,s).h});const open=[st];
 while(open.length){let bi=0;for(let i=1;i<open.length;i++)if(D.get(open[i]).cost<D.get(open[bi]).cost)bi=i;const k=open.splice(bi,1)[0],cur=D.get(k);if(cur.done)continue;cur.done=1;const c=k%BW,r=(k/BW)|0;
  for(const [a,b] of DIRS){const nc=c+a,nr=r+b;if(!onb(nc,nr))continue;const nk=key(nc,nr),F=footInfo(nc,nr,s),tk=taken(nc,nr);
   let v=cur.cost+2;if(!fly){if(tk||F.blk||F.h-cur.h>1)continue;if(F.h>cur.h)v++;if(F.rough)v++}if(v>max)continue;
   const o=D.get(nk);if(!o||v<o.cost){const e={cost:v,prev:k,h:F.h};if(fly&&(F.blk||tk))e.air=1;D.set(nk,e);open.push(nk)}}}
 return D}
function dijkstra(u,max){if((u.sz||1)>1||canFly(u))return dijkstraN(u,max);const qs=quickStep(u),D=new Map(),st=key(u.c,u.r),occ=new Uint8Array(BW*BH);for(const x of B.units)if(x.alive){if((x.sz||1)>1){for(const [c,r] of unitTiles(x))if(inb(c,r))occ[key(c,r)]=1}else occ[key(x.c,x.r)]=1}D.set(st,{cost:0,prev:-1});const open=[st];
 while(open.length){let bi=0;for(let i=1;i<open.length;i++)if(D.get(open[i]).cost<D.get(open[bi]).cost)bi=i;const k=open.splice(bi,1)[0],cur=D.get(k);if(cur.done)continue;cur.done=1;const c=k%BW,r=(k/BW)|0;
  for(const [a,b] of DIRS){const nc=c+a,nr=r+b;if(!inb(nc,nr))continue;const nk=key(nc,nr),t=B.tiles[nk];if(t.t==='block'||occ[nk]||t.h-B.tiles[k].h>1)continue;
   const v=cur.cost+(k===st&&qs?Math.max(0,stepCost(u,k,nk)-QSTEP):stepCost(u,k,nk));if(v>max)continue;const o=D.get(nk);if(!o||v<o.cost){D.set(nk,{cost:v,prev:k});open.push(nk)}}}return D}
function pathTo(D,k){const p=[];for(let x=k;D.get(x)&&D.get(x).prev>=0;x=D.get(x).prev)p.unshift(x);return p}
/* Walks u along path, one tile at a time. Free attacks are settled here and nowhere else:
   leaving a tile next to a foe draws that foe's free attack (one per foe and round; a hit halts u where it stands);
   stepping next to a foe in spear wall draws its thrust before the step (a hit stops u short; a miss lets it in and drops the wall). */
// (A flier over a prop is not halted there: it flies on to where it can land. A size-2 unit needs its whole footprint clear.)
async function walkPath(u,path){const b=B;if(!u.fly)return walkPath0(u,path);const land=[u.c,u.r];await walkPath0(u,path,land);
 if(B===b&&u.alive&&airAt(u)){u.c=land[0];u.r=land[1];FX.emit('move',{u});await sleep(105)}}            // a flier never ends over a prop or a unit
async function walkPath0(u,path,land){const b=B,sz=u.sz||1,mf=moveFat(u);for(const k of path){if(B!==b||!u.alive)return;const fk=key(u.c,u.r),qs=quickStep(u),c=qs?Math.max(0,stepCost(u,fk,k)-QSTEP):stepCost(u,fk,k);if(u.ap<c||u.fat+mf>u.fatMax)break;   // Light step (Shadowdancer): the first tile of the turn costs QSTEP lessif(!canFly(u)&&(sz>1?footUnit(k%BW,(k/BW)|0,sz,u):unitAt(k%BW,(k/BW)|0)))break;
  const slip=!!(u.flags&&u.flags.slip)&&!u.slipT||!!u.hrun||fsSlip(u);u.slipT=1;if(u.hrun)u.hrun=0;   // Hit and run (Skirmisher): the first tile after an attack too
 const foe=slip?null:zocFoe(u);   // Slippery: the first tile left each turn draws no free attack
  if(foe){foe.aoo=1;const hit=await freeAttack(foe,u,'zoc');if(B!==b||!u.alive)return;if(hit&&!airAt(u)){float(u,'Halted','#ffd27a');break}}
  let stop=false;const nc=k%BW,nr=(k/BW)|0;
  for(const s of b.units.filter(s=>s.alive&&s.side!==u.side&&buffSum(s,'sw')&&mdist(s,u)>1&&fdist(nc,nr,sz,s)===1)){if(!canFree(s))continue;
   const hit=await freeAttack(s,u,'spearwall');if(B!==b||!u.alive)return;if(hit&&!airAt(u)){float(u,'Halted','#ffd27a');stop=true;break}dropBuff(s,'spearwall')}
  if(stop){u.ap=Math.max(0,u.ap-c);if(qs)u.qsT=1;break}
  u.ap-=c;if(qs)u.qsT=1;u.fat+=mf;u.mvd=1;u.mvN=(u.mvN||0)+1;u.c=nc;u.r=nr;FX.emit('move',{u});await sleep(105);if(B!==b)return;if(land&&!airAt(u)){land[0]=nc;land[1]=nr}if(T(u).t==='haz'){hurt(u,12,1);if(!u.alive)return}}}
/* ---- Ability effects on allies (heal, buff, rally, cleanse, AP) ---- */
const healRoll=(u,a,t)=>{const h=ri(a.heal[0],a.heal[1]),f=u.flags||{};return Math.round(h*(1+(f.healB||0)+(f.healLow&&t&&t.hp<t.hpMax/2?f.healLow:0))*(B&&B.realm&&B.realm.healK!=null?B.realm.healK:1))};   // the Ashen Reach halves healing
function healUnit(t,h){const h0=t.hp;t.hp=Math.min(t.hpMax,t.hp+h);float(t,'+'+h,'#9bd96f');FX.emit('heal',{t,n:t.hp-h0})}
function allyEffect(u,t,a){if(!t.alive)return;if(a.heal){healUnit(t,healRoll(u,a,t));pvHealed(u,t)}
 if(a.cleanse){let n=0;for(const k of a.cleanse)if(t.st[k]>0){t.st[k]=0;n++}if(a.cleanse.includes('root')&&t===B.cur&&!(t.st.webbed>0))t.rooted=false;if(n)float(t,'Cleansed','#9bd96f')}
 if(a.rally&&t.mor>0&&t.mor<3)setMorale(t,t.mor+1);
 if(a.buff){addBuff(t,a.buff,a.dur);float(t,a.n,'#9bd96f');FX.emit('buff',{t})}if(a.giveAP){t.bonusAP=(t.bonusAP||0)+a.giveAP;float(t,'+'+a.giveAP+' AP','#ffd27a');FX.emit('buff',{t})}}
// Units of u's side a party ability reaches (u first, then the others within a.party tiles, nearest first; the fleeing are not reached).
function partyOf(u,a){return[u].concat(B.units.filter(o=>o.alive&&o!==u&&o.side===u.side&&o.mor!==0&&mdist(o,u)<=a.party).sort((x,y)=>mdist(x,u)-mdist(y,u)||x.id-y.id))}
// Foes in the line from u through t beyond t (for `through`): up to n of them, stopping at an obstacle or the board's edge.
function lineBeyond(u,t,n){const out=[],dc=t.c-u.c,dr=t.r-u.r,L=Math.max(Math.abs(dc),Math.abs(dr));if(!L||!(n>0))return out;
 for(let i=L+1;i<=L+BW+BH&&out.length<n;i++){const c=Math.round(u.c+dc*i/L),r=Math.round(u.r+dr*i/L);if(!inb(c,r)||B.tiles[key(c,r)].t==='block')break;const x=unitAt(c,r);if(x&&x!==t&&x.side!==u.side&&!out.includes(x))out.push(x)}return out}
const THROUGH=.75;
async function useAbility(u,a,k){const b=B;b.busy=true;b.sel=null;b.targets=null;b.reach=null;payFor(u,a);if(a.id!=='attack')say(`${u.name} uses ${a.n}.`);FX.ui();const c=k%BW,r=(k/BW)|0;
 if(a.id!=='attack')FX.emit('cast',{u,t:a.tgt==='self'?u:a.tgt==='ally'||a.tgt==='enemy'?unitAt(c,r)||null:null,ab:a});
 if(b.realm&&b.realm.backlash&&a.magic&&typeof realmBacklash==='function'){realmBacklash(u,a);if(B!==b)return;if(!u.alive){await sleep(120);if(B!==b)return;b.busy=false;afterAction();return}}   // the Glass Wastes: a spell burns its caster
 if(typeof a.run==='function'){await a.run(u,k,a);if(B!==b)return}
 else if(a.tgt==='self'){if(a.withdraw){u.ap+=a.ap;await withdraw(u);if(B!==b)return}
  if(a.swapW){swapWeapons(u);auraScan()}
  if(a.reloadW&&u.wpn.reload){setLoaded(u,true);float(u,'Loaded','#e9e0c9');FX.emit('reload',{u})}
  if(a.gainAP){u.ap+=a.gainAP;float(u,'+'+a.gainAP+' AP','#ffd27a');FX.emit('buff',{t:u})}if(a.rest){u.fat=Math.max(0,u.fat-a.rest);float(u,'-'+a.rest+' fatigue','#8fd8ff')}
  if(a.party)for(const t of partyOf(u,a))allyEffect(u,t,a);
  else{if(a.heal){healUnit(u,healRoll(u,a,u));pvHealed(u,u)}if(a.buff){addBuff(u,a.buff,a.dur);float(u,a.n,'#9bd96f');FX.emit('buff',{t:u})}}}
 else if(a.tgt==='aoe'){if(u.flags&&u.flags.hitRun)u.hrun=1;for(const t of b.units.filter(t=>t.alive&&t.side!==u.side&&mdist(u,t)===1)){if(B!==b||!u.alive)break;await strike(u,t,a)}}
 else if(a.tgt==='move'){u.c=c;u.r=r;u.mvd=1;FX.emit('move',{u});await sleep(200);if(B===b&&T(u).t==='haz')hurt(u,12,1);if(B===b&&u.alive&&a.buff){addBuff(u,a.buff,a.dur);FX.emit('buff',{t:u})}}
 else if(a.tgt==='ally'){const t=unitAt(c,r);if(t)allyEffect(u,t,a)}
 else if(a.tgt==='enemy'){let t=unitAt(c,r);if(u.flags&&u.flags.hitRun&&!a.noDmg)u.hrun=1;if(t&&b.icpOn)t=rlIntercept(u,t,a);if(t){   // Intercept (Shieldbearer, 64v-roles.js)
   if(a.dash&&mdist(u,t)>1){const best=dashSpot(u,t);if(best){u.c=best[0];u.r=best[1];FX.emit('move',{u});await sleep(200)}}
   if(B===b&&u.alive&&(!a.dash||mdist(u,t)===1||u.wpn.rng>=mdist(u,t))){
    if(losInfo(u,t,a).blocked){float(u,'No line of fire','#c8d0d8');FX.emit('blocked',{u,t});await sleep(200)}
    else{const beyond=a.through?lineBeyond(u,t,a.through):[];await strike(u,t,a);for(let i=1;i<(a.hits||1)&&B===b&&t.alive&&u.alive;i++)await strike(u,t,a);
    if((a.dwOff||a.dwSeq)&&u.dw&&B===b&&typeof dwFollow==='function')await dwFollow(u,t,a);
    if(a.id==='attack'&&B===b&&typeof fsFollow==='function')await fsFollow(u,t,a);   // Double jab (Pugilist, 64x-fists.js)
    if(a.gvol&&B===b&&typeof gtVolley==='function')await gtVolley(u,t,a);   // Volley fire (Musketry, 64u-guntrees.js): the allies' guns join   // Twin blades: the off-hand blows (64w-dualwield.js)
    for(const o of beyond){if(B!==b||!u.alive)break;if(o.alive){FX.shot(t,o,'#e9e0c9',22,22);await strike(u,o,a,{splash:THROUGH,noShot:1})}}
    if(a.aoe)for(const o of b.units.filter(o=>o.alive&&o.side!==u.side&&o!==t&&mdist(o,t)===1)){if(B!==b)break;await strike(u,o,a,{splash:.7})}
    if(a.chain){let last=t;const hit=[t];for(let i=0;i<a.chain&&B===b;i++){const n=b.units.filter(o=>o.alive&&o.side!==u.side&&!hit.includes(o)&&mdist(o,last)<=3).sort((x,y)=>mdist(x,last)-mdist(y,last))[0];if(!n)break;FX.shot(last,n,'#c9a8ff',22,22);await strike(u,n,a,{splash:.6,auto:1,noShot:1});hit.push(n);last=n}}}}}}
 await sleep(120);if(B!==b)return;b.busy=false;afterAction()}
function afterAction(){if(checkEnd())return;if(!B.cur.alive||B.cur.mor===0){nextTurn();return}computeReach();FX.ui()}
function computeReach(){const u=B.cur;B.reach=null;if(u&&u.side===0&&!u.ally&&u.alive&&!u.rooted&&u.ap>=2)B.reach=dijkstra(u,u.ap)}
// True once the battle is decided. The first time, it locks the battle and schedules endBattle (at once in instant mode).
// A side is beaten when nobody of it is left standing on the field: the dead, the fled and the withdrawn all count as gone.
// A battle objective (b.obj: escort, hold, siege; objCheck in 16-contracts.js) can decide it first: the VIP falls, the rounds are held, the leader dies.
function checkEnd(){const b=B;if(!b||b.over)return true;const p=b.units.some(u=>u.alive&&u.side===0&&!u.vip&&!u.ally),e=b.units.some(u=>u.alive&&u.side!==0&&!u.vip);let win=p;
 if(p&&e){const r=b.obj&&typeof objCheck==='function'?objCheck(b):null;if(r===null)return false;win=r}else if(b.obj)b.obj.state=p?'won':'lost';
 b.over=true;b.busy=true;if(!p&&b.units.some(u=>u.side===0&&u.gone&&!u.vip&&!u.ally))b.fled=true;battleSync();const done=()=>{if(B===b)endBattle(win)};if(SPEEDF>0)setTimeout(done,700*SPEEDF);else done();return true}
async function nextTurn(){const b=B;if(!b||checkEnd())return;
 if(b.opts.turnCap&&b.turns>=b.opts.turnCap){b.over=true;b.busy=true;b.stuck=true;battleSync();if(b.onEnd)b.onEnd({stuck:true,win:false,rounds:b.round,turns:b.turns});return}
 b.turns++;let u=null;
 while(!u){if(!b.order.length){b.round++;if(b.auto&&canCallReserve())callReserve(b.reserves[0]);const al=b.units.filter(x=>x.alive);al.forEach(x=>x.roll=x.init+(rnd()-.5)*5.66);const amb=b.round===1&&b.opts.ambush;b.order=al.sort((x,y)=>(amb?x.side-y.side:0)||y.roll-x.roll||x.id-y.id);if(b.boss)bossRound(b);if(b.realm&&typeof realmRound==='function')realmRound(b);if(b.obj&&checkEnd())return}
  const x=b.order.shift();if(x.alive&&!x.vip)u=x}
 b.cur=u;b.busy=true;u.bzk=0;u.aoo=0;b.sel=null;b.targets=null;b.reach=null;
 u.ap=u.apMax+(u.bonusAP||0);u.bonusAP=0;if(u.unready){u.unready=0;u.ap=Math.max(0,u.ap-AMBUSHAP);float(u,'Caught unready','#ffd27a')}u.fat=Math.max(0,u.fat-Math.max(0,15+((u.flags&&u.flags.fatRec)||0)));   // Athletic / Asthmatic
 u.swapFree=!!(u.flags&&u.flags.freeSwap);u.usedT=null;u.ss=0;u.brc=0;u.dnc=0;u.mvd=0;u.slipT=0;u.qsT=0;auraScan();
 if(u.flags&&u.flags.armRegen>0&&u.armMax>0&&u.arm<u.armMax){const a0=u.arm;u.arm=Math.min(u.armMax,u.arm+u.flags.armRegen);float(u,'Armor +'+(u.arm-a0),'#c8d0d8')}   // Mail mender
 for(const k in u.res)u.res[k].cur=Math.min(u.res[k].max,u.res[k].cur+u.res[k].regen);
 u.buffs=u.buffs.filter(x=>--x.dur>0);if(u.st.chill){u.ap=Math.max(0,u.ap-3);u.st.chill--;float(u,'Chilled','#8fd8ff')}u.rooted=false;if(u.st.root){u.rooted=true;u.st.root--}if(u.st.webbed){u.rooted=true;u.st.webbed--}if(u.st.netted>0)u.rooted=true;   // Netted (64g-gladiators.js): it ticks off with the foes' statuses
 u.dazed=false;if(u.st.daze){u.dazed=true;u.st.daze--}u.weakened=false;if(u.st.weak){u.weakened=true;u.st.weak--}if(u.st.marked)u.st.marked--;pvTurn(u);   // the masteries' turn rules (60p-passives.js)
 b.cam.tx=u.sx;b.cam.ty=u.sy-10;FX.emit('turn',{u});FX.ui();
 if(u.st.bleed){u.st.bleed--;hurt(u,BLEEDDMG,1,null,{pierce:1});await sleep(200);if(B!==b)return}
 if(u.alive&&u.st.burn){u.st.burn--;hurt(u,burnDmg(u),1);await sleep(260);if(B!==b)return}if(u.alive&&T(u).t==='haz'){hurt(u,12,1);await sleep(200);if(B!==b)return}
 if(!u.alive)return nextTurn();
 { const rg=b.realm&&b.realm.noRegen?0:(u.flags&&u.flags.regenHP||0)+bestAdj(u,'medAura');if(rg>0&&u.hp<u.hpMax){const h0=u.hp;u.hp=Math.min(u.hpMax,u.hp+rg);float(u,'+'+(u.hp-h0),'#9bd96f');FX.emit('heal',{t:u,n:u.hp-h0})} }
 if(u.st.stun){u.st.stun=0;if(typeof monStunned==='function')monStunned(u);float(u,'Stunned','#ffd27a');await sleep(420);if(B!==b)return;return nextTurn()}
 if(moraleTurn(u)){await sleep(u.side===1?200:60);if(B!==b)return;await fleeTurn(u);if(B!==b||b.over)return;return nextTurn()}
 if(u.side!==0||u.ally||b.auto){await sleep(u.side!==0||u.ally?260:60);if(B!==b)return;await aiTurn(u);if(B!==b||b.over)return;return nextTurn()}
 b.busy=false;computeReach();FX.ui()}
// Hands the company's current turn to the AI (used when B.auto is switched on mid-turn).
async function autoKick(){const b=B;if(!b||b.over||b.busy||!b.cur||b.cur.side!==0||!b.cur.alive)return;b.busy=true;b.sel=null;b.targets=null;b.reach=null;FX.ui();
 await aiTurn(b.cur);if(B!==b||b.over)return;nextTurn()}
// The built-in AI (charge, shoot what can be hit, cast). 63-ai.js replaces it through aiTurn2(u) when it is loaded.
async function aiTurn(u){if(typeof aiTurn2==='function')return aiTurn2(u);const b=B;let told=false;for(let n=0;n<8&&u.alive&&u.mor!==0&&B===b&&!b.over;n++){const foes=b.units.filter(x=>x.alive&&x.side!==u.side);if(!foes.length)return;const atk=abilityInfo(u,'attack');
  if(u.spell&&u.ap>=4){const ab={id:'spell',n:u.spell.n,magic:u.spell.d,ign:.5,status:u.spell.status},ts=foes.filter(f=>mdist(u,f)<=u.spell.rng&&!losInfo(u,f,ab).blocked);if(ts.length){const t=ts.sort((x,y)=>x.hp-y.hp)[0];u.ap-=4;say(`${u.name} casts ${u.spell.n}.`);FX.emit('cast',{u,t,ab});await strike(u,t,ab);if(B!==b||checkEnd())return;continue}}
  if(isRangedAtk(u,atk)&&rangedLocked(u)&&canSwap(u)&&u.ap>=abilityInfo(u,'swap').ap){payFor(u,abilityInfo(u,'swap'));swapWeapons(u);continue}
  const near=foes.filter(f=>mdist(u,f)<=atk.rng),inr=canUse(u,atk)?near.filter(f=>!losInfo(u,f,atk).blocked):[];
  if(inr.length&&u.ap>=atk.ap&&u.fat+atk.fat<=u.fatMax){const t=inr.sort((x,y)=>hitChance(u,y,atk)-hitChance(u,x,atk)||x.hp-y.hp)[0];u.ap-=atk.ap;u.fat+=atk.fat;await strike(u,t,atk);if(B!==b||checkEnd())return;continue}
  if(inr.length||u.rooted||u.ap<2)return;
  if(near.length&&!told){told=true;FX.emit('blocked',{u,t:near[0]})}                    // foes in range but none in sight: close in until one is
  const want=near.length?1:Math.max(atk.rng,u.spell?u.spell.rng:0),D=dijkstra(u,99),st=key(u.c,u.r);let best=st,bs=1e9;
  const nf=foes.length,fc=foes.map(f=>f.c),fr=foes.map(f=>f.r),bw=BW,tl=b.tiles;
  D.forEach((v,k)=>{if(v.air)return;const c=k%bw,r=(k/bw)|0;let dm=99;for(let i=0;i<nf;i++){const d=fdist(c,r,u.sz||1,foes[i]);if(d<dm)dm=d}const t=tl[k],sc=(dm>want?dm-want:0)*10+v.cost*.1+(t.t==='haz'?30:0)-(want>1?t.h*2:0);if(sc<bs){bs=sc;best=k}});
  if(best===st)return;await walkPath(u,pathTo(D,best));if(B!==b||key(u.c,u.r)===st)return;if(checkEnd())return}}
