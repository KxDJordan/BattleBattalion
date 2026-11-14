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
           seenAt visibleAt visionRadius bandSight fogReveal fogPack fogLoad weatherFx partyStrength siteSheet */
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
function wgHeap(){return{k:[],f:[]}}
function wgPush(h,k,f){const K=h.k,F=h.f;let i=K.length;K.push(k);F.push(f);while(i>0){const p=(i-1)>>1;if(F[p]<=f)break;K[i]=K[p];F[i]=F[p];i=p}K[i]=k;F[i]=f}
function wgPop(h){const K=h.k,F=h.f,top=K[0],n=K.length-1,k=K[n],f=F[n];K.length=n;F.length=n;
 if(n>0){let i=0;for(;;){let c=2*i+1;if(c>=n)break;if(c+1<n&&F[c+1]<F[c])c++;if(F[c]>=f)break;K[i]=K[c];F[i]=F[c];i=c}K[i]=k;F[i]=f}return top}

/* ---- generation helpers (4-neighbour grids) ---- */
function wgBfs(src){const N=WN*WN,d=new Int16Array(N).fill(999),q=[];for(let i=0;i<N;i++)if(src(i)){d[i]=0;q.push(i)}
 for(let h=0;h<q.length;h++){const k=q[h],x=k%WN,y=(k/WN)|0;for(let j=0;j<4;j++){const nx=x+WDX[j],ny=y+WDY[j];if(nx<0||ny<0||nx>=WN||ny>=WN)continue;const n=ny*WN+nx;if(d[n]>d[k]+1){d[n]=d[k]+1;q.push(n)}}}return d}
