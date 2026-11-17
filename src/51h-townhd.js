/* ================= TOWN VIEW, DETAIL HIGH: the painted street (tvPaintHD) and its overlay (tvDrawHD) =================
   The same street plan as the pixel scene (tvPlan in 51-townview.js: lots, boxes, labels) painted as clean-lined vector art
   at device resolution: Canvas 2D paths in scene units u (one low-res pixel), the context scaled by k = scale x devicePixelRatio.
   Style follows the painted icons (06p-iconspaint.js): one light from the upper left, every surface in lit / mid / shadow values
   (pkFill with 5-tone ramps built from the PAL family), near-black ink lines.
   Light: every colour goes through tvGradeFn(tod) (dawn rose, dusk amber, night blue and dark); emissive things (lit windows,
   lanterns, the forge, the college's runes) keep their own colour and add a glow; at night warm pools of light are added last.
   Painted once per cache key into one canvas (TV.pic); tvDrawHD blits the visible part and paints the small animated bits.
   Cosmetic randomness comes from the town-name hash (mulberry), never from rnd(). */
function tvHex(h){const n=parseInt(String(h).slice(1),16);return[n>>16&255,n>>8&255,n&255]}
function tvRgb(c){return'#'+((1<<24)|(clamp(Math.round(c[0]),0,255)<<16)|(clamp(Math.round(c[1]),0,255)<<8)|clamp(Math.round(c[2]),0,255)).toString(16).slice(1)}
function tvMix(a,b,t){const A=tvHex(a),B=tvHex(b);return tvRgb([A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t])}
/* the light of the hour as a colour transform: multiply, desaturate, then lean toward an ambient colour */
const TVGRADE={day:null,dawn:{m:[1,.9,.88],s:.05,a:[96,70,110],t:.1},dusk:{m:[1,.8,.68],s:.12,a:[74,40,78],t:.22},night:{m:[.36,.44,.7],s:.5,a:[12,20,42],t:.3}};
function tvGradeFn(tod){const G0=TVGRADE[tod],memo=new Map();if(!G0)return h=>h;
 return h=>{let v=memo.get(h);if(v)return v;const c=tvHex(h),l=c[0]*.3+c[1]*.55+c[2]*.15,o=[0,1,2].map(i=>{let x=c[i]+(l-c[i])*G0.s;x*=G0.m[i];return x+(G0.a[i]-x)*G0.t});v=tvRgb(o);memo.set(h,v);return v}}
/* 5-tone ramps [deep, shadow, mid, lit, highlight] for walls and roofs, from the PAL family */
const TVHR={plaster:['#5c523e','#b9ad8f','#e2d8bf','#f4ecd8','#fffaf0'],stone:['#262b30','#5e6872','#8d99a6','#b6c0ca','#e8eef2'],adobe:['#5a4424','#b08a52','#d6b47a','#efd6a2','#fff2d4'],
 wood:['#2a180b','#5c3a1f','#8c5e34','#b8854e','#e0b67e'],dark:['#160d06','#33200f','#55381f','#77522f','#a07a52'],logs:['#2a180b','#5a3a1e','#7f5531','#a8784a','#d4a674'],
 red:['#3a0e0b','#7e2a22','#c4493f','#e2715f','#ffc4b4'],slate:['#1c2228','#3f4a52','#66737d','#919ea8','#d0d8de'],thatch:['#3a2808','#8a6a2a','#c99f48','#e8c776','#fff0c0'],
 verd:['#0b2b26','#2c6a5d','#4f9f8a','#86d0bb','#dffff4'],blue:['#0b1a40','#24508f','#3f74c0','#6ea4e4','#d4ecff'],clay:['#3a1206','#8a3a1c','#c45a32','#e8875a','#ffd0a8'],
 plum:['#1c0c34','#4a2c80','#6e4fae','#9c7ad8','#ece0ff'],kawara:['#101418','#262e36','#444f58','#6d7a84','#b8c4cc'],tile:['#0c1614','#1c302c','#2f4c46','#4b6e66','#9cbab2'],
 iron:PKM.iron,steel:PKM.steel,brass:PKM.brass,canvas:PKM.canvas,straw:['#3a2808','#8a6a2a','#c8a050','#e6c878','#fff2c4'],cloth:PKM.cloth,teal:PKM.teal,water:['#06142c','#123466','#2a5c9c','#5a90cc','#bfe0ff']};
const TVHROOF={kawara:'kawara',tile:'tile',red:'red',verd:'verd',slate:'slate',thatch:'thatch',clay:'clay',blue:'blue',wood:'wood',plum:'plum'};
function tvRampName(r){for(const k in TVRAMP)if(TVRAMP[k]===r)return TVHROOF[k]||'red';return'red'}

