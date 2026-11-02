/* Campaign economy. Existing class runtimes retain hero/wizard casting clocks. */
(function(root){
'use strict';
const CHARACTERS={dwarf:{hp:3400,mp:500},hero:{hp:2800,mp:700},archer:{hp:1800,mp:800},wizard:{hp:1400,mp:1200},priest:{hp:2200,mp:900},mechanic:{hp:2000,mp:600}};
const COSTS={
 hero:{'fire-slash':90,'frost-slash':90,'lightning-slash':90,'leaf-slash':90,'dark-slash':90,magic:90,'hero-roar':90,'sword-back':30,'princess-im-coming':180},
 dwarf:{'dwarf-taunt':30,'dwarf-bulwark':50,'dwarf-bash':65,'dwarf-wake':25,'dwarf-quake':60,'dwarf-mjolnir':100},
 archer:{'phoenix-shot':200,sniping:240,'arrow-rain':140,'leaf-wind':110,'stun-shot':35,'leg-bind':55,'natures-cure':60,'eagle-eye':70},
 wizard:{fireball:110,'ice-spear':110,'thunder-ball':110,void:110,meteor:240,blizzard:190,thunderstorm:210,'black-hole':280},
 priest:{'living-water':80,recovery:55,healing:100,blessing:120,barrier:90,resurrection:200,sanctuary:180,'holy-light':160},
 mechanic:{'mine-explosion':40,'install-rivet':100,'install-mole':125,'install-bulwark':110,'install-swat':90,'super-combine':140,'combined-gun':55,'combined-drill':70,'combined-beam':120}
};
const ROBOTS={rivet:{hp:320,reduction:0},mole:{hp:420,reduction:0},bulwark:{hp:650,reduction:.35},swat:{hp:450,reduction:.25}};
// Campaign-only additions to the preserved workbook snapshot. Apply before class
// modules capture damage values so casts, tooltips and drafts share one balance.
const SINGLE_TARGET_DAMAGE={
 hero:{'fire-slash':1600,'frost-slash':1600,'lightning-slash':1600,'leaf-slash':1600,'dark-slash':1600},
 dwarf:{'dwarf-bash':900,'dwarf-mjolnir':1400},
 archer:{sniping:6000,'leg-bind':300},
 wizard:{fireball:2700,'ice-spear':2700,'thunder-ball':2700,void:2700},
 mechanic:{'combined-gun':1300,'combined-drill':1700}
};
const ROBOT_DAMAGE={rivet:1400,mole:1400};
function damageDescription(text,damage){return (text||'').replace(/[\d,]+(?=의 한 발| 피해)/,damage.toLocaleString('en-US'));}
function applySingleTargetBalance(data){
 if(!data)return;
 for(const [role,skills]of Object.entries(SINGLE_TARGET_DAMAGE))for(const [id,damage]of Object.entries(skills)){
  const key=role+':'+id,p=data.players[key],params=data.params[key];
  if(p){p.damage=damage;p.description=damageDescription(p.description,damage).replace(/MP\s*\d+/, 'MP '+COSTS[role][id]);}
  if(params){params['직접 기본 피해']=damage;for(const name of ['MP 소모','MP 설정'])if(name in params)params[name]=COSTS[role][id];}
 }
 for(const [id,damage]of Object.entries(ROBOT_DAMAGE)){
  if(data.robots[id])data.robots[id].damage=damage;
  const key='mechanic:install-'+id,p=data.players[key],params=data.params[key];
  if(p)p.description=damageDescription(p.description,damage).replace(/MP\s*\d+/, 'MP '+COSTS.mechanic['install-'+id]);
  if(params)params['MP 소모']=COSTS.mechanic['install-'+id];
 }
}
class ManaPool{
 constructor(){this.reset();}reset(){this.values=Object.fromEntries(Object.entries(CHARACTERS).map(([id,c])=>[id,c.mp]));}
 cost(role,id){return COSTS[role]?.[id]||0;}can(role,id){return this.values[role]>=this.cost(role,id);}
 spend(role,id){if(!this.can(role,id))return false;this.values[role]-=this.cost(role,id);return true;}
 restore(role,n){this.values[role]=Math.max(0,Math.min(CHARACTERS[role].mp,Number(n)||0));}
}
if(typeof module==='object'&&module.exports)module.exports={CHARACTERS,COSTS,ROBOTS,SINGLE_TARGET_DAMAGE,ROBOT_DAMAGE,applySingleTargetBalance,ManaPool};
if(!root.document)return;
const enabled=new URLSearchParams(location.search).get('campaign')==='1',pool=new ManaPool();
if(enabled)applySingleTargetBalance(root.MONSTER_BALANCE_DATA);
const native=role=>role==='hero'?root.PartyHero:role==='wizard'?root.WizardSkills:null;
const api=root.PartyResources={enabled,CHARACTERS,COSTS,ROBOTS,cost:(role,id)=>enabled?pool.cost(role,id):0,
 read(role){return native(role)?.mp??pool.values[role];},
 can(role,id){return !enabled||this.read(role)>=this.cost(role,id);},
 spend(role,id){if(!enabled||native(role))return true;return pool.spend(role,id);},
 restore(role,n){if(!enabled)return;if(native(role))native(role).restoreMp(n);else pool.restore(role,n);},
 recover(role,fraction){this.restore(role,this.read(role)+Math.round(CHARACTERS[role].mp*fraction));},
 snapshot(){return Object.fromEntries(root.BATTLE_ASSETS.slice(0,4).map(a=>[a.id,this.read(a.id)]));},
 restoreAll(values){if(values)for(const a of root.BATTLE_ASSETS.slice(0,4))if(values[a.id]!=null)this.restore(a.id,values[a.id]);},
 reset(){pool.reset();},
 sync(){if(!enabled)return;root.BATTLE_ASSETS.slice(0,4).forEach((a,i)=>{const card=document.querySelectorAll('#party .member')[i],mp=this.read(a.id);if(card){card.querySelector('.stat-line.mp').title='층 클리어: MP 25% 회복 · 중간 보스: MP 35%, HP 10% 회복';card.querySelector('.stat-line.mp span').textContent=mp+' / '+a.mp;card.querySelector('.mp-bar i').style.width=100*mp/a.mp+'%';}});},
 describe(role,id,text){if(!enabled)return text;if(role==='mechanic'&&id.startsWith('install-')){const robot=ROBOTS[id.slice(8)],damage=ROBOT_DAMAGE[id.slice(8)];if(robot)text='메카 HP '+robot.hp+' · '+(damage?'적 행동 단계마다 단일 공격 '+damage.toLocaleString('en-US')+' 피해 · ':'')+'종류별 1기 동시 설치 · 3회 적 행동 후 남은 HP로 자폭. 광역 공격에 개별 피격.';}if(role==='mechanic'&&id==='super-combine')text='살아 있는 서로 다른 메카 2기 이상 필요. 설치된 메카를 소모하여 3턴 동안 합체합니다.';const clean=(text||'').replace(/MP\s*\d+\.?/g,'').trim();return clean+' · MP '+this.cost(role,id);}
};
})(typeof window!=='undefined'?window:globalThis);
