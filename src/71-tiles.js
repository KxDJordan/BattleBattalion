/* ================= TILES, PROPS, BACKDROPS (pixel-art terrain; contract: drawTilePx, drawPropPx, propBoxPx, drawBackdropPx, sceneTint) =================
   Everything is painted in code into palette-index buffers (PAL keys only), converted once to small canvases and cached.
   A tile is up to three blits: left cliff face, right cliff face, top diamond. Variation is a hash of (c,r); the seeded game
   rnd() stream is never touched. Geometry (art px, tile centre at 0,0): the top is a 32x15 diamond, rows -7..7, half-width
   16-2|y|, which tessellates exactly with neighbours at (+-16,+-8); cliff faces hang below the two lower edges, 8 px a step. */
const TXK=Object.keys(PAL),TXI={};TXK.forEach((k,i)=>TXI[k]=i+1);
const TXBK=['plains','forest','hills','swamp','desert','snow','ashen','hollow','glass'],TXBI={};TXBK.forEach((k,i)=>TXBI[k]=i);
const TXTI={ground:0,rough:1,haz:2,block:3};
const TXBAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const TXHEAD=14;                                   // headroom above the diamond for upright details (grass, reeds, flames)
let TXRGB=null;
function txRGB(){if(!TXRGB){TXRGB=new Uint32Array(TXK.length+1);TXK.forEach((k,i)=>{const n=parseInt(PAL[k].slice(1),16);TXRGB[i+1]=(0xff000000|(n&255)<<16|(n>>8&255)<<8|n>>16)>>>0})}return TXRGB}
function txHash(a,b,s){let h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul((s|0)+1,1274126177);h=Math.imul(h^h>>>13,2246822519);return((h^h>>>16)>>>0)/4294967296}
function txRM(){return typeof reduced!=='undefined'&&!!reduced}
/* one step darker for every palette key (shadows, right-hand cliff faces) */
const TXD={r:'q',q:'p',p:'o',o:'G',l:'m',m:'n',n:'4','4':'3','3':'2','2':'1','1':'0','0':'0','5':'7','6':'5','7':'3',A:'v',v:'w',w:'7',B:'7',
 a:'1',b:'a',c:'b',d:'c',e:'d',f:'G',g:'f',h:'g',i:'a',j:'i',k:'j',s:'t',t:'u',u:'i',x:'X',X:'G',y:'Y',Y:'a',z:'Z',Z:'3',C:'D',D:'G',G:'1',E:'K',K:'f',F:'x',H:'i',I:'b',J:'p'};
function txDk(M,k){return(M&&M.sh&&M.sh[k])||TXD[k]||k}

/* ---- painter: w x h palette-index buffer with an origin; s() clips to the tile diamond ---- */
function txBuf(w,h,ax,ay){const d=new Uint8Array(w*h);ax|=0;ay|=0;
 const P={w,h,d,ax,ay,map:null,
  p(x,y,k){x=(x+ax)|0;y=(y+ay)|0;if(x<0||y<0||x>=w||y>=h)return;if(P.map){const m=P.map[k];if(m)k=m}d[y*w+x]=TXI[k]||0},
  s(x,y,k){const a=y<0?-y:y;if(a>7)return;const hw=16-2*a;if(x<-hw||x>=hw)return;d[(y+ay)*w+x+ax]=TXI[k]||0},
  g(x,y){x=(x+ax)|0;y=(y+ay)|0;if(x<0||y<0||x>=w||y>=h)return'';const v=d[y*w+x];return v?TXK[v-1]:''},
  r(x,y,ww,hh,k){for(let j=0;j<hh;j++)for(let i=0;i<ww;i++)P.p(x+i,y+j,k)},
  line(x0,y0,x1,y1,k,clip){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy;
   for(let n=0;n<200;n++){if(clip)P.s(x0,y0,k);else P.p(x0,y0,k);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx}if(e2<=dx){e+=dx;y0+=sy}}}};
 return P}
function txCv(P){const c=pxCanvas(P.w,P.h);if(!c||!c.getContext)return null;const g=c.getContext('2d');if(!g)return null;
 const im=g.createImageData(P.w,P.h),o=new Uint32Array(im.data.buffer),C=txRGB(),d=P.d;for(let i=0;i<d.length;i++)o[i]=d[i]?C[d[i]]:0;g.putImageData(im,0,0);return c}
function txIn(x,y){const a=y<0?-y:y;if(a>7)return false;const hw=16-2*a;return x>=-hw&&x<hw}
/* random point inside the diamond; m = margin 0..1 */
function txPt(R,m){const u=(R()-.5)*(1-m),v=(R()-.5)*(1-m);return[Math.round((u-v)*16),Math.round((u+v)*8)]}
function txBlot(P,R,k,n,r0,r1,only,m){for(let i=0;i<n;i++){const pt=txPt(R,m===undefined?.25:m),rx=r0+R()*(r1-r0),ry=Math.max(1,rx*.5),cx=pt[0],cy=pt[1];
  for(let y=-Math.ceil(ry);y<=ry;y++)for(let x=-Math.ceil(rx);x<=rx;x++){const q=x*x/(rx*rx)+y*y/(ry*ry),j=R();if(q<=1-j*.5&&(!only||P.g(cx+x,cy+y)===only))P.s(cx+x,cy+y,k)}}}
function txSpeck(P,R,ks,n){for(let i=0;i<n;i++){const pt=txPt(R,.15);P.s(pt[0],pt[1],ks[(R()*ks.length)|0])}}
function txTuft(P,R,hi,lo,n){for(let i=0;i<n;i++){const pt=txPt(R,.3),x=pt[0],y=pt[1];if(R()<.6){P.s(x,y,lo);P.s(x-1,y-1,hi);P.s(x+1,y-1,hi)}else{P.s(x,y,lo);P.s(x,y-1,hi);P.s(x+1,y,hi)}}}
function txPebble(P,R,n,hi,mid,lo){for(let i=0;i<n;i++){const pt=txPt(R,.35),x=pt[0],y=pt[1],w=1+((R()*3)|0);for(let j=0;j<w;j++){P.s(x+j,y,j===0?hi:mid);P.s(x+j,y+1,j===0?mid:lo)}}}
/* a wandering 1 px line along the iso axes (veins, cracks) */
function txVein(P,R,k,len,k2){let pt=txPt(R,.5),x=pt[0],y=pt[1],d=(R()*4)|0;const DX=[2,2,-2,-2],DY=[1,-1,1,-1];
 for(let i=0;i<len;i++){if(R()<.35)d=(d+(R()<.5?1:3))&3;const nx=x+DX[d],ny=y+DY[d];P.s(x,y,k);P.s(x+(DX[d]>>1),y,k);if(k2&&R()<.18)P.s(x,y,k2);x=nx;y=ny}}
/* upright blade (shards, razor glass): base (x,y), tapering to a point */
function txBlade(P,x,y,hgt,w,lean,hi,mid,lo,tip){for(let dy=0;dy<hgt;dy++){const q=dy/hgt,ww=Math.max(1,Math.round(w*(1-q*q))),cx=x+Math.round(lean*q);
  for(let i=0;i<ww;i++)P.p(cx+i-(ww>>1),y-dy,i===0?hi:i===ww-1&&ww>1?lo:mid)}P.p(x+Math.round(lean),y-hgt,tip||hi)}
/* small animated flame: cols [outer, mid, inner, core] */
function txFlame(P,x,y,hgt,f,ph,cols){const t=(f+ph)&7,sw=[0,1,1,0,0,-1,-1,0][t],hh=hgt+[0,1,0,-1,0,1,2,1][t];
 for(let L=0;L<3;L++){const lh=Math.round(hh*[1,.68,.4][L]);for(let dy=0;dy<lh;dy++){const q=dy/lh,hw=Math.max(0,Math.round((q<.3?1.4+q*2:2.2*(1-q))*(hgt>5?1:.7))-L),cx=x+Math.round(sw*q*1.6);
   for(let dx=-hw;dx<=hw;dx++)P.p(cx+dx,y-dy,cols[L])}}
 P.p(x,y,cols[3]);if(hgt>4)P.p(x,y-1,cols[3]);if(t&1)P.p(x+sw*2+(ph&1?1:-1),y-hh-1-(t>>1),cols[1])}

/* ---- per-biome materials. ground(P,R,hf): flat texture; rough(P,R,hf,f,ph,var,c,r): ph 0 flat pass, 1 upright pass;
   haz likewise. sh: shadow remap overrides; rim: lit edge colour above a cliff; face: cliff strata. ---- */
function txFire(P,R,f,ph){
 if(!ph){txBlot(P,R,'i',3,4,7,0,.3);txBlot(P,R,'G',3,2.5,5,0,.4);txBlot(P,R,'1',2,1.5,3,0,.5);
  for(let i=0;i<7;i++){const pt=txPt(R,.25),o=(R()*8)|0,t=(f+o)&7;P.s(pt[0],pt[1],t<2?'y':t<5?'E':'g')}}
 else{const n=3+((R()*2)|0),L=[];for(let i=0;i<n;i++){const pt=txPt(R,.45);L.push([pt[0],pt[1],5+((R()*5)|0),(R()*8)|0])}L.sort((a,b)=>a[1]-b[1]);
  for(const a of L)txFlame(P,a[0],a[1],a[2],f,a[3],['g','E','y','e'])}}
