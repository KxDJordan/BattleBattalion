/* ================= PIXEL FRAMES AND CONTROLS (art) =================
   9-slice frame sprites in PAL keys, rendered once at boot to data URLs and published as CSS custom properties on
   :root; style.css consumes them with border-image. Every sprite is rendered at FRAME_K image px per art pixel and
   shown at 2 CSS px per art pixel, so the slice numbers in style.css are constants (art px * 6) and the edges land on
   whole device pixels at devicePixelRatio 1, 2 and 3. Before this runs (or without a canvas) the flat fallbacks in
   style.css apply; :root gets .px-ready once the images exist. */
const FRAME_K=6;
function _btn(H,F,S,L){return['.000.','0'+H+H+H+'0','0'+H+F+S+'0','0'+L+L+L+'0','0'+L+L+L+'0','.000.']}
function _btnDown(F,S){return['.....','.000.','0'+S+S+S+'0','0'+S+F+F+'0','0'+F+F+F+'0','.000.']}
function _tag(l,f){return['.'+l+l+l+'.',l+f+f+f+l,l+f+f+f+l,l+f+f+f+l,'.'+l+l+l+'.']}
const FRAMES={
 /* panel: outline, brass line (lit top/left), dark inner line, panel fill. slice 3 */
 pxf:['.00000.','0eccce0','0c111b0','0c121b0','0c111b0','0ebbbe0','.00000.'],
 /* recessed well: dark top/left, lit bottom/right. slice 2 */
 'pxf-inset':['00004','01114','01114','01114','04444'],
 /* emphasized: double brass line, raised fill. slice 4 */
 'pxf-gold':['.0000000.','0edddddd0','0dcccccb0','0dc000cb0','0dc030cb0','0dc000cb0','0dcccccb0','0dbbbbbb0','.0000000.'],
 /* dialog: the gold frame around the plain panel fill. slice 4 */
 'pxf-dlg':['.0000000.','0edddddd0','0dcccccb0','0dc000cb0','0dc020cb0','0dc000cb0','0dcccccb0','0dbbbbbb0','.0000000.'],
 /* buttons: slice 2 2 3 2 (up) / 3 2 2 2 (down) */
 pxb:_btn('4','3','2','1'),'pxb-down':_btnDown('2','1'),
 'pxb-pri':_btn('6','5','7','7'),'pxb-pri-down':_btnDown('7','3'),
 'pxb-warn':_btn('g','f','f','a'),'pxb-warn-down':_btnDown('f','a'),
 'pxb-on':_btn('e','c','b','a'),'pxb-on-down':_btnDown('b','a'),
 'pxb-dis':['.000.','02220','02220','02220','01110','.000.'],
 /* chips. slice 2 */
 pxtag:_tag('4','1'),'pxtag-gold':_tag('c','a'),'pxtag-good':_tag('5','2'),'pxtag-bad':_tag('g','f'),
 /* tooltip. slice 3 */
 pxtip:['.00000.','0bbbbb0','0b000b0','0b000b0','0b000b0','0bbbbb0','.00000.'],
 /* meter segment divider: tiles every 4 art px (8 CSS px) */
 'pxbar-seg':['...0'],
 /* tab (open at the bottom). slice 2 2 1 2 */
 pxtab:['.000.','04440','04320','04320'],'pxtab-on':['.000.','0eee0','0ecb0','0ecb0']
};
/* rotate-your-device illustration, 30x20 */
const _ROT=(function(){const W=30,H=20,g=[];for(let y=0;y<H;y++)g.push(new Array(W).fill('.'));
 const box=(x,y,w,h,l,f,hi)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++){const e=i===0||j===0||i===w-1||j===h-1,c=(i===0||i===w-1)&&(j===0||j===h-1);if(c)continue;g[y+j][x+i]=e?((hi&&(i===0||j===0))?hi:l):f}};
 box(1,0,12,20,'4','1');box(5,17,4,1,'4','4');                                   // portrait phone, dim
 box(9,8,21,12,'b','2','d');box(11,10,15,8,'0','3');g[13][27]='c';g[14][27]='c';   // landscape phone, brass
 [[15,2],[16,1],[17,1],[18,1],[19,1],[20,2],[21,2],[22,3],[23,4],[23,5]].forEach(p=>{g[p[1]][p[0]]='d'});   // turn arrow
 [[21,5],[22,5],[24,5],[25,5],[22,6],[23,6],[24,6],[23,7]].forEach(p=>{g[p[1]][p[0]]='d'});
 return g.map(r=>r.join(''))})();
(function(){try{if(typeof document==='undefined'||!document.documentElement||!document.documentElement.style)return;const R=document.documentElement;let ok=true;const set=(k,rows,sc)=>{const u=pxURL('fr:'+k,rows,sc);if(typeof u!=='string'||u.slice(0,5)!=='data:'){ok=false;return}R.style.setProperty('--'+k,'url('+u+')')};
 for(const k in FRAMES)set(k,FRAMES[k],FRAME_K);set('px-rotate',_ROT,4);
 if(ok&&R.classList)R.classList.add('px-ready')}catch(e){}})();

