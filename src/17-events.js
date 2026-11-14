/* ================= EVENTS AND ORIGINS (events agent, Phase 7) =================
   EVENTS[id] = {n, kind:[...], art, cd (days before it can come again; 0 = once only), who?(m,ctx) (the merc it is about; the event
   needs one), who2?(m,ctx) (a second merc, never the first), when(ctx) -> weight (0 = not now), text(ctx) -> html,
   opts:[{t, badge? (requirement label), req?(ctx) -> bool, d (exact effects and odds; string or fn(ctx)), go(ctx) -> result text}]}
   kinds: 'travel' (on the march), 'camp' (resting in camp), 'town' (entering a town), 'after' (after a won battle).
   The world's travelTick (40-world.js) offers 'travel' every 24..48 hours marched; called with {h} instead, eventTick counts the gap itself.
   ctx = {kind, m, m2, town (index), t (town), biome, f (owner faction of that town: house id or 'free'), fn (its name), day, night, ...caller's fields}.
   eventTick(kind, ctx) -> true when a card was shown. 'travel': see above (with {h}: an event every EVK.tMin..EVK.tMax hours, seeded); camp calls 'camp' after a rest (EVK.camp chance, once a day); towns 'town' on entering
   ({town:i, then:fn} - then runs when the card closes; if eventTick returns false the caller goes on at once); battle flow 'after'
   ({win, f, then}). eventShow(id | {n, text, opts, art?}, ctx) shows a card (contract twists use the object form).
   evtResolve(id|def, ctx, i) applies option i without any UI and returns {ok, text, fx:[{t,c}], fight} (tests, twists).
   G.evt = {seen:{id:day}, flags:{}, acc, next, last:{camp,town,after}, n}; evtRepair(G) validates it.
   Every random roll is the game stream (rnd/ri/pick): an event and its outcome follow from the seed and the choices made.
   ORIGINS[k] = {n, d, rule, icon, roster, crowns, k:{multipliers}, setup(G)}; originK(key) -> the origin's multiplier for
   'wage' 'parts' 'college' 'rift' 'hire' (1 when none); other files read it with typeof fallbacks. */
const EVK={tMin:30,tMax:46,camp:.4,town:.22,after:.35};
const EVS={cur:null,busy:false,res:null,then:null,fight:null};
function evtNew(){return{seen:{},flags:{},acc:0,next:36,last:{camp:0,town:0,after:0},n:0}}
function evtRepair(g){g=g||G;if(!g||typeof g!=='object')return g;const e=g.evt&&typeof g.evt==='object'&&!Array.isArray(g.evt)?g.evt:{},o=evtNew();
 if(e.seen&&typeof e.seen==='object'&&!Array.isArray(e.seen))for(const k in e.seen){const v=Math.floor(+e.seen[k]);if(isFinite(v))o.seen[k]=v}
 if(e.flags&&typeof e.flags==='object'&&!Array.isArray(e.flags))for(const k in e.flags){const v=e.flags[k];if(v===null||['number','string','boolean'].includes(typeof v))o.flags[k]=typeof v==='number'&&!isFinite(v)?0:v}
 o.acc=isFinite(+e.acc)?clamp(+e.acc,0,999):0;o.next=isFinite(+e.next)&&+e.next>0?clamp(+e.next,1,200):36;o.n=isFinite(+e.n)?Math.max(0,Math.floor(+e.n)):0;
 if(e.last&&typeof e.last==='object')for(const k of ['camp','town','after']){const v=Math.floor(+e.last[k]);if(isFinite(v))o.last[k]=v}
 g.evt=o;if(typeof g.origin!=='string'||!ORIGINS[g.origin])g.origin='free';return g}
function evG(){if(!G.evt||typeof G.evt!=='object'||!G.evt.seen)evtRepair(G);return G.evt}
function evFlag(k){return G&&G.evt&&G.evt.flags?G.evt.flags[k]:undefined}
function evSetFlag(k,v){evG().flags[k]=v}

/* ---- world context ---- */
function evBiome(){try{return W&&G&&G.p?BIOKEY[tileAt(G.p.x,G.p.y)]||'plains':'plains'}catch(e){return'plains'}}
function evNearTown(){if(!G||!Array.isArray(G.towns)||!G.towns.length||!G.p)return null;let b=0,bd=1e18;G.towns.forEach((t,i)=>{const d=(t.x-G.p.x)**2+(t.y-G.p.y)**2;if(d<bd){bd=d;b=i}});return b}
function evOwner(i){const t=G&&G.towns&&G.towns[i];return t&&typeof t.own==='string'?t.own:'free'}
function evHouse(f){return G&&Array.isArray(G.houses)?G.houses.find(h=>h&&h.id===f)||null:null}
function evFacName(f){const h=evHouse(f);if(h)return h.n||('House '+f);if(f==='free')return'the free towns';return FACT[f]?FACT[f].n:String(f)}
function evRepOf(f){return G&&G.rep&&typeof G.rep[f]==='number'?G.rep[f]:0}
function evTier(f){try{if(typeof repTier==='function'){const t=repTier(f);if(t&&t.k)return t.k}}catch(e){}const r=evRepOf(f);return r<=-50?'hostile':r<=-15?'cold':r<15?'neutral':r<50?'friendly':'allied'}
function evCtx(kind,x){x=x||{};const town=x.town!=null&&G.towns&&G.towns[x.town]?x.town:evNearTown(),t=town!=null?G.towns[town]:null,f=x.f&&kind!=='after'?x.f:evOwner(town);
 return Object.assign({kind,day:G.day|0,biome:evBiome(),night:G.hour>=20||G.hour<5},x,{town,t,f:x.fac||f,fn:evFacName(x.fac||f),foe:kind==='after'?x.f||null:x.foe||null})}

/* ---- merc predicates (no randomness) ---- */
const evBg=(m,...k)=>!!m&&k.includes(m.bg);
const evTr=(m,k)=>!!m&&Array.isArray(m.traits)&&m.traits.includes(k);
function evGift(m){try{return mercRes(m)}catch(e){return null}}
function evAwake(m){try{return typeof giftAwake==='function'&&giftAwake(m)}catch(e){return false}}
function evFol(id){try{return typeof followerHas==='function'&&!!followerHas(id)}catch(e){return false}}
function evMaxHp(m){try{return calc(m).hp}catch(e){return m.hp||1}}
// the first merc of the roster (in roster order) that passes fn, skipping those in not[]: deterministic, used by option requirements
function evFind(fn,not){if(!G||!G.roster)return null;not=not||[];return G.roster.find(m=>m&&!not.includes(m)&&fn(m))||null}
const evAnyBg=(c,...k)=>evFind(m=>evBg(m,...k),[c.m]);
const evAnyTr=(c,k)=>evFind(m=>evTr(m,k),[c.m]);
const evAnyGift=(c,r)=>evFind(m=>evGift(m)===r);
const evNm=m=>m?`<b>${htmlEsc(m.name)}</b>`:'someone';
const evPlain=m=>m?String(m.name):'One of yours';
function evLord(m){return!!m&&G.origin==='noble'&&evFlag('lord')===m.id}

/* ---- effects: every change goes through these and is listed under the result ---- */
const EVLOG=[];
function evLog(t,c){EVLOG.push({t,c:c||''})}
function evCrowns(n){n=Math.round(n);if(!n)return 0;if(n<0)n=-Math.min(G.crowns|0,-n);G.crowns=(G.crowns||0)+n;evLog(`${n>0?'+':'−'}${Math.abs(n)} crowns`,n>0?'good':'bad');return n}
function evFood(n){n=Math.round(n);if(n<0)n=-Math.min(G.food|0,-n);if(!n)return 0;G.food=(G.food||0)+n;evLog(`${n>0?'+':'−'}${Math.abs(n)} food`,n>0?'good':'bad');return n}
function evTools(n){n=Math.round(n);if(n<0)n=-Math.min(G.tools|0,-n);if(!n)return 0;G.tools=(G.tools||0)+n;evLog(`${n>0?'+':'−'}${Math.abs(n)} tools`,n>0?'good':'bad');return n}
function evRenown(n){n=Math.round(n);if(n<0)n=-Math.min(G.renown|0,-n);if(!n)return 0;G.renown=(G.renown||0)+n;evLog(`${n>0?'+':'−'}${Math.abs(n)} renown`,n>0?'good':'bad');return n}
function evSalve(n){G.salve=Math.max(0,(G.salve|0)+n);evLog(`${n>0?'+':'−'}${Math.abs(n)} salve${Math.abs(n)===1?'':'s'}`,n>0?'good':'bad')}
function evPart(k,n){if(!PARTS[k]||!n)return;if(!G.parts||typeof G.parts!=='object')G.parts={};const v=Math.max(0,(G.parts[k]||0)+n);if(v)G.parts[k]=Math.min(999,v);else delete G.parts[k];evLog(`${n>0?'+':'−'}${Math.abs(n)} ${PARTS[k].n.toLowerCase()}`,n>0?'good':'bad')}
function evItem(id){if(!ITEMS[id])return false;if(!Array.isArray(G.stash))G.stash=[];G.stash.push(id);evLog(`${ITEMS[id].n} to the stash`,'good');return true}
function evXP(m,n){if(!m||!n)return;const l=m.lvl;gainXP(m,Math.round(n));evLog(`${m.name} +${Math.round(n)} XP${m.lvl>l?' (level '+m.lvl+')':''}`,'good')}
function evHurt(m,n){if(!m)return;const h=m.hp;m.hp=Math.max(1,m.hp-Math.round(n));if(h>m.hp)evLog(`${m.name} −${h-m.hp} hitpoints`,'bad')}
function evHeal(m,n){if(!m)return;const mx=evMaxHp(m),h=m.hp;m.hp=Math.min(mx,m.hp+(n==null?mx:Math.round(n)));if(m.hp>h)evLog(`${m.name} +${m.hp-h} hitpoints`,'good')}
function evHealAll(n){let t=0;for(const m of G.roster){const mx=evMaxHp(m),h=m.hp;m.hp=Math.min(mx,m.hp+n);t+=m.hp-h}if(t)evLog(`+${t} hitpoints across the company`,'good')}
// a fresh injury (seeded pick among the light ones, or perm), or a named one; logged
function evInj(m,id,days){if(!m)return null;let k=null;if(id){if(typeof addInjury==='function'&&addInjury(m,id,days))k=id}else if(typeof rollInjury==='function')k=rollInjury(m,rnd()<.4,false);
 if(k)evLog(`${m.name}: ${INJ[k].n.toLowerCase()}`,'bad');return k}
function evHeals(m){if(!m||!Array.isArray(m.inj))return 0;const n=m.inj.filter(j=>j.days>=0).length;m.inj=m.inj.filter(j=>j.days<0);if(n)evLog(`${m.name}'s wounds are mended`,'good');return n}
/* evTrait(m,k): m gains trait k. Its opposite is replaced; with two traits already, a good trait pushes out a bad one (and a bad one a
   good one); with no such trait to push out nothing changes. Returns true when gained. */
function evTrait(m,k){const r=evTrait0(m,k);if(r&&m)m.hp=clamp(m.hp,1,evMaxHp(m));return r}
function evTrait0(m,k){const T=TRAITS[k];if(!m||!T)return false;if(!Array.isArray(m.traits))m.traits=[];if(m.traits.includes(k))return false;
 if(T.opp&&m.traits.includes(T.opp)){m.traits=m.traits.map(x=>x===T.opp?k:x);evLog(`${m.name}: ${TRAITS[T.opp].n} becomes ${T.n}`,T.good?'good':'bad');return true}
 if(m.traits.length>=2){const out=m.traits.find(x=>TRAITS[x]&&!!TRAITS[x].good!==!!T.good);if(!out)return false;m.traits=m.traits.filter(x=>x!==out);evLog(`${m.name} is no longer ${TRAITS[out].n}`,T.good?'good':'bad')}
 m.traits.push(k);if(typeof traitsValid==='function'&&!traitsValid(m.traits)){m.traits.pop();return false}evLog(`${m.name} becomes ${T.n}`,T.good?'good':'bad');return true}
function evUntrait(m,k){if(!evTr(m,k))return false;m.traits=m.traits.filter(x=>x!==k);m.hp=clamp(m.hp,1,evMaxHp(m));evLog(`${m.name} is no longer ${TRAITS[k].n}`,TRAITS[k].good?'bad':'good');return true}
function evRep(f,n,why){if(!f||!n||FACT[f])return;if(f!=='free'&&!evHouse(f)&&!(G.rep&&f in G.rep))return;
 if(typeof repGain==='function'){try{repGain(f,n,why||'an event')}catch(e){}}else{if(!G.rep||typeof G.rep!=='object')G.rep={};G.rep[f]=clamp((G.rep[f]||0)+n,-100,100)}
 evLog(`${n>0?'+':'−'}${Math.abs(n)} standing with ${evFacName(f)}`,n>0?'good':'bad')}
// a recruit joins (room permitting): background bg at level lvl; returns the merc or null
function evRecruit(bg,lvl,o){if(!BG[bg])return null;if(!canRecruit()){evLog(`${SOLOWHY}: the ${BG[bg].n.toLowerCase()} goes their own way`,'');return null}if(G.roster.length>=MAXROSTER){evLog(`No room in the roster (${MAXROSTER}): the ${BG[bg].n.toLowerCase()} goes on alone`,'');return null}
 const m=newMerc(bg);lvl=clamp(lvl|0||1,1,MAXLV);if(lvl>1)gainXP(m,XPT[lvl]-m.xp);if(o&&o.name)m.name=o.name;if(o&&o.trait)evTraitQuiet(m,o.trait);m.hp=evMaxHp(m);m.field=G.roster.filter(x=>x.field).length<(typeof MAXFIELD==='number'?MAXFIELD:12);
 G.roster.push(m);evLog(`${m.name} the ${BG[bg].n.toLowerCase()} joins (level ${m.lvl})`,'good');return m}
function evTraitQuiet(m,k){const n=EVLOG.length;evTrait(m,k);EVLOG.length=n}
// m leaves the company (never the last sword, never a noble guard's lord); returns true when gone
function evLeave(m,why){if(!m||G.roster.length<=1||evLord(m))return false;const i=G.roster.indexOf(m);if(i<0)return false;G.roster.splice(i,1);evLog(`${m.name} ${why||'leaves the company'}`,'bad');return true}
function evHours(h){if(!h)return;EVS.busy=true;try{if(typeof advanceTime==='function')advanceTime(h)}finally{EVS.busy=false}evLog(`${h} hours lost`,'bad')}
/* evFight(f, mult, why): a band of faction f forms beside the company; the battle starts when the card is closed (engage). */
function evFight(f,mult,why){if(!FACT[f])return null;const p={id:G.nid++,x:G.p.x,y:G.p.y,tx:G.p.x,ty:G.p.y,f,mult:mult||.8,goal:'roam',ev:1,ch:1};
 if(typeof setPatrol==='function'){try{setPatrol(p)}catch(e){}}G.parties.push(p);EVS.fight={f,mult:p.mult,src:{type:'party',id:p.id}};evLog(`Battle: ${FACT[f].n.toLowerCase()}${why?' ('+why+')':''}`,'bad');return p}
const evRoll=p=>rnd()<p;
function evStashLoot(f){const L=(FACT[f]&&FACT[f].loot||[]).filter(id=>ITEMS[id]);return L.length?evItem(pick(L)):false}

/* ---- picking and showing ---- */
const EVENTS={};
function evDue(id,E){const D=EVENTS[id],s=E.seen[id];if(s==null)return true;if(!D.cd)return false;return (G.day|0)-s>=D.cd}
function evCands(D,ctx){if(!D.who)return null;return G.roster.filter(m=>{try{return!!D.who(m,ctx)}catch(e){return false}})}
/* evtChoose(kind, ctx): weighs every due event of that kind (no randomness), then draws one, its merc and its second merc. -> ctx or null */
function evtChoose(kind,base){const E=evG(),L=[];let tot=0;
 for(const id in EVENTS){const D=EVENTS[id];if(!D||D.twist||!Array.isArray(D.kind)||!Array.isArray(D.opts)||!D.kind.includes(kind)||typeof D.when!=='function'||!evDue(id,E))continue;const c=Object.assign({},base),cs=evCands(D,c);
  if(cs&&!cs.length)continue;c.m=cs?cs[0]:G.roster[0];if(D.who2){const c2=G.roster.filter(m=>m!==c.m&&D.who2(m,c));if(!c2.length)continue;c.m2=c2[0]}
  let w=0;try{w=+D.when(c)||0}catch(e){w=0}if(w>0){L.push({id,w,cs});tot+=w}}
 if(!L.length)return null;let x=rnd()*tot,hit=L[L.length-1];for(const e of L){x-=e.w;if(x<=0){hit=e;break}}
 const D=EVENTS[hit.id],c=Object.assign({},base,{id:hit.id});c.m=hit.cs?pick(hit.cs):pick(G.roster);
 if(D.who2){const c2=G.roster.filter(m=>m!==c.m&&D.who2(m,c));c.m2=c2.length?pick(c2):null;if(!c.m2)return null}else{const o=G.roster.filter(m=>m!==c.m);c.m2=o.length?pick(o):null}
 return c}
