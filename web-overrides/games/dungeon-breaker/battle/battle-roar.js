/* Party buffs last three rounds including the cast, ticking after the full enemy response. */
window.BattleRoar = (() => {
  const durations = [80,100,120,160,200,160,140,140,100], total = 1200;
  const specs = {
    attack: {id:'magic',name:'전투의 포효',folder:'battle-roar-v1',icon:'attack-up.svg',color:'#ff555d'},
    defense: {id:'hero-roar',name:'용사의 포효',folder:'hero-roar-v1',icon:'defense-up.svg',color:'#5bcaff'}
  };
  const layers = {}, icons = {}, buffs = new Map();
  let animation = null, turn = 0;
  const enabled = () => window.BATTLE_CONFIG?.partyTurns ? window.BATTLE_ASSETS.slice(0,4).some(a=>a.id==='hero') : window.BATTLE_ASSETS[0].id === 'hero';
  const kind = def => enabled() && !def?.offensive && Object.keys(specs).find(k=>specs[k].id===def?.id);
  const isRoar = def => !!kind(def);
  function configure(slots) {
    if (!enabled() || window.BATTLE_CONFIG?.partyTurns) return;
    const magic = slots.find(s=>s.id==='magic'&&!s.offensive);
    if (!magic) return;
    const impact=window.BATTLE_ASSETS[0].actions.magic.durations.slice(0,4).reduce((a,b)=>a+b,0);
    Object.assign(magic,{name:specs.attack.name,color:specs.attack.color,impact,description:'아군 전체 공격력 +20% · 3턴 · 재시전 시 갱신'});
    // Keep the previous fire loadout available in the skill-set selector.
    if (new URLSearchParams(window.location?.search||'').get('skills')!=='fire') {
      slots[1]={id:'hero-roar',name:specs.defense.name,type:'skill',clip:'magic',impact,damage:0,offensive:false,color:specs.defense.color,icon:'defense-up',cost:30,description:'아군 전체 방어력 +20% · 3턴 · 재시전 시 갱신'};
    }
    window.BATTLE_CONFIG.icons={...window.BATTLE_CONFIG.icons,'defense-up':'../effects/hero-roar-v1/defense-up.svg'};
  }
  async function load(loader) {
    if (!enabled()) return;
    await Promise.all(Object.entries(specs).map(async([key,s])=>{
      icons[key]=await loader(`../effects/${s.folder}/${s.icon}`);layers[key]={};
      await Promise.all(['back','front'].map(async layer=>{
        layers[key][layer]=await Promise.all(durations.map((_,i)=>loader(`../effects/${s.folder}/frames/${layer}/aura-${String(i+1).padStart(2,'0')}.webp`)));
      }));
    }));
  }
  function cast(current,state,now) {
    const key=kind(current.def);
    if (!key||current.roarApplied||state.phase!=='acting'||state.local<current.def.impact) return;
    current.roarApplied=true;animation={key,started:now};
    const old=buffs.get(key);
    buffs.set(key,{from:old&&turn<old.expires?old.from:now+total,reveal:now+total,expires:turn+3});
  }
  function remaining(key) { return Math.max(0,Math.min(3,(buffs.get(key)?.expires??turn)-turn)); }
  function multiplier(index,now,key='attack') {
    const buff=buffs.get(key);
    return index>=0&&index<4&&buff&&remaining(key)>0&&now>=buff.from?1.2:1;
  }
  const damage=(index,base,now)=>{const amount=Math.round(base*multiplier(index,now));const healed=window.HealerSkills?.damage(index,amount)??amount;return window.PartyTurns?.outgoingDamage(index,healed)??healed;};
  // Defense is a damage divisor: +20% defense means raw damage / 1.2.
  const incomingDamage=(index,base,now)=>Math.round(base/multiplier(index,now,'defense'));
  function update(now) {
    for(const [key,buff] of buffs)if(turn>=buff.expires)buffs.delete(key);
    window.BATTLE_ASSETS.slice(0,4).forEach((actor,index)=>{
      actor.attackMultiplier=multiplier(index,now);
      actor.defenseMultiplier=multiplier(index,now,'defense');
    });
  }
  function completeTurn(now) {turn++;update(now);}
  function drawStatus(ctx,index,p,now) {
    if(index>=4||window.PartyStatusIcons?.buffsEnabled())return;
    const visible=Object.keys(specs).filter(key=>icons[key]&&remaining(key)>0&&now>=buffs.get(key)?.reveal);
    visible.forEach((key,i)=>{
      const rise=Math.min(1,(now-buffs.get(key).reveal)/350)*12;
      const x=Math.round(p.x-visible.length*27+i*54),y=Math.round(p.y-p.h-60-rise);
      ctx.drawImage(icons[key],x,y,48,48);
      ctx.save();ctx.font=window.BATTLE_CONFIG?.partyTurns?'14px Galmuri11, monospace':'bold 14px sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.fillText(remaining(key)+'턴',x+24,y+61);ctx.restore();
    });
  }
  function frame(now) {
    if(!animation)return -1;
    let age=now-animation.started;
    if(age<0||age>=total){animation=null;return -1;}
    for(let i=0;i<durations.length;i++){if(age<durations[i])return i;age-=durations[i];}
    return -1;
  }
  function draw(ctx,layer,index,p,now) {
    if(index>=4)return;
    const f=frame(now),image=layers[animation?.key]?.[layer]?.[f];
    if(!image)return;
    const size=Math.round(p.h*1.45);
    ctx.drawImage(image,Math.round(p.x-size/2),Math.round(p.y-size*111/128),size,size);
  }
  return {statusKinds:now=>Object.keys(specs).filter(key=>remaining(key)>0&&now>=buffs.get(key)?.reveal),configure,load,cast,draw,drawStatus,frame,isRoar,multiplier,damage,incomingDamage,update,completeTurn,remaining,
    snapshot(consumeTurn=false){return Object.fromEntries(Object.keys(specs).map(key=>[key,Math.max(0,remaining(key)-(consumeTurn?1:0))]));},
    restore(saved,now=0){animation=null;turn=0;buffs.clear();for(const key of Object.keys(specs)){const n=Math.max(0,Math.min(3,Math.floor(Number(saved?.[key])||0)));if(n)buffs.set(key,{from:now,reveal:now-350,expires:n});}update(now);},
    reset(){animation=null;turn=0;buffs.clear();update(0);}};
})();
