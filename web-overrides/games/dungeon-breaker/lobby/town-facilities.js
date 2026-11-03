(() => {
  'use strict';
  const facilities = {
    shop: { name: '상점', english: 'THE MERCHANT', description: '모험에 필요한 물품을 만나는 곳입니다.' },
    guild: { name: '길드사무소', english: 'GUILD OFFICE', description: '동료들과 만나 다음 여정을 준비하는 곳입니다.' },
    board: { name: '게시판', english: 'NOTICE BOARD', description: '마을의 새로운 소식과 모험가를 위한 의뢰가 모이는 곳입니다.' },
    forge: { name: '대장간', english: 'THE BLACKSMITH', description: '던전에서 모은 미스릴로 동료의 무기를 강화하세요.' }
  };
  const dialog = document.querySelector('#facility-dialog');
  const panel = dialog.querySelector('#forge-panel');
  const enter = dialog.querySelector('#forge-enter');
  function setWelcome(active) {
    dialog.classList.toggle('forge-welcome', active);
    dialog.setAttribute('aria-describedby', active ? 'forge-greeting-line' : 'facility-description');
    dialog.querySelector('.forge-scene').setAttribute('aria-label', active
      ? '돌화덕 옆에서 금발을 땋은 대장장이가 커다란 쇠망치를 짚고 웃고 있다.'
      : '작은 금발 대장장이가 양손으로 망치를 내려치자 모루 위에 달궈진 쇳덩이에서 주황빛 불티가 튄다.');
  }
  for (const button of document.querySelectorAll('[data-facility]:not(.board)')) {
    button.addEventListener('click', () => {
      const facility = facilities[button.dataset.facility];
      document.querySelector('#facility-title').textContent = facility.name;
      document.querySelector('#facility-description').textContent = facility.description;
      const isForge = button.dataset.facility === 'forge';
      dialog.classList.toggle('at-forge', isForge);
      setWelcome(isForge);
      dialog.querySelector('.preparing').hidden = isForge;
      panel.hidden = true;
      dialog.showModal();
      if (isForge) TownForgeScene.show(true);
      dialog.scrollTop = 0;
    });
  }
  enter.addEventListener('click', () => {
    setWelcome(false);
    panel.hidden = false;
    TownForgeScene.show(false);
    TownForge.open();
    document.getElementById('forge-pick-heading').focus({preventScroll:true});
  });
  dialog.querySelector('#forge-leave').addEventListener('click', () => dialog.close());
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.return').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
})();
