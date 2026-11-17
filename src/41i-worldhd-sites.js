/* ================= WORLD ART, DETAIL HIGH: places (towns and their dressing, ruins, rifts, lairs, nests, dungeons, crisis sites) =================
   Painted in the town screen's style (51h-townhd.js: its wall and roof ramps TVHR, ink lines, light from the upper left) at K device px
   an art px, in the same boxes as the Low sprites (WASITE: anchors, picking and name plates unchanged). whSprite(kind, o, K) is the one
   entry point (70-render.js wvSprite asks it first at Detail High): it returns a sprite entry {c, w, h, ax, ay, x0..y1, k, lit} or
   null for anything it does not paint (then the Low pixel sprite is used). lit: the things that shine at night (windows, fires,
   rift light) on their own canvas, laid over the sprite after the night tint so they stay bright.
   A town is a miniature of its street: the biome's walls and roofs (whTownStyle: plaster and timber, logs, stone, stilts, adobe,
   snow-capped), hamlet / town / walled city by size, smoke from the chimneys. No rnd(): variation is hashed from fixed seeds. */
const WHTS={plains:{wall:['plaster','plaster','wood'],roof:['red','slate','thatch','red','verd'],timber:1},
 forest:{wall:['logs','wood','plaster'],roof:['thatch','verd','wood','thatch'],timber:0},
 hills:{wall:['stone','stone','plaster'],roof:['slate','red','slate','thatch'],timber:0},
 swamp:{wall:['wood','logs'],roof:['thatch','thatch','verd'],timber:0,stilt:1},
 desert:{wall:['adobe','adobe','plaster'],roof:['clay','clay','adobe'],flat:1},
 snow:{wall:['logs','stone','wood'],roof:['slate','red','wood','slate'],snow:1}};
function whRampN(n){if(Array.isArray(n))return n;return typeof TVHR==='object'&&TVHR[n]?TVHR[n]:typeof PKM==='object'&&PKM[n]?PKM[n]:['#262b30','#5e6872','#8d99a6','#b6c0ca','#e8eef2']}
function whTownBio(t){if(!W||!t)return'plains';const tx=(t.x/TS)|0,ty=(t.y/TS)|0,c=[0,0,0,0,0,0,0,0];
 for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){const ax=tx+x,ay=ty+y;if(ax<0||ay<0||ax>=WN||ay>=WN)continue;c[W.tiles[ay*WN+ax]]++}
 const b=W.tiles[ty*WN+tx];if(b===7)return'snow';if(b===6)return'desert';if(c[5]>=3)return'swamp';if(c[3]+c[4]>=4)return'hills';return b===2?'forest':'plains'}
/* ---- kit (art px; L: the context for things that shine — the lit canvas at night, else the sprite itself) ---- */
function whGround(g,cx,cy,rx,ry,col,a){g.save();g.translate(cx,cy);g.scale(1,ry/rx);const gr=g.createRadialGradient(0,0,rx*.2,0,0,rx);gr.addColorStop(0,col);gr.addColorStop(.7,col);gr.addColorStop(1,'rgba(0,0,0,0)');
 g.globalAlpha=a==null?.85:a;g.fillStyle=gr;g.beginPath();g.arc(0,0,rx,0,Math.PI*2);g.fill();g.restore()}
