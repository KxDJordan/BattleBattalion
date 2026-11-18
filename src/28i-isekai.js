/* ================= THE ISEKAI: a hero of the player's own making =================
   ORIGINS.isekai: a stranger pulled out of another world into this one. Before the march the player makes the hero:
     name (sanitised: letters, digits, spaces, '-' and '.', at most ISK.nameMax), a face (m.pseed: the portrait seed, 07-portraits.js),
     three attributes at three talent stars (the most a sword can have; the other five none), the 4 style mastery trees
     (as many as a recruit draws: rollTrees), one weapon family (the Weapon mastery perk of that family, WTS but the shield),
     one armor tree (light, medium or heavy), a gift tree or none (not awakened: the first perk in it awakens it, as for anyone),
     and the mode:
       solo  the hero rides alone (isSolo: nobody can join, contracts pay as for two swords, bands sized for one; level 3, 1,000 crowns)
       rpg   the hero hires mercenaries as any company does (level 1, 1,200 crowns, nobody else) but the run ends when the hero dies
   Either way the run ends with the hero: isekaiLost(g) is checked by settleBattle (68-battle-flow.js, a battle is the only place a
   sword dies) and, as a fallback for any other way out of the roster, isekaiWatch() from the world shell. The hero cannot be
   dismissed, never deserts over unpaid wages and never walks out in an event.
   The merc: background 'isekai' (BG.isekai in 10-data.js, shown as "Isekai": balanced, a little better than a recruit; never in a tavern, a rival roster or an event), always human,
   m.cc = {wt, at, sty} the chosen weapon family, armor tree and fighting style, which override the background's in weaponTypes,
   armorTrees and mercStyle (61-talents.js); m.trees = the chosen style trees (+ the gift). Starting gear from ISK.gear.
   G.isekai = {mode:'solo'|'rpg', hero: merc id, name: the hero's name (for the last page), lost?: 1 once the hero is gone}.
   isekaiSpec(o) validates a creation record (the UI's and tests'); missing fields take ISK.def (the name from the game stream).
   Saves: SAVEVER 22 (20-state.js) validates G.isekai (isekaiRepair) and m.cc / m.pseed (repairMerc). The game stream is drawn only
   by newMerc and a default name; the creation screens' dice are cosmetic (Math.random), as in the new-company dialog. */
const ISK={stats:['hp','fat','init','ms','rs','md','rd','brv'],nTal:3,nStyle:4,nameMax:20,lvl:{solo:3,rpg:1},crowns:{solo:1000,rpg:1200},
 def:{tal:['hp','ms','md'],trees:['vanguard','duelist','survivor','tactician'],wt:'sword',at:'medarmor',gift:null,mode:'rpg'},
 /* tier 1 arms of each family (two tier-2 exceptions where the family has no tier-1 piece), a sidearm for the ranged, a buckler for the
    one-handed melee; armor of the chosen class (body + helmet weigh into that class: armorClassOf). Heavy has no cheap pieces: the
    hero's lamellar and kettle hat come battered (ISK.worn of their armor). */
 gear:{w:{sword:'oldsword',axe:'hatchet',mace:'spikedclub',hammer:'mallet',dagger:'dirk',spear:'spear',polearm:'pitchfork',greatsword:'waster',
   bow:'huntbow',crossbow:'huntxbow',flintlock:'handgonne',throwing:'tknives',staff:'staff',fist:'cestus'},
  side:{bow:'knife',crossbow:'knife',flintlock:'knife',throwing:'knife',staff:'knife'},shield:['sword','axe','mace','hammer','spear'],
  a:{lightarmor:['padded','cap'],medarmor:['hide','cap'],heavyarmor:['lamellar','kettle']}},worn:.6};
