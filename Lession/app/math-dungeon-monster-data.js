/*

 * math-dungeon-monster-data：由主程式分離的固定資料定義。

 * 本檔必須在原主程式之前以一般 script 載入。

 */

const FOES={
  mush:{n:'蘑菇怪',hp:40,atk:7,art:'mush'},
  bat:{n:'蝙蝠',hp:26,atk:5,art:'bat'},
  skel:{n:'骷髏',hp:54,atk:10,art:'skel'},
  boss:{n:'地獄守衛',hp:320,atk:19,art:'boss',boss:1},
  // ── 各區域專屬怪物：每個新區域都有自己的新面孔（血量攻擊隨深度成長）──
  slime:{n:'代數史萊姆',hp:34,atk:6,art:'slime'},      // z2
  moth:{n:'符文飛蛾',hp:30,atk:8,art:'moth'},          // z2
  garg:{n:'砂岩石像鬼',hp:70,atk:12,art:'garg'},       // z3
  tri:{n:'三角小鬼',hp:48,atk:9,art:'tri'},            // z3
  bird:{n:'發條隼',hp:60,atk:13,art:'bird'},           // z4
  cloud:{n:'雲靈',hp:80,atk:11,art:'cloud'},           // z4
  crab:{n:'紫晶蟹',hp:95,atk:14,art:'crab'},           // z5
  ghostm:{n:'深淵幽魂',hp:75,atk:16,art:'ghostm'},     // z5
  dice:{n:'骰子魔',hp:85,atk:15,art:'dice'},           // z6
  knight:{n:'緋紅騎士',hp:120,atk:18,art:'knight'},    // z6
  // 各區域頭目（樓層守衛也跟著區域換人）
  boss2:{n:'方程巨像',hp:400,atk:22,art:'boss2',boss:1},
  boss3:{n:'幾何石像王',hp:500,atk:25,art:'boss3',boss:1},
  boss4:{n:'級數天守',hp:620,atk:28,art:'boss4',boss:1},
  boss5:{n:'圓環魔眼',hp:760,atk:32,art:'boss5',boss:1},
  boss6:{n:'機率之王',hp:900,atk:36,art:'boss6',boss:1},
};

