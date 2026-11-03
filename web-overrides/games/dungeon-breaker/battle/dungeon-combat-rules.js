/* Shared target ownership: the exclamation marker and damage use this same source. */
(function(root){
'use strict';
const alive=a=>a&&(a.currentHp??a.hp)>0;
// Presentation names for charged attacks. Dungeon IDs distinguish repeated bosses.
// These aliases never select animations, damage, elements or status effects.
const BOSS_CHARGE_NAMES=Object.freeze({
 '01:abyss-torrent-eel':'심해 격류!',
 '01:anchor-boatswain':'닻사슬 폭풍!',
 '01:kraken':'심해의 종말!',
 '02:dziwozona':'미혹의 절규!',
 '02:humbaba':'나무의 분노!',
 '02:leshy':'가시 덤불!',
 '03:skrymir':'글레이셜 스파이크!',
 '03:hrungnir':'프로즌 크러시!',
 '03:ymir':'앱솔루트 제로!',
 '04:talos':'대 폭발!',
 '04:logi':'플레임 월!',
 '04:surtr':'파이어 소드!',
 '05:talos':'프렌지!',
 '05:griffin':'페더 스톰!',
 '05:sphinx':'다크니스!',
 '06:sphinx':'저지먼트!',
 '06:apep':'블라인드!',
 '06:ammit':'영혼 포식!',
 '07:aello':'폭풍의 비명!',
 '07:talos':'플레어 드라이브!',
 '07:typhon':'일렉트릭 스톰!',
 '08:omukade':'독 숨결!',
 '08:jorogumo':'비단 그물!',
 '08:tsuchigumo':'거미지옥!',
 '09:khalkotauros':'불꽃 숨결!',
 '09:kourai-chryseai':'그레이트 폴!',
 '09:talos':'어스퀘이크!',
 '10:stymphalian':'페더 스톰!',
 '10:griffin':'싸이클론!',
 '10:hraesvelgr':'아포칼립스!'
});
function bossChargeName(dungeonId,monsterId,fallback='파멸의 일격'){
 const name=BOSS_CHARGE_NAMES[dungeonId+':'+monsterId];
 if(name)return name;
 return fallback.replace(/ · (전체공격|전멸기|파훼 실패 시 전멸|강공세)/g,'').replace(/[!！]+$/,'')+'!';
}
// Balance sheets may name skills (venom-surge), while the authored animation
// uses ordered special/special-2 clips. Keep that authored order as the fallback.
function resolveMonsterClip(authored,skill,skills){
 const id=skill.id.slice(skill.monster.length+1);
 return authored.actions[id]?id:authored.specials[skills.indexOf(skill)]||authored.specials[0];
}
function tauntSource(enemy,party,model,mechanic){
 if(!enemy||enemy.hp<=0)return null;
 const dwarf=party.findIndex(a=>a.id==='dwarf'&&alive(a));
 if(dwarf>=0&&model?.taunts.get(enemy.id)===model.turn)return {index:dwarf,role:'dwarf'};
 if(!enemy.tauntImmune&&mechanic&&alive(party[mechanic.caster])&&mechanic.state.robots.some(r=>r.id==='bulwark'&&r.hp>0))return {index:mechanic.caster,role:'mechanic',robot:'bulwark'};
 return null;
}
function chooseTargets(enemy,plan,party,model,mechanic,preferred=0){
 if(plan.target==='self')return [];
 const source=tauntSource(enemy,party,model,mechanic);
 // Taunt precedes area and pull targeting; marked enemies attack only their source.
 if(source)return [source.index];
 const living=party.map((a,i)=>({a,i})).filter(({a})=>alive(a));
 if(plan.target==='all')return living.map(v=>v.i);
 if(plan.pull){const grabbed=living.find(({a})=>a.statuses?.some(s=>s.kind==='root'&&s.source===enemy.id));if(grabbed)return [grabbed.i];}
 const target=living.find(v=>v.i===preferred)||living[0];return target?[target.i]:[];
}
function targetPositions(positions,action){
 if(!action?.taunt?.robot)return positions;
 return positions.map((p,i)=>i===action.taunt.index?{...p,...root.MechFormation.bulwark,h:root.PartyMechanicData.robots.bulwark.height}:p);
}
function drawDanger(g,e,now){
 const pulse=(Math.sin(now*Math.PI*2/1200)+1)/2,x=Math.round(e.x),y=Math.max(10,Math.round(e.y-e.h-170));
 g.save();g.translate(x,y);g.globalAlpha=.82+.18*pulse;g.shadowColor='#ff513e';g.shadowBlur=8+10*pulse;
 g.fillStyle='#361324';g.strokeStyle='#ffd78f';g.lineWidth=3;g.beginPath();g.roundRect(-48,0,96,57,8);g.fill();g.stroke();g.shadowBlur=0;
 // Pixel skull silhouette, sockets, nasal notch and separate exclamation.
 g.fillStyle='#fff2ce';g.fillRect(-32,11,27,24);g.fillRect(-36,16,35,15);g.fillRect(-28,35,19,10);
 g.fillStyle='#361324';g.fillRect(-30,20,8,8);g.fillRect(-15,20,8,8);g.fillRect(-21,30,5,6);g.fillRect(-23,39,3,7);g.fillRect(-16,39,3,7);
 g.fillStyle='#ff7357';g.fillRect(15,10,11,25);g.fillStyle='#ffe1ad';g.fillRect(15,40,11,9);
 // Two small lights communicate the existing two-distinct-ally response.
 const count=root.DwarfSkills?.model.charge?.allies.size||0;
 for(let i=0;i<2;i++){g.fillStyle=i<count?'#ffe5a0':'#72566b';g.fillRect(-13+i*16,64,10,6);}
 g.restore();
}
// Result feedback uses the battle clock; it does not resolve combat or change charge rules.
function drawChargeResult(g,e,age,cancelled,attackName){
 if(age<0||age>=1680)return;
 const label=cancelled?'파훼 성공':attackName||bossChargeName(root.ActiveDungeon?.id,e.spriteAsset?.id||root.BATTLE_ASSETS?.[4]?.id||e.id);
 g.save();g.font='bold 28px Galmuri11, monospace';
 const canvasWidth=root.MonsterRaster?.width(g.canvas)||g.canvas.width,maxWidth=Math.min(640,canvasWidth-32);
 const width=Math.min(maxWidth,Math.max(200,Math.ceil(g.measureText(label).width)+48));
 const x=Math.max(width/2+16,Math.min(canvasWidth-width/2-16,Math.round(e.x))),y=Math.max(36,Math.round(cancelled?e.y-e.h*.45-Math.min(age,1380)*.065:e.y-e.h-120));
 g.globalAlpha=Math.min(1,(1680-age)/300);g.translate(x,y);
 g.fillStyle=cancelled?'#172d35':'#361324';g.strokeStyle=cancelled?'#9ae8df':'#ffb582';g.lineWidth=3;
 g.beginPath();g.roundRect(-width/2,-28,width,56,8);g.fill();g.stroke();
 g.textAlign='center';g.textBaseline='middle';
 g.fillStyle=cancelled?'#c7fff5':'#fff2ce';g.fillText(label,0,0,width-40);g.restore();
}
const api={BOSS_CHARGE_NAMES,bossChargeName,resolveMonsterClip,tauntSource,chooseTargets,targetPositions,drawDanger,drawChargeResult};
if(typeof module==='object'&&module.exports)module.exports=api;
root.DungeonCombatRules=api;
})(typeof window!=='undefined'?window:globalThis);
