const canvas=document.querySelector('#arena'),ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
const assets=window.BATTLE_ASSETS,motion=window.BattleMotion;
const positions=[{...motion.home,h:220},{x:510,y:527,h:220},{x:350,y:651,h:177},{x:223,y:516,h:229},{x:1218,y:505,h:414}];
const definitions={attack:{name:'철퇴 강타',clip:'attack',impact:690,damage:980,offensive:true,color:'#ffe3a0'},charge:{name:'방패 돌진',clip:'guard',impact:600,damage:720,offensive:true,color:'#83dfff'},magic:{name:'불굴의 의지',clip:'magic',impact:950,offensive:false,color:'#f5d374'},item:{name:'회복 물약',clip:'item',impact:1050,offensive:false,color:'#72efbc'}};
const phaseNames={advancing:'중앙으로 이동',settling:'행동 준비',acting:'행동 중',turning:'방향 전환',facing:'전투 방향으로 전환',returning:'원래 자리로 복귀',complete:'대기'};
const images=[],portraits=[],actionImages={},effectImages={};
let activeEffect=null,deployedRobot=null,robotImages={};
const config=window.BATTLE_CONFIG||{};
if(config.partyTurns)window.MonsterRaster?.mount(canvas);
Object.entries(config.positions||{}).forEach(([i,p])=>Object.assign(positions[i],p));
const mechanicIndex=assets.findIndex(asset=>asset.id==='mechanic');
window.MechFormation?.alignRivet?.(positions[mechanicIndex]);
// Shared world proportions for every live dungeon; authored canvases/anchors stay intact.
const sceneSize=window.BattleSceneSize;
positions.forEach((p,i)=>p.h=i<4?p.h*sceneSize.ally:Math.max(sceneSize.minEnemy,p.h*sceneSize.enemy));
const scaledRobots=new WeakSet();
for(const robots of [config.robots,window.PartyMechanicData?.robots])for(const r of Object.values(robots||{})){
 if(!scaledRobots.has(r)){r.height*=sceneSize.ally;scaledRobots.add(r);}
}
if(config.robot)config.robot.height*=sceneSize.ally;
for(const unit of config.enemyFormation||[])unit.h=Math.max(sceneSize.minEnemy,(unit.h||230)*sceneSize.enemy);
// EnemyFormation may already have initialized its units before the shared battle entry.
window.EnemyFormation?.reset();

let robotCombat=config.robots?window.RobotCombat.create(assets[0].hp,assets[0].mp):null,combatNotice="",enemyAttackStarted=null,robotBlast=null;
let combinedMech=config.superCombine?new window.MechanicCombineBattle():null;
function createRun(round=config.round||1){const run=window.BattleLoot.create(round);if(config.initialSlots)run.slots=config.initialSlots.map(slot=>({...slot}));if(config.basicAttack)Object.assign(run.slots[0],config.basicAttack);window.BattleRoar?.configure(run.slots);return run;}
let runState=createRun(),normalIdle=null,normalDefeated=null;
const encounters=config.encounters||[{name:'성소 경비 마족',max:1800,hp:1800,intent:'칼날 강타',height:300},{name:'성소 정예 마족',max:2600,hp:2600,intent:'맹렬한 일격',height:330},{name:'붉은 날개 드래곤',max:12000,hp:8450,intent:'화염 숨결',height:414}];
encounters.forEach(e=>e.height=Math.max(sceneSize.minEnemy,e.height*sceneSize.enemy));
const enemy=()=>encounters[runState.round-1],demoActions=()=>battleCommands().map(s=>s.id);
function battleCommands(){return combinedMech?combinedMech.commands(runState.slots):runState.slots;}
const iconBoxes=[[1173,750,65,65],[1441,750,65,65],[1173,830,65,65],[1441,831,65,65]];
function iconMarkup(icon){if(config.icons?.[icon])return `<img class="ability-icon" src="${config.icons[icon]}" alt="">`;const b=iconBoxes[icon]||iconBoxes[0];return `<svg class="ability-icon" viewBox="${b.join(' ')}" aria-hidden="true"><image href="dungeon-dragon-battle-mockup-v4-dwarf-archer-wizard-healer.webp" width="1672" height="941"/></svg>`;}
const slotCost=s=>s.id==='combined-beam'?'충전 1턴 + 발사 1턴':s.id==='super-combine'?'메카 2기 이상 · 3턴':s.cost!==undefined?'MP '+s.cost:s.quantity+'개';
const lootType=s=>s.type==='scroll'?'스킬 스크롤':s.type==='heal'?'회복 아이템':s.type==='item'?'아이템':'스킬';
function renderLoadout(){
 const grid=document.querySelector('.command-grid');grid.replaceChildren();delete grid.dataset.manualKey;
 battleCommands().forEach((slot,index)=>{const b=document.createElement('button');b.dataset.action=slot.id;b.dataset.slot=index;b.innerHTML=`<kbd>${index+1}</kbd>${iconMarkup(slot.icon)}<span>${slot.name}<small>${slotCost(slot)}</small></span>`;b.onclick=()=>startAction(slot.id);grid.append(b);});window.PartyTurns?.padSkillSlots(grid);buttons();
}
function updateEncounter(){
 const e=enemy();document.querySelector('#scene').dataset.round=runState.round;
 document.querySelector('.boss h2').textContent=(config.encounterLabel||'Round '+runState.round);
 document.querySelector('.enemy-name strong').textContent=e.name;document.querySelector('.enemy-name span').textContent=config.enemyRank||(runState.round===3?'BOSS':'일반');
 document.querySelector('.boss p>span').textContent='/ '+fmt(e.max);
 document.querySelector('.boss-bar').setAttribute('aria-valuemax',e.max);
 document.querySelector('.intent b').textContent=e.intent;
 document.querySelector('#arena').setAttribute('aria-label',assets[0].name+'·궁수·마법사·힐러와 '+e.name+'의 전투 애니메이션');
 document.querySelector('#round-select').value=String(runState.round);updateBossHp();
}
async function loadNormalEnemy(){
 const sheet=await load('assets/melee-demon-sheet.webp');
 function tile(x,y,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const cx=c.getContext('2d');cx.imageSmoothingEnabled=false;cx.drawImage(sheet,x,y,w,h,0,0,w,h);const im=cx.getImageData(0,0,w,h),d=im.data;
  // Runtime color key for the existing representative sheet's cream backdrop.
  for(let i=0;i<d.length;i+=4)if(d[i]>185&&d[i+1]>180&&d[i+2]>165&&d[i]>=d[i+1]&&d[i+1]>=d[i+2])d[i+3]=0;
  if(y===112){
   // Ignore the neighboring attack cell's disconnected slash at the tile edge.
   const seen=new Uint8Array(w*h);let largest=[];
   for(let n=0;n<w*h;n++)if(!seen[n]&&d[n*4+3]){const queue=[n];seen[n]=1;for(let k=0;k<queue.length;k++){const v=queue[k],vx=v%w,vy=Math.floor(v/w);for(const q of [vx>0?v-1:-1,vx<w-1?v+1:-1,vy>0?v-w:-1,vy<h-1?v+w:-1])if(q>=0&&!seen[q]&&d[q*4+3]){seen[q]=1;queue.push(q);}}if(queue.length>largest.length)largest=queue;}
   const keep=new Uint8Array(w*h);largest.forEach(n=>keep[n]=1);for(let n=0;n<w*h;n++)if(!keep[n])d[n*4+3]=0;
  }
  cx.putImageData(im,0,0);return c;
 }
 normalIdle=tile(0,112,512,360);normalDefeated=tile(1024,700,512,260);
}
function lootCard(item,index,replace=false){
 const button=document.createElement('button');button.className='loot-card';
 button.setAttribute('aria-label',replace?'교체'+' '+(index+1)+'번 '+item.name:item.name+' 선택');
 button.innerHTML=`<span class="loot-type ${item.type}">${replace?'장착 중 · '+(index+1)+'번':lootType(item)}</span>${iconMarkup(item.icon)}<strong>${item.name}</strong><span class="loot-cost">${slotCost(item)}</span><span class="loot-description">${item.description}</span><span class="loot-choose">${replace?'이 행동을 교체하기':'선택하기'}</span>`;
 button.onclick=()=>{if(replace){runState=window.BattleLoot.replace(runState,index);continueRun();}else{runState=window.BattleLoot.select(runState,item.id);renderLoot();}};
 return button;
}
function renderLoot(){
 const panel=document.querySelector('#loot-overlay');panel.hidden=false;panel.dataset.step=runState.stage;
 document.querySelector('#loot-kicker').textContent='잿빛 성소 · Round '+runState.round;
 const content=document.querySelector('#loot-content');content.replaceChildren();
 const title=document.querySelector('#loot-title'),subtitle=document.querySelector('#loot-subtitle');
 document.querySelector('#loot-back').hidden=runState.stage!=='replace';document.querySelector('#loot-skip').hidden=runState.stage!=='loot';document.querySelector('#loot-restart').hidden=runState.stage!=='complete';
 if(runState.stage==='loot'){
  title.textContent='전리품 획득';subtitle.textContent='하나를 선택하세요. 선택한 전리품은 기존 행동 한 칸과 교체합니다.';
  const grid=document.createElement('div');grid.className='loot-options';runState.offers.forEach((item,i)=>grid.append(lootCard(item,i)));content.append(grid);
 }else if(runState.stage==='replace'){
  const incoming=runState.offers.find(o=>o.id===runState.selected);title.textContent='교체할 행동 선택';subtitle.textContent='기존 행동 하나를 잊고 새 전리품을 장착합니다.';
  const banner=document.createElement('div');banner.className='replace-incoming';banner.innerHTML=iconMarkup(incoming.icon)+`<strong>${incoming.name}</strong><span>획득 예정</span>`;content.append(banner);
  const grid=document.createElement('div');grid.className='replacement-options';runState.slots.forEach((item,i)=>grid.append(lootCard(item,i,true)));content.append(grid);
 }else{
  title.textContent='던전 탐험 완료';subtitle.textContent='모든 라운드와 전리품 선택을 마쳤습니다.';
  const list=document.createElement('div');list.className='completed-slots';runState.slots.forEach(item=>{const el=document.createElement('span');el.textContent=item.name;list.append(el);});content.append(list);
 }
 (content.querySelector('button')||document.querySelector('#loot-restart')).focus({preventScroll:true});
}
function openLoot(){
 if(runState.stage!=='clear')return;
 runState=window.BattleLoot.open(runState);runState.offers=config.skillCatalog?config.skillCatalog.filter(item=>!runState.slots.some(slot=>slot.id===item.id)).slice(0,3):runState.offers.filter(item=>assets[0].actions[item.clip]);document.querySelector('#clear-overlay').hidden=true;renderLoot();
}
function continueRun(){
 if(runState.stage==='complete'){renderLoot();return;}
 document.querySelector('#loot-overlay').hidden=true;resetBattle();renderLoadout();updateEncounter();
 if(runState.lastSwap)document.querySelector('#message').textContent=runState.lastSwap.to+' 장착 완료';
 document.querySelector('.command-grid button').focus({preventScroll:true});
}
function restartRun(round=config.round||1){runState=createRun(round);continueRun();}