const FLOOR_MONSTERS=[
  [
    {k:'fmSignLamp',n:'正負燈靈',hp:30,atk:5,col:'#ffd45a',hi:'#fff1a0',form:0},
    {k:'fmFactorBug',n:'因數甲蟲',hp:44,atk:7,col:'#62c86e',hi:'#c6f28f',form:1},
    {k:'fmFractionMouse',n:'分數書鼠',hp:38,atk:6,col:'#c48b58',hi:'#f5d8aa',form:2},
    {k:'fmMultipleSlime',n:'倍數史萊姆',hp:46,atk:7,col:'#65b97b',hi:'#caf3b0',form:3},
    {k:'fmAbsGhost',n:'絕對值幽靈',hp:42,atk:8,col:'#8a76bd',hi:'#ded3ff',form:4},
    {k:'fmIntegerStone',n:'整數石兵',hp:58,atk:8,col:'#8f806d',hi:'#ddd0bc',form:5},
  ],[
    {k:'fmEqualDrop',n:'等式水滴',hp:42,atk:7,col:'#55bcea',hi:'#c6f4ff',form:2},
    {k:'fmCoordBee',n:'坐標蜂',hp:46,atk:8,col:'#e7b53f',hi:'#fff092',form:3},
    {k:'fmRatioGear',n:'比例齒輪獸',hp:58,atk:9,col:'#7795bc',hi:'#d7e8ff',form:4},
    {k:'fmIneqWolf',n:'不等式狼',hp:62,atk:10,col:'#687db1',hi:'#c9d7ff',form:5},
    {k:'fmSystemHound',n:'聯立雙頭犬',hp:70,atk:11,col:'#b26478',hi:'#f4bdcc',form:0},
    {k:'fmInverseBat',n:'反比夜蝠',hp:50,atk:11,col:'#584b91',hi:'#bbb0ed',form:1},
  ],[
    {k:'fmRootFox',n:'根號狐',hp:58,atk:10,col:'#ef8555',hi:'#ffe0a6',form:5},
    {k:'fmSquareRock',n:'平方岩獸',hp:76,atk:11,col:'#ad875e',hi:'#ead09b',form:0},
    {k:'fmPythaSpider',n:'畢氏蛛',hp:62,atk:12,col:'#9b61c9',hi:'#e2bbff',form:1},
    {k:'fmFactorSprite',n:'因式精靈',hp:68,atk:12,col:'#52b89c',hi:'#bff5df',form:2},
    {k:'fmPolyButterfly',n:'多項式蝶',hp:64,atk:12,col:'#d16fae',hi:'#ffd0ee',form:3},
    {k:'fmRadicalTurtle',n:'根式石龜',hp:86,atk:13,col:'#718c72',hi:'#cde1ba',form:4},
  ],[
    {k:'fmArithGlow',n:'等差螢火',hp:68,atk:12,col:'#e6d34b',hi:'#fff6a1',form:3},
    {k:'fmGeoLizard',n:'等比蜥',hp:78,atk:13,col:'#64b56a',hi:'#c7ef91',form:4},
    {k:'fmFuncPuppet',n:'函數傀儡',hp:88,atk:14,col:'#4ea1d5',hi:'#c9ecff',form:5},
    {k:'fmSlopeHound',n:'斜率獵犬',hp:82,atk:15,col:'#d57852',hi:'#ffd2a5',form:0},
    {k:'fmQuadGuard',n:'四邊形衛兵',hp:104,atk:15,col:'#8c7ac5',hi:'#dcd2ff',form:1},
    {k:'fmExteriorLion',n:'外角獅',hp:110,atk:16,col:'#c08042',hi:'#ffd58b',form:2},
  ],[
    {k:'fmMirrorImp',n:'相似鏡妖',hp:88,atk:15,col:'#bd6dc9',hi:'#f2c3ff',form:2},
    {k:'fmRatioSerpent',n:'比例翼蛇',hp:94,atk:16,col:'#58a9a4',hi:'#bdf1e8',form:3},
    {k:'fmArcJelly',n:'圓弧水母',hp:100,atk:16,col:'#6a83df',hi:'#cad4ff',form:4},
    {k:'fmAngleDeer',n:'圓周角鹿',hp:108,atk:17,col:'#d39b51',hi:'#ffe0a0',form:5},
    {k:'fmParabolaCat',n:'拋物線貓',hp:102,atk:18,col:'#c96386',hi:'#ffc7d9',form:0},
    {k:'fmTangentScorp',n:'切線蠍',hp:118,atk:18,col:'#7655ad',hi:'#d9b8ff',form:1},
  ],[
    {k:'fmMeanSlime',n:'平均值史萊姆',hp:104,atk:17,col:'#51b8ca',hi:'#c7f5ff',form:2},
    {k:'fmQuartileBird',n:'四分位鳥',hp:112,atk:18,col:'#d69945',hi:'#ffe59e',form:3},
    {k:'fmChanceRabbit',n:'機率兔',hp:110,atk:19,col:'#d36eaa',hi:'#ffd2ee',form:4},
    {k:'fmSampleGhost',n:'樣本幽靈',hp:122,atk:20,col:'#8170c8',hi:'#dfd8ff',form:5},
    {k:'fmCylinderBot',n:'圓柱機兵',hp:136,atk:20,col:'#6888a6',hi:'#d6eaff',form:0},
    {k:'fmConeGolem',n:'圓錐魔像',hp:148,atk:21,col:'#b47a4f',hi:'#f2cea2',form:1},
    {k:'fmSphereStar',n:'球體星獸',hp:142,atk:22,col:'#696ad4',hi:'#d8d8ff',form:2},
  ],
];

const FLOOR_MONSTER_LOOK={};

const MONSTER_REGION_NAMES=[
 ['符號芽獸','質因蟻后','分數水獺','倍數角羊','絕對值魟','整數泥偶','負號飛魚','公因石蟹','互質狸','數線刺蝟'],
 ['代數水狐','方程齒狼','坐標信天翁','比例蜥王','不等號螳螂','聯立海馬','反比影貓','斜率蜂鳥','變數樹精','平衡天秤獸'],
 ['根號火狐','平方犀牛','畢氏銀蛛','因式花妖','多項式鳳蝶','根式玄龜','公式卷龍','直角戰熊','展開孔雀','係數晶蠍'],
 ['等差螢龍','等比翠蜥','函數木偶','斜率赤犬','四邊紫衛','外角金獅','數列雲鯨','截距星鹿','座標風馬','規律機械鳥'],
 ['相似鏡狐','比例翼蛇','圓弧星母','圓周角靈鹿','拋物線月貓','切線紫蠍','弦月水龍','扇形羽獸','映射晶蝶','圓心守望者'],
 ['平均值藍龍','四分位金鳥','機率月兔','樣本夢靈','圓柱銀兵','圓錐赤像','球體星獸','盒狀圖甲蟲','樹狀圖狐狸','資料雲巨人'],
];

