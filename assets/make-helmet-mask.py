# Builds the helmet colour mask: assets/parts2/helmet-mask.png, the same size as assets/parts2/helmets.webp and pixel-aligned with it.
# Run: python3 -I assets/make-helmet-mask.py [--review DIR]   (Pillow + numpy; deterministic, fixed seeds)
# Same keys and method as the armour mask (assets/make-armor-mask.py, whose helpers it loads):
#   red     #FF0000 primary    the helmet's main material: the cloth of a hood / cap / turban / bandana, the leather of a cap, the fur of a
#                              pelt, the steel (iron, bronze) of a helm
#   green   #00FF00 secondary  cloth or leather on a helm or a second cloth on a hat: linings, bands, wraps, lacquered neck guards (shikoro), trims
#   blue    #0000FF metal      fittings: gold / brass trim, buckles, rivets in brass, circlets, gold crests, laurels, crowns, goggle rims
#   yellow  #FFFF00 plume      plumes, crests of horsehair, feathers (the tailor's trim / accent)
#   magenta #FF00FF straps     chin straps, leather bands
#   black   #000000 keep       the outline, eyes / teeth / noses of pelts, horns, antlers, bone, gems, glass, straw, wings
# Each helmet has a class (73q-parts2.js P2_HCLASS, the same letters as P2_ACLASS): p metal (its red is steel: it follows the metal finish,
# never the cloth), c cloth, l leather / fur (its red takes the cloth dye, as leather armour does), n natural (bone, straw: nothing recoloured).
# Method, per helmet (cut exactly as assets/make-parts2-atlas.py cuts helmets.webp: cut(HM, [10, 10, 10, 10], 20)):
#  1. the outline: dark, unsaturated ink (and the faint edge pixels) -> black;
#  2. the fill is split into regions by the ink (4-connected components of non-ink pixels), two-colour regions split by 2-means in Lab;
#  3. every region is given a key by rules on its median Lab colour (the class's material is primary: on a metal helm the grey regions, on a
#     cloth / leather one the regions near the biggest region's colour; gold / brass yellows are metal; anything else on a helm is its cloth),
#     then by the per-helmet tables PALS (colour -> key: the listed colour nearest the region's) and REG (a region by its centroid -> key);
#  4. each region takes its key whole (shading and specks inside it follow it), the anti-aliased rim between ink and fill joins its nearest
#     region; the outline stays black.
import sys, os, importlib.util
sys.dont_write_bytecode = True
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'parts2')
_sp = importlib.util.spec_from_file_location('armormask', os.path.join(HERE, 'make-armor-mask.py')); AM = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(AM)
SRC = os.path.join(D, 'helmets.webp'); OUT = os.path.join(D, 'helmet-mask.png')
cut, components, erode, grow, split_regions, rgb2lab, lab2rgb, lch, hexrgb, keyimg = AM.cut, AM.components, AM.erode, AM.grow, AM.split_regions, AM.rgb2lab, AM.lab2rgb, AM.lch, AM.hexrgb, AM.keyimg

# the 40 helmets (73q-parts2.js P2_HELM, sheet order) and their class
NAMES = ['leather cap', 'arming cap', 'red bandana', 'green hood', 'feathered hat', 'blue beret', 'skull cap', 'skull cap, ridge', 'skull cap, banded', 'conical helm',
 'nasal helm', 'nasal helm, riveted', 'nasal helm, cheeks', 'crested galea', 'winged helm', 'gold-crested helm', 'armet', 'sallet', 'bascinet', 'gold-visored helm',
 'great helm', 'gilded great helm', 'wolf pelt', 'bear pelt', 'stag skull', 'purple mage hood', 'circlet hood', 'laurel helm', 'winged gold helm', 'crowned helm',
 'kabuto', 'lamellar cap', 'horned helm', 'straw kasa', 'ninja mask', 'turban, gem', 'wrapped cloth', 'aviator cap', 'visor helm A', 'visor helm B']
HCLASS = 'lcccl' 'cpppp' 'ppppp' 'ppppp' 'ppllnccppp' 'pppncccl' 'pp'
assert len(HCLASS) == 40, len(HCLASS)

