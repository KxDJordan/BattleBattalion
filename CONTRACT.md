# Wyrdmarch: talents and arms rework, working contract

Wyrdmarch is a mobile browser tactics game (mercenary company sandbox in the spirit of Battle
Brothers, with a fantasy layer: four gifts Mana/Aura/Qi/Chi), landscape-only, pixel art, shipped as ONE
self-contained HTML file. This checkout is the GitHub repo `KxDJordan/BattleBattalion`. Source lives
in `src/`; `node build.js <out>` concatenates it (CSS files, `body.html`, then all `src/*.js` in
filename order inside one `'use strict'` script, so every top-level `function`/`const`/`let` is a
shared global: check for collisions before adding one). `index.html` at the repo root is the shipped
build: never write it; the lead rebuilds it at merge.

## What the owner asked for (verbatim intent)

1. Masteries are **dynamic**: an archer background with Aura gets archer (ranged) Aura skills, not the
   melee ones. Every gift adapts to the merc's fighting style.
2. **More diversity**: today most backgrounds share the same masteries and each merc has only 3
   trees, so builds are samey. There must be many more trees, background-specific pools, and more
   trees per merc, so two mercs of the same background can be built very differently.
3. **Tiered unlocks across all trees**: level 1 unlocks ALL tier-1 perks of every tree the merc has;
   level 2 unlocks all tier-2 perks; and so on. A tier-2 perk does NOT require the tier-1 perk of the
   same tree.
4. **Weapon trees unlocked at level 3**: abilities and enhancements for a specific weapon family. Each
   background may only use certain weapon trees, and race can forbid some (a half-orc never gets the
   bow tree).
5. **Ranged lock** like Battle Brothers: a unit directly next to an enemy cannot use ranged weapon
   attacks. Add a **sidearm / backup weapon slot** so archers can swap to a dagger, and handle swapping
   one-handed to two-handed and back correctly (shields).

Quality bar: a shipped, premium game. Rules deterministic under the seeded RNG, readable before the
player acts (every new rule shows in the forecast, HUD or tooltips), covered by tests. The owner asked
for beautiful graphics and effects: new abilities get proper pixel icons and animations.

## The design (fixed; build to it)

**Tree kinds.** `MAST[key] = {n, d, kind, ...}` where `kind` is:
- `'style'`: mundane combat trees. At least 12 (keep `vanguard bulwark marksman skirmisher`; add
  e.g. duelist, brute/two-hander, shieldbearer variants, tactician/leadership, survivor, field medic,
  scout, berserker, sharpshooter, etc.: the talents agent designs them). 6 tiers.
- `'gift'`: resource trees with `res` in `mana aura qi chi` and `style` in
  `melee ranged caster support`. Each gift has variants: every gift has a `melee` and a `ranged`
  variant; mana also has `caster` (today's Arcana); chi also has `support` (today's Inner flow).
  Keep today's four gift trees under their current keys (`mana` = caster, `aura` = melee, `qi` =
  melee, `chi` = support) so saves keep working; add the others under new keys (e.g. `mana_m`,
  `mana_r`, `aura_r`, `qi_r`, `chi_m`, `chi_r`). 6 tiers.
- `'weapon'`: one per weapon family `wt`: `sword axe mace dagger spear bow staff fist` (spear covers
  pikes; fist covers unarmed and monks). 3 tiers. Each tier offers 2 perks (an active ability or a
  passive enhancement for that weapon). Weapon perks only take effect while a weapon of that family is
  in hand.

Each tree: `{n, d, kind, res?, style?, wt?, tiers:[[perk,...], ...]}`. Perk:
`{id, n, d, st?:{stat deltas}, ab?:abilityId, flag?:string, res?:number, regen?:number, mod?:{...}}`
with a globally unique `id` (e.g. `'duelist.3'`, `'bow.2b'`). `perkById(id)` → `{perk, tree, tier}`.

**Style of a merc.** `BG[bg].style` in `melee ranged caster support`. A merc's gift variant is chosen
from its background style at creation and stored: `m.gift = treeKey` (or null). Mapping: style →
variant of that style if the gift has one, else `melee`. So a hunter with Aura gets `aura_r`, a
militiaman with Aura gets `aura`, a hedge mage with Mana gets `mana`, an acolyte with Chi gets `chi`.

**Which trees a merc has.** `m.trees = [treeKeys]` fixed at creation:
- 4 style trees drawn (seeded) from the background pool `BG[bg].pool` (6 to 9 trees per background,
  different per background, overlapping only partly);
- plus the gift tree `m.gift` if the merc has a gift;
- weapon trees are NOT stored: they come from `BG[bg].wt` (allowed families, 3 to 5 per background)
  minus `RACE[race].noWt` (e.g. half-orc: `['bow']`), via `weaponTrees(m)`.

**Unlocks.** `tierLevel(kind, t)`: style and gift tier `t` (1..6) unlocks at level `t`; weapon tier `t`
(1..3) unlocks at level `3*t` (3, 6, 9). Any unlocked perk of any of the merc's trees can be learned
with a perk point; no same-tree prerequisite. One perk point per level (level 1 included), so 15
picks over a career. The first perk learned in a gift tree **awakens** the gift (grants its base pool,
30) whatever its tier; gift abilities need the gift awakened, which learning them guarantees.

