# Wyrdmarch: arms, banner, tailor and planning update, working contract

Wyrdmarch is a landscape mobile browser tactics game (mercenary company sandbox in the spirit of
Battle Brothers, with four gifts Mana/Aura/Qi/Chi), pixel art, shipped as ONE self-contained HTML
file. This checkout is the GitHub repo `KxDJordan/BattleBattalion` (branch `features-wip`). Source is
in `src/`; `node build.js <out>` concatenates it (CSS files, `body.html`, then all `src/*.js` in
filename order inside one `'use strict'` script: every top-level name is a shared global, check for
collisions). `index.html` at the repo root is the shipped build: never write it; the lead rebuilds it.
Earlier design notes: `docs/`.

## What the owner asked for

1. **Friendly fire, fixed**: bow (and every ranged weapon) users really hit allies in the line of
   fire when a shot strays, and a stray shot is ONE projectile flying to the ally that was hit, not
   an arrow at the target plus a second arrow at the ally (today `strike()` draws the shot at the
   target before rolling, then `strike(u, ally)` draws another).
2. **A game icon.**
3. **A UI colour theme setting**, and a **battle toggle to hide allies' HP and armor bars**.
4. **A main menu**; **new game setup**: name the company, choose world size (today's 64x64 is
   "Small"; larger sizes above it), choose a flag/emblem; the chosen flag colours show on the world
   map.
5. **A tailor** in towns: recolour armor, clothes and accents so a company looks like a team.
6. **New weapons and abilities**, with images in the existing style: **Hammer**; **Polearm**
   (two-handed only, attack range 2); **Greatsword** (two-handed, range 2); **Crossbow** (must reload
   after firing); **Flintlock** (must reload after firing); a **Shield tree**, and **several shield
   types**.
7. **Two-tap movement**: the first tap on a reachable tile highlights it and previews the path and its
   AP cost, and greys out every ability that could not be used after that move; the second tap on the
   same tile confirms. Helps plan what is possible after moving.

Quality bar: a shipped, premium game. Owner wants beautiful pixel graphics and effects, a small
floating battle HUD (map stays visible), and readable rules.

## Shared design (fixed; build to it)

**New weapon families** (`ITEMS[id].wt`): `hammer` (one- and two-handed: war hammer 1H, maul 2H;
armor-crushing), `polearm` (two-handed only, `rng:2`: e.g. bill/halberd/glaive tiers), `greatsword`
(two-handed, `rng:2`: e.g. greatsword, zweihander, runed greatsword), `crossbow` (two-handed, ranged,
`reload:{ap,fat}`), `flintlock` (ranged; pistol 1H and musket 2H, `reload:{ap,fat}`, heavy damage,
high armor pierce, smoke). 2-4 items per family across price tiers, plus weapon skills (`sk`) and a
**weapon tree** per family (`MAST` kind `'weapon'`, 3 tiers x 2 perks, unlocking at levels 3/6/9 like
the existing eight). Range-2 weapons attack over an adjacent tile (an ally or empty) but not through
`'block'` tiles; they still take free attacks normally.
**Reload**: a reload weapon fires only when loaded. Unit field `u.loaded` (bool, for the weapon in
hand; a swapped-away loaded weapon stays loaded: track per weapon id in `u.ld`). Units start battle
loaded. Ability `reload` (AP and fatigue from the item). Firing unloads. The ranged lock applies to
crossbows and flintlocks like bows (they cannot fire with an able enemy adjacent; reloading is
allowed). AI reloads, swaps, and plans around it.
**Shields**: types via `ITEMS[id].look` in `buckler round kite heater tower spiked` (keep the three
existing ids; add round, tower and spiked, and a couple of tiers), each with distinct md/rd/hp/fat
and a skill where it fits (tower: cover/shieldwall bonus; spiked: bash damage). **Shield tree**:
`MAST.shield` kind `'weapon'`, `wt:'shield'`, available when a shield is raised, 3 tiers x 2 perks.
Background `wt` lists and race `noWt` updated for the new families (sensible: e.g. knights and
squires get greatsword/polearm/hammer/shield; hunters crossbow; no flintlock for monks...).
**Friendly fire**: `strike()` decides hit / miss / stray BEFORE emitting the projectile and emits a
single `FX.shot` to the final destination (target or the ally); the `'ff'` event `{u, t: ally, from:
originalTarget}` fires before the ally's damage; FX must not draw a second projectile for it.
Friendly fire applies to every ranged weapon attack (bow, crossbow, flintlock, ranged gift arrows)
with allies in the line of fire per `losInfo`.

