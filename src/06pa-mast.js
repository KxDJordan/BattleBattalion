/* ================= PAINTED ICONS, PACKAGE A: masteries m-* (a medallion: ring by the tree's tone, dark field, emblem) =================
   Ring tone as the pixel set (icTreeTone): brass, steel (weapon trees, silver), verd (armor), hunt (red), gift colours. Fabled
   personal trees (m-fab.<id>) get a crimson field and their warrior's own emblem. */
(function(){const P=PAINT;const RING={brass:'brass',steel:'silver',verd:'verd',hunt:'blood',mana:'mana',aura:'aura',qi:'qi',chi:'chi'};
const ring=k=>{let t='brass';try{const T=MAST[k]||(IC_ARMT.includes(k)?{kind:'armor'}:null);t=icTreeTone(T)}catch(e){}return RING[t]||'brass'};
const PA_CRIM=['#1a0406','#3a0a10','#5a141c','#7a2430','#c06070'];
const M=(k,fn,s,field)=>P['m-'+k]=g=>paMedal(g,ring(k),field||'dark',fn,s);
/* emblems (32-unit drawings, scaled into the field) */
const eSword=(mat,hilt)=>g=>pkSword(g,10,22,45,{len:21,w:5,guard:12,grip:5,mat,hilt});
const eArrow=(head,fletch)=>g=>pkArrow(g,5,27,27,5,{w:2.8,head:9,mat:head,fletch:fletch||head});
const eFist=mat=>g=>{pkFill(g,pkS('M7 30 L7 21 C4 19 4 13 7 11 C7.5 6 11 5.5 12.5 7 C13 4 17 4 18 6.5 C19 4.5 23 4.5 23.5 7.5 C26 7 28 9 27.5 13 L27 21 C26 25 23 27 21 27.5 L21 30 Z'),mat,{k:1.6,inside:(g,m)=>{pkLine(g,'M12.5 7 L12.5 13 M18 6.5 L18 13 M23.5 7.5 L23.5 13',.9,m[0],.7);pkLine(g,'M7 11 Q10 15 14 14',.9,m[0],.7)}})};
const eArmor=(mat,inside)=>g=>pkFill(g,pkS('M8 4 L12 3 Q16 6 20 3 L24 4 L30 8.5 L28 15.5 L24.5 14 L24.5 29 L7.5 29 L7.5 14 L4 15.5 L2 8.5 Z'),mat,{k:1.8,inside});
/* generic trees */
M('bulwark',g=>pkShield(g,16,16,{kind:'heater',w:24,h:27,mat:'steel',rim:'silver',boss:4,bossMat:'gold'}));
M('marksman',eArrow('steel','cloth'));
M('skirmisher',g=>{pkFill(g,pkS('M11 3 L20 3 L20 17 L28 21 Q30.5 22.5 30.5 25 L30.5 29 L9 29 L9.5 17 Z'),'leather',{k:1.4,inside:(g,m)=>pkFill(g,pkRect(8,26,23,3,.6),'darkwood',{k:.2,lw:.8})});pkLine(g,'M1.5 10 L7 10 M1 16 L7 16 M2.5 22 L7 22',1.8,'#ffffff',.85)});
M('mana',g=>pkGem(g,16,16,13,'mana','long'));
M('aura',g=>P.aura(g),.7);
M('qi',g=>P.qi(g),.72);
M('chi',g=>P.chi(g),.72);
M('duelist',eSword('steel','brass'));
M('brute',g=>{pkHaft(g,16,30,16,4,3.2,'wood');for(const s of [-1,1])pkFill(g,pkS(`M${16+s*1.5} 6 Q${16+s*7} 6.5 ${16+s*13} 2 Q${16+s*10.5} 10 ${16+s*13} 18.5 Q${16+s*7} 14 ${16+s*1.5} 14.5 Z`),'steel',{k:1,inside:(g,m)=>pkLine(g,`M${16+s*12} 3.4 Q${16+s*9.6} 10 ${16+s*12} 17`,1.6,m[4],.5)});pkFill(g,pkRect(13.8,4.5,4.4,11,1),'iron',{k:.4})});
M('shieldbearer',g=>pkShield(g,16,16,{kind:'heater',w:24,h:27,mat:'bronze',rim:'brass',boss:4.4,bossMat:'gold'}));
M('tactician',g=>pkFlag(g,7,4,{w:20,h:13,mat:'cloth',pole:24}),.7);
M('survivor',g=>{pkFill(g,pkS(PK_HEART),'blood',{k:2,inside:(g,m)=>{pkHi(g,'M6 9.5 Q6.4 6.6 9.2 6.2',2.2,.8)}});pkLine(g,'M17 6.5 L14 13 L18 16.5 L14.5 22',1.4,PK.ink);pkLine(g,'M13 10 L18 11 M13.4 16.6 L18.6 17.6',1.2,PKM.bone[3])},.72);
M('medic',g=>{pkFill(g,pkS('M11.5 2 L20.5 2 L20.5 11.5 L30 11.5 L30 20.5 L20.5 20.5 L20.5 30 L11.5 30 L11.5 20.5 L2 20.5 L2 11.5 L11.5 11.5 Z'),'white',{k:1.2});pkFill(g,pkCirc(16,16,3.6),'blood',{ball:1,k:.5})},.64);
M('scout',g=>{pkFill(g,pkS('M1 16 C6 6 26 6 31 16 C26 26 6 26 1 16 Z'),'white',{k:1.2});pkFill(g,pkCirc(16,16,7),'dark',{ball:1,k:.6});pkPost(g=>pkGlint(g,13.4,13.4,2.4))});
M('berserker',g=>{for(const s of [-1,1])pkAt(g,16,16,s*40,1,g=>{pkHaft(g,0,14,0,-12,3,'wood');pkAt(g,0,-9,0,1,g=>pkFill(g,pkS(`M0 -4 Q${s*6} -4 ${s*10} -8 Q${s*8} 0 ${s*10} 8 Q${s*6} 4 0 4 Z`),'steel',{k:.8}))});pkDrop(g,16,30,9,'blood')});
M('sharpshooter',g=>{for(const [r,m] of [[14,'cloth'],[10,'white'],[6.4,'cloth'],[2.8,'white']])pkFill(g,pkCirc(16,16,r),m,{ball:1,k:r*.1,lw:PK.lw*.8})},.66);
M('brawler',eFist('skin'));
M('mana_m',eSword('mana','silver'));
M('mana_r',eArrow('mana','mana'));
M('aura_r',eArrow('aura','aura'));
M('qi_r',eArrow('qi','qi'));
M('chi_m',eFist('chi'));
M('chi_r',eArrow('chi','chi'));
M('weapons',eSword('steel','silver'));
M('lightarmor',eArmor('leather',(g,m)=>{pkLine(g,'M16 6 L16 29 M7.5 18 L24.5 18 M7.5 23.5 L24.5 23.5',.8,m[1],.8);for(const y of [9,13])pkFill(g,pkRect(15,y,2,2,.4),'brass',{lw:.5,k:.1})}));
M('medarmor',eArmor('steel',(g,m)=>{g.lineWidth=.55;for(let y=5;y<29;y+=2.4)for(let x=3+((y/2.4|0)&1)*1.2;x<29;x+=2.4){g.strokeStyle=m[0];g.globalAlpha=.6;g.beginPath();g.arc(x,y,.95,0,Math.PI*2);g.stroke()}g.globalAlpha=1}));
M('heavyarmor',eArmor('steel',(g,m)=>{pkLine(g,'M16 6 L16 29',1,m[1],.8);pkLine(g,'M7.6 14 Q16 18 24.4 14 M7.6 21 Q16 24 24.4 21',.8,m[1],.8);pkHi(g,'M10.5 8 Q11 15 13 21',1.5,.6);pkFill(g,pkRect(7.5,25.5,17,3,0),'brass',{k:.2,lw:.8})}));
M('hunter',g=>{for(const s of [-1,1])pkFill(g,pkTube(pkQ(16+s*7,9,16+s*15,8,16+s*13,1,8),[4,1],'round'),'bone',{k:.5});
 pkFill(g,pkS('M8 10 C8 5 24 5 24 10 C24 16 21 19 20 25 C19.4 29 12.6 29 12 25 C11 19 8 16 8 10 Z'),'bone',{k:1.4,inside:(g,m)=>pkLine(g,'M14 24 L14 27 M18 24 L18 27',.9,m[1],.9)});
 for(const x of [12.2,19.8])pkFill(g,pkEll(x,13,2.2,2.8),'dark',{lw:.5,noRim:1});pkFill(g,pkEll(16,20,1.4,2),'dark',{lw:.5,noRim:1})});
/* fabled personal trees: crimson field, the warrior's emblem */
const F=(k,fn,s)=>M('fab.'+k,fn,s||.66,PA_CRIM);
F('aldric',g=>pkHeaterCross(g,'white','gold'));                                           // Oath of the Vane
F('mirela',g=>{pkFill(g,pkTube(pkQ(16,30,15,18,16,6,8),[4,1.6],'flat'),'bone',{k:.6});for(const [x,y,a,s] of [[16,8,0,1.3],[15.6,14,-50,1.25],[16.4,14,50,1.25],[15.6,20,-60,1.1],[16.4,20,60,1.1]])paLeaf(g,x,y,a,s,'bone')});   // The Pale Wood
F('grimhild',g=>paAnvil(g,'iron'));   // The Anvil
F('korvak',g=>{pkFill(g,pkS('M6 29 C5 18 10 8 26 3 C20 9 16 17 15 29 Z'),'bone',{k:1.4,inside:(g,m)=>pkHi(g,'M8 25 Q10 14 20 7',1.2,.6)});pkFill(g,pkS('M6 29 L15 29 L15.4 24 L6.2 23 Z'),'blood',{k:.5})});   // Pit of Red Tusk
F('hakon',g=>{pkFill(g,pkS('M4 2 L12 9 L20 9 L28 2 L27 15 C27 21 22 24 19.5 29 L12.5 29 C10 24 5 21 5 15 Z'),'white',{k:1.6,inside:(g,m)=>{pkFill(g,pkS('M7 5 L10.5 9 L7.6 11 Z'),'stone',{lw:0,k:.1});pkFill(g,pkS('M25 5 L21.5 9 L24.4 11 Z'),'stone',{lw:0,k:.1});pkFill(g,pkEll(16,27,2.6,1.8),'dark',{lw:.5,noRim:1})}});
 for(const x of [11.5,20.5])pkFill(g,pkS(`M${x-2.6} 16 L${x+2.6} 15 L${x} 18 Z`),'aura',{lw:.6,k:.1})});   // The White Wolf
F('ulfgar',g=>{paCrown(g,'bone',null,{y0:1,y1:9,x0:7,ball:1.3});pkSkull(g,16,19,1.05,'bone')});   // The Bone Throne
F('kagemaru',g=>{const p=[];for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8,R=i&1?5:14;p.push(16+Math.sin(a)*R,16-Math.cos(a)*R)}pkFill(g,pkPoly(p),'steel',{k:1.2});pkFill(g,pkCirc(16,16,2.8),'dark',{lw:.8,noRim:1})});   // The Silent Way
F('tomoe',g=>{pkHaft(g,7,1.5,7,31,2.6,'darkwood');pkFill(g,pkRect(8.4,4,17,24,.6),'white',{k:1.2,inside:()=>pkFill(g,pkCirc(16.9,14.5,5),'cloth',{ball:1,k:.6,lw:PK.lw*.8})});pkFill(g,pkRect(5,2,22,2.6,1),'darkwood',{k:.3})});   // The Crane Banner
F('nobusada',g=>{for(const s of [-1,1])pkFill(g,pkTube(pkQ(16+s*6,8,16+s*13,6,16+s*12,0.5,8),[3.4,.6],'round'),'gold',{k:.5});
 pkFill(g,pkS('M5 12 C5 6 27 6 27 12 L26 21 C25 27 21 30 16 30 C11 30 7 27 6 21 Z'),'cloth',{k:1.6,inside:(g,m)=>{pkFill(g,pkS('M9 21 Q16 27 23 21 L21 24.5 Q16 27.5 11 24.5 Z'),'white',{lw:.7,k:.2});pkLine(g,'M8 11 L14 14 M24 11 L18 14',1.6,PK.ink)}});
 for(const x of [11.4,20.6])pkFill(g,pkEll(x,16,2,1.4),'aura',{lw:.7,k:.1})});   // The Demon General
F('jin',g=>{const LOT=['#3a0a24','#8a2c5c','#e07aa8','#f8b8d4','#ffffff'];for(const [a,s] of [[-60,.9],[60,.9],[-30,1],[30,1],[0,1.1]])pkAt(g,16,24,a,s,g=>pkFill(g,pkS('M0 0 C-5 -5 -5 -13 0 -18 C5 -13 5 -5 0 0 Z'),LOT,{k:1}));pkFill(g,pkEll(16,26,12,3),'chi',{k:.6})});   // The Iron Lotus
F('seraphine',g=>{pkGlow(g,12,18,11,'#c49eff',.5);pkFlame(g,12,29,22,'void');pkArrow(g,4,4,29,27,{w:2.2,head:7,mat:'silver',fletch:'white',shaft:'darkwood'})});   // The Witch-Bane
F('mattias',g=>{pkFill(g,pkS('M3 13 L25 9 L26 13.5 L14 16 L14.6 19 L11 20 L9.5 26.5 Q9 29 6 28.5 L3 27.5 Q2 27 3 24 L5.5 17 Z'),'wood',{k:1.2,inside:(g,m)=>pkFill(g,pkS('M10 10.8 L25 9 L26 13.5 L10.6 15.8 Z'),'steel',{k:.4,lw:.8})});pkFill(g,pkS('M27 6 C30 4.5 31 8 29 9.5 C31 11 30 14 27.5 13 Z'),'white',{k:.4,lw:.7})});   // The Gunsmoke Saint
F('ysolde',g=>{pkGlow(g,18,14,10,'#c49eff',.5);pkAt(g,11,22,45,1,g=>{pkGrip(g,{len:5,w:2.8});pkAt(g,0,6.3,0,1,g=>pkPommel(g,{r:2.2}));pkFill(g,pkS('M-2.5 0 L-2.5 -9 L-.6 -10.6 L.8 -8.8 L2.5 -10.4 L2.5 0 Z'),'steel',{k:1});pkGuard(g,{w:11,h:2.8,mat:'silver'})});
 pkAt(g,23.6,8.4,45,1,g=>pkFill(g,pkS('M-2.5 4 L-1 2.2 L.6 3.6 L2.5 2.2 L2.5 -3 L0 -6.6 L-2.5 -3 Z'),'void',{k:.8}))});   // The Sundered Blade
F('brannoc',g=>{pkFill(g,pkS('M1 28 L12 7 L16 12 L20 6 L31 28 Z'),'stone',{k:1.6,inside:()=>pkFill(g,pkS('M8.6 14 L12 7 L16 12 L20 6 L24 13.4 L20.6 12 L17.4 15 L14 12.4 L11 15.6 Z'),'white',{k:.4,lw:.7})})});   // The Mountain
F('agathe',g=>{pkGlow(g,16,18,12,'#ffd27a',.6);pkFill(g,pkRect(12.5,2,7,3,1),'brass',{k:.3});pkLine(g,'M13 3 Q16 -1 19 3',1.2,PK.ink);pkFill(g,pkS('M9 8 L23 8 L21 6 L11 6 Z'),'brass',{k:.3});
 pkFill(g,pkRect(9.5,8,13,17,1.4),'brass',{k:1,inside:()=>{pkFill(g,pkRect(11.5,10,9,13,.6),'holy',{ball:1,lw:.8,k:.4});pkFlame(g,16,21.5,10,'fire')}});pkFill(g,pkRect(8,25,16,3.4,1),'brass',{k:.4})});   // The Lantern of Saint Vey
F('yuki',g=>{for(const [x0,y0,x1,y1] of [[6,28,14,3],[5,27,27,6],[4,26,29,18]])pkArrow(g,x0,y0,x1,y1,{w:2.4,head:7.5,mat:'frost',fletch:'white'})});   // A Hundred Arrows
})();
