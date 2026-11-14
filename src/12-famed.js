/* ================= FAMED ITEMS =================
   A famed item is a registered ITEMS entry with id 'f:'+n built from a base item: {...ITEMS[base], famed:1, base, n, mods, price}.
   Its record lives in G.famed[id] = {base, n, mods, price, pw, from?, day?} (saved with the company) and registerFamed() rebuilds
   the ITEMS entry from the base item and the mods, so every path that reads ITEMS[id] (calc, equip rules, art, tests) works unchanged.
   makeFamed(baseId, power) rolls one with the game RNG (it is loot): 2 to 4 improvements drawn from FAMED_ROLL[kind] (what suits the
   item), each between its bounds, larger and more numerous with power (0..1, from the fight that dropped it).
   Famed items are never stocked by markets; they sell for FAMED_SELL of their price. Drops: see famedPlan() (used by resolveBattle). */
const FAMED_SELL=.6;
/* roll tables: [stat, lo, hi, weight, when(item)?]. Amounts are added to the base (fat and ap and rld are reductions).
   dmg is a share of the base damage (min and max both rise by that share, at least +1 / +2); arm too (at least +5). */
const FAMED_ROLL={
 melee:[['dmg',.06,.18,3],['ign',.05,.15,2,i=>i.ign<.9],['hit',3,10,2],['fat',1,4,1.5,i=>i.fat>2],['ap',1,1,.35,i=>i.ap>=4],
  ['stun',.05,.15,1.5,i=>i.wt==='mace'],['crush',.1,.3,1.5,i=>i.crush>0],['spell',.05,.2,2.5,i=>i.wt==='staff']],
 ranged:[['dmg',.06,.18,3],['ign',.05,.15,2,i=>i.ign<.9],['hit',3,10,2],['fat',1,4,1,i=>i.fat>2],['rng',1,1,.8,i=>i.rng<9],['rld',1,1,.6,i=>!!(i.reload&&i.reload.ap>2)]],
 shield:[['md',2,7,3],['rd',2,7,3],['fat',1,4,1.5,i=>i.fat>0],['hp',8,30,2]],
 armor:[['arm',.06,.18,3],['fat',1,4,2,i=>i.fat>0],['md',1,4,1,famedArmorDef],['rd',1,4,1,famedArmorDef]]
};
FAMED_ROLL.helm=FAMED_ROLL.armor;
const FAMED_STATN={dmg:'damage',ign:'through armor',hit:'to hit',fat:'fatigue',ap:'AP a swing',stun:'stun chance',crush:'armor crushing',spell:'spell damage',
 rng:'range',rld:'AP to reload',md:'melee defense',rd:'ranged defense',hp:'shield hitpoints',arm:'armor'};
/* names: "The <owner>'s <noun>" or "<epithet><role> <type>", by the kind of item; with flavour (where it was taken) */
const FAMED_OWNER=['Widow','Hangman','Ferryman','Old King','Wolf-Mother','Pilgrim','Saint','Drowned Man','Witch','Tinker','Marshal','Beggar-Prince','Red Abbot','Gravedigger','Bride','Huntsman'];
const FAMED_EPI=['Grave','Storm','Ember','Hollow','Iron','Dusk','Thorn','Frost','Ash','Bright','Wyrm','Raven','Oath','Blood','Moon','Sorrow'],
 FAMED_ROLE=['warden','bane','fang','fall','keeper','breaker','wake','born'];
const FAMED_NOUN={
 blade:['Bite','Kiss','Edge','Promise','Mercy','Whisper','Thorn','Last Word'],axe:['Hunger','Grudge','Harvest','Toll','Verdict','Feast','Due','Bargain'],
 blunt:['Knell','Sermon','Judgement','Lullaby','Reckoning','Argument','Answer','Blessing'],pole:['Reach','Vigil','Sting','Needle','Reprisal','Welcome','Spite','Patience'],
 bow:['Song','Sigh','Long Goodbye','Sorrow','Errand','Letter','Glance','Howl'],gun:['Thunder','Last Laugh','Temper','Oath','Bellow','Wrath','Salute','Retort'],
 staff:['Lantern','Wisdom','Riddle','Dream','Path','Memory','Secret','Burden'],shield:['Wall','Vow','Refuge','Shelter','Bulwark','Defiance','Gate','Keeping'],
 armor:['Shroud','Skin','Coat','Embrace','Mantle','Penance','Hide','Shell'],helm:['Crown','Brow','Watch','Visage','Hood','Dread','Gaze','Countenance']};