let elapsed=0,previous=0,ready=false,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,speed=1,current=null,demo=false,demoIndex=0,nextDemo=0,lastPhase='';
let mainEnemyHit={hitAt:null,damage:0};
let bossHp=enemy().hp,finisher=null,clearShown=false,hurtStarted=null;
const fmt=n=>n.toLocaleString('ko-KR'),duration=clip=>clip.durations.reduce((sum,n)=>sum+n,0);
const imageLoads=new Map();
const load=src=>{
 if(imageLoads.has(src))return imageLoads.get(src);
 const task=window.GameImages?GameImages.ready(window.SpiderDetail?.resolve(src)||src).then(im=>window.SpiderDetail?.configure(im,src)||im):new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(src));im.src=src;});
 imageLoads.set(src,task);task.catch(()=>imageLoads.delete(src));return task;
};
function frameAt(clip,time,loop=true){let t=loop?time%duration(clip):Math.min(Math.max(0,time),duration(clip)-1);for(let i=0;i<clip.durations.length;i++){if(t<clip.durations[i])return i;t-=clip.durations[i];}return clip.frames.length-1;}
let equippedWeaponLevels={};
function drawSprite(index,frame,x,y,height,clip='idle'){
 const a=assets[index],b=a.bounds,registration=a.actions?.[clip]?.registration?.[frame],scale=height/(b[3]-b[1])*(registration?.scale||1);
 const im=(a.id==='wizard'&&clip==='magic'?window.WizardCasting?.image(window.WizardSkills?.element||current?.def.element,frame):null)||(clip==='idle'?images[index][frame]:actionImages[index+':'+clip][frame]);
 // Fixed idle anchor and scale across every action, including oversized weapon poses.
 const anchor=registration?.anchor||a.actions?.[clip]?.anchor||a.anchor||[(b[0]+b[2])/2,b[3]];
 const draw=(...args)=>index===4&&window.MonsterRaster?window.MonsterRaster.image(ctx,...args):ctx.drawImage(...args);
 const [sw,sh]=a.actions?.[clip]?.size||a.size;
 const left=Math.round(x-anchor[0]*scale),top=Math.round(y-anchor[1]*scale),w=Math.round(sw*scale),h=Math.round(sh*scale);
 if(index===4&&config.contractStone){window.ContractStones.draw(ctx,im,left,top,w,h,clip,frame,elapsed,config.contractStone.wardAt,hurtStarted);return;}
 draw(im,left,top,w,h);
 if(index<4&&equippedWeaponLevels[a.id])WeaponGlow.draw(ctx,a.id,clip,frame,equippedWeaponLevels[a.id],im,left,top,w,h,elapsed);
}
function buildUI(){assets.slice(0,4).forEach((a,i)=>{
 const card=document.createElement('article');card.className='member'+(i===0?' selected':'');if(window.PartyRoster)card.style.order=String(window.PartyRoster.order.indexOf(i));card.setAttribute('aria-label',a.name+(i===0?' · 내 캐릭터':' · 동료'));
 const source=portraits[i],pic=document.createElement('canvas');
 pic.width=120;pic.height=170;pic.className='portrait';pic.setAttribute('role','img');pic.setAttribute('aria-label',a.name+' IDLE 초상화');
 const pc=pic.getContext('2d');pc.imageSmoothingEnabled=false;
 // Fit visible source pixels, not its transparent export margins, into the HUD.
 const [left,top,right,bottom]=a.portraitBounds;
 const scale=Math.min(116/(right-left),164/(bottom-top)),w=(right-left)*scale,h=(bottom-top)*scale;
 pc.drawImage(source,left,top,right-left,bottom-top,(120-w)/2,(170-h)/2,w,h);card.append(pic);
 const stats=document.createElement('div');stats.className='stats';stats.innerHTML=`<span class="role-badge">${window.PartyRoster?(window.PartyRoster.order.indexOf(i)+1)+'P':i===0?'내 캐릭터':'동료'}</span><strong>${a.name}</strong><div class="stat-line"><em>HP</em><span>${fmt(a.hp)} / ${fmt(a.hp)}</span></div><div class="bar"><i style="width:100%"></i></div><div class="stat-line mp"><em>MP</em><span>${a.mp} / ${a.mp}</span></div><div class="bar mp-bar"><i style="width:100%"></i></div>`;
 card.append(stats);document.querySelector('#party').append(card);
});}
function updateMechanicHUD(){
 if(!robotCombat)return;
 const badge=document.querySelector('#combine-badge');if(badge){badge.hidden=!combinedMech.active;badge.textContent='초 합체! · 남은 '+combinedMech.remainingTurns+'턴';}
 const combineStatus=document.querySelector('#combine-status');if(combineStatus)combineStatus.textContent=combinedMech.active?'초 합체! · 남은 '+combinedMech.remainingTurns+'/3턴':'초 합체! · '+(combinedMech.canActivate(robotCombat)?'사용 가능':'필드에 살아 있는 소환 메카 2기 이상 필요');
 const card=document.querySelector('#party .member');
 if(card){card.querySelector('.stat-line span').textContent=fmt(robotCombat.hp)+' / '+fmt(assets[0].hp);card.querySelector('.bar i').style.width=(100*robotCombat.hp/assets[0].hp)+'%';card.querySelector('.stat-line.mp span').textContent=robotCombat.mp+' / '+assets[0].mp;card.querySelector('.mp-bar i').style.width=(100*robotCombat.mp/assets[0].mp)+'%';}
 const units=window.RobotCombat.living(robotCombat);
 document.querySelector('#robot-status').textContent=(robotCombat.robots.map(r=>config.robots[r.id].name+' HP '+r.hp+'/'+config.robots[r.id].maxHp+' · 남은 '+Math.max(0,3-r.turns)+'턴'+(r.ending?' · 소멸 중':'')).join(' / ')||'설치된 로봇 없음')+(combatNotice?' · '+combatNotice:'');
 let panel=document.querySelector('#mech-deploy-panel');
 if(!panel){panel=document.createElement('section');panel.id='mech-deploy-panel';panel.className='mechanic-loadout';panel.innerHTML='<strong>메카 설치 · 종류별 1기 / 최대 4기</strong><div class="mech-summons"></div><label>수리 대상 <select id="mech-repair-target"></select></label>';document.querySelector('.mechanic-loadout').after(panel);for(const def of config.skillCatalog.filter(s=>s.robotId)){const b=document.createElement('button');b.dataset.summon=def.id;b.textContent=def.name+' · MP '+def.cost;b.onclick=()=>startAction(def.id);panel.querySelector('.mech-summons').append(b);}panel.querySelector('select').onchange=e=>{robotCombat.repairTargetSerial=Number(e.target.value);};}
 panel.querySelectorAll('[data-summon]').forEach(b=>{const d=config.skillCatalog.find(s=>s.id===b.dataset.summon);b.disabled=!ready||!!current||!!finisher||demo||combinedMech?.active||robotCombat.hp<=0||robotCombat.mp<d.cost||units.some(r=>r.id===d.robotId);});
 const select=panel.querySelector('select'),signature=units.map(r=>r.serial).join(',');if(select.dataset.units!==signature){select.dataset.units=signature;select.replaceChildren(...units.map(r=>{const o=document.createElement('option');o.value=r.serial;o.textContent=config.robots[r.id].name;return o;}));if(units.some(r=>r.serial===robotCombat.repairTargetSerial))select.value=robotCombat.repairTargetSerial;else robotCombat.repairTargetSerial=Number(select.value);}
 select.disabled=!!current||!units.length;
 document.querySelectorAll('#loadout-slots select').forEach(el=>el.disabled=robotCombat.active||!!current);
}
function buildMechanicLoadout(){
 if(!config.skillCatalog)return;const root=document.querySelector('#loadout-slots');root.replaceChildren();
 runState.slots.forEach((slot,index)=>{const label=document.createElement('label');label.textContent=(index+1)+'번';const select=document.createElement('select');select.setAttribute('aria-label',(index+1)+'번 장착 행동');config.skillCatalog.forEach(skill=>{const option=document.createElement('option');option.value=skill.id;option.textContent=skill.name;option.selected=skill.id===slot.id;option.disabled=runState.slots.some((s,i)=>i!==index&&s.id===skill.id);select.append(option);});select.onchange=()=>{if(robotCombat?.active||current||window.DwarfSkills?.busy||window.ArcherSkills?.busy||window.WizardSkills?.busy||window.HealerSkills?.busy)return;const skill=config.skillCatalog.find(s=>s.id===select.value);if(!skill)return;runState.slots[index]={...skill};renderLoadout();buildMechanicLoadout();};label.append(select);root.append(label);});updateMechanicHUD();
}
function buttons(){if(window.PartyTurns?.manualButtons())return;document.querySelectorAll('.hero-princess,.hero-special').forEach(b=>b.disabled=!ready||!!window.DwarfSkills?.busy||window.ArcherSkills?.busy||window.WizardSkills?.busy||window.HealerSkills?.busy||!!current||!!finisher||demo||!!window.BattleResurrection?.active||runState.stage!=='battle'||(assets[0].currentHp??assets[0].hp)<=0);const visible=battleCommands();if(document.querySelector('.command-grid button')?.dataset.action!==visible[0]?.id){renderLoadout();return;}document.querySelectorAll('.command-grid [data-action]').forEach(b=>{const slot=battleCommands().find(s=>s.id===b.dataset.action);b.disabled=!!(slot?.robotId&&robotCombat&&window.RobotCombat.living(robotCombat).some(r=>r.id===slot.robotId))||(slot?.id==='mech-repair'&&!window.MechanicRepair?.canRepair(robotCombat))||slot?.quantity===0||!!(window.PartyTurns&&!window.PartyTurns.canCast(0,b.dataset.action))||!!(slot?.offensive&&slot.target!=='all-living-enemies'&&!enemyTargets().some(t=>t.hp>0&&(!window.WizardSkills||window.WizardSkills.canSelect(t))))||!ready||!!window.DwarfSkills?.busy||window.ArcherSkills?.busy||window.WizardSkills?.busy||window.HealerSkills?.busy||!!window.BattleResurrection?.active||!!(window.BattleResurrection&&(assets[0].currentHp??assets[0].hp)<=0)||runState.stage!=='battle'||!!current||demo||!!finisher||(slot?.id==='super-combine'&&!combinedMech?.canActivate(robotCombat))||(slot?.id==='combined-beam'&&!combinedMech?.canChargeBeam())||!!(combinedMech?.active&&slot?.clip==='install')||!!(robotCombat&&(robotCombat.hp<=0||(slot?.cost||0)>robotCombat.mp||slot?.quantity===0));if(combinedMech&&slot){const label=b.querySelector('span');if(label?.firstChild)label.firstChild.nodeValue=combinedMech.action(slot).name;b.title=slot.id==='super-combine'?(combinedMech.active?'이미 합체 중입니다':combinedMech.canActivate(robotCombat)?'초 합체! · 3턴 유지':'필드에 살아 있는 소환 메카 2기 이상이 필요합니다'):combinedMech.action(slot).description||'';}b.classList.toggle('chosen',(current?.kind||battleCommands()[0].id)===b.dataset.action);});}
function startAction(kind,preview=false,targetConfirmed=false){
 if(window.PartyTurns?.manualAction(kind))return;
 if(window.PartyTurns&&!window.PartyTurns.canCast(0,kind))return;
 if(assets[0].id==='wizard'&&window.WizardSkills?.specs[kind]){window.WizardSkills.start(kind);return;}
 let def=battleCommands().find(s=>s.id===kind)||(config.robots?config.skillCatalog.find(s=>s.id===kind&&s.robotId):null)||(kind==='dwarf-wake'&&window.DwarfSkills?.model.charge?window.DwarfSkills.skills.find(s=>s.id===kind):null)||(window.HeroSwordBack?.skill?.id===kind?window.HeroSwordBack.skill:null)||(window.HeroPrincess?.skill?.id===kind?window.HeroPrincess.skill:null)||(preview?definitions[kind]:null);
 if((assets[0].id==='archer'&&window.ArcherSkills?.model.sniping)||!ready||current||finisher||window.DwarfSkills?.busy||window.ArcherSkills?.busy||window.WizardSkills?.busy||window.HealerSkills?.busy||window.BattleResurrection?.active||!def||runState.stage!=='battle'||(window.BattleResurrection&&(assets[0].currentHp??assets[0].hp)<=0))return;
 if(def.quantity===0)return;
 if(def.id==='mech-repair'&&(!window.MechanicRepair?.canRepair(robotCombat)||combinedMech?.active))return;
 if(def.offensive&&def.target!=='all-living-enemies'&&!enemyTargets().some(t=>t.hp>0&&(!window.WizardSkills||window.WizardSkills.canSelect(t))))return;
 if(window.PartyTurns&&!preview&&!targetConfirmed&&def.offensive&&def.target!=='all-living-enemies'){window.PartyTurns.requestTarget(def,()=>startAction(kind,false,true));return;}
 window.PartyTurns?.cancelTarget();
 if(def.id==='combined-beam'&&!combinedMech?.canChargeBeam())return;
 if(def.id==='super-combine'&&!combinedMech?.canActivate(robotCombat))return;
 if(combinedMech?.active&&def.clip==='install')return;
 if(combinedMech)def=combinedMech.action(def);
 if(robotCombat){
  if(robotCombat.hp<=0||(def.cost||0)>robotCombat.mp||def.quantity===0)return;
  if(def.clip==='install'&&(!window.RobotCombat.canInstall(config.skillCatalog,def.robotId,config.robots)||window.RobotCombat.living(robotCombat).some(r=>r.id===def.robotId)))return;
  robotCombat.mp-=def.cost||0;if(def.quantity!==undefined)def.quantity--;window.RobotCombat.start(robotCombat,elapsed);updateMechanicHUD();
 }
 const clip=assets[0].actions[def.clip];if(!clip)return;
 if(def.id==='super-combine'){if(!combinedMech.activate(robotCombat))return;deployedRobot=null;robotBlast=null;}
 if(def.id==='combined-beam'&&!combinedMech.chargeBeam())return;
 if(def.rewardItem)def.quantity--;window.PartyTurns?.started(0,kind,elapsed);current={kind,started:elapsed,def,clip,hitApplied:false};if(def.id==='mech-repair'){const r=robotCombat.robots.find(r=>r.serial===robotCombat.repairTargetSerial)||window.RobotCombat.living(robotCombat)[0];current.repairSerial=r.serial;current.repairTarget={x:r.home.x-115,y:r.home.y+65};r.x=r.home.x;r.y=r.home.y;r.action=null;r.repairing=true;}window.DwarfSkills?.before(current);lastPhase='';if(def.id==='super-combine')updateMechanicHUD();
 if(assets[0].id==='wizard'&&def.projectile&&window.WizardCasting){
  current.def={...def,projectile:{...def.projectile,origin:window.WizardCasting.crystal(assets[0],positions[0],frameAt(clip,def.projectile.release,false))}};
 }
 const banner=document.querySelector('#action-banner');banner.textContent=def.name;banner.hidden=!!window.BattleRoar?.isRoar(def);
 paused=false;updatePause();renderLoadout();
}
function setDemo(value){if(value&&(finisher||window.ArcherSkills?.busy||window.WizardSkills?.busy||window.HealerSkills?.busy))return;demo=value;document.querySelector('#demo').textContent=demo?'■ 시연 중지':'▶ 연속 시연';document.querySelector('#demo').setAttribute('aria-pressed',demo);if(demo){demoIndex=0;nextDemo=elapsed;if(!current)startAction(demoActions()[(demoIndex++)%demoActions().length]);}buttons();}
function updatePhase(state){const label=current.def.clip==='combinedAssembly'?'초 합체! · 파츠 조립 / 탑승':current.def.clip==='combinedDrill'&&state.phase==='advancing'?'적 앞으로 돌진':state.phase==='charging'?'가슴 빔 충전 · 다음 턴 발사':state.phase==='beam-recovery'?'가슴 빔 발사 완료 · 턴 종료 대기':state.phase==='acting'?current.def.name+' 사용':phaseNames[state.phase];if(label===lastPhase)return;lastPhase=label;document.querySelector('#phase-label').textContent=label;document.querySelector('#message').textContent=current.def.clip==='item'?'제자리에서 물약 사용':label;}
function primaryPosition(){
 const pos={...positions[4],...(runState.round<3?{y:535,h:enemy().height}:{})};
 if(config.contractStone){
  const now=bossHp<=0?(mainEnemyHit.hitAt??elapsed):elapsed;
  pos.y-=window.ContractStones.hoverHeight(now,pos.h);
 }
 return pos;
}
function enemyTargets(){
 const p=primaryPosition();
 return [{id:'primary',name:enemy().name,maxHp:enemy().max??enemy().hp,isBoss:config.isBoss??runState.round===3,element:enemy().element??assets[4].element??'neutral',attackType:enemy().attackType||(runState.round<3?'melee':'ranged'),...p,...mainEnemyHit,get hp(){return bossHp;},set hp(value){bossHp=value;}},...(window.EnemyFormation?.units||[])];
}
function damageEnemyTargets(targets,amount,area=false,hit={}){
 // Resolve the entire living snapshot synchronously before triggering clear/finisher.
 const living=targets.filter(t=>t.hp>0&&(area||!window.WizardSkills||window.WizardSkills.canSelect(t)));
 const level=equippedWeaponLevels[hit.role];
 if(level)amount=Math.round(amount*(100+GameForge.attackPercent(level))/100);
 for(const target of living){
  let received=window.PartyMonsterBalance?.resolveHit?.(target,amount,hit);
  if(!received){const damage=window.PartyMonsterBalance?.incoming?.(target,amount,hit)??amount;received={damage,landed:damage>0};}
  if(config.contractStone&&!received.landed&&amount>0)config.contractStone.wardAt=elapsed;
  const dealt=window.PartyTurns?.defendEnemy(target,received.damage)??received.damage;
  target.hp=Math.max(0,target.hp-dealt);
  if(received.landed)target.hitAt=elapsed;
  target.damage=dealt;target.damageElement=hit.element||null;target.damageSkill=hit.skillId||null;
  if(dealt>0)window.DungeonCombatAudio?.playerHit(target,hit,dealt);
  if(target.id==='primary'){
   mainEnemyHit={hitAt:received.landed?elapsed:mainEnemyHit.hitAt,damage:dealt,damageElement:hit.element||null,damageSkill:hit.skillId||null};
   if(received.landed)hurtStarted=elapsed;
  }
 }
 updateBossHp();
 return {hp:bossHp,lethal:living.length>0&&enemyTargets().every(t=>t.hp<=0)};
}
function audioHit(actorIndex,hit={}){return {...hit,role:assets[actorIndex]?.id||hit.role};}
function applyPartyDamage(actorIndex,baseDamage,all=false,hit={}){
 const buffed=window.BattleRoar?.damage(actorIndex,baseDamage,elapsed)??baseDamage;
 const amount=window.ArcherSkills?.rollDamage(actorIndex,buffed).amount??buffed;
 const living=enemyTargets().filter(t=>t.hp>0&&(all||!window.WizardSkills||window.WizardSkills.canSelect(t)));
 return damageEnemyTargets(all?living:living.slice(0,1),amount,all,audioHit(actorIndex,hit));
}
// Common receiving path for party-targeted damage; updates real HP and its HUD.
function applyPartyHit(actorIndex,baseDamage){
 const actor=assets[actorIndex];if(!actor||actorIndex<0||actorIndex>=4)return 0;
 const wasAlive=(actor.currentHp??actor.hp)>0;
 const guarded=window.PartyTurns?.defendAlly(actorIndex,baseDamage)??baseDamage;
 const raw=window.DwarfSkills?.incoming(actorIndex,guarded)??guarded;
 const defended=window.BattleRoar?.incomingDamage(actorIndex,raw,elapsed)??raw;
 const amount=window.HealerSkills?.incoming(actorIndex,defended)??defended;
 actor.currentHp=Math.max(0,(actor.currentHp??actor.hp)-amount);
 if(baseDamage>0&&wasAlive)window.DungeonVoices?.hurt(actor.id,actor.currentHp===0);
 if(baseDamage>0){window.PartyTurns?.receivedHit(actorIndex,elapsed);window.PartyPortraits?.hit(actorIndex,elapsed);}
 if(actor.currentHp===0)window.HealerSkills?.fallen(actorIndex);
 if(actorIndex===0&&robotCombat)robotCombat.hp=actor.currentHp;
 const card=document.querySelectorAll('#party .member')[actorIndex];
 if(card){card.querySelector('.stat-line span').textContent=fmt(actor.currentHp)+' / '+fmt(actor.hp);card.querySelector('.bar i').style.width=(100*actor.currentHp/actor.hp)+'%';}
 return amount;
}
// Scripted final-boss defeat bypasses every mitigation path; never approximate with large damage.
function annihilateParty(){
 const victims=assets.slice(0,4).map((a,i)=>({a,i})).filter(({a})=>(a.currentHp??a.hp)>0);
 for(const {a} of victims)a.currentHp=0;
 for(const {i} of victims){window.HealerSkills?.fallen(i);applyPartyHit(i,0);}
 window.PartyMechanic?.reset();
 buttons();
}
function updateBossHp(){
 const hp=Math.max(0,bossHp);document.querySelector('#boss-hp').textContent=fmt(hp);
 document.querySelector('.boss-bar i').style.width=(hp/enemy().max*100)+'%';
 document.querySelector('.boss-bar').setAttribute('aria-valuenow',hp);
}
function beginFinisher(){
 if(finisher)return;
 const focus=enemyTargets().filter(e=>e.hp<=0).sort((a,b)=>(b.hitAt??-1)-(a.hitAt??-1))[0]||enemyTargets()[0];
 finisher={age:0,focus:{...focus},started:elapsed,cinematic:!config.partyTurns||!!config.isBoss};window.BattleDeathPresentation={id:focus.id};setDemo(false);buttons();
 document.querySelector('#scene').classList.toggle('cinematic',finisher.cinematic);
 document.querySelector('#clear-overlay').classList.toggle('simple-clear',!finisher.cinematic);
 document.querySelector('#demo').disabled=true;document.querySelector('#test-clear').disabled=true;
 document.querySelector('#action-banner').hidden=true;
}
function showClear(){
 if(clearShown)return;clearShown=true;runState=window.BattleLoot.clear(runState);
 const speaker=assets.slice(0,4).find(a=>(a.currentHp??a.hp)>0);if(speaker)window.DungeonVoices?.victory(speaker.id);
 document.querySelector('#clear-title').textContent=(config.partyTurns?config.isFinalBoss:runState.round===3)?'DUNGEON CLEAR!!':'CLEAR';
 // Campaign floors keep live buff state until it is checkpointed. Standalone
 // battles retain their original cleanup, and a new expedition starts fresh.
 if(!window.GalleonCampaign)window.HealerSkills?.reset();assets.slice(0,4).forEach((a,i)=>applyPartyHit(i,0));
 const mithril=window.GalleonCampaign&&window.GameForge?GameForge.reward(GalleonCampaign.floor):0;
 document.querySelector('.clear-description').textContent=mithril?'미스릴 +'+mithril:enemy().name+' 처치';
 const clearOverlay=document.querySelector('#clear-overlay');
 clearOverlay.classList.toggle('dungeon-complete',!!config.isFinalBoss);
 clearOverlay.style.setProperty('--clear-reveal','0');
 if(finisher)finisher.clearStarted=elapsed;
 clearOverlay.hidden=false;
 document.querySelector('#phase-label').textContent=runState.round===3?'던전 클리어':'라운드 클리어';
 document.querySelector('#message').textContent=runState.round===3?'던전 클리어':'라운드 클리어';
 document.querySelector('#scene').inert=true;document.querySelector('.hud').inert=true;
 document.querySelector('.preview-controls').inert=true;
 if(finisher?.cinematic===false&&window.GalleonCampaign)finisher.clearAt=elapsed;else window.GalleonCampaign?.clear(elapsed);
 document.querySelector('#replay-clear').focus({preventScroll:true});
}
function resetBattle(){
 if(config.contractStone)delete config.contractStone.wardAt;
 window.DungeonVoices?.reset();window.DungeonCombatAudio?.reset();
 window.BattleDeathPresentation=null;
 window.PartyPortraits?.reset();
 window.PartyTurns?.reset();
 window.HealerSkills?.reset();window.WizardSkills?.reset();window.DwarfSkills?.reset();window.ArcherSkills?.reset();
 window.BattleRoar?.reset();
 window.BattleResurrection?.reset();
 window.EnemyFormation?.reset();mainEnemyHit={hitAt:null,damage:0};
 if(config.superCombine)combinedMech=new window.MechanicCombineBattle();
 assets.slice(0,4).forEach((a,i)=>{a.currentHp=a.hp;applyPartyHit(i,0);});
 finisher=null;clearShown=false;current=null;hurtStarted=null;activeEffect=null;deployedRobot=null;if(robotCombat)robotCombat=window.RobotCombat.create(assets[0].hp,assets[0].mp);combatNotice="";enemyAttackStarted=null;robotBlast=null;bossHp=enemy().hp;paused=false;lastPhase='';
 document.querySelector('#clear-overlay').hidden=true;document.querySelector('#clear-overlay').classList.remove('simple-clear','dungeon-complete');document.querySelector('#loot-overlay').hidden=true;
 document.querySelector('#scene').inert=false;document.querySelector('.hud').inert=false;document.querySelector('.preview-controls').inert=false;
 document.querySelector('#scene').classList.remove('cinematic');document.querySelector('#combat-world').style.transform='scale(1)';document.querySelector('#combat-world').style.transformOrigin='';
 document.querySelector('#action-banner').hidden=true;
 document.querySelector('#demo').disabled=false;document.querySelector('#test-clear').disabled=false;
 setDemo(false);updateEncounter();updatePause();buildMechanicLoadout();renderLoadout();
 document.querySelector('#phase-label').textContent='대기';document.querySelector('#message').textContent='사용할 행동을 선택하세요';
 window.GalleonCampaign?.reset();
}
// Explicit visual preview: all authored summons idle until the player starts an action.
function previewAllMechs(){
 if(!ready||!robotCombat)return;
 runState.stage='battle';resetBattle();
 for(const id of Object.keys(config.robots))window.RobotCombat.install(robotCombat,id,config.skillCatalog,config.robots,elapsed,motion.center);
 deployedRobot=robotCombat.robot;updateMechanicHUD();buttons();
 document.querySelector('#message').textContent='전체 메카 소환 · 행동을 선택하면 전투가 시작됩니다';
}
function testClear(){if(!ready||runState.stage!=='battle')return;resetBattle();const attack=runState.slots.find(s=>s.offensive)||{id:'attack',...definitions.attack};bossHp=attack.damage;for(const u of window.EnemyFormation?.units||[])u.hp=0;updateBossHp();startAction(attack.id,true);}
function tauntBubble(g,p,now){
 const x=Math.round(p.x),y=Math.max(12,Math.round(p.y-p.h-88+Math.sin(now/190)*3));
 g.save();g.shadowColor='#600719';g.shadowBlur=10;g.fillStyle='#4d0717';g.fillRect(x-33,y+4,66,54);
 g.shadowBlur=0;g.fillStyle='#ffb1ad';g.fillRect(x-31,y,62,50);g.fillStyle='#8f152c';g.fillRect(x-28,y+3,56,44);
 g.fillStyle='#d74550';g.fillRect(x-25,y+6,50,17);g.fillStyle='#ffb1ad';g.beginPath();g.moveTo(x-9,y+48);g.lineTo(x+6,y+61);g.lineTo(x+12,y+48);g.fill();
 g.fillStyle='#8f152c';g.beginPath();g.moveTo(x-5,y+46);g.lineTo(x+5,y+55);g.lineTo(x+8,y+46);g.fill();
 g.fillStyle='#520918';g.fillRect(x-4,y+11,12,23);g.fillRect(x-4,y+38,12,9);g.fillStyle='#fff4dc';g.fillRect(x-6,y+8,12,23);g.fillRect(x-6,y+35,12,8);g.restore();
}
function drawTauntBubbles(g,ps,robots,now){
 if(window.PartyStatusIcons?.enabled())return;
 if(finisher||runState.stage!=='battle')return;
 if(config.partyTurns&&window.PartyTurns){
  const sources=new Map();
  for(const e of enemyTargets().filter(e=>e.hp>0)){const source=window.PartyTurns.tauntSource(e);if(!source)continue;tauntBubble(g,e,now);sources.set(source.robot||source.index,source);}
  for(const source of sources.values()){const p=source.robot?{...window.MechFormation[source.robot],h:window.PartyMechanicData.robots[source.robot].height}:ps[source.index];tauntBubble(g,p,now);}
  return;
 }
 const es=enemyTargets().filter(e=>e.hp>0),model=window.DwarfSkills?.model;
 const taunted=(assets[0].currentHp??assets[0].hp)>0?es.filter(e=>model&&model.taunts.get(e.id)===model.turn):[];
 if(taunted.length&&(assets[0].currentHp??assets[0].hp)>0){taunted.forEach(e=>tauntBubble(g,e,now));tauntBubble(g,ps[0],now);}
 const mech=robots.find(r=>r.id==='bulwark'&&r.hp>0&&!r.ending);
 const partyMech=window.PartyMechanic?.state.robot;
 const mechTargets=es.filter(e=>!taunted.includes(e)&&(!config.partyTurns||!e.tauntImmune));
 if(mech&&mechTargets.length){tauntBubble(g,{...mech,h:config.robots.bulwark.height},now);mechTargets.forEach(e=>tauntBubble(g,e,now));}
 else if(partyMech?.id==='bulwark'&&partyMech.hp>0&&mechTargets.length){tauntBubble(g,{...window.MechFormation.bulwark,h:window.PartyMechanicData.robots.bulwark.height},now);mechTargets.forEach(e=>tauntBubble(g,e,now));}
}
function ring(x,y,rx,ry,color,width=3){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.stroke();}
function effects(state,target){
 if(!current||state.phase!=='acting'||window.BattleRoar?.isRoar(current.def)||current.def.target==='all-living-enemies')return;
 if(current.def.projectile){
  const projectile=current.def.projectile,pose=window.FireballVFX.sample(current.def,state.local,positions[0],{x:target.x,y:target.y-target.h*.45});
  if(pose){
   const clip=config.effects[projectile.effect],frame=frameAt(clip,pose.age);
   window.FireballVFX.draw(ctx,effectImages[projectile.effect][frame],pose,projectile);
   document.querySelector('#scene').dataset.projectile=current.def.id;
  }
 }
 const t=state.local-current.def.impact;if(t<0||t>520)return;
 // Text-only feedback. Attack, shield and skill VFX will be supplied separately.
 ctx.save();ctx.globalAlpha=1-t/520;ctx.shadowBlur=0;
 ctx.textAlign='center';ctx.font=config.partyTurns?'36px Galmuri11, monospace':'bold 36px Georgia';
 if(current.def.offensive){
  ctx.fillStyle='#ffe3a0';ctx.fillText('HIT',1160,310-t*.06);
 }else{
  ctx.font=config.partyTurns?'25px Galmuri11, monospace':'bold 25px sans-serif';ctx.fillStyle=current.def.color;
  ctx.fillText(current.def.id==='super-combine'?'초 합체!':current.roarApplied?'전투의 포효':current.def.clip==='item'?'회복':current.def.clip==='install'?'설치':'보호',state.x,state.y-240-t*.035);
 }
 ctx.restore();
}
let battleFrameId=0,battleFrameTimer=0,battleFrameStopped=false;
function requestBattleFrame(callback){
 if(battleFrameStopped)return;
 let delivered=false;
 const deliver=()=>{
  if(delivered||battleFrameStopped)return;
  delivered=true;clearTimeout(battleFrameTimer);window.cancelAnimationFrame(battleFrameId);
  if(document.hidden){requestBattleFrame(callback);return;}
  callback(performance.now());
 };
 battleFrameId=window.requestAnimationFrame(deliver);
 // WebKit may suspend an iframe's animation callbacks across screen changes.
 // A visible game must keep advancing; normal rAF wins and cancels this timer.
 battleFrameTimer=setTimeout(deliver,100);
 return battleFrameId;
}
window.addEventListener('pagehide',()=>{battleFrameStopped=true;window.cancelAnimationFrame(battleFrameId);clearTimeout(battleFrameTimer);});
window.addEventListener('pageshow',event=>{if(event.persisted){battleFrameStopped=false;previous=0;requestBattleFrame(render);}});
function render(now){
 // A full-screen draft has no visible battlefield. Freeze its clock and skip
 // high-density canvas drawing, portraits, statuses and HUD DOM mutations.
 if(!ready||window.EntryLoading?.active||(!document.querySelector('#loot-overlay').hidden&&document.querySelector('#loot-overlay').classList.contains('skill-draft'))){
  previous=now;
  if(document.documentElement.classList.contains('initial-draft')){window.DungeonMusic?.setPaused(false);window.DungeonMusic?.select('lobby');}
  requestBattleFrame(render);return;
 }

 if(window.DungeonMenu?.isOpen)paused=true;
 const delta=previous&&!paused?Math.min(now-previous,100)*speed:0;previous=now;
 if(finisher)finisher.age+=delta;
 const finishFrame=finisher?(finisher.cinematic?window.BattleFinisher.sample(finisher.age):{zoom:1,timeScale:1,clear:true,phase:'defeating'}):null;
 if(config.partyTurns&&window.DungeonMusic&&window.DungeonMusicTrack){
  const lost=assets.slice(0,4).every(a=>(a.currentHp??a.hp)<=0);
  window.DungeonMusic.setPaused(paused||lost);
  const track=window.DungeonMusicTrack({initialDraft:document.documentElement.classList.contains('initial-draft'),cleared:clearShown,boss:config.isBoss,dungeon:window.ActiveDungeon?.id||'01'});
  window.DungeonMusic.select(track);
 }
 window.DungeonVoices?.setPaused(paused);window.DungeonCombatAudio?.setPaused(paused);
 elapsed+=delta*(finishFrame?finishFrame.timeScale:1);window.GalleonCampaign?.update(elapsed);window.PartyPortraits?.update(elapsed,!!finisher||runState.stage==='clear');
 // Assembly is a noninteractive cast sequence, not one of the three combat turns.
 const assembling=current?.def.clip==='combinedAssembly';
 if(assembling&&robotCombat){robotCombat.nextEnemy+=delta;if(robotCombat.incoming){robotCombat.incoming.started+=delta;robotCombat.incoming.at+=delta;}if(enemyAttackStarted!==null)enemyAttackStarted+=delta;}

 if(finishFrame){
  const world=document.querySelector('#combat-world');
  if(!finisher.cinematic){world.style.transform='none';world.style.transformOrigin='';}
  else if(config.partyTurns){
   const camera=window.BattleFinisher.camera(finisher.focus,finisher.age);
   world.style.transformOrigin=camera.origin;world.style.transform=camera.transform;
   document.querySelector('#scene').dataset.finisherTarget=finisher.focus.id;
  }else world.style.transform='scale('+finishFrame.zoom+')';
  document.querySelector('#scene').dataset.cinematic=finishFrame.phase;
  document.querySelector('#scene').dataset.timeScale=finishFrame.timeScale;
  document.querySelector('#phase-label').textContent=finishFrame.phase==='slow'?'마지막 일격':finishFrame.phase==='defeating'?'몬스터 처치':runState.round===3?'던전 클리어':'라운드 클리어';
  const deathsDone=!config.partyTurns||enemyTargets().every(e=>e.hp>0||elapsed-(e.hitAt??0)>=duration((e.spriteAsset||assets[4]).actions.defeated));
  if(finishFrame.clear&&deathsDone)showClear();
  if(clearShown&&finisher.clearStarted!==undefined){
   const overlay=document.querySelector('#clear-overlay'),t=matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,(elapsed-finisher.clearStarted)/240),value=String(t*(2-t));
   if(overlay.style.getPropertyValue('--clear-reveal')!==value)overlay.style.setProperty('--clear-reveal',value);
  }
  if(finisher.clearAt!==undefined&&elapsed-finisher.clearAt>=900&&!finisher.advanced){finisher.advanced=true;window.GalleonCampaign?.clear(elapsed);}
 }else{document.querySelector('#scene').dataset.cinematic='none';document.querySelector('#scene').dataset.timeScale='1';}
 if(ready&&demo&&!current&&!window.WizardSkills?.busy&&!window.HealerSkills?.busy&&!window.ArcherSkills?.busy&&!window.DwarfSkills?.busy&&elapsed>=nextDemo)startAction(demoActions()[(demoIndex++)%demoActions().length]);ctx.clearRect(0,0,1600,700);
 if(ready){
  window.PartyTurns?.update(elapsed);window.HealerSkills?.update(elapsed);window.WizardSkills?.update(elapsed);window.BattleResurrection?.update(elapsed);
  window.DwarfSkills?.update(elapsed);window.ArcherSkills?.update(elapsed);
  window.BattleRoar?.update(elapsed);  if(robotCombat&&!finisher&&runState.stage==='battle'&&!assembling){
   for(const event of window.RobotCombat.step(robotCombat,elapsed,config.robots)){
    if(combinedMech?.event(event,elapsed)){
     combatNotice='초 합체! 3턴 종료 · 합체 해제';
     if(current){current=null;document.querySelector('#action-banner').hidden=true;}
     document.querySelector('#message').textContent=combatNotice;document.querySelector('#phase-label').textContent='합체 해제';
    }
    if(event.type==='attack'||event.type==='expire'||event.type==='reflect'){if(event.type==='expire')robotBlast={started:elapsed,amount:event.amount};hurtStarted=elapsed;const result=window.BattleFinisher.damage(bossHp,event.amount);bossHp=result.hp;updateBossHp();combatNotice=config.robots[event.id].name+(event.type==='expire'?' 3턴 만료 폭발 ':event.type==='reflect'?' 원거리 공격 반사 ':event.id==='rivet'?' 불속성 화염탄 명중 ':' 드릴 타격 ')+event.amount;if(result.lethal)beginFinisher();}
    if(event.type==='robot-hurt')combatNotice=config.robots[event.id].name+(event.id==='bulwark'?' 방패 충격 흡수 ':event.id==='swat'?' 패들 요격 ':' 피격 ')+event.amount+' · 차단 '+event.blocked;
    if(event.type==='expire-start')combatNotice=config.robots[event.id].name+' 자폭 충전 · 예정 피해 '+event.amount;
    if(event.type==='destroyed')combatNotice=config.robots[event.id].name+' 파괴 · 다시 설치할 수 있습니다';
    if(event.type==='incoming'){enemyAttackStarted=elapsed;combatNotice='적 공격 준비';}
    if(event.type==='hurt'){if(window.HealerSkills){assets[0].currentHp=robotCombat.hp+event.amount;applyPartyHit(0,event.amount);}combatNotice=(event.id?config.robots[event.id].name+' 방어 · ':'')+event.blocked+' 차단 / '+event.amount+' 피해';if(robotCombat.hp<=0){combatNotice='메카닉 전투 불능 · 전투 초기화로 재시작';combinedMech?.destroy();current=null;setDemo(false);}}
   }
   deployedRobot=robotCombat.robot;updateMechanicHUD();buttons();
  }
  let state=null;
  if(current){state=current.def.id==='mech-repair'?window.MechanicRepair.pose(elapsed-current.started,positions[0],current.repairTarget,duration(current.clip)):current.def.clip==='combinedDrill'?combinedMech.drillPose(elapsed-current.started,positions[0],{...positions[4],...(runState.round<3?{y:535}:{})}):current.def.clip==='combinedBeam'?combinedMech.beamPose(elapsed,positions[0]):motion.sample(current.def.stationary?'magic':current.def.clip,elapsed-current.started,duration(current.clip),assets[0].id,positions[0]);
   if(finisher){state={...state,...(state.stationary?positions[0]:current.def.clip==='combinedDrill'?{x:state.x,y:state.y}:motion.center),phase:'acting',local:Math.min(duration(current.clip)-1,state.local)};}
   window.BattleRoar?.cast(current,state,elapsed);
   window.DwarfSkills?.cast(current,state,elapsed);
   if(current.def.id==='mech-repair'&&!current.repairApplied&&state.local>=duration(current.clip)){current.repairApplied=true;const result=window.MechanicRepair.repair(robotCombat,config.robots,current.repairSerial);combatNotice=result?'메카 수리 · HP +'+result.healed+' · 남은 3턴':'수리 대상이 사라졌습니다';updateMechanicHUD();}
   if(current.def.id==='mine-explosion'&&!current.mineReleased&&state.local>=current.def.release){current.mineReleased=true;activeEffect={id:current.def.effect,started:elapsed};}
   if(state.phase==='acting'&&!current.preview){window.DungeonVoices?.action(assets[0].id,current.kind,current);window.DungeonCombatAudio?.spell(assets[0].id,current.kind,current,state.local);}else window.DungeonCombatAudio?.stopSpell(current);
   if(state.phase==='acting'&&current.def.offensive&&!current.hitApplied&&state.local>=current.def.impact){
    current.hitApplied=true;
    if(current.def.specialActor==='mechanic')window.MechanicMine?.hit(elapsed);else if(current.def.special)window.HeroSwordBack?.hit(elapsed);
    if(current.def.id!=='mine-explosion'&&config.effects?.[current.def.effect])activeEffect={id:current.def.effect,started:elapsed};const result=current.def.dwarfSkill?damageEnemyTargets(enemyTargets().filter(t=>current.def.target==='all-living-enemies'||t.id===current.dwarfTarget),(window.BattleRoar?.damage(0,current.def.damage,elapsed)??current.def.damage),current.def.target==='all-living-enemies',window.PlayerBalance?.hit('dwarf',current.def.id)):applyPartyDamage(0,current.def.damage,current.def.target==='all-living-enemies',{audioSkillId:current.def.id||current.kind});bossHp=result.hp;updateBossHp();if(result.lethal){if(current.def.target==='all-living-enemies')current.finisherPending=true;else beginFinisher();}
   }
   if(current.finisherPending&&!finisher&&state.local>=duration(current.clip)){current.finisherPending=false;beginFinisher();}
   if(current.def.clip==='install'&&robotCombat&&!current.installApplied&&state.local>=duration(current.clip)){
    window.RobotCombat.install(robotCombat,current.def.robotId,config.skillCatalog,config.robots,elapsed,motion.center);deployedRobot=robotCombat.robot;current.installApplied=true;updateMechanicHUD();
   }
   if(current.def.rewardItem&&!current.hitApplied&&state.phase==='acting'&&state.local>=current.def.impact){current.hitApplied=true;if(current.def.rewardItem==='heal'){assets[0].currentHp=Math.min(assets[0].hp,(assets[0].currentHp??assets[0].hp)+current.def.value);applyPartyHit(0,0);}else window.WizardSkills?.restoreMp(window.WizardSkills.mp+current.def.value);}
   if(robotCombat&&current.def.clip==='item'&&!current.hitApplied&&state.local>=current.def.impact){current.hitApplied=true;robotCombat.hp=Math.min(assets[0].hp,robotCombat.hp+600);updateMechanicHUD();}
   if(state.phase==='complete'){
   if(current.def.id==='mech-repair'){const r=robotCombat?.robots.find(r=>r.serial===current.repairSerial);if(r)r.repairing=false;}
   if(!window.PartyTurns&&!window.DwarfSkills&&!window.ArcherSkills){window.HealerSkills?.endTurn();window.BattleRoar?.completeTurn(elapsed);}
   if(!finisher){window.DwarfSkills?.complete(elapsed);window.ArcherSkills?.completeTurn(elapsed);}
   document.querySelector('#message').textContent='사용할 행동을 선택하세요';document.querySelector('#phase-label').textContent='대기';document.querySelector('#action-banner').hidden=true;
   current=null;state=null;nextDemo=elapsed+850;buttons();
  }else if(!finisher)updatePhase(state);}
  const actor={...positions[0],...(state?{x:state.x,y:state.y}:{})},scene=document.querySelector('#scene');
  scene.dataset.beamPhase=combinedMech?.beam?.phase||'';scene.dataset.combined=String(!!combinedMech?.active);scene.dataset.combineTurns=String(combinedMech?.remainingTurns||0);scene.dataset.combatTurn=String((robotCombat?.turn||0)+1);
  scene.dataset.phase=state?.phase||'idle';scene.dataset.action=current?.kind||'';scene.dataset.actorX=actor.x.toFixed(2);scene.dataset.actorY=actor.y.toFixed(2);scene.dataset.actionFrame=state?.phase==='acting'?String(frameAt(current.clip,state.local,false)):'-1';
  const renderPositions=[actor,...positions.slice(1)].map(p=>({...p}));if(window.PartyBasicActions)renderPositions.slice(0,4).forEach((p,i)=>{const h=window.PartyBasicActions.pose(i,elapsed);if(h?.x!==undefined)Object.assign(p,{x:h.x,y:h.y});});if(window.PartyHero){const h=window.PartyHero.pose(window.PartyHero.caster,elapsed);if(h?.x!==undefined)Object.assign(renderPositions[window.PartyHero.caster],{x:h.x,y:h.y});}renderPositions[4]=primaryPosition();
  renderPositions.forEach((p,i)=>{
   if(i===4&&config.contractStone){
    const fade=bossHp>0?1:Math.max(0,1-(elapsed-(mainEnemyHit.hitAt??0))/duration(assets[4].actions.defeated));
    window.ContractStones.drawShadow(ctx,positions[4],elapsed,fade);return;
   }
   ctx.fillStyle=i===4?'#02080d85':'#02080d65';ctx.beginPath();ctx.ellipse(p.x,p.y+6,i===4?150:65,i===4?22:13,0,0,Math.PI*2);ctx.fill();});
  ctx.shadowColor='#40e5d1';ctx.shadowBlur=13;ring(actor.x,actor.y+2,85,17,'#66ffe9');ctx.shadowBlur=0;
  if(!current){ctx.fillStyle='#ffe3a0';ctx.beginPath();ctx.moveTo(actor.x-12,actor.y-242);ctx.lineTo(actor.x+12,actor.y-242);ctx.lineTo(actor.x,actor.y-225);ctx.closePath();ctx.fill();}
  for(const r of robotCombat?.robots||[])window.RobotCombat.position(r);
  const fieldRobots=(robotCombat?.robots||[]).slice().sort((a,b)=>a.y-b.y),robotVisible=fieldRobots.length>0;scene.dataset.robotCount=String(fieldRobots.length);scene.dataset.robotTypes=fieldRobots.map(r=>r.id).join(',');
  scene.dataset.robotHp=String(deployedRobot?.hp??0);scene.dataset.robotTurns=String(deployedRobot?.turns??0);
  scene.dataset.robotInstalled=String(!!deployedRobot);
  scene.dataset.robotX=deployedRobot?String(deployedRobot.x):'';scene.dataset.robotY=deployedRobot?String(deployedRobot.y):'';
  scene.dataset.robotType=deployedRobot?.id||'';scene.dataset.robotDamage=String(robotCombat?.damage||0);scene.dataset.robotBlocked=String(robotCombat?.blocked||0);scene.dataset.playerHp=String(robotCombat?.hp??assets[0].hp);scene.dataset.robotClip=deployedRobot?.action?.clip||'idle';
  function drawRobot(deployedRobot){if(!deployedRobot)return;const visual=window.RobotVFX.pose(deployedRobot,elapsed,renderPositions[4],config.robots[deployedRobot.id].height),r=config.robots[deployedRobot.id],clip=deployedRobot.action?.clip||'idle',data=r.actions[clip],time=elapsed-(deployedRobot.action?.started??deployedRobot.started),scale=r.height/(r.sourceHeight||400),frame=frameAt(data,time,clip==='idle');scene.dataset.robotFrame=String(frame);scene.dataset.robotTravelPhase=visual.phase||'';scene.dataset.robotVisualX=String(visual.x);scene.dataset.robotVisualY=String(visual.y);if(deployedRobot.ending){window.RobotVFX.robot(ctx,deployedRobot,r,robotImages[deployedRobot.id+':idle'][0],elapsed);return;}ctx.drawImage(robotImages[deployedRobot.id+':'+clip][frame],Math.round(window.RobotVFX.pose(deployedRobot,elapsed,renderPositions[4],config.robots[deployedRobot.id].height).x-r.anchor[0]*scale),Math.round(window.RobotVFX.pose(deployedRobot,elapsed,renderPositions[4],config.robots[deployedRobot.id].height).y-r.anchor[1]*scale),Math.round(r.size[0]*scale),Math.round(r.size[1]*scale));ctx.fillStyle='#101820';ctx.fillRect(visual.x-40,visual.y-r.height-8,80,8);ctx.fillStyle=deployedRobot.removeAt!==undefined?'#ff754d':'#71e6bb';ctx.fillRect(visual.x-40,visual.y-r.height-8,80*deployedRobot.hp/r.maxHp,8);ctx.font=config.partyTurns?'14px Galmuri11, monospace':'14px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff0c9';ctx.fillText(deployedRobot.hp+'/'+r.maxHp+' · '+deployedRobot.turns+'/3턴',visual.x,visual.y-r.height-15);}

  if(combinedMech?.active&&current?.def.clip==='combinedBeam'&&state)window.MechanicBeamVFX?.draw(ctx,actor,renderPositions[4],state,elapsed);
  window.HeroPrincess?.drawBack(ctx,current,state);window.PartyHero?.drawBack(ctx,elapsed);
  scene.dataset.princessFrame=String(window.HeroPrincess?.frame(current,state)??-1);
  scene.dataset.enemies=JSON.stringify(enemyTargets().map(t=>({id:t.id,hp:t.hp,hitAt:t.hitAt})));
  window.MonsterAttackVFX?.draw(ctx,'back',elapsed,renderPositions,enemyTargets());
  window.WizardSkills?.drawGround(ctx,elapsed);
  window.HealerSkills?.drawField(ctx,'back',renderPositions,elapsed);
  window.DwarfSkills?.draw(ctx,'back',actor,renderPositions[4],current,state,elapsed);
  let robotDrawn=0;
  [...renderPositions.keys()].sort((a,b)=>renderPositions[a].y-renderPositions[b].y).forEach(i=>{
   if(i===mechanicIndex && window.MechFormation?.rivet.behindMechanic)window.PartyMechanic?.drawRivet?.(ctx,elapsed);
   if(i===4&&bossHp<=0&&(window.PartyTurns?!window.PartyTurns.enemyPose('primary',elapsed):!finisher))return;
   const wrapped=i===4&&!!window.WizardSkills&&bossHp>0;
   if(wrapped&&!window.WizardSkills.beginEnemy(ctx,enemyTargets()[0],elapsed))return;
   try {
   const p=renderPositions[i];while(robotDrawn<fieldRobots.length&&p.y>=fieldRobots[robotDrawn].y)drawRobot(fieldRobots[robotDrawn++]);let clip='idle',time=elapsed+i*97;
   if(i===0&&state?.phase==='acting'){clip=current.def.clip;time=state.local;}
   if(i===0&&['dwarf','hero'].includes(assets[0].id)&&assets[0].actions.forward&&state){
    if(state.phase==='advancing'){clip='forward';time=state.phaseTime/motion.travel*duration(assets[0].actions.forward);}
    if(state.phase==='returning'){clip='return';time=state.phaseTime/motion.retreat*duration(assets[0].actions.return);}
    if(state.phase==='turning'){clip='turn';time=state.phaseTime;}
    if(state.phase==='facing'){clip=assets[0].actions.face?'face':'turn';time=clip==='face'?state.phaseTime:Math.max(0,duration(assets[0].actions.turn)-1-state.phaseTime);}
   }
   if(i===0&&assets[0].id==='mechanic'&&state&&!combinedMech?.active){
    if(state.phase==='advancing'||state.phase==='settling'){clip='forward';time=state.phase==='settling'?duration(assets[0].actions.forward)-1:state.phaseTime;}
    if(['turning','returning','facing'].includes(state.phase)){clip='return';time=state.phaseTime;}
   }
   if(i===4&&window.PartyTurns){const pose=window.PartyTurns.enemyPose('primary',elapsed);if(pose){clip=pose.clip;time=pose.time;}}
   if(i===4&&bossHp>0&&enemyAttackStarted!==null&&assets[4].actions.attack&&elapsed-enemyAttackStarted<duration(assets[4].actions.attack)){clip='attack';time=elapsed-enemyAttackStarted;}
   if(i===4&&bossHp>0&&window.GalleonPreview?.clip){clip=window.GalleonPreview.clip;time=elapsed-window.GalleonPreview.started;if(time>=duration(assets[4].actions[clip])){window.GalleonPreview.clip=null;clip='idle';time=elapsed;}}
   if(i===4&&bossHp>0&&hurtStarted!==null&&elapsed-hurtStarted<duration(assets[4].actions.hurt)){clip='hurt';time=elapsed-hurtStarted;}
   if(i===4&&!window.PartyTurns&&finisher&&finisher.age>=1100){clip='defeated';time=finisher.age-1100;}
   if(i===4&&runState.round<3){
    const tex=finisher&&finisher.age>=1100?normalDefeated:normalIdle,scale=p.h/360;
    ctx.drawImage(tex,Math.round(p.x-tex.width*scale/2),Math.round(p.y-tex.height*scale),Math.round(tex.width*scale),Math.round(tex.height*scale));return;
   }
   if(i===0&&combinedMech?.active){
    clip=current?.def.clip?.startsWith('combined')?current.def.clip:'combinedIdle';
    time=current?.def.clip?.startsWith('combined')?(state?.local||0):elapsed;
    if(!current&&combinedMech.hurtAt!==null&&elapsed-combinedMech.hurtAt<duration(assets[0].actions.combinedHurt)){clip='combinedHurt';time=elapsed-combinedMech.hurtAt;}
    const combinedClip=assets[0].actions[clip],frame=frameAt(combinedClip,time,clip==='combinedIdle'),scale=p.h/371*2; // Match pilot head/body proportions: seated pilot artwork is half the normal mechanic source size.
    scene.dataset.actorClip=clip;scene.dataset.actorFrame=String(frame);
    ctx.drawImage(actionImages['0:'+clip][frame],Math.round(p.x-320*scale),Math.round(p.y-650*scale),Math.round(768*scale),Math.round(768*scale));return;
   }
   if(i<4&&window.DwarfSkills){const dwarfPose=window.DwarfSkills.pose(i,elapsed);if(dwarfPose){clip=dwarfPose.clip;time=dwarfPose.time;}}
   if(i<4&&window.ArcherSkills){const pose=window.ArcherSkills.pose(i,elapsed);if(pose){clip=pose.clip;time=pose.time;}}
   if(i<4&&window.WizardSkills){const wp=window.WizardSkills.pose(i,elapsed);if(wp){clip=wp.clip;time=wp.time;}}
   if(i<4&&window.HealerSkills){const pose=window.HealerSkills.pose(i,elapsed);if(pose){clip=pose.clip;time=pose.time;}}
   if(i<4&&window.PartyTurns){const pose=window.PartyTurns.pose(i,elapsed);if(pose){clip=pose.clip;time=pose.time;}}
   if(i<4&&window.BattleResurrection){const resurrectionPose=window.BattleResurrection.pose(i,elapsed);if(resurrectionPose){clip=resurrectionPose.clip;time=resurrectionPose.time;}if(window.BattleResurrection.hidden(i,elapsed))return;}
   if(i<4&&window.PartyTurns)scene.dataset['allyClip'+i]=clip;
   const data=clip==='idle'?assets[i]:assets[i].actions[clip];
   if(i===4){scene.dataset.enemyClip=clip;scene.dataset.enemyFrame=String(frameAt(data,time,clip==='idle'));}
   const loop=clip==='idle'||(assets[i].id!=='mechanic'&&['forward','return'].includes(clip)),frame=frameAt(data,time,loop);
   if(i===0){scene.dataset.actorClip=clip;scene.dataset.actorFrame=String(frame);}
   window.BattleRoar?.draw(ctx,'back',i,p,elapsed);
   if(i===0)window.WizardCasting?.draw(ctx,'back',assets[i],p,current,state,frame);
   if(i===window.WizardSkills?.caster)window.WizardSkills.aura(ctx,'back',renderPositions,elapsed);
   window.HealerSkills?.draw(ctx,'back',i,p,elapsed);
   window.ArcherSkills?.aura(ctx,'back',i,p,elapsed);
   if(!(i===4&&window.MonsterAttackVFX?.drawActor(ctx,'primary',p,elapsed,clip,enemyTargets(),renderPositions)))drawSprite(i,frame,p.x,p.y,p.h,clip);
   window.ArcherSkills?.aura(ctx,'front',i,p,elapsed);
   window.HealerSkills?.draw(ctx,'front',i,p,elapsed);
   if(i===window.WizardSkills?.caster)window.WizardSkills.aura(ctx,'front',renderPositions,elapsed);
   if(i===0&&clip==='swordBack')window.HeroSwordBack?.draw(ctx,frame,p.x,p.y,p.h,assets[0].bounds);
   if(i===0)window.WizardCasting?.draw(ctx,'front',assets[i],p,current,state,frame);
   window.BattleRoar?.draw(ctx,'front',i,p,elapsed);
   }finally{if(wrapped)ctx.restore();}
  });
  window.EnemyFormation?.draw(ctx,elapsed,renderPositions,enemyTargets());
  window.EnemyStatus?.update(enemyTargets(),!!finisher||runState.stage!=='battle');
  window.MonsterAttackVFX?.draw(ctx,'front',elapsed,renderPositions,enemyTargets());
  window.EnemyFormation?.feedback(ctx,enemyTargets(),elapsed);
  window.HealerSkills?.drawEnemy(ctx,elapsed);
  window.HealerSkills?.drawField(ctx,'front',renderPositions,elapsed);
  window.BattleResurrection?.draw(ctx,renderPositions,elapsed);window.PartyTurns?.draw(ctx,renderPositions,elapsed);
  window.DwarfSkills?.draw(ctx,'front',actor,renderPositions[4],current,state,elapsed);window.ArcherSkills?.draw(ctx,renderPositions,elapsed);
  renderPositions.slice(0,4).forEach((p,i)=>window.BattleRoar?.drawStatus(ctx,i,p,elapsed));
  while(robotDrawn<fieldRobots.length)drawRobot(fieldRobots[robotDrawn++]);
  scene.dataset.robotReflection=String(fieldRobots.some(r=>r.reflectedAt!==undefined&&elapsed-r.reflectedAt>=150&&elapsed-r.reflectedAt<750));scene.dataset.robotFireball=String(fieldRobots.some(r=>r.id==='rivet'&&r.action?.clip==='attack'&&elapsed-r.action.started>=110&&elapsed-r.action.started<510));
  for(const r of fieldRobots){const height=config.robots[r.id].height;window.RobotVFX.weapon(ctx,r,elapsed,renderPositions[4],height);window.RobotVFX.status(ctx,r,elapsed,height);window.RobotVFX.reflection(ctx,r,elapsed,renderPositions[4],height);}
  drawTauntBubbles(ctx,renderPositions,fieldRobots,elapsed);
  scene.dataset.robotEnding=deployedRobot?.ending?.kind||'';scene.dataset.robotBlast=String(!!robotBlast&&elapsed-robotBlast.started<900);
  if(robotBlast)window.RobotVFX.impact(ctx,robotBlast,elapsed,renderPositions[4]);
  scene.dataset.buffEffect=window.BattleRoar?.frame(elapsed)>=0?'battle-roar':'';
  scene.dataset.buffEffectFrame=String(window.BattleRoar?.frame(elapsed)??-1);
  scene.dataset.hitEffect='';scene.dataset.hitEffectFrame='-1';
  scene.dataset.projectile='';
  if(activeEffect){
   const effect=config.effects[activeEffect.id],age=elapsed-activeEffect.started;
   if(age>=duration(effect))activeEffect=null;
   else{const frame=frameAt(effect,age,false),p=renderPositions[4],size=effect.size;
    const anchor=effect.anchor||[64,64];
    ctx.drawImage(effectImages[activeEffect.id][frame],Math.round(p.x-size*anchor[0]/128),Math.round(p.y-(effect.ground?0:p.h*.45)-size*anchor[1]/128),size,size);
    scene.dataset.hitEffect=activeEffect.id;scene.dataset.hitEffectFrame=String(frame);
   }
  }
  if(robotCombat?.incoming&&!finisher){
   const incoming=robotCombat.incoming,t=Math.min(1,(elapsed-incoming.started)/(incoming.at-incoming.started)),target=fieldRobots.find(r=>r.serial===incoming.serial)||actor;
   const x=renderPositions[4].x+(target.x-renderPositions[4].x)*t,y=renderPositions[4].y-160+(target.y-(target.id?80*config.robots[target.id].height/140:80)-(renderPositions[4].y-160))*t;
   ctx.fillStyle='#ef713a';ctx.fillRect(Math.round(x)-8,Math.round(y)-8,16,16);ctx.fillStyle='#ffdfa0';ctx.fillRect(Math.round(x)-4,Math.round(y)-4,8,8);
  }
  if(state)effects(state,renderPositions[4]);
  window.WizardSkills?.draw(ctx,renderPositions,elapsed);
  if(!finisher)window.PartyStatusIcons?.draw(ctx,renderPositions,enemyTargets(),elapsed);
 }requestBattleFrame(render);
}
if(config.robots)document.querySelector('#mechanic-reset').onclick=()=>{runState.stage='battle';runState.slots=runState.slots.map(slot=>({...slot,...(slot.quantity!==undefined?{quantity:config.skillCatalog.find(s=>s.id===slot.id)?.quantity??slot.quantity}:{})}));resetBattle();};
const pauseButton=document.querySelector('#pause');
function updatePause(){pauseButton.textContent=paused?'▶ 재생':'Ⅱ 일시정지';pauseButton.setAttribute('aria-pressed',paused);}
pauseButton.onclick=()=>{paused=!paused;updatePause();};updatePause();
document.querySelector('#speed').onchange=e=>speed=Number(e.target.value);
document.querySelector('#demo').onclick=()=>setDemo(!demo);
 document.querySelector('#test-clear').onclick=testClear;
 document.querySelector('#replay-clear').onclick=openLoot;
 document.querySelector('#loot-back').onclick=()=>{runState=window.BattleLoot.back(runState);renderLoot();};
 document.querySelector('#loot-skip').onclick=()=>{runState=window.BattleLoot.skip(runState);continueRun();};
 document.querySelector('#loot-restart').onclick=()=>restartRun();
 document.querySelector('#round-select').onchange=e=>restartRun(Number(e.target.value));
 document.querySelector('#reset-battle').onclick=()=>{resetBattle();document.querySelector('.command-grid button')?.focus();};
