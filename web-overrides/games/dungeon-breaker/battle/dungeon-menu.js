/* Escape pauses the live expedition without consuming the current action. */
(()=>{
 if(!window.BATTLE_CONFIG?.partyTurns)return;
 const panel=document.createElement('dialog');panel.id='dungeon-menu';
 panel.setAttribute('aria-labelledby','dungeon-menu-title');
 panel.innerHTML='<h2 id="dungeon-menu-title">일시정지</h2><p>던전을 포기하면 캐릭터 선택 화면으로 돌아갑니다.</p><div class="dungeon-menu-buttons"><button data-resume autofocus>계속하기 · Esc</button><button data-abandon>던전 포기하기</button></div>';
 document.querySelector('.screen').append(panel);
 const opener=document.createElement('button');opener.id='dungeon-menu-open';opener.textContent='메뉴 · Esc';opener.setAttribute('aria-haspopup','dialog');document.querySelector('#scene').append(opener);
 let wasPaused=false,returnFocus=null;
 const unavailable=()=>typeof ready==='undefined'||!ready||window.EntryLoading?.active||runState.stage!=='battle'||!!finisher||['defeat','victory'].includes(window.PartyTurns?.cycle.phase)||document.querySelector('#party-setup:not([hidden]),#loot-overlay:not([hidden]),#clear-overlay:not([hidden]),#party-defeat:not([hidden])');
 function open(){
  if(panel.open||unavailable())return;
  wasPaused=paused;returnFocus=document.activeElement;paused=true;updatePause();
  // The visible menu button also works on touch devices during target selection.
  window.PartyTurns?.cancelTarget();panel.showModal();panel.querySelector('[data-resume]').focus({preventScroll:true});buttons();
 }
 function close(){
  if(!panel.open)return;
  panel.close();paused=wasPaused;updatePause();buttons();
  const target=returnFocus?.isConnected&&!returnFocus.disabled?returnFocus:opener;
  target.focus({preventScroll:true});
 }
 window.DungeonMenu={get isOpen(){return panel.open;},open,close};
 opener.onclick=open;panel.querySelector('[data-resume]').onclick=close;
 panel.querySelector('[data-abandon]').onclick=()=>{
  paused=true;window.PartyTurns?.cancelTarget();
  if(window.GalleonCampaign){GalleonCampaign.abandon();return;}
  sessionStorage.removeItem('normal-party-selection');
  const url=new URL('normal-entry.html?newparty=1',location.href);
  if(!window.GameScreen?.navigate?.(url.href))location.replace(url.href);
 };
 panel.addEventListener('cancel',e=>{e.preventDefault();close();});
 document.addEventListener('keydown',e=>{
  if(panel.open){
   e.stopImmediatePropagation();
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
    e.preventDefault();const choices=[...panel.querySelectorAll('button:not(:disabled)')],index=choices.indexOf(document.activeElement),delta=['ArrowUp','ArrowLeft'].includes(e.key)?-1:1;
    const next=e.key==='Home'?0:e.key==='End'?choices.length-1:index<0?0:(index+delta+choices.length)%choices.length;choices[next]?.focus({preventScroll:true});
   }else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat&&panel.contains(document.activeElement)&&document.activeElement.matches('button'))document.activeElement.click();}
   else if(e.key==='Escape'){e.preventDefault();if(!e.repeat)close();}
   return;
  }
  if(e.key!=='Escape'||e.defaultPrevented||e.isComposing||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable="true"]')||window.PartyTurns?.targeting||unavailable())return;
  e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)open();
 },true);
})();
