/* ================= INSPECT =================
   Long-press (touch) / right-click (mouse) tooltip card for units, tiles, towns, bands and rifts.
   Public: Inspect.show(html,x,y,touch) Inspect.hide() Inspect.release() Inspect.visible  inspectAt(sx,sy,touch) */
const Inspect={el:null,visible:false,timer:0,
 show(html,x,y,touch){let el=this.el;if(!el){el=this.el=document.createElement('div');el.id='inspect';el.setAttribute('role','tooltip');($('app')||document.body).appendChild(el)}
  clearTimeout(this.timer);el.innerHTML=html;el.classList.toggle('wide',html.indexOf('ins-c2')>=0);el.classList.add('on');this.visible=true;
  const w=el.offsetWidth,h=el.offsetHeight,vw=window.innerWidth,vh=window.innerHeight,gap=touch?38:18,m=6;
  const sl=typeof SR!=='undefined'?Math.max(m,SR.x+4):m,sr=typeof SR!=='undefined'?Math.min(vw-m,SR.x+SR.w-4):vw-m;
  // beside the finger, never under the hand: inside the scene if it fits, else over a rail, else above/below
  let left,top=y-h*.62;
  if(x+gap+w<=sr)left=x+gap;else if(x-gap-w>=sl)left=x-gap-w;else if(x+gap+w<=vw-m)left=x+gap;else if(x-gap-w>=m)left=x-gap-w;
  else{left=clamp(x-w/2,m,Math.max(m,vw-m-w));top=y-h-gap>=m?y-h-gap:y+gap}
  el.style.left=Math.round(left)+'px';el.style.top=Math.round(clamp(top,m,Math.max(m,vh-m-h)))+'px'},
 hide(){clearTimeout(this.timer);if(this.el)this.el.classList.remove('on');this.visible=false;insK=-1;insW=null},
 release(){clearTimeout(this.timer);if(this.visible)this.timer=setTimeout(()=>this.hide(),2400)}};
const insBar=(cls,v,mx,lab)=>`<div class="ins-bar ${cls}"><i style="width:${clamp(mx?v/mx*100:0,0,100)}%"></i><span>${lab} ${v}/${mx}</span></div>`;
const insStat=(v,l)=>`<div><b>${v}</b>${l}</div>`;
function buffText(b){const p=[];if(b.dmg)p.push('+'+Math.round(b.dmg*100)+'% damage');if(b.dr)p.push('−'+Math.round(b.dr*100)+'% damage taken');if(b.ms)p.push('+'+b.ms+' melee');if(b.rs&&b.rs!==b.ms)p.push('+'+b.rs+' ranged');
 if(b.md)p.push('+'+b.md+(b.rd===b.md?' defense':' melee def'));if(b.rd&&b.rd!==b.md)p.push('+'+b.rd+' ranged def');if(b.indom)p.push('cannot be pushed');return(p.join(', ')||'Empowered')+(b.dur?' · '+b.dur+(b.dur===1?' turn':' turns'):'')}
/* ---- battle cards ----
   unit: hitpoints, head and body armor, shield, gifts; morale with resolve and what it does; the six numbers; weapon; then, in a
   second column when there is anything to say: statuses with their rule text (STATUS), injuries, and what the unit can do
   (every ability with its description, plus an enemy's standing traits), so a faction's tricks can be read before they land.
   tile: ground, height, movement cost, and from the acting unit: the line of fire to it (clear, bodies in the way, blocked),
   a telegraphed attack about to land there, a body a necromancer could raise. */