ISK.wts=WTS.filter(w=>w!=='shield'&&ISK.gear.w[w]);
ISK.ranged=['bow','crossbow','flintlock','throwing'];
function iskStyles(){return Object.keys(MAST).filter(k=>MAST[k].kind==='style')}
function iskGifts(){return Object.keys(MAST).filter(k=>MAST[k].kind==='gift')}
// a gift tree that suits the weapon chosen: its style, and for a ranged style the throwing gifts (aff 'throwing') with the throwing family only
function iskGiftFit(T,st,wt){if(!T||T.style!==st)return false;const th=(T.aff||[]).includes('throwing');return st!=='ranged'||th===(wt==='throwing')}
function iskArmors(){return(typeof ARMORT!=='undefined'?ARMORT:['lightarmor','medarmor','heavyarmor']).filter(k=>MAST[k]&&ISK.gear.a[k])}
// the hero's name: letters (any script), digits, spaces, '-' and '.'; no markup characters can survive. '' when nothing is left.
function isekaiName(s){return typeof s==='string'?s.normalize('NFC').replace(/[^\p{L}\p{M}\p{N} .\-]/gu,'').replace(/\s+/g,' ').trim().slice(0,ISK.nameMax).trim():''}
// the fighting style the hero's gift variant and autoLearn read: the gift's own, else ranged for a ranged family, caster for the staff
function isekaiStyle(wt,gift){const T=gift&&MAST[gift];if(T&&T.kind==='gift'&&T.style)return T.style;return ISK.ranged.includes(wt)?'ranged':wt==='staff'?'caster':'melee'}
/* a full, valid creation record from anything: {name, face, tal:[3 stats], trees:[4 style trees], wt, at, gift|null, mode}; quiet: no name drawn */
function isekaiSpec(o,quiet){o=o&&typeof o==='object'?o:{};const D=ISK.def,uniq=(a,ok,n,d)=>{const r=[];for(const k of (Array.isArray(a)?a:[]))if(ok(k)&&!r.includes(k)&&r.length<n)r.push(k);for(const k of d)if(r.length<n&&!r.includes(k))r.push(k);return r};
 const S=iskStyles(),name=isekaiName(o.name)||(quiet?'Nameless':pick(NAMES));   // quiet (the screens' previews): never draws on the game stream
 return{name,face:Number.isInteger(o.face)&&o.face>=0&&o.face<1e5?o.face:ptHashSafe(name)%1e5,
  tal:uniq(o.tal,k=>ISK.stats.includes(k),ISK.nTal,D.tal),trees:uniq(o.trees,k=>S.includes(k),ISK.nStyle,D.trees.concat(S)),
  wt:ISK.wts.includes(o.wt)?o.wt:D.wt,at:iskArmors().includes(o.at)?o.at:D.at,gift:typeof o.gift==='string'&&MAST[o.gift]&&MAST[o.gift].kind==='gift'?o.gift:null,
  mode:o.mode==='solo'||o.mode==='rpg'?o.mode:D.mode}}
function ptHashSafe(s){if(typeof ptHash==='function')return ptHash(s);let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h}
// the starting kit of a spec: [weapon, armor, helmet, (shield)] and the sidearm
function isekaiGear(sp){const G0=ISK.gear,w=G0.w[sp.wt],a=G0.a[sp.at]||G0.a.medarmor,L=[w].concat(a);if(G0.shield.includes(sp.wt)&&ITEMS.buckler)L.push('buckler');return{list:L.filter(id=>ITEMS[id]),side:G0.side[sp.wt]&&ITEMS[G0.side[sp.wt]]?G0.side[sp.wt]:null}}
/* makes merc m (a fresh newMerc('isekai')) into the hero of spec sp. Draws no randomness. */
function isekaiMake(m,sp){const R=RACE[m.race];if(R&&m.race!=='human')for(const k in R.st)if(k in m.base)m.base[k]-=R.st[k];m.race='human';
 m.name=sp.name;m.pseed=sp.face;m.tal={};for(const k of sp.tal)m.tal[k]=3;m.traits=[];m.perks=[];m.pp=1;m.pend=0;m.lvl=1;m.xp=0;
 m.cc={wt:sp.wt,at:sp.at,sty:isekaiStyle(sp.wt,sp.gift)};m.gift=sp.gift||null;m.trees=sp.trees.slice().concat(m.gift?[m.gift]:[]);
 m.eq={w:null,b:null,s:null,a:null,h:null,c:null};const K=isekaiGear(sp);for(const id of K.list){const it=ITEMS[id];m.eq[it.k]=id}if(K.side)m.eq.b=K.side;
 if(typeof fixHands==='function')fixHands(m);
 if(sp.at==='heavyarmor'){const a=ITEMS[m.eq.a],h=ITEMS[m.eq.h],c={};if(a&&a.arm)c.a=Math.round(a.arm*ISK.worn);if(h&&h.arm)c.h=Math.round(h.arm*ISK.worn);m.cond=c}else delete m.cond;
 const L=ISK.lvl[sp.mode]||1;if(L>1)gainXP(m,XPT[L]-m.xp);m.field=true;m.slain={};if(typeof syncMast==='function')syncMast(m);m.hp=calc(m).hp;return m}
