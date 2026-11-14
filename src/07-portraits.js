/* ================= PORTRAITS (32x32 busts, layered parts, PAL only) =================
   portraitHTML(x,size,cls) / portraitCanvas(x): x is a merc (G.roster[i], town recruit), a battle unit
   (player units carry .m, enemies carry .def and .f) or an enemy type id from EN.
   Everything cosmetic derives from a hash of the merc's id and name (enemy: its type); rnd() is never used.
   A bust is built from outlined layers, back to front: backdrop, shield, weapon, torso + armor, head
   (skin, ears, face, hair, beard, headgear), corner gem for a carried gift. */
const PTC={rows:new Map(),cv:new Map(),url:new Map(),max:400};
function ptHash(s){let h=2166136261;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function ptRng(seed){let a=seed>>>0;return n=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return Math.floor(((t^t>>>14)>>>0)/4294967296*n)}}
/* ---- tiny painter over a 32x32 grid of PAL keys ---- */
function ptL(k){const a=[];for(let i=0;i<32;i++)a.push(new Array(32).fill(k||'.'));return a}
function ptS(L,x,y,k){if(x>=0&&y>=0&&x<32&&y<32&&k&&k!=='.')L[y][x]=k}
function ptG(L,x,y){return x>=0&&y>=0&&x<32&&y<32?L[y][x]:'.'}
function ptH(L,x0,x1,y,k){for(let x=x0;x<=x1;x++)ptS(L,x,y,k)}
function ptV(L,x,y0,y1,k){for(let y=y0;y<=y1;y++)ptS(L,x,y,k)}
function ptR(L,x0,y0,x1,y1,k){for(let y=y0;y<=y1;y++)ptH(L,x0,x1,y,k)}
function ptSt(L,rows,x,y,map,flip){rows.forEach((r,j)=>{const n=r.length;for(let i=0;i<n;i++){let k=r[flip?n-1-i:i];if(k==='.'||k===' ')continue;if(map&&map[k]!==undefined)k=map[k];ptS(L,x+i,y+j,k)}})}
function ptMir(L,x,y,k,k2){ptS(L,x,y,k);ptS(L,31-x,y,k2||k)}
function ptOut(L,k){const o=[];for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(L[y][x]==='.'&&(ptG(L,x-1,y)!=='.'||ptG(L,x+1,y)!=='.'||ptG(L,x,y-1)!=='.'||ptG(L,x,y+1)!=='.'))o.push(x,y);
 for(let i=0;i<o.length;i+=2)L[o[i+1]][o[i]]=k||'0';return L}
function ptOver(D,S){for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(S[y][x]!=='.')D[y][x]=S[y][x];return D}
/* ---- ramps: [dark, mid, light] ---- */
const PT_HAIRC={G:['0','G','o'],H:['i','H','k'],I:['b','I','d'],J:['o','J','r'],K:['f','K','E'],W:['p','q','r'],V:['G','D','C'],N:['2','4','n']};
const PT_CLOTH={green:['4','w','v'],night:['1','G','o'],brown:['a','i','j'],tan:['i','j','k'],red:['f','g','h'],purple:['G','D','C'],blue:['G','X','x'],white:['n','m','l'],steel:['o','p','q'],straw:['b','c','d'],bone:['n','m','l'],verd:['3','7','5'],black:['0','1','3']};
const PT_SKIN={pale:['l','s','t','u'],fair:['s','t','u','i'],tan:['t','u','i','a'],orc:['v','w','4','2'],ashorc:['m','n','4','2'],gob:['v','w','4','1'],dorc:['w','4','3','1'],bone:['l','m','n','0'],rot:['n','o','4','1'],void:['C','D','G','0'],imp:['g','f','a','0'],ash:['q','p','o','G']};   // light, mid, dark, line
const PT_HEAD={human:{y:6,w:[4,6,6,7,7,7,7,7,7,7,7,7,6,6,5,4]},humanf:{y:6,w:[4,6,6,7,7,7,7,7,7,7,7,6,6,5,4,3]},
 elf:{y:6,w:[3,5,6,6,6,6,6,6,6,6,6,6,5,4,3,2]},dwarf:{y:8,w:[5,7,8,8,8,8,8,8,8,8,8,7,6,5]},
 halforc:{y:6,w:[4,6,7,7,7,7,7,7,7,8,8,8,8,8,7,5]},gob:{y:9,w:[4,6,7,7,7,7,7,7,6,5,4,3,2]},
 orc:{y:5,w:[5,7,8,8,8,8,8,8,8,9,9,9,9,9,8,7,5]},skull:{y:6,w:[4,6,7,7,7,7,7,7,7,6,5,4,4,4,4,3]},
 imp:{y:8,w:[4,6,7,7,7,7,7,7,6,5,4,3,2,1]},big:{y:4,w:[6,8,9,10,10,10,10,10,10,10,10,10,10,10,9,9,8,6]}};
const PT_TORSO={normal:[5,7,10,12,13,13,13,13,13,13],slim:[4,6,9,11,12,12,12,12,12,12],broad:[6,9,12,14,15,15,15,15,15,15],huge:[8,11,14,16,16,16,16,16,16,16]};   // half widths, rows 22..31
function ptExt(P){const h=P.head;return{X0:y=>16-h.w[clamp(y-h.y,0,h.w.length-1)],X1:y=>15+h.w[clamp(y-h.y,0,h.w.length-1)],y0:h.y,y1:h.y+h.w.length-1,inF:(x,y)=>y>=h.y&&y<h.y+h.w.length&&x>=16-h.w[y-h.y]&&x<=15+h.w[y-h.y]}}

/* ---- torso and armor ---- */
function ptTorso(P){const L=ptL(),W=PT_TORSO[P.build||'normal'],sk=P.skin,T=y=>{const w=W[clamp(y-22,0,9)];return[Math.max(0,16-w),Math.min(31,15+w)]},
  inT=(x,y)=>y>=22&&y<32&&x>=T(y)[0]&&x<=T(y)[1],top=x=>{for(let y=22;y<32;y++)if(inT(x,y))return y;return 32},
  tone=(x,y)=>{const d=y-top(x),t=T(y);if(x>=t[1]-1||(x>=17&&x<=21&&y<=25+(P.build==='broad'?1:0)&&d>=1))return 0;if((d<=1&&x<17)||(d===0)||x<=t[0]+1&&d<4)return 2;return 1},
  fill=(r,f)=>{for(let y=22;y<32;y++){const t=T(y);for(let x=t[0];x<=t[1];x++){const k=f?f(x,y,tone(x,y)):r[tone(x,y)];if(k)ptS(L,x,y,k)}}},
  neck=(y1)=>{for(let y=19;y<=y1;y++){ptH(L,13,18,y,sk[1]);ptS(L,13,y,sk[0]);ptS(L,14,y,sk[0]);ptS(L,18,y,sk[2])}ptH(L,13,18,22,sk[2]);ptH(L,14,18,23,sk[2]);ptS(L,14,23,sk[1])},
  vneck=(depth,hem)=>{for(let y=24;y<=24+depth;y++){const w=Math.round((24+depth-y)*3/depth);for(let x=15-w;x<=16+w;x++)ptS(L,x,y,x>=16?sk[2]:x>=15-w+1?sk[1]:sk[1]);if(hem){ptS(L,14-w,y,hem);ptS(L,17+w,y,hem)}}};
 const a=P.armor;
 if(a==='rags'){const r=ptCl(P.ragC||'tan');fill(r);neck(24);vneck(4,r[0]);
  ptR(L,7,28,9,30,'m');ptS(L,9,28,'n');ptH(L,7,9,30,'n');ptS(L,8,29,r[0]);                      // patch
  ptS(L,22,27,r[0]);ptS(L,23,28,r[0]);ptS(L,22,29,r[0]);ptS(L,5,26,r[0]);ptS(L,6,27,r[0]);ptH(L,19,21,30,r[0])}
 else if(a==='robe'){const r=ptCl(P.robeC||'blue');fill(r);neck(23);
  for(let i=0;i<8;i++){ptS(L,12+Math.round(i*.55),24+i,'c');ptS(L,13+Math.round(i*.55),24+i,'b');if(i<5){ptS(L,19-Math.round(i*.6),24+i,'c');ptS(L,20-Math.round(i*.6),24+i,r[0])}}
  ptH(L,12,19,24,'c');ptS(L,12,24,'d');ptS(L,19,24,'b');for(let y=25;y<=27;y++)ptH(L,14+(y-25>>1),18-(y-25),y,r[0]);
  ptS(L,7,28,'F');ptS(L,8,27,'F');ptS(L,8,29,'F');ptS(L,9,28,'F');ptS(L,8,28,'r');                // ward sigil
  ptH(L,3,5,31,'c');ptH(L,26,28,31,'b')}
 else if(a==='padded'){const r=P.clothC||PT_CLOTH.white;fill(r,(x,y,t)=>(x%4===2&&y>24)?r[Math.max(0,t-1)]:r[t]);neck(22);
  ptH(L,11,20,23,'l');ptH(L,11,20,24,'m');ptH(L,12,19,25,'n');ptS(L,11,23,'r');ptS(L,12,23,'r');ptS(L,20,23,'m');ptS(L,20,24,'n');
  for(let y=26;y<32;y+=2){ptS(L,15,y,'j');ptS(L,16,y,'i')}for(let x=4;x<28;x++)if(inT(x,29)&&x%4!==2)ptS(L,x,29,x>21?'n':'m')}
 else if(a==='leather'){const r=PT_CLOTH.tan;fill(r);neck(23);
  ptH(L,13,18,24,'m');ptH(L,14,17,25,'m');ptH(L,15,16,26,'n');ptS(L,17,25,'n');ptS(L,18,24,'n');
  for(let x=3;x<=11;x++){const y=top(x)+3+(x<5?1:0);if(inT(x,y))ptS(L,x,y,'i')}for(let x=20;x<=28;x++){const y=top(x)+3+(x>26?1:0);if(inT(x,y))ptS(L,x,y,'a')}
  for(let i=0;i<9;i++){const x=8+i*1.4|0,y=24+i;if(inT(x,y)&&y<32){ptS(L,x,y,'a');ptS(L,x+1,y,'a');ptS(L,x+2,y,'i')}}
  ptR(L,12,27,13,28,'c');ptS(L,12,27,'d');ptS(L,13,28,'b');ptS(L,5,28,'c');ptS(L,26,28,'b');ptS(L,5,30,'c');ptS(L,26,30,'b')}
 else if(a==='mail'){const r=PT_CLOTH.steel;neck(21);fill(r,(x,y,t)=>(y%2===0?(x%2?r[t]:r[Math.max(0,t-1)]):(x%2?r[Math.max(0,t-1)]:r[Math.min(2,t+(t?0:1))])));
  for(let y=22;y<=24;y++)for(let x=12;x<=19;x++)ptS(L,x,y,(x+y)%2?'p':(x<15?'q':'o'));ptH(L,12,19,25,'o');ptH(L,13,18,21,'o');ptS(L,13,21,'p');ptS(L,15,21,'p');
  for(let i=0;i<7;i++){const x=20-i,y=25+i;ptS(L,x,y,'i');ptS(L,x+1,y,'j')}ptS(L,17,28,'c')}
 else if(a==='scale'){const r=PT_CLOTH.steel;neck(22);fill(r,(x,y,t)=>{const v=(y+5)%3,u=(x+((y+5)/3|0)%2*2)%4,base=t===2?'q':'p';if(v===2)return u===2?base:'o';if(u===0)return'o';if(v===0)return u===3?base:t===2?'r':'q';return base});
  ptH(L,11,20,23,'c');ptH(L,11,20,24,'b');ptH(L,12,13,23,'d');ptS(L,20,23,'b');ptS(L,20,24,'a');ptH(L,12,19,25,'a');ptS(L,15,24,'g');ptS(L,16,24,'f');
  for(let x=2;x<30;x++){const y=top(x);if(y<32&&(x<11||x>20)){ptS(L,x,y,x<16?'d':'b');ptS(L,x,y+1,x<16?'c':'a')}}}
 else if(a==='plate'){const r=PT_CLOTH.steel;neck(21);fill(r,(x,y,t)=>{const d=y-top(x),pl=x<=10||x>=21;if(x===11||x===20)return'o';if(!pl)return x===15?'q':x===16?'o':y<=26?'o':'p';
   if(y===28||y===31)return x<16?'o':'G';if(x<16)return d===0?'r':d===1||y===29?'q':x<=T(y)[0]+1?'q':'p';return d===0?'q':x>=T(y)[1]-1?'o':y===29?'p':d<3?'p':'o'});
  ptH(L,11,20,22,'q');ptH(L,11,20,23,'p');ptH(L,11,20,24,'p');ptH(L,11,20,25,'o');ptH(L,11,14,22,'r');ptS(L,20,22,'p');ptS(L,20,23,'o');ptS(L,20,24,'o');ptS(L,11,23,'q');ptS(L,12,23,'q');
  ptS(L,8,30,'c');ptS(L,23,30,'b');ptS(L,5,26,'c');ptS(L,26,26,'b');ptS(L,13,27,'c');ptS(L,18,27,'b');ptH(L,12,14,28,'q');ptH(L,12,13,29,'q')}
 else if(a==='brig'){const r=P.clothC||PT_CLOTH.red;fill(r);neck(22);ptH(L,12,19,23,'o');ptH(L,12,19,24,'p');ptS(L,12,24,'q');
  for(let y=25;y<32;y+=2)for(let x=2;x<30;x+=2){const xx=x+((y>>1)&1);if(inT(xx,y)&&(xx<14||xx>17))ptS(L,xx,y,xx<16?'d':'c')}ptV(L,15,25,31,r[0]);ptV(L,16,25,31,r[0])}
 else if(a==='lamellar'){const r=PT_CLOTH.steel;neck(22);fill(r,(x,y,t)=>y%3===0?'o':((x>>1)&1)?r[t]:r[Math.min(2,t+1)]);for(let y=24;y<32;y+=3)for(let x=1;x<31;x+=4)if(inT(x,y))ptS(L,x,y,'g');ptH(L,12,19,23,'f');ptH(L,13,18,22,'g')}
 else if(a==='coat'){const r=P.clothC||PT_CLOTH.night,st=PT_CLOTH.steel;fill(r,(x,y,t)=>(y===24||y===25||y===27||y===28||y===30||y===31)&&(x<15||x>16)?(y%3===0?st[2]:st[t]):r[t]);neck(22);
  for(const y of[24,27,30])for(let x=3;x<29;x+=4)if(inT(x,y)&&(x<15||x>16))ptS(L,x,y,'r');ptH(L,12,19,23,'o')}
 else if(a==='bare'){fill([sk[2],sk[1],sk[0]]);neck(23);ptH(L,11,14,26,sk[2]);ptH(L,17,20,26,sk[2]);ptV(L,15,27,31,sk[2])}
 else if(a==='fur'){const r=PT_CLOTH.brown;fill(r,(x,y,t)=>((x*7+y*5)%6<2)?r[Math.min(2,t+1)]:((x*3+y*7)%5===0?r[0]:r[t]));neck(23);vneck(3,r[2]);ptS(L,15,29,'l');ptS(L,16,30,'m');ptS(L,15,30,'l')}
 else if(a==='bone'){fill(['G','o','p'],(x,y,t)=>['G','o','p'][t]);neck(23);for(let y=25;y<32;y+=2){ptH(L,10,21,y,'l');ptS(L,21,y,'m');ptS(L,20,y,'m')}ptV(L,15,24,31,'l');ptV(L,16,24,31,'m')}
 else if(a==='void'){const r=['0','G','D'];neck(21);fill(r,(x,y,t)=>r[t]);ptH(L,11,20,22,'D');ptH(L,11,20,23,'G');ptH(L,11,20,24,'0');ptH(L,11,13,22,'C');
  for(const s of [0,1]){for(let i=0;i<6;i++){const x=s?26+ (i>>1):5-(i>>1),y=24-i;ptS(L,x,y,i<2?'D':'G');ptS(L,s?x-1:x+1,y,s?'D':'C')}}
  ptS(L,15,27,'C');ptS(L,16,27,'D');ptS(L,15,28,'D');ptS(L,16,28,'C');ptS(L,15,29,'C');ptS(L,16,29,'D')}
 else{const r=PT_CLOTH[P.shirtC||'white'];fill(P.clothC||['4','n','m']);neck(24);vneck(3,'4')}
 ptTorsoV(L,P,inT,top);if(P.garb||P.bgTrim)ptGarb(L,P,inT,top);
 if(P.beads){const c=P.beads,pts=[[11,24],[11,25],[12,26],[13,27],[14,28],[15,29],[16,29],[17,28],[18,27],[19,26],[20,25],[20,24]];pts.forEach(([x,y],i)=>ptS(L,x,y,i%2?c[0]:c[1]));ptR(L,15,30,16,31,c[2]||'c');ptS(L,15,30,c[3]||'d')}
 return ptOut(L)}

