// Contact sheet: node tools/paint/sheet.js out.png [dpr] [REF|name,name,...] [bg]  (old HD pixel icon at 64 px, then the live icon at 16/24/32/64 CSS px)
// node sheet.js out.png dpr names|REF [bg]
const {chromium}=require('playwright');const fs=require('fs');
const REF='hp,armor,helmet,fatigue,init,melee,ranged,mdef,rdef,ap,xp,morale-0,morale-1,morale-2,morale-3,morale-4,mana,aura,qi,chi,coin,food,tools,camp,settings,endturn,swap,close,check,star,skull,sword,axe,mace,spear,dagger,bow,w-xbow,staff,shield,ab-attack,ab-slash,ab-fireball,ab-bash,ab-bandage,bleed,burn,chill,ab-poison,poisoned,stun,daze,it-mail,it-greathelm,it-longbow,tg-ore,m-vanguard,trait-brave,trait-craven';
const [out,dpr,names,bg]=process.argv.slice(2);const L=(!names||names==='REF'?REF:names).split(',');
(async()=>{const b=await chromium.launch(),cols=2;const rows=Math.ceil(L.length/cols);
const p=await b.newPage({viewport:{width:1060,height:rows*72+40},deviceScaleFactor:+dpr||2});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto('file://'+require('path').resolve(__dirname,'../../index.html'));await p.waitForTimeout(400);
await p.evaluate(([L,bg])=>{const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;z-index:99999;background:'+(bg||'#1c2b29')+';display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;padding:12px;font:11px sans-serif;color:#dfe;align-content:start;overflow:hidden';
 for(const n0 of L){const n=icResolve(n0);const r=document.createElement('div');r.style.cssText='display:flex;align-items:center;gap:10px;height:68px';
  const cv=iconHdCanvas(n);const old=cv?'<img src="'+cv.toDataURL()+'" style="width:64px;height:64px;image-rendering:pixelated;opacity:.95">':'<span style="width:64px"></span>';
  let h='<span style="width:86px;overflow:hidden">'+n0+'</span>'+old+'<span style="width:6px;border-left:1px solid #456;height:60px"></span>';
  for(const s of [16,24,32,64]){h+=pxIcon(n0,16).replace(/width:16px;height:16px/,'width:'+s+'px;height:'+s+'px')}
  r.innerHTML=h;d.appendChild(r)}document.body.appendChild(d)},[L,bg]);
await p.waitForTimeout(300);await p.screenshot({path:out});const perf=await p.evaluate(()=>({n:PK.n,ms:+PK.ms.toFixed(1),px:pkPx()}));console.log(JSON.stringify(perf),errs.join('\n'));await b.close()})();
