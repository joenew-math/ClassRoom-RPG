/*

 * classroom-skill-data：由主程式分離的固定資料定義。

 * 本檔必須在原主程式之前以一般 script 載入。

 */

const LEVEL_CAP = 99;

const GRADE_MILESTONES = [
  {grade:"七年級", level:30, cumXp:43500,  dailyCap:160, questYear:13100},
  {grade:"八年級", level:60, cumXp:177000, dailyCap:490, questYear:40400},
  {grade:"九年級", level:90, cumXp:400500, dailyCap:825, questYear:66800},
  {grade:"畢業衝刺", level:99, cumXp:485100, dailyCap:825, questYear:0}
];

const SKILL_BRANCHES = {
  Warrior: [["atk","⚔️ 攻擊"],["def","🛡 防禦"],["sur","❤️ 生存"]],
  Mage:    [["fire","🔥 火系"],["thunder","⚡ 雷系"],["ice","❄️ 冰系"]],
  Rogue:   [["burst","🗡 爆發"],["gold","🪤 陷阱"],["support","🎯 輔助"]],
  Cleric:  [["heal","💚 治療"],["buff","✨ 增益"],["smite","🔨 懲擊"]],
};

const BRANCH_GATE = [0, 3, 6, 9];

const SKILL_TREES = {
  common: [],   // v124:已移除共用技能(財富嗅覺/勤學/強健);金幣與XP加成改由鑽石商店道具提供
  Warrior: [
    { id:"slash",  name:"戰吼", icon:"📣", branch:"atk", pos:1, kind:"aura", aura:"atk", short:"全隊攻+", desc:(v,c)=>c+"% 機率發動,全組攻擊 +10%(持續一回合)", chance:[12,14,16,18,20], val:[0.1,0.1,0.1,0.1,0.1] },
    { id:"bash",   name:"重擊", icon:"💥", branch:"atk", pos:2, kind:"atk", short:"擊暈", desc:(v,c)=>c+"% 機率 1.8 倍傷害", chance:[15,20,25,30,35], val:[1.8,1.8,1.8,1.8,1.8] },
    { id:"execute",name:"斬殺", icon:"☠️", branch:"atk", pos:3, kind:"atk", short:"斬殺", desc:(v,c)=>"Boss 血量低於 30% 時，"+c+"% 機率 2.5 倍傷害", chance:[20,25,30,35,40], val:[2.5,2.5,2.5,2.5,2.5] },
    { id:"harden", name:"守護號令", icon:"🛡", branch:"def", pos:1, kind:"aura", aura:"def", short:"全隊減傷", desc:(v,c)=>c+"% 機率發動,全組受傷 -15%(持續一回合)", chance:[12,14,16,18,20], val:[0.15,0.15,0.15,0.15,0.15] },
    { id:"block",  name:"格擋", icon:"🧱", branch:"def", pos:2, kind:"def", short:"格擋", desc:(v,c)=>c+"% 機率擋下一半傷害", chance:[15,20,25,30,35], val:[0.5,0.5,0.5,0.5,0.5] },
    { id:"thorns", name:"荊棘", icon:"🌵", branch:"def", pos:3, kind:"def", short:"反傷", desc:(v,c)=>c+"% 機率反彈 50% 傷害", chance:[10,15,20,25,30], val:[0.5,0.5,0.5,0.5,0.5] },
    { id:"vigor",  name:"鼓舞", icon:"💪", branch:"sur", pos:1, kind:"aura", aura:"heal", short:"全隊回血", desc:(v,c)=>c+"% 機率發動,全組回 "+10+" HP", chance:[12,14,16,18,20], val:[10,10,10,10,10] },
    { id:"taunt",  name:"嘲諷", icon:"📢", branch:"sur", pos:2, kind:"def", short:"減傷", desc:(v,c)=>"代承受時額外減傷 "+Math.round(v*100)+"%", chance:[0,0,0,0,0], val:[0.1,0.15,0.2,0.25,0.3] },
    { id:"endure", name:"不屈", icon:"🔥", branch:"sur", pos:3, kind:"def", short:"保命", desc:(v,c)=>"致命傷 "+c+"% 機率保留 1 HP（每場一次）", chance:[20,30,40,50,60], val:[1,1,1,1,1] },
  ],
  Mage: [
    { id:"firebolt",name:"魔力共鳴", icon:"🔮", branch:"fire", pos:1, kind:"aura", aura:"atk", short:"全隊攻+", desc:(v,c)=>c+"% 機率發動,全組攻擊 +15%(持續一回合)", chance:[12,14,16,18,20], val:[0.15,0.15,0.15,0.15,0.15] },
    { id:"blast",   name:"爆裂", icon:"💥", branch:"fire", pos:2, kind:"atk", short:"爆擊", desc:(v,c)=>c+"% 機率 2 倍傷害", chance:[12,17,22,27,32], val:[2,2,2,2,2] },
    { id:"meteor",  name:"隕石", icon:"☄️", branch:"fire", pos:3, kind:"atk", short:"隕石", desc:(v,c)=>c+"% 機率 3 倍傷害並震懾 Boss", chance:[6,9,12,15,18], val:[3,3,3,3,3] },
    { id:"spark",   name:"電擊", icon:"⚡", branch:"thunder", pos:1, kind:"atk", short:"連擊", desc:(v,c)=>c+"% 機率追加半傷", chance:[15,20,25,30,35], val:[0.5,0.5,0.5,0.5,0.5] },
    { id:"chain",   name:"連鎖閃電", icon:"🌩", branch:"thunder", pos:2, kind:"atk", short:"跳電", desc:(v,c)=>c+"% 機率命中後依序跳擊附近最多 3 名敵人（傷害逐跳遞減）", chance:[10,14,18,22,26], val:[0.5,0.5,0.5,0.5,0.5] },
    { id:"storm",   name:"風暴", icon:"🌪", branch:"thunder", pos:3, kind:"atk", short:"風暴", desc:(v,c)=>c+"% 機率對全班標記破綻（下一擊+30%）", chance:[10,14,18,22,26], val:[1.3,1.3,1.3,1.3,1.3] },
    { id:"frost",   name:"冰箭", icon:"❄️", branch:"ice", pos:1, kind:"atk", short:"減攻", desc:(v,c)=>c+"% 機率使 Boss 下次反擊減半", chance:[15,20,25,30,35], val:[0.5,0.5,0.5,0.5,0.5] },
    { id:"freeze",  name:"凍結", icon:"🧊", branch:"ice", pos:2, kind:"atk", short:"凍結", desc:(v,c)=>c+"% 機率讓 Boss 該回合不反擊", chance:[8,11,14,17,20], val:[1,1,1,1,1] },
    { id:"blizzard",name:"暴風雪", icon:"🌨", branch:"ice", pos:3, kind:"atk", short:"範圍", desc:(v,c)=>c+"% 機率召喚暴風雪:目標周圍 1 格全體受 50% 濺射傷害並冰緩（對單體 Boss 為 2.2 倍冰擊）", val:[50,50,50,50,50], chance:[12,16,20,24,28] },
  ],
  Rogue: [
    { id:"edge",    name:"暴擊", icon:"🗡", branch:"burst", pos:1, kind:"atk", short:"暴擊", desc:(v,c)=>c+"% 機率 2 倍傷害", chance:[12,17,22,27,32], val:[2,2,2,2,2] },
    { id:"lethal",  name:"致命", icon:"☠️", branch:"burst", pos:2, kind:"atk", short:"致命", desc:(v,c)=>c+"% 機率 2.5 倍傷害", chance:[8,11,14,17,20], val:[2.5,2.5,2.5,2.5,2.5] },
    { id:"shadow",  name:"影襲", icon:"🌑", branch:"burst", pos:3, kind:"atk", short:"連影", desc:(v,c)=>c+"% 機率立刻再攻擊一次", chance:[10,14,18,22,26], val:[1,1,1,1,1] },
    { id:"pocket",  name:"煙霧彈", icon:"💨", branch:"gold", pos:1, kind:"atk", short:"致盲", desc:(v,c)=>c+"% 機率丟出煙霧彈:目標致盲 2 秒,期間攻擊 55% 落空(團體戰)", chance:[10,13,16,19,22], val:[55,55,55,55,55] },
    { id:"greed",   name:"重力井", icon:"🕳", branch:"gold", pos:2, kind:"atk", short:"範圍毒", desc:(v,c)=>c+"% 機率佈下重力井:目標與周圍 1 格全體中毒 2 秒,每 0.5 秒 -"+v, chance:[10,13,16,19,22], val:[3,4,5,6,7] },
    { id:"treasure",name:"禁咒符", icon:"🈲", branch:"gold", pos:3, kind:"atk", short:"沉默", desc:(v,c)=>c+"% 機率貼上禁咒符:目標沉默 3 秒,無法使用職業技與觸發技能", chance:[12,15,18,21,24], val:[1,1,1,1,1] },
    { id:"expose",  name:"破綻", icon:"🎯", branch:"support", pos:1, kind:"atk", short:"破綻", desc:(v,c)=>c+"% 機率標記破綻（全班下一擊+40%）", chance:[15,20,25,30,35], val:[1.4,1.4,1.4,1.4,1.4] },
    { id:"poison",  name:"毒刃", icon:"🐍", branch:"support", pos:2, kind:"atk", short:"中毒", desc:(v,c)=>c+"% 機率使 Boss 下 3 回合每次 -"+Math.round(v)+"（此處顯示每層）", chance:[25,30,35,40,45], val:[5,7,9,11,13] },
    { id:"agi",     name:"疾風令", icon:"🏃", branch:"support", pos:3, kind:"aura", aura:"expose", short:"全隊破綻", desc:(v,c)=>c+"% 機率發動,全組下次攻擊命中破綻(+30%)", chance:[12,14,16,18,20], val:[1.3,1.3,1.3,1.3,1.3] },
  ],
  Cleric: [
    { id:"heal",    name:"小治療", icon:"💚", branch:"heal", pos:1, kind:"atk", short:"治療", desc:(v,c)=>c+"% 機率治療同組血最少者 "+v+" HP", chance:[30,35,40,45,50], val:[15,18,21,24,27] },
    { id:"groupheal",name:"群療", icon:"🌿", branch:"heal", pos:2, kind:"atk", short:"群療", desc:(v,c)=>c+"% 機率治療全組 "+v+" HP", chance:[15,20,25,30,35], val:[10,13,16,19,22] },
    { id:"revive",  name:"復活", icon:"💗", branch:"heal", pos:3, kind:"def", short:"復活", desc:(v,c)=>"同組有人倒下 "+c+"% 機率復活（20 HP）", chance:[20,30,40,50,60], val:[20,20,20,20,20] },
    { id:"faith",   name:"聖歌", icon:"🎵", branch:"buff", pos:1, kind:"aura", aura:"heal", short:"全隊回血", desc:(v,c)=>c+"% 機率發動,全組回 "+12+" HP", chance:[12,14,16,18,20], val:[12,12,12,12,12] },
    { id:"shield",  name:"聖盾", icon:"🔰", branch:"buff", pos:2, kind:"def", short:"護盾", desc:(v,c)=>"同組被攻擊 "+c+"% 機率吸收 30% 傷害", chance:[15,20,25,30,35], val:[0.3,0.3,0.3,0.3,0.3] },
    { id:"aegis",   name:"庇護", icon:"🛡", branch:"buff", pos:3, kind:"passive", short:"減傷", desc:(v)=>"全組受 Boss 傷害 -"+v+"%", val:[2,4,6,8,10], chance:null },
    { id:"smite",   name:"聖光", icon:"🌟", branch:"smite", pos:1, kind:"atk", short:"聖擊", desc:(v,c)=>c+"% 機率 1.8 倍傷害", chance:[20,25,30,35,40], val:[1.8,1.8,1.8,1.8,1.8] },
    { id:"judge",   name:"審判", icon:"⚖️", branch:"smite", pos:2, kind:"atk", short:"審判", desc:(v,c)=>c+"% 機率 2.2 倍傷害", chance:[12,16,20,24,28], val:[2.2,2.2,2.2,2.2,2.2] },
    { id:"wrath",   name:"天罰", icon:"🔨", branch:"smite", pos:3, kind:"atk", short:"爆發", desc:(v,c)=>c+"% 機率降下天罰:2.8 倍神聖傷害,並使目標暈眩 0.5 秒", val:[2.8,2.8,2.8,2.8,2.8], chance:[10,13,16,19,22] },
  ],
};

