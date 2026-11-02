/* Visible before campaign scripts/assets; removed only after the draft is usable. */
(()=>{
 const gameRoot=new URL('../',document.currentScript.src);
 const gameScript=src=>{try{const url=new URL(src,location.href);return url.origin===gameRoot.origin&&url.pathname.startsWith(gameRoot.pathname);}catch{return false;}};
 const barStyle=document.createElement('link');barStyle.rel='stylesheet';barStyle.href=new URL('loading-bar.css?v=battle-progress-20261102',document.currentScript.src).href;document.head.append(barStyle);
 const style=document.createElement('style');style.textContent=`#entry-loading{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#090810;color:#f6e6b6;font:18px system-ui,sans-serif;text-align:center;padding:24px;box-sizing:border-box}#entry-loading[hidden]{display:none}#entry-loading section{width:min(420px,90vw)}#entry-loading h1{font-size:26px;color:#e9c475}#entry-loading progress{width:100%;height:12px;accent-color:#c7a65c;margin:20px 0}#entry-loading p{line-height:1.7}#entry-loading button,#entry-loading a{display:inline-block;margin:8px;padding:12px 18px;color:#ffe5a4;background:#282035;border:1px solid #92764a;border-radius:6px;text-decoration:none;font:inherit}#entry-loading small{color:#b8aec5}`;document.head.append(style);
 const panel=document.createElement('div');panel.id='entry-loading';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','게임을 준비하고 있습니다');panel.innerHTML='<section><h1 role="status" aria-live="polite">게임을 준비하고 있습니다</h1><div class="game-loading-track" role="progressbar" aria-label="불러오는 중" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="game-loading-fill"></span></div><small class="loading-count" role="status">0%</small><p hidden></p><div class="recovery" hidden><button type="button">다시 불러오기</button><a href="normal-entry.html">캐릭터 선택으로</a></div></section>';document.documentElement.append(panel);
 const status=panel.querySelector('p'),recovery=panel.querySelector('.recovery'),bar=panel.querySelector('.game-loading-track');let done=false,failed=false,completed=0,total=0;
 panel.querySelector('button').onclick=()=>location.reload();
 const block=e=>{if(!done&&!panel.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}};
 let ticker,timeout;
 function progress(){const percent=total?Math.min(100,Math.floor(completed/total*100)):0;bar.setAttribute('aria-valuenow',String(percent));bar.querySelector('span').style.width=percent+'%';panel.querySelector('.loading-count').textContent=total?`${percent}% · ${completed.toLocaleString()} / ${total.toLocaleString()} 준비 완료`:'0% · 필요한 파일 확인 중';}
 function plan(count){total=count;completed=0;progress();}
 function loaded(){completed++;progress();}
 function begin(mode){
  const title=mode==='floor'||Number(new URLSearchParams(location.search).get('floor'))>1?'다음 층으로 이동 중입니다':'게임을 준비하고 있습니다';
  done=false;failed=false;completed=0;total=0;progress();clearInterval(ticker);clearTimeout(timeout);
  panel.hidden=false;panel.querySelector('h1').textContent=title;panel.setAttribute('aria-label',title);
  status.hidden=true;status.textContent='';recovery.hidden=true;bar.hidden=false;panel.setAttribute('aria-busy','true');
  document.addEventListener('keydown',block,true);document.addEventListener('click',block,true);
  timeout=setTimeout(()=>{if(!done&&!failed){recovery.hidden=false;status.hidden=false;status.textContent='파일을 계속 불러오고 있습니다. 연결이 느리면 시간이 더 걸릴 수 있습니다.';}},60000);
 }
 begin();
 function fail(error){if(done)return;if(error)console.error('Game loading failed',error); failed=true;bar.hidden=true;panel.setAttribute('aria-busy','false');clearInterval(ticker);clearTimeout(timeout);status.hidden=false;status.textContent='게임을 불러오지 못했습니다. 다시 시도해 주세요.';recovery.hidden=false;}
 // Hosting analytics/extensions are not dependencies of the game.
 window.addEventListener('error',e=>{
  if(e.target?.tagName==='SCRIPT'&&gameScript(e.target.src))fail(new Error('Script load failed: '+e.target.src));
  else if(e.error&&(!e.filename||gameScript(e.filename)))fail(e.error);
 },true);
 window.EntryLoading={begin,get active(){return !done;},plan,loaded,fail,async finish(){
  if(failed)return;
  const overlay=document.querySelector('#loot-overlay');
  if(document.documentElement.classList.contains('initial-draft')&&(!overlay||overlay.hidden||!overlay.querySelector('.draft-card')))throw new Error('Skill draft was not mounted');
  const urls=new Set();
  if(overlay&&!overlay.hidden)for(const el of overlay.querySelectorAll('.draft-card,.draft-skill-icon')){
   for(const match of getComputedStyle(el).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g))urls.add(match[1]);
  }
  if(overlay&&!overlay.hidden)urls.add(new URL('skill-draft/selected-transparent-v1/selected.webp',location.href).href);
  if(!total)plan(urls.size+1);
  await Promise.all([...urls].map(async src=>{await window.GameImages.ready(src);loaded();}));
  await Promise.all([...document.querySelectorAll('#loot-overlay img')].map(im=>window.GameImages.ready(im.currentSrc||im.src)));
  if(document.fonts)await document.fonts.ready;
  loaded();
  if(failed)return;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  completed=total;progress();
  done=true;panel.setAttribute('aria-busy','false');clearInterval(ticker);clearTimeout(timeout);panel.hidden=true;document.removeEventListener('keydown',block,true);document.removeEventListener('click',block,true);
  overlay?.querySelector('.draft-card')?.focus({preventScroll:true});
 }};
})();
