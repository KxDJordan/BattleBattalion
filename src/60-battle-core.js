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
const key=(c,r)=>r*BW+c,T=u=>B.tiles[key(u.c,u.r)],mdist=(a,b)=>Math.abs(a.c-b.c)+Math.abs(a.r-b.r);
const inb=(c,r)=>c>=0&&r>=0&&c<BW&&r<BH;
const spawnRow=r=>r<SPAWN_E||r>BH-1-SPAWN_P;
function tpos(c,r,h){return{x:(c-r)*HW,y:(c+r)*HH-h*HL}}
function boardCenter(){return tpos((BW-1)/2,(BH-1)/2,0)}
function unitAt(c,r){return B.units.find(u=>u.alive&&u.c===c&&u.r===r)}
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
     'ff' {u,t}              u's missed shot strays into its own ally t (the 'hit' on t follows)
     'spawn' {u}             a unit entered mid-battle (reserve, summon)
     'withdraw' {u,why}      a unit left the field alive: why is 'withdraw' | 'retreat' | 'fled'
     'status' {t,key,n}      t gained STATUS[key] (n turns, or shield damage for 'splitshield')
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
function buildEnemies(f,budget,fixed){const list=(fixed||[]).slice(),U=FACT[f].units,minC=Math.min(...U.map(u=>u[1]));let g=0;
 while(list.length<MAXFOES&&budget>=minC&&g++<200){const u=pick(U.filter(u=>u[1]<=budget));list.push(u[0]);budget-=u[1]}while(list.length<2)list.push(U[0][0]);return list}
/* ---- Units ----
   A battle unit (both sides): side, name, lvl, hp/hpMax, arm/armMax (body armor), helm/helmMax (head armor), ap/apMax, fat/fatMax,
   init, ms, rs, md, rd, brv (resolve), mor (morale 0..4), fearless, wpn, abs, res, flags, dmgB, buffs, st (status turns), alive,
   shield (true while it carries an intact shield), shp/shpMax (shield hitpoints), shb ({md,rd} the shield adds, already in md/rd),
   gone ('withdraw'|'retreat'|'fled' once it has left the field alive), c, r, id, sx, sy. Company units also carry m (the merc);
   enemies def (their EN entry) and f (faction). initUnit() fills whatever a hand-made unit lacks. */
const EDGE=[BH-1,0];                                                    // each side's own edge row: withdrawing and fleeing units leave from it
const FREEAB={id:'aoo',n:'aoo',wpn:1,mult:1,melee:1};                   // the free attack: zone of control, riposte, spear wall, a retreat
function initUnit(u){const d=(k,v)=>{if(u[k]===undefined||u[k]===null)u[k]=v};
 d('lvl',1);d('hp',1);d('hpMax',u.hp);d('arm',0);d('armMax',u.arm);d('helm',0);d('helmMax',u.helm);d('apMax',9);d('ap',u.apMax);d('fat',0);d('fatMax',9999);
 d('init',100);d('ms',50);d('rs',0);d('md',0);d('rd',0);d('brv',50);d('mor',3);d('fearless',false);d('wpn',FIST);d('abs',[]);d('res',{});d('flags',{});d('dmgB',0);
 d('buffs',[]);d('st',{});d('alive',true);d('shield',false);d('shp',0);d('shpMax',u.shp);d('name','Unit');return u}
function mkPlayerUnit(m){const s=calc(m),res={},c=armorCond(m),sh=s.shield;for(const k in s.res)res[k]={cur:s.res[k].max,max:s.res[k].max,regen:s.res[k].regen};
 return initUnit({side:0,m,name:m.name,lvl:m.lvl,hp:Math.max(1,Math.min(m.hp,s.hp)),hpMax:s.hp,arm:c.a,armMax:s.arm,helm:c.h,helmMax:s.helm,apMax:9,ap:9,fat:0,fatMax:Math.max(30,s.fat),init:s.init,ms:s.ms,rs:s.rs,md:s.md,rd:s.rd,brv:s.brv,
  wpn:s.wpn,abs:s.abs.slice(),res,flags:s.flags,dmgB:s.dmg,buffs:[],st:{},alive:true,shield:!!sh,shp:sh?sh.hp:0,shpMax:sh?sh.hp:0,shb:sh?{md:sh.md,rd:sh.rd}:null,back:s.wpn.wt==='bow'||('mana' in m.mast&&m.mast.mana>0)})}
/* Enemy fields read from EN[id] beyond the old ones (all optional): helm (head armor; default 60% of arm), brv (resolve; default from xp),
   fearless (never tests morale; default: mindless undead and bosses), shield (hitpoints, or {hp,md,rd}: md/rd are what breaking it removes), noHead. */
function mkEnemy(id,f){const d=EN[id],sh=d.shield?typeof d.shield==='object'?d.shield:{hp:d.shield,md:10,rd:10}:null;
 return initUnit({side:1,def:d,f,name:d.n,lvl:1,hp:d.hp,hpMax:d.hp,arm:d.arm,armMax:d.arm,helm:d.helm!=null?d.helm:Math.round(d.arm*.6),apMax:d.ap||9,ap:9,fat:0,fatMax:9999,init:d.init,ms:d.ms,rs:d.rs||0,md:d.md,rd:d.rd,
  brv:d.brv!=null?d.brv:clamp(Math.round(30+d.xp/10),30,85),fearless:d.fearless!=null?!!d.fearless:!!(d.boss||(f==='undead'&&!d.spell)),noHead:!!d.noHead,
  wpn:{n:'',wt:d.rng?'bow':'sword',d:d.d,ap:4,fat:0,rng:d.rng||1,ign:.25},abs:[],res:{},flags:{},dmgB:0,buffs:[],st:{},alive:true,shield:!!sh,shp:sh?sh.hp:0,shb:sh?{md:sh.md||0,rd:sh.rd||0}:null,
  spell:d.spell,kbN:d.kb||0,kbCh:d.kbCh||0,onhit:d.onhit,back:!!(d.rng||d.spell)})}