/* per-look details over a torso kind (the item's own drawing: jack, hide, studded, sigils, gothic fluting...) */
function ptTorsoV(L,P,inT,top){const V=P.av;if(!V)return;if(V.pm||V.cr||V.tex==='scales')ptTorsoCraft(L,P,inT,top);const a=P.armor,res=P.gem&&PT_RESK[P.gem]?PT_RESK[P.gem]:['x','X'];
 if(V.gold){for(let x=0;x<32;x++){const y=top(x);if(y<32&&(x<12||x>19))ptS(L,x,y,x<16?'d':'c')}for(let x=11;x<=20;x++)ptS(L,x,30,x<16?'d':'b');ptS(L,15,30,'e');ptS(L,7,26,'e');ptS(L,24,27,'d')}
 if(V.tex==='diamond')for(let y=23;y<32;y++)for(let x=0;x<32;x++)if(inT(x,y)&&(((x+y)&3)===0||((x-y)&3)===0)&&(x<14||x>17))ptS(L,x,y,(P.clothC||PT_CLOTH.tan)[0]);
 if(V.collar){ptH(L,11,20,22,'k');ptH(L,11,20,21,'j');ptS(L,11,21,'k');ptS(L,20,22,'i');ptS(L,20,21,'i')}
 if(V.tex==='hide')for(let y=23;y<32;y++)for(let x=0;x<32;x++)if(inT(x,y)&&(x*5+y*3)%11===0)ptS(L,x,y,'a');
 if(V.tex==='studs')for(let y=25;y<32;y+=2)for(let x=1+((y>>1)&1)*2;x<31;x+=4)if(inT(x,y)&&ptG(L,x,y)!=='.')ptS(L,x,y,'q');
 if(V.mantle){const r=a==='robe'?PT_CLOTH.purple:PT_CLOTH.brown;for(let x=0;x<32;x++){const y=top(x);if(y>=32)continue;for(let j=0;j<3;j++)if(inT(x,y+j)&&!(j===2&&(x&1)))ptS(L,x,y+j,j===0?r[2]:(x*7+j)%5===0?r[0]:r[1])}if(a==='robe'){ptS(L,15,24,'d');ptS(L,16,24,'c');ptS(L,15,25,'b')}}
 if(V.mailtop)for(let y=22;y<=26;y++)for(let x=0;x<32;x++)if(inT(x,y)&&(x<13||x>18||y>25))ptS(L,x,y,(x+y)&1?'p':'o');
 if(V.sig){const g=res;for(const [x,y] of (V.sig===2?[[7,26],[24,26],[6,29],[25,29]]:[[8,27],[23,27]])){ptS(L,x,y,g[0]);ptS(L,x+1,y,g[1]);ptS(L,x,y+1,g[1]);ptS(L,x,y-1,'r')}}
 if(V.trim==='gold')for(let y=24;y<32;y++){ptS(L,11,y,'d');ptS(L,20,y,'b')}else if(V.trim==='white')for(let y=24;y<32;y++){ptS(L,12,y,'l');ptS(L,19,y,'m')}else if(V.trim==='steel')for(let y=24;y<32;y++){ptS(L,12,y,'q');ptS(L,19,y,'o')}
 if(V.tex==='flute'){for(let y=25;y<32;y++)for(let x=3;x<29;x+=4)if(inT(x,y)&&inT(x+1,y)&&x!==15&&x!==16){ptS(L,x,y,x<16?'r':'q');ptS(L,x+1,y,'o')}for(const x of[4,27]){const y=top(x);if(y<32){ptS(L,x,y-1,'q');ptS(L,x,y-2,'r')}}}}
/* ---- head: skin, ears, face ---- */
function ptHead(P,R){const L=ptL(),E=ptExt(P),sk=P.skin,h=P.head,n=h.w.length,ey=P.ey||14,f=P.face||{};
 for(let i=0;i<n;i++){const y=h.y+i,x0=E.X0(y),x1=E.X1(y);ptH(L,x0,x1,y,sk[0]);ptS(L,x1,y,sk[1]);ptS(L,x1-1,y,sk[1]);if(i>n/2-1)ptS(L,x1,y,sk[2]);if(i>=n-3){ptS(L,x1-2,y,sk[1]);ptS(L,x1-1,y,sk[2])}if(i===n-1){ptH(L,x0+1,x1,y,sk[1]);ptH(L,x1-2,x1,y,sk[2])}}
 if(P.ears!=='elf'&&P.ears!=='gob')ptEars(L,P,E);
 // brows
 const bc=f.browC||sk[2],bs=f.brow||0,by=ey-2;
 if(bs!==9){if(bs===1){ptMir(L,11,by-1,bc);ptMir(L,12,by,bc);ptMir(L,13,by,bc)}                 // arched
  else if(bs===2){ptMir(L,11,by,bc);ptMir(L,12,by,bc);ptMir(L,13,by+1,bc);ptMir(L,12,by+1,bc)}  // stern
  else if(bs===3){ptR(L,11,by-1,13,by,bc);ptR(L,18,by-1,20,by,bc)}                               // heavy
  else if(bs===4){ptMir(L,12,by,bc);ptMir(L,13,by,bc)}                                           // thin
  else if(bs===5){ptH(L,10,21,by,bc);ptMir(L,13,by+1,bc);ptMir(L,12,by+1,bc)}                    // ridge (orc)
  else{ptH(L,11,13,by,bc);ptH(L,18,20,by,bc)}}
 // eyes
 const ic=f.iris||'0',wh=f.white||'r',es=f.eye||0;
 if(es===1){ptS(L,12,ey,ic);ptS(L,13,ey,ic);ptS(L,18,ey,ic);ptS(L,19,ey,ic)}                     // narrow / squint
 else if(es===2){ptH(L,11,13,ey,wh);ptH(L,18,20,ey,wh);ptS(L,12,ey,ic);ptS(L,19,ey,ic);ptH(L,11,13,ey-1,sk[2]);ptH(L,18,20,ey-1,sk[2])}   // wide
 else if(es===3){ptR(L,11,ey-1,13,ey,wh);ptR(L,18,ey-1,20,ey,wh);ptS(L,12,ey,ic);ptS(L,19,ey,ic);ptS(L,12,ey-1,ic);ptS(L,19,ey-1,ic)}      // big round (goblin)
 else if(es===4){ptH(L,11,13,ey,ic);ptH(L,18,20,ey,ic);ptS(L,12,ey,wh);ptS(L,19,ey,wh)}          // glowing
 else if(es===5){ptR(L,11,ey-1,13,ey+1,'0');ptR(L,18,ey-1,20,ey+1,'0');ptS(L,12,ey,ic);ptS(L,19,ey,ic)}   // sockets
 else{ptS(L,12,ey,wh);ptS(L,13,ey,ic);ptS(L,18,ey,ic);ptS(L,19,ey,wh);if(f.lash){ptS(L,11,ey-1,sk[3]);ptS(L,20,ey-1,sk[3]);ptH(L,12,13,ey-1,sk[2]);ptH(L,18,19,ey-1,sk[2])}else if(f.lid){ptH(L,12,13,ey-1,sk[2]);ptH(L,18,19,ey-1,sk[2])}}
 if(f.bags){ptH(L,12,13,ey+1,sk[1]);ptH(L,18,19,ey+1,sk[2])}
 // nose
 const ns=f.nose||0,ny=ey+1;
 if(ns===1){ptV(L,16,ny-1,ny+1,sk[1]);ptH(L,15,16,ny+2,sk[2]);ptS(L,17,ny+2,sk[1])}             // long
 else if(ns===2){ptV(L,16,ny,ny+1,sk[1]);ptH(L,14,17,ny+2,sk[1]);ptH(L,15,16,ny+2,sk[2]);ptS(L,14,ny+1,sk[1]);ptS(L,17,ny+1,sk[2])}   // broad
 else if(ns===3){ptR(L,14,ny,17,ny+2,sk[1]);ptH(L,14,15,ny,sk[0]);ptS(L,14,ny+1,sk[0]);ptH(L,16,17,ny+2,sk[2]);ptS(L,17,ny+1,sk[2]);ptS(L,15,ny+1,P.noseC||sk[1])}   // bulbous (dwarf)
 else if(ns===4){ptS(L,15,ny+1,sk[3]);ptS(L,16,ny+1,sk[3]);ptS(L,15,ny,sk[2]);ptS(L,16,ny,sk[2])}  // slits / skull
 else if(ns===5){ptV(L,16,ny-1,ny+2,sk[1]);ptV(L,15,ny,ny+3,sk[0]);ptS(L,16,ny+3,sk[2]);ptS(L,15,ny+3,sk[1]);ptS(L,14,ny+2,sk[1])}    // hooked long (goblin)
 else{ptS(L,16,ny,sk[1]);ptS(L,16,ny+1,sk[1]);ptH(L,15,16,ny+2,sk[2])}
 // mouth
 const ms=f.mouth||0,my=P.my||ey+5,mc=f.lip||sk[3];
 if(ms===1){ptH(L,15,16,my,mc)}
 else if(ms===2){ptH(L,13,18,my,mc)}
 else if(ms===3){ptH(L,14,16,my,mc);ptS(L,17,my-1,mc)}                                           // smirk
 else if(ms===4){ptH(L,14,17,my,mc);ptS(L,13,my+1,mc);ptS(L,18,my+1,mc)}                         // frown
 else if(ms===5){ptH(L,13,18,my,'0');ptH(L,14,17,my,'l');ptS(L,15,my,'m');ptS(L,17,my,'m')}      // teeth
 else if(ms===6){ptH(L,13,18,my,sk[3]);ptS(L,13,my-1,'l');ptS(L,13,my-2,'r');ptS(L,18,my-1,'m');ptS(L,18,my-2,'l')}   // tusks
 else if(ms===7){ptH(L,12,19,my,sk[3]);ptS(L,12,my-1,'l');ptS(L,12,my-2,'l');ptS(L,12,my-3,'r');ptS(L,13,my-1,'m');ptS(L,19,my-1,'m');ptS(L,19,my-2,'m');ptS(L,19,my-3,'l');ptS(L,18,my-1,'n')}   // great tusks
 else if(ms===8){ptH(L,14,17,my,sk[3]);ptS(L,13,my,'l');ptS(L,18,my,'m');ptS(L,13,my-1,'r')}
 else if(ms!==9)ptH(L,14,17,my,mc);
 if(ms<5&&!f.nolip)ptH(L,15,16,my+1,sk[1]);
 // marks
 const mk=P.marks||{};
 if(mk.freckles){ptS(L,11,ey+2,sk[1]);ptS(L,13,ey+3,sk[1]);ptS(L,18,ey+3,sk[2]);ptS(L,20,ey+2,sk[2])}
 if(mk.blush){ptH(L,11,12,ey+3,'h');ptH(L,19,20,ey+3,'h')}
 if(mk.scar===1){ptS(L,19,ey-3,'g');ptS(L,19,ey-2,'g');ptS(L,20,ey+1,'g');ptS(L,20,ey+2,'g');ptS(L,21,ey+3,'f')}
 else if(mk.scar===2){ptS(L,10,ey+2,'g');ptS(L,11,ey+3,'g');ptS(L,12,ey+4,'g');ptS(L,13,ey+5,'f')}
 else if(mk.scar===3){ptH(L,10,12,ey+3,'g');ptS(L,13,ey+3,'f')}
 if(mk.paint===1){ptH(L,10,13,ey+2,mk.paintC||'g');ptH(L,18,21,ey+2,mk.paintC||'g')}
 else if(mk.paint===2){const c=mk.paintC||'X';ptV(L,12,ey-4,ey-1,c);ptV(L,12,ey+1,ey+3,c);ptV(L,15,ey+6,h.y+n-1,c);ptV(L,16,ey+6,h.y+n-1,c)}
 else if(mk.paint===3){ptH(L,E.X0(ey),E.X1(ey),ey,mk.paintC||'G');ptH(L,E.X0(ey)+1,E.X1(ey)-1,ey-1,mk.paintC||'G');ptS(L,12,ey,wh);ptS(L,13,ey,ic);ptS(L,18,ey,ic);ptS(L,19,ey,wh)}
 if(mk.patch){ptR(L,17,ey-1,20,ey+1,'0');ptS(L,17,ey+1,sk[1]);ptS(L,20,ey+1,sk[1]);for(let x=E.X0(ey-3);x<=E.X1(ey-3);x++){const y=ey-3+Math.round((x-10)*-.0)+(x>16?1:0)-(x<13?0:0);ptS(L,x,ey-2-(x<16?1:0)+(x>18?1:0),'0')}}
 if(mk.stubble){for(let y=ey+3;y<=h.y+n-1;y++)for(let x=E.X0(y);x<=E.X1(y);x++)if((x+y)%2===0&&(y>=my+1||x<13||x>18)&&ptG(L,x,y)!==mc)ptS(L,x,y,ptG(L,x,y)===sk[0]?sk[1]:sk[2])}
 return{L,E}}

function ptEars(L,P,E){const sk=P.skin,ey=P.ey||14,ear=P.ears||'human',ex0=E.X0(ey)-1,ex1=E.X1(ey)+1;
 if(ear==='human'||ear==='dwarf'){ptV(L,ex0,ey-1,ey+1,sk[1]);ptV(L,ex1,ey-1,ey+1,sk[2]);ptS(L,ex0,ey-1,sk[0]);if(ear==='dwarf'){ptS(L,ex0,ey+2,sk[1]);ptS(L,ex1,ey+2,sk[2])}}
 else if(ear==='elf'){for(let i=0;i<4;i++){ptS(L,ex0-i,ey-i,sk[1]);ptS(L,ex0-i,ey-1-i,sk[0]);ptS(L,ex1+i,ey-i,sk[2]);ptS(L,ex1+i,ey-1-i,sk[1])}ptS(L,ex0,ey+1,sk[1]);ptS(L,ex1,ey+1,sk[2])}
 else if(ear==='orc'){ptV(L,ex0,ey-1,ey+1,sk[1]);ptV(L,ex1,ey-1,ey+1,sk[2]);ptS(L,ex0-1,ey-1,sk[1]);ptS(L,ex0-1,ey-2,sk[0]);ptS(L,ex1+1,ey-1,sk[2]);ptS(L,ex1+1,ey-2,sk[1])}
 else if(ear==='gob'){for(let i=0;i<6;i++){const yy=ey-(i>>1)+(i>3?1:0);ptS(L,ex0-i,yy,sk[i<4?0:1]);ptS(L,ex0-i,yy+1,sk[1]);if(i<4)ptS(L,ex0-i,yy+2,sk[2]);ptS(L,ex1+i,yy,sk[1]);ptS(L,ex1+i,yy+1,sk[2]);if(i<4)ptS(L,ex1+i,yy+2,sk[2])}
  ptS(L,ex0-1,ey+1,sk[3]);ptS(L,ex0-2,ey,sk[3]);ptS(L,ex1+1,ey+1,sk[3]);ptS(L,ex1+2,ey,sk[3])}}
/* ---- hair ---- */
const PT_HAIR={crop:{v:1,hl:9,fr:'flat',sb:1,se:12},short:{v:1,hl:10,fr:'jag',sb:1,se:13},shaggy:{v:2,hl:11,fr:'jag',sb:2,se:16,wide:1},long:{v:1,hl:10,fr:'part',sb:2,se:26,lock:3},
 swept:{v:2,hl:10,fr:'swept',sb:1,se:13},bowl:{v:1,hl:11,fr:'flat',sb:2,se:13},bun:{v:1,hl:9,fr:'widow',sb:1,se:12,knot:1},tail:{v:1,hl:9,fr:'widow',sb:1,se:12,tail:1},
 braids:{v:1,hl:10,fr:'part',sb:2,se:27,lock:2,braid:1},curly:{v:2,hl:10,fr:'jag',sb:2,se:17,wide:1},mohawk:{mo:1},tonsure:{v:0,hl:10,fr:'flat',sb:2,se:13,ton:1},
 mane:{v:2,hl:10,fr:'part',sb:3,se:27,lock:4,wide:1},wisps:{v:0,hl:8,fr:'jag',sb:1,se:15}};
