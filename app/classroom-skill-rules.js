/*

 * classroom-skill-rules：可獨立測試的遊戲規則與數值公式。

 * 本檔必須在固定資料模組之後、主程式之前以一般 script 載入。

 */

/* 每位角色、每種戰鬥模式的時間式冷卻狀態；離開模式時由 resetSkillCooldowns 清除。 */
const SKILL_RUNTIME_CD = {boss:{},arena:{},ga:{}};

function skillList(job){ return SKILL_TREES.common.concat(SKILL_TREES[job] || []); }

function skillDef(job, id){ return skillList(job).find(sk=>sk.id===id); }

function skillLv(s, id){ return (s.skills && s.skills[id]) || 0; }

function normalizeSkillLoadout(s){
  if(!s) return [];
  const known=skillList(s.job).filter(sk=>skillLv(s,sk.id)>0).map(sk=>sk.id);
  let load=Array.isArray(s.skillLoadout) ? s.skillLoadout.filter((id,i,a)=>known.includes(id)&&a.indexOf(id)===i) : [];
  if(!load.length && known.length){
    load=known.slice().sort((a,b)=>{ const sa=skillDef(s.job,a), sb=skillDef(s.job,b); return (sb.tier||1)-(sa.tier||1)||skillLv(s,b)-skillLv(s,a)||sa.pos-sb.pos; }).slice(0,SKILL_LOADOUT_MAX);
  }
  s.skillLoadout=load.slice(0,SKILL_LOADOUT_MAX);
  return s.skillLoadout;
}

function skillEquipped(s,id){ return normalizeSkillLoadout(s).includes(id); }

function activeSkillLv(s,id){ return skillEquipped(s,id) ? skillLv(s,id) : 0; }

function spSpent(s){ let n=0; for(const k in (s.skills||{})) n += s.skills[k]; return n; }

function spSpentTier(s, tier){ return skillList(s.job).filter(sk=>(sk.tier||1)===tier).reduce((n,sk)=>n+skillLv(s,sk.id),0); }

function skillTierUnlocked(s, tier){
  if(tier<=1) return true;
  const levelNeed = tier===3 ? 60 : 30;
  const spentNeed = ADVANCE_SP_NEED[tier]||0;
  return s.level>=levelNeed && spSpentTier(s,tier-1)>=spentNeed;
}

function skillTierLockText(s,tier){
  const levelNeed=tier===3?60:30, spentNeed=ADVANCE_SP_NEED[tier]||0, spent=spSpentTier(s,tier-1);
  const misses=[]; if(s.level<levelNeed) misses.push('Lv.'+levelNeed); if(spent<spentNeed) misses.push((tier-1)+'轉投入 '+spent+'/'+spentNeed+' SP');
  return misses.join('・');
}

function spSpentBranch(s, job, branch, tier){
  let n = 0;
  for(const sk of skillList(job)) if(sk.branch===branch && (sk.tier||1)===(tier||1)) n += skillLv(s, sk.id);
  return n;
}

function skillUnlocked(s, sk){ return skillTierUnlocked(s,sk.tier||1) && spSpentBranch(s, s.job, sk.branch, sk.tier||1) >= BRANCH_GATE[sk.pos-1]; }

function canLevelSkill(s, sk){
  const lv = skillLv(s, sk.id);
  return lv < 5 && s.spPoints > 0 && skillUnlocked(s, sk);
}

function skillVal(s, id){ const sk = skillDef(s.job, id); const lv = activeSkillLv(s, id); return (sk && lv>0) ? sk.val[lv-1] : 0; }

function skillChance(s, id){ const sk = skillDef(s.job,id),lv=activeSkillLv(s,id); if(!(sk&&lv>0&&sk.chance)) return 0; return Math.min(78,sk.chance[lv-1]+intSkillBonus(s)); }

function intCooldownReductionPct(s){
  const x=Math.max(0,Math.min(190,totalStats(s).int-10));
  return Math.min(35,x/190*35);
}

function skillCooldownSeconds(s,id){
  const sk=skillDef(s.job,id); if(!sk) return 2;
  const tier=sk.tier||1, kind=sk.kind||'passive';
  const ultimate=(ADVANCE_ULTIMATES[s.job]||[]).find(u=>u.id===id);
  const tactical = sk.short==='召喚物' || /trap|mine|summon|familiar|squire|wolf|sprite/.test(id);
  const guard = kind==='aura'||kind==='def'||kind==='sur';
  const areaControl=/storm|blizzard|meteor|chain|freeze|prison|domain|field|wall|banner|rain|volley|rift|doom|sanct|fortress|mass|thousand|heaven/.test(id);
  let base=ultimate?ultimate.cd:(tier===3?(tactical ? 18 : (areaControl ? 17 : (guard ? 16 : 14))):(tier===2?(tactical ? 11 : (areaControl ? 10 : (guard ? 9 : 8))):(areaControl||guard ? 6 : 4)));
  const floor=ultimate?Math.ceil(base*.72):(tier===3?9:(tier===2?5:2));
  const reduced=Math.ceil(base*(1-intCooldownReductionPct(s)/100)*10)/10;
  return Math.max(floor,reduced);
}

