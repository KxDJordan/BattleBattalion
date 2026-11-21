/* ================= AUDIO (phase 8B): sound and music made in code with WebAudio. No files, no network, no worklets.
   AUDIO.play(name, {at, v, p, pan})  one effect from AU_SFX (at: seconds from now, v: volume x, p: pitch x, pan -1..1)
   AUDIO.music(track|null|undefined)   force a track ('title' 'day' 'night' 'town' 'battle' 'boss' 'crisis' 'east' 'eastBattle'),
                                       null for silence; undefined hands it back to the scene (auTrackFor(auScene()))
   AUDIO.ambience(key|undefined)       force an ambience key (see auAmbFor), undefined follows the scene
   AUDIO.unlock()                      called from the first user gesture (iOS / Safari / Chrome autoplay rules)
   AUDIO.tick()                        cheap, from the shell's 250 ms chromeTick: scene -> track / ambience, music scheduler
                                       (runs up to AU_LOOK seconds ahead), ambience events, coins / level-ups / stingers
   AUDIO.apply()                       volumes from SET.vol / SET.music / SET.sfx / SET.mute
   auPlan(type, d) -> [[name, delay, opts], ...]  what an FX event sounds like (pure; the test reads it)
   The battle's FX.on handler is chained, never replaced (audioHookFx). With no AudioContext (headless tests, old browsers)
   every call is a no-op. Audio never touches the game RNG: music and ambience variation come from auRand (own state). */
const AU_LOOK=1.2,AU_XF=2.4;
const AU={ctx:null,ok:false,gest:false,dead:false,out:null,comp:null,mus:null,sfx:null,amb:null,rev:null,revIn:null,nb:null,
 seed:0x51f15e,trk:null,want:undefined,wantT:0,forceM:undefined,forceA:undefined,ambK:'',ambL:null,ambNext:0,
 last:Object.create(null),win:0,winN:0,stepNext:0,crG:null,cr:0,lvG:null,lv:Object.create(null),bRes:null,lastCast:null,hooked:false,hid:false};
