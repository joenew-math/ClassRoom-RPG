/*

 * classroom-avatar-data：由主程式分離的固定資料定義。

 * 本檔必須在原主程式之前以一般 script 載入。

 */

const DOLL_ART = {
  clothes:{
    4:'<rect x="33" y="52" width="34" height="30" rx="6" fill="#7aa05c"/>',
    5:'<rect x="31" y="50" width="38" height="34" rx="6" fill="#6a5aa8"/><rect x="31" y="50" width="38" height="8" fill="#8d7dd0"/>',
    6:'<rect x="33" y="52" width="34" height="30" rx="6" fill="#8a6238"/><rect x="46" y="52" width="8" height="30" fill="#6e4c28"/>',
    8:'<rect x="30" y="49" width="40" height="35" rx="6" fill="#d0483e"/><rect x="30" y="49" width="40" height="7" fill="#f0b429"/>',
  },
  hat:{
    1:'<path d="M30 30 L50 12 L70 30 Z" fill="#7a5230"/><rect x="27" y="28" width="46" height="6" rx="3" fill="#5c3d22"/>',
    2:'<path d="M32 30 L50 4 L58 30 Z" fill="#4a5fb0"/><circle cx="50" cy="6" r="3" fill="#f0e07a"/>',
    3:'<path d="M31 30 Q50 12 69 30 L69 34 L31 34 Z" fill="#8a6238"/>',
    7:'<path d="M29 30 Q50 8 71 30 L71 35 L29 35 Z" fill="#3e8a72"/><path d="M42 14 L46 6 L50 14 Z" fill="#66c9a8"/><path d="M54 14 L58 6 L62 14 Z" fill="#66c9a8"/>',
  },
  weapon:{
    51:'<line x1="64" y1="69" x2="86" y2="24" stroke="#62351f" stroke-width="5" stroke-linecap="round"/><path d="M85 25 Q91 16 87 10 Q84 17 80 12 Q78 20 85 25 Z" fill="#dcecff" stroke="#315b78" stroke-width="1.3"/><path d="M80 30 Q88 33 83 40 Q80 35 75 37" fill="none" stroke="#4fb77b" stroke-width="2.5"/><circle cx="64" cy="69" r="3" fill="#c93d2d" stroke="#5f1912" stroke-width="1"/>',
    52:'<line x1="63" y1="70" x2="84" y2="25" stroke="#4b2b20" stroke-width="5" stroke-linecap="round"/><path d="M83 26 L85 12 L90 20 L96 18 Q94 29 86 31 Z" fill="#f0b429" stroke="#7a3218" stroke-width="1.2"/><path d="M84 25 L77 17 Q75 28 82 33" fill="#d84b32" stroke="#7a2017" stroke-width="1.1"/><path d="M78 34 L88 38" stroke="#d84b32" stroke-width="2.4"/><circle cx="63" cy="70" r="3" fill="#f0b429" stroke="#7a3218" stroke-width="1"/>',
    53:'<path d="M71 22 Q94 46 70 72" fill="none" stroke="#b56a24" stroke-width="5"/><path d="M71 23 Q91 46 70 71" fill="none" stroke="#ffd451" stroke-width="1.5"/><line x1="71" y1="23" x2="70" y2="71" stroke="#fff6c0" stroke-width="1.2"/><line x1="67" y1="49" x2="92" y2="20" stroke="#6fc9e8" stroke-width="2"/><polygon points="96,16 90,25 87,21" fill="#ffe56f" stroke="#9a5518" stroke-width="1"/><circle cx="74" cy="45" r="4" fill="#ffcf35" opacity=".8"/>',
    54:'<g transform="rotate(-28 75 48)"><rect x="66" y="27" width="7" height="25" rx="3" fill="#3d4654" stroke="#111820" stroke-width="1.2"/><rect x="78" y="52" width="7" height="25" rx="3" fill="#3d4654" stroke="#111820" stroke-width="1.2"/><rect x="67.5" y="30" width="4" height="19" fill="#b94a35"/><rect x="79.5" y="55" width="4" height="19" fill="#b94a35"/><path d="M70 52 Q73 57 81 52" fill="none" stroke="#d7bd69" stroke-width="2" stroke-dasharray="2 2"/></g>',
    43:'<path d="M77 26 L82 30 L62 65 L57 61 Z" fill="#d8e0ec" stroke="#49566b" stroke-width="1.4"/><path d="M79 27 L81 29 L61 63" stroke="#fff" stroke-width="1.5"/><rect x="55" y="59" width="14" height="5" rx="2" fill="#c04a35" stroke="#6d2119" stroke-width="1"/><circle cx="57" cy="69" r="3" fill="#e6b63e" stroke="#795414" stroke-width="1"/>',
    44:'<rect x="77" y="29" width="5" height="43" rx="2" fill="#664a9d" stroke="#332456" stroke-width="1"/><circle cx="80" cy="23" r="8" fill="#83d8ef" stroke="#386a9d" stroke-width="1.3"/><path d="M78 20 L81 17 L83 21" fill="none" stroke="#fff" stroke-width="1.4"/>',
    45:'<path d="M76 24 Q92 50 76 74" fill="none" stroke="#547a58" stroke-width="4"/><path d="M76 25 Q89 50 76 73" fill="none" stroke="#b9d38b" stroke-width="1.3"/><line x1="76" y1="25" x2="76" y2="73" stroke="#dce8dc" stroke-width="1.2"/><path d="M74 28 L82 34 M74 70 L82 64" stroke="#dce8dc" stroke-width="1"/>',
    46:'<rect x="77" y="29" width="5" height="42" rx="2" fill="#d4aa54" stroke="#79531f" stroke-width="1"/><circle cx="80" cy="23" r="7" fill="#ffe6a0" stroke="#c58b27" stroke-width="1.3"/><path d="M80 18 L80 28 M75 23 L85 23" stroke="#fff" stroke-width="1.2"/>',
    9:'<rect x="76" y="34" width="5" height="34" rx="2" fill="#b8c4d8"/><rect x="71" y="62" width="15" height="5" rx="2" fill="#7a5230"/>',
    10:'<path d="M78 30 Q92 52 78 74" fill="none" stroke="#8a6238" stroke-width="4"/><line x1="78" y1="31" x2="78" y2="73" stroke="#d8d2c0" stroke-width="1.6"/>',
    11:'<rect x="78" y="28" width="4" height="44" rx="2" fill="#7a5230"/><circle cx="80" cy="24" r="7" fill="#7ad0e8"/>',
  },
  shoes:{
    15:'<rect x="36" y="82" width="12" height="8" rx="3" fill="#8a6238"/><rect x="52" y="82" width="12" height="8" rx="3" fill="#8a6238"/>',
    16:'<rect x="35" y="80" width="13" height="10" rx="2" fill="#9aa5b8"/><rect x="52" y="80" width="13" height="10" rx="2" fill="#9aa5b8"/>',
  },
  back:{
    47:'<path d="M38 47 Q27 57 27 85 Q37 81 45 86 L50 54 L55 86 Q63 81 73 85 Q73 57 62 47 Q50 43 38 47 Z" fill="#a84035" stroke="#5e211b" stroke-width="1.3"/><path d="M34 57 Q40 54 45 57 M55 57 Q61 54 67 57" stroke="#f0c247" stroke-width="1.3" fill="none"/>',
    48:'<path d="M39 47 Q28 60 30 87 Q40 82 47 87 L50 55 L53 87 Q60 82 70 87 Q72 60 61 47 Q50 42 39 47 Z" fill="#62549b" stroke="#37305d" stroke-width="1.3"/><circle cx="36" cy="62" r="1.7" fill="#aee9ff"/><circle cx="64" cy="68" r="1.4" fill="#aee9ff"/><circle cx="58" cy="55" r="1.2" fill="#fff0a3"/>',
    49:'<path d="M32 48 Q24 62 29 84 L42 80 L44 53 Z" fill="#537a56" stroke="#29452f" stroke-width="1.2"/><path d="M30 53 L20 76 L25 78 L35 55 M34 56 L25 80 L30 82 L39 58" stroke="#c99a60" stroke-width="2"/><path d="M23 75 L19 78 M28 79 L24 82" stroke="#e8eef8" stroke-width="1.2"/>',
    50:'<path d="M42 48 Q31 56 33 82 Q41 78 47 85 L50 55 L53 85 Q59 78 67 82 Q69 56 58 48 Q50 43 42 48 Z" fill="#f1ece0" stroke="#b9a878" stroke-width="1.2"/><path d="M41 55 Q45 63 48 72 M59 55 Q55 63 52 72" stroke="#f0c247" stroke-width="1.2" fill="none"/><path d="M50 47 L50 62 M45 54 L55 54" stroke="#ffe6a0" stroke-width="1.5"/>',
    17:'<rect x="16" y="48" width="18" height="24" rx="5" fill="#8a6238"/><rect x="19" y="52" width="12" height="6" rx="2" fill="#6e4c28"/>',
    18:'<path d="M50 44 Q30 48 26 62 Q24 76 30 86 L50 80 Z" fill="#8a3a3a" stroke="#4a1a1a" stroke-width="1.2"/>'
      +'<path d="M50 44 Q70 48 74 62 Q76 76 70 86 L50 80 Z" fill="#8a3a3a" stroke="#4a1a1a" stroke-width="1.2"/>'
      +'<path d="M50 44 L50 80" stroke="#6a2a2a" stroke-width="1" opacity=".6"/>'
      +'<path d="M42 46 Q46 43 50 43 Q54 43 58 46" fill="none" stroke="#c9a227" stroke-width="1.6"/>',
  },
  eyes:{
    19:'<circle cx="45" cy="37" r="3.4" fill="#fff"/><circle cx="55" cy="37" r="3.4" fill="#fff"/><circle cx="45" cy="37" r="1.6" fill="#3a3128"/><circle cx="55" cy="37" r="1.6" fill="#3a3128"/>',
    20:'<path d="M45 34 L46.2 36.6 L49 37 L46.9 38.9 L47.5 41.6 L45 40.2 L42.5 41.6 L43.1 38.9 L41 37 L43.8 36.6 Z" fill="#f0b429"/><path d="M55 34 L56.2 36.6 L59 37 L56.9 38.9 L57.5 41.6 L55 40.2 L52.5 41.6 L53.1 38.9 L51 37 L53.8 36.6 Z" fill="#f0b429"/>',
  },
  brows:{
    21:'<rect x="41" y="31" width="7" height="2" rx="1" fill="#3a3128"/><rect x="52" y="31" width="7" height="2" rx="1" fill="#3a3128"/>',
  },
  nose:{
    22:'<circle cx="50" cy="41" r="2" fill="#d8a878"/>',
  },
};

