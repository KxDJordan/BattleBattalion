/* ================= THE ARENA: the colosseum's battle ground (biome 'arena', BIO.arena in 11-gladiators.js; the floor plan: 29-colosseum.js
   colArenaTiles) =================
   Tiles: raked sand with old stains and scuffs (TXM.arena / HDM.arena + HDGD.arena: the HD twin), the board's edge is the stone podium
   wall, fire pits on hazard tiles (a ring of stones round burning coals: TXM.arena.haz / HDHZ.arena). Props on blocked tiles (TXPK.arena):
   broken marble columns, a bronze statue of a gladiator on its plinth, braziers, weapon racks, and on a tile marked prop 'gate' the
   arena's gate: a stone arch with its portcullis down. The backdrop (txBackdropBuild for 'arena'): the stands of the colosseum all
   round the sky line, tiers of arches, the crowd, banners and the awning. Detail Low: the pixel tiles and props; Detail High: the HD tiles,
   the HD columns (the other props keep their pixel drawing, doubled). Variation is hashed from (c, r); the game's rnd() is never used. */
if(!TXBK.includes('arena')){TXBK.push('arena');TXBI.arena=TXBK.length-1}
TXM.arena={rim:'e',edge:'k',shadow:'j',sh:{c:'k',d:'c',e:'d',k:'j',b:'a'},
 ground(P,R,hf){txFill(P,'d');txTone(P,R,hf,'c','e');txBlot(P,R,'c',1+(R()<.5?1:0),2,4.5);
  // rake lines across the sand
  const n=2+((R()*2)|0);for(let i=0;i<n;i++){const pt=txPt(R,.4),len=4+((R()*4)|0);for(let j=0;j<len;j++){P.s(pt[0]+j*2,pt[1]-j,'c');P.s(pt[0]+j*2+1,pt[1]-j,'c')}}
  txSpeck(P,R,['c','e','k'],2+((R()*2)|0));const q=R();
  if(q<.12)txBlot(P,R,'K',1,1.2,2.4,0,.5);   // an old stain
  else if(q<.2){const pt=txPt(R,.45);P.s(pt[0],pt[1],'m');P.s(pt[0]+1,pt[1],'l');P.s(pt[0]+2,pt[1]-1,'m')}   // a dropped bone or splinter
  else if(q<.3)txPebble(P,R,1,'e','d','c')},
 rough(P,R,hf,f,ph){if(!ph){txBlot(P,R,'c',2,5,8,0,.45);txSpeck(P,R,['k','c'],5)}},
 haz(P,R,f,ph){if(!ph){for(let y=-7;y<=7;y++)for(let x=-16;x<16;x++){if(!txIn(x,y))continue;const u=(x+.5)/32+y/16,v=y/16-(x+.5)/32,e=Math.max(Math.abs(u),Math.abs(v)),n=txHash(x>>1,y,7)*.06;
    P.s(x,y,e>.42-n?'d':e>.36-n?(txHash(x>>1,y,3)<.5?'n':'m'):e>.32-n?'1':'G')}}
  txFire(P,R,f,ph)},
 face:{lip:['e','d'],len:1,soil:['n','o'],st:[[10,'band','m','n','o'],[-99,'band','n','o','G']]}};