function auRand(){let t=(AU.seed=(AU.seed+0x6D2B79F5)|0);t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
function auMk(seed){let s=seed|0;return()=>{let t=(s=(s+0x6D2B79F5)|0);t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function auHash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h|0}
const auMidi=m=>440*Math.pow(2,(m-69)/12);
function auCtxClass(){try{return typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext)||null}catch(e){return null}}
function auSet(k,d){return typeof SET!=='undefined'&&SET&&typeof SET[k]==='number'&&isFinite(SET[k])?Math.max(0,Math.min(1,SET[k])):d}
function auMuted(){return typeof SET!=='undefined'&&SET&&SET.mute===true}

/* ---------- graph: buses -> master -> limiter -> speakers; one shared room reverb fed by sends ---------- */
function auGraph(c){const g=v=>{const n=c.createGain();n.gain.value=v;return n};
 const comp=c.createDynamicsCompressor();try{comp.threshold.value=-12;comp.knee.value=8;comp.ratio.value=8;comp.attack.value=.004;comp.release.value=.22}catch(e){}
 const out=g(0),mus=g(.6),sfx=g(.8),amb=g(.6),revIn=g(1),rev=c.createConvolver(),revOut=g(.28);
 // noise: 2 s of white noise, made once (own PRNG). Reverb: 1.7 s stereo tail of decaying, softened noise
 const r=auMk(0x9e3779b9),N=Math.floor(c.sampleRate*2),nb=c.createBuffer(1,N,c.sampleRate),d=nb.getChannelData(0);for(let i=0;i<N;i++)d[i]=r()*2-1;
 const L=Math.floor(c.sampleRate*1.7),ir=c.createBuffer(2,L,c.sampleRate);for(let ch=0;ch<2;ch++){const x=ir.getChannelData(ch);let lp=0;for(let i=0;i<L;i++){lp+=(r()*2-1-lp)*.35;x[i]=lp*Math.pow(1-i/L,2.6)*(i<c.sampleRate*.012?i/(c.sampleRate*.012):1)}}
 rev.buffer=ir;revIn.connect(rev);rev.connect(revOut);revOut.connect(out);
 mus.connect(out);sfx.connect(out);amb.connect(out);out.connect(comp);comp.connect(c.destination);
 const ms=g(.35),ss=g(.16);mus.connect(ms);ms.connect(revIn);sfx.connect(ss);ss.connect(revIn);
 return{out,comp,mus,sfx,amb,rev,revIn,nb}}
function auInit(){if(AU.ctx||AU.dead)return!!AU.ctx;const C=auCtxClass();if(!C){AU.dead=true;return false}
 try{try{if(typeof navigator!=='undefined'&&navigator.audioSession)navigator.audioSession.type='ambient'}catch(e){}   // the iPhone's silent switch keeps the game quiet
  let c;try{c=new C({latencyHint:'interactive'})}catch(e){c=new C()}AU.ctx=c;Object.assign(AU,auGraph(c));AU.ok=true;auApply(true);auAmbStart()}catch(e){AU.ctx=null;AU.ok=false;AU.dead=true;return false}
 return true}
function auUnlock(){AU.gest=true;if(auMuted())return false;if(!auInit())return false;const c=AU.ctx;
 try{const b=c.createBuffer(1,1,22050),s=c.createBufferSource();s.buffer=b;s.connect(c.destination);s.start(0)}catch(e){}   // iOS: a sound started inside the gesture
 if(c.state!=='running'&&!AU.hid)try{const p=c.resume();if(p&&p.catch)p.catch(()=>{})}catch(e){}
 return true}
function auLive(){const c=AU.ctx;return!!(c&&AU.ok&&c.state==='running'&&!auMuted()&&!AU.hid)}
function auApply(now){const c=AU.ctx;if(!c||!AU.out)return;const t=c.currentTime,k=now?.001:.06,m=auMuted()?0:auSet('vol',.8),mu=auSet('music',.6),fx=auSet('sfx',.8);
 AU.out.gain.setTargetAtTime(m,t,k);AU.mus.gain.setTargetAtTime(mu*mu*1.5,t,k);AU.sfx.gain.setTargetAtTime(fx*fx*1.4,t,k);AU.amb.gain.setTargetAtTime(fx*fx*.45,t,k);   // squared: the sliders feel even
 if(auMuted()){setTimeout(()=>{try{if(auMuted()&&AU.ctx&&AU.ctx.state==='running')AU.ctx.suspend()}catch(e){}},300)}
 else if(AU.gest&&!AU.hid&&c.state!=='running')try{const p=c.resume();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
function auHidden(h){AU.hid=!!h;const c=AU.ctx;if(!c)return;try{if(h){if(c.state==='running')c.suspend()}else if(!auMuted()&&AU.gest){const p=c.resume();if(p&&p.catch)p.catch(()=>{})}}catch(e){}}

/* ---------- primitives: an oscillator or a noise burst through an envelope (optionally a filter), into node o ---------- */
// p: w wave, f Hz, f2 end Hz (exponential sweep over fd||d), a attack, d decay (to silence), g peak, lp lowpass Hz, q, det cents, hold (s at peak)
function auO(t,o,w,f,f2,a,d,g,x){const c=AU.ctx,s=c.createOscillator(),e=c.createGain();s.type=w;s.frequency.setValueAtTime(f,t);if(f2)s.frequency.exponentialRampToValueAtTime(f2,t+(x&&x.fd||a+d));
 if(x&&x.det)s.detune.value=x.det;let n=s;if(x&&x.lp){const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=x.lp;fl.Q.value=x.q||.7;s.connect(fl);n=fl}
 const h=x&&x.hold||0;e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(g,t+a);if(h)e.gain.setValueAtTime(g,t+a+h);e.gain.exponentialRampToValueAtTime(.0001,t+a+h+d);
 n.connect(e);e.connect(o);s.start(t);s.stop(t+a+h+d+.03);return s}
function auN(t,o,ft,f,q,a,d,g,f2){const c=AU.ctx,s=c.createBufferSource(),fl=c.createBiquadFilter(),e=c.createGain();s.buffer=AU.nb;s.loop=true;
 fl.type=ft;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+a+d);fl.Q.value=q;
 e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(g,t+a);e.gain.exponentialRampToValueAtTime(.0001,t+a+d);
 s.connect(fl);fl.connect(e);e.connect(o);s.start(t,auRand()*1.6);s.stop(t+a+d+.03);return s}
const auR=(a,b)=>a+(b-a)*auRand();

/* ---------- the effects library. Each is (t, out, p pitch factor). Levels are kept low: the limiter only guards peaks. ---------- */
const AU_GIFT={mana:'mana',aura:'aura',qi:'qi',chi:'chi'};
const AU_SFX={
 // UI: soft wood and brass, never a beep
 click(t,o,p){auO(t,o,'triangle',1250*p,880*p,.002,.045,.09);auN(t,o,'highpass',3200,.7,.001,.02,.035)},
 confirm(t,o,p){auO(t,o,'triangle',784*p,0,.003,.14,.08);auO(t+.06,o,'triangle',1175*p,0,.003,.2,.07);auO(t+.06,o,'sine',2350*p,0,.003,.12,.015)},
 cancel(t,o,p){auO(t,o,'triangle',660*p,560*p,.003,.1,.07);auO(t+.055,o,'triangle',494*p,440*p,.003,.15,.055)},
 tab(t,o,p){auN(t,o,'bandpass',2200,1.4,.002,.05,.07,1300);auO(t,o,'sine',980*p,0,.002,.045,.045)},
 open(t,o){auN(t,o,'bandpass',900,.8,.03,.14,.05,2600)},
 deny(t,o){auO(t,o,'triangle',233,0,.004,.09,.06);auO(t+.09,o,'triangle',196,0,.004,.14,.06)},
 // feet and swings
 step(t,o,p){auN(t,o,'lowpass',auR(420,720)*p,.8,.004,.07,.16);auO(t,o,'sine',auR(85,105)*p,55,.003,.06,.1)},
 stepBig(t,o,p){auN(t,o,'lowpass',380*p,.8,.006,.12,.24);auO(t,o,'sine',62*p,36,.004,.14,.22)},
 whoosh(t,o,p){auN(t,o,'bandpass',420*p,1.3,.07,.15,.14,2100*p)},
 // weapon hits
 blade(t,o,p){auN(t,o,'bandpass',3100*p,2,.001,.06,.12,1900);auN(t,o,'lowpass',950,.8,.002,.12,.2);auO(t,o,'sine',160*p,70,.002,.09,.16)},
 blunt(t,o,p){auO(t,o,'sine',130*p,48,.002,.2,.3);auN(t,o,'lowpass',720*p,1,.002,.14,.24);auN(t,o,'bandpass',1500,1,.001,.03,.07)},
 pierce(t,o,p){auN(t,o,'bandpass',2400*p,2.5,.001,.04,.13,1200);auO(t,o,'sine',220*p,90,.002,.07,.15);auN(t+.01,o,'lowpass',800,.7,.002,.08,.13)},
 claw(t,o,p){auN(t,o,'bandpass',1400*p,1.2,.002,.07,.18,800);auN(t+.045,o,'bandpass',1100*p,1.2,.002,.07,.14,700);auO(t,o,'sine',140*p,70,.002,.08,.11)},
 arrowFly(t,o,p){auO(t,o,'triangle',196*p,185*p,.002,.18,.09);auO(t,o,'sine',392*p,370*p,.002,.1,.035);auN(t,o,'highpass',2600,.7,.001,.05,.045);auO(t+.03,o,'sine',2400,1700,.05,.12,.012)},
 arrowHit(t,o,p){auO(t,o,'sine',340*p,120,.001,.06,.16);auN(t,o,'bandpass',1600*p,1.5,.001,.05,.13)},
 boltFly(t,o,p){auN(t,o,'bandpass',2600*p,2,.001,.03,.14);auO(t,o,'triangle',140*p,90,.001,.05,.08);auO(t+.01,o,'triangle',110*p,100,.002,.12,.06)},
 boltHit(t,o,p){auO(t,o,'sine',260*p,80,.001,.09,.22);auN(t,o,'bandpass',1200*p,1.4,.001,.07,.17)},
 shotFire(t,o,p){auN(t,o,'lowpass',3000*p,.7,.001,.28,.36,240);auO(t,o,'sine',92*p,38,.001,.22,.3);auN(t+.03,o,'bandpass',600,.6,.03,.7,.05)},
 shotHit(t,o,p){auN(t,o,'bandpass',2000*p,2,.001,.04,.12,900);auO(t,o,'sine',200*p,80,.002,.07,.14)},
 armor(t,o,p){const f=auR(1550,1800)*p;auO(t,o,'sine',f,0,.001,.17,.05);auO(t,o,'sine',f*1.48,0,.001,.11,.035);auO(t,o,'sine',f*2.31,0,.001,.07,.025);auN(t,o,'highpass',4200,.7,.001,.03,.05)},
 helm(t,o,p){const f=auR(2100,2300)*p;auO(t,o,'sine',f,0,.001,.32,.045);auO(t,o,'sine',f*1.51,0,.001,.2,.03);auO(t,o,'sine',f*2.73,0,.001,.1,.02);auN(t,o,'highpass',5000,.7,.001,.03,.05)},
 head(t,o,p){auO(t,o,'sine',78*p,40,.002,.16,.2);auN(t,o,'lowpass',520,1,.002,.1,.15)},
 heavy(t,o,p){auO(t,o,'sine',64*p,34,.003,.3,.26);auN(t+.01,o,'lowpass',300,.8,.004,.2,.14)},
 block(t,o,p){auO(t,o,'triangle',170*p,120,.002,.12,.2);auN(t,o,'bandpass',650*p,1.2,.002,.09,.18);auN(t,o,'bandpass',2000,2,.001,.025,.05)},
 shieldBreak(t,o,p){auN(t,o,'bandpass',1300*p,.9,.002,.25,.24,500);for(let i=0;i<5;i++)auN(t+.02*i+auR(0,.01),o,'bandpass',2500*p,3,.001,.02,.06);auO(t,o,'triangle',150*p,80,.002,.2,.12)},
 miss(t,o,p){auN(t,o,'bandpass',700*p,1.2,.05,.13,.1,2600*p);auN(t+.04,o,'highpass',3000,.7,.02,.08,.02)},
 kb(t,o,p){auO(t,o,'sine',100*p,45,.002,.18,.22);auN(t,o,'lowpass',600,.8,.003,.15,.16);auN(t,o,'bandpass',500,1,.04,.12,.06,1500)},
 injury(t,o,p){auN(t,o,'bandpass',2600*p,4,.001,.02,.16);auN(t+.015,o,'bandpass',1800*p,3,.001,.03,.12);auO(t,o,'sine',120*p,60,.002,.1,.1)},
 death(t,o,p){auO(t,o,'triangle',300*p,140*p,.01,.4,.045,{lp:1200});auN(t+.12,o,'lowpass',380,.8,.004,.28,.26);auO(t+.12,o,'sine',85*p,38,.003,.3,.26)},
 deathAlly(t,o,p){AU_SFX.death(t,o,p);auO(t+.3,o,'sine',220,0,.02,1.6,.04);auO(t+.3,o,'sine',261.6,0,.02,1.5,.03);auO(t+.3,o,'sine',220*2.76,0,.01,.8,.008)},
 // gifts: Mana arcane glitter, Aura warm light, Qi crackling storm, Chi deep breath and gong; foes: a dark swell
 mana(t,o,p){[0,4,7,11,14].forEach((n,i)=>{const f=880*p*Math.pow(2,n/12);auO(t+i*.045,o,'sine',f,0,.005,.36,.04);auO(t+i*.045,o,'triangle',f*2,0,.005,.18,.01)});auN(t,o,'highpass',5200,.7,.08,.3,.03)},
 aura(t,o,p){[0,4,7].forEach(n=>{const f=523*p*Math.pow(2,n/12);auO(t,o,'triangle',f,0,.08,.6,.045);auO(t,o,'sine',f*2,0,.1,.4,.014)});auN(t,o,'bandpass',1200,.6,.12,.3,.045,2400)},
 qi(t,o,p){for(let i=0;i<7;i++)auN(t+i*.03+auR(0,.012),o,'bandpass',auR(2600,4600)*p,3,.001,.02,.09);auO(t,o,'sawtooth',900*p,220,.003,.18,.03,{lp:2400})},
 chi(t,o,p){auO(t,o,'sine',110*p,0,.15,.6,.11);auO(t,o,'sine',165*p,0,.15,.6,.06);auO(t+.03,o,'sine',196*p,0,.003,1.1,.045);auO(t+.03,o,'sine',196*2.76*p,0,.003,.55,.016)},
 dark(t,o,p){auO(t,o,'sawtooth',110*p,98*p,.16,.5,.04,{lp:700});auO(t,o,'sawtooth',116.5*p,104*p,.16,.5,.04,{lp:700});auN(t,o,'lowpass',300,.8,.2,.4,.06)},
 fire(t,o,p){auN(t,o,'lowpass',1300*p,.7,.06,.45,.2,300);auN(t,o,'bandpass',420,.8,.05,.5,.1)},
 frost(t,o,p){auO(t,o,'sine',2093*p,0,.003,.3,.03);auO(t+.04,o,'sine',2637*p,0,.003,.3,.025);auN(t,o,'highpass',6000,.7,.02,.22,.04)},
 manaHit(t,o,p){auO(t,o,'sine',1320*p,660*p,.002,.16,.07);auN(t,o,'bandpass',3000*p,2,.001,.08,.07)},
 auraHit(t,o,p){auO(t,o,'triangle',660*p,330*p,.002,.2,.08);auO(t,o,'sine',140*p,70,.002,.1,.15)},
 qiHit(t,o,p){for(let i=0;i<3;i++)auN(t+i*.025,o,'bandpass',3200*p,3,.001,.02,.1);auO(t,o,'sine',120*p,60,.002,.1,.14)},
 chiHit(t,o,p){auO(t,o,'sine',96*p,48,.003,.2,.24);auO(t,o,'sine',220*p,0,.003,.25,.04)},
 darkHit(t,o,p){auO(t,o,'sine',90*p,40,.003,.22,.22);auO(t,o,'sawtooth',150*p,75,.003,.2,.03,{lp:600})},
 fireHit(t,o,p){auN(t,o,'lowpass',1800*p,.7,.003,.4,.26,250);auO(t,o,'sine',70*p,35,.003,.28,.22)},
 heal(t,o,p){[659,784,988,1319].forEach((f,i)=>auO(t+i*.06,o,'sine',f*p,0,.01,.5,.04));auN(t,o,'highpass',4000,.7,.15,.3,.015)},
 buff(t,o,p){auO(t,o,'triangle',784*p,0,.004,.22,.055);auO(t+.07,o,'triangle',1047*p,0,.004,.32,.055)},
 rally(t,o){[[196,.0,.16],[262,.15,.16],[330,.3,.45]].forEach(([f,d,h])=>{auO(t+d,o,'sawtooth',f,0,.05,.35,.05,{lp:1400,hold:h});auO(t+d,o,'sine',f,0,.05,.35,.04,{hold:h})})},
 rout(t,o){[[220,0,.25],[175,.32,.5]].forEach(([f,d,h])=>{auO(t+d,o,'sawtooth',f,f*.96,.07,.45,.045,{lp:900,hold:h});auO(t+d,o,'sine',f/2,0,.07,.45,.04,{hold:h})})},
 waver(t,o){auO(t,o,'triangle',294,262,.01,.3,.04)},
 levelup(t,o){[62,66,69,74,78].forEach((m,i)=>{const f=auMidi(m);auO(t+i*.07,o,'triangle',f,0,.003,.7,.06);auO(t+i*.07,o,'sine',f*2,0,.003,.4,.015)});auO(t+.38,o,'sine',auMidi(86),0,.003,1.2,.035);auO(t+.38,o,'sine',auMidi(86)*2.76,0,.003,.5,.008)},
 stun(t,o,p){auO(t,o,'sine',1800*p,1750*p,.002,.5,.03);auO(t,o,'sine',1832*p,1780*p,.002,.5,.025)},
 burn(t,o){auN(t,o,'lowpass',1500,.7,.05,.3,.1,400)},
 bleed(t,o){auN(t,o,'lowpass',800,1,.01,.1,.09)},
 poison(t,o){for(let i=0;i<3;i++)auO(t+i*.07,o,'sine',auR(380,520),auR(650,800),.004,.06,.03)},
 tick(t,o,p){auO(t,o,'triangle',1500*p,0,.001,.04,.035)},
 turn(t,o){auO(t,o,'triangle',523,0,.002,.09,.03);auO(t+.05,o,'triangle',784,0,.002,.12,.025)},
 boss(t,o){auO(t,o,'sine',58,36,.004,.9,.36);auN(t,o,'lowpass',260,.8,.004,.5,.24);auO(t+.05,o,'sawtooth',73.4,0,.3,1.4,.035,{lp:600});auO(t+.05,o,'sawtooth',77.8,0,.3,1.4,.03,{lp:600})},
 spawn(t,o,p){auN(t,o,'lowpass',300,.7,.05,.3,.12,1800);auO(t,o,'sine',150*p,300*p,.05,.2,.05)},
 swap(t,o,p){auN(t,o,'bandpass',4200*p,3,.01,.12,.045,2600);auO(t+.1,o,'sine',2400*p,0,.001,.1,.015)},
 shieldUp(t,o,p){auN(t,o,'bandpass',900*p,1,.003,.07,.12);auO(t,o,'triangle',200*p,160,.002,.07,.09)},
 reload(t,o,p){auN(t,o,'bandpass',2500*p,3,.001,.015,.12);auN(t+.13,o,'bandpass',1900*p,3,.001,.02,.12);auO(t+.13,o,'triangle',300*p,0,.001,.03,.04)},
 victory(t,o){const L=(m,d,h,g)=>{const f=auMidi(m);auO(t+d,o,'sawtooth',f,0,.02,.5,g,{lp:2200,hold:h});auO(t+d,o,'triangle',f,0,.01,.6,g*.8,{hold:h})};
  L(62,0,.1,.045);L(69,.16,.1,.045);L(74,.32,.12,.05);[74,78,81].forEach(m=>L(m,.52,.7,.035));[50,57].forEach(m=>auO(t+.52,o,'triangle',auMidi(m),0,.02,1.6,.06,{hold:.4}))},
 defeat(t,o){[[57,0],[53,.55],[50,1.1]].forEach(([m,d])=>{const f=auMidi(m);auO(t+d,o,'sawtooth',f,0,.2,1.1,.035,{lp:700,hold:.3});auO(t+d,o,'sine',f/2,0,.2,1.1,.05,{hold:.3})});auO(t+1.1,o,'sine',auMidi(62),0,.01,2.4,.03);auO(t+1.1,o,'sine',auMidi(62)*2.76,0,.01,1,.008)},
 // the world
 coin(t,o,p){auO(t,o,'sine',2637*p,0,.001,.12,.045);auO(t,o,'sine',3520*p,0,.001,.08,.025);auO(t+.07,o,'sine',3136*p,0,.001,.16,.04)},
 coins(t,o){for(let i=0;i<4;i++){const f=auR(2400,3600);auO(t+i*.055+auR(0,.02),o,'sine',f,0,.001,.14,.035);auO(t+i*.055,o,'sine',f*1.34,0,.001,.08,.015)}},
 spend(t,o){auO(t,o,'sine',2093,0,.001,.1,.03);auO(t+.05,o,'sine',1760,0,.001,.14,.03)},
 march(t,o,p){auN(t,o,'lowpass',auR(380,560)*p,.8,.006,.08,.07);auO(t,o,'sine',80,50,.004,.06,.045)},
 marchSnow(t,o){auN(t,o,'highpass',2400,.7,.01,.09,.05);auN(t,o,'lowpass',500,.8,.006,.07,.04)},
 marchMud(t,o){auN(t,o,'lowpass',420,1.6,.01,.12,.16,200);auO(t,o,'sine',70,45,.005,.07,.03)},
 event(t,o){[74,76,79,81,86].forEach((m,i)=>{const f=auMidi(m);auO(t+i*.05,o,'triangle',f,0,.003,.6,.045);auO(t+i*.05,o,'sine',f*2,0,.003,.3,.01)})},
 // ambience events (quiet: they sit under everything)
 bird(t,o){const n=2+(auRand()*3|0),f=auR(2600,4000);for(let i=0;i<n;i++)auO(t+i*auR(.09,.14),o,'sine',f*auR(.95,1.05),f*auR(1.15,1.4),.004,.06,.02)},
 cricket(t,o){const f=auR(4200,4600);for(let k=0;k<2;k++)for(let i=0;i<5;i++)auO(t+k*.3+i*.032,o,'sine',f,0,.002,.016,.008)},
 frog(t,o){for(let i=0;i<2;i++)auO(t+i*.16,o,'triangle',auR(170,200),130,.01,.1,.03,{lp:600})},
 owl(t,o){auO(t,o,'sine',420,380,.06,.3,.02);auO(t+.5,o,'sine',400,360,.06,.45,.02)},
 crow(t,o){for(let i=0;i<2;i++)auN(t+i*.28,o,'bandpass',1400,5,.02,.16,.035,900)},
 thunder(t,o){auN(t,o,'lowpass',1400,.7,.01,.4,.1);auN(t+.1,o,'lowpass',220,.7,.25,2.6,.3,90)},
 bell(t,o){const f=auR(.98,1.02)*392;auO(t,o,'sine',f,0,.003,2.6,.025);auO(t,o,'sine',f*2.76,0,.003,1,.008);auO(t,o,'sine',f*5.4,0,.002,.4,.004)},
 anvil(t,o){for(let i=0;i<2;i++){const f=auR(1900,2100);auO(t+i*.42,o,'sine',f,0,.001,.3,.016);auO(t+i*.42,o,'sine',f*1.47,0,.001,.18,.008)}},
 crackle(t,o){for(let i=0;i<3;i++)auN(t+auR(0,.25),o,'bandpass',auR(2000,4000),2,.001,.01,.025)},
 drip(t,o){auO(t,o,'sine',auR(900,1300),auR(1500,2000),.001,.05,.012)}};
const AU_SFXGAP={step:.05,march:.1,tick:.04,armor:.03,helm:.03,coin:.08,coins:.12,spend:.08,turn:.2,heal:.06,buff:.06,whoosh:.04,miss:.04};
function auPlay(name,o){const f=AU_SFX[name];if(!f||!auLive())return false;const c=AU.ctx,t0=c.currentTime,at=Math.max(0,Math.min(4,o&&o.at||0)),t=t0+at+.01;
 const gap=AU_SFXGAP[name]||.025,lt=AU.last[name]||0;if(t<lt+gap&&t>lt-gap)return false;
 if(t0-AU.win>.1){AU.win=t0;AU.winN=0}if(++AU.winN>16)return false;                          // a mass melee never stacks more than 16 sounds a tenth
 AU.last[name]=t;try{let out=AU.sfx;const v=o&&o.v!=null?o.v:1;if(v!==1||o&&o.pan){const g=c.createGain();g.gain.value=Math.max(0,Math.min(2,v));out=g;
   if(o&&o.pan&&c.createStereoPanner){const pn=c.createStereoPanner();pn.pan.value=Math.max(-1,Math.min(1,o.pan));g.connect(pn);pn.connect(AU.sfx)}else g.connect(AU.sfx);
   setTimeout(()=>{try{g.disconnect()}catch(e){}},(at+4)*1000)}
  f(t,out,o&&o.p||1);return true}catch(e){return false}}
function auPlayAmb(name){const f=AU_SFX[name];if(!f||!auLive())return;try{f(AU.ctx.currentTime+.02,AU.amb,1)}catch(e){}}

/* ---------- FX events -> sounds. auPlan is pure (no audio, no game state written, no RNG): the test runs it headless ---------- */
function auWKind(u){const w=u&&u.wpn,wt=w&&w.wt;if(u&&u.def&&(u.def.quad||u.def.beast||u.def.claw))return'claw';
 if(wt==='bow')return'arrow';if(wt==='crossbow')return'bolt';if(wt==='flintlock')return'shot';if(wt==='spear')return'pierce';
 if(wt==='mace'||wt==='hammer'||wt==='staff'||wt==='fist'||wt==='shield')return'blunt';if(wt==='dagger')return'pierce';if(u&&u.def&&u.def.big)return'blunt';return'blade'}
function auGift(ab,u){if(!ab)return null;if(ab.foe||(u&&u.side===1&&ab.id==='spell'))return'dark';const c=ab.cost&&ab.cost[0];if(AU_GIFT[c])return AU_GIFT[c];
 const s=String(ab.fx||ab.id||'')+' '+String(ab.n||'');if(/fire|flame|burn/i.test(s))return'fire';if(/frost|ice|chill/i.test(s))return'frost';return null}
function auPan(u){try{if(!u||typeof B==='undefined'||!B||!B.cam||typeof u.sx!=='number')return 0;const d=(u.sx-B.cam.x)*(B.cam.z||1);return Math.max(-.6,Math.min(.6,d/420))}catch(e){return 0}}
function auDelay(t){try{const q=typeof FXS!=='undefined'&&FXS.lastQ;if(q&&q.on&&q.t===t&&typeof now==='number'&&q.at>=now)return Math.min(2.5,(q.at-now)/1000)}catch(e){}return 0}
function auSpellFrom(u,t){const L=AU.lastCast;if(!L||L.u!==u)return null;if(typeof now==='number'&&L.at!=null&&now-L.at>3000)return null;return L}
const AU_FXMAP={
 hit(d){const u=d.u&&d.u!==d.t?d.u:null,t=d.t,dl=auDelay(t),dmg=d.dmg|0,arm=d.armor|0,pan=auPan(t),out=[],sp=u&&auSpellFrom(u,t);
  if(!u){out.push([dmg>0?'blunt':'block',dl,{v:.7,pan}]);return out}
  if(sp&&sp.g){out.push([sp.g+'Hit',dl,{pan}])}
  else{const k=auWKind(u),rng=!!(u.wpn&&u.wpn.rng>1)&&!(typeof mdist==='function'&&t&&typeof u.c==='number'&&typeof t.c==='number'&&mdist(u,t)<=1);
   if(rng){out.push([k==='bolt'?'boltFly':k==='shot'?'shotFire':'arrowFly',0,{pan:auPan(u)}]);out.push([k==='bolt'?'boltHit':k==='shot'?'shotHit':'arrowHit',dl,{pan}])}
   else{out.push(['whoosh',Math.max(0,dl-.12),{v:.7,pan}]);out.push([k==='arrow'||k==='bolt'||k==='shot'?'blunt':k,dl,{pan,p:u.sz>1?.8:1}])}}
  if(arm>0)out.push([d.head?'helm':'armor',dl,{pan,v:Math.min(1.2,.6+arm/30)}]);
  if(dmg===0&&!(arm>0))out.push(['block',dl,{pan}]);
  if(d.head&&dmg>0)out.push(['head',dl+.01,{pan}]);
  if(dmg>0&&t&&t.hpMax>0&&dmg>=t.hpMax*.3)out.push(['heavy',dl+.01,{pan}]);
  return out},
 miss(d){const u=d.u,dl=auDelay(d.t),k=auWKind(u),pan=auPan(d.t);if(d.block!=null){const sh=!!(u&&u.wpn&&u.wpn.rng>1&&(k==='arrow'||k==='bolt'||k==='shot'));return(sh?[[k==='bolt'?'boltFly':k==='shot'?'shotFire':'arrowFly',0,{pan:auPan(u)}]]:[['whoosh',Math.max(0,dl-.12),{v:.7,pan}]]).concat([['block',dl,{pan,p:u&&u.sz>1?.8:1}]])}   // a blow taken on the shield (60b-block.js)
  if(u&&u.wpn&&u.wpn.rng>1&&(k==='arrow'||k==='bolt'||k==='shot'))return[[k==='bolt'?'boltFly':k==='shot'?'shotFire':'arrowFly',0,{pan:auPan(u)}],['miss',dl,{pan,v:.6}]];
  const sp=u&&auSpellFrom(u,d.t);if(sp&&sp.g)return[['miss',dl,{pan,v:.5}]];return[['miss',Math.max(0,dl-.1),{pan}]]},
 death(d){return[[d.t&&d.t.side===0?'deathAlly':'death',.2,{pan:auPan(d.t)}]]},
 cast(d){const ab=d.ab;if(!ab||ab.id==='attack'||ab.id==='swap'||ab.swap)return[];const g=auGift(ab,d.u),pan=auPan(d.u);
  if(g)return[[g,0,{pan}]];if(ab.tgt==='move'||ab.dash)return[['whoosh',0,{pan}]];if(/cry|roar|shout|rally|warcry/i.test(String(ab.id)+' '+String(ab.n||'')))return[['rally',0,{pan,v:.7}]];return[['whoosh',0,{pan,v:.6}]]},
 move(d){const u=d.u;return[[u&&(u.sz>1||u.def&&u.def.big)?'stepBig':'step',0,{pan:auPan(u),v:u&&u.side===1?.8:1}]]},
 kb(d){return[['kb',.1,{pan:auPan(d.t)}]]},
 heal(d){return d.n>0?[['heal',0,{pan:auPan(d.t)}]]:[]},
 buff(d){return[['buff',0,{pan:auPan(d.t),v:.8}]]},
 turn(d){const u=d.u;return u&&u.side===0&&!(typeof B!=='undefined'&&B&&B.auto)?[['turn',0,{v:.8}]]:[]},
 loc(){return[]},                                                    // carried by the 'hit' just before it (head:bool)
 morale(d){if(d.to===0)return[['rout',0,{pan:auPan(d.u),v:d.u&&d.u.side===0?1:.8}]];if(d.to>d.from)return[['rally',0,{pan:auPan(d.u),v:.6}]];return d.to<=1?[['waver',0,{pan:auPan(d.u)}]]:[]},
 injury(d){return[['injury',auDelay(d.t)+.02,{pan:auPan(d.t)}]]},
 blocked(){return[['deny',0,{v:.8}]]},
 ff(){return[]},                                                     // the 'miss' and the 'hit' on the ally carry the sound
 spawn(d){return[['spawn',0,{pan:auPan(d.u)}]]},
 withdraw(d){const p=auPan(d.u);return[['step',0,{pan:p}],['step',.16,{pan:p,v:.7}],['step',.32,{pan:p,v:.45}]]},
 status(d){const k=d.key,p=auPan(d.t),dl=auDelay(d.t);if(k==='enrage')return[['boss',0,{}]];if(k==='splitshield')return d.n>0?[['block',dl,{pan:p}]]:[['shieldBreak',dl,{pan:p}]];
  if(k==='stun'||k==='daze')return[['stun',dl,{pan:p}]];if(k==='burn')return[['burn',dl,{pan:p}]];if(k==='bleed')return[['bleed',dl,{pan:p}]];if(k==='poison')return[['poison',dl,{pan:p}]];
  if(k==='lucky'||k==='undying')return[['buff',dl,{pan:p}]];return[['tick',dl,{pan:p,v:.7}]]},
 swap(d){return[['swap',0,{pan:auPan(d.u)}]]},
 shield(d){return[['shieldUp',0,{pan:auPan(d.u),p:d.raised?1.1:.9}]]},
 reload(d){return[['reload',0,{pan:auPan(d.u)}]]},
 realm(d){return[[d.what==='fire'?'burn':'kb',0,{v:.7}]]}};   // a portal realm's turn of the field (24-endgame.js): the embers spread, the stones shift
function auPlan(type,d){const f=AU_FXMAP[type];if(!f||!d||typeof d!=='object')return[];try{return f(d)||[]}catch(e){return[]}}
function audioFx(type,d){if(type==='cast'&&d&&d.u){const ab=d.ab||{},g=auGift(ab,d.u);AU.lastCast=g&&ab.tgt!=='self'&&ab.tgt!=='ally'&&ab.tgt!=='move'?{u:d.u,g,at:typeof now==='number'?now:0}:null}
 else if(type==='turn')AU.lastCast=null;
 if(!AU.ctx||!auLive()||typeof mode==='undefined'||mode!=='battle'||!(typeof SPEEDF==='number'&&SPEEDF>0))return;
 const L=auPlan(type,d);for(const x of L){const o=x[2]||{};o.at=(x[1]||0)*(SPEEDF<1?Math.max(.5,SPEEDF):1)+(o.at||0);auPlay(x[0],o)}}
// wraps whatever FX.on is registered (the scene's fxEvent): it runs first and its errors still reach FX.emit
function audioHookFx(){if(typeof FX==='undefined'||!FX)return false;const prev=FX.on;if(prev&&prev.auWrap)return true;
 const w=function(type,d){let err=null;if(typeof prev==='function'){try{prev(type,d)}catch(e){err=e}}try{audioFx(type,d)}catch(e){}if(err)throw err};
 w.auWrap=1;w.auPrev=prev;FX.on=w;AU.hooked=true;return true}

/* ---------- music: tracks are modes, chords, patterns and a form; melodies are made per 8-bar section from auMk(seed) ---------- */
const AU_SC={dorian:[0,2,3,5,7,9,10],mixo:[0,2,4,5,7,9,10],aeolian:[0,2,3,5,7,8,10],phrygdom:[0,1,4,5,7,8,10],ionian:[0,2,4,5,7,9,11],hira:[0,2,3,7,8],insen:[0,1,5,7,10],penta:[0,2,4,7,9]};
// spb steps a bar, sd seconds a step; prog: chord roots (scale degrees) bar by bar; arp/bass {st steps, seq chord-tone indexes}; dr drum pattern
// (D doum, d soft doum, t tek, s shaker, T taiko); form: one string per section (a arp, l lead, p pad, b bass, d drums, n drone, e bell)
const AU_TRACKS={
 title:{sc:'dorian',root:50,lo:12,spb:6,sd:.3,prog:[0,3,0,6,2,3,4,0],arp:{i:'harp',st:[0,1,2,3,4,5],seq:[0,1,2,3,2,1]},lead:'flute',bass:{st:[0],seq:[0]},form:['ap','apl','apl','pn'],cells:6},
 day:{sc:'mixo',root:55,spb:12,sd:.125,prog:[0,6,3,0,0,4,6,0],arp:{i:'lute',st:[0,2,4,6,8,10],seq:[0,1,2,3,2,1]},lead:'flute',bass:{st:[0,6],seq:[0,2]},dr:'d.....s.....',form:['ab','abl','abld','ap'],cells:12},
 night:{sc:'aeolian',root:57,spb:8,sd:.42,prog:[0,5,3,4,0,5,6,0],arp:{i:'harp',st:[0,2,4,6],seq:[0,2,1,3]},lead:'flute',form:['pa','pal','pa','pn'],cells:8,soft:1},
 town:{sc:'mixo',root:50,lo:12,spb:12,sd:.11,prog:[0,0,6,0,3,0,6,0],arp:{i:'lute',st:[0,3,6,9],seq:[0,2,1,2]},lead:'flute',bass:{st:[0,6],seq:[0,2]},dr:'D..t..D.tt.s',form:['abd','abdl','abdl','abl'],cells:12},
 battle:{sc:'aeolian',root:52,spb:16,sd:.14,prog:[0,0,5,6,0,0,3,4],arp:{i:'lute',st:[0,2,4,6,8,10,12,14],seq:[0,1,2,1,0,1,2,1]},lead:'fiddle',bass:{st:[0,6,8,14],seq:[0,0,0,2]},dr:'D...t.D.D...t.tt',form:['bdn','abdn','abdl','abdlp'],cells:16},
 boss:{sc:'phrygdom',root:50,spb:16,sd:.13,prog:[0,0,1,0,0,6,1,0],arp:{i:'lute',st:[0,3,6,8,11,14],seq:[0,1,2,0,1,2]},lead:'fiddle',bass:{st:[0,3,6,8,11,14],seq:[0,0,0,0,0,0]},dr:'T..D..T.T..D.DtD',form:['bdn','abdn','abdln','abdlp'],cells:16},
 crisis:{sc:'aeolian',root:48,lo:12,spb:8,sd:.5,prog:[0,5,0,4,0,5,3,4],arp:{i:'harp',st:[0,3,4],seq:[0,2,1]},lead:'flute',dr:'d.d.....',form:['pne','pnde','apnle','pnd'],cells:8,soft:1},
 east:{sc:'hira',root:57,spb:8,sd:.38,prog:[0,0,3,0,1,0,3,0],arp:{i:'koto',st:[0,1,2,4,6],seq:[0,1,2,3,1]},lead:'shaku',form:['pa','pal','al','pn'],cells:8,soft:1},
 eastBattle:{sc:'insen',root:52,spb:16,sd:.14,prog:[0,0,3,0,0,1,3,0],arp:{i:'koto',st:[0,2,4,8,10,12],seq:[0,1,2,0,2,1]},lead:'shaku',bass:{st:[0,8],seq:[0,0]},dr:'T...t.T.D...t.tt',form:['bdn','abdn','abdl','abdlp'],cells:16}};
const AU_CELLS={6:[[0,2,4],[0,3,4],[0,2,3,4],[0,4]],8:[[0,4],[0,2,4,6],[0,3,4,6],[0,4,6],[0,6]],12:[[0,4,6,8],[0,3,6,9],[0,6,8,10],[0,2,4,6,10],[0,6,9]],
 16:[[0,4,8,12],[0,6,8,12,14],[0,3,4,8,11,12],[0,8,10,12],[0,4,6,8,12],[0,2,4,8,12,14]]};
function auDeg(T,n){const S=AU_SC[T.sc],L=S.length,o=Math.floor(n/L);return T.root+S[((n%L)+L)%L]+12*o}
function auChord(T,bar){const r=T.prog[bar%T.prog.length],L=AU_SC[T.sc].length;return[r,r+2,r+4,r+L,r+L+2]}
function auSection(T,seed){const r=auMk(seed),L=AU_SC[T.sc].length,cells=AU_CELLS[T.cells]||AU_CELLS[8],lo=L,hi=2*L+2;
 const near=(cur,ch,root)=>{let best=cur,bd=99;for(const c of ch)for(const o of [0,L,-L]){const v=c+o;if(v<lo||v>hi)continue;const dd=Math.abs(v-cur)-(root&&c===ch[0]?.6:0);if(dd<bd){bd=dd;best=v}}return best};
 const strong=st=>st===0||st===T.spb/2;
 const phrase=bar0=>{const notes=[];let cur=L+(r()*3|0)*2;for(let b=0;b<2;b++){const cell=cells[r()*cells.length|0],ch=auChord(T,bar0+b);
   cell.forEach((st,i)=>{const mv=[-2,-1,-1,1,1,2,0,3,-3][r()*9|0];cur=Math.max(lo,Math.min(hi,cur+mv));if(strong(st))cur=near(cur,ch);
    const nx=i+1<cell.length?cell[i+1]:T.spb;notes.push({bar:b,st,len:nx-st,n:cur,rest:i>0&&r()<.14})})}return notes};
 // the answer keeps the call's rhythm and contour, its strong notes moved onto the chords it is played over; the last note rests on its chord's root
 const again=(src,bar0,end)=>{const out=src.map(x=>Object.assign({},x));for(const x of out)if(strong(x.st))x.n=near(x.n,auChord(T,bar0+x.bar));
  const z=out[out.length-1];if(end){z.n=near(z.n,auChord(T,bar0+z.bar),true);z.rest=false}else if(out.length>1)z.n=Math.max(lo,Math.min(hi,z.n+(r()<.5?-1:1)));return out};
 const A=phrase(0),Bp=phrase(4);return{lead:[A,again(A,2,false),Bp,again(A,6,true)],r}}
// instruments: (t, out, Hz, velocity, seconds)
const AU_INS={
 harp(t,o,f,v,d){auO(t,o,'triangle',f,0,.004,Math.max(.8,d*1.8),.11*v,{lp:3200});auO(t,o,'sine',f*2,0,.004,.5,.025*v)},
 lute(t,o,f,v,d){auO(t,o,'sawtooth',f,0,.003,Math.max(.35,d*1.2),.05*v,{lp:1500,q:.9});auO(t,o,'triangle',f,0,.003,Math.max(.4,d*1.3),.06*v)},
 koto(t,o,f,v,d){const s=auO(t,o,'triangle',f*1.025,f,.003,Math.max(.9,d*1.6),.1*v,{lp:2800,fd:.05});auO(t,o,'sine',f*3,0,.002,.25,.012*v)},
 flute(t,o,f,v,d){const c=AU.ctx,s=auO(t,o,'sine',f,0,.08,.18,.055*v,{hold:Math.max(.05,d-.1)}),lfo=c.createOscillator(),lg=c.createGain();lfo.frequency.value=5.2;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*.006,t+Math.min(.4,d));
  lfo.connect(lg);lg.connect(s.frequency);lfo.start(t);lfo.stop(t+d+.4);auO(t,o,'triangle',f*2,0,.08,.15,.008*v,{hold:Math.max(.05,d-.1)});auN(t,o,'bandpass',f*2,3,.05,.15,.008*v)},
 shaku(t,o,f,v,d){const s=auO(t,o,'sine',f*.97,f,.12,.25,.055*v,{hold:Math.max(.05,d-.12),fd:.18});auN(t,o,'bandpass',f*1.5,2,.06,Math.max(.2,d*.6),.018*v)},
 fiddle(t,o,f,v,d){const c=AU.ctx,s=auO(t,o,'sawtooth',f,0,.07,.2,.03*v,{lp:1700,hold:Math.max(.05,d-.08)}),lfo=c.createOscillator(),lg=c.createGain();lfo.frequency.value=5.6;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*.007,t+Math.min(.35,d));
  lfo.connect(lg);lg.connect(s.frequency);lfo.start(t);lfo.stop(t+d+.4);auO(t,o,'triangle',f,0,.06,.2,.03*v,{hold:Math.max(.05,d-.08)})},
 pad(t,o,f,v,d){auO(t,o,'sawtooth',f,0,.9,1.3,.016*v,{lp:750,det:-7,hold:Math.max(0,d-.9)});auO(t,o,'sawtooth',f,0,.9,1.3,.016*v,{lp:750,det:7,hold:Math.max(0,d-.9)})},
 bass(t,o,f,v,d){auO(t,o,'triangle',f,0,.01,Math.max(.3,d),.1*v,{lp:500});auO(t,o,'sine',f,0,.01,Math.max(.3,d*.8),.06*v)},
 drone(t,o,f,v,d){auO(t,o,'sine',f,0,1.5,1.5,.05*v,{hold:Math.max(0,d-1.5)});auO(t,o,'triangle',f*1.5,0,1.5,1.5,.015*v,{hold:Math.max(0,d-1.5),lp:600})},
 bell(t,o,f,v){auO(t,o,'sine',f,0,.003,3,.04*v);auO(t,o,'sine',f*2.76,0,.003,1.2,.012*v);auO(t,o,'sine',f*5.4,0,.002,.5,.005*v)},
 D(t,o,v){auO(t,o,'sine',115,55,.002,.32,.13*v,{fd:.12});auN(t,o,'bandpass',800,1,.001,.04,.03*v)},
 d(t,o,v){auO(t,o,'sine',105,55,.002,.25,.07*v,{fd:.1})},
 t(t,o,v){auN(t,o,'bandpass',2600,1.5,.001,.05,.04*v);auO(t,o,'sine',420,300,.001,.04,.025*v)},
 s(t,o,v){auN(t,o,'highpass',6500,.7,.003,.04,.018*v)},
 T(t,o,v){auO(t,o,'sine',78,40,.003,.6,.2*v,{fd:.2});auN(t,o,'lowpass',400,.8,.002,.2,.06*v)}};