/* eventTick(kind, ctx) -> true when an event card is shown. */
function eventTick(kind,x){if(EVS.cur&&typeof sheetOpen!=='undefined'&&!sheetOpen){EVS.cur=null;EVS.res=null;EVS.then=null;EVS.fight=null}   // a card closed some other way
 if(!G||!Array.isArray(G.roster)||!G.roster.length||EVS.busy||EVS.cur)return false;x=x||{};const E=evG();originWatch();if(EVS.cur)return false;
 const open=typeof sheetOpen!=='undefined'&&sheetOpen;
 if(kind==='travel'){if(open)return false;   // with x.h (hours marched) the gap is counted here; without it the caller has already spaced the offers (40-world.js travelTick)
  if(isFinite(+x.h)&&+x.h>0){E.acc+=+x.h;if(E.acc<E.next)return false;E.acc=0;E.next=ri(EVK.tMin,EVK.tMax)}}
 else if(kind==='camp'){if(E.last.camp===G.day)return false;E.last.camp=G.day;if(!(rnd()<EVK.camp))return false}
 else if(kind==='town'){if(E.last.town===G.day)return false;E.last.town=G.day;if(!(rnd()<EVK.town))return false}
 else if(kind==='after'){if(x.win===false||E.last.after===G.day)return false;if(!(rnd()<EVK.after))return false;E.last.after=G.day}
 else return false;
 const c=evtChoose(kind,evCtx(kind,x));if(!c)return false;E.n++;return eventShow(c.id,c)}
// the definition for an id or a generic {n, text, opts, art} object (contract twists)
function evDef(id){const D=id&&typeof id==='object'?id:EVENTS[id];if(!D)return null;if(Array.isArray(D.kind)&&Array.isArray(D.opts)&&D.opts.length&&typeof id!=='object')return D;
 // a generic card (contract twists: an object, or an EVENTS entry written by 16-contracts.js without kind/cd) gets the missing fields
 const o=Object.assign({kind:['twist'],art:'road',cd:0,when:()=>0},D,{opts:Array.isArray(D.opts)&&D.opts.length?D.opts:[{t:'Go on',d:'Nothing changes.',go:()=>''}]});if(!Array.isArray(o.kind))o.kind=['twist'];return o}
// the scene for a contract twist art key 'twist-<k>'
const EVTWISTART={ambush:'road',bribe:'tavern',surrender:'field',outbid:'square',betray:'gibbet',betrayal:'gibbet',cursed:'crypt',curse:'crypt'};
function evStr(v,c){try{return typeof v==='function'?String(v(c)||''):String(v==null?'':v)}catch(e){return''}}
function evReqOk(o,c){if(o.recruit&&!canRecruit())return false;if(!o.req)return true;try{return!!o.req(c)}catch(e){return false}}
/* evtResolve(id|def, ctx, i): applies option i. {ok, text, fx, fight}. ok false (nothing changes) when the option's requirement fails. */
function evtResolve(id,ctx,i){const D=evDef(id);if(!D)return{ok:false,text:'',fx:[]};const c=ctx||evCtx(D.kind[0]||'travel',{});if(!c.m||!G.roster.includes(c.m))c.m=G.roster[0];
 const o=D.opts[i];if(!o||!evReqOk(o,c))return{ok:false,text:'',fx:[]};EVLOG.length=0;EVS.fight=null;let t='';
 try{t=o.go?o.go(c):''}catch(e){t='';if(typeof console!=='undefined')console.warn('event option failed',e)}
 for(const m of G.roster){const mx=evMaxHp(m);if(!(m.hp<=mx))m.hp=mx;if(!(m.hp>=1))m.hp=1}   // traits and wounds may lower the maximum
 const fx=EVLOG.slice();EVLOG.length=0;const fight=EVS.fight;return{ok:true,text:String(t||''),fx,fight}}
/* eventShow(id | {n, text, opts, art}, ctx): the event card. ctx.then runs when it closes. Uses no randomness. */
function eventShow(id,ctx){const D=evDef(id);if(!D||!G||!Array.isArray(G.roster)||!G.roster.length)return false;const c=ctx&&ctx.biome?ctx:evCtx(D.kind[0]||'travel',ctx||{});
 if(!c.m||!G.roster.includes(c.m)){const cs=evCands(D,c);c.m=cs&&cs.length?cs[0]:G.roster[0]}
 if(!c.m2||!G.roster.includes(c.m2)||c.m2===c.m){const o=G.roster.filter(m=>m!==c.m&&(!D.who2||D.who2(m,c)));c.m2=o[0]||null}
 if(typeof id==='string')evG().seen[id]=G.day|0;   // the march pauses while the card is up (sheetOpen) and goes on after it
 EVS.cur={id,D,c};EVS.res=null;EVS.then=typeof c.then==='function'?c.then:null;EVS.fight=null;evRender();return true}
function evPortrait(c,sc){return c&&c.m&&typeof portraitHTML==='function'?portraitHTML(c.m,sc>=3?64:32,'ev-pt'):''}
function evRender(){const S=EVS.cur;if(!S||typeof sheet!=='function')return;const {D,c}=S,R=EVS.res,sc=evArtScale();
 const kindN=evStr(D.label,c)||{travel:'On the road',camp:'In camp',town:c.t?c.t.name:'In town',after:'After the battle',twist:c.c&&c.c.title?c.c.title:'A twist'}[D.kind[0]]||'';
 let h=`<div class="ev${R?' ev-done':''}"><div class="ev-art${D.who2&&c.m2?' ev-two':''}${sc<3?' ev-sm':''}" style="--evw:${EVW*sc}px;--evh:${EVH*sc}px"><img class="ev-scene" src="${evArtURL(D.art,c)}" width="${EVW*sc}" height="${EVH*sc}" alt="">`+
  `${c.m&&D.who!==null?`<div class="ev-who">${evPortrait(c,sc)}<span>${htmlEsc(c.m.name)}<small>${htmlEsc(BG[c.m.bg]?BG[c.m.bg].n:'')}</small></span></div>`:''}${D.who2&&c.m2?`<div class="ev-who ev-who2"><span>${htmlEsc(c.m2.name)}<small>${htmlEsc(BG[c.m2.bg]?BG[c.m2.bg].n:'')}</small></span>${evPortrait({m:c.m2},sc)}</div>`:''}<div class="ev-kind">${htmlEsc(kindN)}</div></div><div class="ev-main"><h2>${htmlEsc(evStr(D.n,c))}</h2>`;
 if(!R){h+=`<div class="ev-txt">${evStr(D.text,c)}</div><div class="ev-opts">`;
  D.opts.forEach((o,i)=>{const ok=evReqOk(o,c),solo=!ok&&o.recruit&&!canRecruit(),b=solo?recruitWhy():evStr(o.badge,c)||(ok?'':evStr(o.why,c)||'the means');
   h+=`<button class="ev-opt${ok?'':' ev-lock'}"${ok?'':' disabled'} onclick="evtPick(${i})"><span class="ev-ot">${htmlEsc(evStr(o.t,c))}${b?`<span class="ev-bdg${ok?'':' no'}">${ok||solo?'':'Needs '}${htmlEsc(b)}</span>`:''}</span><small class="ev-od">${evStr(o.d,c)}${o.joins&&!canRecruit()?` <em class="ev-solo">(${SOLOWHY}: nobody joins.)</em>`:''}</small></button>`});
  h+=`</div>`}
 else{h+=`<div class="ev-chose">${htmlEsc(R.t||'')}</div><div class="ev-txt">${R.text||''}</div>${R.fx.length?`<ul class="ev-fx">${R.fx.map(x=>`<li class="${x.c}">${htmlEsc(x.t)}</li>`).join('')}</ul>`:'<p class="dim ev-none">Nothing else changes.</p>'}
  <div class="ev-opts"><button class="pri ev-go" onclick="evtClose()">${EVS.fight?'To battle':'Continue'}</button></div>`}
 sheet(h+`</div></div>`,'evt wide')}
function evtPick(i){const S=EVS.cur;if(!S||EVS.res)return;const r=evtResolve(S.D,S.c,i);if(!r.ok){if(typeof toast==='function')toast('That choice is not open to you');return}
 r.text=r.text||'';r.t=evStr(S.D.opts[i].t,S.c);EVS.res=r;evRender()}
function evtClose(){const then=EVS.then,f=EVS.fight;EVS.cur=null;EVS.res=null;EVS.then=null;EVS.fight=null;if(typeof closeSheet==='function')closeSheet(true);
 if(f&&typeof engage==='function'&&G.parties.some(p=>p.id===f.src.id)){engage(f);return}
 originWatch();if(then){try{then()}catch(e){}}if(typeof save==='function')save()}
function evArtScale(){let w=667,h=375;try{w=innerWidth||667;h=innerHeight||375}catch(e){}const land=w>h*1.15,av=land?Math.min(w*.4,340):Math.min(w-56,520);return Math.max(1,Math.min(land&&h<460?2:4,Math.floor(av/EVW)))}

/* ---- origins ---- */
const ORIGINS={
 free:{n:'Free company',icon:'banner',d:'Four swords, a banner nobody has heard of and twelve hundred crowns. Every road is open and every lord is a stranger.',
  rule:'No special rule: the standard start.',roster:['sellsword','squire','hunter','acolyte'],crowns:1200,k:{}},
 deserters:{n:'Deserters',icon:'retreat',d:'You walked off a lord\'s field the night before the battle, with your spears and his pay chest. His house has not forgotten.',
  rule:'Wages 20% lower: men who ran know their price. One house starts Hostile (−60) and sends patrols after you; the other houses are wary (−10).',roster:['deserter','deserter','militia','brigand'],crowns:900,k:{wage:.8}},
 noble:{n:'A fallen noble\'s guard',icon:'helmet',d:'The last heir of a broken house and the few who kept their oath. Good steel, an old name, and very little coin.',
  rule:'The heir (a level 3 knight) must survive: if the heir falls, the oath is broken and the run is lost (or the company fights on with half its renown). Better armor and weapons, 450 crowns, 30 renown, and his family\'s friends (+20 with one house).',roster:['knight','squire','squire','militia'],crowns:450,k:{}},
 academy:{n:'Academy expedition',icon:'mana',d:'A college sent you to map the old leylines. Every one of you carries the gift, and none of you has been in a real fight.',
  rule:'Every sword starts with its gift awakened, but each is Fragile (−6 hitpoints). Colleges serve you at half price.',roster:['hedge','spellblade','spellblade','acolyte'],crowns:1000,k:{college:.5}},
 beast:{n:'Beast hunters',icon:'part-pelt',d:'Trappers and monster-hunters who follow the bounties. You know which gland is worth the knife and which tracks are fresh.',
  rule:'Monster parts drop 1.5 times as often. One hunter starts Beast-wise. You start with pelts, meat and two salves more.',roster:['hunter','poacher','wildling','woodcutter'],crowns:1000,k:{parts:1.5,intel:1}},
 pilgrims:{n:'Pilgrims of the Rift',icon:'ab-riftstep',d:'You saw the sky crack in a dream, and walked. The rifts will open sooner for you, and you mean to be there.',
  rule:'The Sundering comes on day 12, not 18. Closing a rift pays 50% more. The free towns shelter pilgrims (+20 with them); the houses distrust zealots (−5).',roster:['flagellant','cultist','acolyte','monk'],crowns:900,k:{rift:1.5}},
 slayer:{n:'Solo: Beast Slayer',icon:'skull',solo:1,d:'One hunter, one spear, a crossbow on the back and a ledger of every beast that ever fell to them. No banner-men, no partners: the bounties are all yours.',
  rule:'You ride alone: nobody can join the company, not by hire, parley or event (followers still can). The slayer starts at level 3, Beast-wise, with the Monster hunter tree: every kill of a kind makes the next easier. Contracts pay as for two swords. If the slayer dies, the run ends.',
  roster:['slayer'],crowns:1000,k:{}}
};
/* ---- who may join: a Solo origin (ORIGINS[k].solo) closes the roster for good ----
   canRecruit(g?) -> false for a solo run; recruitWhy(g?) -> the reason ('You ride alone') or ''. Every path that adds a merc to G.roster
   checks it: tavern hire (50-towns.js), a rival's parley hire (40-world.js), a beaten rival who asks to join (68-battle-flow.js), event
   recruits (evRecruit; options with recruit:1 are shown disabled with the reason). Followers (the retinue) are not members: still allowed. */
const SOLOWHY='You ride alone';
function isSolo(g){g=g||G;const O=g&&typeof g.origin==='string'?ORIGINS[g.origin]:null;return!!(O&&O.solo)}
function canRecruit(g){return!isSolo(g)}
function recruitWhy(g){return isSolo(g)?SOLOWHY:''}
function originK(key){const O=G&&ORIGINS[G.origin];const v=O&&O.k?O.k[key]:undefined;return typeof v==='number'&&isFinite(v)?v:1}
// the house a deserter company fled: the first house that does not own the starting town (else the first)
function evStartHouse(g,own){const H=Array.isArray(g.houses)?g.houses:[];if(!H.length)return null;const t0=g.towns&&g.towns[0]&&g.towns[0].own;return(own?H.find(h=>h.id===t0):H.find(h=>h.id!==t0))||H[0]}
function evSetRep(f,v){if(!f)return;if(!G.rep||typeof G.rep!=='object')G.rep={};const cur=G.rep[f]||0;if(typeof repGain==='function'){try{repGain(f,v-cur,'origin');return}catch(e){}}G.rep[f]=clamp(v,-100,100)}
function evGear(m,ids){for(const id of ids){const it=ITEMS[id];if(!it)continue;m.eq[it.k]=id;if(it.k==='w'&&it.two)m.eq.s=null}if(typeof fixHands==='function')fixHands(m);m.hp=evMaxHp(m)}
/* originApply(g, k): replaces the default roster and stores with the origin's (seeded), sets g.origin. Called by createCampaign. */
function originApply(g,k){const O=ORIGINS[k]?ORIGINS[k]:ORIGINS.free;k=ORIGINS[k]?k:'free';g.origin=k;if(!g.evt)g.evt=evtNew();
 if(k!=='free'){g.roster=[];O.roster.forEach(b=>{const m=newMerc(BG[b]?b:'sellsword');m.field=true;g.roster.push(m)})}
 g.crowns=O.crowns;if(typeof O.setup==='function')O.setup(g);return g}
ORIGINS.deserters.setup=g=>{const H=evStartHouse(g);if(!H)return;for(const h of g.houses)evSetRep(h.id,h===H?-60:-10);
 if(typeof repTier==='function'){let n=0;while(n++<5&&evTier(H.id)!=='hostile')evSetRep(H.id,Math.max(-100,evRepOf(H.id)-10))}g.evt.flags.fled=H.id};
ORIGINS.noble.setup=g=>{const L=g.roster[0];L.name='Ser '+L.name;gainXP(L,XPT[3]-L.xp);evGear(L,['mail','arming','heater','nasal']);g.evt.flags.lord=L.id;
 if(g.roster[1])evGear(g.roster[1],['brigandine','coif']);if(g.roster[2])evGear(g.roster[2],['mail','cap']);g.renown=30;g.stash.push('kite');
 const H=evStartHouse(g,true);if(H){evSetRep(H.id,20);g.evt.flags.kin=H.id}};
ORIGINS.academy.setup=g=>{for(const m of g.roster){if(!m.gift){const r=pick(['mana','qi']);m.gift=giftKey(r,mercStyle(m));if(!m.trees.includes(m.gift))m.trees.push(m.gift);syncMast(m)}
  const P=typeof perkOptions==='function'?perkOptions(m).filter(o=>o.kind==='gift'&&o.unlocked&&!o.owned):[];if(P.length&&typeof learnPerk==='function')learnPerk(m,P[0].id);
  evTraitQuiet(m,'fragile');m.hp=evMaxHp(m)}g.stash.push('focus')};
