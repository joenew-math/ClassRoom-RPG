/*

 * 班級 RPG 固定遊戲資料。

 * 本檔只放不會在執行期間改變的職業、裝備、詞條、商店、成就與稱號定義。

 * 請在 classroom-rpg.js 之前載入；互動流程與狀態仍由主程式負責。

 */

const JOB_INFO = {
  Warrior:{name:"戰士", growth:{atk:2,def:1,agi:0,int:0},
    emoji:"⚔️", role:"前排坦克", color:"#f5c518", diff:"易上手",
    tagline:"高攻高防的最前線,替隊友扛下傷害",
    stats:{atk:5,def:4,agi:2,int:1},
    ult:"聖劍・破空斬(2.2倍傷害+回血)", skill:"高生命與格擋，能吸引敵人並替附近隊友承受傷害。",
    tip:"喜歡站在前排保護隊友、操作直覺的新手。" },
  Mage:{name:"法師", growth:{atk:0,def:1,agi:0,int:2},
    emoji:"🔮", role:"範圍輸出", color:"#e2593b", diff:"中等",
    tagline:"最高爆發,一次打一片,但很脆",
    stats:{atk:2,def:2,agi:2,int:5},
    ult:"禁咒・隕星雨(2.5倍,全職最高)", skill:"法術無視物理迴避，擅長火、雷、冰的遠距離範圍控制。",
    tip:"喜歡觀察站位、抓準時機進行範圍輸出的學生。" },
  Rogue:{name:"遊俠", growth:{atk:1,def:0,agi:2,int:0},
    emoji:"🌪", role:"敏捷刺客", color:"#6a5acd", diff:"進階",
    tagline:"高閃避、遠程連擊,來去如風的暗殺者",
    stats:{atk:4,def:1,agi:5,int:1},
    ult:"絕影・千連擊(連砍兩次)", skill:"行動速度與迴避較高，能標記目標、遠程連擊與快速轉換位置。",
    tip:"喜歡靈活移動、連續攻擊與技巧操作的學生。" },
  Cleric:{name:"牧師", growth:{atk:0,def:2,agi:0,int:1},
    emoji:"✨", role:"治療支援", color:"#ffd234", diff:"中等",
    tagline:"團隊的生命線,補血又耐打",
    stats:{atk:2,def:4,agi:1,int:4},
    ult:"神蹟・聖光審判(傷害+大量回血)", skill:"擅長治療、護盾、淨化與復活，能穩定維持整隊續戰力。",
    tip:"喜歡照顧隊友、觀察全隊狀態與支援合作的學生。" },
};

const LEGEND_SETS = [
  {id:"abyss_dark_knight",name:"深淵黑騎士",icon:"🌑",jobs:["Warrior"],price:500,img:"assets/legendary-sets/abyss-dark-knight-v1.webp",main:"#a974ff",accent:"#ff4bd8",desc:"角盔、深淵鎧甲、巨劍與紫焰光環"},
  {id:"star_archmage",name:"星環大魔導師",icon:"🌟",jobs:["Mage"],price:500,img:"assets/legendary-sets/star-archmage-v1.webp",main:"#70cfff",accent:"#ffe06c",desc:"星象法帽、天球儀法杖與星座光環"},
  {id:"elemental_dragon_mage",name:"元素龍巫",icon:"🐲",jobs:["Mage"],price:500,img:"assets/legendary-sets/elemental-dragon-mage-v1.webp",main:"#ff6b42",accent:"#71e8ff",desc:"龍骨法冠與火、冰、雷三元素魔裝"},
  {id:"shadow_hunter",name:"暗影追獵者",icon:"🦅",jobs:["Rogue"],price:500,img:"assets/legendary-sets/shadow-hunter-v1.webp",main:"#70e0a1",accent:"#9a6cff",desc:"暗影兜帽、獵弓、鉤刃與鴉羽披風"},
  {id:"skywing_templar",name:"天翼聖殿騎士",icon:"🪽",jobs:["Cleric"],price:500,img:"assets/legendary-sets/skywing-templar-v1.webp",main:"#ffe58a",accent:"#fffdf0",desc:"翼冠、聖盾、光劍與金白聖翼鎧甲"}
];

