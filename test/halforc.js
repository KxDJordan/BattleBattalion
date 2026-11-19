// Half-orc heads test (browser):  node test/halforc.js [html] [--ref other.html]
// The user's half-orc sheet (assets/parts2/halforc-heads.webp, cut by assets/make-halforc-atlas.py into orch0..7, ohair0..9 and oear, merged
// into P2A) as the Detail High figures use it (73q-parts2.js):
//  - every head, hair and the ear cut with their layers and anchors (heads: own colours + skin; hair: grey shade + no ear; the ear: colours + skin);
//  - a half-orc merc (man or woman) at High wears the half-orc head, its hair from the ten styles, the ear over the hair, no vector ear or tusks;
//    the common tone shows the sheet's olive, the ash tone differs;
//  - the expression rules give each battle state its head (idle, braced, attack, aim, hit, a big blow missed, kill, level up, victory, healed,
//    calm, wavering, breaking, low hp, death), and the live pick follows the unit (a kill, a level, a morale drop, a missed big blow);
//  - the hair varies across mercs (all ten styles turn up), is stable per merc, bald mercs stay bald, every old style maps to a new one;
//  - under a helmet no hair, the helmet over the crown;
//  - humans, dwarves and elves are untouched: with --ref (a build of main) their sprites are compared pixel for pixel, and Detail Low too.
const {chromium}=require('playwright'),path=require('path');
const args=process.argv.slice(2),ri=args.indexOf('--ref'),ref=ri>=0?path.resolve(args[ri+1]):null,f=path.resolve(args.filter((a,i)=>a!=='--ref'&&(ri<0||i!==ri+1))[0]||'dist/index.html');
async function open(b,file){const p=await b.newPage({viewport:{width:667,height:375}});const errs=[];
 p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
 await p.goto('file://'+file);await p.waitForTimeout(300);
 await p.evaluate(()=>{newGame();closeSheet();humImg()});await p.waitForFunction(()=>typeof humReady==='function'&&humReady()&&typeof p2On==='function'&&p2On(),null,{timeout:30000});return{p,errs}}
// sprite digests of a fixed set of mercs (by id, name, race, gear): High idle / attack in two faces, and Detail Low
const DIGEST=()=>{const base=G.roster[0],out={};
 const mk=(id,race,eq)=>{const m=JSON.parse(JSON.stringify(base));m.id=id;m.name='Ref'+id;m.race=race;m.bg='sellsword';m.colors=null;m.gift=null;m.mast={};m.perks=[];m.traits=[];m.lvl=1;m.kills=0;delete m.pseed;delete m.fabled;   // newGame's roster is random: only id, name, race and gear count
 m.eq=Object.assign({w:null,b:null,s:null,a:null,h:null,c:null},eq);return mkPlayerUnit(m)};
 const dg=o=>{if(!o||!o.cv)return'none';const d=o.cv.getContext('2d').getImageData(0,0,o.cv.width,o.cv.height).data;let h=2166136261;for(let i=0;i<d.length;i+=1){h^=d[i];h=Math.imul(h,16777619)}return o.cv.width+'x'+o.cv.height+':'+(h>>>0)};
 const L=[];for(const race of['human','dwarf','elf'])for(let i=0;i<4;i++)L.push(mk(64000+L.length,race,[{w:'arming',s:'heater2',a:'mail'},{w:'greataxe',a:'scale',h:'kettle'},{w:'knife',a:'padded'},{w:'spear',a:'leather',h:'hood'}][i]));
 for(const u of L)for(const [face,st] of[[0,'idle'],[1,'attack'],[2,'idle']])out['hi '+u.m.race+' '+u.m.id+' f'+face+' '+st]=dg(unitSpritePx(u,face,st,0));
 const O=[0,1,2].map(i=>mk(64100+i,'halforc',[{w:'arming',a:'mail'},{w:'greataxe',a:'scale',h:'kettle'},{w:'knife',a:'padded'}][i]));
 SET.detail='low';artChanged();for(const u of L.concat(O))out['lo '+u.m.race+' '+u.m.id]=dg(unitSpritePx(u,0,'idle',0));SET.detail='high';artChanged();
 return out};