// Deploys units on free, walkable tiles: melee from row `front`, ranged from row `back`, overflowing along dir
// (then the other way). `used` is shared between both sides. Returns the units that found a tile.
function place(units,front,back,dir,tiles,used){used=used||new Set();const free=(c,r)=>inb(c,r)&&!used.has(key(c,r))&&!(tiles&&tiles[key(c,r)].t==='block');
 const put=(u,r0)=>{for(const d of [dir,-dir])for(let r=clamp(r0,0,BH-1);r>=0&&r<BH;r+=d)for(const c of COLS)if(free(c,r)){used.add(key(c,r));u.c=c;u.r=r;return true}return false};
 const ok=new Set();units.forEach(u=>{const s=u.slot;if(s&&free(s.c,s.r)){used.add(key(s.c,s.r));u.c=s.c;u.r=s.r;ok.add(u)}});   // formation: a unit with a slot stands there
 units.filter(u=>!u.back&&!ok.has(u)).forEach(u=>{if(put(u,front))ok.add(u)});units.filter(u=>u.back&&!ok.has(u)).forEach(u=>{if(put(u,back))ok.add(u)});return units.filter(u=>ok.has(u))}
// Who takes the field: o.deploy (the deployment screen's choice, at most MAXFIELD known mercs) or the company's fielded mercs.
function battleField(o){let f=fielded();if(o&&Array.isArray(o.deploy)&&o.deploy.length){const list=[];for(const d of o.deploy){const m=d&&G.roster.find(m=>m.id===d.id);if(m&&!list.includes(m)&&list.length<MAXFIELD)list.push(m)}if(list.length)f=list}return f}
const deployRow=r=>r>BH-1-SPAWN_P&&r<BH;                                 // the company's deployment zone: the SPAWN_P rows at its edge
/* battlePreview(o): what startBattle(o) would roll, for a deployment screen: {bk, tiles, foes:[enemy ids], budget}.
   It draws from the seeded stream exactly as startBattle does; hand the result back as o.tiles and o.foes and the battle
   is the one previewed (startBattle then rolls neither again). */
function battleBudget(o){let budget=0;battleField(o).forEach(m=>budget+=12+m.lvl*5);return budget*(o&&o.mult||1)*(1+G.day*.008)*(typeof BUDGETK==='number'?BUDGETK:1)}
// The enemy ids startBattle(o) would field, rolled now (seeded). Hand them back as o.foes (or o.fixedAll) to fight exactly these.
// (An EN entry with max and sub fields is capped here: the ones beyond max take the field as EN[sub], so what is previewed is what fights.)
function previewEnemies(o){const L=o.foes||o.fixedAll,n={};return(Array.isArray(L)&&L.length&&L.every(id=>EN[id])?L.slice(0,MAXFOES):buildEnemies(o.f,battleBudget(o),o.fixed))
 .map(id=>{const d=EN[id];n[id]=(n[id]||0)+1;return d.max&&d.sub&&EN[d.sub]&&n[id]>d.max?d.sub:id})}
function battlePreview(o){const bk=BIO[o.biome]?o.biome:BIOKEY[tileAt(G.p.x,G.p.y)]||'plains',budget=battleBudget(o);
 const tiles=Array.isArray(o.tiles)&&o.tiles.length===BW*BH?o.tiles:genBattleMap(bk);
 return{bk,tiles,foes:previewEnemies(o),budget}}
/* startBattle(o): o = {f, mult, src:{type,...}, biome?, fixed?} plus optional engine flags:
   auto (AI plays the company from the first turn), quiet (no result sheet), onEnd(result) callback,
   turnCap (abort as stuck after this many unit turns; tests only), pilot (which AI plays side 0; read by the AI),
   deploy [{id: mercId, c, r}] (who is fielded and where, inside the deployment zone; everyone else is a reserve),
   tiles / foes (a battlePreview() result, so the battle is the one that was shown; fixedAll is read as foes). */
function startBattle(o){const f=battleField(o);if(!f.length)return null;if(typeof closeSheet==='function')closeSheet(true);
 const pv=battlePreview(o),bk=pv.bk,dep={};if(Array.isArray(o.deploy))for(const d of o.deploy)if(d&&!dep[d.id]&&Number.isInteger(d.c)&&Number.isInteger(d.r)&&inb(d.c,d.r)&&deployRow(d.r))dep[d.id]={c:d.c,r:d.r};
 const ctr=boardCenter(),b={opts:o,bk,P:BIO[bk],tiles:pv.tiles,units:[],order:[],round:0,turns:0,cur:null,sel:null,targets:null,reach:null,busy:true,over:false,stuck:false,fled:false,result:null,onEnd:o.onEnd||null,
  reserves:G.roster.filter(m=>!f.includes(m)),gone:[],rout:[false,false],fledN:[0,0],resRound:0,retreat:false,synced:false,
  log:'',floats:[],shots:[],cam:{x:ctr.x,y:ctr.y,tx:ctr.x,ty:ctr.y,z:1}};
 // B.auto is a live switch: turning it on while the company is waiting for orders hands the turn to the AI at once.
 let auto=!!o.auto;Object.defineProperty(b,'auto',{enumerable:true,get(){return auto},set(v){auto=!!v;if(auto&&B===b)autoKick()}});
 B=b;const used=new Set(),pu=place(f.map(m=>{const u=mkPlayerUnit(m),s=m.slot;if(dep[m.id])u.slot=dep[m.id];else if(s&&(s.row===0||s.row===1)&&Number.isInteger(s.col)&&s.col>=0&&s.col<BW)u.slot={c:s.col,r:s.row?DEPLOY.p.back:DEPLOY.p.front};return u}),DEPLOY.p.front,DEPLOY.p.back,DEPLOY.p.dir,b.tiles,used),
  eu=place(pv.foes.map(id=>{const e=mkEnemy(id,o.f);if(typeof enemyInit==='function')enemyInit(e,id);return initUnit(e)}),DEPLOY.e.front,DEPLOY.e.back,DEPLOY.e.dir,b.tiles,used);
 b.units=pu.concat(eu);b.units.forEach((u,i)=>{u.id=i;const p=tpos(u.c,u.r,T(u).h);u.sx=p.x;u.sy=p.y});
 mode='battle';if(typeof setUI==='function')setUI();if(typeof layoutBattle==='function')layoutBattle();say(`${FACT[o.f].n} in the ${b.P.n.toLowerCase().replace(/^the /,"")}. ${eu.length} foes.`);nextTurn();return b}
/* spawnUnit(u): adds a unit mid-battle (reserves, summons, the raised dead). u needs side and its stats (mkEnemy(id,f) and
   mkPlayerUnit(m) make complete ones); u.c/u.r is where it should appear: the nearest free walkable tile is used when that
   one is taken, blocked or missing. It joins the turn order from the next round. Returns u, or null when the board is full. */