function tvPaintHD(t,ti,PL,tod,bio,k){const W=PL.SW,H=PL.H,yB=PL.yB,GH=PL.GH,yH=yB-12,east=!!(t&&t.east),hs=tvHash(t.name||'town'+ti),R=mulberry(hs^0x2f6a),rr=(a,b)=>a+R()*(b-a),ri=(a,b)=>Math.floor(rr(a,b+1)),ch=p=>R()<p;
 const cv=pxCanvas(Math.ceil(W*k),Math.ceil(H*k)),g=cv.getContext('2d');g.setTransform(k,0,0,k,0,0);g.lineJoin='round';g.lineCap='round';
 const pu0=PK.u;PK.u=k;
 const dark=tod==='night',dim=tod==='dusk'||dark,lamps=dim,snow=bio==='snow',GR=tvGradeFn(tod),C=key=>GR(PAL[key]||key),INK='#0c0d12',LW=.5;
 const an={smoke:[],lamps:[],stars:[],glints:[],lights:[],sign:null,mill:null,flags:[],sparks:[],runes:[],bell:null,walkY:yB+12,parts:null,box:{},yB,GH,tod,bio,water:null,walkX1:W,hd:1,glow:[]};
 const lit=p=>tod==='night'?ch(p):tod==='dusk'?ch(p*.75):tod==='dawn'?ch(p*.3):false;
 const M=n=>(Array.isArray(n)?n:TVHR[n]||TVHR.stone).map(GR);
 // ---- small kit ----
 const S=d=>pkS(d),RC=(x,y,w,h,r)=>pkRect(x,y,w,h,r||0),PO=a=>pkPoly(a);
 const F=(sh,mat,o)=>{o=o||{};pkFill(g,sh,M(mat),{lw:o.lw===undefined?LW:o.lw,k:o.k||1.4,ink:INK,noRim:o.noRim,noShade:o.noShade,ball:o.ball,inside:o.inside})};
 const fl=(x,y,w,h,c,a)=>{g.globalAlpha=a==null?1:a;g.fillStyle=c;g.fillRect(x,y,w,h);g.globalAlpha=1};
 const ln=(pts,w,c,a)=>{g.save();g.globalAlpha=a==null?1:a;g.lineWidth=w;g.strokeStyle=c;g.beginPath();g.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)g.lineTo(pts[i],pts[i+1]);g.stroke();g.restore()};
 const ell=(x,y,rx,ry,c,a)=>{g.globalAlpha=a==null?1:a;g.fillStyle=c;g.beginPath();g.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);g.fill();g.globalAlpha=1};
 const glow=(x,y,r,col,a)=>{g.save();g.globalCompositeOperation='lighter';const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,col);q.addColorStop(1,'rgba(0,0,0,0)');g.globalAlpha=a==null?.5:a;g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2);g.restore()};
 const lg=(x0,y0,x1,y1,st)=>{const q=g.createLinearGradient(x0,y0,x1,y1);st.forEach((c,i)=>q.addColorStop(i/(st.length-1),c));return q};
 const shadowE=(x,y,w)=>ell(x+w/2,y+.6,w/2,1.6,'#000',.22);
 /* ---- sky ---- */
 const SKYC={day:{def:['#2f5fa8','#4f86d0','#7fb6ec','#bfe2f8'],swamp:['#5d6e6a','#7d8f86','#a3b0a2','#c9cfbd'],desert:['#3f7cc8','#72a8e0','#b8d8ec','#f3e2b0'],snow:['#7d93ae','#a6b8cc','#c8d4e0','#eef2f6']},
  dawn:{def:['#2f3f78','#6a5a9a','#d08a9a','#f8c890']},dusk:{def:['#24204e','#5a3a7a','#c4604a','#f0a84a']},night:{def:['#04070e','#0a1426','#152640','#22385a']}}[tod];
 const sky=SKYC[bio]||SKYC.def;g.fillStyle=lg(0,0,0,yB,sky);g.fillRect(0,0,W,yB+2);const horizon=sky[sky.length-1];
 const sunX=W*.5*(tod==='dawn'?.6:tod==='dusk'?1.3:.9)+((hs>>>12)%5)*12;
 if(tod==='day'){const sy=yH*.24;glow(sunX,sy,40,'rgba(255,240,200,.9)',.45);ell(sunX,sy,7,7,'#fff6d8');ell(sunX-1.5,sy-1.5,4.6,4.6,'#ffffff')}
 else if(tod==='dawn'||tod==='dusk'){const sy=yH-Math.max(40,yH*.3);glow(sunX,sy,60,tod==='dawn'?'rgba(255,200,150,.9)':'rgba(255,150,70,.9)',.55);ell(sunX,sy,10,10,tod==='dawn'?'#fff0c8':'#ffd27a')}
 else{const mx=Math.min(W*.8,90+((hs>>>12)%5)*40),my=yH*.3+4;for(let i=0;i<W*yH/70;i++){const x=rr(0,W),y=rr(0,yH-14),r=ch(.1)?.7:.35;ell(x,y,r,r,'#e8f0ff',rr(.35,.9));if(r>.5)an.stars.push({x,y})}
  glow(mx,my,34,'rgba(190,210,255,.8)',.35);ell(mx,my,7.5,7.5,'#e9eef8');ell(mx+2,my+1.5,1.4,1.2,'#b9c4d8');ell(mx-2.5,my+2.5,1,1,'#b9c4d8');ell(mx+1,my-3,1,.9,'#c8d0e0')}
 // clouds: soft lobes, lit on top
 {const cc=tod==='day'?['#ffffff','#d8e2ec']:tod==='dawn'?['#ffd8c8','#b88aa8']:tod==='dusk'?['#ffb48a','#7a4a6a']:['#2a3a56','#16233a'],n=bio==='desert'?1:bio==='snow'||bio==='swamp'?5:3;
  for(let i=0;i<n+Math.floor(W/150);i++){const cx=rr(0,W),cy=rr(yH*.12+10,yH*.55),w=rr(16,40);for(let j=0;j<6;j++){const ox=(j-2.5)*w/7,r=w*(.16+.1*Math.sin(j*1.7+cx));ell(cx+ox,cy+2,r*1.2,r*.55,cc[1],.9)}
   for(let j=0;j<5;j++){const ox=(j-2)*w/6,r=w*(.13+.08*Math.cos(j*2.1+cx));ell(cx+ox,cy-r*.3,r,r*.75,cc[0],.95)}}}
 /* ---- far ridges, hazed toward the horizon ---- */
 const haze=(h,a)=>tvMix(GR(h),horizon,a);
 const ph=[R()*9,R()*9,R()*9];
 const ridge=(base,amp,per,sharp,col,o)=>{o=o||{};const pts=[];for(let x=-2;x<=W+2;x+=2){const u=x/per,tri=v=>{v=v-Math.floor(v);return v<.5?v*2:2-v*2};
   let h=sharp?tri(u+ph[0])*.6+tri(u*2.3+ph[1])*.28+tri(u*5.1+ph[2])*.12:(Math.sin(u*6.28+ph[0])*.5+.5)*.65+(Math.sin(u*14.6+ph[1])*.5+.5)*.25+(Math.sin(u*31+ph[2])*.5+.5)*.1;if(o.mesa)h=Math.round(h*3)/3*.9+h*.1;pts.push(x,base-amp*h)}
  g.beginPath();g.moveTo(-2,yB+2);for(let i=0;i<pts.length;i+=2)g.lineTo(pts[i],pts[i+1]);g.lineTo(W+2,yB+2);g.closePath();g.fillStyle=lg(0,base-amp,0,base,[col[0],col[1]]);g.fill();
  if(o.cap){g.save();g.clip();g.beginPath();g.moveTo(-2,0);for(let i=0;i<pts.length;i+=2)g.lineTo(pts[i],pts[i+1]+o.capD*(1+Math.sin(i*.37)*.4));g.lineTo(W+2,0);g.closePath();g.fillStyle=o.cap;g.fill();g.restore()}
  g.globalAlpha=.35;g.strokeStyle=o.edge||col[0];g.lineWidth=.6;g.beginPath();for(let i=0;i<pts.length;i+=2)i?g.lineTo(pts[i],pts[i+1]):g.moveTo(pts[i],pts[i+1]);g.stroke();g.globalAlpha=1};
 const amp=clamp((yH-24)*.62,30,110);
 if(bio==='plains'){ridge(yH+2,amp*1.05,W*.9,0,[haze('#8d9f96',.45),haze('#7d8f86',.3)]);ridge(yH+4,amp*.6,W*.5,0,[haze('#7aa25a',.2),haze('#5f8244',.12)])}
 else if(bio==='forest'){ridge(yH+2,amp*1.2,W*.8,0,[haze('#6f8a7c',.4),haze('#55705f',.3)]);ridge(yH+4,amp*.7,W*.45,0,[haze('#3f8a5a',.2),haze('#2c6a4d',.12)])}
 else if(bio==='hills'){ridge(yH,amp*1.5,W*.62,1,[haze('#9aa6b2',.35),haze('#6d7a86',.25)],{cap:haze('#f4f8fb',.2),capD:6});ridge(yH+4,amp*.5,W*.4,1,[haze('#7f9a6a',.2),haze('#5f7a4c',.12)])}
 else if(bio==='swamp'){ridge(yH+2,amp*.7,W*.7,0,[haze('#7d8f86',.45),haze('#5d6e66',.35)]);ridge(yH+5,amp*.3,W*.3,0,[haze('#4d6050',.25),haze('#35554f',.2)])}
 else if(bio==='desert'){ridge(yH+2,amp*.9,W*.7,1,[haze('#c8915a',.3),haze('#a06a3a',.2)],{mesa:1});ridge(yH+5,amp*.5,W*.5,0,[haze('#e2bc7a',.15),haze('#d1a060',.1)])}
 else{ridge(yH,amp*1.5,W*.6,1,[haze('#c8d4e0',.25),haze('#9aaabb',.2)],{cap:haze('#ffffff',.1),capD:12});ridge(yH+4,amp*.4,W*.45,0,[haze('#b8c6d4',.15),haze('#8d9fb2',.12)])}
 /* ---- trees ---- */
 const leafC=bio==='swamp'?['#6f8a4a','#4a6a38','#2c4a2a']:bio==='hills'?['#9cc07a','#6a9450','#3f6a3a']:['#9bd96f','#5f9f44','#2f6a34'];
 const leafy=(x,by,r,c,hz)=>{c=c||leafC;const f=h=>hz?haze(h,hz):GR(h);F(RC(x-1.1,by-r*1.2,2.2,r*1.2,.6),'dark',{lw:LW*.8,k:.4});
  const cy=by-r*1.15-r*.55,bl=[[0,0,r],[-r*.72,r*.3,r*.62],[r*.72,r*.25,r*.6],[-r*.3,-r*.55,r*.62],[r*.4,-r*.5,r*.55]];
  g.save();g.beginPath();for(const [ox,oy,rad] of bl){g.moveTo(x+ox+rad,cy+oy);g.arc(x+ox,cy+oy,rad,0,Math.PI*2)}g.lineWidth=LW*2.2;g.strokeStyle=INK;g.stroke();g.fillStyle=lg(x-r,cy-r,x+r*.6,cy+r,[f(c[0]),f(c[1]),f(c[2])]);g.fill();g.clip();
  for(const [ox,oy,rad] of bl){ell(x+ox-rad*.25,cy+oy-rad*.3,rad*.55,rad*.45,f(c[0]),.7)}for(let i=0;i<6;i++)ell(x+rr(-r,r),cy+rr(-r*.8,r*.6),rr(.6,1.2),rr(.5,1),f(c[2]),.35);g.restore()};
 const pine=(x,by,h,c,sn,hz)=>{c=c||['#4f8f5a','#2c6a4d','#173a2e'];const f=q=>hz?haze(q,hz):GR(q);fl(x-.7,by-3,1.4,3,f('#4a3826'));const tiers=Math.max(2,Math.round(h/7));
  for(let i=0;i<tiers;i++){const ty=by-3-(i+1)*(h-3)/tiers,hw=(tiers-i)*h/(tiers*3.1)+1.2,th=(h-3)/tiers+2.4;const p=new Path2D();p.moveTo(x,ty-1);p.quadraticCurveTo(x-hw*.4,ty+th*.6,x-hw,ty+th);p.quadraticCurveTo(x,ty+th-1.2,x+hw,ty+th);p.quadraticCurveTo(x+hw*.4,ty+th*.6,x,ty-1);
   g.fillStyle=lg(x-hw,ty,x+hw,ty+th,[f(c[0]),f(c[1]),f(c[2])]);g.fill(p);g.lineWidth=LW*.8;g.strokeStyle=INK;g.stroke(p);if(sn){g.save();g.clip(p);ell(x-hw*.3,ty+th*.3,hw*.7,th*.32,f('#ffffff'),.95);g.restore()}}};
 const palm=(x,by,h)=>{const pts=[];for(let j=0;j<=h;j+=2)pts.push(x+Math.sin(j/h*1.4)*3,by-j);F(pkTube(pts,[2.2,1.4]),'wood',{k:.4});const tx=pts[pts.length-2],ty=pts[pts.length-1];
  for(const [dx,dy] of [[-1,-.2],[-1,.4],[1,-.2],[1,.4],[-.5,-.7],[.5,-.7]]){const q=[];for(let j=0;j<=10;j+=2)q.push(tx+dx*j,ty+dy*j+j*j*.06);F(pkTube(q,[2.4,.4],'round'),'green',{k:.3,lw:LW*.8})}};
 const cactus=(x,by,h)=>{F(RC(x-1.6,by-h,3.2,h,1.6),'green',{k:.5});F(RC(x-5,by-h*.6,2.6,h*.35,1.3),'green',{k:.4});F(RC(x-5,by-h*.32,5,2.2,1.1),'green',{k:.3,lw:0});F(RC(x+2.6,by-h*.75,2.4,h*.3,1.2),'green',{k:.4})};
 const dead=(x,by,h)=>{F(pkTube([x,by,x+.5,by-h*.5,x-.5,by-h],[2.2,.8]),'dark',{k:.3});for(let i=0;i<3;i++){const y=by-h*.4-i*h*.18,d=i%2?1:-1;ln([x,y,x+d*5,y-3,x+d*7,y-5],.6,GR('#33200f'))}};
 const sakura=(x,by,r)=>leafy(x,by,r,['#ffd6e0','#f0a0b8','#b8607a']);
 const tree=(x,by,sz)=>{if(east&&bio!=='snow'&&bio!=='desert'){ch(.55)?sakura(x,by,sz*.4):pine(x,by,sz+6);return}if(snow)pine(x,by,sz+8,['#6f9a7a','#3f6a56','#1f3a30'],1);else if(bio==='forest')(ch(.65)?pine(x,by,sz+10):leafy(x,by,sz*.42));else if(bio==='desert')(ch(.6)?palm(x,by,sz+4):cactus(x,by,sz*.6));
  else if(bio==='swamp')(ch(.6)?dead(x,by,sz):leafy(x,by,sz*.36));else if(bio==='hills')(ch(.5)?pine(x,by,sz+6):leafy(x,by,sz*.38));else leafy(x,by,sz*.42,ch(.25)?['#f3c86b','#d1903e','#8a4a2a']:null)};
 // distant tree line
 if(bio==='forest'||bio==='snow'||bio==='hills'){for(let x=-4;x<W+6;x+=rr(4,7))pine(x,yH+rr(1,3),rr(12,22),snow?['#c8d4e0','#9aaabb','#7d8fa2']:null,snow&&ch(.7),.35)}
 else if(bio==='plains'){for(let x=rr(0,20);x<W;x+=rr(18,46))leafy(x,yH+2,rr(4,6),east&&ch(.5)?['#ffd6e0','#f0a0b8','#b8607a']:null,.35)}
 else if(bio==='swamp'){for(let x=rr(0,12);x<W;x+=rr(14,30))dead(x,yH+3,rr(12,22))}
 else{for(let x=rr(0,30);x<W;x+=rr(30,70))palm(x,yH+3,rr(12,18))}
 /* ---- ground: the field, the street, the grass in front ---- */
 const GRC={plains:['#8fb56a','#6a9a4c','#c9a878','#a98455','#7a5a38','#5f9f44','#3f7a34'],forest:['#5f9f50','#3f7a3a','#a98455','#7a5a38','#5a4026','#3f7a3a','#2c5a2a'],hills:['#8fb56a','#6a9a4c','#9aa4a8','#7d8a8e','#5a6468','#5f9a4a','#3f6a3a'],
  swamp:['#5f8244','#3f6a3a','#8a7a58','#6a5a3e','#4a3a26','#3f6a3a','#2c4a2a'],desert:['#e8c78a','#d1a96a','#f0d7a0','#d9b47a','#b08a52','#d9b06a','#b08a50'],snow:['#f0f4f8','#d0dae4','#e0e6ee','#c8d0d8','#9aa6b2','#f4f8fb','#c8d4e0']}[bio];
 const GC=GRC.map(GR),rdH=Math.round(clamp(GH*.5,26,44)),yF=yB+rdH,harb=PL.places.harbour?PL.places.harbour.x+40:W+99;if(PL.places.harbour)an.walkX1=harb-6;
 fl(0,yH,W,yB-yH+2,lg(0,yH,0,yB,[GC[1],GC[0]]));
 g.fillStyle=lg(0,yB,0,yF,[GC[2],GC[3]]);g.fillRect(0,yB,W,rdH);
 if(bio==='hills'){for(let y=yB+1,r=0;y<yF;y+=2.6,r++)for(let x=(r&1)*2.3-3;x<W;x+=4.6){const q=GC[ri(2,4)];g.fillStyle=q;g.beginPath();g.ellipse(x+2.2,y+1.2,2,1.05,0,0,Math.PI*2);g.fill();g.globalAlpha=.45;g.strokeStyle=GC[4];g.lineWidth=.3;g.stroke();g.globalAlpha=1;ell(x+1.6,y+.8,.9,.35,'#ffffff',.18)}}
 else if(snow){for(const ry of [yB+rdH*.35,yB+rdH*.62])for(let x=-4;x<W;x+=rr(18,40)){const w2=rr(12,30);ell(x+w2/2,ry,w2/2,.8,GC[3],.55);ell(x+w2/2,ry+2.6,w2/2,.7,GC[3],.45)}for(let i=0;i<W/5;i++)ell(rr(0,W),rr(yB+1,yF),rr(.6,1.6),.4,'#ffffff',.6)}
 else{for(let i=0;i<W*rdH/14;i++){const x=rr(0,W),y=rr(yB+1,yF-1);ell(x,y,rr(.6,2.2),rr(.3,.7),ch(.5)?GC[4]:GC[2],rr(.25,.6))}
  for(const ry of [yB+rdH*.4,yB+rdH*.7])for(let x=rr(0,9);x<W;x+=rr(9,22))ell(x+3,ry+rr(-1,1),rr(3,6),.5,GC[4],.35)}
 fl(0,yB,W,1.2,GC[4],.5);
 g.fillStyle=lg(0,yF,0,H,[GC[5],GC[6]]);g.beginPath();g.moveTo(0,yF+1);for(let x=0;x<=W;x+=3)g.lineTo(x,yF-.5+Math.sin(x*.37+ph[0])*.8);g.lineTo(W,H);g.lineTo(0,H);g.closePath();g.fill();
 for(let i=0;i<W*(H-yF)/10;i++){const x=rr(0,W),y=rr(yF+2,H);if(snow)ell(x,y,rr(.5,1.5),.4,'#ffffff',.5);else if(bio==='desert')ell(x,y,rr(1,3),.4,GC[6],.4);else ln([x,y,x+rr(-.8,.8),y-rr(1.4,3)],.5,ch(.5)?GC[5]:GC[6],.8)}
 /* ---- wall, roof, window, door kit ---- */
 const wallM=east?'plaster':bio==='desert'?'adobe':bio==='forest'?'logs':bio==='swamp'?'wood':bio==='hills'?'stone':'plaster';
 const ramps=east?['kawara','tile','kawara','tile']:bio==='desert'?['clay','thatch','blue','plum']:bio==='snow'?['slate','blue','red','verd']:bio==='swamp'?['wood','verd','slate','plum']:bio==='forest'?['verd','wood','red','slate']:bio==='hills'?['slate','red','blue','verd']:['red','thatch','verd','slate'];
 const rA=ramps[hs%4],rB=ramps[(hs>>>4)%4===hs%4?(hs%4+1)%4:(hs>>>4)%4],rC=ramps[(hs>>>8)%4];
 const wall=(x,y,w,h,m)=>{const mm=m==='plaster'||m==='adobe'||m==='stone'||m==='wood'||m==='logs'||m==='dark'?m:'stone';F(RC(x,y,w,h),mm==='dark'?'dark':mm,{k:1.2,inside:(q,MM)=>{
   if(mm==='stone'){for(let j=y+3;j<y+h;j+=3.2)ln([x,j,x+w,j],.3,MM[1],.7);for(let j=y,r=0;j<y+h;j+=3.2,r++)for(let i=x+(r&1)*3;i<x+w;i+=6)ln([i,j,i,j+3.2],.3,MM[1],.6);for(let i=0;i<w*h/30;i++)ell(rr(x,x+w),rr(y,y+h),rr(.8,2),.6,ch(.5)?MM[3]:MM[1],.35)}
   else if(mm==='wood'||mm==='dark'){for(let i=x+2.5;i<x+w;i+=2.5)ln([i,y,i,y+h],.35,MM[0],.55);for(let i=0;i<w*h/40;i++)ell(rr(x,x+w),rr(y,y+h),.3,rr(1,2.5),MM[1],.4)}
   else if(mm==='logs'){for(let j=y+2.4;j<y+h;j+=2.4){ln([x,j,x+w,j],.45,MM[0],.7);ln([x,j-1.9,x+w,j-1.9],.4,MM[3],.45)}}
   else{for(let i=0;i<w*h/24;i++)ell(rr(x,x+w),rr(y,y+h),rr(.4,1.2),rr(.3,.8),ch(.5)?MM[1]:MM[4],.25)}}})};
 const beams=(x,y,w,h,st)=>{const c=GR(east?'#2a1c12':'#4a3826'),c2=GR('#7a5a38');const b=(x0,y0,ww,hh)=>{fl(x0,y0,ww,hh,c);fl(x0,y0,ww*.4,hh,c2,.5)};
  b(x,y,w,1.4);b(x,y+h-1.4,w,1.4);b(x,y,1.6,h);b(x+w-1.6,y,1.6,h);for(let i=1;i<st;i++)b(x+i*w/st-.7,y,1.4,h);
  if(east){b(x,y+h/2-.6,w,1.2);return}if(h>10)for(let i=0;i<st;i++){const a=x+i*w/st+1,bx=x+(i+1)*w/st-1;if(bx-a>6&&i%2===0)ln([a,y+h-1.4,a+Math.min(7,(bx-a)*.5),y+h-8],1.1,c)}};
 const eavesUp=(x0,x1,y,mat)=>{if(!east)return;const Mx=M(mat);for(const [sx,d] of [[x0,-1],[x1,1]]){F(S(`M${sx-d*.5} ${y-1.4} Q${sx+d*2.5} ${y-.6} ${sx+d*4.2} ${y-3.6} L${sx+d*3.2} ${y-.2} Q${sx+d*1.6} ${y+1} ${sx-d*.5} ${y+.6} Z`),Mx,{k:.3})}};
 const roofTex=(sh,MM,x,y,w,h)=>{for(let j=y+2.6;j<y+h-.5;j+=2.6){ln([x,j,x+w,j],.35,MM[0],.6);ln([x,j-.5,x+w,j-.5],.25,MM[3],.35)}for(let j=y,r=0;j<y+h;j+=2.6,r++)for(let i=x+(r&1)*2.5;i<x+w;i+=5)ln([i,j,i,j+2.6],.25,MM[0],.35)};
 const snowCap=(pts)=>{if(!snow)return;g.beginPath();g.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)g.lineTo(pts[i],pts[i+1]);g.closePath();g.fillStyle=GR('#ffffff');g.fill();g.lineWidth=LW*.7;g.strokeStyle=GR('#9aaabb');g.stroke()};
 // a roof with its long side to the street (pixel roofSide geometry: rows inset by sl per row toward the top)
 const roofSide=(x,y,w,h,mat,sl)=>{sl=sl===undefined?.5:sl;const ins=(h-1)*sl,MM=M(mat);let sh;
  if(east)sh=S(`M${x+ins} ${y} L${x+w-ins} ${y} Q${x+w-ins*.35} ${y+h*.75} ${x+w+2} ${y+h-1} L${x-2} ${y+h-1} Q${x+ins*.35} ${y+h*.75} ${x+ins} ${y} Z`);else sh=PO([x+ins,y,x+w-ins,y,x+w+.5,y+h,x-.5,y+h]);
  F(sh,MM,{k:1.6,inside:()=>{roofTex(sh,MM,x,y,w,h);fl(x,y+h-1.6,w,1.6,MM[0],.6)}});fl(x+ins-.5,y-.8,w-ins*2+1,1.6,MM[0]);eavesUp(x-1.5,x+w+1.5,y+h-1,MM);
  if(snow){const pts=[x+ins-.5,y-.8,x+w-ins+.5,y-.8];for(let i=x+w-ins;i>=x+ins;i-=2)pts.push(i,y+2.4+Math.sin(i*.7)*.9+Math.sin(i*.23)*1.2);snowCap(pts)}};
 // a gable to the street (east: a gable over a hipped skirt)
 const roofGable=(x,y,w,h,mat,m)=>{const MM=M(mat),cx=x+w/2;if(m)wall(x+2.5,y+h*.35,w-5,h*.65,m);
  const L=PO([cx,y-.5,x-.5,y+h,x+3.4,y+h,cx,y+3.6]),Rr=PO([cx,y-.5,x+w+.5,y+h,x+w-3.4,y+h,cx,y+3.6]);F(L,MM,{k:.6});F(Rr,MM.slice().reverse().map((c,i,a)=>MM[[0,0,1,2,3][i]]),{k:.6});
  if(snow){snowCap([cx,y-1,x-1,y+h,x+1.4,y+h,cx,y+2]);snowCap([cx,y-1,x+w+1,y+h,x+w-1.4,y+h,cx,y+2])}
  if(east&&h>=8){const kk=h*.4;roofSide(x-3,y+h-kk,w+6,kk,mat,1.4)}};
 const winHD=(x,y,w,h,o)=>{o=o||{};const on=o.lit===undefined?lit(.8):o.lit;
  if(east){F(RC(x-1,y-1,w+2,h+2),'dark',{k:.3});if(on){fl(x,y,w,h,lg(x,y,x,y+h,['#fff2c0','#f0b860']));glow(x+w/2,y+h/2,w+4,'rgba(255,190,90,.8)',.35)}else fl(x,y,w,h,GR(dim?'#9a8e70':'#e9e0c9'));
   for(let i=x+w/3;i<x+w-.5;i+=w/3)fl(i-.25,y,.5,h,GR('#3a2818'));for(let j=y+h/3;j<y+h-.5;j+=h/3)fl(x,j-.25,w,.5,GR('#3a2818'));return on}
  if(o.sh){const Sm=M(o.sh);for(const sx of [x-4.2,x+w+1.2]){F(RC(sx,y-1,3,h+2,.3),Sm,{k:.4,lw:LW*.8,inside:(q,MM)=>{for(let j=y+1;j<y+h;j+=2.4)ln([sx+.4,j,sx+2.6,j],.4,MM[0],.6)}})}}
  F(RC(x-1.1,y-1.1,w+2.2,h+2.2,.4),'wood',{k:.4,lw:LW});
  if(on){fl(x,y,w,h,lg(x,y,x+w,y+h,['#fff6d0','#ffd070','#e08a30']));glow(x+w/2,y+h/2,Math.max(w,h)*1.4,'rgba(255,180,80,.9)',.4)}
  else{fl(x,y,w,h,lg(x,y,x+w,y+h,[GR(dim?'#2a3a5a':'#5a8cc8'),GR(dim?'#141c30':'#22406e')]));g.save();g.beginPath();g.rect(x,y,w,h);g.clip();ln([x-1,y+h*.6,x+w*.6,y-1],1.1,'#ffffff',dim?.12:.35);ln([x+w*.3,y+h+1,x+w+1,y+h*.2],.6,'#ffffff',dim?.08:.25);g.restore()}
  const mc=GR('#3a2818');if(w>=6)fl(x+w/2-.35,y,.7,h,mc);if(h>=7)fl(x,y+h/2-.35,w,.7,mc);
  F(RC(x-2,y+h+.6,w+4,1.4,.3),snow?'white':'wood',{k:.2,lw:LW*.7});
  if(o.box){F(RC(x-1,y+h-.6,w+2,2.2,.4),'wood',{k:.3,lw:LW*.7});for(let i=0;i<w+1;i+=1.6)ell(x+i,y+h-1.2,1,.9,GR(i%3.2<1.6?'#ef8a78':'#f3d98b'));for(let i=.8;i<w;i+=2.2)ell(x+i,y+h-.6,1,.6,GR('#4f8f3a'))}
  return on};
 const door=(x,y,w,h,o)=>{o=o||{};F(RC(x-1,y-1,w+2,h+1,.4),'dark',{k:.3});F(RC(x,y,w,h,o.arch?w/2:.4),'wood',{k:.8,inside:(q,MM)=>{for(let i=x+w/(o.dbl?4:3);i<x+w-.5;i+=w/(o.dbl?4:3))ln([i,y,i,y+h],.4,MM[0],.7);
   ln([x,y+h*.3,x+w,y+h*.3],.7,GR('#2a2a34'),.9);ln([x,y+h*.75,x+w,y+h*.75],.7,GR('#2a2a34'),.9);if(o.dbl)ln([x+w/2,y,x+w/2,y+h],.6,INK)}});
  ell(x+w-2.2,y+h*.55,.6,.6,GR('#d1a94e'));if(o.dbl)ell(x+w/2-1.6,y+h*.55,.6,.6,GR('#d1a94e'));
  if(o.win){const on=lit(.9);fl(x+2,y+3,w-4,4,on?'#ffd070':GR('#2a3a5a'));if(on)glow(x+w/2,y+5,6,'rgba(255,180,80,.9)',.3);fl(x+w/2-.3,y+3,.6,4,GR('#3a2818'))}
  F(RC(x-3,y+h,w+6,1.6,.4),snow?'white':'stone',{k:.3,lw:LW*.6})};
 const lantern=(x,y,r)=>{ln([x+2.5,y-3,x+2.5,y],.6,INK);
  if(east){F(RC(x,y,5,6,2),'cloth',{k:.5,inside:(q,MM)=>{for(let j=y+1.5;j<y+6;j+=1.6)ln([x,j,x+5,j],.3,MM[0],.6)}});fl(x+.6,y-.4,3.8,.8,INK);fl(x+.6,y+5.8,3.8,.8,INK);if(lamps){glow(x+2.5,y+3,10,'rgba(255,150,70,.9)',.55);an.lamps.push({x:x+2.5,y:y+3});an.lights.push({x:x+2.5,y:y+8,r:r||22})}return}
  F(PO([x+.4,y+1,x+4.6,y+1,x+4,y+5.5,x+1,y+5.5]),'iron',{k:.3});F(PO([x-.2,y+1.2,x+2.5,y-1,x+5.2,y+1.2]),'iron',{k:.2,lw:LW*.7});
  fl(x+1.3,y+1.8,2.4,3,lamps?'#ffe08a':GR('#8d99a6'));if(lamps){glow(x+2.5,y+3.2,9,'rgba(255,190,90,.95)',.6);an.lamps.push({x:x+2.5,y:y+3.2});an.lights.push({x:x+2.5,y:y+7,r:r||22})}};
 const chimney=(x,y,w,h,smoke)=>{if(east){if(smoke)an.smoke.push({x:x+w/2,y:y+h});return}wall(x,y+2,w,h-2,'stone');F(RC(x-1,y,w+2,2.4,.3),snow?'white':'stone',{k:.3});if(smoke)an.smoke.push({x:x+w/2,y:y-1})};
 const barrel=(x,y,s)=>{s=s||1;F(RC(x,y,6*s,8*s,2.2*s),'wood',{k:.8,inside:(q,MM)=>{ln([x,y+2*s,x+6*s,y+2*s],.6,GR('#4d5a5c'));ln([x,y+6*s,x+6*s,y+6*s],.6,GR('#4d5a5c'));ln([x+3*s,y,x+3*s,y+8*s],.3,MM[1],.6)}})};
 const crate=(x,y,w,h)=>{w=w||8;h=h||7;F(RC(x,y,w,h,.4),'wood',{k:.6,inside:(q,MM)=>{ln([x+.8,y+.8,x+w-.8,y+h-.8],.6,MM[1]);ln([x+w-.8,y+.8,x+.8,y+h-.8],.6,MM[1]);g.strokeStyle=MM[1];g.lineWidth=.5;g.strokeRect(x+.8,y+.8,w-1.6,h-1.6)}})};
 const sack=(x,y)=>F(S(`M${x+1} ${y+6} Q${x-.5} ${y+2} ${x+2.4} ${y+.6} L${x+4.2} ${y+.6} Q${x+7.4} ${y+2} ${x+6} ${y+6} Z`),'canvas',{k:.6,ball:1});
 const iconAt=(name,x,y,sz)=>{const px=Math.max(16,Math.ceil(sz*k)),c=typeof pkCanvas==='function'?pkCanvas(name,px):null;if(c){g.drawImage(c,x,y,sz,sz);return true}return false};
 const sign=(sx,sy,key,hang,icon)=>{if(hang){ln([sx-1,sy-3,sx+19,sy-3],.9,INK);ln([sx+3,sy-3,sx+3,sy],.4,INK);ln([sx+15,sy-3,sx+15,sy],.4,INK)}
  F(RC(sx,sy,18,18,1.2),'wood',{k:.6,inside:()=>{}});F(RC(sx+1.4,sy+1.4,15.2,15.2,.8),east?'canvas':'vellum',{k:.8,lw:LW*.6});iconAt(icon||tvBldIcon(key),sx+2,sy+2,14);if(dark)fl(sx,sy,18,18,'rgba(10,18,40,.45)')};
 const plinth=(x,w)=>F(RC(x,yB-2,w,2.4,.3),'stone',{k:.3,lw:LW*.7});
 /* ---- the plan ---- */
 const X={},PLC=PL.places;PL.lots.forEach(L=>X[L.k]=L.x);const tcx=PLC.temple.cx,tlx=PLC.tailor.cx;
 /* ---- landmark (as the pixel scene: mill, tower, beacon, gate; the East a pagoda or castle) ---- */
 const land=east?(t.size>=3?'castle':'pagoda'):['mill','tower','beacon','gate','mill','tower','gate','beacon'][ti%8];
 const lx=(()=>{const tall=[tcx,tlx].concat(PLC.college?[PLC.college.cx]:[]),span=Math.min(W,harb-30),c=[.3,.4,.5,.6,.7].map(f=>Math.round(span*f)),far=a=>Math.min(...tall.map(q=>Math.abs(a-q))),a=c[(hs>>>16)%5];return far(a)>=46?a:c.slice().sort((p,q)=>far(q)-far(p))[0]})();
 const LH=Math.round(clamp(yB*.62,70,104)),by0=yB-6,lmM=bio==='desert'?'adobe':'stone',hzA=.18;
 g.save();g.globalAlpha=1;
 if(land==='pagoda'){let y=by0;for(let i=0;i<5;i++){const hw=13-i*2,bh=i?8:12;F(RC(lx-hw+3,y-bh,(hw-3)*2,bh),i?'cloth':'plaster',{k:.5});y-=bh;F(S(`M${lx-hw-3} ${y} Q${lx-hw+2} ${y-1} ${lx-hw+4} ${y-4} L${lx+hw-4} ${y-4} Q${lx+hw-2} ${y-1} ${lx+hw+3} ${y} Z`),'tile',{k:.5});y-=4}
  F(RC(lx-.6,y-14,1.2,14),'brass',{k:.2,lw:LW*.6});for(let j=3;j<13;j+=3)ell(lx,y-j,1.4,.6,GR('#d1a94e'))}
 else if(land==='castle'){let y=by0;F(PO([lx-20,y,lx+20,y,lx+15,y-16,lx-15,y-16]),'stone',{k:1,inside:(q,MM)=>{for(let j=y-3;j>y-16;j-=3)ln([lx-20,j,lx+20,j],.3,MM[1],.7)}});y-=16;
  for(let i=0;i<3;i++){const hw=15-i*4,bh=i===2?10:12;wall(lx-hw,y-bh,hw*2,bh,'plaster');for(let q=-hw+4;q<hw-3;q+=6)winHD(lx+q,y-bh+4,3,4,{lit:lit(.6)});y-=bh;F(S(`M${lx-hw-6} ${y} Q${lx-hw} ${y-1} ${lx-hw+1} ${y-5} L${lx+hw-1} ${y-5} Q${lx+hw} ${y-1} ${lx+hw+6} ${y} Z`),'kawara',{k:.6});y-=5}
  F(S(`M${lx-3} ${y} L${lx-4} ${y-3} L${lx-1} ${y-1} L${lx} ${y-4} L${lx+1} ${y-1} L${lx+4} ${y-3} L${lx+3} ${y} Z`),'gold',{k:.3})}
 else if(land==='mill'){const h=LH-22;F(PO([lx-6,by0-h,lx+6,by0-h,lx+8+h/9,by0,lx-8-h/9,by0]),lmM,{k:1.2,inside:(q,MM)=>{for(let j=by0-h+4;j<by0;j+=4)ln([lx-20,j,lx+20,j],.3,MM[1],.6)}});
  F(PO([lx,by0-h-10,lx+10,by0-h+.5,lx-10,by0-h+.5]),rC,{k:.6});fl(lx-1.2,by0-h+12,2.4,4,INK);fl(lx-1.2,by0-h+30,2.4,4,INK);an.mill={x:lx,y:by0-h-3,r:Math.round(LH*.26)};
  {const m=an.mill,hid=PL.lots.some(L=>{const b=PLC[L.k].box;return L.k!=='board'&&b.x<m.x+m.r+2&&b.x+b.w>m.x-m.r-2&&b.y<m.y+m.r})||[PLC.temple,PLC.tailor].some(q=>Math.abs(q.cx-m.x)<m.r+30);if(hid){an.millHid=1;tvHDSails(g,m,.4,GR,INK)}}}
 else if(land==='tower'||land==='beacon'){const h=land==='beacon'?LH-14:LH-10;wall(lx-8,by0-h,16,h,lmM);for(let i=-10;i<10;i+=4)F(RC(lx+i,by0-h-4,2.2,3,.2),lmM,{k:.2,lw:LW*.6});F(RC(lx-10,by0-h-1.4,20,2.4),lmM,{k:.3});
  fl(lx-1,by0-h+10,2,6,INK);fl(lx-1,by0-h+28,2,6,INK);
  if(land==='beacon'){F(PO([lx,by0-h-20,lx+7,by0-h-12,lx-7,by0-h-12]),rC,{k:.5});fl(lx-5,by0-h-12,1,8,GR('#4d5a5c'));fl(lx+4,by0-h-12,1,8,GR('#4d5a5c'));fl(lx-4,by0-h-11,8,7,'#ffcf5a');glow(lx,by0-h-8,16,'rgba(255,190,80,.9)',.6);an.lamps.push({x:lx,y:by0-h-8,big:1})}
  else{fl(lx-.4,by0-h-18,.8,14,GR('#4a3826'));an.flags.push({x:lx+.4,y:by0-h-18,c:TVRAMP[rC]||TVRAMP.red})}}
 else{const h=LH-22;for(const ox of [-14,16]){wall(lx+ox-5,by0-h,10,h,lmM);F(PO([lx+ox,by0-h-13,lx+ox+7,by0-h+.5,lx+ox-7,by0-h+.5]),rC,{k:.5})}
  const gh=h*.66;wall(lx-9,by0-gh,20,gh,lmM);for(let i=-9;i<11;i+=4)F(RC(lx+i,by0-gh-3,2,3,.2),lmM,{k:.2,lw:LW*.5});F(RC(lx-6,by0-22,14,22,7),'dark',{k:.4,inside:(q,MM)=>{for(let i=lx-5;i<lx+8;i+=2.4)ln([i,by0-22,i,by0],.4,GR('#2a2a34'))}})}
 g.restore();
 // haze over the landmark so it sits back
 /* ---- the back row of houses (stops at the quay) ---- */
 {const hzC=dark?'#3a4a5a':'#c9cfc4';for(let x=-rr(2,14);x<Math.min(W+10,harb-20);){const w=rr(22,34),h=rr(26,44),by=yB-3,gab=ch(.4),rk=[rA,rB,rC,'slate'][ri(0,3)],Mr=TVHR[rk].map(c=>tvMix(GR(c),horizon,.32)),Mw=(bio==='desert'?TVHR.adobe:TVHR.plaster).map(c=>tvMix(GR(c),horizon,.38));
  F(RC(x,by-h,w,h),Mw,{lw:LW*.6,k:1});
  if(gab){F(PO([x+w/2,by-h-w/2.4,x-1.5,by-h+.5,x+w+1.5,by-h+.5]),Mr,{lw:LW*.6,k:.8})}else if(bio==='desert'){F(RC(x-1,by-h-2.5,w+2,3),Mw,{lw:LW*.6})}else F(PO([x+4,by-h-10,x+w-4,by-h-10,x+w+2,by-h+.5,x-2,by-h+.5]),Mr,{lw:LW*.6,k:.8});
  for(let i=4;i<w-6;i+=rr(7,10)){const wy=by-h+rr(5,8),on=lit(.55);fl(x+i,wy,3,5,on?'#ffd070':tvMix(GR('#2a3a5a'),horizon,.3));if(on)glow(x+i+1.5,wy+2.5,5,'rgba(255,180,80,.9)',.3)}
  if(ch(.5)){const cx=x+rr(4,w-8);F(RC(cx,by-h-(gab?14:13),4,8),Mw,{lw:LW*.6,k:.3})}
  x+=w+rr(-2,10)}}
 // trees in the gaps between lots
 PL.lots.forEach((L,i)=>{const N=PL.lots[i+1];if(!N)return;const gp=N.x-(L.x+L.w);if(gp>8&&ch(.8))tree(L.x+L.w+gp/2+rr(-2,2),yB-1,rr(20,30));if(gp>44)tree(L.x+L.w+gp/4,yB-2,rr(16,24))});
 {const Fl=PL.lots[0],Z=PL.lots[PL.lots.length-1];if(Fl.x>14)tree(rr(3,8),yB,rr(22,30));if(Z.k!=='harbour'&&W-(Z.x+Z.w)>14)tree(W-rr(3,8),yB,rr(22,30))}
 /* ---- the buildings ---- */
 const B={GR,C,M,F,fl,ln,ell,glow,lg,RC,PO,S,wall,beams,roofSide,roofGable,winHD,door,lantern,chimney,barrel,crate,sack,sign,iconAt,plinth,shadowE,eavesUp,
  an,yB,W,H,east,bio,snow,dim,dark,lamps,lit,rr,ri,ch,wallM,rA,rB,rC,INK,LW,g,k,t,harb,yH,horizon,GC,tvRampName};
 const DRAW={tavern:x=>tvHDTavern(B,x),inn:x=>tvHDInn(B,x+3),market:x=>tvHDMarket(B,x+5),board:x=>tvHDBoard(B,x+3),armorer:x=>tvHDArmorer(B,x),weaponsmith:x=>tvHDSmith(B,x),fletcher:x=>tvHDFletcher(B,x),college:x=>tvHDCollege(B,x),hall:x=>tvHDHall(B,x),harbour:x=>tvHDHarbour(B,x)};
 if(east)tvHDShrine(B,tcx);else tvHDTemple(B,tcx);tvHDTailor(B,tlx);
 for(const L of PL.lots)if(L.k!=='harbour')DRAW[L.k](L.x);if(PLC.harbour)DRAW.harbour(PLC.harbour.x);
 /* ---- street props: the biggest gap gets a well, a statue or a cart (a torii in the East); a lamp post by the notice board ---- */
 {const prop=(hs>>>24)%3;let best=null;PL.lots.forEach((L,i)=>{const N=PL.lots[i+1];if(!N)return;const a=L.x+L.w,gp=N.x-a;if(!best||gp>best.g)best={g:gp,x:(a+N.x)/2}});
  if(best&&best.g>20){const x=best.x,by=yB+3;
   if(east){const hw=Math.min(13,Math.max(7,best.g/2-2));F(RC(x-hw-1,by-34,2.4,34,.4),'cloth',{k:.4});F(RC(x+hw-1.4,by-34,2.4,34,.4),'cloth',{k:.4});F(RC(x-hw-3,by-27,hw*2+6,2,.3),'cloth',{k:.3});
    F(S(`M${x-hw-7} ${by-33} Q${x} ${by-31} ${x+hw+7} ${by-33} L${x+hw+5} ${by-36.5} Q${x} ${by-34.5} ${x-hw-5} ${by-36.5} Z`),'dark',{k:.3})}
   else if(prop===0){wall(x-8,by-8,16,8,'stone');F(RC(x-9,by-9.5,18,2,.4),'stone',{k:.3});fl(x-7,by-22,1,13,GR('#7a5a38'));fl(x+6,by-22,1,13,GR('#4a3826'));F(PO([x,by-28,x+10,by-21,x-10,by-21]),rC,{k:.4});ln([x,by-21,x,by-13],.4,INK);F(RC(x-1.4,by-13,2.8,2.6,.4),'wood',{k:.2,lw:LW*.6})}
   else if(prop===1){F(RC(x-6,by-4,12,4,.4),'stone',{k:.4});F(RC(x-3,by-10,6,6,.3),'stone',{k:.4});F(S(`M${x-2} ${by-10} L${x-2} ${by-17} Q${x} ${by-22} ${x+2} ${by-17} L${x+2} ${by-10} Z`),'bronze',{k:.4});ell(x,by-20,2,2,GR('#b8742e'));ln([x+2,by-17,x+4,by-25],.7,GR('#c6d2de'))}
   else{F(RC(x-9,by-7,18,3.4,.4),'wood',{k:.4});F(RC(x-8,by-11,12,4,.6),'straw',{k:.4});for(const wx of [x-5,x+5])F(pkCirc(wx,by-2,3),'dark',{k:.4,inside:(q,MM)=>{ln([wx-2.4,by-2,wx+2.4,by-2],.4,MM[3]);ln([wx,by-4.4,wx,by+.4],.4,MM[3])}});ln([x+9,by-5.5,x+16,by-5.5],.8,GR('#7a5a38'))}}}
 {const lpx=PL.lots[PL.lots.length-1].k==='board'?X.board-3:X.board+46,x=clamp(lpx,10,W-10),by=yB+Math.round(rdH*.62);
  if(east){F(RC(x-5,by-3,11,3,.4),'stone',{k:.3});F(RC(x-2,by-16,5,13,.3),'stone',{k:.4});F(RC(x-5,by-18,11,2,.3),'stone',{k:.3});F(RC(x-4,by-25,9,7,.3),'stone',{k:.3});fl(x-2,by-23,5,3,lamps?'#ffd070':GR('#2a2a34'));
   F(S(`M${x-8} ${by-25} Q${x} ${by-27} ${x+8} ${by-25} L${x} ${by-31} Z`),'stone',{k:.3});if(lamps){glow(x+.5,by-21.5,10,'rgba(255,180,80,.9)',.55);an.lamps.push({x:x+.5,y:by-21.5});an.lights.push({x,y:by-10,r:28})}}
  else{F(RC(x-.4,by-30,1.8,30,.4),'iron',{k:.2});F(RC(x-1.4,by-2,4,2,.4),'iron',{k:.2,lw:LW*.6});F(RC(x-2,by-31,6,1,.3),'iron',{k:.2,lw:LW*.6});lantern(x-2,by-37,30);if(snow)ell(x+.5,by-38,2.8,.8,GR('#ffffff'))}}
 /* ---- the fence in front, framing foliage, ground detail ---- */
 const fy=yF+Math.round((H-yF)*.28),fx1=Math.min(W,harb-(east?6:16));
 if(east){for(let x=-2;x<fx1;x+=4){const h=10+((x*7)%3);F(RC(x,fy-h+8,1.8,h,.8),['#0d2a12','#235a26','#3f8a3a','#5f9f44','#8fc46a'],{k:.2,lw:LW*.6,noRim:1,inside:(q,MM)=>{ln([x,fy-h+11,x+1.8,fy-h+11],.3,MM[0])}})}fl(-2,fy+1,fx1+4,.8,GR('#4a3826'));fl(-2,fy+5,fx1+4,.8,GR('#4a3826'))}
 else for(let x=-3;x<fx1;x+=12){if(!ch(.12)){F(RC(x+2,fy-1,12,1.6,.3),'wood',{k:.2,lw:LW*.6});F(RC(x+2,fy+4,12,1.8,.3),'wood',{k:.2,lw:LW*.6})}F(RC(x,fy-4,3,12,.6),'wood',{k:.4,lw:LW*.7});if(snow)ell(x+1.5,fy-4.3,2,.8,GR('#ffffff'))}
 const fol=(cx2,cy2,r)=>{const c=bio==='desert'?['#5a4424','#a07a40','#c8a060','#e8c78a','#fff2d4']:snow?['#6a7a8c','#aab8c8','#d8e2ec','#ffffff','#ffffff']:bio==='swamp'?['#0c2014','#21402a','#3f6a3a','#5f8244','#a8c890']:'green';
  for(let i=0;i<9;i++){const a=R()*6.28,q=R()*r,bx=cx2+Math.cos(a)*q,by2=cy2+Math.sin(a)*q*.6,rad=rr(3,Math.max(4,r*.5));F(pkCirc(bx,by2,rad),c,{ball:1,k:.6,lw:LW*.7})}};
 const fr=clamp((H-yF)*.5,8,26);fol(2,H-2,fr);if(!PLC.harbour)fol(W-3,H-2,fr);
 const Wg=Math.min(W,harb-4);
 if(bio==='plains'||bio==='forest'||bio==='hills')for(let i=0;i<W/14;i++){const x=rr(2,Wg-3),y=rr(yF+2,H-3);ln([x,y+1.6,x,y],.4,GR('#4f8f3a'));ell(x,y,.9,.9,GR(['#ef8a78','#ecc64f','#e9e0c9','#b98cf0'][ri(0,3)]))}
 if(bio==='swamp')for(let i=0;i<W/10;i++){const x=rr(2,Wg-3),y=rr(yF+6,H-2),h=rr(5,10);ln([x,y,x+rr(-1,1),y-h],.5,GR('#5f8244'));F(RC(x-.6,y-h-2.6,1.2,3,.6),'wood',{k:.2,lw:0})}
 if(bio==='desert')for(let i=0;i<W/90;i++)cactus(rr(20,Wg-20),rr(yF+12,H-2),rr(8,12));
 if(bio==='hills'||snow)for(let i=0;i<W/60;i++){const x=rr(8,Wg-12),y=rr(yF+6,H-3),w=rr(5,9);F(S(`M${x} ${y} Q${x} ${y-4} ${x+w*.4} ${y-4.5} Q${x+w} ${y-4} ${x+w} ${y} Z`),snow?'white':'stone',{k:.5,lw:LW*.7})}
 /* ---- night: warm pools of lantern light ---- */
 if(dim){g.save();g.globalCompositeOperation='lighter';for(const L of an.lights){const q=g.createRadialGradient(L.x,L.y,0,L.x,L.y,L.r*1.15);q.addColorStop(0,dark?'rgba(255,170,80,.30)':'rgba(255,170,80,.16)');q.addColorStop(1,'rgba(255,170,80,0)');g.fillStyle=q;g.fillRect(L.x-L.r*1.2,L.y-L.r*1.2,L.r*2.4,L.r*2.4)}g.restore()}
 an.parts=snow?{k:'snow',n:0}:bio==='desert'?{k:'dust',n:8}:bio==='swamp'?{k:dim?'fly':'mote',n:dim?10:5}:bio==='forest'?{k:'leaf',n:7}:bio==='plains'?{k:'seed',n:5}:{k:'leaf',n:3};
 PK.u=pu0;return{pic:cv,an}}

