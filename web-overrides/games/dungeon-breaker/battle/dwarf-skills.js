(function(root){
'use strict';
// Explicitly approved test balance; all durations below are turns, not VFX seconds.
const BALANCE=Object.freeze({defenseReduction:.60,buffTurns:3,quakeChance:.30,mjolnirChance:.40,attackDamage:980,shieldDamage:720,enemyDamage:240,bossChargeFirstTurn:2,bossChargeInterval:3,bossMagicDamage:240});
// Only authored interruption attacks count in party combat. General spells,
// healing, buffs and defense must not silently supply a second contributor.
const BREAK_SKILLS=Object.freeze({hero:'sword-back',dwarf:'dwarf-wake',archer:'stun-shot',mechanic:'mine-explosion',priest:'holy-light'});
function isBreakSkill(actorId,skillId){return (!!BREAK_SKILLS[actorId]&&BREAK_SKILLS[actorId]===skillId)||(['hero','dwarf','archer','mechanic','wizard','priest'].includes(actorId)&&skillId===actorId+'-common-check');}
class DwarfCombat {
 constructor(balance=BALANCE,rng=Math.random){this.balance=balance;this.rng=rng;this.reset();}
 reset(){this.turn=1;this.taunts=new Map();this.stuns=new Map();this.defenseUntil=0;this.charge=null;this.cancelled=false;this.interruptedCharge=null;this.lastChargeTurn=0;}
 cast(id,enemies,targetId){const living=enemies.filter(e=>e.hp>0),events=[];
  if(id==='dwarf-taunt')for(const e of living){if(e.tauntImmune)events.push({type:'immune',id:e.id});else{this.taunts.set(e.id,this.turn);events.push({type:'taunt',id:e.id});}}
  if(id==='dwarf-bulwark'){this.defenseUntil=this.turn+(this.balance.buffTurns??3)-1;events.push({type:'defense'});}
  if(['dwarf-quake','dwarf-mjolnir'].includes(id))for(const e of living.filter(e=>id==='dwarf-quake'||e.id===targetId)){if(this.rng()<(id==='dwarf-quake'?this.balance.quakeChance:this.balance.mjolnirChance)){this.stuns.set(e.id,this.turn);events.push({type:'stun',id:e.id});}else events.push({type:'resist',id:e.id});}
  if(id==='dwarf-wake'&&this.breakHit('dwarf',id,living.find(e=>e.id===targetId)))events.push({type:'cancel'});
  return events;
 }
 maybeStartCharge(enemy){if(!enemy||enemy.hp<=0||this.charge||this.cancelled||this.lastChargeTurn===this.turn||this.turn<this.balance.bossChargeFirstTurn||(this.turn-this.balance.bossChargeFirstTurn)%this.balance.bossChargeInterval!==0)return false;this.startCharge(enemy.id);return true;}
 startCharge(enemyId){this.lastChargeTurn=this.turn;this.charge={enemyId,responseTurn:this.turn,allies:new Set()};this.cancelled=false;}
 special(actorId){if(!this.charge||this.charge.responseTurn!==this.turn)return false;this.charge.allies.add(actorId);if(this.charge.allies.size<2)return false;this.interruptedCharge={enemyId:this.charge.enemyId,turn:this.turn,allies:[...this.charge.allies]};this.charge=null;this.cancelled=true;return true;}
 breakHit(actorId,skillId,target){if(!isBreakSkill(actorId,skillId)||!target||target.hp<=0||target.id!==this.charge?.enemyId)return false;return this.special(actorId);}
 stunned(id){return this.stuns.get(id)===this.turn;}
 target(enemyId,party,preferred=1){const alive=party.map((a,i)=>({a,i})).filter(({a})=>(a.currentHp??a.hp)>0);if(!alive.length)return null;if(this.taunts.get(enemyId)===this.turn&&alive.some(x=>x.i===0))return 0;return alive.find(x=>x.i===preferred)?.i??alive[0].i;}
 get defenseTurns(){return Math.max(0,this.defenseUntil-this.turn+1);}
 snapshotBuffs(){return {defense:this.defenseTurns};}
 restoreBuffs(saved){const value=Number(saved?.defense),n=Number.isFinite(value)?Math.max(0,Math.min(this.balance.buffTurns??3,Math.floor(value))):0;this.defenseUntil=n?this.turn+n-1:0;}
 incoming(actorIndex,amount){return Math.round(amount*(actorIndex===0&&this.defenseTurns>0?1-this.balance.defenseReduction:1));}
 endTurn(){this.turn++;this.taunts.clear();this.stuns.clear();if(this.defenseUntil<this.turn)this.defenseUntil=0;this.charge=null;this.cancelled=false;this.interruptedCharge=null;}
}
const api={BALANCE,DwarfCombat,BREAK_SKILLS,isBreakSkill};if(typeof module==='object'&&module.exports)module.exports=api;
if(!root.document||(root.BATTLE_ASSETS?.[0]?.id!=='dwarf'&&!root.PartyRoster))return;
const assets=root.BATTLE_ASSETS,actor=assets[0].id==='dwarf'?assets[0]:root.PartyRoster.dwarf;actor.name='방패병';
const files=(folder,n,prefix='frame-')=>Array.from({length:n},(_,i)=>`${folder}/${prefix}${String(i+1).padStart(2,'0')}.webp`);
const clone=clip=>({...clip,frames:[...clip.frames],durations:[...clip.durations]});
for(const key of ['forward','return','turn','guard','magic'])actor.actions[key]={...actor.actions[key],frames:files(`../characters/dwarf-tank-movement-v3/${key}`,8),size:[576,576]};
const heldGuard=ms=>({frames:[...files('../characters/dwarf-tank-movement-v3/guard',3),'../characters/dwarf-tank-movement-v3/guard/frame-04.webp',...files('../characters/dwarf-tank-movement-v3/guard',8).slice(4)],durations:[240,150,150,ms,90,220,180,240],size:[576,576]});
actor.actions.dwarfTaunt=heldGuard(2700);actor.actions.dwarfBulwark=heldGuard(3100);actor.actions.dwarfQuake=heldGuard(2650);
actor.actions.dwarfBash=clone(actor.actions.guard);actor.actions.dwarfBash.frames[3]='../skills/dwarf-shield-bash-guard-v2/guard-impact.webp';
actor.actions.dwarfWake={...clone(actor.actions.attack),frames:files('../skills/dwarf-wake-up-attack-v2/frames',8)};
actor.actions.dwarfMjolnir=clone(actor.actions.attack);actor.actions.dwarfMjolnir.frames.push(actor.frames[0]);actor.actions.dwarfMjolnir.durations.push(1050);
const base={type:'skill',cost:0,offensive:false,damage:0,color:'#ffe3a0',icon:0,dwarfSkill:true};
const skills=[
 {...base,id:'dwarf-taunt',name:'나를 쓰러트려라!',clip:'dwarfTaunt',stationary:true,impact:720,icon:1,description:'일부 적 면역 · 이번 턴 적의 공격을 방패병에게 집중'},
 {...base,id:'dwarf-bulwark',name:'내가 지킨다!',clip:'dwarfBulwark',stationary:true,impact:800,icon:2,description:'거대 얼음 방패 · 시전 턴 포함 3턴 받는 피해 60% 감소 · 재시전 시 갱신'},
 {...base,id:'dwarf-bash',name:'방패 가격',clip:'dwarfBash',impact:650,offensive:true,damage:720,description:'기존 Guard 자세로 방패 가격 · 720 피해'},
 {...base,id:'dwarf-wake',name:'정신 차리게!',clip:'dwarfWake',impact:690,offensive:true,damage:980,description:'980 피해 · 충전 대응 턴에 서로 다른 아군 특수기술 2개로 시전 취소'},
 {...base,id:'dwarf-quake',name:'다들 저리 꺼져!',clip:'dwarfQuake',impact:1050,offensive:true,damage:980,stationary:true,target:'all-living-enemies',description:'제자리 시전 · 전체 적·보스에 980 피해, 각각 30% 확률로 이번 턴 기절'},
 {...base,id:'dwarf-mjolnir',name:'망치 받아라!',clip:'dwarfMjolnir',impact:1590,offensive:true,damage:980,stationary:true,description:'제자리 ATTACK 3프레임 발사 · 980 피해, 40% 확률로 이번 턴 기절'}
];
const config=root.BATTLE_CONFIG||{};config.skillCatalog=[...skills,{id:'attack',name:'철퇴 강타',type:'skill',clip:'attack',impact:690,damage:980,offensive:true,color:'#ffe3a0',icon:0,cost:0,description:'기본 공격'},{id:'item',name:'회복 물약',type:'heal',clip:'item',impact:1050,damage:0,offensive:false,color:'#72efbc',icon:3,quantity:3,description:'회복 물약'}];config.initialSlots=[skills[0],skills[1],skills[4],skills[5]];if(!config.partyTurns&&new URLSearchParams(location.search).get('formation')==='group')config.enemyFormation=[{id:'demon-left',x:1090,y:620,maxHp:2600},{id:'demon-right',x:1430,y:625,maxHp:2600}];root.BATTLE_CONFIG=config;
const models=new DwarfCombat();let bridge,loaded={},pending=null,lastEvents=[],cancelAt=null,chargeAt=0,spellAt=null,allyCasts=new Map(),activeSkill=null,dwarfActedTurn=0;
const specs={
 taunt:{path:'../skills/dwarf-challenge-v1/frames',n:32,prefix:'effect-',ms:80,w:768,h:640,anchor:[384,530]},
 ice:{path:'../skills/dwarf-ice-bulwark-v2/frames',n:32,prefix:'ice-bulwark-',dur:[80,70,60,50,110,70,70,90,...Array(24).fill(100)],w:768,h:640,anchor:[230,550]},
 quake:{path:'../skills/dwarf-get-away-quake-v1/frames',n:32,prefix:'quake-',ms:80,w:960,h:640,anchor:[180,450]},
 hammer:{path:'../skills/dwarf-take-mjolnir-v5/frames',n:12,prefix:'hammer-',ms:70,w:64,h:40},
 charge:{path:'../effects/boss-ultimate-channel-v4/frames',n:40,prefix:'frame-',ms:80,w:384,h:256,anchor:[275,201]},
 cancel:{path:'../effects/boss-ultimate-cancel-v2/frames',n:28,prefix:'frame-',ms:60,w:384,h:256,anchor:[275,201]}
};
let controls,turnLabel,targetSelect,allySelect,allyButton,chargeButton,immune,responsePanel,responseStatus,wakeButton,resolveButton,targetSignature="";
function enemies(){return bridge.enemies();}
function notice(text){bridge.notice(text);}
function cancel(now){cancelAt=now;if(pending){pending.waiting=false;pending.at=now+1680;}notice('서로 다른 아군 2명 연계 성공 · 보스 마법 취소!');}
function frameIndex(spec,age,loop=false){const ds=spec.dur||Array(spec.n).fill(spec.ms),total=ds.reduce((a,b)=>a+b,0);if(age<0||(!loop&&age>=total))return -1;let t=loop?age%total:age;for(let i=0;i<ds.length;i++){if(t<ds[i])return i;t-=ds[i];}return -1;}
function fx(ctx,id,age,p,scale=1,loop=false){const spec=specs[id],f=frameIndex(spec,age,loop);if(f<0)return;(root.MonsterRaster&&['charge','cancel'].includes(id)?(...args)=>root.MonsterRaster.image(ctx,...args):(...args)=>ctx.drawImage(...args))(loaded[id][f],Math.round(p.x-spec.anchor[0]*scale),Math.round(p.y-spec.anchor[1]*scale),Math.round(spec.w*scale),Math.round(spec.h*scale));}
function tauntLayer(ctx,key,age,p){const f=frameIndex(specs.taunt,age);if(f<0)return;const s=.72;ctx.drawImage(loaded[key],(f%8)*768,Math.floor(f/8)*640,768,640,Math.round(p.x-384*s),Math.round(p.y-530*s),Math.round(768*s),Math.round(640*s));}
Object.assign(api,{
 skills,model:models,
 get busy(){return !!pending||allyCasts.size>0;},
 async load(load){await Promise.all(Object.entries(specs).filter(([key])=>['charge','cancel'].includes(key)||!root.CampaignAssets||root.CampaignAssets.uses('dwarf',{taunt:'dwarf-taunt',ice:'dwarf-bulwark',quake:'dwarf-quake',hammer:'dwarf-mjolnir'}[key])).map(async([key,spec])=>{loaded[key]=await Promise.all(files(spec.path,spec.n,spec.prefix).map(load));}));if(!root.CampaignAssets||root.CampaignAssets.uses('dwarf','dwarf-taunt'))await Promise.all(['aura-back','aura-front','roar-waves'].map(async key=>{loaded[key]=await load('../skills/dwarf-challenge-v1/'+key+'-sheet.webp');}));},
 mount(b){bridge=b;const host=document.querySelector('.commands');controls=document.createElement('div');controls.className='dwarf-controls';controls.innerHTML='<div id="loadout-slots" class="dwarf-loadout"></div><div class="dwarf-targets"><label>공격 대상 <select id="dwarf-target" aria-label="방패병 공격 대상"></select></label><span id="dwarf-turn" role="status"></span></div><section class="boss-response" id="boss-response" hidden><strong id="boss-response-status" role="status"></strong><p>이번 턴에 서로 다른 아군 2명의 특수기술을 사용하세요. 시간 제한은 없습니다.</p><button id="dwarf-wake-special">정신 차리게!</button><label>동료 <select id="dwarf-ally" aria-label="특수기술 연계 아군"></select></label><button id="dwarf-ally-special">동료 특수기술 연계</button><button id="boss-response-end">연계 종료 · 적 행동 진행</button></section><details><summary>전투 테스트 설정</summary><label><input id="dwarf-immunity" type="checkbox"> 선택 적 도발 면역</label><button id="dwarf-charge">보스 충전 시작</button><p>테스트 밸런스: 적 턴 피해 240 · 스킬 MP 소비 없음 · 보스는 2턴부터 3턴마다 충전, 실패 시 생존 아군 전체에 240 피해</p></details>';
 document.querySelector('.screen').after(controls);turnLabel=controls.querySelector('#dwarf-turn');targetSelect=controls.querySelector('#dwarf-target');allySelect=controls.querySelector('#dwarf-ally');allyButton=controls.querySelector('#dwarf-ally-special');chargeButton=controls.querySelector('#dwarf-charge');immune=controls.querySelector('#dwarf-immunity');responsePanel=controls.querySelector('#boss-response');responseStatus=controls.querySelector('#boss-response-status');wakeButton=controls.querySelector('#dwarf-wake-special');resolveButton=controls.querySelector('#boss-response-end');wakeButton.onclick=()=>{if(bridge.busy()||allyCasts.size||!models.charge||dwarfActedTurn===models.turn||(assets[0].currentHp??assets[0].hp)<=0)return;targetSelect.value=models.charge.enemyId;pending=null;bridge.startSpecial();};resolveButton.onclick=()=>{if(!pending||bridge.busy()||allyCasts.size)return;pending.waiting=false;pending.at=bridge.now();bridge.resume();};
 assets.slice(1,4).forEach((a,i)=>{const o=document.createElement('option');o.value=i+1;o.textContent=a.name;allySelect.append(o);});
 targetSelect.onchange=()=>refresh();immune.onchange=()=>{const e=enemies().find(e=>e.id===targetSelect.value);if(e)e.tauntImmune=immune.checked;};
 chargeButton.onclick=()=>{if(bridge.busy()||api.busy||!bridge.isBoss())return;models.startCharge(enemies()[0].id);chargeAt=bridge.now();cancelAt=null;bridge.resume();refresh();notice('보스 충전 · 이번 대응 턴에 서로 다른 아군 특수기술 2개 필요');};
 allyButton.onclick=()=>{const i=Number(allySelect.value),a=assets[i];if(!models.charge||allyCasts.has(i)||models.charge.allies.has(a.id)||(a.currentHp??a.hp)<=0||bridge.blocked())return;allyCasts.set(i,{started:bridge.now(),hit:false});bridge.resume();refresh();};refresh();
 },
 target(){return targetSelect?.value;},
 before(current){dwarfActedTurn=models.turn;current.dwarfTarget=api.target();activeSkill=current.def.id;},
 cast(current,state,now){if(!current.def.dwarfSkill||current.dwarfApplied||state.phase!=='acting'||state.local<current.def.impact)return;current.dwarfApplied=true;lastEvents=models.cast(current.def.id,enemies(),current.dwarfTarget);if(lastEvents.some(e=>e.type==='cancel'))cancel(now);else notice(lastEvents.map(e=>({immune:'도발 면역',taunt:'도발 적용',defense:'받는 피해 60% 감소',stun:'기절 성공',resist:'기절 저항'})[e.type]).filter(Boolean).join(' · ')||current.def.name+' 명중');refresh();},
 incoming(i,n){return models.incoming(i,n);},
 beginCharge(id,now){models.startCharge(id);chargeAt=now;cancelAt=null;},
 endPartyTurn(){models.endTurn();refresh();},
 snapshotBuffs(){return assets.slice(0,4).some(a=>a.id==='dwarf'&&(a.currentHp??a.hp)>0)?models.snapshotBuffs():{defense:0};},
 restoreBuffs(saved){models.restoreBuffs(assets.slice(0,4).some(a=>a.id==='dwarf'&&(a.currentHp??a.hp)>0)?saved:null);if(bridge)refresh();},
 special(actorId,now,skillId,targetId){
  if(config.partyTurns){
   const caster=assets.slice(0,4).find(a=>a.id===actorId),target=enemies().find(e=>e.id===targetId);
   if(!caster||(caster.currentHp??caster.hp)<=0||!target||root.WizardSkills&&!root.WizardSkills.canSelect(target))return;
   if(models.breakHit(actorId,skillId,target))cancel(now);
  }else if(models.special(actorId))cancel(now); // Historical standalone response demo.
 },
 complete(now){activeSkill=null;if(root.PartyTurns){root.PartyTurns.complete(now);return;}pending={at:now+1500,started:now,waiting:!!models.charge&&!bridge.isDemo()};bridge.resume();refresh();notice('적 행동 대기 · 이번 턴 상태 효과 유지');},
 update(now){if(!bridge)return;if((actor.currentHp??actor.hp)<=0)models.defenseUntil=0;const boss=enemies()[0];if(boss?.hp<=0){models.charge=null;allyCasts.clear();}if(bridge.isBoss()&&!bridge.busy()&&!pending&&(!root.WizardSkills||root.WizardSkills.canEnemyAct(boss))&&models.maybeStartCharge(boss)){chargeAt=now;cancelAt=null;notice('보스 마법 충전! 이번 턴 특수기술 2명 연계로 취소하세요.');}for(const [i,c] of allyCasts){if(!c.hit&&now-c.started>=500){c.hit=true;if(models.special(assets[i].id))cancel(now);}if(now-c.started>=1000)allyCasts.delete(i);}
  if(pending&&!pending.waiting&&now>=pending.at&&allyCasts.size===0&&!bridge.blocked()&&(!root.WizardSkills||root.WizardSkills.beforeResponse(now))){for(const e of enemies().filter(e=>e.hp>0)){if(root.WizardSkills&&!root.WizardSkills.canEnemyAct(e)){notice('마법 상태 · 적 행동 불가');continue;}if(models.cancelled&&e.id==='primary'){notice('보스 시전 취소 · 이번 행동 무효');continue;}if(models.charge?.enemyId===e.id&&!models.stunned(e.id)){spellAt=now;bridge.enemyAttack();for(let j=0;j<4;j++)if((assets[j].currentHp??assets[j].hp)>0)bridge.hit(j,BALANCE.bossMagicDamage);notice('보스 마법 발동 · 아군 전체 피해!');continue;}if(root.ArcherSkills&&!root.ArcherSkills.canEnemyAct(e)){notice('속박 · 이동·공격 피해 차단');continue;}if(models.stunned(e.id)){notice('기절 · 적 행동 불가');continue;}const i=models.target(e.id,assets.slice(0,4),(models.turn-1)%4);if(i!==null){bridge.enemyAttack();const damage=bridge.hit(i,BALANCE.enemyDamage);notice(`${assets[i].name} ${damage} 피해`);}}
   models.endTurn();root.WizardSkills?.afterResponse();root.ArcherSkills?.externalEndTurn();root.HealerSkills?.endTurn();root.BattleRoar?.completeTurn(now);pending=null;bridge.buttons();}
  refresh();
 },
 pose(i,now){const c=allyCasts.get(i);return c?{clip:assets[i].actions?.magic?'magic':assets[i].actions?.attack?'attack':'idle',time:now-c.started}:null;},
 draw(ctx,layerName,actor,target,current,state,now){
  const bossTarget=target;const age=state?.local??-1;target=enemies().find(e=>e.id===current?.dwarfTarget)||target;
  if(layerName==='back'&&current?.def.dwarfSkill&&state?.phase==='acting'){
   if(current.def.id==='dwarf-taunt')tauntLayer(ctx,'aura-back',age-540,actor);
   if(current.def.id==='dwarf-bulwark')fx(ctx,'ice',age-540,actor,.72);
   if(current.def.id==='dwarf-quake')fx(ctx,'quake',age-540,actor,.92);
  }
  if(layerName!=='front')return;
  if(current?.def.id==='dwarf-taunt'&&state?.phase==='acting'){tauntLayer(ctx,'aura-front',age-540,actor);tauntLayer(ctx,'roar-waves',age-540,actor);}
  if(current?.def.id==='dwarf-mjolnir'&&state?.phase==='acting'&&age>=400&&age<1590){const t=(age-400)/1190,from={x:actor.x+40,y:actor.y-190},to={x:target.x,y:target.y-target.h*.45},x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t-Math.sin(t*Math.PI)*32,f=frameIndex(specs.hammer,age-400,true),scale=1.7;ctx.drawImage(loaded.hammer[f],Math.round(x-48*scale),Math.round(y-20*scale),Math.round(64*scale),Math.round(40*scale));}
  if(models.charge&&(!config.partyTurns||config.isFinalBoss)){const f=now-chargeAt<640?Math.floor((now-chargeAt)/80):8+Math.floor((now-chargeAt-640)/80)%32;const sc=1.6;(root.MonsterRaster?(...args)=>root.MonsterRaster.image(ctx,...args):(...args)=>ctx.drawImage(...args))(loaded.charge[f],bossTarget.x-275*sc,bossTarget.y-201*sc,384*sc,256*sc);}
  if(config.partyTurns&&!config.isFinalBoss){
   const action=root.PartyTurns?.enemyAction;
   if(cancelAt!==null&&now-cancelAt<1680){const e=enemies().find(e=>e.id===models.interruptedCharge?.enemyId&&e.hp>0);if(e)root.DungeonCombatRules.drawChargeResult(ctx,e,now-cancelAt,true);}
   else if(models.charge){const e=enemies().find(e=>e.id===models.charge.enemyId&&e.hp>0);if(e){if(action?.id===e.id&&action.plan.charge&&action.hit)root.DungeonCombatRules.drawChargeResult(ctx,e,now-action.started-action.impact,false,action.plan.name);else if(!root.PartyStatusIcons?.enabled())root.DungeonCombatRules.drawDanger(ctx,e,now);}}
  }
  if(spellAt!==null&&now-spellAt<650){ctx.save();ctx.fillStyle=`rgba(255,120,50,${.28*(1-(now-spellAt)/650)})`;ctx.fillRect(0,0,(window.MonsterRaster?.width(ctx.canvas)??ctx.canvas.width),(window.MonsterRaster?.height(ctx.canvas)??ctx.canvas.height));ctx.restore();}
  if(cancelAt!==null&&now-cancelAt<1680&&(!config.partyTurns||config.isFinalBoss))fx(ctx,'cancel',now-cancelAt,bossTarget,1.6);
  ctx.save();ctx.font=window.BATTLE_CONFIG?.partyTurns?'26px Galmuri11, monospace':'bold 26px sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffe178';
  if(models.defenseTurns>0&&!root.PartyStatusIcons?.buffsEnabled())ctx.fillText('🛡',actor.x,actor.y-actor.h-22);
  for(const e of enemies()){if(e.hp<=0)continue;if(models.stunned(e.id)&&!root.PartyStatusIcons?.enabled())ctx.fillText('✦ ✦',e.x,e.y-e.h-18);}ctx.restore();
  const scene=document.querySelector('#scene');scene.dataset.dwarfSkill=current?.def.dwarfSkill?current.def.id:'';scene.dataset.dwarfTurn=String(models.turn);scene.dataset.dwarfStunned=String(models.stunned(enemies()[0]?.id));scene.dataset.dwarfDefense=String(models.defenseTurns>0);scene.dataset.dwarfCharge=String(!!models.charge);scene.dataset.dwarfCancelled=String(cancelAt!==null&&now-cancelAt<1680);
 },
 reset(){models.reset();pending=null;allyCasts.clear();cancelAt=null;spellAt=null;activeSkill=null;dwarfActedTurn=0;lastEvents=[];if(bridge)refresh();}
});
Object.defineProperty(api,'blocksHealer',{get:()=>api.busy&&!(pending?.waiting&&models.charge&&!models.charge.allies.has('priest')&&allyCasts.size===0)});
Object.defineProperty(api,'blocksWizard',{get:()=>api.busy&&!(pending?.waiting&&models.charge&&!models.charge.allies.has('wizard')&&allyCasts.size===0)});
Object.defineProperty(api,'blocksArcher',{get:()=>api.busy&&!(pending?.waiting&&models.charge&&!models.charge.allies.has('archer')&&allyCasts.size===0)});
Object.defineProperty(api,'busy',{get:()=>!!pending||allyCasts.size>0});
function refresh(){if(!bridge||!controls)return;const es=enemies(),selected=targetSelect.value;const signature=JSON.stringify(es.map(e=>[e.id,e.name,e.hp>0,models.stunned(e.id),root.WizardSkills?.canSelect(e)]));if(signature!==targetSignature){targetSignature=signature;targetSelect.replaceChildren();for(const e of es){const o=document.createElement('option');o.value=e.id;o.textContent=e.name+(models.stunned(e.id)?' · 기절':'');o.disabled=e.hp<=0||!!(root.WizardSkills&&!root.WizardSkills.canSelect(e));targetSelect.append(o);}if(es.some(e=>e.id===selected&&e.hp>0&&(!root.WizardSkills||root.WizardSkills.canSelect(e))))targetSelect.value=selected;else targetSelect.value=es.find(e=>e.hp>0&&(!root.WizardSkills||root.WizardSkills.canSelect(e)))?.id||'';}
 const locked=bridge.busy()||!!pending||bridge.blocked();targetSelect.disabled=locked;immune.disabled=locked;immune.checked=!!es.find(e=>e.id===targetSelect.value)?.tauntImmune;controls.querySelectorAll('#loadout-slots select').forEach(el=>el.disabled=locked||allyCasts.size>0);
 const intent=document.querySelector('.intent b');if(intent&&!root.PartyTurns)intent.textContent=models.charge?'마법 충전 · 특수기술 연계로 취소':bridge.intent();responsePanel.hidden=!models.charge&&!models.cancelled;responseStatus.textContent=models.cancelled?'연계 성공 · 보스 마법 취소!':`보스 마법 충전 · 특수기술 ${models.charge?.allies.size||0}/2명`;wakeButton.disabled=bridge.busy()||bridge.blocked()||dwarfActedTurn===models.turn||allyCasts.size>0||!models.charge||models.charge.allies.has('dwarf')||(assets[0].currentHp??assets[0].hp)<=0;resolveButton.disabled=!pending||bridge.busy()||allyCasts.size>0;
 turnLabel.textContent=`${models.turn}턴 · ${pending?'적 행동 대기':models.charge?'보스 충전 대응':'아군 행동'}`;
 chargeButton.disabled=locked||allyCasts.size>0||!bridge.isBoss()||!!models.charge;
 const i=Number(allySelect.value),a=assets[i];allyButton.disabled=!models.charge||!a||(a.currentHp??a.hp)<=0||models.charge.allies.has(a.id)||allyCasts.has(i)||bridge.blocked();
}
root.DwarfSkills=api;
})(typeof window!=='undefined'?window:globalThis);
