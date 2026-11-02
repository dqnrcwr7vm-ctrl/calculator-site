const classes=[['용사','균형 잡힌 근접 전투','hero-combat/idle/00.webp',85,70,2460,180,'검과 방패로 전선을 지키는 만능 전사.','검술 · 단일 공격 · 전열'],['방패병','파티를 지키는 수호자','dwarf/00.webp',45,98,3600,100,'높은 방어력과 도발로 동료를 보호합니다.','도발 · 피해 감소 · 전열'],['궁수','정밀한 원거리 공격','archer/00.webp',95,40,1800,160,'빠른 사격으로 적의 약점을 공략합니다.','연속 사격 · 치명타 · 후열'],['힐러','회복과 파티 지원','priest/00.webp',30,50,1900,360,'회복 마법과 보호막으로 파티를 지원합니다.','치유 · 보호막 · 후열'],['마법사','강력한 광역 마법','wizard/00.webp',35,30,1500,480,'높은 마력으로 여러 적을 한 번에 공격합니다.','광역 마법 · 속성 공격 · 후열'],['메카닉','기계 소환과 전술 지원','mechanic/00.webp',80,65,2200,240,'전투 기계를 활용해 다양한 상황에 대응합니다.','기계 소환 · 화력 지원 · 중열']];
const ids=['hero','dwarf','archer','priest','wizard','mechanic'];
let team=[],slot=0,selected=0;
function readSaved(){if(new URLSearchParams(location.search).get('newparty')==='1'){sessionStorage.removeItem('normal-party-selection');const clean=new URL(location.href);clean.searchParams.delete('newparty');history.replaceState(null,'',clean);}try{const saved=JSON.parse(sessionStorage.getItem('normal-party-selection'));if(Array.isArray(saved)&&saved.length<=4&&new Set(saved).size===saved.length&&saved.every(i=>Number.isInteger(i)&&i>=0&&i<6)){team=saved;slot=team.length;selected=slot===4?team[3]:ids.findIndex((_,i)=>!team.includes(i));}}catch{}}
function storeTeam(){sessionStorage.setItem('normal-party-selection',JSON.stringify(team));}
function pick(i){if(team.some((v,j)=>v===i&&j!==slot))return;selected=i;render();}
function edit(i){if(i>team.length||i>3)return;slot=i;selected=team[i]??ids.findIndex((_,j)=>!team.includes(j));render();}
function confirm(){if(slot>=4)return;if(team.some((v,j)=>v===selected&&j!==slot))return;team[slot]=selected;storeTeam();slot=team.length===4?4:slot+1;selected=team[slot]??ids.findIndex((_,i)=>!team.includes(i));if(selected<0||slot===4)selected=team[3];render();}
function cancelSelection(){
 if(document.body.dataset.departing)return;
 if(slot<team.length){slot=team.length;selected=slot===4?team[3]:ids.findIndex((_,i)=>!team.includes(i));}
 else if(team.length){selected=team.pop();slot=team.length;storeTeam();}
 else{document.querySelector('a.back')?.click();return;}
 render();document.querySelector('.classcard.selected')?.focus({preventScroll:true});
}
window.CharacterSelection={cancel:cancelSelection};
function start(){if(team.length!==4||new Set(team).size!==4||document.body.dataset.departing)return;document.body.dataset.departing='true';const cover=document.createElement('div');cover.style.cssText='position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#090810;color:#f6e6b6;font:20px system-ui;text-align:center';cover.setAttribute('role','status');cover.setAttribute('aria-busy','true');cover.innerHTML='<section><h1 style="font-size:26px;color:#e9c475">게임을 준비하고 있습니다</h1><div class="game-loading-track" role="progressbar" aria-label="불러오는 중"><span class="game-loading-fill"></span></div></section>';document.body.append(cover);const url=new URL('sunken-galleon-party.html',location.href);url.search=new URLSearchParams({campaign:'1',team:team.map(i=>ids[i]).join(','),formation:'group',floor:'1',v:'normal-entry-20261030'});setTimeout(()=>{if(!window.GameScreen?.navigate?.(url.href))location.assign(url.href);},0);}
function render(){const complete=slot===4,c=classes[selected];app.innerHTML=`<header><a class="back" href="../lobby/index.html">〈 로비로</a><nav><span class="active">일반 던전 · 파티 선택</span><span>시작 스킬 선택</span><span>던전 탐험</span></nav><img class="logo" src="../imagegen/dungeon-breaker-pixel-logo-transparent-v1.webp" alt="DUNGEON BREAKER"></header><div class="body"><div class="eyebrow">CHOOSE YOUR PARTY</div><h1>${complete?'네 명의 동료가 모였습니다':`${slot+1}번 캐릭터를 선택하세요`}</h1><p class="sub">${complete?'선택한 순서로 파티가 구성됩니다. 시작 스킬을 고르고 탐험을 떠나세요.':'1번부터 4번까지 서로 다른 동료를 선택하세요. 선택한 순서로 파티가 구성됩니다.'}</p><div class="classlayout"><div class="classgrid">${classes.map((x,i)=>{const used=team.findIndex(v=>v===i);return `<button class="classcard ${selected===i?'selected':''}" data-class="${i}" ${!complete&&used>=0&&used!==slot?'disabled':''}><h3>${x[0]}</h3><span class="role">${x[1]}</span>${used>=0?`<span class="chosen">${used+1}번 ✓</span>`:''}<div class="face" style="background-position:${i%3*50}% ${Math.floor(i/3)*100}%"></div><img class="sprite" src="../battle/assets/${x[2]}" alt="${x[0]} 뒷모습"></button>`}).join('')}</div><aside class="panel detail"><div class="eyebrow">${complete?'PARTY COMPLETE':`PARTY SLOT ${slot+1}`}</div><h2>${c[0]}</h2><span class="tag">${c[1]}</span><p>${c[7]}</p>${['공격력','방어력','체력','마력'].map((name,i)=>`<div class="stat"><span>${name}</span><div class="bar"><i style="width:${c[i+3]/[100,100,4000,500][i]*100}%"></i></div></div>`).join('')}<div class="notice">${c[8]}<br>${complete?'파티 구성 완료 · 시작 스킬을 선택할 수 있습니다.':`${slot+1}번 슬롯에 배치할 동료를 확정하세요.`}</div><button class="primary" id="confirm">${complete?'시작 스킬 선택 →':`${slot+1}번 · ${c[0]} 선택 확정`}</button>${slot>0?'<button class="back-step" id="previous">〈 이전 슬롯 수정</button>':''}</aside></div><div class="partystrip" aria-label="파티 선택 순서">${Array.from({length:4},(_,i)=>`<button class="slot ${i===slot?'active':''}" data-slot="${i}" ${i>team.length?'disabled':''}>${i+1}번 · ${team[i]!==undefined?classes[team[i]][0]:'선택 대기'}<small>${i===slot?'현재 선택 중':team[i]!==undefined?'클릭하여 변경':'순서대로 선택하세요'}</small></button>`).join('')}</div></div><div class="foot"><button id="reset">처음부터 다시 선택</button><span>← ↑ ↓ → 이동 · Enter 선택 확정 · Esc 선택 취소</span></div>`;
 document.querySelectorAll('[data-class]').forEach(b=>b.onclick=()=>{if(complete){selected=Number(b.dataset.class);render();}else pick(Number(b.dataset.class));});document.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>edit(Number(b.dataset.slot)));document.getElementById('confirm').onclick=complete?start:confirm;const back=document.getElementById('previous');if(back)back.onclick=()=>edit(complete?3:slot-1);document.getElementById('reset').onclick=()=>{team=[];slot=0;selected=0;storeTeam();render();};fit();}