const DIAMOND_COSMETICS = [
  {id:"star_nameplate",name:"星光名牌",icon:"✨",price:30,desc:"腳邊出現藍金星光與發亮名牌",main:"#66c9ff",accent:"#ffe070"},
  {id:"guardian_cape",name:"守護者披風",icon:"🛡️",price:60,desc:"角色背後展開紅金守護披風",main:"#e64b47",accent:"#ffd45c"},
  {id:"class_legend_aura",name:"傳說班徽光環",icon:"🌈",price:120,desc:"環繞角色的班徽符文與彩色粒子",main:"#9a6cff",accent:"#63e6be"}
];

const TYPE_ICON = { hat:"🎩", clothes:"👕", pants:"👖", weapon:"⚔️", back:"🎒", shoes:"👟", hair:"💇", eyes:"👀", brows:"〰️", nose:"👃", base:"🧍", consumable:"🧪" };

const TYPE_NAME = { hat:"帽子", clothes:"衣服", pants:"褲子", weapon:"武器", back:"背飾", shoes:"鞋子", hair:"髮型", eyes:"眼睛", brows:"眉毛", nose:"鼻子", base:"角色素體", consumable:"道具" };

const EQUIP_SLOTS = ["hat","clothes","pants","weapon","back","shoes"];

const FACE_SLOTS = ["hair"];

const ALL_SLOTS = EQUIP_SLOTS.concat(FACE_SLOTS);

const BP_TYPES = EQUIP_SLOTS.slice();

const BASIC_SLOTS = EQUIP_SLOTS.slice();

const BAG_MAX = 20;

const SUBMIT_FEE = 1;

const BP_TIERS = [
  { key:"common",   name:"普通", icon:"📜", statMax:5,  minPrice:30,  fx:["none"],                      w:60 },
  { key:"advanced", name:"高級", icon:"📘", statMax:10, minPrice:80,  fx:["none","sparkle"],            w:25 },
  { key:"rare",     name:"稀有", icon:"📕", statMax:15, minPrice:150, fx:["none","sparkle","glow","flameFx","windFx","frostFx","earthFx"],     w:12 },
  { key:"legend",   name:"傳說", icon:"📙", statMax:20, minPrice:250, fx:["none","sparkle","glow","both","flameFx","windFx","frostFx","earthFx","holyFx","voidFx","dragonFx"], w:3 },
];

