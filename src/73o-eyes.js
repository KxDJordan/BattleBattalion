/* ================= EYES AND EXPRESSIONS (Detail High person figures) =================
   The front heads of the parts sheets had their painted eyes lifted off at atlas build time (assets/make-human-atlas.js keeps where they
   were: HPA.p[head].eyes = [near x, y, h, far x, y, h]); here the expression sheet (assets/eyes.webp -> EYA, 73n-eyesatlas.js) supplies
   them: two slots on the head bone (near eye, far eye), each a piece baked per look x face x expression, scaled to the head's painted
   eye, placed by the sheet's neutral-row eye centres (EYA.ref) and clipped to the head's silhouette. Back views have no eyes; helmets
   that close over the face hide them. Faces 1 and 3 are mirrored with the whole figure, so the near eye stays the near, bigger one.
   Which expression: EYE_RULES, a table read top to bottom (first match), from the unit's state and situation; a unit holds an
   expression for EYE_HOLD ms and cross-fades over EYE_FADE ms. No rnd(). */
const EYE={img:null,ok:false,mem:new WeakMap(),picks:0};
// the sheet: row*6+col (rows 0-2: six iris colours each; brown, blue, green, amber, red, violet)
const EYE_IRIS=['brown','blue','green','amber','red','violet'];
const EYE_SET={neutral:0,determined:6,angry:12,sad:18,surprised:19,wary:20,pain:21,happy:22,happy2:23,effort:24,bored:25,joy:26,sleepy:27,closed:28,sleep:29,
 hearts:30,stars:31,sparkle:32,dazed:33,shocked:34,alarmed:35,frightened:36,crying:37,smug:38,unimpressed:39,wink:40,winkstar:41,
 scar:42,blackeye:43,bleeding:44,claw:45,storm:46,voidfire:47,frostfire:48,blank:49,feral:50,serpent:51,crystal:52,cosmic:53};
const EYE_TINTED={neutral:1,determined:1,angry:1};      // the three rows that come in the six iris colours
const EYE_HOLD=420,EYE_FADE=140;
// PAL iris keys of the portraits (ptMercSpec face.iris) -> the sheet's six colours
const EYE_IRISMAP={'0':0,'1':0,a:0,i:0,j:0,H:0,G:0,k:3,X:1,x:1,F:1,Z:1,'7':2,B:2,A:2,'5':2,'6':2,'4':2,w:2,v:2,b:3,c:3,d:3,E:3,y:3,Y:3,I:3,f:4,g:4,h:4,K:4,D:5,C:5};
const EYE_GIFT={mana:'voidfire',aura:'frostfire',qi:'storm',chi:'stars',hex:'voidfire',void:'cosmic',ice:'crystal',fire:'voidfire'};
const EYE_INJ={missingeye:'scar',gashedbrow:'bleeding',brokennose:'blackeye',scarredface:'claw',concussion:'sleepy',fracturedskull:'sleepy'};
const EYE_ENEMY={necro:'cosmic',necrolt:'blank',shinobi:'determined',barbz:'feral',sohei:'determined'};
const EYE_HELM=/^(great|barbute|tuskbarbute|armet|bascinet|voidhelm|wyvcrest|sallet|murm|galea|thraex)$/;
/* the rules: [test(c) -> expression name | null]; c = {u, S, st (animation state), t (0..1), an (animation name), mor, sts (status keys),
   buffs, cls (weapon class), now, won, kill (ms since this unit's last kill), base (its resting look)} */
const EYE_RULES=[
 ['dead',c=>c.st==='death'?(c.t<.5?'pain':'closed'):null],
 ['hurt',c=>c.st==='hit'?(c.u&&c.u.hpMax&&c.u.hp<c.u.hpMax*.3?'pain':'effort'):null],
 ['stunned',c=>c.sts.stun||c.sts.daze?'dazed':null],
 ['frozen',c=>c.sts.chill?'crystal':null],
 ['poisoned',c=>c.sts.poison?'serpent':null],
 ['bleeding',c=>c.sts.bleed?'bleeding':null],
 ['burning',c=>c.sts.burn?'pain':null],
 ['fleeing',c=>c.an==='flee'||c.mor===0?'shocked':null],
 ['breaking',c=>c.mor===1?'frightened':null],
 ['casting',c=>c.st==='cast'?(EYE_GIFT[c.gift]||'stars'):null],
 ['rage',c=>c.sts.fury||c.sts.enrage||c.sts.warcry||c.buffs.enrage||c.buffs.rage?'angry:red':null],
 ['attack',c=>c.st==='attack'?(c.cls==='bow'||c.cls==='gun'?'determined':c.feral?'feral':'angry'):null],
 ['reload',c=>c.st==='reload'?'determined':null],
 ['won',c=>c.won?'joy':null],
 ['kill',c=>c.kill<1600?'winkstar':null],
 ['rallied',c=>c.buffs.rallied?'stars':null],
 ['wall',c=>c.buffs.shieldwall?'determined':null],
 ['wavering',c=>c.mor===2?'sad':null],
 ['taunted',c=>c.sts.taunted||c.sts.marked?'wary':null],
 ['walk',c=>c.st==='walk'?(c.base==='neutral'?'determined':c.base):null],
 ['rest',c=>c.base]];
