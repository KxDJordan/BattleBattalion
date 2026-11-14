# Wyrdmarch: Phase 5 (combat depth) working contract

Wyrdmarch is a mobile browser tactics game (mercenary company sandbox in the spirit of Battle
Brothers, with a fantasy layer: four gifts Mana/Aura/Qi/Chi), landscape-only, pixel art, shipped as ONE
self-contained HTML file. Source lives in `src/`; `node build.js <out>` concatenates it (CSS files,
`body.html`, then all `src/*.js` in filename order inside one `'use strict'` script, so every top-level
`function`/`const`/`let` is a shared global: check names for collisions before adding one).

Phase 5 goal: the battle rules reach Battle Brothers depth, plus the fantasy layer on the enemy side.
Done when: each of the six factions needs a different answer, and a naive autoplayer wins under 50% of
even fights while a scripted "sensible" player wins over 80%.

Standing rule from the plan: **every new rule must show in the forecast panel or the HUD before the
player acts; cut any rule the player cannot read.** Turns must stay quick on a phone.

Quality bar: a shipped, premium game. Rules must be deterministic under the seeded RNG, robust, and
covered by the headless tests. The owner explicitly asked for beautiful graphics and effects: every new
mechanic gets proper pixel-art feedback.

## Hard rules for every agent

- Four agents work in this folder at once. Edit ONLY the files you own. Never edit another agent's
  file; code against the interfaces below with fallbacks (`typeof X==='function'`); list requests in
  your final report.
- Build to your own output: `node build.js dist/<yourname>.html`. Never write `dist/index.html`.
  Another agent's half-saved file can break your build briefly: wait and rebuild.
- No git commands. No dependencies or external resources (strict CSP).
- Game randomness goes through `rnd/ri/pick/shuffle` (seeded, saved). Visuals and previews never
  consume it. `forecast()` must stay side-effect free.
- `node test/headless.js --quick`, `node test/forecast.js` and `node test/smoke.js dist/<you>.html 667
  375` must pass on your build when you finish. Rules run in node with DOM stubs and no canvas: guard
  module-level DOM access.
- Pixel art uses ONLY `PAL` colours from `src/05-pixel.js`; icons are 16x16 with a 1px `'0'` outline
  (see `06-icons.js`). Look at what you draw (Playwright screenshots, zoomed) before calling it done.
- Viewports: 667x375 (smallest), 844x390, 1280x720, tall pane 520x800. Honor `reduced` (reduced
  motion) and safe areas.
- Scratch files and screenshots in `shots/<yourname>/`.

## File ownership

| Agent | Owns |
| --- | --- |
| rules | `60-battle-core.js`, `62-forecast.js`, `30-mercs.js`, `20-state.js`, `10-data.js` except the `EN` and `FACT` tables, `test/forecast.js`, `test/headless.js` |
| foes | `63-ai.js` (new), `64-foes.js` (new), the `EN` and `FACT` tables in `10-data.js`, `test/balance.js` (new) |
| camp | `67-deploy.js` (new), `deploy.css` (new), `68-battle-flow.js`, `50-towns.js`, `51-townview.js`, `town.css`, `55-company.js`, `52-panels.js`, `panels.css` |
| show | `65-battle-ui.js`, `battle-hud.css`, `06-icons.js`, `07-portraits.js`, `73-units.js`, `74-anim.js`, `75-fx.js`, `82-inspect.js`, `inspect.css`; battle section of `70-render.js` |

## Shared design and data shapes (fixed; build to these)

**Hit locations and armor** (rules): two armor pools per unit. Battle unit: `u.arm/u.armMax` (body),
`u.helm/u.helmMax` (head). Each hit rolls a location (head 25% base, modified by abilities); head hits
deal x1.5 to hitpoints after armor. Helmets are items with `k:'h'` in `ITEMS` (several tiers, with
`arm` and `fat`), worn in `m.eq.h`. Armor does not repair itself: a merc's remaining armor persists
between battles in `m.cond = {a: bodyPointsLeft, h: helmPointsLeft}` (absent = full). Repair consumes
`G.tools` (a company stock like food): camping or resting repairs N points per tool; towns sell tools.
`repairAll()` (rules) performs the repair and returns what it did.

**Morale** (rules): `u.mor` in 0..4 = fleeing, breaking, wavering, steady, confident; `MORN` names.
New merc attribute resolve `brv` (in `m.base`, levelled like the others; enemies have `def.brv`).
Resolve checks on ally deaths, heavy hits, being surrounded, and positive ones on kills; morale
modifies hit/defence; fleeing units run for their edge and are uncontrollable; rallying at turn start.
Undead and some foes are fearless (`def.fearless`).