const FAMED_WT={sword:'blade',dagger:'blade',greatsword:'blade',axe:'axe',mace:'blunt',hammer:'blunt',spear:'pole',polearm:'pole',bow:'bow',crossbow:'bow',flintlock:'gun',staff:'staff'},
 FAMED_TYPE={sword:'Blade',dagger:'Dagger',greatsword:'Greatsword',axe:'Axe',mace:'Mace',hammer:'Hammer',spear:'Spear',polearm:'Glaive',bow:'Bow',crossbow:'Crossbow',flintlock:'Gun',staff:'Staff'};
function famedNameKind(it){return it.k==='s'?'shield':it.k==='a'?'armor':it.k==='h'?'helm':FAMED_WT[it.wt]||'blade'}
function famedTypeWord(it){if(it.k==='s')return/tower|pavise/.test(it.look||'')?'Wall':'Shield';if(it.k==='h')return'Helm';
 if(it.k==='a')return/robe|vest/.test((it.look||'')+' '+it.n.toLowerCase())?'Robes':it.arm<=95?'Jerkin':it.arm<=180?'Mail':'Plate';return FAMED_TYPE[it.wt]||'Blade'}
// every name the tables can make for this base item (the generator draws one of these)
function famedNameCount(it){return FAMED_OWNER.length*FAMED_NOUN[famedNameKind(it)].length+FAMED_EPI.length*FAMED_ROLE.length}
function famedName(it){if(rnd()<.5)return`The ${pick(FAMED_OWNER)}'s ${pick(FAMED_NOUN[famedNameKind(it)])}`;const r=pick(FAMED_ROLE);return`${pick(FAMED_EPI)}${r} ${famedTypeWord(it)}`}
function famedKind(it){return it.k==='s'?'shield':it.k==='a'?'armor':it.k==='h'?'helm':typeof isRangedW==='function'&&isRangedW(it)?'ranged':'melee'}
/* does calc() count md / rd on worn armor? (famed armor only rolls defense where the rules apply it) */
let FAMED_ADEF=null;
function famedArmorDef(){if(FAMED_ADEF!==null)return FAMED_ADEF;FAMED_ADEF=false;
 try{const k='__famedprobe';ITEMS[k]={k:'a',n:'',arm:1,fat:0,md:5,price:0};const m={base:{hp:50,fat:90,init:100,ms:50,rs:40,md:0,rd:0,brv:40},perks:[],eq:{w:null,b:null,s:null,a:k,h:null},inj:[]};
  FAMED_ADEF=calc(m).md===5;delete ITEMS[k]}catch(e){delete ITEMS.__famedprobe}return FAMED_ADEF}
function famedIsId(id){return typeof id==='string'&&id.slice(0,2)==='f:'}
function isFamed(id){const it=ITEMS[id];return!!(it&&it.famed)}
/* the ITEMS entry for a famed record: the base item, a fresh copy of its arrays, the mods applied */
function famedBuild(id,f){const B=ITEMS[f.base];if(!B||B.famed)return null;const it=Object.assign({},B);
 if(B.d)it.d=B.d.slice();if(B.reload)it.reload=Object.assign({},B.reload);if(B.spike)it.spike=B.spike.slice();if(B.sk)it.sk=B.sk.slice();
 const M=f.mods||{};
 if(M.d&&it.d){it.d=[it.d[0]+M.d[0],it.d[1]+M.d[1]]}
 if(M.ign)it.ign=Math.min(.95,(it.ign||0)+M.ign);if(M.hit)it.hit=(it.hit||0)+M.hit;if(M.fat)it.fat=Math.max(it.k==='w'?2:0,(it.fat||0)-M.fat);
 if(M.ap)it.ap=Math.max(2,it.ap-M.ap);if(M.stun)it.stun=(it.stun||0)+M.stun;if(M.crush)it.crush=(it.crush||0)+M.crush;if(M.spell)it.spell=(it.spell||0)+M.spell;
 if(M.rng)it.rng=(it.rng||1)+M.rng;if(M.rld&&it.reload)it.reload.ap=Math.max(2,it.reload.ap-M.rld);
 if(M.md)it.md=(it.md||0)+M.md;if(M.rd)it.rd=(it.rd||0)+M.rd;if(M.hp)it.hp=(it.hp||48)+M.hp;if(M.arm)it.arm=(it.arm||0)+M.arm;
 Object.assign(it,{famed:1,base:f.base,n:f.n,mods:M,price:f.price,tier:B.tier||1,look:B.look||f.base,from:f.from||null,day:f.day||null});delete it.uniq;return it}
