/* ================= SURCOATS ON THE FIGURES (art; PAL only) =================
   The second body layer of 47-tailor.js drawn over whatever armor is worn: battle figures (the part grid of 73-units.js, so the HD
   resolver of 73h-unitshd.js, mirroring, every state and the fallen pose come for free), 32x32 portraits (07-portraits.js; the HD
   bust of 07h-portraitshd.js paints the coat as its own cloth layer and the emblem at full resolution) and the 16 px item icon.
   A coat spec S.coat = {id, cut, F (field ramp), K (charge ramp), em (emblem key), sig}: the field is the livery's c1, the emblem and
   trims its c2 (BANNERC ramps), the emblem key one of EMBLEMS (unknown keys fall back through bannerFix). Cuts (ITEMS[id].coat):
   tabard (short, open at the near side), surcoat (long, split at the front), quilted (padded, mid-thigh), mantle (tabard + shoulder
   cape), herald (long, bordered in the charge colour, dagged hem), jinbaori (eastern: open front with trimmed lapels, mon on the back).
   House soldiers get their house's coat and gear tinted to the house colours (usHouseDress): shield faces, hoods, plume, cape.
   Public: usCoatSpec(coat), usCoatOfMerc(m), usCoat(S,A,v,P,x0,ty), usHouseDress(S,u,coat), usCoatSig(u), usEmGlyph(key,w,h),
   usCoatIconRows(id,liv), ptCoatLayer(P) / ptCoatEm(P) (portraits). Nothing here touches rnd(). */
function usCoatR(c,b){const k='v'+c+(b==null?1:b);let r=US_RC.get(k);if(!r){const B=typeof BANNERC==='object'&&BANNERC[c];r=usRamp(B?B.r.join(''):'fgh',b==null?1:b);US_RC.set(k,r)}return r}
const USC_SP=new Map();
function usCoatSpec(c){if(!c||!c.liv)return null;const L=c.liv,k=c.id+'|'+L.sig;let s=USC_SP.get(k);if(s)return s;
 s={id:c.id,cut:c.cut||(typeof coatCut==='function'?coatCut(c.id):null)||'tabard',F:usCoatR(L.c1),K:usCoatR(L.c2),em:L.emblem,c1:L.c1,c2:L.c2,dv:L.div||'plain',c3:L.c3||null,sig:k};USC_SP.set(k,s);return s}
function usCoatOfMerc(m){if(typeof coatOf!=='function')return null;const id=coatOf(m);if(!id)return null;return usCoatSpec({id,cut:coatCut(id),liv:mercLivery(m)})}
/* the look-cache signature of what a unit wears over its armor ('' = no coat) */
function usCoatSig(u){if(typeof unitCoat!=='function'||!u)return'';const c=unitCoat(u);return c?c.id+'|'+c.liv.sig:''}
/* ---- emblem glyphs: EMBLEMS rows (16x16: '#' charge, '+' its light, '-' its shade, '=' a cut-out) resampled into w x h cells,
   fitted to the charge's own box. Rows of '#', '+', '-', '.' ---- */
