(() => {
  'use strict';
  const facilities = {
    shop: { name: '상점', english: 'THE MERCHANT', description: '모험에 필요한 물품을 만나는 곳입니다.' },
    guild: { name: '길드사무소', english: 'GUILD OFFICE', description: '동료들과 만나 다음 여정을 준비하는 곳입니다.' },
  };
  const dialog = document.querySelector('#facility-dialog');
  for (const [id, facility] of Object.entries(facilities)) {
    document.querySelector('[data-facility="' + id + '"]').addEventListener('click', () => {
      document.querySelector('#facility-title').textContent = facility.name;
      document.querySelector('#facility-description').textContent = facility.description;
      dialog.showModal();
      dialog.scrollTop = 0;
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
