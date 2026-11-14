# Wyrdmarch

A landscape mobile browser tactics game: lead a free company of mercenaries across a procedurally generated world, take contracts, and fight isometric turn-based battles. Mercenaries can awaken one of four gifts: Mana, Aura, Qi or Chi.

Play it: https://kxdjordan.github.io/BattleBattalion/

## Layout

- `index.html`: the built game, one self-contained file, served by GitHub Pages.
- `src/`: source modules. `build.js` concatenates them, in filename order, into one HTML file.
- `test/`: headless and browser tests.
- `docs/`: design notes from development.

## Build

```bash
node build.js index.html
```

## Test

```bash
node test/headless.js        # full campaign, 500+ auto-battles, determinism replay
node test/headless.js --quick
node test/forecast.js        # forecast matches real strikes
node test/balance.js --n 24 --no-abl --no-cross   # quick balance check
node test/smoke.js index.html 667 375             # browser smoke test (needs Playwright)
```