const USC_GL=new Map();
function usEmGlyph(key,w,h){const id=key+':'+w+'x'+h;let g=USC_GL.get(id);if(g)return g;const E=typeof EMBLEMS==='object'?(EMBLEMS[key]||EMBLEMS.swords):null;
 if(!E){g=[];for(let y=0;y<h;y++)g.push('.'.repeat(w));USC_GL.set(id,g);return g}const R=E.r,on=ch=>ch==='#'||ch==='+'||ch==='-'||ch==='l',tn=ch=>ch==='+'||ch==='l'?1:ch==='-'?-1:0;
 let x0=16,y0=16,x1=-1,y1=-1,fill=0;for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(on(R[y][x])){fill++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
 if(x1<0){x0=y0=0;x1=y1=15}const bw=x1-x0+1,bh=y1-y0+1,s=Math.max(bw/w,bh/h),ox=x0+(bw-s*w)/2,oy=y0+(bh-s*h)/2,N=5,cov=[],ton=[];
 for(let ty=0;ty<h;ty++)for(let tx=0;tx<w;tx++){let n=0,t=0;for(let j=0;j<N;j++)for(let i=0;i<N;i++){const sx=Math.floor(ox+(tx+(i+.5)/N)*s),sy=Math.floor(oy+(ty+(j+.5)/N)*s);
   const ch=sx>=0&&sy>=0&&sx<16&&sy<16?R[sy][sx]:'.';if(on(ch)){n++;t+=tn(ch)}}cov.push(n/(N*N));ton.push(n?t/n:0)}
 const want=fill/(bw*bh)*w*h;let th=.42,cnt=cov.filter(v=>v>=th).length;while(th>.16&&cnt<want*.72){th-=.06;cnt=cov.filter(v=>v>=th).length}
 g=[];for(let ty=0;ty<h;ty++){let r='';for(let tx=0;tx<w;tx++){const i=ty*w+tx;r+=cov[i]<th?'.':ton[i]>.34?'+':ton[i]<-.34?'-':'#'}g.push(r)}USC_GL.set(id,g);return g}
/* paint a glyph in the charge ramp into the current part, box at (x,y) */
function usEmPaint(gl,x,y,K){for(let j=0;j<gl.length;j++){const r=gl[j];for(let i=0;i<r.length;i++){const ch=r[i];if(ch==='.')continue;usP(x+i,y+j,K,ch==='+'?1:ch==='-'?-1:0)}}}
/* ---- the coat on the battle figure, after the torso and the armor skirt (73-units.js usHuman / usHumanStand) ---- */
const USC_LEN={tabard:2,quilted:3,mantle:2,jinbaori:3};
function usCoat(S,A,v,P,x0,ty){const C=S.coat;if(!C||S.b.big)return;const b=S.b,tw=b.tw,th=b.th,ll=b.ll,x1=x0+tw-1,y1=ty+th-1,F=C.F,K=C.K,cut=C.cut,
 fc=v?x0+Math.round(tw*.4)-1:x0+Math.round(tw*.6),by=ty+th-(th>=8?2:1),sw=P.st==='walk'?((P.fr&1)?0:(P.fr&2?1:-1)):0,long=cut==='surcoat'||cut==='herald',
 open=cut==='tabard'||cut==='mantle',slit=open?(v?x1:x0):null,jin=cut==='jinbaori',gap=x=>jin&&v===0&&(x===fc||x===fc-1),edge=x=>cut==='herald'&&(x===x0||x===x1);
 usPart();const cz=usZ;
 // body: the shoulder line keeps the armor's collar showing in front; open cuts keep the armor at the near side
 for(let y=ty;y<=y1;y++)for(let x=x0;x<=x1;x++){if(y===ty&&(x===x0||x===x1||(v===0&&(x===fc||x===fc-1))))continue;if(x===slit&&y>ty+1)continue;if(gap(x))continue;
  let bi=cut==='quilted'?((((x+y)&3)===0||((x-y)&3)===0)?-1:0):0;if(y===ty&&!v)bi+=1;usP(x,y,edge(x)?K:F,bi)}
 if(jin&&v===0){for(let y=ty;y<=y1;y++){usP(fc-2,y,K,0);usP(fc+1,y,K,-1)}}
 // the skirt below the waist: long cuts reach the boots, split at the front, flare and swing on the march
 const n0=long?Math.max(2,ll-2):USC_LEN[cut]||2,y0=ty+th;
 for(let j=0;j<n0;j++){const y=y0+j;if(y>-2)break;const t=j/Math.max(1,n0-1),ex=long&&t>.5?1:0,sh=long&&t>.4?sw:0,last=j===n0-1||y===-2;
  for(let x=x0-ex;x<=x1+ex;x++){const xx=x+sh;if(x===slit)continue;if(gap(x))continue;if(long&&v===0&&j>=1&&(x===fc))continue;if(cut==='herald'&&last&&((x+j)&1))continue;
   let bi=last?-1:0;if(cut==='quilted'&&((((x+y)&3)===0||((x-y)&3)===0)))bi-=1;if(long&&!last&&(x===x0+1||x===x1-1)&&j>0)bi-=1;usP(xx,y,cut==='herald'&&(last||x===x0-ex||x===x1+ex)?K:F,bi)}
  if(jin&&v===0){usP(fc-2,y,K,0);usP(fc+1,y,K,-1)}}
 // the shoulder cape of the mantled tabard, trimmed in the charge colour
 if(cut==='mantle'){usPart();for(let y=ty-1;y<=ty+1;y++)for(let x=x0-1;x<=x1+1;x++){if(y===ty-1&&(x<x0+1||x>x1-1||(v===0&&(x===fc||x===fc-1))))continue;usP(x,y,y===ty+1?K:F,y===ty+1?((x&1)?-1:0):0)}}
 // belt over the coat (the gift's sash when there is one)
 const res=S.res?USR[S.res]:null;if(!jin&&!S.nobelt){const br=res||S.sashR||USR.dleather;usPart();for(let x=x0;x<=x1;x++)if(x!==slit||true)usP(x,by,br,0);
  if(res){const sx=v?x1-1:x0+1;usP(sx,by+1,res,0);usP(sx,by+2,res,-1);usF(fc,by,'r')}else usF(fc,by,'c')}
 // the emblem on the chest (front) and the back; the jinbaori wears its mon on the back only, large
 const top=(cut==='mantle'?ty+2:ty+1)+(v?1:0),eh=clamp(by-top,3,6),ew=tw>=10?6:tw>=8?5:4;
 if(v===1&&S.cape)return;   // a cloak over the back: usCoatCape puts the emblem on it
 if(jin&&v===0)return;
 const W=jin?Math.min(tw-1,ew+1):ew,H=jin?Math.min(eh+1,y1-top):eh,ex0=x0+((tw-W+(v?0:1))>>1),ey0=top;
 if(US_EM.on&&!S._lie){US_EM.L.push({x:ex0+usOX,y:ey0+usOY,w:W,h:H,z:cz,C});return}   // Detail High: the emblem is painted at HD resolution over the coat (usCoatHD)
 usPart(1);usEmPaint(usEmGlyph(C.em,W,H),ex0,ey0,K)}
/* HD emblems: usBuild collects the stamps (grid coords, the coat's part) while it draws, then paints each glyph at twice the art
   resolution over the HD figure where the coat itself shows (parts in front keep covering it), with a dark stitched edge. */
const US_EM={on:false,L:[]};
function usCoatHDBegin(){US_EM.L.length=0;US_EM.on=typeof uhOn==='function'&&uhOn()}
function usCoatHD(o,d,mir){const L=US_EM.L;US_EM.on=false;if(!L.length||!o||!o.cv||typeof UHD!=='object'||!UHD.src)return;const g=usG,cv=o.cv,W=cv.width,H=cv.height,X0=d.ax-o.ax,Y0=d.ay-o.ay,q=cv.getContext('2d');if(!q||!q.getImageData)return;
 for(const st of L){const gx=mir?g.w-st.x-st.w:st.x,X=(gx-X0)*2,Y=(st.y-Y0)*2,w=st.w*2,h=st.h*2,gl=usEmGlyph(st.C.em,w,h),K=st.C.K.t,Fk=st.C.F.t;
  const x0=Math.max(0,X-1),y0=Math.max(0,Y-1),x1=Math.min(W,X+w+1),y1=Math.min(H,Y+h+1);if(x1<=x0||y1<=y0)continue;let im;try{im=q.getImageData(x0,y0,x1-x0,y1-y0)}catch(e){continue}
  const D=new Uint32Array(im.data.buffer),iw=x1-x0,P=uhC,on=(i,j)=>{if(i<0||j<0||i>=w||j>=h)return false;const c=gl[j][mir?w-1-i:i];return c!=='.'},own=(XX,YY)=>{const s=UHD.src[YY*W+XX];return s>=0&&g.Z[s]===st.z};
  for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){if(!own(xx,yy))continue;const i=xx-X,j=yy-Y,k=(yy-y0)*iw+(xx-x0);
   if(on(i,j)){const c=gl[j][mir?w-1-i:i];let t=c==='+'?2:c==='-'?0:1;if(!on(i-1,j)||!on(i,j-1))t=Math.min(2,t+(c==='-'?1:0));if(!on(i+1,j)||!on(i,j+1))t=Math.max(0,t-(c==='+'?1:0));D[k]=P(K[t])}
   else if(on(i-1,j)||on(i+1,j)||on(i,j-1)||on(i,j+1))D[k]=P(Fk[0])}
  q.putImageData(im,x0,y0)}
 L.length=0}
