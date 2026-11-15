# Wyrdmarch: Phase 8, round A (crises, the East, fabled warriors, run systems), working contract

Repo `KxDJordan/BattleBattalion`, branch `phase8a-wip`. Single-file pixel-art tactics game: `node build.js <out>`
(minified; `--dev` readable) concatenates CSS, `body.html` and every `src/*.js` in filename order into one
`'use strict'` script: every top-level name is a shared global (grep for collisions). Never write
`index.html`. Read `docs/*.md` first (phase 5-7, rivals, slayer, optimisation contracts) and the plan below.

Phase 8 (plan): "Late-game content gives a level-15 company something to break itself on, and the whole game
is tuned and finished." This round builds the content and run systems; round B (later) does portal worlds as
node maps, dungeons, legendary gear and the final mastery tier, sound and music, and the big balance/economy
simulation passes.

## What this round adds

1. **Four crises, one chosen per run** (seeded at new game, `G.crisisKind`), each starting around day 18
   (Pilgrims origin: earlier) and ending in a clear victory or a lasting scar on the world:
   - **The Sundering** (exists: rifts and riftspawn) — keep, polish into the same framework.
   - **The Dead March**: graveyards across the map raise undead hosts each night; risen hosts march on towns;
     necromancer lieutenants lead them; ending it means destroying the Bone Throne (a lair boss) found by
     following the hosts; towns that fall become haunted ruins.
   - **The Great Horde**: an orc and goblin horde gathers in the wilds, marches as several war bands that take
     towns (towns change owner to the horde and are retaken by liberating them); an orc Warchief must fall.
   - **The Barbarian War**: a Barbarian Emperor rises in the far north and raises the Emperor's Camp (a
     fortified world site). Raiding parties spawn from the camp on a cadence and strike south at towns,
     caravans and patrols; houses send hosts north; the war ends when the camp is broken and the Emperor
     slain (a multi-phase boss battle with his champions). Barbarian units: berserkers, axe throwers,
     wolf-riders or hounds, shamans/skalds, huscarl champions; the Emperor himself.
   Every crisis: a crisis sheet explaining it, world news, map markers, contracts tied to it (defend, break a
   siege, hunt the lieutenant), escalating strength over time, houses reacting (alliances, falling towns),
   rivals reacting (they take crisis contracts too), a victory reward (renown, legendary-tier loot placeholder
   for round B, a title) and a failure state that changes the world but does not end the run.
2. **The East and the Eastern War**:
   - An Eastern civilization region on the world map: the east-most part of the map (generated for new
     worlds; assigned deterministically to the east-most towns for old saves), with its own town style
     (pagodas, curved-roof castles, torii gates, terraced fields, cherry/pine trees) on the world map, in the
     town view and on the battle board (eastern props and tiles when fighting there), and its own faction
     `east` with standing like a house (the Shogunate, with a name and banner).
   - Eastern soldiers as units: ashigaru spearmen and archers, samurai (katana, armor), warrior monks,
     onna-musha (naginata), ninja/shinobi skirmishers, and generals; drawn as humanoids with eastern armor and
     weapons.
   - **Eastern gear** (new ITEMS across tiers): katana, nodachi, wakizashi (sidearm), tanto (dagger), naginata,
     yari, yumi (bow), kabuto helmets, menpo, lamellar do and o-yoroi armor; weapon families map onto the
     existing families or get new skills where it makes sense (e.g. iaijutsu draw-cut for katana, wide sweep
     for naginata); sold in eastern markets, dropped by eastern soldiers, usable with existing talent trees
     (katana -> sword tree etc.). Icons and sprites for every item.
   - **The Eastern War (guaranteed, not a crisis)**: fires once the company passes a strength threshold
     (renown and company power; tuned so it lands mid-game, roughly day 25-45 in normal play), can overlap the
     run's crisis. Eastern hosts land on the coast near the eastern region and march inland; the houses must
     band together or fall one by one; the company chooses a side (fight for the houses, or take eastern coin
     and fight for the invaders, or stay out and profit); outcomes change territory.