const JOB_ADVANCEMENT = {
  Warrior:{
    2:[['knight_charge','守護衝鋒','🐎','atk','power'],['lance_combo','騎士重擊','🔱','atk','power'],['valor_strike','英勇斬擊','💥','atk','power'],['shield_wall','盾牆','🧱','def','ward'],['intercept','援護','🫱','def','ward'],['counter_stance','反擊姿態','⚔️','def','power'],['rally','挑戰旗幟','🚩','sur','ward'],['iron_will','鋼鐵意志','💪','sur','ward'],['guardian_oath','守護誓約','🤝','sur','ward'],['shield_squire','盾衛侍從','🛡️','def','ward']],
    3:[['holy_guard','聖盾領域','🛡️','atk','ward'],['radiant_blade','神聖斬擊','✨','atk','power'],['skyward_slash','王者號令','⚔️','atk','power'],['king_banner','王者軍旗','🚩','def','power'],['fortress','無畏堡壘','🏰','def','ward'],['sacred_counter','神聖反擊','⚡','def','power'],['vanguard','先鋒意志','🦁','sur','power'],['last_stand','最後防線','🔥','sur','ward'],['heaven_guard','天穹守護','🌤️','sur','ward']]
  },
  Mage:{
    2:[['ember_path','烈焰路徑','🔥','fire','power'],['flame_orbit','熾焰環繞','🟠','fire','power'],['lava_burst','熔岩爆發','🌋','fire','power'],['flame_familiar','焰靈使魔','🔥','fire','power'],['chain_storm','連鎖雷擊','🌩️','thunder','power'],['arcane_surge','元素共鳴','🔮','thunder','power'],['thunder_prison','法力爆發','⚡','thunder','ward'],['ice_armor','冰霜護甲','🧊','ice','ward'],['cold_snap','寒霜脈衝','❄️','ice','ward'],['crystal_barrier','水晶結界','💎','ice','ward']],
    3:[['rift','時空裂縫','🌀','fire','power'],['solar_flare','熔岩隕落','☀️','fire','power'],['elemental_doom','元素末日','☄️','fire','power'],['polar_domain','極寒領域','❄️','thunder','ward'],['storm_core','雷雲風暴','🌩️','thunder','power'],['mana_overflow','元素洪流','💠','thunder','power'],['absolute_zero','絕對零度','🧊','ice','ward'],['ice_comet','冰晶彗星','☄️','ice','power'],['world_freeze','永凍結界','🌨️','ice','ward']]
  },
  Rogue:{
    2:[['pierce_arrow','穿透箭','🏹','burst','power'],['rapid_fire','多重射擊','🎯','burst','power'],['hunter_mark','獵人印記','👁️','burst','power'],['hunter_trap','獵人陷阱','🪤','gold','power'],['smoke_screen','煙幕領域','🌫️','gold','ward'],['poison_mine','毒霧地雷','☠️','gold','power'],['swift_evade','急速迴避','💨','support','ward'],['windwalk','疾風步','🏃','support','tempo'],['eagle_eye','鷹眼','🦅','support','power'],['shadow_wolf','影獵狼','🐺','support','power']],
    3:[['shadow_clone','影分身','👥','burst','power'],['phantom_combo','幻影連擊','🗡️','burst','power'],['death_mark','死亡印記','💀','burst','power'],['flash_step','瞬步','💫','gold','tempo'],['void_trap','虛空陷阱','🕳️','gold','ward'],['silent_hunt','無聲獵殺','🤫','gold','power'],['arrow_rain','箭雨','🌧️','support','power'],['wind_soul','風之靈','🌪️','support','tempo'],['thousand_arrows','萬箭穿心','🏹','support','power']]
  },
  Cleric:{
    2:[['cleanse','淨化','✨','heal','ward'],['renewal','回春術','🌱','heal','heal'],['healing_wave','治癒之波','🌊','heal','heal'],['regeneration','再生祝福','🍀','buff','heal'],['holy_link','神聖鏈結','🔗','buff','ward'],['blessing_light','祝福之光','💫','buff','ward'],['holy_sprite','聖光精靈','🕊️','buff','heal'],['sacred_bolt','神聖箭','🌟','smite','power'],['purify_smite','淨化審判','⚖️','smite','power'],['light_spear','光之長槍','🔆','smite','power']],
    3:[['life_domain','生命領域','💚','heal','heal'],['mass_restore','聖靈降臨','🌿','heal','heal'],['resurrection_hymn','救贖','🎵','heal','ward'],['salvation','守護救贖','💗','buff','ward'],['angel_wing','天使之翼','🪽','buff','ward'],['miracle_sanctum','奇蹟聖域','🌟','buff','heal'],['divine_sentence','神罰','🔨','smite','power'],['holy_comet','聖光彗星','☄️','smite','power'],['eternal_prayer','永恆祈禱','🙏','smite','ward']]
  }
};