/* the HD figure could not be made: paint the stamps into the grid at art resolution instead */
function usCoatLo(mir){const L=US_EM.L;US_EM.on=false;for(const st of L){const gl=usEmGlyph(st.C.em,st.w,st.h),g=mir?gl.map(r=>r.split('').reverse().join('')):gl,gx=mir?usG.w-st.x-st.w:st.x;usPart(1);usEmPaint(g,gx-usOX,st.y-usOY,st.C.K)}L.length=0}
/* the emblem on a cloak seen from behind (the house captain's cape) */
function usCoatCape(S,x0,ty){const C=S.coat;if(!C||S.b.big)return;const tw=S.b.tw,ew=tw>=10?6:tw>=8?5:4,eh=Math.min(6,S.b.th-1),ex=x0+((tw-ew)>>1);
 if(US_EM.on&&!S._lie){US_EM.L.push({x:ex+usOX,y:ty+2+usOY,w:ew,h:eh,z:usZ,C});return}usPart(1);usEmPaint(usEmGlyph(C.em,ew,eh),ex,ty+2,C.K)}
/* house soldiers: the house coat, and the gear in the house colours (shield faces, hoods, the plume and the captain's cape); no brigand masks */
function usHouseDress(S,u,c){const sp=usCoatSpec(c);if(!sp||S.kind!=='hum')return S;S=Object.assign({},S);S.coat=sp;S.A=null;S.shR=sp.F;
 if(S.hat==='hood')S.hatR=sp.F;if(S.hat==='feather'||S.hat==='band')S.hatR=sp.K;if(S.cape)S.cape=sp.F;if(S.mask)S.mask=0;
 if(u&&u.eid==='thug'&&!S.hat){S.hat='kettle';S.hatR=null}
 if(S.mid===usGarb)S.mid=null;return S}
