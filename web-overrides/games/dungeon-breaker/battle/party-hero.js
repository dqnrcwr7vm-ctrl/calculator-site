/* Hero actions share the party clock, target confirmation and response turn. */
(()=>{
 const actor=BATTLE_ASSETS.slice(0,4).find(a=>a.id==='hero');if(!actor)return;
 const caster=BATTLE_ASSETS.indexOf(actor),total=c=>c.durations.reduce((a,b)=>a+b,0);
 const profile=testProfiles.hero.config,fx=profile.effects,frames={},layers={princess:[],ground:[]};
 const specs={};
 for(const s of [...profile.initialSlots,...profile.elementalSlots])specs[s.id]={...s,cost:0};
 Object.assign(specs.attack,{name:'기본 공격',single:true,damage:50,element:'무속성',description:'무속성 일반 공격으로 적 하나에게 50 피해. MP 0.'});
 for(const [id,element]of Object.entries({'fire-slash':'불','frost-slash':'물','lightning-slash':'빛','leaf-slash':'풀','dark-slash':'어둠'}))Object.assign(specs[id],{single:true,damage:800,cost:50,element,description:`적 하나에게 ${element}속성 피해 800. MP 50.`});
 Object.assign(specs.magic,{name:'전투의 포효',cost:100,description:'아군 전체 공격력을 시전 턴을 포함한 3턴 동안 20% 높입니다. MP 100.'});
 specs['hero-roar']={name:'용사의 포효',clip:'magic',impact:880,cost:100,description:'아군 전체 방어력을 시전 턴을 포함한 3턴 동안 20% 높입니다. MP 100.'};
 specs.guard={name:'기본 방어',clip:'guard',impact:470,cost:0,description:'이번 적 행동 동안 받는 피해를 50% 줄입니다.'};
 Object.assign(specs.item,{name:'물약 먹기',description:'자신의 HP 600 회복. 층마다 3회 사용.'});
 const back='../characters/hero-sword-back-strike-v3/';
 actor.actions.swordBack={size:[704,704],anchor:[352,624],durations:[240,120,90,70,100,110,130,280],frames:Array.from({length:8},(_,i)=>back+`frames/frame-${String(i+1).padStart(2,'0')}.webp`)};
 specs['sword-back']={name:'칼등 치기',clip:'swordBack',impact:450,damage:100,cost:50,single:true,description:'적 하나에게 100 피해. 보스 충전 파훼에 참여합니다. MP 50.'};
 const order=[1,2,3,3,4,5,5,5,5,5,6,6,7,7,8,8,1,1,1,1];
 actor.actions.princessSlam={...actor.actions.attack,frames:order.map(n=>actor.actions.attack.frames[n-1]),durations:order.map(()=>100)};
 specs['princess-im-coming']={name:'공주, 제가 갑니다!',clip:'princessSlam',impact:800,damage:2000,cost:150,area:true,description:'살아 있는 모든 적에게 동시에 2,000 피해. MP 150.'};
 let active=null,mp=actor.mp,items=3,guard=false,blade=[];
 function sync(){const card=document.querySelectorAll('#party .member')[caster];if(card){card.querySelector('.stat-line.mp span').textContent=mp+' / '+actor.mp;card.querySelector('.mp-bar i').style.width=(mp/actor.mp*100)+'%';}}
 const valid=e=>e?.hp>0&&(!window.WizardSkills||WizardSkills.canSelect(e));
 function sample(now){const s=specs[active.id];return BattleMotion.sample(s.clip==='magic'?'magic':s.clip==='item'?'item':'attack',now-active.started,total(actor.actions[s.clip]),'hero',BATTLE_CONFIG.positions[caster]);}
 function frame(c,t){t=Math.max(0,t);for(let i=0;i<c.durations.length;i++){if(t<c.durations[i])return i;t-=c.durations[i];}return c.durations.length-1;}
 const api=window.PartyHero={caster,specs,get mp(){return mp;},get busy(){return !!active;},get state(){return {items,guard,active:active?{...active}:null};},
 canUse(id,targets){const s=specs[id];return !!s&&!active&&(actor.currentHp??actor.hp)>0&&mp>=(s.cost||0)&&(id!=='item'||items>0)&&(!s.single||targets.some(valid))&&(!s.area||targets.some(e=>e.hp>0));},
 start(id,target,now){if(!api.canUse(id,window.enemyTargets?.()||[target]))return false;if(specs[id].single&&!valid(target))return false;mp-=specs[id].cost||0;sync();active={id,target:target?.id,started:now,hit:false,lethal:false};return true;},
 restoreMp(n){mp=Math.max(0,Math.min(actor.mp,Number(n)||0));sync();},
 async load(load){for(const [id,c]of Object.entries(fx))frames[id]=await Promise.all(c.frames.map(load));blade=await Promise.all(actor.actions.swordBack.frames.map((_,i)=>load(back+`effects/frame-${String(i+1).padStart(2,'0')}.webp`)));for(const key of Object.keys(layers))layers[key]=await Promise.all(order.map((_,i)=>load('../skills/hero-princess-im-coming-v2/frames/'+key+'/frame-'+String(i+1).padStart(2,'0')+'.webp')));},
 update(now,bridge){if(!active)return;if((actor.currentHp??actor.hp)<=0){window.DungeonCombatAudio?.stopSpell(active);active=null;guard=false;return;}const a=active,s=specs[a.id],m=sample(now);
  if(m.phase==='acting'){window.DungeonVoices?.action('hero',a.id,a);window.DungeonCombatAudio?.spell('hero',a.id,a,m.local);}else window.DungeonCombatAudio?.stopSpell(a);
  if(!a.hit&&now-a.started>=m.start+s.impact){a.hit=true;const targets=s.area?bridge.enemies().filter(e=>e.hp>0):bridge.enemies().filter(e=>e.id===a.target&&valid(e));
   if(s.damage&&targets.length){if(a.id==='sword-back'&&targets.some(e=>DwarfSkills.model.charge?.enemyId===e.id))DwarfSkills.special('hero',now,a.id,a.target);a.lethal=bridge.damage(caster,targets,s.damage,!!s.area,window.PlayerBalance?.hit('hero',a.id)).lethal;}
   if(a.id==='magic'||a.id==='hero-roar')BattleRoar.cast({def:{...s,id:a.id}}, {phase:'acting',local:s.impact},now);
   if(a.id==='guard')guard=true;
   if(a.id==='item'){items--;actor.currentHp=Math.min(actor.hp,(actor.currentHp??actor.hp)+600);bridge.hit(caster,0);}
  }
  if(m.phase==='complete'){active=null;if(a.lethal)bridge.finish();else PartyTurns.complete(now);}
 },
 pose(i,now){if(i!==caster)return null;if(!active)return guard&&PartyTurns.cycle.phase==='enemies'?{clip:'guard',time:550}:null;const m=sample(now),s=specs[active.id];let clip=s.clip,time=m.local;
  if(m.phase==='advancing'){clip='forward';time=m.phaseTime/1050*total(actor.actions.forward);}
  else if(m.phase==='returning'){clip='return';time=m.phaseTime/480*total(actor.actions.return);}
  else if(m.phase==='turning'){clip='turn';time=m.phaseTime;}
  else if(m.phase==='facing'){clip='face';time=m.phaseTime;}
  else if(m.phase!=='acting'){clip='idle';time=now;}
  return{clip,time,x:m.x,y:m.y};
 },
 drawBack(g,now){if(!active||active.id!=='princess-im-coming')return;const m=sample(now);if(m.phase!=='acting')return;const n=Math.min(19,Math.floor(m.local/100));g.drawImage(layers.princess[n],0,0,1600,800);g.drawImage(layers.ground[n],0,-145,1600,800);},
 draw(g,now,es,positions){if(!active)return;const s=specs[active.id],m=sample(now);if(m.phase!=='acting')return;
  if(active.id==='sword-back'){const p=positions[caster],scale=p.h/(actor.bounds[3]-actor.bounds[1]);g.drawImage(blade[frame(actor.actions.swordBack,m.local)],p.x-352*scale,p.y-624*scale,704*scale,704*scale);}
  const e=es.find(e=>e.id===active.target),c=fx[s.effect],age=m.local-s.impact;if(e&&c&&age>=0&&age<total(c)){const im=frames[s.effect][frame(c,age)],size=c.size||256;g.drawImage(im,e.x-size/2,e.y-e.h*.65-size/2,size,size);}
 },
 incoming(i,n){return i===caster&&guard?Math.round(n*.5):n;},
 end(){guard=false;},reset(){active=null;mp=actor.mp;items=3;guard=false;sync();}
 };
})();