/* ---- the origin ---- */
ORIGINS.isekai={n:'The Isekai',icon:'or-isekai',roster:['isekai'],crowns:ISK.crowns.rpg,k:{},
 d:'A flash of light, a truck that was never there, and then grass under your hands and two moons in the sky. You know nothing of this world, but it seems to have been waiting for you.',
 rule:'You make the hero: name, three talents at three stars, four mastery trees, a weapon and an armor tree, a gift if you like. Solo: you ride alone, nobody can join, contracts pay as for two swords, the hero starts at level 3 with 1,000 crowns. RPG: the hero starts at level 1 with 1,200 crowns and can hire mercenaries. Either way, if the hero dies the run ends.',
 ncLine:'One hero · 1,000 crowns alone or 1,200 to hire with'};
function isekaiRule(mode){return mode==='solo'
 ?'Solo: the hero rides alone. Nobody can join the company, not by hire, parley or event (followers still can). Contracts pay as for two swords and bands come sized for one. The hero starts at level 3. If the hero dies, the run ends.'
 :'RPG: the hero leads a company. Hire mercenaries at any tavern as usual; the hero starts at level 1 with nobody else. If the hero dies, the run ends, however many swords are left.'}
ORIGINS.isekai.setup=(g,opts)=>{const sp=isekaiSpec(opts&&opts.isekai);let m=g.roster[0];if(!m||m.bg!=='isekai'){m=newMerc('isekai');g.roster=[m]}g.roster=[m];isekaiMake(m,sp);
 g.isekai={mode:sp.mode,hero:m.id,name:m.name};g.crowns=ISK.crowns[sp.mode];
 if(sp.mode==='solo'){g.salve=(typeof g.salve==='number'?g.salve:2)+2;if(!g.parts||typeof g.parts!=='object')g.parts={};g.parts.meat=(g.parts.meat||0)+2}};
function originRule(g){g=g||G;const O=g&&ORIGINS[g.origin];if(!O)return'';return g.origin==='isekai'&&g.isekai?isekaiRule(g.isekai.mode):O.rule||''}
/* ---- who the hero is, and the end ---- */
function isekaiOn(g){g=g||G;return!!(g&&g.origin==='isekai'&&g.isekai&&typeof g.isekai==='object')}
function isekaiIsHero(m,g){g=g||G;return!!(m&&isekaiOn(g)&&m.id===g.isekai.hero)}
function isekaiHero(g){g=g||G;return isekaiOn(g)&&Array.isArray(g.roster)?g.roster.find(m=>m.id===g.isekai.hero)||null:null}
function isekaiLost(g){g=g||G;return isekaiOn(g)&&(!!g.isekai.lost||!Array.isArray(g.roster)||!g.roster.some(m=>m.id===g.isekai.hero))}
function isekaiName0(g){g=g||G;return isekaiOn(g)?isekaiName(g.isekai.name)||'The hero':'The hero'}
// the last page: who fell, and the one button. days: how long the march lasted.
function isekaiEndHTML(days){const nm=htmlEsc(isekaiName0()),solo=G&&G.isekai&&G.isekai.mode==='solo',n=G&&Array.isArray(G.roster)?G.roster.filter(m=>!isekaiIsHero(m)).length:0;
 return`<div class="isk-end"><div class="isk-endh">${typeof pnIcon==='function'?pnIcon('or-isekai','',32):''}<h2>${nm} has fallen</h2></div>
 <p>${nm} came into this world from another, and here that world's story ends. ${solo?'There was no one to ride on in their name.':n?`${n===1?'The one sword who followed '+nm+' takes their pay and leaves':'The '+n+' swords who followed '+nm+' take their pay and scatter'}: there is no company without the hero.`:'Nobody was left to carry on.'}</p>
 <p class="dim">The Isekai's one rule: when the hero dies, the run is over. It lasted ${Math.max(1,days|0)} day${(days|0)===1?'':'s'}.</p></div>`+
 `<div class="row isk-endb"><button onclick="isekaiChronicle()">${typeof pnIcon==='function'?pnIcon('ledger','',16):''}<span>The chronicle</span></button><button class="pri" style="flex:1" onclick="if(typeof newCompanySetup==='function')newCompanySetup();else newGame()">Raise a new company</button></div>`}
