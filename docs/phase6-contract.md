# Wyrdmarch: Phase 6 (company depth) completion, working contract

Wyrdmarch is a landscape mobile pixel-art tactics game (mercenary company sandbox in the spirit of
Battle Brothers, with four gifts Mana/Aura/Qi/Chi), shipped as ONE self-contained HTML file. This
checkout is the GitHub repo `KxDJordan/BattleBattalion` (branch `phase6-wip`). Source in `src/`;
`node build.js <out>` concatenates it (CSS, `body.html`, then all `src/*.js` in filename order in one
`'use strict'` script: every top-level name is a shared global; check for collisions). Never write
`index.html` (the lead rebuilds it). Read `docs/*.md` for the systems you build on.

Phase 6 goal (from the plan): "Mercs become distinct builds, and running the company becomes its own
game between fights." Done when: two level-11 mercs of the same background can be built into clearly
different roles, and the player always has a reason to spend crowns on something other than wages.
Already built: talent trees, gear tiers, famed items, helmets, sidearms, repair with tools.

## What this round adds (owner asked: complete the rest of Phase 6)

1. **Character traits**: 0-2 per merc, rolled at creation, weighted by background: about 24 traits,
   good and bad, that change stats and battle behaviour (and later, events).
2. **More backgrounds**: from 12 to about 30, each with its own identity, gear, gift odds, wage,
   trait weights, tree pool, up to 5 weapon trees and 1-2 armor trees, and a distinct look.
3. **Camp screen**: the Camp action opens a screen to rest/repair (as today), **train** a merc
   (crowns and hours for XP, limited per day), **field surgery** (shorten injuries), and **craft** gear
   and supplies from **monster parts** dropped by beasts and monsters.
4. **Company progression**: **renown tiers** that unlock bigger contracts, better recruits and more
   follower slots; **ambitions** (company goals with rewards, one active at a time); **retinue
   followers** hired in towns with passive bonuses.
5. **Roster of 20**, still fielding 12.

Quality bar: shipped, premium; beautiful pixel art; small floating battle HUD; readable rules;
deterministic under the seeded RNG; covered by tests.

## Shared design (fixed; build to it)

**Traits** (rules agent): `TRAITS[key] = {n, d, good:bool, st?:{stat deltas}, flag?:string,
mod?:{...}, wage?:number, opp?:key, bg?:{bgKey:weight}}`; merc `m.traits = [keys]` (0-2, never a
trait and its `opp`). `traitsOf(m)` -> list of trait defs. Effects through `calc(m)` (stats) and battle
flags in 60-battle-core.js (resolve, morale on kills/deaths, damage vs wounded, fatigue recovery,
initiative, head-hit chance, luck...). Ideas: brave/craven, iron-jawed/glass-jawed, athletic/asthmatic,
quick/sluggish, eagle-eyed/near-sighted, bloodthirsty, lucky, steady-handed, drunkard, greedy (+wage),
loyal, superstitious (-resolve vs undead/void/wyverns), tough/fragile, hulking/tiny, night-owl,
dexterous/clumsy, fearless of beasts, cocky. Every trait's `d` states exact numbers.

**Backgrounds** (rules agent): about 30 `BG` entries with the existing fields (style, pool, wt <= 5,
at 1-2, gear, cost, wage, gift odds `r`, stat mods `st`) plus `tr` (trait weights) and `look`
(appearance hints for art: `{hat, cloth, accent, trim, hair?, beard?}` using existing look vocabulary in
07-portraits.js/73-units.js). Ideas: gravedigger, butcher, blacksmith, miner, fisherman, shepherd,
woodcutter, poacher, bowyer, mason, caravan guard, deserter, bandit, pit fighter, gladiator,
retired soldier, watchman, noble scion, hedge knight, witch hunter, pilgrim, scholar, apothecary,
flagellant, sailor, nomad horseman, beggar, minstrel, ex-cultist. Town tavern recruit pools draw from
them by town size/biome; rare ones are rarer.

**Roster**: `MAXROSTER = 20`, `MAXFIELD = 12`.

**Monster parts and crafting** (camp agent, `13-craft.js`): `PARTS[key] = {n, d, tier, icon}`
(serpent scale, venom gland, ent heartwood, ent sap, ogre hide, ogre bone, wyvern scale, wyvern
venom, wyvern wing membrane, wolf pelt, spider silk, owlbear hide, orc tusk, goblin trinket, void
shard, bone dust...); drops from enemies by EN id: `PARTDROP[enKey] = [[partKey, chance]]`; company
stock `G.parts = {key: count}`; `partsDrop(result)` -> `[{key,n}]`, applied by the progression agent's
`resolveBattle` (68-battle-flow.js) to `G.parts`. `RECIPES[id] = {n, d, parts:{key:n}, crowns, hours,
out:{item:id}|{tools:n}|{food:n}|{salve:n}}`. Crafted gear are new static `ITEMS` entries
registered from `13-craft.js` (`craft:1`, a tier, a unique `look`, never sold in markets, each a
worthwhile alternative with a monster theme: wyvern-scale cuirass, heartwood stave, serpent-hide
jerkin, ogre-bone maul, silk-wrapped bow...). `craftCan(id)`, `craftDo(id)`.