# per-helmet tables, written by inspecting every helmet (original | regions | keys) and correcting what the rules got wrong.
# PALS: 'hex:key' the helmet's materials by a representative colour (every free region takes the key of the nearest); REG: (x, y, key[, 'big'])
# one region by its centroid (fractions of the piece box); PAINT: (hex, key, tolerance, [keys painted over]) details without an outline.
PALS = {
 2: '#d94d45:r',                                                         # the bandana: its folds and knot all one cloth
 3: '#6b8253:r #f2bc6c:g',                                               # green hood, its border a second cloth
 4: '#a37157:r #a5745a:r #9f7058:r #78543f:g #f4e6dd:y #e8c060:b #fbe6a8:b',   # felt hat: the band secondary, the feather a plume, buckle and pin metal
 5: '#4f647f:r #ca7359:g #9f8882:g #f4e4d9:y #f6b949:b',                # beret: the band secondary, the feather a plume, the button metal
 13: '#d74d45:y #732d28:y #712c2a:y #752c2a:y #bcafae:r #796d68:r #c6b5aa:r #bca89e:r #f4ca6e:b #ebbc62:b #816629:b #794d11:b #a9824f:b #c4bfa4:b #a9a47f:b #c6b28b:b #746e4b:b',   # the red crest a plume
 14: '#f3e5db:r #d5c7c4:r #685c58:r #f0bb52:b #d2bf91:b #bda48f:b #aa8356:b #6c430e:b #966b45:b',
 15: '#aea19e:r #b6a79f:r #ede6cf:r #f1b542:b #d0b8a1:b #c1ab96:b #d3b7a0:b #956521:b #bb9858:b #e3cf8b:b',   # the crest is gold: metal
 22: '#d6c5c1:r #bdafad:r #5b524e:k',
 25: '#8a5f86:r #73516c:r #7e5268:r #f4c960:b #be8b2b:b #988050:b #b17158:b',
 26: '#a0868c:r #987489:r #987885:r #b1828f:r #b38c95:r #ebbd56:b #997437:b #795c25:b #8c6a1d:b #8b6b2e:b #ad3f7b:k',   # the circlet metal, its gem kept
 27: '#cec2c2:r #bdb2b1:r #a59d9b:r #eeb448:b #806a34:b #816c3f:b',     # the laurel wreath gold: metal
 29: '#c0b6b5:r #b4a7a6:r #8b8180:r #90746a:r #f4b253:b #e9daa6:b #cebe80:b #cd5342:k',   # the crown metal, its gems kept
 30: '#7a665c:r #61534c:r #db5a51:g #6b2624:g #8a3e36:g #74322a:g #6d3f24:g #f8c76a:b #efe7c6:b #775b2d:b #c89c48:b',   # kabuto: the lacquered, laced neck guard secondary
 31: '#8c7c78:r #9a867f:r #d85748:g #6f3831:g #632620:g #7a4828:g #dab45d:b #ef9d54:b #65491e:b',
 32: '#91827f:r #948684:r #f2ddcc:k',                                    # the horns kept (horn, not dyed)
 35: '#f7e3d3:r #cdbbab:r #7e6e62:r #d0994b:b #d84742:k',               # turban: the gem's setting metal, the gem kept
 38: '#a19f9d:r #82807f:r #5cf3eb:k #004944:k',                          # the visor's glow kept
 39: '#ccc0bf:r #a6a09e:r #736b6b:r #47504f:r #40d8d1:k #044a45:k',
}
REG = {
 14: [(.24, .39, 'k'), (.70, .15, 'k'), (.70, .25, 'k'), (.74, .20, 'k')],   # the wings kept (white feathers whatever the finish)
 28: [(.19, .37, 'k'), (.41, .09, 'k'), (.42, .13, 'k')],
 32: [(.89, .29, 'k'), (.07, .27, 'k')],                                  # the horns' dark tips
}
PAINT = {
 37: [('#bfb0ad', 'k', 14, ['r'])],                                       # the goggles' glass
}

