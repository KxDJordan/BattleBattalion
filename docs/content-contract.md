# Wyrdmarch: gear variety, famed items, new monsters and spawn ranges, working contract

Wyrdmarch is a landscape mobile browser tactics game (mercenary company sandbox in the spirit of
Battle Brothers, with four gifts Mana/Aura/Qi/Chi), pixel art, shipped as ONE self-contained HTML
file. This checkout is the GitHub repo `KxDJordan/BattleBattalion` (branch `content-wip`). Source is
in `src/`; `node build.js <out>` concatenates it (CSS files, `body.html`, then all `src/*.js` in
filename order inside one `'use strict'` script: every top-level name is a shared global, check for
collisions). `index.html` at the repo root is the shipped build: never write it; the lead rebuilds it.
Earlier design notes are in `docs/` (read `docs/features-contract.md` and `docs/talents-contract.md`
for the systems you build on).

## What the owner asked for

1. **More types and strengths of every weapon and armor** (and helmets and shields): more items per
   family across price tiers, each with its own stats.
2. **Famed weapons and armor**: rare items with a **gold glow** and **randomly increased stats**,
   that come from **late-game fights**.
3. **Every weapon and armor has its own unique look and icon.** Today the kite shield looks just like
   a buckler in battle; nothing may share a look.
4. **New enemies with unique art**: **Serpents**, **Ents**, **Wyverns** (large monster occupying
   **4 tiles** (2x2), end-game, extremely difficult), **Ogres** (large monster, mid-game, specialise in
   knockbacks and heavy weapons), **Armored Ogres** (large monster, mid-game, heavy weapons and armor).
5. **Spawn ranges**: difficult enemies spawn **further from towns, in their own biomes**, and come
   **closer as the company grows stronger and days pass**.

Quality bar: a shipped, premium game; beautiful pixel art and effects; small floating battle HUD;
every rule readable before acting (forecast, tooltips); deterministic rules under the seeded RNG.

## Shared design (fixed; build to it)

**Item catalog.** Every item in `ITEMS` gets `tier` (1..5) and a `look` key that is **unique per
item** (default: its own id) so art can draw each one distinctly. Targets: every weapon family
(`sword axe mace dagger spear bow staff hammer polearm greatsword crossbow flintlock`) has 5 to 7
items spanning tiers 1-5 with meaningfully different stats (not only bigger numbers: speed vs damage,
armor pierce, reach, accuracy, fatigue, special skills); body armor 14+ (cloth, padded, leather,
brigandine, mail, lamellar, scale, plate variants, warded robes for casters); helmets 12+; shields
12+ across all `look` families (`buckler round kite heater tower spiked` plus new ones if wanted:
`targe`, `pavise`...). Keep every existing id (saves hold ids). Markets stock by tier (towns of size
3 and late days stock higher tiers).

**Famed items.** A famed item is a registered `ITEMS` entry with a unique id `'f:'+n` built from a
base item: `{...ITEMS[base], famed:1, base, n:'<generated name>', mods:{stat:delta,...}, price}`.
Rolls: 2 to 4 random improvements drawn from what suits the item (damage range, armor pierce, hit,
AP cost -1 (rare), fatigue, range for ranged; armor points, fatigue, md/rd for shields and armor),
each by a random amount within bounds, total power scaling with the fight that dropped it. Names from
a generated table ("The Widow's Bite", "Gravewarden Mail"...). All famed defs persist in `G.famed =
{id: def}` and are re-registered into `ITEMS` on load (`registerFamed()`), so every existing code path
that does `ITEMS[id]` keeps working. Created by `makeFamed(baseId, power)` using the game RNG (it is
loot). **Drops**: only from late-game fights: chance scales with enemy rank/budget and day (none
before ~day 25 or below a strength threshold), guaranteed from end-game kills (wyverns, the rift
tyrant, elite boss enemies). Never sold in markets (selling them is allowed). Display: gold name and a
gold glow around the icon in every UI list (CSS class `famed` on the icon wrapper: soft animated glow,
static under reduced motion), the stat block lists the improvements, and in battle the item glints
gold on the unit sprite.

**New factions.** Added to `FACT` with `biomes`, `tier` and spawn rules (below):
- `serpent` (Serpents; swamp and desert; early-mid): small fast adders (poison), spitting vipers
  (ranged venom), a great serpent (large sprite, one tile: coil grab and crush).
- `ent` (Ents; forest; mid): thornlings/saplings, ents (large sprite, one tile: slow, very tough
  bark armor, root/entangle, regenerate), an elder ent; **weak to fire** (burn and fire abilities do
  extra damage): the faction's answer.
- `ogre` (Ogres; hills, mountains' edge, plains; mid): ogres (large sprite, one tile: heavy club or
  maul, **knockback** specialists, sweeping blows) and **armored ogres** (heavy armor and helmet,
  heavy weapons), optionally goblin hangers-on.