const MONSTER_PALETTES=[
 ['#5fcf74','#d8ff9c'],['#55b9e8','#c9f4ff'],['#ef8b50','#ffe1a6'],['#9670d2','#e5c7ff'],
 ['#d96e9d','#ffd0e7'],['#d6b24f','#fff0a0'],['#5cb8a7','#c7f5e7'],['#b07850','#f2d0a2'],
 ['#6e82d8','#d3dcff'],['#c45b5b','#ffc1b0'],['#87966a','#e0efb8'],['#8a78a8','#e1d4f5'],
];

const MONSTER_SUPPORT_ARCHETYPES=[
 {type:'heal',suffix:'生命芽',base:5},{type:'block',suffix:'守護殼',base:7},
 {type:'mana',suffix:'魔力泉',base:1},{type:'draw',suffix:'靈感換牌',base:1},
 {type:'power',suffix:'勇氣共鳴',base:.05},{type:'strike',suffix:'破陣衝擊',base:4},{type:'burn',suffix:'灼熱粉塵',base:2},
 {type:'weaken',suffix:'安定波',base:.05},{type:'luck',suffix:'幸運星塵',base:1},
 {type:'cleanse',suffix:'淨化風',base:1},{type:'regen',suffix:'回春旋律',base:2},
];

const MONSTER_SKILL_GROUPS={
 preemptive:{n:'先制系',ic:'⚡',color:'#ffe06a',d:'每場開戰時判定一次，成功才會先制出手'},
 defense:{n:'防禦系',ic:'🛡️',color:'#8fd0ff',d:'角色實際受到生命傷害後，機率展開防禦'},
 attack:{n:'攻擊系',ic:'⚔️',color:'#ff6b5f',d:'連擊首次達到三連時判定，協助追擊或增傷'},
 recovery:{n:'回復系',ic:'💚',color:'#79e991',d:'生命低於 70% 時判定，治療或啟動持續回復'},
 assist:{n:'輔助系',ic:'🧩',color:'#c48cff',d:'出現詛咒、減傷等負面狀態時判定，提供淨化與支援'},
};

const EFFECT_SKILL_GROUP={strike:'preemptive',block:'defense',power:'attack',burn:'attack',heal:'recovery',regen:'recovery',
  mana:'assist',draw:'assist',weaken:'assist',luck:'assist',cleanse:'assist'};

const BATTLE_SKILL_GROUP={ward:'defense',hex:'assist',fury:'attack',chorus:'assist',swift:'attack',
  breaker:'attack',venom:'attack',chaos:'attack',leech:'recovery',regen:'recovery'};

const MONSTER_BATTLE_ARCHETYPES=[
 ['ward','符文護體'],['hex','迷霧咒語'],['fury','勇氣蓄力'],['swift','迅捷突襲'],['leech','生命汲取'],
 ['breaker','破盾尖角'],['regen','再生甲殼'],['venom','干擾毒粉'],['chorus','群體鼓舞'],['chaos','機率亂流'],
];

const COMPANION_RATE={normal:.03,boss:.01};

const COMPANIONS={
  mush:{ic:'🍄',skill:'孢子療癒',type:'heal',value:6},bat:{ic:'🦇',skill:'夜行偵察',type:'draw',value:1},
  skel:{ic:'💀',skill:'骨盾護衛',type:'block',value:8},slime:{ic:'🟦',skill:'法力膠質',type:'mana',value:1},
  moth:{ic:'🦋',skill:'符粉補給',type:'draw',value:1},garg:{ic:'🗿',skill:'岩壁守護',type:'block',value:10},
  tri:{ic:'🔺',skill:'幾何增幅',type:'mana',value:1},bird:{ic:'🦅',skill:'高速搜索',type:'draw',value:1},
  cloud:{ic:'☁️',skill:'雲霧治療',type:'heal',value:8},crab:{ic:'🦀',skill:'紫晶甲殼',type:'block',value:12},
  ghostm:{ic:'👻',skill:'靈能灌注',type:'mana',value:1},dice:{ic:'🎲',skill:'幸運補牌',type:'draw',value:1},
  knight:{ic:'🛡️',skill:'緋紅援護',type:'block',value:14},
  boss:{ic:'👹',skill:'守衛壁壘',type:'block',value:16},boss2:{ic:'🧱',skill:'方程護壁',type:'block',value:16},
  boss3:{ic:'📐',skill:'王者結界',type:'block',value:18},boss4:{ic:'🏯',skill:'級數回復',type:'heal',value:12},
  boss5:{ic:'👁️',skill:'魔眼灌注',type:'mana',value:2},boss6:{ic:'👑',skill:'命運手牌',type:'draw',value:2},
};

