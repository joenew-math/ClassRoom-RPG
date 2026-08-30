/*

 * classroom-policy-data：由主程式分離的固定資料定義。

 * 本檔必須在原主程式之前以一般 script 載入。

 */

const UNASSIGNED_GROUP="無組別";

const DUNGEON_URL="./Lession/math-dungeon.html", DUNGEON_LAUNCH_KEY="classRpgDungeonLaunch", DUNGEON_PENDING_KEY="classRpgDungeonPending";

const STAT_CAP=200;

const GOLD_PER_DIAMOND=1000;

const COURSE_CATALOG_URL="./Lession/Lessionindex.html";

const TEACHER_BANK_TEMPLATE_URL="./Lession/教師題庫匯入範例.xlsx";

const STUDENT_ROSTER_TEMPLATE_URL="./Lession/學生名冊匯入範例.xlsx";

const CLASS_UNLOCK_STAGES = [
  {id:0, icon:"🌱", name:"新手報到", per:0, desc:"登入、角色、公告、新手說明與兌獎", features:["stats","announce","redeem"]},
  {id:1, icon:"📣", name:"課堂起步", per:50, desc:"課堂冒險、和平知識挑戰與課堂 QR", features:["lesson"]},
  {id:2, icon:"📚", name:"自主學習", per:120, desc:"任務、課程目錄、地下城作業與個人成長", features:["quests","dungeon"]},
  {id:3, icon:"🎒", name:"冒險裝備", per:250, desc:"裝備、背包、一般商店與寵物", features:["bag","shop"]},
  {id:4, icon:"🌳", name:"技能覺醒", per:450, desc:"技能樹、五格技能組與合作練習", features:["skills"]},
  {id:5, icon:"🤝", name:"友善公會", per:700, desc:"固定善意句庫、班級關懷值與合作目標", features:["thanks"]},
  {id:6, icon:"🎨", name:"收藏工坊", per:1000, desc:"抽卡、圖紙與裝備設計工坊", features:["wheel","craft"]},
  {id:7, icon:"🛡️", name:"小組協作", per:1400, desc:"小組進度與受教師監督的同儕代審", features:["board","leaderReview"]},
  {id:8, icon:"🐉", name:"團體試煉", per:2000, desc:"Boss、職業合作與團體戰場", features:["boss"]},
  {id:9, icon:"⚔️", name:"競技訓練", per:2800, desc:"雙人、團隊與 AI 競技", features:["arena"]},
  {id:10,icon:"🏰", name:"城堡爭奪", per:3800, desc:"班級公會戰、榮耀之城與城堡商店", features:["guild","castle"]},
  {id:11,icon:"🗺️", name:"知識戰場", per:5000, desc:"Dota、知識攻塔與即時報名", features:["moba"]},
  {id:12,icon:"🌏", name:"世界遠征", per:6500, desc:"跨班公會戰與巔峰之城", features:["world"]}
];

const CLASS_FEATURE_GATES={thanks:"social",leaderReview:"review",arena:"pvp",guild:"guild",castle:"guild",moba:"moba",world:"world"};

const CLASS_GATE_INFO={social:{icon:"💌",name:"學生社交與感謝",note:"確認學生了解固定善意句庫與私密求助入口"},review:{icon:"🛡️",name:"小組互評",note:"代審採量表與教師抽查，不以人氣決定獎勵"},pvp:{icon:"⚔️",name:"競技場",note:"不公開 K/D、落後名次或嘲諷性戰績"},guild:{icon:"🏰",name:"公會與攻城",note:"確認分組輪替且城主不享有課堂權力"},moba:{icon:"🗺️",name:"Dota／知識攻塔",note:"只使用系統指令，不提供自由聊天"},world:{icon:"🌏",name:"跨班世界系統",note:"對外只顯示班級暱稱，不公開學生姓名"}};

const CLASS_FEATURE_LABELS={stats:"角色成長",announce:"班級公告",redeem:"獎勵兌換",lesson:"課堂挑戰",quests:"學習任務",dungeon:"數學地下城",bag:"裝備背包",shop:"冒險商店",skills:"技能樹",thanks:"友善感謝",wheel:"命運卡包",craft:"設計工坊",board:"小組協作",leaderReview:"同儕代審",boss:"團體試煉",arena:"競技場",guild:"公會戰",castle:"榮耀之城",moba:"知識攻塔",world:"跨班世界"};

const CLASS_UNLOCK_CELEBRATION_MIN_MS=10000,CLASS_UNLOCK_CELEBRATION_TOTAL_MS=12500;

const AUTO_KEEP_GOLD_RATIO = 0.2;

const AUTO_PILOT_FEATURES={stats:"能力配點",skills:"技能樹與技能組",shop:"商店與裝備",guild:"公會攻城券"};

const AUTO_SUB_STAT = { Warrior:"def", Rogue:"atk", Mage:"def", Cleric:"def" };

