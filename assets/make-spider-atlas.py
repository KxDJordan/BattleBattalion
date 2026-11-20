#!/usr/bin/env python3
"""Cut the user's two spider sheets (the Webspinner, EN 'spider') into the rig's pieces and the drawn frames, and pack them.

  python3 -I assets/make-spider-atlas.py          # writes src/76n-spideratlas.js
  python3 -I assets/make-spider-atlas.py --fit    # re-fits each rig's setup pose to its sheet's reference and prints it

Reads (both laid out like the skeleton soldiers' sheet, all facing right, the front three-quarter view; the backgrounds are already
transparent, the row labels at the left are dropped by xmin):
  assets/foes/forest-spider.webp  the forest spider (black, a red-marked abdomen): row 1 the compiled spider (the reference), row 2 the
                                  parts (four left legs, the cephalothorax plate, the head, four right legs, the abdomen), row 3 seven
                                  heads, then the frame rows: walk / run (8), attack (7: crouch, rear, lunge, the bite low and forward
                                  (5), recover), cast (7: rear up and spit (4), settle), hit (7), death (7, the last curled up).
  assets/foes/sand-spider.webp    the desert / sand spider (brown, a tan-striped abdomen, longer thinner legs): the same rows; death 6.
The row-3 heads (angry, fury, glow, glare, squint, hurt, dead) are brought to the part-row head's size; the part-row head (round red
eyes, as the reference and the frames draw it) is the 'neutral' head. Each rig is the orcs' parts rig (make-orc-atlas.py build): the
setup pose places the pieces on the reference [slot, piece, box centre (ref px), turn deg, scale] in draw order (the abdomen, the far
legs, the plate, the near legs, the head); it was fitted with --fit (a coordinate search for each piece's place, turn and scale that
least differs from the reference, from a hand-placed start) and one leg set by hand where the search pulled it behind the head.
The pose is brought to the frames' scale by the run row's first frame (the same height), its origin its own body centre over its feet
as the frames' are (centred on the tile); the script reports how far it sits from that frame where it covers the whole figure best.
Writes src/76n-spideratlas.js: SPA (forest) and SSA (sand), each the frames and pieces in one half-size webp atlas (76k-orc.js's layout).
Units (WU): the frames' px. No randomness: the output is the same every run.
"""
import json, os, sys
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
import numpy as np
from PIL import Image
import foeframes as ff

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('mkorc', os.path.join(ROOT, 'assets', 'make-orc-atlas.py'))
orc = importlib.util.module_from_spec(spec); spec.loader.exec_module(orc)

HEADS = ['angry', 'fury', 'glow', 'glare', 'squint', 'hurt', 'dead']
LEGS = ['leg_l1', 'leg_l2', 'leg_l3', 'leg_l4', 'leg_r1', 'leg_r2', 'leg_r3', 'leg_r4']
PIV = dict({n: (.5, .15) for n in LEGS}, plate=(.5, .5), abdomen=(.55, .6), head=(.45, .3))
# per sheet: the reference (a point inside it), the parts (a point inside each), the heads' band, the part-row head, the setup pose,
# the frame rows [name, y0, y1, (frames)] and a point inside the walk row's first frame (the rig is sized and centred by it)
SPIDERS = {
 'SPA': dict(title='FOREST SPIDER', src='forest-spider.webp', ref=(555, 149),
  parts={'leg_l1': (88, 366), 'leg_l2': (150, 368), 'leg_l3': (201, 367), 'leg_l4': (262, 378), 'plate': (383, 374),
         'leg_r1': (663, 376), 'leg_r2': (727, 369), 'leg_r3': (780, 369), 'leg_r4': (848, 368), 'abdomen': (999, 357)},
  head_band=(455, 600), head_part=(528, 371),
  setup=[('abdomen', (107, 88), -2, 1.1), ('leg_r4', (258, 162), -16, .89), ('leg_r3', (258, 178), 3, .95), ('leg_l1', (35, 181), 4, .94),
         ('leg_l2', (70, 201), 8, .89), ('plate', (178, 134), 8, .86), ('leg_r2', (248, 192), -12, 1.14), ('leg_r1', (198, 186), -8, .92),
         ('leg_l3', (116, 201), 9, 1.07), ('leg_l4', (136, 199), 13, 1.14), ('head', (193, 182), 1, .99)],
  rows=[('run', 630, 760, 8), ('attack', 770, 910), ('cast', 930, 1065), ('hurt', 1085, 1215), ('death', 1235, 1370)], a0=(209, 690)),
 'SSA': dict(title='SAND SPIDER', src='sand-spider.webp', ref=(558, 155),
  parts={'leg_l1': (85, 379), 'leg_l2': (159, 388), 'leg_l3': (228, 386), 'leg_l4': (289, 392), 'plate': (388, 389),
         'leg_r1': (642, 396), 'leg_r2': (702, 386), 'leg_r3': (763, 389), 'leg_r4': (835, 382), 'abdomen': (993, 364)},
  head_band=(480, 620), head_part=(524, 396),
  setup=[('abdomen', (125, 81), -6, 1.02), ('leg_r4', (352, 176), 5, 1.08), ('leg_r3', (313, 142), -4, 1.11), ('leg_l1', (55, 169), -2, .98),
         ('leg_l2', (104, 182), 0, 1.1), ('plate', (214, 147), 0, .94), ('leg_r2', (286, 167), 10, 1.05), ('leg_r1', (272, 182), -6, .94),
         ('leg_l3', (166, 220), -6, 1.0), ('leg_l4', (222, 198), -6, 1.0), ('head', (256, 185), -5, .98)],   # leg_l4 by hand
  rows=[('run', 640, 775, 8), ('attack', 790, 920), ('cast', 950, 1080), ('hurt', 1105, 1240), ('death', 1265, 1395, 6)], a0=(209, 708))}