function arenaSkillCooldownSeconds(s,id){
  const sk=skillDef(s.job,id); if(!sk) return 2;
  const base=skillCooldownSeconds(s,id),tier=sk.tier||1,ultimate=arenaSkillIsUltimate(s,id);
  return ultimate?Math.max(10,Math.ceil(base*.28)):(tier===3?Math.max(5,Math.ceil(base*.42)):(tier===2?Math.max(4,Math.ceil(base*.55)):Math.max(2,Math.ceil(base*.70))));
}

function resetSkillCooldowns(scope){ SKILL_RUNTIME_CD[scope]={}; }

function skillCooldownInfo(scope,sid,id){
  const all=SKILL_RUNTIME_CD[scope]||(SKILL_RUNTIME_CD[scope]={}),map=all[sid]||(all[sid]={}),entry=map[id];
  if(!entry) return {left:0,total:0,pct:0};
  /* 舊存檔／舊頁面殘留的數字冷卻自動轉成秒數物件。 */
  if(typeof entry==='number'){
    if(entry<=0){delete map[id];return {left:0,total:0,pct:0};}
    const now=Date.now(),total=Math.max(1,entry);
    map[id]={startedAt:now,readyAt:now+total*1000,durationMs:total*1000};
  }
  const cur=map[id],left=Math.max(0,(cur.readyAt-Date.now())/1000),total=Math.max(.1,(cur.durationMs||1000)/1000);
  if(left<=0){delete map[id];return {left:0,total,pct:0};}
  return {left,total,pct:Math.max(0,Math.min(100,left/total*100))};
}

function skillCooldownActive(scope,sid,id){ return skillCooldownInfo(scope,sid,id).left>0; }

function startSkillCooldown(scope,s,id,seconds){
  const all=SKILL_RUNTIME_CD[scope]||(SKILL_RUNTIME_CD[scope]={}),map=all[s.id]||(all[s.id]={});
  const total=Math.max(1,Number(seconds)||skillCooldownSeconds(s,id)),now=Date.now();
  map[id]={startedAt:now,readyAt:now+total*1000,durationMs:total*1000};
  return map[id];
}

function clearSkillCooldown(scope,sid,id){
  const map=((SKILL_RUNTIME_CD[scope]||{})[sid]||{}); delete map[id];
}

function runtimeCooldownSnapshot(scope,sid){
  const map=((SKILL_RUNTIME_CD[scope]||{})[sid]||{}),out={};
  Object.keys(map).forEach(id=>{const info=skillCooldownInfo(scope,sid,id);if(info.left>0)out[id]={left:+info.left.toFixed(2),total:+info.total.toFixed(2),pct:+info.pct.toFixed(1)};});
  return out;
}

function fighterCooldownInfo(f,key){
  const readyAt=Number(f&&f[key+'ReadyAt'])||0,total=Math.max(.1,Number(f&&f[key+'CdTotal'])||1),left=Math.max(0,(readyAt-Date.now())/1000);
  if(f&&left<=0){f[key+'ReadyAt']=0;return {left:0,total,pct:0};}
  return {left,total,pct:Math.max(0,Math.min(100,left/total*100))};
}

function fighterCooldownLeft(f,key){return fighterCooldownInfo(f,key).left;}

function startFighterCooldown(f,key,seconds){
  const total=Math.max(1,Number(seconds)||1);f[key+'CdTotal']=total;f[key+'ReadyAt']=Date.now()+total*1000;return total;
}

function jobSkillCooldownSeconds(s){
  const js=JOB_SKILL[s.job]||{cd:25};
  const base=Math.round(js.cd/2),reduced=Math.ceil(base*(1-intCooldownReductionPct(s)/100)*10)/10;
  return Math.max(6,reduced);
}

function shiftRuntimeCooldowns(scope,deltaMs){
  const all=SKILL_RUNTIME_CD[scope]||{};
  Object.values(all).forEach(map=>Object.values(map||{}).forEach(entry=>{if(entry&&typeof entry==='object'&&entry.readyAt)entry.readyAt+=deltaMs;}));
}

function tickSkillCooldowns(scope,sid){
  const map=((SKILL_RUNTIME_CD[scope]||{})[sid]||{});
  Object.keys(map).forEach(id=>skillCooldownInfo(scope,sid,id));
}