const FUSION_RESULT_NAMES=[
 ['符文角龍','因數潮獺','絕對泥鯨','負號晶蟹','互質數線獸'],
 ['方程水狼','比例坐標鳥','不等聯立王','反比斜率貓','變數平衡樹'],
 ['根平方焰犀','畢氏因式后','多項根式龜','公式直角龍','展開係數凰'],
 ['等差翠龍','函數斜率犬','四邊外角獅','數列截距鯨','坐標規律機兵'],
 ['相似比例翼狐','圓弧周角鹿','拋物切線蠍','弦月扇形龍','映射圓心蝶'],
 ['平均四分位龍','機率樣本夢兔','柱錐雙形兵','球盒晶甲獸','樹圖資料雲王'],
];

const FUSION_TREE_NAMES={
  2:FUSION_RESULT_NAMES.flat().concat(['孢翼夜菇','骨膠騎士']),
  3:['符因天角獸','絕負晶鯨','互質數線龍','方程比例鳥','聯立反比王','斜率變數樹','平衡根焰犀','平方畢氏蛛后',
    '因式多項龜','根式公式卷龍','直角展開凰','係數等差螢蜥','等比函數木偶','斜率四邊獅','外角數列雲鯨','截距坐標風馬',
    '規律相似鏡狐','比例圓弧翼蛇','圓周拋物月鹿','切線弦月紫龍','扇形映射晶蝶','圓心平均守衛','四分機率夢兔','樣本立體雲獸'],
  4:['符文真數龍','晶鯨方程王','聯立變數古樹','根焰畢氏神蛛','因式公式玄龍','展開等差天凰','函數四邊聖獅','數列坐標雲馬',
    '相似圓弧天狐','周角切線月龍','弦扇映射晶皇','圓心統計守衛','機率立體夢獸','數線平衡聖鹿','根式斜率風凰','資料幾何星鯨'],
  5:['真數方程聖龍','變數畢氏世界樹','公式級數天凰','函數坐標神獅','相似切線月狐',
    '映射統計晶皇','機率幾何夢獸','平衡斜率風龍','資料圓心星鯨','六冊符文守護者'],
  6:['法則天龍','星界聖凰','時序巨神','幾何麒麟','機率魔鯨','統計天狐','代數神獅','數理守望者'],
  7:['創世數理神龍','無限星環聖獸','時空演算天凰','真理晶界麒麟','混沌機率魔神','六域知識守護者'],
};

const FUSION_TIER_LABEL=['','Ⅰ 一階原生','Ⅱ 二階融合','Ⅲ 三階融合','Ⅳ 四階融合','Ⅴ 五階史詩','Ⅵ 六階神話','Ⅶ 七階終極'];

const MONSTER_SPECIES_SIGNATURES=[
  {keys:['天凰','聖凰','鳳蝶','凰','隼','鳥','蝶','蛾','蜂','蝠'],id:'wing',n:'飛羽族',trait:'分層羽翼與長尾羽'},
  {keys:['神龍','天龍','翼蛇','水龍','卷龍','龍'],id:'dragon',n:'龍族',trait:'分岔龍角、翼骨與長尾'},
  {keys:['麒麟','角羊','犀牛','鹿','馬'],id:'horn',n:'角獸族',trait:'額角、蹄光與肩甲'},
  {keys:['玄龜','石龜','龜','蟹','甲蟲','甲獸'],id:'shell',n:'重甲族',trait:'厚甲殼、側鉗與盾背'},
  {keys:['銀蛛','神蛛','蜘蛛','蛛','蠍','螳螂','蟻'],id:'insect',n:'節肢族',trait:'觸鬚、複足與尾針'},
  {keys:['月兔','夢兔','機率兔','兔'],id:'rabbit',n:'月兔族',trait:'高低不對稱長耳與絨尾'},
  {keys:['天狐','火狐','水狐','鏡狐','狐狸','狐'],id:'fox',n:'靈狐族',trait:'尖耳、面紋與蓬鬆雙尾'},
  {keys:['神獅','聖獅','金獅','外角獅','獅','狼','犬','獵犬','貓','狸','熊','鼠','刺蝟','犀','獸'],id:'beast',n:'牙獸族',trait:'獸耳、利爪與動態長尾'},
  {keys:['魔鯨','星鯨','雲鯨','泥鯨','鯨','水獺','海馬','飛魚','魟','水母'],id:'aqua',n:'潮生族',trait:'側鰭、流線尾與水紋'},
  {keys:['翼蛇','蛇','蜥王','翠蜥','蜥'],id:'serpent',n:'鱗爬族',trait:'背棘、蛇尾與鱗片'},
  {keys:['世界樹','古樹','樹精','樹','蘑菇','夜菇'],id:'plant',n:'森靈族',trait:'枝角、葉冠與根足'},
  {keys:['巨神','魔神','守護者','守望者','守衛','騎士','衛兵','石兵','機兵','魔像','巨像','傀儡','木偶','泥偶'],id:'construct',n:'構裝族',trait:'方形肩甲、核心與重足'},
  {keys:['史萊姆','水滴','幽魂','夢靈','雲靈','燈靈','精靈','花妖','小鬼'],id:'spirit',n:'靈體族',trait:'漂浮下擺、靈火與透明核心'},
];

