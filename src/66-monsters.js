/* ================= MONSTERS ================= */
/* Serpents, ents, ogres and wyverns: their abilities (AB entries with foe:1, run by the rules or by foeUse like every foe
   ability, see 64-foes.js), their passives and the per-turn upkeep. Stats are EN entries in 10-data.js, factions FACT entries.
   Every number a player can read is in the ability's d text. Hooks called by the rules:
     monTurn(u)      start of every unit's turn (from foeTurn): venom, coils, regrowth, the ticking of the statuses below
     monStatus(d)    a status was applied ('status' event): a flier that is rooted is Grounded (cannot fly or dive) for 2 turns more
     monStunned(u)   u loses its turn to a stun: a dive it was gathering is broken
     monDeath(t)     t died: its coils let go
   Telegraph: Dive (wyverns) marks its landing tiles in B.tele [{u, n, keys}] one turn ahead; foes still there when it lands are hit.
   Movement: def.size 2 and def.fly are rules of 60-battle-core.js (footprints, flight); nothing here moves units by hand except
   the dive's landing, which goes through footFree(). */
const VENOMDMG=14,MON_TICK=['venom','coiled','entangled','slammed','grounded'];
function monTurn(u){if(!u||!u.alive)return;const st=u.st,d=u.def;
 if(st.venom>0){float(u,'Venom','#9bd96f');hurt(u,VENOMDMG,1,null,{pierce:1});if(!u.alive)return}
 if(st.coiled>0){const by=u.coilBy;if(!by||!by.alive||mdist(by,u)>1){delete st.coiled;u.coilBy=null}}
 for(const k of MON_TICK)if(st[k]>0&&--st[k]<=0)delete st[k];
 if(d&&d.regen&&u.side===1){if(st.burn>0){if(st.regrow){delete st.regrow;float(u,'Regrowth stopped','#ffb35a')}}
  else{st.regrow=1;if(u.hp<u.hpMax){const h0=u.hp;u.hp=Math.min(u.hpMax,u.hp+Math.round(u.hpMax*d.regen));float(u,'+'+(u.hp-h0),'#9bd96f');FX.emit('heal',{t:u,n:u.hp-h0})}}}}
function monStatus(d){const t=d&&d.t;if(!t||!t.alive)return;
 if(d.key==='root'&&t.fly){const n=(t.st.root||0)+2;if((t.sz||1)>1){delete t.st.root;if(t===B.cur)t.rooted=false}   // too big to pin down: the root cripples a wing instead
 if(!(t.st.grounded>=n)){t.st.grounded=n;float(t,'Grounded','#ffd27a');say(`${t.name} is grounded.`);if(t.dive)monDiveBreak(t)}}}
function monStunned(u){if(u&&u.dive)monDiveBreak(u)}
function monDeath(t){if(!B||!t)return;for(const o of B.units)if(o.coilBy===t){o.coilBy=null;delete o.st.coiled;if(o.st.root>0){o.st.root=0;o.rooted=false}}}
function monDiveBreak(u){u.dive=null;delete u.st.diving;if(typeof foeTele==='function')foeTele(u);float(u,'Dive broken','#ffd27a');say(`${u.name}'s dive is broken.`)}
// The tiles a dive lands on (its 2x2 footprint at z) and the ring around them: everything the impact reaches.
function monDiveKeys(z,s){const ks=[];for(let r=z.r-1;r<=z.r+s;r++)for(let c=z.c-1;c<=z.c+s;c++)if(inb(c,r))ks.push(key(c,r));return ks}
// Where a dive on t lands: a footprint over t's tile, on the board and on no prop, covering the most foes (ring counts half), the fewest friends.
function monDiveSpot(u,t){const s=u.sz||1;let best=null,bv=-1e9;
 for(let r=t.r-s+1;r<=t.r;r++)for(let c=t.c-s+1;c<=t.c;c++){if(c<0||r<0||c>BW-s||r>BH-s||footInfo(c,r,s).blk)continue;let v=0;
  for(const o of B.units){if(!o.alive||o===u)continue;const m=fdist(c,r,s,o);if(m>1)continue;const w=m?.5:1;v+=o.side===u.side?-1.5*w:w*(1+(o.back?.4:0))}
  if(v>bv){bv=v;best={c,r}}}return best}
