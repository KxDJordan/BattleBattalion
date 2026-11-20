#!/usr/bin/env python3
"""Cut the user's colour-keyed sheets (the Orc warlord, the Orc brave, the Ent, the Thornling) into the rig's pieces and the drawn frames,
find their hands, repair the faulty frames, and pack them.

  python3 -I assets/make-keyed-atlas.py [--show DIR]

Reads (all facing right, the front three-quarter view; the skeleton soldier's format, assets/make-skel-atlas.py; the incoming sheet
assets/incoming-<name>-sheet.webp, if there, is moved into place first):
  assets/foes/orc-warlord.webp  the Orc warlord (EN 'orcl'): a compiled reference (horned great helm with a red crest, black and gold
                                spiked plate, fur mantle, red cape, skull belt), the parts (left arm, torso with fur and cape, right
                                arm, head, two legs), seven heads (neutral, roar, grit, stern, shout, hurt, dead), then labelled rows:
                                walk / run 7, attack 7, cast 7, hit 7, death 6.
  assets/foes/orc-brave.webp    the Orc brave (EN 'orcy'): a lighter orc (topknot, bare green arms, fur mantle, red loincloth): the
                                reference, the parts (head, left arm, torso, right arm, two legs), eight heads (neutral, angry, roar,
                                grit, stern, wink, bored, dead), then walk / run 8, attack 7, cast 7, hit 7, death 6.
  assets/foes/ent.webp          the Ent (EN 'ent'; the Elder ent plays it too): reference, parts (leafy head, left arm, hollow trunk,
                                right arm, two stumps), eight heads (neutral, stern, roar, grit, glare, shut, bored, dead), then
                                walk / run, attack, cast, hit 8 each, death 7.
  assets/foes/thornling.webp    the Thornling (EN 'thorn'): the Ent's layout.
No weapon is drawn: the hands are colour keys, RED the off (left) hand and BLUE the weapon (right) hand. Every hand is found (the blue blob;
the red glove by a hint point where the warlord's red cape and crest share its colour, else the largest compact red blob), its centre
recorded, and recoloured to the figure's own colour (an orc's green skin, an ent's bark; its shading kept); the game draws the unit's
own weapon in the weapon hand (src/76mo-orcweap.js orDress, the orcs; the ents carry none). Faulty frames are repaired
here first, reproducibly (FIX below):
  - the warlord's attack 3 has no hands: a red and a blue glove, copied from attack 2, are painted where its hands grip the haft in the
    wind-up (the near forearm's end, the far hand just above it, the axe raised behind);
  - the warlord's attack 4 is missing its near (shield) arm and its swinging hand is red: that hand is re-keyed blue (the weapon hand
    leads the swing, as in attacks 5 to 7), and the parts row's left arm (red glove; its shoulder plate left off), scaled and turned,
    is laid across the body with its glove low on the haft behind the weapon hand;
  - the brave's, the Ent's and the Thornling's attack 4 (the punch) and cast 2 (the raised open hand) have the right hand keyed red:
    re-keyed blue (the same hand is blue in the frames either side).
Hands not seen (behind the body) are placed: in a loop (the run) between the nearest seen ones round the cycle, otherwise between or at
their neighbours'. A white background, if any, is keyed out by flood fill from the sheet's edges (the cream fur and tusks are inside
the outline and are not reached). Figures drawn touching (heads, frames) are parted along least-alpha seams (sep).
Writes src/76n-keyatlas.js: OLA (warlord), OYA (brave), ENA (ent), TNA (thornling), each the 'parts + frames' atlas
(assets/make-orc-atlas.py build) plus .hands[anim][i] = {w, s: the weapon / off hand, WU from the anchor; wa1, wa2: the one- /
two-handed weapon angle, deg; hid: hands placed, not seen; fix: the frame was repaired} and .rh, the same for the rig's setup pose.
--show DIR writes DIR/fix-<var>-<frame>.png (each repaired frame: before, repaired keys, in the atlas) and DIR/hands-<var>.png (every
frame with its hands as recorded). No randomness: the output is the same every run.
"""
import json, math, os, sys
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from collections import deque
import importlib.util
import numpy as np
from PIL import Image, ImageDraw
import foeframes as ff

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('mkorc', os.path.join(ROOT, 'assets', 'make-orc-atlas.py'))
orc = importlib.util.module_from_spec(spec); spec.loader.exec_module(orc)
KEY_R = np.array([194., 67., 61.]); KEY_B = np.array([60., 95., 172.])

def keymasks(S):
    """the key colours' cores: the red glove (its green and blue alike and low: not the ents' orange bark) and the blue glove"""
    r, g, b = S[..., 0], S[..., 1], S[..., 2]; OP = S[..., 3] > 128
    return OP & (r > 120) & (r - g > 85) & (r - b > 85) & (np.abs(g - b) < 40), OP & (b > 90) & (b - r > 45) & (b - g > 25)

