/* ================= FX (animfx) =================
   Pixel-art battle effects: square particles snapped to the art-pixel grid (1 art px = 2 board units), PAL colours only,
   stepped shapes (slash arcs, lightning, rings, cracks, glyphs), pixel-font floating numbers. The only soft thing is a
   brief additive glow under big spells. Visual randomness is Math.random / hashes: never the seeded game stream.
   Driven by FX.on(type,data) (-> fxEvent, which also feeds animEvent in 74-anim.js) plus a per-frame scan of unit state.
   Entry points (unchanged names/arguments): fxEvent(type,data) fxReset() fxScan(dt) fxDraw(dt[,ctx]) fxAmbient(kind,dt[,ctx])
   fxShake(mag) fxShakeX() fxShakeY() fxStep(u,v,kb,dist) fxLand(u)   (fxStep/fxLand are kept as no-ops: the animation
   controller reports steps and landings itself through fxAnimMove / fxAnimLand). */
const FXN=900,pX=new Float32Array(FXN),pY=new Float32Array(FXN),pVX=new Float32Array(FXN),pVY=new Float32Array(FXN),pG=new Float32Array(FXN),pD=new Float32Array(FXN),
 pL=new Float32Array(FXN),pM=new Float32Array(FXN),pW=new Float32Array(FXN),pS=new Uint8Array(FXN),pK=new Uint8Array(FXN),pC=new Uint8Array(FXN);let pN=0;
const K_SQ=0,K_TRAIL=1,K_PLUS=2,K_STREAK=3;
const FXR=[];function fxRamp(keys){const a=[];for(let i=0;i<keys.length;i++)a.push(PAL[keys[i]]);FXR.push(a);return FXR.length-1}
const R_WHITE=fxRamp('rrql'),R_STEEL=fxRamp('rqqpo'),R_SPARK=fxRamp('reddcb'),R_BLOOD=fxRamp('hhgggf'),R_FIRE=fxRamp('eyyEEggf'),R_EMBER=fxRamp('yEEgf'),
 R_SMOKE=fxRamp('poo44'),R_DUST=fxRamp('lmmkj'),R_MANA=fxRamp('rFxxXX'),R_AURA=fxRamp('redyyY'),R_QI=fxRamp('r66zzZ'),R_CHI=fxRamp('reAABB'),
 R_VOID=fxRamp('rCCCDD'),R_ICE=fxRamp('rrFFxX'),R_BONE=fxRamp('rllmn'),R_HEX=fxRamp('eAAvBw'),R_GRAVE=fxRamp('lCnDD'),R_GOLD=fxRamp('eddccb'),R_RED=fxRamp('rhhggf'),R_WIND=fxRamp('rr6qn'),R_ROOT=fxRamp('AvBkj');
const FXS={cAt:0,live:false,amp:0,shT:0,b:null,scanT:-1,cu:null,cid:null,cn:0,clast:null,turnU:null,turnBurn:false,haz:null,hazT:null,sty:0,acc:0};
const rr=(a,b)=>a+Math.random()*(b-a);
function fxHash(a,b){let n=Math.imul(a|0,374761393)+Math.imul(b|0,668265263)|0;n=Math.imul(n^n>>>13,1274126177);return((n^n>>>16)>>>0)/4294967296}
function fxN(n){return reduced?Math.ceil(n*.3):n}
function fxSp(){return reduced||!(SPEEDF>0)?0:SPEEDF}
function spawn(k,c,x,y,vx,vy,life,size,grav,drag,delay){if(pN>=FXN)return;const i=pN++;pK[i]=k;pC[i]=c;pX[i]=x;pY[i]=y;pVX[i]=vx;pVY[i]=vy;pL[i]=pM[i]=life;pS[i]=size||1;pG[i]=grav||0;pD[i]=drag||0;pW[i]=delay||0}
function burst(k,c,x,y,n,s0,s1,life,size,grav,drag,up){n=fxN(n);for(let i=0;i<n;i++){const a=Math.random()*6.283,s=rr(s0,s1);spawn(k,c,x,y,Math.cos(a)*s,Math.sin(a)*s*.6-(up||0),life*rr(.6,1.2),size,grav,drag)}}
function cone(k,c,x,y,dx,dy,n,s0,s1,life,size,grav,drag,spread){n=fxN(n);const b=Math.atan2(dy,dx);for(let i=0;i<n;i++){const a=b+rr(-spread,spread),s=rr(s0,s1);spawn(k,c,x,y,Math.cos(a)*s,Math.sin(a)*s,life*rr(.6,1.2),size,grav,drag)}}
function puff(x,y,n,c){n=fxN(n);for(let i=0;i<n;i++)spawn(K_SQ,c===undefined?R_DUST:c,x+rr(-8,8),y+rr(-3,3),rr(-40,40),rr(-22,-4),rr(.25,.5),Math.random()<.5?2:1,30,3)}
function fxShake(m){if(reduced||!(m>0))return;if(m>FXS.amp)FXS.amp=Math.min(6,m)}
function fxShakeX(){const a=FXS.amp;return a<.6?0:(fxHash((now/34)|0,3)<.5?-1:1)*Math.round(a)}
function fxShakeY(){const a=FXS.amp;return a<.6?0:(fxHash((now/34)|0,9)<.5?-1:1)*Math.round(a*.6)}
function fxStep(){}
function fxLand(){}

/* ---- shape pool: every non-particle effect is one pooled object, drawn procedurally each frame ---- */
const T_SLASH=1,T_PIERCE=2,T_BLUNT=3,T_CLAW=4,T_RING=5,T_BOLT=6,T_BEAM=7,T_PROJ=8,T_CRES=9,T_CRACK=10,T_STARS=11,T_GLYPH=12,T_GHOST=13,T_RET=14,T_PIN=15,T_EMIT=16,T_GLOW=17,T_BARS=18,T_ROOT=19,T_COL=20;
const FXO=[];for(let i=0;i<120;i++)FXO.push({on:false,ty:0,x:0,y:0,x2:0,y2:0,t0:0,dur:1,r:0,a:0,b:0,c:0,d:0,seed:0,acc:0,st:0,u:null,cv:null,s:null});
const FXO_NIL={on:false,ty:0,x:0,y:0,x2:0,y2:0,t0:0,dur:1,r:0,a:0,b:0,c:0,d:0,seed:0,acc:0,st:0,u:null,cv:null,s:null};
function fxo(ty,x,y,delay,dur,r){let o=FXO_NIL;for(let i=0;i<FXO.length;i++)if(!FXO[i].on){o=FXO[i];o.on=true;break}
 o.ty=ty;o.x=x;o.y=y;o.x2=x;o.y2=y;o.t0=now+(delay||0);o.dur=Math.max(1,dur);o.r=r||0;o.a=0;o.b=0;o.c=0;o.d=0;o.seed=(Math.random()*9999)|0;o.acc=0;o.st=0;o.u=null;o.cv=null;o.s=null;return o}
function ringFx(x,y,r0,r1,dur,ramp,delay,flat,thick){const o=fxo(T_RING,x,y,delay,dur,ramp);o.a=r0;o.b=r1;o.c=flat||.5;o.d=thick||1;return o}
function glowFx(x,y,rad,k,alpha,dur,delay){if(reduced)return;const o=fxo(T_GLOW,x,y,delay,dur,0);o.a=rad;o.s=k;o.c=alpha}
function glyphFx(id,x,y,rise,dur,delay,u){const o=fxo(T_GLYPH,x,y,delay,dur,0);o.s=id;o.b=rise;o.u=u||null;return o}
function emitFx(kind,u,x,y,rate,dur,delay,ramp){const o=fxo(T_EMIT,x,y,delay,dur,ramp);o.a=kind;o.b=rate;o.u=u||null;return o}

/* ---- small sprites ---- */
const FXG={
 shield:['.0000000.','0rAAAAAB0','0rAAeAAB0','0rAeeeAB0','0rAAeAAB0','0AAAeABB0','.0AAABB0.','..0ABB0..','...0B0...','....0....'],
 arrow:['...0...','..0e0..','.0eAB0.','0eAAAB0','00eAB00','.0eAB0.','.0eAB0.','.00000.'],
 fast:['00...00..','0r0..0r0.','.0A0..0A0','0B0..0B0.','00...00..'],
 fire0:['..EEE..','.EEyEE.','EEyyyEE','EyyeeyE','EEyeyEE','.EEyEE.','..gEg..'],fire1:['..gEE..','.EEyEg.','EEyyyEE','EyeeyyE','EEyyeEE','.gEyEE.','..EEE..'],
 skull:['.lll.','lllll','l0l0l','lllll','.lml.','.l.l.'],
 hex0:['..A..','.AeA.','AeeeA','.AeA.','..A..'],hex1:['.....','.AAA.','.AeA.','.AAA.','.....'],
 orb0:['..x..','.xFx.','xFrFx','.xFx.','..x..'],orb1:['.....','.xFx.','.FrF.','.xFx.','.....'],
 star:['..y..','.yey.','yeeey','.yey.','..y..'],star1:['.y.','yey','.y.'],glint:['..r..','..r..','rrrrr','..r..','..r..'],
 shard:['.r.','rFr','rFx','FFx','.Fx','.x.'],heart:['.0.0.','0h0h0','0hgg0','.0g0.','..0..'],
 fist:['.0000.','0rrrq0','0rqqq0','0qqqp0','.0000.'],
 note:['..00.','.0e0.','.0e0.','00e0.','0ee0.','.00..'],bang:['.000.','.0E0.','.0E0.','.0E0.','.000.','.0E0.','.000.'],
 shl:['.000.','0kkj0','0kkj0','0kjj0','0kjj0','.0jj0','..000'],shr:['.000.','0jji0','0jji0','0jii0','0jii0','0ji0.','000..'],
 fang:['0.0.0.0','r0r0r0r','rrrrrrr','.q.q.q.'],fangd:['.q.q.q.','rrrrrrr','r0r0r0r','0.0.0.0'],
 sweat:['.F.','FrF','FFx','.x.'],webb:['.l.l.','lllll','.lml.','lllll','.l.l.'],web0:['l...l...l','.l..l..l.','..l.l.l..','...lll...','lllllllll','...lll...','..l.l.l..','.l..l..l.','l...l...l'],
 bone:['ll...ll','lmlllml','ll...ll'],crown:['0.0.0.0','d0d0d0d','ddcdcdc','0ccccb0','.00000.']};
const FXGC={};
function fxSpr(id){let c=FXGC[id];if(c!==undefined)return c;if(id.slice(0,3)==='ic:'){c=null;try{const r=typeof iconRows==='function'?iconRows(id.slice(3)):null;if(r)c=px(r)}catch(e){}FXGC[id]=c;return c}const i=id.indexOf(':'),rows=FXG[i<0?id:id.slice(0,i)];c=null;
 if(rows){let map=null;if(i>=0){map={};const m=id.slice(i+1);for(let j=0;j+1<m.length;j+=2)map[m[j]]=m[j+1]}c=px(rows,map)}FXGC[id]=c;return c}