function ptHair(L,P,E,R){const S=PT_HAIR[P.hair];if(!S)return;const c=P.hairC,H=ptL(),hy=E.y0,w0=P.head.w[0],wide=S.wide||0,seed=P.seed>>>0;
 if(S.mo){for(let y=hy-4;y<=hy+3;y++){const hw=y<hy-3?1:2;ptH(H,16-hw,15+hw,y,c[1])}}
 else{const top=hy-S.v,px=13+seed%6,half=y=>y<hy?Math.max(2,w0+1-(hy-y)-(hy-y>1?1:0))+wide:P.head.w[clamp(y-hy,0,P.head.w.length-1)]+1+wide,
   fr=x=>{const t=S.fr;if(t==='part')return S.hl-(Math.abs(x-px)<=0?3:Math.abs(x-px)<=1?2:Math.abs(x-px)<=2?1:0);if(t==='swept')return S.hl-2+Math.floor((x-9)/4);if(t==='widow')return S.hl-(x===15||x===16?0:1);
    if(t==='jag')return S.hl-((seed>>(x&15))&1)-((x===12||x===19)?1:0);return S.hl};
  for(let y=S.ton?hy+2:top;y<=S.se;y++){const hw=half(Math.min(y,E.y1));let x0=16-hw,x1=15+hw;
   if(y>E.y0+10&&S.lock){x0=16-P.head.w[8]-1-wide;x1=31-x0}
   for(let x=x0;x<=x1;x++){const side=x<E.X0(Math.min(y,E.y1))+S.sb||x>E.X1(Math.min(y,E.y1))-S.sb,lk=S.lock&&y>E.y0+10?(x<x0+S.lock||x>x1-S.lock):true;
    if(y<hy||(y<fr(x)&&y<=S.hl+1)||(side&&lk&&(y<=S.se)))ptS(H,x,y,c[1])}}
  if(S.ton){}
  if(S.knot){ptR(H,14,hy-4,17,hy-2,c[1]);ptH(H,15,16,hy-5,c[1])}
  if(S.tail){for(let i=0;i<9;i++){const x=E.X1(14)+2+(i>2?1:0)-(i>6?1:0),y=hy+1+i;ptS(H,x,y,c[1]);ptS(H,x+1,y,c[1])}ptH(H,E.X1(14)+1,E.X1(14)+2,hy+1,c[1])}}
 // shade
 const isH=(x,y)=>ptG(H,x,y)!=='.',top=S.mo?hy-4:hy-S.v;
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){if(!isH(x,y))continue;let k=c[1];
  const edgeB=!isH(x,y+1)&&E.inF(x,y+1),edgeL=!isH(x+1,y)&&E.inF(x+1,y)&&x<16,edgeR=!isH(x-1,y)&&E.inF(x-1,y)&&x>15;
  if(edgeB||edgeR||(!isH(x+1,y)&&x>15)||(x>15&&!isH(x+2,y)&&y>hy+1))k=c[0];
  else if((y===top+1&&x>=12&&x<=15)||(y===top+2&&x>=10&&x<=12)||(S.lock&&x<16&&!isH(x-1,y)&&y>hy+3&&y%3!==0))k=c[2];
  else if(edgeL)k=c[0];
  if(S.braid&&y>E.y0+10){k=y%3===0?c[0]:(x<16&&!isH(x-1,y))?c[2]:c[1];if(y>=S.se-1)k=y===S.se?'b':'c'}
  if(S.curl&&k===c[1]&&((x*5+y*3)%7===0))k=c[0];if(S.curl&&k===c[1]&&((x*3+y*5)%11===0)&&x<16)k=c[2];
  if(S.mo){k=x===14||(x===15&&y<hy-1)?c[2]:x>=17?c[0]:c[1]}
  if(P.hat==='hood'&&y>S.hl+1)continue;
  ptS(L,x,y,k);if(edgeB&&ptG(L,x,y+1)===P.skin[0])ptS(L,x,y+1,P.skin[1])}
 if(S.mo||S.ton){const sk=P.skin;if(S.ton){ptH(L,13,15,hy,'r'===sk[0]?sk[0]:sk[0]);ptH(L,12,14,hy+1,sk[0])}}}
/* ---- beards ---- */
function ptBeard(L,P,E){const b=P.beard;if(!b)return;const c=P.beardC||P.hairC,ey=P.ey||14,my=P.my||ey+5,yb=E.y1,H=ptL(),sk=P.skin;
 const jaw=(y0,y1,grow,taper)=>{for(let y=y0;y<=y1;y++){let x0,x1;if(y<=yb){x0=E.X0(y)-grow;x1=E.X1(y)+grow}else{const t=(y-yb)*taper;x0=Math.round(E.X0(yb)-grow+t);x1=31-x0}
   for(let x=x0;x<=x1;x++){if(y<my-1&&x>12&&x<19)continue;if(y<=my-1&&y>=my-2&&x>13&&x<18&&y<my-1)continue;ptS(H,x,y,c[1])}}};
 if(b==='stache'){ptH(H,13,18,my-1,c[1]);ptS(H,12,my,c[1]);ptS(H,19,my,c[1])}
 else if(b==='goatee'){ptH(H,13,18,my-1,c[1]);ptV(H,13,my,my+1,c[1]);ptV(H,18,my,my+1,c[1]);for(let y=my+1;y<=yb+2;y++)ptH(H,y>yb?14:13,y>yb?17:18,y,c[1])}
 else if(b==='short'){jaw(my-3,yb+1,0,1.2);ptH(H,13,18,my-1,c[1])}
 else if(b==='full'){jaw(my-3,yb+3,1,1.1);ptH(H,13,18,my-1,c[1])}
 else if(b==='long'){jaw(my-3,yb+7,1,.75);ptH(H,13,18,my-1,c[1])}
 else if(b==='dwarf'){jaw(my-4,yb+9,1,.55);ptH(H,12,19,my-1,c[1]);ptH(H,12,19,my-2,c[1]);ptH(H,14,17,my-2,'.');for(let x=14;x<=17;x++)H[my-2][x]='.'}
 else if(b==='fork'){jaw(my-4,yb+4,1,.6);ptH(H,12,19,my-1,c[1]);for(let y=yb+5;y<=yb+10;y++){ptH(H,10,13,y,c[1]);ptH(H,18,21,y,c[1])}}
 else if(b==='chops'){for(let y=ey+1;y<=yb;y++){ptH(H,E.X0(y),E.X0(y)+1,y,c[1]);ptH(H,E.X1(y)-1,E.X1(y),y,c[1])}}
 const isH=(x,y)=>ptG(H,x,y)!=='.';
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){if(!isH(x,y))continue;let k=c[1];
  if(x>=16&&(!isH(x+1,y)||!isH(x+2,y)))k=c[0];else if(!isH(x,y+1)&&y>yb)k=c[0];else if(x<16&&!isH(x-1,y)&&y<=yb+2)k=c[2];
  if(y===my-1&&x>=13&&x<=18&&b!=='chops')k=x<16?c[2]:c[1];
  if((b==='dwarf'||b==='long'||b==='full')&&y>my&&((x===15&&y%2===0)||(x===11&&y%3===1)||(x===20&&y%3===2)))k=c[0];
  if(b==='fork'&&y>yb+4){k=y%3===0?c[0]:x===10||x===18?c[2]:c[1];if(y>=yb+9)k=y===yb+10?'b':'c'}
  if(b==='dwarf'&&P.ring&&y>=yb+6&&y<=yb+7&&x>=14&&x<=17)k=y===yb+6?'c':'b';
  ptS(L,x,y,k)}
 if(b!=='stache'&&b!=='chops'&&b!=='goatee'){ptH(L,14,17,my,sk[3]==='0'?'0':'f');if(b==='dwarf'||b==='fork')ptH(L,14,17,my,c[0])}}
/* ---- headgear (drawn over hair) ---- */
function ptHat(L,P,E){const t=P.hat;if(!t)return;if(ptHatBg(L,P,E))return;const sk=P.skin,ey=P.ey||14,c=t==='coif'?PT_CLOTH.steel:ptCl(P.hatC)||PT_CLOTH.brown;
 if(t==='great'||t==='barbute'||t==='armet'||t==='bascinet'){ptFullHelm(L,P,E,t);return}
 if(t==='spangen'||t==='sallet'||t==='armcap'){ptHelm2(L,P,E,t);return}
 if(t==='hood'||t==='coif'){const peak=E.y0-3,out=y=>{const d=y-peak;return d<=0?3:d===1?5:d===2?7:d===3?8:Math.max(9,P.head.w[clamp(y-E.y0,0,P.head.w.length-1)]+2)};
  for(let y=peak;y<=23;y++){const hw=y>E.y1?out(E.y1)-(y-E.y1>1?1:0):out(y);for(let x=16-hw;x<=15+hw;x++){
    const open=y>=ey-4&&y<=E.y1+1&&x>=E.X0(Math.min(y,E.y1))+(y<ey-2?2:y<ey+4?0:0)&&x<=E.X1(Math.min(y,E.y1))-(y<ey-2?2:0)&&!(y===ey-4&&(x<13||x>18));
    if(open){if(y<=ey-3&&ptG(L,x,y)===sk[0])ptS(L,x,y,sk[1]);else if(y<=ey-3&&ptG(L,x,y)===sk[1])ptS(L,x,y,sk[2]);continue}
    if(y>E.y1+1&&x>=14&&x<=17)continue;
    const rim=(y>=ey-5&&y<=E.y1+1)&&(E.inF(x+1,y)&&x<16||E.inF(x-1,y)&&x>15||(y===ey-5&&x>=13&&x<=18)||(y===ey-4&&(x<13||x>18)&&x>=E.X0(y)+1&&x<=E.X1(y)-1));
    let kk=rim?c[0]:x>=15+hw-1||x>20&&y>peak+2?c[0]:(x<=16-hw+2&&y>peak+2&&y<ey+3)||(y<=peak+2&&x<16)||(y===peak+3&&x>10&&x<15)?c[2]:c[1];
    if(t==='coif'&&!rim&&((x+y)&1))kk=kk===c[2]?c[1]:kk===c[1]?c[0]:kk;                                   // mail: the rings read as a checker of two tones
    ptS(L,x,y,kk)}}
  ptS(L,13,23,c[0]);ptS(L,18,23,c[0])}
 else if(t==='straw'){const y0=E.y0-3;ptH(L,12,19,y0,c[1]);ptR(L,11,y0+1,20,y0+4,c[1]);ptH(L,13,16,y0,c[2]);ptH(L,12,14,y0+1,c[2]);ptS(L,12,y0+2,c[2]);ptV(L,20,y0+1,y0+4,c[0]);ptV(L,19,y0+2,y0+4,c[0]);
  ptH(L,11,20,y0+4,'i');ptH(L,11,14,y0+4,'j');ptH(L,5,26,y0+5,c[1]);ptH(L,4,27,y0+6,c[1]);ptH(L,5,15,y0+5,c[2]);ptH(L,18,27,y0+6,c[0]);ptH(L,6,26,y0+7,c[0]);
  for(let x=6;x<=25;x+=3)ptS(L,x,y0+6,c[0]);for(let x=E.X0(y0+8);x<=E.X1(y0+8);x++){const k=ptG(L,x,y0+8);if(k===sk[0])ptS(L,x,y0+8,sk[1])}}
 else if(t==='kettle'||t==='nasal'||t==='cap'){const r=t==='cap'?PT_CLOTH.tan:PT_CLOTH.steel,y0=E.y0-2,hw0=P.head.w[3]+1;
  for(let y=y0;y<=ey-4;y++){const d=y-y0,hw=d===0?hw0-4:d===1?hw0-2:d===2?hw0-1:hw0;for(let x=16-hw;x<=15+hw;x++)ptS(L,x,y,x>=15+hw-1?r[0]:(d===1&&x<15&&x>16-hw+1)||(d===2&&x<12)?r[2]:r[1])}
  if(t!=='cap'){ptS(L,12,y0+1,'r');ptS(L,11,y0+2,'r')}
  if(t==='kettle'){ptH(L,16-hw0-3,15+hw0+3,ey-4,r[1]);ptH(L,16-hw0-3,14,ey-4,r[2]);ptH(L,16-hw0-2,15+hw0+2,ey-3,r[0]);ptS(L,15+hw0+3,ey-4,r[0]);for(let x=E.X0(ey-2);x<=E.X1(ey-2);x++)if(ptG(L,x,ey-2)===sk[0])ptS(L,x,ey-2,sk[1])}
  else if(t==='nasal'){ptH(L,16-hw0,15+hw0,ey-4,r[0]);ptH(L,16-hw0,15+hw0,ey-3,r[1]);ptH(L,16-hw0,13,ey-3,r[2]);ptS(L,15+hw0,ey-3,r[0]);ptV(L,15,ey-2,ey+2,r[2]);ptV(L,16,ey-2,ey+2,r[0]);
   for(let y=ey-2;y<=ey+3;y++){ptS(L,16-hw0,y,r[1]);ptS(L,15+hw0,y,r[0]);ptS(L,17-hw0,y,y<ey+2?r[2]:r[1]);ptS(L,14+hw0,y,r[0])}ptS(L,13,y0+3,'c');ptS(L,18,y0+3,'b')}
  else{ptH(L,16-hw0,15+hw0,ey-3,r[0]);for(let y=ey-3;y<=ey+2;y++){ptS(L,16-hw0,y,r[1]);ptS(L,15+hw0,y,r[0]);ptS(L,17-hw0,y,r[2]);ptS(L,14+hw0,y,r[0])}ptV(L,15,y0,ey-4,r[0])}}
 else if(t==='circlet'||t==='band'){const y=ey-4,x0=E.X0(y)-1,x1=E.X1(y)+1,g=P.gemC||['x','X'];
  if(t==='band'){ptH(L,x0,x1,y,c[1]);ptH(L,x0,14,y,c[2]);ptH(L,x1-1,x1,y,c[0]);ptS(L,x1+1,y+1,c[1]);ptS(L,x1+1,y+2,c[0]);ptS(L,x1+2,y+2,c[1]);ptS(L,x1+2,y+3,c[0])}
  else{ptH(L,x0,x1,y,'c');ptH(L,x0,13,y,'d');ptH(L,x1-2,x1,y,'b');ptH(L,15,16,y-1,'c');ptS(L,15,y,g[0]);ptS(L,16,y,g[1]);ptS(L,15,y-1,'r');ptS(L,16,y-1,g[0]);ptH(L,15,16,y+1,sk[1])}}
 else if(t==='feather'){const y=ey-4,x0=E.X0(y)-1,x1=E.X1(y)+1;ptH(L,x0,x1,y,'j');ptH(L,x0,13,y,'k');ptH(L,x1-1,x1,y,'i');
  for(let i=0;i<6;i++){ptS(L,x1-1+(i>3?1:0),y-1-i,i<2?'l':i<4?'g':'f');ptS(L,x1+(i>3?1:0),y-1-i,i<2?'m':i<5?'f':'g')}ptS(L,15,y+1,'l');ptS(L,16,y+1,'m')}
 else if(t==='horns'){const hc=P.hornC||['m','l','r'],y=E.y0+1;for(const s of [0,1]){const X=x=>s?31-x:x,bx=E.X0(y)-1;
   [[0,0],[-1,0],[-1,-1],[-2,-1],[-2,-2],[-3,-2],[-3,-3],[-3,-4],[-2,-5],[-2,-6]].forEach(([dx,dy],i)=>{ptS(L,X(bx+dx),y+dy,hc[s?0:i>6?2:1]);ptS(L,X(bx+dx),y+dy+1,hc[s?0:1])});ptS(L,X(bx-2),y-7,hc[s?1:2])}}
 else if(t==='crown'){const y=E.y0-1,x0=E.X0(E.y0+2)-1,x1=31-x0;ptR(L,x0,y,x1,y+2,'c');ptH(L,x0,x1,y+2,'b');ptH(L,x0,14,y,'d');ptV(L,x1,y,y+2,'b');
  for(let x=x0;x<=x1;x+=3){ptS(L,x,y-1,'c');ptS(L,x,y-2,x<16?'d':'c');ptS(L,x+1,y-1,'b')}ptS(L,15,y+1,'g');ptS(L,16,y+1,'f');ptS(L,x0+2,y+1,'x');ptS(L,x1-2,y+1,'X')}
 else if(t==='skullcap'){const y0=E.y0-3;ptR(L,11,y0,20,y0+4,'l');ptH(L,12,19,y0-1,'l');ptH(L,13,16,y0-1,'r');ptV(L,20,y0,y0+4,'m');ptV(L,19,y0+1,y0+4,'m');ptR(L,12,y0+2,13,y0+3,'0');ptR(L,17,y0+2,18,y0+3,'0');ptS(L,15,y0+4,'0');
  ptH(L,10,21,y0+5,'m');for(let x=11;x<=20;x+=2)ptS(L,x,y0+6,'l');ptS(L,9,y0+3,'g');ptS(L,9,y0+2,'g');ptS(L,8,y0+1,'h');ptS(L,22,y0+3,'f');ptS(L,22,y0+2,'f');ptS(L,23,y0+1,'g')}
 else if(t==='mask'){for(let y=ey+2;y<=E.y1;y++)for(let x=E.X0(y);x<=E.X1(y);x++)ptS(L,x,y,x>=E.X1(y)-1?c[0]:x<=E.X0(y)+2&&y<ey+5?c[2]:c[1]);ptH(L,E.X0(ey+2),E.X1(ey+2),ey+2,c[2]);ptS(L,E.X1(ey+2),ey+2,c[0]);ptS(L,15,ey+4,c[0]);ptS(L,16,ey+5,c[0]);ptS(L,14,ey+6,c[0])}}