/* ---- the 16 px item icon: the coat laid flat in the livery (front; the jinbaori from the back, its mon large) ---- */
function usCoatIconRows(id,liv){const k='c'+id+'|'+(liv&&liv.sig);let r=US_WI.get(k);if(r)return r;const sp=usCoatSpec({id,liv});if(!sp)return null;const F=sp.F,K=sp.K,cut=sp.cut;
 usBeginAt(16,16,0,0);usPart();const long=cut==='surcoat'||cut==='herald',bot=long?15:cut==='quilted'?14:cut==='jinbaori'?14:13;
 for(let y=1;y<=bot;y++){const sh=y<=2?2:y<=3?1:0,flare=long&&y>=11?1:0;let a=2+sh-flare,b=13-sh+flare;if(cut==='mantle'&&y<=4){a=1;b=14}if(cut==='jinbaori'&&y<=3){a=1;b=14}
  for(let x=a;x<=b;x++){if(y<=2&&x>=6&&x<=9&&cut!=='jinbaori')continue;if(y===3&&x>=7&&x<=8&&cut!=='jinbaori')continue;if(long&&y>=11&&x>=7&&x<=8)continue;if(cut==='herald'&&y===bot&&(x&1))continue;
   let bi=0,R=F;if(cut==='quilted'&&((((x+y)&3)===0||((x-y)&3)===0)))bi=-1;if(cut==='herald'&&(x===a||x===b||y===bot))R=K;if(cut==='mantle'&&y===4)R=K;if(y===bot)bi-=1;usP(x,y,R,bi)}}
 if(cut!=='jinbaori'&&cut!=='herald'){usPart();const yb=cut==='mantle'?11:10;for(let x=3;x<=12;x++)usP(x,yb,USR.dleather,0);usF(8,yb,'c')}
 const gl=cut==='herald'||cut==='jinbaori'?usEmGlyph(sp.em,8,8):usEmGlyph(sp.em,6,cut==='mantle'?5:6);usPart(1);usEmPaint(gl,cut==='herald'||cut==='jinbaori'?4:5,cut==='mantle'?5:cut==='herald'||cut==='jinbaori'?3:4,K);
 r=usResolveKeys(usG,0);US_WI.set(k,r);return r}

