/* ================= PAINTED ICONS, package C (3): item specs, famed / legendary frames, registration (see 06pc-items.js) ================= */
const PKC_F={sw:pkcSword,ax:pkcAxe,mc:pkcMace,hm:pkcHammer,sp:pkcSpear,pl:pkcPole,st:pkcStaff,bw:pkcBow,xb:pkcXbow,gn:pkcGun,ps:pkcPistol,sh:pkcShieldI,ar:pkcArmor,hl:pkcHelm,fn:(g,o)=>o.fn(g,o)};
const PKC_KAT={f:'sw',len:21,w:4,grip:7.4,shape:'curve',curve:-1.6,gd:'disc',guard:7,wrap:'lacquer',pom:'cap',hamon:'#ffffff'};
const PKC_NOD={f:'sw',len:26,w:4.2,grip:10,shape:'curve',curve:-2,gd:'disc',guard:7.4,wrap:'lacquer',pom:'cap',hamon:'#ffffff'};
/* item specs: family + shape; entries for famed / legendary pieces only hold what differs from their base item */
const PKC_IT={
 /* daggers */
 knife:{f:'sw',len:13,w:4.6,grip:6,shape:'knife',gd:'bolster',guard:4.6,pom:'cap',gr:'wood',fuller:false},
 rondel:{f:'sw',len:15,w:3.8,grip:5.5,shape:'thin',guard:6.4,gh:2.8,pom:'disc'},
 dirk:{f:'sw',len:15,w:4.6,grip:5.5,guard:8,gr:'cloth'},
 seax:{f:'sw',len:15,w:5.6,grip:6,shape:'seax',gd:'bolster',guard:5.6,pom:'cap',gr:'wood',fuller:false},
 stiletto:{f:'sw',len:17,w:3,grip:5.5,shape:'thin',guard:8.5,gd:'curve'},
 kris:{f:'sw',len:16,w:4.6,grip:5.5,shape:'kris',guard:7.6,fuller:false},
 tanto:{f:'sw',len:14,w:4.2,grip:6,shape:'curve',curve:-.5,gd:'disc',guard:6,wrap:'lacquer',pom:'cap',bl:'silver',hamon:'#ffffff'},
 yoroidoshi:{f:'sw',len:15,w:4.8,grip:6,gd:'disc',guard:6.4,wrap:'lacquer',pom:'cap'},
 fangknife:{f:'sw',len:14,w:4.6,grip:5.6,shape:'curve',curve:-1.6,bl:'fang',guard:6.4,fit:'bone',fuller:false},
 /* swords */
 oldsword:{f:'sw',len:20,w:4.6,grip:5,guard:11,bl:'iron',notch:1},
 shortsword:{f:'sw',len:16,w:5.4,grip:5,shape:'leaf',guard:10},
 arming:{f:'sw',len:20,w:4.6,grip:5.2,guard:12},
 runeblade:{f:'sw',len:21,w:4.8,grip:5.4,guard:12.5,gd:'curve',runes:'#8ccfff'},
 riftedge:{f:'sw',len:21,w:4.8,grip:5.4,guard:12,gd:'curve',bl:'void',runes:'#f0e2ff',glow:'#b48cff',fit:'dark',gr:'purple'},
 falchion:{f:'sw',len:18,w:5,grip:5,shape:'falchion',guard:11,fuller:false},
 estoc:{f:'sw',len:23,w:3.2,grip:6,shape:'thin',guard:11,gd:'curve'},
 wakizashi:{f:'sw',len:17,w:3.8,grip:6,shape:'curve',curve:-1,gd:'disc',guard:6.4,wrap:'lacquer',pom:'cap',hamon:'#ffffff'},
 katana:PKC_KAT,katana2:Object.assign({},PKC_KAT,{wrap:'navy'}),katana3:Object.assign({},PKC_KAT,{bl:'moon',glow:'#9cc8ff',glowA:.35,wrap:'navy'}),
 /* greatswords */
 waster:{f:'sw',len:25,w:5,grip:8,guard:13,bl:'iron',notch:1},
 bastard:{f:'sw',len:24,w:4.8,grip:7,guard:12.5,gd:'curve'},
 greatsword:{f:'sw',len:26,w:5.2,grip:8,guard:15},
 zweihander:{f:'sw',len:26,w:5,grip:8.5,guard:15,gd:'curve',lugs:5},
 flamberge:{f:'sw',len:26,w:5,grip:8,guard:14,shape:'wavy',lugs:4.6,fuller:false},
 runegreat:{f:'sw',len:26,w:5.2,grip:8,guard:15,gd:'curve',runes:'#8ccfff'},
 nodachi:PKC_NOD,odachi:Object.assign({},PKC_NOD,{len:27,w:4.6,curve:-2.4,wrap:'navy'}),
 voidgreat:{f:'sw',len:26,w:5.4,grip:8,guard:14,bl:'void',glow:'#b48cff',fit:'dark',gr:'purple',fuller:false},
 /* axes */
 hatchet:{f:'ax',a:9.6,b:12,E:7,H1:3.4,H2:4.4,bulge:1.2,hw:2.8,bl:'iron'},
 handaxe:{f:'ax',a:10.4,b:12.8,E:8,H1:4,H2:5,bulge:1.4},
 waraxe:{f:'ax',a:11.2,b:13.6,E:9.6,H1:5.6,H2:6.6,bulge:2,hw:3},
 beardaxe:{f:'ax',a:11.2,b:13.6,E:9,H1:3.4,H2:9,bulge:1.8,hw:3},
 greataxe:{f:'ax',a:13.6,b:15.2,E:10.6,H1:7,H2:7.6,bulge:2.6,hw:3.2,wrapG:6},
 dwarfaxe:{f:'ax',a:11.2,b:13.6,E:8.6,H1:6,H2:6,bulge:2,dbl:1,hw:3.2,runes:'#ffd860'},
 bardiche:{f:'ax',a:13.6,b:16,E:7.4,H1:12,H2:3,bulge:1.6,top:9,neck:3.2,hw:3},
 /* maces, clubs, hammers */
 club:{f:'mc',hd:'club',a:10.4,b:13.6,hw:3,cw:7.4},
 spikedclub:{f:'mc',hd:'club',nails:1,a:10.4,b:13.6,cw:7.6,hf:'darkwood'},
 mace:{f:'mc',hd:'flange',a:11.2,b:13.6},
 ironmace:{f:'mc',hd:'knob',a:11.2,b:13.6,bl:'iron'},
 morningstar:{f:'mc',hd:'spike',a:11.2,b:13.6,bl:'iron'},
 flail:{f:'mc',hd:'flail',a:10.4,b:14.4,bl:'iron'},
 bellmace:{f:'mc',hd:'bell',a:11.2,b:13.6,bl:'brass'},
 bonemaul:{f:'mc',hd:'bone',a:12,b:14.4,cw:8.4,wrapG:5},
 mallet:{f:'hm',hd:'mallet',a:10.4,b:12.8,bl:'iron'},
 warhammer:{f:'hm',hd:'war',a:11.2,b:13.6},
 horsepick:{f:'hm',hd:'pick',a:11.2,b:13.6},
 knighthammer:{f:'hm',hd:'knight',a:12,b:14.4,bl:'iron'},
 maul:{f:'hm',hd:'maul',a:13.6,b:15.2,bl:'iron',hw:3.2,wrapG:6},
 warmaul:{f:'hm',hd:'warmaul',a:13.6,b:15.2,hw:3.2,wrapG:6,runes:'#ffd860'},
 /* spears and polearms */
 spear:{f:'sp',hd:'leaf',HL:12,HW:6},
 warspear:{f:'sp',hd:'leaf',HL:13,HW:6.4,tassel:'cloth'},
 pike:{f:'sp',hd:'tri',HL:10,HW:4.2,a:17.1,b:18.9},
 boarspear:{f:'sp',hd:'boar',HL:13,HW:7},
 wingspear:{f:'sp',hd:'wing',HL:13,HW:6.6},
 runespear:{f:'sp',hd:'leaf',HL:14,HW:6.8,runes:'#8ccfff',glow:'#8ccfff'},
 suyari:{f:'sp',hd:'tri',HL:12,HW:4.4,hf:'darkwood'},
 jumonji:{f:'sp',hd:'cross',HL:12,HW:4.4,hf:'darkwood'},
 omiyari:{f:'sp',hd:'long',HL:16,HW:4.4,hf:'darkwood'},
 tuskspear:{f:'sp',hd:'tusk',HL:13},
 bill:{f:'pl',hd:'bill'},halberd:{f:'pl',hd:'halberd'},glaive:{f:'pl',hd:'glaive'},voulge:{f:'pl',hd:'voulge'},lucerne:{f:'pl',hd:'lucerne'},
 pitchfork:{f:'pl',hd:'fork',bl:'iron'},
 naginata:{f:'pl',hd:'naginata',hf:'darkwood',hamon:'#ffffff'},
 naginata2:{f:'pl',hd:'naginata',hf:'redlac',hamon:'#ffffff',collar:'gold'},
 tailglaive:{f:'pl',hd:'tail',bl:'wyv'},
 /* staves */
 staff:{f:'st',hd:'plain',hw:3},
 bo:{f:'st',hd:'bo',hf:'darkwood',hw:3},
 ironstaff:{f:'st',hd:'iron',hw:3},
 pilgrim:{f:'st',hd:'crook'},
 focus:{f:'st',hd:'gem',gem:'mana'},
 witchstave:{f:'st',hd:'gnarl'},
 archstaff:{f:'st',hd:'arch',gem:'frost',glow:'#a6e4ff'},
 heartstave:{f:'st',hd:'leaf',hf:'heart',gem:'chi',glow:'#9cf06a'},
 /* bows, crossbows, guns */
 shortbow:{f:'bw',y0:5,y1:27,ap:17,w:3.2},
 huntbow:{f:'bw',y0:4,y1:28,ap:17.5,w:3.2},
 warbow:{f:'bw',y0:2.2,y1:29.8,ap:19,w:3.8,arrow:1,tips:'bone'},
 recurve:{f:'bw',y0:5,y1:27,ap:17,w:3.4,rc:1,mat:'bone',bands:[.22,.78],bandMat:'leather'},
 greatbow:{f:'bw',y0:1.8,y1:30.2,ap:20,w:3.6,mat:'canvas',tips:'gold',bands:[.3,.7],bandMat:'gold'},
 silkbow:{f:'bw',y0:3,y1:29,ap:18.5,w:3.6,mat:'bone',str:'#ffffff',sw:1.4,bands:[.3,.7],bandMat:'blood'},
 hankyu:{f:'bw',y0:5,y1:27,ap:16.5,w:3,asym:2,grip:'cloth'},
 yumi:{f:'bw',y0:1.6,y1:30.4,ap:18,w:3.2,asym:4,grip:'cloth',bands:[.18,.82],bandMat:'cloth'},
 daikyu:{f:'bw',y0:1.4,y1:30.6,ap:19,w:3.6,asym:4,mat:'redlac',grip:'cloth',bands:[.2,.8],bandMat:'gold'},
 lightxbow:{f:'xb',prod:'wood',P:11},
 huntxbow:{f:'xb',prod:'wood',P:10.5},
 crossbow:{f:'xb',prod:'steel',P:12},
 arbalest:{f:'xb',prod:'steel',P:13,pw:[3.2,3.2],stirrup:1,stock:'darkwood'},
 repeater:{f:'xb',prod:'wood',P:11,mag:'iron'},
 windlass:{f:'xb',prod:'steel',P:13,pw:[3.2,3.2],stirrup:1,crank:1},
 sinewxbow:{f:'xb',prod:'bone',P:12,sinew:1,str:'#e8b0a0'},
 handgonne:{f:'gn',pole:1,a:14.4,b:17.1},
 arquebus:{f:'gn',a:13.5,b:17.1},
 musket:{f:'gn',a:13.5,b:18.9},
 blunder:{f:'gn',a:12.6,b:15.3,bell:1,bw:2.8},
 longrifle:{f:'gn',a:13.5,b:19.8,bw:2,stock:'darkwood'},
 pistol:{f:'ps'},duelpistol:{f:'ps',stock:'darkwood',inlay:'gold'},
 /* shields */
 buckler:{f:'sh',kind:'buckler',w:22,h:22,mat:'wood',rim:'iron',em:'diamond',ec:'brass',rimW:2.2},
 steelbuckler:{f:'sh',kind:'buckler',w:23,h:23,mat:'steel',rim:'iron',boss:4.4,bossMat:'steel',em:'rings'},
 targe:{f:'sh',kind:'round',w:25,h:25,mat:'hide',rim:'leather',em:'studs',ec:'brass',boss:3.8},
 roundshield:{f:'sh',kind:'round',mat:'cloth',rim:'wood',rimW:2.4,boss:4.2,bossMat:'iron',em:'planks'},
 ironround:{f:'sh',kind:'round',mat:'cloth',rim:'iron',boss:4,bossMat:'steel',em:'cross',ec:'white',rivets:12},
 dwarfround:{f:'sh',kind:'round',mat:'silver',rim:'gold',boss:4,bossMat:'gold',em:'rings',rivets:12},
 spiked:{f:'sh',kind:'round',mat:'cloth',rim:'iron',spike:7},
 warspiked:{f:'sh',kind:'round',mat:'cloth',rim:'dark',spike:8.6,rivets:12},
 kite:{f:'sh',kind:'kite',w:22,h:28,mat:'cloth',rim:'iron',em:'stripe',ec:'white'},
 kite2:{f:'sh',kind:'kite',w:22,h:28,mat:'cloth',rim:'silver',em:'chevron',ec:'white'},
 heater:{f:'sh',kind:'heater',mat:'white',rim:'iron',em:'cross',ec:'cloth'},
 heater2:{f:'sh',kind:'heater',mat:'cloth',rim:'gold',em:'quarter',ec:'gold'},
 tower:{f:'sh',kind:'tower',mat:'cloth',rim:'brass',em:'diamond',ec:'gold'},
 steeltower:{f:'sh',kind:'tower',mat:'steel',rim:'iron',em:'planks',rivets:14},
 pavise:{f:'sh',kind:'tower',w:22,h:28,mat:'white',rim:'wood',em:'stripe',ec:'cloth'},
 serptarge:{f:'sh',kind:'round',mat:'serp',rim:'leather',em:'scales',gem:'gold',gemR:2.8},
 heartround:{f:'sh',kind:'round',mat:'heart',rim:'darkwood',em:'rings',gem:'chi',gemCut:'round',gemR:2.6},
 wyvkite:{f:'sh',kind:'kite',w:22,h:28,mat:'wyv',rim:'dark',em:'scales',gem:'gold',gemR:2.4},
 /* body armor */
 rags:{f:'ar',shape:'rags',mat:'hide',pat:'hide',belt:1,beltMat:'canvas'},
 padded:{f:'ar',shape:'tunic',mat:'canvas',pat:'quilt'},
 jack:{f:'ar',shape:'tunic',mat:'saffron',pat:'quilt'},
 leather:{f:'ar',shape:'tunic',mat:'leather',pat:'seams',belt:1,paul:'leather'},
 hide:{f:'ar',shape:'vest',mat:'hide',pat:'hide',fur:'bone',belt:1},
 studded:{f:'ar',shape:'tunic',mat:'leather',studs:'brass',belt:1},
 brigandine:{f:'ar',shape:'vest',mat:'cloth',studs:'brass',belt:1,paul:'steel'},
 mail:{f:'ar',shape:'tunic',mat:'iron',pat:'mail',belt:1},
 scale:{f:'ar',shape:'tunic',mat:'iron',pat:'scale',paul:'brass',belt:1},
 lamellar:{f:'ar',shape:'vest',mat:'steel',pat:'lam',laces:'cloth',paul:'iron'},
 coatplates:{f:'ar',shape:'vest',mat:'iron',pat:'plates',belt:1,paul:'iron'},
 plate:{f:'ar',shape:'cuirass',mat:'steel',paul:'steel',faulds:1},
 gothic:{f:'ar',shape:'cuirass',mat:'silver',pat:'fluted',paul:'silver',paulTrim:'brass',faulds:1},
 robe:{f:'ar',shape:'robe',mat:'blue',trim:'gold'},
 sigilrobe:{f:'ar',shape:'robe',mat:'blue',trim:'gold',sigil:'gold'},
 mailrobe:{f:'ar',shape:'robe',mat:'iron',pat:'mail',trim:'blue'},
 archrobe:{f:'ar',shape:'robe',mat:'navy',trim:'gold',paul:'purple',paulTrim:'gold',sigil:'gold',sigilN:8},
 kesa:{f:'ar',shape:'robe',mat:'saffron',trim:'saffron',sash:'cloth'},
 tatami:{f:'ar',shape:'do',mat:'lacquer',laces:'blue'},
 do:{f:'ar',shape:'do',mat:'lacquer',laces:'cloth'},
 domaru:{f:'ar',shape:'do',mat:'redlac',laces:'gold',top:'lacquer'},
 oyoroi:{f:'ar',shape:'do',mat:'lacquer',laces:'cloth',big:1,top:'redlac',mon:'gold'},
 serpjerkin:{f:'ar',shape:'tunic',mat:'serp',pat:'scale',belt:1},
 owlcoat:{f:'ar',shape:'coat',mat:'hide',pat:'hide',feathers:1,fur:'canvas',belt:1},
 barkrobe:{f:'ar',shape:'robe',mat:'wood',pat:'hide',trim:'chi',gem:'mana'},
 ogreharness:{f:'ar',shape:'vest',mat:'ogre',pat:'hide',paul:'bone',belt:1},
 wyvcuirass:{f:'ar',shape:'cuirass',mat:'wyv',pat:'scale',paul:'wyv',faulds:1},
 /* helmets */
 hood:{f:'hl',hd:'hood',mat:'leather'},cap:{f:'hl',hd:'cap',mat:'leather'},armcap:{f:'hl',hd:'armcap',mat:'canvas'},coif:{f:'hl',hd:'coif',mat:'iron'},
 kettle:{f:'hl',hd:'kettle'},nasal:{f:'hl',hd:'nasal'},spangen:{f:'hl',hd:'spangen'},sallet:{f:'hl',hd:'sallet'},barbute:{f:'hl',hd:'barbute'},
 bascinet:{f:'hl',hd:'bascinet'},armet:{f:'hl',hd:'armet',mat:'silver'},greathelm:{f:'hl',hd:'great',plume:'cloth'},
 jingasa:{f:'hl',hd:'jingasa',mat:'lacquer'},hachigane:{f:'hl',hd:'hachigane'},kabuto:{f:'hl',hd:'kabuto',mat:'lacquer'},
 menpo:{f:'hl',hd:'menpo',mat:'lacquer'},kawari:{f:'hl',hd:'kawari',mat:'lacquer'},
 ogrehelm:{f:'hl',hd:'ogre'},tuskhelm:{f:'hl',hd:'tusk'},wyvhelm:{f:'hl',hd:'great',crest:'wyv',plume:null},
 /* fabled (it-fb:*): the base item, gilded, in its own colours */
 'fb:oathkeeper':{bl:'silver',gem:'blood'},
 'fb:nightblade':{bl:'dark',hamon:'#c8d4ff',wrap:'navy'},
 'fb:shadetanto':{bl:'dark',hamon:'#c49eff',glow:'#8656d0',glowA:.35},
 'fb:demonblade':{bl:'dark',hamon:'#ff5a4a',wrap:'redlac',glow:'#ff3020',glowA:.3},
 'fb:silverpoint':{bl:'silver',fit:'silver'},
 'fb:sunderedge':{crack:'#ff6a3a',runes:'#ff9a6a',glow:'#ff6a3a'},
 'fb:wolfaxe':{bl:'silver',hf:'darkwood',gem:'frost'},
 'fb:anvilfall':{bl:'iron',runes:'#ff9a4a'},
 'fb:redtusk':{bl:'redsteel'},
 'fb:mountainmaul':{bl:'stone',runes:'#ffd860'},
 'fb:lanternmace':{bl:'gold',glow:'#ffd860',gem:'holy'},
 'fb:cranepole':{bl:'silver',hf:'pale'},
 'fb:gravestaff':{hd:'lantern',hf:'bone'},
 'fb:lotusstaff':{hd:'bo',hf:'iron',lotus:1},
 'fb:widowsong':{mat:'darkwood',tips:'silver',str:'#d0d8ff',bandMat:'silver'},
 'fb:hundredbow':{arrow:1,fletch:'white'},
 'fb:witchbane':{prod:'silver',stock:'darkwood'},
 'fb:saintsrifle':{stock:'darkwood',barrel:'silver',bands:[-12,-4,0]},
 'fb:sinpistol':{stock:'lacquer',barrel:'silver',fit:'silver'},
 'fb:vowwall':{mat:'gold',em:'diamond',ec:'cloth'},
 'fb:anvilround':{mat:'steel',em:'crossg',ec:'gold'},
 'fb:saintstower':{mat:'silver',rim:'gold',em:'cross',ec:'cloth',rivets:0},
 'fb:palecloak':{mat:'pale',studs:'silver'},
 'fb:wolfpelt':{mat:'pale',fur:'white'},
 'fb:bearhide':{mat:'blackfur',fur:'hide'},
 'fb:shroud':{mat:'pale',trim:'silver',sigil:'bone',paul:'pale',paulTrim:'silver'},
 'fb:riftmail':{mat:'void',trim:'purple',glow:'#b48cff'},
 'fb:lotusrobe':{trim:'cloth'},
 'fb:cranedo':{mat:'white',laces:'cloth',top:'lacquer',mon:'cloth'},
 'fb:snowdo':{mat:'white',laces:'blue',top:'pale',mon:'frost'},
 'fb:demonarmor':{mat:'redlac',laces:'gold',top:'lacquer'},
 'fb:demonmask':{mask:'redlac',horns:1},
 'fb:tuskcrown':{crown:'gold'},
 /* legendary (it-lg:*): their own colours and a glow */
 'lg:dawnbringer':{bl:'holy',runes:'#fff6b8',glow:'#ffd860',gem:'aura'},
 'lg:kingsblade':{bl:'silver',gem:'mana',runes:'#bfe4ff',glow:'#8ccfff'},
 'lg:kusanagi':{bl:'qi',glow:'#5af0d0',wrap:'navy'},
 'lg:stormcleaver':{bl:'frost',glow:'#64bcf2',wrap:'navy'},
 'lg:lastmercy':{bl:'purple',glow:'#ab84ec',gem:'mana'},
 'lg:grudgebearer':{bl:'ember',glow:'#ff9a3c',runes:'#fff2cc'},
 'lg:widowmaker':{bl:'blood',glow:'#ff3a3a',hf:'lacquer'},
 'lg:oathbreaker':{bl:'dark',glow:'#ff8a3c',gem:'fire'},
 'lg:worldhammer':{bl:'gold',fit:'silver',gem:'qi',glow:'#5af0d0',runes:null},
 'lg:heartseeker':{bl:'chi',glow:'#9cf06a',runes:'#f4ffd0'},
 'lg:skyrender':{bl:'frost',glow:'#8ccfff',runes:'#ffffff'},
 'lg:starfall':{mat:'gold',tips:'white',glow:'#fff2b0',arrow:1,head:'holy',bandMat:'white'},
 'lg:raijin':{mat:'navy',bands:[.2,.5,.8],bandMat:'aura',glow:'#8ccfff'},
 'lg:wyrmbane':{prod:'wyv',stock:'lacquer',glow:'#ff5030'},
 'lg:thunderclap':{stock:'redlac',barrel:'dark',glow:'#ffd860'},
 'lg:starweaver':{hd:'star',gem:'mana',glow:'#b8c8ff'},
 'lg:aegisplate':{mat:'gold',paul:'gold',paulTrim:'white',glow:'#ffe08a',gem:'mana'},
 'lg:shadowweave':{mat:'purple',pat:'quilt',glow:'#8656d0'},
 'lg:pilgrimmantle':{tabard:'pale',cross:'cloth'},
 'lg:thousandbattles':{mat:'redlac',laces:'gold',top:'gold',mon:'aura',glow:'#ff6a3a'},
 'lg:dreadcrown':{mat:'iron',crown:'gold',plume:null,glow:'#b48cff'},
 'lg:oniface':{hd:'onimask',mat:'redlac'},
 'lg:sunwall':{mat:'white',em:'sun',ec:'gold',glow:'#ffd860'},
 'lg:mirrorshield':{mat:'silver',em:'mirror',boss:3.6,bossMat:'frost',glow:'#cfe6ff',rivets:0},
 /* crisis spoils */
 crshard:{f:'fn',fn:g=>{pkGlow(g,16,16,15,'#8fd8ff',.5);pkGem(g,16,16,13.5,'frost','long');pkPost(g=>{pkGlint(g,25,7,2.2);pkGlint(g,7,24,1.6)})}},
 crbonecrown:{f:'fn',fn:g=>{pkFill(g,pkS('M3 26 L3 10 L8.6 16.6 L12 6.6 L16 14.6 L20 6.6 L23.4 16.6 L29 10 L29 26 Z'),'bone',{k:1.6,inside:(g,m)=>pkHi(g,'M5 22 L5 14',1,.5)});
  pkFill(g,pkRect(2.4,20,27.2,6.6,1),'bone',{k:.8,inside:(g,m)=>{for(const x of [8,16,24]){g.fillStyle=PK.ink;g.fill(pkEll(x-1.5,23,1.1,1.4).p);g.fill(pkEll(x+1.5,23,1.1,1.4).p)}}});for(const [x,y] of [[3,10],[12,6.6],[20,6.6],[29,10]])pkFill(g,pkCirc(x,y,1.6),'bone',{ball:1,k:.3,lw:PK.lw*.8})}},
 crempcrown:{f:'fn',fn:g=>{pkGlow(g,16,16,15,'#8fd8ff',.35);pkFill(g,pkS('M3 26 L3 10 L8.6 16.6 L12 6.6 L16 14.6 L20 6.6 L23.4 16.6 L29 10 L29 26 Z'),'gold',{k:1.6});
  pkFill(g,pkRect(2.4,20,27.2,6.6,1),'gold',{k:.8});for(const [x,y,r] of [[3,9.6,1.8],[12,6.2,1.8],[20,6.2,1.8],[29,9.6,1.8]])pkFill(g,pkCirc(x,y,r),'frost',{ball:1,k:.3,lw:PK.lw*.8});
  pkGem(g,16,23.2,2.6,'frost','diamond');pkGem(g,8.4,23.2,1.8,'frost','round');pkGem(g,23.6,23.2,1.8,'frost','round')}},
 crwartusk:{f:'fn',fn:g=>{pkFill(g,pkTube(pkQ(5,28,5,9,27.5,3.6,24),[7,1.2],'round'),'bone',{k:1.4,inside:(g,m)=>{pkHi(g,'M4 22 Q4.6 12 12 7.4',1.1,.55);pkLine(g,'M8 21 Q8.4 15 12.4 11',.6,m[1],.6)}});
  pkFill(g,pkRect(1.8,21.8,7,4.4,1),'leather',{k:.5});pkLine(g,'M3 23 L8 23 M3 25 L8 25',.6,PK.ink,.5);pkLine(g,'M10.6 14 L13 12.6 M13.4 10.6 L15.6 9.4',1.1,PKM.blood[2],.95)}}};