function spawnUnit(u){const b=B;if(!b||!u)return null;initUnit(u);const free=k=>b.tiles[k].t!=='block'&&!unitAt(k%BW,(k/BW)|0);
 const c0=Number.isInteger(u.c)?clamp(u.c,0,BW-1):COLS[0],r0=Number.isInteger(u.r)?clamp(u.r,0,BH-1):EDGE[u.side?1:0],seen=new Uint8Array(BW*BH),q=[key(c0,r0)];seen[q[0]]=1;let at=-1;
 for(let i=0;i<q.length&&at<0;i++){const k=q[i];if(free(k)){at=k;break}for(const [x,y] of DIRS){const nc=k%BW+x,nr=((k/BW)|0)+y;if(inb(nc,nr)&&!seen[key(nc,nr)]){seen[key(nc,nr)]=1;q.push(key(nc,nr))}}}
 if(at<0)return null;u.c=at%BW;u.r=(at/BW)|0;u.alive=true;u.gone=null;u.id=b.units.length;if(u.side===1&&!u.f)u.f=b.opts.f;b.units.push(u);const p=tpos(u.c,u.r,T(u).h);u.sx=p.x;u.sy=p.y;FX.emit('spawn',{u});return u}
/* ---- Statuses ---- */
// The statuses and timed buffs a unit carries now: [{key, n (name), turns}], keys from STATUS.
function unitStatuses(u){const out=[],add=(key,turns)=>{if(!out.some(x=>x.key===key))out.push({key,n:STATUS[key]?STATUS[key].n:key,turns:turns||0})};
 for(const k in u.st)if(u.st[k]>0)add(k,u.st[k]);if(u.rooted&&!(u.st.root>0)&&!(u.st.webbed>0))add('root',0);if(u.dazed&&!(u.st.daze>0))add('daze',0);
 for(const x of u.buffs)add(x.key&&STATUS[x.key]?x.key:x.indom?'indom':'buff',x.dur);if(u.shpMax>0&&!u.shield)add('splitshield',0);return out}
const statusList=unitStatuses;                                           // alias: the same list under a name no other file defines
// Gives t status key for n turns (never shortens one it already has) and tells the scene.
function addStatus(t,key,n){if(!t.alive||!(n>0))return;const had=t.st[key]||0;t.st[key]=Math.max(had,n);if(t.st[key]>had)FX.emit('status',{t,key,n:t.st[key]})}
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
function moraleCheck(u,bonus,dir){if(!B||!u.alive||u.fearless||u.gone)return null;if(dir<0?u.mor<=0:u.mor<=0||u.mor>=4||B.rout[u.side])return null;
 const pass=rnd()*100<clamp(eff(u,'brv')+bonus,5,95);if(dir<0&&!pass)setMorale(u,u.mor-1);else if(dir>0&&pass)setMorale(u,u.mor+1);return pass}
// A side of three or more routs when more than half of those still alive (on the field or fled from it) are fleeing: everyone but the fearless runs, and nobody rallies.
function checkRout(side){const b=B;if(!b||b.rout[side])return false;const al=b.units.filter(u=>u.alive&&u.side===side),n=al.length+b.fledN[side],f=al.filter(u=>u.mor===0).length+b.fledN[side];
 if(!al.length||n<3||f*2<=n)return false;b.rout[side]=true;say(side===0?'The company breaks. Every sword for himself!':'The enemy breaks and runs!');
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
 const D=dijkstra(u,u.ap);let best=-1,bd=Math.abs(u.r-er),bc=0;D.forEach((v,k)=>{const d=Math.abs(((k/BW)|0)-er);if(d<bd||(d===bd&&best>=0&&v.cost<bc)){bd=d;bc=v.cost;best=k}});
 const k0=key(u.c,u.r);if(best>=0){await walkPath(u,pathTo(D,best));if(B!==b||!u.alive)return}
 if(u.r===er){leaveField(u,'fled');return}
 if(key(u.c,u.r)===k0){u.stuckN=(u.stuckN||0)+1;if(u.stuckN>=3)leaveField(u,'fled')}else u.stuckN=0;await sleep(120)}   // boxed in for three turns: it slips away where it stands
/* ---- Leaving the field: withdraw, retreat, flight ---- */
// What cannot wait for the result: a merc who left keeps the hitpoints it left with, and a split shield does not come home.
// (Armor condition, m.cond, is written by resolveBattle() from u.arm / u.helm for everyone who lives.)
function syncMerc(u){const m=u.m;if(!m)return;if(u.gone)m.hp=Math.max(1,Math.min(u.hp,calc(m).hp));if(u.shpMax>0&&!u.shield&&m.eq.s){m.eq.s=null}}
function leaveField(u,why){if(!B||!u.alive)return false;u.alive=false;u.gone=why;u.buffs=[];B.gone.push(u);if(why==='fled')B.fledN[u.side]++;syncMerc(u);
 float(u,why==='fled'?'Fled':'Withdrew','#c8d0d8');say(`${u.name} ${why==='fled'?'flees the field':'leaves the field'}.`);FX.emit('withdraw',{u,why});if(why==='fled')checkRout(u.side);return true}
/* battleSync(): runs once, when the battle is decided and before its result is resolved: hitpoints of those who left the field,
   shields that were split. Units that left alive stay in B.units with alive=false and gone set (they are also listed in B.gone);
   resolveBattle() must count them as survivors, not as casualties. */
function battleSync(){const b=B;if(!b||b.synced)return;b.synced=true;for(const u of b.units)if(u.side===0&&u.m&&(u.alive||u.gone||u.down))syncMerc(u)}
// The foe that punishes u for turning its back: adjacent, able, armed for melee and not yet used this round.
const canFree=e=>e.alive&&!e.st.stun&&e.mor!==0&&e.wpn.wt!=='bow';
function zocFoe(u){return B.units.find(e=>e.side!==u.side&&mdist(e,u)===1&&canFree(e)&&!e.aoo)||null}
const FREESAY={zoc:(e,u)=>`${e.name} strikes as ${u.name} turns away.`,riposte:(e,u)=>`${e.name} ripostes.`,spearwall:(e,u)=>`${e.name} meets ${u.name} with the spear.`,retreat:(e,u)=>`${e.name} cuts at ${u.name}'s back.`};
// One free attack by e on u (zone of control, riposte, spear wall, retreat). Returns true when it hit.
async function freeAttack(e,u,why){if(!canFree(e)||!u.alive)return false;say(FREESAY[why](e,u));return strike(e,u,FREEAB,{free:why})}
const canWithdraw=u=>!!(B&&!B.over&&u&&u.alive&&u.r===EDGE[u.side]&&!u.rooted&&u.ap>=AB.withdraw.ap);
/* withdraw(u): u leaves the battle alive from its own edge row (2 AP). A foe next to it gets its free attack first; a hit
   holds u on the field. Returns true when u left. Safe to call from the HUD (it then moves the turn on) and from an AI turn. */
