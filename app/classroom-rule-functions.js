/*

 * classroom-rule-functions：可獨立測試的遊戲規則與數值公式。

 * 本檔必須在固定資料模組之後、主程式之前以一般 script 載入。

 */

function tierInfo(key){ return BP_TIERS.find(t=>t.key===key) || BP_TIERS[0]; }

function affixInfo(key){ return AFFIXES.find(a=>a.key===key) || null; }

function affixPool(grade){return AFFIXES.filter(a=>a.grade===(grade==="legend"?"legend":"rare"));}

function rollAffix(grade){const pool=affixPool(grade);return pool[Math.floor(Math.random()*pool.length)].key;}

function allocateStatBudget(total,weights){
  const raw=weights.map((w,i)=>({i,v:w*total,n:Math.floor(w*total)})),out=raw.map(x=>x.n);let left=total-out.reduce((a,n)=>a+n,0);
  raw.sort((a,b)=>(b.v-b.n)-(a.v-a.n)).forEach(x=>{if(left>0){out[x.i]++;left--;}});return out;
}

function rollBlueprintStatRange(type,tier){
  if(tier!=="rare"&&tier!=="legend")return null;
  const maxTotal=tierInfo(tier).statMax,minTotal=tier==="legend"?14:9;
  const choices={weapon:[[.58,.10,.10,.22],[.18,.08,.12,.62]],hat:[[.08,.42,.08,.42]],clothes:[[.14,.58,.08,.20]],pants:[[.18,.48,.26,.08]],shoes:[[.12,.25,.55,.08]],back:[[.25,.25,.25,.25]]};
  const list=choices[type]||choices.back,w=list[Math.floor(Math.random()*list.length)],mx=allocateStatBudget(maxTotal,w),mn=allocateStatBudget(minTotal,w);
  const out={};BP_STAT_KEYS.forEach((k,i)=>out[k]=[Math.min(mn[i],mx[i]),mx[i]]);return out;
}

function encodeBlueprintStats(bounds){
  const code={atk:"A",def:"D",agi:"G",int:"I"};
  return bounds?BP_STAT_KEYS.map(k=>code[k]+bounds[k][0]+"-"+bounds[k][1]).join("_"):"";
}

function decodeBlueprintStats(code){
  if(!code)return null;const out={};String(code).split("_").forEach(p=>{const m=/^([ADGI])(\d+)-(\d+)$/.exec(p);if(m){let k={A:"atk",D:"def",G:"agi",I:"int"}[m[1]];if(m[1]==="A"&&out.atk&&!out.agi)k="agi";out[k]=[+m[2],+m[3]];}});return BP_STAT_KEYS.every(k=>out[k])?out:null;
}

function blueprintStatText(code){const b=decodeBlueprintStats(code);return b?BP_STAT_KEYS.map(k=>({atk:"⚔",def:"🛡",agi:"💨",int:"🔮"}[k])+b[k][0]+"–"+b[k][1]).join(" "):"";}

function forgeStatsFromBounds(code){const b=decodeBlueprintStats(code);if(!b)return null;const out={};BP_STAT_KEYS.forEach(k=>out[k]=b[k][0]+Math.floor(Math.random()*(b[k][1]-b[k][0]+1)));return out;}

function forgeWeaponSkillInfo(id){return FORGE_WEAPON_SKILLS.find(x=>x.id===id)||null;}

function rollForgeWeaponSkill(){return FORGE_WEAPON_SKILLS[Math.floor(Math.random()*FORGE_WEAPON_SKILLS.length)].id;}

function levelStatBudget(tier,level,type){
  if(!EQUIP_SLOTS.includes(type)) return 0;
  const ti=tierInfo(tier||"common"),rg=ITEM_LEVEL_RANGE[ti.key]||[1,90];
  const lv=Math.max(rg[0],Math.min(rg[1],Math.round(Number(level)||rg[0]))),span=Math.max(1,rg[1]-rg[0]);
  const progress=(lv-rg[0])/span;
  return Math.max(1,Math.min(ti.statMax,Math.round(ti.statMax*(.45+.55*progress))));
}

function itemLevelOf(it){
  if(!it) return 1;
  const explicit=Math.round(Number(it.itemLevel)||0);
  if(explicit>0) return Math.max(1,Math.min(90,explicit));
  return ITEM_LEVEL_BY_TIER[it.tier]||ITEM_LEVEL_BY_RARITY[it.rarity]||1;
}

function equipmentPriceFloor(it){
  if(!it || !ALL_SLOTS.includes(it.type)) return Math.max(0,Math.round(Number(it&&it.price)||0));
  const lv=itemLevelOf(it),ti=it.tier?tierInfo(it.tier):null;
  const statValue=(Number(it.atk)||0)*22+(Number(it.def)||0)*18+(Number(it.agi)||0)*20+(Number(it.int)||0)*20;
  const fxValue=({none:0,sparkle:20,glow:35,both:60,flameFx:60,windFx:60,frostFx:60,earthFx:60,holyFx:120,voidFx:120,dragonFx:140})[it.fx||"none"]||0;
  const af=it.affix?affixInfo(it.affix):null,affixValue=af?(af.price||80):0;
  const weaponSkillValue=it.weaponSkill?140:0;
  const rarityFloor=ti?ti.minPrice:({Common:30,Rare:150,Legendary:250,Custom:30}[it.rarity]||30);
  return Math.max(rarityFloor,Math.ceil((25+lv*3+statValue+fxValue+affixValue+weaponSkillValue)/10)*10);
}

function itemPower(it){
  if(!it) return 0;
  let p = (it.atk||0)*3 + (it.def||0)*2 + (it.agi||0)*2 + (it.int||0)*2;
  if(it.affix) p += 15;
  if(it.fx && it.fx!=="none") p += 5;
  if(it.weaponPattern) p += 20;
  if(it.weaponSkill) p += 15;
  return p;
}

function xpForNextLevel(level){ return level>=LEVEL_CAP ? Infinity : level*100; }

function cumXpForLevel(level){ let t=0; for(let n=1;n<level;n++) t+=n*100; return t; }

function gradeStageOf(level){
  for(const m of GRADE_MILESTONES) if(level<=m.level) return m;
  return GRADE_MILESTONES[GRADE_MILESTONES.length-1];
}
