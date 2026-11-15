/* ================= MAP VARIETY: world shapes and biome mixes (replay round; docs/replay-contract.md section 2) =================
   MAPSHAPES[k] = {n, d, land?}   the lie of the land. 'continent' is the generator as it always was: for any seed it gives the very
                                  same world, so old saves (which carry no shape) regenerate unchanged. land: the least mainland a new
                                  campaign accepts (createCampaign rerolls below it; default 1500 tiles in the small world).
   MAPBIOMES[k] = {n, d, c?}      the climate: c biases the biome assignment of genWorldBase's climate step (and with it battle maps,
                                  weather and the monsters that haunt each ground). 'temperate' is today's climate.
   G.shape, G.biomes              the keys of a campaign (absent in old saves: continent / temperate). setWorldShape(shape, biomes)
                                  sets the generator's globals WSHK / WBMK, like setWorldSize: call it before genWorld.
   msGen(seed, AK, SK)            what genWorldBase asks: null for continent + temperate (today's code path, untouched), else the
                                  hooks {seaQ, el, noSpines, massQ, ranges, join, carve, rivK, hillQ, bio}. Shape randomness comes from
                                  a stream of its own (mulberry(seed ^ salt)), never from the game stream rnd().
   rollShape(r) / rollBiomes(r)   the setup's 'Random' choices, drawn from the given stream (createCampaign passes the seeded rnd).
   ncShapeHTML()                  the new-company section: shape and climate buttons with small previews (one fixed preview seed, cached,
                                  painted a few at a time off the main beat).
   shapeRepair(g)                 repairSave: unknown or missing keys become the defaults. */
const MAPSHAPES={
 continent:{n:'Continent',d:'One broad land of ranges, rivers and coasts.'},
 archipelago:{n:'Archipelago',d:'Islands in a grey sea, joined by fords and narrow land bridges.',land:1050},
 valley:{n:'River valley',d:'One great river down a long valley, walled by mountains. Cross at the fords.',land:1500},
 highlands:{n:'Highlands',d:'Green basins walled by mountains. Whoever holds the passes holds the land.',land:1500},
 coast:{n:'Coastline',d:'A long coast on the open sea, the mountains at its back.',land:1300},
 inland:{n:'Inland sea',d:'A ring of land around a wide inland sea. Every road bends around the water.',land:1200}};
const MAPBIOMES={
 temperate:{n:'Temperate',d:'Snow in the far north, sand in the far south, green fields and woods between.'},
 frozen:{n:'Frozen north',d:'A long winter. Snowfields and bare hills reach far to the south.',
  c:{cold:.44,coldMin:.17,hot:.97,hotMax:.95,wet:.6,damp:.66,hillQ:.9}},
 dry:{n:'Dry south',d:'Sun-baked. Desert and stony hills, little forest, few rivers.',
  c:{cold:.035,coldMin:-1,hot:.44,hotMax:2,wet:.84,damp:.8,hillQ:.91,rivK:.7}},
 wild:{n:'Wild',d:'Deep forest and wide swamps. Few open fields and fewer friends.',
  c:{cold:.08,coldMin:-1,hot:.95,hotMax:2,wet:.4,damp:.36,low:.52,rivK:1.25}},
 mixed:{n:'Mixed',d:'Every kind of ground in patches: a snowfield may lie beside the dunes.',
  c:{tmA:1.2,tmB:.9,lat:.2,cold:.15,coldMin:-1,hot:.83,hotMax:2,wet:.55,damp:.6}}};
const MSKEYS=Object.keys(MAPSHAPES),MBKEYS=Object.keys(MAPBIOMES);
let WSHK='continent',WBMK='temperate';
function setWorldShape(k,b){WSHK=MAPSHAPES[k]?k:'continent';WBMK=MAPBIOMES[b]?b:'temperate';return WSHK}
function shapeKey(k){return MAPSHAPES[k]?k:'continent'}
function biomesKey(k){return MAPBIOMES[k]?k:'temperate'}
function shapeLand(k){const S=MAPSHAPES[shapeKey(k==null?WSHK:k)];return S.land||1500}
function rollShape(r){r=r||Math.random;return MSKEYS[Math.floor(r()*MSKEYS.length)%MSKEYS.length]}
function rollBiomes(r){r=r||Math.random;return MBKEYS[Math.floor(r()*MBKEYS.length)%MBKEYS.length]}
function shapeRepair(g){if(!g||typeof g!=='object')return;if(g.shape!==undefined&&!MAPSHAPES[g.shape])g.shape='continent';if(g.biomes!==undefined&&!MAPBIOMES[g.biomes])g.biomes='temperate'}
function shapeLine(g){g=g||(typeof G!=='undefined'?G:null);const s=MAPSHAPES[shapeKey(g&&g.shape)],b=MAPBIOMES[biomesKey(g&&g.biomes)];return s.n+' · '+b.n}