**Company banner**: `G.banner = {name, c1, c2, emblem}`: `c1`/`c2` are keys of a fixed banner colour
list `BANNERC` (PAL keys), `emblem` a key of `EMBLEMS` (12+ 16x16 pixel emblems: wolf, lion, tower,
crossed swords, skull, sun, moon, stag, raven, oak, anchor, crown...). Provided by the shell agent in
new `src/46-banner.js`: `BANNERC`, `EMBLEMS`, `bannerRows(banner)` → pixel rows (a flag
with field c1, border/stripe c2, emblem), `bannerHTML(banner, size)`, `bannerCanvas(banner)`. The
world map company sprite (`drawCompanyPx` in `41-worldart.js`) draws its flag in the banner colours
with the emblem when it fits; the minimap and the full-screen map use `c1`. Default banner for old
saves: brass and verdigris as today.
**World size**: `G.wsize` in `small medium large vast` = 64, 80, 96, 128 tiles. `WN`/`WS` become
`let` (set from the save before the world is generated or loaded); towns scale with size (12 / 16 /
20 / 26). Everything already derives from `WN`.
**Tailor**: per-merc colours `m.colors = {cloth, accent, metal}`: `cloth` and `accent` are keys of
`DYES` (named dyes, each a PAL ramp `[dark, mid, light]` of PAL keys: crimson, madder, ochre, forest,
verdigris, sky, royal, violet, charcoal, bone, brown, white...), `metal` a key of `FINISH` (`steel
blackened bronze gilded`). Absent = today's look. Provided by the shell agent in new
`src/47-tailor.js` (`DYES`, `FINISH`, `dyeRamp(key)`, prices). Units and portraits recolour: cloth =
tunics, robes, gambesons, padding, hoods, cloaks; accent = sashes, trims, plumes, tabards, shield
faces (unless the gift accent rule applies: the gift colour stays as a small gem); metal = mail, plate,
helmets, scale.
**Settings** (`SET` in `90-shell.js`, persisted): add `SET.theme` (key of `THEMES`, 5-6 named UI
themes changing the UI colour variables and the generated pixel frames: default verdigris and brass
plus e.g. crimson, royal blue, ash, parchment/forest...) and `SET.allyBars` (bool, default true). The
battle HUD toggle calls `setOpt('allyBars', v)`; `drawUnitOverlayPx` skips HP/armor bars of side-0
units when it is false (status icons, morale flag and the active marker stay).
**Move planning**: on a reachable tile, tap 1 selects `B.plan = {k, path, cost}`; the board shows
the path and the AP left; the HUD greys out abilities that could not be used from that tile with the
remaining AP (computed with no side effects: temporarily set position and AP, call `canUse` /
`validTargets`, restore); tap 2 on the same tile moves; tapping elsewhere changes or clears the plan;
abilities can still be selected while a plan is shown. Mouse: hover already previews; click behaves
the same two-step way when `SET.confirm` is on, else one click moves.

## Hard rules for every agent

- Four agents work in this folder at once. Edit ONLY the files you own. Never edit another agent's
  file; code against this contract with fallbacks (`typeof X==='function'`); list requests in your
  final report.
- Build to your own output: `node build.js dist/<yourname>.html` (`dist/` is gitignored). Never write
  `index.html`. Another agent's half-saved file can break your build briefly: wait and rebuild.
- No git commands. No dependencies or external resources (strict CSP: images are generated in code
  or committed PNGs inlined as data URIs at build).
- Game randomness through `rnd/ri/pick/shuffle` (seeded). Visuals, previews and UI never consume it.
- `node test/headless.js --quick`, `node test/forecast.js`, `node test/smoke.js dist/<you>.html 667
  375` must pass on your build when you finish (rules run in node with DOM stubs: guard DOM access).
- Pixel art uses ONLY `PAL` colours (`src/05-pixel.js`); 16x16 icons with a 1px `'0'` outline;
  fonts `'Jersey 15'` for pixel headings/numbers, `'Alegreya Sans'` for text. Look at what you make
  (Playwright screenshots, zoomed) before calling it done.
- Viewports: 667x375 (smallest), 844x390, 1280x720, tall pane 520x800. Honor reduced motion.
- Scratch files and screenshots in `shots/<yourname>/` (gitignored).

## File ownership

| Agent | Owns |
| --- | --- |
| rules | `10-data.js` (ITEMS, AB, MAST, BG, RACE, STATUS; not EN/FACT unless needed for enemy gear), `30-mercs.js`, `60-battle-core.js`, `61-talents.js`, `62-forecast.js`, `63-ai.js`, `64-foes.js`, `test/headless.js`, `test/forecast.js`, `test/balance.js` |
| art | `06-icons.js`, `07-portraits.js`, `73-units.js`, `74-anim.js`, `75-fx.js`, `41-worldart.js`, `build.js` (head only: icon links), new `assets/` (game icon PNGs) |
| battle | `65-battle-ui.js`, `battle-hud.css`, battle section of `70-render.js`, `80-input.js`, `82-inspect.js`, `inspect.css` |
| shell | `90-shell.js`, `settings.css`, `style.css`, `08-frames.js`, `body.html`, `20-state.js`, `40-world.js`, `85-game.js`, `45-mapscreen.js`, `map.css`, `50-towns.js`, `51-townview.js`, `town.css`, `52-panels.js`, `panels.css`, `55-company.js`, new `46-banner.js`, new `47-tailor.js`; in `70-render.js` only the minimap company marker lines in the world section |