const PALETTE = [
  "#ffffff","#e8ecf7","#9aa5c4","#5a648a","#10141f","#000000",
  "#e05252","#d0483e","#8a3a3a","#ff8a5c","#f0b429","#ffe08a",
  "#5cc47a","#2e8b57","#66c9a8","#7ad0e8","#4f8fe0","#3c5bd0",
  "#a06cd5","#e07ab8","#f0cfa8","#c9986a","#7a5230","#4a3520",
];

const GRID = 32;

const CUSTOM_REGION = {
  hat:{x:28,y:4,w:44,h:28},
  clothes:{x:30,y:48,w:40,h:36},
  weapon:{x:66,y:14,w:32,h:64},   /* 右側 1/3 直條(8×16 畫布→每格 4×4 正方) */
  back:{x:12,y:44,w:26,h:44},
  shoes:{x:32,y:78,w:36,h:14},
  /* 💇 髮型：依正式素體的頭頂、瀏海、兩側髮絲到馬尾範圍量測；
     不再只框住臉中央，畫布、黃框與實際穿戴位置共用同一座標。 */
  hair:{x:19,y:3,w:62,h:50},
  eyes:{x:38,y:31,w:24,h:11},
  brows:{x:37,y:26,w:26,h:7},
  nose:{x:45,y:38,w:10,h:8},
};

const RO_REGION = {   /* 學生像素作品穿在 RO 身體上的落點 */
  hat:{x:26,y:0,w:48,h:24},   clothes:{x:36,y:45,w:28,h:26},
  /* 褲裝安全區加寬、上移：完整遮住八款素體內建短褲，並向下銜接鞋面。 */
  pants:{x:33,y:63,w:34,h:25},
  weapon:{x:66,y:14,w:32,h:64},
  back:{x:22,y:38,w:56,h:32},          /* 🪽 寬幅置中:變形後橫跨 x8~92,可畫左右對稱的翅膀 */
  shoes:{x:33,y:76,w:34,h:14},
  /* 新六款素體共用的完整髮絲安全區（含雙馬尾/丸子頭的外側與下緣） */
  hair:{x:19,y:3,w:62,h:50},
  eyes:{x:37,y:26,w:26,h:11},  brows:{x:36,y:20,w:28,h:7}, nose:{x:46,y:34,w:8,h:7},
};

const RO_DEFS =
  '<defs>'
  + '<linearGradient id="roBlade" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#9aa8c0"/><stop offset=".5" stop-color="#e8eef8"/><stop offset="1" stop-color="#b8c4d8"/></linearGradient>'
  + '<linearGradient id="roHero" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e86050"/><stop offset="1" stop-color="#b03028"/></linearGradient>'
  + '<linearGradient id="roDragon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#49b090"/><stop offset="1" stop-color="#257a5e"/></linearGradient>'
  + '<linearGradient id="roMetal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfd8e6"/><stop offset="1" stop-color="#8a97ad"/></linearGradient>'
  + '</defs>';