/* ================= SURCOATS ON THE PORTRAITS (32x32 busts) =================
   ptMercSpec / ptEnemyRows set P.coat = usCoatSpec(...): ptCoatLayer(P) is the coat over the torso (rows 22..31), shoulders and collar
   of the armor left showing; ptCoatEm(P) is the emblem placement {x, y, w, h, rows} (8x8 cells, its 16x16 drawing at HD). */
function ptCoatBox(P){const W={normal:13,slim:12,broad:15,huge:16}[P.build||'normal']||13;return{a:16-W+3,b:15+W-3}}
function ptCoatLayer(P){const c=P.coat;if(!c)return null;const L=ptL(),F=c.F.t,K=c.K.t,cut=c.cut,bx=ptCoatBox(P),jin=cut==='jinbaori',W=PT_TORSO[P.build||'normal']||PT_TORSO.normal;
 const T=y=>{const w=W[clamp(y-22,0,9)];return[Math.max(0,16-w),Math.min(31,15+w)]};
 for(let y=23;y<32;y++){const t=T(y);let a=Math.max(t[0]+2,bx.a-(y>27?1:0)),b=Math.min(t[1]-2,bx.b+(y>27?1:0));if(cut==='mantle'&&y<=25){a=t[0];b=t[1]}
  for(let x=a;x<=b;x++){const neck=y<=24&&x>=13&&x<=18&&!(cut==='mantle'&&y===25),vee=y<=25&&Math.abs(x-15.5)<(26-y)*1.2;if(!jin&&(neck||vee))continue;if(jin&&x>=14&&x<=17)continue;
   let k=x<=a?F[2]:x>=b-1?F[0]:F[1];if(cut==='quilted'&&((x+y)%4===0||(x-y+32)%4===0))k=F[0];if(cut==='herald'&&(x===a||x===b))k=K[1];if(cut==='mantle'&&y===25)k=x&1?K[0]:K[1];
   if(jin&&(x===13||x===18))k=K[x===13?2:0];if(cut==='mantle'&&y<25&&y>=23)k=x<=a+1?F[2]:x>=b-1?F[0]:F[1];ptS(L,x,y,k)}}
 if(cut!=='jinbaori'){for(let x=bx.a;x<=bx.b;x++)if(ptG(L,x,31)!=='.')ptS(L,x,31,x===15?'c':x<16?'j':'i')}   // the belt at the frame's lower edge
 return ptOut(L)}
function ptCoatEm(P){const c=P.coat;if(!c||c.cut==='jinbaori')return null;const w=8,h=c.cut==='mantle'?5:6,x=16-(w>>1),y=c.cut==='mantle'?26:25;return{x,y,w,h,rows:usEmGlyph(c.em,w,h),K:c.K.t,em:c.em,c1:c.c1,c2:c.c2}}
function ptCoatEmPaint(C,P){const E=ptCoatEm(P);if(!E)return;for(let j=0;j<E.h;j++)for(let i=0;i<E.w;i++){const ch=E.rows[j][i];if(ch==='.')continue;ptS(C,E.x+i,E.y+j,ch==='+'?E.K[2]:ch==='-'?E.K[0]:E.K[1])}}
/* a foe's portrait: the coat its battle figure wears (house soldiers), and their gear in the same colours */
function ptUnitCoat(x){if(typeof unitCoat!=='function')return null;const c=unitCoat(x);return c?usCoatSpec(c):null}
function ptCoatDress(P,co){P.coat=co;const F=co.F.t.split(''),K=co.K.t.split('');if(P.shield)P.shC=F;if(P.hat==='hood')P.hatC=F;else if(P.hat==='feather'||P.hat==='band')P.hatC=K;if(P.over&&P.hat==='hood')P.over=null;   // no brigand's mask under the house's colours
 if(P.armor==='rags'&&!P.hat)P.hat='kettle';return P}
