/* All dungeon campaigns consume the same edited workbook snapshot. */
(()=>{
const q=new URLSearchParams(location.search),data=MONSTER_BALANCE_DATA,cfg=BATTLE_CONFIG;
if(!cfg.partyTurns)return;
const floor=Math.max(1,Math.min(9,Number(q.get('floor'))||1));
let seed=q.get('seed');if(!seed){const key='monster-balance:seed:'+location.pathname+location.search;seed=sessionStorage.getItem(key)||String(crypto.getRandomValues(new Uint32Array(1))[0]);sessionStorage.setItem(key,seed);}
const dungeon=DUNGEON_COMBAT_DATA[q.get('dungeon')]||DUNGEON_COMBAT_DATA['01'],dungeonId=dungeon.id;
const manifest=dungeon,route=manifest.floors.find(f=>f.floor===floor),ids=route.monsters;
window.ActiveDungeon={id:dungeonId,environment:dungeon.environment,label:route.label,floorLabel:n=>manifest.floors.find(f=>f.floor===n).label};
document.documentElement.dataset.dungeonId=dungeonId;
document.querySelector('.location h1').dataset.dungeonName=dungeonId;
GameDungeons.refresh();
document.querySelector('.location p').textContent=route.label;
document.querySelector('.clear-location').textContent=GameDungeons.name(dungeonId)+' · '+route.label;
document.querySelector('#loading').textContent='던전에 진입하는 중…';
const requested=q.get('monster'),primary=manifest.monsters.some(m=>m.id===requested)?requested:ids[0];
const encounters={};let rng;
const firstMidbossId=dungeonId+':'+manifest.floors.find(f=>f.floor===4).monsters[0],firstMidboss=data.monsters[firstMidbossId];
const firstMidbossSkills=Object.values(data.skills).filter(s=>s.monster===firstMidbossId&&s.target!=='self'&&!s.wipe&&s.damage>0);
function asset(id){const m=manifest.monsters.find(m=>m.id===id),s=data.monsters[dungeonId+':'+id],actions=m.actions;return {id,name:s.name,hp:s.hp,mp:0,size:m.canvas,anchor:m.anchor,bounds:m.bounds,frames:actions.idle.frames,durations:actions.idle.durations,actions,element:s.element};}
function configure(id,key){const options={contractMissionFloors:window.GalleonCampaign?.contractMissionFloors||[]},base=MonsterBalance.stats(dungeonId+':'+id,seed+':'+floor,undefined,options),reference=floor===8?MonsterBalance.stats(firstMidbossId,seed+':4',base.affixes):undefined,m=window.CampaignChallenge?.stats(base,floor,reference)||base;encounters[key]=m;return m;}
const stone=cfg.contractStone=window.GalleonCampaign?.stone;
const first=stone?(encounters.primary=stone):configure(primary,'primary');document.querySelector('.location p').textContent=route.label+([4,8,9].includes(floor)?' · '+first.name:'');BATTLE_ASSETS[4]=stone?ContractStones.asset(stone):asset(primary);BATTLE_ASSETS[4].hp=first.hp;
const boss=first.affixCount>0;cfg.isBoss=boss;cfg.isFinalBoss=first.rank==='최종 보스';cfg.enemyRank=first.rank;cfg.encounterLabel=route.label+' · '+first.rank;
cfg.encounters=Array.from({length:3},()=>({name:first.name,hp:first.hp,max:first.hp,height:primary==='kraken'?380:280,attackType:'melee',element:first.element,tauntImmune:false,intent:'행동 준비'}));cfg.positions[4]={x:1220,y:590,h:primary==='kraken'?380:280};
if(stone){
 const hint=document.createElement('small');hint.className='contract-stone-hint';hint.textContent='5턴 안에 파괴하면 파티 능력치 +10%';
 document.querySelector('.location').append(hint);
}
const group=q.get('formation')==='group'&&!boss&&!stone;
cfg.enemyFormation=group?[0,1].map((_,i)=>{const id=ids[(i+1)%ids.length],key='galleon-'+(i?'right':'left'),m=configure(id,key);return {id:key,name:m.name,x:i?1450:1030,y:i?650:640,h:180,maxHp:m.hp,element:m.element,spriteAsset:asset(id)};}):[];
for(const a of BATTLE_ASSETS.slice(0,4)){const c=window.PartyResources?.enabled?PartyResources.CHARACTERS[a.id]:data.characters[a.id];if(c){a.hp=c.hp;a.mp=c.mp;}}
const normalize=MonsterBalance.normalize;
function resolveHit(e,n,hit){
 const multiplier=window.GalleonCampaign?.statMultiplier?.(hit?.damageType==='magic'?'magicAttack':'attack')??1;
 if(multiplier!==1)n=Math.round(n*multiplier);
 if(stone)return ContractStones.receive(stone,n,hit);
 const result=MonsterBalance.resolveHit(encounters[e.id],n,hit,rng);
 return {...result,damage:window.CampaignChallenge?.incoming(e,result.damage,encounters[e.id]?.affixCount>0,window.DwarfSkills?.model,hit)??result.damage};
}

window.PlayerBalance={damage(role,id,fallback){return data.players[role+':'+id]?.damage??fallback;},param(role,id,key,fallback){return data.params[role+':'+id]?.[key]??fallback;},hit(role,id){const s=data.players[role+':'+id];return {role,skillId:id,element:normalize(s?.element),damageType:['wizard','priest'].includes(role)||role==='archer'&&id==='leaf-wind'||role==='mechanic'&&['mine-explosion','combined-fire'].includes(id)?'magic':'physical'};}};
window.PartyMonsterBalance={encounters,seed,dungeonId,
 midbossTuning(id,plan){
  if(encounters[id]?.rank!=='중간 보스'||![4,8].includes(floor))return null;
  if(floor===4)return {floor};
  const ownSkills=Object.values(data.skills).filter(s=>s.monster===encounters[id].id),index=Math.max(0,ownSkills.findIndex(s=>s.id===plan.skillId||(s.originalName||s.name)===plan.name));
  const basic=firstMidboss.attackType==='magic'?firstMidboss.magicAttack:firstMidboss.attack;
  // Compare the same attack category; preserve this boss's authored delivery and status plan.
  const referenceDamage=plan.clip==='attack'?basic:plan.charge?(dungeonId==='01'?320:firstMidbossSkills.at(-1)?.damage??basic):firstMidbossSkills[index%firstMidbossSkills.length]?.damage??basic;
  return {floor,referenceDamage};
 },
 action(e,turn,charge=false){
  if(dungeonId==='01')return null;
  const m=encounters[e.id],original=data.monsters[m.id],authored=manifest.monsters.find(a=>dungeonId+':'+a.id===m.id);
  const skills=Object.values(data.skills).filter(s=>s.monster===m.id);
  if(!charge&&turn%2===1)return {name:'기본 공격',clip:'attack',target:'single',damage:original.attackType==='magic'?original.magicAttack:original.attack,damageType:m.attackType,element:m.element};
  const s=charge?(skills.findLast(s=>s.target!=='self'&&!s.wipe)||skills[0]):skills[(Math.floor(turn/2)-1)%skills.length];
  const clip=s.id.slice(m.id.length+1),selected=window.DungeonCombatRules?.resolveMonsterClip?.(authored,s,skills)||(authored.actions[clip]?clip:authored.specials[skills.indexOf(s)]||authored.specials[0]);
  return {name:s.name,skillId:s.id,effectClip:selected,clip:s.target==='self'?'guard':selected,target:charge?'all':s.target,damage:s.damage??0,damageType:s.damageType,element:s.element,charge,wipe:!!s.wipe};
 },
 reset(){window.CampaignChallenge?.reset();rng=MonsterBalance.random(MonsterBalance.hash(seed+':'+dungeonId+':'+floor+':combat'));},resolveHit,incoming(e,n,hit){return resolveHit(e,n,hit).damage;},
 plan(e,p){const m=encounters[e.id];if(!m||p.wipe||dungeonId!=='01')return p;const skill=Object.values(data.skills).find(s=>s.monster===m.id&&(s.originalName||s.name)===p.name);if(p.clip==='guard')return {...p,damage:0};if(p.clip==='attack')return {...p,damage:m.attackType==='magic'?data.monsters[m.id].magicAttack:data.monsters[m.id].attack,damageType:m.attackType,element:m.element};if(skill)return {...p,name:skill.name,damage:skill.damage??0,damageType:skill.damageType,element:skill.element,target:skill.target};return {...p,damage:Math.round(data.monsters[m.id].magicAttack*(p.target==='all'?.8:1.35)),damageType:'magic',element:m.element};},
 outgoing(e,p,i){const a=BATTLE_ASSETS[i];const damage=MonsterBalance.outgoing(encounters[e.id],p.damage,p.damageType,p.element,a.element||'neutral');return window.CampaignChallenge?.outgoing(damage,encounters[e.id]?.affixCount>0,e.id)??damage;}
};PartyMonsterBalance.reset();
const box=document.createElement('div');box.id='boss-affixes';box.className='enemy-status-affixes';box.hidden=true;box.textContent=first.affixes.map(id=>data.affixes.find(a=>a.id===id).name).join(' · ');document.querySelector('#scene').append(box);
})();