async function withdraw(u){const b=B;if(!b||!canWithdraw(u))return false;const ui=!b.busy;if(ui){b.busy=true;b.sel=null;b.targets=null;b.reach=null}u.ap-=AB.withdraw.ap;let held=false;
 const foe=zocFoe(u);if(foe){foe.aoo=1;if(await freeAttack(foe,u,'zoc')){if(u.alive)float(u,'Halted','#ffd27a');held=true}}if(B!==b)return false;
 if(!held&&u.alive)leaveField(u,'withdraw');if(ui){b.busy=false;afterAction()}return u.gone==='withdraw'}
const canRetreat=()=>!!(B&&!B.over&&!B.retreat&&B.units.some(u=>u.alive&&u.side===0));
/* soundRetreat(): the whole company quits the field. Units with no foe adjacent leave at once; engaged units take one free attack
   from every foe next to them, then leave if they live. The battle ends as a retreat (result.fled). Returns true when sounded. */
async function soundRetreat(){const b=B;if(!canRetreat())return false;b.retreat=true;b.fled=true;b.busy=true;b.sel=null;b.targets=null;b.reach=null;b.reserves=[];say('The retreat is sounded.');
 for(const u of b.units.filter(u=>u.alive&&u.side===0)){for(const e of adjFoes(u)){if(B!==b)return true;if(u.alive)await freeAttack(e,u,'retreat')}if(B!==b)return true;if(u.alive)leaveField(u,'retreat')}
 checkEnd();return true}
/* ---- Reserves ---- */
function reserveTile(){const b=B,r=EDGE[0];for(const c of COLS)if(b.tiles[key(c,r)].t!=='block'&&!unitAt(c,r))return key(c,r);return -1}
const canCallReserve=()=>!!(B&&!B.over&&!B.retreat&&B.reserves.length&&B.resRound!==B.round&&B.units.filter(u=>u.alive&&u.side===0).length<MAXFIELD&&reserveTile()>=0);
/* callReserve(m, k?): brings reserve m (a merc from B.reserves, or its id) onto a free tile of the company's edge row (tile key k,
   or the free one nearest the middle). One reserve a round, and only while fewer than MAXFIELD company units stand on the field.
   The newcomer acts from the next round. Returns its unit, or null. */
function callReserve(m,k){const b=B;if(!canCallReserve())return null;const i=b.reserves.findIndex(x=>x===m||x.id===m);if(i<0)return null;
 if(!(Number.isInteger(k)&&k>=0&&k<BW*BH&&((k/BW)|0)===EDGE[0]&&b.tiles[k].t!=='block'&&!unitAt(k%BW,(k/BW)|0)))k=reserveTile();
 const u=mkPlayerUnit(b.reserves[i]);u.c=k%BW;u.r=(k/BW)|0;if(!spawnUnit(u))return null;b.reserves.splice(i,1);b.resRound=b.round;u.ap=0;say(`${u.name} joins the fight.`);FX.ui();return u}
/* ---- Abilities ---- */
function abilityInfo(u,id){const w=u.wpn,bowR=w.rng+(w.wt==='bow'&&u.flags.eagle?1:0);
 if(id==='attack')return{id,n:w.wt==='bow'?'Shoot':'Attack',ap:w.ap,fat:w.fat||0,rng:bowR,tgt:'enemy',wpn:1,mult:1};
 const a=Object.assign({id},AB[id]);if(a.wpn){if(a.ap==null)a.ap=w.ap;if(a.rng==null)a.rng=bowR}return a}
function canUse(u,a){if(u.mor===0||u.ap<a.ap||u.fat+a.fat>u.fatMax)return false;if(a.cost&&(!u.res[a.cost[0]]||u.res[a.cost[0]].cur<a.cost[1]))return false;if(a.needs&&u.wpn.wt!==a.needs)return false;
 if(a.two&&!u.wpn.two)return false;if(a.shield&&!u.shield)return false;if(a.withdraw&&!canWithdraw(u))return false;if(a.once&&u.used&&u.used[a.id])return false;return true}
function payFor(u,a){u.ap-=a.ap;u.fat+=a.fat;if(a.cost)u.res[a.cost[0]].cur-=a.cost[1];if(a.once)(u.used||(u.used={}))[a.id]=1}
/* ---- Line of sight and cover ----
   shotKind: 0 a melee blow (adjacent, a free attack, a dash), 1 a reach weapon striking 2+ tiles away (a pike over the front
   rank: walls stop it, bodies do not), 2 a shot (bows, spells, aura waves).
   losInfo(u,t,a?) -> {blocked, cover, ff}. The line runs over the grid from one tile to the other (the same tiles both ways).
   An obstacle, or ground more than 1 step higher than both ends, blocks it. Every unit standing in it is 1 step of cover
   (at most 2; one step less when the shooter stands higher than the target), worth -COVERPEN to hit each. ff lists the
   shooter's own side in the line: a shot that misses strays into one of them with chance FFCH, for FFDMG of its damage. */
function shotKind(u,t,a){const d=mdist(u,t);if(d<=1||(a&&(a.melee||a.dash)))return 0;return a&&a.wpn&&!a.magic&&u.wpn.wt!=='bow'&&u.wpn.rng>=d?1:2}
function losInfo(u,t,a){const out={blocked:false,cover:0,ff:[]},kind=shotKind(u,t,a);if(!kind||!B)return out;
 let p=u,q=t;if(key(t.c,t.r)<key(u.c,u.r)){p=t;q=u}
 const dc=q.c-p.c,dr=q.r-p.r,n=Math.max(Math.abs(dc),Math.abs(dr)),top=Math.max(T(u).h,T(t).h)+1;let cov=0;
 for(let i=1;i<n;i++){const c=Math.round(p.c+dc*i/n),r=Math.round(p.r+dr*i/n),tl=B.tiles[key(c,r)];if(tl.t==='block'||tl.h>top){out.blocked=true;continue}
  const x=unitAt(c,r);if(x&&x!==u&&x!==t){cov++;if(x.side===u.side)out.ff.push(x)}}
 if(kind===1){out.ff=[];return out}if(T(u).h>T(t).h)cov--;out.cover=clamp(cov,0,2);return out}
