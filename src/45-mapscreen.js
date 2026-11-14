/* ================= MAP SCREEN (full-screen cartographer's map, route planning, world HUD glyphs) =================
   openMap() / closeMap(quiet) / mapOpen(); M toggles it, Escape closes it. While open sheetOpen is true (the world pauses).
   Everything is drawn in code from PAL: the terrain sheet is MP.tp art px per tile (4..6, picked so the whole world fits best),
   shown at an integer number of device px per art px (MP.z); markers, labels, the frame, cartouche and compass are drawn at
   the UI scale MP.us (device px per UI art px) and do not grow with zoom.
   Interfaces used when they exist (typeof checks at call time): worldKeyColor, seenAt, W.fogRev, W.river, W.road, G.sites,
   town.size, routeTo, setRoute, G.route, G.weather. Fallbacks: own colour table, everything known, findPath + terrain speeds,
   and a small waypoint queue (mapRouteTick) that marches on after each arrival.
   Route: MP.wps = [{x,y,dest,kind,ref,label}], MP.legs = [{path,hours}] (leg i ends at wps[i]). */
const MP={open:false,root:null,cv:null,q:null,d:1,us:1,tp:4,z:1,zf:1,zmax:1,cx:0,cy:0,cw:0,ch:0,inner:{x:0,y:0,w:1,h:1},view:{x:0,y:0,w:1,h:1},
 wps:[],legs:[],sel:null,labels:true,roads:true,legend:false,terr:null,terrKey:'',lab:null,labKey:'',inc:null,incKey:'',
 dirty:true,raf:0,frame:0,ptr:new Map(),gs:null,queue:null,qTimer:0,qBattle:false,wxSig:'',MAXWP:8,F:6};
const MPTERR=['Open water','Grassland','Forest','Hills','Mountains','Marsh','Desert','Snowfield'];
const MPKEY=['X','v','B','m','o','7','d','q'];            // fallback terrain colours (PAL keys) by terrain code
const MPSIZE=['','Hamlet','Town','City'];

/* ---- helpers ---- */
function mpHash(x,y,s){let n=Math.imul(x+11,374761393)+Math.imul(y+7,668265263)+Math.imul((s|0)+3,1274126177)|0;n=Math.imul(n^n>>>13,1274126177);return((n^n>>>16)>>>0)/4294967296}
function mpSeen(tx,ty){if(tx<0||ty<0||tx>=WN||ty>=WN)return false;if(typeof seenAt==='function'){try{return!!seenAt(tx,ty)}catch(e){return true}}return true}
function mpSeenW(wx,wy){return mpSeen(Math.floor(wx/TS),Math.floor(wy/TS))}
function mpBase(t){let k=null;if(typeof worldKeyColor==='function'){try{k=worldKeyColor(t,0,0)}catch(e){}}return typeof k==='string'&&PAL[k]?k:MPKEY[t]||'v'}
function mpEsc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function mpFmtHours(h){h=Math.max(0,+h||0);if(h<.75)return'under an hour';let d=Math.floor(h/24),r=Math.round(h-d*24);if(r>=24){d++;r=0}
 const ds=d?d+(d===1?' day':' days'):'',hs=r?r+(r===1?' hour':' hours'):'';return ds&&hs?ds+' '+hs:ds||hs||'under an hour'}
function mpTownSize(t){const s=t&&+t.size;return s===1||s===3?s:2}
function mpRGB(k){const h=PAL[k]||'#000000',n=parseInt(h.slice(1),16);return[n>>16,n>>8&255,n&255]}

/* ---- 5x7 pixel font (rows top to bottom; lower case may carry two descender rows) ---- */
const MPFONT=(function(){const S={
 A:'.###./#...#/#...#/#####/#...#/#...#/#...#',B:'####./#...#/#...#/####./#...#/#...#/####.',C:'.###./#...#/#..../#..../#..../#...#/.###.',
 D:'####./#...#/#...#/#...#/#...#/#...#/####.',E:'#####/#..../#..../####./#..../#..../#####',F:'#####/#..../#..../####./#..../#..../#....',
 G:'.###./#...#/#..../#.###/#...#/#...#/.###.',H:'#...#/#...#/#...#/#####/#...#/#...#/#...#',I:'###/.#./.#./.#./.#./.#./###',
 J:'..###/...#./...#./...#./...#./#..#./.##..',K:'#...#/#..#./#.#../##.../#.#../#..#./#...#',L:'#..../#..../#..../#..../#..../#..../#####',
 M:'#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',N:'#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',O:'.###./#...#/#...#/#...#/#...#/#...#/.###.',
 P:'####./#...#/#...#/####./#..../#..../#....',Q:'.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',R:'####./#...#/#...#/####./#.#../#..#./#...#',
 S:'.####/#..../#..../.###./....#/....#/####.',T:'#####/..#../..#../..#../..#../..#../..#..',U:'#...#/#...#/#...#/#...#/#...#/#...#/.###.',
 V:'#...#/#...#/#...#/#...#/#...#/.#.#./..#..',W:'#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',X:'#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
 Y:'#...#/#...#/.#.#./..#../..#../..#../..#..',Z:'#####/....#/...#./..#../.#.../#..../#####',
 a:'..../..../.##./...#/.###/#..#/.###',b:'#.../#.../###./#..#/#..#/#..#/###.',c:'..../..../.###/#.../#.../#.../.###',
 d:'...#/...#/.###/#..#/#..#/#..#/.###',e:'..../..../.##./#..#/####/#.../.###',f:'..##/.#../###./.#../.#../.#../.#..',
 g:'..../..../.###/#..#/#..#/.###/...#/.##.',h:'#.../#.../###./#..#/#..#/#..#/#..#',i:'#/./#/#/#/#/#',j:'.#/../.#/.#/.#/.#/.#/#.',
 k:'#.../#.../#..#/#.#./##../#.#./#..#',l:'#/#/#/#/#/#/#',m:'...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#',
 n:'..../..../###./#..#/#..#/#..#/#..#',o:'..../..../.##./#..#/#..#/#..#/.##.',p:'..../..../###./#..#/#..#/###./#.../#...',
 q:'..../..../.###/#..#/#..#/.###/...#/...#',r:'.../.../#.#/##./#../#../#..',s:'..../..../.###/#.../.##./...#/###.',
 t:'.#./.#./###/.#./.#./.#./..#',u:'..../..../#..#/#..#/#..#/#..#/.###',v:'...../...../#...#/#...#/#...#/.#.#./..#..',
 w:'...../...../#...#/#.#.#/#.#.#/#.#.#/.#.#.',x:'..../..../#..#/#..#/.##./#..#/#..#',y:'..../..../#..#/#..#/#..#/.###/...#/.##.',
 z:'..../..../####/...#/.##./#.../####',
 0:'.##./#..#/#..#/#..#/#..#/#..#/.##.',1:'.#./##./.#./.#./.#./.#./###',2:'.##./#..#/...#/..#./.#../#.../####',3:'###./...#/...#/.##./...#/...#/###.',
 4:'#..#/#..#/#..#/####/...#/...#/...#',5:'####/#.../###./...#/...#/#..#/.##.',6:'.##./#.../#.../###./#..#/#..#/.##.',7:'####/...#/...#/..#./.#../.#../.#..',
 8:'.##./#..#/#..#/.##./#..#/#..#/.##.',9:'.##./#..#/#..#/.###/...#/...#/.##.',
 ' ':'../../../../../../..','.':'././././././#',',':'../../../../../.#/.#/#.',"'":'#/#/././././.','-':'.../.../.../###/.../.../...',
 ':':'././#/././#/.','!':'#/#/#/#/#/./#','?':'.##./#..#/...#/..#./.#../..../.#..'};
 const o={};for(const k in S){const rows=S[k].split('/');o[k]={w:rows[0].length,rows}}return o})();
function mpTextW(s){let w=0;for(const c of String(s))w+=(MPFONT[c]||MPFONT['?']).w+1;return Math.max(0,w-1)}
const MPTH=11;                                           // text sprite height in art px: halo + 7 + 2 descender + halo
/* text as PAL rows (1px halo all round when halo is a PAL key) */
function mpTextRows(s,col,halo){const w=mpTextW(s)+2,G2=[];for(let y=0;y<MPTH;y++)G2.push(new Array(w).fill('.'));let x=1;
 for(const c of String(s)){const gl=MPFONT[c]||MPFONT['?'];for(let y=0;y<gl.rows.length;y++){const r=gl.rows[y];for(let i=0;i<gl.w;i++)if(r[i]==='#')G2[y+1][x+i]=col}x+=gl.w+1}
 if(halo){const src=G2.map(r=>r.slice());for(let y=0;y<MPTH;y++)for(let i=0;i<w;i++){if(src[y][i]!=='.')continue;let near=false;
   for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++){const r=src[y+dy];if(r&&r[i+dx]&&r[i+dx]!=='.'){near=true;break}}if(near)G2[y][i]=halo}}
 return G2.map(r=>r.join(''))}
function mpTextCv(s,col,halo,sc){return pxScaled('mpt:'+s+'|'+col+'|'+(halo||''),mpTextRows(s,col,halo),sc)}

