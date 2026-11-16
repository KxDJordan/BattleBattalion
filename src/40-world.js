/* ================= WORLD =================
   Data (see CONTRACT.md): W = {seed, tiles, ok, river, road, spd, size, towns, sites, seen, fogRev, img}
     tiles  Uint8Array(WN*WN)  0 water 1 plains 2 forest 3 hills 4 mountains 5 swamp 6 desert 7 snow
     ok     Uint8Array         1 = the company can stand there (the connected mainland)
     river  Uint8Array         bitmask of river links to the 4 neighbours: 1 N, 2 E, 4 S, 8 W. A mouth points at its
                               water tile; water tiles themselves carry 0.
     road   Uint8Array         same encoding. A tile with both is a bridge.
     spd    Float32Array       march speed factor of the tile (0 = impassable): see tileSpeedOf()
     towns  [{name,x,y,size}]  generated town sites (G.towns copies them and adds game state)
     sites  [{kind:'ruin',x,y,n}]  n = index into RUINS
     seen   Uint8Array         fog of war memory (1 = seen at some time); W.fogRev counts changes
   Everything in W comes from the seed alone through mulberry(seed); the game stream rnd() is never used here.
   Public: genWorld tileAt okAt speedAt lineClear randOk placeTowns findPath routeTo goTo setRoute clearRoute
           seenAt visibleAt visionRadius bandSight fogReveal fogPack fogLoad weatherFx partyStrength siteSheet
           companyPower spawnProg factionPool factionSpot rollFaction lairTitle (spawn ranges, below spawnParty's comment) */
/* more town names for the larger worlds (the small world draws from TOWNN alone, as it always did) */
const TOWNX=['Kestrel Ford','Bramblecote','Oxenhold','Wyvernhythe','Fallowmere','Corvid Hill','Saltmarsh Quay','Duskwater','Hearthlow','Ironbridge','Mossgate','Wendlebury','Gallows Reach','Cinderfold','Larkspur','Redcliffe','Hollinbrook','Tarnwick','Briarholt','Coldharbour','Sheepwash'];
const WCO=48,WBAND=35.2,WHRS=.8;                       // company / band speed in world units per second at factor 1; hours per second of march
const ROADSPD=1.6,RIVERMUL=.45;                        // a road tile marches at 1.6 on any ground; an unbridged river tile at 45% of its ground
const WDX=[0,1,0,-1],WDY=[-1,0,1,0];                   // N E S W, bit = 1<<d
const WTHR={clear:{n:'Clear skies',spd:1,vis:1},rain:{n:'Rain',spd:.92,vis:.85},snow:{n:'Snowfall',spd:.88,vis:.75},storm:{n:'Storm',spd:.82,vis:.65},fog:{n:'Fog',spd:.96,vis:.5},sand:{n:'Sandstorm',spd:.8,vis:.55}};
const WTHRBIO={plains:[['clear',60],['rain',22],['storm',6],['fog',12]],forest:[['clear',50],['rain',28],['storm',6],['fog',16]],hills:[['clear',55],['rain',20],['storm',12],['fog',13]],
 swamp:[['clear',36],['rain',30],['storm',5],['fog',29]],desert:[['clear',76],['sand',24]],snow:[['clear',46],['snow',38],['storm',6],['fog',10]]};
const WVIS=[1,1,.62,1.3,1,.7,1.1,1],WVISBASE=7;        // sight by ground under the company, times 7 tiles
const B64C='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/* ---- binary heap (keys with float priorities) ---- */
// typed arrays (one pair shared by every heap, as only one is in use at a time), the same sift steps as plain arrays had
const WGHB={k:new Int32Array(1024),f:new Float64Array(1024)};
function wgHeap(){return{k:WGHB.k,f:WGHB.f,n:0}}
function wgPush(h,k,f){if(h.n>=h.k.length){const K=new Int32Array(h.k.length*2),F=new Float64Array(h.k.length*2);K.set(h.k);F.set(h.f);h.k=WGHB.k=K;h.f=WGHB.f=F}
 const K=h.k,F=h.f;let i=h.n++;while(i>0){const p=(i-1)>>1;if(F[p]<=f)break;K[i]=K[p];F[i]=F[p];i=p}K[i]=k;F[i]=f}
function wgPop(h){const K=h.k,F=h.f,top=K[0],n=--h.n,k=K[n],f=F[n];
 if(n>0){let i=0;for(;;){let c=2*i+1;if(c>=n)break;if(c+1<n&&F[c+1]<F[c])c++;if(F[c]>=f)break;K[i]=K[c];F[i]=F[c];i=c}K[i]=k;F[i]=f}return top}

/* ---- generation helpers (4-neighbour grids) ---- */
function wgBfs(src){const N=WN*WN,d=new Int16Array(N).fill(999),q=[];for(let i=0;i<N;i++)if(src(i)){d[i]=0;q.push(i)}
 for(let h=0;h<q.length;h++){const k=q[h],x=k%WN,y=(k/WN)|0;for(let j=0;j<4;j++){const nx=x+WDX[j],ny=y+WDY[j];if(nx<0||ny<0||nx>=WN||ny>=WN)continue;const n=ny*WN+nx;if(d[n]>d[k]+1){d[n]=d[k]+1;q.push(n)}}}return d}
// Dijkstra from the start tiles; cost(k,n,dir) < 0 blocks the step; stops at the first tile stop() accepts.
function wgPath(starts,cost,stop){const N=WN*WN,dist=new Float32Array(N).fill(1e9),prev=new Int32Array(N).fill(-1),done=new Uint8Array(N),h=wgHeap();
 for(const s of starts){dist[s]=0;wgPush(h,s,0)}let end=-1;
 while(h.n){const k=wgPop(h);if(done[k])continue;done[k]=1;if(stop&&stop(k,dist[k])){end=k;break}const x=k%WN,y=(k/WN)|0;
  for(let j=0;j<4;j++){const nx=x+WDX[j],ny=y+WDY[j];if(nx<0||ny<0||nx>=WN||ny>=WN)continue;const n=ny*WN+nx;if(done[n])continue;const c=cost(k,n,j);if(c<0)continue;
   const nd=dist[k]+c;if(nd<dist[n]){dist[n]=nd;prev[n]=k;wgPush(h,n,nd)}}}
 return{end,prev,dist}}
function wgChain(prev,end){const p=[];for(let k=end;k>=0;k=prev[k])p.push(k);return p.reverse()}
function wgLink(mask,a,b){const d=b-a,j=d===-WN?0:d===1?1:d===WN?2:3;mask[a]|=1<<j;mask[b]|=1<<((j+2)%4)}
function wgComps(pass){const N=WN*WN,comp=new Int32Array(N).fill(-1),sizes=[];
 for(let i=0;i<N;i++){if(comp[i]>=0||!pass(i))continue;const id=sizes.length,q=[i];comp[i]=id;let n=0;
  while(q.length){const k=q.pop();n++;const x=k%WN,y=(k/WN)|0;for(let j=0;j<4;j++){const nx=x+WDX[j],ny=y+WDY[j];if(nx<0||ny<0||nx>=WN||ny>=WN)continue;const m=ny*WN+nx;if(comp[m]<0&&pass(m)){comp[m]=id;q.push(m)}}}
  sizes.push(n)}
 let best=-1;for(let i=0;i<sizes.length;i++)if(best<0||sizes[i]>sizes[best])best=i;return{comp,sizes,best}}
function tileSpeedOf(t,river,road){if(t===0||t===4)return 0;return road?ROADSPD:river?SPD[t]*RIVERMUL:SPD[t]}

/* ---- the generator ---- */
let WGCACHE=null;
function genWorld(seed){seed=(Number(seed)||0)|0;const shk=(typeof WSHK==='string'?WSHK:'')+'|'+(typeof WBMK==='string'?WBMK:'');if(!WGCACHE||WGCACHE.seed!==seed||WGCACHE.n!==WN||WGCACHE.shk!==shk){WGCACHE=genWorldBase(seed);WGCACHE.shk=shk};const b=WGCACHE;
 const w={seed,tiles:b.tiles,ok:b.ok,river:b.river,road:b.road,spd:b.spd,size:b.size,towns:b.towns,sites:b.sites,seen:new Uint8Array(WN*WN),fogRev:0,fogKey:-1,img:null};
 // the East (19-east.js): eastGen(w) marks the eastern region once per generated base world (w.east, towns t.east); later copies share it
 if(typeof eastGen==='function'){if(!b.eg){b.eg=1;try{eastGen(w)}catch(e){if(typeof console!=='undefined')console.warn('eastGen failed',e)}b.east=w.east;b.ex={};for(const k in w)if(!(k in b)&&k!=='seen'&&k!=='fogRev'&&k!=='fogKey'&&k!=='img'&&k!=='east')b.ex[k]=w[k]}else{if(b.east!==undefined)w.east=b.east;if(b.ex)for(const k in b.ex)w[k]=b.ex[k]}}
 return w}