const morOf=u=>MORFX[u.mor==null?3:u.mor]||MORFX[3];
// Chance in percent that u's ability a hits t: 100 for abilities that cannot miss, else 5..95.
function hitChance(u,t,a){if(a.sure)return 100;const d=mdist(u,t),melee=!!a.melee||d<=1;let sk,df;
 if(a.magic){sk=72+(u.lvl||1)*2;df=eff(t,'rd')*.5}else{sk=(u.wpn.wt==='bow'?eff(u,'rs'):eff(u,'ms'))+(u.wpn.hit||0);df=melee?eff(t,'md'):eff(t,'rd')}
 let ch=sk-df+(a.hit||0);const hd=T(u).h-T(t).h;ch+=hd>0?10:hd<0?-10:0;if(d>2&&!a.melee)ch-=(d-2)*2;if(t.st.stun)ch+=15;if(t.st.webbed)ch+=10;
 ch+=morOf(u).hit-morOf(t).def;if(u.dazed||u.st.daze)ch-=15;if(!melee)ch-=losInfo(u,t,a).cover*COVERPEN;return clamp(Math.round(ch),5,95)}
// Chance in percent that a hit lands on the head (the helmet soaks it, and it does HEADMULT to hitpoints).
function headChance(u,t,a){if(a.noDmg||a.split||t.noHead)return 0;return clamp(HEADCH+(a.head||0),0,100)}
// Where an Aura dash would land: the free tile next to t that is closest to u (null if none).
function dashSpot(u,t){let best=null,bd=1e9;for(const [x,y] of DIRS){const nc=t.c+x,nr=t.r+y;if(!inb(nc,nr)||B.tiles[key(nc,nr)].t==='block'||unitAt(nc,nr))continue;const d=Math.abs(nc-u.c)+Math.abs(nr-u.r);if(d<bd){bd=d;best=[nc,nr]}}return best}
function validTargets(u,a){const out=new Set();
 if(a.tgt==='enemy')B.units.forEach(t=>{if(t.alive&&t.side!==u.side&&mdist(u,t)<=a.rng&&!(a.dash&&mdist(u,t)>1&&u.wpn.rng<mdist(u,t)&&!dashSpot(u,t))&&!(a.needShieldT&&!t.shield)&&!losInfo(u,t,a).blocked)out.add(key(t.c,t.r))});
 else if(a.tgt==='ally')B.units.forEach(t=>{if(t.alive&&t.side===u.side&&mdist(u,t)<=a.rng&&!(a.noSelf&&t===u))out.add(key(t.c,t.r))});
 else if(a.tgt==='move')for(let r=0;r<BH;r++)for(let c=0;c<BW;c++){const d=Math.abs(c-u.c)+Math.abs(r-u.r);if(!d||d>a.rng)continue;const t=B.tiles[key(c,r)];if(t.t==='block'||unitAt(c,r))continue;if(!a.leap&&t.h-T(u).h>1)continue;out.add(key(c,r))}
 return out}
/* ---- Damage ---- */
const heavyHit=t=>Math.max(8,Math.ceil(t.hpMax*HEAVYHIT));              // hitpoints lost in one blow that shake a unit (and may injure a merc)
// Applies injury id to a unit in the field: its stats drop at once, as they will in calc(m).
function applyInjury(u,id){const st=INJ[id].st;for(const k in st){const v=st[k];if(k==='hp'){u.hpMax=Math.max(5,u.hpMax+v);u.hp=Math.min(u.hp,u.hpMax)}else if(k==='fat')u.fatMax=Math.max(20,u.fatMax+v);else if(k==='dmg')u.dmgB=(u.dmgB||0)+v;else u[k]+=v}}
// Rolls an injury for the merc behind unit t (head or body, permanent or not). Returns its id, or null.
function inflictInjury(t,head,perm,slow){if(!t.m)return null;const id=rollInjury(t.m,head,perm,slow);if(!id)return null;if(t.alive)applyInjury(t,id);float(t,INJ[id].n,'#ff7a6b');say(`${t.name}: ${INJ[id].n.toLowerCase()}.`);FX.emit('injury',{t,id});return id}
function killUnit(t,src,head){t.hp=0;t.alive=false;if(t.side===0&&t.m){t.down=rnd()<DOWNCH;if(t.down)inflictInjury(t,head,rnd()<PERMCH,true)}   // struck down and alive: always at the price of an injury
 say(`${t.name} ${t.side===0&&t.down?'is struck down':'falls'}.`);FX.emit('death',{t});
 for(const x of B.units.slice()){if(!x.alive||x===t)continue;const d=mdist(x,t);if(x.side===t.side){if(d<=3)moraleCheck(x,d<=1?25:35,-1)}else if(x===src)moraleCheck(x,25,1);else if(d<=3)moraleCheck(x,-10,1)}}
/* hurt(t,dmg,ign,src,o): applies damage. The armor of the struck location soaks first (o.head: the helmet, else body armor);
   `ign` is the share that pierces it; o.pierce skips armor altogether; head hits do HEADMULT to hitpoints.
   src is the attacker (null for terrain, burn and bleeding); o.loc marks a weapon or spell hit (it reports its location and can injure).
   Returns the hitpoints taken. */
function hurt(t,dmg,ign,src,o){o=o||{};const head=!!o.head,pool=head?'helm':'arm',a0=t[pool]||0;let hpd;
 if(o.pierce)hpd=dmg;else if(a0>0){const ad=Math.min(a0,dmg);t[pool]=a0-ad;hpd=Math.max(dmg-ad,Math.round(dmg*ign-t[pool]*.1),0)}else hpd=dmg;
 if(head)hpd=Math.round(hpd*HEADMULT);
 t.hp-=hpd;float(t,hpd>0?'-'+hpd:'Armor',hpd>0?'#ff7a6b':'#c8d0d8');FX.emit('hit',{u:src||null,t,dmg:hpd,armor:a0-(t[pool]||0),head});if(o.loc)FX.emit('loc',{t,head});
 if(t.hp<=0){killUnit(t,src||null,head);return hpd}
 if(hpd>=heavyHit(t)){if(o.loc&&t.m&&rnd()<INJCH)inflictInjury(t,head,false);moraleCheck(t,30,-1)}
 return hpd}
