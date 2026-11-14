# Wyrdmarch: optimisation round, working contract

Wyrdmarch is a landscape mobile pixel-art tactics game shipped as ONE self-contained HTML file
(repo `KxDJordan/BattleBattalion`, branch `opt-wip`). Source in `src/`; `node build.js <out>`
concatenates CSS, `body.html` and every `src/*.js` (filename order) into one `'use strict'` script
(every top-level name is a shared global). Never write `index.html`. Read `docs/*.md` for systems.

**Goal (owner's words): "do some major optimization without sacrificing functionality."** Target
devices are mid-range and older phones (iPhone SE / 11, mid Android) in Safari/Chrome, often as a
home-screen app. Make the game load faster, run smoother (steady 60 fps in battle and on the world
map, no hitches when panels open), use less memory and battery, and ship a smaller file.

## Non-negotiables

- **Zero functional change.** Same rules, same RNG draws in the same order (determinism hashes in
  `node test/headless.js` must stay identical to the baseline), same saves, same UI, same art.
- **Pixel-identical visuals** unless an approximation is invisible and you prove it with a
  side-by-side screenshot diff. The baseline build is `dist/base.html` (do not modify it). Compare
  your build against it at 844x390 and 667x375 for the screens you touch (Playwright, Chromium
  preinstalled; `deviceScaleFactor: 2`). Keep animations/reduced motion/safe areas behaving the same.
- Every test must pass on your build when you finish: `node test/headless.js --quick` (and the full
  run once at the end if you touched rules/AI), `test/forecast.js`, `test/items.js`, `test/craft.js`,
  `test/company.js`, `test/world.js`, `test/contracts.js`, `test/events.js`, and
  `node test/smoke.js dist/<you>.html 667 375` and `520 800`.
- Measure before and after; report numbers. Tools: `node shots/opt/prof.js <html> 4` (load, new game,
  world/battle fps under 4x CPU throttle, heap) and `node shots/opt/cpuprof.js <html> load|world|battle`
  (top self-time functions). Write your own micro-benchmarks in `shots/<you>/`. Do not keep an
  optimisation that does not measurably help.
- No new dependencies or external resources. No git commands. Edit only files you own; ask the lead
  for anything else in your final report.
- Prefer simple, local changes with comments over clever rewrites; do not reduce readability of the
  data tables. Remove dead code only when you are sure it is dead (grep every name across `src/` and
  `test/`).

## Ideas per area (not exhaustive; profile first)

- Startup: `px()` paints one `fillRect` per pixel (use one `ImageData` with a Uint32 palette, or batch
  runs); icons/portraits generated eagerly; `pxURL` `toDataURL` for every icon; world generation and
  first-frame caches; the build ships comments and indentation (a safe, tokenizer-aware minifier in
  `build.js` that keeps strings, template literals and regex literals intact, verified by running the
  whole test suite against the minified build; keep `node build.js --dev` unminified for debugging).
- Battle render: sprites rebuilt during play instead of cached; per-frame allocations (closures,
  arrays, strings) in `drawBattle`/overlays/fx; redundant `getContext`/`putImageData`; overdraw;
  offscreen layers for static board; canvas sizes vs devicePixelRatio.
- World render: tile/chunk cache invalidation, `drawImage` count per frame, minimap redraw every
  frame, party/town overlays, `moveParties` (about 0.9 ms/frame with 300 parties), map screen loop.
- UI/DOM and logic: full `innerHTML` re-renders of big panels on every tap, timers (`chromeTick` every
  250 ms), forecast placement loop, layout thrash (read/write interleaving), `save()` cost and
  frequency (localStorage JSON size; fog packing), AI think time per unit, auto-battle speed, event
  listeners left attached, memory held by caches (bounded LRU where caches grow without limit).

## File ownership

| Agent | Owns |
| --- | --- |
| boot | `build.js`, `src/05-pixel.js`, `src/06-icons.js`, `src/07-portraits.js`, `src/08-frames.js`, `src/46-banner.js`, `src/47-tailor.js`, `src/body.html`, all `src/*.css` |
| battle | battle section of `src/70-render.js` (`drawBattle` and everything only it calls: board, units, overlays, fx drawing, `fitBattle`, rotate), `src/71-tiles.js`, `src/73-units.js`, `src/74-anim.js`, `src/75-fx.js`, `src/76-monsters.js`, `src/66-monsters.js` |
| world | world section of `src/70-render.js` (`drawWorld`, `drawMinimap`, `wv*`/`wch*` helpers, `frame`, `setRes`, `perfTick`, `screenRecover`), `src/41-worldart.js`, `src/45-mapscreen.js`, `src/40-world.js`, `src/15-factions.js`, `src/51-townview.js` |
| logic | `src/60-battle-core.js`, `src/61-talents.js`, `src/62-forecast.js`, `src/63-ai.js`, `src/64-foes.js`, `src/65-battle-ui.js`, `src/67-deploy.js`, `src/68-battle-flow.js`, `src/20-state.js`, `src/52-panels.js`, `src/55-company.js`, `src/56-camp.js`, `src/57-factions-ui.js`, `src/82-inspect.js`, `src/80-input.js`, `src/90-shell.js`, `src/50-towns.js`, `src/16-contracts.js`, `src/17-events.js`, `src/14-company.js`, `src/13-craft.js`, `src/30-mercs.js`, `src/12-famed.js`, `src/10-data.js` |

`70-render.js` is shared between battle and world: each edits only its own functions, re-reads the
file before every edit, and keeps edits small. Build to `dist/<you>.html` (`boot`, `battle`, `world`,
`logic`). Scratch work in `shots/<you>/`.