ORIGINS.beast.setup=g=>{if(!g.parts||typeof g.parts!=='object')g.parts={};g.parts.pelt=(g.parts.pelt||0)+3;g.parts.meat=(g.parts.meat||0)+4;g.salve=(typeof g.salve==='number'?g.salve:2)+2;
 const h=g.roster[0];if(h)evTraitQuiet(h,'beastwise');g.stash.push('huntbow')};
ORIGINS.pilgrims.setup=g=>{g.crisisDay=12;if(Array.isArray(g.houses))for(const h of g.houses)evSetRep(h.id,-5);evSetRep('free',20);
 if(!g.parts||typeof g.parts!=='object')g.parts={};g.parts.voidshard=(g.parts.voidshard||0)+2;g.stash.push('pilgrim')};
// the lone Beast Slayer: level 3 (two levels' perk points and stat rolls to spend), the full kit, Beast-wise; two salves and a bundle of meat more
ORIGINS.slayer.setup=g=>{const L=g.roster[0];if(!L)return;gainXP(L,XPT[3]-L.xp);evGear(L,['boarspear','leather','cap']);if(ITEMS.huntxbow)L.eq.b='huntxbow';if(typeof fixHands==='function')fixHands(L);
 evTraitQuiet(L,'beastwise');if(!Array.isArray(L.traits)||!L.traits.includes('beastwise')){L.traits=(L.traits||[]).filter(k=>TRAITS[k]&&TRAITS[k].good).slice(0,1);L.traits.push('beastwise')}
 if(!L.slain||typeof L.slain!=='object')L.slain={};L.field=true;L.hp=evMaxHp(L);
 g.salve=(typeof g.salve==='number'?g.salve:2)+2;if(!g.parts||typeof g.parts!=='object')g.parts={};g.parts.meat=(g.parts.meat||0)+2};
/* originWatch(): a noble guard whose heir has fallen (gone from the roster) sees the oath-broken card once. */
function originWatch(){if(!G||G.origin!=='noble'||!G.evt||!G.evt.flags)return;const F=G.evt.flags;if(!F.lord||F.oath)return;if(!Array.isArray(G.roster)||G.roster.some(m=>m.id===F.lord))return;
 if((typeof sheetOpen!=='undefined'&&sheetOpen)||(typeof mode!=='undefined'&&mode!=='world'))return;F.oath=1;   // shown at the next quiet moment in the world
 eventShow({n:'The oath is broken',label:'The oath',art:'gibbet',who:null,text:()=>`<p>The heir is dead. The guard swore to bring him home to his father's hall, and there is no hall now and no one to bring.</p><p class="dim">This was the one rule of a fallen noble's guard: the run is lost. You may lay down the banner, or fight on as a free company with half the renown you earned.</p>`,
  opts:[{t:'Lay down the banner',d:'The run ends. A new company can be raised.',go:()=>{EVS.then=()=>{if(typeof newGame==='function')newGame(true)};return'<p>The banner is folded. The swords go their own ways.</p>'}},
   {t:'Fight on as a free company',d:'The origin becomes Free company. −50% renown.',go:()=>{G.origin='free';evRenown(-Math.floor((G.renown||0)/2));return'<p>Nobody speaks of the oath again. The pay is the same.</p>'}}]},{kind:'twist'})}

/* ---- vignettes (EVART): drawn below ---- */
const EVW=100,EVH=60;
function evArtURL(k,c){return typeof evArtDraw==='function'?evArtDraw(k,c):''}

