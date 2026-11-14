# Wyrdmarch: Phase 7 (living world and contracts), working contract

Wyrdmarch is a landscape mobile pixel-art tactics game (mercenary company sandbox in the spirit of
Battle Brothers, with four gifts Mana/Aura/Qi/Chi), shipped as ONE self-contained HTML file. This
checkout is the GitHub repo `KxDJordan/BattleBattalion` (branch `phase7-wip`). Source in `src/`;
`node build.js <out>` concatenates it (CSS, `body.html`, then all `src/*.js` in filename order in one
`'use strict'` script: every top-level name is a shared global; grep for collisions before adding one).
Never write `index.html` (the lead rebuilds it). Read `docs/*.md` (earlier contracts) for the systems
you build on.

Phase 7 goal (from the plan): "The sandbox starts to push back: factions act, towns change, and
travel has stories." **Done when:** two 30-day runs from the same seed diverge because of player
choices, and the map looks different on day 30 than on day 1.

## What this phase adds

1. **Factions and reputation**: 2-3 noble houses generated per world (name, colours, heraldry) owning
   most towns as territory; free towns (independent); the monster factions in `FACT` (gob, undead,
   beast, orc, bandit, void) as permanently hostile. Reputation per human faction changes prices,
   contracts offered, recruit odds, and who attacks on sight (a house at "hostile" sends patrols after
   the company and closes its markets).
