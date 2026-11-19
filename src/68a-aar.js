/* ================= AFTER-ACTION REPORT =================
   The battle's own tally for every unit, kept as the blows land, and what the results sheet shows for each sword that fought.
   Rules (no draws, the seeded stream is untouched; hurt() and killUnit() of 60-battle-core.js and thorns in 25-legend.js call in):
     u.aar = {k, kx, ff, dmg, adm, taken, hits}
       k      killing blows on the other side;  kx  their worth: the xp each victim is worth to the company (foeXpOf)
       ff     killing blows on its own side (friendly fire; not rewarded)
       dmg    hitpoints taken off the other side (overkill not counted);  adm  armor and helmet points it stripped from them
       taken  hitpoints it lost, from any source;  hits  blows that landed on the other side
   The tally lives on the battle's units only: the game saves between battles (save() needs the world map), so nothing new is saved.
   Battle XP (resolveBattle, 68-battle-flow.js), a won battle only:
     pool  = sum over the foes of foeXpOf(e), x the drillmaster / origin factor (res.xpK)
     share = round(pool x AAR.base / survivors)                                  the base, the same for every survivor
     score = AAR.kill x min(1, kx / sum foeXpOf) + AAR.dmg x min(1, dmg / sum of the foes' max hitpoints)
     bonus = min(round(share x AAR.cap), round(pool x AAR.pool x score))           for each survivor
   so the company's bonuses together come to at most AAR.pool of the pool (when its swords did all the killing and all the damage), a
   sword that did nothing earns the base, and nobody earns more than (1 + AAR.cap) x the base. */
const AAR={base:1,pool:.2,kill:.5,dmg:.5,cap:1};
// What one foe on the field is worth to the company (the battle's xp, before the drillmaster): its kind, its rank, its elite marks.
function foeXpOf(e){if(!e)return 0;return Math.round((e.def&&e.def.xp||(e.m&&typeof rivalXP==='function'?rivalXP(e.m):0))*(1+XPRANK*Math.max(0,+e.rank||0))*(e.elite&&typeof eliteXpK==='function'?eliteXpK(e):1))}
function aarOf(u){if(!u.aar||typeof u.aar!=='object')u.aar={k:0,kx:0,ff:0,dmg:0,adm:0,taken:0,hits:0};return u.aar}
// a blow: src (may be null: bleeding, burning, terrain) took hp hitpoints and arm armor points off t
function aarHit(src,t,hp,arm){if(!t)return;hp=Math.max(0,+hp||0);arm=Math.max(0,+arm||0);if(hp>0)aarOf(t).taken+=hp;
 if(src&&src!==t&&src.side!==t.side&&(hp>0||arm>0)){const a=aarOf(src);a.dmg+=hp;a.adm+=arm;a.hits++}}
// a killing blow (killUnit): counted once per fallen unit
function aarKill(t,src){if(!t||t.aarK)return;t.aarK=1;if(!src||src===t)return;const a=aarOf(src);if(src.side!==t.side){a.k++;a.kx+=foeXpOf(t)}else a.ff++}
// The tally of unit u as the results sheet keeps it (plain numbers; a unit that never struck or was struck has zeros).
function aarStats(u){const a=u&&u.aar||{};return{k:a.k|0,kx:a.kx|0,ff:a.ff|0,dmg:Math.round(a.dmg||0),adm:Math.round(a.adm||0),taken:Math.round(a.taken||0),hits:a.hits|0}}
// The foes' side of the field, for the shares: their worth in xp and their hitpoints.
function aarFoeTotals(b){let xp=0,hp=0;for(const e of b.units)if(e.side!==0){xp+=foeXpOf(e);hp+=Math.max(0,+e.hpMax||0)}return{xp,hp}}
// One sword's score in [0, AAR.kill + AAR.dmg] and its bonus on a won battle (pool and share as resolveBattle has them).
function aarScore(st,tot){const k=tot.xp>0?Math.min(1,st.kx/tot.xp):0,d=tot.hp>0?Math.min(1,st.dmg/tot.hp):0;return AAR.kill*k+AAR.dmg*d}
function aarBonus(st,tot,pool,share){if(!(pool>0)||!(share>0))return 0;return Math.max(0,Math.min(Math.round(share*AAR.cap),Math.round(pool*AAR.pool*aarScore(st,tot))))}
// The level bar: the share of the way from level L to the next that xp x stands for (100 at the top level).
function aarPct(L,x){if(L>=MAXLV||!XPT[L+1])return 100;return clamp((x-XPT[L])/(XPT[L+1]-XPT[L])*100,0,100)}

