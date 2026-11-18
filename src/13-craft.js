/* ================= MONSTER PARTS AND CRAFTING (camp) =================
   PARTS[key] = {n, d, tier 1..5, icon:'part-<key>'}: what the company strips from fallen beasts and monsters.
   PARTDROP[enKey] = [[partKey, chance], ...]: per dead enemy of that EN id; a chance above 1 is a sure count plus a chance of one more
   (1.5 = one, and half the time two). Bosses and great beasts carry larger numbers. (The herbalist's bonus is applied by resolveBattle.)
   G.parts = {key: count} (the company's stock, saved with G); G.salve = injury salves (used by field surgery in the camp screen);
   G.camp = {day, tr:{mercId: sessions today}, sg:{'mercId:injId': 1}} (the camp screen's daily limits, see 56-camp.js).
   partsDrop(result) -> [{key, n}] for the dead enemies of a won battle (game RNG). It only returns the list: resolveBattle (68-battle-flow.js)
   applies the herbalist and adds the parts to G.parts itself. It reads result.slain (EN keys of the dead foes), else a unit list, else B.
   RECIPES[id] = {n, d, parts:{key:n}, crowns, hours, out:{item:id}|{tools:n}|{food:n}|{salve:n}, cat}; craftCan(id) / craftWhy(id) /
   craftDo(id) (spends parts and crowns, passes the hours with advanceTime, puts the output in the stash or the stores).
   Crafted gear are static ITEMS entries registered below with craft:1 and uniq:1 (uniq keeps them off every market stall, out of
   loot tables and out of famed bases), a tier 3..5 and a look of their own. Only the RNG use is partsDrop(); crafting is deterministic. */
const PARTS={
 pelt:{n:'Wolf pelt',tier:1,d:'A grey direwolf hide, scraped and salted. Warm, tough, and easy to stitch.'},
 silk:{n:'Spider silk',tier:1,d:'A skein of webspinner silk. Stronger than any thread a weaver can spin.'},
 meat:{n:'Game meat',tier:1,d:'Fresh meat from a slain beast. Smoked over the fire it keeps the company fed.'},
 trinket:{n:'Goblin trinket',tier:1,d:'Beads, springs, bent wire and little bones. Goblins hoard clever bits of junk.'},
 bonedust:{n:'Bone dust',tier:1,d:'Grave dust from the restless dead. Bound with resin it sets like plaster over a wound.'},
 scrap:{n:'Scrap iron',tier:1,d:'Broken blades, rings and rivets. The smith can always use good iron.'},
 venom:{n:'Venom gland',tier:2,d:'A fat sac of poison, cut whole from a fang. Handle it with gloves.'},
 scale:{n:'Serpent scale',tier:2,d:'Green scales as broad as a thumb, smooth and hard as horn.'},
 tusk:{n:'Orc tusk',tier:2,d:'A yellowed tusk, still sharp. Orcs boast with them; smiths set them in iron.'},
 owlhide:{n:'Owlbear hide',tier:2,d:'Thick hide with a fringe of stiff feathers. It turns a blade better than boiled leather.'},
 sap:{n:'Ent sap',tier:2,d:'Amber sap that still moves when nobody looks at it. It closes cuts and wards the wood it came from.'},
 heartwood:{n:'Ent heartwood',tier:3,d:'The living core of an ent, ringed and faintly warm. Lighter than oak and harder than iron.'},
 ogrehide:{n:'Ogre hide',tier:3,d:'A slab of ogre skin a finger thick. Cured, it hangs like leather and stops like mail.'},
 ogrebone:{n:'Ogre bone',tier:3,d:'A thigh bone the length of a man\'s arm. Dense enough to forge around.'},
 voidshard:{n:'Void shard',tier:4,d:'A splinter of the rift, cold and violet. Metal folded around it never dulls.'},
 wscale:{n:'Wyvern scale',tier:5,d:'A rust-red wyvern scale. Arrows skid off it; only fire and patience shape it.'},
 wvenom:{n:'Wyvern venom',tier:5,d:'A vial of the wyvern\'s sting. A drop on a blade burns through the toughest hide.'},
 membrane:{n:'Wyvern membrane',tier:5,d:'Wing skin, thin as parchment and tough as sailcloth. Prized by armorers.'}
};
for(const k in PARTS)PARTS[k].icon='part-'+k;
const PARTORDER=Object.keys(PARTS);
const PARTDROP={
 gob:[['trinket',.35],['scrap',.1]],gobarch:[['trinket',.3],['venom',.08]],gobsham:[['trinket',1.2],['bonedust',.3]],
 skel:[['bonedust',.5],['scrap',.2]],zomb:[['bonedust',.35]],skelhal:[['bonedust',.5],['scrap',.25]],necro:[['bonedust',2],['voidshard',.1]],
 wolf:[['pelt',.55],['meat',.5]],spider:[['silk',.6],['venom',.25]],bear:[['owlhide',1.4],['meat',1.5]],
 orcy:[['tusk',.4],['scrap',.15]],orcw:[['tusk',.5],['scrap',.3]],obrute:[['tusk',.5],['scrap',.4]],orcl:[['tusk',2],['scrap',1]],
 thug:[['scrap',.3]],bmark:[['scrap',.2]],bknife:[['scrap',.2]],bxbow:[['scrap',.3]],braid:[['scrap',.35]],blead:[['scrap',1.2]],
 imp:[['voidshard',.3]],vknight:[['voidshard',.6],['scrap',.4]],vmage:[['voidshard',.8]],tyrant:[['voidshard',4]],
 adder:[['scale',.45],['venom',.3]],viper:[['scale',.35],['venom',.45]],gserp:[['scale',3],['venom',1.5],['meat',1]],
 thorn:[['sap',.4]],ent:[['heartwood',1],['sap',1.2]],elder:[['heartwood',3],['sap',2]],
 ogre:[['ogrehide',.8],['ogrebone',.6],['meat',.5]],aogre:[['ogrehide',.6],['ogrebone',.8],['scrap',1]],
 wyvern:[['wscale',4],['wvenom',2],['membrane',2]],whatch:[['wscale',.6],['membrane',.3],['wvenom',.25]]
};
function craftFollower(id){try{return typeof followerHas==='function'&&!!followerHas(id)}catch(e){return false}}
// the EN id of an enemy unit (its def), cached
const PART_ENK=new Map();
function partEnKey(u){if(!u)return null;if(typeof u==='string')return EN[u]?u:null;const d=u.def||u;if(typeof u.key==='string'&&EN[u.key])return u.key;if(typeof u.en==='string'&&EN[u.en])return u.en;
 if(PART_ENK.has(d))return PART_ENK.get(d);let k=null;for(const id in EN)if(EN[id]===d){k=id;break}if(k)PART_ENK.set(d,k);return k}