function auTrackStart(k,at){const T=AU_TRACKS[k],c=AU.ctx;if(!T||!c)return null;const g=c.createGain();g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(1,c.currentTime+(at||AU_XF));g.connect(AU.mus);
 const seed=auHash(k)^(AU.seed=(AU.seed+0x9e37)|0);return{k,T,g,next:c.currentTime+.15,bar:0,sec:-1,seed,S:null}}
function auTrackStop(tr,fade){if(!tr||!AU.ctx)return;const t=AU.ctx.currentTime;try{tr.g.gain.cancelScheduledValues(t);tr.g.gain.setValueAtTime(tr.g.gain.value,t);tr.g.gain.linearRampToValueAtTime(0,t+(fade||AU_XF))}catch(e){}
 tr.dead=true;setTimeout(()=>{try{tr.g.disconnect()}catch(e){}},((fade||AU_XF)+5)*1000)}
function auBar(tr,t){const T=tr.T,b=tr.bar,si=Math.floor(b/8),bi=b%8,o=tr.g,sd=T.sd,bd=T.spb*sd;
 if(si!==tr.sec){tr.sec=si;tr.S=auSection(T,tr.seed+si*7919)}const S=tr.S,r=S.r,form=T.form[si%T.form.length],has=c=>form.indexOf(c)>=0,ch=auChord(T,b),hum=()=>(r()-.5)*.012;
 if(has('p'))for(const n of ch.slice(0,3))AU_INS.pad(t,o,auMidi(auDeg(T,n)),T.soft?.8:1,bd+.2);
 if(has('n')&&bi%4===0)AU_INS.drone(t,o,auMidi(T.root-12),1,bd*4+.5);
 if(has('e')&&bi%2===0)AU_INS.bell(t+hum(),o,auMidi(T.root+12),.8);
 if(has('a')&&T.arp){const A=T.arp,ins=AU_INS[A.i];A.st.forEach((st,i)=>{if(T.soft&&r()<.18)return;const n=ch[A.seq[i%A.seq.length]];ins(t+st*sd+hum(),o,auMidi(auDeg(T,n)),.75+r()*.3,sd*2)})}
 if(has('b')&&T.bass){const A=T.bass;A.st.forEach((st,i)=>AU_INS.bass(t+st*sd,o,auMidi(auDeg(T,ch[A.seq[i%A.seq.length]])-12),.8+r()*.2,sd*Math.max(2,(A.st[i+1]||T.spb)-st)*.9))}
 if(has('d')&&T.dr){for(let i=0;i<T.dr.length;i++){const k=T.dr[i];if(k!=='.'&&AU_INS[k])AU_INS[k](t+i*sd+hum(),o,.7+r()*.3)}}
 if(has('l')&&T.lead){const ph=S.lead[bi>>1],ins=AU_INS[T.lead];for(const x of ph)if(x.bar===(bi&1)&&!x.rest)ins(t+x.st*sd+hum(),o,auMidi(auDeg(T,x.n)+(T.lo||0)),.85+r()*.2,x.len*sd*.95)}
 tr.bar++;return bd}