**Injuries** (rules): `m.inj = [{id, days}]`, `days` remaining (`-1` = permanent). Table `INJ[id] =
{n, d, perm, st:{stat deltas}, ...}` in `10-data.js`. Inflicted by big hits and by being struck down;
applied in `calc(m)`; heal over days; `treatInjury(m, id)` (rules) for the temple, with
`injuryCost(m,id)`.

**Line of sight and cover** (rules): `losInfo(u, t)` → `{blocked, cover, ff}`: `blocked` when props
or higher ground fully block a ranged attack; `cover` 0..2 (to-hit penalty steps); `ff` = allies in
the line of fire who can be hit when the shot misses. Used by `hitChance`, `validTargets`, `forecast`.

**Statuses** (rules): one registry `STATUS[key] = {n, d, icon, good}` in `10-data.js` for every status
and buff a unit can carry (existing: burn chill root stun; new ones as needed: bleed, daze, webbed,
shieldwall, riposte, spearwall, rallied, ...). A unit's active statuses are listed by
`unitStatuses(u)` → `[{key, n, turns}]`. show renders from this generically.

**Abilities** (rules + foes): everything a unit can do is an `AB` entry executed by `useAbility`.
Weapon skills (rules) are granted by the equipped weapon type (`ITEMS[id].sk = [abilityIds]`): e.g.
riposte, split shield, spear wall, hook, puncture, plus others that fit each weapon family, 1-2 per
family. Enemy abilities and enemy resources (foes) live in `64-foes.js` as entries added to `AB`
(with `foe:1`) and per-enemy `def.abs`; enemies get them through the existing hook `enemyInit(u,id)`
(called by rules for every enemy at battle start). New mechanics they need (raise the fallen, webs,
charges, buffs, blinks, summons) are implemented in `64-foes.js` using rules' primitives (`strike`,
`hurt`, `knockback`, statuses, `spawnUnit(u)` which rules provides to add a unit mid-battle).
Every ability has `n` (name), `d` (one-line description), costs, and may carry `fx:'<hint>'`.

**AI** (foes): `aiTurn2(u)` (rules' `aiTurn` already delegates to it when defined) drives every
AI-controlled unit, including the player's units in auto-battle. Roles per enemy (`def.role`:
`'line'|'flanker'|'guard'|'sniper'|'caster'|'beast'|'boss'`). `BUDGETK` (number, default 1) scales
the enemy budget in `startBattle`. foes also provides the two test players used by the done-criterion:
`AI_NAIVE(u)` (charge and hit the nearest) and `AI_SENSIBLE(u)` (uses cover, focus fire, abilities,
morale, withdraws wounded), selectable for side 0 in headless runs via `B.opts.pilot`.

**Events** (rules emits through `FX.emit`, show animates): existing `hit miss death cast move kb heal
buff turn`; new `morale {u, from, to}`, `injury {t, id}`, `loc {t, head:bool}` (with hits),
`blocked {u, t}` (LOS), `ff {u, t}` (friendly fire), `spawn {u}`, `withdraw {u}`, `status {t, key}`.

**Retreat and reserves** (rules): `withdraw` is a move available to a unit standing on its own
deployment edge: it leaves the battle alive. "Sound the retreat" makes every unit not adjacent to an
enemy leave at once; engaged units each take the free attacks of adjacent foes first, then leave if
alive. Fielded limit stays 12; mercs in the roster but not fielded are reserves and one may enter per
round on a free own-edge tile through `callReserve(m)` when fewer than 12 player units are on the
field. `B.reserves` lists who is available.

**Deployment** (camp): `deployBattle(o)` (the world already calls `engage(o)`, which calls it when
defined) shows a pre-battle screen: enemy composition (types and counts, as far as scouted), terrain
preview, the player's deployment zone with the 12 placed from the formation, drag/tap to rearrange,
reserves list, Begin and Retreat-before-battle. It then calls `startBattle(o)` with
`o.deploy = [{id: mercId, c, r}]`, which rules honors. A setting `SET.deploy` (default on) lets
players skip it. Headless/auto paths call `startBattle` directly and never see it.

**Strategic layer UI** (camp): helmet slot on the paper doll, armor condition bars, injuries on the
roster and character screens, tools in the market and HUD/company header, repair on camp/rest, a temple
service in towns to treat injuries, resolve in level-ups.

**Presentation** (show): morale state on unit overlays and the unit chip, head/body armor in the chip
and forecast, hit location, cover and friendly-fire risk in the forecast, status icons from `STATUS`,
icons `ab-<id>` for every new ability, `inj-<id>` or generic injury icon, `helmet`, `tools`, `resolve`,
`morale-0..4`; helmets on unit sprites and portraits from `m.eq.h`; animations for every new ability
and event; an LOS line/cover hint on the board while aiming.