function whGlowAt(L,x,y,r,col,a){L.save();L.globalCompositeOperation='lighter';const gr=L.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');L.globalAlpha=a==null?.6:a;L.fillStyle=gr;L.fillRect(x-r,y-r,r*2,r*2);L.restore()}
function whWin(g,L,x,y,w,h,night){g.fillStyle=WHINK;g.fillRect(x-.25,y-.25,w+.5,h+.5);g.fillStyle='#34485a';g.fillRect(x,y,w,h);g.fillStyle='#6f8aa0';g.fillRect(x,y,w*.45,h*.4);
 if(night){L.fillStyle='#ffd36a';L.fillRect(x,y,w,h);L.fillStyle='#fff2b8';L.fillRect(x,y,w*.45,h*.45);whGlowAt(L,x+w/2,y+h/2,2.6,'rgba(255,190,90,.9)',.5)}}
function whSmoke(g,x,y,f,n){for(let i=0;i<(n||3);i++){const ph=((f&3)+i*4)/12,yy=y-ph*9-i*.8,xx=x+Math.sin(ph*5+i)*1.2+ph*2,r=.9+ph*1.6;g.globalAlpha=(1-ph)*.55;g.fillStyle='#d8dde2';g.beginPath();g.arc(xx,yy,r,0,Math.PI*2);g.fill();g.globalAlpha=(1-ph)*.35;g.fillStyle='#9aa4ae';g.beginPath();g.arc(xx+r*.3,yy+r*.3,r*.7,0,Math.PI*2);g.fill()}g.globalAlpha=1}
function whFlame(L,x,y,h,f){const a=(f&3);pkFlame(L,x+(a===1?.2:a===3?-.2:0),y,h*(a&1?1.08:1),'fire');whGlowAt(L,x,y-h*.4,h*1.6,'rgba(255,150,60,.9)',.45)}
// a house: front wall, door and windows, a roof (pitched, or flat with a parapet in the desert), chimney, snow
function whHouse(g,L,x,by,w,wh,rh,o){const R=whRampN(o.roof),Wm=whRampN(o.wall),night=o.night,top=by-wh;
 if(o.stilt){for(const sx of [x+.6,x+w-.9])whFill(g,pkRect(sx,by-.2,.7,1.8,.2),WHR.bark,{k:.2,lw:.35});by-=1.4}
 const T=by-wh;
 if(o.ch!=null&&!o.flat){whFill(g,pkRect(x+o.ch,T-rh-1.6,1.3,rh+.5,.15),whRampN('stone'),{k:.2,lw:.4})}
 whFill(g,pkRect(x,T,w,wh,.15),Wm,{k:.35,lw:.45,inside:o.timber?(g,m)=>{g.strokeStyle='#5a3a1e';g.lineWidth=.38;g.beginPath();g.moveTo(x,T+.5);g.lineTo(x+w,T+.5);g.moveTo(x+.4,T);g.lineTo(x+.4,by);g.moveTo(x+w-.4,T);g.lineTo(x+w-.4,by);if(w>7){g.moveTo(x+w/2,T);g.lineTo(x+w/2,by)}g.stroke()}:null});
 const nw=o.win==null?Math.max(1,Math.round(w/4)):o.win,dx=o.door==null?(w>5?Math.round(w*.55):-1):o.door;
 if(dx>=0){whFill(g,pkRect(x+dx-.7,by-Math.min(2.6,wh-.6),1.6,Math.min(2.6,wh-.6),.6),WHR.wood,{k:.2,lw:.35,noRim:1})}
 for(let i=0;i<nw;i++){const wx=x+(w/(nw+1))*(i+1)-.6;if(dx>=0&&Math.abs(wx+.6-(x+dx+.1))<1.6)continue;whWin(g,L,wx,T+wh*.28,1.2,1.2,night)}
 if(o.flat){whFill(g,pkRect(x-.4,T-1.2,w+.8,1.4,.2),R,{k:.25,lw:.45});if(o.dome)whFill(g,pkEll(x+w/2,T-1.2,w*.28,w*.28*.8),R,{k:.3,lw:.45,ball:1});return}
 const ov=.9,P=[x-ov,T+.2,x+w+ov,T+.2,x+w-.6,T-rh,x+.6,T-rh];
 whFill(g,whPolyS(P),R,{k:.45,lw:.5,inside:(g,m)=>{g.strokeStyle=m[1];g.globalAlpha=.55;g.lineWidth=.3;for(let yy=T-rh+1.2;yy<T;yy+=1.2){g.beginPath();g.moveTo(x-ov,yy);g.lineTo(x+w+ov,yy);g.stroke()}g.globalAlpha=1;
   g.fillStyle=m[3];g.globalAlpha=.6;g.fillRect(x+.6,T-rh,w-1.2,.5);g.globalAlpha=1;if(o.snow){g.fillStyle='#f4f8fc';g.beginPath();g.moveTo(x+.6,T-rh);g.lineTo(x+w-.6,T-rh);g.lineTo(x+w+.2,T-rh*.45);g.quadraticCurveTo(x+w*.5,T-rh*.25,x-.2,T-rh*.5);g.closePath();g.fill()}}});
 if(o.ch!=null){g.fillStyle=WHINK;g.fillRect(x+o.ch-.2,T-rh-1.9,1.7,.6)}}
function whTowerR(g,L,cx,by,w,h,roof,o){o=o||{};const S=whRampN(o.wall||'stone'),x=cx-w/2;whFill(g,pkRect(x,by-h,w,h,.2),S,{k:.4,lw:.5,inside:(g,m)=>{g.strokeStyle=m[1];g.globalAlpha=.4;g.lineWidth=.25;for(let yy=by-h+1.5;yy<by;yy+=1.6){g.beginPath();g.moveTo(x,yy);g.lineTo(x+w,yy);g.stroke()}g.globalAlpha=1}});
 if(o.win!==false)whWin(g,L,cx-.5,by-h+h*.3,1,1.4,o.night);
 if(roof){const R=whRampN(roof),rh=w*1.15;whFill(g,whPolyS([x-.7,by-h+.3,x+w+.7,by-h+.3,cx,by-h-rh]),R,{k:.4,lw:.5});if(o.flag)whPennant(g,cx,by-h-rh,o.flag,o.f|0,3,1.8)}
 else{for(let i=0;i<w;i+=1.6)whFill(g,pkRect(x+i,by-h-1,1,1.1,.1),S,{k:.2,lw:.35,noRim:1});}}
function whWallC(g,x0,x1,by,h,o){o=o||{};const S=whRampN('stone');whFill(g,pkRect(x0,by-h,x1-x0,h,.15),S,{k:.35,lw:.5,inside:(g,m)=>{g.strokeStyle=m[1];g.globalAlpha=.45;g.lineWidth=.25;for(let yy=by-h+1.4;yy<by;yy+=1.4){g.beginPath();g.moveTo(x0,yy);g.lineTo(x1,yy);g.stroke()}g.globalAlpha=1}});
 if(o.cren!==false)for(let x=x0+.2;x<x1-.6;x+=1.8)whFill(g,pkRect(x,by-h-1,1.05,1.15,.1),S,{k:.2,lw:.35,noRim:1})}
// a flag on a pole: colours [field, shade, trim]; ph waves it; dir +1 flies right
function whPennant(g,x,y,C,ph,w,h,dir){dir=dir||1;w=w||4;h=h||2.6;const P=new Path2D(),a=(ph&3)*Math.PI/2;P.moveTo(x,y);for(let i=1;i<=6;i++){const t=i/6;P.lineTo(x+dir*w*t,y+Math.sin(a+t*3)*.5*t+t*.3)}
 P.lineTo(x+dir*w*.82,y+h*.55+Math.sin(a+3)*.5);for(let i=6;i>=0;i--){const t=i/6;P.lineTo(x+dir*w*t,y+h+Math.sin(a+t*3)*.5*t)}P.closePath();
 g.lineJoin='round';g.strokeStyle=WHINK;g.lineWidth=.9;g.stroke(P);g.fillStyle=C[0];g.fill(P);g.save();g.clip(P);g.fillStyle=C[1];g.globalAlpha=.8;g.fillRect(x-w,y+h*.62,w*2,h);g.fillStyle=C[2]||'#f4ecd8';g.globalAlpha=1;g.fillRect(x-w,y+h*.42,w*2,h*.16);g.restore()}
function whPole(g,x,top,by,col){whLine(g,[x,by,x,top],.95,WHINK);whLine(g,[x,by,x,top],.5,col||'#7a5030');whDot(g,x,top-.3,.55,'#e8c060')}
// a banner (G.banner / a house / a rival as 46-banner.js colours; bn {A:[deep..light] ramp keys, C, em}) as a rectangle hung from a crossbar
function whBnCol(k,d){const c=typeof BANNERC==='object'&&BANNERC[k];if(c&&c.h)return c.h;if(c&&Array.isArray(c.r))return PAL[c.r[d==null?1:d]]||'#c4493f';return PAL[k]||d||'#c4493f'}
function whBanner(g,x,y,bn,ph,s){s=s||1;const w=5.4*s,h=7*s,a=(ph&3)*Math.PI/2,A=bn&&bn.A?bn.A.map(k=>PAL[k]):['#7e2a22','#c4493f','#e2715f'],C=bn&&bn.C?bn.C.map(k=>PAL[k]):['#8a7f62','#e8e0c8','#ffffff'];
 const P=new Path2D();P.moveTo(x-w/2,y);P.lineTo(x+w/2,y);for(let i=1;i<=5;i++){const t=i/5;P.lineTo(x+w/2+Math.sin(a+t*2.4)*.35*t,y+h*t*.86)}P.lineTo(x,y+h);P.lineTo(x-w/2+Math.sin(a+2.4)*.35,y+h*.86);for(let i=4;i>=1;i--){const t=i/5;P.lineTo(x-w/2+Math.sin(a+t*2.4)*.35*t,y+h*t*.86)}P.closePath();
 g.strokeStyle=WHINK;g.lineWidth=.9;g.lineJoin='round';g.stroke(P);g.fillStyle=A[1];g.fill(P);g.save();g.clip(P);g.fillStyle=A[2];g.globalAlpha=.55;g.fillRect(x-w/2,y,w*.35,h);g.fillStyle=A[0];g.globalAlpha=.5;g.fillRect(x+w*.22,y,w,h);g.globalAlpha=1;
 g.strokeStyle=C[1];g.lineWidth=.45*s;g.stroke(P);
 if(bn&&bn.em){const n=bn.em.length,cs=w*.62/n;for(let j=0;j<n;j++)for(let i=0;i<n;i++){const ch=bn.em[j][i];if(ch==='.')continue;g.fillStyle=ch==='-'?C[0]:ch==='+'?C[2]:ch==='='?A[0]:C[1];g.fillRect(x-w*.31+i*cs,y+h*.18+j*cs,cs+.02,cs+.02)}}
 g.restore();whLine(g,[x-w/2-.6,y,x+w/2+.6,y],.9,WHINK);whLine(g,[x-w/2-.6,y,x+w/2+.6,y],.45,'#c8a060')}
function whTent(g,cx,by,hw,h,ramp,o){o=o||{};const R=whRampN(ramp);whFill(g,whPolyS([cx-hw,by,cx-hw*.15,by-h,cx+hw*.15,by-h,cx+hw,by]),R,{k:.45,lw:.5,inside:(g,m)=>{g.strokeStyle=m[1];g.lineWidth=.3;g.globalAlpha=.6;g.beginPath();g.moveTo(cx,by-h);g.lineTo(cx-hw*.4,by);g.moveTo(cx,by-h);g.lineTo(cx+hw*.45,by);g.stroke();g.globalAlpha=1}});
 g.fillStyle=WHINK;g.beginPath();g.moveTo(cx-hw*.28,by);g.lineTo(cx,by-h*.55);g.lineTo(cx+hw*.28,by);g.closePath();g.fill();if(o.pole!==false)whLine(g,[cx,by-h,cx,by-h-1.4],.5,'#3a2a1a')}
function whFence(g,x0,x1,by,h,col){for(let x=x0;x<=x1+.01;x+=1.4)whLine(g,[x,by,x,by-h],.85,WHINK);whLine(g,[x0,by-h*.6,x1,by-h*.6],.85,WHINK);for(let x=x0;x<=x1+.01;x+=1.4)whLine(g,[x,by-.1,x,by-h+.15],.45,col||'#a07448');whLine(g,[x0,by-h*.6,x1,by-h*.6],.4,col||'#a07448')}
function whStake(g,x,by,h){whFill(g,whPolyS([x-.55,by,x-.55,by-h+.8,x,by-h,x+.55,by-h+.8,x+.55,by]),WHR.wood,{k:.2,lw:.38,noRim:1})}
function whSkull(g,x,y,s){s=s||1;whFill(g,whBlob([[x,y,1.15*s,1*s]]),PKM.bone,{k:.2,lw:.38,noRim:1});whDot(g,x-.42*s,y,.3*s,WHINK);whDot(g,x+.42*s,y,.3*s,WHINK)}
function whTotem(g,x,by,h){whLine(g,[x,by,x,by-h],1.1,WHINK);whLine(g,[x,by,x,by-h],.6,'#6a4a2a');whSkull(g,x,by-h-.4,.9)}
function whRock(g,x,y,rx,ry,M){whFill(g,whBlob([[x,y-ry,rx,ry],[x+rx*.5,y-ry*.6,rx*.6,ry*.6]]),M||WHR.rock,{k:.4,lw:.45})}
function whTreeAt(g,x,y,k,v){const e=whItemSpr(k,v,1);void e;g.save();g.translate(x,y);if(k==='round'||k==='dark')whTree(g,100+v,4.4,3.9,2,k==='dark'?WHR.leaf2:WHR.leaf);else if(k==='pine')whPine(g,200+v,11,WHR.pine,false);else if(k==='dead')whDead(g,v);else if(k==='bush')whBush(g,v,1.7,WHR.leaf);else if(k==='swtree')whSwamp(g,v);else if(k==='palm')whPalm(g,v);g.restore()}
function whPalm(g,v){whLine(g,[0,0,.8,-4,.4,-8],1.5,WHINK);whLine(g,[0,0,.8,-4,.4,-8],.9,'#8a6234');const fr=[[-4,-7],[4,-7.4],[-3.2,-9.6],[3.4,-9.8],[0,-10.6]];for(const f of fr){whFill(g,whPolyS([.4,-8.2,f[0]*.55,f[1]-1.2,f[0],f[1],f[0]*.6,f[1]+.2]),WHR.leaf,{k:.25,lw:.4,noRim:1})}void v}

/* ---- towns ---- */
const WHTL={1:[[4,-6,8,4,4,0],[21,-7,9,4,4,1],[12,0,9,4.5,4.5,2]],
 2:[[4,-14,8,4,4,0],[30,-15,10,4,4,1],[13,-17,7,4,4,2],[2,-6,9,4,4,3],[32,-6,10,4,4,4],[10,0,9,4.5,4.5,0],[23,0,10,4.5,4.5,1]],
 3:[[9,-19,6,3,3,0],[16,-19,6,3,3,1],[35,-19,6,3,3,2],[42,-19,6,3,3,3],[8,-13,6,3,3,4],[15,-13,6,3,3,0],[35,-13,6,3,3,1],[43,-13,6,3,3,2],[10,-8,6,3,3,3],[17,-8,6,3,3,4],[33,-8,6,3,3,0],[41,-8,6,3,3,1]]};
function whTownPaint(g,L,size,bio,night,f){const S=WHTS[bio]||WHTS.plains,Wd=WASITE['town'+size].w,X=x=>x-Wd/2,smoke=[];
 const H=(L0,i)=>{const [x,by,w,wh,rh,k]=L0,o={roof:S.roof[(k+i)%S.roof.length],wall:S.wall[(k+i*2)%S.wall.length],timber:S.timber&&(k+i)%2===0,night,snow:S.snow,flat:S.flat,dome:S.flat&&(k%3===1),stilt:S.stilt&&by===0,ch:(k%2===0&&!S.flat)?w-2.2:null};
  whHouse(g,L,X(x),by,w,wh,rh,o);if(o.ch!=null&&!S.flat)smoke.push([X(x)+o.ch+.6,by-wh-rh-2])};
 if(size<=1){whGround(g,0,-2.5,16,5,bio==='desert'?'#d8b47a':bio==='snow'?'#e8eef4':'#b89a68');
  whTreeAt(g,X(30),-8,bio==='desert'?'palm':bio==='snow'?'pine':'round',1);
  const L0=WHTL[1];H(L0[0],0);H(L0[1],1);
  // a haystack / woodpile and a fence
  whFill(g,whBlob([[X(26),-1.8,2.2,1.9]]),bio==='snow'?WHR.wood:whRampN('thatch'),{k:.3,lw:.45});whFence(g,X(1),X(8),0,2.2);H(L0[2],2)}
 else if(size===2){whGround(g,0,-4,21,8,bio==='desert'?'#d8b47a':bio==='snow'?'#e8eef4':'#b8a27a');
  const L0=WHTL[2];H(L0[0],0);H(L0[1],1);H(L0[2],2);
  // the chapel: a stone nave and a bell tower with a spire
  const cx=X(23);whTowerR(g,L,cx,-12,4.2,13,null,{night,win:false});whWin(g,L,cx-.6,-22,1.2,1.8,night);
  whFill(g,whPolyS([cx-2.6,-25,cx+2.6,-25,cx,-33.5]),whRampN(S.roof[1]==='thatch'?'slate':S.roof[1]),{k:.4,lw:.5});whLine(g,[cx,-33.5,cx,-35.6],.8,WHINK);whLine(g,[cx-.9,-34.8,cx+.9,-34.8],.8,WHINK);whLine(g,[cx,-33.5,cx,-35.6],.4,'#e8c060');whLine(g,[cx-.9,-34.8,cx+.9,-34.8],.4,'#e8c060');
  whHouse(g,L,X(18),-8,10,5,4,{roof:'slate',wall:'stone',night,win:2,door:5,snow:S.snow});
  H(L0[3],3);H(L0[4],4);if(bio!=='desert'&&bio!=='snow')whTreeAt(g,X(38),-1.5,'bush',2);
  // the well
  whFill(g,pkRect(X(19.5),-3,3,2.6,.4),whRampN('stone'),{k:.25,lw:.4});H(L0[5],5);H(L0[6],6)}
 else{whGround(g,0,-4,27,9,bio==='desert'?'#d8b47a':bio==='snow'?'#e8eef4':'#b8a27a');
  const rf=S.roof[1]==='thatch'?'red':S.roof[0]==='clay'?'clay':S.roof[0];
  whWallC(g,X(8),X(48),-31,4);whTowerR(g,L,X(8),-25,5,11,rf,{night});whTowerR(g,L,X(48),-25,5,11,rf,{night});
  for(let i=0;i<4;i++)H(WHTL[3][i],i);
  // the keep
  whFill(g,pkRect(X(22),-34,12,18,.2),whRampN('stone'),{k:.5,lw:.5,inside:(g,m)=>{g.strokeStyle=m[1];g.globalAlpha=.4;g.lineWidth=.25;for(let yy=-32;yy<-16;yy+=1.7){g.beginPath();g.moveTo(X(22),yy);g.lineTo(X(34),yy);g.stroke()}g.globalAlpha=1}});
  for(let x=X(22.2);x<X(33.6);x+=1.9)whFill(g,pkRect(x,-35.1,1.1,1.2,.1),whRampN('stone'),{k:.2,lw:.35,noRim:1});
  for(const wy of [-30,-25])for(const wx of [24,28,31])whWin(g,L,X(wx),wy,1,1.5,night);
  whTowerR(g,L,X(28),-34,4.6,6,rf,{night,flag:[whBnCol('g'),whBnCol('f'),'#f4ecd8'],f:f>>1});
  for(let i=4;i<12;i++)H(WHTL[3][i],i);
  // side walls, the front wall with its towers and the gate
  whFill(g,pkRect(X(6),-27,3,22,.2),whRampN('stone'),{k:.3,lw:.45});whFill(g,pkRect(X(47),-27,3,22,.2),whRampN('stone'),{k:.3,lw:.45});
  whWallC(g,X(6),X(50),-.5,6.5);
  g.fillStyle=WHINK;g.beginPath();g.moveTo(X(25),0);g.lineTo(X(25),-4.2);g.quadraticCurveTo(X(28),-6.6,X(31),-4.2);g.lineTo(X(31),0);g.closePath();g.fill();
  g.fillStyle='#6a4428';g.beginPath();g.moveTo(X(25.6),0);g.lineTo(X(25.6),-4);g.quadraticCurveTo(X(28),-6,X(30.4),-4);g.lineTo(X(30.4),0);g.closePath();g.fill();g.strokeStyle='#3a2414';g.lineWidth=.3;for(let x=26.6;x<30.4;x+=1.2){g.beginPath();g.moveTo(X(x),-.2);g.lineTo(X(x),-4.6);g.stroke()}
  whTowerR(g,L,X(5),0,5.4,13,rf,{night});whTowerR(g,L,X(51),0,5.4,13,rf,{night});whTowerR(g,L,X(22.5),0,4.4,11,null,{night});whTowerR(g,L,X(33.5),0,4.4,11,null,{night});
  if(night){whFlame(L,X(22.5),-12.2,1.6,f);whFlame(L,X(33.5),-12.2,1.6,f+1)}}
 for(let i=0;i<smoke.length;i++)if(i<3)whSmoke(g,smoke[i][0],smoke[i][1],f+i,3)}

/* ---- the entry point ---- */
// a sprite with a lit layer: paint(g, L) with L the lit canvas's context at night (else g)
function whMakeL(w,h,ax,ay,K,night,paint){let L=null,lc=null;const e=whMake(w,h,ax,ay,K,g=>{if(night){lc=pxCanvas(Math.ceil(w*K),Math.ceil(h*K));L=lc.getContext('2d');L.setTransform(K,0,0,K,ax*K,ay*K);L.lineJoin='round';L.lineCap='round'}paint(g,L||g)});if(lc)e.lit=lc;return e}
const WHSITE={};   // kind -> {box(o) -> [w,h,ax,ay], paint(g,L,o)}
function whSprite(kind,o,K){if(!whOn())return null;K=Math.max(1,K|0);
 if(kind==='site'){const P=WHSITE[o.kind];if(!P)return null;const b=P.box(o),night=!!o.night,e=whMakeL(b[0],b[1],b[2],b[3],K,night,(g,L)=>P.paint(g,L,o,night,(o.frame|0)));e.x0=-(b[0]/2-5);e.x1=b[0]/2-5;e.y0=-(b[3]-6);e.y1=Math.min(e.y1,2);return e}   // the bounds of the picture, not of its padded canvas (name plates and markers sit on its top)
 if(kind==='deco'){const sz=clamp(o.size|0||1,1,3),D=WASITE['town'+sz];return whMakeL(D.w+16,D.h+30,(D.w+16)/2,D.h+24,K,!!o.night,(g,L)=>whTownDeco(g,L,sz,o.own,o.mask|0,o.pr==null?1:o.pr|0,!!o.night,(o.frame|0)&3))}
 if(kind==='band'||kind==='co'){if(typeof whBandSprite!=='function')return null;return whBandSprite(kind,o,K)}
 if(kind==='east'){if(typeof whEastSprite!=='function')return null;return whEastSprite(o,K)}
 return null}
WHSITE.town={box:o=>{const D=WASITE['town'+clamp(o.size|0||1,1,3)];return[D.w+12,D.h+14,(D.w+12)/2,D.h+8]},paint:(g,L,o,night,f)=>whTownPaint(g,L,clamp(o.size|0||1,1,3),o.bio||'plains',night,f&3)};
/* ---- the town's dressing: the owner's banner, prosperity, situations, the crisis states (same mask as waTownDeco) ---- */
function whFlagC(k){return[PAL[k[0]]||k[0],PAL[k[1]]||k[1],PAL[k[2]]||k[2]]}
function whTownDeco(g,L,sz,own,mask,pr,night,f){const D=WASITE['town'+sz],TW=D.w,TH=D.h,X=x=>x-TW/2,has=k=>!!(mask&(1<<WASITK.indexOf(k))),R=waRng(sz*97+mask);
 const cr=has('crsiege')||has('haunted')||has('occupied')||has('sacked')||has('burned');
 const soot=n=>{for(let i=0;i<n;i++){const x=X(3+waHash(i,sz,81)*(TW-6)),y=-2-waHash(i,sz,82)*(TH*.55);g.globalAlpha=.45;g.fillStyle='#1a1a1c';g.beginPath();g.ellipse(x,y,1.3,.7,0,0,Math.PI*2);g.fill()}g.globalAlpha=1};
 const fires=()=>WARAIDF[sz].forEach((p,i)=>{const x=X(p[0]),y=p[1];whSmoke(g,x+.5,y-5,f+i,4);g.globalAlpha=.5;whSmoke(g,x-.5,y-8,f+i+2,3);g.globalAlpha=1;whFlame(L,x,y+.6,3.6,f+i)});
 const pole=(x,by,h,C,dir,skull)=>{whPole(g,x,by-h,by);whPennant(g,x,by-h+.3,C,f>>1,5,3.4,dir);if(skull)whSkull(g,x,by-h-1.2,.8)};
 if(!cr){
  if(pr===0){soot(8);for(let x=X(TW-6);x<X(TW-1);x+=1.6)whLine(g,[x,0,x+(x%2?.5:-.4),-2.1],.9,WHINK);whLine(g,[X(TW-6),-1.3,X(TW-3),-1.6],.8,WHINK)}
  else if(pr===2){whBush(g,7,1.7,WHR.leaf);g.save();g.translate(X(-2),0);whBush(g,9,1.7,WHR.leaf);g.restore();
   g.save();g.translate(X(TW-1),.5);whFill(g,pkRect(-2.6,-2.6,5.2,1.8,.3),WHR.wood,{k:.25,lw:.4});for(const c of [['#c4493f',-1.4],['#e8c060',.2],['#4f9f8a',1.5]])whDot(g,c[1],-3.2,.9,c[0]);whDot(g,-1.6,-.6,.8,WHINK);whDot(g,1.6,-.6,.8,WHINK);g.restore()}
  if(has('festival')){const y0=-(sz===3?26:sz===2?18:12),x0=X(1),x1=X(TW-2),cols=['#e8506a','#ffd84a','#4a86c6','#7cc44c','#a06ae8','#ff9a3a'];
   whPole(g,x0-1,y0-1,0);whPole(g,x1+1,y0-1,0);const yA=t=>y0+Math.sin(t*Math.PI)*3;whLine(g,[x0-1,y0,(x0+x1)/2,y0+3,x1+1,y0],.35,'#3a2a1a');
   for(let i=0,n=Math.floor((x1-x0)/2.4);i<n;i++){const t=(i+.5)/n,x=x0+t*(x1-x0),y=yA(t);g.fillStyle=WHINK;g.beginPath();g.moveTo(x-1,y-.2);g.lineTo(x+1,y-.2);g.lineTo(x,y+1.9);g.closePath();g.fill();g.fillStyle=cols[i%cols.length];g.beginPath();g.moveTo(x-.7,y);g.lineTo(x+.7,y);g.lineTo(x,y+1.4);g.closePath();g.fill()}
   if(night)for(let i=0;i<4;i++){const t=(i+.5)/4,x=x0+t*(x1-x0),y=yA(t)+2.2;L.fillStyle='#ffd36a';L.beginPath();L.ellipse(x,y,.7,.9,0,0,Math.PI*2);L.fill();whGlowAt(L,x,y,3,'rgba(255,190,90,.9)',.5)}}
  if(has('boom')){const ax=0;g.save();g.translate(ax-10,0);whFill(g,pkRect(-4,-3.4,8,3.4,.2),WHR.wood,{k:.25,lw:.4});const P=new Path2D();P.moveTo(-4.8,-3.2);P.lineTo(4.8,-3.2);P.lineTo(4,-5.6);P.lineTo(-4,-5.6);P.closePath();g.strokeStyle=WHINK;g.lineWidth=.9;g.stroke(P);g.fillStyle='#f4ecd8';g.fill(P);g.save();g.clip(P);g.fillStyle='#c4493f';for(let x=-4.8;x<5;x+=2.4)g.fillRect(x,-6,1.2,3);g.restore();whDot(g,-2,-1.6,.7,'#e8c060');whDot(g,0,-1.8,.7,'#7cc44c');whDot(g,2,-1.6,.7,'#e86a3a');g.restore();
   g.save();g.translate(X(TW*.5+9),0);for(const b of [[-1.2,0],[1.2,0],[0,-2]])whFill(g,pkRect(b[0]-1.1,b[1]-2,2.2,2,.2),WHR.wood,{k:.2,lw:.38});g.restore()}
  if(has('famine')){g.save();g.translate(-9,0);whFill(g,pkRect(-4,-2.2,8,2.2,.2),WHR.wood,{k:.25,lw:.4});whLine(g,[-3.6,-2.2,-3.6,-5],.8,WHINK);whLine(g,[3.6,-2.2,3.6,-5],.8,WHINK);whLine(g,[-3.6,-2.2,-3.6,-5],.4,'#7a5030');whLine(g,[3.6,-2.2,3.6,-5],.4,'#7a5030');g.restore();
   const a=f&3;for(const c of [[X(2+a),-TH+6],[X(TW-6-a),-TH+10]]){const y=c[1]+(a&1)*.6;whLine(g,[c[0]-1.2,y-.6,c[0],y,c[0]+1.2,y-.6],.5,'#14141a')}}
  if(has('plague')){const gx=X(-2);whPole(g,gx,-15,0);g.fillStyle=WHINK;g.fillRect(gx+.2,-14.6,5.6,5);g.fillStyle='#22262a';g.fillRect(gx+.6,-14.2,4.8,4.2);g.fillStyle='#e8e0c8';g.beginPath();g.moveTo(gx+3,-13.4);g.lineTo(gx+3,-10.6);g.moveTo(gx+1.6,-12);g.lineTo(gx+4.4,-12);g.strokeStyle='#e8e0c8';g.lineWidth=.6;g.stroke();
   for(let i=0;i<8;i++){const ph=((f+i*2)&7)/8,x=X(2+waHash(i,3,71)*(TW-4)),y=-4-waHash(i,4,71)*(TH*.55)-ph*3;g.globalAlpha=(1-ph)*.55;g.fillStyle='#8ac040';g.beginPath();g.arc(x,y,.8+ph,0,Math.PI*2);g.fill()}g.globalAlpha=1}
  if(has('siege')){whTent(g,X(-1),1,3.4,6.5,'canvas');whTent(g,X(TW+1),1,3.4,6.5,'canvas');g.save();g.translate(0,1.4);whFill(g,pkRect(-4,-2.6,8,2,.4),WHR.wood,{k:.25,lw:.4});whFill(g,pkRect(-5,-2.2,2,1.2,.5),whRampN('iron'),{k:.2,lw:.35});whDot(g,-2.6,-.4,.8,WHINK);whDot(g,2.6,-.4,.8,WHINK);g.restore()}
  if(has('raided')){soot(14);fires()}}
 else{
  if(has('crsiege')){whTent(g,X(-1),1,3.4,6.5,'canvas');whTent(g,X(TW+1),1,3.4,6.5,'canvas');pole(X(-3),0,12,whFlagC(['#1c2228','#0c1014','#6a7a4a']),1,false)}
  if(has('haunted')){soot(18);for(const gx of [X(-3),X(TW-1),X(4),X(TW/2),X(TW-10)]){whFill(g,pkRect(gx-1.1,-3.2,2.2,3.2,1),whRampN('stone'),{k:.2,lw:.38})}pole(X(TW-6),0,26,whFlagC(['#4a2c80','#1c0c34','#8adcc8']),-1,true);
   for(let i=0;i<10;i++){const ph=((f*2+i*3)&7)/8,x=X(2+waHash(i,5,72)*(TW-4)),y=-5-waHash(i,6,72)*(TH*.6)-ph*3;L.globalAlpha=(1-ph)*.75;L.fillStyle=night?'#8af0d8':'#5ec0a8';L.beginPath();L.arc(x,y,.6,0,Math.PI*2);L.fill();L.globalAlpha=1}}
  if(has('occupied')){const C=whFlagC(['#2f5c2a','#14281a','#c9bd98']);pole(X(-2),0,28,C,1,true);pole(X(TW),0,22,C,-1,true);pole(0,-TH+4,10,C,1,false)}
  if(has('burned')){const C=whFlagC(['#3a6cb4','#1c3c84','#e8eef2']);pole(X(TW-2),0,26,C,-1,false);pole(X(-2),0,20,C,1,false)}
  if(has('sacked')||has('burned')){soot(12);fires()}}
 // the owner's banner on a tall pole beside the town
 if(own){const px=X(sz===3?TW-7:sz===2?TW-3:TW-2),py=-(sz===3?44:sz===2?34:24);whPole(g,px,py,0);whBanner(g,px+.1,py+1,own,f>>1,sz>=2?1:.8)}}
WHSITE.ruin={box:o=>[46,40,23,34],paint:(g,L,o)=>whRuin(g,(o.n|0)&3)};
function whRuin(g,v){whGround(g,0,-2,17,5,'#9a958a',.55);const S=whRampN('stone');
 const col=(x,h,broken)=>{whFill(g,pkRect(x-1.6,-1.2,3.2,1.2,.2),S,{k:.2,lw:.4});const P=broken?whPolyS([x-1.1,-1.2,x-1.1,-h,x-.2,-h-.8,x+.4,-h+.3,x+1.1,-h-.2,x+1.1,-1.2]):pkRect(x-1.1,-h,2.2,h-1.2,.1);
  whFill(g,P,S,{k:.45,lw:.45,inside:(g,m)=>{g.strokeStyle=m[1];g.globalAlpha=.5;g.lineWidth=.25;g.beginPath();g.moveTo(x-.3,-h+1);g.lineTo(x-.3,-1.4);g.moveTo(x+.5,-h+1);g.lineTo(x+.5,-1.4);g.stroke();g.globalAlpha=1}});if(!broken)whFill(g,pkRect(x-1.6,-h-1,3.2,1,.15),S,{k:.2,lw:.4})};
 // a broken wall behind
 whFill(g,whPolyS([0,0,0,-4,1.6,-6.4,3.2,-5.2,4.6,-7.2,6.4,-5.6,7.6,-4.4,8,0]),S,{k:.45,lw:.45,inside:(g,m)=>{g.strokeStyle=m[1];g.lineWidth=.25;g.globalAlpha=.5;for(let y=-1.5;y>-7;y-=1.6){g.beginPath();g.moveTo(0,y);g.lineTo(8,y);g.stroke()}g.globalAlpha=1}});
 col(-10.5,16,false);col(-2.5,16,false);whFill(g,pkRect(-12.8,-19.2,12.8,2,.2),S,{k:.3,lw:.45});
 col(7.5,9,true);col(13,4.5,true);whRock(g,-6,0,1.8,1.1,S);whRock(g,4,.6,1.4,.9,S);whRock(g,-15,.4,1.6,1,S);
 // ivy
 for(let i=0;i<16;i++){const x=-13+waHash(i,3,33)*24,y=-18+waHash(i,4,33)*17;whDot(g,x,y,.7,i&1?'#4a8c46':'#2f6c38',.9)}
 whTreeAt(g,13,1,'bush',v);void v}

/* ---- lairs (a contract's target and the heart of a nest), by faction ---- */
const WHLF={dead:'undead',horde:'orc',barb:'bandit',east:'bandit'};
function whCampfire(g,L,x,y,f){for(let i=0;i<5;i++){const a=i/5*Math.PI*2;whDot(g,x+Math.cos(a)*1.5,y+Math.sin(a)*.6,.55,'#6a6a6a')}whLine(g,[x-1.2,y+.2,x+1.2,y-.4],.7,'#5a3a1e');whFlame(L,x,y,2.6,f)}
function whEyes(L,x,y,col,f,night){if(!(night||(f&4)))return;L.fillStyle=col;L.beginPath();L.ellipse(x-.9,y,.45,.3,0,0,Math.PI*2);L.ellipse(x+.9,y,.45,.3,0,0,Math.PI*2);L.fill();whGlowAt(L,x,y,2.2,col,.5)}
function whLair(g,L,fk,night,f){fk=WHLF[fk]||fk;const S=whRampN('stone'),D=whRampN('dark');
 if(fk==='gob'){whGround(g,0,-1.5,16,4.5,'#8c6e48');
  whFill(g,whBlob([[0,-5.5,8.5,6.5],[-5,-3,5,3.5],[5,-3,5,3.6]]),WHR.dry,{k:.6,lw:.55,inside:(g,m)=>{for(let i=0;i<10;i++){const a=waHash(i,1,5)*Math.PI,r=3+waHash(i,2,5)*5;whLine(g,[Math.cos(a)*r-1,-5.5-Math.sin(a)*r*.7,Math.cos(a)*r+1,-5.8-Math.sin(a)*r*.7],.35,m[1],.6)}}});
  g.fillStyle=WHINK;g.beginPath();g.ellipse(0,-2.4,2.6,2.6,0,Math.PI,0);g.lineTo(2.6,0);g.lineTo(-2.6,0);g.closePath();g.fill();whEyes(L,0,-2,'#ffd84a',f,night);
  for(const x of [-15,-12.6,-10.2,10.2,12.6,15])whStake(g,x,0,5+(x%2?1:0));whTotem(g,8,-1,9);whPole(g,-7,-13,-2);whPennant(g,-7,-12.8,['#7cc44c','#3f8a3a','#ffd84a'],f>>1,4,2.6);whCampfire(g,L,-4.5,0,f)}
 else if(fk==='undead'){whGround(g,0,-1.5,17,5,'#4a5a42');
  g.save();g.translate(-12,0);whDead(g,3);g.restore();
  whFill(g,pkRect(-6,-11,12,11,.2),S,{k:.5,lw:.55,inside:(g,m)=>{g.strokeStyle=m[1];g.globalAlpha=.45;g.lineWidth=.25;for(let y=-9.5;y<0;y+=1.6){g.beginPath();g.moveTo(-6,y);g.lineTo(6,y);g.stroke()}g.globalAlpha=1}});
  whFill(g,whPolyS([-7.4,-10.6,7.4,-10.6,0,-15.6]),S,{k:.4,lw:.5});whSkull(g,0,-12.4,.8);
  g.fillStyle=WHINK;g.beginPath();g.moveTo(-2.2,0);g.lineTo(-2.2,-5);g.quadraticCurveTo(0,-7.6,2.2,-5);g.lineTo(2.2,0);g.closePath();g.fill();
  L.fillStyle=night?'#8af0b8':'#5ec08a';L.globalAlpha=.85;L.beginPath();L.moveTo(-1.3,0);L.lineTo(-1.3,-4.4);L.quadraticCurveTo(0,-6.2,1.3,-4.4);L.lineTo(1.3,0);L.closePath();L.fill();L.globalAlpha=1;whGlowAt(L,0,-3,5,'rgba(120,240,170,.9)',.4);
  for(const p of [[-14,0],[-9,1],[10,1],[14,-.5],[11,-4]])whFill(g,pkRect(p[0]-1,p[1]-3,2,3,1),S,{k:.2,lw:.38})}
 else if(fk==='beast'){whGround(g,0,-1.5,16,4.5,'#7a6a52');
  whFill(g,whBlob([[0,-8,9,8],[-8,-4,6.5,5],[8,-3.6,6.5,4.6],[4,-11,5.5,4.5]]),S,{k:.7,lw:.55,inside:(g,m)=>{for(let i=0;i<7;i++){const x=-9+waHash(i,1,12)*18,y=-13+waHash(i,2,12)*9;whLine(g,[x,y,x+1.3,y+1],.35,m[0],.5)}}});
  g.fillStyle=WHINK;g.beginPath();g.ellipse(0,-3.2,4.4,4.4,0,Math.PI,0);g.lineTo(4.4,0);g.lineTo(-4.4,0);g.closePath();g.fill();whEyes(L,0,-3,'#ffd84a',f,night);
  for(const b of [[-12,0],[11,.3],[7,1]])whDeco(g,'bones',b[0],b[1],.3);whTreeAt(g,-15,0,'bush',1)}
 else if(fk==='orc'){whGround(g,0,-1.5,17,5,'#7a6a52');
  for(let x=-16;x<=16;x+=1.7){if(x>-3&&x<3)continue;whStake(g,x,0,5.4+((x*7)%3)*.4+(Math.abs(x)<4?2:0))}
  whTent(g,-8,-5,5,9,PKM.leather);whTent(g,5,-6,5,9,PKM.leather);whPole(g,-1,-24,-5);whPennant(g,-1,-23.6,['#c4493f','#7e2a22','#e8e0c8'],f>>1,5,3.4);
  whSkull(g,-4,-12,.9);whSkull(g,3.2,-12,.9);whCampfire(g,L,0,0,f)}
 else if(fk==='bandit'){whGround(g,0,-1.5,17,5,'#9a8a68');
  whFill(g,whPolyS([1,0,1.6,-19,3,-21,5.2,-19.6,7,-21,7.6,-18,8,0]),S,{k:.5,lw:.5,inside:(g,m)=>{g.strokeStyle=m[1];g.globalAlpha=.45;g.lineWidth=.25;for(let y=-2;y>-19;y-=1.8){g.beginPath();g.moveTo(1,y);g.lineTo(8,y);g.stroke()}g.globalAlpha=1}});
  whWin(g,L,4,-14,1.2,2,night);g.fillStyle=WHINK;g.fillRect(3.6,-3.6,1.8,3.6);whPole(g,2,-27,-20);whPennant(g,2,-26.8,['#5a5a66','#2a2a32','#e8c060'],f>>1,4,2.6);
  whTent(g,-8,0,5.5,8,'canvas');for(const c of [[11,0],[13.4,-.2],[12.2,-2]])whFill(g,pkRect(c[0]-1.1,c[1]-2,2.2,2,.2),WHR.wood,{k:.2,lw:.38});whCampfire(g,L,-1.5,.5,f)}
 else if(fk==='serpent'){whGround(g,0,-1.5,17,5,'#6a7a4a');
  g.fillStyle=WHINK;g.beginPath();g.ellipse(0,-2,10.6,4.6,0,0,Math.PI*2);g.fill();g.fillStyle='#2c4a40';g.beginPath();g.ellipse(0,-2,10,4,0,0,Math.PI*2);g.fill();g.fillStyle='#4a7a6a';g.globalAlpha=.6;g.beginPath();g.ellipse(-3,-3.2,4,1.2,0,0,Math.PI*2);g.fill();g.globalAlpha=1;
  const snake=(x,y,h,col,dir)=>{const P=[x,y,x+dir*1.2,y-h*.35,x-dir*.6,y-h*.7,x+dir*.6,y-h];whLine(g,P,1.7,WHINK);whLine(g,P,1,col);whFill(g,whBlob([[x+dir*1.2,y-h-.3,1.3,.85]]),[ '#10200a',col,col,col,'#d6f6b8'],{k:.2,lw:.4,noRim:1});whDot(g,x+dir*1.6,y-h-.5,.25,'#ffd84a')};
  snake(-3,-1,6,'#5d7a3a',1);snake(3,-2,8,'#a7b85a',-1);for(const r of [[-14,0],[13,-1]])whDeco(g,'reed',r[0],r[1],.5);whRock(g,-8,1,1.4,.8);whRock(g,9,1.2,1.2,.7)}
 else if(fk==='ent'){whGround(g,0,-1.5,17,5,'#3f6a3a');
  g.save();g.translate(-9,-1);whTree(g,3,5,4.5,4,WHR.leaf2);g.restore();g.save();g.translate(9,-1);whTree(g,5,5,4.5,4,WHR.leaf2);g.restore();
  g.save();g.translate(0,1);whTree(g,7,7,6,6,WHR.leaf);g.restore();whFill(g,pkRect(-1.6,-6,3.2,6.4,.6),WHR.bark,{k:.3,lw:.45});whEyes(L,0,-4.2,'#ffd84a',f,night);whLine(g,[-.8,-2.4,.8,-2.4],.4,WHINK);
  for(let i=0;i<4;i++){const ph=((f+i*2)&7)/8;whDot(g,-9+i*6,-12-ph*6,.6,'#7cc44c',1-ph)}}
 else if(fk==='ogre'){whGround(g,0,-1.5,17,5,'#8a7a5a');
  whTent(g,-6,0,8.5,11,PKM.leather);whPole(g,11,-16,0);whSkull(g,11,-17,1.2);whLine(g,[8.6,-12,13.4,-12],.7,WHINK);
  g.fillStyle=WHINK;g.beginPath();g.ellipse(4,-2.6,3,2.4,0,0,Math.PI*2);g.fill();g.fillStyle='#3a3a40';g.beginPath();g.ellipse(4,-2.6,2.5,1.9,0,0,Math.PI*2);g.fill();whFlame(L,4,.4,2.2,f);whSmoke(g,4,-6,f,3);
  whDeco(g,'bones',-14,0,.2);whFill(g,pkRect(13,-1.6,2.6,1.6,.2),WHR.wood,{k:.2,lw:.38})}
 else if(fk==='wyvern'){whGround(g,0,-1.5,18,5,'#7a776c');
  const P=[];for(let i=0;i<=12;i++){const t=i/12;P.push(-3.4-t*11+(waHash(i,1,51)-.5)*2,-36+t*36)}const Q=[];for(let i=12;i>=0;i--){const t=i/12;Q.push(3.6+t*11+(waHash(i,2,51)-.5)*2,-36+t*36)}
  whFill(g,whPolyS(P.concat(Q)),S,{k:.8,lw:.55,inside:(g,m)=>{for(let i=0;i<6;i++){const y=-30+i*5;whLine(g,[-6+(i&1)*3,y,-2+(i&1)*3,y+1.2],.35,m[1],.6)}}});
  whFill(g,pkRect(-5.6,-38.2,11.2,2.6,1.2),WHR.wood,{k:.3,lw:.45});for(const x of [-1.6,0,1.6])whDot(g,x,-38.6,.7,'#e8e0c8');
  // the wyvern on its nest
  const up=(f>>1)&1;g.save();g.translate(1,-41-up);whFill(g,whPolyS([-1,0,-6,-4-up*2,-3,-1,-7,-1,-2,1]),['#1a0a1a','#4a1c3a','#7a2a50','#a84a6a','#e8a0b0'],{k:.3,lw:.45});
  whFill(g,whBlob([[0,0,3.2,1.6],[3.2,-1.4,1.4,1.1]]),['#0b1a40','#24508f','#3f74c0','#6ea4e4','#d4ecff'],{k:.3,lw:.45});whDot(g,3.8,-1.6,.3,'#ffd84a');g.restore()}
 else{whGround(g,0,-1.5,17,5,'#4a3a6a');   // riftspawn: a mound of void crystal with glowing pods
  whFill(g,whBlob([[0,-7,9,7],[-8,-3.6,6,4.4],[8,-3.6,6,4.4]]),PKM.void,{k:.6,lw:.55});
  for(const s of [[-5,-12,5,-.4],[0,-14,8,0],[5,-11,5,.4],[-10,-6,4,-.6],[10,-6,4,.6]])whFill(g,whPolyS([s[0]-1,s[1]+s[2]*.3,s[0]+s[3]*s[2]*.3,s[1]-s[2]*.7,s[0]+1,s[1]+s[2]*.3]),PKM.purple,{k:.3,lw:.4});
  for(const p of [[-4,-4],[2,-8],[5,-3]]){const ph=((f+p[0])&3)/3;L.fillStyle=ph<.5?'#efe2ff':'#c49eff';L.beginPath();L.arc(p[0],p[1],1,0,Math.PI*2);L.fill();whGlowAt(L,p[0],p[1],3,'rgba(190,150,255,.9)',.5)}}}
WHSITE.lair={box:o=>o.f==='wyvern'?[48,62,24,56]:[46,40,23,34],paint:(g,L,o,night,f)=>whLair(g,L,o.f||'bandit',night,f&7)};
WHSITE.nest={box:o=>{const t=clamp(o.tier|0||1,1,3),D=WASITE['nest'+t];return[D.w+12,D.h+(t>=3?20:12)+(o.f==='wyvern'&&t>1?22:0),(D.w+12)/2,D.h+(t>=3?14:6)+(o.f==='wyvern'&&t>1?22:0)]},
 paint:(g,L,o,night,f)=>{const t=clamp(o.tier|0||1,1,3),fk=o.f||'bandit',C=WANESTC[WHLF[fk]||fk]||WANESTC.bandit,col=[PAL[C[0]],PAL[C[1]],PAL[C[2]]];
  if(t<=1){whGround(g,0,-1,12,4,'#8c6e48');whFill(g,whBlob([[0,-3.2,7,4.4],[-4,-1.6,4,2.6]]),WHR.dry,{k:.5,lw:.5});g.fillStyle=WHINK;g.beginPath();g.ellipse(1,-1.4,2.4,2.2,0,Math.PI,0);g.lineTo(3.4,0);g.lineTo(-1.4,0);g.closePath();g.fill();whEyes(L,1,-1.2,'#ffd84a',f,night);
   for(const b of [[-9,0],[8,-.5]])whDeco(g,'bones',b[0],b[1],.4);whPole(g,-5,-13,-3);whPennant(g,-5,-12.8,col,f>>1,3.6,2.4);return}
  if(t>=3){whGround(g,0,-1.5,23,6,'#7a6a52');for(let x=-23;x<=-15;x+=1.7)whStake(g,x,0,5.4+((x*7)%2));for(let x=15;x<=23;x+=1.7)whStake(g,x,0,5.4+((x*7)%2));whTotem(g,-19,-1,10);whTotem(g,19,-1,10)}
  whLair(g,L,fk,night,f);if(t>=3){whPole(g,1,-34,-6);whPennant(g,1,-33.6,col,f>>1,6,4.2)}}};

/* ---- a rift: two leaning standing stones about a turning tear of the realm's light ---- */
const WHREALM={ashen:['#5a0c04','#b42a0a','#ff6418','#ffb12e','#fff6b8'],hollow:['#1a0a34','#46268a','#8656d0','#c49eff','#ffffff'],glass:['#0c3a3a','#2a8a8c','#64d2d0','#bef2ee','#ffffff']};
WHSITE.portal={box:o=>[42,52,21,46],paint:(g,L,o,night,f)=>{const C=WHREALM[o.realm]||WHREALM.hollow,S=whRampN('stone'),ph=(f%12)/12;whGround(g,0,-1,14,4,'#3a3446');
 const stone=(x,lean)=>whFill(g,whPolyS([x-2,0,x-1.8+lean*1.6,-16,x-.6+lean*3.2,-22,x+1+lean*3,-21,x+2+lean*1.4,-14,x+2.2,0]),S,{k:.5,lw:.5,inside:(g,m)=>{for(let j=5;j<18;j+=5){L.fillStyle=C[3];L.globalAlpha=(Math.sin(ph*6.28+j)*.5+.5)*.9;L.beginPath();L.arc(x+lean*j/7+.2,-j,.55,0,Math.PI*2);L.fill();L.globalAlpha=1}}});
 stone(-11,1);stone(11,-1);
 // the tear: an ellipse of light, rings turning inward
 L.save();L.translate(0,-15);const sc=1+Math.sin(ph*6.28)*.04;L.scale(sc,1/sc);
 const gr=L.createRadialGradient(0,0,.5,0,0,8);gr.addColorStop(0,C[4]);gr.addColorStop(.35,C[3]);gr.addColorStop(.75,C[2]);gr.addColorStop(1,C[1]);
 L.beginPath();L.ellipse(0,0,5.6,13.5,0,0,Math.PI*2);L.fillStyle=WHINK;L.fill();L.beginPath();L.ellipse(0,0,4.9,12.8,0,0,Math.PI*2);L.fillStyle=gr;L.fill();
 L.save();L.clip();L.lineWidth=.6;for(let i=0;i<4;i++){const a=ph*6.28+i*1.57;L.strokeStyle=i&1?C[4]:C[1];L.globalAlpha=.7;L.beginPath();L.ellipse(0,0,4.4-i*.9,12-i*2.6,0,a,a+2.2);L.stroke()}L.restore();L.restore();
 whGlowAt(L,0,-15,14,C[3],.35);for(let i=0;i<6;i++){const q=((ph+i/6)%1),x=(i%2?1:-1)*(7+(i%3)),y=-4-q*22;L.globalAlpha=1-q;L.fillStyle=C[3];L.beginPath();L.arc(x,y,.5,0,Math.PI*2);L.fill()}L.globalAlpha=1}};
/* ---- dungeons (24-endgame.js): 0 a barrow mound, 1 a cave lair, 2 a black keep, 3 a rotting grove; open (a baleful light) or cleared (dark, broken) ---- */
function whDgn(g,L,v,lit,f){const S=whRampN('stone'),glow=v===3?'#9cf06a':v===0?'#7ae0d0':'#ff8a3a',gl2=v===3?'#e0ffc0':v===0?'#dffff4':'#ffe0a0';
 whGround(g,0,-1.5,18,5,v===0?'#4f7d3e':v===1?'#7a6a52':v===2?'#4a4a4a':'#3f5a32');
 const mouth=(x,y,w,h)=>{g.fillStyle=WHINK;g.beginPath();g.moveTo(x-w,y);g.lineTo(x-w,y-h*.55);g.quadraticCurveTo(x,y-h*1.2,x+w,y-h*.55);g.lineTo(x+w,y);g.closePath();g.fill();
  if(lit){L.fillStyle=glow;L.globalAlpha=.85;L.beginPath();L.moveTo(x-w*.6,y);L.lineTo(x-w*.6,y-h*.45);L.quadraticCurveTo(x,y-h*.95,x+w*.6,y-h*.45);L.lineTo(x+w*.6,y);L.closePath();L.fill();L.globalAlpha=1;whGlowAt(L,x,y-h*.4,w*3,glow,.45)}};
 if(v===0){whFill(g,whMound(0,15,11),WHR.leaf,{k:.8,lw:.55});whFill(g,pkRect(-5.4,-10.6,10.8,10.6,.4),S,{k:.4,lw:.5});mouth(0,0,3.4,8.2);
  for(const x of [-13,12])whFill(g,whPolyS([x-1.4,0,x-1.2,-10,x,-11.4,x+1.4,-10,x+1.5,0]),S,{k:.3,lw:.45})}
 else if(v===1){whFill(g,whBlob([[0,-7,15,9],[-8,-4,8,5],[9,-3.6,7,4.6]]),S,{k:.8,lw:.55});mouth(0,0,5,9);for(const b of [[-11,0],[9,.6]])whDeco(g,'bones',b[0],b[1],.3)}
 else if(v===2){whWallC(g,-14,-6,0,12);whWallC(g,6,15,0,9);whFill(g,pkRect(-6,-28,12,28,.2),D2(),{k:.5,lw:.55});for(let x=-6;x<6;x+=2.6)whFill(g,pkRect(x,-30.2,1.4,2.3,.1),D2(),{k:.2,lw:.38,noRim:1});
  mouth(0,0,2,7);if(lit){L.fillStyle=glow;L.fillRect(-.9,-20,1.8,3.6);whGlowAt(L,0,-18,4,glow,.5)}else{g.fillStyle=WHINK;g.fillRect(-.9,-20,1.8,3.6)}}
 else{for(const t of [[-11,-1],[9,1],[-2,3]]){g.save();g.translate(t[0],0);g.scale(1.6+t[1]*.1,1.6+t[1]*.1);whDead(g,t[1]+3);g.restore()}
  if(lit){L.fillStyle=glow;L.globalAlpha=.75;L.beginPath();L.ellipse(0,-2.4,6,2.6,0,0,Math.PI*2);L.fill();L.fillStyle=gl2;L.beginPath();L.ellipse(0,-2.4,3,1.3,0,0,Math.PI*2);L.fill();L.globalAlpha=1;whGlowAt(L,0,-3,9,glow,.5)}else{g.fillStyle='#2a2a26';g.beginPath();g.ellipse(0,-2.4,6,2.6,0,0,Math.PI*2);g.fill()}}
 if(!lit){g.globalAlpha=.5;for(let i=0;i<8;i++){const x=-14+waHash(i,v,91)*28,y=-2-waHash(i,v,92)*12;whDot(g,x,y,1,'#141414')}g.globalAlpha=1}
 else for(let i=0;i<5;i++){const q=(((f|0)+i*2)&7)/8,x=-6+waHash(i,v,93)*12,y=-10-waHash(i,v,94)*10-q*4;L.globalAlpha=1-q;L.fillStyle=gl2;L.beginPath();L.arc(x,y,.5,0,Math.PI*2);L.fill();L.globalAlpha=1}}
function whMound(cx,rx,ry){const a=[];for(let i=0;i<=24;i++){const t=Math.PI*i/24;a.push(cx-Math.cos(t)*rx,-Math.sin(t)*ry*(1-.15*Math.pow(Math.sin(t),6)))}return whPolyS(a)}
function D2(){return['#06070a','#14161c','#262a32','#3a404a','#6a727e']}
WHSITE.dgn={box:o=>[52,48,26,42],paint:(g,L,o,night,f)=>whDgn(g,L,clamp(o.n|0,0,3),true,f)};
WHSITE.dgnc={box:o=>[52,48,26,42],paint:(g,L,o,night,f)=>whDgn(g,L,clamp(o.n|0,0,3),false,f)};
/* ---- crisis sites (18-crises.js) ---- */
WHSITE.grave={box:o=>[48,40,24,34],paint:(g,L,o,night,f)=>{const S=whRampN('stone');whGround(g,0,-1.5,17,5,'#3f4a3a');
 for(let x=-16;x<=16;x+=2.2){if(Math.abs(x)<2.5)continue;whLine(g,[x,0,x,-3.6-(waHash(x*10|0,1,3)<.3?-1:0)],.9,WHINK);whLine(g,[x,0,x,-3.4],.45,'#5a4630')}whLine(g,[-16,-2.2,-2.5,-2.2],.8,WHINK);whLine(g,[2.5,-2.2,16,-2.2],.8,WHINK);
 for(const p of [[-12,-6],[-5,-9],[6,-8],[11,-5],[-8,-3]])whFill(g,pkRect(p[0]-1.2,p[1]-3.4,2.4,3.4,1.1),S,{k:.25,lw:.4});
 for(const p of [[-1,-6],[3,-10],[-10,-10]]){g.fillStyle='#2a2018';g.beginPath();g.ellipse(p[0],p[1],2,.9,0,0,Math.PI*2);g.fill();whLine(g,[p[0]-2.2,p[1]-.8,p[0]+2.2,p[1]-.8],.5,'#6a5034')}
 g.save();g.translate(9,-8);g.scale(1.5,1.5);whDead(g,4);g.restore();
 for(let i=0;i<5;i++){const q=((f+i*3)&7)/8,x=-12+waHash(i,2,91)*24,y=-4-waHash(i,3,91)*10-q*3;L.globalAlpha=(1-q)*.8;L.fillStyle=night?'#8af0b8':'#6ac08a';L.beginPath();L.arc(x,y,.6,0,Math.PI*2);L.fill()}L.globalAlpha=1}};
WHSITE.throne={box:o=>[56,54,28,48],paint:(g,L,o,night,f)=>{whGround(g,0,-1.5,20,5,'#3a3a32');
 whFill(g,whMound(0,17,13),PKM.bone,{k:.8,lw:.55,inside:(g,m)=>{for(let i=0;i<22;i++){const x=-14+waHash(i,1,94)*28,y=-1.5-waHash(i,2,94)*10;if(x*x/289+y*y/169<.9){whDot(g,x,y,.9,m[3]);whDot(g,x-.35,y+.1,.25,WHINK);whDot(g,x+.35,y+.1,.25,WHINK)}}}});
 const D=D2();whFill(g,pkRect(-6,-26,12,14,.4),D,{k:.4,lw:.55,inside:(g,m)=>{for(let y=-24;y<-13;y+=2.6)whLine(g,[-5,y,5,y],.45,'#c9bd98',.8)}});for(const x of [-6.5,5.5])whFill(g,pkRect(x,-28,1.6,4,.6),PKM.bone,{k:.2,lw:.4});
 whFill(g,pkRect(-7,-13.6,14,2,.4),PKM.bone,{k:.2,lw:.45});
 // the crowned skeleton
 whSkull(g,0,-19.6,1.3);whFill(g,whPolyS([-1.5,-21.4,-1,-23,0,-21.8,1,-23,1.5,-21.4]),PKM.gold,{k:.2,lw:.38});whFill(g,pkRect(-1.8,-18,3.6,4.2,.8),D,{k:.2,lw:.4});
 const e=night||(f&4)?'#8af0b8':'#5ec08a';L.fillStyle=e;L.beginPath();L.arc(-.55,-19.6,.3,0,Math.PI*2);L.arc(.55,-19.6,.3,0,Math.PI*2);L.fill();whGlowAt(L,0,-19.6,3,'rgba(120,240,170,.9)',.4)}};
WHSITE.hcamp={box:o=>[66,52,33,46],paint:(g,L,o,night,f)=>{whGround(g,0,-1.5,26,6,'#7a6a52');
 for(let x=-26;x<=26;x+=1.8){if(Math.abs(x)<5)continue;whStake(g,x,0,5+((x*5)%3)*.4)}
 whTent(g,-17,-2,6,10,PKM.leather);whTent(g,16,-3,6,10,PKM.leather);whTent(g,0,-6,9,16,['#22130a','#4c2b17','#6a4024','#8a5a34','#c09060']);whTent(g,-9,0,4,7,PKM.leather);whTent(g,9,1,4,7,PKM.leather);
 whTotem(g,-23,-6,10);whTotem(g,22,-6,10);whPole(g,0,-38,-20);whPennant(g,0,-37.6,['#2f5c2a','#14281a','#c9bd98'],f>>1,7,5);whSkull(g,3.5,-35.5,.8);whCampfire(g,L,-5,1,f);whCampfire(g,L,6,.6,f+2)}};
WHSITE.ecamp={box:o=>[74,60,37,54],paint:(g,L,o,night,f)=>{whGround(g,0,-1.5,30,7,'#e8eef4');
 // the longhouse
 whFill(g,pkRect(-12,-14,24,9,.3),whRampN('logs'),{k:.4,lw:.5});whFill(g,whPolyS([-14,-13.6,14,-13.6,9,-24,-9,-24]),WHR.wood,{k:.5,lw:.5,inside:(g)=>{g.fillStyle='#f4f8fc';g.fillRect(-10,-24,20,2.2)}});
 whLine(g,[-2,-27.6,0,-24,2,-27.6],.9,WHINK);whLine(g,[-2,-27.6,0,-24,2,-27.6],.45,'#e8e0c8');g.fillStyle=WHINK;g.fillRect(-1.4,-9,2.8,4);if(night){L.fillStyle='#ffd36a';L.fillRect(-.9,-8.6,1.8,3.4);whGlowAt(L,0,-7,4,'rgba(255,190,90,.9)',.5)}
 for(let x=-30;x<=30;x+=1.9){if(x>-6&&x<6)continue;whFill(g,whPolyS([x-.55,0,x-.55,-8,x,-9.2,x+.55,-8,x+.55,0]),D2(),{k:.2,lw:.38,noRim:1})}
 for(const s of [-6,5])whFill(g,pkRect(s,-14,1.8,15,.3),D2(),{k:.2,lw:.4});
 for(const bx of [-23,22]){whPole(g,bx,-26,-8);whPennant(g,bx,-25.6,['#3a6cb4','#1c3c84','#e8eef2'],f>>1,5.5,4,bx<0?1:-1)}
 whSmoke(g,6,-24,f,3);whSmoke(g,-8,-22,f+1,3)}};