const PKC_WT={dagger:'dirk',sword:'arming',greatsword:'greatsword',axe:'waraxe',mace:'mace',hammer:'warhammer',spear:'spear',polearm:'halberd',bow:'shortbow',crossbow:'crossbow',flintlock:'musket',staff:'staff'};
const PKC_SHL=[['buckler','buckler'],['kite','kite'],['heater','heater'],['tower','tower'],['round','roundshield'],['spiked','spiked'],['targe','targe'],['pavise','pavise']];
/* the family spec of an item that has no entry: its weapon type, shield look, armor value or helm tier */
function pkcFallback(id){const I=ITEMS[id];if(!I)return null;
 if(I.k==='w')return PKC_IT[PKC_WT[I.wt]]||PKC_IT.arming;
 if(I.k==='s'){const l=String(I.look||'');for(const [p,k] of PKC_SHL)if(l.indexOf(p)===0)return PKC_IT[k];return PKC_IT.heater}
 if(I.k==='a'){const a=I.arm||0;return PKC_IT[a<=40?'jack':a<=100?'leather':a<=160?'mail':a<=250?'coatplates':'plate']}
 if(I.k==='h'){let t=3;try{t=helmTier(id)||3}catch(e){}return PKC_IT[['cap','cap','coif','kettle','barbute','greathelm'][t]]}
 return null}
