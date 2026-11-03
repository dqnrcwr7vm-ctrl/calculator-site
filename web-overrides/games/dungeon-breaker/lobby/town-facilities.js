(() => {
  'use strict';
  const facilities = {
    shop: { name: '상점', english: 'THE MERCHANT', description: '모험에 필요한 물품을 만나는 곳입니다.' },
    guild: { name: '길드사무소', english: 'GUILD OFFICE', description: '동료들과 만나 다음 여정을 준비하는 곳입니다.' },
    board: { name: '게시판', english: 'NOTICE BOARD', description: '마을의 새로운 소식과 모험가를 위한 의뢰가 모이는 곳입니다.' },
    forge: { name: '대장간', english: 'THE BLACKSMITH', description: '던전에서 모은 미스릴로 동료의 무기를 강화하세요.' }
  };
  const dialog = document.querySelector('#facility-dialog');
  for (const button of document.querySelectorAll('[data-facility]:not(.board)')) {
    button.addEventListener('click', () => {
      const facility = facilities[button.dataset.facility];
      document.querySelector('#facility-title').textContent = facility.name;
      document.querySelector('#facility-description').textContent = facility.description;
      const isForge = button.dataset.facility === 'forge';
      dialog.classList.toggle('at-forge', isForge);
      dialog.querySelector('.preparing').hidden = isForge;
      dialog.querySelector('#forge-panel').hidden = !isForge;
      dialog.showModal();
      if (isForge) TownForge.open();
    });
  }
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.return').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
})();
