/* Live-game mobile shell. Browser chrome belongs to Safari; Home Screen mode removes it. */
(() => {
  'use strict';
  const root=document.documentElement;
  const base=new URL('.',document.currentScript.src);
  const mobile=matchMedia('(max-width:1024px), (pointer:coarse)');
  const standalone=()=>matchMedia('(display-mode:standalone), (display-mode:fullscreen)').matches||navigator.standalone===true;
  let rotate,install,help;
  function sync(){
    const viewport=window.visualViewport;
    const unzoomed=!viewport||Math.abs(viewport.scale-1)<.01;
    const width=unzoomed&&viewport?viewport.width:innerWidth;
    const height=unzoomed&&viewport?viewport.height:innerHeight;
    root.classList.toggle('mobile-game',mobile.matches);
    root.classList.toggle('mobile-portrait',mobile.matches&&width<height);
    root.classList.toggle('game-embedded',parent!==window);
    root.style.setProperty('--game-width',width+'px');
    root.style.setProperty('--game-height',height+'px');
    if(rotate)rotate.hidden=!(mobile.matches&&width<height&&parent===window);
    if(install)install.hidden=!mobile.matches||standalone()||!!document.querySelector('#game-view');
    dispatchEvent(new Event('gameviewportchange'));
  }
  function showInstallHelp(){
    if(help&&!help.open)help.showModal();
  }
  window.GameMobile={get active(){return mobile.matches;},standalone,showInstallHelp,sync};
  sync();
  addEventListener('resize',sync);
  window.visualViewport?.addEventListener('resize',sync);
  mobile.addEventListener('change',sync);
  addEventListener('gamescreenenter',sync);addEventListener('gamescreenhome',sync);
  // A connected keyboard must not operate the hidden game behind either guide.
  addEventListener('keydown',event=>{
    if(help?.open||root.classList.contains('mobile-portrait')){
      if(!help?.open&&!rotate?.contains(event.target))event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);
  document.addEventListener('DOMContentLoaded',()=>{
    if(parent!==window)return;
    rotate=document.createElement('section');rotate.id='game-rotate';rotate.hidden=true;
    rotate.setAttribute('aria-label','가로 화면 안내');
    rotate.innerHTML='<div><img alt="DUNGEON BREAKER"><div class="rotate-phone" aria-hidden="true">↻</div><h1>휴대폰을 가로로 돌려주세요</h1><p>가로 화면에 맞춰 준비된 게임입니다.<br>회전되지 않으면 세로 방향 잠금을 해제해 주세요.</p><button type="button">주소창 없이 플레이하는 방법</button></div>';
    rotate.querySelector('img').src=new URL('imagegen/dungeon-breaker-pixel-logo-transparent-v1.webp',base).href;
    rotate.querySelector('button').onclick=showInstallHelp;
    document.body.append(rotate);
    help=document.createElement('dialog');help.id='game-install-help';
    help.setAttribute('aria-labelledby','game-install-title');
    help.innerHTML='<form method="dialog"><h2 id="game-install-title">주소창 없이 플레이하기</h2><p>아이폰 · 아이패드</p><ol><li>Safari의 <strong>공유</strong> 버튼을 누르세요.</li><li><strong>홈 화면에 추가</strong>를 선택하세요.</li><li><strong>웹 앱으로 열기</strong>가 보이면 켜고 추가하세요.</li><li>홈 화면의 DUNGEON BREAKER 아이콘을 열고 기기를 가로로 돌리세요.</li></ol><p class="install-note">안드로이드는 브라우저 메뉴의 앱 설치 또는 홈 화면에 추가를 이용하세요.<br>게임을 불러오려면 인터넷 연결이 필요합니다.</p><button value="close">확인</button></form>';
    document.body.append(help);
    if(root.dataset.gamePage==='title'){
      install=document.createElement('button');install.id='game-install-open';install.type='button';install.textContent='주소창 없이 플레이';install.onclick=showInstallHelp;document.body.append(install);
    }
    sync();
  });
})();
