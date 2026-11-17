/* ================= TOWN VIEW (illustrated town street) =================
   Entering a town shows a street painted in code: tvShow(note) / tvHide(), driven by renderTown() in 50-towns.js.
   Every service the town offers is its own building on the street (tvPlan): the four base lots (tavern, inn, market with the
   tailor behind it, notice board with the temple behind it), then the town's extra buildings (t.bld: armorer, weaponsmith, fletcher,
   arcane college, training hall) between them, and the harbour last, at the water's edge. When the lots are wider than the screen
   the street pans sideways (drag, wheel, the arrows in the bottom bar, or keyboard focus); the labels move with it.
   Detail Low (hdArt() false): the scene is painted once into a palette-index buffer (only PAL keys), lit for the time of day by
   palette remaps (night uses a darker map, lantern pools dither back to the warm map), and blitted at an integer scale.
   Detail High: the same plan is painted as clean-lined, painted vector art at device resolution (51h-townhd.js).
   Either way the painted street is cached (key: town, size, time of day, biome, detail) and a 10 fps overlay draws the small
   animated bits over the visible part of it. Everything cosmetic derives from a hash of the town name; the game's seeded
   rnd() stream is never touched. */
const TV={root:null,cv:null,g:null,W:0,H:0,s:2,key:'',pic:null,an:null,hot:-1,down:-1,raf:0,last:0,tick:0,note:'',paid:false,force:null,dirty:true,ms:0,frames:0,sp:new Map(),
 pan:0,panMax:0,SW:0,k:1,hd:false,vw:0,vh:0,plan:null,panTown:null,drag:null,fling:0,paintMs:0};
const TVK=Object.keys(PAL),TVI={};TVK.forEach((k,i)=>TVI[k]=i+1);
const TVPLACES=[['contracts','Notice board','board'],['tavern','Tavern','tavern'],['market','Market','market'],['inn','Inn','inn'],['temple','Temple','temple'],['tailor','Tailor','tailor']];
/* ---- the street plan: which buildings stand where (shared by both detail levels, in scene units u = one low-res pixel) ----
   lots: [{k, x, w}] left to right; places: {k: {k, tab, x, w, cx, box:{x,y,w,h}, back}}; back = stands behind another lot
   (the temple behind the notice board, the tailor behind the market) and carries its label above that lot. */
const TVID={board:1,tavern:2,market:3,inn:4,temple:5,tailor:6,armorer:7,weaponsmith:8,fletcher:9,college:10,hall:11,harbour:12};
const TVLOT={tavern:90,inn:88,market:96,board:44,armorer:58,weaponsmith:62,fletcher:54,college:44,hall:66,harbour:112};
const TVTAB={board:'contracts'};
function tvPlan(t,ti,W,H){const hs=tvHash(t.name||'town'+ti),GH=Math.round(clamp(H*.29,52,112)),yB=H-GH,R=mulberry(hs^0x5bd1e995);
 const base=[['tavern','board','market','inn'],['inn','board','tavern','market'],['market','board','inn','tavern'],['board','tavern','market','inn']][(hs>>>20)%4];
 const all=tvExtras(t),ex=all.filter(k=>k!=='harbour');for(let i=ex.length-1;i>0;i--){const j=Math.floor(R()*(i+1)),q=ex[i];ex[i]=ex[j];ex[j]=q}
 const seq=[];base.forEach((k,i)=>{seq.push(k);if(ex.length>i)seq.push(ex[i])});for(let i=base.length;i<ex.length;i++)seq.push(ex[i]);if(all.includes('harbour'))seq.push('harbour');
 const sum=seq.reduce((a,k)=>a+TVLOT[k],0),n=seq.length,g0=n<=4?-3:4,m0=4,need=sum+g0*(n-1)+m0*2;
 let SW=W,gap,mar;if(need<=W){gap=Math.min(40,(W-sum)/(n+1));mar=(W-sum-gap*(n-1))/2}else{SW=Math.ceil(need);gap=g0;mar=m0}
 const lots=[];let x=mar;for(const k of seq){lots.push({k,x:Math.round(x),w:TVLOT[k]});x+=TVLOT[k]+gap}
 const places={},put=(k,x0,w,box,cx,back)=>places[k]={k,tab:TVTAB[k]||k,x:x0,w,box,cx:Math.round(cx),back:!!back};
 const BX={tavern:[-90,92],inn:[-108,110],market:[-58,62],board:[-41,49],armorer:[-72,74],weaponsmith:[-72,74],fletcher:[-60,62],college:[-116,118],hall:[-74,76],harbour:[-92,108]};
 for(const L of lots){const b=BX[L.k];put(L.k,L.x,L.w,{x:L.x,y:yB+b[0],w:L.w,h:b[1]},L.k==='harbour'?L.x+24:L.x+L.w/2);
  if(L.k==='board'){const cx=L.x+22;put('temple',cx-27,54,{x:cx-27,y:yB-108,w:54,h:67},cx,1)}
  if(L.k==='market'){const cx=L.x+45;put('tailor',cx-34,68,{x:cx-34,y:yB-88,w:68,h:30},cx,1)}}
 return{SW,W,H,GH,yB,gap,lots,places,seq,hs}}
function tvCan(){return typeof window!=='undefined'&&typeof document!=='undefined'&&typeof HTMLCanvasElement!=='undefined'&&typeof ImageData!=='undefined'}
function tvHash(s){let h=2166136261;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function tvRM(){try{const a=$('app');if(a&&a.classList.contains('rm'))return true;if(typeof SET!=='undefined'&&SET){if(SET.motion==='reduce')return true}
  return!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}catch(e){return false}}
/* time of day and biome */
function tvTod(){if(TV.force&&TV.force.tod)return TV.force.tod;const h=G?G.hour:12;return h>=5&&h<8?'dawn':h>=8&&h<17.5?'day':h>=17.5&&h<20.5?'dusk':'night'}
const TVTODN={dawn:'Dawn',day:'Day',dusk:'Dusk',night:'Night'};
function tvBiome(t){if(TV.force&&TV.force.bio)return TV.force.bio;if(!W||!t)return'plains';const tx=(t.x/TS)|0,ty=(t.y/TS)|0,c=[0,0,0,0,0,0,0,0];
 for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){const ax=tx+x,ay=ty+y;if(ax<0||ay<0||ax>=WN||ay>=WN)continue;c[W.tiles[ay*WN+ax]]++}
 const b=W.tiles[ty*WN+tx];if(b===7)return'snow';if(b===6)return'desert';if(c[5]>=3)return'swamp';if(c[3]+c[4]>=4)return'hills';return b===2?'forest':'plains'}
const TVBION={plains:'Plains',forest:'Forest',hills:'Hill country',swamp:'Fenland',desert:'Desert',snow:'Snowfield'};
/* palette remaps for light. Keys not listed stay as they are. */
const TVMAP={day:{},
 dawn:{r:'l',q:'m',F:'C',x:'C'},
 dusk:{r:'e',q:'m',p:'n',l:'d',m:'k',A:'v',v:'w',w:'B',B:'7','5':'7','6':'5',x:'C',X:'D',F:'h',e:'d',d:'c',c:'k',n:'o',y:'c'},
 night:{'1':'0','2':'1','3':'2','4':'3','5':'7','6':'5','7':'3',a:'1',b:'a',c:'b',d:'n',e:'m',f:'G',g:'f',h:'g',i:'a',j:'i',k:'j',l:'n',m:'o',n:'4',o:'3',p:'o',q:'p',r:'q',
  s:'u',t:'u',u:'i',v:'w',w:'7',A:'B',B:'7',x:'X',X:'G',y:'Y',Y:'a',z:'Z',Z:'3',C:'D',D:'G',E:'K',F:'X',G:'0',H:'a',I:'b',J:'o',K:'f'}};
const TVLIT={r:'l',q:'m',p:'n',l:'d',m:'k',n:'o',o:'4','7':'3',F:'p',x:'X'};   // inside a lantern pool at night: warm, one step down
const TVRAMP={kawara:['p','o','G'],tile:['n','4','3'],red:['h','g','f'],verd:['6','5','7'],slate:['q','p','o'],thatch:['d','c','b'],clay:['E','K','f'],blue:['x','X','G'],wood:['k','j','i'],plum:['C','D','G']};
const TVBAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];

/* ---- painter: a W x H buffer of palette indices plus flags (bit0 emissive, bits1-2 layer, bits3-5 building id) ---- */
function tvPainter(W,H){const buf=new Uint8Array(W*H),fl=new Uint8Array(W*H);
 const P={W,H,buf,fl,em:0,id:0,ly:2,
  p(x,y,k){if(x<0||y<0||x>=W||y>=H)return;const i=y*W+x;buf[i]=TVI[k];fl[i]=P.em|P.ly<<1|P.id<<3},   /* id: bits 3-7 (TVID, up to 31) */
  r(x,y,w,h,k){for(let j=0;j<h;j++)for(let i=0;i<w;i++)P.p(x+i,y+j,k)},
  d(x,y,w,h,k,m){for(let j=0;j<h;j++)for(let i=0;i<w;i++){const a=x+i,b=y+j;if(m===2?((a&1)===0&&(b&1)===0&&((a>>1)+(b>>1)&1)===0):m===1?((a+b*2)%4===0):((a+b)&1)===0)P.p(a,b,k)}},
  s(rows,x,y,flip){for(let j=0;j<rows.length;j++){const r=rows[j],n=r.length;for(let i=0;i<n;i++){const k=r[flip?n-1-i:i];if(k!=='.'&&k!==' ')P.p(x+i,y+j,k)}}},
  disc(cx,cy,r,k,m){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r+r*.8){if(m===undefined)P.p(cx+x,cy+y,k);else P.d(cx+x,cy+y,1,1,k,m)}},
  ln(x0,y0,x1,y1,k){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))||1;for(let i=0;i<=n;i++)P.p(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),k)},
  key(x,y){if(x<0||y<0||x>=W||y>=H)return'';const v=buf[y*W+x];return v?TVK[v-1]:''}};
 return P}
/* buffer -> canvas, applying the light for the time of day */
function tvCompose(P,tod,lights){const W=P.W,H=P.H,c=pxCanvas(W,H),g=c.getContext('2d'),im=g.createImageData(W,H),d=new Uint32Array(im.data.buffer);
 const col=new Uint32Array(TVK.length+1),mk=m=>{const a=new Uint8Array(TVK.length+1);TVK.forEach((k,i)=>a[i+1]=TVI[m[k]||k]);return a};
 TVK.forEach((k,i)=>{const n=parseInt(PAL[k].slice(1),16);col[i+1]=0xff000000|(n&255)<<16|(n>>8&255)<<8|n>>16});
 const base=mk(TVMAP[tod]||{}),lit=mk(TVLIT),night=tod==='night';
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,f=P.fl[i];let v=P.buf[i];if(!v){d[i]=col[1];continue}
  if(!(f&1)){let use=base;
   if(night&&(f>>1&3)===2&&lights.length){let dn=9;for(const L of lights){const dx=(x-L.x)/L.r,dy=(y-L.y)/L.r*1.25,q=dx*dx+dy*dy;if(q<dn)dn=q}
    if(dn<.42||(dn<.8&&((x+y)&1)===0))use=lit}
   v=use[v]}
  d[i]=col[v]}
 g.putImageData(im,0,0);return c}

/* ---- sprites for small props (palette keys) ---- */
const TVS={
 barrel:['.0jj0.','0kjji0','0bbbb0','0kjji0','0kjji0','0bbbb0','0kjji0','.0ii0.'],
 crate:['00000000','0kkkkkj0','0kjiijj0','0kijjij0','0kjiijj0','0jjjjji0','00000000'],
 sack:['..0m0..','.0lmm0.','0llmmm0','0lmmmn0','0lmmnn0','.00000.'],
 lamp:['.000.','0ooo0','0yey0','0yyc0','0ooo0','.0o0.'],
 walkA:['..HH...','.HHH...','.sst...','.sst...','.7550..','755570.','s5557s.','.5577..','.jjij..','.j..i..','.j..i..','.0..0..'],
 walkB:['..HH...','.HHH...','.sst...','.sst...','.7550..','.75570.','.s557..','.5577..','.jjii..','..ji...','..ji...','..00...'],
 bird:['p...p','.p.p.','..p..'],birdB:['.....','pp.pp','..p..'],
 cat:['0....0.','00..00.','0G00G0.','.0GG0..'],
 manq:['...00000...','..0qqqpo0..','..0q000o0..','..0qqppo0..','...0ooo0...','.....j.....','.000000000.','0qqqpqqqpo0','0qppqpppoo0','.0qpqppoo0.','.0qppqpoo0.','.0qpqppoo0.',
  '.0pppppoo0.','.0popopoo0.','.0opopopo0.','.0popopop0.','..0000000..','.....j.....','.....j.....','.....j.....','.....j.....','...jjjjj...','..iiiiiii..'],
 manqE:['..c.....c..','...c...c...','...0ggg0...','..0gffgf0..','..0g000f0..','...0fff0...','.....j.....','.000000000.','0ggfgggff00','0gffgffff00','.0g1g1g1f0.','.0gfgfgff0.','.0g1g1g1f0.',
  '.0gfgfgff0.','.0g1g1g1f0.','.0fffffff0.','..0000000..','.....j.....','.....j.....','.....j.....','.....j.....','...jjjjj...','..iiiiiii..'],
 helmA:['.pqp.','pqqqo','p000o','pqqpo','.ooo.'],helmB:['..g..','.ggg.','.pqp.','pqqpo','po.po'],helmE:['c...c','.c.c.','.gfg.','ggffg','f...f'],
 anvil:['0000000..','oqqqqqpo0','.0ppppo0.','..0oo0...','.0oooo0..','000000000'],
 dummy:['....ddd....','...dcccd...','...cdcdc...','....ccc....','.....j.....','jjjjjjjjjjj','....ccc....','...cdccc...','...cdcbc...','...ccccb...','...ckkkb...','...cdccb...',
  '...cccbb...','....cbb....','.....j.....','.....j.....','.....j.....','.....j.....','.....j.....','.....j.....','.....j.....','...jjjjj...']
};
function tvSpr(key,rows,map,flip){const id=key+'|'+(flip?1:0);let c=TV.sp.get(id);if(c===undefined){c=px(flip?pxFlip(rows):rows,map);TV.sp.set(id,c)}return c}