/* Scales with the world size (WN): ranges, rivers, ruins and the number of towns grow with the land; the small world (64) is exactly as before. */
function genWorldBase(seed){const N=WN*WN,AK=WN*WN/4096,SK=Math.sqrt(AK),NT=(WORLDSZ[WSZK]&&WORLDSZ[WSZK].n===WN?WORLDSZ[WSZK].towns:Math.round(12*AK/Math.pow(AK,.2))),r=mulberry(seed),nz=sc=>{const f=noiseFn(r,sc,WN+2);return(x,y)=>f(clamp(x,0,WN+1),clamp(y,0,WN+1))};
 const a1=nz(24),a2=nz(12),a3=nz(6),a4=nz(3),wx=nz(15),wy=nz(15),rg=nz(13),rg2=nz(5),mo1=nz(14),mo2=nz(6),te=nz(18),jit=nz(2.2),rj=nz(3.5);
 const el=new Float32Array(N),ridge=new Float32Array(N),tiles=new Uint8Array(N),river=new Uint8Array(N),road=new Uint8Array(N);
 const SH=typeof msGen==='function'?msGen(seed,AK,SK):null,BM=SH&&SH.bio;   // world shape and biome mix (39-mapshapes.js): null = the continent as it always was
 const edgeOf=i=>{const x=i%WN,y=(i/WN)|0;return Math.min(x,y,WN-1-x,WN-1-y)};
 // 1. elevation: warped fractal noise, pulled under the sea toward the map edge
 for(let y=0;y<WN;y++)for(let x=0;x<WN;x++){const i=y*WN+x,ux=x+(wx(x,y)-.5)*14,uy=y+(wy(x,y)-.5)*14,d=Math.min(x,y,WN-1-x,WN-1-y),e=clamp(1-d/12,0,1),rr=Math.hypot(x-(WN-1)/2,y-(WN-1)/2)/(WN/2);
  el[i]=SH&&SH.el?SH.el(x,y,ux,uy,a1(ux,uy)*.5+a2(ux,uy)*.26+a3(x,y)*.15+a4(x,y)*.09,d):a1(ux,uy)*.5+a2(ux,uy)*.26+a3(x,y)*.15+a4(x,y)*.09-Math.pow(e,1.7)*.55-Math.max(0,rr-1.02)*1.2;
  ridge[i]=(1-Math.abs(2*rg(ux,uy)-1))*.8+rg2(x,y)*.2}
 const PV=new Float64Array(N),pct=(arr,keep,q)=>{let n=0;for(let i=0;i<N;i++)if(keep(i))PV[n++]=arr[i];if(!n)return 0;const v=PV.subarray(0,n).sort();return v[Math.min(n-1,Math.floor(n*q))]};   // a typed sort: the same order as (a,b)=>a-b
 const sea=pct(el,()=>true,SH&&SH.seaQ!=null?SH.seaQ:.47);let top=sea+1e-6;for(let i=0;i<N;i++)if(el[i]>top)top=el[i];
 for(let i=0;i<N;i++){tiles[i]=el[i]>sea&&edgeOf(i)>=3?1:0;el[i]=clamp((el[i]-sea)/(top-sea),0,1)}
 // drop specks: single land tiles in the sea and one-tile puddles
 for(let pass=0;pass<2;pass++)for(let i=0;i<N;i++){const x=i%WN,y=(i/WN)|0;if(x<1||y<1||x>=WN-1||y>=WN-1)continue;let same=0;for(let j=0;j<4;j++)if(tiles[i+WDX[j]+WDY[j]*WN]===tiles[i])same++;if(!same)tiles[i]=tiles[i]?0:1}
 // 2. mountain ranges: a few wandering spines with gaps for passes, some lone massifs from the ridged noise, hills at their feet
 let cd=wgBfs(i=>tiles[i]===0);
 {const inland=[];for(let i=0;i<N;i++)if(tiles[i]===1&&cd[i]>=4)inland.push(i);const heads=[],nR=Math.round((3+Math.floor(r()*3))*Math.pow(AK,.8));
  if(!SH||!SH.noSpines)for(let g=0;g<nR*12&&heads.length<nR&&inland.length;g++){const s=inland[Math.floor(r()*inland.length)],sx=s%WN,sy=(s/WN)|0;if(heads.some(h=>Math.hypot(h[0]-sx,h[1]-sy)<12))continue;heads.push([sx,sy]);
   let x=sx,y=sy,a=r()*6.283,rad=1+r()*.6,gap=6+Math.floor(r()*8),out=0;const len=12+Math.floor(r()*18);
   for(let k=0;k<len&&out<3;k++){a+=(r()-.5)*.8;rad=clamp(rad+(r()-.5)*.5,.7,1.7);x+=Math.cos(a);y+=Math.sin(a);if(--gap<=0){gap=7+Math.floor(r()*9);x+=Math.cos(a);y+=Math.sin(a);continue}
    const cx=Math.round(x),cy=Math.round(y);if(cx<3||cy<3||cx>=WN-3||cy>=WN-3||cd[cy*WN+cx]<2){out++;continue}out=0;
    for(let ay=-2;ay<=2;ay++)for(let ax=-2;ax<=2;ax++){const i=(cy+ay)*WN+cx+ax;if(tiles[i]===1&&cd[i]>=2&&Math.hypot(cx+ax-x,cy+ay-y)<=rad)tiles[i]=4}}}
  if(SH&&SH.ranges)SH.ranges({tiles,cd,el,rs:SH.rs,wx,wy,rg});
  const land=i=>tiles[i]===1&&cd[i]>=3,mt=pct(ridge,land,SH&&SH.massQ||.975);for(let i=0;i<N;i++)if(land(i)&&ridge[i]>mt)tiles[i]=4;
  for(let i=0;i<N;i++){if(tiles[i]!==4)continue;const x=i%WN,y=(i/WN)|0;let n=0;for(let j=0;j<4;j++)if(tiles[(y+WDY[j])*WN+x+WDX[j]]===4)n++;if(!n)tiles[i]=1}   // no lone peaks
  const md=wgBfs(i=>tiles[i]===4);for(let i=0;i<N;i++)if(tiles[i])el[i]=clamp(el[i]*.7+.3*clamp(1-md[i]/6,0,1),0,1);                                         // the land rises toward the ranges
  const ht=pct(el,i=>tiles[i]===1,SH&&SH.hillQ||.955);
  for(let i=0;i<N;i++){if(tiles[i]!==1)continue;const x=i%WN,y=(i/WN)|0;if(md[i]===1||(md[i]===2&&jit(x,y)>.55)||(el[i]>ht&&cd[i]>=2))tiles[i]=3}}
 // 3. one mainland: cut passes through ranges and close narrow straits so every sizeable landmass joins the largest
 const J=SH&&SH.join,JW=J?J.w:2.2,JB=J?J.big:13.5,JS=J?J.small:4.6,JM=J?J.min:5;
 for(let g=0;g<40*AK;g++){const C=wgComps(i=>tiles[i]!==0&&tiles[i]!==4),starts=[];if(C.best<0)break;for(let i=0;i<N;i++)if(C.comp[i]===C.best)starts.push(i);
  const res=wgPath(starts,(k,n)=>edgeOf(n)<2?-1:tiles[n]===4?1:tiles[n]===0?JW:0,(k,d)=>C.comp[k]>=0&&C.comp[k]!==C.best&&C.sizes[C.comp[k]]>=JM&&d<=(C.sizes[C.comp[k]]>=100?JB:JS));   // a pass up to 4 peaks long, a strait up to 2 tiles (6 for a second continent)
  if(res.end<0)break;for(const k of wgChain(res.prev,res.end))if(tiles[k]===4)tiles[k]=3;else if(tiles[k]===0)tiles[k]=1}
 if(SH&&SH.carve)SH.carve({tiles,river,el,rs:SH.rs});   // the river valley's great river
 cd=wgBfs(i=>tiles[i]===0);const md=wgBfs(i=>tiles[i]===4);
 // 4. rivers: from the feet of the mountains down the cheapest (lowest) way to the sea, a lake or another river
 {const src=[];for(let i=0;i<N;i++)if(tiles[i]===3&&md[i]===1&&cd[i]>=5)src.push(i);
  if(src.length<8)for(let i=0;i<N;i++)if(tiles[i]!==0&&tiles[i]!==4&&cd[i]>=6&&el[i]>.45)src.push(i);
  for(let i=src.length-1;i>0;i--){const j=Math.floor(r()*(i+1)),t=src[i];src[i]=src[j];src[j]=t}
  const want=Math.round((5+Math.floor(r()*3))*Math.pow(AK,.8)*(SH&&SH.rivK||1)),heads=[];let made=0;
  for(const s of src){if(made>=want)break;if(river[s]||heads.some(h=>Math.abs(h%WN-s%WN)+Math.abs(((h/WN)|0)-((s/WN)|0))<11))continue;
   const res=wgPath([s],(k,n)=>{if(tiles[n]===4)return-1;if(tiles[n]===0)return .2;if(river[n])return .1;const x=n%WN,y=(n/WN)|0;let c=.2+el[n]*4+rj(x,y)*2.2+jit(x,y)*1.6;
     for(let j=0;j<4;j++){const m=(y+WDY[j])*WN+x+WDX[j];if(m!==k&&river[m])c+=3}return c},k=>k!==s&&(tiles[k]===0||river[k]>0));   // never run beside another river: join it
   if(res.end<0)continue;const ch=wgChain(res.prev,res.end);if(ch.length<6)continue;
   for(let i=0;i<ch.length-1;i++){const a=ch[i],b=ch[i+1];if(tiles[b]===0){const d=b-a;river[a]|=1<<(d===-WN?0:d===1?1:d===WN?2:3)}else wgLink(river,a,b)}
   heads.push(s);made++}}
 // 5. climate: snow in the north, desert in the dry south, swamp on low wet ground, forest where it is moist
 {const rd=wgBfs(i=>river[i]>0),tm=new Float32Array(N),mo=new Float32Array(N),gen=i=>tiles[i]===1;
  for(let i=0;i<N;i++){const x=i%WN,y=(i/WN)|0;tm[i]=BM&&BM.tmA?y/(WN-1)*BM.lat+(te(x,y)-.5)*BM.tmA+(a3(x,y)-.5)*BM.tmB-el[i]*.06:y/(WN-1)+(te(x,y)-.5)*.36-el[i]*.06;mo[i]=mo1(x,y)*.62+mo2(x,y)*.38+(rd[i]<=1?.1:rd[i]===2?.05:0)+(cd[i]<=1?.03:0)}
  const cold=Math.max(BM?BM.coldMin:.17,pct(tm,gen,BM?BM.cold:.14)),hot=Math.min(BM?BM.hotMax:.8,pct(tm,gen,BM?BM.hot:.8)),low=pct(el,gen,BM&&BM.low||.3),wet=pct(mo,gen,BM?BM.wet:.56),damp=pct(mo,gen,BM?BM.damp:.62);
  for(let i=0;i<N;i++){if(!gen(i))continue;const t=tm[i],m=mo[i];tiles[i]=t<cold?7:t>hot&&m<damp?6:m>wet&&el[i]<low&&t>cold+.06?5:m>damp?2:1}
  const C8=new Int32Array(8);for(let pass=0;pass<2;pass++){const out=tiles.slice();for(let i=0;i<N;i++){const t=tiles[i];if(t===0||t===3||t===4)continue;const x=i%WN,y=(i/WN)|0,c=C8.fill(0);let same=0;
    for(let ay=-1;ay<=1;ay++)for(let ax=-1;ax<=1;ax++){if(!ax&&!ay)continue;const nx=x+ax,ny=y+ay;if(nx<0||ny<0||nx>=WN||ny>=WN)continue;const u=tiles[ny*WN+nx];if(u===t)same++;c[u]++}
    if(same>1)continue;let b=t,bn=1;for(const u of [1,2,5,6,7])if(c[u]>bn){bn=c[u];b=u}out[i]=b}tiles.set(out)}}
 // 6. the mainland
 const C=wgComps(i=>tiles[i]!==0&&tiles[i]!==4),ok=new Uint8Array(N);let size=0;for(let i=0;i<N;i++)if(C.comp[i]===C.best&&C.best>=0){ok[i]=1;size++}
 const nearRiver=i=>{const x=i%WN,y=(i/WN)|0;for(let j=0;j<4;j++)if(river[(y+WDY[j])*WN+x+WDX[j]])return true;return false};
 // 7. towns: spread out, drawn to coasts, rivers and open ground
 const cand=[];for(let i=0;i<N;i++){const t=tiles[i];if(!ok[i]||river[i]||edgeOf(i)<4||!(t===1||t===2||t===3||t===6||t===7))continue;
  let land=0;const x=i%WN,y=(i/WN)|0;for(let ay=-1;ay<=1;ay++)for(let ax=-1;ax<=1;ax++)if(ok[(y+ay)*WN+x+ax])land++;if(land<5)continue;
  cand.push({i,x,y,s:r()*1.1+(cd[i]===1?.9:0)+(nearRiver(i)?1.3:0)+(t===1?.5:t===3?-.4:0)})}
 cand.sort((a,b)=>b.s-a.s||a.i-b.i);const picks=[];
 for(const c of cand)c.d=99;
 let dmin=AK>1?7*Math.sqrt(12*AK/NT):7;
 while(picks.length<NT){let best=null,bv=-1e9;for(const c of cand){if(c.d<dmin)continue;const v=c.s+Math.min(c.d,15*dmin/7)*.3;if(v>bv){bv=v;best=c}}   // good sites first, then whatever fills the emptiest country
  if(!best){if(dmin>7.01){dmin=Math.max(7,dmin-.75);continue}break}picks.push(best);for(const c of cand){const dx=best.x-c.x,dy=best.y-c.y;if(dx>=c.d||-dx>=c.d||dy>=c.d||-dy>=c.d)continue;const q=Math.hypot(dx,dy);if(q<c.d)c.d=q}}   // an axis gap of c.d already rules it out
 // 8. roads: a minimum spanning tree over the towns plus a few loops, each laid along the cheapest ground; later roads reuse earlier ones
 const RC=[0,1,1.7,2.4,0,2.8,1.3,1.5],T=picks.length,
  rc=new Float32Array(N),step=(k,n)=>{const b=rc[n];if(b<0)return-1;if(road[n])return .15;return river[n]?b+(river[k]?14:5):b};
 for(let i=0;i<N;i++)rc[i]=ok[i]?RC[tiles[i]]+jit(i%WN,(i/WN)|0)*.5:-1;
 const D0=[];for(let a=0;a<T;a++){const res=wgPath([picks[a].i],step,null);D0.push(picks.map(p=>res.dist[p.i]))}
 const edges=[],inT=[0],link=[];for(let a=0;a<T;a++)link.push(new Float32Array(T).fill(1e9));
 while(inT.length<T){let ba=-1,bb=-1,bd=1e9;for(const a of inT)for(let b=0;b<T;b++)if(!inT.includes(b)&&D0[a][b]<bd){bd=D0[a][b];ba=a;bb=b}if(bb<0)break;inT.push(bb);edges.push([ba,bb,bd])}
 const net=()=>{const g=link.map(l=>Float32Array.from(l));for(let a=0;a<T;a++)g[a][a]=0;for(let k=0;k<T;k++)for(let a=0;a<T;a++)for(let b=0;b<T;b++)if(g[a][k]+g[k][b]<g[a][b])g[a][b]=g[a][k]+g[k][b];return g};
 for(const e of edges)link[e[0]][e[1]]=link[e[1]][e[0]]=e[2];
 {const pairs=[];for(let a=0;a<T;a++)for(let b=a+1;b<T;b++)if(link[a][b]>=1e9&&D0[a][b]<1e9)pairs.push([a,b,D0[a][b]]);pairs.sort((p,q)=>p[2]-q[2]);let loops=0;
  let g=null;for(const p of pairs){if(loops>=Math.round(3*T/12))break;if(!g)g=net();if(g[p[0]][p[1]]>p[2]*2.1&&p[2]<34*SK){link[p[0]][p[1]]=link[p[1]][p[0]]=p[2];edges.push(p);loops++;g=null}}}   // the net only changes with a new link
 edges.sort((a,b)=>a[2]-b[2]);
 for(const e of edges){const A=picks[e[0]],B=picks[e[1]],L=Math.hypot(B.x-A.x,B.y-A.y)||1,res=wgPath([A.i],(k,n)=>{const c=step(k,n);return c<0||road[n]?c:c+Math.min(3,Math.abs((n%WN-A.x)*(B.y-A.y)-(((n/WN)|0)-A.y)*(B.x-A.x))/L)*.16},k=>k===B.i);if(res.end<0)continue;const ch=wgChain(res.prev,res.end);for(let i=0;i<ch.length-1;i++)wgLink(road,ch[i],ch[i+1])}
 // 9. sizes (cities at crossroads, on coasts and rivers), the starting town first, names
 const bits=m=>(m&1)+(m>>1&1)+(m>>2&1)+(m>>3&1);
 picks.forEach(p=>{p.q=bits(road[p.i])+(cd[p.i]===1?.9:0)+(nearRiver(p.i)?.9:0)+r()*.3;p.size=1});
 const byQ=picks.slice().sort((a,b)=>b.q-a.q||a.i-b.i),nc=T>=12?Math.round(3*T/12):2,n2=T>=12?Math.round(4*T/12):4;byQ.forEach((p,k)=>{p.size=k<nc?3:k<nc+n2?2:1});
 let lx=0,ly=0;for(let i=0;i<N;i++)if(ok[i]){lx+=i%WN;ly+=(i/WN)|0}lx/=size||1;ly/=size||1;
 const start=picks.filter(p=>p.size===2).sort((a,b)=>Math.hypot(a.x-lx,a.y-ly)-Math.hypot(b.x-lx,b.y-ly)||a.i-b.i)[0]||picks[0];
 const order=start?[start].concat(picks.filter(p=>p!==start)):[],names=T>TOWNN.length?TOWNN.concat(TOWNX.filter(n=>!TOWNN.includes(n))):TOWNN.slice();for(let i=names.length-1;i>0;i--){const j=Math.floor(r()*(i+1)),t=names[i];names[i]=names[j];names[j]=t}
 const towns=order.map((p,k)=>({name:names[k%names.length],x:(p.x+.5)*TS,y:(p.y+.5)*TS,size:p.size}));
 // 10. ruins in the wild, away from towns and off the roads
 const sc=[];for(let i=0;i<N;i++){if(!ok[i]||road[i]||river[i]||edgeOf(i)<3)continue;const x=i%WN,y=(i/WN)|0;{let near=false;for(const p of picks){const dx=p.x-x,dy=p.y-y;if(dx<4.5&&dx>-4.5&&dy<4.5&&dy>-4.5&&Math.hypot(dx,dy)<4.5){near=true;break}}if(near)continue}
  let nr=0;for(let j=0;j<4;j++)if(road[(y+WDY[j])*WN+x+WDX[j]])nr++;sc.push({i,x,y,s:r()-(nr?.6:0)})}
 sc.sort((a,b)=>b.s-a.s||a.i-b.i);const sp=[];for(const c of sc){if(sp.every(p=>Math.hypot(p.x-c.x,p.y-c.y)>=9)){sp.push(c);if(sp.length>=Math.round(8*Math.pow(AK,.9)))break}}
 const rn=[...RUINS.keys()];for(let i=rn.length-1;i>0;i--){const j=Math.floor(r()*(i+1)),t=rn[i];rn[i]=rn[j];rn[j]=t}
 const sites=sp.map((p,k)=>({kind:'ruin',x:(p.x+.5)*TS,y:(p.y+.5)*TS,n:rn[k%rn.length]}));
 const spd=new Float32Array(N);for(let i=0;i<N;i++)spd[i]=ok[i]?tileSpeedOf(tiles[i],river[i],road[i]):0;
 return{seed,n:WN,tiles,ok,river,road,spd,size,towns,sites}}

/* ---- queries ---- */
function tileAt(px,py){const x=Math.floor(px/TS),y=Math.floor(py/TS);if(x<0||y<0||x>=WN||y>=WN)return 0;return W.tiles[y*WN+x]}
function okAt(px,py){const x=Math.floor(px/TS),y=Math.floor(py/TS);if(x<0||y<0||x>=WN||y>=WN)return false;return !!W.ok[y*WN+x]}
function roadAt(px,py){const x=Math.floor(px/TS),y=Math.floor(py/TS);return x>=0&&y>=0&&x<WN&&y<WN&&!!W.road[y*WN+x]}
function speedAt(px,py){const x=Math.floor(px/TS),y=Math.floor(py/TS);if(x<0||y<0||x>=WN||y>=WN)return 0;return W.spd[y*WN+x]}   // march speed factor: ground, road, river
function lineClear(x0,y0,x1,y1,minSpd){const d=Math.hypot(x1-x0,y1-y0),n=Math.ceil(d/5),lim=(minSpd||0)-1e-6;for(let i=1;i<=n;i++){const t=i/n,s=speedAt(x0+(x1-x0)*t,y0+(y1-y0)*t);if(s<=0||s<lim)return false}return true}
function randOk(x,y,minT,maxT){for(let i=0;i<300;i++){const a=rnd()*6.283,d=(minT+rnd()*(maxT-minT))*TS,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
  if(okAt(px,py)&&G.towns.every(t=>Math.hypot(t.x-px,t.y-py)>2.5*TS))return{x:px,y:py}}
 for(let i=0;i<3000;i++){const px=rnd()*WS,py=rnd()*WS;if(okAt(px,py))return{x:px,y:py}}return{x,y}}
function placeTowns(){return W.towns.map(t=>({name:t.name,x:t.x,y:t.y,size:t.size,ref:-99}))}
function worldSites(w,nid){return w.sites.map((s,i)=>({id:nid+i,kind:s.kind,x:s.x,y:s.y,n:s.n}))}
function weatherFx(k){return WTHR[k||(G&&G.weather&&G.weather.kind)]||WTHR.clear}
function partyStrength(p){const m=p&&p.mult||0;return m<.8?1:m<1?2:3}

/* ---- pathfinding: A* over 8 neighbours with a binary heap; cost = distance in tiles / march speed ---- */
const FP={cost:null,prev:null,stamp:null,shut:null,hk:null,hf:null,gen:0,total:0};
function findPath(sx,sy,tx,ty){const n=WN,N=n*n;if(sx<0||sy<0||tx<0||ty<0||sx>=n||sy>=n||tx>=n||ty>=n)return null;
 if(!FP.cost){FP.cost=new Float64Array(N);FP.prev=new Int32Array(N);FP.stamp=new Int32Array(N);FP.shut=new Int32Array(N);FP.hk=new Int32Array(N*8+8);FP.hf=new Float64Array(N*8+8)}
 const cost=FP.cost,prev=FP.prev,st=FP.stamp,shut=FP.shut,K=FP.hk,F=FP.hf,gen=++FP.gen,spd=W.spd,s=sy*n+sx,t=ty*n+tx,ir=1/ROADSPD;FP.total=0;if(s===t)return[];if(!spd[t])return null;
 let hn=1,found=false;st[s]=gen;cost[s]=0;prev[s]=-1;K[0]=s;F[0]=0;const ss=spd[s]||.5;
 while(hn>0){const k=K[0];hn--;                                               // pop the cheapest
  if(hn>0){const lk=K[hn],lf=F[hn];let i=0;for(;;){let c=2*i+1;if(c>=hn)break;if(c+1<hn&&F[c+1]<F[c])c++;if(F[c]>=lf)break;K[i]=K[c];F[i]=F[c];i=c}K[i]=lk;F[i]=lf}
  if(shut[k]===gen)continue;shut[k]=gen;if(k===t){found=true;break}const x=k%n,y=(k-x)/n,ck=cost[k],ik=1/(k===s?ss:spd[k]);
  for(let ay=-1;ay<=1;ay++){const ny=y+ay;if(ny<0||ny>=n)continue;for(let ax=-1;ax<=1;ax++){if(!ax&&!ay)continue;const nx=x+ax;if(nx<0||nx>=n)continue;const nk=ny*n+nx,sn=spd[nk];if(!sn||shut[nk]===gen)continue;
   if(ax&&ay&&(!spd[y*n+nx]||!spd[ny*n+x]))continue;const c=ck+(ax&&ay?1.4142:1)*(ik+1/sn)*.5;if(st[nk]===gen&&c>=cost[nk])continue;st[nk]=gen;cost[nk]=c;prev[nk]=k;
   const dx=nx>tx?nx-tx:tx-nx,dy=ny>ty?ny-ty:ty-ny,f=c+(dx>dy?dx+.4142*dy:dy+.4142*dx)*ir;let i=hn++;while(i>0){const q=(i-1)>>1;if(F[q]<=f)break;K[i]=K[q];F[i]=F[q];i=q}K[i]=nk;F[i]=f}}}
 if(!found)return null;FP.total=cost[t];const p=[];for(let k=t;k!==s&&k>=0;k=prev[k])p.push({x:(k%n+.5)*TS,y:(((k/n)|0)+.5)*TS});return p.reverse()}
// Plans a march without moving: {path, hours} from the company (or from {x,y}) to a world point, or null when there is no way.
function routeTo(wx,wy,from){if(!W||!G||!okAt(wx,wy))return null;const p=from||G.p,path=findPath(Math.floor(p.x/TS),Math.floor(p.y/TS),Math.floor(wx/TS),Math.floor(wy/TS));if(!path)return null;
 let hours=FP.total*TS/WCO*WHRS;if(path.length)path[path.length-1]={x:wx,y:wy};else{path.push({x:wx,y:wy});hours=Math.hypot(wx-p.x,wy-p.y)/(WCO*(speedAt(p.x,p.y)||.5))*WHRS}
 return{path,hours}}
function goTo(wx,wy,dest,leg){if(typeof escHold==='function'){const e=escHold(wx,wy,dest);if(e!=null)return e}   // escorting: the company stays with the caravan
 if(!leg)G.route=[];
 if(!dest&&G.sites){const s=G.sites.find(s=>Math.hypot(s.x-wx,s.y-wy)<.6*TS);if(s){dest={type:'site',id:s.id};wx=s.x;wy=s.y}}
 const r=routeTo(wx,wy);if(!r){G.route=[];toast('No way through there');return false}
 G.path=r.path;G.moving=true;G.dest=dest||null;G.tap={x:wx,y:wy};if(typeof camOff!=='undefined')camOff.x=camOff.y=0;return true}
// Long routes: waypoints [{x,y,dest}] marched in order. The company passes through the middle ones without stopping.
function setRoute(wps){const list=(Array.isArray(wps)?wps:[]).filter(w=>w&&svFin(w.x)&&svFin(w.y)).map(w=>({x:w.x,y:w.y,dest:w.dest||null}));
 if(!list.length){clearRoute();return false}G.route=list;return goTo(list[0].x,list[0].y,list[0].dest,true)}
function clearRoute(){G.route=[];G.path=[];G.moving=false;G.dest=null;G.tap=null}

/* ---- fog of war ---- */
function nightK(h){return h<5||h>=20?1:h<7?(7-h)/2:h>18?(h-18)/2:0}
function visionBase(){if(!G||!W)return 0;return Math.max(2.5,WVISBASE*WVIS[tileAt(G.p.x,G.p.y)]*(1-.4*nightK(G.hour))*weatherFx().vis)*TS}
function visionRadius(){if(!G||!W)return 0;return visionBase()+(typeof followerHas==='function'&&followerHas('scout')?2*TS:0)}   // the scout follower sees two tiles further
function bandSight(){return clamp(visionBase()*.55,2*TS,3.75*TS)}       // how far a band can pick the company out: never further than before, less at night, in cover or foul weather
function seenAt(tx,ty){return tx>=0&&ty>=0&&tx<WN&&ty<WN&&!!W&&W.seen[ty*WN+tx]===1}
function visibleAt(tx,ty){return visibleWithin(tx,ty,null)}
function visibleWithin(tx,ty,r){if(!G||!W||tx<0||ty<0||tx>=WN||ty>=WN)return false;return Math.hypot((tx+.5)*TS-G.p.x,(ty+.5)*TS-G.p.y)<=(r==null?visionRadius():r)}   // r: the sight radius when the caller has it already
function fogRevealAt(x,y,rad){const x0=Math.max(0,Math.floor((x-rad)/TS)),x1=Math.min(WN-1,Math.floor((x+rad)/TS)),y0=Math.max(0,Math.floor((y-rad)/TS)),y1=Math.min(WN-1,Math.floor((y+rad)/TS));let ch=false;
 for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){const i=ty*WN+tx;if(!W.seen[i]&&Math.hypot((tx+.5)*TS-x,(ty+.5)*TS-y)<=rad){W.seen[i]=1;ch=true}}
 if(ch)W.fogRev++;return ch}