function isekaiChronicle(){const s=typeof runsAll==='function'?runsAll()[0]:null;if(s&&typeof runSummarySheet==='function')runSummarySheet(s);else if(typeof hallSheet==='function')hallSheet('runs')}
// the fallback for a hero gone without a battle (settleBattle ends it otherwise): the same last page at the next quiet moment in the world
function isekaiWatch(){if(!isekaiOn()||G.isekai.lost||!isekaiLost())return false;if((typeof sheetOpen!=='undefined'&&sheetOpen)||(typeof mode!=='undefined'&&mode!=='world'))return false;
 G.isekai.lost=1;if(typeof runEnd==='function'){try{runEnd('wipe')}catch(e){}}if(typeof clearSave==='function')clearSave();if(typeof sheet==='function')sheet(isekaiEndHTML(G.day),'isk-over');return true}
/* ---- saves: G.isekai (repairSave) ---- */
function isekaiRepair(g){if(!g||typeof g!=='object')return g;if(g.origin!=='isekai'){delete g.isekai;return g}const I=g.isekai;
 const hero=I&&typeof I==='object'&&Number.isInteger(I.hero)&&Array.isArray(g.roster)?g.roster.find(m=>m&&m.id===I.hero):null;
 if(!hero||(I.mode!=='solo'&&I.mode!=='rpg')){g.origin='free';delete g.isekai;return g}   // a record that cannot name its hero: a plain free company
 g.isekai={mode:I.mode,hero:I.hero,name:isekaiName(typeof I.name==='string'?I.name:'')||isekaiName(hero.name)||'The hero'};return g}
function isekaiFixMerc(m){if(m.cc!==undefined){const c=m.cc,ok=c&&typeof c==='object'&&WTS.includes(c.wt)&&(typeof ARMORT==='undefined'||ARMORT.includes(c.at))&&TALSTYLE.includes(c.sty);if(ok)m.cc={wt:c.wt,at:c.at,sty:c.sty};else delete m.cc}
 if(m.pseed!==undefined&&!(Number.isInteger(m.pseed)&&m.pseed>=0&&m.pseed<1e5))delete m.pseed}

/* ================= THE CREATION SCREENS =================
   The new-company dialog's Begin (ncBegin, 90-shell.js) opens these for The Isekai. ISKS holds the choices while they are open;
   iskGo(step) shows a step, iskSet(k, v) / iskToggle(k, v) change a choice, iskNext / iskBack move, iskBegin raises the company
   (newGame(false, opts) with opts.isekai = isekaiSpec(choices)). Every step has a Back (the first goes back to the company dialog). */
const ISKSTEP=[['name','Name'],['tal','Talents'],['trees','Masteries'],['wt','Weapon'],['at','Armor'],['gift','Gift'],['mode','Mode'],['sum','Begin']];
const ISKS={step:0,name:'',face:0,tal:[],trees:[],wt:null,at:null,gift:'',mode:null,focus:null,fresh:true};
function iskRand(n){return Math.floor(Math.random()*n)}   // cosmetic dice only (a suggested name, another face): never the game stream
function iskReset(){Object.assign(ISKS,{step:0,name:NAMES[iskRand(NAMES.length)],face:iskRand(1e5),tal:[],trees:[],wt:null,at:null,gift:'',mode:null,focus:null,fresh:false})}
function iskChoice(){return{name:isekaiName(ISKS.name),face:ISKS.face,tal:ISKS.tal.slice(),trees:ISKS.trees.slice(),wt:ISKS.wt,at:ISKS.at,gift:ISKS.gift||null,mode:ISKS.mode}}
// '' when step i is complete, else what is missing
function iskMissing(i){const k=ISKSTEP[i]&&ISKSTEP[i][0];
 if(k==='name')return isekaiName(ISKS.name)?'':'Give your hero a name';
 if(k==='tal')return ISKS.tal.length===ISK.nTal?'':`Pick ${ISK.nTal-ISKS.tal.length} more`;
 if(k==='trees')return ISKS.trees.length===ISK.nStyle?'':`Pick ${ISK.nStyle-ISKS.trees.length} more`;
 if(k==='wt')return ISKS.wt?'':'Pick a weapon';if(k==='at')return ISKS.at?'':'Pick an armor tree';if(k==='gift')return ISKS.gift===''?'Pick a gift, or none':'';
 if(k==='mode')return ISKS.mode?'':'Pick Solo or RPG';return''}
