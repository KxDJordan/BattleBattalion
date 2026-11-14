// Concatenates src/ into one self-contained HTML file. Usage: node build.js [out]
const fs=require('fs'),path=require('path');
const out=process.argv[2]||'dist/index.html',S=path.join(__dirname,'src');
const css=fs.readdirSync(S).filter(f=>f.endsWith('.css')).sort((a,b)=>a==='style.css'?-1:b==='style.css'?1:a.localeCompare(b)).map(f=>fs.readFileSync(path.join(S,f),'utf8')).join('\n');
const js=fs.readdirSync(S).filter(f=>f.endsWith('.js')).sort().map(f=>`/* ---- ${f} ---- */\n`+fs.readFileSync(path.join(S,f),'utf8')).join('\n');
const body=fs.readFileSync(path.join(S,'body.html'),'utf8');
const html=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<title>Wyrdmarch</title>
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