const TIER_EFFECT_TEXT = {power:'造成傷害 +',ward:'受到傷害 -',heal:'治療效果 +',tempo:'行動速度 +'};

const LEGENDARY_SKILL_TEXT = {
  skyward_slash:'終極：王者號令震盪敵陣、壓制施法，並以軍旗鼓舞全隊攻勢。',
  sacred_counter:'終極：神聖反擊展開反擊堡壘，保護隊友並強制附近敵人迎戰。',
  heaven_guard:'終極：詠唱後淨化全隊並展開「天空領域」；領域內持續減傷、解除冰緩與沉默。',
  elemental_doom:'終極：短暫詠唱後轟下全範圍元素災變，爆燃、冰緩、沉默並留下災變地帶。',
  mana_overflow:'終極：元素洪流讓全隊加速增傷，雷雲同時壓制敵方技能。',
  world_freeze:'終極：永凍結界凍結大片敵人，並留下持續冰緩的極寒領域。',
  death_mark:'終極：死亡印記揭露所有敵人的弱點，讓全隊能立刻集火收割。',
  silent_hunt:'終極：無聲獵殺讓全隊隱入暗影，並在敵陣投下虛空陷阱。',
  thousand_arrows:'終極：鎖定印記目標後詠唱箭陣，連射並在落點留下壓制移動的萬箭領域。',
  resurrection_hymn:'終極：救贖聖歌最多喚回兩名倒下隊友，並留下持續守護的聖域。',
  miracle_sanctum:'終極：詠唱奇蹟聖域，復活倒下隊友、全隊大量治療與護盾，持續恢復生命。'
  ,eternal_prayer:'終極：永恆祈禱淨化並恢復全隊，留下不滅生命領域。'
};

