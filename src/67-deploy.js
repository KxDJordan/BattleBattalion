/* ================= DEPLOYMENT (the screen before a battle) =================
   engage(o) in 40-world.js hands every battle the player walks into to deployBattle(o). It shows who is waiting, the
   ground and the hour, and the company's own edge of the field as a grid: the fielded swords stand where the Lines tab
   put them and can be dragged, or tapped and then placed, for this one fight. Reserves wait at the side and can trade
   places with a fielded sword. Begin calls startBattle(o) with o.deploy=[{id,c,r}] (board tiles); Withdraw declines the
   fight through fleeEncounter(o) in 68-battle-flow.js, at the price of a retreat.
   The screen is skipped (startBattle is called at once) when there is no real DOM, when o.auto or o.quiet is set, or
   when the player has turned it off (SET.deploy===false).
   The field and the foes come from the rules: battlePreview(o) rolls both (seeded) and its tiles and foes are handed back
   as o.tiles / o.foes (and o.fixedAll), so the battle is fought on exactly what was shown: the enemy types and counts, a
   top-down miniature of the ground, and the height of each deployment tile. With only previewEnemies(o) the foes are
   shown without the map; with neither, only the faction and its possible troops.
   This file itself never draws from the game's seeded rnd(): the vignette is cosmetic and hashed from the place and the day. */
const DP={root:null,o:null,raw:null,pv:null,foes:null,at:null,pick:null,drag:null,ask:false,bound:false,sx:null,big:false,key:''};
function dpCan(){try{return typeof window!=='undefined'&&typeof document!=='undefined'&&typeof HTMLCanvasElement!=='undefined'&&typeof ImageData!=='undefined'&&!!document.body&&typeof document.body.appendChild==='function'}catch(e){return false}}
function dpWanted(){return typeof SET==='undefined'||!SET||SET.deploy!==false}
function deployOpen(){return!!DP.o}
/* rows of the company's edge, nearest the enemy first: [board r, ...] */
function dpRows(){const n=typeof SPAWN_P==='number'&&SPAWN_P>0?SPAWN_P:2,a=[];for(let i=0;i<n;i++)a.push(BH-n+i);return a}
function dpBiome(o){return DP.pv&&BIO[DP.pv.bk]?DP.pv.bk:BIO[o.biome]?o.biome:BIOKEY[tileAt(G.p.x,G.p.y)]||'plains'}
function dpTod(){if(typeof tvTod==='function')return tvTod();const h=G?G.hour:12;return h>=5&&h<8?'dawn':h>=8&&h<17.5?'day':h>=17.5&&h<20.5?'dusk':'night'}
/* the rules' composition, read loosely: an array of ids, of [id,n] pairs or of {id,n|count} records, or {list|ids|units:[...]} */
function dpFoes(raw){let L=raw;if(L&&!Array.isArray(L)&&typeof L==='object')L=L.list||L.ids||L.units||L.foes||null;if(!Array.isArray(L)||!L.length)return null;
 const out=[],add=(id,n)=>{n=Math.max(1,Math.round(+n||1));const k=EN[id]?id:null,r=out.find(x=>x.id===k);if(r)r.n+=n;else out.push({id:k,n})};
 for(const x of L){if(typeof x==='string')add(x,1);else if(Array.isArray(x))add(x[0],x[1]);else if(x&&typeof x==='object')add(x.id||x.k||x.type,x.n!=null?x.n:x.count!=null?x.count:1)}
 return out.length?out:null}
function dpStrength(o){const m=+o.mult||1;return m<.8?'Small band':m<1.1?'Even match':m<1.4?'Strong force':'A host'}
function dpTraits(bk){const P=BIO[bk],obj=({tree:'trees',rock:'rocks',crystal:'crystals'})[P.obj]||'cover',t=[];
 t.push(P.amp<1.5?['Flat ground','Little high ground to hold']:P.amp<3?['Rolling ground','Some high ground: +10 to hit downhill']:['Steep ground','High ground matters: +10 to hit downhill']);
 t.push(P.block<.05?['Open field','Few '+obj+' to block the way']:P.block<.1?['Scattered '+obj,obj[0].toUpperCase()+obj.slice(1)+' block movement here and there']:['Thick with '+obj,'Many tiles are blocked']);
 if(P.rgh>=.15)t.push(['Boggy footing','Much rough ground: +1 AP a step']);else if(P.rgh>=.08)t.push(['Rough patches','Some rough ground: +1 AP a step']);
 if(P.haz)t.push(['Burning ground','Hazard tiles wound whoever stands on them']);return t}
function dpStart(o){const p=Object.assign({},o);if(typeof battleSnap==='function')battleSnap(p);return startBattle(p)}
/* entry point */
function deployBattle(o){o=o||{};if(o.auto||o.quiet||!dpCan()||!dpWanted()||!G||!G.roster||!G.roster.length)return dpStart(o);
 let ok=false;try{ok=dpShow(o)}catch(e){ok=false;try{dpHide()}catch(_){}if(typeof console!=='undefined')console.warn('deployment screen failed: '+(e&&e.message||e))}
 return ok?null:dpStart(o)}