/* ---- the scene ---- */
function tvPaint(t,ti,PL,tod,bio){const W=PL.SW,H=PL.H,east=!!(t&&t.east),P=tvPainter(W,H),hs=tvHash(t.name||'town'+ti),R=mulberry(hs),rr=(a,b)=>a+Math.floor(R()*(b-a+1)),ch=p=>R()<p;
 const dark=tod==='night',dim=tod==='dusk'||dark,lamps=dim,GH=Math.round(clamp(H*.29,52,112)),yB=H-GH,yH=yB-12,snow=bio==='snow';
 const an={smoke:[],lamps:[],stars:[],glints:[],lights:[],sign:null,mill:null,flag:null,flags:[],sparks:[],runes:[],walkY:yB+12,parts:null,box:{},yB,GH,tod,bio,water:null,walkX1:W};
 const lit=p=>tod==='night'?ch(p):tod==='dusk'?ch(p*.75):tod==='dawn'?ch(p*.3):false;
 const ramps=east?['kawara','tile','kawara','tile']:bio==='desert'?['clay','thatch','blue','plum']:bio==='snow'?['slate','blue','red','verd']:bio==='swamp'?['wood','verd','slate','plum']:bio==='forest'?['verd','wood','red','slate']:bio==='hills'?['slate','red','blue','verd']:['red','thatch','verd','slate'];
 const pickR=()=>ramps[(hs>>>(pickR.n=(pickR.n||0)+3))%ramps.length];
 const rA=TVRAMP[ramps[hs%4]],rB=TVRAMP[ramps[(hs>>>4)%4===hs%4?(hs%4+1)%4:(hs>>>4)%4]],rC=TVRAMP[ramps[(hs>>>8)%4]];
 const wallM=east?'plaster':bio==='desert'?'adobe':bio==='forest'?'logs':bio==='swamp'?'wood':bio==='hills'?'stone':'plaster';
 /* -- sky -- */
 P.ly=0;P.em=1;
 const SKY={day:{plains:['X','x','x','F','F'],forest:['X','x','x','F','F'],hills:['X','X','x','x','F'],swamp:['n','n','m','m','l'],desert:['x','x','F','F','e'],snow:['p','p','q','q','r']},
  dawn:{def:['X','D','C','h','d'],snow:['p','C','C','h','e'],swamp:['o','n','C','h','d']},dusk:{def:['G','D','D','g','E','y'],desert:['D','D','g','E','y','d'],swamp:['G','D','f','g','E','c']},night:{def:['0','0','1','2','3'],snow:['0','1','2','3','4'],desert:['0','1','2','G','D']}}[tod];
 const bands=SKY[bio]||SKY.def||SKY.plains,n=bands.length;
 for(let y=0;y<yH;y++){const tt=y/Math.max(1,yH-1)*(n-1),i=Math.min(n-2,Math.floor(tt)),f=Math.round(clamp((tt-i-.26)/.48,0,1)*4)/4;
  for(let x=0;x<W;x++)P.p(x,y,bands[f*16>TVBAY[(y&3)*4+(x&3)]+.5?i+1:i])}
 // sun, moon, stars
 const sunX=Math.round(W*(tod==='dawn'?.3+((hs>>>12)%3)*.08:tod==='dusk'?.62-((hs>>>12)%3)*.08:.44+((hs>>>12)%4)*.05));
 if(tod==='day'){if(bio==='desert'){P.disc(sunX,Math.round(yH*.3),9,'e',1);P.disc(sunX,Math.round(yH*.3),6,'e');P.disc(sunX,Math.round(yH*.3),4,'r')}
  else if(bio!=='snow'&&bio!=='swamp'){P.disc(sunX,Math.round(yH*.24),7,'F',0);P.disc(sunX,Math.round(yH*.24),5,'e');P.disc(sunX-1,Math.round(yH*.24)-1,3,'r')}
  else{P.disc(sunX,Math.round(yH*.26),6,bio==='snow'?'r':'l',0);P.disc(sunX,Math.round(yH*.26),4,bio==='snow'?'r':'e')}}
 else if(tod==='dawn'){const sy=yH-Math.max(46,Math.round(yH*.3));P.disc(sunX,sy,15,'e',2);P.disc(sunX,sy,11,'e',0);P.disc(sunX,sy,7,'e');P.disc(sunX,sy,5,'r')}
 else if(tod==='dusk'){const sy=yH-Math.max(44,Math.round(yH*.28));P.disc(sunX,sy,16,'y',2);P.disc(sunX,sy,12,'y',0);P.disc(sunX,sy,8,'y');P.disc(sunX,sy,6,'d')}
 else{const mx=Math.round(W*(.24+((hs>>>12)%5)*.13)),my=Math.round(yH*.3)+4;
  for(let i=0;i<Math.round(W*yH/190);i++){const x=rr(0,W-1),y=rr(0,Math.max(4,yH-20)),k=ch(.2)?'l':ch(.5)?'n':'4';P.p(x,y,k);if(k==='l'&&ch(.5)){an.stars.push({x,y});if(ch(.4)){P.p(x-1,y,'4');P.p(x+1,y,'4');P.p(x,y-1,'4');P.p(x,y+1,'4')}}}
  P.disc(mx,my,10,'3',2);P.disc(mx,my,8,'4',0);P.disc(mx,my,6,'l');P.disc(mx-1,my-1,4,'e');P.p(mx+2,my+2,'m');P.p(mx+3,my-1,'m');P.p(mx-2,my+3,'m');P.p(mx+1,my-3,'m');
  if((hs>>>7)%3===0)P.disc(mx+4,my-2,5,bands[1])}
 // clouds
 const cl=tod==='day'?(bio==='snow'?['r','q']:bio==='swamp'?['l','m']:['r','q']):tod==='dawn'?['l','h']:tod==='dusk'?['h','g']:['2','1'];
 const cloud=(cx,cy,w)=>{const h=Math.max(3,Math.round(w/4));for(let j=0;j<h;j++){const f=j/(h-1),half=Math.round(w/2*(.35+.65*Math.sin(f*1.4+.2)))+(j===h-1?1:0),o=Math.round(Math.sin(j*1.7+cx)*2);
   for(let i=-half;i<=half;i++)P.p(cx+i+o,cy+j,j>=h-1?cl[1]:cl[0])}
  P.r(cx-Math.round(w/5),cy-2,Math.round(w/3),2,cl[0]);P.r(cx-Math.round(w/8),cy-3,Math.round(w/6),1,cl[0])};
 const nc=bio==='desert'?1:bio==='snow'||bio==='swamp'?5:3;for(let i=0;i<nc+Math.floor(W/160);i++)cloud(rr(0,W),rr(Math.round(yH*.14)+12,Math.max(Math.round(yH*.14)+13,Math.round(yH*.6))),rr(16,40));
 /* -- far backdrop -- */
 P.em=0;P.ly=1;
 const tri=x=>{x=x-Math.floor(x);return x<.5?x*2:2-x*2},ph=[R()*9,R()*9,R()*9,R()*9];
 const ridge=(base,amp,per,sharp,k,o)=>{o=o||{};let prev=null;for(let x=0;x<W;x++){const u=x/per;
   let h=sharp?tri(u+ph[0])*.6+tri(u*2.3+ph[1])*.28+tri(u*5.1+ph[2])*.12:(Math.sin(u*6.28+ph[0])*.5+.5)*.65+(Math.sin(u*14.6+ph[1])*.5+.5)*.25+(Math.sin(u*31+ph[2])*.5+.5)*.1;
   if(o.mesa)h=Math.round(h*3)/3*.9+h*.1;const top=Math.round(base-amp*h),up=prev===null||top<=prev;prev=top;
   for(let y=top;y<yB;y++){const dep=y-top;let c=k;if(o.cap&&dep<o.capD*(.4+h)&&h>(o.capMin||0))c=up||dep<1?o.cap:o.capS||o.cap;else if(o.sh&&!up&&dep<amp*.5)c=o.sh;else if(o.hi&&up&&dep<(o.hiD||1))c=o.hi;
    if(o.dth&&dep>amp*h*.55&&((x+y)&1)===0)c=o.dth;P.p(x,y,c)}}ph.push(ph.shift())};
 const amp=clamp((yH-24)*.62,30,110);
 if(bio==='plains'){ridge(yH+2,amp*1.05,W*.9,0,'n',{hi:'m'});ridge(yH+4,amp*.6,W*.5,0,'w',{hi:'v',dth:'B'})}
 else if(bio==='forest'){ridge(yH+2,amp*1.2,W*.8,0,'n',{hi:'m'});ridge(yH+4,amp*.7,W*.45,0,'7',{hi:'5',dth:'3'})}
 else if(bio==='hills'){ridge(yH,amp*1.5,W*.62,1,'p',{cap:'r',capS:'q',capD:9,capMin:.45,sh:'o',hi:'q'});ridge(yH+4,amp*.5,W*.4,1,'n',{sh:'o',hi:'m',dth:'w'})}
 else if(bio==='swamp'){ridge(yH+2,amp*.7,W*.7,0,'n',{dth:'o'});ridge(yH+5,amp*.3,W*.3,0,'4',{hi:'n'})}
 else if(bio==='desert'){ridge(yH+2,amp*.9,W*.7,1,'k',{mesa:1,sh:'j',hi:'d',hiD:2});ridge(yH+5,amp*.5,W*.5,0,'c',{hi:'d',dth:'k'})}
 else{ridge(yH,amp*1.5,W*.6,1,'q',{cap:'r',capD:14,capMin:.2,sh:'p',hi:'r'});ridge(yH+4,amp*.4,W*.45,0,'p',{hi:'q',dth:'o'})}
 /* -- tree helpers -- */
 const pine=(x,by,h,c,sn)=>{const tiers=Math.max(2,Math.round(h/6));P.r(x,by-3,1,3,'i');for(let t=0;t<tiers;t++){const ty=by-3-(t+1)*(h-3)/tiers,hw=Math.round((tiers-t)*h/(tiers*3.4))+1,th=Math.ceil((h-3)/tiers)+1;
   for(let j=0;j<th;j++){const w2=Math.round(hw*(j+1)/th);for(let i=-w2;i<=w2;i++)P.p(x+i,Math.round(ty)+j,sn&&j<2&&i<=0?'r':sn&&j<1?'q':i<-w2/3?c[0]:i>w2/2||j===th-1?c[2]:c[1])}}P.p(x,Math.round(by-h),sn?'r':c[0])};
 const leafy=(x,by,r,c)=>{r=Math.max(4,r);const th=Math.round(r*1.1);P.r(x-1,by-th,3,th,'i');P.r(x-1,by-th,1,th,'j');P.p(x-2,by-1,'i');P.p(x+2,by-1,'i');
  const cy=by-th-Math.round(r*.6),bl=[[0,0,r],[-r*.75,r*.3,r*.62],[r*.75,r*.25,r*.6],[-r*.3,-r*.55,r*.6],[r*.4,-r*.5,r*.55]],inb=(px0,py0)=>bl.some(([ox,oy,rad])=>{const dx=px0-(x+ox),dy=(py0-(cy+oy))*1.15;return dx*dx+dy*dy<=rad*rad});
  for(let yy=cy-r*2;yy<=cy+r*2;yy++)for(let xx=x-r*2;xx<=x+r*2;xx++){if(!inb(xx,yy))continue;const tl=!inb(xx-2,yy-2),br=!inb(xx+2,yy+2)||!inb(xx,yy+2),q=tvHash(xx+'t'+yy)%9;
   P.p(xx,yy,tl?c[0]:br?c[2]:q===0&&yy<cy?c[0]:q===1&&yy>cy-r*.3?c[2]:c[1])}
  for(const [ox,oy,rad] of bl){const ax=Math.round(x+ox-rad*.35),ay=Math.round(cy+oy-rad*.35);if(inb(ax,ay)&&inb(ax+2,ay)){P.r(ax,ay,2,1,c[0]);P.p(ax,ay+1,c[0])}}};
 const dead=(x,by,h)=>{P.r(x,by-h,2,h,'3');for(let i=0;i<3;i++){const y=by-h+2+i*Math.round(h/4),dir=i%2?1:-1,len=rr(4,8);for(let j=1;j<=len;j++)P.p(x+(dir>0?1:0)+dir*j,y-Math.round(j*.6),'3')}P.d(x-3,by-h-2,8,3,'4',1)};
 const palm=(x,by,h)=>{for(let j=0;j<h;j++){const ox=Math.round(Math.sin(j/h*1.4)*3);P.r(x+ox,by-j,2,1,j%3?'j':'i')}const tx=x+Math.round(Math.sin(1.4)*3),ty=by-h;
  for(const [dx,dy] of [[-1,-.25],[-1,.35],[1,-.25],[1,.35],[-.5,-.7],[.5,-.7]])for(let j=0;j<9;j++){const fx=Math.round(tx+dx*j),fy=Math.round(ty+dy*j+j*j*.06);P.p(fx,fy,dx<0?'A':'B');P.p(fx,fy+1,'7')}P.r(tx,ty,2,2,'b')};
 const cactus=(x,by,h)=>{P.r(x,by-h,3,h,'B');P.r(x,by-h,1,h,'A');P.r(x+2,by-h+1,1,h-1,'7');P.r(x-3,by-h+5,3,2,'B');P.r(x-3,by-h+2,2,4,'B');P.p(x-3,by-h+2,'A');P.r(x+3,by-h+8,3,2,'7');P.r(x+5,by-h+4,1,5,'B')};
 const sakura=(x,by,r)=>leafy(x,by,r,['r','h','g']);
 const tree=(x,by,sz)=>{if(east&&bio!=='snow'&&bio!=='desert'){ch(.55)?sakura(x,by,Math.round(sz*.4)):pine(x,by,sz+6,['B','7','3']);return}if(bio==='snow')pine(x,by,sz+8,['5','7','3'],1);else if(bio==='forest')(ch(.65)?pine(x,by,sz+10,['5','7','3']):leafy(x,by,Math.round(sz*.42),['A','B','7']));else if(bio==='desert')(ch(.6)?palm(x,by,sz+4):cactus(x,by,Math.round(sz*.6)));
  else if(bio==='swamp')(ch(.6)?dead(x,by,sz):leafy(x,by,Math.round(sz*.36),['w','7','3']));else if(bio==='hills')(ch(.5)?pine(x,by,sz+6,['w','7','3']):leafy(x,by,Math.round(sz*.38),['v','w','7']));else leafy(x,by,Math.round(sz*.42),ch(.25)?['d','c','K']:['A','B','7'])};
 // distant tree line
 if(bio==='forest'||bio==='snow'||bio==='hills'){for(let x=-4;x<W+6;x+=rr(4,7))pine(x,yH+rr(1,3),rr(12,22),snow?['p','o','o']:['7','3','3'],snow&&ch(.7))}
 else if(bio==='plains'){for(let x=rr(0,20);x<W;x+=rr(18,46))leafy(x,yH+2,rr(4,6),east&&ch(.5)?['h','g','f']:['w','B','7'])}
 else if(bio==='swamp'){for(let x=rr(0,12);x<W;x+=rr(14,30))dead(x,yH+3,rr(12,22))}
 else{for(let x=rr(0,30);x<W;x+=rr(30,70))palm(x,yH+3,rr(12,18))}
 /* -- ground -- */
 P.ly=2;
 const GR={plains:{f:'w',fh:'v',fs:'B',rd:'k',rs:'j',rh:'m',g:'B',gh:'w',gs:'7'},forest:{f:'B',fh:'w',fs:'7',rd:'j',rs:'i',rh:'k',g:'7',gh:'B',gs:'3'},hills:{f:'w',fh:'v',fs:'n',rd:'n',rs:'o',rh:'m',g:'w',gh:'v',gs:'7'},
  swamp:{f:'7',fh:'w',fs:'3',rd:'j',rs:'i',rh:'k',g:'3',gh:'7',gs:'2'},desert:{f:'c',fh:'d',fs:'k',rd:'d',rs:'c',rh:'e',g:'c',gh:'d',gs:'k'},snow:{f:'q',fh:'r',fs:'p',rd:'q',rs:'p',rh:'r',g:'r',gh:'r',gs:'q'}}[bio];
 P.r(0,yH,W,yB-yH+2,GR.f);for(let i=0;i<W/3;i++){const x=rr(0,W-1),y=rr(yH,yB);P.p(x,y,ch(.5)?GR.fh:GR.fs);if(ch(.3))P.p(x+1,y,GR.fh)}
 const rdH=Math.round(clamp(GH*.5,26,44)),yF=yB+rdH;
 P.r(0,yB,W,rdH,GR.rd);
 if(bio==='swamp'){for(let y=yB;y<yF;y++){if((y-yB)%5===4)P.r(0,y,W,1,GR.rs);else for(let x=((y-yB)/5|0)%2*9;x<W;x+=18)P.p(x,y,GR.rs)}for(let i=0;i<W/6;i++)P.r(rr(0,W),rr(yB,yF-1),rr(2,5),1,GR.rh)}
 else if(bio==='hills'||bio==='snow'&&0){for(let y=yB;y<yF;y+=4)for(let x=(y/4&1)*4-2;x<W;x+=8){P.r(x,y+3,8,1,GR.rs);P.r(x+7,y,1,4,GR.rs);if(ch(.3))P.r(x+1,y,4,1,GR.rh)}}
 else{for(let i=0;i<W*rdH/26;i++){const x=rr(0,W-1),y=rr(yB+1,yF-2);if(ch(.55)){P.p(x,y,GR.rs);if(ch(.5))P.p(x+1,y,GR.rs)}else P.r(x,y,rr(1,3),1,GR.rh)}
  for(const ry of [yB+Math.round(rdH*.45),yB+Math.round(rdH*.7)])for(let x=rr(0,9);x<W;x+=rr(9,22))P.r(x,ry+(ch(.3)?1:0),rr(4,10),1,GR.rs)}
 P.d(0,yB,W,1,GR.rs,0);
 // foreground band
 P.r(0,yF,W,H-yF,GR.g);for(let x=0;x<W;x++){const e=(Math.sin(x*.37+ph[0])+Math.sin(x*.11+ph[1]))>0.4?1:0;if(e)P.p(x,yF-1,GR.g);if(ch(.16)){P.p(x,yF-1-e,GR.gh);P.p(x,yF-2-e,GR.g)}}
 for(let i=0;i<W*(H-yF)/14;i++){const x=rr(0,W-1),y=rr(yF+1,H-1);if(snow)P.p(x,y,ch(.6)?'q':'F');else if(bio==='desert'){P.r(x,y,rr(2,5),1,ch(.5)?GR.gh:GR.gs)}else{P.p(x,y,ch(.5)?GR.gh:GR.gs);if(ch(.5))P.p(x,y-1,GR.gh)}}
 P.d(0,H-Math.round((H-yF)*.35),W,Math.round((H-yF)*.35),GR.gs,0);
 if(bio==='swamp'){for(let i=0;i<3+W/120;i++){const x=rr(0,W-30),y=rr(yF+4,H-8),w=rr(16,34);for(let j=0;j<5;j++){const ins=j===0||j===4?4:j===1||j===3?1:0;P.r(x+ins,y+j,w-ins*2,1,j<1?'3':'4')}P.r(x+5,y+1,w-12,1,bands[n-2]);an.glints.push({x:x+6,y:y+2,w:w-14,k:'n'});P.r(x+w-8,y+3,3,1,'B')}}
 /* -- wall / roof / window kit -- */
 const mat=(m,x,y)=>{if(m==='stone'){const row=Math.floor(y/4),bx=Math.floor((x+(row&1)*4)/8),q=tvHash(row+':'+bx)%7;return y%4===3||(x+(row&1)*4)%8===7?'o':q===0?'n':q===1&&y%4===0?'q':'p'}
  if(m==='wood')return x%5===4?'i':x%5===0?'k':tvHash(x+'.'+(y>>2))%19===0?'i':'j';
  if(m==='logs')return y%4===3?'i':y%4===0?'k':tvHash((x>>2)+'.'+y)%23===0?'i':'j';
  if(m==='adobe')return tvHash(x+','+y)%29===0?'c':tvHash((x>>1)+','+(y>>1))%37===0?'k':'d';
  if(m==='dark')return x%5===4?'a':x%5===0?'j':'i';
  return tvHash(x+','+y)%31===0?'m':'l'};
 const wall=(x,y,w,h,m)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++){let k=mat(m,x+i,y+j);if((m==='plaster'||m==='adobe')&&(i>=w-2||j<2))k=m==='adobe'?'c':'m';P.p(x+i,y+j,k)}
  if(m==='stone'||m==='wood'||m==='logs'||m==='dark'){P.d(x,y,w,2,m==='stone'?'o':'i',0);P.d(x+w-2,y,2,h,m==='stone'?'o':'i',0)}};
 const timber=(x,y,w,h,st)=>{if(east){P.r(x,y,w,1,'1');P.r(x,y+h-1,w,1,'1');P.r(x,y,2,h,'i');P.r(x+w-2,y,2,h,'i');for(let i=1;i<st;i++)P.r(x+Math.round(i*w/st),y,1,h,'i');P.r(x,y+(h>>1),w,1,'j');return}   // the East: posts and rails, no braces
  P.r(x,y,w,1,'i');P.r(x,y+h-1,w,1,'i');P.r(x,y,2,h,'i');P.r(x+w-2,y,2,h,'i');P.r(x,y,1,h,'j');
  for(let i=1;i<st;i++){const bx=x+Math.round(i*w/st);P.r(bx,y,1,h,'i')}
  for(let j=1;j<Math.min(h-1,8);j++){P.p(x+1+j,y+h-1-j,'i');P.p(x+w-2-j,y+h-1-j,'i')}};
 const win=(x,y,w,h,o)=>{o=o||{};const on=o.lit===undefined?lit(.8):o.lit;
  if(east){P.r(x-1,y-1,w+2,h+2,'1');P.em=on?1:0;for(let j=0;j<h;j++)for(let i=0;i<w;i++)P.p(x+i,y+j,(i%3===2||j%3===2)?(on?'c':'j'):on?(j<h/2?'e':'d'):(dim?'m':'l'));P.em=0;P.r(x-2,y+h+1,w+4,1,'1');return on}   // shoji: paper panes in a wooden latticeP.r(x-1,y-1,w+2,h+2,o.fr||'i');
  if(on){P.em=1;P.r(x,y,w,h,'y');P.r(x,y,Math.ceil(w/2),Math.ceil(h/2),'e');P.r(x,y+h-2,w,2,'c');P.r(x+w-1,y,1,h,'c');P.em=0}
  else{P.r(x,y,w,h,dim?'G':'X');if(!dim){P.r(x,y+h-2,w,2,'G');P.r(x+w-1,y,1,h,'G');for(let j=0;j<Math.min(w,h)-1;j++)if(j<3)P.p(x+1+j,y+2-j>=y?y+2-j:y,'x')}else P.p(x+1,y+1,'o')}
  if(w>=7)P.r(x+Math.floor(w/2),y,1,h,on?'a':'i');if(h>=8)P.r(x,y+Math.floor(h/2)-1,w,1,on?'a':'i');
  P.r(x-2,y+h+1,w+4,1,snow?'r':'k');P.r(x-1,y+h+2,w+2,1,'i');
  if(o.sh){P.r(x-4,y-1,3,h+2,o.sh[1]);P.r(x-4,y-1,1,h+2,o.sh[0]);P.r(x+w+1,y-1,3,h+2,o.sh[1]);P.r(x+w+3,y-1,1,h+2,o.sh[2]);for(let j=1;j<h;j+=3){P.r(x-4,y+j,3,1,o.sh[2]);P.r(x+w+1,y+j,3,1,o.sh[2])}}
  if(o.box){P.r(x-1,y+h,w+2,2,'j');for(let i=0;i<w+2;i++)if(i%2===0)P.p(x-1+i,y+h-1,i%4?'g':'h');else P.p(x-1+i,y+h-1,'B')}
  return on};
 const eaves=(x0,x1,y,c)=>{if(!east)return;for(let k=1;k<=3;k++){P.p(x0-k,y-Math.max(0,k-1),c[0]);P.p(x1+k-1,y-Math.max(0,k-1),c[2])}P.p(x0-3,y-3,c[0]);P.p(x1+2,y-3,c[2])};   // the East: eaves that turn up at the ends
 const roofSide=(x,y,w,h,c,sl)=>{eaves(x,x+w,y+h-1,c);sl=sl===undefined?.5:sl;for(let j=0;j<h;j++){const ins=Math.floor((h-1-j)*sl),x0=x+ins,x1=x+w-ins;for(let i=x0;i<x1;i++){const rw=Math.floor(j/3);let k=c[1];
    if(j%3===2)k=c[2];else if((i+(rw&1)*3)%6===0)k=c[2];else if(j%3===0&&(i+(rw&1)*3)%6===1)k=c[0];
    if(j===0)k=c[0];if(i===x0)k=c[0];if(i===x1-1)k=c[2];if(j===h-1)k='1';
    if(snow){const sd=3+Math.round(Math.sin(i*.7)*1.2+Math.sin(i*.23)*1.5);if(j<sd)k=j===sd-1?'q':'r';if(j===h-2&&(i%5<3))k='r'}
    P.p(i,y+j,k)}}
  if(snow)for(let i=x+2;i<x+w-2;i+=rr(4,9))P.r(i,y+h,1,rr(1,3),'r')};
 const roofGable0=(x,y,w,h,c,m)=>{eaves(x,x+w,y+h-1,c);const cx=x+w/2;for(let j=0;j<h;j++){const half=Math.round((j+1)*w/(2*h)),x0=Math.round(cx-half),x1=Math.round(cx+half);
   for(let i=x0;i<x1;i++){const e=Math.min(i-x0,x1-1-i),left=i-x0<x1-1-i;let k;if(e<1)k=left?c[0]:c[2];else if(e<3)k=left?c[1]:c[2];else if(e<4)k='1';else if(i>=x+2&&i<x+w-2)k=mat(m,i,y+j);else continue;
    if(snow&&e<2)k=e<1?'r':'q';P.p(i,y+j,k)}}};
 const roofGable=(x,y,w,h,c,m)=>{roofGable0(x,y,w,h,c,m);if(east&&h>=8){const k=Math.round(h*.4);roofSide(x-3,y+h-k,w+6,k,c,1.4)}};   // irimoya: a gable over a hipped skirt
 const door=(x,y,w,h,o)=>{o=o||{};P.r(x-1,y,w+2,h,'i');P.r(x,y-1,w,1,'i');P.r(x,y,w,h,'j');for(let i=2;i<w;i+=3)P.r(x+i,y+1,1,h-1,'i');P.r(x,y,1,h,'k');P.r(x,y,w,1,'k');
  if(o.dbl)P.r(x+Math.floor(w/2),y,1,h,'0');P.p(x+w-3,y+Math.floor(h/2),'c');if(o.dbl)P.p(x+Math.floor(w/2)-2,y+Math.floor(h/2),'c');
  if(o.win){const on=lit(.9);P.em=on?1:0;P.r(x+2,y+3,w-4,4,on?'y':'G');if(on)P.r(x+2,y+3,2,2,'e');P.em=0;P.r(x+Math.floor(w/2),y+3,1,4,'i')}
  P.r(x-3,y+h,w+6,2,snow?'r':'q');P.r(x-3,y+h+1,w+6,1,'p')};
 const lantern=(x,y,r)=>{if(east){P.r(x+2,y-3,1,3,'0');P.r(x,y,5,1,'0');P.r(x-1,y+1,7,5,'g');P.r(x,y+6,5,1,'0');P.r(x-1,y+1,1,5,'f');P.r(x+5,y+1,1,5,'f');for(let j=2;j<6;j+=2)P.r(x-1,y+j,7,1,'f');P.p(x+2,y+3,'0');
  if(lamps){P.em=1;P.r(x,y+1,5,5,'E');P.r(x+1,y+2,2,2,'y');P.em=0;an.lamps.push({x:x+1,y:y+2});an.lights.push({x:x+2,y:y+8,r:r||22})}return}P.r(x+2,y-3,1,3,'0');P.s(TVS.lamp,x,y);if(lamps){P.em=1;P.r(x+1,y+2,3,2,'y');P.p(x+2,y+2,'e');P.em=0;an.lamps.push({x:x+1,y:y+2});an.lights.push({x:x+2,y:y+6,r:r||22})}else{P.r(x+1,y+2,3,2,'p');P.p(x+1,y+2,'q')}};
 const chimney=(x,y,w,h,smoke)=>{if(east){if(smoke)an.smoke.push({x:x+Math.floor(w/2),y:y+h});return}for(let j=0;j<h;j++)for(let i=0;i<w;i++)P.p(x+i,y+j,mat('stone',x+i,y+j));P.r(x-1,y,w+2,2,snow?'r':'q');P.r(x-1,y+2,w+2,1,'o');P.r(x+w-1,y+3,1,h-3,'o');if(smoke)an.smoke.push({x:x+Math.floor(w/2),y:y-2})};
 const shadow=(x,y,w)=>{P.d(x,y,w,1,GR.rs,0);P.d(x+2,y+1,w-4,1,GR.rs,1)};
 /* -- back row of houses and the landmark -- */
 const hz=dark?['n','o','4']:['m','n','o'],bR=[[hz[1],hz[2],'4'],['o','4','3'],[rA[1],rA[2],'4'],[rB[1],rB[2],'4']];
 /* -- the plan (tvPlan): lot positions; the temple stands behind the notice board, the tailor behind the market -- */
 const X={},PLC=PL.places;PL.lots.forEach(L=>X[L.k]=L.x);
 const tcx=PLC.temple.cx,tlx=PLC.tailor.cx,harb=PLC.harbour?PLC.harbour.x+40:W+99;if(PLC.harbour)an.walkX1=harb-6;
 // the town's own landmark keeps clear of the temple
 const land=east?(t.size>=3?'castle':'pagoda'):['mill','tower','beacon','gate','mill','tower','gate','beacon'][ti%8],lx=(()=>{const tall=[tcx,tlx].concat(PLC.college?[PLC.college.cx]:[]),span=Math.min(W,harb-30),c=[.3,.4,.5,.6,.7].map(f=>Math.round(span*f)),far=a=>Math.min(...tall.map(q=>Math.abs(a-q))),a=c[(hs>>>16)%5];return far(a)>=46?a:c.slice().sort((p,q)=>far(q)-far(p))[0]})();
 const lmK=bio==='desert'?['d','c','k']:['q','p','o'];
 const LH=Math.round(clamp(yB*.62,70,104)),by0=yB-6,brick=(i,j,hw)=>i<-hw+2?lmK[0]:i>hw-3?lmK[2]:(j%6===5||((i+(j/6|0)*3+60)%7===0))?lmK[2]:lmK[1];
 if(land==='pagoda'){const RF=TVRAMP.tile;let y=by0;for(let k=0;k<5;k++){const hw=13-k*2,bh=k?8:12;for(let j=0;j<bh;j++)for(let i=-hw+3;i<=hw-3;i++)P.p(lx+i,y-j,i===-hw+3?'k':i===hw-3?'i':k?'g':'l');
   for(let i=-hw+5;i<=hw-5;i+=3)P.r(lx+i,y-bh+2,1,bh-3,k?'f':'j');y-=bh;for(let j=0;j<4;j++){const ww=hw-2+Math.round(j*j*.7);for(let i=-ww;i<=ww;i++)P.p(lx+i,y-3+j,j===3?'1':i<-ww*.3?RF[0]:i>ww*.4?RF[2]:RF[1])}P.p(lx-hw-3,y-1,RF[0]);P.p(lx+hw+2,y-1,RF[2]);P.p(lx-hw-4,y-2,RF[0]);P.p(lx+hw+3,y-2,RF[2]);y-=4}
  for(let j=0;j<14;j++)P.p(lx,y-j,j%3===1?'d':'c');P.p(lx-1,y-4,'c');P.p(lx+1,y-4,'c');P.p(lx-1,y-8,'c');P.p(lx+1,y-8,'c');P.p(lx,y-14,'e')}
 else if(land==='castle'){const RF=TVRAMP.kawara;let y=by0;for(let j=0;j<16;j++){const hw=20-Math.round(j*.35);for(let i=-hw;i<=hw;i++)P.p(lx+i,y-j,mat('stone',lx+i,y-j))}y-=16;
  for(let k=0;k<3;k++){const hw=15-k*4,bh=k===2?10:12;wall(lx-hw,y-bh+1,hw*2,bh,'plaster');for(let i=-hw+4;i<hw-3;i+=6)win(lx+i,y-bh+5,3,4,{lit:lit(.6),fr:'1'});y-=bh;for(let j=0;j<6;j++){const ww=hw+2+Math.round(j*j*.4);for(let i=-ww;i<=ww;i++)P.p(lx+i,y-5+j,j===5?'1':i<-ww*.3?RF[0]:i>ww*.4?RF[2]:RF[1])}eaves(lx-hw-4,lx+hw+5,y,RF);y-=6}
  P.s(['c...c','dc.cd','.ccc.'],lx-2,y-2);if(lamps)an.lights.push({x:lx,y:y+20,r:20})}
 else if(land==='mill'){const h=LH-22;for(let j=0;j<h;j++){const hw=6+Math.round(j/9);for(let i=-hw;i<=hw;i++)P.p(lx+i,by0-h+j,brick(i,j,hw+1))}
  for(let j=0;j<9;j++)for(let i=-j-2;i<=j+2;i++)P.p(lx+i,by0-h-9+j,snow&&j<3?'r':i<0?rC[1]:rC[2]);P.r(lx-1,by0-h+12,3,5,'G');P.r(lx-1,by0-h+30,3,5,'G');an.mill={x:lx,y:by0-h-3,r:Math.round(LH*.26)};{const m=an.mill,hid=PL.lots.some(L=>{const b=PLC[L.k].box;return L.k!=='board'&&b.x<m.x+m.r+2&&b.x+b.w>m.x-m.r-2&&b.y<m.y+m.r})||[PLC.temple,PLC.tailor].some(q=>Math.abs(q.cx-m.x)<m.r+30);if(hid){an.millHid=1;for(let a=0;a<4;a++){const th=.4+a*Math.PI/2,cs=Math.cos(th),sn=Math.sin(th);for(let i=2;i<=m.r;i++){const x=m.x+cs*i,y=m.y+sn*i;P.p(Math.round(x),Math.round(y),'i');if(i>m.r*.3){P.p(Math.round(x-sn*1.2),Math.round(y+cs*1.2),'l');P.p(Math.round(x-sn*2.4),Math.round(y+cs*2.4),i%2?'l':'n');P.p(Math.round(x-sn*3.4),Math.round(y+cs*3.4),'n')}}}}}}
 else if(land==='tower'||land==='beacon'){const h=land==='beacon'?LH-14:LH-10;for(let j=0;j<h;j++)for(let i=-8;i<8;i++)P.p(lx+i,by0-h+j,brick(i,j,8));
  for(let i=-10;i<10;i++){P.p(lx+i,by0-h,lmK[2]);P.p(lx+i,by0-h-1,lmK[1]);P.p(lx+i,by0-h-2,lmK[1]);if((i+10)%4<2){P.p(lx+i,by0-h-3,lmK[1]);P.p(lx+i,by0-h-4,snow?'r':lmK[0])}}
  P.r(lx-1,by0-h+10,2,6,'G');P.r(lx-1,by0-h+28,2,6,'G');P.r(lx-5,by0-h+44,2,5,'G');
  if(land==='beacon'){P.r(lx-5,by0-h-12,1,8,'o');P.r(lx+4,by0-h-12,1,8,'o');for(let j=0;j<6;j++)for(let i=-6+j;i<=5-j;i++)P.p(lx+i,by0-h-13-j,rC[i<0?1:2]);P.em=1;P.r(lx-4,by0-h-11,8,7,'y');P.r(lx-3,by0-h-10,4,4,'e');P.r(lx-4,by0-h-5,8,1,'E');P.em=0;an.lamps.push({x:lx-2,y:by0-h-9,big:1})}
  else{P.r(lx,by0-h-18,1,14,'i');an.flag={x:lx+1,y:by0-h-18,c:rC}}}
 else if(land==='chapel'){const h=LH-30;for(let j=0;j<h;j++)for(let i=-7;i<7;i++)P.p(lx+i,by0-h+j,brick(i,j,7));
  const sp=26;for(let j=0;j<sp;j++){const hw=Math.round((j+1)*9/sp);for(let i=-hw;i<hw;i++)P.p(lx+i,by0-h-sp+j,snow&&i<0&&j<sp-3?'r':i<0?rC[1]:rC[2])}P.r(lx-1,by0-h-sp-7,1,7,'c');P.r(lx-3,by0-h-sp-5,5,1,'c');
  const on=lit(1);P.r(lx-2,by0-h+6,4,8,'G');P.r(lx-1,by0-h+5,2,1,'G');if(on){P.em=1;P.r(lx-2,by0-h+6,4,8,'y');P.r(lx-2,by0-h+6,2,3,'e');P.em=0}P.r(lx-2,by0-h+24,4,7,'G');
  const nh=Math.round(h*.6);for(let j=0;j<nh;j++)for(let i=7;i<36;i++)P.p(lx+i,by0-nh+j,i>32?lmK[2]:j%6===5?lmK[2]:lmK[1]);roofSide(lx+5,by0-nh-13,33,14,[rC[1],rC[2],'4'],.4);
  for(let i=0;i<3;i++){P.r(lx+12+i*8,by0-nh+6,3,11,'G');P.p(lx+13+i*8,by0-nh+5,'G');if(on){P.em=1;P.r(lx+12+i*8,by0-nh+6,3,11,'y');P.p(lx+12+i*8,by0-nh+6,'e');P.em=0}}}
 else{const h=LH-22;for(const ox of [-19,11]){for(let j=0;j<h;j++)for(let i=-5;i<5;i++)P.p(lx+ox+5+i,by0-h+j,brick(i,j,5));for(let j=0;j<13;j++){const hw=Math.round((j+1)*7/13);for(let i=-hw;i<hw;i++)P.p(lx+ox+5+i,by0-h-13+j,snow&&i<0?'r':i<0?rC[1]:rC[2])}P.r(lx+ox+4,by0-h+10,2,6,'G');P.r(lx+ox+4,by0-h+26,2,6,'G')}
  const gh=Math.round(h*.66);for(let j=0;j<gh;j++)for(let i=-9;i<11;i++)P.p(lx+i,by0-gh+j,j%6===5||(i+(j/6|0)*3+60)%7===0?lmK[2]:lmK[1]);for(let i=-9;i<11;i++)if((i+9)%4<2)P.r(lx+i,by0-gh-3,1,3,snow?'r':lmK[0]);
  for(let j=0;j<22;j++){const hw=j<7?Math.round(Math.sqrt(49-(7-j)*(7-j))):7;for(let i=-hw;i<=hw;i++)P.p(lx+1+i,by0-22+j,j>4&&(i+j)%4===0?'3':'1')}}
 for(let x=-rr(2,14);x<Math.min(W+10,harb-20);){const w=rr(22,34),h=rr(26,44),by=yB-3,rc=bR[rr(0,3)],gab=ch(.4);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)P.p(x+i,by-h+j,i>w-4?hz[2]:j<2?hz[1]:(bio==='desert'?(dark?'o':'k'):hz[0]));
  if(bio==='desert'&&!gab){P.r(x-1,by-h-2,w+2,3,hz[1]);P.r(x-1,by-h-3,w+2,1,dark?'o':'d')}
  else if(gab){for(let j=0;j<Math.round(w/2.4);j++){const hw=Math.round((j+1)*(w/2+2)/Math.round(w/2.4));for(let i=-hw;i<hw;i++){const e=Math.min(i+hw,hw-1-i);P.p(Math.round(x+w/2)+i,by-h-Math.round(w/2.4)+j,e<2?(snow?'r':i<0?rc[0]:rc[1]):hz[0])}}}
  else roofSide(x-2,by-h-11,w+4,12,rc,.45);
  for(let i=4;i<w-6;i+=rr(7,10)){const wy=by-h+rr(5,8),on=lit(.55);P.r(i+x-1,wy-1,5,7,hz[2]);P.em=on?1:0;P.r(x+i,wy,3,5,on?'y':dark||dim?'3':'X');if(on)P.p(x+i,wy,'e');P.em=0}
  if(ch(.5)){const cx=x+rr(4,w-8);P.r(cx,by-h-(gab?16:15),4,8,hz[2]);P.r(cx-1,by-h-(gab?16:15),6,1,snow?'r':hz[1])}
  x+=w+rr(-2,10)}
 // trees in the gaps, behind the buildings
 PL.lots.forEach((L,i)=>{const N=PL.lots[i+1];if(!N)return;const g=N.x-(L.x+L.w);if(g>8&&ch(.8))tree(L.x+L.w+Math.round(g/2)+rr(-2,2),yB-1,rr(20,30));if(g>44)tree(L.x+L.w+Math.round(g/4),yB-2,rr(16,24))});
 {const F=PL.lots[0],Z=PL.lots[PL.lots.length-1];if(F.x>14)tree(rr(3,8),yB,rr(22,30));if(Z.k!=='harbour'&&W-(Z.x+Z.w)>14)tree(W-rr(3,8),yB,rr(22,30))}
 /* -- temple: a stone chapel, gable to the street, a lit lancet window and a bell under a little cap -- */
 const temple=cx=>{P.id=5;const m=bio==='desert'?'adobe':'stone',rT=(r=>r===rC?TVRAMP[r===TVRAMP.blue?'verd':'blue']:r)(TVRAMP[bio==='desert'?'clay':bio==='forest'||bio==='swamp'?'blue':'verd']),by=yB-3,w=44,x=cx-22,wh=58,gh=24,ty=by-wh,ap=ty-gh,bt=yB+6-47;
  const tr=m==='adobe'?['d','c','k']:['q','p','o'];
  wall(x,ty,w,wh,m);
  for(const sx of [x-3,x+w-1]){P.r(sx,ty+8,4,wh-8,tr[1]);P.r(sx,ty+8,1,wh-8,tr[0]);P.r(sx+3,ty+8,1,wh-8,tr[2]);P.r(sx,ty+6,4,2,tr[0]);P.r(sx,ty+7,4,1,tr[2]);for(let j=ty+14;j<by;j+=7)P.r(sx,j,4,1,tr[2])}   // buttresses
  roofGable(x-5,ap,w+10,gh+1,rT,m);P.r(x-5,ty+1,w+10,1,'1');P.r(x-4,ty+2,w+8,1,tr[2]);
  // lancet window: brass tracery, warm glass with two coloured panes; always lit (candles burn all day)
  const wy=ty-9,lan=(j)=>j<1?1:j<2?2:j<4?3:4;
  for(let j=-1;j<22;j++){const hw=lan(Math.max(0,j))+1;for(let i=-hw;i<hw;i++)P.p(cx+i,wy+j,j===21?tr[0]:'o')}
  P.em=1;for(let j=0;j<20;j++){const hw=lan(j);for(let i=-hw;i<hw;i++){let k=i<0&&j<9?'e':'y';if(j>=5&&j<9&&(i===-3||i===-2))k='g';else if(j>=5&&j<9&&(i===1||i===2))k='x';else if(j>=12&&j<17&&(i===-3||i===-2))k='x';else if(j>=12&&j<17&&(i===1||i===2))k='g';else if(j>17)k='c';
    if((i===-1||i===0)&&j>=3)k=i===0?'b':'c';if(j===10)k='b';P.p(cx+i,wy+j,k)}}P.em=0;
  P.r(cx-6,wy+21,12,1,snow?'r':tr[0]);P.r(cx-5,wy+22,10,1,tr[2]);
  // two small round lights low in the gable sides
  for(const ox of [-14,12]){P.r(cx+ox,ty+10,3,5,'o');P.em=1;P.r(cx+ox+1,ty+11,1,3,'y');P.em=0}
  // bell-cote on the ridge
  const cy=ap-10;for(let j=0;j<14;j++)for(let i=-6;i<6;i++)P.p(cx+i,cy+j,i===-6?tr[0]:i===5?tr[2]:mat(m,cx+i,cy+j));
  P.r(cx-7,cy+13,14,1,tr[0]);P.r(cx-7,cy+14,14,1,tr[2]);
  for(let j=0;j<9;j++){const hw=j<1?2:3;for(let i=-hw;i<hw;i++)P.p(cx+i,cy+3+j,'1')}
  P.s(['.cc.','cddc','cdcb','cdcb','bccb'],cx-2,cy+5);P.p(cx-1,cy+10,'0');P.p(cx,cy+4,'0');P.p(cx-1,cy+4,'0');
  for(let j=0;j<6;j++){const hw=j+2;for(let i=-hw;i<hw;i++)P.p(cx+i,cy-6+j,snow&&j<3?'r':i<0?rT[0]:i<hw-2?rT[1]:rT[2])}P.r(cx-8,cy,16,1,'1');
  P.r(cx-1,cy-13,2,7,'c');P.r(cx-3,cy-11,6,2,'c');P.p(cx-1,cy-13,'e');P.p(cx-3,cy-11,'d');P.r(cx,cy-12,1,6,'b');
  if(lamps)an.lights.push({x:cx,y:ty+4,r:18});
  an.bell={x:cx-2,y:cy+5};P.id=0;an.box.temple={x:x-5,y:cy-13,w:w+10,h:Math.max(24,bt-(cy-13))}};
 /* -- the East: a shrine hall instead of the stone chapel: red pillars, a great curved roof, a hanging bell under a gate roof -- */
 const templeE=cx=>{P.id=5;const by=yB-3,w=48,x=cx-24,wh=34,ty=by-wh,RF=TVRAMP.tile;
  for(let j=0;j<5;j++)P.r(x-4+j,by+1-j,w+8-j*2,1,j?'p':'o');wall(x,ty,w,wh-4,'plaster');for(let i=0;i<w;i+=8){P.r(x+i,ty,3,wh-4,'g');P.r(x+i,ty,1,wh-4,'h');P.r(x+i+2,ty,1,wh-4,'f')}
  for(let i=4;i<w-4;i+=8){P.r(x+i,ty+6,4,14,'1');if(lit(.9)){P.em=1;P.r(x+i,ty+7,4,12,'y');P.r(x+i,ty+7,2,3,'e');P.em=0}}P.r(x,ty,w,2,'i');
  const rh=22;for(let j=0;j<rh;j++){const t2=(j+1)/rh,ww=Math.round((w/2+8)*(.25+.75*t2*t2));for(let i=-ww;i<=ww;i++)P.p(cx+i,ty-rh+j,j>=rh-2?'1':snow&&j<rh*.4?'r':i<-ww*.3?RF[0]:i>ww*.4?RF[2]:RF[1])}eaves(cx-(w>>1)-8,cx+(w>>1)+9,ty-1,RF);
  P.r(cx-9,ty-rh-2,18,2,'1');P.p(cx-10,ty-rh-3,'c');P.p(cx+9,ty-rh-3,'c');
  // the bell under its own little roof
  const bx=cx,byy=ty-rh-14;for(let j=0;j<5;j++){const ww=4+j;for(let i=-ww;i<=ww;i++)P.p(bx+i,byy+j,j===4?'1':i<0?RF[0]:RF[2])}P.r(bx-5,byy+5,1,9,'g');P.r(bx+5,byy+5,1,9,'f');P.s(['.cc.','cddc','cdcb','cdcb','bccb'],bx-2,byy+6);
  if(lamps)an.lights.push({x:cx,y:ty+4,r:18});an.bell={x:bx-2,y:byy+6};P.id=0;an.box.temple={x:x-8,y:byy,w:w+16,h:Math.max(24,yB-byy)}};
 if(east)templeE(tcx);else temple(tcx);
 /* -- tailor: a narrow jettied house behind the market stalls, its upper floor above the awnings; bolts of dyed cloth drying on a
    pole and a sign with the shears. Plum tiles so it reads apart from the other roofs. -- */
 const tailor=cx=>{P.id=6;const w=40,x=cx-20,by=yB-3,m2=wallM==='stone'||wallM==='logs'?'plaster':wallM,gT=by-30,uT=by-62,rT=uT-23,rP=TVRAMP.plum;
  wall(x+2,gT,w-4,31,'stone');
  wall(x,uT,w,32,m2);if(m2==='plaster'||m2==='adobe')timber(x,uT,w,32,3);
  P.r(x-2,gT-1,w+4,2,'i');P.r(x-2,gT-1,w+4,1,'j');for(let i=1;i<w;i+=6)P.r(x+i,gT+1,2,2,'i');                         // jetty beam and joist ends
  roofGable(x-4,rT,w+8,24,rP,m2);P.r(x-4,uT,w+8,1,'1');P.r(x-3,uT+1,w+6,1,'i');
  win(cx-3,rT+11,6,6,{lit:lit(.6)});                                                                          // gable light
  win(x+5,uT+6,9,10,{sh:TVRAMP.plum});win(x+w-14,uT+6,9,10,{sh:TVRAMP.plum});
  // the shop's middle window: bolts of cloth on show
  P.r(x+16,uT+6,8,11,'i');P.r(x+17,uT+7,6,9,dim?'G':'1');[['g','h'],['x','F'],['y','e']].forEach((c,i)=>{P.r(x+17+i*2,uT+9,2,7,c[0]);P.p(x+17+i*2,uT+9,c[1])});P.r(x+16,uT+17,8,1,'k');
  // a pole out of the left wall with three lengths of dyed cloth drying
  P.r(x-15,uT+3,16,1,'i');P.p(x-15,uT+3,'0');P.r(x-1,uT+2,2,3,'0');
  [[x-14,['f','g','h'],13],[x-9,['X','x','F'],10],[x-4,['Y','y','e'],12]].forEach(([cx2,r,L])=>{for(let j=0;j<L;j++){const sw=Math.round(Math.sin(j*.5)*.6);P.p(cx2+sw,uT+4+j,r[0]);P.r(cx2+1+sw,uT+4+j,2,1,r[1]);P.p(cx2+3+sw,uT+4+j,j%4===1?r[2]:r[1])}
   P.r(cx2,uT+4+L,4,1,r[0]);P.p(cx2+1,uT+5+L,r[0]);P.p(cx2+3,uT+5+L,r[0])});
  // the sign: an iron bracket and a board with the shears
  P.r(x+w,uT+5,9,1,'0');P.r(x+w,uT+6,1,2,'0');P.p(x+w+1,uT+6,'0');P.r(x+w+2,uT+6,1,2,'0');P.r(x+w+7,uT+6,1,2,'0');
  P.r(x+w+1,uT+8,9,9,'0');P.r(x+w+2,uT+9,7,7,'k');P.r(x+w+2,uT+9,7,1,'l');P.r(x+w+8,uT+9,1,7,'j');
  P.s(['q...q','.q.q.','..p..','.c.c.','c...c'],x+w+3,uT+10);
  if(lamps)an.lights.push({x:cx,y:uT+12,r:16});
  P.id=0;an.box.tailor={x:x-16,y:rT,w:w+28,h:Math.max(24,(yB+2-60)-rT)}};
 tailor(tlx);
 /* -- tavern -- */
 const tavern=x=>{P.id=2;const up=wallM==='stone'?'plaster':wallM;
  wall(x+3,yB-28,72,28,'stone');wall(x+1,yB-52,76,24,up);if(up==='plaster'||up==='adobe')timber(x+1,yB-52,76,24,4);
  P.r(x,yB-29,78,2,'i');P.r(x,yB-29,78,1,'j');for(let i=4;i<78;i+=10)P.r(x+i,yB-27,2,2,'i');
  roofSide(x-3,yB-80,84,29,rA,.55);P.d(x+1,yB-51,76,1,'i',0);
  chimney(x+56,yB-90,9,16,1);
  // dormer
  roofGable(x+27,yB-75,20,10,rA,up);P.r(x+29,yB-65,16,8,'i');for(let j=0;j<8;j++)for(let i=0;i<14;i++)P.p(x+30+i,yB-65+j,mat(up,x+30+i,yB-65+j));win(x+34,yB-64,6,5,{lit:lit(.7)});
  door(x+9,yB-23,14,23,{win:1});
  win(x+32,yB-21,12,11,{box:!snow});win(x+54,yB-21,12,11,{box:!snow});
  win(x+9,yB-46,9,11,{sh:rB});win(x+34,yB-46,9,11,{sh:rB});win(x+59,yB-46,9,11,{sh:rB});
  lantern(x+2,yB-22,24);
  // hanging sign on an iron bar
  P.r(x+77,yB-41,12,1,'0');P.r(x+77,yB-40,1,3,'0');P.p(x+78,yB-40,'0');P.p(x+79,yB-39,'0');an.sign={x:x+79,y:yB-40};
  P.s(TVS.barrel,x+69,yB-8);P.s(TVS.barrel,x+73,yB-4,1);P.r(x+28,yB-4,20,1,'k');P.r(x+29,yB-3,2,3,'i');P.r(x+45,yB-3,2,3,'i');
  shadow(x+2,yB,76);P.id=0;an.box.tavern={x:x-3,y:yB-90,w:95,h:92}};
 /* -- inn -- */
 const inn=x=>{P.id=4;const up=wallM==='logs'?'plaster':wallM,m2=up==='stone'?'plaster':up;
  // stable annex
  wall(x+54,yB-26,30,26,'wood');roofSide(x+50,yB-38,36,13,TVRAMP.wood,.25);
  for(let j=0;j<20;j++){const hw=j<7?Math.round(Math.sqrt(49-(7-j)*(7-j))):7;for(let i=-hw;i<=hw;i++)P.p(x+69+i,yB-20+j,j>15&&i<3?'c':i>hw-2?'0':'1')}P.r(x+62,yB-4,7,4,'c');P.r(x+62,yB-4,7,1,'d');P.r(x+64,yB-3,1,3,'b');
  chimney(x+8,yB-100,8,24,1);
  wall(x,yB-30,56,30,up==='plaster'?'plaster':up);for(let j=0;j<5;j++)for(let i=0;i<56;i++)P.p(x+i,yB-5+j,mat('stone',x+i,yB-5+j));
  wall(x-1,yB-52,58,22,m2);if(m2==='plaster'||m2==='adobe')timber(x-1,yB-52,58,22,3);
  wall(x-1,yB-74,58,22,m2);if(m2==='plaster'||m2==='adobe')timber(x-1,yB-74,58,22,5);
  P.r(x-2,yB-31,60,2,'i');P.r(x-2,yB-31,60,1,'j');P.r(x-2,yB-53,60,1,'i');
  roofGable(x-5,yB-104,66,31,rB,m2);P.r(x-5,yB-74,66,1,'1');P.r(x+27,yB-108,2,5,'c');P.p(x+27,yB-109,'e');
  const g=lit(.8);P.r(x+24,yB-90,8,8,'i');P.em=g?1:0;P.r(x+25,yB-89,6,6,g?'y':dim?'G':'X');if(g)P.r(x+25,yB-89,3,3,'e');P.em=0;P.r(x+28,yB-89,1,6,'i');P.r(x+25,yB-86,6,1,'i');
  door(x+19,yB-24,18,24,{dbl:1});for(let i=0;i<18;i++){const a=Math.round(Math.sqrt(Math.max(0,81-(i-8.5)*(i-8.5)))/3);P.r(x+19+i,yB-24-a,1,a,'i')}
  P.r(x+17,yB-36,22,7,'0');P.r(x+18,yB-35,20,5,'c');P.r(x+18,yB-35,20,1,'d');P.s(['.aa..','aa...','aa...','.aa..'],x+20,yB-35);P.r(x+27,yB-34,1,3,'a');P.r(x+29,yB-34,1,3,'a');P.p(x+30,yB-33,'a');P.r(x+31,yB-34,1,3,'a');P.r(x+33,yB-34,1,3,'a');P.p(x+34,yB-33,'a');P.r(x+35,yB-34,1,3,'a');
  win(x+5,yB-22,9,11);win(x+42,yB-22,9,11);
  win(x+5,yB-47,9,11,{sh:rA});win(x+42,yB-47,9,11,{sh:rA});win(x+23,yB-47,10,11,{box:!snow});
  win(x+10,yB-69,9,11);win(x+37,yB-69,9,11);
  // banner
  P.r(x+25,yB-72,8,1,'0');for(let j=0;j<15;j++)for(let i=0;i<6;i++)if(j<13||i===0||i===5||(j===13&&i!==2&&i!==3))P.p(x+26+i,yB-71+j,i===0?rA[0]:i===5?rA[2]:rA[1]);P.r(x+28,yB-67,2,2,'e');P.p(x+28,yB-64,'e');P.p(x+29,yB-64,'e');
  lantern(x+12,yB-18,22);lantern(x+39,yB-18,22);
  shadow(x-1,yB,86);P.id=0;an.box.inn={x:x-5,y:yB-108,w:92,h:110}};
 /* -- market -- */
 const market=x=>{P.id=3;const by=yB+2,aw=east?[[['x','X','F'],['l','m','r']],[['g','f','h'],['l','m','r']]]:[[['g','f','h'],['l','m','r']],[[rC[1],rC[2],rC[0]],['l','m','r']]];
  // bunting
  P.r(x-1,by-58,1,58,'i');P.r(x+80,by-58,1,58,'i');P.p(x-1,by-59,'c');P.p(x+80,by-59,'c');
  for(let i=0;i<=80;i++){const sag=Math.round(Math.sin(i/80*3.14159)*5);P.p(x+i,by-57+sag,'a');if(i%7===3){const c=['g','y','5','x','l'][(i/7|0)%5];P.r(x+i-1,by-56+sag,3,1,c);P.r(x+i-1,by-55+sag,2,1,c);P.p(x+i,by-54+sag,c)}}
  [0,42].forEach((ox,si)=>{const sx=x+ox,A=aw[si];
   P.r(sx+2,by-32,34,20,'a');P.d(sx+2,by-32,34,20,'i',1);P.r(sx+2,by-32,34,3,'0');
   // hanging goods
   if(si===0){for(let i=0;i<3;i++){P.r(sx+7+i*5,by-30,1,2,'0');P.r(sx+6+i*5,by-28,2,5,'g');P.p(sx+6+i*5,by-28,'h')}P.r(sx+26,by-30,1,3,'0');P.r(sx+24,by-27,5,4,'B');P.p(sx+25,by-27,'A');P.p(sx+27,by-25,'7')}
   else{P.r(sx+8,by-30,1,2,'0');P.s(['.pqp.','pqqpo','pqppo','.ppo.','..o..'],sx+6,by-28);P.r(sx+18,by-30,1,9,'q');P.r(sx+16,by-22,5,1,'c');P.r(sx+18,by-21,1,2,'j');P.r(sx+27,by-30,1,2,'0');P.r(sx+25,by-28,5,6,'j');P.r(sx+25,by-28,5,1,'k');P.r(sx+27,by-27,1,5,'c')}
   // merchant
   if(si===0){P.r(sx+15,by-25,5,2,'H');P.r(sx+15,by-23,5,4,'s');P.r(sx+19,by-23,1,4,'t');P.p(sx+16,by-22,'0');P.p(sx+18,by-22,'0');P.r(sx+12,by-19,11,7,'5');P.r(sx+12,by-19,2,7,'6');P.r(sx+21,by-19,2,7,'7');P.r(sx+16,by-19,3,2,'l')}
   // counter
   P.r(sx+1,by-14,36,3,'k');P.r(sx+1,by-14,36,1,'l');P.r(sx+1,by-11,36,11,'j');for(let i=4;i<36;i+=6)P.r(sx+1+i,by-11,1,11,'i');P.r(sx+1,by-11,36,1,'i');P.r(sx+1,by-1,36,1,'i');
   // goods on the counter
   if(si===0){for(let i=0;i<7;i++){P.p(sx+3+i,by-15,i%2?'g':'h');if(i>0&&i<6)P.p(sx+3+i,by-16,i%2?'h':'g')}P.r(sx+24,by-16,4,2,'A');P.r(sx+25,by-17,2,1,'A');P.p(sx+27,by-15,'B');P.r(sx+29,by-16,4,2,'B');P.p(sx+29,by-16,'A');
    P.r(sx+33,by-16,3,2,'c');P.p(sx+33,by-16,'d')}
   else{P.r(sx+3,by-17,5,3,'x');P.r(sx+3,by-17,5,1,'F');P.r(sx+9,by-16,5,2,'g');P.r(sx+9,by-16,5,1,'h');P.r(sx+15,by-17,4,3,'C');P.r(sx+15,by-17,4,1,'l');P.r(sx+23,by-16,3,2,'p');P.p(sx+23,by-16,'q');P.r(sx+28,by-18,3,4,'c');P.p(sx+28,by-18,'e');P.r(sx+32,by-16,3,2,'y');P.p(sx+32,by-16,'e')}
   // posts and awning
   P.r(sx+1,by-34,2,34,'j');P.r(sx+1,by-34,1,34,'k');P.r(sx+35,by-34,2,34,'j');P.r(sx+36,by-34,1,34,'i');
   for(let j=0;j<13;j++){const ex=Math.round(j/4);for(let i=-ex-1;i<38+ex+1;i++){const st=Math.floor((i+8)/5)%2,c=A[st];let k=j<2?c[2]:j>9?c[1]:c[0];if(st===0&&j<2)k=c[2];if(st===1){k=j<3?'r':j>9?'m':'l'}
     if(j===12&&(i+8)%5===0)continue;if(j===12&&(i+8)%5===4)continue;if(snow&&j<2+((i>>1)&1))k='r';P.p(sx+i,by-46+j,k)}}
   P.d(sx,by-33,38,2,'0',0)});
  if(lamps){P.em=1;P.r(x+39,by-30,3,3,'y');P.p(x+40,by-30,'e');P.em=0;P.r(x+40,by-33,1,3,'0');an.lamps.push({x:x+39,y:by-30});an.lights.push({x:x+40,y:by-18,r:26})}
  P.s(TVS.crate,x+36,by-7);P.s(TVS.sack,x-6,by-6);P.s(TVS.crate,x+78,by-7);P.s(TVS.crate,x+80,by-13);P.s(TVS.sack,x+86,by-6,1);
  shadow(x-4,by,92);P.id=0;an.box.market={x:x-6,y:by-60,w:96,h:62}};
 /* -- notice board -- */
 const board=x=>{P.id=1;const by=yB+6,nP=clamp(t.contracts?t.contracts.length:0,0,5);
  P.r(x+3,by-40,3,40,'j');P.r(x+3,by-40,1,40,'k');P.r(x+5,by-40,1,40,'i');P.r(x+32,by-40,3,40,'j');P.r(x+32,by-40,1,40,'k');P.r(x+34,by-40,1,40,'i');
  P.r(x+1,by-2,7,2,'p');P.r(x+1,by-2,7,1,'q');P.r(x+30,by-2,7,2,'p');P.r(x+30,by-2,7,1,'q');
  P.r(x,by-38,38,28,'i');P.r(x+1,by-37,36,26,'j');P.r(x+2,by-36,34,24,'k');for(let j=5;j<24;j+=6)P.r(x+2,by-36+j,34,1,'j');P.r(x+2,by-36,34,1,'j');P.r(x+1,by-37,36,1,'k');
  roofSide(x-3,by-47,44,9,rC,.5);P.r(x-1,by-38,40,1,'1');
  const slots=[[4,-34],[14,-35],[25,-34],[5,-23],[16,-22],[26,-23]];
  for(let i=0;i<nP+1&&i<6;i++){const [sx,sy]=slots[i],px0=x+sx,py0=by+sy,old=i>=nP;
   P.r(px0,py0,8,9,old?'m':'l');P.r(px0+7,py0,1,9,old?'n':'m');P.r(px0,py0+8,8,1,old?'n':'m');P.p(px0+3,py0,old?'b':'g');P.p(px0+4,py0,old?'b':'g');
   for(let j=2;j<7;j+=2)P.r(px0+1,py0+j,j===6?3:5,1,old?'n':'o');if(!old&&i%2===0){P.r(px0+5,py0+6,2,2,'g');P.p(px0+5,py0+6,'h')}if(old)P.p(px0+7,py0+8,'k');
   const tc=!old&&t.contracts[i],tr=tc&&tc.rtook!=null&&typeof lkRival==='function'?lkRival(tc.rival):null;   // taken by a rival company: struck through, their pennant pinned over it
   if(tr){const A=typeof BANNERC==='object'&&BANNERC[tr.c1]?BANNERC[tr.c1].r:['f','g','h'],C=typeof BANNERC==='object'&&BANNERC[tr.c2]?BANNERC[tr.c2].r:['m','l','r'];
    for(let k=0;k<7;k++){P.p(px0+k,py0+1+k,'f');P.p(px0+1+k,py0+1+k,'g')}P.r(px0+3,py0-2,6,8,'0');P.r(px0+4,py0-1,4,6,A[1]);P.r(px0+4,py0-1,4,1,A[2]);P.r(px0+4,py0+1,4,1,C[1]);P.r(px0+7,py0,1,5,A[0]);P.r(px0+5,py0+4,2,1,'0');P.r(px0+5,py0+5,2,1,'k');P.p(px0+5,py0-2,'p')}}
  P.d(x+1,by,36,1,GR.rs,0);P.id=0;an.box.board={x:x-3,y:by-47,w:46,h:49}};
 /* -- a shop sign: an 18 x 18 board with the building's icon (iconRows), hung from a bar when hang -- */
 const sign=(sx,sy,k,hang)=>{const R=typeof iconRows==='function'?iconRows(tvBldIcon(k)):null;if(hang){P.r(sx-1,sy-3,20,1,'0');P.r(sx+3,sy-2,1,2,'0');P.r(sx+14,sy-2,1,2,'0')}
  P.r(sx,sy,18,18,'0');P.r(sx+1,sy+1,16,16,east?'m':'l');P.r(sx+1,sy+16,16,1,'m');P.r(sx+16,sy+1,1,16,'m');if(R)P.s(R.map(r=>r.replace(/0/g,'.')),sx+1,sy+1)};
 const rSl=east?TVRAMP.kawara:TVRAMP.slate,stn=wallM==='adobe'?'adobe':'stone',shopM=wallM==='logs'||wallM==='wood'?'stone':wallM;
 /* -- armorer: a stone shop under slate, helmets on show in the window, a stand out front wearing plate over mail -- */
 const armorer=x=>{P.id=7;wall(x+12,yB-46,44,46,shopM);if(shopM==='plaster'||shopM==='adobe')timber(x+12,yB-46,44,46,3);
  roofSide(x+8,yB-62,52,17,rSl,.45);chimney(x+46,yB-72,7,12,1);
  const on=lit(.8);P.r(x+16,yB-33,21,15,'i');P.em=on?1:0;P.r(x+17,yB-32,19,13,on?'d':dim?'G':'1');P.em=0;P.r(x+17,yB-25,19,1,'k');
  const H=east?[TVS.helmE,TVS.helmE,TVS.helmE]:[TVS.helmA,TVS.helmB,TVS.helmA];H.forEach((h,i)=>P.s(h,x+18+i*6,yB-31));
  P.d(x+19,yB-23,15,4,'p',0);P.d(x+20,yB-23,14,4,'o',0);P.r(x+15,yB-18,23,1,snow?'r':'k');P.r(x+16,yB-17,21,1,'i');
  sign(x+38,yB-44,'armorer');door(x+41,yB-22,11,22,{});
  P.s(east?TVS.manqE:TVS.manq,x,yB-22);if(lamps)an.lights.push({x:x+26,y:yB-24,r:18});shadow(x+2,yB,54);P.id=0};
 /* -- weaponsmith: an open forge under a lean-to (glowing hearth, anvil), a rack of blades, the smithy behind -- */
 const weaponsmith=x=>{P.id=8;wall(x+24,yB-44,36,44,shopM);if(shopM==='plaster'||shopM==='adobe')timber(x+24,yB-44,36,44,2);
  roofSide(x+20,yB-60,44,17,rSl,.45);
  for(let i=0;i<28;i++){const ty=yB-34-Math.round(i*7/28);P.r(x+i,ty,1,4,i%4===0?'i':'j');P.p(x+i,ty,'k');P.p(x+i,ty+3,'i');if(snow)P.p(x+i,ty-1,'r')}   // lean-to roof
  P.r(x+1,yB-31,2,31,'i');P.r(x+1,yB-31,1,31,'j');
  for(let j=yB-52;j<yB-12;j++)for(let i=x+6;i<x+15;i++)P.p(i,j,mat('stone',i,j));P.r(x+5,yB-52,11,2,snow?'r':'q');an.smoke.push({x:x+10,y:yB-54});   // hood and chimney
  for(let j=yB-12;j<yB;j++)for(let i=x+3;i<x+18;i++)P.p(i,j,mat('stone',i,j));P.r(x+3,yB-13,15,1,'q');
  P.em=1;P.r(x+6,yB-10,9,5,'E');P.r(x+7,yB-9,7,3,'y');P.r(x+8,yB-8,4,1,'e');P.em=0;an.sparks.push({x:x+10,y:yB-11});an.lights.push({x:x+10,y:yB-8,r:dark?24:16});
  P.s(TVS.anvil,x+16,yB-6);P.r(x+19,yB-1,4,1,'i');
  P.r(x+27,yB-24,18,2,'i');P.r(x+27,yB-6,18,2,'i');P.r(x+27,yB-24,1,24,'j');P.r(x+44,yB-24,1,24,'j');      // the rack: swords, an axe, a spear
  for(let i=0;i<4;i++){const bx=x+30+i*3;P.r(bx,yB-30+(i&1)*2,1,20,'q');P.r(bx+1,yB-30+(i&1)*2,1,20,'p');P.r(bx-1,yB-11,4,1,'c');P.r(bx,yB-10,2,3,'i')}
  P.r(x+42,yB-36,1,34,'j');P.s(['.q.','qqp','.p.'],x+41,yB-39);P.r(x+40,yB-28,2,5,'p');P.r(x+39,yB-27,1,3,'q');
  sign(x+27,yB-43,'weaponsmith');door(x+48,yB-22,10,22,{});win(x+50,yB-38,6,6,{});
  shadow(x,yB,60);P.id=0};
 /* -- fletcher: a plank workshop, bows and quivers hung in the open hatch, a barrel of arrows, a straw target on its easel -- */
 const fletcher=x=>{P.id=9;const m=wallM==='stone'?'wood':wallM;wall(x+4,yB-40,40,40,m);if(m==='plaster'||m==='adobe')timber(x+4,yB-40,40,40,3);
  roofSide(x,yB-56,48,17,east?TVRAMP.kawara:bio==='desert'?TVRAMP.clay:TVRAMP.thatch,.45);
  P.r(x+7,yB-31,20,17,'i');P.r(x+8,yB-30,18,15,'1');P.r(x+6,yB-14,22,2,'k');P.r(x+6,yB-13,22,1,'j');P.r(x+6,yB-33,22,2,'j');
  for(let b=0;b<3;b++){const bx=x+11+b*5;for(let j=0;j<13;j++){const o=Math.round(Math.sin(j/12*Math.PI)*2.4);P.p(bx-o,yB-29+j,b===1?'k':'j')}P.r(bx,yB-29,1,13,'l');P.p(bx,yB-30,'0')}
  P.r(x+22,yB-26,3,9,'i');P.r(x+22,yB-26,3,1,'k');P.p(x+22,yB-28,'g');P.p(x+23,yB-29,'l');P.p(x+24,yB-28,'g');P.r(x+22,yB-27,3,1,'j');
  sign(x+27,yB-39,'fletcher');door(x+31,yB-20,10,20,{});
  P.s(TVS.barrel,x+8,yB-8);for(let i=0;i<4;i++){P.r(x+9+i,yB-14+(i&1),1,6,'k');P.p(x+9+i,yB-15+(i&1),i&1?'l':'g')}
  const cx=x+49,cy=yB-14;P.ln(cx,cy,cx-4,yB,'j');P.ln(cx,cy,cx+4,yB,'i');P.ln(cx,cy,cx,yB,'j');
  P.disc(cx,cy,5,'0');P.disc(cx,cy,4,'l');P.disc(cx,cy,3,'g');P.disc(cx,cy,2,'l');P.disc(cx,cy,1,'g');P.p(cx,cy,'y');P.ln(cx+1,cy-1,cx+6,cy-5,'k');P.p(cx+6,cy-6,'l');P.p(cx+7,cy-5,'g');
  shadow(x+2,yB,50);P.id=0};
 /* -- arcane college: a slender tower with a blue cone and a star, a rune window that always glows, a low hall at its foot -- */
 const college=x=>{P.id=10;const cx=x+22,tw=18,tx=cx-9,tt=yB-86;
  wall(x+2,yB-28,40,28,stn);roofSide(x-1,yB-40,46,13,east?TVRAMP.kawara:TVRAMP.blue,.45);win(x+5,yB-21,5,8,{});win(x+35,yB-21,5,8,{});
  for(let j=tt;j<yB;j++)for(let i=tx;i<tx+tw;i++)P.p(i,j,i===tx?'q':i>=tx+tw-2?'o':mat('stone',i,j));
  P.r(tx-2,tt-2,tw+4,3,'p');P.r(tx-2,tt-2,tw+4,1,'q');for(let i=tx-2;i<tx+tw+2;i+=3)P.p(i,tt+1,'o');
  if(east){let y=tt-2;for(let k=0;k<3;k++){const hw=13-k*3;for(let j=0;j<5;j++){const ww=hw-2+Math.round(j*j*.5);for(let i=-ww;i<=ww;i++)P.p(cx+i,y-4+j,j===4?'1':i<-ww*.3?'p':i>ww*.4?'G':'o')}eaves(cx-hw-2,cx+hw+2,y,TVRAMP.kawara);y-=5;if(k<2){P.r(cx-hw+4,y-5,(hw-4)*2,5,'l');P.r(cx-hw+4,y-5,1,5,'g');P.r(cx+hw-5,y-5,1,5,'f');y-=5}}
   P.r(cx-1,y-10,2,10,'c');P.p(cx-1,y-11,'e')}
  else{for(let j=0;j<26;j++){const hw=Math.round((j+1)*(tw/2+3)/26);for(let i=-hw;i<hw;i++)P.p(cx+i,tt-27+j,snow&&i<0&&j<22?'r':i<-hw+2?'x':i<0?'X':i<hw-2?'X':'G');if(!snow)P.p(cx-hw+1,tt-27+j,'x')}
   P.r(cx-1,tt-33,2,6,'c');P.p(cx-1,tt-35,'F');P.p(cx,tt-34,'F');P.p(cx-2,tt-34,'F');P.p(cx-1,tt-36,'r')}
  const ry=tt+15;P.disc(cx-1,ry,5,'0');P.em=1;P.disc(cx-1,ry,4,'X');P.disc(cx-1,ry,3,'x');P.disc(cx-1,ry,1,'F');for(const [dx,dy] of [[0,-3],[-3,0],[3,0],[0,3]])P.p(cx-1+dx,ry+dy,'F');P.em=0;an.runes.push({x:cx-1,y:ry});
  for(const wy of [tt+30,tt+48]){const on=lit(.9);P.r(cx-3,wy-1,4,10,'0');P.p(cx-2,wy-2,'0');P.em=on?1:0;P.r(cx-2,wy,2,8,on?'F':dim?'G':'X');if(on)P.p(cx-2,wy,'r');P.em=0}
  P.r(cx-5,yB-16,8,16,'0');for(let j=0;j<16;j++)for(let i=0;i<6;i++){const a=j<3&&(i===0||i===5)||j<1;if(!a)P.p(cx-4+i,yB-15+j,i%3===2?'i':'j')}P.p(cx-1,yB-8,'c');P.r(cx-7,yB,12,2,snow?'r':'q');
  P.r(tx+tw,tt+20,5,1,'0');P.r(tx+tw+1,tt+21,4,12,'X');P.r(tx+tw+1,tt+21,1,12,'x');P.p(tx+tw+2,tt+33,'X');P.p(tx+tw+4,tt+33,'X');P.p(tx+tw+2,tt+25,'F');P.p(tx+tw+3,tt+26,'F');
  if(lamps)an.lights.push({x:cx,y:yB-20,r:16});shadow(x+2,yB,40);P.id=0};
 /* -- training hall: a long hall under a steep roof with a crossed-swords banner; straw dummies and a rack of practice arms in the yard -- */
 const hall=x=>{P.id=11;const m=wallM==='stone'?'wood':wallM,rH=east?TVRAMP.kawara:TVRAMP.red;wall(x+12,yB-38,52,38,m);if(m==='plaster'||m==='adobe')timber(x+12,yB-38,52,38,4);
  roofSide(x+8,yB-62,60,25,rH,.6);win(x+17,yB-30,7,9,{sh:rH});win(x+56,yB-30,6,9,{});door(x+40,yB-24,14,24,{dbl:1});
  P.r(x+38,yB-34,18,6,'0');P.r(x+39,yB-33,16,4,east?'l':'c');P.s(['g...g','.g.g.','..g..','.g.g.','g...g'].map(r=>r.replace(/g/g,east?'1':'a')),x+44,yB-34);
  P.r(x+35,yB-82,1,22,'i');P.p(x+35,yB-83,'c');an.flags.push({x:x+36,y:yB-81,c:rH,sw:1});
  P.d(x,yB-2,36,3,GR.rh,0);P.s(TVS.dummy,x,yB-21);P.s(TVS.dummy,x+13,yB-21,1);
  P.r(x+26,yB-18,10,1,'i');P.r(x+26,yB-11,10,1,'i');P.r(x+26,yB-18,1,18,'j');P.r(x+35,yB-18,1,18,'j');for(let i=0;i<3;i++){P.r(x+28+i*3,yB-22,1,17,'k');P.r(x+27+i*3,yB-9,3,1,'i')}P.r(x+29,yB-27,1,26,'j');P.p(x+29,yB-28,'q');
  if(lamps)an.lights.push({x:x+47,y:yB-20,r:20});shadow(x,yB,66);P.id=0};
 /* -- harbour: the harbour master's shed and the quay, a pier, a moored ship; open water from the quay to the end of the street -- */
 const harbour=x=>{P.id=12;const qx=harb,wt=yH+3,wl=yB+12;
  for(let y=wt;y<H;y++)for(let i=qx;i<W;i++){const d=y-wt,w2=((i*3+y*7)%23===0)||((i+y*5)%31===0&&d>6);P.p(i,y,d<2?'x':d<5&&((i+y)&1)?'x':w2?'x':y>=H-6&&((i+y)&1)?'G':'X')}
  for(let y=wt;y<H;y+=4)for(let i=qx+((y*13)%17);i<W;i+=rr(14,26))an.glints.push({x:i,y,w:rr(8,16),k:'F'});an.water={x0:qx,x1:W,y0:wt,y1:H};
  for(let j=yB-3;j<H;j++)for(let i=qx-5;i<qx;i++)P.p(i,j,i>qx-2?'o':mat('stone',i,j));P.r(qx-5,yB-4,6,2,'q');
  for(let i=qx;i<qx+34;i++){P.p(i,yB+3,'k');P.p(i,yB+4,i%4===0?'i':'j');P.p(i,yB+5,'i')}for(let i=qx+4;i<qx+34;i+=9){P.r(i,yB+6,2,10,'i');P.p(i,yB+6,'j')}
  wall(x+2,yB-36,30,36,'wood');roofSide(x-1,yB-48,36,13,rSl,.4);sign(x+4,yB-34,'harbour');door(x+23,yB-20,8,20,{});
  P.s(TVS.crate,x+33,yB-7);P.s(TVS.crate,x+33,yB-13);P.s(TVS.barrel,x+26,yB-8,1);
  const sx=qx+12,L=50;for(let j=0;j<11;j++){const y=wl-8+j,ins=Math.round(j*j*.1),x0=sx+ins+(j<4?0:1),x1=sx+L-Math.round(j*1.2)-ins;for(let i=x0;i<x1;i++)P.p(i,y,j===0?'k':j===3?'g':j===4?'f':j<3?'j':j===10?'1':'i')}
  P.r(sx,wl-13,12,5,'j');P.r(sx,wl-13,12,1,'k');P.r(sx+1,wl-11,2,2,lamps?'y':'1');P.r(sx+5,wl-11,2,2,lamps?'y':'1');P.r(sx+L-8,wl-11,9,3,'j');P.r(sx+L-8,wl-11,9,1,'k');P.ln(sx+L,wl-10,sx+L+8,wl-14,'i');
  if(lamps){an.lights.push({x:sx+4,y:wl-10,r:14})}
  const mx=sx+26;P.r(mx,wl-92,2,84,'i');P.r(mx,wl-92,1,84,'j');P.ln(mx,wl-90,sx+1,wl-13,'o');P.ln(mx+1,wl-90,sx+L+7,wl-14,'o');
  for(const [yy,hw] of [[wl-78,17],[wl-50,14]]){P.r(mx-hw,yy,hw*2+2,2,'i');for(let i=-hw+1;i<hw+1;i++){P.p(mx+i,yy+2,'l');P.p(mx+i,yy+3,(i&3)===0?'m':'l');if((i&3)===1)P.p(mx+i,yy+4,'m')}}
  P.r(mx-2,wl-66,6,4,'i');an.flags.push({x:mx+2,y:wl-92,c:TVRAMP.red});
  P.r(qx+30,yB+1,2,6,'i');P.ln(qx+31,yB+2,sx+L-2,wl-9,'k');
  P.id=0};
 const DRAW={tavern:x=>tavern(x),inn:x=>inn(x+3),market:x=>market(x+5),board:x=>board(x+3),armorer,weaponsmith,fletcher,college,hall,harbour};
 for(const L of PL.lots)if(L.k!=='harbour')DRAW[L.k](L.x);if(PLC.harbour)DRAW.harbour(PLC.harbour.x);
 /* -- street props -- */
 const prop=(hs>>>24)%3,pgx=(()=>{let best=null;PL.lots.forEach((L,i)=>{const N=PL.lots[i+1];if(!N)return;const a=L.x+L.w,g=N.x-a;if(!best||g>best.g)best={g,x:Math.round((a+N.x)/2)}});return best})();
 if(pgx&&pgx.g>20){const x=pgx.x,by=yB+3;
  if(east){const hw=Math.min(13,Math.max(7,(pgx.g>>1)-2));for(let j=0;j<34;j++){P.r(x-hw,by-j,2,1,'g');P.p(x-hw,by-j,'h');P.r(x+hw-1,by-j,2,1,'f')}P.r(x-hw-2,by-26,hw*2+5,2,'g');P.r(x-hw-2,by-25,hw*2+5,1,'f');
   P.r(x-hw-5,by-34,hw*2+11,2,'1');P.r(x-hw-4,by-32,hw*2+9,2,'g');P.p(x-hw-6,by-35,'1');P.p(x+hw+6,by-35,'1');P.p(x-hw-7,by-36,'1');P.p(x+hw+7,by-36,'1');P.r(x-1,by-31,3,5,'1');P.p(x,by-29,'c');P.r(x-hw-1,by,4,2,'p');P.r(x+hw-2,by,4,2,'p')}
  else if(prop===0){P.r(x-8,by-8,16,8,'p');for(let i=0;i<16;i++)for(let j=0;j<8;j++)P.p(x-8+i,by-8+j,mat('stone',x+i,by+j));P.r(x-9,by-9,18,2,'q');P.r(x-9,by-8,18,1,'o');P.r(x-7,by-22,1,13,'j');P.r(x+6,by-22,1,13,'i');roofSide(x-10,by-27,20,6,rC,.6);P.r(x,by-21,1,8,'a');P.r(x-1,by-13,3,3,'j')}
  else if(prop===1){P.r(x-6,by-4,12,4,'p');P.r(x-6,by-4,12,1,'q');P.r(x-3,by-10,6,6,'p');P.r(x-3,by-10,1,6,'q');P.r(x+2,by-10,1,6,'o');P.r(x-2,by-18,4,8,'n');P.r(x-2,by-18,1,8,'m');P.r(x-3,by-21,6,4,'n');P.r(x-3,by-21,2,2,'m');P.r(x+1,by-17,4,1,'o');P.r(x+4,by-25,1,9,'q')}
  else{P.r(x-9,by-7,18,4,'j');P.r(x-9,by-7,18,1,'k');P.r(x-9,by-4,18,1,'i');P.r(x-8,by-11,12,4,'c');P.r(x-8,by-11,12,1,'d');P.d(x-8,by-9,12,2,'b',1);P.disc(x-5,by-2,3,'i');P.disc(x-5,by-2,1,'k');P.disc(x+5,by-2,3,'i');P.disc(x+5,by-2,1,'k');P.r(x+9,by-6,7,1,'j')}}
 // lamp post on the street and foreground framing
 const lpx=PL.lots[PL.lots.length-1].k==='board'?X.board-3:X.board+46;
 if(east){const x=clamp(lpx,10,W-10),by=yB+Math.round(rdH*.62),S2=['q','p','o'];P.r(x-5,by-3,11,3,'p');P.r(x-5,by-3,11,1,'q');P.r(x-2,by-16,5,13,'p');P.r(x-2,by-16,1,13,'q');P.r(x+2,by-16,1,13,'o');P.r(x-5,by-18,11,2,'p');P.r(x-5,by-18,11,1,'q');
  P.r(x-4,by-25,9,7,'1');P.r(x-4,by-25,1,7,'p');P.r(x+4,by-25,1,7,'o');const on=lamps;P.em=on?1:0;P.r(x-2,by-23,5,3,on?'y':'G');if(on)P.p(x-1,by-23,'e');P.em=0;if(on){an.lamps.push({x:x-2,y:by-23});an.lights.push({x,y:by-10,r:28})}
  for(let j=0;j<4;j++){const w2=7-j;P.r(x-w2,by-26-j,w2*2+1,1,j?'p':'o')}P.p(x-8,by-27,'p');P.p(x+8,by-27,'o');P.r(x,by-31,1,2,'q');void S2}   // a stone toro instead of the iron lamp post
 else{const x=clamp(lpx,10,W-10),by=yB+Math.round(rdH*.62);P.r(x,by-30,2,30,'0');P.r(x,by-30,1,30,'o');P.r(x-1,by-2,4,2,'0');P.r(x-2,by-31,6,1,'0');P.s(TVS.lamp,x-2,by-37);
  if(lamps){P.em=1;P.r(x-1,by-35,3,2,'y');P.p(x,by-35,'e');P.em=0;an.lamps.push({x:x-1,y:by-35});an.lights.push({x:x+1,y:by-14,r:30})}else{P.r(x-1,by-35,3,2,'p');P.p(x-1,by-35,'q')}
  if(snow)P.r(x-2,by-38,5,1,'r')}
 // fence along the front
 const fy=yF+Math.round((H-yF)*.28);if(east){for(let x=-2;x<Math.min(W,harb-6);x+=4){const h=10+((x*7)%3);P.r(x,fy-h+8,2,h,'v');P.p(x,fy-h+8,'A');P.p(x+1,fy-h+8,'w');P.p(x,fy+3,'B');P.p(x+1,fy+3,'7')}P.r(-2,fy+1,Math.min(W,harb-6)+4,1,'i');P.r(-2,fy+5,Math.min(W,harb-6)+4,1,'i')}else for(let x=-3;x<Math.min(W,harb-16);x+=12){const broken=ch(.12);if(!broken){P.r(x+2,fy-1,12,1,'k');P.r(x+2,fy,12,1,'j');P.r(x+2,fy+4,12,2,'j');P.r(x+2,fy+4,12,1,'k')}
  P.r(x,fy-4,3,12,'j');P.r(x,fy-4,1,12,'k');P.r(x+2,fy-4,1,12,'i');P.r(x,fy-5,3,1,snow?'r':'k');P.d(x+3,fy+8,3,1,GR.gs,0)}
 // framing foliage at the lower corners
 const fol=(cx2,cy2,r)=>{const c=bio==='desert'?['c','k','j']:snow?['r','q','p']:bio==='swamp'?['7','3','2']:['B','7','3'];
  for(let i=0;i<9;i++){const a=R()*6.28,q=R()*r,bx=Math.round(cx2+Math.cos(a)*q),by2=Math.round(cy2+Math.sin(a)*q*.6),rad=rr(3,Math.max(4,Math.round(r*.5)));
   for(let y=-rad;y<=rad;y++)for(let xx=-rad;xx<=rad;xx++)if(xx*xx+y*y<=rad*rad+rad*.5)P.p(bx+xx,by2+y,xx+y<-rad*.5?c[0]:xx+y>rad*.6?c[2]:c[1])}};
 const fr=Math.round(clamp((H-yF)*.5,8,26));fol(2,H-2,fr);if(!PLC.harbour)fol(W-3,H-2,fr);
 const Wg=Math.min(W,harb-4);
 if(bio==='plains'||bio==='forest'||bio==='hills')for(let i=0;i<W/14;i++){const x=rr(2,Wg-3),y=rr(yF+2,H-3),c=['g','y','l','C'][rr(0,3)];P.p(x,y,c);P.p(x,y+1,'B')}
 if(bio==='swamp')for(let i=0;i<W/10;i++){const x=rr(2,Wg-3),y=rr(yF+6,H-2),h=rr(5,10);P.r(x,y-h,1,h,'w');P.r(x,y-h-2,1,3,'i')}
 if(bio==='desert')for(let i=0;i<W/90;i++)cactus(rr(20,Math.min(W,harb)-20),rr(yF+12,H-2),rr(8,12));
 if(bio==='hills'||bio==='snow')for(let i=0;i<W/60;i++){const x=rr(8,Wg-12),y=rr(yF+6,H-3),w=rr(5,9);P.r(x,y-3,w,4,snow?'q':'p');P.r(x+1,y-4,w-2,1,snow?'r':'q');P.r(x,y-3,2,2,snow?'r':'q');P.r(x+w-2,y-2,2,3,snow?'p':'o')}
 /* -- particles for the overlay -- */
 an.parts=snow?{k:'snow',n:Math.round(W*H/900)}:bio==='desert'?{k:'dust',n:8}:bio==='swamp'?{k:dim?'fly':'mote',n:dim?10:5}:bio==='forest'?{k:'leaf',n:7}:bio==='plains'?{k:'seed',n:5}:{k:'leaf',n:3};
 an.P=P;return{P,an}}

