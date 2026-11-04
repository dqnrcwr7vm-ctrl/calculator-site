/* The town wallet and equipped weapons belong to this browser, across expeditions. */
(() => {
  'use strict';
  const weapons = {
    hero: ['용사', '장검', '../characters/hero-complete-v1/idle/frame-01.webp'],
    dwarf: ['방패병', '철퇴', '../battle/assets/dwarf/00.webp'],
    archer: ['궁수', '활', '../battle/assets/archer/00.webp'],
    wizard: ['마법사', '수정 지팡이', '../battle/assets/wizard/00.webp'],
    priest: ['힐러', '기도의 지팡이', '../battle/assets/priest/00.webp'],
    mechanic: ['메카닉', '스패너', '../characters/mechanic-animations-v1/idle/frame-01.webp']
  };
  // Target level, first/last success %, per-attempt reset %, mithril per try.
  const bands = [
    [10, 100, 100, 0, 3],
    [30, 95, 70, 0, 5],
    [60, 65, 30, 0, 8],
    [80, 28, 14, 0, 12],
    [90, 13, 7, .25, 18],
    [95, 6, 4, .5, 24],
    [99, 3, 1.5, .75, 32],
    [100, 1, 1, 1, 50]
  ];
  const steps = [];
  for (const [end, first, last, reset, cost] of bands) {
    const start = steps.length + 1;
    for (let target = start; target <= end; target++) {
      const t = (target - start) / Math.max(1, end - start);
      const chance = Math.round((first + (last - first) * t) * 10) / 10;
      steps.push({chance, reset, hold: Math.round((100 - chance - reset) * 100) / 100, cost});
    }
  }
  function attackPercent(level) {
    // Compute in tenths of one percent so the forge and combat share exact milestones.
    if (level <= 30) return level / 10;
    if (level <= 60) return (30 + (level - 30) * 2) / 10;
    if (level <= 90) return (90 + (level - 60) * 5) / 10;
    if (level <= 99) return 24 + (level - 90) * 4;
    return 100;
  }
  const reward = floor => floor === 9 ? 600 : [4, 8].includes(floor) ? 300 : 0;
  let opening;
  function database() {
    if (!opening) opening = new Promise((resolve, reject) => {
      const request = indexedDB.open('dungeon-breaker-forge', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('wallet');
        request.result.createObjectStore('expeditions');
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); opening = null; };
        resolve(db);
      };
      request.onerror = () => reject(request.error);
    }).catch(error => { opening = null; throw error; });
    return opening;
  }

  // Serialize the balance, weapon level and floor receipt in one transaction,
  // including when another tab is collecting a reward or using the forge.
  async function transaction(stores, mode, work) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      const wallet = tx.objectStore('wallet');
      const load = wallet.get('player');
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error || new Error('저장 실패'));
      load.onsuccess = () => {
        const profile = load.result || {mithril: 0, levels: {}};
        work(profile, tx, value => { result = value; }, () => wallet.put(profile, 'player'));
      };
    });
  }

  function read() {
    return transaction(['wallet'], 'readonly', (profile, tx, done) => done(profile));
  }
  function enhance(role, expectedLevel, limit = 1) {
    return transaction(['wallet'], 'readwrite', (profile, tx, done, save) => {
      const level = profile.levels[role] || 0;
      const step = steps[level];
      let status, attempts = 0;
      if (!Object.hasOwn(weapons, role) || expectedLevel !== level) status = 'changed';
      else if (!step) status = 'max';
      else if (profile.mithril < step.cost) status = 'poor';
      else {
        // A batch retries only THIS step. Stop the moment the level changes.
        const cap = Number.isInteger(limit) ? Math.max(1, Math.min(10, limit)) : 1;
        const count = Math.min(cap, Math.floor(profile.mithril / step.cost));
        while (attempts < count) {
          attempts++;
          profile.mithril -= step.cost;
          const roll = Math.floor(Math.random() * 10000);
          if (roll < Math.round(step.chance * 100)) {
            profile.levels[role] = level + 1;
            status = 'success';
            break;
          }
          if (roll >= 10000 - Math.round(step.reset * 100)) {
            profile.levels[role] = 0;
            status = 'reset';
            break;
          }
          status = 'failure';
        }
        save();
      }
      done({status, attempts, spent: attempts * (step?.cost || 0), profile});
    });
  }
  function claim(expedition, floor) {
    if (!Number.isInteger(floor) || floor < 1 || floor > 9) throw new RangeError('층 범위 오류');
    return transaction(['wallet', 'expeditions'], 'readwrite', (profile, tx, done, save) => {
      const receipts = tx.objectStore('expeditions');
      const load = receipts.get(expedition);
      load.onsuccess = () => {
        const mask = load.result || 0, bit = 1 << (floor - 1);
        if (!(mask & bit)) {
          profile.mithril += reward(floor);
          receipts.put(mask | bit, expedition);
          save();
        }
        done(profile);
      };
    });
  }
  window.GameForge = {weapons, steps, attackPercent, reward, read, enhance, claim};
})();