// Shield damage. A shield at 0 is destroyed: its defense and its skills are gone (and a merc's shield does not come home).
function breakShield(t){if(!t.shield)return false;t.shp=0;t.shield=false;if(t.shb){t.md-=t.shb.md;t.rd-=t.shb.rd}dropBuff(t,'shieldwall');t.abs=t.abs.filter(id=>!(AB[id]&&AB[id].shield));
 float(t,'Shield split','#ffd27a');say(`${t.name}'s shield is split.`);FX.emit('status',{t,key:'splitshield',n:0});return true}
function damageShield(t,n,src){if(!t.shield)return 0;const s0=t.shp,d=Math.min(s0,Math.max(0,n));float(t,'Shield -'+d,'#c8d0d8');if(d>=s0)breakShield(t);else{t.shp=s0-d;FX.emit('status',{t,key:'splitshield',n:d})}return d}
async function knockback(u,t,n){let dc=t.c-u.c,dr=t.r-u.r;if(Math.abs(dc)>=Math.abs(dr)){dc=Math.sign(dc)||1;dr=0}else{dr=Math.sign(dr);dc=0}
 for(let i=0;i<n&&t.alive;i++){const nc=t.c+dc,nr=t.r+dr,cur=T(t);if(!inb(nc,nr)||B.tiles[key(nc,nr)].t==='block'||unitAt(nc,nr)||B.tiles[key(nc,nr)].h>cur.h+1){float(t,'Slam','#ffd27a');hurt(t,8,1);break}
  const drop=cur.h-B.tiles[key(nc,nr)].h;t.c=nc;t.r=nr;FX.emit('kb',{t});await sleep(120);if(drop>=1)hurt(t,6*drop,1);if(t.alive&&T(t).t==='haz')hurt(t,12,1)}}
/* strike(u,t,a,o): one attack of u on t with ability a. Returns true on a hit.
   o: splash (damage factor of a secondary hit), auto (cannot miss: arcs, stray shots), free (a free attack: it provokes neither
   a riposte nor a stray shot), stray (this is a missed shot landing on an ally).
   Order of the seeded draws: hit roll; on a miss the stray-shot roll (only with allies in the line) and its victim;
   on a hit the damage roll, the location roll, then whatever hurt() needs (injury, morale), statuses, knockback. */
async function strike(u,t,a,o){o=o||{};if(!t.alive||!u.alive)return false;const d=mdist(u,t);
 if(d>1||a.magic)FX.shot(u,t,a.magic?'#c9a8ff':a.cost?RESC[a.cost[0]]:'#e9e0c9',26,22);
 if(a.split){if(!t.shield)return false;damageShield(t,Math.round(ri(u.wpn.d[0],u.wpn.d[1])*(a.smult||1)),u);await sleep(240);return true}
 if(!o.auto&&!a.sure&&rnd()*100>=hitChance(u,t,a)){float(t,'Miss','#c8d0d8');FX.emit('miss',{u,t});await sleep(230);
  if(!o.free&&shotKind(u,t,a)===2){const ff=losInfo(u,t,a).ff;if(ff.length&&rnd()<FFCH){const v=ff[Math.floor(rnd()*ff.length)];say(`${u.name}'s shot strays into ${v.name}.`);FX.emit('ff',{u,t:v});await strike(u,v,a,{auto:1,stray:1,free:'stray',splash:(o.splash||1)*FFDMG})}}
  else if(!o.free&&!a.magic&&d===1&&t.alive&&u.alive&&buffSum(t,'rip'))await freeAttack(t,u,'riposte');
  return false}
 let dmg=0,ign=1;if(a.noDmg){}else if(a.magic){dmg=ri(a.magic[0],a.magic[1])*(1+(u.wpn.spell||0))*(1+(u.side===0?u.lvl*.03:0));ign=a.ign||.5}else{dmg=ri(u.wpn.d[0],u.wpn.d[1])*(a.mult||1);ign=(u.wpn.ign||.2)+(a.ignB||0)}
 dmg*=1+buffSum(u,'dmg')+(u.dmgB||0);if(u.flags.exec&&t.hp<t.hpMax/2)dmg*=1.25;if(o.splash)dmg*=o.splash;if(T(u).h>T(t).h)dmg*=1.1;
 let dr=buffSum(t,'dr');if(t.flags.forged&&t.arm>0)dr+=.15;dmg=Math.round(dmg*Math.max(.2,1-dr));
 let hpd=0;if(dmg>0){const head=rnd()*100<headChance(u,t,a);hpd=hurt(t,dmg,ign,u,{head,pierce:!!a.pierce,loc:1})}else if(a.noDmg)float(t,'Shoved','#ffd27a');
 if(t.alive){const st=Object.assign({},a.status||{});if(!a.magic&&u.wpn.stun&&rnd()<u.wpn.stun)st.stun=Math.max(st.stun||0,1);if(u.onhit&&rnd()<u.onhit.ch)st.root=Math.max(st.root||0,u.onhit.root);if(a.bleed&&hpd>0)st.bleed=a.bleed;
  for(const k in st)addStatus(t,k,st[k]);
  const kb=a.kb||(u.kbN&&rnd()<u.kbCh?u.kbN:0);if(kb&&!buffSum(t,'indom'))await knockback(u,t,kb)}
 else if(u.flags.berserk&&!u.bzk){u.bzk=1;u.ap+=4;float(u,'Berserk','#ffd27a');FX.emit('buff',{t:u})}
 await sleep(240);return true}
