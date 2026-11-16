/* ================= BANNER PALETTE (extra PAL keys for the banner colours of 46-banner.js) =================
   Added here, right after 05-pixel.js, so every index map that snapshots Object.keys(PAL) at load (world art, tiles, town view)
   knows them. Greek letters: no clash with the ASCII keys sprites use. Each colour is a [dark, mid, light] ramp in BANNERC. */
Object.assign(PAL,{
 'α':'#4a0a16','β':'#a3162c','γ':'#e04a5a',      // crimson
 'δ':'#2e0a1c','ε':'#6e1a3c','ζ':'#a8466a',      // wine
 'η':'#7a2a4a','θ':'#d4688c','ι':'#f6a8c0',      // rose
 'κ':'#0c1438','λ':'#24366f','μ':'#4d67ad',      // navy
 'ν':'#0a3a40','ξ':'#1f7c84','ο':'#5cbcc0',      // teal
 'π':'#2a0e3a','ρ':'#6a2a86','σ':'#a866c4',      // plum
 'τ':'#2e300c','υ':'#6b6e22','φ':'#a8a656',      // olive
 'χ':'#5a2e0a','ψ':'#b8641c','ω':'#eaa04e'});    // tawny
