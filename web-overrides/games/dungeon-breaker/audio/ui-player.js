/* Approved jsfxr UI cues. Share the title host so navigation cannot cut them off. */
(() => {
  'use strict';
  const base = new URL('ui-jsfxr-v1/wav/', document.currentScript.src);
  const forgeCues = new Map([
    ['forge-hammer', new URL('forge-anvil-v1/hammer.wav', document.currentScript.src)],
    ['forge-success', new URL('forge-result-v1/success.wav', document.currentScript.src)],
    ['forge-failure', new URL('forge-result-v2/failure.wav', document.currentScript.src)]
  ]);
  let shared;
  try { if (parent !== window && parent.GameScreen?.ownsFrame(window)) shared = parent.DungeonUIAudio; } catch {}
  if (!shared) {
    let settings = { muted: false, volume: .8 }, context, gain, epoch = 0;
    const buffers = new Map(), pending = new Map(), active = new Set();
    const names = ['move', 'confirm', 'enter', 'cancel', 'unavailable', 'reward'];
    try { const s=JSON.parse(localStorage.getItem('dungeon-breaker-ui-audio')||'{}'); settings.muted=!!s.muted; if(Number.isFinite(s.volume))settings.volume=Math.max(0,Math.min(1,s.volume)); } catch {}
    function unlock() {
      if (!context) { const AudioContext=window.AudioContext||window.webkitAudioContext; if(!AudioContext)return; context=new AudioContext(); gain=context.createGain(); gain.connect(context.destination); gain.gain.value=settings.muted?0:settings.volume; }
      if(context.state==='suspended')context.resume().catch(()=>{});
    }
    function load(name) {
      if(buffers.has(name))return Promise.resolve(buffers.get(name));
      if(!pending.has(name))pending.set(name,fetch(forgeCues.get(name)||new URL('ui-'+name+'.wav',base)).then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).then(b=>{buffers.set(name,b);return b;}).catch(()=>null).finally(()=>pending.delete(name)));
      return pending.get(name);
    }
    let lastMove=-Infinity;
    shared={unlock, get settings(){return {...settings};}, setSettings(next){settings={...settings,...next};settings.volume=Math.max(0,Math.min(1,settings.volume));if(gain)gain.gain.value=settings.muted?0:settings.volume;try{localStorage.setItem('dungeon-breaker-ui-audio',JSON.stringify(settings));}catch{}},
      prepare(name){if(forgeCues.has(name)){unlock();if(context)return load(name);}},
      play(name){if((!forgeCues.has(name)&&!names.includes(name))||settings.muted||!settings.volume||document.hidden)return;unlock();if(!context)return;const at=performance.now(),ticket=epoch;if(name==='move'&&at-lastMove<75)return;if(name==='move')lastMove=at;
        load(name).then(buffer=>{if(!buffer||ticket!==epoch||performance.now()-at>400||settings.muted||document.hidden)return;const s=context.createBufferSource();s.buffer=buffer;s.connect(gain);active.add(s);s.onended=()=>active.delete(s);s.start();document.documentElement.dataset.uiSound=name;document.documentElement.dataset.uiSoundCount=String(+(document.documentElement.dataset.uiSoundCount||0)+1);window.dispatchEvent(new CustomEvent('uisoundplayed',{detail:{name}}));});},
      stop(){epoch++;active.forEach(s=>{try{s.stop();}catch{}});active.clear();}
    };
    document.addEventListener('visibilitychange',()=>{if(document.hidden)shared.stop();});
    document.addEventListener('pointerdown',()=>{unlock();if(context)names.forEach(load);},{capture:true,once:true});
    document.addEventListener('keydown',()=>{unlock();if(context)names.forEach(load);},{capture:true,once:true});
  }
  window.DungeonUIAudio=shared;
  const selector='button,a[href],input[type=checkbox],input[type=range],select,[role=button]';
  let lastElement=null, navigationKey=false, activating=false;
  const control=e=>e.target.closest?.(selector);
  const usable=el=>el&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'&&!el.closest('[inert],[hidden]');
  function move(el){if(!usable(el)||el===lastElement)return;lastElement=el;shared.play('move');}
  document.addEventListener('pointerdown',()=>{shared.unlock();activating=true;},{capture:true});
  document.addEventListener('pointerover',e=>{if(e.pointerType==='mouse'&&!activating)move(control(e));});
  document.addEventListener('pointerup',()=>{setTimeout(()=>activating=false,0);},{capture:true});
  document.addEventListener('pointercancel',()=>{activating=false;});
  document.addEventListener('keydown',e=>{shared.unlock();navigationKey=['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key);},{capture:true});
  document.addEventListener('keyup',()=>{navigationKey=false;});
  document.addEventListener('focusin',e=>{if(navigationKey&&!activating)move(control(e));});
  document.addEventListener('change',e=>{if(e.target.matches('select,input[type=checkbox]'))shared.play('confirm');});
  document.addEventListener('click',e=>{
    const el=control(e);if(!usable(el)||e.button>0||e.metaKey||e.ctrlKey||e.altKey||e.shiftKey||el.matches('input,select'))return;
    lastElement=el;navigationKey=false;
    const label=(el.getAttribute('aria-label')||el.textContent||'').trim();
    const explicit=el.dataset.uiSound;
    const cue=explicit||(/취소|닫기|돌아가기|계속하기/.test(label)||el.matches('[data-close],.close,.return,[value=cancel],.target-pending')?'cancel':el.matches('a[href]')||/입장|시작|진입|스킬 선택으로/.test(label)?'enter':'confirm');
    shared.play(cue);
  },{capture:true});
  // A cancelled native/dialog Escape is still a close action; unrelated Escape is silent.
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('dialog[open],.dossier:not([hidden]),#target-prompt:not([hidden])'))shared.play('cancel');},{capture:true});
  const enabled=document.querySelector('#effects-enabled'),volume=document.querySelector('#effects-volume'),value=document.querySelector('#effects-value');
  if(enabled){enabled.checked=!shared.settings.muted;volume.value=Math.round(shared.settings.volume*100);value.textContent=volume.value+'%';enabled.addEventListener('change',()=>shared.setSettings({muted:!enabled.checked}));volume.addEventListener('input',()=>{shared.setSettings({volume:+volume.value/100});value.textContent=volume.value+'%';});volume.addEventListener('change',()=>shared.play('confirm'));}
})();