/* outline pixels (just outside each building's silhouette) for the hover / pressed highlight (Detail Low) */
function tvOutlines(P){const W=P.W,H=P.H,o={},id=i=>P.fl[i]>>3;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(id(i))continue;let k=0;if(x>0&&(k=id(i-1))){}else if(x<W-1&&(k=id(i+1))){}else if(y>0&&(k=id(i-W))){}else if(y<H-1&&(k=id(i+W))){}if(k)(o[k]||(o[k]=[])).push(x,y)}
 return o}

/* ---- overlay animation (cheap: a few dozen 1px rects over the cached picture). World things are drawn in street units
   shifted by the pan; particles and birds live in the view. Detail High has its own overlay (tvDrawHD, 51h-townhd.js). ---- */
function tvC(k){const m=TVMAP[TV.an?TV.an.tod:'day'];return PAL[m[k]||k]}
function tvInitAnim(an,W,H){const r=mulberry(77);an.pt=[];const n=an.parts?(an.parts.k==='snow'?Math.round(W*H/900):an.parts.n):0;for(let i=0;i<n;i++)an.pt.push({x:r()*W,y:r()*H,v:.4+r()*.8,ph:r()*6.28,k:i});
 an.puffs=[];an.smoke.forEach((s,si)=>{for(let i=0;i<5;i++)an.puffs.push({s:si,age:i*7})});an.walk=null;an.walkT=30+((r()*60)|0);an.birds=[];an.birdT=40}