/* closed helmets: the barbute leaves a T of face, the great helm only a slit; both carry the light on the left like every bust */
function ptFullHelm(L,P,E,t){const r=PT_CLOTH.steel,ey=P.ey||14,ar=t==='armet'||t==='bascinet',gr=t==='great'||ar,y0=E.y0-(gr?2:3)-(t==='bascinet'?2:0),y1=E.y1+(gr?1:0),hw0=P.head.w[3]+1;
 for(let y=y0;y<=y1;y++){const d=y-y0,hw=t==='bascinet'?(d===0?0:d===1?2:d===2?hw0-3:d===3?hw0-1:hw0):t==='armet'?(d===0?hw0-3:d===1?hw0-1:y>y1-2?hw0-1:hw0):gr?(d===0?hw0-1:hw0):(d===0?hw0-4:d===1?hw0-2:d===2?hw0-1:y>y1-2?hw0-1:hw0);
  for(let x=16-hw;x<=15+hw;x++){const open=!gr&&((y>=ey-1&&y<=ey+1&&x>=16-hw+3&&x<=15+hw-3)||(y>ey+1&&x>=14&&x<=17));if(open)continue;
   ptS(L,x,y,x>=15+hw-1?r[0]:x<=16-hw+1&&y>y0?r[2]:(d===1&&x<15)?r[2]:r[1])}}
 ptS(L,12,y0+1,'r');ptS(L,11,y0+2,'r');
 if(t==='armet'){ptH(L,16-hw0+2,15+hw0-1,ey,'0');ptH(L,16-hw0+2,15+hw0-1,ey+1,'q');ptH(L,16-hw0+1,15+hw0,ey+3,'o');ptV(L,15,y0+1,ey-1,'q');ptV(L,16,y0+1,ey-1,'o');for(let x=18;x<=20;x+=2)ptS(L,x,ey+5,'0');ptR(L,16-hw0-1,ey+2,16-hw0,ey+3,'c');ptS(L,16-hw0-1,ey+2,'d');return}
 if(t==='bascinet'){ptH(L,16-hw0+1,13,ey,'0');ptH(L,18,15+hw0-1,ey,'0');for(let y=ey-2;y<=ey+5;y++){const w=y<ey+1?1+(y-ey+2):Math.max(1,4-(y-ey-1));ptH(L,16-w,15+w,y,y<ey+2?'q':'p');ptS(L,15+w,y,'o');ptS(L,16-w,y,'r')}
  for(const [x,y] of[[14,ey+2],[17,ey+2],[15,ey+3],[16,ey+4]])ptS(L,x,y,'0');ptH(L,16-hw0,15+hw0,y1,'o');for(let x=16-hw0-1;x<=15+hw0+1;x++)ptS(L,x,y1+1,(x&1)?'p':'o');return}
 if(gr){ptH(L,16-hw0,15+hw0,y0,r[2]);ptH(L,16-hw0+1,15+hw0-1,ey,'0');ptH(L,16-hw0+1,15+hw0-1,ey-2,'c');ptH(L,16-hw0+1,13,ey-2,'d');ptV(L,15,ey-2,y1,'c');ptV(L,16,ey-2,y1,'b');ptS(L,15,ey,'0');ptS(L,16,ey,'0');
  for(let y=ey+3;y<=y1-1;y+=2){ptS(L,12,y,'0');ptS(L,19,y,'0');ptS(L,13,y+1,'0');ptS(L,18,y+1,'0')}
  ptSt(L,['.gh.','gghf','.gf.'],18,y0-3)}                                                                  // a red plume
 else{for(let y=ey-1;y<=ey+1;y++){ptS(L,16-hw0+2,y,r[0]);ptS(L,15+hw0-2,y,r[0])}ptV(L,13,ey+2,y1,r[0]);ptV(L,18,ey+2,y1,r[0]);ptH(L,16-hw0+3,15+hw0-3,ey-2,r[0]);ptH(L,13,18,y0,r[2])}}

/* spangenhelm (conical, brass bands, mail aventail), sallet (low dome, slit, swept tail), arming cap (quilted, ear flaps) */
function ptHelm2(L,P,E,t){const ey=P.ey||14,sk=P.skin,hw0=P.head.w[3]+1,st=PT_CLOTH.steel;
 if(t==='spangen'){const y0=E.y0-5;for(let y=E.y0-1;y<=23;y++){if(y<ey-3)continue;const hw=hw0+1;for(let x=16-hw;x<=15+hw;x++){if(E.inF(x,y)&&!(x<16-hw+2||x>15+hw-2)&&y<=E.y1)continue;if(y>E.y1+1&&x>=14&&x<=17)continue;ptS(L,x,y,(x+y)&1?(x>=16?'o':'p'):(x>=16?'G':'o'))}}
  for(let y=y0;y<=ey-4;y++){const d=y-y0,hw=Math.min(hw0+1,1+d*2);for(let x=16-hw;x<=15+hw;x++)ptS(L,x,y,x>=15+hw-1?st[0]:x<=16-hw+1?st[2]:st[1])}
  for(const x of[11,15,20])for(let y=y0+2;y<=ey-4;y++)if(ptG(L,x,y)!=='.')ptS(L,x,y,x<16?'d':'b');ptS(L,15,y0,'d');ptH(L,16-hw0-1,15+hw0+1,ey-4,'c');ptH(L,16-hw0-1,13,ey-4,'d');ptS(L,15+hw0+1,ey-4,'b');return}
 if(t==='sallet'){const y0=E.y0-2;for(let y=y0;y<=ey-1;y++){const d=y-y0,hw=d===0?hw0-3:d===1?hw0-1:hw0+(y>=ey-3?1:0);for(let x=16-hw;x<=15+hw;x++)ptS(L,x,y,x>=15+hw-1?st[0]:(x<=16-hw+1||(d===1&&x<15))?st[2]:st[1])}
  ptH(L,16-hw0+1,15+hw0-1,ey-2,'0');ptS(L,13,ey-2,'o');ptS(L,18,ey-2,'o');ptH(L,16-hw0,15+hw0,ey-3,st[2]);ptS(L,12,y0+1,'r');ptS(L,11,y0+2,'r');
  for(let i=0;i<4;i++){ptS(L,16-hw0-1-i,ey-1+i,st[2]);ptS(L,16-hw0-i,ey-1+i,st[1]);ptS(L,15+hw0+1+i,ey-1+i,st[0]);ptS(L,15+hw0+i,ey-1+i,st[0])}return}
 const r=P.hatC&&ptCl(P.hatC)||PT_CLOTH.white,y0=E.y0-2;for(let y=y0;y<=ey+3;y++){const d=y-y0,hw=d===0?hw0-4:d===1?hw0-2:d===2?hw0-1:hw0;for(let x=16-hw;x<=15+hw;x++){if(y>ey-4&&x>16-hw+1&&x<15+hw-1)continue;ptS(L,x,y,x>=15+hw-1?r[0]:(x<=16-hw+1)?r[2]:(x%3===1?r[0]:r[1]))}}
 ptH(L,16-hw0,15+hw0,ey-4,r[0]);for(let x=16-hw0+2;x<=15+hw0-2;x+=3)ptV(L,x,y0+1,ey-5,r[0]);ptS(L,16-hw0+1,ey+4,'i');ptS(L,15+hw0-1,ey+4,'i');ptH(L,14,17,E.y1+1,'i')}
/* ---- gear behind the shoulders ---- */
const PT_WPN={
 sword:{x:24,y:10,r:['..cb..','..cb..','..ji..','..ji..','..ji..','..ji..','dccccb','.bbbba','..qp..','..qp..','..qp..','..qp..','..qp..','..qp..']},
 dagger:{x:25,y:15,r:['.cb.','.ji.','.ji.','.ji.','dccb','.qp.','.qp.','.qp.','.qp.','.qp.']},
 axe:{x:23,y:2,r:['...ji.qp.','..rji.qqp','.rqjiqqqp','rqqjiqqpo','rqpjiqppo','.qpjippo.','..oji.o..','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....']},
 axe1:{x:25,y:4,r:['.ji.qp.','.ji.qqp','.jiqqqp','.jiqqpo','.jiqppo','.jippo.','.ji.o..','.ji....','.ji....','.ji....','.ji....','.ji....','.ji....','.ji....','.ji....','.ji....','.ji....','.ji....','.ji....','.ji....']},
 mace:{x:24,y:3,r:['..qp..','.rqpo.','rqqppo','qqpppo','.qppo.','..po..','..ji..','..cb..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..']},
 club:{x:24,y:4,r:['.kj..','kkji.','kjjii','kjji.','kjji.','.kji.','.jji.','.ji..','.ji..','.ji..','.ji..','.ji..','.ji..','.ji..','.ji..','.ji..','.ji..','.ji..','.ji..','.ji..']},
 spear:{x:25,y:1,r:['.r..','.qp.','rqp.','rqpo','rqpo','.qp.','.cb.','.ji.','.ji.','.ji.','.ji.','.ji.','.ji.','.ji.','.ji.','.ji.','.ji.','.ji.','.ji.','.ji.','.ji.','.ji.','.ji.']},
 pike:{x:24,y:0,r:['..r...','..qp..','..qp..','.rqp..','.rqpo.','rqqppo','.oqpo.','..cb..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..']},
 bow:{x:24,y:1,r:['lkj....','l.kj...','l..kj..','l...kj.','l...kji','l....kj','l....kj','l....cb','l....cb','l....kj','l....kj','l...kji','l...kj.','l..kj..','l.kj...','lkj....','lj.....','l......','l......','l......','l......','l......','l......']},
 staff:{x:24,y:2,r:['.kkj..','kj.ji.','k...j.','kj.ji.','.kji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..']},
 focus:{x:24,y:1,r:['..r...','.rFx..','.FxxX.','.xxXX.','c.xX.b','dc..cb','.dccb.','..ji..','..ji..','..ji..','..cb..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..','..ji..']},
 rift:{x:24,y:9,r:['..CD..','..CD..','..GG..','..GG..','..GG..','CDDDDG','.DDDDG','..FC..','..FC..','..FC..','..FC..','..FC..','..FC..','..FC..','..FC..']},
 hammer:{x:23,y:4,r:['...rp...','rqqqqpo.','qqqqpppo','pqqpppo.','...cb...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...']},
 pick:{x:23,y:3,r:['...rp...','.rqqqp..','qqqqppo.','pqp.ppo.','....p.o.','...cb..o','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...']},
 maul:{x:23,y:1,r:['.rqqqpo.','rqqqqppo','qqqqpppo','qqqppppo','.pppooo.','...ji...','...cb...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...','...ji...']},
 halberd:{x:22,y:0,r:['...r.....','...qp....','...qp....','.o.qprq..','oo.qpqqq.','.o.qpqqqp','...qpqqpo','...qppo..','...cb....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....']},
 bill:{x:22,y:0,r:['...r.....','...qp....','...qpq...','..rqqpp..','o.qqqpo..','.ooqpo...','...qpo...','...qo....','...cb....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....']},
 glaive:{x:22,y:0,r:['....r....','...rq....','...qqp...','..rqqpo..','..qqqpo..','..qqppo..','..qqpo...','..qpo....','...cb....','...ji....','...cb....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....','...ji....']},
 gsword:{x:23,y:4,r:['...cb...','...ji...','...ji...','...ji...','...ji...','...ji...','dccccccb','.bbbbbba','...qp...','...qp...','...qp...','...qp...','...qp...','...qp...','...qp...','...qp...','...qp...','...qp...','...qp...','...qp...','...qp...','...qp...','...qp...','...qp...']},
 zwei:{x:22,y:3,r:['....op....','....ji....','....ji....','....ji....','....ji....','....ji....','pqqqqqqqqo','.oooooooo.','....qp....','...oqpo...','....qp....','....qp....','....qp....','....qp....','....qp....','....qp....','....qp....','....qp....','....qp....','....qp....','....qp....','....qp....','....qp....','....qp....','....qp....']},
 rgsword:{x:23,y:4,r:['...xX...','...ji...','...ji...','...ji...','...ji...','...ji...','dccxXccb','.bbbbbba','...qp...','...xp...','...qp...','...qp...','...qX...','...qp...','...qp...','...xp...','...qp...','...qp...','...qX...','...qp...','...qp...','...qp...','...qp...','...qp...']},
 xbow:{x:21,y:3,r:['.....o.....','....o.o....','kkj..k..jji','.kkjjkjjji.','..mm.k.mm..','....mkm....','.....kj....','.....kj....','.....kj....','.....kj....','.....qp....','.....kj....','.....kj....','.....kj....','....kkj....','....kkj....','....kkji...','....kkji...','....kjji...']},
 pistol:{x:24,y:9,r:['..cb.','..po.','..po.','..po.','..po.','..po.','.qcb.','.kjpo','.kj..','kji..','kji..','.c...']},
 musket:{x:24,y:0,r:['..cb.','..po.','..po.','..po.','..pok','..pok','..cb.','..pok','..pok','..pok','..pok','..cb.','.qpok','.cpok','..kji','..kji','..kji','..kji','.kkji','.kkji','.kkji','.kkji','.kkji','.kkji']},
 quiver:{x:23,y:6,r:['g.l.g..','gflfg..','.f.f...','.jkji..','.jkji..','.jkjii.','..jkji.','..jkji.','..jkjii','...jkji','...jkji','...jkji','...jkji','...jkji','...jkji','...jkji','...jkji']}};