// the enemies a drop roll reads: a result's own list (en / enemies / units), else the battle on the board; strings are EN ids (all dead)
function partFoes(src){let L=null;if(Array.isArray(src))L=src;else if(src&&typeof src==='object')L=Array.isArray(src.slain)?src.slain:Array.isArray(src.en)?src.en:Array.isArray(src.enemies)?src.enemies:Array.isArray(src.foeUnits)?src.foeUnits:Array.isArray(src.units)?src.units:null;
 if(!L&&typeof B!=='undefined'&&B&&Array.isArray(B.units))L=B.units;
 return(L||[]).filter(u=>typeof u==='string'||(u&&(u.side===undefined||u.side===1)&&!u.alive&&!u.fled&&!u.gone&&!u.summoned&&!u.sum))}
/* partsDrop(result): the parts stripped from a won battle's dead foes -> [{key, n}] in PARTS order (empty for a loss or a flight).
   result: the battle result (resolveBattle), an array of enemy units / EN ids, or nothing (reads B). Uses the game RNG. */
function partsDrop(result){if(result&&typeof result==='object'&&!Array.isArray(result)&&(result.win===false||result.fled))return[];
 const got={},K=(typeof originK==='function'?originK('parts'):1)*(typeof runModK==='function'?runModK('parts',1):1);   // the Beast hunters origin: every chance x1.5 (17-events.js)
 for(const u of partFoes(result)){const k=partEnKey(u),T=k&&PARTDROP[k];if(!T)continue;
  for(const [p,ch] of T){if(!PARTS[p])continue;const c=ch*K;let n=Math.floor(c);const fr=c-n;if(fr>1e-9&&rnd()<fr)n++;if(n>0)got[p]=(got[p]||0)+n}}
 return PARTORDER.filter(p=>got[p]).map(p=>({key:p,n:got[p]}))}