/* registerFamed(map): puts every famed record of map into ITEMS (dropping records whose base is unknown) and removes stale famed
   entries that neither map nor the running company holds. Call it on load before anything reads ITEMS. Returns map. */
function registerFamed(map){if(!map||typeof map!=='object'||Array.isArray(map))map={};
 for(const id of Object.keys(map)){const f=map[id],it=famedIsId(id)&&f&&typeof f==='object'&&typeof f.n==='string'&&typeof f.price==='number'?famedBuild(id,f):null;if(it)ITEMS[id]=it;else delete map[id]}
 const live=typeof G!=='undefined'&&G&&G.famed&&typeof G.famed==='object'?G.famed:{};
 for(const id of Object.keys(ITEMS))if(famedIsId(id)&&!(id in map)&&!(id in live))delete ITEMS[id];
 return map}
/* makeFamed(baseId, power 0..1, o?{from, day}): rolls a famed item from the base (seeded), registers it in G.famed and ITEMS. Returns its id or null. */
function makeFamed(baseId,power,o){const B=ITEMS[baseId];if(!B||B.famed||!G)return null;if(!G.famed||typeof G.famed!=='object')G.famed=registerFamed({});
 const pw=clamp(typeof power==='number'&&isFinite(power)?power:.5,0,1),pool=famedPool(B,pw);
 const n=Math.min(pool.length,2+(rnd()<.25+.5*pw?1:0)+(rnd()<.35*pw?1:0)),mods={},picked=[];
 for(let k=0;k<n;k++){let tot=0;pool.forEach(r=>tot+=r[3]);let x=rnd()*tot,j=0;for(;j<pool.length-1;j++){x-=pool[j][3];if(x<=0)break}picked.push(pool.splice(j,1)[0])}
 for(const [s,lo,hi] of picked){const f=clamp(.15+.55*pw+.3*rnd(),0,1),v=lo+(hi-lo)*f;
  if(s==='dmg')mods.d=[Math.max(1,Math.round(B.d[0]*v)),Math.max(2,Math.round(B.d[1]*v))];
  else if(s==='arm')mods.arm=Math.max(5,Math.round(B.arm*v));
  else if(s==='ign'||s==='stun'||s==='crush'||s==='spell')mods[s]=Math.round(v*100)/100;
  else mods[s]=Math.round(v)}
 if(mods.fat&&B.k==='w')mods.fat=Math.min(mods.fat,B.fat-2);if(mods.fat&&B.k!=='w')mods.fat=Math.min(mods.fat,B.fat||0);if(!mods.fat)delete mods.fat;
 let name=famedName(B);for(let t=0;t<8&&Object.values(G.famed).some(f=>f.n===name);t++)name=famedName(B);
 let i=1;for(const id in G.famed){const v=+id.slice(2);if(v>=i)i=v+1}for(const id in ITEMS)if(famedIsId(id)){const v=+id.slice(2);if(v>=i&&!(id in G.famed))delete ITEMS[id]}
 const id='f:'+i,price=Math.max(B.price+300,Math.round(B.price*(1.5+.35*Object.keys(mods).length+pw)/10)*10);
 const rec={base:baseId,n:name,mods,price,pw:Math.round(pw*100)/100};if(o&&o.from)rec.from=String(o.from).slice(0,40);if(o&&o.day)rec.day=Math.floor(o.day);
 G.famed[id]=rec;ITEMS[id]=famedBuild(id,rec);return id}