/* ---- state: DP.at maps a merc id to {i,c} (i = index into dpRows(), c = column) ---- */
function dpFromFormation(){const at={},rows=dpRows();formation().forEach(x=>{at[x.m.id]={i:x.row?rows.length-1:0,c:x.col}});return at}
function dpMerc(id){return G.roster.find(m=>m.id===id)||null}
function dpAt(i,c){for(const id in DP.at){const a=DP.at[id];if(a.i===i&&a.c===c)return dpMerc(+id)}return null}
function dpFielded(){return G.roster.filter(m=>DP.at[m.id])}
function dpReserves(){return G.roster.filter(m=>!DP.at[m.id])}
function dpPlace(id,i,c){const m=dpMerc(id);if(!m||!(i>=0&&i<dpRows().length&&c>=0&&c<BW))return;const cur=DP.at[id],o=dpAt(i,c);
 if(o&&o.id===id){DP.pick=null;dpRender();return}
 if(cur){if(o)DP.at[o.id]={i:cur.i,c:cur.c};DP.at[id]={i,c}}
 else{if(o)delete DP.at[o.id];else if(dpFielded().length>=MAXFIELD){toast('Twelve is the most you can field');return}DP.at[id]={i,c}}
 DP.pick=null;dpRender()}
function dpBench(id){if(!DP.at[id])return;if(dpFielded().length<=1){toast('Somebody has to fight');return}delete DP.at[id];DP.pick=null;dpRender()}
function dpField(id){if(DP.at[id])return;if(dpFielded().length>=MAXFIELD){toast('Twelve is the most you can field');return}const m=dpMerc(id);if(!m)return;
 const rows=dpRows(),want=fmBack(m)?rows.length-1:0;for(const i of [want,rows.length-1-want])for(const c of fmOrder())if(!dpAt(i,c)){DP.at[id]={i,c};DP.pick=null;dpRender();return}}
function dpTap(id,ptrClick){if(ptrClick)return;const p=DP.pick;if(p==null||!dpMerc(p)){DP.pick=id;dpRender();return}if(p===id){DP.pick=null;dpRender();return}
 const a=DP.at[id],b=DP.at[p];if(a)dpPlace(p,a.i,a.c);else if(b)dpPlace(id,b.i,b.c);else{DP.pick=id;dpRender()}}
function dpCell(i,c){if(DP.pick==null)return;dpPlace(DP.pick,i,c)}
function dpReset(){DP.at=dpFromFormation();DP.pick=null;dpRender();toast('Back to the lines you set')}
function dpSwapRows(){const n=dpRows().length;for(const id in DP.at)DP.at[id].i=n-1-DP.at[id].i;DP.pick=null;dpRender()}
function dpChanged(){const f=dpFromFormation(),a=DP.at,ka=Object.keys(a),kf=Object.keys(f);return ka.length!==kf.length||ka.some(k=>!f[k]||f[k].i!==a[k].i||f[k].c!==a[k].c)}
/* the deployment as board tiles */
function dpList(){const rows=dpRows();return dpFielded().map(m=>{const a=DP.at[m.id];return{id:m.id,c:a.c,r:rows[a.i]}})}
/* ---- actions ---- */
function dpBegin(){const o=DP.o;if(!o)return;const dep=dpList();if(!dep.length)return;const ids=new Set(dep.map(d=>d.id)),old=new Map(),rows=dpRows();
 // the fielded twelve are whoever stands on the grid; their tiles go to the rules as o.deploy. Until the rules read it, the
 // same placement is lent to the formation slots for the length of the call, so the swords stand where they were put either way.
 G.roster.forEach(m=>{old.set(m,m.slot);m.field=ids.has(m.id)});
 dep.forEach(d=>{const m=dpMerc(d.id);m.slot=d.r===DEPLOY.p.front?{row:0,col:d.c}:d.r===DEPLOY.p.back?{row:1,col:d.c}:null});
 const p=Object.assign({},o,{deploy:dep});if(DP.raw!=null){p.fixedAll=DP.raw;if(Array.isArray(DP.raw))p.foes=DP.raw}if(DP.pv&&Array.isArray(DP.pv.tiles))p.tiles=DP.pv.tiles;if(typeof battleSnap==='function')battleSnap(p);
 dpHide();let b=null;try{b=startBattle(p)}finally{G.roster.forEach(m=>{const s=old.get(m);m.slot=m.field&&s?s:null})}
 if(!b&&mode==='world'){if(typeof setUI==='function')setUI()}return b}
function dpAsk(v){DP.ask=!!v;dpRender()}
function dpWithdraw(){const o=DP.o;if(!o)return;dpHide();const out=fleeEncounter(o);if(typeof setUI==='function')setUI();
 toast(out.toast?out.toast:out.lost?`The company slips away and drops ${out.lost} crowns on the run`:'The company slips away');save();return out}