function iskFirstOpen(){for(let i=0;i<ISKSTEP.length-1;i++)if(iskMissing(i))return i;return ISKSTEP.length-1}
function iskOpen(){if(ISKS.fresh)iskReset();iskGo(Math.min(ISKS.step,iskFirstOpen()),true)}
function iskGo(i,full){i=clamp(i|0,0,ISKSTEP.length-1);if(i>iskFirstOpen())i=iskFirstOpen();const re=full||i!==ISKS.step||!$('iskBody');ISKS.step=i;if(re)ISKS.focus=null;iskDraw(re)}
function iskNext(){const w=iskMissing(ISKS.step);if(w){if(typeof toast==='function')toast(w);return}if(ISKS.step>=ISKSTEP.length-1){iskBegin();return}iskGo(ISKS.step+1)}
function iskBack(){if(ISKS.step<=0){if(typeof ncReopen==='function')ncReopen();else newCompanySetup();return}iskGo(ISKS.step-1)}
function iskSet(k,v){if(k==='name')ISKS.name=String(v==null?'':v).slice(0,ISK.nameMax*2);else if(k==='wt'&&ISK.wts.includes(v))ISKS.wt=v;else if(k==='at'&&iskArmors().includes(v))ISKS.at=v;
 else if(k==='gift'&&(v==='none'||iskGifts().includes(v)))ISKS.gift=v;else if(k==='mode'&&(v==='solo'||v==='rpg'))ISKS.mode=v;else if(k==='face')ISKS.face=Number.isInteger(v)&&v>=0&&v<1e5?v:ISKS.face;else return false;
 ISKS.focus=v;if(k==='name')iskNameLive();else iskDraw(false);return true}
function iskToggle(k,v){const L=k==='tal'?ISKS.tal:k==='trees'?ISKS.trees:null,n=k==='tal'?ISK.nTal:ISK.nStyle;if(!L)return false;
 if(k==='tal'&&!ISK.stats.includes(v)||k==='trees'&&!iskStyles().includes(v))return false;ISKS.focus=v;
 const i=L.indexOf(v);if(i>=0)L.splice(i,1);else if(L.length<n)L.push(v);else{if(typeof toast==='function')toast(k==='tal'?'Three stars go to three attributes: take one away first':'Four trees: take one away first');iskDraw(false);return false}
 iskDraw(false);return true}
function iskDiceName(){let n=ISKS.name;for(let i=0;i<6&&n===ISKS.name;i++)n=NAMES[iskRand(NAMES.length)];ISKS.name=n;const e=$('iskName');if(e)e.value=n;iskNameLive()}
function iskDiceFace(){ISKS.face=iskRand(1e5);iskDraw(false)}
function iskNameLive(){const p=$('iskPor');if(p)p.innerHTML=iskPortrait(96);const c=$('iskCap');if(c)c.textContent=isekaiName(ISKS.name)||'Nameless';iskFootSync()}
// the hero as the portrait and the sheets see them, before the world exists (id 0: the face comes from m.pseed)
function iskPreview(){const sp=isekaiSpec(Object.assign(iskChoice(),{wt:ISKS.wt||ISK.def.wt,at:ISKS.at||ISK.def.at}),1),K=isekaiGear(sp),eq={w:null,b:K.side,s:null,a:null,h:null,c:null};
 for(const id of K.list)eq[ITEMS[id].k]=id;return{id:0,name:isekaiName(ISKS.name)||'Nameless',race:'human',bg:'isekai',base:{},eq,pseed:ISKS.face,gift:ISKS.gift&&ISKS.gift!=='none'?ISKS.gift:null,trees:[],perks:[]}}
function iskPortrait(size){return typeof portraitHTML==='function'?portraitHTML(iskPreview(),size,'isk-ptr'):''}
const iskIc=(k,s)=>typeof pnIcon==='function'?pnIcon(k,'',s||16):'';
function iskStepsHTML(){const open=iskFirstOpen();return`<ol class="isk-steps" aria-label="Steps">${ISKSTEP.map(([k,n],i)=>`<li><button class="isk-st${i===ISKS.step?' on':''}${i<ISKS.step||(!iskMissing(i)&&i<=open)?' done':''}"${i>open?' disabled':''} aria-current="${i===ISKS.step?'step':'false'}" onclick="iskGo(${i})"><i>${i+1}</i><span>${n}</span></button></li>`).join('')}</ol>`}
function iskDraw(full){const k=ISKSTEP[ISKS.step][0];
 if(full||!$('iskBody')){sheet(`<div class="row sp seth ncs-h isk-h"><h2>Your hero</h2>${iskStepsHTML()}</div><div class="isk-body" id="iskBody">${iskBodyHTML(k)}</div><div class="isk-foot" id="iskFoot">${iskFootHTML()}</div>`,'wide isk');return}
 const b=$('iskBody'),st=b.scrollTop;b.innerHTML=iskBodyHTML(k);b.scrollTop=st;iskFootSync()}