/* ---- sprites (PAL rows, already outlined) ---- */
const MPS={
 hamlet:['.000.','0rll0','0l0l0','0llm0','.000.'],
 town:['.00000.','0rllll0','0lgggl0','0lgfgl0','0lgggm0','0llmmm0','.00000.'],
 city:['00.000.00','0e0ddd0e0','0ddddddd0','0dcgggcb0','0dcgfgcb0','0dcgggcb0','0dcccccb0','0dbbbbbb0','.0000000.'],
 company:['.00......','0k000000.','0keyyycc0','0kyyccc0.','0kyccc0..','0kyyccc0.','0kyyyccb0','0k000000.','0i0......','0i0......','.0.......'],
 pin:['..00000..','.0hgggf0.','0hgggggf0','0ggggggf0','0ggggggf0','0ggggggf0','0ggggggf0','.0ggggf0.','..0ggf0..','...0f0...','....0....'],
 lair:['..00000..','.0hgggg0.','0hgggggf0','0g00g00f0','0g00g00f0','0ggg0ggf0','.0ggggf0.','.0g0g0f0.','..00000..'],
 turnin:['..00000..','.0edddc0.','0edc0ccb0','0dcc0ccb0','0dcc0ccb0','0dcccccb0','0dcc0cbb0','.0cbbbb0.','..00000..'],
 portal:['..000..','.0CCC0.','0CDDDC0','0CDrDC0','0CDFDC0','0CDDDD0','.0CDD0.','..000..'],
 portal2:['..000..','.0CCC0.','0CDDDC0','0CDFDC0','0CDrDC0','0CDDDD0','.0CDD0.','..000..'],
 ruin:['.00....','0qp0.0.','0qp00q0','0qp00p0','0qp00p0','0nnnnn0','.00000.'],
 cross:['00...00','0g0.0g0','.0g0g0.','..0g0..','.0g0g0.','0g0.0g0','00...00']
};
const MPS_CO=MPS.company.slice();
function mpHalo(r){return(function(r){const w=r[0].length,p=['.'.repeat(w+2)].concat(r.map(x=>'.'+x+'.'),['.'.repeat(w+2)]),h=p.length,on=(x,y)=>y>=0&&y<h&&x>=0&&x<w+2&&p[y][x]!=='.';
 return p.map((row,y)=>{let o='';for(let x=0;x<w+2;x++)o+=on(x,y)?row[x]:(on(x-1,y)||on(x+1,y)||on(x,y-1)||on(x,y+1))?'e':'.';return o})})(r)}
MPS.company=mpHalo(MPS_CO);
/* the company's flag in its banner colour (c1) */
function mpCompanyRows(){const b=G&&G.banner,R=b&&typeof BANNERC!=='undefined'&&BANNERC[b.c1]?BANNERC[b.c1].r:null;if(!R)return{k:'company',rows:MPS.company};
 const m={e:R[2],y:R[1],c:R[0],b:R[0]};return{k:'company'+R.join(''),rows:mpHalo(MPS_CO.map(r=>r.split('').map(c=>m[c]||c).join('')))}}
const MPDIG=['###/#.#/#.#/#.#/###','.#./##./.#./.#./###','###/..#/###/#../###','###/..#/.##/..#/###','#.#/#.#/###/..#/..#','###/#../###/..#/###','###/#../###/#.#/###','###/..#/..#/.#./.#.','###/#.#/###/#.#/###','###/#.#/###/..#/###'];
function mpPinRows(n){const rows=MPS.pin.map(r=>r.split('')),d=MPDIG[n%10].split('/');for(let y=0;y<5;y++)for(let x=0;x<3;x++)if(d[y][x]==='#')rows[y+2][x+3]='r';return rows.map(r=>r.join(''))}
function mpOutline(rows){const h=rows.length,w=rows[0].length,on=(x,y)=>y>=0&&y<h&&x>=0&&x<w&&rows[y][x]!=='.';
 return rows.map((r,y)=>{let s='';for(let x=0;x<w;x++)s+=on(x,y)?r[x]:(on(x-1,y)||on(x+1,y)||on(x,y-1)||on(x,y+1))?'0':'.';return s})}
/* compass rose, 25x25: brass kites, a madder north point */
const MPROSE=(function(){const N=25,c=12,g=[];for(let y=0;y<N;y++)g.push(new Array(N).fill('.'));const set=(x,y,k)=>{if(x>=0&&y>=0&&x<N&&y<N)g[y][x]=k};
 for(let t=2;t<=6;t++)for(const [sx,sy] of [[1,1],[1,-1],[-1,1],[-1,-1]]){set(c+sx*t,c+sy*t,sx>0?'b':'c');if(t<5)set(c+sx*t+(sx>0?-1:1)*0,c+sy*t+sy*-1,sx>0?'b':'c')}
 for(let t=1;t<=10;t++){const hw=t<=3?2:t<=7?1:0;for(let dx=-hw;dx<=hw;dx++){
   set(c+dx,c-t,dx<0?'h':dx>0?'f':'g');set(c+dx,c+t,dx<0?'d':dx>0?'b':'c');set(c-t,c+dx,dx<0?'d':dx>0?'b':'c');set(c+t,c+dx,dx<0?'d':dx>0?'b':'c')}}
 for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)set(c+x,c+y,x<0||y<0?'e':'c');set(c,c,'0');
 return mpOutline(g.map(r=>r.join('')))})();
/* rail icon: a folded map with a route and a cross (16x16, outlined at build) */
const MPICON={
 map:['................','................','..llll....llll..','..lvvlmmmmlvvl..','..lvvlmxxmlvvl..','..lvglmxmmlvvl..','..llglmmmmlggl..','..llgmmggmglll..','..lvlggmmgllll..','..lvvlmmmmlgxg..','..lvvlmxmmllgl..','..llllmmmmlgxg..','..llll....llll..','................','................','................'],
 'wx-sun':['................','.......y........','..y....y....y...','...y.......y....','.....edddd......','....edyyyyy.....','....dyyyyyY.....','.yy.dyyyyyY.yy..','....dyyyyyY.....','....yyyyyYY.....','.....yYYYY......','...y.......y....','..y....y....y...','.......y........','................','................'],
 'wx-moon':['................','................','......qqqq......','....qrrrq.......','...qrrrq........','...rrrq.........','..qrrrq.........','..qrrrq.........','..qrrrq.......q.','...rrrrq.....qp.','...qrrrrqqqqqp..','....qrrrrrrqp...','......qqqppp....','................','................','................'],
 'wx-dawn':['................','................','.......E........','..E....E....E...','...E.......E....','.....eddddd.....','....edyyyyyE....','....dyyyyyyE....','.EE.dyyyyyyE.EE.','................','.bbbbbbbbbbbbbb.','................','...bbbbbbbbbb...','................','................','................'],
 'wx-cloud':['................','................','................','......rrrr......','....rrrrrrr.....','...rrrrrrrrqq...','..rrrrrrrrrrqq..','.rrrrrrrrrrqqqp.','.rrrrrqqqqqqqpp.','..qqqqqqqppppp..','................','................','................','................','................','................'],
 'wx-rain':['................','......rrrr......','....rrrrrrr.....','...rrrrrrrrqq...','..rrrrrrrrrrqq..','.rrrrrqqqqqqqpp.','..qqqqqqqppppp..','................','...x...x...x....','..x...x...x.....','................','.....x...x...x..','....x...x...x...','................','................','................'],
 'wx-storm':['................','......pppp......','....ppppppp.....','...pppppppoo....','..ppppppppppoo..','.pppppoooooooGG.','..ooooooyyoGGG..','.......yy.......','..x...yyyy..x...','.x......yy.x....','.......yy.......','....x..y....x...','...x.......x....','................','................','................'],
 'wx-snow':['................','......rrrr......','....rrrrrrr.....','...rrrrrrrrqq...','..rrrrrrrrrrqq..','.rrrrrqqqqqqqpp.','..qqqqqqqppppp..','................','...r.....r......','..rrr...rrr..r..','...r..r..r..rrr.','.....rrr.....r..','......r.........','................','................','................'],
 'wx-fog':['................','................','................','...qqqqqqqqq....','................','.qqqqqqqqqqqqq..','................','...pppppppppppp.','................','.qqqqqqqqqq.....','................','....pppppppp....','................','................','................','................'],
 'wx-sand':['................','................','...........cc...','..ddddddddd..c..','............c...','.cccccccccccc...','................','....IIIIIIIIII..','..............I.','.dddddddd....I..','........ccccc...','................','...IIIIIII......','................','................','................']
};
(function(){try{if(typeof document==='undefined'||!document.head||!document.createElement||typeof pxURL!=='function')return;let css='';
 for(const n in MPICON){const u=pxURL('mpi:'+n,mpOutline(MPICON[n]),1);if(typeof u!=='string'||u.slice(0,5)!=='data:')return;css+='.pxi-'+n+'{background-image:url('+u+')}'}
 const st=document.createElement('style');st.id='mp-css';st.textContent=css;document.head.appendChild(st)}catch(e){}})();

/* ================= TERRAIN SHEET =================
   mpPaint(n, tp, o) -> {w, keys:Array} of PAL keys, tp art px per tile. o = {t(x,y), seen(x,y), river(x,y), road(x,y), roads} */
