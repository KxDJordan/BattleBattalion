// Enumerate every icon name (forces icResolve on AB, STATUS, ITEMS, MAST, TRAITS, trade goods): node tools/paint/enum.js out.json
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch(),p=await b.newPage();await p.goto('file://'+require('path').resolve(__dirname,'../../index.html'));await p.waitForTimeout(400);
const r=await p.evaluate(()=>{const R=n=>{try{return icResolve(n)}catch(e){return'none'}};
 const T=(o,pre)=>{if(o)for(const k in o)R(pre+k)};T(AB,'ab-');T(STATUS,'st-');T(ITEMS,'it-');for(const k in MAST)R('m-'+k);for(const k in TRAITS)R('trait-'+k);for(const k in ITEMS)if(ITEMS[k].k==='t')R(tgIcon(k));
 const st=new Set();for(const k in STATUS)st.add(R('st-'+k));for(const k in SH_ST)st.add(R('st-'+k));for(const a in IC_ALIAS)if(a.startsWith('st-'))st.add(R(a));for(const k of IC_STKEY)st.add(k[1]);for(const k in AN_PRI)st.add(R('st-'+k));for(const k in AN_TINT)st.add(R('st-'+k));
 const stKeys={};for(const k in STATUS)stKeys[k]=R('st-'+k);
 return {all:Object.keys(ICONS).filter(n=>n[0]!=='_'),st:[...st],stKeys}});
fs.writeFileSync(process.argv[2]||'icons.json',JSON.stringify(r));console.log(r.all.length,r.st.length,JSON.stringify(r.stKeys));await b.close()})();