const FXSIL=new WeakMap();
function fxSil(cv,k){let m=FXSIL.get(cv);if(!m){m={};FXSIL.set(cv,m)}let c=m[k];if(c)return c;c=pxCanvas(cv.width,cv.height);if(!c)return null;const q=c.getContext('2d');q.drawImage(cv,0,0);q.globalCompositeOperation='source-in';q.fillStyle=PAL[k];q.fillRect(0,0,c.width,c.height);m[k]=c;return c}
const FXGL={};
function fxGlowSpr(k){let s=FXGL[k];if(s)return s;s=pxCanvas(64,64);const q=s.getContext('2d'),gr=q.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(.3,'rgba(255,255,255,.45)');gr.addColorStop(.65,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(255,255,255,0)');
 q.fillStyle=gr;q.fillRect(0,0,64,64);q.globalCompositeOperation='source-in';q.fillStyle=PAL[k];q.fillRect(0,0,64,64);FXGL[k]=s;return s}

/* ---- pixel font: chunky 5x7 digits for numbers, 3x5 caps for words, baked per colour style with a dark outline ---- */
const FXF5={'0':'.###.##.####.####.####.####.##.###.','1':'..##..###...##...##...##...##..####','2':'.###.##.##...##..##..##..##...#####','3':'####....##...##.###....##...######.','4':'...##..###.#.###..#######...##...##',
 '5':'#######...####....##...####.##.###.','6':'.###.##...####.##.####.####.##.###.','7':'#####...##..##...##..##...##...##..','8':'.###.##.####.##.###.##.####.##.###.','9':'.###.##.####.##.####...##...##.###.',
 '+':'.......#....#..#####..#....#.......','-':'...............####................','#':'######.#.##...##...##...#.#.#..#...'};
const FXF3={A:'.#.#.#####.##.#',B:'##.#.###.#.###.',C:'.###..#..#...##',D:'##.#.##.##.###.',E:'####..##.#..###',F:'####..##.#..#..',G:'.###..#.##.#.##',H:'#.##.#####.##.#',I:'###.#..#..#.###',J:'..#..#..##.#.#.',K:'#.##.###.#.##.#',L:'#..#..#..#..###',
 M:'#.########.##.#',N:'##.#.##.##.##.#',O:'.#.#.##.##.#.#.',P:'##.#.###.#..#..',Q:'.#.#.##.####.##',R:'##.#.###.#.##.#',S:'.###...#...###.',T:'###.#..#..#..#.',U:'#.##.##.##.####',V:'#.##.##.##.#.#.',W:'#.##.########.#',X:'#.##.#.#.#.##.#',Y:'#.##.#.#..#..#.',Z:'###..#.#.#..###','%':'#.#..#.#.#..#.#','!':'.#..#..#.....#.'};
const FXSTY=[['h','g','g'],['r','q','p'],['e','A','B'],['r','l','m'],['e','d','c'],['r','F','x']],FS_HP=0,FS_ARM=1,FS_HEAL=2,FS_MISS=3,FS_GOLD=4,FS_ICE=5;
const FXAT=[];   // per style: {cv, pos:{ch:[sx,w,h]}}
function fxAtlas(sty){let A=FXAT[sty];if(A!==undefined)return A;const cols=FXSTY[sty];let W=0;for(const k in FXF5)W+=7;for(const k in FXF3)W+=5;const cv=pxCanvas(W,9);if(!cv){FXAT[sty]=null;return null}
 const q=cv.getContext('2d'),pos={};let x=0;const put=(ch,bits,w,h)=>{const on=(i,j)=>i>=0&&j>=0&&i<w&&j<h&&bits[j*w+i]==='#';
  q.fillStyle=PAL['0'];for(let j=-1;j<=h;j++)for(let i=-1;i<=w;i++){if(on(i,j))continue;let nb=false;for(let b=-1;b<=1&&!nb;b++)for(let a=-1;a<=1;a++)if(on(i+a,j+b)){nb=true;break}if(nb)q.fillRect(x+1+i,1+j,1,1)}
  for(let j=0;j<h;j++){q.fillStyle=PAL[cols[j<h*.3?0:j<h-1?1:2]];for(let i=0;i<w;i++)if(on(i,j))q.fillRect(x+1+i,1+j,1,1)}pos[ch]=[x,w+2,h+2];x+=w+2};
 for(const k in FXF5)put(k,FXF5[k],5,7);for(const k in FXF3)put(k,FXF3[k],3,5);A={cv,pos};FXAT[sty]=A;return A}
const FLT=[];for(let i=0;i<40;i++)FLT.push({on:false,str:'',x:0,y:0,t0:0,sty:0,u:null});
function fxFloat(u,str,sty,delay){let f=null,n=0;const t=now+(delay||0);for(let i=0;i<FLT.length;i++){const q=FLT[i];if(q.on){if(q.u===u&&t-q.t0<520&&t-q.t0>-200)n++}else if(!f)f=q}
 if(!f){f=FLT[0];for(let i=1;i<FLT.length;i++)if(FLT[i].t0<f.t0)f=FLT[i]}
 const p=fxUP(u);f.on=true;f.str=String(str).toUpperCase();f.x=p.x;f.y=p.y-(p.h>60?96:64)-38-n*20;f.t0=t;f.sty=sty;f.u=u}
function fxTextW(s){let w=0;for(let i=0;i<s.length;i++){const ch=s[i];w+=FXF5[ch]?6:FXF3[ch]?4:3}return w-1}
function fxText(q,s,X,Y,sty,ap){const A=fxAtlas(sty);if(!A)return;for(let i=0;i<s.length;i++){const ch=s[i],big=FXF5[ch],P=A.pos[ch];if(!P){X+=3*ap;continue}
  q.drawImage(A.cv,P[0],0,P[1],P[2],X-ap,Y-ap+(big?0:2*ap),P[1]*ap,P[2]*ap);X+=(big?6:4)*ap}}

/* ---- unit positions (board space) ---- */
const FUP={x:0,y:0,h:58};
function fxFoot(u){const s=u.sz||(u.def&&u.def.size>1?u.def.size:1),h=typeof anUH==='function'?anUH(u,u.c,u.r):anTileH(u.c,u.r);return s>1?tpos(u.c+(s-1)/2,u.r+(s-1)/2,h):tpos(u.c,u.r,h)}   // the middle of a footprint
function fxH(u){const mi=typeof umon==='function'&&u.def?umon(u):null;return mi&&mi.kind?Math.round(mi.top*1.8):u.def&&u.def.big?90:58}
function fxUP(u){const p=fxFoot(u);FUP.x=p.x;FUP.y=p.y;FUP.h=fxH(u);return FUP}                 // tile centre under the unit
function fxUB(u){const p=fxFoot(u),P=unitPose(u);FUP.x=p.x+P.ox;FUP.y=p.y+P.oy;FUP.h=fxH(u);return FUP}   // where the body is drawn now
function fxSDir(dc,dr){if(typeof screenDir==='function')try{return screenDir(dc,dr)}catch(e){}return dc>0?0:dr>0?1:dc<0?2:3}
function fxUnitSpr(u){if(typeof unitSpritePx!=='function')return null;try{const P=unitPose(u);return unitSpritePx(u,fxSDir(P.dc,P.dr),P.state,P.frame)}catch(e){return null}}
function fxResR(u){const k=u&&u.res?(u.res.mana?'mana':u.res.aura?'aura':u.res.qi?'qi':u.res.chi?'chi':''):'';return k==='mana'?R_MANA:k==='aura'?R_AURA:k==='qi'?R_QI:k==='chi'?R_CHI:R_GOLD}
function fxBloodR(t){return t.side===1&&t.f==='undead'?R_BONE:t.side===1&&t.f==='void'?R_VOID:R_BLOOD}

/* ---- impact queue: what a blow does when it visibly lands ---- */
const S_SLASH=1,S_PIERCE=2,S_BLUNT=3,S_CLAW=4,S_ARROW=5,S_MANA=6,S_BLAST=7,S_FLAME=8,S_ZAP=9,S_HEX=10,S_GRAVE=11,S_VOID=12,S_AURA=13,S_CRUSH=14,S_FIRE=15,S_FROST=16,S_SHOVE=17,S_PIN=18,S_AIMED=19,S_WAVE=20,S_SLAM=21,S_BURN=22,S_HAZ=23,S_FALL=24,S_THUN=25;
const IMP=[];for(let i=0;i<32;i++)IMP.push({on:false,at:0,t:null,u:null,dmg:0,arm:0,sty:0,miss:false,dead:false,dx:0,dy:0});
function fxQueue(t,u,at,dmg,arm,sty,miss){let e=null;for(let i=0;i<IMP.length;i++)if(!IMP[i].on){e=IMP[i];break}if(!e){e=IMP[0];fxImpact(e)}
 e.on=true;e.at=at;e.t=t;e.u=u;e.dmg=dmg;e.arm=arm;e.sty=sty;e.miss=miss;e.dead=false;e.dx=0;e.dy=-1;e.head=false;e.rmp=FXS.rmp|0;
 if(u&&u!==t){const a=fxUP(u),ax=a.x,ay=a.y,b=fxUP(t),dx=b.x-ax,dy=b.y-ay,L=Math.hypot(dx,dy)||1;e.dx=dx/L;e.dy=dy/L}return e}
function fxImpact(e){e.on=false;const t=e.t;if(!t)return;e.t=null;const u=e.u;e.u=null;const p=fxUB(t),x=p.x,fy=p.y,h=p.h,head=!!e.head,y=fy-h*(head?.84:.48),dx=e.dx,dy=e.dy,dmg=e.dmg,arm=e.arm,sty=e.sty,sp=Math.max(.6,fxSp());
 if(e.miss){fxFloat(t,'MISS',FS_MISS);return}
 if(arm>0){cone(K_TRAIL,R_STEEL,x,y,dx,dy*.6-.25,5+Math.min(9,arm/8|0),90,260,.26,1,300,2,1);glyphFx('glint',x-dx*6,y-dy*6,0,110,0)}
 if(head){if(arm>0){cone(K_TRAIL,R_SPARK,x,y,dx*.4,-1,7,120,300,.3,1,420,2,1.2);ringFx(x,y,2,9,170,R_STEEL,0,1);glyphFx('glint:rd',x,y-4,0,150,40)}                // a blow on the helmet: sparks fly up
  if(dmg>0){cone(K_SQ,fxBloodR(t),x,y,dx*.5,-1,6+Math.min(8,dmg/5|0),70,220,.5,dmg>=14?2:1,560,1,1);fxShake(Math.min(4,1.2+dmg/14))}                                // through to the skull: blood goes up
  if(dmg>0||arm>0)fxFloat(t,'HEAD',dmg>0?FS_HP:FS_ARM)}
 if(dmg>0){const br=fxBloodR(t);cone(K_SQ,br,x,y,dx,dy*.5-.5,5+Math.min(10,dmg/4|0),50,190,.42,dmg>=14?2:1,520,1.2,.8);if(dmg>=30)cone(K_SQ,br,x,y,dx,dy*.5-.6,5,90,240,.5,2,560,1,.5)}
 const tot=dmg+arm*.5;if(tot>=9)fxShake(Math.min(5,.6+tot/13));
 if(dmg>0)fxFloat(t,'-'+dmg,FS_HP);if(arm>0)fxFloat(t,'#-'+arm,FS_ARM);if(dmg===0&&!(arm>0))fxFloat(t,'BLOCK',FS_ARM);
 switch(sty){
  case S_ARROW:cone(K_SQ,R_DUST,x,y,-dx,-dy-.4,3,40,110,.3,1,400,1,.6);break;
  case S_MANA:burst(K_TRAIL,R_MANA,x,y,12,80,230,.3,1,0,4);ringFx(x,y,2,13,240,R_MANA,0,1);glyphFx('glint:rF',x,y,0,120,0);break;
  case S_BLAST:{ringFx(x,fy,4,26,360,R_FIRE,0,.5,2);ringFx(x,fy,2,18,300,R_EMBER,90*sp,.5);glowFx(x,y,70,'E',.75,260);fxShake(4);
   for(let i=0;i<fxN(30);i++){const a=Math.random()*6.283,s=rr(40,230);spawn(K_SQ,R_FIRE,x+rr(-6,6),y+rr(-4,8),Math.cos(a)*s,Math.sin(a)*s*.55-rr(40,150),rr(.3,.7),i%3?2:1,-90,2.4)}
   for(let i=0;i<fxN(7);i++)spawn(K_SQ,R_SMOKE,x+rr(-12,12),y-rr(4,18),rr(-18,18),rr(-70,-34),rr(.6,1),2,0,.8,rr(.12,.3));
   emitFx(0,t,0,0,26,750,0,R_FIRE);break}
  case S_FLAME:for(let i=0;i<fxN(12);i++)spawn(K_SQ,R_FIRE,x+rr(-10,10),fy-rr(0,h*.6),rr(-14,14),rr(-120,-50),rr(.3,.6),i&1?2:1,-60,1.5);emitFx(0,t,0,0,22,650,0,R_EMBER);break;
  case S_FIRE:cone(K_SQ,R_FIRE,x,y,dx,dy*.5-.7,14,60,210,.45,2,-120,2,1.1);for(let i=0;i<fxN(6);i++)spawn(K_SQ,R_EMBER,x+rr(-8,8),y+rr(-10,6),rr(-30,30),rr(-110,-50),rr(.4,.8),1,-40,1);emitFx(0,t,0,0,20,520,0,R_FIRE);glowFx(x,y,44,'E',.5,180);break;
  case S_FROST:{for(let i=0;i<fxN(7);i++){const a=-Math.PI*(i+.5)/7+rr(-.15,.15),o=glyphFx('shard',x+Math.cos(a)*6,y+Math.sin(a)*4,0,rr(260,400),0);o.c=Math.cos(a)*rr(90,150);o.d=Math.sin(a)*rr(80,130)}
   burst(K_SQ,R_ICE,x,y,10,40,150,.4,1,200,2.5);ringFx(x,fy,3,15,300,R_ICE,0,.5);break}
  case S_ZAP:case S_THUN:{const r=sty===S_ZAP?R_ICE:R_QI;burst(K_TRAIL,r,x,y,11,110,300,.2,1,0,5);burst(K_SQ,R_WHITE,x,y,5,30,90,.3,1,0,3);glowFx(x,y,48,sty===S_ZAP?'F':'z',.7,150);fxShake(2.5);
   if(sty===S_THUN){const o=fxo(T_BOLT,x+rr(-6,6),y-h*1.5,0,170*sp,R_QI);o.x2=x;o.y2=fy-4;o.a=0}break}
  case S_HEX:burst(K_SQ,R_HEX,x,y,13,50,170,.45,1,160,2.5);ringFx(x,y,2,12,260,R_HEX,0,1);for(let i=0;i<fxN(4);i++)spawn(K_SQ,R_HEX,x+rr(-8,8),y+rr(-8,8),0,rr(20,50),rr(.4,.7),2,60,1);break;
  case S_GRAVE:for(let i=0;i<fxN(10);i++)spawn(K_SQ,R_GRAVE,x+rr(-9,9),y+rr(-10,10),rr(-16,16),rr(-90,-30),rr(.5,.9),i&1?2:1,-30,1.2,rr(0,.12));glyphFx('skull',x,y-10,10,420,40*sp);ringFx(x,fy,3,14,300,R_GRAVE,0,.5);break;
  case S_VOID:burst(K_TRAIL,R_VOID,x,y,14,70,240,.3,1,0,4);ringFx(x,y,3,16,280,R_VOID,0,1,2);glowFx(x,y,56,'C',.7,200);fxShake(3);emitFx(0,t,0,0,18,450,0,R_VOID);break;
  case S_AURA:burst(K_TRAIL,R_AURA,x,y,12,110,280,.26,1,0,4);for(let i=0;i<fxN(10);i++)spawn(K_TRAIL,R_AURA,x+rr(-7,7),fy-rr(0,10),0,rr(-330,-170),rr(.22,.4),i&1?2:1,0,1.5,rr(0,.08));ringFx(x,fy,3,17,280,R_AURA,0,.5);glowFx(x,y,50,'y',.55,170);fxShake(2.5);break;
  case S_CRUSH:{const o=fxo(T_CRACK,x,fy,0,950,0);o.a=1;ringFx(x,fy,4,22,320,R_DUST,0,.5,2);glowFx(x,fy,60,'y',.6,200);fxShake(5);
   for(let i=0;i<fxN(12);i++)spawn(K_SQ,i%3?R_DUST:R_AURA,x+rr(-14,14),fy+rr(-5,5),rr(-70,70),rr(-260,-110),rr(.4,.7),i&1?2:1,720,.6);break}
  case S_SHOVE:for(let i=-2;i<=2;i++)spawn(K_STREAK,R_WHITE,x-dx*8-dy*i*7,y-dy*8+dx*i*7,dx*rr(240,330),dy*rr(240,330),.2,1,0,3);ringFx(x-dx*8,y-dy*8,2,10,200,R_WHITE,0,1);puff(x,fy,5);glyphFx('fist',x-dx*12,y-dy*12,0,140,0);break;
  case S_PIN:{const o=fxo(T_PIN,x,fy,0,1000,0);o.a=dx<0?-1:1;puff(x,fy,4);break}
  case S_AIMED:glyphFx('glint',x,y,0,160,0);cone(K_TRAIL,R_WHITE,x,y,dx,dy,6,140,320,.2,1,0,4,.5);break;
  case S_WAVE:cone(K_TRAIL,R_AURA,x,y,dx,dy*.6-.3,12,80,260,.3,1,100,3,1.2);ringFx(x,y,3,13,220,R_AURA,0,1);break;
  case S_SLAM:puff(x,fy,10);glyphFx('star',x,y-h*.4,6,260,0);fxShake(3);break;
  case S_BURN:for(let i=0;i<fxN(12);i++)spawn(K_SQ,R_FIRE,x+rr(-9,9),fy-rr(0,h*.7),rr(-10,10),rr(-110,-50),rr(.3,.6),i&1?2:1,-50,1.4,rr(0,.1));break;
  case S_HAZ:for(let i=0;i<fxN(18);i++)spawn(K_SQ,R_FIRE,x+rr(-16,16),fy+rr(-5,5),rr(-12,12),rr(-190,-70),rr(.3,.65),i&1?2:1,-40,1.6,rr(0,.12));ringFx(x,fy,4,18,260,R_EMBER,0,.5);break;
  case S_FALL:puff(x,fy,9);ringFx(x,fy,4,16,240,R_DUST,0,.5);break;
  default:if(sty>=S_BLEED)fxImpactX(e,t,u,x,y,fy,h,dx,dy,dmg,arm,sty,sp)}
 if((sty===S_FIRE||sty===S_BLAST||sty===S_FLAME||sty===S_BURN||sty===S_HAZ)&&t.def&&t.def.fireWeak)fxFireWeak(t,x,fy,h,sp);
 if(e.dead)fxDeathNow(t)}
function fxDeathNow(t){const p=fxUB(t),x=p.x,y=p.y,h=p.h,big=t.def&&t.def.big,f=t.side===1?t.f:'';
 if(f==='undead'){for(let i=0;i<fxN(12);i++)spawn(K_SQ,R_BONE,x+rr(-7,7),y-rr(4,h*.7),rr(-90,90),rr(-200,-60),rr(.5,.9),i%3?1:2,640,.5)}
 else if(f==='void'){const o=ringFx(x,y-h*.4,16,2,300,R_VOID,0,1,2);o.st=0;for(let i=0;i<fxN(12);i++){const a=Math.random()*6.283;spawn(K_SQ,R_VOID,x+Math.cos(a)*22,y-h*.4+Math.sin(a)*16,-Math.cos(a)*70,-Math.sin(a)*50,.32,1,0,0)}}
 else cone(K_SQ,fxBloodR(t),x,y-h*.4,0,-1,7,40,150,.5,1,520,1,1.6);
 for(let i=0;i<fxN(7);i++)spawn(K_SQ,t.side===0?R_WHITE:R_BONE,x+rr(-8,8),y-rr(6,h*.8),rr(-5,5),rr(-46,-22),rr(.7,1.2),1,0,.3,rr(.25,.6));   // the spirit leaves
 puff(x,y,big?12:6);if(big){ringFx(x,y,6,26,380,R_DUST,260,.5,2);fxShake(4)}}

/* ---- strike choreography: spawns the swing / projectile now, returns ms until the blow lands (sets FXS.sty) ---- */
function fxArrow(ax,ay,bx,by,fly,arc,ramp,delay){const o=fxo(T_PROJ,ax,ay,delay,fly,ramp);o.x2=bx;o.y2=by;o.a=0;o.b=arc;return o}
function fxMelee(u,t,ramp,kind,sp){const a=fxUP(u),ax=a.x,ay=a.y-a.h*.5,b=fxUP(t),bx=b.x,by=b.y-b.h*.48,dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,lead=240*sp*AN_HIT_AT,dur=Math.max(110,210*Math.max(.6,sp));
 if(kind===S_PIERCE){const o=fxo(T_PIERCE,ax+ux*14,ay+uy*14,lead*.55,dur*.8,ramp);o.x2=bx+ux*16;o.y2=by+uy*16}
 else if(kind===S_BLUNT){const o=fxo(T_BLUNT,bx-ux*4,by-uy*4,lead,dur*.8,ramp);o.a=ramp===R_WHITE?8:10}
 else if(kind===S_CLAW){const o=fxo(T_CLAW,bx,by,lead*.6,dur,ramp);o.a=ux<0?-1:1}
 else{const o=fxo(T_SLASH,bx-ux*16,by-uy*16,lead*.45,dur,ramp);o.a=Math.atan2(uy,ux);o.b=ramp===R_WHITE?11:13;o.c=fxHash(u.id|0,(now|0)>>3)<.5?-1:1}
 return lead}
function fxWpnKind(u){if(u.def)return u.def.quad?S_CLAW:u.def.big?S_BLUNT:S_SLASH;const w=u.wpn&&u.wpn.wt;return w==='spear'||w==='dagger'?S_PIERCE:w==='mace'||w==='staff'||w==='fist'?S_BLUNT:S_SLASH}
function fxStrike(u,t,id,k,miss){const sp=fxSp(),a=fxUP(u),fx0=a.x,fy0=a.y,ah=a.h,b=fxUP(t),fx1=b.x,fy1=b.y,bh=b.h,d=mdist(u,t),ax=fx0,ay=fy0-ah*.55,dx0=fx1-fx0,dy0=fy1-fy0,L0=Math.hypot(dx0,dy0)||1,ux=dx0/L0,uy=dy0/L0;
 let bx=fx1,by=fy1-bh*.48;if(miss&&(d>1||id)){bx+=ux*26-uy*16;by+=uy*26+ux*8+bh*.3}
 const L=Math.hypot(bx-ax,by-ay),ss=Math.max(.5,sp),lead=90*sp,hx=ax+ux*10,hy=ay-6;let fly=0,o;FXS.sty=0;
 switch(id){
  case 'bolt':fly=clamp(L/.9,60,150)*ss;o=fxo(T_PROJ,hx,hy,lead,fly,R_MANA);o.x2=bx;o.y2=by;o.a=1;emitFx(1,null,hx,hy,60,lead,0,R_MANA);FXS.sty=S_MANA;return lead+fly;
  case 'fireball':if(k>0){FXS.sty=S_FLAME;return Math.max(30*sp,FXS.cAt-now+50*sp)}fly=clamp(L/.62,90,170)*ss;o=fxo(T_PROJ,hx,hy,lead,fly,R_FIRE);o.x2=bx;o.y2=by;o.a=2;o.b=Math.min(30,L*.14);o.c=miss?1:0;emitFx(1,null,hx,hy,70,lead,0,R_FIRE);FXS.sty=S_BLAST;FXS.cAt=now+lead+fly;return lead+fly;
  case 'chain':{const src=k>0&&FXS.clast&&FXS.clast!==t?FXS.clast:null,dl=src?Math.max(40*sp,FXS.cAt-now+30*sp):lead;let sx=hx,sy=hy;if(src){const s=fxUP(src);sx=s.x;sy=s.y-s.h*.48}else emitFx(1,null,hx,hy,70,lead,0,R_ICE);
   o=fxo(T_BOLT,sx,sy,dl,230*ss,R_ICE);o.x2=bx;o.y2=by;o.a=src?10:3;glowFx(sx,sy,30,'F',.5,120,dl);FXS.clast=t;FXS.sty=S_ZAP;FXS.cAt=now+dl+50*sp;return dl+50*sp}
  case 'hex':fly=clamp(L/.6,80,170)*ss;o=fxo(T_PROJ,hx,hy,lead,fly,R_HEX);o.x2=bx;o.y2=by;o.a=3;emitFx(1,null,hx,hy,50,lead,0,R_HEX);FXS.sty=S_HEX;return lead+fly;
  case 'grave':fly=clamp(L/.5,100,190)*ss;o=fxo(T_PROJ,hx,hy,lead,fly,R_GRAVE);o.x2=bx;o.y2=by;o.a=4;emitFx(1,null,hx,hy,50,lead,0,R_GRAVE);FXS.sty=S_GRAVE;return lead+fly;
  case 'void':o=fxo(T_BEAM,hx,hy,lead,260*ss,R_VOID);o.x2=bx;o.y2=by;emitFx(1,null,hx,hy,80,lead,0,R_VOID);glowFx(hx,hy,34,'C',.6,160,lead);FXS.sty=S_VOID;return lead+60*sp;
  case 'awave':fly=clamp(L/.55,110,180)*ss;o=fxo(T_CRES,ax+ux*12,ay+uy*12+6,60*sp,fly,R_AURA);o.x2=bx;o.y2=by+4;o.a=Math.atan2(by-ay,bx-ax);FXS.sty=S_WAVE;return 60*sp+fly;
  case 'thunder':{const ld=fxMelee(u,t,R_QI,S_SLASH,sp);FXS.sty=S_THUN;return ld}
  case 'shove':FXS.sty=S_SHOVE;return 240*sp*AN_HIT_AT;
  case 'aimed':{const dl=150*sp;fly=Math.max(50,L/1.9)*ss;o=fxo(T_RET,bx,by,0,dl+fly+90,0);o.a=dl+fly;o=fxArrow(ax,ay,bx,by,fly,2,R_WHITE,dl);o.c=miss?1:0;FXS.sty=S_AIMED;return dl+fly}
  case 'pin':fly=Math.max(120,L/.8)*ss;o=fxArrow(ax,ay,miss?bx:fx1,miss?by:fy1-4,fly,Math.min(60,L*.3+16),-1,40*sp);o.c=miss?1:0;FXS.sty=S_PIN;return 40*sp+fly;
  case 'astrike':case 'crush':case 'adash':case 'flame':case 'frost':{if(d>1&&fxReachW(u))return fxReach(u,t,miss,sp,ss,id==='flame'?R_FIRE:id==='frost'?R_ICE:R_AURA);const r=id==='flame'?R_FIRE:id==='frost'?R_ICE:R_AURA;FXS.sty=id==='flame'?S_FIRE:id==='frost'?S_FROST:id==='crush'?S_CRUSH:S_AURA;
   if(d>1){fly=Math.max(70,L/1.15)*ss;o=fxArrow(ax,ay,bx,by,fly,Math.min(26,L*.12),r,40*sp);o.c=miss?1:0;return 40*sp+fly}
   const ld=fxMelee(u,t,r,id==='crush'?S_BLUNT:S_SLASH,sp);
   if(id==='astrike'&&!miss){const tb=fy1-bh*.48,o2=fxo(T_SLASH,fx1-ux*16,tb-uy*16,ld+70*ss,200*ss,R_AURA);o2.a=Math.atan2(uy,ux);o2.b=13;o2.c=2}
   if(id==='flame')emitFx(2,null,fx1-ux*10,fy1-bh*.48-uy*10,90,180*ss,ld*.5,R_FIRE);
   return ld}
  default:
   if(id){const ld=fxStrikeX(u,t,id,k,miss,sp,ss,ax,ay,bx,by,L,d,ux,uy,fx1,fy1,bh);if(ld>=0)return ld}
   if(d>1){const rw=fxArmsShot(u,t,miss,sp,ss,ax,ay,bx,by,L,d,ux,uy,fx1,fy1,bh);if(rw>=0)return rw;fly=Math.max(70,L/1.15)*ss;o=fxArrow(ax,ay,bx,by,fly,Math.min(28,L*.13),-1,40*sp);o.c=miss?1:0;FXS.sty=S_ARROW;return 40*sp+fly}
   {const kd=fxWpnKind(u);if(fxIsHammer(u)){FXS.sty=S_HAMMER;return fxMelee(u,t,R_WHITE,S_BLUNT,sp)}FXS.sty=kd;return fxMelee(u,t,u.def&&u.def.quad?R_BONE:R_WHITE,kd,sp)}}}

/* ---- rules events ---- */
function fxTail(t,re){const F=B.floats;for(let i=F.length-1;i>=0&&i>=F.length-3;i--){const f=F[i];if(f.u===t&&!f.fx&&re.test(f.txt))return f}return null}
function fxOnHit(d){const t=d.t,u=d.u&&d.u!==d.t?d.u:null;if(!t)return;const dmg=d.dmg|0,arm=typeof d.armor==='number'?d.armor|0:0;let delay=0,sty=0;
 const f=fxTail(t,/^(-\d+|Armor)$/);if(f)f.fx=1;const ff=FXS.ffShot;
 if(u&&ff&&ff.u===u&&ff.v===t&&now-ff.t0<2000){FXS.ffShot=null;delay=Math.max(0,ff.at-now);sty=ff.sty;if(FXS.cu===u&&!FXS.multi)FXS.cu=null}   // the stray already flies: its one projectile lands here
 else if(u){const id=FXS.cu===u?FXS.cid:fxFree(u,t),k=id&&FXS.cu===u?FXS.cn++:0;delay=fxStrike(u,t,id,k,false);sty=FXS.sty;if(id&&FXS.cu===u&&!FXS.multi)FXS.cu=null}
 else if(fxTail(t,/^Slam$/))sty=S_SLAM;else if(FXS.turnU===t&&FXS.turnBurn){sty=S_BURN;FXS.turnBurn=false}else if(B.tiles[key(t.c,t.r)].t==='haz')sty=S_HAZ;else sty=S_FALL;
 const at=now+delay,e=fxQueue(t,u,at,dmg,arm,sty,false);e.head=!!d.head;animImpact(t,u,at,false)}
function fxOnMiss(d){const t=d.t,u=d.u;if(!t)return;const f=fxTail(t,/^Miss$/);if(f)f.fx=1;let delay=0;
 if(u&&u!==t&&d.stray&&d.stray!==t){const v=d.stray,id=FXS.cu===u?FXS.cid:fxFree(u,v),k=id&&FXS.cu===u?FXS.cn++:0;delay=fxStrike(u,v,id,k,false);   // a stray: ONE projectile, flying to the ally it hits
  FXS.ffShot={u,v,at:now+delay,sty:FXS.sty,t0:now};const at=now+delay*.6;fxQueue(t,u,at,0,0,0,true);animImpact(t,u,at,true);return}
 if(u&&u!==t){const id=FXS.cu===u?FXS.cid:fxFree(u,t),k=id&&FXS.cu===u?FXS.cn++:0;delay=fxStrike(u,t,id,k,true);if(id&&FXS.cu===u&&!FXS.multi)FXS.cu=null;
  if(mdist(u,t)===1&&!(id==='awave')){const b=fxUP(t),o=fxo(T_SLASH,b.x,b.y-b.h*.5,delay*.7,170,R_WHITE);o.a=Math.atan2(b.y-fxUP(u).y,o.x-FUP.x);o.b=9;o.c=3}
  else if(FXS.sty===S_BLAST){const b=fxUP(t);ringFx(b.x+20,b.y+8,3,18,300,R_FIRE,delay,.5,2);for(let i=0;i<fxN(14);i++)spawn(K_SQ,R_FIRE,b.x+20+rr(-8,8),b.y+8,rr(-60,60),rr(-170,-50),rr(.3,.6),i&1?2:1,-40,2,delay/1000)}}
 const at=now+delay;fxQueue(t,u,at,0,0,0,true);animImpact(t,u,at,true)}
function fxOnDeath(t){if(!t)return;fxU(t).dead=true;let e=null;for(let i=0;i<IMP.length;i++)if(IMP[i].on&&IMP[i].t===t&&!IMP[i].miss&&(!e||IMP[i].at>e.at))e=IMP[i];if(e)e.dead=true;else fxDeathNow(t)}
function fxOnCast(u,t,ab,k){if(!u||!ab)return;if(ab.id==='swap'||ab.swap){FXS.cu=null;return}   // staged by fxSwap when the figure changes hands
const id=ab.id==='spell'?(/hex/i.test(ab.n)?'hex':/grave/i.test(ab.n)?'grave':/void/i.test(ab.n)?'void':u.f==='void'?'void':u.f==='undead'?'grave':'hex'):fxKey(ab);
 FXS.cu=u;FXS.cid=id;FXS.cn=0;FXS.clast=null;FXS.cab=ab;FXS.rmp=fxTintR(ab);FXS.bR=ab.foe?R_VOID:R_MANA;FXS.dS=ab.foe?'g':'y';FXS.dR=ab.foe?R_DUST:R_AURA;
 FXS.multi=(id==='m:quake'||id==='m:dland'||id==='m:buffet'||id==='m:sweep')||id==='fireball'||id==='chain'||id==='thunder'||ab.tgt==='aoe'||!!ab.aoe||!!ab.chain||!!ab.hits||!!ab.through||!!ab.party||id==='nova'||id==='chant'||id==='warcry'||id==='rally';const p=fxUP(u),x=p.x,y=p.y,h=p.h,sp=Math.max(.6,fxSp()),R=ab.cost?(ab.cost[0]==='mana'?R_MANA:ab.cost[0]==='aura'?R_AURA:ab.cost[0]==='qi'?R_QI:R_CHI):id==='hex'?R_HEX:id==='grave'?R_GRAVE:id==='void'?R_VOID:R_GOLD;
 switch(id){
  case 'bolt':case 'fireball':case 'chain':case 'hex':case 'grave':case 'void':ringFx(x,y,4,15,300*sp,id==='fireball'?R_FIRE:R,0,.5);break;
  case 'blink':for(let i=0;i<fxN(16);i++){const yy=y-rr(0,h);spawn(K_SQ,FXS.bR,x+rr(-12,12),yy,0,rr(-30,-90),rr(.25,.5),i%3?1:2,0,0,rr(0,.06))}{const o=fxo(T_COL,x,y,0,190*sp,FXS.bR);o.a=h;o.b=0}break;
  case 'gale':ringFx(x,y,3,17,260*sp,R_WIND,0,.5);burst(K_STREAK,R_WIND,x,y,10,90,200,.3,1,-80,3);break;
  case 'footwork':break;
  case 'astrike':case 'crush':case 'adash':case 'awave':ringFx(x,y,3,13,240*sp,R_AURA,0,.5);for(let i=0;i<fxN(8);i++)spawn(K_TRAIL,R_AURA,x+rr(-10,10),y-rr(0,8),0,rr(-230,-120),rr(.2,.36),1,0,1.5,rr(0,.08));break;
  case 'flame':for(let i=0;i<fxN(8);i++)spawn(K_SQ,R_FIRE,x+rr(-9,9),y-h*.5+rr(-8,8),rr(-10,10),rr(-90,-40),rr(.25,.45),i&1?2:1,-40,1.5);break;
  case 'frost':burst(K_SQ,R_ICE,x,y-h*.5,8,20,70,.4,1,60,2);break;
  case 'thunder':{ringFx(x,y,6,36,300*sp,R_QI,60*sp,.5,2);ringFx(x,y,4,28,300*sp,R_WHITE,110*sp,.5);glowFx(x,y-10,84,'z',.6,240);fxShake(3);
   for(let i=0;i<fxN(16);i++){const a=i/16*6.283;spawn(K_TRAIL,i&1?R_QI:R_WHITE,x+Math.cos(a)*10,y-12+Math.sin(a)*5,Math.cos(a)*250,Math.sin(a)*125,.24,1,0,3.5,.06*sp)}
   for(let i=0;i<4;i++){const a=i*1.571+.785,o=fxo(T_BOLT,x,y-h*.5,(50+i*30)*sp,150*sp,R_QI);o.x2=x+Math.cos(a)*44;o.y2=y+Math.sin(a)*22-6;o.a=4}break}
  case 'reinforce':case 'mend':case 'empower':case 'swift':for(let i=0;i<fxN(6);i++)spawn(K_SQ,R_CHI,x+rr(-9,9),y-h*.5+rr(-6,6),rr(-12,12),rr(-60,-24),rr(.3,.5),1,0,1);break;
  default:fxCastX(u,t,ab,id,k,x,y,h,sp)}}
function fxOnBuff(t){if(!t)return;const id=FXS.cu&&FXS.cid?FXS.cid:'',p=fxUP(t),x=p.x,y=p.y,h=p.h,sp=Math.max(.6,fxSp());
 if(id&&!FXS.multi)FXS.cu=null;
 if(id&&fxBuffX(t,id,x,y,h,sp))return;
 switch(id){
  case 'reinforce':glyphFx('shield',x,y-h*.5,4,620*sp,60*sp,t);ringFx(x,y,4,17,340*sp,R_CHI,0,.5,2);for(let i=0;i<fxN(10);i++){const a=i/10*6.283;spawn(K_SQ,R_CHI,x+Math.cos(a)*18,y+Math.sin(a)*9,0,rr(-90,-40),rr(.3,.6),1,0,1,rr(0,.15))}break;
  case 'indom':{const o=fxo(T_BARS,0,0,0,760*sp,R_STEEL);o.u=t;o.a=h;puff(x,y,8);ringFx(x,y,4,20,300*sp,R_STEEL,0,.5,2);fxShake(2);break}
  case 'empower':for(let i=0;i<4;i++)glyphFx(i&1?'arrow:AdBc':'arrow',x+(i-1.5)*10,y-h*.2-(i&1)*8,26,480*sp,i*70*sp,null);ringFx(x,y,4,15,320*sp,R_CHI,0,.5);for(let i=0;i<fxN(8);i++)spawn(K_TRAIL,R_CHI,x+rr(-12,12),y-rr(0,10),0,rr(-200,-110),rr(.25,.45),1,0,1.2,rr(0,.2));break;
  case 'swift':{for(let i=0;i<fxN(16);i++){const yy=y-rr(2,h+4),dir=1;spawn(K_STREAK,i%3?R_WHITE:R_CHI,x-dir*rr(26,40),yy,dir*rr(300,460),0,rr(.16,.24),1,0,1,i*.03*sp)}
   glyphFx('fast',x,y-h-6,6,520*sp,40*sp,null);ringFx(x,y,3,14,260*sp,R_CHI,0,.5);break}
  case 'adren':{ringFx(x,y-h*.5,3,15,260*sp,R_RED,0,1);ringFx(x,y-h*.5,3,15,260*sp,R_RED,150*sp,1);glyphFx('heart',x,y-h-4,8,520*sp,0,null);
   for(let i=0;i<fxN(12);i++){const a=i/12*6.283;spawn(K_TRAIL,R_RED,x+Math.cos(a)*8,y-h*.5+Math.sin(a)*8,Math.cos(a)*200,Math.sin(a)*200,.2,1,0,3,.05)}break}
  default:{const R=t.side===0?R_GOLD:R_RED;ringFx(x,y,3,14,300*sp,R,0,.5);for(let i=0;i<fxN(10);i++)spawn(K_TRAIL,R,x+rr(-10,10),y-rr(0,10),0,rr(-220,-110),rr(.25,.45),1,0,1.2,rr(0,.12))}}}
function fxOnHeal(t){if(!t)return;if(t.def&&t.def.regen)fxRegrow(t);const p=fxUP(t),x=p.x,y=p.y,sp=Math.max(.6,fxSp());ringFx(x,y,3,16,340*sp,R_CHI,0,.5,2);emitFx(3,t,0,0,38,520*sp,0,R_CHI);glowFx(x,y-p.h*.4,40,'A',.35,260)}
function fxOnTurn(u){if(!u)return;FXS.turnU=u;FXS.turnBurn=!!(u.st&&u.st.burn);FXS.cu=null;if(!u.alive)return;const p=fxUP(u);ringFx(p.x,p.y,5,17,260,u.side===0?R_GOLD:R_RED,0,.5);
 if(fxTail(u,/^Chilled$/))for(let i=0;i<fxN(10);i++)spawn(K_SQ,R_ICE,p.x+rr(-12,12),p.y-rr(p.h*.3,p.h),rr(-6,6),rr(20,50),rr(.5,.9),1,0,.5,rr(0,.2))}
function fxEvent(type,d){if(!d||typeof B==='undefined'||!B||mode!=='battle')return;
 const vis=typeof document!=='undefined'&&SPEEDF>0&&typeof now==='number';
 if(type==='kb'&&d.t&&FXS.cu&&(FXS.cid==='shove'||FXS.cid==='bash'||FXS.cid==='kick'||FXS.cid==='charge'||FXS.cid==='spikebash')&&!(FXS.cab&&!FXS.cab.noDmg)){const u=FXS.cu,t=d.t,bash=FXS.cid==='bash'||FXS.cid==='spikebash',kick=FXS.cid==='kick'||FXS.cid==='charge';FXS.cu=null;      // a shove deals no damage, so no 'hit' is emitted: stage the push here
  try{animEvent('miss',{u,t});const at=anNow()+240*fxSp()*AN_HIT_AT;animImpact(t,u,at,false);if(vis){const e=fxQueue(t,u,at,-1,0,FXS.cid==='charge'?S_CHARGE:FXS.cid==='spikebash'?S_SPIKE:kick?S_KICK:bash?S_BASH:S_SHOVE,false);const a=fxUP(u),ax=a.x,ay=a.y,b=fxUP(t);e.dx=b.x-ax;e.dy=b.y-ay;const L=Math.hypot(e.dx,e.dy)||1;e.dx/=L;e.dy/=L}}catch(e){}}
 try{animEvent(type,d)}catch(e){}
 if(type==='withdraw'&&d.u)try{const v=fxU(d.u);v.dead=true;v.alive=false}catch(e){}
 if(typeof document==='undefined'||!(SPEEDF>0)||typeof now!=='number')return;FXS.live=true;
 try{if(type==='hit')fxOnHit(d);else if(type==='miss')fxOnMiss(d);else if(type==='death')fxOnDeath(d.t);else if(type==='cast')fxOnCast(d.u,d.t,d.ab,d.k);
  else if(type==='morale')fxOnMorale(d);else if(type==='injury')fxOnInjury(d);else if(type==='status')fxOnStatus(d);else if(type==='spawn')fxOnSpawn(d.u);else if(type==='withdraw')fxOnWithdraw(d);
  else if(type==='reload')fxOnReload(d.u);else if(type==='blocked')fxOnBlocked(d);else if(type==='ff')fxOnFF(d);else if(type==='loc'){}
  else if(type==='heal')fxOnHeal(d.t);else if(type==='buff')fxOnBuff(d.t);else if(type==='turn')fxOnTurn(d.u)}catch(e){if(!FXS.err){FXS.err=e;if(typeof console!=='undefined')console.warn('fx '+type+': '+(e&&e.stack||e))}}}
if(typeof FX!=='undefined'&&FX)try{FX.on=fxEvent}catch(e){}

/* ================= Phase 5: locations, morale, injuries, shields, weapon skills, enemy abilities =================
   An ability animates by a key: fxKey(ab) reads its `fx` hint, then its id and name, and falls back to 'gen' with the
   category from abCategory(ab) (melee ranged magic buff debuff move summon shout) in the tint of its resource (abTint).
   So a new AB entry animates without a line added here; the keys below are the ones with choreography of their own. */
const S_BLEED=26,S_SPLIT=27,S_STUN=28,S_PUNC=29,S_BASH=30,S_POISON=31,S_BITE=32,S_GRAB=33,S_WEB=34,S_CHARGE=35,S_REAP=36,S_GEN=37,S_DAZE=38,S_RIP=39;
const T_SPIN=21,T_BITE=22,T_WEB=23,T_LEAVE=24,T_WARD=25,T_SWIRL=26,T_SPEARS=27,T_PORTAL=28;
const FX_HINT={slash:'slash',chop:'split',smash:'split',spin:'round',bonk:'stun',stab:'stab',arrow:'quick',sweep:'sweep',shove:'bash',flee:'withdraw',dash:'slip',poison:'poison',hex:'hex',chant:'chant',grab:'grab',bolt:'bolt',
 raise:'raise',web:'web',bite:'bite',charge:'charge',warcry:'warcry',rally:'rally',guard:'guard',blink:'blink',lance:'void',ward:'ward',summon:'summon','charge-up':'gather',nova:'nova'};
const FX_OLD={bolt:1,fireball:1,chain:1,blink:1,gale:1,footwork:1,astrike:1,crush:1,adash:1,awave:1,flame:1,frost:1,thunder:1,reinforce:1,mend:1,empower:1,swift:1,indom:1,adren:1,shove:1,aimed:1,pin:1};
const FX_WORD=[[/ripost|parry|guard|brace|wall/,'guard'],[/split|sunder|smash/,'split'],[/round|whirl|spin/,'round'],[/reap|scyth/,'reap'],[/sweep|swipe/,'sweep'],[/stun|bonk|concuss/,'stun'],[/stab|punctur|thrust|impale|pierc/,'stab'],
 [/quick|snap/,'quick'],[/bash/,'bash'],[/poison|venom/,'poison'],[/bite|maul|gnaw/,'bite'],[/grab|grapple|seize/,'grab'],[/web|net/,'web'],[/hex|curse/,'hex'],[/charge|trample|rush|ram/,'charge'],[/chant|song|drum/,'chant'],
 [/cry|roar|howl|shout/,'warcry'],[/rally|inspire/,'rally'],[/ward|barrier|aegis/,'ward'],[/summon|conjure|veil/,'summon'],[/raise|reanim/,'raise'],[/nova|cataclysm/,'nova'],[/gather|channel/,'gather'],[/blink|phase|rift step/,'blink'],[/withdraw|flee/,'withdraw']];
const FX_TINTR={mana:R_MANA,aura:R_AURA,qi:R_QI,chi:R_CHI,steel:R_STEEL,foe:R_RED,void:R_VOID,fire:R_FIRE,ice:R_ICE,green:R_HEX,gold:R_GOLD,bone:R_BONE,verd:R_QI};
function fxTintR(ab){let t='gold';try{if(typeof abTint==='function')t=abTint(ab)}catch(e){}const r=FX_TINTR[t];return r===undefined?R_GOLD:r}
function fxKey(ab){const id=ab.id||'';{const m=fxKeyM(ab);if(m)return m}if(FX_OLD[id]&&!ab.foe)return id;if(FX_ID[id]&&!ab.foe)return FX_ID[id];{const h2=ab.fx&&FX_HINT2[ab.fx];if(h2){const k2=h2(ab);if(k2)return k2}}const h=ab.fx&&FX_HINT[ab.fx];
 if(h){if(h==='sweep'&&/reap|scyth/i.test(id+' '+(ab.n||'')))return'reap';if(h==='bolt')return ab.foe?(/void/i.test(ab.n||'')?'void':'grave'):'bolt';return h}
 const s=(id+' '+(ab.n||'')).toLowerCase();for(let i=0;i<FX_WORD.length;i++)if(FX_WORD[i][0].test(s))return FX_WORD[i][1];
 FXS.cat=typeof abCategory==='function'?abCategory(ab,id):'melee';return'gen'}
/* a strike nobody cast: the answer of a riposte, or a spear wall meeting whoever steps up */
function fxFree(u,t){if(!B||B.cur===u||!u.buffs)return null;for(let i=0;i<u.buffs.length;i++){const b=u.buffs[i];if(b.rip||b.key==='riposte')return'riposte';if(b.sw||b.key==='spearwall')return'spearwall'}return null}
const FXORB={};
function fxOrb(r){let a=FXORB[r];if(a)return a;const m=r===R_AURA?':xyFe':r===R_QI?':xzF6':r===R_CHI?':xAFe':r===R_VOID?':xDFC':r===R_FIRE?':xEFy':r===R_RED?':xgFh':r===R_HEX?':xBFA':r===R_GOLD?':xcFd':r===R_ICE?':xFFr':'';
 a=[fxSpr('orb0'+m),fxSpr('orb1'+m)];FXORB[r]=a;return a}
let FXWEBS=null;
function fxWebs(){return FXWEBS||(FXWEBS=[fxSpr('webb'),fxSpr('webb')])}
function fxStrikeX(u,t,id,k,miss,sp,ss,ax,ay,bx,by,L,d,ux,uy,fx1,fy1,bh){const ab=FXS.cab||FXO_NIL,R=FXS.rmp|0;let o,fly,ld;
 if(id&&id.charCodeAt(0)===109&&id[1]===':'){const n=fxStrikeM(u,t,id,k,miss,sp,ss,ax,ay,bx,by,L,d,ux,uy,fx1,fy1,bh);if(n>=0)return n}
 {const n=fxStrikeA(u,t,id,k,miss,sp,ss,ax,ay,bx,by,L,d,ux,uy,fx1,fy1,bh);if(n>=0)return n}
 {const n=fxStrikeN(u,t,id,k,miss,sp,ss,ax,ay,bx,by,L,d,ux,uy,fx1,fy1,bh);if(n>=0)return n}
 switch(id){
  case'slash':ld=fxMelee(u,t,R_RED,S_SLASH,sp);if(!miss){const o2=fxo(T_SLASH,bx-ux*14,by-uy*14,ld+50*ss,170*ss,R_BLOOD);o2.a=Math.atan2(uy,ux);o2.b=9;o2.c=2}FXS.sty=S_BLEED;return ld;
  case'split':ld=fxMelee(u,t,R_WHITE,S_SLASH,sp);FXS.sty=S_SPLIT;return ld;
  case'round':ld=fxMelee(u,t,R_WHITE,S_SLASH,sp);FXS.sty=S_SLASH;return ld;
  case'reap':ld=fxMelee(u,t,R_VOID,S_SLASH,sp);FXS.sty=S_REAP;return ld;
  case'sweep':ld=fxMelee(u,t,ab.foe?R_BONE:R_WHITE,u.def&&u.def.quad?S_CLAW:S_BLUNT,sp);FXS.sty=ab.status&&ab.status.daze?S_DAZE:S_SLAM;return ld;
  case'stun':ld=fxMelee(u,t,R_AURA,S_BLUNT,sp);FXS.sty=S_STUN;return ld;
  case'stab':{ld=fxMelee(u,t,R_WHITE,S_PIERCE,sp);if(ab.two||d>1){o=fxo(T_PIERCE,ax+ux*10,ay+uy*10+2,ld*.5,190*ss,R_STEEL);o.x2=bx+ux*22;o.y2=by+uy*22+2}
   if(ab.req==='flank'&&!miss){const o2=fxo(T_SLASH,bx+ux*10,by+uy*10,ld+30*ss,150*ss,R_RED);o2.a=Math.atan2(-uy,-ux);o2.b=8;o2.c=1}FXS.sty=ab.pierce||ab.two?S_PUNC:S_PIERCE;return ld}
  case'quick':fly=Math.max(36,L/2.6)*ss;o=fxArrow(ax,ay,bx,by,fly,Math.min(10,L*.05),R_WHITE,20*sp);o.c=miss?1:0;FXS.sty=S_ARROW;return 20*sp+fly;
  case'bash':FXS.sty=S_BASH;return 240*sp*AN_HIT_AT;
  case'poison':if(d>1){fly=Math.max(70,L/1.15)*ss;o=fxArrow(ax,ay,bx,by,fly,Math.min(28,L*.13),R_HEX,40*sp);o.c=miss?1:0;FXS.sty=S_POISON;return 40*sp+fly}ld=fxMelee(u,t,R_HEX,fxWpnKind(u),sp);FXS.sty=S_POISON;return ld;
  case'bite':ld=240*sp*AN_HIT_AT;o=fxo(T_BITE,bx,by,ld*.4,230*ss,R_BONE);FXS.sty=S_BITE;return ld;
  case'grab':ld=240*sp*AN_HIT_AT;o=fxo(T_CLAW,bx-6,by,ld*.5,220*ss,R_BONE);o.a=1;o=fxo(T_CLAW,bx+6,by,ld*.5,220*ss,R_BONE);o.a=-1;FXS.sty=S_GRAB;return ld;
  case'web':fly=clamp(L/.5,110,220)*ss;o=fxo(T_PROJ,ax+ux*10,ay-4,60*sp,fly,R_BONE);o.x2=bx;o.y2=by;o.a=5;o.b=Math.min(34,L*.16);o.s=fxWebs();FXS.sty=S_WEB;return 60*sp+fly;
  case'charge':ld=fxMelee(u,t,R_DUST,S_BLUNT,sp);FXS.sty=S_CHARGE;return ld;
  case'nova':{const dl=(60+k*45)*sp;o=fxo(T_BOLT,ax,ay,dl,200*ss,R_VOID);o.x2=bx;o.y2=by;o.a=6;FXS.sty=S_VOID;return dl+50*sp}
  case'riposte':ld=120*sp;o=fxo(T_SLASH,bx-ux*14,by-uy*14,ld*.3,170*ss,R_GOLD);o.a=Math.atan2(uy,ux);o.b=12;o.c=-1;glyphFx('glint:rd',ax+ux*8,ay-4,0,160,0);FXS.sty=S_RIP;return ld;
  case'spearwall':ld=110*sp;o=fxo(T_PIERCE,ax+ux*8,ay+uy*8,0,200*ss,R_WHITE);o.x2=bx+ux*14;o.y2=by+uy*14;FXS.sty=S_RIP;return ld;
  case'gen':{const cat=FXS.cat;
   if(cat==='magic'||cat==='debuff'){fly=clamp(L/.8,70,170)*ss;o=fxo(T_PROJ,ax+ux*10,ay-6,90*sp,fly,R);o.x2=bx;o.y2=by;o.a=5;o.b=0;o.s=fxOrb(R);emitFx(1,null,ax+ux*10,ay-6,60,90*sp,0,R);FXS.sty=S_GEN;return 90*sp+fly}
   if(d>1){fly=Math.max(70,L/1.15)*ss;o=fxArrow(ax,ay,bx,by,fly,Math.min(28,L*.13),R,40*sp);o.c=miss?1:0;FXS.sty=S_GEN;return 40*sp+fly}
   ld=fxMelee(u,t,R,fxWpnKind(u),sp);FXS.sty=S_GEN;return ld}}
 return -1}
function fxImpactX(e,t,u,x,y,fy,h,dx,dy,dmg,arm,sty,sp){const R=e.rmp|0;if(sty>=S_M0){fxImpactM(e,t,u,x,y,fy,h,dx,dy,dmg,arm,sty,sp);return}if(sty>=S_N0){fxImpactN(e,t,u,x,y,fy,h,dx,dy,dmg,arm,sty,sp);return}
 switch(sty){
  case S_BLEED:if(dmg>0){for(let i=0;i<fxN(7);i++)spawn(K_SQ,R_BLOOD,x+rr(-6,6),y+rr(-4,6),rr(-10,10),rr(10,60),rr(.5,.9),i&1?2:1,420,.4,rr(.05,.4));cone(K_TRAIL,R_BLOOD,x,y,dx,dy*.4-.3,8,90,250,.36,1,300,2,.5)}break;
  case S_SPLIT:{cone(K_SQ,R_ROOT,x,y,dx,dy*.5-.5,12,70,240,.5,2,620,1,1.1);cone(K_TRAIL,R_DUST,x,y,dx,dy*.5-.3,8,110,280,.3,1,300,2,.8);const o=fxo(T_CRACK,x-6,y+4,0,420,0);o.a=0;fxShake(3);
   if(!t.shield&&t.shpMax>0){for(const sg of[-1,1]){const g=glyphFx(sg<0?'shl':'shr',x+sg*4,y,0,620,0);g.c=sg*rr(70,120)+dx*60;g.d=-rr(120,180)}fxShake(4.5);ringFx(x,y,3,16,260,R_DUST,0,1,2)}break}   // the shield is gone: its halves fly apart
  case S_STUN:{for(let i=0;i<5;i++){const a=-Math.PI*(i+.5)/5,g=glyphFx(i&1?'star1':'star',x+Math.cos(a)*5,y-h*.3+Math.sin(a)*4,0,rr(340,460),0);g.c=Math.cos(a)*rr(70,130);g.d=Math.sin(a)*rr(120,170)}
   ringFx(x,y-h*.3,3,15,240,R_AURA,0,1,2);burst(K_TRAIL,R_AURA,x,y-h*.3,10,90,240,.26,1,0,4);glowFx(x,y-h*.3,46,'y',.5,170);fxShake(3.5);break}
  case S_DAZE:{puff(x,fy,7);for(let i=0;i<3;i++){const a=-Math.PI*(i+.5)/3,g=glyphFx('star1',x+Math.cos(a)*5,y-h*.3,0,340,0);g.c=Math.cos(a)*90;g.d=Math.sin(a)*130-30}ringFx(x,y-h*.35,3,12,240,R_ICE,0,1);fxShake(2);break}
  case S_PUNC:if(dmg>0){cone(K_TRAIL,fxBloodR(t),x+dx*8,y+dy*8,dx,dy*.6,10,170,380,.3,1,160,2.5,.16);cone(K_SQ,fxBloodR(t),x+dx*8,y+dy*8,dx,dy*.6-.1,6,90,220,.45,2,480,1.2,.3)}glyphFx('glint',x-dx*4,y-dy*4,0,150,0);fxShake(2);break;
  case S_BASH:for(let i=-2;i<=2;i++)spawn(K_STREAK,R_WHITE,x-dx*8-dy*i*7,y-dy*8+dx*i*7,dx*rr(240,330),dy*rr(240,330),.2,1,0,3);ringFx(x-dx*8,y-dy*8,2,12,220,R_STEEL,0,1,2);puff(x,fy,6);
   {const g=glyphFx('shield:AqBpeq',x-dx*14,y-dy*14+2,0,200,0);g.c=dx*90;g.d=dy*60-30}for(let i=0;i<3;i++){const g=glyphFx('star1',x,y-h*.4,0,300,0);g.c=(i-1)*70;g.d=-140}fxShake(3);break;
  case S_POISON:burst(K_SQ,R_HEX,x,y,12,40,150,.5,1,-40,2.5);for(let i=0;i<fxN(6);i++)spawn(K_PLUS,R_HEX,x+rr(-9,9),y+rr(-6,8),rr(-8,8),rr(-70,-30),rr(.5,.9),1,-20,.6,rr(0,.25));emitFx(0,t,0,0,16,520,0,R_HEX);break;
  case S_BITE:if(dmg>0)cone(K_SQ,fxBloodR(t),x,y,0,-1,9,60,190,.45,2,560,1,1.5);if(t.st&&(t.st.poison||t.st.poisoned))for(let i=0;i<fxN(6);i++)spawn(K_SQ,R_HEX,x+rr(-7,7),y+rr(-4,6),rr(-8,8),rr(20,60),rr(.5,.8),1,200,.5,rr(0,.2));fxShake(2.5);break;
  case S_GRAB:ringFx(x,fy,14,6,260,R_BONE,0,.5,2);puff(x,fy,6,R_BONE);glyphFx('ic:held',x,y-h*.5-6,6,420,60);break;
  case S_WEB:{glyphFx('web0',x,y,0,260,0);for(let i=0;i<fxN(14);i++){const a=i/14*6.283;spawn(K_STREAK,R_BONE,x,y,Math.cos(a)*rr(120,220),Math.sin(a)*rr(80,150),rr(.18,.3),1,0,4)}ringFx(x,fy,3,15,240,R_BONE,0,.5);break}
  case S_CHARGE:{puff(x,fy,12);ringFx(x,fy,4,24,320,R_DUST,0,.5,2);for(let i=-3;i<=3;i++)spawn(K_STREAK,R_WHITE,x-dx*10-dy*i*6,y-dy*10+dx*i*6,dx*rr(260,380),dy*rr(260,380),.22,1,0,3);glyphFx('star',x,y-h*.4,8,280,0);fxShake(5);break}
  case S_REAP:burst(K_TRAIL,R_VOID,x,y,10,80,230,.3,1,0,4);cone(K_SQ,R_VOID,x,y,dx,dy*.5-.4,8,60,180,.45,1,200,2,1);glowFx(x,y,40,'C',.45,160);break;
  case S_RIP:burst(K_TRAIL,R_GOLD,x,y,8,100,260,.24,1,0,4);glyphFx('glint:rd',x,y,0,140,0);fxFloat(t,u&&fxFree(u,t)==='spearwall'?'SPEAR WALL':'RIPOSTE',FS_GOLD);break;
  case S_GEN:burst(K_TRAIL,R,x,y,11,80,240,.3,1,0,4);ringFx(x,y,2,13,240,R,0,1);cone(K_SQ,R,x,y,dx,dy*.5-.4,6,50,170,.4,1,260,2,1);break}}
/* what the caster does before the blow, for the keys that have a wind-up of their own */
function fxCastX(u,t,ab,id,k,x,y,h,sp){const R=FXS.rmp|0;if(id&&id.charCodeAt(0)===109&&id[1]===':'&&fxCastM(u,t,ab,id,k,x,y,h,sp))return;if(fxCastN(u,t,ab,id,k,x,y,h,sp))return;
 switch(id){
  case'round':{const o=fxo(T_SPIN,x,y-h*.42,40*sp,340*sp,R_WHITE);o.a=17;o.b=6.6;o.c=-2.4;puff(x,y,7);for(let i=0;i<fxN(12);i++){const a=i/12*6.283;spawn(K_TRAIL,R_WHITE,x+Math.cos(a)*26,y-h*.42+Math.sin(a)*13,-Math.sin(a)*170,Math.cos(a)*85,.22,1,0,3,(.04+i*.018)*sp)}fxShake(2);break}
  case'reap':{const o=fxo(T_SPIN,x,y-h*.42,40*sp,400*sp,R_VOID);o.a=21;o.b=6.9;o.c=-2.4;o.d=1;glowFx(x,y-h*.4,80,'C',.5,340);for(let i=0;i<fxN(18);i++){const a=i/18*6.283;spawn(K_TRAIL,R_VOID,x+Math.cos(a)*32,y-h*.42+Math.sin(a)*16,-Math.sin(a)*190,Math.cos(a)*95,.26,1,0,3,(.04+i*.016)*sp)}fxShake(2.5);break}
  case'sweep':{let a0=0;if(t){const b=fxUP(t);a0=Math.atan2(b.y-y,b.x-x)}const o=fxo(T_SPIN,x,y-h*.3,30*sp,260*sp,ab.foe?R_BONE:R_DUST);o.a=16;o.b=ab.tgt==='aoe'?6.4:3.2;o.c=a0-1.6;puff(x,y,5);break}
  case'chant':{for(let i=0;i<3;i++)ringFx(x,y,4,(ab.rng||3)*30,620*sp,R_HEX,i*170*sp,.5,i?1:2);for(let i=0;i<5;i++)glyphFx(i&1?'note:eAdB':'note',x+(i-2)*9,y-h-2-(i&1)*6,22,620*sp,i*90*sp,null);
   for(let i=0;i<fxN(14);i++)spawn(K_SQ,R_HEX,x+rr(-14,14),y-rr(0,h),rr(-8,8),rr(-90,-40),rr(.4,.8),i&1?2:1,0,.6,rr(0,.4));fxShake(1.2);break}
  case'warcry':{for(let i=0;i<3;i++)ringFx(x,y-h*.3,5,(ab.rng||4)*30,560*sp,i===1?R_FIRE:R_RED,i*110*sp,.5,2);for(let i=0;i<fxN(22);i++){const a=i/22*6.283;spawn(K_STREAK,i&1?R_RED:R_WHITE,x+Math.cos(a)*12,y-h*.6+Math.sin(a)*6,Math.cos(a)*rr(260,380),Math.sin(a)*rr(130,190),.28,1,0,2.5,.05*sp)}
   glowFx(x,y-h*.5,90,'g',.5,300);glyphFx('ic:ab-warcry',x,y-h-12,10,640*sp,0,null);fxShake(4);break}
  case'rally':{ringFx(x,y,4,(ab.rng||4)*30,600*sp,R_GOLD,0,.5,2);ringFx(x,y,4,(ab.rng||4)*22,520*sp,R_WHITE,140*sp,.5);glyphFx('ic:rallied',x,y-h-12,12,700*sp,0,null);
   for(let i=0;i<fxN(16);i++)spawn(K_TRAIL,R_GOLD,x+rr(-16,16),y-rr(0,10),0,rr(-260,-130),rr(.3,.5),i&1?2:1,0,1.2,rr(0,.25));fxShake(1.5);break}
  case'summon':{const o=fxo(T_PORTAL,x,y,0,900*sp,R_VOID);o.a=22;emitFx(1,null,x,y-h*.4,90,520*sp,0,R_VOID);glowFx(x,y-h*.4,90,'C',.55,500);fxShake(2.5);for(let i=0;i<3;i++)ringFx(x,y,26,4,420*sp,R_VOID,i*140*sp,.5,2);break}
  case'raise':{for(let i=0;i<fxN(14);i++)spawn(K_SQ,R_GRAVE,x+rr(-10,10),y-rr(h*.5,h+8),rr(-10,10),rr(-80,-30),rr(.4,.8),i&1?2:1,-20,.8,rr(0,.3));ringFx(x,y,4,16,360*sp,R_GRAVE,0,.5,2);glowFx(x,y-h*.7,50,'C',.45,360);
   if(k>=0){const p=tpos(k%BW,(k/BW)|0,anTileH(k%BW,(k/BW)|0)),o=fxo(T_PROJ,x,y-h-4,120*sp,360*sp,R_GRAVE);o.x2=p.x;o.y2=p.y-6;o.a=4;emitFx(1,null,p.x,p.y-8,70,520*sp,160*sp,R_GRAVE)}break}
  case'gather':{for(let i=0;i<4;i++)ringFx(x,y-h*.4,64-i*6,6,520*sp,R_VOID,i*150*sp,.6,2);emitFx(1,u,0,0,120,1100*sp,0,R_VOID);glowFx(x,y-h*.5,110,'C',.6,700);glyphFx('ic:telegraph',x,y-h-14,8,900*sp,0,null);fxShake(3);break}
  case'nova':{for(let i=0;i<4;i++)ringFx(x,y-h*.2,6,78+i*6,620*sp,i&1?R_WHITE:R_VOID,i*70*sp,.5,2);glowFx(x,y-h*.4,170,'C',.85,460);glowFx(x,y-h*.4,90,'r',.6,180);fxShake(6);
   for(let i=0;i<fxN(54);i++){const a=Math.random()*6.283,sp2=rr(120,420);spawn(i%3?K_TRAIL:K_SQ,R_VOID,x+Math.cos(a)*8,y-h*.4+Math.sin(a)*4,Math.cos(a)*sp2,Math.sin(a)*sp2*.5,rr(.3,.7),i&1?2:1,0,2.2)}
   {const o=fxo(T_CRACK,x,y,0,1200,0);o.a=1}break}
  case'ward':case'guard':case'withdraw':case'slip':case'blink':break;
  case'charge':puff(x,y,8);ringFx(x,y,3,14,220*sp,R_RED,0,.5);break;
  case'gen':{const cat=FXS.cat;if(cat==='magic'||cat==='debuff')ringFx(x,y,4,15,300*sp,R,0,.5);else if(cat==='shout'){ringFx(x,y-h*.3,5,(ab.rng||3)*28,520*sp,R,0,.5,2);ringFx(x,y-h*.3,5,(ab.rng||3)*20,460*sp,R_WHITE,120*sp,.5);fxShake(2.5)}
   else if(cat==='summon'){const o=fxo(T_PORTAL,x,y,0,800*sp,R);o.a=20;emitFx(1,null,x,y-h*.4,80,480*sp,0,R)}break}
  default:break}}
/* a buff landing on t while the cast that gave it is live; true when it was drawn here */
function fxBuffX(t,id,x,y,h,sp){const ab=FXS.cab||FXO_NIL,R=FXS.rmp|0;if(id&&id.charCodeAt(0)===109&&id[1]===':'&&fxBuffM(t,id,x,y,h,sp))return true;if(fxBuffN(t,id,x,y,h,sp))return true;
 switch(id){
  case'reinforce':case'indom':case'empower':case'swift':case'adren':return false;
  case'guard':{const key=ab.buff&&ab.buff.key||ab.id||'';
   if(/ripost/.test(key)){for(const sg of[-1,1]){const o=fxo(T_SLASH,x,y-h*.5,(sg>0?90:0)*sp,200*sp,R_STEEL);o.a=sg>0?-.7:-2.4;o.b=13;o.c=sg}glyphFx('glint:rd',x,y-h*.75,0,260*sp,120*sp);ringFx(x,y,3,13,280*sp,R_GOLD,0,.5)}
   else if(/spear/.test(key)){const o=fxo(T_SPEARS,0,0,0,720*sp,R_STEEL);o.u=t;o.a=h;puff(x,y,5);ringFx(x,y,4,17,300*sp,R_STEEL,0,.5)}
   else{for(let i=-1;i<=1;i++){const g=glyphFx('shield:AqBpeq',x+i*11,y-h*.45-(i?0:3),0,620*sp,(1+i)*60*sp,t);g.b=-4}ringFx(x,y,4,19,300*sp,R_STEEL,0,.5,2);puff(x,y,6);fxShake(1.5)}
   return true}
  case'chant':for(let i=0;i<2;i++)glyphFx(i?'note:eAdB':'note',x+(i?5:-5),y-h-2,18,460*sp,i*90*sp,null);ringFx(x,y,3,13,300*sp,R_HEX,0,.5);for(let i=0;i<fxN(6);i++)spawn(K_TRAIL,R_HEX,x+rr(-9,9),y-rr(0,8),0,rr(-190,-100),rr(.25,.4),1,0,1.2,rr(0,.15));return true;
  case'warcry':for(let i=0;i<3;i++)glyphFx(i&1?'arrow:AhBgeh':'arrow:AgBfeh',x+(i-1)*9,y-h*.3-(i&1)*6,22,440*sp,i*60*sp,null);ringFx(x,y,3,14,280*sp,R_RED,0,.5);glowFx(x,y-h*.5,40,'g',.4,200);return true;
  case'rally':ringFx(x,y,3,14,300*sp,R_GOLD,0,.5);for(let i=0;i<fxN(8);i++)spawn(K_TRAIL,R_GOLD,x+rr(-10,10),y-rr(0,10),0,rr(-220,-110),rr(.25,.45),1,0,1.2,rr(0,.12));return true;
  case'ward':{const o=fxo(T_WARD,0,0,0,560*sp,R_VOID);o.u=t;o.a=h;o.b=1;glowFx(x,y-h*.5,56,'C',.45,300);for(let i=0;i<fxN(12);i++){const a=i/12*6.283;spawn(K_SQ,R_VOID,x+Math.cos(a)*16,y-h*.5+Math.sin(a)*24,-Math.cos(a)*30,-Math.sin(a)*40,.4,1,0,1,rr(0,.15))}return true}
  case'gen':ringFx(x,y,3,15,320*sp,R,0,.5,2);for(let i=0;i<fxN(10);i++)spawn(K_TRAIL,R,x+rr(-10,10),y-rr(0,10),0,rr(-220,-110),rr(.25,.45),1,0,1.2,rr(0,.12));glyphFx('arrow',x,y-h*.3,22,420*sp,0,null);return true}
 return false}
/* ---- events ---- */
const FX_MORT=['FLEEING','BREAKING','WAVERING','STEADY','CONFIDENT'];
function fxOnMorale(d){const u=d.u;if(!u)return;const to=d.to|0,up=to>(d.from|0),p=fxUP(u),x=p.x,y=p.y,h=p.h,sp=Math.max(.6,fxSp());
 const f=fxTail(u,/^(Fleeing|Breaking|Wavering|Steady|Confident)$/);if(f)f.fx=1;
 fxFloat(u,(typeof MORN==='object'&&MORN&&MORN[to]?MORN[to]:FX_MORT[to]||''),up?(to>=4?FS_GOLD:FS_HEAL):to<=1?FS_HP:FS_GOLD);
 glyphFx('ic:morale-'+to,x,y-h-12,up?14:6,(up?760:900)*sp,0,null);
 if(up){ringFx(x,y,3,to>=4?20:16,340*sp,R_GOLD,0,.5,d.from<=1?2:1);for(let i=0;i<fxN(d.from<=1?14:5);i++)spawn(K_TRAIL,to>=4?R_GOLD:R_CHI,x+rr(-11,11),y-rr(0,10),0,rr(-230,-120),rr(.28,.46),i&1?2:1,0,1.2,rr(0,.16));
  if(to>=4)glyphFx('glint:rd',x+8,y-h-8,0,260*sp,160*sp)}
 else if(to===0){ringFx(x,y,22,5,320*sp,R_RED,0,.5,2);for(let i=0;i<fxN(10);i++){const g=i<3?glyphFx('sweat',x+(i-1)*9,y-h+2,0,420,i*50):null;if(g){g.c=(i-1)*60;g.d=-110}spawn(K_SQ,R_WHITE,x+rr(-8,8),y-h*.7,rr(-90,90),rr(-150,-60),rr(.3,.55),1,520,1,rr(0,.1))}
  glyphFx('bang',x,y-h-26,4,620*sp,0,null);fxShake(1.5)}
 else{for(let i=0;i<fxN(to===1?7:4);i++)spawn(K_SQ,to===1?R_EMBER:R_AURA,x+rr(-9,9),y-h*.8,rr(-50,50),rr(-110,-50),rr(.3,.5),1,460,1,rr(0,.12));ringFx(x,y,16,6,280*sp,to===1?R_EMBER:R_AURA,0,.5)}}
function fxOnInjury(d){const t=d.t;if(!t)return;const p=fxUP(t),x=p.x,y=p.y,h=p.h,I=typeof INJ==='object'&&INJ&&INJ[d.id],n=I?I.n:'Injured',sp=Math.max(.6,fxSp()),at=Math.max(0,anOf(t).hitT-now)+140*sp;
 const f=fxTail(t,new RegExp('^'+n.replace(/[^\w ]/g,'.')+'$'));if(f)f.fx=1;
 fxFloat(t,n,FS_HP,at+120);glyphFx('ic:injury',x,y-h-12,12,900*sp,at,null);
 for(let i=0;i<fxN(8);i++)spawn(K_SQ,i&1?R_BONE:R_BLOOD,x+rr(-6,6),y-h*(I&&I.loc==='h'?.85:.5),rr(-110,110),rr(-170,-60),rr(.4,.7),i%3?1:2,560,.8,at/1000);
 ringFx(x,y-h*(I&&I.loc==='h'?.85:.5),2,12,240*sp,R_RED,at,1,2)}
function fxOnStatus(d){const t=d.t,key=d.key;if(!t||!key)return;if(!(FXS.cu&&(FXS.cid==='shove'||FXS.cid==='bash'))){const f0=fxTail(t,/^Shoved$/);if(f0)f0.fx=1}   // the rules' word for any blow without damage; only a shove shows it
 const p=fxUP(t),x=p.x,y=p.y,h=p.h,sp=Math.max(.6,fxSp()),S=typeof shStatus==='function'?shStatus(key):null,at=Math.max(0,anOf(t).hitT-now);
 if(key==='splitshield'){const f=fxTail(t,/^Shield -\d+$/);if(f){f.fx=1;fxFloat(t,'SHIELD -'+(d.n|0),FS_ARM,at)}const f2=fxTail(t,/^Shield split$/);if(f2)f2.fx=1;
  if(FXS.cu&&FXS.cid==='split'){const u=FXS.cu;FXS.cu=null;try{animEvent('miss',{u,t});const ld=fxStrike(u,t,'split',0,false),e=fxQueue(t,u,now+ld,-1,0,S_SPLIT,false);animImpact(t,u,now+ld,false)}catch(e){}}   // a blow at the shield draws no 'hit': stage it here
  else{cone(K_SQ,R_ROOT,x,y-h*.5,0,-1,8,60,200,.5,2,600,1,1.4);if(!t.shield){for(const sg of[-1,1]){const g=glyphFx(sg<0?'shl':'shr',x+sg*4,y-h*.5,0,620,at);g.c=sg*rr(70,120);g.d=-rr(120,180)}fxShake(4)}}return}
 if(FXS.cu===t&&FXS.cab&&FXS.cab.buff&&FXS.cab.buff.key===key)return;                               // its own guard going up: the buff draws that
 if(key==='nova'||key==='warcry'||key==='chant'||key==='rally'||key==='ward')return;                   // drawn by the cast / the buff
 if(key==='sunder'){cone(K_SQ,R_ROOT,x,y-h*.5,0,-1,10,60,220,.5,2,600,1,1.4);for(const sg of[-1,1]){const g=glyphFx(sg<0?'shl':'shr',x+sg*4,y-h*.5,0,620,at);g.c=sg*rr(70,120);g.d=-rr(120,180)}fxShake(4.5);return}
 if(key==='enrage'){const boss=t.def&&(t.def.boss||t.def.big);ringFx(x,y,4,boss?40:20,420*sp,R_RED,at,.5,2);ringFx(x,y,4,boss?30:14,360*sp,R_FIRE,at+90*sp,.5);glowFx(x,y-h*.5,boss?120:60,'g',.6,360,at);fxShake(boss?6:3);
  for(let i=0;i<fxN(boss?30:14);i++){const a=Math.random()*6.283;spawn(K_TRAIL,i&1?R_RED:R_FIRE,x,y-h*.5,Math.cos(a)*rr(120,320),Math.sin(a)*rr(60,170)-40,rr(.3,.6),i&1?2:1,0,2.5,at/1000)}
  if(boss){fxPhase(t,at);return}glyphFx('ic:enraged',x,y-h-12,10,760*sp,at,null);return}
 glyphFx('ic:st-'+key,x,y-h-12,10,760*sp,at+60*sp,null);
 if(/bleed/.test(key))for(let i=0;i<fxN(7);i++)spawn(K_SQ,R_BLOOD,x+rr(-7,7),y-h*.5+rr(-6,6),rr(-12,12),rr(20,70),rr(.5,.9),i&1?2:1,400,.4,at/1000+rr(0,.3));
 else if(/poison|venom/.test(key)){for(let i=0;i<fxN(8);i++)spawn(K_PLUS,R_HEX,x+rr(-10,10),y-rr(4,h*.7),rr(-6,6),rr(-70,-30),rr(.5,.9),1,-20,.6,at/1000+rr(0,.3));ringFx(x,y,3,13,300*sp,R_HEX,at,.5)}
 else if(/daze/.test(key)){ringFx(x,y-h,2,11,300*sp,R_ICE,at,.5,2)}
 else if(/web/.test(key)){if(FXS.cu&&FXS.cid==='web'){const u=FXS.cu;FXS.cu=null;try{animEvent('miss',{u,t});const ld=fxStrike(u,t,'web',0,false),e=fxQueue(t,u,now+ld,-1,0,S_WEB,false);animImpact(t,u,now+ld,false)}catch(e){}}   // a web does no damage, so no 'hit' comes: throw it here
  else{glyphFx('web0',x,y-h*.5,0,260,at);ringFx(x,y,3,15,240,R_BONE,at,.5)}}
 else if(/hex|curse/.test(key)){for(let i=0;i<fxN(10);i++)spawn(K_SQ,R_VOID,x+rr(-10,10),y-rr(h*.3,h),rr(-8,8),rr(20,60),rr(.5,.9),i&1?2:1,40,.5,at/1000+rr(0,.2));ringFx(x,y,16,5,320*sp,R_VOID,at,.5,2)}
 else if(/panic|fear/.test(key)){for(let i=0;i<3;i++){const s2=glyphFx('sweat',x+(i-1)*9,y-h+2,0,420,at+i*50);s2.c=(i-1)*60;s2.d=-110}}
 else if(/grab|held|root/.test(key)){ringFx(x,y,14,6,260,R_BONE,at,.5,2)}
 else if(S&&S.good){ringFx(x,y,3,14,300*sp,t.side===0?R_GOLD:R_RED,at,.5);for(let i=0;i<fxN(6);i++)spawn(K_TRAIL,t.side===0?R_GOLD:R_RED,x+rr(-9,9),y-rr(0,8),0,rr(-190,-100),rr(.25,.4),1,0,1.2,at/1000+rr(0,.12))}
 else{ringFx(x,y,15,5,300*sp,R_SMOKE,at,.5);for(let i=0;i<fxN(6);i++)spawn(K_SQ,R_SMOKE,x+rr(-9,9),y-rr(h*.4,h),rr(-6,6),rr(20,50),rr(.4,.7),1,0,.5,at/1000+rr(0,.15))}}
/* a boss past its threshold: the ground cracks, a crown of fire, everything shakes */
function fxPhase(t,at){const p=fxUP(t),x=p.x,y=p.y,h=p.h,sp=Math.max(.6,fxSp());{const o=fxo(T_CRACK,x,y,at,1400,0);o.a=1}
 for(let i=0;i<4;i++)ringFx(x,y,6,60+i*14,640*sp,i&1?R_FIRE:R_VOID,at+i*90*sp,.5,2);glowFx(x,y-h*.5,160,'C',.7,520,at);glowFx(x,y-h*.5,100,'E',.6,300,at);
 glyphFx('crown',x,y-h-14,12,1100*sp,at+80*sp,null);emitFx(0,t,0,0,40,1200*sp,at,R_FIRE);fxFloat(t,'ENRAGED',FS_HP,at+160)}
function fxOnSpawn(u){if(!u)return;const p=fxUP(u),x=p.x,y=p.y,h=p.h,sp=Math.max(.6,fxSp());fxU(u);
 if(u.side===0){for(let i=0;i<4;i++)puff(x+rr(-10,10),y+18+i*6,3);ringFx(x,y,4,18,340*sp,R_GOLD,220*sp,.5,2);glyphFx('ic:reserve',x,y-h-12,12,820*sp,200*sp,null);fxFloat(u,'RESERVE',FS_GOLD,240*sp);
  for(let i=0;i<fxN(8);i++)spawn(K_TRAIL,R_GOLD,x+rr(-10,10),y-rr(0,10),0,rr(-200,-110),rr(.25,.45),1,0,1.2,.22*sp+rr(0,.15));return}
 if(u.risen){{const o=fxo(T_CRACK,x,y,0,900,0);o.a=0}for(let i=0;i<fxN(14);i++)spawn(K_SQ,i%3?R_DUST:R_BONE,x+rr(-12,12),y+rr(-4,4),rr(-70,70),rr(-230,-90),rr(.4,.8),i&1?2:1,640,.6,rr(0,.25));
  {const o=fxo(T_COL,x,y,60*sp,560*sp,R_GRAVE);o.a=h;o.b=1}ringFx(x,y,4,18,420*sp,R_GRAVE,0,.5,2);glowFx(x,y-h*.4,60,'C',.5,480);glyphFx('skull',x,y-h-8,14,700*sp,180*sp,null);
  for(let i=0;i<fxN(10);i++)spawn(K_SQ,R_GRAVE,x+rr(-9,9),y-rr(0,h*.6),rr(-8,8),rr(-90,-40),rr(.5,.9),i&1?2:1,-20,.8,rr(.1,.5));fxShake(2);return}
 {const o=fxo(T_PORTAL,x,y,0,620*sp,R_VOID);o.a=14}{const o=fxo(T_COL,x,y,120*sp,300*sp,R_VOID);o.a=h;o.b=1}emitFx(1,null,x,y-h*.4,90,260*sp,0,R_VOID);glowFx(x,y-h*.4,56,'C',.55,360);
 for(let i=0;i<fxN(12);i++){const a=Math.random()*6.283;spawn(K_SQ,R_VOID,x,y-h*.4,Math.cos(a)*rr(50,150),Math.sin(a)*rr(30,90),rr(.3,.55),i%3?1:2,0,3,.16*sp+rr(0,.06))}fxShake(1.5)}
function fxOnWithdraw(d){const u=d.u;if(!u)return;const p=fxUP(u),x=p.x,y=p.y,sp=Math.max(.6,fxSp()),er=typeof EDGE==='object'&&EDGE?EDGE[u.side?1:0]:u.side?0:BH-1,dr=er>BH/2?1:-1,q=tpos(u.c,u.r+dr*1.7,anTileH(u.c,u.r));
 const f=fxTail(u,/^(Fled|Withdrew)$/);if(f)f.fx=1;fxFloat(u,d.why==='flee'?'FLED':'WITHDREW',d.why==='flee'?FS_HP:FS_MISS);
 const o=fxo(T_LEAVE,x,y,0,(d.why==='flee'?420:620)*sp,0);o.x2=q.x;o.y2=q.y;o.u=u;o.a=fxSDir(0,dr);puff(x,y,5);
 for(let i=0;i<4;i++)spawn(K_SQ,R_DUST,x+(q.x-x)*i/5+rr(-5,5),y+(q.y-y)*i/5+rr(-2,2),rr(-20,20),rr(-30,-8),rr(.3,.5),1,40,2,i*.09*sp)}
function fxOnBlocked(d){const u=d.u,t=d.t;if(!u||!t)return;const a=fxUP(u),ax=a.x,ay=a.y-a.h*.55,b=fxUP(t),bx=b.x,by=b.y-b.h*.48,sp=Math.max(.6,fxSp());
 const f=fxTail(u,/^No line of fire$/);if(f)f.fx=1;fxFloat(u,'NO LINE',FS_MISS);glyphFx('ic:los-blocked',ax+(bx-ax)*.45,ay+(by-ay)*.45-10,6,620*sp,0,null);
 const o=fxo(T_BEAM,ax,ay,0,200*sp,R_SMOKE);o.x2=ax+(bx-ax)*.45;o.y2=ay+(by-ay)*.45;puff(o.x2,o.y2+10,4)}
function fxOnFF(d){const t=d.t;if(!t)return;const p=fxUP(t),sp=Math.max(.6,fxSp()),ff=FXS.ffShot,at=ff&&ff.v===t?Math.max(0,ff.at-now):0;
 fxFloat(t,'FRIENDLY FIRE',FS_HP,at+40);glyphFx('ic:friendly-fire',p.x,p.y-p.h-12,10,760*sp,at,null);glyphFx('bang',p.x+12,p.y-p.h-10,4,520*sp,at+60,null);ringFx(p.x,p.y-p.h*.5,3,15,260*sp,R_RED,at,1,2)}
/* ---- watchers: what a status looks like while it lasts ---- */
function fxWatchX(u,v){const st=u.st;fxWatchM(u,v);
 if((st.web||st.webbed)&&!v.web){v.web=true;const o=fxo(T_WEB,0,0,60,9000,R_BONE);o.u=u;o.s=v}
 if(st.ward&&!v.ward){v.ward=true;const o=fxo(T_WARD,0,0,0,9000,R_VOID);o.u=u;o.s=v;o.a=u.def&&u.def.big?90:58}
 if((st.daze||u.dazed)&&!v.swirl&&!v.stars){v.swirl=true;const o=fxo(T_SWIRL,0,0,140,6000,R_ICE);o.u=u;o.s=v}}
function fxDripX(u,dt){const st=u.st,m=u.mor;fxDripM(u,dt);if(!(st.bleed||st.poison||st.nova||st.enrage||m===0||st.panic||st.winded||st.hex))return;const r=Math.random(),p=fxUB(u),x=p.x,y=p.y,h=p.h;
 if(st.bleed&&r<dt*9)spawn(K_SQ,R_BLOOD,x+rr(-7,7),y-rr(h*.3,h*.7),0,rr(20,50),rr(.4,.7),Math.random()<.4?2:1,300,.3);
 if(st.poison&&r<dt*7)spawn(K_PLUS,R_HEX,x+rr(-9,9),y-rr(h*.3,h*.9),rr(-4,4),rr(-50,-24),rr(.5,.9),1,-10,.4);
 if(st.hex&&r<dt*5)spawn(K_SQ,R_VOID,x+rr(-10,10),y-rr(h*.5,h+6),rr(-4,4),rr(14,34),rr(.5,.8),1,0,.3);
 if(st.enrage&&r<dt*10)spawn(K_SQ,R_FIRE,x+rr(-9,9),y-rr(h*.4,h),rr(-8,8),rr(-90,-40),rr(.3,.5),Math.random()<.3?2:1,-30,.8);
 if(st.winded&&r<dt*4)spawn(K_SQ,R_SMOKE,x+rr(4,10),y-h*.78,rr(10,30),rr(-24,-8),rr(.5,.8),2,0,.6);
 if((m===0||st.panic)&&r<dt*6){const g=glyphFx('sweat',x+rr(-10,10),y-h+2,0,360,0);g.c=rr(-50,50);g.d=-rr(70,110)}
 if(st.nova){if(r<dt*40){const a=Math.random()*6.283,rd=rr(40,76);spawn(K_TRAIL,R_VOID,x+Math.cos(a)*rd,y-h*.4+Math.sin(a)*rd*.5,-Math.cos(a)*rd*3,-Math.sin(a)*rd*1.5,.3,Math.random()<.3?2:1,0,0)}
  if(r<dt*1.6)ringFx(x,y-h*.4,60,8,460,R_VOID,0,.6,2)}}
/* ---- shapes ---- */
function fxDrawShapeX(o,t,dt,p,cx,cy,Rm,tick){const q=DQ;if(o.ty>=T_M0){fxDrawShapeM(o,t,dt,p,cx,cy,Rm,tick);return}
 switch(o.ty){
  case T_SPIN:{const R=o.a,e=Math.min(1,p/.62),ee=1-(1-e)*(1-e),hd=o.c+o.b*ee,tl=o.c+o.b*Math.max(0,(p-.3)/.7);aArc(cx,cy,R,tl,hd,o.r,.5,p<.7?3:2);if(o.d)aArc(cx,cy,R-6,tl,hd,o.r,.5,1);
   const hx=cx+Math.round(Math.cos(hd)*R),hy=cy+Math.round(Math.sin(hd)*R*.5);if(p<.62){q.fillStyle=Rm[0];A(hx-1,hy-1,3,3)}break}
  case T_BITE:{const e=Math.min(1,p/.4),gap=Math.round(9*(1-e*e)),up=fxSpr('fang'),dn=fxSpr('fangd');if(p>.75&&(tick&1))break;aSpr(up,cx-3,cy-4-gap);aSpr(dn,cx-3,cy+gap);
   if(p>=.4&&p<.6){q.fillStyle=PAL.r;A(cx-5,cy,11,1)}break}
  case T_WEB:{const u=o.u,v=o.s;if(!u||!u.alive||(p>.01&&!(u.st&&(u.st.web||u.st.webbed)))){o.on=false;if(v)v.web=false;o.u=null;o.s=null;break}const b=fxUB(u),fx=Math.floor(b.x/2),fy=Math.floor(b.y/2),hh=b.h>>1,gr=Math.min(1,(t-o.t0)/220);
   q.fillStyle=PAL.m;for(let i=0;i<5;i++){const a=.2+i*.68,X=fx+Math.round(Math.cos(a)*14*gr),Y=fy+Math.round(Math.sin(a)*5*gr);aLine(X,Y,fx+((i-2)*3),fy-Math.round(hh*(.5+.1*(i&1))*gr),1)}
   q.fillStyle=PAL.l;for(let j=1;j<=2;j++){const yy=fy-Math.round(hh*.3*j*gr),w=9-j*2;for(let i=-w;i<=w;i+=2)A(fx+i,yy+((i+j)&2?1:0),1,1)}break}
  case T_WARD:{const u=o.u,v=o.s;if(!u||!u.alive||(v&&p>.01&&!(u.st&&u.st.ward))){o.on=false;if(v)v.ward=false;o.u=null;o.s=null;break}const b=fxUB(u),fx=Math.floor(b.x/2),hh=(o.a||58)>>1,fy=Math.floor(b.y/2)-(hh>>1),n=26,ph=(t/90)|0;
   for(let i=0;i<n;i++){if(!o.b&&((i+ph)%4))continue;const a=i/n*6.283,X=fx+Math.round(Math.cos(a)*(hh*.48+2)),Y=fy+Math.round(Math.sin(a)*(hh*.62+2));q.fillStyle=Rm[(i+ph)&1?1:3];A(X,Y,1,1);if(o.b&&p<.5){q.fillStyle=Rm[0];A(X,Y-1,1,1)}}break}
  case T_SWIRL:{const u=o.u,v=o.s;if(!u||!u.alive||(p>.05&&!(u.st&&u.st.daze)&&!u.dazed)){o.on=false;if(v)v.swirl=false;o.u=null;o.s=null;break}const b=fxUB(u),hx=Math.floor(b.x/2),hy=Math.floor((b.y-b.h)/2)+1;
   for(let i=0;i<10;i++){const a=t*.006+i*.5,r=1+i*.75,X=hx+Math.round(Math.cos(a)*r),Y=hy+Math.round(Math.sin(a)*r*.45);q.fillStyle=PAL[i<4?'r':i<7?'F':'x'];A(X,Y,1,1)}break}
  case T_SPEARS:{const u=o.u;if(!u||!u.alive){o.on=false;o.u=null;break}const b=fxUP(u),fx=Math.floor(b.x/2),fy=Math.floor(b.y/2),up=Math.min(1,p/.2),dn=Math.max(0,(p-.78)/.22);
   for(let i=-2;i<=2;i++){const len=Math.round((15-Math.abs(i)*2)*up*(1-dn));if(len<2)continue;const bx=fx+i*5,by=fy+2-Math.abs(i),tx=bx+i*3,ty=by-len;q.fillStyle=PAL['0'];aLine(bx+1,by,tx+1,ty,1);q.fillStyle=PAL.k;aLine(bx,by,tx,ty,1);
    q.fillStyle=PAL.r;A(tx,ty-2,1,3);q.fillStyle=PAL.q;A(tx-1,ty-1,3,1)}break}
  case T_PORTAL:{const R=o.a||18,e=p<.25?p/.25:p>.75?(1-p)/.25:1,rx=Math.max(2,Math.round(R*.55*e)),ry=Math.max(2,Math.round(R*e)),oy=cy-ry,n=Math.max(12,rx*5),ph=(t/50)|0;
   for(let i=0;i<n;i++){const a=i/n*6.283,X=cx+Math.round(Math.cos(a)*rx),Y=oy+Math.round(Math.sin(a)*ry);q.fillStyle=Rm[(i+ph)%3===0?0:(i+ph)&1?2:4];A(X,Y,(i+ph)%3===0?2:1,(i+ph)%3===0?2:1)}
   for(let i=0;i<7;i++){const a=t*.012+i*.9,r=(i/7)*rx*.9,X=cx+Math.round(Math.cos(a)*r),Y=oy+Math.round(Math.sin(a)*r*ry/rx);q.fillStyle=Rm[i&1?1:3];A(X,Y,1,1)}break}
  case T_LEAVE:{const u=o.u;if(!u){o.on=false;break}let S=null;try{if(typeof unitSpritePx==='function')S=unitSpritePx(u,o.a|0,'walk',((t-o.t0)/90)|0)}catch(e){}if(!S||!S.cv)break;
   const x=o.x+(o.x2-o.x)*p,y=o.y+(o.y2-o.y)*p;q.globalAlpha=p<.45?1:p<.7?.7:p<.88?.4:.2;aSpr(typeof tintedOf==='function'?tintedOf(S.cv):S.cv,Math.floor(x/2)-S.ax,Math.floor(y/2)-S.ay);q.globalAlpha=1;
   o.acc+=dt;if(o.acc>.09&&!reduced){o.acc=0;spawn(K_SQ,R_DUST,x+rr(-5,5),y+rr(-2,2),rr(-14,14),rr(-26,-8),rr(.2,.35),1,40,2)}break}}}

/* ---- hooks from the animation controller ---- */
function fxAnimMove(u,kind,oc,or,dist){if(typeof document==='undefined'||!(SPEEDF>0)||!B||typeof now!=='number')return;if(fxMoveM(u,kind,oc,or,dist))return;const sp=Math.max(.5,fxSp()),o0=tpos(oc,or,anTileH(oc,or)),x0=o0.x,y0=o0.y,p=fxUP(u),x1=p.x,y1=p.y,h=p.h;
 if(kind===AN_WALK){if(!reduced)for(let i=0;i<2;i++)spawn(K_SQ,R_DUST,x0+rr(-6,6),y0+rr(-2,2),rr(-14,14),rr(-26,-8),rr(.2,.35),1,40,2)}
 else if(kind===AN_KB){puff(x0,y0,5);const dx=x1-x0,dy=y1-y0;for(let i=0;i<fxN(5);i++)spawn(K_TRAIL,R_DUST,x0+dx*rr(.1,.6)+rr(-5,5),y0+dy*rr(.1,.6)+rr(-2,2),-dx*1.2,-dy*1.2-20,rr(.18,.3),1,0,3,rr(0,.08))}
 else if(kind===AN_LEAP){puff(x0,y0,6,R_WIND);ringFx(x0,y0,3,16,240*sp,R_WIND,0,.5);emitFx(4,u,x1-x0,y1-y0,110,200*sp,0,R_WIND)}
 else if(kind===AN_BLINK){const dl=124*fxSp();const bR=FXS.bR||R_MANA;{const o=fxo(T_COL,x1,y1,dl,200*sp,bR);o.a=h;o.b=1}ringFx(x1,y1,3,15,260*sp,bR,dl,.5);glowFx(x1,y1-h*.5,44,bR===R_VOID?'C':'x',.5,200,dl);
  for(let i=0;i<fxN(16);i++){const a=Math.random()*6.283;spawn(K_SQ,bR,x1+rr(-3,3),y1-rr(0,h),Math.cos(a)*rr(40,130),Math.sin(a)*rr(30,90),rr(.25,.5),i%3?1:2,0,3,dl/1000+rr(0,.05))}}
 else if(kind===AN_DASH){puff(x0,y0,6);const S=fxUnitSpr(u);for(let i=0;i<4;i++){const f=i/4,o=fxo(T_GHOST,x0+(x1-x0)*f,y0+(y1-y0)*f,f*150*fxSp(),230*sp,0);o.s=FXS.dS||'y';if(S){o.cv=S.cv;o.a=S.ax;o.b=S.ay}else o.a=h}
  const dx=x1-x0,dy=y1-y0;for(let i=0;i<fxN(14);i++){const f=Math.random();spawn(K_TRAIL,FXS.dR||R_AURA,x0+dx*f+rr(-4,4),y0+dy*f-rr(4,h*.8),-dx*.9,-dy*.9,rr(.18,.32),1,0,2,f*.15*fxSp())}if(FXS.cid==='charge'){for(let i=0;i<5;i++)puff(x0+dx*i/5,y0+dy*i/5,3);fxShake(1.5)}}
 else if(kind===AN_STEP){puff(x0,y0,4);const dx=x1-x0,dy=y1-y0;for(let i=0;i<fxN(4);i++)spawn(K_TRAIL,R_WHITE,x0+dx*.3+rr(-4,4),y0+dy*.3-i*7-2,-dx*2.4,-dy*2.4,.16,1,0,3,i*.02)}}
function fxAnimLand(u,kind,drop){if(typeof document==='undefined'||!(SPEEDF>0)||!B||typeof now!=='number')return;const p=fxUP(u);if(kind===AN_DIVE){fxQuake(p.x,p.y,1.2,0);return}
 if(kind===AN_LEAP){puff(p.x,p.y,7,R_WIND);ringFx(p.x,p.y,3,15,220,R_WIND,0,.5)}else if(kind===AN_DASH||kind===AN_STEP)puff(p.x,p.y,4);else if(kind===AN_KB&&drop>.5)puff(p.x,p.y,7)}

/* ---- per-unit watcher: statuses, deaths without events ---- */
const FXU=new WeakMap();
function fxU(u){let v=FXU.get(u);if(!v){v={burn:u.st.burn||0,chill:u.st.chill||0,stun:u.st.stun||0,root:(u.st.root||0)+(u.rooted?1:0),alive:u.alive,dead:false,stars:false,rootFx:false,web:false,ward:false,swirl:false};FXU.set(u,v)}return v}
function fxWarm(){if(FXS.warm||typeof document==='undefined')return;FXS.warm=true;try{for(let i=0;i<FXSTY.length;i++)fxAtlas(i);for(const k in FXG)fxSpr(k);fxSpr('glint:rF');fxSpr('arrow:AdBc');
  for(const k of ['E','F','z','C','y','x','A'])fxGlowSpr(k);for(const k of ['chev0','chev1','burn','chill','root','stun','buff','indom','morale-0','morale-1','morale-2','morale-4'])anSprite(k);
  for(const k of ['glint:rd','ic:morale-0','ic:morale-1','ic:morale-2','ic:morale-3','ic:morale-4','ic:injury','ic:telegraph','ic:rallied','ic:st-splitshield'])fxSpr(k)}catch(e){}}
function fxReset(){fxWarm();pN=0;FXS.amp=0;FXS.cu=null;FXS.turnU=null;FXS.haz=null;FXS.hazT=null;FXS.b=typeof B!=='undefined'?B:null;for(let i=0;i<FXO.length;i++){const o=FXO[i];o.on=false;o.u=null;o.cv=null}
 for(let i=0;i<IMP.length;i++){IMP[i].on=false;IMP[i].t=IMP[i].u=null}for(let i=0;i<FLT.length;i++){FLT[i].on=false;FLT[i].u=null}}
function fxScan(dt){if(!B)return;if(FXS.b!==B)fxReset();FXS.scanT=now;try{fxLockScan()}catch(e){}const S=B.shots,F=B.floats,live=SPEEDF>0;
 if(!B.busy)FXS.cu=null;
 if(S.length){let n=0;for(let i=0;i<S.length;i++)if(now-S[i].t<300)S[n++]=S[i];S.length=n}
 for(let i=0;i<F.length;i++){const f=F[i];if(f.fx)continue;f.fx=1;if(!live||!f.u)continue;const s=f.txt;
  if(/^-\d+$/.test(s))fxFloat(f.u,s,FS_HP);else if(s==='Armor')fxFloat(f.u,'BLOCK',FS_ARM);else if(/^\+\d+$/.test(s))fxFloat(f.u,s,FS_HEAL);else if(s==='Miss')fxFloat(f.u,'MISS',FS_MISS);
  else fxFloat(f.u,s,s==='Chilled'?FS_ICE:f.col==='#9bd96f'?FS_HEAL:FS_GOLD)}
 if(F.length>24||(F.length&&now-F[0].t>1500)){let n=0;for(let i=0;i<F.length;i++)if(now-F[i].t<1200)F[n++]=F[i];F.length=n}
 for(let i=0;i<IMP.length;i++){const e=IMP[i];if(e.on&&now>=e.at)fxImpact(e)}
 const U=B.units;
 for(let i=0;i<U.length;i++){const u=U[i],v=fxU(u);
  if(v.alive&&!u.alive){v.alive=false;if(!v.dead&&live){v.dead=true;fxDeathNow(u)}}
  if(!u.alive)continue;
  const pend=anOf(u).hitT>now,bn=pend?v.burn:u.st.burn||0,cl=pend?v.chill:u.st.chill||0,sn=pend?v.stun:u.st.stun||0,rt=pend?v.root:(u.st.root||0)+(u.rooted?1:0);
  if(live){
   if(bn>v.burn){const p=fxUP(u);for(let j=0;j<fxN(10);j++)spawn(K_SQ,R_FIRE,p.x+rr(-9,9),p.y-rr(0,p.h*.6),rr(-10,10),rr(-100,-40),rr(.3,.6),j&1?2:1,-40,1.4,.12)}
   if(cl>v.chill){const p=fxUP(u),o=fxo(T_GHOST,0,0,120,420,0);o.u=u;o.s='F';o.c=1;for(let j=0;j<fxN(8);j++){const a=j/8*6.283;spawn(K_SQ,R_ICE,p.x+Math.cos(a)*14,p.y+Math.sin(a)*7,0,-rr(20,60),rr(.4,.7),1,0,2,.12+rr(0,.1))}}
   if(sn&&!v.stars){v.stars=true;const o=fxo(T_STARS,0,0,140,6000,0);o.u=u;o.s=v}
   if(rt&&!v.rootFx&&!(u.st.web||u.st.webbed)){v.rootFx=true;const o=fxo(T_ROOT,0,0,140,9000,R_ROOT);o.u=u;o.s=v}
   if(!pend)fxWatchX(u,v)}
  v.burn=bn;v.chill=cl;v.stun=sn;v.root=rt;
  if(reduced||!live)continue;
  fxDripX(u,dt);
  if(bn||cl||u.buffs.length){const r=Math.random();
   if(bn&&r<dt*16){const p=fxUB(u);spawn(K_SQ,R_FIRE,p.x+rr(-8,8),p.y-rr(4,p.h*.75),rr(-6,6),rr(-70,-30),rr(.3,.55),Math.random()<.4?2:1,-30,.8)}
   if(cl&&r<dt*6){const p=fxUB(u);spawn(K_SQ,R_ICE,p.x+rr(-11,11),p.y-rr(p.h*.3,p.h),rr(-4,4),rr(14,30),rr(.5,.8),1,0,.3)}
   if(u.buffs.length&&r<dt*4&&(u.buffs.length>1||!u.buffs[0].foe)){const p=fxUB(u);spawn(K_SQ,u.side===0?fxResR(u):R_RED,p.x+rr(-11,11),p.y-rr(0,12),0,rr(-70,-40),rr(.4,.6),1,0,.5)}}}
 // hazard tiles breathe embers
 if(live&&!reduced){if(FXS.hazT!==B.tiles){FXS.hazT=B.tiles;const H=[];for(let k=0;k<B.tiles.length;k++)if(B.tiles[k].t==='haz')H.push(k);FXS.haz=H}
  const H=FXS.haz;if(H.length&&Math.random()<dt*H.length*1.4){const k=H[(Math.random()*H.length)|0],p=tpos(k%BW,(k/BW)|0,B.tiles[k].h);spawn(K_SQ,R_EMBER,p.x+rr(-18,18),p.y+rr(-7,7),rr(-6,6),rr(-60,-24),rr(.6,1.1),1,-10,.3)}}
 FXS.amp*=Math.max(0,1-dt*9)}

/* ---- device-space pixel plotting (art grid: one art pixel = 2 board units) ---- */
let DQ=null,DOX=0,DOY=0,DS2=2,DAP=2;
function A(ax,ay,w,h){const X=Math.round(DOX+ax*DS2),Y=Math.round(DOY+ay*DS2);DQ.fillRect(X,Y,Math.round(DOX+(ax+w)*DS2)-X,Math.round(DOY+(ay+h)*DS2)-Y)}
function aLine(x0,y0,x1,y1,w){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx-dy,n=0;w=w||1;const o=w>>1;
 for(;n<200;n++){A(x0-o,y0-o,w,w);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>-dy){e-=dy;x0+=sx}if(e2<dx){e+=dx;y0+=sy}}}