function fogReveal(){if(!G||!W)return;const rad=visionRadius(),key=(Math.floor(G.p.y/TS)*WN+Math.floor(G.p.x/TS))*512+Math.round(rad/4);if(key===W.fogKey)return;W.fogKey=key;fogRevealAt(G.p.x,G.p.y,rad)}
function fogStart(){if(!G||!W)return;if(typeof worldEnsure==='function')worldEnsure();const t=G.towns[0];if(t)fogRevealAt(t.x,t.y,9.5*TS);W.fogKey=-1;fogReveal()}
function fogPack(){if(!W||!W.seen)return null;const s=W.seen,N=s.length;let o='';for(let i=0;i<N;i+=6){let v=0;for(let j=0;j<6&&i+j<N;j++)if(s[i+j])v|=1<<j;o+=B64C[v]}return o}
function fogLoad(str){if(!W)return false;const N=WN*WN;W.seen.fill(0);W.fogKey=-1;W.fogRev++;if(typeof str!=='string'||str.length!==Math.ceil(N/6))return false;
 for(let i=0,c=0;i<N;i+=6,c++){const v=B64C.indexOf(str[c]);if(v<0){W.seen.fill(0);return false}for(let j=0;j<6&&i+j<N;j++)if(v>>j&1)W.seen[i+j]=1}return true}

/* ---- weather ---- */
function weatherBiome(){const t=G&&W?tileAt(G.p.x,G.p.y):1;return WTHRBIO[BIOKEY[t]]?BIOKEY[t]:'plains'}
function rollWeather(){const tab=typeof runModWeather==='function'?runModWeather(weatherBiome()):WTHRBIO[weatherBiome()];let tot=0;for(const e of tab)tot+=e[1];let v=rnd()*tot,kind=tab[0][0];for(const e of tab){if(v<e[1]){kind=e[0];break}v-=e[1]}
 G.weather={kind,t:0,dur:Math.round((kind==='clear'?8+rnd()*14:3+rnd()*9)*10)/10}}
function stepWeather(h){const w=G.weather;if(!w||!WTHR[w.kind]||!svFin(w.t)||!svFin(w.dur)){rollWeather();return}w.t+=h;
 if(w.t>=w.dur||!(typeof runModWeather==='function'?runModWeather(weatherBiome()):WTHRBIO[weatherBiome()]).some(e=>e[0]===w.kind))rollWeather()}      // the hours run out, or the company walked into a land where this weather does not happen

/* ---- bands, days, the crisis ---- */
function patrolPts(x,y){const bio=tileAt(x,y),pts=[{x:Math.round(x),y:Math.round(y)}];let last=pts[0];
 for(let n=0;n<2;n++)for(let i=0;i<24;i++){const a=rnd()*6.283,d=(3+rnd()*4.5)*TS,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
  if(!okAt(px,py)||(i<16&&tileAt(px,py)!==bio)||!lineClear(last.x,last.y,px,py)||!G.towns.every(t=>Math.hypot(t.x-px,t.y-py)>2.5*TS))continue;last={x:Math.round(px),y:Math.round(py)};pts.push(last);break}
 return pts}
function patrolHop(p){const n=randOk(p.x,p.y,1,4);p.pts=[{x:Math.round(n.x),y:Math.round(n.y)}];p.pi=0;p.tx=p.pts[0].x;p.ty=p.pts[0].y}
function setPatrol(p){p.pts=patrolPts(p.x,p.y);if(p.pts.length<2){patrolHop(p);return}p.pi=1;p.tx=p.pts[1].x;p.ty=p.pts[1].y}
/* ---- spawn ranges: who roams where (CONTRACT.md "Spawn ranges") ----
   companyPower(): sum over the fielded mercs of level + gear (log2(1 + price of what they carry / 150) x 1.1, at most 9).
     A new company is ~6, L4x6 ~45, L8x9 ~120, L12x12 ~220.
   spawnProg(power, day) in 0..1 = clamp((power - 8) / 235): how far the land has turned against you (company strength only; day is ignored).
   Each faction's tier (FACT[f].tier, overridden by FACT[f].spawn) gives the curve SPAWNT[tier] = {gate, d0, d1, w0, w1}:
     it roams only once prog >= gate; then, with t = (prog - gate) / (1 - gate), at least minD = d0 + (d1 - d0) t tiles from the nearest
     town, with weight w0 + (w1 - w0) t; mid/late/end factions only on their own biomes (FACT[f].biomes) and, before prog .6, never within
     startD = 16 (1 - prog / .6) tiles of the starting town. Early factions roam anywhere. Riftspawn keep their crisis logic.
   When the world has no ground that far from its towns (the small world), the farthest tenth of the faction's ground is used instead. */
const SPAWNT={early:{gate:0,d0:0,d1:0,w0:1,w1:.55},mid:{gate:.08,d0:10,d1:3,w0:.35,w1:.9},late:{gate:.2,d0:14,d1:5,w0:.2,w1:.8},end:{gate:.4,d0:18,d1:8,w0:.06,w1:.4}};
const TERRN=['water','plains','forest','hills','mountains','swamp','desert','snow'];
function gearPower(m){let p=0;const eq=m&&m.eq||{};for(const k of ['w','b','s','a','h']){const it=eq[k]&&ITEMS[eq[k]];if(it)p+=it.price||0}return Math.min(9,Math.log2(1+p/150)*1.1)}
function companyPower(list){const L=list||(typeof fielded==='function'&&G?fielded():[]);let p=0;for(const m of L)p+=(m.lvl||1)+gearPower(m);return Math.round(p*10)/10}
function spawnProg(power,day){return clamp((power-8)/235,0,1)}   // how far dangerous bands reach toward towns: the company's strength only, not the day
/* factionPool(ctx): the factions that may appear now, [{f, w (weight), minD (tiles from the nearest town), dmin..dmax (tiles from the
   contract's town for a lair), startD, tier, biomes}].
   ctx (all optional): {power, day, crisis (include riftspawn: default G.crisis), prog}. Used by spawnParty and by genContract. */
function factionPool(ctx){ctx=ctx||{};const power=ctx.power!=null?ctx.power:companyPower(),day=ctx.day!=null?ctx.day:(G?G.day:1),prog=ctx.prog!=null?ctx.prog:spawnProg(power,day),out=[];
 for(const f in FACT){const F=FACT[f],tier=F.tier||'early';if(F.house)continue;if(tier==='crisis'){if((ctx.crisis!=null?ctx.crisis:G&&G.crisis)&&crFactLive(f))out.push({f,w:F.crisis==='sunder'?.5:.3,minD:0,startD:0,tier,biomes:null});continue}
  const S=Object.assign({},SPAWNT[tier]||SPAWNT.early,F.spawn||{});if(prog<S.gate)continue;const t=S.gate<1?(prog-S.gate)/(1-S.gate):1;
  const minD=Math.round(S.d0+(S.d1-S.d0)*t);out.push({f,w:Math.round((S.w0+(S.w1-S.w0)*t)*1000)/1000,minD,dmin:Math.max(4,minD),dmax:Math.max(4,minD)+(tier==='end'?8:6),startD:tier==='early'?0:Math.max(0,Math.round(16*(1-prog/.6))),tier,biomes:tier==='early'?null:F.biomes||null})}
 if(typeof runModPool==='function')runModPool(out);   // the run's twists (27-runmods.js)
 return out}
// a crisis faction roams as plain bands only while its crisis is under way (or scarred the land); riftspawn: the Sundering
function crFactLive(f){const k=FACT[f]&&FACT[f].crisis||'sunder',c=G&&G.crisis;if(!c)return false;if((c.k||'sunder')!==k)return Array.isArray(G.crScar)&&G.crScar.some(s=>s.k===k);return !c.ended||(c.lost&&!c.won)||k==='sunder'}
// Distance in tiles from every world tile to the nearest town, and to the nearest peak (cached per world and town list).
function worldFields(){if(!W||!G)return null;const sig=W.seed+'|'+WN+'|'+G.towns.length;if(W.fld&&W.fld.sig===sig)return W.fld;const N=WN*WN,td=new Float32Array(N),T=G.towns.map(t=>[t.x/TS-.5,t.y/TS-.5]);
 for(let i=0;i<N;i++){const x=i%WN,y=(i/WN)|0;let m=1e9;for(const [a,b] of T){const d=Math.hypot(x-a,y-b);if(d<m)m=d}td[i]=m}
 const md=wgBfs(i=>W.tiles[i]===4);W.fld={sig,td,md};return W.fld}
// Does world tile i belong to one of the biome names?
function biomeHas(i,biomes){if(!biomes)return true;const t=W.tiles[i],n=TERRN[t];if(biomes.includes(n))return true;if(biomes.includes('mountains')){const F=worldFields();return !!F&&F.md[i]<=2}return false}
/* factionSpot(e, x, y, minT, maxT): a point for pool entry e (from factionPool) between minT and maxT tiles of (x,y), on the company's
   mainland, on its biomes, minD from every town and startD from the starting town; null when the land has no such place. Seeded (rnd). */
function factionSpot(e,x,y,minT,maxT){const F=worldFields();if(!F)return null;const st=G.towns[0],ok=(px,py)=>{if(!okAt(px,py))return false;const tx=Math.floor(px/TS),ty=Math.floor(py/TS),i=ty*WN+tx;
  if(F.td[i]<Math.max(2.5,e.minD)||!biomeHas(i,e.biomes))return false;return !(st&&e.startD&&Math.hypot(st.x-px,st.y-py)<e.startD*TS)};
 if(!e.biomes&&!e.minD&&!e.startD)return randOk(x,y,minT,maxT);
 for(let i=0;i<200;i++){const a=rnd()*6.283,d=(minT+rnd()*(maxT-minT))*TS,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;if(ok(px,py))return{x:px,y:py}}
 // nothing in the ring: any tile of the faction's ground within reach that is far enough, else the farthest tenth of its ground
 const cand=[],far=[],R=maxT*1.6;for(let i=0;i<WN*WN;i++){if(!W.ok[i]||!biomeHas(i,e.biomes))continue;const px=(i%WN+.5)*TS,py=(((i/WN)|0)+.5)*TS;if(Math.hypot(px-x,py-y)>R*TS||F.td[i]<2.5)continue;far.push(i);if(ok(px,py))cand.push(i)}
 let L=cand;if(!L.length&&far.length){far.sort((a,b)=>F.td[b]-F.td[a]||a-b);L=far.slice(0,Math.max(1,Math.ceil(far.length/10)))}if(!L.length)return null;
 const i=L[Math.floor(rnd()*L.length)];return{x:(i%WN+.5)*TS,y:(((i/WN)|0)+.5)*TS}}
/* rollFaction(ctx): picks a faction from factionPool(ctx) by weight and a place for it near (ctx.x, ctx.y) (ctx.minT..ctx.maxT tiles;
   ctx.near: the place must also lie within maxT + minD of it). Returns {f, x, y, minD, tier} or null. Seeded. */
function rollFaction(ctx){ctx=ctx||{};let pool=factionPool(ctx).filter(e=>!ctx.only||ctx.only.includes(e.f));const x=ctx.x!=null?ctx.x:G.p.x,y=ctx.y!=null?ctx.y:G.p.y;
 for(let g=0;g<12&&pool.length;g++){let tot=0;for(const e of pool)tot+=e.w;let v=rnd()*tot,e=pool[pool.length-1];for(const q of pool){if(v<q.w){e=q;break}v-=q.w}
  const maxT=Math.max(ctx.maxT||26,(ctx.minT||9)+2+(ctx.grow?e.minD:0)),pos=factionSpot(e,x,y,ctx.minT||9,maxT);if(pos)return{f:e.f,x:pos.x,y:pos.y,minD:e.minD,tier:e.tier};pool=pool.filter(q=>q!==e)}
 return null}
// The contract title for a hunt of faction f at (x,y): FACT[f].lair, with {place} filled from the land around it (no rnd draw).
const PEAKN=['Greyspire','the Cold Teeth','Ravenfell','the Black Crag','Hollowpeak','Skarnholt','the Widow\'s Tor','Frostmantle'];
function lairTitle(f,x,y){const L=FACT[f]&&FACT[f].lair||'Clear a lair';if(!L.includes('{place}'))return L;const h=Math.abs(Math.floor((x||0)/TS)*31+Math.floor((y||0)/TS)*17);return L.replace('{place}',PEAKN[h%PEAKN.length])}
function spawnParty(f){let pos=null;
 if(!f&&G.crisis&&(G.crisis.k||'sunder')==='sunder'&&rnd()<2/7)f='void';
 if(!f){const r=rollFaction({x:G.p.x,y:G.p.y,minT:9,maxT:26,crisis:false});if(r){f=r.f;pos={x:r.x,y:r.y}}}
 if(!f)f=pick(['gob','bandit','beast','undead']);if(!pos)pos=randOk(G.p.x,G.p.y,9,26);
 const T=FACT[f].tier,p={id:G.nid++,x:pos.x,y:pos.y,tx:pos.x,ty:pos.y,f,mult:T==='end'?.8+rnd()*.4:.65+rnd()*.5,goal:'roam'};if(typeof runModF==='function')p.mult*=runModF('mult',f,1);setPatrol(p);G.parties.push(p);return p}
// Wages: wageOf(m) (14-company.js: background, traits, paymaster). Rations: one a sword a day, 0.8 with the quartermaster (G.foodAcc keeps the fraction).
function newDay(){if(typeof healInjuriesDaily==='function')healInjuriesDaily();let wage=0;if(typeof companyWages==='function')wage=companyWages();else G.roster.forEach(m=>wage+=BG[m.bg].wage);G.crowns-=wage;let msg=`Day ${G.day}: paid ${wage} crowns in wages`;
 if(G.crowns<0){G.crowns=0;if(G.roster.length>1&&rnd()<.35){const m=G.roster.splice(ri(0,G.roster.length-1),1)[0];msg=`Day ${G.day}: unpaid, ${m.name} deserted`}else msg=`Day ${G.day}: you cannot pay the men`}
 {const qm=typeof followerHas==='function'&&followerHas('quarter'),rk=typeof runModK==='function'?runModK('ration',1):1;if(qm||rk!==1){const e=G.roster.length*(qm?.8:1)*rk+(G.foodAcc||0),n=Math.floor(e+1e-9);G.foodAcc=Math.max(0,e-n);G.food-=n}else G.food-=G.roster.length}if(G.food<0){G.food=0;G.roster.forEach(m=>m.hp=Math.max(1,m.hp-10));msg+='. The company starves'}
 const news=worldDay();                                                     // the living world: parties with goals, nests, towns, wars (below)
 wsKeepBands();                                                             // the land near the company stays as busy as ever
 if(news.length)msg+='. '+news[0];toast(msg);if(typeof ambTick==='function')ambTick();if(typeof achEvent==='function')achEvent('day')}
/* ================= THE LIVING WORLD (phase 7) =================
   Parties: {id, x, y, tx, ty, f, mult, goal, from?, to?, cargo?, str?, pts?, pi?, ch?, hunt?, home?, siege?, life?, legs?}
     goal 'roam'    a band walking its loop near where it formed (the old bands; spawnParty)
          'nest'    a band out of a monster nest (home = nest id), roaming near it
          'caravan' f = the owner of town `from`, walks the road to town `to` (pts), cargo {good, crowns}. Never attacks; attacking it costs rep
          'patrol'  f = a house, walks between its towns; hunt = 1 when the house is hostile to the company (it seeks the company out);
                    siege = town index for a besieging host camped before that town
          'raid'    monsters walking to town `to`; on arrival the town is raided (SITS.raided, prosperity falls), then they roam there a while
   Within WSIM.live tiles of the company parties move in real time (moveParties); further out worldDay() moves them a day at a time
   along their route (cheap: no pathfinding, no allocation per party), so the world keeps moving where the player cannot see it.
   G.nests [{id, x, y, f, str, day, n}] grow str (1..WSIM.nestMax) every day and send out bands (more and stronger as they grow; raids
   on the nearest town once str >= 2). New nests appear now and then far from the towns. nestBattle(id) / nestClear(id) for contracts.
   Towns: situations count down and come and go (famine, festival, plague, boom by prosperity; raided by raiders; siege by wars),
   prosperity drifts toward its base and moves with situations and trade (a caravan that arrives: +3 there, +1 at home).
   Houses: their feelings for each other drift (warlike houses sour faster); below WSIM.warAt they go to war; at war each besieges the
   other's nearest town; a siege that runs its course may hand the town to the besieger. Peace comes with weariness.
   Public: worldDay() wsKeepBands() partyHostile(p) partyBattle(p) partyLabel(p) attackParty(id) worldBattleEnd(src, win)
           nestBattle(id) nestClear(id) townSiegeEnd(i, how) wsRoute(a,b) wsSpawnCaravan(a,b) wsSpawnPatrol(h) wsSpawnRaid(f,x,y,to) worldNews(t) */
const WSIM={live:30,car:9,pat:10,raid:12,merc:10,hunt:14,nestMax:3.2,nestGrow:.07,warAt:-45,peaceAt:-15,cap:300,news:24};
const WSROUTE={caravan:1,patrol:1,raid:1,merc:1};
function worldNews(t){if(!Array.isArray(G.news))G.news=[];G.news.push({day:G.day,t});if(G.news.length>WSIM.news)G.news.splice(0,G.news.length-WSIM.news);return t}
function partyHostile(p){if(!p)return false;if(p.goal==='caravan')return false;if(p.goal==='merc')return rivalHostile(rivalById(p.f),p);if(!humanFact(p.f))return true;return !!p.hunt||repTier(p.f).k==='hostile'}
function partyBattle(p){if(p&&p.goal==='caravan'&&typeof cvCaravanBattle==='function')return cvCaravanBattle(p);
 if(p&&p.gar!=null&&typeof grPartyBattle==='function')return grPartyBattle(p);   // a town's garrison: the house's soldiers in its livery (43-garrisons.js)
 const o0=partyBattle0(p);if(o0&&!o0.livery&&isHouse(o0.f)&&typeof grLivery==='function'){const L=grLivery(o0.f);if(L)o0.livery=L}return o0}   // house soldiers carry the house's livery (o.livery: houseLivery, 46-banner.js)
