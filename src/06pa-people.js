/* ================= PAINTED ICONS, PACKAGE A: followers (portraits in a badge) and traits (glyph in a good / bad badge) ================= */
(function(){const P=PAINT;
/* ---- follower parts ---- */
const hairCap=(m,d)=>g=>pkFill(g,pkS(d||'M9.8 14 C9.2 6.4 12.6 5.6 16 5.6 C19.4 5.6 22.8 6.4 22.2 14 C21.4 10.6 19.4 9.4 16 9.4 C12.6 9.4 10.6 10.6 9.8 14 Z'),m,{k:.6,lw:PK.lw*.9});
const beard=(m,d)=>g=>pkFill(g,pkS(d||'M10.2 13.6 C10.2 20.4 13 22.8 16 22.8 C19 22.8 21.8 20.4 21.8 13.6 C20.8 16.4 19 17 16 17 C13 17 11.2 16.4 10.2 13.6 Z'),m,{k:.6,lw:PK.lw*.9,inside:(g,mm)=>pkFill(g,pkEll(16,17.4,2,.9),'skin',{lw:0,noRim:1,noShade:1})});
const tache=m=>g=>pkFill(g,pkS('M11.6 17.6 Q14 15.6 16 16.6 Q18 15.6 20.4 17.6 Q18 17.6 16 18 Q14 17.6 11.6 17.6 Z'),m,{k:.3,lw:PK.lw*.7});
const bald=g=>pkHi(g,'M12.2 8.6 Q14 7.2 16.4 7.2',1.2,.6);
const helm=(m,plume)=>g=>{if(plume)pkFill(g,pkS('M16 6 C15 2.5 17 .8 20 1 C18.5 2.2 19 4 20.2 5.4 Z'),plume,{k:.4,lw:PK.lw*.8});
 pkFill(g,pkS('M9.4 13.2 C9.4 7.6 12.4 5.2 16 5.2 C19.6 5.2 22.6 7.6 22.6 13.2 Z'),m,{k:.8,lw:PK.lw*.9,inside:(g,mm)=>{pkFill(g,pkRect(9,11.4,14,2,.6),m,{k:.2,lw:.7});pkHi(g,'M11.6 10 Q12.6 7.4 15 6.8',1,.6)}});pkFill(g,pkRect(15.1,12.6,1.8,4.6,.6),m,{k:.2,lw:.8})};
const tool=(fn)=>g=>pkAt(g,25,24.5,0,1,fn);
const coatV=(m)=>(g,mm)=>{pkFill(g,pkS('M13 21.4 L16 25 L19 21.4 Z'),m||'white',{lw:PK.lw*.8,k:.3});pkLine(g,'M16 25 L16 31',.7,mm[1],.8)};
P['fol-scout']=paFol({body:'green',back:g=>pkFill(g,pkS('M8 22 C7.4 10 10 4 16 4 C22 4 24.6 10 24 22 Z'),'green',{k:1}),hat:g=>pkFill(g,pkS('M9.6 13.6 C9.4 6.8 12.6 5 16 5 C19.4 5 22.6 6.8 22.4 13.6 C21 10 19 8.8 16 8.8 C13 8.8 11 10 9.6 13.6 Z'),'green',{k:.6,lw:PK.lw*.9}),
 tool:tool(g=>{pkAt(g,0,0,40,1,g=>{pkGrip(g,{len:3.6,w:2});pkBlade(g,{len:8,w:2.8,mat:'steel',fuller:false});pkGuard(g,{w:5,h:1.6})})})});
P['fol-quarter']=paFol({body:'leather',hair:hairCap('leather'),beard:beard('meat'),tool:tool(g=>{pkFill(g,pkS('M-3 -2 C-6 0 -6.5 5 -2 5.5 L2.5 5.5 C6.5 5 6 0 3 -2 Z'),'leather',{k:.6});pkFill(g,pkRect(-2.6,-3.6,5.2,2,.8),'gold',{k:.2,lw:.7})})});
P['fol-cook']=paFol({body:'white',chest:coatV('white'),hat:g=>pkFill(g,pkS('M10.4 10.4 L10.4 6 C8 5 8.4 1 11.4 1.6 C12 -.6 15 -1 16 .8 C17 -1 20 -.6 20.6 1.6 C23.6 1 24 5 21.6 6 L21.6 10.4 Z'),'white',{k:.7,inside:(g,m)=>pkLine(g,'M10.4 8 L21.6 8',.6,m[1],.8)}),
 tool:tool(g=>{pkFill(g,pkTube([-1,6,3,-6],1.6,'round'),'silver',{k:.2});pkFill(g,pkEll(-1.6,6.4,3,2.2,-20),'silver',{k:.4})})});
P['fol-carto']=paFol({body:'blue',hair:hairCap('wood'),hat:g=>{pkFill(g,pkEll(16,9,10,2.4),'leather',{k:.4});pkFill(g,pkS('M11 9 C11 3.6 13 2.6 16 2.6 C19 2.6 21 3.6 21 9 Z'),'leather',{k:.6,inside:(g,m)=>pkFill(g,pkRect(11,7,10,1.6,0),'darkwood',{lw:0,k:.1})})},
 tool:tool(g=>{pkFill(g,pkRect(-5.5,-2.4,10,4.8,1),'vellum',{k:.4});pkFill(g,pkCirc(4.6,0,2.4),'vellum',{k:.3,lw:.8});pkLine(g,'M-3.5 0 L1.5 0',.7,PKM.blood[2])})});
P['fol-recruiter']=paFol({body:'purple',hair:hairCap('wood'),hat:g=>{pkFill(g,pkS('M20 7 C22 3 24.5 1.5 27 .5 C25.5 3 24 5.5 21.6 8.4 Z'),'white',{k:.3,lw:PK.lw*.8});pkFill(g,pkS('M9.6 10.6 C9.6 5 13 4 16 4 C19 4 22.4 5 22.4 10.6 Z'),'cloth',{k:.6})},
 tool:tool(g=>{pkFill(g,pkS('M-3 6 C-1 2 1.5 -2 4.5 -6 C4.6 -2.6 3 1 -.6 4 Z'),'white',{k:.3,lw:PK.lw*.8});pkLine(g,'M-3 6 L-4 7.4',1,PK.ink)})});
P['fol-surgeon']=paFol({body:'dark',chest:(g,m)=>pkFill(g,pkRect(12,22,8,11,1),'white',{k:.5,lw:PK.lw*.8}),hair:bald,
 tool:tool(g=>{pkFill(g,pkS('M-5.6 4 L3 -4.6 L5 -2.6 L-3.6 6 Z'),'steel',{k:.3,inside:(g,m)=>{for(let i=0;i<4;i++)pkLine(g,`M${-4+i*2} ${4.6-i*2} L${-3.2+i*2} ${5.4-i*2}`,.5,PK.ink,.8)}});pkFill(g,pkRect(2.6,-7,4,4,.8),'wood',{k:.2,lw:.8})})});
P['fol-armorer']=paFol({body:'leather',hair:bald,beard:beard('dark'),
 tool:tool(g=>{pkHaft(g,-2,6,1.5,-3,1.8,'wood');pkAt(g,1.6,-3.4,20,1,g=>pkFill(g,pkRect(-3.8,-2,7.6,3.6,.8),'iron',{k:.4}))})});
P['fol-drill']=paFol({body:'cloth',hat:helm('steel','cloth'),beard:tache('stone'),
 tool:tool(g=>pkAt(g,0,1,0,1,g=>{pkGrip(g,{len:4,w:2});pkAt(g,0,5,0,1,g=>pkPommel(g,{r:1.4}));pkBlade(g,{len:7,w:2.6,fuller:false});pkGuard(g,{w:6,h:1.6})}))});
P['fol-herbalist']=paFol({body:'green',back:g=>pkFill(g,pkS('M9.6 13 C9 6 12 5 16 5 C20 5 23 6 22.4 13 L23 24 L9 24 Z'),'wood',{k:.8}),hair:hairCap('wood'),beard:beard('stone'),
 tool:tool(g=>{pkLine(g,'M-1 6 Q0 0 2 -5',1.2,PKM.green[1]);for(const [x,y,a] of [[0,1,-40],[1,-2,40],[1.6,-4.6,-20]])paLeaf(g,x,y,a,.7,'chi')})});
P['fol-paymaster']=paFol({body:'gold',chest:coatV('white'),hair:hairCap('dark'),hat:g=>{pkFill(g,pkEll(16,9,8.6,1.8),'dark',{k:.3});pkFill(g,pkRect(11.2,1.6,9.6,7.6,1),'dark',{k:.5,inside:()=>pkFill(g,pkRect(11.2,6,9.6,1.8,0),'cloth',{lw:0,k:.2})})},
 tool:tool(g=>pkCoin(g,0,1,4.2,'gold'))});
P['fol-banner']=paFol({body:'cloth',hat:helm('iron'),beard:tache('stone'),
 tool:g=>{pkHaft(g,24.5,30,24.5,12,1.8,'wood');pkFill(g,pkS('M25.4 12 L31 12.6 L31 19.6 L28.2 18 L25.4 19.6 Z'),'cloth',{k:.4,lw:PK.lw*.8,inside:()=>pkFill(g,pkCirc(28.2,15.2,1.2),'gold',{lw:0,k:.1})})}});
/* ---- traits ---- */
const T=(k,fn,s)=>P['trait-'+k]=paTrait(k,fn,s);
T('hardhead',g=>paAnvil(g,'iron'));
T('glassjaw',g=>{pkFill(g,pkS('M13 2.5 L24 8 L27 20 L18 29.5 L7 24 L5 11 Z'),'frost',{k:1.4,inside:(g,m)=>{g.fillStyle=m[4];g.globalAlpha=.45;g.fill(new Path2D('M13 2.5 L5 11 L12 13 Z'));g.globalAlpha=1}});pkLine(g,'M14 6 L12.5 13 L17 16 L14 22 L17 27',1.5,PK.ink);pkPost(g=>pkGlint(g,10,9,2.4))});
T('athletic',g=>{pkFill(g,pkS('M8 4 L17 4 L17 18 L27 22 Q29.5 23 29.5 26 L29.5 29 L6 29 L6.5 18 Z'),'leather',{k:1.4,inside:(g,m)=>{pkFill(g,pkRect(5,26,25,3,.6),'darkwood',{k:.2,lw:.8});pkLine(g,'M9 8 L15 8',.8,m[1],.8)}});
 pkFill(g,pkS('M16 8 C20 4 25 2.5 30 3 C27 5 25.5 6.5 25 8 C27.5 7.5 29 8.4 29.5 9 C26 10 22 11.5 17 13 Z'),'white',{k:.5,inside:(g,m)=>pkLine(g,'M18.4 10.5 L26 5.6 M18.6 12 L27 9',.6,m[1],.8)})});
T('asthmatic',g=>{pkFill(g,pkTube([16,2,16,13],3.2,'round'),'bone',{k:.3});pkLine(g,'M16 12 L11 15.5 M16 12 L21 15.5',2.4,PK.ink);
 for(const s of [-1,1])pkFill(g,pkS(`M${16-s*2.5} 15 C${16-s*4} 10 ${16-s*13} 8 ${16-s*14} 18 C${16-s*14.5} 26 ${16-s*10} 30 ${16-s*4} 28 C${16-s*2} 27 ${16-s*2} 20 ${16-s*2.5} 15 Z`),'cloth',{k:1.4})});
T('quick',g=>{pkFill(g,pkS('M19 1.5 L6 18 L14 18 L10 30.5 L26 12 L17.5 12 L23 1.5 Z'),'gold',{k:1.2});pkPost(g=>pkGlint(g,12,14,2))});
T('sluggish',g=>{pkFill(g,pkS('M1.5 28 C3 24 6 23 9 23 L24 23 C27 23 28 20 29 16 C30 14 31.5 15 31 17.5 L30.5 24 C30 27.5 27 29.5 23 29.5 L3 29.5 Z'),'bone',{k:.8});
 pkLine(g,'M28 15.5 L27 10.5 M30.5 16 L31 11',1,PK.ink);pkFill(g,pkCirc(15,15,10),'leather',{ball:1,k:1.2});pkSwirl(g,15,15,7,'wood',1.4)});
T('eagle',g=>{pkFill(g,pkS('M1.5 16 C6 6 26 6 30.5 16 C26 26 6 26 1.5 16 Z'),'vellum',{k:1.2});pkFill(g,pkCirc(16,16,7),'gold',{ball:1,k:.8});pkFill(g,pkCirc(16,16,3.2),'dark',{lw:0,noRim:1});pkPost(g=>pkGlint(g,13.6,13.4,2.2))});
T('nearsight',g=>{pkLine(g,'M3 13 L1 9 M29 13 L31 9',1.6,PK.ink);pkLine(g,'M13 15 Q16 12.5 19 15',2.2,PKM.brass[1]);for(const x of [8.5,23.5]){const R=new Path2D();R.arc(x,16,7,0,Math.PI*2);R.arc(x,16,5,0,Math.PI*2,true);pkFill(g,{p:R,b:[x-7,9,x+7,23]},'brass',{k:.5,rule:'evenodd'});
  pkFill(g,pkCirc(x,16,5),'frost',{ball:1,k:.6,lw:PK.lw*.6});pkHi(g,`M${x-3} ${14.6} Q${x-2.4} 12 ${x} 11.6`,1,.8)}});
T('tough',g=>{pkFill(g,pkS('M4 27 L2.5 17 L8 8 L17 4 L26 8 L30 18 L27.5 27 Z'),'stone',{k:1.8,inside:(g,m)=>{pkLine(g,'M8 8 L13 15 L17 4 M13 15 L22 17 L26 8 M22 17 L27.5 27 M13 15 L9 27',.8,m[0],.5);pkHi(g,'M6 13 L9 9.6',1.4,.6)}})});
T('fragile',g=>{pkFill(g,pkEll(16,17,11,13.5),'bone',{ball:1,k:1.4});pkLine(g,'M6 14 L10 17 L13 13 L17 18 L20.5 13.5 L23.5 17 L26.5 14',1.4,PK.ink)});
T('hulking',g=>{pkFill(g,pkS('M1.5 29 L1.5 20 C1.5 17 3.5 16 6 16 C7 9.5 14 8.5 15.6 13.6 C15 11 13.6 8 15 5.5 C16.5 2.6 21.4 2.8 22.2 6 L23.6 12.6 C27.4 12.6 30.5 15.6 30 20.5 C29.5 26 23 29 17 29 Z'),'skin',{k:1.8,inside:(g,m)=>{pkLine(g,'M6 16.4 C9 18 13 18 15.6 14',.9,m[1],.85);pkLine(g,'M16 9 L21.6 8.4',.8,m[1],.8);pkHi(g,'M7.5 13.6 Q10 10.4 13.4 11.4',1.3,.6)}})});
T('tiny',g=>{pkFill(g,pkS('M4 29 C7 22 12 13 27 3 C27.5 10 24 17 17 21.5 C12 25 8 27 4 29 Z'),'white',{k:1.2,inside:(g,m)=>{pkLine(g,'M5 28 C11 21 17 14 25.5 5',.8,m[1],.9);pkLine(g,'M14 20.5 L18 17 M17.5 17 L22 12.5',.6,m[1],.6)}})});
T('dexterous',g=>{pkSword(g,8,24,45,{len:20,w:4.4,guard:9,grip:4.4,mat:'steel'});pkSword(g,24,24,-45,{len:20,w:4.4,guard:9,grip:4.4,mat:'steel'})});
T('clumsy',g=>{pkAt(g,17,11,200,1.25,g=>{pkGrip(g,{len:4.4,w:2.6});pkAt(g,0,5.6,0,1,g=>pkPommel(g,{r:1.8}));pkBlade(g,{len:15,w:4,fuller:false});pkGuard(g,{w:8,h:2})});pkLine(g,'M24 4 Q27.5 8 26.5 13 M28 2.5 Q31 7 30.5 11',1.4,'#ffffff',.8)});
T('steady',g=>{pkFill(g,pkS('M16 1.5 L19 13 L30.5 16 L19 19 L16 30.5 L13 19 L1.5 16 L13 13 Z'),'gold',{k:1.2});pkGem(g,16,16,3.6,'blood','round')});
T('bloodthirsty',g=>{pkFill(g,pkS('M4 4 C10 2 17 4 19 9 C21 15 17 23 9 28 C11 21 10 12 4 4 Z'),'bone',{k:1.4,inside:(g,m)=>pkHi(g,'M7 5.6 Q13 5.6 15.5 9',1,.6)});pkDrop(g,23,30,14,'blood')});
T('lucky',g=>pkAt(g,16,13.6,180,1.15,g=>{g.translate(-16,-16);const R=new Path2D();R.arc(16,13,11.5,Math.PI*.85,Math.PI*2.15);R.lineTo(16+Math.cos(Math.PI*.15)*6.5,13+Math.sin(Math.PI*.15)*6.5+6);R.arc(16,13,6.5,Math.PI*2.15,Math.PI*.85,true);R.closePath();
 pkFill(g,{p:R,b:[4.5,1.5,27.5,26]},'gold',{k:1,inside:(g,m)=>{for(let i=0;i<7;i++){const a=Math.PI*(.95+i*.185);g.fillStyle=m[0];g.fill(pkCirc(16+Math.cos(a)*9,13+Math.sin(a)*9,.8).p)}}})}));
T('drunkard',g=>P.tavern(g));
T('greedy',g=>{pkFill(g,pkS('M11 9 C5 13 3 18 3.5 22.5 C4 28 9 29.5 15.5 29.5 C22 29.5 27 28 27.5 22.5 C28 18 26 13 20 9 Z'),'gold',{k:1.8});pkFill(g,pkS('M11 9 L20 9 L22.5 3.5 Q15.5 5.5 8.5 3.5 Z'),'gold',{k:.5});pkFill(g,pkRect(10,7.8,11,2.4,1),'leather',{k:.3,lw:.8});
 pkLine(g,'M15.5 15 L15.5 26 M18.5 17 Q15 15.5 13 17.5 Q12.6 20 15.5 20.5 Q18.6 21 18.4 23.6 Q16.5 26 12.6 24',1.4,PKM.gold[0])});
T('loyal',g=>{const R=new Path2D();R.arc(16,19,10.5,0,Math.PI*2);R.arc(16,19,7,0,Math.PI*2,true);pkFill(g,{p:R,b:[5.5,8.5,26.5,29.5]},'gold',{k:1,rule:'evenodd'});pkFill(g,pkS('M11 9 L21 9 L18.5 12 L13.5 12 Z'),'gold',{k:.3});pkGem(g,16,5.6,4.6,'mana');pkPost(g=>pkGlint(g,9,15,1.8))});
T('superstitious',g=>{pkLine(g,'M10 2 Q16 8 22 2',1.4,PKM.leather[2]);pkFill(g,pkS('M12 7 L20 7 Q29 13 27 22 C25.5 29 6.5 29 5 22 Q3 13 12 7 Z'),'blue',{k:1.6});
 pkFill(g,pkEll(16,19,6,3.6),'white',{k:.4,lw:PK.lw*.8});pkFill(g,pkCirc(16,19,2.2),'dark',{lw:0,noRim:1});pkFill(g,pkRect(11,5.6,10,3,1),'brass',{k:.3,lw:.8})});
T('beastwise',g=>paPaw(g,16,17,1.15,'leather'));
T('nightowl',g=>{pkFill(g,pkS('M18 2.5 C10 3 4 9.5 4 17 C4 25 10.5 30 18 30 C24 30 28.5 26.6 30 22 C27.6 24 25 25 22 25 C15.5 25 11 20 11 14 C11 8.5 14 4.4 18 2.5 Z'),'gold',{k:1.4});pkSparkle(g,23,11,5.5,'white');pkPost(g=>pkGlint(g,8,12,1.6))});
T('cocky',g=>{pkFill(g,pkTube([16,30,16,18],3.4,'round'),'wood',{k:.5});pkFill(g,pkEll(16,11,9,10),'gold',{k:1,ball:1});pkFill(g,pkEll(16,11,6.6,7.6),'frost',{ball:1,k:.8,lw:PK.lw*.8});pkHi(g,'M12 9 Q12.5 6 15 5.2',1.4,.85)});
})();