function dpHide(){DP.o=null;DP.raw=null;DP.pv=null;DP.foes=null;DP.at=null;DP.pick=null;DP.ask=false;if(DP.drag)dpDragEnd();if(DP.root)DP.root.classList.remove('on','in');sheetOpen=false}
/* ---- pixel vignette of the field: sky for the hour, far ridge, the biome's ground and its cover, the two banners ---- */
const DPGROUND={plains:{g:['v','w','B'],far:'n',farH:'m',prop:'leafy'},forest:{g:['B','7','3'],far:'7',farH:'5',prop:'pine'},hills:{g:['w','n','o'],far:'p',farH:'q',prop:'rock',sharp:1},
 swamp:{g:['7','3','2'],far:'4',farH:'n',prop:'dead',pool:'4'},desert:{g:['d','c','k'],far:'k',farH:'d',prop:'rock',sharp:1},snow:{g:['r','q','p'],far:'q',farH:'r',prop:'pine',sharp:1,snow:1},
 ashen:{g:['u','i','a'],far:'f',farH:'g',prop:'rock',sharp:1,ember:1},hollow:{g:['D','G','1'],far:'G',farH:'D',prop:'crystal',sharp:1,cry:['C','D','e']},glass:{g:['F','x','X'],far:'X',farH:'x',prop:'crystal',cry:['6','5','r']}};
