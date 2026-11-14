// Writes the game icon PNGs (assets/icon-<size>.png) from gameIconCanvas() in 06-icons.js (source rows: GAME_ICON).
// Usage: node build.js dist/icons.html && node assets/make-icons.js dist/icons.html
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');
(async()=>{const html=path.resolve(process.argv[2]||'dist/index.html'),b=await chromium.launch(),p=await b.newPage();
 await p.goto('file://'+html);await p.waitForFunction(()=>typeof gameIconCanvas==='function');
 for(const s of [16,32,180,192,512]){const u=await p.evaluate(s=>gameIconCanvas(s).toDataURL('image/png'),s);
  fs.writeFileSync(path.join(__dirname,'icon-'+s+'.png'),Buffer.from(u.split(',')[1],'base64'));console.log('icon-'+s+'.png')}
 await b.close()})();