function tvPanU(){return TV.hd?TV.pan/TV.s:Math.round(TV.pan/TV.s)}
function tvDraw(){if(TV.hd){if(typeof tvDrawHD==='function')tvDrawHD();return}
 const g=TV.g,an=TV.an;if(!g||!TV.pic||!an)return;const W=TV.W,H=TV.H,T=TV.tick,rm=tvRM(),px1=(x,y,c,w,h)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w||1,h||1)},pu=tvPanU();
 g.setTransform(1,0,0,1,0,0);g.fillStyle=PAL['0'];g.fillRect(0,0,W,H);g.drawImage(TV.pic,-pu,0);g.save();g.translate(-pu,0);
 // smoke
 for(const p of an.puffs){const s=an.smoke[p.s],a=p.age,x=s.x+Math.round(Math.sin(a*.13+p.s)*2+a*.18),y=s.y-Math.round(a*.55),sz=a<6?1:a<16?2:a<26?3:2,c=tvC(a<20?'q':'p');
  if(y<0)continue;if(a<28)px1(x-(sz>>1),y,c,sz,sz);else{px1(x,y,c);px1(x+2,y+1,c);px1(x-1,y+2,c)}if(sz===3)px1(x-1,y,tvC('r'),1,1)}
 // lantern flicker
 for(const l of an.lamps){const f=rm?0:(tvHash(l.x+':'+((T/3)|0))%5);if(l.big){px1(l.x,l.y,PAL[f<2?'e':'r'],3,3);px1(l.x-1+f%3,l.y-2,PAL.E,2,1)}else{px1(l.x,l.y,PAL[f===0?'d':'y'],3,2);px1(l.x+(f===1?0:1),l.y,PAL.e)}}
 // forge sparks and the college's rune window
 for(const s of an.sparks){const f=rm?0:T%9;px1(s.x-1+(f%3),s.y,PAL[f<4?'e':'y'],2,1);if(!rm)for(let i=0;i<3;i++){const a=(T*2+i*7)%14;if(a<10)px1(s.x+((i*5+a)%5)-2,s.y-2-a,PAL[a<5?'e':'E'])}}
 for(const r of an.runes){const f=rm?0:((T/4)|0)%4;px1(r.x-1,r.y-1,PAL[f===1?'r':'F'],3,3);if(!rm){const a=(T%30)/30;px1(r.x-6+((T>>2)%13),r.y-6-Math.round(a*14),PAL.F);px1(r.x+5-((T>>3)%9),r.y-2-Math.round(((T+15)%30)/30*16),PAL.x)}}
 // tavern sign: a mug on a board, swinging
 if(an.sign){const ph=rm?0:Math.round(Math.sin(T*.16)*1.4),sx=an.sign.x,sy=an.sign.y;
  px1(sx+1,sy+1,PAL['0'],1,2);px1(sx+8,sy+1,PAL['0'],1,2);
  for(let j=0;j<11;j++){const o=Math.round(ph*(j+2)/12);px1(sx+o,sy+3+j,PAL['0'],10,1);if(j>0&&j<10){px1(sx+1+o,sy+3+j,tvC(j===1?'k':'j'),8,1);px1(sx+8+o,sy+3+j,tvC('i'))}
   if(j>=3&&j<=7){px1(sx+3+o,sy+3+j,tvC(j===3?'r':'y'),3,1);if(j>3)px1(sx+5+o,sy+3+j,tvC('c'));if(j===4||j===6)px1(sx+6+o,sy+3+j,tvC('l'));if(j===5)px1(sx+7+o,sy+3+j,tvC('l'))}}}
 // mill sails / flags
 if(an.mill&&!an.millHid){const f=rm?0:((T/5)|0)%4,c=tvC('l'),c2=tvC('n'),c3=tvC('i'),mx=an.mill.x,my=an.mill.y,R0=an.mill.r,ang=f*Math.PI/8;
  for(let a=0;a<4;a++){const th=ang+a*Math.PI/2,cs=Math.cos(th),sn=Math.sin(th);for(let i=2;i<=R0;i++){const x=mx+cs*i,y=my+sn*i;px1(x,y,c3);if(i>R0*.3){px1(x-sn*1.2,y+cs*1.2,c);px1(x-sn*2.4,y+cs*2.4,i%2?c:c2);px1(x-sn*3.4,y+cs*3.4,c2)}}}px1(mx-1,my-1,c3,3,3)}
 for(const f of (an.flag?[an.flag]:[]).concat(an.flags)){for(let i=0;i<11;i++){const o=rm?0:Math.round(Math.sin(T*.35-i*.7)*1.2);px1(f.x+i,f.y+o,tvC(f.c[1]),1,i>7?4:6);px1(f.x+i,f.y+o,tvC(f.c[0]));px1(f.x+i,f.y+o+(i>7?3:5),tvC(f.c[2]))}}
 // temple bell: rings a few strokes now and then
 if(an.bell){const b=an.bell,ph=rm?0:(T%70<16?[0,1,1,0,-1,-1,0,1][(T>>1)&7]:0);
  if(ph){px1(b.x-1,b.y,tvC('1'),6,5);const R=['.cc.','cddc','cdcb','cdcb','bccb'];for(let j=0;j<5;j++)for(let i=0;i<4;i++){const k=R[j][i];if(k!=='.')px1(b.x+i+(j>1?ph:0),b.y+j,tvC(k))}px1(b.x+1-ph,b.y+5,PAL['0'])}}
 if(!rm){an.stars.forEach((s,i)=>{if(((T/4|0)+i*3)%11===0)px1(s.x,s.y,PAL['4'])});
  an.glints.forEach((s,i)=>{if(s.x+s.w<pu-4||s.x>pu+W+4)return;const o=((T/5|0)+i*2)%4;px1(s.x+o*((s.w/4)|0),s.y,tvC(s.k),3,1)});
  // a townsperson crossing the street now and then (only where there is street)
  if(!an.walk&&--an.walkT<=0){const dir=Math.random()<.5?1:-1,v=(Math.random()*4)|0,x0=dir>0?pu-8:Math.min(pu+W+2,an.walkX1);an.walk={x:x0,dir,v,y:an.walkY+((Math.random()*5)|0)};an.walkT=(an.tod==='night'?140:50)+(Math.random()*90|0)}
  if(an.walk){const w=an.walk;w.x+=w.dir*.8;const fr=((T/3)|0)%2,maps=[{},{'5':'g','7':'f','6':'h',H:'I'},{'5':'x','7':'X','6':'F',H:'G'},{'5':'c','7':'b','6':'d',H:'K'}],m=Object.assign({},TVMAP[an.tod]);
   for(const k in maps[w.v])m[k]=TVMAP[an.tod][maps[w.v][k]]||maps[w.v][k];
   const c=tvSpr('w'+fr+w.v+an.tod,fr?TVS.walkB:TVS.walkA,m,w.dir<0);if(c)g.drawImage(c,Math.round(w.x),w.y-12);
   if(an.tod==='night'||an.tod==='dusk'){px1(w.x+(w.dir>0?7:-1),w.y-6,PAL.e);px1(w.x+(w.dir>0?7:-1),w.y-5,PAL.y)}
   if(w.x<pu-10||w.x>Math.min(pu+W+4,an.walkX1))an.walk=null}}
 tvOutline();g.restore();
 if(rm)return;
 // particles (in the view)
 const pk=an.parts&&an.parts.k;for(const p of an.pt){if(pk==='snow'){p.y+=p.v*.9;p.x+=Math.sin(T*.08+p.ph)*.4-.15;if(p.y>H){p.y=-1;p.x=Math.random()*W}if(p.x<0)p.x+=W;px1(p.x,p.y,tvC(p.k%3?'r':'q'),p.k%7===0?2:1,1)}
  else if(pk==='leaf'||pk==='seed'){p.x+=.5+p.v*.5;p.y+=Math.sin(T*.12+p.ph)*.5+.18;if(p.x>W||p.y>H){p.x=-2;p.y=Math.random()*H*.7}px1(p.x,p.y,tvC(pk==='seed'?'l':['E','c','K','A'][p.k%4]),1,1);if(pk==='leaf'&&(T+p.k)%6<3)px1(p.x+1,p.y,tvC('c'))}
  else if(pk==='dust'){p.x+=1.6+p.v;if(p.x>W){p.x=-6;p.y=an.yB+Math.random()*an.GH}px1(p.x,p.y,tvC('e'),3,1)}
  else if(pk==='fly'){p.x+=Math.sin(T*.07+p.ph)*.6;p.y+=Math.cos(T*.05+p.ph*2)*.4;if(p.y<an.yB-40||p.y>H-2)p.y=an.yB+Math.random()*an.GH*.9;if(p.x<0||p.x>W)p.x=Math.random()*W;if((T+p.k*5)%14<8)px1(p.x,p.y,PAL[p.k%2?'A':'e'])}
  else{p.x+=.2;p.y-=.12+p.v*.1;if(p.y<an.yB-50){p.y=H-2;p.x=Math.random()*W}px1(p.x,p.y,tvC('n'))}}
 // birds by day
 if(an.tod==='day'||an.tod==='dawn'){if(--an.birdT<=0){an.birdT=90+(Math.random()*160|0);const y=8+Math.random()*an.yB*.3;for(let i=0;i<2+(Math.random()*3|0);i++)an.birds.push({x:-6-i*7,y:y+i*3*(i%2?1:-1),ph:i*2})}
  an.birds=an.birds.filter(b=>{b.x+=1.3;const up=((T+b.ph)/3|0)%2,c=PAL['2'];px1(b.x,b.y,c);if(up){px1(b.x-1,b.y-1,c);px1(b.x+1,b.y-1,c);px1(b.x-2,b.y-2,c);px1(b.x+2,b.y-2,c)}else{px1(b.x-1,b.y,c);px1(b.x+1,b.y,c);px1(b.x-2,b.y+1,c);px1(b.x+2,b.y+1,c)}return b.x<W+6})}
 // advance smoke
 for(const p of an.puffs){p.age+=.5;if(p.age>35)p.age=0}}