function auSchedule(){const tr=AU.trk,c=AU.ctx;if(!tr||tr.dead||!c)return;if(tr.next<c.currentTime-1)tr.next=c.currentTime+.05;   // after a suspend: pick up, do not catch up
 let n=0;while(tr.next<c.currentTime+AU_LOOK&&n++<4){try{tr.next+=auBar(tr,tr.next)}catch(e){tr.next+=1}}}
function auMusic(k){const c=AU.ctx;if(!c)return;if(k&&!AU_TRACKS[k])k=null;const cur=AU.trk;if(cur&&cur.k===k)return;if(!cur&&!k)return;
 const quick=k==='battle'||k==='boss'||k==='eastBattle'||(cur&&(cur.k==='battle'||cur.k==='boss'||cur.k==='eastBattle'));
 if(cur)auTrackStop(cur,quick?1.2:AU_XF);AU.trk=k?auTrackStart(k,quick?1.4:AU_XF):null;if(AU.trk&&cur&&!quick)AU.trk.next+=.6;auSchedule()}

/* ---------- scene -> track and ambience (pure functions of a scene record, so the test can drive them) ---------- */
function auEastHere(){try{return typeof isEast==='function'&&typeof G!=='undefined'&&G&&G.p&&typeof W!=='undefined'&&W?!!isEast(G.p.x,G.p.y):false}catch(e){return false}}
function auScene(){const md=typeof mode==='undefined'?'title':mode,g=typeof G!=='undefined'?G:null,b=typeof B!=='undefined'?B:null,s={mode:md};
 if(md==='battle'&&b){s.boss=!!(b.boss&&b.boss.u&&b.boss.u.alive!==false);s.east=!!b.east;s.over=!!b.over;s.bio=b.bk||'plains';s.realm=!!(b.opts&&b.opts.realm)||/^(ashen|hollow|glass)$/.test(s.bio);return s}
 if(!g)return s;s.town=!!g.townOpen;s.east=auEastHere();try{s.crisis=typeof crisisOn==='function'?!!crisisOn():!!(g.crisis&&!g.crisis.ended)}catch(e){s.crisis=false}
 s.portal=!!g.portalRun;s.night=typeof nightK==='function'?nightK(g.hour||12)>=.5:(g.hour<6||g.hour>=20);
 try{s.bio=typeof weatherBiome==='function'&&typeof W!=='undefined'&&W?weatherBiome():'plains'}catch(e){s.bio='plains'}s.wx=g.weather&&g.weather.kind||'clear';s.moving=!!g.moving;return s}