function mpPaint(n,tp,o){const S=n*tp,K=new Array(S*S),tAt=(x,y)=>x<0||y<0||x>=n||y>=n?0:o.t(x,y),sAt=(x,y)=>x>=0&&y>=0&&x<n&&y<n&&o.seen(x,y);
 const put=(X,Y,k)=>{if(X>=0&&Y>=0&&X<S&&Y<S)K[Y*S+X]=k};
 const land=new Uint8Array(S*S);            // 1 land, 0 water, 2 unknown
 for(let ty=0;ty<n;ty++)for(let tx=0;tx<n;tx++){const px0=tx*tp,py0=ty*tp,seen=sAt(tx,ty),t=tAt(tx,ty);
  if(!seen){for(let y=0;y<tp;y++)for(let x=0;x<tp;x++){const X=px0+x,Y=py0+y;K[Y*S+X]=(X+Y)%6===0?'m':'l';land[Y*S+X]=2}continue}
  const base=mpBase(t),h=mpHash(tx,ty,1),h2=mpHash(tx,ty,2),h3=mpHash(tx,ty,3);
  for(let y=0;y<tp;y++)for(let x=0;x<tp;x++){K[(py0+y)*S+px0+x]=base;land[(py0+y)*S+px0+x]=t?1:0}
  if(t&&t!==4){                                         // round the convex corners of the coast
   const wN=!tAt(tx,ty-1)&&sAt(tx,ty-1),wS=!tAt(tx,ty+1)&&sAt(tx,ty+1),wW=!tAt(tx-1,ty)&&sAt(tx-1,ty),wE=!tAt(tx+1,ty)&&sAt(tx+1,ty),wk=mpBase(0);
   const cut=(x,y)=>{K[(py0+y)*S+px0+x]=wk;land[(py0+y)*S+px0+x]=0};
   if(wN&&wW)cut(0,0);if(wN&&wE)cut(tp-1,0);if(wS&&wW)cut(0,tp-1);if(wS&&wE)cut(tp-1,tp-1)}
  const ox=px0+Math.floor(h2*(tp-2)),oy=py0+Math.floor(h3*(tp-2));       // glyph origin (3x3 box fits anywhere)
  if(tp<3){if(t===4&&h<.6)put(px0+(h2<.5?0:1),py0,'q');else if(t===2&&h<.5)put(px0+(h2<.5?0:1),py0+1,'7');continue}   // two art px a tile: a single glint at most
  if(t===0){if(h<.16){const X=px0+Math.floor(h2*(tp-1)),Y=py0+Math.floor(h3*tp);put(X,Y,'x');if(X+1<px0+tp)put(X+1,Y,'x')}}
  else if(t===1){if(h<.3)put(ox+1,oy+1,h<.15?'A':'w')}
  else if(t===2){put(ox+1,oy,'w');put(ox,oy+1,'w');put(ox+1,oy+1,'7');put(ox+2,oy+1,'7');put(ox+1,oy+2,'3');
   if(tp>=5&&h<.6){const ax=ox<px0+2?ox+3:ox-2,ay=oy<py0+2?oy+2:oy-1;if(ax>=px0&&ax+1<px0+tp&&ay>=py0&&ay+1<py0+tp){put(ax,ay,'w');put(ax,ay+1,'7');put(ax+1,ay+1,'3')}}}
  else if(t===3){put(ox,oy+1,'j');put(ox+1,oy,'j');put(ox+2,oy+1,'j');put(ox+1,oy+1,'l');if(h<.5)put(ox+2,oy+2,'k')}
  else if(t===4){const mx=px0+Math.floor(h2*(tp-3)),my=py0+tp-3-(tp>4&&h3<.5?1:0);put(mx+1,my,'r');put(mx,my+1,'q');put(mx+1,my+1,'p');put(mx+2,my+1,'G');put(mx,my+2,'p');put(mx+1,my+2,'G');put(mx+2,my+2,'G');if(mx+3<px0+tp)put(mx+3,my+2,'0')}
  else if(t===5){put(ox,oy+1,'5');put(ox+2,oy,'Z');if(h<.5){put(ox+1,oy+2,'X');put(ox+2,oy+2,'X')}}
  else if(t===6){put(ox,oy+1,'c');put(ox+1,oy,'c');if(h<.5)put(ox+2,oy+2,'I');if(h>.8)put(ox+2,oy,'e')}
  else if(t===7){put(ox+1,oy+1,'r');if(h<.4)put(ox,oy+2,'p');if(h>.7){put(ox+2,oy,'r');put(ox+2,oy+1,'p')}}}
 /* coast: dark line on the land side, pale shallows on the water side */
 const L=(X,Y)=>X<0||Y<0||X>=S||Y>=S?0:land[Y*S+X],edge=[];
 for(let Y=0;Y<S;Y++)for(let X=0;X<S;X++){const v=land[Y*S+X];
  if(v===1){if(L(X-1,Y)===0&&X>0||L(X+1,Y)===0&&X<S-1||L(X,Y-1)===0&&Y>0||L(X,Y+1)===0&&Y<S-1)edge.push(Y*S+X)}
  else if(v===0){let near=false;for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++)if(L(X+dx,Y+dy)===1){near=true;break}if(near)K[Y*S+X]='x'}
  else{if(L(X-1,Y)<2&&X>0||L(X+1,Y)<2&&X<S-1||L(X,Y-1)<2&&Y>0||L(X,Y+1)<2&&Y<S-1)K[Y*S+X]='k'}}
 for(const i of edge)K[i]='i';
 /* rivers and roads: from the tile centre to each linked edge */
 const c0=tp>>1,line=(tx,ty,m,fn)=>{const px0=tx*tp,py0=ty*tp;if(m&1)for(let y=0;y<=c0;y++)fn(px0+c0,py0+y);if(m&4)for(let y=c0;y<tp;y++)fn(px0+c0,py0+y);
  if(m&8)for(let x=0;x<=c0;x++)fn(px0+x,py0+c0);if(m&2)for(let x=c0;x<tp;x++)fn(px0+x,py0+c0)};
 if(o.river)for(let ty=0;ty<n;ty++)for(let tx=0;tx<n;tx++){const m=o.river(tx,ty);if(m&&sAt(tx,ty)&&tAt(tx,ty))line(tx,ty,m,(X,Y)=>put(X,Y,'x'))}
 if(o.road&&o.roads)for(let ty=0;ty<n;ty++)for(let tx=0;tx<n;tx++){const m=o.road(tx,ty);if(m&&sAt(tx,ty))line(tx,ty,m,(X,Y)=>put(X,Y,(X+Y)&1?'e':'a'))}
 return{w:S,keys:K}}
function mpKeysToCanvas(P){const c=pxCanvas(P.w,P.w);if(!c||!c.getContext)return null;const q=c.getContext('2d'),im=q.createImageData(P.w,P.w),D=im.data,rgb={};
 for(let i=0;i<P.keys.length;i++){const k=P.keys[i];if(!k)continue;const c3=rgb[k]||(rgb[k]=mpRGB(k));D[i*4]=c3[0];D[i*4+1]=c3[1];D[i*4+2]=c3[2];D[i*4+3]=255}
 q.putImageData(im,0,0);return c}
function mpWorldSrc(){const riv=W.river&&W.river.length===WN*WN?W.river:null,road=W.road&&W.road.length===WN*WN?W.road:null;
 return{t:(x,y)=>W.tiles[y*WN+x],seen:mpSeen,river:riv?(x,y)=>riv[y*WN+x]:null,road:road?(x,y)=>road[y*WN+x]:null,roads:MP.roads}}
function mpTerrain(){const key=[G.seed,WN,MP.tp,MP.roads?1:0,W.fogRev||0,typeof worldKeyColor==='function'?1:0,typeof seenAt==='function'?1:0].join();
 if(MP.terr&&MP.terrKey===key&&MP.terrW===W)return MP.terr;MP.terrKey=key;MP.terrW=W;MP.terr=mpKeysToCanvas(mpPaint(WN,MP.tp,mpWorldSrc()));return MP.terr}
/* centre of the widest unseen region (tile coords) for the "Terra Incognita" caption, or null */
function mpIncognita(){const key=G.seed+','+WN+','+(W.fogRev||0);if(MP.incKey===key)return MP.inc;MP.incKey=key;MP.inc=null;if(typeof seenAt!=='function')return null;
 const N=WN*WN,dist=new Int16Array(N).fill(-1),q=[];for(let i=0;i<N;i++)if(mpSeen(i%WN,(i/WN)|0)){dist[i]=0;q.push(i)}
 if(!q.length){MP.inc={x:WN/2,y:WN/2,r:WN/2};return MP.inc}
 let best=-1,bd=0;for(let h=0;h<q.length;h++){const k=q[h],x=k%WN,y=(k/WN)|0,d=dist[k];
  const e=Math.min(x,y,WN-1-x,WN-1-y),s=Math.min(d,e+1);if(s>bd||(s===bd&&best>=0&&Math.abs(y-WN/2)<Math.abs(((best/WN)|0)-WN/2))){bd=s;best=k}
  if(x>0&&dist[k-1]<0){dist[k-1]=d+1;q.push(k-1)}if(x<WN-1&&dist[k+1]<0){dist[k+1]=d+1;q.push(k+1)}if(y>0&&dist[k-WN]<0){dist[k-WN]=d+1;q.push(k-WN)}if(y<WN-1&&dist[k+WN]<0){dist[k+WN]=d+1;q.push(k+WN)}}
 if(best>=0&&bd>=4)MP.inc={x:best%WN+.5,y:((best/WN)|0)+.5,r:bd};return MP.inc}

/* ================= ROUTES ================= */
function mpHours(ax,ay,path){let h=0,x=ax,y=ay;for(const p of path){const L=Math.hypot(p.x-x,p.y-y),n=Math.max(1,Math.ceil(L/(TS/4)));
  for(let i=0;i<n;i++){const t=(i+.5)/n,qx=x+(p.x-x)*t,qy=y+(p.y-y)*t,sp=(typeof speedAt==='function'?speedAt(qx,qy):SPD[tileAt(qx,qy)])||.5;h+=L/n/(60*sp)*.8}x=p.x;y=p.y}return h}