const AFFIXES = [
  { key:"flame",grade:"rare",name:"烈焰",icon:"🔥",kind:"atk",chance:10,mult:1.55,price:70,
    short:"焚燒",desc:"攻擊時 10% 機率造成 1.55 倍傷害" },
  { key:"frost",grade:"rare",name:"寒霜",icon:"❄️",kind:"atk",chance:10,price:70,
    short:"凍緩",desc:"攻擊時 10% 機率使敵方下一次行動傷害減半" },
  { key:"venom",grade:"rare",name:"劇毒",icon:"🐍",kind:"atk",chance:10,dot:8,price:75,
    short:"淬毒",desc:"攻擊時 10% 機率中毒 3 回合，每回合受到 8 傷害" },
  { key:"vampire",grade:"rare",name:"吸血",icon:"🩸",kind:"atk",chance:10,heal:12,price:75,
    short:"汲取",desc:"攻擊時 10% 機率回復自己 12 HP" },
  { key:"guardian",grade:"rare",name:"守護",icon:"🛡",kind:"def",chance:10,reduce:.5,price:75,
    short:"格擋",desc:"被攻擊時 10% 機率只承受 50% 傷害" },
  { key:"fortune",grade:"rare",name:"幸運",icon:"🍀",kind:"atk",chance:8,gold:15,gauge:15,price:65,
    short:"拾金",desc:"攻擊時 8% 機率額外獲得 15 金；競技場則使行動條前進 15%" },
  { key:"armorbreak",grade:"rare",name:"破甲",icon:"🗡️",kind:"atk",chance:9,expose:.18,price:85,
    short:"裂甲",desc:"攻擊時 9% 機率使後續攻擊增傷 18%" },
  { key:"haste",grade:"rare",name:"迅擊",icon:"💨",kind:"atk",chance:10,mult:1.35,price:80,
    short:"追擊",desc:"攻擊時 10% 機率追加 35% 傷害" },
  { key:"thorns",grade:"rare",name:"荊棘",icon:"🌵",kind:"def",chance:10,reflect:.30,price:85,
    short:"反傷",desc:"被攻擊時 10% 機率反彈本次傷害的 30%" },
  { key:"celestial",grade:"legend",name:"天穹",icon:"🌠",kind:"atk",chance:6,mult:2.5,price:160,
    short:"星落", desc:"攻擊時 6% 機率追加 1.5 倍星辰傷害（合計 2.5 倍）" },
  { key:"tempest",grade:"legend",name:"雷霆",icon:"⚡",kind:"atk",chance:8,mult:2.2,price:140,
    short:"雷殛", desc:"攻擊時 8% 機率追加 1.2 倍雷擊傷害（合計 2.2 倍）" },
  { key:"renewal",grade:"legend",name:"生命",icon:"🌿",kind:"atk",chance:10,heal:20,price:120,
    short:"復甦", desc:"攻擊時 10% 機率回復自己 20 HP" },
  { key:"barrier",grade:"legend",name:"星界",icon:"🔯",kind:"def",chance:8,reduce:.35,price:150,
    short:"結界", desc:"被攻擊時 8% 機率只承受 35% 傷害" },
  { key:"execution",grade:"legend",name:"處決",icon:"💀",kind:"atk",chance:5,execute:.18,mult:2.8,price:170,
    short:"終結",desc:"攻擊時 5% 機率造成 2.8 倍傷害；敵人低於 18% HP 時傷害再提升" },
  { key:"phoenix",grade:"legend",name:"鳳凰",icon:"🕊️",kind:"def",chance:5,revive:.30,price:180,
    short:"涅槃",desc:"致命傷時 5% 機率免於倒下並回復 30% HP" },
  { key:"aegis",grade:"legend",name:"神盾",icon:"🛡️",kind:"def",chance:6,reduce:.18,price:175,
    short:"絕對防禦",desc:"被攻擊時 6% 機率只承受 18% 傷害並解除控制" },
  { key:"void",grade:"legend",name:"虛空",icon:"🌀",kind:"atk",chance:6,mult:1.8,expose:.25,price:170,
    short:"湮滅",desc:"攻擊時 6% 機率造成 1.8 倍傷害並使後續攻擊增傷 25%" },
  { key:"sanctuary",grade:"legend",name:"聖愈",icon:"✨",kind:"atk",chance:8,groupHeal:.08,price:160,
    short:"聖光回響",desc:"攻擊時 8% 機率治療全組各自最大 HP 的 8%" },
];

const BP_STAT_KEYS=["atk","def","agi","int"];

const FORGE_WEAPON_SKILLS = [
  {id:"renewal",name:"回春治療",icon:"🌿",source:"牧師",fx:"heal",kind:"support",desc:"治療附近生命比例最低的隊友"},
  {id:"shield_wall",name:"守護屏障",icon:"🛡️",source:"戰士",fx:"shield",kind:"support",desc:"為自身周圍隊友展開短暫減傷屏障"},
  {id:"cleanse",name:"淨化之光",icon:"✨",source:"牧師",fx:"faith",kind:"support",desc:"解除附近隊友的冰緩、凍結與沉默"},
  {id:"agi",name:"疾風令",icon:"💨",source:"遊俠",fx:"storm",kind:"support",desc:"短暫提高附近隊友的行動速度"},
  {id:"blast",name:"烈焰追擊",icon:"🔥",source:"法師",fx:"blast",kind:"attack",desc:"追加火焰傷害並波及目標周圍"},
  {id:"chain",name:"連鎖雷電",icon:"⚡",source:"法師",fx:"chain",kind:"attack",desc:"雷電由主目標再跳向附近兩名敵人"},
  {id:"frost",name:"冰箭",icon:"❄️",source:"法師",fx:"frost",kind:"attack",desc:"命中後使目標冰緩、延後行動"},
  {id:"hunter_mark",name:"獵人印記",icon:"🎯",source:"遊俠",fx:"expose",kind:"attack",desc:"標記目標弱點，使下一擊增傷"}
];