const TXM={
 plains:{rim:'A',edge:'w',shadow:'7',sh:{w:'B',A:'v',v:'w',B:'7'},
  ground(P,R,hf){txFill(P,'v');txTone(P,R,hf,'w','A');txBlot(P,R,'w',(hf<.5?2:1)+(R()<.35?1:0),2.5,5);txBlot(P,R,'A',hf>.5?2:1,1.5,3);txTuft(P,R,'A','B',2+((R()*3)|0));
   const q=R();if(q<.2){const fc=['r','y','h','C'][(R()*4)|0];for(let i=0;i<3;i++){const pt=txPt(R,.35);P.s(pt[0],pt[1],fc);P.s(pt[0],pt[1]+1,'B')}}
   else if(q<.32)txPebble(P,R,1+((R()*2)|0),'q','p','n');else if(q<.4){txBlot(P,R,'k',1,2,3.5);txSpeck(P,R,['j'],2)}},
  rough(P,R,hf,f,ph,v){
   if(v<.3){if(!ph){txBlot(P,R,'j',2,5,8,0,.45);txBlot(P,R,'i',3,2,3.5,0,.4);txSpeck(P,R,['k','k','u'],6);txTuft(P,R,'A','B',2)}}
   else if(!ph){txBlot(P,R,'B',3,5,8,0,.4);txBlot(P,R,'7',2,2,4)}
   else txGrass(P,R,16,3,6,'7','B','w','A')},
  face:{lip:['w','B'],len:2,soil:['j','i'],st:[[10,'earth','k','j','i'],[-99,'rock','n','o','4']]}},
 forest:{rim:'w',edge:'7',shadow:'3',
  ground(P,R,hf){txFill(P,'B');txTone(P,R,hf,'7','w');txBlot(P,R,'7',(hf<.5?2:1)+(R()<.35?1:0),2.5,4.5);txBlot(P,R,'w',hf>.5?2:1,1.5,3);txSpeck(P,R,['K','c','j','b'],3+((R()*3)|0));txTuft(P,R,'w','7',2);
   const q=R();if(q<.14){const pt=txPt(R,.4);P.s(pt[0],pt[1],'l');P.s(pt[0]-1,pt[1]-1,'h');P.s(pt[0],pt[1]-1,'g');P.s(pt[0]+1,pt[1]-1,'g')}
   else if(q<.28){const pt=txPt(R,.45);P.line(pt[0],pt[1],pt[0]+4,pt[1]+(R()<.5?1:-1),'j',1);P.s(pt[0]+2,pt[1]-1,'i')}else if(q<.36)txPebble(P,R,1,'n','o','4')},
  rough(P,R,hf,f,ph){if(!ph){txBlot(P,R,'7',3,4,7,0,.4);txBlot(P,R,'3',2,2,3.5)}
   else{const n=3+((R()*2)|0),L=[];for(let i=0;i<n;i++){const pt=txPt(R,.45);L.push([pt[0],pt[1],2.5+R()*1.6,R()])}L.sort((a,b)=>a[1]-b[1]);
    for(const a of L){txEll(P,a[0],a[1]-2,a[2]+1,a[2],'w','B','7',.4);P.p(a[0]-1,a[1]-3,'A');if(a[3]<.5){P.p(a[0]+1,a[1]-2,'g');P.p(a[0]-2,a[1]-1,'g')}}
    txGrass(P,R,5,3,5,'3','7','B','w')}},
  face:{lip:['B','7'],len:2,soil:['i','a'],roots:1,st:[[10,'earth','j','i','a'],[-99,'rock','o','4','3']]}},
 hills:{rim:'v',edge:'7',shadow:'7',
  ground(P,R,hf){txFill(P,'w');txTone(P,R,hf,'7','v');txBlot(P,R,'m',1+(R()<.4?1:0),2,4.5);txBlot(P,R,'n',(R()*2)|0,1.5,3);txBlot(P,R,'v',hf>.5?2:1,2,3.5);txSpeck(P,R,['k','7'],3);txTuft(P,R,'m','7',1+((R()*2)|0));
   if(R()<.45)txPebble(P,R,1+((R()*3)|0),'q','p','o')},
  rough(P,R,hf,f,ph){if(!ph){txBlot(P,R,'n',3,5,8,0,.4);txBlot(P,R,'o',3,2,3.5,0,.4)}
   else{const L=[];for(let i=0;i<9;i++){const pt=txPt(R,.3);L.push([pt[0],pt[1],1+((R()*3)|0)])}L.sort((a,b)=>a[1]-b[1]);
    for(const a of L){const w=a[2]+1,x=a[0],y=a[1];for(let j=0;j<w;j++){if(a[2]>1)P.s(x+j,y-2,j<w-1?'q':'p');P.s(x+j,y-1,j===0?'q':j<w-1?'p':'o');P.s(x+j,y,j===0?'p':'o')}P.s(x+w,y,'4');P.s(x+1,y+1,'4')}}},
  face:{lip:['w','7'],len:2,soil:['o','G'],st:[[8,'rock','m','n','o'],[-99,'rock','n','o','G']]}},
 swamp:{rim:'w',edge:'3',shadow:'2',
  ground(P,R,hf){txFill(P,'4');txTone(P,R,hf,'3','w');txBlot(P,R,'w',1+Math.round(hf*2)+((R()*2)|0),2.5,5);txBlot(P,R,'3',(R()*2)|0,2,3.5);txSpeck(P,R,['n','7','B'],4);txTuft(P,R,'v','3',1+((R()*2)|0));
   const q=R();if(q<.25){txBlot(P,R,'i',1,3,4.5);txSpeck(P,R,['j'],2)}else if(q<.33){const pt=txPt(R,.45);P.s(pt[0],pt[1],'l');P.s(pt[0]+1,pt[1],'m');P.s(pt[0]+2,pt[1]-1,'l')}
   else if(q<.42){const pt=txPt(R,.45);P.s(pt[0],pt[1],'m');P.s(pt[0],pt[1]-1,'h');P.s(pt[0]+1,pt[1]-1,'g')}},
  rough(P,R,hf,f,ph){
   if(!ph){for(let y=-7;y<=7;y++)for(let x=-16;x<16;x++){if(!txIn(x,y))continue;const u=(x+.5)/32+y/16,v=y/16-(x+.5)/32,e=Math.max(Math.abs(u),Math.abs(v));if(e<.39+txHash(x>>1,y,5)*.08)P.s(x,y,'7');else if(e<.47&&txHash(x,y,9)<.5)P.s(x,y,'i')}
    txBlot(P,R,'3',2,2.5,5,'7',.5);txBlot(P,R,'Z',2,2,4,'7',.45);
    const nl=(R()*3)|0;for(let i=0;i<nl;i++){const pt=txPt(R,.5),x=pt[0],y=pt[1],fl=R()<.4;if(P.g(x,y)!=='7'&&P.g(x,y)!=='Z')continue;P.s(x,y,'B');P.s(x+1,y,'w');P.s(x-1,y,'B');P.s(x,y-1,'w');if(fl)P.s(x,y,'h')}
    for(let i=0;i<4;i++){const pt=txPt(R,.42),o=(R()*8)|0,len=2+((R()*2)|0),t=(f+o)&7,x=pt[0]+(t>>1),y=pt[1];if(t>5)continue;for(let j=0;j<len;j++){const k=P.g(x+j,y);if(k==='7'||k==='3'||k==='Z')P.s(x+j,y,t<4?'5':'Z')}}
    {const pt=txPt(R,.5),o=(R()*8)|0;if(((f+o)&7)<2&&P.g(pt[0],pt[1])==='7')P.s(pt[0],pt[1],'6')}}
   else{const n=3+((R()*3)|0),L=[];for(let i=0;i<n;i++){const pt=txPt(R,.4);L.push([pt[0],pt[1],5+((R()*5)|0),(R()*8)|0,R()])}L.sort((a,b)=>a[1]-b[1]);
    for(const a of L){const x=a[0],y=a[1],hg=a[2],sw=((f+a[3])&7)<2?1:0;for(let dy=0;dy<hg;dy++)P.p(x+(dy>hg-3?sw:0),y-dy,dy<2?'3':dy<hg-2?'w':'v');
     if(a[4]<.6){P.p(x+sw,y-hg,'i');P.p(x+sw,y-hg-1,'j');P.p(x+sw,y-hg-2,'i')}else P.p(x+sw+1,y-hg,'v');P.p(x+1,y-2,'w');P.p(x+2,y-3,'v')}}},
  face:{lip:['4','3'],len:2,soil:['i','a'],roots:1,st:[[8,'earth','j','i','a'],[-99,'earth','4','3','2']]}},
 desert:{rim:'e',edge:'k',shadow:'j',sh:{c:'k',d:'c',e:'d',k:'j'},
  ground(P,R,hf){txFill(P,'c');txTone(P,R,hf,'k','d');txBlot(P,R,'k',(hf<.5?1:0)+(R()<.4?1:0),2,4);txBlot(P,R,'d',hf>.5?2:1,2,4);
   const n=1+((R()*2)|0);for(let i=0;i<n;i++){const pt=txPt(R,.45),len=2+((R()*4)|0),dn=1;for(let j=0;j<len;j++){P.s(pt[0]+j*2,pt[1]+j*dn,'d');P.s(pt[0]+j*2+1,pt[1]+j*dn,'d');if(j&1)P.s(pt[0]+j*2,pt[1]+j*dn+1,'k')}}
   txSpeck(P,R,['b','k','k'],1+((R()*2)|0));
   const q=R();if(q<.16)txPebble(P,R,1+((R()*2)|0),'d','k','j');else if(q<.26){const pt=txPt(R,.45),x=pt[0],y=pt[1];P.s(x,y,'j');P.s(x-1,y-1,'b');P.s(x+1,y-1,'b');P.s(x,y-2,'k');P.s(x+2,y-2,'b');P.s(x-2,y-2,'j')}
   else if(q<.32){const pt=txPt(R,.45);P.s(pt[0],pt[1],'l');P.s(pt[0]+1,pt[1],'l');P.s(pt[0]+2,pt[1]-1,'m');P.s(pt[0]-1,pt[1]+1,'m')}},
  rough(P,R,hf,f,ph,v){
   if(v<.55){if(ph){const L=[];for(let i=0;i<2;i++){const pt=txPt(R,.6);L.push([pt[0]+(i?4:-4),pt[1]+(i?3:-2),6+((R()*3)|0)])}
     for(const a of L){const cx=a[0],cy=a[1],rx=a[2];for(let x=-rx;x<=rx;x++){const t=x/rx,top=cy-Math.round((1-t*t)*3.2),bot=cy+Math.round((1-Math.abs(t))*1.5)+1;
       for(let y=top;y<=bot;y++){const lee=x>(y-top)*1.3-rx*.35;P.s(cx+x,y,y===top?'e':lee?(y>=bot-1&&x>0?'b':'k'):'d')}}}}}
   else if(!ph){txBlot(P,R,'k',2,6,9,0,.5);txBlot(P,R,'u',2,2,3.5,0,.4);for(let i=0;i<4;i++)txVein(P,R,'b',4+((R()*4)|0),'a');txSpeck(P,R,['c','d'],5)}},
  face:{lip:['d','c'],len:1,soil:['k','j'],st:[[16,'band','c','k','j'],[8,'band','k','u','j'],[-99,'band','k','j','i']]}},
 snow:{rim:'r',edge:'p',shadow:'p',sh:{r:'q',q:'p',F:'x',l:'q'},
  ground(P,R,hf){txFill(P,'r');txTone(P,R,Math.min(hf,.5),'q','r');txBlot(P,R,'q',(hf<.5?2:1)+(R()<.4?1:0),2.5,5.5);txSpeck(P,R,['F','q','F'],3+((R()*3)|0));
   const q=R();if(q<.2){for(let i=0;i<3;i++){const pt=txPt(R,.4);P.s(pt[0],pt[1],'4');P.s(pt[0],pt[1]-1,'n');if(i)P.s(pt[0]+1,pt[1]-1,'n')}}
   else if(q<.34){const pt=txPt(R,.4),x=pt[0],y=pt[1];P.s(x,y-1,'r');P.s(x+1,y-1,'q');P.s(x,y,'p');P.s(x+1,y,'o');P.s(x+2,y,'o');P.s(x-1,y,'p')}
   else if(q<.42){const pt=txPt(R,.5);for(let i=0;i<3;i++){P.s(pt[0]+i*4,pt[1]+i*2,'q');P.s(pt[0]+i*4+1,pt[1]+i*2,'p')}}},
  rough(P,R,hf,f,ph,v,c,r){
   if(v<.42){if(!ph){for(let y=-7;y<=7;y++)for(let x=-16;x<16;x++){if(!txIn(x,y))continue;const u=(x+.5)/32+y/16,w=y/16-(x+.5)/32,e=Math.max(Math.abs(u),Math.abs(w));if(e<.4+txHash(x>>1,y,5)*.07)P.s(x,y,'F');else if(e<.46)P.s(x,y,txHash(x,y,3)<.5?'q':'r')}
     txBlot(P,R,'x',3,2.5,5,'F',.45);for(let i=0;i<2;i++)txVein(P,R,'r',4+((R()*4)|0));txVein(P,R,'X',3);
     const t=(f+((c*3+r*5)&7))&7;if(t<4){const s=-22+t*13;for(let y=-7;y<=7;y++)for(let x=-16;x<16;x++){const k=P.g(x,y);if((k==='F'||k==='x')&&Math.abs(x+2*y-s)<3&&((x+y)&1))P.s(x,y,'r')}}
     else if(t===6){const pt=txPt(R,.6);if(P.g(pt[0],pt[1])==='F'){P.s(pt[0],pt[1],'r');P.s(pt[0]-1,pt[1],'r');P.s(pt[0]+1,pt[1],'r');P.p(pt[0],pt[1]-1,'r');P.s(pt[0],pt[1]+1,'r')}}}}
   else if(ph){const L=[];for(let i=0;i<3;i++){const pt=txPt(R,.55);L.push([pt[0],pt[1],5+((R()*3)|0)])}L.sort((a,b)=>a[1]-b[1]);
    for(const a of L){const cx=a[0],cy=a[1],rx=a[2];for(let x=-rx;x<=rx;x++){const t=x/rx,top=cy-Math.round(Math.sqrt(1-t*t)*3.4),bot=cy+Math.round((1-Math.abs(t))*1.5);
      for(let y=top;y<=bot;y++){const sh=x>rx*.25+(top-y)*.6;P.p(cx+x,y,y===top&&x>-rx*.6?(x<0?'r':'q'):sh?(y>=bot&&x>0?'p':'q'):'r')}}
     for(let x=-rx+1;x<=rx+1;x++)if(txIn(cx+x,cy+2+((1-Math.abs(x/rx))*1.5|0)))P.s(cx+x,cy+2+((1-Math.abs(x/rx))*1.5|0),x>-2?'p':'q')}}},
  face:{lip:['r','q'],len:3,ice:1,soil:['o','G'],st:[[8,'rock','p','o','G'],[-99,'rock','o','G','1']]}},
 ashen:{rim:'n',edge:'G',shadow:'1',
  ground(P,R,hf){txFill(P,'o');txTone(P,R,hf,'G','n');txBlot(P,R,'G',(hf<.5?2:1)+(R()<.4?1:0),2.5,5);txBlot(P,R,'i',(R()*2)|0,2,3.5);txBlot(P,R,'n',hf>.5?1:0,1.5,3);txSpeck(P,R,['n','n','p','G'],4+((R()*3)|0));
   const q=R();if(q<.45){txVein(P,R,'f',4+((R()*5)|0),'g')}if(q>.86){const pt=txPt(R,.45);P.s(pt[0],pt[1],'m');P.s(pt[0]+1,pt[1],'l');P.s(pt[0]+2,pt[1]+1,'m')}
   else if(q>.72)txPebble(P,R,1+((R()*2)|0),'n','G','1')},
  rough(P,R,hf,f,ph){if(!ph){txBlot(P,R,'G',3,4,7,0,.4);txBlot(P,R,'1',2,2,3.5,0,.4)}
   else{const L=[];for(let i=0;i<4;i++){const pt=txPt(R,.45);L.push([pt[0],pt[1],2+R()*1.8])}L.sort((a,b)=>a[1]-b[1]);
    for(const a of L){txEll(P,a[0],a[1]-1,a[2]+1.2,a[2],'o','G','1',0);P.p(a[0]+((R()*3)|0)-1,a[1]-1,R()<.5?'E':'g');if(R()<.6)P.p(a[0]-2,a[1],'g')}
    for(let i=0;i<4;i++){const pt=txPt(R,.3);P.s(pt[0],pt[1],R()<.4?'E':'f')}}},
  haz(P,R,f,ph){
   if(!ph){for(let y=-7;y<=7;y++)for(let x=-16;x<16;x++){if(!txIn(x,y))continue;const u=(x+.5)/32+y/16,v=y/16-(x+.5)/32,e=Math.max(Math.abs(u),Math.abs(v)),n=txHash(x>>1,y,7)*.07;
      P.s(x,y,e>.43-n?(txHash(x,y,2)<.3?'1':'G'):e>.37-n?'f':e>.33-n?'g':'E')}
    const B=[];for(let i=0;i<3;i++){const pt=txPt(R,.6);B.push([pt[0],pt[1],2.2+R()*2,(R()*8)|0])}
    for(const b of B){const pu=[0,.3,.6,.3,0,-.3,-.5,-.3][(f+b[3])&7],rx=b[2]+pu,ry=rx*.5;for(let y=-3;y<=3;y++)for(let x=-6;x<=6;x++){const q=x*x/(rx*rx)+y*y/(ry*ry);if(q<=1&&P.g(b[0]+x,b[1]+y)==='E')P.s(b[0]+x,b[1]+y,q<.3?'e':'y')}}
    for(let i=0;i<3;i++){const pt=txPt(R,.55),o=(R()*8)|0,t=(f+o)&7,x=pt[0]+[0,0,1,1,1,0,0,-1][t],y=pt[1],w=2+((R()*2)|0);for(let j=0;j<w;j++){P.s(x+j,y,j?'G':'f');P.s(x+j,y+1,'1')}P.s(x-1,y,'g');P.s(x+w,y+1,'g')}
    for(let i=0;i<2;i++){const pt=txPt(R,.6),o=(R()*8)|0,t=(f+o)&7;if(t<3){const x=pt[0],y=pt[1];if(t===0)P.s(x,y,'e');else{P.s(x-t,y,'e');P.s(x+t,y,'e');P.s(x,y-1,'e');P.s(x,y+1,'y')}}}}
   else for(let i=0;i<3;i++){const pt=txPt(R,.5),o=(R()*8)|0,t=(f+o)&7;if(t<6){P.p(pt[0]+((t>>1)&1),pt[1]-2-t*2,t<3?'e':t<5?'y':'E');if(t>1&&t<5)P.p(pt[0],pt[1]-t*2,'E')}}},
  face:{lip:['o','G'],len:1,soil:['G','1'],lava:1,st:[[-99,'col','o','G','1']]}},
 hollow:{rim:'C',edge:'G',shadow:'1',
  ground(P,R,hf){txFill(P,'D');txTone(P,R,hf,'G','C');txBlot(P,R,'G',(hf<.5?1:0)+(R()<.5?1:0),2,4);txBlot(P,R,'X',R()<.3?1:0,1.5,2.5);const n=R()<.55?1:0;for(let i=0;i<n;i++)txVein(P,R,'C',4+((R()*5)|0),'r');txSpeck(P,R,['C','G'],2)},
  rough(P,R,hf,f,ph){if(!ph){txBlot(P,R,'G',3,4,7,0,.4);txBlot(P,R,'1',2,2,3.5,0,.4)}
   else{const L=[];for(let i=0;i<4;i++){const pt=txPt(R,.45);L.push([pt[0],pt[1],5+((R()*5)|0),3+((R()*2)|0),((R()*5)|0)-2])}L.sort((a,b)=>a[1]-b[1]);
    for(const a of L)txBlade(P,a[0],a[1],a[2]+2,a[3],a[4],'C','D','G','r')}},
  haz(P,R,f,ph){
   if(!ph){txBlot(P,R,'G',3,4,7,0,.35);txBlot(P,R,'1',3,3,5,0,.4);let x=-11,y=((R()*5)|0)-2;const pts=[];while(x<12){pts.push([x,y]);x+=1;if(R()<.4)y+=R()<.5?1:-1;y=Math.max(-4,Math.min(4,y))}
    const g2=(f>>1)&1;for(const p of pts){P.s(p[0],p[1]-2,'D');P.s(p[0],p[1]+2,'D');P.s(p[0],p[1]-1,g2?'C':'r');P.s(p[0],p[1]+1,'C');P.s(p[0],p[1],'0')}
    for(let i=0;i<5;i++){const pt=txPt(R,.3),o=(R()*8)|0;if(((f+o)&7)<3)P.s(pt[0],pt[1],'C')}}
   else{const L=[];for(let i=0;i<5;i++){const pt=txPt(R,.45);L.push([pt[0],pt[1],7+((R()*6)|0),(R()*8)|0])}L.sort((a,b)=>a[1]-b[1]);
    for(const a of L)txFlame(P,a[0],a[1],a[2],f,a[3],['G','C','r','r'])}},
  face:{lip:['D','G'],len:1,soil:['G','1'],vein:'C',st:[[8,'cry','C','D','G'],[-99,'cry','D','G','1']]}},
 glass:{rim:'r',edge:'7',shadow:'3',
  ground(P,R,hf){txFill(P,'5');txTone(P,R,hf,'Z','6');const n=1+Math.round(hf*1.5)+((R()*2)|0);for(let i=0;i<n;i++){const pt=txPt(R,.3);txTri(P,pt[0],pt[1],pt[0]+3+R()*5,pt[1]+(R()*4-2),pt[0]+R()*5-1,pt[1]+1+R()*3,i%4===3?'F':'6')}
   txBlot(P,R,'Z',1+((R()*2)|0),2,3.5,'5');for(let i=0;i<2;i++){const pt=txPt(R,.4),len=3+((R()*4)|0),dn=R()<.5?1:-1;for(let j=0;j<len;j++)P.s(pt[0]+j*2,pt[1]+j*dn,'7')}
   const g=1+((R()*3)|0);for(let i=0;i<g;i++){const pt=txPt(R,.3);P.s(pt[0],pt[1],'r')}},
  rough(P,R,hf,f,ph){if(!ph){txBlot(P,R,'7',3,3,6,0,.4);txSpeck(P,R,['r','6','F'],7)}
   else{const L=[];for(let i=0;i<5;i++){const pt=txPt(R,.45);L.push([pt[0],pt[1],4+((R()*5)|0),3+((R()*2)|0),((R()*5)|0)-2])}L.sort((a,b)=>a[1]-b[1]);
    for(const a of L)txBlade(P,a[0],a[1],a[2],a[3],a[4],'r','6','Z','r')}},
  haz(P,R,f,ph){
   if(!ph){const pu=(f>>1)&3;txBlot(P,R,'3',3,5,8,0,.3);txBlot(P,R,pu===1?'h':'g',4,3,5,0,.4);txBlot(P,R,pu===1?'e':pu===3?'g':'h',3,1.2,2.4,0,.5)}
   else{const L=[];for(let i=0;i<9;i++){const pt=txPt(R,.3);L.push([pt[0],pt[1],7+((R()*8)|0),2+((R()*2)|0),((R()*5)|0)-2,(R()*8)|0])}L.sort((a,b)=>a[1]-b[1]);
    for(const a of L){txBlade(P,a[0],a[1],a[2],a[3],a[4],'r','F','x','r');const t=(f+a[5])&7;P.p(a[0],a[1],t<4?'h':'g');
     if(t<2){const tx=a[0]+a[4],ty=a[1]-a[2];P.p(tx-1,ty,'r');P.p(tx+1,ty,'r');P.p(tx,ty-1,'r');P.p(tx,ty+1,'r')}else if(t===4)P.p(a[0]+Math.round(a[4]*.5),a[1]-(a[2]>>1),'h')}}},
  face:{lip:['6','5'],len:1,soil:['7','3'],vein:'6',st:[[8,'cry','5','7','3'],[-99,'cry','7','3','2']]}}
};
/* height tone: low ground carries sparse dark strokes, high ground sparse light ones */
function txTone(P,R,hf,dk,lt){const h=Math.round(hf*3),n=h===0?6:h===1?3:h===2?2:5,k=h<2?dk:lt;for(let i=0;i<n;i++){const pt=txPt(R,.12);P.s(pt[0],pt[1],k);if(R()<.6)P.s(pt[0]+1,pt[1],k)}}
function txFill(P,k){const v=TXI[k],d=P.d,w=P.w;for(let y=-7;y<=7;y++){const hw=16-2*(y<0?-y:y),o=(y+P.ay)*w+P.ax;for(let x=-hw;x<hw;x++)d[o+x]=v}}
function txTri(P,x0,y0,x1,y1,x2,y2,k){const mnx=Math.floor(Math.min(x0,x1,x2)),mxx=Math.ceil(Math.max(x0,x1,x2)),mny=Math.floor(Math.min(y0,y1,y2)),mxy=Math.ceil(Math.max(y0,y1,y2));
 const A=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);if(Math.abs(A)<.5)return;for(let y=mny;y<=mxy;y++)for(let x=mnx;x<=mxx;x++){const a=((x1-x)*(y2-y)-(x2-x)*(y1-y))/A,b=((x2-x)*(y0-y)-(x0-x)*(y2-y))/A;if(a>=0&&b>=0&&a+b<=1)P.s(x,y,k)}}