function partyBattle0(p){   // its guards, as the home town hired them (42-caravans.js)
 if(p&&p.goal==='merc'){const r=rivalById(p.f);if(r)return{f:p.f,rival:p.f,mult:rvMult(r),src:{type:'party',id:p.id,goal:'merc',pf:p.f}}}const o={f:FACT[p.f]?p.f:'bandit',mult:p.mult,src:{type:'party',id:p.id,goal:p.goal||'roam',pf:p.f}};const r=p&&p.cr&&typeof crPartyBattle==='function'?crPartyBattle(p,o):o;if(p&&p.fab){const L=Array.isArray(r.fabled)?r.fabled.slice():[];if(!L.includes(p.fab))L.push(p.fab);r.fabled=L.slice(0,2)}return r}   // a fabled leader of a host (p.fab, 19-east.js)
function partyLabel(p){const f=factName(p.f),T=n=>G.towns[n]?G.towns[n].name:'';if(p.cr&&typeof crHostName==='function'){const n=crHostName(p).replace(/^./,c=>c.toUpperCase());return p.siegeT!=null?`${n}, besieging ${T(p.siegeT)}`:p.back?`${n}, carrying plunder north`:p.cr==='hhost'?`${n}, marching north against the Emperor`:`${n}, bound for ${T(p.to)}`}switch(p.goal){
  case 'merc':return rivalLabel(rivalById(p.f))||f;
  case 'caravan':return`Caravan of ${f==='Free towns'?T(p.from):f}, bound for ${T(p.to)}`;
  case 'patrol':if(p.gar!=null&&typeof grLabel==='function')return grLabel(p);return p.siege!=null?`The host of ${f} besieging ${T(p.siege)}`:p.hunt?`${f} riders hunting the company`:`Patrol of ${f}`;
  case 'raid':return`${f} raiders, bound for ${T(p.to)}`;
  case 'nest':return`${f} from a nest`;default:return f}}
// The player attacks a party that would not attack it: costs standing with its owner (caravans more). Returns the battle options used.
function attackParty(id){const p=G.parties.find(q=>q.id===id);if(!p)return null;
 if(p.goal==='merc'){const r=rivalParleyDo(p,'attack');if(!r.fight)return null;G.moving=false;G.route=[];engage(r.fight);return r.fight}   // a rival company: as the parley's 'attack' (rivalParleyDo)
 if(humanFact(p.f)&&!partyHostile(p)){repGain(p.f,p.goal==='caravan'?-18:-12,p.goal==='caravan'?'Attacked a caravan':'Attacked a patrol');if(p.f!=='free')for(const h of G.houses)if(h.id!==p.f&&atWar(h.id,p.f))repGain(h.id,3,'Struck at their enemy')}
 const o=partyBattle(p);G.moving=false;G.route=[];engage(o);return o}
/* worldBattleEnd(src, win): the world's side of a battle's outcome. Call from settleBattle (68-battle-flow.js) BEFORE the party is removed.
   Removes a beaten party itself (idempotent). Returns {crowns, rep:[{f,n}]} of what it did. */
function worldBattleEnd(s,win,res){const out=worldBattleEnd0(s,win,res);if(s&&G&&typeof eastBattleEnd==='function'){try{eastBattleEnd(s,win)}catch(e){}}return out}
function worldBattleEnd0(s,win,res){const out={crowns:0,rep:[]};if(!s||!G)return out;const add=(f,n,why)=>{const d=repGain(f,n,why);if(d)out.rep.push({f,n:d})};
 if(typeof crisisBattleEnd==='function'&&(s.type==='crisis'||s.type==='party')){let h=false;try{h=crisisBattleEnd(s,win,out)}catch(e){if(typeof console!=='undefined')console.warn('crisisBattleEnd',e)}if(h)return out}
 if(s.type==='nest'){if(win)nestClear(s.id,out);return out}
 if(s.type==='clash'){if(typeof cvBattleEnd==='function')cvBattleEnd(s,win,res,out);return out}
 if(s.type==='betray'){if(typeof ctrBetrayBattleEnd==='function')ctrBetrayBattleEnd(s,win,out);return out}   // the garrison fight over a betrayed contract's pay (16-contracts.js)
 if(s.type==='escort'){if(typeof escBattleEnd==='function')escBattleEnd(s,win,res,out);return out}   // a raid on the company's escort (42-caravans.js)   // a fight beside a caravan's guards (42-caravans.js)
 if(s.type!=='party')return out;const p=G.parties.find(q=>q.id===s.id);
 if(s.goal==='merc'||(p&&p.goal==='merc')){const r=rivalById(s.pf||(p&&p.f));out.src=s;rvBattleEnd(r,p,win,out,res);delete out.src;return out}
 if(p&&p.gar!=null&&typeof grPartyEnd==='function')return grPartyEnd(p,win,out);   // the company cut down a town's garrison (43-garrisons.js)
 if(!p||!win)return out;
 const ti=nearestTown(p.x,p.y),own=G.towns[ti]&&G.towns[ti].own;
 if(!humanFact(p.f)){if(svObj(p.loot)){const t=cargoTake(cargoFix(p.loot,p.id,G.seed)||{crowns:0});out.crowns=t.crowns;out.cargo=t}   // plunder carried off a caravan (42-caravans.js)
  if(own)add(own,p.goal==='raid'?6:2,p.goal==='raid'?'Stopped raiders bound for '+(G.towns[p.to]||G.towns[ti]).name:'Cleared a band near '+G.towns[ti].name)}
 else{if(p.goal==='caravan'&&p.cargo){const c=cargoFix(p.cargo,p.id,G.seed)||{crowns:0};const t=cargoTake(c);out.crowns=t.crowns;out.cargo=t}   // the wagons' whole load (cargoTake), not only the purse
  if(!p.hunt&&p.goal!=='caravan')add(p.f,-6,'Cut down a patrol');
  if(p.f!=='free')for(const h of G.houses)if(h.id!==p.f&&atWar(h.id,p.f))add(h.id,5,'Defeated their enemy');
  if(p.siege!=null)townSiegeEnd(p.siege,'broken')}
 G.parties=G.parties.filter(q=>q.id!==p.id);return out}

/* ---- routes: town to town along the roads ----
   Caravans and house patrols keep to the road net: rdTiles(s,t) walks W.road's links (a breadth-first search over road tiles only, the
   neighbours in N E S W order: deterministic), so a route never leaves the road. The points are the road tiles' centres where the road
   turns (straight runs merged), starting at the home town: a party walking point to point stays on road tiles the whole way.
   Two towns the roads do not join have no route (null): no caravan runs between them. One search per home town, cached per world (W.rdS). */
function rdTile(x,y){const tx=Math.floor(x/TS),ty=Math.floor(y/TS);return tx<0||ty<0||tx>=WN||ty>=WN?-1:ty*WN+tx}
function rdFrom(s){if(!W||!W.road||s<0)return null;if(!W.rdS||W.rdS.n!==WN)W.rdS={n:WN,m:new Map()};const M=W.rdS.m;if(M.has(s))return M.get(s);
 let prev=null;if(W.road[s]){prev=new Int32Array(WN*WN).fill(-2);prev[s]=-1;const q=[s];for(let h=0;h<q.length;h++){const k=q[h],m=W.road[k],x=k%WN,y=(k/WN)|0;
   for(let j=0;j<4;j++){if(!(m&(1<<j)))continue;const nx=x+WDX[j],ny=y+WDY[j];if(nx<0||ny<0||nx>=WN||ny>=WN)continue;const n=ny*WN+nx;if(prev[n]!==-2||!W.road[n])continue;prev[n]=k;q.push(n)}}}
 if(M.size>96)M.clear();M.set(s,prev);return prev}
// the road tiles from s to t (both ends included), or null when the roads do not join them
function rdTiles(s,t){const P=rdFrom(s);if(!P||t<0||P[t]===-2)return null;const L=[];for(let k=t;k>=0;k=P[k])L.push(k);return L.reverse()}
// tiles -> points: every tile centre where the road turns, and the last one
function rdPts(L){const c=k=>({x:(k%WN+.5)*TS,y:(((k/WN)|0)+.5)*TS}),out=[c(L[0])];for(let i=1;i<L.length;i++){if(i<L.length-1&&L[i+1]-L[i]===L[i]-L[i-1])continue;out.push(c(L[i]))}return out}
function rdLen(pts,x,y,from){let d=0,px=x,py=y;for(let i=from|0;i<pts.length;i++){d+=Math.hypot(pts[i].x-px,pts[i].y-py);px=pts[i].x;py=pts[i].y}return d/TS}   // tiles still to walk
function onRoad(x,y){const k=rdTile(x,y);return k>=0&&!!W.road[k]}
function wsRoute(a,b){if(!W||!G)return null;if(!W.trk||W.trk.n!==G.towns.length)W.trk={n:G.towns.length,m:new Map()};const k=a*4096+b;if(W.trk.m.has(k))return W.trk.m.get(k);
 const A=G.towns[a],B0=G.towns[b];let r=null;if(A&&B0&&a!==b){const L=rdTiles(rdTile(A.x,A.y),rdTile(B0.x,B0.y));if(L&&L.length>1)r=rdPts(L)}W.trk.m.set(k,r);return r}
function wsLinked(a,b){return !!wsRoute(a,b)}
// a caravan off the road (a save from before the road rule): onto the nearest road tile joined to its town, then the road from there.
// The tile search walks the passable ground in N E S W order from where it stands: no randomness. False when no road leads there (it goes home).
function wsReroad(p){p.rd=1;const T0=G.towns[p.to];if(!T0)return false;const goal=rdTile(T0.x,T0.y),P=rdFrom(goal);if(!P)return false;
 const s=rdTile(p.x,p.y);if(s<0)return false;let hit=-1;if(W.road[s]&&P[s]!==-2)hit=s;
 else{const seen=new Uint8Array(WN*WN),q=[s];seen[s]=1;for(let h=0;h<q.length&&h<6000;h++){const k=q[h],x=k%WN,y=(k/WN)|0;if(W.road[k]&&P[k]!==-2){hit=k;break}
   for(let j=0;j<4;j++){const nx=x+WDX[j],ny=y+WDY[j];if(nx<0||ny<0||nx>=WN||ny>=WN)continue;const n=ny*WN+nx;if(seen[n]||!W.ok[n])continue;seen[n]=1;q.push(n)}}}
 if(hit<0)return false;const L=[];for(let k=hit;k>=0;k=P[k])L.push(k);   // P is rooted at the town: walking back from the hit tile is the way there
 const pts=L.length>1?rdPts(L):[{x:(goal%WN+.5)*TS,y:(((goal/WN)|0)+.5)*TS}];p.x=pts[0].x;p.y=pts[0].y;p.pts=pts.map(q=>({x:q.x,y:q.y}));p.pi=Math.min(1,p.pts.length-1);p.tx=p.pts[p.pi].x;p.ty=p.pts[p.pi].y;return true}
// a road party far from the company: tiles walked along its points (it stays on the road)
function wsWalk(p,tiles){let left=tiles*TS;while(left>0&&p.pi<p.pts.length){const q=p.pts[p.pi],d=Math.hypot(q.x-p.x,q.y-p.y);if(d<=left){left-=d;p.x=q.x;p.y=q.y;p.pi++;continue}p.x+=(q.x-p.x)/d*left;p.y+=(q.y-p.y)/d*left;left=0}
 if(p.pi>=p.pts.length){wsArrive(p);return}const q=p.pts[p.pi];p.tx=q.x;p.ty=q.y}
// any other route (raiders, rival companies): findPath, thinned to a point every 3 tiles
function wsThin(path){const out=[];for(let i=2;i<path.length-1;i+=3)out.push({x:Math.round(path[i].x),y:Math.round(path[i].y)});if(path.length){const e=path[path.length-1];out.push({x:Math.round(e.x),y:Math.round(e.y)})}return out}
function wsPathTo(x,y,tx,ty){const P=findPath(Math.floor(x/TS),Math.floor(y/TS),Math.floor(tx/TS),Math.floor(ty/TS));return P&&P.length?wsThin(P):null}
function wsAdd(o){const p=Object.assign({id:G.nid++,tx:o.x,ty:o.y,pi:0,ch:0},o);if(Array.isArray(p.pts)&&p.pts.length){p.tx=p.pts[0].x;p.ty=p.pts[0].y}G.parties.push(p);return p}
function wsCopy(r){return r?r.map(q=>({x:q.x,y:q.y})):null}
function wsSpawnCaravan(a,b){const A=G.towns[a],r=wsRoute(a,b);if(!A||!r)return null;const good=A.spec&&A.spec.length?A.spec[0]:'ale';   // the road from a to b, or no caravan
 const g=cvGuardFor(a,rnd());   // the guards the home town can afford (42-caravans.js); the one rnd draw the old random mult took
 return wsAdd({x:A.x,y:A.y,f:A.own||'free',goal:'caravan',from:a,to:b,mult:cvGuardMult(g),guard:g,cargo:cargoRoll(good),pts:wsCopy(r),rd:1})}
function wsSpawnPatrol(h,hunt){const L=houseTowns(h.id);if(!L.length)return null;let a=h.seat,b=L[ri(0,L.length-1)];if(hunt){a=L.reduce((m,i)=>Math.hypot(G.towns[i].x-G.p.x,G.towns[i].y-G.p.y)<Math.hypot(G.towns[m].x-G.p.x,G.towns[m].y-G.p.y)?i:m,L[0])}
 if(G.towns[a].own!==h.id)a=L[0];const A=G.towns[a],r=!hunt&&a!==b?wsRoute(a,b):null;
 return wsAdd({x:A.x,y:A.y+(okAt(A.x,A.y+TS)?TS:0),f:h.id,goal:'patrol',from:a,to:hunt?undefined:b,hunt:hunt?1:undefined,legs:0,mult:Math.round((hunt?.8:.8+(HPERS[h.pers].patrols?.15:0))*100+rnd()*30)/100,pts:r?wsCopy(r):[{x:Math.round(A.x),y:Math.round(A.y+(okAt(A.x,A.y+TS)?TS:0))}],rd:r?1:undefined})}   // a house of one town (or a hunt) has no road to walk: it keeps a one-point patrol
function wsSpawnRaid(f,x,y,to,mult,home){const T0=G.towns[to];if(!T0)return null;if(typeof runModF==='function')mult=(mult||.8)*runModF('mult',f,1);const r=wsPathTo(x,y,T0.x,T0.y);if(!r)return null;return wsAdd({x,y,f,goal:'raid',to,mult:mult||.8,home:home!=null?home:null,pts:r})}
/* ---- arrival at the end of a route; returns true when the party leaves the map ---- */
function wsArrive(p){if(p.cr&&typeof crArrive==='function'&&crArrive(p))return !!p.gone;const T0=G.towns[p.to];
 if(p.goal==='caravan'){if(T0)T0.pros=clamp(svNum(T0.pros,50)+3,0,100);const A=G.towns[p.from];if(A)A.pros=clamp(svNum(A.pros,50)+1,0,100);if(p.esc&&typeof cvEscArrive==='function')cvEscArrive(p);if(p.ctr&&typeof escArrive==='function')escArrive(p);p.gone=1;return true}
 if(p.goal==='raid'&&typeof grRaidCheck==='function'&&grRaidCheck(p))return false;   // the town's garrison marches out to meet raiders at its gates (43-garrisons.js)
 if(p.goal==='raid'){if(T0){const i=p.to;if(!townSit(i,'siege')){townSitAdd(i,'raided',ri(SITS.raided.dur[0],SITS.raided.dur[1]));T0.pros=clamp(svNum(T0.pros,50)-10,0,100);
    worldNews(`${factName(p.f)} raided ${T0.name}`)}}
  p.goal=p.home!=null?'nest':'roam';p.pts=null;p.pi=0;p.life=4;setPatrol(p);return false}
 if(p.goal==='merc'){p.pts=[{x:Math.round(p.x),y:Math.round(p.y)}];p.pi=0;p.idle=1;return false}   // a rival company stands at its goal until its next plan (rvDay)
 if(p.goal==='patrol'){p.legs=(p.legs|0)+1;if(p.legs>=3||!Array.isArray(p.pts)){p.gone=1;return true}const t=p.from;p.from=p.to;p.to=t;p.pts.reverse();p.pi=0;return false}
 p.gone=1;return true}
/* ---- the daily step for one far party: along its route a day's march, or (hunters) toward the company ---- */
function wsStep(p){if(p.siege!=null||p.siegeT!=null||p.clash||p.gar!=null)return;   // a garrison out on a sally moves by the hour (43-garrisons.js grHour)
   // a party locked in a clash (42-caravans.js) stays where it fights
 if(p.hunt){const dx=G.p.x-p.x,dy=G.p.y-p.y,d=Math.hypot(dx,dy)||1,s=Math.min(d-WSIM.live*.6*TS,WSIM.hunt*TS);if(s>0){const nx=p.x+dx/d*s,ny=p.y+dy/d*s;if(okAt(nx,ny)){p.x=nx;p.y=ny;p.tx=nx;p.ty=ny}}return}
 if(p.idle||!WSROUTE[p.goal]||!Array.isArray(p.pts)||!p.pts.length)return;const tiles=p.spd>0?p.spd:p.goal==='caravan'?WSIM.car:p.goal==='raid'?WSIM.raid:p.goal==='merc'?WSIM.merc:WSIM.pat;
 if(p.goal==='caravan'&&!p.rd&&!wsReroad(p)){p.gone=1;return}if(p.rd){wsWalk(p,tiles);return}   // caravans keep to the road (old ones are put back on it)
 p.pi+=Math.max(1,Math.round(tiles/3));if(p.pi>=p.pts.length){const q=p.pts[p.pts.length-1];p.x=q.x;p.y=q.y;wsArrive(p);return}const q=p.pts[p.pi];p.x=q.x;p.y=q.y;p.tx=q.x;p.ty=q.y}