// adds a drop list to G.parts (for callers other than resolveBattle, which adds its own); returns the list
function partsGain(list){if(!G)return[];craftRepair(G);for(const x of list||[])if(x&&PARTS[x.key]&&x.n>0)G.parts[x.key]=Math.min(999,(G.parts[x.key]||0)+Math.floor(x.n));return list||[]}
function partsHave(k){return G&&G.parts&&typeof G.parts[k]==='number'?G.parts[k]:0}
function partsTotal(){let n=0;if(G&&G.parts)for(const k in G.parts)n+=G.parts[k]||0;return n}
// who drops part k: [{en, n (name), ch (expected count per kill)}], best source first
function partSources(k){const out=[];for(const en in PARTDROP)for(const [p,ch] of PARTDROP[en])if(p===k&&EN[en])out.push({en,n:EN[en].n,ch});return out.sort((a,b)=>b.ch-a.ch||a.n.localeCompare(b.n))}
/* craftRepair(g): validates the camp fields of a company (old saves, hand edits). G.parts {key:int>0}, G.salve int (a fresh company carries 2),
   G.camp {day, tr, sg} reset when the day has turned. Returns g. */
function craftRepair(g){g=g||G;if(!g||typeof g!=='object')return g;
 const P=g.parts&&typeof g.parts==='object'&&!Array.isArray(g.parts)?g.parts:{},out={};
 for(const k in P){const v=Math.floor(+P[k]);if(PARTS[k]&&isFinite(v)&&v>0)out[k]=Math.min(999,v)}g.parts=out;
 g.salve=typeof g.salve==='number'&&isFinite(g.salve)?clamp(Math.floor(g.salve),0,999):2;
 const day=Math.floor(+g.day||1),c=g.camp&&typeof g.camp==='object'&&!Array.isArray(g.camp)?g.camp:null;
 if(!c||c.day!==day)g.camp={day,tr:{},sg:{}};
 else{const tr={},sg={};if(c.tr&&typeof c.tr==='object')for(const k in c.tr){const v=Math.floor(+c.tr[k]);if(isFinite(v)&&v>0)tr[k]=Math.min(9,v)}
  if(c.sg&&typeof c.sg==='object')for(const k in c.sg)if(c.sg[k])sg[k]=1;g.camp={day,tr,sg}}
 return g}

/* ---- crafted gear (registered into ITEMS) ----
   Stats sit beside the market gear of their tier: lighter, quicker, or with a twist the stalls do not offer (a stunning maul, a 4 AP war bow,
   a fast-loading crossbow, armor that adds defense). Prices are what they would be worth: they sell like any other piece. */
const CRAFT_ITEMS={
 fangknife:{k:'w',n:'Viper-fang knife',wt:'dagger',d:[26,38],ap:3,fat:4,rng:1,ign:.45,hit:5,price:520,tier:3},
 tuskspear:{k:'w',n:'Tuskspear',wt:'spear',d:[36,48],ap:4,fat:11,rng:1,ign:.35,hit:10,price:560,tier:3},
 silkbow:{k:'w',n:'Silkstring war bow',wt:'bow',two:1,d:[38,58],ap:4,fat:11,rng:7,ign:.3,price:1500,tier:4,shot:'arrow'},
 heartstave:{k:'w',n:'Heartwood stave',wt:'staff',two:1,d:[26,40],ap:4,fat:6,rng:1,ign:.25,hit:5,spell:.32,price:1300,tier:4},
 bonemaul:{k:'w',n:'Ogre-bone maul',wt:'hammer',two:1,d:[56,82],ap:6,fat:17,rng:1,ign:.5,crush:.8,stun:.15,price:1200,tier:4},
 sinewxbow:{k:'w',n:'Sinew crossbow',wt:'crossbow',two:1,d:[46,68],ap:4,fat:9,rng:7,ign:.5,hit:10,reload:{ap:3,fat:9},price:1500,tier:4,shot:'bolt'},
 tailglaive:{k:'w',n:'Wyvern-tail glaive',wt:'polearm',two:1,d:[58,82],ap:6,fat:15,rng:2,ign:.45,hit:5,price:2600,tier:5},
 voidgreat:{k:'w',n:'Voidglass greatsword',wt:'greatsword',two:1,d:[62,88],ap:6,fat:15,rng:2,ign:.4,hit:10,price:3000,tier:5},
 serpjerkin:{k:'a',n:'Serpent-hide jerkin',arm:105,fat:7,md:2,price:600,tier:3},
 owlcoat:{k:'a',n:'Owlbear-hide coat',arm:150,fat:15,price:900,tier:3},
 barkrobe:{k:'a',n:'Heartwood-warded robe',arm:110,fat:4,md:3,rd:3,price:1500,tier:4,robe:1},
 ogreharness:{k:'a',n:'Ogre-hide harness',arm:210,fat:21,price:1600,tier:4},
 wyvcuirass:{k:'a',n:'Wyvern-scale cuirass',arm:300,fat:30,rd:5,price:4800,tier:5},
 ogrehelm:{k:'h',n:'Ogre-skull helm',arm:122,fat:6,md:2,price:700,tier:3},
 tuskhelm:{k:'h',n:'Tusk-crowned barbute',arm:195,fat:11,md:2,price:1750,tier:4},
 wyvhelm:{k:'h',n:'Wyvern-crest helm',arm:255,fat:15,rd:3,price:3000,tier:5},
 serptarge:{k:'s',n:'Serpent-scale targe',md:12,rd:12,fat:3,hp:52,price:520,tier:3,look:'targe_serpent'},
 heartround:{k:'s',n:'Heartwood roundshield',md:20,rd:20,fat:7,hp:76,price:1400,tier:4,look:'round_heart'},
 wyvkite:{k:'s',n:'Wyvern-scale kite',md:24,rd:32,fat:12,hp:104,price:3200,tier:5,look:'kite_wyvern'}
};
(function(){const own={bonemaul:['batter','hsmash']};
 for(const id in CRAFT_ITEMS){if(ITEMS[id])continue;const it=Object.assign({},CRAFT_ITEMS[id],{craft:1,uniq:1});if(!it.look)it.look='craft_'+id;
  if(it.k==='w'){if(own[id]&&typeof WSKID==='object')WSKID[id]=own[id];it.sk=(typeof WSKID==='object'&&WSKID[id])||(typeof WSK==='object'&&WSK[it.wt])||[]}
  else if(it.k==='s')it.sk=it.spike?['shieldwall','spikebash']:['shieldwall','bash'];
  ITEMS[id]=it}})();