function ptRowsL(rows,dx,dy){const L=ptL();rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.')ptS(L,x+(dx|0),y+(dy|0),r[x])});return L}
function ptWeapon(P){if(P.wrows)return ptRowsL(P.wrows,P.wx,P.wy);const L=ptL(),id=P.wpn;if(!id||!PT_WPN[id])return null;const w=PT_WPN[id];ptSt(L,w.r,w.x+(P.wx||0),w.y+(P.wy||0));return ptOut(L)}
function ptCl(x){return Array.isArray(x)?x:PT_CLOTH[x]}
function ptShield(P){const s=P.shield;if(!s)return null;if(P.shRows)return ptRowsL(P.shRows);const L=ptL(),c=ptCl(P.shC||'red')||PT_CLOTH.red;
 if(s==='round'||s==='spiked'){const cx=4.5,cy=22.5,R=6.6,rim=s==='spiked'?['o','p','q']:['i','j','k'];for(let y=14;y<32;y++)for(let x=0;x<=11;x++){const dx=x-cx,dy=y-cy,d=Math.sqrt(dx*dx+dy*dy);if(d>R)continue;
   ptS(L,x,y,d>R-1.3?(dx+dy<-2?rim[2]:dx+dy>3?rim[0]:rim[1]):d<1.6?(dx+dy<0?'r':'q'):d<2.5?(dx+dy<0?'q':'o'):(dx+dy<-3?c[2]:dx+dy>4?c[0]:c[1]))}
  if(s==='round'){ptS(L,2,20,'l');ptS(L,7,26,'l')}else{ptS(L,4,15,'q');ptS(L,4,14,'r');ptS(L,10,22,'q');ptS(L,11,22,'p')}}
 else if(s==='tower'){for(let y=11;y<32;y++)for(let x=0;x<=8;x++){const rim=x===8||y===11||x===0&&y>11;ptS(L,x,y,rim?(y===11?'d':x===8?'b':'c'):x>=6?c[0]:x<=2?c[2]:c[1])}ptH(L,1,7,12,'c');ptH(L,1,7,30,'b');ptR(L,3,19,5,21,'c');ptS(L,3,19,'d');ptS(L,5,21,'b')}
 else if(s==='buckler'){for(let y=17;y<32;y++)for(let x=0;x<=8;x++){const dx=x-3.5,dy=y-23.5,d=dx*dx+dy*dy;if(d>27)continue;ptS(L,x,y,d>16?(dx+dy<-1?'q':dx+dy>3?'o':'p'):d<3?(dx+dy<0?'d':'c'):(dx+dy<-2?'k':dx+dy>3?'i':'j'))}}
 else{const top=s==='kite'?14:17;for(let y=top;y<32;y++){const x1=y===top?5:y===top+1?6:7;for(let x=0;x<=x1;x++){const rim=x===x1||y===top||(y===top+1&&x===6);
   ptS(L,x,y,rim?(y===top&&x<4?'q':x===x1&&y>top+3?'o':'p'):s==='kite'?(x===3?'l':x===4?'m':x>=5?c[0]:c[1]):(y>=top+4&&y<=top+5?(x>=5?'m':'l'):x>=5?c[0]:c[1]))}}
  ptS(L,1,top+2,'c');if(s==='kite')ptS(L,1,top+8,'c')}
 return ptOut(L)}
const PT_GEM=['...0...','..0r0..','.0raa0.','0raaab0','.0aab0.','..0b0..','...0...'];
const PT_RESK={mana:['x','X'],aura:['y','Y'],qi:['z','Z'],chi:['A','B']};

/* ---- assemble ---- */
/* ---- livery (tailor): cloth and accent as dye ramps [dark,mid,light], metal finish remaps the steel tones ---- */
const PT_STEEL='opqrG';
function ptLivMap(mt){if(!mt)return null;return{o:mt[0],p:mt[1],q:mt[2],r:mt[3],G:mt[4]||mt[0]}}
function ptLivTorso(T,P){const v=P.liv,a=P.armor,mm=(a==='mail'||a==='scale'||a==='plate'||a==='lamellar'||a==='coat')?ptLivMap(v.mt):null,ac=v.ac;
 const out=T.map(r=>r.slice());
 if(mm)for(let y=0;y<32;y++)for(let x=0;x<32;x++){const k=out[y][x];if(mm[k]&&!(y>=19&&y<=24&&x>=13&&x<=18&&a!=='plate'&&ptG(T,x,y)===P.skin[1]))out[y][x]=mm[k]}
 if(ac){if(a==='robe')for(let y=22;y<32;y++)for(let x=0;x<32;x++){const k=out[y][x];if(k==='c')out[y][x]=ac[1];else if(k==='b')out[y][x]=ac[0];else if(k==='d')out[y][x]=ac[2]}
  if(a==='mail'||a==='scale'||a==='plate'){for(let y=26;y<32;y++){const w=y<27?2:3;for(let x=16-w;x<=15+w;x++)if(out[y][x]!=='.'&&out[y][x]!=='0')out[y][x]=x<=16-w?ac[2]:x>=15+w?ac[0]:ac[1]}
   ptH(out,13,18,26,ac[2]);out[26][12]='0';out[26][19]='0'}
  if(a==='leather')for(let y=22;y<32;y++)for(let x=0;x<32;x++){if(out[y][x]==='a'&&x>6&&x<24)out[y][x]=ac[0];else if(out[y][x]==='i'&&x>6&&x<24&&y>23)out[y][x]=ac[1]}
  if(a==='padded'||a==='rags'||a==='none')for(let x=4;x<28;x++){const y=30;if(out[y][x]!=='.'&&out[y][x]!=='0')out[y][x]=x<16?ac[1]:ac[0]}}
 return out}
function ptBust(P){const R=ptRng(P.seed||1),bg=P.bg||['3','2'],C=ptL(bg[0]);
 for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(x+y>38+((x^y)&1?0:0)||y>=29)C[y][x]=bg[1];
 if(bg[2])for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(x+y<16)C[y][x]=bg[2];
 if(P.under)P.under(C);if(P.prop)ptProp(C,P);
 const sh=ptShield(P),wp=ptWeapon(P);
 ptOver(C,P.liv?ptLivTorso(ptTorso(P),P):ptTorso(P));if(sh)ptOver(C,sh);if(wp)ptOver(C,wp);               // shield and weapon are held in front of the body; the head stays on top
 const hd=ptHead(P,R),L=hd.L,E=hd.E;
 if(P.hairBack)P.hairBack(L,E);
 ptHair(L,P,E,R);if((P.ears==='elf'&&P.hat!=='hood')||P.ears==='gob')ptEars(L,P,E);ptBeard(L,P,E);
 if(P.liv&&(P.liv.mt||P.liv.ac)&&P.hat){const B=L.map(r=>r.slice());ptHat(L,P,E);const mm=/coif|kettle|nasal|great|barbute|spangen|sallet|bascinet|armet/.test(P.hat)?ptLivMap(P.liv.mt):null,ac=P.liv.ac,pm=ac&&P.hat==='great'?{f:ac[0],g:ac[1],h:ac[2]}:null;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const k=L[y][x];if(k===B[y][x])continue;if(mm&&mm[k])L[y][x]=mm[k];else if(pm&&pm[k])L[y][x]=pm[k]}}
 else ptHat(L,P,E);if(P.famH&&P.hat){const ey=P.ey||14;for(let y=ey-3;y>=E.y0-6;y--){let n=0;for(let x=8;x<24;x++){const k=L[y]&&L[y][x];if(k&&k!=='.'&&k!==P.skin[0]&&k!==P.skin[1]&&k!==P.skin[2]&&!(P.hairC&&P.hairC.includes(k))){n++}}if(n>=8){for(let x=8;x<24;x++){const k=L[y][x];if(k!=='.'&&k!==P.skin[0]&&k!==P.skin[1])L[y][x]=x<16?'d':'c'}L[y][11]='e';break}}}ptVeil(L,P,E);if(P.marks&&P.marks.soot)ptSoot(L,P,E);if(P.over)P.over(L,E);
 ptOver(C,ptOut(L));if(P.top)P.top(C,E);
 if(P.gem){const g=PT_RESK[P.gem];if(g)ptSt(C,PT_GEM,0,0,{a:g[0],b:g[1]})}
 return C.map(r=>r.join(''))}

/* ================= BACKGROUND LOOKS =================
   BG[bg].look = {hat, hatC, cloth, accent, trim, garb, prop, hair, beard, hairC, marks}: the rules' hints, merged over PT_BGLOOK
   (our own look per background key, matched by key, then by keywords in the key/name). Any field may be a list: one is
   picked per merc from its hash, so recruits of one background still vary. Vocabulary:
   hat: hood straw band feather circlet skullcap mask coif + wide capotain feathercap cowl wrap bandana furcap miner scholar
   garb (torso overlay): apron butcher smith fine rope welts sash stripes patches fleece pelt bandolier tabard vials eye tatters manica straps braces plaid motley
   prop (portrait, behind the shoulder): shovel lute book scourge pick net crook censer cleaver tongs flask axe chisel lantern stake
   trim: gold white steel (edging) or a garb name. cloth/hatC: PT_CLOTH names. accent: dye names (US_DYE / tailor) or PT_CLOTH names. */
const PT_BGLOOK={
 farmhand:{garb:'braces',cloth:['straw','tan']},militia:{garb:'tabard',accent:'sky'},hunter:{garb:'sash',cloth:'green'},thief:{garb:'sash',accent:'charcoal',cloth:'night'},
 sellsword:{trim:'steel',garb:'straps'},squire:{garb:'tabard',accent:'ochre'},hedge:{prop:'book'},acolyte:{prop:'censer',garb:'rope'},monk:{garb:'rope',prop:'-'},
 spellblade:{garb:'sash',accent:'teal'},wildling:{garb:'pelt'},knight:{garb:'tabard',accent:'crimson',trim:'gold'},
 gravedigger:{hat:'wide',hatC:'black',cloth:['black','night'],prop:'shovel',marks:{bags:1}},
 butcher:{garb:'butcher',cloth:['white','tan'],prop:'cleaver',beard:['short','full','stache','']},
 blacksmith:{garb:'smith',cloth:'brown',prop:'tongs',marks:{soot:1}},
 miner:{hat:'miner',cloth:'brown',prop:'pick',marks:{soot:1}},
 fisherman:{hat:'wide',hatC:'verd',cloth:'verd',prop:'net'},
 shepherd:{hat:'furcap',hatC:'brown',garb:'fleece',prop:'crook',cloth:'tan'},
 woodcutter:{garb:'plaid',cloth:'red',prop:'axe',beard:['full','long','short']},
 poacher:{hat:'wide',hatC:'brown',cloth:'green',garb:'bandolier',prop:'net'},
 bowyer:{hat:'feather',garb:'apron',accent:'tan',cloth:'tan'},
 mason:{hat:'bandana',hatC:'bone',garb:'apron',accent:'bone',cloth:'bone',prop:'chisel'},
 caravan:{hat:'band',hatC:'straw',garb:'bandolier',cloth:'tan',accent:'ochre'},
 deserter:{garb:'tatters',cloth:'red',marks:{stubble:1}},
 bandit:{hat:'bandana',hatC:'red',veil:'night',garb:'sash',accent:'charcoal'},
 pitfighter:{garb:'straps',hair:['mohawk','crop','bald'],marks:{scar:2}},
 gladiator:{garb:'manica',accent:'crimson',hair:['crop','bald','short']},
 retired:{garb:'tabard',accent:'grey',hairC:'W',beard:['full','stache','short'],marks:{bags:1,scar:3}},
 watchman:{garb:'tabard',accent:'royal',prop:'lantern'},
 noble:{hat:'feathercap',hatC:'purple',garb:'fine',cloth:'purple',accent:'ochre'},
 hedgeknight:{garb:'tabard',accent:'forest',trim:'steel',beard:['short','full','']},
 witchhunter:{hat:'capotain',hatC:'black',cloth:'black',garb:'bandolier',prop:'stake'},
 pilgrim:{hat:'wide',hatC:'tan',cloth:'bone',garb:'rope',prop:'shell'},
 scholar:{hat:'scholar',cloth:'night',prop:'book',garb:'fine',accent:'white'},
 apothecary:{garb:'vials',cloth:'verd',prop:'flask'},
 flagellant:{hat:'cowl',hatC:'bone',garb:'welts',cloth:'bone',prop:'scourge'},
 sailor:{hat:'bandana',hatC:'blue',garb:'stripes',accent:'blue',cloth:'white'},
 nomad:{hat:'wrap',hatC:'straw',veil:'straw',garb:'sash',accent:'crimson',cloth:'straw'},
 beggar:{garb:'patches',cloth:'brown',hair:['shaggy','long','wisps'],marks:{stubble:1}},
 minstrel:{hat:'feathercap',hatC:'red',garb:'motley',accent:'ochre',cloth:'red',prop:'lute'},
 cultist:{hat:'hood',hatC:'purple',cloth:'purple',garb:'eye'}};
const PT_BGRX=[[/grave/,'gravedigger'],[/butcher/,'butcher'],[/smith/,'blacksmith'],[/miner|mine/,'miner'],[/fish/,'fisherman'],[/shepherd|herd/,'shepherd'],[/wood|lumber/,'woodcutter'],[/poach/,'poacher'],
 [/bowyer|fletch/,'bowyer'],[/mason|stone/,'mason'],[/caravan|guard/,'caravan'],[/desert/,'deserter'],[/bandit|brigand|outlaw|raider/,'bandit'],[/pit/,'pitfighter'],[/gladia|arena/,'gladiator'],
 [/retire|veteran|old.?soldier/,'retired'],[/watch|guard/,'watchman'],[/noble|scion|lord|heir/,'noble'],[/hedge.?knight|knight.?errant/,'hedgeknight'],[/witch|inquis/,'witchhunter'],[/pilgrim/,'pilgrim'],
 [/scholar|scribe|student/,'scholar'],[/apothec|herbal|physic/,'apothecary'],[/flagell|penit/,'flagellant'],[/sailor|seaman|mariner|sea/,'sailor'],[/nomad|horse|rider/,'nomad'],[/beggar|vagrant/,'beggar'],
 [/minstrel|bard|jongleur/,'minstrel'],[/cult/,'cultist']];
const PT_LKC=new Map();
function ptBgBase(bg){if(PT_BGLOOK[bg])return PT_BGLOOK[bg];const B=typeof BG==='object'&&BG&&BG[bg],s=(String(bg)+' '+(B&&B.n||'')).toLowerCase();if(/hedge/.test(bg)&&/knight/.test(s))return PT_BGLOOK.hedgeknight;
 for(const [re,k] of PT_BGRX)if(re.test(s))return PT_BGLOOK[k];return null}
function ptBgLook(bg){let L=PT_LKC.get(bg);if(L)return L;const B=typeof BG==='object'&&BG&&BG[bg],own=ptBgBase(bg)||{},rl=B&&B.look&&typeof B.look==='object'?B.look:{};
 L=Object.assign({},own);for(const k in rl){const v=rl[k];if(v==null||v==='')continue;
  if(k==='trim'&&typeof v==='string'&&PT_GARB[v]){if(!rl.garb)L.garb=v;continue}
  if(k==='hat'&&typeof v==='string'&&!PT_HATOK.test(v))continue;
  L[k]=v}
 PT_LKC.set(bg,L);return L}
const PT_GARB={apron:1,butcher:1,smith:1,fine:1,rope:1,welts:1,sash:1,stripes:1,patches:1,fleece:1,pelt:1,bandolier:1,tabard:1,vials:1,eye:1,tatters:1,manica:1,straps:1,braces:1,plaid:1,motley:1};
const PT_HATOK=/^(hood|straw|band|feather|circlet|skullcap|mask|coif|wide|capotain|feathercap|cowl|wrap|bandana|furcap|miner|scholar|horns|crown)$/;
const PT_LIGHT={rags:1,padded:1,leather:1,fur:1,none:1,robe:1,bare:1,brig:1};
function ptLv(v,R){return Array.isArray(v)?v[R(v.length)]:v}
function ptAcc(k){if(!k)return null;if(PT_CLOTH[k])return PT_CLOTH[k];const d=typeof ptDye==='function'?ptDye(k):null;return d}
/* hat, hair, beard, marks: before the helmet worn replaces the hat */
function ptLookHead(P,m,R){const L=ptBgLook(m.bg),old=!!PT_BGLOOK[m.bg]&&['farmhand','militia','hunter','thief','sellsword','squire','hedge','acolyte','monk','spellblade','wildling','knight'].includes(m.bg);P.look=L;
 if(!old&&L.hat){const h=ptLv(L.hat,R);if(h&&h!=='-'){P.hat=h;P.hatC=ptLv(L.hatC,R)||ptLv(L.cloth,R)||'brown'}}
 if(L.hair){const h=ptLv(L.hair,R);if(h)P.hair=h}
 if(L.hairC&&PT_HAIRC[L.hairC]){P.hairC=PT_HAIRC[L.hairC];P.face.browC=P.hairC[0]}
 if(L.beard!=null&&!P.fem&&P.race!=='elf'){const b=ptLv(L.beard,R);if(P.race!=='dwarf'||b)P.beard=b||null}
 if(L.marks)for(const k in L.marks)P.marks[k]=L.marks[k];if(L.veil)P.veil=ptLv(L.veil,R);
 if(/^(wide|capotain|feathercap|cowl|wrap|bandana|furcap|miner|scholar)$/.test(P.hat||'')&&/^(mohawk|bun|curly|mane|shaggy|swept)$/.test(P.hair))P.hair=P.fem?'long':'short';
 if(P.hat==='cowl'){P.beard=null;P.hair='crop'}}
/* cloth and garb: before the tailor's livery (which wins) */
function ptLookBody(P,m,R){const L=P.look||ptBgLook(m.bg);const cl=ptLv(L.cloth,R);if(cl&&PT_CLOTH[cl]){P.ragC=cl;P.robeC=cl;if(!P.av||!P.av.body)P.clothC=PT_CLOTH[cl];P.bgCloth=cl}
 const g=ptLv(L.garb,R);if(g&&PT_GARB[g])P.garb=g;const t=ptLv(L.trim,R);if(t&&PT_GARB[t]&&!P.garb)P.garb=t;else if(t==='gold'||t==='white'||t==='steel')P.bgTrim=t;
 P.garbC=ptAcc(ptLv(L.accent,R));const pr=ptLv(L.prop,R);if(pr&&PT_PROP[pr])P.prop=pr}
