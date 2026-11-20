/* ================= FOE MASTERIES: the human foes' perks (rules: perkSum in 30-mercs.js, 60p-passives.js and the core) =================
   Every human foe carries a set of perks from the same MAST trees the company learns, so the same rules read them through the same
   flags (hitChance / dmgBonus / drOf / forecast see them like a merc's). The set is data, fixed per EN id (never rolled at spawn):
     FOEMAST[id] = {p:[perk ids] (always), v:[...] (added once the foe is a veteran: rank >= FOEMASTV.vet, the 'Veteran' name),
                    e:[...] (added for an elite rank: rank >= FOEMASTV.elite, the 'Elite' name)}
   One weapon mastery perk at most, for the family of the item it fights with (def.w); a style tree that fits the role; leaders and
   champions deeper, a few a capstone. Passives only: the foes keep their own abilities (def.abs). Goblins and orcs carry a lighter
   set (one or two low perks; goblins only once they are veterans); beasts, the dead (the necromancers are men: a Survivor perk), riftspawn and monsters none.
   foePerks(u) (called at the end of enemyInit, 64-foes.js) runs perkSum over the list and folds the result into the unit exactly as
   calc() does for a merc: stats, flags, the weapon's wmods (on the weapon object itself, so a swap to the sidearm leaves them behind),
   shield defense and shield hitpoints, throws. u.fpk holds the working perks (shown in the inspect card), u.fpkOff the idle ones.
   Rival companies' mercs, fabled warriors and anything with u.m never pass through here (calc() gives them their own perks).
   No randomness. */
const FOEMASTV={vet:1.5,elite:2.75};
const FOEMAST={
 // brigands (also the house troops and caravan guards, who are brigand stock under other names)
 thug:{p:['shieldbearer.2'],v:['shieldbearer.1'],e:['shieldbearer.5']},                  // the shield brigand: covers, then steps in front of his mates
 bmark:{p:['sharpshooter.1'],v:['marksman.3']},                                    // the archer: hobbles what runs at the line
 bxbow:{p:['sharpshooter.1'],v:['weapons.crossbow']},
 bgun:{p:['powder.1'],v:['weapons.flintlock'],e:['powder.3']},             // the gunner (a Grenadier's craft): smoke to hide in, a faster reload, then harder scattershot
 bknife:{p:['weapons.throwing'],v:['thrower.1']},
 braid:{p:['vanguard.1'],v:['vanguard.2','vanguard.3']},                           // the raider: charges in and shakes the line
 blead:{p:['tactician.1','tactician.3','shieldbearer.1'],v:['tactician.4'],e:['tactician.5']},
 // goblins and orcs: the lighter set (goblins only as veterans: their early bands are hard enough)
 gob:{p:[],v:['skirmisher.2']},
 gobarch:{p:[],v:['sharpshooter.1']},
 gobsham:{p:[],v:['tactician.2']},
 orcy:{p:['berserker.1']},
 orcw:{p:['berserker.1']},
 obrute:{p:['weapons.hammer']},
 orcl:{p:['berserker.1','tactician.3']},
 hstd:{p:['tactician.2']},
 hchief:{p:['berserker.1','tactician.3','vanguard.3']},
 // the necromancers: living men among the dead
 necro:{p:['survivor.1']},
 necrolt:{p:['survivor.1','survivor.3']},
 // the pit
 gmurm:{p:['shieldbearer.1'],v:['weapons.sword'],e:['shieldbearer.4']},
 gret:{p:['gladiator.2'],v:['weapons.spear'],e:['gladiator.4']},
 gthrax:{p:['gladiator.1'],v:['weapons.sword'],e:['champion.3']},
 gsecu:{p:['champion.1'],v:['shieldbearer.1'],e:['weapons.sword']},
 gchamp:{p:['weapons.sword','champion.1','gladiator.1'],v:['champion.3'],e:['shieldbearer.1']},
 // the northmen
 barbz:{p:['weapons.axe','berserker.1'],v:['berserker.4'],e:['brute.1']},
 barbax:{p:['weapons.throwing'],v:['thrower.1']},
 barbskald:{p:['tactician.2','tactician.3'],v:['tactician.4']},
 barbhus:{p:['weapons.axe','shieldbearer.1'],v:['bulwark.4'],e:['bulwark.1']},     // the huscarl: plants himself in the shield wall
 emperor:{p:['vanguard.3','berserker.1','tactician.3','survivor.3','vanguard.cap']},
 // the East
 ashi:{p:['skirmisher.1'],v:['weapons.spear'],e:['bulwark.1']},             // the ashigaru: a spear line that holds
 ashiy:{p:['scout.1'],v:['sharpshooter.1'],e:['marksman.3']},
 kageuchi:{p:['thrower.1'],v:['weapons.throwing']},
 shinobi:{p:['skirmisher.2'],v:['assassin.1']},
 sohei:{p:['weapons.polearm'],v:['medic.4']},
 onna:{p:['weapons.polearm'],v:['brute.1']},
 samurai:{p:['duelist.1'],v:['weapons.sword'],e:['duelist.2']},
 taisho:{p:['weapons.sword','tactician.1','tactician.3'],v:['tactician.4','duelist.1'],e:['duelist.2']}};
