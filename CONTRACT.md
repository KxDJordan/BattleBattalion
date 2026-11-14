# Wyrdmarch: Solo Beast Slayer origin and the Monster Hunter mastery group, working contract

Repo `KxDJordan/BattleBattalion`, branch `slayer-wip`. Single-file game: `node build.js <out>` (minified;
`--dev` for readable output) concatenates `src/` into one `'use strict'` script; every top-level name is a
shared global. Never write `index.html`. Read `docs/*.md` (talents-contract, phase 6/7, rivals) first.

## Owner's request (verbatim)

"Add a Solo (Beast Slayer) start. Also add a Monster Hunter mastery group where each mastery grants a
stacking bonus towards a specific species for each one killed. Each tier should offer a bonus for a
progressively stronger species (excluding Wyverns). This start should disallow adding new members
through hiring and through events."

## Design (fixed; build to it)

**Monster Hunter tree** `MAST.hunter = {n:'Monster hunter', kind:'hunter', ...}`: a new mastery group
(talent tree kind `'hunter'`) with 4 tiers of 2 perks; each perk is one species ("quarry"):
- Tier 1 (opens at level 2): Direwolves (`wolf`), Webspinners (`spider`)
- Tier 2 (level 4): Serpents (`adder viper gserp`), Owlbears (`bear`)
- Tier 3 (level 6): Ents (`thorn ent elder`), Ogres (`ogre aogre`)
- Tier 4 (level 8): Restless dead (`skel zomb skelhal necro`), Riftspawn (`imp vknight vmage tyrant`)
Wyverns (`wyvern whatch`) are never a quarry. A table `QUARRY[perkKey] = {n, en:[EN ids], per, cap}`.
- Kills are counted per merc and species, always (also before the perk is learned):
  `m.slain = {quarryKey: n}`, incremented when that merc lands the killing blow on a unit whose EN id is
  in the quarry (credit rules like XP kills). Shown on the character sheet.
- A learned quarry perk grants, against units of that quarry: **+`per`% damage and +`per/2` (rounded down,
  min 1 per 2 kills) to hit, per kill counted, up to `cap` kills**, plus a flat starting bonus of +5%
  damage the moment it is learned (so it is never empty). Suggested `per`/`cap`: tier 1: 1% per kill,
  cap 30 kills; tier 2: 2%, cap 15; tier 3: 3%, cap 10; tier 4: 2%, cap 15 (max +30% damage, +15 hit).
  Tune if balance needs it, keep the numbers stated exactly in the perk text (`d`), and show the
  current stack ("12 slain: +12% damage, +6 to hit") on the perk and in the forecast/HUD breakdown.
  Exact in `forecast()`.
- Who may learn it: mercs whose background lists it (`BG[bg].ht = 1`): the new Beast Slayer background,
  and hunter, poacher, witch hunter, wildling. `hunterTrees(m)` / `mercTrees(m)` include it for them.
  Perk points as for other trees (one per level); refundTrees keeps it valid.

**Solo (Beast Slayer) origin** `ORIGINS.slayer = {n:'Solo: Beast Slayer', icon, d, rule, roster:['slayer'], crowns, solo:1, k:{...}}`:
- A new background `BG.slayer` (Beast Slayer): a lone monster hunter with strong stats for one sword,
  starting at level 3 (perks to spend), good hunting gear (e.g. a beast-hunter's weapon, a sidearm,
  medium armor, a helmet), Beast-wise trait, the hunter tree, weapon trees and 1-2 armor trees that
  suit it. Never appears in taverns or rival rosters.
- The run is playable alone: battles already scale enemy budget by fielded mercs; check that a solo
  slayer survives early bands/contracts at a sensible rate and that contracts/pay don't punish a
  one-sword company unfairly (renown/pay rules that assume more men may need a solo adjustment). Report
  solo win rates against beasts/serpents/ogres at level 3/6/9 (sensible pilot) in balance.
- **No new members:** `canRecruit()` returns false for a solo run (origin flag `solo`). Everything that
  adds a merc to `G.roster` checks it and is closed with a clear reason: tavern hiring (the tavern shows
  recruits greyed with "You ride alone"), rival parley "hire one of their swords", rival joiners after a
  battle, events that add recruits (their options are hidden or shown disabled with the reason; never
  silently do nothing), and any other `G.roster.push` path (grep them all). Followers (retinue) are still
  allowed: they are not members of the company.
- If the slayer dies the run ends (game over sheet) — like a wiped company today.
- The origin picker on the new-game screen shows it automatically (reads `ORIGINS`).
- While here: the noble origin's rule text says "if he falls" about the heir, whose portrait gender is
  random; make it neutral ("if the heir falls").

**Saves**: SAVEVER 12 with migration: `m.slain = {}` for every merc (also rival mercs); existing saves
otherwise unchanged.

## Hard rules
- Two agents (rules, look) work at once; edit only your files; typeof fallbacks; land stubs first.
- Determinism via `rnd/ri/pick/shuffle`; UI never consumes RNG; forecast exact.
- Must pass on your build: `node test/headless.js --quick`, forecast, items, craft, company, world,
  contracts, events, rivals, rivals-look, and `node test/smoke.js dist/<you>.html 667 375` and `520 800`.
  Add `test/slayer.js`. Run `node test/balance.js --quick --jobs 4` at the end (criteria unchanged).
- Pixel art: PAL colours only, 16x16 icons with 1px `'0'` outline; look at what you make.
- No git commands. Build to `dist/<you>.html`. Scratch in `shots/<you>/`.

## File ownership
| Agent | Owns |
| --- | --- |
| rules | `10-data.js`, `20-state.js`, `30-mercs.js`, `60-battle-core.js`, `61-talents.js`, `62-forecast.js`, `63-ai.js`, `68-battle-flow.js`, `14-company.js`, `15-factions.js`, `16-contracts.js`, `17-events.js`, `40-world.js`, `50-towns.js`, `85-game.js`, all `test/*.js` |
| look | `06-icons.js`, `07-portraits.js`, `73-units.js`, `52-panels.js`, `55-company.js`, `51-townview.js`, `65-battle-ui.js`, `80-input.js`, `82-inspect.js`, `90-shell.js`, `57-factions-ui.js`, `body.html`, all `src/*.css` |
