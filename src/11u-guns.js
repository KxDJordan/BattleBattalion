/* ================= GUNS ON THE ROAD: the brigand gunner (the gun backgrounds) =================
   Loads after 11t-arms.js. The gun backgrounds themselves (arquebusier, siege gunner, pistoleer, sapper, fowler, musketeer) are in
   10-data.js with the other backgrounds; their Gunnery tree is pinned by BG.core (rollTrees, 61-talents.js). Here: a brigand with a hand
   cannon in the brigands' bands (between the crossbowman and the raider), slow to reload, a heavy ball and a scattershot. Art: 07-portraits.js
   and 73-units.js (case 'bgun'); foe masteries 64m-foemast.js; coat 47-tailor.js; parts 13-craft.js. */
Object.assign(EN,{
 bgun:{n:'Brigand gunner',hp:48,arm:30,helm:18,ms:42,rs:46,md:4,rd:6,init:92,d:[28,46],w:'handgonne',xp:135,role:'sniper',brv:26,flee:.4,abs:['blast'],side:{n:'Falchion',wt:'sword',d:[18,30],ap:4,fat:0,rng:1,ign:.2}}});
if(FACT.bandit){const U=FACT.bandit.units,i=U.findIndex(x=>x[0]==='bxbow');if(!U.some(x=>x[0]==='bgun'))U.splice(i>=0?i+1:U.length,0,['bgun',34]);
 for(const id of ['handgonne','arquebus'])if(!FACT.bandit.loot.includes(id))FACT.bandit.loot.push(id)}