/* ---- garb over the torso (portrait) ---- */
function ptGarb(L,P,inT,top){const g=P.garb,sk=P.skin,a=P.armor,ac=P.garbC||PT_CLOTH.red;
 const fill=(x0,y0,x1,y1,r,f)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(inT(x,y)){const k=f?f(x,y):(x===x0?r[2]:x===x1?r[0]:r[1]);if(k)ptS(L,x,y,k)}};
 const diag=(xa,ya,xb,yb,w,r)=>{const n=Math.max(Math.abs(xb-xa),Math.abs(yb-ya));for(let i=0;i<=n;i++){const x=Math.round(xa+(xb-xa)*i/n),y=Math.round(ya+(yb-ya)*i/n);for(let j=0;j<w;j++)if(inT(x+j,y))ptS(L,x+j,y,j===0?r[2]:j===w-1?r[0]:r[1])}};
 if(PT_LIGHT[a]===undefined&&/stripes|plaid|motley|patches/.test(g||''))return;
 if(P.bgTrim){const k=P.bgTrim==='gold'?['d','b']:P.bgTrim==='white'?['l','m']:['q','o'];for(let y=24;y<32;y++){ptS(L,11,y,k[0]);ptS(L,20,y,k[1])}}
 switch(g){
  case'apron':case'butcher':case'smith':{const r=g==='butcher'?['m','l','r']:g==='smith'?['a','i','j']:(P.garbC||['m','l','r']);
   fill(11,25,20,31,r);ptV(L,12,21,24,r[1]);ptV(L,19,21,24,r[0]);ptH(L,11,20,25,r[2]);
   if(g==='butcher'){for(const [x,y,k] of [[13,27,'g'],[14,28,'f'],[17,26,'g'],[18,29,'g'],[15,30,'f'],[12,30,'g'],[19,27,'f']])ptS(L,x,y,k)}
   else if(g==='smith'){for(const [x,y] of [[12,26],[19,26],[12,30],[19,30]])ptS(L,x,y,'c');ptH(L,13,18,28,'a');ptS(L,15,29,'k')}
   else{ptH(L,13,18,28,r[0]);ptS(L,14,29,r[0])}break}
  case'fine':{ptH(L,11,20,22,'d');ptH(L,11,20,23,'c');ptS(L,20,23,'b');ptS(L,20,22,'c');for(const y of[25,27,29,31]){ptS(L,15,y,'d');ptS(L,16,y,'b')}for(let y=24;y<32;y++){ptS(L,12,y,'c');ptS(L,19,y,'b')}
   for(let x=2;x<30;x++){const y=top(x);if(y<32&&(x<10||x>21)){ptS(L,x,y+2,x<16?'d':'b')}}break}
  case'rope':{for(let x=0;x<32;x++)if(inT(x,29))ptS(L,x,29,(x&1)?'k':'j');ptS(L,17,30,'k');ptS(L,17,31,'j');ptS(L,18,30,'j');ptS(L,18,31,'k');break}
  case'welts':{for(const [xa,ya,xb,yb] of [[6,24,12,30],[18,23,25,29],[10,26,15,31],[21,27,26,31]])for(let i=0;i<=6;i++){const x=Math.round(xa+(xb-xa)*i/6),y=Math.round(ya+(yb-ya)*i/6);if(inT(x,y))ptS(L,x,y,i&1?'f':'g')}
   for(let x=0;x<32;x++)if(inT(x,29))ptS(L,x,29,(x&1)?'k':'j');break}
  case'sash':diag(5,23,22,31,3,ac);break;
  case'bandolier':{diag(22,22,8,31,2,['a','i','j']);ptR(L,14,26,15,27,'c');ptS(L,14,26,'d');ptS(L,15,27,'b');ptR(L,18,24,19,25,'j');ptR(L,10,29,11,30,'j');break}
  case'stripes':{const s=P.garbC||['G','X','x'];for(let y=24;y<32;y+=2)for(let x=0;x<32;x++)if(inT(x,y)&&ptG(L,x,y)!==sk[0]&&ptG(L,x,y)!==sk[1]&&ptG(L,x,y)!==sk[2])ptS(L,x,y,x<9?s[2]:x>22?s[0]:s[1]);break}
  case'patches':{ptR(L,5,25,8,28,'j');ptH(L,5,8,25,'k');ptS(L,8,28,'i');ptR(L,21,27,24,30,'w');ptS(L,21,27,'v');ptR(L,13,29,15,31,'n');for(const [x,y] of[[5,27],[7,25],[22,30],[24,28],[14,29]])ptS(L,x,y,'0');break}
  case'fleece':case'pelt':{const r=g==='fleece'?['m','l','r']:['a','i','j'];for(let x=0;x<32;x++){const y=top(x);if(y>=32)continue;for(let j=-1;j<3;j++)if(inT(x,y+j)||j<0&&x>=8&&x<=23&&y+j>=21)ptS(L,x,y+j,(x*5+j*3)%4===0?r[0]:j<1?r[2]:r[1])}
   for(let x=11;x<=20;x++){ptS(L,x,21,(x&1)?r[2]:r[1]);ptS(L,x,22,(x&1)?r[1]:r[0])}break}
  case'tabard':{fill(12,23,19,31,ac);ptR(L,15,26,16,28,'l');ptS(L,14,27,'l');ptS(L,17,27,'m');ptH(L,12,19,23,ac[2]);break}
  case'vials':{for(let x=0;x<32;x++)if(inT(x,28))ptS(L,x,28,(x&1)?'a':'i');for(const [x,c] of [[8,'A'],[11,'x'],[20,'g'],[23,'C']]){ptS(L,x,29,c);ptS(L,x,30,c);ptS(L,x,29-1,'l')}break}
  case'eye':{for(const [x,y,k] of[[13,27,'C'],[14,26,'C'],[15,26,'C'],[16,26,'D'],[17,26,'D'],[18,27,'D'],[14,28,'D'],[15,28,'D'],[16,28,'D'],[17,28,'D'],[14,27,'r'],[15,27,'0'],[16,27,'0'],[17,27,'C']])ptS(L,x,y,k);ptV(L,15,29,31,'D');break}
  case'tatters':{for(const [x,y] of[[7,26],[8,27],[22,25],[23,26],[13,30],[14,31],[25,29],[5,30]]){ptS(L,x,y,sk[1]);ptS(L,x+1,y,'0')}for(let x=2;x<30;x+=3)if(inT(x,31))ptS(L,x,31,'0');break}
  case'manica':{for(let y=22;y<=28;y++)for(let x=1;x<=9;x++)if(inT(x,y)&&x+y>=25)ptS(L,x,y,y%2?(x<5?'q':'p'):'o');diag(9,23,21,31,2,['a','i','j']);break}
  case'straps':{diag(7,23,22,31,2,['a','i','j']);diag(23,23,8,31,2,['a','i','j']);ptR(L,15,27,16,28,'q');ptS(L,16,28,'o');break}
  case'braces':{for(const x of[12,19]){ptV(L,x,22,31,'i');ptV(L,x+1,22,31,'a');ptS(L,x,29,'c')}break}
  case'plaid':{for(let y=22;y<32;y++)for(let x=0;x<32;x++)if(inT(x,y)){const k=ptG(L,x,y);if(k===sk[0]||k===sk[1]||k===sk[2]||k==='0')continue;if(x%4===1||y%4===1)ptS(L,x,y,(x%4===1&&y%4===1)?'0':'f')}break}
  case'motley':{for(let y=22;y<32;y++)for(let x=0;x<16;x++)if(inT(x,y)){const k=ptG(L,x,y);if(k===sk[0]||k===sk[1]||k===sk[2]||k==='0')continue;ptS(L,x,y,x<=top(x)?ac[2]:((x+y)%4===0?ac[0]:ac[1]))}ptV(L,15,24,31,ac[0]);break}
 }}
/* ---- props behind the left shoulder (portrait backdrop) ---- */
const PT_PROP={
 shovel:{x:2,y:2,r:['.qqp.','qqqpo','qqppo','qpppo','.ppo.','..k..','..j..','..k..','..j..','..k..','..j..','..k..','..j..','..k..','..j..','..k..','..j..']},
 lute:{x:3,y:3,r:['.ii.','.kj.','.ij.','..j.','..k.','..j.','..k.','..j.','.kkj.','kkjji','kj0ji','kjjji','kjjji','.jji.']},
 book:{x:2,y:9,r:['kjjjjji','klllllm','klmmmlm','klllllm','klmmmlm','klllllm','kiiigii','....g..']},
 scourge:{x:3,y:3,r:['.kj..','.kj..','.kj..','.cb..','.jj..','j.j.j','j.j.j','g.j.g','j.g.j','g...g','....g']},
 pick:{x:1,y:3,r:['.oppqq.','opq..qr','p..k..q','...j...','...k...','...j...','...k...','...j...','...k...','...j...','...k...','...j...']},
 net:{x:1,y:6,r:['m.m.m.m','.m.m.m.','m.m.m.m','.m.m.m.','m.m.m.m','.m.m.m.','m.m.m.m','.c...c.']},
 crook:{x:2,y:2,r:['.kkk.','k...j','....j','....k','....j','....k','....j','....k','....j','....k','....j','....k','....j','....k','....j','....k']},
 censer:{x:3,y:2,r:['..c..','..b..','..c..','..b..','.dcb.','dccbb','cbbba','.bba.','..m..','.m.n.','m...n']},
 cleaver:{x:2,y:5,r:['rqqqqp','qqqqqp','qqpppo','qppppo','oooo.a','....ji','....ji','....ji']},
 tongs:{x:3,y:3,r:['p...o','po.oo','.pop.','..o..','.p.o.','.p.o.','.p.o.','.p.o.','.p.o.','.p.o.']},
 flask:{x:3,y:6,r:['.kj.','.mm.','.lm.','lAAB','AAAB','AABB','.BB.']},
 axe:{x:1,y:3,r:['qqp.....','qqpk....','qpoj....','qpo.k...','.o...j..','.....k..','......j.','......k.']},
 chisel:{x:3,y:5,r:['.q.','.q.','.p.','.p.','kjj','kji','kji','.i.']},
 lantern:{x:2,y:4,r:['..q..','.ooo.','oEyEo','oyeyo','oEyEo','.ooo.']},
 stake:{x:3,y:3,r:['.k.','.k.','kji','kji','kji','kji','kji','.j.','.j.']},
 shell:{x:2,y:5,r:['..l..','.lml.','lmlml','lmlml','.mlm.','..c..']}};
function ptProp(C,P){const p=PT_PROP[P.prop];if(!p)return;const L=ptL();ptSt(L,p.r,p.x,p.y);ptOver(C,ptOut(L))}
/* ---- background hats (portrait) ---- */
function ptHatBg(L,P,E){if(ptHatCraft(L,P,E))return true;const t=P.hat,sk=P.skin,ey=P.ey||14,c=ptCl(P.hatC)||PT_CLOTH.brown,hw=y=>y<E.y0?Math.max(2,P.head.w[0]+1-(E.y0-y)*2):P.head.w[clamp(y-E.y0,0,P.head.w.length-1)]+1,
  row=(y,w,f)=>{for(let x=16-w;x<=15+w;x++)ptS(L,x,y,f?f(x,y,w):(x<=17-w?c[2]:x>=14+w?c[0]:c[1]))},dark=y=>{for(let x=E.X0(y);x<=E.X1(y);x++){const k=ptG(L,x,y);if(k===sk[0])ptS(L,x,y,sk[1]);else if(k===sk[1])ptS(L,x,y,sk[2])}};
 if(t==='wide'||t==='capotain'){const tall=t==='capotain',yb=E.y0+1,y0=E.y0-(tall?6:3);for(let y=y0;y<yb;y++)row(y,y===y0&&!tall?4:tall?5:6);
  row(yb-1,tall?5:6,x=>P.garbC?P.garbC[1]:'0');if(tall){ptR(L,15,yb-2,17,yb-1,'c');ptS(L,16,yb-1,'0');ptS(L,15,yb-2,'d')}
  ptH(L,4,27,yb,c[1]);ptH(L,4,13,yb,c[2]);ptH(L,22,27,yb,c[0]);ptH(L,6,25,yb+1,c[0]);ptS(L,4,yb-1,c[2]);ptS(L,27,yb-1,c[0]);dark(yb+2);dark(yb+3);
  if(P.prop==='shell'){ptSt(L,['.l.','lml','.m.'],19,yb-3)}return true}
 if(t==='feathercap'){const y0=E.y0-2;ptH(L,11,21,y0,c[1]);ptH(L,9,24,y0+1,c[1]);ptH(L,9,13,y0+1,c[2]);ptH(L,9,24,y0+2,c[1]);ptH(L,20,24,y0+2,c[0]);ptH(L,10,22,y0+3,c[0]);ptH(L,12,15,y0,c[2]);
  const f=P.garbC||['m','l','r'];for(let i=0;i<7;i++){ptS(L,9-i,y0+1-i,i<2?f[1]:'l');ptS(L,10-i,y0+1-i,i<5?f[2]:'m');if(i>2)ptS(L,8-i,y0+2-i,f[0])}dark(y0+4);return true}
 if(t==='cowl'){const peak=E.y0-7;for(let y=peak;y<=23;y++){const w=y<E.y0?Math.max(1,Math.round((y-peak)*.9)):y<=E.y1?hw(y)+1:Math.min(10,hw(E.y1)+1+(y-E.y1));for(let x=16-w;x<=15+w;x++)ptS(L,x,y,x<=17-w?c[2]:x>=14+w?c[0]:(y%3===0&&x===15)?c[0]:c[1])}
  ptH(L,12,13,ey,'0');ptH(L,18,19,ey,'0');ptS(L,12,ey-1,c[0]);ptS(L,19,ey-1,c[0]);ptS(L,13,ey,P.face&&P.face.iris==='0'?'0':(P.face&&P.face.iris)||'0');ptS(L,18,ey,'0');return true}
 if(t==='wrap'||t==='bandana'||t==='furcap'||t==='scholar'||t==='miner'){const W=t==='wrap',y0=E.y0-(W?3:t==='furcap'?3:2),y1=W?E.y0+3:t==='bandana'?E.y0+2:t==='scholar'?E.y0+2:E.y0+1;
  const r=t==='scholar'?['0','1','G']:t==='miner'?PT_CLOTH.tan:t==='furcap'?c:c;
  for(let y=y0;y<=y1;y++){const w=hw(y)+(t==='furcap'?1:0);for(let x=16-w;x<=15+w;x++){let k=x<=17-w?r[2]:x>=14+w?r[0]:r[1];if(W&&((x+y*2)%5===0))k=r[0];if(t==='furcap'&&(x*7+y*5)%5===0)k=r[0];if(t==='bandana'&&(x+y)%4===0)k=r[2];ptS(L,x,y,k)}}
  if(W){for(let i=0;i<6;i++){ptS(L,E.X1(ey)+2,E.y0+3+i,c[i&1?0:1]);ptS(L,E.X1(ey)+3,E.y0+4+i,c[0])}}
  if(t==='bandana'){const x1=E.X1(E.y0+2)+1;ptS(L,x1,y1,c[1]);ptS(L,x1+1,y1+1,c[1]);ptS(L,x1+2,y1+2,c[0]);ptS(L,x1+1,y1+2,c[1]);ptS(L,x1+1,y1+3,c[0])}
  if(t==='furcap'||t==='scholar')for(let y=ey-1;y<=ey+3;y++){ptS(L,E.X0(y)-1,y,r[2]);ptS(L,E.X0(y),y,r[1]);ptS(L,E.X1(y)+1,y,r[0]);ptS(L,E.X1(y),y,r[0])}
  if(t==='miner'){ptH(L,E.X0(y1)-1,E.X1(y1)+1,y1,'a');ptR(L,15,y0-3,16,y0-1,'l');ptS(L,16,y0-1,'m');ptS(L,15,y0-4,'E');ptS(L,16,y0-4,'y');ptS(L,15,y0-5,'y');ptR(L,14,y0,17,y0,'b')}
  dark(y1+1);return true}
 return false}
function ptVeil(L,P,E){if(!P.veil)return;const c=ptCl(P.veil)||PT_CLOTH.night,ey=P.ey||14;for(let y=ey+2;y<=E.y1+1;y++){const y2=Math.min(y,E.y1);for(let x=E.X0(y2)-(y>E.y1?0:1);x<=E.X1(y2)+(y>E.y1?0:1);x++)ptS(L,x,y,x>=E.X1(y2)-1?c[0]:x<=E.X0(y2)+1?c[2]:((x+y)%5===0?c[0]:c[1]))}}
function ptSoot(L,P,E){const ey=P.ey||14;for(const [x,y] of [[11,ey+3],[12,ey+4],[20,ey+2],[19,ey+3],[14,E.y1-1]])if(E.inF(x,y))ptS(L,x,y,P.skin[2])}

/* ---- crafted armor on the bust: colour remap (V.pm), scale texture, extra painters (V.cr) ---- */
function ptTorsoCraft(L,P,inT,top){const V=P.av,sk=P.skin;
 if(V.pm)for(let y=22;y<32;y++)for(let x=0;x<32;x++){if(!inT(x,y)||(y<=24&&x>=13&&x<=18))continue;const k=L[y][x];if(V.pm[k]&&k!==sk[0]&&k!==sk[1]&&k!==sk[2])L[y][x]=V.pm[k]}
 if(V.tex==='scales')for(let y=24;y<32;y++)for(let x=0;x<32;x++)if(inT(x,y)&&(x<13||x>18)&&(((x+((y>>1)&1)*2)&3)===0)&&(y&1))ptS(L,x,y,V.pm&&V.pm.i||'4');
 const c=V.cr;
 if(c==='feathers')for(let x=0;x<32;x++){const y=top(x);if(y>=32||(x>=11&&x<=20))continue;ptS(L,x,y+3,(x&1)?'l':'m');if(x&1)ptS(L,x,y+4,'m')}
 else if(c==='leaves'){for(const [x,y,k] of[[6,25,'A'],[7,26,'B'],[5,27,'B'],[24,25,'A'],[25,26,'B'],[11,28,'A'],[20,29,'B'],[12,30,'B'],[19,27,'A']])if(inT(x,y))ptS(L,x,y,k)}
 else if(c==='bones'){for(const s of[0,1]){const X=x=>s?31-x:x;for(let i=0;i<5;i++){const x=X(4+i),y=top(4+i)+1;ptS(L,x,y,s?'m':'l');ptS(L,x,y+1,s?'n':'m')}}ptSt(L,['.l.','lrm','.m.'],14,25)}
 else if(c==='spines')for(const x of[3,6,9,22,25,28]){const y=top(x);if(y<32){ptS(L,x,y-1,'l');ptS(L,x,y-2,x<16?'r':'m')}}}
