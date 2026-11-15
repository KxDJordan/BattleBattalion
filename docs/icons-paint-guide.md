# Painted icons: style guide and kit (src/06p-iconspaint.js)

Owner's brief: *"Update all icons to use high resolution icons done in a clean lineart, high contrast, painted style.
Status effect icons painted over the character should be hi-rez squares with icons to represent the effect."*

Phase 1 (done) built the kit, the pipeline, the status squares and 59 reference icons. Phase 2 paints the rest in four
parallel work packages (bottom of this file). **Read the reference icons in 06p before drawing anything** — they are the style.

## 1. Style rules

1. **Vector, not pixels.** Canvas 2D paths, anti-aliased. No stair-steps, no pixel grids, no dithering.
2. **One light, from the upper left.** `pkFill` paints every shape in three values (lit → mid → shadow gradient along the
   light), adds a **deep core-shadow crescent** on the lower-right edge (two bands) and a **bright rim** on the upper-left
   edge. Rotated parts are lit the same way (the light is mapped into the current transform). Don't fight it.
3. **Ink.** Near-black `PK.ink` (#0c0d12). Inner lines `PK.lw` = 1.1 units (pkFill strokes every shape). The outer
   silhouette is thickened automatically by the render pass (`PK.ol` = 1.15 units, nudged down-right so the bottom/right
   edge reads heavier). Never draw your own heavy outer outline.
4. **High contrast, saturated.** Pick a material ramp (PKM) whose mid tone is clearly different from ink and from the
   panel background (#1c2b29-ish dark teal, and the light themes). Keep the subject's main colour from the old pixel icon.
5. **Big, simple shapes.** Fill the 32-unit box (≈2..30). The icon must read at **16 CSS px** — test it on the sheet.
   One subject + at most one secondary element (a swoosh, a drop, a spark). Thin things (blades, hafts, strings) need
   ≥ 2.6 units width for hafts, ≥ 4.4 for blades, ≥ 1.1 for strings; arrows ≥ 2.2.
6. **Highlights**: a glint (`pkGlint`) or specular dot (`pkSpec`) on metal, gems, coins, gloss — one per icon, max two.
   Glows (`pkGlow`) only for magic/fire/frost, and keep them inside the box.
7. **Keep identity**: meaning, main colour and silhouette recognisable from the current icon (weapons stay diagonal,
   point to the upper right; shields face front; flags on a pole at the left; etc.).
8. **Families look alike**: same part functions, same proportions, same materials for the same thing (steel blades,
   wood hafts, brass guards and pommels, leather grips).

## 2. How it works

* Drawing space is **32 × 32 units** whatever the output size. `PAINT[name] = (g, px) => {...}`; `g` is already scaled
  (1 unit = px/32 device pixels); `px` is the canvas size if you need it (rarely).
* `name` is the **resolved** icon name (a key of `ICONS`, i.e. what `icResolve()` returns): `PAINT.bleed` covers
  `st-bleed`; `st-poison` resolves to `ab-poison`; every `it-<id>` is its own name. Check with `icResolve('st-xyz')`.
* Lazy: `pxIcon()` → `icHdUse(n)` (06h) → if `pkHas(n)` the painted data URL (`pkURL`) goes into `<style id="pxi-hd">`
  as `.pxi-<n>{background-image:…;image-rendering:auto!important}`, otherwise the 32×32 HD pixel icon as before.
  Painting happens once per icon on first display (≈1.5–2 ms each), so start-up is unchanged.
* Resolution: `pkPx()` = 96 / 128 / 160 px for devicePixelRatio 1 / 2 / 3 (crisp up to 48 CSS px).
* **Detail Low** disables the HD sheet: the original 16 px pixel icons, pixelated, unchanged. Switching is live
  (`onArtChange`) and clears the painted canvas caches.
* Canvas users: `pkCanvas(name, devicePx)` → painted canvas or null (Detail Low / not painted yet).
* Status squares: `pkBadgeCanvas(id, tone, turns, devicePx)` (tone `'good' | 'bad' | 'neutral'`), cached.

## 3. Kit API (all in src/06p-iconspaint.js)

Materials `PKM` — 5-tone ramps `[deep, shadow, mid, lit, highlight]`; pass a name or your own 5-array:
steel iron dark silver bronze brass gold wood darkwood leather cloth(=madder red) blue green teal verd purple bone vellum
canvas skin meat stone white; gifts **mana aura qi chi**; elements **fire frost poison blood void holy**.
`PK_GIFT` maps gift → material; `PK_TONE` maps good/bad/neutral → verd/blood/brass.

Shapes (return `{p: Path2D, b: bbox}`; coordinates in the current local units):

| call | |
|---|---|
| `pkS('M… C… Z')` | from SVG path data (absolute or relative commands) |
| `pkCirc(cx,cy,r)` `pkEll(cx,cy,rx,ry,rotDeg)` `pkRect(x,y,w,h,r)` `pkPoly([x,y,…])` | primitives |
| `pkTube(pts,w|[w0,w1],'round'|'flat')` | a stroke as a fillable shape (hafts, limbs, swooshes, tapering) |
| `pkQ(x0,y0,cx,cy,x1,y1,n)` `pkArc(cx,cy,r,a0,a1,n)` | sample a curve into points for pkTube/pkPoly (angles: 0 = up, clockwise) |
| `pkU(a,b,…)` | union: one painted body, ink only on the outside (snowflakes, crossed bars) |
| `pkStarS(x,y,r,n,ri)` `pkDropS(x,y,h)` `pkShieldShape(kind,w,h)` | common outlines |

Paint:

| call | |
|---|---|
| `pkFill(g,S,mat,{ball,flat,k,lw,ink,noRim,noShade,rule,inside(g,m)})` | **the** painted fill. `ball` = spherical light; `k` crescent size (1.5); `lw:0` no line; `inside` paints more, clipped to the shape, before the line (bevels, grain, rivets) |
| `pkLine(g,d,w,col,alpha)` | ink / detail stroke (path string or shape) |
| `pkHi(g,d,w,alpha,col)` | white highlight stroke |
| `pkSpec(g,x,y,r,a)` `pkGlint(g,x,y,r,col)` `pkGlow(g,x,y,r,col,a)` | specular dot, 4-point glint, soft glow |
| `pkPost(fn)` | draw after the outline pass (glints/sparkles that must not get the heavy silhouette line) |
| `pkAt(g,x,y,deg,scale,fn)` | place a part: translate, rotate (0 = pointing up), scale |

Parts (local: base at 0,0, pointing up):
`pkBlade(g,{len,w,mat,tip:'point'|'leaf'|'round'|'clip',fuller})`, `pkGuard`, `pkGrip`, `pkPommel`,
`pkSword(g,x,y,deg,{len,w,mat,hilt,grip,guard,tip})` (whole sword, (x,y) = guard), `pkHaft(g,x0,y0,x1,y1,w,mat)`,
`pkAxeHead(g,{s,mat})`, `pkShield(g,x,y,{kind:'heater'|'round'|'kite'|'tower'|'buckler',w,h,mat,rim,rimW,boss,bossMat,emblem(g,w,h)})`,
`pkGem(g,x,y,r,mat,'diamond'|'round'|'long')`, `pkFlame(g,x,y,h,mat)`, `pkDrop(g,x,y,h,mat)`, `pkSkull(g,x,y,s,mat)`,
`pkFlag(g,x,y,{w,h,mat,pole,wave,droop,tatter,tip})`, `pkCoin(g,x,y,r,mat,mark(g,m,r))`, `pkArrow(g,x0,y0,x1,y1,{w,head,mat,shaft,fletch})`,
`pkStar(g,x,y,r,mat,n,ri)`, `pkSparkle(g,x,y,r,mat)`, `pkSwirl(g,x,y,r,mat,turns)`, `pkScroll(g,x,y,w,h,mat)`,
`pkSwoosh(g,cx,cy,r,a0,a1,w,mat)` (cut trail), `pkBadgeBack(g,tone,{x,w,r,t})` (rounded-square frame used by traits and status squares).
Shared drawings: `PK_HEART` (path), `pkHelmGreat(g,mat,band)`, `pkHeaterCross(g,mat,crossMat)`.

### Examples

```js
PAINT.hp = g => {                                       // a painted heart with a gloss stroke and a glint
  pkFill(g, pkS(PK_HEART), 'blood', {k:2, inside:(g,m)=>pkHi(g,'M6 9.5 Q6.4 6.6 9.2 6.2',2.2,.85)});
  pkPost(g => pkGlint(g, 8.6, 7.6, 2.6));
};
PAINT.sword = g => pkSword(g, 10.5, 21.5, 45, {len:21, w:4.8, guard:12.5, grip:5.2});
PAINT['it-runeblade'] = g => {                          // a variant: same part, other material + a glow
  pkSword(g, 10.5, 21.5, 45, {len:21, w:4.8, guard:12.5, grip:5.2, hilt:'silver'});
  pkPost(g => pkGlow(g, 20, 12, 8, '#8ccfff', .5));
};
PAINT.axe = g => { pkHaft(g, 3.5,28.5, 20,12, 3.2, 'wood'); pkAt(g, 17.5,13, 225, 1, g => pkAxeHead(g, {s:1.08})); };
PAINT['trait-brave'] = g => { pkBadgeBack(g,'good'); pkAt(g,16,16.5,0,.76,g=>{g.translate(-16,-16); pkFill(g,pkS(PK_HEART),'blood',{k:2.4})}) };
```

## 4. Adding an icon (workflow)

1. Find the resolved name: `icResolve('st-foo')`, and look at the old one (`node tools/paint/sheet.js out.png 2 name`).
2. Add `PAINT['name'] = g => {...}` (or `pkP.name`) in **your package's section** of 06p (or a new file
   `src/06p<letter>-*.js`, e.g. `06pa-ui.js`, `06pb-abilities.js`, `06pc-items.js`, `06pd-status.js` — they load after 06p
   and only add PAINT entries, so four agents never edit the same lines).
3. Build `node build.js index.html` and look at the sheet at dpr 2 **and** 3:
   `node tools/paint/sheet.js /tmp/x.png 2 name1,name2,…` — check 16 px (does it read?), 64 px (is it clean?).
4. Families: write one helper per family (`pkItemSword(g, o)`, tier → material / guard / length) and derive the variants
   from it, instead of 40 one-off drawings. Tiers: iron → steel → silver/brass trim → gold/gem + glow for legendary.
5. Never edit ICONS rows or icResolve; never paint in Detail Low; keep each icon under ~3 ms (`PK.ms / PK.n`).

## 5. Status squares over units (done; D extends)

`74-anim.js`: with Detail High each status over a unit is a rounded square drawn at device resolution
(`anBadges` → `pkBadgeCanvas`): ink border, frame **green (verd) = good, red (blood) = bad, brass = neutral**
(`AN_NEU`: telegraph, nova, charging, tired, grab, held, cover; morale ≤1 bad, 4 good, 2 neutral), dark gradient inside,
the painted glyph at 80 %, turns left (1–9) bottom-right in white with an ink edge. Size 13 art px, capped at 26 CSS px.
Statuses without a painting show their HD pixel icon inside the square, so every status is already a square. Package D's
job: paint a glyph for every status (the list `STATUS → icon` is below) so no square shows pixel art.
Detail Low keeps the old 18 px outlined pixel icons. 70-render.js `drawOverlayOld` (only without 74-anim.js) is unchanged.

Status key → icon name it paints (ab-* glyphs belong to package B; D checks they read inside a square):
burn, chill, root, stun, bleed, daze, webbed, splitshield→ab-splitshield, shieldwall, riposte, spearwall, rallied, indom→ab-indom, reinforce→ab-reinforce, empower→ab-empower, buff, tired→st-tired, dance→st-dance, fleet→st-fleet, marked→st-marked, weak→st-weak, slung, undying→st-undying, lucky→undying, bastion→ab-bastion, parry→ab-parry, phalanx→ab-phalanx, holdfast→ab-holdfast, evasive→st-evasive, rage→ab-rage, manashield→ab-manashield, avatar→ab-avatar, steady→st-steady, unloaded, venom→st-venom, coiled→st-coiled, entangled→st-entangled, bark→st-bark, regrow→st-regrow, diving→st-diving, grounded→st-grounded, slammed→st-slammed, fort→shield, poison→ab-poison, hex→hexed, chant→ab-chant, grab→held, harried, pack→ab-pack, bonewall, winded, fury→fresh, spent, banner, enrage→enraged, warcry→ab-warcry, ward→ab-vward, nova→ab-nova

## 6. Canvas-drawn icon paths still pixel (convert in phase 2)

| where | what | owner |
|---|---|---|
| 74-anim.js `anSprite` | chevrons (acting unit), Detail-Low status icons — chevron could become painted | D |
| 75-fx.js `fxSpr('ic:…')` / `glyphFx` | icons floating over units (held, warcry, rallied, telegraph, morale-N, injury, enraged, st-*, reserve): use `pkCanvas(name, px)` when Detail High | D |
| 51-townview.js sign (`iconRows(tvBldIcon(k))`) | building signs on the town view (pixel art scene; keep pixel unless it looks out of place) | A |
| 52-panels.js `PNOWN` (chev, tailor, dice) | own 16 px drawings outside ICONS: add PAINT-like paintings or ICONS entries | A |
| 70-render.js `VICON` (rotl/rotr… view buttons), `OBJMK` (vip / leader marks), `drawOverlayOld` | map/battle view buttons and objective marks | A |
| 65-battle-ui.js `pic()` `<img>` fallback, 06-icons `gameIconCanvas` (app icon) | fallbacks only | — |

## 7. Tools

* `node tools/paint/enum.js out.json` — every icon name (747) after forcing icResolve on AB, STATUS, ITEMS, MAST, TRAITS, goods.
* `node tools/paint/sheet.js out.png [dpr] [REF|names]` — contact sheet (old HD pixel 64 px | new 16/24/32/64 px).
* `OUT=/tmp/p node tools/paint/shots.js dpr w h tag [low]` — roster + battle with statuses on every unit.
* Perf counters: `PK.n`, `PK.ms` (painted icons and ms), `PK.url` (data URLs).

## 8. Phase 2 work packages

Counts are icons to paint; ~~struck~~ names are already painted reference icons (restyle only if the family needs it).
Every package also: build, sheet at dpr 2 and 3, and run the tests (`node test/headless.js index.html --quick`, items,
company, smoke.js at 667 375 / 520 800 / 1280 720). C is the largest list but most names are tier variants of a few
families — build family helpers first.

### Package A: UI, HUD stats, resources, contracts / sites / buildings / goals / reputation / origins / personalities / followers, traits, difficulty, menus — 158 icons (32 already painted)

~~hp~~ ~~armor~~ ~~fatigue~~ ~~init~~ ~~melee~~ ~~ranged~~ ~~mdef~~ ~~rdef~~ ~~ap~~ ~~xp~~ level ~~mana~~ ~~aura~~ ~~qi~~ ~~chi~~ ~~coin~~ ~~food~~ renown day company contract ~~camp~~ zoom menu fullscreen fast auto retreat ~~endturn~~ ~~close~~ back save ~~settings~~ ~~check~~ lock ~~star~~ ~~skull~~ tavern market inn board plus minus info ~~tools~~ resolve ~~morale-4~~ ~~morale-3~~ ~~morale-2~~ ~~morale-1~~ ~~morale-0~~ reserve withdraw temple ~~swap~~ quill ct-deliver ct-hunt ct-escort ct-defend ct-patrol ct-beast ct-relic ct-siege ct-nest ct-bounty sit-famine sit-raided sit-festival sit-plague sit-boom sit-siege bld-armorer bld-weaponsmith bld-college bld-hall bld-fletcher bld-harbour goal-roam goal-caravan goal-patrol goal-raid rep-hostile rep-cold rep-neutral rep-friendly rep-allied or-free or-deserters or-noble or-academy or-hunters or-pilgrims factions negotiate goal-merc rival parley pers-honour pers-cutthroat pers-greedy pers-glory rt-1 rt-2 rt-3 rt-4 rt-5 rt-6 ambition retinue diff-story diff-normal diff-hard diff-brutal ironman hall ledger export import hint laurel fol-scout fol-quarter fol-cook fol-carto fol-recruiter fol-surgeon fol-armorer fol-drill fol-herbalist fol-paymaster fol-banner ~~trait-brave~~ ~~trait-craven~~ trait-hardhead trait-glassjaw trait-athletic trait-asthmatic trait-quick trait-sluggish trait-eagle trait-nearsight trait-tough trait-fragile trait-hulking trait-tiny trait-dexterous trait-clumsy trait-steady trait-bloodthirsty trait-lucky trait-drunkard trait-greedy trait-loyal trait-superstitious trait-beastwise trait-nightowl trait-cocky

### Package B: abilities (ab-*) — 158 icons (6 already painted)

~~ab-attack~~ ab-shove ab-aimed ab-pin ab-footwork ab-adren ab-indom ab-bolt ~~ab-fireball~~ ab-blink ab-chain ab-astrike ab-awave ab-crush ab-adash ab-flame ab-frost ab-gale ab-thunder ab-reinforce ab-mend ab-empower ab-swift ab-splitshield ab-hook ab-puncture ab-stunblow ab-roundswing ab-quickshot ab-raise ab-web ab-pack ab-warcry ab-chant ~~ab-poison~~ ab-blinkstrike ab-scythe ab-nova ab-summon ~~ab-slash~~ ab-thrust ab-impale ab-sweep ~~ab-bash~~ ab-gslip ab-backstab ab-zgrab ab-nbolt ab-sbite ab-trample ab-vlance ab-riftstep ab-gather ab-poisonarrow ab-aarrow ab-farrow ab-iarrow ab-tarrow ab-seeker ab-spiritarrow ab-pparrow ab-carrow ab-sunarrow ab-starpierce ab-bindshot ab-avolley ab-pvolley ab-tempest ab-volley ab-doubleshot ab-headshot ab-pshot ab-cripple ab-mark ab-breath ab-bastion ab-phalanx ab-command ab-secwind ~~ab-bandage~~ ab-surge ab-lotus ab-palm ab-headbutt ab-starfall ab-vanish ab-avatar ab-earthsplit ab-dragon ab-reload ab-batter ab-hsmash ab-ringblow ab-demolish ab-reap ab-trip ab-glaivecut ab-halfsword ab-gswing ab-gsweep ab-mordhau ab-xaim ab-xpin ab-xheart ab-blast ab-fdeafen ab-fexecute ab-spikebash ab-scharge ab-fortress ab-vward ab-vbite ab-slither ab-vspit ab-coil ab-constrict ab-bramble ab-entangle ab-limbcrush ab-groots ab-grove ab-ohurl ab-osweep ab-oslam ab-wbite ab-wsting ab-wbuffet ab-wdiveb ab-barkskin ab-wdive ab-hsting ab-limb ab-swap ab-decap ab-tumble ab-lunge ab-parry ab-flurry ab-cleave ab-slam ab-holdfast ab-triage ab-rage ab-whirl ab-kick ab-grapple ab-haymaker ab-runeedge ab-manashield ab-overload ab-hundred ab-shatter ab-masterstroke ab-staffquake ab-fb_demon ab-fb_saint ab-fb_quake ab-sunder

### Package C: items it-* (incl. fabled it-fb:*, legendary it-lg:*, crisis it-cr*), weapon / shield / armor / helm families, masteries m-* — 313 icons (14 already painted)

swords ~~sword~~ ~~axe~~ ~~mace~~ ~~dagger~~ ~~spear~~ ~~bow~~ ~~staff~~ fist ~~shield~~ armor-light armor-medium armor-heavy ~~helmet~~ helm-1 helm-2 helm-3 helm-4 helm-5 sidearm slung w-warhammer w-pickhammer w-maul w-warmaul w-bill w-halberd w-glaive w-greatsword w-zweihander w-runegreat ~~w-xbow~~ w-arbalest w-pistol w-musket shield-buckler shield-round shield-kite shield-heater shield-tower shield-spiked ~~m-vanguard~~ m-bulwark m-marksman m-skirmisher m-mana m-aura m-qi m-chi it-fangknife it-tuskspear it-silkbow it-heartstave it-bonemaul it-sinewxbow it-tailglaive it-voidgreat it-serpjerkin it-owlcoat it-barkrobe it-ogreharness it-wyvcuirass it-ogrehelm it-tuskhelm it-wyvhelm it-serptarge it-heartround it-wyvkite it-fb:tuskcrown it-crshard it-crbonecrown it-crwartusk it-crempcrown it-knife it-rondel it-club it-mace it-shortsword it-arming it-runeblade it-handaxe it-waraxe it-greataxe it-spear it-warspear it-pike it-shortbow it-warbow it-staff it-focus it-riftedge it-buckler it-kite it-heater it-rags it-robe it-padded it-leather ~~it-mail~~ it-scale it-plate it-hood it-cap it-coif it-kettle it-nasal it-barbute ~~it-greathelm~~ it-mallet it-warhammer it-maul it-warmaul it-bill it-halberd it-glaive it-greatsword it-zweihander it-runegreat it-lightxbow it-crossbow it-arbalest it-pistol it-duelpistol it-musket it-roundshield it-ironround it-spiked it-warspiked it-tower it-steeltower it-dirk it-seax it-stiletto it-kris it-spikedclub it-ironmace it-morningstar it-flail it-bellmace it-oldsword it-falchion it-estoc it-hatchet it-beardaxe it-dwarfaxe it-bardiche it-boarspear it-wingspear it-runespear it-huntbow it-recurve ~~it-longbow~~ it-greatbow it-pilgrim it-ironstaff it-witchstave it-archstaff it-horsepick it-knighthammer it-pitchfork it-voulge it-lucerne it-waster it-bastard it-flamberge it-huntxbow it-repeater it-windlass it-handgonne it-arquebus it-blunder it-longrifle it-targe it-steelbuckler it-pavise it-kite2 it-heater2 it-dwarfround it-jack it-hide it-studded it-brigandine it-sigilrobe it-lamellar it-mailrobe it-coatplates it-gothic it-archrobe it-armcap it-spangen it-sallet it-bascinet it-armet it-tanto it-yoroidoshi it-wakizashi it-katana it-katana2 it-katana3 it-nodachi it-odachi it-naginata it-naginata2 it-suyari it-jumonji it-omiyari it-bo it-hankyu it-yumi it-daikyu it-jingasa it-hachigane it-kabuto it-menpo it-kawari it-kesa it-tatami it-do it-domaru it-oyoroi it-fb:oathkeeper it-fb:vowwall it-fb:widowsong it-fb:palecloak it-fb:anvilfall it-fb:anvilround it-fb:redtusk it-fb:wolfaxe it-fb:wolfpelt it-fb:gravestaff it-fb:shroud it-fb:nightblade it-fb:shadetanto it-fb:cranepole it-fb:cranedo it-fb:demonblade it-fb:demonarmor it-fb:demonmask it-fb:lotusstaff it-fb:lotusrobe it-fb:witchbane it-fb:silverpoint it-fb:saintsrifle it-fb:sinpistol it-fb:sunderedge it-fb:riftmail it-fb:mountainmaul it-fb:bearhide it-fb:lanternmace it-fb:saintstower it-fb:hundredbow it-fb:snowdo it-lg:dawnbringer it-lg:grudgebearer it-lg:widowmaker it-lg:lastmercy it-lg:oathbreaker it-lg:worldhammer it-lg:heartseeker it-lg:skyrender it-lg:kingsblade it-lg:starfall it-lg:wyrmbane it-lg:thunderclap it-lg:starweaver it-lg:kusanagi it-lg:raijin it-lg:stormcleaver it-lg:aegisplate it-lg:shadowweave it-lg:pilgrimmantle it-lg:thousandbattles it-lg:dreadcrown it-lg:oniface it-lg:sunwall it-lg:mirrorshield m-duelist m-brute m-shieldbearer m-tactician m-survivor m-medic m-scout m-berserker m-sharpshooter m-brawler m-mana_m m-mana_r m-aura_r m-qi_r m-chi_m m-chi_r m-weapons m-lightarmor m-medarmor m-heavyarmor m-hunter m-fab.aldric m-fab.mirela m-fab.grimhild m-fab.korvak m-fab.hakon m-fab.ulfgar m-fab.kagemaru m-fab.tomoe m-fab.nobusada m-fab.jin m-fab.seraphine m-fab.mattias m-fab.ysolde m-fab.brannoc m-fab.agathe m-fab.yuki

### Package D: statuses (st-* and bare status names), the overhead status squares for every status, trade goods tg-*, monster parts part-*, quarry q-*, crises cr-* — 118 icons (7 already painted)

~~burn~~ ~~chill~~ root ~~stun~~ buff indom injury cover los-blocked friendly-fire ~~bleed~~ ~~daze~~ webbed ~~poisoned~~ hexed shieldwall riposte spearwall rallied enraged telegraph charging shielded held fleeing splitshield harried pack winded fresh ranged-lock unloaded allybars stash st-tired st-fleet st-dance tg tg-spice tg-salt tg-furs tg-glass tg-ale tg-grain tg-fish tg-timber ~~tg-ore~~ tg-herbs tg-silk tg-wine tg-yew tg-leather cargo tg-gems q-wolf q-spider q-serpent q-bear q-ent q-ogre q-dead q-rift or-slayer q-gob bonewall spent banner tg-flour tg-hides tg-saltfish tg-ironbar tg-yewstaves tg-furbale tg-herbbundle tg-saltbrick tg-spices tg-riftglass tg-alecask boss part-pelt part-silk part-meat part-trinket part-bonedust part-scrap part-venom part-scale part-tusk part-owlhide part-sap part-heartwood part-ogrehide part-ogrebone part-voidshard part-wscale part-wvenom part-membrane salve anvil parts st-venom st-coiled st-entangled st-bark st-regrow st-diving st-grounded st-slammed cr-sunder cr-deadmarch cr-horde cr-barbarian st-marked st-weak st-undying undying st-evasive st-steady