function eyeImg(){if(EYE.img)return EYE.ok?EYE.img:null;if(typeof Image==='undefined'||typeof EYA!=='object')return null;const I=new Image();I.decoding='async';I.onload=()=>{EYE.ok=true};I.src=EYA.src;EYE.img=I;if(I.complete&&I.naturalWidth)EYE.ok=true;return EYE.ok?I:null}
function eyeIris(S,L){let k=S&&S.irisK;if(k==null){let P=null;try{const m=L&&L.m;if(m&&typeof ptMercSpec==='function')P=ptMercSpec(m)}catch(e){}k=P&&P.face&&EYE_IRISMAP[P.face.iris]!=null?EYE_IRISMAP[P.face.iris]:0;if(S)S.irisK=k}return k}
// an expression name ('angry', 'angry:red', 'scar') -> the sheet cell
function eyeCell(name,iris){const p=String(name).split(':'),b=EYE_SET[p[0]];if(b==null)return iris|0;if(!EYE_TINTED[p[0]])return b;const c=p[1]?EYE_IRIS.indexOf(p[1]):iris|0;return b+(c<0?0:c)}
// the unit's resting look: an eye injury, its kind (necromancers, berserkers), else neutral
function eyeBase(u,L){const S=L.S;if(S.eyeBase!=null)return S.eyeBase;let b='neutral';const m=u&&u.m;
 if(m&&Array.isArray(m.inj))for(const j of m.inj){const e=j&&EYE_INJ[j.id];if(e){b=e;break}}
 if(b==='neutral'&&u&&!m){const id=typeof usEnKey==='function'&&u.def?usEnKey(u.def):null;if(id&&EYE_ENEMY[id])b=EYE_ENEMY[id]}
 S.eyeBase=b;return b}
/* the expression for this unit now: {set, prev, fade (0..1 of the new one)} or null (no unit: the plain neutral for the baked path) */
function eyePick(u,L,st,t,an,cls){const S=L.S,now=typeof anNow==='function'?anNow():performance.now(),iris=eyeIris(S,L.m?L:{m:u&&u.m});
 const sts={},buffs={};if(u&&u.st)for(const k in u.st)if(u.st[k]>0)sts[k]=1;if(u&&Array.isArray(u.buffs))for(const b of u.buffs)if(b&&b.key)buffs[b.key]=1;
 let M=u?EYE.mem.get(u):null;if(u&&!M){M={cur:null,prev:null,t0:-1e9,kills:u.m?u.m.kills|0:0,killT:-1e9};EYE.mem.set(u,M)}
 if(M&&u.m&&(u.m.kills|0)>M.kills){M.kills=u.m.kills|0;M.killT=now}
 const won=!!(u&&typeof B==='object'&&B&&B.over&&B.result&&B.result.win!=null?(B.result.win===(u.side===0)):false);
 const c={u,S,st,t,an,cls,mor:u&&u.mor!=null?u.mor:4,sts,buffs,gift:S.res||S.spark||null,won,kill:M?now-M.killT:1e9,feral:!!(u&&u.m&&u.m.bg==='wildling'),base:u?eyeBase(u,L):'neutral'};
 let name='neutral';for(const r of EYE_RULES){let v=null;try{v=r[1](c)}catch(e){}if(v){name=v;break}}
 const set=eyeCell(name,iris);EYE.picks++;if(!M)return{set,prev:null,fade:1,name};
 if(M.cur==null){M.cur=set;M.name=name;M.t0=now-EYE_FADE}
 else if(set!==M.cur&&(now-M.t0>=EYE_HOLD||st==='hit'||st==='death')){M.prev=M.cur;M.cur=set;M.name=name;M.t0=now}
 const fade=Math.min(1,(now-M.t0)/EYE_FADE);return{set:M.cur,prev:fade<1?M.prev:null,fade,name:M.name}}
/* the two eye pieces of a cell for this look and face, in the head bone's frame (null while the sheet loads or where no eyes show) */
function eyeAtts(A,set){if(A.back||!eyeImg()||typeof EYA!=='object')return null;const S=A.S;if(EYE_HELM.test(S.hat||''))return null;
 const n=A.head.n,E=HPA.p[n]&&HPA.p[n].eyes;if(!E)return null;const key='eye:'+set;let r=A.bk.get(key);if(r!==undefined)return r;
 const R=A.head.R,dw=n[0]==='d',eh=dw?36:E[2],s=eh*1.32/EYA.ref.h,cell=EYA.c[set],I=eyeImg(),hk=HPA.k,head=A.head;
 const one=(q,side)=>{if(!q)return null;const ref=side?EYA.ref.f:EYA.ref.n,ex=(side?E[3]:E[0])-R.px,ey=(side?E[4]:E[1])-R.py+(dw?7:0);
  const x0=ex+(q[4]-ref[0])*s,y0=ey+(q[5]-ref[1])*s,w=q[6]*s,h=q[7]*s;
  return hskBake(A.K,[x0-2,y0-2,x0+w+2,y0+h+2],g=>{g.drawImage(I,q[0],q[1],q[2],q[3],x0,y0,w,h);if(head.c){g.globalCompositeOperation='destination-in';g.drawImage(head.c,-R.px-1/hk,-R.py-1/hk,head.c.width/hk,head.c.height/hk);g.globalCompositeOperation='source-over'}})};
 r={n:one(cell[0],0),f:one(cell[1],1)};A.bk.set(key,r);return r}