3. **Fabled warriors**: rare named fighters, clearly stronger than normal mercs, each with a name and title, a
   short legend, named gear (famed-style unique items) and **their own mastery tree** (a small personal tree of
   signature perks). About 16 fabled warriors (mixed backgrounds, races, some eastern). They appear as:
   recruits that must be earned (a quest-like condition: renown tier, a duel, a deed), champions in rival
   companies, leaders of eastern hosts and crisis armies, and bosses; defeating one may yield their named gear.
   Solo runs: fabled warriors never join (they can be fought). At most one or two per battle.
4. **Run systems**: difficulty settings at new game (Story / Normal / Hard / Brutal: enemy budget, pay, injury
   and death odds, crisis start), an **ironman** option (one save slot, autosave only, no reload), a **run
   summary** (days, battles, kills, renown, crisis outcome, the company's best mercs) on retire/death/victory,
   a **hall of the fallen** (persistent across runs in localStorage: fallen mercs with portrait, background,
   level, kills, how they died, which company), **save slots** (3 slots + export/import as a text code or file
   download, validated through repairSave), and a short **tutorial contract** for new players (an optional
   first contract with guided steps and hints that covers moving, attacking, the forecast, ending turns,
   healing in town and taking pay; skippable; never shown again once done).

Quality bar: shipped, premium; beautiful pixel art (only `PAL` colours; 16x16 icons with a 1px `'0'` outline;
look at everything you draw, zoomed); small floating battle HUD; every rule readable before the player acts
(forecast/HUD); deterministic under the seeded RNG; covered by tests; no performance regressions (no per-frame
allocations; cache sprites; anything new drawn on the world must be part of the world's draw signature `WSG` in
70-render.js so frame skipping stays correct).

## Shared design (fixed; build to it)

- **New data goes in your own new files** (loaded after `10-data.js`): `Object.assign(EN,{...})`,
  `Object.assign(FACT,{...})`, `Object.assign(ITEMS,{...})`, `Object.assign(MAST,{...})`, new icons via
  `ICONS[name]=_icOutline(rows)` (06-icons.js globals), new monster kinds via the `MSK`/`MSD` tables
  (76-monsters.js) from a file loaded after it. Nobody edits `10-data.js`. Mind filename order.
- **Crises** (crises agent, new `18-crises.js`): `CRISES[k]={n,d,icon,start(G),day(G),ended(G),win(G),lose(G),marks(),sheet()}`
  with keys `sunder deadmarch horde barbarian`; `G.crisisKind`; `G.crisis={k,...state}`; `crisisDay()` called
  from `worldDay`; `startCrisis()` dispatches; existing Sundering code moves behind `CRISES.sunder`.
- **East** (east agent, new `19-east.js`, new `77-east-art.js`): `eastGen(w)` marks the eastern region on a
  generated world (`w.east` tile mask / towns `t.east=1`), `eastInit(G)` sets up the faction `east`
  (`FACT.east`, standing via `repTier('east')`), `eastDay()` daily (the Eastern War trigger and its hosts),
  `isEast(x,y)`/`townEast(i)`. The 40-world.js owner (crises agent) adds these calls (typeof-guarded) to
  `genWorld`/`createCampaign`-time setup/`worldDay` in its first 20 minutes.
- **Fabled** (fabled agent, new `21-fabled.js`): `FABLED[id]={n,title,legend,bg,race,lvl,st,traits,gear:[itemIds],tree:mastKey,where:['recruit','rival','east','crisis','boss'],earn:{...}}`;
  `fabledMerc(id)` -> a merc object (`m.fabled=id`); `fabledFor(ctx)` picks one for a host/boss/rival;
  `fabledSpawn(o)` adds fabled units to an enemy side in `startBattle` (`o.fabled=[ids]` mixes merc units into
  an EN-based battle); named gear as `ITEMS` with `famed:1, fabled:id`; personal trees as `MAST[k]` with
  `kind:'fabled'` (only that warrior can learn it). `G.fabled = {id:{state:'unmet'|'met'|'joined'|'dead'|'rival:<id>'}}`.
- **Run** (systems agent, new `22-run.js`, `23-tutorial.js`): `G.diff` in `story normal hard brutal` with
  `DIFF[k]={budget,pay,injury,death,crisisDay}` read by others via `diffK(key)` (typeof fallback 1);
  `G.ironman`; `runSummary()`; `hallAdd(m,how)`; `saveSlots()`; `exportSave()`/`importSave(text)`.
- **Saves**: SAVEVER 13, owned by the systems agent (`20-state.js`), migrating to: `G.crisisKind`
  (deterministic from seed; existing crises stay `sunder`), `G.east`/towns `east` flags (via `eastInit` for old
  saves), `G.fabled={}`, `G.diff='normal'`, `G.ironman=false`. Each agent exposes a repair helper
  (`crisisRepair`, `eastRepair`, `fabledRepair`) that `repairSave` calls when defined; tell the systems agent
  your fields early (via the lead).

## Hard rules

- Four agents work at once. Edit ONLY files you own; code against this contract with `typeof` fallbacks;
  land data and API stubs first (within ~20 minutes); list requests for other owners in your final report.
- Build to `dist/<you>.html`. No git commands. No new dependencies or external resources.
- Game randomness via `rnd/ri/pick/shuffle`; UI never consumes it; `forecast()` stays exact.
- These must pass on your build when you finish: `node test/headless.js --quick`, forecast, items, craft,
  company, world, contracts, events, rivals, rivals-look, slayer, and `node test/smoke.js dist/<you>.html 667 375`
  and `520 800`. Determinism hashes will change (new world content); replays must still match each other. Add
  your own test file. The battle owner runs `node test/balance.js --quick --jobs 4` at the end (criteria
  unchanged: naive <50%, sensible >80% overall; rivals 55-75%).
- Viewports 667x375, 844x390, 1280x720, tall 520x800; reduced motion; safe areas.
- Scratch in `shots/<you>/` (gitignored).

## File ownership

| Agent | Owns |
| --- | --- |
| crises | new `18-crises.js`, new `78-crisis-art.js`, `40-world.js`, `15-factions.js`, `41-worldart.js`, `45-mapscreen.js`, `76-monsters.js`, `64-foes.js`, `66-monsters.js`, new `test/crises.js` |
| east | new `19-east.js`, new `77-east-art.js`, `71-tiles.js`, `73-units.js`, `51-townview.js`, `town.css`, `47-tailor.js`, new `test/east.js` |
| fabled | new `21-fabled.js`, `12-famed.js`, `13-craft.js`, `30-mercs.js`, `60-battle-core.js`, `61-talents.js`, `62-forecast.js`, `63-ai.js`, `68-battle-flow.js`, `67-deploy.js`, `07-portraits.js`, `14-company.js`, `test/headless.js`, `test/forecast.js`, `test/balance.js`, new `test/fabled.js` |
| systems | new `22-run.js`, new `23-tutorial.js`, `20-state.js`, `85-game.js`, `90-shell.js`, `body.html`, `style.css`, `settings.css`, `panels.css`, `52-panels.js`, `55-company.js`, `56-camp.js`, `57-factions-ui.js`, `16-contracts.js`, `17-events.js`, `50-towns.js`, `65-battle-ui.js`, `battle-hud.css`, `80-input.js`, `82-inspect.js`, `06-icons.js`, `70-render.js`, new `run.css`, new `test/run.js` |

Other files (`10-data.js`, `05-pixel.js`, `08-frames.js`, `46-banner.js`, `72-layout.js`, `74-anim.js`,
`75-fx.js`, other css) are frozen this round; ask the lead if you truly need a change there.
UI for your content outside your files (e.g. a crisis or fabled panel in the company screen, the Eastern War
choice sheet, difficulty/ironman/slots in the menu): the systems agent owns the shell and panels; the content
agents may build their own sheets with `sheet()`/`showPanel()` from their own files and ask the systems agent
for entry points (buttons, tabs).