/* ---------------- the buildings (B: the kit and scene facts from tvPaintHD; x = the pixel scene's drawing origin) ---------------- */
function tvHDTavern(B,x){const {F,wall,beams,roofSide,roofGable,winHD,door,lantern,chimney,barrel,fl,ln,RC,yB,wallM,rA,rB,an,snow,GR}=B,up=wallM==='stone'?'plaster':wallM;
 chimney(x+56,yB-90,9,16,1);
 wall(x+3,yB-28,72,28,'stone');wall(x+1,yB-52,76,24,up);if(up==='plaster'||up==='adobe')beams(x+1,yB-52,76,24,4);
 F(RC(x,yB-29.5,78,2.4,.4),'dark',{k:.3});for(let i=4;i<78;i+=10)F(RC(x+i,yB-27.4,2,2,.3),'dark',{k:.1,lw:B.LW*.5});
 roofSide(x-3,yB-80,84,29,rA,.55);
 roofGable(x+27,yB-75,20,10,rA,null);wall(x+29,yB-66,16,9,up);winHD(x+34,yB-64.5,6,5,{lit:B.lit(.7)});
 door(x+9,yB-23,14,23,{win:1});
 winHD(x+32,yB-21,12,11,{box:!snow});winHD(x+54,yB-21,12,11,{box:!snow});
 winHD(x+9,yB-46,9,11,{sh:rB});winHD(x+34,yB-46,9,11,{sh:rB});winHD(x+59,yB-46,9,11,{sh:rB});
 lantern(x+2,yB-22,24);
 F(RC(x+76,yB-41.5,13,1.4,.4),'iron',{k:.1,lw:B.LW*.6});ln([x+77,yB-41,x+80,yB-37],.6,B.INK);an.sign={x:x+79,y:yB-40,ic:'tavern'};
 barrel(x+68,yB-8.5);barrel(x+73,yB-6,.8);F(RC(x+28,yB-4.5,20,1.6,.3),'wood',{k:.2,lw:B.LW*.6});fl(x+29,yB-3,1.6,3,GR('#4a3826'));fl(x+45,yB-3,1.6,3,GR('#4a3826'));
 B.shadowE(x+2,yB,76)}