(async()=>{const b=await chromium.launch();const {p,errs}=await open(b,f);
const R=await p.evaluate(()=>{const bad=[],n={};const k=humK(),base=G.roster[0];let mid=0;
 const merc=o=>{let m=null;for(let i=0;i<2000;i++){m=JSON.parse(JSON.stringify(base));m.id=80000+(++mid);m.name='Ho'+mid;m.race=o.race||'halforc';m.bg=o.bg||'sellsword';m.colors=null;
   m.eq=Object.assign({w:'arming',b:null,s:null,a:'padded',h:null,c:null},o.eq||{});const P=ptMercSpec(m);
   if((o.fem==null||!!P.fem===!!o.fem)&&(!o.skin||P.skin===PT_SKIN[o.skin])&&(o.hair==null||P.hair===o.hair)&&(o.hat==null||!P.hat===!o.hat))break}
  return mkPlayerUnit(m)};
 const AS=u=>humSkAssets(usLook(u),0,k);
 // ---- the pieces ----
 for(let i=0;i<8;i++){const P=P2A.p['orch'+i];if(!P){bad.push('orch'+i+' missing');continue}if(!P.L.c||!P.L.s)bad.push('orch'+i+': layers '+Object.keys(P.L));
  for(const a of['cx','cy','r','nx','ny','sx0','sx1','eyb','etx','ety','edx','edy'])if(!isFinite(P.a[a]))bad.push('orch'+i+': anchor '+a);
  if(Math.abs(P.h-P2A.p.head0.h)>5)bad.push('orch'+i+' height '+P.h+' vs the human head '+P2A.p.head0.h);if(Math.hypot(P.a.edx,P.a.edy)>4)bad.push('orch'+i+': ear off orch0 by '+[P.a.edx,P.a.edy])}
 for(let i=0;i<10;i++){const P=P2A.p['ohair'+i];if(!P){bad.push('ohair'+i+' missing');continue}if(!P.L.h)bad.push('ohair'+i+': no hair layer');if(P.L.s)bad.push('ohair'+i+': its drawn ear was not cut out');
  for(const a of['fx','fy','fs'])if(!isFinite(P.a[a]))bad.push('ohair'+i+': anchor '+a);if(!(P.a.fs>=.9&&P.a.fs<=1.25))bad.push('ohair'+i+': scale '+P.a.fs)}
 if(!P2A.p.oear||!P2A.p.oear.L.c||!P2A.p.oear.L.s)bad.push('the half-orc ear piece is missing');
 if(P2_OHAIR.length!==10)bad.push('ten half-orc styles named: '+P2_OHAIR.length);
 for(const sx of['m','w'])for(const st in P2_OHAIR_OF[sx])for(const i of P2_OHAIR_OF[sx][st])if(!(i>=0&&i<10))bad.push('style map '+sx+':'+st+' -> '+i);
 // every style a half-orc can have (07-portraits.js) maps to a new one
 for(const st of['mohawk','crop','tail','shaggy','bun'])if(!P2_OHAIR_OF.m[st])bad.push('man style '+st+' unmapped');for(const st of['tail','braids','mohawk','long','bun'])if(!P2_OHAIR_OF.w[st])bad.push('woman style '+st+' unmapped');
 // ---- a half-orc at High ----
 for(const fem of[0,1]){const u=merc({fem,hat:0,hair:fem?'tail':'mohawk'}),L=usLook(u),A=humSkAssets(L,0,k);
  if(A.hf!=='orch'||!A.ho)bad.push((fem?'woman':'man')+': head set '+A.hf);
  humSkFrame(L,0,'idle',0,k,'',{head:0});if(!A.drawn||A.drawn.head!=='orch0')bad.push((fem?'woman':'man')+': drew '+(A.drawn&&A.drawn.head));
  if(!A.drawn||!/^ohair\d$/.test(A.drawn.hair||''))bad.push((fem?'woman':'man')+': hair '+(A.drawn&&A.drawn.hair));if(!A.drawn||A.drawn.ear!=='oear')bad.push((fem?'woman':'man')+': the ear not over the hair');
  for(let i=0;i<8;i++){humSkFrame(L,0,'idle',0,k,'',{head:i});if(A.drawn.head!=='orch'+i)bad.push('expression head '+i+' drew '+A.drawn.head)}
  const o=unitSpritePx(u,0,'idle',0);if(!o||!o.hum)bad.push('half-orc '+(fem?'woman':'man')+' is not the composed figure')}
 // a bald half-orc: no hair, no extra ear
 {const u=merc({hair:'bald',hat:0,fem:0}),L=usLook(u),A=humSkAssets(L,0,k);if(A.hair!==-1)bad.push('a bald half-orc has hair '+A.hair);
  humSkFrame(L,0,'idle',0,k,'',{head:2});if(A.drawn.hair||A.drawn.ear)bad.push('a bald half-orc drew '+A.drawn.hair+' '+A.drawn.ear)}
 // skin: the common tone wears the sheet's olive (hands match the head), the ash tone another
 {const a=AS(merc({skin:'orc'})),c=AS(merc({skin:'ashorc'}));if(a.tone!==P2_OSKIN)bad.push('common half-orc tone '+a.tone);if(c.tone===a.tone)bad.push('ash half-orcs share the common tone')}
 // humans, dwarves, elves keep their heads
 for(const [race,fem,hf] of[['human',0,'head'],['human',1,'headf'],['elf',0,'elfm'],['dwarf',0,'head']]){const u=merc({race,fem}),A=AS(u);if(A.hf!==hf||A.ho)bad.push(race+(fem?' woman':'')+': head '+A.hf)}
 // ---- hair: varied, stable, bald stays bald ----
 {const seen={},bald={n:0,ok:0};let unstable=0;for(let i=0;i<500;i++){const u=merc({}),A=AS(u),P=ptMercSpec(u.m);if(P.hair==='bald'){bald.n++;if(A.hair===-1)bald.ok++;continue}if(A.hair>=0)seen[A.hair]=(seen[A.hair]||0)+1;
   const v=mkPlayerUnit(JSON.parse(JSON.stringify(u.m))),B2=humSkAssets(usLook(v),0,k);if(B2.hair!==A.hair)unstable++}
  n.styles=seen;if(Object.keys(seen).length!==10)bad.push('styles seen over 500 half-orcs: '+JSON.stringify(seen));if(unstable)bad.push(unstable+' mercs change hair between looks');if(bald.ok!==bald.n)bad.push('bald half-orcs with hair: '+(bald.n-bald.ok));n.bald=bald.n}
 // ---- helmets: no hair, the helmet over the crown ----
 for(const h of['kettle','nasal','armet','hood','cap','spangen']){if(!ITEMS[h])continue;const u=merc({eq:{h,a:'mail'}}),L=usLook(u),A=humSkAssets(L,0,k);humSkFrame(L,0,'idle',0,k,'',{head:0});
  if(!A.drawn||A.drawn.hair)bad.push('hair under helmet '+h);if(!A.drawn||!A.drawn.helm)bad.push('helmet '+h+' not drawn');
  // the crown: the head attachment's top rows are the helmet's (a bare head's top sits lower or level)
  const B0=Object.assign(Object.create(Object.getPrototypeOf(A)),A,{helm:-1,hair:-1,bk:new Map()});const top=at=>at.y;   // the baked attachment's top (SU, alpha-cropped)
  try{const th=top(p2HeadAtt(A,0)),tb=top(p2HeadAtt(B0,0));if(!(th<=tb+.5))bad.push('helmet '+h+' does not cover the crown ('+th.toFixed(1)+' vs '+tb.toFixed(1)+')')}catch(e){n.helmTopSkip=String(e)}}
 // ---- expressions ----
 const BASE={st:'idle',t:0,an:'',cls:'swing',mor:3,sts:{},buffs:{},won:false,kill:1e9,heal:1e9,ho:true,hpf:1,lvl:1e9,miss:1e9,drop:1e9,blink:false,S:{}};
 const rule=o=>{const c=Object.assign({},BASE,o);c.S=Object.assign({},o.S||{});for(const r of HEAD_RULES){let v=null;try{v=r[1](c)}catch(e){}if(v)return v}return'neutral'};
 const CASES=[['idle','neutral',{}],['idle, calm moment','content',{blink:true}],['confident','content',{mor:4}],['aim (bow)','gritted',{st:'attack',cls:'bow',t:.5}],['reload','gritted',{st:'reload'}],
  ['attack wind-up','gritted',{st:'attack',t:.1}],['attack','shouting',{st:'attack',t:.5}],['two-handed attack','shouting',{st:'attack',t:.5,cls:'two'}],['cast','shouting',{st:'cast',t:.5}],
  ['shield wall','gritted',{buffs:{shieldwall:1}}],['hit while braced','gritted',{st:'hit',t:.2,S:{wall:1}}],['hit','surprised',{st:'hit',t:.2}],['a big blow missed','surprised',{miss:300}],
  ['kill','happy',{kill:500}],['level up','happy',{lvl:500}],['victory','happy',{won:true}],['healed','content',{heal:400}],
  ['morale drops','surprised',{drop:200,mor:2}],['wavering','nervous',{mor:2}],['breaking','nervous',{mor:1}],['fleeing','nervous',{an:'flee',st:'walk'}],['low hp','nervous',{hpf:.2}],
  ['stunned','knocked out',{sts:{stun:1}}],['dying','surprised',{st:'death',t:.1}],['dead','knocked out',{st:'death',t:.6}]];
 for(const [nm,e,o] of CASES){const r=rule(o);if(r!==e)bad.push('half-orc '+nm+': '+r+' (want '+e+')')}
 n.expr=CASES.length;
 // the rules marked ho leave everyone else as before
 {const h=o=>rule(Object.assign({ho:false},o));if(h({st:'attack',t:.5})!=='gritted'||h({st:'hit',t:.2,S:{wall:1}})!=='surprised'||h({hpf:.1})!=='neutral'||h({blink:true})!=='neutral'||h({lvl:100})!=='neutral'||h({miss:100})!=='neutral')bad.push('the half-orc rules reach other races')}
 // the live pick: a fresh unit, then a kill, a level, a morale drop, a missed big blow, low hp
 {let T=1e6;const now0=window.anNow;window.anNow=()=>T;
  try{const u=merc({eq:{w:'greataxe',a:'scale'}}),L=usLook(u);u.mor=3;const pk=st=>headPick(u,L,st||'idle',0,'','swing').name;const id0=u.id;
   // a moment outside the calm window
   const ph=(((u.id!=null?u.id:u.m.id)|0)*2654435761>>>0)%7000;const calm=()=>((T+ph)%7000)<1400;const step=ms=>{T+=ms;while(calm())T+=200};
   step(0);if(pk()!=='neutral')bad.push('live: idle '+pk());
   u.m.kills=(u.m.kills|0)+1;step(500);if(pk()!=='happy')bad.push('live: after a kill '+pk());step(2000);pk();step(500);if(pk()!=='neutral')bad.push('live: kill wears off '+pk());
   u.m.lvl=(u.m.lvl|0)+1;step(500);if(pk()!=='happy')bad.push('live: level up '+pk());step(3000);pk();
   headNote(u,'miss',{wpn:{two:true}});T+=400;if(pk()!=='surprised')bad.push('live: a big blow missed '+pk());step(1500);pk();
   headNote(u,'miss',{wpn:{two:false}});step(400);if(pk()==='surprised')bad.push('live: a small miss surprised');
   u.mor=2;step(400);const a=pk();if(a!=='surprised')bad.push('live: morale falls '+a);step(1000);if(pk()!=='nervous')bad.push('live: wavering '+pk());
   u.mor=3;u.hp=Math.max(1,Math.floor((u.hpMax||u.hp)*.2));step(600);if(pk()!=='nervous')bad.push('live: low hp '+pk());
   u.hp=u.hpMax||u.hp;step(600);pk();step(600);T+=0;let c=0;for(let i=0;i<70;i++){T+=100;if(pk()==='content')c++}if(!(c>=5&&c<=30))bad.push('live: calm moments '+c+' of 70 samples');
   if(pk('hit')!=='surprised')bad.push('live: hit '+pk('hit'));
  }finally{window.anNow=now0}}
 // ---- every half-orc renders in every face and state ----
 for(const fem of[0,1])for(const eq of[{w:'arming',s:'kite',a:'mail'},{w:'greataxe',a:'scale',h:'kettle'},{w:'knife',a:'rags'}]){const u=merc({fem,eq});for(const face of[0,1,2,3])for(const st of Object.keys(UNIT_FRAMES)){const o=unitSpritePx(u,face,st,0);if(!o||!o.cv||!o.hum)bad.push('render '+fem+' '+JSON.stringify(eq)+' f'+face+' '+st)}}
 // ---- Detail Low: the old figure ----
 {const u=merc({});SET.detail='low';artChanged();const lo=unitSpritePx(u,0,'idle',0);if(!lo||lo.hum||lo.k)bad.push('Detail Low drew the composed half-orc');SET.detail='high';artChanged()}
 return{bad,n}});
let fails=R.bad.concat(errs);
if(ref){const D1=await p.evaluate(DIGEST);const o=await open(b,ref);const D0=await o.p.evaluate(DIGEST);let diff=[];for(const key in D0)if(D1[key]!==D0[key])diff.push(key);
 R.n.refCompared=Object.keys(D0).length;if(diff.length)fails.push('differs from the reference: '+diff.join(', '));fails=fails.concat(o.errs)}
else R.n.refCompared='skipped (no --ref)';
console.log(JSON.stringify(R.n));
if(fails.length)console.log('FAIL:\n'+fails.slice(0,40).join('\n'));else console.log('OK');
await b.close();process.exit(fails.length?1:0)})();