TXPK.arena=[[3,'acol'],[2,'astat'],[2,'abraz'],[1,'arack']];
const TXARENA={acol:1,astat:1,abraz:1,arack:1,agate:1};
function txArenaProp(P,R,kind,v){
 if(kind==='acol'){txColumn(P,R,0,1,16+v*6,false);return}
 if(kind==='astat'){for(let y=0;y<6;y++)for(let x=-6;x<=6;x++)P.p(x,1-y,y===5?(x<2?'l':'m'):x>3?'o':x>0?'n':'m');   // the plinth
  const B=['7','5','6'],b=(x,y,k)=>P.p(x,y,k);for(let y=6;y<18;y++)for(let x=-2;x<=2;x++)b(x,1-y,x<-1?B[2]:x>0?B[0]:B[1]);for(let y=18;y<21;y++)for(let x=-1;x<=1;x++)b(x,1-y,x<0?B[2]:B[1]);
  for(let y=21;y<23;y++)for(let x=-2;x<=1;x++)b(x,1-y,B[2]);b(0,-22,B[1]);b(1,-23,'h');b(0,-23,'h');   // a crested helm
  for(let i=0;i<6;i++){b(3+(i>>1),-12-i,B[1])}for(let i=0;i<7;i++)b(5,-18-i,'q');b(5,-25,'r');   // the arm and the sword raised
  for(let y=8;y<14;y++){b(-3,1-y,B[0]);b(-4,1-y,B[0])}for(let x=-5;x<=-2;x++){b(x,-8,'d');b(x,-13,'d')}return}   // a shield on the other arm
 if(kind==='abraz'){for(let i=0;i<9;i++){P.p(-4+(i>>2),1-i,'G');P.p(4-(i>>2),1-i,'G');P.p(0,1-i,'o')}txEll(P,0,-9,5.5,2.4,'n','o','G',0);
  const F=[[0,-11,'e'],[-1,-11,'y'],[1,-11,'y'],[-2,-10,'E'],[2,-10,'E'],[0,-12,'y'],[-1,-12,'E'],[1,-13,'E'],[0,-13,'y'],[0,-14,'E'],[-1,-15,'g'],[1,-12,'y'],[2,-11,'g'],[-3,-10,'g'],[3,-10,'g']];for(const [x,y,k] of F)P.p(x,y,k);return}
 if(kind==='arack'){for(let y=0;y<16;y++){P.p(-7,1-y,'j');P.p(7,1-y,'i')}for(let x=-7;x<=7;x++){P.p(x,-5,'k');P.p(x,-12,'j')}
  for(const x of [-4,-1,2,5]){for(let y=-16;y<=0;y++)P.p(x,y,'j');P.p(x,-17,'q');P.p(x,-18,'r');P.p(x-1,-17,'p')}
  for(let a=0;a<6.3;a+=.2)P.p(Math.round(-2+Math.cos(a)*3),Math.round(-8+Math.sin(a)*3),'g');P.p(-2,-8,'d');return}
 if(kind==='agate'){for(const sx of [-10,7])for(let y=0;y<24;y++)for(let x=0;x<4;x++)P.p(sx+x,1-y,(y%6)===5?'n':x===0?'l':x===3?'o':'m');
  for(let x=-10;x<=10;x++){const t=x/10,top=-23-Math.round((1-t*t)*4);for(let y=top;y<=-19;y++)P.p(x,y,y===top?'l':(x+y)&3?'m':'n')}
  for(let y=-18;y<=1;y++)for(let x=-6;x<=6;x++)P.p(x,y,'0');for(const x of [-5,-2,1,4])for(let y=-18;y<=0;y++)P.p(x,y,'G');for(let y=-16;y<=0;y+=4)for(let x=-6;x<=6;x++)P.p(x,y,'G');
  P.p(-4,-20,'h');P.p(-3,-20,'g');P.p(3,-20,'h');P.p(4,-20,'g')}}
{const t0=txProp;txProp=function(id){let S=TXPC.get(id);if(S)return S;const a=id.split('|'),kind=a[1];if(!TXARENA[kind])return t0(id);const v=+a[2]||0,P=txBuf(TXPW,TXPH,TXPAX,TXPAY),R=mulberry(Math.imul(v+1,2654435761)^Math.imul(kind.length*7+kind.charCodeAt(1),40503));
  txArenaProp(P,R,kind,v);txOutline(P);let x0=99,x1=-99,y0=99;for(let y=0;y<TXPH;y++)for(let x=0;x<TXPW;x++)if(P.d[y*TXPW+x]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y}
  S={id,P,cv:undefined,hcv:undefined,w:2*Math.max(TXPAX-x0,x1-TXPAX+1),h:TXPAY-y0+1,gl:kind==='abraz'?[[0,-13],[1,-11]]:[],ember:false};TXPC.set(id,S);return S}}
{const b0=txPropBox;txPropBox=function(bk,c,r){if(bk==='arena'&&typeof B==='object'&&B&&B.tiles&&typeof key==='function'){const t=B.tiles[key(c,r)];if(t&&t.prop==='gate')return txProp('arena|agate|0')}return b0(bk,c,r)}}
if(typeof hpBuild==='function'){const h0=hpBuild;hpBuild=function(S){const a=S.id.split('|');if(a[1]!=='acol')return TXARENA[a[1]]?null:h0(S);const v=+a[2]||0,P=hpBuf(),sd=(a[1].length*7+v*13)&255,R=mulberry(Math.imul(v+1,2654435761)^Math.imul(a[1].length*7+a[1].charCodeAt(1),40503)),R2=mulberry((Math.imul(v+7,374761393)^977)>>>0);
  hpColumn(P,R,0,1,16+v*6,false,R2,sd);hpRim(P,.1);hpOutline(P);return hdCv(P)}}