function tvHDInn(B,x){const {F,wall,beams,roofSide,roofGable,winHD,door,lantern,chimney,fl,ln,RC,PO,yB,wallM,rA,rB,snow,dim,GR,g,ell}=B,up=wallM==='logs'?'plaster':wallM,m2=up==='stone'?'plaster':up;
 wall(x+54,yB-26,30,26,'wood');roofSide(x+50,yB-38,36,13,'wood',.25);
 F(B.S(`M${x+62} ${yB} L${x+62} ${yB-13} Q${x+69} ${yB-21} ${x+76} ${yB-13} L${x+76} ${yB} Z`),'dark',{k:.3});F(RC(x+62,yB-4,7,4,.6),'straw',{k:.4,lw:B.LW*.6});
 chimney(x+8,yB-100,8,24,1);
 wall(x,yB-30,56,30,up==='plaster'?'plaster':up);F(RC(x,yB-5,56,5),'stone',{k:.3,lw:B.LW*.6});
 wall(x-1,yB-52,58,22,m2);if(m2==='plaster'||m2==='adobe')beams(x-1,yB-52,58,22,3);
 wall(x-1,yB-74,58,22,m2);if(m2==='plaster'||m2==='adobe')beams(x-1,yB-74,58,22,5);
 F(RC(x-2,yB-31.5,60,2.4,.3),'dark',{k:.2});F(RC(x-2,yB-53.5,60,1.6,.3),'dark',{k:.2,lw:B.LW*.6});
 roofGable(x-5,yB-104,66,31,rB,m2);F(RC(x-5,yB-74.6,66,1.4,.3),'dark',{k:.1,lw:B.LW*.5});F(RC(x+27,yB-109,2,6,.5),'brass',{k:.2,lw:B.LW*.5});
 winHD(x+24.5,yB-89,7,7,{});
 door(x+19,yB-24,18,24,{dbl:1,arch:1});
 F(RC(x+16.5,yB-37,23,8,.6),'dark',{k:.3});F(RC(x+17.5,yB-36,21,6,.4),'brass',{k:.4,inside:()=>{g.save();g.fillStyle=GR('#3a2c12');g.font='bold 5.2px Georgia,serif';g.textAlign='center';g.textBaseline='middle';g.fillText('INN',x+28,yB-32.8);g.restore()}});
 winHD(x+5,yB-22,9,11);winHD(x+42,yB-22,9,11);
 winHD(x+5,yB-47,9,11,{sh:rA});winHD(x+42,yB-47,9,11,{sh:rA});winHD(x+23,yB-47,10,11,{box:!snow});
 winHD(x+10,yB-69,9,11);winHD(x+37,yB-69,9,11);
 ln([x+24.5,yB-72,x+33.5,yB-72],.6,B.INK);F(PO([x+26,yB-71.5,x+32,yB-71.5,x+32,yB-57,x+29,yB-59.5,x+26,yB-57]),rA,{k:.4,inside:()=>{ell(x+29,yB-65,1.4,1.4,GR('#fff4c8'))}});
 lantern(x+12,yB-18,22);lantern(x+39,yB-18,22);
 B.shadowE(x-1,yB,86)}