const MONSTER_THEME_SIGNATURES=[
  {keys:['星環','星界','星','天穹'],id:'star',n:'星界',trait:'星環與十字星芒'},
  {keys:['符文','公式','方程','代數','數理','演算','函數','係數','因式','數列','法則','平衡'],id:'rune',n:'法則',trait:'發光算式符文'},
  {keys:['晶界','晶','寶石','紫晶'],id:'crystal',n:'晶礦',trait:'菱晶冠與折射亮邊'},
  {keys:['火','焰','緋紅','灼'],id:'flame',n:'熾火',trait:'火冠與不規則焰尾'},
  {keys:['水','潮','海','圓弧'],id:'water',n:'潮汐',trait:'水滴冠與漣漪紋'},
  {keys:['風','雲','翼'],id:'wind',n:'天風',trait:'旋風帶與浮游羽片'},
  {keys:['岩','石','泥','砂'],id:'earth',n:'大地',trait:'岩層護甲與地脈刻紋'},
  {keys:['月','影','幽','深淵','夢','混沌'],id:'shadow',n:'月影',trait:'新月印與暗影粒子'},
  {keys:['幾何','三角','四邊','角','圓','切線','斜率','坐標','圖'],id:'geometry',n:'幾何',trait:'三角刻印與軌道線'},
  {keys:['機率','命運','骰子','平均','樣本','統計','資料'],id:'chance',n:'機率',trait:'骰點核心與機率軌跡'},
];

const MONSTER_SPECIES_PALETTES={
  wing:['#d94c9d','#79255f'],dragon:['#e84b36','#84283a'],horn:['#32b86b','#176f58'],shell:['#18a99c','#166a70'],
  insect:['#8851d6','#4d277f'],rabbit:['#f06eaa','#a73775'],fox:['#f07a32','#9b3d26'],beast:['#397bd8','#234884'],
  aqua:['#20aee8','#176cb1'],serpent:['#31bd69','#177b47'],plant:['#54b83d','#276f32'],construct:['#607dc6','#34477b'],
  spirit:['#9a57de','#54308d'],
};

const MONSTER_THEME_ACCENTS={star:'#fff05d',rune:'#67edff',crystal:'#9dffff',flame:'#ffb52e',water:'#5ce4ff',wind:'#e8ffff',earth:'#ffc469',shadow:'#e28aff',geometry:'#ffef86',chance:'#ff7fd1'};

const MONSTER_EPITHETS=['敏銳巡界者','堅毅守門者','靈巧探路者','沉著觀測者','勇氣共鳴者','星光引路者','古老刻印者','迅捷追跡者','靜謐護衛者','不屈破陣者','知識採集者','六域旅行者'];

const FUSION_RECIPES=[],FUSION_BY_PAIR=new Map();

const MAX_FOLLOWERS=5;

