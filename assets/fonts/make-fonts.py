# Copies the game's fonts (SIL OFL 1.1, from the @fontsource npm packages) next to this script and checks that each covers the
# characters Wyrdmarch's text uses; build.js embeds them as base64 @font-face rules. The files are the packages' own 'latin'
# subsets, copied byte for byte: they are already small (10-24 KB) and an unmodified file keeps clear of the OFL's Reserved Font
# Name rule for modified versions (Lilita One reserves its name). Usage:
#   npm i @fontsource/lilita-one @fontsource/fredoka @fontsource/alegreya-sans   (anywhere)
#   python3 assets/fonts/make-fonts.py <that folder>/node_modules/@fontsource
# Needs fonttools and brotli for the coverage check (pip install fonttools brotli).
import os,sys,shutil
from fontTools.ttLib import TTFont
SRC=sys.argv[1];OUT=os.path.dirname(os.path.abspath(__file__))
# every character the game's own text needs from these faces: ASCII, Latin-1 (x, middle dot, accented letters), dashes, curly quotes,
# ellipsis, single guillemets and the minus sign. Anything else (a name typed with other letters) falls back to the system font;
# a missing no-break space (Lilita One) or soft hyphen (Fredoka) is harmless (the browser draws a space / nothing).
NEED=[chr(c) for c in range(0x20,0x7f)]+[chr(c) for c in range(0xa0,0x100)]+list('\u2013\u2014\u2018\u2019\u201c\u201d\u2026\u2039\u203a\u2212')
FONTS=[('lilita-one',400),('fredoka',600),('alegreya-sans',400),('alegreya-sans',500),('alegreya-sans',700)]
for pkg,w in FONTS:
    src=os.path.join(SRC,pkg,'files','%s-latin-%d-normal.woff2'%(pkg,w));dst=os.path.join(OUT,'%s-%d.woff2'%(pkg,w))
    shutil.copyfile(src,dst);cm=TTFont(dst).getBestCmap();miss=[c for c in NEED if ord(c) not in cm]
    print(dst,os.path.getsize(dst),'bytes',('missing '+' '.join('U+%04X'%ord(c) for c in miss)) if miss else 'covers the game text')
    shutil.copyfile(os.path.join(SRC,pkg,'LICENSE'),os.path.join(OUT,'OFL-%s.txt'%pkg))