function tvHDMarket(B,x){const {F,fl,ln,RC,PO,S,yB,east,rC,GR,ell,lamps,glow,an,crate,sack,snow}=B,by=yB+2;
 F(RC(x-1.6,by-58,1.8,58,.4),'wood',{k:.2,lw:B.LW*.6});F(RC(x+79.4,by-58,1.8,58,.4),'wood',{k:.2,lw:B.LW*.6});
 {const pts=[];for(let i=0;i<=80;i+=2)pts.push(x+i,by-57+Math.sin(i/80*Math.PI)*5);ln(pts,.4,B.INK);for(let i=3;i<80;i+=7){const sg=Math.sin(i/80*Math.PI)*5,c=['#c4493f','#ecc64f','#58b39c','#62a6ee','#e9e0c9'][(i/7|0)%5];F(PO([x+i-1.6,by-57+sg,x+i+1.6,by-57+sg,x+i,by-53+sg]),[c,c,c,c,c].map((q,j)=>j<2?GR('#3a2c12'):GR(q)),{k:.2,lw:B.LW*.5,noRim:1})}}
 const AW=east?[['#62a6ee','#e9e0c9'],['#c4493f','#e9e0c9']]:[['#c4493f','#e9e0c9'],[null,'#e9e0c9']];
 [0,42].forEach((ox,si)=>{const sx=x+ox;
  fl(sx+2,by-32,34,20,GR('#3a2c12'));fl(sx+2,by-32,34,20,B.lg(sx,by-32,sx,by-12,['rgba(0,0,0,.4)','rgba(0,0,0,0)']));
  if(si===0){for(let i=0;i<3;i++){ln([sx+7.5+i*5,by-30,sx+7.5+i*5,by-28],.4,B.INK);F(RC(sx+6+i*5,by-28,3,5.4,1.2),'meat',{k:.3,lw:B.LW*.6})}F(B.pkCircS?null:RC(sx+24,by-27,5,4,2),'green',{k:.3,lw:B.LW*.6})}
  else{F(B.S(`M${sx+6} ${by-28} Q${sx+8.5} ${by-31} ${sx+11} ${by-28} L${sx+10} ${by-24} L${sx+7} ${by-24} Z`),'steel',{k:.4,lw:B.LW*.6});F(RC(sx+17.6,by-30,1.2,8,.4),'steel',{k:.1,lw:B.LW*.5});F(RC(sx+16,by-22.4,4.4,1.2,.4),'brass',{k:.1,lw:B.LW*.5});F(RC(sx+25,by-28,5,6,.5),'leather',{k:.3,lw:B.LW*.6})}
  if(si===0){F(pkCirc(sx+17.5,by-22.5,2.6),'skin',{ball:1,k:.3,lw:B.LW*.6});F(RC(sx+15,by-25.6,5,2,1),'dark',{k:.1,lw:0});ell(sx+16.5,by-22.4,.35,.45,B.INK);ell(sx+18.5,by-22.4,.35,.45,B.INK);F(B.S(`M${sx+12} ${by-12} Q${sx+12} ${by-19.6} ${sx+17.5} ${by-19.6} Q${sx+23} ${by-19.6} ${sx+23} ${by-12} Z`),'teal',{k:.6,lw:B.LW*.6})}
  F(RC(sx+1,by-14.2,36,3,.4),'wood',{k:.3,lw:B.LW*.7});F(RC(sx+1,by-11.4,36,11.4,.2),'wood',{k:.8,inside:(q,MM)=>{for(let i=sx+6;i<sx+36;i+=6)ln([i,by-11,i,by],.4,MM[0],.7)}});
  if(si===0){for(let i=0;i<4;i++)F(pkCirc(sx+4+i*1.8,by-15.6,1.1),'cloth',{ball:1,k:.2,lw:B.LW*.4});for(let i=0;i<3;i++)F(pkCirc(sx+25+i*2.4,by-15.6,1.3),'green',{ball:1,k:.2,lw:B.LW*.4});F(RC(sx+32,by-17,4,2.6,.6),'brass',{k:.2,lw:B.LW*.5})}
  else{F(RC(sx+3,by-17.4,5,3,.4),'blue',{k:.2,lw:B.LW*.5});F(RC(sx+9,by-16.4,5,2,.4),'cloth',{k:.2,lw:B.LW*.5});F(RC(sx+15,by-17.4,4,3,.4),'purple',{k:.2,lw:B.LW*.5});F(pkCirc(sx+29.5,by-16,1.8),'gold',{ball:1,k:.2,lw:B.LW*.5});F(RC(sx+32,by-16.4,3,2,.4),'brass',{k:.2,lw:B.LW*.5})}
  F(RC(sx+1,by-34,2,34,.3),'wood',{k:.2,lw:B.LW*.6});F(RC(sx+35,by-34,2,34,.3),'wood',{k:.2,lw:B.LW*.6});
  // the striped awning, scalloped at the front
  const A=AW[si],y0=by-46,y1=by-34;
  for(let i=0;i<8;i++){const a=sx-1+i*5,col=i%2?A[1]:(A[0]||'#58b39c');const p=new Path2D();p.moveTo(a+1.2,y0);p.lineTo(a+6.2,y0);p.lineTo(a+5.8+.6,y1);p.quadraticCurveTo(a+3.4,y1+2.4,a+.4,y1);p.closePath();g2(B,p,[GR(col),GR(tvMix(col,'#000000',.25))],y0,y1)}
  ln([sx-1,y0,sx+39.4,y0],.7,B.INK);if(snow)F(RC(sx-1,y0-1.4,40,2,.8),'white',{k:.2,lw:B.LW*.5})});
 if(lamps){F(RC(x+39,by-30,3,3,.5),'iron',{k:.1,lw:B.LW*.5});fl(x+39.6,by-29.4,1.8,1.8,'#ffe08a');glow(x+40.5,by-28.5,9,'rgba(255,190,90,.95)',.6);an.lamps.push({x:x+40.5,y:by-28.5});an.lights.push({x:x+40,y:by-18,r:26})}
 crate(x+36,by-7);sack(x-6,by-6);crate(x+78,by-7);crate(x+80,by-13,6,6);sack(x+86,by-6);
 B.shadowE(x-4,by,92)}
function g2(B,p,cols,y0,y1){const g=B.g;g.fillStyle=B.lg(0,y0,0,y1,cols);g.fill(p);g.lineWidth=B.LW*.6;g.strokeStyle=B.INK;g.stroke(p)}
function tvHDBoard(B,x){const {F,fl,ln,RC,yB,rC,roofSide,GR,t,PO}=B,by=yB+6,nP=clamp(t.contracts?t.contracts.length:0,0,5);
 F(RC(x+3,by-40,3,40,.4),'wood',{k:.3,lw:B.LW*.7});F(RC(x+32,by-40,3,40,.4),'wood',{k:.3,lw:B.LW*.7});F(RC(x+1,by-2,7,2,.3),'stone',{k:.2,lw:B.LW*.5});F(RC(x+30,by-2,7,2,.3),'stone',{k:.2,lw:B.LW*.5});
 F(RC(x,by-38,38,28,.6),'dark',{k:.5});F(RC(x+2,by-36,34,24,.3),'wood',{k:.8,inside:(q,MM)=>{for(let j=by-31;j<by-12;j+=6)ln([x+2,j,x+36,j],.4,MM[0],.6)}});
 roofSide(x-3,by-47,44,9,rC,.5);
 const slots=[[4,-34],[14,-35],[25,-34],[5,-23],[16,-22],[26,-23]];
 for(let i=0;i<nP+1&&i<6;i++){const [sx,sy]=slots[i],px=x+sx,py=by+sy,old=i>=nP,a=((i*37)%7-3)*1.6;g3(B,px+4,py+4.5,a,()=>{F(RC(-4,-4.5,8,9,.3),old?'canvas':'vellum',{k:.4,lw:B.LW*.6,inside:(q,MM)=>{for(let j=-2;j<3;j+=1.6)ln([-2.8,j,j>2?0:2.8,j],.35,MM[1],.8)}});F(pkCirc(0,-4,.8),old?'bronze':'cloth',{ball:1,k:.1,lw:B.LW*.4});
   const tc=!old&&t.contracts[i],tr=tc&&tc.rtook!=null&&typeof lkRival==='function'?lkRival(tc.rival):null;if(tr){ln([-4,-4,4,4],.7,GR('#c4493f'));const A=typeof BANNERC==='object'&&BANNERC[tr.c1]?PAL[BANNERC[tr.c1].r[1]]:'#c4493f';F(PO([-1,-6,4,-5,-1,-2]),[A,A,A,A,A].map(GR),{k:.1,lw:B.LW*.5})}})}
 B.shadowE(x,by,38)}
function g3(B,x,y,a,fn){const g=B.g;g.save();g.translate(x,y);g.rotate(a*Math.PI/180);fn();g.restore()}
function tvHDTemple(B,cx){const {F,fl,ln,RC,PO,S,yB,wall,roofGable,GR,bio,snow,an,lamps,glow,ell}=B,m=bio==='desert'?'adobe':'stone',rT=bio==='desert'?'clay':bio==='forest'||bio==='swamp'?'blue':'verd',by=yB-3,w=44,x=cx-22,wh=58,ty=by-wh,ap=ty-24;
 wall(x,ty,w,wh+3,m);
 for(const sx of [x-3,x+w-1]){F(PO([sx,ty+8,sx+4,ty+8,sx+4.6,yB,sx-.6,yB]),m,{k:.4,inside:(q,MM)=>{for(let j=ty+14;j<yB;j+=7)ln([sx-1,j,sx+5,j],.5,MM[1])}})}
 roofGable(x-5,ap,w+10,25,rT,m);F(RC(x-5,ty+.4,w+10,1.6,.3),'dark',{k:.1,lw:B.LW*.6});
 // lancet window: stained glass in brass tracery, lit all day
 const wy=ty-9,lan=S(`M${cx-4.6} ${wy+21} L${cx-4.6} ${wy+5} Q${cx-4.6} ${wy-1} ${cx} ${wy-2.4} Q${cx+4.6} ${wy-1} ${cx+4.6} ${wy+5} L${cx+4.6} ${wy+21} Z`);
 F(lan,'stone',{k:.3,lw:B.LW*1.2});B.g.save();B.g.clip(lan.p);fl(cx-5,wy-3,10,25,B.lg(cx,wy,cx,wy+21,['#fff4c8','#ffd070','#e09040']));
 for(const [px,py,c] of [[-4,4,'#c4493f'],[1,4,'#62a6ee'],[-4,12,'#62a6ee'],[1,12,'#c4493f'],[-1.5,8,'#9bd96f']])fl(cx+px,py+wy,3,4,c,.85);ln([cx,wy-3,cx,wy+22],.6,'#8a6a2a');ln([cx-5,wy+10,cx+5,wy+10],.6,'#8a6a2a');B.g.restore();glow(cx,wy+10,16,'rgba(255,200,120,.9)',lamps?.45:.15);
 F(RC(cx-6,wy+21,12,1.6,.3),snow?'white':m,{k:.2,lw:B.LW*.6});
 for(const ox of [-14,12]){F(pkCirc(cx+ox+1.5,ty+12,2.2),'stone',{k:.2,lw:B.LW*.6});ell(cx+ox+1.5,ty+12,1.3,1.3,'#ffd070')}
 // bell-cote with a cap and a cross
 const cy=ap-10;wall(cx-6,cy,12,14,m);F(RC(cx-7,cy+13,14,1.8,.3),m,{k:.2,lw:B.LW*.6});fl(cx-3,cy+3,6,9,GR('#101d1c'));F(S(`M${cx-2} ${cy+9} Q${cx-2} ${cy+5} ${cx} ${cy+5} Q${cx+2} ${cy+5} ${cx+2} ${cy+9} L${cx+2.4} ${cy+10} L${cx-2.4} ${cy+10} Z`),'brass',{k:.3,lw:B.LW*.6});
 F(PO([cx,cy-7,cx+8,cy+.5,cx-8,cy+.5]),rT,{k:.4});F(RC(cx-.8,cy-14,1.6,7.5,.3),'gold',{k:.1,lw:B.LW*.5});F(RC(cx-3,cy-12,6,1.6,.3),'gold',{k:.1,lw:B.LW*.5});
 if(lamps)an.lights.push({x:cx,y:ty+4,r:18});an.bell={x:cx,y:cy+5,hd:1}}
function tvHDShrine(B,cx){const {F,fl,ln,RC,S,yB,wall,GR,snow,an,lamps,glow,lit,eavesUp}=B,by=yB-3,w=48,x=cx-24,wh=34,ty=by-wh;
 for(let j=0;j<5;j++)F(RC(x-4+j,by+1-j,w+8-j*2,1.4,.2),'stone',{k:.1,lw:B.LW*.5});wall(x,ty,w,wh-4,'plaster');for(let i=0;i<w;i+=8)F(RC(x+i,ty,3,wh-4,.3),'cloth',{k:.3,lw:B.LW*.6});
 for(let i=4;i<w-4;i+=8){const on=lit(.9);fl(x+i,ty+6,4,14,on?'#ffe0a0':GR('#e9e0c9'));if(on)B.glow(x+i+2,ty+13,7,'rgba(255,190,90,.9)',.3);ln([x+i+2,ty+6,x+i+2,ty+20],.3,GR('#3a2818'))}
 F(RC(x,ty-1,w,2.4,.3),'dark',{k:.1});
 const rh=22,ww=w/2+8;F(S(`M${cx-ww-2} ${ty} Q${cx-ww*.55} ${ty-2} ${cx-ww*.3} ${ty-rh} L${cx+ww*.3} ${ty-rh} Q${cx+ww*.55} ${ty-2} ${cx+ww+2} ${ty} Z`),'tile',{k:1.4,inside:(q,MM)=>{for(let j=ty-rh+3;j<ty;j+=2.6)ln([cx-ww,j,cx+ww,j],.35,MM[0],.6);if(snow)fl(cx-ww,ty-rh,ww*2,rh*.4,GR('#ffffff'))}});eavesUp(cx-ww-2,cx+ww+2,ty-.6,B.M('tile'));
 F(RC(cx-9,ty-rh-2,18,2.4,.4),'dark',{k:.1});
 const bx=cx,byy=ty-rh-14;F(S(`M${bx-9} ${byy+5} Q${bx-5} ${byy+4} ${bx-3} ${byy} L${bx+3} ${byy} Q${bx+5} ${byy+4} ${bx+9} ${byy+5} Z`),'tile',{k:.4});F(RC(bx-5.4,byy+5,1,9,.3),'cloth',{k:.1,lw:B.LW*.5});F(RC(bx+4.4,byy+5,1,9,.3),'cloth',{k:.1,lw:B.LW*.5});
 F(S(`M${bx-2} ${byy+10} Q${bx-2} ${byy+6} ${bx} ${byy+6} Q${bx+2} ${byy+6} ${bx+2} ${byy+10} L${bx+2.4} ${byy+11} L${bx-2.4} ${byy+11} Z`),'bronze',{k:.3,lw:B.LW*.6});
 if(lamps)an.lights.push({x:cx,y:ty+4,r:18});an.bell={x:bx,y:byy+6,hd:1}}