const SHOP_ITEMS = [
  {id:1, name:"冒險者帽", type:"hat", price:50,  rarity:"Common",    atk:1,agi:0,int:0,def:0},
  {id:2, name:"魔法師帽", type:"hat", price:80,  rarity:"Common",    atk:0,agi:0,int:2,def:0},
  {id:3, name:"皮革頭盔", type:"hat", price:70,  rarity:"Common",    atk:0,agi:1,int:0,def:1},
  {id:4, name:"旅行斗篷", type:"clothes", price:60, rarity:"Common", atk:0,agi:1,int:0,def:0},
  {id:5, name:"學者長袍", type:"clothes", price:90, rarity:"Common", atk:0,agi:0,int:2,def:0},
  {id:6, name:"皮革護甲", type:"clothes", price:80, rarity:"Common", atk:1,agi:0,int:0,def:1},
  {id:7, name:"龍鱗頭盔", type:"hat", price:0,rarity:"Legendary",atk:3,agi:0,int:0,def:3,affix:"aegis"},
  {id:8, name:"英雄戰甲", type:"clothes",price:0,rarity:"Legendary",atk:3,agi:2,int:0,def:2,affix:"phoenix"},
  {id:27,name:"屠龍聖劍",type:"weapon",price:0,rarity:"Legendary",atk:7,agi:1,int:0,def:0,affix:"execution"},
  {id:28,name:"賢者魔導書",type:"weapon",price:0,rarity:"Legendary",atk:2,agi:0,int:6,def:0,affix:"void"},
  {id:51,name:"青龍蛇矛",type:"weapon",price:0,rarity:"Legendary",atk:8,agi:1,int:0,def:1,affix:"renewal",jobs:["Warrior"],weaponPattern:"line2",effect:"🐍 蛇矛突刺：團體戰與 Dota 可攻擊正前方兩格；同一直線的另一名敵人受到 55% 貫穿傷害。"},
  {id:52,name:"赤焰方天畫戟",type:"weapon",price:0,rarity:"Legendary",atk:9,agi:1,int:0,def:0,affix:"celestial",jobs:["Warrior"],weaponPattern:"sweep",effect:"🔥 方天橫掃：團體戰與 Dota 攻擊相鄰目標時，同步掃擊自身周圍八格的其他敵人，造成 45% 傷害。"},
  {id:53,name:"穿日弓",type:"weapon",price:0,rarity:"Legendary",atk:7,agi:3,int:0,def:0,affix:"tempest",jobs:["Rogue"],weaponPattern:"longbow4",effect:"☀️ 穿日箭：團體戰與 Dota 射程提升為四格；箭軌仍會受到山壁、建築與地形視線阻擋。"},
  {id:54,name:"玄鐵雙截棍",type:"weapon",price:0,rarity:"Legendary",atk:7,agi:2,int:0,def:1,affix:"void",jobs:["Warrior","Rogue"],weaponPattern:"combo",effect:"🥋 疾影連打：物理攻擊有 30% 機率追加兩段打擊，依序造成本次傷害的 42% 與 28%；追加段不會再次爆擊。"},
  {id:29,name:"炎龍之翼",type:"back",price:0,rarity:"Legendary",atk:2,agi:3,int:0,def:1,affix:"phoenix"},
  {id:30,name:"疾風神靴",type:"shoes",price:0,rarity:"Legendary",atk:0,agi:4,int:0,def:2,affix:"barrier"},
  {id:9, name:"鐵劍",     type:"weapon", price:60,  rarity:"Common", atk:4,agi:0,int:0,def:0},
  {id:10,name:"獵人短弓", type:"weapon", price:80,  rarity:"Common", atk:3,agi:2,int:0,def:0},
  {id:11,name:"法師法杖", type:"weapon", price:100, rarity:"Common", atk:2,agi:0,int:4,def:0},
  {id:25,name:"騎士長槍", type:"weapon", price:90,  rarity:"Common", atk:4,agi:0,int:0,def:1},
  {id:26,name:"武僧鐵戟", type:"weapon", price:90,  rarity:"Common", atk:3,agi:1,int:0,def:1},
  {id:12,name:"回復藥水", type:"consumable", price:50, rarity:"Common", atk:0,agi:0,int:0,def:0, effect:"回復 30 HP"},
  {id:13,name:"幸運草",   type:"consumable", price:70, rarity:"Common", atk:0,agi:0,int:0,def:0, effect:"金幣獲得 +20%"},
  {id:14,name:"智慧卷軸", type:"consumable", price:90, rarity:"Common", atk:0,agi:0,int:0,def:0, effect:"XP 獲得 +20%"},
  {id:40,name:"布短褲",   type:"pants", price:50, rarity:"Common", atk:0,agi:1,int:0,def:0},
  {id:41,name:"皮革長褲", type:"pants", price:80, rarity:"Common", atk:1,agi:0,int:0,def:1},
  {id:42,name:"法師裙襬", type:"pants", price:80, rarity:"Common", atk:0,agi:0,int:1,def:1},
  {id:24,name:"洗技藥水", type:"consumable", price:120, rarity:"Common", atk:0,agi:0,int:0,def:0, effect:"重置技能點,退還全部 SP"},
  {id:31,name:"攻城卷",   type:"consumable", price:500, rarity:"Rare",   atk:0,agi:0,int:0,def:0, effect:"公會戰入場券(限組長購買,每週五帶小組參戰)"},
  {id:32,name:"巔峰券",   type:"consumable", price:500, rarity:"Legendary", atk:0,agi:0,int:0,def:0, effect:"🌏 巔峰之城挑戰券(限榮耀之城城主組長於城堡商店購買)"},
  {id:33,name:"寵物卡",   type:"consumable", price:0, rarity:"Legendary", atk:0,agi:0,int:0,def:0, effect:"🎴 使用後隨機獲得四聖獸寵物之一,裝備後環繞角色並在戰場機率發動特殊技能(青龍追擊/朱雀濺射/白虎閃避/玄武減傷)"},
  {id:34,name:"流星卡",   type:"consumable", price:0, rarity:"Legendary", atk:0,agi:0,int:0,def:0, effect:"🌠 傳說轉生:替角色取一個專屬職業名號(取代預設職業顯示)"},
  {id:35,name:"改名卡",   type:"consumable", price:0, rarity:"Rare", atk:0,agi:0,int:0,def:0, effect:"📝 更改角色名字"},
  {id:36,name:"轉職卡",   type:"consumable", price:0, rarity:"Legendary", atk:0,agi:0,int:0,def:0, effect:"🔄 轉換職業:重算職業成長並重置技能點(等級與裝備保留)"},
  {id:15,name:"旅人之靴", type:"shoes", price:60, rarity:"Common", atk:0,agi:1,int:0,def:0},
  {id:16,name:"鐵板靴",   type:"shoes", price:80, rarity:"Common", atk:0,agi:0,int:0,def:2},
  {id:17,name:"冒險者背包",type:"back", price:70, rarity:"Common", atk:0,agi:1,int:0,def:0},
  {id:18,name:"舊披風",   type:"back", price:60, rarity:"Common", atk:0,agi:0,int:0,def:1},
  /* v126 職業入門套裝：有明確職業色與剪影，也能和工坊作品混搭 */
  {id:43,name:"獅心長劍",type:"weapon",price:150,rarity:"Rare",atk:5,agi:0,int:0,def:1,affix:"armorbreak"},
  {id:44,name:"星塵法杖",type:"weapon",price:150,rarity:"Rare",atk:1,agi:0,int:5,def:0,affix:"frost"},
  {id:45,name:"月影獵弓",type:"weapon",price:150,rarity:"Rare",atk:4,agi:3,int:0,def:0,affix:"haste"},
  {id:46,name:"曙光權杖",type:"weapon",price:150,rarity:"Rare",atk:3,agi:0,int:3,def:1,affix:"vampire"},
  {id:47,name:"赤鋼戰披",type:"back",price:120,rarity:"Rare",atk:1,agi:0,int:0,def:2,affix:"guardian"},
  {id:48,name:"星紗斗篷",type:"back",price:120,rarity:"Rare",atk:0,agi:0,int:3,def:1,affix:"frost"},
  {id:49,name:"追風箭囊",type:"back",price:120,rarity:"Rare",atk:1,agi:3,int:0,def:0,affix:"fortune"},
  {id:50,name:"聖輝羽飾",type:"back",price:120,rarity:"Rare",atk:0,agi:0,int:2,def:2,affix:"thorns"},
  /* 地下城寵物卡製作：不在一般商店販售，只能消耗卡片製作。 */
  {id:201,name:"靈寵旅行披肩",type:"back",price:180,rarity:"Common",atk:0,agi:2,int:0,def:1,petCraft:true,effect:"由輔助系一～二階寵物卡製作"},
  {id:202,name:"靈寵守護衣",type:"clothes",price:180,rarity:"Common",atk:0,agi:0,int:1,def:2,petCraft:true,effect:"由強化系一～二階寵物卡製作"},
  {id:203,name:"靈寵訓練刃",type:"weapon",price:190,rarity:"Common",atk:3,agi:1,int:0,def:0,petCraft:true,effect:"由攻擊系一～二階寵物卡製作"},
  {id:204,name:"靈寵治癒帽",type:"hat",price:180,rarity:"Common",atk:0,agi:0,int:2,def:1,petCraft:true,effect:"由回復系一～二階寵物卡製作"},
  {id:211,name:"幻獸追風披風",type:"back",price:650,rarity:"Rare",atk:1,agi:6,int:1,def:2,affix:"haste",petCraft:true,effect:"由輔助系三～六階寵物卡製作"},
  {id:212,name:"幻獸共鳴鎧",type:"clothes",price:650,rarity:"Rare",atk:2,agi:1,int:2,def:6,affix:"guardian",petCraft:true,effect:"由強化系三～六階寵物卡製作"},
  {id:213,name:"幻獸破界武器",type:"weapon",price:700,rarity:"Rare",atk:8,agi:3,int:2,def:0,affix:"armorbreak",petCraft:true,effect:"由攻擊系三～六階寵物卡製作"},
  {id:214,name:"幻獸生命法冠",type:"hat",price:650,rarity:"Rare",atk:1,agi:1,int:7,def:3,affix:"renewal",petCraft:true,effect:"由回復系三～六階寵物卡製作"},
  {id:221,name:"創世龍算神劍",type:"weapon",price:12000,rarity:"Legendary",atk:18,agi:5,int:5,def:4,affix:"celestial",petCraft:true,petLegend:true,sourcePet:"fusion_t7_1",effect:"創世數理神龍唯一傳說裝備"},
  {id:222,name:"無限星環法冠",type:"hat",price:12000,rarity:"Legendary",atk:4,agi:5,int:18,def:5,affix:"void",petCraft:true,petLegend:true,sourcePet:"fusion_t7_2",effect:"無限星環聖獸唯一傳說裝備"},
  {id:223,name:"時空演算天凰翼",type:"back",price:12000,rarity:"Legendary",atk:7,agi:17,int:5,def:4,affix:"tempest",petCraft:true,petLegend:true,sourcePet:"fusion_t7_3",effect:"時空演算天凰唯一傳說裝備"},
  {id:224,name:"真理晶界麒麟鎧",type:"clothes",price:12000,rarity:"Legendary",atk:5,agi:3,int:7,def:18,affix:"aegis",petCraft:true,petLegend:true,sourcePet:"fusion_t7_4",effect:"真理晶界麒麟唯一傳說裝備"},
  {id:225,name:"混沌機率魔神戰裙",type:"pants",price:12000,rarity:"Legendary",atk:9,agi:9,int:9,def:6,affix:"fortune",petCraft:true,petLegend:true,sourcePet:"fusion_t7_5",effect:"混沌機率魔神唯一傳說裝備"},
  {id:226,name:"六域知識守護神靴",type:"shoes",price:12000,rarity:"Legendary",atk:5,agi:10,int:8,def:10,affix:"barrier",petCraft:true,petLegend:true,sourcePet:"fusion_t7_6",effect:"六域知識守護者唯一傳說裝備"},
];