/* ---- nests ---- */
function nestBattle(id){const n=G.nests&&G.nests.find(q=>q.id===id);if(!n)return null;return{f:n.f,mult:Math.round((.7+n.str*.3)*100)/100,src:{type:'nest',id}}}
function nestClear(id,out){const n=G.nests&&G.nests.find(q=>q.id===id);if(!n)return false;G.nests=G.nests.filter(q=>q.id!==id);
 for(const p of G.parties)if(p.home===id&&p.goal==='nest'){p.home=null;p.goal='roam'}const ti=nearestTown(n.x,n.y),own=G.towns[ti].own,d=repGain(own,Math.round(5+n.str*3),'Cleared a nest near '+G.towns[ti].name);
 if(out&&d)out.rep.push({f:own,n:d});G.renown+=Math.round(4+n.str*4);worldNews(`A ${FACT[n.f].n.toLowerCase()} nest near ${G.towns[ti].name} was cleared`);return true}
function wsNestSpot(){const F=worldFields();if(!F)return null;for(let a=0;a<80;a++){const x=ri(3,WN-4),y=ri(3,WN-4),i=y*WN+x;if(!W.ok[i]||F.td[i]<6)continue;const px=(x+.5)*TS,py=(y+.5)*TS;
  if(G.nests.some(q=>Math.hypot(q.x-px,q.y-py)<9*TS)||Math.hypot(px-G.p.x,py-G.p.y)<8*TS)continue;return{x:px,y:py}}return null}
function wsNests(news){const day=G.day,fs=['gob','bandit','beast'];if(day>=12)fs.push('orc','undead');if(typeof runModNestFs==='function')runModNestFs(fs);
 for(const n of G.nests){n.str=Math.round(Math.min(WSIM.nestMax,n.str+WSIM.nestGrow+day*.0012)*100)/100;n.n=svNum(n.n,0)+1;
  let bands=0;for(const p of G.parties)if(p.home===n.id)bands++;
  if(bands<1+Math.floor(n.str)&&n.n>=Math.max(2,Math.round(7-n.str*1.5))){n.n=0;const mult=Math.round((.55+n.str*.22)*100)/100;
   if(n.str>=2&&rnd()<.55){const ti=nearestTown(n.x,n.y);const p=wsSpawnRaid(n.f,n.x,n.y,ti,mult,n.id);if(p&&Math.hypot(n.x-G.p.x,n.y-G.p.y)<WSIM.live*TS*1.5)news.push(`${FACT[n.f].n} march out of their nest toward ${G.towns[ti].name}`)}
   else{const pos=randOk(n.x,n.y,1,3),p=wsAdd({x:pos.x,y:pos.y,f:n.f,goal:'nest',home:n.id,mult});setPatrol(p)}}}
 const maxN=Math.round(2+WN/32);if(G.nests.length<maxN&&rnd()<.16*(typeof runModK==='function'?runModK('nests',1):1)){const pos=wsNestSpot();if(pos){const f=pick(fs);G.nests.push({id:G.nid++,x:pos.x,y:pos.y,f,str:1,day,n:0})}}}

/* ---- towns: situations, prosperity ---- */
function wsTowns(news){G.towns.forEach((t,i)=>{const keep=[],ended=[];for(const s of t.sit){s.days--;(s.days>0?keep:ended).push(s)}t.sit=keep;
  for(const s of ended)if(s.k==='siege'){const r=wsSiegeEnd(i,s);if(r)news.push(r)}wsTownsTail(t,i)});
 G.towns.forEach((t,i)=>{if(t.sit.length>=2)return;const p=svNum(t.pros,50),has=k=>t.sit.some(s=>s.k===k),roll=rnd();let k=null;
  {let acc=0;for(const [kk,w] of [['famine',.012+(p<35?.02:0)],['festival',p>=45?.02:0],['plague',.008],['boom',p>=55?.012+(p>70?.03:0):0]]){acc+=typeof runModK==='function'?w*runModK('sit_'+kk,1):w;if(roll<acc){k=kk;break}}}if(k==='famine'&&has('boom'))k=null;
  if(k&&!has(k)&&!has('siege')){townSitAdd(i,k,ri(SITS[k].dur[0],SITS[k].dur[1]));const l=worldNews(`${SITS[k].n} in ${t.name}`);if(seenAt(Math.floor(t.x/TS),Math.floor(t.y/TS)))news.push(l)}})}
function wsTownsTail(t,i){let d=0;for(const s of t.sit)if(SITS[s.k])d+=SITS[s.k].pros;const base=38+t.size*10+(typeof runModK==='function'?runModK('pros',0):0);d+=(base-svNum(t.pros,50))*.04;t.pros=Math.round(clamp(svNum(t.pros,50)+d,0,100)*10)/10}
/* a siege runs its course: the besieger may take the town (stronger houses, smaller towns, a poor or starving town fall easier) */
function wsSiegeEnd(i,s){if(s&&s.by==='east')return null;const t=G.towns[i],a=s.by,h=houseById(a);G.parties=G.parties.filter(p=>p.siege!==i);if(!h||t.own===a)return null;
 const def=t.own,atk=houseTowns(a).length*.8+2+rnd()*5,dfn=(isHouse(def)?houseTowns(def).length*.5:1)+t.size+rnd()*4+svNum(t.pros,50)/50;
 if(atk>dfn&&!G.houses.some(x=>x.seat===i)){t.own=a;t.pros=clamp(svNum(t.pros,50)-8,0,100);t.ref=-99;return worldNews(`${h.n} took ${t.name}${isHouse(def)?' from '+factName(def):''}`)}
 return worldNews(`The siege of ${t.name} failed`)}
// townSiegeEnd(i, how): a siege ends early. how 'broken' (the company broke it: the defender is grateful, the besieger is not) | 'lifted'.
function townSiegeEnd(i,how){const s=townSit(i,'siege');if(!s)return false;townSitDel(i,'siege');G.parties=G.parties.filter(p=>p.siege!==i);const t=G.towns[i];
 if(how==='broken'){repGain(t.own,15,'Broke the siege of '+t.name);if(s.by)repGain(s.by,-15,'Broke their siege of '+t.name)}worldNews(`The siege of ${t.name} was ${how==='broken'?'broken':'lifted'}`);return true}

/* ---- houses: relations, wars, patrols ---- */
function wsHouses(news){const H=G.houses;
 for(let a=0;a<H.length;a++)for(let b=a+1;b<H.length;b++){const A=H[a],B1=H[b],k=hrKey(A.id,B1.id),war=atWar(A.id,B1.id),wa=HPERS[A.pers].war+HPERS[B1.pers].war;let v=svNum(G.hrel[k],0);
  v+=(rnd()-.5)*10-v*.02-wa*1.1+(war?2.6:0)-(typeof runModK==='function'?runModK('feud',0):0);v=Math.round(clamp(v,-100,100)*10)/10;G.hrel[k]=v;
  if(!war&&v<=WSIM.warAt){G.wars.push({a:A.id,b:B1.id,day:G.day});news.unshift(worldNews(`${A.n} and ${B1.n} are at war`))}
  else if(war){const w=G.wars.find(x=>hrKey(x.a,x.b)===k);if(G.day-w.day>=8&&v>=WSIM.peaceAt&&rnd()<.3*(typeof runModK==='function'?runModK('peace',1):1)){G.wars=G.wars.filter(x=>x!==w);G.hrel[k]=Math.max(v,0);news.unshift(worldNews(`${A.n} and ${B1.n} make peace`))}
   else for(const [x,y] of [[A,B1],[B1,A]])if(rnd()<.22*(typeof runModK==='function'?runModK('siege',1):1))wsBesiege(x,y.id,news)}}
 // warlike and greedy houses sometimes march on a free town nearby
 for(const h of H){const P=HPERS[h.pers];if(G.day>=6&&rnd()<(P.patrols||P.gold?.035:.015))wsBesiege(h,'free',news)}
 // patrols: one or two a house; a house hostile to the company sends riders after it
 for(const h of H){let pat=0,hunt=0;for(const p of G.parties)if(p.f===h.id&&p.goal==='patrol'&&p.siege==null&&p.gar==null){if(p.hunt)hunt++;else pat++}
  const want=1+(HPERS[h.pers].patrols?1:0)+(G.wars.some(w=>w.a===h.id||w.b===h.id)?1:0);if(pat<want&&rnd()<.5)wsSpawnPatrol(h,false);
  if(REPK[repTier(h.id).k].hunt&&hunt<2&&rnd()<.6){wsSpawnPatrol(h,true);if(!hunt)news.push(`${h.n} sends riders after the company`)}
  if(!REPK[repTier(h.id).k].hunt)for(const p of G.parties)if(p.f===h.id&&p.hunt)p.gone=1}}
function wsBesiege(h,enemy,news){const L=G.towns.map((t,i)=>i).filter(i=>G.towns[i].own===enemy&&!townSit(i,'siege'));if(!L.length)return;const S=G.towns[h.seat];
 const i=L.reduce((m,j)=>Math.hypot(G.towns[j].x-S.x,G.towns[j].y-S.y)<Math.hypot(G.towns[m].x-S.x,G.towns[m].y-S.y)?j:m,L[0]),t=G.towns[i];
 townSitAdd(i,'siege',ri(SITS.siege.dur[0],SITS.siege.dur[1]),{by:h.id});const pos=randOk(t.x,t.y,1,1.6);wsAdd({x:pos.x,y:pos.y,f:h.id,goal:'patrol',siege:i,mult:Math.round((1+rnd()*.4)*100)/100});
 news.unshift(worldNews(`${h.n} besieges ${t.name}`))}

/* ---- trade: caravans between towns that are open to each other ---- */
function wsTrade(){let n=0;for(const p of G.parties)if(p.goal==='caravan')n++;const want=Math.max(2,Math.round(G.towns.length/3*(typeof runModK==='function'?runModK('caravans',1):1)));
 for(let k=0;k<2&&n<want;k++){const a=ri(0,G.towns.length-1),A=G.towns[a];if(townSit(a,'siege')||townSit(a,'famine'))continue;
  const L=G.towns.map((t,i)=>i).filter(i=>i!==a&&!townSit(i,'siege')&&houseRelation(A.own,G.towns[i].own)!=='war'&&wsLinked(a,i));if(!L.length)continue;   // only along the roads
  L.sort((x,y)=>Math.hypot(G.towns[x].x-A.x,G.towns[x].y-A.y)-Math.hypot(G.towns[y].x-A.x,G.towns[y].y-A.y));const b=L[ri(0,Math.min(3,L.length-1))];if(wsSpawnCaravan(a,b))n++}}
// a brigand or orc warband out of the wilds raids a town now and then
function wsRaiders(news){if(rnd()>=.1*(typeof runModK==='function'?runModK('raids',1):1))return;const ti=ri(0,G.towns.length-1),t=G.towns[ti],f=G.day>=14&&rnd()<.35?'orc':'bandit',pos=randOk(t.x,t.y,8,13);
 if(wsSpawnRaid(f,pos.x,pos.y,ti,Math.round((.7+rnd()*.4)*100)/100)&&seenAt(Math.floor(t.x/TS),Math.floor(t.y/TS)))news.push(`${FACT[f].n} are seen on the road to ${t.name}`)}

/* worldDay(): one day of the world, once per G.day (newDay calls it). Returns headline lines for the day's toast. */
function worldDay(){const news=[];worldEnsure();if(G.wsim.day>=G.day)return news;G.wsim.day=G.day;
 if(typeof eastInit==='function'&&G.east==null){try{eastInit(G)}catch(e){}}   // an old save meets the East lazily (19-east.js)
 wsTowns(news);if(typeof grDay==='function')grDay();wsHouses(news);wsNests(news);wsTrade();wsRaiders(news);rvDay(news);
 if(typeof crisisDay==='function'){try{crisisDay(news)}catch(e){if(typeof console!=='undefined')console.warn('crisisDay failed',e)}}   // the run's crisis (18-crises.js)
 if(typeof eastDay==='function'){try{eastDay(news)}catch(e){if(typeof console!=='undefined')console.warn('eastDay failed',e)}}        // the Eastern War (19-east.js): pushes its lines into news
 if(typeof fabledDay==='function'){try{fabledDay()}catch(e){if(typeof console!=='undefined')console.warn('fabledDay failed',e)}}     // fabled warriors (21-fabled.js)
 if(typeof dungeonDay==='function'){try{dungeonDay(news)}catch(e){if(typeof console!=='undefined')console.warn('dungeonDay failed',e)}}   // dungeons open over time (24-endgame.js)
 const live=WSIM.live*TS;for(const p of G.parties){if(p.gone)continue;if(svFin(p.life)&&--p.life<=0){p.gone=1;continue}if(Math.hypot(p.x-G.p.x,p.y-G.p.y)>live)wsStep(p)}
 // reputation fades slowly toward neutral (a point a week)
 if(G.day%7===0)for(const f in G.rep){const v=G.rep[f];if(v>0)G.rep[f]=v-1;else if(v<0)G.rep[f]=v+1}
 G.parties=G.parties.filter(p=>!p.gone);if(G.parties.length>WSIM.cap)wsTrim();return news}
// too many parties: drop the farthest plain bands first
function wsTrim(){const d=p=>Math.hypot(p.x-G.p.x,p.y-G.p.y);const plain=G.parties.filter(p=>(!p.goal||p.goal==='roam')&&!p.clash&&!p.ambE).sort((a,b)=>d(b)-d(a)||a.id-b.id);
 const drop=new Set(plain.slice(0,G.parties.length-WSIM.cap).map(p=>p.id));G.parties=G.parties.filter(p=>!drop.has(p.id))}
/* the old rule, kept for plain bands: those left far behind disperse (at most 2x worldBands() stay), and the land near the company is kept
   at worldBands() of them */
function wsKeepBands(){const far=34*TS;let near=0,keep=0;const lim=worldBands()*2;G.parties=G.parties.filter(e=>{if(e.goal&&e.goal!=='roam'||e.clash||e.ambE)return true;const d=Math.hypot(e.x-G.p.x,e.y-G.p.y);if(d<far){near++;return true}return ++keep<=lim});
 const want=worldBands()+(G.crisis&&!G.crisis.ended?4:G.crisis?2:0);for(;near<want;near++)spawnParty()}
function worldBands(){return Math.round(8*Math.sqrt(worldK()))}                     // bands kept near the company: 8 in the small world, a few more in larger ones
function addPortal(){const pos=randOk(WS/2,WS/2,2,26*WN/64);G.portals.push({id:G.nid++,x:pos.x,y:pos.y,realm:pick(REALMS)})}
function showNote(){const n=G.note;G.note=null;if(n==='crisis')crisisSheet();else if(n==='crisisEnd'&&typeof crisisEndSheet==='function')crisisEndSheet();else if(n==='crisisNext'&&typeof crNextSheet==='function')crNextSheet();else if((n==='east'||n==='eastend')&&typeof eastNoteSheet==='function')eastNoteSheet(n);else if(n==='newlands')newLandsSheet();else if(n==='refund'&&typeof refundSheet==='function')refundSheet();
 if(!G.note&&n!=='refund'&&Array.isArray(G.refund)&&G.refund.length)G.note='refund'}   // the perk refund note waits behind any other note
function newLandsSheet(){const t=G.towns[0],n=G.portals.length;
 sheet(`<h2>New lands</h2><p>The old country is behind you. The company marched for weeks and has come down into a wider land: ${t.name} stands before you, with ${G.towns.length-1} more towns beyond it, roads between them and rivers to cross.</p>
 <p class="dim">Your swords, crowns, stores and renown came with you. Contracts from the old country were left behind${n?`, but the rifts have followed: ${n===1?'one burns':n+' burn'} in this land`:''}.</p><button class="pri" onclick="closeSheet()">March on</button>`)}
function siteSheet(id){const s=G.sites&&G.sites.find(s=>s.id===id);if(!s)return;if(s.kind==='colo'&&typeof colSheet==='function')return colSheet(s.id);if((s.kind==='dgn'||s.kind==='dgnc')&&typeof dungeonSheet==='function')return dungeonSheet(s.id);if(s.cr&&typeof crSiteSheet==='function'&&crSiteSheet(s))return;const R=RUINS[s.n%RUINS.length]||RUINS[0],first=!s.v;s.v=1;
 sheet(`<h2>${R[0]}</h2><p>${R[1]}</p><p class="dim">${first?'The company rests a moment among the stones. There is nothing here to carry off.':'Nothing has changed since the company last passed.'}</p><button class="pri" onclick="closeSheet()">Move on</button>`)}
function advanceTime(h,rate){G.hour+=h;if(G.grace>0)G.grace-=h;G.healAcc+=h*(rate||1)*(typeof followerHas==='function'&&followerHas('cook')?1.25:1);while(G.healAcc>=1){G.healAcc--;G.roster.forEach(m=>{const mx=calc(m).hp;if(m.hp<mx)m.hp++})}
 stepWeather(h);while(G.hour>=24){G.hour-=24;G.day++;newDay()}fogReveal();
 if(typeof cvTick==='function')cvTick(h);                                    // caravans and raiders: ambushes and clashes, an hour at a time (42-caravans.js)
 if(typeof ctrTick==='function')ctrTick(h);                                  // contracts in hand: deadlines, escorts on the move (16-contracts.js)
 if(G.moving)travelTick(h)}
/* travel events: on the march, the events agent's eventTick('travel', ctx) is offered a turn every 24..48 hours of travel (the gap is
   seeded: one rnd draw per event offered). ctx = {kind, biome, x, y, town (nearest index), f (its owner), day, weather}. */
function travelTick(h){G.trav=svNum(G.trav,0)+h;if(!svFin(G.travNext))G.travNext=30;if(G.trav<G.travNext||sheetOpen||typeof eventTick!=='function')return;
 G.trav=0;G.travNext=24+Math.floor(rnd()*25);const ti=nearestTown(G.p.x,G.p.y),t=G.towns[ti];
 eventTick('travel',{kind:'travel',biome:weatherBiome(),x:G.p.x,y:G.p.y,town:ti,f:t?t.own:'free',day:G.day,weather:G.weather&&G.weather.kind})}