function isCrafted(id){const it=ITEMS[id];return!!(it&&it.craft)}

/* ---- recipes ----  cat: 'weapon' | 'armor' | 'helm' | 'shield' | 'supply' */
const RECIPES={
 fangknife:{n:'Viper-fang knife',d:'A serpent\'s fang set in a scaled grip, the venom channel left open.',parts:{venom:2,scale:1},crowns:60,hours:4,out:{item:'fangknife'}},
 tuskspear:{n:'Tuskspear',d:'An orc tusk bound to an ash shaft with iron bands.',parts:{tusk:3,scrap:1},crowns:50,hours:4,out:{item:'tuskspear'}},
 silkbow:{n:'Silkstring war bow',d:'Heartwood limbs strung with braided spider silk: a war bow that draws like a hunting bow.',parts:{silk:4,heartwood:1},crowns:150,hours:6,out:{item:'silkbow'}},
 heartstave:{n:'Heartwood stave',d:'A rod of ent heartwood sealed with its own sap. Gifts run through it like water.',parts:{heartwood:2,sap:2},crowns:120,hours:6,out:{item:'heartstave'}},
 bonemaul:{n:'Ogre-bone maul',d:'An ogre\'s thigh bone capped in iron. Lighter than a smith\'s maul, and it rings skulls.',parts:{ogrebone:3,ogrehide:1,scrap:2},crowns:150,hours:6,out:{item:'bonemaul'}},
 sinewxbow:{n:'Sinew crossbow',d:'Owlbear sinew and silk on a goblin-sprung lock: it spans in half the time.',parts:{owlhide:2,silk:2,trinket:2,scrap:1},crowns:160,hours:6,out:{item:'sinewxbow'}},
 tailglaive:{n:'Wyvern-tail glaive',d:'The barbed tail of a wyvern on a long haft, its sting still wet.',parts:{wvenom:2,wscale:1,ogrebone:1,scrap:2},crowns:300,hours:8,out:{item:'tailglaive'}},
 voidgreat:{n:'Voidglass greatsword',d:'Iron folded around void shards: a long blade that never dulls and weighs less than it should.',parts:{voidshard:4,scrap:3},crowns:400,hours:8,out:{item:'voidgreat'}},
 serpjerkin:{n:'Serpent-hide jerkin',d:'Overlapping serpent scales on a pelt lining: light, and blows slide off it.',parts:{scale:4,pelt:1},crowns:60,hours:5,out:{item:'serpjerkin'}},
 owlcoat:{n:'Owlbear-hide coat',d:'A long coat of owlbear hide with a feathered collar, as stout as mail.',parts:{owlhide:3,pelt:2},crowns:90,hours:6,out:{item:'owlcoat'}},
 barkrobe:{n:'Heartwood-warded robe',d:'A silk robe sewn with heartwood plates and sealed in sap. A caster\'s armor.',parts:{heartwood:1,sap:2,silk:3},crowns:150,hours:6,out:{item:'barkrobe'}},
 ogreharness:{n:'Ogre-hide harness',d:'Layered ogre hide riveted over bone plates. Heavy armor without the weight of steel.',parts:{ogrehide:4,ogrebone:1,scrap:2},crowns:180,hours:8,out:{item:'ogreharness'}},
 wyvcuirass:{n:'Wyvern-scale cuirass',d:'Wyvern scales riveted over membrane: plate\'s protection, lighter, and arrows skid off it.',parts:{wscale:5,membrane:1,scrap:4},crowns:500,hours:10,out:{item:'wyvcuirass'}},
 ogrehelm:{n:'Ogre-skull helm',d:'The crown of an ogre\'s skull lined with hide. Ugly, thick, and it scares the green ones.',parts:{ogrebone:2,ogrehide:1},crowns:70,hours:4,out:{item:'ogrehelm'}},
 tuskhelm:{n:'Tusk-crowned barbute',d:'A barbute ringed with orc tusks: it turns glancing blows aside.',parts:{tusk:4,scrap:3},crowns:160,hours:5,out:{item:'tuskhelm'}},
 wyvhelm:{n:'Wyvern-crest helm',d:'A wyvern-scale helm with a membrane crest, light for its strength.',parts:{wscale:2,membrane:1,scrap:2},crowns:300,hours:6,out:{item:'wyvhelm'}},
 serptarge:{n:'Serpent-scale targe',d:'A small round of scales on pelt: very light, and as good against arrows as blades.',parts:{scale:3,pelt:1},crowns:60,hours:4,out:{item:'serptarge'}},
 heartround:{n:'Heartwood roundshield',d:'A roundshield of ent heartwood with an amber boss. Light, and it closes its own splits.',parts:{heartwood:2,sap:1,scrap:1},crowns:150,hours:6,out:{item:'heartround'}},
 wyvkite:{n:'Wyvern-scale kite',d:'A kite shield faced with wyvern scale and edged in hide. Nothing gets through it.',parts:{wscale:3,ogrehide:1,scrap:2},crowns:350,hours:8,out:{item:'wyvkite'}},
 tools:{n:'Forge tools',d:'Hammer scrap iron into rivets, rings and patches: tools to mend armor.',parts:{scrap:2},crowns:0,hours:2,out:{tools:6}},
 rations:{n:'Smoke game',d:'Smoke the meat of the hunt over the fire: rations for the road.',parts:{meat:2},crowns:0,hours:2,out:{food:12}},
 bandage:{n:'Silk bandages',d:'Spider silk boiled clean and rolled: it binds a wound tight and keeps it clean.',parts:{silk:2},crowns:5,hours:1,out:{salve:2}},
 poultice:{n:'Sap poultice',d:'Ent sap worked into moss. It closes cuts in a night.',parts:{sap:1},crowns:5,hours:1,out:{salve:2}},
 plaster:{n:'Bone-dust plaster',d:'Grave dust and goblin herbs bound into a plaster that sets over a wound.',parts:{bonedust:2,trinket:1},crowns:10,hours:1,out:{salve:1}}
};
for(const id in RECIPES){const R=RECIPES[id],it=R.out.item&&ITEMS[R.out.item];R.cat=it?(it.k==='w'?'weapon':it.k==='a'?'armor':it.k==='h'?'helm':'shield'):'supply'}
const RECIPECAT=[['weapon','Weapons'],['armor','Body armor'],['helm','Helmets'],['shield','Shields'],['supply','Supplies']];
// what a recipe makes, in words: "Viper-fang knife" | "6 tools" | "12 rations" | "2 salves"
function recipeOut(id){const R=RECIPES[id];if(!R)return'';const o=R.out;if(o.item)return ITEMS[o.item]?ITEMS[o.item].n:o.item;
 if(o.tools)return o.tools+' tool'+(o.tools===1?'':'s');if(o.food)return o.food+' rations';if(o.salve)return o.salve+' salve'+(o.salve===1?'':'s');return''}