const ITEM_LEVEL_BY_RARITY={Common:1,Rare:30,Legendary:60,Custom:1};

const ITEM_LEVEL_BY_TIER={common:1,advanced:20,rare:40,legend:60};

const ITEM_LEVEL_RANGE={common:[1,29],advanced:[15,39],rare:[30,59],legend:[60,90]};

const RARITY_COLOR = { Common:"#9aa0aa", Rare:"#4a9de8", Legendary:"#ff9a1f", Custom:"#a55ae8" };

const RARITY_ZH = { Common:"普通", Rare:"稀有", Legendary:"傳說", Custom:"學生創作" };

const ACHIEVEMENTS = [
  {id:"first_buy", name:"初次血拚", desc:"第一次在商店購買", icon:"🛍️", title:"精明買家"},
  {id:"lv3",       name:"嶄露頭角", desc:"達到 Lv.3", icon:"🌱", title:"超級初心者"},
  {id:"lv5",       name:"冒險新星", desc:"達到 Lv.5", icon:"⭐", title:"冒險新星"},
  {id:"gold1000",  name:"小富翁",   desc:"持有金幣達 1000", icon:"💰", title:"小富翁"},
  {id:"fullset",   name:"全副武裝", desc:"五個裝備欄全部裝滿", icon:"🛡️", title:"全副武裝"},
  {id:"task3",     name:"任務達人", desc:"完成 3 個任務", icon:"📌", title:"任務達人"},
  {id:"task10",    name:"堅持到底", desc:"完成 10 個任務", icon:"🏅", title:"學習毅力王"},
  {id:"lesson5",   name:"勇敢發言", desc:"課堂回答 5 次", icon:"💡", title:"勇敢發言家"},
  {id:"streak3",   name:"連續思考", desc:"學習連勝 3 天", icon:"🔥", title:"連勝思考者"},
  {id:"thanks5",   name:"合作之星", desc:"輪流向不同同學送出 5 份感謝", icon:"💌", title:"合作之星"},
  {id:"boss_win",  name:"屠龍見習", desc:"參與擊敗一隻 Boss", icon:"🐉", title:"屠龍見習生"},
  {id:"boss_mvp",  name:"團隊守護者", desc:"在 Boss 戰中完成一次團隊合作", icon:"🏆", title:"團隊守護者"},
  {id:"designer",  name:"裝備設計師", desc:"設計的作品通過審核上架", icon:"🎨", title:"裝備設計師"},
];