const DPSKY={day:['X','x','x','F','F'],dawn:['X','D','C','h','d'],dusk:['G','D','D','g','E','y'],night:['0','0','1','2','3']};
const DPREALMSKY={ashen:['0','a','f','g','E'],hollow:['0','1','G','D','C'],glass:['1','G','X','x','F']};
function dpPaint(bk,tod,f,W,H){const P=tvPainter(W,H),S=DPGROUND[bk]||DPGROUND.plains,hs=tvHash(bk+':'+f+':'+(G?G.day+':'+Math.round(G.p.x/TS)+':'+Math.round(G.p.y/TS):0)),R=mulberry(hs),rr=(a,b)=>a+Math.floor(R()*(b-a+1));
 const realm=!!DPREALMSKY[bk],bands=DPREALMSKY[bk]||DPSKY[tod]||DPSKY.day,n=bands.length,yH=Math.round(H*.46),g=S.g;
 P.ly=0;P.em=1;
 for(let y=0;y<yH;y++){const tt=y/Math.max(1,yH-1)*(n-1),i=Math.min(n-2,Math.floor(tt)),fr=Math.round(clamp((tt-i-.26)/.48,0,1)*4)/4;for(let x=0;x<W;x++)P.p(x,y,bands[fr*16>TVBAY[(y&3)*4+(x&3)]+.5?i+1:i])}
 const sx=Math.round(W*(.3+(hs>>>8)%5*.1));
 if(realm){for(let i=0;i<W/9;i++)P.p(rr(0,W-1),rr(0,yH-6),bk==='ashen'?'E':bk==='hollow'?'C':'r')}
 else if(tod==='night'){for(let i=0;i<W*yH/120;i++)P.p(rr(0,W-1),rr(0,Math.max(2,yH-8)),R()<.3?'l':'4');P.disc(sx,Math.round(yH*.3),4,'l');P.disc(sx-1,Math.round(yH*.3)-1,2,'e');P.disc(sx+2,Math.round(yH*.3)-1,3,bands[1])}
 else if(tod==='day'){P.disc(sx,Math.round(yH*.26),5,'F',0);P.disc(sx,Math.round(yH*.26),3,'e');P.disc(sx-1,Math.round(yH*.26)-1,1,'r')}
 else{const sy=yH-4;P.disc(sx,sy,9,tod==='dawn'?'e':'y',2);P.disc(sx,sy,6,tod==='dawn'?'e':'y',0);P.disc(sx,sy,4,tod==='dawn'?'e':'y');P.disc(sx,sy,2,tod==='dawn'?'r':'d')}
 if(!realm&&tod!=='night')for(let i=0;i<2+W/90;i++){const cx=rr(4,W-4),cy=rr(3,Math.max(4,Math.round(yH*.45))),w=rr(8,18),k=tod==='day'?'r':tod==='dawn'?'l':'h';P.r(cx-(w>>1),cy,w,2,k);P.r(cx-(w>>2),cy-1,w>>1,1,k);P.r(cx-(w>>1)+1,cy+2,w-3,1,tod==='day'?'q':'g')}
 // far ridge
 P.em=0;P.ly=1;const ph=[R()*9,R()*9,R()*9],tri=x=>{x-=Math.floor(x);return x<.5?x*2:2-x*2},amp=Math.max(6,Math.round(H*(S.sharp?.3:.18)));
 for(let x=0;x<W;x++){const u=x/(W*.55),h=S.sharp?tri(u+ph[0])*.6+tri(u*2.3+ph[1])*.28+tri(u*5.1+ph[2])*.12:(Math.sin(u*6.28+ph[0])*.5+.5)*.65+(Math.sin(u*14.6+ph[1])*.5+.5)*.35,top=Math.round(yH+1-amp*h);
  for(let y=top;y<yH+2;y++)P.p(x,y,y-top<1||(S.snow&&y-top<3&&h>.5)?S.farH:S.far)}
 if(S.prop==='pine'||S.prop==='leafy')for(let x=-2;x<W+3;x+=rr(3,6)){const h=rr(4,8);for(let j=0;j<h;j++){const w2=S.prop==='pine'?Math.round(j*2.2/h+.4):Math.round(Math.sin((j+1)/h*2.6)*2.2);for(let i=-w2;i<=w2;i++)P.p(x+i,yH+1-h+j,S.snow&&j<2?'q':i<0?g[1]:g[2])}}
 // ground: three shades toward the viewer, dithered where they meet
 P.ly=2;for(let y=yH+2;y<H;y++){const t=(y-yH-2)/Math.max(1,H-yH-3);for(let x=0;x<W;x++){const th=TVBAY[(y&3)*4+(x&3)]/16,k=t+th*.3-.15<.34?g[0]:t+th*.3-.15<.74?g[1]:g[2];P.p(x,y,k)}}
 for(let i=0;i<W*(H-yH)/22;i++){const x=rr(0,W-1),y=rr(yH+3,H-1);P.p(x,y,R()<.5?g[0]:g[2])}
 if(S.pool)for(let i=0;i<2+W/70;i++){const x=rr(2,W-16),y=rr(yH+5,H-4),w=rr(8,16);P.r(x+1,y,w-2,1,'3');P.r(x,y+1,w,1,S.pool);P.r(x+2,y+1,Math.max(1,w>>2),1,'n');P.r(x+1,y+2,w-2,1,'3')}
 if(S.ember)for(let i=0;i<3+W/40;i++){const x=rr(2,W-6),y=rr(yH+4,H-2),w=rr(2,5);P.em=1;P.r(x,y,w,1,'E');P.p(x+(w>>1),y,'y');P.em=0;P.r(x,y+1,w,1,'f')}
 // cover, as thick as the battle map will be
 const B0=BIO[bk],nP=Math.round(W/11*clamp(B0.block/.07,.4,2.2));
 const rock=(x,y,s)=>{const w=3+s,h=2+(s>>1);for(let j=0;j<h;j++){const ins=j===0?1:0;for(let i=ins;i<w-ins;i++)P.p(x+i,y-h+j,i<=1&&j<=1?(S.snow?'r':'q'):i>=w-2||j===h-1?'o':'p')}P.d(x+1,y,w,1,g[2],0)};
 const pine=(x,y,h)=>{P.r(x,y-2,1,2,'i');for(let j=0;j<h;j++){const w2=Math.round((j%3+1)*(1+j/h)*.8);for(let i=-w2;i<=w2;i++)P.p(x+i,y-2-h+j,S.snow&&j%3===0&&i<=0?'r':i<0?'5':i===w2||j%3===2?'3':'7')}P.p(x,y-3-h,S.snow?'r':'5')};
 const leafy=(x,y,r)=>{P.r(x,y-r,1,r,'i');const cy=y-r-r+1;for(let dy=-r;dy<=r;dy++)for(let dx=-r-1;dx<=r+1;dx++){if(dx*dx*.7+dy*dy>r*r+r*.6)continue;P.p(x+dx,cy+dy,dx+dy*1.5<-r*.7?'A':dx+dy*1.5>r*.9?'7':'B')}};
 const dead=(x,y,h)=>{P.r(x,y-h,1,h,'i');for(let j=2;j<h;j+=3){const d=j%2?1:-1;for(let k=1;k<=3;k++)P.p(x+d*k,y-h+j-(k>>1),'i')}P.d(x-2,y-h-1,5,2,'4',1)};
 const crystal=(x,y,h)=>{const c=S.cry||['C','D','e'];for(let j=0;j<h;j++){const w2=j<2?0:j<h-2?1:2;for(let i=-w2;i<=w2;i++)P.p(x+i,y-h+j,i<0?c[0]:i>0?c[1]:j<h/2?c[2]:c[0])}P.em=1;P.p(x,y-h,c[2]);P.em=0;P.r(x-2,y,5,1,c[1])};
 const spots=[];for(let i=0;i<nP;i++){const x=rr(3,W-5),y=rr(yH+5,H-2);if(Math.abs(x-W*.16)<9||Math.abs(x-W*.6)<9)continue;spots.push([x,y])}
 spots.sort((a,b)=>a[1]-b[1]).forEach(([x,y])=>{const s=Math.round((y-yH)/(H-yH)*3);if(S.prop==='rock')rock(x,y,s);else if(S.prop==='pine')pine(x,y,5+s*2);else if(S.prop==='leafy')leafy(x,y,2+s);else if(S.prop==='dead')dead(x,y,6+s*2);else crystal(x,y,5+s*2)});
 // banners: the enemy's on the far side, the company's own colours near
 const M=typeof TWMARK!=='undefined'&&TWMARK[f]?TWMARK[f].f:'gfh',flag=(x,y,h,c,flip)=>{P.r(x,y-h,1,h,'0');P.p(x,y-h-1,'c');const d=flip?-1:1;for(let j=0;j<5;j++)for(let i=1;i<=6;i++){if(j===4&&i%2===0)continue;P.p(x+d*i,y-h+j+(i>4?1:0),j===0?c[1]:i===6||j===3?c[2]:c[0])}P.d(x-2,y,5,1,g[2],0)};
 flag(Math.round(W*.6),yH+7,11,[M[0],M[1],M[2]],1);const ban=G&&G.banner&&typeof BANNERC!=='undefined'?G.banner:null,bc=ban&&BANNERC[ban.c1]&&BANNERC[ban.c1].r,b2=ban&&BANNERC[ban.c2]&&BANNERC[ban.c2].r;
 flag(Math.round(W*.16),H-3,14,bc?[bc[1],bc[2],b2?b2[1]:bc[0]]:['c','d','b'],0);
 return P}