/* ---- Movement ---- */
function stepCost(u,fk,tk){const a=B.tiles[fk],b=B.tiles[tk];let c=2;if(!u.flags.path){if(b.h>a.h)c++;if(b.t==='rough')c++}return c}
function dijkstra(u,max){const D=new Map(),st=key(u.c,u.r),occ=new Uint8Array(BW*BH);for(const x of B.units)if(x.alive)occ[key(x.c,x.r)]=1;D.set(st,{cost:0,prev:-1});const open=[st];
 while(open.length){let bi=0;for(let i=1;i<open.length;i++)if(D.get(open[i]).cost<D.get(open[bi]).cost)bi=i;const k=open.splice(bi,1)[0],cur=D.get(k);if(cur.done)continue;cur.done=1;const c=k%BW,r=(k/BW)|0;
  for(const [a,b] of DIRS){const nc=c+a,nr=r+b;if(!inb(nc,nr))continue;const nk=key(nc,nr),t=B.tiles[nk];if(t.t==='block'||occ[nk]||t.h-B.tiles[k].h>1)continue;
   const v=cur.cost+stepCost(u,k,nk);if(v>max)continue;const o=D.get(nk);if(!o||v<o.cost){D.set(nk,{cost:v,prev:k});open.push(nk)}}}return D}
function pathTo(D,k){const p=[];for(let x=k;D.get(x)&&D.get(x).prev>=0;x=D.get(x).prev)p.unshift(x);return p}
/* Walks u along path, one tile at a time. Free attacks are settled here and nowhere else:
   leaving a tile next to a foe draws that foe's free attack (one per foe and round; a hit halts u where it stands);
   stepping next to a foe in spear wall draws its thrust before the step (a hit stops u short; a miss lets it in and drops the wall). */
async function walkPath(u,path){const b=B;for(const k of path){if(B!==b||!u.alive)return;const fk=key(u.c,u.r),c=stepCost(u,fk,k);if(u.ap<c||u.fat+2>u.fatMax)break;if(unitAt(k%BW,(k/BW)|0))break;
  const foe=zocFoe(u);
  if(foe){foe.aoo=1;const hit=await freeAttack(foe,u,'zoc');if(B!==b||!u.alive)return;if(hit){float(u,'Halted','#ffd27a');break}}
  let stop=false;const nc=k%BW,nr=(k/BW)|0;
  for(const s of b.units.filter(s=>s.alive&&s.side!==u.side&&buffSum(s,'sw')&&mdist(s,u)>1&&Math.abs(s.c-nc)+Math.abs(s.r-nr)===1)){if(!canFree(s))continue;
   const hit=await freeAttack(s,u,'spearwall');if(B!==b||!u.alive)return;if(hit){float(u,'Halted','#ffd27a');stop=true;break}dropBuff(s,'spearwall')}
  if(stop){u.ap=Math.max(0,u.ap-c);break}
  u.ap-=c;u.fat+=2;u.c=nc;u.r=nr;FX.emit('move',{u});await sleep(105);if(B!==b)return;if(T(u).t==='haz'){hurt(u,12,1);if(!u.alive)return}}}
async function useAbility(u,a,k){const b=B;b.busy=true;b.sel=null;b.targets=null;b.reach=null;payFor(u,a);if(a.id!=='attack')say(`${u.name} uses ${a.n}.`);FX.ui();const c=k%BW,r=(k/BW)|0;
 if(a.id!=='attack')FX.emit('cast',{u,t:a.tgt==='self'?u:a.tgt==='ally'||a.tgt==='enemy'?unitAt(c,r)||null:null,ab:a});
 if(a.tgt==='self'){if(a.withdraw){u.ap+=a.ap;await withdraw(u);if(B!==b)return}
  if(a.gainAP){u.ap+=a.gainAP;float(u,'+'+a.gainAP+' AP','#ffd27a');FX.emit('buff',{t:u})}if(a.buff){addBuff(u,a.buff,a.dur);float(u,a.n,'#9bd96f');FX.emit('buff',{t:u})}}
 else if(a.tgt==='aoe'){for(const t of b.units.filter(t=>t.alive&&t.side!==u.side&&mdist(u,t)===1)){if(B!==b||!u.alive)break;await strike(u,t,a)}}
 else if(a.tgt==='move'){u.c=c;u.r=r;FX.emit('move',{u});await sleep(200);if(B===b&&T(u).t==='haz')hurt(u,12,1)}
 else if(a.tgt==='ally'){const t=unitAt(c,r);if(t){if(a.heal){const h=ri(a.heal[0],a.heal[1]),h0=t.hp;t.hp=Math.min(t.hpMax,t.hp+h);float(t,'+'+h,'#9bd96f');FX.emit('heal',{t,n:t.hp-h0})}
   if(a.buff){addBuff(t,a.buff,a.dur);float(t,a.n,'#9bd96f');FX.emit('buff',{t})}if(a.giveAP){t.bonusAP=(t.bonusAP||0)+a.giveAP;float(t,'+'+a.giveAP+' AP','#ffd27a');FX.emit('buff',{t})}}}
 else if(a.tgt==='enemy'){const t=unitAt(c,r);if(t){
   if(a.dash&&mdist(u,t)>1){const best=dashSpot(u,t);if(best){u.c=best[0];u.r=best[1];FX.emit('move',{u});await sleep(200)}}
   if(B===b&&u.alive&&(!a.dash||mdist(u,t)===1||u.wpn.rng>=mdist(u,t))){
    if(losInfo(u,t,a).blocked){float(u,'No line of fire','#c8d0d8');FX.emit('blocked',{u,t});await sleep(200)}
    else{await strike(u,t,a);
    if(a.aoe)for(const o of b.units.filter(o=>o.alive&&o.side!==u.side&&o!==t&&mdist(o,t)===1)){if(B!==b)break;await strike(u,o,a,{splash:.7})}
    if(a.chain){let last=t;const hit=[t];for(let i=0;i<a.chain&&B===b;i++){const n=b.units.filter(o=>o.alive&&o.side!==u.side&&!hit.includes(o)&&mdist(o,last)<=3).sort((x,y)=>mdist(x,last)-mdist(y,last))[0];if(!n)break;FX.shot(last,n,'#c9a8ff',22,22);await strike(u,n,a,{splash:.6,auto:1});hit.push(n);last=n}}}}}}
 await sleep(120);if(B!==b)return;b.busy=false;afterAction()}
