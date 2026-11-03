/* Persistent per-character draft: two starting skills, one after each mid-boss. */
(()=>{
 const q=new URLSearchParams(location.search);if(q.get('campaign')!=='1')return;
 const dungeonIds=Object.keys(DUNGEON_COMBAT_DATA).sort();
 // Explicit IDs support existing runs/test links; a new expedition rolls once.
 const legacyRun=q.get('run')&&sessionStorage.getItem('dungeon-breaker:galleon:'+q.get('run'));
 const dungeon=DUNGEON_COMBAT_DATA[q.get('dungeon')]?.id||(legacyRun?'01':dungeonIds[crypto.getRandomValues(new Uint32Array(1))[0]%dungeonIds.length]);
 const floorLabel=n=>window.DUNGEON_COMBAT_DATA[dungeon].floors[n-1].label;
 const random=()=>crypto.getRandomValues(new Uint32Array(1))[0];
 const id=q.get('run')||random()+'-'+random(),key='dungeon-breaker:galleon:'+(dungeon==='01'?'':dungeon+':')+id;
 let old;try{old=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
 // Keep an earlier run recoverable; the new draft starts a fresh nine-floor expedition.
 if(old&&old.version!==2)sessionStorage.setItem(key+':before-skill-draft',JSON.stringify(old));
 let state=old?.version===2?old:{version:2,floor:1,seed:random(),skills:{},party:null,wizardMp:null,draft:null,started:false,complete:false,cleared:false};
 if(!state.started)document.documentElement.classList.add('initial-draft');
 const save=()=>sessionStorage.setItem(key,JSON.stringify(state));save();
 function url(){const next=new URLSearchParams({campaign:'1',dungeon,run:id,seed:String(state.seed),actor:'dwarf',...(q.get('team')?{team:q.get('team')}:{}),floor:String(state.floor),formation:[4,8,9].includes(state.floor)?'solo':'group'});return location.pathname+'?'+next;}
 history.replaceState(null,'',url());
 let bridge,departing=false,returning=false;
 function returnToSelection(){
  if(returning)return;returning=true;
  sessionStorage.removeItem('normal-party-selection');
  const destination=new URL('normal-entry.html?newparty=1',location.href);
  if(!window.GameScreen?.navigate?.(destination.href))location.replace(destination.href);
 }
 function fail(){if(state.failed)return;state.failed=true;state.draft=null;save();}
 window.addEventListener('pageshow',event=>{if(event.persisted&&state.failed){returning=false;returnToSelection();}});

 const team=()=>window.PartyRoster.team;
 const catalog=role=>window.SkillDraftData.catalog(role||BATTLE_ASSETS[0].id);
 function candidates(role,exclude=[]){const all=catalog(role).map(s=>s.id).filter(s=>!exclude.includes(s)&& (s!=='super-combine'||(state.skills[role]||[]).some(id=>id.startsWith('install-')))),known=state.skills[role]||[],fresh=all.filter(s=>!known.includes(s));return fresh.length?fresh:['mechanic','priest'].includes(role)?all:[];}
 function pick(pool){return pool[random()%pool.length];}
 function newOffers(role,kind=state.draft?.kind){const breaker=kind==='initial'?window.DwarfSkills?.BREAK_SKILLS[role]:null;const offers=breaker&&catalog(role).some(s=>s.id===breaker)?[breaker]:[];for(let n=offers.length;n<3;n++){const pool=candidates(role,offers);if(pool.length)offers.push(pick(pool));}return offers;}
 function begin(kind){state.draft={kind,unit:0,offers:newOffers(team()[0],kind),rerolled:[false,false,false],selected:[]};save();}
 function apply(){PartyTurns.setSkills(state.skills);bridge.setSlots((state.skills[BATTLE_ASSETS[0].id]||[]).slice(0,4).map(id=>({...catalog().find(s=>s.id===id)})));}
 function restore(){
  // Capacity must be restored before HP is clamped, or a carried blessing loses
  // health on every load. Restoring does not replay effects or grant any heal/MP.
  if(state.party)BATTLE_ASSETS.slice(0,4).forEach(a=>{const previous=state.party.find(p=>p.id===a.id);if(previous)a.currentHp=Math.max(0,previous.hp);});
  window.HealerSkills?.restoreBuffs(state.timedBuffs?.healer);
  if(state.party)BATTLE_ASSETS.slice(0,4).forEach((a,i)=>{a.currentHp=Math.min(a.hp,a.currentHp);bridge.sync(i);});
  window.BattleRoar?.restore(state.timedBuffs?.roar);window.ArcherSkills?.restoreBuffs(state.timedBuffs?.archer);window.DwarfSkills?.restoreBuffs(state.timedBuffs?.dwarf);
  if(state.wizardMp!==null)window.WizardSkills?.restoreMp(state.wizardMp);if(state.heroMp!=null)window.PartyHero?.restoreMp(state.heroMp);window.PartyResources?.restoreAll(state.resources);window.PartyMechanic?.restoreRobots(state.mechanicRobots);
 }
 function snapshot(){const consume=window.PartyTurns?.clearConsumesTurn!==false;state.timedBuffs={roar:window.BattleRoar?.snapshot(consume),archer:window.ArcherSkills?.snapshotBuffs(consume),healer:window.HealerSkills?.snapshotBuffs(consume),dwarf:window.DwarfSkills?.snapshotBuffs(consume)};state.party=BATTLE_ASSETS.slice(0,4).map(a=>({id:a.id,hp:a.currentHp??a.hp}));state.wizardMp=window.WizardSkills?.mp??null;state.heroMp=window.PartyHero?.mp??null;state.resources=window.PartyResources?.snapshot();state.mechanicRobots=window.PartyMechanic?.snapshotRobots(consume)||[];}
 function advance(){if(departing)return;departing=true;state.floor++;state.cleared=false;save();window.EntryLoading?.begin("floor");location.replace(url());}
 function finishFloor(){
  delete state.mithrilPending;
  if(state.floor===9){state.complete=true;save();final();}
  else if([4,8].includes(state.floor)){begin('mid');render();}
  else advance();
 }
 let awarding=false;
 async function creditFloor(){
  if(awarding)return;
  awarding=true;
  try{
   await GameForge.claim(key,state.floor);
  }catch(error){
   awarding=false;
   const overlay=document.querySelector('#clear-overlay');
   overlay.hidden=false;overlay.classList.remove('simple-clear');overlay.style.setProperty('--clear-reveal','1');
   document.querySelector('.clear-description').textContent='미스릴 보상을 저장하지 못했습니다.';
   const retry=document.querySelector('#replay-clear');
   retry.hidden=false;retry.style.display='inline-block';retry.textContent='보상 저장 다시 시도';retry.onclick=creditFloor;
   return;
  }
  awarding=false;
  state.lastMithrilFloor=state.floor;
  state.lastMithrilAmount=GameForge.reward(state.floor);
  finishFloor();
 }
 function final(){let lobby=document.querySelector('#clear-lobby');if(!lobby){lobby=document.createElement('button');lobby.id='clear-lobby';lobby.type='button';lobby.textContent='로비로 돌아가기';lobby.onclick=()=>{const url=new URL('../lobby/index.html',location.href);if(!window.GameScreen?.navigate?.(url.href))location.assign(url.href);};document.querySelector('.clear-buttons').append(lobby);}lobby.hidden=false;const overlay=document.querySelector('#clear-overlay');overlay.classList.add('dungeon-complete');overlay.style.setProperty('--clear-reveal','1');overlay.hidden=false;document.querySelector('#clear-title').textContent='DUNGEON CLEAR!!' ;document.querySelector('.clear-location').textContent=floorLabel(9)+' · '+BATTLE_ASSETS[4].name;document.querySelector('.clear-description').textContent=state.lastMithrilFloor===9?'미스릴 +'+(state.lastMithrilAmount??12):'';const button=document.querySelector('#replay-clear');button.textContent='새 탐험 시작';button.onclick=()=>location.assign(location.pathname+'?campaign=1'+(q.get('team')?'&team='+q.get('team'):''));}
 function render(){
  const d=state.draft;if(!d)return;document.title='DUNGEON BREAKER';const role=team()[d.unit],actor=BATTLE_ASSETS.find(a=>a.id===role),need=d.kind==='initial'?2:1;
  document.querySelector('#clear-overlay').hidden=true;const overlay=document.querySelector('#loot-overlay');overlay.hidden=false;overlay.classList.add('skill-draft');
  document.querySelector('#loot-kicker').textContent='';document.querySelector('#loot-kicker').hidden=true;
  document.querySelector('#loot-title').textContent='스킬선택';overlay.setAttribute('aria-label',actor.name+' 스킬선택');document.querySelector('#loot-subtitle').textContent=`세 가지 중 ${need}개 선택 (${d.selected.length}/${need}) · 카드 새로고침 1회${d.kind==='initial'&&window.DwarfSkills?.BREAK_SKILLS[role]?' (파훼기 제외)':''}`;
  const breaker=d.kind==='initial'?window.DwarfSkills?.BREAK_SKILLS[role]:null;
  // Upgrade an unfinished older draft without replacing either selected card.
  if(breaker&&!d.offers.includes(breaker)&&catalog(role).some(s=>s.id===breaker)){const index=d.offers.findIndex((_,i)=>!d.selected.includes(i));if(index>=0){d.offers[index]=breaker;d.rerolled[index]=false;save();}}
  const content=document.querySelector('#loot-content');content.replaceChildren();const grid=document.createElement('div');grid.className='draft-cards';
  d.offers.forEach((id,i)=>{const skill=catalog(role).find(s=>s.id===id),wrap=document.createElement('div');wrap.className='draft-option';const card=document.createElement('button');card.className='draft-card';card.dataset.card=i;card.setAttribute('aria-pressed',String(d.selected.includes(i)));card.innerHTML=SkillDraftData.icon(id);const title=document.createElement('strong');title.textContent=skill.name;const desc=document.createElement('span');desc.className='draft-description';desc.textContent=SkillDraftData.describeSelection(role,skill);const badge=document.createElement('small');badge.textContent=d.selected.includes(i)?'선택 완료':(state.skills[role]||[]).includes(id)?'보유 스킬 · 중복 습득':'';badge.hidden=!badge.textContent;if(d.selected.includes(i))badge.insertAdjacentHTML('afterbegin',SkillDraftData.icon('selected'));card.append(title,desc,badge);card.onclick=()=>{if(d.selected.includes(i))d.selected=d.selected.filter(n=>n!==i);else if(d.selected.length<need)d.selected.push(i);save();render();};
   const reroll=document.createElement('button');reroll.className='draft-reroll';reroll.dataset.reroll=i;reroll.innerHTML=SkillDraftData.icon('reroll');const rerollLabel=document.createElement('span');rerollLabel.textContent=id===breaker?'파훼기 확정':d.rerolled[i]?'새로고침 사용 완료':'새로고침 1 / 1';reroll.append(rerollLabel);const pool=candidates(role,d.offers);reroll.disabled=id===breaker||d.rerolled[i]||d.selected.includes(i)||!pool.length;reroll.onclick=()=>{if(id===breaker||d.rerolled[i]||d.selected.includes(i))return;const choices=candidates(role,d.offers);if(!choices.length)return;d.offers[i]=pick(choices);d.rerolled[i]=true;save();render();};wrap.append(card,reroll);grid.append(wrap);
  });content.append(grid);content.after(document.querySelector('#loot-subtitle'));
  const back=document.querySelector('#loot-back');back.hidden=d.kind!=='initial';back.textContent='파티 다시 구성';back.onclick=()=>document.querySelector('#party-configure').click();document.querySelector('#loot-restart').hidden=true;const next=document.querySelector('#loot-skip');next.hidden=false;next.dataset.uiSound='reward';next.textContent=d.unit===3?(d.kind==='initial'?'선택 확정 · 탐험 시작':'선택 확정 · 다음 층으로'):'선택 확정 · 다음 동료';next.disabled=d.selected.length!==need;
  next.onclick=()=>{if(d.selected.length!==need)return;state.skills[role]=[...(state.skills[role]||[]),...d.selected.map(i=>d.offers[i])].slice(0,4);d.unit++;if(d.unit<4){d.offers=newOffers(team()[d.unit]);d.selected=[];d.rerolled=[false,false,false];save();render();}else{const initial=d.kind==='initial';state.draft=null;state.started=true;document.documentElement.classList.remove('initial-draft');GameDungeons.refresh();save();overlay.hidden=true;window.SkillDraftInput?.close();if(bridge)apply();else window.dispatchEvent(new Event("campaignprepared"));if(!initial)advance();}};
  let help=document.querySelector('#draft-key-help');if(!help){help=document.createElement('p');help.id='draft-key-help';help.className='draft-key-help';help.textContent='방향키로 이동 · Space / Enter로 선택 · Esc 선택 취소';overlay.querySelector('.loot-footer').after(help);}
  overlay.setAttribute('aria-describedby','loot-subtitle draft-key-help');
  window.SkillDraftInput?.refresh(overlay,state.floor+':'+d.kind+':'+d.unit);
 }
 window.GalleonCampaign={get floor(){return state.floor;},get state(){return structuredClone(state);},get blocked(){return state.failed||!state.started||!!state.draft||state.cleared||state.complete;},catalog,
 cancelDraftSelection(){
  if(!state.draft?.selected.length)return false;
  state.draft.selected.pop();save();render();return true;
 },
 fail,returnToSelection,abandon(){state.abandoned=true;fail();returnToSelection();},
 prepare(){if(state.failed){returnToSelection();return true;}if(state.started)return false;if(!state.draft)begin('initial');render();return true;},
 equipped(){return (state.skills[BATTLE_ASSETS[0].id]||[]).slice(0,4).map(id=>({...catalog().find(s=>s.id===id)}));},
 mount(b){if(state.failed){returnToSelection();return;}bridge=b;document.body.classList.add('campaign-mode');restore();apply();document.querySelector('#party-reroll').hidden=true;if(state.complete){bridge.completed();final();return;}if(state.cleared)bridge.completed();if(state.mithrilPending){creditFloor();return;}if(!state.started&&!state.draft)begin('initial');if(state.draft)render();else if(state.cleared)advance();},
 clear(){if(!state.started||state.draft||state.failed||state.cleared||bridge.enemies().some(e=>e.hp>0))return;state.cleared=true;if(state.floor<9&&window.PartyResources?.enabled){for(const a of BATTLE_ASSETS.slice(0,4))if((a.currentHp??a.hp)>0){PartyResources.recover(a.id,[4,8].includes(state.floor)?.35:.25);if([4,8].includes(state.floor))a.currentHp=Math.min(a.hp,(a.currentHp??a.hp)+Math.round(a.hp*.1));}}snapshot();if(window.GameForge){state.mithrilPending=true;save();creditFloor();}else finishFloor();},
 update(){},reset(){if(state.failed){returnToSelection();return;}departing=false;restore();apply();if(state.draft)render();}
 };
})();