function tvHDTailor(B,cx){const {F,fl,ln,RC,yB,wall,beams,roofGable,winHD,wallM,GR,an,lamps,dim,east}=B,w=40,x=cx-20,by=yB-3,m2=wallM==='stone'||wallM==='logs'?'plaster':wallM,gT=by-30,uT=by-62,rT=uT-23;
 wall(x+2,gT,w-4,31,'stone');wall(x,uT,w,32,m2);if(m2==='plaster'||m2==='adobe')beams(x,uT,w,32,3);
 F(RC(x-2,gT-1.5,w+4,2.4,.3),'dark',{k:.2});
 roofGable(x-4,rT,w+8,24,'plum',m2);F(RC(x-4,uT-.6,w+8,1.4,.3),'dark',{k:.1,lw:B.LW*.5});
 winHD(cx-3,rT+11,6,6,{lit:B.lit(.6)});winHD(x+5,uT+6,9,10,{sh:'plum'});winHD(x+w-14,uT+6,9,10,{sh:'plum'});
 F(RC(x+16,uT+6,8,11,.3),'wood',{k:.2,lw:B.LW*.7});fl(x+17,uT+7,6,9,GR(dim?'#2a2a34':'#101d1c'));[['#c4493f','#ef8a78'],['#62a6ee','#8fd8ff'],['#ecc64f','#fff4c8']].forEach((c,i)=>F(RC(x+17.2+i*2,uT+9,1.8,7,.4),[GR('#000000'),GR(c[0]),GR(c[0]),GR(c[1]),GR(c[1])],{k:.1,lw:B.LW*.4}));
 F(RC(x-15,uT+2.6,16,1.2,.4),'wood',{k:.1,lw:B.LW*.6});
 [[x-14,'#c4493f',13],[x-9,'#62a6ee',10],[x-4,'#ecc64f',12]].forEach(([cx2,c,L])=>{const p=new Path2D();p.moveTo(cx2,uT+3.8);p.lineTo(cx2+3.6,uT+3.8);p.quadraticCurveTo(cx2+4.4,uT+4+L*.5,cx2+3.6,uT+4+L);p.lineTo(cx2+2.6,uT+3+L);p.lineTo(cx2+1.8,uT+4+L);p.lineTo(cx2+1,uT+3+L);p.lineTo(cx2,uT+4+L);p.quadraticCurveTo(cx2+.8,uT+4+L*.5,cx2,uT+3.8);p.closePath();g2(B,p,[GR(tvMix(c,'#ffffff',.25)),GR(c),GR(tvMix(c,'#000000',.35))],uT,uT+L)});
 F(RC(x+w,uT+4.6,9,1,.3),'iron',{k:.1,lw:B.LW*.5});B.sign(x+w+.5,uT+7,'tailor',0,'tailor');
 if(lamps)an.lights.push({x:cx,y:uT+12,r:16})}
/* the new buildings */
function tvHDArmorer(B,x){const {F,fl,ln,RC,PO,S,yB,wall,beams,roofSide,winHD,door,chimney,GR,east,dim,lit,an,lamps,glow,snow,wallM,ell}=B,shop=wallM==='logs'||wallM==='wood'?'stone':wallM;
 chimney(x+46,yB-72,7,12,1);wall(x+12,yB-46,44,46,shop);if(shop==='plaster'||shop==='adobe')beams(x+12,yB-46,44,46,3);
 roofSide(x+8,yB-62,52,17,east?'kawara':'slate',.45);
 // the display window: helmets on a shelf, mail hung below
 const on=lit(.8);F(RC(x+15.6,yB-33.4,21.8,15.8,.4),'dark',{k:.3});fl(x+17,yB-32,19,13,on?B.lg(x,yB-32,x,yB-19,['#ffe7a8','#d89a48']):GR(dim?'#1a2030':'#22303a'));if(on)glow(x+26,yB-26,14,'rgba(255,190,90,.9)',.35);
 F(RC(x+17,yB-25.4,19,1.2,.2),'wood',{k:.1,lw:B.LW*.5});
 for(let i=0;i<3;i++){const hx=x+20.5+i*6,hy=yB-25.4;if(east)tvHDKabuto(B,hx,hy,.55);else if(i===1)F(S(`M${hx-2.6} ${hy} L${hx-2.6} ${hy-3} Q${hx-2.6} ${hy-6} ${hx} ${hy-6} Q${hx+2.6} ${hy-6} ${hx+2.6} ${hy-3} L${hx+2.6} ${hy} L${hx+.6} ${hy} L${hx+.4} ${hy-3} L${hx-.4} ${hy-3} L${hx-.6} ${hy} Z`),'steel',{k:.4,lw:B.LW*.6});
  else F(S(`M${hx-2.6} ${hy} L${hx-2.6} ${hy-4} Q${hx-2.6} ${hy-6.2} ${hx} ${hy-6.2} Q${hx+2.6} ${hy-6.2} ${hx+2.6} ${hy-4} L${hx+2.6} ${hy} Z`),'steel',{k:.4,lw:B.LW*.6,inside:()=>{ln([hx-2,hy-3.4,hx+2,hy-3.4],.6,B.INK)}})}
 g2(B,(()=>{const p=new Path2D();p.rect(x+19,yB-23.6,15,4);return p})(),[GR('#8d99a6'),GR('#4d5a5c')],yB-24,yB-19);
 F(RC(x+15,yB-18.2,23,1.4,.3),snow?'white':'wood',{k:.1,lw:B.LW*.6});
 B.sign(x+38,yB-44,'armorer');door(x+41,yB-22,11,22,{});
 // a stand out front: plate cuirass over mail, a helmet on top
 tvHDManq(B,x+5.5,yB);
 if(lamps)an.lights.push({x:x+26,y:yB-24,r:18});B.shadowE(x+2,yB,54)}
function tvHDKabuto(B,cx,by,s){const {F,S}=B;s=s||1;F(S(`M${cx-4*s} ${by} Q${cx-4.4*s} ${by-5*s} ${cx} ${by-5.6*s} Q${cx+4.4*s} ${by-5*s} ${cx+4*s} ${by} Q${cx} ${by-1.4*s} ${cx-4*s} ${by} Z`),'cloth',{k:.3,lw:B.LW*.6});
 F(S(`M${cx-.6*s} ${by-5*s} Q${cx-3*s} ${by-8*s} ${cx-4.2*s} ${by-10*s} Q${cx-1.4*s} ${by-8.6*s} ${cx} ${by-5.6*s} Q${cx+1.4*s} ${by-8.6*s} ${cx+4.2*s} ${by-10*s} Q${cx+3*s} ${by-8*s} ${cx+.6*s} ${by-5*s} Z`),'gold',{k:.2,lw:B.LW*.5})}
function tvHDManq(B,cx,by){const {F,RC,S,ln,east,GR,fl}=B;F(RC(cx-3.6,by-1.4,7.2,1.6,.4),'dark',{k:.1,lw:B.LW*.6});F(RC(cx-.5,by-6,1,5,.2),'wood',{k:.1,lw:B.LW*.5});
 F(S(`M${cx-4.4} ${by-6} L${cx-4.8} ${by-10} L${cx+4.8} ${by-10} L${cx+4.4} ${by-6} Z`),east?'cloth':'iron',{k:.3,lw:B.LW*.6,inside:(q,MM)=>{for(let j=by-9.4;j<by-6;j+=1)for(let i=cx-4.4;i<cx+4.4;i+=1)B.ell(i+(j*2%2)*.5,j,.4,.35,MM[3],.6)}});
 F(S(`M${cx-5.6} ${by-17} Q${cx-5.4} ${by-19.4} ${cx-3} ${by-19.6} L${cx+3} ${by-19.6} Q${cx+5.4} ${by-19.4} ${cx+5.6} ${by-17} L${cx+4.4} ${by-10} Q${cx} ${by-8.8} ${cx-4.4} ${by-10} Z`),east?'cloth':'steel',{k:.8,lw:B.LW*.7,inside:(q,MM)=>{ln([cx,by-19.4,cx,by-10],.4,MM[1],.8);if(east)for(let j=by-17.5;j<by-10;j+=1.8)ln([cx-5,j,cx+5,j],.4,MM[0],.7)}});
 for(const d of [-1,1])F(B.pkEll?null:S(`M${cx+d*3} ${by-19.8} Q${cx+d*7.2} ${by-20} ${cx+d*7} ${by-16.4} L${cx+d*4.6} ${by-17.6} Z`),east?'cloth':'steel',{k:.3,lw:B.LW*.6});
 F(RC(cx-.6,by-21.4,1.2,2,.2),'wood',{k:.1,lw:B.LW*.4});
 if(east)tvHDKabuto(B,cx,by-21.2,.75);else F(S(`M${cx-3.2} ${by-21} L${cx-3.2} ${by-25} Q${cx-3.2} ${by-28} ${cx} ${by-28} Q${cx+3.2} ${by-28} ${cx+3.2} ${by-25} L${cx+3.2} ${by-21} Z`),'steel',{k:.5,lw:B.LW*.7,inside:()=>{fl(cx-2.6,by-25,5.2,.8,B.INK);fl(cx-.3,by-25,.6,3.4,B.INK)}})}
function tvHDSmith(B,x){const {F,fl,ln,RC,PO,S,yB,wall,beams,roofSide,winHD,door,GR,east,dark,an,lamps,glow,snow,wallM,ell}=B,shop=wallM==='logs'||wallM==='wood'?'stone':wallM;
 wall(x+24,yB-44,36,44,shop);if(shop==='plaster'||shop==='adobe')beams(x+24,yB-44,36,44,2);roofSide(x+20,yB-60,44,17,east?'kawara':'slate',.45);
 winHD(x+50,yB-38,6,6,{});door(x+48,yB-22,10,22,{});B.sign(x+27,yB-43,'weaponsmith');
 // the rack: swords, an axe, a spear
 F(RC(x+27,yB-24,18,1.8,.3),'wood',{k:.1,lw:B.LW*.6});F(RC(x+27,yB-6,18,1.8,.3),'wood',{k:.1,lw:B.LW*.6});F(RC(x+27,yB-24,1.4,24,.3),'wood',{k:.1,lw:B.LW*.5});F(RC(x+43.6,yB-24,1.4,24,.3),'wood',{k:.1,lw:B.LW*.5});
 for(let i=0;i<4;i++){const bx=x+30.4+i*3,top=yB-30+(i&1)*2;F(east&&i%2?S(`M${bx-.7} ${yB-11} L${bx-.7} ${top+2} Q${bx} ${top-1} ${bx+1} ${top} L${bx+.7} ${yB-11} Z`):S(`M${bx-.8} ${yB-11} L${bx-.8} ${top+2} L${bx} ${top} L${bx+.8} ${top+2} L${bx+.8} ${yB-11} Z`),'steel',{k:.2,lw:B.LW*.5});
  F(RC(bx-1.8,yB-11.4,3.6,1,.3),'brass',{k:.1,lw:B.LW*.4});F(RC(bx-.5,yB-10.4,1,3,.3),'leather',{k:.1,lw:B.LW*.4})}
 F(RC(x+41.6,yB-36,1,34,.3),'wood',{k:.1,lw:B.LW*.4});F(PO([x+42.1,yB-40,x+43.4,yB-36.4,x+40.8,yB-36.4]),'steel',{k:.1,lw:B.LW*.5});F(S(`M${x+42} ${yB-29} Q${x+38} ${yB-28.6} ${x+38.6} ${yB-25} Q${x+40} ${yB-26} ${x+42} ${yB-25.6} Z`),'steel',{k:.2,lw:B.LW*.5});
 // the lean-to over the forge
 F(PO([x-1,yB-34,x+28,yB-41.4,x+28,yB-38.4,x-1,yB-31]),'wood',{k:.4,inside:(q,MM)=>{for(let i=x+3;i<x+28;i+=4)ln([i,yB-35,i,yB-31],.35,MM[0],.6)}});if(snow)F(PO([x-1,yB-34.6,x+28,yB-42,x+28,yB-40.4,x-1,yB-33]),'white',{k:.1,lw:B.LW*.5});
 F(RC(x+1,yB-31.6,2,31.6,.4),'wood',{k:.2,lw:B.LW*.6});
 // the hood and chimney, the hearth with its fire
 F(PO([x+6,yB-52,x+15,yB-52,x+15,yB-18,x+18,yB-12,x+3,yB-12,x+6,yB-18]),'stone',{k:.8,inside:(q,MM)=>{for(let j=yB-49;j<yB-12;j+=3.2)ln([x+3,j,x+18,j],.3,MM[1],.7)}});F(RC(x+5,yB-53.4,11,2.4,.3),snow?'white':'stone',{k:.2,lw:B.LW*.6});an.smoke.push({x:x+10.5,y:yB-54});
 F(RC(x+3,yB-12,15,12,.4),'stone',{k:.6});F(B.S(`M${x+6} ${yB-4} L${x+6} ${yB-8} Q${x+10.5} ${yB-12} ${x+15} ${yB-8} L${x+15} ${yB-4} Z`),'dark',{k:.1});
 fl(x+6.6,yB-8.6,7.8,4.2,B.lg(x,yB-9,x,yB-4,['#fff2a0','#ff9a30','#c4401a']));glow(x+10.5,yB-7,dark?22:14,'rgba(255,140,50,.95)',.7);an.sparks.push({x:x+10.5,y:yB-9});an.lights.push({x:x+10.5,y:yB-8,r:dark?24:16});
 // anvil on a block
 F(RC(x+18.5,yB-3.4,5,3.4,.4),'dark',{k:.2,lw:B.LW*.6});F(S(`M${x+15.6} ${yB-6} L${x+24.6} ${yB-6} L${x+24} ${yB-4.4} L${x+21.6} ${yB-3.4} L${x+19.4} ${yB-3.4} L${x+18} ${yB-4.6} Q${x+16.4} ${yB-4.8} ${x+15.6} ${yB-6} Z`),'iron',{k:.4,lw:B.LW*.6});
 ln([x+23,yB-7.4,x+26,yB-9.4],.7,GR('#5c3a1f'));F(RC(x+25,yB-10.6,2.4,1.6,.3),'iron',{k:.1,lw:B.LW*.4});
 B.shadowE(x,yB,60)}
