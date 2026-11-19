# Cuts the user's tribal armour sheet (assets/parts2/tribal-armor.webp: one row of 12 torsos, each with its pair of shoulder pieces in the
# row below, the format of armor.webp) into src/73pc-tribalarmor.js (TRB), merged into P2A at load as torso51..62 with sh51_a / sh51_b ..
# (P2_ARMOR 51..62 in 73q-parts2.js). Run: python3 assets/make-tribal-armor.py   (after python3 -I assets/make-armor-mask.py --tribal)
# Same cut, layers and anchors as assets/make-parts2-atlas.py (its functions are used as they are): 'c' own colours, 's' the neck's skin as
# grey shade (multiplied by the merc's skin tone), and one grey shade layer per key of the colour mask (assets/parts2/tribal-armor-mask.png:
# r primary, g secondary, b metal, y emblem, m straps) for the tailor's dyes. Scale: the sheet is drawn larger than armor.webp; its pieces are
# brought to armor.webp's torso size (SU per px = armor.webp's x the ratio of the two sheets' median torso widths), so they fit the body
# as every other armour (the shoulder caps by the same factor: they are drawn to their torsos' scale).
import sys, json, io, base64, os, re
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'parts2')
OUT = os.path.join(HERE, '..', 'src', '73pc-tribalarmor.js'); FIRST = 51
_p2 = open(os.path.join(HERE, 'make-parts2-atlas.py')).read(); ns = {'np': np, 'Image': Image, 'MASKP': {}, 'AMKEYS': {'r': (255, 0, 0), 'g': (0, 255, 0), 'b': (0, 0, 255), 'y': (255, 255, 0), 'm': (255, 0, 255)}}
exec(compile('import numpy as np\n' + _p2[_p2.index('def bands'):_p2.index('def add(')], 'make-parts2-atlas.py', 'exec'), ns)
exec(compile(_p2[_p2.index('def emblem_ground'):_p2.index('k = 0\nfor ti in range(0, 12, 2)')], 'make-parts2-atlas.py', 'exec'), ns)
exec(compile(_p2[_p2.index('def anchors('):_p2.index('# ---- human hair on the head')], 'make-parts2-atlas.py', 'exec'), ns)
_mk = open(os.path.join(HERE, 'make-armor-mask.py')).read(); mns = {'__name__': 'lib', '__file__': os.path.join(HERE, 'make-armor-mask.py')}
exec(compile(_mk, 'make-armor-mask.py', 'exec'), mns)
K = float(re.search(r'const P2A=\{k:([0-9.]+)', open(os.path.join(HERE, '..', 'src', '73p-parts2atlas.js')).read()).group(1))
def load(n): return np.array(Image.open(os.path.join(D, n)).convert('RGBA'))
AR = load('armor.webp').astype(np.int32); TA = load('tribal-armor.webp'); TM = load('tribal-armor-mask.png')
ab = ns['cut'](AR, [10, 20, 7, 14, 10, 20, 10, 20, 10, 20, 4, 8], 6); med = lambda x: float(np.median(x))
sf_torso = 130 * 1.18 / med([b[2] - b[0] for b in ab[0] + ab[2] + ab[4] + ab[6] + ab[8]])   # assets/make-parts2-atlas.py's
BX = mns['tribal_boxes'](TA.astype(np.int32))
sf = sf_torso * med([b[2] - b[0] for b in ab[0] + ab[2] + ab[4] + ab[6] + ab[8]]) / med([bx[0][2] - bx[0][0] for bx in BX])
# a check: the neck opening (the skin at the top) of the leather armours against the tribal ones, in SU
def neckw(P):
    sk = (P[:, :, 0] > 180) & (P[:, :, 0] - P[:, :, 2] > 55) & (P[:, :, 1] > P[:, :, 0] * .5) & (P[:, :, 3] > 40); ys = np.where(sk.sum(1) > 0)[0]
    return max(sk[y].sum() for y in ys[:int(len(ys) * .5) + 1]) if len(ys) else 0