// the parts a recipe still lacks: [{key, n (needed), have}]
function craftMissing(id){const R=RECIPES[id];if(!R)return[];return Object.keys(R.parts).map(k=>({key:k,n:R.parts[k],have:partsHave(k)})).filter(x=>x.have<x.n)}
// why recipe id cannot be made now ('' = it can)
function craftWhy(id){const R=RECIPES[id];if(!R)return'Unknown recipe';if(!G)return'No company';
 const miss=craftMissing(id);if(miss.length)return'Missing '+miss.map(x=>(x.n-x.have)+' '+(PARTS[x.key]?PARTS[x.key].n.toLowerCase():x.key)).join(', ');
 if((G.crowns||0)<R.crowns)return'Not enough crowns';return''}
function craftCan(id){return!craftWhy(id)}
/* craftDo(id): spends the parts and crowns, passes the hours (advanceTime), adds the output.
   Returns {id, out:{item?|tools?|food?|salve?}, hours, crowns, parts} or false (nothing changes) when it cannot be made. */
function craftDo(id){if(!G||!craftCan(id))return false;craftRepair(G);const R=RECIPES[id];
 for(const k in R.parts){G.parts[k]-=R.parts[k];if(G.parts[k]<=0)delete G.parts[k]}G.crowns-=R.crowns;
 const o=R.out;if(o.item)G.stash.push(o.item);if(o.tools)G.tools=(typeof G.tools==='number'&&isFinite(G.tools)?Math.max(0,Math.floor(G.tools)):0)+o.tools;
 if(o.food)G.food=(G.food||0)+o.food;if(o.salve)G.salve+=o.salve;
 if(R.hours>0&&typeof advanceTime==='function')advanceTime(R.hours);
 return{id,out:Object.assign({},o),hours:R.hours,crowns:R.crowns,parts:Object.assign({},R.parts)}}

