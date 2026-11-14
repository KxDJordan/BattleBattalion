// Browser smoke test. Usage: node test/smoke.js [html] [w] [h]
const {chromium}=require('playwright'),path=require('path');
(async()=>{const f=path.resolve(process.argv[2]||'dist/index.html'),w=+process.argv[3]||667,h=+process.argv[4]||375;
const b=await chromium.launch(),p=await b.newPage({viewport:{width:w,height:h}});const errs=[];
p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push(m.text())});
await p.goto('file://'+f);await p.waitForTimeout(300);
await p.evaluate(()=>{newGame();closeSheet()});await p.waitForTimeout(300);
const st=await p.evaluate(()=>({mode,roster:G.roster.length,towns:G.towns.length}));
await p.evaluate(()=>{startBattle({f:'gob',mult:1,src:{type:'party',id:-1}});B.auto=true});
await p.waitForFunction(()=>!B||B.over,null,{timeout:120000}).catch(()=>errs.push('battle did not finish'));
console.log(JSON.stringify(st),errs.length?'ERRORS:\n'+errs.join('\n'):'OK');await b.close();process.exit(errs.length?1:0)})();