const RO_ART = {
  hat:{
    1:'<path d="M30 16 Q34 3 52 4 L70 12 L66 18 Q48 10 32 19 Z" fill="#8a6238" stroke="#4a3018" stroke-width="1.2"/>'
      +'<path d="M28 17 Q50 9 72 15 L71 20 Q50 14 29 21 Z" fill="#5c3d22" stroke="#3a2510" stroke-width="1"/>'
      +'<path d="M58 5 Q66 -2 72 2 Q68 8 61 9 Z" fill="#e8ecf7" stroke="#9aa5c4" stroke-width="1"/><path d="M62 4 Q66 1 69 3" stroke="#e05252" stroke-width="1.4" fill="none"/>',
    2:'<path d="M34 18 Q40 -4 58 2 Q52 4 50 8 Q60 4 64 10 Q54 8 52 14 L66 16 Q50 10 34 18 Z" fill="#3c5bd0" stroke="#22337a" stroke-width="1.2"/>'
      +'<path d="M26 18 Q50 8 74 16 L73 22 Q50 13 27 23 Z" fill="#4a6ae0" stroke="#22337a" stroke-width="1.2"/>'
      +'<circle cx="46" cy="8" r="1.4" fill="#ffe08a"/><circle cx="56" cy="12" r="1.1" fill="#ffe08a"/>',
    3:'<path d="M31 18 Q33 4 50 3 Q67 4 69 18 L69 21 Q50 15 31 21 Z" fill="#9a7040" stroke="#4a3018" stroke-width="1.2"/>'
      +'<path d="M35 9 Q50 4 65 9" stroke="#c99a60" stroke-width="1.6" fill="none"/>'
      +'<circle cx="38" cy="15" r="1.2" fill="#5c3d22"/><circle cx="50" cy="12" r="1.2" fill="#5c3d22"/><circle cx="62" cy="15" r="1.2" fill="#5c3d22"/>',
    7:'<path d="M31 14 Q22 8 24 -1 Q31 3 35 10 Z" fill="#e8d5a3" stroke="#a8905e" stroke-width="1.2"/>'
      +'<path d="M69 14 Q78 8 76 -1 Q69 3 65 10 Z" fill="#e8d5a3" stroke="#a8905e" stroke-width="1.2"/>'
      +'<path d="M29 20 Q30 1 50 0 Q70 1 71 20 L71 22 Q50 15 29 22 Z" fill="url(#roDragon)" stroke="#174d3a" stroke-width="1.3"/>'
      +'<path d="M34 10 q4 -4.5 8 0 q4 -4.5 8 0 q4 -4.5 8 0 q4 -4.5 8 0" stroke="#7fd8b8" stroke-width="1.5" fill="none"/>'
      +'<path d="M36 16 q4 -4.5 8 0 q4 -4.5 8 0 q4 -4.5 8 0" stroke="#66c9a8" stroke-width="1.5" fill="none"/>'
      +'<path d="M28 21 Q50 14 72 21 L72 25 Q50 18 28 25 Z" fill="#f0b429" stroke="#a87f1f" stroke-width="1.1"/>'
      +'<circle cx="50" cy="8" r="3.2" fill="#e05252" stroke="#7a1f1a" stroke-width="1"/><circle cx="49" cy="7" r="1" fill="#ffb3b3"/>',
  },
  clothes:{
    4:'<path d="M38 45 Q50 41 62 45 L64 66 Q50 71 36 66 Z" fill="#6f9e52" stroke="#3d5c2a" stroke-width="1.2"/>'
      +'<path d="M38 45 Q50 41 62 45 L61 50 Q50 46 39 50 Z" fill="#87b868"/>'
      +'<rect x="38" y="61" width="24" height="3.6" rx="1.8" fill="#4a3018"/>',
    5:'<path d="M37 45 Q50 41 63 45 L68 74 Q50 79 32 74 Z" fill="#6a5aa8" stroke="#3d3268" stroke-width="1.2"/>'
      +'<path d="M37 45 Q50 41 63 45 L62 51 Q50 46 38 51 Z" fill="#8d7dd0"/>'
      +'<path d="M33 72 Q50 77 67 72" stroke="#f0b429" stroke-width="2" fill="none"/>'
      +'<path d="M50 46 L50 74" stroke="#584a90" stroke-width="1.4"/>',
    6:'<path d="M38 45 Q50 42 62 45 L64 66 Q50 70 36 66 Z" fill="#8a6238" stroke="#4a3018" stroke-width="1.3"/>'
      +'<path d="M40 46 L60 63 M60 46 L40 63" stroke="#5c3d22" stroke-width="2.2"/>'
      +'<circle cx="50" cy="54.5" r="2.4" fill="#f0b429" stroke="#a87f1f" stroke-width="1"/>'
      +'<rect x="37" y="62" width="26" height="3.6" rx="1.8" fill="#4a3018"/>',
    8:'<ellipse cx="36" cy="47.5" rx="7" ry="5.4" fill="url(#roHero)" stroke="#7a1f1a" stroke-width="1.2"/>'
      +'<ellipse cx="64" cy="47.5" rx="7" ry="5.4" fill="url(#roHero)" stroke="#7a1f1a" stroke-width="1.2"/>'
      +'<path d="M31 45 Q36 42 41 45" stroke="#f0b429" stroke-width="1.6" fill="none"/><path d="M59 45 Q64 42 69 45" stroke="#f0b429" stroke-width="1.6" fill="none"/>'
      +'<path d="M38 46 Q50 42 62 46 L65 67 Q50 72 35 67 Z" fill="url(#roHero)" stroke="#7a1f1a" stroke-width="1.3"/>'
      +'<path d="M38 46 Q50 42 62 46" stroke="#f0b429" stroke-width="2.2" fill="none"/>'
      +'<path d="M36 65 Q50 70 64 65" stroke="#f0b429" stroke-width="2" fill="none"/>'
      +'<circle cx="50" cy="55" r="3.6" fill="#f0b429" stroke="#a87f1f" stroke-width="1.1"/><circle cx="50" cy="55" r="1.5" fill="#ffe08a"/>'
      +'<path d="M41 48 L43 62" stroke="#ffffff" stroke-width="1.2" opacity=".35"/>',
  },
  pants:{
    40:'<path d="M40 67 L48 67 L47 84 L41 84 Z" fill="#4a6a9a" stroke="#26364f" stroke-width="1.2"/>'
      +'<path d="M52 67 L60 67 L59 84 L53 84 Z" fill="#4a6a9a" stroke="#26364f" stroke-width="1.2"/>'
      +'<rect x="39" y="65" width="22" height="5" rx="2" fill="#3a5580"/>',
    41:'<path d="M39 67 L49 67 L48 86 L41 86 Z" fill="#7a5a38" stroke="#3d2e18" stroke-width="1.2"/>'
      +'<path d="M51 67 L61 67 L59 86 L52 86 Z" fill="#7a5a38" stroke="#3d2e18" stroke-width="1.2"/>'
      +'<rect x="38" y="65" width="24" height="5" rx="2" fill="#5c4428"/>'
      +'<path d="M41 70 L47 70 M53 70 L59 70" stroke="#9a7a50" stroke-width="1" opacity=".5"/>',
    42:'<path d="M37 66 Q50 63 63 66 L66 86 Q50 90 34 86 Z" fill="#5a4a8a" stroke="#2e2450" stroke-width="1.2"/>'
      +'<path d="M50 65 L50 88" stroke="#7a6aac" stroke-width="1" opacity=".4"/>'
      +'<path d="M37 82 Q50 85 63 82" stroke="#3a2e60" stroke-width="1.4" fill="none" opacity=".6"/>',
  },
  weapon:{
    51:'<line x1="62" y1="72" x2="85" y2="25" stroke="#59331f" stroke-width="5.2" stroke-linecap="round"/><line x1="63" y1="70" x2="84" y2="27" stroke="#a76a38" stroke-width="1.1"/><path d="M84 27 Q93 17 88 9 Q84 18 79 12 Q77 22 84 27 Z" fill="url(#roBlade)" stroke="#315b78" stroke-width="1.2"/><path d="M80 31 Q91 33 84 42 Q81 36 74 39" fill="none" stroke="#43b878" stroke-width="2.4"/><path d="M78 34 Q85 35 81 39" fill="none" stroke="#b9f0c9" stroke-width="1"/><circle cx="62" cy="72" r="3" fill="#c93d2d" stroke="#5f1912" stroke-width="1"/>',
    52:'<line x1="61" y1="73" x2="84" y2="26" stroke="#3e251e" stroke-width="5.5" stroke-linecap="round"/><line x1="62" y1="71" x2="83" y2="28" stroke="#9b5e37" stroke-width="1.1"/><path d="M83 28 L85 10 L90 19 L97 16 Q95 29 86 33 Z" fill="#f0b429" stroke="#793018" stroke-width="1.2"/><path d="M84 27 L76 15 Q73 29 82 36 Z" fill="#d94831" stroke="#701b14" stroke-width="1.2"/><path d="M86 28 L94 35 Q87 40 81 35" fill="#e66a36" stroke="#793018" stroke-width="1"/><path d="M77 36 L88 41" stroke="#d94831" stroke-width="2.8"/><circle cx="61" cy="73" r="3.2" fill="#f0b429" stroke="#793018" stroke-width="1"/>',
    53:'<path d="M66 20 Q94 45 66 73" fill="none" stroke="#9b5422" stroke-width="4.6" stroke-linecap="round"/><path d="M66 21 Q90 45 66 72" fill="none" stroke="#ffd654" stroke-width="1.4"/><line x1="66" y1="21" x2="66" y2="72" stroke="#fff9d0" stroke-width="1.1"/><line x1="63" y1="51" x2="91" y2="18" stroke="#73cce9" stroke-width="2.1"/><polygon points="96,13 90,23 86,19" fill="#ffe875" stroke="#925018" stroke-width="1"/><path d="M64 48 L58 43 M64 48 L57 51" stroke="#e9663f" stroke-width="1.5"/><circle cx="70" cy="44" r="6" fill="#ffd63c" opacity=".2"/><circle cx="68" cy="45" r="2.4" fill="#fff8a8"/>',
    54:'<g transform="rotate(-30 72 49)"><rect x="62" y="25" width="7.5" height="27" rx="3" fill="#252d38" stroke="#0e1218" stroke-width="1.2"/><rect x="77" y="51" width="7.5" height="27" rx="3" fill="#252d38" stroke="#0e1218" stroke-width="1.2"/><rect x="63.6" y="28" width="4.2" height="21" rx="1" fill="#a93c31"/><rect x="78.6" y="54" width="4.2" height="21" rx="1" fill="#a93c31"/><path d="M66 52 Q70 60 80 51" fill="none" stroke="#e1c667" stroke-width="2.1" stroke-dasharray="2.4 1.8"/><path d="M64 30 L68 30 M79 56 L83 56" stroke="#f0c247" stroke-width="1.1"/></g>',
    43:'<polygon points="65,58 61,54 86,16 91,20" fill="url(#roBlade)" stroke="#6f5730" stroke-width="1.1"/><line x1="63.5" y1="56" x2="88" y2="18" stroke="#fff6c8" stroke-width="1.1"/><rect x="57.5" y="54" width="15" height="4.2" rx="2" transform="rotate(-57 65 56)" fill="#c33f31" stroke="#6d1a14" stroke-width="1"/><rect x="62" y="59" width="5" height="12" rx="2" transform="rotate(-57 64.5 65)" fill="#684225" stroke="#392211" stroke-width=".9"/><circle cx="60.5" cy="71" r="2.8" fill="#f0c247" stroke="#805817" stroke-width="1"/>',
    44:'<rect x="65.5" y="27" width="4.8" height="45" rx="2" fill="#624a99" stroke="#302054" stroke-width="1"/><circle cx="67.9" cy="21" r="7.3" fill="#80d8ee" stroke="#3b779f" stroke-width="1.2"/><circle cx="66" cy="19" r="2" fill="#efffff"/><circle cx="67.9" cy="21" r="10" fill="#80d8ee" opacity=".15"/><circle cx="66" cy="52" r="3.1" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>',
    45:'<path d="M65 22 Q90 45 65 71" fill="none" stroke="#4b7551" stroke-width="3.8" stroke-linecap="round"/><path d="M65 23 Q87 45 65 70" fill="none" stroke="#b6d887" stroke-width="1.25"/><line x1="65" y1="23" x2="65" y2="70" stroke="#e6f1e3" stroke-width="1.1"/><path d="M65 26 L76 33 M65 67 L76 60" stroke="#e6f1e3" stroke-width=".9"/><circle cx="67" cy="47" r="3.1" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>',
    46:'<rect x="65.5" y="28" width="4.8" height="44" rx="2" fill="#c69443" stroke="#74501b" stroke-width="1"/><circle cx="67.9" cy="21" r="6.8" fill="#ffe49a" stroke="#c48a21" stroke-width="1.15"/><path d="M67.9 16.5 L67.9 25.5 M63.4 21 L72.4 21" stroke="#fff9d6" stroke-width="1.2"/><circle cx="66" cy="52" r="3.1" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>',
    25:'<polygon points="66,60 62.5,56.5 86,16 90,19" fill="#c9d4e8" stroke="#5a648a" stroke-width="1"/>'
      +'<polygon points="84,13 92,18 90,21 85.5,17.5" fill="#e8eef8" stroke="#5a648a" stroke-width="0.8"/>'
      +'<line x1="64.6" y1="58" x2="87" y2="19" stroke="#ffffff" stroke-width="0.9" opacity=".7"/>'
      +'<rect x="59.5" y="56.4" width="12" height="3.6" rx="1.6" transform="rotate(-59 66 58.2)" fill="#c0392b" stroke="#7a1f14" stroke-width="1"/>'
      +'<rect x="63.4" y="60.6" width="4.4" height="11" rx="2" transform="rotate(-59 65.6 66)" fill="#6b4a28" stroke="#3d2a14" stroke-width="0.9"/>'
      +'<circle cx="62" cy="72" r="2.2" fill="#c0392b" stroke="#7a1f14" stroke-width="0.9"/>',
    26:'<polygon points="66,60 62.5,56.5 84,22 88,25" fill="#8a8f9c" stroke="#4a4f5c" stroke-width="1"/>'
      +'<path d="M84 22 L92 15 L90 24 L88 25 Z" fill="#b8bec9" stroke="#4a4f5c" stroke-width="0.9"/>'
      +'<path d="M80 27 L86 30 L82 33 Z" fill="#b8bec9" stroke="#4a4f5c" stroke-width="0.9"/>'
      +'<rect x="59.5" y="56.4" width="12" height="3.6" rx="1.6" transform="rotate(-58 66 58.2)" fill="#f0b429" stroke="#a87f1f" stroke-width="1"/>'
      +'<rect x="63.4" y="60.6" width="4.4" height="11" rx="2" transform="rotate(-58 65.6 66)" fill="#4a3a2a" stroke="#241a10" stroke-width="0.9"/>',
    27:'<polygon points="65,58 61,54 86,14 91,18" fill="url(#roBlade)" stroke="#7a5a1a" stroke-width="1.1"/>'
      +'<line x1="63.4" y1="56" x2="88" y2="16.5" stroke="#fff6c8" stroke-width="1.2" opacity=".9"/>'
      +'<polygon points="84,10 93,16 91,19.5 85.5,15" fill="#fff2c0" stroke="#a87f1f" stroke-width="0.9"/>'
      +'<rect x="57.5" y="54.4" width="15" height="4.4" rx="2" transform="rotate(-58 65 56.6)" fill="#f0b429" stroke="#8a5a00" stroke-width="1.1"/>'
      +'<rect x="62.4" y="59" width="5" height="12" rx="2.4" transform="rotate(-58 64.9 65)" fill="#7a1f14" stroke="#3a0d08" stroke-width="1"/>'
      +'<circle cx="60.5" cy="71" r="2.8" fill="#ffd234" stroke="#8a5a00" stroke-width="1"/>'
      +'<circle cx="72" cy="34" r="2.2" fill="#fff6c8" opacity=".85"/>',
    28:'<rect x="62" y="40" width="24" height="30" rx="2.5" fill="#4a3a8a" stroke="#241a50" stroke-width="1.2"/>'
      +'<rect x="62" y="40" width="6" height="30" fill="#2e2460" stroke="#241a50" stroke-width="1"/>'
      +'<rect x="70" y="46" width="12" height="2.4" rx="1" fill="#f0b429"/>'
      +'<rect x="70" y="52" width="12" height="2.4" rx="1" fill="#f0b429" opacity=".8"/>'
      +'<rect x="70" y="58" width="8" height="2.4" rx="1" fill="#f0b429" opacity=".6"/>'
      +'<circle cx="82" cy="64" r="3.2" fill="#ffd234" stroke="#8a5a00" stroke-width="1"/>'
      +'<circle cx="88" cy="36" r="1.8" fill="#fff6c8" opacity=".8"/>',
    9:'<polygon points="65,57 61.5,53.5 83,20 88,24.5" fill="url(#roBlade)" stroke="#5a648a" stroke-width="1"/>'
      +'<line x1="63.6" y1="55" x2="85.2" y2="22" stroke="#ffffff" stroke-width="1" opacity=".85"/>'
      +'<polygon points="84,17 90,22 88,24.5 83,20" fill="#e8eef8" stroke="#5a648a" stroke-width="0.8"/>'
      +'<rect x="58.5" y="53.4" width="13" height="4" rx="1.8" transform="rotate(-57 65 55.4)" fill="#f0b429" stroke="#a87f1f" stroke-width="1"/>'
      +'<rect x="62.6" y="57.6" width="4.6" height="10" rx="2.2" transform="rotate(-57 64.9 62.6)" fill="#8a3a3a" stroke="#4a1a1a" stroke-width="0.9"/>'
      +'<circle cx="61" cy="68" r="2.4" fill="#f0b429" stroke="#a87f1f" stroke-width="0.9"/>'
      +'<circle cx="66.5" cy="59.5" r="3.1" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>',
    10:'<path d="M64 22 Q88 44 64 70" fill="none" stroke="#8a6238" stroke-width="3.4" stroke-linecap="round"/>'
      +'<path d="M64 22 Q86 44 64 70" fill="none" stroke="#c99a60" stroke-width="1.2"/>'
      +'<line x1="64" y1="23" x2="64" y2="69" stroke="#e8ecf7" stroke-width="1.1"/>'
      +'<circle cx="66" cy="46" r="3.1" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>',
    11:'<rect x="65.5" y="24" width="4.4" height="46" rx="2.2" fill="#7a5230" stroke="#4a3018" stroke-width="1"/>'
      +'<circle cx="67.7" cy="20" r="6.4" fill="#7ad0e8" stroke="#3c88b0" stroke-width="1.2"/>'
      +'<circle cx="65.8" cy="18" r="2" fill="#d8f4ff"/>'
      +'<circle cx="67.7" cy="20" r="9" fill="#7ad0e8" opacity=".22"/>'
      +'<circle cx="67.7" cy="52" r="3.1" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>',
  },
  back:{
    47:'<path d="M39 46 Q26 61 25 87 Q35 83 44 88 Q48 89 50 86 Q52 89 56 88 Q65 83 75 87 Q74 61 61 46 Q50 42 39 46 Z" fill="#a83e33" stroke="#5b211b" stroke-width="1.3"/><path d="M31 60 Q38 56 44 60 M56 60 Q62 56 69 60" stroke="#f0c247" stroke-width="1.25" fill="none"/><path d="M40 47 Q50 43 60 47" stroke="#e56a55" stroke-width="1.1" fill="none"/>',
    48:'<path d="M39 46 Q27 61 27 87 Q37 83 45 88 Q50 90 55 88 Q63 83 73 87 Q73 61 61 46 Q50 42 39 46 Z" fill="#5e5197" stroke="#342b5e" stroke-width="1.3"/><circle cx="35" cy="63" r="1.7" fill="#aee9ff"/><circle cx="65" cy="69" r="1.4" fill="#aee9ff"/><circle cx="59" cy="55" r="1.2" fill="#fff0a3"/>',
    49:'<path d="M38 47 Q23 61 26 86 Q34 82 42 86 L46 51 Z" fill="#4c7650" stroke="#28462e" stroke-width="1.25"/><path d="M30 53 L19 76 L24 78 L35 55 M34 57 L25 80 L30 82 L39 59" stroke="#c99a60" stroke-width="2"/><path d="M23 75 L19 78 M28 79 L24 82" stroke="#e8eef8" stroke-width="1.1"/>',
    50:'<path d="M41 47 Q29 58 32 84 Q40 80 47 87 L50 53 L53 87 Q60 80 68 84 Q71 58 59 47 Q50 42 41 47 Z" fill="#f3eee1" stroke="#bcae8d" stroke-width="1.25"/><path d="M41 56 Q45 64 48 73 M59 56 Q55 64 52 73" stroke="#f0c247" stroke-width="1.2" fill="none"/><path d="M50 47 L50 62 M45 54 L55 54" stroke="#ffe69d" stroke-width="1.5"/>',
    29:'<path d="M50 48 Q34 40 24 46 Q30 52 26 60 Q36 58 42 66 Q46 58 50 56 Z" fill="#c0392b" stroke="#6a1a10" stroke-width="1.2"/>'
      +'<path d="M50 48 Q66 40 76 46 Q70 52 74 60 Q64 58 58 66 Q54 58 50 56 Z" fill="#c0392b" stroke="#6a1a10" stroke-width="1.2"/>'
      +'<path d="M46 52 Q36 48 30 51 M44 58 Q36 56 32 59" stroke="#f0b429" stroke-width="1" fill="none" opacity=".8"/>'
      +'<path d="M54 52 Q64 48 70 51 M56 58 Q64 56 68 59" stroke="#f0b429" stroke-width="1" fill="none" opacity=".8"/>'
      +'<path d="M50 46 L47 54 L50 52 L53 54 Z" fill="#ffd234" stroke="#8a5a00" stroke-width="0.9"/>',
    17:'<rect x="38" y="44" width="24" height="26" rx="5" fill="#8a6238" stroke="#4a3018" stroke-width="1.2"/>'
      +'<rect x="42" y="49" width="16" height="8" rx="2.5" fill="#6e4c28" stroke="#4a3018" stroke-width="0.9"/>'
      +'<rect x="45" y="40" width="10" height="6" rx="2.5" fill="#5c3d22" stroke="#3a2410" stroke-width="0.9"/>'
      +'<path d="M42 44 L40 60 M58 44 L60 60" stroke="#5c3d22" stroke-width="2" opacity=".7"/>'
      +'<circle cx="50" cy="63" r="2.4" fill="#f0b429" stroke="#a87f1f" stroke-width="0.8"/>',
    18:'<path d="M38 46 Q26 62 23 87 Q31 84 37 87 Q41 88 45 86 Q40 66 42 51 Z" fill="#a04040" stroke="#5e2323" stroke-width="1.3"/>'
      +'<path d="M33 60 Q30 74 28 84 M39 58 Q37 72 37 84" stroke="#6e2c2c" stroke-width="1.4" fill="none"/>'
      +'<path d="M38 46 Q50 41 62 46 L61 50 Q50 45 39 50 Z" fill="#b85050" stroke="#5e2323" stroke-width="1.1"/>',
  },
  shoes:{
    30:'<path d="M36 78 L36 88 Q36 90 38 90 L47 90 Q49 90 49 88 L49 78 Z" fill="#2e7d6a" stroke="#14403a" stroke-width="1.2"/>'
      +'<path d="M51 78 L51 88 Q51 90 53 90 L62 90 Q64 90 64 88 L64 78 Z" fill="#2e7d6a" stroke="#14403a" stroke-width="1.2"/>'
      +'<rect x="35" y="86" width="15" height="4" rx="1.5" fill="#1a5a4a" stroke="#14403a" stroke-width="1"/>'
      +'<rect x="50" y="86" width="15" height="4" rx="1.5" fill="#1a5a4a" stroke="#14403a" stroke-width="1"/>'
      +'<path d="M33 80 L30 78 M33 83 L29 82" stroke="#8ef0d0" stroke-width="1.2" opacity=".9"/>'
      +'<path d="M67 80 L70 78 M67 83 L71 82" stroke="#8ef0d0" stroke-width="1.2" opacity=".9"/>'
      +'<circle cx="42" cy="81" r="1.8" fill="#8ef0d0" opacity=".9"/><circle cx="57" cy="81" r="1.8" fill="#8ef0d0" opacity=".9"/>',
    15:'<path d="M38 78 L49 78 L49 87 Q43 89 37 87 Z" fill="#8a6238" stroke="#4a3018" stroke-width="1.2"/>'
      +'<path d="M51 78 L62 78 L63 87 Q57 89 51 87 Z" fill="#8a6238" stroke="#4a3018" stroke-width="1.2"/>'
      +'<path d="M38 79.5 L49 79.5 M51 79.5 L62 79.5" stroke="#c99a60" stroke-width="1.6"/>',
    16:'<path d="M38 77 L49 77 L49 87 Q43 89.5 36.5 87 Z" fill="url(#roMetal)" stroke="#5a648a" stroke-width="1.2"/>'
      +'<path d="M51 77 L62 77 L63.5 87 Q57 89.5 51 87 Z" fill="url(#roMetal)" stroke="#5a648a" stroke-width="1.2"/>'
      +'<path d="M38 79 L49 79 M51 79 L62 79" stroke="#f0b429" stroke-width="1.5"/>'
      +'<path d="M40 82 L43 82 M53 82 L56 82" stroke="#ffffff" stroke-width="1.1" opacity=".6"/>',
  },
  eyes:{
    19:'<ellipse cx="43.5" cy="30.5" rx="4.6" ry="5.6" fill="#fff" stroke="#3a2a22" stroke-width="0.8"/><ellipse cx="56.5" cy="30.5" rx="4.6" ry="5.6" fill="#fff" stroke="#3a2a22" stroke-width="0.8"/>'
      +'<circle cx="43.8" cy="31.2" r="3" fill="#5a3c28"/><circle cx="56.8" cy="31.2" r="3" fill="#5a3c28"/>'
      +'<circle cx="42.6" cy="29.4" r="1.4" fill="#fff"/><circle cx="55.6" cy="29.4" r="1.4" fill="#fff"/>'
      +'<circle cx="44.8" cy="32.6" r="0.7" fill="#fff" opacity=".8"/><circle cx="57.8" cy="32.6" r="0.7" fill="#fff" opacity=".8"/>',
    20:'<ellipse cx="43.5" cy="30.5" rx="4.4" ry="5.4" fill="#fff"/><ellipse cx="56.5" cy="30.5" rx="4.4" ry="5.4" fill="#fff"/>'
      +'<path d="M43.5 27.4 L44.5 29.6 L46.9 29.9 L45.2 31.5 L45.6 33.9 L43.5 32.7 L41.4 33.9 L41.8 31.5 L40.1 29.9 L42.5 29.6 Z" fill="#f0b429" stroke="#a87f1f" stroke-width="0.5"/>'
      +'<path d="M56.5 27.4 L57.5 29.6 L59.9 29.9 L58.2 31.5 L58.6 33.9 L56.5 32.7 L54.4 33.9 L54.8 31.5 L53.1 29.9 L55.5 29.6 Z" fill="#f0b429" stroke="#a87f1f" stroke-width="0.5"/>',
  },
  brows:{
    21:'<rect x="39" y="22.5" width="8.5" height="2.4" rx="1.2" fill="#3a3128"/><rect x="52.5" y="22.5" width="8.5" height="2.4" rx="1.2" fill="#3a3128"/>',
  },
  nose:{
    22:'<path d="M49.4 35 Q50.6 36.6 49.6 38" stroke="#d8a878" stroke-width="1.3" fill="none" stroke-linecap="round"/>',
  },
};