/* crafted helmets on the bust */
function ptHatCraft(L,P,E){const t=P.hat,ey=P.ey||14;
 if(t==='tuskbarbute'){ptFullHelm(L,P,E,'barbute');const hw0=P.head.w[3]+1;for(const s of[0,1]){const X=x=>s?31-x:x;ptS(L,X(16-hw0-1),ey+3,s?'m':'l');ptS(L,X(16-hw0-2),ey+2,s?'m':'l');ptS(L,X(16-hw0-2),ey+1,'r');ptS(L,X(16-hw0-3),ey,s?'l':'r')}return true}
 if(t==='wyvcrest'){ptFullHelm(L,P,E,'great');const y0=E.y0-2;for(let x=15;x<=22;x++)for(let y=y0-4;y<y0;y++)if(ptG(L,x,y)!=='.'&&ptG(L,x,y)!=='0')L[y][x]='.';
  for(let i=0;i<9;i++){const x=12+i,h=i<5?1+(i>>1):3-((i-5)>>1);for(let j=1;j<=h;j++)ptS(L,x,y0-j,j===h?'h':i<4?'g':'f')}for(let x=11;x<=21;x++)ptS(L,x,y0,'K');return true}
 if(t==='ogreskull'){const y0=E.y0-4,hw0=P.head.w[3]+2;for(let y=y0;y<=ey-2;y++){const d=y-y0,w=d===0?hw0-4:d===1?hw0-2:d===2?hw0-1:hw0;for(let x=16-w;x<=15+w;x++)ptS(L,x,y,x>=14+w?'n':x<=17-w?'r':(y===y0+1&&x<14)?'r':'l')}
  ptR(L,11,ey-5,13,ey-4,'0');ptR(L,18,ey-5,20,ey-4,'0');ptS(L,12,ey-5,'g');ptS(L,19,ey-5,'f');ptH(L,14,17,ey-4,'m');ptS(L,15,ey-5,'0');ptS(L,16,ey-5,'0');
  for(let x=16-hw0;x<=15+hw0;x++)ptS(L,x,ey-2,(x&1)?'r':'0');for(const s of[0,1]){const X=x=>s?31-x:x;ptS(L,X(16-hw0-1),ey-2,'l');ptS(L,X(16-hw0-2),ey-3,'l');ptS(L,X(16-hw0-2),ey-4,'r');ptS(L,X(16-hw0-1),ey-1,s?'n':'m')}return true}
 return false}

/* ---- mercenaries ---- */
const PT_NEWW={hammer:1,polearm:1,greatsword:1,crossbow:1,flintlock:1};
const PT_WPNOF={warhammer:'hammer',pickhammer:'pick',maul:'maul',warmaul:'maul',bill:'bill',halberd:'halberd',glaive:'glaive',greatsword:'gsword',zweihander:'zwei',runegreat:'rgsword',xbow:'xbow',arbalest:'xbow',pistol:'pistol',musket:'musket'};
function ptDye(k){if(!k)return null;let a=null;try{if(typeof dyeRamp==='function')a=dyeRamp(k)}catch(e){}if(!Array.isArray(a)&&typeof US_DYE==='object')a=US_DYE[k]||null;return Array.isArray(a)&&a.length>=3&&a.every(x=>PAL[x])?a.slice(0,3):null}
function ptFin(k){if(!k||k==='steel'||typeof usFinOf!=='function')return null;const f=usFinOf(k);if(!f)return null;const t=f[0].split('');t.push(f[1][0]);return t}
function ptColSig(m){const c=m&&m.colors;return c&&typeof c==='object'?(c.cloth||'')+'/'+(c.accent||'')+'/'+(c.metal||''):''}
function ptLivery(P,m){const c=m&&m.colors;if(!c||typeof c!=='object')return;const cl=ptDye(c.cloth),ac=ptDye(c.accent),mt=ptFin(c.metal);if(!cl&&!ac&&!mt)return;
 P.liv={cl,ac,mt};if(cl){P.ragC=cl;P.robeC=cl;P.clothC=cl;if(P.hat==='hood')P.hatC=cl}if(ac){P.shC=ac;if(P.hat==='band'||P.hat==='feather')P.hatC=ac}}
function ptPick(R,a){return a[R(a.length)]}
function ptMercSpec(m){const seed=ptHash((m.id|0)+':'+(m.name||'')),R=ptRng(seed),race=RACE[m.race]?m.race:'human',bg=m.bg,eq=m.eq||{},fem=R(100)<42;
 const P={seed,race,fem,face:{},marks:{}};
 // race
 if(race==='elf'){P.head=PT_HEAD.elf;P.ears='elf';P.skin=PT_SKIN[ptPick(R,['pale','pale','fair','tan'])];P.build='slim'}
 else if(race==='dwarf'){P.head=PT_HEAD.dwarf;P.ears='dwarf';P.skin=PT_SKIN[ptPick(R,['fair','fair','tan','pale'])];P.build='broad'}
 else if(race==='halforc'){P.head=PT_HEAD.halforc;P.ears='orc';P.skin=R(4)?PT_SKIN.orc:PT_SKIN.ashorc;P.build='broad'}
 else{P.head=fem?PT_HEAD.humanf:PT_HEAD.human;P.ears='human';P.skin=PT_SKIN[ptPick(R,['fair','fair','pale','tan','tan'])];P.build='normal'}
 // hair
 const hc=ptPick(R,race==='elf'?['I','I','J','W','H','K','G']:race==='dwarf'?['K','K','H','H','I','J','G']:race==='halforc'?['G','G','G','H','J']:['H','H','G','G','I','K','J']);
 P.hairC=PT_HAIRC[hc];
 let styles=fem?['long','long','braids','bun','tail','short','bowl','swept','curly','mane']:['crop','short','shaggy','swept','bald','tail','long','bowl','curly','mohawk','bun'];
 if(race==='elf')styles=fem?['long','long','mane','braids','tail','bun']:['long','long','swept','tail','short','mane'];
 if(race==='dwarf')styles=fem?['braids','braids','bun','long','curly']:['bald','crop','shaggy','braids','mohawk','short','curly'];
 if(race==='halforc')styles=fem?['tail','braids','mohawk','long','bun']:['bald','mohawk','crop','tail','shaggy','bun'];
 P.hair=ptPick(R,styles);
 // face
 const f=P.face;f.iris=ptPick(R,race==='elf'?['7','X','B','D','7']:race==='halforc'?['0','a','f','0']:['0','0','i','X','7','i']);
 f.browC=P.hair==='bald'&&R(2)?P.skin[2]:(hc==='I'||hc==='J'||hc==='W')?P.hairC[0]:P.hairC[race==='halforc'?0:1];if(hc==='G')f.browC='0';
 f.brow=race==='halforc'?ptPick(R,[5,5,3,2,0]):fem?ptPick(R,[0,1,4,4,1]):ptPick(R,[0,0,1,2,2,3]);
 f.eye=0;f.lash=fem;f.lid=!fem&&R(3)===0;f.bags=!fem&&R(6)===0;
 f.nose=race==='dwarf'?(fem?2:3):race==='halforc'?ptPick(R,[2,2,0]):race==='elf'?ptPick(R,[0,1,1]):ptPick(R,[0,0,1,2]);
 f.mouth=race==='halforc'?ptPick(R,[6,6,8]):ptPick(R,[0,0,0,1,3,4,2]);if(fem&&race!=='halforc'){f.lip=ptPick(R,['g','f','f',P.skin[3]]);if(f.mouth===2)f.mouth=0}
 if(race==='dwarf'&&!fem){P.beard=ptPick(R,['dwarf','dwarf','fork','long']);P.ring=R(2);P.noseC=R(3)?null:'h'}
 else if(!fem&&race!=='elf'){const b=ptPick(R,['','','','stubble','stubble','stache','goatee','short','full','chops',race==='halforc'?'':'long']);if(b==='stubble')P.marks.stubble=1;else if(b)P.beard=b}
 if(P.beard&&hc!=='J'&&R(5)===0)P.beardC=PT_HAIRC.J;
 if(R(100)<(bg==='sellsword'||bg==='knight'||bg==='wildling'||bg==='militia'?45:14))P.marks.scar=1+R(3);
 if(R(100)<(bg==='farmhand'||bg==='hunter'?35:8)&&race!=='halforc')P.marks.freckles=1;
 if(fem&&R(3)===0&&race!=='halforc'&&P.skin!==PT_SKIN.tan)P.marks.blush=1;
 // background hints
 const v=R(100);
 if(bg==='thief'){P.hat='hood';P.hatC='night'}
 else if(bg==='hunter'){P.hat='hood';P.hatC=v<60?'green':'brown'}
 else if(bg==='monk'){if(!fem||v<40){P.hair='tonsure';if(P.beard==='long'||P.beard==='full')P.beard='short'}P.beads=['l','n','k','l']}
 else if(bg==='acolyte'){P.beads=['c','b','d','e'];if(v<45&&!fem)P.hair='tonsure';else if(v<70){P.hat='band';P.hatC='white'}}
 else if(bg==='hedge'){P.hat='circlet'}
 else if(bg==='spellblade'){if(v<55){P.hat='circlet';P.gemC=['z','Z']}else{P.hat='band';P.hatC='blue'}}
 else if(bg==='farmhand'){if(v<55){P.hat='straw';P.hatC='straw'}}
 else if(bg==='militia'){if(v<50)P.hat='kettle';else if(v<75)P.hat='cap'}
 else if(bg==='wildling'){P.marks.paint=1+R(2);P.marks.paintC=ptPick(R,['g','X','l']);if(v<40)P.hat='feather';if(P.hair==='crop'||P.hair==='bowl')P.hair='shaggy'}
 else if(bg==='sellsword'){if(v<16)P.marks.patch=1;else if(v<40){P.hat='band';P.hatC='red'}}
 else if(bg==='squire'){if(!fem&&v<50)P.hair='bowl';P.beard=P.beard==='dwarf'||P.beard==='fork'?P.beard:'';P.marks.stubble=0;P.marks.scar=0}
 else if(bg==='knight'){if(!P.marks.scar)P.marks.scar=1+R(3);if(!fem&&!P.beard)P.marks.stubble=1;f.bags=!fem}
 ptLookHead(P,m,R);
 if(P.hat==='circlet'){const r=mercRes(m);if(r&&!P.gemC)P.gemC=PT_RESK[r]}
 if((P.hat==='hood'||P.hat==='kettle'||P.hat==='cap'||P.hat==='straw')&&(P.hair==='mohawk'||P.hair==='bun'||P.hair==='curly'||P.hair==='mane'||P.hair==='shaggy'||P.hair==='swept'))P.hair=fem?'long':'short';
 if(P.hat==='hood'&&P.hair==='tail')P.hair='short';
 // the helmet actually worn (eq.h) replaces whatever the background put on the head; no helmet means no steel on it
 const hid=ITEMS[eq.h]&&ITEMS[eq.h].k==='h'?eq.h:null;
 if(hid){P.hat=typeof usHelmHat==='function'?usHelmHat(hid):'cap';P.hatC=null;P.famH=!!ITEMS[hid].famed;
  if(P.hat==='hood'&&!P.hatC)P.hatC='brown';if(P.hair==='mohawk'||P.hair==='bun'||P.hair==='curly'||P.hair==='mane'||P.hair==='shaggy'||P.hair==='swept')P.hair=fem?'long':'short';if(P.hat!=='cap'&&P.hat!=='kettle'&&P.hat!=='armcap'&&P.hair==='tail')P.hair='short'}
 else if(ptHelmsExist()&&(P.hat==='kettle'||P.hat==='cap'||P.hat==='nasal'))P.hat=null;
 // gear
 const a=ITEMS[eq.a]&&ITEMS[eq.a].k==='a'?eq.a:null,av=a&&typeof usArmorV==='function'?usArmorV(a):null;P.armor=av?av.k:a||'none';P.av=av;if(av&&av.body&&PT_CLOTH[av.body])P.clothC=PT_CLOTH[av.body];if(P.armor==='plate'||P.armor==='scale'||P.armor==='lamellar')P.build=race==='elf'?'normal':'broad';
 P.ragC=ptPick(R,['tan','brown','tan','green']);P.robeC=bg==='monk'||bg==='acolyte'?'red':ptPick(R,['blue','blue','purple']);
 const w=ITEMS[eq.w];if(w&&typeof usWeaponPtRows==='function'){try{P.wrows=usWeaponPtRows(usWpnOf(eq.w))}catch(e){P.wrows=null}}
 if(w&&!P.wrows){const nw=typeof usWpnOf==='function'&&PT_NEWW[w.wt]?PT_WPNOF[usWpnOf(eq.w)]:null;P.wpn=nw||(eq.w==='riftedge'?'rift':eq.w==='focus'?'focus':eq.w==='pike'?'pike':eq.w==='greataxe'?'axe':eq.w==='club'?'club':w.wt==='axe'?'axe1':w.wt)}
 if(ITEMS[eq.s]){P.shield=typeof usShLook==='function'?usShLook(eq.s):eq.s;P.shC=ptPick(R,['red','blue','green','purple','white'])}
 ptLookBody(P,m,R);if(hid)P.veil=null;ptLivery(P,m);if(P.av&&P.av.ptC){P.clothC=P.av.ptC;P.robeC=P.av.ptC}if(P.shield&&typeof usShieldPtRows==='function'){const c=ptCl(P.shC)||PT_CLOTH.red;try{P.shRows=usShieldPtRows(P.shield,usRamp(c.join(''),1))}catch(e){P.shRows=null}}
 if(race==='dwarf'){P.wy=3}
 P.gem=typeof mercRes==='function'?mercRes(m):null;
 return P}