/* ---- the generators' hooks ---- */
function msRng(seed,salt){const r=mulberry((Math.imul((seed|0)^salt,0x9e3779b1)^0x85ebca6b)>>>0);r();r();return r}   // a shape's own stream, well stirred
// cells: k well-spread points inside the margin m (tiles), from stream r
function msCells(r,k,m,minD){const P=[];for(let g=0;g<k*60&&P.length<k;g++){const x=m+r()*(WN-1-2*m),y=m+r()*(WN-1-2*m);if(P.every(p=>Math.hypot(p[0]-x,p[1]-y)>=minD))P.push([x,y])}return P}
function msNear2(P,x,y){let d1=1e9,d2=1e9,a=-1,b=-1;for(let j=0;j<P.length;j++){const d=Math.hypot(P[j][0]-x,P[j][1]-y);if(d<d1){d2=d1;b=a;d1=d;a=j}else if(d<d2){d2=d;b=j}}return{d1,d2,a,b}}
function msFall(d,w,k){const e=clamp(1-d/w,0,1);return Math.pow(e,1.7)*k}
// a wandering spine of peaks from (x,y) along angle a; gaps (passes) every few tiles
function msSpine(c,pts,o){const T=c.tiles,cd=c.cd,r=c.rs;o=o||{};let gap=o.gap0||(5+Math.floor(r()*6));
 for(let k=0;k<pts.length;k++){const [x,y]=pts[k];if(--gap<=0){gap=(o.gapMin||7)+Math.floor(r()*(o.gapVar||6));k+=o.gapLen||2;continue}
  const rad=(o.rad||1.1)+r()*(o.radVar||.6),cx=Math.round(x),cy=Math.round(y);if(cx<3||cy<3||cx>=WN-3||cy>=WN-3)continue;
  for(let ay=-2;ay<=2;ay++)for(let ax=-2;ax<=2;ax++){const nx=cx+ax,ny=cy+ay;if(nx<3||ny<3||nx>=WN-3||ny>=WN-3)continue;const i=ny*WN+nx;if(T[i]===1&&cd[i]>=2&&Math.hypot(nx-x,ny-y)<=rad)T[i]=4}}}