function txGrass(P,R,n,h0,h1,dk,lo,mid,hi){const L=[];for(let i=0;i<n;i++){const pt=txPt(R,.28);L.push([pt[0],pt[1],h0+((R()*(h1-h0+1))|0),((R()*3)|0)-1])}L.sort((a,b)=>a[1]-b[1]);
 for(const a of L){const x=a[0],y=a[1],hg=a[2];for(let dy=0;dy<hg;dy++){const q=dy/(hg-1||1);P.p(x+(q>.6?a[3]:0),y-dy,dy===0?dk:q<.4?lo:q<.8?mid:hi)}if(hg>4)P.p(x+1,y-1,lo)}}
/* shaded blob, light from the top-left; tex = dither amount on the tone boundaries */
function txEll(P,cx,cy,rx,ry,hi,mid,lo,tex){cx=Math.round(cx);cy=Math.round(cy);for(let y=-Math.ceil(ry);y<=ry;y++)for(let x=-Math.ceil(rx);x<=rx;x++){const nx=x/rx,ny=y/ry;if(nx*nx+ny*ny>1)continue;
  const L=-(nx*.6+ny*.8)+(tex?(TXBAY[((cx+x)&3)+((cy+y)&3)*4]/16-.5)*tex:0);P.p(cx+x,cy+y,L>.35?hi:L>-.3?mid:lo)}}

/* which rough variant a tile gets, and whether it animates */
function txRoughVar(bk,c,r){return txHash(c,r,41)}
function txAnimated(bk,ti,c,r){if(ti===2)return true;if(ti!==1)return false;return bk==='swamp'||(bk==='snow'&&txRoughVar(bk,c,r)<.42)}

/* ---- tile top: 32 x (15+TXHEAD) buffer ---- */
function txTopBuf(bk,ti,c,r,h,sL,sR,eL,eR,f){const P=txBuf(32,15+TXHEAD,16,7+TXHEAD),M=TXM[bk],seed=(Math.imul(c+11,73856093)^Math.imul(r+7,19349663)^Math.imul(TXBI[bk]+3,83492791))>>>0;
 const R=mulberry(seed),hf=h/3,v=txRoughVar(bk,c,r);
 M.ground(P,R,hf);
 if(ti===1)M.rough(P,mulberry(seed^0x51ed27),hf,f,0,v,c,r);
 else if(ti===2)(M.haz||txFire)(P,mulberry(seed^0x51ed27),f,0);
 else if(ti===3){const bx=txPropBox(bk,c,r),rx=Math.max(6,Math.min(12,bx.w*.36)),ry=rx*.5;   // bare patch and the obstacle's cast shadow (toward the lower right)
  for(let y=-7;y<=7;y++)for(let x=-16;x<16;x++){if(!txIn(x,y))continue;const q=(x-3)*(x-3)/(rx*rx)+(y-1)*(y-1)/(ry*ry);if(q<1||(q<1.25&&((x+y)&1))){let k=txDk(M,P.g(x,y));if(q<.45)k=txDk(M,k);P.s(x,y,k)}}}
 /* cast ambient shadow from taller back neighbours: back-left (light side) casts long, back-right casts a thin band */
 if((sL||sR)&&ti!==2){const wL=sL?.2+.14*sL:0,wR=sR?.1+.08*sR:0;
  for(let y=-7;y<=7;y++)for(let x=-16;x<16;x++){if(!txIn(x,y))continue;const a=(x+.5)/32+y/16+.5,b=y/16-(x+.5)/32+.5;let n=0;
   if(sL&&(a<wL||(a<wL+.11&&((x+y)&1)===0)))n++;if(sR&&(b<wR||(b<wR+.07&&((x+y)&1)===0)))n++;
   if(n){let k=P.g(x,y);k=txDk(M,k);if(n>1&&a<wL&&b<wR)k=txDk(M,k);P.s(x,y,k)}}}
 /* grid edge on the two front edges: one tone darker, or a lit rim where a cliff drops away */
 for(let x=-16;x<16;x++){const yb=x<0?(16+x)>>1:(15-x)>>1,lip=x<0?eL:eR,k=P.g(x,yb);
  if(ti===2&&M.haz){P.s(x,yb,'1');continue}
  P.s(x,yb,lip?(txHash(x,c*31+r,3)<.86?M.rim:k):txDk(M,k))}
 if(ti===1)M.rough(P,mulberry(seed^0x2c1b3d),hf,f,1,v,c,r);
 else if(ti===2)(M.haz||txFire)(P,mulberry(seed^0x2c1b3d),f,1);
 return P}

/* ---- cliff faces: 16 px wide, drop*8 px tall (+16 px skirt on the board edge), skewed along the tile edge ---- */
const TXWOB=[0,0,1,1,1,0,0,-1,-1,-1,0,0,1,0,0,0],TXJAG=[0,1,2,4,5,4,2,3,5,6,4,2,1,2,1,0];
function txFaceBuf(bk,side,h,drop,v,cd){const M=TXM[bk],F=M.face,edge=drop>h,D=edge?h*8+16:drop*8,P=txBuf(16,D+8,0,0);
 const lipHi=side?F.lip[1]:F.lip[0],lipLo=side?txDk(M,F.lip[1]):F.lip[1],dk=k=>side?txDk(M,k):k;
 for(let i=0;i<16;i++){const ii=side?15-i:i,y0=ii>>1,wob=TXWOB[ii],hv=txHash(ii,v,side+3);
  let lip=F.len+(hv<.3?1:0)-(hv>.8&&F.len>1?1:0);const icy=F.ice&&txHash(ii,v,side+17)<.22?2+((txHash(ii,v,9)*4)|0):0;
  const skl=edge?10+TXJAG[(ii+v*5)&15]-(txHash(ii>>1,v,5)<.3?2:0):0,end=edge?h*8+skl:D;
  for(let d=0;d<end;d++){const a=h*8-d-1;let k;
   if(a<0){const s=-a-1;k=s<1?F.st[F.st.length-1][4]:s>=skl-1?'0':s>=skl-3?'1':txFaceTex(F.st[F.st.length-1],ii,a,v,side,1,M);if(s>=1&&s<skl-3)k=txDk(M,k);if(side&&k!=='0')k=txDk(M,k)}
   else if(d<lip)k=d===lip-1&&lip>1?lipLo:lipHi;
   else if(d<lip+2+(wob>0?1:0)&&d<D-1)k=dk(d===lip?F.soil[1]:txHash(ii,d,v)<.25?F.soil[1]:F.soil[0]);
   else{let st=F.st[0];for(const s of F.st)if(a+wob>=s[0]){st=s;break}
    k=txFaceTex(st,ii,a,v,side,0,M);
    if(F.roots&&d<lip+7&&txHash(ii,v,23)<.16&&d-lip<3+txHash(ii,v,29)*5)k='k';
    if(F.vein&&txHash((ii+a)>>1,(ii-a)>>2,v+31)<.07)k=F.vein;
    if(F.lava&&a<12&&txHash(ii>>1,a>>2,v+37)<.2)k=txHash(ii,a,3)<.4?'g':'f';
    if(!edge&&d===D-1)k=txDk(M,st[4]);else if(!side&&cd&&ii===15&&d<cd*8&&txHash(d,v,11)<.8)k=st[2];
    k=dk(k)}
   if(icy&&d>=lip&&d<lip+icy&&a>=0)k=d===lip+icy-1?(side?'x':'F'):side?'q':'r';
   P.p(i,y0+d,k)}}
 return P}
