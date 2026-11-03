(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dialog = $('facility-dialog'), panel = $('forge-panel');
  const button = $('forge-submit'), mode = $('forge-auto'), goal = $('forge-auto-target');
  const result = $('forge-result'), outcome = $('forge-outcome');
  const {weapons, steps, attackPercent} = GameForge;
  let role = null, profile, request = 0, busy = false;
  const auto = createForgeAuto({dialog, panel, state: () => ({role, profile, busy}), attempt: enhance, render});

  function clearResult() {
    result.textContent = outcome.textContent = $('forge-auto-status').textContent = '';
    delete result.dataset.outcome;
    delete outcome.dataset.outcome;
  }
  function weaponName(id, level) {
    return level === steps.length ? WeaponGlow.ascendedNames[id] : weapons[id][1];
  }
  function render() {
    $('forge-balance').textContent = profile?.mithril ?? '—';
    $('forge-picker').hidden = role !== null;
    $('forge-order').hidden = role === null;
    $('forge-stage').textContent = role ? '02 / 02' : '01 / 02';
    for (const item of $('forge-roles').children) {
      const id = item.dataset.role, level = profile?.levels[id] || 0;
      item.querySelector('strong').textContent = weaponName(id, level);
      item.querySelector('b').textContent = '+' + level;
      item.disabled = !profile;
    }
    if (!role) return;
    const level = profile?.levels[role] || 0, step = steps[level], locked = busy || auto.active;
    $('forge-weapon').textContent = weaponName(role, level) + ' +' + level;
    $('forge-change').disabled = locked;
    goal.min = Math.min(100, level + 1);
    goal.disabled = mode.disabled = locked || !step;
    $('forge-mode-help').textContent = mode.checked ? '선택한 목표까지 한 번씩 시도합니다.' : '한 번 눌러 다음 단계에 한 번 도전합니다.';
    $('forge-step').textContent = step ? '이번 시도  +' + level + ' → +' + (level + 1) : '최고 단계 달성';
    $('forge-cost').textContent = step ? '미스릴 ' + step.cost + '개' : '—';
    $('forge-attack').textContent = '+' + attackPercent(level) + '%' + (step ? ' → +' + attackPercent(level + 1) + '%' : '');
    $('forge-chance').textContent = step ? step.chance + '%' : '—';
    $('forge-hold').textContent = step ? step.hold + '%' : '—';
    $('forge-reset').textContent = step ? step.reset + '%' : '—';
    $('forge-reset').classList.toggle('at-risk', !!step?.reset);
    const poor = step && profile && profile.mithril < step.cost;
    const rule = $('forge-rule');
    rule.classList.toggle('at-risk', !!step?.reset);
    rule.textContent = !step ? '최종 외형 각성 · 공격 피해 2배' : poor ? '미스릴 ' + (step.cost - profile.mithril) + '개가 더 필요합니다.' :
      step.reset ? '이번 시도에서 이 무기가 +0이 될 확률은 ' + step.reset + '%입니다.' :
      mode.checked && goal.valueAsNumber > 80 ? '+80에 도달하면 초기화 위험 구간에 들어가기 전에 멈춥니다.' : '';
    button.disabled = auto.active ? auto.stopping : busy || !profile || !step || poor || !goal.validity.valid;
    button.toggleAttribute('data-running', auto.active);
    button.textContent = auto.active ? (auto.stopping ? '중지 중…' : '자동 강화 중지') : busy ? '망치질 중…' : '강화하기';
  }

  for (const [id,[owner]] of Object.entries(weapons)) {
    const item = document.createElement('button');
    item.type = 'button'; item.dataset.role = id;
    const name = document.createElement('strong'), ownerLabel = document.createElement('small');
    ownerLabel.textContent = owner;
    item.append(name, ownerLabel, document.createElement('b'));
    item.onclick = () => {
      if (!profile || busy || auto.active) return;
      role = id; mode.checked = false;
      goal.value = Math.min(100, (profile.levels[id] || 0) + 1);
      clearResult(); render();
      $('forge-weapon').focus({preventScroll:true});
    };
    $('forge-roles').append(item);
  }
  $('forge-change').onclick = () => {
    if (busy || auto.active) return;
    const previous = role; role = null; clearResult(); render();
    $('forge-roles').querySelector('[data-role="'+previous+'"]').focus({preventScroll:true});
  };
  goal.oninput = mode.onchange = render;
  button.onclick = () => {
    if (auto.active) { auto.stop(); return; }
    if (!role || button.disabled || !goal.reportValidity()) return;
    $('forge-auto-status').textContent = '';
    dialog.scrollTop = 0;
    if (mode.checked) auto.start(goal.valueAsNumber);
    else enhance();
  };

  async function enhance() {
    if (busy || !role || !profile || !dialog.open || panel.hidden || document.hidden) return;
    const sequence = request, selected = role, level = profile.levels[role] || 0;
    busy = true;
    result.textContent = outcome.textContent = '';
    delete result.dataset.outcome; delete outcome.dataset.outcome;
    render();
    try {
      const attempt = await GameForge.enhance(selected, level, 1);
      if (sequence !== request || !dialog.open) return attempt;
      if (attempt.attempts) await TownForgeScene.hammerThree();
      if (sequence !== request || !dialog.open) return attempt;
      profile = attempt.profile;
      const now = profile.levels[selected] || 0, name = weaponName(selected, now);
      const headline = attempt.status === 'success' ? '강화 성공!!' : '강화 실패ㅠㅠ';
      const messages = {
        success: headline + ' · ' + name + ' +' + now,
        failure: headline + ' · ' + name + ' +' + level + ' 유지',
        reset: headline + ' · ' + name + ' +' + level + ' → +0',
        changed: '무기 단계가 변경되었습니다. 다음 단계를 확인하세요.',
        max: '이미 최고 단계입니다.', poor: '미스릴이 부족합니다.'
      };
      if (attempt.attempts) {
        outcome.dataset.outcome = attempt.status;
        outcome.textContent = headline;
      }
      result.dataset.outcome = attempt.status;
      result.textContent = messages[attempt.status] + (attempt.spent ? ' · 미스릴 ' + attempt.spent + '개 소모' : '');
      if (!auto.active && goal.valueAsNumber <= now) goal.value = Math.min(100, now + 1);
      return attempt;
    } catch { if (sequence === request) result.textContent = '저장하지 못했습니다. 다시 시도해 주세요.'; }
    finally { if (sequence === request) { busy = false; render(); } }
  }
  async function readProfile() {
    const sequence = ++request;
    try {
      const saved = await GameForge.read();
      if (sequence !== request) return;
      profile = saved;
      render();
    } catch { if (sequence === request) result.textContent = '저장 데이터를 열지 못했습니다. 대장간에 다시 입장해 주세요.'; }
  }
  function open() {
    role = null; profile = null; mode.checked = false; clearResult(); render(); readProfile();
  }
  dialog.addEventListener('close', () => { request++; busy = false; clearResult(); });
  document.addEventListener('visibilitychange', () => {
    if (dialog.open && !panel.hidden && !document.hidden && !busy && !auto.active) readProfile();
  });
  window.TownForge = {open};
})();