/* the HD bust (07h-portraitshd.js): the emblem at full resolution, 16x16 HD px over the coat's 8x8 cells (its rows from EMBLEMS, outlined
   in the field's shade), painted where the coat layer owns the pixel */
function phCoatEm(D,P,O){const E=ptCoatEm(P);if(!E||typeof phK!=='function')return;const N=64,w=E.w*2,h=E.h*2,gl=usEmGlyph(E.em,w,h),K=E.K,dk=phK(P.coat.F.t[0]),X0=E.x*2,Y0=E.y*2;
 const on=(i,j)=>i>=0&&j>=0&&i<w&&j<h&&gl[j][i]!=='.';
 for(let j=-1;j<=h;j++)for(let i=-1;i<=w;i++){const X=X0+i,Y=Y0+j;if(X<0||Y<0||X>=N||Y>=N)continue;const k=Y*N+X;if(O&&O[k]!==2)continue;
  if(on(i,j)){const c=gl[j][i];let t=c==='+'?2:c==='-'?0:1;if(!on(i-1,j)||!on(i,j-1))t=Math.min(2,t+1);else if(!on(i+1,j)||!on(i,j+1))t=Math.max(0,t-1);D[k]=phSh(phK(K[t]),t===2&&!on(i-1,j-1)?.5:0)}
  else if(on(i-1,j)||on(i+1,j)||on(i,j-1)||on(i,j+1))D[k]=dk}}

/* ================= THE PAINTED SURCOAT ICON (Detail High; 06p-iconspaint.js kit) =================
   The coat laid flat in the livery: the field's ramp as a cloth material, trims and the emblem in the charge colour. The emblem is
   its EMBLEMS drawing cell by cell (an embroidered charge), inked round its silhouette. coatIconName (47-tailor.js) registers it. */
function pkcLivMat(c){const B=typeof BANNERC==='object'&&BANNERC[c],r=B?B.r:['f','g','h'],h=k=>PAL[k]||'#888888',mix=(a,b,t)=>{const p=parseInt(a.slice(1),16),q=parseInt(b.slice(1),16),f=(s)=>Math.round(((p>>s)&255)*(1-t)+((q>>s)&255)*t);return'#'+((1<<24)|(f(16)<<16)|(f(8)<<8)|f(0)).toString(16).slice(1)};
 return[mix(h(r[0]),'#05070a',.45),h(r[0]),h(r[1]),h(r[2]),mix(h(r[2]),'#ffffff',.45)]}
const PKC_COAT={
 tabard:'M10 3 L13.4 3 Q16 6.2 18.6 3 L22 3 L23.4 6.4 L23 27.6 L17 27.6 L16 25 L15 27.6 L9 27.6 L8.6 6.4 Z',
 surcoat:'M9.6 2.6 L13.2 2.6 Q16 6 18.8 2.6 L22.4 2.6 L24 6.4 L23.6 15 L26.4 30.4 L17.2 30.4 L16 21 L14.8 30.4 L5.6 30.4 L8.4 15 L8 6.4 Z',
 quilted:'M9 3.4 L13.2 3.4 Q16 6.6 18.8 3.4 L23 3.4 L27.2 7 L25.4 11.6 L24 10.8 L24.2 27 L7.8 27 L8 10.8 L6.6 11.6 L4.8 7 Z',
 mantle:'M10 3 L13.4 3 Q16 6.2 18.6 3 L22 3 L23.4 6.4 L23 27.6 L17 27.6 L16 25 L15 27.6 L9 27.6 L8.6 6.4 Z',
 herald:'M9.6 2.6 L13.2 2.6 Q16 6 18.8 2.6 L22.4 2.6 L24 6.4 L23.6 15 L26.4 29 L5.6 29 L8.4 15 L8 6.4 Z',
 jinbaori:'M4.6 4 L27.4 4 L29 9.4 L25.4 10.6 L26 29.4 L6 29.4 L6.6 10.6 L3 9.4 Z'};