/* one leg, from any point: uses routeTo (worldgen) by standing the company at the leg's start for the call */
function mpLeg(ax,ay,bx,by){if(typeof routeTo==='function'){const sp=G.p;let r,ok=false;try{G.p={x:ax,y:ay};r=routeTo(bx,by,{x:ax,y:ay});ok=true}catch(e){}finally{G.p=sp}
  if(ok){if(!r||!Array.isArray(r.path))return null;return{path:r.path,hours:isFinite(+r.hours)?+r.hours:mpHours(ax,ay,r.path)}}}
 if(!okAt(bx,by))return null;const p=findPath(clamp(Math.floor(ax/TS),0,WN-1),clamp(Math.floor(ay/TS),0,WN-1),Math.floor(bx/TS),Math.floor(by/TS));if(!p)return null;
 if(p.length)p[p.length-1]={x:bx,y:by};else p.push({x:bx,y:by});return{path:p,hours:mpHours(ax,ay,p)}}
function mpRouteEnd(){const w=MP.wps[MP.wps.length-1];return w?{x:w.x,y:w.y}:{x:G.p.x,y:G.p.y}}
function mpRecalc(){MP.legs=[];let a={x:G.p.x,y:G.p.y};for(let i=0;i<MP.wps.length;i++){const w=MP.wps[i],l=mpLeg(a.x,a.y,w.x,w.y);if(!l){MP.wps.length=i;break}MP.legs.push(l);a=w}}
function mapRouteHours(){let h=0;for(const l of MP.legs)h+=l.hours;return h}
function mpWpFromHit(h){if(h.kind==='town'){const t=G.towns[h.i];return{x:t.x,y:t.y,dest:{type:'town',i:h.i},kind:'town',ref:h.i,label:t.name}}
 if(h.kind==='portal'){const p=G.portals.find(p=>p.id===h.id);return p?{x:p.x,y:p.y,dest:{type:'portal',id:p.id},kind:'portal',ref:p.id,label:'Rift'}:null}
 if(h.kind==='lair'){const c=G.contract;return{x:c.x,y:c.y,dest:null,kind:'lair',ref:0,label:'Lair'}}
 if(h.kind==='ruin')return{x:h.x,y:h.y,dest:typeof siteSheet==='function'?{type:'site',id:h.id}:null,kind:'ruin',ref:h.id,label:typeof h.n==='string'&&h.n?h.n:'Ruins'};
 return{x:h.x,y:h.y,dest:null,kind:'land',ref:0,label:MPTERR[tileAt(h.x,h.y)]||'Open ground'}}
function mpSame(a,b){return!!a&&!!b&&a.kind===b.kind&&(a.kind==='land'?Math.hypot(a.x-b.x,a.y-b.y)<TS*.5:a.ref===b.ref)}
/* add a stop. Returns '' or the reason it was not added. */
function mapAddStop(w){if(!w)return'none';const last=MP.wps[MP.wps.length-1];if(mpSame(last,w))return'same';
 if(w.kind==='town'&&MP.wps.some(p=>mpSame(p,w)))return'in';
 const repl=last&&last.kind==='land'&&w.kind==='land';if(!repl&&MP.wps.length>=MP.MAXWP)return'full';
 const from=repl?(MP.wps[MP.wps.length-2]||G.p):mpRouteEnd(),leg=mpLeg(from.x,from.y,w.x,w.y);if(!leg)return'blocked';
 if(repl){MP.wps[MP.wps.length-1]=w;MP.legs[MP.legs.length-1]=leg}else{MP.wps.push(w);MP.legs.push(leg)}return''}
function mapUndo(){if(MP.wps.length){MP.wps.pop();MP.legs.pop()}MP.sel=MP.wps.length?mpSelOf(MP.wps[MP.wps.length-1]):null;mpSide();MP.dirty=true}
function mapClear(){MP.wps=[];MP.legs=[];MP.sel=null;mpSide();MP.dirty=true}
function mapMarch(){const w=MP.wps.map(p=>({x:p.x,y:p.y,dest:p.dest||null,label:p.label}));if(!w.length)return;closeMap(true);MP.queue=null;
 if(typeof setRoute==='function'){try{setRoute(w.map(p=>({x:p.x,y:p.y,dest:p.dest})));return}catch(e){}}
 MP.queue=w;mpQueueGo()}
/* fallback waypoint queue (no setRoute): march to the first stop, carry on after each arrival; a new order, a halt or a lost fight drops it */
function mpQueueStop(){MP.queue=null;MP.qBattle=false;if(MP.qTimer){clearInterval(MP.qTimer);MP.qTimer=0}}
function mpQueueGo(){const q=MP.queue;if(!q||!q.length){mpQueueStop();return}const w=q[0];goTo(w.x,w.y,w.dest);MP.qBattle=false;
 if(!G.moving&&Math.hypot(G.p.x-w.x,G.p.y-w.y)>2){mpQueueStop();return}
 if(!MP.qTimer&&typeof setInterval==='function')MP.qTimer=setInterval(mapRouteTick,200)}
function mapRouteTick(){const q=MP.queue;if(!q||!q.length||!G||!G.roster||!G.roster.length||mode==='title'){mpQueueStop();return}
 if(mode==='battle'){MP.qBattle=true;return}if(mode!=='world')return;
 const w=q[0],at=Math.hypot(G.p.x-w.x,G.p.y-w.y)<2;if(at&&q.length===1&&!G.moving){mpQueueStop();return}if(sheetOpen)return;
 if(G.moving){if(!G.tap||Math.hypot(G.tap.x-w.x,G.tap.y-w.y)>1)mpQueueStop();return}
 if(at){q.shift();if(q.length){mpQueueGo();if(MP.queue&&typeof toast==='function')toast('Marching on to '+(MP.queue[0].label||'the next stop'))}else mpQueueStop();return}
 if(MP.qBattle)mpQueueGo();else mpQueueStop()}
function mapRouteQueue(){return MP.queue?MP.queue.slice():[]}
/* the route already under way, as planner stops (so the map opens showing it) */
function mpCurrentRoute(){const out=[],lab=d=>d&&d.type==='town'&&G.towns[d.i]?{kind:'town',ref:d.i,label:G.towns[d.i].name}:d&&d.type==='portal'?{kind:'portal',ref:d.id,label:'Rift'}:d&&d.type==='site'?{kind:'ruin',ref:d.id,label:(((G.sites||[]).find(s=>s.id===d.id)||{}).n)||'Ruins'}:null;
 const add=(x,y,d,l)=>{if(!isFinite(x)||!isFinite(y))return;const k=lab(d)||{kind:'land',ref:0,label:l||MPTERR[tileAt(x,y)]||'Open ground'};
  const c=G.contract;if(k.kind==='land'&&c&&c.type==='hunt'&&!c.done&&Math.hypot(c.x-x,c.y-y)<2){k.kind='lair';k.label='Lair'}out.push({x,y,dest:d||null,kind:k.kind,ref:k.ref,label:k.label})};
 if(MP.queue&&MP.queue.length){for(const w of MP.queue)add(w.x,w.y,w.dest,w.label);return out}
 if(G.moving&&G.path&&G.path.length){const e=G.path[G.path.length-1];add(e.x,e.y,G.dest)}
 if(Array.isArray(G.route))for(const w of G.route){if(!w)continue;const l=out[out.length-1];if(l&&Math.hypot(l.x-w.x,l.y-w.y)<2)continue;add(+w.x,+w.y,w.dest)}
 return out.slice(0,MP.MAXWP)}

/* ================= LAYOUT, CAMERA ================= */
function mpK(){return MP.tp*MP.z/TS}                                  // device px per world unit
function mpOrigin(){const I=MP.view;return{x:Math.round(I.x+I.w/2-MP.cx*MP.z),y:Math.round(I.y+I.h/2-MP.cy*MP.z)}}
function mpClampCam(){const I=MP.view,S=WN*MP.tp,vw=I.w/MP.z,vh=I.h/MP.z;
 MP.cx=vw>=S?S/2:clamp(MP.cx,vw/2,S-vw/2);MP.cy=vh>=S?S/2:clamp(MP.cy,vh/2,S-vh/2)}
function mpLayout(){if(!MP.root)return;const el=MP.root.querySelector('.mp-map'),r=el.getBoundingClientRect(),vw=window.innerWidth||r.width,vh=window.innerHeight||r.height;
 const d=Math.max(1,Math.round(window.devicePixelRatio||1)),cw=Math.max(8,Math.round(r.width*d)),ch=Math.max(8,Math.round(r.height*d));
 MP.d=d;MP.us=d*(Math.min(vw,vh)>=560?2:1);if(MP.cv.width!==cw||MP.cv.height!==ch){MP.cv.width=cw;MP.cv.height=ch}MP.cw=cw;MP.ch=ch;
 const f=MP.F*MP.us;MP.inner={x:f,y:f,w:Math.max(8,cw-2*f),h:Math.max(8,ch-2*f)};
 /* the sheet is centred in the part of the frame the tool buttons leave free (a column on the left; a row along the bottom in tall panes) */
 let pl=0,pb=0;const tl=MP.root.querySelector('.mp-tools'),tr=tl&&tl.getBoundingClientRect();
 if(tr&&tr.width&&r.width){if(tr.width>tr.height*1.5)pb=Math.max(0,Math.round((r.bottom-tr.top+2)*d)-f);else pl=Math.max(0,Math.round((tr.right-r.left+2)*d)-f)}
 MP.view={x:f+pl,y:f,w:Math.max(8,cw-2*f-pl),h:Math.max(8,ch-2*f-pb)};
 const room=Math.min(MP.view.w,MP.view.h)-4*MP.us;let btp=4,bz=1,bs=0;
 for(const tp of [4,5,6]){const z=Math.max(1,Math.floor(room/(WN*tp))),s=WN*tp*z<=room?tp*z:0;if(s>bs||(s===bs&&s&&tp>btp)){bs=s;btp=tp;bz=z}}
 if(!bs)for(const tp of [3,2]){if(WN*tp<=room){btp=tp;bz=1;break}if(tp===2){btp=2;bz=1}}            // the larger worlds: fewer art px per tile so the whole sheet still fits
 const old=MP.tp,oz=MP.z,ozf=MP.zf;MP.tp=btp;MP.zf=bz;MP.zmax=Math.max(bz,Math.min(bz+7,Math.ceil(30*d/btp)));
 if(old!==btp){MP.cx=MP.cx/old*btp;MP.cy=MP.cy/old*btp}
 MP.z=MP.fresh||oz===ozf?bz:clamp(Math.round(oz*old/btp),bz,MP.zmax);MP.fresh=false;mpClampCam();MP.dirty=true;mpZoomUI()}