const RO_TIER_LV = [1, 5, 15, 30];

const RO_DEFAULT_OUTFIT = {
  name:"冒險者",
  lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="#6b4a2f" stroke="#3d2a18" stroke-width="1"/>'
    +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="#6b4a2f" stroke="#3d2a18" stroke-width="1"/>'
    +'<ellipse cx="44" cy="84.5" rx="5.4" ry="3.6" fill="#4a3520" stroke="#2c1f10" stroke-width="1"/>'
    +'<ellipse cx="56" cy="84.5" rx="5.4" ry="3.6" fill="#4a3520" stroke="#2c1f10" stroke-width="1"/>',
  torso:'<path d="M40 46 Q50 43 60 46 L63 66 Q50 70 37 66 Z" fill="#a0522d" stroke="#5e2f18" stroke-width="1.2"/>'
    +'<rect x="38" y="61.5" width="24" height="4" rx="2" fill="#5c3d22"/><rect x="47.5" y="61" width="5" height="5" rx="1.2" fill="#f0b429" stroke="#a87f1f" stroke-width="0.8"/>',
  arms:'<path d="M37.5 49 Q31 54 32.8 63 L37 62.4 Q36 55 40.5 51 Z" fill="#a0522d" stroke="#5e2f18" stroke-width="1"/>'
    +'<circle cx="34.6" cy="64.4" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
    +'<path d="M62.5 49 Q68.6 53 68 61 L64 60.6 Q64 54.6 59.5 51 Z" fill="#a0522d" stroke="#5e2f18" stroke-width="1"/>',
  headwear:"", aura:"",
};