function dpVignette(el,bk,tod,f){if(!el||typeof tvPainter!=='function')return;const s=DP.big?3:2,W=Math.max(40,Math.ceil(el.clientWidth/s)),H=Math.max(20,Math.ceil(el.clientHeight/s)),key=[bk,tod,f,W,H,G.day,G.banner?G.banner.c1+G.banner.c2:''].join('|');
 if(el.dataset.key===key)return;const P=dpPaint(bk,tod,f,W,H),c=tvCompose(P,DPREALMSKY[bk]?'day':tod,[]);if(!c)return;c.className='dp-cv';c.style.width=W*s+'px';c.style.height=H*s+'px';c.setAttribute('aria-hidden','true');
 const old=el.querySelector('canvas');if(old)old.remove();el.insertBefore(c,el.firstChild);el.dataset.key=key}
/* top-down miniature of the rolled battlefield (only when the rules handed its tiles over): the enemy edge is at the top.
   Higher ground is lighter, with a dark lip where it drops toward the viewer; cover, rough ground and hazards are marked. */
function dpMapURL(bk,tiles){if(!Array.isArray(tiles)||tiles.length!==BW*BH||typeof px!=='function')return'';const S=DPGROUND[bk]||DPGROUND.plains,g=({forest:['w','B','7'],swamp:['n','w','7'],ashen:['t','u','i'],hollow:['C','D','G']})[bk]||S.g,cs=3,W=BW*cs+4,H=BH*cs+2,L=[];
 for(let y=0;y<H;y++)L.push(new Array(W).fill('0'));const set=(x,y,k)=>{if(x>=0&&y>=0&&x<W&&y<H)L[y][x]=k},sh=[g[2],g[1],g[0],g[0]];
 const lip=({plains:'7',forest:'3',hills:'4',swamp:'3',desert:'j',snow:'o',ashen:'a',hollow:'1',glass:'D'})[bk]||'3';
 const blk=S.prop==='rock'?['o','q']:S.prop==='crystal'?[(S.cry||['C','D'])[1],(S.cry||['C','D'])[0]]:S.prop==='dead'?['i','j']:S.snow?['7','r']:['3','5'];
 for(let r=0;r<BH;r++)for(let c=0;c<BW;c++){const t=tiles[r*BW+c]||{h:0,t:'ground'},x0=2+c*cs,y0=1+r*cs,h=clamp(t.h|0,0,3),below=r<BH-1?tiles[(r+1)*BW+c].h|0:h;
  for(let j=0;j<cs;j++)for(let i=0;i<cs;i++)set(x0+i,y0+j,sh[h]);
  if(below<h)for(let i=0;i<cs;i++)set(x0+i,y0+cs-1,lip);if(h===3)set(x0,y0,S.snow?'F':'e');
  if(t.t==='block'){for(let j=0;j<cs;j++)for(let i=0;i<cs;i++)set(x0+i,y0+j,blk[0]);set(x0,y0,blk[1]);set(x0+1,y0,blk[1])}
  else if(t.t==='rough'){set(x0,y0+1,S.snow?'p':'i');set(x0+2,y0+2,S.snow?'p':'i')}
  else if(t.t==='haz'){for(let j=0;j<cs;j++)for(let i=0;i<cs;i++)set(x0+i,y0+j,'f');set(x0+1,y0+1,'y');set(x0+1,y0,'E');set(x0,y0+1,'E')}}
 for(let r=0;r<BH;r++){const k=r<(typeof SPAWN_E==='number'?SPAWN_E:3)?'g':r>=BH-dpRows().length?'c':null;if(k)for(let j=0;j<cs;j++){set(0,1+r*cs+j,k);set(W-1,1+r*cs+j,k)}}
 try{const c=px(L.map(r=>r.join('')));return c?c.toDataURL():''}catch(e){return''}}
/* height of a deployment tile above the lowest tile of the zone (0 when the rules gave no map): only rises are worth a mark */
function dpTileH(i,c){const pv=DP.pv;if(!pv||!Array.isArray(pv.tiles))return 0;const rows=dpRows();if(pv.dpBase===undefined){let mn=9;for(const r of rows)for(let x=0;x<BW;x++){const t=pv.tiles[r*BW+x];if(t)mn=Math.min(mn,t.h|0)}pv.dpBase=mn===9?0:mn}
 const t=pv.tiles[rows[i]*BW+c];return t?clamp((t.h|0)-pv.dpBase,0,3):0}