function txFaceTex(st,i,a,v,side,sk,M){const hi=st[2],mid=st[3],lo=st[4],ty=st[1],n=txHash(i,a,v*2+side);
 if(ty==='earth'){if(n<.1)return lo;if(n<.16)return hi;const sx=(i+v*3)&7,sy=(a+v*5)%11;if(sx<2&&sy<2&&txHash(i>>1&3,(a+v*5)/11|0,v)<.5)return sy===1?hi:sx?lo:mid;return mid}
 if(ty==='rock'){const row=Math.floor(a/4),ra=((a%4)+4)%4,off=(row*5+v*3)&7,cell=(i+off)>>3,ci=(i+off)&7,merge=txHash(row,cell+v,7)<.3;
  if(ci===0&&!merge)return lo;if(ra===0)return lo;if(ra===3)return n<.75?hi:mid;if(ci===1&&!merge&&n<.5)return hi;return n<.07?lo:n>.95?hi:mid}
 if(ty==='band'){const b=((a+TXWOB[i&15])%9+9)%9;if(b===0)return lo;if(b===1||b===5)return hi;if(b===4&&n<.6)return lo;if(n<.05)return lo;if((i+v*3)%13===0&&txHash(i,a>>3,v)<.5)return lo;return mid}
 if(ty==='col'){const cw=4,off=v*3,ci=(i+off)%cw,col=((i+off)/cw)|0,brk=((a+col*3)%7+7)%7;if(ci===0)return hi;if(ci===cw-1)return lo;if(brk===0&&txHash(col,a,v)<.7)return lo;if(brk===6&&n<.5)return hi;return mid}
 /* cry: slanted crystalline facets */
 {const b=((i+a*2+v*3)>>2)&3,e=(i+a*2+v*3)&3;if(b===0)return e===0?lo:hi;if(e===0&&b===2)return lo;return n<.06?hi:mid}}

/* ---- public: tiles ---- */
const TXC=new Map(),TXFC=new Map();
function txFace(bk,bi,side,h,drop,c,r,cd){const v=(txHash(c,r,side+61)*4)|0,key=((((bi*2+side)*4+h)*8+drop)*8+cd)*4+v;let cv=TXFC.get(key);
 if(cv===undefined){cv=txCv(txFaceBuf(bk,side,h,drop,v,cd));TXFC.set(key,cv)}return cv}
function drawTilePx(q,x,y,o){const bk=TXM[o.bk]?o.bk:'plains',bi=TXBI[bk],ti=TXTI[o.t]||0,h=o.h<0?0:o.h>3?3:o.h|0,c=o.c|0,r=o.r|0;
 let dL=o.dropL|0,dR=o.dropR|0;dL=dL<0?0:dL>5?5:dL;dR=dR<0?0:dR>5?5:dR;const sL=o.shL>0?(o.shL>2?2:o.shL|0):0,sR=o.shR>0?(o.shR>2?2:o.shR|0):0;
 let anim=false,f=0;if(txAnimated(bk,ti,c,r)&&!txRM()){anim=true;f=(o.frame|0)&7}
 x=Math.round(x);y=Math.round(y);
 if(o.hd&&typeof drawTileHD==='function'){drawTileHD(q,x,y,bk,bi,ti,h,c,r,dL,dR,sL,sR,f);return anim}   // 71h-tileshd.js: the same tile at twice the resolution
 if(dL>0){const cv=txFace(bk,bi,0,h,dL,c,r,dR>0?(dL<dR?dL:dR):0);if(cv)q.drawImage(cv,x-16,y+1)}
 if(dR>0){const cv=txFace(bk,bi,1,h,dR,c,r,0);if(cv)q.drawImage(cv,x,y+1)}
 const key=((((((((bi*4+ti)*4+h)*3+sL)*3+sR)*2+(dL>0?1:0))*2+(dR>0?1:0))*64+(c&63))*64+(r&63))*8+f;let cv=TXC.get(key);
 if(cv===undefined){if(TXC.size>5000)TXC.clear();cv=txCv(txTopBuf(bk,ti,c,r,h,sL,sR,dL>0,dR>0,f));TXC.set(key,cv)}
 if(cv)q.drawImage(cv,x-16,y-7-TXHEAD);
 return anim}

/* ================= PROPS (obstacles on 'block' tiles) =================
   Painted procedurally into a 56x64 buffer with the feet at (28,52), then outlined in '0'. A few seeded variants per kind. */
const TXPW=56,TXPH=64,TXPAX=28,TXPAY=52;
function txOutline(P,k){const w=P.w,h=P.h,d=P.d,o=new Uint8Array(d),ki=TXI[k||'0'];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(d[i])continue;if((x>0&&d[i-1])||(x<w-1&&d[i+1])||(y>0&&d[i-w])||(y<h-1&&d[i+w]))o[i]=ki}d.set(o)}
function txPine(P,R,x0,y0,H,W,C,snow){const tH=Math.max(4,(H*.18)|0);for(let y=0;y<tH+4;y++){P.p(x0-1,y0-y,'j');P.p(x0,y0-y,'i');P.p(x0+1,y0-y,'a')}P.p(x0-2,y0,'i');P.p(x0+2,y0,'a');
 const n=H>30?4:3,top=y0-H,bot=y0-tH;
 for(let t=0;t<n;t++){const k=t/(n-1),th=Math.round((bot-top)/n*1.5),by=Math.round(bot-(bot-top-th)*k),ay=by-th,hw=Math.max(3,Math.round(W*(1-.5*k)));
  for(let yy=ay;yy<=by+1;yy++){const half=yy>by?hw:Math.max(0,Math.round((yy-ay)/th*hw));for(let x=-half;x<=half;x++){if(yy>by&&((x+t+half)&1))continue;if(yy>by&&Math.abs(x)===half)continue;
    const e=half?x/half:0;let c=e>.3?C.lo:e<-.2&&((x+2*yy)%3)?C.hi:C.mid;if(yy>=by)c=e<-.3?C.mid:C.lo;
    if(snow&&yy<=by&&(t===n-1&&yy-ay<5?true:x<=-half+2+((yy+t)&1)&&half>1))c=x>-half+1&&!(t===n-1&&yy-ay<5&&x<=0)?'q':'r';P.p(x0+x,yy,c)}}
  if(t<n-1){const nth=Math.round((bot-top)/n*1.5),nby=Math.round(bot-(bot-top-nth)*((t+1)/(n-1))),nhw=Math.max(3,Math.round(W*(1-.5*(t+1)/(n-1))));void nby;void nhw}}
 /* shade just under each tier's skirt */
 for(let t=1;t<n;t++){const k=t/(n-1),th=Math.round((bot-top)/n*1.5),by=Math.round(bot-(bot-top-th)*k),hw=Math.max(3,Math.round(W*(1-.5*k)));
  for(let x=-hw+1;x<hw;x++)for(let dy=2;dy<=3;dy++){const g=P.g(x0+x,by+dy);if(g&&g!==C.lo&&!((x+t+hw)&1&&dy===2&&0))P.p(x0+x,by+dy,g==='r'||g==='q'?'p':C.lo)}}
 P.p(x0,top-1,snow?'r':C.hi)}
function txLeafy(P,R,x0,y0,o){const tH=o.tH,C=o.C;
 for(let y=0;y<tH+6;y++){const b=y>tH*.6?Math.round((y-tH*.6)*o.lean):0;P.p(x0-2+b,y0-y,'k');P.p(x0-1+b,y0-y,'j');P.p(x0+b,y0-y,'j');P.p(x0+1+b,y0-y,'i');if(y<2||o.thick)P.p(x0+2+b,y0-y,'a');if(y<1)P.p(x0-3,y0,'j');if(y%4===2)P.p(x0-1+b,y0-y,'i')}
 P.line(x0-1,y0-tH+1,x0-6,y0-tH-4,'i');P.line(x0+1,y0-tH+2,x0+6,y0-tH-3,'a');
 const cx=x0+Math.round(tH*o.lean*.4),cy=y0-tH-o.ry,L=[];
 for(let i=0;i<o.n;i++){const a=i/o.n*6.283+R()*.5,rr=i<o.n-2?1:.35;L.push([cx+Math.cos(a)*o.rx*rr*.62,cy+Math.sin(a)*o.ry*rr*.6,o.cr*(.8+R()*.4)])}L.sort((a,b)=>a[1]-b[1]);
 for(const c of L)txEll(P,c[0],c[1],c[2]*1.15,c[2],C.hi,C.mid,C.lo,.5);
 for(let i=0;i<o.n*3;i++){const x=Math.round(cx+(R()-.5)*o.rx*1.7),y=Math.round(cy+(R()-.5)*o.ry*1.7),g=P.g(x,y);if(g===C.mid&&P.g(x-1,y)===C.mid&&P.g(x+1,y+1)===C.mid){P.p(x-1,y,C.hi);P.p(x,y-1,C.hi);P.p(x+1,y,C.lo)}else if(g===C.hi&&R()<.5&&C.sp)P.p(x,y,C.sp);else if(g===C.lo&&R()<.4){P.p(x,y,C.dk||C.lo)}}
 for(let y=cy+Math.round(o.ry*.35);y<y0;y++)for(let x=cx-o.rx-8;x<=cx+o.rx+8;x++){const g=P.g(x,y);if(g===C.hi)P.p(x,y,C.mid);else if(g===C.mid&&(y>cy+o.ry*.75||((x+y)&1)))P.p(x,y,C.lo);else if(g===C.sp)P.p(x,y,C.mid)}
 if(o.moss)for(let i=0;i<7;i++){const x=Math.round(cx+(R()-.5)*o.rx*1.6);let y=cy;while(y<y0&&P.g(x,y))y++;const len=2+((R()*5)|0);for(let j=0;j<len;j++)P.p(x,y+j,j===len-1?'n':'4')}
 if(o.fruit)for(let i=0;i<4;i++){const x=Math.round(cx+(R()-.5)*o.rx*1.3),y=Math.round(cy+(R()-.3)*o.ry);if(P.g(x,y))P.p(x,y,o.fruit)}}
function txDead(P,R,x0,y0,C,H,emb){const br=(x,y,a,len,th,d)=>{const x1=Math.max(x0-15,Math.min(x0+15,x+Math.cos(a)*len)),y1=y+Math.sin(a)*len;P.line(x,y,x1,y1,C[1]);if(th>1){P.line(x-1,y,x1-1,y1,C[0]);P.line(x+1,y,x1+1,y1,C[2])}if(th>2)P.line(x+2,y,x1+1,y1,C[2]);
   if(d>0){const n=d>1?2:1+(R()<.5?1:0);for(let i=0;i<n;i++)br(x1,y1,(a+(i?1:-1)*(.4+R()*.45)*(n>1?1:(R()<.5?1:-1)))*.8-1.57*.2,len*(.55+R()*.2),th-1,d-1)}else if(emb&&R()<.6)P.p(Math.round(x1),Math.round(y1),R()<.5?'E':'g')};
 P.p(x0-3,y0,C[1]);P.p(x0+3,y0,C[2]);P.p(x0-2,y0-1,C[0]);br(x0,y0,-1.57+(R()-.5)*.25,H*.36,3,3);if(R()<.7){P.p(x0+1,y0-4,'0');P.p(x0+1,y0-5,'0')}}
function txBoulder(P,R,cx,cy,rx,ry,C,cap){const p1=R()*6.28,p2=R()*6.28,p3=R()*6.28;
 for(let y=-ry-2;y<=ry;y++)for(let x=-rx-2;x<=rx+2;x++){const a=Math.atan2(y/ry,x/rx),q=Math.sqrt(x*x/(rx*rx)+y*y/(ry*ry)),lim=1+.1*Math.sin(3*a+p1)+.07*Math.sin(5*a+p2);if(q>lim||y>ry*.62)continue;
   const nx=x/rx,ny=y/ry,L=-(nx*.6+ny*.8);let k=ny<-.42+.12*Math.sin(x*.9+p3)?C[0]:L>-.05?C[1]:L>-.62?C[2]:C[3];if(y>ry*.62-1&&k!==C[3])k=C[2];
   if(cap&&ny<-.3+.15*Math.sin(x*1.3+p1))k=L>.5||x<0?cap[0]:cap[1];P.p(cx+x,cy+y,k)}
 for(let i=0;i<2;i++){let x=cx+Math.round((R()-.5)*rx),y=cy-Math.round(R()*ry*.3);const n=2+((R()*3)|0);for(let j=0;j<n;j++){const g=P.g(x,y);if(g===C[1])P.p(x,y,C[2]);else if(g===C[2])P.p(x,y,C[3]);x+=R()<.5?1:0;y++}}
 for(let i=0;i<3;i++){const x=cx+Math.round((R()-.6)*rx),y=cy+Math.round((R()-.5)*ry);if(P.g(x,y)===C[1])P.p(x,y,C[0])}}