// The perk ids a foe of EN id `id` at rank L (log2 of its rank multiplier, u.rank; 0 or absent: a plain foe) carries, in order.
function foeMastList(id,L){const F=FOEMAST[id];if(!F)return[];const r=+L||0,out=(F.p||[]).slice();
 if(r>=FOEMASTV.vet&&F.v)out.push(...F.v);if(r>=FOEMASTV.elite&&F.e)out.push(...F.e);return out.filter((x,i)=>out.indexOf(x)===i)}
/* foePerks(u): the masteries of an EN foe folded into the unit (once: u.fpk marks it done). Returns u. */
function foePerks(u){if(!u||u.m||u.fpk||typeof perkSum!=='function')return u;const L=foeMastList(u.eid,u.rank);if(!L.length)return u;
 const w0=u.wpn||FIST,wpn=Object.assign({},w0,{d:w0.d.slice()});if(w0.reload)wpn.reload=Object.assign({},w0.reload);
 const sh=u.shpMax>0?{hp:u.shpMax}:null,P=perkSum(L,wpn,!!u.shield,typeof armorClass==='function'?armorClass(u):'light',sh);
 u.fpk=P.perks.slice();u.fpkOff=P.off.slice();u.wpn=wpn;
 const st=P.st;for(const k in st){const v=st[k];if(!v)continue;
  if(k==='hp'){u.hpMax+=v;u.hp+=v}else if(k==='ap'){u.apMax+=v;u.ap+=v}else if(k==='dmg')u.dmgB=(u.dmgB||0)+v;else if(k==='fat'){if(u.fatMax<999)u.fatMax+=v}
  else if(typeof u[k]==='number')u[k]+=v}
 const f=u.flags=Object.assign({},u.flags);for(const k in P.flags)f[k]=f[k]==null?P.flags[k]:f[k]+P.flags[k];
 if(f.shieldDef&&u.shb){const sd=f.shieldDef;u.shb={md:(u.shb.md||0)+sd,rd:(u.shb.rd||0)+sd};if(u.shield){u.md+=sd;u.rd+=sd}}   // as calc(): a raised shield's defense, gone with the shield
 if(sh&&(f.shieldHp||P.shHpOff)){const k=1+(f.shieldHp||0)+P.shHpOff;u.shp=u.shpMax=Math.round(u.shpMax*k)}
 for(const id of P.abs)if(AB[id]&&!u.abs.includes(id))u.abs.push(id);
 if(u.am){u.am=Object.assign({},u.am);for(const w of [u.wpn,u.wpnAlt])if(w&&(w.ammo||w.barrels>1))u.am[wkey(w)]=ammoMax(u,w)}   // Bandolier: the stack the battle starts with
 return u}
// Whether perk id is idle on u right now (a weapon mastery for another family than the one in hand, a shield perk with no shield up).
function foePerkIdle(u,id){const P=typeof perkById==='function'?perkById(id):null;if(!P)return false;const pw=P.perk.wt||P.tree.wt;
 if(P.tree.kind!=='weapon'||!pw)return!!(u.fpkOff&&u.fpkOff.includes(id));return pw==='shield'?!u.shield:!(u.wpn&&u.wpn.wt===pw)}