XMIN = 100      # the row labels end left of the first frames (their left edges are at 8)


def fit(C, rounds=3):
    """the setup pose re-fitted to the reference: each piece's centre, turn and scale moved while the composed pose's premultiplied colour
    and alpha differ less from the reference's (turns within 25 deg, scales .85 .. 1.15)"""
    S = ff.load(os.path.join(ROOT, 'assets', 'foes', C['src'])); lab, comps = ff.components(S, keep=300)
    cut = lambda pt: ff.trim(ff.cut(S, lab, ff.comp_at(comps, *pt))[0])[0]
    REF = cut(C['ref']); RH, RW = REF.shape[:2]; OFF = 40; W, H = RW + 2 * OFF, RH + 2 * OFF
    P = {n: Image.fromarray(np.clip(cut(pt), 0, 255).astype(np.uint8)) for n, pt in dict(C['parts'], head=C['head_part']).items()}
    R = np.zeros((H, W, 4), np.float32); R[OFF:OFF + RH, OFF:OFF + RW] = REF; Ra = R[..., 3:] / 255
    def err(setup):
        cv = Image.new('RGBA', (W, H))
        for n, (cx, cy), rot, sc in setup:
            im = P[n].resize((max(1, round(P[n].width * sc)), max(1, round(P[n].height * sc))), Image.LANCZOS).rotate(-rot, resample=Image.BICUBIC, expand=True)
            cv.alpha_composite(im, (int(round(cx + OFF - im.width / 2)), int(round(cy + OFF - im.height / 2))))
        A = np.array(cv).astype(np.float32); a = A[..., 3:] / 255
        return (np.abs(A[..., :3] * a - R[..., :3] * Ra).sum(-1) + 255 * np.abs(a - Ra)[..., 0]).mean()
    setup = [list(s) for s in C['setup']]; e = err(setup)
    for _ in range(rounds):
        for dx, dr, ds in ((6, 8, .08), (3, 4, .04), (1, 2, .02), (1, 1, .01)):
            for i in range(len(setup)):
                better = True
                while better:
                    better = False
                    for k, dv in ((0, dx), (0, -dx), (1, dx), (1, -dx), (2, dr), (2, -dr), (3, ds), (3, -ds)):
                        q = [setup[i][0], list(setup[i][1]), setup[i][2], setup[i][3]]
                        if k < 2: q[1][k] += dv
                        else: q[k] += dv
                        if not (.85 <= q[3] <= 1.15 and abs(q[2]) <= 25): continue
                        s2 = setup[:]; s2[i] = q; e2 = err(s2)
                        if e2 < e - 1e-4: e, setup, better = e2, s2, True
    return setup, e


if __name__ == '__main__':
    if '--fit' in sys.argv:
        for var, C in SPIDERS.items():
            s, e = fit(C); print(var, 'difference %.2f' % e); print(json.dumps([[n, list(c), r, round(sc, 2)] for n, c, r, sc in s]))
        sys.exit()
    js = ['/* ================= SPIDER ATLASES (generated by assets/make-spider-atlas.py from assets/foes/forest-spider.webp and sand-spider.webp; do not edit) =================\n'
          '   SPA (the forest spider) / SSA (the sand spider): .f[anim] = the drawn frames, each {r: [x,y,w,h] in the atlas (px of this half-size\n'
          '   webp), w h: the frame in sheet px, ax ay: the body\'s centre over the feet, frame px}, facing right: run (8), attack, cast, hurt (7),\n'
          '   death (7; the sand spider\'s 6); .H: the run row\'s first frame\'s height (WU). .p[piece] = {r, w, h, pv: the pivot, piece px}: the\n'
          '   rig\'s eight legs, plate, abdomen and eight heads (neutral: the part row\'s; angry, fury, glow, glare, squint, hurt, dead). .set: the\n'
          '   rig\'s setup pose [slot, piece, x, y (WU from the feet), turn deg, scale] in draw order. Read by 76o-spider.js. */\n']
    for var, C in SPIDERS.items():
        C = dict(C, n=7, xmin=XMIN, H_row='run', heads=HEADS, neutral=True, whole=True, poly={}, lower={}, piv=PIV,
                 setup=[(n, 'head_neutral' if n == 'head' else n, c, r, sc) for n, c, r, sc in C['setup']])
        js.append(orc.build(var, C))
    with open(os.path.join(ROOT, 'src', '76n-spideratlas.js'), 'w') as f: f.write(''.join(js))