/* ---- the results sheet: one card per sword that took the field ---- */
function aarNum(n){n=Math.round(+n||0);return n>=10000?(n/1000).toFixed(0)+'k':String(n)}
// the most valuable sword: the best score, needing a kill or a real share of the damage, and two or more swords on the field
function aarMvp(res){const L=(res.men||[]).filter(r=>r.st);if(L.length<2)return null;let best=null,bs=0;
 for(const r of L){const s=r.score||0;if(s>bs+1e-9||(Math.abs(s-bs)<=1e-9&&best&&r.st.k>best.st.k)){best=r;bs=s}}
 return best&&(best.st.k>0||bs>=.05)?best.id:null}
function aarCard(r,res,mvp){const u=typeof B!=='undefined'&&B&&B.units?B.units.find(u=>u.side===0&&u.m&&u.m.id===r.id):null,m=u?u.m:(G&&G.roster||[]).find(x=>x.id===r.id);
 const por=m&&typeof portraitHTML==='function'?portraitHTML(m,32):'',st=r.st||{k:0,dmg:0,adm:0,taken:0};
 const tag={down:['bad','Struck down'],dead:['dead','Dead'],withdrew:['dim','Withdrew'],fled:['warn','Fled']}[r.state];
 const ic=n=>typeof brIcon==='function'?brIcon(n):'';
 let xp='';if(r.xp){const X=r.xp,up=r.lvl>0;
  xp=`<span class="aar-xp${up?' up':''}"><span class="aar-xpn">${ic('xp')}<b>+${X.base}</b>${X.bonus>0?`<i class="aar-bon" title="Bonus for kills and damage">+${X.bonus}</i>`:''}${up?`<em>Level ${r.lvl}</em>`:''}</span>`+
   `<span class="aar-bar" title="${up?'Level '+r.lvl:''}"><i class="was" style="width:${up?0:Math.round(X.p0)}%"></i><i class="now" style="left:${up?0:Math.round(X.p0)}%;width:${Math.max(0,Math.round(X.p1-(up?0:X.p0)))}%"></i></span></span>`}
 else if(res.win&&r.state==='dead')xp='<span class="aar-xp none">No xp: fell in the battle</span>';
 const bits=[];if(r.state==='down')bits.push('Lives, at 1 hitpoint');if(r.shield)bits.push(`<span class="br-w">${ic('shield')}shield lost</span>`);
 if(r.arm||r.helm)bits.push(`<span class="br-w">${r.arm?ic('armor')+'−'+r.arm:''}${r.helm?ic('helmet')+'−'+r.helm:''}</span>`);
 const inj=(r.inj||[]).map(j=>`<span class="br-inj aar-inj">${typeof cpInjIcon==='function'?cpInjIcon(j.id):''}<b>${j.n}</b> <small>${j.d}${j.perm?', for good':j.days>0?', '+j.days+' day'+(j.days===1?'':'s'):''}</small></span>`).join('');
 const opens=r.lvl&&typeof brOpens==='function'?brOpens(r.from!=null?r.from:r.lvl-1,r.lvl).map(t=>`<span class="br-tier">${ic(/Weapon/.test(t)?'swords':'level')}${t}</span>`).join(''):'';
 return`<div class="aar-c ${r.state}${r.id===mvp?' mvp':''}${r.lvl?' lvup':''}">${por}<div class="aar-b">`+
  `<span class="br-nm"><b>${r.name}</b>${r.id===mvp?'<em class="mvp" title="Most valuable: kills and damage">MVP</em>':''}${tag?`<em class="${tag[0]}">${tag[1]}</em>`:''}</span>`+
  `<span class="aar-st"><span title="Killing blows">${ic('skull')}<b>${st.k}</b> kill${st.k===1?'':'s'}</span><span title="Hitpoints dealt${st.adm?', and armor stripped':''}">${ic('swords')}<b>${aarNum(st.dmg)}</b> dmg${st.adm?` <small>+${aarNum(st.adm)} arm</small>`:''}</span><span class="tk" title="Hitpoints lost">${ic('hp')}−${aarNum(st.taken)}</span></span>`+
  xp+(bits.length?`<span class="br-bits">${bits.join(' ')}</span>`:'')+opens+inj+`</div></div>`}
function aarHTML(res){const L=res.men||[];if(!L.length)return'';const mvp=aarMvp(res);
 const tk=L.reduce((n,r)=>n+(r.st?r.st.k:0),0),bon=L.reduce((n,r)=>n+(r.xp?r.xp.bonus:0),0);
 const head=`<div class="aar-h"><span>${L.length===1?'The sword':'The '+L.length+' swords'} who fought</span><small>${tk} kill${tk===1?'':'s'}${res.win&&bon>0?` · bonus xp for kills and damage: ${bon}`:''}</small></div>`;
 return`<div class="aar">${head}<div class="aar-g">${L.map(r=>aarCard(r,res,mvp)).join('')}</div></div>`}
