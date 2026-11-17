// Human figures test (browser):  node test/humans.js [html]
// The Detail High battle figures composed from the parts sheets (73j-humanatlas.js + 73k-humans.js): every background x race (human,
// elf, half-orc in both skin tones, dwarf) x man / woman, every person enemy type, every helmet, body armour, shield and weapon on a
// figure, all four faces and every state and frame. Checks: no page errors, the sprite is the composed one (hum), not empty, the feet
// anchor inside the frame, the weapon in the right hand and the shield on the left arm (its inside, behind the body on the far arm; its face with
// the device in front on the near arm), a second draw is a cache hit (same object), the elf / half-orc / dwarf pieces are the race's own, dwarves
// stand shorter than humans, and Detail Low still draws the old pixel figure (and monsters never come here).
const {chromium}=require('playwright'),path=require('path');
(async()=>{const f=path.resolve(process.argv[2]||'dist/index.html');const b=await chromium.launch(),p=await b.newPage({viewport:{width:667,height:375}});const errs=[];
p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
await p.goto('file://'+f);await p.waitForTimeout(300);
await p.evaluate(()=>{newGame();closeSheet();humImg()});await p.waitForFunction(()=>typeof humReady==='function'&&humReady(),null,{timeout:20000});
const R=await p.evaluate(()=>{const bad=[],n={sprites:0,looks:0,hits:0},t0=performance.now();const ST=Object.keys(UNIT_FRAMES);
 const base=G.roster[0];let mid=0;
 const merc=(o)=>{let m=null;for(let i=0;i<600;i++){m=JSON.parse(JSON.stringify(base));m.id=70000+(++mid);m.name='Hx'+i+':'+(o.bg||'');m.race=o.race||'human';m.bg=o.bg||'sellsword';m.colors=null;
   m.eq=Object.assign({w:null,b:null,s:null,a:null,h:null,c:null},o.eq||{});if(o.fem==null&&!o.skin)break;const P=ptMercSpec(m);if((o.fem==null||!!P.fem===!!o.fem)&&(!o.skin||P.skin===PT_SKIN[o.skin]))break}
  return mkPlayerUnit(m)};
 const chk=(u,tag,faces,states,all)=>{const L=usLook(u);if(!humWant(L)){bad.push(tag+': not composed');return}n.looks++;
  for(const face of faces)for(const st of states){const nf=all?UNIT_FRAMES[st]:1;for(let fr=0;fr<nf;fr++){const o=unitSpritePx(u,face,st,fr);n.sprites++;const id=tag+' f'+face+' '+st+fr;
   if(!o||!o.cv||!o.cv.width||!o.cv.height){bad.push(id+': no sprite');continue}if(!o.hum){bad.push(id+': not the composed figure');continue}
   const w=o.cv.width/o.k,h=o.cv.height/o.k;if(!(o.ax>=0&&o.ax<=w&&o.ay>=0&&o.ay<=h+.5))bad.push(id+': anchor outside the frame '+[o.ax.toFixed(1),o.ay.toFixed(1),w.toFixed(1),h.toFixed(1)]);
   if(n.sprites%7===0){const d=o.cv.getContext('2d').getImageData(0,0,o.cv.width,o.cv.height).data;let a=0;for(let i=3;i<d.length;i+=16)a+=d[i];if(!a)bad.push(id+': empty')}
   if(o.hand){if(o.hand.w!==o.hand.right)bad.push(id+': the weapon is not in the right hand');if(o.hand.shield&&o.hand.shield===o.hand.right)bad.push(id+': the shield is not on the left arm');if(o.hand.shield){const L=o.hand.layers;if(o.hand.shield==='b'?L!=='back,torso':L!=='torso,front')bad.push(id+': shield on the '+(o.hand.shield==='b'?'far':'near')+' arm drawn as '+L);n.shieldChecks=(n.shieldChecks||0)+1}}else bad.push(id+': no hand tags');
   const o2=unitSpritePx(u,face,st,fr);if(o2!==o)bad.push(id+': rebuilt on the second draw');else n.hits++}}};
 const RACES=[['human'],['elf'],['halforc','orc'],['halforc','ashorc'],['dwarf']];
 // every background x race x sex: front and back idle; one per race x sex: every face, state and frame
 for(const bg in BG)for(const [race,skin] of RACES)for(const fem of[0,1]){const u=merc({race,bg,fem,skin,eq:(()=>{const m=newMerc(bg);return m.eq})()});chk(u,bg+'/'+race+(skin||'')+(fem?'F':'M'),[0,2],['idle'],0)}
 for(const [race,skin] of RACES)for(const fem of[0,1])chk(merc({race,fem,skin,eq:{w:'arming',s:'kite',a:'mail',h:'kettle'}}),'all/'+race+(skin||'')+(fem?'F':'M'),[0,1,2,3],ST,1);
 // the race's own pieces
 const pcs=(u,v)=>{const L=usLook(u),hs=humSpec(L);return hs.pn('head',v)+' '+hs.pn('torso',v)+' '+hs.pn('leg',v,'a')};
 const want={human:/^head_f torso_[mw]f leg_/,elf:/^elf_f torso_/,halforc:/^ohead2?_f otorso_/,dwarf:/^dhead2?_f dtorso_/};
 for(const race in want){const u=merc({race,fem:0});if(!want[race].test(pcs(u,'f')))bad.push(race+': pieces '+pcs(u,'f'))}
 {const uf=merc({race:'dwarf',fem:1}),uo=merc({race:'halforc',fem:1});if(!/^dhead2_f dtorso_wf/.test(pcs(uf,'f')))bad.push('dwarf woman: pieces '+pcs(uf,'f'));if(!/^ohead2_f otorso_wf/.test(pcs(uo,'f')))bad.push('half-orc woman: pieces '+pcs(uo,'f'))}
 {const o1=merc({race:'halforc',skin:'orc'}),o2=merc({race:'halforc',skin:'ashorc'});if(humSpec(usLook(o1)).C.skin===humSpec(usLook(o2)).C.skin)bad.push('half-orc skin tones are not tinted apart')}
 // dwarves stand shorter (bald, no helmet: the head top)
 {const top=race=>{let best=null;for(let i=0;i<40&&!best;i++){const u=merc({race,fem:0,eq:{a:'padded',w:'knife'}});if(ptMercSpec(u.m).hair==='bald'||ptMercSpec(u.m).hair==='crop')best=u}const u=best||merc({race,fem:0,eq:{a:'padded',w:'knife'}});return unitSpritePx(u,0,'idle',0).ay};
  const th=top('human'),td=top('dwarf');if(!(td<th-1))bad.push('dwarves are not shorter: '+td.toFixed(1)+' vs '+th.toFixed(1))}
 // every helmet, body armour, shield and weapon on a figure
 for(const id in ITEMS){const I=ITEMS[id];let eq=null,st=['idle'];if(I.k==='h')eq={h:id,a:'padded',w:'shortsword'};else if(I.k==='a')eq={a:id,w:'shortsword'};else if(I.k==='s')eq={s:id,a:'mail',w:'arming'};else if(I.k==='w'){eq={w:id,a:'leather'};st=['idle','attack','swap','reload','death']}else continue;
  chk(merc({race:'human',eq}),I.k+':'+id,[0,1,2,3],st,I.k==='w')}
 // every person enemy type (and none of the others)
 const people=[];for(const id in EN){let u;try{u=mkEnemy(id,EN[id].f||'bandit')}catch(e){continue}const L=usLook(u);if(L.S.kind!=='hum'||!humWant(L))continue;people.push(id);chk(u,'en:'+id,[0,1,2,3],ST,1)}
 for(const id of['brigand','thug','braid','bmark','gmurm','samurai','barbz','necro'])if(EN[id]&&people.indexOf(id)<0)bad.push(id+': a person enemy is not composed');
 for(const id of['gob','gobarch','orcw','skel','zomb','wolf','bear','ogre','imp','vknight'])if(people.indexOf(id)>=0)bad.push(id+': a non-person is composed');
 // house soldiers in livery: the coat is on the look
 {const h=(G.houses||[])[0];if(h){const u=mkEnemy('braid',h.id);const L=usLook(u);if(!L.S.coat)bad.push('house soldier without a coat');chk(u,'house braid',[0,2],['idle'],0)}}
 // right-handed in every facing: a mirrored face is not a pixel mirror of the unmirrored one
 for(const [fa,fb] of[[0,1],[2,3]]){const u=merc({race:'human',fem:0,eq:{w:'arming',s:'heater2',a:'mail'}});const A=unitSpritePx(u,fa,'idle',0),Bm=unitSpritePx(u,fb,'idle',0);
  const W=Math.ceil(Math.max(A.cv.width,Bm.cv.width)*1.6),H=Math.ceil(Math.max(A.cv.height,Bm.cv.height)*1.2),c1=document.createElement('canvas'),c2=document.createElement('canvas');c1.width=c2.width=W;c1.height=c2.height=H;
  const q1=c1.getContext('2d'),q2=c2.getContext('2d'),k=A.k,X=W/2,Y=H-4;q1.translate(X,0);q1.scale(-1,1);q1.drawImage(A.cv,-A.ax*k,Y-A.ay*k);q2.drawImage(Bm.cv,X-Bm.ax*k,Y-Bm.ay*k);
  const d1=q1.getImageData(0,0,W,H).data,d2=q2.getImageData(0,0,W,H).data;let n1=0,dif=0;for(let i=3;i<d1.length;i+=4){if(d1[i]>128||d2[i]>128){n1++;if((d1[i]>128)!==(d2[i]>128)||Math.abs(d1[i-3]-d2[i-3])+Math.abs(d1[i-2]-d2[i-2])+Math.abs(d1[i-1]-d2[i-1])>90)dif++}}
  if(!(dif>n1*.08))bad.push('face '+fb+' is a plain mirror of face '+fa+' ('+dif+' of '+n1+' px differ)');n.mirrorDiff=(n.mirrorDiff||'')+fb+':'+(dif/n1).toFixed(2)+' '}
 // the skeleton: every animation sampled at 9 times in every face for a few loadouts: slots present, hands and shield rules, a stable box
 {const k=humK(),T=[0,.12,.24,.3,.38,.5,.62,.8,1];let n2=0;
  for(const eq of[{w:'arming',s:'heater2',a:'mail'},{w:'warbow',a:'leather',b:'knife'},{w:'greataxe',a:'scale'},{w:'crossbow',a:'padded'},{w:'musket',a:'leather'},{w:'focus',a:'robe'},{w:'waraxe',s:'hatchet',a:'mail'},{w:'spear',s:'kite',a:'mail'},{w:'knife',a:'rags'},{a:'padded'}]){
   const u=merc({race:'human',eq}),L=usLook(u);
   for(const nm in HUM_AN)for(const face of[0,1,2,3])for(const t of T){const st=nm==='swing'||nm==='two'||nm==='thrust'||nm==='dagger'||nm==='punch'||nm==='bash'||nm==='staff'||nm==='gun'||nm==='bow'?'attack':/^reload/.test(nm)?'reload':nm;
    const Fr=humSkFrame(L,face,st,t,k,nm==='bash'?'bash':'');n2++;const id='skel '+JSON.stringify(eq)+' '+nm+' f'+face+' t'+t;
    if(!Fr.list.length||!Fr.list.some(x=>x.tag==='torso')||!Fr.list.some(x=>x.tag==='head')){bad.push(id+': missing slots');continue}
    if(Fr.hand.w!==Fr.hand.right)bad.push(id+': weapon not in the right hand');
    if(Fr.hand.shield){if(Fr.hand.shield===Fr.hand.right)bad.push(id+': shield on the right arm');const Lr=Fr.hand.layers;if(Fr.hand.shield==='b'?Lr!=='back,torso':Lr!=='torso,front')bad.push(id+': shield order '+Lr)}
    const b=humSkBox({list:Fr.list.filter(x=>x.tag==='leg'||x.tag==='torso'||x.tag==='head')});if(!(nm==='death'&&t>.6)&&!(b[3]<=(nm==='death'?50:40)&&b[3]>-30&&b[1]>-600&&b[2]-b[0]<700))bad.push(id+': body box '+b.map(x=>x|0));   // the feet stay on the ground
    for(const it of Fr.list)if(it.m.some(x=>!isFinite(x))){bad.push(id+': bad matrix '+it.tag);break}}}
  n.skelSamples=n2;
  // the live path: the board asks humLiveFrame for a person, never for a monster
  const v={pS:'attack',pF:1,pPh:.38,pCy:0,pD:0,pAn:''};const lf=humLiveFrame(merc({race:'elf',eq:{w:'arming'}}),v);if(!lf||!lf.list.length)bad.push('live frame missing for a person');
  const g0=mkEnemy('gob','gob');if(humLiveFrame(g0,v))bad.push('live skeleton for a goblin');
  // the per-frame cost of a live figure (pose + blit)
  const c=document.createElement('canvas');c.width=200;c.height=200;const q=c.getContext('2d');const us=[];for(let i=0;i<24;i++)us.push(merc({race:['human','elf','dwarf','halforc'][i&3],eq:[{w:'arming',s:'heater2',a:'mail',h:'kettle'},{w:'warbow',a:'leather'},{w:'greataxe',a:'scale'},{w:'crossbow',a:'padded'}][i&3]}));
  for(const u of us)for(let f=0;f<4;f++)for(const st of['idle','walk'])humLiveFrame(u,{pS:st,pF:0,pPh:0,pCy:0,pD:f,pAn:''});const t1=performance.now();let nf=0;for(let r=0;r<20;r++)for(const u of us){const F=humLiveFrame(u,{pS:r&1?'walk':'idle',pF:0,pPh:0,pCy:r/7,pD:r&3,pAn:''});humSkDraw(q,F,100,180);nf++}
  n.liveMs=+((performance.now()-t1)/nf).toFixed(3);if(n.liveMs>0.3)bad.push('a live figure costs '+n.liveMs+' ms')}
 // Detail Low: the old figure, never the composed one; back to High: composed again
 const u0=merc({race:'elf',fem:1,eq:{w:'warbow',a:'leather',h:'hood'}});const hi=unitSpritePx(u0,0,'idle',0);
 SET.detail='low';artChanged();const lo=unitSpritePx(u0,0,'idle',0);if(!lo||lo.hum||lo.k)bad.push('Detail Low drew the composed figure');
 const box=unitSpriteBox(u0);if(humLiveFrame(u0,{pS:'idle',pF:0,pPh:0,pCy:0,pD:0,pAn:''}))bad.push('Detail Low drew the skeleton');SET.detail='high';artChanged();const hi2=unitSpritePx(u0,0,'idle',0);if(!hi2||!hi2.hum)bad.push('Detail High after Low is not composed');if(!hi||!hi.hum)bad.push('first high draw not composed');
 if(!(unitSpriteBox(u0).h>=26&&unitSpriteBox(u0).h<=34))bad.push('figure box height '+unitSpriteBox(u0).h);
 const ms=performance.now()-t0;return{bad,n,people:people.length,ms:Math.round(ms),builds:HUM.builds,buildMs:+(HUM.ms/Math.max(1,HUM.builds)).toFixed(2),tint:HUM.tint,live:Math.round((HUM.live||0)/1e6)}});
console.log(JSON.stringify(Object.assign({},R,{bad:R.bad.length})));
const fails=R.bad.concat(errs);if(fails.length)console.log('FAIL:\n'+fails.slice(0,40).join('\n')+(fails.length>40?'\n... '+(fails.length-40)+' more':''));else console.log('OK');
await b.close();process.exit(fails.length?1:0)})();
