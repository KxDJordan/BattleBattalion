# Wyrdmarch: Phase 8, round B (endgame, legendary gear, sound and music, balance), working contract

Repo `KxDJordan/BattleBattalion`, branch `phase8b-wip`. Single-file pixel-art tactics game: `node build.js <out>`
(minified; `--dev` readable) concatenates CSS, `body.html` and every `src/*.js` in filename order into one
`'use strict'` script: every top-level name is a shared global (grep for collisions; avoid duplicate function
names: a later declaration silently overrides an earlier one). Never write `index.html`. Read `docs/*.md`
first (phase 5-8A, rivals, slayer, optimisation contracts).

Phase 8 (plan): "Late-game content gives a level-15 company something to break itself on, and the whole game is
tuned and finished." Done when: a full run from day 1 through a closed crisis takes 8 to 12 hours, no faction's
win rate sits outside its target band, and a new player finishes the tutorial contract without outside help.

## What this round adds

1. **Portal worlds as small maps of their own** (replacing today's three-battle rift run): entering a rift opens
   a node map of 5-7 nodes with branching paths (battle, elite, rest/shrine, treasure, event, boss), realm
   rules per realm (`ashen`: no regeneration and burning ground; `hollow`: shifting terrain / darkness that
   shortens sight; `glass`: mana storms that empower and endanger casters), elites, and a boss with phases
   (use the boss-phase system, `o.boss`, from 21-fabled.js/60-battle-core.js). Retreat out of a portal costs
   something; the company's wounds carry between nodes.
2. **Dungeons outside crises**: ruins and deep lairs that appear on the world map over time (a handful per world,
   more later in a run), each a short hand-tuned sequence of fixed fights with a named boss and named loot.
3. **Endgame difficulty floor (owner's rule):** "For dungeons/end game challenges the difficulty should have a
   floor that is challenging for a well built party and does not scale." Every portal world and dungeon fight
   uses a **fixed, hand-authored enemy roster** (unit ids, counts, levels/elite marks, positions or formation)
   — never the budget formula, never the company's size, level, renown, day or power. Tuning target: a
   well-built late company (12 mercs, levels 11-13, tier 4-5 gear, sensible talents; the balance harness's
   L12x12 profile) wins each fight with the sensible pilot about **50-65%** of the time on Normal, with real
   losses on a bad plan; a weaker company simply should not go yet (the entrance sheet states the danger
   honestly: "made for a company of veterans"). The only thing allowed to change it is the player's own
   difficulty setting (`diffK('budget')` applied to the fixed roster as a flat multiplier on enemy stats or
   one extra/fewer unit, the same for everyone), never anything about the company. Tests prove that two
   companies of very different strength meet identical enemies.
4. **Legendary gear and a final mastery tier** that only unlock through endgame content: legendary items (a new
   top tier above famed: unique named weapons/armor/helmets/shields with a power, a legend and art) dropped by
   portal and dungeon bosses only; a final mastery tier (one tier above each tree's current top, or a capstone
   per tree) unlocked for a merc by an endgame deed (e.g. surviving a portal boss or clearing a dungeon), shown
   on the character sheet with how to unlock it.
5. **Sound and music generated in code** (WebAudio, no files): UI clicks, battle sounds per event (hits by
   weapon kind, misses, blocks, spells by gift, deaths, morale, level-up), world ambience by biome/weather/time,
   town ambience, and music: a few looping procedural tracks (world, town, battle, boss, crisis, eastern
   variant) with smooth crossfades; settings for master/music/effects volume and mute; respects device mute
   rules (unlock on first gesture on iOS); pauses when hidden; cheap on CPU (schedule ahead, no per-frame
   allocations).
6. **Balance by simulation**: thousands of auto-battles per faction and level band (extend test/balance.js with a
   `--full` mode and per-band tables), and economy curves checked across 100-day auto-runs (a headless campaign
   driver that plays a sensible strategy: takes contracts, buys gear, levels mercs) reporting crowns, roster
   level, gear tier, renown and day of crisis by day; tune data so the curve is sensible (no runaway gold, no
   dead ends, the crisis and the Eastern War arrive when the company can meet them) and every faction's even
   fight sits in its band.

Quality bar as always: premium pixel art (PAL only; 16x16 icons with a 1px `'0'` outline; look at what you make),
readable rules, deterministic under the seeded RNG, covered by tests, no performance regressions (anything new
drawn on the world must be part of the world draw signature `WSG` in 70-render.js).

## Shared design (fixed; build to it)

- `startBattle(o)` gains `o.roster = [{id, n?, lvl?, elite?, at?:{c,r}}]` (endgame agent): a fixed enemy side,
  built exactly as listed (no budget, no scaling), plus `o.realm` (realm rules) and the existing `o.boss` /
  `o.fabled`. `battlePreview(o)` shows it exactly.
- `ENDGAME`/`DUNGEONS[id] = {n, d, realm?, nodes|fights:[{n, roster, boss?, rules?}], loot:[legendary ids], danger}`
  and portal maps `G.portalRun = {id, realm, nodes:[{k, edges, roster, done}], at, ...}` (endgame agent).
- Legendary items: `ITEMS[id]` with `legend:1, tier:6, uniq:1` and a `power` field read by the rules
  (legendary agent); `legendFor(source)` -> an item id for a boss/dungeon drop (no randomness outside rnd).
  Final tier: `MAST[k].cap` (or a 10th tier) with `unlock:{deed}`; `m.deeds = {portal:n, dungeon:n, ...}`
  (recorded by the endgame agent through `deedAdd(m, k)` provided by the legendary agent).
- Audio: `AUDIO.play(name, opts)`, `AUDIO.music(track)`, `AUDIO.ambience(key)`; it listens to `FX.on` events
  without changing their meaning (wrap or chain the existing `FX.on` handler; never break it) and to UI clicks
  via delegated listeners; settings in `SET` (`SET.vol`, `SET.music`, `SET.sfx`, `SET.mute`).
- Saves: SAVEVER 14, owned by the endgame agent (`20-state.js`): `G.portalRun`, `G.dungeons`, `m.deeds`,
  settings fields are not in saves. Each agent exposes a repair helper (`legendRepair`, ...).

## Hard rules

- Four agents work at once. Edit ONLY files you own; code against this contract with `typeof` fallbacks; land
  data and API stubs first (within ~20 minutes); list requests for other owners in your final report.
- Build to `dist/<you>.html`. No git commands. No new dependencies or external resources.
- Game randomness via `rnd/ri/pick/shuffle`; UI and audio never consume it; `forecast()` stays exact.
- These must pass on your build when you finish: `node test/headless.js --quick`, forecast, items, craft,
  company, world, contracts, events, rivals, rivals-look, slayer, crises, east, fabled, run, and
  `node test/smoke.js dist/<you>.html 667 375` and `520 800`. Determinism hashes may change; replays must
  match each other. Add your own test file.
- Viewports 667x375, 844x390, 1280x720, tall 520x800; reduced motion; safe areas.
- Scratch in `shots/<you>/` (gitignored).

## File ownership

| Agent | Owns |
| --- | --- |
| endgame | new `24-endgame.js`, new `79-endgame-art.js`, new `endgame.css`, `20-state.js`, `40-world.js`, `41-worldart.js`, `45-mapscreen.js`, `60-battle-core.js`, `62-forecast.js`, `63-ai.js`, `64-foes.js`, `66-monsters.js`, `67-deploy.js`, `68-battle-flow.js`, `71-tiles.js`, `76-monsters.js`, `test/headless.js`, `test/forecast.js`, new `test/endgame.js` |
| legend | new `25-legend.js`, `12-famed.js`, `13-craft.js`, `21-fabled.js`, `30-mercs.js`, `61-talents.js`, `06-icons.js`, `07-portraits.js`, `73-units.js`, `52-panels.js`, `55-company.js`, `panels.css`, `82-inspect.js`, `inspect.css`, new `test/legend.js` |
| audio | new `26-audio.js`, `90-shell.js`, `settings.css`, `body.html`, `style.css`, `65-battle-ui.js`, `battle-hud.css`, `70-render.js`, `74-anim.js`, `75-fx.js`, `80-input.js`, `22-run.js`, `23-tutorial.js`, `run.css`, new `test/audio.js` |
| balance | `10-data.js`, `14-company.js`, `15-factions.js`, `16-contracts.js`, `17-events.js`, `18-crises.js`, `19-east.js`, `50-towns.js`, `56-camp.js`, `85-game.js`, `test/balance.js`, new `test/economy.js`, and the remaining tests (`items`, `craft`, `company`, `world`, `contracts`, `events`, `rivals`, `rivals-look`, `slayer`, `crises`, `east`, `fabled`, `run`) when expectations must change for tuning |

Frozen this round (ask the lead): `05-pixel.js`, `08-frames.js`, `46-banner.js`, `47-tailor.js`, `51-townview.js`,
`57-factions-ui.js`, `72-layout.js`, `77-east-art.js`, `78-crisis-art.js`, other css.