const RO_NOVICE = { name:"初心者",
      lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="#d8cba8" stroke="#9a8a60" stroke-width="1"/>'
        +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="#d8cba8" stroke="#9a8a60" stroke-width="1"/>'
        +'<ellipse cx="44" cy="84.5" rx="5.4" ry="3.6" fill="#8a6238" stroke="#4a3018" stroke-width="1"/>'
        +'<ellipse cx="56" cy="84.5" rx="5.4" ry="3.6" fill="#8a6238" stroke="#4a3018" stroke-width="1"/>',
      torso:'<path d="M40 46 Q50 43 60 46 L63 66 Q50 70 37 66 Z" fill="#e8dcc0" stroke="#9a8a60" stroke-width="1.2"/>'
        +'<path d="M45 45.5 L50 53 L55 45.5" stroke="#c04838" stroke-width="2" fill="none"/>'
        +'<path d="M40 46 L42 66 M60 46 L58 66" stroke="#c8b890" stroke-width="1"/>'
        +'<rect x="38" y="61.5" width="24" height="3.6" rx="1.8" fill="#8a6238"/>',
      arms:'<path d="M37.5 49 Q31 54 32.8 63 L37 62.4 Q36 55 40.5 51 Z" fill="#e8dcc0" stroke="#9a8a60" stroke-width="1"/>'
        +'<circle cx="34.6" cy="64.4" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
        +'<path d="M62.5 49 Q68.6 53 68 61 L64 60.6 Q64 54.6 59.5 51 Z" fill="#e8dcc0" stroke="#9a8a60" stroke-width="1"/>',
      headwear:"", aura:"" };

