/* Per-enemy name and health, anchored below the authored formation position. */
(()=>{
 if(!window.BATTLE_CONFIG?.partyTurns)return;
 const layer=document.createElement('div');layer.id='enemy-status';layer.setAttribute('aria-label','몬스터 상태');document.querySelector('.combat-world').append(layer);
 const plates=new Map();
 window.EnemyStatus={update(enemies,hidden=false){
  layer.hidden=hidden;const living=new Set();
  for(const e of enemies){if(e.hp<=0)continue;living.add(e.id);let p=plates.get(e.id);
   if(!p){const node=document.createElement('div');node.className='enemy-status-plate';node.dataset.enemyId=e.id;const name=document.createElement('span');name.className='enemy-status-name';const bar=document.createElement('div');bar.className='enemy-status-bar';bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuemin','0');const fill=document.createElement('i');bar.append(fill);node.append(name,bar);layer.append(node);p={node,name,bar,fill};plates.set(e.id,p);}
   const max=Math.max(1,e.maxHp||e.hp),hp=Math.max(0,Math.min(max,e.hp)),value=Math.round(hp);
   if(p.name.textContent!==e.name){p.name.textContent=e.name;p.node.title=e.name;p.bar.setAttribute('aria-label',e.name+' 체력');}
   if(p.hp!==value||p.max!==max){p.bar.setAttribute('aria-valuemax',String(max));p.bar.setAttribute('aria-valuenow',String(value));p.fill.style.width=(hp/max*100)+'%';p.hp=value;p.max=max;}
   const x=Math.max(110,Math.min(1490,e.x)),y=Math.max(80,Math.min(656,e.y+8));
   if(p.x!==x||p.y!==y){p.node.style.left=x/16+'%';p.node.style.top=y/7+'%';p.x=x;p.y=y;}
  }
  for(const [id,p]of plates)if(!living.has(id)){p.node.remove();plates.delete(id);}
 }};
})();