// the rolls that suit base item B at power pw (AP -1 only from strong fights)
function famedPool(B,pw){return FAMED_ROLL[famedKind(B)].filter(r=>(!r[4]||r[4](B))&&(r[0]!=='ap'||pw>=.5))}
/* the improvements of famed item id, readable: [{k, t:'+6–9 damage'}] ([] for an ordinary item) */
function famedLines(id){const it=ITEMS[id];if(!it||!it.famed)return[];const M=it.mods||{},out=[],pc=v=>Math.round(v*100)+'%',add=(k,t)=>out.push({k,t});
 if(M.d)add('dmg',`+${M.d[0]}–${M.d[1]} damage`);if(M.ap)add('ap',`−${M.ap} AP a swing`);if(M.hit)add('hit',`+${M.hit} to hit`);if(M.ign)add('ign',`+${pc(M.ign)} through armor`);
 if(M.rng)add('rng',`+${M.rng} range`);if(M.rld)add('rld',`−${M.rld} AP to reload`);if(M.stun)add('stun',`+${pc(M.stun)} stun chance`);if(M.crush)add('crush',`+${pc(M.crush)} armor crushing`);
 if(M.spell)add('spell',`+${pc(M.spell)} spell damage`);if(M.arm)add('arm',`+${M.arm} ${it.k==='h'?'head ':''}armor`);if(M.md)add('md',`+${M.md} melee defense`);if(M.rd)add('rd',`+${M.rd} ranged defense`);
 if(M.hp)add('hp',`+${M.hp} shield hitpoints`);if(M.fat)add('fat',`−${M.fat} fatigue`);return out}
// one line of flavour: what it was made from and where it was taken
function famedFlavour(id){const it=ITEMS[id];if(!it||!it.famed)return'';const B=ITEMS[it.base];return`A famed ${B?B.n.toLowerCase():'piece'}${it.from?', taken from '+it.from:''}${it.day?' on day '+it.day:''}.`}
// the price a market pays for item id
function sellPrice(id){const it=ITEMS[id];if(!it)return 0;return Math.floor((it.price||0)*(it.famed?FAMED_SELL:.4))}
/* ---- drops ----
   famedPlan(en, o): en = the enemy units of a won battle, o = {day, rank (log2 of the faction's rank), f}.
   Returns {p (chance of one famed drop), power, sure:[{from, power}] (guaranteed: end-game kills: def.endgame / def.famed,
   bosses (def.boss), elite leaders (rank >= 2.75 and role boss))}. Nothing before FAMED_DAY or below the strength threshold. */
const FAMED_DAY=25,FAMED_MAXP=.25,FAMED_MAXN=3;
function famedPlan(en,o){o=o||{};const day=o.day||1,rk=Math.max(0,o.rank||0),xp=en.reduce((n,e)=>n+(e.def&&e.def.xp||0),0),L=clamp((day-FAMED_DAY)/40,0,1),S=clamp(rk/2.5,0,1);
 const out={p:0,power:clamp(.25+.4*L+.35*S,0,1),sure:[]};
 const tierEnd=F=>F&&(F.tier==='end'||F.tier==='late');
 for(const e of en){const d=e.def||{},dead=!e.alive&&!e.gone&&!e.fled;if(!dead)continue;
  const sure=d.endgame||d.famed||d.boss||(d.role==='boss'&&(e.rank||0)>=2.75)||(d.role==='boss'&&typeof FACT!=='undefined'&&tierEnd(FACT[e.f]));
  if(sure)for(let k=0;k<(typeof d.famed==='number'?d.famed:1);k++)out.sure.push({from:'the '+String(e.name||d.n||'foe').toLowerCase().replace(/^the /,''),power:clamp(Math.max(out.power,.6)+(d.endgame||d.boss?.2:0),0,1)})}
 if(out.sure.length>FAMED_MAXN)out.sure.length=FAMED_MAXN;
 if(day>=FAMED_DAY&&(rk>=1||xp>=1500))out.p=clamp(.03+.1*L+.08*S+xp/30000,0,FAMED_MAXP);
 return out}
/* the base item a drop is made from: tier 3 to 5 (higher with power), half the time of a kind the faction carries */
function famedBasePick(power,f){const minT=power>=.75?4:3,all=Object.keys(ITEMS).filter(k=>{const i=ITEMS[k];return!i.famed&&!i.uniq&&(i.tier||1)>=minT&&famedPool(i,power).length>=2});
 const L=typeof FACT!=='undefined'&&FACT[f]&&Array.isArray(FACT[f].loot)?FACT[f].loot.filter(id=>ITEMS[id]):[],kinds=L.map(id=>ITEMS[id].k==='w'?ITEMS[id].wt:ITEMS[id].k);
 const pref=all.filter(k=>{const i=ITEMS[k];return kinds.includes(i.k==='w'?i.wt:i.k)});return pick(pref.length&&rnd()<.5?pref:all)}