const INS_ROLE={line:'Line fighter',flanker:'Flanker',guard:'Guard',sniper:'Marksman',caster:'Caster',beast:'Beast',boss:'Tyrant'};
const insIc=(n,sz)=>typeof pxIcon==='function'?pxIcon(n,sz||16):'';
const insSt=(k,v)=>{const n={hp:'hitpoints',fat:'stamina',init:'initiative',ms:'melee',rs:'ranged',md:'melee def',rd:'ranged def',brv:'resolve',dmg:'damage'}[k]||k;return(v>0?'+':'−')+(k==='dmg'?Math.round(Math.abs(v)*100)+'%':Math.abs(v))+' '+n};
function insAbCost(a,u){const p=[];if(a.ap!=null)p.push(a.ap+' AP');else if(a.wpn&&u.wpn)p.push(u.wpn.ap+' AP');if(a.cost)p.push(a.cost[1]+' '+RESN[a.cost[0]]);if(a.rng>1)p.push('range '+a.rng);if(a.cd)p.push('every '+(a.cd+1)+' turns');if(a.uses)p.push(a.uses+'× a battle');return p.join(' · ')}
function insAbs(u){let h='';const seen={};for(const id of u.abs||[]){const a=AB[id];if(!a||seen[id]||a.tele===2)continue;seen[id]=1;const d=a.d||(typeof abDesc==='function'?abDesc(id,u):'');
  h+=`<div class="ins-ab">${insIc('ab-'+id)}<div><b>${a.n}</b><i>${insAbCost(a,u)}</i>${d?`<span>${d}</span>`:''}</div></div>`}return h}
function insTraits(u){const d=u.def||{},L=[],S=k=>typeof STATUS==='object'&&STATUS&&STATUS[k];
 if(u.fearless)L.push(['resolve','Fearless','Never tests morale: it does not waver, break or run.']);
 if(d.pack&&S('pack'))L.push(['st-pack','Pack hunter',S('pack').d+(S('harried')?' Prey with two or more at its throat is '+S('harried').n.toLowerCase()+'.':'')]);
 if(d.wall&&S('bonewall'))L.push(['st-bonewall',S('bonewall').n,S('bonewall').d]);
 if(d.tire&&S('winded'))L.push(['st-winded','Tires','Heavy blows wear it out. Once '+S('winded').n.toLowerCase()+': '+S('winded').d.replace(/^[^:]*:\s*/,'')]);
 if(d.enrage&&S('enrage'))L.push(['st-enrage','Enrages','Below '+Math.round(d.enrage*100)+'% hitpoints: '+S('enrage').d.replace(/^[^:]*:\s*/,'')]);
 if(d.kb||u.kbN)L.push(['ab-shove','Brute','Its blows can knock a foe back '+(d.kb||u.kbN)+(d.kbCh?' ('+Math.round(d.kbCh*100)+'%)':'')+'.']);
 if(u.onhit&&u.onhit.root)L.push(['root','Entangles','A hit may root its prey ('+Math.round(u.onhit.ch*100)+'%).']);
 if(u.noHead)L.push(['helmet','No head to hit','Every blow lands on the body.']);
 if(d.size>1||u.sz>1)L.push(['ab-wbuffet','Huge','Stands on 2×2 tiles: reach it from any side of its footprint. It cannot be knocked back or dragged.']);
 else if(d.kbImm)L.push(['ab-oslam','Immovable','Too heavy to knock back or drag.']);
 if(d.fly||u.fly)L.push(['st-diving','Flies','Moves over height steps, trees and rocks. A root grounds it for 2 turns: no flight, no dive.'+(u.st&&u.st.grounded>0?' <b class="ins-bad">Grounded now.</b>':'')]);
 if(d.fireWeak)L.push(['burn','Weak to fire','Fire and burning do +'+Math.round(d.fireWeak*100)+'% damage to it'+(d.regen?', and burning stops its regrowth':'')+'.']);
 if(d.regen)L.push(['st-regrow','Regrows','Regains '+Math.round(d.regen*100)+'% of its hitpoints at the start of each of its turns, unless it is burning.']);
 if(d.serp)L.push(['st-venom','Venomous','Its bites poison: hitpoints lost each turn, through armor.']);
 if(d.endgame)L.push(['star','Legendary','A famed item lies in its hoard: it drops for certain.']);
 if(u.flags&&u.flags.berserk)L.push(['enraged','Berserk','Regains 4 AP on a kill, once a turn.']);
 return L.map(x=>`<div class="ins-ab">${insIc(x[0])}<div><b>${x[1]}</b><span>${x[2]}</span></div></div>`).join('')}