function aSpr(c,ax,ay){if(c)DQ.drawImage(c,Math.round(DOX+ax*DS2),Math.round(DOY+ay*DS2),Math.round(c.width*DS2),Math.round(c.height*DS2))}
function aArc(cx,cy,R,tail,head,ramp,sq,maxTh){const Rm=FXR[ramp],lo=Math.min(tail,head),span=Math.abs(head-tail);if(span<.05)return;const fwd=head>=tail,q=DQ,c0=Rm[0],c1=Rm[Math.min(Rm.length-1,2)],c2=Rm[Math.min(Rm.length-1,4)];let last='';
 for(let j=-R;j<=R;j++){const yy=j/sq;for(let i=-R;i<=R;i++){const r=Math.sqrt(i*i+yy*yy);if(r>R+.5||r<R-maxTh-.5)continue;let a=Math.atan2(yy,i)-lo;a-=Math.floor(a/6.2832)*6.2832;if(a>span)continue;
   let f=a/span;if(!fwd)f=1-f;const th=f<.72?.6+(maxTh-.6)*(f/.72):maxTh*(1-(f-.72)/.28)+.3,d=R+.5-r;if(d>th)continue;const c=d<1.2?c0:d<2.2?c1:c2;if(c!==last){q.fillStyle=c;last=c}A(cx+i,cy+j,1,1)}}}
