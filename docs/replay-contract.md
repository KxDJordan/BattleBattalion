# Replayability round: contract (4 parallel agents, base branch `replay`)

Owner's request: "Add seeded run modifiers. And more map variety. Add achievement unlocks for new origins. Add elite enemy modifiers."

## Shared rules
- Base: branch `replay`. Each agent works in its own worktree, commits there, does not push, never touches main.
- Seeded RNG only in rules (rnd/ri/pick/shuffle, or a stream derived from G.seed); cosmetic UI may use Math.random. Forecast stays exact; determinism replays (test/headless.js) must match.
- Do NOT bump SAVEVER. New saved fields are optional with defaults, validated in repairSave (20-state.js) by adding a small repair call guarded with typeof (one line each).
- New-company dialog (90-shell.js ncDraw / NCS): each agent adds ONE section by inserting a single call into ncDraw's `o.innerHTML=` concatenation, guarded with `typeof fn==='function'?fn():''`, and NCS defaults in newCompanySetup. Keep edits to 90-shell.js to those lines; the merge resolves them.
- Every new string shown to the player: plain, short, game-voice. Painted icons: use src/06p-iconspaint.js kit (PAINT[name]=...) for any new icon, plus a 16px pixel fallback via ICONS.
- Tests: add your own test/<name>.js; all existing tests must pass on a fresh build.

## Ownership and interfaces
1. RUN MODIFIERS — new file src/27-runmods.js (+ css if needed).
   RUNMODS[k]={n,d,icon,tone:'good'|'bad'|'mixed',apply hooks}; G.mods=[keys]; rollRunMods(seed,count) deterministic; runMod(k)->bool; runModK(name,def) numeric multipliers read by other systems.
   Setup section: ncModsHTML() — 'Random (seeded)' / 'None' / pick up to 3; shows the rolled ones. A world-map / menu sheet lists active modifiers.
2. MAP VARIETY — src/40-world.js genWorldBase/genWorld (shape-aware), new tables in a new file src/39-mapshapes.js loaded before 40.
   MAPSHAPES[k]={n,d}; G.shape (default 'continent' = today's maps exactly, so old saves and seeds regenerate identically); genWorld(seed) reads the shape from a global set before generation (setWorldShape(k), like setWorldSize). Biome mixes: MAPBIOMES[k] (e.g. 'temperate' default, 'frozen north', 'dry south', 'wild'), G.biomes.
   Setup section: ncShapeHTML().
3. ACHIEVEMENTS + NEW ORIGINS — new file src/28-achieve.js (+ css).
   ACH[k]={n,d,icon,check(G,ev)}; persistent across companies in storage key 'wyrdmarch_ach_v1' (storeGet/storeSet); achGrant(k); achHas(k); achEvent(name,data) called from game hooks (one-line guarded calls in battle end, contract complete, crisis end, day tick, etc.).
   New origins added with Object.assign(ORIGINS,{...}) in 28-achieve.js, each with lock:{ach:k}; originUnlocked(k); the setup's ncOriginHTML shows locked origins greyed with how to unlock (edit ncOriginHTML in 90-shell.js minimally). Menu entry 'Achievements' sheet.
4. ELITE ENEMY MODIFIERS — new file src/64e-elites.js (+ small hooks in 60-battle-core.js, 64-foes.js, 65-battle-ui.js / 82-inspect.js, 74-anim.js).
   ELITES[k]={n,d,icon,tone,apply(u),hooks}; u.elite=[keys]; chosen at battle start from difficulty, day/company strength and runMod('elites') if present (typeof guard); shown as a mark over the unit, in the inspect card and battle chip; forecast exact.