/* ---- DOM ---- */
function dpIc(n,sz,cls){return typeof cpIcon==='function'?cpIcon(n,sz||16,cls):typeof pxIcon==='function'?pxIcon(n,sz||16,cls):''}
function dpRoot(){if(DP.root)return DP.root;const r=document.createElement('div');r.id='dp';r.setAttribute('role','dialog');r.setAttribute('aria-modal','true');r.setAttribute('aria-label','Deployment');
 r.innerHTML=`<div class="dp-head" id="dpHead"></div><div class="dp-top"><div class="dp-foe" id="dpFoe"></div><div class="dp-land" id="dpLand"></div></div><div class="dp-zone" id="dpZone"></div><div class="dp-bot" id="dpBot"></div>`;
 const app=$('app')||document.body,sh=$('sheet');if(sh&&sh.parentNode===app)app.insertBefore(r,sh);else app.appendChild(r);
 ['touchmove','wheel'].forEach(ev=>r.addEventListener(ev,e=>e.stopPropagation(),{passive:true}));
 r.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.getAttribute&&e.target.getAttribute('role')==='button'){e.preventDefault();e.target.click()}e.stopPropagation()});
 window.addEventListener('resize',()=>{if(DP.o)dpRender(true)});
 DP.root=r;dpBind(r);return r}
function dpShow(o){if(typeof closeSheet==='function')closeSheet(true);if(typeof tvHide==='function')tvHide();
 const r=dpRoot();DP.o=o;DP.pick=null;DP.ask=false;DP.sx=null;DP.raw=null;DP.foes=null;DP.pv=null;
 // the rules roll the field and the foes now (seeded) and the battle is then fought on exactly what was shown
 if(typeof battlePreview==='function'){try{const pv=battlePreview(o);if(pv&&Array.isArray(pv.foes)){DP.foes=dpFoes(pv.foes);if(DP.foes){DP.raw=pv.foes;DP.pv=pv}}}catch(e){DP.raw=null;DP.foes=null;DP.pv=null}}
 else if(typeof previewEnemies==='function'){try{DP.raw=previewEnemies(o);DP.foes=dpFoes(DP.raw)}catch(e){DP.raw=null;DP.foes=null}if(!DP.foes)DP.raw=null}
 DP.at=dpFromFormation();if(!Object.keys(DP.at).length){DP.o=null;return false}
 r.classList.add('on');r.classList.remove('in');void r.offsetWidth;r.classList.add('in');sheetOpen=true;dpRender(true);return true}
function dpTok(m,size){const s=calc(m),hp=Math.min(m.hp,s.hp),inj=typeof cpInj==='function'?cpInj(m).length:0,sel=DP.pick===m.id;
 return`<span class="dp-tok${sel?' sel':''}${fmBack(m)?' bk':''}" role="button" tabindex="0" data-dp="${m.id}" aria-label="${m.name}, ${coRole(m,s).toLowerCase()}${m.eq&&ITEMS[m.eq.b]?', backup '+ITEMS[m.eq.b].n:''}${hp<s.hp?', wounded':''}${inj?', injured':''}${sel?', picked':''}" onclick="event.stopPropagation();dpTap(${m.id},event.detail)">${portraitHTML(m,size)}${hp<s.hp?`<i class="dp-hp"><i style="width:${Math.max(8,Math.round(100*hp/s.hp))}%"></i></i>`:''}${inj?'<i class="dp-inj"></i>':''}${dpSide(m)}</span>`}
/* a small sidearm marker: the backup weapon's family icon in the token's lower-left corner */
function dpSide(m){const b=m.eq&&ITEMS[m.eq.b];if(!b)return'';const n=typeof itemIconName==='function'?itemIconName(m.eq.b):b.wt;
 return`<i class="dp-side" title="Backup: ${b.n}">${typeof pxIcon==='function'?pxIcon(n,16):''}</i>`}
