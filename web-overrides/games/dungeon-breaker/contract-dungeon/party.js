'use strict';
const ROOM_PREFIX='dungeon-breaker-party-v1:',MAX_AGE=24*60*60*1000;
let playerId=sessionStorage.getItem('db-player-id');
if (!playerId) {
  // Private Wi-Fi addresses served over HTTP support getRandomValues but not randomUUID.
  playerId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem('db-player-id', playerId);
}
let activeCode=sessionStorage.getItem('db-party-code')||'',room=null,notice='';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function readRoom(code){try{const r=JSON.parse(localStorage.getItem(ROOM_PREFIX+code));return r&&Date.now()-r.updated<MAX_AGE?r:null;}catch{return null;}}
function writeRoom(r){r.updated=Date.now();localStorage.setItem(ROOM_PREFIX+r.code,JSON.stringify(r));room=r;}
function current(){const r=readRoom(activeCode);return r?.members.some(m=>m.id===playerId)?r:null;}
function allReady(r){return !!r?.members.length&&r.members.every(m=>m.ready);}
function saveActive(r){room=r;activeCode=r.code;sessionStorage.setItem('db-party-code',activeCode);}
async function changeRoom(fn){
 const work=()=>{const r=current();if(!r){reset();return;}fn(r);if(r.members.length)writeRoom(r);else localStorage.removeItem(ROOM_PREFIX+r.code);};
 try{if(navigator.locks)await navigator.locks.request('db-party-'+activeCode,work);else work();sync();}catch{notice='파티 정보를 저장하지 못했습니다. 브라우저 저장 설정을 확인해 주세요.';refresh();}
}
function reset(){room=null;activeCode='';sessionStorage.removeItem('db-party-code');screen='entry';refresh();}
function refresh(){render();enhance();fit();}
function sync(){const r=current();if(!r){if(activeCode)notice='파티가 종료되었거나 만료되었습니다.';reset();return;}room=r;screen=r.phase==='classes'?'classes':allReady(r)?'ready':'waiting';refresh();}
function createParty(){try{let code;do{const bytes=crypto.getRandomValues(new Uint8Array(6));code=Array.from(bytes,n=>alphabet[n%alphabet.length]).join('');}while(readRoom(code));const r={code,host:playerId,phase:'room',updated:Date.now(),members:[{id:playerId,name:'파티장',ready:false,character:null}]};writeRoom(r);saveActive(r);notice='';sync();}catch{document.getElementById('entry-status').textContent='파티를 만들 수 없습니다. 브라우저 저장 설정을 확인해 주세요.';}}
function checkCode(){const input=document.getElementById('code');input.value=input.value.toUpperCase().replace(/[^A-Z0-9]/g,'');const status=document.getElementById('entry-status');const r=readRoom(input.value);status.textContent=input.value.length<6?'':!r?'초대코드를 다시 확인해 주세요.':r.phase!=='room'?'이미 탐험을 시작한 파티입니다.':r.members.length>=4?'파티가 가득 찼습니다.':`✓ 참가 가능한 파티 · ${r.members.length} / 4명`;}
async function joinParty(){const code=document.getElementById('code').value.trim().toUpperCase();const work=()=>{const r=readRoom(code);if(!r)throw Error('초대코드를 다시 확인해 주세요.');if(r.phase!=='room')throw Error('이미 탐험을 시작한 파티입니다.');if(r.members.length>=4)throw Error('파티가 가득 찼습니다.');r.members.push({id:playerId,name:'동료 '+r.members.length,ready:false,character:null});writeRoom(r);saveActive(r);};try{if(navigator.locks)await navigator.locks.request('db-party-'+code,work);else work();notice='';sync();}catch(e){document.getElementById('entry-status').textContent=e.message;}}
async function leaveParty(){await changeRoom(r=>{r.members=r.members.filter(m=>m.id!==playerId);if(r.host===playerId&&r.members.length){r.host=r.members[0].id;r.members[0].name='파티장';}});notice='';reset();}
let cancellingCharacter=false;
window.CharacterSelection={async cancel(){
 if(screen!=='classes'||!room||cancellingCharacter)return;
 if(room.members.find(m=>m.id===playerId)?.character==null)return;
 cancellingCharacter=true;
 try{await changeRoom(r=>{r.members.find(m=>m.id===playerId).character=null;});}
 finally{cancellingCharacter=false;document.querySelector('.classcard.selected')?.focus({preventScroll:true});}
}};
function enhance(){
 if(screen==='entry'||screen==='join'){
  const actions=document.querySelectorAll('[data-party-action]');actions[0].onclick=createParty;actions[1].onclick=joinParty;
  const input=document.getElementById('code');input.value='';input.autocomplete='off';input.setAttribute('aria-describedby','entry-status');input.addEventListener('input',checkCode);input.addEventListener('keydown',e=>{if(e.key==='Enter')joinParty();});
  const panel=document.querySelector('.split>.panel');panel.querySelector('.notice').innerHTML='같은 브라우저의 다른 탭에서 초대코드로 참가할 수 있습니다.<br>다른 기기 간 접속은 아직 지원하지 않습니다.';
  const solo=document.createElement('a');solo.href='../battle/normal-entry.html?contract=1&newparty=1';solo.className='contract-solo';solo.textContent='혼자 의뢰 탐험 · 4인 파티 편성 →';panel.append(solo);
  const status=document.createElement('div');status.id='entry-status';status.className='entry-status';status.setAttribute('role','status');status.textContent=notice;input.after(status);return;
 }
 if(screen==='waiting'||screen==='ready'){
  const r=room;if(!r)return;const me=r.members.find(m=>m.id===playerId),host=r.host===playerId,ready=allReady(r),count=r.members.filter(m=>m.ready).length;
  const panel=document.querySelector('.split>.panel');panel.innerHTML=`<div class="eyebrow">PARTY ROOM</div><h2>우리의 원정대 <span style="font-size:13px;color:#bca3cc">${r.members.length} / 4</span></h2><div class="code"><small>초대코드 · 동료에게 공유하세요</small><strong>${r.code}<button class="copy" id="copy-code">복사 ▣</button></strong></div>${Array.from({length:4},(_,i)=>{const m=r.members[i];return `<div class="member"><span><span class="avatar">0${i+1}</span>${m?(m.id===playerId?'나':m.name)+(m.id===r.host?' · 파티장':''):'초대 대기'}</span><span class="${m?.ready?'ready':'wait'}">${m?(m.ready?'✓ 준비 완료':'준비 중'):'빈 자리'}</span></div>`;}).join('')}<p class="hint ${ready?'success':''}">${ready?'✓ 모든 파티원이 준비되었습니다.':`준비 완료 ${count} / ${r.members.length} · 동료를 기다리고 있습니다.`}</p><button class="secondary" id="toggle-ready">${me.ready?'✓ 나의 준비 완료 · 취소':'준비 완료'}</button><button class="${ready&&host?'primary':'disabled'} bottom" id="explore" ${ready&&host?'':'disabled'}>던전 탐험 →</button><div class="room-actions"><button class="text-button" id="leave-party">파티 나가기</button><span>${host?'모두 준비하면 탐험을 시작할 수 있습니다.':'파티장이 탐험을 시작합니다.'}</span></div><div class="room-message" role="status">${notice}</div>`;
  document.getElementById('toggle-ready').onclick=()=>changeRoom(r=>{if(r.phase==='room'){const m=r.members.find(m=>m.id===playerId);m.ready=!m.ready;}});
  document.getElementById('explore').onclick=()=>changeRoom(r=>{if(r.host===playerId&&r.phase==='room'&&allReady(r))r.phase='classes';});
  document.getElementById('leave-party').onclick=leaveParty;
  document.getElementById('copy-code').onclick=async()=>{try{await navigator.clipboard.writeText(activeCode);notice='초대코드를 복사했습니다.';}catch{notice='초대코드: '+activeCode;}refresh();};
 }
 if(screen==='classes'&&room){
  document.querySelector('.foot span').textContent='방향키로 이동 · Enter 선택 확정 · Esc 선택 취소';
  const me=room.members.find(m=>m.id===playerId);const strip=document.querySelector('.partystrip');strip.replaceChildren();const title=document.createElement('b');title.textContent=`파티 선택 현황 · ${room.members.filter(m=>m.character!==null).length} / ${room.members.length} 확정`;strip.append(title);for(const m of room.members){const span=document.createElement('span');span.textContent=`${m.id===playerId?'나':m.name} · ${m.character===null?'선택 중':classes[m.character][0]+' ✓'}`;strip.append(span);}
  document.querySelector('.detail .notice').innerHTML=classes[selected][8]+'<br>'+ (me.character===null?'내 선택 · 아직 확정하지 않았습니다':'확정한 캐릭터 · '+classes[me.character][0]);
  document.querySelector('.detail .primary').onclick=()=>changeRoom(r=>{r.members.find(m=>m.id===playerId).character=selected;});
  document.querySelectorAll('.classcard').forEach((button,i)=>button.onclick=()=>{selected=i;window.DungeonVoices?.selection(['hero','dwarf','archer','priest','wizard','mechanic'][i]);refresh();});
 }
}
function fit(){const scale=Math.min(innerWidth/1600,innerHeight/900);app.style.transform=`scale(${scale})`;document.body.style.width=1600*scale+'px';document.body.style.height=900*scale+'px';document.body.style.overflow='hidden';}
window.addEventListener('resize',fit);
window.addEventListener('storage',e=>{if(e.key===ROOM_PREFIX+activeCode)sync();});
window.addEventListener('pageshow',()=>{if(activeCode)sync();});
if(current())sync();else reset();
