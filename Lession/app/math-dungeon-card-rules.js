/* math-dungeon-card-rules.js
 * 卡牌抽取、寶石效果與牌組合法性規則。
 * 本檔只處理資料，不建立畫面；CARDS、RARITY、GEMS 由 data 模組提供。
 */
"use strict";

/* 依稀有度權重抽卡（luck 提高稀有度機率）。 */
function rollCard(pool,luck){
  const bag=[];
  for(const id of pool){
    const r=CARDS[id].r||'C';
    let w=RARITY[r].w;
    if(luck){
      if(r==='L')w*=3;
      else if(r==='E')w*=2;
      else if(r==='C')w*=0.5;
    }
    for(let i=0;i<Math.max(1,Math.round(w));i++)bag.push(id);
  }
  return bag[rand(bag.length)];
}

/* 套用寶石與完美刻痕後的實際卡牌效果。 */
function effCard(o){
  if(!o||!CARDS[o.id])return {n:'—',t:'',c:0,r:'C'};
  const c={...CARDS[o.id]};
  switch(o.gem){
    case 'spinach': c.dmg=Math.round((c.dmg||0)*1.4); break;
    case 'candel': c.all=1; break;
    case 'empty': c.c=Math.max(0,c.c-1); break;
    case 'bracer': c.hits=(c.hits||1)+1; break;
    case 'hollow': c.block=(c.block||0)+8; break;
    case 'dup': c.back=1; break;
    case 'wings': c.draw=(c.draw||0)+1; break;
    case 'armor': c.block=(c.block||0)+6; break;
  }
  if(o.perfect&&c.dmg)c.dmg+=3;
  return c;
}

function cardCostText(c){
  return c.wild?'✦ '+c.c:(c.c<0?'−'+Math.abs(c.c):String(c.c));
}

/* 每場戰鬥建立新牌物件並洗牌，避免上一場顯示狀態滲入起手。 */
function freshBattleDraw(){
  return shuffle(S.deck.filter(o=>o&&CARDS[o.id]).map(o=>({...o,_dealt:0})));
}

const mkDeck=a=>a.map(id=>({id,gem:null}));

/* 通用卡最多兩張，避免完全繞過連擊費用曲線。 */
const WILD_CAP=2;
const isWild=id=>!!(CARDS[id]&&CARDS[id].wild);
const wildCount=deck=>(deck||S.deck).filter(o=>o&&isWild(o.id)).length;
const wildFull=()=>wildCount()>=WILD_CAP;

/* 每副牌必須保留 0～4 費各至少一張。 */
const REQUIRED_COSTS=[0,1,2,3,4];
const REQUIRED_COST_FALLBACK={0:'knife',1:'wand',2:'whip',3:'axe',4:'bible'};

function requiredCardCost(o){
  if(!o||!CARDS[o.id])return null;
  /* 看原始費用；寶石只改戰鬥消耗，不改牌組曲線判定。 */
  const c=CARDS[o.id],n=Number(c.c);
  return c.wild||c.neg||c.CURSE||c.TEMP||!Number.isInteger(n)||n<0||n>4?null:n;
}

function deckCostCounts(deck){
  const counts={0:0,1:0,2:0,3:0,4:0};
  for(const o of (deck||[])){
    const c=requiredCardCost(o);
    if(c!==null)counts[c]++;
  }
  return counts;
}

function missingDeckCosts(deck){
  const counts=deckCostCounts(deck);
  return REQUIRED_COSTS.filter(c=>!counts[c]);
}

function canRemoveDeckIndex(index,deck){
  const src=deck||S.deck,o=src[index];
  if(!o||!CARDS[o.id]||effCard(o).EQUIP)return false;
  return missingDeckCosts(src.filter((_,i)=>i!==index)).length===0;
}

function removableDeckIndexes(deck){
  const src=deck||S.deck;
  return src.map((_,i)=>i).filter(i=>canRemoveDeckIndex(i,src));
}

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
    if(!o||typeof o!=='object'||!o.id||!CARDS[o.id]){
      dropped++;
      continue;
    }
    out.push({id:o.id,gem:(o.gem&&GEMS[o.gem])?o.gem:null,perfect:!!o.perfect});
  }
  if(dropped)console.warn('[牌組淨化] 移除 '+dropped+' 張失效卡');

  let wc=0,converted=0;
  for(const o of out){
    if(!isWild(o.id))continue;
    if(++wc<=WILD_CAP)continue;
    o.id='wand';
    converted++;
  }
  if(converted)console.warn('[牌組淨化] 超過萬用卡上限，'+converted+' 張已轉為一般卡');

  const repaired=missingDeckCosts(out);
  for(const cost of repaired){
    const id=REQUIRED_COST_FALLBACK[cost];
    if(CARDS[id])out.push({id,gem:null});
  }
  if(repaired.length)console.warn('[牌組淨化] 已補上必要費用：'+repaired.join('、')+' 費');
  return out;
}