// The nearest anchor to (c,r) where a size-s unit can stand (footFree), searching outward; null if none.
function monNearFoot(u,c,r,s,ex){for(let d=0;d<BW+BH;d++){for(let y=r-d;y<=r+d;y++)for(let x=c-d;x<=c+d;x++){if(Math.abs(x-c)+Math.abs(y-r)!==d)continue;if(ex&&occupiesZ(ex.z,ex.s,x,y))continue;if(footFree(x,y,s,u))return{c:x,r:y}}}return null}

const MON_AB={
 /* ---------- serpents: fast, venomous; the great serpent holds and crushes ---------- */
 vbite:{n:'Venom fangs',d:'A fast bite: full damage, +5 to hit, and the venom poisons for 3 turns (6 hitpoints a turn, through armor).',fat:0,tgt:'enemy',wpn:1,mult:1,hit:5,status:{poison:3},cd:1,fx:'bite'},
 slither:{n:'Slither',d:'Slides up to 2 tiles away without drawing free attacks.',ap:2,fat:0,rng:2,tgt:'move',cd:2,fx:'dash'},
 vspit:{n:'Venom spit',d:'Spits venom at a foe within 4 tiles: 80% damage, poisons for 2 turns and dazes (−15 to hit on its next turn).',fat:0,tgt:'enemy',wpn:1,needs:'bow',mult:.8,status:{poison:2,daze:1},cd:1,fx:'spit'},
 coil:{n:'Coil',d:'Wraps a foe in its coils: 60% damage, +10 to hit; the foe is Coiled for 2 turns (cannot move, −15 melee defense, −10 melee skill) until the serpent dies.',ap:5,fat:0,tgt:'enemy',wpn:1,mult:.6,hit:10,status:{root:2,coiled:2},cd:2,fx:'coil',
  async run(u,k,a){const t=unitAt(k%BW,(k/BW)|0);if(!t)return;if(kbImmune(t)&&(t.sz||1)>1){await strike(u,t,Object.assign({},a,{status:null}));return}const hit=await strike(u,t,a);if(hit&&t.alive)t.coilBy=u}},
 constrict:{n:'Constrict',d:'Squeezes the foe it holds in its coils: 150% damage, +30% armor piercing, +20 to hit.',fat:0,tgt:'enemy',wpn:1,mult:1.5,ignB:.3,hit:20,req:'coiled',fx:'crush'},
 /* ---------- ents: slow, bark-armored, regrowing; they root you, then crush. Fire is the answer ---------- */
 bramble:{n:'Bramble lash',d:'A thorned lash at a foe up to 2 tiles away, over anyone between: 80% damage, and it cannot move on its next turn.',ap:4,fat:0,rng:2,melee:1,tgt:'enemy',wpn:1,mult:.8,status:{root:1},cd:1,fx:'lash'},
 entangle:{n:'Entangle',d:'Roots burst up under a foe within 4 tiles: no damage, +15 to hit; it is Entangled for 2 turns (cannot move, −10 melee and ranged defense).',ap:4,fat:0,rng:4,tgt:'enemy',noDmg:1,nostun:1,hit:15,status:{root:2,entangled:2},noDmgTxt:'Entangled',cd:2,fx:'roots'},
 limbcrush:{n:'Crushing limbs',d:'Brings both limbs down on a foe that cannot move (rooted, entangled, webbed, coiled or stunned): 140% damage, +10 to hit, and it is dazed.',ap:4,fat:0,tgt:'enemy',wpn:1,mult:1.4,hit:10,req:'held',status:{daze:1},fx:'smash'},
 barkskin:{n:'Barkskin',d:'The bark thickens: 30% less damage taken for 2 turns.',ap:3,fat:0,tgt:'self',buff:{key:'bark',dr:.3},dur:2,cd:3,fx:'bark'},
 groots:{n:'Grasping roots',d:'Roots tear up the ground under a foe within 5 tiles: it and every foe beside it are Entangled for 2 turns (cannot move, −10 melee and ranged defense). Cannot miss.',ap:5,fat:0,rng:5,tgt:'enemy',melee:1,cd:3,fx:'roots',
  ai(u,X){let best=null,bv=0;for(const t of X.foes){if(mdist(u,t)>5)continue;let n=0,v=0;for(const o of X.foes)if(mdist(o,t)<=1&&!(o.st.root>0||o.st.entangled>0)){n++;v+=aiStatusVal('root',2,o)+3}if(n>=2&&v>bv){bv=v;best=t}}return best?[{k:key(best.c,best.r),v:bv}]:[]},
  async run(u,k){const t=unitAt(k%BW,(k/BW)|0);if(!t)return;for(const o of foeFoes(u).filter(o=>mdist(o,t)<=1).sort((x,y)=>x.id-y.id)){addStatus(o,'root',2);foeStatus(o,'entangled',2);float(o,'Entangled','#9bd96f')}await sleep(200)}},
 grove:{n:'Awaken the grove',d:'Two thornlings tear free of the earth beside the elder ent (twice a battle).',ap:4,fat:0,tgt:'self',cd:4,uses:2,fx:'summon',
  ai(u,X){let n=0;for(const [x,y] of DIRS)if(foeFree(u.c+x,u.r+y))n++;const th=B.units.filter(o=>o.alive&&o.side===u.side&&o.eid==='thorn').length;return n&&th<4&&X.near(u)<=6?[{k:X.at,v:30}]:[]},
  async run(u){let n=0;for(const [x,y] of DIRS){const c=u.c+x,r=u.r+y;if(n>=2||!foeFree(c,r))continue;const e=foeSpawn('thorn',u.f,c,r,{def:Object.assign({},EN.thorn,{xp:0})});if(!e)continue;e.ap=0;float(e,'Awakened','#9bd96f');n++;await sleep(180)}}},
 /* ---------- ogres: heavy weapons, and they throw you around ---------- */
 ohurl:{n:'Hurl',d:'A two-handed swing that throws the foe 2 tiles back: full damage, −5 to hit. Thrown into someone, both take 14; thrown off a height, it falls (6 a step).',ap:5,fat:0,tgt:'enemy',wpn:1,mult:1,hit:-5,kb:2,crash:14,cd:1,fx:'smash'},
 osweep:{n:'Sweeping blow',d:'A wide swing through every adjacent foe: 80% damage, −5 to hit, and each is knocked back 1 tile (10 to it and to whoever it is thrown into).',ap:6,fat:0,tgt:'aoe',wpn:1,mult:.8,hit:-5,kb:1,crash:10,fx:'sweep'},
 oslam:{n:'Ground slam',d:'Pounds the ground: every foe within 2 tiles is struck for 60% damage, dazed and thrown off balance (−10 melee and ranged defense); those adjacent are also knocked back 1 tile.',ap:6,fat:0,tgt:'self',wpn:1,melee:1,mult:.6,status:{daze:1,slammed:1},cd:3,fx:'quake',
  ai(u,X){let n=0,v=0;for(const t of X.foes){if(mdist(u,t)>2)continue;n++;const h=aiHit(u,this,t,X.S);v+=aiChance(u,this,t,X.at)*(h.v+h.kill*h.kv)*aiPrio(X,t)}return n>=2?[{k:X.at,v:v*.9}]:[]},
  async run(u,k,a){const b=B;for(const t of foeFoes(u).filter(t=>mdist(u,t)<=2).sort((x,y)=>x.id-y.id)){if(B!==b||!u.alive)break;const adj=mdist(u,t)===1,hit=await strike(u,t,a);if(hit&&adj&&t.alive&&!kbImmune(t))await knockback(u,t,1,8)}}},
 /* ---------- wyverns: end-game. It flies, stings, buffets and dives ---------- */
 wbite:{n:'Rending bite',d:'Jaws like a portcullis: 125% damage, +20% chance to hit the head.',fat:0,tgt:'enemy',wpn:1,mult:1.25,head:20,fx:'bite'},
 wsting:{n:'Tail sting',d:'The barbed tail strikes up to 2 tiles away, over anyone between: 70% damage, +20% armor piercing, and wyvern venom for 3 turns (14 hitpoints a turn, through armor).',ap:4,fat:0,rng:2,melee:1,tgt:'enemy',wpn:1,mult:.7,ignB:.2,status:{venom:3},cd:1,fx:'sting'},
 wbuffet:{n:'Wing buffet',d:'A blast of both wings: every adjacent foe takes 50% damage, is knocked back 2 tiles and dazed.',ap:5,fat:0,tgt:'aoe',wpn:1,mult:.5,kb:2,status:{daze:1},cd:2,fx:'buffet'},
 wdive:{n:'Dive',d:'Climbs into the sky over a foe within 8 tiles and marks where it will land. On its next turn it falls there: everyone on the 2x2 landing tiles takes 130% damage and is thrown clear, everyone beside them 80%. It cannot miss. Get clear, or stun or ground it to break the dive.',ap:6,fat:0,rng:8,melee:1,sure:1,tgt:'enemy',tele:1,cd:3,fx:'dive',
  ai(u,X){if(!canFly(u)||u.rooted)return[];let best=null,bv=0;const avg=(u.wpn.d[0]+u.wpn.d[1])/2*(1+buffSum(u,'dmg'));
   for(const t of X.foes){if(mdist(u,t)>8||mdist(u,t)<=1&&X.adj.length>1)continue;const z=monDiveSpot(u,t);if(!z)continue;let v=0;
    for(const o of X.foes){const m=fdist(z.c,z.r,u.sz||1,o);if(m>1)continue;v+=(m?.8:1.3)*avg*.45*aiPrio(X,o)+(o.back?6:0)}
    for(const o of X.allies)if(fdist(z.c,z.r,u.sz||1,o)<=1)v-=20;
    if(v>bv){bv=v;best=t}}return best&&bv>=40?[{k:key(best.c,best.r),v:bv}]:[]},
  async run(u,k){const t=unitAt(k%BW,(k/BW)|0);if(!t)return;const z=monDiveSpot(u,t);if(!z)return;u.dive=z;u.st.diving=1;u.ap=0;
   foeTele(u,'Dive',monDiveKeys(z,u.sz||1));float(u,'Taking wing…','#ffd27a');say(`${u.name} takes wing. Get clear!`);FX.emit('status',{t:u,key:'diving',n:1});await sleep(200)}},
 wdiveb:{n:'Dive',d:'The wyvern falls on the marked tiles.',ap:0,fat:0,tgt:'self',wpn:1,mult:1.3,fx:'dive-land',
  async run(u,k,a){const b=B,z=u.dive,s=u.sz||1;u.dive=null;delete u.st.diving;foeTele(u);if(!z)return;
   const hitL=foeFoes(u).filter(o=>fdist(z.c,z.r,s,o)<=1).sort((x,y)=>fdist(z.c,z.r,s,x)-fdist(z.c,z.r,s,y)||x.id-y.id);
   for(const o of hitL){if(B!==b||!u.alive)return;const inside=fdist(z.c,z.r,s,o)===0;await strike(u,o,a,{auto:1,splash:inside?1:.8/1.3});
    if(inside&&o.alive&&!kbImmune(o)){const m={c:z.c+(s-1)/2,r:z.r+(s-1)/2};let dc=o.c-m.c,dr=o.r-m.r;if(Math.abs(dc)>=Math.abs(dr)){dc=Math.sign(dc)||1;dr=0}else{dr=Math.sign(dr);dc=0}
     const nc=o.c+dc,nr=o.r+dr;if(inb(nc,nr)&&B.tiles[key(nc,nr)].t!=='block'&&!unitAt(nc,nr)&&!occupiesZ(z,s,nc,nr)){o.c=nc;o.r=nr;FX.emit('kb',{t:o});await sleep(120)}
     else{const f=monNearFoot(o,o.c,o.r,1,{z,s});if(f){o.c=f.c;o.r=f.r;FX.emit('kb',{t:o});await sleep(120)}}}}
   if(B!==b||!u.alive)return;const land=footFree(z.c,z.r,s,u)?z:monNearFoot(u,z.c,z.r,s);if(land){u.c=land.c;u.r=land.r;FX.emit('move',{u});await sleep(200)}}},
 hsting:{n:'Sting',d:'A hatchling\'s sting: 80% damage and poison for 2 turns (6 hitpoints a turn, through armor).',fat:0,tgt:'enemy',wpn:1,mult:.8,status:{poison:2},cd:1,fx:'sting'}
};
const occupiesZ=(z,s,c,r)=>c>=z.c&&c<z.c+s&&r>=z.r&&r<z.r+s;
for(const k in MON_AB)AB[k]=Object.assign({foe:1},MON_AB[k]);