def huemasks(S):
    """the key hues at any shade (a glove's shadowed parts)"""
    r, g, b = S[..., 0], S[..., 1], S[..., 2]; OP = S[..., 3] > 128
    return OP & (r > 60) & (g < .5 * r) & (b < .5 * r), OP & (b > 55) & (r < .65 * b) & (g < .8 * b)

def blobs(m, y0=0, x0=0):
    H, W = m.shape; L = np.zeros(m.shape, int); out = []
    for y, x in zip(*np.nonzero(m)):
        if L[y, x]: continue
        n = len(out) + 1; q = deque([(y, x)]); L[y, x] = n; ys = []; xs = []
        while q:
            cy, cx = q.popleft(); ys.append(cy); xs.append(cx)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not L[ny, nx]: L[ny, nx] = n; q.append((ny, nx))
        ys = np.array(ys) + y0; xs = np.array(xs) + x0
        out.append(dict(n=len(ys), cx=xs.mean(), cy=ys.mean(), w=int(xs.max() - xs.min() + 1), h=int(ys.max() - ys.min() + 1), ys=ys, xs=xs))
    return out

def grow(m, k):
    for _ in range(k):
        g2 = m.copy(); g2[1:] |= m[:-1]; g2[:-1] |= m[1:]; g2[:, 1:] |= m[:, :-1]; g2[:, :-1] |= m[:, 1:]; m = g2
    return m

def blob_at(M, pt, r=16):
    """the key blob nearest pt (within r px)"""
    x, y = pt; y0, x0 = max(0, y - 40), max(0, x - 40)
    B = [q for q in blobs(M[y0:y + 40, x0:x + 40], y0, x0) if q['n'] >= 60]
    B = [q for q in B if math.hypot(q['cx'] - x, q['cy'] - y) <= r] or [q for q in B if ((q['xs'] - x) ** 2 + (q['ys'] - y) ** 2).min() <= 4]
    assert B, ('no key blob at', pt)
    return min(B, key=lambda q: math.hypot(q['cx'] - x, q['cy'] - y))

