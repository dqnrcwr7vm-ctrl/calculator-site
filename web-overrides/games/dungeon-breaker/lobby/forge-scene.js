/* Native pixels for the forge artwork; CSS crops this plane together with the room. */
(() => {
  'use strict';
  const dialog = document.getElementById('facility-dialog');
  const canvas = document.getElementById('forge-motion');
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const poses = [210, 160, 180, 60, 100, 140];
  let art, loading, welcome = true, swing, raf = 0, lastTime, session = 0;
  let lastFire = -1, lastPose = -1;

  function loadArt() {
    if (!loading) {
      const paths = ['assets/forge-v1/hearth-flames.webp', 'assets/forge-v1/workroom.webp',
        '../imagegen/town-forge-hot-iron-v1/hammer-sheet.webp'];
      loading = Promise.all(paths.map(async path => {
        const image = new Image();
        image.src = path;
        await image.decode();
        return image;
      })).then(images => { art = images; }).catch(() => { loading = null; });
    }
    return loading;
  }
  function paint(fire, pose) {
    if (!art || (fire === lastFire && pose === lastPose)) return;
    lastFire = fire; lastPose = pose;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    const [flames, room, smith] = art;
    if (!welcome) ctx.drawImage(room, 0, 0);
    // The coals in front partly obscure the flame's baseline.
    const [x,y,w,h] = welcome ? [46,92,63,51] : [34,71,48,43];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x,y); ctx.lineTo(x+w,y); ctx.lineTo(x+w,y+h);
    ctx.lineTo(x+w*.78,y+h-2); ctx.lineTo(x+w*.63,y+h-1);
    ctx.lineTo(x+w*.50,y+h-4); ctx.lineTo(x+w*.35,y+h-2);
    ctx.lineTo(x+w*.2,y+h-3); ctx.lineTo(x,y+h); ctx.closePath(); ctx.clip();
    ctx.drawImage(flames, fire%3*64, Math.floor(fire/3)*33, 64,33, x,y,w,h);
    ctx.restore();
    if (!welcome) ctx.drawImage(smith, pose%3*128, Math.floor(pose/3)*128, 128,128, 142,101,128,128);
  }
  function finish() {
    const finished = swing;
    swing = null;
    finished?.resolve();
  }
  function tick(time) {
    raf = 0;
    if (!dialog.open || !dialog.classList.contains('at-forge') || document.hidden) return;
    let strike = false;
    if (swing) {
      // Keep each authored impact visible even after a slow paint.
      swing.elapsed += Math.min(50, time - (lastTime ?? time));
      const duration = poses[swing.frame];
      if (swing.elapsed >= duration) {
        swing.elapsed -= duration;
        swing.frame++;
        if (swing.frame === poses.length) {
          swing.frame = 0;
          if (++swing.completed === swing.total) finish();
        } else if (swing.frame === 4) strike = true;
      }
    }
    lastTime = time;
    paint(reduced.matches ? 0 : Math.floor(time/115)%6, swing?.frame ?? 0);
    if (strike) {
      window.DungeonUIAudio?.play('forge-hammer');
      if (swing.completed + 1 === swing.total) swing.onLastImpact?.();
    }
    if (swing || !reduced.matches) raf = requestAnimationFrame(tick);
  }
  function restart() {
    cancelAnimationFrame(raf);
    lastTime = undefined;
    raf = requestAnimationFrame(tick);
  }
  function show(isWelcome) {
    session++;
    welcome = isWelcome;
    canvas.width = welcome ? 400 : 384;
    canvas.height = welcome ? 320 : 256;
    lastFire = lastPose = -1;
    loadArt().then(restart);
    window.DungeonUIAudio?.prepare?.('forge-hammer');
  }
  async function hammer(total, onLastImpact) {
    const current = session;
    await loadArt();
    if (current !== session || !art || !dialog.open || welcome || swing || (onLastImpact && document.hidden)) return;
    await new Promise(resolve => {
      swing = {frame:0, elapsed:0, completed:0, total, onLastImpact, resolve};
      restart();
    });
  }
  dialog.addEventListener('close', () => { session++; cancelAnimationFrame(raf); finish(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && swing?.onLastImpact) finish();
    restart();
  });
  reduced.addEventListener('change', restart);
  function cancelHammer() {
    session++; // Also cancel a swing still waiting for its artwork to load.
    finish();
  }
  window.TownForgeScene = {show, hammerThree: () => hammer(3), hammer, cancelHammer};
})();