function mapZoom(dir,fx,fy){const z=clamp(MP.z+(dir>0?1:-1),MP.zf,MP.zmax);mapZoomTo(z,fx,fy)}
function mapZoomTo(z,fx,fy){z=clamp(Math.round(z),MP.zf,MP.zmax);if(z===MP.z)return;const I=MP.view;if(fx==null){fx=I.x+I.w/2;fy=I.y+I.h/2}
 const o=mpOrigin(),ax=(fx-o.x)/MP.z,ay=(fy-o.y)/MP.z;MP.z=z;MP.cx=ax-(fx-(I.x+I.w/2))/z;MP.cy=ay-(fy-(I.y+I.h/2))/z;mpClampCam();MP.dirty=true;mpZoomUI()}
function mpZoomUI(){if(!MP.root)return;const a=MP.root.querySelector('#mpZin'),b=MP.root.querySelector('#mpZout');if(a)a.disabled=MP.z>=MP.zmax;if(b)b.disabled=MP.z<=MP.zf}
function mapToggle(k){if(k==='labels')MP.labels=!MP.labels;else if(k==='roads')MP.roads=!MP.roads;else if(k==='legend')MP.legend=!MP.legend;mpTools();MP.dirty=true}

/* ================= LABELS ================= */
function mpTownRows(t){const s=mpTownSize(t);return s===1?MPS.hamlet:s===3?MPS.city:MPS.town}
function mpHit2(a,b,pad){return a.x<b.x+b.w+pad&&b.x<a.x+a.w+pad&&a.y<b.y+b.h+pad&&b.y<a.y+a.h+pad}
/* label boxes in map space (device px from the world's top-left corner) for the current zoom. Never overlap each other or a town marker. */
function mpLabels(){const us=MP.us,k=mpK(),I=MP.view,Wp=WN*MP.tp*MP.z,key=[G.seed,WN,TS,MP.tp,MP.z,us,I.w,I.h,G.towns.length,G.towns.map(t=>mpTownSize(t)).join('')].join();
 if(MP.lab&&MP.labKey===key)return MP.lab;MP.labKey=key;
 const mx=Math.max(0,(I.w-Wp)/2)-2*us,my=Math.max(0,(I.h-Wp)/2)-2*us,B={x0:-mx,y0:-my,x1:Wp+mx,y1:Wp+my};
 const marks=G.towns.map(t=>{const r=mpTownRows(t),w=r[0].length*us,h=r.length*us,x=Math.round(t.x*k)-Math.floor(r[0].length/2)*us,y=Math.round(t.y*k)-Math.floor(r.length/2)*us;return{x,y,w,h}});
 const order=G.towns.map((t,i)=>i).sort((a,b)=>mpTownSize(G.towns[b])-mpTownSize(G.towns[a])||a-b),out=new Array(G.towns.length).fill(null),placed=[];
 for(const i of order){const m=marks[i],tw=(mpTextW(G.towns[i].name)+2)*us,th=MPTH*us,cx=m.x+m.w/2,cy=m.y+m.h/2,C=[];
  for(const g of [us,5*us,10*us,16*us]){const top=m.y-g-th+2*us,bot=m.y+m.h+g-us;
   C.push([m.x+m.w+g,cy-th/2+us],[cx-tw/2,bot],[cx-tw/2,top],[m.x-g-tw,cy-th/2+us],[m.x+m.w+g-us,bot-us],[m.x+m.w+g-us,top+us],[m.x-g-tw+us,bot-us],[m.x-g-tw+us,top+us],
    [cx-tw*.2,bot],[cx-tw*.8,bot],[cx-tw*.2,top],[cx-tw*.8,top])}
  let best=null,bc=1e9;C.forEach((c,n)=>{const b={x:Math.round(c[0]),y:Math.round(c[1]),w:tw,h:th};
   if(b.x<B.x0||b.y<B.y0||b.x+b.w>B.x1||b.y+b.h>B.y1)return;for(const o of marks)if(mpHit2(b,o,us))return;for(const o of placed)if(mpHit2(b,o,us))return;
   if(n<bc){bc=n;best=b}});
  if(best){best.i=i;out[i]=best;placed.push(best)}}
 MP.lab=out;return out}
/* test hook: label boxes for the current view plus any overlaps */
function mapLabelCheck(){const L=mpLabels(),us=MP.us,k=mpK(),bad=[];let hidden=0;
 const marks=G.towns.map(t=>{const r=mpTownRows(t);return{x:Math.round(t.x*k)-Math.floor(r[0].length/2)*us,y:Math.round(t.y*k)-Math.floor(r.length/2)*us,w:r[0].length*us,h:r.length*us}});
 for(let i=0;i<L.length;i++){if(!L[i]){hidden++;continue}for(let j=i+1;j<L.length;j++)if(L[j]&&mpHit2(L[i],L[j],0))bad.push([i,j]);for(let j=0;j<marks.length;j++)if(mpHit2(L[i],marks[j],0))bad.push([i,'m'+j])}
 return{n:L.length,hidden,overlaps:bad,boxes:L}}

/* ================= DRAW ================= */
function mpSpr(q,key,rows,x,y){const c=pxScaled('mps:'+key,rows,MP.us);if(c)q.drawImage(c,Math.round(x),Math.round(y));return c}
/* sprite with its centre (ax='c') or bottom-centre (ax='b') on a device point */
function mpAt(q,key,rows,sx,sy,ax){const us=MP.us,w=rows[0].length,h=rows.length;mpSpr(q,key,rows,sx-Math.floor(w/2)*us,ax==='b'?sy-h*us+us:sy-Math.floor(h/2)*us)}
function mpFill(q,k,x,y,w,h){q.fillStyle=PAL[k];q.fillRect(x,y,w,h)}
function mpDots(q,pts,col,phase,seen){const us=MP.us,step=7*us;let acc=phase?step/2:0;
 for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],L=Math.hypot(b.x-a.x,b.y-a.y);if(L<.01)continue;let t=step-acc;
  while(t<=L){const x=Math.round((a.x+(b.x-a.x)*t/L)/us)*us,y=Math.round((a.y+(b.y-a.y)*t/L)/us)*us;const gx=Math.round(x/(3*us)),gy=Math.round(y/(3*us));let hit=false;if(seen){for(let j=-1;j<=1&&!hit;j++)for(let i2=-1;i2<=1;i2++)if(seen.has((gx+i2)+','+(gy+j))){hit=true;break}}
   if(!hit){if(seen)seen.add(gx+','+gy);mpFill(q,'0',x-2*us,y-2*us,4*us,4*us);mpFill(q,col,x-us,y-us,2*us,2*us)}t+=step}acc=(acc+L)%step}}
