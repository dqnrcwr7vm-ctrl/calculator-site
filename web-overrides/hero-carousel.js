/* Homepage-only carousel; disconnected when FOUREIGN replaces the document body. */
(() => {
 'use strict';
 const root=document.querySelector('.hero-carousel');if(!root)return;
 const slides=[...root.querySelectorAll('.hero-slide')],dots=[...root.querySelectorAll('[data-slide-index]')];
 const controls=root.querySelector('.hero-controls'),rotation=root.querySelector('#hero-rotation');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),events=new AbortController();
 let index=0,moving=false,timer=0,paused=reduced.matches,hover=false,touch=null,suppressClick=false,disposed=false;
 const listen=(node,type,fn,options={})=>node.addEventListener(type,fn,{...options,signal:events.signal});
 function clear(){clearTimeout(timer);timer=0;}
 function syncRotation(){rotation.textContent=paused?'▶':'Ⅱ';rotation.setAttribute('aria-label',paused?'자동 넘김 재생':'자동 넘김 일시정지');}
 function schedule(){clear();if(!disposed&&!paused&&!hover&&!document.hidden&&!moving)timer=setTimeout(()=>show(index+1,1,false),6000);}
 function pause(){paused=true;clear();syncRotation();}
 async function show(next,direction=1,manual=true){
  if(disposed||moving)return;if(!root.isConnected){destroy();return;}
  if(manual)pause();next=(next+slides.length)%slides.length;if(next===index)return;
  clear();moving=true;const from=slides[index],to=slides[next];
  from.inert=true;from.setAttribute('aria-hidden','true');to.hidden=false;to.inert=false;to.removeAttribute('aria-hidden');
  index=next;if(manual&&from.contains(document.activeElement))dots[next].focus();dots.forEach((dot,i)=>{if(i===index)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');});
  if(manual)root.querySelector('.hero-announcement').textContent=to.getAttribute('aria-label');
  if(!reduced.matches){
   const options={duration:650,easing:'cubic-bezier(.22,.72,.22,1)'};
   const animations=[from.animate([{transform:'translateX(0)'},{transform:`translateX(${-direction*100}%)`}],options),to.animate([{transform:`translateX(${direction*100}%)`},{transform:'translateX(0)'}],options)];
   await Promise.allSettled(animations.map(a=>a.finished));
  }
  from.hidden=true;moving=false;schedule();
 }
 function destroy(){disposed=true;clear();events.abort();}
 dots.forEach((dot,i)=>listen(dot,'click',()=>show(i,i>=index?1:-1)));
 root.querySelectorAll('[data-slide-step]').forEach(button=>listen(button,'click',()=>{const step=Number(button.dataset.slideStep);show(index+step,step);}));
 listen(rotation,'click',()=>{paused=!paused;syncRotation();schedule();});
 listen(root,'mouseenter',()=>{hover=true;clear();});listen(root,'mouseleave',()=>{hover=false;schedule();});
 // Stop automatic rotation when reading or operating a focused control.
 listen(root,'focusin',event=>{if(event.target!==rotation)pause();});
 listen(root,'keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const step=event.key==='ArrowRight'?1:-1;show(index+step,step);}});
 listen(root,'pointerdown',event=>{if(!event.isPrimary||event.button>0)return;touch={id:event.pointerId,x:event.clientX,y:event.clientY};clear();});
 listen(root,'pointerup',event=>{if(!touch||event.pointerId!==touch.id)return;const dx=event.clientX-touch.x,dy=event.clientY-touch.y;touch=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3){suppressClick=true;setTimeout(()=>{suppressClick=false;},300);show(index+(dx<0?1:-1),dx<0?1:-1);}else schedule();});
 listen(root,'dragstart',event=>event.preventDefault());
 listen(root,'pointercancel',()=>{touch=null;schedule();});
 listen(root,'click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}},{capture:true});
 listen(document,'visibilitychange',schedule);listen(reduced,'change',()=>{if(reduced.matches)pause();});
 listen(window,'pagehide',clear);listen(window,'pageshow',schedule);
 // Existing platform loader preserves this document while replacing its body.
 listen(document,'click',event=>{if(event.target.closest('a[href="/games/foureign/"]')&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&event.button===0)destroy();});
 slides.forEach((slide,i)=>{slide.hidden=i!==index;slide.inert=i!==index;if(i!==index)slide.setAttribute('aria-hidden','true');});
 controls.hidden=false;syncRotation();schedule();
})();