function afterAction(){if(checkEnd())return;if(!B.cur.alive||B.cur.mor===0){nextTurn();return}computeReach();FX.ui()}
function computeReach(){const u=B.cur;B.reach=null;if(u&&u.side===0&&u.alive&&!u.rooted&&u.ap>=2)B.reach=dijkstra(u,u.ap)}
// True once the battle is decided. The first time, it locks the battle and schedules endBattle (at once in instant mode).
// A side is beaten when nobody of it is left standing on the field: the dead, the fled and the withdrawn all count as gone.
function checkEnd(){const b=B;if(!b||b.over)return true;const p=b.units.some(u=>u.alive&&u.side===0),e=b.units.some(u=>u.alive&&u.side===1);if(p&&e)return false;
 b.over=true;b.busy=true;if(!p&&b.units.some(u=>u.side===0&&u.gone))b.fled=true;battleSync();const done=()=>{if(B===b)endBattle(p)};if(SPEEDF>0)setTimeout(done,700*SPEEDF);else done();return true}
async function nextTurn(){const b=B;if(!b||checkEnd())return;
 if(b.opts.turnCap&&b.turns>=b.opts.turnCap){b.over=true;b.busy=true;b.stuck=true;battleSync();if(b.onEnd)b.onEnd({stuck:true,win:false,rounds:b.round,turns:b.turns});return}
 b.turns++;let u=null;
 while(!u){if(!b.order.length){b.round++;if(b.auto&&canCallReserve())callReserve(b.reserves[0]);const al=b.units.filter(x=>x.alive);al.forEach(x=>x.roll=x.init+(rnd()-.5)*5.66);b.order=al.sort((x,y)=>y.roll-x.roll||x.id-y.id)}
  const x=b.order.shift();if(x.alive)u=x}
 b.cur=u;b.busy=true;u.bzk=0;u.aoo=0;b.sel=null;b.targets=null;b.reach=null;
 u.ap=u.apMax+(u.bonusAP||0);u.bonusAP=0;u.fat=Math.max(0,u.fat-15);for(const k in u.res)u.res[k].cur=Math.min(u.res[k].max,u.res[k].cur+u.res[k].regen);
 u.buffs=u.buffs.filter(x=>--x.dur>0);if(u.st.chill){u.ap=Math.max(0,u.ap-3);u.st.chill--;float(u,'Chilled','#8fd8ff')}u.rooted=false;if(u.st.root){u.rooted=true;u.st.root--}if(u.st.webbed){u.rooted=true;u.st.webbed--}
 u.dazed=false;if(u.st.daze){u.dazed=true;u.st.daze--}
 b.cam.tx=u.sx;b.cam.ty=u.sy-10;FX.emit('turn',{u});FX.ui();
 if(u.st.bleed){u.st.bleed--;hurt(u,BLEEDDMG,1,null,{pierce:1});await sleep(200);if(B!==b)return}
 if(u.alive&&u.st.burn){u.st.burn--;hurt(u,8,1);await sleep(260);if(B!==b)return}if(u.alive&&T(u).t==='haz'){hurt(u,12,1);await sleep(200);if(B!==b)return}
 if(!u.alive)return nextTurn();
 if(u.st.stun){u.st.stun=0;float(u,'Stunned','#ffd27a');await sleep(420);if(B!==b)return;return nextTurn()}
 if(moraleTurn(u)){await sleep(u.side===1?200:60);if(B!==b)return;await fleeTurn(u);if(B!==b||b.over)return;return nextTurn()}
 if(u.side===1||b.auto){await sleep(u.side===1?260:60);if(B!==b)return;await aiTurn(u);if(B!==b||b.over)return;return nextTurn()}
 b.busy=false;computeReach();FX.ui()}
// Hands the company's current turn to the AI (used when B.auto is switched on mid-turn).
async function autoKick(){const b=B;if(!b||b.over||b.busy||!b.cur||b.cur.side!==0||!b.cur.alive)return;b.busy=true;b.sel=null;b.targets=null;b.reach=null;FX.ui();
 await aiTurn(b.cur);if(B!==b||b.over)return;nextTurn()}
// The built-in AI (charge, shoot what can be hit, cast). 63-ai.js replaces it through aiTurn2(u) when it is loaded.
async function aiTurn(u){if(typeof aiTurn2==='function')return aiTurn2(u);const b=B;let told=false;for(let n=0;n<8&&u.alive&&u.mor!==0&&B===b&&!b.over;n++){const foes=b.units.filter(x=>x.alive&&x.side!==u.side);if(!foes.length)return;const atk=abilityInfo(u,'attack');
  if(u.spell&&u.ap>=4){const ab={id:'spell',n:u.spell.n,magic:u.spell.d,ign:.5,status:u.spell.status},ts=foes.filter(f=>mdist(u,f)<=u.spell.rng&&!losInfo(u,f,ab).blocked);if(ts.length){const t=ts.sort((x,y)=>x.hp-y.hp)[0];u.ap-=4;say(`${u.name} casts ${u.spell.n}.`);FX.emit('cast',{u,t,ab});await strike(u,t,ab);if(B!==b||checkEnd())return;continue}}
  const near=foes.filter(f=>mdist(u,f)<=atk.rng),inr=near.filter(f=>!losInfo(u,f,atk).blocked);
  if(inr.length&&u.ap>=atk.ap&&u.fat+atk.fat<=u.fatMax){const t=inr.sort((x,y)=>hitChance(u,y,atk)-hitChance(u,x,atk)||x.hp-y.hp)[0];u.ap-=atk.ap;u.fat+=atk.fat;await strike(u,t,atk);if(B!==b||checkEnd())return;continue}
  if(inr.length||u.rooted||u.ap<2)return;
  if(near.length&&!told){told=true;FX.emit('blocked',{u,t:near[0]})}                    // foes in range but none in sight: close in until one is
  const want=near.length?1:Math.max(atk.rng,u.spell?u.spell.rng:0),D=dijkstra(u,99),st=key(u.c,u.r);let best=st,bs=1e9;
  const nf=foes.length,fc=foes.map(f=>f.c),fr=foes.map(f=>f.r),bw=BW,tl=b.tiles;
  D.forEach((v,k)=>{const c=k%bw,r=(k/bw)|0;let dm=99;for(let i=0;i<nf;i++){let d=fc[i]-c,e=fr[i]-r;if(d<0)d=-d;if(e<0)e=-e;if(d+e<dm)dm=d+e}const t=tl[k],sc=(dm>want?dm-want:0)*10+v.cost*.1+(t.t==='haz'?30:0)-(want>1?t.h*2:0);if(sc<bs){bs=sc;best=k}});
  if(best===st)return;await walkPath(u,pathTo(D,best));if(B!==b||key(u.c,u.r)===st)return;if(checkEnd())return}}
