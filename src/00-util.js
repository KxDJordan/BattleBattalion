const $=id=>document.getElementById(id);
/* Seeded game randomness. Every game rule draws from this one stream via rnd()/ri()/pick()/shuffle().
   The state is a single uint32 that save() writes into the save (G.rng) and continueGame() restores,
   so a loaded game continues the same stream. Tests call seedRng(n). Visual-only randomness
   (particles, shake) must use Math.random directly so it never disturbs this stream. */
let RNG_S=((Date.now()&0xffffffff)^Math.floor(Math.random()*4294967296))>>>0;
function rnd(){RNG_S=RNG_S+0x6D2B79F5|0;let t=Math.imul(RNG_S^RNG_S>>>15,1|RNG_S);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
function seedRng(n){RNG_S=(Number(n)||0)>>>0}
function rngState(){return RNG_S>>>0}
function setRngState(s){if(typeof s==='number'&&isFinite(s))RNG_S=s>>>0}
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1)),pick=a=>a[Math.floor(rnd()*a.length)],clamp=(v,a,b)=>v<a?a:v>b?b:v;
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}   // in place, seeded
/* Timing. SPEEDF scales every battle delay; SPEEDF=0 is instant mode: sleep() resolves without a timer,
   so a whole battle runs to completion in microtasks (headless tests, skip-animation). */
let SPEEDF=1;const sleep=ms=>SPEEDF>0?new Promise(r=>setTimeout(r,ms*SPEEDF)):Promise.resolve();
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;if(f>=0){r+=(255-r)*f;g+=(255-g)*f;b+=(255-b)*f}else{r*=1+f;g*=1+f;b*=1+f}return`rgb(${r|0},${g|0},${b|0})`}
function noiseFn(r,sc,n){const m=Math.ceil(n/sc)+2,g=[];for(let i=0;i<m*m;i++)g.push(r());return(x,y)=>{const fx=x/sc,fy=y/sc,ix=fx|0,iy=fy|0,tx=fx-ix,ty=fy-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),a=g[iy*m+ix],b=g[iy*m+ix+1],c=g[(iy+1)*m+ix],d=g[(iy+1)*m+ix+1];return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy}}
