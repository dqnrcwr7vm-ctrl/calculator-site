/* Fit the game to the visible browser area, including when fullscreen is unavailable. */
(() => {
  'use strict';
  const root=document.documentElement;
  const base=new URL('.',document.currentScript.src);
  const mobile=matchMedia('(max-width:1024px), (pointer:coarse)');
  const standalone=()=>matchMedia('(display-mode:standalone), (display-mode:fullscreen)').matches||navigator.standalone===true;
  const portrait=matchMedia('(orientation:portrait)');
  const edgeScene=['lobby','selection'].includes(root.dataset.gamePage);
  const hostFrame=window.frameElement;
  if(hostFrame?.id==='game-view')hostFrame.dataset.gamePage=root.dataset.gamePage;
  let rotate;
  function sync(){
    root.classList.toggle('mobile-game',mobile.matches);
    root.classList.toggle('mobile-portrait',mobile.matches&&portrait.matches);
    root.classList.toggle('game-embedded',parent!==window);
    // The on-screen keyboard can shrink the visual viewport without resizing 100dvh.
    // Outside text entry, let CSS track rotation and browser bars directly.
    let focused=document.activeElement;
    while(focused?.tagName==='IFRAME')focused=focused.contentDocument?.activeElement;
    const viewport=window.visualViewport;
    if(focused?.matches(':read-write') && viewport && Math.abs(viewport.scale-1)<.01){
      root.style.setProperty('--game-height',viewport.height+'px');
    }else{
      root.style.removeProperty('--game-height');
    }
    // A full-bleed iframe needs the outer window's cutout/home-indicator insets.
    if(edgeScene && hostFrame?.id==='game-view'){
      const hostStyle=parent.getComputedStyle(parent.document.documentElement);
      for(const side of ['top','right','bottom','left']){
        const name='--safe-'+side;
        root.style.setProperty(name,hostStyle.getPropertyValue(name));
      }
    }
    if(rotate)rotate.hidden=!(mobile.matches&&portrait.matches&&parent===window);
    dispatchEvent(new Event('gameviewportchange'));
  }
  window.GameMobile={get active(){return mobile.matches;},standalone,sync};
  sync();
  addEventListener('resize',sync);
  window.visualViewport?.addEventListener('resize',sync);
  addEventListener('pageshow',sync);
  document.addEventListener('fullscreenchange',sync);
  portrait.addEventListener('change',sync);
  mobile.addEventListener('change',sync);
  addEventListener('gamescreenenter',sync);addEventListener('gamescreenhome',sync);
  // A connected keyboard must not operate the hidden game behind the rotation guide.
  addEventListener('keydown',event=>{
    if(root.classList.contains('mobile-portrait')){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);
  document.addEventListener('DOMContentLoaded',()=>{
    if(parent!==window)return;
    rotate=document.createElement('section');rotate.id='game-rotate';rotate.hidden=true;
    rotate.setAttribute('aria-label','가로 화면 안내');
    rotate.innerHTML='<div><img alt="DUNGEON BREAKER"><div class="rotate-phone" aria-hidden="true">↻</div><h1>휴대폰을 가로로 돌려주세요</h1><p>가로 화면에 맞춰 준비된 게임입니다.<br>회전되지 않으면 세로 방향 잠금을 해제해 주세요.</p></div>';
    rotate.querySelector('img').src=new URL('imagegen/dungeon-breaker-pixel-logo-transparent-v1.webp',base).href;
    document.body.append(rotate);
    sync();
  });
})();
