/* ================= TWIN BLADES: the off-hand rules (the Twin blades tree is MAST.dualwield in 10-data.js) =================
   A merc may carry a light one-handed weapon in the shield slot (m.eq.s) instead of a shield. It is used only beside a one-handed
   melee weapon in hand (the main weapon, or the sidearm after a swap); with a two-handed or ranged weapon in hand it is idle (like a
   slung shield). Shields and off-hand weapons share the slot, so they never come together.
     isOffW(it)    an off-hand weapon: one-handed, melee, and light: any dagger or fist weapon, a blade of at most DW.fat fatigue
                   (short swords, the gladius, the sica, the wakizashi), or a hatchet (an axe of at most DW.axeFat fatigue)
     dwMainOK(it)  a weapon that can fight beside one: a one-handed melee weapon item (bare fists cannot)
     offItem(m)    the off-hand weapon item the merc carries, or null      dwPairs(m)  it has a partner in either weapon slot
     slotTakes(slot, id)  the item kind a slot takes ('s': a shield or an off-hand weapon)
   Untrained, the off hand is clumsy: the off-hand blow that follows every Attack (64w-dualwield.js) strikes at DW.base (50% of the
   off-hand weapon's damage, −10 to hit); Off-hand training (dualwield.1) makes it DW.train (75%, no penalty), Ambidextrous (dualwield.6)
   DW.ambi (100%). An Attack with a weapon in each hand costs DW.atkFat of the off-hand weapon's fatigue more.
   calc() (30-mercs.js) puts the off-hand weapon object in s.dw while it is in use (s.dwId: the item; s.dwIdle: carried but idle) and adds
   flags.dwDef (Cross guard, the capstone) to melee defense while it is in use. Battle units carry it as u.dw (60-battle-core.js). */
const DW={fat:8,axeFat:9,base:{mult:.5,hit:-10},train:{mult:.75,hit:0},ambi:{mult:1,hit:0},atkFat:.5};
function isOffW(it){if(!it||(it.k&&it.k!=='w')||it.two||(typeof RANGEDWT!=='undefined'&&RANGEDWT.includes(it.wt))||!Array.isArray(it.d))return false;
 const f=it.fat||0;return it.wt==='dagger'||it.wt==='fist'||f<=DW.fat||(it.wt==='axe'&&f<=DW.axeFat)}
function dwMainOK(it){return!!(it&&it.k==='w'&&!it.two&&!(typeof RANGEDWT!=='undefined'&&RANGEDWT.includes(it.wt)))}
function offItem(m){const id=m&&m.eq&&m.eq.s,it=id&&ITEMS[id];return it&&it.k==='w'&&isOffW(it)?it:null}
function dwPairs(m){if(!offItem(m))return false;const e=m.eq;return dwMainOK(ITEMS[e.w])||dwMainOK(ITEMS[e.b])}
function isShieldId(id){return!!(id&&ITEMS[id]&&ITEMS[id].k==='s')}
function slotTakes(slot,id){const it=ITEMS[id];if(!it)return false;if(slot==='s')return it.k==='s'||(it.k==='w'&&isOffW(it));return it.k===(slot==='b'?'w':slot)}
// The off-hand blow that follows an Attack, for unit (or calc) flags f: {mult, hit} before the capstone's dwOffDmg / dwOffHit (which every
// off-hand blow gets: dwStepAb in 64w-dualwield.js).
function dwFollowOf(f){f=f||{};const B0=f.dwAmbi?DW.ambi:f.dwTrain?DW.train:DW.base;return{mult:B0.mult,hit:B0.hit}}
