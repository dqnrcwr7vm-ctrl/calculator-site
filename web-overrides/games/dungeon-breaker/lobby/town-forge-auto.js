/* Each automatic attempt uses a single weapon transaction. */
'use strict';
window.createForgeAuto = function ({dialog, panel, state, attempt, render, onFinish, interval = 650}) {
  const status = document.getElementById('forge-auto-status');
  let run = null, timer = 0;
  function visible() { return dialog.open && !panel.hidden && !document.hidden; }
  function progress(r) {
    return r.count + '회 시도 · 미스릴 ' + r.spent + '개 소모';
  }
  function finish(r, reason) {
    clearTimeout(timer);
    run = null;
    status.textContent = reason + ' · ' + progress(r);
    onFinish?.(reason, r);
    render();
  }
  function stop(reason = '자동 강화 중지') {
    if (!run) return;
    clearTimeout(timer);
    if (run.pending) {
      run.reason = reason;
      status.textContent = '현재 시도를 마치면 중지합니다.';
      render();
    } else finish(run, reason);
  }
  async function next(r) {
    if (r !== run) return;
    if (!visible()) { stop('대장간을 벗어나 중지'); return; }
    r.pending = true;
    let result;
    try { result = await attempt(); }
    catch { /* An uncommitted attempt is not counted. */ }
    r.pending = false;
    if (result) { r.count += result.attempts; r.spent += result.spent; }
    if (r.reason) { finish(r, r.reason); return; }
    if (!result) { finish(r, '자동 강화 중지'); return; }
    const level = result.profile.levels[r.role] || 0;
    if (result.status === 'reset') { finish(r, '무기가 +0으로 초기화되어 중지'); return; }
    if (result.status === 'changed' || state().role !== r.role) { finish(r, '무기 단계가 변경되어 중지'); return; }
    if (level >= r.goal) { finish(r, '목표 +' + r.goal + ' 달성'); return; }
    // Do not cross from the safe band into a reset-risk attempt unattended.
    if (r.start < 80 && level >= 80) { finish(r, '+80 도달 · 초기화 위험을 확인한 뒤 다시 시작하세요'); return; }
    if (result.profile.mithril < GameForge.steps[level].cost) { finish(r, '미스릴 부족으로 중지'); return; }
    if (!visible()) { finish(r, '대장간을 벗어나 중지'); return; }
    status.textContent = '자동 강화 중 · 목표 +' + r.goal + ' · ' + progress(r);
    timer = setTimeout(() => next(r), interval);
  }
  function start(target) {
    const {role, profile, busy} = state();
    if (run || !role || !profile || busy || !visible()) return;
    const level = profile.levels[role] || 0;
    if (!Number.isInteger(target) || target <= level || target > 100 || profile.mithril < GameForge.steps[level].cost) return;
    run = {role, start:level, goal:target, count:0, spent:0, pending:false, reason:''};
    status.textContent = '자동 강화 시작 · 목표 +' + target;
    render();
    next(run);
  }
  dialog.addEventListener('close', () => stop('대장간을 닫아 중지'));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop('화면을 벗어나 중지'); });
  window.addEventListener('pagehide', () => stop('화면을 벗어나 중지'));
  return {get active(){return !!run;}, get stopping(){return !!run?.reason;}, start, stop};
};