function tvHDFletcher(B,x){const {F,fl,ln,RC,PO,S,yB,wall,beams,roofSide,door,GR,east,bio,an,lamps,wallM,barrel,ell}=B,m=wallM==='stone'?'wood':wallM;
 wall(x+4,yB-40,40,40,m);if(m==='plaster'||m==='adobe')beams(x+4,yB-40,40,40,3);
 roofSide(x,yB-56,48,17,east?'kawara':bio==='desert'?'clay':'thatch',.45);
 // the open hatch: bows, a quiver
 F(RC(x+7,yB-31.4,20,17.4,.3),'dark',{k:.3});fl(x+8,yB-30,18,15,GR('#1c140c'));F(RC(x+6,yB-14.2,22,2.2,.3),'wood',{k:.2,lw:B.LW*.6});F(RC(x+6,yB-33.4,22,2.4,.3),'wood',{k:.2,lw:B.LW*.6});
 for(let b=0;b<3;b++){const bx=x+11.5+b*5;const p=new Path2D();p.moveTo(bx,yB-29.4);p.quadraticCurveTo(bx-6.2,yB-22.5,bx,yB-15.6);ln([bx,yB-29.4,bx,yB-15.6],.3,GR('#e9e0c9'));B.g.save();B.g.lineWidth=1.3;B.g.strokeStyle=B.INK;B.g.stroke(p);B.g.lineWidth=.8;B.g.strokeStyle=GR(b===1?'#bd8a52':'#8c5e34');B.g.stroke(p);B.g.restore()}
 F(RC(x+21.6,yB-26,3.4,9,.8),'leather',{k:.3,lw:B.LW*.6});for(let i=0;i<3;i++){ln([x+22.4+i,yB-26,x+22.4+i,yB-29],.3,GR('#bd8a52'));F(PO([x+21.8+i,yB-29,x+23+i,yB-29,x+22.4+i,yB-30.8]),i%2?'white':'cloth',{k:.1,lw:B.LW*.3})}
 B.sign(x+27,yB-39,'fletcher',0,typeof pkHas==='function'&&pkHas('ranged')?'ranged':null);door(x+31,yB-20,10,20,{});
 // a barrel of arrows
 barrel(x+8,yB-8);for(let i=0;i<4;i++){const ax=x+9.4+i*1.1;ln([ax,yB-7.6,ax+(i-1.5)*.6,yB-14],.4,GR('#bd8a52'));F(PO([ax+(i-1.5)*.6-.7,yB-14,ax+(i-1.5)*.6+.7,yB-14,ax+(i-1.5)*.6,yB-16]),i%2?'white':'cloth',{k:.1,lw:B.LW*.3})}
 // a straw target on its easel, an arrow in the gold
 const cx=x+49,cy=yB-14;ln([cx,cy,cx-4.4,yB],.9,GR('#7a5a38'));ln([cx,cy,cx+4.4,yB],.9,GR('#5c3a1f'));
 F(pkCirc(cx,cy,5.4),'straw',{k:.6,lw:B.LW*.8,inside:()=>{ell(cx,cy,4.4,4.4,GR('#e9e0c9'));ell(cx,cy,3.4,3.4,GR('#c4493f'));ell(cx,cy,2.3,2.3,GR('#e9e0c9'));ell(cx,cy,1.2,1.2,GR('#ecc64f'))}});
 ln([cx+.6,cy-.6,cx+6,cy-5.4],.5,GR('#bd8a52'));F(PO([cx+5.4,cy-5,cx+7.4,cy-5.8,cx+6.6,cy-6.6]),'cloth',{k:.1,lw:B.LW*.3});
 B.shadowE(x+2,yB,50)}
function tvHDCollege(B,x){const {F,fl,ln,RC,PO,S,yB,wall,roofSide,winHD,GR,east,snow,dim,lit,an,lamps,glow,bio,ell}=B,cx=x+22,tw=18,tx=cx-9,tt=yB-86,stn=bio==='desert'?'adobe':'stone';
 wall(x+2,yB-28,40,28,stn);roofSide(x-1,yB-40,46,13,east?'kawara':'blue',.45);winHD(x+5,yB-21,5,8,{});winHD(x+35,yB-21,5,8,{});
 wall(tx,tt,tw,yB-tt,stn);F(RC(tx-2,tt-2,tw+4,3,.3),stn,{k:.3});for(let i=tx-1;i<tx+tw+1;i+=3)F(RC(i,tt+1,1.4,1.6,.2),stn,{k:.1,lw:B.LW*.4});
 if(east){let y=tt-2;for(let i=0;i<3;i++){const hw=13-i*3;F(S(`M${cx-hw-3} ${y} Q${cx-hw+1} ${y-1} ${cx-hw+3} ${y-5} L${cx+hw-3} ${y-5} Q${cx+hw-1} ${y-1} ${cx+hw+3} ${y} Z`),'kawara',{k:.6});y-=5;if(i<2){wall(cx-hw+4,y-5,(hw-4)*2,5,'plaster');F(RC(cx-hw+4,y-5,1.2,5,.2),'cloth',{k:.1,lw:B.LW*.4});F(RC(cx+hw-5.2,y-5,1.2,5,.2),'cloth',{k:.1,lw:B.LW*.4});y-=5}}
  F(RC(cx-.7,y-10,1.4,10,.3),'brass',{k:.1,lw:B.LW*.5});for(let j=2;j<9;j+=3)ell(cx,y-j,1.6,.6,GR('#d1a94e'))}
 else{F(S(`M${cx} ${tt-28} Q${cx-4} ${tt-12} ${cx-tw/2-3.4} ${tt-1} L${cx+tw/2+3.4} ${tt-1} Q${cx+4} ${tt-12} ${cx} ${tt-28} Z`),'blue',{k:1.6,inside:(q,MM)=>{for(let j=tt-24;j<tt;j+=2.6)ln([cx-14,j,cx+14,j],.3,MM[0],.5);if(snow)fl(cx-14,tt-28,14,26,GR('#ffffff'),.85)}});
  F(RC(cx-.6,tt-33,1.2,6,.3),'brass',{k:.1,lw:B.LW*.5});F(pkStarS(cx,tt-34.6,2.6,4,.9),'frost',{k:.1,lw:B.LW*.5});glow(cx,tt-34.6,6,'rgba(160,220,255,.9)',dim?.7:.35)}
 // the rune window: a ring of brass, blue light, a four-point rune
 const ry=tt+15;F(pkCirc(cx-1,ry,5.4),'brass',{k:.3,lw:B.LW*.8});fl(0,0,0,0,'#000');B.ell(cx-1,ry,4.2,4.2,'#1d4aa6');B.g.save();B.g.fillStyle=B.lg(cx-5,ry-5,cx+3,ry+4,['#bfeaff','#5aa8f0','#1d4aa6']);B.g.beginPath();B.g.arc(cx-1,ry,4,0,Math.PI*2);B.g.fill();B.g.restore();
 F(pkStarS(cx-1,ry,3.2,4,.9),'frost',{k:.1,lw:B.LW*.4});glow(cx-1,ry,14,'rgba(120,190,255,.95)',dim?.75:.35);an.runes.push({x:cx-1,y:ry});
 for(const wy of [tt+30,tt+48]){const on=lit(.9);F(S(`M${cx-3.4} ${wy+9} L${cx-3.4} ${wy+1} Q${cx-1} ${wy-2.6} ${cx+1.4} ${wy+1} L${cx+1.4} ${wy+9} Z`),'dark',{k:.1,lw:B.LW*.7});fl(cx-2.4,wy+1,2.8,7.4,on?'#9fe4ff':GR(dim?'#1a2438':'#3a5c8c'));if(on)glow(cx-1,wy+5,7,'rgba(120,200,255,.9)',.35)}
 F(S(`M${cx-5} ${yB} L${cx-5} ${yB-10} Q${cx-1} ${yB-17} ${cx+3} ${yB-10} L${cx+3} ${yB} Z`),'wood',{k:.6,inside:(q,MM)=>{ln([cx-1,yB-15,cx-1,yB],.4,MM[0])}});ell(cx+.6,yB-7,.6,.6,GR('#d1a94e'));F(RC(cx-7,yB,12,1.6,.3),snow?'white':'stone',{k:.1,lw:B.LW*.5});
 // a blue banner with a star
 ln([tx+tw,tt+20,tx+tw+5,tt+20],.6,B.INK);F(PO([tx+tw+1,tt+20.6,tx+tw+5,tt+20.6,tx+tw+5,tt+33,tx+tw+3,tt+31,tx+tw+1,tt+33]),'blue',{k:.3,lw:B.LW*.6});F(pkStarS(tx+tw+3,tt+25,1.4,5,.6),'gold',{k:.1,lw:B.LW*.3});
 if(lamps)an.lights.push({x:cx,y:yB-20,r:16});B.shadowE(x+2,yB,40)}
function tvHDHall(B,x){const {F,fl,ln,RC,PO,S,yB,wall,beams,roofSide,winHD,door,GR,east,an,lamps,wallM,ell,GC}=B,m=wallM==='stone'?'wood':wallM,rH=east?'kawara':'red';
 wall(x+12,yB-38,52,38,m);if(m==='plaster'||m==='adobe')beams(x+12,yB-38,52,38,4);roofSide(x+8,yB-62,60,25,rH,.6);
 winHD(x+17,yB-30,7,9,{sh:rH});winHD(x+56,yB-30,6,9,{});door(x+40,yB-24,14,24,{dbl:1});
 F(RC(x+38,yB-34,18,6,.6),'dark',{k:.2});F(RC(x+39,yB-33,16,4,.4),east?'vellum':'brass',{k:.2,lw:B.LW*.5});for(const d of [-1,1])ln([x+47-d*3,yB-33.4,x+47+d*3,yB-29.6],.7,GR(east?'#101d1c':'#3a2c12'));
 F(RC(x+34.6,yB-83,1.2,23,.3),'wood',{k:.1,lw:B.LW*.5});F(pkCirc(x+35.2,yB-83.4,.9),'brass',{ball:1,k:.1,lw:B.LW*.4});an.flags.push({x:x+35.8,y:yB-81,c:TVRAMP[rH]||TVRAMP.red,sw:1});
 // the practice yard: sand, two straw dummies, a rack of wooden arms
 ell(x+18,yB+.4,19,2.2,GR('#d9b47a'),.65);
 for(const dx of [x+5.5,x+18.5]){F(RC(dx-.6,yB-14,1.2,14,.3),'wood',{k:.1,lw:B.LW*.5});F(RC(dx-5.6,yB-16.4,11.2,1.4,.4),'wood',{k:.1,lw:B.LW*.5});
  F(S(`M${dx-3} ${yB-6.4} Q${dx-3.8} ${yB-12} ${dx-2.4} ${yB-15.6} L${dx+2.4} ${yB-15.6} Q${dx+3.8} ${yB-12} ${dx+3} ${yB-6.4} Z`),'straw',{k:.6,lw:B.LW*.6,inside:(q,MM)=>{ln([dx-3.4,yB-11,dx+3.4,yB-11],.6,GR('#7a5a38'));ln([dx-1,yB-15,dx-1.6,yB-7],.3,MM[1]);ln([dx+1.2,yB-15,dx+1.6,yB-7],.3,MM[1])}});
  F(pkCirc(dx,yB-18.6,2.6),'straw',{ball:1,k:.3,lw:B.LW*.6});ln([dx-1.2,yB-19.4,dx-.4,yB-18.6],.35,B.INK);ln([dx-.4,yB-19.4,dx-1.2,yB-18.6],.35,B.INK);ln([dx+.4,yB-19.4,dx+1.2,yB-18.6],.35,B.INK);ln([dx+1.2,yB-19.4,dx+.4,yB-18.6],.35,B.INK)}
 F(RC(x+26,yB-18,10,1.4,.3),'wood',{k:.1,lw:B.LW*.5});F(RC(x+26,yB-11,10,1.4,.3),'wood',{k:.1,lw:B.LW*.5});F(RC(x+26,yB-18,1.2,18,.3),'wood',{k:.1,lw:B.LW*.4});F(RC(x+34.8,yB-18,1.2,18,.3),'wood',{k:.1,lw:B.LW*.4});
 for(let i=0;i<3;i++){F(RC(x+27.6+i*3,yB-22,1.2,17,.5),'wood',{k:.1,lw:B.LW*.4});F(RC(x+26.8+i*3,yB-9.4,2.8,.9,.3),'darkwood',{k:.1,lw:B.LW*.3})}
 F(RC(x+29,yB-28,.9,27,.3),'wood',{k:.1,lw:B.LW*.4});F(PO([x+29.45,yB-30,x+30.4,yB-27.6,x+28.5,yB-27.6]),'steel',{k:.1,lw:B.LW*.4});
 if(lamps)an.lights.push({x:x+47,y:yB-20,r:20});B.shadowE(x,yB,66)}
function tvHDHarbour(B,x){const {F,fl,ln,RC,PO,S,yB,H,W,wall,roofSide,door,GR,east,an,lamps,glow,harb,yH,crate,barrel,horizon,ell}=B,qx=harb,wt=yH+3,wl=yB+12,g=B.g;
 // open water from the quay to the end of the street
 g.fillStyle=B.lg(0,wt,0,H,[tvMix(GR('#8fc4ec'),horizon,.4),GR('#4f86c8'),GR('#24508f'),GR('#123466')]);g.fillRect(qx,wt,W-qx,H-wt);
 for(let y=wt+2;y<H;y+=2.2){const d=(y-wt)/(H-wt);for(let i=qx+B.rr(0,10);i<W;i+=B.rr(10,24))ln([i,y,i+B.rr(3,8)*(1+d),y],.35+.3*d,GR('#cfe6ff'),.2+.2*(1-d))}
 for(let y=wt+3;y<H;y+=4)for(let i=qx+((y*13)%17);i<W;i+=B.rr(14,26))an.glints.push({x:i,y,w:B.rr(8,16),k:'F'});an.water={x0:qx,x1:W,y0:wt,y1:H};
 // the quay wall
 F(RC(qx-5,yB-3,5,H-yB+3,.2),'stone',{k:.6,inside:(q,MM)=>{for(let j=yB;j<H;j+=3.2)ln([qx-5,j,qx,j],.3,MM[1])}});F(RC(qx-5.6,yB-4,6.4,2,.4),'stone',{k:.2,lw:B.LW*.6});
 // the pier
 for(let i=qx+4;i<qx+34;i+=9)F(RC(i,yB+5,2,11,.4),'dark',{k:.1,lw:B.LW*.5});F(RC(qx,yB+3,34,2.6,.3),'wood',{k:.3,lw:B.LW*.6,inside:(q,MM)=>{for(let i=qx+3;i<qx+34;i+=3)ln([i,yB+3,i,yB+5.6],.3,MM[0])}});
 // the harbour master's shed
 wall(x+2,yB-36,30,36,'wood');roofSide(x-1,yB-48,36,13,east?'kawara':'slate',.4);B.sign(x+4,yB-34,'harbour');door(x+23,yB-20,8,20,{});
 crate(x+33,yB-7);crate(x+33.5,yB-13.4,7,6.4);barrel(x+26.6,yB-8);
 // the ship: hull, castles, mast, furled sails and rigging
 const sx=qx+12,L=50,hull=S(`M${sx} ${wl-10} L${sx+L} ${wl-10} Q${sx+L+4} ${wl-10} ${sx+L+7} ${wl-14} Q${sx+L+3} ${wl+1} ${sx+L-9} ${wl+5.4} L${sx+7} ${wl+5.4} Q${sx+1} ${wl+1} ${sx} ${wl-10} Z`);
 F(RC(sx,wl-14,12,5,.4),'wood',{k:.3});F(RC(sx+L-8,wl-12,9,3,.4),'wood',{k:.3});
 F(hull,east?'dark':'wood',{k:1.4,inside:(q,MM)=>{fl(sx-2,wl-7.4,L+12,1.6,GR(east?'#101d1c':'#c4493f'));fl(sx-2,wl-6,L+12,.6,GR('#3a0e0b'));for(let j=wl-9;j<wl+3;j+=2.2)ln([sx,j,sx+L+6,j],.3,MM[0],.5);fl(sx-2,wl-.4,L+12,4,GR('#0b1a40'),.35)}});
 for(const wx of [sx+2,sx+6]){fl(wx,wl-12.4,2,2,lamps?'#ffd070':GR('#22303a'))}if(lamps){glow(sx+4,wl-11,8,'rgba(255,180,80,.9)',.45);an.lights.push({x:sx+4,y:wl-10,r:14})}
 const mx=sx+26;F(RC(mx-.9,wl-92,1.8,82,.4),'wood',{k:.2,lw:B.LW*.6});ln([mx,wl-90,sx+1,wl-13],.3,GR('#2a2a34'),.9);ln([mx,wl-90,sx+L+7,wl-14],.3,GR('#2a2a34'),.9);ln([mx,wl-74,sx+8,wl-12],.25,GR('#2a2a34'),.7);ln([mx,wl-74,sx+L,wl-11],.25,GR('#2a2a34'),.7);
 for(const [yy,hw] of [[wl-78,17],[wl-50,14]]){F(RC(mx-hw,yy,hw*2+2,1.6,.6),'wood',{k:.1,lw:B.LW*.6});F(S(`M${mx-hw+1} ${yy+1.6} Q${mx} ${yy+5.2} ${mx+hw+1} ${yy+1.6} Z`),east?'cloth':'canvas',{k:.4,lw:B.LW*.6,inside:(q,MM)=>{for(let i=mx-hw+4;i<mx+hw;i+=4)ln([i,yy+1.6,i+.6,yy+4],.35,MM[1])}})}
 F(RC(mx-2.6,wl-66,6,3.4,.4),'wood',{k:.1,lw:B.LW*.5});an.flags.push({x:mx+1,y:wl-92,c:TVRAMP.red});
 F(RC(qx+30,yB+.4,2,6,.6),'dark',{k:.1,lw:B.LW*.5});ln([qx+31,yB+1.6,sx+L-2,wl-9],.5,GR('#bd8a52'))}