/* ---- arms and talents (mercs): weapon in hand and backup, shield raised or slung, gift variant, trees, learned perks ---- */
function insWn(w){return w?(w.n||w.wt||'Weapon'):'Bare hands'}
const INS_WT={sword:'Sword',axe:'Axe',mace:'Mace',dagger:'Dagger',spear:'Spear',bow:'Bow',staff:'Staff',fist:'Unarmed',hammer:'Hammer',polearm:'Polearm',greatsword:'Greatsword',crossbow:'Crossbow',flintlock:'Flintlock'};
// the weapon's family and what sets it apart: reach over the front rank, armor pierce, reload
function insWl(w){if(!w||!w.d)return'';const L=[`${w.d[0]}–${w.d[1]} dmg`];if(w.rng>1)L.push((typeof shRangedW==='function'&&shRangedW(w)?'range ':'reach ')+w.rng);if(w.two)L.push('two-handed');
 if((w.ign||0)>=.35)L.push(Math.round(w.ign*100)+'% armor pierce');if(w.reload)L.push('reload '+(w.reload.ap|0)+' AP');
 const x=w.rng===2&&!(typeof shRangedW==='function'&&shRangedW(w))?' Strikes over the front rank (not through walls).':'';return L.join(' · ')+(x?`<br>${x.trim()}`:'')}
function insArms(u){const sh=typeof shHand==='function'?shHand(u):u.wpn,al=typeof shAlt==='function'?shAlt(u):null,ic=w=>typeof shWIcon==='function'?shWIcon(w):'sword';let h='';
 const ld=w=>{const L=typeof shLoaded==='function'?shLoaded(u,w):null;return L===null?'':L?' · <span class="ins-good">loaded</span>':' · <span class="ins-bad">unloaded</span>'},fam=w=>w&&w.wt&&INS_WT[w.wt]&&INS_WT[w.wt]!==insWn(w)?INS_WT[w.wt].toLowerCase()+' · ':'';
 if(al||u.side===0||(sh&&(sh.reload||sh.rng===2))){h+=`<div class="ins-ab">${insIc(ic(sh))}<div><b>${insWn(sh)}</b><i>${fam(sh)}in hand${ld(sh)}</i><span>${insWl(sh)}</span></div></div>`;
  if(al)h+=`<div class="ins-ab ins-alt">${insIc(ic(al))}<div><b>${insWn(al)}</b><i>${fam(al)}backup${ld(al)}${AB.swap?' · swap '+(typeof swapCost==='function'&&B&&B.cur===u?(swapCost(u)<=0?'free':swapCost(u)+' AP'):(AB.swap.ap|0)+' AP'):''}</i><span>${insWl(al)}</span></div></div>`}
 if(u.shpMax>0&&(u.shield||u.slung)){const sl=typeof shSlung==='function'&&shSlung(u),it=typeof shShieldItem==='function'?shShieldItem(u):null,nm=typeof shShieldName==='function'?shShieldName(u):'Shield',
   ty=it&&it.look&&typeof SH_LOOK==='object'&&SH_LOOK[it.look]&&SH_LOOK[it.look]!==nm?SH_LOOK[it.look].toLowerCase()+' · ':'',st=it&&(it.md||it.rd)?` · +${it.md|0} melee def, +${it.rd|0} ranged def`:'',sk=it&&Array.isArray(it.sk)?it.sk.filter(id=>AB[id]).map(id=>AB[id].n).join(', '):'';
  h+=`<div class="ins-ab">${insIc(sl?'slung':typeof shShieldIcon==='function'?shShieldIcon(u):'shield')}<div><b>${nm}</b><i>${ty}${sl?'slung':'raised'} · ${u.shp}/${u.shpMax}</i><span>${sl?'On the back while a two-handed weapon is in hand: no defence, no shield skills.':'Raised'+st+'.'+(sk?' Skills: '+sk+'.':'')}</span></div></div>`}
 if(typeof shLocked==='function'&&shLocked(u))h+=`<div class="ins-ab ins-s bd">${insIc('ranged-lock')}<div><b>Ranged lock</b><span>An enemy is adjacent: no shots until it falls or ${u.side===0?'this sword steps':'it steps'} away.</span></div></div>`;
 return h}
