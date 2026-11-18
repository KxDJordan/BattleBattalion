/* ================= ARMS: the foes' side of the masteries update (items and rules: 11t-arms.js, 60p-passives.js) =================
   Off balance (Shield bind) ticks like the foes' own statuses (FOE_ST t:1: one off at the start of the bearer's turn) and lowers melee
   defense through FOE_MOD (foeAuras folds it into the unit's buff at once, so hitChance and forecast() read it before the next blow).
   Hobbled is counted down by the rules themselves (pvTurn), so it is a plain STATUS. The East's shuriken thrower joins its levies. */
if(typeof FOE_ST==='object'){FOE_ST.offbal=Object.assign({},STATUS.offbal,{t:1});if(typeof FOE_MOD==='object')FOE_MOD.offbal={md:-10}}
if(typeof addStatus==='function'&&!addStatus.tw){const a0=addStatus;addStatus=function(t,key,n){const had=t&&t.st?t.st[key]||0:0,r=a0(t,key,n);if(key==='offbal'&&t&&t.st&&(t.st[key]||0)!==had&&typeof foeAuras==='function')foeAuras();return r};addStatus.tw=1}
if(FACT.east&&EN.kageuchi&&!FACT.east.units.some(x=>x[0]==='kageuchi')){FACT.east.units.splice(3,0,['kageuchi',34]);if(Array.isArray(FACT.east.loot)&&!FACT.east.loot.includes('shuriken'))FACT.east.loot.push('shuriken')}
if(EN.barbax&&!EN.barbax.w){EN.barbax.w='taxe';delete EN.barbax.rng}   // the northmen's axe thrower (18-crises.js) throws real axes now, three to a battle, then fights with his bearded axe