function pkcEmblemCells(g,key,cx,cy,size,M){const gl=usEmGlyph(key,16,16),s=size/16,x0=cx-size/2,y0=cy-size/2;
 g.save();g.fillStyle=PK.ink;for(let j=0;j<16;j++)for(let i=0;i<16;i++)if(gl[j][i]!=='.')g.fillRect(x0+i*s-.45,y0+j*s-.45,s+.9,s+.9);   // the inked edge
 for(let j=0;j<16;j++)for(let i=0;i<16;i++){const c=gl[j][i];if(c==='.')continue;g.fillStyle=c==='+'?M[3]:c==='-'?M[1]:M[2];g.fillRect(x0+i*s,y0+j*s,s+.05,s+.05)}
 for(let j=0;j<16;j++)for(let i=0;i<16;i++)if(gl[j][i]!=='.'&&(j===0||gl[j-1][i]==='.')){g.fillStyle=M[4];g.globalAlpha=.55;g.fillRect(x0+i*s,y0+j*s,s,s*.35);g.globalAlpha=1}
 g.restore()}
function pkcCoat(g,id,liv){const sp=usCoatSpec({id,liv});if(!sp)return;const F=pkcLivMat(sp.c1),K=pkcLivMat(sp.c2),cut=sp.cut,S=pkS(PKC_COAT[cut]||PKC_COAT.tabard),T=PK.lw*.8;
 pkFill(g,S,F,{k:1.6,inside:(g,m)=>{
  if(cut==='quilted')pkcPattern(g,m,{pat:'quilt'},4,3,28,28);
  if(cut==='surcoat'||cut==='herald')pkLine(g,'M11.4 17 Q10.6 24 9.6 30 M20.6 17 Q21.4 24 22.4 30',.7,m[1],.6);
  if(cut==='herald'){pkLine(g,PKC_COAT.herald,2.2,K[2],1);let d='M5.6 29';for(let x=5.6;x<26.4;x+=2.08)d+=` L${x+1.04} 26.8 L${x+2.08} 29`;pkFill(g,pkS(d+' L26.4 30.6 L5.6 30.6 Z'),K,{k:.4,lw:T})}
  if(cut==='jinbaori'){pkFill(g,pkS('M4.6 4 L27.4 4 L29 9.4 L25.4 10.6 L6.6 10.6 L3 9.4 Z'),F,{k:.5,lw:T});pkLine(g,'M6.6 10.6 L25.4 10.6',1.2,K[2],1)}
  if(cut!=='jinbaori'&&cut!=='herald'){const by=cut==='quilted'?20:19.6;pkFill(g,pkRect(7.6,by,16.8,2.4,0),'leather',{k:.4,lw:T});pkFill(g,pkRect(14.4,by-.3,3.2,3,.6),'brass',{k:.3,lw:.6})}}});
 if(cut==='mantle')pkFill(g,pkS('M7 3.4 L13.4 3.4 Q16 7 18.6 3.4 L25 3.4 L28 10.6 Q16 14.6 4 10.6 Z'),F,{k:.8,inside:(g,m)=>pkLine(g,'M4.4 10.4 Q16 14.4 27.6 10.4',1.6,K[2],1)});
 const big=cut==='herald'||cut==='jinbaori',cy=cut==='mantle'?16.4:big?15.6:12.4;pkcEmblemCells(g,sp.em,16,cy,big?13:cut==='mantle'?8.6:10,K)}