function insAbChips(u){const L=[];for(const id of u.abs||[]){const a=AB[id];if(!a||L.includes(id))continue;L.push(id)}if(!L.length)return'';
 return`<div class="ins-trees">${L.map(id=>`<span title="${AB[id].d||''}">${insIc('ab-'+id)}<b>${AB[id].n}</b></span>`).join('')}</div>`}
function insPerkFx(p){if(!p)return'';if(p.d)return p.d;const L=[];if(p.st)for(const k in p.st)L.push(insSt(k,p.st[k]));if(p.res)L.push('+'+p.res+' pool');if(p.regen)L.push('+'+p.regen+' regeneration');return L.join(', ')}
function insTalents(m){if(!m)return'';let h='';const T=typeof MAST==='object'&&MAST?MAST:{};
 let trees=[];try{if(typeof mercTrees==='function')trees=mercTrees(m)||[]}catch(e){}if(!trees.length&&Array.isArray(m.trees))trees=m.trees.map(k=>({key:k,tree:T[k]}));
 const gk=m.gift||(typeof giftVariant==='function'?(()=>{try{const g=giftVariant(m);return typeof g==='string'?g:g&&g.key}catch(e){return null}})():null);
 if(gk&&T[gk]){const G_=T[gk],res=G_.res,sty=G_.style;h+=`<div class="ins-ab">${insIc('m-'+gk)}<div><b>${G_.n}</b><i style="color:${RESC[res]||'inherit'}">${RESN[res]||''}${sty?' · '+sty:''}</i><span>${G_.d||''}</span></div></div>`}
 if(trees.length)h+=`<div class="ins-trees">${trees.filter(x=>x&&x.key!==gk).map(x=>`<span title="${(x.tree||T[x.key]||{}).n||x.key}">${insIc('m-'+x.key)}<b>${((x.tree||T[x.key]||{}).n||x.key)}</b></span>`).join('')}</div>`;
 const P=Array.isArray(m.perks)?m.perks:[];
 for(const id of P){let r=null;try{r=typeof perkById==='function'?perkById(id):null}catch(e){}const p=r&&r.perk;if(!p)continue;const icn=p.ab&&AB[p.ab]?'ab-'+p.ab:'perk-'+id;
  h+=`<div class="ins-ab ins-pk" title="${(r.tree&&r.tree.n||'')+(r.tier?' tier '+r.tier:'')}">${insIc(icn)}<div><b>${p.n}</b><span>${insPerkFx(p).replace(/^Ability:\s*/,'')}</span></div></div>`}
 return h}