const RO_TIER = {
  Warrior: [
    RO_NOVICE,
    { name:"劍士",
      lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="#f0ead8" stroke="#a89a70" stroke-width="1"/>'
        +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="#f0ead8" stroke="#a89a70" stroke-width="1"/>'
        +'<path d="M39 76 L49 76 L49 87 Q43 89 38 87 Z" fill="#8a5a34" stroke="#4a3018" stroke-width="1.1"/>'
        +'<path d="M51 76 L61 76 L62 87 Q56 89 51 87 Z" fill="#8a5a34" stroke="#4a3018" stroke-width="1.1"/>',
      torso:'<path d="M40 46 Q50 43 60 46 L63 66 Q50 70 37 66 Z" fill="#f0ead8" stroke="#a89a70" stroke-width="1.2"/>'
        +'<path d="M41 47 Q50 44 59 47 L61 58 Q50 61 39 58 Z" fill="#c04838" stroke="#7a1f1a" stroke-width="1.2"/>'
        +'<path d="M41 47 Q50 44 59 47" stroke="#e07060" stroke-width="1.6" fill="none"/>'
        +'<rect x="38" y="61.5" width="24" height="4" rx="2" fill="#5c3d22"/><rect x="47.5" y="61" width="5" height="5" rx="1.2" fill="#b8c4d8" stroke="#5a648a" stroke-width="0.8"/>',
      arms:'<path d="M37.5 49 Q31 54 32.8 63 L37 62.4 Q36 55 40.5 51 Z" fill="#f0ead8" stroke="#a89a70" stroke-width="1"/>'
        +'<rect x="31.8" y="58" width="6.4" height="5" rx="2" fill="#c04838" stroke="#7a1f1a" stroke-width="0.9"/>'
        +'<circle cx="34.6" cy="64.4" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
        +'<path d="M62.5 49 Q68.6 53 68 61 L64 60.6 Q64 54.6 59.5 51 Z" fill="#f0ead8" stroke="#a89a70" stroke-width="1"/>',
      headwear:'<path d="M31.8 22.5 Q50 17.5 68.2 22.5 L68 26.5 Q50 21.5 32 26.5 Z" fill="#c04838" stroke="#7a1f1a" stroke-width="1"/>',
      aura:"" },
    { name:"騎士",
      lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="url(#roMetal)" stroke="#5a648a" stroke-width="1.1"/>'
        +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="url(#roMetal)" stroke="#5a648a" stroke-width="1.1"/>'
        +'<path d="M41 72 L48.6 72 M51.4 72 L59 72" stroke="#f0b429" stroke-width="1.3"/>'
        +'<path d="M38.5 77 L49 77 L49 87.5 Q43 89.5 37.5 87.5 Z" fill="url(#roMetal)" stroke="#5a648a" stroke-width="1.1"/>'
        +'<path d="M51 77 L61.5 77 L62.5 87.5 Q56.5 89.5 51 87.5 Z" fill="url(#roMetal)" stroke="#5a648a" stroke-width="1.1"/>',
      torso:'<path d="M39 45.5 Q50 42 61 45.5 L64 66 Q50 70.5 36 66 Z" fill="url(#roMetal)" stroke="#4a5470" stroke-width="1.3"/>'
        +'<path d="M39 45.5 Q50 42 61 45.5" stroke="#f0b429" stroke-width="1.8" fill="none"/>'
        +'<path d="M50 44 L50 68" stroke="#7a86a0" stroke-width="1.3"/>'
        +'<path d="M42 48 L43.5 63" stroke="#ffffff" stroke-width="1.1" opacity=".55"/>'
        +'<rect x="37.5" y="61.5" width="25" height="4" rx="2" fill="#4a5470"/><rect x="47.5" y="61" width="5" height="5" rx="1.2" fill="#f0b429" stroke="#a87f1f" stroke-width="0.8"/>',
      arms:'<ellipse cx="37" cy="48.5" rx="6.2" ry="4.8" fill="url(#roMetal)" stroke="#4a5470" stroke-width="1.2"/>'
        +'<ellipse cx="63" cy="48.5" rx="6.2" ry="4.8" fill="url(#roMetal)" stroke="#4a5470" stroke-width="1.2"/>'
        +'<path d="M32 46 Q37 43.5 42 46" stroke="#f0b429" stroke-width="1.3" fill="none"/><path d="M58 46 Q63 43.5 68 46" stroke="#f0b429" stroke-width="1.3" fill="none"/>'
        +'<path d="M37.5 51 Q31 55 32.8 63 L37 62.4 Q36 56 40.5 52.5 Z" fill="url(#roMetal)" stroke="#4a5470" stroke-width="1"/>'
        +'<circle cx="34.6" cy="64.4" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
        +'<path d="M62.5 51 Q68.6 54.5 68 61 L64 60.6 Q64 55.5 59.5 52.5 Z" fill="url(#roMetal)" stroke="#4a5470" stroke-width="1"/>',
      headwear:"", aura:"" },
    { name:"盧恩騎士",
      lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="#2c3450" stroke="#12182c" stroke-width="1.1"/>'
        +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="#2c3450" stroke="#12182c" stroke-width="1.1"/>'
        +'<path d="M41 72.5 L48.6 72.5 M51.4 72.5 L59 72.5" stroke="#f0b429" stroke-width="1.4"/>'
        +'<path d="M38.5 77 L49 77 L49 87.5 Q43 90 37 87.5 Z" fill="#222a44" stroke="#0e1428" stroke-width="1.1"/>'
        +'<path d="M51 77 L61.5 77 L63 87.5 Q56.5 90 51 87.5 Z" fill="#222a44" stroke="#0e1428" stroke-width="1.1"/>'
        +'<path d="M39 79 L48.5 79 M51.5 79 L62 79" stroke="#7ad0e8" stroke-width="1.2" opacity=".9"/>',
      torso:'<path d="M38.5 45 Q50 41.5 61.5 45 L64.5 66.5 Q50 71 35.5 66.5 Z" fill="#2c3450" stroke="#12182c" stroke-width="1.3"/>'
        +'<path d="M38.5 45 Q50 41.5 61.5 45" stroke="#f0b429" stroke-width="2" fill="none"/>'
        +'<path d="M36.5 65 Q50 69.5 63.5 65" stroke="#f0b429" stroke-width="1.8" fill="none"/>'
        +'<path d="M50 48 L46 54 L50 60 L54 54 Z" fill="none" stroke="#7ad0e8" stroke-width="1.6"/>'
        +'<path d="M50 50.5 L50 57.5 M47.5 54 L52.5 54" stroke="#7ad0e8" stroke-width="1.2"/>'
        +'<circle cx="50" cy="54" r="6.5" fill="#7ad0e8" opacity=".14"/>'
        +'<path d="M41.5 48 L43 62" stroke="#5a6ea0" stroke-width="1.1"/>',
      arms:'<path d="M30.5 44 Q36 40 42 44 L41 50 Q36 47 31.5 50 Z" fill="#222a44" stroke="#0e1428" stroke-width="1.2"/>'
        +'<path d="M69.5 44 Q64 40 58 44 L59 50 Q64 47 68.5 50 Z" fill="#222a44" stroke="#0e1428" stroke-width="1.2"/>'
        +'<path d="M31 44.5 L28 40.5 L33.5 43 Z" fill="#7ad0e8" stroke="#3c88b0" stroke-width="0.8"/>'
        +'<path d="M69 44.5 L72 40.5 L66.5 43 Z" fill="#7ad0e8" stroke="#3c88b0" stroke-width="0.8"/>'
        +'<path d="M31 45 Q36 42 41 45" stroke="#f0b429" stroke-width="1.4" fill="none"/><path d="M59 45 Q64 42 69 45" stroke="#f0b429" stroke-width="1.4" fill="none"/>'
        +'<path d="M37.5 51 Q31 55 32.8 63 L37 62.4 Q36 56 40.5 52.5 Z" fill="#2c3450" stroke="#12182c" stroke-width="1"/>'
        +'<circle cx="34.6" cy="64.4" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
        +'<path d="M62.5 51 Q68.6 54.5 68 61 L64 60.6 Q64 55.5 59.5 52.5 Z" fill="#2c3450" stroke="#12182c" stroke-width="1"/>',
      headwear:"",
      aura:'<ellipse cx="50" cy="90" rx="26" ry="6.5" fill="#7ad0e8" opacity=".16"/>'
        +'<ellipse cx="50" cy="90" rx="18" ry="4.5" fill="#7ad0e8" opacity=".14"/>' },
  ],
  Mage: [
    RO_NOVICE,
    { name:"魔法師",
      lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="#4a3f7a" stroke="#2c2450" stroke-width="1"/>'
        +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="#4a3f7a" stroke="#2c2450" stroke-width="1"/>'
        +'<path d="M40 78 Q50 82 60 78 L60 88 Q50 92 40 88 Z" fill="#5a4f92" stroke="#2c2450" stroke-width="1.1"/>',
      torso:'<path d="M38 45 Q50 42 62 45 L66 70 Q50 75 34 70 Z" fill="#6a5aa8" stroke="#3d3268" stroke-width="1.2"/>'
        +'<path d="M38 45 Q50 42 62 45 L61 51 Q50 46 39 51 Z" fill="#8d7dd0"/>'
        +'<path d="M50 46 L50 70" stroke="#4a3f7a" stroke-width="1.2"/>'
        +'<circle cx="50" cy="54" r="2.6" fill="#7ad0e8" stroke="#3c88b0" stroke-width="0.8"/>',
      arms:'<path d="M37 49 Q30 54 32 64 L36.5 63 Q35.5 56 40 51 Z" fill="#6a5aa8" stroke="#3d3268" stroke-width="1"/>'
        +'<circle cx="34" cy="65" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
        +'<path d="M63 49 Q70 54 68 64 L63.5 63 Q64.5 56 60 51 Z" fill="#6a5aa8" stroke="#3d3268" stroke-width="1"/>',
      headwear:'<path d="M34 20 Q50 -2 66 20 Q50 14 34 20 Z" fill="#4a3f7a" stroke="#2c2450" stroke-width="1.1"/><circle cx="50" cy="6" r="2.2" fill="#7ad0e8"/>',
      aura:"" },
    { name:"巫師",
      lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="#3a2f6a" stroke="#221a48" stroke-width="1"/>'
        +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="#3a2f6a" stroke="#221a48" stroke-width="1"/>'
        +'<path d="M38 76 Q50 81 62 76 L64 90 Q50 94 36 90 Z" fill="#4a3f8a" stroke="#221a48" stroke-width="1.1"/>'
        +'<path d="M36 88 Q50 92 64 88" stroke="#f0b429" stroke-width="1.4" fill="none"/>',
      torso:'<path d="M37 45 Q50 41 63 45 L67 71 Q50 76 33 71 Z" fill="#4a3f8a" stroke="#221a48" stroke-width="1.2"/>'
        +'<path d="M37 45 Q50 41 63 45 L62 52 Q50 46 38 52 Z" fill="#7a6ac0"/>'
        +'<path d="M33 69 Q50 74 67 69" stroke="#f0b429" stroke-width="1.8" fill="none"/>'
        +'<path d="M50 47 L46 53 L50 59 L54 53 Z" fill="none" stroke="#7ad0e8" stroke-width="1.4"/>'
        +'<circle cx="50" cy="53" r="6" fill="#7ad0e8" opacity=".14"/>',
      arms:'<path d="M36 48 Q28 54 30 65 L35 64 Q34 56 39 50 Z" fill="#4a3f8a" stroke="#221a48" stroke-width="1"/>'
        +'<circle cx="32.5" cy="66" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
        +'<path d="M64 48 Q72 54 70 65 L65 64 Q66 56 61 50 Z" fill="#4a3f8a" stroke="#221a48" stroke-width="1"/>'
        +'<path d="M64 46 Q50 42 36 46" stroke="#f0b429" stroke-width="1.2" fill="none"/>',
      headwear:'<path d="M32 22 Q50 16 68 22 Q60 4 50 -2 Q40 4 32 22 Z" fill="#3a2f6a" stroke="#221a48" stroke-width="1.1"/>'
        +'<circle cx="50" cy="4" r="2.6" fill="#7ad0e8" stroke="#3c88b0" stroke-width="0.8"/><path d="M40 16 Q50 12 60 16" stroke="#f0b429" stroke-width="1.4" fill="none"/>',
      aura:"" },
    { name:"大法師",
      lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="#2a2456" stroke="#14102e" stroke-width="1.1"/>'
        +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="#2a2456" stroke="#14102e" stroke-width="1.1"/>'
        +'<path d="M37 75 Q50 81 63 75 L66 91 Q50 95 34 91 Z" fill="#332a66" stroke="#14102e" stroke-width="1.2"/>'
        +'<path d="M35 88 Q50 93 65 88 M38 82 Q50 86 62 82" stroke="#f0b429" stroke-width="1.3" fill="none"/>',
      torso:'<path d="M36 44 Q50 40 64 44 L68 72 Q50 77 32 72 Z" fill="#332a66" stroke="#14102e" stroke-width="1.3"/>'
        +'<path d="M36 44 Q50 40 64 44" stroke="#f0b429" stroke-width="2" fill="none"/>'
        +'<path d="M32 70 Q50 75 68 70" stroke="#f0b429" stroke-width="1.8" fill="none"/>'
        +'<path d="M50 46 L45 53 L50 60 L55 53 Z" fill="#7ad0e8" opacity=".5" stroke="#7ad0e8" stroke-width="1.4"/>'
        +'<circle cx="50" cy="53" r="8" fill="#7ad0e8" opacity=".16"/>'
        +'<circle cx="42" cy="50" r="1.4" fill="#ffe08a"/><circle cx="58" cy="50" r="1.4" fill="#ffe08a"/>',
      arms:'<path d="M35 47 Q27 54 29 66 L34 65 Q33 56 38 49 Z" fill="#332a66" stroke="#14102e" stroke-width="1"/>'
        +'<path d="M33 47 Q50 42 67 47" stroke="#f0b429" stroke-width="1.4" fill="none"/>'
        +'<circle cx="31.5" cy="67" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
        +'<path d="M65 47 Q73 54 71 66 L66 65 Q67 56 62 49 Z" fill="#332a66" stroke="#14102e" stroke-width="1"/>'
        +'<circle cx="72" cy="40" r="3.4" fill="#7ad0e8" opacity=".8" stroke="#3c88b0" stroke-width="1"/><circle cx="72" cy="40" r="6" fill="#7ad0e8" opacity=".2"/>',
      headwear:'<path d="M30 22 Q50 15 70 22 Q62 -1 50 -6 Q38 -1 30 22 Z" fill="#2a2456" stroke="#14102e" stroke-width="1.2"/>'
        +'<path d="M30 21 Q50 14 70 21" stroke="#f0b429" stroke-width="1.6" fill="none"/>'
        +'<circle cx="50" cy="-4" r="3" fill="#7ad0e8" stroke="#3c88b0" stroke-width="0.9"/><circle cx="50" cy="-4" r="5" fill="#7ad0e8" opacity=".3"/>',
      aura:'<ellipse cx="50" cy="90" rx="26" ry="6.5" fill="#9a7ad8" opacity=".18"/><ellipse cx="50" cy="90" rx="17" ry="4.5" fill="#7ad0e8" opacity=".16"/>' },
  ],
  Rogue: [
    RO_NOVICE,
    { name:"遊俠",
      lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="#5a4a38" stroke="#332720" stroke-width="1"/>'
        +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="#5a4a38" stroke="#332720" stroke-width="1"/>'
        +'<path d="M39 76 L49 76 L49 87 Q43 89 38 87 Z" fill="#3a2f24" stroke="#1e1610" stroke-width="1.1"/>'
        +'<path d="M51 76 L61 76 L62 87 Q56 89 51 87 Z" fill="#3a2f24" stroke="#1e1610" stroke-width="1.1"/>',
      torso:'<path d="M39 45 Q50 42 61 45 L63 66 Q50 70 37 66 Z" fill="#4a3f34" stroke="#241d16" stroke-width="1.2"/>'
        +'<path d="M42 45 L44 66 M58 45 L56 66" stroke="#332720" stroke-width="1"/>'
        +'<path d="M44 45 Q50 50 56 45 L54 58 Q50 61 46 58 Z" fill="#b03028" stroke="#6e1a16" stroke-width="1"/>'
        +'<rect x="38" y="61.5" width="24" height="3.6" rx="1.8" fill="#241d16"/>',
      arms:'<path d="M37.5 49 Q31 54 32.8 63 L37 62.4 Q36 55 40.5 51 Z" fill="#4a3f34" stroke="#241d16" stroke-width="1"/>'
        +'<circle cx="34.6" cy="64.4" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
        +'<path d="M62.5 49 Q68.6 53 68 61 L64 60.6 Q64 54.6 59.5 51 Z" fill="#4a3f34" stroke="#241d16" stroke-width="1"/>',
      headwear:'<path d="M36 26 Q50 22 64 26 L64 30 Q50 26 36 30 Z" fill="#b03028" stroke="#6e1a16" stroke-width="1"/>',
      aura:"" },
    { name:"刺客",
      lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="#3a3040" stroke="#1e1826" stroke-width="1.1"/>'
        +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="#3a3040" stroke="#1e1826" stroke-width="1.1"/>'
        +'<path d="M38.5 76 L49 76 L49 87.5 Q43 89.5 37.5 87.5 Z" fill="#282030" stroke="#120e18" stroke-width="1.1"/>'
        +'<path d="M51 76 L61.5 76 L62.5 87.5 Q56.5 89.5 51 87.5 Z" fill="#282030" stroke="#120e18" stroke-width="1.1"/>',
      torso:'<path d="M38 45 Q50 42 62 45 L64 66 Q50 70 36 66 Z" fill="#302838" stroke="#161020" stroke-width="1.2"/>'
        +'<path d="M40 45 Q50 41 60 45 L58 52 Q50 47 42 52 Z" fill="#463a52" stroke="#161020" stroke-width="1"/>'
        +'<path d="M44 46 Q50 51 56 46 L54 60 Q50 63 46 60 Z" fill="#b03028" stroke="#6e1a16" stroke-width="1"/>'
        +'<rect x="38" y="61.5" width="24" height="3.6" rx="1.8" fill="#161020"/>',
      arms:'<path d="M37.5 49 Q31 54 32.8 63 L37 62.4 Q36 55 40.5 51 Z" fill="#302838" stroke="#161020" stroke-width="1"/>'
        +'<rect x="31.6" y="59" width="6.6" height="4.6" rx="1.6" fill="#4a3f34" stroke="#241d16" stroke-width="0.8"/>'
        +'<circle cx="34.6" cy="64.4" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
        +'<path d="M62.5 49 Q68.6 53 68 61 L64 60.6 Q64 54.6 59.5 51 Z" fill="#302838" stroke="#161020" stroke-width="1"/>'
        +'<path d="M66 58 L74 52 L75 55 L67 61 Z" fill="#c0c8d8" stroke="#5a648a" stroke-width="0.8"/>',
      headwear:'<path d="M35 25 Q50 20 65 25 L64 30 Q50 25 36 30 Z" fill="#282030" stroke="#120e18" stroke-width="1"/>'
        +'<path d="M40 22 Q50 19 60 22" stroke="#b03028" stroke-width="1.4" fill="none"/>',
      aura:"" },
    { name:"十字刺客",
      lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="#2a222e" stroke="#140f18" stroke-width="1.1"/>'
        +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="#2a222e" stroke="#140f18" stroke-width="1.1"/>'
        +'<path d="M38.5 76 L49 76 L49 87.5 Q43 90 37 87.5 Z" fill="#1e1826" stroke="#0c0812" stroke-width="1.1"/>'
        +'<path d="M51 76 L61.5 76 L63 87.5 Q56.5 90 51 87.5 Z" fill="#1e1826" stroke="#0c0812" stroke-width="1.1"/>'
        +'<path d="M39 79 L48.5 79 M51.5 79 L62 79" stroke="#b03028" stroke-width="1.2"/>',
      torso:'<path d="M37.5 45 Q50 41 62.5 45 L65 66.5 Q50 70.5 35 66.5 Z" fill="#241d2c" stroke="#120c18" stroke-width="1.3"/>'
        +'<path d="M39 45 Q50 41 61 45 L59 52 Q50 47 41 52 Z" fill="#3a3048" stroke="#120c18" stroke-width="1"/>'
        +'<path d="M50 47 L47 52 L50 57 L53 52 Z M46 51 L54 51" fill="none" stroke="#b03028" stroke-width="1.4"/>'
        +'<path d="M44 46 Q50 51 56 46 L54 61 Q50 64 46 61 Z" fill="#8a2420" stroke="#5a1410" stroke-width="1"/>'
        +'<rect x="37.5" y="61.5" width="25" height="4" rx="2" fill="#120c18"/>',
      arms:'<path d="M30.5 44 Q36 40 42 44 L41 50 Q36 47 31.5 50 Z" fill="#1e1826" stroke="#0c0812" stroke-width="1.1"/>'
        +'<path d="M69.5 44 Q64 40 58 44 L59 50 Q64 47 68.5 50 Z" fill="#1e1826" stroke="#0c0812" stroke-width="1.1"/>'
        +'<path d="M37.5 51 Q31 55 32.8 63 L37 62.4 Q36 56 40.5 52.5 Z" fill="#241d2c" stroke="#120c18" stroke-width="1"/>'
        +'<circle cx="34.6" cy="64.4" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
        +'<path d="M62.5 51 Q68.6 54.5 68 61 L64 60.6 Q64 55.5 59.5 52.5 Z" fill="#241d2c" stroke="#120c18" stroke-width="1"/>'
        +'<path d="M64 57 L75 50 L76.5 53 L65.5 60.5 Z" fill="#d0d8e8" stroke="#5a648a" stroke-width="0.9"/>'
        +'<path d="M24 50 L35 57 L33.5 60 L23 53 Z" fill="#d0d8e8" stroke="#5a648a" stroke-width="0.9"/>',
      headwear:'<path d="M34 25 Q50 19 66 25 L65 30 Q50 24 35 30 Z" fill="#1e1826" stroke="#0c0812" stroke-width="1"/>'
        +'<path d="M39 21 Q50 17 61 21" stroke="#b03028" stroke-width="1.6" fill="none"/>'
        +'<circle cx="42" cy="28" r="1.2" fill="#e05252"/><circle cx="58" cy="28" r="1.2" fill="#e05252"/>',
      aura:'<ellipse cx="50" cy="90" rx="25" ry="6" fill="#b03028" opacity=".14"/><ellipse cx="50" cy="90" rx="16" ry="4" fill="#8a2420" opacity=".16"/>' },
  ],
  Cleric: [
    RO_NOVICE,
    { name:"祭司",
      lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="#e8e2d4" stroke="#b8ae98" stroke-width="1"/>'
        +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="#e8e2d4" stroke="#b8ae98" stroke-width="1"/>'
        +'<path d="M39 78 Q50 82 61 78 L61 88 Q50 92 39 88 Z" fill="#f0ece0" stroke="#b8ae98" stroke-width="1.1"/>',
      torso:'<path d="M38 45 Q50 42 62 45 L65 69 Q50 74 35 69 Z" fill="#f4f0e6" stroke="#c8bea8" stroke-width="1.2"/>'
        +'<path d="M38 45 Q50 42 62 45 L61 51 Q50 46 39 51 Z" fill="#e0d8c4"/>'
        +'<path d="M50 47 L50 53 M47 50 L53 50" stroke="#f0b429" stroke-width="1.6"/>'
        +'<path d="M35 67 Q50 72 65 67" stroke="#f0b429" stroke-width="1.6" fill="none"/>',
      arms:'<path d="M37 49 Q30 54 32 64 L36.5 63 Q35.5 56 40 51 Z" fill="#f4f0e6" stroke="#c8bea8" stroke-width="1"/>'
        +'<circle cx="34" cy="65" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
        +'<path d="M63 49 Q70 54 68 64 L63.5 63 Q64.5 56 60 51 Z" fill="#f4f0e6" stroke="#c8bea8" stroke-width="1"/>',
      headwear:'<path d="M38 22 Q50 17 62 22 L62 26 Q50 21 38 26 Z" fill="#f0b429" stroke="#a87f1f" stroke-width="1"/>',
      aura:"" },
    { name:"神官",
      lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="#f0ece0" stroke="#c0b6a0" stroke-width="1"/>'
        +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="#f0ece0" stroke="#c0b6a0" stroke-width="1"/>'
        +'<path d="M38 76 Q50 81 62 76 L64 90 Q50 94 36 90 Z" fill="#f8f4ea" stroke="#c0b6a0" stroke-width="1.1"/>'
        +'<path d="M36 88 Q50 92 64 88" stroke="#f0b429" stroke-width="1.4" fill="none"/>',
      torso:'<path d="M37 45 Q50 41 63 45 L66 71 Q50 76 34 71 Z" fill="#f8f4ea" stroke="#cabf a8" stroke-width="1.2"/>'.replace("cabf a8","cabfa8")
        +'<path d="M37 45 Q50 41 63 45 L62 52 Q50 46 38 52 Z" fill="#e8e0d0"/>'
        +'<path d="M33 69 Q50 74 67 69" stroke="#f0b429" stroke-width="1.8" fill="none"/>'
        +'<path d="M50 47 L50 57 M45 51 L55 51" stroke="#f0b429" stroke-width="1.8"/>'
        +'<circle cx="50" cy="51" r="5.5" fill="#f0b429" opacity=".14"/>',
      arms:'<path d="M36 48 Q28 54 30 65 L35 64 Q34 56 39 50 Z" fill="#f8f4ea" stroke="#c0b6a0" stroke-width="1"/>'
        +'<circle cx="32.5" cy="66" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
        +'<path d="M64 48 Q72 54 70 65 L65 64 Q66 56 61 50 Z" fill="#f8f4ea" stroke="#c0b6a0" stroke-width="1"/>'
        +'<path d="M64 46 Q50 42 36 46" stroke="#f0b429" stroke-width="1.2" fill="none"/>',
      headwear:'<path d="M37 22 Q50 15 63 22 L63 27 Q50 20 37 27 Z" fill="#f0ece0" stroke="#c0b6a0" stroke-width="1"/>'
        +'<path d="M50 15 L50 20 M47.5 17.5 L52.5 17.5" stroke="#f0b429" stroke-width="1.4"/>',
      aura:"" },
    { name:"大主教",
      lower:'<rect x="41" y="66" width="7.6" height="15" rx="3.4" fill="#f4f0e6" stroke="#c8bea8" stroke-width="1"/>'
        +'<rect x="51.4" y="66" width="7.6" height="15" rx="3.4" fill="#f4f0e6" stroke="#c8bea8" stroke-width="1"/>'
        +'<path d="M37 75 Q50 81 63 75 L66 91 Q50 95 34 91 Z" fill="#fbf8f0" stroke="#c8bea8" stroke-width="1.2"/>'
        +'<path d="M35 88 Q50 93 65 88 M38 82 Q50 86 62 82" stroke="#f0b429" stroke-width="1.3" fill="none"/>',
      torso:'<path d="M36 44 Q50 40 64 44 L68 72 Q50 77 32 72 Z" fill="#fbf8f0" stroke="#d0c6b0" stroke-width="1.3"/>'
        +'<path d="M36 44 Q50 40 64 44" stroke="#f0b429" stroke-width="2" fill="none"/>'
        +'<path d="M32 70 Q50 75 68 70" stroke="#f0b429" stroke-width="1.8" fill="none"/>'
        +'<path d="M50 46 L50 60 M44 51 L56 51" stroke="#f0b429" stroke-width="2"/>'
        +'<circle cx="50" cy="51" r="7" fill="#ffe08a" opacity=".3"/>'
        +'<circle cx="42" cy="49" r="1.4" fill="#f0b429"/><circle cx="58" cy="49" r="1.4" fill="#f0b429"/>',
      arms:'<path d="M35 47 Q27 54 29 66 L34 65 Q33 56 38 49 Z" fill="#fbf8f0" stroke="#d0c6b0" stroke-width="1"/>'
        +'<path d="M33 47 Q50 42 67 47" stroke="#f0b429" stroke-width="1.4" fill="none"/>'
        +'<circle cx="31.5" cy="67" r="2.7" fill="#ffd9b0" stroke="#c98c5e" stroke-width="1"/>'
        +'<path d="M65 47 Q73 54 71 66 L66 65 Q67 56 62 49 Z" fill="#fbf8f0" stroke="#d0c6b0" stroke-width="1"/>'
        +'<rect x="70" y="34" width="3" height="30" rx="1.5" fill="#f0b429" stroke="#a87f1f" stroke-width="0.8"/><circle cx="71.5" cy="32" r="3.4" fill="#ffe08a" stroke="#f0b429" stroke-width="1"/>',
      headwear:'<path d="M36 20 Q50 12 64 20 L64 26 Q50 19 36 26 Z" fill="#f4f0e6" stroke="#c8bea8" stroke-width="1.1"/>'
        +'<path d="M50 4 L50 14 M45 9 L55 9" stroke="#f0b429" stroke-width="1.8"/>'
        +'<path d="M42 10 Q50 6 58 10" stroke="#f0b429" stroke-width="1.4" fill="none"/>',
      aura:'<ellipse cx="50" cy="90" rx="26" ry="6.5" fill="#ffe08a" opacity=".2"/><ellipse cx="50" cy="90" rx="17" ry="4.5" fill="#f0b429" opacity=".16"/>' },
  ],
};

