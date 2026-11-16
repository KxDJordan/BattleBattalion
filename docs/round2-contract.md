# Round 2 contract (3 parallel agents, base branch `round2`)

Owner's requests (verbatim):
1. "I would rather give the player choices on how to respond [to the Betrayal contract twist, where the employer pays only part]: Accepting the short, arguing it with a stat check, or taking it by force with a reputation cost with that faction."
2. "Also on the world map towns with garrisons should dispatch them to take care of any enemies that get too close. Make sure large garrisons equipment colors match their house flag colors."
3. "Add a second body armor layer specifically for surcoats and make them available to purchase at a tailor. This should be layered over whatever armor is being worn and has the players emblem and colors. All houses soldiers wear matching surcoats."
4. "Update the flag graphics to use the same hi res paint style in the menus and add more options."

## Shared rules
- Each agent: own git worktree; first `git merge --ff-only round2` (or `git checkout -B <branch> round2`); commit there; do NOT push; never touch main. Commit messages end with the two attribution lines given in your prompt.
- Seeded RNG only in rules; forecast exact; determinism replays (test/headless.js) must match; saves: add optional fields with repair, bump SAVEVER only with a migration and only if unavoidable (coordinate: agent S owns any SAVEVER bump; others must not bump).
- Painted icons via src/06p-iconspaint.js kit; Detail Low (hdArt() false) keeps pixel art.
- Build `node build.js index.html`; add your own test file; run the existing tests listed in your prompt on a fresh build.

## Ownership
- Agent W (world): Betrayal choices (16-contracts.js twist + its sheet UI) and town garrisons sallying on the world map (40-world.js / 15-factions.js / 42-caravans.js as needed, new file src/43-garrisons.js). Garrison battles use the house's soldiers; their livery colours come from the house banner via houseLivery(houseId) — agent S defines houseLivery; W calls it with a typeof guard.
- Agent S (surcoats + livery): new equipment slot for surcoats (m.eq.c), items in ITEMS (k:'c'), sold by the tailor (47-tailor.js), drawn over body armor on battle figures (73-units.js / 73h-unitshd.js), portraits (07-portraits.js / 07h), item icons (painted). Player surcoats show the company banner colours + emblem (G.banner / bannerFix). House soldiers (and any house-employed units: patrols, garrisons, siege defenders, house hosts) wear their house surcoat and equipment tinted to the house banner colours: define houseLivery(houseId) -> {c1,c2,emblem} from the house banner in 15-factions.js / 46-banner.js. SAVEVER bump owned here if needed.
- Agent F (flags): the banner/flag art in menus (46-banner.js bannerHTML / bannerCanvas / emblemHTML, setup dialog, company screen, faction sheets, rival cards, world-map town flags if they use bannerCanvas) in the painted hi-res style at Detail High (Detail Low keeps pixel flags); more options: more colours (BANNERC), more emblems (EMBLEMS), banner shapes/divisions (e.g. per pale, per fess, quartered, chevron, saltire, bordure) and maybe a second emblem tincture — stored in G.banner with defaults so old saves and houses/rivals keep their look. Must stay compatible with bannerFix() consumers (agent S reads c1,c2,emblem; new fields optional).