/* ---- enemies ---- */
const PT_BEAST={
 wolf:[
 '................................',
 '................................',
 '.....00..................00.....',
 '....0pp0................0oo0....',
 '....0pqp0..............0opo0....',
 '....0phqp0............0ophp0....',
 '....0phhqp00000000000opfhp0.....',
 '....0pphqqqqqqqpppppppfhpo0.....',
 '.....0pqqqqqqqqpppppppppo0......',
 '.....0qqqqqqqqpppppppppoo0......',
 '....0qqqqqqqqqpppppppppooo0.....',
 '....0qq00qqqqqppppp00ppooo0.....',
 '...0qqqy00qqqqpppp00yppoooo0....',
 '...0qqqyy0qqqqpppp0yyppoooo0....',
 '...0rqqqqqqqqqpppppppppoooG0....',
 '...0rrqqqqqqlllmmmpppppooGG0....',
 '....0rrqqqqllllmmmmpppooGG0.....',
 '....0rrrqqlllllmmmmmpooGGG0.....',
 '.....0rrqllll00000mmmoGGG0......',
 '.....0rrrlll0000000mmmGGG0......',
 '......0rrlllll000mmmmmGG0.......',
 '......0rrllllll0mmmmmmGG0.......',
 '.......0rll0llllmmm0mmG0........',
 '.......0rlr0g0000g0m0mG0........',
 '........0l0ggghhggg0m00.........',
 '........0lr0gghhgg0mm0..........',
 '.........0lr000000mm0...........',
 '.........0llllmmmmmm0...........',
 '..........00llmmmm00............',
 '............000000..............',
 '................................',
 '................................'],
 spider:[
 '................................',
 '................................',
 '......00..............00........',
 '.....0GG0............0GG0.......',
 '....0GoG0............0GoG0......',
 '...0Go00..............00oG0.....',
 '..0Go0......000000......0oG0....',
 '..0G0.00..00oooooG00..00.0G0....',
 '..0G00GG00ooppoooGGG00GG00G0....',
 '..0G0GoG0oppppooooGGG0GoG0G0....',
 '...00Go0oopppoooooGGGG0oG00.....',
 '....0G00opg0oog0oGg0GGG0G0......',
 '...0G0.0ophgoohgoGhgGGG.0G0.....',
 '..0G0..0oo00oo00oG00GGG0.0G0....',
 '..0G0.0ooog0oooooGg0GGGG0.0G0...',
 '.0G0..0ooohgooooGGhgGGGG0..0G0..',
 '.0G0..0oooo00ooGGG00GGGG0..0G0..',
 '.0G0..0ooooooooGGGGGGGGG0..0G0..',
 '..0...0oooo0oooGGG0GGGGG0...0...',
 '.......0ooo00oGGG00GGGG0........',
 '.......0oo0l0000000m0GG0........',
 '........0o0ll0....0mm0G0........',
 '........00.0l0....0m0.00........',
 '...........0lr0..0mm0...........',
 '............0l0..0m0............',
 '............0r0..0l0............',
 '.............0....0.............',
 '................................',
 '................................',
 '................................',
 '................................',
 '................................'],
 bear:[
 '................................',
 '....000..................000....',
 '...0kkj0................0jji0...',
 '..0kkjjj0..000000000...0jjiii0..',
 '..0kjhjj000kkkkjjjjj000jjfii0...',
 '..0kjhhjkkkkkkkjjjjjjjjjffi0....',
 '...0jjkkkkkkkkjjjjjjjjjjjii0....',
 '...0kkkkkkkkkkjjjjjjjjjjjiii0...',
 '..0kkkk0000kkkjjjjj0000jjiii0...',
 '..0kkk0lllr0kkjjjj0lllm0jiiii0..',
 '..0kk0llyyll0kjjj0llyyml0iiii0..',
 '..0kk0ly00yl0kjjj0ly00ym0iiii0..',
 '..0kk0ly00yl0kkjj0ly00ym0iiii0..',
 '..0kk0llyyll0dcc00llyymm0iiii0..',
 '..0kkk0llll0ddccb00lmmm0iiiii0..',
 '..0kkkk0000dddccbb00000iiiiii0..',
 '..0kkkkkkk0ddcccbbb0jjiiiiiii0..',
 '...0kkkkkkk0dcccbb0jjjiiiiii0...',
 '...0kkkkkjjj0dccb0jjjiiiiiii0...',
 '...0lkkkjjjjj0cb0jjjjiiiiiim0...',
 '....0lkkjjjjjj00jjjjjiiiiim0....',
 '....0llkkjjjjjjjjjjjjiiiimm0....',
 '.....0llkkjjjjjjjjjjiiiimm0.....',
 '.....0lllkkjjjjjjjjiiiimmm0.....',
 '......0lllkkkjjjjjiiiimmm0......',
 '......0llllkkkjjjjiiimmmm0......',
 '.......0llllkkkjjiiimmmm0.......',
 '.......0lllllkkjjiimmmmm0.......',
 '........0lllllkjjimmmmm0........',
 '........0llllllkjmmmmmm0........',
 '.........0lllllllmmmmm0.........',
 '.........0llllllmmmmmm0.........']};
function ptEnemyRows(id,f){const seed=ptHash('en:'+id),bg=['f','1','g'].slice(0,2),B=o=>ptBust(Object.assign({seed,bg,face:{},marks:{}},o));
 const beast=k=>{const C=ptL(bg[0]);for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(x+y>38||y>=29)C[y][x]=bg[1];ptSt(C,PT_BEAST[k],0,0);return C.map(r=>r.join(''))};
 switch(id){
 case'gob':return B({head:PT_HEAD.gob,skin:PT_SKIN.gob,ears:'gob',ey:14,my:18,build:'slim',armor:'rags',ragC:'brown',face:{eye:3,iris:'0',white:'y',brow:9,nose:5,mouth:5,nolip:1},hat:'cap',wpn:'dagger',wx:-1});
 case'gobarch':return B({head:PT_HEAD.gob,skin:PT_SKIN.gob,ears:'gob',ey:14,my:18,build:'slim',armor:'leather',face:{eye:3,iris:'0',white:'y',brow:9,nose:5,mouth:1,nolip:1},hat:'hood',hatC:'brown',wpn:'quiver'});
 case'gobsham':return B({head:PT_HEAD.gob,skin:PT_SKIN.gob,ears:'gob',ey:14,my:18,build:'slim',armor:'fur',face:{eye:4,iris:'C',white:'r',brow:9,nose:5,mouth:5,nolip:1},marks:{paint:1,paintC:'l'},hat:'skullcap',wpn:'staff',beads:['l','g']});
 case'skel':return B({head:PT_HEAD.skull,skin:PT_SKIN.bone,ears:'none',build:'slim',armor:'mail',face:{eye:5,iris:'F',brow:9,nose:4,mouth:9},hat:'kettle',wpn:'sword',shield:'kite',shC:'night',over:ptSkullJaw});
 case'skelhal':return B({head:PT_HEAD.skull,skin:PT_SKIN.bone,ears:'none',build:'slim',armor:'mail',face:{eye:5,iris:'F',brow:9,nose:4,mouth:9},hat:'kettle',wpn:'halberd',over:ptSkullJaw});
 case'zomb':return B({head:PT_HEAD.human,skin:PT_SKIN.rot,ears:'human',build:'normal',armor:'rags',ragC:'night',hair:'wisps',hairC:PT_HAIRC.N,face:{eye:0,iris:'A',white:'l',brow:2,browC:'1',nose:0,mouth:5,bags:1,nolip:1},marks:{scar:2},over:(L,E)=>{ptR(L,18,13,20,15,'0');ptS(L,19,14,'f');ptH(L,10,12,9,'g');ptS(L,11,10,'f');ptS(L,20,19,'f');ptS(L,21,18,'g');ptS(L,20,18,'f')}});
 case'necro':return B({head:PT_HEAD.skull,skin:PT_SKIN.ash,ears:'none',build:'slim',armor:'robe',robeC:'purple',face:{eye:4,iris:'A',white:'r',brow:2,browC:'G',nose:1,mouth:4,bags:1},hat:'hood',hatC:'purple',wpn:'staff',beads:['l','m']});
 case'wolf':return beast('wolf');case'spider':return beast('spider');case'bear':return beast('bear');
 case'orcy':return B({head:PT_HEAD.orc,skin:PT_SKIN.dorc,ears:'orc',ey:13,my:19,build:'broad',armor:'fur',hair:'bun',hairC:PT_HAIRC.G,face:{eye:0,iris:'g',white:'y',brow:5,browC:'1',nose:2,mouth:7},marks:{paint:1,paintC:'g'},wpn:'axe1'});
 case'orcw':return B({head:PT_HEAD.orc,skin:PT_SKIN.dorc,ears:'orc',ey:13,my:19,build:'broad',armor:'mail',face:{eye:0,iris:'g',white:'y',brow:5,browC:'1',nose:2,mouth:7},marks:{scar:2},hat:'nasal',wpn:'axe1'});
 case'obrute':return B({head:PT_HEAD.orc,skin:PT_SKIN.dorc,ears:'orc',ey:13,my:19,build:'broad',armor:'mail',face:{eye:0,iris:'g',white:'y',brow:5,browC:'1',nose:2,mouth:7},marks:{scar:2},hat:'nasal',wpn:'maul'});
 case'orcl':return B({head:PT_HEAD.orc,skin:PT_SKIN.dorc,ears:'orc',ey:13,my:19,build:'huge',armor:'plate',face:{eye:4,iris:'E',white:'y',brow:5,browC:'1',nose:2,mouth:7},marks:{scar:1,paint:1,paintC:'g'},hat:'horns',hair:'mohawk',hairC:PT_HAIRC.K,wpn:'axe',wx:2});
 case'thug':return B({head:PT_HEAD.human,skin:PT_SKIN.fair,build:'broad',armor:'rags',ragC:'brown',hair:'bald',hairC:PT_HAIRC.G,face:{iris:'0',brow:3,browC:'G',nose:2,mouth:4,bags:1},marks:{stubble:1,scar:3},wpn:'club',shield:'buckler'});
 case'bmark':return B({head:PT_HEAD.human,skin:PT_SKIN.tan,build:'normal',armor:'leather',hair:'short',hairC:PT_HAIRC.G,face:{iris:'0',brow:2,browC:'0',nose:0,mouth:9,lid:1},hat:'hood',hatC:'night',wpn:'bow',over:(L,E)=>{const P2={hat:'mask',hatC:'red',skin:PT_SKIN.tan,ey:14};ptHat(L,P2,E)}});
 case'bxbow':return B({head:PT_HEAD.human,skin:PT_SKIN.tan,build:'normal',armor:'leather',hair:'short',hairC:PT_HAIRC.G,face:{iris:'0',brow:2,browC:'0',nose:0,mouth:9,lid:1},hat:'hood',hatC:'night',wpn:'xbow',over:(L,E)=>{const P2={hat:'mask',hatC:'red',skin:PT_SKIN.tan,ey:14};ptHat(L,P2,E)}});
 case'braid':return B({head:PT_HEAD.human,skin:PT_SKIN.fair,build:'normal',armor:'mail',hair:'short',hairC:PT_HAIRC.H,beard:'short',face:{iris:'0',brow:2,browC:'i',nose:1,mouth:0,lid:1},marks:{scar:1},hat:'kettle',wpn:'sword',shield:'heater',shC:'night'});
 case'blead':return B({head:PT_HEAD.human,skin:PT_SKIN.fair,build:'broad',armor:'scale',hair:'mane',hairC:PT_HAIRC.G,beard:'full',face:{iris:'0',brow:3,browC:'0',nose:1,mouth:3},marks:{patch:1,scar:2},hat:'feather',wpn:'sword',shield:'heater',shC:'red'});
 case'imp':return B({head:PT_HEAD.imp,skin:PT_SKIN.void,ears:'gob',ey:14,my:18,build:'slim',armor:'bare',face:{eye:4,iris:'E',white:'y',brow:9,nose:4,mouth:5,nolip:1},hat:'horns',hornC:['G','o','p']});
 case'vknight':return B({head:PT_HEAD.human,skin:PT_SKIN.void,ears:'none',build:'broad',armor:'void',face:{eye:9,brow:9,mouth:9},over:ptVoidHelm,wpn:'rift'});
 case'vmage':return B({head:PT_HEAD.elf,skin:['G','0','0','0'],ears:'none',build:'slim',armor:'robe',robeC:'purple',face:{eye:4,iris:'F',white:'r',brow:9,nose:9,mouth:9,nolip:1},hat:'hood',hatC:'purple',wpn:'focus',top:C=>{ptSt(C,['.C.','CrC','.C.'],3,8);ptSt(C,['.C.','CrC','.C.'],26,22);ptS(C,6,15,'C');ptS(C,7,15,'D')}});
 case'tyrant':return B({head:PT_HEAD.big,skin:['D','G','0','0'],ears:'orc',ey:13,my:19,build:'huge',armor:'void',face:{eye:4,iris:'E',white:'y',brow:5,browC:'0',nose:4,mouth:7},hat:'crown',over:(L,E)=>{ptHat(L,{hat:'horns',hornC:['m','l','r'],skin:PT_SKIN.void,head:PT_HEAD.big,ey:13},E);[[8,16],[9,17],[9,18],[10,19],[22,9],[21,10],[21,11],[20,12]].forEach(([x,y])=>ptS(L,x,y,'C'));ptH(L,12,14,10,'C');ptS(L,11,11,'C')}});
 }
 return B({head:PT_HEAD.human,skin:PT_SKIN.rot,armor:'rags',face:{eye:4,iris:'g'}})}
function ptSkullJaw(L,E){const y=E.y1;ptH(L,12,19,y-5,'n');ptH(L,13,18,y-3,'0');for(let x=13;x<=18;x++){ptS(L,x,y-4,x%2?'l':'n');ptS(L,x,y-2,x%2?'m':'n')}ptS(L,11,y-6,'n');ptS(L,20,y-6,'n');ptS(L,10,y-8,'n');ptS(L,21,y-8,'o')}
function ptVoidHelm(L,E){for(let y=E.y0-1;y<=E.y1;y++){const x0=y<E.y0?E.X0(E.y0)+1:E.X0(y)-(y<E.y1-3?1:0),x1=31-x0;for(let x=x0;x<=x1;x++)ptS(L,x,y,x>=x1-2?'0':x<=x0+1&&y<E.y1-2?'D':'G')}
 ptH(L,12,15,E.y0,'D');ptH(L,11,13,E.y0+1,'D');ptH(L,10,21,14,'0');ptH(L,11,20,13,'0');ptH(L,11,14,14,'C');ptH(L,17,20,14,'C');ptS(L,12,14,'r');ptS(L,18,14,'r');ptV(L,15,15,E.y1,'0');ptV(L,16,15,E.y1,'D');
 for(let y=17;y<=20;y+=1){ptS(L,12,y,'0');ptS(L,19,y,'0')}
 for(const s of [0,1]){const X=x=>s?31-x:x;[[8,8],[7,7],[7,6],[6,5],[6,4],[6,3]].forEach(([x,y],i)=>{ptS(L,X(x),y,s?'0':'D');ptS(L,X(x+1),y,s?'G':i<3?'G':'C')})}}

/* ---- public API ---- */
let PT_HELMS=null;function ptHelmsExist(){if(PT_HELMS===null){PT_HELMS=false;for(const k in ITEMS)if(ITEMS[k].k==='h'){PT_HELMS=true;break}}return PT_HELMS}
function ptKey(x){if(!x)return null;if(typeof x==='string')return EN[x]?'e:'+x:null;
 const m=x.m&&x.m.base?x.m:x.base&&x.eq?x:null;if(m){const e=m.eq||{};return'm:'+m.id+':'+m.name+':'+m.race+':'+m.bg+':'+(e.w||'')+':'+(e.s||'')+':'+(e.a||'')+':'+(e.h||'')+':'+(typeof mercRes==='function'?mercRes(m)||'':'')+':'+ptColSig(m)}
 if(x.def){for(const k in EN)if(EN[k]===x.def)return'e:'+k;if(x.eid&&EN[x.eid])return'e:'+x.eid}return null}
function portraitRows(x){let key=null;try{key=ptKey(x)}catch(e){}if(!key)key='e:?';let r=PTC.rows.get(key);if(r)return r;
 try{if(key[0]==='m'){const m=x.m&&x.m.base?x.m:x;r=ptBust(ptMercSpec(m))}else r=ptEnemyRows(key.slice(2),x&&x.f)}catch(e){r=null}
 if(!r)r=ptL('2').map(a=>a.join(''));if(PTC.rows.size>PTC.max){PTC.rows.clear();PTC.cv.clear();PTC.url.clear()}PTC.rows.set(key,r);r.key=key;return r}
/* monster art (76-monsters.js) paints its own enemies' portraits: monsterPortrait(typeId) -> 32x32 canvas or null */
function ptMonKey(x){if(!x||x.m||typeof monsterPortrait!=='function')return null;if(x.base&&x.eq)return null;if(typeof x==='string')return x;if(x.def){if(x.eid&&EN[x.eid]===x.def)return x.eid;for(const k in EN)if(EN[k]===x.def)return k;return x.eid||null}return null}
function ptMon(x){const k=ptMonKey(x);if(!k)return null;let c=PTC.cv.get('mon:'+k);if(c!==undefined)return c;try{c=monsterPortrait(k)||null}catch(e){c=null}PTC.cv.set('mon:'+k,c);return c}
function portraitCanvas(x){const M=ptMon(x);if(M)return M;try{const r=portraitRows(x),k=r.key;let c=PTC.cv.get(k);if(c===undefined){c=px(r)||null;PTC.cv.set(k,c)}return c}catch(e){return null}}
function portraitURL(x){const M=ptMon(x);if(M){const k='mon:'+ptMonKey(x);let u=PTC.url.get(k);if(u===undefined){u='';try{u=M.toDataURL()||''}catch(e){}PTC.url.set(k,u)}return u}try{const r=portraitRows(x),k=r.key;let u=PTC.url.get(k);if(u===undefined){const c=portraitCanvas(x);u='';try{if(c&&c.toDataURL)u=c.toDataURL();if(typeof u!=='string')u=''}catch(e){u=''}PTC.url.set(k,u)}return u}catch(e){return''}}
function portraitHTML(x,size,cls){size=Math.max(16,Math.round(+size||32));let u='';try{u=portraitURL(x)}catch(e){}
 const side=x&&(x.def||typeof x==='string')&&!(x.m)?' foe':'';
 return`<span class="ptr${side}${cls?' '+cls:''}" style="display:inline-block;flex:none;width:${size}px;height:${size}px;line-height:0;vertical-align:middle;background:${PAL[side?'f':'3']}">${u?`<img src="${u}" width="${size}" height="${size}" alt="" draggable="false" style="display:block;width:${size}px;height:${size}px;image-rendering:pixelated;image-rendering:crisp-edges;image-rendering:pixelated">`:''}</span>`}