function mpContractMark(){const c=G.contract;if(!c)return null;if(c.type==='hunt'&&!c.done)return{kind:'lair',x:c.x,y:c.y};const t=G.towns[c.type==='deliver'?c.to:c.town];return t?{kind:'turnin',x:t.x,y:t.y,town:true}:null}
function mpKnownPortals(){return(G.portals||[]).filter(p=>mpSeenW(p.x,p.y))}
function mpKnownRuins(){return(Array.isArray(G.sites)?G.sites:[]).filter(s=>s&&(s.kind==='ruin'||!s.kind)&&mpSeenW(s.x,s.y))}
function mpDraw(){const q=MP.q,us=MP.us,I=MP.inner,z=MP.z,cw=MP.cw,ch=MP.ch;if(!q||!G||!W)return;
 const terr=mpTerrain(),o=mpOrigin(),k=mpK(),Wp=WN*MP.tp*z,X=wx=>o.x+Math.round(wx*k),Y=wy=>o.y+Math.round(wy*k),fr=MP.frame;
 q.setTransform(1,0,0,1,0,0);q.imageSmoothingEnabled=false;q.globalAlpha=1;
 /* parchment page */
 mpFill(q,'l',0,0,cw,ch);const sp=MP.speck||(MP.speck=(function(){const rows=[];for(let y=0;y<48;y++){let s='';for(let x=0;x<48;x++){const h=mpHash(x,y,9);s+=h<.012?'k':h<.06?'m':'.'}rows.push(s)}return rows})());
 const sc=pxScaled('mps:speck',sp,us);if(sc)for(let y=0;y<ch;y+=sc.height)for(let x=0;x<cw;x+=sc.width)q.drawImage(sc,x,y);
 q.save();q.beginPath();q.rect(I.x,I.y,I.w,I.h);q.clip();
 /* the sheet, with a neatline */
 mpFill(q,'m',o.x-us,o.y-us,Wp+4*us,Wp+4*us);mpFill(q,'0',o.x-2*us,o.y-2*us,Wp+4*us,Wp+4*us);mpFill(q,'c',o.x-us,o.y-us,Wp+2*us,Wp+2*us);
 if(terr)q.drawImage(terr,o.x,o.y,Wp,Wp);else mpFill(q,'v',o.x,o.y,Wp,Wp);
 /* terra incognita caption */
 const inc=mpIncognita();if(inc){const words=['Terra','Incognita'],r=inc.r*MP.tp*z,one=mpTextW('Terra Incognita')*us<r*1.7;
  const lines=one?['Terra Incognita']:words;if(mpTextW(lines[0]==='Terra'?'Incognita':lines[0])*us<r*1.9){let ty=o.y+Math.round(inc.y*MP.tp*z)-Math.round(lines.length*MPTH*us/2);
   for(const ln of lines){const c=mpTextCv(ln,'j','l',us);if(c)q.drawImage(c,o.x+Math.round(inc.x*MP.tp*z-c.width/2),ty);ty+=MPTH*us}}}
 /* the march already under way (brass), then the planned route (madder) */
 if(G.moving&&G.path&&G.path.length&&!MP.wps.length)mpDots(q,[{x:X(G.p.x),y:Y(G.p.y)}].concat(G.path.map(p=>({x:X(p.x),y:Y(p.y)}))),'d',false);
 const dseen=new Set();let a={x:X(G.p.x),y:Y(G.p.y)};for(let i=0;i<MP.legs.length;i++){const pts=[a].concat(MP.legs[i].path.map(p=>({x:X(p.x),y:Y(p.y)})));mpDots(q,pts,i&1?'E':'g',false,dseen);a=pts[pts.length-1]}
 /* sites */
 for(const s of mpKnownRuins())mpAt(q,'ruin',MPS.ruin,X(s.x),Y(s.y),'c');
 for(const p of mpKnownPortals())mpAt(q,fr&1?'portal2':'portal',fr&1?MPS.portal2:MPS.portal,X(p.x),Y(p.y),'c');
 G.towns.forEach(t=>{const s=mpTownSize(t);mpAt(q,s===1?'hamlet':s===3?'city':'town',mpTownRows(t),X(t.x),Y(t.y),'c')});
 if(MP.labels){const L=mpLabels();for(const b of L){if(!b)continue;const c=mpTextCv(G.towns[b.i].name,'0','l',us);if(c)q.drawImage(c,o.x+b.x,o.y+b.y)}}
 /* contract */
 const cm=mpContractMark();if(cm){const sx=X(cm.x),sy=Y(cm.y);if(cm.town){const th=mpTownRows({size:mpTownSize(G.towns[G.contract.type==='deliver'?G.contract.to:G.contract.town])}).length;mpAt(q,'turnin',MPS.turnin,sx+6*us,sy-(Math.floor(th/2)+3+(fr&1))*us,'c')}
  else{mpAt(q,'lair',MPS.lair,sx,sy,'c');if(fr&1){const r=7*us;q.fillStyle=PAL.g;q.fillRect(sx-r,sy-r,2*us,us);q.fillRect(sx-r,sy-r,us,2*us);q.fillRect(sx+r-us,sy-r,2*us,us);q.fillRect(sx+r,sy-r,us,2*us);q.fillRect(sx-r,sy+r,2*us,us);q.fillRect(sx-r,sy+r-us,us,2*us);q.fillRect(sx+r-us,sy+r,2*us,us);q.fillRect(sx+r,sy+r-us,us,2*us)}}}
 /* selection brackets */
 const s=MP.sel;if(s){const sx=X(s.x),sy=Y(s.y),r=(s.kind==='town'?Math.floor(mpTownRows(G.towns[s.ref]).length/2)+3:6)*us+(fr&1?us:0),L=3*us,br=(x,y,dx,dy)=>{mpFill(q,'0',x-us,y-us,L*1+2*us,3*us);mpFill(q,'0',x-us,y-us,3*us,L+2*us);q.fillStyle=PAL.e;q.fillRect(x,y,L,us);q.fillRect(x,y,us,L)};
  q.save();q.translate(sx,sy);for(const [mx2,my2] of [[1,1],[-1,1],[1,-1],[-1,-1]]){q.save();q.scale(mx2,my2);br(-r,-r);q.restore()}q.restore()}
 /* company */
 {const cr=MP.coRows&&MP.coRows.b===(G.banner&&G.banner.c1)?MP.coRows:(MP.coRows=Object.assign(mpCompanyRows(),{b:G.banner&&G.banner.c1}));mpAt(q,cr.k,cr.rows,X(G.p.x)+3*us,Y(G.p.y)+us,'b')}
 /* numbered pins */
 MP.wps.forEach((w,i)=>{const sx=X(w.x),sy=Y(w.y),up=w.kind==='town'?Math.floor(mpTownRows(G.towns[w.ref]).length/2)+1:w.kind==='land'?0:5;mpAt(q,'pin'+(i+1),mpPinRows(i+1),sx,sy-up*us,'b')});
 q.restore();
 /* frame: ink, brass, a chequered scale band, brass, ink */
 const F=MP.F*us,band=(x,y,w,h)=>{mpFill(q,'0',x,y,w,h)};band(0,0,cw,F);band(0,ch-F,cw,F);band(0,0,F,ch);band(cw-F,0,F,ch);
 const ring=(i,k2)=>{const p=i*us;mpFill(q,k2,p,p,cw-2*p,us);mpFill(q,k2,p,ch-p-us,cw-2*p,us);mpFill(q,k2,p,p,us,ch-2*p);mpFill(q,k2,cw-p-us,p,us,ch-2*p)};
 ring(1,'c');ring(2,'l');ring(3,'l');ring(4,'b');const seg=8*us;
 for(let x=F,n=0;x<cw-F;x+=seg,n++)if(n&1){mpFill(q,'0',x,2*us,Math.min(seg,cw-F-x),2*us);mpFill(q,'0',x,ch-4*us,Math.min(seg,cw-F-x),2*us)}
 for(let y=F,n=0;y<ch-F;y+=seg,n++)if(n&1){mpFill(q,'0',2*us,y,2*us,Math.min(seg,ch-F-y));mpFill(q,'0',cw-4*us,y,2*us,Math.min(seg,ch-F-y))}
 for(const [x,y] of [[0,0],[cw-F,0],[0,ch-F],[cw-F,ch-F]]){mpFill(q,'0',x,y,F,F);mpFill(q,'c',x+us,y+us,F-2*us,F-2*us);mpFill(q,'e',x+us,y+us,F-3*us,us);mpFill(q,'e',x+us,y+us,us,F-3*us);mpFill(q,'b',x+2*us,y+F-2*us,F-3*us,us);mpFill(q,'b',x+F-2*us,y+2*us,us,F-3*us);mpFill(q,'g',x+2*us,y+2*us,2*us,2*us)}
 /* title cartouche */
 const title='The Wyrdmarch',tw=mpTextW(title),pw=(tw+16)*us,ph=15*us,cxp=I.x+3*us,cyp=I.y+3*us;
 mpFill(q,'0',cxp+us,cyp,pw-2*us,ph);mpFill(q,'0',cxp,cyp+us,pw,ph-2*us);mpFill(q,'c',cxp+us,cyp+us,pw-2*us,ph-2*us);mpFill(q,'e',cxp+us,cyp+us,pw-3*us,us);mpFill(q,'b',cxp+2*us,cyp+ph-2*us,pw-3*us,us);
 mpFill(q,'0',cxp+2*us,cyp+2*us,pw-4*us,ph-4*us);mpFill(q,'l',cxp+3*us,cyp+3*us,pw-6*us,ph-6*us);mpFill(q,'m',cxp+3*us,cyp+ph-4*us,pw-6*us,us);
 mpFill(q,'g',cxp+5*us,cyp+7*us,us,us);mpFill(q,'g',cxp+pw-6*us,cyp+7*us,us,us);
 const tc=mpTextCv(title,'0','',us);if(tc)q.drawImage(tc,cxp+8*us-us,cyp+3*us);
 /* compass rose */
 const rw=MPROSE.length*us,rx=I.x+I.w-rw-4*us,ry=I.y+10*us;if(I.w>pw+rw+16*us){mpSpr(q,'rose',MPROSE,rx,ry);const nc=mpTextCv('N','0','l',us);if(nc)q.drawImage(nc,rx+Math.round(rw/2-nc.width/2)+us,ry-9*us)}
 /* scale bar: five leagues (tiles) */
 const bl=5*MP.tp*z,bx=I.x+I.w-bl-6*us,by=I.y+I.h-7*us;if(I.w>bl+40*us){mpFill(q,'0',bx-us,by-us,bl+2*us,4*us);mpFill(q,'l',bx,by,bl,2*us);for(let i=0;i<5;i+=2)mpFill(q,'g',bx+Math.round(i*bl/5),by,Math.round(bl/5),2*us);
  const lc=mpTextCv('5 leagues','0','l',us);if(lc)q.drawImage(lc,bx+bl-lc.width+us,by-MPTH*us)}
 MP.dirty=false}
function mpLoop(){if(!MP.open){MP.raf=0;return}MP.raf=requestAnimationFrame(mpLoop);const still=typeof reduced!=='undefined'&&reduced,f=still?0:Math.floor(performance.now()/420);
 if(f!==MP.frame){MP.frame=f;MP.dirty=true}if(MP.dirty)mpDraw()}