function unitCard(u){const pl=u.side===0,m=u.m,d=u.def||{},cur=B.cur,tl=T(u),mor=typeof shMor==='function'?shMor(u):-1,brv=typeof shBrv==='function'?shBrv(u):null;
 let h=`<div class="ins-h"><b class="ins-n">${u.name}</b><span class="ins-tag ${pl?'ally':'foe'}">${pl?'Level '+u.lvl:FACT[u.f]?FACT[u.f].n:'Foe'}</span></div>`;
 h+=`<div class="ins-sub">${pl&&m?RACE[m.race].n+' '+BG[m.bg].n.toLowerCase():(d.boss?(d.endgame?'Apex beast':'Tyrant'):INS_ROLE[u.role||d.role]||(d.big?'Huge':d.quad?'Beast':u.spell?'Caster':u.wpn.rng>1?'Ranged':'Melee'))+(d.size>1||u.sz>1?' · huge, 2×2':d.big&&!d.boss?' · huge':'')}${u===cur?' · acting now':''}</div>`;
 h+=insBar('hp',u.hp,u.hpMax,'HP');if(u.helmMax>0)h+=insBar('arm hd',u.helm,u.helmMax,'Head armor');if(u.armMax>0)h+=insBar('arm',u.arm,u.armMax,'Body armor');
 if(u.shpMax>0)h+=u.shield||u.slung?insBar('arm sh',u.shp,u.shpMax,u.slung?'Shield (slung)':'Shield'):`<div class="ins-bar arm sh"><span class="ins-bad">Shield split</span></div>`;
 for(const k in u.res)h+=`<div class="ins-bar res"><i style="width:${u.res[k].cur/u.res[k].max*100}%;background:${RESC[k]}"></i><span>${RESN[k]} ${u.res[k].cur}/${u.res[k].max}</span></div>`;
 if(mor>=0){const F=typeof MORFX==='object'&&MORFX&&MORFX[mor]||{hit:0,def:0},fx=F.hit||F.def?` · ${F.hit>0?'+':'−'}${Math.abs(F.hit)} to hit, ${F.def>0?'+':'−'}${Math.abs(F.def)} defense`:'';
  h+=`<div class="ins-mor m${mor}">${insIc('morale-'+mor)}<b>${shMorN(mor)}</b><span>${brv!=null?'resolve '+brv:''}${fx}</span></div>`}
 else if(u.fearless)h+=`<div class="ins-mor">${insIc('resolve')}<b>Fearless</b><span>never tests morale</span></div>`;
 h+='<div class="ins-grid">'+insStat(eff(u,'ms'),'Melee')+insStat(eff(u,'rs'),'Ranged')+insStat(u.init,'Initiative')+insStat(eff(u,'md'),'Melee def')+insStat(eff(u,'rd'),'Ranged def')+insStat(u===cur?u.ap+'/'+u.apMax:u.apMax,'AP')+'</div>';
 const w=u.wpn;h+=`<div class="ins-line"><span>${pl?w.n:u.spell?u.spell.n:'Attack'}</span><b>${u.spell?u.spell.d[0]+'–'+u.spell.d[1]:w.d[0]+'–'+w.d[1]} dmg${(u.spell?u.spell.rng:w.rng)>1?' · range '+(u.spell?u.spell.rng:w.rng):''}</b></div>`;
 if(u.fatMax<999)h+=`<div class="ins-line"><span>Fatigue</span><b>${u.fat}/${u.fatMax}</b></div>`;
 // second column: statuses, injuries, abilities and traits
 let r='';const L=typeof shStatuses==='function'?shStatuses(u):[];
 for(const x of L){const S=shStatus(x.key)||{n:x.key,d:'',good:0};r+=`<div class="ins-ab ins-s ${S.good?'gd':'bd'}">${insIc('st-'+x.key)}<div><b>${S.n}</b><i>${x.turns>0?x.turns+(x.turns===1?' turn':' turns'):''}</i>${S.d?`<span>${S.d}</span>`:''}</div></div>`}
 for(const b of u.buffs||[])if(!b.key&&!b.foe&&!b.indom)r+=`<div class="ins-ab ins-s gd">${insIc('buff')}<div><b>Bolstered</b><span>${buffText(b)}</span></div></div>`;
 if(m&&Array.isArray(m.inj)&&typeof INJ==='object')for(const j of m.inj){const I=INJ[j.id];if(!I)continue;r+=`<div class="ins-ab ins-s bd">${insIc('inj-'+j.id)}<div><b>${I.n}</b><i>${j.days<0?'permanent':j.days+(j.days===1?' day':' days')}</i><span>${Object.keys(I.st||{}).map(k=>insSt(k,I.st[k])).join(', ')}</span></div></div>`}
 const arms=insArms(u);if(arms)r+=`<div class="ins-hd">Arms</div>`+arms;
 if(pl&&m){const tl=insTalents(m);if(tl)r+=`<div class="ins-hd">Talents</div>`+tl}
 const ab=pl&&m?insAbChips(u):insAbs(u),tr=pl?'':insTraits(u);if(ab||tr)r+=`<div class="ins-hd">${pl?'Abilities':'What it does'}</div>`+tr+ab;
 let note=`Stands on ${tileName(tl).toLowerCase()}, height ${tl.h}.`;
 if(!pl&&cur&&cur.side===0&&cur.alive&&!B.auto){const a=abilityInfo(cur,B.sel||'attack');if(a.tgt==='enemy'){const dist=mdist(cur,u),los=typeof shLos==='function'?shLos(cur,u,a):null;
   note=(dist>a.rng?`Out of reach of ${cur.name}'s ${a.n} (${dist} tiles, reach ${a.rng}).`:los&&los.blocked?`<b class="ins-bad">No line of fire</b> from ${cur.name}: something stands in the way.`
    :`<b class="ins-hit">${hitChance(cur,u,a)}%</b> to hit with ${a.n} from ${cur.name}${los&&los.cover?` (${los.cover} in the way: −${los.cover*(typeof COVERPEN==='number'?COVERPEN:15)})`:''}.${los&&los.ff&&los.ff.length?` <span class="ins-bad">A miss can stray into ${los.ff.map(x=>x.name).join(', ')}.</span>`:''}`)+' '+note}}
 const tele=B.tele&&B.tele.find(x=>x.u===u);if(tele)note=`<b class="ins-bad">${tele.n||'An attack'} lands on the marked tiles at the start of its next turn.</b> `+note;
 note=`<div class="ins-note">${note}</div>`;
 return r?`<div class="ins-c2"><div class="ins-col">${h}${note}</div><div class="ins-col ins-r">${r}</div></div>`:h+note}
