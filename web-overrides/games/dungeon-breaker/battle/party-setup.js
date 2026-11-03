(()=>{const scene=document.querySelector('#scene'),open=document.createElement('button');open.id='party-configure';open.textContent='파티 구성';scene.append(open);const panel=document.createElement('section');panel.className='clear-overlay';panel.id='party-setup';panel.hidden=true;panel.innerHTML='<div class="clear-panel"><h2>파티 구성</h2><p>서로 다른 캐릭터 네 명과 행동 순서를 선택하세요. 시작하면 던전이 무작위로 정해집니다.</p><div id="roster-choices"></div><p id="roster-error" role="status"></p><div class="clear-buttons"><button data-normal>무작위 던전 시작</button><button data-boss>보스 파훼 테스트</button><button data-close>돌아가기</button></div></div>';document.querySelector('.screen').append(panel);const names={dwarf:'방패병',archer:'궁수',mechanic:'메카닉',wizard:'마법사',priest:'힐러',hero:'용사'};PartyRoster.team.forEach((id,i)=>{const label=document.createElement('label');label.textContent=(i+1)+'번째 ';const select=document.createElement('select');for(const [value,text]of Object.entries(names))select.add(new Option(text,value));select.value=id;label.append(select);panel.querySelector('#roster-choices').append(label);});let wasPaused=false,returnFocus=null;
panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','파티 구성');
const closeButton=panel.querySelector('[data-close]');closeButton.textContent='돌아가기 · Esc';closeButton.setAttribute('aria-keyshortcuts','Escape');
open.onclick=()=>{
 if(!panel.hidden)return;
 wasPaused=paused;returnFocus=document.activeElement;paused=true;
 panel.querySelectorAll('#roster-choices select').forEach((select,i)=>select.value=PartyRoster.team[i]);
 panel.querySelector('#roster-error').textContent='';panel.hidden=false;
 panel.querySelector('select')?.focus({preventScroll:true});
};
function close(){
 if(panel.hidden)return;
 panel.hidden=true;paused=wasPaused;
 const target=returnFocus?.isConnected&&returnFocus.getClientRects().length?returnFocus:open;
 target.focus({preventScroll:true});
}
closeButton.onclick=close;
document.addEventListener('keydown',e=>{
 if(panel.hidden||e.key!=='Escape'||e.isComposing||e.altKey||e.ctrlKey||e.metaKey)return;
 e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)close();
},true);
function go(boss){const team=[...panel.querySelectorAll('#roster-choices select')].map(s=>s.value);if(new Set(team).size!==4){panel.querySelector('#roster-error').textContent='서로 다른 캐릭터 네 명을 선택하세요.';return;}const q=new URLSearchParams({team:team.join(','),actor:'dwarf',formation:boss?'solo':'group',floor:boss?'9':'1'});if(boss){q.set('breaktest','1');q.set('dungeon',window.ActiveDungeon?.id||'01');}else{q.set('campaign','1');if(window.GalleonCampaign?.state.contract)q.set('contract','1');}location.assign(location.pathname+'?'+q);}panel.querySelector('[data-normal]').onclick=()=>go(false);panel.querySelector('[data-boss]').onclick=()=>go(true);})();