function txPrism(P,bx,by,hgt,wd,lean,C){const tip=Math.round(wd*1.1),rg=Math.max(1,Math.round(wd*.42));
 for(let dy=0;dy<=hgt;dy++){const q=dy/hgt,cx=bx+Math.round(lean*q),t=dy>hgt-tip?(hgt-dy)/tip:1,l=Math.round(rg*t),rr=Math.round((wd-rg-1)*t);
  for(let x=-l;x<=rr;x++){let k=x<0?(x===-l&&l>1?C.mid:C.hi):x===0?(q>.25?C.gl:C.hi):x===rr&&rr>1?C.dk:C.lo;if(dy===0)k=C.dk;if(x<0&&((dy+x*2)%7===0))k=C.mid;P.p(cx+x,by-dy,k)}}}
function txColumn(P,R,x0,y0,H,snow){const cols=['l','l','m','l','m','m','n','o'];
 for(let y=0;y<4;y++)for(let x=-6;x<=6;x++)P.p(x0+x,y0+1-y,y===3?(x<3?'l':'m'):x>3?'o':x>0?'n':'m');
 for(let x=0;x<8;x++){const top=H-((txHash(x,H,5)*5)|0)-(x>4?3:0);for(let y=3;y<top;y++){let k=cols[x];if(y%7===2)k=x>5?'o':'n';if(y===top-1)k=snow?'r':'l';P.p(x0-4+x,y0-y,k)}}
 txEll(P,x0+11,y0+2,3.4,2.4,'l','m','o',0);P.p(x0+10,y0+1,'n');
 for(let i=0;i<6;i++){const x=x0-5+((R()*5)|0),y=y0-2-((R()*H*.5)|0);if(P.g(x,y)){P.p(x,y,snow?'r':'B');P.p(x+1,y-1,snow?'q':'w')}}}
function txWall(P,R,x0,y0,snow){const hs=[];let hh=14+((R()*5)|0);for(let x=-11;x<=10;x++){if(((x+11)%5)===0&&x>-10)hh=Math.max(4,hh-((R()*6)|0)+(R()<.25?3:0));hs.push(Math.min(19,hh))}
 for(let x=-11;x<=10;x++){const b=y0+Math.floor(x/2)+1,H=hs[x+11];for(let y=0;y<H;y++){const row=(y/4)|0,ry=y%4,bx=(x+11+(row&1)*3)%6;let k=ry===3?'n':bx===0?'n':ry===2&&bx<4?'l':'m';if(x>8)k=k==='n'?'o':'n';if(txHash(x>>1,row,3)<.08)k='o';if(y===H-1)k=snow?'r':'l';P.p(x0+x,b-y,k)}
  P.p(x0+x,b-H,snow?'r':'l');if(x<10)P.p(x0+x+1,b-H-(x&1?0:1)+1,snow?'q':'m')}
 for(let i=0;i<7;i++){const x=-11+((R()*8)|0),y=((R()*9)|0),b=y0+Math.floor(x/2)+1;if(P.g(x0+x,b-y)){P.p(x0+x,b-y,snow?'r':'B');if(R()<.5)P.p(x0+x+1,b-y-1,snow?'q':'w')}}
 txEll(P,x0-9,y0+5,2.6,1.8,'l','m','o',0)}
function txCactus(P,R,x0,y0,H){const stem=(x,yb,yt,w)=>{for(let y=yb;y>=yt;y--)for(let i=0;i<w;i++){if(y===yt&&(i===0||i===w-1)&&w>2)continue;const e=i/(w-1||1);P.p(x+i,y,e<.2?'w':e<.45?'v':e<.8?'B':'7');if((yb-y)%3===1&&(i===0||i===w-1))P.p(x+(i?w:-1),y,'l')}};
 stem(x0-2,y0,y0-H,5);const a1=6+((R()*5)|0),a2=9+((R()*6)|0);
 for(let x=x0-7;x<x0-2;x++){P.p(x,y0-a1,'B');P.p(x,y0-a1-1,'v');P.p(x,y0-a1+1,'7')}stem(x0-9,y0-a1,y0-a1-6-((R()*4)|0),3);
 for(let x=x0+3;x<x0+8;x++){P.p(x,y0-a2,'B');P.p(x,y0-a2-1,'w');P.p(x,y0-a2+1,'7')}stem(x0+7,y0-a2,y0-a2-5-((R()*4)|0),3);
 P.p(x0,y0-H-1,'h');P.p(x0-1,y0-H,'g');P.p(x0+1,y0-H,'h')}
function txArch(P,R,x0,y0){for(let y=0;y<=30;y++)for(let x=-14;x<=13;x++){const topc=30-Math.max(0,Math.abs(x+.5)-8)*1.2-(txHash(x>>1,3,7)*2|0);if(y>topc)continue;const hx=(x+.5)/5.5,hy=(y)/19;if(hx*hx+Math.max(0,hy)*hy<1&&y<19)continue;
   let k='k';if(y>topc-3)k=x<6?'d':'c';else if(x<-11)k='c';else if(x>10)k='i';else if(x>=6&&x<8)k='c';else if(x>-8&&x<-5)k='j';else if(y<23&&y>16&&Math.abs(x)<7)k='i';else if(x>8)k='j';
   if(y%6===4&&k==='k'&&((x+y)&3))k='j';if(y%6===1&&k==='k'&&txHash(x,y,2)<.3)k='c';if(y<2)k=k==='i'?'i':'j';P.p(x0+x,y0+2-y,k)}}
function txSpire(P,R,x0,y0){const n=6,ws=[];let x=-10;for(let i=0;i<n;i++){const w=3+((R()*2)|0);ws.push([x,w,Math.round(34-Math.abs(i-2.4)*6.5-R()*4)]);x+=w}
 ws.sort((a,b)=>a[2]-b[2]);for(const c of ws){for(let y=0;y<c[2];y++)for(let i=0;i<c[1];i++){let k=i===0?'o':i===c[1]-1?'1':'G';if((y+c[0])%9===0&&i)k='1';if(y===c[2]-1)k=i<c[1]-1?'n':'o';if(y<3&&txHash(c[0]+i,y,5)<.35)k=y<1?'E':'g';P.p(x0+c[0]+i,y0+1+(Math.abs(c[0]+5)<6?1:0)-y,k)}}
 for(let i=0;i<4;i++)P.p(x0-8+((R()*16)|0),y0+2,R()<.5?'g':'f')}
function txStump(P,R,x0,y0){const sv=(R()*9)|0;for(let x=-7;x<=7;x++){const H=x<-6||x>6?3:x<-5||x>5?6:11+((txHash(x>>1,7,sv)*10)|0)+(x<0?5:0);for(let y=0;y<H;y++){let k=x<-3?'o':x>2?'1':'G';if(y===H-1)k=x<0?'n':'o';if((x+7)%4===3&&y%5)k='1';if(txHash(x,y,9)<.1)k='1';if(txHash(x,y,13)<.07&&y>1)k=txHash(x,y,2)<.5?'E':'g';P.p(x0+x,y0+1-y,k)}}
 P.p(x0-8,y0+1,'G');P.p(x0-9,y0+2,'G');P.p(x0+8,y0+1,'1');P.p(x0+9,y0+2,'1');P.p(x0-1,y0+2,'G');P.p(x0+2,y0+2,'1');
}
/* kinds per biome: [weight, name]; ruins appear occasionally in every natural biome */
const TXPK={plains:[[4,'leafy'],[2,'leafy2'],[3,'boulder'],[1,'col'],[1,'wall']],forest:[[5,'pine'],[3,'pines'],[2,'leafy'],[1,'col']],hills:[[4,'boulder'],[3,'stack'],[2,'pine'],[1,'wall'],[1,'col']],
 swamp:[[4,'willow'],[3,'dead'],[1,'boulder'],[1,'wall']],desert:[[3,'cactus'],[3,'stack'],[2,'arch'],[2,'boulder'],[1,'col']],snow:[[5,'pine'],[3,'pines'],[2,'boulder'],[1,'col']],
 ashen:[[4,'stump'],[4,'spire'],[3,'dead']],hollow:[[5,'crystal'],[3,'monolith'],[2,'crystal2']],glass:[[5,'crystal'],[3,'crystal2'],[2,'fan']]};
/* ---- the East (19-east.js): when the battle is fought on eastern ground (B.east) the obstacles are eastern: cherry and pine trees,
   bamboo, stone lanterns (toro), torii gates; rocks stay rocks ---- */
const TXPKE={plains:[[4,'sakura'],[2,'boulder'],[2,'toro'],[1,'torii'],[2,'jpine']],forest:[[4,'jpine'],[3,'bamboo'],[2,'sakura'],[1,'toro']],hills:[[3,'boulder'],[3,'jpine'],[1,'toro'],[1,'torii'],[1,'sakura']],
 swamp:[[4,'bamboo'],[2,'willow'],[1,'toro']],desert:[[3,'boulder'],[2,'jpine'],[1,'toro'],[1,'torii']],snow:[[4,'jpine'],[2,'boulder'],[1,'toro']]};
function txEastOn(){return typeof B==='object'&&!!B&&!!B.east}
function txSakura(P,R,v){txLeafy(P,R,0,1,{tH:9+v,lean:v===1?.3:v===2?-.2:.1,n:7,rx:12,ry:8,cr:6,thick:1,C:{hi:'r',mid:'h',lo:'g',dk:'f',sp:'l'}});for(let i=0;i<9;i++){const x=Math.round((R()-.5)*26),y=Math.round(1+(R()-.5)*6);P.p(x,y,R()<.5?'h':'r')}}
function txJPine(P,R,v){const lean=v===1?-1:1;for(let y=0;y<16;y++){const b=Math.round(lean*y*y/40);P.p(b-1,1-y,'j');P.p(b,1-y,'i');P.p(b+1,1-y,'a')}P.p(-2,1,'i');P.p(2,1,'a');
 const pads=[[-lean*6,-9,8,3],[lean*7,-15,7,3],[-lean*2,-21,8,3.4],[lean*3,-27,5,2.6]];for(const [dx,dy,rx,ry] of pads){const bx=Math.round(lean*(-dy)*(-dy)/40);P.line(bx,dy+2,bx+dx,dy+1,'i');txEll(P,bx+dx,dy,rx,ry,'A','B','7',.45)}
 for(const [dx,dy,rx] of pads){const bx=Math.round(lean*(-dy)*(-dy)/40);for(let x=-rx+1;x<rx;x++)if(P.g(bx+dx+x,dy+Math.round(2))&&((x+dy)&1))P.p(bx+dx+x,dy+2,'3')}}
function txBamboo(P,R,v){const n=4+v;for(let i=0;i<n;i++){const x=Math.round((i-(n-1)/2)*4+(R()-.5)*2),H=26+((R()*14)|0),lean=(R()-.5)*.12;
  for(let y=0;y<H;y++){const b=Math.round(lean*y),nd=(y+i*3)%7===0;P.p(x+b,1-y,nd?'B':'v');P.p(x+b+1,1-y,nd?'7':'w')}
  for(let k=0;k<3;k++){const y=1-H+4+k*7,b=Math.round(lean*(H-4-k*7)),d=k&1?1:-1;for(let j=0;j<4;j++)P.p(x+b+d*(2+j),y+(j>>1),j<2?'A':'B')}}}
function txToro(P,R,v){const S=['q','p','o'];for(let x=-5;x<=5;x++){P.p(x,1,x<0?'p':'o');P.p(x,0,x<-2?'q':x>2?'o':'p')}for(let y=-1;y>=-9;y--){P.p(-1,y,'q');P.p(0,y,'p');P.p(1,y,'o')}
 for(let x=-4;x<=4;x++)P.p(x,-10,x<0?'q':'p');for(let y=-11;y>=-15;y--){P.p(-4,y,'p');P.p(4,y,'o');for(let x=-3;x<=3;x++)P.p(x,y,(y===-13||y===-12)&&Math.abs(x)<=1?'y':'G')}P.p(0,-13,'e');
 for(let j=0;j<4;j++){const w=6-j;for(let x=-w;x<=w;x++)P.p(x,-16-j,j===0?(x<0?'p':'o'):x<-1?'q':'p')}P.p(-7,-15,'p');P.p(7,-15,'o');P.p(0,-20,'q');P.p(0,-21,'p');void S;if(v===2){txEll(P,7,0,4,2,'w','B','7',.5)}}
function txToriiB(P,R,v){for(let y=0;y<26;y++){P.p(-9,1-y,'g');P.p(-8,1-y,'f');P.p(8,1-y,'g');P.p(9,1-y,'f')}for(let x=-12;x<=12;x++){P.p(x,-19,x<0?'g':'f');P.p(x,-18,'f')}
 for(let x=-15;x<=15;x++){P.p(x,-25,'G');P.p(x,-24,'0')}P.p(-16,-26,'G');P.p(16,-26,'G');P.p(-15,-26,'G');P.p(15,-26,'G');for(let x=-13;x<=13;x++)P.p(x,-23,x<0?'g':'f');P.p(0,-22,'c');P.p(0,-21,'c');
 P.p(-10,1,'o');P.p(-7,1,'o');P.p(7,1,'o');P.p(10,1,'o')}