**Merc fields.** `m.trees`, `m.gift`, `m.perks = [perkIds]` (learned), `m.pp` (unspent points, as now).
`m.mast` is retired (migrated). `calc(m)` derives stats, abilities, flags and resource pools from
`m.perks`.

**Talent API** (talents agent provides, everyone else calls):
- `mercTrees(m)` → `[{key, tree, kind}]` style + gift + weapon trees, in display order.
- `perkOptions(m)` → `[{id, perk, key, tree, tier, kind, owned, unlocked, need:level}]` for every
  perk of every tree the merc has.
- `canLearn(m, id)` → bool; `learnPerk(m, id)` → bool (spends a point; awakens a gift; heals the
  hitpoint delta like today's `learn`).
- `perkById(id)`, `giftVariant(m)`, `weaponTrees(m)`, `mercStyle(m)`, `mercRes(m)` (kept).
- `autoLearn(m)` spends all points on a sensible build for the merc's role (used by tests, recruits
  that arrive with levels, and an "Auto" button).

**Sidearm slot and weapon swap.** New equipment slot `m.eq.b` (backup weapon; any weapon, one- or
two-handed). In battle a unit holds one weapon: `u.wid` (item id in hand), `u.alt` (the other, or
null). Ability `swap` ("Swap weapons", 4 AP, no fatigue) exchanges them; a `quickhands`-style perk
can make the first swap each turn free. Shields: a shield in `m.eq.s` is **raised** only while a
one-handed weapon (or nothing) is in hand; with a two-handed weapon in hand it is **slung**: no
defence bonus, no shield skills, cannot be split, but its fatigue still counts. Out of battle the
shield may be equipped if either weapon is one-handed; it is refused only when both weapons are
two-handed. Weapon skills (`ITEMS[id].sk`), weapon-tree perks, damage, range, sprite and the forecast
all follow the weapon **in hand**. Units start battle with the main weapon (`m.eq.w`) in hand.

**Ranged lock.** A unit with an able enemy adjacent (alive, not fleeing, not stunned) cannot use
ranged weapon attacks: any ability that uses a bow (`a.wpn` with a bow in hand, or `a.needs:'bow'`).
Spells (`a.magic`) are not locked. `rangedLocked(u)` → bool; `canUse` and `validTargets` respect it,
the HUD and forecast say why. Applies to enemies too (enemy archers get sidearms in their `def`:
`def.side = {n, d:[min,max], ...}` or an item id; the AI swaps).

**Saves.** Bump `SAVEVER`. Migration: each merc keeps everything; `m.trees` = its old mastery keys
(mapped to new keys) topped up to 4 style trees from its background pool; `m.gift` = old gift key if
any (old keys stay valid trees); `m.perks` = the first N tier perks of each old tree it had N in
(their old perks keep their ids/effects); `eq.b = null`. Old saves must load and play.

## Hard rules for every agent

- Four agents work in this folder at once. Edit ONLY the files you own. Never edit another agent's
  file; code against this contract with fallbacks (`typeof X==='function'`); list requests in your
  final report.
- Build to your own output: `node build.js dist/<yourname>.html` (`dist/` is gitignored). Never write
  `index.html`. Another agent's half-saved file can break your build briefly: wait and rebuild.
- No git commands. No dependencies or external resources (strict CSP).
- Game randomness through `rnd/ri/pick/shuffle` (seeded). Visuals, previews and UI never consume it.
- `node test/headless.js --quick`, `node test/forecast.js`, `node test/smoke.js dist/<you>.html 667
  375` must pass on your build when you finish (headless and forecast run the rules in node with DOM
  stubs: guard module-level DOM access).
- Pixel art uses ONLY `PAL` colours (`src/05-pixel.js`); icons 16x16 with a 1px `'0'` outline
  (`src/06-icons.js`). Fonts: `'Jersey 15'` for pixel headings and numbers, `'Alegreya Sans'` for text.
  Look at what you make (Playwright screenshots, zoomed) before calling it done.
- Viewports: 667x375 (smallest), 844x390, 1280x720, tall pane 520x800. Honor reduced motion. The owner
  wants the battle HUD to stay small floating windows and icons so the map stays visible.
- Scratch files and screenshots in `shots/<yourname>/` (gitignored).

## File ownership

| Agent | Owns |
| --- | --- |
| talents | `10-data.js` except the `EN`/`FACT` tables, `30-mercs.js`, `20-state.js`, `60-battle-core.js`, `61-talents.js` (new), `62-forecast.js`, `test/headless.js`, `test/forecast.js` |
| builds | `55-company.js`, `52-panels.js`, `panels.css`, `50-towns.js`, `51-townview.js`, `town.css`, `67-deploy.js`, `deploy.css`, `68-battle-flow.js` |
| show | `65-battle-ui.js`, `battle-hud.css`, `06-icons.js`, `07-portraits.js`, `73-units.js`, `74-anim.js`, `75-fx.js`, `82-inspect.js`, `inspect.css`, battle section of `70-render.js` |
| ai | `63-ai.js`, `64-foes.js`, the `EN` and `FACT` tables in `10-data.js`, `test/balance.js` |

The talents agent lands the data tables (`MAST`, `BG.style/pool/wt`, `RACE.noWt`) and the talent API
(even as stubs) in its first pass, before deep rules work, so the others can build against them.