/* ================= STYLE TEST (debug): call styleTest() from the console ================= */
function styleTest(){if(typeof document==='undefined')return;const app=document.getElementById('app');if(!app||!app.appendChild)return;
 let e=document.getElementById('styleTest');if(e){e.remove();return}
 const names=Object.keys(ICONS).filter(n=>n[0]!=='_'),esc2=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const grp=[['Stats',/^(hp|armor|fatigue|init|melee|ranged|mdef|rdef|ap|xp|level)$/],['Resources',/^(mana|aura|qi|chi)$/],['Statuses',/^(burn|chill|root|stun|buff|indom)$/],['Company',/^(coin|food|renown|day|swords)$/],
  ['Items',/^(sword|axe|mace|dagger|spear|bow|staff|fist|shield|armor-.*)$/],['Abilities',/^ab-/],['Masteries',/^m-/],['UI',/./]];
 const seen={},ic=n=>'<div class="st-ic">'+pxIcon(n,16)+pxIcon(n,32)+pxIcon(n,48)+'<small>'+esc2(n)+'</small></div>';
 let icons='';for(const g of grp){const l=names.filter(n=>!seen[n]&&g[1].test(n));l.forEach(n=>seen[n]=1);icons+='<h3>'+g[0]+' ('+l.length+')</h3><div class="st-grid">'+l.map(ic).join('')+'</div>'}
 icons+='<h3>Unknown name</h3><div class="st-grid">'+ic('no-such-icon')+'</div>';
 const pal=Object.keys(PAL).map(k=>'<span class="st-sw" style="background:'+PAL[k]+'"><b>'+k+'</b></span>').join('');
 const btn=(c,l)=>'<div class="st-col"><button class="pxb '+c+'">'+l+'</button><button class="pxb '+c+' on">On</button><button class="pxb '+c+'" disabled>Disabled</button><small>.pxb'+(c?'.'+c.split(' ').join('.'):'')+'</small></div>';
 const bar=(n,c)=>'<div class="pxbar" style="--mc:'+c+'"><i style="width:'+n+'%"></i></div>';
 e=document.createElement('div');e.id='styleTest';
 e.innerHTML='<div class="row sp"><h2>Style test</h2><button class="pxb sm" onclick="styleTest()">'+pxIcon('close',16)+' Close</button></div>'
 +'<h3>Frames</h3><div class="row st-fr"><div class="pxf">.pxf<br><span class="dim">panel frame</span></div><div class="pxf inset">.pxf.inset<br><span class="dim">recessed well</span></div><div class="pxf gold">.pxf.gold<br><span class="dim">emphasized</span></div><div class="pxtip">.pxtip tooltip box</div>'
 +'<div class="pxf" style="width:44px;height:44px;padding:0"></div><div class="pxf gold" style="width:200px"><div class="pxf inset">nested well</div></div></div>'
 +'<h3>Buttons</h3><div class="row st-fr">'+btn('','Default')+btn('pri','Primary')+btn('warn','Warn')+btn('sm','Small')
 +'<div class="st-col"><span class="row"><button class="pxb icon" aria-label="menu">'+pxIcon('menu',32)+'</button><button class="pxb icon on" aria-label="fast">'+pxIcon('fast',32)+'</button><button class="pxb icon pri" aria-label="end">'+pxIcon('endturn',32)+'</button><button class="pxb icon warn" aria-label="retreat">'+pxIcon('retreat',32)+'</button><button class="pxb icon" disabled aria-label="lock">'+pxIcon('lock',32)+'</button><button class="pxb sm icon" aria-label="close">'+pxIcon('close',16)+'</button></span><small>.pxb.icon / .sm.icon</small></div>'
 +'<div class="st-col"><button>Plain button</button><button class="pri">pri</button><button class="warn">warn</button><button class="sm ghost">sm ghost</button><small>base button</small></div></div>'
 +'<h3>Meters, tags</h3><div class="row st-fr"><div class="st-col" style="width:220px;align-items:stretch">'+bar(100,'#c4493f')+bar(62,'#62a6ee')+bar(35,'#ecc64f')+bar(8,'#3fd0b6')+bar(0,'#9bd96f')+'<div class="pxbar" style="height:8px"><i style="width:50%"></i></div><small>.pxbar &gt; i, --mc</small></div>'
 +'<div class="st-col"><span><span class="pxtag">.pxtag</span> <span class="pxtag gold">gold</span> <span class="pxtag good">good</span> <span class="pxtag bad">bad</span> <span class="pxtag">'+pxIcon('coin',16)+' 120</span></span>'
 +'<span><span class="chip">.chip</span> <span class="chip">Day 12</span> <span class="st" style="--sc:#ef8a78">.st</span></span><div class="bar" style="width:160px"><i style="width:60%"></i></div><small>legacy .chip .st .bar</small></div></div>'
 +'<h3>Sheet classes</h3><div class="card">.card<div class="stats"><div><b>62</b>HP</div><div><b>55</b>Melee</div><div><b>12</b>Def</div><div><b>110</b>Init</div></div><div class="perk got"><i class="pip"></i><span class="pn">.perk.got</span></div><div class="perk no"><i class="pip"></i><span class="pn">.perk.no</span></div></div>'
 +'<div class="card lv">.card.lv <span class="coin">.coin</span> <span class="good">.good</span> <span class="bad">.bad</span> <span class="dim">.dim</span></div>'
 +'<div class="tabs"><button class="on">Tab on</button><button>Tab</button><button>Tab</button></div><div class="grid3"><div class="pick">.pick</div><div class="pick on">.pick.on</div><div class="pick">.pick</div></div>'
 +'<h3>Type</h3><h1>Heading one</h1><h2>Heading two</h2><h3>Heading three</h3><p class="pxh">.pxh pixel heading helper</p><p>Numbers <span class="pxn">0123456789 +12 -7 55%</span> (.pxn)</p>'
 +'<p>Body text stays Alegreya Sans for readability: the company marched at dawn, four swords and a banner nobody had heard of.</p><p class="dim">Dim body text for secondary notes.</p>'
 +'<h3>Palette</h3><div class="st-pal">'+pal+'</div><h3>Icons at 16 / 32 / 48 ('+names.length+')</h3>'+icons;
 app.appendChild(e)}