const TXPC=new Map();
function txPropId(bk,c,r){const L=TXPK[bk]||TXPK.plains;let tot=0;for(const a of L)tot+=a[0];let q=txHash(c,r,77)*tot,kind=L[0][1];for(const a of L){if(q<a[0]){kind=a[1];break}q-=a[0]}return bk+'|'+kind+'|'+((txHash(c,r,91)*3)|0)}
function txProp(id){let S=TXPC.get(id);if(S)return S;const a=id.split('|'),bk=a[0],kind=a[1],v=+a[2],P=txBuf(TXPW,TXPH,TXPAX,TXPAY),R=mulberry(Math.imul(v+1,2654435761)^Math.imul(kind.length*7+kind.charCodeAt(0),40503)),gl=[];
 const snow=bk==='snow',pc=bk==='snow'?{lo:'3',mid:'7',hi:'4'}:bk==='hills'?{lo:'3',mid:'7',hi:'w'}:{lo:'3',mid:'7',hi:'B'};
 const rock=bk==='desert'?['d','c','k','j']:bk==='ashen'?['n','o','G','1']:bk==='swamp'?['n','o','4','3']:['q','p','o','G'];
 const cry=bk==='hollow'?{gl:'r',hi:'C',mid:'X',lo:'D',dk:'G'}:{gl:'r',hi:'6',mid:'F',lo:'5',dk:'7'};
 if(kind==='pine')txPine(P,R,0,1,32+v*4,9+(v&1),pc,snow);
 else if(kind==='pines'){txPine(P,R,5,-1,24+v*2,7,pc,snow);txPine(P,R,-5,3,30+v*3,8,pc,snow)}
 else if(kind==='leafy')txLeafy(P,R,0,1,{tH:10+v,lean:v===1?.25:0,n:7,rx:12,ry:9,cr:6,thick:1,C:bk==='forest'?{hi:'w',mid:'B',lo:'7',dk:'3',sp:'v'}:{hi:'v',mid:'B',lo:'7',sp:'A'},fruit:v===2?'g':0});
 else if(kind==='leafy2'){txLeafy(P,R,-4,2,{tH:7,lean:0,n:6,rx:9,ry:7,cr:5,C:{hi:'A',mid:'w',lo:'B',dk:'7',sp:'e'}});txEll(P,7,-1,5,3.6,'v','B','7',.5);P.p(6,-3,'A');if(v)P.p(9,-1,'h')}
 else if(kind==='willow')txLeafy(P,R,0,1,{tH:11+v,lean:v===1?-.2:.15,n:7,rx:13,ry:8,cr:6,thick:1,moss:1,C:{hi:'w',mid:'4',lo:'3',dk:'2',sp:'n'}});
 else if(kind==='dead')txDead(P,R,0,1,bk==='ashen'?['o','G','1']:['k','j','i'],bk==='ashen'?52:48,bk==='ashen');
 else if(kind==='boulder'){txBoulder(P,R,-1,-5,10+v,8+(v&1),rock,snow?['r','q']:bk==='plains'||bk==='swamp'?['w','B']:0);if(v!==1)txBoulder(P,R,9,1,4,3,rock,snow?['r','q']:0)}
 else if(kind==='stack'){txBoulder(P,R,0,-4,10,7,rock);txBoulder(P,R,-1+v,-14,7,6,rock);txBoulder(P,R,1-v,-23,5+(v&1),4,rock);if(bk==='desert')txBoulder(P,R,0,-30,7,3,rock)}
 else if(kind==='col')txColumn(P,R,0,1,18+v*5,snow);
 else if(kind==='wall')txWall(P,R,0,0,snow);
 else if(kind==='cactus')txCactus(P,R,0,1,24+v*3);
 else if(kind==='arch')txArch(P,R,0,1);
 else if(kind==='spire')txSpire(P,R,0,1);
 else if(kind==='stump')txStump(P,R,0,1);
 else if(kind==='crystal'){txBoulder(P,R,0,0,9,4,bk==='hollow'?['D','G','1','0']:['5','7','3','2']);txPrism(P,-7,-1,13+v*2,4,-4,cry);txPrism(P,7,0,15,5,4,cry);txPrism(P,-1,1,27+v*3,7,v-1,cry);txPrism(P,4,3,9,4,3,cry);txPrism(P,-5,3,7,3,-2,cry);gl.push([-1+v-1,-27-v*3],[9,-14],[-10,-13])}
 else if(kind==='crystal2'){txBoulder(P,R,0,1,10,4,bk==='hollow'?['D','G','1','0']:['5','7','3','2']);txPrism(P,-5,0,22+v*2,6,-3,cry);txPrism(P,4,1,30+v*2,6,2,cry);txPrism(P,9,2,11,4,5,cry);txPrism(P,-9,3,9,4,-4,cry);txPrism(P,0,4,6,3,0,cry);gl.push([5,-30-v*2],[-7,-21])}
 else if(kind==='fan'){for(let i=0;i<7;i++){const a=(i-3)/3;txBlade(P,Math.round(a*7),1+Math.round((1-Math.abs(a))*3)-1,Math.round(30-Math.abs(a)*14-(i&1)*4),3+(i===3?1:0),Math.round(a*9),'r','F','5','r')}txBoulder(P,R,0,2,9,3,['5','7','3','2']);gl.push([0,-28],[-9,-12])}
 else if(kind==='stakes')txStakes(P,R,v);
 else if(kind==='sakura')txSakura(P,R,v);else if(kind==='jpine')txJPine(P,R,v);else if(kind==='bamboo')txBamboo(P,R,v);else if(kind==='toro')txToro(P,R,v);else if(kind==='torii')txToriiB(P,R,v);
 else if(kind==='monolith'){for(let y=0;y<30;y++){const w=y<4?y+1:y>25?30-y+1:5;for(let x=-w;x<=w;x++){let k=x<-w+2?'D':x>w-2?'1':'G';if(y>7&&y<23&&(x===0||(Math.abs(x)===2&&y%5===0)||(y===15&&Math.abs(x)<4)))k=x===0&&y%4?'C':'r';P.p(x,-6-y,k)}}
  txPrism(P,-10,2,7,3,-2,cry);txPrism(P,9,3,9,4,2,cry);P.p(-9,-16,'C');P.p(10,-22,'C');P.p(-7,-27,'D');gl.push([0,-21],[9,-6])}
 txOutline(P);
 let x0=99,x1=-99,y0=99;for(let y=0;y<TXPH;y++)for(let x=0;x<TXPW;x++)if(P.d[y*TXPW+x]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y}
 S={id,P,cv:undefined,hcv:undefined,w:2*Math.max(TXPAX-x0,x1-TXPAX+1),h:TXPAY-y0+1,gl,ember:bk==='ashen'};TXPC.set(id,S);return S}
/* siege stakes (a 'block' tile with fort set, 16-contracts.js objFortify): sharpened posts in a bank of earth, lashed with a rail */
function txStakes(P,R,v){txEll(P,0,1,15,5,'k','j','i',.5);
 const N=5;for(let i=0;i<N;i++){const t=i/(N-1)*2-1,x0=Math.round(t*12),y0=Math.round(t*6)+1,H=15+((i*7+v*3)%4)*2-(i&1)*3,ln=i&1?1:-1;
  for(let y=0;y<H;y++){const b=Math.round(ln*y/14),x=x0+b,w=y>H-4?(y>H-2?0:1):1;P.p(x-w,y0-y,'k');if(w)P.p(x,y0-y,'j');if(w)P.p(x+w,y0-y,'i');if(y===H-1)P.p(x,y0-y,'l');if(y===H-3)P.p(x-1,y0-y,'c')}
  if(i&&i<N)P.line(x0-12,y0-6-Math.round(H*.45)+3,x0,y0-Math.round(H*.45)+2,'H')}
 for(let i=0;i<6;i++){const x=Math.round((R()-.5)*26),y=Math.round(3+(R()-.5)*5);P.p(x,y,'u')}}
const TXPL=new Map();
function txPropBox(bk,c,r){if(typeof B==='object'&&B&&B.tiles&&typeof key==='function'){const t=B.tiles[key(c,r)];if(t&&t.fort)return txProp('fort|stakes|'+((txHash(c,r,91)*3)|0))}if(!TXPK[bk])bk='plains';const e=txEastOn()&&TXPKE[bk]?1:0,k=((TXBI[bk]*128+(c&127))*128+(r&127))*2+e;let S=TXPL.get(k);if(!S){S=txProp(e?txPropIdE(bk,c,r):txPropId(bk,c,r));TXPL.set(k,S)}return S}
function txPropIdE(bk,c,r){const L=TXPKE[bk];let tot=0;for(const a of L)tot+=a[0];let q=txHash(c,r,77)*tot,kind=L[0][1];for(const a of L){if(q<a[0]){kind=a[1];break}q-=a[0]}return bk+'|'+kind+'|'+((txHash(c,r,91)*3)|0)}
function propBoxPx(bk,c,r){const S=txPropBox(bk,c,r);return{w:S.w,h:S.h}}
function drawPropPx(q,x,y,o){const S=txPropBox(o.bk,o.c|0,o.r|0);x=Math.round(x);y=Math.round(y);
 const hc=o.hd&&typeof txPropHD==='function'?txPropHD(S):null;   // 71p-propshd.js: the same prop at twice the resolution (o.hd: the caller draws at 2 px per art pixel)
 if(hc)q.drawImage(hc,x-TXPAX,y-TXPAY,TXPW,TXPH);else{if(S.cv===undefined)S.cv=txCv(S.P);if(!S.cv)return false;q.drawImage(S.cv,x-TXPAX,y-TXPAY)}
 if(S.gl.length&&!txRM()){const f=(o.frame|0)+((o.c*7+o.r*13)&15);for(let i=0;i<S.gl.length;i++){const t=(f+i*6)%18;if(t>2)continue;const gx=x+S.gl[i][0],gy=y+S.gl[i][1];q.fillStyle=PAL.r;
   if(hc){q.fillRect(gx,gy,.5,.5);if(t===1){q.globalAlpha=.7;q.fillRect(gx-1,gy,2.5,.5);q.fillRect(gx,gy-1,.5,2.5);q.globalAlpha=1}}
   else{q.fillRect(gx,gy,1,1);if(t===1){q.fillRect(gx-1,gy,3,1);q.fillRect(gx,gy-1,1,3)}}}return true}
 return false}

/* ================= BACKDROPS =================
   A static picture per (biome, time of day, size) is painted once into a palette buffer and cached; each call blits it and
   adds a handful of cheap moving bits (cloud sprites, twinkling stars, embers, motes, aurora frames). Horizon at ~45%. */
const TXTOD={day:null,
 dawn:{r:'e',q:'l',F:'h',x:'C',p:'n','6':'d'},
 dusk:{r:'h',q:'m',p:'n',l:'d',m:'k',A:'v',v:'w',w:'B',B:'7','5':'7','6':'5',x:'C',X:'D',F:'h',e:'d',d:'c',c:'k',n:'o',y:'c',k:'u',u:'K',K:'f'},
 night:{'1':'0','2':'1','3':'1','4':'2','5':'3','6':'7','7':'2',a:'1',b:'a',c:'i',d:'o',e:'n',f:'1',g:'f',h:'D',i:'1',j:'a',k:'i',l:'o',m:'G',n:'3',o:'2',p:'G',q:'o',r:'p',
  u:'a',v:'4',w:'3',A:'4',B:'2',x:'X',X:'G',y:'Y',Y:'a',K:'a',F:'X'}};
const TXSKY={
 day:{def:['X','X','x','x','x','F','F','l'],swamp:['7','7','5','5','n','n','m','l'],desert:['X','x','x','x','F','F','e','d'],snow:['X','x','x','F','F','q','q','r']},
 dawn:{def:['D','D','C','C','h','h','d','e'],swamp:['3','4','4','n','n','h','d','e'],snow:['D','D','C','C','h','q','l','e']},
 dusk:{def:['G','G','D','D','D','g','E','y'],swamp:['1','2','3','3','4','f','g','E'],desert:['G','D','D','f','g','g','E','y']},
 night:{def:['0','0','0','1','1','G','G','X'],swamp:['0','0','0','1','1','2','2','3']},
 ashen:['0','0','0','1','1','f','f','g'],hollow:['0','0','0','0','1','1','G','G','D'],glass:['0','0','0','1','1','2','3','7']};
function txTod(h){h=((+h||0)%24+24)%24;return h>=5&&h<8?'dawn':h>=8&&h<17.5?'day':h>=17.5&&h<20.5?'dusk':'night'}
/* vertical ordered-dither gradient between palette keys ('' keeps what is there) */
function txGrad(S,x0,x1,y0,y1,cols){const n=cols.length-1;for(let y=Math.max(0,y0|0);y<Math.min(S.h,y1);y++){const t=Math.min(.9999,Math.max(0,(y-y0)/(y1-y0)))*n,i=t|0,fr=Math.min(1,Math.max(0,(t-i-.2)/.6));
  const ka=cols[i],kb=cols[i+1],a=ka?TXI[(S.map&&S.map[ka])||ka]||0:-1,b=kb?TXI[(S.map&&S.map[kb])||kb]||0:-1,o=y*S.w,xa=Math.max(0,x0),xb=Math.min(S.w,x1);
  for(let x=xa;x<xb;x++){const k=fr>TXBAY[(x&3)+(y&3)*4]/16+.03?b:a;if(k>=0)S.d[o+x]=k}}}