const MONSTER_PERSONALITIES=[
 {id:'assertive',n:'強勢',icon:'👑',extra:{type:'power',value:.03},desc:'敢於帶頭，但要練習聽見隊友。',lines:['我可以帶頭，也會留空間聽大家說。','有力量，也要用在保護夥伴。']},
 {id:'shy',n:'害羞',icon:'🌸',extra:{type:'block',value:3},desc:'不搶著發言，觀察後能細心守護。',lines:['我先觀察，準備好再表達。','安靜不代表沒有想法。']},
 {id:'nervous',n:'緊張',icon:'💧',extra:{type:'mana',value:1},desc:'緊張時會提高警覺，學著用呼吸穩定。',lines:['我有點緊張，先慢慢呼吸。','感到緊張時，我仍能一步一步做。']},
 {id:'irritable',n:'易怒',icon:'🔥',extra:{type:'burn',value:2},desc:'能量旺盛，練習停一下再做選擇。',lines:['我先停三秒，不讓怒氣替我決定。','我能說出不舒服，而不是傷害別人。']},
 {id:'avoidant',n:'逃避',icon:'🌫️',extra:{type:'weaken',value:.03},desc:'擅長避開風險，正在練習面對小挑戰。',lines:['我先完成一小步，不必一次做到完美。','害怕時可以求助，不必獨自躲開。']},
 {id:'brave',n:'勇敢',icon:'🦁',extra:{type:'power',value:.04},desc:'願意嘗試困難任務，也懂得評估風險。',lines:['勇敢不是不害怕，是害怕仍願意嘗試。','我先看清風險，再向前一步。']},
 {id:'gentle',n:'溫柔',icon:'🫶',extra:{type:'heal',value:4},desc:'注意夥伴的感受，提供溫和支持。',lines:['我看見你很努力，需要我陪你嗎？','溫柔對待夥伴，也溫柔對待自己。']},
 {id:'calm',n:'冷靜',icon:'🧊',extra:{type:'weaken',value:.04},desc:'能在混亂中整理情緒與線索。',lines:['先看事實，再決定下一步。','情緒來了，我可以先穩住自己。']},
 {id:'curious',n:'好奇',icon:'🔎',extra:{type:'draw',value:1},desc:'喜歡探索新方法，從提問中找到線索。',lines:['我想問：還有別種解法嗎？','不知道正是開始探索的時候。']},
 {id:'optimistic',n:'樂觀',icon:'☀️',extra:{type:'regen',value:1},desc:'相信可以進步，也願意面對錯誤。',lines:['這次沒成功，我仍多知道了一件事。','我們還有下一次調整的機會。']},
 {id:'cautious',n:'謹慎',icon:'🛡️',extra:{type:'block',value:4},desc:'行動前先檢查，降低衝動造成的失誤。',lines:['我再檢查一次，慢一點也沒關係。','先確認安全，再開始行動。']},
 {id:'stubborn',n:'固執',icon:'🪨',extra:{type:'block',value:3},desc:'很能堅持，也要練習接受新證據。',lines:['堅持很好，但新證據值得我再想想。','改變想法不是認輸，是學會更多。']},
 {id:'cooperative',n:'合作',icon:'🤝',extra:{type:'mana',value:1},desc:'擅長分工與補位，讓團隊資源更充足。',lines:['你做你擅長的，我來補上這一塊。','先確認彼此需要，再一起行動。']},
 {id:'empathetic',n:'同理',icon:'💗',extra:{type:'cleanse',value:1},desc:'能辨認他人感受，協助解除負面情緒。',lines:['我先理解你的感受，不急著評斷。','我們可以不同意，但仍彼此尊重。']},
 {id:'impulsive',n:'衝動',icon:'⚡',extra:{type:'luck',value:1},desc:'反應快、敢嘗試，需練習先想後做。',lines:['我的反應很快，現在多想一秒。','先想結果，再決定要不要衝。']},
 {id:'steady',n:'沉著',icon:'🌊',extra:{type:'weaken',value:.03},desc:'壓力下保持節奏，幫助隊伍穩定。',lines:['先把能控制的事情做好。','不急著反應，先整理現在的線索。']},
 {id:'lively',n:'活潑',icon:'🎈',extra:{type:'draw',value:1},desc:'帶動氣氛並激發靈感，也學習輪流。',lines:['我有新點子，也想先聽你說完。','一起參與，讓每個人都有機會。']},
 {id:'sensitive',n:'敏感',icon:'🍃',extra:{type:'heal',value:3},desc:'容易察覺細微變化，懂得照顧界線。',lines:['我感受得很強烈，需要一點安靜。','察覺細節是能力，也要照顧自己的界線。']},
 {id:'disciplined',n:'自律',icon:'⏳',extra:{type:'regen',value:2},desc:'能維持習慣，穩定地累積小進步。',lines:['我先完成該做的，再選擇想做的。','每天前進一點，會累積成很大的改變。']},
 {id:'responsible',n:'負責',icon:'🧭',extra:{type:'block',value:4},desc:'願意承擔選擇結果並守護團隊。',lines:['這是我的選擇，我願意把後續做好。','我會守住承諾，也會及時求助。']},
];

const PERSONALITY_BY_ID=Object.fromEntries(MONSTER_PERSONALITIES.map(p=>[p.id,p]));

const FOLLOWER_TRIGGER_META={
  preemptive:{n:'開場時',base:.24,tier:.014,max:.43,limit:1},
  defense:{n:'被擊中後',base:.16,tier:.014,max:.34,limit:2},
  attack:{n:'達成三連擊',base:.18,tier:.014,max:.36,limit:2},
  recovery:{n:'HP 低於 70%',base:.22,tier:.014,max:.40,limit:1},
  assist:{n:'出現負面狀態',base:.25,tier:.014,max:.43,limit:2},
};

