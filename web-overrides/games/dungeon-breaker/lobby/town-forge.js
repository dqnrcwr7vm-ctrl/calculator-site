(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dialog = $('facility-dialog'), canvas = $('forge-preview'), ctx = canvas.getContext('2d');
  const button = $('forge-submit'), batch = $('forge-batch'), result = $('forge-result');
  const looks = $('forge-looks');
  let previewLevel = null;
  const {weapons, steps, attackPercent} = GameForge;
  // Center the visible IDLE art in its untrimmed animation cell.
  const framing = {hero:[.52,.66,.47], dwarf:[.50,.51,.74], archer:[.43,.53,.69],
    wizard:[.46,.60,.54], priest:[.45,.52,.70], mechanic:[.47,.55,.65]};
  const images = new Map();
  let role = 'hero', profile, request = 0, busy = false, raf = 0;
  function draw(time) {
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const image = images.get(role);
    if (!image?.naturalWidth || !image.complete) return;
    const [cx,cy,extent] = framing[role], size = 146 / extent;
    const left = 120 - cx*size, top = 88 - cy*size;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, left, top, size, size);
    const level = previewLevel ?? (profile?.levels[role] || 0);
    if (level) WeaponGlow.draw(ctx, role, 'idle', 0, level, image, left, top, size, size, time);
    if (level >= 30 && dialog.open && !document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches)
      raf = requestAnimationFrame(draw);
  }
  function render() {
    const level = profile?.levels[role] || 0, step = steps[level];
    $('forge-balance').textContent = profile?.mithril ?? '—';
    for (const target of $('forge-roles').children) {
      const id = target.dataset.role;
      target.setAttribute('aria-pressed', String(id === role));
      target.querySelector('small').textContent = '+' + (profile?.levels[id] || 0);
      target.disabled = busy;
    }
    const shown = previewLevel ?? level;
    const weapon = shown === 100 ? WeaponGlow.ascendedNames[role] : weapons[role][1];
    $('forge-weapon').textContent = weapon + ' +' + shown;
    $('forge-preview-label').textContent = previewLevel === null ? '장착 중' : '외형 미리보기';
    for (const tab of looks.children) tab.setAttribute('aria-pressed', String(tab.value === String(previewLevel ?? '')));
    $('forge-step').textContent = step ? '+' + level + ' → +' + (level + 1) : '+' + level + ' · 최고 단계';
    $('forge-attack').textContent = '+' + attackPercent(level) + '%' + (step ? ' → +' + attackPercent(level + 1) + '%' : '');
    $('forge-chance').textContent = step ? step.chance + '%' : '—';
    $('forge-hold').textContent = step ? step.hold + '%' : '—';
    $('forge-reset').textContent = step ? step.reset + '%' : '—';
    $('forge-reset').classList.toggle('at-risk', !!step?.reset);
    $('forge-cost').textContent = step ? step.cost + '개' : '—';
    button.disabled = busy || !profile || !step || profile.mithril < step.cost;
    button.textContent = busy ? '강화 중…' : !step ? '최고 단계 달성' :
      profile && profile.mithril < step.cost ? '미스릴 ' + (step.cost - profile.mithril) + '개 부족' : '1회 강화';
    const count = step ? Math.min(10, Math.floor((profile?.mithril || 0) / step.cost)) : 0;
    batch.dataset.limit = count;
    batch.hidden = !step || step.chance === 100;
    batch.disabled = button.disabled || count < 2;
    batch.textContent = count >= 2 ? '최대 ' + count + '회 · ' + count * step.cost + '개' : '최대 10회 시도';
    const rule = $('forge-rule');
    rule.classList.toggle('at-risk', !!step?.reset);
    rule.textContent = !step ? '최종 외형 각성 · 이 캐릭터의 공격 피해 2배' : step.reset ?
      '매 시도마다 이 무기가 +0으로 돌아갈 확률 ' + step.reset + '%. 연속 시도는 성공 또는 초기화 즉시 멈춥니다.' :
      '+80 → +81부터 초기화 위험이 생깁니다. 연속 시도는 한 단계 성공하면 멈춥니다.';
    if (!images.has(role)) {
      const image = new Image();
      image.onload = () => draw(performance.now());
      image.src = weapons[role][2];
      images.set(role, image);
    }
    draw(performance.now());
  }
  for (const [id, [name]] of Object.entries(weapons)) {
    const target = document.createElement('button');
    target.type = 'button'; target.dataset.role = id; target.textContent = name;
    target.append(document.createElement('small'));
    target.onclick = () => { role = id; previewLevel = null; result.textContent = ''; render(); };
    $('forge-roles').append(target);
  }
  for (const tab of looks.children) tab.onclick = () => {
    previewLevel = tab.value ? Number(tab.value) : null;
    render();
  };
  button.onclick = () => enhance(1);
  batch.onclick = () => enhance(Number(batch.dataset.limit));
  async function enhance(limit) {
    if (button.disabled) return;
    const selected = role, level = profile.levels[role] || 0;
    busy = true; previewLevel = null; result.textContent = ''; render();
    try {
      const attempt = await GameForge.enhance(selected, level, limit);
      profile = attempt.profile;
      const name = weapons[selected][1];
      const messages = {
        success: name + ' +' + (level+1) + ' 강화 성공!',
        failure: '강화 실패 · ' + name + ' +' + level + ' 유지',
        reset: '초기화 · ' + name + ' +' + level + ' → +0',
        changed: '무기 단계가 변경되었습니다. 다음 단계를 확인하세요.',
        max: '이미 최고 단계입니다.', poor: '미스릴이 부족합니다.'
      };
      result.dataset.outcome = attempt.status;
      result.textContent = messages[attempt.status] + (attempt.spent ? ' · ' + attempt.attempts + '회 / 미스릴 ' + attempt.spent + '개 소모' : '');
    } catch { result.textContent = '저장하지 못했습니다. 다시 시도해 주세요.'; }
    finally { busy = false; render(); }
  }
  async function open() {
    const sequence = ++request;
    previewLevel = null; result.textContent = ''; profile = null; render();
    try {
      const saved = await GameForge.read();
      if (sequence !== request) return;
      profile = saved;
      if (!busy && !profile.mithril) result.textContent = `층 클리어 보상 · 일반 ${GameForge.reward(1)}개 / 중간 보스 ${GameForge.reward(4)}개 / 최종 보스 ${GameForge.reward(9)}개`;
    } catch { result.textContent = '저장 데이터를 열지 못했습니다. 대장간에 다시 입장해 주세요.'; }
    render();
  }
  dialog.addEventListener('close', () => { request++; cancelAnimationFrame(raf); });
  document.addEventListener('visibilitychange', () => {
    if (dialog.open && dialog.classList.contains('at-forge') && !document.hidden && !busy) open();
  });
  window.TownForge = {open};
})();
