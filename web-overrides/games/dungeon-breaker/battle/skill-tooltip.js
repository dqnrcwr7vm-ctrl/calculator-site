/* Shared combat skill help: hover/focus or a touch/pen hold, never cast on hold. */
(()=>{
 const grid=document.querySelector('.command-grid');if(!grid)return;
 const tip=document.createElement('aside');tip.id='combat-skill-tooltip';tip.className='combat-skill-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;tip.innerHTML='<strong></strong><p></p>';document.body.append(tip);
 let shown=null,press=null,timer=null,suppress=null;
 const button=target=>target instanceof Element?target.closest('.command-grid button[data-action]'):null;
 function info(b){const id=b.dataset.action,role=window.BATTLE_ASSETS?.[Number(grid.dataset.owner||0)]?.id;
  const entry=window.PartyBasicActions?.specs[id]||window.SkillDraftData?.catalog(role).find(s=>s.id===id)||window.PartyMechanic?.specs[id]||window.DwarfSkills?.skills.find(s=>s.id===id);
  return {name:entry?.name||b.textContent.replace(/[0-9]/g,'').trim(),description:window.SkillDraftData?.describeSelection(role,{...entry,id})||'이 스킬을 사용합니다.'};
 }
 function hide(){if(shown){const ids=(shown.getAttribute('aria-describedby')||'').split(' ').filter(id=>id&&id!==tip.id);if(ids.length)shown.setAttribute('aria-describedby',ids.join(' '));else shown.removeAttribute('aria-describedby');}shown=null;tip.hidden=true;}
 function cancelTimer(){clearTimeout(timer);timer=null;}
 function show(b){hide();const data=info(b);tip.querySelector('strong').textContent=data.name;tip.querySelector('p').textContent=data.description;shown=b;b.setAttribute('aria-describedby',((b.getAttribute('aria-describedby')||'')+' '+tip.id).trim());tip.hidden=false;tip.style.left='0px';tip.style.top='0px';const r=b.getBoundingClientRect(),t=tip.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(innerWidth-t.width-8,r.left+r.width/2-t.width/2))+'px';tip.style.top=Math.max(8,Math.min(innerHeight-t.height-8,r.top-t.height-10>=8?r.top-t.height-10:r.bottom+10))+'px';}
 grid.addEventListener('pointerover',e=>{const b=button(e.target);if(e.pointerType==='mouse'&&b&&b!==shown)show(b);});
 grid.addEventListener('pointerout',e=>{if(e.pointerType==='mouse'&&shown&&!shown.contains(e.relatedTarget))hide();});
 grid.addEventListener('focusin',e=>{const b=button(e.target);if(b&&!press)show(b);});grid.addEventListener('focusout',hide);
 document.addEventListener('pointerdown',e=>{suppress=null;cancelTimer();hide();press=null;const b=button(e.target);if(!b||!['touch','pen'].includes(e.pointerType)||!e.isPrimary)return;press={b,id:e.pointerId,x:e.clientX,y:e.clientY,held:false};timer=setTimeout(()=>{if(!press||!b.isConnected)return;press.held=true;suppress=b;show(b);},450);},true);
 document.addEventListener('pointermove',e=>{if(press&&e.pointerId===press.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>12){cancelTimer();if(press.held)hide();press=null;}},true);
 document.addEventListener('pointerup',e=>{if(press?.id!==e.pointerId)return;cancelTimer();if(press.held){e.preventDefault();suppress=press.b;}press=null;},true);
 document.addEventListener('pointercancel',()=>{cancelTimer();press=null;hide();},true);
 grid.addEventListener('click',e=>{const b=button(e.target);if(b&&b===suppress){e.preventDefault();e.stopImmediatePropagation();suppress=null;return;}hide();},true);
 grid.addEventListener('contextmenu',e=>{if(press||suppress){e.preventDefault();}},true);
 document.addEventListener('keydown',e=>{suppress=null;if(e.key==='Escape'){cancelTimer();press=null;hide();}});
 new MutationObserver(()=>{if(shown&&!shown.isConnected)hide();}).observe(grid,{childList:true});
 addEventListener('resize',hide);addEventListener('scroll',hide,true);
})();