/* full spec of an item: tier materials < base item (famed) < gilding (famed) < own entry */
function pkcSpec(id){const I=typeof ITEMS==='object'&&ITEMS&&ITEMS[id];if(!I)return null;const own=PKC_IT[id];
 const base=I.base&&I.base!==id&&ITEMS[I.base]?PKC_IT[I.base]||pkcFallback(I.base):null,fam=!!I.famed;
 const body=own&&own.f?own:base||pkcFallback(id);if(!body||!PKC_F[body.f])return null;
 const t=Math.max(1,Math.min(6,(I.tier|0)||1));return Object.assign({},PKC_TIER[t],body,fam?{fit:'gold',tr:'gold'}:{},own&&!own.f?own:{},{t,famed:fam,legend:!!I.legend})}
/* famed / fabled: a gold frame with studs; legendary: a violet frame with ember corners; the item inside at 84 % */
function pkcFramed(g,leg,draw){const O=pkRect(1.3,1.3,29.4,29.4,5.6),I=pkRect(3.3,3.3,25.4,25.4,4),R=new Path2D();R.addPath(O.p);R.addPath(I.p);
 pkFill(g,{p:R,b:O.b},leg?'void':'gold',{rule:'evenodd',k:.6,lw:PK.lw*.8});
 for(const [x,y] of [[3.2,3.2],[28.8,3.2],[3.2,28.8],[28.8,28.8]]){if(leg)pkFill(g,pkPoly([x,y-3,x+3,y,x,y+3,x-3,y]),'fire',{k:.4,lw:PK.lw*.8});else pkFill(g,pkCirc(x,y,2),'gold',{ball:1,k:.3,lw:PK.lw*.8})}
 pkAt(g,16,16,0,.88,g=>{g.translate(-16,-16);draw(g)});
 pkPost(g=>{if(leg){pkGlint(g,3.2,3.2,3.4,'#f0f4ff');pkGlint(g,28.8,28.8,2.4,'#ffe0b0')}else pkGlint(g,3.2,3.2,3.4,'#fffbe0')})}