/* ================= INPUT ================= */
/* what is under a device point: {kind:'town'|'portal'|'lair'|'ruin'|'land'|'fog'|'sea'|'off', ...} */
function mpHit(sx,sy){const o=mpOrigin(),k=mpK(),d=MP.d,us=MP.us,R=Math.max(13*d,7*us),near=(wx,wy)=>Math.hypot(o.x+wx*k-sx,o.y+wy*k-sy);
 let bi=-1,bd=R;G.towns.forEach((t,i)=>{const dd=near(t.x,t.y);if(dd<bd){bd=dd;bi=i}});
 if(bi<0&&MP.labels){const L=mpLabels();for(const b of L)if(b&&sx>=o.x+b.x&&sx<o.x+b.x+b.w&&sy>=o.y+b.y&&sy<o.y+b.y+b.h){bi=b.i;break}}
 if(bi>=0)return{kind:'town',i:bi};
 const c=G.contract;if(c&&c.type==='hunt'&&!c.done&&near(c.x,c.y)<R)return{kind:'lair'};
 for(const p of mpKnownPortals())if(near(p.x,p.y)<R)return{kind:'portal',id:p.id};
 for(const s of mpKnownRuins())if(near(s.x,s.y)<R)return{kind:'ruin',id:s.id,x:s.x,y:s.y,n:s.n};
 const wx=(sx-o.x)/k,wy=(sy-o.y)/k;if(wx<0||wy<0||wx>=WN*TS||wy>=WN*TS)return{kind:'off'};
 if(!mpSeenW(wx,wy))return{kind:'fog',x:wx,y:wy};if(!tileAt(wx,wy))return{kind:'sea',x:wx,y:wy};
 const tx=Math.floor(wx/TS),ty=Math.floor(wy/TS);return{kind:'land',x:(tx+.5)*TS,y:(ty+.5)*TS}}
function mpSelOf(w){return{kind:w.kind,ref:w.ref,x:w.x,y:w.y,label:w.label}}
function mpTap(sx,sy){const h=mpHit(sx,sy);if(h.kind==='off')return;const say=t=>{if(typeof toast==='function')toast(t)};
 if(h.kind==='fog'){say('Uncharted. March closer to map it');return}if(h.kind==='sea'){say('Open water');return}
 const w=mpWpFromHit(h);if(!w)return;const why=mapAddStop(w);MP.sel=mpSelOf(w);
 if(why==='blocked'){say('No way through there');if(w.kind==='land')MP.sel=null}else if(why==='full')say('A route holds '+MP.MAXWP+' stops');
 mpSide();MP.dirty=true}
function mpXY(e){const r=MP.cv.getBoundingClientRect();return{x:(e.clientX-r.left)*MP.cw/(r.width||1),y:(e.clientY-r.top)*MP.ch/(r.height||1)}}
function mpWire(cv){
 cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;const p=mpXY(e);MP.ptr.set(e.pointerId,p);try{cv.setPointerCapture(e.pointerId)}catch(err){}
  if(MP.ptr.size===1)MP.gs={x:p.x,y:p.y,cx:MP.cx,cy:MP.cy,moved:false,multi:false,id:e.pointerId};
  else if(MP.ptr.size===2){const a=[...MP.ptr.values()];MP.gs={multi:true,moved:true,d0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1,z0:MP.z}}e.preventDefault()});
 cv.addEventListener('pointermove',e=>{if(!MP.ptr.has(e.pointerId))return;const p=mpXY(e);MP.ptr.set(e.pointerId,p);const s=MP.gs;if(!s)return;
  if(s.multi){if(MP.ptr.size<2)return;const a=[...MP.ptr.values()],dd=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1,want=clamp(Math.round(s.z0*dd/s.d0),MP.zf,MP.zmax);
   if(want!==MP.z)mapZoomTo(want,(a[0].x+a[1].x)/2,(a[0].y+a[1].y)/2);return}
  if(s.id!==e.pointerId)return;if(!s.moved&&Math.hypot(p.x-s.x,p.y-s.y)>7*MP.d)s.moved=true;
  if(s.moved){MP.cx=s.cx-(p.x-s.x)/MP.z;MP.cy=s.cy-(p.y-s.y)/MP.z;mpClampCam();MP.dirty=true}});
 const up=e=>{if(!MP.ptr.has(e.pointerId))return;const p=MP.ptr.get(e.pointerId);MP.ptr.delete(e.pointerId);const s=MP.gs;
  if(s&&!s.multi&&s.id===e.pointerId){MP.gs=null;if(!s.moved&&e.type==='pointerup')mpTap(p.x,p.y)}
  else if(s&&s.multi&&MP.ptr.size<2){MP.gs=MP.ptr.size?{multi:true,moved:true,d0:1,z0:MP.z,done:true}:null}
  if(!MP.ptr.size)MP.gs=null};
 cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
 cv.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();const p=mpXY(e),t=performance.now();if(t-(MP.wt||0)<70)return;MP.wt=t;mapZoom(e.deltaY<0?1:-1,p.x,p.y)},{passive:false});
 cv.addEventListener('contextmenu',e=>e.preventDefault())}

/* ================= SIDE PANEL, TOOLS, LEGEND ================= */
function mpSwatch(key,rows,sc){const u=pxURL('mpl:'+key,rows,sc||2);return u?`<i class="mp-sw" style="width:${rows[0].length*(sc||2)}px;height:${rows.length*(sc||2)}px;background-image:url(${u})"></i>`:'<i class="mp-sw"></i>'}
function mpTerrSwatch(t,o){const key='t'+t+(o||'')+(typeof worldKeyColor==='function'?'k':''),id='u:mpl:'+key+'@2';if(!_pxCache.has(id)){
  const P=mpPaint(3,4,{t:(x,y)=>o==='coast'?(x===0?0:1):t,seen:()=>o!=='fog',river:o==='river'?()=>10:null,road:o==='road'?()=>10:null,roads:true}),rows=[];
  for(let y=4;y<8;y++){let s='';for(let x=o==='coast'?1:2;x<(o==='coast'?9:10);x++)s+=P.keys[y*P.w+x]||'.';rows.push(s)}
  return mpSwatch(key,mpOutline(['..........'].concat(rows.map(r=>'.'+r+'.'),['..........'])),2)}
 return`<i class="mp-sw" style="width:20px;height:12px;background-image:url(${_pxCache.get(id)})"></i>`}
function mpLegendHTML(){const it=(sw,n)=>`<span class="mp-li">${sw}<b>${n}</b></span>`,riv=!!(W&&W.river),road=!!(W&&W.road);
 return'<div class="mp-lh pxh">Legend</div><div class="mp-lg">'
  +it(mpTerrSwatch(1),'Grassland')+it(mpTerrSwatch(2),'Forest')+it(mpTerrSwatch(3),'Hills')+it(mpTerrSwatch(4),'Mountains')+it(mpTerrSwatch(5),'Marsh')+it(mpTerrSwatch(6),'Desert')+it(mpTerrSwatch(7),'Snow')+it(mpTerrSwatch(0),'Water')
  +it(mpTerrSwatch(1,'river'),'River'+(riv?'':' *'))+it(mpTerrSwatch(1,'road'),'Road'+(road?'':' *'))+(typeof seenAt==='function'?it(mpTerrSwatch(1,'fog'),'Uncharted'):'')
  +it(mpSwatch('hamlet',MPS.hamlet),'Hamlet')+it(mpSwatch('town',MPS.town),'Town')+it(mpSwatch('city',MPS.city),'City')
  +it(mpSwatch('company',MPS.company),'Company')+it(mpSwatch('lair',MPS.lair),'Contract lair')+it(mpSwatch('turnin',MPS.turnin),'Contract pay')
  +it(mpSwatch('portal',MPS.portal),'Rift')+it(mpSwatch('ruin',MPS.ruin),'Ruin')+it(mpSwatch('pin1',mpPinRows(1)),'Route stop')+'</div>'
  +(riv&&road?'':'<div class="mp-ln">* none charted in this land yet</div>')}
function mpTools(){const r=MP.root;if(!r)return;const b=(id,k,l)=>{const e=r.querySelector('#'+id);if(e){e.classList.toggle('on',!!MP[k]);e.setAttribute('aria-pressed',MP[k]?'true':'false')}};
 b('mpTL','labels');b('mpTR','roads');b('mpTK','legend');const L=r.querySelector('#mpLegend');if(L){L.classList.toggle('on',MP.legend);if(MP.legend)L.innerHTML=mpLegendHTML()}}
function mpCard(){const s=MP.sel,c=G.contract,L=[];let title='Plan a march',tag='',body='';
 if(!s){body='<p class="mp-dim">Tap a town or any charted ground to set a destination. Tap more towns to add stops.</p>'}
 else{const leg=mpLeg(G.p.x,G.p.y,s.x,s.y),here=Math.hypot(G.p.x-s.x,G.p.y-s.y)<TS*.9,dist=Math.max(1,Math.round(Math.hypot(G.p.x-s.x,G.p.y-s.y)/TS));title=s.label;
  if(s.kind==='town'){const t=G.towns[s.ref],i=s.ref;title=t.name;tag=`<span class="pxtag${mpTownSize(t)===3?' gold':''}">${MPSIZE[mpTownSize(t)]}</span>`;
   if(c&&c.type==='deliver'&&c.to===i)L.push('<span class="mp-good">Your delivery is due here.</span>');else if(c&&c.town===i)L.push(c.type==='hunt'&&c.done?'<span class="mp-good">Your pay is waiting here.</span>':'Your contract was posted here.');
   const v=[t.lastVisit,t.visited,t.seenDay,t.mv].find(x=>typeof x==='number'&&isFinite(x));
   L.push(v!=null?(v>=G.day?'Visited today':'Last visited day '+v)+(Array.isArray(t.contracts)?', '+t.contracts.length+(t.contracts.length===1?' notice':' notices')+' on the board':''):'Not yet visited')}
  else if(s.kind==='lair'){tag='<span class="pxtag bad">Lair</span>';title=c&&c.title?c.title:'Contract lair';const f=c&&typeof FACT!=='undefined'&&FACT[c.f];L.push('Your quarry'+(f&&(f.n||f.name)?': '+mpEsc(f.n||f.name):'')+'.')}
  else if(s.kind==='portal'){tag='<span class="pxtag bad">Rift</span>';const p=G.portals.find(p=>p.id===s.ref),b=p&&typeof BIO!=='undefined'&&BIO[p.realm];title=b&&b.n?'Rift to '+b.n:'A rift';L.push('Three battles with no rest beyond it.')}
  else if(s.kind==='ruin'){tag='<span class="pxtag">Ruin</span>';L.push('Old stones, long abandoned.')}
  else{tag='<span class="pxtag">'+mpEsc(MPTERR[tileAt(s.x,s.y)]||'Ground')+'</span>';title='Open ground'}
  body=`<div class="mp-fact"><span>${tag}${here?'You are here':dist+(dist===1?' league':' leagues')}</span></div>`+(here?'':`<div class="mp-fact mp-f2"><span>March</span><b>${leg?mpFmtHours(leg.hours):'No way through'}</b></div>`)+L.map(l=>`<p>${l}</p>`).join('')}
 return`<div class="mp-ct"><b class="pxh">${mpEsc(title)}</b></div>${body}`}