/* ================= THE EVENTS ================= */
const evHouseF=c=>evHouse(c.f)?c.f:null;   // the nearby town's house, or null in free country
const evTownNm=c=>c.t?htmlEsc(c.t.name):'the nearest town';
const evP=(...a)=>a.map(x=>`<p>${x}</p>`).join('');
Object.assign(EVENTS,{
/* ---------- travel ---------- */
pedlar:{n:'A pedlar\'s cart',kind:['travel'],art:'wagon',cd:6,when:c=>1.2,
 text:c=>evP(`A pedlar has a cart in the ditch and a mule that will not pull. He waves your column down: he will sell cheap if you help him out of the mud.`),
 opts:[{t:'Buy a load of food',req:c=>G.crowns>=50,d:'−50 crowns, +14 food.',go:c=>{evCrowns(-50);evFood(14);return'<p>Sacks of oats and a wheel of hard cheese change hands.</p>'}},
  {t:'Buy tools and nails',req:c=>G.crowns>=60,d:'−60 crowns, +10 tools.',go:c=>{evCrowns(-60);evTools(10);return'<p>He throws in a bent file for luck.</p>'}},
  {t:'Lighten his purse',badge:'Cutpurse',req:c=>!!evFind(m=>evBg(m,'thief','beggar','brigand')),d:c=>`${evPlain(evFind(m=>evBg(m,'thief','beggar','brigand')))} tries it. 65%: +90 crowns. 35%: caught: −10 standing with ${evFacName(c.f)} and a black eye (−8 hitpoints).`,
   go:c=>{const t=evFind(m=>evBg(m,'thief','beggar','brigand'));if(evRoll(.65)){evCrowns(90);return`<p>${evNm(t)} helps push the cart and comes back with the purse.</p>`}evRep(c.f,-10,'robbed a pedlar');evHurt(t,8);return`<p>The pedlar catches ${evNm(t)}'s wrist and screams for the road wardens.</p>`}},
  {t:'Push the cart and move on',d:'+2 renown.',go:c=>{evRenown(2);return'<p>He blesses the company all the way down the road.</p>'}}]},
hexmark:{n:'A hex mark',kind:['travel'],art:'shrine',cd:20,who:m=>evBg(m,'witchhunter'),when:c=>evFlag('hexDone')?0:2.4,
 text:c=>evP(`${evNm(c.m)} stops at a waystone and goes very still. Someone has cut a hex into it, fresh, with blood in the grooves. "A witch walks this road," the witch hunter says, "and she marks it for her kin."`),
 opts:[{t:'Burn the mark out',badge:'Witch hunter',req:c=>evBg(c.m,'witchhunter'),d:c=>`${evPlain(c.m)} +80 XP. The witch will know who did it (she may come looking).`,go:c=>{evXP(c.m,80);evSetFlag('hexBroken',G.day);evSetFlag('hexDone',1);return`<p>${evNm(c.m)} pours oil in the grooves and lights it. The flame burns green, then nothing.</p>`}},
  {t:'Follow the trail',d:'+12 hours. 60%: the witch is found and flees, leaving her hoard: +120 crowns and a hedge focus. 40%: she was waiting: a fight with the restless dead she raised.',
   go:c=>{evHours(12);evSetFlag('hexDone',1);if(evRoll(.6)){evCrowns(120);evItem('focus');return'<p>A hut in a hollow, a pot still warm. She ran out the back.</p>'}evFight('undead',.8,'her servants');return'<p>The trail ends in a barrow field. The ground moves.</p>'}},
  {t:'Leave it be',d:c=>`35%: ${evPlain(c.m2)} becomes Superstitious.`,go:c=>{evSetFlag('hexDone',1);if(evRoll(.35))evTrait(c.m2,'superstitious');return'<p>The company gives the stone a wide berth.</p>'}}]},
hexwitch:{n:'The witch comes calling',kind:['travel','camp'],art:'glade',cd:0,when:c=>evFlag('hexBroken')&&G.day-evFlag('hexBroken')>=3?4:0,
 text:c=>evP(`A woman in a moth-eaten shawl waits by the road with her hands folded. "You burned my mark," she says. "I can forgive. Forgiving is expensive."`),
 opts:[{t:'Pay her',req:c=>G.crowns>=100,d:'−100 crowns. The matter is closed.',go:c=>{evCrowns(-100);return'<p>She counts the coins twice and is gone between one step and the next.</p>'}},
  {t:'Counter-curse',badge:'Mana',req:c=>!!evAnyGift(c,'mana'),d:c=>`${evPlain(evAnyGift(c,'mana'))} matches her. 60%: she breaks: +150 XP for the mage and her staff to the stash. 40%: the mage takes the curse: concussion.`,
   go:c=>{const m=evAnyGift(c,'mana');if(evRoll(.6)){evXP(m,150);evItem(ITEMS.witchstave?'witchstave':'staff');return`<p>${evNm(m)} speaks a word older than hers. Her staff cracks.</p>`}evInj(m,'concussion',5);return`<p>The curse lands like a thrown stone. ${evNm(m)} falls.</p>`}},
  {t:'Drive her off',d:'A fight: she raises the dead (restless dead, light band). Win and she troubles you no more.',go:c=>{evFight('undead',.7,'the witch\'s dead');return'<p>She smiles, and the ditches open.</p>'}}]},
ford:{n:'The swollen ford',kind:['travel'],art:'river',cd:8,when:c=>c.biome==='snow'||c.biome==='desert'?.4:1.1,
 text:c=>evP(`Rain in the hills has swollen the ford. The water is brown and fast and up to a tall man's chest. Upstream there is no bridge for a day's march.`),
 opts:[{t:'Wade across',d:'Each sword: 30% −8 hitpoints. 15%: one sword is hurt (an injury). −4 tools (soaked).',go:c=>{for(const m of G.roster)if(evRoll(.3))evHurt(m,8);if(evRoll(.15))evInj(pick(G.roster));evTools(-4);return'<p>Linked arms, packs over heads, one stumble at a time.</p>'}},
  {t:'Rig a line',badge:'Sailor',req:c=>!!evFind(m=>evBg(m,'sailor','miner')),d:c=>`${evPlain(evFind(m=>evBg(m,'sailor','miner')))} ropes the crossing: everyone crosses safely, +60 XP for them.`,go:c=>{const m=evFind(m=>evBg(m,'sailor','miner'));evXP(m,60);return`<p>${evNm(m)} swims a rope over and ties a knot nobody else can name.</p>`}},
  {t:'Wait for the water to fall',d:'+14 hours on the bank.',go:c=>{evHours(14);return'<p>By morning the stones show again.</p>'}}]},
tollbar:{n:'A toll on the road',kind:['travel'],art:'road',cd:7,when:c=>c.day>=3?1.3:.4,
 text:c=>evP(`A bar of timber across the road and a dozen brigands behind it, crossbows on the wall of an old byre. "Road's ours. Toll's a crown a head. Each way."`),
 opts:[{t:'Pay the toll',d:c=>`−${Math.max(20,G.roster.length*12)} crowns (12 a head).`,go:c=>{evCrowns(-Math.max(20,G.roster.length*12));return'<p>They wave you through with a mocking bow.</p>'}},
  {t:'Take the bar down',d:c=>`A fight with brigands (a normal band). Win: +6 standing with ${evFacName(c.f)} for clearing the road.`,go:c=>{evFight('bandit',.85,'the toll men');evRep(c.f,6,'cleared a brigand toll');return'<p>Your sergeant draws first.</p>'}},
  {t:'Slip round through the fields',badge:'Scout',req:c=>evFol('scout')||!!evFind(m=>evBg(m,'hunter','poacher')),d:'+5 hours, nothing paid.',go:c=>{evHours(5);return'<p>Hedges, a sunken lane, and the road again a mile on.</p>'}}]},
refugees:{n:'Refugees',kind:['travel'],art:'road',cd:9,when:c=>c.t&&Array.isArray(c.t.sit)&&c.t.sit.some(s=>s&&(s.k==='raided'||s.k==='famine'||s.k==='siege'))?3:1,
 text:c=>evP(`A column of carts and families comes the other way, pots tied to the axles. They fled the country around ${evTownNm(c)}. Children stare at your banner.`),
 opts:[{t:'Share your food',req:c=>G.food>=10,d:c=>`−10 food, +4 renown, +6 standing with ${evFacName(c.f)}.`,go:c=>{evFood(-10);evRenown(4);evRep(c.f,6,'fed refugees');return'<p>Bread is broken. Somebody sings.</p>'}},
  {t:'Take on a volunteer',recruit:1,d:'−4 food. A farmhand joins (level 1), room permitting.',go:c=>{evFood(-4);evRecruit('farmhand',1);return'<p>A broad-shouldered lad climbs down from a cart and asks for a spear.</p>'}},
  {t:'Keep marching',d:c=>`25%: ${evPlain(c.m)} becomes Greedy (no shame in it, they say).`,go:c=>{if(evRoll(.25))evTrait(c.m,'greedy');return'<p>The column passes in silence.</p>'}}]},
knightfall:{n:'A knight in the ditch',kind:['travel'],art:'road',cd:14,when:c=>c.day>=4?.9:0,
 text:c=>evP(`A knight lies in the ditch, his horse dead beside him and an arrow through his thigh. He is still breathing. His sword is very fine.`),
 opts:[{t:'Tend his wound',joins:1,d:'50%: he lives and swears to the company (a level 3 hedge knight joins, room permitting). 50%: he dies thanking you and leaves you his sword (arming sword).',
   go:c=>{if(evRoll(.5)){if(evRecruit('hedgeknight',3))return'<p>"I owe you a life," he says, "and I always pay."</p>';evItem('arming');return'<p>He lives, but there is no place for him. He leaves you his sword in thanks.</p>'}evItem('arming');return'<p>He dies before the fire is lit, his hand on the hilt he gives you.</p>'}},
  {t:'Take his gear',d:c=>`+1 mail hauberk, +1 arming sword. −8 standing with ${evFacName(c.f)}. 40%: ${evPlain(c.m)} becomes Bloodthirsty.`,go:c=>{evItem('mail');evItem('arming');evRep(c.f,-8,'robbed a dying knight');if(evRoll(.4))evTrait(c.m,'bloodthirsty');return'<p>It is quick, and nobody talks about it afterwards.</p>'}},
  {t:'Ride on',d:'Nothing changes.',go:c=>'<p>Crows already circle.</p>'}]},
wolves:{n:'Wolves at dusk',kind:['travel'],art:'glade',cd:6,when:c=>['forest','snow','hills'].includes(c.biome)?1.6:.4,
 text:c=>evP(`Eyes in the treeline, a dozen pairs, keeping pace with the column. The wolves are hungry and the light is going.`),
 opts:[{t:'Hunt them first',badge:'Hunter',req:c=>!!evFind(m=>evBg(m,'hunter','poacher','wildling')||evTr(m,'beastwise')),d:c=>`${evPlain(evFind(m=>evBg(m,'hunter','poacher','wildling')||evTr(m,'beastwise')))} leads: +3 wolf pelts, +6 food, +60 XP for the hunter.`,
   go:c=>{const m=evFind(m=>evBg(m,'hunter','poacher','wildling')||evTr(m,'beastwise'));evPart('pelt',3);evFood(6);evXP(m,60);return`<p>${evNm(m)} takes the pack leader with the first arrow and the rest scatter.</p>`}},
  {t:'Stand and fight',d:'A fight with beasts (a weak pack). Pelts and meat if you win.',go:c=>{evFight('beast',.65,'the pack');return'<p>Shields up, backs to the wagons.</p>'}},
  {t:'Light fires and keep watch',d:'−3 tools (pitch and torches), +4 hours. The wolves keep their distance.',go:c=>{evTools(-3);evHours(4);return'<p>A ring of fire, and nobody sleeps.</p>'}}]},
shrine:{n:'A wayside shrine',kind:['travel'],art:'shrine',cd:10,when:c=>1,
 text:c=>evP(`A shrine of grey stone stands where two roads meet, older than either. A bowl at its foot holds old coins and dried flowers.`),
 opts:[{t:'Leave an offering',req:c=>G.crowns>=40,d:c=>`−40 crowns. 40%: ${evPlain(c.m)} becomes Lucky. 60%: a quiet heart (+5 hitpoints to everyone).`,go:c=>{evCrowns(-40);if(evRoll(.4))evTrait(c.m,'lucky');else evHealAll(5*G.roster.length);return'<p>The flowers are brushed aside and fresh coins laid down.</p>'}},
  {t:'Meditate here',badge:'Chi',req:c=>!!evAnyGift(c,'chi'),d:c=>`${evPlain(evAnyGift(c,'chi'))} +100 XP; the company rests (+10 hitpoints each), +3 hours.`,go:c=>{const m=evAnyGift(c,'chi');evXP(m,100);evHealAll(10*G.roster.length);evHours(3);return`<p>${evNm(m)} sits until the birds come back.</p>`}},
  {t:'Empty the bowl',d:c=>`+35 crowns. 50%: ${evPlain(c.m)} becomes Superstitious.`,go:c=>{evCrowns(35);if(evRoll(.5))evTrait(c.m,'superstitious');return'<p>The coins are green with age and spend just the same.</p>'}}]},
fever:{n:'Marsh fever',kind:['travel'],art:'marsh',cd:8,when:c=>c.biome==='swamp'?2.5:0,
 text:c=>evP(`The marsh air is thick and sweet. By noon ${evNm(c.m)} is shivering, and by evening two more are coughing.`),
 opts:[{t:'Brew a tincture',badge:'Apothecary or healer',req:c=>!!evFind(m=>evBg(m,'apothecary','hedge','monk')),d:'Nobody suffers. +1 salve from what is left.',go:c=>{evSalve(1);return'<p>Bitter bark, boiled twice. It works.</p>'}},
  {t:'Use salves',req:c=>(G.salve|0)>=2,d:'−2 salves. Nobody suffers.',go:c=>{evSalve(-2);return'<p>The fever breaks in the night.</p>'}},
  {t:'Push through it',d:c=>`${evPlain(c.m)} −20 hitpoints; two others −10 each. 30%: ${evPlain(c.m)} becomes Asthmatic.`,go:c=>{evHurt(c.m,20);G.roster.filter(m=>m!==c.m).slice(0,2).forEach(m=>evHurt(m,10));if(evRoll(.3))evTrait(c.m,'asthmatic');return'<p>They march wrapped in blankets.</p>'}}]},
pass:{n:'The high pass',kind:['travel'],art:'pass',cd:8,when:c=>c.biome==='snow'?2.5:c.biome==='hills'?.7:0,
 text:c=>evP(`Snow to the knee and the wind straight off the peaks. The pass is open, just, but a storm is building on the far side.`),
 opts:[{t:'Press on',d:'−6 food. 30%: one sword takes frostbite (an injury).',go:c=>{evFood(-6);if(evRoll(.3))evInj(pick(G.roster));return'<p>Heads down, one footprint into the next.</p>'}},
  {t:'Break the trail',badge:'Athletic',req:c=>!!evFind(m=>evTr(m,'athletic')||evTr(m,'tough')||evTr(m,'hulking')),d:c=>`${evPlain(evFind(m=>evTr(m,'athletic')||evTr(m,'tough')||evTr(m,'hulking')))} goes first: −2 food, +70 XP for them.`,go:c=>{const m=evFind(m=>evTr(m,'athletic')||evTr(m,'tough')||evTr(m,'hulking'));evFood(-2);evXP(m,70);return`<p>${evNm(m)} ploughs a road through the drifts.</p>`}},
  {t:'Shelter and wait',d:'+16 hours, −4 food.',go:c=>{evHours(16);evFood(-4);return'<p>A cave, a small fire and a long night.</p>'}}]},
oasis:{n:'Water in the dunes',kind:['travel'],art:'dunes',cd:8,when:c=>c.biome==='desert'?2.5:0,
 text:c=>evP(`Palms, and under them a pool, too blue to be true. The skins are nearly empty.`),
 opts:[{t:'Drink deep',d:'70%: clean water: +15 hitpoints each. 30%: foul: −10 hitpoints each.',go:c=>{const good=evRoll(.7);for(const m of G.roster)good?evHeal(m,15):evHurt(m,10);return good?'<p>Cold and sweet.</p>':'<p>It tastes of copper. Nobody keeps it down.</p>'}},
  {t:'Read the signs',badge:'Nomad',req:c=>!!evFind(m=>evBg(m,'nomad','caravan')),d:'Safe water and the herders\' cache: +10 food, +10 hitpoints each.',go:c=>{evFood(10);evHealAll(10*G.roster.length);return'<p>The well beneath the stones, and a cache of dates beside it.</p>'}},
  {t:'March on',d:'Nothing changes.',go:c=>'<p>Mirages lie.</p>'}]},
caravanhelp:{n:'A caravan beset',kind:['travel'],art:'wagon',cd:9,when:c=>c.day>=2?1:0,
 text:c=>evP(`Smoke ahead. A merchant caravan has circled its wagons and brigands ride round it, loosing arrows. The merchants' guards will not last long.`),
 opts:[{t:'Ride to the rescue',d:c=>`A fight with brigands. The merchants pay 120 crowns now; +8 standing with ${evFacName(c.f)}.`,go:c=>{evCrowns(120);evRep(c.f,8,'saved a caravan');evFight('bandit',.85,'the raiders');return'<p>"Take it, take it all, just drive them off!"</p>'}},
  {t:'Wait and pick over the wreck',d:c=>`+8 hours. +60 crowns, +5 tools. −10 standing with ${evFacName(c.f)}.`,go:c=>{evHours(8);evCrowns(60);evTools(5);evRep(c.f,-10,'looted a caravan');return'<p>By the time you come down, there is nobody left to object.</p>'}},
  {t:'Go round',d:'Nothing changes.',go:c=>'<p>Not your fight.</p>'}]},
gibbet:{n:'The crossroads gibbet',kind:['travel'],art:'gibbet',cd:12,when:c=>.8,
 text:c=>evP(`A man hangs in an iron cage at the crossroads, a week dead. A board at his feet says THIEF in three hands.`),
 opts:[{t:'Cut him down and bury him',badge:'Gravedigger or priest',req:c=>!!evFind(m=>evBg(m,'gravedigger','acolyte','flagellant')),d:c=>`+4 hours, +3 renown. 50%: someone Superstitious in the company gets over it (loses the trait).`,
   go:c=>{evHours(4);evRenown(3);const s=evFind(m=>evTr(m,'superstitious'));if(s&&evRoll(.5))evUntrait(s,'superstitious');return'<p>A shallow grave and a few words.</p>'}},
  {t:'Search the body',d:c=>`50%: +30 crowns sewn in his collar. 50%: nothing, and ${evPlain(c.m)} becomes Superstitious.`,go:c=>{if(evRoll(.5)){evCrowns(30);return'<p>Thieves keep a little by.</p>'}evTrait(c.m,'superstitious');return`<p>${evNm(c.m)} swears the cage turned to watch them go.</p>`}},
  {t:'Leave him',d:'Nothing changes.',go:c=>'<p>The chain creaks behind you for a long while.</p>'}]},
deserters:{n:'Men in the hedgerow',kind:['travel'],art:'road',cd:14,when:c=>evHouseF(c)?1:0,
 text:c=>evP(`Four men in the colours of ${evFacName(c.f)} hide in a hedgerow, their badges torn off. Deserters. They see your banner and step out, hands open.`),
 opts:[{t:'Take them on',recruit:1,d:c=>`Two deserters join (level 1, room permitting). −10 standing with ${evFacName(c.f)}.`,go:c=>{evRecruit('deserter',1);evRecruit('deserter',1);evRep(c.f,-10,'sheltered deserters');return'<p>"We fight. We just won\'t die for him."</p>'}},
  {t:'Hand them over',d:c=>`+15 standing with ${evFacName(c.f)}, +40 crowns of bounty.`,go:c=>{evRep(c.f,15,'handed over deserters');evCrowns(40);return'<p>The patrol pays in coin and nods.</p>'}},
  {t:'Let them go',d:'Nothing changes.',go:c=>'<p>They melt back into the hedge.</p>'}]},
royalhunt:{n:'A noble hunt',kind:['travel'],art:'glade',cd:12,when:c=>evHouseF(c)&&['forest','plains','hills'].includes(c.biome)?1:0,
 text:c=>evP(`Horns. A hunting party of ${evFacName(c.f)} crashes through the trees after a great stag, hounds baying. A young lord reins in and looks your company over.`),
 opts:[{t:'Join the hunt',badge:'Hunter',req:c=>!!evFind(m=>evBg(m,'hunter','poacher','noble')),d:c=>`+10 standing with ${evFacName(c.f)}, +6 food, +60 XP for ${evPlain(evFind(m=>evBg(m,'hunter','poacher','noble')))}.`,
   go:c=>{const m=evFind(m=>evBg(m,'hunter','poacher','noble'));evRep(c.f,10,'rode with the hunt');evFood(6);evXP(m,60);return`<p>${evNm(m)} brings down the stag and the lord laughs and gives you the haunch.</p>`}},
  {t:'Bow and stand aside',d:c=>`+3 standing with ${evFacName(c.f)}.`,go:c=>{evRep(c.f,3,'showed respect');return'<p>The lord touches his cap.</p>'}},
  {t:'Poach the stag first',d:c=>`+2 pelts, +10 food. −12 standing with ${evFacName(c.f)}.`,go:c=>{evPart('pelt',2);evFood(10);evRep(c.f,-12,'poached the lord\'s stag');return'<p>Venison tonight, and a very angry young lord.</p>'}}]},
roadtax:{n:'A patrol\'s road tax',kind:['travel'],art:'road',cd:8,when:c=>evHouseF(c)&&['cold','hostile','neutral'].includes(evTier(c.f))?(evTier(c.f)==='neutral'?.5:1.6):0,
 text:c=>evP(`Riders in ${evFacName(c.f)}'s colours bar the road. Their captain does not like sellswords on his lord's land. "There is a tax," he says, "for armed men."`),
 opts:[{t:'Pay the tax',d:c=>`−${Math.max(25,Math.round(G.crowns*.08))} crowns (8% of the chest), +5 standing.`,go:c=>{evCrowns(-Math.max(25,Math.round(G.crowns*.08)));evRep(c.f,5,'paid the road tax');return'<p>He writes you a receipt, which is something.</p>'}},
  {t:'Pull rank',badge:'Noble',req:c=>!!evFind(m=>evBg(m,'noble','knight','hedgeknight','squire')),d:c=>`${evPlain(evFind(m=>evBg(m,'noble','knight','hedgeknight','squire')))} speaks to him as an equal: nothing paid, +2 standing.`,go:c=>{evRep(c.f,2,'a gentleman\'s word');return'<p>The captain salutes, stiffly.</p>'}},
  {t:'Refuse',d:c=>`−10 standing with ${evFacName(c.f)}. 30%: they attack (a house patrol: brigand-strength band).`,go:c=>{evRep(c.f,-10,'refused the road tax');if(evRoll(.3)){evFight('bandit',.9,'the patrol');return'<p>He lowers his lance.</p>'}return'<p>He spits, and lets you pass.</p>'}}]},
riftglow:{n:'A light in the sky',kind:['travel','camp'],art:'rift',cd:10,when:c=>G.crisis||c.day>=(G.crisisDay||18)-5?1.8:c.day>=6?.3:0,
 text:c=>evP(`A violet seam hangs over the hills at night, thin as a hair. It hums. Shards of something like glass lie in the grass beneath it, cold to the touch.`),
 opts:[{t:'Study it',badge:'Mana',req:c=>!!evAnyGift(c,'mana'),d:c=>`${evPlain(evAnyGift(c,'mana'))} +150 XP. 25%: they see too much and become Superstitious.`,go:c=>{const m=evAnyGift(c,'mana');evXP(m,150);if(evRoll(.25))evTrait(m,'superstitious');return`<p>${evNm(m)} fills a whole notebook and does not sleep.</p>`}},
  {t:'Gather the shards',d:c=>`+1 void shard. 40%: ${evPlain(c.m)} is cut by one (an injury).`,go:c=>{evPart('voidshard',1);if(evRoll(.4))evInj(c.m);return'<p>The shards fight being picked up.</p>'}},
  {t:'Keep away',d:'Nothing changes.',go:c=>'<p>Nobody looks up for the rest of the night.</p>'}]},
crypt:{n:'An open crypt',kind:['travel'],art:'crypt',cd:12,when:c=>c.day>=3?.9:0,
 text:c=>evP(`A barrow door lies cracked open in the hillside, the seal broken from inside. Cold air breathes out of it, and the smell of old coins.`),
 opts:[{t:'Go in',d:'50%: grave goods: an old weapon or armor and +2 bone dust. 50%: the dead wake: a fight with the restless dead.',go:c=>{if(evRoll(.5)){evStashLoot('undead');evPart('bonedust',2);return'<p>Torches, a sarcophagus, and treasure under the dust.</p>'}evFight('undead',.85,'the barrow\'s dead');return'<p>Something in the dark sits up.</p>'}},
  {t:'Seal it again',badge:'Witch hunter or priest',req:c=>!!evFind(m=>evBg(m,'witchhunter','acolyte','flagellant','monk')),d:c=>`+5 renown, +8 standing with ${evFacName(c.f)}, +60 XP for ${evPlain(evFind(m=>evBg(m,'witchhunter','acolyte','flagellant','monk')))}.`,
   go:c=>{const m=evFind(m=>evBg(m,'witchhunter','acolyte','flagellant','monk'));evRenown(5);evRep(c.f,8,'sealed a crypt');evXP(m,60);return`<p>${evNm(m)} chalks the old signs back on the stone.</p>`}},
  {t:'Leave it',d:'Nothing changes.',go:c=>'<p>The wind follows you a little way.</p>'}]},
farmfire:{n:'A farm on fire',kind:['travel'],art:'farm',cd:10,when:c=>c.day>=2?1:0,
 text:c=>evP(`A farmstead burns beside the road. Raiders left an hour ago; their tracks are plain in the wet field. The farmer beats at the thatch with a sack.`),
 opts:[{t:'Fight the fire',joins:1,d:c=>`−3 tools, +6 standing with ${evFacName(c.f)}, +3 renown. 40%: the farmer's son joins (farmhand, level 1).`,go:c=>{evTools(-3);evRep(c.f,6,'saved a farm');evRenown(3);if(evRoll(.4))evRecruit('farmhand',1);return'<p>The barn is lost, the house is saved.</p>'}},
  {t:'Hunt the raiders',d:'A fight with brigands. Win: their loot (+80 crowns).',go:c=>{evCrowns(80);evFight('bandit',.8,'the raiders');return'<p>The tracks lead to a copse, and laughter.</p>'}},
  {t:'Pass by',d:'Nothing changes.',go:c=>'<p>The smoke follows you for an hour.</p>'}]},
oldsoldier:{n:'An old soldier',kind:['travel','town'],art:'road',cd:12,when:c=>.9,
 text:c=>evP(`An old soldier with one ear sits on a milestone, sharpening a sword he no longer needs. "I taught swordplay to a prince once," he says. "For a price I'll teach yours."`),
 opts:[{t:'Pay for a lesson',req:c=>G.crowns>=80,d:c=>`−80 crowns. ${evPlain(c.m)} +180 XP.`,go:c=>{evCrowns(-80);evXP(c.m,180);return`<p>A long afternoon, and ${evNm(c.m)} moves differently after it.</p>`}},
  {t:'Ask him to join',recruit:1,d:'60%: he signs on (a level 4 veteran, room permitting). 40%: he laughs at you.',go:c=>{if(evRoll(.6)&&evRecruit('veteran',4))return'<p>"One more war, then."</p>';return'<p>"I\'m too old to die for crowns."</p>'}},
  {t:'Share a pipe',d:c=>`${evPlain(c.m)} becomes Brave (40%).`,go:c=>{if(evRoll(.4))evTrait(c.m,'brave');return'<p>Old stories of old battles.</p>'}}]},
wagonwheel:{n:'A broken axle',kind:['travel'],art:'road',cd:6,when:c=>.8,
 text:c=>evP(`A crack like a crossbow, and the supply cart sits down in the road on one wheel. The axle is split through.`),
 opts:[{t:'Mend it',req:c=>(G.tools|0)>=5,d:'−5 tools, +2 hours.',go:c=>{evTools(-5);evHours(2);return'<p>Pegged and lashed. It will hold.</p>'}},
  {t:'Smith it properly',badge:'Blacksmith',req:c=>!!evFind(m=>evBg(m,'blacksmith','woodcutter')),d:c=>`−2 tools, +1 hour, +50 XP for ${evPlain(evFind(m=>evBg(m,'blacksmith','woodcutter')))}.`,go:c=>{const m=evFind(m=>evBg(m,'blacksmith','woodcutter'));evTools(-2);evHours(1);evXP(m,50);return`<p>${evNm(m)} makes a better axle than the cart ever had.</p>`}},
  {t:'Carry the load',d:'−6 food spilled, +4 hours.',go:c=>{evFood(-6);evHours(4);return'<p>Everyone carries a sack, and grumbles.</p>'}}]},
pilgrimsroad:{n:'Pilgrims on the road',kind:['travel'],art:'road',cd:12,when:c=>G.origin==='pilgrims'?1.6:.6,
 text:c=>evP(`A line of pilgrims in grey walks east toward the rift lands, singing. Their leader asks if your swords will walk with them a while.`),
 opts:[{t:'Walk with them',d:c=>`+4 hours. +6 standing with the free towns. ${evPlain(c.m)}: 40% loses a bad trait (Craven, Superstitious or Drunkard).`,go:c=>{evHours(4);evRep('free',6,'walked with pilgrims');if(evRoll(.4)){for(const k of ['craven','superstitious','drunkard'])if(evUntrait(c.m,k))break}return'<p>The hymns are simple and stay in the head.</p>'}},
  {t:'Ask for their blessing',req:c=>G.crowns>=30,d:'−30 crowns. +12 hitpoints each.',go:c=>{evCrowns(-30);evHealAll(12*G.roster.length);return'<p>Hands on heads, one by one.</p>'}},
  {t:'Wish them well',d:'Nothing changes.',go:c=>'<p>They sing on into the distance.</p>'}]},
strangestall:{n:'A strange merchant',kind:['travel','town'],art:'wagon',cd:16,when:c=>c.day>=8?.7:0,
 text:c=>evP(`A merchant in a hood sells from a black wagon pulled by nothing at all. "Rare things," he says, "for rare people. One piece, today only."`),
 opts:[{t:'Buy the blade',req:c=>G.crowns>=320,d:'−320 crowns, +1 war spear or arming sword (the best he has).',go:c=>{evCrowns(-320);evItem(ITEMS.warspear?'warspear':'arming');return'<p>It sings when it leaves the scabbard.</p>'}},
  {t:'Buy a shard',req:c=>G.crowns>=150,d:'−150 crowns, +1 void shard.',go:c=>{evCrowns(-150);evPart('voidshard',1);return'<p>Wrapped in black silk, and still cold through it.</p>'}},
  {t:'Ask where he is from',badge:'Qi',req:c=>!!evAnyGift(c,'qi'),d:c=>`${evPlain(evAnyGift(c,'qi'))} sees through him: +120 XP; he leaves a gift (+1 focus).`,go:c=>{const m=evAnyGift(c,'qi');evXP(m,120);evItem('focus');return'<p>He smiles with too many teeth and is gone, wagon and all.</p>'}},
  {t:'Move on',d:'Nothing changes.',go:c=>'<p>When you look back, the road is empty.</p>'}]},
lostchild:{n:'A lost child',kind:['travel'],art:'glade',cd:14,when:c=>.6,
 text:c=>evP(`A small girl sits on a stump by the road, quite dry-eyed. She says her village is "that way", and points at the whole forest.`),
 opts:[{t:'Take her home',d:c=>`+8 hours, +5 renown, +8 standing with ${evFacName(c.f)}.`,go:c=>{evHours(8);evRenown(5);evRep(c.f,8,'brought a child home');return'<p>Her mother weeps and her father shakes every hand twice.</p>'}},
  {t:'Track her village',badge:'Hunter',req:c=>!!evFind(m=>evBg(m,'hunter','poacher','wildling','nomad')),d:'+3 hours, +5 renown, the village gives +8 food.',go:c=>{evHours(3);evRenown(5);evFood(8);return'<p>Footprints, a broken fern, a smoke on the wind.</p>'}},
  {t:'Point her to the road',d:c=>`${evPlain(c.m)}: 30% becomes Craven (they cannot stop thinking of it).`,go:c=>{if(evRoll(.3))evTrait(c.m,'craven');return'<p>She waves as you march away.</p>'}}]},

/* ---------- camp ---------- */
tales:{n:'Tales by the fire',kind:['camp'],art:'camp',cd:5,when:c=>1.2,
 text:c=>evP(`The fire burns down to coals and ${evNm(c.m)} starts a story about a giant, a goat and a bishop. Somebody fetches the ale.`),
 opts:[{t:'Broach a cask',req:c=>G.crowns>=30,d:c=>`−30 crowns. +10 hitpoints each. ${evPlain(c.m)}: 40% becomes Loyal (or stops being Greedy).`,go:c=>{evCrowns(-30);evHealAll(10*G.roster.length);if(evRoll(.4)){if(!evUntrait(c.m,'greedy'))evTrait(c.m,'loyal')}return'<p>The bishop, it turns out, gets the goat.</p>'}},
  {t:'Early night',d:'+6 hitpoints each.',go:c=>{evHealAll(6*G.roster.length);return'<p>The story will keep.</p>'}}]},
brawl:{n:'A brawl in camp',kind:['camp'],art:'camp',cd:6,who:m=>evTr(m,'cocky')||evTr(m,'bloodthirsty')||evTr(m,'drunkard')||evBg(m,'pitfighter','brigand','wildling'),who2:(m,c)=>true,when:c=>1.3,
 text:c=>evP(`${evNm(c.m)} and ${evNm(c.m2)} are rolling in the ashes, fists flying, over a dice game or a woman or nothing at all. The company has made a ring.`),
 opts:[{t:'Let them settle it',d:c=>`50/50 who wins: the loser −15 hitpoints and 25% an injury; the winner +60 XP.`,go:c=>{const w=evRoll(.5)?c.m:c.m2,l=w===c.m?c.m2:c.m;evXP(w,60);evHurt(l,15);if(evRoll(.25))evInj(l);return`<p>${evNm(w)} stands over ${evNm(l)}, grinning through blood.</p>`}},
  {t:'Break it up',badge:'Brave',req:c=>!!evFind(m=>evTr(m,'brave')||evTr(m,'loyal')||evBg(m,'knight','veteran','squire'),[c.m,c.m2]),d:'Nobody is hurt.',go:c=>{return`<p>${evNm(evFind(m=>evTr(m,'brave')||evTr(m,'loyal')||evBg(m,'knight','veteran','squire'),[c.m,c.m2]))} hauls them apart by their collars.</p>`}},
  {t:'Dock their pay',d:c=>`+20 crowns. ${evPlain(c.m)}: 35% becomes Greedy.`,go:c=>{evCrowns(20);if(evRoll(.35))evTrait(c.m,'greedy');return'<p>The money goes in the chest, and the grudge goes on.</p>'}}]},
drunkraid:{n:'The cask is dry',kind:['camp','travel'],art:'wagon',cd:8,who:m=>evTr(m,'drunkard'),when:c=>2,
 text:c=>evP(`Somebody has been at the cargo. A cask of ale is empty, a crate of salt pork broken open, and ${evNm(c.m)} sleeps on top of it, smiling.`),
 opts:[{t:'Flog the drunkard',d:c=>`${evPlain(c.m)} −12 hitpoints. 50%: gives up drink (loses Drunkard). 30%: turns Craven instead.`,go:c=>{evHurt(c.m,12);const x=rnd();if(x<.5)evUntrait(c.m,'drunkard');else if(x<.8)evTrait(c.m,'craven');return'<p>The company watches in silence.</p>'}},
  {t:'Talk him dry',badge:'Loyal',req:c=>!!evFind(m=>evTr(m,'loyal')||evBg(m,'monk','acolyte'),[c.m]),d:c=>`${evPlain(c.m)} loses Drunkard (75%).`,go:c=>{if(evRoll(.75)){evUntrait(c.m,'drunkard');return'<p>A long talk by the fire, and a promise kept.</p>'}return'<p>He means it. For a week.</p>'}},
  {t:'Let it go',d:'−8 food.',go:c=>{evFood(-8);return'<p>"He fights better drunk anyway."</p>'}}]},
nightthief:{n:'A thief in the night',kind:['camp'],art:'camp',cd:9,when:c=>G.crowns>=100?1:.4,
 text:c=>evP(`Shouting from the wagons. A shadow runs for the trees with the strongbox under one arm.`),
 opts:[{t:'Run him down',badge:'Night owl',req:c=>!!evFind(m=>evTr(m,'nightowl')||evTr(m,'quick')||evBg(m,'hunter','poacher','thief')),d:'The box comes back, and his purse with it: +40 crowns.',go:c=>{evCrowns(40);return'<p>A tackle in the bracken.</p>'}},
  {t:'Loose after him',d:'50%: he drops the box (nothing lost). 50%: he gets away with 10% of the chest.',go:c=>{if(evRoll(.5))return'<p>An arrow in the pack and the box in the mud.</p>';evCrowns(-Math.round(G.crowns*.1));return'<p>Gone.</p>'}},
  {t:'Post better guards',d:'−15% of the chest stolen; from now on watches are doubled (+0, but nobody sleeps well: −5 hitpoints each).',go:c=>{evCrowns(-Math.round(G.crowns*.15));for(const m of G.roster)evHurt(m,5);return'<p>Lesson learned, expensively.</p>'}}]},
dice:{n:'Dice and bones',kind:['camp'],art:'camp',cd:6,who:m=>evTr(m,'greedy')||evBg(m,'thief','brigand','sailor','caravan'),when:c=>1.1,
 text:c=>evP(`${evNm(c.m)} runs a dice game on an upturned shield, and is winning. Too much, some say.`),
 opts:[{t:'Take the house cut',d:'60%: +60 crowns. 40%: a fight over loaded dice: two swords −10 hitpoints.',go:c=>{if(evRoll(.6)){evCrowns(60);return'<p>The company always wins.</p>'}G.roster.slice(0,2).forEach(m=>evHurt(m,10));return'<p>The dice were loaded. Everyone knew it.</p>'}},
  {t:'Check the dice',badge:'Lucky',req:c=>!!evFind(m=>evTr(m,'lucky')),d:c=>`${evPlain(evFind(m=>evTr(m,'lucky')))} plays them straight: +90 crowns.`,go:c=>{evCrowns(90);return'<p>Six, six, six. Nobody plays them again.</p>'}},
  {t:'Ban gambling',d:c=>`${evPlain(c.m)}: 50% becomes Greedy (or stays so).`,go:c=>{if(evRoll(.5))evTrait(c.m,'greedy');return'<p>Grumbling all night.</p>'}}]},
sick:{n:'A fever in camp',kind:['camp'],art:'camp',cd:7,when:c=>1,
 text:c=>evP(`${evNm(c.m)} has been sweating and shaking since noon, and now cannot keep down water.`),
 opts:[{t:'Use a salve',req:c=>(G.salve|0)>=1,d:c=>`−1 salve. ${evPlain(c.m)} is restored to full hitpoints.`,go:c=>{evSalve(-1);evHeal(c.m);return'<p>It breaks by morning.</p>'}},
  {t:'Sweat it out',d:c=>`${evPlain(c.m)}: hitpoints to half. 20%: becomes Asthmatic.`,go:c=>{evHurt(c.m,Math.floor(c.m.hp/2));if(evRoll(.2))evTrait(c.m,'asthmatic');return'<p>A long night under three blankets.</p>'}},
  {t:'Treat with herbs',badge:'Apothecary',req:c=>!!evFind(m=>evBg(m,'apothecary','monk','hedge'),[c.m])||evFol('herbalist')||evFol('surgeon'),d:c=>`${evPlain(c.m)} recovers, +2 tough days (25%: becomes Tough).`,go:c=>{evHeal(c.m);if(evRoll(.25))evTrait(c.m,'tough');return'<p>Willow bark and patience.</p>'}}]},
duel:{n:'A training duel',kind:['camp'],art:'camp',cd:5,who:m=>(m.lvl||1)>=3||evBg(m,'knight','veteran','sellsword','hedgeknight'),who2:(m,c)=>(m.lvl||1)<(c.m.lvl||1)||(m.lvl||1)<=2,when:c=>1.1,
 text:c=>evP(`${evNm(c.m)} offers to drill ${evNm(c.m2)} with live steel, "so the real thing is no surprise."`),
 opts:[{t:'Live steel',d:c=>`${evPlain(c.m2)} +150 XP, ${evPlain(c.m)} +40 XP. 20%: ${evPlain(c.m2)} is cut (an injury).`,go:c=>{evXP(c.m2,150);evXP(c.m,40);if(evRoll(.2))evInj(c.m2);return'<p>Sparks and swearing.</p>'}},
  {t:'Wooden swords',d:c=>`${evPlain(c.m2)} +70 XP.`,go:c=>{evXP(c.m2,70);return'<p>Bruises, but nothing worse.</p>'}}]},
greedyask:{n:'A man who knows his worth',kind:['camp','town'],art:'tavern',cd:12,who:m=>evTr(m,'greedy'),when:c=>1.5,
 text:c=>evP(`${evNm(c.m)} wants a bonus. "Others pay better. I hear things."`),
 opts:[{t:'Pay a bonus',req:c=>G.crowns>=100,d:c=>`−100 crowns. ${evPlain(c.m)} loses Greedy (60%).`,go:c=>{evCrowns(-100);if(evRoll(.6))evUntrait(c.m,'greedy');return'<p>A heavy purse and a light heart.</p>'}},
  {t:'Talk numbers',badge:'Paymaster',req:c=>evFol('paymaster')||!!evFind(m=>evBg(m,'noble','caravan'),[c.m]),d:c=>`${evPlain(c.m)} loses Greedy.`,go:c=>{evUntrait(c.m,'greedy');return'<p>A ledger, a slate and an hour. He sees reason.</p>'}},
  {t:'Refuse',d:c=>`40%: ${evPlain(c.m)} leaves the company.`,go:c=>{if(evRoll(.4)&&evLeave(c.m,'takes his pay and leaves'))return'<p>He is gone by dawn.</p>';return'<p>He sulks, but stays.</p>'}}]},
nightmare:{n:'Night terrors',kind:['camp'],art:'camp',cd:10,who:m=>evTr(m,'craven')||evTr(m,'superstitious'),when:c=>1.4,
 text:c=>evP(`${evNm(c.m)} wakes the camp screaming about something in the dark. Twice.`),
 opts:[{t:'Sit up with them',badge:'Brave',req:c=>!!evFind(m=>evTr(m,'brave')||evBg(m,'knight','monk','acolyte'),[c.m]),d:c=>`${evPlain(c.m)}: 60% loses Craven (or Superstitious).`,go:c=>{if(evRoll(.6)){if(!evUntrait(c.m,'craven'))evUntrait(c.m,'superstitious')}return'<p>Talk until dawn, and a hand on the shoulder.</p>'}},
  {t:'Give them drink',d:c=>`${evPlain(c.m)}: 50% becomes a Drunkard.`,go:c=>{if(evRoll(.5))evTrait(c.m,'drunkard');return'<p>It works, tonight.</p>'}},
  {t:'Send them away',d:c=>`${evPlain(c.m)} leaves the company.`,go:c=>{evLeave(c.m,'is sent away');return'<p>Better a gap in the line than a hole in it.</p>'}}]},
giftstir:{n:'A stirring gift',kind:['camp'],art:'rift',cd:14,who:m=>!!evGift(m)&&!evAwake(m),when:c=>1.2,
 text:c=>evP(`${evNm(c.m)} sits apart. Sparks run along their fingers and the fire leans toward them. The gift (${htmlEsc(RESN&&RESN[evGift(c.m)]||evGift(c.m))}) is waking.`),
 opts:[{t:'Let it come',d:c=>`${evPlain(c.m)} +200 XP. 25%: it burns (−20 hitpoints).`,go:c=>{evXP(c.m,200);if(evRoll(.25))evHurt(c.m,20);return'<p>A flash that leaves everyone blinking.</p>'}},
  {t:'Guide it',badge:'Monk',req:c=>!!evFind(m=>evBg(m,'monk','hedge','spellblade')||evAwake(m),[c.m]),d:c=>`${evPlain(c.m)} +250 XP, safely.`,go:c=>{evXP(c.m,250);return'<p>Slow breaths, and the sparks settle into a steady glow.</p>'}}]},
foraging:{n:'Foraging',kind:['camp'],art:'glade',cd:4,when:c=>['forest','plains','hills','swamp'].includes(c.biome)?1:.3,
 text:c=>evP(`The camp is near good country. A few hours with snares and a bow could fill the pot.`),
 opts:[{t:'Send the hunters',badge:'Hunter',req:c=>!!evFind(m=>evBg(m,'hunter','poacher','wildling','woodcutter','butcher')),d:'+3 hours. +12 food, +1 game meat.',go:c=>{evHours(3);evFood(12);evPart('meat',1);return'<p>A brace of hares and a young boar.</p>'}},
  {t:'Everyone forages',d:'+3 hours. +6 food. 20%: a bad mushroom (one sword −15 hitpoints).',go:c=>{evHours(3);evFood(6);if(evRoll(.2))evHurt(pick(G.roster),15);return'<p>Berries, roots, and a few things nobody can name.</p>'}},
  {t:'Rest instead',d:'Nothing changes.',go:c=>''}]},
letterhome:{n:'A letter from home',kind:['camp','town'],art:'tavern',cd:12,when:c=>.8,
 text:c=>evP(`A letter has caught up with ${evNm(c.m)}: the family farm is in debt, and the bailiff is at the door.`),
 opts:[{t:'Send money',req:c=>G.crowns>=80,d:c=>`−80 crowns. ${evPlain(c.m)} becomes Loyal.`,go:c=>{evCrowns(-80);evTrait(c.m,'loyal');return'<p>"I won\'t forget this."</p>'}},
  {t:'Give leave',d:c=>`${evPlain(c.m)} leaves for home (50%: returns in a few days a little wiser: kept, +100 XP).`,go:c=>{if(evRoll(.5)){evXP(c.m,100);return'<p>Back within the week, with a clear head.</p>'}evLeave(c.m,'goes home');return'<p>A handshake at the crossroads.</p>'}},
  {t:'Nothing to be done',d:c=>`${evPlain(c.m)}: 40% becomes Greedy.`,go:c=>{if(evRoll(.4))evTrait(c.m,'greedy');return'<p>The letter burns in the fire.</p>'}}]},
wanted:{n:'A face on a poster',kind:['camp','town'],art:'square',cd:15,who:m=>evBg(m,'deserter','brigand','thief','cultist'),when:c=>evHouseF(c)?1.2:0,
 text:c=>evP(`A notice nailed to a post shows a face very like ${evNm(c.m)}'s, and a price: ${evFacName(c.f)} wants them for old crimes.`),
 opts:[{t:'Shield them',d:c=>`−10 standing with ${evFacName(c.f)}. ${evPlain(c.m)} becomes Loyal.`,go:c=>{evRep(c.f,-10,'sheltered a wanted man');evTrait(c.m,'loyal');return'<p>The poster goes in the fire.</p>'}},
  {t:'Hand them over',d:c=>`${evPlain(c.m)} leaves the company. +15 standing with ${evFacName(c.f)}, +80 crowns bounty.`,go:c=>{if(evLeave(c.m,'is handed to the law')){evRep(c.f,15,'handed over a wanted man');evCrowns(80)}return'<p>The company is quiet that night.</p>'}},
  {t:'Pay off the bailiff',req:c=>G.crowns>=120,d:'−120 crowns. The matter is closed.',go:c=>{evCrowns(-120);return'<p>A bribe, a smile, a lost file.</p>'}}]},
starry:{n:'A clear night',kind:['camp'],art:'camp',cd:6,when:c=>c.night?1:.6,
 text:c=>evP(`No clouds, no wind. The stars are thick enough to read by, and the company lies on its backs naming them wrong.`),
 opts:[{t:'Let them rest',d:'+12 hitpoints each.',go:c=>{evHealAll(12*G.roster.length);return'<p>The best sleep in weeks.</p>'}},
  {t:'Night drills',d:c=>`Each sword +40 XP. ${evPlain(c.m)}: 30% becomes a Night owl.`,go:c=>{for(const m of G.roster)evXP(m,40);if(evRoll(.3))evTrait(c.m,'nightowl');return'<p>Shapes in the dark, steel in the starlight.</p>'}}]},
mending:{n:'Mending day',kind:['camp'],art:'camp',cd:6,when:c=>(G.tools|0)<10?1.2:.5,
 text:c=>evP(`The company's kit is in a sorry state: split straps, sprung rivets, a pot with a hole in it.`),
 opts:[{t:'Salvage from the cart',d:'+5 tools, −1 scrap iron if you have any.',go:c=>{if(partsHave('scrap')>0)evPart('scrap',-1);evTools(5);return'<p>Nothing wasted.</p>'}},
  {t:'Forge properly',badge:'Blacksmith',req:c=>!!evFind(m=>evBg(m,'blacksmith','miner')),d:'+10 tools, +4 hours.',go:c=>{evTools(10);evHours(4);return'<p>The anvil rings till dusk.</p>'}}]},

/* ---------- town ---------- */
pitchamp:{n:'The pit champion',kind:['town'],art:'tavern',cd:15,when:c=>c.t&&(c.t.size||1)>=2?1:.3,
 text:c=>evP(`In the back room of the tavern in ${evTownNm(c)}, a pit fighter has won nine bouts running. Now he wants real work.`),
 opts:[{t:'Hire him',recruit:1,req:c=>G.crowns>=220&&G.roster.length<MAXROSTER,why:'220 crowns and room',d:'−220 crowns. A level 3 pit fighter joins.',go:c=>{evCrowns(-220);evRecruit('pitfighter',3);return'<p>He cracks his knuckles and grins.</p>'}},
  {t:'Put up a fighter',d:c=>`${evPlain(c.m)} fights him. 45%: wins +120 crowns and becomes Cocky. 55%: loses: −20 hitpoints and an injury.`,go:c=>{if(evRoll(.45)){evCrowns(120);evTrait(c.m,'cocky');return'<p>The crowd goes wild.</p>'}evHurt(c.m,20);evInj(c.m);return'<p>Carried out on a door.</p>'}},
  {t:'Watch and drink',d:'−10 crowns.',go:c=>{evCrowns(-10);return'<p>A good night.</p>'}}]},
festival:{n:'A festival',kind:['town'],art:'square',cd:10,when:c=>c.t&&Array.isArray(c.t.sit)&&c.t.sit.some(s=>s&&s.k==='festival')?4:.5,
 text:c=>evP(`${evTownNm(c)} is in festival: ribbons, roast pig, and games on the green. The town's champion challenges all comers.`),
 opts:[{t:'Join the games',badge:'Quick',req:c=>!!evFind(m=>evTr(m,'quick')||evTr(m,'athletic')||evTr(m,'eagle')),d:c=>`${evPlain(evFind(m=>evTr(m,'quick')||evTr(m,'athletic')||evTr(m,'eagle')))} competes: 70% wins +100 crowns and +6 renown.`,go:c=>{if(evRoll(.7)){evCrowns(100);evRenown(6);return'<p>A wreath and a purse.</p>'}return'<p>Second place. No purse.</p>'}},
  {t:'Stand a round for the town',req:c=>G.crowns>=60,d:c=>`−60 crowns. +10 standing with ${evFacName(c.f)}, +10 hitpoints each.`,go:c=>{evCrowns(-60);evRep(c.f,10,'stood the town a round');evHealAll(10*G.roster.length);return'<p>Your health is drunk forty times.</p>'}},
  {t:'Enjoy it',d:'+5 hitpoints each.',go:c=>{evHealAll(5*G.roster.length);return''}}]},
tavernbrawl:{n:'Trouble at the tavern',kind:['town'],art:'tavern',cd:9,who:m=>evTr(m,'drunkard')||evTr(m,'cocky')||evBg(m,'pitfighter','brigand','wildling'),when:c=>1.3,
 text:c=>evP(`${evNm(c.m)} has broken a stool over a local's head, and the town watch is coming up the street.`),
 opts:[{t:'Pay the fine',req:c=>G.crowns>=60,d:'−60 crowns. Nothing else.',go:c=>{evCrowns(-60);return'<p>The watch captain pockets it with a sigh.</p>'}},
  {t:'Smooth it over',badge:'Noble',req:c=>!!evFind(m=>evBg(m,'noble','knight','caravan'),[c.m]),d:'Nothing paid.',go:c=>{return'<p>A word in the captain\'s ear, a reminder of who your friends are.</p>'}},
  {t:'Let the watch take him',d:c=>`${evPlain(c.m)} spends a night in the cells: −10 hitpoints, +12 hours. −5 standing with ${evFacName(c.f)}.`,go:c=>{evHurt(c.m,10);evHours(12);evRep(c.f,-5,'a tavern brawl');return'<p>Released at noon, sore and sorry.</p>'}}]},
witchtrial:{n:'A witch trial',kind:['town'],art:'square',cd:14,when:c=>c.t?1:0,
 text:c=>evP(`A crowd in the square of ${evTownNm(c)} has a young woman tied to a stake. "Witch!" they shout. She is very calm.`),
 opts:[{t:'Judge her yourself',badge:'Witch hunter',req:c=>!!evFind(m=>evBg(m,'witchhunter')),d:c=>`She is a hedge healer, not a witch: she goes free. +10 standing with ${evFacName(c.f)}, +5 renown.`,go:c=>{evRep(c.f,10,'a fair judgement');evRenown(5);return'<p>The witch hunter\'s word settles it.</p>'}},
  {t:'Cut her loose',joins:1,d:c=>`−12 standing with ${evFacName(c.f)}. She joins as a hedge mage (level 2, room permitting).`,go:c=>{evRep(c.f,-12,'freed a witch');evRecruit('hedge',2);return'<p>She walks out of town with you, chin high.</p>'}},
  {t:'Stay out of it',d:c=>`${evPlain(c.m)}: 30% becomes Craven.`,go:c=>{if(evRoll(.3))evTrait(c.m,'craven');return'<p>The smoke is seen for miles.</p>'}}]},
investor:{n:'A merchant\'s venture',kind:['town'],art:'square',cd:14,when:c=>c.t&&!evFlag('invest')&&G.crowns>=300?1:0,
 text:c=>evP(`A merchant of ${evTownNm(c)} is fitting out a caravan for the coast. He wants a partner: 200 crowns now, and a share when it returns.`),
 opts:[{t:'Invest 200 crowns',req:c=>G.crowns>=200,d:'−200 crowns. In 6 days or more, back in a town: 65% it returns 400 crowns; 35% it is lost.',go:c=>{evCrowns(-200);evSetFlag('invest',G.day);return'<p>A handshake and a sealed paper.</p>'}},
  {t:'Decline',d:'Nothing changes.',go:c=>''}]},
investret:{n:'The caravan returns',kind:['town'],art:'wagon',cd:0,when:c=>evFlag('invest')&&G.day-evFlag('invest')>=6?6:0,
 text:c=>evP(`Word reaches you in ${evTownNm(c)}: the merchant's caravan is back from the coast.`),
 opts:[{t:'Collect your share',d:'65%: +400 crowns. 35%: it was lost to raiders: nothing.',go:c=>{evSetFlag('invest',0);if(evRoll(.65)){evCrowns(400);return'<p>Silk and spices, sold at a fine profit.</p>'}return'<p>Half the wagons came back, all of them empty.</p>'}}]},
pickpocket:{n:'Light fingers',kind:['town'],art:'square',cd:8,when:c=>c.t&&(c.t.size||1)>=2?1:.5,
 text:c=>evP(`A boy bumps into ${evNm(c.m)} in the market crowd and is gone. So is a purse.`),
 opts:[{t:'Catch him',badge:'Cutpurse',req:c=>!!evFind(m=>evBg(m,'thief','beggar')||evTr(m,'quick')),d:'The purse comes back, and two others he had: +40 crowns.',go:c=>{evCrowns(40);return'<p>One thief knows another.</p>'}},
  {t:'Shrug it off',d:'−30 crowns.',go:c=>{evCrowns(-30);return'<p>Cities.</p>'}}]},
temple:{n:'Alms for the temple',kind:['town'],art:'shrine',cd:10,when:c=>c.t&&Array.isArray(c.t.bld)&&c.t.bld.includes('temple')?1.2:.4,
 text:c=>evP(`The priests of ${evTownNm(c)} beg alms for the sick ward. They promise prayers for the company.`),
 opts:[{t:'Give generously',req:c=>G.crowns>=100,d:c=>`−100 crowns. +8 standing with ${evFacName(c.f)}. Every sword's lightest wound is mended (one injury each, temporary only).`,
   go:c=>{evCrowns(-100);evRep(c.f,8,'alms to the temple');for(const m of G.roster){const j=(m.inj||[]).filter(j=>j.days>=0).sort((a,b)=>a.days-b.days)[0];if(j){m.inj=m.inj.filter(x=>x!==j);evLog(`${m.name}: ${INJ[j.id]?INJ[j.id].n.toLowerCase():'a wound'} mended`,'good')}}return'<p>Clean linen and practiced hands.</p>'}},
  {t:'A coin or two',d:'−10 crowns, +2 standing.',go:c=>{evCrowns(-10);evRep(c.f,2,'alms');return''}},
  {t:'Walk past',d:'Nothing changes.',go:c=>''}]},
guildwork:{n:'Work at the guild',kind:['town'],art:'square',cd:8,when:c=>c.t?.8:0,
 text:c=>evP(`The masons' guild of ${evTownNm(c)} needs strong backs for two days on the walls. They pay in coin and good meals.`),
 opts:[{t:'Hire out the company',d:c=>`+24 hours. +${40+G.roster.length*10} crowns, +10 food, +4 standing with ${evFacName(c.f)}.`,go:c=>{evHours(24);evCrowns(40+G.roster.length*10);evFood(10);evRep(c.f,4,'worked the walls');return'<p>Sore shoulders and full bellies.</p>'}},
  {t:'Not today',d:'Nothing changes.',go:c=>''}]},

/* ---------- origins ---------- */
oldlord:{n:'Old colours',kind:['travel'],art:'road',cd:12,when:c=>G.origin==='deserters'&&evFlag('fled')&&evHouse(evFlag('fled'))?2:0,
 text:c=>evP(`Riders in the colours of ${evFacName(evFlag('fled'))}, the house you ran from. Their sergeant knows your face. "The lord remembers his pay chest," he says.`),
 opts:[{t:'Pay blood money',req:c=>G.crowns>=200,d:c=>`−200 crowns. +20 standing with ${evFacName(evFlag('fled'))}.`,go:c=>{evCrowns(-200);evRep(evFlag('fled'),20,'paid blood money');return'<p>The sergeant weighs the purse and turns his horse.</p>'}},
  {t:'Cut your way out',d:c=>`A fight with the lord\'s riders (a strong band). +5 renown, −5 standing with ${evFacName(evFlag('fled'))}.`,go:c=>{evRenown(5);evRep(evFlag('fled'),-5,'fought their riders');evFight('bandit',1,'the lord\'s riders');return'<p>No more running.</p>'}},
  {t:'Scatter and meet later',d:'+10 hours.',go:c=>{evHours(10);return'<p>Old habits.</p>'}}]},
heirletter:{n:'A letter for the heir',kind:['camp','town'],art:'tavern',cd:15,who:m=>evLord(m),when:c=>G.origin==='noble'?2:0,
 text:c=>evP(`An old retainer of ${evNm(c.m)}'s family has found the company. He brings what he could save: a little silver, and the names of men who still remember the old banner.`),
 opts:[{t:'Take the silver',d:'+150 crowns.',go:c=>{evCrowns(150);return'<p>Spoons, a candlestick, a ring. Enough.</p>'}},
  {t:'Call the old loyalists',recruit:1,d:'+6 hours. A level 2 squire joins (room permitting).',go:c=>{evHours(6);evRecruit('squire',2,{trait:'loyal'});return'<p>One comes. One is enough.</p>'}},
  {t:'Send him home',d:c=>`${evPlain(c.m)} +60 XP.`,go:c=>{evXP(c.m,60);return'<p>"Tell them I am coming back."</p>'}}]},
leyline:{n:'A leyline node',kind:['travel','camp'],art:'shrine',cd:12,when:c=>G.origin==='academy'?1.6:G.roster.filter(m=>evAwake(m)).length>=2?.4:0,
 text:c=>evP(`The instruments sing: a leyline node lies under this hill, the kind the college sent you to chart. The air tastes of tin.`),
 opts:[{t:'Chart it',d:'+8 hours. Every sword with an awakened gift +80 XP.',go:c=>{evHours(8);for(const m of G.roster)if(evAwake(m))evXP(m,80);return'<p>Pages of numbers, and a map that finally makes sense.</p>'}},
  {t:'Draw on it',d:c=>`${evPlain(c.m)} +200 XP. 40%: it bites back (−25 hitpoints).`,go:c=>{evXP(c.m,200);if(evRoll(.4))evHurt(c.m,25);return'<p>Light pours up through the grass.</p>'}},
  {t:'Mark it and move on',d:'+1 renown.',go:c=>{evRenown(1);return''}}]},
bountyboard:{n:'A bounty on the board',kind:['town'],art:'square',cd:8,when:c=>G.origin==='beast'?2:.3,
 text:c=>evP(`The notice board of ${evTownNm(c)} is papered with monster bounties, and the clerk pays for proof: ears, fangs, hides.`),
 opts:[{t:'Sell pelts for bounty',req:c=>partsHave('pelt')>=2,d:'−2 wolf pelts, +90 crowns.',go:c=>{evPart('pelt',-2);evCrowns(90);return'<p>The clerk counts the ears twice.</p>'}},
  {t:'Ask about the big ones',d:c=>`+4 renown. ${evPlain(c.m)} +40 XP (stories, maps, tips).`,go:c=>{evRenown(4);evXP(c.m,40);return'<p>A wyvern, they say, in the far hills.</p>'}}]},
riftcall:{n:'The call of the rift',kind:['camp'],art:'rift',cd:10,when:c=>G.origin==='pilgrims'?1.8:0,
 text:c=>evP(`${evNm(c.m)} wakes from a dream of a door in the sky and cannot stop smiling. "It is close now," they whisper.`),
 opts:[{t:'Pray together',d:c=>`+4 hours. Everyone +30 XP; ${evPlain(c.m)}: loses Craven (or becomes Brave).`,go:c=>{evHours(4);for(const m of G.roster)evXP(m,30);if(!evUntrait(c.m,'craven'))evTrait(c.m,'brave');return'<p>A hymn without words.</p>'}},
  {t:'Calm them',d:c=>`${evPlain(c.m)}: 50% becomes Superstitious.`,go:c=>{if(evRoll(.5))evTrait(c.m,'superstitious');return''}}]},

/* ---------- after a battle ---------- */
spoils:{n:'Spoils of the field',kind:['after'],art:'field',cd:3,when:c=>1.4,
 text:c=>evP(`The field is quiet. The dead lie where they fell, with their gear.`),
 opts:[{t:'Strip the dead',d:c=>`+2 scrap iron. 50%: a piece of their gear for the stash.${c.foe&&FACT[c.foe]&&FACT[c.foe].loot&&FACT[c.foe].loot.length?'':' (They carried little.)'}`,go:c=>{evPart('scrap',2);if(evRoll(.5))evStashLoot(c.foe||'bandit');return'<p>Grim work, but iron is iron.</p>'}},
  {t:'Bury them',badge:'Gravedigger or priest',req:c=>!!evFind(m=>evBg(m,'gravedigger','acolyte','flagellant','monk')),d:'+4 hours, +6 renown. A Superstitious sword gets over it (loses the trait).',go:c=>{evHours(4);evRenown(6);const s=evFind(m=>evTr(m,'superstitious'));if(s)evUntrait(s,'superstitious');return'<p>Even foes deserve a grave.</p>'}},
  {t:'March on',d:'Nothing changes.',go:c=>''}]},
mercy:{n:'A plea for mercy',kind:['after'],art:'field',cd:6,when:c=>['bandit','orc','gob'].includes(c.foe)?1.5:0,
 text:c=>evP(`One of the foes lives, pinned under a dead comrade. ${c.foe==='bandit'?'"I can fight," he says. "I can fight for you."':'It raises empty hands.'}`),
 opts:[{t:'Spare and enlist',joins:1,d:c=>c.foe==='bandit'?'He joins as a brigand (level 2, room permitting). +2 renown.':'It flees. +2 renown.',go:c=>{evRenown(2);if(c.foe==='bandit')evRecruit('brigand',2);return'<p>A cut rope and a second chance.</p>'}},
  {t:'Finish it',d:c=>`${evPlain(c.m)}: 50% becomes Bloodthirsty.`,go:c=>{if(evRoll(.5))evTrait(c.m,'bloodthirsty');return'<p>Quick, at least.</p>'}},
  {t:'Question them',d:c=>`+2 hours. 60%: they tell of their stash: +70 crowns.`,go:c=>{evHours(2);if(evRoll(.6)){evCrowns(70);return'<p>Under the third oak, in a pot.</p>'}return'<p>Lies, all of it.</p>'}}]},
trophy:{n:'A trophy',kind:['after'],art:'field',cd:6,who:m=>evTr(m,'bloodthirsty')||evTr(m,'cocky')||evBg(m,'wildling','pitfighter','brigand'),when:c=>1.2,
 text:c=>evP(`${evNm(c.m)} wants to take a head for the banner pole. The others are not sure.`),
 opts:[{t:'Let them',d:c=>`+4 renown. ${evPlain(c.m)} becomes Cocky (or stays so). 30%: someone else becomes Superstitious.`,go:c=>{evRenown(4);evTrait(c.m,'cocky');if(evRoll(.3)&&c.m2)evTrait(c.m2,'superstitious');return'<p>The banner pole is heavier now.</p>'}},
  {t:'Forbid it',d:c=>`${evPlain(c.m)}: 40% becomes Loyal (respecting the order), 20% becomes Greedy.`,go:c=>{const x=rnd();if(x<.4)evTrait(c.m,'loyal');else if(x<.6)evTrait(c.m,'greedy');return'<p>A sharp word, obeyed.</p>'}}]},
shaken:{n:'After the fight',kind:['after'],art:'field',cd:5,who:m=>m.hp<evMaxHp(m)*.5,when:c=>1.3,
 text:c=>evP(`${evNm(c.m)} sits on a shield with shaking hands, staring at nothing. It was close.`),
 opts:[{t:'Words of encouragement',badge:'Brave',req:c=>!!evFind(m=>evTr(m,'brave')||evTr(m,'loyal')||evBg(m,'knight','veteran','acolyte','monk'),[c.m]),d:c=>`${evPlain(c.m)}: 60% becomes Brave.`,go:c=>{if(evRoll(.6))evTrait(c.m,'brave');return'<p>"You lived. That was the hard part."</p>'}},
  {t:'Leave them be',d:c=>`${evPlain(c.m)}: 35% becomes Craven; 25% becomes Brave.`,go:c=>{const x=rnd();if(x<.35)evTrait(c.m,'craven');else if(x<.6)evTrait(c.m,'brave');return'<p>Everyone deals with it differently.</p>'}},
  {t:'Rest them',d:c=>`${evPlain(c.m)} +20 hitpoints. +3 hours.`,go:c=>{evHeal(c.m,20);evHours(3);return''}}]},
beastparts:{n:'A careful butchering',kind:['after'],art:'glade',cd:4,when:c=>['beast','serpent','ent','ogre','wyvern'].includes(c.foe)?2:0,
 text:c=>evP(`The carcasses are still warm. With time and a good knife, there is more to take than the quick cuts.`),
 opts:[{t:'Take the time',badge:'Butcher',req:c=>!!evFind(m=>evBg(m,'butcher','hunter','poacher'))||evFol('herbalist'),d:c=>`+4 hours. +1 of the best part they carried, +4 food.`,go:c=>{evHours(4);const P={beast:'owlhide',serpent:'scale',ent:'sap',ogre:'ogrehide',wyvern:'wscale'}[c.foe]||'pelt';evPart(P,1);evFood(4);return'<p>Nothing wasted.</p>'}},
  {t:'Just the meat',d:'+6 food.',go:c=>{evFood(6);return''}}]},
looter:{n:'Looters',kind:['after'],art:'field',cd:6,when:c=>1,
 text:c=>evP(`Scavengers creep onto the field from the woods, filling sacks, before the company has even bound its wounds.`),
 opts:[{t:'Drive them off',d:'+40 crowns they had already taken.',go:c=>{evCrowns(40);return'<p>They scatter like crows.</p>'}},
  {t:'Sell them the leavings',d:'+25 crowns, +3 tools.',go:c=>{evCrowns(25);evTools(3);return'<p>Business is business.</p>'}}]}
});