function auTrackFor(s){s=s||{};if(s.mode==='title')return'title';
 if(s.mode==='battle'){if(s.over)return null;if(s.boss)return'boss';return s.east?'eastBattle':'battle'}
 if(s.mode!=='world')return'title';
 if(s.town)return s.east?'east':'town';if(s.crisis||s.portal)return'crisis';if(s.east)return'east';return s.night?'night':'day'}
function auAmbFor(s){s=s||{};if(s.mode==='title')return'title';if(s.mode==='battle')return'battle|'+(s.bio||'plains');if(s.mode!=='world')return'title';
 if(s.town)return'town|'+(s.night?'night':'day');return(s.bio||'plains')+'|'+(s.wx||'clear')+'|'+(s.night?'night':'day')}
// ambience: four looping noise beds (wind, rain, water, crowd) whose levels and filters glide to each key's targets
const AU_BIOW={plains:.3,forest:.18,hills:.5,swamp:.14,desert:.45,snow:.55,ashen:.5,hollow:.4,glass:.35};
function auAmbTargets(k){const p=String(k||'').split('|'),T={wind:.12,wf:420,rain:0,water:0,crowd:0};
 if(p[0]==='title'){T.wind=.14;T.wf=360;return T}
 if(p[0]==='town'){T.wind=.06;T.crowd=p[1]==='night'?.05:.2;return T}
 const bio=p[0]==='battle'?p[1]:p[0],wx=p[0]==='battle'?'clear':p[1];T.wind=(AU_BIOW[bio]!=null?AU_BIOW[bio]:.25)*(p[0]==='battle'?.6:1);T.wf=bio==='desert'?850:bio==='snow'?620:bio==='glass'?1100:420;
 if(bio==='swamp')T.water=.18;if(wx==='rain')T.rain=.32;if(wx==='storm'){T.rain=.5;T.wind*=1.6}if(wx==='sand'){T.wind*=1.8;T.wf=900}if(wx==='snow'){T.wind*=1.1;T.wf=520}if(wx==='fog')T.wind*=.6;
 T.wind=Math.min(.7,T.wind);return T}