function dpHeadHTML(o,bk,tod){const F=FACT[o.f]||{n:'Foes'},s=o.src||{},kick=s.type==='lair'?'The lair you were sent to clear':s.type==='dun'?`Rift battle ${G.dun?G.dun.stage+1:1} of 3`:'A band bars the way';
 const em=typeof twEmblem==='function'?twEmblem({type:'hunt',f:o.f},DP.big?48:32):'',lost=G.crowns-Math.floor(G.crowns*.9);
 if(DP.ask){const c=G.contract,why=s.type==='lair'&&c&&c.type==='hunt'&&!c.done?' The contract is forfeit.':s.type==='dun'?' The rift spits you back out and must be entered anew.':s.type==='party'?' The band stays on the map.':'';
  return`<div class="dp-ask" role="alert">${dpIc('retreat',32)}<p><b>Withdraw before the first blow?</b><small>The company scatters and drops ${lost?`<span class="coin">${lost} crowns</span>`:'nothing'} on the run.${why}</small></p></div>
<button type="button" class="pxb" id="dpStay" onclick="dpAsk(0)">Stand fast</button><button type="button" class="pxb warn" id="dpGo" onclick="dpWithdraw()">Withdraw</button>`}
 return`<div class="dp-title">${em}<div><span class="dp-kick">${kick}</span><b>${F.n}</b></div></div>
<button type="button" class="pxb warn" id="dpWithdraw" onclick="dpAsk(1)">${dpIc('retreat')}<span>Withdraw</span></button><button type="button" class="pxb pri" id="dpBegin" onclick="dpBegin()">${dpIc('swords')}<span>Begin battle</span></button>`}
function dpFoeHTML(o){const F=FACT[o.f]||{n:'Foes',units:[]},L=DP.foes,por=id=>id&&typeof portraitHTML==='function'?portraitHTML(id,32):`<span class="dp-unk">?</span>`;
 if(L){const tot=L.reduce((a,x)=>a+x.n,0);
  return`<div class="dp-sec"><span>They field</span><i>${tot} foe${tot===1?'':'s'}</i></div><div class="dp-foes">${L.map(x=>`<span class="dp-en" title="${x.id?EN[x.id].n:'Unknown'}">${por(x.id)}<b>×${x.n}</b><small>${x.id?EN[x.id].n:'Unseen'}</small></span>`).join('')}</div>`}
 const fx=(o.fixed||[]).filter(id=>EN[id]),ids=fx.concat(F.units.map(u=>u[0]).filter(id=>EN[id]&&!fx.includes(id)));
 return`<div class="dp-sec"><span>Scouts report</span><i>${dpStrength(o)}</i></div><div class="dp-foes">${ids.map(id=>`<span class="dp-en${fx.includes(id)?' sure':''}" title="${EN[id].n}">${por(id)}<b>${fx.includes(id)?'×1':'?'}</b><small>${EN[id].n}</small></span>`).join('')}</div>`}
function dpLandHTML(bk,tod){const P=BIO[bk],wx=G.weather&&typeof WTHR!=='undefined'&&WTHR[G.weather.kind]&&!DPREALMSKY[bk]?WTHR[G.weather.kind].n:'',todN=({dawn:'Dawn',day:'Day',dusk:'Dusk',night:'Night'})[tod]||'Day';
 const mu=DP.pv?dpMapURL(bk,DP.pv.tiles):'',ms=(DP.big?4:2);
 return`<div class="dp-pic" id="dpPic"><div class="dp-cap"><b>${P.n}</b><span>${DPREALMSKY[bk]?'Beyond the rift':todN+(wx?' · '+wx:'')}</span></div>${mu?`<div class="dp-map" role="img" aria-label="The battlefield from above: the enemy holds the top edge, the company the bottom"><img src="${mu}" width="${(BW*3+4)*ms}" height="${(BH*3+2)*ms}" alt="" draggable="false"><span>The field</span></div>`:''}</div><div class="dp-traits">${dpTraits(bk).map(t=>`<span title="${t[1]}">${t[0]}</span>`).join('')}</div>`}
function dpZoneHTML(){const rows=dpRows(),sz=DP.big?64:32,n=rows.length,hh=(i,c)=>{const h=dpTileH(i,c);return h?`<i class="dp-h h${h}" title="High ground, level ${h}"></i>`:''};
 const row=i=>{let h=`<div class="dp-row${i===n-1&&n>1?' back':''}">`;for(let c=0;c<BW;c++){const m=dpAt(i,c);
   h+=`<div class="dp-cell${DP.pick!=null?' can':''}" data-cell="${i}:${c}" role="button" tabindex="0" aria-label="${i===0?'Front':i===n-1?'Back':'Middle'} row, tile ${c+1}${dpTileH(i,c)?', height '+dpTileH(i,c):''}${m?', '+m.name:''}" onclick="dpCell(${i},${c})">${m?dpTok(m,sz):''}${hh(i,c)}</div>`}return h+'</div>'};
 let h=`<div class="dp-foebar">${dpIc('skull')}<span>The enemy comes from here</span></div><div class="dp-rows" id="dpRows" style="--dpn:${BW}">`;
 for(let i=0;i<n;i++)h+=`<span class="dp-lab">${i===0?'Front':i===n-1?'Back':'Mid'}</span>${row(i)}`;return h+'</div>'}