- `wyvern` (Wyverns; mountains, snow, hills; **end-game**, extremely difficult): the wyvern occupies
  **2x2 tiles** (`def.size:2`), flies (ignores height steps and props when moving), tail sting with
  heavy poison, bite, wing buffet knockback, a telegraphed dive; may come with 1-2 hatchlings (one
  tile). A lone wyvern should challenge a strong level-12 company.
Each new faction has loot, a rank curve, AI roles/plan, contracts ("Slay the wyvern of X"), lairs.

**Multi-tile units (`def.size:2`).** A size-2 unit at `(c,r)` occupies `(c,r) (c+1,r) (c,r+1)
(c+1,r+1)`. Rules helpers (monsters agent, 60-battle-core.js): `unitTiles(u)`, `occupies(u,c,r)`;
`unitAt(c,r)` returns it for any of its tiles; `mdist(a,b)` is the distance between footprints;
movement, reach (dijkstra), placement, LOS (blocks all four tiles), adjacency/free attacks, aoe and
knockback (size-2 cannot be knocked back) all respect footprints. Board drawing and picking (monster
art agent, 70-render.js battle section) anchor the sprite on the footprint centre and draw it in the
correct depth order; tapping any of its tiles picks it.

**Spawn ranges.** `FACT[f].biomes` (world terrain codes or names) and `FACT[f].tier`
(`early mid late end`). `spawnParty` (40-world.js) chooses factions by the company's strength
(`companyPower()`: from fielded mercs' levels and gear) and day: early factions anywhere near towns;
mid/late/end factions only on their own biomes and at a minimum distance from the nearest town that
shrinks as power and day grow (e.g. end-game: 18+ tiles at first, down to 8 late; on worlds less remote
than the vast one the far reach shrinks to fit the map, never nearer than 5 tiles: `SPAWNR`). Strong bands
are rarer and never in the start region. Existing factions get tiers too (goblins/brigands/beasts
early, undead/orcs mid, riftspawn per crisis). Hunt contracts use the same rule via
`factionPool(ctx)` (monsters agent provides; items agent's 50-towns.js `genContract` calls it).

**Art hooks for monsters.** The monster art agent writes `src/76-monsters.js` with
`monsterSpritePx(u, face, state, frame)` → `{cv, ax, ay}` or null, `monsterPortrait(key)` → 32x32
canvas or null, band sprites for the world map, and ability/status icons it adds to `ICONS`. The item
art agent makes `unitSpritePx` (73-units.js) and `portraitCanvas` (07-portraits.js) call those first
for enemies (two lines each, early in its work).

## Hard rules for every agent

- Four agents work in this folder at once. Edit ONLY the files you own. Never edit another agent's
  file; code against this contract with fallbacks (`typeof X==='function'`); list requests in your
  final report.
- Land your data/API first (catalog, `FACT`/`EN` entries, function stubs), then deepen, so the other
  agents can build against real data.
- Build to your own output: `node build.js dist/<yourname>.html` (`dist/` is gitignored). Never write
  `index.html`. Another agent's half-saved file can break your build briefly: wait and rebuild.
- No git commands. No dependencies or external resources.
- Game randomness through `rnd/ri/pick/shuffle` (seeded). Visuals and UI never consume it.
- `node test/headless.js --quick`, `node test/forecast.js`, `node test/smoke.js dist/<you>.html 667
  375` must pass on your build when you finish (rules run in node with DOM stubs: guard DOM access).
- Pixel art uses ONLY `PAL` colours (`src/05-pixel.js`); 16x16 icons with a 1px `'0'` outline.
  Look at what you make (Playwright screenshots, zoomed) before calling it done.
- Viewports: 667x375 (smallest), 844x390, 1280x720, tall pane 520x800. Honor reduced motion.
- Scratch files and screenshots in `shots/<yourname>/` (gitignored).

## File ownership

| Agent | Owns |
| --- | --- |
| items | `10-data.js` ITEMS and BG gear only, new `12-famed.js`, `20-state.js`, `50-towns.js`, `51-townview.js`, `town.css`, `52-panels.js`, `panels.css`, `55-company.js`, `67-deploy.js`, `deploy.css`, `68-battle-flow.js`, new `test/items.js` |
| itemart | `06-icons.js`, `07-portraits.js`, `73-units.js` |
| monsters | `10-data.js` EN, FACT, AB and STATUS additions for monsters, `60-battle-core.js`, `62-forecast.js`, `63-ai.js`, `64-foes.js`, new `66-monsters.js`, `40-world.js`, `test/headless.js`, `test/forecast.js`, `test/balance.js` |
| monsterart | new `76-monsters.js`, `41-worldart.js`, battle section of `70-render.js`, `74-anim.js`, `75-fx.js`, `65-battle-ui.js`, `battle-hud.css`, `82-inspect.js`, `inspect.css` |

`10-data.js` is shared by two agents: each edits only its own blocks with small targeted edits.
