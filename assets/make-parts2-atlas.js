// Wrapper: node assets/make-parts2-atlas.js [--sheet out.png]  ->  python3 assets/make-parts2-atlas.py (writes src/73p-parts2atlas.js)
require('child_process').execFileSync('python3',[require('path').join(__dirname,'make-parts2-atlas.py'),...process.argv.slice(2)],{stdio:'inherit'});