function dpBotHTML(){const p=DP.pick!=null?dpMerc(DP.pick):null,res=dpReserves(),nf=dpFielded().length;let info;
 if(p){const s=calc(p),on=!!DP.at[p.id],hp=Math.min(p.hp,s.hp),inj=typeof cpInj==='function'?cpInj(p):[];
  info=`${portraitHTML(p,32)}<p><b>${p.name}</b> <span class="dp-dim">Lv ${p.lvl} ${coRole(p,s).toLowerCase()}</span><small>${dpIc('hp')}${hp}/${s.hp} ${dpIc('armor')}${s.arm}${inj.length?' '+dpIc('injury')+inj.map(j=>j.n).join(', '):''} · ${on?'tap a tile, or a comrade to trade places':'tap a tile to field'}</small></p>
${on?`<button type="button" class="pxb sm" onclick="dpBench(${p.id})">To reserve</button>`:`<button type="button" class="pxb sm pri" onclick="dpField(${p.id})">Field</button>`}`}
 else info=`<p><b>Set the line</b> <span class="dp-dim">${nf}/${Math.min(MAXFIELD,G.roster.length)}</span><small>Drag a sword to a tile, or tap one and then its place.${DP.pv?' Notches mark higher ground.':''}</small></p>
<button type="button" class="pxb sm" id="dpReset" ${dpChanged()?'':'disabled'} onclick="dpReset()">Reset</button><button type="button" class="pxb sm" id="dpSwap" onclick="dpSwapRows()">Swap rows</button>`;
 return`<div class="dp-info">${info}</div><div class="dp-res" data-bench="1" aria-label="Reserves"><span>${dpIc('reserve')}Reserves</span>${res.length?res.map(m=>`<span class="dp-bt">${dpTok(m,32)}</span>`).join(''):'<em>None. Drag a sword here to hold it back.</em>'}</div>`}
function dpRender(all){const r=DP.root,o=DP.o;if(!r||!o)return;const big=innerWidth>=1100&&innerHeight>=600;if(big!==DP.big){DP.big=big;all=true}
 const bk=dpBiome(o),tod=dpTod(),rw=$('dpRows');if(rw&&rw.scrollWidth>rw.clientWidth+1)DP.sx=rw.scrollLeft;
 r.dataset.tod=tod;r.classList.toggle('ask',DP.ask);
 $('dpHead').innerHTML=dpHeadHTML(o,bk,tod);
 if(all){$('dpFoe').innerHTML=dpFoeHTML(o);$('dpLand').innerHTML=dpLandHTML(bk,tod);try{dpVignette($('dpPic'),bk,tod,o.f)}catch(e){}}
 $('dpZone').innerHTML=dpZoneHTML();$('dpBot').innerHTML=dpBotHTML();
 const e=$('dpRows');if(e&&e.scrollWidth>e.clientWidth+1){e.scrollLeft=DP.sx!=null?DP.sx:(e.scrollWidth-e.clientWidth)/2;e.addEventListener('scroll',()=>{DP.sx=e.scrollLeft},{passive:true})}}
/* pointer drag (mouse, pen, touch). A press that does not travel is a tap. */
function dpDragEnd(){const d=DP.drag,r=DP.root;DP.drag=null;if(!d)return;if(d.ghost&&d.ghost.parentNode)d.ghost.parentNode.removeChild(d.ghost);if(d.el)d.el.classList.remove('drag');
 if(r){r.querySelectorAll('.hot').forEach(e=>e.classList.remove('hot'));try{r.releasePointerCapture(d.id)}catch(e){}}}
function dpBind(root){if(DP.bound||!root||typeof root.addEventListener!=='function'||!document.elementFromPoint)return;DP.bound=true;
 const at=(x,y)=>{const e=document.elementFromPoint(x,y);return e&&e.closest?e.closest('#dp [data-cell],#dp [data-bench]'):null},
  hot=t=>{root.querySelectorAll('.hot').forEach(e=>e.classList.remove('hot'));if(t)t.classList.add('hot')};
 root.addEventListener('pointerdown',e=>{if(!DP.o||DP.drag||(e.button!=null&&e.button>0))return;const t=e.target&&e.target.closest?e.target.closest('[data-dp]'):null;if(!t)return;
  DP.drag={m:+t.dataset.dp,x:e.clientX,y:e.clientY,on:false,el:t,id:e.pointerId,ghost:null};try{root.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
 root.addEventListener('pointermove',e=>{const d=DP.drag;if(!d||e.pointerId!==d.id)return;
  if(!d.on){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<7)return;const m=dpMerc(d.m);if(!m){dpDragEnd();return}d.on=true;d.el.classList.add('drag');const g=document.createElement('div');g.id='dpGhost';g.innerHTML=portraitHTML(m,64,'bare');root.appendChild(g);d.ghost=g}
  d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';hot(at(e.clientX,e.clientY));e.preventDefault()});
 root.addEventListener('pointerup',e=>{const d=DP.drag;if(!d||e.pointerId!==d.id)return;const t=d.on?at(e.clientX,e.clientY):null,m=d.m,on=d.on;dpDragEnd();
  // the grid is redrawn a moment later: a touch whose target leaves the document mid-gesture can swallow the next tap
  const act=()=>{if(!DP.o)return;if(!on){dpTap(m);return}if(!t)return;if(t.dataset.bench){dpBench(m);return}const ic=t.dataset.cell.split(':');dpPlace(m,+ic[0],+ic[1])};
  if(e.pointerType==='touch')setTimeout(act,0);else act()});
 root.addEventListener('pointercancel',dpDragEnd)}