const AUTO_SKILL_BUILD = {
  Warrior:['def','sur','atk'],      // 守護騎士 → 生存 → 反擊
  Mage:['thunder','ice','fire'],    // 雷電控制 → 冰霜控制 → 火焰爆發
  Rogue:['burst','gold','support'], // 標記收割 → 地面控制 → 機動輔助
  Cleric:['heal','buff','smite']    // 治療核心 → 防護增益 → 神聖輸出
};

const AUTO_JOB_GEAR = {
  Warrior:{hat:[1,3,7],clothes:[4,6,8],pants:[40,41],weapon:[9,25,26,43,27],back:[17,18,47],shoes:[15,16,30]},
  Mage:   {hat:[2],clothes:[5],pants:[42],weapon:[11,44,28],back:[48],shoes:[15,30]},
  Rogue:  {hat:[1,3],clothes:[4],pants:[40],weapon:[10,45],back:[17,49,29],shoes:[15,30]},
  Cleric: {hat:[2,3],clothes:[5,6],pants:[41,42],weapon:[11,26,46,28],back:[18,48,50],shoes:[15,16,30]}
};

const TASK_CATEGORIES = {
  lesson:{icon:"📚",name:"課堂學習"}, homework:{icon:"✏️",name:"作業與訂正"},
  teamwork:{icon:"🤝",name:"合作與服務"}, challenge:{icon:"🏆",name:"挑戰任務"}, project:{icon:"🔎",name:"探究專題"}
};

const TIER_NAMES = ["基礎","進階","挑戰"];

const TIER_ICONS = ["🟢","🟡","🔴"];

const TASK_REVIEW_MODES = {
  teacher:{icon:"👩‍🏫",name:"教師審核"}, auto:{icon:"⚙️",name:"系統自動驗證"}, leader:{icon:"🛡️",name:"隔日組長代審"}
};

const TASK_AUTO_RULES = {
  level:{name:"角色等級",unit:"級"}, totalXp:{name:"累積經驗值",unit:" XP"},
  lessonAnswers:{name:"課堂回答次數",unit:" 次"}, approvedTasks:{name:"已完成任務數",unit:" 件"}, thanksTotal:{name:"輪流送出感謝卡",unit:" 張"},
  dungeonQuestions:{name:"地下城新增答題數",unit:" 題"}, dungeonClears:{name:"地下城新增通關數",unit:" 次"}
};

const TASK_LEADER_DAILY_REVIEW_MAX=10;

const HELP_REQUEST_OPTIONS={
  private:{icon:"🫶",label:"我想和老師私下談談"},
  group:{icon:"🛡️",label:"我在小組互動中感到不舒服"},
  learning:{icon:"📘",label:"我需要學習上的協助"},
  friend:{icon:"🤝",label:"我看到同學可能需要幫忙"}
};

/* 學生「已登入帳號、尚未進入當節課」時採白名單開放。
 * 課後大廳提供自主學習、只有教師可見的學習回饋，以及看完公告後的每日抽卡；
 * 商店、兌獎、工坊、競賽與即時班級操作仍必須持有有效課堂通行證。 */
const AFTER_SCHOOL_FEATURES=Object.freeze({
  courseCatalog:true,dungeonHomework:true,learningSummary:true,announcements:true,privateFeedback:true,
  gacha:true,shop:false,redeem:false,workshop:false,arena:false,guild:false,moba:false,liveLesson:false,quickReward:false
});

const CLASSROOM_ONLY_FEATURES=Object.freeze(["shop","redeem","workshop","arena","guild","moba","liveLesson","quickReward"]);

const ANN_WEEKDAY_ZH=["日","一","二","三","四","五","六"];

const SPIN_COSTS = [0, 30, 60, 100, 160];

const SPIN_MAX = 5;

const CARD_RAR = {
  common:{name:"一般", color:"#e8e8e8", glow:"rgba(255,255,255,.9)"},
  adv:   {name:"進階", color:"#4a9de8", glow:"rgba(74,157,232,.9)"},
  rare:  {name:"稀有", color:"#a55ae8", glow:"rgba(165,90,232,.95)"},
  legend:{name:"傳說", color:"#ff9a1f", glow:"rgba(255,170,40,1)"}
};

const GACHA_RANK = {common:0,adv:1,rare:2,legend:3};

const EDU_OIDC = {
  enabled:false, uiVisible:false, clientId:"", redirectUri:"", // 申請通過後再將 enabled、uiVisible 設為 true
  authorize:"https://oidc.tanet.edu.tw/oidc/v1/azp",
  applyUrl:"https://oidc.tanet.edu.tw/home"
};

const PARENT_VIEW_TTL_MS=15*60*1000;

const CLASS_SESSION_MAX_MS=8*60*60*1000;

const MOBA_TEAM_MAX=15;