function tvOutline(){const g=TV.g,o=TV.out;if(!g||!o)return;const k=TV.down>=0?TV.down:TV.hot;if(k<0)return;const a=o[k];if(!a)return;
 g.fillStyle=PAL[TV.down>=0?'r':'e'];for(let i=0;i<a.length;i+=2)g.fillRect(a[i],a[i+1],1,1)}
function tvFrame(ts){TV.raf=0;if(!TV.root||!TV.shown)return;
 if(!G||!G.townOpen||mode!=='world'){tvHide();return}
 TV.raf=requestAnimationFrame(tvFrame);
 const covered=typeof panelOpen==='function'&&panelOpen();if(covered)return;
 // pan animation (arrows, focus) and the fling after a drag
 if(TV.panA){const a=TV.panA,q=Math.min(1,(ts-a.t0)/260),e=1-Math.pow(1-q,3);TV.pan=a.from+(a.to-a.from)*e;if(q>=1)TV.panA=null;tvPanApply()}
 else if(TV.fling&&!TV.drag){const dt=Math.min(40,ts-(TV.flingT||ts));TV.flingT=ts;const p=clamp(TV.pan+TV.fling*dt,0,TV.panMax);if(p===TV.pan&&dt>0)TV.fling=0;else{TV.pan=p;TV.fling*=Math.pow(.93,dt/16);if(Math.abs(TV.fling)<.03)TV.fling=0}tvPanApply()}
 const rm=tvRM(),due=ts-TV.last>=100;if(rm!==TV.rm){TV.rm=rm;TV.dirty=true}if(!TV.dirty&&(rm||!due))return;
 const t0=performance.now();if(due&&!rm){TV.last=ts;TV.tick++}tvDraw();TV.dirty=false;TV.ms+=performance.now()-t0;TV.frames++}