function auAmbStart(){const c=AU.ctx;if(!c||AU.ambL)return;const mk=(ft,f,q)=>{const s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();s.buffer=AU.nb;s.loop=true;fl.type=ft;fl.frequency.value=f;fl.Q.value=q;g.gain.value=0;
  s.connect(fl);fl.connect(g);g.connect(AU.amb);s.start(0,auRand()*1.9);return{s,fl,g}};
 AU.ambL={wind:mk('lowpass',420,.9),rain:mk('bandpass',3200,.5),water:mk('lowpass',320,1.5),crowd:mk('bandpass',520,.8)}}
function auAmbApply(k,quick){const L=AU.ambL,c=AU.ctx;if(!L||!c)return;const T=auAmbTargets(k),t=c.currentTime,tc=quick?.4:1.4;
 L.wind.g.gain.setTargetAtTime(T.wind*.5,t,tc);L.wind.fl.frequency.setTargetAtTime(T.wf,t,tc);L.rain.g.gain.setTargetAtTime(T.rain*.3,t,tc);L.water.g.gain.setTargetAtTime(T.water*.4,t,tc);L.crowd.g.gain.setTargetAtTime(T.crowd*.9,t,tc);AU.ambT=T}
function auAmbDrift(){const L=AU.ambL,T=AU.ambT,c=AU.ctx;if(!L||!T||!c)return;const t=c.currentTime;   // gusts and murmurs: a new target every couple of seconds
 L.wind.g.gain.setTargetAtTime(T.wind*.5*auR(.55,1.35),t,1.6);L.wind.fl.frequency.setTargetAtTime(T.wf*auR(.7,1.5),t,1.8);if(T.crowd)L.crowd.g.gain.setTargetAtTime(T.crowd*.9*auR(.6,1.3),t,.8)}
