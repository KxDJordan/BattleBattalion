// Battle + roster shots with statuses on every unit: OUT=/path/prefix node tools/paint/shots.js dpr w h tag [low]
// node shots.js dpr w h tag [low]
const {chromium}=require('playwright');
const [dpr,w,h,tag,low]=process.argv.slice(2);const O=process.env.OUT||('/tmp/paint-'+tag);
(async()=>{const b=await chromium.launch(),p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:+dpr});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto('file://'+require('path').resolve(__dirname,'../../index.html'));await p.waitForTimeout(400);
await p.evaluate(()=>{newGame();closeSheet()});await p.waitForTimeout(300);
if(low)await p.evaluate(()=>{SET.detail='low';artChanged()});
await p.evaluate(()=>companySheet());await p.waitForTimeout(500);await p.screenshot({path:O+'-roster.png'});

await p.evaluate(()=>{try{closeSheet()}catch(e){}try{if(typeof closePanel==='function')closePanel();if(typeof hidePanel==='function')hidePanel()}catch(e){}startBattle({f:'gob',mult:1,src:{type:'party',id:-1}})});
await p.waitForFunction(()=>B&&B.cur&&B.cur.side===0&&!B.busy,null,{timeout:60000}).catch(()=>errs.push('no player turn'));await p.waitForTimeout(400);
await p.evaluate(()=>{const S=[{bleed:2,burn:1},{chill:1,stun:1,daze:2},{poison:3},{burn:2,bleed:3},{webbed:1,hex:2},{shieldwall:1,riposte:1},{chill:2},{daze:1,bleed:1}];let i=0;for(const u of B.units){if(!u.alive)continue;u.st=Object.assign({},u.st||{},S[i%S.length]);i++}SHV.rev++;
 zoomStep(1);zoomStep(1);const u=B.units.find(u=>u.side===0&&u.alive),c=B.cam;c.x=c.tx=u.sx+20;c.y=c.ty=u.sy-30;c.ltx=c.tx;c.lty=c.ty;c.hold=true});
await p.waitForTimeout(900);await p.screenshot({path:O+'-battle.png'});
console.log(tag,errs.join('\n')||'ok');await b.close()})();