function tileName(t){return t.t==='block'?(B.P.obj==='tree'?'Trees':B.P.obj==='crystal'?'Crystal spire':'Boulder'):t.t==='rough'?'Rough ground':t.t==='haz'?'Burning ground':'Open ground'}
function tileCard(k){const t=B.tiles[k],u=B.cur,c=k%BW,r=(k/BW)|0;let h=`<div class="ins-h"><b class="ins-n">${tileName(t)}</b><span class="ins-tag">Height ${t.h}</span></div><div class="ins-sub">${B.P.n}</div>`;
 const L=[];if(t.t==='block')L.push('Blocks movement and every line of fire.');else if(t.t==='rough')L.push('Costs 1 extra AP to enter.');else if(t.t==='haz')L.push('<span class="ins-bad">12 damage</span> to anyone who enters or starts a turn here.');else L.push('2 AP to enter.');
 if(B.tele)for(const x of B.tele)if(x&&x.keys&&x.keys.indexOf(k)>=0&&x.u&&x.u.alive)L.push(`<b class="ins-bad">Danger:</b> ${x.u.name}'s ${(x.n||'attack').toLowerCase()} lands here at the start of its next turn.`);
 if(B.corpses&&B.corpses.some(x=>x.c===c&&x.r===r))L.push('A body lies here. A necromancer can raise it.');
 if(t.t!=='block'){if(u&&u.alive){const dh=t.h-T(u).h;if(dh>0)L.push(`${dh} above ${u.name}: stepping up costs 1 extra AP${dh>1?', and a climb of 2 is too steep':''}.`);else if(dh<0)L.push(`${-dh} below ${u.name}.`)}
  L.push('Higher ground gives +10 to hit and +10% damage.');
  if(u&&u.side===0&&!B.busy&&!B.auto&&B.reach){const q=B.reach.get(k);if(q&&q.cost)L.push(`<b class="ins-hit">${q.cost} AP</b> for ${u.name} to move here (has ${u.ap}).`);else if(k!==key(u.c,u.r))L.push(`Out of ${u.name}'s reach this turn.`)
   const P=typeof planOK==='function'?planOK():null,I=P&&P.k===k&&typeof planInfo==='function'?planInfo():null;
   if(I){const n=I.atk?I.atk.size:0,off=Object.keys(I.ab).filter(id=>I.ab[id].why);L.push(`<b class="ins-hit">Planned move</b>: ${P.left} AP left, ${n?n+(n===1?' foe':' foes')+' in reach':'no foe in reach'} from here.${off.length?' Not possible after it: '+off.map(id=>{try{return abilityInfo(u,id).n}catch(e){return id}}).join(', ')+'.':''}`)}}
  // the line of fire from the acting unit to whoever would stand here
  if(u&&u.alive&&u.side===0&&typeof losInfo==='function'&&k!==key(u.c,u.r)){try{const a=abilityInfo(u,B.sel&&AB[B.sel]&&AB[B.sel].tgt==='enemy'?B.sel:'attack'),d=Math.abs(c-u.c)+Math.abs(r-u.r);
    if(a.rng>1&&d>1){const los=losInfo(u,{c,r},a),pen=typeof COVERPEN==='number'?COVERPEN:15;
     L.push(`${insIc(los.blocked?'los-blocked':los.cover?'cover':'ranged')} Line of fire from ${u.name}${d>a.rng?' (out of range, '+d+' tiles)':''}: `+(los.blocked?'<b class="ins-bad">blocked</b>.':los.cover?`<b class="ins-hit">${los.cover} in the way</b>, −${los.cover*pen} to hit.`:'<span class="ins-good">clear</span>.')
      +(los.ff&&los.ff.length?` <span class="ins-bad">A miss can stray into ${los.ff.map(x=>x.name).join(', ')}.</span>`:''))}}catch(e){}}}
 return h+L.map(s=>`<div class="ins-note">${s}</div>`).join('')}