def classify(i, P):
    """P: RGBA int array (the helmet's sheet crop) -> key array ('k','r','g','b','y','m'; '' transparent), region records, labels"""
    cls = HCLASS[i]; al = P[:, :, 3]; op = al > 24; mx = P[:, :, :3].max(2)
    ink = op & ((mx < 34) | (al < 160) & (mx < 90))
    fillm = op & ~ink & (mx >= 52)
    lab = grow(components(erode(fillm)), fillm, 2); h, w = lab.shape; Lb = rgb2lab(P[:, :, :3].astype(float))
    lab = split_regions(lab, Lb, 20); R = []
    for r_ in range(lab.max() + 1):
        m = lab == r_; ys, xs = np.where(m)
        if not len(ys): continue
        c = np.median(Lb[m], 0); L_, ch_, hu_ = lch(c)
        R.append(dict(id=r_, n=len(ys), c=c, L=L_, C=ch_, H=hu_, x=xs.mean() / w, y=ys.mean() / h, key='?', free=True))
    gold = lambda r: r['C'] > 18 and 55 <= r['H'] <= 105 and r['L'] > 40
    grey = lambda r: r['C'] < 14 and r['L'] > 20
    brown = lambda r: 7 <= r['C'] < 40 and 30 <= r['H'] <= 85 and r['L'] < 45
    big = max(R, key=lambda r: r['n']); P0 = big['c']
    near = lambda r, c0, tl=16: np.hypot(r['c'][1] - c0[1], r['c'][2] - c0[2]) < tl and abs(r['c'][0] - c0[0]) < 32
    for r in R:
        if cls == 'n': r['key'] = 'k'
        elif cls == 'p':
            r['key'] = 'r' if grey(r) else 'b' if gold(r) or 40 <= r['H'] <= 110 else 'r' if r['C'] < 30 else 'g'   # on a helm: steel, gold / brass, else its cloth
        else:
            r['key'] = 'r' if near(r, P0) else 'b' if gold(r) else 'm' if brown(r) and not near(r, P0, 24) else 'g'
    if i in PALS:
        ent = []
        for e in PALS[i].split():
            hx, kk = e.split(':'); ent.append((rgb2lab(np.array(hexrgb(hx), float)), kk))
        for r in R:
            r['key'] = min((np.sum(((r['c'] - c) * np.array([.6, 1, 1])) ** 2), kk) for c, kk in ent)[1]
    for (fx, fy, kk, *bg) in REG.get(i, []):
        cand = [r for r in R if r['n'] >= 8]
        d = [np.hypot(r['x'] - fx, r['y'] - fy) for r in cand]; d0 = min(d)
        (max if bg else min)([r for r, dd in zip(cand, d) if dd <= d0 + .02], key=lambda r: r['n'])['key'] = kk
    K = np.full(P.shape[:2], '', '<U1'); K[op] = 'k'
    for r in R: K[lab == r['id']] = r['key']
    fill = lab >= 0
    for (hx, kk, tl, *where) in PAINT.get(i, []):
        d = np.sqrt(((Lb - rgb2lab(np.array(hexrgb(hx), float))) ** 2).sum(2)); m = fill & (d < tl)
        if where: m &= np.isin(K, list(where[0]))
        K[m] = kk
    for r in R:   # specks (a split, a stray highlight) take the commonest key of the regions around them (a kept wing's specks are kept)
        if r['n'] < 40:
            m = lab == r['id']; dd = m.copy()
            for _ in range(2): P_ = np.pad(dd, 1); dd = dd | P_[:-2, 1:-1] | P_[2:, 1:-1] | P_[1:-1, :-2] | P_[1:-1, 2:]
            ring = K[dd & ~m & (lab >= 0)]; ring = ring[ring != '']
            if len(ring): v, cn = np.unique(ring, return_counts=True); K[m] = v[np.argmax(cn)]
    rim = op & (lab < 0) & ~ink; KK = K.copy(); known = fill.copy()   # the anti-aliased rim joins the nearest region; the outline stays black
    for _ in range(3):
        if not (rim & ~known).any(): break
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            sh = np.roll(np.roll(known, dy, 0), dx, 1); sk = np.roll(np.roll(KK, dy, 0), dx, 1); t = rim & ~known & sh
            KK[t] = sk[t]; known = known | t
    K[rim & known] = KK[rim & known]
    return K, R, lab

def helmet_boxes(HM):
    return [b for row in cut(HM, [10, 10, 10, 10], 20) for b in row]

if __name__ == '__main__':
    HM = np.array(Image.open(SRC).convert('RGBA')).astype(np.int32); H, W = HM.shape[:2]
    M = np.zeros((H, W, 4), np.uint8); M[HM[:, :, 3] > 24] = (0, 0, 0, 255)
    BX = helmet_boxes(HM); assert len(BX) == 40
    REV = sys.argv[sys.argv.index('--review') + 1] if '--review' in sys.argv else None; info = []
    for i, b in enumerate(BX):
        P = HM[b[1]:b[3], b[0]:b[2]]; K, R, lab = classify(i, P); info.append((R, lab))
        sub = M[b[1]:b[3], b[0]:b[2]]; m = K != ''; sub[m] = keyimg(K)[m]
    Image.fromarray(M, 'RGBA').save(OUT, optimize=True)
    print('mask', OUT, M.shape)
    if REV:   # per helmet: original | regions (random colours, centroid numbers) | keys, and the region list
        from PIL import ImageDraw
        os.makedirs(REV, exist_ok=True); rng = np.random.default_rng(1); txt = []
        for i, b in enumerate(BX):
            P = HM[b[1]:b[3], b[0]:b[2]].astype(np.uint8); R, lab = info[i]; h, w = lab.shape; S = 2
            pal = rng.integers(40, 255, (lab.max() + 2, 3)); RG = np.zeros((h, w, 4), np.uint8); RG[lab >= 0, :3] = pal[lab[lab >= 0]]; RG[lab >= 0, 3] = 255
            can = Image.new('RGBA', (w * 3 + 20, h), (255, 255, 255, 255)); can.alpha_composite(Image.fromarray(P, 'RGBA'), (0, 0)); can.alpha_composite(Image.fromarray(RG, 'RGBA'), (w + 10, 0))
            can.alpha_composite(Image.fromarray(M[b[1]:b[3], b[0]:b[2]], 'RGBA'), (2 * w + 20, 0)); dr = ImageDraw.Draw(can)
            for r in R:
                if r['n'] >= 30: dr.text((w + 10 + r['x'] * w - 4, r['y'] * h - 5), str(r['id']), fill=(0, 0, 0, 255))
            can = can.resize((can.width * S // 2 * 2, can.height * S // 2 * 2)); can.save(os.path.join(REV, 'h%02d.png' % i))
            txt.append('%d %s [%s] ' % (i, NAMES[i], HCLASS[i]) + ' '.join('%d:%s#%02x%02x%02x(%.2f,%.2f)n%d' % ((r['id'], r['key']) + tuple(int(v) for v in lab2rgb(r['c'])) + (r['x'], r['y'], r['n'])) for r in R if r['n'] >= 30))
        open(os.path.join(REV, 'regions.txt'), 'w').write('\n'.join(txt) + '\n')