const PET_CRAFT_VISUALS={
  201:{kind:"cape",color:"#58bfd4",fx:"sparkle"},202:{kind:"armor",color:"#b88b46",fx:"glow"},
  203:{kind:"blade",color:"#d95850",fx:"flameFx"},204:{kind:"crown",color:"#66b978",fx:"glow"},
  211:{kind:"wings",color:"#57bde5",fx:"windFx"},212:{kind:"armor",color:"#8e6bd1",fx:"earthFx"},
  213:{kind:"crest",color:"#e84e65",fx:"flameFx"},214:{kind:"wizardHat",color:"#65c98a",fx:"holyFx"},
  221:{kind:"blade",color:"#f04b39",fx:"dragonFx"},222:{kind:"crown",color:"#8069e8",fx:"voidFx"},
  223:{kind:"wings",color:"#f4a23f",fx:"windFx"},224:{kind:"armor",color:"#3caac6",fx:"holyFx"},
  225:{kind:"legguard",color:"#a744bd",fx:"voidFx"},226:{kind:"magicShoe",color:"#2dbf9d",fx:"both"}
};

const ELEM_FX = {   // 四屬性光暈:顏色 + 中文名 + 戰鬥增益(5% 機率,+3 屬性,持續 3 回合)
  flameFx: { name:"🔥 烈焰光暈", c1:"#ff8a3c", c2:"#ffd166", core:"#e8451f", stat:"atk", statName:"攻擊", amt:3, turns:3, chance:5, icon:"🔥" },
  windFx:  { name:"🌪 疾風光暈", c1:"#7de0a8", c2:"#d0ffe4", core:"#3fae76", stat:"agi", statName:"敏捷", amt:3, turns:3, chance:5, icon:"🌪" },
  frostFx: { name:"❄️ 寒冰光暈", c1:"#7ec8ff", c2:"#e0f4ff", core:"#3a9fe0", stat:"int", statName:"智力", amt:3, turns:3, chance:5, icon:"❄️" },
  earthFx: { name:"🌍 大地光暈", c1:"#c9a06a", c2:"#f0d9a8", core:"#8a6238", stat:"def", statName:"防禦", amt:3, turns:3, chance:5, icon:"🌍" },
  holyFx:  { name:"☀️ 聖域星環", c1:"#ffe58a", c2:"#ffffff", core:"#e7a91d", stat:"def", statName:"防禦", amt:4, turns:3, chance:6, icon:"☀️" },
  voidFx:  { name:"🌌 虛空星塵", c1:"#a980ff", c2:"#62d9ff", core:"#5a35b8", stat:"int", statName:"智力", amt:4, turns:3, chance:6, icon:"🌌" },
  dragonFx:{ name:"🐉 龍魂烈光", c1:"#ff5b3d", c2:"#ffd45e", core:"#9f1e18", stat:"atk", statName:"攻擊", amt:4, turns:3, chance:6, icon:"🐉" },
};