/* HD tiles */
if(typeof HDM==='object'){HDM.arena={pa:.8,ramp:['#6e5230','#8a6a40','#a6824e','#bc9658','#cfa962','#dcb86e','#e8c882','#f2d89e','#fbeac4'],cl:40,grassy:0,base:5.2,amp:1.4,amp2:.8,grain:.7,hb:.4,rim:'#fff4d6',sh:'#5a3e22',ao:'#6a4a2a'};
 const m=HDM.arena;m.G=hdRamp(m.ramp);m.rimC=hdC(m.rim);m.shC=hdC(m.sh);m.aoC=hdC(m.ao)}
if(typeof HDGD==='object')HDGD.arena=function(P,R,M,hf,c,r){const G=M.G,ox=(c-r)*32,oy=(c+r)*16;
 hdEach((x,y)=>{const wx=ox+x,wy=oy+y,ph=((wx*.5-wy*1.1+hdN(wx,wy*2,24,3)*6)%9+9)%9;if(ph<.9)P.t(x,y,G[2],.35);else if(ph<1.6)P.t(x,y,G[7],.25)});   // rake lines
 hdSpeck(P,R,8,[G[2],G[3],G[7],hdC('k')]);const q=R();
 if(q<.12)hdBlot(P,...hdPt(R,.45),4+R()*3,2+R()*1.4,c*5+r,(x,y,qq)=>hdMix(P.g(x,y),hdC(qq<.5?'K':'f'),.35*(1.1-qq)));   // an old stain
 else if(q<.22)hdPebbles(P,R,1+((R()*2)|0),HDRAMP.sand,c+r*7,.4);
 else if(q<.28){const pt=hdPt(R,.45);hdShadow(P,pt[0]+1,pt[1]+1,4,1.2,.8);for(let i=0;i<6;i++)P.s(pt[0]+i,pt[1]-(i>>2),hdC(i&1?'m':'l'))}};
if(typeof HDRF==='object')HDRF.arena=function(P,R,M,hf,f,ph,v,c,r){if(!ph)hdBlot(P,0,1,20,10,c+r,(x,y,q)=>hdDi(M.G,3+q*1.4+(txHash(x,y,3)-.5)*1.2,x,y))};
if(typeof HDHZ==='object')HDHZ.arena=function(P,R,f,ph,M,c,r){if(!ph){const S=HDRAMP.stone,sd=c*7+r*3;hdEach((x,y)=>{const e=hdPoolE(x,y,sd);if(e>.44)return;if(e>.36){P.p(x,y,hdDi(S,3+(txHash(x>>1,y,2)-.5)*3+(.44-e)*8,x,y));return}P.p(x,y,hdC(txHash(x,y,5)<.5?'1':'0'))});
  for(let i=0;i<18;i++){const pt=hdPt(R,.3),t=(f+((R()*8)|0))&7;if(hdPoolE(pt[0],pt[1],sd)<.33){P.p(pt[0],pt[1],HDRAMP.fire[t<2?3:t<5?2:1]);if(t<2)P.p(pt[0]+1,pt[1],HDRAMP.fire[2])}}}
 else{const n=3+((R()*2)|0),L=[];for(let i=0;i<n;i++){const pt=hdPt(R,.42);L.push([pt[0],pt[1],10+((R()*9)|0),(R()*8)|0])}L.sort((a,b)=>a[1]-b[1]);for(const a of L)hdFlame(P,a[0],a[1],a[2],f,a[3],HDRAMP.fire)}};
