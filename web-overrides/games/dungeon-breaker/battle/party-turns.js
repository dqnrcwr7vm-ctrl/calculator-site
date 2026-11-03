(function(root){
'use strict';
const BALANCE={enemyGuard:.2,crabGuard:.4,poison:60,rootOutgoing:.8,rootIncoming:1.25,blindOutgoing:.7,endTurnMana:.03,endTurnShortageHp:.03};
const hp=a=>a.currentHp??a.hp,kind=s=>typeof s==='string'?s:s.kind;
function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function deal(pool,rng){const a=[...pool];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,4);}
function actionPriority(id){
 if(['recovery','healing','resurrection','sanctuary','item','mechanic-item','mech-repair'].includes(id)||id.endsWith('-potion'))return 0;
 if(['blessing','barrier','natures-cure','eagle-eye','magic','hero-roar','guard','dwarf-bulwark','mechanic-guard','combined-guard','party-end-turn'].includes(id)||id.endsWith('-guard'))return 1;
 if(id==='dwarf-taunt')return 2;
 if(id.startsWith('install-')||id==='super-combine')return 3;
 return 4;
}
class TurnCycle{
 constructor(order=[0,1,2,3]){this.order=order;this.reset();}
 reset(){this.turn=1;this.phase='allies';this.next=this.order[0];this.actor=null;this.acted=new Set();}
 start(i){if(this.phase!=='allies'||this.actor!==null||i!==this.next||this.acted.has(i))return false;this.actor=i;return true;}
 complete(){if(this.actor===null)return false;this.acted.add(this.actor);this.next=this.order[this.order.indexOf(this.actor)+1]??4;this.actor=null;return true;}
 skipDead(party){while(this.next<4&&hp(party[this.next])<=0){this.acted.add(this.next);this.next=this.order[this.order.indexOf(this.next)+1]??4;}if(this.next>=4&&this.actor===null)this.phase='enemies';}
 end(){this.turn++;this.phase='allies';this.next=this.order[0];this.actor=null;this.acted.clear();}
}
// Encounter behavior and numbers are provisional play-test settings.
function planMonster(id,turn,grabbed=false){
 const basic=(name,damage)=>({name,damage,clip:'attack',target:'single'});
 const skill=(name,damage,extra={})=>({name,damage,clip:'special',target:'single',...extra});
 switch(id){
 case 'drowned-sailor':return grabbed?skill('밧줄 끌어당기기',360,{pull:true}):turn%2===0?skill('밧줄 붙잡기',180,{status:'root'}):basic('익사자의 손톱',240);
 case 'giant-crab':return turn%3===0?{name:'단단한 껍질',damage:0,clip:'guard',target:'self'}:turn%2===0?skill('집게 붙잡기',320,{status:'root'}):basic('집게 강타',260);
 case 'deep-sea-eel':return turn%2===0?skill('물길 돌진',200,{target:'all'}):basic('심해 물어뜯기',260);
 case 'tentacle-larva':return turn%2===0?skill('촉수 붙잡기',160,{status:'poison',root:true}):basic('촉수 휘두르기',220);
 case 'anchor-boatswain':return grabbed?skill('닻사슬 끌어당기기',420,{pull:true}):turn%2===0?skill('닻 던지기 · 포박',220,{status:'root'}):basic('닻 휘두르기',300);
 case 'kraken':return turn%4===0?skill('먹물 분사',180,{status:'blind'}):grabbed?skill('촉수 끌어당기기',400,{pull:true}):turn%3===0?skill('거대 촉수 붙잡기',200,{status:'root'}):basic('거대 촉수 강타',320);
 case 'chain-armored-sailor':return turn%2===0?skill('쇠사슬 갈고리',200,{status:'root'}):basic('사슬 강타',240);
 case 'wreck-shell-crab':return turn%3===0?{name:'단단한 껍질',damage:0,clip:'guard',target:'self'}:turn%2===0?skill('철갑 집게 붙잡기',240,{status:'root'}):basic('철갑 집게 강타',240);
 case 'luminous-spine-eel':return turn%2===0?skill('발광가시 돌진',200,{target:'all'}):basic('발광가시 물기',240);
 case 'carapace-tentacle':return turn%2===0?skill('갑각 촉수 붙잡기',200,{status:'poison',root:true}):basic('갑각 촉수 강타',240);
 case 'abyss-torrent-eel':return turn%2===0?skill('심해 격류',240,{target:'all'}):basic('심해 물어뜯기',240);
 default:return basic('기본 공격',240);
 }
}
function planBossCharge(id,finalBoss=false){
 const wipe=finalBoss&&id==='kraken';
 return {name:wipe?'심해의 종말 · 전멸기':id==='deep-sea-eel'?'심해 격류 · 전체공격':id==='anchor-boatswain'?'닻사슬 폭풍 · 전체공격':'심해 마력 폭발 · 전체공격',damage:wipe?0:240,target:'all',clip:'special',charge:true,wipe};
}
const exported={actionPriority,BALANCE,TurnCycle,deal,seeded,planMonster,planBossCharge};if(typeof module==='object'&&module.exports)module.exports=exported;if(!root.document||!root.BATTLE_CONFIG?.partyTurns)return;
const party=root.BATTLE_ASSETS.slice(0,4),config=root.BATTLE_CONFIG,cycle=new TurnCycle(root.PartyRoster?.order);
const q=new URLSearchParams(location.search),manual=q.get('control')!=='ai'||party.some(a=>a.id==='hero'),seed=Number(q.get('seed'))||crypto.getRandomValues(new Uint32Array(1))[0],rng=seeded(seed);
// Load authored reactions before the shared runtime preloads action frames.
const hurtClips={"dwarf":{"frames":["../characters/dwarf-tank-animations-v1/hurt/frame-01.webp","../characters/dwarf-tank-animations-v1/hurt/frame-02.webp","../characters/dwarf-tank-animations-v1/hurt/frame-03.webp","../characters/dwarf-tank-animations-v1/hurt/frame-04.webp","../characters/dwarf-tank-animations-v1/hurt/frame-05.webp","../characters/dwarf-tank-animations-v1/hurt/frame-06.webp","../characters/dwarf-tank-animations-v1/hurt/frame-07.webp","../characters/dwarf-tank-animations-v1/hurt/frame-08.webp"],"durations":[240,80,100,170,150,180,190,240]},"archer":{"frames":["../characters/archer-animations-confirmed-v1/hurt/frame-01.webp","../characters/archer-animations-confirmed-v1/hurt/frame-02.webp","../characters/archer-animations-confirmed-v1/hurt/frame-03.webp","../characters/archer-animations-confirmed-v1/hurt/frame-04.webp","../characters/archer-animations-confirmed-v1/hurt/frame-05.webp","../characters/archer-animations-confirmed-v1/hurt/frame-06.webp","../characters/archer-animations-confirmed-v1/hurt/frame-07.webp","../characters/archer-animations-confirmed-v1/hurt/frame-08.webp"],"durations":[240,70,100,180,150,180,190,240]},"wizard":{"frames":["../characters/wizard-animations-v2/hurt/frame-01.webp","../characters/wizard-animations-v2/hurt/frame-02.webp","../characters/wizard-animations-v2/hurt/frame-03.webp","../characters/wizard-animations-v2/hurt/frame-04.webp","../characters/wizard-animations-v2/hurt/frame-05.webp","../characters/wizard-animations-v2/hurt/frame-06.webp","../characters/wizard-animations-v2/hurt/frame-07.webp","../characters/wizard-animations-v2/hurt/frame-08.webp"],"durations":[240,80,110,160,120,160,180,240]},"priest":{"frames":["../characters/priest-animations-v2/hurt/frames/hurt-01.webp","../characters/priest-animations-v2/hurt/frames/hurt-02.webp","../characters/priest-animations-v2/hurt/frames/hurt-03.webp","../characters/priest-animations-v2/hurt/frames/hurt-04.webp","../characters/priest-animations-v2/hurt/frames/hurt-05.webp","../characters/priest-animations-v2/hurt/frames/hurt-06.webp","../characters/priest-animations-v2/hurt/frames/hurt-07.webp","../characters/priest-animations-v2/hurt/frames/hurt-08.webp"],"durations":[260,60,100,130,130,150,160,260]}};
for(const a of party)a.actions.hurt=hurtClips[a.id]||a.actions.hurt;
// Supply authored guard clips for explicit defensive actions.
for(const a of party){const folder={archer:'archer-animations-confirmed-v1',wizard:'wizard-animations-v2',priest:'priest-animations-v2'}[a.id];if(folder&&!a.actions.guard)a.actions.guard={frames:Array.from({length:8},(_,i)=>`../characters/${folder}/guard/${a.id==='priest'?'frames/guard-':'frame-'}${String(i+1).padStart(2,'0')}.webp`),durations:[220,150,180,260,140,180,180,220]};}
for(const a of party)a.actions.item||=a.actions.magic||a.actions.attack;
const pools=party.map(a=>a.id==='hero'?Object.keys(root.PartyHero.specs):a.id==='dwarf'?root.DwarfSkills.skills.map(s=>s.id):a.id==='archer'?Object.keys(root.ArcherSkills.specs):a.id==='wizard'?Object.keys(root.WizardSkills.specs):a.id==='mechanic'?Object.keys(root.PartyMechanic.specs).filter(id=>!id.startsWith('combined-')):[...Object.keys(root.HealerSkills.specs),'resurrection']);
pools.forEach((p,i)=>p.push(...root.PartyBasicActions.catalog(party[i].id).map(s=>s.id)));
const loadouts=pools.map(p=>deal(p,rng));if(q.get('breaktest')==='1'){if(party[0].id==='dwarf')loadouts[0]=['dwarf-wake','dwarf-bulwark','dwarf-quake','dwarf-mjolnir'];party.forEach((a,i)=>{if(a.id==='archer')loadouts[i]=['stun-shot','arrow-rain','leg-bind','eagle-eye'];if(a.id==='wizard')loadouts[i]=['black-hole','fireball','meteor','blizzard'];});}config.initialSlots=root.GalleonCampaign?.equipped()||loadouts[0].map(id=>({icon:0,id,...(root.DwarfSkills.skills.find(s=>s.id===id)||root.ArcherSkills?.specs[id]||root.WizardSkills?.specs[id]||root.HealerSkills?.specs[id]||root.PartyMechanic?.specs[id]||root.PartyHero?.specs[id]||root.PartyBasicActions?.specs[id]||{name:'부활의 기도'})}));loadouts[0]=config.initialSlots.map(s=>s.id);
let bridge,ui,phaseLabel,cards,intents,logs,readyAt=0,enemyQueue=null,enemyIndex=0,enemyAction=null,basic=null,dispatch=false,roundOpened=false,opening=false,history=[];
let pendingTarget=null,defeatTimer=null;
const skillLabels=new Map();let endedAfterRoundTicks=false;
function showSkill(i,id,now){skillLabels.set(i,{text:names(id),started:now});}
const portraitOrder=[...cycle.order],plannedActions=new Map();
let executingPlans=false,launchingPlan=false;
function planning(){return manual&&!executingPlans;}
function singleAction(i,id){
 if(id==='party-end-turn'||id==='sniping-release')return false;
 const role=party[i].id,basic=root.PartyBasicActions.specs[id];if(basic)return !!basic.single;
 if(role==='dwarf'){const s=root.DwarfSkills.skills.find(s=>s.id===id);return !!s?.offensive&&s.target!=='all-living-enemies';}
 if(role==='hero')return !!root.PartyHero.specs[id]?.single;
 if(role==='archer')return ['sniping','stun-shot','leg-bind'].includes(id);
 if(role==='wizard')return !root.WizardSkills.specs[id]?.area;
 if(role==='mechanic')return !!root.PartyMechanic.specs[id]?.single;
 return !!root.HealerSkills?.specs[id]?.single;
}
function advancePlanning(){
 const remaining=portraitOrder.find(i=>hp(party[i])>0&&!plannedActions.has(i));
 if(remaining!==undefined){cycle.next=remaining;refresh();return;}
 executingPlans=true;
 cycle.order=portraitOrder.filter(i=>plannedActions.has(i)).sort((a,b)=>actionPriority(plannedActions.get(a).id)-actionPriority(plannedActions.get(b).id)||portraitOrder.indexOf(a)-portraitOrder.indexOf(b));
 cycle.next=cycle.order[0]??4;readyAt=bridge.now()+350;bridge.resume();refresh();
}
function queueAction(id,confirmed=false){
 if(!canChoose())return true;const i=cycle.next;
 if(id!=='party-end-turn'&&id!=='sniping-release'){
  const owned=(party[i].id==='mechanic'&&root.PartyMechanic.commands())||loadouts[i]||[];
  if(!owned.includes(id)&&!root.PartyBasicActions.specs[id]?.defaultCommand||!usableSkill(i,id))return true;
  if(singleAction(i,id)&&!confirmed){api.requestTarget({id},()=>queueAction(id,true));return true;}
 }
 const target=singleAction(i,id)?selectedTarget()?.id:null;
 api.cancelTarget();plannedActions.set(i,{id,target});note(party[i].name+' · 선택 완료 · '+(id==='party-end-turn'?'턴 종료':names(id)));advancePlanning();return true;
}
function executePlanned(now){
 const i=cycle.next,entry=plannedActions.get(i);if(!entry)return;
 launchingPlan=true;
 try{
  if(entry.target){const e=selectable().find(e=>e.id===entry.target)||selectable()[0];if(e){const sel=document.querySelector('#dwarf-target');sel.value=e.id;sel.dispatchEvent(new Event('change'));}}
  if(entry.id==='party-end-turn')api.endTurn();
  else if(entry.id==='sniping-release'){cycle.start(i);showSkill(i,'sniping',now);root.ArcherSkills.releaseSniping(now);}
  else if(i===0&&party[i].id==='dwarf'&&!root.PartyBasicActions.specs[entry.id])bridge.startPlayer(entry.id);
  else api.manualAction(entry.id,true);
  // A previous action may kill/seal the target or remove a skill's prerequisites.
  if(cycle.next===i&&cycle.actor===null){cycle.start(i);note(party[i].name+' · 사용 가능한 대상 없음 · 행동 종료');api.complete(now);}
 }finally{launchingPlan=false;refresh();}
}

function returnToSelection(){
 clearTimeout(defeatTimer);defeatTimer=null;
 if(root.GalleonCampaign){root.GalleonCampaign.returnToSelection();return;}
 sessionStorage.removeItem('normal-party-selection');
 const destination=new URL('normal-entry.html?newparty=1',location.href);
 if(!root.GameScreen?.navigate?.(destination.href))location.replace(destination.href);
}
function defeat(message='던전 실패 · 파티가 전멸했습니다.'){
 if(cycle.phase==='defeat')return;
 cycle.phase='defeat';enemyAction=null;enemyQueue=null;api.cancelTarget();
 root.GalleonCampaign?.fail();note(message);refresh();
 const panel=document.querySelector('#party-defeat');
 if(panel){panel.querySelector('button').focus({preventScroll:true});defeatTimer=setTimeout(returnToSelection,2600);}
}
window.addEventListener('pagehide',()=>clearTimeout(defeatTimer));
const plans=new Map(),lastUsed=new Map(),hits=new Map(),defending=new Set();
const living=()=>party.map((a,i)=>({a,i})).filter(v=>hp(v.a)>0),enemies=()=>bridge?.enemies()||[];
const blocked=()=>root.DungeonMenu?.isOpen||root.PartyBasicActions?.busy||root.GalleonCampaign?.blocked||bridge?.busy()||!!basic||!!root.PartyMechanic?.busy||!!root.PartyHero?.busy;
const names=id=>root.PartyBasicActions?.specs[id]?.name||root.GalleonCampaign?.catalog().find(s=>s.id===id)?.name||root.DwarfSkills.skills.find(s=>s.id===id)?.name||root.ArcherSkills?.specs[id]?.name||root.WizardSkills?.specs[id]?.name||root.HealerSkills?.specs[id]?.name||root.PartyMechanic?.specs[id]?.name||root.PartyHero?.specs[id]?.name||(id==='party-wait'?'대기':id==='resurrection'?'부활의 기도':'기본 공격 / 대기');
const monsterId=e=>e.spriteAsset?.id||root.BATTLE_ASSETS[4].id;
const status=(i,k)=>party[i].statuses?.some(s=>kind(s)===k);
function note(message){history.push({turn:cycle.turn,phase:cycle.phase,message});if(history.length>60)history.shift();if(logs){logs.replaceChildren(...history.slice(-12).reverse().map(e=>{const li=document.createElement('li');li.textContent=e.turn+'턴 · '+e.message;return li;}));}bridge?.notice(message);}
function syncTargetButton(){document.querySelectorAll('.command-grid [data-action],#common-actions [data-action]').forEach(b=>{const active=b.dataset.action===pendingTarget?.id&&b.dataset.slot===pendingTarget?.slot;b.classList.toggle('target-pending',active);b.setAttribute('aria-pressed',String(active));});}
function canChoose(){if(manual&&executingPlans&&!launchingPlan)return false;return manual&&cycle.next>0?cycle.phase==='allies'&&cycle.next<4&&cycle.actor===null&&!blocked():api.canCast(0,'pass');}
function selectable(){return enemies().filter(e=>e.hp>0&&(!root.WizardSkills||root.WizardSkills.canSelect(e))).sort((a,b)=>a.x-b.x);}
function selectedTarget(){const es=selectable(),select=document.querySelector('#dwarf-target');let e=es.find(e=>e.id===select?.value);if(!e&&es.length){e=es[0];if(select)select.value=e.id;}return e;}
function selectTarget(id){if(!pendingTarget||!canChoose()||!selectable().some(e=>e.id===id))return;const select=document.querySelector('#dwarf-target');select.value=id;select.dispatchEvent(new Event('change'));}
function moveTarget(step){if(!pendingTarget||!canChoose())return;const es=selectable();if(!es.length)return;const current=selectedTarget(),index=es.findIndex(e=>e.id===current?.id),next=es[(index+step+es.length)%es.length],select=document.querySelector('#dwarf-target');selectTarget(next.id);}
function hasGrab(id){return living().some(({a})=>a.statuses?.some(s=>s.kind==='root'&&s.source===id));}
function openRound(now){root.CampaignChallenge?.beginRound(cycle.turn);roundOpened=true;plans.clear();if(config.contractStone){root.ContractStones.showTurn(config.contractStone,cycle.turn);return;}for(const e of enemies().filter(e=>e.hp>0))plans.set(e.id,root.PartyMonsterBalance?.action(e,cycle.turn)||planMonster(monsterId(e),cycle.turn,hasGrab(e.id)));
 if(config.isBoss&&cycle.turn>=2&&(cycle.turn-2)%3===0&&enemies()[0]?.hp>0){root.DwarfSkills.beginCharge('primary',now);plans.set('primary',root.PartyMonsterBalance?.action(enemies()[0],cycle.turn,true)||planBossCharge(monsterId(enemies()[0]),config.isFinalBoss));}
 for(const e of enemies())if(plans.has(e.id)&&root.PartyMonsterBalance)plans.set(e.id,root.PartyMonsterBalance.plan(e,plans.get(e.id)));
 for(const [id,plan]of plans)if(root.CampaignChallenge)plans.set(id,root.CampaignChallenge.plan(plan,config.isFinalBoss,root.PartyMonsterBalance?.midbossTuning?.(id,plan)));
 // Name the final plan only after workbook lookup and campaign balance have resolved.
 for(const [id,plan]of plans)if(plan.charge){const enemy=enemies().find(e=>e.id===id);plans.set(id,{...plan,name:root.DungeonCombatRules.bossChargeName(root.ActiveDungeon?.id||'01',monsterId(enemy),plan.name)});}
 note('아군 행동 시작 · '+cycle.order.map(i=>party[i].name).join(' → '));refresh();}
function refresh(){if(!bridge||!ui)return;const c=cycle;const defeat=document.querySelector('#party-defeat');if(defeat)defeat.hidden=c.phase!=='defeat';phaseLabel.textContent=c.phase==='defeat'?'던전 실패 · 캐릭터 선택으로 돌아갑니다':c.phase==='victory'?'몬스터 처치 완료':`${c.turn}턴 · ${c.phase==='allies'?'아군 공격 / 몬스터 수비':'몬스터 공격 / 아군 대기'}`;
 for(const [i,card]of [...cards.children].entries()){card.dataset.active=String(c.phase==='allies'&&(c.actor??c.next)===i);card.querySelector('small').textContent=hp(party[i])<=0?'전투불능':c.acted.has(i)?'행동 완료':manual?'직접 조작':i===0?'직접 조작':'AI';}
 intents.textContent=[...plans].map(([id,p])=>{const e=enemies().find(e=>e.id===id);return e&&e.hp>0?`${e.name}: ${p.charge&&root.DwarfSkills.model.cancelled?'충전 취소':p.name}`:'';}).filter(Boolean).join(' / ');
 const b=document.querySelector('.intent b');if(b){const first=plans.get('primary');b.textContent=first?(first.charge&&root.DwarfSkills.model.cancelled?'충전 취소':first.name)+(enemies().filter(e=>e.hp>0).length>1?' · 나머지는 위 예고 참조':''):'';}
 const pass=ui.querySelector('#party-pass');pass.disabled=!api.canCast(0,'pass');const scene=document.querySelector('#scene');scene.dataset.partyTurn=String(c.turn);scene.dataset.partyPhase=c.phase;scene.dataset.partyActor=String(c.actor??c.next);scene.dataset.partyActed=JSON.stringify([...c.acted]);scene.dataset.enemyActing=enemyAction?.id||'';bridge.buttons();}
function candidates(i){const own=loadouts[i],dead=party.map((a,j)=>({a,j})).filter(x=>hp(x.a)<=0),lowest=living().sort((a,b)=>hp(a.a)/a.a.hp-hp(b.a)/b.a.hp),wounded=lowest.filter(x=>hp(x.a)<x.a.hp*.7),charging=!!root.DwarfSkills.model.charge;
 let scores=own.map(id=>({id,score:rng()*3+(lastUsed.get(i)===id?-1:1)}));
 for(const x of scores){const id=x.id;
  if(i===1){if(id==='sniping')x.score+=charging?-5:5;if(id==='stun-shot')x.score+=charging?40:-2;if(id==='natures-cure')x.score+=living().some(v=>v.a.statuses?.length)?20:-20;if(id==='eagle-eye')x.score+=root.ArcherSkills.model.eagleTurns?-10:3;if(id==='leg-bind')x.score+=enemies().some(e=>e.hp>0&&root.WizardSkills.canSelect(e))?2:-30;if(['arrow-rain','leaf-wind','phoenix-shot'].includes(id))x.score+=4;}
  if(i===2){if(id==='black-hole')x.score+=root.WizardSkills.model.hole?-100:2;if(root.WizardSkills.model.hole&&!root.WizardSkills.specs[id].area)x.score-=100;}
  if(i===3){if(id==='living-water')x.score+=living().some(v=>!root.HealerSkills.model.livingWaterUntil.has(v.i)&&root.PartyResources?.enabled&&root.PartyResources.read(v.a.id)<v.a.mp*.7)?28:-20;if(id==='sanctuary')x.score+=wounded.length?35:6;if(id==='resurrection')x.score+=dead.length?100:-100;if(id==='recovery')x.score+=wounded.length?30:lowest.length&&hp(lowest[0].a)<lowest[0].a.hp?3:-20;if(id==='healing')x.score+=wounded.length>1?40:wounded.length?15:-20;if(id==='blessing')x.score+=living().some(v=>!root.HealerSkills.model.blessed.has(v.i))?12:-10;if(id==='barrier')x.score+=living().some(v=>(root.HealerSkills.model.barriers.get(v.i)||0)<v.a.hp*.1)?8:-5;}
  if(charging&&id!=='resurrection')x.score+=1;
 }return {order:scores.sort((a,b)=>b.score-a.score).map(x=>x.id),target:lowest[0]?.i??0,dead:dead[0]?.j};}
function startAI(i,now){if(!cycle.start(i))return;const choices=candidates(i);dispatch=true;let chosen=null;
 try{for(const id of choices.order){if(!usableSkill(i,id))continue;let ok=false;if(root.PartyBasicActions.specs[id]){if(root.PartyBasicActions.start(i,id,selectedTarget(),now)){chosen=id;break;}continue;}
  if(i===1)ok=root.ArcherSkills.start(id);
  if(i===2)ok=root.WizardSkills.start(id);
  if(i===3&&id==='resurrection'&&choices.dead!==undefined){const sel=document.querySelector('.resurrection-controls select');sel.value=String(choices.dead);root.BattleResurrection.refresh();document.querySelector('#resurrection-cast').click();ok=!!root.BattleResurrection.active;}
  else if(i===3&&id!=='resurrection'){document.querySelector('.healer-controls select').value=String(choices.target);ok=root.HealerSkills.start(id);}
  if(ok){chosen=id;break;}
 }}finally{dispatch=false;}
 if(chosen){root.PartyResources?.spend(party[i].id,chosen);lastUsed.set(i,chosen);note(party[i].name+' AI · '+names(chosen));}
 else{basic={i,started:now,hit:false,guard:true};note(party[i].name+' AI · 사용 가능한 스킬 없음 · 대기');}
 refresh();}
function addStatus(i,kindName,source){const a=party[i];if(hp(a)<=0)return;a.statuses=(a.statuses||[]).filter(s=>!(kind(s)===kindName&&s.source===source));a.statuses.push({kind:kindName,source,until:cycle.turn+1,debuff:true});}
function tauntSource(e){return root.DungeonCombatRules.tauntSource(e,party,root.DwarfSkills.model,root.PartyMechanic);}
function chooseTargets(e,plan){return root.DungeonCombatRules.chooseTargets(e,plan,party,root.DwarfSkills.model,root.PartyMechanic,Math.floor(rng()*4));}
function skipEnemy(e){if(e.id==='primary'&&root.DwarfSkills.model.cancelled)return true;if(root.CampaignChallenge?.enabled&&plans.get(e.id)?.charge&&root.DwarfSkills.model.charge?.enemyId===e.id)return false;if(plans.get(e.id)?.wipe&&root.DwarfSkills.model.charge?.enemyId===e.id)return false;return root.DwarfSkills.model.stunned(e.id)||(root.ArcherSkills&&!root.ArcherSkills.canEnemyAct(e))||(root.WizardSkills&&!root.WizardSkills.canEnemyAct(e))||(e.id==='primary'&&root.DwarfSkills.model.cancelled);}
function finishRound(now){
 root.PartyBasicActions.end();root.DwarfSkills.endPartyTurn();root.ArcherSkills?.externalEndTurn();root.WizardSkills?.afterResponse();
 root.PartyMechanic?.end();root.PartyHero?.end();root.HealerSkills?.endTurn();root.BattleRoar.completeTurn(now);
 for(const a of party)a.statuses=(a.statuses||[]).filter(s=>typeof s==='string'||s.until===undefined||s.until>cycle.turn);
 endedAfterRoundTicks=enemies().every(e=>e.hp<=0);
 if(config.contractStone){
  // Expiring robots have already dealt damage. A last-hit clear wins over the timeout.
  if(endedAfterRoundTicks)return;
  if(cycle.turn===root.ContractStones.LIMIT){endedAfterRoundTicks=true;root.GalleonCampaign.stoneTimeout();return;}
 }
 note('몬스터 행동 종료 · 한 턴 완료');cycle.order=[...portraitOrder];plannedActions.clear();executingPlans=false;cycle.end();
 roundOpened=false;enemyQueue=null;enemyAction=null;opening=false;readyAt=now+400;openRound(now);refresh();
}
function usableSkill(i,id){
 if(root.PartyResources&&!root.PartyResources.can(party[i]?.id,id))return false;
 const role=party[i]?.id,live=enemies().filter(e=>e.hp>0),direct=selectable();
 if(root.PartyBasicActions.specs[id])return root.PartyBasicActions.canUse(i,id,live);
 if(id==='party-wait')return false;
 if(id?.startsWith('reward-'))return (bridge.slots().find(s=>s.id===id)?.quantity||0)>0;
 if(role==='dwarf'){const s=root.DwarfSkills.skills.find(s=>s.id===id);return !!s&&(!s.offensive||s.target==='all-living-enemies'?live.length>0:direct.length>0);}
 if(role==='archer'){if(root.ArcherSkills.model.sniping)return false;if(id==='leg-bind')return direct.some(e=>e.attackType==='melee');return ['sniping','stun-shot'].includes(id)?direct.length>0:!!root.ArcherSkills.specs[id]&&live.length>0;}
 if(role==='wizard'){const s=root.WizardSkills.specs[id];return !!s&&s.cost<=root.WizardSkills.mp&&(id==='black-hole'?!root.WizardSkills.model.hole&&live.some(e=>root.WizardSkills.canBlackHoleCapture(e,root.DwarfSkills.model)):s.area?live.length>0:direct.length>0);}
 if(role==='priest'){if(id==='resurrection')return party.some(a=>hp(a)<=0);const s=root.HealerSkills.specs[id];return !!s&&(s.single?direct.length>0:living().length>0);}
 if(role==='hero')return root.PartyHero.canUse(id,live);
 if(role==='mechanic'){const s=root.PartyMechanic.specs[id],state=root.PartyMechanic.state;if(!s)return false;if(id==='super-combine')return state.robots.length>=2&&!state.combined;if(id==='combined-beam')return state.combined>=2&&!state.beam;if(id==='mechanic-item')return (state.items??1)>0;return s.single?direct.length>0:true;}
 return false;
}
function updateCommonActions(){document.querySelector('#common-actions')?.remove();}
function updateDefaultCommands(grid,i){
 const guardId=party[i].id+'-default-guard';
 for(const [slot,id,name]of [[4,guardId,'일반 방어'],[5,'party-end-turn','턴 종료']]){
  let b=grid.querySelector('[data-slot="'+slot+'"]');
  if(!b){b=document.createElement('button');b.dataset.slot=String(slot);b.className='default-command';grid.append(b);}
  b.dataset.action=id;b.dataset.hotkey=String(slot+1);b.textContent=name;b.setAttribute('aria-keyshortcuts',String(slot+1));
  if(slot===5){b.id='party-end-turn';b.onclick=()=>api.endTurn();b.disabled=!api.canEndTurn();}
  else{b.id='party-basic-guard';b.onclick=()=>api.manualAction(guardId);b.disabled=!api.canEndTurn()||!usableSkill(i,guardId);}
 }
}
const api={...exported,manual,tauntSource,chooseTargets,
 canEndTurn(){const i=cycle.next;return !!(manual&&i<4&&hp(party[i])>0&&canChoose()&&enemies().some(e=>e.hp>0)&&!(party[i].id==='archer'&&root.ArcherSkills?.model.sniping));},
 endTurn(){
  if(!api.canEndTurn())return false;
  if(planning())return queueAction('party-end-turn');
  const i=cycle.next,a=party[i],ids=(a.id==='mechanic'&&root.PartyMechanic.commands())||loadouts[i]||[];
  const manaShortage=root.PartyResources?.enabled&&!ids.some(id=>usableSkill(i,id))&&ids.some(id=>!root.PartyResources.can(a.id,id));
  api.cancelTarget();if(!cycle.start(i))return false;
  if(root.PartyResources?.enabled){
   root.PartyResources.restore(a.id,Math.min(a.mp,root.PartyResources.read(a.id)+Math.floor(a.mp*BALANCE.endTurnMana)));
   if(manaShortage){a.currentHp=Math.min(a.hp,hp(a)+Math.floor(a.hp*BALANCE.endTurnShortageHp));bridge.hit(i,0);}
   root.PartyResources.sync();note(a.name+(manaShortage?' · 휴식 · 체력과 마나 회복':' · 턴 종료 · 마나 회복'));
  }
  api.complete(bridge.now());bridge.resume();return true;
 },

 padSkillSlots(grid){for(const b of grid.querySelectorAll('[data-action]')){b.dataset.hotkey=String(Number(b.dataset.slot)+1);b.setAttribute('aria-keyshortcuts',b.dataset.hotkey);}while(grid.children.length<4){const b=document.createElement('button');b.className='empty-skill-slot';b.dataset.empty='true';b.dataset.slot=String(grid.children.length);b.disabled=true;b.setAttribute('aria-label',(grid.children.length+1)+'번 스킬칸 · 미습득');grid.append(b);}},
 manualButtons(){
  if(!manual||!bridge)return false;
  updateCommonActions();
  const grid=document.querySelector('.command-grid'),i=cycle.next<4?cycle.next:Number(grid.dataset.owner||3);
  document.querySelectorAll('#party .member').forEach((c,j)=>c.classList.toggle('selected',cycle.phase==='allies'&&j===i));
  document.querySelector('.commands h2').textContent=executingPlans?'선택한 행동 실행 중':party[i].name+' · 행동 선택 ('+plannedActions.size+'/'+living().length+')';
  const ids=[...(party[i].id==='mechanic'&&root.PartyMechanic?.commands()||loadouts[i]||[])].slice(0,4),key=i+':'+ids.join(',');
  if(grid.dataset.manualKey!==key||grid.dataset.owner!==String(i)){
   grid.replaceChildren();grid.dataset.manualKey=key;grid.dataset.owner=String(i);
   ids.forEach((id,n)=>{const b=document.createElement('button');b.dataset.action=id;b.dataset.slot=n;b.textContent=names(id);b.onclick=()=>{if(i===0&&(id.startsWith('reward-')||party[0].id==='dwarf'))bridge.startPlayer(id);else api.manualAction(id);};grid.append(b);});
  }
  api.padSkillSlots(grid);
  for(const b of grid.children)if(Number(b.dataset.slot)<4)b.disabled=executingPlans||b.dataset.empty==='true'||cycle.phase!=='allies'||cycle.actor!==null||blocked()||hp(party[i])<=0||!usableSkill(i,b.dataset.action)||(i===0&&bridge.slots?.().find(s=>s.id===b.dataset.action)?.quantity===0);
  updateDefaultCommands(grid,i);return true;
 },
 manualAction(id,confirmed=false){if(manual&&executingPlans&&!launchingPlan)return true;if(planning())return queueAction(id,confirmed);if(root.PartyBasicActions.specs[id]){const i=cycle.next;if(!manual||!canChoose()||root.PartyBasicActions.specs[id].defaultCommand&&!api.canEndTurn()||(!loadouts[i]?.includes(id)&&!root.PartyBasicActions.specs[id].defaultCommand)||!usableSkill(i,id))return true;const def=root.PartyBasicActions.specs[id];if(def.single&&!confirmed){api.requestTarget(def,()=>api.manualAction(id,true));return true;}api.cancelTarget();if(!cycle.start(i))return true;if(root.PartyBasicActions.start(i,id,selectedTarget(),bridge.now())){showSkill(i,id,bridge.now());bridge.resume();}else cycle.actor=null;refresh();return true;}if(!manual||(cycle.next===0&&(party[0].id==='dwarf'||id?.startsWith('reward-'))))return false;const i=cycle.next;if(id==='party-wait'&&canChoose()){api.cancelTarget();cycle.start(i);api.complete(bridge.now());bridge.resume();return true;}if(!canChoose()||!usableSkill(i,id)||!(party[i]?.id==='mechanic'&&root.PartyMechanic?.commands()||loadouts[i])?.includes(id))return true;const role=party[i].id,single=role==='hero'?!!root.PartyHero.specs[id]?.single:role==='archer'?['sniping','stun-shot','leg-bind'].includes(id):role==='wizard'?!root.WizardSkills.specs[id]?.area:role==='mechanic'?!!root.PartyMechanic.specs[id]?.single:role==='priest'?!!root.HealerSkills.specs[id]?.single:false;if(single&&!confirmed){api.requestTarget({id},()=>api.manualAction(id,true));return true;}api.cancelTarget();const chosen=selectedTarget();if(role==='archer'){const sel=document.querySelector('[aria-label="단일 스킬 대상"]');if(chosen)sel.value=chosen.id;}if(role==='wizard'){const sel=document.querySelector('[aria-label="마법사 직접 공격 대상"]');if(chosen)sel.value=chosen.id;}if(!cycle.start(i))return true;dispatch=true;let ok=false;try{if(role==='hero'){ok=root.PartyHero.start(id,chosen,bridge.now());if(ok)bridge.resume();}if(role==='archer')ok=root.ArcherSkills.start(id);if(role==='wizard')ok=root.WizardSkills.start(id);if(role==='mechanic'){ok=root.PartyMechanic.start(id,chosen,bridge.now());if(ok)bridge.resume();}if(role==='priest'){const live=living().sort((a,b)=>hp(a.a)/a.a.hp-hp(b.a)/b.a.hp),choices={target:live[0]?.i??i,dead:party.findIndex(a=>hp(a)<=0)};if(id==='resurrection'&&choices.dead>=0){document.querySelector('.resurrection-controls select').value=String(choices.dead);root.BattleResurrection.refresh();document.querySelector('#resurrection-cast').click();ok=!!root.BattleResurrection.active;}else if(id!=='resurrection'){document.querySelector('.healer-controls select').value=String(choices.target);ok=root.HealerSkills.start(id,chosen?.id);}}}finally{dispatch=false;}if(!ok){cycle.actor=null;note('현재 사용할 수 없는 스킬입니다. 다른 스킬을 선택하세요.');}else{showSkill(i,id,bridge.now());root.PartyResources?.spend(party[i].id,id);note(party[i].name+' · '+names(id));}refresh();return true;},

 requestTarget(def,run){if(launchingPlan){run();return;}if(pendingTarget?.id===def.id){api.cancelTarget();return;}const selected=document.activeElement?.dataset.action===def.id?document.activeElement:document.querySelector('.command-grid [data-action="'+def.id+'"]');pendingTarget={id:def.id,run,slot:selected?.dataset.slot};syncTargetButton();document.querySelector('#target-prompt').hidden=false;},
 get clearConsumesTurn(){return !endedAfterRoundTicks;},get plannedActions(){return [...plannedActions].map(([actor,a])=>({actor,...a}));},get executingPlans(){return executingPlans;},
 get targeting(){return !!pendingTarget;},
 cancelTarget(){pendingTarget=null;syncTargetButton();const prompt=document.querySelector('#target-prompt');if(prompt)prompt.hidden=true;},
 confirmTarget(){if(!pendingTarget||!canChoose()||!selectedTarget())return;const run=pendingTarget.run;api.cancelTarget();run();},cycle,loadouts,seed,plans,get history(){return history;},get enemyAction(){return enemyAction;},
 setSkills(skills){party.forEach((a,i)=>{loadouts[i]=[...new Set(skills[a.id]||[])].slice(0,4);});if(bridge)refresh();},
 setPlayerSlots(slots){loadouts[0]=slots.slice(0,4).map(s=>s.id);if(cards){cards.children[0].querySelector('ul').replaceChildren(...slots.map(s=>{const li=document.createElement('li');li.textContent=s.name;return li;}));refresh();}},
 canCast(i,id){if(manual&&executingPlans&&!launchingPlan&&!dispatch)return false;if(root.PartyResources&&!root.PartyResources.can(party[i]?.id,id))return false;if(!bridge||cycle.phase!=='allies'||hp(party[i])<=0)return false;if(dispatch&&cycle.actor===i)return loadouts[i].includes(id);if(i===0)return cycle.next===0&&cycle.actor===null&&!blocked()&&(id==='pass'||loadouts[0].includes(id));return dispatch&&cycle.actor===i&&loadouts[i].includes(id);},
 started(i,id,now){if(cycle.start(i)){showSkill(i,id,now);root.PartyResources?.spend(party[i].id,id);note(party[i].name+' · '+names(id));refresh();}},
 complete(now){if(cycle.complete()){readyAt=now+350;refresh();}},
 outgoingDamage(i,n){return Math.round(n*(status(i,'root')?BALANCE.rootOutgoing:1)*(status(i,'blind')?BALANCE.blindOutgoing:1));},
 defendEnemy(e,n){return defending.has(e.id)?Math.round(n*(1-(monsterId(e)==='giant-crab'?BALANCE.crabGuard:BALANCE.enemyGuard))):n;},
 defendAlly(i,n){n=root.PartyBasicActions.incoming(i,n);n=root.PartyHero?.incoming(i,n)??n;n=root.PartyMechanic?.incoming(i,n)??n;return Math.round(n*(status(i,'root')?BALANCE.rootIncoming:1));},
 receivedHit(i,now){if(hp(party[i])>0)hits.set(i,now-(enemyAction?.visual?(party[i].actions.hurt?.durations[0]||0):0));},
 mount(b){bridge=b;document.body.classList.add('party-mode');const panel=document.querySelector('#galleon-tools');panel.querySelector('strong').textContent=(window.GameDungeons?.name(window.ActiveDungeon?.id||'01')||'침몰한 범선')+' · 파티 턴 전투';panel.querySelectorAll('p').forEach(p=>p.remove());document.querySelector('#monster-actions').previousElementSibling.hidden=true;document.querySelector('#monster-actions').parentElement.querySelectorAll('#monster-actions, #monster-actions + p').forEach(e=>e.hidden=true);const explanation=document.createElement('p');explanation.textContent='방패병은 직접 선택 · 동료 3명은 AI. 각자 무작위 스킬 4개를 받습니다. 아군 4명 행동 → 살아 있는 몬스터가 한 번씩 공격하면 1턴 완료. 전투 초기화는 같은 스킬로, 다시 뽑기는 새 스킬로 시작합니다.';panel.append(explanation);
 ui=document.createElement('section');ui.className='party-turn-panel';ui.innerHTML='<h2 id="party-phase"></h2><div class="party-loadouts"></div><p class="party-intents"></p><div class="party-buttons"><button id="party-pass">방패병 대기 · 다음 동료</button><button id="party-reset">같은 스킬로 전투 초기화</button><button id="party-reroll">4개 스킬 다시 뽑기</button></div><details><summary>전투 기록 / 테스트 규칙</summary><p>방어 스킬 없이 아군 자동 수비 없음. 몬스터는 실제 방어 행동 후에만 수비 피해 감소 적용 (게 40%). 포박: 다음 턴까지 공격력 20% 감소·받는 피해 25% 증가. 유생 독: 다음 적 행동 때 60 피해. 먹물: 다음 턴 공격력 30% 감소. 공격 수치와 AI 우선순위는 테스트 설정입니다. 마법사 MP 부족 시 기본 공격, 힐러가 사용할 대상이 없으면 대기합니다.</p><ol class="party-log"></ol></details>';
 document.querySelector('.screen').before(ui);phaseLabel=ui.querySelector('h2');cards=ui.querySelector('.party-loadouts');intents=ui.querySelector('.party-intents');logs=ui.querySelector('ol');
 party.forEach((a,i)=>{const card=document.createElement('article');const title=document.createElement('strong');title.textContent=a.name+' ';const role=document.createElement('small');title.append(role);card.append(title);const list=document.createElement('ul');loadouts[i].forEach(id=>{const li=document.createElement('li');li.textContent=names(id);list.append(li);});card.append(list);cards.append(card);});
 const target=document.querySelector('.dwarf-targets');if(target)ui.querySelector('.party-buttons').before(target);
 ui.querySelector('#party-pass').onclick=()=>{if(!api.canCast(0,'pass'))return;cycle.start(0);note('방패병 대기');api.complete(bridge.now());bridge.resume();};ui.querySelector('#party-reset').onclick=()=>bridge.reset();ui.querySelector('#party-reroll').onclick=()=>{const next=new URLSearchParams(location.search);next.set('seed',crypto.getRandomValues(new Uint32Array(1))[0]);location.search=next;};document.querySelector('#restart-test').onclick=()=>bridge.reset();
 const picker=document.createElement('div');picker.className='target-picker';picker.innerHTML='<button aria-label="이전 몬스터 선택">◀</button><span aria-live="polite"></span><button aria-label="다음 몬스터 선택">▶</button>';picker.children[0].onclick=()=>moveTarget(-1);picker.children[2].onclick=()=>moveTarget(1);document.querySelector('#scene').append(picker);
 const prompt=document.createElement('div');prompt.id='target-prompt';prompt.hidden=true;prompt.innerHTML='<strong>공격할 대상을 선택하세요</strong><span>몬스터 클릭·터치 또는 ← → 선택 후 Enter</span><button>선택한 대상 공격</button><button>취소</button>';prompt.setAttribute('role','status');prompt.querySelectorAll('button')[0].onclick=()=>api.confirmTarget();prompt.querySelectorAll('button')[1].onclick=()=>api.cancelTarget();document.querySelector('#scene').append(prompt);
 document.addEventListener('keydown',e=>{
  if(!pendingTarget||e.defaultPrevented||e.isComposing||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable="true"]')||document.querySelector('#party-setup:not([hidden]),#loot-overlay:not([hidden]),dialog[open]'))return;
  if(e.key==='Escape'){
   e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
   const button=document.querySelector('.command-grid .target-pending');api.cancelTarget();button?.focus({preventScroll:true});
  }
  if(e.key==='Enter'){e.preventDefault();if(!e.repeat)api.confirmTarget();}
 });
 const charge=document.createElement('div');charge.id='charge-status';charge.hidden=true;charge.setAttribute('role','status');document.querySelector('#scene').append(charge);
 const arena=document.querySelector('#arena');let press=null;
 arena.addEventListener('pointerdown',e=>{press=e.isPrimary&&e.button===0?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;});
 arena.addEventListener('pointercancel',()=>press=null);
 arena.addEventListener('pointerup',e=>{const start=press;press=null;if(!start||start.id!==e.pointerId||Math.hypot(e.clientX-start.x,e.clientY-start.y)>12||!canChoose())return;const rect=arena.getBoundingClientRect(),x=(e.clientX-rect.left)*(window.MonsterRaster?.width(arena)??arena.width)/rect.width,y=(e.clientY-rect.top)*(window.MonsterRaster?.height(arena)??arena.height)/rect.height;
 const hit=selectable().filter(t=>{const a=t.spriteAsset||root.BATTLE_ASSETS[4],b=a.bounds,k=t.h/(b[3]-b[1]),anchor=a.anchor||[(b[0]+b[2])/2,b[3]],markerY=root.PartyStatusIcons?.markerY(t)??t.y-t.h-30;return (pendingTarget&&t.id===selectedTarget()?.id&&Math.abs(x-t.x)<=22&&y>=markerY-24&&y<=markerY+10)||x>=t.x+(b[0]-anchor[0])*k&&x<=t.x+(b[2]-anchor[0])*k&&y>=t.y+(b[1]-anchor[1])*k&&y<=t.y+(b[3]-anchor[1])*k;}).sort((a,b)=>b.y-a.y)[0];if(hit){selectTarget(hit.id);api.confirmTarget();}else api.cancelTarget();
 });
 document.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key)||e.ctrlKey||e.metaKey||e.altKey||e.target.matches('input,textarea,select'))return;if(canChoose()){e.preventDefault();moveTarget(e.key==='ArrowLeft'?-1:1);}});
 if(document.body.classList.contains('game-view')){const defeat=document.createElement('section');defeat.id='party-defeat';defeat.className='clear-overlay defeat-dialog';defeat.hidden=true;defeat.setAttribute('role','dialog');defeat.setAttribute('aria-label','던전 실패');defeat.innerHTML='<div class="clear-panel"><h2>던전 실패</h2><p>파티가 전멸했습니다.<br>잠시 후 캐릭터 선택 화면으로 돌아갑니다.</p><div class="clear-buttons"><button>캐릭터 선택으로</button></div></div>';defeat.querySelector('button').onclick=returnToSelection;document.querySelector('.screen').append(defeat);}
 openRound(bridge.now());refresh();},
 update(now){if(root.DungeonMenu?.isOpen)return;root.PartyResources?.sync();root.CampaignChallenge?.update();if(!bridge||root.GalleonCampaign?.blocked)return;if(!living().length){defeat();return;}if(bridge.finished()){if(cycle.phase!=='victory'){cycle.phase='victory';refresh();}return;}if(cycle.phase==='defeat'||cycle.phase==='victory')return;
 if(basic){const a=basic;root.DungeonVoices?.action(party[a.i].id,a.guard?'guard':'attack',a);if(!a.hit&&now-a.started>=700){a.hit=true;if(!a.guard){const target=enemies().find(e=>e.hp>0&&root.WizardSkills.canSelect(e));if(target){const r=bridge.damage(a.i,[target],600,false);if(r.lethal){basic=null;bridge.finish();return;}}}}if(now-a.started>=1500){basic=null;api.complete(now);}return;}
 root.PartyBasicActions.update(now,bridge);root.PartyMechanic?.update(now,bridge);root.PartyHero?.update(now,bridge);if(blocked()||now<readyAt)return;
 if(!roundOpened)openRound(now);
 if(cycle.phase==='allies'&&manual){
  if(planning()){
   if(hp(party[cycle.next])<=0){advancePlanning();return;}
   if(party[cycle.next]?.id==='archer'&&root.ArcherSkills?.model.snipingReady){queueAction('sniping-release');return;}
   refresh();return;
  }
  if(cycle.actor===null&&cycle.next<4){if(hp(party[cycle.next])<=0){cycle.start(cycle.next);api.complete(now);}else executePlanned(now);return;}
 }
 if(cycle.phase==='allies'){cycle.skipDead(party);if(cycle.phase==='allies'){if(cycle.actor===null&&party[cycle.next])root.DungeonVoices?.selection(party[cycle.next].id,cycle.turn+':'+cycle.next);if(cycle.actor===null&&party[cycle.next]?.id==='archer'&&root.ArcherSkills?.model.snipingReady){cycle.start(cycle.next);root.ArcherSkills.releaseSniping(now);refresh();return;}if(!manual&&cycle.actor===null&&cycle.next>0)startAI(cycle.next,now);refresh();return;}note('아군 4명 행동 완료 · 몬스터 공격 / 아군 대기');opening=true;refresh();}
 if(cycle.phase==='enemies'){
  if(root.WizardSkills&&!root.WizardSkills.beforeResponse(now))return;
  if(opening){opening=false;for(const {a,i}of living())if(a.statuses?.some(s=>kind(s)==='poison'&&s.until>=cycle.turn)){bridge.hit(i,BALANCE.poison);note(a.name+' · 독 피해');}enemyQueue=config.contractStone?[]:enemies().filter(e=>e.hp>0).map(e=>e.id);enemyIndex=0;readyAt=now+350;return;}
  if(enemyAction){const a=enemyAction,age=now-a.started,e=enemies().find(e=>e.id===a.id);if(!a.hit&&age>=a.impact){a.hit=true;if(e?.hp>0&&!skipEnemy(e)){if(a.plan.wipe){bridge.annihilate();root.DwarfSkills.model.charge=null;defeat(e.name+' · '+a.plan.name+' → 던전 실패');return;}if(a.plan.charge)root.CampaignChallenge?.failed();if(a.plan.clip==='guard')defending.add(e.id);const results=[];a.resolvedTargets=(a.targets||chooseTargets(e,a.plan)).filter(i=>hp(party[i])>0);if(a.resolvedTargets.length)root.DungeonCombatAudio?.enemyImpact(e,a);if(root.PartyMechanic)root.PartyMechanic.enemyHit({...a.plan,target:a.taunt?'single':a.plan.target,tauntRobot:a.taunt?.robot},root.PartyMonsterBalance?.outgoing(e,a.plan,root.PartyMechanic.caster)??a.plan.damage,a.resolvedTargets);for(const i of a.taunt?.robot?[]:a.resolvedTargets){const incoming=root.PartyMonsterBalance?.outgoing(e,a.plan,i)??a.plan.damage;const defense=root.GalleonCampaign?.statMultiplier?.(a.plan.damageType==='magic'?'magicDefense':'defense')??1;const n=bridge.hit(i,Math.round(incoming/defense));results.push(party[i].name+' '+n);if(a.plan.status&&(!root.CampaignChallenge?.enabled||root.CampaignChallenge.count(e.id)<2))addStatus(i,a.plan.status,e.id);if(a.plan.root)addStatus(i,'root',e.id);if(a.plan.pull)party[i].statuses=(party[i].statuses||[]).filter(s=>!(s.kind==='root'&&s.source===e.id));}note(e.name+' · '+a.plan.name+' → '+results.join(', '));}}if(age>=a.end){enemyAction=null;enemyIndex++;readyAt=now+300;}refresh();return;}
  if(enemyIndex>=enemyQueue.length){finishRound(now);return;}
  const e=enemies().find(e=>e.id===enemyQueue[enemyIndex]);if(!e||e.hp<=0){enemyIndex++;return;}if(skipEnemy(e)){note(e.name+' · '+(e.id==='primary'&&root.DwarfSkills.model.cancelled?'충전 취소':'상태이상으로 행동 차단'));enemyIndex++;readyAt=now+300;return;}
  const plan=plans.get(e.id)||planMonster(monsterId(e),cycle.turn,hasGrab(e.id)),asset=e.spriteAsset||root.BATTLE_ASSETS[4],clip=asset.actions[plan.clip];const total=clip.durations.reduce((a,b)=>a+b,0),visual=root.MonsterAttackVFX?.clipFor(e,plan),targets=chooseTargets(e,plan),taunt=plan.target==='self'?null:tauntSource(e);defending.delete(e.id);enemyAction={id:e.id,started:now,plan,visual,targets,taunt,impact:visual?.impactMs??clip.impactMs??Math.round(total*.48),end:visual?.durationMs??total+300,hit:false};root.DungeonCombatAudio?.enemyAction(e,enemyAction);refresh();
 }
 },
 pose(i,now){if(hp(party[i])<=0)return null;if(basic?.i===i){const clip=basic.guard?'idle':party[i].actions.attack?'attack':'magic';return clip==='idle'||party[i].actions[clip]?{clip,time:now-basic.started}:null;}const hit=hits.get(i),hurt=party[i].actions.hurt;if(hit!==undefined&&hurt&&now-hit<hurt.durations.reduce((a,b)=>a+b,0))return{clip:'hurt',time:now-hit};const common=root.PartyBasicActions.pose(i,now);if(common)return common;const hero=root.PartyHero?.pose(i,now);if(hero)return hero;const mechanic=root.PartyMechanic?.pose(i,now);if(mechanic)return mechanic;if(cycle.phase==='enemies'){if(i===0&&root.DwarfSkills.model.defenseTurns>0&&party[i].actions.guard)return{clip:'guard',time:550};return{clip:'idle',time:now};}return null;},
 enemyPose(id,now){const e=enemies().find(e=>e.id===id),a=e?.spriteAsset||root.BATTLE_ASSETS[4];if(e?.hp<=0)return root.BattleFinisher.deathPose(e,a,now,root.BattleDeathPresentation?.id);if(enemyAction?.id===id)return{clip:enemyAction.plan.clip,time:now-enemyAction.started};return{clip:'idle',time:now};},
 draw(g,positions){
 const labelNow=bridge?.now()||0;
 for(const [i,label] of skillLabels){const age=labelNow-label.started;if(age>=1800||hp(party[i])<=0){skillLabels.delete(i);continue;}const p=positions[i];g.save();g.globalAlpha=Math.min(1,(1800-age)/350);g.font='bold 24px Galmuri11, monospace';g.textAlign='center';g.textBaseline='bottom';g.lineWidth=5;g.strokeStyle='#090b18';g.fillStyle='#fff2c6';const x=Math.max(140,Math.min(1460,p.x)),y=Math.max(34,Math.min(p.y-p.h-48,...(root.PartyStatusIcons?.last?.find(u=>u.id==='ally:'+i)?.icons||[]).map(icon=>icon.y))-12);g.strokeText(label.text,x,y,280);g.fillText(label.text,x,y,280);g.restore();}
root.PartyHero?.draw(g,bridge?.now()||0,enemies(),positions);root.PartyMechanic?.draw(g,bridge?.now()||0,enemies(),positions);syncTargetButton();const grid=document.querySelector('.command-grid');if(grid)grid.style.setProperty('--target-glow',String((Math.sin((bridge?.now()||0)*Math.PI*2/1200)+1)/2));const target=selectedTarget(),picker=document.querySelector('.target-picker'),choosing=canChoose();if(picker){picker.hidden=!pendingTarget||!target||cycle.phase==='victory'||cycle.phase==='defeat';picker.querySelector('span').textContent=target?target.name:'';picker.querySelectorAll('button').forEach(b=>b.disabled=!choosing||selectable().length<2);}const charge=document.querySelector('#charge-status');if(charge){charge.hidden=document.body.classList.contains('game-view')||!root.DwarfSkills.model.charge&&!root.DwarfSkills.model.cancelled;const charging=root.DwarfSkills.model.charge,chargePlan=charging&&plans.get(charging.enemyId);charge.textContent=charging?(chargePlan?.name?.replace(/!$/,'')||'보스 공격')+' 충전 · '+(chargePlan?.wipe?'실패 시 방어·보호막 무시 · ':'')+'서로 다른 아군 특수기 '+charging.allies.size+'/2':'특수기술 파훼 성공';}document.querySelector('#scene').dataset.targeting=String(!!pendingTarget);if(pendingTarget&&target&&cycle.phase!=='victory'&&cycle.phase!=='defeat'){g.save();const glow=(Math.sin((bridge?.now()||0)*Math.PI*2/1200)+1)/2;g.globalAlpha=.78+glow*.22;g.shadowColor='#ffe8a1';g.shadowBlur=6+glow*10;g.fillStyle='#ffe28c';g.strokeStyle='#382816';g.lineWidth=3;const x=target.x,y=root.PartyStatusIcons?.markerY(target)??target.y-target.h-30;g.beginPath();g.moveTo(x-15,y-18);g.lineTo(x+15,y-18);g.lineTo(x,y+3);g.closePath();g.fill();g.stroke();g.restore();}g.save();g.font='23px Galmuri11, monospace';g.textAlign='center';for(const {a,i}of living()){const icons=(a.statuses||[]).map(s=>({root:'⛓',poison:'☠',blind:'●'})[kind(s)]).filter(Boolean);if(icons.length&&!root.PartyStatusIcons?.enabled()){g.fillStyle='#eeb794';g.fillText(icons.join(' '),positions[i].x,positions[i].y-positions[i].h-88);}}g.restore();},
 reset(){endedAfterRoundTicks=false;skillLabels.clear();clearTimeout(defeatTimer);defeatTimer=null;root.PartyStatusIcons?.reset();root.PartyResources?.reset();root.PartyMonsterBalance?.reset();root.PartyBasicActions.reset();root.PartyHero?.reset();root.PartyMechanic?.reset();api.cancelTarget();plannedActions.clear();executingPlans=false;launchingPlan=false;cycle.order=[...portraitOrder];cycle.reset();hits.clear();defending.clear();plans.clear();lastUsed.clear();history=[];enemyQueue=null;enemyIndex=0;enemyAction=null;basic=null;roundOpened=false;opening=false;readyAt=(bridge?.now()||0)+100;dispatch=false;party.forEach(a=>a.statuses=[]);if(bridge)refresh();}
};root.PartyTurns=api;
})(typeof window!=='undefined'?window:globalThis);