/* ---- panning the street ---- */
function tvPanApply(){const s=TV.s||2;if(!TV.hd)TV.pan=Math.round(TV.pan/s)*s;else{const d=TV.dpr||1;TV.pan=Math.round(TV.pan*d)/d}
 const P=$('tvPlaces');if(P)P.style.transform=TV.pan?`translateX(${-TV.pan}px)`:'';TV.dirty=true;
 const L=$('tvPL'),R=$('tvPR'),K=$('tvPK');if(L){L.disabled=TV.pan<=1;R.disabled=TV.pan>=TV.panMax-1}
 if(K&&TV.SW){const tw=TV.SW*TV.s,f=Math.min(1,TV.vw/tw);K.style.width=(f*100)+'%';K.style.left=(TV.pan/tw*100)+'%'}}
function tvPanTo(p,anim){TV.fling=0;p=clamp(+p||0,0,TV.panMax);if(anim&&!tvRM()&&Math.abs(p-TV.pan)>2){TV.panA={from:TV.pan,to:p,t0:performance.now()};TV.dirty=true;if(TV.shown&&!TV.raf)TV.raf=requestAnimationFrame(tvFrame)}else{TV.panA=null;TV.pan=p;tvPanApply()}}
function tvPanBy(d){tvPanTo((TV.panA?TV.panA.to:TV.pan)+d*TV.vw*.72,1)}
// bring a place (its hit area and its label) into view
function tvPanShow(el){if(!el||TV.panMax<=0)return;const x=parseFloat(el.style.left)||0,w=parseFloat(el.style.width)||0,m=12;let p=TV.pan;
 const pl=el.querySelector('.tv-plate');let a=x,b=x+w;if(pl){const c=x+(parseFloat(pl.dataset.cx)||w/2),pw=pl.offsetWidth||80;a=Math.min(a,c-pw/2);b=Math.max(b,c+pw/2)}
 if(b-a>TV.vw-2*m){a=(a+b)/2-TV.vw/2+m;b=a+TV.vw-2*m}if(a<p+m)p=a-m;else if(b>p+TV.vw-m)p=b-TV.vw+m;if(p!==TV.pan)tvPanTo(p,1)}
