/* Dedicated pixel-art skill symbols, authored as a unified 6×6 atlas. */
(()=>{
 const descriptions={
 'living-water':'자신을 포함한 생존 아군 전체가 시전 턴과 다음 턴 종료 시 최대 MP의 10%씩 회복합니다. MP 80.',
 'mechanic-guard':'몽키스패너로 방어해 이번 적 행동 동안 받는 피해를 50% 줄입니다.', 'mechanic-item':'자신의 HP를 600 회복합니다. 층마다 3회 사용할 수 있습니다.',
 'phoenix-shot':'불사조가 모든 적을 관통하며 강한 불속성 기본 피해 2,940을 한 번 줍니다. 지속 피해는 없습니다.',
 'sniping':'한 턴 동안 활시위를 당겨 조준합니다. 다음 궁수 차례에 자동으로 3,920 기본 피해의 강력한 한 발을 발사합니다.',
 'dwarf-taunt':'이번 턴 적의 공격을 자신에게 집중시킵니다. 도발에 면역인 적은 제외됩니다.', 'dwarf-bulwark':'얼음 방패를 세워 시전 턴을 포함한 3턴 동안 받는 피해를 60% 줄입니다. 재시전하면 3턴으로 갱신합니다.', 'dwarf-bash':'방패로 적 하나를 가격해 720 피해를 줍니다.', 'dwarf-wake':'적 하나에 980 피해. 서로 다른 아군 특수기술 2개로 보스의 충전을 파훼합니다.', 'dwarf-quake':'모든 적에게 980 피해를 주고, 각각 30% 확률로 이번 턴 기절시킵니다.', 'dwarf-mjolnir':'선택한 적에게 빛의 망치를 던져 980 피해. 40% 확률로 이번 턴 기절시킵니다.',
 'stun-shot':'선택한 적에게 240 피해. 다른 아군의 특수기술과 연계해 보스 충전을 파훼합니다.', 'arrow-rain':'에메랄드 화살이 쏟아져 모든 적에게 980 기본 피해를 줍니다.', 'leg-bind':'덩굴로 적 하나를 묶습니다. 이번 턴 해당 적의 근접 이동과 피해를 막습니다.', 'leaf-wind':'나뭇잎 돌풍으로 모든 적에게 980 기본 피해를 줍니다.', 'natures-cure':'살아 있는 모든 아군의 해로운 상태를 제거합니다. 체력을 회복하지는 않습니다.', 'eagle-eye':'시전 턴을 포함한 3턴 동안 치명타 확률이 30%p 증가합니다. 재시전하면 3턴으로 갱신합니다.',
 fireball:'화염 구체로 적 하나에게 1,800 피해를 줍니다. MP 25.', 'ice-spear':'얼음 창으로 적 하나에게 1,800 피해를 줍니다. MP 25.', 'thunder-ball':'번개 구체로 적 하나에게 1,800 피해를 줍니다. MP 25.',void:'어둠의 구체로 적 하나에게 1,800 피해를 줍니다. MP 25.',meteor:'모든 적에게 2,500 피해. 이후 두 턴 동안 지면 화염이 500 피해를 줍니다. MP 60.',blizzard:'모든 적에게 1,700 피해. 각각 30% 확률로 한 번의 적 행동을 얼립니다. MP 50.',thunderstorm:'모든 적에게 1,900 피해. 각각 30% 확률로 한 번의 적 행동을 마비시킵니다. MP 50.', 'black-hole':'적을 흡수해 한 번의 행동을 봉쇄하고 이후 3,000 피해. 보스는 다른 두 아군의 파훼 후 흡수할 수 있습니다. MP 70.',
 sanctuary:'마법진에서 금빛이 올라오며 적 전체에 빛속성 기본 피해 196씩 5회(총 980)를 주고, 생존 아군 전체도 같은 양씩 회복합니다. 빛속성 적은 피해를 받지 않습니다.', 'holy-light':'선택한 적 하나에게 하늘에서 빛기둥을 내려 빛속성 피해 980을 줍니다.',blessing:'시전 턴을 포함한 3턴 동안 아군의 공격력·방어력·최대 체력을 20% 높이고, 최대 체력 증가량만큼 현재 체력도 늘립니다. 재시전하면 추가 회복 없이 3턴으로 갱신합니다.',barrier:'시전 턴을 포함한 3턴 동안 아군에게 최대 체력 30%의 보호막을 부여합니다. 소진 시 해제되며, 재시전하면 교체하고 3턴으로 갱신합니다. 초과 피해만 체력에 적용됩니다.',recovery:'체력이 가장 부족한 아군 하나의 최대 체력 30%를 회복합니다.',healing:'살아 있는 모든 아군의 최대 체력 20%를 회복합니다.',resurrection:'쓰러진 아군 하나를 최대 체력 30%로 부활시킵니다. 같은 아군은 한 번만 부활할 수 있습니다.',
 'mechanic-attack':'몽키스패너로 선택한 적 하나에게 980 피해를 줍니다.','mine-explosion':'선택한 적에게 지뢰로 240 피해. 다른 아군의 특수기술과 연계해 보스 충전을 파훼합니다.',
 'install-rivet':'리벳을 설치합니다. 매 아군 공격 후 적 하나에 260 피해. 설치 메카는 한 기만 유지합니다.', 'install-mole':'몰을 설치합니다. 매 아군 공격 후 적 하나에 460 피해. 설치 메카는 한 기만 유지합니다.', 'install-bulwark':'불워크를 설치해 메카닉이 받는 피해를 75% 줄입니다. 메카도 남은 피해를 받습니다.', 'install-swat':'스와트를 설치해 메카닉이 받는 피해를 50% 줄입니다. 메카도 남은 피해를 받습니다.', 'super-combine':'설치한 메카를 흡수해 초 합체합니다. 사용 턴을 포함해 3턴 동안 합체 전용 공격과 방어를 사용합니다.'
 };
 // Player-facing draft copy deliberately omits combat magnitudes and resource costs.
 const selectionDescriptions={
 'living-water':'자신을 포함한 살아 있는 아군 전체의 마나를 이번 턴과 다음 턴이 끝날 때 회복합니다. 다시 사용하면 지속 기간이 갱신됩니다.',
  "party-end-turn": "마나를 조금 회복하고 차례를 마칩니다. 마나 부족으로 배운 스킬을 사용할 수 없다면 체력도 조금 회복합니다.",
  "party-wait": "스킬을 사용하지 않고 다음 동료에게 행동을 넘깁니다.",
  "combined-gun": "합체 메카의 기관총으로 선택한 적을 공격합니다.",
  "combined-drill": "합체 메카의 드릴로 선택한 적을 공격합니다.",
  "combined-beam": "가슴의 빔을 충전한 뒤 다음 차례에 적 전체를 공격합니다. 합체 시간이 충분히 남아 있어야 합니다.",
  "combined-guard": "합체 메카로 이번 적 행동 동안 받는 피해를 줄입니다.",
  "dwarf-taunt": "적의 시선을 자신에게 집중시킵니다. 도발에 면역인 적에게는 통하지 않습니다.",
  "dwarf-bulwark": "얼음 방패를 세워 적의 공격으로 받는 피해를 줄입니다.",
  "dwarf-bash": "방패로 선택한 적을 가격합니다.",
  "dwarf-wake": "선택한 적을 공격합니다. 다른 동료의 특수기술과 연계해 보스의 충전을 파훼합니다.",
  "dwarf-quake": "지진으로 적 전체를 공격하며, 적을 기절시킬 수 있습니다.",
  "dwarf-mjolnir": "선택한 적에게 빛의 망치를 던지며, 적을 기절시킬 수 있습니다.",
  "phoenix-shot": "불사조가 모든 적을 관통하는 불속성 공격입니다. 지속 피해는 남기지 않습니다.",
  "sniping": "활시위를 당겨 조준한 뒤, 다음 궁수 차례에 강력한 화살을 자동으로 발사합니다.",
  "stun-shot": "선택한 적을 화살로 공격합니다. 다른 동료의 특수기술과 연계해 보스의 충전을 파훼합니다.",
  "arrow-rain": "에메랄드 화살을 쏟아 적 전체를 공격합니다.",
  "leg-bind": "덩굴로 근접 적을 공격하고 묶어 이번 턴의 근접 이동과 공격을 막습니다.",
  "leaf-wind": "나뭇잎 돌풍으로 적 전체를 공격합니다.",
  "natures-cure": "살아 있는 아군 전체의 해로운 상태를 제거합니다. 체력 회복 효과는 없습니다.",
  "eagle-eye": "예리한 눈으로 약점을 포착해 자신의 치명타 확률을 높입니다.",
  "fireball": "불속성 화염 구체로 선택한 적을 공격합니다.",
  "ice-spear": "얼음속성 창으로 선택한 적을 공격합니다.",
  "thunder-ball": "번개속성 구체로 선택한 적을 공격합니다.",
  "void": "어둠속성 구체로 선택한 적을 공격합니다.",
  "meteor": "운석으로 적 전체를 공격하고 지면에 화염을 남겨 지속 피해를 줍니다.",
  "blizzard": "눈보라로 적 전체를 공격하며, 적을 얼려 행동을 막을 수 있습니다.",
  "thunderstorm": "뇌우로 적 전체를 공격하며, 적을 마비시켜 행동을 막을 수 있습니다.",
  "black-hole": "적을 흡수해 행동을 봉쇄한 뒤 폭발 피해를 줍니다. 보스는 다른 동료들이 충전을 파훼한 뒤 흡수할 수 있습니다.",
  "sanctuary": "성역의 빛으로 적 전체를 거듭 공격하며 살아 있는 아군 전체를 회복합니다. 빛속성 적은 피해를 받지 않습니다.",
  "holy-light": "선택한 적에게 빛기둥을 내려 공격하며 보스의 충전 파훼에 참여합니다.",
  "blessing": "아군의 공격력·방어력·최대 체력을 높이고, 최대 체력 증가량만큼 현재 체력도 채웁니다. 재시전은 추가 회복 없이 지속시간만 갱신합니다.",
  "barrier": "아군에게 피해를 먼저 흡수하는 보호막을 부여합니다. 보호막을 넘는 피해는 체력에 적용됩니다.",
  "recovery": "체력이 가장 부족한 살아 있는 아군을 회복합니다.",
  "healing": "살아 있는 아군 전체의 체력을 회복합니다.",
  "resurrection": "쓰러진 아군을 부활시킵니다. 이미 부활한 동료는 다시 부활시킬 수 없습니다.",
  "mine-explosion": "선택한 적에게 지뢰를 폭발시킵니다. 다른 동료의 특수기술과 연계해 보스의 충전을 파훼합니다.",
  "mechanic-attack": "몽키스패너로 선택한 적에게 무속성 공격을 가합니다.",
  "super-combine": "서로 다른 메카들이 살아 있을 때 설치된 메카를 소모해 초 합체합니다. 합체 중에는 전용 공격과 방어를 사용합니다.",
  "mech-repair": "설치된 메카를 수리해 체력을 회복하고 활동 기간을 갱신합니다.",
  "attack": "선택한 적에게 무속성 일반 공격을 가합니다.",
  "guard": "방어 자세를 취해 이번 적 행동 동안 받는 피해를 줄입니다.",
  "item": "물약을 마셔 자신의 체력을 회복합니다. 층마다 사용할 수 있는 횟수가 제한됩니다.",
  "magic": "포효로 아군 전체의 공격력을 높입니다. 다시 사용하면 지속 기간이 갱신됩니다.",
  "hero-roar": "포효로 아군 전체의 방어력을 높입니다. 다시 사용하면 지속 기간이 갱신됩니다.",
  "sword-back": "칼등으로 선택한 적을 공격하며 보스의 충전 파훼에 참여합니다.",
  "princess-im-coming": "살아 있는 적 전체를 동시에 공격합니다.",
  "fire-slash": "검에 불속성을 담아 선택한 적을 벱니다.",
  "frost-slash": "검에 얼음속성을 담아 선택한 적을 벱니다.",
  "lightning-slash": "검에 번개속성을 담아 선택한 적을 벱니다.",
  "leaf-slash": "검에 풀속성을 담아 선택한 적을 벱니다.",
  "dark-slash": "검에 어둠속성을 담아 선택한 적을 벱니다.",
  "install-rivet": "리벳를 설치합니다. 적 행동 단계에 공격을 지원합니다. 같은 종류는 중복 설치할 수 없으며, 활동 기간이 끝나면 남은 체력에 따라 자폭합니다. 광역 공격에는 개별 피격됩니다.",
  "install-mole": "몰를 설치합니다. 적 행동 단계에 공격을 지원합니다. 같은 종류는 중복 설치할 수 없으며, 활동 기간이 끝나면 남은 체력에 따라 자폭합니다. 광역 공격에는 개별 피격됩니다.",
  "install-bulwark": "불워크를 설치합니다. 메카닉이 받는 피해를 줄이며 메카도 피해를 받습니다. 같은 종류는 중복 설치할 수 없으며, 활동 기간이 끝나면 남은 체력에 따라 자폭합니다. 광역 공격에는 개별 피격됩니다.",
  "install-swat": "스와트를 설치합니다. 메카닉이 받는 피해를 줄이며 메카도 피해를 받습니다. 같은 종류는 중복 설치할 수 없으며, 활동 기간이 끝나면 남은 체력에 따라 자폭합니다. 광역 공격에는 개별 피격됩니다."
};
 function describeSelection(role,skill){
  const id=skill.id;
  if(id.endsWith('-potion')||id==='mechanic-item')return selectionDescriptions.item;
  if(id.endsWith('-guard'))return selectionDescriptions.guard;
  if(['dwarf-attack','archer-attack','mechanic-common-strike'].includes(id))return selectionDescriptions.attack;
  return selectionDescriptions[id]||skill.name||'이 스킬을 사용합니다.';
 }
 const heroIconIds=["attack", "guard", "item", "magic", "hero-roar", "fire-slash", "frost-slash", "lightning-slash", "leaf-slash", "dark-slash", "sword-back", "princess-im-coming"];
 const iconIds=["dwarf-taunt", "dwarf-bulwark", "dwarf-bash", "dwarf-wake", "dwarf-quake", "dwarf-mjolnir", "stun-shot", "sniping", "arrow-rain", "leg-bind", "leaf-wind", "natures-cure", "eagle-eye", "fireball", "ice-spear", "thunder-ball", "void", "meteor", "blizzard", "thunderstorm", "black-hole", "blessing", "barrier", "recovery", "healing", "resurrection", "mine-explosion", "install-rivet", "install-mole", "install-bulwark", "install-swat", "super-combine", "mechanic-attack", "holy-light", "reroll", "selected"];
 window.SkillDraftData={describeSelection,catalog(role){const source=role==='hero'?PartyHero.specs:role==='dwarf'?DwarfSkills.skills:role==='archer'?ArcherSkills.specs:role==='wizard'?WizardSkills.specs:role==='priest'?{...HealerSkills.specs,resurrection:{name:'부활의 기도'}}:PartyMechanic.specs;return (Array.isArray(source)?source:Object.entries(source).map(([id,s])=>({id,...s}))).concat(window.PartyBasicActions?.catalog(role)||[]).filter(s=>!s.id.startsWith('combined-')).map(s=>({icon:0,...s,description:window.PartyResources?.describe(role,s.id,window.MONSTER_BALANCE_DATA?.players[role+':'+s.id]?.description||s.description||descriptions[s.id]||s.name)||(s.description||descriptions[s.id]||s.name)}));},icon(id){if(id==='living-water')return '<span class="draft-emblem" aria-hidden="true"><span class="draft-skill-icon" data-icon="living-water" style="background-image:url(../skills/healer-living-water-v1/status-icons.webp);background-size:100% 100%;background-position:center"></span></span>';const cutout={reroll:"reroll-transparent-v1/reroll",selected:"selected-transparent-v1/selected"};if(cutout[id])return `<span class="draft-emblem" aria-hidden="true"><span class="draft-skill-icon" data-icon="${id}" style="background-image:url(skill-draft/${cutout[id]}.webp);background-size:100% 100%;background-position:center"></span></span>`;const latest={"mechanic-attack":"monkey-crush"};if(latest[id])return `<span class="draft-emblem" aria-hidden="true"><span class="draft-skill-icon" data-icon="${id}" style="background-image:url(skill-draft/monkey-refresh-v1/${latest[id]}.webp);background-size:100% 100%;background-position:center"></span></span>`;const corrected={"sword-back": "hero-sword-back", "princess-im-coming": "hero-princess", "archer-attack": "archer-basic", "dwarf-taunt": "dwarf-taunt", "dwarf-bulwark": "dwarf-bulwark", "dwarf-bash": "dwarf-bash", "stun-shot": "stun-shot", "eagle-eye": "eagle-eye", "reroll": "reroll"};if(corrected[id])return `<span class="draft-emblem" aria-hidden="true"><span class="draft-skill-icon" data-icon="${id}" style="background-image:url(skill-draft/icon-refinements-v3-20261029/${corrected[id]}.webp);background-size:100% 100%;background-position:center"></span></span>`;if(id.endsWith('-potion')||id==='mechanic-item')id='item';const basicIndex=['dwarf-attack','dwarf-guard','archer-attack','archer-guard'].indexOf(id);if(basicIndex>=0)return `<span class="draft-emblem" aria-hidden="true"><span class="draft-skill-icon" data-icon="${id}" style="background-image:url(skill-draft/basic-icons-v1/atlas.webp);background-size:300% 200%;background-position:${basicIndex%3*50}% ${Math.floor(basicIndex/3)*100}%"></span></span>`;if(['mechanic-attack','mechanic-common-strike','mechanic-guard'].includes(id))return `<span class="draft-emblem" aria-hidden="true"><span class="draft-skill-icon" data-icon="${id}" style="background-image:url(skill-draft/wrench-icons-v1/atlas.webp);background-size:200% 100%;background-position:${id==='mechanic-guard'?100:0}% 0%"></span></span>`;const heroIndex=heroIconIds.indexOf(id);if(heroIndex>=0)return `<span class="draft-emblem" aria-hidden="true"><span class="draft-skill-icon" data-icon="${id}" style="background-image:url(skill-draft/hero-icons-v1/atlas.webp);background-size:400% 300%;background-position:${heroIndex%4*100/3}% ${Math.floor(heroIndex/4)*50}%"></span></span>`;if(id==='sanctuary')return '<span class="draft-emblem" aria-hidden="true"><span class="draft-skill-icon" data-icon="sanctuary" style="background-image:url(skill-draft/sanctuary-v1/icon.webp);background-size:100% 100%"></span></span>';if(id==='phoenix-shot')return '<span class="draft-emblem" aria-hidden="true"><span class="draft-skill-icon" data-icon="phoenix-shot" style="background-image:url(skill-draft/phoenix-shot-v1/icon.webp);background-size:100% 100%"></span></span>';const index=iconIds.indexOf(id);if(index<0)return '';return `<span class="draft-emblem" aria-hidden="true"><span class="draft-skill-icon" data-icon="${id}" style="background-position:${index%6*20}% ${Math.floor(index/6)*20}%"></span></span>`;}};
})();
