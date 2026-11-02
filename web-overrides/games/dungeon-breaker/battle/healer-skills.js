(function(root){
'use strict';
// User-approved test balance, 2026-10-22. MP tuning remains deferred.
const BALANCE={recovery:.30,healing:.20,blessing:.20,barrier:.30,holyLight:root.PlayerBalance?.damage('priest','holy-light',980)??980,sanctuary:root.PlayerBalance?root.PlayerBalance.param('priest','sanctuary','1회 피해',196)*root.PlayerBalance.param('priest','sanctuary','타격·회복 횟수',5):980,cost:0};
const hp=a=>a.currentHp??a.hp;
const sanctuaryImmune=e=>(e.element??e.spriteAsset?.element)==='light';
const BUFF_TURNS=3; // Includes the casting turn; consumed after the entire enemy response.
const LIVING_WATER={turns:2,ratio:.10,cost:80};
const SANCTUARY_PULSES={count:5,first:2680,interval:480};
// Split the modified total exactly, including rounding remainders from buffs.
const sanctuaryPulseAmount=(total,index)=>Math.floor(total*(index+1)/SANCTUARY_PULSES.count)-Math.floor(total*index/SANCTUARY_PULSES.count);
class HealerState{
 constructor(party){this.party=party;this.baseHp=party.map(a=>a.hp);this.blessed=new Set();this.barriers=new Map();this.turn=1;this.blessingUntil=new Map();this.barrierUntil=new Map();this.livingWaterUntil=new Map();}
 apply(id,selected){const targets=id==='recovery'?[selected]:this.party.map((_,i)=>i);const affected=[];
  for(const i of targets){const a=this.party[i];if(!a||hp(a)<=0)continue;
   if(id==='blessing'){
    const before=hp(a),oldMax=a.hp,newMax=Math.floor(this.baseHp[i]*(1+BALANCE.blessing));
    this.blessed.add(i);this.blessingUntil.set(i,this.turn+BUFF_TURNS-1);a.hp=newMax;
    // Grant only newly added capacity; refreshing an active blessing cannot heal again.
    a.currentHp=Math.min(newMax,before+Math.max(0,newMax-oldMax));
   }
   else if(id==='barrier'){this.barriers.set(i,Math.max(1,Math.floor(a.hp*BALANCE.barrier)));this.barrierUntil.set(i,this.turn+BUFF_TURNS-1);}
   else if(id==='living-water')this.livingWaterUntil.set(i,this.turn+LIVING_WATER.turns-1);
   else if(id==='recovery'||id==='healing')a.currentHp=Math.min(a.hp,hp(a)+Math.max(1,Math.floor(a.hp*BALANCE[id])));
   affected.push(i);
  }return affected;
 }
 healAll(amount){const healed=[];for(let i=0;i<this.party.length;i++){const a=this.party[i];if(hp(a)<=0)continue;const before=hp(a);a.currentHp=Math.min(a.hp,before+Math.max(0,Math.round(amount)));healed.push({i,amount:a.currentHp-before});}return healed;}
 damage(i,n){return Math.round(n*(this.blessed.has(i)?1+BALANCE.blessing:1));}
 incoming(i,n){if(n<=0)return 0;let damage=Math.round(n/(this.blessed.has(i)?1+BALANCE.blessing:1));const shield=this.barriers.get(i)||0,absorbed=Math.min(shield,damage);if(shield){if(shield===absorbed){this.barriers.delete(i);this.barrierUntil.delete(i);}else this.barriers.set(i,shield-absorbed);}return damage-absorbed;}
 remaining(id,i){return Math.max(0,(this[id==='living-water'?'livingWaterUntil':id==='blessing'?'blessingUntil':'barrierUntil'].get(i)||0)-this.turn+1);}
 snapshotBuffs(){
  return Object.fromEntries(this.party.filter(a=>hp(a)>0).map(a=>{const i=this.party.indexOf(a);return [a.id,{
   blessing:this.blessed.has(i)?this.remaining('blessing',i):0,
   barrier:{turns:this.barriers.has(i)?this.remaining('barrier',i):0,hp:this.barriers.get(i)||0},
   livingWater:this.remaining('living-water',i)
  }];}));
 }
 restoreBuffs(saved){
  const turns=(n,max)=>Number.isFinite(Number(n))?Math.max(0,Math.min(max,Math.floor(Number(n)))):0;
  this.blessed.clear();this.blessingUntil.clear();this.barriers.clear();this.barrierUntil.clear();this.livingWaterUntil.clear();
  this.party.forEach((a,i)=>{
   const s=hp(a)>0?saved?.[a.id]:null,b=turns(s?.blessing,BUFF_TURNS),shield=turns(s?.barrier?.turns,BUFF_TURNS),water=turns(s?.livingWater,LIVING_WATER.turns);
   // Restore capacity only. The campaign restores the exact saved current HP;
   // crossing a floor is not another cast and must never grant blessing's heal.
   a.hp=b?Math.floor(this.baseHp[i]*(1+BALANCE.blessing)):this.baseHp[i];
   if(a.currentHp!==undefined)a.currentHp=Math.min(a.hp,a.currentHp);
   if(b){this.blessed.add(i);this.blessingUntil.set(i,this.turn+b-1);}
   const shieldHp=Number(s?.barrier?.hp);
   if(shield&&Number.isFinite(shieldHp)&&shieldHp>0){this.barriers.set(i,Math.floor(shieldHp));this.barrierUntil.set(i,this.turn+shield-1);}
   if(water)this.livingWaterUntil.set(i,this.turn+water-1);
  });
 }
 removeBlessing(i){this.blessed.delete(i);this.blessingUntil.delete(i);const a=this.party[i];a.hp=this.baseHp[i];if(a.currentHp!==undefined)a.currentHp=Math.min(a.hp,a.currentHp);}
 endTurn(restoreMana=()=>{}){const changed=new Set();for(const [i,until] of this.livingWaterUntil){if(hp(this.party[i])<=0){this.livingWaterUntil.delete(i);continue;}if(until>=this.turn){restoreMana(i,Math.floor((this.party[i].mp||0)*LIVING_WATER.ratio));changed.add(i);}}this.turn++;for(const [i,until] of this.livingWaterUntil)if(until<this.turn)this.livingWaterUntil.delete(i);for(const [i,until] of this.blessingUntil)if(until<this.turn){this.removeBlessing(i);changed.add(i);}for(const [i,until] of this.barrierUntil)if(until<this.turn){this.barriers.delete(i);this.barrierUntil.delete(i);changed.add(i);}return [...changed];}
 fallen(i){this.livingWaterUntil.delete(i);this.barriers.delete(i);this.barrierUntil.delete(i);this.removeBlessing(i);}
 reset(){this.turn=1;this.livingWaterUntil.clear();this.blessed.clear();this.barriers.clear();this.blessingUntil.clear();this.barrierUntil.clear();this.party.forEach((a,i)=>{a.hp=this.baseHp[i];if(a.currentHp!==undefined)a.currentHp=Math.min(a.hp,a.currentHp);});}
}
const api={BALANCE,BUFF_TURNS,LIVING_WATER,HealerState,sanctuaryImmune,SANCTUARY_PULSES,sanctuaryPulseAmount};if(typeof module==='object'&&module.exports)module.exports=api;if(!root.document)return;
const party=root.BATTLE_ASSETS.slice(0,4),caster=party.findIndex(a=>a.id==='priest');if(caster<0)return;
const specs={'living-water':{name:'리빙워터',folder:'healer-living-water-v2',count:48,poses:8,step:100,apply:1360,field:true,cost:80,description:'자신을 포함한 생존 아군 전체가 시전 턴과 다음 턴 종료 시 최대 MP의 10%씩 회복합니다(총 2회). MP 80. 재시전은 중첩 없이 2턴 갱신.'},sanctuary:{name:'생츄어리',folder:'healer-sanctuary-v5',count:40,step:120,apply:SANCTUARY_PULSES.first,field:true,area:true,element:'light',description:'마법진에서 금빛이 올라오며 적 전체에 빛속성 기본 피해 196씩 5회(총 980), 생존 아군 전체에 같은 양 회복. 빛속성 적은 피해 면역.'},'holy-light':{name:'성스러운 빛',folder:'healer-holy-light-v1',count:24,step:80,apply:1320,anchor:[192,510],single:true,element:'light',description:'선택한 적 하나에게 하늘에서 빛기둥을 내려 빛속성 피해 980을 줍니다.'},blessing:{name:'축복의 기도',folder:'healer-blessing-prayer-v4',count:28,step:100,apply:1360,anchor:[80,156],description:'시전 턴을 포함한 3턴 동안 아군 공격력·방어력·최대 HP +20%. 늘어난 최대 HP만큼 현재 HP도 증가합니다. 재시전은 추가 회복 없이 3턴 갱신, 중첩 없음.'},barrier:{name:'빛의 성막',folder:'healer-hear-my-prayer-v5',count:47,step:100,apply:2360,anchor:[256,700],unitHeight:360,highQuality:true,description:'시전 턴을 포함한 3턴 동안 최대 HP 30%의 보호막. HP 소진 시 조기 해제, 재시전 시 교체 및 3턴 갱신.'},recovery:{name:'회복의 기도',folder:'healer-recovery-prayer-v2',count:24,step:80,apply:1000,anchor:[80,156]},healing:{name:'치유의 기도',folder:'healer-healing-prayer-v1',count:24,step:80,apply:1000,anchor:[80,156]}};
const model=new HealerState(party),fx={},icons={};let bridge,controls,select,info,active=null,pendingTarget=null;
const alive=()=>hp(party[caster])>0;
const nativeMana=i=>party[i].id==='wizard'?root.WizardSkills:party[i].id==='hero'?root.PartyHero:null;
const mana=i=>root.PartyResources?.enabled?root.PartyResources.read(party[i].id):nativeMana(i)?.mp??party[i].currentMp??party[i].mp??0;
function restoreMana(i,amount,absolute=false){const a=party[i],next=Math.max(0,Math.min(a.mp||0,absolute?amount:mana(i)+amount));
 if(root.PartyResources?.enabled){root.PartyResources.restore(a.id,next);root.PartyResources.sync();}
 else if(nativeMana(i))nativeMana(i).restoreMp(next);
 else{a.currentMp=next;const card=document.querySelectorAll('#party .member')[i];if(card){card.querySelector('.stat-line.mp span').textContent=next+' / '+a.mp;card.querySelector('.mp-bar i').style.width=(a.mp?100*next/a.mp:0)+'%';}}
}

const enemies=()=>bridge?.enemies()||[];
const selectable=e=>e&&e.hp>0&&(!root.WizardSkills||root.WizardSkills.canSelect(e));
function cancelTarget(){pendingTarget=null;controls?.querySelector('[data-healer="holy-light"]')?.classList.remove('target-pending');}
function requestHolyLight(){
 if(root.PartyTurns)return root.PartyTurns.manualAction('holy-light');
 if(pendingTarget){cancelTarget();return;}
 if(!bridge||bridge.busy()||active||!alive())return;
 const e=enemies().find(selectable);if(!e)return;
 pendingTarget=e.id;controls.querySelector('[data-healer="holy-light"]').classList.add('target-pending');
 bridge.notice?.('성스러운 빛 · 공격할 적을 선택하세요 (Esc: 취소)');
}
function mountTargeting(){
 const arena=document.querySelector('#arena');let press=null;
 arena.addEventListener('pointerdown',e=>{press=e.isPrimary&&e.button===0?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;});
 arena.addEventListener('pointercancel',()=>press=null);
 arena.addEventListener('pointerup',e=>{const first=press;press=null;if(!pendingTarget||!first||first.id!==e.pointerId||Math.hypot(e.clientX-first.x,e.clientY-first.y)>12)return;
  const r=arena.getBoundingClientRect(),x=(e.clientX-r.left)*(window.MonsterRaster?.width(arena)??arena.width)/r.width,y=(e.clientY-r.top)*(window.MonsterRaster?.height(arena)??arena.height)/r.height;
  const hit=enemies().filter(selectable).filter(t=>{const a=t.spriteAsset||root.BATTLE_ASSETS[4],b=a.bounds,k=t.h/(b[3]-b[1]),anchor=a.anchor||[(b[0]+b[2])/2,b[3]];return (t.id===pendingTarget&&Math.abs(x-t.x)<=22&&y>=t.y-t.h-54&&y<=t.y-t.h-20)||x>=t.x+(b[0]-anchor[0])*k&&x<=t.x+(b[2]-anchor[0])*k&&y>=t.y+(b[1]-anchor[1])*k&&y<=t.y+(b[3]-anchor[1])*k;}).sort((a,b)=>b.y-a.y)[0];
  cancelTarget();if(hit)start('holy-light',hit.id);
 });
 document.addEventListener('keydown',e=>{if(!pendingTarget||e.target.matches('input,textarea,select'))return;if(e.key==='Escape'){e.preventDefault();cancelTarget();}else if(e.key==='Enter'){e.preventDefault();const id=pendingTarget;cancelTarget();start('holy-light',id);}else if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const es=enemies().filter(selectable).sort((a,b)=>a.x-b.x);if(!es.length){cancelTarget();return;}const n=es.findIndex(t=>t.id===pendingTarget);pendingTarget=es[(n+(e.key==='ArrowLeft'?-1:1)+es.length)%es.length].id;}});
}

function refresh(){if(!bridge)return;const busy=api.busy||bridge.busy();controls.querySelectorAll('[data-healer]').forEach(b=>b.disabled=busy||!alive()||(b.dataset.healer==='living-water'&&mana(caster)<LIVING_WATER.cost)||(b.dataset.healer==='recovery'&&hp(party[Number(select.value)])<=0));select.disabled=busy;controls.querySelector('[data-wound]').disabled=busy;for(const o of select.options)o.textContent=party[Number(o.value)].name+(hp(party[Number(o.value)])<=0?' · 전투불능':'');info.textContent=active?specs[active.id].name+' 시전 중':'단일 회복 30% · 전체 회복 20% · 축복 20% · 보호막 30% · 리빙워터 MP 80 / 2턴간 MP 10%';document.querySelector('#scene').dataset.healerSkill=active?.id||'';}
function start(id,enemyId){if(root.PartyTurns&&!root.PartyTurns.canCast(caster,id))return false;if(!bridge||!specs[id]||active||bridge.busy()||!alive()||(id==='living-water'&&mana(caster)<LIVING_WATER.cost))return false;
 const offensive=id==='holy-light',enemy=offensive?enemies().find(e=>e.id===(enemyId||enemies().find(selectable)?.id)):null;
 if(offensive&&!selectable(enemy))return false;
 const target=offensive?enemy.id:Number(select.value);if(id==='recovery'&&hp(party[target])<=0)return false;
 if(id==='living-water'&&!root.PartyResources?.enabled)restoreMana(caster,mana(caster)-LIVING_WATER.cost,true);
 cancelTarget();active={id,started:bridge.now(),target,enemy:enemy?{x:enemy.x,y:enemy.y,h:enemy.h}:null,targets:offensive||id==='sanctuary'||id==='living-water'?[]:id==='recovery'?[target]:party.map((_,i)=>i).filter(i=>hp(party[i])>0),applied:false,pulses:0,lethal:false};bridge.resume();bridge.buttons();refresh();return true;}

function drawLivingWater(g,positions,now){
 const t=now-active.started-760;if(t<0||t>=4800)return;
 const ps=positions.slice(0,4).filter((p,i)=>hp(party[i])>0);if(!ps.length)return;
 const xs=ps.map(p=>p.x),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=Math.max(125,Math.min(...ps.map(p=>p.y-p.h))-85),rx=Math.max(120,(Math.max(...xs)-Math.min(...xs))/2+55),ry=48;
 const orbit=ms=>{const theta=Math.PI/2+Math.max(0,ms)/2400*Math.PI*2;return{x:cx+Math.cos(theta)*rx,y:cy+Math.sin(theta)*ry,theta};};
 const p=orbit(t),fade=Math.max(0,Math.min(1,(t-3600)/1200)),opacity=1-fade*fade*(3-2*fade);
 const h=138,im=fx['living-water'].angel[((Math.floor(p.theta/(Math.PI*2)*8)%8)+8)%8];
 g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 const drop=fx['living-water'].droplet;
 for(let j=1;j<=18;j++){if(t<j*38)continue;const q=orbit(t-j*38),s=14+(j%3)*4;g.globalAlpha=(1-j/20)*.9*opacity;g.drawImage(drop,q.x-s/2,q.y+26,s,s);}
 g.globalAlpha=Math.min(1,t/180)*opacity;g.drawImage(im,p.x-h*.375,p.y-h*.5,h*.75,h);g.restore();
 document.querySelector('#scene').dataset.livingWaterPhase=fade>0?'fading':'orbit';
}
Object.assign(api,{model,specs,caster,start,requestHolyLight,cancelTarget,damage:(i,n)=>model.damage(i,n),incoming:(i,n)=>model.incoming(i,n),fallen:i=>model.fallen(i),
 snapshotBuffs:()=>model.snapshotBuffs(),
 restoreBuffs(saved){model.restoreBuffs(saved);if(bridge)refresh();},
 endTurn(){model.endTurn(restoreMana).forEach(i=>bridge?.sync(i));if(bridge)refresh();},
 async load(load){await Promise.all(Object.entries(specs).filter(([id])=>!root.CampaignAssets||root.CampaignAssets.uses('priest',id)).map(async([id,s])=>{fx[id]={};await Promise.all((id==='living-water'?['angel']:id==='holy-light'?['beam','impact']:id==='barrier'?['back','front','beam']:id==='sanctuary'?['back','front','rise-back','rise-front']:['back','front']).map(async layer=>{
  // The held floor shares decoded frames; new light layers have tight transparent crops.
  const cache=new Map();fx[id][layer]=await Promise.all(Array.from({length:s.poses||s.count},(_,i)=>{
   const n=i+1,original=n<=14?n:n<=34?14:n-20;
   const folder=id==='sanctuary'&&layer==='back'?'healer-sanctuary-v4':s.folder;
   const frame=id==='sanctuary'&&layer==='back'?original:n;
   const url=`../skills/${folder}/frames/${layer}/${String(frame).padStart(2,'0')}.webp`;
   if(!cache.has(url))cache.set(url,load(url));return cache.get(url);
  }));}));}));await Promise.all(['blessing','barrier','living-water'].map(async id=>icons[id]=await load(`../skills/${specs[id].folder}/status-icons.webp`)));if(fx['living-water'])fx['living-water'].droplet=await load('../skills/healer-living-water-v2/mana-droplet.webp');},
 mount(b){bridge=b;controls=document.createElement('section');controls.className='archer-controls healer-controls';controls.setAttribute('aria-label','힐러 스킬');controls.innerHTML='<strong>힐러 스킬 · 기도</strong><div class="archer-skill-grid"></div><label>회복 대상 <select aria-label="힐러 회복 대상"></select></label><p role="status"></p><details><summary>회복 테스트</summary><button data-wound>생존 아군 체력을 40%로 설정</button><p>축복: 시전 턴 포함 3턴 유지 · 재시전 중첩·추가 회복 없음 · 최대 HP 증가량만큼 현재 HP도 증가. 보호막: 시전 턴 포함 3턴 또는 HP 소진까지 유지 · 재시전 시 교체 · 초과 피해는 본체 HP에 적용.</p></details>';document.querySelector('.screen').after(controls);select=controls.querySelector('select');info=controls.querySelector('p');party.forEach((a,i)=>select.add(new Option(a.name,i)));select.onchange=refresh;for(const [id,s]of Object.entries(specs)){const b=document.createElement('button');b.dataset.healer=id;b.textContent=s.name;b.onclick=()=>id==='holy-light'?requestHolyLight():start(id);controls.querySelector('div').append(b);}controls.querySelector('[data-wound]').onclick=()=>{if(bridge.busy()||active)return;party.forEach((a,i)=>{if(hp(a)>0){a.currentHp=Math.max(1,Math.floor(a.hp*.4));bridge.sync(i);}});refresh();};mountTargeting();refresh();},
 update(now){if(!bridge)return;if(pendingTarget&&(bridge.busy()||!alive()||!enemies().some(selectable)))cancelTarget();for(let i=0;i<party.length;i++)if(hp(party[i])<=0&&(model.blessed.has(i)||model.barriers.has(i)||model.livingWaterUntil.has(i)))model.fallen(i);
  if(active){const a=active,s=specs[a.id],age=now-a.started;if(!alive()){root.DungeonCombatAudio?.stopSpell(a);active=null;bridge.buttons();}else{
   root.DungeonVoices?.action('priest',a.id,a);root.DungeonCombatAudio?.spell('priest',a.id,a,age);
   if(a.id==='sanctuary'){
    // Catch up on the shared battle clock, consuming each pulse once even after a slow frame.
    while(a.pulses<SANCTUARY_PULSES.count&&age>=SANCTUARY_PULSES.first+a.pulses*SANCTUARY_PULSES.interval){
     if(a.pulses===0)a.total=bridge.outgoing(caster,BALANCE.sanctuary);
     const living=enemies().filter(e=>e.hp>0),targets=living.filter(e=>!sanctuaryImmune(e));
     const amount=sanctuaryPulseAmount(a.total,a.pulses);
     // Healing uses each outgoing pulse, independent of enemy count, defense or remaining HP.
     a.lethal=bridge.damageResolved(targets,amount,true,{element:'light',skillId:'sanctuary',damageType:'magic'}).lethal||a.lethal;
     a.healed=model.healAll(amount);a.healed.forEach(({i})=>bridge.sync(i));
     a.amount=amount;a.immune=living.filter(sanctuaryImmune).map(e=>e.id);a.pulses++;
     bridge.notice?.('생츄어리 · '+a.pulses+'/5회 · 적 전체 '+amount+' 빛 피해 / 아군 전체 '+amount+' 회복'+(a.immune.length?' · 빛속성 적 면역':''));
     if(a.pulses===1)root.DwarfSkills?.special('priest',now);
    }
   }else if(!a.applied&&age>=s.apply){a.applied=true;if(a.id==='holy-light'){const e=enemies().find(e=>e.id===a.target);if(selectable(e)){a.lethal=bridge.damage(caster,[e],BALANCE.holyLight,false,{element:'light',skillId:'holy-light',damageType:'magic'}).lethal;bridge.notice?.('성스러운 빛 · '+e.name+' 명중');if(root.DwarfSkills?.model.charge?.enemyId===e.id)root.DwarfSkills.special('priest',now,a.id,e.id);}}else{model.apply(a.id,a.target).forEach(i=>bridge.sync(i));root.DwarfSkills?.special('priest',now);}}
   if(age>=760+s.count*s.step){root.DungeonCombatAudio?.stopSpell(a);active=null;if(a.lethal)bridge.finish();else if(root.DwarfSkills)root.DwarfSkills.complete(now);else root.ArcherSkills?.completeTurn(now);bridge.buttons();}
  }}refresh();
 },
 pose(i,now){if(i!==caster||!active)return null;const age=now-active.started;return{clip:'magic',time:age<760?age:800};},
 draw(g,layer,i,p,now){if(i>=4)return;
  // Formation can precede protection; once applied, a broken/expired shield also loses its body VFX.
  const showBody=active&&(active.id!=='barrier'||!active.applied||model.barriers.has(i));
  if(showBody&&active.targets.includes(i)&&hp(party[i])>0){
   const s=specs[active.id],t=now-active.started-760,f=Math.floor(t/s.step);
   if(f>=0&&f<s.count){const k=p.h/(s.unitHeight||140),im=fx[active.id][layer]?.[f];
    if(s.highQuality){g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';}
    if(im)g.drawImage(im,Math.round(p.x-s.anchor[0]*k),Math.round(p.y-s.anchor[1]*k),Math.round(im.width*k),Math.round(im.height*k));
    if(layer==='front'&&active.id==='barrier'){
     const beam=fx.barrier.beam[f];
     // Keep the floor anchor at the ally's feet while the beam reaches above the viewport.
     g.drawImage(beam,Math.round(p.x-s.anchor[0]*k),-32,Math.round(beam.width*k),Math.round((p.y+32)*beam.height/s.anchor[1]));
    }
    if(s.highQuality)g.restore();
   }
  }
  if(layer==='front'&&hp(party[i])>0&&!root.PartyStatusIcons?.buffsEnabled()){const list=[];if(model.blessed.has(i))list.push(['blessing',104]);if(model.barriers.has(i))list.push(['barrier',32]);if(model.livingWaterUntil.has(i))list.push(['living-water',32]);let x=Math.round(p.x-(list.reduce((n,v)=>n+v[1],0)+Math.max(0,list.length-1)*4)/2);const y=Math.round(p.y-p.h-54);for(const [id,w]of list){g.drawImage(icons[id],x,y,w,32);x+=w+4;}}
 },
 drawField(g,layer,positions,now){
  const scene=document.querySelector('#scene'),a=active;
  if(layer==='back')scene.dataset.livingWaterPhase='';
  if(layer==='back'){scene.dataset.sanctuaryFrame='-1';scene.dataset.sanctuaryImmune='';scene.dataset.sanctuaryAmount='';scene.dataset.sanctuaryPulses='0';}
  if(a?.id==='living-water'){if(layer==='front')drawLivingWater(g,positions,now);return;}
  if(a?.id!=='sanctuary')return;
  const spec=specs.sanctuary,f=Math.floor((now-a.started-760)/spec.step);if(f<0||f>=spec.count)return;
  scene.dataset.sanctuaryFrame=String(f);scene.dataset.sanctuaryImmune=(a.immune||[]).join(',');scene.dataset.sanctuaryAmount=String(a.amount||0);scene.dataset.sanctuaryPulses=String(a.pulses);
  const im=fx.sanctuary[layer]?.[f];if(!im)return;
  g.save();g.imageSmoothingEnabled=false;
  const points=[...positions.slice(0,4),...enemies()],ys=points.map(p=>p.y),floor=Math.min((window.MonsterRaster?.height(g.canvas)??g.canvas.height)-120,(Math.min(...ys)+Math.max(...ys))/2);
  const y=Math.round(floor-552*.7);
  const rise=fx.sanctuary['rise-'+layer]?.[f];
  if(layer==='back')g.drawImage(im,0,y,(window.MonsterRaster?.width(g.canvas)??g.canvas.width),Math.round(im.height*.7));
  if(rise)g.drawImage(rise,0,y+300*.7,(window.MonsterRaster?.width(g.canvas)??g.canvas.width),360*.7);
  if(layer==='front'){
   const points=[...positions.slice(0,4).map((p,i)=>({...p,alive:hp(party[i])>0})),...enemies().map(p=>({...p,alive:p.hp>0}))];
   const centers=[130,275,420,565,780,940,1100];
   points.forEach((p,i)=>{if(!p.alive)return;const k=p.h/140;g.drawImage(im,centers[i%centers.length]-60,40,120,160,Math.round(p.x-60*k),Math.round(p.y-160*k),Math.round(120*k),Math.round(160*k));});
  }
  g.restore();
 },
 drawEnemy(g,now){
  const scene=document.querySelector('#scene');scene.dataset.holyLightFrame='-1';scene.dataset.holyLightTarget=active?.id==='holy-light'?active.target:'';
  if(!root.PartyTurns)scene.dataset.targeting=String(!!pendingTarget);
  if(pendingTarget){const t=enemies().find(e=>e.id===pendingTarget&&selectable(e))||enemies().find(selectable);if(t){pendingTarget=t.id;g.save();g.globalAlpha=.78+.22*(Math.sin(now*Math.PI*2/1200)+1)/2;g.fillStyle='#ffe28c';g.shadowColor='#ffe8a1';g.shadowBlur=12;g.beginPath();g.moveTo(t.x-15,t.y-t.h-48);g.lineTo(t.x+15,t.y-t.h-48);g.lineTo(t.x,t.y-t.h-27);g.closePath();g.fill();g.restore();}}
  if(active?.id!=='holy-light')return;const s=specs[active.id],f=Math.floor((now-active.started-760)/s.step);if(f<0||f>=s.count)return;
  const p=active.enemy,k=Math.max(.55,Math.min(.95,p.h/250)),height=Math.round((p.y+20)*576/s.anchor[1]);
  g.save();g.imageSmoothingEnabled=false;for(const layer of ['beam','impact']){const im=fx['holy-light'][layer][f];g.drawImage(im,Math.round(p.x-s.anchor[0]*k),-20,Math.round(im.width*k),height);}g.restore();scene.dataset.holyLightFrame=String(f);
 },
 reset(){cancelTarget();active=null;model.reset();if(!root.PartyResources?.enabled)party.forEach((a,i)=>{if(a.currentMp!==undefined)restoreMana(i,a.mp,true);});if(bridge)refresh();}
});Object.defineProperty(api,'busy',{get:()=>!!active});root.HealerSkills=api;
})(typeof window!=='undefined'?window:globalThis);