const PET_SPECIAL_TECHNIQUES={
  boss:{n:'地獄鐵壁',trigger:'defense',effects:[{type:'block',value:12},{type:'strike',value:5}]},
  boss2:{n:'方程重構',trigger:'assist',effects:[{type:'cleanse',value:1},{type:'mana',value:1}]},
  boss3:{n:'幾何反射陣',trigger:'defense',effects:[{type:'block',value:14},{type:'strike',value:6}]},
  boss4:{n:'級數生命聖歌',trigger:'recovery',effects:[{type:'heal',value:12},{type:'regen',value:2}]},
  boss5:{n:'魔眼封印',trigger:'preemptive',effects:[{type:'weaken',value:.06},{type:'strike',value:7}]},
  boss6:{n:'命運逆轉',trigger:'assist',effects:[{type:'draw',value:1},{type:'luck',value:1}]},
  fusion_t6_1:{n:'法則龍息',trigger:'attack',effects:[{type:'strike',value:9},{type:'burn',value:3}]},
  fusion_t6_2:{n:'星羽涅槃',trigger:'recovery',effects:[{type:'heal',value:13},{type:'regen',value:2}]},
  fusion_t6_3:{n:'時間護壁',trigger:'defense',effects:[{type:'block',value:15},{type:'weaken',value:.04}]},
  fusion_t6_4:{n:'真理淨界',trigger:'assist',effects:[{type:'cleanse',value:2},{type:'mana',value:1}]},
  fusion_t6_5:{n:'機率潮汐',trigger:'preemptive',effects:[{type:'weaken',value:.05},{type:'luck',value:1}]},
  fusion_t6_6:{n:'樣本洞察',trigger:'assist',effects:[{type:'draw',value:1},{type:'luck',value:1}]},
  fusion_t6_7:{n:'變數咆哮',trigger:'attack',effects:[{type:'power',value:.07},{type:'strike',value:8}]},
  fusion_t6_8:{n:'六冊結界',trigger:'defense',effects:[{type:'block',value:16},{type:'regen',value:2}]},
  fusion_t7_1:{n:'創世法則龍陣',trigger:'attack',effects:[{type:'strike',value:12},{type:'burn',value:4}]},
  fusion_t7_2:{n:'無限星環守護',trigger:'defense',effects:[{type:'block',value:18},{type:'heal',value:8}]},
  fusion_t7_3:{n:'時空涅槃',trigger:'recovery',effects:[{type:'heal',value:18},{type:'regen',value:3}]},
  fusion_t7_4:{n:'真理晶界',trigger:'assist',effects:[{type:'cleanse',value:2},{type:'mana',value:2}]},
  fusion_t7_5:{n:'混沌先兆',trigger:'preemptive',effects:[{type:'weaken',value:.08},{type:'burn',value:4}]},
  fusion_t7_6:{n:'六域天穹壁',trigger:'defense',effects:[{type:'block',value:20},{type:'cleanse',value:1}]},
};

const ZONE_BOSS=['boss','boss2','boss3','boss4','boss5','boss6'];

const ZONE_ESC=[['skel','skel'],['slime','slime'],['garg','tri'],
                ['bird','bird'],['crab','ghostm'],['knight','dice']];

