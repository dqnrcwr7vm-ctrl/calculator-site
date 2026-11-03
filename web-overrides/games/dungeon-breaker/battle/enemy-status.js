/* Per-enemy name and health above the authored head, below status icons. */
(()=>{
 if(!window.BATTLE_CONFIG?.partyTurns)return;
 const layer=document.createElement('div');layer.id='enemy-status';layer.setAttribute('aria-label','몬스터 상태');document.querySelector('.combat-world').append(layer);
 const plates=new Map(),measure=document.createElement('canvas').getContext('2d'),affixes=document.querySelector('#boss-affixes');
 const allNames=Object.values(window.MONSTER_BALANCE_DATA?.monsters||{}).map(m=>m.name).filter(Boolean);let fontDirty=true;
 function fitNames(){measure.font='16px Galmuri11, monospace';const widest=Math.max(1,...allNames.map(n=>measure.measureText(n).width));layer.style.setProperty('--enemy-name-size',String(Math.min(16,180/widest*16)/16));fontDirty=false;}
 document.fonts.ready.then(()=>{fontDirty=true;});
 function bottom(e){const a=e.spriteAsset||window.BATTLE_ASSETS?.[4],b=a?.bounds,anchor=a?.anchor;const head=b?e.y+(b[1]-(anchor?.[1]??b[3]))*e.h/(b[3]-b[1]):e.y-e.h;return Math.max(132,head-(a?.statusClearance??12));}
 window.EnemyStatus={statusTop:e=>bottom(e)-44,update(enemies,hidden=false){
  layer.hidden=hidden;for(const e of enemies)if(!allNames.includes(e.name)){allNames.push(e.name);fontDirty=true;}if(fontDirty)fitNames();const living=new Set();
  for(const e of enemies){if(e.hp<=0)continue;living.add(e.id);let p=plates.get(e.id);
   if(!p){const node=document.createElement('div');node.className='enemy-status-plate';node.dataset.enemyId=e.id;const name=document.createElement('span');name.className='enemy-status-name';const bar=document.createElement('div');bar.className='enemy-status-bar';bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuemin','0');const fill=document.createElement('i');bar.append(fill);node.append(name,bar);layer.append(node);p={node,name,bar,fill};plates.set(e.id,p);}
   // Keep enhancements attached to the same moving plate as the boss HP bar.
   // The retained reference also allows a defeated/removed plate to reset safely.
   if(e.id==='primary'&&affixes){if(affixes.parentElement!==p.node)p.node.append(affixes);affixes.hidden=!affixes.textContent;}
   const max=Math.max(1,e.maxHp||e.hp),hp=Math.max(0,Math.min(max,e.hp)),value=Math.round(hp);
   if(p.name.textContent!==e.name){p.name.textContent=e.name;p.node.title=e.name;p.bar.setAttribute('aria-label',e.name+' 체력');}
   if(p.hp!==value||p.max!==max){p.bar.setAttribute('aria-valuemax',String(max));p.bar.setAttribute('aria-valuenow',String(value));p.fill.style.width=(hp/max*100)+'%';p.hp=value;p.max=max;}
   const x=Math.max(110,Math.min(1490,e.x)),y=bottom(e);
   if(p.x!==x||p.y!==y){p.node.style.left=x/16+'%';p.node.style.top=y/7+'%';p.x=x;p.y=y;}
  }
  for(const [id,p]of plates)if(!living.has(id)){p.node.remove();plates.delete(id);}
 }};
})();
