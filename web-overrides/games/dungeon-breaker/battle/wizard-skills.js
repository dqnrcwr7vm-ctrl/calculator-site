(function(root){
'use strict';
const BALANCE={basic:1800,meteor:2500,burn:500,blizzard:1700,thunderstorm:1900,explosion:3000,chance:.3};
class WizardStatuses{
 constructor(){this.reset();}
 reset(){this.turn=1;this.statuses=new Map();this.hole=null;this.ground=null;}
 inflict(id,kind,now){const s=this.statuses.get(id)||{};s[kind]=now;this.statuses.set(id,s);}
 contained(id){return !!this.hole?.ids.includes(id);}
 canSelect(e){return e.hp>0&&!this.contained(e.id);}
 canAct(e){return this.canSelect(e)&&!this.statuses.has(e.id);}
 seal(enemies,eligible=e=>!e.isBoss){if(this.hole)return false;const ids=enemies.filter(e=>e.hp>0&&eligible(e)).map(e=>e.id);if(!ids.length)return false;this.hole={turn:this.turn,ids};return true;}
 beforeResponse(){const result={release:null,burn:false};if(this.hole&&this.turn>this.hole.turn){result.release=this.hole.ids;this.hole=null;}if(this.ground&&this.turn>this.ground.turn){result.burn=true;if(--this.ground.left===0)this.ground=null;}return result;}
 endTurn(){for(const id of this.statuses.keys())if(!this.contained(id))this.statuses.delete(id);this.turn++;}
}
// 48 distinct opening/suction drawings replace eight long-held key poses.
// Keep gameplay deadlines independent of visual sampling and the shared battle clock.
function blackHoleFrame(age,phase='cast'){
 if(phase==='release')return age<700?56+Math.min(3,Math.floor(age/175)):60+Math.min(3,Math.floor((age-700)/350));
 if(phase==='hold'||age>=4160)return 48+Math.floor(Math.max(0,age-4160)/140)%4;
 return Math.max(0,Math.min(48,age/4160*48));
}
function canBlackHoleCapture(enemy,combat){
 if(enemy.hp<=0)return false;
 if(!enemy.isBoss)return true;
 const interrupted=combat?.interruptedCharge;
 return !!(interrupted&&interrupted.enemyId===enemy.id&&interrupted.turn===combat.turn&&new Set(interrupted.allies.filter(id=>id!=='wizard')).size>=2);
}
const STORM_DURATION=3960,STORM_RELEASE=820;
function stormFrame(age){
 if(age<120)return 0;
 if(age<240)return 1;
 return Math.min(74,2+Math.floor((age-240)/50));
}
function stormField(es){
 const left=Math.min(...es.map(e=>e.x-e.h*.45)),right=Math.max(...es.map(e=>e.x+e.h*.45));
 const bottom=Math.max(...es.map(e=>e.y)),top=Math.min(...es.map(e=>e.y-e.h));
 // The registered floor occupies about 69% of the 768px-wide drawing.
 const width=Math.max(850,(right-left+70)/.69,(bottom-top+100)*768/500);
 return {x:(left+right)/2,y:bottom,width,height:width*576/768};
}
const api={WizardStatuses,BALANCE,blackHoleFrame,canBlackHoleCapture,stormFrame,stormField};if(typeof module==='object'&&module.exports)module.exports=api;if(!root.document)return;
const party=root.BATTLE_ASSETS.slice(0,4),caster=party.findIndex(a=>a.id==='wizard');if(caster<0)return;
const wizard=party[caster],pad=n=>String(n).padStart(2,'0'),seq=(p,n)=>Array.from({length:n},(_,i)=>p+pad(i+1)+'.webp');
wizard.actions||={};wizard.actions.magic={frames:seq('../characters/wizard-animations-v2/magic/frame-',8),durations:[220,160,180,260,100,160,180,600],registration:[1.0732600733,1.1269230769,1.1098484848,1.1098484848,1.1056603774,1.1015037594,1.1183206107,1.0732600733].map((scale,i)=>({scale,anchor:[260,i>=4?502:501]}))};
const specs={
 fireball:{name:'파이어 볼',element:'fire',cost:25,damage:1800},'ice-spear':{name:'아이스 스피어',element:'ice',cost:25,damage:1800},'thunder-ball':{name:'썬더 볼',element:'lightning',cost:25,damage:1800},void:{name:'보이드',element:'dark',cost:25,damage:1800},
 meteor:{name:'메테오',element:'fire',cost:60,damage:2500,area:true},blizzard:{name:'블리자드',element:'ice',cost:50,damage:1700,area:true},thunderstorm:{name:'썬더스톰',element:'lightning',cost:50,damage:1900,area:true},'black-hole':{name:'블랙홀',element:'dark',cost:70,damage:0,area:true}};
const model=new WizardStatuses();let bridge,controls,select,info,active=null,release=null,holeVisual=null,fx={},mp=wizard.mp,responseTurn=0,finishPending=false,targetSignature="";
const holeBlend=document.createElement('canvas');holeBlend.width=holeBlend.height=640;const holeBlendCtx=holeBlend.getContext('2d');
const clamp=x=>Math.max(0,Math.min(1,x)),alive=()=> (wizard.currentHp??wizard.hp)>0,enemies=()=>bridge?.enemies()||[];
const canCapture=e=>canBlackHoleCapture(e,root.DwarfSkills?.model);
function geometry(es){const left=Math.min(...es.map(e=>e.x-e.h*.45)),right=Math.max(...es.map(e=>e.x+e.h*.45)),top=Math.min(...es.map(e=>e.y)),bottom=Math.max(...es.map(e=>e.y));return{x:(left+right)/2,y:(top+bottom)/2,size:Math.max(650,Math.min(1000,right-left+200))};}
function refresh(){if(!bridge)return;const es=enemies(),eligible=es.filter(e=>model.canSelect(e)),old=select.value,key=JSON.stringify(es.map(e=>[e.id,e.name,e.hp>0,model.contained(e.id)]));if(key!==targetSignature){targetSignature=key;select.replaceChildren();for(const e of es){const o=new Option((e.name||e.id)+(model.contained(e.id)?' · 봉인':''),e.id);o.disabled=!model.canSelect(e);select.add(o);}select.value=eligible.some(e=>e.id===old)?old:eligible[0]?.id||'';}
 const busy=api.busy||bridge.busy();select.disabled=busy||!eligible.length;controls.querySelectorAll('[data-wizard]').forEach(b=>{const s=specs[b.dataset.wizard];b.disabled=busy||!alive()||mp<s.cost||!es.some(e=>e.hp>0)||(!s.area&&!eligible.length)||(b.dataset.wizard==='black-hole'&&(!!model.hole||!es.some(canCapture)));});
 info.textContent=`${model.turn}턴 · 마법사 MP ${mp}/${wizard.mp}${model.hole?' · 블랙홀 봉인: 광역 피해만 허용':''}`;const scene=document.querySelector('#scene');scene.dataset.wizardSkill=active?.id||'';scene.dataset.wizardTurn=model.turn;scene.dataset.wizardContained=JSON.stringify(model.hole?.ids||[]);scene.dataset.wizardStatuses=JSON.stringify([...model.statuses]);
 const card=document.querySelectorAll('#party .member')[caster];if(card){card.querySelector('.stat-line.mp span').textContent=mp+' / '+wizard.mp;card.querySelector('.mp-bar i').style.width=100*mp/wizard.mp+'%';}}
function start(id){if(root.PartyTurns&&!root.PartyTurns.canCast(caster,id))return false;const s=specs[id];if(!bridge||!s||api.busy||bridge.busy()||!alive()||mp<s.cost)return false;const es=enemies().filter(e=>e.hp>0&&(id!=='black-hole'||canCapture(e))),target=es.find(e=>e.id===select.value);if(!es.length||(!s.area&&(!target||!model.canSelect(target)))||(id==='black-hole'&&model.hole))return false;
 mp-=s.cost;active={id,started:bridge.now(),hit:false,target:target?.id,targets:es.map(e=>({...e})),field:geometry(es),stormField:['blizzard','thunderstorm'].includes(id)?stormField(es):null};if(id==='black-hole')holeVisual=active;bridge.resume();bridge.buttons();bridge.notice(s.name+' · 마법사 제자리 시전');refresh();return true;}
function complete(now){if(root.DwarfSkills)root.DwarfSkills.complete(now);else root.ArcherSkills?.completeTurn(now);}
Object.assign(api,{
 model,specs,caster,start,get element(){return active?specs[active.id].element:null;},
 async load(load){const jobs=[];for(const id of ['fireball','ice-spear','thunder-ball','void']){if(root.CampaignAssets&&!root.CampaignAssets.uses('wizard',id))continue;const p=id==='fireball'?'../skills/wizard-fireball-v1/':'../skills/wizard-basic-elements-v1/'+id+'/';for(const [part,n]of [['flight',id==='fireball'?4:2],['impact',id==='fireball'?5:7]])jobs.push(Promise.all(seq(p+'frames/'+part+'/',n).map(load)).then(ims=>fx[id+'-'+part]=ims));}
 for(const [id,path,n]of [['meteor-fall','wizard-meteor-v2/frames/fall',12],['meteor-impact','wizard-meteor-v2/frames/impact',12],['meteor-burning-ground','wizard-meteor-v2/frames/burning-ground',8],['blizzard','wizard-blizzard-v5/frames',75],['thunderstorm','wizard-thunderstorm-v4/frames',75],['black-hole','wizard-black-hole-v2/frames',64],['freeze','wizard-blizzard-v1/frames/freeze',8]].filter(([id])=>!root.CampaignAssets||root.CampaignAssets.uses('wizard',id.startsWith('meteor-')?'meteor':id==='freeze'?'blizzard':id)))jobs.push(Promise.all((n===75?Array.from({length:n},(_,i)=>'../skills/'+path+'/'+String(i+1).padStart(3,'0')+'.webp'):seq('../skills/'+path+'/',n)).map(load)).then(ims=>fx[id]=ims));await Promise.all(jobs);},
 mount(b){bridge=b;controls=document.createElement('section');controls.className='archer-controls wizard-controls';controls.setAttribute('aria-label','마법사 스킬');controls.innerHTML='<strong>마법사 스킬 · 공용 전투</strong><div class="archer-skill-grid"></div><label>직접 공격 대상 <select aria-label="마법사 직접 공격 대상"></select></label><span role="status"></span>';document.querySelector('.screen').after(controls);select=controls.querySelector('select');info=controls.querySelector('span');for(const [id,s]of Object.entries(specs)){const b=document.createElement('button');b.dataset.wizard=id;b.textContent=s.name+' · MP '+s.cost;b.onclick=()=>start(id);controls.querySelector('div').append(b);}select.onchange=refresh;refresh();},
 update(now){if(!bridge)return;
 if(active){const a=active,s=specs[a.id],age=now-a.started;if(!alive()){root.DungeonCombatAudio?.stopSpell(a);if(a.id==='black-hole'&&!model.hole)holeVisual=null;active=null;bridge.buttons();}else{
 root.DungeonVoices?.action('wizard',a.id,a);root.DungeonCombatAudio?.spell('wizard',a.id,a,age);
 if(!a.hit&&age>=(a.id==='black-hole'?4160:s.area?1800:1300)){a.hit=true;if(a.id==='black-hole')model.seal(enemies().filter(e=>a.targets.some(t=>t.id===e.id)),canCapture);else{const targets=enemies().filter(e=>e.hp>0&&(s.area||e.id===a.target));const result=bridge.damage(caster,targets,s.damage,s.area,{element:root.PlayerBalance?.hit('wizard',a.id)?.element ?? ({ice:'water',lightning:'light'}[s.element] || s.element),skillId:a.id,damageType:'magic'});a.lethal=result.lethal;if(a.id==='meteor')model.ground={turn:model.turn,left:2,field:a.field};if(['blizzard','thunderstorm'].includes(a.id))for(const e of targets)if(e.hp>0&&Math.random()<BALANCE.chance)model.inflict(e.id,a.id==='blizzard'?'freeze':'paralysis',now);}root.DwarfSkills?.special('wizard',now);refresh();}
 if(age>=(a.id==='black-hole'?4900:a.stormField?STORM_RELEASE+STORM_DURATION:s.area?3400:2300)){root.DungeonCombatAudio?.stopSpell(a);active=null;if(a.lethal)bridge.finish();else complete(now);bridge.buttons();}
 }}
 if(release)root.DungeonCombatAudio?.spell('wizard','black-hole-release',release,now-release.started);
 if(release&&now-release.started>=2100){root.DungeonCombatAudio?.stopSpell(release);release=null;holeVisual=null;if(finishPending){finishPending=false;bridge.finish();}bridge.buttons();}refresh();},
 beforeResponse(now){if(release)return false;if(responseTurn===model.turn)return true;responseTurn=model.turn;const event=model.beforeResponse();if(event.burn){const r=bridge.damage(caster,enemies(),root.PlayerBalance?.param('wizard','meteor','지속 피해',BALANCE.burn)??BALANCE.burn,true,{element:'fire',skillId:'meteor',damageType:'magic',dot:true});finishPending||=r.lethal;}if(event.release){const targets=enemies().filter(e=>event.release.includes(e.id));const r=bridge.damage(caster,targets,root.PlayerBalance?.param('wizard','black-hole','지연 폭발 피해',BALANCE.explosion)??BALANCE.explosion,true,{element:'dark',skillId:'black-hole',damageType:'magic'});finishPending||=r.lethal;release={started:now,ids:event.release,field:holeVisual?.field||geometry(targets)};bridge.notice('블랙홀 폭발 · 원래 자리로 복귀');refresh();return false;}if(finishPending){finishPending=false;bridge.finish();return false;}return true;},
 afterResponse(){model.endTurn();refresh();},canEnemyAct:e=>model.canAct(e),canSelect:e=>model.canSelect(e),
 pose(i,now){if(i!==caster||!active)return null;const t=now-active.started,end=active.id==='black-hole'?4160:1150;let f=t<220?0:t<450?1:t<700?2:t<end?3:t<end+220?5:t<end+440?6:t<end+660?7:-1;if(f<0)return{clip:'idle',time:t};const durations=wizard.actions.magic.durations;return{clip:'magic',time:durations.slice(0,f).reduce((a,b)=>a+b,0)+1};},
 aura(ctx,layer,positions,now){if(!active||now-active.started>=940)return;const t=now-active.started,p=positions[caster],pose=api.pose(caster,now);let f=0,sum=0;for(let i=0;i<8;i++){sum+=wizard.actions.magic.durations[i];if(pose.time<sum){f=i;break;}}root.WizardCasting.draw(ctx,layer,wizard,p,{def:{element:specs[active.id].element,projectile:{release:820}}},{phase:'acting',local:t},f);},
 beginEnemy(ctx,e,now){const v=api.enemyPose(e,now);if(v.alpha<=0)return false;ctx.save();ctx.globalAlpha*=v.alpha;const cy=e.y-e.h/2;ctx.translate(v.x,v.y);ctx.scale(v.scale,v.scale);ctx.rotate(v.rotation);ctx.translate(-e.x,-cy);return true;},
 enemyPose(e,now){let x=e.x,y=e.y-e.h/2,scale=1,alpha=1,rotation=0;const a=holeVisual;
 if(a&&active?.id==='black-hole'){const i=a.targets.findIndex(t=>t.id===e.id),t=clamp((now-a.started-2000-Math.max(0,i)*180)/1800),v=t*t*(3-2*t);if(i>=0){x+=(a.field.x-x)*v+Math.sin(t*6+i)*60*Math.sin(t*Math.PI);y+=(a.field.y-230-y)*v-70*Math.sin(t*Math.PI);scale=1-v*.98;alpha=1-clamp((t-.78)/.22);rotation=t*1.5;}}
 else if(model.contained(e.id))alpha=0;
 if(release?.ids.includes(e.id)){const i=release.ids.indexOf(e.id),t=clamp((now-release.started-180-i*100)/1400),v=1-(1-t)**3;x=release.field.x+(e.x-release.field.x)*v;y=release.field.y-230+(e.y-e.h/2-(release.field.y-230))*v-100*Math.sin(t*Math.PI);scale=.05+.95*v;alpha=clamp(t*8);rotation=(1-t)*1.4;}return{x,y,scale,alpha,rotation};},
 reset(){model.reset();active=release=holeVisual=null;mp=wizard.mp;responseTurn=0;finishPending=false;targetSignature="";if(bridge)refresh();}
});
Object.defineProperty(api,'mp',{get:()=>mp});api.restoreMp=value=>{mp=Math.max(0,Math.min(wizard.mp,Number(value)||0));if(bridge)refresh();};
Object.defineProperty(api,'busy',{get:()=>!!active||!!release});

const ailmentIcons={
 freeze:{color:'#8ee9ff',pixels:['.....#.....','.#...#...#.','..#..#..#..','...#.#.#...','....###....','###########','....###....','...#.#.#...','..#..#..#..','.#...#...#.','.....#.....']},
 paralysis:{color:'#ffe55c',pixels:['......###..','.....###...','....###....','...###.....','..#######..','.....###...','....###....','...###.....','..###......','..##.......','..#........']}
};
function drawAilmentIcons(g,e,p){
 if(root.PartyStatusIcons?.enabled())return;
 const kinds=e.statuses.filter(kind=>ailmentIcons[kind]),size=39,gap=6;
 kinds.forEach((kind,i)=>{const icon=ailmentIcons[kind],x=Math.round(p.x-(kinds.length*size+(kinds.length-1)*gap)/2+i*(size+gap)),y=Math.round(p.y-p.h-78);
 g.save();g.fillStyle='#080d20ee';g.fillRect(x,y,size,size);g.fillStyle=icon.color;g.fillRect(x,y,size,2);g.fillRect(x,y+size-2,size,2);g.fillRect(x,y,2,size);g.fillRect(x+size-2,y,2,size);
 icon.pixels.forEach((row,py)=>[...row].forEach((pixel,px)=>{if(pixel==='#')g.fillRect(x+3+px*3,y+3+py*3,3,3);}));g.restore();});
}
function drawAilments(g,clock){
 enemies().forEach(p=>{const state=model.statuses.get(p.id);if(p.hp<=0||model.contained(p.id)||!state)return;const e={statuses:Object.keys(state),freezeVisualAt:state.freeze};const w=p.h*.85;
  const freezeAge=clock-(e.freezeVisualAt??-Infinity);
  if(e.statuses.includes('freeze')&&freezeAge>=0&&freezeAge<900){
   const iceOpacity=freezeAge<650?1:(900-freezeAge)/250;
   // Retain the creature's silhouette through a translucent, faceted ice prison.
   g.save();g.globalAlpha=iceOpacity;g.translate(p.x,p.y);g.fillStyle='#69c9ff50';g.strokeStyle='#bef5ff';g.lineWidth=2;
   const half=Math.max(w*.6,50),top=-p.h-18;g.beginPath();g.moveTo(-half,0);g.lineTo(-half*.9,top*.65);g.lineTo(-half*.4,top);g.lineTo(half*.35,top-12);g.lineTo(half,top*.65);g.lineTo(half,0);g.closePath();g.fill();g.stroke();
   g.strokeStyle='#a9edffb0';g.beginPath();g.moveTo(-half*.4,top);g.lineTo(0,-p.h*.4);g.lineTo(half,0);g.moveTo(half*.35,top-12);g.lineTo(0,-p.h*.4);g.lineTo(-half,0);g.stroke();
   const size=Math.max(w*1.5,p.h*1.45);g.globalAlpha=.48*iceOpacity;g.drawImage(fx.freeze[Math.floor(clock/140)%4+3],-size/2,-size*490/640,size,size);g.restore();
  }
  // Paralysis uses the overhead debuff icon only.
  drawAilmentIcons(g,e,p);
 });
}
// Persistent meteor embers belong beneath all combatants, including formation adds.
api.drawGround=function(g,now){
 if(!bridge||!model.ground)return;
 const f=model.ground.field,im=fx['meteor-burning-ground']?.[Math.floor(now/100)%8];
 if(!im)return;
 g.save();g.imageSmoothingEnabled=false;
 g.drawImage(im,f.x-f.size/2,f.y-490*f.size/640,f.size,f.size);
 g.restore();
};
api.draw=function(g,positions,now){if(!bridge)return;g.save();g.imageSmoothingEnabled=false;
 function field(id,index,f,anchorY=490){const im=fx[id]?.[index];if(im)g.drawImage(im,f.x-f.size/2,f.y-anchorY*f.size/640,f.size,f.size);}
 let holeFrame=-1,hf=holeVisual?.field;
 if(release){hf=release.field;holeFrame=blackHoleFrame(now-release.started,'release');}
 else if(active?.id==='black-hole')holeFrame=blackHoleFrame(now-active.started);
 else if(model.hole)holeFrame=blackHoleFrame(now-(holeVisual?.started??0),'hold');
 if(holeFrame>=0&&hf){
  const index=Math.floor(holeFrame),mix=holeFrame-index,f={...hf,size:640};
  // Adjacent authored poses blend at render cadence; no real-time timers.
  if(mix===0)field('black-hole',index,f);
  else {const b=holeBlendCtx;b.clearRect(0,0,640,640);b.globalCompositeOperation='source-over';b.globalAlpha=1-mix;b.drawImage(fx['black-hole'][index],0,0);
   b.globalCompositeOperation='lighter';b.globalAlpha=mix;b.drawImage(fx['black-hole'][index+1],0,0);
   b.globalAlpha=1;b.globalCompositeOperation='source-over';g.drawImage(holeBlend,f.x-320,f.y-490);
  }
 }
 if(active){const a=active,s=specs[a.id],t=now-a.started,f=a.field;if(t>=820){
 if(a.id==='meteor'){if(t<1700){const v=clamp((t-820)/880)**2,x=f.x-500+500*v,y=-180+(f.y+180)*v;g.drawImage(fx['meteor-fall'][Math.floor((t-820)/60)%12],x-440,y-430,640,640);}else field('meteor-impact',Math.min(11,Math.floor((t-1700)/100)),f);}
 else if(a.stormField){const sf=a.stormField,im=fx[a.id]?.[stormFrame(t-STORM_RELEASE)];if(im)g.drawImage(im,sf.x-sf.width/2,sf.y-540*sf.width/768,sf.width,sf.height);}
 else if(!s.area){const target=a.targets.find(e=>e.id===a.target);if(target){if(t<1300){const v=(t-820)/480,origin=root.WizardCasting.crystal(wizard,positions[caster],3),x=origin.x+(target.x-origin.x)*v,y=origin.y+(target.y-target.h*.5-origin.y)*v,im=fx[a.id+'-flight'][Math.floor(t/70)%fx[a.id+'-flight'].length];g.drawImage(im,x-192*102/128,y-96,192,192);}else{const im=fx[a.id+'-impact'][Math.min(fx[a.id+'-impact'].length-1,Math.floor((t-1300)/70))];g.drawImage(im,target.x-150,target.y-target.h*.5-150,300,300);}}}
 }}drawAilments(g,now);g.restore();};
root.WizardSkills=api;
})(typeof window!=='undefined'?window:globalThis);