function auAmbEvent(k){const p=String(k||'').split('|'),night=p[2]==='night'||p[1]==='night',r=auRand();
 if(p[0]==='title')return r<.5?'crackle':null;
 if(p[0]==='town')return night?(r<.3?'cricket':r<.38?'bell':null):(r<.25?'anvil':r<.35?'bell':r<.55?'bird':null);
 if(p[0]==='battle')return r<.12&&p[1]!=='snow'&&!/ashen|hollow|glass/.test(p[1])?'bird':/ashen|hollow|glass/.test(p[1])&&r<.2?'drip':null;
 const bio=p[0],wx=p[1];if(wx==='storm'&&r<.3)return'thunder';if(wx==='rain'||wx==='storm')return r<.5?'drip':null;
 if(night)return bio==='swamp'?(r<.5?'frog':null):bio==='forest'&&r<.2?'owl':bio==='snow'||bio==='desert'?null:r<.55?'cricket':null;
 if(bio==='swamp')return r<.4?'frog':r<.6?'bird':null;if(bio==='snow'||bio==='desert')return r<.12?'crow':null;
 return r<.6?'bird':r<.68?'crow':null}

/* ---------- the tick: scene changes, scheduler, ambience, world sounds, stingers. Called every 250 ms; allocates little. ---------- */
function auTick(){if(!AU.ctx||AU.hid)return;if(!auLive()){return}const c=AU.ctx,t=c.currentTime,s=auScene();
 if(s.mode==='battle'&&typeof FX!=='undefined'&&FX&&typeof FX.on==='function'&&!FX.on.auWrap)audioHookFx();
 const want=AU.forceM!==undefined?AU.forceM:auTrackFor(s);if(want!==AU.want){AU.want=want;AU.wantT=t}
 if((AU.trk?AU.trk.k:null)!==want&&t-AU.wantT>=(s.mode==='battle'||!AU.trk?0:.8))auMusic(want);
 auSchedule();
 const ak=AU.forceA!==undefined?AU.forceA:auAmbFor(s);if(ak!==AU.ambK){const q=!AU.ambK||s.mode==='battle';AU.ambK=ak;auAmbApply(ak,q)}
 if(t>=AU.ambNext){AU.ambNext=t+auR(2.5,6.5);auAmbDrift();const e=auAmbEvent(ak);if(e)auPlayAmb(e)}
 // marching across the world
 if(s.mode==='world'&&s.moving&&!s.town&&!(typeof sheetOpen!=='undefined'&&sheetOpen)){if(AU.stepNext<t)AU.stepNext=t+.05;
  const nm=s.bio==='snow'||s.wx==='snow'?'marchSnow':s.bio==='swamp'||s.wx==='rain'||s.wx==='storm'?'marchMud':'march';
  while(AU.stepNext<t+.5){auPlay(nm,{at:AU.stepNext-t,v:.85});AU.stepNext+=.38}}
 auWatch(s)}