const ULTIMATE_TRIGGER_TEXT = {
  skyward_slash:'3 名敵人進入戰區',sacred_counter:'2 名隊友受傷且敵人逼近',heaven_guard:'多名隊友受傷或受控',
  elemental_doom:'3 名敵人聚集',mana_overflow:'敵我交鋒且至少 2 名隊友在場',world_freeze:'敵人聚集且隊友受控',
  death_mark:'至少 2 名敵人有印記',silent_hunt:'自身殘血且敵人逼近',thousand_arrows:'至少 2 名敵人有印記',
  resurrection_hymn:'有倒下隊友',miracle_sanctum:'有倒下隊友或 3 名隊友殘血',eternal_prayer:'2 名隊友受控或 3 名隊友殘血'
};

const SKILL_COUNTER_TEXT = {
  bash:'壓制神官治療',knight_charge:'壓制神官治療並破壞守護',lance_combo:'連擊壓制神官治療',
  radiant_blade:'聖光劍氣壓制神官治療',skyward_slash:'王者威壓延長治療封鎖',sacred_counter:'反擊封鎖神官治療',
  shield:'抵抗法師傷害',aegis:'庇護隊伍抵抗法術',cleanse:'受法術控制後自動淨化',
  holy_link:'鏈結分散法術傷害',salvation:'救贖抵抗法術並解控',angel_wing:'法術命中後淨化控制',eternal_prayer:'高階抗法與淨化',
  spark:'法術必中並擾亂遊俠行動',chain:'必中並鎖定附近遊俠',frost:'必中且壓低遊俠行動條',
  freeze:'必中並揭露遊俠',blizzard:'範圍法術無視閃避',chain_storm:'連鎖鎖定遊俠',
  storm_core:'雷雲壓制遊俠速度',rift:'時空鎖定遊俠',world_freeze:'永凍領域無視閃避',
  smoke_screen:'閃過戰士物攻後搶先行動',swift_evade:'提高對戰士閃避上限',windwalk:'閃避後疾退並加速',
  flash_step:'閃避戰士後累積行動條',wind_soul:'風之靈提高反擊節奏'
};

const WARRIOR_ADVANCE_RULES = {
  knight_charge:{name:'守護衝鋒',chance:[12,15,18,21,24],val:[1.35,1.45,1.55,1.65,1.8],desc:(v,c)=>c+'% 機率衝鋒，造成 '+v+' 倍傷害'},
  lance_combo:{name:'騎槍連擊',chance:[10,13,16,19,22],val:[1.4,1.5,1.6,1.7,1.85],desc:(v,c)=>c+'% 機率連刺，造成 '+v+' 倍傷害'},
  valor_strike:{name:'英勇打擊',chance:[8,11,14,17,20],val:[1.6,1.75,1.9,2.05,2.2],desc:(v,c)=>c+'% 機率英勇重擊，造成 '+v+' 倍傷害'},
  radiant_blade:{name:'光耀劍氣',chance:[10,13,16,19,22],val:[1.5,1.65,1.8,1.95,2.1],desc:(v,c)=>c+'% 機率放出劍氣，造成 '+v+' 倍傷害'},
  skyward_slash:{name:'破空斬',chance:[6,8,10,12,15],val:[2,2.15,2.3,2.45,2.6],desc:(v,c)=>c+'% 機率破空斬，造成 '+v+' 倍傷害'},
  counter_stance:{name:'反擊姿態',chance:[12,15,18,21,24],val:[.2,.25,.3,.35,.4],desc:(v,c)=>'受擊時 '+c+'% 機率反擊，反彈 '+Math.round(v*100)+'% 傷害'},
  sacred_counter:{name:'神聖反擊',chance:[8,10,12,14,16],val:[.25,.3,.35,.4,.45],desc:(v,c)=>'受擊時 '+c+'% 機率神聖反擊，反彈 '+Math.round(v*100)+'% 傷害'}
};

const ADVANCE_ATTACK_RULES = {
  ember_path:[1.3,1.4,1.5,1.6,1.7], flame_orbit:[1.4,1.5,1.6,1.7,1.85], lava_burst:[1.7,1.85,2,2.15,2.3],
  chain_storm:[1.35,1.45,1.55,1.65,1.8], arcane_surge:[1.45,1.55,1.65,1.75,1.9], rift:[1.7,1.85,2,2.15,2.3], solar_flare:[1.9,2.05,2.2,2.35,2.5], elemental_doom:[2.1,2.25,2.4,2.55,2.7], storm_core:[1.5,1.6,1.7,1.8,1.95], mana_overflow:[1.55,1.65,1.75,1.85,2.0], ice_comet:[1.75,1.9,2.05,2.2,2.4],
  pierce_arrow:[1.3,1.4,1.5,1.6,1.75], rapid_fire:[1.4,1.5,1.6,1.7,1.85], hunter_mark:[1.55,1.65,1.75,1.85,2], hunter_trap:[1.35,1.45,1.55,1.65,1.8], poison_mine:[1.5,1.6,1.7,1.8,1.95], shadow_clone:[1.55,1.65,1.75,1.85,2], phantom_combo:[1.8,1.95,2.1,2.25,2.4], death_mark:[2,2.15,2.3,2.45,2.6], silent_hunt:[1.6,1.7,1.8,1.9,2.05], arrow_rain:[1.65,1.8,1.95,2.1,2.25], thousand_arrows:[2.1,2.25,2.4,2.55,2.7],
  sacred_bolt:[1.35,1.45,1.55,1.65,1.8], purify_smite:[1.55,1.65,1.75,1.85,2], light_spear:[1.7,1.85,2,2.15,2.3], divine_sentence:[1.9,2.05,2.2,2.35,2.5], holy_comet:[2,2.15,2.3,2.45,2.6]
};

