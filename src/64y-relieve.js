/* ================= RELIEVE: the Bulwark's place trade (tier 1 of MAST.bulwark in 10-data.js; the icons: 06pr-relieve.js) =================
   Relieve (AB.relieve, perk bulwark.1, in place of Stand firm since PKV 4): the Bulwark and an ally beside it trade tiles, as Intercept's
   step-in does (64v-roles.js rlIntercept: both stand where the other stood, nothing else of either changes), but on the Bulwark's own turn,
   by choice, toward any ally that needs it. The rules:
     cost       3 AP, 12 fatigue, once a turn (a.perTurn: u.usedT, cleared at the start of the unit's turn)
     target     an ally of the Bulwark's side next to it (orthogonally), alive and on the field; both of size 1; neither held in place
                (rooted, webbed, netted, an anchored foe: rvStuck); a height step of at most 1 between the two tiles (one of them climbs it)
     safely     the trade is not a walk: neither unit draws a free attack, a spear wall's thrust or any zone-of-control strike (walkPath0
                is never entered), and neither takes the harm of the ground it steps onto (burning ground hurts at the start of its turn,
                as always, and not on the trade)
     not moving neither counts as having moved (u.mvd / u.mvN untouched): the Bulwark's Rooted and the like still hold, and so do the
                ally's; a Bulwark that walked earlier in the turn has moved all the same
   Presentation: a short step each (74-anim.js 'move' with step), the ally turning to face the tile it left (toward the line), a float, a
   line in the log; the auras (Battle orders, Cover, the foes' auras) are rescanned at once.
   The AI (AB.relieve.ai, aiBest's custom path): the hitpoints the two would lose this round where they stand now against where they would
   stand after the trade (each foe that can reach the tile: its expected blow, forecast() with the unit set on that tile), a lost hitpoint
   weighing more the closer the unit is to falling; worth taking when it spares the line, from where the Bulwark stands or from a tile
   beside the ally it can walk to. No randomness. */
const RLV={ap:3,fat:12,step:1};
const rvStuck=x=>!!(x.rooted||(x.st&&(x.st.root>0||x.st.webbed>0||x.st.netted>0))||(x.def&&x.def.anchored));
// can u (the Bulwark) trade places with t now?
function rvOK(u,t){if(!B||!u||!t||t===u||!t.alive||t.gone||!u.alive||t.side!==u.side||usz(u)!==1||usz(t)!==1||mdist(u,t)!==1||rvStuck(u)||rvStuck(t))return false;
 const a=B.tiles[key(u.c,u.r)],b=B.tiles[key(t.c,t.r)];return!!(a&&b&&Math.abs(a.h-b.h)<=RLV.step)}
// the foes that would strike u for leaving its tile on foot (what the trade spares it)
const rvZoc=u=>B?B.units.filter(e=>e.alive&&e.side!==u.side&&mdist(e,u)===1&&canFree(e)&&!e.aoo).length:0;
async function rvRun(u,k,a){const b=B,t=unitAt(k%BW,(k/BW)|0);if(!t||!rvOK(u,t)){u.ap+=a.ap;u.fat=Math.max(0,u.fat-a.fat);if(u.usedT)delete u.usedT[a.id];return}   // (validTargets keeps this from happening)
 const c=u.c,r=u.r;u.c=t.c;u.r=t.r;t.c=c;t.r=r;
 FX.emit('move',{u,step:1});FX.emit('move',{u:t,step:1,face:[u.c-t.c,u.r-t.r]});
 float(u,a.n,'#ffd27a');say(`${u.name} takes ${t.name}'s place.`);auraScan();if(typeof foeAuras==='function')foeAuras();
 await sleep(200);if(B!==b)return}
// the text while it is armed, and when no comrade can be reached
function rvSelTxt(u){const n=rvZoc(u);return'Tap a comrade beside you: neither of you draws a free attack'+(n?' ('+n+(n===1?' foe':' foes')+' beside you)':'')}
function rvNoTgt(u){const adj=B.units.filter(t=>t.alive&&t!==u&&t.side===u.side&&mdist(u,t)===1);if(!adj.length)return'No comrade beside you';
 if(usz(u)>1||rvStuck(u))return'You are held in place';return'No comrade beside you can trade places (too big, held in place, or a climb of more than 1 step)'}
/* ---- the AI ---- */
// the hitpoints o would lose this round standing on (c,r): every able foe that can reach the tile, its basic attack's expected blow
function rvThreat(o,c,r){const c0=o.c,r0=o.r;let v=0;o.c=c;o.r=r;
 try{for(const e of B.units){if(!e.alive||e.side===o.side||e.mor===0||(e.st&&e.st.stun>0)||!e.wpn)continue;const d=mdist(e,o),ea=abilityInfo(e,'attack');
   const reach=isRangedAtk(e,ea)?0:d<=Math.max(1,ea.rng||1)?1:d<=1+Math.floor((e.apMax||9)/2)-1?.45:0;if(!reach)continue;   // beside it now, or a short walk off
   const f=forecast(e,o,ea);v+=reach*f.hit/100*(f.hpMin+f.hpMax)/2}}finally{o.c=c0;o.r=r0}
 return v}
const rvLoss=(o,d)=>d<=0?0:d*(1+1.5*(1-o.hp/o.hpMax))+(d>=o.hp*.8?o.hpMax*.4:0)+(d>=o.hp?o.hpMax*.6:0);
function rvAi(u,X){const a=abilityInfo(u,'relieve');if(!canUse(u,a)||usz(u)!==1||rvStuck(u))return[];const out=[],c0=u.c,r0=u.r,cur=X.at;
 try{for(const t of X.allies){if(!t.alive||usz(t)!==1||rvStuck(t)||X.near(t)>3)continue;
   const tiles=[];if(mdist(u,t)===1)tiles.push(cur);
   if(!u.rooted)for(const [dx,dy] of DIRS){const nc=t.c+dx,nr=t.r+dy;if(!inb(nc,nr))continue;const s=key(nc,nr),e=X.D.get(s);if(s===cur||!e||e.air||e.cost+a.ap>u.ap||unitAt(nc,nr))continue;tiles.push(s)}
   for(const s of tiles){const sc=s%BW,sr=(s/BW)|0;u.c=sc;u.r=sr;if(!rvOK(u,t))continue;
    const now=rvLoss(t,rvThreat(t,t.c,t.r))+rvLoss(u,rvThreat(u,sc,sr)),then=rvLoss(t,rvThreat(t,sc,sr))+rvLoss(u,rvThreat(u,t.c,t.r)),v=now-then-4;
    if(v>0)out.push({s,k:key(t.c,t.r),v})}
   u.c=c0;u.r=r0}}finally{u.c=c0;u.r=r0}
 return out}
Object.assign(AB,{relieve:{n:'Relieve',ap:RLV.ap,fat:RLV.fat,rng:1,tgt:'ally',noSelf:1,perTurn:1,place:1,fx:'relieve',tgtOK:rvOK,run:rvRun,ai:rvAi,selTxt:rvSelTxt,noTgt:rvNoTgt,
 d:'Trade places with an ally beside you, once a turn. Neither of you draws a free attack, a spear wall\'s thrust or harm from the ground stepped onto, and neither counts as having moved. Both of size 1, neither held in place, no climb of more than 1 step.'}});