// Dijkstra from the start tiles; cost(k,n,dir) < 0 blocks the step; stops at the first tile stop() accepts.
function wgPath(starts,cost,stop){const N=WN*WN,dist=new Float32Array(N).fill(1e9),prev=new Int32Array(N).fill(-1),done=new Uint8Array(N),h=wgHeap();
 for(const s of starts){dist[s]=0;wgPush(h,s,0)}let end=-1;
 while(h.k.length){const k=wgPop(h);if(done[k])continue;done[k]=1;if(stop&&stop(k,dist[k])){end=k;break}const x=k%WN,y=(k/WN)|0;
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
function genWorld(seed){seed=(Number(seed)||0)|0;if(!WGCACHE||WGCACHE.seed!==seed||WGCACHE.n!==WN)WGCACHE=genWorldBase(seed);const b=WGCACHE;
 return{seed,tiles:b.tiles,ok:b.ok,river:b.river,road:b.road,spd:b.spd,size:b.size,towns:b.towns,sites:b.sites,seen:new Uint8Array(WN*WN),fogRev:0,fogKey:-1,img:null}}
/* Scales with the world size (WN): ranges, rivers, ruins and the number of towns grow with the land; the small world (64) is exactly as before. */
function genWorldBase(seed){const N=WN*WN,AK=WN*WN/4096,SK=Math.sqrt(AK),NT=(WORLDSZ[WSZK]&&WORLDSZ[WSZK].n===WN?WORLDSZ[WSZK].towns:Math.round(12*AK/Math.pow(AK,.2))),r=mulberry(seed),nz=sc=>{const f=noiseFn(r,sc,WN+2);return(x,y)=>f(clamp(x,0,WN+1),clamp(y,0,WN+1))};
 const a1=nz(24),a2=nz(12),a3=nz(6),a4=nz(3),wx=nz(15),wy=nz(15),rg=nz(13),rg2=nz(5),mo1=nz(14),mo2=nz(6),te=nz(18),jit=nz(2.2),rj=nz(3.5);
 const el=new Float32Array(N),ridge=new Float32Array(N),tiles=new Uint8Array(N),river=new Uint8Array(N),road=new Uint8Array(N);
 const edgeOf=i=>{const x=i%WN,y=(i/WN)|0;return Math.min(x,y,WN-1-x,WN-1-y)};
 // 1. elevation: warped fractal noise, pulled under the sea toward the map edge
 for(let y=0;y<WN;y++)for(let x=0;x<WN;x++){const i=y*WN+x,ux=x+(wx(x,y)-.5)*14,uy=y+(wy(x,y)-.5)*14,d=Math.min(x,y,WN-1-x,WN-1-y),e=clamp(1-d/12,0,1),rr=Math.hypot(x-(WN-1)/2,y-(WN-1)/2)/(WN/2);
  el[i]=a1(ux,uy)*.5+a2(ux,uy)*.26+a3(x,y)*.15+a4(x,y)*.09-Math.pow(e,1.7)*.55-Math.max(0,rr-1.02)*1.2;
  ridge[i]=(1-Math.abs(2*rg(ux,uy)-1))*.8+rg2(x,y)*.2}
 const pct=(arr,keep,q)=>{const v=[];for(let i=0;i<N;i++)if(keep(i))v.push(arr[i]);v.sort((a,b)=>a-b);return v.length?v[Math.min(v.length-1,Math.floor(v.length*q))]:0};
 const sea=pct(el,()=>true,.47);let top=sea+1e-6;for(let i=0;i<N;i++)if(el[i]>top)top=el[i];
 for(let i=0;i<N;i++){tiles[i]=el[i]>sea&&edgeOf(i)>=3?1:0;el[i]=clamp((el[i]-sea)/(top-sea),0,1)}
 // drop specks: single land tiles in the sea and one-tile puddles
 for(let pass=0;pass<2;pass++)for(let i=0;i<N;i++){const x=i%WN,y=(i/WN)|0;if(x<1||y<1||x>=WN-1||y>=WN-1)continue;let same=0;for(let j=0;j<4;j++)if(tiles[i+WDX[j]+WDY[j]*WN]===tiles[i])same++;if(!same)tiles[i]=tiles[i]?0:1}
 // 2. mountain ranges: a few wandering spines with gaps for passes, some lone massifs from the ridged noise, hills at their feet
 let cd=wgBfs(i=>tiles[i]===0);
 {const inland=[];for(let i=0;i<N;i++)if(tiles[i]===1&&cd[i]>=4)inland.push(i);const heads=[],nR=Math.round((3+Math.floor(r()*3))*Math.pow(AK,.8));
  for(let g=0;g<nR*12&&heads.length<nR&&inland.length;g++){const s=inland[Math.floor(r()*inland.length)],sx=s%WN,sy=(s/WN)|0;if(heads.some(h=>Math.hypot(h[0]-sx,h[1]-sy)<12))continue;heads.push([sx,sy]);
   let x=sx,y=sy,a=r()*6.283,rad=1+r()*.6,gap=6+Math.floor(r()*8),out=0;const len=12+Math.floor(r()*18);
   for(let k=0;k<len&&out<3;k++){a+=(r()-.5)*.8;rad=clamp(rad+(r()-.5)*.5,.7,1.7);x+=Math.cos(a);y+=Math.sin(a);if(--gap<=0){gap=7+Math.floor(r()*9);x+=Math.cos(a);y+=Math.sin(a);continue}
    const cx=Math.round(x),cy=Math.round(y);if(cx<3||cy<3||cx>=WN-3||cy>=WN-3||cd[cy*WN+cx]<2){out++;continue}out=0;
    for(let ay=-2;ay<=2;ay++)for(let ax=-2;ax<=2;ax++){const i=(cy+ay)*WN+cx+ax;if(tiles[i]===1&&cd[i]>=2&&Math.hypot(cx+ax-x,cy+ay-y)<=rad)tiles[i]=4}}}
  const land=i=>tiles[i]===1&&cd[i]>=3,mt=pct(ridge,land,.975);for(let i=0;i<N;i++)if(land(i)&&ridge[i]>mt)tiles[i]=4;
  for(let i=0;i<N;i++){if(tiles[i]!==4)continue;const x=i%WN,y=(i/WN)|0;let n=0;for(let j=0;j<4;j++)if(tiles[(y+WDY[j])*WN+x+WDX[j]]===4)n++;if(!n)tiles[i]=1}   // no lone peaks
  const md=wgBfs(i=>tiles[i]===4);for(let i=0;i<N;i++)if(tiles[i])el[i]=clamp(el[i]*.7+.3*clamp(1-md[i]/6,0,1),0,1);                                         // the land rises toward the ranges
  const ht=pct(el,i=>tiles[i]===1,.955);
  for(let i=0;i<N;i++){if(tiles[i]!==1)continue;const x=i%WN,y=(i/WN)|0;if(md[i]===1||(md[i]===2&&jit(x,y)>.55)||(el[i]>ht&&cd[i]>=2))tiles[i]=3}}
 // 3. one mainland: cut passes through ranges and close narrow straits so every sizeable landmass joins the largest
 for(let g=0;g<40*AK;g++){const C=wgComps(i=>tiles[i]!==0&&tiles[i]!==4),starts=[];if(C.best<0)break;for(let i=0;i<N;i++)if(C.comp[i]===C.best)starts.push(i);
  const res=wgPath(starts,(k,n)=>edgeOf(n)<2?-1:tiles[n]===4?1:tiles[n]===0?2.2:0,(k,d)=>C.comp[k]>=0&&C.comp[k]!==C.best&&C.sizes[C.comp[k]]>=5&&d<=(C.sizes[C.comp[k]]>=100?13.5:4.6));   // a pass up to 4 peaks long, a strait up to 2 tiles (6 for a second continent)
  if(res.end<0)break;for(const k of wgChain(res.prev,res.end))if(tiles[k]===4)tiles[k]=3;else if(tiles[k]===0)tiles[k]=1}
 cd=wgBfs(i=>tiles[i]===0);const md=wgBfs(i=>tiles[i]===4);
 // 4. rivers: from the feet of the mountains down the cheapest (lowest) way to the sea, a lake or another river
 {const src=[];for(let i=0;i<N;i++)if(tiles[i]===3&&md[i]===1&&cd[i]>=5)src.push(i);
  if(src.length<8)for(let i=0;i<N;i++)if(tiles[i]!==0&&tiles[i]!==4&&cd[i]>=6&&el[i]>.45)src.push(i);
  for(let i=src.length-1;i>0;i--){const j=Math.floor(r()*(i+1)),t=src[i];src[i]=src[j];src[j]=t}
  const want=Math.round((5+Math.floor(r()*3))*Math.pow(AK,.8)),heads=[];let made=0;
  for(const s of src){if(made>=want)break;if(river[s]||heads.some(h=>Math.abs(h%WN-s%WN)+Math.abs(((h/WN)|0)-((s/WN)|0))<11))continue;
   const res=wgPath([s],(k,n)=>{if(tiles[n]===4)return-1;if(tiles[n]===0)return .2;if(river[n])return .1;const x=n%WN,y=(n/WN)|0;let c=.2+el[n]*4+rj(x,y)*2.2+jit(x,y)*1.6;
     for(let j=0;j<4;j++){const m=(y+WDY[j])*WN+x+WDX[j];if(m!==k&&river[m])c+=3}return c},k=>k!==s&&(tiles[k]===0||river[k]>0));   // never run beside another river: join it
   if(res.end<0)continue;const ch=wgChain(res.prev,res.end);if(ch.length<6)continue;
   for(let i=0;i<ch.length-1;i++){const a=ch[i],b=ch[i+1];if(tiles[b]===0){const d=b-a;river[a]|=1<<(d===-WN?0:d===1?1:d===WN?2:3)}else wgLink(river,a,b)}
   heads.push(s);made++}}
 // 5. climate: snow in the north, desert in the dry south, swamp on low wet ground, forest where it is moist
 {const rd=wgBfs(i=>river[i]>0),tm=new Float32Array(N),mo=new Float32Array(N),gen=i=>tiles[i]===1;
  for(let i=0;i<N;i++){const x=i%WN,y=(i/WN)|0;tm[i]=y/(WN-1)+(te(x,y)-.5)*.36-el[i]*.06;mo[i]=mo1(x,y)*.62+mo2(x,y)*.38+(rd[i]<=1?.1:rd[i]===2?.05:0)+(cd[i]<=1?.03:0)}
  const cold=Math.max(.17,pct(tm,gen,.14)),hot=Math.min(.8,pct(tm,gen,.8)),low=pct(el,gen,.3),wet=pct(mo,gen,.56),damp=pct(mo,gen,.62);
  for(let i=0;i<N;i++){if(!gen(i))continue;const t=tm[i],m=mo[i];tiles[i]=t<cold?7:t>hot&&m<damp?6:m>wet&&el[i]<low&&t>cold+.06?5:m>damp?2:1}
  for(let pass=0;pass<2;pass++){const out=tiles.slice();for(let i=0;i<N;i++){const t=tiles[i];if(t===0||t===3||t===4)continue;const x=i%WN,y=(i/WN)|0,c=[0,0,0,0,0,0,0,0];let same=0;
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
  if(!best){if(dmin>7.01){dmin=Math.max(7,dmin-.75);continue}break}picks.push(best);for(const c of cand){const q=Math.hypot(best.x-c.x,best.y-c.y);if(q<c.d)c.d=q}}
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
  for(const p of pairs){if(loops>=Math.round(3*T/12))break;const g=net();if(g[p[0]][p[1]]>p[2]*2.1&&p[2]<34*SK){link[p[0]][p[1]]=link[p[1]][p[0]]=p[2];edges.push(p);loops++}}}
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
 const sc=[];for(let i=0;i<N;i++){if(!ok[i]||road[i]||river[i]||edgeOf(i)<3)continue;const x=i%WN,y=(i/WN)|0;if(picks.some(p=>Math.hypot(p.x-x,p.y-y)<4.5))continue;
  let nr=0;for(let j=0;j<4;j++)if(road[(y+WDY[j])*WN+x+WDX[j]])nr++;sc.push({i,x,y,s:r()-(nr?.6:0)})}
 sc.sort((a,b)=>b.s-a.s||a.i-b.i);const sp=[];for(const c of sc){if(sp.every(p=>Math.hypot(p.x-c.x,p.y-c.y)>=9)){sp.push(c);if(sp.length>=Math.round(8*Math.pow(AK,.9)))break}}
 const rn=[...RUINS.keys()];for(let i=rn.length-1;i>0;i--){const j=Math.floor(r()*(i+1)),t=rn[i];rn[i]=rn[j];rn[j]=t}
 const sites=sp.map((p,k)=>({kind:'ruin',x:(p.x+.5)*TS,y:(p.y+.5)*TS,n:rn[k%rn.length]}));
 const spd=new Float32Array(N);for(let i=0;i<N;i++)spd[i]=ok[i]?tileSpeedOf(tiles[i],river[i],road[i]):0;
 return{seed,n:WN,tiles,ok,river,road,spd,size,towns,sites}}

/* ---- queries ---- */
function tileAt(px,py){const x=Math.floor(px/TS),y=Math.floor(py/TS);if(x<0||y<0||x>=WN||y>=WN)return 0;return W.tiles[y*WN+x]}
function okAt(px,py){const x=Math.floor(px/TS),y=Math.floor(py/TS);if(x<0||y<0||x>=WN||y>=WN)return false;return !!W.ok[y*WN+x]}
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
function goTo(wx,wy,dest,leg){if(!leg)G.route=[];
 if(!dest&&G.sites){const s=G.sites.find(s=>Math.hypot(s.x-wx,s.y-wy)<.6*TS);if(s){dest={type:'site',id:s.id};wx=s.x;wy=s.y}}
 const r=routeTo(wx,wy);if(!r){G.route=[];toast('No way through there');return false}
 G.path=r.path;G.moving=true;G.dest=dest||null;G.tap={x:wx,y:wy};if(typeof camOff!=='undefined')camOff.x=camOff.y=0;return true}
// Long routes: waypoints [{x,y,dest}] marched in order. The company passes through the middle ones without stopping.
function setRoute(wps){const list=(Array.isArray(wps)?wps:[]).filter(w=>w&&svFin(w.x)&&svFin(w.y)).map(w=>({x:w.x,y:w.y,dest:w.dest||null}));
 if(!list.length){clearRoute();return false}G.route=list;return goTo(list[0].x,list[0].y,list[0].dest,true)}
function clearRoute(){G.route=[];G.path=[];G.moving=false;G.dest=null;G.tap=null}

/* ---- fog of war ---- */
function nightK(h){return h<5||h>=20?1:h<7?(7-h)/2:h>18?(h-18)/2:0}
function visionRadius(){if(!G||!W)return 0;return Math.max(2.5,WVISBASE*WVIS[tileAt(G.p.x,G.p.y)]*(1-.4*nightK(G.hour))*weatherFx().vis)*TS}
function bandSight(){return clamp(visionRadius()*.55,2*TS,3.75*TS)}       // how far a band can pick the company out: never further than before, less at night, in cover or foul weather
function seenAt(tx,ty){return tx>=0&&ty>=0&&tx<WN&&ty<WN&&!!W&&W.seen[ty*WN+tx]===1}
function visibleAt(tx,ty){if(!G||!W||tx<0||ty<0||tx>=WN||ty>=WN)return false;return Math.hypot((tx+.5)*TS-G.p.x,(ty+.5)*TS-G.p.y)<=visionRadius()}
function fogRevealAt(x,y,rad){const x0=Math.max(0,Math.floor((x-rad)/TS)),x1=Math.min(WN-1,Math.floor((x+rad)/TS)),y0=Math.max(0,Math.floor((y-rad)/TS)),y1=Math.min(WN-1,Math.floor((y+rad)/TS));let ch=false;
 for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){const i=ty*WN+tx;if(!W.seen[i]&&Math.hypot((tx+.5)*TS-x,(ty+.5)*TS-y)<=rad){W.seen[i]=1;ch=true}}
 if(ch)W.fogRev++;return ch}
function fogReveal(){if(!G||!W)return;const rad=visionRadius(),key=(Math.floor(G.p.y/TS)*WN+Math.floor(G.p.x/TS))*512+Math.round(rad/4);if(key===W.fogKey)return;W.fogKey=key;fogRevealAt(G.p.x,G.p.y,rad)}
function fogStart(){if(!G||!W)return;const t=G.towns[0];if(t)fogRevealAt(t.x,t.y,9.5*TS);W.fogKey=-1;fogReveal()}
function fogPack(){if(!W||!W.seen)return null;const s=W.seen,N=s.length;let o='';for(let i=0;i<N;i+=6){let v=0;for(let j=0;j<6&&i+j<N;j++)if(s[i+j])v|=1<<j;o+=B64C[v]}return o}
function fogLoad(str){if(!W)return false;const N=WN*WN;W.seen.fill(0);W.fogKey=-1;W.fogRev++;if(typeof str!=='string'||str.length!==Math.ceil(N/6))return false;
 for(let i=0,c=0;i<N;i+=6,c++){const v=B64C.indexOf(str[c]);if(v<0){W.seen.fill(0);return false}for(let j=0;j<6&&i+j<N;j++)if(v>>j&1)W.seen[i+j]=1}return true}

/* ---- weather ---- */
function weatherBiome(){const t=G&&W?tileAt(G.p.x,G.p.y):1;return WTHRBIO[BIOKEY[t]]?BIOKEY[t]:'plains'}
function rollWeather(){const tab=WTHRBIO[weatherBiome()];let tot=0;for(const e of tab)tot+=e[1];let v=rnd()*tot,kind=tab[0][0];for(const e of tab){if(v<e[1]){kind=e[0];break}v-=e[1]}
 G.weather={kind,t:0,dur:Math.round((kind==='clear'?8+rnd()*14:3+rnd()*9)*10)/10}}
function stepWeather(h){const w=G.weather;if(!w||!WTHR[w.kind]||!svFin(w.t)||!svFin(w.dur)){rollWeather();return}w.t+=h;
 if(w.t>=w.dur||!WTHRBIO[weatherBiome()].some(e=>e[0]===w.kind))rollWeather()}      // the hours run out, or the company walked into a land where this weather does not happen

/* ---- bands, days, the crisis ---- */
function patrolPts(x,y){const bio=tileAt(x,y),pts=[{x:Math.round(x),y:Math.round(y)}];let last=pts[0];
 for(let n=0;n<2;n++)for(let i=0;i<24;i++){const a=rnd()*6.283,d=(3+rnd()*4.5)*TS,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
  if(!okAt(px,py)||(i<16&&tileAt(px,py)!==bio)||!lineClear(last.x,last.y,px,py)||!G.towns.every(t=>Math.hypot(t.x-px,t.y-py)>2.5*TS))continue;last={x:Math.round(px),y:Math.round(py)};pts.push(last);break}
 return pts}
function patrolHop(p){const n=randOk(p.x,p.y,1,4);p.pts=[{x:Math.round(n.x),y:Math.round(n.y)}];p.pi=0;p.tx=p.pts[0].x;p.ty=p.pts[0].y}
function setPatrol(p){p.pts=patrolPts(p.x,p.y);if(p.pts.length<2){patrolHop(p);return}p.pi=1;p.tx=p.pts[1].x;p.ty=p.pts[1].y}
function spawnParty(f){const pos=randOk(G.p.x,G.p.y,9,26);const fs=['gob','bandit','beast','undead'];if(G.day>5)fs.push('orc');if(G.crisis)fs.push('void','void');
 const p={id:G.nid++,x:pos.x,y:pos.y,tx:pos.x,ty:pos.y,f:f||pick(fs),mult:.65+rnd()*.5};setPatrol(p);G.parties.push(p)}
function newDay(){if(typeof healInjuriesDaily==='function')healInjuriesDaily();let wage=0;G.roster.forEach(m=>wage+=BG[m.bg].wage);G.crowns-=wage;let msg=`Day ${G.day}: paid ${wage} crowns in wages`;
 if(G.crowns<0){G.crowns=0;if(G.roster.length>1&&rnd()<.35){const m=G.roster.splice(ri(0,G.roster.length-1),1)[0];msg=`Day ${G.day}: unpaid, ${m.name} deserted`}else msg=`Day ${G.day}: you cannot pay the men`}
 G.food-=G.roster.length;if(G.food<0){G.food=0;G.roster.forEach(m=>m.hp=Math.max(1,m.hp-10));msg+='. The company starves'}
 G.parties=G.parties.filter(e=>Math.hypot(e.x-G.p.x,e.y-G.p.y)<34*TS);     // bands left far behind disperse; the land near the company stays as busy as ever
 while(G.parties.length<worldBands()+(G.crisis?4:0))spawnParty();
 if(!G.crisis&&G.day>=G.crisisDay)startCrisis();
 else if(G.crisis&&G.crisis.ended&&G.day%6===0&&G.portals.length<2)addPortal();
 toast(msg)}
function worldBands(){return Math.round(8*Math.sqrt(worldK()))}                     // bands kept near the company: 8 in the small world, a few more in larger ones
function addPortal(){const pos=randOk(WS/2,WS/2,2,26*WN/64);G.portals.push({id:G.nid++,x:pos.x,y:pos.y,realm:pick(REALMS)})}
function startCrisis(){G.crisis={closed:0,total:3,ended:false};for(let i=0;i<3;i++)addPortal();for(let i=0;i<3;i++)spawnParty('void');
 if(sheetOpen)G.note='crisis';else crisisSheet()}   // a day can turn inside a town (inn): announce once the town is left
function showNote(){const n=G.note;G.note=null;if(n==='crisis')crisisSheet();else if(n==='newlands')newLandsSheet()}
function crisisSheet(){sheet(`<h2>The Sundering</h2><p>The sky splits. Three rifts have torn open across the land and riftspawn pour through them.</p><p class="dim">Each rift leads to another world: three battles with no rest between them, and a tyrant at the end. Close all three to end the crisis.</p><button class="pri" onclick="closeSheet()">To arms</button>`)}
function newLandsSheet(){const t=G.towns[0],n=G.portals.length;
 sheet(`<h2>New lands</h2><p>The old country is behind you. The company marched for weeks and has come down into a wider land: ${t.name} stands before you, with ${G.towns.length-1} more towns beyond it, roads between them and rivers to cross.</p>
 <p class="dim">Your swords, crowns, stores and renown came with you. Contracts from the old country were left behind${n?`, but the rifts have followed: ${n===1?'one burns':n+' burn'} in this land`:''}.</p><button class="pri" onclick="closeSheet()">March on</button>`)}
function siteSheet(id){const s=G.sites&&G.sites.find(s=>s.id===id);if(!s)return;const R=RUINS[s.n%RUINS.length]||RUINS[0],first=!s.v;s.v=1;
 sheet(`<h2>${R[0]}</h2><p>${R[1]}</p><p class="dim">${first?'The company rests a moment among the stones. There is nothing here to carry off.':'Nothing has changed since the company last passed.'}</p><button class="pri" onclick="closeSheet()">Move on</button>`)}
function advanceTime(h,rate){G.hour+=h;if(G.grace>0)G.grace-=h;G.healAcc+=h*(rate||1);while(G.healAcc>=1){G.healAcc--;G.roster.forEach(m=>{const mx=calc(m).hp;if(m.hp<mx)m.hp++})}
 stepWeather(h);while(G.hour>=24){G.hour-=24;G.day++;newDay()}fogReveal()}
// Bands walk a patrol of two or three points near where they formed (on their own kind of ground where they can). They turn on
// the company only inside bandSight(), and give up the chase once it is well out of sight again.
function moveParties(dt){const sight=bandSight(),wf=weatherFx().spd;for(const p of G.parties){const dp=Math.hypot(G.p.x-p.x,G.p.y-p.y);let tx,ty;
  if(G.grace<=0&&dp<(p.ch?sight*1.35:sight)){p.ch=1;tx=G.p.x;ty=G.p.y}
  else{if(p.ch||!Array.isArray(p.pts)||!p.pts.length){p.ch=0;setPatrol(p)}
   else if(Math.hypot(p.tx-p.x,p.ty-p.y)<5){p.pi=(p.pi+1)%p.pts.length;const q=p.pts[p.pi];if(p.pts.length<2||!lineClear(p.x,p.y,q.x,q.y))setPatrol(p);else{p.tx=q.x;p.ty=q.y}}
   tx=p.tx;ty=p.ty}
  const d=Math.hypot(tx-p.x,ty-p.y)||1,sp=Math.min(d,WBAND*(speedAt(p.x,p.y)||.5)*wf*dt),nx=p.x+(tx-p.x)/d*sp,ny=p.y+(ty-p.y)/d*sp;
  if(okAt(nx,ny)){p.x=nx;p.y=ny}else if(!p.ch)patrolHop(p)}}
function worldTick(dt){if(!G.roster.length)return;if(G.note&&!sheetOpen){showNote();return}if(!G.moving)return;if(!G.path.length){G.moving=false;return}const p=G.p;let tgt=G.path[0];
 // cut corners only where the straight line is no slower than the planned way (so the company keeps to roads and bridges)
 {let ms=speedAt(p.x,p.y)||.5;const n=Math.min(G.path.length-1,6),mins=[];for(let i=0;i<=n;i++){ms=Math.min(ms,speedAt(G.path[i].x,G.path[i].y)||.5);mins.push(ms)}
  for(let i=n;i>0;i--)if(lineClear(p.x,p.y,G.path[i].x,G.path[i].y,mins[i])){G.path.splice(0,i);tgt=G.path[0];break}}
 const sp=WCO*(speedAt(p.x,p.y)||.5)*weatherFx().spd*dt,dx=tgt.x-p.x,dy=tgt.y-p.y,d=Math.hypot(dx,dy);
 if(d<=sp){p.x=tgt.x;p.y=tgt.y;G.path.shift();
  if(!G.path.length){if(G.route&&G.route.length>1){G.route.shift();const w=G.route[0];if(!goTo(w.x,w.y,w.dest,true))G.moving=false}else{G.route=[];G.moving=false}}}
 else{p.x+=dx/d*sp;p.y+=dy/d*sp}
 advanceTime(dt*WHRS);moveParties(dt);if(sheetOpen){if(!G.moving)G.route=[];return}
 if(G.grace<=0)for(const e of G.parties)if(Math.hypot(e.x-p.x,e.y-p.y)<.4*TS){G.moving=false;G.route=[];engage({f:e.f,mult:e.mult,src:{type:'party',id:e.id}});return}
 const c=G.contract;if(c&&c.type==='hunt'&&!c.done&&Math.hypot(c.x-p.x,c.y-p.y)<.4*TS){G.moving=false;G.route=[];engage({f:c.f,mult:[.85,1.15,1.5][c.diff-1],src:{type:'lair'}});return}
 if(!G.moving)arrive()}
function arrive(){const d=G.dest;G.dest=null;G.tap=null;G.route=[];if(!d)return;if(d.type==='town')openTown(d.i);else if(d.type==='portal')portalSheet(d.id);else if(d.type==='site')siteSheet(d.id)}
function camp(){if(G.moving){G.moving=false;G.route=[];return}advanceTime(6,2);toast(typeof campReport==='function'?campReport(6):'Made camp for six hours');save()}
function toggleZoom(){G.zoom=G.zoom===1?.5:1;if(typeof camOff!=='undefined')camOff.x=camOff.y=0}
// Legacy flat-colour world image. The pixel-art world view does not use it; it is only built as a fallback when that view is absent.
function renderWorldImg(){if(typeof document==='undefined'||!W||typeof worldArtScale==='function')return;const cv=document.createElement('canvas');if(!cv||!cv.getContext)return;cv.width=cv.height=WS;const g=cv.getContext('2d');if(!g||!g.fillRect)return;
 const COL=['#2f5d7c','#86a455','#4f7a3c','#9a9a5c','#77736b','#5c7458','#d6b871','#e3e9ee'],h=TS/2;
 for(let y=0;y<WN;y++)for(let x=0;x<WN;x++){const i=y*WN+x,px=x*TS,py=y*TS;g.fillStyle=COL[W.tiles[i]];g.fillRect(px,py,TS,TS);
  for(const [m,col,w] of [[W.river[i],'#3f7fa8',6],[W.road[i],'#b08d57',4]])if(m){g.fillStyle=col;g.fillRect(px+h-w/2,py+h-w/2,w,w);if(m&1)g.fillRect(px+h-w/2,py,w,h);if(m&2)g.fillRect(px+h,py+h-w/2,h,w);if(m&4)g.fillRect(px+h-w/2,py+h,w,h);if(m&8)g.fillRect(px,py+h-w/2,h,w)}}
 W.img=cv}

/* Every battle the player walks into goes through engage(): a pre-battle screen may take over when deployBattle() exists. */
function engage(o){return typeof deployBattle==='function'?deployBattle(o):startBattle(o)}