/* ================= VIGNETTES =================
   evArtDraw(key, ctx) -> data URL of a EVW x EVH scene in PAL colours (cached per key and ground). Painted in code from a few
   reusable strokes (sky bands with dithered seams, ridges, trees, road, fire, buildings, figures). Never touches the game RNG. */
const EVART=new Map();
function evGrid(){const g=[];for(let y=0;y<EVH;y++)g.push(new Array(EVW).fill('0'));return g}
function evS(g,x,y,k){x=Math.round(x);y=Math.round(y);if(k&&k!=='.'&&x>=0&&y>=0&&x<EVW&&y<EVH)g[y][x]=k}
function evR(g,x0,y0,x1,y1,k){for(let y=Math.max(0,Math.round(y0));y<=Math.min(EVH-1,Math.round(y1));y++)for(let x=Math.max(0,Math.round(x0));x<=Math.min(EVW-1,Math.round(x1));x++)g[y][x]=k}
function evD(g,x0,y0,x1,y1,k,ph){for(let y=Math.max(0,y0);y<=Math.min(EVH-1,y1);y++)for(let x=Math.max(0,x0);x<=Math.min(EVW-1,x1);x++)if(((x+y+(ph|0))&1)===0)g[y][x]=k}
function evDs(g,x0,y0,x1,y1,k){for(let y=Math.max(0,y0);y<=Math.min(EVH-1,y1);y++)for(let x=Math.max(0,x0);x<=Math.min(EVW-1,x1);x++)if((x&1)===0&&(y&1)===0)g[y][x]=k}
// sky: bands [[y0,key],...] top to bottom, a dithered row at each seam
function evSky(g,B,y1){for(let i=0;i<B.length;i++){const y0=B[i][0],ye=i+1<B.length?B[i+1][0]-1:(y1==null?EVH-1:y1);evR(g,0,y0,EVW-1,ye,B[i][1]);if(i)evD(g,0,y0,EVW-1,y0,B[i-1][1]);if(i)evDs(g,0,y0+1,EVW-1,y0+2,B[i-1][1])}}
function evDisc(g,cx,cy,r,k,k2){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const d=x*x+y*y;if(d<=r*r)evS(g,cx+x,cy+y,k2&&d>(r-1.2)*(r-1.2)?k2:k)}}
function evGlow(g,cx,cy,r,k){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const d=Math.sqrt(x*x+y*y);if(d<=r&&((x+y)&1)===0&&d>r*.45)evS(g,cx+x,cy+y,k);else if(d<=r*.45&&d<=r)evS(g,cx+x,cy+y,k)}}
function evRidge(g,base,amp,f,k,ph,top){const H=new Array(EVW);for(let x=0;x<EVW;x++){const y=Math.round(base-amp*(.55*Math.sin(x*f+ph)+.3*Math.sin(x*f*2.3+ph*1.7)+.15*Math.sin(x*f*5.1+ph*2.9)));H[x]=y;for(let yy=y;yy<EVH;yy++)evS(g,x,yy,k);if(top)evS(g,x,y,top)}return H}
function evPeaks(g,base,k,kl,snow,pts){for(const [px0,h,w] of pts){for(let x=-w;x<=w;x++){const top=base-h+Math.abs(x)*h/w;for(let y=Math.round(top);y<=base;y++)evS(g,px0+x,y,x<0?kl:k);if(snow)for(let y=Math.round(top);y<Math.round(top)+Math.max(1,h/4-Math.abs(x)/3);y++)evS(g,px0+x,y,x<0?'r':'q')}}}
function evPine(g,x,yb,h,k,kl){evR(g,x,yb-2,x,yb,'a');for(let i=0;i<h;i++){const w=Math.floor((i+1)*.45);for(let dx=-w;dx<=w;dx++)evS(g,x+dx,yb-h-1+i,(dx<0&&kl&&(i%3)!==2)?kl:k)}}
function evOak(g,x,yb,r,k,kl,kt){evR(g,x,yb-r,x,yb,kt||'a');evDisc(g,x,yb-r-r*.6,r,k);for(let i=0;i<r;i++)evS(g,x-r+2+i,yb-r-r*.6-r+2+((i*7)%3),kl)}
function evStars(g,n,y1,r,keys){for(let i=0;i<n;i++){const x=Math.floor(r()*EVW),y=Math.floor(r()*y1);if(g[y][x]==='0'||g[y][x]==='1'||g[y][x]==='2'||g[y][x]==='G')evS(g,x,y,keys[i%keys.length])}}
function evFire(g,x,yb,s){s=s||1;evR(g,x-3*s,yb,x+3*s,yb,'i');evS(g,x-4*s,yb,'a');evS(g,x+4*s,yb,'a');for(let j=0;j<4*s;j++){const w=Math.max(0,Math.round((4*s-j)*.6));for(let dx=-w;dx<=w;dx++)evS(g,x+dx,yb-1-j,Math.abs(dx)>=w?'E':j<s*1.5&&Math.abs(dx)<w-1?'e':'y')}evS(g,x,yb-4*s-1,'E');evS(g,x+1,yb-4*s-2,'g')}
function evRoad(g,cx,yh,wt,wb,k,ke){for(let y=yh;y<EVH;y++){const t=(y-yh)/(EVH-1-yh),w=wt+(wb-wt)*t,c=cx+(1-t)*0;for(let x=Math.round(c-w);x<=Math.round(c+w);x++)evS(g,x,y,(x===Math.round(c-w)||x===Math.round(c+w))?ke:((y*3+x)%11===0?ke:k))}}
function evHouse(g,x,yb,w,h,wall,roof,rl,door){evR(g,x,yb-h,x+w,yb,wall);for(let i=0;i<=Math.ceil(w/2)+1;i++){evR(g,x-1+i,yb-h-i,x+w+1-i,yb-h-i,i===0?rl:roof)}evS(g,x+1,yb-h,'0');if(door){evR(g,x+Math.floor(w/2)-1,yb-3,x+Math.floor(w/2),yb,door)}evR(g,x+w-3,yb-h+2,x+w-2,yb-h+3,'d')}
function evMan(g,x,yb,k,kh){evR(g,x-1,yb-5,x+1,yb-2,k);evS(g,x-1,yb-1,k);evS(g,x+1,yb-1,k);evS(g,x,yb,k);evS(g,x-1,yb,k);evS(g,x+1,yb,k);evR(g,x-1,yb-8,x+1,yb-6,kh||k);evS(g,x,yb-9,kh||k)}
function evGrass(g,y0,y1,k,r,n){for(let i=0;i<n;i++){const x=Math.floor(r()*EVW),y=y0+Math.floor(r()*(y1-y0));evS(g,x,y,k);evS(g,x,y-1,k)}}
const EVGROUND={plains:['w','v','B'],forest:['3','7','w'],hills:['B','w','v'],swamp:['4','7','n'],desert:['b','c','k'],snow:['p','q','r'],ashen:['i','f','a'],hollow:['D','G','C'],glass:['4','5','6']};
function evGr(c){return EVGROUND[c&&c.biome]||EVGROUND.plains}
const EVSCENE={
 road(g,r,c){evSky(g,[[0,'G'],[8,'D'],[18,'f'],[26,'g'],[31,'h']],36);evDisc(g,62,36,7,'d','E');evR(g,0,37,EVW-1,EVH-1,'2');
  evRidge(g,36,4,.07,'D',1.3);evRidge(g,39,3,.11,'3',4);const G=evGr(c);evRidge(g,42,2,.05,G[0],2.2);evGrass(g,44,EVH,G[1],r,60);
  evRoad(g,58,42,1,26,'k','j');evR(g,40,40,40,49,'i');evR(g,37,41,43,42,'j');evS(g,44,42,'i');
  for(const [x,h] of [[8,14],[14,10],[20,16],[86,15],[93,11]])evPine(g,x,47+((x*3)%4),h,'1','2');evStars(g,10,10,r,['l','d'])},
 camp(g,r,c){evSky(g,[[0,'0'],[14,'1'],[26,'2']],34);evStars(g,26,24,r,['l','q','d']);evDisc(g,80,9,4,'l','m');evS(g,79,8,'r');
  for(let x=0;x<EVW;x+=5)evPine(g,x+((x*7)%3),36,8+((x*13)%7),'0');evR(g,0,36,EVW-1,EVH-1,'2');const G=evGr(c);evGrass(g,38,EVH,G[0],r,40);
  evGlow(g,50,49,15,'a');evGlow(g,50,49,9,'i');evFire(g,50,50,2);evR(g,40,52,46,53,'j');evR(g,54,53,61,54,'j');
  for(let i=0;i<10;i++){evR(g,18+i,38+10-i,30-i,38+10-i,i?'k':'j')}evR(g,23,44,25,48,'0');evMan(g,38,50,'0');evMan(g,63,51,'1','0')},
 shrine(g,r,c){evSky(g,[[0,'2'],[10,'3'],[22,'4'],[30,'n']],38);evDisc(g,22,14,5,'l','m');evRidge(g,40,4,.09,'3',2);evR(g,0,44,EVW-1,EVH-1,'7');evGrass(g,44,EVH,'5',r,70);
  const C=(x,h)=>{evR(g,x,46-h,x+4,46,'n');evR(g,x+3,46-h,x+4,46,'o');evR(g,x-1,46-h-2,x+5,46-h-1,'m')};C(30,20);C(62,24);C(46,9);
  evR(g,29,24,67,26,'m');evR(g,29,26,67,26,'o');evR(g,44,31,52,46,'4');evR(g,46,36,50,46,'0');evDisc(g,48,40,2,'c');evS(g,48,40,'e');
  for(let i=0;i<14;i++)evS(g,30+((i*5)%38),27+((i*3)%3),'5');evR(g,40,46,56,47,'n');evR(g,75,40,84,46,'m');evR(g,76,40,83,41,'n')},
 river(g,r,c){evSky(g,[[0,'X'],[12,'x'],[22,'F']],30);evDisc(g,18,9,4,'e','d');evRidge(g,30,5,.06,'7',.5);evRidge(g,34,3,.1,'w',2,'v');
  evR(g,0,38,EVW-1,EVH-1,'w');for(let y=38;y<EVH;y++){const a=34+(y-38)*.5,b=66+(y-38)*1.3;evR(g,a,y,b,y,(y%3===0)?'x':'X');if(y%2===0)evS(g,a+((y*7)%20),y,'F');evS(g,a,y,'j');evS(g,b,y,'j')}
  for(const [x,y] of [[44,44],[52,49],[47,54]]){evR(g,x,y,x+3,y+1,'n');evR(g,x,y,x+3,y,'q')}for(let x=0;x<EVW;x+=4)if(x<30||x>78)evS(g,x,39+((x*5)%3),'B');evPine(g,10,46,12,'3','7');evPine(g,88,48,14,'3','7')},
 square(g,r,c){evSky(g,[[0,'x'],[14,'F']],30);evR(g,0,42,EVW-1,EVH-1,'n');for(let y=43;y<EVH;y+=2)for(let x=(y%4)?0:2;x<EVW;x+=4)evS(g,x,y,'m');
  evHouse(g,2,42,18,16,'l','g','f','i');evHouse(g,26,42,14,20,'m','f','g','i');evHouse(g,62,42,16,18,'l','i','j','i');evHouse(g,82,42,14,14,'m','g','f','i');
  for(let x=0;x<EVW;x++){const y=24+Math.round(3*Math.sin(x*.16));if(x%3===0)evS(g,x,y+1,x%6?'y':'g');evS(g,x,y,'4')}
  evR(g,45,40,55,47,'o');evR(g,46,40,54,41,'p');evR(g,44,31,45,47,'i');evR(g,55,31,56,47,'i');evR(g,43,30,57,31,'g');evMan(g,36,52,'X','t');evMan(g,62,54,'g','t');evMan(g,70,50,'B','s')},
 field(g,r,c){evSky(g,[[0,'o'],[10,'n'],[20,'m']],32);for(let i=0;i<4;i++)evDisc(g,20+i*22,14+((i*5)%6),6+(i%3),'p');evRidge(g,32,3,.08,'4',1);const G=evGr(c);evR(g,0,36,EVW-1,EVH-1,'H');evGrass(g,36,EVH,'i',r,90);evGrass(g,40,EVH,G[0],r,30);
  evR(g,30,18,31,50,'i');for(let y=0;y<9;y++)evR(g,32,19+y,44-((y*y)%5)-(y>5?3:0),19+y,y%3?'g':'f');
  for(const [x,y] of [[52,50],[60,46],[70,53],[14,48]]){evR(g,x,y-8,x,y,'q');evR(g,x-2,y-6,x+2,y-6,'b')}
  for(const [x,y] of [[20,55],[46,56],[78,49]]){evR(g,x,y,x+6,y+1,'o');evS(g,x+6,y-1,'p')}
  for(const [x,y] of [[60,10],[66,8],[72,12]]){evS(g,x,y,'0');evS(g,x-1,y-1,'0');evS(g,x+1,y-1,'0')}},
 glade(g,r,c){evSky(g,[[0,'3'],[12,'7']],40);evR(g,0,0,EVW-1,10,'1');for(let x=0;x<EVW;x++)evR(g,x,10,x,10+Math.round(4+3*Math.sin(x*.3)+2*Math.sin(x*.71)),'1');
  for(let i=0;i<18;i++)evD(g,40+i,12+i*2,50+i,13+i*2,'d',i);evR(g,0,42,EVW-1,EVH-1,'w');evGrass(g,42,EVH,'v',r,90);evGrass(g,44,EVH,'A',r,20);
  for(const [x,w] of [[6,5],[22,4],[78,6],[92,4]]){evR(g,x,8,x+w,48,'i');evR(g,x,8,x,48,'a');evR(g,x+w-1,8,x+w-1,48,'j')}
  for(let i=0;i<20;i++){evS(g,(i*37)%EVW,(i*13)%9,'7');evS(g,(i*53)%EVW,6+(i*7)%5,'3')}evDisc(g,56,52,3,'g');evS(g,55,51,'h');evS(g,57,50,'r');evDisc(g,40,54,2,'c')},
 wagon(g,r,c){evSky(g,[[0,'b'],[10,'c'],[22,'d'],[30,'e']],36);evDisc(g,80,30,6,'e','r');evRidge(g,36,3,.07,'k',1);const G=evGr(c);evR(g,0,40,EVW-1,EVH-1,G[0]);evGrass(g,40,EVH,G[1],r,50);evR(g,0,46,EVW-1,52,'k');evR(g,0,46,EVW-1,46,'j');evR(g,0,52,EVW-1,52,'j');
  evR(g,28,34,66,44,'j');evR(g,28,34,66,35,'k');for(let x=28;x<=66;x++){const y=24+Math.round(4*Math.abs(Math.sin((x-28)/38*Math.PI))*-1)+4;evR(g,x,y,x,33,(x-28)%8<1?'m':'l')}
  for(const x of [34,58]){evDisc(g,x,46,5,'i','0');evDisc(g,x,46,1,'b');for(let a=0;a<4;a++)evS(g,x+Math.round(3*Math.cos(a*.8)),46+Math.round(3*Math.sin(a*.8)),'a')}
  evR(g,68,38,82,39,'i');evR(g,82,32,90,40,'j');evR(g,84,28,88,32,'j');evS(g,88,27,'j');evR(g,82,40,83,47,'j');evR(g,89,40,90,47,'j');evMan(g,20,50,'g','s')},
 tavern(g,r,c){evR(g,0,0,EVW-1,EVH-1,'i');for(let x=0;x<EVW;x+=9)evR(g,x,0,x,40,'a');evR(g,0,4,EVW-1,5,'a');evR(g,0,40,EVW-1,EVH-1,'j');for(let y=42;y<EVH;y+=4)evR(g,0,y,EVW-1,y,'i');
  evR(g,64,6,84,22,'1');evR(g,64,6,84,6,'a');evR(g,74,6,74,22,'a');evR(g,64,14,84,14,'a');evS(g,68,9,'l');evS(g,80,11,'q');evS(g,70,18,'d');
  evR(g,8,12,30,40,'o');evR(g,10,14,28,40,'p');evR(g,13,22,25,40,'0');evGlow(g,19,36,8,'c');evFire(g,19,39,2);evR(g,6,10,32,11,'n');
  evR(g,40,40,80,42,'k');evR(g,40,40,80,40,'d');evR(g,43,43,44,52,'i');evR(g,76,43,77,52,'i');for(const x of [48,58,70]){evR(g,x,36,x+3,39,'c');evR(g,x,36,x+3,36,'e');evS(g,x+4,37,'c')}
  evMan(g,52,52,'g','t');evMan(g,66,52,'X','s');evGlow(g,50,8,5,'d');evR(g,50,0,50,5,'0')},
 crypt(g,r,c){evSky(g,[[0,'0'],[16,'1'],[28,'2']],40);evStars(g,18,26,r,['n','l']);evDisc(g,20,10,5,'q','p');evDisc(g,22,9,4,'0');
  evRidge(g,34,9,.05,'3',1.8,'4');evR(g,36,26,64,52,'o');for(let i=0;i<14;i++)evR(g,36+i,26-i*.5,64-i,26-i*.5,'p');evR(g,40,30,60,52,'p');evR(g,44,34,56,52,'0');for(let y=34;y<52;y+=3)evR(g,42,y,43,y+1,'n');
  evR(g,0,50,EVW-1,EVH-1,'2');evD(g,0,48,EVW-1,EVH-1,'n',0);evDs(g,30,44,70,52,'q');evR(g,57,40,63,43,'n');for(const x of [12,82]){evR(g,x,40,x+4,50,'n');evR(g,x+1,38,x+3,39,'n');evR(g,x,44,x+4,44,'n')}},
 rift(g,r,c){evSky(g,[[0,'0'],[16,'1'],[30,'G']],40);evStars(g,24,34,r,['l','C','q']);
  const X=[];for(let y=2;y<=40;y++)X.push(50+Math.round(5*Math.sin(y*.31)+2*Math.sin(y*.83)+(y%7===0?2:0)));
  for(let y=2;y<=40;y++){const x=X[y-2],w=Math.round(9*Math.sin((y-2)/38*Math.PI))+2;evD(g,x-w-4,y,x+w+4,y,'D',y);evR(g,x-w+2,y,x+w-2,y,'D')}
  for(let y=2;y<=40;y++){const x=X[y-2],w=Math.max(0,Math.round(3*Math.sin((y-2)/38*Math.PI)));evR(g,x-w,y,x+w,y,'C');evS(g,x,y,'r');if(w>1)evS(g,x+1,y,'l')}
  for(const [x,y] of [[40,10],[63,14],[37,26],[66,30],[58,6]]){evS(g,x,y,'C');evS(g,x+1,y-1,'C')}
  evRidge(g,40,4,.08,'1',2.5,'D');evR(g,0,46,EVW-1,EVH-1,'1');evD(g,30,44,70,50,'G',0);for(let y=41;y<46;y++)evD(g,40,y,60,y,'D',y);
  for(const [x,y] of [[36,50],[60,52],[48,55],[70,49],[28,56]]){evS(g,x,y,'C');evS(g,x,y-1,'C');evS(g,x+1,y,'D');evS(g,x,y-2,'r');evS(g,x-1,y,'D')}evMan(g,22,54,'0','0');evMan(g,80,55,'0','0')},
 marsh(g,r,c){evSky(g,[[0,'4'],[12,'n'],[24,'m']],34);evR(g,0,34,EVW-1,EVH-1,'4');for(let y=36;y<EVH;y+=2)for(let x=(y*3)%7;x<EVW;x+=9)evR(g,x,y,x+3,y,'7');
  evDs(g,0,26,EVW-1,38,'l');for(const x of [16,70]){evR(g,x,16,x+2,40,'i');evR(g,x-6,22,x,23,'i');evR(g,x+2,19,x+8,20,'i');evS(g,x-6,21,'i');evS(g,x+8,18,'i')}
  for(let i=0;i<40;i++){const x=(i*29)%EVW,y=40+(i*11)%18;evR(g,x,y-4,x,y,i%3?'B':'w');if(i%5===0)evS(g,x,y-5,'k')}evDisc(g,50,46,1,'A');evDisc(g,62,42,1,'A')},
 pass(g,r,c){evSky(g,[[0,'X'],[10,'x'],[20,'F']],34);evPeaks(g,40,'p','q',1,[[20,30,22],[52,36,24],[84,28,20]]);evPeaks(g,48,'o','p',1,[[36,18,18],[72,16,16]]);
  evR(g,0,48,EVW-1,EVH-1,'q');evD(g,0,48,EVW-1,EVH-1,'r',0);evRoad(g,50,48,2,14,'p','o');for(let i=0;i<50;i++)evS(g,(i*41+7)%EVW,(i*23)%EVH,'r');evMan(g,46,54,'0','i');evMan(g,52,52,'0','i')},
 dunes(g,r,c){evSky(g,[[0,'c'],[10,'d'],[22,'e']],32);evDisc(g,22,12,6,'r','e');evRidge(g,36,5,.05,'k',1,'d');evRidge(g,42,4,.09,'c',3.2,'d');evRidge(g,50,3,.06,'b',.4,'c');
  for(let y=0;y<5;y++){const w=Math.round(12*Math.sqrt(1-(y/5)**2));evR(g,64-w,48+y,64+w,48+y,y===0?'F':y%2?'X':'x')}evR(g,52,47,76,47,'k');evS(g,58,50,'r');evS(g,69,49,'r');
  for(const [x,h] of [[60,18],[72,14]]){for(let i=0;i<h;i++)evS(g,x+Math.round(Math.sin(i*.2)*2),46-i,'j');const tx=x+Math.round(Math.sin(h*.2)*2),ty=46-h;for(let a=0;a<6;a++)for(let j=0;j<6;j++)evS(g,tx+Math.round(Math.cos(a*1.05)*j),ty+Math.round(Math.sin(a*1.05)*j*.6)+Math.floor(j*j/10),a%2?'B':'w')}},
 farm(g,r,c){evSky(g,[[0,'1'],[10,'f'],[22,'g'],[30,'E']],38);for(let i=0;i<5;i++)evDisc(g,42+i*7,22-i*4,5+i,i%2?'o':'4');evR(g,0,40,EVW-1,EVH-1,'a');for(let y=42;y<EVH;y+=3)evR(g,0,y,EVW-1,y,'b');
  evGlow(g,42,36,18,'f');evHouse(g,30,42,24,14,'j','i','a','0');for(let x=30;x<56;x+=2){const h=3+((x*7)%7);for(let j=0;j<h;j++)evS(g,x+((j%2)?1:0),27-j,j<2?'y':j<4?'E':'g')}evR(g,35,33,39,36,'y');evR(g,45,33,49,36,'E');evS(g,37,34,'e');
  evR(g,70,30,71,42,'i');evR(g,64,32,76,33,'i');evMan(g,64,52,'0');evR(g,8,36,10,42,'i')},
 gibbet(g,r,c){evSky(g,[[0,'2'],[12,'4'],[24,'n'],[32,'m']],40);evDisc(g,76,12,6,'l','m');evRidge(g,40,3,.07,'3',1);evR(g,0,44,EVW-1,EVH-1,'3');evRoad(g,30,44,3,20,'j','i');evR(g,0,52,EVW-1,54,'j');
  evR(g,52,10,54,52,'0');evR(g,40,10,70,12,'0');evR(g,62,12,66,16,'0');evR(g,44,12,44,18,'o');for(let y=18;y<=30;y++){evS(g,40,y,'o');evS(g,48,y,'o');if(y%4===2)evR(g,40,y,48,y,'o')}evR(g,43,20,45,28,'1');
  for(const [x,y] of [[66,8],[70,6],[32,14]]){evS(g,x,y,'0');evS(g,x-1,y-1,'0');evS(g,x+1,y-1,'0')}evR(g,14,36,15,52,'i');evR(g,10,38,20,40,'k')}
};
function evArtDraw(k,c){if(typeof document==='undefined')return'';if(typeof k==='string'&&k.indexOf('twist-')===0)k=EVTWISTART[k.slice(6)]||'wagon';const S=EVSCENE[k]?k:'road',gk=evGr(c).join(''),id=S+':'+gk;if(EVART.has(id))return EVART.get(id);
 const g=evGrid(),r=mulberry(ptHash?ptHash(id):7);try{EVSCENE[S](g,r,c||{})}catch(e){}
 // a frame of darkness at the edges (vignette)
 for(let x=0;x<EVW;x++){evS(g,x,0,'0');evS(g,x,EVH-1,'0')}for(let y=0;y<EVH;y++){evS(g,0,y,'0');evS(g,EVW-1,y,'0')}
 const rows=g.map(a=>a.join(''));let u='';try{const cv=px(rows);u=cv&&cv.toDataURL?cv.toDataURL():''}catch(e){u=''}if(typeof u!=='string')u='';EVART.set(id,u);return u}