/* static sails for a mill whose sails would cross a building (the overlay animates them otherwise) */
function tvHDSails(g,m,ang,GR,INK){g.save();g.lineCap='round';for(let a=0;a<4;a++){const th=ang+a*Math.PI/2,cs=Math.cos(th),sn=Math.sin(th);g.strokeStyle=GR('#4a3826');g.lineWidth=1;g.beginPath();g.moveTo(m.x,m.y);g.lineTo(m.x+cs*m.r,m.y+sn*m.r);g.stroke();
  g.fillStyle=GR('#e9e0c9');g.strokeStyle=INK;g.lineWidth=.4;g.beginPath();g.moveTo(m.x+cs*m.r*.3,m.y+sn*m.r*.3);g.lineTo(m.x+cs*m.r,m.y+sn*m.r);g.lineTo(m.x+cs*m.r-sn*3.6,m.y+sn*m.r+cs*3.6);g.lineTo(m.x+cs*m.r*.3-sn*3.6,m.y+sn*m.r*.3+cs*3.6);g.closePath();g.fill();g.stroke()}
 g.fillStyle=GR('#4a3826');g.beginPath();g.arc(m.x,m.y,1.4,0,Math.PI*2);g.fill();g.restore()}

/* ---------------- overlay (10 fps): smoke, lanterns, sparks, runes, the tavern sign, sails, flags, the bell, water, people, weather ---------------- */
function tvDrawHD(){const g=TV.g,an=TV.an;if(!g||!TV.pic||!an)return;const s=TV.s,d=TV.dpr||1,kv=s*d,vw=TV.vw,vh=TV.vh,pu=TV.pan/s,W=TV.W,H=TV.H,T=TV.tick,rm=tvRM(),GR=tvGradeFn(an.tod),k=TV.k;
 g.setTransform(1,0,0,1,0,0);g.fillStyle='#0b1514';g.fillRect(0,0,TV.cv.width,TV.cv.height);
 const sw=Math.min(TV.pic.width-pu*k,vw/s*k);g.drawImage(TV.pic,pu*k,0,sw,TV.pic.height,0,0,sw/k*kv,TV.pic.height/k*kv);
 g.setTransform(kv,0,0,kv,-pu*kv,0);g.lineCap='round';g.lineJoin='round';
 const ell=(x,y,rx,ry,c,a)=>{g.globalAlpha=a==null?1:a;g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();g.globalAlpha=1};
 const glow=(x,y,r,col,a)=>{g.save();g.globalCompositeOperation='lighter';const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,col);q.addColorStop(1,'rgba(0,0,0,0)');g.globalAlpha=a;g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2);g.restore()};
 const vis=(x,m)=>x>pu-(m||20)&&x<pu+W+(m||20);
 // smoke
 for(const p of an.puffs){const sm=an.smoke[p.s];if(!vis(sm.x,30))continue;const a=p.age,x=sm.x+Math.sin(a*.13+p.s)*2+a*.2,y=sm.y-a*.6,r=1.2+a*.12;if(y<-4)continue;ell(x,y,r,r*.9,GR(a<18?'#d8dee4':'#b8c0c8'),Math.max(0,.55-a/70))}
 // lanterns breathe
 for(const l of an.lamps){if(!vis(l.x))continue;const f=rm?.5:(tvHash(l.x+':'+((T/3)|0))%5)/5;glow(l.x,l.y,l.big?14:7,'rgba(255,200,110,.9)',.25+.2*f)}
 for(const sp of an.sparks){if(!vis(sp.x))continue;glow(sp.x,sp.y+2,10,'rgba(255,130,40,.9)',rm?.3:.25+.15*Math.sin(T*.9));if(!rm)for(let i=0;i<4;i++){const a=(T*1.6+i*6)%18;if(a<13)ell(sp.x+Math.sin(i*2.3+a*.4)*2.4,sp.y-a*.9,.35,.35,a<6?'#fff2a0':'#ff8a3c',1-a/13)}}
 for(const r of an.runes){if(!vis(r.x))continue;const f=rm?0:Math.sin(T*.35);glow(r.x,r.y,10,'rgba(120,190,255,.9)',.22+.12*f);if(!rm)for(let i=0;i<3;i++){const a=((T+i*10)%30)/30;ell(r.x-6+i*6+Math.sin(T*.2+i)*1.5,r.y-4-a*18,.5,.5,'#bfeaff',1-a)}}
 // the tavern sign: a board with a mug, swinging on its bar
 if(an.sign&&vis(an.sign.x)){const sx=an.sign.x,sy=an.sign.y,ph=rm?0:Math.sin(T*.16)*.09;g.save();g.translate(sx+5,sy);g.rotate(ph);g.strokeStyle='#0c0d12';g.lineWidth=.4;g.beginPath();g.moveTo(-3.6,0);g.lineTo(-3.6,2.6);g.moveTo(3.6,0);g.lineTo(3.6,2.6);g.stroke();
  g.fillStyle=GR('#8c5e34');g.strokeStyle='#0c0d12';g.lineWidth=.5;g.beginPath();g.roundRect?g.roundRect(-5.4,2.4,10.8,10.8,1):g.rect(-5.4,2.4,10.8,10.8);g.fill();g.stroke();g.fillStyle=GR('#efe6c8');g.fillRect(-4.4,3.4,8.8,8.8);
  const c=typeof pkCanvas==='function'?pkCanvas('tavern',Math.max(16,Math.ceil(8*kv))):null;if(c)g.drawImage(c,-4,3.8,8,8);if(an.tod==='night')g.fillStyle='rgba(10,18,40,.45)',g.fillRect(-5.4,2.4,10.8,10.8);g.restore()}
 if(an.mill&&!an.millHid&&vis(an.mill.x,30))tvHDSails(g,an.mill,rm?.4:T*.06,GR,'#0c0d12');
 for(const f of an.flags){if(!vis(f.x))continue;const c=(f.c||TVRAMP.red).map(q=>GR(PAL[q]));g.beginPath();g.moveTo(f.x,f.y);for(let i=0;i<=10;i++)g.lineTo(f.x+i,f.y+(rm?0:Math.sin(T*.35-i*.7)*1.1*i/10));for(let i=10;i>=0;i--)g.lineTo(f.x+i,f.y+(i>7?4:5.4)+(rm?0:Math.sin(T*.35-i*.7)*1.1*i/10));g.closePath();
  const q=g.createLinearGradient(f.x,f.y,f.x,f.y+5);q.addColorStop(0,c[0]);q.addColorStop(1,c[2]);g.fillStyle=q;g.fill();g.strokeStyle='#0c0d12';g.lineWidth=.35;g.stroke();
  if(f.sw){g.strokeStyle=GR('#fff4c8');g.lineWidth=.5;g.beginPath();g.moveTo(f.x+3,f.y+1.2);g.lineTo(f.x+7,f.y+4);g.moveTo(f.x+7,f.y+1.2);g.lineTo(f.x+3,f.y+4);g.stroke()}}
 if(an.bell&&vis(an.bell.x)){const b=an.bell,ph=rm?0:(T%70<16?Math.sin(T*.8)*.35:0);if(ph){glow(b.x,b.y+2,6,'rgba(255,220,140,.9)',.25)}}
 if(!rm){for(const s2 of an.stars){if(vis(s2.x,2)&&((T>>2)+(s2.x|0))%13===0)ell(s2.x,s2.y,.8,.8,'#ffffff',.9)}
  if(an.water){const w=an.water;for(let i=0;i<an.glints.length;i++){const s2=an.glints[i];if(!vis(s2.x,20))continue;const o=((T/5|0)+i*2)%4;g.globalAlpha=.55;g.fillStyle=GR('#e4f4ff');g.fillRect(s2.x+o*s2.w/4,s2.y,2.6,.4);g.globalAlpha=1}}
  // a townsperson crossing the street
  if(!an.walk&&--an.walkT<=0){const dir=Math.random()<.5?1:-1;an.walk={x:dir>0?pu-8:Math.min(pu+W+2,an.walkX1),dir,v:(Math.random()*4)|0,y:an.walkY+Math.random()*5};an.walkT=(an.tod==='night'?140:50)+(Math.random()*90|0)}
  if(an.walk){const w=an.walk;w.x+=w.dir*.8;tvHDWalker(g,w,T,GR,an.tod);if(w.x<pu-10||w.x>Math.min(pu+W+4,an.walkX1))an.walk=null}}
 // hover / pressed: a soft light on the building
 {const kk=TV.down>=0?TV.down:TV.hot;if(kk>0&&TV.plan){const key=Object.keys(TVID).find(q=>TVID[q]===kk),pl=key&&TV.plan.places[key];if(pl){const b=pl.box;g.save();g.globalCompositeOperation='lighter';const q=g.createRadialGradient(b.x+b.w/2,b.y+b.h*.6,2,b.x+b.w/2,b.y+b.h*.6,Math.max(b.w,b.h)*.7);q.addColorStop(0,TV.down>=0?'rgba(255,240,200,.22)':'rgba(255,230,170,.14)');q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(b.x,b.y,b.w,b.h);g.restore()}}}
 // weather and birds, in the view
 g.setTransform(kv,0,0,kv,0,0);
 if(!rm){const pk=an.parts&&an.parts.k;for(const p of an.pt){if(pk==='snow'){p.y+=p.v*.9;p.x+=Math.sin(T*.08+p.ph)*.4-.15;if(p.y>H){p.y=-1;p.x=Math.random()*W}if(p.x<0)p.x+=W;ell(p.x,p.y,p.k%7===0?.9:.55,p.k%7===0?.9:.55,'#ffffff',.85)}
   else if(pk==='leaf'||pk==='seed'){p.x+=.5+p.v*.5;p.y+=Math.sin(T*.12+p.ph)*.5+.18;if(p.x>W||p.y>H){p.x=-2;p.y=Math.random()*H*.7}ell(p.x,p.y,pk==='seed'?.5:.9,pk==='seed'?.5:.45,GR(pk==='seed'?'#e9e0c9':['#ff8a3c','#d1a94e','#a8482a','#9bd96f'][p.k%4]),.9)}
   else if(pk==='dust'){p.x+=1.6+p.v;if(p.x>W){p.x=-6;p.y=an.yB+Math.random()*an.GH}ell(p.x,p.y,1.6,.35,GR('#fff4c8'),.35)}
   else if(pk==='fly'){p.x+=Math.sin(T*.07+p.ph)*.6;p.y+=Math.cos(T*.05+p.ph*2)*.4;if(p.y<an.yB-40||p.y>H-2)p.y=an.yB+Math.random()*an.GH*.9;if(p.x<0||p.x>W)p.x=Math.random()*W;if((T+p.k*5)%14<8)glow(p.x,p.y,2.2,p.k%2?'rgba(190,255,140,.95)':'rgba(255,240,170,.95)',.9)}
   else{p.x+=.2;p.y-=.12+p.v*.1;if(p.y<an.yB-50){p.y=H-2;p.x=Math.random()*W}ell(p.x,p.y,.4,.4,GR('#c9cfbd'),.7)}}
  if(an.tod==='day'||an.tod==='dawn'){if(--an.birdT<=0){an.birdT=90+(Math.random()*160|0);const y=8+Math.random()*an.yB*.3;for(let i=0;i<2+(Math.random()*3|0);i++)an.birds.push({x:-6-i*7,y:y+i*3*(i%2?1:-1),ph:i*2})}
   g.strokeStyle='#182a28';g.lineWidth=.5;an.birds=an.birds.filter(b=>{b.x+=1.3;const up=Math.sin((T+b.ph)*.9)*1.2;g.beginPath();g.moveTo(b.x-2.4,b.y-up);g.quadraticCurveTo(b.x-1,b.y-up*.2-.6,b.x,b.y);g.quadraticCurveTo(b.x+1,b.y-up*.2-.6,b.x+2.4,b.y-up);g.stroke();return b.x<W+6})}
  for(const p of an.puffs){p.age+=.5;if(p.age>35)p.age=0}}
 g.setTransform(1,0,0,1,0,0)}
function tvHDWalker(g,w,T,GR,tod){const x=w.x,y=w.y,fr=Math.sin(T*.6)*1.4,cl=['#58b39c','#c4493f','#62a6ee','#d1a94e'][w.v],dk=tod==='night';g.save();g.lineCap='round';
 g.strokeStyle=GR('#4a3826');g.lineWidth=1;g.beginPath();g.moveTo(x,y-4);g.lineTo(x-fr,y);g.moveTo(x,y-4);g.lineTo(x+fr,y);g.stroke();
 g.fillStyle=GR(cl);g.strokeStyle='#0c0d12';g.lineWidth=.35;g.beginPath();g.moveTo(x-2,y-3.6);g.lineTo(x-1.4,y-8.6);g.lineTo(x+1.4,y-8.6);g.lineTo(x+2,y-3.6);g.closePath();g.fill();g.stroke();
 g.fillStyle=GR('#f0c8a0');g.beginPath();g.arc(x,y-10,1.4,0,Math.PI*2);g.fill();g.stroke();g.fillStyle=GR('#6b4a2b');g.beginPath();g.arc(x,y-10.6,1.3,Math.PI,0);g.fill();
 if(tod==='night'||tod==='dusk'){const lx=x+w.dir*2.4;g.fillStyle='#ffd070';g.fillRect(lx-.6,y-6.4,1.2,1.4);g.globalCompositeOperation='lighter';const q=g.createRadialGradient(lx,y-5.6,0,lx,y-5.6,6);q.addColorStop(0,'rgba(255,190,90,.6)');q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(lx-6,y-12,12,12)}
 void dk;g.restore()}
// Settings > Detail changed while the street is up: repaint it at the new level
if(typeof onArtChange==='function')onArtChange(()=>{TV.key='';if(TV.shown){try{tvLayout();TV.dirty=true}catch(e){}}});