function nearestTown(x,y){let b=0,bd=1e18;for(let i=0;i<G.towns.length;i++){const t=G.towns[i],d=(t.x-x)*(t.x-x)+(t.y-y)*(t.y-y);if(d<bd){bd=d;b=i}}return b}
// Bands walk a patrol of two or three points near where they formed (on their own kind of ground where they can). They turn on
// the company only inside bandSight(), and give up the chase once it is well out of sight again.
// Parties with a route (caravans, house patrols, raiders: p.pts walked once, end to end) follow it and arrive (wsArrive); the rest walk
// their loop. Only parties that are hostile to the company (partyHostile) turn on it, and hunting patrols (p.hunt) seek it out.
// Parties further than WSIM.live tiles from the company are not moved here: worldDay() advances them a day at a time.
function moveParties(dt){const sight=bandSight(),wf=weatherFx().spd,live=WSIM.live*TS;let gone=0;const esc=typeof escOn==='function'?escOn():null;
 for(const p of G.parties){const dp=Math.hypot(G.p.x-p.x,G.p.y-p.y);if(dp>live)continue;let tx,ty;if(p.clash)continue;
  if(p.gar!=null){if(typeof grMove==='function')grMove(p,dt,wf);continue}   // a town's garrison on a sally walks its own way (43-garrisons.js)
  if(p.goal==='caravan'&&!p.rd&&!wsReroad(p)){p.gone=1;gone=1;continue}   // a caravan off the road (an old save) is put back on it   // locked in a clash with a caravan (42-caravans.js): neither side moves
  const hostile=partyHostile(p),route=WSROUTE[p.goal]&&Array.isArray(p.pts)&&p.pts.length>0&&!p.siege&&p.siegeT==null;
  if(hostile&&G.grace<=0&&(dp<(p.ch?sight*1.35:sight)||p.hunt)&&!(esc&&escSpare(p,esc))){if(esc&&!p.ch)escRaidNote(p,esc);p.ch=1;tx=G.p.x;ty=G.p.y}   // escorting: only bands a match for the whole escort come (escSpare)
  else if(p.siege||p.siegeT!=null){p.ch=0;tx=p.tx;ty=p.ty}   // a besieging host (a house's, or a crisis host: p.siegeT) stays in its lines
  else if(p.goal==='merc'&&(p.idle||!route)){p.ch=0;continue}   // a rival company between plans stands where it is
  else if(p.ambE&&!route){p.ch=0;continue}   // a band lying in wait for an escort (42-caravans.js escAmbush) holds its ground
  else if(route){p.ch=0;const q=p.pts[Math.min(p.pi,p.pts.length-1)];if(Math.hypot(q.x-p.x,q.y-p.y)<5){p.pi++;if(p.pi>=p.pts.length){if(wsArrive(p))gone=1;continue}}const q2=p.pts[p.pi];tx=p.tx=q2.x;ty=p.ty=q2.y}
  else{if(p.ch||!Array.isArray(p.pts)||!p.pts.length){p.ch=0;setPatrol(p)}
   else if(Math.hypot(p.tx-p.x,p.ty-p.y)<5){p.pi=(p.pi+1)%p.pts.length;const q=p.pts[p.pi];if(p.pts.length<2||!lineClear(p.x,p.y,q.x,q.y))setPatrol(p);else{p.tx=q.x;p.ty=q.y}}
   tx=p.tx;ty=p.ty}
  const d=Math.hypot(tx-p.x,ty-p.y)||1,sp=Math.min(d,WBAND*(speedAt(p.x,p.y)||.5)*wf*dt*(p.goal==='caravan'?.8:1)*(p.cr&&!p.ch?.4:1)),nx=p.x+(tx-p.x)/d*sp,ny=p.y+(ty-p.y)/d*sp;
  if(okAt(nx,ny)){p.x=nx;p.y=ny}else if(route){p.x=tx;p.y=ty}else if(!p.ch)patrolHop(p)}
 if(gone)G.parties=G.parties.filter(p=>!p.gone)}
function worldTick(dt){if(!G.roster.length)return;if(G.note&&!sheetOpen){showNote();return}
 if(!sheetOpen&&G.amb&&typeof ambTick==='function'){ambTick();if(G.amb.cel.length&&ambNotify())return}   // a fulfilled ambition or a new renown tier
 if(typeof escTick==='function'&&escTick(dt))return;   // escorting a caravan: the company marches beside the wagons (42-caravans.js)
 if(!G.moving)return;if(!G.path.length){G.moving=false;return}const p=G.p;let tgt=G.path[0];
 // cut corners only where the straight line is no slower than the planned way (so the company keeps to roads and bridges)
 {let ms=speedAt(p.x,p.y)||.5;const n=Math.min(G.path.length-1,6),mins=[];for(let i=0;i<=n;i++){ms=Math.min(ms,speedAt(G.path[i].x,G.path[i].y)||.5);mins.push(ms)}
  for(let i=n;i>0;i--)if(lineClear(p.x,p.y,G.path[i].x,G.path[i].y,mins[i])){G.path.splice(0,i);tgt=G.path[0];break}}
 const sp=WCO*(speedAt(p.x,p.y)||.5)*weatherFx().spd*(typeof runModK==='function'?runModK('march',1):1)*(roadAt(p.x,p.y)&&typeof followerHas==='function'&&followerHas('carto')?1.15:1)*dt,dx=tgt.x-p.x,dy=tgt.y-p.y,d=Math.hypot(dx,dy);
 if(d<=sp){p.x=tgt.x;p.y=tgt.y;G.path.shift();
  if(!G.path.length){if(G.route&&G.route.length>1){G.route.shift();const w=G.route[0];if(!goTo(w.x,w.y,w.dest,true))G.moving=false}else{G.route=[];G.moving=false}}}
 else{p.x+=dx/d*sp;p.y+=dy/d*sp}
 advanceTime(dt*WHRS);moveParties(dt);if(sheetOpen){if(!G.moving)G.route=[];return}
 if(typeof cvReach==='function'&&cvReach(p.x,p.y))return;   // walked up to a clash: the intervene / back off sheet (42-caravans.js)
 if(G.grace<=0)for(const e of G.parties)if(!e.clash&&Math.abs(e.x-p.x)<.4*TS&&Math.abs(e.y-p.y)<.4*TS&&Math.hypot(e.x-p.x,e.y-p.y)<.4*TS&&partyHostile(e)){G.moving=false;G.route=[];engage(partyBattle(e));return}
 // contract targets (16-contracts.js): ctrTargetAt(x,y) -> {o: startBattle options} | {arrive:true} | null; the old hunt check is the fallback
 {const tg=typeof ctrTargetAt==='function'?ctrTargetAt(p.x,p.y):null;if(tg){if(tg.o){G.moving=false;G.route=[];engage(tg.o);return}if(typeof ctrArrive==='function'&&ctrArrive(p.x,p.y)){G.moving=false;G.route=[];return}}
  else{const c=G.contract;if(c&&c.type==='hunt'&&!c.done&&Math.hypot(c.x-p.x,c.y-p.y)<.4*TS){G.moving=false;G.route=[];engage({f:c.f,mult:CTR_DIFFK[clamp(c.diff,1,CTR_DIFFK.length)-1],src:{type:'lair'}});return}}}
 if(!G.moving)arrive()}
function arrive(){const d=G.dest;G.dest=null;G.tap=null;G.route=[];if(!d)return;if(d.type==='town'){if(typeof crTownSheet==='function'&&crTownHeld(d.i)&&crTownSheet(d.i))return;if(typeof enterTown==='function')enterTown(d.i);else openTown(d.i)}else if(d.type==='portal')portalSheet(d.id);else if(d.type==='site')siteSheet(d.id)}
/* camp(): the Camp button. On the road it halts the march; standing still it opens the camp screen (campOpen, 56-camp.js) in a real page,
   else (headless, no camp screen, or called from inside an open screen) rests at once: campRest(). */
function camp(){if(G.moving){G.moving=false;G.route=[];return}if(typeof campOpen==='function'&&!sheetOpen&&mode==='world'&&typeof tvCan==='function'&&tvCan()){campOpen();return}return campRest()}
// the direct rest: six hours, wounds heal twice as fast, tools mend armor. Returns the line it reported.
function campRest(h){h=h||6;advanceTime(h,2);const t=typeof campReport==='function'?campReport(h):'Made camp for '+h+' hours';toast(t);save();return t}
function toggleZoom(){G.zoom=G.zoom===1?.5:1;if(typeof camOff!=='undefined')camOff.x=camOff.y=0}
// Legacy flat-colour world image. The pixel-art world view does not use it; it is only built as a fallback when that view is absent.
function renderWorldImg(){if(typeof document==='undefined'||!W||typeof worldArtScale==='function')return;const cv=document.createElement('canvas');if(!cv||!cv.getContext)return;cv.width=cv.height=WS;const g=cv.getContext('2d');if(!g||!g.fillRect)return;
 const COL=['#2f5d7c','#86a455','#4f7a3c','#9a9a5c','#77736b','#5c7458','#d6b871','#e3e9ee'],h=TS/2;
 for(let y=0;y<WN;y++)for(let x=0;x<WN;x++){const i=y*WN+x,px=x*TS,py=y*TS;g.fillStyle=COL[W.tiles[i]];g.fillRect(px,py,TS,TS);
  for(const [m,col,w] of [[W.river[i],'#3f7fa8',6],[W.road[i],'#b08d57',4]])if(m){g.fillStyle=col;g.fillRect(px+h-w/2,py+h-w/2,w,w);if(m&1)g.fillRect(px+h-w/2,py,w,h);if(m&2)g.fillRect(px+h,py+h-w/2,h,w);if(m&4)g.fillRect(px+h-w/2,py+h,w,h);if(m&8)g.fillRect(px,py+h-w/2,h,w)}}
 W.img=cv}

/* Every battle the player walks into goes through engage(): a pre-battle screen may take over when deployBattle() exists. */
function engage(o){if(typeof runModBattle==='function')runModBattle(o);return typeof deployBattle==='function'?deployBattle(o):startBattle(o)}

/* ================= CARAVAN CARGO (world agent) =================
   p.cargo = {good, crowns, items:[itemIds], food, tools, salves, parts:{partKey:n}, trade:[{id, n, v}]} rolled from GOODS[good].cargo when
   the caravan sets out (10-data.js). Public:
     cargoRoll(good, r?, day?)  -> a cargo (r: a 0..1 generator, default the game's rnd; old saves use a stream seeded by the caravan's id)
     cargoFix(c, id, seed)      -> a valid cargo from a saved one (an old {good, crowns} is filled from its good, deterministically)
     cargoList(c)               -> [{k:'crowns'|'food'|'tools'|'salves'|'part'|'item'|'trade', id?, n, t, icon}] one entry a line, for the UI
     cargoText(c)               -> "Chest of spices x2, 30 rations, 140 crowns" (short, readable)
     cargoValue(c)              -> what it is worth in crowns, roughly (trade goods at full price, gear at its resale)
     cargoTake(c)               acting: puts it all into the company (crowns, food, tools, salves, parts, gear and trade goods to the stash);
                                -> {crowns, food, tools, salves, parts, items, trade:[ids], lines (cargoList), text} */
function cgRange(a,r){return Array.isArray(a)&&a.length===2?a[0]+Math.floor(r()*(a[1]-a[0]+1)):0}
function cgPool(S,maxT){const L=[];for(const id in ITEMS){const it=ITEMS[id];if(!it||it.uniq||it.famed||it.craft||it.k==='t'||(it.tier||1)>maxT)continue;
  let ok=false;if(S.spell&&it.spell)ok=true;else if(S.wt&&it.k==='w'&&S.wt.includes(it.wt))ok=true;else if(S.k&&S.k.includes(it.k))ok=S.heavy?(it.arm||0)>=150:S.light?(it.arm||0)<=95:true;if(ok)L.push(id)}return L}
function cargoRoll(good,r,day){r=r||rnd;const key=GOODS[good]?good:'ale',C=GOODS[key].cargo||{crowns:[12,30]},d=svFin(day)?day:(G?G.day:1);
 const o={good:key,crowns:cgRange(C.crowns,r)*10,items:[],food:cgRange(C.food,r),tools:cgRange(C.tools,r),salves:cgRange(C.salves,r),parts:{},trade:[]};
 if(C.parts)for(const k in C.parts){if(typeof PARTS!=='undefined'&&!PARTS[k])continue;const n=cgRange(C.parts[k],r);if(n>0)o.parts[k]=n}
 if(C.items){const maxT=clamp((typeof marketTier==='function'?marketTier(2,d):2)+(C.items.tier||0),1,5),pool=cgPool(C.items,maxT),n=cgRange(C.items.n||[1,1],r);for(let i=0;i<n&&pool.length;i++)o.items.push(pool[Math.floor(r()*pool.length)])}
 if(C.trade)for(const [id,a,b] of C.trade){if(!ITEMS[id])continue;const n=cgRange([a,b],r);for(let i=0;i<n;i++)o.trade.push({id,n:ITEMS[id].n,v:ITEMS[id].price})}
 if(typeof runModK==='function'){const ck=runModK('cargo',1);if(ck!==1)o.crowns=Math.round(o.crowns*ck/10)*10}
 return o}
function cargoFix(c,id,seed){if(!svObj(c))return null;const good=GOODS[c.good]?c.good:'ale',crowns=Math.max(0,Math.round(svNum(c.crowns,0)));
 if(!('items' in c)&&!('trade' in c)&&!('food' in c)){const o=cargoRoll(good,mulberry((((seed|0)^0x6ca7)+Math.imul(svNum(id,0)|0,2654435761))>>>0),1);o.crowns=crowns;return o}   // a cargo saved before v11: filled from its good
 const n=x=>Math.max(0,Math.floor(svNum(x,0))),P={};if(svObj(c.parts))for(const k in c.parts)if((typeof PARTS==='undefined'||PARTS[k])&&n(c.parts[k])>0)P[k]=n(c.parts[k]);
 return{good,crowns,items:Array.isArray(c.items)?c.items.filter(i=>typeof i==='string'&&ITEMS[i]&&!ITEMS[i].famed).slice(0,8):[],food:n(c.food),tools:n(c.tools),salves:n(c.salves),parts:P,
  trade:Array.isArray(c.trade)?c.trade.filter(t=>svObj(t)&&ITEMS[t.id]&&ITEMS[t.id].k==='t').map(t=>({id:t.id,n:ITEMS[t.id].n,v:ITEMS[t.id].price})).slice(0,8):[]}}
function cargoList(c){const L=[];if(!svObj(c))return L;const cnt={};
 for(const t of c.trade||[])cnt[t.id]=(cnt[t.id]||0)+1;for(const id in cnt){const it=ITEMS[id];if(it)L.push({k:'trade',id,n:cnt[id],t:it.n+(cnt[id]>1?' ×'+cnt[id]:''),icon:it.icon||'coin',v:it.price*cnt[id]})}
 const ic={};for(const id of c.items||[])ic[id]=(ic[id]||0)+1;for(const id in ic){const it=ITEMS[id];if(it)L.push({k:'item',id,n:ic[id],t:it.n+(ic[id]>1?' ×'+ic[id]:''),icon:id})}
 if(c.food)L.push({k:'food',n:c.food,t:c.food+' rations',icon:'food'});if(c.tools)L.push({k:'tools',n:c.tools,t:c.tools+' tools',icon:'tools'});
 if(c.salves)L.push({k:'salves',n:c.salves,t:c.salves+' salve'+(c.salves===1?'':'s'),icon:'salve'});
 for(const k in c.parts||{}){const P=typeof PARTS!=='undefined'&&PARTS[k];L.push({k:'part',id:k,n:c.parts[k],t:c.parts[k]+' × '+(P?P.n.toLowerCase():k),icon:'part-'+k})}
 if(c.crowns)L.push({k:'crowns',n:c.crowns,t:c.crowns+' crowns',icon:'coin'});return L}
function cargoText(c){const L=cargoList(c);return L.length?L.map(x=>x.t).join(', '):'Nothing of value'}
function cargoValue(c){if(!svObj(c))return 0;let v=c.crowns||0;for(const t of c.trade||[])v+=t.v||0;for(const id of c.items||[])v+=typeof sellPrice==='function'?sellPrice(id):Math.floor((ITEMS[id]?ITEMS[id].price:0)*.4);
 v+=(c.food||0)*3+(c.tools||0)*3+(c.salves||0)*25;for(const k in c.parts||{})v+=c.parts[k]*12;return Math.round(v)}
function cargoTake(c){const out={crowns:0,food:0,tools:0,salves:0,parts:{},items:[],trade:[],lines:[],text:''};if(!svObj(c)||!G)return out;
 out.lines=cargoList(c);out.crowns=Math.max(0,Math.round(c.crowns||0));G.crowns=(G.crowns||0)+out.crowns;
 out.food=c.food|0;G.food=(G.food||0)+out.food;out.tools=c.tools|0;G.tools=(G.tools||0)+out.tools;out.salves=c.salves|0;G.salve=(G.salve|0)+out.salves;
 if(!svObj(G.parts))G.parts={};for(const k in c.parts||{}){const n=c.parts[k]|0;if(n>0){G.parts[k]=(G.parts[k]||0)+n;out.parts[k]=n}}
 if(!Array.isArray(G.stash))G.stash=[];for(const id of c.items||[])if(ITEMS[id]){G.stash.push(id);out.items.push(id)}for(const t of c.trade||[])if(ITEMS[t.id]){G.stash.push(t.id);out.trade.push(t.id)}
 out.text=out.lines.length?out.lines.map(x=>x.t).join(', '):'nothing of value';return out}

/* ================= RIVAL MERCENARY COMPANIES (world agent) =================
   G.rivals (CONTRACT.md "Shared design") and their own fields:
     ctr   null | {cid?, race? (the company's contract id they race), nest?, ti, x, y, type, f, diff, pay, title, due, eta, day}  the work in hand
     hired null | {by: house id, until: day}   paid by a house hostile to the company to hunt it down (never the honourable)
     rest  days before it takes the road again (after a battle);   x, y where it stands when it has no party;  talk: day of the last parley news
     calm  day until which it leaves the company alone (bought off);   lost: the company's men it has killed (for the deeds)
   World party: {goal:'merc', f: rival id, mult, pts?, idle?, hunt?}. One a company, re-formed at its last place after a rest.
   The daily step (rvDay, from worldDay): upkeep, recruits and gear as crowns allow, a job from a nearby board or a race for the company's
   own target, nests burned out, the abstract fight when it reaches its target (rvFight), houses hiring hunters, wipe-outs, new companies.
   Generation (rivalsInit) runs on a private stream seeded by G.seed (rvWith), so a new world and the v11 save migration give the same rivals.
   Public: rivalsInit(g) rivalRepair(g) (20-state.js) isRival rivalById (15-factions.js) rivalLabel(r) rivalStr(r) rivalPower(r) rivalTier(r)
           rivalParty(r) rivalHostile(r,p?) rivalParley(p) rivalParleyDo(p,k) rivalAlive() rivalJob(r) and through partyBattle /
           worldBattleEnd / partyHostile / partyLabel for the parties. */