function tvPanWire(r){const d0=e=>!e.target.closest||!e.target.closest('.tv-btn,.tv-pan,.tv-top,.tv-note');
 r.addEventListener('pointerdown',e=>{if((e.button||0)>0||TV.panMax<=0||!d0(e))return;TV.drag={id:e.pointerId,x:e.clientX,p:TV.pan,moved:false,vx:0,lx:e.clientX,lt:e.timeStamp};TV.fling=0;TV.panA=null});
 r.addEventListener('pointermove',e=>{const d=TV.drag;if(!d||e.pointerId!==d.id)return;const dx=e.clientX-d.x;
  if(!d.moved&&Math.abs(dx)>8){d.moved=true;try{r.setPointerCapture(e.pointerId)}catch(_){}TV.hot=TV.down=-1;r.classList.add('drag')}
  if(d.moved){const dt=Math.max(1,e.timeStamp-d.lt);d.vx=.6*d.vx+.4*(-(e.clientX-d.lx)/dt);d.lx=e.clientX;d.lt=e.timeStamp;TV.pan=clamp(d.p-dx,0,TV.panMax);tvPanApply()}});
 const end=e=>{const d=TV.drag;if(!d||e.pointerId!==d.id)return;TV.drag=null;r.classList.remove('drag');if(d.moved){TV.noClick=performance.now();if(!tvRM()&&Math.abs(d.vx)>.15&&e.timeStamp-d.lt<80){TV.fling=clamp(d.vx,-3,3);TV.flingT=0}}};
 r.addEventListener('pointerup',end);r.addEventListener('pointercancel',end);
 r.addEventListener('click',e=>{if(TV.noClick&&performance.now()-TV.noClick<350&&e.target.closest&&e.target.closest('.tv-place')){e.stopPropagation();e.preventDefault()}TV.noClick=0},true);
 r.addEventListener('wheel',e=>{if(TV.panMax<=0)return;const d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;TV.fling=0;TV.panA=null;TV.pan=clamp(TV.pan+d,0,TV.panMax);tvPanApply()},{passive:true});
 r.addEventListener('scroll',()=>{if(r.scrollLeft||r.scrollTop){r.scrollLeft=0;r.scrollTop=0}});
 r.addEventListener('focusin',e=>{const b=e.target.closest&&e.target.closest('.tv-place');if(b)tvPanShow(b)})}

/* ---- DOM ---- */
function tvIcon(n,sz){return typeof pxIcon==='function'?pxIcon(n,sz||16):''}
function tvRoot(){if(TV.root)return TV.root;const r=document.createElement('div');r.id='tv';r.className='tv';r.setAttribute('role','region');r.setAttribute('aria-label','Town');
 r.innerHTML=`<canvas class="tv-cv" aria-hidden="true"></canvas><div class="tv-places" id="tvPlaces"></div><div class="tv-top"><div class="tv-name"><b id="tvName"></b><span id="tvSub"></span><span id="tvOwn" class="tv-own"></span></div><div class="tv-res" id="tvRes"></div></div>
<div class="tv-note" id="tvNote" role="status"></div>
<div class="tv-bar"><button type="button" class="tv-btn" id="tvCo" onclick="tvCompany()"></button><div class="tv-pan" id="tvPan" hidden><button type="button" class="tv-pb" id="tvPL" aria-label="Look left along the street" onclick="tvPanBy(-1)"><i></i></button><span class="tv-track" aria-hidden="true"><i id="tvPK"></i></span><button type="button" class="tv-pb r" id="tvPR" aria-label="Look right along the street" onclick="tvPanBy(1)"><i></i></button></div><button type="button" class="tv-btn pri" id="tvLeave" onclick="leaveTown()"></button></div>`;
 const app=$('app')||document.body,pn=$('pn'),sh=$('sheet'),before=pn&&pn.parentNode===app?pn:sh&&sh.parentNode===app?sh:null;if(before)app.insertBefore(r,before);else app.appendChild(r);
 ['touchmove','wheel'].forEach(ev=>r.addEventListener(ev,e=>e.stopPropagation(),{passive:true}));tvPanWire(r);
 window.addEventListener('resize',()=>{if(TV.shown){tvLayout();TV.dirty=true}});
 TV.root=r;TV.cv=r.querySelector('canvas');TV.g=TV.cv.getContext('2d');return r}
function tvBadges(t){const hurt=G.roster.filter(m=>m.hp<calc(m).hp).length,c=G.contract;
 return{contracts:TV.paid?{t:'Paid',c:'ok'}:c?{t:'In hand',c:'dim'}:(n=>n?{t:n,c:''}:t.contracts.length?{t:'Taken',c:'dim'}:null)(t.contracts.filter(x=>x&&x.rtook==null).length),
  tavern:t.recruits.length?{t:t.recruits.length,c:''}:null,market:lkHostile(G.town)?{t:'Closed',c:'bad'}:null,tailor:null,inn:hurt?{t:hurt,c:'bad'}:null,temple:(n=>n?{t:n,c:'bad'}:null)(typeof cpTreatable==='function'?cpTreatable().length:0)}}
function tvRect(e){try{return e.getBoundingClientRect()}catch(_){return null}}
/* the places of the town's street, in street order: [{k (TVID key), tab, n (name), ic (icon), id}] */
function tvPlaceList(t,PL){const L=[];for(const [tab,n,ic] of TVPLACES)if(PL.places[ic])L.push({k:ic,tab,n,ic,id:TVID[ic]});
 for(const k of tvExtras(t))if(PL.places[k])L.push({k,tab:k,n:tvBldName(k),ic:tvBldIcon(k),id:TVID[k],x:1});
 return L.sort((a,b)=>PL.places[a.k].cx-PL.places[b.k].cx||(PL.places[a.k].back?1:-1))}
function tvLayout(){const r=TV.root,t=G.towns[G.town];if(!r||!t)return;const vw=r.clientWidth||window.innerWidth,vh=r.clientHeight||window.innerHeight;
 const s=Math.max(2,Math.floor(Math.min(vw/300,vh/170))),W=Math.ceil(vw/s),H=Math.ceil(vh/s),tod=tvTod(),bio=tvBiome(t),hd=typeof hdArt==='function'&&hdArt()&&typeof tvPaintHD==='function',dpr=Math.max(1,Math.min(3,window.devicePixelRatio||1));
 const key=[G.town,t.name,t.east?1:0,W,H,tod,bio,hd?'hd'+dpr:'px',t.contracts.length,t.contracts.map(x=>x&&x.rtook!=null?x.rival:'').join(','),(t.bld||[]).join(',')].join('|');
 if(key!==TV.key){const PL=tvPlan(t,G.town,W,H),t0=performance.now();TV.plan=PL;TV.SW=PL.SW;TV.s=s;TV.W=W;TV.H=H;TV.hd=hd;TV.dpr=dpr;
  if(hd){let k=s*dpr;const cap=12e6;if(PL.SW*H*k*k>cap)k=Math.sqrt(cap/(PL.SW*H));TV.k=k;const o=tvPaintHD(t,G.town,PL,tod,bio,k);TV.an=o.an;TV.pic=o.pic;TV.out=null}
  else{TV.k=1;const o=tvPaint(t,G.town,PL,tod,bio);TV.an=o.an;TV.pic=tvCompose(o.P,tod,o.an.lights);TV.out=tvOutlines(o.P);delete o.an.P}
  TV.paintMs=performance.now()-t0;TV.key=key;tvInitAnim(TV.an,W,H);r.style.setProperty('--s',s);r.dataset.tod=tod;r.dataset.bio=bio;r.classList.toggle('hd',hd)}
 if(TV.hd){const cw=Math.round(vw*dpr),ch=Math.round(vh*dpr);if(TV.cv.width!==cw||TV.cv.height!==ch){TV.cv.width=cw;TV.cv.height=ch}TV.cv.style.width=vw+'px';TV.cv.style.height=vh+'px'}
 else{if(TV.cv.width!==W||TV.cv.height!==H){TV.cv.width=W;TV.cv.height=H}TV.cv.style.width=W*s+'px';TV.cv.style.height=H*s+'px'}
 TV.g.imageSmoothingEnabled=TV.hd;TV.cv.classList.toggle('hd',TV.hd);
 const PL=TV.plan;TV.vw=vw;TV.vh=vh;TV.panMax=PL.SW*s-vw>6?PL.SW*s-vw:0;if(TV.panTown!==G.town){TV.pan=0;TV.panTown=G.town}TV.pan=clamp(TV.pan,0,TV.panMax);
 const B=tvBadges(t),P=$('tvPlaces'),S=TV.s,yRow=(PL.yB+4)*S;P.style.width=PL.SW*S+'px';
 P.innerHTML=tvPlaceList(t,PL).map(o=>{const pl=PL.places[o.k],b=pl.box,x=Math.max(0,b.x)*S,w=Math.max(44,(Math.min(PL.SW,b.x+b.w)-Math.max(0,b.x))*S),top=b.y*S,h=Math.max(44,b.h*S),bd=B[o.tab]||null,cx=pl.cx*S-x;
  const py=pl.back?((o.k==='temple'?PL.yB-43:PL.yB-45)*S-top):yRow-top,ic=o.x?tvIcon(o.ic,16):typeof cpIcon==='function'?cpIcon(o.ic,16):tvIcon(o.ic,16);
  return`<button type="button" class="tv-place${pl.back?' bk':''}" data-k="${o.k}" data-id="${o.id}" style="left:${x}px;top:${top}px;width:${w}px;height:${h}px" aria-label="${o.n}${bd?', '+bd.t+(o.tab==='contracts'&&+bd.t?' contracts posted':o.tab==='tavern'?' looking for work':o.tab==='inn'?' wounded':o.tab==='temple'?' injured':''):''}" onclick="tvGo('${o.tab}')"><span class="tv-plate${pl.back?' bk':''}" data-cx="${cx}" style="left:${cx}px;top:${py}px">${ic}<b>${o.n}</b>${bd?`<i class="tv-badge ${bd.c}${typeof bd.t==='string'?' txt':''}">${bd.t}</i>`:''}</span></button>`}).join('');
 P.querySelectorAll('.tv-place').forEach(el=>{const i=+el.dataset.id,set=(h,d)=>{if(h!==null)TV.hot=h;if(d!==null)TV.down=d;TV.dirty=true};
  el.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!TV.drag)set(i,null)});el.addEventListener('pointerleave',()=>set(TV.hot===i?-1:TV.hot,TV.down===i?-1:TV.down));
  el.addEventListener('pointerdown',()=>set(null,i));el.addEventListener('pointerup',()=>set(null,-1));el.addEventListener('pointercancel',()=>set(-1,-1));
  el.addEventListener('focus',()=>set(i,null));el.addEventListener('blur',()=>set(TV.hot===i?-1:TV.hot,null))});
 // labels apart: the back-row labels stay where they are; a street label that would overlap one already placed rises a row (over the doors)
 {const pr=P.getBoundingClientRect(),all=[...P.querySelectorAll('.tv-plate')].map(e=>{e.style.marginLeft='';e.style.marginTop='';const q=e.getBoundingClientRect();return{e,bk:e.classList.contains('bk'),l:q.left-pr.left,r:q.right-pr.left,t:q.top-pr.top,b:q.bottom-pr.top}});
  const done=[],m=8,hit=(o,dx,dy)=>done.some(q=>o.l+dx<q.r+m&&o.r+dx+m>q.l&&o.t+dy<q.b+4&&o.b+dy+4>q.t),Wd=PL.SW*S;
  all.sort((a,b)=>(a.bk===b.bk?a.l-b.l:a.bk?-1:1)).forEach(o=>{let dx=0,dy=0;if(o.l<6)dx=6-o.l;else if(o.r>Wd-6)dx=Wd-6-o.r;
   for(let k=0;k<3&&hit(o,dx,dy);k++)dy-=(o.b-o.t)+10;
   if(hit(o,dx,dy)){dy=0;for(const sgn of [1,-1])for(let k=1;k<6&&hit(o,dx,dy);k++)dx=sgn*k*12;if(hit(o,dx,dy))dx=0}
   if(dx)o.e.style.marginLeft=dx+'px';if(dy)o.e.style.marginTop=dy+'px';done.push({l:o.l+dx,r:o.r+dx,t:o.t+dy,b:o.b+dy})})}
 $('tvName').textContent=t.name;{const O=$('tvOwn');if(O){const bn=tvTownBanner(G.town);O.innerHTML=bn+tvTownNote(G.town);O.classList.toggle('on',!!O.innerHTML)}}$('tvSub').textContent=`Day ${G.day} · ${TVTODN[tod]} · ${TVBION[bio]}`;
 $('tvRes').innerHTML=`<span class="tv-chip coin">${tvIcon('coin',16)}<b>${G.crowns}</b></span><span class="tv-chip">${tvIcon('food',16)}<b>${G.food}</b></span><span class="tv-chip" title="Tools">${typeof cpIcon==='function'?cpIcon('tools',16):''}<b>${typeof cpTools==='function'?cpTools():0}</b></span><span class="tv-chip">${tvIcon('swords',16)}<b>${G.roster.length}</b></span>`;
 const ready=G.roster.filter(m=>m.pend||m.pp).length;
 $('tvCo').innerHTML=`${tvIcon('company',16)}<span>Company</span>${ready?`<i class="tv-badge">${ready}</i>`:''}`;$('tvLeave').innerHTML=`${tvIcon('back',16)}<span>Leave town</span>`;
 {const pn=$('tvPan');pn.hidden=TV.panMax<=0}tvPanApply();
 const N=$('tvNote');N.innerHTML=TV.note?`${TV.paid?tvIcon('coin',32):''}<div>${TV.note}</div>`:'';N.classList.toggle('on',!!TV.note);N.classList.toggle('paid',!!TV.paid);
 // the arrival note fades after 7 s (TV.noteT; N.dataset.t marks the note it belongs to)
 if(TV.note&&N.dataset.t!==TV.note){N.dataset.t=TV.note;clearTimeout(TV.noteT);TV.noteT=setTimeout(()=>{TV.note='';TV.paid=false;N.classList.remove('on','paid');N.innerHTML='';N.dataset.t='';if(TV.shown)tvLayout()},7000)}
 if(!TV.note){N.dataset.t='';clearTimeout(TV.noteT)}}
/* show the scene for the current town. Returns false when there is no real canvas (headless), so the caller falls back to the panel. */
function tvShow(note){if(!tvCan()||!G||G.town==null||!G.towns[G.town])return false;
 if(typeof panelOpen==='function'&&panelOpen()&&!closePanel(true))return false;
 let r;try{r=tvRoot();if(!TV.g)return false}catch(e){return false}
 if(note!==undefined&&note!==null&&note!==''){TV.note=note;TV.paid=/Contract fulfilled/.test(note)}
 G.townOpen=true;sheetOpen=true;const fresh=!TV.shown;TV.shown=true;TV.hot=TV.down=-1;r.classList.add('on');
 try{tvLayout()}catch(e){r.classList.remove('on');TV.shown=false;if(typeof console==='object')console.error(e);return false}
 if(fresh){r.classList.remove('in');void r.offsetWidth;r.classList.add('in')}
 TV.dirty=true;tvDraw();if(!TV.raf)TV.raf=requestAnimationFrame(tvFrame);return true}