const MSGEN={
 // islands: Voronoi cells pulled apart by channels along their borders; the join step lays land bridges over the narrows
 archipelago(seed,AK,SK){const rs=msRng(seed,0x51a7e),K=Math.max(5,Math.round((6+rs()*2)*Math.pow(AK,.8))),P=msCells(rs,K,7,WN*.2/Math.pow(AK,.1));
  return{rs,seaQ:.56,el(x,y,ux,uy,n,d){const q=msNear2(P,ux,uy),ch=clamp(1-(q.d2-q.d1)/(4.2*Math.sqrt(SK)),0,1),R=WN*.26/Math.sqrt(Math.max(1,AK*.8));
    return n*.62+.32*clamp(1-q.d1/R,0,1)-.55*ch*ch-msFall(d,10,.55)},
   join:{w:1,big:7.5,small:5.5,min:30},rivK:.8,hillQ:.95}},
 // one long valley between two ranges; the great river runs down it to the sea at one end (carve, after the mainland is joined)
 valley(seed,AK,SK){const rs=msRng(seed,0x7a11e),vert=rs()<.5,flip=rs()<.5,ph=rs()*6.283,amp=.07+rs()*.05,fr=1.1+rs()*.6;
  const U=(x,y)=>{const u=(vert?y:x)/(WN-1);return flip?1-u:u},V=(x,y)=>(vert?x:y)/(WN-1),V0=u=>.5+amp*Math.sin(u*Math.PI*fr+ph);
  const at=(u,v)=>{const a=flip?1-u:u,p=a*(WN-1),q=v*(WN-1);return vert?[q,p]:[p,q]};
  return{rs,seaQ:.22,noSpines:1,massQ:.988,hillQ:.94,rivK:.8,
   el(x,y,ux,uy,n,d){const u=U(ux,uy),dv=Math.abs(V(ux,uy)-V0(u))*WN;
    return .5+n*.3+.3*Math.pow(clamp(dv/(WN*.3),0,1.25),1.2)-.9*clamp((u-.88)/.1,0,1)*clamp(1-dv/(WN*.3),0,1)-msFall(d,6,1)},
   ranges(c){for(const s of [-1,1]){const pts=[],off=.235+c.rs()*.03;for(let u=.05;u<=.86;u+=1/(WN-1)){const w=Math.sin(u*9+s*2+ph)*.012;pts.push(at(u,V0(u)+s*(off+w)))}
     msSpine(c,pts,{gapMin:10,gapVar:8,gapLen:2,rad:1.5,radVar:.6})}},
   carve(c){const T=c.tiles,R=c.river,N=WN*WN;let s=-1,bv=1e9;
    for(let i=0;i<N;i++){if(T[i]===0||T[i]===4)continue;const x=i%WN,y=(i/WN)|0,u=U(x,y);if(u<.04||u>.12)continue;const v=Math.abs(V(x,y)-V0(u))*WN+u*20;if(v<bv){bv=v;s=i}}
    if(s<0)return;
    const res=wgPath([s],(k,n)=>{if(T[n]===4)return-1;if(T[n]===0)return U(n%WN,(n/WN)|0)>.6?.1:-1;const x=n%WN,y=(n/WN)|0,dv=Math.abs(V(x,y)-V0(U(x,y)))*WN;return .3+dv*dv*.06+c.el[n]*1.5},k=>k!==s&&T[k]===0&&U(k%WN,(k/WN)|0)>.6);
    if(res.end<0)return;const ch=wgChain(res.prev,res.end),L=ch.length-1,deep=Math.floor(L*.16),wide=Math.floor(L*.4),side=vert?1:WN;
    const water=new Uint8Array(N);
    for(let k=deep;k<L;k++){water[ch[k]]=1;if(k>=wide){const q=ch[k]+side,qx=q%WN,qy=(q/WN)|0;if(qx>=3&&qy>=3&&qx<WN-3&&qy<WN-3&&T[q]!==4)water[q]=1}}
    // fords every few tiles of the channel: land again, with the stream marked across it
    const ford=new Uint8Array(N);let nx=deep+3+Math.floor(c.rs()*3);
    for(let k=deep+2;k<L-3;k++){if(k<nx)continue;nx=k+(6+Math.floor(c.rs()*4))*Math.max(1,Math.round(SK*.8));ford[ch[k]]=1;water[ch[k]]=0;const q=ch[k]+side;if(water[q]){water[q]=0;ford[q]=1}}
    for(let i=0;i<N;i++)if(water[i]){T[i]=0;R[i]=0}
    for(let k=0;k<deep;k++)wgLink(R,ch[k],ch[k+1]);                       // the upper river: a stream down the valley head into the channel
    if(T[ch[deep]]===0)R[ch[deep]]=0;                                     // a mouth: the water tile carries no bits
    for(let i=0;i<N;i++)if(ford[i]){if(T[i]===0||T[i]===4)T[i]=1;const x=i%WN,y=(i/WN)|0;for(let j=0;j<4;j++){const m=(y+WDY[j])*WN+x+WDX[j];if(water[m]||ford[m]||(j===(vert?0:3)||j===(vert?2:1))&&T[m]===0)R[i]|=1<<j}}
    c.great=ch}}},
 // basins: Voronoi cells walled along their borders, one or two passes through every wall
 highlands(seed,AK,SK){const rs=msRng(seed,0x41e1d),K=Math.max(5,Math.round((5+rs()*2)*Math.pow(AK,.85))),P=msCells(rs,K,8,WN*.24/Math.pow(AK,.12));
  return{rs,seaQ:.3,noSpines:1,massQ:.992,hillQ:.9,
   el(x,y,ux,uy,n,d){const q=msNear2(P,ux,uy);return n*.55+.22-.08*clamp(1-q.d1/8,0,1)-msFall(d,9,.6)},
   ranges(c){const T=c.tiles,cd=c.cd,N=WN*WN,owner=new Int16Array(N).fill(-1),pair=new Map();
    for(let i=0;i<N;i++){const x=i%WN,y=(i/WN)|0,q=msNear2(P,x+(c.wx(x,y)-.5)*9,y+(c.wy(x,y)-.5)*9);owner[i]=q.a;
     if(T[i]===1&&cd[i]>=2&&q.d2-q.d1<1.5+c.rg(x,y)*.9){T[i]=4;const key=Math.min(q.a,q.b)*64+Math.max(q.a,q.b);let L=pair.get(key);if(!L)pair.set(key,L=[]);L.push(i)}}
    for(const key of [...pair.keys()].sort((a,b)=>a-b)){const L=pair.get(key);if(L.length<4)continue;const np=L.length>22*SK?2:1;
     for(let p=0;p<np;p++){const i0=L[Math.floor((p+.25+c.rs()*.5)/np*L.length)],x0=i0%WN,y0=(i0/WN)|0;
      for(let ay=-2;ay<=2;ay++)for(let ax=-2;ax<=2;ax++){const x=x0+ax,y=y0+ay;if(x<3||y<3||x>=WN-3||y>=WN-3)continue;const i=y*WN+x;if(T[i]===4&&Math.hypot(ax,ay)<=1.6)T[i]=1}}}}}},
 // a long coast: the land rises from the open sea on one side toward a mountain wall on the other
 coast(seed,AK,SK){const rs=msRng(seed,0xc0a57),side=Math.floor(rs()*4),ph=rs()*6.283;
  const T0=(x,y)=>(side===0?y:side===1?WN-1-x:side===2?WN-1-y:x)/(WN-1),S0=(x,y)=>(side===0||side===2?x:y)/(WN-1);
  const edgeLand=(x,y)=>{const a=[y,WN-1-x,WN-1-y,x];let m=1e9;for(let j=0;j<4;j++)if(j!==side)m=Math.min(m,a[j]);return m};
  return{rs,seaQ:.36,massQ:.98,
   el(x,y,ux,uy,n,d){const t=T0(ux,uy),s=S0(ux,uy),c0=.34+.07*Math.sin(s*Math.PI*2.2+ph);
    return n*.5+(t-c0)*1.25-msFall(edgeLand(x,y),5,.5)-msFall(side===0?y:side===1?WN-1-x:side===2?WN-1-y:x,9,.4)},
   ranges(c){const pts=[];for(let s=.06;s<=.94;s+=1/(WN-1)){const t=.86+.03*Math.sin(s*11+ph),p=s*(WN-1),q=(side===0||side===3?t:1-t)*(WN-1);pts.push(side===0||side===2?[p,q]:[q,p])}
    msSpine(c,pts,{gapMin:12,gapVar:8,gapLen:2,rad:1.3,radVar:.6})}}},
 // a wide sea in the middle, a ring of land around it
 inland(seed,AK,SK){const rs=msRng(seed,0x1a4d5),cx=(WN-1)*(.5+(rs()-.5)*.06),cy=(WN-1)*(.5+(rs()-.5)*.06),rx=.29+rs()*.04,ry=.29+rs()*.04;
  return{rs,seaQ:.44,rivK:1,
   el(x,y,ux,uy,n,d){const q=Math.hypot((ux-cx)/(WN*rx),(uy-cy)/(WN*ry)),bowl=Math.pow(clamp(1-q,0,1),.6);
    return n*.5+.18-.95*bowl+.3*clamp(1-Math.abs(q-1.35)/.4,0,1)-msFall(d,8,.6)}}}};