function aZap(x0,y0,x1,y1,seed,arch,w){const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||1,n=Math.max(3,Math.min(12,(L/6)|0)),nx=-dy/L,ny=dx/L,o=w>>1;let px_=Math.round(x0),py_=Math.round(y0);
 for(let i=1;i<=n;i++){const f=i/n,off=i<n?(fxHash(seed,i)-.5)*Math.min(16,L*.4)*(.4+Math.sin(f*Math.PI)):0,qx=Math.round(x0+dx*f+nx*off),qy=Math.round(y0+dy*f+ny*off-Math.sin(f*Math.PI)*arch);
  const hx=Math.min(px_,qx),hw=Math.abs(qx-px_)+1,vy=Math.min(py_,qy),vh=Math.abs(qy-py_)+1;
  if(fxHash(seed+7,i)<.5){A(hx-o,py_-o,hw+2*o,w);A(qx-o,vy-o,w,vh+2*o)}else{A(px_-o,vy-o,w,vh+2*o);A(hx-o,qy-o,hw+2*o,w)}
  if(w===1&&i>1&&i<n&&fxHash(seed+3,i)<.3){const bl=2+((fxHash(seed+5,i)*4)|0),s=fxHash(seed+9,i)<.5?-1:1;A(qx,qy+s,1,1);A(qx+s,qy+s*2,1,bl>3?2:1);A(qx+s*2,qy+s*3,1,1)}
  px_=qx;py_=qy}}