function iskFootSync(){const f=$('iskFoot');if(f)f.innerHTML=iskFootHTML();const s=document.querySelector&&document.querySelector('#sheetBody .isk-steps');if(s&&s.outerHTML!==undefined)s.outerHTML=iskStepsHTML()}
function iskFootHTML(){const last=ISKS.step===ISKSTEP.length-1,w=iskMissing(ISKS.step);
 return`<button class="isk-back" onclick="iskBack()">Back</button><span class="isk-hint${w?' need':''}" role="status">${htmlEsc(w||iskFocusLine()||(last?'Check your hero, then begin.':'Ready'))}</span><button class="pri isk-next${last?' big':''}" ${w?'aria-disabled="true"':''} onclick="iskNext()">${last?'<b>Begin</b>':'Next'}</button>`}
// a line about the choice just made (the foot's hint)
function iskFocusLine(){const f=ISKS.focus,k=ISKSTEP[ISKS.step][0];if(f==null)return'';
 if(k==='trees'&&MAST[f])return MAST[f].n+': '+(MAST[f].role||MAST[f].d||'');if(k==='gift'&&MAST[f])return tlGiftLabelSafe(f)+': '+(MAST[f].role||'');
 if(k==='at'&&MAST[f])return MAST[f].n+': '+(MAST[f].role||'');if(k==='wt'){const p=iskWtPerk(f);return p?p.n+': '+(p.d||''):''}
 if(k==='tal'&&STATN[f])return STATN[f]+(ISKS.tal.includes(f)?': three stars':': no stars');return''}