function msGen(seed,AK,SK){const sk=WSHK,bk=WBMK;if(sk==='continent'&&bk==='temperate')return null;
 const H=sk!=='continent'&&MSGEN[sk]?MSGEN[sk](seed,AK,SK):{},C=MAPBIOMES[bk].c||null;H.shape=sk;H.biomes=bk;H.bio=C;
 if(C){if(C.hillQ!=null)H.hillQ=C.hillQ;if(C.rivK!=null)H.rivK=(H.rivK||1)*C.rivK}return H}

/* ---- the setup section: shape and climate, each with a small preview of a fixed seed ---- */
const MSPREV={seed:20261115,map:new Map(),q:[],busy:0};
function msPrevKey(s,b){return s+'|'+b}
function msPreviewData(s,b){const key=msPrevKey(s,b);if(MSPREV.map.has(key))return MSPREV.map.get(key);
 const wk=WSZK,s0=WSHK,b0=WBMK;let out=null;
 try{setWorldSize('small');setWorldShape(s,b);const w=genWorldBase(MSPREV.seed);out=msPaint(w)}catch(e){out=null}finally{setWorldShape(s0,b0);setWorldSize(wk)}
 MSPREV.map.set(key,out);return out}
function msPaint(w){if(typeof document==='undefined')return null;const n=WN,cv=document.createElement('canvas');if(!cv||!cv.getContext)return null;cv.width=cv.height=n;const g=cv.getContext('2d');if(!g||!g.createImageData)return null;
 const im=g.createImageData(n,n),d=im.data,rgb={};const col=k=>{if(rgb[k])return rgb[k];const h=(PAL[k]||'#000000').slice(1),v=parseInt(h,16);return rgb[k]=[v>>16,v>>8&255,v&255]};
 for(let i=0;i<n*n;i++){const t=w.tiles[i],k=typeof worldKeyColor==='function'?worldKeyColor(t,w.river[i],w.road[i]):(t?'v':'0'),c=col(PAL[k]?k:'0');d[i*4]=c[0];d[i*4+1]=c[1];d[i*4+2]=c[2];d[i*4+3]=255}
 for(const t of w.towns){const x=Math.floor(t.x/TS),y=Math.floor(t.y/TS),c=col('E');for(let a=-1;a<=0;a++)for(let b=-1;b<=0;b++){const j=((y+a)*n+x+b)*4;if(j>=0&&j<d.length){d[j]=c[0];d[j+1]=c[1];d[j+2]=c[2]}}}
 g.putImageData(im,0,0);try{return cv.toDataURL()}catch(e){return null}}
