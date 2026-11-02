(function(root){
'use strict';
// Provisional play-test balance, isolated from the approved skill rules/art.
const damage=(id,n)=>root.PlayerBalance?.damage('archer',id,n)??n;
const BALANCE=Object.freeze({phoenixShot:damage('phoenix-shot',2940),sniping:damage('sniping',3920),stunShot:damage('stun-shot',240),arrowRain:damage('arrow-rain',980),leafWind:damage('leaf-wind',980),baseCrit:.10,eagleBonus:.30,critMultiplier:1.5,enemyDamage:240,cost:0});
const DEBUFFS=new Set(['poison','burn','freeze','stun','slow','paralysis','blind','silence','bleed','curse','sleep','root']);
class ArcherCombat {
 constructor(balance=BALANCE,rng=Math.random){this.balance=balance;this.rng=rng;this.reset();}
 reset(){this.sniping=null;this.turn=1;this.roots=new Map();this.eagleUntil=0;}
 chargeSniping(target){this.sniping={target,due:this.turn+1};}
 get snipingReady(){return !!this.sniping&&this.turn>=this.sniping.due;}
 bind(enemy){if(!enemy||enemy.hp<=0||enemy.attackType!=='melee')return false;this.roots.set(enemy.id,this.turn);return true;}
 rooted(enemy){return enemy.hp>0&&enemy.attackType==='melee'&&this.roots.get(enemy.id)===this.turn;}
 eagle(){this.eagleUntil=this.turn+2;}
 get eagleTurns(){return Math.max(0,Math.min(3,this.eagleUntil-this.turn+1));}
 roll(base){const chance=Math.min(1,this.balance.baseCrit+(this.eagleTurns?this.balance.eagleBonus:0));const critical=this.rng()<chance;return{amount:Math.round(base*(critical?this.balance.critMultiplier:1)),critical,chance};}
 cleanse(party){let count=0;for(const a of party){if((a.currentHp??a.hp)<=0)continue;a.statuses=(a.statuses||[]).filter(s=>{const remove=typeof s==='string'?DEBUFFS.has(s):s?.debuff===true||DEBUFFS.has(s?.kind||s?.id);if(remove)count++;return !remove;});}return count;}
 endTurn(){this.turn++;this.roots.clear();if(this.turn>this.eagleUntil)this.eagleUntil=0;}
}
const api={BALANCE,ArcherCombat};if(typeof module==='object'&&module.exports)module.exports=api;
if(!root.document)return;
const party=root.BATTLE_ASSETS.slice(0,4),caster=party.findIndex(a=>a.id==='archer');if(caster<0)return;
const archer=party[caster],seq=(folder,n)=>Array.from({length:n},(_,i)=>folder+'/'+String(i+1).padStart(2,'0')+'.webp');
archer.actions||={};
archer.actions.attack={...archer.actions.attack};
archer.actions.attack.frames=Array.from({length:7},(_,i)=>`../characters/archer-attack-v6/frame-${String(i+1).padStart(2,'0')}.webp`);
archer.actions.attack.durations=[240,160,180,260,70,180,240];
archer.actions.magic={...archer.actions.magic,frames:Array.from({length:8},(_,i)=>`../characters/archer-animations-confirmed-v1/magic/frame-${String(i+1).padStart(2,'0')}.webp`),durations:[240,180,200,300,100,200,180,240]};
const specs={
 'phoenix-shot':{name:'피닉스 샷',folder:'archer-phoenix-shot-v6',n:29,durations:[...Array(28).fill(40),100],release:600,impact:1000,clip:'attack',target:'all',element:'fire',damage:BALANCE.phoenixShot,damageOverTime:false,w:600,h:400},
 'sniping':{name:'스나이핑',folder:'archer-sniping-v1',n:16,ms:40,release:0,impact:480,clip:'attack',target:'single',w:192,h:128},
 'stun-shot':{name:'스턴샷',folder:'archer-stun-shot-v3',n:16,ms:60,release:840,impact:1560,clip:'attack',target:'single',w:192,h:128},
 'arrow-rain':{name:'화살비',folder:'archer-arrow-rain-v2',n:9,ms:120,release:1330,impact:1690,clip:'attack',target:'all',w:160,h:160},
 'leg-bind':{name:'다리 묶기',folder:'archer-leg-bind-v2',n:15,durations:[180,110,110,110,130,130,180,220,220,130,90,90,90,90,400],release:920,impact:1460,clip:'magic',target:'melee',w:160,h:80},
 'leaf-wind':{name:'나뭇잎 바람',folder:'archer-leaf-wind-v5',n:26,ms:80,release:920,impact:1720,clip:'magic',target:'all',w:560,h:280},
 'natures-cure':{name:'자연의 치유',folder:'archer-natures-cure-v2',n:26,ms:80,release:920,impact:1720,clip:'magic',target:'party',w:128,h:256},
 'eagle-eye':{name:'독수리의 눈',folder:'archer-eagle-eye-v2',n:16,ms:100,release:920,impact:1720,clip:'magic',target:'self',w:128,h:128}
};
for(const s of Object.values(specs)){s.durations||=Array(s.n).fill(s.ms);s.total=s.durations.reduce((a,b)=>a+b,0);s.end=s.release+s.total;}
const descriptions={
 'phoenix-shot':'불사조가 적 전체를 관통 · 불속성 기본 피해 '+BALANCE.phoenixShot+' · 지속 피해 없음',
 'sniping':'이번 턴 조준 유지 → 다음 궁수 차례 자동 발사 · 단일 피해 3920 (기본 공격 4배)',
 'stun-shot':'선택한 적에게 약한 피해 240 · 보스 충전 중 서로 다른 아군 특수기 2회 연계로 전체기술 파훼',
 'arrow-rain':'ATTACK 이후 적 전체에 화살비 · 기본 피해 '+BALANCE.arrowRain,
 'leg-bind':'선택한 근접 몬스터의 이번 턴 이동과 피해 차단',
 'leaf-wind':'풀속성 · 살아 있는 적 전체에 기본 피해 '+BALANCE.leafWind,
 'natures-cure':'생존 아군 전체의 해로운 상태이상 해제',
 'eagle-eye':'자신의 치명타 확률 +30%p · 시전 턴 포함 3턴 (피해 배율 1.5배)'
};
const model=new ArcherCombat();let bridge,active=null,pending=null,loaded={},controls,targetSelect,info,lastNotice='',lastCritical=false,signature='';
const alive=a=>(a.currentHp??a.hp)>0;
const frameAt=(s,age)=>{if(age<0||age>=s.total)return -1;for(let i=0;i<s.n;i++){if(age<s.durations[i])return i;age-=s.durations[i];}return -1;};
const phoenixAttackDurations=[170,120,130,180,50,130,170];
function phoenixAttackTime(age){let start=0,original=0;for(let i=0;i<phoenixAttackDurations.length;i++){const ms=phoenixAttackDurations[i];if(age<start+ms)return original+(age-start)/ms*archer.actions.attack.durations[i];start+=ms;original+=archer.actions.attack.durations[i];}return null;}
function phoenixFlight(p,targets,age,canvasWidth){
 const scale=Math.min(1.3,p.h/180),growth=Math.min(1,age/200),w=(150+450*growth)*scale,h=w*2/3;
 const muzzle=p.x+p.h*.32,start=muzzle-150*scale*.92,first=Math.min(...targets.map(e=>e.x));
 const formed=Math.max(start+30,Math.min(muzzle+80*scale,first-600*scale*.65));
 const travel=Math.max(0,Math.min(1,(age-200)/880)),x=age<200?start+(formed-start)*growth:formed+(canvasWidth+32-formed)*travel;
 const targetY=targets.reduce((sum,e)=>sum+e.y-e.h*.45,0)/targets.length,center=p.y-p.h*.55+(targetY-(p.y-p.h*.55))*Math.min(1,age/500);
 return{x,y:center-h/2,w,h};
}
const enemies=()=>bridge.enemies();
function note(text){lastNotice=text;bridge.notice(text);}
function finishTurn(now){if(root.DwarfSkills)root.DwarfSkills.complete(now);else pending={at:now+1100};}
function refresh(){if(!bridge||!controls)return;const locked=bridge.busy()||!!active||!!pending;const es=enemies();const key=JSON.stringify(es.map(e=>[e.id,e.name,e.hp>0,e.attackType,root.WizardSkills?.canSelect(e)]));if(key!==signature){signature=key;const previous=targetSelect.value;targetSelect.replaceChildren();for(const e of es){const o=document.createElement('option');o.value=e.id;o.textContent=(e.name||e.id)+(e.attackType==='melee'?' · 근접':' · 원거리');o.disabled=e.hp<=0||!!(root.WizardSkills&&!root.WizardSkills.canSelect(e));targetSelect.append(o);}if(es.some(e=>e.id===previous&&e.hp>0&&(!root.WizardSkills||root.WizardSkills.canSelect(e))))targetSelect.value=previous;else targetSelect.value=es.find(e=>e.hp>0&&(!root.WizardSkills||root.WizardSkills.canSelect(e)))?.id||'';}
 controls.querySelectorAll('[data-archer-skill]').forEach(b=>{b.disabled=!!model.sniping||locked||!alive(archer)||(b.dataset.archerSkill==='leg-bind'&&!es.some(e=>e.id===targetSelect.value&&e.hp>0&&e.attackType==='melee'&&(!root.WizardSkills||root.WizardSkills.canSelect(e))))||!es.some(e=>e.hp>0);});targetSelect.disabled=locked;
 controls.querySelectorAll('[data-test]').forEach(b=>b.disabled=!!model.sniping||locked||!alive(archer));
 info.textContent=`${model.turn}턴 · ${active?specs[active.id].name:pending||root.DwarfSkills?.busy?'적 행동 대기':'행동 선택'}${model.sniping?' · 스나이핑 조준 중':''}${model.eagleTurns?' · 독수리의 눈 '+model.eagleTurns+'턴':''}`;
 const scene=document.querySelector('#scene');scene.dataset.archerSkill=active?.id||'';scene.dataset.sniping=active?.snipeRelease?'release':model.sniping?'charging':'';scene.dataset.archerTurn=String(model.turn);scene.dataset.archerEagleTurns=String(model.eagleTurns);scene.dataset.archerRoots=JSON.stringify([...model.roots.keys()]);scene.dataset.archerCritical=String(lastCritical);scene.dataset.archerNotice=lastNotice;scene.dataset.partyStatuses=JSON.stringify(party.map(a=>a.statuses||[]));
}
function start(id){if(model.sniping)return false;if(root.PartyTurns&&!root.PartyTurns.canCast(caster,id))return false;if(!bridge||bridge.busy()||active||pending||!specs[id]||!alive(archer)||!enemies().some(e=>e.hp>0))return false;const target=enemies().find(e=>e.id===(root.PartyTurns&&!root.PartyTurns.manual&&id==='stun-shot'&&root.DwarfSkills?.model.charge?root.DwarfSkills.model.charge.enemyId:targetSelect.value));if(['sniping','stun-shot'].includes(id)&&(!target||target.hp<=0||(root.WizardSkills&&!root.WizardSkills.canSelect(target))))return false;if(id==='leg-bind'&&(!target||target.hp<=0||target.attackType!=='melee'||(root.WizardSkills&&!root.WizardSkills.canSelect(target))))return false;
 if(id==='sniping')model.chargeSniping(target.id);
 active={id,charging:id==='sniping',started:bridge.now(),applied:false,target:target?.id,targets:enemies().filter(e=>e.hp>0).map(e=>({...e})),lethal:false};bridge.resume();bridge.buttons();note(specs[id].name+' 사용');refresh();return true;}
function releaseSniping(now){if(!model.snipingReady||active||pending||!alive(archer))return false;const valid=enemies().filter(e=>e.hp>0&&(!root.WizardSkills||root.WizardSkills.canSelect(e)));const e=valid.find(e=>e.id===model.sniping.target)||valid[0];model.sniping=null;if(!e){finishTurn(now);note('스나이핑 · 유효한 대상 없음');return true;}active={id:'sniping',snipeRelease:true,started:now,target:e.id,targets:[{...e}],applied:false,lethal:false};bridge.resume();bridge.buttons();note('스나이핑 · 관통 사격');return true;}
Object.assign(api,{
 model,specs,caster,start,releaseSniping,
 async load(load){await Promise.all([...Object.entries(specs).filter(([id])=>!root.CampaignAssets||root.CampaignAssets.uses('archer',id)).map(async([id,s])=>{loaded[id]=await Promise.all(seq('../skills/'+s.folder+'/frames',s.n).map(load));}),Promise.all((!root.CampaignAssets||root.CampaignAssets.uses('archer','phoenix-shot')?seq('../skills/archer-phoenix-shot-v6/aura-frames',8):[]).map(load)).then(ims=>loaded.phoenixAura=ims)]);},
 mount(b){bridge=b;controls=document.createElement('section');controls.className='archer-controls';controls.setAttribute('aria-label','궁수 스킬');controls.innerHTML='<strong>궁수 스킬</strong><div class="archer-skill-grid"></div><label>단일 스킬 대상 <select aria-label="단일 스킬 대상"></select></label><span role="status" class="archer-turn"></span><details><summary>전투 테스트</summary><button type="button" data-test="poison">생존 아군에게 중독 적용</button><button type="button" data-test="wait">턴 넘기기</button><p>테스트 수치: 화살비·나뭇잎 바람 980 / 피닉스 샷 2940 · 치명타 기본 10% / 버프 +30%p · MP 소비 없음</p></details>';
 document.querySelector('.screen').after(controls);targetSelect=controls.querySelector('select');info=controls.querySelector('.archer-turn');targetSelect.onchange=refresh;
 for(const [id,s]of Object.entries(specs)){const button=document.createElement('button');button.type='button';button.dataset.archerSkill=id;button.title=descriptions[id];const im=document.createElement('img');im.src=`../skills/${s.folder}/frames/${String(id==='eagle-eye'?6:7).padStart(2,'0')}.webp`;im.alt='';button.append(im,document.createTextNode(s.name));button.onclick=()=>start(id);controls.querySelector('.archer-skill-grid').append(button);}
 controls.querySelector('[data-test="poison"]').onclick=()=>{if(bridge.busy()||active||pending)return;for(const a of party)if(alive(a)){a.statuses||=[];if(!a.statuses.includes('poison'))a.statuses.push('poison');}note('테스트: 아군 중독 적용');refresh();};
 controls.querySelector('[data-test="wait"]').onclick=()=>{if(bridge.busy()||active||pending)return;finishTurn(bridge.now());bridge.resume();refresh();};refresh();
 },
 update(now){if(!bridge)return;if(!alive(archer)){model.sniping=null;model.eagleUntil=0;}if(!root.PartyTurns&&model.snipingReady&&!bridge.busy())releaseSniping(now);
  if(active){const a=active,s=specs[a.id],age=now-a.started;
   if(!alive(archer)){root.DungeonCombatAudio?.stopSpell(a);active=null;note('궁수 전투불능 · 시전 취소');bridge.buttons();}
   else{
    root.DungeonVoices?.action('archer',a.charging?'sniping-charge':a.id,a);root.DungeonCombatAudio?.spell('archer',a.id,a,age);
    if(!a.charging&&!a.applied&&age>=s.impact){a.applied=true;
     if(a.id==='phoenix-shot'){a.lethal=bridge.damage(caster,enemies().filter(e=>e.hp>0),BALANCE.phoenixShot,true,{element:'fire',skillId:a.id}).lethal;note('피닉스 샷 · 적 전체 불속성 명중 · 지속 피해 없음');}
     if(a.id==='arrow-rain'||a.id==='leaf-wind'){const result=bridge.damage(caster,enemies().filter(e=>e.hp>0),a.id==='arrow-rain'?BALANCE.arrowRain:BALANCE.leafWind,true,root.PlayerBalance?.hit('archer',a.id));a.lethal=result.lethal;note(s.name+' · 적 전체 명중');}
     if(a.id==='sniping'){const e=enemies().find(e=>e.id===a.target);if(e&&e.hp>0&&(!root.WizardSkills||root.WizardSkills.canSelect(e))){a.lethal=bridge.damage(caster,[e],BALANCE.sniping,false,root.PlayerBalance?.hit('archer','sniping')).lethal;note('스나이핑 · 강력한 한 발 명중');}}
     if(a.id==='stun-shot'){const e=enemies().find(e=>e.id===a.target);if(e&&e.hp>0&&(!root.WizardSkills||root.WizardSkills.canSelect(e))){a.lethal=bridge.damage(caster,[e],BALANCE.stunShot,false,root.PlayerBalance?.hit('archer','stun-shot')).lethal;a.interruptHit=true;note('스턴샷 · 약한 피해 / 특수기 연계');}}
     if(a.id==='leg-bind'){const e=enemies().find(e=>e.id===a.target);if(root.PlayerBalance&&e?.hp>0)a.lethal=bridge.damage(caster,[e],root.PlayerBalance.damage('archer','leg-bind',0),false,root.PlayerBalance.hit('archer','leg-bind')).lethal;note(model.bind(e)?'다리 묶기 · 이번 턴 이동·공격 피해 차단':'대상이 없어 속박하지 못했습니다');}
     if(a.id==='natures-cure'){note('자연의 치유 · 상태이상 '+model.cleanse(party)+'개 해제');}
     if(a.id==='eagle-eye'){model.eagle();note('독수리의 눈 · 시전 턴 포함 3턴 치명타 확률 증가');}
     if(a.id!=='stun-shot'||(a.interruptHit&&root.DwarfSkills?.model.charge?.enemyId===a.target))root.DwarfSkills?.special('archer',now,a.id,a.target);
    }
    if(age>=(a.charging?840:s.end)){const lethal=a.lethal;root.DungeonCombatAudio?.stopSpell(a);active=null;if(lethal)bridge.finish();else finishTurn(now);bridge.buttons();}
   }
  }
  if(pending&&now>=pending.at&&(!root.WizardSkills||root.WizardSkills.beforeResponse(now))){const report=[];for(const e of enemies().filter(e=>e.hp>0)){if(root.WizardSkills&&!root.WizardSkills.canEnemyAct(e)){report.push((e.name||e.id)+' 마법 상태 · 행동 불가');continue;}if(model.rooted(e)){report.push((e.name||e.id)+' 속박 · 피해 0');continue;}const living=party.map((a,i)=>({a,i})).filter(({a})=>alive(a));if(!living.length)break;const target=living[(model.turn-1)%living.length];bridge.enemyAttack();const damage=bridge.hit(target.i,BALANCE.enemyDamage);report.push(target.a.name+' '+damage+' 피해');}pending=null;model.endTurn();root.WizardSkills?.afterResponse();root.HealerSkills?.endTurn();root.BattleRoar?.completeTurn(now);note(report.join(' · ')||'적 행동 종료');bridge.buttons();}
  refresh();
 },
 completeTurn(now){if(!root.DwarfSkills&&!active&&!pending)finishTurn(now);},
 snapshotBuffs(consumeTurn=false){return {eagle:Math.max(0,model.eagleTurns-(consumeTurn?1:0))};},
 restoreBuffs(saved){const n=Math.max(0,Math.min(3,Math.floor(Number(saved?.eagle)||0)));model.eagleUntil=n?model.turn+n-1:0;if(bridge)refresh();},
 externalEndTurn(){model.endTurn();refresh();},
 canEnemyAct(e){return !model.rooted(e);},
 rollDamage(i,amount){if(i!==caster)return{amount,critical:false};const result=model.roll(amount);lastCritical=result.critical;return result;},
 pose(i,now){if(i!==caster||!alive(archer))return null;if(model.sniping)return{clip:'attack',time:active?.charging?Math.min(bridge.now()-active.started,700):700};if(!active)return null;if(active.id==='phoenix-shot'){const age=now-active.started,time=phoenixAttackTime(age);return time===null?{clip:'idle',time:age-950}:{clip:'attack',time};}if(active.snipeRelease)return{clip:'attack',time:Math.min(840+now-active.started,1329)};const s=specs[active.id],age=now-active.started,clip=archer.actions[s.clip],total=clip.durations.reduce((a,b)=>a+b,0);return age<total?{clip:s.clip,time:age}:{clip:'idle',time:age-total};},
 aura(ctx,layer,i,p,now){
  if(i!==caster||active?.id!=='phoenix-shot')return;
  const f=Math.floor((now-active.started)/100),im=loaded.phoenixAura?.[f];if(f<0||f>=8||!im)return;
  const h=p.h*1.5,w=h*200/270,x=p.x-w/2,y=p.y-h*.92,cut=Math.floor(im.height*205/270);
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(layer==='back')ctx.drawImage(im,0,0,im.width,cut,Math.round(x),Math.round(y),Math.round(w),Math.round(h*cut/im.height));
  else ctx.drawImage(im,0,cut,im.width,im.height-cut,Math.round(x),Math.round(y+h*cut/im.height),Math.round(w),Math.round(h*(im.height-cut)/im.height));
  ctx.restore();
 },
 draw(ctx,positions,now){if(!bridge)return;ctx.save();ctx.imageSmoothingEnabled=false;
  function image(id,n,x,y,w,h){if(n>=0&&loaded[id]?.[n])ctx.drawImage(loaded[id][n],Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  const scene=document.querySelector('#scene');scene.dataset.phoenixX='';scene.dataset.phoenixFrame='-1';
  if(active){const a=active,s=specs[a.id],f=frameAt(s,now-a.started-s.release),targets=a.targets;
   if(f>=0&&!a.charging){
    if(a.id==='phoenix-shot'&&f<28){const p=phoenixFlight(positions[caster],targets,now-a.started-s.release,(window.MonsterRaster?.width(ctx.canvas)??ctx.canvas.width));image(a.id,f,p.x,p.y,p.w,p.h);scene.dataset.phoenixX=String(p.x);scene.dataset.phoenixFrame=String(f);}
    if(a.id==='stun-shot'||a.id==='sniping'){const e=targets.find(e=>e.id===a.target);if(e){const p=positions[caster],t=Math.min(1,Math.max(0,(now-a.started-s.release)/(a.id==='sniping'?480:720))),scale=p.h/180,w=192*scale,h=128*scale;const x=p.x+p.h*.32+(e.x-(p.x+p.h*.32))*t,y=p.y-p.h*.58+(e.y-e.h*.52-(p.y-p.h*.58))*t;image(a.id,f,x-(a.id==='sniping'?178:154)*scale,y-64*scale,w,h);}}
    if(a.id==='arrow-rain'||a.id==='leaf-wind'){const left=Math.min(...targets.map(e=>e.x-e.h*.5)),right=Math.max(...targets.map(e=>e.x+e.h*.5)),ground=Math.max(...targets.map(e=>e.y));const width=Math.max(420,right-left+80);if(a.id==='arrow-rain')image(a.id,f,left-40,ground-440,width,470);else image(a.id,f,left-40,ground-340,width,360);}
    if(a.id==='leg-bind'){const e=targets.find(e=>e.id===a.target);if(e){const w=Math.max(180,e.h*.85);image(a.id,f,e.x-w/2,e.y-w*.47,w,w/2);}}
    if(a.id==='natures-cure')positions.slice(0,4).forEach((p,i)=>{if(alive(party[i])){const h=p.h*1.45;image(a.id,f,p.x-h/4,p.y-h*.94,h/2,h);}});
    if(a.id==='eagle-eye'){const p=positions[caster],w=p.h*1.2;image(a.id,f,p.x-w/2,p.y-p.h-w*.65,w,w);}
   }
  }
  for(const e of enemies()){if(model.rooted(e)&&(!active||active.id!=='leg-bind')){const w=Math.max(180,e.h*.85);image('leg-bind',6,e.x-w/2,e.y-w*.47,w,w/2);}}
  const p=positions[caster];if(model.eagleTurns&&alive(archer)&&!root.PartyStatusIcons?.buffsEnabled())image('eagle-eye',5,p.x-23,p.y-p.h-60,46,46);
  ctx.font=window.BATTLE_CONFIG?.partyTurns?'22px Galmuri11, monospace':'bold 22px sans-serif';ctx.textAlign='center';ctx.fillStyle='#a9e879';positions.slice(0,4).forEach((p,i)=>{if(!root.PartyStatusIcons?.enabled()&&alive(party[i])&&(party[i].statuses||[]).some(s=>(s.kind||s)==='poison'))ctx.fillText('☠',p.x+35,p.y-p.h-20);});ctx.restore();
  document.querySelector('#scene').dataset.archerFrame=String(active?frameAt(specs[active.id],now-active.started-specs[active.id].release):-1);
 },
 reset(){model.reset();active=null;pending=null;lastCritical=false;lastNotice='';for(const a of party)a.statuses=[];if(bridge)refresh();}
});
Object.defineProperty(api,'busy',{get:()=>!!active||!!pending});root.ArcherSkills=api;
})(typeof window!=='undefined'?window:globalThis);