2. **Contract types from 2 to about 10**: deliver, hunt (existing), escort a caravan, defend a town,
   patrol a route, hunt a named beast, recover an artifact from a ruin, break a siege, clear a nest
   before it grows, bounty on a named brigand. Negotiation over pay and advance (a few rounds, the
   employer's patience depends on reputation; pushing too far loses the offer).
3. **Multi-stage contracts with twists**: some contracts roll a twist (ambush on the road, the target
   bribes/surrenders, betrayal by the employer, a second employer outbids, the cargo is cursed).
4. **Travel and camp events with choices**: about 45 events, gated and coloured by backgrounds,
   traits, gifts, followers, biome, faction standing and day; each choice states its odds/costs.
5. **Towns that differ and change**: specialty goods per town, buildings beyond the four (armorer,
   arcane college, training hall, weaponsmith, fletcher, harbour), and situations (famine, raided,
   festival, plague, boom, siege) that shift prices, recruits and contracts and that come and go.
6. **Roaming parties with goals**: caravans between towns, house patrols, raiders that hit towns
   (and cause "raided"), monster nests that grow in strength and spawn bands if ignored.
7. **Starting origins** chosen in the new-game menu (Free company (default), Deserters, A fallen
   noble's guard, Academy expedition, Beast hunters, Pilgrims of the Rift): opening roster, crowns,
   gear, reputation and one rule each.

Quality bar: shipped, premium; beautiful pixel art; small floating battle HUD; readable rules (every
choice and price change says why); deterministic under the seeded RNG; covered by tests. Optimisation
comes in the following round: do not add per-frame allocations or O(n^2) per-frame loops.

## Shared design (fixed; build to it)

**Factions** (world agent, new `15-factions.js`):
- `G.houses = [{id:'h0', n, short, c1, c2, emblem, seat:townIndex, pers:'proud'|'greedy'|'pious'|'warlike'}]`
  generated at `createCampaign` (2 in small worlds, 3 otherwise) with banner data compatible with
  `46-banner.js` (`c1`,`c2`,`emblem` from `BANNER*` tables).
- Town owner: `G.towns[i].own = 'h0'|'h1'|'h2'|'free'`. Faction keys used everywhere:
  house ids, `'free'`, and the monster keys of `FACT`.
- `G.rep = {h0:0, h1:0, h2:0, free:0}` in -100..100. `repTier(f) -> {k:'hostile'|'cold'|'neutral'|'friendly'|'allied', n, min}`;
  `repGain(f, n, why)` clamps, records `G.repLog` (last 30 `{day,f,n,why}`) and calls `toast` when a
  tier changes. Effects (all via helpers, all read by others through `typeof` fallbacks):
  `townPriceK(i, kind)` (kind 'buy'|'sell'|'food'|'tools'|'hire') combining owner rep, situation and
  specialty; `townHostile(i)` (closed markets); `houseRelation(a,b)` (houses can be at war).
- House patrols (party `goal:'patrol'`, `f:houseId`) are neutral unless that house is hostile.

**Roaming parties** (world agent, `40-world.js`): parties gain `goal` in
`'roam'|'caravan'|'patrol'|'raid'|'nest'` and optional `from`, `to` (town indices), `cargo`, `str`.
Caravans travel town to town on roads (attackable: rep loss, loot); raiders path to a town and, on
arrival, set its situation to `raided`; nests are static sites `G.nests=[{id,x,y,f,str,day}]` that grow
`str` daily and spawn bands; clearing one is a contract target. Parties far from the company are no
longer just deleted: off-screen parties advance abstractly (a cheap daily step) so the world keeps
moving. Party art is drawn by the look agent from `p.goal` and `p.f`.

**Towns** (world agent): `G.towns[i]` gains `own`, `spec:[goodKeys]` (specialties, cheaper and better
stocked), `bld:[buildingKeys]` (always `notice tavern market inn`, plus extras by size and seed:
`temple armorer college hall weaponsmith fletcher harbour`), `sit:[{k, days}]` (situations from
`SITS[k] = {n, d, icon, price:{buy,sell,food}, recruits, contracts, dur:[a,b]}`), `pros` 0..100
(prosperity: raided/famine lower it, trade raises it; affects stock and recruits). A town's look on
the world map may change with `pros`/`sit` (smoke when raided, banners at a festival): the look agent
draws it from these fields. Buildings' services: `armorer` (sells top-tier armor and repairs for
crowns), `college` (gift awakening hint / sells foci, lets a merc respec one talent tree for crowns),
`hall` (train for crowns, like camp Train but no daily cap), `weaponsmith`, `fletcher` (ranged gear and
quivers), `harbour` (fast travel by sea to another harbour town for crowns and days). The world agent
provides the logic (`bldServe(i, key, arg)`), the contracts agent wires the market/price calls, and
the look agent the UI.

**Contracts** (contracts agent, new `16-contracts.js`):
- `CTYPES[type] = {n, d, icon, gen(t,ti)->contract|null, w(t)->weight, mark(c)->[{x,y,kind,label}],
  turnIn(c,ti)->bool, onBattle?(c,o,win), onArrive?(c,place), stages?}`. Types: `deliver hunt escort
  defend patrol beast relic siege nest bounty`.
- Contract object: `{type, title, emp:faction, town:issuingTownIndex, diff 1..5, pay, adv:0,
  stage:0, stages:[...], twist:null|{k,...}, done:false, failed:false, due:day|null, ...type fields}`.
  `genContract(t)` (50-towns.js) delegates to `genContract2(t, ti)` when defined.
- Generic hooks every other file uses instead of `type==='hunt'` checks: `ctrMarks(c)` (map/world
  markers), `ctrTargetAt(x,y)` (world arrival triggers), `ctrDone(c)`, `ctrTurnInAt(ti)`,
  `ctrStatus(c) -> short line`, `ctrBattle(c, place) -> startBattle options`.
- Negotiation: `ctrNegotiate(c, ask:{pay,adv}) -> {ok, c, mood, msg}` deterministic per contract
  (seeded from contract id), max 3 rounds; the UI shows employer mood.
- Twists: `CTWIST[k] = {n, d, when:'travel'|'arrive'|'battle'|'turnin', apply(c)}`; resolved through
  the events agent's `eventShow()` card when it exists (so twists look like events), else a sheet.
- Battle objectives for escort/defend/siege: `startBattle(o)` honours `o.obj = {k:'escort', vip:defKey}`
  (a VIP ally unit that must survive), `{k:'hold', rounds:n}` (survive n rounds or rout the foe),
  `{k:'siege'}` (foes start fortified behind props; rout or kill the leader). The forecast/HUD shows the
  objective (look agent renders `B.obj` from `objStatus()` the contracts agent provides).
- Success/failure update renown, reputation (`repGain`) and ambitions (`ambEvent('contract',c)`).

**Events and origins** (events agent, new `17-events.js`, `events.css`):
- `EVENTS[id] = {n, art, text(ctx), when(ctx)->weight, opts:[{t, req?(ctx), d (exact effects/odds),
  go(ctx)->resultText}]}` with `ctx = {m (picked merc), m2, town, biome, f, ...}`. About 45 events:
  travel, camp, town, battle-aftermath; many keyed to backgrounds/traits/gifts/followers ("the
  witch hunter recognises a hex mark", "the drunkard raids the cargo"), with real consequences
  (traits gained/lost, injuries, crowns, food, rep, recruits joining, items, parts, renown).
- `eventTick(kind, ctx)` called by the world agent from `advanceTime` (kind 'travel' at most every
  ~1.5 days of travel, seeded), by camp (`'camp'`), towns (`'town'`), and battle flow (`'after'`).
  `eventShow(id, ctx)` shows the event card (pixel vignette art per event `art` key, drawn in 
  `17-events.js` with PAL colours, portrait of the merc involved, options with requirement badges).
- `G.evt = {seen:{id:day}, flags:{}}` for cooldowns and chains.
- Origins: `ORIGINS[k] = {n, d, rule, setup(G)}`; `createCampaign(opts)` (85-game.js) applies
  `opts.origin`; `G.origin`. Rules examples: Deserters (cheap wages, one house starts hostile),
  Fallen noble's guard (good gear, low crowns, a named knight who must survive), Academy expedition
  (all start awakened, fragile, +college), Beast hunters (parts drop x1.5, start with hunt intel),
  Pilgrims of the Rift (portals open earlier, void rep...). The look agent adds the picker to the
  new-game screen (90-shell.js) reading `ORIGINS`.

**Saves**: one bump to SAVEVER 10 owned by the world agent (`20-state.js`), migrating to:
houses/own/rep/repLog generated deterministically from `G.seed` for old saves, `G.towns[i]` new
fields, `G.nests=[]`, `G.evt={seen:{},flags:{}}`, `G.origin='free'`, old contracts kept (types
deliver/hunt stay valid). Other agents validate their own fields through repair helpers they expose
(`ctrRepair(c)`, `evtRepair(G)`), which `repairSave` calls when defined.

## Hard rules for every agent

- Four agents work in this folder at once. Edit ONLY the files you own. Code against this contract
  with fallbacks (`typeof X==='function'`); list requests for other owners in your final report.
- Land data and API stubs first (within your first ~20 minutes), then deepen, so others can build.
- Build to `dist/<yourname>.html` (`node build.js dist/<yourname>.html`). Never write `index.html`.
  No git commands. No new dependencies or external resources (strict CSP).
- Game randomness via `rnd/ri/pick/shuffle`; UI and previews never consume it; `forecast()` stays exact.
- `node test/headless.js --quick`, `node test/forecast.js`, `node test/items.js`, `node test/craft.js`,
  `node test/company.js`, `node test/smoke.js dist/<you>.html 667 375` must pass on your build when you
  finish. Each agent adds its own test file (listed below).
- Pixel art: only `PAL` colours, 16x16 icons with 1px `'0'` outline; look at what you make (Playwright
  screenshots, zoomed) before calling it done.
- Viewports 667x375, 844x390, 1280x720, tall 520x800; reduced motion; safe areas.
- Performance: no new per-frame allocation in render loops; cache sprites; daily simulation must stay
  under ~5 ms for 300 parties.
- Scratch files and screenshots in `shots/<yourname>/` (gitignored).

## File ownership

| Agent | Owns |
| --- | --- |
| world | new `15-factions.js`, `40-world.js`, `20-state.js`, `10-data.js` (FACT and new tables like `SITS`, `BLD`, `GOODS`), `30-mercs.js`, `14-company.js`, new `test/world.js` |
| contracts | new `16-contracts.js`, `50-towns.js`, `68-battle-flow.js`, `60-battle-core.js`, `62-forecast.js`, `63-ai.js`, `64-foes.js`, `67-deploy.js`, `test/headless.js`, `test/forecast.js`, `test/balance.js`, new `test/contracts.js` |
| events | new `17-events.js`, new `events.css`, `85-game.js`, `56-camp.js`, `camp.css`, `13-craft.js`, new `test/events.js` |
| look | `51-townview.js`, `town.css`, `41-worldart.js`, `45-mapscreen.js`, `70-render.js`, `80-input.js`, `06-icons.js`, `07-portraits.js`, `73-units.js`, `90-shell.js`, `body.html`, `style.css`, `panels.css`, `55-company.js`, `52-panels.js`, `65-battle-ui.js`, `battle-hud.css`, `82-inspect.js`, `inspect.css`, `46-banner.js`, settings.css; new `57-factions-ui.js`, `factions.css` (Factions screen: houses, banners, territory, reputation bars and log) |

The look agent also converts every hard-coded `type==='hunt'|'deliver'` contract check in its files
(70-render.js, 45-mapscreen.js, 80-input.js, 51-townview.js, 65-battle-ui.js) to the generic `ctr*`
hooks with fallbacks, shows house territory on the full map (tinted borders), town ownership banners
and situation markers on the world, party art per goal (caravan wagons, patrol knights in house
colours, raiders, nests as growing lair sprites), new town buildings in the illustrated town view with
their service panels, the negotiation UI (contracts agent supplies logic) and the origin picker.