const LEGEND_KEYS = "WEHIKQRFJOYLGDVCBNPMSTAU";

const LEGEND_ZH = ["白","亮灰","灰","深灰","墨黑","純黑","紅","暗紅","酒紅","橘","金黃","淡黃",
  "綠","深綠","青綠","天青","藍","深藍","紫","粉","膚","棕膚","棕","深棕"];

const FX_NAME = { none:"無特效", sparkle:"✨閃爍", glow:"🌟光暈", both:"💫雙特效",
  flameFx:"🔥烈焰光暈(攻擊5%→攻+3)", windFx:"🌪疾風光暈(攻擊5%→敏+3)", frostFx:"❄️寒冰光暈(攻擊5%→智+3)", earthFx:"🌍大地光暈(攻擊5%→防+3)",
  holyFx:"☀️聖域星環(攻擊6%→防+4)", voidFx:"🌌虛空星塵(攻擊6%→智+4)", dragonFx:"🐉龍魂烈光(攻擊6%→攻+4)" };

const BASE_FIT = {
  base:   {dx:0,    dy:0,   sx:1,    sy:1,    z:2},
  back:   {dx:0,    dy:0,   sx:1.18, sy:.95,  z:1, center:true},
  pants:  {dx:0,    dy:0,   sx:1.12, sy:.95,  z:3},
  shoes:  {dx:0,    dy:4,   sx:.94,  sy:.87,  z:3},
  clothes:{dx:0,    dy:1,   sx:.83,  sy:.78,  z:4},
  hat:    {dx:0,    dy:-3,  sx:.94,  sy:.88,  z:6},
  weapon: {dx:-3.5, dy:7,   sx:1.28, sy:1.28, z:7}
};

const BASE_POS = {x:20,y:6,w:60,h:86};

const LEGEND_GLOW_DEFS =
  // ⚠️ sRGB 必要(避免半透明光暈發黑);此濾鏡只用於 TOON 群組「外」的獨立光暈層
  '<defs><filter id="lgGlow" x="-150%" y="-150%" width="400%" height="400%" color-interpolation-filters="sRGB">'
  // ① 外圈大範圍柔光
  + '<feGaussianBlur in="SourceAlpha" stdDeviation="6" result="wide">'
  + '<animate attributeName="stdDeviation" values="4.5;8;4.5" dur="2.6s" repeatCount="indefinite"/>'
  + '</feGaussianBlur>'
  + '<feFlood flood-color="#ff2b18" flood-opacity="0.5" result="cw">'
  + '<animate attributeName="flood-opacity" values="0.32;0.6;0.32" dur="2.6s" repeatCount="indefinite"/>'
  + '</feFlood>'
  + '<feComposite in="cw" in2="wide" operator="in" result="glowWide"/>'
  // ② 內圈濃郁貼合光
  + '<feGaussianBlur in="SourceAlpha" stdDeviation="2.6" result="near">'
  + '<animate attributeName="stdDeviation" values="2;3.6;2" dur="2.6s" repeatCount="indefinite"/>'
  + '</feGaussianBlur>'
  + '<feFlood flood-color="#ff2b18" flood-opacity="0.95" result="cn">'
  + '<animate attributeName="flood-opacity" values="0.7;1;0.7" dur="2.6s" repeatCount="indefinite"/>'
  + '</feFlood>'
  + '<feComposite in="cn" in2="near" operator="in" result="glowNear"/>'
  + '<feMerge><feMergeNode in="glowWide"/><feMergeNode in="glowNear"/></feMerge>'
  + '</filter></defs>';

const BASE_VARIANTS = {
  male0:"assets/original-base-male.png", male1:"assets/base-male-1.png", male2:"assets/base-male-2.png", male3:"assets/base-male-3.png",
  female0:"assets/original-base-female.png", female1:"assets/base-female-1.png", female2:"assets/base-female-2.png", female3:"assets/base-female-3.png"
};

const BASE_TUNE_REFERENCE = "male2";

const BASE_VARIANT_SPEC = {
  male0:{w:164,h:280,footY:280,label:"生理男・原始素體"},
  male1:{w:164,h:280,footY:280,label:"生理男・側分短髮"}, male2:{w:164,h:280,footY:280,label:"生理男・刺蝟短髮"}, male3:{w:164,h:280,footY:280,label:"生理男・平瀏海"},
  female0:{w:166,h:280,footY:280,label:"生理女・原始素體"},
  female1:{w:166,h:280,footY:280,label:"生理女・齊瀏海短髮"}, female2:{w:166,h:280,footY:280,label:"生理女・雙馬尾"}, female3:{w:166,h:280,footY:280,label:"生理女・丸子頭"}
};

const BASE_DYE_COLORS = {brown:"棕髮",black:"黑髮",silver:"銀灰髮",blue:"藍髮"};

const TOON_STYLE = 'filter:saturate(1.4) contrast(1.15) '
  + 'drop-shadow(0.8px 0 0 #141414) drop-shadow(-0.8px 0 0 #141414) '
  + 'drop-shadow(0 0.8px 0 #141414) drop-shadow(0 -0.8px 0 #141414);';

const TOON_OPEN = '<g style="'+TOON_STYLE+'">';

const TOON_CLOSE = '</g>';

