'use strict';
const details=document.getElementById('details');
document.getElementById('details-open').onclick=()=>details.showModal();
document.getElementById('details-close').onclick=()=>details.close();
// Keep the audio element and document alive across launch so the Play click unlocks sound.
const lobbyRealms=['Solea','Nokheim','Archeon','Verdan'];
const lobbyRealm=lobbyRealms[(lobbyRealms.indexOf(localStorage.getItem('foureign.web.lastLobbyRealm'))+1)%lobbyRealms.length];
const menuMusic=new Audio('/games/foureign/assets/kingdom-music/lobby-'+lobbyRealm.toLowerCase()+'.m4a');
menuMusic.preload='auto';menuMusic.loop=true;
let launching=false;
const launchEvents=new AbortController();
document.addEventListener('click',async event=>{
 const link=event.target.closest('a[href="/games/foureign/"]');
 if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();if(launching)return;launching=true;launchEvents.abort();
 menuMusic.volume=Math.max(0,Math.min(1,Number(localStorage.getItem('foureign.web.musicVolume')??.28)));
 if(localStorage.getItem('foureign.web.music')!=='off')menuMusic.play().catch(()=>{});
 window.FoureignMenuMusic=menuMusic;window.FoureignLobbyRealm=lobbyRealm;
 localStorage.setItem('foureign.web.lastLobbyRealm',lobbyRealm);
 if(details.open)details.close();
 const overlay=document.createElement('section');overlay.className='launch-loading';overlay.setAttribute('role','status');
 overlay.innerHTML='<img src="/games/foureign/assets/logo.webp" alt="FOUREIGN"><p>왕국으로 들어가고 있어요…</p>';
 document.body.append(overlay);
 try{
  const gameUrl=window.FoureignLayout.path(window.FoureignLayout.current);
  const response=await fetch(gameUrl,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('게임을 불러오지 못했어요.');
  const page=new DOMParser().parseFromString(await response.text(),'text/html');
  const scripts=[...page.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'));page.querySelectorAll('script').forEach(s=>s.remove());
  await Promise.all([...page.querySelectorAll('link[rel="stylesheet"]')].map(source=>new Promise((resolve,reject)=>{const style=document.createElement('link');style.rel='stylesheet';style.href=source.getAttribute('href');style.onload=resolve;style.onerror=()=>reject(Error('화면을 불러오지 못했어요.'));document.head.append(style);}))); 
  document.querySelector('link[href^="/platform.css"]')?.remove();
  document.querySelector('link[href^="/hero-carousel.css"]')?.remove();
  document.title=page.title;document.body.replaceChildren(...page.body.childNodes);history.pushState(null,'',gameUrl);
  window.addEventListener('popstate',()=>location.reload());
  for(const src of scripts)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(Error('게임 파일을 불러오지 못했어요.'));document.body.append(script);});
 }catch(error){menuMusic.pause();const status=document.getElementById('load-status')||overlay;status.textContent=error.message+' ';const retry=document.createElement('button');retry.textContent='다시 시도';retry.onclick=()=>location.assign(window.FoureignLayout.path(window.FoureignLayout.current));status.append(retry);}
},{signal:launchEvents.signal});