const TITLE_DEFS = [
  {name:"數學小霸王", effect:{atk:3},            fx:"⚔ ATK +3",        hint:"段考/小考表現優異"},
  {name:"專注大師",   effect:{int:3},            fx:"🔮 INT +3",        hint:"上課專注不分心"},
  {name:"神速筆記手", effect:{agi:3},            fx:"💨 AGI +3",        hint:"筆記完整工整"},
  {name:"鋼鐵意志",   effect:{def:3},            fx:"🛡 DEF +3",        hint:"遇挫不放棄"},
  {name:"小組軍師",   effect:{xpMul:0.10},       fx:"✨ XP 獲得 +10%",   hint:"帶領小組討論"},
  {name:"黃金獵人",   effect:{goldMul:0.10},     fx:"💰 金幣獲得 +10%",  hint:"積極參與活動"},
  {name:"生命鬥士",   effect:{hp:20},            fx:"❤️ HP 上限 +20",    hint:"運動/健康好表現"},
  {name:"幸運星",     effect:{xpMul:0.05, goldMul:0.05}, fx:"🌟 XP+5%、金幣+5%", hint:"隨機驚喜/進步獎"},
  {name:"公會之光",   effect:{atk:1,def:1,agi:1,int:1},  fx:"👑 全屬性 +1",  hint:"模範表現"},
  {name:"精打細算",   effect:{shopOff:0.10},     fx:"🏷 商店購物 9 折",  hint:"理財/儲蓄達人"},
];

const JOB_BODY_COLOR = { Warrior:"#c46a4a", Mage:"#5a7fd6", Rogue:"#5faa6e", Cleric:"#c9a35a" };

