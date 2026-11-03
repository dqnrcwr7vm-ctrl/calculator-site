/* Shared object for contract expeditions. The run owns awards, never the sprite. */
(function(root){
'use strict';
const FLOORS=[3,7],LIMIT=5,SPRITE='../objects/contract-runestone-v3/stone.webp';
const WARDS={physical:'물리 공격 무효',magic:'마법 공격 무효',fire:'불속성 무효'};
const STATS={attack:'공격력',magicAttack:'마법 공격력',mp:'최대 마력',hp:'최대 체력',defense:'방어력',magicDefense:'마법 방어력'};
const TUNING={
 3:{defense:.55,hp:{physical:8200,magic:10200,fire:12400}},
 7:{defense:.70,hp:{physical:10400,magic:13200,fire:15200}}
};
function pick(values,key){const rng=root.MonsterBalance.random(root.MonsterBalance.hash(key));return values[Math.floor(rng()*values.length)];}
function encounter(contract,floor,seed,dungeon){
 if(!contract||!FLOORS.includes(floor))return null;
 const key=seed+':'+dungeon+':stone:'+floor,ward=pick(Object.keys(WARDS),key+':ward');
 const tune=TUNING[floor];
 return {id:'contract-runestone',name:'봉인 마법석',rank:'마법석',ward,reward:pick(Object.keys(STATS),key+':gift'),
 hp:tune.hp[ward],defense:tune.defense,magicDefense:tune.defense,element:'neutral',affixes:[],affixCount:0,evasion:0,resistance:{}};
}
// A stone's own ward and armor fully define its resistance in every environment.
function receive(stone,amount,hit={}){
 const type=hit.damageType||'physical',blocked=stone.ward===type||stone.ward==='fire'&&root.MonsterBalance.normalize(hit.element)==='fire';
 return {damage:blocked?0:Math.max(0,Math.round(amount/(1+(type==='magic'?stone.magicDefense:stone.defense)))),landed:!blocked&&amount>0};
}
function multiplier(awards,stat,floor){
 return Math.pow(1.1,FLOORS.filter(n=>n<floor&&awards?.[n]===stat).length);
}
const clip=durations=>({frames:durations.map(()=>SPRITE),durations});
function asset(stone){
 const idle=clip([1000]);
 return {id:stone.id,name:stone.name,hp:stone.hp,mp:0,statusClearance:48,size:[256,384],bounds:[54,21,199,332],anchor:[126.5,341],
 frames:idle.frames,durations:idle.durations,actions:{idle,hurt:clip([85,100,110]),defeated:clip(Array(12).fill(65))}};
}
// Project the two visible sides of the onyx around its vertical ridge. Cache the
// small yaw poses so the gold stems turn with the facets, including during hits.
const turnCache=new WeakMap();
function turnedSprite(image,step){
 if(step===0)return image;
 let cache=turnCache.get(image);
 if(!cache){
  const source=document.createElement('canvas');
  source.width=image.naturalWidth;source.height=image.naturalHeight;
  const ctx=source.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0);
  const {data}=ctx.getImageData(0,0,source.width,source.height);
  const spans=[];
  for(let y=0;y<source.height;y++){
   const row=y*source.width;
   let left=0,right=source.width-1;
   while(left<=right&&data[(row+left)*4+3]<8)left++;
   while(right>=left&&data[(row+right)*4+3]<8)right--;
   if(right>=left)spans.push({row,left:Math.max(0,left-1),right:Math.min(source.width,right+2)});
  }
  cache={pixels:new Uint32Array(data.buffer),spans,poses:new Map()};
  turnCache.set(image,cache);
 }
 if(cache.poses.has(step))return cache.poses.get(step);
 const pose=document.createElement('canvas');
 pose.width=image.naturalWidth;pose.height=image.naturalHeight;
 const ctx=pose.getContext('2d'),output=ctx.createImageData(pose.width,pose.height);
 const pixels=new Uint32Array(output.data.buffer),angle=step*Math.PI/180;
 const cos=Math.cos(angle),sin=Math.sin(angle);
 for(const {row,left,right} of cache.spans){
  const mid=(left+right)/2,radius=(right-left)/2;
  const near=mid-radius*cos,far=mid+radius*cos,ridge=mid+.82*radius*sin;
  for(let x=Math.ceil(near-.5);x+.5<far;x++){
   const u=x+.5;
   const source=u<ridge?left+radius*(u-near)/(ridge-near):mid+radius*(u-ridge)/(far-ridge);
   pixels[row+x]=cache.pixels[row+Math.floor(source)];
  }
 }
 ctx.putImageData(output,0,0);cache.poses.set(step,pose);return pose;
}
const hoverWave=now=>Math.sin(now*2*Math.PI/3200);
function hoverHeight(now,height){return height*(.065+.026*hoverWave(now));}
function drawShadow(g,p,now,opacity){
 if(opacity<=0)return;
 const wave=hoverWave(now);
 g.save();g.globalAlpha*=opacity;g.translate(p.x,p.y+5);
 g.scale(p.h*(.225-wave*.018),p.h*.038);
 const shade=g.createRadialGradient(0,0,0,0,0,1);
 shade.addColorStop(0,'rgba(5,4,12,'+(.53-wave*.06)+')');
 shade.addColorStop(1,'rgba(5,4,12,0)');
 g.fillStyle=shade;g.fillRect(-1,-1,2,2);g.restore();
}
function draw(g,img,x,y,w,h,clip,frame,now,wardAt,hitAt){
 const poseTime=clip==='defeated'?(hitAt??now):now;
 const turn=Math.sin(poseTime*2*Math.PI/5200);
 const texture=turnedSprite(img,Math.round(18*turn));
 const age=now-hitAt;
 const recoil=clip==='hurt'&&hitAt!=null&&age>=0&&age<295
  ?Math.cos(age*2*Math.PI/100)*(1-age/295)**1.6:0;
 const pivotX=x+w*.494,pivotY=y+h*.48;
 g.save();g.translate(pivotX+w*.065*recoil,pivotY-h*.014*Math.abs(recoil));
 g.rotate(turn*.050+recoil*.075);g.translate(-pivotX,-pivotY);
 if(clip==='defeated'){
  const t=frame/11;
  g.globalAlpha=1-t;
  for(let row=0;row<4;row++)for(let col=0;col<2;col++)for(let half=0;half<2;half++){
   const ww=w/2,hh=h/4,left=x+ww*col,top=y+hh*row;
   g.save();g.translate((col-.5+(half-.5)*.35)*w*t*.46,(row-2.3)*h*t*.28+h*t*t*.16);
   g.beginPath();g.moveTo(left+ww,top);g.lineTo(left,top+hh);g.lineTo(half?left+ww:left,half?top+hh:top);g.closePath();g.clip();g.drawImage(texture,x,y,w,h);g.restore();
  }
 }else{
  if(clip==='hurt'&&age<85)g.filter='brightness(1.42)';
  g.drawImage(texture,x,y,w,h);
 }
 g.restore();
 const wardAge=now-wardAt;
 if(clip!=='defeated'&&wardAge>=0&&wardAge<750){
  g.save();g.globalAlpha*=1-wardAge/750;g.font='bold 24px Galmuri11, monospace';g.textAlign='center';g.lineWidth=5;
  g.strokeStyle='#211825';g.fillStyle='#ffe8a8';const tx=x+w*.82,ty=y+h*.50-wardAge*.025;
  g.strokeText('무효',tx,ty);g.fillText('무효',tx,ty);g.restore();
 }
}
function showTurn(stone,turn){const box=document.querySelector('#boss-affixes');if(box)box.textContent=WARDS[stone.ward]+' · '+turn+' / '+LIMIT+'턴';}
const api={FLOORS,LIMIT,SPRITE,WARDS,STATS,encounter,receive,multiplier,asset,hoverHeight,drawShadow,draw,showTurn};
if(typeof module==='object'&&module.exports)module.exports=api;
root.ContractStones=api;
})(typeof window!=='undefined'?window:globalThis);