function tlGiftLabelSafe(g){return typeof tlGiftLabel==='function'?tlGiftLabel(g):MAST[g].n}
function iskWtPerk(w){const T=MAST.weapons;if(!T)return null;for(const t of T.tiers)for(const p of t)if(p.wt===w)return p;return null}
function iskWtIcon(w){const p=iskWtPerk(w);return p&&typeof tlPerkIcon==='function'?tlPerkIcon({key:'weapons',perk:p,id:p.id}):w}
function iskBodyHTML(k){const it=id=>ITEMS[id]?ITEMS[id].n:id;
 if(k==='name'){const nm=isekaiName(ISKS.name);return`<div class="isk-name"><div class="isk-face"><span id="iskPor">${iskPortrait(96)}</span><button class="pxb sm isk-dice" onclick="iskDiceFace()">${iskIc('dice')}<span>Another face</span></button></div>
  <div class="isk-nf"><label class="ncs-nl" for="iskName">The hero's name</label><div class="ncs-name"><input id="iskName" type="text" maxlength="${ISK.nameMax}" autocomplete="off" spellcheck="false" value="${htmlEsc(ISKS.name)}" oninput="iskSet('name',this.value)" onkeydown="if(event.key==='Enter'){this.blur()}"><button class="pxb sm icon" aria-label="Suggest a name" title="Suggest a name" onclick="iskDiceName()">${iskIc('dice')}</button></div>
  <p class="isk-cap"><b id="iskCap">${htmlEsc(nm||'Nameless')}</b><small>${htmlEsc(BG.isekai.d)} Letters, numbers, spaces, '-' and '.'; at most ${ISK.nameMax}.</small></p></div></div>`}
 if(k==='tal'){return`<p class="isk-lead">Three attributes grow fastest: they get <b>three talent stars</b>, the most a sword can have; the other five get none. Each level you raise three attributes of your choice, and a three-star one rolls higher: <b>+1 to the low end, +2 to the high end</b>.</p>
  <div class="isk-tals" role="group" aria-label="Talents">${ISK.stats.map(s=>{const on=ISKS.tal.includes(s),R=ROLL[s];return`<button class="isk-tal${on?' on':''}" aria-pressed="${on}" onclick="iskToggle('tal','${s}')">${typeof coStatIc==='function'?coStatIc(s,16):''}<b>${STATN[s]}</b><span class="isk-stars">${[0,1,2].map(()=>iskIc('star')).join('')}</span><small>+${R[0]+(on?1:0)} to ${R[1]+(on?2:0)} a level</small></button>`}).join('')}</div>`}
 if(k==='trees'){return`<p class="isk-lead">Choose the <b>${ISK.nStyle} mastery trees</b> the hero can learn, as many as any recruit carries. ${ISKS.trees.length}/${ISK.nStyle} chosen.</p><div class="isk-grid" role="group" aria-label="Mastery trees">${iskStyles().map(t=>{const on=ISKS.trees.includes(t),T=MAST[t];
   return`<button class="ncs-or isk-o${on?' on':''}" aria-pressed="${on}" onclick="iskToggle('trees','${t}')">${iskIc(typeof tlTreeIcon==='function'?tlTreeIcon(t):t,32)}<b>${htmlEsc(T.n)}</b></button>`}).join('')}</div>`}
 if(k==='wt'){return`<p class="isk-lead">One <b>weapon family</b>: its Weapon mastery perk opens at level 3, and the hero starts with one.</p><div class="isk-grid" role="radiogroup" aria-label="Weapon family">${ISK.wts.map(w=>{const on=ISKS.wt===w;
   return`<button class="ncs-or isk-o${on?' on':''}" role="radio" aria-checked="${on}" onclick="iskSet('wt','${w}')">${iskIc(iskWtIcon(w),32)}<b>${htmlEsc(typeof TL_WTN==='object'&&TL_WTN[w]||w)}</b><small>${htmlEsc(it(ISK.gear.w[w]))}</small></button>`}).join('')}</div>`}
 if(k==='at'){return`<p class="isk-lead">One <b>armor tree</b>. Its perks work only in armor of its weight; the hero starts dressed for it.</p><div class="isk-arms" role="radiogroup" aria-label="Armor tree">${iskArmors().map(a=>{const on=ISKS.at===a,T=MAST[a];
   return`<button class="ncs-tog isk-a${on?' on':''}" role="radio" aria-checked="${on}" onclick="iskSet('at','${a}')">${iskIc(typeof tlTreeIcon==='function'?tlTreeIcon(a):a,32)}<span><b>${htmlEsc(T.n)}</b><small>${htmlEsc(T.role||'')}</small><small class="isk-kit">${ISK.gear.a[a].map(it).join(' and ')}${a==='heavyarmor'?' (battered)':''}</small></span></button>`}).join('')}</div>`}
 if(k==='gift'){const st=isekaiStyle(ISKS.wt,null);return`<p class="isk-lead">A <b>gift</b> from the crossing, or none. It sleeps until the first perk in its tree awakens it.</p><div class="isk-grid" role="radiogroup" aria-label="Gift">
   <button class="ncs-or isk-o${ISKS.gift==='none'?' on':''}" role="radio" aria-checked="${ISKS.gift==='none'}" onclick="iskSet('gift','none')">${iskIc('banner',32)}<b>No gift</b><small>Steel alone</small></button>${iskGifts().map(g=>{const on=ISKS.gift===g,T=MAST[g],fit=iskGiftFit(T,st,ISKS.wt);
   return`<button class="ncs-or isk-o g-${T.res}${on?' on':''}${fit?' fit':''}" role="radio" aria-checked="${on}" onclick="iskSet('gift','${g}')">${iskIc(typeof tlTreeIcon==='function'?tlTreeIcon(g):T.res,32)}<b>${htmlEsc(tlGiftLabelSafe(g))}</b><small>${htmlEsc(T.style||'')}${fit?' · fits':''}</small></button>`}).join('')}</div>`}
 if(k==='mode'){const M=(m,ic,n,t)=>{const on=ISKS.mode===m;return`<button class="ncs-tog isk-m${on?' on':''}" role="radio" aria-checked="${on}" onclick="iskSet('mode','${m}')">${iskIc(ic,32)}<span><b>${n}</b><small>${htmlEsc(t)}</small><small class="isk-kit">Level ${ISK.lvl[m]} · ${ISK.crowns[m].toLocaleString('en')} crowns</small></span></button>`};
  return`<p class="isk-lead">How does the story go?</p><div class="isk-arms isk-modes" role="radiogroup" aria-label="Mode">${M('solo','or-slayer','Solo',isekaiRule('solo'))}${M('rpg','company','RPG',isekaiRule('rpg'))}</div>`}
 return iskSumHTML()}