/* silhouette profiles (height above the base line per column) */
function txProf(w,seed,kind,amp,U,Z){Z=Z||1;const R=mulberry(seed),a=new Float32Array(w+2);
 if(kind==='ridge'){let x=-((R()*20*U)|0),y=amp*R();while(x<w+2){const nx=x+Math.round((7+R()*16)*U),ny=amp*(.25+R()*.75),mx=x+Math.round((nx-x)*(.35+R()*.3)),my=Math.min(y,ny)*(.25+R()*.5);
   for(let i=Math.max(0,x);i<=Math.min(w+1,nx);i++)a[i]=i<mx?y+(my-y)*(i-x)/(mx-x||1):my+(ny-my)*(i-mx)/(nx-mx||1);x=nx;y=ny}}
 else if(kind==='mesa'){let x=-((R()*20*U)|0);while(x<w+2){const len=Math.round((10+R()*34)*U),hh=R()<.4?amp*.12*R():amp*(.45+R()*.55),st=R()<.5?amp*.25:0;
   for(let i=Math.max(0,x);i<Math.min(w+2,x+len);i++){const e=Math.min(i-x,x+len-1-i);a[i]=e<2*U?hh*.55:e<5*U&&st?hh-st:hh}x+=len+Math.round(R()*8*U)}}
 else if(kind==='spire'){for(let i=0;i<w+2;i++)a[i]=amp*.08*(1+Math.sin(i/(9*U)+seed));let x=(R()*10*U)|0;while(x<w+2){const hw=(1.5+R()*4)*U,hh=amp*(.25+R()*R()*.9);for(let i=Math.max(0,Math.floor(x-hw));i<=Math.min(w+1,x+hw);i++)a[i]=Math.max(a[i],hh*(1-Math.abs(i-x)/hw));x+=Math.round((5+R()*26)*U)}}
 else{const p1=R()*9,p2=R()*9,p3=R()*9,f=1/(kind==='dune'?26:38)/U;for(let i=0;i<w+2;i++)a[i]=amp*(.5+.3*Math.sin(i*f+p1)+.14*Math.sin(i*f*2.3+p2)+.06*Math.sin(i*f*5.1+p3));
  if(kind==='pines'||kind==='trees'||kind==='dead'){const b0=a.slice();let x=(R()*4)|0;while(x<w+2){const pin=kind==='pines',hh=(pin?4+R()*7:kind==='dead'?5+R()*6:3+R()*4)*U,hw=pin?Math.max(1.5*Z,hh*.34):kind==='dead'?.6*Z:hh*.9;
    for(let i=Math.max(0,Math.floor(x-hw));i<=Math.min(w+1,x+hw);i++){const e=Math.min(1,Math.abs(i-x)/hw);a[i]=Math.max(a[i],b0[Math.min(w+1,x)]+(pin?hh*(1-e):kind==='dead'?hh:hh*Math.sqrt(1-e*e)))}x+=Math.round(kind==='dead'?(8+R()*30)*U:pin?(2+R()*4)*U:(3+R()*5)*U)}}}
 return a}
/* paint a layer from its silhouette down to the bottom. o: {body, rim, lit, shade, snow:[lit,shade,line]} */
function txLayer(S,prof,base,o){const w=S.w,h=S.h,Z=o.Z||1,fade=(o.fade||0)*Z,rw=(o.rimw||1)*Z,bd=(o.band||0)*Z,D=S.d,ix=k=>{const m=S.map&&S.map[k];return TXI[m||k]||0};   // writes palette indices straight into the buffer (as S.p would)
 const Kb=ix(o.body),Kl=o.lit?ix(o.lit):0,Ks=o.lit?ix(o.shade):0,Kr=o.rim?ix(o.rim):0,Kc=bd?ix(o.bandc):0,Ks0=o.snow?ix(o.snow[0]):0,Ks1=o.snow?ix(o.snow[1]):0;
 for(let x=0;x<w;x++){const top=Math.round(base-prof[x]),sl=o.snow?o.snow[2]+2*Z*Math.sin(x*.7/Z):0;for(let y=Math.max(0,top);y<h;y++){const d=y-top;let k=Kb;
   if(Kl){const xs=Math.max(1,Math.min(w-1,Math.round(x-d*.55))),lit=prof[xs+1]>=prof[xs-1];k=lit?Kl:Ks;if(d>fade&&((x+y)&1||d>fade*1.6))k=Kb;
    if(o.snow&&prof[x]-d>sl)k=lit?Ks0:Ks1}
   else if(Kr&&d<rw)k=Kr;else if(o.rim2&&d<rw+2*Z&&((x+y)&1))k=Kr;
   if(bd&&d>Z&&(d%bd<Z)&&txHash((x/Z|0)>>2,d/Z|0,3)<.8)k=Kc;
   D[y*w+x]=k}}}
function txDisc(S,cx,cy,r,fn){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const q=x*x+y*y;if(q<=r*r+r*.6){const k=fn(x,y,Math.sqrt(q)/r);if(k)S.p(cx+x,cy+y,k)}}}
function txCloudBuf(R,U,cols){const n=3+((R()*3)|0),L=[];let x=4*U,mh=0;for(let i=0;i<n;i++){const r=(2.5+R()*3.5)*U*(i===0||i===n-1?.7:1);L.push([x+r,r]);x+=r*1.25;mh=Math.max(mh,r)}
 const w=Math.ceil(x+8*U),h=Math.ceil(mh*1.5)+2,P=txBuf(w,h,0,0),base=h-1;
 for(let px2=0;px2<w;px2++){let top=base+1;for(const c of L){const dx=px2-c[0];if(Math.abs(dx)<=c[1])top=Math.min(top,base-Math.sqrt(c[1]*c[1]-dx*dx)*1.25)}const e=Math.min(px2,w-1-px2);if(e<4*U&&top>base-1&&e>=1)top=base-1;
  for(let y=Math.round(top);y<=base;y++){if(y<0)continue;P.p(px2,y,y>=base-Math.max(1,U|0)?cols[2]:y<=Math.round(top)+((px2>>1)&1)?cols[0]:cols[1])}}
 return P}
const TXBD={key:'',st:null};
const TXSCN={
 plains:[['ridge',.05,.11,{lit:'q',shade:'p',body:'p',fade:9,snow:['r','q',.085]},11],['hill',.0,.05,{body:'5',rim:'6'},12],['trees',-.045,.04,{body:'B',rim:'w'},13],['hill',-.11,.05,{body:'7',rim:'B'},14],['trees',-.2,.05,{body:'3',rim:'7'},15],['hill',-.31,.05,{body:'2',rim:'3'},16]],
 forest:[['ridge',.04,.09,{lit:'n',shade:'4',body:'4',fade:8},21],['pines',.0,.04,{body:'5',rim:'6'},22],['pines',-.05,.05,{body:'7',rim:'5'},23],['pines',-.13,.06,{body:'3',rim:'7'},24],['pines',-.24,.07,{body:'2',rim:'3'},25],['hill',-.36,.04,{body:'1',rim:'2'},26]],
 hills:[['ridge',.05,.2,{lit:'q',shade:'p',body:'p',fade:14,snow:['r','q',.15]},31],['ridge',.0,.12,{lit:'n',shade:'o',body:'o',fade:10},32],['hill',-.07,.06,{body:'w',rim:'v'},33],['hill',-.15,.06,{body:'7',rim:'w'},34],['pines',-.25,.05,{body:'3',rim:'7'},35],['hill',-.36,.04,{body:'2',rim:'3'},36]],
 swamp:[['trees',.0,.035,{body:'n',rim:'m'},41],['dead',-.02,.03,{body:'4',rim:'n'},42],['trees',-.07,.04,{body:'4',rim:'7'},43],['hill',-.13,.03,{body:'7',rim:'5',rimw:1},44],['dead',-.2,.04,{body:'3',rim:'4'},45],['trees',-.3,.05,{body:'2',rim:'3'},46]],
 desert:[['mesa',.03,.12,{body:'h',rim:'s',band:5,bandc:'g'},51],['mesa',.0,.08,{body:'u',rim:'k',band:4,bandc:'K'},52],['dune',-.05,.05,{body:'c',rim:'d',rimw:2},53],['dune',-.13,.06,{body:'k',rim:'c',rimw:1},54],['dune',-.23,.06,{body:'b',rim:'k'},55],['dune',-.34,.05,{body:'a',rim:'b'},56]],
 snow:[['ridge',.05,.22,{lit:'r',shade:'q',body:'q',fade:16,snow:['r','q',.0]},61],['ridge',.0,.11,{lit:'q',shade:'p',body:'p',fade:10},62],['pines',-.05,.04,{body:'p',rim:'q'},63],['hill',-.12,.05,{body:'q',rim:'r',rimw:2},64],['pines',-.2,.06,{body:'o',rim:'p'},65],['hill',-.31,.05,{body:'G',rim:'o'},66]],
 ashen:[['ridge',.04,.2,{lit:'G',shade:'1',body:'1',fade:12},71],['ridge',-.02,.1,{lit:'f',shade:'1',body:'1',fade:5},72],['spire',-.1,.1,{body:'1',rim:'G'},73],['hill',-.22,.05,{body:'0',rim:'f'},74]],
 hollow:[],
 glass:[['spire',.02,.2,{body:'3',rim:'7',rimw:1},81],['spire',-.03,.3,{body:'2',rim:'5',rimw:1},82],['spire',-.14,.16,{body:'1',rim:'3'},83],['hill',-.27,.04,{body:'0',rim:'2'},84]]};
