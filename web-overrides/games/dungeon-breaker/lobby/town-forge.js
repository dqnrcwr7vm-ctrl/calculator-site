(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dialog = $('facility-dialog'), panel = $('forge-panel'), target = $('target');
  const head = $('smith-result'), banner = $('strike-result');
  let profile, role = null, stage = 'welcome', busy = false, session = 0, problem = '';
  let finalTimer, pop;
  function weaponName(id, level) {
    return level === GameForge.steps.length ? WeaponGlow.ascendedNames[id] : GameForge.weapons[id][1];
  }
  function label(id) {
    const level = profile.levels[id] || 0;
    return '+' + level + ' ' + weaponName(id, level);
  }
  const auto = createForgeAuto({
    dialog, panel, state: () => ({role, profile, busy}), attempt: () => attempt(true),
    render, interval: 0, onFinish: finishAuto
  });

  function showSmith(working) {
    if (dialog.classList.contains('at-anvil') === working) return;
    dialog.classList.toggle('at-anvil', working);
    $('forge-motion').setAttribute('aria-label', working ? '모루에서 무기를 강화하는 대장장이' : '화덕 앞의 대장장이');
    TownForgeScene.show(!working);
  }
  function choose(next, id = null) {
    if (auto.active || busy) return;
    stage = next;
    role = id;
    problem = $('announce').textContent = $('forge-auto-status').textContent = '';
    showSmith(false);
    if (role) target.value = Math.min(100, (profile.levels[role] || 0) + 1);
    render();
    $('forge-line').focus({preventScroll:true});
  }
  function render() {
    const working = stage === 'auto' || stage === 'manual';
    $('forge-greeting').hidden = working || stage === 'result';
    banner.hidden = stage !== 'result';
    $('result-done').disabled = busy;
    $('stop').hidden = stage !== 'auto' || !auto.active;
    $('stop').disabled = auto.stopping;
    $('welcome').hidden = stage !== 'welcome';
    panel.hidden = $('purse').hidden = stage === 'welcome';
    $('weapons').hidden = stage !== 'weapons';
    $('order').hidden = stage !== 'order';
    $('balance').textContent = profile?.mithril ?? '—';
    $('back').textContent = role ? '무기 다시 선택' : '뒤로';
    for (const b of $('weapons').children) {
      const id = b.dataset.weapon, level = profile?.levels[id] || 0;
      b.firstElementChild.textContent = '+' + level;
      b.lastChild.textContent = ' ' + weaponName(id, level);
      b.setAttribute('aria-label', GameForge.weapons[id][0] + ' · ' + weaponName(id, level) + ' +' + level);
      b.disabled = !profile;
    }
    if (working || stage === 'result') return;
    if (!role) {
      $('forge-line').textContent = stage === 'welcome' ? '어서 와! 오늘은 어떤 무기를 강화해줄까?' : '어떤 무기를 강화할까?';
      return;
    }
    const level = profile.levels[role] || 0, step = GameForge.steps[level], goal = target.valueAsNumber;
    target.min = Math.min(100, level + 1);
    target.disabled = !step;
    $('lower').disabled = !step || goal <= level + 1;
    $('higher').disabled = !step || goal >= 100;
    $('forge-line').textContent = step ? label(role) + ', 몇 강까지 강화해줄까?' : label(role) + ' · 이미 최고 단계야.';
    $('terms').textContent = !step ? '최고 강화 단계에 도달했습니다.' : '1회 미스릴 ' + step.cost + '개  ·  성공 ' + step.chance + '%' +
      (step.reset ? '  ·  +0 초기화 ' + step.reset + '%' : '') +
      (profile.mithril < step.cost ? '  ·  미스릴 부족' : target.value && !target.validity.valid ? '  ·  목표 +' + (level + 1) + '~+100' :
       level < 80 && goal > 80 ? '  ·  +80에서 위험 구간 진입 전 중지' : '');
    $('terms').classList.toggle('risk', !!step?.reset);
    $('manual').disabled = !step || profile.mithril < step.cost;
    $('start').disabled = $('manual').disabled || !target.validity.valid;
  }
  function showResult(title, tone, note) {
    if (!dialog.open) return;
    stage = 'result';
    head.hidden = true;
    banner.dataset.tone = tone;
    $('result-heading').textContent = title;
    $('result-weapon').textContent = label(role);
    $('result-note').textContent = note;
    $('announce').textContent = [title, label(role), note].filter(Boolean).join(' · ');
    render();
    if (!busy) $('result-done').focus({preventScroll:true});
  }
  function showHit(status) {
    const success = status === 'success';
    head.dataset.tone = success ? 'success' : 'failure';
    head.firstElementChild.textContent = success ? '성공!' : '실패 ㅠ';
    head.lastElementChild.textContent = label(role);
    head.hidden = false;
    // Repeat the small bounce even for consecutive identical rolls.
    pop?.cancel();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pop = head.animate([{translate:'0 4px', opacity:.8}, {translate:'0 0', opacity:1}], {duration:160});
    }
    $('announce').textContent = head.firstElementChild.textContent + ' ' + label(role);
  }
  function finishAuto(reason, run) {
    if (!dialog.open) return;
    const note = (problem || reason) + ' · ' + run.count + '회 시도';
    // Keep the last impact over the smith long enough to read before the recap.
    finalTimer = setTimeout(() => showResult('최종 결과', 'final', note), head.hidden ? 0 : 520);
  }
  async function attempt(automatic) {
    if (!role || busy || !dialog.open || document.hidden) return;
    const ticket = session, selected = role, level = profile.levels[selected] || 0;
    const current = () => ticket === session && dialog.open;
    let roll;
    busy = true;
    stage = automatic ? 'auto' : 'manual';
    showSmith(true);
    render();
    if (automatic && head.hidden) $('stop').focus({preventScroll:true});
    async function resolveHit() {
      try {
        const result = await GameForge.enhance(selected, level, 1);
        if (!current()) return result;
        profile = result.profile;
        if (result.attempts && !document.hidden) {
          window.DungeonUIAudio?.play(result.status === 'success' ? 'forge-success' : 'forge-failure');
        }
        if (!result.attempts) {
          problem = {poor:'미스릴이 부족해.', changed:'무기 단계가 변경되었어.', max:'이미 최고 단계야.'}[result.status];
        } else if (automatic) {
          showHit(result.status);
        } else {
          const success = result.status === 'success';
          const note = {success:'', failure:'강화 단계 유지', reset:'강화 단계 초기화'}[result.status];
          showResult(success ? '성공!' : '실패!', success ? 'success' : 'failure', note);
        }
        return result;
      } catch {
        problem = '강화 결과를 저장하지 못했어. 다시 시도해 줘.';
      }
    }
    try {
      await TownForgeScene.hammer(automatic ? 1 : 3, () => {
        if (current() && !document.hidden && !(automatic && auto.stopping)) roll = resolveHit();
      });
      return await roll;
    } finally {
      if (current()) {
        busy = false;
        if (!automatic && stage !== 'result') {
          stage = 'order';
          $('forge-auto-status').textContent = problem || '강화가 중단되었어.';
        }
        render();
        if (stage === 'result') $('result-done').focus({preventScroll:true});
      }
    }
  }
  for (const [id, weapon] of Object.entries(GameForge.weapons)) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.weapon = id;
    b.append(document.createElement('b'), document.createTextNode(' ' + weapon[1]));
    b.onclick = () => choose('order', id);
    $('weapons').append(b);
  }
  $('forge-enter').onclick = () => choose('weapons');
  $('back').onclick = () => {
    const previous = role;
    choose(role ? 'weapons' : 'welcome');
    (previous ? $('weapons').querySelector('[data-weapon="'+previous+'"]') : $('forge-enter')).focus({preventScroll:true});
  };
  for (const b of dialog.querySelectorAll('[data-exit]')) b.onclick = () => dialog.close();
  target.oninput = render;
  for (const [id, delta] of [['lower',-1],['higher',1]]) $(id).onclick = () => {
    const min = Number(target.min);
    target.value = Math.min(100, Math.max(min, Number.isInteger(target.valueAsNumber) ? target.valueAsNumber + delta : min));
    render();
  };
  $('manual').onclick = () => { problem = ''; attempt(false); };
  $('start').onclick = () => {
    if ($('start').disabled || !target.reportValidity()) return;
    problem = '';
    auto.start(target.valueAsNumber);
  };
  $('stop').onclick = () => { auto.stop(); TownForgeScene.cancelHammer(); };
  $('result-done').onclick = () => {
    stage = 'order';
    const minimum = Math.min(100, (profile.levels[role] || 0) + 1);
    if (target.valueAsNumber < minimum) target.value = minimum;
    $('forge-auto-status').textContent = '';
    showSmith(false); render(); $('forge-line').focus({preventScroll:true});
  };
  dialog.addEventListener('close', () => {
    session++; clearTimeout(finalTimer); location.replace(new URL('town.html',document.baseURI));
  });
  dialog.showModal(); TownForgeScene.show(true); render();
  GameForge.read().then(saved => {profile = saved; render();}).catch(() => {
    $('forge-line').textContent = '미스릴을 불러오지 못했어. 다시 열어 줘.';
  });
})();