const ADVANCE_SIGNATURE_DESC = {
  knight_charge:(v,c)=>c+'% 機率守護衝鋒：獲得減傷並強制目標優先攻擊自己',
  lance_combo:(v,c)=>c+'% 機率騎士重擊：造成 '+v+' 倍傷害後追加一次追擊',
  valor_strike:(v,c)=>c+'% 機率英勇斬擊：造成 '+v+' 倍傷害並回復自身 HP',
  chain_storm:(v,c)=>c+'% 機率連鎖雷擊：命中後跳擊附近最多 3 名敵人（每跳 '+Math.round(v*35)+'% 傷害）',
  ember_path:(v,c)=>c+'% 機率烈焰路徑：命中後施加持續灼燒',
  flame_orbit:(v,c)=>c+'% 機率熾焰環繞：對目標周圍造成爆散傷害',
  lava_burst:(v,c)=>c+'% 機率熔岩爆發：造成 '+v+' 倍傷害與強力範圍爆炸',
  arcane_surge:(v,c)=>c+'% 機率元素共鳴：短時間提升後續攻擊',
  pierce_arrow:(v,c)=>c+'% 機率穿透箭：命中並波及目標後方敵人',
  rapid_fire:(v,c)=>c+'% 機率多重射擊：造成 '+v+' 倍傷害並追加箭矢',
  hunter_mark:(v,c)=>c+'% 機率標記目標，讓萬箭穿心能跨目標追擊',
  hunter_trap:(v,c)=>c+'% 機率在目標前方放置地面陷阱；敵人走入才會受傷並被困住',
  poison_mine:(v,c)=>c+'% 機率毒霧地雷，使目標與周圍敵人持續中毒',
  arrow_rain:(v,c)=>c+'% 機率箭雨覆蓋目標周圍敵人',
  sacred_bolt:(v,c)=>c+'% 機率神聖箭，同時回復血量最低的隊友',
  purify_smite:(v,c)=>c+'% 機率淨化審判，傷害並清除自身異常',
  light_spear:(v,c)=>c+'% 機率光之長槍，貫穿並造成高額傷害',
  radiant_blade:(v,c)=>c+'% 機率神聖斬擊：聖光濺射附近敵人',
  skyward_slash:(v,c)=>c+'% 機率王者號令：追加斬擊並壓制目標',
  rift:(v,c)=>c+'% 機率時空裂縫：拉住目標並撕裂附近敵人',
  solar_flare:(v,c)=>c+'% 機率熔岩隕落：範圍爆燃與灼燒',
  storm_core:(v,c)=>c+'% 機率雷雲風暴：連鎖雷擊跳躍更多敵人',
  ice_comet:(v,c)=>c+'% 機率冰晶彗星：範圍冰緩並造成重擊',
  shadow_clone:(v,c)=>c+'% 機率影分身：分身立刻補上一擊',
  phantom_combo:(v,c)=>c+'% 機率幻影連擊：連續兩次追擊',
  death_mark:(v,c)=>c+'% 機率死亡印記：長時間暴露目標弱點',
  silent_hunt:(v,c)=>c+'% 機率無聲獵殺：重擊後隱身撤離',
  arrow_rain:(v,c)=>c+'% 機率箭雨覆蓋大範圍地面',
  divine_sentence:(v,c)=>c+'% 機率神罰：沉默並短暫凍結目標',
  holy_comet:(v,c)=>c+'% 機率聖光彗星：範圍神聖傷害並回復隊友'
};

const ADVANCE_SUMMON_RULES = {
  shield_squire:{chance:[10,13,16,19,22],val:[5,6,7,8,9],desc:(v,c)=>c+'% 機率召喚盾衛侍從 '+(v+8)+' 拍，為 2 格內隊友分攤傷害並施加防護'},
  flame_familiar:{chance:[10,13,16,19,22],val:[4,5,6,7,8],desc:(v,c)=>c+'% 機率召喚焰靈使魔 '+(v+8)+' 拍，持續發射火彈'},
  shadow_wolf:{chance:[10,13,16,19,22],val:[4,5,6,7,8],desc:(v,c)=>c+'% 機率召喚影獵狼 '+(v+8)+' 拍，追獵並標記敵人'},
  holy_sprite:{chance:[10,13,16,19,22],val:[4,5,6,7,8],desc:(v,c)=>c+'% 機率召喚聖光精靈 '+(v+8)+' 拍，持續治療受傷隊友'}
};

const ADVANCE_TACTIC_RULES = {
  eagle_eye:{chance:[12,15,18,21,24],val:[1.15,1.2,1.25,1.3,1.35],desc:(v,c)=>c+'% 機率鷹眼鎖定，使目標弱點暴露並延長印記'},
  flash_step:{chance:[10,13,16,19,22],val:[1.25,1.35,1.45,1.55,1.65],desc:(v,c)=>c+'% 機率瞬步突襲，攻擊後加速並短暫隱身；已裝備時提高迴避上限與迴避率'},
  void_trap:{chance:[10,13,16,19,22],val:[1.3,1.4,1.5,1.6,1.7],desc:(v,c)=>c+'% 機率放置虛空陷阱；踩中者受傷、困住並沉默'},
  vanguard:{chance:[10,13,16,19,22],val:[1.3,1.4,1.5,1.6,1.7],desc:(v,c)=>c+'% 機率先鋒意志，衝鋒後鼓舞附近隊友並獲得攻防'},
  mana_overflow:{chance:[10,13,16,19,22],val:[1.35,1.45,1.55,1.65,1.8],desc:(v,c)=>c+'% 機率元素洪流，命中後引爆元素並加速後續施法'}
};