function pkcPaintItem(g,id){const o=pkcSpec(id);if(!o)throw new Error('no spec '+id);const draw=g=>PKC_F[o.f](g,o);
 if(o.legend)pkcFramed(g,1,draw);else if(o.famed)pkcFramed(g,0,draw);else draw(g)}
/* a family icon from an item's spec at a tier */
const pkcAs=(id,t,x)=>g=>{const o=Object.assign({},PKC_TIER[t],PKC_IT[id],x||{});PKC_F[o.f](g,o)};

/* ---- family / slot icons (not items) ---- */
Object.assign(PAINT,{
 'w-warhammer':pkcAs('mallet',3,{bl:'steel'}),'w-pickhammer':pkcAs('warhammer',3),'w-maul':pkcAs('maul',4),'w-warmaul':pkcAs('warmaul',5),
 'w-bill':pkcAs('bill',2),'w-halberd':pkcAs('halberd',4),'w-glaive':pkcAs('glaive',5),'w-greatsword':pkcAs('greatsword',3),'w-zweihander':pkcAs('zweihander',4),
 'w-runegreat':pkcAs('runegreat',5),'w-arbalest':pkcAs('arbalest',4),'w-pistol':pkcAs('pistol',3),'w-musket':pkcAs('musket',4),
 'shield-buckler':pkcAs('buckler',1),'shield-round':pkcAs('roundshield',2),'shield-kite':pkcAs('kite',2,{em:'cross'}),'shield-heater':pkcAs('heater2',3,{mat:'blue',ec:'cloth',em:'quarter'}),
 'shield-tower':pkcAs('tower',3,{mat:'blue'}),'shield-spiked':pkcAs('warspiked',4,{mat:'dark',rim:'iron'}),
 'armor-light':pkcAs('padded',1,{belt:1}),'armor-medium':pkcAs('leather',2,{paul:'steel'}),'armor-heavy':pkcAs('plate',5,{paulTrim:'gold'}),
 'helm-1':pkcAs('cap',1),'helm-2':pkcAs('coif',2),'helm-3':pkcAs('kettle',3),'helm-4':pkcAs('barbute',4),'helm-5':pkcAs('greathelm',5),
 sidearm:pkcAs('shortsword',3),
 swords:g=>{pkcSword(g,{...PKC_TIER[3],len:19,w:4.2,grip:4.6,guard:10.5,s:.86});pkAt(g,32,0,0,1,g=>{g.scale(-1,1);pkcSword(g,{...PKC_TIER[3],len:19,w:4.2,grip:4.6,guard:10.5,s:.86})})},
 slung:g=>{pkFill(g,pkTube(pkQ(6,13,16,-4,26,13,14),2.4,'round'),'leather',{k:.5});pkcShieldI(g,{kind:'heater',w:22,h:22,cy:18.6,mat:'silver',rim:'iron',boss:3.6,bossMat:'gold'})},
 fist:g=>{pkFill(g,pkS('M6.6 13 C6.6 9.2 8.6 7.6 11 7.6 L22.4 7.6 C25.2 7.6 27 9.6 27 12.6 L27 21 C27 25.6 23.4 29 18.6 29 L13 29 C9 29 6.6 26.2 6.6 22 Z'),'skin',{k:2,inside:(g,m)=>{pkLine(g,'M12 7.8 L12 14.2 M16.6 7.8 L16.6 14.2 M21.4 7.8 L21.4 14.2',.9,m[0],.75);pkHi(g,'M8.4 11 Q9 9.2 11 9.2 M13.6 9.2 L15 9.2 M18.2 9.2 L19.8 9.2',1.1,.6)}});
  pkFill(g,pkS('M6.8 16.4 Q12.6 14.6 18.4 16.8 Q19.4 19.6 17 20.6 Q11.6 19.6 6.8 21.4 Z'),'skin',{k:.8})}});
/* every item in the spec table paints itself; any other weapon / shield / armor / helm item (famed f:N made in play, new
   items) is painted from its base item or its family when first shown (PK_DYN) */
for(const id in PKC_IT){const n='it-'+id;if(!Object.prototype.hasOwnProperty.call(PAINT,n))PAINT[n]=g=>pkcPaintItem(g,id)}
PK_DYN.push(n=>{if(n.slice(0,3)!=='it-')return null;const id=n.slice(3),I=typeof ITEMS==='object'&&ITEMS&&ITEMS[id];if(!I||'wsah'.indexOf(I.k)<0||!pkcSpec(id))return null;return g=>pkcPaintItem(g,id)});