**Camp screen** (camp agent, `56-camp.js`, `camp.css`): `campOpen()` opens a pixel panel with tabs
Rest, Train, Surgery, Craft, Parts. Rest = today's camp (advance 6 hours, heal, repair with tools,
report). Train: pick a merc, spend crowns and hours for XP (daily cap per merc, scaled by level and
followers). Surgery: spend hours and supplies (salve) to shorten injuries (better with the medic
talent tree and the surgeon follower). The world's Camp button calls `campOpen()` when defined.

**Renown, ambitions, retinue** (progression agent, `14-company.js`):
- `RENOWN = [{n, min, ...unlocks}]` tiers (e.g. Unknown, Known, Respected, Renowned, Famed,
  Legendary); `renownTier()`; unlocks: highest contract difficulty and faction tier offered, contract
  pay multiplier, recruit level range, follower slots (1 to 5).
- `AMBITIONS[id] = {n, d, test(G)->[progress, goal], reward:{renown, crowns, item?...}}`; `G.amb =
  {cur, done:[], offered:[]}`; offered three at a time, one active; completing pays and offers new.
- `FOLLOWERS[id] = {n, d, cost, renown, effect}`; `G.retinue = [ids]`; `followerHas(id)`. Ideas:
  scout (vision +2 tiles, see band strength), quartermaster (food lasts 25% longer, +carry), surgeon
  (injuries heal 50% faster, surgery cheaper), armorer (tools repair 50% more), drillmaster (+20%
  XP, training cheaper), cook (+5 resolve at battle start), cartographer (+15% speed on roads),
  recruiter (recruits cost 25% less, one more recruit per tavern), herbalist (+parts yield),
  standard-bearer (+5 resolve to fielded mercs in battle), paymaster (wages -15%). Hired in towns
  (a tab in the tavern), slots by renown tier.
- The rules agent reads follower effects that touch battle or merc stats via `followerHas`;
  the progression agent wires world/town/economy effects itself.

**Saves**: one save version bump owned by the rules agent (`20-state.js`), migrating to:
`m.traits=[]` (old mercs get none, or roll from background: rules agent decides and documents),
`G.parts={}`, `G.retinue=[]`, `G.amb={cur:null,done:[],offered:[]}`. Other agents tell the rules
agent their fields early (via the lead) and validate their own fields with repair helpers they
expose (`craftRepair(G)`, `companyRepair(G)`), which `repairSave` calls when defined.

## Hard rules for every agent

- Four agents work in this folder at once. Edit ONLY the files you own. Code against this contract
  with fallbacks (`typeof X==='function'`); list requests in your final report.
- Land data and API stubs first, then deepen.
- Build to `dist/<yourname>.html`. Never write `index.html`. No git commands. No new dependencies.
- Game randomness via `rnd/ri/pick/shuffle`; UI never consumes it; `forecast()` stays exact.
- `node test/headless.js --quick`, `node test/forecast.js`, `node test/items.js`,
  `node test/smoke.js dist/<you>.html 667 375` must pass on your build when you finish.
- Pixel art: only `PAL` colours, 16x16 icons with 1px `'0'` outline; look at what you make.
- Viewports 667x375, 844x390, 1280x720, tall 520x800; reduced motion; safe areas.
- Scratch files and screenshots in `shots/<yourname>/` (gitignored).

## File ownership

| Agent | Owns |
| --- | --- |
| rules | `10-data.js` (BG, RACE, TRAITS, MAXROSTER; not ITEMS/EN/FACT), `30-mercs.js`, `60-battle-core.js`, `61-talents.js`, `62-forecast.js`, `63-ai.js`, `20-state.js`, `test/headless.js`, `test/forecast.js`, `test/balance.js` |
| camp | new `13-craft.js`, new `56-camp.js`, new `camp.css`, new `test/craft.js` |
| progression | new `14-company.js`, `40-world.js`, `50-towns.js`, `51-townview.js`, `town.css`, `68-battle-flow.js`, `85-game.js`, new `test/company.js` |
| look | `06-icons.js`, `07-portraits.js`, `73-units.js`, `55-company.js`, `52-panels.js`, `panels.css`, `90-shell.js`, `body.html`, `style.css`, `65-battle-ui.js`, `battle-hud.css`, `82-inspect.js`, `inspect.css` |
