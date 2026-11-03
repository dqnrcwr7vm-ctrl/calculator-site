(function(root){
'use strict';
const data=root.MONSTER_BALANCE_DATA||{monsters:{},skills:{},affixes:[],matchups:{}};
const BALANCE=Object.freeze({midBossHealthBonus:.15,baseBossAffixes:1,maxFinalBossAffixes:3});
const normalize=e=>({'무속성':'neutral','일반':'neutral','불':'fire','물':'water','풀':'grass','빛':'light','어둠':'dark','암':'dark','얼음':'ice','번개':'lightning','바람':'wind','땅':'earth','독':'poison','미정':'neutral','해당 없음':'neutral'}[e]||e||'neutral');
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function random(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function roll(key,count,seed){const a=[...data.affixes],rng=random(hash(seed+':'+key));for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,Math.max(0,Math.min(count,a.length))).map(a=>a.id);}
function affixCount(m,options={}){
 const boss=m.rank==='중간 보스'||m.rank==='최종 보스';if(!boss)return 0;
 const floors=Array.isArray(options.contractMissionFloors)?options.contractMissionFloors:[];
 const bonus=m.rank==='최종 보스'?new Set(floors.filter(f=>f===3||f===6)).size:0;
 return Math.min(BALANCE.maxFinalBossAffixes,BALANCE.baseBossAffixes+bonus);
}
function stats(id,seed,override,options={}){const m=data.monsters[id];if(!m)return null;const count=affixCount(m,options),affixes=override||roll(id,count,seed),value=key=>affixes.includes(key)?data.affixes.find(a=>a.id===key)?.value||0:0;return {...m,affixCount:count,affixes,hp:Math.round(m.hp*(1+(m.rank==='중간 보스'?Math.min(value('health'),BALANCE.midBossHealthBonus):value('health')))),defense:m.defense+value('defense'),magicDefense:m.magicDefense+value('magic-defense'),attack:Math.round(m.attack*(1+value('attack'))),magicAttack:Math.round(m.magicAttack*(1+value('magic-attack'))),evasion:value('evasion'),resistance:Object.fromEntries(['fire','water','grass','light','dark'].map(e=>[e,value('resist-'+e)]))};}
const multiplier=(attack,defense)=>data.matchups[normalize(attack)+':'+normalize(defense)]??1;
// Contact and HP loss are independent: a ward can absorb a landed attack.
// Resolve evasion once, and keep the numeric receive API for existing callers.
function resolveHit(m,amount,hit={},rng=Math.random){
 if(!m||amount<=0)return {damage:Math.max(0,amount),landed:amount>0};
 if(!hit.dot&&rng()<m.evasion)return {damage:0,landed:false};
 const type=hit.damageType||'physical',element=normalize(hit.element);
 return {damage:Math.max(0,Math.round(amount*multiplier(element,m.element)*(1-(m.resistance[element]||0))/(1+(type==='magic'?m.magicDefense:m.defense)))),landed:true};
}
function receive(m,amount,hit={},rng=Math.random){return resolveHit(m,amount,hit,rng).damage;}
function outgoing(m,amount,type='physical',element='neutral',targetElement='neutral'){if(!m)return amount;const id=type==='magic'?'magic-attack':'attack',bonus=m.affixes.includes(id)?data.affixes.find(a=>a.id===id).value:0;return Math.round(amount*(1+bonus)*multiplier(element,targetElement));}
const api={BALANCE,data,normalize,hash,random,roll,affixCount,stats,multiplier,resolveHit,receive,outgoing};if(typeof module==='object'&&module.exports)module.exports=api;root.MonsterBalance=api;
})(typeof window!=='undefined'?window:globalThis);