/* ---- icons: parts, crafted gear, camp glyphs (16x16, PAL keys, 1px '0' outline) ----
   Parts are drawn here; each crafted item draws over its family's icon from the art set in its own materials (bone, tusk, scale,
   heartwood, wyvern hide, voidglass) so no two share a look. Registered into ICONS (06-icons.js) with their CSS rule (icCss). */
const CRAFT_ICSRC={
 'part-pelt':['................','......p..p......','......pqqp......','......qJJq......','..pp..JJJJ..pp..','...pqJJooJJqp...','....JJJooJJJ....','....JJJooJJJ....','....JJJooJJJ....','....JJJooJJJ....','...pqJJooJJqp...','..pp.JJJJJJ.pp..','......JJJJ......','.......JJ.......','........J.......','................'],
 'part-silk':['................','.......l........','......lrl.......','.....lrrll......','....lrlllml.....','...lrllmllmm....','...rllmlllmm....','...lllmllmmn....','...llmlllmmn....','....lmllmmn.....','.....mmmmn......','......nn.l......','..........l.....','...........l....','............l...','................'],
 'part-meat':['................','................','......hhh.......','.....hhggg......','....hrhgggf.....','....hhggggf.....','....hgggggf.....','....ggggggf.....','....gggggff.....','.....gggff......','......fffl......','.........ll.....','........lrlm....','.........lm.....','................','................'],
 'part-trinket':['................','...c.......c....','...b.......b....','....h.....x.....','....c.....c.....','.....g...A......','......ccc.......','......lll.......','.....lllll......','.....l0l0m......','.....lllmm......','......lmm.......','......m.m.......','................','................','................'],
 'part-bonedust':['................','.......j........','......jkj.......','.......j........','.....kkkkj......','....kkkkkkj.....','....kkjkkkj.....','...kkkkkkkji....','...kkkkkkjji....','...jkkkkjjji....','....jjjjjii.lm..','.....iiii.lllmm.','.........lmmmm..','................','................','................'],
 'part-scrap':['................','................','....qqq.........','...qrqqp........','...qqqppp..qq...','....pqppo..qpp..','.....ppo...ppo..','..qqq.......qo..','.qrqqpp.........','.qqppppoo..pp...','..ppoqooo..qpo..','...ooo......po..','................','................','................','................'],
 'part-venom':['................','.......kj.......','.......j........','.....hhgg.......','....hrhggg......','...hhhgggggf....','...hggggggff....','...gggggggff....','...ggggggfff....','....gggfff......','.....ffff.......','.......A........','......AAB.......','......ABB.......','.......B........','................'],
 'part-scale':['................','.......A........','......AvA.......','.....AvvvA......','....AvvAvvw.....','....vvAvvvw.....','...AvvvvvvBw....','...vvAvvvBBw....','...vvvvvBBBw....','...vvvvBBBww....','....vvBBBBw.....','....wBBBBww.....','.....wwwww......','......www.......','................','................'],
 'part-tusk':['................','..........ll....','.........lrlm...','.........lrmm...','.........lmmm...','........llmmn...','........lmmn....','.......llmmn....','......llmmn.....','.....llmmn......','...lllmmn.......','..jlmmmn........','..jjjnn.........','..iij...........','................','................'],
 'part-owlhide':['................','...l.m.l.m.l....','...lmlmlmlml....','..kkkkkkkkkkj...','..kkkjkkkkjkj...','...kkkkkkkkj....','...kkjkkkjkj....','..kkkkkkkkkkj...','..kkkkjkkkkjj...','...kkkkkkkkj....','...kjkkkjkji....','..kkj.....jji...','..kj.......ji...','................','................','................'],
 'part-sap':['................','.......e........','......edc.......','......dcc.......','.....edccb......','.....dcccb......','....edccccb.....','....dcccccb.....','....dccccbb.....','....cccccbb.....','....bcccbba.....','.....bbbba......','......aaa.......','................','................','................'],
 'part-heartwood':['................','.....iiiiii.....','....ijjjjjji....','...ijkkkkkkji...','..ijkkjjjjkkji..','..ijkjkkkkjkji..','..ijkjkyykjkji..','..ijkjkyYkjkji..','..ijkjkkkkjkji..','..ijkkjjjjkkji..','...ijkkkkkkji...','....ijjjjjji....','.....iiiiii.....','................','................','................'],
 'part-ogrehide':['................','...tt..ttt.t....','..ttsttttttt....','..tsstttttttu...','..ttsttmttttu...','...tttmtmtttu...','..ttttttmtttu...','..tttttmtmttu...','..ttttmtttmtu...','...ttttttttuu...','..tttttttttuu...','..uttuttuttuu...','...u..uu..u.....','................','................','................'],
 'part-ogrebone':['................','..ll.ll.........','..lrllmm........','...llmmm........','..lmlmmm........','..mmmlmmm.......','.....mlmmm......','......mlmmm.....','.......mlmmm....','........mlmmnm..','........mmmnnn..','........mmnnn...','.........nnnn...','.........nn.nn..','................','................'],
 'part-voidshard':['................','........r.......','.......rC.......','.......CCD......','......rCCD......','......CCCDD.....','.....rCCCDD.....','.....CCCCDD..x..','....rCCCDDD.....','....CCCCDD......','..x.CCCDDD......','.....CCDD.......','......DD........','................','................','................'],
 'part-wscale':['................','......hhh.......','.....hhggg......','....hhgKggg.....','...hhgKKKggf....','...hgKKgKKgf....','...hgKgggKgf....','...ggKgggKff....','...ggKgggKff....','....gKgggKf.....','....gKKgKKf.....','.....gKKKf......','......gff.......','.......f........','................','................'],
 'part-wvenom':['................','.......jj.......','......kjji......','.......pp.......','.......qp.......','......qrqp......','.....qAAAAp.....','....qAAvAABp....','....qArAAABp....','....pAAAABBo....','....pABABBBo....','....pBBBBBBo....','.....oooooo.....','................','................','................'],
 'part-membrane':['................','..i.............','..ui............','..huii..........','..hhuiii........','..hgguuiiii.....','..hggguggiiii...','..hgggguggguii..','..hggggguggggu..','..gggggggugggg..','..ggfggfgguggf..','...f..f..f.gff..','................','................','................','................'],
 salve:['................','......jjjj......','.....jkkkki.....','......iiii......','.....kkkkkk.....','....kAAAAvAj....','....kAvAAAAj....','...kkkkkkkkji...','...kkjkkkkjji...','...kkkkkkkjji...','...jkkkkkkjji...','....jjjjjjii....','.....iiiiii.....','................','................','................'],
 anvil:['................','................','.....rqqqqqqqp..','..rqqqqqqqqqppo.','...ppqqqqqqppo..','.....ooppppoo...','.......pppo.....','.......ppoo.....','......pppooo....','....qqqpppooo...','....pppppoooo...','...kkkkkkkkkkj..','...jjjjjjjjjji..','...ii......ii...','................','................'],
 parts:['................','......cc........','.....c..c.......','....kkkkkkj.....','...kkkkkkkkj....','..kkkkkkkkkkj...','..kkkdcckkkjj...','..kkkcbbkkjjj...','..kkkkbkkkjji...','..jkkkkkkjjji...','..jjkkkkjjjii...','...jjjjjjjii....','....iiiiiii.....','................','................','................']
};
/* crafted item icons: [base icon, recolour {from:to}, extra pixels [x,y,key]] (the base drawing's outline is redrawn around them) */
const CRAFT_ICITEM={
 fangknife:['dagger',{r:'r',q:'l',p:'m',d:'v',c:'w',k:'B',j:'w'},[[2,1,'A'],[3,1,'A']]],
 tuskspear:['spear',{r:'r',q:'l',p:'m',c:'g',b:'f'},[[8,4,'g'],[7,5,'f']]],
 silkbow:['bow',{k:'j',j:'i',m:'r',d:'l',c:'m'},[[5,4,'l'],[5,10,'l'],[9,1,'l'],[9,13,'l']]],
 heartstave:['staff',{x:'A',F:'r',X:'B',d:'k',c:'j',b:'i'},[[9,1,'v'],[8,2,'v']]],
 bonemaul:['w-maul',{r:'r',q:'l',p:'m',o:'n',c:'g',b:'f'},[]],
 sinewxbow:['w-xbow',{k:'t',j:'u',m:'l',l:'m',c:'A',b:'B'},[]],
 tailglaive:['w-glaive',{r:'h',q:'g',p:'K',o:'f',c:'A'},[[11,7,'A']]],
 voidgreat:['w-greatsword',{q:'C',p:'D',d:'q',c:'p',b:'o'},[]],
 serpjerkin:['armor-medium',{k:'v',j:'w',q:'A',p:'B',i:'j'},[]],
 owlcoat:['armor-medium',{q:'l',p:'m',d:'l',k:'k',j:'j'},[[4,3,'l'],[11,3,'m']]],
 barkrobe:['armor-light',{l:'k',m:'j',n:'i',k:'A',j:'B',d:'v'},[]],
 ogreharness:['armor-heavy',{r:'s',q:'t',p:'u',o:'i',d:'l',c:'m',b:'n'},[]],
 wyvcuirass:['armor-heavy',{r:'h',q:'g',p:'K',o:'f'},[]],
 ogrehelm:['helm-3',{r:'r',q:'l',p:'m',o:'n'},[]],
 tuskhelm:['helm-4',{r:'q',q:'p',p:'o'},[[1,10,'l'],[1,11,'l'],[2,12,'m'],[14,10,'l'],[14,11,'m'],[13,12,'m']]],
 wyvhelm:['helm-5',{h:'d',g:'c',f:'b',r:'h',q:'g',p:'K',o:'f',d:'e',c:'d'},[]],
 serptarge:['shield-buckler',{k:'v',j:'w',q:'y',p:'Y',o:'Y',c:'B',e:'A',b:'w',d:'A'},[]],
 heartround:['shield-round',{h:'k',g:'j',f:'i',k:'v',j:'w',i:'B',q:'c',r:'e',p:'b'},[]],
 wyvkite:['shield-kite',{h:'K',g:'g',f:'f',l:'c'},[]]
};
function craftIcOutline(rows){if(typeof _icOutline==='function')return _icOutline(rows);
 const on=(x,y)=>y>=0&&y<16&&x>=0&&x<16&&rows[y][x]!=='.';return rows.map((r,y)=>{let s='';for(let x=0;x<16;x++)s+=on(x,y)?r[x]:(on(x-1,y)||on(x+1,y)||on(x,y-1)||on(x,y+1))?'0':'.';return s})}
function craftIcRecolor(rows,map,extra){const R=rows.map(r=>r.replace(/0/g,'.').split('').map(k=>map[k]||k));for(const [x,y,k] of extra||[])if(R[y]&&x>=0&&x<16)R[y][x]=k;return craftIcOutline(R.map(r=>r.join('')))}
(function(){if(typeof ICONS!=='object'||!ICONS)return;const reg=(n,rows)=>{ICONS[n]=rows;if(typeof icCss==='function')icCss(n)};
 for(const n in CRAFT_ICSRC)if(!Object.prototype.hasOwnProperty.call(ICONS,n))reg(n,craftIcOutline(CRAFT_ICSRC[n].map(r=>(r+'................').slice(0,16))));
 for(const id in CRAFT_ICITEM){const [b,map,ex]=CRAFT_ICITEM[id],base=ICONS[b];if(base&&ITEMS[id]&&!Object.prototype.hasOwnProperty.call(ICONS,'it-'+id))reg('it-'+id,craftIcRecolor(base,map,ex))}})();