function fxDrawShape(o,t,dt){const q=DQ,p=Math.min(1,(t-o.t0)/o.dur),cx=Math.floor(o.x/2),cy=Math.floor(o.y/2),Rm=FXR[o.r]||FXR[0],tick=(t/45)|0;
 switch(o.ty){
  case T_SLASH:{const R=o.b||11,a0=o.a,m=o.c;
   if(m===3){const e=Math.min(1,p/.5),h=a0-1.9+2.2*e,tl=a0-1.9+2.2*Math.max(0,(p-.3)/.7);aArc(cx,cy,R,tl,h,R_STEEL,.8,1);break}             // whiff: a thin arc that passes short
   const sg=m===2?-1:m||1,e=Math.min(1,p/.42),ee=1-(1-e)*(1-e),h=a0+sg*(-1.35+2.7*ee),tl=a0+sg*(-1.35+2.7*Math.max(0,(p-.28)/.72));
   aArc(cx,cy,R,tl,h,o.r,.82,p<.7?3:p<.88?2:1);if(m===2)aArc(cx,cy,R-5,tl,h,o.r,.82,1);break}
  case T_PIERCE:{const x2=Math.floor(o.x2/2),y2=Math.floor(o.y2/2),e=Math.min(1,p/.34),f=Math.max(0,(p-.34)/.66),hx=cx+(x2-cx)*e,hy=cy+(y2-cy)*e,tx=cx+(x2-cx)*f,ty=cy+(y2-cy)*f;
   q.fillStyle=PAL['0'];aLine(tx,ty+2,hx,hy+2,1);q.fillStyle=Rm[Math.min(Rm.length-1,2)];aLine(tx,ty+1,hx,hy+1,1);aLine(tx,ty-1,hx,hy-1,1);q.fillStyle=Rm[0];aLine(tx,ty,hx,hy,1);if(p<.7){q.fillStyle=Rm[0];A(Math.round(hx)-1,Math.round(hy)-2,3,5);A(Math.round(hx)-2,Math.round(hy)-1,5,3)}break}
  case T_BLUNT:{const n=o.a||8,e=1-(1-p)*(1-p);if(p<.3){q.fillStyle=Rm[0];A(cx-2,cy-1,5,3);A(cx-1,cy-2,3,5)}
   for(let i=0;i<n;i++){const a=i/n*6.283+.39,c=Math.cos(a),s=Math.sin(a)*.8,r0=3+9*e,r1=6+12*e;q.fillStyle=Rm[Math.min(Rm.length-1,(p*Rm.length)|0)];
    if(p<.75)A(Math.round(cx+c*r0)-(i&1?0:1),Math.round(cy+s*r0)-(i&1?0:1),i&1?1:2,i&1?1:2);if(p<.5)A(Math.round(cx+c*r1),Math.round(cy+s*r1),1,1)}break}
  case T_CLAW:{const sg=o.a||1,e=Math.min(1,p/.35),f=Math.max(0,(p-.4)/.6);for(let i=-1;i<=1;i++){const x0=cx+i*4-sg*5,y0=cy-7+Math.abs(i),x1=x0+sg*10,y1=y0+13;
    q.fillStyle=Rm[Math.min(Rm.length-1,2+((p*3)|0))];aLine(x0+(x1-x0)*f+1,y0+(y1-y0)*f,x0+(x1-x0)*e+1,y0+(y1-y0)*e,1);q.fillStyle=p<.55?Rm[0]:PAL.g;aLine(x0+(x1-x0)*f,y0+(y1-y0)*f,x0+(x1-x0)*e,y0+(y1-y0)*e,1)}break}
  case T_RING:{const e=1-(1-p)*(1-p),rx=o.a+(o.b-o.a)*e,ry=rx*o.c,n=Math.max(10,(rx*4.4)|0),th=o.d>1&&p<.55?2:1;q.fillStyle=Rm[Math.min(Rm.length-1,(p*Rm.length)|0)];
   for(let i=0;i<n;i++){if(p>.5&&((i+tick)&1))continue;if(p>.78&&((i+tick)&2))continue;const a=i/n*6.283;A(Math.round(cx+Math.cos(a)*rx),Math.round(cy+Math.sin(a)*ry),th,th>1&&o.c<1?1:th)}break}
  case T_BOLT:{if(p>.7&&(tick&1))break;const x2=Math.floor(o.x2/2),y2=Math.floor(o.y2/2),sd=o.seed+tick*13;q.fillStyle=Rm[Math.min(Rm.length-1,4)];aZap(cx,cy,x2,y2,sd,o.a,3);q.fillStyle=Rm[0];aZap(cx,cy,x2,y2,sd,o.a,1);
   if(p<.5){q.fillStyle=Rm[0];A(x2-1,y2-2,3,5);A(x2-2,y2-1,5,3)}break}
  case T_BEAM:{const x2=Math.floor(o.x2/2),y2=Math.floor(o.y2/2);
   if(p<.12){q.fillStyle=Rm[2];aLine(cx,cy,x2,y2,1)}
   else if(p<.62){q.fillStyle=Rm[Rm.length-1];aLine(cx,cy,x2,y2,p<.4?5:3);q.fillStyle=Rm[2];aLine(cx,cy,x2,y2,3);q.fillStyle=Rm[0];aLine(cx,cy,x2,y2,1);q.fillStyle=Rm[0];A(x2-2,y2-2,5,5);
    if(!reduced){const f=Math.random();spawn(K_SQ,o.r,o.x+(o.x2-o.x)*f,o.y+(o.y2-o.y)*f,rr(-30,30),rr(-50,10),rr(.2,.4),1,0,2)}}
   else{const dx=x2-cx,dy=y2-cy,n=Math.max(4,(Math.hypot(dx,dy)/2)|0);q.fillStyle=Rm[p<.8?2:4];for(let i=0;i<n;i++){if((i+tick)&(p<.8?1:3))continue;A(Math.round(cx+dx*i/n),Math.round(cy+dy*i/n),2,1)}}break}
  case T_PROJ:{const kind=o.a,dx=o.x2-o.x,dy=o.y2-o.y;let x=o.x+dx*p,y=o.y+dy*p,vx=dx,vy=dy;const arc=kind===0||kind===2||kind===5||kind===6?o.b:0;if(arc){y-=Math.sin(p*Math.PI)*arc;vy-=Math.cos(p*Math.PI)*arc*Math.PI}
   const L=Math.hypot(vx,vy)||1,ux=vx/L,uy=vy/L;let ax=Math.floor(x/2),ay=Math.floor(y/2);o.acc+=dt;
   if(kind===0){const tx=ax-ux*7,ty=ay-uy*7;q.fillStyle=PAL['0'];aLine(tx,ty+1,ax,ay+1,1);q.fillStyle=PAL.k;aLine(tx,ty,ax,ay,1);q.fillStyle=PAL.l;A(Math.round(tx),Math.round(ty),1,1);A(Math.round(tx+ux),Math.round(ty+uy),1,1);q.fillStyle=PAL.r;A(ax,ay,1,1);q.fillStyle=PAL.q;A(Math.round(ax-ux),Math.round(ay-uy),1,1);
    if(o.r>=0&&!reduced)while(o.acc>.012){o.acc-=.012;spawn(o.r===R_WHITE?K_STREAK:K_SQ,o.r,x-ux*8+rr(-2,2),y-uy*8+rr(-2,2),o.r===R_WHITE?-ux*60:rr(-14,14),o.r===R_WHITE?-uy*60:rr(-40,-6),rr(.14,.3),Math.random()<.4?2:1,0,1)}}
   else if(kind===6||kind===7)fxDrawShot(o,kind,x,y,ax,ay,ux,uy,p,tick);
   else{const wob=kind===1?Math.sin(p*20+o.seed)*2:kind===3?(((p*9+o.seed)%2)<1?-3:3):kind===4?Math.sin(p*9+o.seed)*3:0;ax+=Math.round(-uy*wob);ay+=Math.round(ux*wob);
    const id=kind===1?(tick&1?'orb0':'orb1'):kind===2?(tick&1?'fire0':'fire1'):kind===3?(tick&1?'hex0':'hex1'):'skull',c=kind===5&&o.s?o.s[tick&1]:fxSpr(id);
    if(kind===4&&c){q.fillStyle=PAL.D;A(ax-3,ay-3,7,7);q.fillStyle=PAL.C;A(ax-3,ay-4,7,1);A(ax-4,ay-3,1,7);A(ax+4,ay-3,1,7)}
    if(c)aSpr(c,ax-(c.width>>1),ay-(c.height>>1));
    if(!reduced){const rate=kind===2?.004:.008;while(o.acc>rate){o.acc-=rate;const w2=kind===2?3:2;spawn(K_SQ,kind===2&&Math.random()<.25?R_SMOKE:o.r,x-ux*6+rr(-w2,w2)*2,y-uy*6+rr(-w2,w2)*2,-ux*30+rr(-16,16),-uy*30+rr(-16,16)-(kind===2?30:kind===4?24:0),rr(.2,.42),kind===2&&Math.random()<.5?2:1,0,1.5)}}}
   if(p>=1){if(kind===0&&o.c){puff(o.x2,o.y2,3)}else if(kind===2&&o.c)glowFx(o.x2,o.y2,50,'E',.6,200)}break}
  case T_CRES:{const dx=o.x2-o.x,dy=o.y2-o.y,x=o.x+dx*p,y=o.y+dy*p,ax=Math.floor(x/2),ay=Math.floor(y/2),a0=o.a;
   for(let j=2;j>=0;j--){const bx=ax-Math.round(Math.cos(a0)*j*4),by=ay-Math.round(Math.sin(a0)*j*4);if(j===0){aArc(bx-Math.round(Math.cos(a0)*8),by-Math.round(Math.sin(a0)*8),10,a0-1.15,a0+1.15,o.r,1,3);aArc(bx-Math.round(Math.cos(a0)*8),by-Math.round(Math.sin(a0)*8),10,a0+1.15,a0-1.15,o.r,1,3)}
    else{q.fillStyle=Rm[Math.min(Rm.length-1,2+j)];const R=10-j;for(let i=-5;i<=5;i++){if((i+tick+j)&1)continue;const a=a0+i*.2;A(Math.round(bx-Math.cos(a0)*8+Math.cos(a)*R),Math.round(by-Math.sin(a0)*8+Math.sin(a)*R),1,1)}}}
   o.acc+=dt;if(!reduced)while(o.acc>.01){o.acc-=.01;spawn(K_SQ,o.r,x+rr(-8,8),y+rr(-10,10),-dx*.25+rr(-10,10),-dy*.25+rr(-30,0),rr(.18,.36),Math.random()<.3?2:1,0,2);if(Math.random()<.4)spawn(K_SQ,R_DUST,x+rr(-6,6),y+26,rr(-16,16),rr(-30,-8),rr(.2,.4),1,40,2)}break}
  case T_CRACK:{const g1=Math.min(1,p/.1);for(let i=0;i<6;i++){const a=i*1.047+fxHash(o.seed,i)*.8,Ln=(9+fxHash(o.seed,i+9)*9)*g1;let x=cx,y=cy,dir=a;
    for(let s=0;s<Ln;s++){if(p>.7&&((s+i+tick)&1))continue;if(p>.88&&((s+tick)&2))continue;if(s%3===0)dir=a+(fxHash(o.seed+s,i)-.5)*1.5;x+=Math.cos(dir);y+=Math.sin(dir)*.5;const X=Math.round(x),Y=Math.round(y);
     q.fillStyle=PAL['0'];A(X,Y,s<3?2:1,1);if(o.a&&p<.4&&s<Ln*(1-p*2)){q.fillStyle=PAL[(tick+s)&1?'y':'e'];A(X,Y-1,1,1)}}}break}
  case T_STARS:{const u=o.u,v=o.s;if(!u||!u.alive||(p>.05&&!(u.st&&u.st.stun))){o.on=false;if(v)v.stars=false;o.u=null;o.s=null;break}const b=fxUB(u),hx=Math.floor(b.x/2),hy=Math.floor((b.y-b.h)/2)+1,s1=fxSpr('star1');
   for(let pass=0;pass<2;pass++)for(let i=0;i<3;i++){const a=t*.0075+i*2.094,sn=Math.sin(a),X=hx+Math.round(Math.cos(a)*8),Y=hy+Math.round(sn*3);if(pass===0&&sn<0){q.fillStyle=PAL.c;A(X,Y,1,1)}else if(pass===1&&sn>=0)aSpr(s1,X-1,Y-1)}break}
  case T_GLYPH:{let x=o.x,y=o.y;if(o.c||o.d){const tt=(t-o.t0)/1000;x+=o.c*tt;y+=o.d*tt+260*tt*tt}const c=fxSpr(o.s);if(!c)break;if(p>.72&&(tick&1))break;const e=1-(1-p)*(1-p);
   aSpr(c,Math.floor(x/2)-(c.width>>1),Math.floor(y/2)-(c.height>>1)-Math.round(o.b*e/2));break}
  case T_GHOST:{let cv=o.cv,ax=o.a,ay=o.b,x=o.x,y=o.y;const u=o.u;
   if(u){if(!u.alive){o.on=false;o.u=null;break}const S=fxUnitSpr(u);if(!S)break;cv=S.cv;ax=S.ax;ay=S.ay;const b=fxUB(u);x=b.x;y=b.y;if(tick&1)break}
   if(cv){const sil=fxSil(cv,o.s||'y');if(!sil)break;q.globalAlpha=u?.6:p<.34?.55:p<.67?.34:.17;aSpr(sil,Math.floor(x/2)-ax,Math.floor(y/2)-ay);q.globalAlpha=1}
   else if(!u){const h=(o.a||58)>>1;q.fillStyle=PAL[p<.5?'y':'Y'];for(let j=0;j<h;j+=2){if(p>.5&&(j&2))continue;A(Math.floor(x/2)-4,Math.floor(y/2)-j-1,8,1)}}break}
  case T_RET:{const hold=o.a/o.dur,e=Math.min(1,p/Math.max(.05,hold*.8)),d=Math.round(15-9*(1-(1-e)*(1-e)));if(p>hold&&(tick&1))break;
   for(let i=0;i<4;i++){const sx=i&1?1:-1,sy=i&2?1:-1,X=cx+sx*d,Y=cy+sy*d;q.fillStyle=PAL['0'];A(Math.min(X,X-sx*3)-1,Y-1,6,3);A(X-1,Math.min(Y,Y-sy*3)-1,3,6);q.fillStyle=PAL[e>=1?'h':'e'];A(Math.min(X,X-sx*3),Y,4,1);A(X,Math.min(Y,Y-sy*3),1,4)}
   if(e>=1){q.fillStyle=PAL.h;A(cx,cy,1,1)}break}
  case T_PIN:{if(p>.8&&(tick&1))break;const sg=o.a||1,wob=p<.16?Math.round(Math.sin(p*80)*1.5):0,x1=cx-sg*5+wob,y1=cy-11;q.fillStyle=PAL['0'];aLine(cx+1,cy,x1+1,y1,1);q.fillStyle=PAL.k;aLine(cx,cy-1,x1,y1,1);q.fillStyle=PAL.l;A(x1-1,y1,1,1);A(x1+1,y1,1,1);A(x1,y1-1,1,2);
   q.fillStyle=PAL.i;A(cx-2,cy,5,1);break}
  case T_ROOT:{const u=o.u,v=o.s;if(!u||!u.alive||(p>.03&&!((u.st&&u.st.root)||u.rooted))){o.on=false;if(v)v.rootFx=false;o.u=null;o.s=null;break}const b=fxUB(u),fx=Math.floor(b.x/2),fy=Math.floor(b.y/2),gr=Math.min(1,(t-o.t0)/180);
   for(let i=0;i<7;i++){const a=.35+i*.42,X=fx+Math.round(Math.cos(a)*9),Y=fy+Math.round(Math.sin(a)*4),hh=Math.round((3+fxHash(o.seed,i)*4)*gr),sg=i<3?-1:1;
    q.fillStyle=PAL['0'];A(X-1,Y-hh-1,3,hh+2);q.fillStyle=PAL.j;A(X,Y-hh,1,hh);q.fillStyle=PAL.k;A(X,Y-hh,1,1);if(hh>3){q.fillStyle=PAL.B;A(X+sg,Y-hh+1,1,1);q.fillStyle=PAL.A;A(X-sg,Y-hh+2,1,1)}}break}
  case T_EMIT:{let x=o.x,y=o.y,h=58;const u=o.u,k=o.a;if(u){if(!u.alive&&k!==0){o.on=false;o.u=null;break}const b=fxUB(u);x=b.x;y=b.y;h=b.h}o.acc+=dt*o.b;if(reduced)o.acc*=.3;
   while(o.acc>=1){o.acc-=1;
    if(k===0)spawn(K_SQ,o.r,x+rr(-10,10),y-rr(0,h*.7),rr(-8,8),rr(-90,-40),rr(.3,.6),Math.random()<.35?2:1,-30,1);
    else if(k===1){const a=Math.random()*6.283,r=rr(14,24);spawn(K_SQ,o.r,x+Math.cos(a)*r,y+Math.sin(a)*r,-Math.cos(a)*r*7,-Math.sin(a)*r*7,.13,1,0,0)}
    else if(k===2)spawn(K_SQ,o.r,x+rr(-10,10),y+rr(-10,10),rr(-20,20),rr(-110,-40),rr(.25,.5),Math.random()<.5?2:1,-40,1.5);
    else if(k===3){spawn(Math.random()<.45?K_PLUS:K_SQ,o.r,x+rr(-13,13),y-rr(0,h*.5),0,rr(-80,-40),rr(.45,.8),1,0,.4)}
    else if(k===4){spawn(K_STREAK,o.r,x+rr(-10,10),y-rr(0,h),-o.x*1.6+rr(-20,20),-o.y*1.6+rr(-10,30),rr(.2,.34),1,0,2)}}break}
  case T_GLOW:break;
  case T_BARS:{const u=o.u;if(!u||!u.alive){o.on=false;o.u=null;break}const b=fxUP(u),fx=Math.floor(b.x/2),fy=Math.floor(b.y/2),up=Math.min(1,p/.16),dn=Math.max(0,(p-.74)/.26);
   for(let i=0;i<7;i++){const a=.2+i*.455,X=fx+Math.round(Math.cos(a)*11),Y=fy+Math.round(Math.sin(a)*5)+1,st=Math.max(0,Math.min(1,up*1.6-i*.08)),hh=Math.round((9+(i===3?3:i===2||i===4?2:0))*st*(1-dn));if(hh<1)continue;
    q.fillStyle=PAL['0'];A(X-2,Y-hh-1,4,hh+2);q.fillStyle=PAL.q;A(X-1,Y-hh,1,hh);q.fillStyle=PAL.p;A(X,Y-hh,1,hh);q.fillStyle=p<.3?PAL.r:PAL.q;A(X-1,Y-hh,2,1);q.fillStyle=PAL.o;A(X-1,Y-1,2,1)}break}
  case T_SMOKE:fxDrawSmoke(o,t,p,cx,cy);break;
  default:fxDrawShapeX(o,t,dt,p,cx,cy,Rm,tick);break;
  case T_COL:{const h=(o.a>>1)+2,w=o.b?Math.round(1+7*p):Math.round(8*(1-p)),e=o.b?p:1-p;if(w<1)break;q.fillStyle=Rm[Math.min(Rm.length-1,((1-e)*3)|0)];
   for(let j=0;j<h;j++){if(o.b&&p>.5&&((j+tick)&1))continue;const ww=Math.max(1,Math.round(w*(.6+.4*fxHash(o.seed+tick,j))));A(cx-(ww>>1),cy-j,ww,1)}
   q.fillStyle=Rm[0];A(cx,cy-h,1,h);break}}}

/* ---- draw: glows (board space), then particles, shapes and floating numbers in device pixels ---- */
function fxDraw(dt,ctx){const q=ctx||g;if(!q||!B)return;if(FXS.scanT!==now)fxScan(dt||0);const t=now,m=q.getTransform(),s=m.a||1;DQ=q;DOX=m.e;DOY=m.f;DS2=2*s;DAP=Math.max(1,Math.round(DS2));
 let any=false;for(let i=0;i<FXO.length;i++){const o=FXO[i];if(!o.on||o.ty!==T_GLOW)continue;if(t>=o.t0+o.dur){o.on=false;continue}if(t<o.t0)continue;
  if(!any){any=true;q.globalCompositeOperation='lighter'}const a=1-(t-o.t0)/o.dur;q.globalAlpha=o.c*a;q.drawImage(fxGlowSpr(o.s),o.x-o.a,o.y-o.a*.7,o.a*2,o.a*1.4)}
 if(any){q.globalCompositeOperation='source-over';q.globalAlpha=1}
 const sm=q.imageSmoothingEnabled;q.imageSmoothingEnabled=false;q.setTransform(1,0,0,1,0,0);q.globalAlpha=1;
 // particles
 let i=0;while(i<pN){if(pW[i]>0){pW[i]-=dt;i++;continue}pL[i]-=dt;
  if(pL[i]<=0){const j=--pN;if(i!==j){pK[i]=pK[j];pC[i]=pC[j];pX[i]=pX[j];pY[i]=pY[j];pVX[i]=pVX[j];pVY[i]=pVY[j];pL[i]=pL[j];pM[i]=pM[j];pS[i]=pS[j];pG[i]=pG[j];pD[i]=pD[j];pW[i]=pW[j]}continue}
  const dr=Math.max(0,1-pD[i]*dt);pVX[i]*=dr;pVY[i]=pVY[i]*dr+pG[i]*dt;pX[i]+=pVX[i]*dt;pY[i]+=pVY[i]*dt;
  const a=pL[i]/pM[i],Rm=FXR[pC[i]],ci=((1-a)*Rm.length)|0,k=pK[i],sz=pS[i]>1&&a<.35?1:pS[i],ax=Math.floor(pX[i]/2),ay=Math.floor(pY[i]/2);q.fillStyle=Rm[ci<Rm.length?ci:Rm.length-1];
  if(k===K_SQ)A(ax,ay,sz,sz);
  else if(k===K_TRAIL||k===K_STREAK){A(ax,ay,sz,sz);const vx=pVX[i],vy=pVY[i],L=Math.hypot(vx,vy);if(L>30){const st=k===K_STREAK,n=st?(a>.5?7:a>.25?5:3):L>200?3:2,ux=vx/L,uy=vy/L;if(st){for(let j=1;j<=n;j++){if(j===3)q.fillStyle=Rm[ci+2<Rm.length?ci+2:Rm.length-1];A(Math.round(ax-ux*j),Math.round(ay-uy*j),1,1)}}else{q.fillStyle=Rm[ci+2<Rm.length?ci+2:Rm.length-1];for(let j=1;j<=n;j++)A(Math.round(ax-ux*j*1.6),Math.round(ay-uy*j*1.6),1,1)}}}
  else{A(ax-1,ay,3,1);A(ax,ay-1,1,3);q.fillStyle=Rm[0];A(ax,ay,1,1)}
  i++}
 // shapes
 for(i=0;i<FXO.length;i++){const o=FXO[i];if(!o.on||o.ty===T_GLOW||t<o.t0)continue;fxDrawShape(o,t,dt);if(o.on&&t>=o.t0+o.dur){o.on=false;o.u=null;o.cv=null;if(o.ty===T_STARS||o.ty===T_ROOT){if(o.s){o.s.stars=false;o.s.rootFx=false}}else if(o.ty===T_WEB||o.ty===T_WARD||o.ty===T_SWIRL){if(o.s){o.s.web=false;o.s.ward=false;o.s.swirl=false}}o.s=null}}
 // floating numbers: pop, hold, drift, then a stepped fade
 const ap=DAP;for(i=0;i<FLT.length;i++){const f=FLT[i];if(!f.on)continue;const a=(t-f.t0)/(SPEEDF<1?640:950);if(a<0)continue;if(a>=1){f.on=false;f.u=null;continue}
  const pop=reduced?0:a<.09?-a/.09*7:a<.2?-7+(a-.09)/.11*3:-4,rise=a>.2?(a-.2)*14:0,w=fxTextW(f.str);
  q.globalAlpha=a<.72?1:a<.86?.66:.33;fxText(q,f.str,Math.round(DOX+(Math.floor(f.x/2)-(w>>1))*DS2),Math.round(DOY+(Math.floor(f.y/2)+Math.round(pop-rise))*DS2),f.sty,ap)}
 q.globalAlpha=1;q.setTransform(m);q.imageSmoothingEnabled=sm}