document.querySelectorAll('.command-grid [data-action]').forEach(b=>b.onclick=()=>startAction(b.dataset.action));
document.addEventListener('keydown',e=>{
 if(window.PartyTurns?.manual&&/^[1-6]$/.test(e.key)){
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')||document.querySelector('#loot-overlay:not([hidden]),#party-setup:not([hidden]),#clear-overlay:not([hidden]),#party-defeat:not([hidden]),dialog[open]'))return;
  e.preventDefault();const button=document.querySelector('.command-grid [data-slot="'+(Number(e.key)-1)+'"]');if(button?.dataset.action&&!button.disabled){button.focus({preventScroll:true});button.click();}return;
 }
 if(e.target.matches('select,input,textarea,button')||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='6'&&!demo&&window.HeroPrincess?.skill){e.preventDefault();startAction('princess-im-coming');return;}if(e.key==='5'&&!demo&&window.HeroSwordBack?.skill){e.preventDefault();startAction('sword-back');return;}if(/^[1-4]$/.test(e.key)&&!demo){e.preventDefault();const id=window.PartyTurns?.manual?document.querySelectorAll('.command-grid [data-action]')[Number(e.key)-1]?.dataset.action:demoActions()[Number(e.key)-1];if(id)startAction(id);}});
document.querySelector('#fullscreen').onclick=async()=>{try{await window.GameScreen.toggleFullscreen();}catch{document.querySelector('#message').textContent='이 브라우저에서는 전체화면을 지원하지 않습니다';}};
// The authored loaders enumerate their own URLs. A discovery pass stores no
// decoded images and runs while rendering is gated; the binding pass replaces
// every placeholder with the cached real image before mount/ready.
async function loadResources(load){
 await window.PartyPortraits?.load(load);await window.PartyMechanic?.load(load);await window.PartyHero?.load(load);await window.WizardSkills?.load(load);await window.DwarfSkills?.load(load);await window.ArcherSkills?.load(load);
 if(config.superCombine)await window.MechanicBeamVFX?.load(load);
 await window.BattleResurrection?.load(load);await window.HealerSkills?.load(load);
 await window.HeroSwordBack?.load(load);
 await window.HeroPrincess?.load(load);
 await window.EnemyFormation?.load(load);
 await window.MonsterAttackVFX?.load(load);
 await window.BattleRoar?.load(load);
 await window.PartyStatusIcons?.load(load);
 images.push(...await Promise.all(assets.map(a=>Promise.all(a.frames.map(load)))));portraits.push(...await Promise.all(assets.slice(0,4).map(a=>load(a.portrait))));
 await Promise.all(assets.flatMap((a,i)=>Object.entries(a.actions||{}).map(async([key,clip])=>{actionImages[i+':'+key]=await Promise.all(clip.frames.map(load));})));

}
async function preloadBattle(){
 const files=new Set();
 await loadResources(async src=>{files.add(src);return null;});
 files.add('assets/melee-demon-sheet.webp');
 for(const effect of Object.values(config.effects||{}))effect.frames.forEach(src=>files.add(src));
 for(const robot of Object.values(config.robots||{}))for(const clip of Object.values(robot.actions))clip.frames.forEach(src=>files.add(src));
 if(window.ActiveDungeon?.environment)files.add('../imagegen/dungeon-concepts-v2/'+ActiveDungeon.environment+'.webp');
 if(assets.some(a=>a.id==='wizard'))for(const layer of ['back','front'])for(let i=1;i<=9;i++)files.add(`../effects/battle-roar-v1/frames/${layer}/aura-${String(i).padStart(2,'0')}.webp`);
 const sources=[...files];let next=0;
 window.EntryLoading?.plan(sources.length+2);
 await Promise.all(Array.from({length:8},async()=>{
  while(next<sources.length){const src=sources[next++];await load(src);window.EntryLoading?.loaded();}
 }));
}
async function init(){
 await preloadBattle();
 if(window.GalleonCampaign&&window.GameForge)equippedWeaponLevels=(await GameForge.read()).levels;
 images.length=0;portraits.length=0;
 await loadResources(load);
 const wi=assets.findIndex(a=>a.id==='wizard');if(wi>=0)await window.WizardCasting?.load(load,actionImages[wi+':magic']);
 await Promise.all(Object.entries(config.effects||{}).map(async([id,effect])=>{effectImages[id]=await Promise.all(effect.frames.map(load));}));
 await Promise.all(Object.entries(config.robots||{}).flatMap(([id,r])=>Object.entries(r.actions).map(async([clip,data])=>{robotImages[id+':'+clip]=await Promise.all(data.frames.map(load));})));
 await loadNormalEnemy();buildUI();window.PartyPortraits?.mount();
 window.WizardSkills?.mount({now:()=>elapsed,busy:()=>!ready||!!current||!!finisher||(demo&&assets[0].id!=='wizard')||!!window.HealerSkills?.busy||runState.stage!=='battle'||!!window.BattleResurrection?.active||!!window.ArcherSkills?.busy||!!window.DwarfSkills?.blocksWizard,resume:()=>{paused=false;updatePause();},buttons,notice:text=>{document.querySelector('#message').textContent=text;},enemies:enemyTargets,finish:beginFinisher,damage:(i,targets,amount,area,hit)=>damageEnemyTargets(targets,window.BattleRoar?.damage(i,amount,elapsed)??amount,area,audioHit(i,hit))});
 window.DwarfSkills?.mount({intent:()=>enemy().intent,isDemo:()=>demo,startSpecial:()=>startAction('dwarf-wake'),now:()=>elapsed,busy:()=>!!current||!!finisher||demo||runState.stage!=='battle'||!!window.BattleResurrection?.active||!!window.ArcherSkills?.busy||window.WizardSkills?.busy||window.HealerSkills?.busy,blocked:()=>!!finisher||runState.stage!=='battle'||!!window.BattleResurrection?.active||!!window.ArcherSkills?.busy||window.WizardSkills?.busy||window.HealerSkills?.busy,resume:()=>{paused=false;updatePause();},buttons,notice:text=>{document.querySelector('#message').textContent=text;},isBoss:()=>!config.partyTurns&&(config.isBoss??runState.round===3),enemies:()=>enemyTargets().map(t=>t.id==='primary'?{...t,name:enemy().name,get tauntImmune(){return enemy().tauntImmune??runState.round===3;},set tauntImmune(v){enemy().tauntImmune=v;}}:t),enemyAttack:()=>{enemyAttackStarted=elapsed;},hit:applyPartyHit});
 window.ArcherSkills?.mount({now:()=>elapsed,busy:()=>!!current||!!finisher||demo||runState.stage!=='battle'||!!window.DwarfSkills?.blocksArcher||!!window.WizardSkills?.busy||window.HealerSkills?.busy||!!window.BattleResurrection?.active,resume:()=>{paused=false;updatePause();},buttons,notice:text=>{document.querySelector('#message').textContent=text;},enemies:enemyTargets,enemyAttack:()=>{enemyAttackStarted=elapsed;},hit:applyPartyHit,finish:beginFinisher,damage:(i,targets,base,area=true,hit={})=>{for(const t of targets){const n=window.BattleRoar?.damage(i,base,elapsed)??base;damageEnemyTargets([t],window.ArcherSkills.rollDamage(i,n).amount,area,audioHit(i,hit));}return{hp:bossHp,lethal:enemyTargets().every(t=>t.hp<=0)};}});
 window.HealerSkills?.mount({now:()=>elapsed,busy:()=>!ready||!!current||!!finisher||demo||runState.stage!=='battle'||!!window.BattleResurrection?.active||!!window.WizardSkills?.busy||!!window.ArcherSkills?.busy||!!window.DwarfSkills?.blocksHealer,resume:()=>{paused=false;updatePause();},buttons,enemies:enemyTargets,notice:text=>{document.querySelector('#message').textContent=text;},finish:beginFinisher,outgoing:(i,amount)=>window.BattleRoar?.damage(i,amount,elapsed)??window.HealerSkills.damage(i,amount),damageResolved:(targets,amount,area,hit)=>damageEnemyTargets(targets,amount,area,audioHit(window.HealerSkills.caster,hit)),damage:(i,targets,amount,area,hit)=>damageEnemyTargets(targets,window.BattleRoar?.damage(i,amount,elapsed)??window.HealerSkills.damage(i,amount),area,audioHit(i,hit)),sync:i=>{applyPartyHit(i,0);buttons();}});
 window.HeroSwordBack?.mount(startAction);window.HeroPrincess?.mount(startAction);buildMechanicLoadout();ready=true;window.BattleResurrection?.mount({now:()=>elapsed,busy:()=>!!current||!!finisher||demo||runState.stage!=='battle'||!!window.DwarfSkills?.busy||window.ArcherSkills?.busy||window.WizardSkills?.busy||window.HealerSkills?.busy,resume:()=>{paused=false;updatePause();buttons();},commands:buttons,defeat:i=>{assets[i].currentHp=0;window.HealerSkills?.fallen(i);applyPartyHit(i,0);buttons();},damage:(i,n)=>{applyPartyHit(i,n);buttons();},sync:i=>{applyPartyHit(i,0);buttons();}});if(window.DwarfSkills&&document.querySelector('.resurrection-controls'))document.querySelector('.dwarf-controls').append(document.querySelector('.resurrection-controls'));if(document.querySelector('.wizard-controls'))document.querySelector('.screen').after(document.querySelector('.wizard-controls'));renderLoadout();updateEncounter();document.querySelector('#loading').hidden=true;document.querySelector('#demo').disabled=false;document.querySelector('#test-clear').disabled=false;updateBossHp();buttons();
 window.PartyTurns?.mount({annihilate:annihilateParty,slots:()=>runState.slots,startPlayer:startAction,now:()=>elapsed,enemies:enemyTargets,busy:()=>!!current||!!finisher||!!window.ArcherSkills?.busy||!!window.WizardSkills?.busy||!!window.HealerSkills?.busy||!!window.BattleResurrection?.active,finished:()=>!!finisher||runState.stage!=='battle',buttons,damage:(i,es,n,area,hit)=>damageEnemyTargets(es,window.BattleRoar?.damage(i,n,elapsed)??n,area,audioHit(i,hit)),hit:applyPartyHit,finish:beginFinisher,resume:()=>{paused=false;updatePause();},reset:()=>{runState.stage='battle';resetBattle();},notice:t=>{document.querySelector('#message').textContent=t;}});
 window.GalleonCampaign?.mount({slots:()=>runState.slots.map(s=>({...s})),setSlots:slots=>{runState.slots=slots.map(s=>({...s}));window.PartyTurns?.setPlayerSlots(runState.slots);renderLoadout();},enemies:enemyTargets,sync:i=>applyPartyHit(i,0),completed:()=>{bossHp=0;for(const e of window.EnemyFormation?.units||[])e.hp=0;runState.stage='clear';clearShown=true;updateBossHp();buttons();}});
}
document.querySelector('#preview-all-mechs')?.addEventListener('click',previewAllMechs);
let initializationStarted=false;
function initializeBattle(){
 if(initializationStarted)return;initializationStarted=true;
 window.EntryLoading?.begin();
 // Sound effects may load in the background; network/decode stalls must not block play.
 Promise.resolve(window.DungeonCombatAudio?.prepare()).catch(error=>console.warn('Audio preload deferred',error));
 init().then(async()=>{window.EntryLoading?.loaded();await window.EntryLoading?.finish();window.CampaignAssets?.prefetchNext();if(new URLSearchParams(location.search).get('showcase')==='all-mechs')previewAllMechs();}).catch(error=>{window.EntryLoading?.fail(error);document.querySelector('#loading').textContent='애니메이션을 불러오지 못했습니다. 다시 시도해 주세요.';console.error(error);});
}
window.addEventListener('campaignprepared',initializeBattle,{once:true});
// Skill descriptions/icons need no combat PNGs. Load animations only after
// all four members have confirmed their starting skills.
if(window.GalleonCampaign?.prepare())window.EntryLoading?.finish().catch(error=>window.EntryLoading?.fail(error));
else initializeBattle();

document.addEventListener('visibilitychange',()=>previous=0);requestBattleFrame(render);
