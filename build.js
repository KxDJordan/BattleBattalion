// Concatenates src/ into one self-contained HTML file. Usage: node build.js [out]
const fs=require('fs'),path=require('path');
const out=process.argv[2]||'dist/index.html',S=path.join(__dirname,'src');
const css=fs.readdirSync(S).filter(f=>f.endsWith('.css')).sort((a,b)=>a==='style.css'?-1:b==='style.css'?1:a.localeCompare(b)).map(f=>fs.readFileSync(path.join(S,f),'utf8')).join('\n');
const js=fs.readdirSync(S).filter(f=>f.endsWith('.js')).sort().map(f=>`/* ---- ${f} ---- */\n`+fs.readFileSync(path.join(S,f),'utf8')).join('\n');
const body=fs.readFileSync(path.join(S,'body.html'),'utf8');
// game icon (art): committed PNGs in assets/ (node assets/make-icons.js), inlined as data URIs; skipped when absent
const icon=n=>{try{return'data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'assets','icon-'+n+'.png')).toString('base64')}catch(e){return''}};
const icons=[['icon','16','16x16'],['icon','32','32x32'],['apple-touch-icon','180','180x180']].map(([r,n,s])=>{const u=icon(n);return u?`<link rel="${r}" type="image/png" sizes="${s}" href="${u}">`:''}).filter(Boolean).join('\n');
const html=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<title>Wyrdmarch</title>
${icons}
<link href="https://fonts.googleapis.com/css2?family=Jersey+15&family=Alegreya+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
${body}
<script>
'use strict';
${js}
</script>
</body>
</html>
`;
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);console.log('built',out,html.length,'bytes');