const RV={min:2,max:3,upkeep:4,speed:10,take:.4,race:.22,nest:.07,hire:.12,form:.06,deeds:12,cap:14};
function rivalAlive(){return Array.isArray(G&&G.rivals)?G.rivals.filter(r=>r&&r.alive):[]}
function rivalParty(r){if(!r||!G||!Array.isArray(G.parties))return null;for(const p of G.parties)if(p.goal==='merc'&&p.f===r.id&&!p.gone)return p;return null}
function rivalPower(r){return r&&Array.isArray(r.roster)?companyPower(r.roster.slice(0,MAXFIELD)):0}
function rivalTier(r){return typeof renownTier==='function'?renownTier(r?r.renown:0):1}
function rvMult(r){const cp=Math.max(6,typeof fielded==='function'&&G&&G.roster&&G.roster.length?companyPower():6);return Math.round(clamp(rivalPower(r)/cp,.3,3)*100)/100}
function rivalStr(r){const m=rvMult(r);return m<.8?1:m<1?2:3}
// how much the company knows of a rival's swords for the deployment screen (67-deploy.js): 2 names and all after news traded this week, a sword hired from them or with the scout; else 1
function rivalIntel(r){if(!r)return 0;if((svFin(r.talk)&&G.day-r.talk<=7)||(typeof followerHas==='function'&&followerHas('scout')))return 2;return 1}
function rvDeed(r,t){if(!Array.isArray(r.deeds))r.deeds=[];r.deeds.push({day:G?G.day:1,t:String(t).slice(0,120)});if(r.deeds.length>RV.deeds)r.deeds.splice(0,r.deeds.length-RV.deeds)}
function rvTown(i){return G&&G.towns&&G.towns[i]?G.towns[i].name:'the road'}
function rivalJob(r){if(!r||!r.alive)return'Wiped out';if(r.hired)return`Hired by ${factName(r.hired.by)} to hunt the company`;const c=r.ctr;
 if(c)return c.race!=null?`Racing the company to ${c.title}`:c.nest!=null&&c.cid==null?`Out to burn a ${FACT[c.f]?FACT[c.f].n.toLowerCase():'monster'} nest`:`On contract: ${c.title}`;return r.rest>0?'Licking its wounds':'Looking for work'}
function rivalLabel(r){return r?`${r.n}: ${rivalJob(r).charAt(0).toLowerCase()+rivalJob(r).slice(1)}`:''}
// is rival r (its party p) out to fight the company? hired hunters and open feuds; cutthroats fall on a weaker company; the honourable never ambush
function rivalHostile(r,p){if(!r||!r.alive)return false;if(svFin(r.calm)&&r.calm>=G.day)return false;if(r.hired||(p&&p.hunt))return true;const t=repTier(r.id).k;if(t==='hostile')return true;
 const P=RVPERS[r.pers]||{},m=p&&svFin(p.mult)?p.mult:svFin(r.mult)?r.mult:rvMult(r);return!!P.ambush&&t!=='friendly'&&t!=='allied'&&m>=1}   // the cached strength (set daily): no work per frame
/* generation: rvWith(g, seed, fn) runs fn with G = g on a private stream (rnd/ri/pick/shuffle as everywhere), then puts both back */
function rvWith(g,seed,fn){const s0=rngState(),G0=G;G=g;seedRng(seed>>>0);try{return fn()}finally{setRngState(s0);G=G0}}
function rvPickBG(){let tot=0;for(const k in RVBG)if(BG[k])tot+=RVBG[k];let x=rnd()*tot;for(const k in RVBG){if(!BG[k])continue;x-=RVBG[k];if(x<=0)return k}return'sellsword'}
function rvGearTier(renown,day){return clamp(1+Math.floor(renown/160)+Math.floor(day/22),1,5)}
function rvLvl(renown,day){return clamp(1+Math.floor(renown/70)+Math.floor(day/9),1,11)}
// better gear for a rival merc, up to tier T: the same weapon family and grip, armor of the same weight class, a helmet and shield if it has one
function rvGear(m,T){const up=(slot,f)=>{const cur=ITEMS[m.eq[slot]],ct=cur?cur.tier||1:0,L=[];for(const id in ITEMS){const it=ITEMS[id];if(it.uniq||it.famed||it.craft||it.k==='t'||(it.tier||1)>T||(it.tier||1)<=ct||!f(it,cur))continue;L.push(id)}
  if(!L.length)return false;const top=Math.max(...L.map(id=>ITEMS[id].tier||1)),B=L.filter(id=>(ITEMS[id].tier||1)>=top-1);m.eq[slot]=pick(B);return true};
 let n=0;if(m.eq.w&&rnd()<.75&&up('w',(it,c)=>it.k==='w'&&c&&it.wt===c.wt&&!!it.two===!!c.two&&!!it.spell===!!c.spell))n++;
 if(rnd()<.7&&up('a',(it,c)=>it.k==='a'&&(!c||(c.arm<=60?it.arm<=95:it.arm>60))&&!!(it.robe||/robe/.test(it.look||''))===!!(c&&(c.robe||/robe/.test(c.look||'')))))n++;
 if(rnd()<.6&&up('h',it=>it.k==='h'))n++;if(m.eq.s&&ITEMS[m.eq.s]&&ITEMS[m.eq.s].k==='s'&&rnd()<.5&&up('s',it=>it.k==='s'))n++;
 if(typeof fixHands==='function')fixHands(m);if(typeof syncMast==='function')syncMast(m);m.hp=calc(m).hp;return n}
function rvNewMerc(r,day){const m=newMerc(rvPickBG()),L=clamp(rvLvl(r.renown,day)+ri(-1,1),1,12);if(L>1)makeVeteran(m,L);delete m.vet;rvGear(m,rvGearTier(r.renown,day));
 m.field=r.roster.filter(x=>x.field).length<MAXFIELD;m.slot=null;m.hp=calc(m).hp;return m}
function rvMake(g,nm,pers,c1,c2,home,renown){const id='r'+(g.rvn=(g.rvn|0)+1,g.rvn-1),T=g.towns[home]||g.towns[0],day=Math.max(1,Math.floor(svNum(g.day,1)));
 const r={id,n:'The '+nm[0],short:nm[0],c1,c2,emblem:typeof EMBLEMS==='object'&&EMBLEMS[nm[1]]?nm[1]:'swords',pers,renown,crowns:250+renown*2,home,roster:[],stance:pers==='honour'?5:pers==='cutthroat'?-12:0,
  alive:true,day,deeds:[],ctr:null,hired:null,rest:0,x:T.x,y:T.y};
 if(typeof bnVariety==='function')Object.assign(r,bnVariety('rival'+id+':'+(g.seed|0),c1,c2,.4));   // flag division and shape: a hash, never rnd()
 const n=clamp(5+Math.floor(renown/60)+ri(0,2),5,12);for(let i=0;i<n;i++)r.roster.push(rvNewMerc(r,day));r.roster.sort((a,b)=>b.lvl-a.lvl||a.id-b.id);r.roster.forEach((m,i)=>m.field=i<MAXFIELD);return r}
function rvColours(g){const used=new Set((g.houses||[]).map(h=>h.c1).concat((g.rivals||[]).filter(r=>r.alive).map(r=>r.c1),[g.banner&&g.banner.c1||'5']));const ks=Object.keys(typeof BANNERC==='object'?BANNERC:{g:1,x:1});
 const free=ks.filter(k=>!used.has(k)),c1=free.length?pick(free):pick(ks),c2s=ks.filter(k=>k!==c1);return[c1,pick(c2s)]}
function rvNameFree(g){const have=new Set((g.rivals||[]).map(r=>r.short));const L=RVNAMES.filter(n=>!have.has(n[0]));return L.length?pick(L):[pick(RVNAMES)[0]+' '+ri(2,9),'swords']}
function rvHome(g){const used=new Set((g.rivals||[]).filter(r=>r.alive).map(r=>r.home)),L=g.towns.map((t,i)=>i).filter(i=>i>0&&!used.has(i));return L.length?pick(L):ri(0,g.towns.length-1)}
// rivalsInit(g): 2 rival companies in the small world, 3 in larger ones, from the seed alone. Fills only when g.rivals is missing.
function rivalsInit(g){g=g||G;if(!g||!Array.isArray(g.towns)||g.towns.length<2||Array.isArray(g.rivals))return g;const n=(WN<=64?2:3)+(typeof runModK==='function'&&g===G?runModK('rivals',0):0),day=Math.max(1,Math.floor(svNum(g.day,1)));
 {let nid=Math.floor(svNum(g.nid,1));const see=x=>{if(svObj(x)&&svFin(x.id)&&x.id>=nid)nid=Math.floor(x.id)+1};(g.roster||[]).forEach(see);(g.parties||[]).forEach(see);(g.towns||[]).forEach(t=>(t.recruits||[]).forEach(see));g.nid=nid}
 g.rivals=[];g.rvn=0;
 rvWith(g,((g.seed|0)^0x2a17c0de)>>>0,()=>{const pers=shuffle(Object.keys(RVPERS));
  for(let k=0;k<n;k++){const [c1,c2]=rvColours(g),nm=rvNameFree(g),home=rvHome(g),renown=ri(20,110)+day*3;g.rivals.push(rvMake(g,nm,pers[k%pers.length],c1,c2,home,renown))}});
 if(typeof rivalFactReg==='function')rivalFactReg(g);return g}
// a new company forms (a wiped-out one leaves room): modest renown, in a town nobody calls home. Draws on the game stream.
function rvForm(news){const [c1,c2]=rvColours(G),nm=rvNameFree(G),home=rvHome(G),r=rvMake(G,nm,pick(Object.keys(RVPERS)),c1,c2,home,ri(10,40)+G.day);G.rivals.push(r);rivalFactReg(G);
 rvDeed(r,`Raised its banner in ${rvTown(home)}`);news.push(worldNews(`A new company, ${r.n}, raises its banner in ${rvTown(home)}`));return r}
function rvWipe(r,how,news){if(!r||!r.alive)return;r.alive=false;r.roster=[];r.ctr=null;r.hired=null;const p=rivalParty(r);if(p)p.gone=1;
 if(G.contract&&G.contract.rival===r.id)delete G.contract.rival;rvDeed(r,'Wiped out'+(how?' '+how:''));const t=worldNews(`${r.n} ${how?'were wiped out '+how:'are no more'}`);if(news)news.unshift(t)}

/* ---- the abstract fight off-screen: power against the work's strength. -> {win, dead:[names]} (game rnd) ---- */
function rvFoeK(diff,f){return(4+G.day*.3)*CTR_PAYK[clamp(diff|0,1,5)-1]*((typeof CTR_TIERK==='object'&&FACT[f]&&CTR_TIERK[FACT[f].tier])||1)}
function rvFight(r,diff,f){const P=rivalPower(r),E=rvFoeK(diff,f),q=P/Math.max(1,E),win=rnd()<clamp(.5+(q-1)*.7,.1,.92),dead=[];
 const die=win?clamp(.06/q,.02,.15):clamp(.28/q,.12,.45);r.roster=r.roster.filter(m=>{if(r.roster.length-dead.length>1&&rnd()<die){dead.push(m.name);return false}return true});
 if(!win&&r.roster.length>1&&!dead.length){dead.push(r.roster[r.roster.length-1].name);r.roster.pop()}
 for(const m of r.roster)if(rnd()<.15&&typeof rollInjury==='function')rollInjury(m,rnd()<.3,false);
 if(win)for(let k=0;k<2;k++){const m=pick(r.roster);if(m&&m.lvl<rvLvl(r.renown+60,G.day)+1&&rnd()<.55){makeVeteran(m,m.lvl+1);delete m.vet}}
 r.roster.forEach((m,i)=>m.field=i<MAXFIELD);return{win,dead}}
/* ---- a rival reaches its target ---- */
function rvResolve(r,news){const c=r.ctr;r.ctr=null;if(!c)return;const ti=c.ti!=null?c.ti:nearestTown(c.x,c.y),R=rvFight(r,c.diff,c.f),pc=G.contract,mine=pc&&!pc.failed&&c.race!=null&&pc.id===c.race;
 const lost=R.dead.length?` (${R.dead.length===1?R.dead[0]+' fell':R.dead.length+' fell'})`:'';
 if(R.win){r.crowns+=c.pay||0;r.renown+=Math.round(6*c.diff*(RVPERS[r.pers]&&RVPERS[r.pers].glory>1?1.25:1));rvDeed(r,`${c.title}: done${lost}`);
  if(c.nest!=null&&Array.isArray(G.nests)&&G.nests.some(n=>n.id===c.nest)){G.nests=G.nests.filter(n=>n.id!==c.nest);for(const p of G.parties)if(p.home===c.nest&&p.goal==='nest'){p.home=null;p.goal='roam'}
   if(pc&&!pc.failed&&pc.type==='nest'&&pc.nest===c.nest&&!mine)rvTookFail(pc,r,news)}
  if(mine)rvTookFail(pc,r,news);else news.push(worldNews(`${r.n} ${c.nest!=null&&c.cid==null?'burned out a nest near '+rvTown(ti):'finished the work of '+rvTown(ti)+': '+c.title.charAt(0).toLowerCase()+c.title.slice(1)}`))}
 else{r.renown=Math.max(0,r.renown-4);r.rest=2;rvDeed(r,`${c.title}: beaten back${lost}`);news.push(worldNews(`${r.n} were beaten back near ${rvTown(ti)}${lost}`))}
 if(!r.roster.length)rvWipe(r,'near '+rvTown(ti),news)}
function rvTookFail(pc,r,news){const why=`${r.n} reached ${pc.stages&&pc.stages[pc.stage]&&pc.stages[pc.stage].label||'the target'} first`;pc.rivalWon=r.id;
 if(typeof ctrRivalFail==='function')ctrRivalFail(pc,r,why);else{pc.failed=true;if(G.contract===pc)G.contract=null}
 const t=`Contract lost: ${why} and claimed ${pc.title.charAt(0).toLowerCase()+pc.title.slice(1)}`;news.unshift(worldNews(t));if(typeof toast==='function')toast(t)}
/* ---- choosing work: the company's own racing target, a board nearby, a nest ---- */
const RV_RACE=['hunt','beast','bounty','nest'],RV_TAKE=['hunt','beast','bounty','nest','patrol','relic','defend','crdefend','crhunt','crlib'];
function rvGoStage(c){if(!c||!Array.isArray(c.stages))return null;for(let i=c.stage|0;i<c.stages.length;i++){const s=c.stages[i];if(s&&s.k==='go'&&s.fight)return s}return null}
function rvDist(r,x,y){return Math.hypot(r.x-x,r.y-y)/TS}
function rvJobFrom(c,s,ti){const eta=Math.ceil(Math.hypot(s.x-(G.towns[ti]||s).x,s.y-(G.towns[ti]||s).y)/TS/RV.speed)+1;return{ti,x:s.x,y:s.y,type:c.type,f:s.fight.f,diff:clamp(c.diff|0,1,5),pay:Math.round((c.pay||0)*.9),title:c.title,due:Math.max(svFin(c.due)?c.due:0,G.day+eta+6),day:G.day,nest:c.nest!=null?c.nest:undefined}}
function rvSeek(r,news){const P=RVPERS[r.pers]||RVPERS.greedy,pc=G.contract;
 // race the company to its own target (another employer posted the same head)
 if(pc&&!pc.failed&&!pc.rival&&RV_RACE.includes(pc.type)&&G.day>=3&&(pc.day==null||G.day>pc.day)){const s=rvGoStage(pc);
  if(s&&(pc.stages[pc.stage|0]===s)&&rvDist(r,s.x,s.y)<34&&!rivalAlive().some(o=>o.ctr&&o.ctr.race===pc.id)&&rnd()<RV.race*P.glory){
   const j=rvJobFrom(pc,s,pc.town);j.race=pc.id;j.eta=Math.ceil(rvDist(r,s.x,s.y)/RV.speed)+1;r.ctr=j;pc.rival=r.id;rvDeed(r,`Went after ${pc.title.charAt(0).toLowerCase()+pc.title.slice(1)}`);
   const t=`${r.n} are after the same quarry: ${pc.title.charAt(0).toLowerCase()+pc.title.slice(1)}. Get there first.`;news.unshift(worldNews(t));if(typeof toast==='function')toast(t);return true}}
 // work from a board within reach
 if(rnd()<RV.take){const L=[];let st=-1,sd=1e9;G.towns.forEach((t,ti)=>{const d=rvDist(r,t.x,t.y);if(d<=26&&d<sd&&G.day-Math.max(svNum(t.ref,-99),svNum(t.cref,-99))>=3){sd=d;st=ti}});if(st>=0)rvBoard(G.towns[st]);   // one stale board a day is read afresh (the nearest)
  G.towns.forEach((t,ti)=>{if(!Array.isArray(t.contracts)||rvDist(r,t.x,t.y)>26)return;for(const c of t.contracts){if(!c||c.rtook||!RV_TAKE.includes(c.type)||(svFin(c.due)&&c.due<G.day+2))continue;const s=rvGoStage(c);if(s)L.push({c,s,ti,w:(c.type==='beast'||c.type==='bounty'?P.glory:1)*(c.diff<=rivalTier(r)+1?1:.3)})}});
  if(L.length){let tot=0;for(const x of L)tot+=x.w;let v=rnd()*tot,e=L[L.length-1];for(const x of L){v-=x.w;if(v<=0){e=x;break}}
   const j=rvJobFrom(e.c,e.s,e.ti);j.cid=e.c.id;j.eta=Math.ceil(rvDist(r,e.s.x,e.s.y)/RV.speed)+1;r.ctr=j;e.c.rtook=G.day;e.c.rival=r.id;
   rvDeed(r,`Took the work of ${rvTown(e.ti)}: ${e.c.title}`);const t=worldNews(`${r.n} took the work posted in ${rvTown(e.ti)}: ${e.c.title.charAt(0).toLowerCase()+e.c.title.slice(1)}`);if(G.town===e.ti||rvDist(r,G.p.x,G.p.y)<WSIM.live)news.push(t);return true}}
 // a nest nearby
 if(Array.isArray(G.nests)&&G.nests.length&&rnd()<RV.nest*P.glory){const n=G.nests.filter(q=>rvDist(r,q.x,q.y)<16&&!rivalAlive().some(o=>o.ctr&&o.ctr.nest===q.id)).sort((a,b)=>rvDist(r,a.x,a.y)-rvDist(r,b.x,b.y)||a.id-b.id)[0];
  if(n){r.ctr={nest:n.id,ti:nearestTown(n.x,n.y),x:n.x,y:n.y,type:'nest',f:n.f,diff:clamp(Math.round(n.str*1.5),1,5),pay:0,title:`the ${FACT[n.f].n.toLowerCase()} nest near ${rvTown(nearestTown(n.x,n.y))}`,due:G.day+10,day:G.day,eta:Math.ceil(rvDist(r,n.x,n.y)/RV.speed)+1};return true}}
 return false}
