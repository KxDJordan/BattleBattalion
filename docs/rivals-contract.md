# Wyrdmarch: caravan cargo and rival mercenary companies, working contract

Wyrdmarch is a landscape mobile pixel-art tactics game shipped as ONE self-contained HTML file (repo
`KxDJordan/BattleBattalion`, branch `rivals-wip`). Source in `src/`; `node build.js <out>` concatenates
CSS, `body.html` and every `src/*.js` (filename order) into one `'use strict'` script, minified (use
`node build.js <out> --dev` for readable output). Every top-level name is a shared global: grep for
collisions. Never write `index.html`. Read `docs/*.md` (phase 5-7 contracts, optimisation contract) for
the systems you build on.

## Owner's request

1. "Are you able to take the cargo from caravans?" Today a beaten caravan pays only `cargo.crowns`.
   Make the cargo real loot: what a caravan carries depends on its `cargo.good` (the `GOODS` table:
   food goods give food, iron/smithing towns give tools and weapons/armor, herbs give salves, furs
   give pelts/parts, luxury goods are sellable trade goods, etc.), shown before you attack (the band
   sheet lists the cargo) and on the results screen. Carrying capacity is not modelled; keep it simple
   and readable. Robbing a caravan stays a choice with a reputation cost.
2. "Include rival mercenary companies." Named rival companies roam the world like the player's:
   own banner (46-banner.js data), renown tier, a roster of real mercs (same `newMerc`/backgrounds/
   traits/gear/levels as the player's, scaled by their renown and the day), a home region, a
   personality (honourable, cutthroat, greedy, glory-hounds), and a standing with the player.
   - They take contracts from the same boards (a board can show "taken by the Black Hounds"), race the
     player to hunt/beast/bounty/nest targets (if they reach it first the player's contract fails with
     a clear notice, unless the player beats them to it), and sometimes fight monsters themselves
     (abstract resolution off-screen).
   - A house that is hostile to the player may hire a rival company to hunt the company.
   - The player can meet them on the road: parley (trade news/intel, hire one of their swords for a
     fee, buy them off), fight them (reputation cost with towns if they are not hostile; honourable
     ones refuse ambushes), or be attacked by cutthroat or hired ones.
   - Battles against them use their actual mercs as enemies: same stats, gear, abilities and talents
     as player mercs, same morale rules; they can rout and retreat. Beating them yields some of their
     gear (chance per item, worn), crowns, renown, and may let a beaten merc join you.
   - They grow over time (renown, recruits, better gear) and can be wiped out; new ones can form.
   - World news and the Factions screen report their deeds.

Quality bar: shipped, premium; beautiful pixel art; small floating battle HUD; readable rules (every
cost and odds stated before the choice); deterministic under the seeded RNG; covered by tests; no
performance regressions (keep the optimisation round's patterns: no per-frame allocations, cache
sprites, skip unchanged frames stays correct, i.e. anything new drawn on the world must be part of the
world's draw list/signature in 70-render.js `WSG`).

## Shared design (fixed; build to it)

- `G.rivals = [{id:'r0', n, short, c1, c2, emblem, pers:'honour'|'cutthroat'|'greedy'|'glory',
  renown, crowns, home:townIndex, roster:[merc objects], stance:-100..100 (toward the player),
  alive:true, day, deeds:[{day,t}]}]` (2-3 per world at start; new ones may form). Rival mercs are
  ordinary merc objects (`newMerc`), never in `G.roster`.
- World party for a rival company: `{goal:'merc', f:'r0' (rival id), ...}`. `isRival(f)`,
  `rivalById(id)`, `rivalLabel(r)`, `rivalStr(r)` (strength vs the company, like partyStrength).
- Rival standing uses the reputation helpers: `repTier(f)`/`repGain(f,n,why)` work for rival ids
  too (world agent extends them), so the Factions screen and UI read one API.
- Contracts: `c.rival = rivalId` when a rival is racing for the same target; `ctrRivalTook(c)` ->
  text when they won the race. Boards: a taken contract shows as taken (not acceptable).
- Battle against a rival: `partyBattle(p)` returns `{f:p.f, rival:p.f, mult, src:{type:'party',id,goal:'merc'}}`
  and `startBattle(o)` with `o.rival` builds the enemy side from `rivalById(o.rival).roster` (up to 12,
  their own formation) instead of `EN` defs. Enemy merc units have `u.m` = the rival merc object and
  `u.side=1`; all merc rules (calc, gear, talents, abilities, morale, injuries) apply. The forecast
  stays exact. After battle: rival mercs killed are removed from their roster; injuries persist.
- Cargo: `p.cargo = {good, crowns, items:[itemIds], food, tools, salves, parts:{k:n}, trade:[{n, v}]}`
  rolled when the caravan spawns (world agent) from `GOODS[good].cargo` rules; `cargoText(cargo)`
  (world) returns a short readable list; `cargoTake(cargo) -> summary` (world) adds it to the company
  (stash, food, tools, salves, parts, crowns). Trade goods are new stash entries sold in markets: a
  minimal `ITEMS` kind `k:'t'` (trade good) with a price, sold for full value at towns whose GOODS
  differ, less where they are made (world agent adds the kind; contracts/towns agent prices it in
  the market; look agent draws the icons).
- Saves: SAVEVER 11 (world agent, `20-state.js`), migrating to `G.rivals` generated from `G.seed`,
  old caravans' cargo filled from their good. `rivalRepair(G)` validates.

## Hard rules

- Three agents work in this folder at once. Edit ONLY the files you own; code against this contract
  with `typeof` fallbacks; land data and API stubs first (within ~20 minutes); list requests for
  other owners in your final report.
- Build to `dist/<yourname>.html` (`node build.js dist/<you>.html --dev` while debugging is fine).
  No git commands. No new dependencies.
- Game randomness via `rnd/ri/pick/shuffle`; UI never consumes it.
- These must pass on your build when you finish: `node test/headless.js --quick`, `test/forecast.js`,
  `test/items.js`, `test/craft.js`, `test/company.js`, `test/world.js`, `test/contracts.js`,
  `test/events.js`, `node test/smoke.js dist/<you>.html 667 375` and `520 800`. Determinism hashes in
  headless WILL change (new world content); that is expected, but determinism itself (replays equal)
  must hold. Add your own test file.
- Pixel art: only `PAL` colours, 16x16 icons with 1px `'0'` outline; look at what you make.
- Viewports 667x375, 844x390, 1280x720, tall 520x800; reduced motion; safe areas.
- Scratch files in `shots/<yourname>/`.

## File ownership

| Agent | Owns |
| --- | --- |
| world | `src/15-factions.js`, `src/40-world.js`, `src/20-state.js`, `src/10-data.js`, `src/14-company.js`, `src/30-mercs.js`, `src/16-contracts.js`, `src/50-towns.js`, `src/17-events.js`, `test/world.js`, `test/contracts.js`, new `test/rivals.js` |
| battle | `src/60-battle-core.js`, `src/61-talents.js`, `src/62-forecast.js`, `src/63-ai.js`, `src/64-foes.js`, `src/67-deploy.js`, `src/68-battle-flow.js`, `test/headless.js`, `test/forecast.js`, `test/balance.js` |
| look | `src/06-icons.js`, `src/07-portraits.js`, `src/41-worldart.js`, `src/45-mapscreen.js`, `src/46-banner.js`, `src/51-townview.js`, `src/52-panels.js`, `src/55-company.js`, `src/57-factions-ui.js`, `src/65-battle-ui.js`, `src/70-render.js`, `src/73-units.js`, `src/76-monsters.js`, `src/80-input.js`, `src/82-inspect.js`, `src/90-shell.js`, `src/body.html`, all `src/*.css` |