// fill the preview images a couple at a time, off the main beat (each costs a small-world generation, ~40 ms)
function msPrevPump(){MSPREV.busy=0;if(typeof document==='undefined')return;const t0=Date.now();
 while(MSPREV.q.length&&Date.now()-t0<60){const [s,b]=MSPREV.q.shift(),src=msPreviewData(s,b),el=document.querySelectorAll?document.querySelectorAll('img[data-msp="'+msPrevKey(s,b)+'"]'):[];
  if(src)for(const e of el)e.src=src}
 if(MSPREV.q.length){MSPREV.busy=1;setTimeout(msPrevPump,16)}}
function msPrevImg(s,b){const key=msPrevKey(s,b),src=MSPREV.map.get(key);if(!src&&!MSPREV.q.some(q=>q[0]===s&&q[1]===b))MSPREV.q.push([s,b]);
 return`<img class="msp" data-msp="${key}" alt=""${src?` src="${src}"`:''} width="64" height="64">`}
function ncShapeHTML(){if(typeof NCS!=='object')return'';if(NCS.shape!=='random'&&!MAPSHAPES[NCS.shape])NCS.shape='continent';if(NCS.biomes!=='random'&&!MAPBIOMES[NCS.biomes])NCS.biomes='temperate';
 const sk=NCS.shape,bk=NCS.biomes,pb=bk==='random'?'temperate':bk,ps=sk==='random'?'continent':sk;
 const rnd1=(k,on)=>`<button class="ncs-ms ms-rnd${on?' on':''}" role="radio" aria-checked="${on}" onclick="ncSet('${k}','random')"><i class="msp msp-rnd" aria-hidden="true">?</i><b>Random</b></button>`;
 const sd=sk==='random'?'Rolled when the company is raised.':MAPSHAPES[sk].d,bd=bk==='random'?'Rolled when the company is raised.':MAPBIOMES[bk].d;
 const h=`<div class="ncs-sec"><b>Shape</b><small>${htmlEsc(sd)}</small></div><div class="ncs-mss" role="radiogroup" aria-label="World shape">${MSKEYS.map(k=>`<button class="ncs-ms${sk===k?' on':''}" role="radio" aria-checked="${sk===k}" onclick="ncSet('shape','${k}')">${msPrevImg(k,pb)}<b>${MAPSHAPES[k].n}</b></button>`).join('')}${rnd1('shape',sk==='random')}</div>
 <div class="ncs-sec"><b>Climate</b><small>${htmlEsc(bd)}</small></div><div class="ncs-mss" role="radiogroup" aria-label="Climate">${MBKEYS.map(k=>`<button class="ncs-ms${bk===k?' on':''}" role="radio" aria-checked="${bk===k}" onclick="ncSet('biomes','${k}')">${msPrevImg(ps,k)}<b>${MAPBIOMES[k].n}</b></button>`).join('')}${rnd1('biomes',bk==='random')}</div>`;
 if(MSPREV.q.length&&!MSPREV.busy){MSPREV.busy=1;setTimeout(msPrevPump,30)}return h}