const ADVANCE_REACT_RULES = {
  shield_wall:{chance:[12,15,18,21,24],val:[.08,.1,.12,.14,.16],desc:(v,c)=>'受擊時 '+c+'% 機率盾牆，吸收並回復本次傷害的 '+Math.round(v*100)+'%'},
  intercept:{chance:[10,13,16,19,22],val:[1,1,1,1,1],desc:(v,c)=>'受擊時 '+c+'% 機率援護，嘲諷攻擊者'},
  thunder_prison:{chance:[10,13,16,19,22],val:[2,2,3,3,4],desc:(v,c)=>'受擊時 '+c+'% 機率法力爆發，沉默攻擊者 '+v+' 拍'},
  ice_armor:{chance:[12,15,18,21,24],val:[2,2,3,3,4],desc:(v,c)=>'受擊時 '+c+'% 機率冰甲反噬，冰緩攻擊者 '+v+' 拍'},
  smoke_screen:{chance:[12,15,18,21,24],val:[2,2,3,3,4],desc:(v,c)=>'受擊時 '+c+'% 機率展開煙幕，致盲攻擊者 '+v+' 拍'},
  swift_evade:{chance:[10,13,16,19,22],val:[.12,.16,.2,.24,.28],desc:(v,c)=>'受擊時 '+c+'% 機率疾閃，回復本次傷害的 '+Math.round(v*100)+'%；已裝備時大幅提高迴避上限'},
  cleanse:{chance:[12,15,18,21,24],val:[1,1,1,1,1],desc:(v,c)=>'受擊時 '+c+'% 機率淨化自身的冰緩、凍結與沉默'},
  regeneration:{chance:[12,15,18,21,24],val:[4,6,8,10,12],desc:(v,c)=>'受擊時 '+c+'% 機率再生，立即回復 '+v+' HP'},
  rally:{chance:[10,13,16,19,22],val:[3,3,4,4,5],desc:(v,c)=>'受擊時 '+c+'% 機率展開挑戰旗幟，吸引攻擊者並獲得減傷'},
  renewal:{chance:[12,15,18,21,24],val:[5,7,9,11,13],desc:(v,c)=>'受擊時 '+c+'% 機率回春，立即回復 '+v+' HP'},
  healing_wave:{chance:[10,13,16,19,22],val:[3,4,5,6,7],desc:(v,c)=>'受擊時 '+c+'% 機率治癒之波，回復全隊 '+v+' HP'},
  holy_link:{chance:[10,13,16,19,22],val:[3,3,4,4,5],desc:(v,c)=>'受擊時 '+c+'% 機率神聖鏈結，附近隊友獲得 '+v+' 拍防護'},
  blessing_light:{chance:[12,15,18,21,24],val:[4,4,5,5,6],desc:(v,c)=>'受擊時 '+c+'% 機率祝福之光，全隊獲得 '+v+' 拍防護'},
  iron_will:{chance:[12,15,18,21,24],val:[3,3,4,4,5],desc:(v,c)=>'受擊時 '+c+'% 機率鋼鐵意志，自身獲得 '+v+' 拍防護'},
  guardian_oath:{chance:[10,13,16,19,22],val:[2,2,3,3,4],desc:(v,c)=>'受擊時 '+c+'% 機率守護誓約，附近隊友獲得 '+v+' 拍防護'},
  cold_snap:{chance:[12,15,18,21,24],val:[1,1,2,2,3],desc:(v,c)=>'受擊時 '+c+'% 機率寒霜脈衝，凍結攻擊者 '+v+' 拍'},
  crystal_barrier:{chance:[10,13,16,19,22],val:[4,5,6,7,8],desc:(v,c)=>'受擊時 '+c+'% 機率水晶結界，回復 '+v+' HP 並獲得防護'},
  holy_guard:{chance:[14,17,20,23,26],val:[4,5,6,7,8],desc:(v,c)=>'受擊時 '+c+'% 機率聖盾領域，附近隊友獲得 '+v+' 拍強化防護'},
  king_banner:{chance:[12,15,18,21,24],val:[4,4,5,5,6],desc:(v,c)=>'受擊時 '+c+'% 機率王者軍旗，吸引敵人並鼓舞隊友 '+v+' 拍'},
  fortress:{chance:[12,15,18,21,24],val:[6,8,10,12,14],desc:(v,c)=>'受擊時 '+c+'% 機率無畏堡壘，立即修復 '+v+' HP'},
  polar_domain:{chance:[12,15,18,21,24],val:[2,2,3,3,4],desc:(v,c)=>'受擊時 '+c+'% 機率極寒領域，冰緩攻擊者與附近敵人 '+v+' 拍'},
  absolute_zero:{chance:[10,13,16,19,22],val:[1,1,2,2,3],desc:(v,c)=>'受擊時 '+c+'% 機率絕對零度，凍結攻擊者 '+v+' 拍'},
  world_freeze:{chance:[8,10,12,14,16],val:[1,1,1,2,2],desc:(v,c)=>'受擊時 '+c+'% 機率永凍結界，凍結攻擊者附近敵人 '+v+' 拍'},
  life_domain:{chance:[14,17,20,23,26],val:[5,7,9,11,13],desc:(v,c)=>'受擊時 '+c+'% 機率生命領域，附近隊友回復 '+v+' HP'},
  mass_restore:{chance:[12,15,18,21,24],val:[4,5,6,7,8],desc:(v,c)=>'受擊時 '+c+'% 機率聖靈降臨，全隊回復 '+v+' HP'},
  salvation:{chance:[12,15,18,21,24],val:[4,4,5,5,6],desc:(v,c)=>'受擊時 '+c+'% 機率守護救贖，自己與附近隊友獲得 '+v+' 拍防護'},
  angel_wing:{chance:[10,13,16,19,22],val:[2,2,3,3,4],desc:(v,c)=>'受擊時 '+c+'% 機率天使之翼，淨化附近隊友並加速 '+v+' 拍'},
  eternal_prayer:{chance:[10,13,16,19,22],val:[5,6,7,8,9],desc:(v,c)=>'受擊時 '+c+'% 機率永恆祈禱，回復自身並解除控制'},
  windwalk:{chance:[12,15,18,21,24],val:[3,3,4,4,5],desc:(v,c)=>'受擊時 '+c+'% 機率疾風步，獲得 '+v+' 拍加速與短暫隱身'},
  resurrection_hymn:{chance:[8,10,12,14,16],val:[18,21,24,27,30],desc:(v,c)=>'受擊時 '+c+'% 機率救贖，復活附近一名倒下隊友並回復 '+v+' HP'},
  last_stand:{chance:[10,13,16,19,22],val:[8,10,12,14,16],desc:(v,c)=>'受擊時 '+c+'% 機率最後防線，低血量時修復 '+v+' HP 並展開堡壘'},
  wind_soul:{chance:[12,15,18,21,24],val:[3,3,4,4,5],desc:(v,c)=>'受擊時 '+c+'% 機率風之靈，附近隊友加速並解除冰緩'}
};

const ADVANCE_ULTIMATES = {
  Warrior:[{id:'skyward_slash',name:'王者號令',icon:'⚔️',cd:56},{id:'sacred_counter',name:'神聖反擊',icon:'⚡',cd:58},{id:'heaven_guard',name:'天穹守護',icon:'🌤️',cd:62}],
  Mage:[{id:'elemental_doom',name:'元素末日',icon:'☄️',cd:56},{id:'mana_overflow',name:'元素洪流',icon:'💠',cd:54},{id:'world_freeze',name:'永凍結界',icon:'🌨️',cd:60}],
  Rogue:[{id:'death_mark',name:'死亡印記',icon:'💀',cd:52},{id:'silent_hunt',name:'無聲獵殺',icon:'🤫',cd:54},{id:'thousand_arrows',name:'萬箭穿心',icon:'🏹',cd:52}],
  Cleric:[{id:'resurrection_hymn',name:'救贖聖歌',icon:'🎵',cd:64},{id:'miracle_sanctum',name:'奇蹟聖域',icon:'🌟',cd:66},{id:'eternal_prayer',name:'永恆祈禱',icon:'🙏',cd:62}]
};

const SKILL_GATES = { 1:0, 2:5, 3:10, 4:15 };

const SKILL_LOADOUT_MAX = 5;

const ADVANCE_SP_NEED = {2:15,3:15};

const ADVANCE_BONUS_CAP = {power:65, ward:45, heal:60, tempo:30};