/* the backdrop: the stands of the colosseum round the horizon (drawn over the sky the common painter builds for the arena) */
TXSCN.arena=[];if(TXSKY&&TXSKY.day)TXSKY.day.arena=['X','x','x','x','F','F','e','d'];
function txArenaStands(cv,tod,w,h,U,Z){const q=cv.getContext('2d');if(!q)return;const H0=Math.round(h*.45),C=k=>PAL[k]||k,night=tod==='night',dusk=tod==='dusk'||tod==='dawn';
 const stone=night?['1','G','o','p']:dusk?['u','k','c','d']:['n','m','l','r'],dark=night?'0':'1',u=Math.max(1,Math.round(U));
 const yOf=(x,base,bow)=>Math.round(base-bow*(1-Math.cos((x/w-.5)*Math.PI*1.4))*h*.5);   // the far side of the oval: the stands rise toward the edges of the view
 const tiers=[[H0+.03*h,.085,.05],[H0-.045*h,.08,.06],[H0-.115*h,.07,.07],[H0-.18*h,.06,.075]];
 for(let t=tiers.length-1;t>=0;t--){const [base,hh,bow]=tiers[t],H=Math.round(hh*h);
  for(let x=0;x<w;x+=u){const y0=yOf(x,base,bow);q.fillStyle=C(stone[1]);q.fillRect(x,y0-H,u,H+u*2);q.fillStyle=C(stone[2]);q.fillRect(x,y0-H,u,u)}
  // arches along the tier
  const aw=Math.max(3*u,Math.round(w/56)),gap=Math.round(aw*1.9);for(let x=Math.round(gap/2);x<w-aw;x+=gap){const y0=yOf(x+aw/2,base,bow),ah=Math.round(H*.55);q.fillStyle=C(dark);q.fillRect(x,y0-ah,aw,ah);q.fillRect(x+u,y0-ah-u,aw-2*u,u);q.fillStyle=C(stone[3]);q.fillRect(x-u,y0-H,u,H)}
  // the crowd on the seating above each arcade
  const cols=night?['G','o','D','1']:['g','e','x','r','A','h','c','l'];for(let x=0;x<w;x+=u*2){const y0=yOf(x,base,bow)-H,k=txHash(x>>1,t,77);q.fillStyle=C(cols[(k*cols.length)|0]);q.fillRect(x,y0-u*(1+((k*7)|0)%2),u,u);if(k<.6){q.fillStyle=C(cols[((k*91)|0)%cols.length]);q.fillRect(x+u,y0-u*2,u,u)}}}
 // masts, banners and the awning on top
 const top=tiers[3][0]-tiers[3][1]*h;for(let i=0;i<9;i++){const x=Math.round((i+.5)*w/9),y0=yOf(x,top,tiers[3][2]);q.fillStyle=C(night?'1':'j');q.fillRect(x,y0-10*u,u,10*u);q.fillStyle=C(['g','d','x'][i%3]);q.fillRect(x+u,y0-10*u,5*u,3*u);q.fillRect(x+u,y0-7*u,3*u,u)}
 if(!night){q.globalAlpha=.75;for(let i=0;i<4;i++){const x0=Math.round(w*(i*.27+.04)),x1=x0+Math.round(w*.18);q.fillStyle=C(i&1?'h':'g');for(let x=x0;x<x1;x+=u){const y=yOf(x,top,tiers[3][2])-12*u+Math.round(Math.sin((x-x0)/(x1-x0)*Math.PI)*4*u);q.fillRect(x,y,u,2*u)}}q.globalAlpha=1}
 // the podium wall in front of the stands
 q.fillStyle=C(stone[2]);q.fillRect(0,Math.round(H0+.05*h),w,Math.round(.02*h));q.fillStyle=C(stone[0]);q.fillRect(0,Math.round(H0+.07*h),w,Math.round(.08*h));
 // the sand of the arena floor below the podium, darkening away from the light
 const F=night?['1','0','0']:dusk?['u','i','a']:['c','k','j'],y1=Math.round(H0+.15*h);for(let y=y1;y<h;y+=u){const t=(y-y1)/(h-y1);q.fillStyle=C(F[Math.min(2,(t*3)|0)]);q.fillRect(0,y,w,u);if(!night&&((y/u)|0)%3===0)for(let x=((y*13)%(23*u));x<w;x+=23*u+((y>>1)%7)*u){q.fillStyle=C(F[Math.min(2,((t*3)|0)+1)]);q.fillRect(x,y,u,u)}}}
{const bb=txBackdropBuild;txBackdropBuild=function(bk,tod,w,h,hq,east,Z){const st=bb(bk,tod,w,h,hq,bk==='arena'?false:east,Z);if(bk==='arena'&&st&&st.back){try{txArenaStands(st.back,tod,w,h,st.U,Z)}catch(e){}st.cl=st.cl.slice(0,2)}return st}}