function auWatch(s){const g=typeof G!=='undefined'?G:null,b=typeof B!=='undefined'?B:null;
 if(b&&b.over&&b.result&&AU.bRes!==b.result){AU.bRes=b.result;auPlay(b.result.win?'victory':'defeat',{at:.25})}
 if(!g){AU.crG=null;AU.lvG=null;return}
 if(AU.crG!==g){AU.crG=g;AU.cr=g.crowns|0}else{const d=(g.crowns|0)-AU.cr;AU.cr=g.crowns|0;if(d&&s.mode!=='battle'){if(d>0)auPlay(d>=60?'coins':'coin',{});else if(!s.moving)auPlay('spend',{})}}
 const R=g.roster||[];if(AU.lvG!==g){AU.lvG=g;AU.lv=Object.create(null);for(const m of R)AU.lv[m.id]=m.lvl|0;return}
 let up=false;for(const m of R){const p=AU.lv[m.id];if(p!=null&&(m.lvl|0)>p)up=true;AU.lv[m.id]=m.lvl|0}if(up)auPlay('levelup',{at:b&&b.over?1.6:0})}

/* ---------- UI: delegated listeners (clicks on buttons, tabs, closers), the first-gesture unlock, page visibility ---------- */
function auUiKind(el){if(!el||el.disabled)return null;const cl=el.classList,lab=String(el.getAttribute&&el.getAttribute('aria-label')||'')+' '+String(el.textContent||'').slice(0,24);
 if(el.getAttribute&&(el.getAttribute('role')==='tab'||el.getAttribute('role')==='radio'))return'tab';if(cl&&cl.contains('on')&&el.closest&&el.closest('.seg'))return null;
 if(cl&&(cl.contains('cp-x')||cl.contains('warn'))||/^\s*(close|cancel|back|no\b|keep it)/i.test(lab))return'cancel';
 if(el.closest&&el.closest('[role=tablist],.pn-rail,.seg,.thg'))return'tab';if(cl&&cl.contains('pri'))return'confirm';return'click'}
function auWire(){if(typeof document==='undefined'||!document.addEventListener)return;
 const g=()=>{if(AU.ctx&&AU.ctx.state==='running')return;auUnlock()};
 ['pointerdown','touchend','keydown','click'].forEach(ev=>{try{document.addEventListener(ev,g,{capture:true,passive:true})}catch(e){}});
 try{document.addEventListener('click',e=>{const el=e.target&&e.target.closest&&e.target.closest('button,[role=button],.pn-row,a[href]');if(!el)return;const k=auUiKind(el);if(k)auPlay(k,{})},true)}catch(e){}
 try{document.addEventListener('visibilitychange',()=>auHidden(document.hidden));if(typeof window!=='undefined'&&window.addEventListener){window.addEventListener('pagehide',()=>auHidden(true));window.addEventListener('pageshow',()=>auHidden(!!document.hidden))}}catch(e){}
 try{if(document.hidden)AU.hid=true}catch(e){}}
function auSheet(cls){if(/\bevt\b/.test(String(cls||'')))auPlay('event',{at:.05})}

const AUDIO={
 get ok(){return!!(AU.ctx&&AU.ok)},get live(){return auLive()},
 play(name,o){return auPlay(name,o||{})},
 music(k){AU.forceM=k===undefined?undefined:k;if(AU.ctx)auMusic(k===undefined?auTrackFor(auScene()):k);return AU.forceM},
 ambience(k){AU.forceA=k;if(AU.ctx){AU.ambK=k===undefined?'':k;if(k!==undefined)auAmbApply(k,true)}return AU.forceA},
 unlock:auUnlock,tick:auTick,apply:auApply,plan:auPlan,scene:auScene,trackFor:auTrackFor,ambFor:auAmbFor,sheet:auSheet,hook:audioHookFx,
 get track(){return AU.trk?AU.trk.k:null},SFX:AU_SFX,TRACKS:AU_TRACKS,MAP:AU_FXMAP};
auWire();