def key_white(S):
    """a white background keyed out: near-white pixels reached from the sheet's edges through transparent or near-white pixels"""
    a = S[..., 3]; wh = (S[..., :3].min(-1) > 235) & (a > 0); go = wh | (a == 0)
    H, W = a.shape; seen = np.zeros((H, W), bool); q = deque()
    for y in range(H):
        for x in (0, W - 1):
            if go[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for x in range(W):
        for y in (0, H - 1):
            if go[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < H and 0 <= nx < W and go[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; q.append((ny, nx))
    k = seen & wh; S[k] = 0
    return int(k.sum())

def separate(S, pts):
    """figures drawn touching (the brave's heads, the ents' head part on their heads row, frames that overlap): a transparent seam cut
    along the least-alpha path near each guess, so they part. pts: (x, y) a vertical seam near x through the figure at (x, y);
    ('h', x, y) a horizontal one near y. Horizontal seams first, then the vertical ones right to left (the left part keeps its label)"""
    def cut(lab, c, at, nid, T):
        L = lab.T if T else lab; I = S.transpose(1, 0, 2) if T else S
        cc = (c[0], c[1], c[3], c[2], c[5], c[4]) if T else c
        ff.split_comp(I, L, cc, at, nid)
        b = lab == nid; o = lab == c[0]; edge = b & (np.roll(o, 1, 1) | np.roll(o, -1, 1) | np.roll(o, 1, 0) | np.roll(o, -1, 0))
        S[edge, 3] = 0; S[edge, :3] = 0; lab[edge] = 0
    H = [p[1:] for p in pts if p[0] == 'h']; V = sorted([p for p in pts if p[0] != 'h'], key=lambda p: -p[0])
    for group, T in ((H, True), (V, False)):
        if not group: continue
        lab, comps = ff.components(S, keep=300)
        for x, y in group:
            c = ff.comp_at(comps, x, y); cut(lab, c, y if T else x, int(lab.max()) + 1, T)

def glove_mask(S, q, kind):
    """a glove's whole area: the key-hue patch that holds its core blob q, the small patches a finger line splits off it (within 2 px of
    it: a red banner or cape beside a glove is parted by its 3-4 px outline), plus the anti-aliased fringe 2 px round it that leans to the
    key hue"""
    H = huemasks(S)[0 if kind == 'r' else 1]
    x0, x1 = int(q['xs'].min()) - 25, int(q['xs'].max()) + 26; y0, y1 = int(q['ys'].min()) - 25, int(q['ys'].max()) + 26
    x0, y0 = max(0, x0), max(0, y0)
    core = np.zeros(S.shape[:2], bool); core[q['ys'], q['xs']] = True; m = core.copy(); P = blobs(H[y0:y1, x0:x1], y0, x0)
    for p in P:
        if core[p['ys'], p['xs']].any(): m[p['ys'], p['xs']] = True
    near = grow(m, 2)
    for p in P:
        if p['n'] <= .5 * q['n'] and near[p['ys'], p['xs']].any(): m[p['ys'], p['xs']] = True
    r, g, b = S[..., 0], S[..., 1], S[..., 2]; Hr, Hb = huemasks(S)
    lean = ((r - g > 20) & (r - b > 15)) if kind == 'r' else ((b - r > 12) & (b - g > 4))
    return m | (grow(m, 2) & (S[..., 3] > 0) & lean & ~((Hr | Hb) & ~m))

def rekey(S, q, to):
    """a glove (its key blob q and the rest of its area) repainted in the other key colour, its shading kept"""
    m = glove_mask(S, q, 'r' if to == 'b' else 'b')
    lum = .3 * S[..., 0] + .59 * S[..., 1] + .11 * S[..., 2]; ref = np.percentile(lum[q['ys'], q['xs']], 80)
    dst = KEY_B if to == 'b' else KEY_R
    S[m, :3] = np.clip(dst[None, :] * np.clip(lum[m] / ref, 0, 1.15)[:, None], 0, 255)

def paste(S, img, at):
    """an RGBA image composited over the sheet, its top left at (x, y)"""
    x, y = int(round(at[0])), int(round(at[1])); h, w = img.shape[:2]
    dst = S[y:y + h, x:x + w]; a = img[..., 3:4] / 255; da = dst[..., 3:4] / 255
    oa = a + da * (1 - a); rgb = (img[..., :3] * a + dst[..., :3] * da * (1 - a)) / np.maximum(oa, 1e-6)
    dst[..., :3] = rgb; dst[..., 3:4] = oa * 255; dst[dst[..., 3] < 1, :3] = 0

def glove_img(S, q, pad=3):
    """a glove lifted from a frame: its key pixels and the outline round them (pad px), as an RGBA image centred on its centre"""
    m = np.zeros(S.shape[:2], bool); m[q['ys'], q['xs']] = True; g = grow(m, pad) & (S[..., 3] > 0)
    ys, xs = np.nonzero(g); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    im = S[y0:y1, x0:x1].copy(); im[~g[y0:y1, x0:x1], 3] = 0
    return im, (q['cx'] - x0, q['cy'] - y0)

def turned(img, pv, deg, sc):
    """img scaled by sc and turned deg (clockwise, y down) about pv: (image, pv's place in it)"""
    p = ff.scale(img, sc); px, py = pv[0] * sc, pv[1] * sc
    R = int(math.hypot(max(px, p.shape[1] - px), max(py, p.shape[0] - py))) + 2
    big = Image.new('RGBA', (2 * R, 2 * R))
    big.paste(Image.fromarray(np.clip(p, 0, 255).astype(np.uint8)), (int(round(R - px)), int(round(R - py))))
    big = big.rotate(-deg, resample=Image.BICUBIC, center=(R, R))
    a = np.array(big).astype(np.float64); a[a[..., 3] < 3] = 0
    return a, (R, R)

def recolour(S, q, kind, skin):
    """a glove (its key blob q and the rest of its area) to the figure's own colour (an orc's skin, an ent's bark), shading kept"""
    m = glove_mask(S, q, kind)
    lum = .3 * S[..., 0] + .59 * S[..., 1] + .11 * S[..., 2]; ref = np.percentile(lum[q['ys'], q['xs']], 80)
    S[m, :3] = np.clip(np.array(skin, float)[None, :] * np.clip(lum[m] / ref, 0, 1.12)[:, None], 0, 255)

def wa1(fx, fy, sx, sy):
    """a one-handed weapon's angle from the arm's direction (shoulder to fist): along a raised or forward arm; tilted up from a hanging one"""
    a = math.degrees(math.atan2(fy - sy, fx - sx))
    return a - 80 * min(1, max(0, a / 50))

# ---------------------------------------------------------------- the sheets
# per sheet: the build() entry (assets/make-orc-atlas.py: parts, heads, pivots, the setup pose on the reference in sheet px, the frame
# rows), plus: skin (the hands' new colour), red (the red glove's hint point per frame, sheet px; None: hidden; a row left out: the
# largest compact red blob), part_hands (the arms' gloves), sep (touching figures to part), FIX (the repairs, in order)
WARLORD = dict(title='ORC WARLORD', src='orc-warlord.webp', incoming='incoming-orc-warlord-sheet.webp', n=7, xmin=60, H_row='attack',
  heads=['neutral', 'roar', 'grit', 'stern', 'shout', 'hurt', 'dead'], head_band=(515, 670), head_part=(680, 420),
  parts={'arm_s': (110, 420), 'torso': (300, 420), 'arm_w': (500, 420), 'leg_l': (860, 440), 'leg_r': (1000, 440)},
  poly={}, lower={},
  piv={'arm_s': (.55, .12), 'arm_w': (.45, .12), 'leg_l': (.5, .1), 'leg_r': (.5, .1), 'torso': (.5, .5), 'head': (.5, .86)},
  # sheet px on the reference (its parts' places: their box centres, matched against it), back to front
  setup=[('arm_w', 'arm_w', (678, 200), 0, .9), ('leg_l', 'leg_l', (544, 288), 0, .62), ('leg_r', 'leg_r', (639, 280), 0, .65),
         ('torso', 'torso', (548, 196), 0, 1.3), ('head', 'head_neutral', (576, 91), 0, 1.1), ('arm_s', 'arm_s', (518, 199), 0, 1.05)],
  rows=[('run', 670, 816), ('attack', 816, 960), ('cast', 960, 1104), ('hurt', 1104, 1250), ('death', 1250, 1400, 6)], a0=(210, 880),
  skin=(172, 186, 70), ref_org=(354, 0),
  red={'run': [(207, 777), (345, 777), (486, 771), (623, 778), (759, 774), (903, 772), (1042, 775)],
       'attack': [(203, 925), (359, 922), (478, 884), (650, 898), (787, 920), (905, 922), (1041, 924)],
       'cast': [(201, 1066), (343, 1064), (479, 1039), (577, 1027), (714, 1050), (895, 1071), (1034, 1071)],
       'hurt': [(227, 1200), (365, 1201), (501, 1196), (625, 1216), (745, 1222), (889, 1221), (1029, 1221)],
       'death': [(225, 1358), (367, 1360), (490, 1371), (635, 1370), (799, 1371), None]},
  part_hands={'arm_s': ('r', (110, 479)), 'arm_w': ('b', (527, 478))},
  FIX=[('attack', 2, 'paste hands: none drawn; red and blue gloves from attack 2 where the hands grip the raised haft',
        [('glove', 'b', (386, 916), (463, 872)), ('glove', 'r', (359, 922), (473, 889))]),
       ('attack', 3, 'the swinging hand re-keyed red -> blue; the missing near arm (the parts row\'s left arm) added, its glove on the haft',
        [('rekey', (681, 863), 'b'), ('arm', 'arm_s', (110, 479), (597, 897), (649, 905), .36, .3)])])
BRAVE = dict(title='ORC BRAVE', src='orc-brave.webp', incoming='incoming-orc-brave-sheet.webp', n=7, xmin=60, H_row='attack',
  heads=['neutral', 'angry', 'roar', 'grit', 'stern', 'wink', 'bored', 'dead'], head_band=(490, 640), head_part=(180, 420),
  parts={'arm_s': (365, 420), 'torso': (520, 420), 'arm_w': (685, 420), 'leg_l': (820, 420), 'leg_r': (970, 420)},
  poly={}, lower={},
  piv={'arm_s': (.5, .1), 'arm_w': (.5, .1), 'leg_l': (.5, .1), 'leg_r': (.5, .1), 'torso': (.5, .5), 'head': (.5, .86)},
  setup=None,     # filled below
  rows=[('run', 640, 792, 8), ('attack', 792, 946), ('cast', 946, 1100), ('hurt', 1100, 1246), ('death', 1246, 1395, 6)], a0=(200, 870),
  skin=(172, 170, 68), ref_org=(442, 1),
  red={'run': [(199, 753), (339, 750), (475, 746), (604, 752), (721, 755), (843, 754), (968, 744), (1081, 756)],
       'attack': [(202, 912), (329, 910), (462, 893), None, (751, 914), (891, 917), (1047, 914)],
       'cast': [(195, 1060), (331, 1059), (466, 1032), (578, 1019), (739, 1051), (898, 1065), (1047, 1067)],
       'hurt': [(194, 1207), (334, 1202), (472, 1200), (603, 1220), (740, 1226), (901, 1226), (1039, 1213)],
       'death': [(180, 1359), (334, 1352), (476, 1373), (609, 1373), (775, 1373), (1015, 1373)]}, sep=[(163, 560), (438, 560), (838, 560)],
  part_hands={'arm_s': ('r', (371, 454)), 'arm_w': ('b', (687, 455))},
  FIX=[('attack', 3, 'the punching (weapon) hand keyed red: re-keyed blue', [('rekey', (664, 848), 'b')]),
       ('cast', 1, 'the raised open (weapon) hand keyed red: re-keyed blue', [('rekey', (389, 1029), 'b')])])
ENT = dict(title='ENT', src='ent.webp', incoming='incoming-ent-sheet.webp', n=8, xmin=60, H_row='attack',
  heads=['neutral', 'stern', 'roar', 'grit', 'glare', 'shut', 'bored', 'dead'], head_band=(395, 520), head_part=(110, 300),
  parts={'arm_s': (280, 330), 'torso': (420, 330), 'arm_w': (570, 330), 'leg_l': (680, 330), 'leg_r': (790, 330)},
  poly={}, lower={},
  piv={'arm_s': (.5, .15), 'arm_w': (.5, .15), 'leg_l': (.5, .1), 'leg_r': (.5, .1), 'torso': (.5, .5), 'head': (.5, .86)},
  setup=None, ref_org=(318, 0),
  rows=[('run', 505, 630), ('attack', 630, 752), ('cast', 752, 872), ('hurt', 872, 995), ('death', 995, 1118, 7)], a0=(160, 700),
  skin=(180, 115, 68), red_free=True, red={'cast': {4: (531, 805)}}, sep=[('h', 120, 389), (124, 450), (231, 450), (339, 450), (446, 450), (553, 450), (660, 450), (767, 450),
                                    (503, 700), (508, 820)],
  part_hands={'arm_s': ('r', (284, 357)), 'arm_w': ('b', (567, 353))},
  FIX=[('attack', 3, 'the punching (right) hand keyed red: re-keyed blue', [('rekey', (504, 677), 'b')]),
       ('cast', 1, 'the raised open (right) hand keyed red: re-keyed blue', [('rekey', (297, 817), 'b')])])
THORN = dict(title='THORNLING', src='thornling.webp', incoming='incoming-thornling-sheet.webp', n=8, xmin=60, H_row='attack',
  heads=['neutral', 'stern', 'roar', 'grit', 'glare', 'shut', 'bored', 'dead'], head_band=(375, 505), head_part=(130, 300),
  parts={'arm_s': (280, 330), 'torso': (420, 330), 'arm_w': (550, 330), 'leg_l': (670, 330), 'leg_r': (790, 330)},
  poly={}, lower={},
  piv={'arm_s': (.5, .15), 'arm_w': (.5, .15), 'leg_l': (.5, .1), 'leg_r': (.5, .1), 'torso': (.5, .5), 'head': (.5, .86)},
  setup=None, ref_org=(330, 2),
  rows=[('run', 505, 630), ('attack', 630, 752), ('cast', 752, 875), ('hurt', 875, 995), ('death', 995, 1118, 7)], a0=(160, 700),
  skin=(190, 122, 74), red_free=True, red={}, sep=[(778, 440), (307, 1080), (415, 1080), (512, 1080), (625, 1080), (755, 1080)],
  part_hands={'arm_s': ('r', (297, 339)), 'arm_w': ('b', (550, 342))},
  FIX=[('attack', 3, 'the punching (right) hand keyed red: re-keyed blue', [('rekey', (513, 681), 'b')]),
       ('cast', 1, 'the raised open (right) hand keyed red: re-keyed blue', [('rekey', (297, 823), 'b')])])
THORN['setup'] = [('arm_w', 'arm_w', (516, 156), 0, .75), ('leg_l', 'leg_l', (417, 211), 0, .6), ('leg_r', 'leg_r', (489, 209), 0, .6),
                  ('torso', 'torso', (448, 168), 0, .75), ('head', 'head_neutral', (447, 72), 0, 1.05), ('arm_s', 'arm_s', (379, 152), 0, .9)]
ENT['setup'] = [('arm_w', 'arm_w', (540, 158), 0, .85), ('leg_l', 'leg_l', (408, 222), 0, .72), ('leg_r', 'leg_r', (497, 222), 0, .72),
                ('torso', 'torso', (452, 168), 0, 1.0), ('head', 'head_neutral', (452, 86), 0, 1.1), ('arm_s', 'arm_s', (372, 164), 0, .85)]
SHEETS2 = {'OLA': WARLORD, 'OYA': BRAVE, 'ENA': ENT, 'TNA': THORN}

def prepare(C):
    """the sheet loaded (the incoming sheet moved into place), keyed, its touching figures parted, its faulty frames repaired"""
    path = os.path.join(ROOT, 'assets', 'foes', C['src']); inc = os.path.join(ROOT, 'assets', C['incoming'])
    if os.path.exists(inc): os.replace(inc, path)
    S = ff.load(path); nw = key_white(S)
    if C.get('sep'): separate(S, C['sep'])
    before = S.copy(); shots = []
    for row, i, why, ops in C['FIX']:
        RED, BLUE = keymasks(S)
        for op in ops:
            if op[0] == 'rekey':
                rekey(S, blob_at(RED if op[2] == 'b' else BLUE, op[1]), op[2]); RED, BLUE = keymasks(S)
            elif op[0] == 'glove':
                _, k, src_pt, at = op; im, (cx, cy) = glove_img(before, blob_at(keymasks(before)[0 if k == 'r' else 1], src_pt))
                paste(S, im, (at[0] - cx, at[1] - cy))
            elif op[0] == 'arm':          # a parts-row arm (its top share cut), scaled by sc and turned so its shoulder -> glove runs from sh towards at, glove on at
                _, part, glove, sh, at, sc, top = op
                lab, comps = ff.components(before, keep=300); c = ff.comp_at(comps, *C['parts'][part])
                img, off = ff.cut(before, lab, c); img, (tx, ty) = ff.trim(img); gx, gy = glove[0] - off[0] - tx, glove[1] - off[1] - ty
                img = img.copy(); img[:int(img.shape[0] * top), :, 3] = 0      # its shoulder plate left off: the frame's own pauldron is there
                px, py = C['piv'][part][0] * img.shape[1], C['piv'][part][1] * img.shape[0]
                a_part = math.degrees(math.atan2(gy - py, gx - px)); a_to = math.degrees(math.atan2(at[1] - sh[1], at[0] - sh[0]))
                t, (R, _) = turned(img, (gx, gy), a_to - a_part, sc)
                paste(S, t, (at[0] - R, at[1] - R))
        shots.append((row, i, why))
    return S, before, shots, nw

def build_sheet(var, C, show=None):
    S, before, shots, nw = prepare(C)
    RED, BLUE = keymasks(S)
    # the frames as build() will cut them (their place on the sheet), to know which hand is in which frame
    A0, _, _ = ff.frame_sheet(S, C['rows'], C['n'], 0.5, H_row=C['H_row'], xmin=C['xmin'], keep_o=True)
    def frame_of(row, x, y):
        best = None
        for i, R in enumerate(A0['f'][row]):
            ox, oy = R['o']
            if ox <= x < ox + R['w'] and oy <= y < oy + R['h']:
                d = abs(x - (ox + R['w'] / 2))
                if best is None or d < best[0]: best = (d, i)
        return None if best is None else best[1]
    rowband = {r[0]: (r[1], r[2]) for r in C['rows']}
    def compact(q): a = q['w'] / q['h']; return q['n'] >= 100 and .55 <= a <= 2.3 and q['n'] / (q['w'] * q['h']) > .5
    HAND = {}; gloves = []
    for row, y0, y1 in [(r[0], r[1], r[2]) for r in C['rows']]:
        N = len(A0['f'][row]); rec = [dict(w=None, s=None) for _ in range(N)]
        for q in sorted(blobs(BLUE[y0:y1], y0), key=lambda q: -q['n']):
            if q['n'] < 40: continue
            i = frame_of(row, q['cx'], q['cy'])
            if i is not None and rec[i]['w'] is None: rec[i]['w'] = q
        hint = C['red'].get(row)
        if not isinstance(hint, list):      # the largest compact red blob, but where a hint {frame: point} names the glove
            for q in sorted(blobs(RED[y0:y1], y0), key=lambda q: -q['n']):
                if not compact(q): continue
                i = frame_of(row, q['cx'], q['cy'])
                if i is not None and rec[i]['s'] is None and i not in (hint or {}): rec[i]['s'] = q
            hint = [(hint or {}).get(i, 'auto') for i in range(N)]
        for i, pt in enumerate(hint):
            if pt is None or pt == 'auto': continue
            q = blob_at(RED, pt); assert frame_of(row, q['cx'], q['cy']) == i, (var, row, i, pt); rec[i]['s'] = q
        HAND[row] = rec
        for f in rec: gloves += [(q, k) for q, k in ((f['w'], 'b'), (f['s'], 'r')) if q is not None]
    # the parts' gloves (the rig's arms)
    PH = {}
    for part, (k, pt) in C['part_hands'].items():
        q = blob_at(RED if k == 'r' else BLUE, pt); gloves.append((q, k)); PH[part] = (q['cx'], q['cy'])
    after_fix = S.copy()
    for q, k in gloves: recolour(S, q, k, C['skin'])
    # what key colour is left on the figures (a glove not found would show): blue anywhere; compact red cores where nothing else is red
    R2_, B2_ = keymasks(S); left = []
    for row, y0, y1 in [(r[0], r[1], r[2]) for r in C['rows']]:
        for M, k in ((B2_, 'blue'), (R2_, 'red')) if C.get('red_free') else ((B2_, 'blue'),):
            for q in blobs(M[y0:y1], y0):
                i = frame_of(row, q['cx'], q['cy'])
                if i is not None and (q['n'] >= 25 if k == 'blue' else compact(q)): left.append('%s %d %s at %d,%d (%d px)' % (row, i + 1, k, q['cx'], q['cy'], q['n']))
    print('  %s: key colour left: %s' % (var, left or 'none'))
    lab, comps = ff.components(S, keep=300)
    def piece_px(part, pt):
        c = ff.comp_at(comps, *C['parts'][part]); img, off = ff.cut(S, lab, c); _, (tx, ty) = ff.trim(img)
        return (pt[0] - off[0] - tx, pt[1] - off[1] - ty)
    FIXED = {(r, i) for r, i, _ in shots}
    loops = {'run'}
    def post(A, setup_pt):
        R2 = lambda v: round(float(v), 2)
        A['hands'] = {}
        for name, rec in HAND.items():
            out = []
            for i, f in enumerate(rec):
                Fr = A['f'][name][i]; ox, oy = Fr['o']; ax, ay = Fr['ax'], Fr['ay']; assert Fr['o'] == A0['f'][name][i]['o']
                rel = lambda q: [R2(q['cx'] - ox - ax), R2(q['cy'] - oy - ay)] if q is not None else None
                h = {'w': rel(f['w']), 's': rel(f['s']), 'hid': []}
                if (name, i) in FIXED: h['fix'] = True
                out.append(h)
            n = len(out)
            for k in ('w', 's'):
                seen = [i for i in range(n) if out[i][k] is not None and k not in out[i]['hid']]
                for i, h in enumerate(out):
                    if h[k] is not None or not seen: continue
                    if name in loops:      # round the cycle: between the nearest seen before and after
                        a = max([j for j in seen if j < i], default=seen[-1]); b = min([j for j in seen if j > i], default=seen[0])
                        da = (i - a) % n; db = (b - i) % n; t = da / (da + db) if a != b else 0
                    else:
                        a = max([j for j in seen if j < i], default=None); b = min([j for j in seen if j > i], default=None)
                        a = a if a is not None else b; b = b if b is not None else a; t = .5 if a != b else 0
                    pa, pb = out[a][k], out[b][k]; h[k] = [R2(pa[0] + (pb[0] - pa[0]) * t), R2(pa[1] + (pb[1] - pa[1]) * t)]; h['hid'].append(k)
            for i, h in enumerate(out):
                Fr = A['f'][name][i]
                sx, sy = .15 * A['H'], -.5 * A['H'] + (A['H'] - Fr['h']) * .5 if Fr['h'] < A['H'] else -.5 * A['H']
                h['wa1'] = R2(wa1(h['w'][0], h['w'][1], sx, sy))
                d = math.hypot(h['w'][0] - h['s'][0], h['w'][1] - h['s'][1])
                h['wa2'] = R2(math.degrees(math.atan2(h['w'][1] - h['s'][1], h['w'][0] - h['s'][0]))) if d > 12 else None
                if not h['hid']: del h['hid']
                else: h['hid'] = ''.join(h['hid'])
            A['hands'][name] = out
        w = setup_pt('arm_w', piece_px('arm_w', PH['arm_w'])); s = setup_pt('arm_s', piece_px('arm_s', PH['arm_s']))
        rh = {'w': w, 's': s, 'wa1': R2(wa1(w[0], w[1], .15 * A['H'], -.5 * A['H']))}
        rh['wa2'] = R2(math.degrees(math.atan2(w[1] - s[1], w[0] - s[0])))
        A['rh'] = rh; C['_A'] = A
    org = C['ref_org']      # the setup in px from the reference's top left
    C2 = dict(C, img=S, post=post, canvas=(560, 440), h_opaque=True, setup=[(sl, n, (c[0] - org[0], c[1] - org[1]), r, sc) for sl, n, c, r, sc in C['setup']])
    js = orc.build(var, C2)
    print('  %s: white keyed %d px; repaired %s; hidden hands placed %s' % (var, nw, ['%s %d' % (r, i + 1) for r, i, _ in shots],
          ['%s %d:%s' % (n, i + 1, ''.join(k for k in 'ws' if HAND[n][i][k] is None)) for n in HAND for i in range(len(HAND[n])) if HAND[n][i]['w'] is None or HAND[n][i]['s'] is None]))
    if show:      # every frame (keys as found and repaired), its hands as recorded: blue the weapon hand, red the off hand, hollow placed
        A = C['_A']; sc = 3; tiles = []
        for name in A['hands']:
            for i, h in enumerate(A['hands'][name]):
                Fr = A['f'][name][i]; ox, oy = Fr['o']; im = Image.new('RGBA', (Fr['w'] + 16, Fr['h'] + 16), (236, 230, 214, 255))
                im.alpha_composite(Image.fromarray(np.clip(after_fix[oy - 8:oy + Fr['h'] + 8, ox - 8:ox + Fr['w'] + 8], 0, 255).astype(np.uint8)))
                im = im.resize((im.width * sc, im.height * sc), Image.LANCZOS); d = ImageDraw.Draw(im)
                for k, col in (('w', (0, 160, 255)), ('s', (255, 40, 40))):
                    if not h.get(k): continue
                    x, y = (Fr['ax'] + h[k][0] + 8) * sc, (Fr['ay'] + h[k][1] + 8) * sc; hid = k in h.get('hid', '')
                    d.ellipse([x - 14, y - 14, x + 14, y + 14], outline=col, width=2 if hid else 4)
                    if not hid: d.line([x - 5, y, x + 5, y], fill=col, width=2)
                d.text((4, 4), '%s %d%s' % (name, i + 1, ' FIX' if h.get('fix') else ''), fill=(0, 0, 0))
                tiles.append((name, im))
        rows_ = {}
        for name, im in tiles: rows_.setdefault(name, []).append(im)
        W = max(sum(m.width for m in L) for L in rows_.values()); H = sum(max(m.height for m in L) for L in rows_.values())
        out = Image.new('RGBA', (W, H), (40, 36, 34, 255)); y = 0
        for L in rows_.values():
            x = 0
            for m in L: out.paste(m, (x, y)); x += m.width
            y += max(m.height for m in L)
        out.save(os.path.join(show, 'hands-%s.png' % var))
        for row, i, why in shots:
            R = A0['f'][row][i]; ox, oy = R['o']; box = (ox - 6, oy - 6, ox + R['w'] + 6, oy + R['h'] + 6)
            ims = []
            for X in (before, after_fix, S):
                im = Image.new('RGBA', (box[2] - box[0], box[3] - box[1]), (236, 230, 214, 255))
                im.alpha_composite(Image.fromarray(np.clip(X[box[1]:box[3], box[0]:box[2]], 0, 255).astype(np.uint8)))
                ims.append(im.resize((im.width * 3, im.height * 3), Image.LANCZOS))
            W = sum(m.width for m in ims) + 40; H = ims[0].height + 60
            out = Image.new('RGBA', (W, H), (40, 36, 34, 255)); d = ImageDraw.Draw(out); x = 10
            for m, t in zip(ims, ('before', 'repaired (keys)', 'in the atlas (hands as skin)')):
                out.paste(m, (x, 30)); d.text((x, 10), t, fill=(240, 230, 200)); x += m.width + 10
            d.text((10, H - 22), '%s %s %d: %s' % (C['title'], row, i + 1, why), fill=(240, 230, 200))
            out.save(os.path.join(show, 'fix-%s-%s%d.png' % (var, row, i + 1)))
    return js

# the brave's setup: its parts' places on the reference (box centres, sheet px), back to front
BRAVE['setup'] = [('arm_w', 'arm_w', (662, 205), 0, .78), ('leg_l', 'leg_l', (539, 279), 0, .65), ('leg_r', 'leg_r', (623, 279), 0, .65),
                  ('torso', 'torso', (563, 209), 0, .9), ('head', 'head_neutral', (556, 81), 0, 1.0), ('arm_s', 'arm_s', (500, 220), 0, .78)]

if __name__ == '__main__':
    show = sys.argv[sys.argv.index('--show') + 1] if '--show' in sys.argv else None
    js = ['/* ================= COLOUR-KEYED ORC ATLASES (generated by assets/make-orc2-atlas.py from assets/foes/orc-warlord.webp and orc-brave.webp; do not edit) =================\n'
          '   OLA (the Orc warlord) / OYA (the Orc brave): .f[anim] = the drawn frames (run, attack, cast, hurt, death; facing right), each {r: [x,y,w,h]\n'
          '   in the atlas (px of this half-size webp), w h: the frame in sheet px, ax ay: the body\'s centre over the feet, frame px, o: its top left\n'
          '   on the sheet}; .H: the attack row\'s first frame\'s height (WU). .p[piece] = {r, w, h, pv}: the rig\'s parts and heads. .set: the rig\'s\n'
          '   setup pose. The hands were colour keys, recoloured to skin: .hands[anim][i] = {w, s: the weapon / off hand (WU from the anchor), wa1,\n'
          '   wa2: the one- / two-handed weapon angle (deg), hid: hands placed, not seen, fix: the frame was repaired}; .rh: the same for the setup\n'
          '   pose. Read by 76k-orc.js and 76m-skelsol.js. */\n']
    for var, C in SHEETS2.items(): js.append(build_sheet(var, C, show))
    with open(os.path.join(ROOT, 'src', '76n-keyatlas.js'), 'w') as f: f.write(''.join(js))