/* ---- ambient motes (screen space, per biome): single art pixels, palette colours ---- */
const MOTES={n:34,kind:'',x:new Float32Array(34),y:new Float32Array(34),v:new Float32Array(34),p:new Float32Array(34)};
const AMB={plains:['drift','e'],forest:['fly','A'],hills:['drift','l'],swamp:['fly','A'],desert:['sand','d'],snow:['snow','r'],ashen:['ember','E'],hollow:['rise','C'],glass:['glint','F'],title:['ember','c']};
function fxAmbient(kind,dt,ctx){if(reduced)return;const q=ctx||g;if(!q)return;const A2=AMB[kind]||AMB.plains,M=MOTES,mo=A2[0],t=now/1000,m=q.getTransform(),W=q.canvas.width,H=q.canvas.height,
  ap=typeof artScale==='function'?Math.max(1,artScale()|0):Math.max(2,Math.round((m.a||1)*2)),k=m.a||1;
 if(M.kind!==kind+W){M.kind=kind+W;for(let i=0;i<M.n;i++){M.x[i]=Math.random()*W;M.y[i]=Math.random()*H;M.v[i]=rr(.5,1);M.p[i]=Math.random()*6.283}}
 q.setTransform(1,0,0,1,0,0);q.fillStyle=PAL[A2[1]];
 for(let i=0;i<M.n;i++){const v=M.v[i],ph=M.p[i];let a=1,w=1;
  if(mo==='drift'){M.x[i]+=v*12*dt*k;M.y[i]+=Math.sin(t*.7+ph)*4*dt*k;a=.2+.25*Math.sin(t*1.3+ph)}
  else if(mo==='fly'){M.x[i]+=Math.cos(t*.6*v+ph)*16*dt*k;M.y[i]+=Math.sin(t*.9*v+ph*2)*12*dt*k;a=Math.sin(t*1.7*v+ph)*.8}
  else if(mo==='sand'){M.x[i]+=v*150*dt*k;M.y[i]+=(10+Math.sin(t+ph)*8)*dt*k;a=.35;w=3}
  else if(mo==='snow'){M.y[i]+=v*34*dt*k;M.x[i]+=(Math.sin(t*.8+ph)*14+6)*dt*k;a=.4+.4*v}
  else if(mo==='ember'){M.y[i]-=v*30*dt*k;M.x[i]+=Math.sin(t*1.4+ph)*12*dt*k;a=.35+.4*Math.sin(t*6*v+ph)}
  else if(mo==='rise'){M.y[i]-=v*10*dt*k;M.x[i]+=Math.sin(t*.5+ph)*5*dt*k;a=.25+.35*Math.sin(t*1.1+ph)}
  else a=Math.pow(Math.max(0,Math.sin(t*.9*v+ph)),6);
  if(M.x[i]>W+10)M.x[i]=-8;else if(M.x[i]<-10)M.x[i]=W+8;if(M.y[i]>H+10)M.y[i]=-8;else if(M.y[i]<-10)M.y[i]=H+8;
  if(a<=.12)continue;q.globalAlpha=a>.5?.9:.45;const X=Math.floor(M.x[i]/ap)*ap,Y=Math.floor(M.y[i]/ap)*ap;q.fillRect(X,Y,ap*w,ap);if(mo==='glint'&&a>.5){q.fillRect(X-ap,Y,ap*3,ap);q.fillRect(X,Y-ap,ap,ap*3)}}
 q.globalAlpha=1;q.setTransform(m)}

/* ================= arms: weapon swap and the ranged lock =================
   fxSwap(u,dur)     called by the animation controller the moment a unit's weapon in hand changes (74-anim.js anSwapPoll):
                     a sheathing glint at the old weapon's place, a whip of steel as the other comes out, the swap glyph overhead.
   fxLockPop(u,force) a small crossed-arrows pop over an archer whose bow is pinned by an adjacent foe: once per unit per round
                     (force: the player just tried to shoot). fxLockScan() watches for archers that become locked. */
function fxSwap(u,dur){if(typeof document==='undefined'||!(SPEEDF>0)||!B||typeof now!=='number'||!u)return;const p=fxUB(u),x=p.x,y=p.y,h=p.h,sp=Math.max(.6,fxSp()),d=dur||420;
 const side=fxSDir(anOf(u).dc,anOf(u).dr)===0||fxSDir(anOf(u).dc,anOf(u).dr)===3?1:-1;
 glyphFx('glint:rd',x-side*8,y-h*.32,0,150,0);for(let i=0;i<fxN(5);i++)spawn(K_SQ,R_SPARK,x-side*8+rr(-2,2),y-h*.32,rr(-30,30),rr(-60,-10),rr(.15,.3),1,200,1,0);
 {const o=fxo(T_SLASH,x+side*4,y-h*.55,d*.4,180*sp,R_STEEL);o.a=-Math.PI/2+side*.6;o.b=11;o.c=side}
 glyphFx('glint',x+side*10,y-h*.7,0,160,d*.62);
 glyphFx('ic:swap',x,y-h-14,10,620*sp,d*.25,null);ringFx(x,y,3,12,240*sp,R_GOLD,d*.5,.5)}
const FXLK=new WeakMap(),FXLKS=new WeakMap();
function fxLockPop(u,force){if(typeof document==='undefined'||!(SPEEDF>0)||!B||typeof now!=='number'||!u||!u.alive)return;const r=B.round|0,v=FXLK.get(u);if(!force&&v===r)return;if(force&&v===r&&FXS.lkT&&now-FXS.lkT<700)return;FXLK.set(u,r);FXS.lkT=now;
 const p=fxUB(u),x=p.x,y=p.y,h=p.h,sp=Math.max(.6,fxSp());const g=glyphFx('ic:ranged-lock',x,y-h-12,8,760*sp,0,null);
 ringFx(x,y-h*.5,3,14,260*sp,R_RED,0,1);for(let i=0;i<fxN(8);i++){const a=i/8*6.283;spawn(K_STREAK,R_RED,x+Math.cos(a)*6,y-h-12+Math.sin(a)*6,Math.cos(a)*140,Math.sin(a)*140,.18,1,0,3)}
 if(u.side===0)fxFloat(u,'LOCKED',FS_HP,60)}
function fxLockScan(){if(typeof shLocked!=='function'||!B||!B.units)return;const rv=typeof SHV==='object'?SHV.rev:0;if(FXS.lkRev===rv&&FXS.lkB===B)return;FXS.lkRev=rv;FXS.lkB=B;
 for(const u of B.units){if(!u.alive||u.gone)continue;let lk=false;try{lk=shLocked(u)}catch(e){}const was=!!FXLKS.get(u);FXLKS.set(u,lk);if(lk&&!was&&B.cur&&(B.cur.side!==u.side||B.cur===u))fxLockPop(u,false)}}

/* ================= talent abilities: one choreography per new ability =================
   FX_ID pins an AB id to a key; FX_HINT2 turns an unknown ability's fx hint (plus whether it shoots a bow) into one, so a
   future ability with the same hint animates in kind. Keys: the gift arrows (aura, elemental, mana-guided, chi), the bow
   craft (volley, double shot, headshot, through-shots, crippling shot, mark), and the melee / support arts. */
const S_N0=40,S_AARW=40,S_SUN=41,S_CONC=42,S_SEEK=43,S_ARCV=44,S_BIND=45,S_STARP=46,S_SPIRIT=47,S_PRESS=48,S_VOLLEY=49,S_QUAKE=50,S_PALM=51,S_STORM=52,S_RUNE=53,S_DECAP=54,S_KICK=55,S_MULTI=56,S_STAR=57,S_SHATTER=58;
const FX_ID={aarrow:'aarrow',carrow:'carrow',sunarrow:'sunarrow',pvolley:'pvolley',farrow:'farrow',iarrow:'iarrow',tarrow:'tarrow',tempest:'tempest',seeker:'seeker',avolley:'avolley',
 bindshot:'bindshot',starpierce:'starpierce',spiritarrow:'spirit',pparrow:'pparrow',volley:'volley',doubleshot:'dshot',headshot:'headshot',pshot:'pshot',cripple:'cripple',mark:'mark',breath:'breath',
 flurry:'multi',hundred:'multi',fistflurry:'multi',earthsplit:'quake',staffquake:'quake',palm:'palm',shatter:'palm',overload:'overload',dragon:'dragon',runeedge:'runeedge',blinkstrike:'blinkstr',
 manashield:'manashield',starfall:'starfall',avatar:'avatar',rage:'rage',decap:'decap',axeexec:'decap',kick:'kick',dragonkick:'dkick',lotus:'lotus',surge:'surge',secwind:'secwind',
 bandage:'bandage',triage:'bandage',tumble:'tumble',vault:'tumble',vanish:'vanish',bastion:'bastion',phalanx:'phalanx',parry:'parry',masterstroke:'master',bladedance:'round',whirl:'round',cleave:'round'};
const FX_BOWAB=ab=>ab.needs==='bow'||(ab.wpn&&B&&B.cur&&B.cur.wpn&&B.cur.wpn.wt==='bow');
const FX_HINT2={swap:()=>'swapk',volley:()=>'volley',leap:()=>'tumble',multi:()=>'multi',quake:()=>'quake',heal:ab=>ab.party?'lotus':'bandage',mark:()=>'mark',rage:()=>'rage',
 pierce:ab=>FX_BOWAB(ab)?'pshot':'stab',storm:ab=>FX_BOWAB(ab)?'tarrow':'overload',aura:ab=>ab.tgt==='self'?'avatar':FX_BOWAB(ab)?'aarrow':null,flame:ab=>FX_BOWAB(ab)?'farrow':null,
 frost:ab=>FX_BOWAB(ab)?'iarrow':null,chi:ab=>ab.tgt==='self'?'breath':FX_BOWAB(ab)?'spirit':'palm',arcane:ab=>ab.tgt==='self'?'manashield':ab.magic?'starfall':FX_BOWAB(ab)?'seeker':ab.dash?'blinkstr':'runeedge'};
const FXG2={rune:['.xFx.','xF.Fx','F.r.F','xF.Fx','.xFx.'],petal:['.eA.','eAAB','.AB.'],boot:['.kk..','.kj..','.kj..','.kjjj','.iiii'],ret:['..h..','.h.h.','h.g.h','.h.h.','..h..'],
 cross:['..r..','.rrr.','rrrrr','.rrr.','..r..'],xarr:['q...q','.k.k.','..k..','.k.k.','h...h']};
for(const k in FXG2)FXG[k]=FXG2[k];
function fxPrev(t,k){return k>0&&FXS.clast&&FXS.clast!==t?FXS.clast:null}
// an arrow with an elemental trail and a glint riding its head; returns ms to impact
function fxGArrow(ax,ay,bx,by,L,ss,sp,ramp,arc,speed,delay){const fly=Math.max(60,L/(speed||1.15))*ss,o=fxArrow(ax,ay,bx,by,fly,arc==null?Math.min(28,L*.13):arc,ramp,delay);return{o,at:delay+fly}}
function fxStrikeN(u,t,id,k,miss,sp,ss,ax,ay,bx,by,L,d,ux,uy,fx1,fy1,bh){let o,r,ld,at;const prev=fxPrev(t,k),D=40*sp;
 const from=()=>{if(!prev)return null;const s=fxUP(prev);return{x:s.x,y:s.y-s.h*.48}};
 const splash=(sty)=>{FXS.sty=sty;return Math.max(30*sp,FXS.cAt-now+40*sp)};
 switch(id){
  case'aarrow':case'carrow':{glowFx(ax,ay,30,'y',.5,120,0);r=fxGArrow(ax,ay,bx,by,L,ss,sp,R_AURA,null,1.4,D);r.o.c=miss?1:0;FXS.sty=id==='carrow'?S_CONC:S_AARW;return r.at}
  case'sunarrow':if(k>0)return splash(S_AURA);r=fxGArrow(ax,ay,bx,by,L,ss,sp,R_AURA,Math.min(40,L*.2),1,D);r.o.c=miss?1:0;glowFx(ax,ay,40,'y',.6,160,0);FXS.cAt=now+r.at;FXS.sty=S_SUN;return r.at;
  case'pvolley':case'pshot':{const R2=id==='pvolley'?R_AURA:R_WHITE,f=from();if(f){const fl=Math.max(40,Math.hypot(bx-f.x,by-f.y)/1.8)*ss,dl=Math.max(20*sp,FXS.cAt-now);o=fxArrow(f.x,f.y,bx,by,fl,2,R2,dl);FXS.cAt=now+dl+fl;FXS.clast=t;FXS.sty=S_AARW;return dl+fl}
   r=fxGArrow(ax,ay,bx,by,L,ss,sp,R2,4,1.8,D);r.o.c=miss?1:0;FXS.cAt=now+r.at;FXS.clast=t;FXS.sty=id==='pshot'?S_PUNC:S_AARW;return r.at}
  case'farrow':r=fxGArrow(ax,ay,bx,by,L,ss,sp,R_FIRE,null,1.1,D);r.o.c=miss?1:0;emitFx(2,null,ax,ay,60,D,0,R_FIRE);FXS.sty=S_FIRE;return r.at;
  case'iarrow':r=fxGArrow(ax,ay,bx,by,L,ss,sp,R_ICE,null,1.2,D);r.o.c=miss?1:0;burst(K_SQ,R_ICE,ax,ay,6,20,60,.3,1,0,2);FXS.sty=S_FROST;return r.at;
  case'tarrow':{if(prev){const f=from(),dl=Math.max(40*sp,FXS.cAt-now+30*sp);o=fxo(T_BOLT,f.x,f.y,dl,230*ss,R_QI);o.x2=bx;o.y2=by;o.a=8;FXS.clast=t;FXS.cAt=now+dl+50*sp;FXS.sty=S_ZAP;return dl+50*sp}
   r=fxGArrow(ax,ay,bx,by,L,ss,sp,R_QI,6,1.6,D);r.o.c=miss?1:0;o=fxo(T_BOLT,ax,ay,r.at-60*sp,200*ss,R_QI);o.x2=bx;o.y2=by;o.a=3;FXS.clast=t;FXS.cAt=now+r.at;FXS.sty=S_THUN;return r.at}
  case'tempest':{if(k>0)return splash(S_STORM);const n=5;at=0;for(let i=0;i<n;i++){const ox=rr(-26,26),oy=rr(-10,10),q=fxGArrow(ax+rr(-6,6),ay,bx+ox,by+oy,L,ss,sp,i&1?R_ICE:R_FIRE,Math.min(60,L*.3)+i*4,1,D+i*45*sp);if(i===0){q.o.c=miss?1:0;at=q.at}}
   FXS.cAt=now+at+90*sp;FXS.sty=S_STORM;return at+90*sp}
  case'seeker':{r=fxGArrow(ax,ay,bx,by,L,ss,sp,R_MANA,Math.min(56,24+L*.18),.9,D);o=fxo(T_PROJ,ax,ay-4,D,r.at-D,R_MANA);o.x2=bx;o.y2=by;o.a=5;o.b=Math.min(56,24+L*.18)+6;o.s=fxOrb(R_MANA);FXS.sty=S_SEEK;return r.at}
  case'avolley':{if(prev||k>0){const s0=FXS.clast||t,a0=fxUP(s0),dl=Math.max(30*sp,FXS.cAt-now);o=fxo(T_PROJ,a0.x,a0.y-a0.h*.48,dl,140*ss,R_MANA);o.x2=bx;o.y2=by;o.a=5;o.b=10;o.s=fxOrb(R_MANA);FXS.sty=S_ARCV;return dl+140*ss}
   r=fxGArrow(ax,ay,bx,by,L,ss,sp,R_MANA,null,1.2,D);r.o.c=miss?1:0;FXS.clast=t;FXS.cAt=now+r.at;FXS.sty=S_ARCV;return r.at}
  case'bindshot':r=fxGArrow(ax,ay,bx,by,L,ss,sp,R_MANA,null,1.2,D);r.o.c=miss?1:0;FXS.sty=S_BIND;return r.at;
  case'starpierce':{if(prev){FXS.sty=S_STARP;return Math.max(20*sp,FXS.cAt-now+(k*30)*sp)}const ex=bx+ux*90,ey=by+uy*90;o=fxo(T_BEAM,ax,ay,90*sp,340*ss,R_ICE);o.x2=ex;o.y2=ey;glowFx(ax,ay,46,'F',.7,200,0);emitFx(1,null,ax,ay,80,90*sp,0,R_MANA);FXS.cAt=now+110*sp;FXS.clast=t;FXS.sty=S_STARP;return 110*sp}
  case'spirit':{r=fxGArrow(ax,ay,bx,by,L,ss,sp,R_CHI,4,1.5,D);r.o.c=miss?1:0;for(let i=0;i<fxN(8);i++)spawn(K_STREAK,i&1?R_WHITE:R_CHI,ax,ay,ux*rr(260,380),uy*rr(260,380),.2,1,0,1,(D/1000)+i*.012);FXS.sty=S_SPIRIT;return r.at}
  case'pparrow':r=fxGArrow(ax,ay,bx,by,L,ss,sp,R_CHI,6,1.7,D);r.o.c=miss?1:0;FXS.sty=S_PRESS;return r.at;
  case'volley':{if(k>0)return splash(S_VOLLEY);at=0;for(let i=0;i<3;i++){const q=fxGArrow(ax+(i-1)*5,ay,bx+(i-1)*rr(8,16),by+rr(-6,6),L,ss,sp,-1,Math.min(80,30+L*.3),.9,D+i*60*sp);if(i===1){q.o.c=miss?1:0;at=q.at}}FXS.cAt=now+at;FXS.sty=S_VOLLEY;return at}
  case'dshot':{const sg=k&1?1:-1;r=fxGArrow(ax,ay+sg*3,bx,by+sg*3,L,ss,sp,R_WHITE,6,2,20*sp);r.o.c=miss?1:0;FXS.sty=S_ARROW;return r.at}
  case'headshot':{const hy=fy1-bh*.86,dl=170*sp;o=fxo(T_RET,bx,hy,0,dl+260,0);o.a=dl+120;r=fxGArrow(ax,ay,bx,miss?by:hy,L,ss,sp,R_WHITE,2,1.9,dl);r.o.c=miss?1:0;FXS.sty=S_AIMED;return r.at}
  case'cripple':{const ly=fy1-bh*.18;r=fxGArrow(ax,ay,bx,miss?by:ly,L,ss,sp,-1,Math.min(20,L*.1),1.3,D);r.o.c=miss?1:0;FXS.sty=S_PIN;return r.at}
  case'multi':{const R2=FXS.cab&&FXS.cab.cost&&FXS.cab.cost[0]==='chi'?R_CHI:R_WHITE;ld=fxMelee(u,t,R2,fxWpnKind(u)===S_BLUNT||R2===R_CHI?S_BLUNT:S_SLASH,sp*.7);FXS.sty=S_MULTI;return ld}
  case'quake':{if(k>0){FXS.sty=S_QUAKE;return Math.max(30*sp,FXS.cAt-now)}ld=fxMelee(u,t,R_DUST,S_BLUNT,sp*1.2);FXS.cAt=now+ld;FXS.sty=S_QUAKE;return ld}
  case'palm':ld=fxMelee(u,t,R_CHI,S_BLUNT,sp);FXS.sty=(FXS.cab&&FXS.cab.ignB>=.4)?S_SHATTER:S_PALM;return ld;
  case'overload':case'dragon':{const R2=id==='dragon'?R_FIRE:R_MANA;if(prev){const f=from(),dl=Math.max(40*sp,FXS.cAt-now+30*sp);o=fxo(T_BOLT,f.x,f.y,dl,240*ss,id==='dragon'?R_QI:R_MANA);o.x2=bx;o.y2=by;o.a=6;FXS.clast=t;FXS.cAt=now+dl+50*sp;FXS.sty=id==='dragon'?S_STORM:S_ZAP;return dl+50*sp}
   ld=fxMelee(u,t,R2,S_SLASH,sp);if(id==='dragon'){emitFx(2,null,fx1-ux*10,fy1-bh*.48,90,200*ss,ld*.5,R_FIRE);o=fxo(T_SPIN,fx1,fy1-bh*.45,ld,360*ss,R_FIRE);o.a=15;o.b=5;o.c=-1.6}FXS.clast=t;FXS.cAt=now+ld;FXS.sty=id==='dragon'?S_STORM:S_RUNE;return ld}
  case'runeedge':ld=fxMelee(u,t,R_MANA,S_SLASH,sp);FXS.sty=S_RUNE;return ld;
  case'blinkstr':ld=fxMelee(u,t,R_MANA,fxWpnKind(u),sp);FXS.sty=S_MANA;return ld;
  case'decap':{ld=fxMelee(u,t,R_RED,S_SLASH,sp*1.15);if(!miss){o=fxo(T_SLASH,bx-ux*10,by-bh*.3-uy*10,ld+30*ss,200*ss,R_BLOOD);o.a=Math.atan2(uy,ux);o.b=15;o.c=-1}FXS.sty=S_DECAP;return ld}
  case'kick':case'dkick':FXS.sty=S_KICK;return 240*sp*AN_HIT_AT;
  case'starfall':{if(k>0)return splash(S_MANA);const sx=bx-50,sy=by-230,fl=Math.max(160,260*ss);o=fxo(T_PROJ,sx,sy,90*sp,fl,R_GOLD);o.x2=bx;o.y2=by;o.a=5;o.b=0;o.s=[fxSpr('star'),fxSpr('star1')];
   emitFx(1,null,ax,ay-20,60,90*sp,0,R_MANA);FXS.cAt=now+90*sp+fl;FXS.sty=S_STAR;return 90*sp+fl}
  case'master':{ld=fxMelee(u,t,R_GOLD,S_SLASH,sp*1.1);if(!miss){o=fxo(T_SLASH,bx-ux*14,by-uy*14,ld+40*ss,200*ss,R_GOLD);o.a=Math.atan2(uy,ux)+.5;o.b=14;o.c=-1;glyphFx('glint:rd',bx,by-6,0,200,ld)}FXS.sty=S_AIMED;return ld}}
 return -1}
function fxImpactN(e,t,u,x,y,fy,h,dx,dy,dmg,arm,sty,sp){if(sty>=S_A0){fxImpactA(e,t,u,x,y,fy,h,dx,dy,dmg,arm,sty,sp);return}
 switch(sty){
  case S_AARW:burst(K_TRAIL,R_AURA,x,y,12,110,280,.26,1,0,4);for(let i=0;i<fxN(6);i++)spawn(K_STREAK,R_AURA,x,y,dx*rr(200,320)+rr(-40,40),dy*rr(200,320)+rr(-60,20),.22,1,0,2);ringFx(x,y,3,13,220,R_AURA,0,1);glowFx(x,y,40,'y',.5,150);break;
  case S_SUN:ringFx(x,fy,4,30,380,R_AURA,0,.5,2);ringFx(x,y,3,20,300,R_GOLD,60,1,2);glowFx(x,y,90,'y',.8,300);glowFx(x,y,40,'r',.6,120);fxShake(4);
   for(let i=0;i<fxN(16);i++){const a=i/16*6.283;spawn(K_STREAK,i&1?R_AURA:R_WHITE,x+Math.cos(a)*6,y+Math.sin(a)*4,Math.cos(a)*rr(220,340),Math.sin(a)*rr(120,200),.3,1,0,2)}break;
  case S_CONC:for(let i=-2;i<=2;i++)spawn(K_STREAK,R_AURA,x-dx*8-dy*i*7,y-dy*8+dx*i*7,dx*rr(240,330),dy*rr(240,330),.2,1,0,3);ringFx(x,y,3,15,240,R_AURA,0,1,2);puff(x,fy,6);
   for(let i=0;i<3;i++){const g=glyphFx('star1',x,y-h*.4,0,300,0);g.c=(i-1)*70;g.d=-140}fxShake(3.5);break;
  case S_SEEK:burst(K_TRAIL,R_MANA,x,y,12,80,230,.3,1,0,4);ringFx(x,y,2,14,260,R_MANA,0,1);glyphFx('glint:rF',x,y,0,140,0);for(let i=0;i<fxN(6);i++){const a=i/6*6.283;spawn(K_SQ,R_MANA,x+Math.cos(a)*14,y+Math.sin(a)*8,-Math.cos(a)*80,-Math.sin(a)*50,.2,1,0,1)}break;
  case S_ARCV:{burst(K_SQ,R_MANA,x,y,14,60,200,.4,1,0,3);ringFx(x,y,2,15,260,R_MANA,0,1,2);glowFx(x,y,46,'x',.55,180);const o=fxOrb(R_MANA);for(let i=0;i<4;i++){const g=glyphFx('orb1',x,y,0,260,0);g.c=Math.cos(i*1.57+.7)*110;g.d=Math.sin(i*1.57+.7)*60-60}break}
  case S_BIND:{const g=glyphFx('rune',x,fy-2,0,900,0);ringFx(x,fy,16,4,360,R_MANA,0,.5,2);ringFx(x,fy,4,16,420,R_MANA,120,.5);burst(K_SQ,R_MANA,x,y,8,40,120,.4,1,0,2);{const o=fxo(T_PIN,x,fy,0,900,0);o.a=dx<0?-1:1}break}
  case S_STARP:cone(K_TRAIL,R_ICE,x,y,dx,dy,10,180,380,.25,1,0,3,.35);burst(K_SQ,R_MANA,x,y,8,40,140,.35,1,0,3);glowFx(x,y,40,'F',.6,140);glyphFx('glint:rF',x,y,0,150,0);break;
  case S_SPIRIT:{const o=fxo(T_COL,x,fy,0,320*sp,R_CHI);o.a=h;o.b=0;for(let i=0;i<fxN(10);i++)spawn(K_TRAIL,i&1?R_WHITE:R_CHI,x+rr(-8,8),y+rr(-6,6),0,rr(-220,-110),rr(.25,.45),1,0,1.2,rr(0,.08));glowFx(x,y,44,'A',.55,180);break}
  case S_PRESS:for(let i=0;i<4;i++){const a=i*1.57+.4;glyphFx('glint',x+Math.cos(a)*8,y+Math.sin(a)*8,0,160,i*50)}ringFx(x,y-h*.35,3,11,240,R_CHI,0,1);burst(K_SQ,R_CHI,x,y,7,40,120,.3,1,0,3);break;
  case S_VOLLEY:puff(x,fy,7);for(let i=0;i<3;i++){const o=fxo(T_PIN,x+(i-1)*10+rr(-3,3),fy+rr(-3,3),i*40,700,0);o.a=i&1?1:-1}fxShake(1.5);break;
  case S_QUAKE:{const o=fxo(T_CRACK,x,fy,0,1000,0);o.a=1;ringFx(x,fy,4,26,360,R_DUST,0,.5,2);ringFx(x,fy,3,18,300,R_STEEL,80,.5);fxShake(5);puff(x,fy,10);
   for(let i=0;i<fxN(14);i++)spawn(K_SQ,i%3?R_DUST:R_ROOT,x+rr(-16,16),fy+rr(-4,4),rr(-60,60),rr(-260,-120),rr(.4,.7),i&1?2:1,720,.6);break}
  case S_PALM:ringFx(x,y,3,17,260,R_CHI,0,1,2);ringFx(x,y,2,11,200,R_WHITE,60,1);burst(K_TRAIL,R_CHI,x,y,12,120,280,.24,1,0,4);glyphFx('fist:AeBA',x-dx*6,y-dy*6,0,170,0);glowFx(x,y,44,'A',.55,160);fxShake(3);break;
  case S_SHATTER:{ringFx(x,y,3,20,320,R_CHI,0,1,2);const o=fxo(T_CRACK,x,y,0,700,0);o.a=0;cone(K_SQ,R_STEEL,x,y,dx,dy*.5-.4,10,90,260,.4,1,500,2,1);glowFx(x,y,60,'A',.7,200);fxShake(5);break}
  case S_STORM:burst(K_SQ,R_FIRE,x,y,10,60,200,.4,2,-80,2);burst(K_SQ,R_ICE,x,y,8,40,160,.4,1,100,2);{const o=fxo(T_BOLT,x+rr(-8,8),y-h*1.4,0,170*sp,R_QI);o.x2=x;o.y2=fy-4;o.a=0}glowFx(x,y,52,'z',.6,170);emitFx(0,t,0,0,16,500,0,R_EMBER);fxShake(3);break;
  case S_RUNE:{glyphFx('rune',x,y-4,10,420,0);burst(K_TRAIL,R_MANA,x,y,10,90,240,.26,1,0,4);ringFx(x,y,2,12,220,R_MANA,0,1);glyphFx('glint:rF',x,y,0,140,0);break}
  case S_DECAP:if(dmg>0){cone(K_SQ,fxBloodR(t),x,y-h*.25,dx,-1,12,80,260,.5,2,620,1,1.3);cone(K_TRAIL,fxBloodR(t),x,y-h*.25,dx,dy*.4-.4,8,120,300,.3,1,300,2,.6)}fxShake(4);glyphFx('glint:rd',x,y-h*.3,0,140,0);break;
  case S_KICK:{const fire=FXS.cid==='dkick'||(e.u&&e.u===FXS.cu&&FXS.cid==='dkick');for(let i=-2;i<=2;i++)spawn(K_STREAK,fire?R_FIRE:R_WHITE,x-dx*8-dy*i*6,y-dy*8+dx*i*6+8,dx*rr(240,330),dy*rr(240,330),.2,1,0,3);
   {const g=glyphFx('boot',x-dx*12,y-dy*12+8,0,180,0);g.c=dx*80;g.d=dy*40}puff(x,fy,6);for(let i=0;i<3;i++){const g=glyphFx('star1',x,y-h*.4,0,300,0);g.c=(i-1)*70;g.d=-140}fxShake(3);break}
  case S_MULTI:{const o=fxo(T_SLASH,x+rr(-4,4),y+rr(-4,4),0,120,R_WHITE);o.a=Math.atan2(dy,dx)+rr(-.8,.8);o.b=8;o.c=Math.random()<.5?-1:1;burst(K_TRAIL,R_WHITE,x,y,6,90,220,.18,1,0,4);break}
  case S_STAR:ringFx(x,fy,4,34,420,R_GOLD,0,.5,2);ringFx(x,fy,4,24,360,R_MANA,80,.5,2);glowFx(x,y,100,'d',.8,320);glowFx(x,y,50,'r',.6,140);fxShake(5);
   for(let i=0;i<fxN(24);i++){const a=Math.random()*6.283,s2=rr(80,300);spawn(i%3?K_TRAIL:K_SQ,i&1?R_GOLD:R_MANA,x,y,Math.cos(a)*s2,Math.sin(a)*s2*.55-rr(40,140),rr(.3,.6),i&1?2:1,200,1.6)}{const o=fxo(T_CRACK,x,fy,0,900,0);o.a=1}break}}
