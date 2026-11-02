/* Load only equipped campaign effects; warm one upcoming encounter after entry.
   Browser HTTP caching retains the bytes across floor documents without keeping
   all nine floors' decoded canvases alive in the persistent game shell. */
(function(root){
 'use strict';
 function uses(state,role,id){
  return !state?.started || (state.skills[role]||[]).includes(id);
 }
 function nextFiles(dungeons,id,floor,bosses={}){
  const dungeon=dungeons[id],next=dungeon?.floors.find(f=>f.floor===floor+1);
  if(floor>=9||!next)return [];
  const files=new Set();
  for(const id of next.monsters){
   const monster=dungeon.monsters.find(m=>m.id===id);
   for(const clip of Object.values(monster?.actions||{}))for(const path of clip.frames)files.add(path);
   for(const clip of Object.values(bosses[dungeon.id+':'+id]||{})){
    for(const path of clip.frames)files.add(path);
    for(const path of Object.values(clip.layers||{}).flat())files.add(path);
   }
  }
  return [...files];
 }
 const api={uses,nextFiles};
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(!root.document)return;
 let started=false,stopped=false;
 root.addEventListener('pagehide',()=>stopped=true,{once:true});
 root.CampaignAssets={
  uses:(role,id)=>uses(root.GalleonCampaign?.state,role,id),
  async prefetchNext(){
   const campaign=root.GalleonCampaign;
   if(started||!campaign||!root.GameImages||campaign.floor>=9)return;
   started=true;
   const files=nextFiles(root.DUNGEON_COMBAT_DATA,root.ActiveDungeon.id,campaign.floor,root.BOSS_ATTACK_DATA);
   // Two low-priority requests leave bandwidth and decode time for active play.
   // Failed speculative loads are retried normally by the next floor's gate.
   let next=0,complete=0;
   const scene=document.querySelector('#scene');
   const report=()=>{if(scene)scene.dataset.nextFloorLoading=JSON.stringify({floor:campaign.floor+1,total:files.length,complete});};
   report();
   await Promise.all(Array.from({length:2},async()=>{
    while(!stopped&&next<files.length){
     const path=files[next++],resolved=root.SpiderDetail?.resolve(path)||path;
     try{await root.GameImages.ready(resolved,{priority:'low',attempts:1});complete++;}catch{}
     report();
     await new Promise(resolve=>setTimeout(resolve,32));
    }
   }));
  }
 };
})(typeof window==='undefined'?globalThis:window);