function fit(){const scale=Math.min(innerWidth/1600,innerHeight/900);app.style.transform=`scale(${scale})`;document.body.style.width=1600*scale+'px';document.body.style.height=900*scale+'px';}
window.addEventListener('resize',fit);
async function prepareSelection(){
 const cover=document.getElementById('selection-loading');
 const app=document.getElementById('app');
 if(!cover){readSaved();render();return;}
 if(!cover.blockInput){cover.blockInput=event=>{if(!cover.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();}};document.addEventListener('keydown',cover.blockInput,true);}
 const status=cover.querySelector('p'),bar=cover.querySelector('[role=progressbar]');
 const retry=cover.querySelector('button');
 retry.onclick=prepareSelection;retry.hidden=true;cover.setAttribute('aria-busy','true');
 let loaded=0;
 try{
  // Render off-screen so CSS backgrounds and the actual displayed URLs are used.
  readSaved();render();
  const urls=new Set([...app.querySelectorAll('img')].map(im=>im.src));
  for(const el of app.querySelectorAll('.face'))for(const match of getComputedStyle(el).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g))urls.add(match[1]);
  await Promise.all([...urls].map(async src=>{
   await GameImages.ready(src);loaded++;
   const percent=Math.round(loaded/urls.size*100);
   bar.setAttribute('aria-valuenow',percent);bar.querySelector('span').style.width=percent+'%';
   status.textContent=`초상화와 캐릭터 이미지 준비 중 · ${percent}%`;
  }));
  await document.fonts?.load('16px gal');
  await Promise.all([...app.querySelectorAll('img')].map(im=>im.decode()));
  app.hidden=false;app.inert=false;fit();
  await new Promise(resolve=>setTimeout(resolve,0));
  document.removeEventListener('keydown',cover.blockInput,true);cover.remove();app.querySelector('.classcard.selected')?.focus({preventScroll:true});
 }catch(error){console.error('Character selection loading failed',error);cover.setAttribute('aria-busy','false');status.textContent='이미지를 불러오지 못했습니다. 다시 시도해 주세요.';retry.hidden=false;}
}
prepareSelection();