function tvHide(){if(!TV.root)return;TV.shown=false;TV.drag=null;TV.fling=0;TV.panA=null;TV.root.classList.remove('on','in','drag');TV.note='';TV.paid=false;clearTimeout(TV.noteT);if(TV.raf){cancelAnimationFrame(TV.raf);TV.raf=0}}
function tvGo(k){TV.note='';TV.paid=false;townAt='panel';townTab=k;if(TVX.includes(k)&&typeof tvbOpen==='function'){tvbOpen(k);return}renderTown()}
function tvCompany(){if(typeof companySheet==='function')companySheet()}

/* ---- phase 7 (look): extra buildings in the scene and their own panels ---- */
const TVX=['armorer','weaponsmith','fletcher','college','hall','harbour'];
const TVXN={armorer:'Armorer',weaponsmith:'Weaponsmith',fletcher:'Fletcher',college:'Arcane college',hall:'Training hall',harbour:'Harbour'};
function tvExtras(t){return t&&Array.isArray(t.bld)?TVX.filter(k=>t.bld.includes(k)):[]}
function tvBldName(k){const B=typeof BLD==='object'&&BLD?BLD[k]:null;return B&&B.n||TVXN[k]||k}
function tvBldIcon(k){return typeof icHas==='function'&&icHas('bld-'+k)?'bld-'+k:(typeof BLD==='object'&&BLD&&BLD[k]&&BLD[k].icon)||'board'}
/* ---- the town's header pieces, for the scene and the town panel (50-towns.js may use them: tvTownBanner(ti), tvTownNote(ti), tvTownTabs(t)) ---- */
// who holds the town now: a crisis faction that took it (townOwner, 18-crises.js), else its owner
function tvOwner(ti){const t=G.towns[ti];if(!t)return null;if(typeof townOwner==='function'){try{const o=townOwner(ti);if(o)return o}catch(e){}}return t.own||null}
function tvTownBanner(ti){const t=G.towns[ti],ow=tvOwner(ti);if(ow==='east'&&typeof eastBanner==='function'&&typeof bannerHTML==='function'){const b=eastBanner();return bannerHTML({name:b.name,c1:b.c1,c2:b.c2,emblem:b.emblem},32)}const h=t&&ow&&ow!=='free'?lkHouse(ow):null;return h&&typeof bannerHTML==='function'?bannerHTML(typeof bnOf==='function'?bnOf(h):{name:h.n,c1:h.c1,c2:h.c2,emblem:h.emblem},32):''}
function tvPriceLine(ti,kind){if(typeof townPriceWhy!=='function')return'';let L=[];try{L=townPriceWhy(ti,kind)||[]}catch(e){L=[]}if(!L.length)return'';
 return L.map(x=>{const p=Math.round((x.k-1)*100);const good=kind==='sell'?p>0:p<0;return`<span class="tw-pw ${good?'good':'bad'}">${p>0?'+':'−'}${Math.abs(p)}% <small>${htmlEsc(x.why)}</small></span>`}).join('')}
function tvTownNote(ti){const t=G.towns[ti];if(!t)return'';const own=tvOwner(ti),held=!!own&&own!==t.own,S=lkSits(t),hostile=lkHostile(ti);let h='';
 if(own){const rt=lkRepTier(own);h+=`<span class="tw-own">${held?'Held by ':''}<b>${htmlEsc(lkFacName(own))}</b><span class="fx-tier t-${rt.k}">${tvIcon('rep-'+rt.k,16)}${htmlEsc(rt.n)}</span></span>`}
 for(const x of S){const k=x.k||x,D=lkSitDef(k);h+=`<span class="tw-sit" title="${htmlEsc(D.d||'')}">${tvIcon(lkSitIcon(k),16)}<b>${htmlEsc(D.n)}</b>${x.days?`<small>${x.days}d</small>`:''}</span>`}
 {const pk=[['buy','Goods'],['sell','Selling'],['food','Food'],['hire','Hiring']].map(([k,n])=>{const v=lkPriceK(ti,k),p=Math.round((v-1)*100);if(!p)return'';let why='';if(typeof townPriceWhy==='function'){try{why=townPriceWhy(ti,k).map(x=>x.why+' '+(x.k>1?'+':'−')+Math.abs(Math.round((x.k-1)*100))+'%').join(', ')}catch(e){}}
   const good=k==='sell'?p>0:p<0;return`<span class="tw-pw ${good?'good':'bad'}" title="${htmlEsc(why)}">${n} ${p>0?'+':'−'}${Math.abs(p)}%</span>`}).join('');if(pk&&!hostile)h+=`<span class="tw-prices">${pk}</span>`}
 if(hostile)h+=`<span class="tw-sit bad">${tvIcon('lock',16)}<b>Markets closed to you</b></span>`;
 return h?`<div class="tw-town">${h}</div>`:''}
function tvTownTabs(t){const base=typeof TOWNTABS!=='undefined'?TOWNTABS.slice():[];return base.concat(tvExtras(t).map(k=>[k,tvBldName(k)]))}
function tvbIsTab(k){return TVX.includes(k)}

/* ---- building panels: everything goes through the world agent's bldServe(i,key,arg) ---- */
const TVB={k:null,sel:{}};
function tvbSv(k,arg){if(typeof bldServe!=='function')return{ok:false,msg:'Closed today'};try{return bldServe(G.town,k,arg)||{ok:false,msg:'Closed'}}catch(e){return{ok:false,msg:'Closed'}}}
function tvbPrice(id){return typeof mkBuyPrice==='function'?mkBuyPrice(id):(ITEMS[id]?ITEMS[id].price:0)}
function tvbBuy(id){if(lkHostile(G.town)){toast('The '+tvBldName(TVB.k).toLowerCase()+' will not deal with you');return false}const p=tvbPrice(id);if(G.crowns<p){toast('Not enough crowns');return false}
 G.crowns-=p;G.stash.push(id);toast(ITEMS[id].n+' to the stash');tvbOpen(TVB.k);if(typeof save==='function')save();return true}
function tvbDo(op,a,b){const k=TVB.k,arg={op};if(op==='hint'||op==='train'||op==='respec')arg.m=a;if(op==='respec')arg.tree=b;if(op==='sail')arg.to=a;
 const r=tvbSv(k,arg);if(op==='hint'&&r.ok){TVB.hint=r.text;tvbOpen(k);return r}
 toast(r.msg||(r.ok?'Done':'Not possible'));if(r.ok&&op==='sail'){if(typeof closePanel==='function')closePanel(true);if(typeof tvHide==='function')tvHide();G.townOpen=false;sheetOpen=false;if(typeof save==='function')save();return r}
 if(r.ok&&typeof save==='function')save();tvbOpen(k);return r}
function tvbPick(v){TVB.sel[TVB.k]=v;TVB.hint='';tvbOpen(TVB.k)}
function tvbStock(k,sel){const r=tvbSv(k,{op:'stock'}),L=r.ok&&Array.isArray(r.items)?r.items:[];let list='';
 L.forEach(id=>{const it=ITEMS[id];if(!it)return;const p=tvbPrice(id);list+=pnRow({on:`tvbPick('i${id}')`,sel:sel==='i'+id,cls:'tw-row',lead:twItemIcon(id,32),title:pnItemName(id),sub:`<span class="tw-line">${it.tier?`<span class="pn-tier t${it.tier}">${TIERN[it.tier]}</span>`:''}${twItemStats(id)}</span>`,right:pnCoin(p,G.crowns<p?'short':'')})});
 return{list:L.length?pnSec('For sale',L.length)+list:pnSec('For sale',0)+pnEmpty(r.msg||'Nothing on the racks today.'),items:L}}
function tvbView(t,k){const ti=G.town,info=tvbSv(k,{}),B=typeof BLD==='object'&&BLD?BLD[k]:null,shut=lkHostile(ti);let sel=TVB.sel[k]||'',list='',detail='',foot='';
 const head=`${twHead(tvIcon(tvBldIcon(k),48),htmlEsc(t.name),htmlEsc(tvBldName(k)))}<p class="pn-p">${htmlEsc(B?B.d:'')}</p>${shut?'<p class="pn-p warn">'+htmlEsc(lkFacName(t.own))+' has closed its doors to the company.</p>':''}`;
 const offers=(info.ok&&info.offers||[]).map(o=>[htmlEsc(o.n),htmlEsc(o.d)+(o.cost?' <b>'+o.cost+' crowns</b>':'')]);
 const mercRow=(m,mi,right,sub)=>pnRow({on:`tvbPick('m${m.id}')`,sel:sel==='m'+m.id,cls:'tw-row',lead:twPortrait(m,32),title:htmlEsc(m.name),sub:sub||`Level ${m.lvl} ${BG[m.bg]?BG[m.bg].n.toLowerCase():''}`,right});
 const selM=()=>{const id=sel[0]==='m'?sel.slice(1):null;return G.roster.find(m=>String(m.id)===id)||null};
 if(k==='armorer'||k==='weaponsmith'||k==='fletcher'||k==='college'){
  let svc='';if(k==='armorer'){const o=(info.offers||[]).find(x=>x.op==='repair');if(o)svc+=pnRow({on:`tvbPick('repair')`,sel:sel==='repair',cls:'tw-row',lead:tvIcon('tools',32),title:'Full repair',sub:htmlEsc(o.d),right:o.cost?pnCoin(o.cost,G.crowns<o.cost?'short':''):''})}
  if(k==='college'){svc+=pnRow({on:`tvbPick('hint')`,sel:sel==='hint',cls:'tw-row',lead:tvIcon('mana',32),title:'Read a gift',sub:'What each sword carries, and how to wake it'})+pnRow({on:`tvbPick('respec')`,sel:sel==='respec'||sel[0]==='m',cls:'tw-row',lead:tvIcon('quill',32),title:'Unlearn a tree',sub:'Take back a tree’s perks for crowns'})}
  const st=tvbStock(k,sel);list=(svc?pnSec('Services')+svc:'')+st.list;
  if(!sel)sel=svc&&k==='armorer'?'repair':st.items.length?'i'+st.items[0]:k==='college'?'hint':'';
  if(sel[0]==='i'&&ITEMS[sel.slice(1)]){const id=sel.slice(1),p=tvbPrice(id);detail=itemDetail(id);foot=`<span class="pn-fl">${pnCoin(p,'big'+(G.crowns<p?' short':''))}<small>${shut?'<em>Closed to you</em>':G.crowns<p?'<em>Not enough crowns</em>':'to the stash'}</small></span><button type="button" class="pn-btn pri${G.crowns<p||shut?' off':''}" onclick="tvbBuy('${id}')">Buy for ${p}</button>`}
  else if(sel==='repair'){const o=(info.offers||[]).find(x=>x.op==='repair')||{};detail=head+pnFacts([['Armor to mend',htmlEsc(o.d||'')],['Price',o.cost?tvIcon('coin',16)+o.cost+' crowns':'Nothing to mend']]);foot=`<span class="pn-fl">${o.cost?pnCoin(o.cost,'big'):''}<small>no tools used</small></span><button type="button" class="pn-btn pri${!o.cost||G.crowns<o.cost||shut?' off':''}" onclick="tvbDo('repair')">Mend everything</button>`}
  else if(sel==='hint'){detail=head+pnHead('The gifts of your swords')+`<div class="bl-hints">${G.roster.map(m=>{const r=tvbSv('college',{op:'hint',m:m.id});return`<div class="bl-hint">${twPortrait(m,32)}<span>${htmlEsc(r.ok?r.text:r.msg||'')}</span></div>`}).join('')}</div>`}
  else if(sel==='respec'||sel[0]==='m'){const m=selM();list=list.replace(/<\/div>$/,'')+'';
   if(!m){detail=head+pnHead('Unlearn a tree')+`<p class="pn-p dim">Pick a sword:</p><div class="bl-mercs">${G.roster.map(x=>`<button type="button" class="pn-btn" onclick="tvbPick('m${x.id}')">${twPortrait(x,16)}<span>${htmlEsc(x.name)}</span></button>`).join('')}</div>`}
   else{const trees=typeof tlTrees==='function'?tlTrees(m):[];const rows=trees.map(x=>{const r=tvbSv('college',{op:'respecCost',m:m.id,tree:x.key});return r.ok&&r.n?`<div class="bl-tree">${twIcon(tlTreeIcon(x.key),32)}<span><b>${htmlEsc(x.tree&&x.tree.n||x.key)}</b><small>${r.n} perk${r.n===1?'':'s'} back to spend</small></span><button type="button" class="pn-btn${G.crowns<r.cost||shut?' off':''}" onclick="tvbDo('respec','${m.id}','${x.key}')">${pnCoin(r.cost)}Unlearn</button></div>`:''}).join('');
    detail=twHead(twPortrait(m,48),'Unlearn a tree',htmlEsc(m.name))+(rows||pnEmpty('Nothing learned yet that could be unlearned.'))+`<p class="pn-p dim">The points come back at once, to spend again in any tree this sword can learn.</p>`}}
  else detail=head+(offers.length?pnFacts(offers):'')}
 else if(k==='hall'){list=pnSec('Your swords',G.roster.length);G.roster.forEach((m,mi)=>{const r=tvbSv('hall',{op:'trainCost',m:m.id});list+=mercRow(m,mi,r.ok&&!r.why?pnCoin(r.cost,G.crowns<r.cost?'short':''):'<span class="tw-t">Max</span>',`Level ${m.lvl} · ${r.ok&&!r.why?'+'+r.xp+' XP':htmlEsc(r.why||r.msg||'')}`)});
  const m=selM()||G.roster[0];if(m&&!sel)sel='m'+m.id;
  if(m){const r=tvbSv('hall',{op:'trainCost',m:m.id});detail=twHead(twPortrait(m,48),'Training hall',htmlEsc(m.name))+`<p class="pn-p">${htmlEsc(B?B.d:'')}</p>`+pnFacts([['Drill',tvIcon('day',16)+(r.hours||3)+' hours'],['Experience',tvIcon('xp',16)+(r.xp?'+'+r.xp:'None')],['Price',tvIcon('coin',16)+(r.cost||0)+' crowns']]);
   foot=`<span class="pn-fl">${pnCoin(r.cost||0,'big'+(G.crowns<(r.cost||0)?' short':''))}<small>${r.why?'<em>'+htmlEsc(r.why)+'</em>':shut?'<em>Closed to you</em>':'no daily limit'}</small></span><button type="button" class="pn-btn pri${r.why||!r.ok||G.crowns<r.cost||shut?' off':''}" onclick="tvbDo('train','${m.id}')">Train</button>`}}
 else if(k==='harbour'){const r=tvbSv('harbour',{op:'list'}),L=r.ok&&Array.isArray(r.list)?r.list:[];list=pnSec('Ships sailing',L.length);if(!L.length)list+=pnEmpty('No ships sail from here to another harbour.');
  L.forEach(x=>{list+=pnRow({on:`tvbPick('s${x.to}')`,sel:sel==='s'+x.to,cls:'tw-row',lead:tvIcon('bld-harbour',32),title:htmlEsc(x.n),sub:`${x.days} day${x.days===1?'':'s'} at sea${x.closed?' · <span class="tw-bad">closed to you</span>':''}`,right:pnCoin(x.cost,G.crowns<x.cost?'short':'')})});
  const x=L.find(o=>'s'+o.to===sel)||L[0];if(x){sel='s'+x.to;const o=G.towns[x.to],road=Math.max(1,Math.round(Math.hypot(o.x-t.x,o.y-t.y)/TS));
   detail=twHead(tvIcon('bld-harbour',48),'Passage to',htmlEsc(x.n))+`<p class="pn-p">The company boards with its wagons and stores. No battles at sea, but the days pass as they would on the road.</p>`+pnFacts([['At sea',tvIcon('day',16)+x.days+' day'+(x.days===1?'':'s')],['By road',leagues?leagues(o,t)+' leagues':road+' leagues'],['Fare',tvIcon('coin',16)+x.cost+' crowns'],['Food eaten',tvIcon('food',16)+'about '+x.days*G.roster.length]]);
   foot=`<span class="pn-fl">${pnCoin(x.cost,'big'+(G.crowns<x.cost?' short':''))}<small>${x.closed?'<em>Closed to you</em>':'for the whole company'}</small></span><button type="button" class="pn-btn pri${G.crowns<x.cost||x.closed||shut?' off':''}" onclick="tvbDo('sail',${x.to})">Set sail</button>`}
  else detail=head}
 TVB.sel[k]=sel;if(!detail)detail=head+(offers.length?pnFacts(offers):'');
 if(TVB.hint&&k==='college')detail=`<p class="pn-p good">${htmlEsc(TVB.hint)}</p>`+detail;
 return{list,detail,foot,key:k+':'+sel}}
function tvbOpen(k){const t=G.towns[G.town];if(!t||typeof showPanel!=='function')return;TVB.k=k;if(typeof townTab!=='undefined')townTab=k;G.townOpen=true;const v=tvbView(t,k),sq=typeof tvCan==='function'&&tvCan();
 showPanel({id:'town',title:t.name,sub:`Day ${G.day}`,banner:tvTownBanner(G.town),meta:typeof pnPurse==='function'?pnPurse():'',note:tvTownNote(G.town),closeLabel:sq?'Town square':'Leave town',closeIcon:sq?'back':'x',onClose:sq&&typeof townBack==='function'?townBack:leaveTown,
  tabs:tvTownTabs(t).map(([kk,n])=>({k:kk,n,icon:TVX.includes(kk)?tvBldIcon(kk):kk})),tab:k,onTab:kk=>{if(TVX.includes(kk))tvbOpen(kk);else townGo(kk)},
  list:v.list,listKey:'town:'+k,detail:v.detail,detailKey:'town:'+v.key,foot:v.foot})}

/* ---- a solo run (canRecruit() false): the tavern's recruits are shown greyed, with the reason and no Hire button.
   townView (50-towns.js) builds the page; this wraps its result so the rules' tavern stays the one source. ---- */
function twSoloTavern(v){const why=htmlEsc(typeof tlSoloWhy==='function'?tlSoloWhy():'You ride alone');
 const note=`<div class="pn-hint tw-hint tw-alone">${twIcon(typeof icHas==='function'&&icHas('or-slayer')?'or-slayer':'skull',32)}<span><b>${why}</b>No sword signs on with a lone hunter. Followers can still be hired.</span></div>`;
 const i=v.list.indexOf('<div class="pn-sec');v.list=(i>=0?v.list.slice(0,i)+'<div class="tw-solo">'+v.list.slice(i):'<div class="tw-solo">'+v.list)+'</div>';
 v.detail=note+(v.detail&&!/pn-blank/.test(v.detail)?`<div class="tw-solo-d">${v.detail}</div>`:v.detail||'');
 v.foot=`<span class="pn-fl"><small><em class="tw-alone-f">${why}</em></small></span>`;
 v.key=(v.key||'')+':solo';return v}
if(typeof townView==='function'){const twViewBase=townView;townView=function(t){const v=twViewBase(t);
 try{if(v&&typeof townTab!=='undefined'&&townTab==='tavern'&&!(typeof townSel==='object'&&townSel&&townSel.tav==='ret')&&typeof tlCanRecruit==='function'&&!tlCanRecruit())twSoloTavern(v)}catch(e){}return v}}