const MAIN_STAT = { Warrior:"atk", Rogue:"agi", Mage:"int", Cleric:"int" };

const SKILL_POP = {
  wrath:["天罰!","boom","#f0b429"], blizzard:["暴風雪!","boom","#7ad0e8"],
  bash:["重擊!","boom","#f5c518"], execute:["斬殺!","boom","#e23b3b"], slash:["揮砍","spike","#f5c518"],
  blast:["爆裂!","boom","#f5731f"], meteor:["METEOR!","boom","#e23b3b"], spark:["電擊","spike","#4bc0e8"],
  chain:["連鎖閃電!","boom","#4bc0e8"], storm:["風暴!","boom","#8e44c4"], frost:["冰凍","spike","#7ad0e8"],
  freeze:["FREEZE!","spike","#7ad0e8"], edge:["暴擊!","boom","#f5c518"], lethal:["致命一擊!","boom","#e23b3b"],
  shadow:["影襲!","spike","#6a5acd"], pocket:["幸運金幣!","cloud","#f5c518"], greed:["募集!","cloud","#5cc47a"], expose:["破綻!","spike","#f5731f"],
  poison:["中毒","cloud","#4bae4f"], heal:["治療","cloud","#4bae4f"], groupheal:["群體治療!","cloud","#4bae4f"],
  smite:["聖光!","boom","#f5c518"], judge:["審判!","boom","#f5c518"],
  block:["格擋!","spike","#4bae4f"], thorns:["反彈!","spike","#4bae4f"], endure:["不屈!","boom","#e23b3b"],
  knight_charge:["守護衝鋒!","boom","#f5c518"], lance_combo:["騎槍連擊!","spike","#e8e8e8"], valor_strike:["英勇打擊!","boom","#f5731f"],
  radiant_blade:["光耀劍氣!","slash","#ffd563"], skyward_slash:["破空斬!","slash","#ffffff"], counter_stance:["反擊姿態!","spike","#f5c518"], sacred_counter:["神聖反擊!","boom","#ffd563"],
  shield:["聖盾!","spike","#4bc0e8"], revive:["復活!","cloud","#f2a3c7"],
};

const TRAIT_TUNE = {                                   // v51:全員真裸裝重新校準(修正舊版測試混入展示裝的偏差)
  pierceBonus: 1.05,   // 法術穿透:法師技能對戰士無視格擋且 +5% 傷害
  sanctuary:   0.68,   // 已裝備聖盾系技能時，牧師法術減傷最高 32%
  rogueVsWarriorDodge:8,// 已裝備疾閃系技能時，遊俠面對戰士物攻最高額外 +8% 迴避
  healCut:     0.95,   // 治療干擾:對戰遊俠時牧師回血 -5%
  ironWall:    0.45,   // 鐵壁格擋:戰士擋遊俠時減傷 55%(一般格擋 50%)
  underdog:    1.20    // 逆境之魂:被克方 HP<50% 時傷害 +20%(翻盤窗口)
};

const ARENA_JOB_TUNE = { Warrior:1.3, Mage:1.15, Rogue:1.15, Cleric:0.90 };

const GA_PACE = 1.3;

const COUNTER_SKILL_SETS = {
  warrior:['bash','knight_charge','lance_combo','radiant_blade','skyward_slash','sacred_counter'],
  clericWard:['shield','aegis','holy_link','salvation'],
  clericResolve:['cleanse','salvation','angel_wing','eternal_prayer'],
  rogueTempo:['smoke_screen','swift_evade','windwalk','flash_step','wind_soul']
};

const ULT_DEFS = {
  Warrior:{ name:"聖劍・破空斬", mult:2.2, selfHeal:15, emoji:"⚔️", color:"#f5c518" },
  Mage:   { name:"禁咒・隕星雨", mult:2.5, selfHeal:0,  emoji:"☄️", color:"#e2593b" },
  Rogue:  { name:"絕影・千連擊", mult:1.4, selfHeal:0,  hits:2, emoji:"🌪", color:"#6a5acd" },
  Cleric: { name:"神蹟・聖光審判", mult:1.7, selfHeal:25, emoji:"✨", color:"#ffd234" }
};

const ULT_CAP = 0.35;

const ARENA_ADV_SKILLS = {
  Warrior:[['knight_charge',1.45],['lance_combo',1.65],['radiant_blade',1.95],['skyward_slash',2.15]],
  Mage:[['ember_path',1.4],['chain_storm',1.5],['rift',1.75],['solar_flare',2.05],['storm_core',1.8],['ice_comet',1.9]],
  Rogue:[['pierce_arrow',1.55],['rapid_fire',1.6],['shadow_clone',1.8],['phantom_combo',2],['death_mark',1.7],['arrow_rain',1.9]],
  Cleric:[['sacred_bolt',1.45],['light_spear',1.7],['divine_sentence',2],['holy_comet',1.85]]
};

const ARENA_BASE_SKILL_MULT={bash:1.8,blast:2,edge:2,lethal:2.5,smite:1.8,judge:2.2,meteor:3,shadow:2,chain:1.5,spark:1.5,wrath:2.8,blizzard:2.2,frost:1.25,freeze:1.15,storm:1.3};

