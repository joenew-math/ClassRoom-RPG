/* math-dungeon.js
 * 從 Lession/math-dungeon.html 拆出的傳統全域 runtime。
 * 請保留為一般 script，不要直接改成 type=module，避免破壞既有 inline handlers。
 */
"use strict";
const $=id=>document.getElementById(id);
const rand=n=>(Math.random()*n)|0;
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

/* 固定卡牌、寶石與內建補充題由 math-dungeon-data.js 預先載入。 */
/* 依稀有度權重抽卡（luck 提高稀有度機率）*/
function rollCard(pool,luck){
  const bag=[];
  for(const id of pool){
    const r=CARDS[id].r||'C';
    let w=RARITY[r].w;
    if(luck){ if(r==='L')w*=3; else if(r==='E')w*=2; else if(r==='C')w*=0.5; }
    for(let i=0;i<Math.max(1,Math.round(w));i++) bag.push(id);
  }
  return bag[rand(bag.length)];
}
/* 鑲嵌後的實際效果 */
function effCard(o){
  if(!o||!CARDS[o.id]) return {n:'—',t:'',c:0,r:'C'};   // 失效卡的安全預設
  const b=CARDS[o.id], c={...b};
  switch(o.gem){
    case 'spinach': c.dmg=Math.round((c.dmg||0)*1.4); break;
    case 'candel':  c.all=1; break;
    case 'empty':   c.c=Math.max(0,c.c-1); break;
    case 'bracer':  c.hits=(c.hits||1)+1; break;
    case 'hollow':  c.block=(c.block||0)+8; break;
    case 'dup':     c.back=1; break;
    case 'wings':   c.draw=(c.draw||0)+1; break;
    case 'armor':   c.block=(c.block||0)+6; break;
  }
  if(o.perfect&&c.dmg) c.dmg+=3;      // 因式分解答對的完美刻痕
  return c;
}
function cardCostText(c){return c.wild?'✦ '+c.c:(c.c<0?'−'+Math.abs(c.c):String(c.c));}
/* 每場戰鬥建立全新的牌物件並重新洗牌，避免上一次顯示狀態或固定順序滲入起手。 */
function freshBattleDraw(){return shuffle(S.deck.filter(o=>o&&CARDS[o.id]).map(o=>({...o,_dealt:0})));}

/* 地下城內建題型的課程單元索引。
   教師勾選課程目錄後，只追加相同「章節＋單元」的題目，不能只用冊別混抽。 */

const DUNGEON_BUILTIN_QUESTIONS=QUESTIONS.map(q=>{
  const m=dungeonBuiltinScope(q);return Object.assign({},q,m,{source:'dungeon',tag:'地下城追加 · '+m.unit});
});

/* ═══ 程序生成的謎題（無限不重複）═══ */
const gcd=(a,b)=>b?gcd(b,a%b):a;
// 選項去重：干擾項不得等於正解、彼此也不得重複；不足 4 個時自動補

// 方程式門鎖：ax + b = c

// 不等式商店：帶 M 元，每件 p 元，最多買幾件

// 雞兔同籠：寶箱裡的生物

// 最大公因數分隊

// 機率寶箱

// 因式分解鑲嵌

/* ═══════════ 題庫匯入：直接吃老師題庫系統的 BANK 格式 ═══════════
   支援三種貼上內容：
   1. 整份「題庫目錄」HTML（自動抽出 const BANK=[...]）
   2. BANK 陣列本身（含 vol / chap / topic / qs[]）
   3. 已攤平的 [{v,q,opts,ans,sol}] 陣列                        */
let QBANK=DUNGEON_BUILTIN_QUESTIONS.slice(); // 實際使用的題庫
let volPick='auto';                   // auto = 依樓層對應冊別

/* ═══════════ 劇情 NPC：一步步教會遊戲裡用到的數學 ═══════════
   每位 NPC 對應一個遊戲機制，教學採「逐步累積顯示」：
   前面的步驟留在畫面上，讓學生看見完整推導過程，最後實戰一題。 */
const NPCS={

 guide:{name:'引路人 · 米蕾',art:'guide',col:'#8fe86a',
  topic:'地城基礎 · 你需要知道的一切',
  intro:'第一次來？別急著往前衝，我用一分鐘把規矩講完。',
  steps:[
   {t:`這裡是<b>格子迷宮</b>。你走一格，世界就前進一回合 —— 你不動，怪也不動。<br>上滑前進、下滑後退、左右滑轉向，兩側按鈕是水平平移。`},
   {t:`每層樓的<b>樓梯都被封印</b>。先找到這一層的<b>鑰匙</b>，樓梯才會開。<br>地圖每次都不一樣，鑰匙位置也是隨機的 —— 看小地圖找路。`},
   {t:`怪物有<b>正面視野錐</b>（小地圖上的扇形）。被掃到牠才會追你。<br>只有繞到牠的<b>正後方</b>撞上去，才會觸發<b>背後突襲</b> —— 多一回合，但起手仍固定隨機 5 張。`},
   {t:'戰鬥是卡牌。出牌要照費用<b>每次 +1</b> 遞增，這才算<b>連擊</b>。',
    f:'0 → 1 → 2 → 3 → 4'},
   {t:`連得越長，傷害倍率越高。接不下去也能硬打，但<b>連擊會歸 1</b>。<br>卡片右下角會標「<b>接續</b>」或「重算」，照著看就好。`},
   {t:`<b>通用卡（✦）</b>也有自己的法力消耗，但能<b>無視目前需要的費用</b>直接接續連擊。<br>部分通用卡會回復更多魔力；每副牌最多帶 2 張，而且仍要從牌組隨機抽到。`},
   {t:`有些卡的費用是<b>負的</b>（紅色圓圈）。打出它不但不花法力，反而<b>回收</b>法力。<br>
      負數位在序列起點 0 的<b>下方</b>，所以打出後序列會<b>重置回 0</b>，連擊不會斷。<br>
      但天下沒有白吃的午餐 —— 每張負費卡都有代價：扣血、混入詛咒、或讓敵人得到護盾。<br>
      <i>這就是負數：得到的另一面，是付出。</i>`},
   {t:`最後一件事：<b>生命不會自動回復</b>。<br>回血只有兩條路 —— <i>打出長連擊</i>（戰後依連擊回血）和<i>稀有藥水</i>。<br>所以打得漂亮不只是好看，是真的能活下去。`},
  ],
  quiz:genGuideQuiz, reward:{k:'potion',v:1,d:'治療藥水 ×1'}},
 sage:{name:'數列賢者 · 歐拉',art:'sage',col:'#8fd0ff',
  topic:'等差數列 → 連擊序列',
  intro:'年輕人，你剛才出牌的順序……你自己看出規律了嗎？',
  steps:[
   {t:'你打出的費用是 <b>0 → 1 → 2 → 3</b>。每一步都比前一步多 <b>1</b>。'},
   {t:'這種「每次加上固定數」的排列，數學上稱為<b>等差數列</b>。'},
   {t:'那個固定的數叫<b>公差 d</b>。算法是 <b>後項 − 前項</b>。',f:'d = 1 − 0 = 1'},
   {t:'所以這條序列的公差就是 <b>1</b> —— 每一張牌都比前一張貴 1 點。',f:'d = 1'},
   {t:'想知道第 n 張牌要幾費，用<b>一般項公式</b>。從首項出發，加了 (n−1) 次公差。',
    f:'aₙ = a₁ + (n−1)d'},
   {t:'代進去看看：第 5 張牌需要多少費？',f:'a₅ = 0 + (5−1)×1 = 4'},
   {t:'第 6 張就要 5 費 —— 但你的牌最貴只有 4 費，所以一般卡會接不下去。<br>這就是<b>通用卡</b>存在的理由：無視當下費用需求，延續連擊。'},
   {t:`更進一步：通用卡會依效果強度收費，並可能<b>回復更多法力</b>。例如活頁筆記消耗 2、回復 4。<br>
      通用接續 + 法力補回來 → 你就有機會把連擊拉長。<br>
      那會不會變成無限迴圈？不會 —— 因為你還是得<b>剛好抽到那個費用的牌</b>。<br>
      <i>規則本身就是限制</i>，這比額外加上限優雅得多。`},
  ],
  quiz:genSeqQuiz, reward:{k:'step',v:0.05,d:'連鎖倍率 +0.05'}},

 gate:{name:'守門人 · 迪奧',art:'gate',col:'#ecc24e',
  topic:'一元一次方程式 → 封印門',
  intro:'門上的符文是一道方程式。解不開，你就別想過去。',
  steps:[
   {t:'看這道符文：',f:'3x + 30 = 90'},
   {t:'把等號想成<b>天平</b>。兩邊一樣重，你對兩邊做同樣的事，它就還是平的。'},
   {t:'先把礙事的 <b>+30</b> 移走 —— 兩邊<b>同時減 30</b>。',f:'3x + 30 − 30 = 90 − 30'},
   {t:'左邊剩下 3x，右邊變成 60。',f:'3x = 60'},
   {t:'現在 x 被乘了 3。要單獨留下 x，兩邊<b>同時除以 3</b>。',f:'3x ÷ 3 = 60 ÷ 3'},
   {t:'得到答案。',f:'x = 20'},
   {t:'最後一定要<b>代回檢驗</b>：3×20 + 30 = 90 ✓　符文才會亮起。'},
  ],
  quiz:genEquation, reward:{k:'armor',v:1,d:'受到傷害 −1'}},

 smith:{name:'鍛造師 · 費馬',art:'smith',col:'#ff9a5a',
  topic:'因式分解 → 寶石鑲嵌',
  intro:'要把寶石嵌進卡牌，得先讀懂刻痕。刻痕是分解過的式子。',
  steps:[
   {t:'刻痕長這樣：',f:'x² + 5x + 6'},
   {t:'我們要把它拆成<b>兩個括號相乘</b>的形式。',f:'(x + a)(x + b)'},
   {t:'先看看展開會變怎樣 —— 這是關鍵。',f:'(x+a)(x+b) = x² + (a+b)x + ab'},
   {t:'對照原式：一次項係數 <b>5</b> 就是 <b>a+b</b>，常數 <b>6</b> 就是 <b>ab</b>。',
    f:'a + b = 5　　a × b = 6'},
   {t:'所以要找<b>兩數相乘得 6、相加得 5</b>。試試 2 和 3：',f:'2 × 3 = 6 ✓　2 + 3 = 5 ✓'},
   {t:'刻痕解開了。',f:'x² + 5x + 6 = (x + 2)(x + 3)'},
   {t:'口訣記住：<b>積放最後、和放中間</b>。常數為負時兩數一正一負。'},
  ],
  quiz:genFactor, reward:{k:'dmg',v:0.1,d:'全部傷害 +10%'}},

 merchant:{name:'旅商 · 高斯',art:'merchant',col:'#8fe86a',
  topic:'一元一次不等式 → 預算',
  intro:'買賣要算清楚。錢不夠可是會被我趕出去的。',
  steps:[
   {t:'假設你有 <b>100</b> 金幣，我的卡一張 <b>12</b> 金幣。'},
   {t:'設你買 <b>x</b> 張，總價就是 <b>12x</b>。'},
   {t:'錢不能超支，所以用<b>不等式</b>而不是等號。',f:'12x ≤ 100'},
   {t:'兩邊同除以 12。注意：<b>除以正數，不等號方向不變</b>。',f:'x ≤ 8.33…'},
   {t:'但卡片不能買半張 —— 這裡要看情境。<br>「<b>最多</b>買幾張」→ <b>無條件捨去</b>。',f:'x = 8 張'},
   {t:'反過來，「<b>至少</b>要幾個」就得<b>無條件進位</b>。<br>例如 35 顆分成每箱 8 顆，35÷8 = 4.375 → 要 <b>5</b> 箱。'},
   {t:'還有一條最容易錯的：<b>乘或除以負數時，不等號要變號</b>。',f:'−2x > 6　→　x < −3'},
  ],
  quiz:genInequality, reward:{k:'gold',v:4,d:'獲得 4 金幣'}},

 teller:{name:'占卜師 · 帕斯卡',art:'teller',col:'#e26bd6',
  topic:'機率 → 寶箱掉落',
  intro:'開箱前，先算算你的運氣值不值得期待。',
  steps:[
   {t:'這個寶箱裡有 <b>6</b> 顆寶石，其中 <b>2</b> 顆是稀有的。'},
   {t:'機率的定義很單純：<b>有利結果數 ÷ 全部結果數</b>。'},
   {t:'代進去算。',f:'P(稀有) = 2 / 6 = 1/3'},
   {t:'那「<b>沒</b>抽到稀有」的機率呢？不必重算，用<b>互補事件</b>。',f:'P(不是稀有) = 1 − 1/3 = 2/3'},
   {t:'機率永遠介於 <b>0 到 1</b> 之間。0 是不可能，1 是必然。'},
   {t:'連續兩次都沒抽到稀有？兩階段事件<b>相乘</b>。',f:'2/3 × 2/3 = 4/9'},
   {t:'所以連開兩箱至少中一次的機率是 1 − 4/9 = <b>5/9</b>。比你想的高吧。'},
  ],
  quiz:genProbability, reward:{k:'armor',v:2,d:'受到傷害 −2'}},

 stat:{name:'統計官 · 南丁格爾',art:'stat',col:'#bfe8ff',
  topic:'平均數與中位數 → 戰後結算',
  intro:'我記錄每一場戰鬥。數字會告訴你，你到底進步了沒有。',
  steps:[
   {t:'假設你前五場的最長連擊是：',f:'3, 5, 4, 8, 5'},
   {t:'<b>平均數</b> = 總和 ÷ 個數。',f:'(3+5+4+8+5) ÷ 5 = 25 ÷ 5 = 5'},
   {t:'<b>中位數</b>要先<b>排序</b>，再取正中間那個。',f:'3, 4, 5, 5, 8　→　中位數 = 5'},
   {t:'偶數個資料呢？取<b>中間兩個的平均</b>。',f:'3, 4, 5, 8 →  (4+5)÷2 = 4.5'},
   {t:'重點來了：如果某場你爆發 <b>30</b> 連擊，平均會被拉到 10.2，<br>但中位數還是 5。'},
   {t:'<b>平均數容易被極端值影響，中位數不會。</b><br>想知道「你平常的實力」，看中位數比較準。'},
   {t:'還有<b>眾數</b> —— 出現最多次的值。這組是 5，因為它出現兩次。'},
  ],
  quiz:genMedian, reward:{k:'maxhp',v:20,d:'生命上限 +20'}},
};

/* 六冊課程入口 NPC：不另寫一套數學講義，而是直接開啟課程目錄的相符單元。
   題目也只從該單元追加，確保地下城與教師勾選的教學範圍一致。 */
[
 ['course1','課程嚮導 · 小墨','guide','#8fe86a'],
 ['course2','課程嚮導 · 小軸','gate','#8fd0ff'],
 ['course3','課程嚮導 · 小規','smith','#ff9a5a'],
 ['course4','課程嚮導 · 小列','sage','#ffe38a'],
 ['course5','課程嚮導 · 小尺','merchant','#e26bd6'],
 ['course6','課程嚮導 · 小析','stat','#ffb347'],
].forEach((d,i)=>NPCS[d[0]]={name:d[1],art:d[2],col:d[3],topic:`第 ${i+1} 冊 · 課程目錄`,coursePortal:true,vol:i+1});

/* ═══════════════ 合成配方 ═══════════════
   只有兩張基礎卡能合成；所有合成成果都會鎖定，不能再次投入熔爐。
   這能避免反覆融合造成數值膨脹，也讓每次選材更有取捨。 */
const FUSE_TREE=[
 // 兩張基礎【消耗卡】（費用 ≥1）
 {r:'fLine',   a:'wand',   b:'whip',   tier:1, why:'原子筆的軌跡 × 捲尺的直線 → 一次函數'},
 {r:'fDist',   a:'garlic', b:'axe',    tier:1, why:'兩張全體攻擊相乘 → 分配律 a(b+c)'},
 {r:'fSquare', a:'guard',  b:'water',  tier:1, why:'護盾疊上持續效果 → 平方的累積'},
 {r:'fMul',    a:'antonio',b:'imelda', tier:1, why:'倍率 × 抽牌 → 倍增律'},
 {r:'fSeries', a:'pasqua', b:'bible',  tier:1, why:'連續打擊的累加 → 級數'},
 {r:'fDiff',   a:'garlic', b:'imelda', tier:1, why:'全體與抽牌之差 → 差分 aₙ₊₁−aₙ'},
];
/* 合成材料限制：只有「消耗法力」且不是裝備戰技的卡能當材料。
   合成卡、每種 0～4 費的最後一張也不能投入合成。 */
function canFuse(o,index){
  const c=effCard(o);
  return !c.EQUIP && !c.FUSE && !c.wild && !c.neg && !c.CURSE && !c.TEMP && (c.c||0)>=1 &&
    (index===undefined||canRemoveDeckIndex(index));
}
const fuseKey=(x,y)=>[x,y].sort().join('+');
const FUSE_MAP={};
FUSE_TREE.forEach(n=>FUSE_MAP[fuseKey(n.a,n.b)]=n);
function findRecipe(a,b){ return FUSE_MAP[fuseKey(a.id,b.id)]||null; }

/* 合成樹檢視：已解鎖的分枝亮起，未解鎖只給提示 */
function treeScreen(){
  const have=id=>S.deck.some(o=>o.id===id);
  const known=id=>(S.found||[]).includes(id);
  const node=(n,depth)=>{
    const c=CARDS[n.r], R=RARITY[c.r||'C'];
    const got=known(n.r);
    const canNow=have(n.a)&&have(n.b);
    return `<div class="tnode t${n.tier}${got?' got':canNow?' ready':''}" style="margin-left:${(depth)*14}px">
      <div class="tn" style="color:${got?R.col:'#6f6490'}">
        ${'　'.repeat(0)}${depth?'└ ':''}${got?c.n:'？？？'}
        <span class="ttier">第${n.tier}層</span>
        ${canNow&&!got?'<span class="tready">可合成</span>':''}</div>
      <div class="tf">${CARDS[n.a]?CARDS[n.a].n:n.a} ＋ ${CARDS[n.b]?CARDS[n.b].n:n.b}</div>
      ${got?`<div class="tw">${n.why}</div>`:''}
    </div>`;
  };
  const t1=FUSE_TREE.filter(n=>n.tier===1).map(n=>node(n,0)).join('');
  const total=FUSE_TREE.length, got=(S.found||[]).length;
  overlay(`<div class="kicker">FUSION TREE</div><h1>合成樹</h1>
    <div class="rank">已解鎖 ${got} / ${total} 個配方</div>
    <div class="desc" style="margin-bottom:6px">
      特定兩張基礎卡會合出<b>具名成果</b>；合成後即鎖定，不能再次合成。<br>
      標「<b>可合成</b>」表示你手上兩張材料都有。</div>
    <div id="treebox">
      <div class="tsec">單次合成 · 基本運算與式子</div>${t1}
    </div>
    <button class="go" id="ok">返回</button>`,backToDungeon);
}

/* ═══════════════ 隱藏休息室 ═══════════════
   解開數線之門後進入的密室。是一張獨立的小地圖，
   離開時還原原本的迷宮狀態（位置、道具、怪物都保留）。 */
let restSave=null;
const REST_MAP=[
"WWWWWWWWW",
"W.......W",
"W.F...G.W",
"W.......W",
"W...B...W",
"W.......W",
"W.C...E.W",
"W.......W",
"WWWWDWWWW"];
function enterRest(){
  restSave={grid,props,mobs,seen,murals,traps,rivals,MW,MH,
    px:P.x,py:P.y,dir:P.dir};
  grid=REST_MAP.map(r=>r.split(''));
  MW=REST_MAP[0].length; MH=REST_MAP.length;
  mobs=[]; rivals=[]; murals={}; traps={};
  props=[];
  REST_MAP.forEach((row,y)=>row.split('').forEach((ch,x)=>{
    if(ch==='F') props.push({t:'forge',x,y,alive:1});
    if(ch==='G') props.push({t:'gemchest',x,y,alive:1});
    if(ch==='C') props.push({t:'cardchest',x,y,alive:1});
    if(ch==='B') props.push({t:'bed',x,y,alive:1});
    if(ch==='E') props.push({t:'restout',x,y,alive:1});
  }));
  grid=grid.map(r=>r.map(c=>c==='W'?'W':'.'));
  seen=Array.from({length:MH},()=>new Uint8Array(MW));
  P.x=4;P.y=7;P.ax=4;P.ay=7;P.dir=0;P.ang=0;P.aang=0;
  markSeen();
  running=false;
  overlay(`<div class="kicker">HIDDEN CHAMBER</div><h1 style="color:#ffe38a">密室</h1>
    <div class="rank">🔥 融合神殿　💎 寶石寶箱　🃏 卡牌寶箱　🛏 休息床</div>
    <div class="desc">門後是一間溫暖的密室。這裡沒有怪物。<br>
      床可以<b>回滿生命</b>，另外三樣各能使用一次。<br>
      走到最右邊的<b>出口</b>就會回到迷宮原處。</div>
    <button class="go" id="ok">進入</button>`,backToDungeon);
}
function leaveRest(){
  if(!restSave){ backToDungeon(); return; }
  running=false;
  overlay(`<div class="kicker">LEAVE CHAMBER?</div><h1>離開隱藏房間？</h1>
    <div class="rank">離開後會回到原本的迷宮位置</div>
    <div class="desc">請先確認寶石寶箱、卡牌寶箱、融合神殿與休息床是否都已使用。<br>
      尚未取得的密室獎勵離開後就不能回頭拿取。</div>
    <button class="go" id="restLeaveYes">確認離開</button>
    <button class="go" id="restLeaveNo" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">繼續探索密室</button>`,null,el=>{
      if(el.id==='restLeaveNo'){backToDungeon();return true;}
      if(el.id!=='restLeaveYes')return false;
      const r=restSave;restSave=null;
      grid=r.grid;props=r.props;mobs=r.mobs;seen=r.seen;
      murals=r.murals;traps=r.traps;rivals=r.rivals;
      MW=r.MW;MH=r.MH;
      P.x=r.px;P.y=r.py;P.ax=r.px;P.ay=r.py;P.dir=r.dir;
      P.ang=P.dir*Math.PI/2;P.aang=P.ang;
      toast('回到迷宮',1400);backToDungeon();return true;
    });
    return;
}
function bedRest(pr){
  running=false;
  if(S.hp>=S.maxhp){
    overlay(`<div class="kicker">REST</div><h1>你已經很健康了</h1>
      <div class="desc">生命已滿，先去用其他設施吧。</div>
      <button class="go" id="ok">起身</button>`,backToDungeon);
    return;
  }
  const before=S.hp; S.hp=S.maxhp; pr.alive=0; saveChar();
  overlay(`<div class="kicker">REST</div><h1 style="color:#8fe86a">🛏 好好睡了一覺</h1>
    <div class="rank">生命 ${before} → ${S.maxhp}（全滿）</div>
    <div class="desc">床鋪化為光點消散了 —— 這張床只能用一次。</div>
    <button class="go" id="ok">起身</button>`,backToDungeon);
}
function gemChest(pr){
  running=false; pr.alive=0;
  const g=pickGem();
  if(!g){ toast('寶石都收集齊了',1500); backToDungeon(); return; }
  S.gems.push(g);
  overlay(`<div class="kicker">GEM CHEST</div><h1>${GEMS[g].ic} ${GEMS[g].n}</h1>
    <div class="rank">${GEMS[g].d.replace(/<\/?b>/g,'')}</div>
    <div class="desc">寶石要<b>鑲嵌到卡牌上</b>才會生效。<br>
      鑲對組合再開寶箱，該武器就會<i>進化成最終形態</i>。</div>
    <button class="go" id="ok">選擇鑲嵌的卡牌</button>`,()=>socketScreen(g));
}
function cardChest(pr){
  running=false; pr.alive=0;
  const pool=unlockedCards();
  const id=rollCard(pool,true);            // 密室寶箱品質較好
  offerCard(id);
  return;
  saveChar();
  const c=CARDS[id], R=RARITY[c.r||'C'];
  overlay(`<div class="kicker">CARD CHEST</div><h1 style="color:${R.col}">${c.n}</h1>
    <div class="rank" style="color:${R.col};border-color:${R.col}">${R.n}卡</div>
    <div class="desc">${c.t.replace(/<\/?[a-z]+>/g,'　')}<br>已加入牌組。</div>
    <button class="go" id="ok">收下</button>`,backToDungeon);
}

/* ═══════════════ 數線走廊 ═══════════════
   地板本身就是一條數線。門上的條件不是選擇題，
   而是「你要站到哪裡」—— 把移動變成數學操作。 */
/* 數線走廊：題目保證在 −5~5 之間【恰有唯一解】，難度比多解版高。
   5 萬次驗證：解的個數 100% 為 1，且與標示答案相符。 */
const LINE_VALS=[-5,-4,-3,-2,-1,0,1,2,3,4,5];
function genUniqueLine(){
  const pick=LINE_VALS[rand(11)];
  return [
    ()=>{const x=pick,a=1+rand(4),b=rand(9)-4,c=a*x+b;
      return {t:`${a}x ${b<0?'−':'+'} ${Math.abs(b)} = ${c}`,f:v=>a*v+b===c,ans:x,
        why:`移項：${a}x = ${c} ${b<0?'+':'−'} ${Math.abs(b)} = ${a*x} → x = ${x}`};},
    ()=>{const x=pick===0?2:pick;
      return {t:`x³ = ${x**3}`,f:v=>v**3===x**3,ans:x,
        why:`立方根只有一個解：${x}³ = ${x**3}，所以 x = ${x}`};},
    ()=>{const x=pick;
      return {t:`x² = ${x*x}　且　x ${x<0?'< 0':'≥ 0'}`,f:v=>v*v===x*x&&(x<0?v<0:v>=0),ans:x,
        why:`x² = ${x*x} 本來有 ±${Math.abs(x)} 兩解，加上符號條件後只剩 x = ${x}`};},
    ()=>{const x=[2,3,5][rand(3)];
      return {t:`x 是質數　且　x ${x===2?'< 3':x===3?'= 3':'> 3'}`,
        f:v=>[2,3,5].includes(v)&&(x===2?v<3:x===3?v===3:v>3),ans:x,
        why:`−5~5 之間的質數只有 2、3、5；加上條件後唯一解是 ${x}`};},
    ()=>{let h,k,x;
      do{ h=rand(7)-3; k=1+rand(4); x=(rand(2)?h+k:h-k); }while(x<-5||x>5);
      const pos=(x>h);
      return {t:`|x ${h<0?'+':'−'} ${Math.abs(h)}| = ${k}　且　x ${pos?'>':'<'} ${h}`,
        f:v=>Math.abs(v-h)===k&&(pos?v>h:v<h),ans:x,
        why:`兩解為 ${h+k} 與 ${h-k}；加上符號條件後唯一解 x = ${x}`};},
    ()=>{const x=pick===0?3:pick,k=2+rand(5);
      return {t:`x 的<b>相反數</b>的 ${k} 倍等於 ${-x*k}`,f:v=>(-v)*k===(-x*k),ans:x,
        why:`(−x)×${k} = ${-x*k} → −x = ${-x} → x = ${x}`};},
  ][rand(6)]();
}
function lineEvent(pr){
  running=false;
  if(classroomBankActive()){
    const q=dungeonActionQuestion(null);
    quizAsk(q,ok=>{
      if(ok){pr.alive=0;overlay(`<div class="kicker">GATE OPEN</div><h1 style="color:#8fe86a">隱藏門開啟</h1><div class="rank">${q.tag||'教師指定單元'}</div><div class="desc">${q.sol||'答對了！'}<br><br>門後透出溫暖的光，是一間<b>密室</b>。</div><button class="go" id="ok">走進密室</button>`,enterRest);}
      else overlay(`<div class="kicker">BLOCKED</div><h1 style="color:#ff6a6a">隱藏門仍然關閉</h1><div class="desc">${q.sol||'再複習一次這個單元。'}</div><button class="go" id="ok">離開</button>`,backToDungeon);
    },dungeonActionLabel('隱藏門複習'));
    return;
  }
  const C=genLineQ();
  quizStats.total++;
  const draw=(msg)=>{
    overlay(`<div class="kicker">NUMBER LINE</div><h1 style="font-size:20px">數線之門</h1>
      <div class="rank" style="font-family:ui-monospace,monospace;font-size:15px">${C.t}</div>
      ${msg?`<div class="shmsg">${msg}</div>`:''}
      <div class="numline">
        <div class="nlbar"></div>
        ${LINE_VALS.map(v=>`<span class="nlc${v===0?' zero':''}" data-v="${v}"><i>${v}</i></span>`).join('')}
      </div>
      <div class="desc" style="text-align:center">
        這道門<b>只有一個正確位置</b>。站上去，門後的密室就會開啟。</div>`,
      null,el=>{
        const c=el.closest('.nlc'); if(!c)return false;
        const v=+c.dataset.v, ok=C.f(v);
        if(ok)recordQuizCorrect({tag:'數線方程式',tier:2});
        creditQuiz(ok);
        if(!ok) recordWrong({q:`數線之門：${C.t}　x = ?`,
          opts:LINE_VALS.map(String),ans:String(C.ans),sol:C.why,tag:'數線方程式'});
        setTimeout(()=>overlay(`<div class="kicker">${ok?'GATE OPEN':'BLOCKED'}</div>
          <h1 style="color:${ok?'#8fe86a':'#ff6a6a'}">${ok?'門開了':'門紋風不動'}</h1>
          <div class="rank">你站在 x = ${v}　正解 x = ${C.ans}</div>
          <div class="desc">${C.why}${ok?'<br><br>門後透出溫暖的光 —— 是一間<b>密室</b>。':''}</div>
          <button class="go" id="ok">${ok?'走進密室':'離開'}</button>`,()=>{
            if(ok){ pr.alive=0; enterRest(); }
            else backToDungeon();
          }),10);
        return true;
      });
  };
  draw('');
}

/* ═══════════════ 班級週目標（合作向）═══════════════
   全班共同累積「線索碎片」，湊滿才開最終樓層。
   與 PvP 的競爭形成平衡 —— 落後的學生也有貢獻空間。 */
const QUEST_GOAL=60;
function questAdd(vol){
  if(!FB.ready||!FB.room)return;
  try{
    FB.db.ref('rooms/'+FB.room+'/quest/v'+vol).transaction(v=>(v||0)+1);
    FB.db.ref('rooms/'+FB.room+'/quest/by/'+FB.uid).transaction(v=>(v||0)+1);
  }catch(e){}
}
function questScreen(){
  if(!FB.ready||!FB.room){
    overlay(`<div class="kicker">CLASS QUEST</div><h1>班級週目標</h1>
      <div class="desc">這是<b>連線模式</b>的合作任務。<br>
        先到「🌐 連線多人」加入房間，全班就能一起累積線索碎片。</div>
      <button class="go" id="ok">了解</button>`,()=>introScreen());
    return;
  }
  FB.db.ref('rooms/'+FB.room+'/quest').once('value').then(sn=>{
    const q=sn.val()||{};
    let total=0; const byVol={};
    for(let v=1;v<=6;v++){ byVol[v]=q['v'+v]||0; total+=byVol[v]; }
    const by=q.by||{};
    const top=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const pct=Math.min(100,Math.round(total/QUEST_GOAL*100));
    overlay(`<div class="kicker">CLASS QUEST</div><h1>班級週目標</h1>
      <div class="rank">房間 ${FB.room}　${total} / ${QUEST_GOAL} 片線索</div>
      <div class="qbar"><i style="width:${pct}%"></i><b>${pct}%</b></div>
      <div class="desc" style="margin:10px 0 6px">
        每答對一題就掉一片<b>線索碎片</b>，全班共用進度。<br>
        湊滿 ${QUEST_GOAL} 片，<b>最終樓層</b>對所有人開啟。
        ${total>=QUEST_GOAL?'<br><b style="color:#8fe86a">✓ 已達成！最終樓層已開啟。</b>':''}</div>
      <div class="mathbox"><div class="mh">各冊碎片分布</div>
        ${[1,2,3,4,5,6].map(v=>`<div class="ml">第 ${v} 冊　
          <b>${byVol[v]}</b> 片　${'▮'.repeat(Math.min(20,byVol[v]))}</div>`).join('')}</div>
      ${top.length?`<div class="mathbox"><div class="mh">貢獻排行</div>
        ${top.map(([u,n],i)=>`<div class="ml">${i+1}. ${u===FB.uid?'<b>你</b>':u.slice(0,6)}　${n} 片</div>`).join('')}
        </div>`:''}
      <button class="go" id="ok">返回</button>`,()=>introScreen());
  }).catch(()=>{
    overlay(`<div class="kicker">ERROR</div><h1>讀取失敗</h1>
      <div class="desc">無法讀取班級進度，請確認連線。</div>
      <button class="go" id="ok">返回</button>`,()=>introScreen());
  });
}

/* ═══════════════ 錯題怪物 ═══════════════
   答錯的題目會化成怪物留在迷宮裡，之後再遇到牠。
   打敗牠＝答對，牠才會消失 —— 錯題不再是分數，而是一個具體的敵人。
   天然形成間隔複習：沒弄懂的題目會一直回來找你。 */

/* ═══════════════ 卡牌合成：運算即機制 ═══════════════
   兩張卡合成一張：費用相加、傷害相加後再放大。
   學生為了做出想要的卡，會反過來推算式 —— 逆向思考比正向計算更難。 */
function fuseResult(a,b){
  const ca=effCard(a), cb=effCard(b);
  const cost=Math.min(4,(ca.c||0)+(cb.c||0));
  const dmg=Math.round(((ca.dmg||0)+(cb.dmg||0))*1.05);   // 粗合：僅小幅加成
  const block=Math.round(((ca.block||0)+(cb.block||0))*1.2);
  const draw=(ca.draw||0)+(cb.draw||0);
  const wild=(ca.wild||cb.wild)?1:0;
  return {cost,dmg,block,draw,wild,
    name:'融合・'+ca.n.slice(0,2)+cb.n.slice(0,2)};
}
let fuseSel=[], forgeProp=null, fuseQuizPassed=false;
function fuseKnowledgeGate(){
  if(!classroomBankActive()||fuseQuizPassed)return false;
  const q=dungeonActionQuestion(null);
  setTimeout(()=>quizAsk(q,ok=>{
    fuseQuizPassed=ok;
    setTimeout(()=>fuseScreen(ok?'✓ 單元複習通過，現在可以完成合成。':'✗ 觀念尚未通過；材料沒有消耗，可以再挑戰。'),10);
  },dungeonActionLabel('合成知識檢核')),10);
  return true;
}
function forgeSpent(){
  overlay(`<div class="kicker">FORGE</div><h1 style="color:#6f6490">熔爐已熄</h1>
    <div class="desc">這座融合神殿的爐火已經用盡了。<br>
      每座神殿<b>只能合成一次</b> —— 到別處再找一座吧。</div>
    <button class="go" id="ok">離開</button>`,backToDungeon);
}
function fuseScreen(msg){
  // 只列出「可以當材料」的卡 —— 萬用卡與負費卡不能合成，
  // 列出來只會讓學生誤點，不如直接不顯示。
  const usableIdx=S.deck.map((o,i)=>({o,i})).filter(x=>canFuse(x.o,x.i));
  const hidden=S.deck.length-usableIdx.length;
  const rows=usableIdx.map(({o,i})=>{
    const b=CARDS[o.id], e=effCard(o);
    const on=fuseSel.includes(i);
    return `<div class="srow${on?' evo':''}" data-f="${i}">
      <span class="sc px">${cardCostText(e)}</span>
      <span class="sn">${b.n}${on?' <em>已選</em>':''}</span>
      <span class="sg">${e.dmg?'傷 '+e.dmg:''}${e.block?' 盾 '+e.block:''}</span></div>`;
  }).join('') || '<div class="pempty">牌組裡沒有可以合成的卡</div>';
  let preview='';
  if(fuseSel.length===2){
    const oa=S.deck[fuseSel[0]], ob=S.deck[fuseSel[1]];
    const rec=findRecipe(oa,ob);
    if(rec){                                   // 有配方 → 具名成果
      const c=CARDS[rec.r], R=RARITY[c.r||'C'];
      preview=`<div class="mathbox" style="border-color:${R.col}">
        <div class="mh" style="color:${R.col}">★ 找到配方！第 ${rec.tier} 層</div>
        <div class="seq" style="color:${R.col}">${c.n}</div>
        <div class="ml">${c.t.replace(/<\/?[a-z]+>/g,'　')}</div>
        <div class="ml" style="color:#8fd0ff">${rec.why}</div></div>`;
      const rows2=S.deck.map((o,i)=>{
        const b2=CARDS[o.id], e2=effCard(o), on=fuseSel.includes(i);
        return `<div class="srow${on?' evo':''}" data-f="${i}">
          <span class="sc px">${cardCostText(e2)}</span>
          <span class="sn">${b2.n}${on?' <em>已選</em>':''}</span>
          <span class="sg">${e2.dmg?'傷 '+e2.dmg:''}${e2.block?' 盾 '+e2.block:''}</span></div>`;
      }).join('');
      overlay(`<div class="kicker">FUSION</div><h1>卡牌合成</h1>
        <div class="rank">選兩張卡 · 有配方就合出具名卡</div>
        ${msg?`<div class="shmsg">${msg}</div>`:''}
        ${preview}
        <div id="sockList">${rows2}</div>
        <button class="go" id="fuseGo">確認合成</button>
        <button class="go" id="treeOpen" style="background:linear-gradient(180deg,#8fd0ff,#3f7fd0);border-color:#1a3a6a;color:#0a1030">🌳 合成樹</button>
        <button class="go" id="fuseBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">離開</button>`,
        null,fuseHandler);
      return;
    }
    const r=fuseResult(oa,ob);
    const a=effCard(oa), b=effCard(ob);
    preview=`<div class="mathbox"><div class="mh">粗合（無配方）— 成果較弱</div>
      <div class="ml">費用　${a.c} + ${b.c} = <b>${(a.c||0)+(b.c||0)}</b>${
        (a.c||0)+(b.c||0)>4?'　→ 上限 <b>4</b>':''}</div>
      <div class="ml">傷害　(${a.dmg||0} + ${b.dmg||0}) × 1.35 = <b>${r.dmg}</b></div>
      ${r.block?`<div class="ml">護盾　(${a.block||0} + ${b.block||0}) × 1.2 = <b>${r.block}</b></div>`:''}
      ${r.draw?`<div class="ml">抽牌　${a.draw||0} + ${b.draw||0} = <b>${r.draw}</b></div>`:''}
      <div class="seq">${r.name}　${r.wild?'✦ '+r.cost+' 費':r.cost+' 費'}</div></div>`;
  }
  overlay(`<div class="kicker">FUSION</div><h1>卡牌合成</h1>
    <div class="rank">🔥 融合神殿 · 只能使用一次</div>
    <div class="desc" style="margin-bottom:4px;color:#ff9a5a">
      這座神殿<b>只能合成一次</b>，選定就無法反悔。</div>
    ${msg?`<div class="shmsg">${msg}</div>`:''}
    ${hidden?`<div class="desc" style="font-size:10px;color:#6f6490">
      （已隱藏 ${hidden} 張不能當材料的卡：合成／裝備卡、萬用／負費卡，或各費用的最後一張）</div>`:''}
    <div class="desc" style="margin-bottom:6px">
      合成會<b>消耗兩張原卡</b>。費用相加後上限 4 —— 
      所以「兩張低費」比「一高一低」更划算，這就是取捨。</div>
    ${preview}
    <div id="sockList">${rows}</div>
    ${fuseSel.length===2?'<button class="go" id="fuseGo">確認合成</button>':''}
    <button class="go" id="fuseBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">離開</button>`,
    null,el=>{
      if(el.id==='fuseBack'){ fuseSel=[];fuseQuizPassed=false;backToDungeon(); return true; }
      if(el.id==='treeOpen'){ setTimeout(treeScreen,10); return true; }
      if(el.id==='fuseGo'){
        if(fuseKnowledgeGate())return true;
        const oa=S.deck[fuseSel[0]], ob=S.deck[fuseSel[1]];
        const rec=findRecipe(oa,ob);
        const [i,j]=fuseSel.slice().sort((a,b)=>b-a);
        if(rec){                                  // 依配方產生具名卡
          const missing=fusionMissingCosts(i,j,rec.r);
          if(missing.length){fuseSel=[];setTimeout(()=>fuseScreen('不能合成：牌組必須保留 '+missing.join('、')+' 費卡各至少一張。'),10);return true;}
          const rm=[i,j].filter(n=>n>=0&&n<S.deck.length).sort((a,b)=>b-a);
      if(rm.length===2&&rm[0]!==rm[1]){ S.deck.splice(rm[0],1); S.deck.splice(rm[1],1); }
          S.deck.push({id:rec.r,gem:null}); markCard(rec.r); markCard(rec.r);
          S.found=S.found||[];
          const isNew=!S.found.includes(rec.r);
          if(isNew) S.found.push(rec.r);
          fuseSel=[]; if(forgeProp){forgeProp.used=1;forgeProp.alive=0;} saveChar();
          const c=CARDS[rec.r], R=RARITY[c.r||'C'];
          overlay(`<div class="kicker">${isNew?'NEW RECIPE':'FUSED'}</div>
            <h1 style="color:${R.col}">${isNew?'發現新配方！':'合成成功'}</h1>
            <div class="rank" style="color:${R.col};border-color:${R.col}">
              第 ${rec.tier} 層 · ${c.n}</div>
            <div class="desc">${c.t.replace(/<\/?[a-z]+>/g,'　')}<br><br>
              <b>${rec.why}</b><br><br>
              這張卡已完成融合，<b>不能再次投入合成</b>。</div>
            <button class="go" id="ok">收下</button>`,backToDungeon);
          return true;
        }
        const r=fuseResult(oa,ob);
        const missing=fusionMissingCosts(i,j,r);
        if(missing.length){fuseSel=[];setTimeout(()=>fuseScreen('不能合成：牌組必須保留 '+missing.join('、')+' 費卡各至少一張。'),10);return true;}
        const id='fuse'+Date.now().toString(36);
        CARDS[id]={n:r.name,c:r.cost,dmg:r.dmg||0,block:r.block||0,draw:r.draw||0,
          wild:r.wild,r:'E',FUSE:1,
          t:`${r.dmg?'<b>'+r.dmg+'</b> 傷害':''}${r.block?'　護盾 <b>'+r.block+'</b>':''}${
             r.draw?'　抽 '+r.draw:''}<br><em>合成卡</em>`};
        const rm=[i,j].filter(n=>n>=0&&n<S.deck.length).sort((a,b)=>b-a);
      if(rm.length===2&&rm[0]!==rm[1]){ S.deck.splice(rm[0],1); S.deck.splice(rm[1],1); }
        S.deck.push({id,gem:null});
        fuseSel=[];
        if(forgeProp){forgeProp.used=1;forgeProp.alive=0;}
        saveChar();
        overlay(`<div class="kicker">FUSED</div><h1>合成成功</h1>
          <div class="rank" style="color:#e26bd6;border-color:#e26bd6">${r.name}</div>
          <div class="desc">${CARDS[id].t.replace(/<\/?[a-z]+>/g,'')}<br>已加入牌組。</div>
          <button class="go" id="ok">收下</button>`,backToDungeon);
        return true;
      }
      const row=el.closest('.srow'); if(!row)return false;
      const i=+row.dataset.f;
      if(!canFuse(S.deck[i],i)){
        setTimeout(()=>fuseScreen('這張卡受到保護：合成卡不能再合成，裝備卡也不能融合；0～4 費仍須各保留至少一張。'),10);
        return true;
      }
      fuseQuizPassed=false;
      if(fuseSel.includes(i)) fuseSel=fuseSel.filter(x=>x!==i);
      else if(fuseSel.length<2) fuseSel.push(i);
      else { setTimeout(()=>fuseScreen('已經選了兩張，先取消一張。'),10); return true; }
      setTimeout(()=>fuseScreen(),10);
      return true;
    });
}
/* 配方分支共用的點擊處理 */
function fuseHandler(el){
  if(el.id==='fuseBack'){ fuseSel=[];fuseQuizPassed=false;backToDungeon(); return true; }
  if(el.id==='treeOpen'){ setTimeout(treeScreen,10); return true; }
  if(el.id==='fuseGo'){
    if(fuseKnowledgeGate())return true;
    const oa=S.deck[fuseSel[0]], ob=S.deck[fuseSel[1]];
    const rec=findRecipe(oa,ob);
    const [i,j]=fuseSel.slice().sort((a,b)=>b-a);
    if(!rec) return false;
    const missing=fusionMissingCosts(i,j,rec.r);
    if(missing.length){fuseSel=[];setTimeout(()=>fuseScreen('不能合成：牌組必須保留 '+missing.join('、')+' 費卡各至少一張。'),10);return true;}
    const rm=[i,j].filter(n=>n>=0&&n<S.deck.length).sort((a,b)=>b-a);
      if(rm.length===2&&rm[0]!==rm[1]){ S.deck.splice(rm[0],1); S.deck.splice(rm[1],1); }
    S.deck.push({id:rec.r,gem:null}); markCard(rec.r);
    S.found=S.found||[];
    const isNew=!S.found.includes(rec.r);
    if(isNew) S.found.push(rec.r);
    fuseSel=[]; if(forgeProp){forgeProp.used=1;forgeProp.alive=0;} saveChar();
    const c=CARDS[rec.r], R=RARITY[c.r||'C'];
    overlay(`<div class="kicker">${isNew?'NEW RECIPE':'FUSED'}</div>
      <h1 style="color:${R.col}">${isNew?'發現新配方！':'合成成功'}</h1>
      <div class="rank" style="color:${R.col};border-color:${R.col}">第 ${rec.tier} 層 · ${c.n}</div>
      <div class="desc">${c.t.replace(/<\/?[a-z]+>/g,'　')}<br><br><b>${rec.why}</b><br><br>
        這張卡已完成融合，<b>不能再次投入合成</b>。</div>
      <button class="go" id="ok">收下</button>`,backToDungeon);
    return true;
  }
  const row=el.closest('.srow'); if(!row)return false;
  const i=+row.dataset.f;
  if(!canFuse(S.deck[i],i)){
    setTimeout(()=>fuseScreen('這張卡受到保護：合成卡不能再合成，裝備卡也不能融合；0～4 費仍須各保留至少一張。'),10); return true;
  }
  fuseQuizPassed=false;
  if(fuseSel.includes(i)) fuseSel=fuseSel.filter(x=>x!==i);
  else if(fuseSel.length<2) fuseSel.push(i);
  else { setTimeout(()=>fuseScreen('已經選了兩張，先取消一張。'),10); return true; }
  setTimeout(()=>fuseScreen(),10);
  return true;
}

/* ═══════════════ 敵人血量以算式呈現 ═══════════════
   不直接給數字，逼玩家每場都做心算 —— 但不彈窗、不打斷節奏。
   依樓層加深：低層是加減乘，高層出現平方、次方、根號。 */
function hpExpr(n,floorIdx){
  const forms=[];
  // 加法拆解
  const a=Math.floor(n/2)+rand(Math.max(1,Math.floor(n/4)));
  if(a>0&&n-a>0) forms.push(`${a} + ${n-a}`);
  // 乘法拆解
  for(let d=2;d<=Math.min(12,n);d++) if(n%d===0&&n/d>1){ forms.push(`${d} × ${n/d}`); break; }
  // 減法
  forms.push(`${n+rand(20)+5} − ${rand(20)+5}`.replace(/(\d+) − (\d+)/,(m,x,y)=>`${n+ +y} − ${y}`));
  if(floorIdx>=1){
    // 平方和（畢氏風味）
    for(let x=2;x*x<n;x++){ const r=n-x*x; const y=Math.round(Math.sqrt(r));
      if(y*y===r&&y>1){ forms.push(`${x}² + ${y}²`); break; } }
    const sq=Math.round(Math.sqrt(n));
    if(sq*sq===n) forms.push(`${sq}²`);
    // 次方
    if(n===2**Math.round(Math.log2(n))) forms.push(`2^${Math.round(Math.log2(n))}`);
  }
  return forms[rand(forms.length)];
}

/* ═══════════════ 數學地面陷阱 ═══════════════
   踩到就要立刻判斷，答錯扣血或中詛咒，答對有獎勵。
   陷阱本身就是題目：不用彈出「考試」，而是「這格能不能踩」。 */
const TRAPS={
 prime:{n:'質數結界',ic:'✦',col:'#8fd0ff',
   make:()=>{const v=[[7,1],[9,0],[11,1],[15,0],[13,1],[21,0],[17,1],[25,0]][rand(8)];
     return {q:`結界寫著 <b>${v[0]}</b>。這是質數嗎？`,ok:v[1]===1,
       yes:'是質數',no:'不是質數',
       sol:v[1]?`${v[0]} 只有 1 和自己兩個因數，是質數。`
                :`${v[0]} 還有其他因數，不是質數。`};}},
 sign:{n:'正負沼澤',ic:'±',col:'#e26bd6',
   make:()=>{const a=-(1+rand(9)), b=-(1+rand(9));
     const r=a-b;
     return {q:`沼澤浮現算式：<b>(${a}) − (${b})</b> 的結果是正數嗎？`,ok:r>0,
       yes:'是正數',no:'不是正數',
       sol:`(${a}) − (${b}) = ${a} + ${-b} = ${r}。減負變加正。`};}},
 mult:{n:'倍數陷阱',ic:'×',col:'#ffb347',
   make:()=>{const d=[3,4,6,7][rand(4)]; const base=d*(2+rand(15));
     const n=Math.random()<0.5?base:base+1+rand(d-1);
     return {q:`地磚刻著 <b>${n}</b>。它是 <b>${d}</b> 的倍數嗎？`,ok:n%d===0,
       yes:'是倍數',no:'不是倍數',
       sol:`${n} ÷ ${d} = ${(n/d).toFixed(2)}　${n%d===0?'整除，是倍數。':'除不盡，不是倍數。'}`};}},
 frac:{n:'分數裂縫',ic:'⅔',col:'#8fe86a',
   make:()=>{const neg=rand(2)===1;
     const s1=neg?-1:1, s2=neg?-1:1;
     const a=s1*(1+rand(5)),b=Math.abs(a)+1+rand(5),c=s2*(1+rand(5)),d=Math.abs(c)+1+rand(5);
     const L=a/b, R=c/d;
     return {q:`裂縫兩側：<b>${a<0?'−':''}${Math.abs(a)}/${b}</b> 比
         <b>${c<0?'−':''}${Math.abs(c)}/${d}</b> 大嗎？`,ok:L>R,
       yes:'左邊比較大',no:'左邊沒有比較大',
       sol:`${a<0?'−':''}${Math.abs(a)}/${b} = ${L.toFixed(3)}，${c<0?'−':''}${Math.abs(c)}/${d} = ${R.toFixed(3)}。
         ${neg?'<b>負數越靠近 0 越大</b>。':''}`};}},
};
let traps={};
let trapRecent=[];

/* 自由探索時混用同冊課程題與原陷阱題；教師指定題庫時只用指定範圍。
   最多重抽 8 次，避免學生連續看到相同題幹。 */

/* ═══════════════ 幾何圖形（SVG）═══════════════
   幾何題不該只有文字 —— 圖形本身就是題目的一部分。 */
const FIGC={line:'#e2e8ff',fill:'rgba(143,208,255,.18)',mark:'#ffe38a',
  ang:'#ff9a5a',txt:'#f3ecff',dim:'#8fd0ff'};

/* ═══════════════ 題目難度分層 ═══════════════
   原本同一冊內所有題目難度相同 —— 剛學的和已經熟練的看到一樣的題目。
   現在每題有三個層級，並依「該主題的精熟度」自動選層：
     L1 基礎：小數字、單步、可心算
     L2 標準：一般數字、兩步
     L3 挑戰：大數字、多步、含負數或需要逆推
   規則：精熟度低 → 給基礎題建立信心；精熟度高 → 給挑戰題避免無聊。 */
let forceTier=0;                 // 0=自動，1~3=鎖定層級

/* 依層級取數字範圍：層級越高，數字越大、也越可能出現負數 */

const TIER_NAME={1:'基礎',2:'標準',3:'挑戰'};

/* ═══════════════ 精熟度追蹤 ═══════════════
   逐主題記錄作答狀況。精熟度會隨時間衰退 —— 久沒碰的主題會提醒複習，
   這是「間隔複習」的核心：學過不等於記得。 */

/* 精熟度 0~5 顆星：正確率為主、連續答對加分、久沒練會退步 */

const allTopics=()=>Object.keys((S.meta&&S.meta.topics)||{});

/* ═══════════════ 課後複習 ═══════════════
   純練習模式：沒有戰鬥、沒有時間壓力、答完立刻看解析。
   知識點給得比地城少 —— 複習是為了弄懂，不是刷分。 */
let reviewSes=null;

/* 依主題名稱找對應的生成器出題 */

/* 複習流程 */

/* 學習日誌：逐主題精熟度 */

/* 班級角色帶入、指定題庫、成果回傳與健康休息鎖已移至 math-dungeon-classroom.js。 */
/* ═══════════════ 學習圖鑑 ═══════════════
   NPC 教過的內容永久記錄在圖鑑裡，輪迴後不必再聽一次課，
   但隨時可以回來複習 —— 知識是累積的，不會因為重開一輪就消失。 */
function codexMark(key,adv){
  S.meta=S.meta||{souls:0,runs:0,totalQ:0,totalOk:0,perks:{}};
  S.meta.codex=S.meta.codex||{};
  const e=S.meta.codex[key]=S.meta.codex[key]||{};
  if(adv) e.adv=true; else e.basic=true;
  e.run=S.meta.runs||0;
  saveChar();
}
const codexHas=(key,adv)=>{
  const c=S.meta&&S.meta.codex&&S.meta.codex[key];
  return !!(c&&(adv?c.adv:c.basic));
};
/* 卡牌圖鑑：曾經取得過的卡 */
function seenCard(id){
  S.meta=S.meta||{};
  S.meta.seenCards=S.meta.seenCards||[];
  return S.meta.seenCards.includes(id);
}
function markCard(id){
  S.meta=S.meta||{};
  S.meta.seenCards=S.meta.seenCards||[];
  if(!S.meta.seenCards.includes(id)) S.meta.seenCards.push(id);
  // 傳說卡登記為「輪迴傳承」—— 下一輪會自動回到牌組
  if(CARDS[id]&&CARDS[id].r==='L'){
    S.meta.legendary=S.meta.legendary||[];
    if(!S.meta.legendary.includes(id)) S.meta.legendary.push(id);
  }
  saveChar();
}
/* 合成出來的傳說卡也要傳承 */
function markLegendary(id){
  if(!CARDS[id]||CARDS[id].r!=='L')return;
  S.meta=S.meta||{};
  S.meta.legendary=S.meta.legendary||[];
  if(!S.meta.legendary.includes(id)){ S.meta.legendary.push(id); saveChar(); }
}
function codexScreen(tab){
  tab=tab||'npc';
  const M=S.meta||{};
  let body='';
  if(tab==='npc'){
    body=Object.keys(NPCS).filter(k=>!NPCS[k].coursePortal).map(k=>{
      const N=NPCS[k], hasB=codexHas(k,false), hasA=codexHas(k,true);
      const adv=NPC_ADV[k];
      return `<div class="cxrow${hasB?'':' locked'}" data-npc="${k}">
        <div class="cxi" style="background:${N.col}22;color:${hasB?N.col:'#5a527a'}">
          ${hasB?'📖':'🔒'}</div>
        <div class="cxinfo">
          <div class="cxn" style="color:${hasB?N.col:'#6f6490'}">${N.name}</div>
          <div class="cxt">${hasB?N.topic:'尚未學習'}</div>
          ${adv?`<div class="cxt2">${hasA?'✓ 進階：'+adv.topic:'進階課程未學'}</div>`:''}
        </div></div>`;
    }).join('');
  }else{
    const seen=(M.seenCards||[]);
    const all=Object.keys(CARDS).filter(id=>!CARDS[id].CURSE&&!CARDS[id].TEMP);
    const lg=((M.legendary)||[]).filter(id=>CARDS[id]);
    const pk=((M.legacyPick)||[]).filter(id=>lg.includes(id));
    body=`<div class="cxsum">已收集 <b>${seen.filter(id=>CARDS[id]).length}</b> / ${all.length} 張</div>
      <div class="cxlegacy">🌟 擁有 ${lg.length} 張傳說卡　可攜 ${legacyCap()} 張<br>
        <span>${lg.length?lg.map(id=>(pk.includes(id)?'★':'')+CARDS[id].n).join('、'):'尚未取得傳說卡'}</span><br>
        <span style="font-size:10px;color:#a99ec9">★ = 下一輪會攜帶</span></div>`+
      all.map(id=>{
        const c=CARDS[id], got=seen.includes(id), R=RARITY[c.r||'C'];
        return `<div class="cxcard${got?'':' locked'}" style="border-color:${got?R.col:'#3a2c60'}">
          <span class="cxc">${got?cardCostText(c):'?'}</span>
          <span class="cxname" style="color:${got?R.col:'#5a527a'}">${got?c.n:'？？？'}</span>
        </div>`;
      }).join('');
  }
  overlay(`<div class="kicker">CODEX</div><h1>學習圖鑑</h1>
    <div class="cxtabs">
      <span class="cxtab${tab==='npc'?' on':''}" data-tab="npc">📖 課程</span>
      <span class="cxtab${tab==='card'?' on':''}" data-tab="card">🃏 卡牌</span>
    </div>
    <div class="desc" style="font-size:11px;margin:8px 0 4px">
      ${tab==='npc'?'學過的課程永久保留，輪迴後不必重聽。點課程可以複習。'
                   :'曾經取得過的卡牌都會登記在這裡。'}</div>
    <div id="cxlist">${body}</div>
    <button class="go" id="ok">返回</button>`,introScreen,el=>{
      const t=el.closest('.cxtab');
      if(t){ setTimeout(()=>codexScreen(t.dataset.tab),10); return true; }
      const r=el.closest('.cxrow');
      if(r&&codexHas(r.dataset.npc,false)){
        setTimeout(()=>reviewLesson(r.dataset.npc,false),10); return true;
      }
      return false;
    });
}
/* 複習：一次把整堂課攤開，不用逐步點 */
function reviewLesson(key,adv){
  const base=NPCS[key];
  const N=adv?{...base,...NPC_ADV[key]}:base;
  const hasAdv=NPC_ADV[key]&&codexHas(key,true);
  // 複習時依序由上到下閱讀比較自然，維持正序
  const steps=N.steps.map((st,i)=>
    `<div class="dstep now"><span class="dn">${i+1}</span>
      <div class="dtx">${st.t}${st.f?`<div class="dformula">${st.f}</div>`:''}</div></div>`).join('');
  overlay(`<div class="npcbox">
      <div class="nhead"><canvas class="nport" id="nport"></canvas>
        <div><div class="nname" style="color:${base.col}">${base.name}
          ${adv?'<span class="advtag">進階</span>':''}</div>
        <div class="ntopic">${N.topic}</div></div></div>
      <div class="dsteps">${steps}</div>
    </div>
    ${hasAdv&&!adv?'<button class="go" id="rvAdv">看進階課程</button>':''}
    ${adv?'<button class="go" id="rvBase">看基礎課程</button>':''}
    <button class="go" id="rvBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回圖鑑</button>`,
    null,el=>{
      if(el.id==='rvAdv'){ setTimeout(()=>reviewLesson(key,true),10); return true; }
      if(el.id==='rvBase'){ setTimeout(()=>reviewLesson(key,false),10); return true; }
      if(el.id==='rvBack'){ setTimeout(()=>codexScreen('npc'),10); return true; }
      return false;
    });
  const cv=$('nport');
  if(cv){ cv.width=cv.height=32; cv.getContext('2d').drawImage(npcArt(base.art),0,0); }
}

/* ═══════════════ 重複卡牌自動分解 ═══════════════
   牌組裡已經有的卡再拿到就會當場分解，換成資源。
   若這張卡在更早的輪迴就取得過，會特別標示出來。 */
function dissolveFx(cardName){
  const field=$('field')||$('dungeon');
  if(!field)return;
  const w=document.createElement('div');
  w.className='dissolve';
  w.innerHTML=`<div class="dcard">${cardName}</div>`+
    Array.from({length:16},(_,i)=>{
      const a=(i/16)*Math.PI*2, r=50+Math.random()*70;
      return `<i style="--dx:${Math.cos(a)*r}px;--dy:${Math.sin(a)*r}px;
        animation-delay:${i*22}ms"></i>`;
    }).join('');
  document.body.appendChild(w);
  setTimeout(()=>w.remove(),1400);
}
/* 統一的取得卡牌入口：重複就分解 */
/* 直接加入牌組（玩家已經做過選擇的情境：升級選卡、商店購買、劇情獎勵）*/
function gainCard(id,silent){
  if(!CARDS[id]) return false;
  // 最後一道防線：任何路徑都不得讓萬用卡超過上限
  if(CARDS[id].wild && wildFull()){
    if(!silent) toast('萬用卡已達上限 '+WILD_CAP+' 張 — 自動分解',2000);
    dissolveCard(id);
    return false;
  }
  S.deck.push({id,gem:null});
  const isLegend=CARDS[id].r==='L';
  markCard(id);
  saveChar();
  if(isLegend&&!silent) toast('🌟 傳說卡 — 將永久傳承到下一輪迴',2400);
  return true;
}
/* 分解成資源：知識點與金幣，稀有度越高給越多 */
function dissolveCard(id){
  const c=CARDS[id];
  const tierBonus={C:0,R:2,E:5,L:10}[c.r||'C']||0;
  const gold=25+rand(20)+tierBonus*5;
  const souls=3+tierBonus;
  S.gold+=gold;
  S.meta=S.meta||{souls:0};
  S.meta.souls=(S.meta.souls||0)+souls;
  dissolveFx(c.n);
  saveChar();
  return {gold,souls};
}
/* ═══ 取得卡牌：讓玩家決定放不放進牌組 ═══
   例外：已經擁有的【傳說卡】直接分解 —— 傳說會跨輪迴傳承，
   重複的一張沒有意義，不必浪費玩家一次選擇。 */
function offerCard(id,after){
  const done=after||backToDungeon;
  if(!CARDS[id]){ done(); return; }
  const c=effCard({id,gem:null}), R=RARITY[c.r||'C'];
  const owned=((S.meta&&S.meta.legendary)||[]).includes(id);
  if(c.r==='L'&&owned){                    // 重複的傳說卡 → 直接分解
    const r=dissolveCard(id);
    overlay(`<div class="kicker">DISSOLVED</div>
      <h1 style="color:#ffb347">${CARDS[id].n} 消散了</h1>
      <div class="rank">◉ +${r.gold}　✦ +${r.souls} 知識點</div>
      <div class="desc">這張<b>傳說卡你已經擁有</b>，而傳說會跨輪迴傳承 ——
        重複的一張化為知識與金幣回到你身上。</div>
      <button class="go" id="ok">收下</button>`,done);
    return;
  }
  const dup=S.deck.some(o=>o.id===id);
  const est={C:0,R:2,E:5,L:10}[c.r||'C']||0;
  // 通用卡已達上限 → 只能分解，不提供「加入牌組」
  const wildBlocked = c.wild && wildFull();
  if(wildBlocked){
    overlay(`<div class="kicker">WILD LIMIT</div>
      <h1 style="color:${R.col}">${CARDS[id].n}</h1>
      <div class="rank" style="color:${R.col};border-color:${R.col}">✦ 通用卡　已達攜帶上限</div>
      <div class="desc">牌組裡已經有 <b>${WILD_CAP}</b> 張通用卡（上限）。<br>
        通用卡能無視費用需求、維持連擊 —— 帶太多會讓「接續費用」失去意義，
        所以每副牌最多帶 ${WILD_CAP} 張。</div>
      <div class="mathbox"><div class="mh">目前攜帶的萬用卡</div>
        ${S.deck.filter(o=>isWild(o.id)).map(o=>
          `<div class="ml">✦ ${CARDS[o.id].n}</div>`).join('')}
        <div class="ml" style="color:#a99ec9;margin-top:4px">
          想換的話，可以先到「牌組」把舊的萬用卡分解掉。</div>
      </div>
      <button class="go" id="ocDrop2">分解（◉ ${25+est*5}　✦ ${3+est}）</button>`,
      null,el=>{
        if(el.id!=='ocDrop2') return false;
        const r=dissolveCard(id);
        setTimeout(()=>overlay(`<div class="kicker">DISSOLVED</div>
          <h1 style="color:#a99ec9">${CARDS[id].n} 分解了</h1>
          <div class="rank">◉ +${r.gold}　✦ +${r.souls} 知識點</div>
          <button class="go" id="ok">收下</button>`,done),10);
        return true;
      });
    return;
  }
  overlay(`<div class="kicker">NEW CARD</div>
    <h1 style="color:${R.col}">${CARDS[id].n}</h1>
    <div class="rank" style="color:${R.col};border-color:${R.col}">
      ${(typeof RARITY_TAG!=='undefined'&&RARITY_TAG[c.r||'C'])||R.n}　${
      c.wild?'✦ 通用・'+c.c+' 費':(c.c<0?'回收 '+Math.abs(c.c):c.c+' 費')}${
      typeof cardPower==='function'?'　威力 '+cardPower({id,gem:null}):''}</div>
    <div class="desc" style="margin-bottom:6px">${c.t}</div>
    ${dup?`<div class="shmsg" style="color:#ff9a5a">⚠ 牌組裡已經有一張同名卡</div>`:''}
    <div class="mathbox"><div class="mh">要放進牌組嗎？</div>
      <div class="ml">加入後牌組會變成 <b>${S.deck.length+1}</b> 張。</div>
      <div class="ml">牌組越精簡，抽到關鍵牌的機率越高 —— 這也是機率。</div>
    </div>
    <button class="go" id="ocKeep">加入牌組</button>
    <button class="go" id="ocDrop" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">
      分解（約 ◉ ${25+est*5}　✦ ${3+est}）</button>`,
    null,el=>{
      if(el.id==='ocKeep'){
        gainCard(id,true);
        const isL=c.r==='L';
        setTimeout(()=>overlay(`<div class="kicker">ADDED</div>
          <h1 style="color:${R.col}">已加入牌組</h1>
          <div class="rank">${CARDS[id].n}　牌組 ${S.deck.length} 張</div>
          ${isL?'<div class="desc">🌟 傳說卡 — 會永久傳承到下一輪迴。</div>':''}
          <button class="go" id="ok">繼續</button>`,done),10);
        return true;
      }
      if(el.id!=='ocDrop') return false;
      const r=dissolveCard(id);
      setTimeout(()=>overlay(`<div class="kicker">DISSOLVED</div>
        <h1 style="color:#a99ec9">${CARDS[id].n} 分解了</h1>
        <div class="rank">◉ +${r.gold}　✦ +${r.souls} 知識點</div>
        <div class="desc">知識點可以在<b>輪迴殿堂</b>換永久強化。<br>
          保持牌組精簡也是一種策略。</div>
        <button class="go" id="ok">收下</button>`,done),10);
      return true;
    });
}

/* ═══════════════ 輪迴系統 ═══════════════
   每一輪結束（通關或倒下）都會把「學習成果」換成【知識點】，
   用來購買永久強化 —— 下一輪帶著走。
   設計原則：知識點主要來自【答對題目】，而不是打怪，
   所以想變強就得真的把題目弄懂，重複練習才有意義。 */
const META_DEF={
  vit:{n:'體魄',d:'每輪起始生命 +6',cost:14,mul:1.4,max:8,f:m=>m*6},
  purse:{n:'護身行囊',d:'每輪起始護甲 +4',cost:12,mul:1.4,max:6,f:m=>m*4},
  flask:{n:'藥囊',d:'每輪起始藥水 +1',cost:30,mul:1.7,max:2,f:m=>m},
  wild:{n:'通用之識',d:'通用卡回復魔力 +1',cost:45,mul:2,max:1,f:m=>m},
  legacy:{n:'傳承之器',d:'可攜帶的傳說卡 +1',cost:60,mul:2,max:2,f:m=>m},
  sharp:{n:'銳識',d:'全部傷害 +4%',cost:24,mul:1.55,max:5,f:m=>m*0.04},
  echo:{n:'回響',d:'錯題幽靈驅散獎勵加倍',cost:40,mul:2,max:1,f:m=>m},
};
/* 舊存檔若曾買超過新上限，讀取時只套用目前允許的級數。 */
const metaLv=k=>META_DEF[k]?Math.min(META_DEF[k].max,((S.meta&&S.meta.perks&&S.meta.perks[k])||0)):0;
const metaCost=k=>Math.round(META_DEF[k].cost*Math.pow(META_DEF[k].mul,metaLv(k)));
function metaVal(k){ const lv=metaLv(k); return lv?META_DEF[k].f(lv):0; }
/* 每個區域各自累積輪迴深度：初次只開放 1F，完成一輪才開放下一層。
   不使用全域 runs 判斷，避免通過第一冊後直接跳過後續區域的成長歷程。 */
function rebirthDepth(zi=S.zone||0){
  S.meta=S.meta||{souls:0,runs:0,totalQ:0,totalOk:0,perks:{}};
  S.meta.zoneDepth=S.meta.zoneDepth||{};
  const z=ZONES[Math.max(0,Math.min(ZONES.length-1,zi|0))];
  /* 舊存檔遷移：已通關區域保留全層，已有檢查點則保留原本進度。 */
  if(S.meta.zoneDepth[z.k]===undefined){
    const prior=(S.cleared!==undefined&&S.cleared>=zi)?z.floors:Number((S.zoneProgress||{})[z.k])||0;
    S.meta.zoneDepth[z.k]=Math.max(0,Math.min(z.floors,prior));
  }
  return Math.max(0,Math.min(z.floors,Number(S.meta.zoneDepth[z.k])||0));
}
function rebirthFloorLimit(zi=S.zone||0){
  const z=ZONES[Math.max(0,Math.min(ZONES.length-1,zi|0))];
  return Math.min(z.floors,rebirthDepth(zi)+1); // 1-based：本輪可到達的最深樓層
}
function markRebirthFloor(floorCount,zi=S.zone||0){
  S.meta=S.meta||{souls:0,runs:0,totalQ:0,totalOk:0,perks:{}};
  S.meta.zoneDepth=S.meta.zoneDepth||{};
  const z=ZONES[Math.max(0,Math.min(ZONES.length-1,zi|0))];
  S.meta.zoneDepth[z.k]=Math.max(rebirthDepth(zi),Math.min(z.floors,Number(floorCount)||0));
  return S.meta.zoneDepth[z.k];
}

/* 一輪結束 → 結算知識點 */
function endRun(win){
  S.meta=S.meta||{souls:0,runs:0,totalQ:0,totalOk:0,perks:{}};
  const ok=quizStats.ok, tot=quizStats.total;
  const zi=S.zone||0;
  const chain=Math.max(0,...(S.allChains||[0]));
  // 主要來源：答對題目
  const fromQuiz=Math.max(0,Math.round(Number(quizStats.points)||0));
  const fromZone=(zi+1)*(win?15:6);
  const fromChain=Math.floor(chain/2);
  const gain=fromQuiz+fromZone+fromChain;
  S.meta.souls+=gain;
  S.meta.runs++;
  S.meta.totalQ+=tot;
  S.meta.totalOk+=ok;
  saveChar();
  return {gain,fromQuiz,fromZone,fromChain,ok,tot};
}
const legacyCap=()=>2+metaVal('legacy');
/* 傳承選擇：決定哪些傳說卡帶進下一輪 */
function legacyScreen(msg){
  const owned=((S.meta&&S.meta.legendary)||[]).filter(id=>CARDS[id]);
  const cap=legacyCap();
  S.meta.legacyPick=(S.meta.legacyPick||[]).filter(id=>owned.includes(id));
  const pick=S.meta.legacyPick;
  const rows=owned.length?owned.map(id=>{
    const c=CARDS[id], on=pick.includes(id);
    return `<div class="srow${on?' evo':''}" data-lg="${id}">
      <span class="sc px">${cardCostText(c)}</span>
      <span class="sn">${c.n}${on?' <em>攜帶中</em>':''}</span>
      <span class="sg">${c.dmg?'傷 '+c.dmg:''}${c.draw?'　抽 '+c.draw:''}</span></div>`;
  }).join('') : '<div class="pempty">還沒有取得任何傳說卡</div>';
  overlay(`<div class="kicker">LEGACY</div><h1>🌟 輪迴傳承</h1>
    <div class="rank">已選 ${pick.length} / ${cap} 張</div>
    ${msg?`<div class="shmsg">${msg}</div>`:''}
    <div class="desc" style="margin-bottom:6px">
      只有<b>傳說卡</b>能跨輪迴保留，其餘牌組每輪歸零。<br>
      但<b>不是帶越多越好</b> —— 高費傳說卡會稀釋你的費用曲線、讓 0→1→2 接不上。
      模擬顯示自選 <b>3~4 張低費</b>傳說卡表現最好。<br>
      可攜上限可在輪迴殿堂用「傳承之器」提升。</div>
    <div id="sockList">${rows}</div>
    <button class="go" id="lgBack">返回</button>`,
    null,el=>{
      if(el.id==='lgBack'){ setTimeout(()=>metaScreen(),10); return true; }
      const row=el.closest('.srow'); if(!row||!row.dataset.lg) return false;
      const id=row.dataset.lg;
      const i=pick.indexOf(id);
      if(i>=0) pick.splice(i,1);
      else if(pick.length<cap) pick.push(id);
      else { setTimeout(()=>legacyScreen('已達可攜上限 '+cap+' 張，先取消一張。'),10); return true; }
      saveChar();
      setTimeout(()=>legacyScreen(),10);
      return true;
    });
}
function metaScreen(msg){
  S.meta=S.meta||{souls:0,runs:0,totalQ:0,totalOk:0,perks:{}};
  const M=S.meta;
  const rows=Object.keys(META_DEF).map(k=>{
    const D=META_DEF[k], lv=metaLv(k), cost=metaCost(k);
    const maxed=lv>=D.max, afford=M.souls>=cost;
    return `<div class="uprow${maxed?' maxed':afford?'':' poor'}" data-m="${k}">
      <div class="ui"><div class="un">${D.n}　<span class="ulv">Lv.${lv}${maxed?' MAX':''}</span></div>
        <div class="ud">${D.d}　<span class="ucur">目前：${
          k==='sharp'?'+'+Math.round(metaVal(k)*100)+'%':'+'+metaVal(k)}</span></div></div>
      <div class="uc">${maxed?'—':'✦ '+cost}</div></div>`;
  }).join('');
  const acc=M.totalQ?Math.round(M.totalOk/M.totalQ*100):0;
  const rz=zoneOf(),depth=rebirthDepth(),limit=rebirthFloorLimit();
  overlay(`<div class="kicker">REINCARNATION</div><h1>輪迴殿堂</h1>
    <div class="rank">✦ 知識點 ${M.souls}　第 ${M.runs} 輪</div>
    <div class="mathbox"><div class="mh">🌀 ${hesc(rz.n)}・輪迴深度</div>
      <div class="ml">已突破 <b>${depth}</b> 層　·　本輪可挑戰至 <b>${limit}F</b>${depth>=rz.floors?'　✓ 本區已完全突破':''}</div>
      <div class="ml">成功完成本輪最深樓層，下一輪才會開放下一層；體魄、護甲與銳識會永久保留。</div></div>
    ${msg?`<div class="shmsg">${msg}</div>`:''}
    <div class="desc" style="margin-bottom:6px">
      知識點<b>主要來自答對題目</b>（基礎 1、標準 2、挑戰 3 點）—— 想變強就得真的把題目弄懂。<br>
      累計作答 <b>${M.totalQ}</b> 題，答對 <b>${M.totalOk}</b> 題（正確率 <b>${acc}%</b>）。<br>
      這裡買的強化<b>永久保留</b>，每一輪都帶著走。</div>
    <div id="uplist">${rows}</div>
    <button class="go" id="mLegacy" style="background:linear-gradient(180deg,#ffd98a,#c98a3c);border-color:#6b4f12">🌟 傳承選擇（${((M.legacyPick)||[]).length}/${legacyCap()}）</button>
    <button class="go" id="mBack">返回</button>`,introScreen,el=>{
      if(el.id==='mLegacy'){ setTimeout(()=>legacyScreen(),10); return true; }
      if(el.id==='mBack'){ setTimeout(introScreen,10); return true; }
      const row=el.closest('.uprow'); if(!row) return false;
      const k=row.dataset.m, D=META_DEF[k], lv=metaLv(k), cost=metaCost(k);
      if(lv>=D.max){ setTimeout(()=>metaScreen('已達上限。'),10); return true; }
      if(M.souls<cost){ setTimeout(()=>metaScreen('知識點不足，還差 '+(cost-M.souls)+' 點。'),10); return true; }
      M.souls-=cost; M.perks=M.perks||{}; M.perks[k]=lv+1;
      saveChar();
      setTimeout(()=>metaScreen('✓ '+D.n+' 提升到 Lv.'+(lv+1)),10);
      return true;
    });
}
/* 輪迴結算畫面 */
function runEndScreen(win,opt={}){
  const r=endRun(win);
  const M=S.meta;
  const depthClear=!!opt.depthClear;
  if(classroomDeathReported)classroomDeathReported=false;
  else classroomCheckpoint(win?'run_clear':depthClear?'run_depth':'run_end');
  // 這一輪已結束 —— 下次進地城一律重置並把血量補滿（走輪迴殿堂繞路也一樣）
  S.runOver=1; saveChar();
  overlay(`<div class="kicker">${depthClear?'DEPTH UNLOCKED':'RUN COMPLETE'}</div>
    <h1 style="color:${win||depthClear?'#8fe86a':'#ff6a6a'}">${win?'這一輪完成':depthClear?'輪迴深度突破！':'這一輪結束'}</h1>
    <div class="rank">獲得 ✦ ${r.gain} 知識點</div>
    ${depthClear?`<div class="mathbox"><div class="mh">🌀 樓層封印解除</div>
      <div class="ml">已完成 <b>${opt.floor}F</b>，下一輪可挑戰 <b>${Math.min(zoneOf().floors,opt.floor+1)}F</b>。</div>
      <div class="ml">先在輪迴殿堂使用知識點強化，再進入下一層會更穩定。</div></div>`:''}
    <div class="mathbox">
      <div class="mh">知識點來源</div>
      <div class="ml">答對題目 ${r.ok} 題（依難度）= <b>${r.fromQuiz}</b></div>
      <div class="ml">區域深度　　　　　= <b>${r.fromZone}</b></div>
      <div class="ml">最長連擊　　　　　= <b>${r.fromChain}</b></div>
      <div class="ml" style="color:#ffe38a;margin-top:4px">合計 ✦ <b>${r.gain}</b>　
        （持有 ${M.souls}）</div>
    </div>
    ${(()=>{const own=((S.meta&&S.meta.legendary)||[]).filter(id=>CARDS[id]);
      const cap=legacyCap();
      let pk=((S.meta&&S.meta.legacyPick)||[]).filter(id=>own.includes(id)).slice(0,cap);
      if(!pk.length&&own.length) pk=own.slice().sort((a,b)=>(CARDS[a].wild?0:CARDS[a].c)-(CARDS[b].wild?0:CARDS[b].c)).slice(0,cap);
      return `<div class="mathbox"><div class="mh">🌟 輪迴傳承（${pk.length}/${cap} 張）</div>
        ${own.length?`<div class="ml">下一輪會帶著這些傳說卡：</div>
          <div class="seq" style="font-size:12px;letter-spacing:0">${pk.map(id=>CARDS[id].n).join('　')||'（未選）'}</div>
          <div class="ml">已擁有 ${own.length} 張傳說卡，可在<b>輪迴殿堂 → 傳承選擇</b>更換。</div>`
          :'<div class="ml"><b>只有傳說卡</b>能跨輪迴保留 —— 其餘牌組每輪歸零。</div>'}
        </div>`;})()}
    <div class="desc">${r.tot?`本輪答題正確率 <b>${Math.round(r.ok/r.tot*100)}%</b>。`:''}
      知識點可以在<b>輪迴殿堂</b>換永久強化，下一輪帶著走。</div>
    <button class="go" id="toMeta">前往輪迴殿堂</button>
    <button class="go" id="again" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">直接開始下一輪</button>
    ${classroomLaunch?'<button class="go" id="resultPetCards">🎴 選擇帶回寵物卡（最多 5 張）</button><button class="go" id="resultClassroomReturn" style="background:linear-gradient(180deg,#4f8f70,#2d6147);border-color:#183d2a">🏫 回傳成果並返回班級</button>':''}`,
    null,el=>{
      if(el.id==='toMeta'){ setTimeout(()=>metaScreen(),10); return true; }
      if(el.id==='again'){ setTimeout(()=>{ reset(); },10); return true; }
      if(el.id==='resultPetCards'){setTimeout(()=>petCardCarryScreen(classroomReturn),10);return true;}
      if(el.id==='resultClassroomReturn'){ classroomReturn(); return true; }
      return false;
    });
}
function completeRebirthFloor(){
  const Z=zoneOf(),cleared=fl+1,nextFloor=Math.min(Z.floors-1,fl+1);
  markRebirthFloor(cleared);
  S.zoneProgress=S.zoneProgress||{};
  S.zoneProgress[Z.k]=Math.max(Number(S.zoneProgress[Z.k])||0,nextFloor);
  running=false;saveChar();
  runEndScreen(false,{depthClear:true,floor:cleared});
}

/* ═══════════════ 外部角色匯入（預留接口）═══════════════
   之後要接另一套 RPG 系統的角色與能力，只要照這個格式丟進來即可。
   未支援的能力不會被吞掉，會列出來等待對接，避免默默失效。 */
const CHAR_SCHEMA=`{
  "name": "角色名稱",
  "title": "稱號（可省略）",
  "stats": {                 // 皆可省略，省略就用預設
    "hp": 100,               // 起始生命
    "mana": 5,               // 法力上限
    "hand": 5,               // 起手抽牌
    "dmg": 1.0,              // 傷害倍率
    "armor": 0               // 減傷
  },
  "abilities": [             // 能力清單
    { "id": "prime_focus",
      "n": "質數專精",
      "d": "質數費用的牌傷害 +50%",
      "type": "passive",
      "effect": { "primeDmg": 0.5 } }
  ],
  "deck": ["knife","wand"]   // 起始牌組（可省略）
}`;
/* 目前支援對接的能力效果鍵 */
const ABILITY_KEYS={
  dmgMul:'全部傷害倍率 +N',
  chainStep:'連鎖倍率 +N',
  handSize:'起手抽牌 +N',
  mana:'法力上限 +N',
  armor:'受到傷害 −N',
  maxhp:'生命上限 +N',
  primeDmg:'質數費用卡傷害 +N（倍率）',
  wildDraw:'打出萬用卡時抽 N 張',
  potion:'起始藥水 +N',
  gold:'起始金幣 +N',
};
let extChar=null;
function applyExtChar(c){
  extChar=c;
  if(c.classroomOnly){
    const st=c.stats||{};S.name=c.name||S.name;S.job=JOBS[c.dungeonJob]?c.dungeonJob:(S.job||'geo');S.classroomJob=c.classJob||'';S.classroomWeapon=c.weapon||null;S.classroomLevel=Math.max(1,Number(c.classLevel)||1);
    /* 每次由班級系統進場都重新開局：職業基本牌組＋目前裝備卡，避免舊輪迴牌組越疊越大。 */
    S.deck=mkDeck(JOBS[S.job].deck);S.mana=6;S.handSize=5;
    S.maxhp=Math.max(60,Number(st.hp)||S.maxhp||100);S.hp=S.maxhp;S.dmgMul=Math.max(.8,Number(st.dmg)||1);S.armor=Math.max(0,Number(st.armor)||0);saveChar();return;
  }
  S.extAbil={};
  const st=c.stats||{};
  S.maxhp=st.hp||100; S.hp=S.maxhp;
  S.mana=st.mana||5; S.handSize=st.hand||5;
  S.dmgMul=st.dmg||1; S.armor=st.armor||0;
  S.name=c.name||S.name; S.job=JOBS[c.dungeonJob]?c.dungeonJob:'ext';S.classroomJob=c.classJob||'';S.classroomWeapon=c.weapon||null;S.classroomLevel=Math.max(1,Number(c.classLevel)||1);
  for(const a of (c.abilities||[])){
    for(const k in (a.effect||{})){
      if(ABILITY_KEYS[k]) S.extAbil[k]=(S.extAbil[k]||0)+a.effect[k];
    }
  }
  // 直接套用可立即生效的
  if(S.extAbil.mana) S.mana+=S.extAbil.mana;
  if(S.extAbil.handSize) S.handSize+=S.extAbil.handSize;
  if(S.extAbil.armor) S.armor+=S.extAbil.armor;
  if(S.extAbil.maxhp){ S.maxhp+=S.extAbil.maxhp; S.hp=S.maxhp; }
  if(S.extAbil.dmgMul) S.dmgMul+=S.extAbil.dmgMul;
  if(S.extAbil.chainStep) S.step+=S.extAbil.chainStep;
  if(S.extAbil.potion) S.pot.heal=(S.pot.heal||0)+S.extAbil.potion;
  if(S.extAbil.gold) S.gold+=S.extAbil.gold;
  if(Array.isArray(c.deck)&&c.deck.length){
    const valid=c.deck.filter(id=>CARDS[id]);
    if(valid.length>=5) S.deck=sanitizeDeck(mkDeck(valid),S.job);
  }
  saveChar();
}
function charImportScreen(msg){
  overlay(`<div class="kicker">CHARACTER IMPORT</div><h1>匯入外部角色</h1>
    <div class="rank">${extChar?('目前：'+(extChar.name||'未命名')):'尚未匯入'}</div>
    ${msg?`<div class="shmsg">${msg}</div>`:''}
    <div class="desc" style="margin-bottom:6px">
      這是為了對接<b>另一套 RPG 系統</b>預留的接口。<br>
      把角色資料照下列格式貼上即可；<b>未支援的能力不會被忽略</b>，
      會列出來等待對接。</div>
    <textarea id="charBox" placeholder='貼上角色 JSON…'></textarea>
    <div class="desc" style="font-size:10px">
      <b>資料格式：</b><pre class="schema">${CHAR_SCHEMA}</pre>
      <b>目前支援的能力效果鍵：</b><br>
      ${Object.entries(ABILITY_KEYS).map(([k,v])=>`<code>${k}</code> ${v}`).join('　')}
    </div>
    <button class="go" id="ciGo">匯入</button>
    <button class="go" id="ciBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>`,
    null,el=>{
      if(el.id==='ciBack'){ setTimeout(introScreen,10); return true; }
      if(el.id!=='ciGo') return false;
      let c;
      try{ c=JSON.parse(($('charBox').value||'').trim()); }
      catch(e){ setTimeout(()=>charImportScreen('JSON 格式錯誤：'+e.message),10); return true; }
      if(!c||typeof c!=='object'||Array.isArray(c)){
        setTimeout(()=>charImportScreen('資料必須是一個物件'),10); return true; }
      if(!c.name){ setTimeout(()=>charImportScreen('缺少 name 欄位'),10); return true; }
      const known=[],unknown=[];
      for(const a of (c.abilities||[])){
        const keys=Object.keys(a.effect||{});
        if(!keys.length){ unknown.push((a.n||a.id||'未命名')+'（沒有 effect）'); continue; }
        const kk=keys.filter(k=>ABILITY_KEYS[k]);
        if(kk.length) known.push((a.n||a.id)+'：'+kk.join('、'));
        const uu=keys.filter(k=>!ABILITY_KEYS[k]);
        if(uu.length) unknown.push((a.n||a.id)+'：'+uu.join('、'));
      }
      applyExtChar(c);
      setTimeout(()=>overlay(`<div class="kicker">IMPORTED</div><h1>匯入成功</h1>
        <div class="rank">${c.name}${c.title?' · '+c.title:''}</div>
        <div class="mathbox"><div class="mh">已套用的數值</div>
          <div class="ml">生命 <b>${S.maxhp}</b>　法力 <b>${S.mana}</b>　起手 <b>${S.handSize}</b>
            　傷害 <b>×${S.dmgMul.toFixed(2)}</b>　減傷 <b>${S.armor}</b></div>
          ${known.length?`<div class="mh" style="margin-top:8px">已對接的能力</div>
            ${known.map(x=>`<div class="ml">✓ ${x}</div>`).join('')}`:''}
          ${unknown.length?`<div class="mh" style="margin-top:8px" style="color:#ff9a5a">尚未支援（等待對接）</div>
            ${unknown.map(x=>`<div class="ml" style="color:#ff9a5a">… ${x}</div>`).join('')}`:''}
        </div>
        <div class="desc">${unknown.length
          ? '未支援的能力已列出，把它們的規則告訴我就能加進來。'
          : '所有能力都已對接完成。'}</div>
        <button class="go" id="ok">開始</button>`,introScreen),10);
      return true;
    });
}

/* ═══════════════ 排行榜與名稱審核 ═══════════════
   課堂環境必須擋住不雅名稱。做法：先正規化（去空白、全形轉半形、
   去除夾雜的符號與重複字），再比對詞庫 —— 避免用「幹_你」這種夾字繞過。 */
const BADWORDS=[
 '幹你','幹妳','靠北','靠腰','機掰','雞掰','機八','雞巴','智障','白痴','白癡',
 '去死','媽的','他媽','你媽','老木','廢物','垃圾','混蛋','王八','三小','沙小',
 '腦殘','низ','fuck','shit','bitch','damn','asshole','dick','cunt','pussy',
 'penis','sex','porn','鴉片','大麻','幹','屌','屎','尿','妓','娼','幹嘛你'
];
const WHITELIST=['幹嘛','幹勁','幹部','幹練','屌絲'];   // 誤判豁免
function normalizeName(v){
  return (v||'')
    .replace(/[\uFF01-\uFF5E]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)) // 全形→半形
    .replace(/[\s\u3000]/g,'')
    .toLowerCase();
}
function nameIssue(raw){
  const v=(raw||'').trim();
  if(!v) return '請輸入名稱';
  if([...v].length>10) return '名稱最多 10 個字';
  const n=normalizeName(v);
  // 去掉夾雜的符號後再檢查一次，防止「幹-你」這類繞過
  // 注意：\w 不含中文，必須明確列出中日韓範圍，否則中文名會被清成空字串
  const stripped=n.replace(/[^0-9a-z\u3400-\u9fff\uf900-\ufaff]/g,'');
  for(const w of BADWORDS){
    const hit=n.includes(w)||stripped.includes(w);
    if(!hit) continue;
    if(WHITELIST.some(ok=>n.includes(ok)||stripped.includes(ok))) continue;
    return '名稱包含不適當的字詞，請換一個';
  }
  // 至少要有一個可辨識的字（中文／字母／數字）
  if(!/[0-9a-z\u3400-\u9fff\uf900-\ufaff]/.test(n)) return '名稱需包含文字或數字';
  return null;
}
/* 分數：區域深度為主，連擊與效率為輔 */
function calcScore(zi,floors,chain,turns,gold,win){
  return Math.round(
    (win?1000:300)*(zi+1) + floors*120 + chain*45 +
    Math.max(0,600-turns*3) + gold*0.4);
}
function loadBoard(){
  try{ return JSON.parse(localStorage.getItem('mathDungeonBoard')||'[]'); }catch(e){ return []; }
}
function saveBoard(list){
  try{ localStorage.setItem('mathDungeonBoard',JSON.stringify(list.slice(0,30))); }catch(e){}
}
function submitScore(name,win){
  const Z=zoneOf(), zi=S.zone||0;
  const chain=Math.max(0,...(S.allChains||[0]));
  const sc=calcScore(zi,fl+1,chain,turnNo,S.gold,win);
  const rec={name,score:sc,zone:Z.n,zi,floor:fl+1,chain,turns:turnNo,
    job:S.job||'geo',lv:S.lv,win:!!win,
    quiz:quizStats.total?Math.round(quizStats.ok/quizStats.total*100):null,
    ts:Date.now()};
  const list=loadBoard();
  list.push(rec);
  list.sort((a,b)=>b.score-a.score);
  saveBoard(list);
  // 連線時同步到班級排行
  if(FB.ready&&FB.room){
    try{ FB.db.ref('rooms/'+FB.room+'/board').push(rec); }catch(e){}
  }
  return rec;
}
/* 名稱輸入（死亡或通關後） */
function nameEntry(win){
  const def=S.name||'';
  const draw=(msg)=>{
    overlay(`<div class="kicker">${win?'RECORD':'GAME OVER'}</div>
      <h1>${win?'留下你的名字':'記錄這次挑戰'}</h1>
      <div class="rank">${zoneOf().n}　第 ${fl+1} 層　最長連擊 ${Math.max(0,...(S.allChains||[0]))}</div>
      ${msg?`<div class="shmsg" style="color:#ff6a6a">${msg}</div>`:''}
      <div class="namebox"><label>排行榜名稱（最多 10 字）</label>
        <input id="lbName" maxlength="10" placeholder="輸入名字" value="${def}"></div>
      <div class="desc" style="font-size:11px">名稱會顯示在班級排行榜上，請使用真實姓名或適當代號。</div>
      <button class="go" id="lbGo">送出成績</button>
      <button class="go" id="lbSkip" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">略過</button>`,
      null,el=>{
        if(el.id==='lbSkip'){ setTimeout(()=>afterRecord(win),10); return true; }
        if(el.id!=='lbGo') return false;
        const v=($('lbName').value||'').trim();
        const bad=nameIssue(v);
        if(bad){ setTimeout(()=>draw(bad),10); return true; }
        S.name=v; saveChar();
        const rec=submitScore(v,win);
        setTimeout(()=>boardScreen2(rec,win),10);
        return true;
      });
  };
  draw('');
}
function afterRecord(win){
  runEndScreen(win);      // 一律先結算輪迴知識點
}
/* 排行榜畫面 */
function boardScreen2(highlight,win){
  const list=loadBoard();
  const rows=list.slice(0,20).map((r,i)=>{
    const me=highlight&&r.ts===highlight.ts;
    const J=JOBS[r.job]||JOBS.geo;
    return `<div class="lbrow${me?' me':''}">
      <span class="lbi">${i+1}</span>
      <span class="lbj" style="color:${J.col}">${J.ic}</span>
      <span class="lbn">${r.name}</span>
      <span class="lbs">${r.score}</span>
      <span class="lbd">${r.zone} ${r.floor}層　連擊${r.chain}${r.quiz!==null?'　答題'+r.quiz+'%':''}</span>
    </div>`;
  }).join('') || '<div class="pempty">還沒有紀錄</div>';
  const rank=highlight?list.findIndex(r=>r.ts===highlight.ts)+1:0;
  overlay(`<div class="kicker">LEADERBOARD</div><h1>排行榜</h1>
    ${highlight?`<div class="rank">你的成績 ${highlight.score} 分　第 ${rank} 名</div>`:''}
    <div class="desc" style="margin-bottom:6px;font-size:11px">
      分數 = 區域深度 ×1000 + 樓層 ×120 + 最長連擊 ×45 + 效率獎勵 + 金幣</div>
    <div id="lbList">${rows}</div>
    <button class="go" id="ok">繼續</button>`,()=>afterRecord(win));
}
function boardOnly(){
  const list=loadBoard();
  const rows=list.slice(0,20).map((r,i)=>{
    const J=JOBS[r.job]||JOBS.geo;
    return `<div class="lbrow">
      <span class="lbi">${i+1}</span><span class="lbj" style="color:${J.col}">${J.ic}</span>
      <span class="lbn">${r.name}</span><span class="lbs">${r.score}</span>
      <span class="lbd">${r.zone} ${r.floor}層　連擊${r.chain}</span></div>`;
  }).join('') || '<div class="pempty">還沒有紀錄 — 去闖一次地城吧</div>';
  overlay(`<div class="kicker">LEADERBOARD</div><h1>排行榜</h1>
    <div class="rank">本機最佳 ${Math.min(20,list.length)} 筆</div>
    <div id="lbList">${rows}</div>
    <button class="go" id="lbClear" style="background:linear-gradient(180deg,#e08a8a,#a03f3f);border-color:#5a1010">清除紀錄</button>
    <button class="go" id="ok">返回</button>`,introScreen,el=>{
      if(el.id!=='lbClear')return false;
      saveBoard([]); setTimeout(boardOnly,10); return true;
    });
}

/* ═══════════════ 負數強化題組 ═══════════════
   負數是七年級最容易卡關的地方，所以在各種題型都拉高負數比例。 */
const sgnS=v=>v<0?'−'+Math.abs(v):''+v;
const parS=v=>v<0?'('+sgnS(v)+')':''+v;
const gcdN=(a,b)=>b?gcdN(b,a%b):Math.abs(a);

/* 負分數比大小：只問誰大，用左右作答 */

/* 負整數乘法 */

/* 負整數除法 */

/* 指數乘法（七年級鑲嵌用）：aᵐ × aⁿ = aᵐ⁺ⁿ，底數可為負 */

/* 乘法公式（八年級以上鑲嵌用），係數含負 */

/* 質因數分解標準式（七年級拆解用） */

/* 因式分解（八年級以上拆解用），係數含正負 */

/* ═══════════════ 謎題分級 ═══════════════
   題庫稽核：課程互動會依樓層抽對應冊別，但【謎題】原本是寫死的 ——
   第 1 區（七上）就會出現因式分解（八上）與機率（九下），對學生太難。
   以下讓每種謎題都依所在區域的冊別選擇適當難度。 */
const zVol=()=>zoneOf().vol;

/* 鑲嵌刻痕：七年級用「積與和」（因式分解的前導），八年級以上才真的分解 */
/* 鑲嵌＝把力量「合起來」：七年級用指數乘法，八年級以上用乘法公式 */

/* 拆解＝把整體「拆開」：七年級用質因數分解，八年級以上用因式分解 */

/* 一般寶箱：七年級考因數倍數，八年級考根式數列，九年級才考機率 */

/* 稀有寶箱：七上用和差問題，七下以上才用雞兔同籠（聯立） */

/* 封印門步驟排序：七上用不含括號的兩步式 */

/* 商人：七上用單價總價（乘除），七下以上才用不等式 */

/* 數線之門：七年級只用一次方程式與絕對值，八年級以上才加平方與立方 */

/* ═══════════════ 校園配置（可編輯）═══════════════
   我沒有龍岡國中的實際平面圖，官網也沒有公開，所以【不憑空編造】。
   下面是一份通用範本，請照實際校園修改棟名、樓層數與在校園圖上的位置。
   設定會存在瀏覽器裡，也可以匯出 JSON 給別台裝置或班級系統。

   座標系統：校園總覽為 20×14 的格子，(x,y) 是左上角、w×h 是佔幾格。 */
/* 依【桃園市立龍岡國民中學 115 學年度教室位置圖】建立。
   六棟教學建築 = 六個區域，樓層數與教室名稱取自平面圖。
   校園總覽為 20×14 格，座標依實際相對位置擺放（操場在西側、行政在南側）。 */
const CAMPUS_DEFAULT=[
 {k:'z1',n:'第一棟教室',short:'一棟',x:6,y:10,w:8,h:2,floors:3,vol:1,col:'#8fe86a',ic:'🏛',
  rooms:['輔導室','學務處','總務處','校長室','教務處','會議室','社團教室','導師室'],
  note:'行政中樞：1F 輔導/學務/總務、2F 校長室/教務處、3F 901~909'},
 {k:'z2',n:'第二棟教室',short:'二棟',x:6,y:6,w:8,h:2,floors:3,vol:2,col:'#8fd0ff',ic:'📗',
  rooms:['健康中心','體育器材室','教師辦公室','教具室','綜合活動教室'],
  note:'1F 健康中心/體育器材室、2F 教師辦公室、3F 801~809'},
 {k:'z3',n:'第三棟教室',short:'三棟',x:9,y:3,w:6,h:2,floors:3,vol:3,col:'#ff9a5a',ic:'📚',
  rooms:['導師室','美術教室1','圖書館','書庫','國樂教室'],
  note:'1F 導師室/美術教室、2F 圖書館/書庫、3F 國樂教室'},
 {k:'z4',n:'第四棟教室',short:'四棟',x:7,y:1,w:7,h:2,floors:3,vol:4,col:'#ffe38a',ic:'📙',
  rooms:['本土教室1','本土教室2','709','710','705~708','701~704'],
  note:'1F 本土教室、2F 705~708、3F 701~704'},
 {k:'z5',n:'電腦大樓',short:'電腦',x:16,y:4,w:3,h:3,floors:3,vol:5,col:'#e26bd6',ic:'💻',
  rooms:['電腦教室3A','電腦教室3B','藝術教室','表演教室1','儲藏室'],
  note:'1F 表演教室/藝術教室、2F 電腦教室、3F 電腦教室3A/3B'},
 {k:'z6',n:'專科大樓',short:'專科',x:16,y:8,w:3,h:4,floors:4,vol:6,col:'#ffb347',ic:'🔬',
  rooms:['理化實驗室','生物實驗室','家政教室1','家政教室2','音樂教室1','音樂教室2',
    '美術教室2','生科教室1','生科教室2','表演教室2','多元學習中心'],
  note:'四層專科：理化/生物實驗室、家政、音樂、生科、多元學習中心'},
];
/* 非建築物的校園元素（純裝飾，讓地圖像真的校園）*/
/* 非關卡的校園設施（依平面圖擺放，讓地圖認得出是龍岡）*/
const CAMPUS_DECO=[
 {t:'field',n:'操場',x:1,y:1,w:4,h:8},
 {t:'court',n:'網球場',x:2,y:4,w:2,h:3},
 {t:'build',n:'活動中心',x:16,y:12,w:3,h:2},
 {t:'build',n:'幼兒園',x:1,y:10,w:3,h:2},
 {t:'park',n:'停車場',x:7,y:13,w:4,h:1},
 {t:'gate',n:'校門',x:11,y:13,w:2,h:1},
 {t:'pond',n:'水池',x:14,y:2,w:1,h:1},
 {t:'yard',n:'中庭草坪',x:6,y:8,w:8,h:2},
 {t:'yard',n:'小操場',x:6,y:3,w:2,h:2},
];
let CAMPUS=null;
const CAMPUS_VER=3;                 // 每次更動預設配置就 +1
let campusEdited=false;
function loadCampus(){
  try{
    const raw=localStorage.getItem('mathDungeonCampus');
    if(raw){
      const d=JSON.parse(raw);
      // 舊格式（純陣列）＝ 尚未加版本，視為過期直接換新
      if(Array.isArray(d)){ CAMPUS=CAMPUS_DEFAULT.map(b=>({...b})); saveCampus(); return; }
      if(d&&Array.isArray(d.data)&&d.data.length===6){
        if(d.v===CAMPUS_VER || d.edited){    // 版本相符、或老師自己改過 → 沿用
          CAMPUS=d.data; campusEdited=!!d.edited; return;
        }
      }
    }
  }catch(e){}
  CAMPUS=CAMPUS_DEFAULT.map(b=>({...b}));   // 其餘情況一律使用最新預設
  campusEdited=false;
}
function saveCampus(userEdit){
  if(userEdit) campusEdited=true;
  try{ localStorage.setItem('mathDungeonCampus',
    JSON.stringify({v:CAMPUS_VER,edited:campusEdited,data:CAMPUS})); }catch(e){}
}
/* 把校園設定套進區域資料（內容分配不變，只換名稱與樓層數）*/
function syncZones(){
  if(!CAMPUS) loadCampus();
  CAMPUS.forEach((b,i)=>{
    if(!ZONES[i])return;
    ZONES[i].n=b.n;
    ZONES[i].floors=12; // 校舍外觀樓層與課程地城進度分離；每冊固定 12 個冒險樓層
    ZONES[i].col=b.col||ZONES[i].col;
    ZONES[i].ic=b.ic||ZONES[i].ic;
    ZONES[i].rooms=b.rooms||[];
  });
}

/* ═══ 像素校園總覽圖 ═══ */
const CW=20, CH=14;
function drawCampus(cv){
  const g=cv.getContext('2d');
  const s=Math.floor(Math.min(cv.width/CW, cv.height/CH));
  const ox=Math.floor((cv.width-s*CW)/2), oy=Math.floor((cv.height-s*CH)/2);
  g.clearRect(0,0,cv.width,cv.height);
  // 地面：淡淡的柏油＋草地格紋
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){
    const alt=(x+y)&1;
    g.fillStyle=alt?'#1d2a1c':'#1a251a';
    g.fillRect(ox+x*s,oy+y*s,s,s);
  }
  // 裝飾
  for(const d of CAMPUS_DECO){
    const X=ox+d.x*s, Y=oy+d.y*s, W=d.w*s, H=d.h*s;
    if(d.t==='field'){
      g.fillStyle='#8a5a34'; g.fillRect(X,Y,W,H);
      g.strokeStyle='#e8d0a0'; g.lineWidth=2;
      g.strokeRect(X+s*0.3,Y+s*0.25,W-s*0.6,H-s*0.5);
      g.beginPath(); g.moveTo(X+W/2,Y+s*0.25); g.lineTo(X+W/2,Y+H-s*0.25); g.stroke();
    }
    if(d.t==='yard'){
      g.fillStyle='#2f4a2a'; g.fillRect(X,Y,W,H);
      for(let i=0;i<d.w;i++){ g.fillStyle='#3f6a35';
        g.fillRect(X+i*s+s*0.3,Y+s*0.25,s*0.4,s*0.4); }
    }
    if(d.t==='court'){                      // 網球場
      g.fillStyle='#2f6a4a'; g.fillRect(X,Y,W,H);
      g.strokeStyle='#dfe8ff'; g.lineWidth=2;
      g.strokeRect(X+s*0.2,Y+s*0.2,W-s*0.4,H-s*0.4);
      g.beginPath(); g.moveTo(X+s*0.2,Y+H/2); g.lineTo(X+W-s*0.2,Y+H/2); g.stroke();
    }
    if(d.t==='build'){                      // 非關卡建築（活動中心、幼兒園）
      g.fillStyle='#2a2438'; g.fillRect(X,Y,W,H);
      g.fillStyle='#5a5078'; g.fillRect(X,Y,W,Math.max(3,s*0.28));
      g.strokeStyle='#6f6490'; g.lineWidth=2; g.strokeRect(X,Y,W,H);
      for(let i=0;i<Math.max(2,d.w);i++){
        g.fillStyle='#8a7fb0';
        g.fillRect(X+s*0.25+i*(W-s*0.5)/Math.max(2,d.w), Y+s*0.5, s*0.25, s*0.3);
      }
    }
    if(d.t==='park'){                       // 停車場
      g.fillStyle='#232330'; g.fillRect(X,Y,W,H);
      g.strokeStyle='#5a5a70'; g.lineWidth=1.5;
      for(let i=1;i<d.w*2;i++){
        g.beginPath(); g.moveTo(X+i*(W/(d.w*2)),Y+s*0.15);
        g.lineTo(X+i*(W/(d.w*2)),Y+H-s*0.15); g.stroke();
      }
    }
    if(d.t==='pond'){                       // 水池
      g.fillStyle='#2a5a8a';
      g.beginPath(); g.ellipse(X+W/2,Y+H/2,W*0.45,H*0.4,0,0,Math.PI*2); g.fill();
      g.strokeStyle='#4a8aca'; g.lineWidth=2; g.stroke();
    }
    if(d.t==='gate'){
      g.fillStyle='#6a5aa0'; g.fillRect(X,Y+H*0.4,W,H*0.6);
      g.fillStyle='#a892e0'; g.fillRect(X,Y+H*0.25,W,H*0.2);
    }
    if(d.w>=2&&d.h>=1){
      g.fillStyle='#9fb8a0'; g.font='bold '+Math.max(7,s*0.36)+'px sans-serif';
      g.fillText(d.n, X+3, Y+H/2+4);
    }
  }
  // 建築物
  CAMPUS.forEach((b,i)=>{
    const open=zoneUnlocked(i), done=(S.cleared!==undefined&&S.cleared>=i);
    const X=ox+b.x*s, Y=oy+b.y*s, W=b.w*s, H=b.h*s;
    // 主體
    g.fillStyle=open?(done?'#2a3f22':'#2a2140'):'#181428';
    g.fillRect(X,Y,W,H);
    // 屋頂色帶
    g.fillStyle=open?b.col:'#3a3550';
    g.fillRect(X,Y,W,Math.max(3,s*0.3));
    // 窗戶：每層一排
    const fl=Math.max(1,b.floors|0);
    const rows=Math.min(fl,Math.floor((H-s*0.4)/(s*0.42)));
    for(let r2=0;r2<rows;r2++){
      const wy=Y+s*0.42+r2*((H-s*0.5)/rows);
      const cols=Math.max(2,Math.floor(b.w*1.6));
      for(let c2=0;c2<cols;c2++){
        const wx=X+s*0.22+c2*((W-s*0.44)/cols);
        g.fillStyle=open?'#ffe9a8':'#2a2438';
        g.fillRect(wx,wy,Math.max(2,s*0.2),Math.max(2,s*0.22));
      }
    }
    // 邊框
    g.strokeStyle=open?b.col:'#3a3550'; g.lineWidth=2;
    g.strokeRect(X,Y,W,H);
    // 標籤
    g.fillStyle=open?'#f3ecff':'#6f6490';
    g.font='bold '+Math.max(9,s*0.46)+'px sans-serif';
    g.fillText((open?'':'🔒')+b.short, X+4, Y+H-6);
    g.fillStyle=open?b.col:'#5a527a';
    g.font='bold '+Math.max(8,s*0.36)+'px sans-serif';
    g.fillText('12層', X+W-s*1.18, Y+H-6);
    if(done){ g.fillStyle='#8fe86a'; g.font='bold '+Math.max(9,s*0.5)+'px sans-serif';
      g.fillText('✓', X+W-s*0.85, Y+s*0.85); }
  });
  return {s,ox,oy};
}
function beginZoneRun(i,startFloor){
  // 金幣與「尚未花掉的」知識點都是單次冒險資源；永久強化本身仍保留。
  S.meta=S.meta||{souls:0,runs:0,totalQ:0,totalOk:0,perks:{}};
  S.zone=i;S.gold=0;S.meta.souls=0;saveChar();
  const maxStart=Math.max(0,rebirthFloorLimit(i)-1);
  const go=()=>{loadFloor(Math.max(0,Math.min(maxStart,startFloor|0)));backToDungeon();};
  if(classroomBankActive()){
    const q=dungeonActionQuestion(null);
    if(q){quizAsk(q,()=>go(),'地城入口 · 教師指定章節');return;}
  }
  go();
}
function zoneEntryScreen(i){
  const Z=ZONES[i],depth=rebirthDepth(i),limit=rebirthFloorLimit(i);
  const cp=Math.max(0,Math.min(limit-1,Number((S.zoneProgress||{})[Z.k])||0));
  overlay(`<div class="kicker">${hesc(Z.n)}</div><h1 style="color:${Z.col}">${Z.ic} 第 ${Z.vol} 冊冒險</h1>
    <div class="rank">輪迴深度 ${depth}・本輪開放至 ${limit}F / 共 ${Z.floors}F</div>
    <div class="desc">${hesc(Z.d)}<br><br><b>首次只能突破 1F；每成功完成一輪，下一輪才開放下一層。</b><br>本次進場金幣與未使用知識點會從 0 開始；輪迴神殿的永久強化會保留。<br>${classroomBankActive()?'<b>📚 進場第一題會優先使用教師指定章節。</b>':'目前使用同冊內建題庫；之後可匯入新的課程目錄題庫。'}</div>
    ${cp>0?`<button class="go" id="zoneContinue">從 ${cp+1}F 檢查點繼續</button>`:''}
    <button class="go" id="zoneStart">從 1F 開始</button>
    <button class="go" id="zoneBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回校園</button>`,null,el=>{
      if(el.id==='zoneContinue'){beginZoneRun(i,cp);return true;}
      if(el.id==='zoneStart'){beginZoneRun(i,0);return true;}
      if(el.id==='zoneBack'){setTimeout(()=>campusScreen(),10);return true;}
      return false;
    });
}
function campusScreen(msg){
  syncZones();
  overlay(`<div class="kicker">CAMPUS MAP</div><h1>校園地圖</h1>
    <div class="rank">已通關 ${(S.cleared===undefined?-1:S.cleared)+1} / ${ZONES.length} 棟</div>
    ${campusEdited?`<div class="shmsg" style="font-size:10px">目前使用<b>自訂配置</b> —
      想改回龍岡國中預設，可到編輯器按「還原成範本」</div>`:''}
    ${msg?`<div class="shmsg">${msg}</div>`:''}
    <canvas id="campusCv" width="330" height="240"></canvas>
    <div class="desc" style="font-size:11px">點建築物進入。🔒 表示還沒開啟 —— 通關前一棟才會解鎖。<br>
      依<b>龍岡國中 115 學年度教室位置圖</b>建立，可用下方按鈕微調。</div>
    <div id="campusList"></div>
    <button class="go" id="cpEdit" style="background:linear-gradient(180deg,#8fd0ff,#3f7fd0);border-color:#1a3a6a;color:#0a1030">✏ 編輯校園配置</button>
    <button class="go" id="cpBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>`,
    null,el=>{
      if(el.id==='cpBack'){ setTimeout(introScreen,10); return true; }
      if(el.id==='cpEdit'){ setTimeout(()=>campusEdit(),10); return true; }
      const row=el.closest('.zrow');
      if(row){
        const i=+row.dataset.z;
        if(!zoneUnlocked(i)){ setTimeout(()=>campusScreen('這一棟還沒開啟 — 先通關前一棟。'),10); return true; }
        if(S.runOver){ delete S.runOver; resetRun(); }  // 輪迴後首次進場：重置＋補滿血
        setTimeout(()=>zoneEntryScreen(i),10);return true;
      }
      return false;
    });
  // 畫圖並綁定點擊
  const cv=$('campusCv');
  if(cv){
    const geo=drawCampus(cv);
    cv.onclick=e=>{
      const r=cv.getBoundingClientRect();
      const px=(e.clientX-r.left)*(cv.width/r.width);
      const py=(e.clientY-r.top)*(cv.height/r.height);
      const gx=Math.floor((px-geo.ox)/geo.s), gy=Math.floor((py-geo.oy)/geo.s);
      const i=CAMPUS.findIndex(b=>gx>=b.x&&gx<b.x+b.w&&gy>=b.y&&gy<b.y+b.h);
      if(i<0)return;
      if(!zoneUnlocked(i)){ campusScreen('「'+CAMPUS[i].n+'」還沒開啟 — 先通關前一棟。'); return; }
      zoneEntryScreen(i);
    };
  }
  // 文字清單（給不方便點小圖的情況）
  const list=$('campusList');
  if(list){
    list.innerHTML=CAMPUS.map((b,i)=>{
      const open=zoneUnlocked(i), done=(S.cleared!==undefined&&S.cleared>=i);
      const rec=(S.zoneBest||{})[ZONES[i].k];
      return `<div class="zrow${open?'':' locked'}${done?' done':''}" data-z="${i}"
        style="border-color:${open?b.col:'#3a2c60'}">
        <div class="zic" style="background:${b.col}22;color:${open?b.col:'#5a527a'}">${open?b.ic:'🔒'}</div>
        <div class="zinfo"><div class="zn" style="color:${open?b.col:'#6f6490'}">${b.n}
          <span class="zf">12 層地城 · 第 ${b.vol} 冊</span>
          ${done?'<span class="zdone">✓ 已通關</span>':''}</div>
          <div class="zd">${open?(b.rooms||[]).join('、'):'通關前一棟才會開啟'}</div>
          ${rec?`<div class="zrec">最佳：最長連擊 ${rec.chain}　${rec.turns} 回合</div>`:''}
        </div></div>`;
    }).join('');
  }
}
/* ═══ 校園配置編輯器 ═══ */
function campusEdit(sel){
  syncZones();
  const i=(sel===undefined?0:sel);
  const b=CAMPUS[i];
  overlay(`<div class="kicker">CAMPUS EDITOR</div><h1>✏ 編輯校園配置</h1>
    <div class="rank">第 ${i+1} / 6 棟　對應第 ${b.vol} 冊</div>
    <canvas id="editCv" width="330" height="240"></canvas>
    <div class="namebox"><label>棟名（例：忠孝樓、科學館）</label>
      <input id="edName" maxlength="10" value="${b.n}"></div>
    <div class="namebox"><label>地圖上的簡稱（2～3 字）</label>
      <input id="edShort" maxlength="4" value="${b.short}"></div>
    <div class="namebox"><label>校舍外觀樓層（1～9；不影響固定 12 層課程地城）</label>
      <input id="edFloors" type="number" min="1" max="9" value="${Math.max(1,Math.min(9,b.floors||3))}"></div>
    <div class="namebox"><label>主要教室（用、分隔）</label>
      <input id="edRooms" value="${(b.rooms||[]).join('、')}"></div>
    <div class="edgrid">
      <span class="edlbl">位置與大小</span>
      <span class="edbtn" data-mv="left">◀</span><span class="edbtn" data-mv="right">▶</span>
      <span class="edbtn" data-mv="up">▲</span><span class="edbtn" data-mv="down">▼</span>
      <span class="edbtn" data-mv="wider">寬 +</span><span class="edbtn" data-mv="narrow">寬 −</span>
      <span class="edbtn" data-mv="taller">高 +</span><span class="edbtn" data-mv="shorter">高 −</span>
    </div>
    <div class="desc" style="font-size:10px">目前：(${b.x}, ${b.y})　${b.w}×${b.h} 格</div>
    <button class="go" id="edSave">儲存這一棟</button>
    <div class="edtabs">${CAMPUS.map((x,j)=>
      `<span class="edtab${j===i?' on':''}" data-t="${j}">${x.short}</span>`).join('')}</div>
    <button class="go" id="edExport" style="background:linear-gradient(180deg,#8fd0ff,#3f7fd0);border-color:#1a3a6a;color:#0a1030">匯出／匯入配置</button>
    <button class="go" id="edDone" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">完成</button>`,
    null,el=>{
      const save=()=>{
        b.n=($('edName').value||b.n).trim();
        b.short=($('edShort').value||b.short).trim();
        b.floors=Math.max(1,Math.min(9,parseInt($('edFloors').value)||b.floors));
        const rm=($('edRooms').value||'').split(/[、,，]/).map(x=>x.trim()).filter(Boolean);
        b.rooms=rm;
        saveCampus(true); syncZones();
      };
      if(el.id==='edDone'){ save(); setTimeout(()=>campusScreen('配置已儲存。'),10); return true; }
      if(el.id==='edSave'){ save(); setTimeout(()=>campusEdit(i),10); return true; }
      if(el.id==='edExport'){ save(); setTimeout(campusIO,10); return true; }
      const tab=el.closest('.edtab');
      if(tab){ save(); setTimeout(()=>campusEdit(+tab.dataset.t),10); return true; }
      const mv=el.closest('.edbtn');
      if(mv){
        const d=mv.dataset.mv;
        if(d==='left') b.x=Math.max(0,b.x-1);
        if(d==='right') b.x=Math.min(CW-b.w,b.x+1);
        if(d==='up') b.y=Math.max(0,b.y-1);
        if(d==='down') b.y=Math.min(CH-b.h,b.y+1);
        if(d==='wider') b.w=Math.min(CW-b.x,b.w+1);
        if(d==='narrow') b.w=Math.max(2,b.w-1);
        if(d==='taller') b.h=Math.min(CH-b.y,b.h+1);
        if(d==='shorter') b.h=Math.max(2,b.h-1);
        saveCampus(true);
        setTimeout(()=>campusEdit(i),10);
        return true;
      }
      return false;
    });
  const cv=$('editCv');
  if(cv){
    drawCampus(cv);
    // 標出正在編輯的那一棟
    const g=cv.getContext('2d');
    const s2=Math.floor(Math.min(cv.width/CW, cv.height/CH));
    const ox=Math.floor((cv.width-s2*CW)/2), oy=Math.floor((cv.height-s2*CH)/2);
    g.strokeStyle='#fff'; g.lineWidth=3; g.setLineDash([5,4]);
    g.strokeRect(ox+b.x*s2-2,oy+b.y*s2-2,b.w*s2+4,b.h*s2+4);
    g.setLineDash([]);
  }
}
function campusIO(){
  const code=JSON.stringify(CAMPUS);
  overlay(`<div class="kicker">CAMPUS I/O</div><h1>校園配置</h1>
    <div class="desc">複製這段可以在別台裝置還原相同的校園配置。</div>
    <textarea id="cpBox" readonly>${code}</textarea>
    <div class="namebox"><label>貼上配置以還原</label>
      <textarea id="cpIn" placeholder="貼上校園配置 JSON…"></textarea></div>
    <button class="go" id="cpLoad">套用</button>
    <button class="go" id="cpReset" style="background:linear-gradient(180deg,#e08a8a,#a03f3f);border-color:#5a1010">還原成範本</button>
    <button class="go" id="ok" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>`,
    ()=>campusEdit(0),el=>{
      if(el.id==='cpReset'){
        CAMPUS=CAMPUS_DEFAULT.map(x=>({...x})); saveCampus(true); syncZones();
        setTimeout(()=>campusEdit(0),10); return true;
      }
      if(el.id!=='cpLoad')return false;
      try{
        const d=JSON.parse(($('cpIn').value||'').trim());
        if(!Array.isArray(d)||d.length!==6) throw new Error('必須是 6 棟的陣列');
        for(const b of d){ if(!b.n||!b.short) throw new Error('每一棟都需要 n 與 short'); }
        CAMPUS=d.map(x=>({...x})); saveCampus(true); syncZones();
        toast('校園配置已套用',1600);
        setTimeout(()=>campusEdit(0),10);
      }catch(e){ toast('格式錯誤：'+e.message,2200); }
      return true;
    });
}

/* ═══════════════ 六大區域 ═══════════════
   樓層逐區遞增；內容（卡牌／寶石／NPC／壁畫）分區解鎖，
   避免第一區就把所有東西塞給玩家。通關一區才開下一區，已通關的可重複複習。 */
const ZONES=[
 {k:'z1',n:'符文地窖',floors:12,vol:1,col:'#8fe86a',ic:'🕯',
  d:'第一冊：正負數、指數律、因數倍數與分數運算。',
  acts:['正負石窟','因數菌林','分數雲台','整數星庭'],
  cards:['knife','dagger','pebble','wand','garlic','guard','whip','imelda','blank'],
  gems:['spinach','armor'],
  npcs:['course1','guide','sage'], murals:['m1'],
  squads:['mushPack','batSwarm']},
 {k:'z2',n:'代數迴廊',floors:12,vol:2,col:'#8fd0ff',ic:'✖',
  d:'第二冊：聯立方程式、坐標、比例與不等式。',
  acts:['等式水道','坐標庭園','比例雲橋','代數天廊'],
  cards:['clock','antonio','water','poe','axe'],
  gems:['empty'],
  npcs:['course2','gate','merchant'], murals:['m2'],
  squads:['slimeBand','mothSwarm','skelSquad','mushPack']},
 {k:'z3',n:'幾何聖堂',floors:12,vol:3,col:'#ff9a5a',ic:'🔺',
  d:'第三冊：乘法公式、根式、畢氏定理與因式分解。',
  acts:['多項式長廊','根式岩殿','畢氏空園','因式聖壇'],
  cards:['candle','pasqua','bible','nDebt','nInv'],
  gems:['bracer','hollow'],
  npcs:['course3','smith','teller'], murals:['m3'],
  squads:['gargPair','triGang','skelSquad','slimeBand']},
 {k:'z4',n:'數列高塔',floors:12,vol:4,col:'#ffe38a',ic:'📈',
  d:'第四冊：數列、一次函數、三角形與四邊形。',
  acts:['等差階梯','函數機房','三角雲海','四邊天台'],
  cards:['trip','cross','nOver','spring','gaussC','pythaC'],
  gems:['candel'],
  npcs:['course4','sage','stat'], murals:['m1','m3'],
  squads:['birdFlock','cloudBand','gargPair','triGang']},
 {k:'z5',n:'圓環深淵',floors:12,vol:5,col:'#e26bd6',ic:'⭕',
  d:'第五冊：相似形、圓與二次函數。',
  acts:['相似鏡窟','圓弧深井','拋物雲環','切線月庭'],
  cards:['nImag','nUnit','scroll','euclidC','fermatC','archiC'],
  gems:['dup'],
  npcs:['course5','smith','merchant','stat'], murals:['m2','m3'],
  squads:['crabPack','wraithBand','birdFlock','cloudBand']},
 {k:'z6',n:'機率王座',floors:12,vol:6,col:'#ffb347',ic:'👑',
  d:'第六冊：統計、機率與立體圖形。',
  acts:['資料書庫','機率賭城','立體雲城','統計王座'],
  cards:['pascalC','eulerC','descartesC','wellspring'],
  gems:['wings'],
  npcs:['course6','stat','teller','sage','smith'], murals:['m1','m2','m3'],
  squads:['diceGang','knightGuard','wraithBand','crabPack']},
];
const zoneOf=()=>ZONES[Math.min(S.zone||0,ZONES.length-1)];
const zoneUnlocked=i=>i<=(S.cleared===undefined?-1:S.cleared)+1;
/* 依已通關進度決定可取得的卡牌與寶石 */
function unlockedCards(){
  const out=[];
  for(let i=0;i<=Math.min((S.cleared||0)+1,ZONES.length-1);i++) out.push(...ZONES[i].cards);
  return out.filter(id=>CARDS[id]&&!CARDS[id].EVO);
}
function unlockedGems(){
  const out=[];
  for(let i=0;i<=Math.min((S.cleared||0)+1,ZONES.length-1);i++) out.push(...ZONES[i].gems);
  return out.filter(g=>GEMS[g]);
}

/* ═══ 地圖：區域選擇 ═══ */
function zoneScreen(msg){
  const rows=ZONES.map((z,i)=>{
    const open=zoneUnlocked(i);
    const done=(S.cleared!==undefined&&S.cleared>=i);
    const rec=(S.zoneBest||{})[z.k];
    return `<div class="zrow${open?'':' locked'}${done?' done':''}" data-z="${i}"
      style="border-color:${open?z.col:'#3a2c60'}">
      <div class="zic" style="background:${z.col}22;color:${open?z.col:'#5a527a'}">${open?z.ic:'🔒'}</div>
      <div class="zinfo">
        <div class="zn" style="color:${open?z.col:'#6f6490'}">${z.n}
          <span class="zf">${z.floors} 層 · 第 ${z.vol} 冊</span>
          ${done?'<span class="zdone">✓ 已通關</span>':''}</div>
        <div class="zd">${open?z.d:'通關前一個區域才會開啟'}</div>
        ${rec?`<div class="zrec">最佳：第 ${rec.floor} 層　最長連擊 ${rec.chain}　${rec.turns} 回合</div>`:''}
      </div></div>`;
  }).join('');
  const nUC=unlockedCards().length, nUG=unlockedGems().length;
  overlay(`<div class="kicker">WORLD MAP</div><h1>地圖</h1>
    <div class="rank">已通關 ${(S.cleared===undefined?-1:S.cleared)+1} / ${ZONES.length} 區</div>
    ${msg?`<div class="shmsg">${msg}</div>`:''}
    <div class="desc" style="margin-bottom:6px">
      通關一個區域才會開啟下一個。<b>已通關的區域可以重複進入複習</b>。<br>
      目前可取得 <b>${nUC}</b> 種卡牌、<b>${nUG}</b> 種寶石 —— 越深入解鎖越多。</div>
    <div id="zonelist">${rows}</div>
    <button class="go" id="zBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>`,
    null,el=>{
      if(el.id==='zBack'){ setTimeout(introScreen,10); return true; }
      const row=el.closest('.zrow'); if(!row) return false;
      const i=+row.dataset.z;
      if(!zoneUnlocked(i)){ setTimeout(()=>zoneScreen('這個區域還沒開啟 — 先通關前一區。'),10); return true; }
      if(S.runOver){ delete S.runOver; resetRun(); }    // 輪迴後首次進場：重置＋補滿血
      setTimeout(()=>zoneEntryScreen(i),10);
      return true;
    });
}

/* ═══════════════ 九宮格隨機地圖生成 ═══════════════
   3×3 個 5×5 區塊拼成 15×15。每塊之間以中央出入口對接。
   流程：隨機生成樹（保證連通）→ 隨機補邊（製造變化）→
        拓撲修復（補到「無死路、無割點」為止）。
   驗證：500 張隨機地圖，100% 無死路無割點、87% 配置不重複。
   為什麼一定要修復：死路或割點會讓玩家被挑戰者堵死，逃跑機制就失效了。 */
const TSZ=5; let TN=3, MSZ=TSZ*TN;
/* 地圖隨難度擴大：越深的區域、越深的樓層，迷宮的區塊數越多。
   3×3（15×15）起步，最大 6×6（30×30）。 */
function setMazeSize(zi,fi){
  TN=Math.min(6, 3 + (zi>=1?1:0) + (zi>=3?1:0) + (fi>=3?1:0) + (zi>=5?1:0));
  MSZ=TSZ*TN;
}
/* 可拼湊的隨機格局：房間區塊不再只有一種 3×3 空房，
   而是從模板庫隨機挑一塊拼進去（模板只「加地板」，拓撲修復照常運作）。 */
const ROOM_TPL=[
  {w:8,cells:(lx,ly)=>lx>=1&&lx<=3&&ly>=1&&ly<=3},                 // 標準空房
  {w:4,cells:(lx,ly)=>!((lx===1||lx===3)&&(ly===1||ly===3))},      // 柱廳（四柱大房）
  {w:3,cells:()=>true},                                            // 全開廣場
  {w:2,cells:(lx,ly)=>ly>=1&&ly<=3},                               // 橫向大廳
  {w:2,cells:(lx,ly)=>lx>=1&&lx<=3},                               // 縱向大廳
  {w:3,cells:(lx,ly)=>Math.abs(lx-2)+Math.abs(ly-2)<=2},           // 菱形廳
];
function pickTpl(){
  const tot=ROOM_TPL.reduce((a,t)=>a+t.w,0);
  let r=Math.random()*tot;
  for(const t of ROOM_TPL){ if((r-=t.w)<0) return t; }
  return ROOM_TPL[0];
}
function genMaze(){
  const nodes=[]; for(let j=0;j<TN;j++)for(let i=0;i<TN;i++)nodes.push([i,j]);
  const key=(a,b)=>a[0]<b[0]||(a[0]===b[0]&&a[1]<b[1])
    ? a.join()+'|'+b.join() : b.join()+'|'+a.join();
  const allEdges=[];
  for(let j=0;j<TN;j++)for(let i=0;i<TN;i++){
    if(i+1<TN) allEdges.push([[i,j],[i+1,j]]);
    if(j+1<TN) allEdges.push([[i,j],[i,j+1]]);
  }
  // 生成樹
  let edges=new Set(), unv=new Set(nodes.map(n=>n.join()));
  let cur=nodes[rand(nodes.length)]; unv.delete(cur.join());
  const stack=[cur];
  while(unv.size&&stack.length){
    const [x,y]=stack[stack.length-1];
    const nb=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]]
      .filter(n=>n[0]>=0&&n[1]>=0&&n[0]<TN&&n[1]<TN&&unv.has(n.join()));
    if(nb.length){
      const n=nb[rand(nb.length)];
      edges.add(key([x,y],n)); unv.delete(n.join()); stack.push(n);
    } else stack.pop();
  }
  // 隨機補邊 + 隨機房間（每個房間配一個拼裝模板）
  for(const [a,b] of allEdges) if(!edges.has(key(a,b))&&Math.random()<0.45) edges.add(key(a,b));
  let rooms=new Set(nodes.filter(()=>Math.random()<0.55).map(n=>n.join()));
  const tpls={}; for(const n of nodes) tpls[n.join()]=pickTpl();

  const build=()=>{
    const g=Array.from({length:MSZ},()=>Array(MSZ).fill('W'));
    const doors={}; nodes.forEach(n=>doors[n.join()]=new Set());
    for(const [a,b] of allEdges){
      if(!edges.has(key(a,b)))continue;
      if(b[0]===a[0]+1){doors[a.join()].add('E');doors[b.join()].add('W');}
      else{doors[a.join()].add('S');doors[b.join()].add('N');}
    }
    for(const [ti,tj] of nodes){
      const ox=ti*TSZ, oy=tj*TSZ;
      const put=(lx,ly)=>g[oy+ly][ox+lx]='.';
      put(2,2);
      const d=doors[[ti,tj].join()];
      if(d.has('N')){put(2,1);put(2,0);}
      if(d.has('S')){put(2,3);put(2,4);}
      if(d.has('E')){put(3,2);put(4,2);}
      if(d.has('W')){put(1,2);put(0,2);}
      if(rooms.has([ti,tj].join())){
        // 靠地圖外緣的區塊一律用標準房 —— 模板開到外牆邊會形成修不掉的死路
        const onEdge=(ti===0||tj===0||ti===TN-1||tj===TN-1);
        const tpl=onEdge?ROOM_TPL[0]:tpls[[ti,tj].join()];
        for(let ly=0;ly<TSZ;ly++)for(let lx=0;lx<TSZ;lx++)
          if(tpl.cells(lx,ly))put(lx,ly);
      }
    }
    return g;
  };
  const topo=g=>{
    const wk=(x,y)=>x>=0&&y>=0&&x<MSZ&&y<MSZ&&g[y][x]!=='W';
    const cells=[]; for(let y=0;y<MSZ;y++)for(let x=0;x<MSZ;x++)if(wk(x,y))cells.push([x,y]);
    const nb=(x,y)=>[[1,0],[-1,0],[0,1],[0,-1]].map(([a,b])=>[x+a,y+b]).filter(([a,b])=>wk(a,b));
    const deadCells=cells.filter(([x,y])=>nb(x,y).length===1);
    const dead=deadCells;
    let cut=0;
    for(const sk of cells){
      const st=cells.find(c=>c[0]!==sk[0]||c[1]!==sk[1]); if(!st)continue;
      const seen=new Set([st.join()]); const q=[st];
      while(q.length){ const [x,y]=q.pop();
        for(const n of nb(x,y)){ if(n[0]===sk[0]&&n[1]===sk[1])continue;
          const k=n.join(); if(!seen.has(k)){seen.add(k);q.push(n);} } }
      if(seen.size!==cells.length-1){cut++;break;}
    }
    return {cells,dead:dead.length,deadCells,cut};
  };
  // 修復到拓撲乾淨 —— 優先補「死路所在區塊」的缺邊，大地圖也能快速收斂
  let g=build(), t=topo(g), guard=0;
  while((t.dead||t.cut)&&guard++<80){
    const missing=allEdges.filter(([a,b])=>!edges.has(key(a,b)));
    let fixed=false;
    if(t.deadCells.length&&missing.length){
      const [dx0,dy0]=t.deadCells[rand(t.deadCells.length)];
      const bi=(dx0/TSZ)|0, bj=(dy0/TSZ)|0;
      const near=missing.filter(([a,b])=>
        (a[0]===bi&&a[1]===bj)||(b[0]===bi&&b[1]===bj));
      if(near.length){ const m=near[rand(near.length)]; edges.add(key(m[0],m[1])); fixed=true; }
    }
    if(!fixed){
      if(missing.length){ const m=missing[rand(missing.length)]; edges.add(key(m[0],m[1])); }
      else { const closed=nodes.filter(n=>!rooms.has(n.join()));
        if(closed.length){ const c=closed[rand(closed.length)].join();
          rooms.add(c); tpls[c]=ROOM_TPL[0]; }
        else break; }
    }
    g=build(); t=topo(g);
  }
  return {grid:g,cells:t.cells};
}
/* 在地圖上隨機挑位置，並確保彼此有足夠距離 */
/* 全樓層共用的佔用表 —— 怪物、陷阱、鑰匙、NPC、樓梯一律不得同格。
   舊版的問題：pickSpots 被呼叫兩次卻各自獨立，第二次不知道第一次選過哪些格；
   陷阱的排除清單也沒有納入怪物。實測 14.3% 的地圖會出現道具重疊
   （包含「鑰匙被 NPC 蓋住」這種直接卡關的情況）、16.8% 有陷阱蓋在怪物上。 */
let occupied=new Set();
const cellKey=c=>c[0]+','+c[1];
const isFree=c=>!occupied.has(cellKey(c));
function claim(c){ occupied.add(cellKey(c)); return c; }
/* 從 cells 取一個「尚未被佔用」且盡量遠離已用點的格子 */
function takeSpot(cells,minD,anchors){
  const dist=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
  const free=cells.filter(isFree);
  if(!free.length) return null;
  let best=null,bestScore=-1;
  for(let t=0;t<300;t++){
    const c=free[rand(free.length)];
    const score=anchors.length?Math.min(...anchors.map(u=>dist(c,u))):99;
    if(score>bestScore){ bestScore=score; best=c; }
    if(score>=minD) break;
  }
  return best?claim(best):null;
}
function pickSpots(cells,specs,startCell,fallback){
  const out={};
  const anchors=[startCell];
  for(const [name,minD] of specs){
    let c=takeSpot(cells,minD,anchors);
    // 首選池（例如房間角落）不夠放時退回全地圖挑 —— 位置不完美，但絕不能缺件
    if(!c&&fallback) c=takeSpot(fallback,minD,anchors);
    if(!c&&fallback) c=takeSpot(fallback,0,anchors);
    if(c){ out[name]=c; anchors.push(c); }
  }
  return out;
}

/* ═══════════════ 迷宮中的 AI 挑戰者 ═══════════════
   會在迷宮裡走動的對手。難度直接標在頭上與小地圖上，
   讓學生自己判斷「打得過就打、打不過就繞路」——
   地圖已驗證無死路無割點，任何位置都至少有兩條退路。 */
let rivals=[];
function spawnRivals(floorIdx){
  // 每層只放【一位】戰鬥 NPC（配合每層一解說一戰鬥的設計）
  // 難度依「區域深度 + 樓層」挑選，越深越強
  const tier=Math.min(AI_FOES.length-1, (S.zone||0) + Math.floor(floorIdx/2));
  const picks=[AI_FOES[tier].k];
  // 舊版用寫死座標，在隨機地圖上可能落在牆裡或蓋住道具 → 改為從空格挑
  const free=[];
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    if(walkable(x,y)&&isFree([x,y])&&
       Math.abs(x-P.x)+Math.abs(y-P.y)>=5) free.push([x,y]);
  }
  rivals = picks.map((k,i)=>{
    const base=AI_FOES.find(x2=>x2.k===k),depthScale=1.12+(S.zone||0)*.07+Math.min(.28,floorIdx*.035);
    const a=base?Object.assign({},base,{lv:base.lv+(S.zone||0)+Math.floor(floorIdx/3),npcScale:depthScale}):null;
    const spot=free.length?claim(free.splice(rand(free.length),1)[0]):null;
    if(!spot) return null;
    const [x,y]=spot;
    return {k,a,x,y,hx:x,hy:y,dir:rand(4),path:[],tick:0,speed:2,
            alive:1,cool:0,chasing:0};
  }).filter(r=>r&&r.a&&walkable(r.x,r.y));
}
/* 挑戰者行動：平時巡邏，看到你會追一段時間，但追不久 */
function rivalTick(){
  for(const r of rivals){
    if(!r.alive)continue;
    if(r.cool>0) r.cool--;
    const seen=inCone(r,P.x,P.y,4);
    if(seen&&!r.cool) r.chasing=6;              // 看到你 → 追 6 回合
    else if(r.chasing>0) r.chasing--;
    if(++r.tick<r.speed) continue;
    r.tick=0;
    if(r.chasing>0){
      const st=bfsStep(r.x,r.y,P.x,P.y);
      if(st) moveRival(r,st[0],st[1]);
    }else{
      if(!r.path||!r.path.length){
        for(let t=0;t<12;t++){
          const tx=r.hx+rand(9)-4, ty=r.hy+rand(9)-4;
          if(walkable(tx,ty)&&bfsDist(r.hx,r.hy,tx,ty)<=6){ r.path=[tx,ty]; break; }
        }
      }
      if(r.path&&r.path.length){
        const st=bfsStep(r.x,r.y,r.path[0],r.path[1]);
        if(st) moveRival(r,st[0],st[1]); else r.path=[];
        if(r.x===r.path[0]&&r.y===r.path[1]) r.path=[];
      }
    }
  }
}
function moveRival(r,nx,ny){
  if(rivals.some(o=>o!==r&&o.alive&&o.x===nx&&o.y===ny))return;
  const dx=nx-r.x,dy=ny-r.y;
  r.dir=dx===1?1:dx===-1?3:dy===1?2:0;
  r.x=nx;r.y=ny;
}
/* 走到挑戰者身上 → 選擇開戰或迴避 */
function checkRival(){
  for(const r of rivals){
    if(!r.alive||r.cool>0)continue;
    if(r.x!==P.x||r.y!==P.y)continue;
    const a=r.a;
    running=false;
    // 已經躲過一次的對手：這次不給退路，只能打
    if(r.fled){
      overlay(`<div class="kicker">NO ESCAPE</div>
        <h1 style="color:#ff6a6a">${a.n} 堵住了去路</h1>
        <div class="rank" style="color:${a.col};border-color:${a.col}">${a.diff}　Lv.${a.lv}　${a.rate}</div>
        <div class="desc">「上次讓你跑了，這次沒有下次。」<br><br>
          <b>你躲過牠一次，這一場無法迴避、也不能中途逃跑。</b><br>
          贏了奪走它一張卡牌；輸了失去一張（牌組保底 5 張）。</div>
        <button class="go" id="rvForce">只能一戰</button>`,
        null,el=>{
          if(el.id!=='rvForce')return false;
          setTimeout(()=>startRivalDuel(r),10);
          return true;
        });
      return true;
    }
    overlay(`<div class="kicker">CHALLENGER</div><h1 style="color:${a.col}">${a.n}</h1>
      <div class="rank" style="color:${a.col};border-color:${a.col}">${a.diff}　Lv.${a.lv}　${a.rate}</div>
      <div class="desc">${a.d}<br><br>
        <b>贏了可以奪走它一張卡牌</b>；輸了會失去一張（牌組保底 5 張）。<br>
        打不過可以<b>迴避</b>，但<i>只有這一次</i> —— 躲過之後再遇到就必須開戰。</div>
      <button class="go" id="rvGo">接受挑戰</button>
      <button class="go" id="rvNo" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">迴避（僅此一次）</button>`,
      null,el=>{
        if(el.id==='rvNo'){
          r.fled=1;                        // 記下來：下次不能再躲
          r.chasing=5; r.cool=2;
          toast(a.n+' 追了上來 — 下次遇到就得打了！',2400);
          backToDungeon(); return true;
        }
        if(el.id!=='rvGo')return false;
        setTimeout(()=>startRivalDuel(r),10);
        return true;
      });
    return true;
  }
  return false;
}
/* 與挑戰者對戰：有賭注，但可以中途逃跑 */
function startRivalDuel(r){
  const a=r.a;
  startAIDuel(a);
  B.pvp.rival=r;
  B.pvp.stake=true;          // 有賭注（practice 仍為 true：兩者共用同一條 AI 流程）
  B.pvp.noFlee=!!r.fled;     // 躲過一次的對手，這場不能逃
  toast(r.fled?'無處可逃 — 這一場必須打完！'
              :'賭注戰！贏了奪卡，輸了失卡 —— 也可以逃跑（僅此一次）',2400);
  renderAll();
}
/* 中途逃跑：付出代價但保住牌組 */
/* 賭注戰結算：奪卡／失卡 */
function rivalEnd(win){
  const r=B.pvp.rival, a=B.pvp.ai;
  let card=null;
  if(win){
    const pool=a.deck.filter(id=>CARDS[id]&&!CARDS[id].CURSE);
    if(pool.length){ card=pool[rand(pool.length)]; }
    if(r) r.alive=0;
    const c=card?CARDS[card]:null, R2=c?RARITY[c.r||'C']:null;
    overlay(`<div class="kicker">VICTORY</div><h1>擊敗 ${a.n}！</h1>
      ${c?`<div class="rank" style="color:${R2.col};border-color:${R2.col}">奪取 ${R2.n}卡：${c.n}</div>
        <div class="desc">${c.t.replace(/<\/?[a-z]+>/g,'')}<br>已加入牌組。</div>`:''}
      <div class="desc" style="font-size:11px;color:#a99ec9">這個對手已經離場。</div>
      <button class="go" id="ok">${card?'決定這張卡':'繼續探索'}</button>`,
      ()=>{ saveChar(); if(card) offerCard(card); else backToDungeon(); });
  }else{
    let lost=null;
    const removable=removableDeckIndexes().filter(i=>!CARDS[S.deck[i].id].CURSE);
    if(removable.length){const idx=removable[rand(removable.length)];lost=S.deck.splice(idx,1)[0];}
    S.hp=Math.max(1,Math.round(S.maxhp*0.35));
    if(r) r.alive=0;      // 打完就離場，避免輸了被同一個對手反覆堵住
    overlay(`<div class="kicker">DEFEAT</div>
      <h1 style="color:#ff6a6a;text-shadow:0 3px 0 #4a0808">敗給 ${a.n}</h1>
      <div class="rank" style="color:#ff6a6a;border-color:#ff6a6a">
        ${lost?'失去卡牌：'+CARDS[lost.id].n:'牌組過少，未失去卡牌'}</div>
      <div class="desc">生命剩下 <b>${S.hp}</b>。<br>
        牠帶著戰利品離開了 —— <b>這個對手已經離場</b>，先去別處變強。</div>
      <button class="go" id="ok">繼續探索</button>`,()=>{ saveChar(); backToDungeon(); });
  }
}
function fleeDuel(){
  if(!B||!B.pvp||B.over)return;
  if(B.pvp.noFlee){ toast('這一場無處可逃 —— 打完它',1800); return; }
  if(B.pvp.rival) B.pvp.rival.fled=1;      // 逃跑也算用掉唯一的機會
  const cost=Math.min(S.gold,40);
  S.gold-=cost;
  if(B.pvp.rival){ B.pvp.rival.cool=8; B.pvp.rival.chasing=0; }
  B.over=true;
  clearBattleTemporaryState();
  overlay(`<div class="kicker">ESCAPED</div><h1>成功脫逃</h1>
    <div class="rank">損失 ◉ ${cost} 金幣</div>
    <div class="desc">你趁隙拉開距離逃走了，牌組完好無損。<br>
      但牠記住你了 —— <b>下次遇到就無法再逃，只能一戰</b>。<br>
      趁現在把牌組練強。</div>
    <button class="go" id="ok">回到迷宮</button>`,()=>{ saveChar(); backToDungeon(); });
}

/* ═══════════════════ AI 對戰練習 ═══════════════════
   不需要連線、不需要第二個人。用來熟悉即時對戰的節奏與出牌判斷。
   練習賽不會奪卡、輸了也不扣牌，可以放心試各種打法。 */
const AI_FOES=[
 {k:'rookie',n:'見習生 小圓',job:'geo',lv:1,power:1,diff:'入門',col:'#8fe86a',rate:'新手勝率約 58%',
  d:'牌組沒有萬用卡，連擊接不長。適合熟悉節奏。',
  deck:['knife','knife','dagger','pebble','guard','wand','garlic','poe','imelda','whip']},
 {k:'alg',n:'代數術士 小拉',job:'alg',lv:2,power:1.08,diff:'普通',col:'#8fe0ff',rate:'新手勝率約 32%',
  d:'萬用卡多，序列重置後連擊拉得長。',
  deck:['knife','dagger','blank','blank','clock','candle','wand','wand','whip','imelda']},
 {k:'geo',n:'幾何劍士 阿基',job:'geo',lv:2,power:1.14,diff:'困難',col:'#ff9a5a',rate:'新手勝率約 26%',
  d:'費用曲線完整、打點穩定，長回合越打越痛。',
  deck:['knife','dagger','blank','wand','garlic','whip','imelda','pebble','water','guard']},
 {k:'num',n:'數論僧侶 費因',job:'num',lv:3,power:1.22,diff:'高手',col:'#8fe86a',rate:'新手勝率約 18%',
  d:'專精 2、3 費質數卡，單張傷害極高。',
  deck:['knife','dagger','blank','clock','wand','whip','whip','water','imelda','axe']},
 {k:'euler',n:'歐拉的影子',job:'alg',lv:9,power:1.4,diff:'傳說',col:'#ffb347',rate:'新手勝率約 12%',
  d:'持有數學家傳說卡，連擊滾起來很難擋。',
  deck:['knife','dagger','blank','clock','eulerC','gaussC','pythaC','whip','cross','imelda']},
];

/* 讓 AI 的出牌過程「看得見」—— 練習時能學到對手怎麼組連擊 */
function simDeckTurnVerbose(deckIds,job,mana,handSize){
  const pool=deckIds.map(id=>({id,c:CARDS[id]})).filter(x=>x.c);
  if(!pool.length) return {dmg:8,chain:1,log:[]};
  const draw=shuffle(pool.slice());
  let hand=draw.splice(0,handSize||5);
  let m=mana||5, step=0, chain=0, dmg=0, guard=0, played=0;
  const log=[];
  while(guard++<40){
    const ok=hand.filter(x=>(x.c.wild||x.c.c===step)&&x.c.c<=m);
    if(!ok.length)break;
    const x=ok.sort((a,b)=>(b.c.dmg||0)-(a.c.dmg||0))[0];
    hand.splice(hand.indexOf(x),1);
    const c=x.c;
    m-=c.c; chain++; played++;
    const mul=1+0.35*Math.max(0,chain-1);
    let d=(c.dmg||0)*(c.hits||1)*mul;
    if(job==='geo'&&played>=3) d*=1.25;
    if(job==='num'&&(c.c===2||c.c===3)) d*=1.5;
    if(job==='stat'&&chain>=5) d*=1.2;
    if(c.sp==='gauss') d=5*played*(played+1)/2*mul;
    dmg+=d;
    log.push({n:c.n,c:c.wild?'✦'+c.c:c.c,chain});
    step=c.wild?0:c.c+1;
    if(c.draw){ for(let i=0;i<c.draw&&draw.length;i++) hand.push(draw.pop()); }
  }
  return {dmg:Math.max(4,Math.round(dmg*0.55)),chain,log};
}
function scaledAiTurn(a){
  const r=simDeckTurnVerbose(a.deck,a.job,5+Math.floor(a.lv/3),5),scale=Math.max(1,Number(a.power)||1)*Math.max(1,Number(a.npcScale)||1);
  r.dmg=Math.max(4,Math.round(r.dmg*scale));return r;
}

function aiScreen(){
  const rows=AI_FOES.map(a=>{
    const J=JOBS[a.job];
    const curve={};
    a.deck.forEach(id=>{const c=CARDS[id];if(c){const k=c.wild?'✦'+c.c:c.c;curve[k]=(curve[k]||0)+1;}});
    const cs=Object.keys(curve).sort().map(k=>k+'費×'+curve[k]).join(' ');
    return `<div class="jobrow" data-a="${a.k}" style="border-color:${a.col}">
      <div class="jic" style="background:${a.col}22;color:${a.col}">${J.ic}</div>
      <div class="jinfo">
        <div class="jn" style="color:${a.col}">${a.n}
          <span class="jvol">${a.diff}　Lv.${a.lv}　${a.rate}</span></div>
        <div class="jd">${a.d}</div>
        <div class="jp">費用曲線：${cs.replace('✦費','萬用')}</div>
      </div></div>`;
  }).join('');
  overlay(`<div class="kicker">AI PRACTICE</div><h1>🤖 對戰練習</h1>
    <div class="rank">不需連線 · 不奪卡 · 輸了不扣牌</div>
    <div class="desc" style="margin-bottom:6px">
      選一個對手熟悉即時對戰的節奏。<br>
      <b>對手每回合都會公開出牌過程</b> —— 看它怎麼接序列、怎麼用萬用卡重置，
      是最快的學習方式。<br>
      練習賽和真人對戰規則完全相同（你先攻，對手是後手有補償卡）。</div>
    <div id="joblist">${rows}</div>
    <button class="go" id="aiBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>`,
    null,el=>{
      if(el.id==='aiBack'){ setTimeout(introScreen,10); return true; }
      const row=el.closest('.jobrow'); if(!row)return false;
      const a=AI_FOES.find(x=>x.k===row.dataset.a);
      setTimeout(()=>startAIDuel(a),10);
      return true;
    });
}
function startAIDuel(a){
  running=false;
  clearInterval(rTimer);
  const scale=Math.max(1,Number(a.power)||1)*Math.max(1,Number(a.npcScale)||1),hp=Math.round((68+a.lv*12)*1.08*scale);
  const foe={n:a.n,art:'duel',job:a.job,hp,max:hp,atk:Math.round(10*scale),burn:0,shield:0,
    dead:false,fresh:true,uid:'aiFoe',squad:-1,row:0,act:'atk',intent:0,
    fracNum:0,fracDen:1,deck:a.deck};
  B={foes:[foe],draw:freshBattleDraw(),disc:[],hand:[],
     step:0,mana:S.mana,chain:0,nextMul:1,block:0,best:0,over:false,waves:1,target:0,
     open:'normal',skipEnemy:0,firstTurn:true,delta:1,trait:null,
     cur:[],bestArr:[],chains:[],ults:{},played:0,lastCosts:[],
     pvp:{uid:null,name:a.n,job:a.job,deck:a.deck,lv:a.lv,practice:true,ai:a},
     myHp:60+S.lv*10,myMax:60+S.lv*10};
  foe.intent=scaledAiTurn(a).dmg;
  $('flashFx').classList.remove('go');void $('flashFx').offsetWidth;$('flashFx').classList.add('go');
  $('dungeon').classList.add('hide');
  const bt=$('battle');
  bt.classList.remove('hide');bt.classList.remove('enter');void bt.offsetWidth;bt.classList.add('enter');
  $('veil').classList.add('hide');
  drawFieldBg();
  toast('練習賽開始 — 對手：'+a.n,2000);
  newTurn();
  aiBar('你的回合');
}
/* 練習賽的頂端提示列 */
function aiBar(txt,logHtml){
  const el=$('rList'); if(!el)return;
  $('rTick').textContent='練習賽';
  el.innerHTML=`<span class="rItem">${txt}</span>`+(logHtml||'');

}
/* AI 回合：公開出牌過程 */
function aiTakeTurn(){
  if(!B||B.over||!B.pvp||!B.pvp.practice)return;
  const a=B.pvp.ai;
  const r=scaledAiTurn(a);
  const seq=r.log.map(x=>`<span class="ailog">${x.n}<i>${x.c}</i></span>`).join('<b>→</b>');
  aiBar(`${a.n} 出牌：${r.chain} 連擊，造成 <b>${r.dmg}</b> 傷害`,
    `<div class="ailogrow">${seq||'（無法出牌）'}</div>`);
  const net=Math.max(0,r.dmg-B.block-S.armor);
  const ab=Math.min(B.block,r.dmg);
  if(ab) popPlayer('🛡 -'+ab,'shield',0);
  if(net){ B.myHp-=net; popPlayer('-'+net,'hurt',ab?150:0); flash(); shake(); }
  else if(ab) toast('護盾完全擋下！',1200);
  B.block=Math.max(0,B.block-r.dmg);
  const el=document.getElementById('aiFoe');
  if(el){ el.classList.remove('attack'); void el.offsetWidth; el.classList.add('attack'); }
  B.foes[0].intent=scaledAiTurn(a).dmg;
  if(B.myHp<=0){ B.myHp=0; setTimeout(()=>practiceEnd(false),600); return; }
  newTurn();
  setTimeout(()=>aiBar('你的回合 — 出完牌按「結束回合」',
    `<div class="ailogrow">上一回合 ${a.n} 打了 ${r.chain} 連擊</div>`),1200);
}
function practiceEnd(win){
  B.over=true;
  const a=B.pvp.ai;
  if(B.pvp.stake){ rivalEnd(win); return; }   // 賭注戰 → 奪卡／失卡並讓對手離場
  clearBattleTemporaryState();
  overlay(`<div class="kicker">PRACTICE ${win?'WON':'LOST'}</div>
    <h1 style="color:${win?'#8fe86a':'#ff6a6a'};text-shadow:0 3px 0 ${win?'#14400a':'#4a0808'}">
      ${win?'擊敗 '+a.n+'！':'敗給 '+a.n}</h1>
    <div class="rank" style="color:${a.col};border-color:${a.col}">練習賽 · 沒有任何損失</div>
    <div class="desc">你的最長連擊：<b>${B.best}</b><br>
      ${win?'試試更高難度的對手吧。':'觀察對手的出牌順序，想想他怎麼把序列接下去的。'}</div>
    <button class="go" id="ok">再來一場</button>`,()=>{ startAIDuel(a); });
}

/* ═══════════════════ 即時遭遇戰（雙方都在線）═══════════════════
   協定：一個 duel 節點承載整場對戰，雙方輪流寫入。
     duels/{id}/ { a,b, names, jobs, lvs, decks, hpA, hpB, turn, state, log, winner, steal, ts }
   狀態機： invite → active → done
   為什麼要有 turn 欄位：兩邊都在寫同一個節點，用「輪到誰」當鎖，
   避免同時出手造成傷害重複計算。
   逾時保護：對方 90 秒沒動作，可判定勝利（課堂上一定有人中途離開）。 */
let DUEL=null;
const DUEL_TIMEOUT=90000;
const duelPath=id=>'rooms/'+FB.room+'/duels/'+id;

/* 監聽別人送來的挑戰 */
function duelWatchIncoming(){
  if(!FB.ready||!FB.room)return;
  const r=FB.db.ref('rooms/'+FB.room+'/duels');
  const h=r.on('value',snap=>{
    const v=snap.val()||{};
    if(DUEL) return;
    for(const id in v){
      const d=v[id];
      if(!d||d.b!==FB.uid||d.state!=='invite')continue;
      if(Date.now()-(d.ts||0)>30000){ try{ r.child(id).remove(); }catch(e){} continue; }
      duelInvitePrompt(id,d);
      break;
    }
  });
  FB.unsub.push(()=>r.off('value',h));
}
function duelInvitePrompt(id,d){
  running=false;
  const J=JOBS[d.jobA]||JOBS.geo;
  overlay(`<div class="kicker">CHALLENGE</div><h1>收到挑戰！</h1>
    <div class="rank" style="color:${J.col};border-color:${J.col}">
      ${J.ic} ${d.nameA}　${J.n} Lv.${d.lvA||1}</div>
    <div class="desc">對方在迷宮中撞見了你，要求決鬥。<br>
      <b>贏的人隨機奪走對方一張卡牌。</b>輸的人重傷但不會死。<br>
      你是後手：會拿到一張一次性的<b>「補償法力」卡</b>（+3 法力、可重置序列），
      並有少量血量加成。用在關鍵回合能一口氣把連擊拉長。</div>
    <button class="go" id="dAccept">接受挑戰</button>
    <button class="go" id="dDecline" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">拒絕</button>`,
    null,el=>{
      if(el.id==='dDecline'){
        try{ FB.db.ref(duelPath(id)).update({state:'declined'}); }catch(e){}
        backToDungeon(); return true;
      }
      if(el.id!=='dAccept')return false;
      try{
        FB.db.ref(duelPath(id)).update({state:'active',turn:'a',ts:Date.now(),
          deckB:S.deck.map(o=>o.id)});
      }catch(e){}
      duelBind(id,'b',d);
      return true;
    });
}
/* 發起挑戰 */
function duelCreate(uid,o){
  const id='d'+Date.now().toString(36)+rand(999);
  const myHp=Math.round(60+S.lv*10);
  // 後手補償改以「補償法力卡」為主，血量只微調 +5%
  // （模擬 2 萬場：無補償先攻勝率 60.1%，補償卡+5% 血量 → 52.7%）
  const oppHp=Math.round((60+(o.lv||1)*10)*1.05);
  const node={a:FB.uid,b:uid,nameA:S.name||'挑戰者',nameB:o.name||'對手',
    jobA:S.job||'geo',jobB:o.job||'geo',lvA:S.lv,lvB:o.lv||1,
    hpA:myHp,hpB:oppHp,maxA:myHp,maxB:oppHp,
    deckA:S.deck.map(x=>x.id),deckB:o.deck||[],
    turn:'a',state:'invite',ts:Date.now(),log:''};
  try{ FB.db.ref(duelPath(id)).set(node); }catch(e){ toast('無法建立對戰',1500); return; }
  running=false;
  overlay(`<div class="kicker">WAITING</div><h1>等待對方回應…</h1>
    <div class="rank">已向 ${o.name} 送出挑戰</div>
    <div class="desc">對方需要按下「接受挑戰」。<br>30 秒沒有回應就會自動取消。</div>
    <button class="go" id="dCancel" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">取消</button>`,
    null,el=>{
      if(el.id!=='dCancel')return false;
      try{ FB.db.ref(duelPath(id)).remove(); }catch(e){}
      backToDungeon(); return true;
    });
  // 等待對方接受
  const r=FB.db.ref(duelPath(id));
  const h=r.on('value',snap=>{
    const d=snap.val(); if(!d)return;
    if(d.state==='declined'){ r.off('value',h); toast(o.name+' 拒絕了挑戰',1800); backToDungeon(); return; }
    if(d.state==='active'){ r.off('value',h); duelBind(id,'a',d); }
  });
  setTimeout(()=>{
    if(DUEL)return;
    try{ r.off('value',h); r.remove(); }catch(e){}
    if(!DUEL){ toast('對方沒有回應',1600); backToDungeon(); }
  },30000);
}
/* 綁定對戰節點，開始即時對打 */
function duelBind(id,side,d){
  const oppSide=side==='a'?'b':'a';
  DUEL={id,side,oppSide,ref:FB.db.ref(duelPath(id)),
    oppName:side==='a'?d.nameB:d.nameA, oppJob:side==='a'?d.jobB:d.jobA,
    oppLv:(side==='a'?d.lvB:d.lvA)||1, oppDeck:(side==='a'?d.deckB:d.deckA)||[],
    myDmg:0, waiting:false, lastTs:Date.now(), done:false};
  clearInterval(rTimer);
  const oppHp=side==='a'?d.hpB:d.hpA, oppMax=side==='a'?d.maxB:d.maxA;
  const J=JOBS[DUEL.oppJob]||JOBS.geo;
  const foe={n:DUEL.oppName,art:'duel',job:DUEL.oppJob,hp:oppHp,max:oppMax,
    atk:10,burn:0,shield:0,dead:false,fresh:true,uid:'duelFoe',squad:-1,row:0,
    act:'atk',intent:0,fracNum:0,fracDen:1};
  B={foes:[foe],draw:freshBattleDraw(),disc:[],hand:[],
     step:0,mana:S.mana,chain:0,nextMul:1,block:0,best:0,over:false,waves:1,target:0,
     open:'normal',skipEnemy:0,firstTurn:true,delta:1,trait:null,
     cur:[],bestArr:[],chains:[],ults:{},played:0,lastCosts:[],
     live:true,myHp:side==='a'?d.hpA:d.hpB,myMax:side==='a'?d.maxA:d.maxB};
  $('flashFx').classList.remove('go');void $('flashFx').offsetWidth;$('flashFx').classList.add('go');
  $('dungeon').classList.add('hide');
  const bt=$('battle');
  bt.classList.remove('hide');bt.classList.remove('enter');void bt.offsetWidth;bt.classList.add('enter');
  $('veil').classList.add('hide');
  drawFieldBg();
  toast('即時對戰開始！'+(d.turn===side?'你先攻':'對方先攻'),2200);

  const h=DUEL.ref.on('value',snap=>{
    const n=snap.val();
    if(!n||DUEL.done)return;
    // 同步血量
    const myHp=side==='a'?n.hpA:n.hpB;
    const opHp=side==='a'?n.hpB:n.hpA;
    // 對手打過來時要看得到數字，不能只有數值默默變動
    if(typeof B.myHp==='number' && myHp<B.myHp){
      const d=B.myHp-myHp;
      popPlayer('-'+d,'hurt',0);
      flash(); shake();
      toast(DUEL.oppName+' 造成 '+d+' 傷害',1600);
    }
    B.myHp=myHp; foe.hp=Math.max(0,opHp);
    if(n.winner){ duelFinish(n); return; }
    if(myHp<=0||opHp<=0){ duelDecide(n); return; }
    DUEL.waiting = n.turn!==side;
    DUEL.lastTs = n.ts||DUEL.lastTs;
    if(!DUEL.waiting && B.hand.length===0 && !B.over) newTurn();
    renderAll(); duelBar();
  });
  FB.unsub.push(()=>DUEL&&DUEL.ref.off('value',h));
  if(side==='b') B.coinPending=true;      // 後手補償
  if(d.turn===side) newTurn(); else { DUEL.waiting=true; renderAll(); }
  duelBar();
  DUEL.timer=setInterval(duelBar,1000);   // 僅 PvP 需要逾時保護
}
/* 頂端狀態列：換誰、剩多久 */
function duelBar(){
  if(!DUEL||DUEL.done)return;
  const el=$('rList'); if(!el)return;
  const wait=Math.max(0,Math.round((DUEL_TIMEOUT-(Date.now()-DUEL.lastTs))/1000));
  $('rTick').textContent=DUEL.waiting?'對方回合':'你的回合';
  el.innerHTML = DUEL.waiting
    ? `<span class="rItem near">等待 ${DUEL.oppName} 出牌…${wait} 秒後可判定勝利</span>`
      + (wait<=0?'<span class="rItem" id="dClaim">⚑ 判定我方勝利</span>':'')
    : `<span class="rItem">你的回合 — 出完牌按「結束回合」把傷害送出</span>`;

}
/* 結束回合：把本回合傷害寫進資料庫並交棒 */
function duelSendTurn(){
  if(!DUEL||DUEL.done)return;
  const dmg=DUEL.myDmg; DUEL.myDmg=0;
  const oppHpKey=DUEL.side==='a'?'hpB':'hpA';
  DUEL.ref.child(oppHpKey).transaction(v=>Math.max(0,(v||0)-dmg))
    .then(()=>{
      DUEL.ref.update({turn:DUEL.oppSide,ts:Date.now(),
        log:(S.name||'我')+' 造成 '+dmg+' 傷害'});
    }).catch(()=>toast('傳送失敗，請檢查連線',1800));
  DUEL.waiting=true; renderAll(); duelBar();
}
/* 血量歸零 → 用 transaction 搶著寫 winner，確保只有一個結果 */
function duelDecide(n){
  const iWin = (DUEL.side==='a') ? (n.hpB<=0) : (n.hpA<=0);
  const loserDeck = iWin ? (DUEL.side==='a'?n.deckB:n.deckA) : null;
  DUEL.ref.child('winner').transaction(v=>{
    if(v) return;                       // 已經有人寫了就不覆蓋
    return iWin?FB.uid:(DUEL.side==='a'?n.b:n.a);
  }).then(res=>{
    const winner=res.snapshot.val();
    if(iWin && winner===FB.uid && loserDeck && loserDeck.length){
      const pool=loserDeck.filter(id=>CARDS[id]&&!CARDS[id].CURSE);
      if(pool.length) DUEL.ref.child('steal').set(pool[rand(pool.length)]);
    }
  }).catch(()=>{});
}
/* 收尾：勝方加卡、敗方扣卡 */
function duelFinish(n){
  if(DUEL.done)return;
  DUEL.done=true;
  clearInterval(DUEL.timer);
  const iWin=n.winner===FB.uid;
  const steal=n.steal;
  try{ DUEL.ref.update({state:'done'}); }catch(e){}
  setTimeout(()=>{ try{ DUEL.ref.remove(); }catch(e){} },8000);
  if(iWin){
    let c=null;
    if(steal&&CARDS[steal]){ c=CARDS[steal]; }
    const R=c?RARITY[c.r||'C']:null;
    overlay(`<div class="kicker">DUEL WON</div><h1>擊敗 ${DUEL.oppName}！</h1>
      ${c?`<div class="rank" style="color:${R.col};border-color:${R.col}">奪取 ${R.n}卡：${c.n}</div>
        <div class="desc">${c.t.replace(/<\/?[a-z]+>/g,'')}<br>已加入你的牌組。</div>`
        :'<div class="desc">沒有可奪取的卡牌。</div>'}
      <button class="go" id="ok">${c?'決定這張卡':'繼續探索'}</button>`,
      ()=>{ if(c&&steal) offerCard(steal,duelExit); else duelExit(); });
  }else{
    let lost=null;
    if(steal){
      const idx=S.deck.findIndex((o,i)=>o.id===steal&&canRemoveDeckIndex(i));
      if(idx>=0) lost=S.deck.splice(idx,1)[0];
    }
    S.hp=Math.max(1,Math.round(S.maxhp*0.3));
    overlay(`<div class="kicker">DUEL LOST</div>
      <h1 style="color:#ff6a6a;text-shadow:0 3px 0 #4a0808">敗給 ${DUEL.oppName}</h1>
      <div class="rank" style="color:#ff6a6a;border-color:#ff6a6a">
        ${lost?'失去卡牌：'+CARDS[lost.id].n:'牌組過少，未失去卡牌'}</div>
      <div class="desc">你重傷倒地，生命剩下 <b>${S.hp}</b>。</div>
      <button class="go" id="ok">繼續探索</button>`,duelExit);
  }
}
function duelExit(){
  if(DUEL){ clearInterval(DUEL.timer); try{DUEL.ref.off();}catch(e){} }
  DUEL=null;
  saveChar(); fbPushDeck(); backToDungeon();
}
/* 逾時判定 */
function duelClaim(){
  if(!DUEL||DUEL.done)return;
  const key=DUEL.side==='a'?'hpB':'hpA';
  DUEL.ref.child(key).set(0);
  DUEL.ref.child('winner').transaction(v=>v||FB.uid).then(()=>{
    DUEL.ref.child('steal').set(null);
    toast('對方逾時未行動，判定你獲勝',2000);
  });
}

/* ═══════════════════ 迷宮遭遇戰（PvP · 離線備援）═══════════════════
   走到同學所在的格子就開戰。贏家隨機奪走對方一張卡牌。

   設計取捨：不採用「雙方即時輪流出牌」，因為那需要兩人同時在線並保持連線，
   課堂上一定會有人分心或斷線，整場就卡住。
   改用【牌組快照對戰】：你和對方上傳的牌組即時對打（由其牌組驅動），
   結果寫回資料庫，對方下次同步時才收到通知。
   → 對方離線也能挑戰、不會卡關、結果可收斂。 */
let duelCD={};                       // 對同一個人的冷卻時間
const DUEL_CD=120000;   // 對同一人 2 分鐘內只能挑戰一次，避免刷卡

/* 依牌組模擬對手一回合能打出多少傷害 */
function simDeckTurn(deckIds,job,mana,handSize){
  const pool=deckIds.map(id=>CARDS[id]).filter(Boolean);
  if(!pool.length) return {dmg:8,chain:1};
  const draw=shuffle(pool.slice());
  let hand=draw.splice(0,handSize||5);
  let m=mana||5, step=0, chain=0, dmg=0, guard=0, played=0;
  while(guard++<40){
    const legalC=hand.filter(c=>(c.wild||c.c===step)&&c.c<=m);
    if(!legalC.length) break;
    const c=legalC.sort((a,b)=>(b.dmg||0)-(a.dmg||0))[0];
    hand.splice(hand.indexOf(c),1);
    m-=c.c; chain++; played++;
    const mul=1+0.35*Math.max(0,chain-1);
    let d=(c.dmg||0)*(c.hits||1)*mul;
    if(job==='geo'&&played>=3) d*=1.25;
    if(job==='num'&&(c.c===2||c.c===3)) d*=1.5;
    if(job==='stat'&&chain>=5) d*=1.2;
    dmg+=d;
    step=c.wild?0:c.c+1;
    if(c.draw){ for(let i=0;i<c.draw&&draw.length;i++) hand.push(draw.pop()); }
  }
  return {dmg:Math.max(4,Math.round(dmg*0.55)),chain};   // 0.55：對人傷害折減，避免秒殺
}

/* 開始遭遇戰 */
function startDuel(opp){
  running=false;
  clearInterval(rTimer);                       // 對戰中沒有援軍
  const oppLv=opp.lv||1;
  // 防守方血量 +12%：抵銷「走過去撞人」的先攻優勢
  // （模擬 2 萬場：不加成時挑戰者勝率 60.5%，+12% 後約 50%）
  const hp=Math.round((60+oppLv*10)*1.12);
  const J=JOBS[opp.job]||JOBS.geo;
  const foe={n:opp.name||'挑戰者',art:'duel',job:opp.job,uid:opp.uid,
    hp,max:hp,atk:10,burn:0,shield:0,dead:false,fresh:true,
    uid_:'duel1',squad:-1,row:0,act:'atk',intent:0,
    fracNum:0,fracDen:1,deck:opp.deck||[]};
  foe.uid=foe.uid_;                            // 渲染用 id
  B={foes:[foe],draw:freshBattleDraw(),disc:[],hand:[],
     step:0,mana:S.mana,chain:0,nextMul:1,block:0,best:0,over:false,waves:1,target:0,
     open:'normal',skipEnemy:0,firstTurn:true,delta:1,trait:null,
     cur:[],bestArr:[],chains:[],ults:{},played:0,lastCosts:[],
     pvp:{uid:opp.uid,name:opp.name,job:opp.job,deck:opp.deck||[],lv:oppLv}};
  foe.intent=simDeckTurn(foe.deck,foe.job,5+Math.floor(oppLv/3),5).dmg;
  $('flashFx').classList.remove('go');void $('flashFx').offsetWidth;$('flashFx').classList.add('go');
  $('dungeon').classList.add('hide');
  const bt=$('battle');
  bt.classList.remove('hide');bt.classList.remove('enter');void bt.offsetWidth;bt.classList.add('enter');
  $('veil').classList.add('hide');
  drawFieldBg();
  toast('遭遇戰！'+foe.n+'（'+J.n+' Lv.'+oppLv+'）',2200);
  newTurn();
}
/* 遭遇戰的勝利處理：奪取一張卡 */
function duelWin(){
  B.over=true; clearInterval(rTimer);
  const O=B.pvp;
  clearBattleTemporaryState();
  const stealable=(O.deck||[]).filter(id=>CARDS[id]&&!CARDS[id].CURSE);
  let got=null;
  if(stealable.length){
    got=stealable[rand(stealable.length)];
    fbReportSteal(O.uid,got);
  }
  const c=got?CARDS[got]:null;
  const R=c?RARITY[c.r||'C']:null;
  overlay(`<div class="kicker">DUEL WON</div><h1>擊敗 ${O.name}！</h1>
    ${c?`<div class="rank" style="color:${R.col};border-color:${R.col}">奪取 ${R.n}卡：${c.n}</div>
      <div class="desc">${c.t.replace(/<\/?[a-z]+>/g,'')}<br>已加入你的牌組。</div>`
      :'<div class="desc">對方牌組是空的，沒有可奪取的卡牌。</div>'}
    <button class="go" id="ok">${got?'決定這張卡':'繼續探索'}</button>`,
    ()=>{ saveChar(); if(got) offerCard(got); else backToDungeon(); });
}
function duelLose(){
  B.over=true; clearInterval(rTimer);
  const O=B.pvp;
  clearBattleTemporaryState();
  let lost=null;
  const removable=removableDeckIndexes().filter(i=>!CARDS[S.deck[i].id].CURSE);
  if(removable.length){const idx=removable[rand(removable.length)];lost=S.deck.splice(idx,1)[0];}
  S.hp=Math.max(1,Math.round(S.maxhp*0.3));   // 敗戰不死，但重傷
  overlay(`<div class="kicker">DUEL LOST</div>
    <h1 style="color:#ff6a6a;text-shadow:0 3px 0 #4a0808">敗給 ${O.name}</h1>
    <div class="rank" style="color:#ff6a6a;border-color:#ff6a6a">
      ${lost?'失去卡牌：'+CARDS[lost.id].n:'牌組過少，未失去卡牌'}</div>
    <div class="desc">你重傷倒地，生命剩下 <b>${S.hp}</b>。<br>
      養好牌組再來挑戰吧 —— 對方的牌組會隨他的進度成長。</div>
    <button class="go" id="ok">繼續探索</button>`,()=>{ saveChar(); backToDungeon(); });
}
/* 把奪取結果寫給對方（對方下次上線才套用）*/
function fbReportSteal(uid,cardId){
  if(!FB.ready||!FB.room||!uid)return;
  try{
    FB.db.ref('rooms/'+FB.room+'/players/'+uid+'/lost/'+Date.now())
      .set({card:cardId,by:S.name||'某人'});
  }catch(e){}
}
/* 監聽自己被奪取的通知 */
function fbWatchLost(){
  if(!FB.ready||!FB.room)return;
  const r=FB.db.ref('rooms/'+FB.room+'/players/'+FB.uid+'/lost');
  const h=r.on('value',snap=>{
    const v=snap.val(); if(!v)return;
    for(const k in v){
      const rec=v[k];
      const idx=S.deck.findIndex((o,i)=>o.id===rec.card&&canRemoveDeckIndex(i));
      if(idx>=0){
        S.deck.splice(idx,1);
        toast('你的「'+(CARDS[rec.card]?CARDS[rec.card].n:rec.card)+'」被 '+rec.by+' 奪走了！',2600);
      }else if(S.deck.some(o=>o.id===rec.card)){
        toast('核心費用卡受到保護，沒有被奪走。',2200);
      }
      try{ r.child(k).remove(); }catch(e){}
    }
    fbPushDeck(); saveChar();
  });
  FB.unsub.push(()=>r.off('value',h));
}
/* 上傳牌組快照（供他人挑戰）*/
function fbPushDeck(){
  if(!FB.ready||!FB.room)return;
  try{ myRef().update({deck:S.deck.map(o=>o.id),lv:S.lv}); }catch(e){}
}
/* 走到同學身上 → 詢問是否開戰 */
function checkEncounter(){
  if(!FB.ready||!FB.room)return false;
  const now=Date.now();
  for(const uid in FB.others){
    const o=FB.others[uid];
    if(!o||o.floor!==fl||o.inBattle) continue;
    if(o.x!==P.x||o.y!==P.y) continue;                 // 同一格才觸發
    if(duelCD[uid]&&now-duelCD[uid]<DUEL_CD) continue; // 冷卻中
    duelCD[uid]=now;
    const J=JOBS[o.job]||JOBS.geo;
    running=false;
    overlay(`<div class="kicker">ENCOUNTER</div><h1>迷宮遭遇</h1>
      <div class="rank" style="color:${J.col};border-color:${J.col}">
        ${J.ic} ${o.name}　${J.n} Lv.${o.lv||1}</div>
      <div class="desc">你在迷宮中撞見了同學。<br>
        <b>即時對戰</b>：雙方輪流出牌，對方必須<b>接受挑戰</b>才會開始。<br>
        贏的人隨機奪走對方一張卡牌，輸的人重傷但不會死。<br>
        你先攻；對方是後手，會拿到一張<b>一次性的「補償法力」卡</b>（+3 法力）
        並有少量血量加成 —— 大致公平。</div>
      <button class="go" id="duelGo">開戰</button>
      <button class="go" id="duelNo" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">擦身而過</button>`,
      null,el=>{
        if(el.id==='duelNo'){ backToDungeon(); return true; }
        if(el.id!=='duelGo') return false;
        setTimeout(()=>duelCreate(uid,o),10);
        return true;
      });
    return true;
  }
  return false;
}

/* ═══════════════ 一次性戰術卡：稀有、有限、要省著用 ═══════════════
   寶箱以金幣與消耗品為主；永久牌主要由戰後升級取得，避免牌組膨脹。 */
const POTIONS={
  heal:{n:'治療藥水',ic:'🧪',col:'#8fe86a',v:30,d:'回復 30 生命'},
  elixir:{n:'賢者之石',ic:'💎',col:'#e26bd6',v:999,d:'完全回復生命'},
  freeze:{n:'冰封卷軸',ic:'❄️',col:'#8fd0ff',battle:1,d:'凍結全體敵人，使其跳過一次行動'},
  firebomb:{n:'燃燒彈',ic:'💣',col:'#ff8a5a',battle:1,d:'全體爆炸傷害並附加灼燒'},
  luck:{n:'幸運星',ic:'🍀',col:'#ffe38a',battle:1,d:'接下來 3 張攻擊卡幸運增傷，下一個寶箱提升品質'},
  medkit:{n:'應急藥包',ic:'🩹',col:'#8fe86a',v:45,d:'緊急回復 45 生命'},
};
function normalizePot(p){return Object.assign({heal:0,elixir:0,freeze:0,firebomb:0,luck:0,medkit:0},p||{});}
function potCount(){ S.pot=normalizePot(S.pot);return Object.keys(POTIONS).reduce((n,k)=>n+(S.pot[k]||0),0); }
function usePotion(k){
  const P0=POTIONS[k];
  S.pot=normalizePot(S.pot);
  if(!P0||!(S.pot[k]>0)) return false;
  if(P0.battle&&(!B||B.over)){toast(P0.n+'只能在戰鬥中使用',1400);return false;}
  if(P0.v&&S.hp>=S.maxhp){ toast('生命已滿，先留著吧',1300); return false; }
  S.pot[k]--;
  if(P0.v){
    const h=Math.min(P0.v,S.maxhp-S.hp);S.hp+=h;popPlayer('+'+h+' ♥','heal',0);
    toast(P0.ic+' '+P0.n+'：回復 '+h+' 生命（剩 '+S.pot[k]+'）',1800);
  }else if(k==='freeze'){
    for(const f of B.foes){if(f.dead)continue;f.frozen=Math.max(1,f.frozen||0);const el=document.getElementById(f.uid);if(el){el.style.filter='hue-rotate(160deg) brightness(1.45)';setTimeout(()=>el.style.filter='',700);}}
    toast('❄️ 冰封卷軸：全體敵人凍結一回合！',1900);
  }else if(k==='firebomb'){
    let total=0;const dmg=10+Math.max(0,Number(S.zone)||0)*2;
    for(const f of B.foes){if(f.dead)continue;f.hp-=dmg;f.burn=(f.burn||0)+5;total+=dmg;popDmg(f,dmg,true,'💥 ');if(f.hp<=0){f.hp=0;f.dead=true;}}
    if(total)creditDamage(total);flash();toast('💣 燃燒彈：全體爆炸並附加灼燒！',1900);
  }else if(k==='luck'){
    B.luckHits=Math.max(3,B.luckHits||0);S.luckChest=Math.max(1,S.luckChest||0);
    toast('🍀 幸運星：3 張攻擊增傷，下一個寶箱品質提升！',2100);
  }
  if(typeof renderAll==='function'&&B&&!B.over) renderAll();
  if(B&&B.foes.every(f=>f.dead))queueBattleVictory();
  updBar();saveChar();
  return true;
}
function potionScreen(fromBattle){
  const rows=Object.keys(POTIONS).map(k=>{
    const P0=POTIONS[k], n=S.pot[k]||0;
    return `<div class="uprow${n?'':' poor'}" data-p="${k}">
      <div class="ui"><div class="un">${P0.ic} ${P0.n}　<span class="ulv">×${n}</span></div>
        <div class="ud">${P0.d}</div></div>
      <div class="uc">${n?(P0.battle&&!fromBattle?'戰鬥用':'使用'):'—'}</div></div>`;
  }).join('');
  overlay(`<div class="kicker">ITEMS</div><h1>一次性戰術卡</h1>
    <div class="rank">生命 ${S.hp} / ${S.maxhp}</div>
    <div class="desc" style="margin-bottom:6px">
      從寶箱取得的道具都是<b>一次性</b>；冰封、燃燒彈與幸運星只能在戰鬥中使用。<br>
      永久新卡主要改由<b>戰後升級三選一</b>取得，牌組比較不會失控。</div>
    <div id="uplist">${rows}</div>
    <button class="go" id="potBack">${fromBattle?'返回戰鬥':'關閉'}</button>`,
    null,el=>{
      if(el.id==='potBack'){
        if(fromBattle) $('veil').classList.add('hide');
        else backToDungeon();
        return true;
      }
      const row=el.closest('.uprow'); if(!row)return false;
      const k=row.dataset.p;
      if(!(S.pot[k]>0)){ toast('沒有這個道具了',1200); return false; }
      if(usePotion(k)){
        if(fromBattle) $('veil').classList.add('hide');
        else setTimeout(()=>potionScreen(false),10);
      }
      return true;
    });
}

/* ═══════════════════ Firebase 連線多人 ═══════════════════
   設計重點：本遊戲是回合制，玩家「走一步」才寫入一次 →
   單人每分鐘約 10~30 次寫入，免費方案（Spark）完全撐得住。

   資料結構：
     rooms/{code}/meta            房間資訊（樓層、建立時間）
     rooms/{code}/players/{uid}   每位學生：位置、職業、血量、統計
     rooms/{code}/world/{floor}/  共享世界：已開寶箱、已消滅的隊伍、門是否解鎖
*/
let FB={app:null,db:null,ready:false,room:'',uid:'',cfg:null,
        others:{},unsub:[],lastPush:0,err:''};

/* 把貼上的 firebaseConfig（JS 物件字面值）轉成合法 JSON */
function parseFbConfig(txt){
  txt=(txt||'').trim();
  if(!txt) throw new Error('沒有內容');
  const m=txt.match(/\{[\s\S]*\}/);
  if(!m) throw new Error('找不到設定物件（應該是一組大括號 { … }）');
  // 注意：不能直接用正規表示式去行註解 —— databaseURL 裡的 https:// 會被誤殺。
  // 改成逐字元掃描，字串內的內容一律保留。
  let body='', inStr=false, q='';
  const src=m[0];
  for(let i=0;i<src.length;i++){
    const ch=src[i], nx=src[i+1];
    if(inStr){
      body+=ch;
      if(ch==='\\\\'){ body+=nx; i++; continue; }
      if(ch===q){ inStr=false; if(q==="'") body=body.slice(0,-1)+'"'; }
      continue;
    }
    if(ch==='"'||ch==="'"){ inStr=true; q=ch; body+='"'; continue; }  // 統一成雙引號
    if(ch==='/'&&nx==='/'){ while(i<src.length&&src[i]!=='\n')i++; continue; }
    if(ch==='/'&&nx==='*'){ i+=2; while(i<src.length&&!(src[i]==='*'&&src[i+1]==='/'))i++; i++; continue; }
    body+=ch;
  }
  body=body
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g,'$1"$2":')   // 幫沒引號的鍵加引號
    .replace(/,(\s*[}\]])/g,'$1');                        // 去掉尾逗號
  let cfg;
  try{ cfg=JSON.parse(body); }
  catch(e){ throw new Error('格式解析失敗，請直接從 Firebase 主控台複製整段 firebaseConfig'); }
  if(!cfg.apiKey) throw new Error('缺少 apiKey');
  if(!cfg.databaseURL) throw new Error('缺少 databaseURL — 請確認已建立「Realtime Database」而非 Firestore');
  return cfg;
}
function loadScript(src){
  return new Promise((res,rej)=>{
    const el=document.createElement('script');
    el.src=src; el.onload=()=>res(); el.onerror=()=>rej(new Error('無法載入 Firebase SDK（請檢查網路）'));
    document.head.appendChild(el);
  });
}
async function fbConnect(cfg){
  if(!window.firebase){
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js');
  }
  if(!FB.app) FB.app=firebase.initializeApp(cfg);
  FB.db=firebase.database();
  FB.cfg=cfg; FB.ready=true;
  try{ localStorage.setItem('mathDungeonFB',JSON.stringify(cfg)); }catch(e){}
}
const roomCode=()=>{
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:4},()=>A[rand(A.length)]).join('');
};
const myRef=()=>FB.db.ref('rooms/'+FB.room+'/players/'+FB.uid);
const worldRef=()=>FB.db.ref('rooms/'+FB.room+'/world/'+fl);

/* 加入房間並開始同步 */
function fbJoin(code,cb){
  FB.room=code.toUpperCase();
  FB.uid='u'+Math.random().toString(36).slice(2,9);
  const me=myRef();
  me.set({name:S.name||'匿名',job:S.job||'geo',x:P.x,y:P.y,dir:P.dir,
    hp:S.hp,maxhp:S.maxhp,lv:S.lv,floor:fl,inBattle:0,
    dmg:0,chain:0,quizOk:0,quizTotal:0,ts:Date.now()});
  me.onDisconnect().remove();
  // 監聽其他玩家
  const pRef=FB.db.ref('rooms/'+FB.room+'/players');
  const h=pRef.on('value',snap=>{
    const v=snap.val()||{};
    FB.others={};
    for(const k in v) if(k!==FB.uid) FB.others[k]=v[k];
  },err=>{ FB.err=err.message; toast('連線錯誤：'+err.message,2600); });
  FB.unsub.push(()=>pRef.off('value',h));
  fbWatchWorld();
  fbWatchLost();
  duelWatchIncoming();
  fbPushDeck();
  cb&&cb();
}
/* 監聽共享世界狀態：誰開了寶箱、誰清掉了哪支隊伍 */
function fbWatchWorld(){
  if(!FB.ready||!FB.room)return;
  const wr=worldRef();
  const h=wr.on('value',snap=>{
    const w=snap.val()||{};
    if(w.props) for(const key in w.props){
      const [px,py]=key.split('_').map(Number);
      const pr=props.find(o=>o.x===px&&o.y===py);
      if(pr&&pr.alive&&pr.t!=='npc'&&pr.t!=='shrine'){ pr.alive=0; }
    }
    if(w.mobs) for(const id in w.mobs){
      const m=mobs.find(o=>o.id===+id);
      if(m&&m.alive) m.alive=0;
    }
    if(w.door&&!S.key){ S.key=true; updBar(); }
  },err=>{ FB.err=err.message; });
  FB.unsub.push(()=>wr.off('value',h));
}
/* 推送自己的位置（回合制：只有實際行動才寫入）*/
function fbPush(extra){
  if(!FB.ready||!FB.room)return;
  const now=Date.now();
  if(now-FB.lastPush<250 && !extra) return;   // 節流，避免動畫期間連寫
  FB.lastPush=now;
  const L=lead();
  try{
    myRef().update(Object.assign({
      name:S.name||'匿名',job:S.job||'geo',x:P.x,y:P.y,dir:P.dir,
      hp:S.hp,maxhp:S.maxhp,lv:S.lv,floor:fl,ts:now},extra||{}));
  }catch(e){}
}
function fbMarkProp(pr){
  if(!FB.ready||!FB.room)return;
  try{ worldRef().child('props/'+pr.x+'_'+pr.y).set(true); }catch(e){}
}
function fbMarkMobs(ids){
  if(!FB.ready||!FB.room)return;
  try{ const u={}; ids.forEach(i=>u['mobs/'+i]=true); worldRef().update(u); }catch(e){}
}
function fbMarkDoor(){
  if(!FB.ready||!FB.room)return;
  try{ worldRef().child('door').set(true); }catch(e){}
}
function fbLeave(){
  try{ if(FB.ready&&FB.room) myRef().remove(); }catch(e){}
  FB.unsub.forEach(f=>{try{f();}catch(e){}});
  FB.unsub=[]; FB.room=''; FB.others={};
}
const otherList=()=>Object.values(FB.others).filter(o=>o&&o.floor===fl);

/* ═══ 連線設定畫面 ═══ */
function netScreen(msg){
  let saved='';
  try{ saved=localStorage.getItem('mathDungeonFB')||''; }catch(e){}
  const connected=FB.ready;
  overlay(`<div class="kicker">MULTIPLAYER</div><h1>連線多人</h1>
    <div class="rank">${connected?(FB.room?('房間 '+FB.room+'　'+(otherList().length+1)+' 人在線'):'已連線，尚未加入房間'):'尚未連線'}</div>
    ${msg?`<div class="shmsg">${msg}</div>`:''}
    <div class="desc">
      全班共用<b>同一座迷宮</b>：誰開過的寶箱、誰清掉的隊伍，其他人都看得到，
      迷宮裡也會看到其他同學的角色在走動。<br>
      因為本遊戲是<b>回合制</b>，只有實際走一步才會寫入一次 —— 免費方案足夠一個班級使用。
    </div>
    ${connected?'':`
    <div class="namebox"><label>貼上你的 firebaseConfig</label>
      <textarea id="fbCfg" placeholder='const firebaseConfig = { apiKey: "...", databaseURL: "https://xxx.firebasedatabase.app", ... }'>${saved}</textarea></div>
    <button class="go" id="fbGo">連線</button>`}
    ${connected&&!FB.room?`
    <div class="namebox"><label>輸入房間代碼加入（或直接開新房間）</label>
      <input id="fbRoom" maxlength="4" placeholder="例如 K7QP" style="text-transform:uppercase"></div>
    <button class="go" id="fbJoinBtn">加入房間</button>
    <button class="go" id="fbNewBtn" style="background:linear-gradient(180deg,#8fd0ff,#3f7fd0);border-color:#1a3a6a;color:#0a1030">開新房間</button>`:''}
    ${FB.room?`<button class="go" id="fbBoard">📋 即時排行</button>
      <button class="go" id="fbLeave" style="background:linear-gradient(180deg,#e08a8a,#a03f3f);border-color:#5a1010">離開房間</button>`:''}
    <button class="go" id="netBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>
    <div class="fbhelp">設定步驟：Firebase 主控台 → 建立專案 → <b>Realtime Database</b> → 
      以「測試模式」啟動 → 專案設定 → 網頁應用程式 → 複製 firebaseConfig 貼上。</div>`,
    null,el=>{
      if(el.id==='netBack'){ setTimeout(introScreen,10); return true; }
      if(el.id==='fbGo'){
        try{
          const cfg=parseFbConfig($('fbCfg').value);
          setTimeout(()=>netScreen('連線中…'),5);
          fbConnect(cfg).then(()=>setTimeout(()=>netScreen('✓ 已連線！接著開新房間或輸入代碼。'),10))
            .catch(e=>setTimeout(()=>netScreen('✗ '+e.message),10));
        }catch(e){ setTimeout(()=>netScreen('✗ '+e.message),10); }
        return true;
      }
      if(el.id==='fbNewBtn'){
        const c=roomCode();
        fbJoin(c,()=>setTimeout(()=>netScreen('✓ 房間已開：'+c+'　把代碼告訴同學！'),10));
        return true;
      }
      if(el.id==='fbJoinBtn'){
        const c=($('fbRoom').value||'').trim().toUpperCase();
        if(c.length!==4){ setTimeout(()=>netScreen('✗ 房間代碼是 4 個字'),10); return true; }
        fbJoin(c,()=>setTimeout(()=>netScreen('✓ 已加入房間 '+c),10));
        return true;
      }
      if(el.id==='fbBoard'){ setTimeout(boardScreen,10); return true; }
      if(el.id==='fbLeave'){ fbLeave(); setTimeout(()=>netScreen('已離開房間。'),10); return true; }
      return false;
    });
}
/* 即時排行：老師可投影出來 */
function boardScreen(){
  const me={name:S.name||'我',job:S.job||'geo',lv:S.lv,hp:S.hp,maxhp:S.maxhp,
    dmg:(lead()&&lead().stat.dmg)||0,chain:(lead()&&lead().stat.bestChain)||0,
    quizOk:quizStats.ok,quizTotal:quizStats.total,floor:fl,self:1};
  const all=[me,...Object.values(FB.others)].sort((a,b)=>(b.chain||0)-(a.chain||0));
  const rows=all.map((o,i)=>{
    const J=JOBS[o.job]||JOBS.geo;
    const pct=o.quizTotal?Math.round(o.quizOk/o.quizTotal*100):null;
    return `<div class="brow${o.self?' self':''}">
      <span class="bri">${i+1}</span>
      <span class="brj" style="color:${J.col}">${J.ic}</span>
      <span class="brn">${o.name}${o.self?'（你）':''}</span>
      <span class="brs">${(o.floor|0)+1}F　Lv.${o.lv||1}　連擊 ${o.chain||0}　
        答題 ${pct===null?'—':pct+'%'}</span></div>`;
  }).join('');
  overlay(`<div class="kicker">LIVE BOARD</div><h1>即時排行</h1>
    <div class="rank">房間 ${FB.room||'—'}　${all.length} 人</div>
    <div class="desc" style="margin-bottom:6px">依最長連擊排序。老師可投影這個畫面。</div>
    <div id="board">${rows}</div>
    <button class="go" id="bBack">返回</button>`,()=>netScreen());
}

/* ═══════════════ 同機接力合作：多名學生共用一座迷宮 ═══════════════
   PARTY = 隊伍成員（每人一個角色）。當前操作者 = PARTY[turnIdx]。
   探索時可隨時換人；戰鬥中每位隊友各有一次職業支援技。
   ── 之後要接連線多人，只需把 PARTY 的同步換成伺服器狀態即可。 */
let PARTY=[], leadIdx=0, coop=false;

const lead=()=>PARTY[leadIdx]||null;
function partyAdd(name,job){
  if(PARTY.length>=4) return false;
  PARTY.push({name,job,used:false,
    stat:{dmg:0,bestChain:0,quizOk:0,quizTotal:0,battles:0}});
  return true;
}
function partySync(){          // 把當前操作者的職業套用到 S
  const L=lead(); if(!L)return;
  S.name=L.name; S.job=L.job;
}
function partyScreen(msg){
  const rows=PARTY.map((m,i)=>{
    const J=JOBS[m.job];
    return `<div class="prow${i===leadIdx?' lead':''}" data-i="${i}">
      <div class="jic" style="background:${J.col}22;color:${J.col}">${J.ic}</div>
      <div class="jinfo"><div class="jn" style="color:${J.col}">${m.name}
        ${i===leadIdx?'<span class="ldtag">操作中</span>':''}</div>
        <div class="jd">${J.n}　傷害 ${m.stat.dmg}　最長連擊 ${m.stat.bestChain}</div>
        <div class="jp">${m.stat.quizTotal?('答題 '+m.stat.quizOk+'/'+m.stat.quizTotal+
          '（'+Math.round(m.stat.quizOk/m.stat.quizTotal*100)+'%）'):'尚未答題'}</div></div>
      <div class="pdel" data-del="${i}">✕</div></div>`;
  }).join('') || '<div class="pempty">還沒有成員。加入 1～4 名學生開始合作。</div>';
  const jobOpts=Object.keys(JOBS).map(k=>
    `<span class="jpick" data-j="${k}" style="border-color:${JOBS[k].col};color:${JOBS[k].col}">
      ${JOBS[k].ic} ${JOBS[k].n}</span>`).join('');
  overlay(`<div class="kicker">CO-OP PARTY</div><h1>接力隊伍</h1>
    <div class="rank">${PARTY.length} / 4 名成員</div>
    ${msg?`<div class="shmsg">${msg}</div>`:''}
    <div class="desc" style="margin-bottom:6px">
      一台裝置輪流玩。<b>探索時可隨時換人</b>，戰鬥中每位隊友都能發動<b>一次支援技</b>。<br>
      迷宮進度、金幣與牌組是<b>全隊共用</b>的。</div>
    <div id="plist">${rows}</div>
    <div class="namebox"><label>新成員名稱</label>
      <input id="pName" maxlength="12" placeholder="學生姓名或代號"></div>
    <div class="jpickrow">${jobOpts}</div>
    <button class="go" id="pStart">${PARTY.length?'開始合作探索':'先加入成員'}</button>
    <button class="go" id="pBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>`,
    null,el=>{
      if(el.id==='pBack'){ coop=false; setTimeout(introScreen,10); return true; }
      if(el.id==='pStart'){
        if(!PARTY.length){ setTimeout(()=>partyScreen('請先加入至少一名成員。'),10); return true; }
        coop=true; leadIdx=0; partySync();
        S.deck=mkDeck(JOBS[lead().job].deck);
        S.handSize=5;
        loadFloor(0); backToDungeon(); return true;
      }
      const del=el.closest('.pdel');
      if(del){ PARTY.splice(+del.dataset.del,1); if(leadIdx>=PARTY.length)leadIdx=0;
        setTimeout(()=>partyScreen('已移除成員。'),10); return true; }
      const row=el.closest('.prow');
      if(row&&!el.closest('.pdel')){ leadIdx=+row.dataset.i; partySync();
        setTimeout(()=>partyScreen('已切換操作者。'),10); return true; }
      const jp=el.closest('.jpick');
      if(jp){
        const nm=($('pName').value||'').trim();
        if(!nm){ toast('請先輸入名稱',1300); return false; }
        if(!partyAdd(nm,jp.dataset.j)){ setTimeout(()=>partyScreen('隊伍已滿（最多 4 人）。'),10); return true; }
        setTimeout(()=>partyScreen('✓ '+nm+' 加入隊伍！'),10); return true;
      }
      return false;
    });
}
/* 探索中換人 */
function swapLead(){
  if(!coop||PARTY.length<2){ toast('目前不是合作模式',1200); return; }
  leadIdx=(leadIdx+1)%PARTY.length;
  partySync();
  S.deck=mkDeck(JOBS[lead().job].deck);
  S.handSize=5;
  updBar();
  const J=JOBS[lead().job];
  toast('換人：'+lead().name+'（'+J.n+'）操作',2000);
}
/* 戰鬥中的支援技 */
const SUPPORTS={
 ext:{n:'外部能力',f:()=>{drawCards(2);return '抽 2 張';}},
 geo:{n:'畢氏斬',f:()=>{
   const L=B.lastCosts||[],a=L[L.length-1]||2,b=L[L.length-2]||1;
   const t=targetFoe(); const d=6*(a*a+b*b);
   if(t){t.hp-=d;popDmg(t,d,true,'△ ');if(t.hp<=0){t.hp=0;t.dead=true;}}
   return '造成 '+d+' 傷害（'+a+'²+'+b+'²）×6';}},
 alg:{n:'等量公理',f:()=>{B.step=seqStart();drawCards(2);return '序列不變，抽 2 張';}},
 stat:{n:'資料蒐集',f:()=>{drawCards(3);return '抽 3 張';}},
 prob:{n:'亂數風暴',f:()=>{let n=0;
   for(const f of B.foes){if(f.dead)continue;f.hp-=25;popDmg(f,25,true,'🎲 ');n++;
     if(f.hp<=0){f.hp=0;f.dead=true;}}
   return '全體 25 傷害（命中 '+n+' 隻）';}},
 num:{n:'因數分解',f:()=>{B.supBoost=1;return '本回合所有傷害 +50%';}},
  bard:{n:'調和級數',f:()=>{const n=gainPlayerBlock(25,0);return '獲得 '+n+' 護盾';}},
};
function supportScreen(){
  if(!coop||!PARTY.length){ toast('非合作模式',1200); return; }
  const rows=PARTY.map((m,i)=>{
    const J=JOBS[m.job], SP=SUPPORTS[m.job];
    return `<div class="prow${m.used?' used':''}" data-s="${i}">
      <div class="jic" style="background:${J.col}22;color:${J.col}">${J.ic}</div>
      <div class="jinfo"><div class="jn" style="color:${J.col}">${m.name}
        ${m.used?'<span class="ldtag">已使用</span>':''}</div>
        <div class="jd">${SP.n}</div>
        <div class="jp">${J.sup}</div></div></div>`;
  }).join('');
  overlay(`<div class="kicker">SUPPORT</div><h1>隊友支援</h1>
    <div class="rank">每場戰鬥每人一次</div>
    <div id="plist">${rows}</div>
    <button class="go" id="supBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回戰鬥</button>`,
    null,el=>{
      if(el.id==='supBack'){ $('veil').classList.add('hide'); return true; }
      const row=el.closest('.prow'); if(!row)return false;
      const i=+row.dataset.s, m=PARTY[i];
      if(m.used){ toast(m.name+' 這場已經支援過了',1300); return false; }
      m.used=true;
      const txt=SUPPORTS[m.job].f();
      shake();
      $('veil').classList.add('hide');
      toast(m.name+' 的「'+SUPPORTS[m.job].n+'」：'+txt,2200);
      renderAll();
      if(B.foes.every(f=>f.dead)) queueBattleVictory();
      return true;
    });
}
/* 貢獻統計 */
function creditDamage(d){ const L=lead(); if(L)L.stat.dmg+=d; }
function creditChain(c){ const L=lead(); if(L)L.stat.bestChain=Math.max(L.stat.bestChain,c); }
function creditQuiz(ok){ const L=lead(); if(L){L.stat.quizTotal++; if(ok)L.stat.quizOk++;} }

/* ═══════════════ 職業系統：每個職業對應一種數學專長 ═══════════════ */
const JOBS={
 ext:{n:'外部角色',ic:'🧬',col:'#bfe8ff',vol:'匯入',
   d:'由外部 RPG 系統匯入的角色。',
   deck:['knife','dagger','wand','garlic','whip','imelda','axe','bible','blank','clock'],
   pas:'依匯入的能力而定',sup:'依匯入的能力而定'},
 geo:{n:'幾何劍士',ic:'🔺',col:'#ff9a5a',vol:'圖形與幾何',
   d:'高傷近戰。越打越猛，適合長回合。',
   deck:['knife','dagger','wand','garlic','whip','imelda','axe','bible','blank','clock'],
   pas:'畢氏共鳴：本回合第 3 張起，傷害 +25%',
   sup:'畢氏斬：對目標造成 (a²+b²)×6 傷害（a、b 為前兩張費用）'},
 alg:{n:'代數術士',ic:'✖',col:'#8fd0ff',vol:'代數與方程式',
   d:'通用卡專家。善用回魔延長連擊。',
   deck:['knife','dagger','wand','antonio','whip','water','axe','cross','blank','clock'],
   pas:'移項自如：打出通用卡時額外抽 1 張',
   sup:'等量公理：維持目前序列，並抽 2 張'},
 stat:{n:'統計射手',ic:'📊',col:'#bfe8ff',vol:'統計與資料',
   d:'手牌多、選擇多。穩定輸出型。',
   deck:['knife','poe','wand','garlic','imelda','whip','axe','bible','blank','clock'],
   pas:'樣本充足：每回合首次達 3 連抽 1 張；連擊 ≥5 時傷害 +20%',
   sup:'資料蒐集：抽 3 張'},
 prob:{n:'機率盜賊',ic:'🎲',col:'#e26bd6',vol:'機率與統計',
   d:'高風險高回報。運氣好時法力用不完。',
   deck:['knife','dagger','wand','antonio','whip','imelda','pasqua','cross','blank','clock'],
   pas:'期望值：每張牌有 22% 機率<b>不消耗法力</b>',
   sup:'亂數風暴：全體 25 傷害'},
 num:{n:'數論僧侶',ic:'🔢',col:'#8fe86a',vol:'數與量',
   d:'質數信仰者。專打 2 費與 3 費。',
   deck:['dagger','pebble','wand','guard','whip','water','axe','bible','blank','clock'],
   pas:'質數之力：費用為<b>質數</b>（2、3）的牌傷害 +50%',
   sup:'因數分解：本回合所有傷害 +50%'},
 bard:{n:'級數詩人',ic:'🎵',col:'#ffe38a',vol:'數列與級數',
   d:'越連越硬。靠護盾撐過援軍浪潮。',
   deck:['knife','poe','wand','garlic','imelda','water','pasqua','bible','blank','clock'],
   pas:'累加護盾：每次接續連擊 +2 護盾',
   sup:'調和級數：立即獲得 25 護盾'},
};

/* 職業被動掛勾 */
function jobDmgMul(c){
  let m=1;
  const j=S.job;
  if(j==='geo' && (B.played||0)>=3) m*=1.25;
  if(j==='stat' && B.chain>=5) m*=1.2;
  if(j==='num' && isPrime(c.c)) m*=1.5;
  if(B.supBoost) m*=1.5;                  // 數論僧侶支援技
  return m;
}
function jobOnPlay(c,cont){
  const j=S.job;
  if(j==='alg' && c.wild) drawCards(1);
  if(j==='stat'&&cont&&B.chain>=3&&!B.statSample){B.statSample=true;drawCards(1);toast('樣本充足：抽 1 張',1000);}
  if(j==='bard' && cont)gainPlayerBlock(2,60);
}
function jobManaCost(c){
  if(c.c<0) return c.c;                  // 負費卡一律回收，不受職業被動影響
  if(S.job==='prob' && Math.random()<0.22){
    toast('期望值發動 — 這張免費！',1100);
    return 0;
  }
  return c.c;
}

/* ═══ 角色建立 ═══ */
function charScreen(){
  const rows=Object.keys(JOBS).map(k=>{
    const J=JOBS[k];
    return `<div class="jobrow" data-k="${k}" style="border-color:${J.col}">
      <div class="jic" style="background:${J.col}22;color:${J.col}">${J.ic}</div>
      <div class="jinfo">
        <div class="jn" style="color:${J.col}">${J.n}
          <span class="jvol">${J.vol}</span></div>
        <div class="jd">${J.d}</div>
        <div class="jp">被動 · ${J.pas}</div>
        <div class="jp sup">支援 · ${J.sup}</div>
      </div></div>`;
  }).join('');
  overlay(`<div class="kicker">CHARACTER</div><h1>建立角色</h1>
    <div class="rank">選擇職業</div>
    <div class="namebox">
      <label>角色名稱</label>
      <input id="charName" maxlength="12" placeholder="輸入學生姓名或代號" value="${S.name||''}">
    </div>
    <div id="joblist">${rows}</div>
    <button class="go" id="charBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>`,
    null,el=>{
      if(el.id==='charBack'){ setTimeout(introScreen,10); return true; }
      const row=el.closest('.jobrow'); if(!row)return false;
      const k=row.dataset.k, J=JOBS[k];
      const nm=($('charName').value||'').trim();
      if(!nm){ toast('請先輸入角色名稱',1400); return false; }
      applyJob(nm,k);
      setTimeout(()=>overlay(`<div class="kicker">READY</div>
        <h1 style="color:${J.col}">${J.ic} ${nm}</h1>
        <div class="rank" style="color:${J.col};border-color:${J.col}">${J.n}</div>
        <div class="desc"><b>被動：</b>${J.pas}<br><b>支援技：</b>${J.sup}<br><br>
          起始牌組已依職業配置。</div>
        <button class="go" id="ok">回到選單</button>`,introScreen),10);
      return true;
    });
}
function applyJob(name,k){
  S.name=name; S.job=k;
  S.deck=mkDeck(JOBS[k].deck);
  S.handSize=5;
  saveChar();
}

/* ═══ 存檔：優先 localStorage，失敗則用匯出碼 ═══ */
function saveChar(){
  try{
    localStorage.setItem('mathDungeonChar',JSON.stringify({
      name:S.name,job:S.job,lv:S.lv,xp:S.xp,xpNeed:S.xpNeed,gold:S.gold,mana:S.mana,handSize:S.handSize,
      maxhp:S.maxhp,dmgMul:S.dmgMul,step:S.step,armor:S.armor,ups:S.ups,handCap:S.handCap,
      deck:S.deck,gems:S.gems,pot:S.pot,luckChest:S.luckChest||0,shrineUses:S.shrineUses||{},followers:S.followers||[],monsterDex:S.monsterDex||[],monsterTraits:S.monsterTraits||{},fusionBook:S.fusionBook||[],petCardCarry:S.petCardCarry||[],petCardCarrySession:S.petCardCarrySession||'',petCardSentSession:S.petCardSentSession||'',wrong:S.wrong,found:S.found,cleared:S.cleared,zoneBest:S.zoneBest,zoneProgress:S.zoneProgress||{},meta:S.meta,npcSeen,muralSeen,quizStats}));
  }catch(e){ /* 無痕模式或檔案協定可能不允許，忽略 */ }
}
function loadChar(){
  try{
    const raw=localStorage.getItem('mathDungeonChar');
    if(!raw) return false;
    const d=JSON.parse(raw);
    if(!d||!d.job||!JOBS[d.job]) return false;
    Object.assign(S,{name:d.name,job:d.job,lv:d.lv||1,xp:Math.max(0,Number(d.xp)||0),xpNeed:Math.max(3,Number(d.xpNeed)||((d.lv||1)+2)),gold:d.gold||0,mana:d.mana||6,
      handSize:5,handCap:5,maxhp:d.maxhp||100,hp:d.maxhp||100,
      dmgMul:d.dmgMul||1,step:d.step||0.35,armor:d.armor||0,ups:d.ups||{},
      deck:sanitizeDeck((d.deck&&d.deck.length)?d.deck:mkDeck(JOBS[d.job].deck),d.job),gems:d.gems||[],
      pot:normalizePot(d.pot),luckChest:Math.max(0,Number(d.luckChest)||0),shrineUses:d.shrineUses||{},followers:d.followers||[],monsterDex:d.monsterDex||[],monsterTraits:d.monsterTraits||{},fusionBook:d.fusionBook||[],petCardCarry:d.petCardCarry||[],petCardCarrySession:d.petCardCarrySession||'',petCardSentSession:d.petCardSentSession||''});
    cleanCompanions();
    if(d.npcSeen)npcSeen=d.npcSeen;
    if(d.muralSeen)muralSeen=d.muralSeen;
    if(d.quizStats)quizStats=d.quizStats;
    if(d.wrong)S.wrong=d.wrong;
    if(d.found)S.found=d.found;
    if(d.cleared!==undefined)S.cleared=d.cleared;
    if(d.zoneBest)S.zoneBest=d.zoneBest;
    if(d.zoneProgress)S.zoneProgress=d.zoneProgress;
    if(d.meta)S.meta=d.meta;
    return true;
  }catch(e){ return false; }
}
function exportChar(){
  const code=btoa(unescape(encodeURIComponent(JSON.stringify({
    name:S.name,job:S.job,lv:S.lv,xp:S.xp,xpNeed:S.xpNeed,gold:S.gold,mana:S.mana,handSize:S.handSize,
    maxhp:S.maxhp,dmgMul:S.dmgMul,step:S.step,armor:S.armor,ups:S.ups,handCap:S.handCap,
    deck:S.deck,gems:S.gems,pot:S.pot,luckChest:S.luckChest||0,shrineUses:S.shrineUses||{},followers:S.followers||[],monsterDex:S.monsterDex||[],monsterTraits:S.monsterTraits||{},fusionBook:S.fusionBook||[],petCardCarry:S.petCardCarry||[],petCardCarrySession:S.petCardCarrySession||'',petCardSentSession:S.petCardSentSession||'',wrong:S.wrong,found:S.found,cleared:S.cleared,zoneBest:S.zoneBest,zoneProgress:S.zoneProgress||{},meta:S.meta,npcSeen,muralSeen,quizStats}))));
  overlay(`<div class="kicker">EXPORT</div><h1>角色代碼</h1>
    <div class="rank">${S.name||'未命名'} · ${S.job?JOBS[S.job].n:'—'}</div>
    <div class="desc">複製這段代碼，就能在別的裝置或別台電腦還原這個角色。</div>
    <textarea id="expBox" readonly>${code}</textarea>
    <div class="namebox" style="margin-top:10px">
      <label>或貼上代碼還原角色</label>
      <input id="impCode" placeholder="貼上角色代碼">
    </div>
    <button class="go" id="impCodeGo">還原</button>
    <button class="go" id="expBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>`,
    null,el=>{
      if(el.id==='expBack'){ setTimeout(introScreen,10); return true; }
      if(el.id!=='impCodeGo') return false;
      try{
        const d=JSON.parse(decodeURIComponent(escape(atob(($('impCode').value||'').trim()))));
        if(!d.job||!JOBS[d.job]) throw new Error('職業資料無效');
        Object.assign(S,{name:d.name,job:d.job,lv:d.lv||1,xp:Math.max(0,Number(d.xp)||0),xpNeed:Math.max(3,Number(d.xpNeed)||((d.lv||1)+2)),gold:d.gold||0,mana:d.mana||6,
          handSize:5,handCap:5,maxhp:d.maxhp||100,hp:d.maxhp||100,
          dmgMul:d.dmgMul||1,step:d.step||0.35,armor:d.armor||0,ups:d.ups||{},
          deck:sanitizeDeck((d.deck&&d.deck.length)?d.deck:mkDeck(JOBS[d.job].deck),d.job),gems:d.gems||[],
          pot:normalizePot(d.pot),luckChest:Math.max(0,Number(d.luckChest)||0),shrineUses:d.shrineUses||{},followers:d.followers||[],monsterDex:d.monsterDex||[],monsterTraits:d.monsterTraits||{},fusionBook:d.fusionBook||[],petCardCarry:d.petCardCarry||[],petCardCarrySession:d.petCardCarrySession||'',petCardSentSession:d.petCardSentSession||''});
        cleanCompanions();
        if(d.npcSeen)npcSeen=d.npcSeen;
        if(d.muralSeen)muralSeen=d.muralSeen;
        if(d.zoneProgress)S.zoneProgress=d.zoneProgress;
        saveChar();
        toast('角色已還原：'+S.name,1800);
        setTimeout(introScreen,10);
        return true;
      }catch(e){ toast('代碼無效：'+e.message,1800); return false; }
    });
}

/* ═══════════ NPC 進階課程：學完基礎後再訪解鎖 ═══════════ */
const NPC_ADV={
 sage:{topic:'等差級數求和 → 連擊總費用',
  intro:'基礎你已經懂了。現在教你怎麼「一次算完整條連擊」。',
  steps:[
   {t:'假設你打出的費用是 <b>1, 2, 3, 4, 5</b>，總共花了多少法力？'},
   {t:'笨方法是一個一個加。聰明的方法是<b>首尾配對</b>。',f:'1+5 = 6　　2+4 = 6　　3 在中間'},
   {t:'每一對的和都一樣！這不是巧合 —— 左邊加多少，右邊就減多少。'},
   {t:'所以把整條數列<b>複製一份倒過來</b>，拼成長方形：',
    f:'1 2 3 4 5\n5 4 3 2 1\n─────────\n6 6 6 6 6'},
   {t:'長方形的總和是 <b>6 × 5 = 30</b>，但這是<b>兩份</b>，要除以 2。',f:'30 ÷ 2 = 15'},
   {t:'寫成公式就是<b>等差級數求和</b>。',f:'Sₙ = n(a₁ + aₙ) / 2'},
   {t:'高斯十歲時就用這招算出 1+2+…+100 = <b>5050</b>。<br>你的戰後結算畫面用的正是這條公式。'},
  ],
  quiz:genGaussQuiz, reward:{k:'step',v:0.05,d:'連鎖倍率再 +0.05'}},

 gate:{topic:'含括號與分數的方程式',
  intro:'簡單的門你會開了。這道符文複雜一點。',
  steps:[
   {t:'這次的符文有括號：',f:'2(x + 3) = 14'},
   {t:'第一步<b>去括號</b>，用分配律把 2 乘進去。',f:'2x + 6 = 14'},
   {t:'接著就跟以前一樣：兩邊同減 6。',f:'2x = 8'},
   {t:'兩邊同除以 2。',f:'x = 4'},
   {t:'如果符文有<b>分母</b>呢？例如：',f:'x/2 + x/3 = 5'},
   {t:'兩邊同乘<b>分母的最小公倍數</b>（2 與 3 → 6），一次清掉分數。',f:'3x + 2x = 30　→　5x = 30'},
   {t:'得 <b>x = 6</b>。口訣：<b>先去括號、再去分母、然後移項</b>。'},
  ],
  quiz:genEquationAdv, reward:{k:'armor',v:1,d:'受到傷害再 −1'}},

 smith:{topic:'十字交乘 → 首項係數不是 1',
  intro:'進階刻痕。前面有係數的，拆起來要用交叉法。',
  steps:[
   {t:'這道刻痕的 x² 前面有係數：',f:'2x² + 5x + 3'},
   {t:'先拆<b>首項係數 2</b> = 2 × 1，再拆<b>常數 3</b> = 3 × 1。'},
   {t:'排成十字，然後<b>交叉相乘再相加</b>：',f:'2 ╳ 3\n1 ╳ 1\n交叉：2×1 + 1×3 = 5'},
   {t:'交叉和剛好等於一次項係數 <b>5</b> ✓　拆對了。'},
   {t:'橫著讀出兩個括號：',f:'(2x + 3)(x + 1)'},
   {t:'一定要<b>乘開驗算</b>：2x²+2x+3x+3 = 2x²+5x+3 ✓'},
   {t:'若交叉和不對，就換一組拆法再試。這是有系統的試誤，不是瞎猜。'},
  ],
  quiz:genFactorAdv, reward:{k:'dmg',v:0.1,d:'全部傷害再 +10%'}},

 merchant:{topic:'方案比較 → 哪個划算',
  intro:'會算預算還不夠。真正的生意人要會<b>比較方案</b>。',
  steps:[
   {t:'A 方案：月租 <b>199</b> 元含 100 分鐘，超過每分 <b>2</b> 元。'},
   {t:'B 方案：無月租，每分鐘 <b>4</b> 元。'},
   {t:'設通話 <b>x</b> 分鐘（x > 100），列出兩邊費用：',
    f:'A = 199 + 2(x − 100)\nB = 4x'},
   {t:'想知道「講多久 A 比較划算」，就列<b>不等式</b>。',f:'199 + 2(x−100) < 4x'},
   {t:'去括號整理：',f:'199 + 2x − 200 < 4x　→　−1 < 2x'},
   {t:'解得 <b>x > −0.5</b> —— 恆成立。所以在 x > 100 的範圍內 <b>A 永遠比較划算</b>。'},
   {t:'這就是不等式的威力：不必一個一個試，直接算出<b>臨界點</b>。'},
  ],
  quiz:genCompare, reward:{k:'maxhp',v:8,d:'生命上限 +8'}},

 teller:{topic:'兩階段事件 → 樹狀圖',
  intro:'單次的機率你懂了。連續發生的呢？',
  steps:[
   {t:'連續開<b>兩個</b>寶箱，每箱中稀有的機率都是 <b>1/3</b>。'},
   {t:'畫<b>樹狀圖</b>：第一箱兩種結果，各自再分兩種。',
    f:'第一箱 ─ 中(1/3) ─ 中(1/3) / 沒中(2/3)\n        └ 沒中(2/3) ─ 中(1/3) / 沒中(2/3)'},
   {t:'走完一條路徑的機率＝<b>沿路相乘</b>。',f:'兩箱都中 = 1/3 × 1/3 = 1/9'},
   {t:'兩箱都沒中：',f:'2/3 × 2/3 = 4/9'},
   {t:'「<b>至少中一次</b>」有三條路徑，但用<b>互補</b>更快：',f:'1 − 4/9 = 5/9'},
   {t:'記住這招：看到「至少」，先算「一次都沒有」再用 1 減。'},
   {t:'擲兩顆骰子共 <b>36</b> 種組合，和為 7 的有 6 種 —— 這也是同樣的道理。'},
  ],
  quiz:genProbAdv, reward:{k:'armor',v:2,d:'受到傷害再 −2'}},

 stat:{topic:'四分位數與盒狀圖',
  intro:'平均與中位數之外，還要看<b>分散程度</b>。',
  steps:[
   {t:'把你的連擊紀錄排序：',f:'2, 4, 5, 6, 8, 9, 12, 15'},
   {t:'<b>Q₂</b> 就是中位數。8 筆資料取中間兩個的平均。',f:'(6+8) ÷ 2 = 7'},
   {t:'<b>Q₁</b> 是<b>下半部</b>（2,4,5,6）的中位數。',f:'(4+5) ÷ 2 = 4.5'},
   {t:'<b>Q₃</b> 是<b>上半部</b>（8,9,12,15）的中位數。',f:'(9+12) ÷ 2 = 10.5'},
   {t:'<b>四分位距 IQR</b> = Q₃ − Q₁，代表中間 50% 資料的範圍。',f:'IQR = 10.5 − 4.5 = 6'},
   {t:'盒狀圖用五個數字畫成：<b>最小、Q₁、Q₂、Q₃、最大</b>。<br>盒身越寬 → 你的表現越<b>不穩定</b>。'},
   {t:'所以要進步，不只要拉高中位數，還要<b>縮小 IQR</b> —— 穩定比爆發更重要。'},
  ],
  quiz:genIQR, reward:{k:'maxhp',v:20,d:'生命上限再 +20'}},
};

/* 進階題目生成器 */

/* NPC 專用題目生成器 */

/* NPC 像素立繪 */

/* ═══ 對話流程：逐步累積顯示推導 ═══ */
let npcSeen={},npcStudyQuestion=null;

/* 課程入口：NPC 只負責把學生帶到既有課程目錄，不在地下城重寫另一份教學。
   教師有指定題庫時優先使用指定範圍；自由複習時才讀取 question-bank-data.js。 */

/* 課程教學留在地下城覆蓋視窗內，不另開分頁；關閉後回到同一位 NPC。 */

/* ═══════════ 升級神殿：花金幣強化，價格遞增 ═══════════ */
const UPGRADES={
  /* 法力上限與手牌上限已移出神殿 —— 改由戰鬥中的卡牌能力臨時提升，
     讓「這一場要不要衝上限」變成戰術決定，而不是一次買斷。 */
  dmg:{n:'鋒銳石碑',d:'全部傷害 +10%',base:110,mul:1.5,max:8,
    f:()=>S.dmgMul+=0.1, cur:()=>Math.round(S.dmgMul*100)+'%'},
  /* 生命上限已移出神殿 —— 改由升級自動成長（每級 +15），
     讓「打怪升級」本身就有意義，而不是全靠金幣堆數值。 */
  armor:{n:'守護符文',d:'受到傷害 −1',base:130,mul:1.6,max:6,
    f:()=>S.armor++, cur:()=>S.armor},
  step:{n:'連鎖水晶',d:'連鎖倍率 +0.04',base:160,mul:1.65,max:6,
    f:()=>S.step+=0.04, cur:()=>S.step.toFixed(2)},
  extract:{n:'寶石拆解',d:'把寶石從卡牌取回（答錯會碎裂）',base:0,mul:1,max:99,
    f:()=>null, cur:()=>S.deck.filter(o=>o.gem).length+' 張已鑲嵌'},
  potion:{n:'治療藥水',d:'購入一瓶治療藥水（回復 30）',base:220,mul:1.25,max:99,
    f:()=>S.pot.heal=(S.pot.heal||0)+1, cur:()=>'×'+(S.pot.heal||0)},
  purge:{n:'淨化之火',d:'從牌組移除一張牌',base:70,mul:1.35,max:99,
    f:()=>null, cur:()=>S.deck.length+' 張'},
};
const upCost=k=>Math.round(UPGRADES[k].base*Math.pow(UPGRADES[k].mul,S.ups[k]||0));
let shrineProp=null;
const shrineUseKey=()=>String(S.zone||0)+':'+String(fl||0);
function shrineSpent(msg){
  overlay(`<div class="kicker">SHRINE SPENT</div><h1>神殿能量耗盡</h1>
    <div class="rank">每座升級神殿只能使用一次</div>
    <div class="desc">${msg||'符文已經暗下來，請到其他樓層尋找新的神殿。'}</div>
    <button class="go" id="ok">離開</button>`,()=>{shrineProp=null;backToDungeon();});
}
function consumeShrine(){
  S.shrineUses=S.shrineUses||{};S.shrineUses[shrineUseKey()]=1;
  if(shrineProp){shrineProp.used=1;shrineProp.alive=0;fbMarkProp(shrineProp);}
  saveChar();
}

function shrineScreen(msg,pr){
  if(pr)shrineProp=pr;
  if((S.shrineUses||{})[shrineUseKey()]){shrineSpent(msg);return;}
  const rows=Object.keys(UPGRADES).map(k=>{
    const U=UPGRADES[k], lv=S.ups[k]||0, cost=upCost(k);
    const maxed=lv>=U.max, afford=S.gold>=cost;
    const warn=U.warn?U.warn():'';
    return `<div class="uprow${maxed?' maxed':afford?'':' poor'}" data-k="${k}">
      <div class="ui"><div class="un">${U.n}　<span class="ulv">Lv.${lv}${maxed?' MAX':''}</span></div>
        <div class="ud">${U.d}　<span class="ucur">目前：${U.cur()}</span></div>
        ${warn?`<div class="uwarn">⚠ ${warn}</div>`:''}</div>
      <div class="uc">${maxed?'—':'◉ '+cost}</div></div>`;
  }).join('');
  overlay(`<div class="kicker">SHRINE</div><h1>升級神殿</h1>
    <div class="rank">持有金幣 ◉ ${S.gold}</div>
    ${msg?`<div class="shmsg">${msg}</div>`:''}
    <div class="desc" style="margin-bottom:6px">金幣來自戰鬥與寶箱。每次升級後價格會提高。</div>
    <div id="uplist">${rows}</div>
    <button class="go" id="shLeave">離開神殿</button>`,null,el=>{
      if(el.id==='shLeave'){ shrineProp=null;backToDungeon(); return true; }
      const row=el.closest('.uprow'); if(!row) return false;
      const k=row.dataset.k, U=UPGRADES[k], lv=S.ups[k]||0, cost=upCost(k);
      if(lv>=U.max){ setTimeout(()=>shrineScreen('已達上限。'),10); return true; }
      if(S.gold<cost){ setTimeout(()=>shrineScreen('金幣不足，還差 '+(cost-S.gold)+' 枚。'),10); return true; }
      if(U.warn&&U.warn()){ setTimeout(()=>shrineScreen('⚠ '+U.warn()),10); return true; }
      // 先確認再扣錢 —— 避免手滑點到就花掉金幣
      setTimeout(()=>confirmUpgrade(k,cost),10);
      return true;
    });
}
/* 升級確認：不小心點到可以取消 */
function confirmUpgrade(k,cost){
  const U=UPGRADES[k], lv=S.ups[k]||0;
  overlay(`<div class="kicker">CONFIRM</div><h1 style="font-size:22px">確認升級？</h1>
    <div class="rank">${U.n}　Lv.${lv} → Lv.${lv+1}</div>
    <div class="desc">${U.d}<br>
      目前：<b>${U.cur()}</b><br><br>
      花費 <i>◉ ${cost}</i>　剩餘金幣 <b>${S.gold} → ${S.gold-cost}</b></div>
    <button class="go" id="upYes">確認升級</button>
    <button class="go" id="upNo" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">取消</button>`,
    null,el=>{
      if(el.id==='upNo'){ setTimeout(()=>shrineScreen('已取消。'),10); return true; }
      if(el.id!=='upYes') return false;
      if(S.gold<cost){ setTimeout(()=>shrineScreen('金幣不足。'),10); return true; }
      S.gold-=cost; S.ups[k]=lv+1;
      consumeShrine();
      if(k==='extract'){ setTimeout(()=>extractScreen(),10); return true; }
      if(k==='purge'){ setTimeout(()=>purgeScreen(),10); return true; }
      U.f(); updBar(); saveChar();
      setTimeout(()=>shrineSpent('✓ '+U.n+' 升級完成！符文隨即暗下來。'),10);
      return true;
    });
}
/* 寶石拆解：答對可回收寶石，答錯寶石碎裂 */
function extractScreen(msg){
  const withGem=S.deck.map((o,i)=>({o,i})).filter(x=>x.o.gem);
  const rows=withGem.length?withGem.map(({o,i})=>{
    const b=CARDS[o.id], G=GEMS[o.gem];
    return `<div class="srow" data-x="${i}">
      <span class="sc px">${cardCostText(effCard(o))}</span>
      <span class="sn">${b.n}</span>
      <span class="sg" style="color:${G.col}">${G.ic} ${G.n}</span></div>`;
  }).join('') : '<div class="pempty">牌組裡沒有鑲嵌寶石的卡</div>';
  overlay(`<div class="kicker">EXTRACT</div><h1>寶石拆解</h1>
    <div class="rank">把寶石從卡牌上取回</div>
    ${msg?`<div class="shmsg">${msg}</div>`:''}
    <div class="desc" style="margin-bottom:6px">
      鑲嵌是把力量<b>合起來</b>，拆解則是把整體<b>拆開</b> —— 題目類型正好相反。<br>
      <b>答對</b>可以把寶石完整取回，<b>答錯</b>寶石會碎裂消失。</div>
    <div id="sockList">${rows}</div>
    <button class="go" id="exBack">返回</button>`,
    null,el=>{
      if(el.id==='exBack'){ setTimeout(()=>shrineScreen(),10); return true; }
      const row=el.closest('.srow'); if(!row||row.dataset.x===undefined) return false;
      const idx=+row.dataset.x, o=S.deck[idx];
      if(!o||!o.gem) return false;
      const g=o.gem;
      setTimeout(()=>quizAsk(dungeonActionQuestion(genExtractQ),ok=>{
        o.gem=null; o.perfect=false;
        if(ok){ S.gems.push(g);
          toast('拆解成功 — '+GEMS[g].n+' 已回到寶石庫',2000); }
        else toast('拆解失敗 — '+GEMS[g].n+' 碎裂了',2000);
        saveChar();
        setTimeout(()=>extractScreen(ok?'✓ 已取回寶石。':'✗ 寶石碎裂了。'),10);
      },dungeonActionLabel('寶石拆解')),10);
      return true;
    });
}
function purgeScreen(){
  const rows=S.deck.map((o,i)=>{
    const b=CARDS[o.id],locked=!canRemoveDeckIndex(i);
    return `<div class="srow${locked?' taken':''}" data-i="${i}"><span class="sc px">${cardCostText(effCard(o))}</span>
      <span class="sn">${b.n}${locked?' <em>保護</em>':''}</span>
      <span class="sg">${locked?(effCard(o).EQUIP?'裝備戰技':'必要費用'):o.gem?GEMS[o.gem].ic+GEMS[o.gem].n:'可移除'}</span></div>`;
  }).join('');
  overlay(`<div class="kicker">PURGE</div><h1>淨化之火</h1>
    <div class="rank">選一張要從牌組移除的牌</div>
    <div class="desc" style="margin-bottom:6px">裝備戰技不可移除；0～4 費必須各保留至少一張，受到保護的核心卡會標示為灰色。</div>
    <div id="sockList">${rows}</div><button class="go" id="purgeBack">返回</button>`,null,el=>{
      if(el.id==='purgeBack'){setTimeout(()=>shrineScreen(),10);return true;}
      const row=el.closest('.srow'); if(!row) return false;
      const index=+row.dataset.i;if(!canRemoveDeckIndex(index)){setTimeout(()=>purgeScreen(),10);toast('這張卡受到保護：必須保留完整 0～4 費曲線',1800);return true;}
      const o=S.deck.splice(index,1)[0];
      saveChar();
      setTimeout(()=>shrineScreen('已移除「'+CARDS[o.id].n+'」，牌組剩 '+S.deck.length+' 張。'),10);
      return true;
    });
}

/* ═══════════ 壁畫：藏在牆面的隱藏 NPC ═══════════
   面向壁畫牆按前進即可互動，答對可獲得數學家傳說卡。 */
const MURALS={
  m1:{n:'幾何壁畫',who:'歐幾里得的殘影',card:'euclidC',col:'#8fd0ff',
    tale:'牆上刻著兩千年前的《幾何原本》。一道殘影浮現：<br>「輾轉相除，是我留下的方法。你若懂得餘數，這張卡就是你的。」',
    q:()=>{const mode=rand(3);
      if(mode===1){const A=35+rand(46),ans=180-A,m=shuf4(String(ans)+'°',[String(A)+'°',String(90-A)+'°',String(180+A)+'°'],k=>(ans+k+5)+'°');
        return {fig:figParallel(A),q:`兩平行線被截線所截，一組同側內角為 ${A}°，另一角是多少？`,opts:m.opts,ans:m.ans,sol:`同側內角互補：180°−${A}°=${ans}°。`,tag:'平行線角度'};}
      if(mode===2){const A=35+rand(35),B=35+rand(35),ans=180-A-B,m=shuf4(String(ans)+'°',[String(A+B)+'°',String(180-A)+'°',String(180-B)+'°'],k=>(ans+k+7)+'°');
        return {fig:figTriangle(A,B,ans,'?'),q:`三角形兩角為 ${A}°、${B}°，第三角是多少？`,opts:m.opts,ans:m.ans,sol:`三角形內角和 180°：180−${A}−${B}=${ans}°。`,tag:'三角形內角'};}
      const a=12*(2+rand(6)),b=12*(1+rand(4));const gcd=(x,y)=>y?gcd(y,x%y):x,ans=gcd(a,b);
      const m=shuf4(String(ans),[String(ans*2),String(Math.floor(ans/2)||1),String(a-b||ans+1)],k=>ans+k);
      return {q:`輾轉相除法：(${a}, ${b}) 的最大公因數是多少？`,opts:m.opts,ans:m.ans,sol:`${a} 與 ${b} 的最大公因數為 ${ans}。`,tag:'輾轉相除'};}},
  m2:{n:'三角壁畫',who:'畢達哥拉斯的殘影',card:'pythaC',col:'#ff9a5a',
    tale:'壁畫上是一個直角三角形，三邊各長出一個正方形。<br>「兩個小的加起來，剛好等於大的。看懂了嗎？」',
    q:()=>{const t=[[3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15]][rand(5)],mode=rand(3);
      if(mode===1){const hide=rand(2),ans=t[hide],known=t[1-hide],m=shuf4(String(ans),[String(known),String(t[2]-1),String(t[2]+1)],k=>ans+k+2);
        return {fig:figRightTriangle(t[0],t[1],t[2],hide===0?'a':'b'),q:`直角三角形斜邊 ${t[2]}、一股 ${known}，另一股是多少？`,opts:m.opts,ans:m.ans,sol:`另一股 = √(${t[2]}²−${known}²) = ${ans}。`,tag:'畢氏定理求股'};}
      if(mode===2){const ans=t[0]*t[1]/2,m=shuf4(String(ans),[String(t[0]*t[1]),String(t[0]+t[1]),String(t[2]*2)],k=>ans+k+3);
        return {fig:figTriArea(t[0],t[1]),q:`直角三角形兩股為 ${t[0]}、${t[1]}，面積是多少？`,opts:m.opts,ans:m.ans,sol:`面積 = 底×高÷2 = ${t[0]}×${t[1]}÷2 = ${ans}。`,tag:'三角形面積'};}
      const m=shuf4(String(t[2]),[String(t[0]+t[1]),String(t[2]+1),String(t[2]-1)],k=>t[2]+k+1);
      return {q:`直角三角形兩股為 ${t[0]} 與 ${t[1]}，斜邊長多少？`,opts:m.opts,ans:m.ans,
        fig:figRightTriangle(t[0],t[1],t[2],'c'),sol:`${t[0]}²+${t[1]}² = ${t[0]*t[0]}+${t[1]*t[1]} = ${t[2]*t[2]} = ${t[2]}²，故斜邊 ${t[2]}。`,tag:'畢氏定理'};}},
  m3:{n:'數列壁畫',who:'高斯的殘影',card:'gaussC',col:'#ffe38a',
    tale:'壁畫上密密麻麻寫著 1 到 100。<br>「老師罰我們加總，我一分鐘就交卷了。你知道我怎麼做的嗎？」',
    q:()=>{const mode=rand(3),n=[10,20,50,100][rand(4)];
      if(mode===1){const a=2+rand(7),d=1+rand(5),k=5+rand(8),ans=a+(k-1)*d,m=shuf4(String(ans),[String(a+k*d),String(a+(k-2)*d),String(k*d)],x=>ans+x+2);
        return {q:`等差數列首項 ${a}、公差 ${d}，第 ${k} 項是多少？`,opts:m.opts,ans:m.ans,sol:`aₙ=a₁+(n−1)d=${a}+${k-1}×${d}=${ans}。`,tag:'等差數列'};}
      if(mode===2){const a=2+rand(5),d=1+rand(4),k=6+rand(7),last=a+(k-1)*d,ans=k*(a+last)/2,m=shuf4(String(ans),[String(k*(a+last)),String(last*k/2),String(ans+d*k)],x=>ans+x*k);
        return {q:`等差數列 ${a}、${a+d}、…、${last}（共 ${k} 項）的總和？`,opts:m.opts,ans:m.ans,sol:`Sₙ=n(a₁+aₙ)/2=${k}×(${a}+${last})÷2=${ans}。`,tag:'等差級數'};}
      const ans=n*(n+1)/2;
      const m=shuf4(String(ans),[String(n*n),String(ans*2),String(n*(n-1)/2)],k=>ans+k*n);
      return {q:`1 + 2 + 3 + … + ${n} = ?`,opts:m.opts,ans:m.ans,
        sol:`Sₙ = n(n+1)/2 = ${n}×${n+1}/2 = ${ans}。`,tag:'高斯求和'};}},
};
let muralSeen={};

/* ═══ 迷宮謎題 ═══ */

/* ═══════════════ 進階題型 1：找錯題 ═══════════════
   給一段有錯的推導，點出錯的那一行。專打經典迷思。 */

/* ═══════════════ 進階題型 2：步驟排序 ═══════════════
   解題步驟＝出牌序列。照順序點，順序錯就斷鏈。 */

/* ═══════════════ 進階題型 3：互動幾何 ═══════════════
   用操作代替選擇：親手把面積搬過去、把角撕下來拼成直線。 */

const GEO_PUZZLES=[geoPythagoras,geoTriangleSum];

/* ═══════════════ 程序生成題庫 ═══════════════
   內建題庫只有 63 題，抽久了一定重複。
   這裡依冊別各寫數個生成器，每次都算出新的數字 → 題目幾乎不重複。
   所有答案都由程式即時計算，不是預先寫死的。 */
const gcd2=(a,b)=>b?gcd2(b,a%b):Math.abs(a);
const lcm2=(a,b)=>Math.abs(a*b)/gcd2(a,b);
const isP=n=>{if(n<2)return false;for(let i=2;i*i<=n;i++)if(n%i===0)return false;return true;};
const rint=(a,b)=>a+rand(b-a+1);
const nzv=v=>v===0?1:v;
const sgn=v=>v<0?'−'+Math.abs(v):''+v;
const par=v=>v<0?'('+sgn(v)+')':''+v;
const simp=(n,d)=>{const g=gcd2(n,d)||1;return [n/g,d/g];};
const fr=(n,d)=>{const [a,b]=simp(n,d);return b===1?''+a:a+'/'+b;};

const QGEN={
1:[ // 七上：整數、因數倍數、分數
 ()=>{const T=tierFor('整數加法');
   const hi=tv(T,9,20,50);
   const a=rint(-hi,-1),b=rint(-hi,-1),r=a+b;
   // 挑戰層改成三數連加，需要更長的運算鏈
   if(T>=3){ const c=rint(-hi,hi)||-3, r3=a+b+c;
     return {q:`${par(a)} + ${par(b)} + ${par(c)} = ?`,
       ...shuf4(sgn(r3),[sgn(a+b-c),sgn(-r3),sgn(r3+2)],g=>sgn(r3+g+3)),
       sol:`由左而右：${par(a)}+${par(b)} = ${a+b}，再 ${c<0?'−':'+'} ${Math.abs(c)} = ${sgn(r3)}`,
       tag:'整數加法',tier:T};}
   return {q:`${par(a)} + ${par(b)} = ?`,...shuf4(sgn(r),[sgn(a-b),sgn(-r),sgn(r+1)],g=>sgn(r+g+1)),
     sol:`同號相加：絕對值相加、符號不變 → ${sgn(r)}`,tag:'整數加法',tier:T};},
 ()=>{const a=rint(1,15),b=rint(-15,-1),r=a+b;
   return {q:`${par(a)} + ${par(b)} = ?`,...shuf4(sgn(r),[sgn(a-b),sgn(-r),sgn(a+Math.abs(b))],g=>sgn(r+g+1)),
     sol:`異號相加：大絕對值減小絕對值，符號跟絕對值大的 → ${sgn(r)}`,tag:'整數加法'};},
 ()=>{const a=rint(-15,15),b=rint(-15,-1),r=a-b;
   return {q:`${par(a)} − ${par(b)} = ?`,...shuf4(sgn(r),[sgn(a+b),sgn(-r),sgn(r-1)],g=>sgn(r+g+1)),
     sol:`減去一個負數等於加上它：${sgn(a)} + ${Math.abs(b)} = ${sgn(r)}`,tag:'整數減法'};},
 ()=>{const a=rint(-9,-2),b=rint(-9,-2),r=a*b;
   return {q:`${par(a)} × ${par(b)} = ?`,...shuf4(sgn(r),[sgn(-r),sgn(a+b),sgn(r+a)],g=>sgn(r+g)),
     sol:`負負得正：${Math.abs(a)}×${Math.abs(b)} = ${r}`,tag:'整數乘法'};},
 ()=>{const T=tierFor('最大公因數');
   const hi=tv(T,9,20,40), mul=tv(T,2,3,6);
   const n=rint(2,hi),m=rint(2,hi),g=gcd2(n*mul,m*mul);
   const a=n*mul,b=m*mul;
   return {q:`(${a}, ${b}) 的最大公因數是多少？`,...shuf4(''+g,[''+(g*2),''+(g/3||1),''+Math.abs(a-b)],k=>''+(g+k)),
     sol:`${a} 與 ${b} 的公因數中最大的是 ${g}`,tag:'最大公因數',tier:T};},
 ()=>{const a=rint(2,12),b=rint(2,12),l=lcm2(a,b);
   return {q:`[${a}, ${b}] 的最小公倍數是多少？`,...shuf4(''+l,[''+(a*b),''+(l*2),''+gcd2(a,b)],k=>''+(l+k)),
     sol:`${a} 與 ${b} 的公倍數中最小的是 ${l}`,tag:'最小公倍數'};},
 ()=>{const n=rint(10,60);
   return {q:`${n} 是質數嗎？`,...shuf4(isP(n)?'是質數':'不是質數',[isP(n)?'不是質數':'是質數'],g=>'選項'+g),
     sol:isP(n)?`${n} 只有 1 和自己兩個因數`:`${n} 可以被 ${[...Array(n).keys()].slice(2).find(d=>n%d===0)} 整除`,tag:'質數'};},
 ()=>genNegFracCmp(),
 ()=>genNegMul(),
 ()=>genNegDiv(),
 ()=>{const a=rint(-15,-1);
   return {q:`|${a}| = ?`,...shuf4(''+Math.abs(a),[sgn(a),'0',''+(Math.abs(a)+1)],g=>''+(Math.abs(a)+g+1)),
     sol:`絕對值是到原點的距離，恆為非負 → |${a}| = ${Math.abs(a)}`,tag:'絕對值'};},
 ()=>{const a=rint(-12,12)||5;
   return {q:`${par(a)} 的相反數是多少？`,...shuf4(sgn(-a),[sgn(a),''+Math.abs(a),'0'],g=>sgn(-a+g+1)),
     sol:`相反數相加為 0：${sgn(a)} + ${sgn(-a)} = 0`,tag:'相反數'};},
 ()=>{const b=rint(2,9),q0=rint(-9,-2),a=b*q0;
   return {q:`${par(a)} ÷ ${b} = ?`,...shuf4(sgn(q0),[sgn(-q0),sgn(q0-1),sgn(a+b)],g=>sgn(q0+g+1)),
     sol:`異號相除得負：${Math.abs(a)} ÷ ${b} = ${Math.abs(q0)} → ${sgn(q0)}`,tag:'負數除法'};},
 ()=>{const a=rint(-9,-2),b=rint(2,9),c=rint(-9,-2),r=a*b+c;
   return {q:`${par(a)} × ${b} ${c<0?'−':'+'} ${Math.abs(c)} = ?`,
     ...shuf4(sgn(r),[sgn(a*b-c),sgn(-r),sgn(a*(b+c))],g=>sgn(r+g+1)),
     sol:`先乘除後加減：${par(a)}×${b} = ${a*b}，再 ${c<0?'−':'+'} ${Math.abs(c)} → ${r}`,tag:'負數四則'};},
 ()=>{const b=rint(2,9),c=rint(2,9),a=rint(1,b-1),e=rint(1,c-1);
   const n=a*c-e*b, d=b*c;                       // 負分數減法：結果可能為負
   return {q:`${a}/${b} − ${e}/${c} = ?`,
     ...shuf4(fr(n,d),[fr(-n,d),fr(a-e,b-c||1),fr(n+1,d)],g=>fr(n+g+1,d)),
     sol:`通分：${a*c}/${d} − ${e*b}/${d} = ${fr(n,d)}${n<0?'（結果為負）':''}`,
     tag:'負分數減法'};},
 ()=>{const a=rint(-9,-2),b=rint(2,9),c=rint(2,9),r=a*b/c;
   const aa=a*c;                                  // 保證整除
   return {q:`${par(aa*b/c*0+aa)} × ${b} ÷ ${c} = ?`,
     ...shuf4(sgn(a*b),[sgn(-a*b),sgn(a*c),sgn(a*b+1)],g=>sgn(a*b+g+1)),
     sol:`先乘後除：${par(aa)}×${b} = ${aa*b}，再 ÷${c} = ${sgn(a*b)}（負÷正＝負）`,
     tag:'負數乘除混合'};},
 ()=>{const a=rint(-12,-1),b=rint(1,12),r=Math.abs(a)-Math.abs(b);
   return {q:`先分別算絕對值，再相減：|${a}| − |${b}| = ?`,
     ...shuf4(sgn(r),[sgn(a-b),sgn(-r),sgn(Math.abs(a+b))],g=>sgn(r+g+1)),
     sol:`兩個絕對值本身都不會是負數；本題是算完後再相減：${Math.abs(a)} − ${b} = ${sgn(r)}。`,tag:'絕對值運算'};},
 ()=>{const b1=rint(2,9),b2=rint(2,9),a1=rint(1,b1-1),a2=rint(1,b2-1);
   const n=a1*b2+a2*b1,d=b1*b2;
   return {q:`${a1}/${b1} + ${a2}/${b2} = ?`,...shuf4(fr(n,d),[fr(a1+a2,b1+b2),fr(n+1,d),fr(a1*a2,b1*b2)],g=>fr(n+g+1,d)),
     sol:`通分：${a1*b2}/${d} + ${a2*b1}/${d} = ${fr(n,d)}`,tag:'分數加法'};},
],
2:[ // 七下：聯立、坐標、比例、不等式
 ()=>{const T=tierFor('二元一次聯立');
   const hi=tv(T,6,12,20);
   const x=rint(1,hi),y=rint(1,hi);
   // 挑戰層改成係數不為 1，必須先消元
   if(T>=3){ const a=rint(2,4),b=rint(2,4);
     return {q:`解聯立：${a}x + y = ${a*x+y}　x + ${b}y = ${x+b*y}`,
       ...shuf4(`(${x}, ${y})`,[`(${y}, ${x})`,`(${x+1}, ${y})`,`(${x}, ${y+1})`],g=>`(${x+g+1}, ${y})`),
       sol:`第一式 ×${b} 減第二式消去 y → x = ${x}，代回得 y = ${y}`,
       tag:'二元一次聯立',tier:T};}
   return {q:`解聯立：x + y = ${x+y}　x − y = ${x-y}`,
     ...shuf4(`(${x}, ${y})`,[`(${y}, ${x})`,`(${x+1}, ${y-1})`,`(${x-1}, ${y+1})`],g=>`(${x+g}, ${y})`),
     sol:`兩式相加得 2x = ${2*x} → x = ${x}，代回得 y = ${y}`,tag:'二元一次聯立',tier:T};},
 ()=>{const x=nzv(rint(-6,6)),y=nzv(rint(-6,6));
   const q=x>0?(y>0?'第一象限':'第四象限'):(y>0?'第二象限':'第三象限');
   return {q:`點 (${sgn(x)}, ${sgn(y)}) 在第幾象限？`,
     ...shuf4(q,['第一象限','第二象限','第三象限','第四象限'].filter(v=>v!==q),g=>'象限'+g),
     sol:`x ${x>0?'為正':'為負'}、y ${y>0?'為正':'為負'} → ${q}`,tag:'象限'};},
 ()=>{const a=rint(2,6),x=rint(-9,-2),c=a*x;
   return {q:`解不等式：${a}x ≥ ${sgn(c)}`,
     ...shuf4(`x ≥ ${sgn(x)}`,[`x ≤ ${sgn(x)}`,`x ≥ ${sgn(-x)}`,`x ≤ ${sgn(-x)}`],
       g2=>`x ≥ ${sgn(x+g2+1)}`),
     sol:`兩邊除以正數 ${a}，不等號不變 → x ≥ ${sgn(x)}`,tag:'不等式（負數解）'};},
 ()=>{const a=rint(2,6),x=rint(2,9),c=-a*x;
   return {q:`解不等式：${sgn(-a)}x ≤ ${sgn(c)}`,
     ...shuf4(`x ≥ ${x}`,[`x ≤ ${x}`,`x ≥ ${-x}`,`x ≤ ${-x}`],g2=>`x ≥ ${x+g2+1}`),
     sol:`兩邊除以負數 ${sgn(-a)}，<b>不等號要變向</b> → x ≥ ${x}`,tag:'負係數不等式'};},
 ()=>{const x=rint(-8,-1),y=rint(-8,-1);
   return {q:`點 (${sgn(x)}, ${sgn(y)}) 到 y 軸的距離是多少？`,
     ...shuf4(''+Math.abs(x),[''+Math.abs(y),sgn(x),''+(Math.abs(x)+Math.abs(y))],
       g2=>''+(Math.abs(x)+g2+1)),
     sol:`到 y 軸的距離 = |x 坐標| = |${sgn(x)}| = ${Math.abs(x)}`,tag:'負坐標距離'};},
 ()=>{const g=rint(2,9),a=g*rint(2,6),b=g*rint(2,6);
   const [p1,q1]=simp(a,b);
   return {q:`把 ${a}:${b} 化成最簡整數比`,...shuf4(`${p1}:${q1}`,[`${a/2}:${b/2}`,`${q1}:${p1}`,`${p1+1}:${q1}`],k=>`${p1+k}:${q1+k}`),
     sol:`同除以最大公因數 ${gcd2(a,b)} → ${p1}:${q1}`,tag:'最簡整數比'};},
 ()=>{const a=rint(2,9),b=rint(2,9),x=rint(2,9);
   return {q:`解比例式：${a} : ${b} = ${a*x} : ?`,...shuf4(''+(b*x),[''+(b+x),''+(a*x),''+(b*x+b)],g=>''+(b*x+g)),
     sol:`兩邊同乘 ${x} 倍 → ${b}×${x} = ${b*x}`,tag:'比例式'};},
 ()=>{const x=rint(-8,-1),y=rint(1,9);
   return {q:`解聯立：x + y = ${sgn(x+y)}　x − y = ${sgn(x-y)}`,
     ...shuf4(`(${sgn(x)}, ${sgn(y)})`,[`(${sgn(y)}, ${sgn(x)})`,`(${sgn(-x)}, ${sgn(y)})`,`(${sgn(x)}, ${sgn(-y)})`],
       g=>`(${sgn(x+g+1)}, ${sgn(y)})`),
     sol:`兩式相加：2x = ${sgn(2*x)} → x = ${sgn(x)}，代回得 y = ${y}`,tag:'聯立（負解）'};},
 ()=>{const a=rint(-6,-2),b=rint(-9,9),x=rint(-5,5),y=a*x+b;
   return {q:`f(x) = ${sgn(a)}x ${b<0?'−':'+'} ${Math.abs(b)}，求 f(${sgn(x)})`,
     ...shuf4(sgn(y),[sgn(-y),sgn(a*x-b),sgn(y+a)],g=>sgn(y+g+1)),
     sol:`${par(a)}×${par(x)} = ${a*x}，再 ${b<0?'−':'+'} ${Math.abs(b)} → ${sgn(y)}`,tag:'負斜率函數'};},
 ()=>{const a=rint(2,6),b=rint(5,40),n=Math.floor(b/a);
   return {q:`帶 ${b} 元買單價 ${a} 元的東西，最多買幾個？`,...shuf4(''+n,[''+(n+1),''+(b-a),''+Math.ceil(b/a)],g=>''+(n+g+1)),
     sol:`${a}x ≤ ${b} → x ≤ ${(b/a).toFixed(2)}，最多取 ${n} 個（無條件捨去）`,tag:'不等式應用'};},
 ()=>{const a=rint(2,6),b=rint(2,9),r=-b;
   return {q:`解不等式：−${a}x > ${a*b}`,...shuf4(`x < ${sgn(r)}`,[`x > ${sgn(r)}`,`x < ${b}`,`x > ${b}`],g=>`x < ${r+g}`),
     sol:`兩邊除以 −${a}，不等號要變號 → x < ${sgn(r)}`,tag:'不等式變號'};},
],
3:[ // 八上：乘法公式、平方根、因式分解、二次方程
 ()=>{const a=rint(1,15);
   return {q:`展開 (x + ${a})²`,...shuf4(`x² + ${2*a}x + ${a*a}`,
     [`x² + ${a*a}`,`x² + ${a}x + ${a*a}`,`x² + ${2*a}x + ${2*a}`],g=>`x² + ${2*a+g}x + ${a*a}`),
     sol:`(a+b)² = a²+2ab+b² → x² + ${2*a}x + ${a*a}`,tag:'完全平方'};},
 ()=>{const a=rint(1,15);
   return {q:`(x + ${a})(x − ${a}) = ?`,...shuf4(`x² − ${a*a}`,[`x² + ${a*a}`,`x² − ${2*a}x + ${a*a}`,`x² − ${a}`],g=>`x² − ${a*a+g}`),
     sol:`平方差公式 → x² − ${a*a}`,tag:'平方差'};},
 ()=>genFactorSigned(),
 ()=>genMulFormula(),
 ()=>{const a=rint(1,12);
   return {q:`(${sgn(-a)} + x)(${sgn(-a)} − x) = ?`,
     ...shuf4(`${a*a} − x²`,[`x² − ${a*a}`,`${a*a} + x²`,`${-a*a} − x²`],g=>`${a*a+g+1} − x²`),
     sol:`平方差 (m+n)(m−n) = m²−n²，此處 m = ${sgn(-a)} → (${sgn(-a)})² − x² = ${a*a} − x²`,
     tag:'平方差（負）'};},
 ()=>{const x=rint(-9,-2),a=rint(1,6);
   const r=x*x+a*x;
   return {q:`當 x = ${sgn(x)} 時，x² + ${a}x 的值是多少？`,
     ...shuf4(sgn(r),[sgn(-r),sgn(x*x-a*x),sgn(r+a)],g=>sgn(r+g+1)),
     sol:`(${sgn(x)})² = ${x*x}（負數平方為正），${a}×(${sgn(x)}) = ${a*x} → ${x*x} + ${a*x} = ${sgn(r)}`,
     tag:'負數代入求值'};},
 ()=>{const k=rint(2,7),m=rint(2,9),n=k*k*m;
   return {q:`${sgn(-1)} × √${n} 化簡後是多少？`,
     ...shuf4(`−${k}√${m}`,[`${k}√${m}`,`−${m}√${k}`,`−${k*m}`],g=>`−${k+g+1}√${m}`),
     sol:`√${n} = ${k}√${m}，前面的負號保留 → −${k}√${m}`,tag:'負根式化簡'};},
 ()=>{const T=tierFor('因式分解');
   const hi=tv(T,6,12,20);
   const a=rint(1,hi),b=rint(1,hi);
   // 挑戰層加上首項係數，需要十字交乘
   if(T>=3){ const k=rint(2,4);
     return {q:`因式分解：${k}x² + ${k*b+a}x + ${a*b}`,
       ...shuf4(`(${k}x+${a})(x+${b})`,
         [`(x+${a})(${k}x+${b})`,`(${k}x+${b})(x+${a})`,`(${k}x+${a*b})(x+1)`],
         g=>`(${k}x+${a+g+1})(x+${b})`),
       sol:`十字交乘：${k}x·x 與 ${a}·${b}；中項 ${k}×${b} + ${a} = ${k*b+a} ✓`,
       tag:'因式分解',tier:T};}
   return {q:`因式分解：x² + ${a+b}x + ${a*b}`,...shuf4(`(x+${a})(x+${b})`,
     [`(x+${a+1})(x+${b})`,`(x+${a*b})(x+${a+b})`,`(x−${a})(x−${b})`],g=>`(x+${a+g})(x+${b})`),
     sol:`找兩數積 ${a*b}、和 ${a+b} → ${a} 與 ${b}`,tag:'因式分解',tier:T};},
 ()=>{const t=[[3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15]][rand(5)];
   const which=rand(2);   // 求股，不是只求斜邊
   const known=which?t[0]:t[1], ans=which?t[1]:t[0];
   return {q:`直角三角形斜邊 ${t[2]}、一股 ${known}，另一股多長？`,
     ...shuf4(''+ans,[''+(t[2]-known),''+(t[2]+known),''+(ans+1)],g=>''+(ans+g+1)),
     fig:figRightTriangle(which?known:ans,which?ans:known,t[2],which?'b':'a'),
     sol:`${t[2]}² − ${known}² = ${t[2]**2-known**2} = ${ans}² → 另一股 ${ans}`,tag:'畢氏定理（求股）'};},
 ()=>{const t=[[3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15],[7,24,25],[12,16,20],[10,24,26],[15,20,25],[20,21,29],[9,40,41],[12,35,37]][rand(12)];
   return {q:`直角三角形兩股 ${t[0]}、${t[1]}，斜邊多長？`,...shuf4(''+t[2],[''+(t[0]+t[1]),''+(t[2]+1),''+(t[2]-1)],g=>''+(t[2]+g+1)),
     fig:figRightTriangle(t[0],t[1],t[2],'c'),
     sol:`${t[0]}²+${t[1]}² = ${t[0]**2+t[1]**2} = ${t[2]}² → 斜邊 ${t[2]}`,tag:'畢氏定理'};},
 ()=>{const a=rint(1,12);
   return {q:`展開 (x − ${a})²`,...shuf4(`x² − ${2*a}x + ${a*a}`,
     [`x² + ${2*a}x + ${a*a}`,`x² − ${a*a}`,`x² − ${2*a}x − ${a*a}`],g=>`x² − ${2*a+g}x + ${a*a}`),
     sol:`(a−b)² = a²−2ab+b² → x² − ${2*a}x + ${a*a}`,tag:'完全平方（負）'};},
 ()=>{const a=rint(2,9),b=rint(1,a-1),mid=a-b;
   return {q:`因式分解：x² ${mid<0?'−':'+'} ${Math.abs(mid)}x − ${a*b}`,
     ...shuf4(`(x+${a})(x−${b})`,[`(x−${a})(x+${b})`,`(x+${a})(x+${b})`,`(x−${a})(x−${b})`],
       g=>`(x+${a+g})(x−${b})`),
     sol:`常數項為負 → 兩數異號；積 ${a*b}、和 ${mid} → +${a} 與 −${b}`,tag:'異號因式分解'};},
 ()=>{const a=rint(1,8),b=rint(1,8);
   return {q:`解方程式：x² + ${a+b}x + ${a*b} = 0`,
     ...shuf4(`x = ${sgn(-a)} 或 ${sgn(-b)}`,[`x = ${a} 或 ${b}`,`x = ${sgn(-a)} 或 ${b}`,`x = ${sgn(-a-b)}`],
       g=>`x = ${sgn(-a-g-1)} 或 ${sgn(-b)}`),
     sol:`(x+${a})(x+${b}) = 0 → x = ${sgn(-a)} 或 ${sgn(-b)}`,tag:'二次方程（負根）'};},
 ()=>{const k=rint(2,9),m=rint(2,15),n=k*k*m;
   return {q:`化簡 √${n}`,...shuf4(`${k}√${m}`,[`${m}√${k}`,`${k*m}`,`${k+1}√${m}`],g=>`${k+g}√${m}`),
     sol:`${n} = ${k*k}×${m}，√${k*k} = ${k} → ${k}√${m}`,tag:'最簡根式'};},
 ()=>{const a=rint(1,12),b=rint(1,12);
   return {q:`解方程式：x² − ${a+b}x + ${a*b} = 0`,...shuf4(`x = ${a} 或 ${b}`,
     [`x = ${-a} 或 ${-b}`,`x = ${a+b}`,`x = ${a*b}`],g=>`x = ${a+g} 或 ${b}`),
     sol:`(x−${a})(x−${b}) = 0 → x = ${a} 或 ${b}`,tag:'二次方程式'};},
],
4:[ // 八下：數列、一次函數、三角形、四邊形
 ()=>{const T=tierFor('等差一般項');
   const a1=rint(1,tv(T,6,12,30)),d=rint(2,tv(T,4,7,12)),n=rint(4,tv(T,8,12,25));
   const an=a1+(n-1)*d;
   // 挑戰層改成逆推：給第 n 項反求公差
   if(T>=3){
     return {q:`等差數列首項 ${a1}，第 ${n} 項是 ${an}，公差是多少？`,
       ...shuf4(''+d,[''+(d+1),''+Math.round(an/n),''+(an-a1)],g=>''+(d+g+1)),
       sol:`aₙ = a₁+(n−1)d → ${an} = ${a1}+${n-1}d → d = ${d}`,
       tag:'等差一般項',tier:T};}
   return {q:`等差數列首項 ${a1}、公差 ${d}，第 ${n} 項是多少？`,...shuf4(''+an,[''+(a1+n*d),''+(an-d),''+(a1*n)],g=>''+(an+g+1)),
     sol:`aₙ = a₁+(n−1)d = ${a1}+${n-1}×${d} = ${an}`,tag:'等差一般項',tier:T};},
 ()=>{const a1=rint(1,6),d=rint(1,5),n=rint(4,10),an=a1+(n-1)*d,S=n*(a1+an)/2;
   return {q:`等差數列首項 ${a1}、公差 ${d}、共 ${n} 項，總和是多少？`,...shuf4(''+S,[''+(n*an),''+(S*2),''+(a1+an)],g=>''+(S+g*2)),
     sol:`末項 ${an}；Sₙ = n(a₁+aₙ)/2 = ${n}×${a1+an}/2 = ${S}`,tag:'等差級數'};},
 ()=>{const a1=rint(5,20),d=rint(-7,-2),n=rint(4,10),an=a1+(n-1)*d;
   return {q:`等差數列首項 ${a1}、公差 ${sgn(d)}，第 ${n} 項是多少？`,
     ...shuf4(sgn(an),[sgn(a1+n*d),sgn(an-d),sgn(-an)],g=>sgn(an+g+1)),
     sol:`aₙ = a₁+(n−1)d = ${a1}+${n-1}×${par(d)} = ${sgn(an)}`,tag:'等差（負公差）'};},
 ()=>{const a1=rint(-12,-3),d=rint(2,6),n=rint(4,9),an=a1+(n-1)*d,S=n*(a1+an)/2;
   return {q:`等差數列首項 ${sgn(a1)}、公差 ${d}、共 ${n} 項，總和是多少？`,
     ...shuf4(sgn(S),[sgn(n*an),sgn(-S),sgn(a1+an)],g=>sgn(S+g*2+1)),
     sol:`末項 ${sgn(an)}；Sₙ = n(a₁+aₙ)/2 = ${n}×${par(a1+an)}/2 = ${sgn(S)}`,tag:'級數（負首項）'};},
 ()=>{const a1=rint(10,25),d=rint(-6,-2),n=rint(5,10);
   const an=a1+(n-1)*d, S=n*(a1+an)/2;
   return {q:`等差數列首項 ${a1}、公差 ${sgn(d)}、共 ${n} 項，總和是多少？`,
     ...shuf4(sgn(S),[sgn(-S),sgn(n*an),sgn(a1+an)],g=>sgn(S+g*2+1)),
     sol:`末項 ${sgn(an)}；Sₙ = ${n}×(${a1}${an<0?'−'+Math.abs(an):'+'+an})/2 = ${sgn(S)}`,
     tag:'負公差級數和'};},
 ()=>{const a1=rint(1,4),r=-rint(2,3),n=rint(3,5),an=a1*Math.pow(r,n-1);
   return {q:`等比數列首項 ${a1}、公比 ${sgn(r)}，第 ${n} 項是多少？`,
     ...shuf4(sgn(an),[sgn(-an),sgn(a1*r*n),sgn(an*r)],g=>sgn(an+g+1)),
     sol:`aₙ = ${a1}×(${sgn(r)})^${n-1} = ${sgn(an)}（負數的奇次方為負、偶次方為正）`,
     tag:'負公比等比'};},
 ()=>{const a1=rint(1,4),r=rint(2,4),n=rint(3,6),an=a1*r**(n-1);
   return {q:`等比數列首項 ${a1}、公比 ${r}，第 ${n} 項是多少？`,...shuf4(''+an,[''+(a1*r*n),''+(an*r),''+(a1+r*n)],g=>''+(an+g)),
     sol:`aₙ = a₁×r^(n−1) = ${a1}×${r}^${n-1} = ${an}`,tag:'等比數列'};},
 ()=>{const a=rint(2,6),b=rint(-9,9),x=rint(-5,5),y=a*x+b;
   return {q:`f(x) = ${a}x ${b<0?'−':'+'} ${Math.abs(b)}，求 f(${sgn(x)})`,...shuf4(sgn(y),[sgn(a*x-b),sgn(y+a),sgn(a+x)],g=>sgn(y+g+1)),
     sol:`${a}×(${sgn(x)}) ${b<0?'−':'+'} ${Math.abs(b)} = ${sgn(y)}`,tag:'函數值'};},
 ()=>{const A=rint(30,80),B=rint(30,80),C=180-A-B;
   if(C<20) return QGEN[4][0]();
   return {q:`三角形 ∠A=${A}°、∠B=${B}°，∠C 是幾度？`,...shuf4(C+'°',[(180-A)+'°',(A+B)+'°',(C+10)+'°'],g=>(C+g*5)+'°'),
     fig:figTriangle(A,B,C,'?'),
     sol:`內角和 180°：180−${A}−${B} = ${C}°`,tag:'內角和'};},
 ()=>{const A=rint(30,80),B=rint(30,80);
   return {fig:figTriangle(A,B,180-A-B,(A+B)+'°?'),
     q:`三角形 ∠A=${A}°、∠B=${B}°，∠C 的外角是幾度？`,...shuf4((A+B)+'°',[(180-A-B)+'°',(180-A)+'°',(A+B+10)+'°'],g=>(A+B+g*5)+'°'),
     sol:`外角等於不相鄰兩內角和：${A}+${B} = ${A+B}°`,tag:'外角定理'};},
],
5:[ // 九上：相似形、圓、二次函數
 ()=>{const b=rint(4,16),h=rint(3,14),ar=b*h/2;
   return {fig:figTriArea(b,h),q:`三角形底 ${b}、高 ${h}，面積是多少？`,
     ...shuf4(''+ar,[''+(b*h),''+(b+h),''+(ar+b)],g=>''+(ar+g+1)),
     sol:`三角形面積 = 底×高÷2 = ${b}×${h}÷2 = ${ar}`,tag:'三角形面積'};},
 ()=>{const r=rint(2,15);
   return {fig:figCircle(r),q:`半徑 ${r} 的圓，面積是多少？`,
     ...shuf4(`${r*r}π`,[`${2*r}π`,`${r}π`,`${r*r*2}π`],g=>`${r*r+g}π`),
     sol:`圓面積 = πr² = π×${r}² = ${r*r}π`,tag:'圓面積'};},
 ()=>{const k=rint(2,12);
   return {fig:figSimilar(k),q:`兩相似圖形邊長比 1:${k}，面積比是多少？`,...shuf4(`1:${k*k}`,[`1:${k}`,`1:${k*k*k}`,`1:${2*k}`],g=>`1:${k*k+g}`),
     sol:`面積比是邊長比的平方 → 1:${k}² = 1:${k*k}`,tag:'相似面積比'};},
 ()=>{const k=rint(2,12);
   return {q:`兩相似三角形面積比 1:${k*k}，邊長比是多少？`,...shuf4(`1:${k}`,[`1:${k*k}`,`1:${k*2}`,`1:${k+1}`],g=>`1:${k+g}`),
     sol:`邊長比 = √面積比 = √${k*k} = ${k} → 1:${k}`,tag:'相似邊長比'};},
 ()=>{const c=rint(10,89)*2;
   return {q:`圓心角 ${c}°，同弧的圓周角是幾度？`,...shuf4((c/2)+'°',[c+'°',(c*2)+'°',(c/2+10)+'°'],g=>(c/2+g*5)+'°'),
     fig:figCircleAngle(c,true),
     sol:`圓周角是圓心角的一半：${c}÷2 = ${c/2}°`,tag:'圓周角'};},
 ()=>{const r=rint(3,20),d=[30,45,60,90,120,135,150,180,240,270][rand(10)];
   const arc=fr(2*r*d,360);
   return {fig:figSector(r,d),q:`半徑 ${r}、圓心角 ${d}° 的弧長是多少？`,...shuf4(arc+'π',[fr(r*d,360)+'π',(2*r)+'π',fr(2*r*d,180)+'π'],g=>fr(2*r*d+g*360,360)+'π'),
     sol:`弧長 = 2πr × ${d}/360 = ${arc}π`,tag:'弧長'};},
 ()=>{const r=rint(3,20),d=[30,45,60,90,120,135,150,180,240,270][rand(10)];
   const ar=fr(r*r*d,360);
   return {fig:figSector(r,d),q:`半徑 ${r}、圓心角 ${d}° 的扇形面積是多少？`,...shuf4(ar+'π',[fr(2*r*d,360)+'π',(r*r)+'π',fr(r*r*d,180)+'π'],g=>fr(r*r*d+g*360,360)+'π'),
     sol:`扇形面積 = πr² × ${d}/360 = ${ar}π`,tag:'扇形面積'};},
 ()=>{const x1=rint(-9,-1),y1=rint(-9,-1),x2=rint(1,9),y2=rint(1,9);
   const mx=(x1+x2)/2, my=(y1+y2)/2;
   return {q:`A(${sgn(x1)}, ${sgn(y1)})、B(${x2}, ${y2}) 的中點坐標是？`,
     ...shuf4(`(${sgn(mx)}, ${sgn(my)})`,
       [`(${sgn(x1+x2)}, ${sgn(y1+y2)})`,`(${sgn(my)}, ${sgn(mx)})`,`(${sgn(-mx)}, ${sgn(my)})`],
       g=>`(${sgn(mx+g+1)}, ${sgn(my)})`),
     sol:`中點 = ((x₁+x₂)/2, (y₁+y₂)/2) = ((${sgn(x1)}+${x2})/2, (${sgn(y1)}+${y2})/2) = (${sgn(mx)}, ${sgn(my)})`,
     tag:'負坐標中點'};},
 ()=>{const h=rint(-5,-1),k=rint(-9,-1);
   return {q:`y = (x + ${Math.abs(h)})² − ${Math.abs(k)} 的頂點坐標是？`,
     ...shuf4(`(${sgn(h)}, ${sgn(k)})`,[`(${Math.abs(h)}, ${sgn(k)})`,`(${sgn(h)}, ${Math.abs(k)})`,`(${sgn(k)}, ${sgn(h)})`],
       g=>`(${sgn(h-g-1)}, ${sgn(k)})`),
     sol:`頂點式 y=a(x−h)²+k；(x+${Math.abs(h)}) 表示 h = ${sgn(h)} → (${sgn(h)}, ${sgn(k)})`,
     tag:'拋物線（負頂點）'};},
 ()=>{const h=rint(-5,5),k=rint(-9,9);
   return {q:`y = (x ${h<0?'+':'−'} ${Math.abs(h)})² ${k<0?'−':'+'} ${Math.abs(k)} 的頂點坐標是？`,
     ...shuf4(`(${sgn(h)}, ${sgn(k)})`,[`(${sgn(-h)}, ${sgn(k)})`,`(${sgn(k)}, ${sgn(h)})`,`(${sgn(h)}, ${sgn(-k)})`],g=>`(${sgn(h+g)}, ${sgn(k)})`),
     sol:`頂點式 y=a(x−h)²+k 的頂點是 (h, k) = (${sgn(h)}, ${sgn(k)})`,tag:'拋物線頂點'};},
],
6:[ // 九下：統計機率、立體圖形
 ()=>{const a=Array.from({length:5},()=>rint(2,20)).sort((x,y)=>x-y);
   return {q:`資料 ${a.join('、')} 的中位數是多少？`,...shuf4(''+a[2],[''+a[0],''+a[4],''+Math.round(a.reduce((x,y)=>x+y,0)/5)],g=>''+(a[2]+g)),
     sol:`排序後正中間（第 3 個）是 ${a[2]}`,tag:'中位數'};},
 ()=>{const a=Array.from({length:5},()=>rint(2,20));
   const m=a.reduce((x,y)=>x+y,0)/5;
   return {q:`資料 ${a.join('、')} 的平均數是多少？`,...shuf4(''+m,[''+a.sort((x,y)=>x-y)[2],''+(m+1),''+(m-1)],g=>''+(m+g+1)),
     sol:`總和 ${a.reduce((x,y)=>x+y,0)} ÷ 5 = ${m}`,tag:'平均數'};},
 ()=>{const a=Array.from({length:5},()=>rint(-12,8));
   const sum=a.reduce((x,y)=>x+y,0), m=sum/5;
   return {q:`五天氣溫 ${a.map(sgn).join('、')} °C，平均是多少？`,
     ...shuf4(sgn(m),[sgn(-m),sgn(m+2),sgn(m-3)],g=>sgn(m+g+3)),
     sol:`總和 ${sgn(sum)} ÷ 5 = ${sgn(m)} °C`,tag:'平均（含負數）'};},
 ()=>{const a=Array.from({length:5},()=>rint(-15,10)).sort((x,y)=>x-y);
   return {q:`資料 ${a.map(sgn).join('、')} 的中位數是多少？`,
     ...shuf4(sgn(a[2]),[sgn(a[0]),sgn(a[4]),sgn(-a[2])],g=>sgn(a[2]+g+1)),
     sol:`由小到大排序後正中間是 ${sgn(a[2])}`,tag:'中位數（含負數）'};},
 ()=>{const a=Array.from({length:5},()=>rint(-15,10));
   const mx=Math.max(...a), mn=Math.min(...a), rg=mx-mn;
   return {q:`資料 ${a.map(sgn).join('、')} 的全距是多少？`,
     ...shuf4(''+rg,[''+(mx+mn),sgn(mn),''+mx],g=>''+(rg+g+1)),
     sol:`全距 = 最大 − 最小 = ${sgn(mx)} − (${sgn(mn)}) = ${rg}`,tag:'全距（含負數）'};},
 ()=>{const t1=rint(-15,-1),t2=rint(-5,12),d=t2-t1;
   return {q:`氣溫從 ${sgn(t1)}°C 上升到 ${sgn(t2)}°C，上升了幾度？`,
     ...shuf4(''+d,[''+(t1+t2),sgn(-d),''+(Math.abs(t1)+Math.abs(t2))],g=>''+(d+g+1)),
     sol:`變化量 = 後 − 前 = ${sgn(t2)} − (${sgn(t1)}) = ${sgn(t2)} + ${Math.abs(t1)} = ${d}`,
     tag:'溫差（含負數）'};},
 ()=>{const T=tierFor('機率');
   const pool=tv(T,[6,8,10],[6,8,10,12,15,16,20],[12,15,16,20,24,25,30,36]);
   const n=pool[rand(pool.length)],k=rint(1,n-1);
   // 挑戰層改問「不是紅色」的機率，需要互補事件
   if(T>=3){
     return {q:`袋中 ${n} 顆球，${k} 顆紅色。隨機取一顆<b>不是紅色</b>的機率？`,
       ...shuf4(fr(n-k,n),[fr(k,n),fr(1,n),fr(n-k,k)],g=>fr(n-k+g,n)),
       sol:`互補事件：1 − ${fr(k,n)} = ${fr(n-k,n)}`,tag:'機率',tier:T};}
   return {q:`袋中 ${n} 顆球，其中 ${k} 顆是紅色。隨機取一顆是紅色的機率？`,
     ...shuf4(fr(k,n),[fr(n-k,n),fr(k,n-k),fr(1,n)],g=>fr(k+g,n)),
     sol:`有利 ${k} ÷ 全部 ${n} = ${fr(k,n)}`,tag:'機率',tier:T};},
 ()=>{const n=[3,4,5,6,8,10][rand(6)];
   return {q:`每次成功機率 1/${n}，連做兩次都失敗的機率是多少？`,
     ...shuf4(fr((n-1)*(n-1),n*n),[fr(1,n*n),fr(n-1,n),fr(2*(n-1),n*n)],g=>fr((n-1)*(n-1)+g,n*n)),
     sol:`(${n-1}/${n}) × (${n-1}/${n}) = ${fr((n-1)*(n-1),n*n)}`,tag:'兩階段事件'};},
 ()=>{const V=rint(4,16),E=rint(V+2,V+20),F=2-V+E;
   if(F<3) return QGEN[6][0]();
   return {q:`多面體有 ${V} 個頂點、${E} 條稜，有幾個面？`,...shuf4(''+F,[''+(F+2),''+(E-V),''+(V+E)],g=>''+(F+g)),
     sol:`歐拉公式 V−E+F=2 → F = 2−${V}+${E} = ${F}`,tag:'歐拉公式'};},
 ()=>{const r=rint(2,15),h=rint(3,20);
   return {fig:figCylinder(r,h),q:`半徑 ${r}、高 ${h} 的圓柱體積是多少？`,...shuf4(`${r*r*h}π`,[`${2*r*h}π`,`${r*h}π`,`${Math.round(r*r*h/3)}π`],g=>`${r*r*h+g}π`),
     sol:`V = πr²h = π×${r*r}×${h} = ${r*r*h}π`,tag:'圓柱體積'};},
 ()=>{const r=rint(3,14),h=3*rint(1,8);
   return {fig:figCone(r,h),q:`半徑 ${r}、高 ${h} 的圓錐體積是多少？`,...shuf4(`${r*r*h/3}π`,[`${r*r*h}π`,`${r*h}π`,`${r*r*h/2}π`],g=>`${r*r*h/3+g}π`),
     sol:`V = ⅓πr²h = ⅓×π×${r*r}×${h} = ${r*r*h/3}π`,tag:'圓錐體積'};},
],
};
/* 不重複輪替：把題目洗牌後依序發，發完才重洗 */
let qQueue={};

/* ═══════════════ 出牌動畫佇列 ═══════════════
   設計重點：出牌【立即生效】，動畫只是視覺回饋，永遠不擋輸入。
   連續點擊時卡片會在右側排隊，依序飛出 —— 排得越多播得越快，
   讓「快速連點」本身就有加速感。 */
let animQ=[], animRunning=false;
/* 稀有度安全取值：避免任何一張卡漏設 r 就顯示 undefined */
function rarityOf(c){ return RARITY[(c&&c.r)||'C'] || RARITY.C; }
function rarityAbilityText(c){
  if(!c)return '';
  if(c.r==='R')return '精準文具：每回合首次使用，返還 1 法力並獲得 3 護盾';
  if(c.r==='L')return '靈感突破：每場戰鬥首次使用，返還 2 法力並抽 1 張';
  return '';
}
/* 每張卡的專屬圖示 —— 依卡牌本身的意象，而不是只看效果類型 */
const CARD_ICON={
  // 文具攻擊：只更換可見意象，內部代號保留以相容舊存檔
  knife:'✏️', dagger:'🖍️', edge:'✒️', wand:'🖊️', holy:'🖋️',
  whip:'📏', bloody:'📐', axe:'✂️', garlic:'🧭', water:'🖌️',
  poe:'💧', cross:'📐', heaven:'◉', bible:'📘', vespers:'📚',
  imelda:'📝', antonio:'📎', pasqua:'✂️', pebble:'▱', guard:'📋',
  // 萬用／特殊文具
  blank:'📓', clock:'⏱️', candle:'🖍️', trip:'🖇️', coin:'🪙',
  spring:'🖋️', wellspring:'✒️', scroll:'🗂️', curse:'🗒️',
  // 負費
  nDebt:'📄', nOver:'▱', nInv:'📏', nImag:'🖊️', nUnit:'🧾',
  // 數學家傳說
  gaussC:'🔢', pythaC:'📐', euclidC:'📏', fermatC:'🧩',
  pascalC:'🔺', eulerC:'🌌', archiC:'⚖', descartesC:'🧭',
  // 合成卡
  fLine:'📏', fDist:'📓', fSquare:'📋', fMul:'🔖', fSeries:'🖋️',
  fDiff:'📐', fQuad:'📊', fPerfect:'🗂️', fArith:'🧮',
  fDisc:'🧾', fGauss:'📈',
};
function cardIcon(c,id){
  if(c&&/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(String(c.iconData||'')))return '<img src="'+hesc(c.iconData)+'" alt="'+hesc(c.n||'裝備')+'">';
  if(id&&CARD_ICON[id]) return CARD_ICON[id];
  // 沒有專屬圖示時依效果推斷（保底，不會出現空白）
  if(!c) return '⚔';
  if(c.CURSE) return '💀';
  if(c.wild)  return '✦';
  if(c.neg)   return '⟲';
  if(c.sp)    return '📐';
  if(c.capUp) return '📜';
  if(c.manaGain) return '💧';
  if(c.block && !c.dmg) return '🛡';
  if(!c.dmg && c.draw) return '📖';
  if(c.all)   return '💥';
  if((c.hits||1)>1) return '🗡';
  if(c.burn)  return '🔥';
  if(c.drain) return '🩸';
  return '⚔';
}
function queueCardAnim(o,targetUid,hits,chain){
  animQ.push({o,targetUid,hits:hits||[],chain:chain||1});
  renderAnimQ();
  runAnimQ();
}
function renderAnimQ(){
  const w=$('animQ'); if(!w)return;
  const cnt2=$('animCnt');
  if(cnt2){
    const n=animQ.length+animActive;
    cnt2.textContent=n>1?('連鎖 ×'+n):'';
    cnt2.classList.toggle('hot',n>=4);
  }
  w.innerHTML=animQ.slice(0,6).map((it,i)=>{
    const c=effCard(it.o);
    return `<div class="qchip" style="opacity:${1-i*0.13}">
      <span class="qi">${cardIcon(c,it.o&&it.o.id)}</span><span class="qc">${cardCostText(c)}</span></div>`;
  }).join('');
  w.classList.toggle('hide',!animQ.length);
  const cnt=$('animCnt');
  if(cnt){ cnt.textContent=animQ.length>1?('×'+animQ.length):''; }
}
let animActive=0, animPaused=false;
/* 前一版把動畫壓到 70ms 以「跟上手速」，結果佇列瞬間清空、看不到累積效果。
   正確做法是解耦：輸入永遠即時，動畫拉長到看得清楚，
   但允許同時播 3 個並錯開launch → 連點後會看到一整串連續演出。 */
function runAnimQ(){
  if(animPaused) return;
  let launched=0;
  while(animActive<3 && animQ.length){
    const item=animQ.shift();
    animActive++;
    const dur = animQ.length>=6?300 : animQ.length>=3?360 : 420;
    const delay=launched*90;               // 錯開起飛，形成連續感
    launched++;
    setTimeout(()=>{
      playFx(item,dur,()=>{
        animActive--;
        renderAnimQ();
        runAnimQ();
      });
    },delay);
  }
  renderAnimQ();
  if(!animQ.length && animActive===0) animRunning=false;
}
function flyCard(item,dur,done){
  const field=$('field');
  if(!field){ done&&done(); return; }
  const c=effCard(item.o);
  const el=document.createElement('div');
  el.className='flycard';
  el.innerHTML=`<span class="fi">${cardIcon(c,item.o&&item.o.id)}</span>`;
  // 起點：右側佇列；終點：目標敵人（沒有就打中央）
  const fw=field.clientWidth, fh=field.clientHeight;
  let tx=fw*0.5, ty=fh*0.45;
  const t=document.getElementById(item.targetUid);
  if(t){ tx=parseFloat(t.style.left||0)+parseFloat(t.style.width||60)/2;
         ty=parseFloat(t.style.top||0)+30; }
  el.style.left=(fw-46)+'px';
  el.style.top=(fh*0.62)+'px';
  field.appendChild(el);
  requestAnimationFrame(()=>{
    el.style.transition=`left ${dur}ms cubic-bezier(.4,0,.7,1), top ${dur}ms cubic-bezier(.4,0,.7,1), transform ${dur}ms`;
    el.style.left=(tx-20)+'px';
    el.style.top=(ty-20)+'px';
    el.style.transform='scale(1.5) rotate(-18deg)';
  });
  setTimeout(()=>{
    el.classList.add('burst');
    if(t){ t.classList.remove('hurt'); void t.offsetWidth; t.classList.add('hurt'); }
    setTimeout(()=>{ el.remove(); done&&done(); },30);
  },dur);
}

/* ═══════════════ 出牌瞬間的卡片飛出 ═══════════════
   點下去的那張卡會化成殘影衝向戰場 —— 把「我打了這張」的因果連起來。 */
function cardLaunch(el){
  if(!el)return;
  const field=$('field'); if(!field)return;
  const r=el.getBoundingClientRect(), fr=field.getBoundingClientRect();
  const ghost=el.cloneNode(true);
  ghost.className='cardGhost';
  ghost.style.left=(r.left-fr.left)+'px';
  ghost.style.top=(r.top-fr.top)+'px';
  ghost.style.width=r.width+'px';
  ghost.style.height=r.height+'px';
  field.appendChild(ghost);
  requestAnimationFrame(()=>ghost.classList.add('go'));
  setTimeout(()=>ghost.remove(),420);
}
/* 命中停格：大傷害時短暫凍結，讓打擊感落地 */
let hitStopUntil=0;
function hitStop(ms){
  const b=$('battle'); if(!b)return;
  hitStopUntil=Date.now()+ms;
  b.classList.add('hitstop');
  setTimeout(()=>{ if(Date.now()>=hitStopUntil) b.classList.remove('hitstop'); },ms);
}
/* 投射物拖尾：沿路灑下淡出的光點 */
const FX_SEL='.fx-blade,.fx-fire,.fx-drop,.fx-spark,.fx-mote,.fx-ring,.fx-orbit,.fx-trail,.fx-bolt';
const FX_LIMIT=46;
function emitTrail(field,el,dur,color,count){
  let n=0;
  const iv=setInterval(()=>{
    if(n++>=count||!el.isConnected){ clearInterval(iv); return; }
    // 拖尾也必須受特效上限管制，否則會繞過保護把 DOM 撐爆
    if(field.querySelectorAll(FX_SEL).length>=FX_LIMIT) return;
    const t=document.createElement('i');
    t.className='fx-trail';
    t.style.left=el.style.left; t.style.top=el.style.top;
    t.style.background=color||'#ffe38a';
    field.appendChild(t);
    setTimeout(()=>t.remove(),380);
  },Math.max(40,dur/(count+1)));
}

/* ═══════════════ 卡牌詳情面板（像素 RPG 風格）═══════════════
   參考裝備詳情的資訊層次：品質標籤 → 大數值 → 雙欄屬性 → 鑲嵌效果。
   讓學生一眼看懂「這張卡強在哪」，而不是只看到小卡片上的兩行字。 */
const RARITY_TAG={C:'普通',R:'魔法[稀有]',E:'魔法[精英]',L:'傳說[神話]'};
/* 綜合威力：把傷害、段數、護盾、抽牌換算成一個可比較的數字 */
function cardPower(o){
  const c=effCard(o);
  let pw=(c.dmg||0)*(c.hits||1)*(c.all?1.6:1);
  pw+=(c.block||0)*0.9;
  pw+=(c.draw||0)*14;
  pw+=(c.manaGain||0)*18;
  pw+=(c.burn||0)*1.5;
  if(c.wild) pw+=25;                       // 萬用卡的價值在於維持連擊
  if(c.neg) pw+=20;
  if(c.sp) pw+=40;
  const costFactor=c.wild?1:(1+(c.c||0)*0.15);
  return Math.round(pw*100/costFactor);
}
function cardDetail(o,from){
  // from: 'deck' 從牌組畫面開啟／'battle' 戰鬥中長按／其他＝迷宮中
  // 關閉行為必須回到原畫面，不能誤把玩家踢出戰鬥
  const closeFn = from==='deck' ? deckScreen
    : from==='battle' ? ()=>{ $('veil').classList.add('hide'); }
    : backToDungeon;
  const c=effCard(o), b=CARDS[o.id];
  const R=RARITY[c.r||'C'];
  const rows=[];
  const add=(k,v)=>{ if(v!==undefined&&v!==null&&v!=='') rows.push([k,v]); };
  add('法力消耗', c.wild?'✦ 通用（'+c.c+'）':(c.c<0?'回收 '+Math.abs(c.c):c.c));
  add('傷害', c.dmg?(c.dmg+(c.hits>1?' ×'+c.hits+' 段':'')):null);
  add('攻擊範圍', c.dmg?(c.all?'全體':'單體'):null);
  add('範圍修正', c.dmg&&c.all?'實際威力 ×0.68':null);
  add('護盾', c.block||null);
  add('抽牌', c.draw||null);
  add('回復法力', c.manaGain||null);
  add('灼燒', c.burn||null);
  add('吸血', c.drain?'造成傷害的 12%':null);
  add('序列效果', c.wild?'重置回 0（連擊不斷）':c.neg?'不推進序列（並回魔）':'需接續 '+c.c+' 費');
  add('稀有度', R.n);
  add('品質能力',rarityAbilityText(c)||null);
  if(c.EVO) add('狀態','★ 已進化');
  const half=Math.ceil(rows.length/2);
  const col=(arr)=>arr.map(([k,v])=>
    `<div class="dtRow"><span class="dtK">${k}</span><span class="dtV">${v}</span></div>`).join('');
  const gem=o.gem?GEMS[o.gem]:null;
  overlay(`<div class="dtPanel" style="border-color:${R.col}">
      <div class="dtHead">
        <div>
          <div class="dtName" style="color:${R.col}">${b.n}</div>
          <div class="dtTag" style="color:${R.col}">${RARITY_TAG[c.r||'C']}</div>
          <div class="dtMeta">類型：${c.dmg?'攻擊':c.block?'防護':c.draw?'輔助':'特殊'}</div>
          <div class="dtMeta">職業：${S.job?JOBS[S.job].n:'通用'}</div>
          <div class="dtMeta">層級：${c.FUSE?'合成 第'+c.FUSE+'層':c.r==='L'?'傳說':'基礎'}</div>
        </div>
        <div class="dtIcon" style="border-color:${R.col}">
          <span>${cardIcon(c,o.id)}</span>
          <i style="color:${R.col}">${cardCostText(c)}</i>
        </div>
      </div>
      <div class="dtPower">威力：<b style="color:${R.col}">${cardPower(o)}</b></div>
      <div class="dtSec">［基礎屬性］</div>
      <div class="dtGrid">
        <div>${col(rows.slice(0,half))}</div>
        <div>${col(rows.slice(half))}</div>
      </div>
      <div class="dtSec">［寶石鑲嵌］</div>
      ${gem?`<div class="dtGem">
          <span class="dtGemIc" style="border-color:${gem.col};color:${gem.col}">${gem.ic}</span>
          <span><b style="color:${gem.col}">${gem.n}</b>
            ${o.perfect?'<em class="dtPerfect">完美刻痕 +3</em>':''}
            <br><span class="dtGemD">${gem.d.replace(/<\/?b>/g,'')}</span></span>
        </div>`
        :'<div class="dtNone">尚未鑲嵌寶石</div>'}
      <div class="dtSec">［卡面說明］</div>
      <div class="dtText">${c.t}</div>
    </div>
    <button class="go" id="ok">關閉</button>`, closeFn);
}

/* ═══════════════ 卡牌專屬攻擊特效 ═══════════════
   每張卡依名稱與性質有各自的演出；稀有度越高疊加越多層次。
   所有特效都是純視覺，不影響邏輯 —— 出牌永遠立即生效。 */
const CARD_FX={
  // 鉛筆／筆芯系：連續投射
  knife:'volley', dagger:'volley', edge:'volley',
  // 捲尺系：弧形彈擊
  whip:'lash', bloody:'lash',
  // 原子筆系：貫穿墨光
  wand:'beam', holy:'beam', descartesC:'beam',
  // 擴散系：全體環擊
  garlic:'ring', poe:'ring', heaven:'ring', fDisc:'ring',
  // 火系：連發火球（重擊與爆發類）
  water:'fireball', bloody:'fireball', gun:'fireball', axe:'fireball',
  pasqua:'fireball', fDist:'fireball', nImag:'fireball',
  // 課本系：環繞書頁
  bible:'orbit', vespers:'orbit', imelda:'orbit', fSeries:'orbit',
  // 三角板系：交叉光線
  cross:'cross', fQuad:'cross',
  // 護盾系
  guard:'shield', pebble:'shield', fSquare:'shield', fPerfect:'shield',
  // 萬用：序列漣漪
  blank:'ripple', clock:'ripple', candle:'ripple', trip:'ripple',
  eulerC:'ripple', spring:'ripple', wellspring:'ripple', coin:'ripple',
  // 負費：逆向吸取
  nDebt:'drain', nOver:'drain', nInv:'drain', nImag:'drain', nUnit:'drain',
  // 增益／詛咒：專屬演出
  antonio:'buff', scroll:'buff', curse:'hex',
  // 數學家與合成：公式爆發
  gaussC:'formula', pythaC:'formula', euclidC:'formula', fermatC:'formula',
  pascalC:'formula', archiC:'formula',
  fLine:'formula', fQuad:'formula', fArith:'formula', fGauss:'formula',
  fSeries:'orbit', fDiff:'volley', fMul:'beam',
};
const FX_FORMULA={
  gaussC:'n(n+1)/2', pythaC:'a²+b²', euclidC:'gcd(a,b)', fermatC:'aⁿ+bⁿ',
  pascalC:'ⁿCᵣ', archiC:'F₁d₁=F₂d₂', eulerC:'e^iπ+1=0',
  fLine:'y=ax+b', fQuad:'ax²+bx+c', fArith:'Sₙ=n(a₁+aₙ)/2',
  fGauss:'Σ', fDisc:'b²−4ac', fPerfect:'(a+b)²', fDist:'a(b+c)',
};
function fxStyle(o){
  const c=effCard(o);
  if(CARD_FX[o.id]) return CARD_FX[o.id];
  if(c.burn) return 'fireball';
  if(c.wild) return 'ripple';
  if(c.neg) return 'drain';
  if(c.block&&!c.dmg) return 'shield';
  if(c.all) return 'ring';
  if((c.hits||1)>1) return 'volley';
  return 'slash';
}
function mkFx(cls,style){
  const e=document.createElement('div');
  e.className=cls;
  if(style) Object.assign(e.style,style);
  return e;
}
/* 主特效播放器 */
function playFx(item,dur,done){
  const field=$('field');
  if(!field){ done&&done(); return; }
  const o=item.o, c=effCard(o), st=fxStyle(o);
  const rare=(c.r==='L'||c.r==='E'||c.FUSE);
  const fw=field.clientWidth, fh=field.clientHeight;
  let tx=fw*0.5, ty=fh*0.42;
  const t=document.getElementById(item.targetUid);
  if(t){ tx=parseFloat(t.style.left||0)+parseFloat(t.style.width||60)/2;
         ty=parseFloat(t.style.top||0)+34; }
  const sx=fw-40, sy=fh*0.66;
  // 效能保護：同時存在的特效元素超過上限就不再新增
  // （3 個並行動畫 × 14 投射物 + 火花，極端情況可達 60+ 個 DOM）
  const add=el=>{
    if(field.querySelectorAll(FX_SEL).length>=FX_LIMIT){
      el.remove?.(); return;
    }
    field.appendChild(el);
    setTimeout(()=>el.remove(),dur+700);
  };
  const col=RARITY[c.r||'C'].col;

  const chainN=item.chain||1;
  // 投射物數量：基礎 + 命中次數 + 連擊加成，數量越多動畫自然越長
  let pn=Math.min(14, 4 + (c.hits||1)*2 + Math.floor(chainN/2));
  // 佇列很滿時自動減量，優先保住流暢度
  if(animQ.length>=4) pn=Math.max(4,Math.round(pn*0.6));
  const stag=Math.max(26, Math.round(dur*0.5/pn));   // 逐發錯開
  const span=dur + (pn-1)*stag;                      // 全部落地才算結束
  if(st==='volley'){                      // 連續鉛筆／筆芯
    const n=pn;
    for(let i=0;i<n;i++){
      const b=mkFx('fx-blade',{left:sx+'px',top:sy+'px',color:col});
      add(b);
      setTimeout(()=>{ if(animQ.length<3) emitTrail(field,b,dur,col,3);
        b.style.transition=`left ${dur}ms cubic-bezier(.3,0,.7,1), top ${dur}ms cubic-bezier(.3,0,.7,1), transform ${dur}ms`;
        b.style.left=(tx-13+(Math.random()-0.5)*30)+'px';
        b.style.top=(ty-13+(Math.random()-0.5)*34)+'px';
        b.style.transform='rotate(900deg)'; }, i*stag);
    }
  } else if(st==='lash'){                 // 鞭擊弧線
    const l=mkFx('fx-lash',{left:tx+'px',top:ty+'px'});
    add(l);
  } else if(st==='beam'){                 // 貫穿光束
    const b=mkFx('fx-beam',{left:tx+'px',top:'0px',height:(ty+20)+'px',background:
      `linear-gradient(180deg,transparent,${col},#fff)`});
    add(b);
  } else if(st==='ring'){                 // 全體環擊
    const rn=Math.min(9,4+Math.floor(chainN/3));
    for(let i=0;i<rn;i++){
      const r=mkFx('fx-ring',{left:(fw/2)+'px',top:(fh*0.42)+'px',borderColor:col});
      r.style.animationDelay=(i*70)+'ms';
      add(r);
    }
  } else if(st==='fireball'){             // 連發火球
    for(let i=0;i<pn;i++){
      const fb=mkFx('fx-fire',{left:sx+'px',top:sy+'px'});
      fb.innerHTML='<i class="core"></i><i class="tail"></i>';
      add(fb);
      setTimeout(()=>{
        if(animQ.length<3) emitTrail(field,fb,dur,'#ff8a3a',4);
        fb.style.transition=`left ${dur}ms cubic-bezier(.35,0,.65,1), top ${dur}ms cubic-bezier(.35,0,.65,1), transform ${dur}ms`;
        fb.style.left=(tx-14+(Math.random()-0.5)*44)+'px';
        fb.style.top=(ty-14+(Math.random()-0.5)*38)+'px';
        fb.style.transform='scale(1.5)';
        setTimeout(()=>fb.classList.add('boom'),dur-40);
      }, i*stag);
    }
  } else if(st==='splash'){               // 潑濺
    for(let i=0;i<pn+6;i++){
      const d=mkFx('fx-drop',{left:tx+'px',top:ty+'px'});
      const a=Math.random()*Math.PI*2, r=22+Math.random()*26;
      d.style.setProperty('--dx',(Math.cos(a)*r)+'px');
      d.style.setProperty('--dy',(Math.sin(a)*r)+'px');
      add(d);
    }
  } else if(st==='orbit'){                // 環繞書頁
    for(let i=0;i<Math.min(7,3+Math.floor(chainN/3));i++){
      const g=mkFx('fx-orbit',{left:tx+'px',top:ty+'px',borderColor:col});
      g.style.animationDelay=(i*90)+'ms';
      add(g);
    }
  } else if(st==='cross'){                // 光之十字
    add(mkFx('fx-crossV',{left:tx+'px',background:`linear-gradient(180deg,transparent,${col},transparent)`}));
    add(mkFx('fx-crossH',{top:ty+'px',background:`linear-gradient(90deg,transparent,${col},transparent)`}));
  } else if(st==='shield'){               // 護盾浮現（玩家側）
    const sh=mkFx('fx-shield',{left:(fw/2-30)+'px',top:(fh-70)+'px'});
    sh.textContent='🛡';
    add(sh);
  } else if(st==='ripple'){               // 序列重置漣漪
    for(let i=0;i<3;i++){
      const r=mkFx('fx-ripple',{left:(fw/2)+'px',top:(fh*0.5)+'px',borderColor:'#e26bd6'});
      r.style.animationDelay=(i*110)+'ms';
      add(r);
    }
  } else if(st==='drain'){                // 逆向吸取（敵→我）
    for(let i=0;i<pn;i++){
      const d=mkFx('fx-mote',{left:tx+'px',top:ty+'px'});
      d.style.setProperty('--tx',(fw/2-tx)+'px');
      d.style.setProperty('--ty',(fh-40-ty)+'px');
      d.style.animationDelay=(i*60)+'ms';
      add(d);
    }
  } else if(st==='formula'){              // 公式爆發（傳說／合成）
    const extra=Math.min(8,Math.floor(chainN/3));
    for(let i=0;i<extra;i++){
      const sp2=mkFx('fx-spark',{left:tx+'px',top:ty+'px',background:'#fff'});
      const a2=Math.random()*Math.PI*2, r2=30+Math.random()*40;
      sp2.style.setProperty('--dx',(Math.cos(a2)*r2)+'px');
      sp2.style.setProperty('--dy',(Math.sin(a2)*r2)+'px');
      sp2.style.animationDelay=(i*40)+'ms';
      add(sp2);
    }
    const f=mkFx('fx-formula',{left:tx+'px',top:(ty-18)+'px',color:col});
    f.textContent=FX_FORMULA[o.id]||'∑';
    add(f);
    const spn=Math.min(20,10+chainN);
    for(let i=0;i<spn;i++){
      const sp=mkFx('fx-spark',{left:tx+'px',top:ty+'px',background:col});
      const a=i/spn*Math.PI*2;
      sp.style.setProperty('--dx',(Math.cos(a)*46)+'px');
      sp.style.setProperty('--dy',(Math.sin(a)*46)+'px');
      add(sp);
    }
  } else if(st==='buff'){                 // 增益：向上升起的雙箭頭光暈
    for(let i=0;i<4;i++){
      const u=mkFx('fx-buff',{left:(fw/2+(i-1.5)*16)+'px',top:(fh-56)+'px',color:col});
      u.textContent='▲';
      u.style.animationDelay=(i*70)+'ms';
      add(u);
    }
  } else if(st==='hex'){                  // 詛咒：紫色迴旋符文
    const hx=mkFx('fx-hex',{left:(fw/2)+'px',top:(fh*0.5)+'px'});
    hx.textContent='✖';
    add(hx);
  } else {                                 // 預設：斬擊
    const sl=mkFx('fx-slash',{left:tx+'px',top:ty+'px',background:
      `linear-gradient(90deg,transparent,${col},transparent)`});
    add(sl);
  }

  // 全螢幕連擊演出：連擊越高越華麗
  if(chainN>=5){
    const st1=mkFx('fx-streak',{background:`linear-gradient(90deg,transparent,${col},transparent)`});
    st1.style.top=(Math.random()*fh)+'px';
    add(st1);
  }
  if(chainN>=10){
    const rb=mkFx('fx-radial');
    add(rb);
    for(let i=0;i<10;i++){
      const ln=mkFx('fx-ray',{background:col});
      ln.style.transform=`rotate(${i*36}deg) translateX(30px)`;
      rb.appendChild(ln);
    }
  }
  if(chainN>=12){                          // 電弧：從畫面邊緣劈向目標
    for(let i=0;i<4;i++){
      const lz=mkFx('fx-bolt',{background:`linear-gradient(90deg,transparent,${col},#fff)`});
      lz.style.left=(tx-90)+'px'; lz.style.top=(ty-60+i*30)+'px';
      lz.style.transform=`rotate(${-30+i*20}deg)`;
      lz.style.animationDelay=(i*55)+'ms';
      add(lz);
    }
  }
  if(chainN>=15){
    const fs=mkFx('fx-fullflash',{background:col});
    add(fs);
    const vx=mkFx('fx-vortex',{borderColor:col});   // 能量漩渦
    vx.style.left=tx+'px'; vx.style.top=ty+'px';
    add(vx);
  }
  if(chainN>=20){                          // 20 連：畫面級爆發
    for(let i=0;i<3;i++){
      const rg=mkFx('fx-megaring',{borderColor:'#fff'});
      rg.style.left=tx+'px'; rg.style.top=ty+'px';
      rg.style.animationDelay=(i*90)+'ms';
      add(rg);
    }
    hitStop(150);
  }
  // 連擊越高，命中回饋越強
  if(chainN>=8){
    const w2=mkFx('fx-shock',{left:tx+'px',top:ty+'px',borderColor:'#ffe38a'});
    w2.style.animationDelay='60ms';
    add(w2);
  }
  shakeByChain(chainN);   // 連擊 3 起就開始晃，越高越劇烈
  // 連擊 5 起追加全畫面演出，10 與 15 再升級
  if(chainN===2||chainN===4||chainN===5||chainN===6) cineCard(item.o,chainN);
  // 稀有卡疊加華麗層：衝擊波＋畫面閃光＋震動
  if(rare){
    const w=mkFx('fx-shock',{left:tx+'px',top:ty+'px',borderColor:col});
    add(w);
    const fl=mkFx('fx-flash',{background:col});
    add(fl);
    shake();
  }
  setTimeout(()=>{
    if(t){ t.classList.remove('hurt'); void t.offsetWidth; t.classList.add('hurt'); }
    // 命中衝擊：光環 + 停格（傷害越大停越久）
    const totalDmg=(item.hits||[]).reduce((a,h)=>a+h.d,0);
    if(t&&totalDmg>0){
      const imp=mkFx('fx-impact',{left:tx+'px',top:ty+'px',borderColor:col});
      add(imp);
      if(totalDmg>=40) hitStop(chainN>=8?110:70);
      else if(totalDmg>=18) hitStop(45);
    }
    // 把傷害拆成連續多段跳出 —— 連擊越長段數越多，打擊感越爆
    // 重要：各段數字加總必須等於實際傷害（學生可能會去加）
    for(const h of (item.hits||[])){
      const f=B&&B.foes?B.foes.find(x=>x.uid===h.uid):null;
      if(!f)continue;
      const ticks=splitDamage(h.d,item.chain,(effCard(item.o).hits||1));
      const gap=Math.max(45,Math.round(span*0.35/Math.max(1,ticks.length)));
      ticks.forEach((v,k)=>{
        setTimeout(()=>{
          if(!B||B.over)return;
          popDmg(f,v,h.crit&&k===ticks.length-1,k===0?(h.pre||''):'');
        }, k*gap);
      });
    }
    done&&done();
  },span);
}

/* ═══ 答題介面 ═══ */
let quizStats={ok:0,total:0,points:0};
let quizLastAnswerSlot=-1;
/* 所有地下城題目共用同一套知識點規則：基礎 1、標準 2、挑戰 3。
   題庫若有 difficulty / diff / tier 會優先採用；舊題則依主題精熟度判定。 */

let lastQText='';
const pickQ=vol=>{
  const want = volPick==='auto' ? vol : volPick;
  /* 班級作業已勾選課程目錄時，從「目錄題目＋地下城同單元題型」混合池出題。 */
  if(classroomLaunch&&Array.isArray(classroomLaunch.questionBank)&&classroomLaunch.questionBank.length){
    const assigned=nextFromBank(Number(want))||nextFromBank(Number(classroomLaunch.volume)||1);
    if(assigned){lastQText=assigned.q;return assigned;}
  }
  let out=null;
  for(let t=0;t<6;t++){
    // 60% 用程序生成（幾乎不重複），40% 從題庫輪替
    const gens=QGEN[want];
    if(gens && Math.random()<0.6){
      const g=gens[rand(gens.length)]();
      out=visualizeGeometryQuestion({q:g.q,opts:g.opts,ans:g.ans,sol:g.sol,fig:g.fig||'',tier:g.tier||0,difficulty:g.difficulty||'',tag:'第'+want+'冊 · '+g.tag});
    }else{
      out=nextFromBank(want) || (gens?(()=>{const g=gens[rand(gens.length)]();
        return visualizeGeometryQuestion({q:g.q,opts:g.opts,ans:g.ans,sol:g.sol,fig:g.fig||'',tier:g.tier||0,difficulty:g.difficulty||'',tag:'第'+want+'冊 · '+g.tag});})():null);
    }
    if(out && out.q!==lastQText) break;      // 避免和上一題完全一樣
  }
  if(out) lastQText=out.q;
  return out||{q:'1 + 1 = ?',opts:['1','2','3','4'],ans:'2',sol:'基本加法',tag:'備用'};
};

/* 每一個樓層固定擁有一種專屬怪物。它會取代該層其中一支普通隊伍，
   因此增加的是「種類」而不是數量，不會讓戰場或尋路負擔暴增。 */

FLOOR_MONSTERS.flat().forEach(o=>{
  FOES[o.k]={n:o.n,hp:o.hp,atk:o.atk,art:o.k,floorSpecial:1};
  FLOOR_MONSTER_LOOK[o.k]=o;
});
/* 六區域各 10 種生態怪物：資料、像素配色、敵方特性與隨從能力都由同一筆資料產生。
   加上原有怪物與融合種後，圖鑑超過 100 種，但每層怪物「數量」不增加。 */

/* 怪物技能統一分成四系。分類不只用於顯示，也決定動畫色彩與圖鑑篩選。 */

const REGION_MONSTERS=MONSTER_REGION_NAMES.map((names,zi)=>names.map((n,i)=>{
  const k='rm'+(zi+1)+'_'+(i+1),pal=MONSTER_PALETTES[(zi*3+i)%MONSTER_PALETTES.length];
  const sup=MONSTER_SUPPORT_ARCHETYPES[(zi*4+i)%MONSTER_SUPPORT_ARCHETYPES.length];
  const bat=MONSTER_BATTLE_ARCHETYPES[(zi*3+i)%MONSTER_BATTLE_ARCHETYPES.length];
  const o={k,n,hp:34+zi*17+i*4,atk:6+zi*3+Math.floor(i/2),col:pal[0],hi:pal[1],form:(zi+i)%6,
    supportType:sup.type,supportValue:monsterSupportValue(sup,zi),supportSkill:n+'・'+sup.suffix,
    battleType:bat[0],abilityName:n+'・'+bat[1],region:zi};
  FOES[k]={n:o.n,hp:o.hp,atk:o.atk,art:k,battleType:o.battleType,abilityName:o.abilityName,regionMonster:1};
  FLOOR_MONSTER_LOOK[k]=o;
  return o;
}));
/* 怪物夥伴：一般種 3%、頭目 1%，每場至多出現一個邀請。每種怪物都有支援特技。 */

FLOOR_MONSTERS.flat().forEach((o,i)=>{
  const types=['block','draw','heal','mana','power','strike','regen','cleanse'],type=types[i%types.length];
  COMPANIONS[o.k]={ic:['💡','🪲','💧','🐝','⚙️','🦊'][o.form]||'🐾',
    skill:o.n+'・'+monsterSkillGroupMeta(monsterSkillGroupByEffect(type)).n,type,
    value:type==='block'?8+Math.floor(i/8)*2:type==='heal'?6+Math.floor(i/8)*2:type==='strike'?4+Math.floor(i/12):
      type==='regen'?2+Math.floor(i/16):type==='power' ? .04+Math.floor(i/16)*.01:1};
});
REGION_MONSTERS.flat().forEach((o,i)=>{
  COMPANIONS[o.k]={ic:['🌱','🪲','🦊','🦋','🐉','🐾'][o.form]||'🐾',skill:o.supportSkill,type:o.supportType,value:o.supportValue};
});

/* 七階融合森林：64 種一階素材可在不同分支重複利用；同一對素材只登記一次。
   五階以上提供第二條替代路線，最後可形成六種不同的七階終極怪物。 */

/* 圖鑑辨識系統：從物種名稱解析生物輪廓與元素主題，讓大量融合種不再只是換色。
   規則同時供圖鑑文案與像素繪圖使用；找不到關鍵字時仍會以物種編號生成獨立徽記。 */

/* 鮮明種族主色：第一色負責大面積身體，第二色由元素主題決定，避免整張寵物灰成一團。 */

const FUSION_TREE_KEYS={1:REGION_MONSTERS.flat().map(o=>o.k).concat(['mush','bat','skel','slime'])};
for(let tier=2;tier<=7;tier++){
  const names=FUSION_TREE_NAMES[tier],prev=FUSION_TREE_KEYS[tier-1];
  const keys=names.map((_,i)=>tier===2&&i<30?'fusion_z'+(Math.floor(i/5)+1)+'_'+(i%5+1):'fusion_t'+tier+'_'+(i+1));
  FUSION_TREE_KEYS[tier]=keys;
  const routeCount=names.length*(tier>=5?2:1),pairs=uniqueStagePairs(prev,routeCount,tier*3);
  names.forEach((n,i)=>registerFusionRecipe(pairs[i][0],pairs[i][1],keys[i],n,i%6,i,tier,false));
  if(tier>=5)names.forEach((n,i)=>{const p=pairs[names.length+i];registerFusionRecipe(p[0],p[1],keys[i],n,i%6,i+names.length,tier,true);});
}
/* 六區守關 BOSS 對應一至六階；七階最終守護者同時是融合樹頂端 BOSS。 */
['boss','boss2','boss3','boss4','boss5','boss6'].forEach((k,i)=>{if(FOES[k]){FOES[k].fusionTier=i+1;FOES[k].tierBoss=1;}});
if(FOES.fusion_t7_6){FOES.fusion_t7_6.boss=1;FOES.fusion_t7_6.tierBoss=1;}
/* 舊怪物、樓層怪物也補齊物種能力；能力名稱包含物種名，因此圖鑑內每一種都有自己的說明。 */
Object.entries(FOES).forEach(([k,f],i)=>{
  if(!f.battleType){const a=MONSTER_BATTLE_ARCHETYPES[i%MONSTER_BATTLE_ARCHETYPES.length];f.battleType=a[0];f.abilityName=f.n+'・'+a[1];}
});

/* 夥伴個體性格：除了收藏差異，也帶來一個小型戰鬥支援與 SEL 自我調節口白。
   所有效果仍會通過 applyOneFollowerEffect 的隊伍總上限。 */

/* BOSS 與六、七階寵物的專屬特技。仍需通過對應時機與機率判定，每場最多發動一次。 */

let companionSkillFilter='all';

let monsterFusionSel=[];

/* 全物種寵物圖鑑：不要求先收服才看得到美術，讓學生能明確知道想收集的目標。 */

/* 每個事件只允許一隻夥伴成功發動；失敗不鎖事件，下一次符合時機仍可再次判定。 */
/* 地城上一個圖示 = 一支隊伍；接戰時才展開成組員 */

FLOOR_MONSTERS.flat().forEach(o=>{
  SQUADS['floor_'+o.k]={icon:o.k,n:o.n+'巡隊',speed:o.form%3===0?1:2,delta:1,
    trait:o.form%2?'prime':null,roster:()=>[o.k,o.k].concat(Math.random()<.28?[o.k]:[])};
});
REGION_MONSTERS.flat().forEach(o=>{
  SQUADS['region_'+o.k]={icon:o.k,n:o.n+'生態群',speed:o.form%3===0?1:2,delta:1,
    trait:o.battleType==='chaos'?'prime':o.battleType==='breaker'?'abs':null,
    roster:()=>[o.k,o.k].concat(Math.random()<.22?[o.k]:[])};
});
/* 牌組淨化：只保留真實存在的卡，並補齊欄位。
   任何來源（存檔、匯入、連線）進來的牌組都必須先過這一關。 */
const mkDeck=a=>a.map(id=>({id,gem:null}));
/* ═══ 通用卡攜帶上限 ═══
   通用卡能無視費用需求、維持連擊，帶太多會讓「接續費用」的核心機制失去意義。
   限制最多 2 張：仍能解圍，但不能靠它硬接一整輪。 */
const WILD_CAP=2;
const isWild=id=>!!(CARDS[id]&&CARDS[id].wild);
const wildCount=deck=>(deck||S.deck).filter(o=>o&&isWild(o.id)).length;
const wildFull=()=>wildCount()>=WILD_CAP;
/* 每副牌強制保留 0、1、2、3、4 費各至少一張，確保永遠能練完整五連。
   萬用、負費、詛咒與暫時卡不算作該費用的核心卡。 */
const REQUIRED_COSTS=[0,1,2,3,4];
const REQUIRED_COST_FALLBACK={0:'knife',1:'wand',2:'whip',3:'axe',4:'bible'};
function requiredCardCost(o){
  if(!o||!CARDS[o.id])return null;
  /* 牌組費用曲線看卡牌「原始費用」。空之書等寶石只改戰鬥實際消耗，
     不應讓鑲嵌被誤判為刪掉最後一張該費用卡。 */
  const c=CARDS[o.id],n=Number(c.c);
  return c.wild||c.neg||c.CURSE||c.TEMP||!Number.isInteger(n)||n<0||n>4?null:n;
}
function deckCostCounts(deck){
  const counts={0:0,1:0,2:0,3:0,4:0};
  for(const o of (deck||[])){const c=requiredCardCost(o);if(c!==null)counts[c]++;}
  return counts;
}
function missingDeckCosts(deck){const counts=deckCostCounts(deck);return REQUIRED_COSTS.filter(c=>!counts[c]);}
function canRemoveDeckIndex(index,deck){
  const src=deck||S.deck,o=src[index];if(!o||!CARDS[o.id]||effCard(o).EQUIP)return false;
  return missingDeckCosts(src.filter((_,i)=>i!==index)).length===0;
}
function removableDeckIndexes(deck){const src=deck||S.deck;return src.map((_,i)=>i).filter(i=>canRemoveDeckIndex(i,src));}
function fusionMissingCosts(i,j,result){
  const next=S.deck.filter((_,idx)=>idx!==i&&idx!==j),counts=deckCostCounts(next);
  let cost=null;
  if(typeof result==='string'&&CARDS[result])cost=requiredCardCost({id:result,gem:null});
  else if(result&&!result.wild&&Number.isInteger(Number(result.cost)))cost=Number(result.cost);
  if(cost!==null&&cost>=0&&cost<=4)counts[cost]++;
  return REQUIRED_COSTS.filter(c=>!counts[c]);
}
function sanitizeDeck(list,fallbackJob){
  const out=[];
  let dropped=0;
  for(const o of (Array.isArray(list)?list:[])){
    if(!o||typeof o!=='object'||!o.id||!CARDS[o.id]){ dropped++; continue; }
    out.push({id:o.id, gem:(o.gem&&GEMS[o.gem])?o.gem:null, perfect:!!o.perfect});
  }
  if(dropped) console.warn('[牌組淨化] 移除 '+dropped+' 張失效卡');
  // 舊存檔可能超過萬用卡上限 → 保留最前面的 2 張，其餘轉為同費用的一般卡
  let wc=0, converted=0;
  for(const o of out){
    if(!isWild(o.id)) continue;
    if(++wc<=WILD_CAP) continue;
    o.id='wand'; converted++;                 // 換成 1 費攻擊卡，牌組張數不變
  }
  if(converted) console.warn('[牌組淨化] 超過萬用卡上限，'+converted+' 張已轉為一般卡');
  const repaired=missingDeckCosts(out);     // 舊存檔或外部匯入缺費用 → 精準補足，不整副洗掉
  for(const cost of repaired){const id=REQUIRED_COST_FALLBACK[cost];if(CARDS[id])out.push({id,gem:null});}
  if(repaired.length)console.warn('[牌組淨化] 已補上必要費用：'+repaired.join('、')+' 費');
  return out;
}
const S={hp:100,maxhp:100,lv:1,xp:0,xpNeed:3,
  deck:mkDeck(['knife','knife','dagger','blank','clock','wand','wand','garlic','whip','imelda']),
  gems:[],dmgMul:1,step:.35,handSize:5,armor:0,key:false,mana:6,tomes:0,handCap:5,chant:false,allChains:[],gold:0,ups:{},name:'',job:'',pot:{heal:1,elixir:0,freeze:0,firebomb:0,luck:0,medkit:0},luckChest:0,shrineUses:{},wrong:[],found:[],followers:[],monsterDex:[],monsterTraits:{},fusionBook:[],petCardCarry:[],petCardCarrySession:'',petCardSentSession:'',zone:0,cleared:-1,zoneBest:{},zoneProgress:{},meta:{souls:0,runs:0,totalQ:0,totalOk:0,perks:{}},extAbil:{}};

/* ===================== 地圖 ===================== */
const GEO=[
"WWWWWWWWWWWWWWW","W.....WWW.....W","W.....WWW.....W","W.............W",
"W.....W.W.....W","W.....W.W.....W","W.W.WWW.WWW.W.W","W.............W",
"W.W.WWW.WWW.W.W","W.....W.W.....W","W.....W.W.....W","W.............W",
"W.....WWW.....W","W.....WWW.....W","WWWWWWWWWWWWWWW"];
const FLOORS=[
 {n:'1F 隨機迴廊',vol:1,start:[7,11],doors:[],
  props:[['chest',3,3],['chest',11,11],['stair',11,3],['shop',7,3],
        ['npc',7,10,'sage'],['npc',3,7,'teller'],['npc',11,7,'merchant'],['shrine',5,3]],
  murals:[[7,2,'m1'],[6,4,'m2']],
  // 一個圖示 = 一支隊伍，接戰時才展開成組員
  mobs:[['mushPack',3,2],['batSwarm',12,4],['mushPack',3,10],
        ['skelSquad',11,10],['batSwarm',7,7]]},
 {n:'2F 隨機王座層',vol:2,start:[7,7],doors:[[9,11],[11,8]],
  props:[['key',3,3],['chest',11,3],['exit',13,13],['shop',3,11],
        ['npc',9,10,'gate'],['npc',11,5,'smith'],['npc',5,7,'stat'],['shrine',9,3]],
  murals:[[7,12,'m3']],
  mobs:[['skelSquad',3,4],['mushPack',12,2],['batSwarm',5,11],
        ['skelSquad',7,3],['bossGuard',11,11]]},
];
let MW=MSZ,MH=MSZ;
let grid=[],props=[],mobs=[],seen=[],fl=0,turnNo=0,running=false,murals={};

const walkable=(x,y)=>{
  if(x<0||y<0||x>=MW||y>=MH)return false;
  const c=grid[y][x];
  return c!=='W'&&!(c==='L'&&!S.key);
};

const DIRV=[[0,-1],[1,0],[0,1],[-1,0]];

/* ===================== 世界回合 ===================== */
const P={x:0,y:0,dir:0,ax:0,ay:0,ang:0,aang:0};

const MOVE_MS=185,TURN_MS=135;let busy=false;

/* 主動撞向怪物：不先跑世界回合，搶下先手 */

/* ---------- 滑動手勢：上前進 / 下後退 / 左右轉向 ---------- */
const SWIPE_MIN=26;
let gsX=0,gsY=0,gsId=null,gsDown=false;

const gl=$('gesture');
gl.addEventListener('touchstart',e=>{
  const t=e.changedTouches[0];gsId=t.identifier;gStart(t.clientX,t.clientY);e.preventDefault();
},{passive:false});
gl.addEventListener('touchend',e=>{
  for(const t of e.changedTouches) if(t.identifier===gsId){gEnd(t.clientX,t.clientY);gsId=null;}
},{passive:false});
gl.addEventListener('mousedown',e=>{gsDown=true;gStart(e.clientX,e.clientY);});
addEventListener('mouseup',e=>{if(gsDown){gsDown=false;gEnd(e.clientX,e.clientY);}});

/* ---------- 兩側平移按鈕（不轉向） ---------- */

bindTap($('strafeL'),'sl');
bindTap($('strafeR'),'sr');
bindTap($('waitBtn'),'wait');
$('deckBtn').onclick=e=>{e.stopPropagation();running=false;deckScreen();};
$('potTag').onclick=e=>{e.stopPropagation();running=false;potionScreen(false);};
$('compTag').onclick=e=>{e.stopPropagation();running=false;companionScreen();};
$('swapBtn').onclick=e=>{e.stopPropagation();swapLead();};

addEventListener('keydown',e=>{
  // M：切換全螢幕大地圖（只在地城畫面）；Esc 關閉
  if(e.code==='KeyM'&&!$('dungeon').classList.contains('hide')){
    e.preventDefault();toggleBigMap();return;}
  if(e.code==='Escape'&&typeof bigMapOn!=='undefined'&&bigMapOn){toggleBigMap(false);return;}
  const m={KeyW:'fw',ArrowUp:'fw',KeyS:'bk',ArrowDown:'bk',KeyA:'sl',KeyD:'sr',
    KeyQ:'tl',ArrowLeft:'tl',KeyE:'tr',ArrowRight:'tr',Space:'wait'}[e.code];
  if(m){e.preventDefault();if(typeof bigMapOn!=='undefined'&&bigMapOn)toggleBigMap(false);act(m);}
});

/* ===================== 敵人像素圖 ===================== */
/* 名稱驅動的像素識別層。背層先畫翅膀、尾巴、耳角；前層再畫元素徽記與每隻不同的編號胸徽。 */

/* 七階終極怪物使用六套獨立剪影；同一張 canvas 會直接帶回班級系統成為寵物卡圖像。 */

/* 四至七階 64×64 微雕層：在 32 格主輪廓上追加真正的 1px 細節，並非單純圖片放大。 */

const PET_CARD_ART_CACHE=new Map();

/* ===================== 戰鬥：太空戰士式陣型 ===================== */
let B=null,rTimer=null,rStart=0;
const DIFFS={
  easy:{n:'輕鬆',ms:3800,hp:0.85,atk:.9,d:'援軍慢 · 敵人血少'},
  normal:{n:'標準',ms:2800,hp:1,atk:1.15,d:'預設平衡'},
  hard:{n:'困難',ms:2000,hp:1.25,atk:1.4,d:'援軍快 · 敵人強悍'},
};
let diff='normal';
const REINF_MS=()=>DIFFS[diff].ms;
const MAX_FOES=8;

/* 防禦採每回合上限制，避免多張裝備卡堆到永久無傷；高區域／高等級只小幅提高上限。 */

const FRONT_CAP=4;   // 前排最多站 4 隻，之後排到後排

/* 接敵方位判定 —— 誰先看見誰、誰主動撞上去，決定先手 */

/* 進戰鬥前先淨化，確保牌堆裡沒有失效卡 */

/* 隊伍展開：把一格上的隊伍拆成一個個組員排進陣型 */

/* Boss 登場演出 */

/* BOSS 戰必看 NPC 簡報：一次只講一個重點，學生按「下一步」才繼續。 */

/* 陣型核心：前排滿了排後排；同排內隨機往左端或右端插入 */

/* 敵人意圖：攻擊 / 上盾 / 強化 / 詛咒 */

/* SEL 戰鬥口白：把自我覺察、自我管理、社會覺察、人際技巧與
   負責任選擇融入怪物反應。設全場冷卻，避免大量怪物同時洗版。 */

const rowOf=r=>B.foes.filter(f=>!f.dead&&f.row===r);
/* 前排清空 → 後排前進 */

addEventListener('resize',()=>{if(B&&!B.over){drawFieldBg();renderFoes();}});

/* 援軍改為【回合制】：玩家每結束一回合，戰場外的世界才推進一步。
   移除即時倒數 —— 算連鎖時被秒數追著跑，對思考與學習都是干擾。 */

const TICKS_PER_ROUND=3;   // 每結束一個戰鬥回合，戰場外推進 3 步

/* 敵人完整資訊：點卡面上的 ⓘ 才顯示（名稱、生命算式、狀態、特性、頭目蓄力） */

/* 單體目標：前排優先，前排沒清空不能打後排 */

/* 把一次傷害拆成 n 段，總和保證等於原值 */

/* ---------- 出牌 ---------- */
const BASE_BATTLE_HAND_LIMIT=5,MAX_BATTLE_HAND_LIMIT=7;

/* 被偷襲：敵人在你出牌前先打一輪 */

// 出牌規則：只要法力夠，任何牌都能打
// 但只有費用剛好等於「目前序列值」的牌（或通用卡✦）才會【接續連擊】
// 打出其他費用的牌 → 連擊【重新計算】，序列跳到該牌費用+1
const chainable=o=>{const c=effCard(o);return c.wild||c.neg||c.c===B.step;};
/* 完成 3 連後才進入節奏折扣：第 4 張起，接續的一般牌最多消耗 1 法力。 */
const previewManaCost=o=>{const c=effCard(o);return B.chain>=3&&chainable(o)&&!c.wild&&!c.neg?Math.min(1,c.c):c.c;};
const legal=o=>previewManaCost(o)<=B.mana;
/* 數列推進：固定公差 +1 —— 全場統一 0→1→2→3，規則只有一條，好記也好教 */

const seqStart=()=>0;
const isPrime=n=>n===2||n===3;
/* 前五連有明顯成長，之後改為遞減收益並封頂，避免長連一張秒殺整場。 */
const chainMul=()=>{
  const n=Math.max(0,B.chain-1),step=Math.max(.2,Math.min(.45,Number(S.step)||.35));
  return Math.min(3.25,1+Math.min(4,n)*step+Math.max(0,n-4)*step*.35);
};

/* 敵人逐一出手，每一擊都跳出扣盾／扣血數值 */

/* 玩家身上的浮動數字 */

/* 只更新狀態列，不重建手牌（避免敵人出手時手牌閃動） */

/* ═══ 連擊里程碑：以隨機手牌接成連段，每回合每階各一次。
   2 連補抽、4 連小爆發、5 連完成破勢；傷害受控，避免免費效果蓋過卡牌本身。 */
const ULTS=[
  {n:2, name:'疾風連擊', d:'抽 2 張', col:'#8fd0ff'},
  {n:4, name:'專注連擊', d:'抽 1 張', col:'#ff8a5a'},
  {n:5, name:'終極連擊', d:'抽 2 張 · 回復 8', col:'#ffe38a'},
];

/* ═══════════════ 全畫面演出 ═══════════════
   出牌與 Boss 攻擊的大場面：覆蓋整個畫面而非只在戰場區，
   由「衝入 → 定格 → 退場」三段組成，不阻擋輸入。 */

/* ── 出牌大招：連擊達門檻時的全畫面演出 ── */

/* ── Boss 大招：全畫面毀滅演出 ── */

/* 分級震動：連擊越高晃得越兇（lv 1~4）*/

/* 依連擊數決定震動等級 */

/* 震落手牌：地面裂痕 + 手牌區劇烈搖晃 */

/* 五連破勢：在 BOSS 全眼齊開前中斷集氣，並造成固定比例傷害。 */

/* Boss 蓄力完成：全眼齊開的大招 */

/* 擊敗怪物的瞬間：子彈時間 */

/* ═══════════════ 最後一擊掉落 ═══════════════
   怪物倒下時，戰利品先旋轉／發光後留在地面，不立刻入帳。
   全部敵人清空後才一次吸進 HUD，再處理戰後升級三選一。 */

$('endBtn').onclick=()=>{ if(B&&B.busy)return; endTurn(); };
$('supBtn').onclick=()=>{ if(!B||B.over||B.busy)return; supportScreen(); };
$('potBtn').onclick=()=>{ if(!B||B.over||B.busy)return; potionScreen(true); };
$('fleeBtn').onclick=()=>{
  if(!B||B.over||B.busy)return;
  if(!B.pvp||!B.pvp.stake)return;
  fleeDuel();
};
document.addEventListener('click',e=>{ if(e.target&&e.target.id==='dClaim') duelClaim(); });
let lastHpShown=0;

/* ===================== 升級 / 寶箱 ===================== */
const POOL=['focus','resonate','overload','knife','dagger','poe','pebble','blank','clock','candle','trip','wand','garlic',
  'antonio','guard','whip','imelda','water','axe','pasqua','bible','cross',
  'gaussC','pythaC','euclidC','fermatC','pascalC','eulerC','archiC','descartesC',
  'nDebt','nOver','nInv','nImag','nUnit','scroll','spring','wellspring'];
/* ═══ 等級成長 ═══
   魔力固定由牌組與通用卡管理，不再因升級擴張上限；
   升級只回滿生命、不增加上限；主要成長獎勵是該關卡的三選一卡牌。 */

/* ═══ 寶箱 ═══
   一般寶箱：金幣／一次性戰術卡／寶石為主，永久卡僅 5%（幸運 10%）。
   稀有寶箱（Boss 掉落）：金幣 + 寶石 + 戰術卡，另有 12% 永久卡。 */
let B_quizDone=0, chestLucky=false;
const TACTICAL_DROP=['medkit','medkit','freeze','freeze','firebomb','firebomb','luck'];

const pickGem=()=>{
  const keys=unlockedGems();
  return keys.length?keys[rand(keys.length)]:null;
};
/* ═══ 鑲嵌畫面：選一張卡把寶石裝上去 ═══ */

/* ═══ 牌組檢視 ═══ */

let veilCb=null,veilPick=null;

let overlayOpenAt=0;
$('veil').onclick=e=>{
  if(veilPick){
    const before=overlayOpenAt;
    if(veilPick(e.target)!==false){
      // 若回呼已經開了新的覆蓋層（開啟時間改變），就不要關掉它
      if(overlayOpenAt===before) $('veil').classList.add('hide');
      return;
    }
  }
  if(e.target.id==='ok'){$('veil').classList.add('hide');veilCb&&veilCb();}
};

/* ===================== 第一人稱渲染 ===================== */
const RW=320,RH=200;
const cvs=$('screen');cvs.width=RW;cvs.height=RH;
const cx2=cvs.getContext('2d',{alpha:false});cx2.imageSmoothingEnabled=false;
const imgD=cx2.createImageData(RW,RH),buf=new Uint32Array(imgD.data.buffer),zb=new Float32Array(RW);
const rgb=(r,g,b)=>(255<<24)|(b<<16)|(g<<8)|r;
const shade=(c,f)=>{const r=(c&255)*f|0,g=((c>>8)&255)*f|0,b=((c>>16)&255)*f|0;return (255<<24)|(b<<16)|(g<<8)|r;};
/* 大氣霧化：遠景不再沉入純黑，而是融入紫藍霧色 ——
   遠處牆面輪廓仍可辨識，地平線帶出微光層次，空間感更開闊 */
let FOG_R=52,FOG_G=40,FOG_B=96;
const fogShade=(c,f)=>{const g1=1-f;
  const r=((c&255)*f+FOG_R*g1)|0,g=(((c>>8)&255)*f+FOG_G*g1)|0,b=(((c>>16)&255)*f+FOG_B*g1)|0;
  return (255<<24)|(b<<16)|(g<<8)|r;};
const TS=64;
const nz=(x,y,s)=>{const n=Math.sin(x*127.1+y*311.7+s)*43758.5453;return n-Math.floor(n);};

const T_STONE=mkTex((x,y)=>{const r=(y/16)|0,ox=(r%2)*16,bx=(x+ox)%32,by=y%16;
  if(by<2||bx<2)return rgb(22,16,42);
  const n=nz((x/2)|0,(y/2)|0,1)*22|0;let c=rgb(52+n,42+n,92+n);
  if(by<4)c=rgb(72+n,60+n,120+n);if(nz(x,y,7)>.985)c=rgb(96,80,150);return c;});
const T_DOOR=mkTex((x,y)=>{const e=Math.min(Math.min(x,63-x),Math.min(y,63-y));
  if(e<4)return rgb(168,128,31);if(e<7)return rgb(236,194,78);
  const dx=x-32,dy=y-32,d=Math.hypot(dx,dy);
  if(Math.abs(d-15)<2.2||Math.abs(d-9)<1.6)return rgb(226,107,214);
  if(d<5)return rgb(255,220,255);
  const n=nz((x/3)|0,(y/3)|0,3)*14|0;return rgb(40+n,26+n,66+n);});
const T_MURAL=mkTex((x,y)=>{
  const e=Math.min(Math.min(x,63-x),Math.min(y,63-y));
  if(e<3)return rgb(22,16,42);
  if(e<6)return rgb(120,96,48);
  const cx=x-32,cy=y-32,d=Math.hypot(cx,cy);
  // 幾何圖騰：圓 + 三角
  if(Math.abs(d-20)<2)return rgb(236,194,78);
  if(Math.abs(d-12)<1.6)return rgb(226,107,214);
  if(Math.abs(cy-14)<1.6&&Math.abs(cx)<15)return rgb(143,208,255);
  if(Math.abs(cx-cy)<1.6&&d<20)return rgb(143,208,255);
  if(Math.abs(cx+cy)<1.6&&d<20)return rgb(143,208,255);
  const n=nz((x/3)|0,(y/3)|0,5)*16|0;
  return rgb(58+n,44+n,90+n);
});
let F_A=rgb(202,160,102),F_B=rgb(168,126,74),C_A=rgb(30,20,58),C_B=rgb(20,13,42);
/* ═══════════════ 區域場景主題 ═══════════════
   六大區域各有自己的遠景與配色：有的是露天迷宮 —— 抬頭是天空、
   雲朵與遠方城堡剪影（大氣透視讓遠牆融入地平線）；有的是深淵、王座廳。 */
const SKYW=1024,SKYH=RH>>1;

const _blk=(x,y)=>{const r0=(y/16)|0,ox=(r0%2)*16;return[(x+ox)%32,y%16];};
const THEMES=[
 // z1 入門地窖：紫石地城（原始風格）
 {fog:[52,40,96],fA:[202,160,102],fB:[168,126,74],cA:[30,20,58],cB:[20,13,42],
  mini:{wall:'#3d3163',hi:'#5a4d94',lo:'#241b45',fA:'#655230',fB:'#6f5a36'}},
 // z2 代數迴廊：露天綠籬迷宮 —— 藍天白雲、遠方城堡
 {fog:[176,203,226],fA:[104,164,78],fB:[88,142,64],cA:[0,0,0],cB:[0,0,0],
  sky:{seed:11,top:[92,152,228],bot:[196,222,240],cloud:[250,250,255],
       ridge:[118,164,138],castle:[150,162,188]},
  wallGen:(x,y)=>{const m=nz((x/4)|0,(y/4)|0,11),n=nz(x,y,12);
    let r=24+m*26+n*10|0,g=74+m*52+n*18|0,b=26+m*22|0;
    if(n>.92){r+=40;g+=50;b+=16;}
    if(y<5){r+=14;g+=22;b+=8;}
    return rgb(r,g,b);},
  mini:{wall:'#2f6b33',hi:'#4c9a4f',lo:'#1d4520',fA:'#79a852',fB:'#86b45c'}},
 // z3 幾何聖堂：砂岩神殿 —— 落日、金色天際
 {fog:[228,162,100],fA:[214,178,116],fB:[188,152,94],cA:[0,0,0],cB:[0,0,0],
  sky:{seed:23,top:[84,56,120],bot:[248,172,96],sun:[512,SKYH-26,10,[255,226,160]],
       cloud:[250,196,150],ridge:[128,78,96],castle:[96,62,84]},
  wallGen:(x,y)=>{const[bx,by]=_blk(x,y);
    if(by<2||bx<2)return rgb(96,70,40);
    const n=nz((x/2)|0,(y/2)|0,21)*24|0;let c=rgb(172+n,136+n,90+n);
    if(by<4)c=rgb(198+n,160+n,110+n);
    if(nz(x,y,27)>.985)c=rgb(228,192,142);return c;},
  mini:{wall:'#8a6a3c',hi:'#b08a50',lo:'#5a4526',fA:'#c7a068',fB:'#bb9257'}},
 // z4 數列高塔：金磚塔頂 —— 破曉高空、遠山雲海
 {fog:[176,170,206],fA:[186,176,200],fB:[164,152,182],cA:[0,0,0],cB:[0,0,0],
  sky:{seed:37,top:[58,66,140],bot:[192,182,222],cloud:[236,236,248],
       ridge:[112,110,152]},
  wallGen:(x,y)=>{const[bx,by]=_blk(x,y);
    if(by<2||bx<2)return rgb(92,64,20);
    const n=nz((x/2)|0,(y/2)|0,31)*22|0;let c=rgb(168+n,132+n,58+n);
    if(by<4)c=rgb(194+n,156+n,76+n);
    if(nz(x,y,33)>.985)return rgb(255,230,140);return c;},
  mini:{wall:'#8a7a30',hi:'#b3a04a',lo:'#5c511e',fA:'#b7aec6',fB:'#a89dbb'}},
 // z5 圓環深淵：黑曜石窟 —— 紫晶微光、深霧
 {fog:[42,16,54],fA:[74,52,92],fB:[58,40,74],cA:[16,8,26],cB:[10,5,18],
  wallGen:(x,y)=>{const[bx,by]=_blk(x,y);
    if(by<2||bx<2)return rgb(10,6,18);
    const n=nz((x/2)|0,(y/2)|0,41)*14|0;let c=rgb(32+n,20+n,46+n);
    if(by<4)c=rgb(46+n,30+n,64+n);
    if(nz(x,y,43)>.978)return rgb(226,107,214);
    if(nz(x,y,47)>.988)return rgb(255,180,240);return c;},
  mini:{wall:'#2a1a3a',hi:'#45305c',lo:'#170e22',fA:'#4a3560',fB:'#54406b'}},
 // z6 機率王座：真紅王廳 —— 金縫紅牆、緋色地毯
 {fog:[64,30,16],fA:[146,44,54],fB:[122,34,44],cA:[40,18,12],cB:[28,12,8],
  wallGen:(x,y)=>{const[bx,by]=_blk(x,y);
    if(by<2||bx<2)return rgb(170,132,40);
    const n=nz((x/2)|0,(y/2)|0,51)*18|0;let c=rgb(96+n,26+n,40+n);
    if(by<4)c=rgb(120+n,36+n,52+n);
    if(nz(x,y,57)>.99)return rgb(255,220,120);return c;},
  mini:{wall:'#6a2030',hi:'#8f3648',lo:'#43101c',fA:'#8f2f3d',fB:'#7e2836'}},
];
let CUR_TH=THEMES[0],CUR_WALL=null,CUR_SKY=null,SPR_FOG='rgba(52,40,96,';
const FLOOR_THEME_CACHE={};

const ART={};

const mc=$('mini'),mg=mc.getContext('2d');
/* ═══════════════ 第一人稱武器 ═══════════════
   畫面下方露出手持武器，走動時上下晃 —— 讓探索有「我在這裡」的實感。 */
let bobT=0;

/* ═══════════════ 全螢幕大地圖 ═══════════════
   小地圖只夠瞄一眼；隨機迷宮要規劃路線得看全貌。
   按 M／點小地圖／點「地圖」鈕展開：精靈圖示、圖例、探索進度一次看清。 */
const bmCv=$('bigMapCv'),bmg=bmCv?bmCv.getContext('2d'):null;
let bigMapOn=false;

if(bmCv){
  mc.title='點擊展開大地圖 (M)';
  mc.addEventListener('click',()=>toggleBigMap());
  $('mapBtn').addEventListener('click',()=>toggleBigMap());
  $('bigMapClose').addEventListener('click',()=>toggleBigMap(false));
  $('bigMap').addEventListener('click',e=>{if(e.target.id==='bigMap')toggleBigMap(false);});
}

/* resetRun：只重置輪迴狀態（血量一律補滿），不負責進場 ——
   讓「校園地圖選區進場」也能套用，走輪迴殿堂繞路血量照樣是滿的 */

/* ═══════════════ 首頁：只留最必要的 ═══════════════
   原本 15 個功能全擠在首頁，學生一開就看到一牆按鈕。
   現在首頁只有「我是誰」「往哪走」，其餘依用途收進選單。 */

/* ═══════════════ 選單：依用途分組 ═══════════════ */

/* 難度與出題範圍改成獨立畫面 */

loadChar();
classroomApplyLaunch();
startClassroomScheduleGuard();
if(grantTestMonsterTeam())saveChar();
loadCampus();
syncZones();
if(!startDungeonHealthGuard())introScreen();