/* the caster's own beat, before the blow; true when drawn here */
function fxCastN(u,t,ab,id,k,x,y,h,sp){if(fxCastA(u,t,ab,id,k,x,y,h,sp))return true;
 switch(id){
  case'swapk':return true;
  case'aarrow':case'carrow':case'sunarrow':case'pvolley':ringFx(x,y,3,13,240*sp,R_AURA,0,.5);for(let i=0;i<fxN(8);i++)spawn(K_TRAIL,R_AURA,x+rr(-10,10),y-rr(0,8),0,rr(-230,-120),rr(.2,.36),1,0,1.5,rr(0,.08));if(id==='sunarrow')glowFx(x,y-h*.5,60,'y',.5,260);return true;
  case'farrow':case'iarrow':case'tarrow':case'tempest':{const R2=id==='farrow'?R_FIRE:id==='iarrow'?R_ICE:R_QI;ringFx(x,y,3,14,260*sp,R2,0,.5);if(id==='tempest'){ringFx(x,y,3,20,300*sp,R_FIRE,60*sp,.5);ringFx(x,y,3,20,300*sp,R_ICE,120*sp,.5)}
   for(let i=0;i<fxN(8);i++){const a=i/8*6.283;spawn(K_SQ,i&1&&id==='tempest'?R_ICE:R2,x+Math.cos(a)*12,y-h*.5+Math.sin(a)*8,-Math.cos(a)*40,-Math.sin(a)*30-20,.3,1,0,1)}return true}
  case'seeker':case'avolley':case'bindshot':case'starpierce':ringFx(x,y,4,15,300*sp,R_MANA,0,.5);glyphFx('rune',x,y-h-8,8,480*sp,0,null);emitFx(1,u,0,0,60,260*sp,0,R_MANA);return true;
  case'spirit':case'pparrow':ringFx(x,y,3,14,280*sp,R_CHI,0,.5);glowFx(x,y-h*.5,40,'A',.45,220);return true;
  case'breath':{for(let i=0;i<3;i++)ringFx(x,y-h*.4,24-i*4,4,420*sp,R_CHI,i*110*sp,.6,1);for(let i=0;i<fxN(12);i++){const a=i/12*6.283;spawn(K_SQ,R_CHI,x+Math.cos(a)*26,y-h*.4+Math.sin(a)*14,-Math.cos(a)*70,-Math.sin(a)*40,.36,1,0,0,i*.02)}return true}
  case'volley':case'dshot':case'pshot':case'cripple':return true;
  case'headshot':glyphFx('glint',x,y-h*.8,0,160,0);return true;
  case'mark':{if(t){const b=fxUP(t),o=fxo(T_RET,b.x,b.y-b.h*.5,0,900,0);o.a=520;glyphFx('ic:ab-mark',b.x,b.y-b.h-14,10,800*sp,200*sp,null);ringFx(b.x,b.y,4,16,320*sp,R_RED,200*sp,.5)}
   const o2=fxo(T_PIERCE,x,y-h*.6,0,240*sp,R_RED);if(t){const b=fxUP(t);o2.x2=b.x;o2.y2=b.y-b.h*.5}return true}
  case'multi':case'palm':case'decap':case'kick':case'dkick':case'runeedge':case'master':return true;
  case'quake':{const o=fxo(T_SPIN,x,y-h*.2,0,240*sp,R_DUST);o.a=14;o.b=3.4;o.c=-3.1;glowFx(x,y-h,40,'l',.35,200);return true}
  case'overload':ringFx(x,y,3,14,260*sp,R_MANA,0,.5);emitFx(1,u,0,0,90,300*sp,0,R_MANA);return true;
  case'dragon':ringFx(x,y,3,16,260*sp,R_FIRE,0,.5);ringFx(x,y,3,16,260*sp,R_ICE,90*sp,.5);emitFx(2,null,x,y-h*.4,70,320*sp,0,R_FIRE);return true;
  case'blinkstr':FXS.bR=R_MANA;FXS.dS='x';FXS.dR=R_MANA;ringFx(x,y,3,13,240*sp,R_MANA,0,.5);return true;
  case'starfall':ringFx(x,y,4,15,300*sp,R_MANA,0,.5);glowFx(x,y-h-10,50,'d',.6,300);glyphFx('star',x,y-h-12,16,500*sp,0,null);return true;
  case'avatar':{const o=fxo(T_COL,x,y,0,560*sp,R_AURA);o.a=h+20;o.b=1;ringFx(x,y,4,22,420*sp,R_AURA,0,.5,2);glowFx(x,y-h*.5,90,'y',.7,420);fxShake(2);
   for(let i=0;i<fxN(20);i++)spawn(K_TRAIL,i&1?R_AURA:R_WHITE,x+rr(-14,14),y-rr(0,10),0,rr(-320,-160),rr(.3,.5),i&1?2:1,0,1.2,rr(0,.3));return true}
  case'rage':{ringFx(x,y-h*.5,3,16,280*sp,R_RED,0,1,2);ringFx(x,y-h*.5,3,16,280*sp,R_FIRE,140*sp,1);glowFx(x,y-h*.5,60,'g',.6,300);glyphFx('ic:ab-rage',x,y-h-12,10,600*sp,0,null);fxShake(2.5);
   for(let i=0;i<fxN(14);i++)spawn(K_SQ,i&1?R_RED:R_FIRE,x+rr(-10,10),y-rr(0,h),rr(-20,20),rr(-150,-60),rr(.3,.5),i&1?2:1,-30,1);return true}
  case'manashield':{const o=fxo(T_WARD,0,0,0,620*sp,R_MANA);o.u=u;o.a=h;o.b=1;glowFx(x,y-h*.5,56,'x',.45,300);return true}
  case'lotus':{for(let i=0;i<8;i++){const a=i/8*6.283,g=glyphFx('petal',x+Math.cos(a)*6,y-h*.3+Math.sin(a)*3,0,640*sp,i*30*sp,null);g.c=Math.cos(a)*90;g.d=Math.sin(a)*45-220}
   ringFx(x,y,4,(ab.party||2)*30,600*sp,R_CHI,0,.5,2);ringFx(x,y,4,(ab.party||2)*22,520*sp,R_WHITE,140*sp,.5);glowFx(x,y-h*.4,70,'A',.5,360);return true}
  case'surge':{const o=fxo(T_COL,x,y,0,600*sp,R_CHI);o.a=h+30;o.b=1;glyphFx('cross',x,y-h-14,14,700*sp,80*sp,null);ringFx(x,y,4,(ab.party||2)*30,640*sp,R_WHITE,0,.5,2);glowFx(x,y-h*.5,100,'r',.55,400);return true}
  case'secwind':{for(let i=0;i<fxN(14);i++){const yy=y-rr(4,h);spawn(K_STREAK,i%3?R_WIND:R_WHITE,x-rr(30,44),yy,rr(260,400),rr(-20,20),rr(.18,.28),1,0,1,i*.025*sp)}glyphFx('heart',x,y-h-8,12,600*sp,120*sp,null);ringFx(x,y,3,14,280*sp,R_WIND,0,.5);return true}
  case'bandage':if(t){const b=fxUP(t);for(let i=0;i<fxN(12);i++){const a=i/12*6.283*2;spawn(K_SQ,R_WHITE,b.x+Math.cos(a)*10,b.y-b.h*.45+i*1.5,-Math.sin(a)*60,Math.cos(a)*20,.3,1,0,1,i*.03)}}return true;
  case'tumble':puff(x,y,8);for(let i=0;i<fxN(6);i++)spawn(K_TRAIL,R_DUST,x+rr(-8,8),y-rr(0,10),rr(-60,60),rr(-80,-20),.3,1,60,2);return true;
  case'vanish':{for(let i=0;i<fxN(22);i++)spawn(K_SQ,i%3?R_SMOKE:R_DUST,x+rr(-14,14),y-rr(0,h),rr(-30,30),rr(-60,-10),rr(.5,.9),2,0,.9,rr(0,.1));glowFx(x,y-h*.4,40,'n',.4,260);return true}
  case'bastion':case'phalanx':case'parry':return false}
 return false}
/* a buff landing (the cast that gave it is live); true when drawn here */
function fxBuffN(t,id,x,y,h,sp){
 switch(id){
  case'bastion':{const o=fxo(T_BARS,0,0,0,760*sp,R_STEEL);o.u=t;o.a=h;glyphFx('ic:ab-bastion',x,y-h-10,6,640*sp,60*sp,t);ringFx(x,y,4,20,300*sp,R_STEEL,0,.5,2);puff(x,y,8);fxShake(2);return true}
  case'phalanx':{const g=glyphFx('shield:AqBpeq',x,y-h*.45,0,560*sp,0,t);g.b=-4;ringFx(x,y,4,15,280*sp,R_STEEL,0,.5);return true}
  case'parry':{for(const sg of[-1,1]){const o=fxo(T_SLASH,x,y-h*.5,(sg>0?90:0)*sp,200*sp,R_GOLD);o.a=sg>0?-.7:-2.4;o.b=13;o.c=sg}glyphFx('glint:rd',x,y-h*.75,0,260*sp,120*sp);ringFx(x,y,3,13,280*sp,R_GOLD,0,.5);return true}
  case'breath':glyphFx('ic:ab-breath',x,y-h-10,10,560*sp,0,t);return true;
  case'avatar':case'rage':case'manashield':case'vanish':case'surge':case'lotus':case'secwind':return true}
 return false}


/* ================= arms update: crossbows, flintlocks, reach weapons, hammers, shield skills =================
   Shots: a crossbow looses a short, flat bolt (T_PROJ kind 6) with a string snap; a flintlock a ball (kind 7) behind a muzzle
   flash, a drifting smoke cloud (T_SMOKE) and a small shake. Reach: a polearm / pike blow two tiles away is a long thrust
   streak across both tiles; a greatsword's is a wide arc centred on the swordsman. Hammers dent armor (sparks, a dent).
   Friendly fire: a stray is ONE projectile from the shooter to the ally it hits (fxOnMiss with d.stray stages it, the
   following 'hit' on the ally reuses it, 'ff' pops FRIENDLY FIRE over the ally when it lands). */
const S_A0=70,S_HAMMER=70,S_BELL=71,S_DEMO=72,S_BOLT=73,S_HEART=74,S_BALL=75,S_SCATTER=76,S_DEAF=77,S_EXEC=78,S_HOOK=79,S_SPIKE=80;
const T_SMOKE=40;
Object.assign(FXG,{flash:['...e...','.e.y.e.','..yey..','eyereye','..yey..','.e.y.e.','...e...'],flash1:['..E.E..','.EyyyE.','EyerrE.','.Eyyy E','..E.E..'].map(r=>r.replace(/ /g,'.')),
 dent:['.rqqp.','rq00po','q0..0o','p0..0o','.oooo.'],bell:['..d..','.dcd.','.dcb.','dccbb','.0.0.']});
Object.assign(FX_ID,{xaim:'xshot',xpin:'xshot',xheart:'xshot',blast:'gshot',fdeafen:'gshot',fexecute:'gshot',batter:'batter',ringblow:'ringblow',demolish:'demolish',hsmash:'hsmash',
 hook:'hook',trip:'hook',reap:'polereap',glaivecut:'glaivecut',gswing:'gswing',mordhau:'mordhau',spikebash:'spikebash',reload:'reload',scharge:'charge',fortress:'guard',halfsword:'stab',gsweep:'round'});
function fxW(u){return u&&u.wpn||FXO_NIL}
function fxIsRangedW(w){if(!w)return false;if(typeof isRangedW==='function')try{return isRangedW(w)}catch(e){}return w.wt==='bow'||w.wt==='crossbow'||w.wt==='flintlock'}
function fxIsHammer(u){const w=fxW(u);return w.wt==='hammer'}
function fxReachW(u){const w=fxW(u);return!!u.wpn&&!fxIsRangedW(w)&&(w.rng|0)>=2}
function fxShotOf(u){const w=fxW(u);return w.shot||(w.wt==='crossbow'?'bolt':w.wt==='flintlock'?'ball':null)}
// a bolt: fast and flat, with the snap of the string at the bow
function fxBolt(u,t,miss,sp,ss,ax,ay,bx,by,L,ux,uy,pre){const lead=(pre||0)+70*sp,fly=Math.max(45,L/2.1)*ss,o=fxo(T_PROJ,ax+ux*8,ay-2,lead,fly,R_WHITE);o.x2=bx;o.y2=by;o.a=6;o.b=Math.min(9,L*.035);o.c=miss?1:0;
 for(let i=-1;i<=1;i++)spawn(K_STREAK,R_WHITE,ax+ux*10-uy*i*4,ay-2+ux*i*4,-ux*140,-uy*140,.12,1,0,5,lead/1000);glyphFx('glint',ax+ux*10,ay-4,0,90,lead);FXS.sty=S_BOLT;return lead+fly}
// a ball: muzzle flash, smoke that drifts off, a small shake
function fxMuzzle(mx,my,ux,uy,delay,big){const dl=delay/1000;glyphFx(big?'flash':'flash1',mx+ux*6,my+uy*3,0,100,delay);glowFx(mx+ux*4,my,big?56:40,'E',.85,150,delay);
 for(let i=0;i<fxN(8);i++){const a=Math.atan2(uy,ux)+rr(-.5,.5),v=rr(90,220);spawn(K_SQ,R_FIRE,mx,my,Math.cos(a)*v,Math.sin(a)*v*.7,rr(.08,.18),1,0,6,dl)}
 if(!reduced)for(let i=0;i<(big?3:2);i++){const o=fxo(T_SMOKE,mx+ux*(8+i*10),my+uy*(4+i*5)-i*3,delay+i*40,1500+i*300,0);o.c=ux*rr(10,22)+rr(-8,8);o.d=-rr(7,14);o.b=big?1.2-i*.15:.9-i*.15}
 for(let i=0;i<fxN(7);i++)spawn(K_SQ,R_SMOKE,mx+ux*8+rr(-4,4),my+rr(-4,4),ux*rr(20,60)+rr(-10,10),-rr(10,40),rr(.9,1.6),2,-10,1.4,dl+rr(0,.08));fxShake(big?2:1.4)}
function fxBall(u,t,miss,sp,ss,ax,ay,bx,by,L,ux,uy,pre){const lead=(pre||0)+80*sp,fly=Math.max(28,L/3.4)*ss,two=!!fxW(u).two,mx=ax+ux*(two?24:18),my=ay-2+uy*(two?10:7),o=fxo(T_PROJ,mx,my,lead,fly,R_FIRE);
 o.x2=bx;o.y2=by;o.a=7;o.b=0;o.c=miss?1:0;fxMuzzle(mx,my,ux,uy,lead,two);FXS.sty=S_BALL;return lead+fly}
// a blow two tiles away with a long weapon
function fxReach(u,t,miss,sp,ss,ramp,arc){const a=fxUP(u),ax=a.x,ay=a.y-a.h*.5,b=fxUP(t),bx=b.x,by=b.y-b.h*.48,dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,lead=240*sp*AN_HIT_AT,dur=Math.max(130,250*Math.max(.6,sp)),w=fxW(u);
 if(arc||w.wt==='greatsword'){const ddx=dx/2,ddy=dy/2,Rr=Math.hypot(ddx,ddy/.5),a0=Math.atan2(ddy/.5,ddx),o=fxo(T_SPIN,ax,ay,lead*.35,dur,ramp||R_WHITE);o.a=Math.max(12,Math.round(Rr));o.b=2.5;o.c=a0-2;
  puff(ax,a.y,5);const o2=fxo(T_SLASH,bx-ux*10,by-uy*10,lead*.8,dur*.8,ramp||R_WHITE);o2.a=Math.atan2(uy,ux);o2.b=12;o2.c=1;FXS.sty=S_SLASH;return lead}
 const o=fxo(T_PIERCE,ax+ux*12,ay+uy*12,lead*.45,dur*.9,ramp||R_STEEL);o.x2=bx+ux*14;o.y2=by+uy*14;const o2=fxo(T_PIERCE,ax+ux*18,ay+uy*18-2,lead*.6,dur*.7,R_WHITE);o2.x2=bx+ux*8;o2.y2=by+uy*8-2;
 for(let i=0;i<fxN(6);i++){const f=rr(.2,.9);spawn(K_STREAK,R_WHITE,ax+dx*f,ay+dy*f+rr(-4,4),ux*260,uy*260,.14,1,0,4,lead*.5/1000+f*.05)}
 if(w.look==='halberd'||w.look==='glaive'||w.look==='bill'){const o3=fxo(T_SLASH,bx-ux*8,by-uy*8,lead*.9,dur*.7,R_STEEL);o3.a=Math.atan2(uy,ux);o3.b=9;o3.c=-1}
 FXS.sty=S_PUNC;return lead}
// the default shot / reach of the weapon in hand; -1 when it is a plain arrow (bows keep theirs)
function fxArmsShot(u,t,miss,sp,ss,ax,ay,bx,by,L,d,ux,uy){if(fxReachW(u)&&d<=Math.max(2,fxW(u).rng|0))return fxReach(u,t,miss,sp,ss);
 const sh=fxShotOf(u);if(sh==='bolt')return fxBolt(u,t,miss,sp,ss,ax,ay,bx,by,L,ux,uy);if(sh==='ball')return fxBall(u,t,miss,sp,ss,ax,ay,bx,by,L,ux,uy);return-1}
function fxStrikeA(u,t,id,k,miss,sp,ss,ax,ay,bx,by,L,d,ux,uy,fx1,fy1,bh){const ab=FXS.cab||FXO_NIL;let o,ld;
 switch(id){
  case'xshot':{let pre=0;if(ab.id==='xaim'||ab.id==='xheart'){pre=150*sp;o=fxo(T_RET,bx,by,0,pre+300,0);o.a=pre+130}const r=fxBolt(u,t,miss,sp,ss,ax,ay,bx,by,L,ux,uy,pre);
   if(ab.id==='xpin'&&!miss){FXS.sty=S_PIN}else if(ab.id==='xheart')FXS.sty=S_HEART;return r}
  case'gshot':{if(ab.id==='blast'&&k>0){FXS.sty=S_SCATTER;return Math.max(30*sp,FXS.cAt-now)}let pre=0;if(ab.id==='fexecute'){pre=160*sp;o=fxo(T_RET,bx,by,0,pre+300,0);o.a=pre+140}
   const r=fxBall(u,t,miss,sp,ss,ax,ay,bx,by,L,ux,uy,pre);
   if(ab.id==='blast'){for(let i=0;i<4;i++){const q=fxo(T_PROJ,ax+ux*20,ay-2+uy*8,80*sp,Math.max(28,L/3.2)*ss*rr(.9,1.15),R_FIRE);q.x2=bx+rr(-26,26);q.y2=by+rr(-12,12);q.a=7;q.b=0;q.c=1}FXS.sty=S_SCATTER;FXS.cAt=now+r}
   else FXS.sty=ab.id==='fdeafen'?S_DEAF:ab.id==='fexecute'?S_EXEC:S_BALL;return r}
  case'batter':case'ringblow':case'demolish':case'hsmash':{ld=fxMelee(u,t,id==='batter'?R_SPARK:id==='ringblow'?R_GOLD:R_DUST,S_BLUNT,sp*(id==='batter'||id==='ringblow'?1:1.15));
   if(id==='hsmash'||id==='demolish'){const a=fxUP(u);o=fxo(T_SPIN,a.x,a.y-a.h*.5,ld*.25,ld*.9,R_STEEL);o.a=14;o.b=2.2;o.c=-2.6}
   FXS.sty=id==='ringblow'?S_BELL:id==='batter'?S_HAMMER:S_DEMO;return ld}
  case'hook':{if(d>1)ld=fxReach(u,t,miss,sp,ss,R_STEEL);else ld=fxMelee(u,t,R_STEEL,S_PIERCE,sp);FXS.sty=S_HOOK;return ld}
  case'polereap':{if(k>0){FXS.sty=S_SLASH;return Math.max(30*sp,FXS.cAt-now+40*sp)}ld=d>1?fxReach(u,t,miss,sp,ss,R_WHITE,1):fxMelee(u,t,R_WHITE,S_SLASH,sp);FXS.cAt=now+ld;FXS.sty=S_SLASH;return ld}
  case'glaivecut':{ld=d>1?fxReach(u,t,miss,sp,ss,R_RED,1):fxMelee(u,t,R_RED,S_SLASH,sp);FXS.sty=S_DECAP;return ld}
  case'gswing':{ld=d>1?fxReach(u,t,miss,sp,ss,R_WHITE,1):fxMelee(u,t,R_WHITE,S_SLASH,sp);if(!miss){o=fxo(T_SLASH,bx-ux*14,by-uy*14,ld+40*ss,180*ss,R_WHITE);o.a=Math.atan2(uy,ux);o.b=14;o.c=2}FXS.sty=S_CHARGE;return ld}
  case'mordhau':ld=fxMelee(u,t,R_GOLD,S_BLUNT,sp);FXS.sty=S_STUN;return ld;
  case'spikebash':FXS.sty=S_SPIKE;return 240*sp*AN_HIT_AT}
 return -1}
function fxImpactA(e,t,u,x,y,fy,h,dx,dy,dmg,arm,sty,sp){
 const sparks=n=>{cone(K_SQ,R_SPARK,x,y,dx*.6,-1,n,120,300,.35,1,520,1.4,1.3);cone(K_TRAIL,R_SPARK,x,y,dx,dy*.5-.4,n>>1,160,340,.22,1,200,3,.7)};
 switch(sty){
  case S_HAMMER:if(arm>0||dmg===-1){sparks(9);const g=glyphFx('dent',x+dx*3,y-2,0,460,0);g.d=-30;ringFx(x,y,2,11,190,R_SPARK,0,1,2)}else puff(x,fy,4);fxShake(2.6);break;
  case S_BELL:fxImpactX(e,t,u,x,y,fy,h,dx,dy,dmg,arm,S_STUN,sp);sparks(6);for(let i=0;i<3;i++)ringFx(x,y-h*.32,4,13+i*5,300,i&1?R_WHITE:R_GOLD,i*80,.8);glyphFx('bell',x+10,y-h*.6,10,520,40);break;
  case S_DEMO:{const o=fxo(T_CRACK,x,fy,0,900,0);o.a=1;ringFx(x,fy,4,24,340,R_DUST,0,.5,2);sparks(12);if(arm>0)glyphFx('dent',x,y-2,6,520,0);puff(x,fy,10);fxShake(5);
   for(let i=0;i<fxN(10);i++)spawn(K_SQ,i%3?R_DUST:R_STEEL,x+rr(-14,14),fy+rr(-4,4),rr(-60,60),rr(-240,-110),rr(.4,.7),i&1?2:1,700,.6);if(t.st&&t.st.daze)fxImpactX(e,t,u,x,y,fy,h,dx,dy,dmg,arm,S_DAZE,sp);break}
  case S_BOLT:case S_HEART:cone(K_SQ,R_DUST,x,y,-dx,-dy-.4,3,40,110,.3,1,400,1,.6);glyphFx('glint',x-dx*4,y-dy*4,0,110,0);if(arm>0)cone(K_SQ,R_SPARK,x,y,-dx,-.6,5,80,200,.3,1,400,1.5,1);
   if(sty===S_HEART&&dmg>0){glyphFx('heart',x,y-h*.35,12,520,40);cone(K_SQ,fxBloodR(t),x,y,dx,dy*.4-.3,10,90,240,.45,2,500,1.2,.6)}break;
  case S_BALL:case S_SCATTER:case S_DEAF:case S_EXEC:{for(let i=0;i<fxN(sty===S_SCATTER?3:5);i++)spawn(K_SQ,R_SMOKE,x+rr(-5,5),y+rr(-5,5),rr(-20,20),rr(-40,-10),rr(.4,.8),2,-10,1.2);
   if(arm>0)cone(K_SQ,R_SPARK,x,y,-dx,-.7,sty===S_SCATTER?4:7,90,240,.3,1,420,1.5,1.2);if(dmg>0&&sty!==S_SCATTER)cone(K_SQ,fxBloodR(t),x+dx*6,y+dy*6,dx,dy*.5-.2,8,120,300,.4,1,480,1.4,.4);
   glyphFx('glint:rE',x,y,0,90,0);fxShake(sty===S_SCATTER?1.2:2);
   if(sty===S_DEAF){for(let i=0;i<3;i++)ringFx(x,y-h*.35,3,16+i*6,320,R_WHITE,i*70,.8);glyphFx('bang',x+12,y-h-6,6,520,40);fxImpactX(e,t,u,x,y,fy,h,dx,dy,dmg,arm,S_DAZE,sp)}
   if(sty===S_EXEC&&dmg>0)glyphFx('skull',x,y-h*.6,12,560,60);break}
  case S_HOOK:{const o=fxo(T_CLAW,x,y,0,240,R_STEEL);o.a=dx<0?1:-1;puff(x,fy,5);for(let i=0;i<fxN(5);i++)spawn(K_TRAIL,R_DUST,x+rr(-6,6),fy-rr(0,6),-dx*rr(120,200),-dy*rr(60,120),.25,1,0,3,.08);break}
  case S_SPIKE:fxImpactX(e,t,u,x,y,fy,h,dx,dy,dmg,arm,S_BASH,sp);for(let i=0;i<4;i++)glyphFx('glint',x-dx*10+rr(-6,6),y-dy*10+rr(-6,6),0,120,i*30);if(dmg>0)cone(K_SQ,fxBloodR(t),x,y,dx,dy*.5-.4,8,80,220,.45,2,520,1.2,.8);break}}