AB = mns['armour_boxes'](AR)
nw0 = med([neckw(AR[b[0][1]:b[0][3], b[0][0]:b[0][2]]) for i, b in enumerate(AB) if i in (15, 24, 28, 30, 42, 44)]) * sf_torso
nw1 = med([neckw(TA[b[0][1]:b[0][3], b[0][0]:b[0][2]].astype(np.int32)) for b in BX]) * sf
print('SU per px: armor.webp %.3f, tribal %.3f; neck opening %.1f vs %.1f SU' % (sf_torso, sf, nw0, nw1), file=sys.stderr)
items = []; meta = {}
for j, bx in enumerate(BX):
    i = FIRST + j
    for nm, kind, b in (('torso%d' % i, 'torso', bx[0]), ('sh%d_a' % i, 'arm', bx[1]), ('sh%d_b' % i, 'arm', bx[2])):
        P = TA[b[1]:b[3], b[0]:b[2]].astype(np.float32); ns['MASKP'][nm] = TM[b[1]:b[3], b[0]:b[2]]
        meta[nm] = {'w': round(P.shape[1] * sf, 1), 'h': round(P.shape[0] * sf, 1), 'a': ns['anchors'](kind, P, sf, nm), 'L': {}, 'k': kind}
        if kind == 'torso':
            eg = ns['emblem_ground'](ns['MASKP'][nm])
            if eg: meta[nm]['a']['eg'] = eg
        for m, arr in ns['layers'](P, kind, nm).items():
            im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA'); bb = im.getbbox()
            if not bb: continue
            im = im.crop(bb); tw, th = max(1, round(im.width * sf * K)), max(1, round(im.height * sf * K))
            im = im.convert('RGBa').resize((tw, th), Image.LANCZOS).convert('RGBA')
            items.append((nm, m, im, bb[0] * sf, bb[1] * sf, (bb[2] - bb[0]) * sf, (bb[3] - bb[1]) * sf))
items.sort(key=lambda q: -q[2].height)
AW = 1024; x = y = sh = 0; pos = []; hgt = 0
for q in items:
    tw, th = q[2].size
    if x + tw + 1 > AW: x = 0; y += sh + 1; sh = 0
    pos.append((x, y)); x += tw + 1; sh = max(sh, th); hgt = max(hgt, y + sh)
atl = Image.new('RGBA', (AW, hgt), (0, 0, 0, 0))
for q, (x, y) in zip(items, pos):
    atl.paste(q[2], (x, y)); meta[q[0]]['L'][q[1]] = [0, x, y, q[2].width, q[2].height, round(q[3], 1), round(q[4], 1), round(q[5], 1), round(q[6], 1)]
bio = io.BytesIO(); atl.save(bio, 'WEBP', quality=82, method=6, alpha_quality=90); src = 'data:image/webp;base64,' + base64.b64encode(bio.getvalue()).decode()
js = ('/* ================= TRIBAL ARMOUR ATLAS (generated by assets/make-tribal-armor.py from assets/parts2/tribal-armor.webp and tribal-armor-mask.png; do not edit) =================\n'
      '   torso51..62 with sh51_a / sh51_b .. sh62_b (the shoulder caps): the user\'s tribal armour sheet, cut, layered and anchored as the armour sheet\n'
      '   (P2A torso0..50: c own colours, s the neck\'s skin, r / g / b / y / m the colour mask\'s regions), at the same SU scale. Merged into P2A below. */\n'
      'const TRB={k:%s,p:%s,\n src:[%s]};\n'
      'if(typeof P2A===\'object\'){const o=P2A.src.length;P2A.src.push(...TRB.src);for(const n in TRB.p){const P=TRB.p[n];for(const m in P.L)P.L[m][0]+=o;P2A.p[n]=P}}\n') % (K, json.dumps(meta, separators=(',', ':')), json.dumps(src))
open(OUT, 'w').write(js)
print('pieces', len(meta), 'atlas', atl.size, 'KB', round(len(src) * 3 / 4 / 1024))