const SKILL_FX = {
  bash:    {pattern:"burst",  emoji:"💥", color:"#f5731f"},
  execute: {pattern:"slash",  emoji:"⚔️", color:"#c0392b"},
  blast:   {pattern:"burst",  emoji:"🔥", color:"#e2593b"},
  meteor:  {pattern:"fall",   emoji:"☄️", color:"#e23b3b"},
  spark:   {pattern:"bolt",   emoji:"⚡", color:"#4bc0e8"},
  chain:   {pattern:"bolt",   emoji:"🌩", color:"#6a5acd"},
  storm:   {pattern:"ring",   emoji:"🌪", color:"#7ad0e8"},
  frost:   {pattern:"burst",  emoji:"❄️", color:"#7ad0e8"},
  freeze:  {pattern:"burst",  emoji:"🧊", color:"#4bc0e8"},
  blizzard:{pattern:"burst",  emoji:"🌨", color:"#d9f4ff"},
  aegis:   {pattern:"shieldfx", emoji:"🛡", color:"#ffd563"},
  taunt:   {pattern:"ring", emoji:"📢", color:"#f5731f"},
  edge:    {pattern:"slash",  emoji:"🗡", color:"#f5c518"},
  lethal:  {pattern:"slash",  emoji:"☠️", color:"#6a5acd"},
  shadow:  {pattern:"slash",  emoji:"",   color:"#6a5acd"},
  poison:  {pattern:"rise",   emoji:"🐍", color:"#4bae4f"},
  expose:  {pattern:"ring",   emoji:"🎯", color:"#f5731f"},
  pocket:  {pattern:"rise",   emoji:"🍀", color:"#f5c518"},
  greed:   {pattern:"rise",   emoji:"🎁", color:"#5cc47a"},
  smite:   {pattern:"fall",   emoji:"🔨", color:"#f5c518"},
  judge:   {pattern:"fall",   emoji:"⚡", color:"#f5c518"},
  heal:    {pattern:"rise",   emoji:"💚", color:"#4bae4f"},
  groupheal:{pattern:"rise",  emoji:"🌿", color:"#4bae4f"},
  revive:  {pattern:"rise",   emoji:"💗", color:"#ff8ab5"},
  block:   {pattern:"shieldfx", emoji:"🧱", color:"#8a7a55"},
  shield:  {pattern:"shieldfx", emoji:"🔰", color:"#f5c518"},
  thorns:  {pattern:"burst",  emoji:"🌵", color:"#4bae4f"},
  knight_charge:{pattern:"ring", emoji:"🐎", color:"#f5c518"},
  lance_combo:{pattern:"slash", emoji:"🔱", color:"#e8e8e8"},
  valor_strike:{pattern:"burst", emoji:"💥", color:"#f5731f"},
  radiant_blade:{pattern:"slash", emoji:"✨", color:"#ffd563"},
  skyward_slash:{pattern:"fall", emoji:"⚔️", color:"#ffffff"},
  counter_stance:{pattern:"shieldfx", emoji:"⚔️", color:"#f5c518"},
  sacred_counter:{pattern:"burst", emoji:"⚡", color:"#ffd563"},
  heaven_guard:{pattern:"shieldfx", emoji:"🌤️", color:"#fff0a8"},
  king_banner:{pattern:"ring", emoji:"🚩", color:"#ffd563"},
  polar_domain:{pattern:"burst", emoji:"❄️", color:"#8ce4ff"},
  life_domain:{pattern:"rise", emoji:"💚", color:"#62d89a"},
  sky_guard:{pattern:"shieldfx", emoji:"☀️", color:"#fff0a8"},
  elemental_ruin:{pattern:"fall", emoji:"🌋", color:"#ff7a3d"},
  arrow_barrage:{pattern:"burst", emoji:"🏹", color:"#a98cff"},
  miracle_field:{pattern:"rise", emoji:"🌟", color:"#62d89a"},
  elemental_doom:{pattern:"fall", emoji:"☄️", color:"#ff7a3d"},
  thousand_arrows:{pattern:"burst", emoji:"🏹", color:"#a98cff"},
  miracle_sanctum:{pattern:"rise", emoji:"🌟", color:"#62d89a"},
  adv_power:{pattern:"burst", emoji:"✦", color:"#ffd563"},
  adv_ward:{pattern:"shieldfx", emoji:"🛡", color:"#7ad0e8"},
  adv_heal:{pattern:"rise", emoji:"💚", color:"#62d89a"},
  adv_tempo:{pattern:"ring", emoji:"🌪", color:"#a98cff"},
  adv_fire:{pattern:"burst", emoji:"🔥", color:"#ff7a3d"}, adv_thunder:{pattern:"bolt", emoji:"⚡", color:"#8f7aff"}, adv_ice:{pattern:"burst", emoji:"❄️", color:"#8ce4ff"},
  adv_rogue:{pattern:"slash", emoji:"🗡️", color:"#a98cff"}, adv_holy:{pattern:"fall", emoji:"✨", color:"#fff0a8"}, adv_warrior:{pattern:"slash", emoji:"⚔️", color:"#f5c518"},
  endure:  {pattern:"ring",   emoji:"💪", color:"#e2593b"},
  slash:   {pattern:"ring",   emoji:"📣", color:"#f5731f"},   /* 戰吼 */
  harden:  {pattern:"shieldfx", emoji:"🛡", color:"#4bae4f"}, /* 守護號令 */
  vigor:   {pattern:"rise",   emoji:"💪", color:"#4bae4f"},   /* 鼓舞 */
  firebolt:{pattern:"ring",   emoji:"🔮", color:"#6a5acd"},   /* 魔力共鳴 */
  agi:     {pattern:"ring",   emoji:"🏃", color:"#7ad0e8"},   /* 疾風令 */
  faith:   {pattern:"rise",   emoji:"🎵", color:"#4bae4f"},   /* 聖歌 */
  hunter_trap:{pattern:"ring",emoji:"🪤", color:"#82c55b"},
  void_trap:{pattern:"ring",emoji:"🕳", color:"#8f7aff"},
  shield_squire:{pattern:"shieldfx",emoji:"🛡️",color:"#7ad0e8"},
  flame_familiar:{pattern:"rise",emoji:"🔥",color:"#ff7a3d"},
  shadow_wolf:{pattern:"slash",emoji:"🐺",color:"#a98cff"},
  holy_sprite:{pattern:"rise",emoji:"🕊️",color:"#fff0a8"},
};

const ELEMENT_SKILL_FX = Object.freeze({
  fire:new Set(['blast','meteor','adv_fire','ember_path','flame_orbit','lava_burst','flame_familiar','solar_flare','elemental_doom','elemental_ruin']),
  thunder:new Set(['spark','chain','adv_thunder','chain_storm','thunder_prison','storm_core','mana_overflow']),
  ice:new Set(['frost','freeze','blizzard','adv_ice','ice_armor','cold_snap','crystal_barrier','polar_domain','absolute_zero','ice_comet','world_freeze']),
  wind:new Set(['storm','adv_tempo','agi','swift_evade','windwalk','wind_soul','flash_step'])
});

const JOB_SKILL = {
  Mage:   { name:"暴風雪", icon:"🌨️", cd:20, desc:"射程內所有敵人受傷,並有機率冰緩或凍結(最多3人)" },
  Cleric: { name:"聖光普照", icon:"💚", cd:20, desc:"2格內隊友全回血15" },
  Rogue:  { name:"疾風隱身", icon:"🌫", cd:30, desc:"隱身3秒,敵人打不到你" },
  Warrior:{ name:"震地嘲諷", icon:"📣", cd:30, desc:"2格內敵人被迫攻擊你3秒" }
};

const JOB_SKILL_REQUIRE = {Mage:'blizzard',Cleric:'groupheal',Rogue:'pocket',Warrior:'taunt'};