function fxCastA(u,t,ab,id,k,x,y,h,sp){switch(id){
  case'reload':ringFx(x,y,3,12,240*sp,R_GOLD,0,.5);return true;
  case'xshot':case'gshot':ringFx(x,y,3,12,220*sp,id==='gshot'?R_EMBER:R_STEEL,0,.5);return true;
  case'batter':case'ringblow':case'demolish':case'hsmash':case'hook':case'polereap':case'glaivecut':case'gswing':case'mordhau':case'spikebash':return true}
 return false}
// what the reload looks like: a crossbow is cranked (clicks, brass), a firearm rammed (a puff of powder, the rod's glint)
function fxOnReload(u){if(!u||!u.alive)return;const p=fxUB(u),x=p.x,y=p.y,h=p.h,sp=Math.max(.6,fxSp()),gun=fxW(u).wt==='flintlock'||fxShotOf(u)==='ball';
 if(gun){for(let i=0;i<fxN(6);i++)spawn(K_SQ,R_SMOKE,x+rr(-6,6),y-h*.85+rr(-3,3),rr(-12,12),rr(-40,-15),rr(.5,.9),i&1?2:1,-8,1,rr(0,.15));for(let i=0;i<3;i++)glyphFx('glint',x+4,y-h*.9-i*3,0,90,(60+i*120)*sp)}
 else for(let i=0;i<3;i++){glyphFx('glint:rd',x+(i-1)*5,y-h*.45,0,90,(i*130)*sp);for(let j=0;j<fxN(3);j++)spawn(K_SQ,R_GOLD,x+(i-1)*5,y-h*.45,rr(-40,40),rr(-70,-20),.25,1,300,1,i*.13*sp)}
 ringFx(x,y,3,13,280*sp,R_GOLD,300*sp,.5)}
function fxDrawShot(o,kind,x,y,ax,ay,ux,uy,p,tick){const q=DQ;
 if(kind===6){const tx=ax-ux*5,ty=ay-uy*5;q.fillStyle=PAL['0'];aLine(tx,ty+1,ax,ay+1,1);q.fillStyle=PAL.j;aLine(tx,ty,ax,ay,1);q.fillStyle=PAL.g;A(Math.round(tx),Math.round(ty),1,1);q.fillStyle=PAL.q;A(Math.round(ax-ux),Math.round(ay-uy),1,1);q.fillStyle=PAL.r;A(ax,ay,1,1);
  if(!reduced)while(o.acc>.016){o.acc-=.016;spawn(K_STREAK,R_WHITE,x-ux*8,y-uy*8,-ux*50,-uy*50,.1,1,0,1)}}
 else{const tx=ax-ux*7,ty=ay-uy*7;q.fillStyle=PAL.E;aLine(tx,ty,ax,ay,1);q.fillStyle=PAL.y;aLine(ax-ux*3,ay-uy*3,ax,ay,1);q.fillStyle=PAL['0'];A(ax-1,ay,1,1);q.fillStyle=PAL.e;A(ax,ay-1,1,2);A(ax+1,ay,1,1);q.fillStyle=PAL.r;A(ax,ay,1,1);
  if(!reduced)while(o.acc>.02){o.acc-=.02;spawn(K_SQ,R_SMOKE,x-ux*10+rr(-2,2),y-uy*10+rr(-2,2),rr(-6,6),rr(-16,-4),rr(.3,.5),1,-6,1)}}
 if(p>=1&&o.c)puff(o.x2,o.y2,3)}
// a smoke cloud: three overlapping, growing discs that drift and thin out in steps
function fxDrawSmoke(o,t,p,cx,cy){const q=DQ,age=(t-o.t0)/1000,X=Math.floor((o.x+o.c*age)/2),Y=Math.floor((o.y+o.d*age-6*age*age)/2),s=o.b||1,R0=Math.max(1,Math.round((2+5*Math.sqrt(p))*s)),tick=(t/70)|0;
 const L=[[0,0,R0],[Math.round(R0*.7),Math.round(R0*.3),Math.round(R0*.75)],[-Math.round(R0*.6),Math.round(R0*.35),Math.round(R0*.7)]];
 for(let n=0;n<3;n++){const [ox,oy,r]=L[n];for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){const d=i*i+j*j;if(d>r*r)continue;if(p>.55&&((i+j+tick)&1))continue;if(p>.8&&((i+tick)&2))continue;
   const lt=(i+j)<-r*.4&&d>r*r*.3;q.fillStyle=PAL[p<.3?(lt?'q':'p'):p<.65?(lt?'p':'o'):(lt?'o':'4')];A(X+ox+i,Y+oy+j,1,1)}}}

/* ================= Monsters (monsterart): serpents, ents, ogres, wyverns =================
   fxKeyM(ab) picks a choreography from the ability's fx hint (66-monsters.js): venom bites and spit, coils that wrap and crush,
   roots that erupt, bark that closes, regrowth, ogre sweeps and slams (screen shake, shockwaves), the wyvern's sting, bite,
   wing buffet, take-off and dive. Fire on ents (fire-weak) burns bigger. Strike choreographies return ms until the blow lands. */
const T_M0=50,T_MCOIL=50,T_MROOT=51,T_MJAW=52,T_MGUST=53,T_MSHAD=54,T_MWHIP=55,T_MFALL=56;
const S_M0=100,S_MVEN=100,S_MSPIT=101,S_MCOIL=102,S_MCRUSH=103,S_MLASH=104,S_MSMASH=105,S_MSWEEP=106,S_MSTING=107,S_MJAW=108,S_MBUF=109,S_MDIVE=110,S_MQUAKE=111;
const R_VENOM=fxRamp('eAABwC'),R_SCALE=fxRamp('dcbHa'),R_BARK=fxRamp('kjjia'),R_LEAF=fxRamp('eAvwB'),R_WYV=fxRamp('hgKf1');
const FXM_HINT={spit:'m:spit',coil:'m:coil',crush:'m:crush',lash:'m:lash',roots:'m:roots',bark:'m:bark',quake:'m:quake',sting:'m:sting',buffet:'m:buffet',dive:'m:dive','dive-land':'m:dland'};
function fxKeyM(ab){if(!ab||!ab.foe)return null;const f=ab.fx||'',id=ab.id||'';if(FXM_HINT[f])return FXM_HINT[f];
 if(f==='bite')return/^w/.test(id)?'m:jaw':ab.status&&(ab.status.poison||ab.status.venom)?'m:vbite':null;
 if(f==='smash')return ab.kb?'m:hurl':'m:smash';if(f==='sweep'&&ab.kb)return'm:sweep';return null}
function fxIsMon(u){return!!(u&&u.def&&typeof monsterKind==='function'&&monsterKind(u))}
/* a heavy landing / ground slam: crack, shockwave rings, dust plumes, shake. s: size (1 a slam, 2 the wyvern's dive) */
function fxQuake(x,y,s,delay){const o=fxo(T_CRACK,x,y,delay,1100,0);o.a=1;ringFx(x,y,6,36*s,380,R_DUST,delay,.5,2);ringFx(x,y,4,26*s,320,R_WHITE,delay+40,.5,1);ringFx(x,y,8,52*s,520,R_DUST,delay+90,.5,1);
 glowFx(x,y,70*s,'y',.45,220,delay);for(let i=0;i<fxN(18*s);i++){const a=Math.random()*6.283,r=rr(6,30*s);spawn(K_SQ,i%4?R_DUST:R_BARK,x+Math.cos(a)*r,y+Math.sin(a)*r*.5,Math.cos(a)*rr(30,90),-rr(120,280),rr(.45,.8),i&1?2:1,720,.6,delay/1000)}
 if(delay>0)setTimeout(()=>fxShake(3+2.5*s),delay);else fxShake(3+2.5*s)}
function fxFireWeak(t,x,fy,h,sp){for(let i=0;i<fxN(26);i++)spawn(K_SQ,R_FIRE,x+rr(-14,14),fy-rr(0,h*.8),rr(-18,18),rr(-200,-90),rr(.35,.7),i%3?2:1,-80,1.4,rr(0,.15));
 emitFx(0,t,0,0,40,1300,0,R_FIRE);glowFx(x,fy-h*.4,80,'E',.6,320);ringFx(x,fy,5,24,320,R_EMBER,0,.5,2);for(let i=0;i<fxN(8);i++)spawn(K_SQ,R_SMOKE,x+rr(-12,12),fy-h*rr(.6,1),rr(-10,10),rr(-60,-30),rr(.8,1.3),2,0,.5,rr(.1,.4))}
function fxRegrow(t){const p=fxUP(t),x=p.x,y=p.y,h=p.h,sp=Math.max(.6,fxSp());for(let i=0;i<fxN(16);i++){const a=i/16*6.283;spawn(K_SQ,R_LEAF,x+Math.cos(a)*18,y-h*.2+Math.sin(a)*8,-Math.cos(a)*20,rr(-90,-40),rr(.6,1),i%3?2:1,-10,.6,i*.03)}
 ringFx(x,y,4,22,420*sp,R_LEAF,0,.5,2);glowFx(x,y-h*.4,50,'A',.4,300);glyphFx('ic:st-regrow',x,y-h-6,10,700*sp,60,null)}
function fxStrikeM(u,t,id,k,miss,sp,ss,ax,ay,bx,by,L,d,ux,uy,fx1,fy1,bh){let o,ld;const big=u.def&&(u.def.big||u.sz>1);
 switch(id){
  case'm:vbite':ld=fxMelee(u,t,R_WHITE,S_CLAW,sp);if(!miss){o=fxo(T_MJAW,bx,by,ld*.6,240*ss,R_WHITE);o.a=6;o.b=ux<0?-1:1}FXS.sty=S_MVEN;return ld;
  case'm:jaw':{const P=fxUB(u);ld=240*sp*AN_HIT_AT;o=fxo(T_MJAW,bx,by,ld*.5,300*ss,R_WHITE);o.a=13;o.b=ux<0?-1:1;fxShake(2);FXS.sty=S_MJAW;return ld}
  case'm:spit':{const hx=ax+ux*10,hy=ay-10,fly=Math.max(90,L/1.3)*ss;o=fxArrow(hx,hy,bx,by,fly,Math.min(30,L*.18),R_VENOM,60*sp);o.c=miss?1:0;
   for(let i=0;i<fxN(8);i++)spawn(K_SQ,R_VENOM,hx+ux*4,hy,ux*rr(60,150)+rr(-20,20),uy*rr(60,150)-rr(10,50),rr(.2,.4),1,200,1,.06*sp);FXS.sty=S_MSPIT;return 60*sp+fly}
  case'm:coil':{ld=fxMelee(u,t,R_WHITE,S_BLUNT,sp);if(!miss){o=fxo(T_MCOIL,0,0,ld,900*ss,R_SCALE);o.u=t;o.a=0}FXS.sty=S_MCOIL;return ld}
  case'm:crush':{ld=200*sp;o=fxo(T_MCOIL,0,0,0,700*ss,R_SCALE);o.u=t;o.a=1;FXS.sty=S_MCRUSH;return ld+260*sp}
  case'm:lash':{ld=240*sp*AN_HIT_AT;o=fxo(T_MWHIP,ax+ux*8,ay-6,ld*.3,260*ss,R_BARK);o.x2=bx;o.y2=by;FXS.sty=S_MLASH;return ld}
  case'm:smash':case'm:hurl':{ld=Math.max(120,300*sp*AN_HIT_AT);o=fxo(T_BLUNT,bx,by,ld,240*ss,R_WHITE);o.a=16;FXS.sty=id==='m:hurl'?S_MSWEEP:S_MSMASH;return ld}
  case'm:sweep':{ld=240*sp*AN_HIT_AT;if(k===0){const P=fxUP(u);o=fxo(T_SPIN,P.x,P.y-P.h*.35,30*sp,360*ss,R_WHITE);o.a=big?34:20;o.b=5.4;o.c=Math.atan2(uy,ux)-2.6;o.d=1;puff(P.x,P.y,10)}
   FXS.sty=S_MSWEEP;return ld+k*40*sp}
  case'm:quake':{FXS.sty=S_MQUAKE;return 260*sp+k*30*sp}
  case'm:sting':{const P=fxUB(u),sx=P.x-ux*20*(big?1.4:.6),sy=P.y-P.h*(big?.9:.7);ld=Math.max(90,200*sp);o=fxo(T_PIERCE,sx,sy,ld*.35,ld*.75,R_STEEL);o.x2=bx+ux*8;o.y2=by;
   for(let i=0;i<fxN(6);i++)spawn(K_TRAIL,R_WHITE,sx+rr(-4,4),sy+rr(-4,4),(bx-sx)*1.8,(by-sy)*1.8,.14,1,0,3,ld*.35/1000);FXS.sty=S_MSTING;return ld}
  case'm:buffet':{ld=200*sp+k*25*sp;FXS.sty=S_MBUF;return ld}
  case'm:dland':{ld=Math.max(100,230*sp)+k*30*sp;FXS.sty=S_MDIVE;return ld}}
 return -1}
function fxCastM(u,t,ab,id,k,x,y,h,sp){const P=fxUB(u),bx=P.x,by=P.y,big=u.def&&(u.def.big||u.sz>1);
 switch(id){
  case'm:roots':{const T=t||null;if(T){const q=fxUP(T);for(let i=0;i<fxN(10);i++)spawn(K_SQ,R_BARK,q.x+rr(-14,14),q.y+rr(-4,4),rr(-30,30),-rr(80,200),rr(.4,.7),i&1?2:1,600,.6,.12);const o=fxo(T_MROOT,q.x,q.y,100*sp,900*sp,R_BARK);o.a=1;{const c=fxo(T_CRACK,q.x,q.y,80*sp,800,0);c.a=1}fxShake(2)}
   for(let i=0;i<fxN(8);i++){const a=Math.random()*6.283;spawn(K_SQ,R_LEAF,bx+Math.cos(a)*16,by+Math.sin(a)*6,0,rr(-40,-10),rr(.4,.8),1,40,.6)}ringFx(bx,by,6,26,360*sp,R_LEAF,0,.5,2);glowFx(bx,by-h*.7,40,'A',.5,260);return true}
  case'm:quake':{fxQuake(bx,by,1.4,220*sp);return true}
  case'm:buffet':{for(let s2=-1;s2<=1;s2+=2){const o=fxo(T_MGUST,bx,by-h*.4,60*sp,520*sp,R_WIND);o.a=s2}ringFx(bx,by,10,64,420*sp,R_WIND,60*sp,.5,2);ringFx(bx,by,8,48,360*sp,R_WHITE,120*sp,.5,1);
   for(let i=0;i<fxN(24);i++){const a=Math.random()*6.283;spawn(K_STREAK,R_WIND,bx+Math.cos(a)*20,by+Math.sin(a)*10-rr(0,h*.4),Math.cos(a)*rr(260,420),Math.sin(a)*rr(120,200),rr(.2,.34),1,0,1.5,.06*sp)}
   for(let i=0;i<fxN(14);i++)spawn(K_SQ,R_DUST,bx+rr(-40,40),by+rr(-10,10),rr(-90,90),-rr(30,90),rr(.4,.7),2,120,1.2,.1*sp);fxShake(2.5);return true}
  case'm:dive':{for(let i=0;i<fxN(20);i++)spawn(K_SQ,R_DUST,bx+rr(-36,36),by+rr(-8,8),rr(-120,120),-rr(20,70),rr(.4,.8),i&1?2:1,80,1.4);ringFx(bx,by,10,58,420*sp,R_WIND,0,.5,2);
   for(let i=0;i<fxN(14);i++)spawn(K_STREAK,R_WIND,bx+rr(-30,30),by-rr(0,h),0,rr(-420,-260),rr(.2,.35),1,0,1,rr(0,.2));glyphFx('ic:st-diving',bx,by-h-10,14,800*sp,120*sp,null);fxShake(1.5);return true}
  case'm:dland':{const z=u.dive;if(z){const q=tpos(z.c+((u.sz||1)-1)/2,z.r+((u.sz||1)-1)/2,anUH(u,z.c,z.r)),o=fxo(T_MFALL,q.x,q.y,0,Math.max(120,240*sp),R_WYV);o.u=u;o.x2=bx;o.y2=by-60;fxQuake(q.x,q.y,2,Math.max(120,240*sp))}return true}
  case'm:sweep':case'm:smash':case'm:hurl':{if(big)puff(bx,by,6);return true}
  case'm:spit':{for(let i=0;i<fxN(4);i++)spawn(K_SQ,R_VENOM,bx+rr(4,10),by-h*.6,rr(10,40),rr(-30,0),rr(.2,.4),1,100,1);return true}
  case'm:coil':case'm:crush':case'm:vbite':case'm:jaw':case'm:sting':case'm:lash':return true}
 return false}
function fxBuffM(t,id,x,y,h,sp){if(id!=='m:bark')return false;
 for(let i=0;i<fxN(18);i++){const a=i/18*6.283,r=rr(26,38);spawn(K_SQ,R_BARK,x+Math.cos(a)*r,y-h*.45+Math.sin(a)*r*.7,-Math.cos(a)*r*3.2,-Math.sin(a)*r*2.2,.3,2,0,0,i*.012)}
 ringFx(x,y-h*.45,30,6,320*sp,R_BARK,0,.9,2);glyphFx('ic:st-bark',x,y-h-6,8,700*sp,200*sp,null);puff(x,y,6);fxShake(1);return true}
function fxImpactM(e,t,u,x,y,fy,h,dx,dy,dmg,arm,sty,sp){
 switch(sty){
  case S_MVEN:burst(K_SQ,R_VENOM,x,y,10,40,140,.5,1,240,2);ringFx(x,y,2,10,220,R_VENOM,0,1);break;
  case S_MSPIT:for(let i=0;i<fxN(14);i++)spawn(K_SQ,R_VENOM,x+rr(-6,6),y+rr(-6,4),rr(-70,70),rr(-120,-20),rr(.4,.8),i&1?2:1,420,.8);ringFx(x,y,3,14,260,R_VENOM,0,1);emitFx(0,t,0,0,14,500,0,R_VENOM);break;
  case S_MCOIL:case S_MCRUSH:{cone(K_SQ,R_DUST,x,fy,0,-1,8,40,120,.4,1,300,1,1.4);if(sty===S_MCRUSH){glyphFx('star',x,y-6,8,260,0);ringFx(x,y,14,4,240,R_SCALE,0,.9,2);fxShake(3.5)}break}
  case S_MLASH:for(let i=0;i<fxN(10);i++)spawn(K_SQ,i&1?R_LEAF:R_BARK,x+rr(-6,6),y+rr(-6,6),dx*rr(40,120)+rr(-30,30),rr(-90,-20),rr(.3,.6),1,300,1);break;
  case S_MSMASH:{const o=fxo(T_CRACK,x,fy,0,900,0);o.a=1;ringFx(x,fy,4,24,320,R_DUST,0,.5,2);puff(x,fy,10);glyphFx('star',x,y-h*.3,8,280,0);fxShake(4.5);break}
  case S_MSWEEP:{ringFx(x,fy,3,18,260,R_DUST,0,.5,2);for(let i=-2;i<=2;i++)spawn(K_STREAK,R_WHITE,x-dx*6-dy*i*6,y-dy*6+dx*i*6,dx*rr(260,360),dy*rr(260,360),.2,1,0,3);puff(x,fy,8);fxShake(3.5);break}
  case S_MSTING:burst(K_TRAIL,R_VENOM,x,y,12,80,220,.32,1,0,4);ringFx(x,y,2,12,240,R_VENOM,0,1);glyphFx('ic:st-venom',x,y-h*.5,10,520,80,null);emitFx(0,t,0,0,18,600,0,R_VENOM);break;
  case S_MJAW:cone(K_SQ,fxBloodR(t),x,y,dx,-.6,10,60,200,.5,2,500,1.2,1);fxShake(3);break;
  case S_MBUF:for(let i=0;i<fxN(10);i++)spawn(K_STREAK,R_WIND,x-dx*10+rr(-6,6),y+rr(-10,6),dx*rr(280,420),dy*rr(200,320),rr(.15,.25),1,0,2);puff(x,fy,8,R_WIND);break;
  case S_MDIVE:puff(x,fy,10);ringFx(x,fy,4,20,300,R_DUST,0,.5,2);break;
  case S_MQUAKE:{puff(x,fy,8);ringFx(x,fy,3,16,240,R_DUST,0,.5,2);break}}}
/* fliers: wing gusts as they move; heavy monsters thud along */
function fxMoveM(u,kind,oc,or,dist){if(!u.def)return false;const mi=typeof umon==='function'?umon(u):null;if(!mi||!mi.kind)return false;
 const o0=tpos(oc,or,anUH(u,oc,or)),s=u.sz||1,x0=o0.x+(s>1?0:0),y0=o0.y+(s>1?16:0),p=fxUP(u);
 if(kind===AN_WALK&&mi.fly){if(!reduced){for(let i=0;i<(s>1?4:2);i++)spawn(K_SQ,R_DUST,x0+rr(-12,12)*s,y0+rr(-3,3),rr(-40,40),rr(-20,-6),rr(.25,.45),1,30,2);if(s>1)ringFx(x0,y0,6,30,260,R_WIND,0,.5)}return true}
 if(kind===AN_WALK&&(mi.size>1||u.def.big)&&!mi.fly){if(!reduced)puff(x0,y0,4);if(mi.kind==='ent'||mi.kind==='elder'||mi.kind==='aogre')fxShake(.8);return true}
 return false}
/* standing effects: coils that hold, roots that entangle, burning ents, regrowth, venom */
function fxWatchM(u,v){const st=u.st;if(!st)return;
 if(st.coiled>0&&!v.coil){v.coil=true;const o=fxo(T_MCOIL,0,0,80,60000,R_SCALE);o.u=u;o.s=v;o.a=2}
 if(st.entangled>0&&!v.ent){v.ent=true;const o=fxo(T_MROOT,0,0,40,60000,R_BARK);o.u=u;o.s=v;o.a=2}}
function fxDripM(u,dt){const st=u.st,r=Math.random();if(!st)return;const fw=u.def&&u.def.fireWeak;
 if(fw&&st.burn&&r<dt*26){const p=fxUB(u);spawn(K_SQ,R_FIRE,p.x+rr(-12,12),p.y-rr(p.h*.2,p.h*.9),rr(-10,10),rr(-160,-80),rr(.3,.6),Math.random()<.5?2:1,-60,1.2);if(r<dt*4)spawn(K_SQ,R_SMOKE,p.x+rr(-8,8),p.y-p.h,rr(-8,8),rr(-50,-30),rr(.8,1.2),2,0,.5)}
 if(st.venom&&r<dt*8){const p=fxUB(u);spawn(K_PLUS,R_VENOM,p.x+rr(-9,9),p.y-rr(p.h*.3,p.h*.9),rr(-4,4),rr(-50,-24),rr(.5,.9),1,-10,.4)}
 if(st.regrow&&!st.burn&&r<dt*3){const p=fxUB(u);spawn(K_SQ,R_LEAF,p.x+rr(-14,14),p.y-rr(p.h*.5,p.h),rr(-6,6),rr(10,30),rr(.8,1.4),1,20,.4)}
 if(st.bark&&r<dt*2){const p=fxUB(u);glyphFx('glint',p.x+rr(-10,10),p.y-rr(p.h*.3,p.h*.8),0,160,0)}}
/* ---- shapes ---- */
function fxDrawShapeM(o,t,dt,p,cx,cy,Rm,tick){const q=DQ;
 switch(o.ty){
  case T_MCOIL:{const u=o.u,v=o.s;if(!u||!u.alive||(o.a===2&&p>.002&&!(u.st&&u.st.coiled>0))){o.on=false;if(v)v.coil=false;o.u=null;o.s=null;break}
   const b=fxUB(u),fx=Math.floor(b.x/2),fy=Math.floor(b.y/2),hh=Math.floor(b.h/2),e=o.a===2?1:Math.min(1,p/.3),sq=o.a===1?Math.sin(Math.min(1,p*2)*Math.PI)*2:o.a===2?((t/400|0)&1):0;
   for(let j=0;j<3;j++){const yy=fy-Math.round(hh*(.2+j*.22)),rx=Math.round((9-j-sq)*e)+1,ry=Math.max(1,Math.round(rx*.38));
    for(let i=0;i<24;i++){const a=i/24*6.283,fr=Math.sin(a)>0;if(!fr&&e<1)continue;const X=fx+Math.round(Math.cos(a)*rx),Y=yy+Math.round(Math.sin(a)*ry);q.fillStyle=PAL['0'];A(X-1,Y-1,3,3);q.fillStyle=PAL[(i+j)%5===0?'a':fr?'c':'b'];A(X,Y,1,2)}}break}
  case T_MROOT:{const u=o.u,v=o.s;let fx=cx,fy=cy;if(u){if(!u.alive||(o.a===2&&p>.002&&!(u.st&&u.st.entangled>0))){o.on=false;if(v)v.ent=false;o.u=null;o.s=null;break}const b=fxUB(u);fx=Math.floor(b.x/2);fy=Math.floor(b.y/2)}
   const gr=o.a===2?1:Math.min(1,p/.25),fade=o.a===2?0:Math.max(0,(p-.7)/.3);if(fade>0&&(tick&1)&&fade>.5)break;
   for(let i=0;i<9;i++){const a=.2+i*.7,X=fx+Math.round(Math.cos(a)*11),Y=fy+Math.round(Math.sin(a)*5),H=Math.round((6+fxHash(o.seed,i)*9)*gr*(1-fade)),sg=Math.cos(a)<0?1:-1;
    for(let k2=0;k2<H;k2++){const xx=X+Math.round(sg*Math.sin(k2/H*2.2)*2.5),yy=Y-k2;q.fillStyle=PAL['0'];A(xx-1,yy,3,1);q.fillStyle=PAL[k2<2?'i':k2&1?'j':'k'];A(xx,yy,1,1)}
    if(H>5){q.fillStyle=PAL.v;A(X+sg*2,Y-H+1,1,1);q.fillStyle=PAL.l;A(X-sg,Y-(H>>1),1,1)}}break}
  case T_MJAW:{const n=o.a||6,sg=o.b||1,e=Math.min(1,p/.45),gap=Math.round(n*(1-e)),fade=p>.7&&(tick&1);if(fade)break;
   for(const s2 of[-1,1]){const yy=cy+s2*(gap+2);for(let i=-n;i<=n;i++){const X=cx+i,Y=yy-s2*Math.round(Math.abs(i)*.3);q.fillStyle=PAL['0'];A(X,Y-1,1,3);q.fillStyle=PAL[(i&3)===0?'r':'l'];A(X,Y,1,1);if((i&3)===0){q.fillStyle=PAL.r;A(X,Y+s2,1,1)}}}break}
  case T_MGUST:{const sg=o.a||1,e=1-(1-p)*(1-p);for(let j=0;j<5;j++){const R=12+e*44+j*5,y0=cy-8+j*4;for(let i=0;i<10;i++){const a=(i/10-.5)*1.4,X=cx+sg*Math.round(Math.cos(a)*R),Y=y0+Math.round(Math.sin(a)*R*.35);if((i+j+tick)%3===0)continue;q.fillStyle=PAL[j<2?'r':'q'];A(X,Y,1,1)}}break}
  case T_MFALL:{const u=o.u;const e=p*p,x=o.x2+(o.x-o.x2)*e,y=o.y2+(o.y-o.y2)*e,X=Math.floor(x/2),Y=Math.floor(y/2);const S=u?fxUnitSpr(u):null;
   if(S&&S.cv){q.globalAlpha=.55*(1-p*.4);const c=fxSil(S.cv,'K');if(c)aSpr(c,X-S.ax,Y-S.ay);q.globalAlpha=1}
   for(let i=0;i<6;i++){q.fillStyle=PAL[i&1?'r':'q'];A(X-12+i*5,Y-30-Math.round((1-e)*20)-i*3,1,6)}break}
  case T_MWHIP:{const x2=Math.floor(o.x2/2),y2=Math.floor(o.y2/2),e=Math.min(1,p/.5),n=16;let px_=cx,py=cy;for(let i=1;i<=n*e;i++){const f=i/n,X=Math.round(cx+(x2-cx)*f),Y=Math.round(cy+(y2-cy)*f-Math.sin(f*Math.PI)*10);
    q.fillStyle=PAL['0'];A(X-1,Y-1,3,3);q.fillStyle=PAL[i%3?'j':'B'];A(X,Y,1,1);if(i%4===0){q.fillStyle=PAL.m;A(X,Y-2,1,1)}px_=X;py=Y}break}}}
/* the board asks: a dive's shadow on its landing tiles (drawn by 70-render.js under the figures) */
function fxDiveShadow(u){return u&&u.dive&&u.alive?u.dive:null}