function mpSide(){const r=MP.root;if(!r)return;const n=MP.wps.length,tot=mapRouteHours(),men=G.roster?G.roster.length:0,foodDays=men?G.food/men:99;
 r.querySelector('#mpCard').innerHTML=mpCard();
 let h='';MP.wps.forEach((w,i)=>{h+=`<li${MP.sel&&mpSame(MP.sel,w)?' class="on"':''} onclick="mapSelectStop(${i})"><i class="mp-n">${i+1}</i><span>${mpEsc(w.label)}</span><em>${mpFmtHours(MP.legs[i].hours)}</em></li>`});
 r.querySelector('#mpRoute').innerHTML=n?`<div class="mp-sech"><span>Route</span><b>${mpFmtHours(tot)}</b></div><ol>${h}</ol>`+(tot/24>foodDays?`<p class="mp-warn">Food for ${foodDays<1?'under a day':Math.floor(foodDays)+(Math.floor(foodDays)===1?' day':' days')} only.</p>`:''):'<div class="mp-sech"><span>Route</span><b>No stops</b></div>';
 const u=r.querySelector('#mpUndo'),c=r.querySelector('#mpClear'),m=r.querySelector('#mpMarch');u.disabled=c.disabled=m.disabled=!n;
 m.querySelector('span').textContent=n>1?'March ('+n+' stops)':'March';const d=r.querySelector('#mpDay');if(d)d.textContent='Day '+G.day;
 const ol=r.querySelector('#mpRoute ol');if(ol)ol.scrollTop=ol.scrollHeight}
function mapSelectStop(i){const w=MP.wps[i];if(!w)return;MP.sel=mpSelOf(w);const I=MP.inner,o=mpOrigin(),k=mpK(),sx=o.x+w.x*k,sy=o.y+w.y*k;
 if(sx<I.x+20*MP.us||sy<I.y+20*MP.us||sx>I.x+I.w-20*MP.us||sy>I.y+I.h-20*MP.us){MP.cx=w.x/TS*MP.tp;MP.cy=w.y/TS*MP.tp;mpClampCam()}mpSide();MP.dirty=true}
function mpRoot(){if(MP.root)return MP.root;const r=document.createElement('div');r.id='mp';r.setAttribute('role','dialog');r.setAttribute('aria-modal','true');r.setAttribute('aria-label','Map');
 const ic=(n,s)=>typeof pxIcon==='function'?pxIcon(n,s||16):'';
 r.innerHTML=`<div class="mp-map"><canvas id="mpCv" aria-label="Map of the land"></canvas>
<div class="mp-legend pxf" id="mpLegend"></div>
<div class="mp-tools"><span class="mp-zz"><button type="button" class="pxb sm icon" id="mpZout" onclick="mapZoom(-1)" aria-label="Zoom out">${ic('minus')}</button><button type="button" class="pxb sm icon" id="mpZin" onclick="mapZoom(1)" aria-label="Zoom in">${ic('plus')}</button></span>
<button type="button" class="pxb sm" id="mpTL" onclick="mapToggle('labels')">Names</button><button type="button" class="pxb sm" id="mpTR" onclick="mapToggle('roads')">Roads</button><button type="button" class="pxb sm" id="mpTK" onclick="mapToggle('legend')">Legend</button></div></div>
<div class="mp-side"><div class="mp-head"><b class="pxh">Map</b><span id="mpDay" class="pxn"></span><button type="button" class="pxb sm" id="mpClose" onclick="closeMap()">${ic('close')}<span>Close</span></button></div>
<div class="mp-card pxf inset" id="mpCard"></div><div class="mp-route" id="mpRoute"></div>
<div class="mp-foot"><button type="button" class="pxb sm" id="mpUndo" onclick="mapUndo()">Remove last</button><button type="button" class="pxb sm" id="mpClear" onclick="mapClear()">Clear</button>
<button type="button" class="pxb pri" id="mpMarch" onclick="mapMarch()">${ic('company')}<span>March</span></button></div></div>`;
 const app=$('app')||document.body,sh=$('sheet');if(sh&&sh.parentNode===app)app.insertBefore(r,sh);else app.appendChild(r);
 ['touchmove','wheel'].forEach(ev=>r.addEventListener(ev,e=>e.stopPropagation(),{passive:true}));
 MP.root=r;MP.cv=r.querySelector('#mpCv');MP.q=MP.cv.getContext('2d');mpWire(MP.cv);return r}

/* ================= OPEN / CLOSE ================= */
function mapOpen(){return MP.open}
function openMap(){if(MP.open)return true;if(typeof document==='undefined'||mode!=='world'||!G||!W||sheetOpen)return false;const r=mpRoot();if(!MP.q)return false;
 if(typeof Inspect!=='undefined'&&Inspect&&Inspect.hide){try{Inspect.hide()}catch(e){}}
 r.classList.add('on');MP.open=true;sheetOpen=true;MP.fresh=true;MP.ptr.clear();MP.gs=null;MP.legend=false;MP.sel=null;
 MP.cx=G.p.x/TS*MP.tp;MP.cy=G.p.y/TS*MP.tp;mpLayout();MP.cx=G.p.x/TS*MP.tp;MP.cy=G.p.y/TS*MP.tp;mpClampCam();
 MP.wps=mpCurrentRoute();mpRecalc();mpTools();mpSide();MP.dirty=true;mpDraw();if(!MP.raf)MP.raf=requestAnimationFrame(mpLoop);
 try{const b=r.querySelector('#mpClose');if(b&&b.focus)b.focus({preventScroll:true})}catch(e){}return true}
function closeMap(quiet){if(!MP.open)return false;MP.open=false;MP.root.classList.remove('on');MP.ptr.clear();MP.gs=null;sheetOpen=false;return true}
/* ================= WORLD HUD: weather + time of day ================= */
function mapTimeOfDay(h){h=((+h||0)%24+24)%24;return h<5||h>=21?{k:'moon',n:'Night'}:h<7?{k:'dawn',n:'Dawn'}:h<12?{k:'sun',n:'Morning'}:h<18?{k:'sun',n:'Afternoon'}:{k:'dawn',n:'Dusk'}}
const MPWX={clear:['','Clear'],rain:['rain','Rain'],snow:['snow','Snow'],storm:['storm','Storm'],fog:['fog','Fog'],sand:['sand','Sandstorm'],cloud:['cloud','Overcast']};
function mapHudWeather(){if(typeof document==='undefined'||!G||mode!=='world')return;const e=$('hWx');if(!e)return;
 const tod=mapTimeOfDay(G.hour),wk=G.weather&&typeof G.weather.kind==='string'&&MPWX[G.weather.kind]?G.weather.kind:'clear',w=MPWX[wk],sig=tod.k+tod.n+wk;if(sig===MP.wxSig)return;MP.wxSig=sig;
 e.innerHTML=`<i class="pxi pxi-wx-${tod.k}" aria-hidden="true"></i>`+(w[0]?`<i class="pxi pxi-wx-${w[0]}" aria-hidden="true"></i>`:'');const txt=tod.n+', '+w[1].toLowerCase();e.title=txt;e.setAttribute('aria-label',txt)}
/* remembers the day each town was last entered (shown on the map card) until worldgen tracks it */
function mpNoteVisit(){try{if(G&&G.townOpen&&G.town!=null&&G.towns&&G.towns[G.town])G.towns[G.town].mv=G.day}catch(e){}}
(function(){try{if(typeof window==='undefined'||typeof document==='undefined'||!window.addEventListener)return;
 window.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target,tn=t&&t.tagName;if(tn==='INPUT'||tn==='TEXTAREA'||tn==='SELECT')return;
  if(e.key==='Escape'){if(MP.open){closeMap();e.preventDefault()}return}
  if(e.key==='m'||e.key==='M'){if(MP.open){closeMap();e.preventDefault()}else if(mode==='world'&&!sheetOpen){openMap();e.preventDefault()}}
  else if(MP.open){if(e.key==='+'||e.key==='=')mapZoom(1);else if(e.key==='-'||e.key==='_')mapZoom(-1);else if(e.key==='Enter'&&MP.wps.length&&!(t&&t.tagName==='BUTTON'))mapMarch();else if(e.key==='Backspace')mapUndo();
   else{const st=24/MP.z*MP.d,dx=e.key==='ArrowLeft'?-st:e.key==='ArrowRight'?st:0,dy=e.key==='ArrowUp'?-st:e.key==='ArrowDown'?st:0;if(dx||dy){MP.cx+=dx;MP.cy+=dy;mpClampCam();MP.dirty=true;e.preventDefault()}}}});
 window.addEventListener('resize',()=>{if(MP.open)mpLayout()});
 if(document.addEventListener)document.addEventListener('pointerdown',mpNoteVisit,true);
 if(typeof setInterval==='function'){const id=setInterval(()=>{mapHudWeather();mpNoteVisit()},400);if(id&&id.unref)id.unref()}}catch(e){}})();