function iskSumHTML(){const sp=isekaiSpec(iskChoice(),1),K=isekaiGear(sp),it=id=>ITEMS[id]?ITEMS[id].n:id,row=(l,v)=>`<div class="isk-sr"><i>${l}</i><span>${v}</span></div>`;
 return`<div class="isk-sum"><div class="isk-sp">${iskPortrait(96)}<b>${htmlEsc(sp.name)}</b><small>Level ${ISK.lvl[sp.mode]} ${htmlEsc(BG.isekai.n)} · ${sp.mode==='solo'?'Solo':'RPG'}</small></div><div class="isk-sl">
 ${row('Talents',sp.tal.map(s=>`<span class="isk-chip">${typeof coStatIc==='function'?coStatIc(s,16):''}${STATN[s]} ${iskIc('star')}${iskIc('star')}${iskIc('star')}</span>`).join(''))}
 ${row('Masteries',sp.trees.map(t=>`<span class="isk-chip">${iskIc(typeof tlTreeIcon==='function'?tlTreeIcon(t):t)}${htmlEsc(MAST[t].n)}</span>`).join(''))}
 ${row('Weapon',`<span class="isk-chip">${iskIc(iskWtIcon(sp.wt))}${htmlEsc(typeof TL_WTN==='object'&&TL_WTN[sp.wt]||sp.wt)}</span><span class="isk-chip">${iskIc(typeof tlTreeIcon==='function'?tlTreeIcon(sp.at):sp.at)}${htmlEsc(MAST[sp.at].n)}</span>${sp.gift?`<span class="isk-chip">${iskIc(typeof tlTreeIcon==='function'?tlTreeIcon(sp.gift):'mana')}${htmlEsc(tlGiftLabelSafe(sp.gift))}</span>`:'<span class="isk-chip">No gift</span>'}`)}
 ${row('Kit',htmlEsc(K.list.concat(K.side?[K.side]:[]).map(it).join(', '))+` · ${ISK.crowns[sp.mode].toLocaleString('en')} crowns`)}
 <p class="isk-rule">${htmlEsc(isekaiRule(sp.mode))}</p></div></div>`}
function iskBegin(){for(let i=0;i<ISKSTEP.length-1;i++){const w=iskMissing(i);if(w){iskGo(i);if(typeof toast==='function')toast(w);return false}}
 const o=typeof ncOpts==='function'?ncOpts():{origin:'isekai'};o.origin='isekai';o.isekai=isekaiSpec(iskChoice());ISKS.fresh=true;if(typeof NCS==='object')NCS.open=false;newGame(false,o);return true}

/* ---- icons: 16 px pixel art (Detail Low) and painted art (Detail High): a figure stepping out of a violet rift ---- */
(function(){if(typeof ICONS!=='object'||!ICONS||typeof _icOutline!=='function')return;
 const r=['................','.....DDDDDD.....','...DDCCCCCCDD...','..DCCxxxxxxCCD..','..DCxxx11xxxCD..','.DCxxxx11xxxxCD.','.DCxx111111xxCD.','.DCx1x1111x1xCD.',
  '.DCxxx1111xxxCD.','.DCxxx1111xxxCD.','..DCxx1xx1xxCD..','..DCx11xx11xCD..','...DDCCCCCCDD...','.....DDDDDD.....','................','................'];
 ICONS['or-isekai']=_icOutline(r);if(typeof icCss==='function')icCss('or-isekai')})();
if(typeof PAINT==='object'&&PAINT&&typeof pkFill==='function'){
 PAINT['or-isekai']=g=>{pkGlow(g,16,16,15,'#b98cf0',.6);
  pkFill(g,pkS('M16 2 A11.5 14 0 1 1 15.99 2 Z M16 5.6 A8 10.4 0 1 0 16.01 5.6 Z'),'purple',{k:1.1,rule:'evenodd'});
  pkFill(g,pkEll(16,16,8,10.4),'frost',{k:.5,ball:1});
  pkFill(g,pkCirc(16,10.2,2.5),'dark',{k:.5});
  pkFill(g,pkS('M12.2 14 L19.8 14 L21.6 20.5 L19.6 21 L18.6 17.6 L18.4 21.5 L19 28 L17 28 L16 22.6 L15 28 L13 28 L13.6 21.5 L13.4 17.6 L12.4 21 L10.4 20.5 Z'),'dark',{k:.6})};
}