const SQUADS={
  mushPack:{icon:'mush',n:'蘑菇群',speed:2,delta:1,
    roster:()=>['mush','mush'].concat(Math.random()<.6?['mush']:[]).concat(Math.random()<.3?['bat']:[])},
  batSwarm:{icon:'bat',n:'蝙蝠群',speed:1,delta:1,trait:'prime',
    roster:()=>['bat','bat','bat'].concat(Math.random()<.5?['bat']:[])},
  skelSquad:{icon:'skel',n:'骷髏小隊',speed:2,delta:1,trait:'abs',
    roster:()=>['skel','skel'].concat(Math.random()<.5?['mush']:[]).concat(Math.random()<.35?['skel']:[])},
  // z2 代數迴廊
  slimeBand:{icon:'slime',n:'史萊姆隊',speed:1,delta:1,
    roster:()=>['slime','slime'].concat(Math.random()<.6?['slime']:[]).concat(Math.random()<.3?['moth']:[])},
  mothSwarm:{icon:'moth',n:'飛蛾群',speed:2,delta:1,trait:'prime',
    roster:()=>['moth','moth'].concat(Math.random()<.5?['moth']:[]).concat(Math.random()<.3?['slime']:[])},
  // z3 幾何聖堂
  gargPair:{icon:'garg',n:'石像鬼衛',speed:1,delta:1,trait:'abs',
    roster:()=>['garg'].concat(Math.random()<.6?['garg']:['tri']).concat(Math.random()<.35?['tri']:[])},
  triGang:{icon:'tri',n:'三角幫',speed:2,delta:1,
    roster:()=>['tri','tri'].concat(Math.random()<.5?['tri']:[]).concat(Math.random()<.3?['garg']:[])},
  // z4 數列高塔
  birdFlock:{icon:'bird',n:'發條隼群',speed:2,delta:1,trait:'prime',
    roster:()=>['bird','bird'].concat(Math.random()<.5?['bird']:[]).concat(Math.random()<.3?['cloud']:[])},
  cloudBand:{icon:'cloud',n:'雲靈隊',speed:1,delta:1,
    roster:()=>['cloud','cloud'].concat(Math.random()<.4?['bird']:[])},
  // z5 圓環深淵
  crabPack:{icon:'crab',n:'紫晶蟹群',speed:1,delta:1,trait:'abs',
    roster:()=>['crab','crab'].concat(Math.random()<.4?['ghostm']:[])},
  wraithBand:{icon:'ghostm',n:'幽魂群',speed:2,delta:1,
    roster:()=>['ghostm','ghostm'].concat(Math.random()<.5?['ghostm']:[]).concat(Math.random()<.3?['crab']:[])},
  // z6 機率王座
  diceGang:{icon:'dice',n:'骰子幫',speed:2,delta:1,trait:'prime',
    roster:()=>['dice','dice'].concat(Math.random()<.5?['dice']:[]).concat(Math.random()<.3?['knight']:[])},
  knightGuard:{icon:'knight',n:'緋紅騎士團',speed:1,delta:1,trait:'abs',
    roster:()=>['knight'].concat(Math.random()<.6?['knight']:[]).concat(Math.random()<.4?['dice']:[])},
  // 樓層守衛：頭目與護衛都隨區域更換
  bossGuard:{icon:'boss',n:'守衛親衛隊',speed:2,delta:1,trait:null,
    roster:()=>{const zi=S.zone||0;
      return [ZONE_BOSS[zi]||'boss'].concat(ZONE_ESC[zi]||['skel','skel']);}},
};

const MONSTER_BATTLE_DESC={
 ward:'較常防禦，護盾量提高 30%',hex:'較常施放情緒迷霧，加入詛咒牌',fury:'較常蓄力，強化自己的攻擊',
 swift:'普通攻擊提高 18%',leech:'造成生命傷害後回復少量 HP',breaker:'30% 傷害穿透護盾',
 regen:'防禦時同時回復 HP',venom:'攻擊有 30% 機率混入詛咒牌',chorus:'鼓舞時讓全體怪物提高攻擊',
 chaos:'每回合在猛烈與保守攻擊間變化',
};

const INTENT_ICON={atk:'⚔',def:'🛡',buff:'▲',curse:'✖'};

const INTENT_TXT=f=>f.boss?('👁 蓄力 '+(f.open||0)+'/'+(f.eyes||6))
  :f.act==='def'?'🛡 '+f.intent:f.act==='buff'?'▲ 強化':f.act==='curse'?'✖ 詛咒':'⚔ '+f.intent;

const SEL_LINES={
  start:['😮 我有點緊張，先觀察再行動。','👀 我會尊重對手，也會照顧自己。','🧭 輸贏不是全部，我想試試新的策略。'],
  atk:['🌬️ 先深呼吸，再做出選擇！','🎯 我想清楚目標，再採取行動。','🤝 認真交手，也要尊重彼此。'],
  def:['🛡️ 我需要保護自己，這不是退縮。','💬 我能說出自己的需要。','🧠 先穩住情緒，再想下一步。'],
  buff:['🌱 我看見自己的進步，再試一次！','✨ 我可以從錯誤裡調整策略。','🙌 一起努力，會比逞強走得更遠。'],
  curse:['🌀 情緒亂了也沒關係，先停一下。','🔎 我先辨認感受，不讓衝動決定。','💭 換個角度，也許有新的辦法。'],
  low:['💪 我很挫折，但仍能選擇怎麼回應。','🫶 需要幫忙時，我可以清楚說出來。','🌤️ 這一回合不順，不代表我做不到。'],
};

const MONSTER_SKILL_VISUAL={
 ward:{glyph:'🛡',bit:'◇',color:'#8fd0ff'},hex:{glyph:'☾',bit:'✦',color:'#c67cff'},
 fury:{glyph:'🔥',bit:'▲',color:'#ff654f'},swift:{glyph:'➤',bit:'›',color:'#d9f7ff'},
 leech:{glyph:'♦',bit:'●',color:'#ff4976'},breaker:{glyph:'✹',bit:'◆',color:'#ffd15c'},
 regen:{glyph:'🌿',bit:'❧',color:'#74ef8d'},venom:{glyph:'☣',bit:'●',color:'#b879ff'},
 chorus:{glyph:'♫',bit:'♪',color:'#ff9fdd'},chaos:{glyph:'✧',bit:'◈',color:'#75e8ff'},
};