function battlePick(mx,my){return unitAtBoard(mx,my)}
/* world card: what the player can see at a world point (never what the fog hides) */
const WSIZE=['','Hamlet','Town','City'];
function worldCard(wx,wy){const k=worldPick(wx,wy,true);if(!k)return'';const p=G.p,L=[],note=()=>L.map(s=>s?`<div class="ins-note">${s}</div>`:'').join('');insW={x:k.x,y:k.y,r:k.r};
 const hrs=(x,y)=>{let h=Math.hypot(x-p.x,y-p.y)/(TS*1.2)*.8;if(typeof routeTo==='function'){const r=routeTo(x,y);if(!r)return'';h=r.hours}return h<.6?'':'About '+(h<1.5?'an hour':Math.round(h)+' hours')+' away.'};
 const wx_=worldReadout(),sky=wx_.weather==='clear'?'':wx_.label+(typeof weatherFx==='function'&&weatherFx().spd<1?': marching at '+Math.round(weatherFx().spd*100)+'%, sight cut short.':'.');
 if(k.type==='town'){const t=k.o,i=k.i,c=G.contract,sz=(typeof TOWNKIND==='object'&&TOWNKIND&&TOWNKIND[t.size])||WSIZE[t.size]||'Town';
  if(c&&c.type==='deliver'&&c.to===i)L.push('<span class="ins-good">Your delivery is due here.</span>');else if(c&&c.town===i)L.push(c.type==='hunt'&&c.done?'<span class="ins-good">Your pay is waiting here.</span>':'Your contract was posted here.');
  if(!k.seen)L.push('Known by name only: the company has not laid eyes on it yet.');
  L.push(Math.hypot(t.x-p.x,t.y-p.y)<TS*.12?'You are at the gates. Tap to enter.':hrs(t.x,t.y)+' Tap to march there.');
  return`<div class="ins-h"><b class="ins-n">${t.name}</b><span class="ins-tag ally">${sz}</span></div><div class="ins-sub">${t.size===1?'Contracts, a small market, an inn':t.size===3?'Contracts, tavern, great market, inn':'Contracts, tavern, market, inn'}</div>`+note()}
 if(k.type==='portal'){const q=k.o;return`<div class="ins-h"><b class="ins-n">Rift</b><span class="ins-tag rift">${BIO[q.realm].n.replace(/^The /,'')}</span></div><div class="ins-sub">A tear into ${BIO[q.realm].n}</div><div class="ins-note">Three battles with no rest between them, and a tyrant at the end.</div><div class="ins-note">${hrs(q.x,q.y)}</div>`}
 if(k.type==='lair'){const c=k.o;return`<div class="ins-h"><b class="ins-n">${c.title||'Contract'}</b><span class="ins-tag foe">${'☠'.repeat(c.diff||1)}</span></div><div class="ins-sub">Contract target · ${FACT[c.f].n}</div><div class="ins-note">Worth <span class="ins-gold">${c.pay} crowns</span>, paid in ${G.towns[c.town].name}.</div><div class="ins-note">${k.vis?'':'Out of sight for now. '}${hrs(c.x,c.y)}</div>`}
 if(k.type==='band'){const e=k.o,F=FACT[e.f],d=Math.hypot(e.x-p.x,e.y-p.y),st=typeof partyStrength==='function'?partyStrength(e):e.mult<.8?1:e.mult<1?2:3,sight=typeof bandSight==='function'?bandSight():3.75*TS;
  return`<div class="ins-h"><b class="ins-n">${F.n}</b><span class="ins-tag foe">Hostile</span></div><div class="ins-sub">${st===1?'A small band, weaker than the company':st===2?'A warband, about an even match':'A large host, stronger than the company'}</div><div class="ins-note">${G.grace>0?'They keep their distance for now.':e.ch||d<sight?'They have seen you and are closing.':'They have not noticed you yet.'}</div><div class="ins-note">Fights with: ${F.units.map(x=>EN[x[0]].n.toLowerCase()).join(', ')}.</div>`}
 if(k.type==='company'){const tt=tileAt(p.x,p.y);if(sky)L.push(sky);L.push(G.contract?'Under contract: '+(G.contract.title||'yes')+'.':'No contract held.');
  return`<div class="ins-h"><b class="ins-n">Your company</b><span class="ins-tag ally">${G.roster.length} swords</span></div><div class="ins-sub">Day ${G.day} · ${WNAME[tt].toLowerCase()}</div><div class="ins-note"><span class="ins-gold">${G.crowns} crowns</span> · ${G.food} food · renown ${G.renown}</div>`+note()}
 if(k.type==='site'){const o=k.o,R=typeof RUINS==='object'&&RUINS&&RUINS[(o.n|0)%RUINS.length];return`<div class="ins-h"><b class="ins-n">${R&&R[0]||'Ruin'}</b><span class="ins-tag">Ruin</span></div><div class="ins-sub">${o.v?'Visited':'Old stones, not yet visited'}</div><div class="ins-note">${hrs(o.x,o.y)} Tap to march there.</div>`}
 if(!k.seen)return`<div class="ins-h"><b class="ins-n">Unexplored</b><span class="ins-tag">Unknown</span></div><div class="ins-note">No one in the company has seen this land. March to its edge to learn what lies there.</div>`;
 const i=k.ty*WN+k.tx,tt=W.tiles[i],ok=okAt(wx,wy),bk=BIOKEY[tt],rv=W.river?W.river[i]:0,rd=W.road?W.road[i]:0,sp=typeof speedAt==='function'?speedAt(wx,wy):SPD[tt];
 const feat=rv&&rd?'Bridge':rd?'Road':rv&&tt?'River':'';
 if(rv&&rd)L.push('A road crosses the river here: no delay at the bridge.');else if(rd)L.push('A road: the fastest way over any ground.');else if(rv&&tt)L.push('A river with no bridge: slow to ford.');
 if(ok&&bk)L.push('Battles here are fought on '+BIO[bk].n.toLowerCase()+' ground.');else if(!ok)L.push(tt===0?'No crossing without a ship.':tt===4?'The peaks cannot be crossed.':'Cut off from the mainland.');
 if(ok)L.push(hrs(wx,wy));if(sky&&worldVisible(wx,wy))L.push(sky);
 return`<div class="ins-h"><b class="ins-n">${WNAME[tt]}${feat?' · '+feat:''}</b><span class="ins-tag">${ok?'March '+Math.round(sp*100)+'%':'Impassable'}</span></div>`+note()}
function inspectAt(sx,sy,touch){if(sheetOpen)return false;let h='';insK=-1;insW=null;
 if(mode==='battle'&&B){const p=boardXY(sx,sy),u=battlePick(p.x,p.y);if(u){h=unitCard(u);insK=key(u.c,u.r)}else{const k=tileAtBoard(p.x,p.y);if(k>=0){h=tileCard(k);insK=k}}}
 else if(mode==='world'&&G&&W){const w=worldXY(sx,sy);h=worldCard(w.x,w.y)}
 if(!h){Inspect.hide();return false}Inspect.show(h,sx,sy,touch);return true}
