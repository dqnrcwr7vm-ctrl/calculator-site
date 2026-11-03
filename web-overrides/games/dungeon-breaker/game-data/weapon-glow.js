/* Weapon head/blade centers as percentages of each authored, untrimmed pose.
   Reused clips share the corresponding pose track. Hidden weapons have no track. */
(() => {
  'use strict';
  const tracks = {
    hero: {
      idle: [[70,79]],
      attack: [[70,79],[71,54],[39,39],[74,48],[73,81],[69,79],[70,79],[70,79]],
      guard: [[69,79],[66,50],[61,50],[61,50],[61,50],[61,50],[66,77],[69,79]],
      magic: [[70,79],[67,57],[68,44],[61,28],[61,28],[68,44],[67,57],[69,79]],
      item: [[69,80],[67,80],[65,80],[65,80],[66,80],[66,80],[66,80],[69,80]],
      hurt: [[70,79],[68,79],[66,81],[66,81],[69,81],[69,79],[66,81],[70,79]],
      forward: [[67,78],[67,78],[67,78],[66,78],[67,78],[67,78],[67,78],[66,78]],
      return: [[35,80]], turn: [[61,82],[33,82],[29,81],[30,81]], face: [[35,82],[65,82],[64,80]],
      swordBack: [[70,79],[62,78],[72,67],[77,66],[77,66],[71,67],[62,78],[70,79]]
    },
    dwarf: {
      idle: [[76,73],[76,71],[76,70],[76,73],[76,74],[76,74],[76,73],[76,73]],
      attack: [[76,75],[75,34],[37,19],[76,28],[79,77],[77,71],[76,73],[76,75]],
      guard: [[75,75],[70,72],[75,79],[75,79],[75,79],[76,78],[76,75],[75,75]],
      magic: [[76,72],[60,73],[63,71],[63,71],[64,71],[63,71],[76,73],[76,73]],
      item: [[78,72],[60,73],[64,73],[67,73],[68,73],[66,73],[64,73],[78,72]],
      forward: [[73,72]], return: [[25,70]], turn: [[76,73],[75,71],[66,73],[24,73],[28,73],[27,73],[27,73],[25,73]],
      hurt: [[76,71],[72,63],[70,56],[73,72],[78,63],[76,71],[76,71],[76,71]]
    },
    archer: {
      idle: [[67,47],[65,46],[67,46],[67,46],[67,47],[67,47],[67,47],[67,47]],
      attack: [[71,46],[55,28],[62,27],[64,26],[66,27],[71,46],[71,46]],
      magic: [[75,48],[73,54],[73,55],[68,58],[69,57],[69,57],[68,59],[75,48]],
      guard: [[69,50],[67,40],[62,35],[62,42],[62,42],[62,42],[69,44],[69,50]],
      hurt: [[69,48],[63,47],[69,56],[69,57],[69,48],[69,48],[69,48],[69,48]]
    },
    wizard: {
      idle: [[67,44]],
      magic: [[66,46],[67,45],[64,37],[65,39],[66,44],[65,46],[65,50],[66,46]],
      guard: [[69,43],[73,49],[70,49],[69,48],[69,48],[69,43],[69,43],[69,43]],
      hurt: [[68,39],[78,49],[79,79],[77,82],[74,47],[71,45],[72,46],[68,39]]
    },
    priest: {
      idle: [[34,29]], magic: [[34,29]],
      guard: [[34,30],[33,30],[33,32],[33,34],[35,33],[33,30],[33,30],[33,30]],
      hurt: [[34,29],[31,30],[28,30],[44,34],[35,29],[34,29],[34,29],[34,29]]
    },
    mechanic: {
      idle: [[28,34],[28,35],[24,40],[24,40],[28,35],[28,36],[28,34],[28,35]],
      attack: [[75,41],[74,48],[36,24],[79,36],[77,79],[74,78],[75,31],[75,41]],
      guard: [[75,27],[69,23],[66,30],[74,40],[73,38],[70,30],[71,29],[75,27]],
      install: [[29,38],[75,79],[73,79],[73,79],[73,79],[73,79],[69,47],[28,37]],
      item: [[22,40]], forward: [[76,36]], return: [[76,36],[76,45],[74,37],[74,42],[77,39],[77,41],[77,43],[77,34]],
      hurt: [[78,33],[75,30],[63,30],[72,50],[78,59],[78,35],[74,32],[78,33]]
    }
  };
  const princessOrder = [0,1,2,2,3,4,4,4,4,4,5,5,6,6,7,7,0,0,0,0];
  tracks.hero.princessSlam = princessOrder.map(index => tracks.hero.attack[index]);
  for (const clip of ['dwarfTaunt','dwarfBulwark','dwarfQuake','dwarfBash']) tracks.dwarf[clip] = tracks.dwarf.guard;
  tracks.dwarf.dwarfWake = tracks.dwarf.attack;
  tracks.dwarf.dwarfMjolnir = [...tracks.dwarf.attack, tracks.dwarf.idle[0]];
  for (const role of ['archer','wizard','priest']) tracks[role].item = tracks[role].magic;

  const ascendedNames = {
    hero:'여명성검', dwarf:'뇌전의 철퇴', archer:'봉황깃 활',
    wizard:'성운의 수정 지팡이', priest:'태양의 성광 지팡이', mechanic:'홍련 터빈 스패너'
  };
  // Surface light, shadow, gemstone, and brightest facet of each native weapon.
  const palettes = {
    hero:['#9eeaff','#233d80','#549aff','#dcffff'],
    dwarf:['#cbadff','#473066','#a377ff','#efe1ff'],
    archer:['#92ffd6','#155544','#39d991','#dcffda'],
    wizard:['#a0d9ff','#432d81','#876dff','#c3ffff'],
    priest:['#fff0ac','#87452b','#ffb83e','#fff9c2'],
    mechanic:['#ffb79a','#593047','#ff6355','#fff2b5']
  };

  // The finished parts point right in their local artwork; rotate them around
  // the original blade/head attachment using the direction in the current pose.
  const angles = {
    hero:{idle:[32], attack:[32,-48,-157,-40,32,32,32,32], guard:[32,-58,-84,-84,-84,-84,35,32],
      magic:[32,-55,-68,-80,-80,-68,-55,32], return:[139], turn:[38,135,142,142],
      face:[140,39,34], swordBack:[32,35,4,0,0,7,35,32]},
    dwarf:{idle:[15], attack:[15,-45,-135,-55,28,10,15,15], return:[150], turn:[15,15,30,160,158,158,158,158]},
    archer:{idle:[-76], attack:[-72,-107,-112,-115,-115,-72,-72], magic:[-63], guard:[-75,-80,-100,-105,-105,-105,-80,-75]},
    wizard:{idle:[-78], magic:[-77,-72,-63,-69,-54,-73,-76,-77], hurt:[-78,-65,24,35,-61,-73,-73,-78]},
    priest:{idle:[-90], hurt:[-90,-94,-104,-75,-87,-90,-90,-90]},
    mechanic:{idle:[-157], attack:[-50,-36,-153,-62,27,25,-52,-50], guard:[-70], install:[-157,26,-9,-9,-9,-9,-40,-157],
      item:[-95], forward:[-40], return:[-36,-25,-25,-25,-25,-25,-28,-38], hurt:[-45,-54,-65,-35,-20,-52,-52,-45]}
  };
  angles.hero.princessSlam = princessOrder.map(i => angles.hero.attack[i]);
  angles.dwarf.dwarfWake = angles.dwarf.attack;
  angles.dwarf.dwarfMjolnir = [...angles.dwarf.attack, 15];
  angles.archer.item = angles.archer.magic;
  angles.wizard.item = angles.wizard.magic;

  const partScales = {dwarf:1.18, archer:1.2, mechanic:1.2};
  const attachments = new Map();
  function makeAttachment(role) {
    if (attachments.has(role)) return attachments.get(role);
    const c = document.createElement('canvas');
    c.width=56; c.height=40;
    const g=c.getContext('2d');
    g.translate(20,20);
    const [,shade,gem,ice]=palettes[role];
    const gold='#e7a443', pale='#fff0a8', metal='#7386a5', white='#fffcef', ink='#29253d';
    const shape=(color,path)=>{g.fillStyle=color;g.fill(new Path2D(path),'evenodd');};
    switch (role) {
      case 'hero':
        shape(ink,'M-13 -3 L-8 -5 -10 -11 -5 -9 0 -4 18 -4 32 0 17 4 0 4 -6 9 -10 10 -8 5 -13 3Z');
        shape(gold,'M-13 -2 L-6 -3 -9 -10 -5 -8 1 -4 15 -4 30 0 14 4 1 4 -5 7 -9 9 -6 3 -13 2Z');
        shape(shade,'M-4 0 L1 -3 18 -3 30 0 16 3 1 3Z');
        shape(gem,'M-2 0 L4 -2 19 -2 28 0 11 2 3 2Z');
        shape(ice,'M1 0 L7 -2 20 -2 29 0 13 0 6 1Z');
        shape(pale,'M-9 -9 L-5 -7 -1 -3 -3 -3Z M-8 7 L-4 3 -1 3 -5 6Z M1 0 L4 -2 7 0 4 2Z');
        shape(white,'M10 0 L14 -1 15 0 12 1Z M18 0 L22 -1 24 0Z');
        break;
      case 'dwarf':
        shape(ink,'M-12 -6 L-7 -6 -6 -13 -1 -8 3 -9 10 -13 9 -6 16 -3 12 1 16 7 8 7 5 14 0 9 -7 12 -7 7 -14 5 -9 0Z');
        shape(gold,'M-10 -5 L-6 -5 -6 -11 -1 -7 3 -8 9 -11 8 -5 14 -3 10 1 14 6 7 6 5 12 0 8 -6 10 -6 5 -12 4 -8 0Z');
        shape(shade,'M-7 -2 L-2 -7 6 -6 10 -1 7 5 1 8 -7 4Z');
        shape(gem,'M-5 -3 L0 -6 6 -4 8 0 4 4 -2 5 -6 1Z');
        shape(ice,'M-4 -2 L1 -5 4 -4 0 -1 4 0 -1 4 0 1 -4 1Z');
        shape(pale,'M-6 -10 L-3 -7 -5 -6Z M9 -10 L7 -6 5 -6Z M7 7 L5 11 4 8Z M10 2 L13 5 9 4Z');
        break;
      case 'archer':
        // Feather vanes follow the upper bow limb; the grip and string stay exposed.
        shape(ink,'M-17 -2 Q-9 3 -4 0 L0 -8 6 -12 4 -5 13 -9 11 -4 22 -7 16 -1 25 -2 13 5 5 6 -3 5 -10 5 -17 1Z');
        shape(gold,'M-16 -1 Q-8 3 -3 0 L1 -7 5 -10 3 -3 11 -7 9 -2 20 -6 14 0 22 -1 12 4 4 5 -3 4 -10 4 -16 1Z');
        shape(shade,'M-8 3 L0 -2 2 -5 2 -1 9 -4 6 0 16 -3 9 2 16 1 10 4 -1 4Z');
        shape(gem,'M-5 3 L0 0 7 -3 3 1 14 -2 8 2 13 2 6 4Z');
        shape(ice,'M-2 2 L1 0 0 2 7 0 3 3Z');
        shape(pale,'M-13 1 Q-7 4 0 1 L-4 4 -10 4Z M6 4 L12 2 10 4Z');
        break;
      case 'wizard':
        shape(gold,'M-12 -3 L-6 -4 -4 -11 4 -14 -1 -8 -2 -4 2 -2 9 -6 6 -2 2 1 6 5 -1 3 -3 5 -1 10 4 13 -4 11 -7 5 -12 3Z');
        shape(pale,'M-6 -6 L-4 -11 4 -14 -2 -9Z M-5 6 L-2 10 3 12 -4 10Z');
        shape(shade,'M-5 0 L-1 -5 9 -6 18 0 9 6 -1 5Z');
        shape(gem,'M-3 0 L1 -4 9 -5 16 0 8 4 1 4Z');
        shape(ice,'M-2 -1 L2 -4 9 -5 16 0 8 -1 4 1Z');
        shape(white,'M7 -4 L10 -3 13 -1 9 -2Z');
        shape(gem,'M9 -10 L12 -13 15 -10 12 -8Z M8 10 L11 8 14 11 11 13Z');
        break;
      case 'priest':
        shape(gold,'M-12 -2 L-5 -4 -6 -8 -3 -7 -1 -13 2 -9 6 -12 6 -8 13 -8 10 -4 17 0 10 3 13 8 6 7 6 12 2 9 -1 13 -2 8 -6 9 -5 4 -12 2Z');
        shape(shade,'M-4 -4 L0 -8 6 -7 10 -3 10 3 6 7 0 8 -4 4Z');
        shape(pale,'M-4 -2 L0 -6 6 -6 9 -2 9 2 5 6 0 6 -4 2Z M-2 -1 L1 -4 5 -4 7 -1 7 1 5 4 1 4 -2 1Z');
        shape(gem,'M-2 0 L2 -4 6 0 2 4Z');
        shape(white,'M0 -1 L2 -3 3 -1 2 0Z M10 -3 L14 0 10 1Z');
        break;
      case 'mechanic':
        shape(ink,'M-15 -3 L-8 -4 -6 -8 -2 -8 0 -11 5 -10 8 -12 17 -10 20 -6 10 -6 7 -2 8 2 18 3 19 7 13 10 4 10 0 8 -4 9 -9 5 -15 4Z');
        shape(metal,'M-14 -2 L-7 -3 -5 -7 0 -8 1 -10 6 -9 9 -11 16 -9 18 -7 9 -7 5 -2 7 3 17 4 18 6 12 9 4 9 0 7 -4 8 -8 4 -14 3Z');
        shape(gold,'M-7 -3 L-4 -6 1 -5 4 -7 8 -7 5 -2 6 3 9 5 15 5 13 7 7 7 2 5 -3 6 -7 2Z');
        shape(shade,'M-7 -2 L-3 -5 1 -4 4 -1 3 3 -1 5 -5 4 -7 1Z');
        shape(gem,'M-4 -3 L0 -3 2 0 0 3 -4 3 -5 0Z');
        shape(pale,'M-3 -2 L0 -2 1 0 -2 1Z M7 -8 L10 -10 16 -8Z M9 4 L16 4 17 5 10 5Z');
        break;
    }
    attachments.set(role,c);
    return c;
  }

  const lights = new WeakMap();
  function surface(image, point, role, tier) {
    let cache=lights.get(image);
    if (!cache) lights.set(image,cache=new Map());
    const key=role+'/'+tier+'/'+point;
    if (cache.has(key)) return cache.get(key);
    const side=Math.max(14,Math.round(image.width*(tier===100?.17:.135)));
    const tile=document.createElement('canvas');
    tile.width=tile.height=side;
    const g=tile.getContext('2d'), r=side/2;
    const color=tier===60?'#ffad53':palettes[role][0];
    const light=g.createRadialGradient(r,r,0,r,r,r);
    light.addColorStop(0,'#ffffff');light.addColorStop(.22,color);light.addColorStop(1,color+'00');
    g.drawImage(image,r-image.width*point[0]/100,r-image.height*point[1]/100);
    g.globalCompositeOperation='source-in';g.fillStyle=light;g.fillRect(0,0,side,side);
    g.globalCompositeOperation='destination-over';g.globalAlpha=.42;g.fillRect(0,0,side,side);
    cache.set(key,tile);return tile;
  }

  // Small pixel flame frames share the battle clock; no per-frame canvas allocation.
  const flames=new Map();
  function fireFrame(role, ascended, frame) {
    const key=(ascended?role:'fire')+frame;
    if (flames.has(key)) return flames.get(key);
    const c=document.createElement('canvas');c.width=32;c.height=32;
    const g=c.getContext('2d'), phase=frame*Math.PI/6;
    const colors=ascended?[palettes[role][1],palettes[role][2],palettes[role][3]]:['#ad3640','#ff852e','#ffe789'];
    for(let i=0;i<7;i++) {
      const base=5+i*3, wave=Math.sin(phase+i*2.4), height=Math.round(9+7*(1+wave)/2+(3-Math.abs(i-3))*2);
      for(let row=0;row<height;row++) {
        const t=row/height, dx=Math.round(4*t*Math.sin(phase+i*.9+t*4)), w=Math.max(1,Math.round((1-t)*5));
        g.fillStyle=colors[t<.3?2:t<.72?1:0];
        g.fillRect(base+dx-Math.floor(w/2),27-Math.round(Math.abs(i-3)*.8)-row,w,1);
      }
    }
    for(let j=0;j<4;j++){
      const age=(frame+j*3)%12;
      g.fillStyle=colors[j%2+1];
      g.fillRect(6+(j*11)%20+Math.round(2*Math.sin(phase+j)),17-age,age<6?2:1,2);
    }
    flames.set(key,c);return c;
  }

  function draw(ctx, role, clip, frame, level, image, left, top, width, height, time) {
    const track=tracks[role]?.[clip];
    if(level<30 || !track) return;
    const tier=level>=100?100:level>=60?60:30;
    const point=track[frame]||track[0], tile=surface(image,point,role,tier);
    const x=left+width*point[0]/100, y=top+height*point[1]/100;
    const w=tile.width*width/image.width, h=tile.height*height/image.height;
    const pulse=.5+.5*Math.sin(time/280), unit=width/(role==='hero'?170:155);
    const dir=angles[role][clip]||angles[role].idle;
    const angle=(dir[frame]??dir[0])*Math.PI/180;
    ctx.save();
    ctx.translate(x,y);ctx.imageSmoothingEnabled=false;
    ctx.save();ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha*=.64+.22*pulse+.1*(level-tier)/30;
    ctx.drawImage(tile,-w/2,-h/2,w,h);
    ctx.restore();
    if(tier>=60){
      const cell=Math.floor(time/75)%12, flame=fireFrame(role,tier===100,cell);
      const span=unit*(tier===100?26:22+(level-60)*.13);
      ctx.drawImage(flame,-span/2,-span*.84,span,span);
      if(role==='hero'){
        const reach=unit*(tier===100?16:6);
        ctx.drawImage(fireFrame(role,tier===100,(cell+5)%12),Math.cos(angle)*reach-span*.34,Math.sin(angle)*reach-span*.6,span*.68,span*.68);
      }
    }
    if(tier===100){
      const scale=unit*(partScales[role]||1);
      ctx.save();ctx.rotate(angle);ctx.scale(scale,scale);
      ctx.drawImage(makeAttachment(role),-20,-20);ctx.restore();
      for(let i=0;i<5;i++){
        const phase=time/780+i*2*Math.PI/5;
        const sx=Math.round(Math.cos(phase)*(17+i%2*6)*unit), sy=Math.round(Math.sin(phase)*12*unit);
        const size=Math.max(1,Math.round(unit*(.75+.55*Math.cos(phase*2))));
        ctx.fillStyle=palettes[role][0];ctx.fillRect(sx-size*2,sy,size*5,size);ctx.fillRect(sx,sy-size*2,size,size*5);
        ctx.fillStyle='#fffbe6';ctx.fillRect(sx,sy,size,size);
      }
    }else if(tier===30){
      const ray=Math.max(2,Math.round(w*.14*pulse));
      ctx.fillStyle=palettes[role][3];ctx.fillRect(-ray,0,ray*2+1,1);ctx.fillRect(0,-ray,1,ray*2+1);
    }
    ctx.restore();
  }
  window.WeaponGlow = {draw, ascendedNames};
})();