// a board nobody has read for three days gets fresh notices when a rival comes looking (the ones rivals hold stay up)
function rvBoard(t){if(G.day-Math.max(svNum(t.ref,-99),svNum(t.cref,-99))<3||typeof ctrBoard!=='function'||typeof townBoardN!=='function')return;t.cref=G.day;const keep=rvKeepTaken(t);t.contracts=keep.concat(ctrBoard(t,Math.max(0,townBoardN(t)-keep.length)))}
// the notices of a board that rivals took and still work on (stockTown keeps them up, marked as taken)
function rvKeepTaken(t){return(Array.isArray(t.contracts)?t.contracts:[]).filter(c=>c&&c.rtook!=null&&rivalAlive().some(r=>r.ctr&&r.ctr.cid===c.id))}
/* ---- the party on the map: where it walks ---- */
function rvPlan(r,p){const here=()=>[{x:Math.round(p.x),y:Math.round(p.y)}];if(r.hired){p.hunt=1;p.idle=0;p.pts=here();p.pi=0;return}delete p.hunt;let tx,ty,key;
 if(r.ctr){tx=r.ctr.x;ty=r.ctr.y;key='c'+(r.ctr.cid||r.ctr.race||r.ctr.nest||0)}
 else{if(!p.idle&&p.tgt&&p.tgt[0]==='t')return;const L=G.towns.map((t,i)=>i).filter(i=>{const d=rvDist(r,G.towns[i].x,G.towns[i].y);return d>3&&d<30});const i=L.length?pick(L):r.home;tx=G.towns[i].x;ty=G.towns[i].y+(okAt(G.towns[i].x,G.towns[i].y+TS)?TS:0);key='t'+i}
 if(p.tgt===key&&!p.idle)return;p.tgt=key;const pts=wsPathTo(p.x,p.y,tx,ty);if(pts&&pts.length){p.pts=pts;p.pi=0;p.tx=pts[0].x;p.ty=pts[0].y;p.idle=0}else{p.pts=here();p.pi=0;p.idle=1}}
function rvSpawn(r){const pos=okAt(r.x,r.y)?{x:r.x,y:r.y}:randOk(r.x,r.y,0,2);const p=wsAdd({x:pos.x,y:pos.y,f:r.id,goal:'merc',mult:rvMult(r),idle:1,pts:[{x:Math.round(pos.x),y:Math.round(pos.y)}]});return p}
/* rvDay(news): one day of every rival company (worldDay). Game randomness; a handful of draws a company. */
function rvDay(news){if(!Array.isArray(G.rivals))return;const pc=G.contract;
 for(const r of G.rivals){if(!r.alive)continue;
  if(!r.roster.length){rvWipe(r,'',news);continue}
  r.rest=Math.max(0,(r.rest|0)-1);for(const m of r.roster){if(Array.isArray(m.inj))m.inj=m.inj.filter(j=>j.days<0||--j.days>0);m.hp=calc(m).hp}
  r.crowns-=r.roster.length*RV.upkeep;if(r.crowns<0){r.crowns=0;if(r.roster.length>3&&rnd()<.25){const m=r.roster.pop();rvDeed(r,`${m.name} deserted for want of pay`)}}
  if(r.hired&&(G.day>r.hired.until||!isHouse(r.hired.by)||!REPK[repTier(r.hired.by).k].hunt)){rvDeed(r,`Gave up the hunt for ${factName(r.hired.by)}`);r.hired=null}
  // the race is lost when the company has finished the fight first (or let the contract go)
  if(r.ctr&&r.ctr.race!=null){const c=G.contract;if(!c||c.id!==r.ctr.race||c.failed||rvGoStage(c)!==c.stages[c.stage|0]||c.stages[c.stage|0].x!==r.ctr.x){
   if(c&&c.id===r.ctr.race&&!c.failed)delete c.rival;const won=G.ctrLast&&G.ctrLast.id===r.ctr.race?G.ctrLast.ok:c&&c.id===r.ctr.race&&!c.failed;
   if(won!==false){rvDeed(r,`Beaten to ${r.ctr.title.charAt(0).toLowerCase()+r.ctr.title.slice(1)} by ${G.name||'the company'}`);repGain(r.id,-3,'Beat them to the prize');news.push(worldNews(`${G.name||'The company'} beat ${r.n} to the prize`))}
   r.ctr=null}}
  if(r.ctr&&G.day>r.ctr.due+2){rvDeed(r,`Let ${r.ctr.title.charAt(0).toLowerCase()+r.ctr.title.slice(1)} slip`);r.renown=Math.max(0,r.renown-3);r.ctr=null}
  let p=rivalParty(r);if(p){r.x=p.x;r.y=p.y}
  // at the target: the party walked there, or (when it stands within the company's sight, where the day step does not move it) its days ran out
  if(r.ctr){const d=rvDist(r,r.ctr.x,r.ctr.y);r.ctr.eta=svNum(r.ctr.eta,1)-1;if(d<1.3||r.ctr.eta<=0||G.day-svNum(r.ctr.day,G.day)>16){if(p&&d>=1.3&&okAt(r.ctr.x,r.ctr.y)){p.x=r.x=r.ctr.x;p.y=r.y=r.ctr.y;p.tx=p.x;p.ty=p.y}rvResolve(r,news)}if(!r.alive)continue}
  else if(!r.hired&&!r.rest)rvSeek(r,news);
  if(!r.ctr&&!r.hired)r.crowns+=r.roster.length*ri(2,5);   // guard work and small jobs between contracts
  // drill: now and then a sword below what the company's renown and the season call for gains a level
  if(G.day%5===0)for(const m of r.roster)if(m.lvl<rvLvl(r.renown,G.day)-1&&rnd()<.5){makeVeteran(m,m.lvl+1);delete m.vet}
  // grow: recruits while there is coin and room, now and then better gear
  const cap=clamp(6+Math.floor(r.renown/45),6,RV.cap),cost=150+rvLvl(r.renown,G.day)*60;
  if(r.roster.length<cap&&r.crowns>=cost+100&&rnd()<.3){const m=rvNewMerc(r,G.day);r.roster.push(m);r.crowns-=cost;r.roster.sort((a,b)=>b.lvl-a.lvl||a.id-b.id);r.roster.forEach((x,i)=>x.field=i<MAXFIELD)}
  if(r.crowns>700&&rnd()<.12){const m=pick(r.roster);if(m&&rvGear(m,rvGearTier(r.renown,G.day)))r.crowns-=180}
  if(G.day%7===0&&r.stance)r.stance+=r.stance>0?-1:1;
  // the party: formed after a rest, walked toward the work
  r.mult=rvMult(r);if(!p&&!r.rest)p=rvSpawn(r);if(p){p.mult=r.mult;rvPlan(r,p)}}
 // a hostile house hires a company to hunt the company
 for(const h of G.houses||[]){if(!REPK[repTier(h.id).k].hunt||G.rivals.some(r=>r.alive&&r.hired&&r.hired.by===h.id)||rnd()>=RV.hire)continue;
  const L=rivalAlive().filter(r=>RVPERS[r.pers]&&RVPERS[r.pers].hunt&&!r.hired&&repOf(r.id)<15&&r.roster.length>=4&&!(svFin(r.calm)&&r.calm>=G.day));if(!L.length)continue;
  const r=pick(L);if(r.ctr&&r.ctr.race!=null&&G.contract&&G.contract.id===r.ctr.race)delete G.contract.rival;r.ctr=null;r.hired={by:h.id,until:G.day+ri(8,14)};r.crowns+=250;rvDeed(r,`Took ${h.n}'s coin to hunt ${G.name||'the company'}`);
  const t=`${h.n} pays ${r.n} to hunt the company`;news.unshift(worldNews(t));const p=rivalParty(r);if(p)rvPlan(r,p)}
 // new companies form when the land has room for them
 const n=rivalAlive().length,rk=typeof runModK==='function',mx=(WN<=64?RV.max-1:RV.max)+(rk?runModK('rivals',0):0);if(n<mx&&G.towns.length>2&&rnd()<(n<RV.min?RV.form*2.5:RV.form*.5)*(rk?runModK('rvForm',1):1))rvForm(news)}

/* ---- meeting a rival on the road: rivalParley(p) -> {r, title, text, opts:[{k, n, d, cost, ok, why?}]}; rivalParleyDo(p, k) -> {text, fight?}
   k: 'news' trade news (their work, the nearest nest shown on the map; +2 standing, once a day), 'hire' one of their swords for a fee,
      'buyoff' pay them to leave the company alone (hunters break their contract), 'challenge' an open fight (no cost with the towns),
      'attack' fall on them unawares (the honourable cannot be surprised; costs standing with the nearest town's owner unless they are hostile),
      'leave' part ways. Uses no game randomness except what the fight itself draws. ---- */
function rvHireCand(r){if(!r||r.roster.length<=4)return null;const L=r.roster.slice().sort((a,b)=>b.lvl-a.lvl||a.id-b.id);return L[Math.min(L.length-1,1+Math.floor(L.length/3))]||null}
function rvGreed(r){return(RVPERS[r.pers]||RVPERS.greedy).greed}
function rvHireFee(r,m){return Math.round((typeof recruitCost==='function'?recruitCost(m):300)*1.6*rvGreed(r)/10)*10}
function rvBuyFee(r){return Math.round((150+rivalPower(r)*12+(r.hired?250:0))*rvGreed(r)/10)*10}
function rivalParley(p){const r=p&&rivalById(p.f);if(!r||!r.alive)return null;const hostile=partyHostile(p),T=repTier(r.id),P=RVPERS[r.pers]||RVPERS.greedy,opts=[],st=['','weaker than the company','an even match','stronger than the company'][rivalStr(r)];
 const ti=nearestTown(p.x,p.y),own=G.towns[ti]&&G.towns[ti].own;
 const talk=r.talk===G.day;opts.push({k:'news',n:'Trade news',d:talk?'You have already traded news today.':'Swap road talk: what they are about and the nearest nest. +2 standing.',cost:0,ok:!hostile&&!talk,why:hostile?'They are not here to talk':talk?'Already traded news today':''});
 const m=rvHireCand(r),fee=m?rvHireFee(r,m):0,full=G.roster.length>=MAXROSTER,solo=!(typeof canRecruit!=='function'||canRecruit());
 opts.push({k:'hire',n:m?`Hire ${m.name}`:'Hire a sword',d:m?`Level ${m.lvl} ${BG[m.bg].n.toLowerCase()} joins the company for ${fee} crowns. +3 standing.`:'They cannot spare anyone.',cost:fee,m:m?m.id:null,
  ok:!!m&&!solo&&!hostile&&T.min>=-10&&!full&&G.crowns>=fee,why:solo?recruitWhy():!m?'Too few to spare a sword':hostile?'They are not here to talk':T.min<-10?`Their standing is ${T.n.toLowerCase()}`:full?'The roster is full':G.crowns<fee?'Not enough crowns':''});
 if(hostile){const bf=rvBuyFee(r);opts.push({k:'buyoff',n:'Buy them off',d:`${bf} crowns and they leave the company alone for three days${r.hired?`, breaking their contract with ${factName(r.hired.by)}`:''}.`,cost:bf,ok:G.crowns>=bf,why:G.crowns<bf?'Not enough crowns':''})}
 opts.push({k:'challenge',n:'Challenge them',d:`An open fight, banner against banner. No town minds. ${P.honour?'They accept with honour: +50% renown if you win.':''} −10 standing.`.replace('  ',' '),cost:0,ok:true});
 const repCost=!hostile&&own?`−8 standing with ${factName(own)}, `:'';
 opts.push({k:'attack',n:'Fall on them',d:P.honour?'The honourable keep a watch: they cannot be taken unawares.':`Strike first, before they form up. ${repCost}−25 standing.`,cost:0,ok:!P.honour,why:P.honour?'They keep a watch':''});
 opts.push({k:'leave',n:hostile?'Stand your ground':'Part ways',d:hostile?'They mean to fight.':'Each company goes its own way.',cost:0,ok:!hostile});
 const text=`${r.n}: ${r.roster.length} swords under a ${typeof BANNERC==='object'&&BANNERC[r.c1]?BANNERC[r.c1].n.toLowerCase():''} banner, ${P.n.toLowerCase()}, ${renownDef(rivalTier(r)).n.toLowerCase()}. They look ${st}. Standing: ${T.n.toLowerCase()}. ${rivalJob(r)}.`;
 return{r,id:r.id,title:r.n,text,hostile,str:rivalStr(r),stance:repOf(r.id),tier:T,opts}}
function rivalParleyDo(p,k){const P0=rivalParley(p);if(!P0)return{text:'They are gone.'};const r=P0.r,o=P0.opts.find(x=>x.k===k);if(!o)return{text:'Nothing comes of it.'};if(!o.ok)return{text:o.why||'Not now.'};
 const fight=extra=>{const b=partyBattle(p);Object.assign(b,extra||{});b.src=Object.assign({},b.src,extra||{});return b};
 if(k==='news'){r.talk=G.day;repGain(r.id,2,'Traded news on the road');const L=[`${r.n} say they are ${rivalJob(r).charAt(0).toLowerCase()+rivalJob(r).slice(1)}.`];
  const n=(G.nests||[]).slice().sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)||a.id-b.id)[0];
  if(n){fogRevealAt(n.x,n.y,2.5*TS);const ti=nearestTown(n.x,n.y);L.push(`A ${FACT[n.f].n.toLowerCase()} nest lies ${typeof compass==='function'?compass(n.x-G.towns[ti].x,n.y-G.towns[ti].y)+' of':'near'} ${rvTown(ti)}. It is marked on your map.`)}
  const o2=rivalAlive().find(x=>x!==r);if(o2)L.push(`Of ${o2.n}: ${rivalJob(o2).charAt(0).toLowerCase()+rivalJob(o2).slice(1)}.`);const hh=G.houses&&G.houses.find(h=>REPK[repTier(h.id).k].hunt);if(hh)L.push(`They warn you: ${hh.n} has a price on your banner.`);
  return{text:L.join(' ')}}
 if(k==='hire'){const m=r.roster.find(x=>x.id===o.m);if(!m)return{text:'The sword changed their mind.'};G.crowns-=o.cost;r.crowns+=o.cost;r.roster=r.roster.filter(x=>x!==m);r.roster.forEach((x,i)=>x.field=i<MAXFIELD);
  m.field=G.roster.filter(x=>x.field).length<MAXFIELD;m.slot=null;delete m.vet;m.hp=Math.min(m.hp,calc(m).hp);G.roster.push(m);r.mult=p.mult=rvMult(r);r.talk=G.day;repGain(r.id,3,'Hired one of their swords');rvDeed(r,`${m.name} left to join ${G.name||'the company'}`);return{text:`${m.name} shakes hands all round and walks over to your wagons. ${o.cost} crowns well spent.`,m}}
 if(k==='buyoff'){G.crowns-=o.cost;r.crowns+=o.cost;const by=r.hired&&r.hired.by;r.hired=null;r.calm=G.day+3;delete p.hunt;p.ch=0;G.grace=Math.max(G.grace||0,3);if(repOf(r.id)<-39)r.stance=-35;rvPlan(r,p);
  rvDeed(r,`Took ${G.name||'the company'}'s coin to look the other way`);return{text:`${r.n} count the coin and turn aside${by?`. ${factName(by)} will not get what it paid for`:''}.`}}
 if(k==='challenge'){repGain(r.id,-10,'Challenged them');return{text:`${r.n} form up across the road. Banner against banner.`,fight:fight({duel:1})}}
 if(k==='attack'){const ti=nearestTown(p.x,p.y),own=G.towns[ti]&&G.towns[ti].own;if(!P0.hostile&&own)repGain(own,-8,'Ambushed a mercenary company');repGain(r.id,-25,'Fell on them unawares');return{text:'The company falls on them before they can form up.',fight:fight({ambush:1})}}
 return{text:P0.hostile?'They will not let you pass.':`${r.n} raise a hand and go their way.`}}
/* worldBattleEnd's half for a rival company (s.goal 'merc'). The battle agent removes the rival's dead from its roster (from the battle's
   results); this keeps the rest: standing, renown, crowns, news, a hunt that ends, a company wiped out. */
// declined before the first blow (fleeEncounter passes no result record): no battle, the party stays on the road
function rvBattleEnd(r,p,win,out,res){if(!r)return out;
 if(!win&&res===null){rvDeed(r,`${G.name||'The company'} slipped away from them`);out.rival={id:r.id,win:false,fled:true,wiped:false};return out}const ti=nearestTown(p?p.x:r.x,p?p.y:r.y),where='near '+rvTown(ti),duel=!!(out.src&&out.src.duel);
 if(win){const was=rivalHostile(r,p);repGain(r.id,was?-5:-15,'Beaten in battle');const loot=Math.round(r.crowns*.35);r.crowns-=loot;G.crowns+=loot;out.crowns+=loot;
  const rn=Math.round((6+rivalTier(r)*3)*(duel&&RVPERS[r.pers]&&RVPERS[r.pers].honour?1.5:1));G.renown+=rn;out.renown=rn;r.renown=Math.max(0,r.renown-12);
  if(r.hired)rvDeed(r,`Failed ${factName(r.hired.by)}'s hunt`);r.hired=null;if(r.ctr&&r.ctr.race!=null&&G.contract&&G.contract.id===r.ctr.race)delete G.contract.rival;r.ctr=null;r.rest=3;
  const H=G.towns[r.home]||G.towns[ti];r.x=H.x;r.y=H.y;rvDeed(r,`Broken by ${G.name||'the company'} ${where}`);worldNews(`${G.name||'The company'} broke ${r.n} ${where}`);
  if(!r.roster.length)rvWipe(r,'by '+(G.name||'the company')+' '+where)}
 else{r.renown+=10;if(r.hired){r.crowns+=200;rvDeed(r,`Collected ${factName(r.hired.by)}'s price`);r.hired=null}r.rest=1;r.calm=G.day+2;rvDeed(r,`Beat ${G.name||'the company'} ${where}`);worldNews(`${r.n} beat ${G.name||'the company'} ${where}`)}
 out.rival={id:r.id,win:!!win,wiped:!r.alive};if(p)G.parties=G.parties.filter(q=>q.id!==p.id);return out}
