/* One overhead layout for status indicators. Reads combat state; never mutates it. */
(function(root){
'use strict';
const SIZE=36,GAP=5,ROW_GAP=21,COLUMNS=5,images=new Map();
const sources=Object.fromEntries(['blessing-attack','blessing-defense','blessing-health','barrier','water','attack','defense','eagle','guard','aim'].map(id=>[id,'../effects/status-icons-v1/'+id+'.svg']));
const pixels={
 taunt:['...###...','...###...','...###...','...###...','...###...','.........','...###...','...###...','.........'],
 stun:['....#....','..#.#.#..','...###...','#########','...###...','..#.#.#..','....#....','.........','.........'],
 freeze:['#...#...#','.#..#..#.','..#.#.#..','...###...','#########','...###...','..#.#.#..','.#..#..#.','#...#...#'],
 paralysis:['.....###.','....###..','...###...','..######.','....###..','...###...','..###....','..##.....','..#......'],
 poison:['..#####..','.#######.','#########','##..#..##','##..#..##','.#######.','..#.#.#..','..#####..','.........'],
 blind:['.........','..#####..','.##...##.','##..#..##','.##...##.','..#####..','.........','.........','.........'],
 root:['...##....','..#..#...','.#....#..','..#..##..','...##.#..','..##..#..','..#...#..','...###...','.........'],
 guard:['.#######.','.#######.','.#..#..#.','.#..#..#.','.#..#..#.','..#.#.#..','..#.#.#..','...###...','....#....'],
 charge:['..#####..','.#######.','##..#..##','##..#..##','.#######.','..#.#.#..','.........','..#...#..','.........'],
 aim:['....#....','..#####..','.#..#..#.','.#..#..#.','#########','.#..#..#.','.#..#..#.','..#####..','....#....']
};
const alive=a=>a&&(a.currentHp??a.hp)>0;
function layout(p,icons){
 const rows=Math.ceil(icons.length/COLUMNS),top=Math.max(10,p.y-p.h-16-rows*(SIZE+ROW_GAP)+ROW_GAP);
 return icons.map((icon,i)=>{const row=Math.floor(i/COLUMNS),count=Math.min(COLUMNS,icons.length-row*COLUMNS);
  return {...icon,x:Math.round(p.x-(count*SIZE+(count-1)*GAP)/2+(i%COLUMNS)*(SIZE+GAP)),y:Math.round(top+row*(SIZE+ROW_GAP)),size:SIZE};});
}
function collect(positions,enemies,now,buffsOnly=false){
 const units=[],party=root.BATTLE_ASSETS.slice(0,4),healer=root.HealerSkills?.model,dwarf=root.DwarfSkills?.model;
 const sourcesOfTaunt=new Map();
 for(const e of enemies.filter(e=>e.hp>0)){
  const icons=[],add=(id,tone='negative')=>icons.push({id,tone}),source=root.PartyTurns?.tauntSource(e);
  if(source){add('taunt','taunt');sourcesOfTaunt.set(source.robot||source.index,source);}
  if(dwarf?.stunned(e.id))add('stun');
  if(root.ArcherSkills?.model.rooted(e))add('root');
  if(!root.WizardSkills?.model.contained(e.id))for(const id of Object.keys(root.WizardSkills?.model.statuses.get(e.id)||{}))if(pixels[id])add(id);
  if(dwarf?.charge?.enemyId===e.id&&!(root.PartyTurns?.enemyAction?.id===e.id&&root.PartyTurns.enemyAction.hit))add('charge','danger');
  units.push({id:e.id,p:root.EnemyStatus?{...e,h:e.y-root.EnemyStatus.statusTop(e)}:e,icons});
 }
 party.forEach((a,i)=>{
  if(!alive(a))return;const icons=[],add=(id,tone='positive',extra={})=>{if(!icons.some(c=>c.id===id))icons.push({id,tone,...extra});};
  if(healer?.blessed.has(i)){for(const id of ['blessing-attack','blessing-defense','blessing-health'])add(id,'positive',{turns:healer.remaining('blessing',i)});}
  if(healer?.barriers.has(i))add('barrier','positive',{turns:healer.remaining('barrier',i)});if(healer?.livingWaterUntil.has(i))add('water','positive',{turns:healer.remaining('living-water',i)});
  for(const id of root.BattleRoar?.statusKinds(now)||[])add(id,'positive',{turns:root.BattleRoar.remaining(id)});
  if(a.id==='archer'&&root.ArcherSkills?.model.eagleTurns)add('eagle','positive',{turns:root.ArcherSkills.model.eagleTurns});
  if(a.id==='archer'&&root.ArcherSkills?.model.sniping)add('aim');
  if(a.id==='dwarf'&&dwarf?.defenseTurns>0||root.PartyBasicActions?.incoming(i,100)<100||root.PartyHero?.caster===i&&root.PartyHero.state.guard||root.PartyMechanic?.caster===i&&root.PartyMechanic.state.guard)add('guard','positive',{turns:a.id==='dwarf'&&dwarf?.defenseTurns>0?dwarf.defenseTurns:1});
  if(sourcesOfTaunt.has(i))add('taunt','taunt');
  for(const s of a.statuses||[]){const id=typeof s==='string'?s:s.kind;if(pixels[id])add(id,'negative');}
  units.push({id:'ally:'+i,p:positions[i],icons});
 });
 for(const source of sourcesOfTaunt.values())if(source.robot){const p={...root.MechFormation[source.robot],h:root.PartyMechanicData.robots[source.robot].height};units.push({id:'robot:'+source.robot,p,icons:[{id:'taunt',tone:'taunt'}]});}
 return units.map(u=>({...u,icons:layout(u.p,buffsOnly?u.icons.filter(i=>i.tone==='positive'):u.icons)}));
}
function paint(g,icon){
 const {x,y,size,id,tone}=icon,color={positive:'#e4c47a',negative:'#c6a1ed',taunt:'#ff9696',danger:'#ff7357'}[tone];
 g.save();g.shadowColor='#070914';g.shadowBlur=4;
 // One frame owns the border: glyphs contain no inset frames or backgrounds.
 g.fillStyle='#17182c';g.fillRect(x+2,y,size-4,size);g.fillRect(x,y+2,size,size-4);g.shadowBlur=0;
 g.fillStyle=color;g.fillRect(x+2,y,size-4,2);g.fillRect(x+2,y+size-2,size-4,2);g.fillRect(x,y+2,2,size-4);g.fillRect(x+size-2,y+2,2,size-4);
 if(tone==='positive'){g.fillStyle='#fff0c7';g.fillRect(x+2,y,size-4,1);g.fillStyle='#8d7047';g.fillRect(x+2,y+size-1,size-4,1);}
 const im=images.get(icon.image||id);
 if(im){const c=icon.crop||[0,0,im.width,im.height],scale=Math.min((size-12)/c[2],(size-12)/c[3]),w=c[2]*scale,h=c[3]*scale;
  g.imageSmoothingEnabled=false;g.drawImage(im,...c,x+(size-w)/2,y+(size-h)/2,w,h);
 }else if(pixels[id]){g.fillStyle=color;pixels[id].forEach((row,py)=>[...row].forEach((pixel,px)=>{if(pixel==='#')g.fillRect(x+4+px*3,y+4+py*3,3,3);}));}
 if(id==='charge')for(let i=0;i<2;i++){g.fillStyle=i<(root.DwarfSkills?.model.charge?.allies.size||0)?'#fff1a2':'#70566a';g.fillRect(x+10+i*10,y+30,6,3);}
 if(icon.turns>0){g.font='bold 14px Galmuri11, monospace';g.textAlign='center';g.textBaseline='top';g.lineWidth=4;g.strokeStyle='#080912';g.fillStyle='#fff3ce';const text=icon.turns+'턴';g.strokeText(text,x+size/2,y+size+3);g.fillText(text,x+size/2,y+size+3);}
 g.restore();
}
root.PartyStatusIcons={size:SIZE,layout,collect,enabled:()=>!!root.BATTLE_CONFIG?.partyTurns,buffsEnabled:()=>true,
 async load(loader){await Promise.all(Object.entries(sources).map(async([id,path])=>images.set(id,await loader(path))));},
 draw(g,positions,enemies,now){if(['victory','defeat'].includes(root.PartyTurns?.cycle.phase))return;
  // Previews share the same buff row, while retaining their existing enemy/status effects.
  this.last=collect(positions,enemies,now,!this.enabled());for(const u of this.last)for(const icon of u.icons)paint(g,icon);},
 markerY(e){const u=this.last?.find(u=>u.id===e.id);return u?.icons.length?Math.min(...u.icons.map(i=>i.y))-12:(root.EnemyStatus?.statusTop(e)??e.y-e.h)-30;},
 reset(){this.last=[];}
};
})(window);