function txBackdropBuild(bk,tod,w,h,hq,east,Z){Z=Z||1;const realm=bk==='ashen'||bk==='hollow'||bk==='glass',S=txBuf(w,h,0,0),U=Math.max(Z,h/180),H0=Math.round(h*.45),R=mulberry(TXBI[bk]*977+13),st={tw:[],cl:[],pt:[],mid:null,front:null,back:null,w,h,realm,bk,H0,U,Z};
 const sky=realm?TXSKY[bk]:(TXSKY[tod][bk]||TXSKY[tod].def);txGrad(S,0,w,0,H0+2*U,sky);
 /* stars */
 if(tod==='night'||bk==='hollow'||bk==='glass'||bk==='ashen'){const n=Math.round(w*H0/(bk==='ashen'?2600:bk==='hollow'?260:420)/(Z*Z));for(let i=0;i<n;i++){const x=(R()*w)|0,y=(R()*R()*H0*.95)|0,b=R();if(Z>1&&b<.3){const k=bk==='ashen'?'f':b<.12?'r':bk==='hollow'?'C':'q';S.p(x+1,y,k);S.p(x,y+1,k);S.p(x+1,y+1,k)}S.p(x,y,bk==='ashen'?'f':b<.12?'r':b<.45?(bk==='hollow'?'C':'q'):bk==='hollow'?'D':'o');if(b<.12&&st.tw.length<14)st.tw.push([x,y])}}
 /* sun / moon */
 if(!realm){const day=hq>=6&&hq<18.5,t=day?(hq-6)/12.5:((hq+24-18.5)%24)/11.5,cx=Math.round(w*(.1+.8*t)),cy=Math.round(H0*(.86-Math.sin(Math.PI*t)*.68)),r=Math.round(6*U);
  if(day){const c=tod==='day'?['r','e','d']:tod==='dawn'?['e','d','y']:['e','y','E'];txDisc(S,cx,cy,r+3*U|0,(x,y,q)=>q>r/(r+3*U)&&((x+y)&1)?(tod==='day'?(bk==='swamp'?'m':'F'):c[2]):'');txDisc(S,cx,cy,r,(x,y,q)=>q<.55?c[0]:q<.86?c[1]:c[2])}
  else{txDisc(S,cx,cy,r,(x,y,q)=>{const dx=x-r*.55,dy=y+r*.25;return dx*dx+dy*dy<r*r*.9?'':q>.8?'m':(txHash(x>>1,y>>1,3)<.18?'m':'l')})}}
 else if(bk==='ashen'){const cx=Math.round(w*.52),cy=Math.round(H0*.5),r=Math.round(h*.13);   // the broken sun
  txDisc(S,cx,cy,r+4*U|0,(x,y,q)=>((x+y)&1)&&q>.8?'f':'');
  txDisc(S,cx,cy,r,(x,y,q)=>{const cr=Math.abs(x*.9+y*.5+Math.sin(y*.4)*3*U)<1.6*U||Math.abs(x*.3-y+r*.3+Math.sin(x*.3)*2*U)<1.1*U&&x>0;if(cr)return'0';const g2=x-y*.6>r*.35;if(g2&&x*.9+y*.5>0)return'';return q<.45?(TXBAY[(x&3)+(y&3)*4]<8?'y':'E'):q<.75?'E':q<.92?'g':'f'});
  for(let i=0;i<7;i++){const a=-.9+i*.22,d=r*(1.05+txHash(i,3,1)*.55),fx=Math.round(cx+Math.cos(a)*d),fy=Math.round(cy+Math.sin(a)*d),fr=Math.max(1,Math.round((1+txHash(i,5,2)*3)*U));txDisc(S,fx,fy,fr,(x,y,q)=>x+y>fr*.7?'':q<.5?'E':'g')}
  for(let b=0;b<3;b++){const y0=cy-r*.5+b*r*.55|0;for(let x=cx-r*2.2|0;x<cx+r*2.2;x++){const t2=Math.abs(x-cx)/(r*2.2),th=Math.round((1-t2*t2)*1.6*U+Math.sin(x*.21+b)*U);for(let y=0;y<th;y++)if((x+y+b)&1||y>0)S.p(x,y0+y+Math.round(Math.sin(x*.07+b*2)*2*U),b===1?'1':'0')}}}
 else if(bk==='hollow'){const cx=Math.round(w*.66),cy=Math.round(H0*.48),r=Math.round(h*.085),rx=Math.round(r*2.5),ry=r*.62,tilt=-.22;   // dark orb and its ring
  const ring=(front)=>{for(let y=-rx;y<=rx;y++)for(let x=-rx-2;x<=rx+2;x++){const xr=x*Math.cos(tilt)-y*Math.sin(tilt),yr=x*Math.sin(tilt)+y*Math.cos(tilt),q=Math.sqrt(xr*xr/(rx*rx)+yr*yr/(ry*ry));if(q>1||q<.66)continue;if((yr>0)!==front)continue;
     const band=q>.93?'D':q>.84?'C':q>.8?'G':q>.7?'C':'D';if(front||((x+y)&1))S.p(cx+x,cy+y,front&&band==='C'&&q>.84&&q<.9?'r':band)}};
  ring(false);txDisc(S,cx,cy,r+2*U|0,(x,y,q)=>q>r/(r+2*U)?(((x+y)&1)?'C':''):'');txDisc(S,cx,cy,r,(x,y,q)=>q>.9?(x+y<0?'C':'D'):q>.78&&x+y<-r*.5?'D':'0');ring(true);
  for(let i=0;i<9;i++){const ix=Math.round(w*(.03+i*.115+txHash(i,1,9)*.06)),iy=Math.round(H0*(.7+txHash(i,2,9)*.75)),iw=Math.round((6+txHash(i,3,9)*15)*U);   // floating isles
   for(let x=-iw;x<=iw;x++){const t2=x/iw,xz=Math.floor(x/Z),up=Math.round((1-t2*t2)*2*U+txHash(xz+i*40,1,2)*1.5*Z),dn=Math.round((1-Math.abs(t2))*(1-Math.abs(t2))*iw*1.3+txHash((xz>>1)+i*40,2,2)*2*U);for(let y=-up;y<=dn;y++)S.p(ix+x,iy+y,y<=-up+1?(i%2?'D':'C'):y<1?'G':x<0&&y<dn*.5?'G':'1')}
   if(i%2===0)txPrismS(S,ix+Math.round(iw*.3),iy-2*U,Math.round(6*U),Math.max(2,Math.round(1.5*U)))}
  txGrad(S,0,w,H0+2*U,h,['D','G','G','1','0','0','0','0','0'])}
 /* scenery layers */
 S.map=realm?null:TXTOD[tod];
 for(const L of TXSCN[bk]||[])txLayer(S,txProf(w,L[4]*7919,L[0],L[2]*h,U,Z),H0-L[1]*h,Object.assign({Z},L[3],L[3].snow?{snow:[L[3].snow[0],L[3].snow[1],L[3].snow[2]*h]}:null));
 if(east)txEastSkyline(S,bk,w,h,H0,U);
 S.map=null;
 if(bk==='ashen'){for(let i=0;i<Math.round(w/16/Z);i++){let x=(R()*w)|0,y=H0+((R()*h*.2)|0)-(h*.03|0);const n=(4+R()*10)*U|0;for(let j=0;j<n;j++){S.p(x,y,j<2*Z?'E':R()<.5?'g':'f');y++;if(R()<.5/Z)x+=R()<.5?1:-1}}}
 if(bk==='glass'){for(let i=0;i<Math.round(w/9/Z);i++){const x=(R()*w)|0,y=H0-((R()*h*.2)|0)+(h*.08|0);if(S.g(x,y)&&S.g(x,y)!=='0')S.p(x,y,R()<.3?'r':'6')}}
 if(bk!=='hollow')txGrad(S,0,w,Math.round(h*.7),h,['','','1','0','0']);
 if(bk==='swamp'){S.map=TXTOD[tod];for(let b=0;b<3;b++){const y0=H0+Math.round((-.01+b*.075)*h);for(let x=0;x<w;x++){const th=Math.round((1.2+Math.sin(x/(17*U)+b*2)+Math.sin(x/(7*U)+b))*U);for(let y=0;y<th;y++)if(((x+y)&1)||y===0&&th>1)S.p(x,y0+y,b?'4':'n')}}S.map=null}
 st.back=txCv(S);
 /* clouds (drifting sprites) */
 if(!realm){const cc=tod==='day'?(bk==='swamp'?['l','m','n']:['r','q','p']):tod==='dawn'?['e','h','C']:tod==='dusk'?['h','g','f']:['o','G','1'],n=bk==='desert'?2:bk==='snow'?6:bk==='swamp'?5:4;
  for(let i=0;i<n;i++){const P=txCloudBuf(R,U*(.7+R()*.6),cc);st.cl.push({cv:txCv(P),w:P.w,x:R()*w,y:Math.round(H0*(.12+R()*.6))-P.h,v:(.03+R()*.05)*Z})}}
 /* particles: embers fall (ashen), motes drift up (hollow), snowflakes (snow) */
 const np=Math.round((bk==='ashen'?w*h/2600:bk==='hollow'?w*h/3600:bk==='snow'?w*h/3000:bk==='glass'?w*h/9000:0)/(Z*Z));
 for(let i=0;i<np;i++)st.pt.push([R()*w,R()*h,.25+R()*.6,R()*6.28,R()]);
 /* aurora frames (glass) */
 if(bk==='glass'){st.mid=[];const ah=Math.round(H0*.95);for(let f=0;f<4;f++){const A=txBuf(w,ah,0,0);for(let b=0;b<3;b++){const p1=b*2.1+f*.35,by=ah*(.34+b*.2);
    for(let x=0;x<w;x++){const base=Math.round(by+Math.sin(x/(34*U)+p1)*7*U+Math.sin(x/(13*U)+p1*1.7+f*.4)*3*U),xz=Math.floor(x/Z),len=Math.round((10+5*Math.sin(x/(9*U)+b+f*1.3)+6*Math.sin(x/(21*U)+b*3))*U*(1.3-b*.25)*(.45+.9*(txHash(xz,b,3)*.6+txHash(xz>>1,b,5)*.4)));
     for(let d=0;d<len;d++){const q=d/len,y=base-d,bay=TXBAY[(x&3)+(y&3)*4]/16;const k=q<.12?'6':q<.3?(bay<.6?'z':'6'):q<.55?(bay<.55?'Z':'z'):q<.8?(bay<.4?'Z':''):bay<.18?'7':'';if(k)A.p(x,y,b===1&&k==='Z'?'5':k)}}}
   st.mid.push(txCvRows(A))}
  /* spires must stay in front of the aurora: repaint them into a transparent front layer */
  const Fb=txBuf(w,h,0,0);for(const L of TXSCN.glass)txLayer(Fb,txProf(w,L[4]*7919,L[0],L[2]*h,U,Z),H0-L[1]*h,Object.assign({Z},L[3]));
  for(let i=0;i<w*h;i++)if(Fb.d[i])Fb.d[i]=S.d[i];st.front=txCvRows(Fb)}
 return st}
/* the East on the horizon: a castle keep and a pagoda in the colours of the second scenery layer, standing on it */
function txEastSkyline(S,bk,w,h,H0,U){const L=TXSCN[bk]&&TXSCN[bk][1];if(!L)return;const body=L[3].body,rim=L[3].rim||L[3].lit||body,base=Math.round(H0-L[1]*h);
 const roof=(cx,y,hw,th)=>{for(let j=0;j<th;j++){const t=(j+1)/th,ww=Math.round(hw*(.3+.7*t*t));for(let i=-ww;i<=ww;i++)S.p(cx+i,y-th+1+j,j===0?rim:body)}S.p(cx-hw-1,y-1,body);S.p(cx+hw+1,y-1,body)};
 const block=(cx,y,hw,hh)=>{for(let j=0;j<hh;j++)for(let i=-hw;i<=hw;i++)S.p(cx+i,y-j,body)};
 // the pagoda
 {const cx=Math.round(w*.18),u=Math.max(1,Math.round(U));let y=base+2*u;for(let k=0;k<5;k++){const hw=(6-k)*u;block(cx,y,hw-2*u,3*u);y-=3*u;roof(cx,y,hw,2*u);y-=2*u}for(let j=0;j<6*u;j++)S.p(cx,y-j,body)}
 // the castle on its stone base
 {const cx=Math.round(w*.78),u=Math.max(1,Math.round(U));let y=base+3*u;for(let j=0;j<6*u;j++){const hw=Math.round((16-j*.5/u)*u);for(let i=-hw;i<=hw;i++)S.p(cx+i,y-j,body)}y-=6*u;
  for(let k=0;k<3;k++){const hw=(11-k*3)*u;block(cx,y,hw-u,4*u);y-=4*u;roof(cx,y,hw+2*u,3*u);y-=3*u}S.p(cx-2*u,y,rim);S.p(cx+2*u,y,rim)}}
/* a canvas of only the rows of P that hold anything, and the row it starts at */
function txCvRows(P){const w=P.w,d=P.d;let y0=0,y1=P.h-1;while(y0<=y1&&!d.subarray(y0*w,y0*w+w).some(v=>v))y0++;while(y1>=y0&&!d.subarray(y1*w,y1*w+w).some(v=>v))y1--;
 if(y1<y0)return{cv:null,y:0};const Q=txBuf(w,y1-y0+1,0,0);Q.d.set(d.subarray(y0*w,(y1+1)*w));return{cv:txCv(Q),y:y0}}
function txPrismS(S,x,y,hg,w){for(let d=0;d<hg;d++){const ww=Math.max(1,Math.round(w*(1-d/hg)));for(let i=-ww;i<=ww;i++)S.p(x+i,y-d,i<0?'C':i===0?'r':'D')}}
function drawBackdropPx(q,w,h,o){w=Math.max(8,w|0);h=Math.max(8,h|0);const bk=TXM[o.bk]?o.bk:'plains',realm=bk==='ashen'||bk==='hollow'||bk==='glass',hour=((+o.hour||0)%24+24)%24,tod=realm?'realm':txTod(hour),hq=realm?0:Math.round(hour*2)/2,east=!realm&&(o.east!=null?!!o.east:txEastOn()),Z=o.hd>1?2:1,key=bk+'|'+tod+'|'+hq+'|'+w+'|'+h+(east?'|E':'')+'|'+Z;
 if(TXBD.key!==key){TXBD.key=key;TXBD.st=txBackdropBuild(bk,tod,w,h,hq,east,Z)}
 const st=TXBD.st;if(!st||!st.back)return false;const f=txRM()?0:(o.frame|0),U=st.U;q.drawImage(st.back,0,0);
 if(st.mid){const m=st.mid[(f>>2)&3];if(m.cv)q.drawImage(m.cv,0,m.y);if(st.front&&st.front.cv)q.drawImage(st.front.cv,0,st.front.y)}
 for(const c of st.cl){const x=((c.x+f*c.v)%(w+c.w*2))-c.w;q.drawImage(c.cv,Math.round(x),c.y)}
 for(let i=0;i<st.tw.length;i++){const t=(f+i*5)%23;if(t<3){const s=st.tw[i];q.fillStyle=PAL[t===1?'r':'q'];q.fillRect(s[0],s[1],Z,Z);if(t===1){q.fillRect(s[0]-Z,s[1],3*Z,Z);q.fillRect(s[0],s[1]-Z,Z,3*Z);if(Z>1){q.fillRect(s[0]-2*Z,s[1]+.5*Z,5*Z,1);q.fillRect(s[0]+.5*Z,s[1]-2*Z,1,5*Z)}}}}
 if(st.pt.length){const P=st.pt,sz=U>=2*Z?2*Z:Z;
  if(bk==='ashen')for(let i=0;i<P.length;i++){const p=P[i],y=(p[1]+f*p[2]*1.2*Z)%h,x=(p[0]+Math.sin(f*.11+p[3])*4*U+f*.15*Z+w)%w;q.fillStyle=PAL[p[4]<.2?'y':p[4]<.6?'E':'g'];q.fillRect(x|0,y|0,p[4]<.3?sz:Z,p[4]<.3?sz:Z)}
  else if(bk==='hollow')for(let i=0;i<P.length;i++){const p=P[i],y=((p[1]-f*p[2]*.45*Z)%h+h)%h,x=(p[0]+Math.sin(f*.07+p[3])*6*U+w)%w;q.fillStyle=PAL[p[4]<.25?'r':p[4]<.7?'C':'D'];q.fillRect(x|0,y|0,p[4]<.25?Z:1,p[4]<.25?Z:1)}
  else if(bk==='snow')for(let i=0;i<P.length;i++){const p=P[i],y=(p[1]+f*p[2]*1.6*Z)%h,x=((p[0]+Math.sin(f*.09+p[3])*5*U-f*.3*Z)%w+w)%w;q.fillStyle=PAL[p[4]<.5?'r':'q'];q.fillRect(x|0,y|0,p[4]<.5?Z:1,p[4]<.5?Z:1)}
  else for(let i=0;i<P.length;i++){const p=P[i];if(((f+i*3)%16)<3){q.fillStyle=PAL.r;q.fillRect(p[0]|0,(p[1]*.6)|0,Z,Z)}}}
 return true}

/* ================= SCENE TINT =================
   Lighting over tiles and units: lerp(white, mul, a) multiplied, then `add` added at alpha a. Night stays readable (no channel
   below ~45%). Realms have a fixed colour cast. */
function txLerpHex(a,b,t){const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16),m=(s)=>Math.round((x>>s&255)+((y>>s&255)-(x>>s&255))*t);return'#'+((1<<24)|m(16)<<16|m(8)<<8|m(0)).toString(16).slice(1)}
const TXTINT={ashen:{mul:'#ffbfa6',add:'#1e0600',a:.5},hollow:{mul:'#b9a8f6',add:'#0a0420',a:.55},glass:{mul:'#b4ecf0',add:'#001216',a:.45}};
function sceneTint(bk,hour){const T=TXTINT[bk];if(T)return{mul:T.mul,add:T.add,a:T.a};const h=((+hour||0)%24+24)%24;
 const n=h<4.5||h>=20.5?1:h<6.5?(6.5-h)/2:h>18.5?(h-18.5)/2:0,wd=Math.max(0,1-Math.abs(h-18.6)/1.9),wm=Math.max(0,1-Math.abs(h-6.4)/1.6),wr=Math.max(wd,wm);
 const warm=wd>=wm?'#ffb48c':'#ffd2b4';let mul=wr>0?warm:'#ffffff',add='#000000',a=wr*.6;
 if(n>0){mul=txLerpHex(wr>0?warm:'#9aa6e0','#9aa6e0',wr>0?n:1);add=txLerpHex('#000000','#04081a',n);a=Math.max(a,n*.7)}
 if(bk==='snow'&&n>0)a*=.9;return{mul,add,a:Math.round(a*1000)/1000}}
