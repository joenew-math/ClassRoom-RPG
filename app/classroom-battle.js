/*
 * classroom-battle：一對一競技、團體戰、Dota／知識攻塔、AI、移動、碰撞、技能與即時報名控制器。
 * 本檔沿用 classic script 全域依賴，必須在題庫控制器之後、角色介面與主程式之前載入。
 */

function arenaGaugeGain(s){
  const agi=Math.max(1,totalStats(s).agi||1);
  let gain=1.1+Math.sqrt(Math.max(0,agi-10))*.09;
  gain=Math.min(s.job==="Rogue"?2.35:2.15,gain);
  return gain;
}

function arenaStart(sidA, sidB, friendly){
  resetSkillCooldowns('arena');
  const A = stu(sidA), B = stu(sidB);
  if(!A || !B || A.id===B.id){ toast("請選兩位不同的學生", true); return; }
  ARENA.a = A.id; ARENA.b = B.id; ARENA.friendly = !!friendly;
  ARENA.maxA = A.maxHp + skillMaxHpBonus(A);
  ARENA.maxB = B.maxHp + skillMaxHpBonus(B);
  ARENA.hpA = ARENA.maxA; ARENA.hpB = ARENA.maxB;
  ARENA.gA = 0; ARENA.gB = 0; ARENA.turns = 0;
  ARENA.skillDryA=0;ARENA.skillDryB=0;
  ARENA.wardA = 0; ARENA.wardB = 0; ARENA.healCutA=0; ARENA.healCutB=0; // 護罩與戰士壓制治療狀態
  ARENA.ultA = false; ARENA.ultB = false;                 // 大招每場一次
  ARENA.active = true; ARENA.over = false; ARENA.acting = false; ARENA.speed = 1;
  render();
  arenaLog("⚔️ "+A.name+" VS "+B.name+"!決鬥開始!");
  ARENA.timer = setInterval(arenaTick, 50);
}

function arenaStop(){
  if(ARENA.timer){ clearInterval(ARENA.timer); ARENA.timer = null; }
  ARENA.active = false; ARENA.acting = false;
}

function arenaLog(msg){
  const el = document.getElementById("arLog");
  if(!el) return;
  el.innerHTML = '<div>'+esc(msg)+'</div>' + el.innerHTML;
  while(el.children.length > 8) el.removeChild(el.lastChild);
}

function arenaTick(){
  if(!ARENA.active || ARENA.over || ARENA.acting) return;
  const A = stu(ARENA.a), B = stu(ARENA.b);
  if(!A || !B){ arenaStop(); return; }
  // 敏捷越高仍越快，但採平方根遞減並封頂；避免高等遊俠不到一秒連續出手。
  ARENA.gA += arenaGaugeGain(A) * ARENA.speed;
  ARENA.gB += arenaGaugeGain(B) * ARENA.speed;
  const bA = document.getElementById("gaugeA"), bB = document.getElementById("gaugeB");
  if(bA) bA.style.width = Math.min(100, ARENA.gA) + "%";
  if(bB) bB.style.width = Math.min(100, ARENA.gB) + "%";
  if(ARENA.gA >= 100 && ARENA.gA >= ARENA.gB){ ARENA.gA = 0; arenaAct("A"); }
  else if(ARENA.gB >= 100){ ARENA.gB = 0; arenaAct("B"); }
}

function arenaAct(side){
  ARENA.acting = true;
  ARENA.turns++;
  const att = stu(side==="A" ? ARENA.a : ARENA.b);
  const dfd = stu(side==="A" ? ARENA.b : ARENA.a);
  const on = skillsEnabled();
  tickSkillCooldowns('arena',att.id);
  const roll = (id)=> on && rollCombatSkill(att,id,'arena');
  const D = 400 / ARENA.speed;                          // 動畫時基
  const dollAtt = document.getElementById("doll"+side);
  const dollDfd = document.getElementById("doll"+(side==="A"?"B":"A"));
  const anchAtt = '#doll'+side, anchDfd = '#doll'+(side==="A"?"B":"A");

  // 0. 大招:Lv5解鎖,HP首次低於40%時發動(每場一次)
  const ultUsed = side==="A" ? ARENA.ultA : ARENA.ultB;
  if(!ultUsed && ultReady(att) && myHpPct() < 0.4){
    if(side==="A") ARENA.ultA = true; else ARENA.ultB = true;
    const u = ULT_DEFS[att.job] || { name:"全力一擊", mult:2 };   // 🔄 新職業預設大招
    ultFxPlay(att.job, anchDfd);
    let umult = arenaDmgMult(att) * (ARENA_JOB_TUNE[att.job]||1) * u.mult;
    if(att.job==="Mage" && dfd.job==="Cleric") umult *= TRAIT_TUNE.sanctuary;   // ✨神聖庇護:大招也減傷
    if(hasAdvantage(dfd.job, att.job)) umult *= TRAIT_TUNE.underdog;             // 🔥逆境之魂:大招也吃(發動時HP必<40%)
    const hits = u.hits || 1;
    const dfdMax = side==="A" ? ARENA.maxB : ARENA.maxA;
    let hitArr = [];
    for(let h=0; h<hits; h++) hitArr.push(Math.max(1, Math.round((12 + Math.floor(Math.random()*8)) * umult * arenaDefMult(dfd))));
    let totalU = hitArr.reduce((x,y)=>x+y,0);
    const cap = Math.max(1, Math.floor(dfdMax * ULT_CAP));
    if(totalU > cap){                                    // 防秒殺:超上限等比縮放
      const k = cap / totalU;
      hitArr = hitArr.map(v=>Math.max(1, Math.round(v*k)));
      totalU = hitArr.reduce((x,y)=>x+y,0);
    }
    hitArr.forEach((ud,h)=> setTimeout(()=> dmgPop(ud, anchDfd, "dmg", {maxHp:dfdMax}), 260*h + 400));
    if(u.selfHeal){
      let uHeal = u.selfHeal;
      if(att.job==="Cleric" && dfd.job==="Rogue") uHeal = Math.floor(uHeal*TRAIT_TUNE.healCut);   // 🗡治療干擾:大招自癒也打折
      const uh = Math.min(uHeal, myMaxOf() - myHpOf());
      if(side==="A") ARENA.hpA += uh; else ARENA.hpB += uh;
      setTimeout(()=> dmgPop(uh, anchAtt, "heal"), 500);
    }
    if(side==="A") ARENA.hpB = Math.max(0, ARENA.hpB - totalU);
    else ARENA.hpA = Math.max(0, ARENA.hpA - totalU);
    if(dollAtt) dollAtt.classList.add(side==="A" ? "ar-lunge-r" : "ar-lunge-l");
    if(dollDfd) dollDfd.classList.add("ar-hurt");
    arenaLog("💫 "+att.name+" 對 "+dfd.name+" 發動大招【"+u.name+"】造成傷害 "+totalU+(att.job==="Mage"&&dfd.job==="Cleric"?"(✨神聖庇護)":""));
    setTimeout(()=>{
      if(dollAtt) dollAtt.classList.remove("ar-lunge-r","ar-lunge-l");
      if(dollDfd) dollDfd.classList.remove("ar-hurt");
      arenaUpdateHp(); arenaAfterAct();
    }, D*3);
    return;
  }
  function myHpPct(){ return (side==="A"?ARENA.hpA/ARENA.maxA:ARENA.hpB/ARENA.maxB); }
  function myMaxOf(){ return side==="A"?ARENA.maxA:ARENA.maxB; }
  function myHpOf(){ return side==="A"?ARENA.hpA:ARENA.hpB; }
  // 1. 從目前五格技能組選一招；法師施放法術，牧師依血量優先治療或防護。
  const myHp = side==="A" ? ARENA.hpA : ARENA.hpB;
  const myMax = side==="A" ? ARENA.maxA : ARENA.maxB;
  const arenaChoice=on?arenaPickEquippedSkill(att,side,myHp/myMax):null;
  const dryKey=side==="A"?"skillDryA":"skillDryB";ARENA[dryKey]=arenaChoice?0:(ARENA[dryKey]||0)+1;
  const supportType=arenaSkillSupportType(arenaChoice);
  let healAmt = 0;
  const heavenGuard=!!(arenaChoice&&arenaChoice.id==="heaven_guard");
  if(arenaChoice&&supportType==="heal"&&myHp<myMax*.95){
    healAmt=arenaSkillHealAmount(att,arenaChoice,myMax);
    if(dfd.job==="Rogue" && att.job==="Cleric"){ healAmt = Math.floor(healAmt*TRAIT_TUNE.healCut); }   // 🗡 治療干擾:遊俠剋牧師,回血打折
    healAmt = Math.min(healAmt, myMax - myHp);
  }
  const ownHealCut=side==="A"?"healCutA":"healCutB";
  if(healAmt>0 && (ARENA[ownHealCut]||0)>0){ healAmt=Math.max(1,Math.round(healAmt*.55)); ARENA[ownHealCut]--; }
  if(heavenGuard){
    healAmt=Math.max(healAmt,Math.min(Math.round(myMax*.13),myMax-myHp));
    if(side==="A") ARENA.wardA=4; else ARENA.wardB=4;
  }
  if(arenaChoice&&supportType==="ward"){if(side==="A")ARENA.wardA=Math.max(ARENA.wardA||0,(arenaChoice.tier||1)+1);else ARENA.wardB=Math.max(ARENA.wardB||0,(arenaChoice.tier||1)+1);}
  if(arenaChoice&&supportType==="tempo"){const gk=side==="A"?"gA":"gB";ARENA[gk]=Math.min(100,(ARENA[gk]||0)+18+(arenaChoice.tier||1)*4);}

  // 2. 攻擊:基礎傷害+技能倍率
  let mult = arenaDmgMult(att) * (ARENA_JOB_TUNE[att.job]||1);
  if(healAmt > 0) mult *= 0.6;                            // 攻守一體:邊打邊補,傷害減少
  // 🔥 逆境之魂:被克方 HP<50% 時傷害提升(有機會翻盤)
  const underdog = hasAdvantage(dfd.job, att.job) && myHp < myMax*0.5;
  if(underdog) mult *= TRAIT_TUNE.underdog;
  let skillName=arenaChoice?arenaChoice.name:"",skillId=arenaChoice?arenaChoice.id:null,popStyle=skillId?SKILL_POP[skillId]:null;
  let best=arenaChoice?arenaSkillMult(att,arenaChoice):1;
  if(heavenGuard){ best=Math.max(best,1.15); skillName="天穹守護"; skillId="heaven_guard"; popStyle=null; }
  mult *= best;
  // 🌀 AGI 只能閃物理攻擊；法師已觸發的法術為必中，不會被敏捷迴避。
  const dfdAnch = side==="A" ? "#arFB" : "#arFA";
  const magicSpell=isMagicSpell(att,skillId);
  if(!magicSpell && Math.random()*100 < combatDodgeChance(att,dfd,skillId)){
    arenaLog(dfd.name+" 靈巧地閃過了 "+att.name+" 的攻擊!");
    comicPop("MISS!","cloud","#4a90d9", dfdAnch);
    const rp=rogueWarriorProfile(att,dfd);
    if(rp.active){
      const gaugeKey=side==="A"?"gB":"gA"; ARENA[gaugeKey]=Math.min(100,(ARENA[gaugeKey]||0)+rp.gain);
      counterSkillFx('rogue',dfdAnch); comicPop('疾風反步!','cloud','#79e2bd',dfdAnch);
      arenaLog("💨 "+dfd.name+" 的疾閃技能反制戰士物攻，行動條 +"+rp.gain+"%!");
    }
    setTimeout(()=>arenaAfterAct(),Math.max(120,D*.6));
    return;
  }
  const base = 10 + Math.floor(Math.random()*8);
  let dmg = Math.max(1, Math.round(base * mult * advancementDamageMult(att) * arenaDefMult(dfd) * advancementWardMult(dfd) * GA_PACE * gaFrenzyDmg()));
  // 防禦方格擋/聖盾 + 技能特性相剋
  let blocked = "", trait = "";
  const pierce = att.job==="Mage" && dfd.job==="Warrior" && !!skillId;    // 🔮 法術穿透:法師技能無視戰士格擋+加傷
  if(pierce) dmg = Math.round(dmg * TRAIT_TUNE.pierceBonus);
  if(!pierce && on && skillLv(dfd,"block") && Math.random()*100 < skillChance(dfd,"block")){
    if(dfd.job==="Warrior" && att.job==="Rogue"){ dmg = Math.round(dmg*TRAIT_TUNE.ironWall); blocked = "🛡鐵壁格擋"; }   // 戰士剋遊俠:格擋加深
    else{ dmg = Math.round(dmg*0.5); blocked = "🧱格擋"; }
  }
  else if(on && skillLv(dfd,"shield") && Math.random()*100 < skillChance(dfd,"shield")){ dmg = Math.round(dmg*0.7); blocked = "🔰聖盾"; }
  const wardKey=side==="A" ? "wardB" : "wardA";
  if((ARENA[wardKey]||0)>0){ dmg=Math.max(1,Math.round(dmg*.55)); ARENA[wardKey]--; blocked="☀️天穹守護"; }
  if(pierce && on && skillLv(dfd,"block")) trait = "🔮法術穿透";           // 有格擋技能才顯示穿透(否則無感)
  const counter=jobCounterDamage(att,dfd,skillId,dmg); dmg=counter.dmg;
  if(counter.label) trait=(trait?trait+"+":"")+counter.label;
  const mageLock=mageRogueProfile(att,dfd,skillId);
  if(mageLock.active){
    const gaugeKey=side==="A"?"gB":"gA"; ARENA[gaugeKey]=Math.max(0,(ARENA[gaugeKey]||0)-mageLock.drain);
    trait=(trait?trait+"+":"")+"🔮奧術鎖定";
  }
  if(underdog) trait = (trait?trait+"+":"") + "🔥逆境之魂";
  const critical=resolveCriticalHit(att,skillId,dmg,{allow:!arenaSkillIsUltimate(att,skillId)&&skillId!=="__ult"});
  dmg=critical.dmg;
  if(critical.crit) trait=(trait?trait+"+":"")+(critical.embedded?(skillId==="lethal"?"☠️致命爆擊":"🗡️爆擊"):("💥爆擊×"+critical.mult.toFixed(2)));
  const arenaAtkAffixes=triggeredAffixes(att,"atk"),arenaDefAffixes=triggeredAffixes(dfd,"def");
  let affixHeal=0,affixReflect=0,affixPhoenix=0;const affixMsgs=[];
  const atkGaugeKey=side==="A"?"gA":"gB",dfdGaugeKey=side==="A"?"gB":"gA",dfdExposeKey=side==="A"?"affixExposeB":"affixExposeA";
  const oldExpose=side==="A"?ARENA.affixExposeB:ARENA.affixExposeA;
  if(oldExpose){dmg=Math.max(1,Math.round(dmg*(1+oldExpose)));if(side==="A")ARENA.affixExposeB=0;else ARENA.affixExposeA=0;affixMsgs.push("🗡️弱點");}
  arenaAtkAffixes.forEach(af=>{
    if(af.mult){let m=af.mult;if(af.execute&&(side==="A"?ARENA.hpB/ARENA.maxB:ARENA.hpA/ARENA.maxA)<=af.execute)m+=.7;dmg=Math.max(1,Math.round(dmg*m));}
    if(af.expose)ARENA[dfdExposeKey]=Math.max(ARENA[dfdExposeKey]||0,af.expose);
    if(af.key==="frost")ARENA[dfdGaugeKey]=Math.max(0,(ARENA[dfdGaugeKey]||0)-25);
    if(af.key==="venom")dmg+=af.dot*3;
    if(af.heal)affixHeal+=af.heal;
    if(af.groupHeal)affixHeal+=Math.max(1,Math.round(myMax*af.groupHeal));
    if(af.gauge)ARENA[atkGaugeKey]=Math.min(100,(ARENA[atkGaugeKey]||0)+af.gauge);
    affixMsgs.push(af.icon+af.name);
  });
  arenaDefAffixes.forEach(af=>{if(af.reduce)dmg=Math.max(1,Math.round(dmg*af.reduce));if(af.reflect)affixReflect=Math.max(affixReflect,af.reflect);if(af.revive)affixPhoenix=Math.max(affixPhoenix,af.revive);affixMsgs.push(af.icon+af.name);});

  // 動畫序列:衝刺→命中(技能框+扣血+震動)→回位→結算
  if(dollAtt) dollAtt.classList.add(side==="A" ? "ar-lunge-r" : "ar-lunge-l");
  setTimeout(()=>{
    if(skillName && popStyle) comicPop(popStyle[0], popStyle[1], popStyle[2], anchAtt);
    if(skillId){
      const sk=skillDef(att.job,skillId);
      if(skillId==='heaven_guard') advancedCombatFx(att,skillId,anchAtt);
      else if(sk && (sk.tier||1)>=2) advancedCombatFx(att,skillId,anchDfd);
      else skillFxPlay(skillId, anchDfd);
    }
    if(blocked){ comicPop(blocked.slice(2)+"!","spike","#4bc0e8", anchDfd); skillFxPlay("block", anchDfd); }
    if(counter.label) counterSkillFx('cleric',anchDfd);
    if(mageLock.active){ counterSkillFx('mage',anchDfd); comicPop('奧術鎖定!','boom','#9b8cff',anchDfd); }
    if(trait) comicPop(trait+"!","boom", trait.startsWith("🔮")?"#6a5acd":"#ffd234", anchDfd);
    dmgPop(dmg, anchDfd, critical.crit?"crit":"dmg", {maxHp:side==="A"?ARENA.maxB:ARENA.maxA});
    if(dollDfd) dollDfd.classList.add("ar-hurt");
    if(side==="A") ARENA.hpB = Math.max(0, ARENA.hpB - dmg);
    else ARENA.hpA = Math.max(0, ARENA.hpA - dmg);
    if(affixPhoenix>0 && (side==="A"?ARENA.hpB:ARENA.hpA)<=0){const revived=Math.max(1,Math.round((side==="A"?ARENA.maxB:ARENA.maxA)*affixPhoenix));if(side==="A")ARENA.hpB=revived;else ARENA.hpA=revived;comicPop("鳳凰涅槃!","boom","#ff8a4c",anchDfd);dmgPop(revived,anchDfd,"heal");}
    if(affixReflect>0){const ref=Math.max(1,Math.round(dmg*affixReflect));if(side==="A")ARENA.hpA=Math.max(0,ARENA.hpA-ref);else ARENA.hpB=Math.max(0,ARENA.hpB-ref);dmgPop(ref,anchAtt,"dmg");}
    if(affixHeal>0){const got=Math.min(affixHeal,myMax-(side==="A"?ARENA.hpA:ARENA.hpB));if(side==="A")ARENA.hpA+=got;else ARENA.hpB+=got;if(got)dmgPop(got,anchAtt,"heal");}
    if(affixMsgs.length){comicPop(affixMsgs.join(" "),"cloud","#ffd563",anchAtt);arenaLog("✨ 裝備詞條觸發："+affixMsgs.join("、"));}
    const suppress=warriorSuppressionProfile(att,dfd,skillId);
    if(suppress.active){
      const cutKey=side==="A"?"healCutB":"healCutA",defWard=side==="A"?"wardB":"wardA";
      ARENA[cutKey]=Math.max(ARENA[cutKey]||0,suppress.tier>=3?4:suppress.tier===2?3:2);
      ARENA[defWard]=Math.max(0,(ARENA[defWard]||0)-suppress.strip);
      counterSkillFx('warrior',anchDfd); comicPop('守護崩解!','spike','#ff775f',anchDfd); trait=(trait?trait+"+":"")+'⚔️治療壓制';
    }
    if(healAmt > 0){                                                 // 攻守一體:同回合回血
      if(side==="A") ARENA.hpA = Math.min(myMax, ARENA.hpA + healAmt);
      else ARENA.hpB = Math.min(myMax, ARENA.hpB + healAmt);
      if(dollAtt) dollAtt.classList.add("ar-heal");
      skillFxPlay("heal", anchAtt);
      dmgPop(healAmt, anchAtt, "heal");
    }
    arenaUpdateHp();
    let logMsg = att.name+" 對 "+dfd.name+" 使用【"+(skillName||"普通攻擊")+"】造成傷害 "+dmg
      + (trait?"("+trait+")":"") + (blocked?"("+blocked+")":"");
    if(healAmt > 0) logMsg += ",同時恢復生命 "+healAmt+(dfd.job==="Rogue"&&att.job==="Cleric"?"(🗡治療受干擾)":"");
    arenaLog(logMsg);
    setTimeout(()=>{
      if(dollAtt) dollAtt.classList.remove("ar-lunge-r","ar-lunge-l","ar-heal");
      if(dollDfd) dollDfd.classList.remove("ar-hurt");
      arenaAfterAct();
    }, D*1.2);
  }, D);
}

function arenaUpdateHp(){
  const hA = document.getElementById("hpA"), hB = document.getElementById("hpB");
  if(hA){ hA.style.width = (ARENA.hpA/ARENA.maxA*100)+"%"; document.getElementById("hpAt").textContent = ARENA.hpA+"/"+ARENA.maxA; }
  if(hB){ hB.style.width = (ARENA.hpB/ARENA.maxB*100)+"%"; document.getElementById("hpBt").textContent = ARENA.hpB+"/"+ARENA.maxB; }
}

function arenaAfterAct(){
  ARENA.acting = false;
  if(ARENA.hpA<=0 || ARENA.hpB<=0){ arenaEnd(ARENA.hpA<=0 ? "B" : "A"); return; }
  if(ARENA.turns >= 40){ arenaEnd(ARENA.hpA/ARENA.maxA >= ARENA.hpB/ARENA.maxB ? "A" : "B", true); }
}

function arenaEnd(winSide, byTime){
  ARENA.over = true;
  if(ARENA.timer){ clearInterval(ARENA.timer); ARENA.timer = null; }
  const win = stu(winSide==="A" ? ARENA.a : ARENA.b);
  const lose = stu(winSide==="A" ? ARENA.b : ARENA.a);
  const dollW = document.getElementById("doll"+winSide);
  const dollL = document.getElementById("doll"+(winSide==="A"?"B":"A"));
  if(dollL) dollL.classList.add("ar-ko");
  if(dollW) dollW.classList.add("ar-win");
  const bn = document.getElementById("arWinner");
  if(bn){ bn.style.display=""; bn.innerHTML = '🏆 WINNER:'+esc(win.name)+(byTime?"(時間到,依剩餘HP判定)":""); }
  arenaLog("🏆 "+win.name+" 獲勝!"+(byTime?"(判定勝)":"KO!"));
  if(!ARENA.friendly){
    grantXp(win, 20); grantXp(lose, 10);
    const loot = Math.min(lose.gold, 30 + Math.floor(Math.random()*21));   // 奪取30~50金(不超過對方持有)
    lose.gold -= loot; win.gold += loot;
    const bn2 = document.getElementById("arWinner");
    if(bn2 && loot>0) bn2.innerHTML += '<div style="font-size:16px;margin-top:4px">💰 奪取 '+loot+' 金幣!</div>';
    addLog(win.id, "⚔️ 競技場獲勝 +20 XP,奪取 "+lose.name+" 的 "+loot+" 金幣!");
    addLog(lose.id, "⚔️ 競技場惜敗 +10 XP,被奪走 "+loot+" 金幣(對手:"+win.name+")");
    toast("🏆 "+win.name+" +20XP、奪金 "+loot+";"+lose.name+" +10XP");
    save();
  }
  sfx("levelup");
}

function gaMap(){ return BATTLE_MAPS[GARENA.mapKey||"plain"] || BATTLE_MAPS.plain; }

function gaIsBlocked(x,y){
  const m = gaMap();
  if((m.obstacles||[]).some(o=> o[0]===x && o[1]===y && x<GARENA.W && y<GARENA.H)) return true;
  return !!gaStructureAt(x,y);
}

function gaZoneAt(x,y){
  const m = gaMap();
  for(const z of (m.zones||[])){
    if(z.cells === "leftEdge"){ if(x<=1) return z; continue; }
    if(z.cells === "rightEdge"){ if(x>=GARENA.W-2) return z; continue; }
    if(Array.isArray(z.cells) && z.cells.some(c=> c[0]===x && c[1]===y)) return z;
  }
  return null;
}

function gaIsKnowledgeMoba(){return GARENA.mode==="mobaKnowledge";}

function gaIsMoba(){ return GARENA.mode==="moba" || GARENA.mode==="mobaKnowledge" || (GARENA.active && gaMap().mode==="moba"); }

function gaStructureAt(x,y){ return (GARENA.structures||[]).find(q=>q.alive!==false&&q.x===x&&q.y===y) || null; }

function gaMobaConfigureMap(perTeam){
  const n=Math.max(3,Math.min(MOBA_TEAM_MAX,perTeam||3));
  const W=n<=3?18:(n<=6?20:(n<=10?24:28)),H=n<=3?10:(n<=6?12:(n<=10?14:16)),m=BATTLE_MAPS.moba;
  const rx=Math.floor(W/2)-1,rx2=rx+1,mid1=Math.floor(H/2)-1,mid2=mid1+1;
  const topY=Math.max(2,Math.round(H*.22)),botY=H-1-topY;
  const walls=[];for(let x=3;x<=W-4;x++)if(x!==rx&&x!==rx2){walls.push([x,mid1],[x,mid2]);}
  const river=[];for(let y=0;y<H;y++)river.push([rx,y],[rx2,y]);
  const lane=[];for(let x=0;x<W;x++)lane.push([x,topY-1],[x,topY],[x,botY],[x,Math.min(H-1,botY+1)]);
  const brush=[[4,topY-1],[5,topY-1],[W-6,topY-1],[W-5,topY-1],[4,botY+1],[5,botY+1],[W-6,botY+1],[W-5,botY+1]];
  m.W=W;m.H=H;m.name="榮耀峽谷・"+n+"v"+n;m.obstacles=walls;
  m.zones=[{cells:river,kind:"river",icon:"≈",label:"緩流河道（行動減速）"},{cells:brush,kind:"brush",icon:"♧",label:"月桂草叢"},{cells:lane,kind:"lane",icon:"",label:"榮耀之路"}];
  GARENA.W=W;GARENA.H=H;GARENA.mobaSize=n;GARENA.mobaTopY=topY;GARENA.mobaBotY=botY;
}

function gaMobaInitStructures(){
  const W=GARENA.W,H=GARENA.H,topY=GARENA.mobaTopY||2,botY=GARENA.mobaBotY||(H-3),mid=Math.floor(H/2);
  const mirrorX=x=>W-1-x;                                    // 所有藍方物件由紅方水平鏡射，保證地圖公平對稱
  if(gaIsKnowledgeMoba()){
    // 知識攻塔沒有核心城堡與重生溫泉；每個答案領域後方各有一座不可拆除的答案塔。
    // 藍隊在左側紅方塔前作答，紅隊在右側藍方塔前作答。
    const redZones=gaMobaQuizZones("blue"),blueZones=gaMobaQuizZones("red");
    GARENA.structures=redZones.map((z,i)=>({id:"rQuiz"+z.answer,team:"red",type:"quizTower",answer:z.answer,name:"紅方 "+z.answer+" 答案塔",x:0,y:z.y,hp:1,max:1,range:2,hpPct:.08,cd:i%2,alive:true,invincible:true}))
      .concat(blueZones.map((z,i)=>({id:"bQuiz"+z.answer,team:"blue",type:"quizTower",answer:z.answer,name:"藍方 "+z.answer+" 答案塔",x:W-1,y:z.y,hp:1,max:1,range:2,hpPct:.08,cd:i%2,alive:true,invincible:true})));
    return;
  }
  const coreHits=12+Math.max(0,(GARENA.mobaSize||3)-3)*2;    // 城堡以受擊次數計耐久；大隊伍同步提高所需攻擊次數
  GARENA.structures=[
    {id:"rTop",team:"red",type:"tower",name:"紅方上路箭塔",x:4,y:topY,hp:125,max:125,range:3,hpPct:.15,cd:0,alive:true},
    {id:"rBot",team:"red",type:"tower",name:"紅方下路箭塔",x:4,y:botY,hp:125,max:125,range:3,hpPct:.15,cd:0,alive:true},
    {id:"rCore",team:"red",type:"core",name:"紅方核心城堡",x:1,y:mid,hp:coreHits,max:coreHits,range:3,hpPct:.20,cd:0,alive:true},
    {id:"rCrystal",team:"red",type:"crystal",name:"紅方無敵重生水晶",x:1,y:Math.max(1,mid-2),hp:1,max:1,invincible:true,range:0,homeCols:3,healPct:.30,cd:0,alive:true},
    {id:"bTop",team:"blue",type:"tower",name:"藍方上路箭塔",x:mirrorX(4),y:topY,hp:125,max:125,range:3,hpPct:.15,cd:0,alive:true},
    {id:"bBot",team:"blue",type:"tower",name:"藍方下路箭塔",x:mirrorX(4),y:botY,hp:125,max:125,range:3,hpPct:.15,cd:0,alive:true},
    {id:"bCore",team:"blue",type:"core",name:"藍方核心城堡",x:mirrorX(1),y:mid,hp:coreHits,max:coreHits,range:3,hpPct:.20,cd:0,alive:true},
    {id:"bCrystal",team:"blue",type:"crystal",name:"藍方無敵重生水晶",x:mirrorX(1),y:Math.max(1,mid-2),hp:1,max:1,invincible:true,range:0,homeCols:3,healPct:.30,cd:0,alive:true}
  ];
}

function gaMobaCore(team){ return (GARENA.structures||[]).find(q=>q.team===team&&q.type==="core"); }

function gaMobaTowersAlive(team){ return (GARENA.structures||[]).some(q=>q.team===team&&q.type==="tower"&&q.alive!==false); }

function gaMobaCrystal(team){ return (GARENA.structures||[]).find(q=>q.team===team&&q.type==="crystal"&&q.alive!==false); }

function gaMobaQuizZones(team){
  const top=GARENA.mobaTopY||2,bot=GARENA.mobaBotY||(GARENA.H-3),x=team==="red"?GARENA.W-2:1,ys=[Math.max(1,top-1),Math.min(GARENA.H-2,top+1),Math.max(1,bot-1),Math.min(GARENA.H-2,bot+1)];
  return ["A","B","C","D"].map((answer,i)=>({team,answer,x,y:ys[i]}));
}

function gaMobaQuizZoneAt(f){return gaMobaQuizZones(f.team).find(z=>z.x===f.x&&z.y===f.y)||null;}

function gaMobaKnowledgePointValue(streak){return streak>=5?3:(streak>=3?2:1);}

function gaMobaKnowledgeTick(fs){
  const q=GARENA.mobaQuiz;if(!gaIsKnowledgeMoba()||!q||!q.active)return;
  const tick=GARENA.ticks||0;
  if(q.finished){if(tick>=(q.nextAtTick||Infinity))gaMobaKnowledgeNext();return;}
  if(tick>=(q.roundEndsTick||Infinity)){
    GARENA.mobaKnowledgeStreak=GARENA.mobaKnowledgeStreak||{red:0,blue:0};
    ["red","blue"].forEach(team=>{if(!q.answeredTeams[team])GARENA.mobaKnowledgeStreak[team]=0;});
    q.finished=true;q.reveal=true;q.lastResult="本題時間到，正確答案是 "+q.correct;q.nextAtTick=tick+6;Object.values(GARENA.fighters).forEach(f=>{f.quizChargeT=0;f.quizChargeKey="";});garenaLog("⏰ "+q.lastResult+"；未完成隊伍的 Combo 中斷");garenaPushLive(true);return;
  }
  const need=6; // 每拍 0.5 秒，6 拍 = 3 秒集氣
  fs.forEach(f=>{
    if(f.ko||f.entering||(f.frozenT||0)>0||q.answeredTeams[f.team]){f.quizChargeT=0;f.quizChargeKey="";return;}
    const z=gaMobaQuizZoneAt(f),wrong=q.wrong[f.team]||[];
    if(!z||wrong.includes(z.answer)){f.quizChargeT=0;f.quizChargeKey="";return;}
    const key=f.team+":"+z.answer;if(f.quizChargeKey!==key){f.quizChargeKey=key;f.quizChargeT=0;}
    f.quizChargeT=(f.quizChargeT||0)+1;
    if(f.quizChargeT<need)return;
    f.quizChargeT=0;f.quizChargeKey="";
    const teamName=f.team==="red"?"紅隊":"藍隊",name=((stu(f.sid)||{}).name)||"英雄";
    if(z.answer===q.correct){
      q.answeredTeams[f.team]=true;
      GARENA.mobaKnowledgeStreak=GARENA.mobaKnowledgeStreak||{red:0,blue:0};GARENA.mobaKnowledgeBestStreak=GARENA.mobaKnowledgeBestStreak||{red:0,blue:0};
      const streak=++GARENA.mobaKnowledgeStreak[f.team],points=gaMobaKnowledgePointValue(streak);
      GARENA.mobaKnowledgeBestStreak[f.team]=Math.max(GARENA.mobaKnowledgeBestStreak[f.team]||0,streak);
      GARENA.mobaKnowledgeScore[f.team]=(GARENA.mobaKnowledgeScore[f.team]||0)+points;
      f.quizCorrect=(f.quizCorrect||0)+1;f.quizPoints=(f.quizPoints||0)+points;
      q.lastResult=teamName+"由 "+name+" 答對，Combo ×"+streak+" 得 "+points+" 分！";
      garenaLog("📚 "+q.lastResult);comicPop("COMBO ×"+streak+" +"+points+"！","boom",f.team==="red"?"#ff6666":"#62a5ff",'[data-gfighter="'+f.sid+'"]');skillFxPlay(streak>=5?"lightning":"holy",'[data-gfighter="'+f.sid+'"]');
    }
    else{
      if(!q.wrong[f.team].includes(z.answer))q.wrong[f.team].push(z.answer);
      GARENA.mobaKnowledgeStreak=GARENA.mobaKnowledgeStreak||{red:0,blue:0};GARENA.mobaKnowledgeStreak[f.team]=0;
      q.freezeUntil[f.team]=(GARENA.ticks||0)+10;Object.values(GARENA.fighters).filter(o=>o.team===f.team&&!o.ko).forEach(o=>{o.frozenT=Math.max(o.frozenT||0,10);o.quizChargeT=0;o.quizChargeKey="";});q.lastResult=teamName+"選 "+z.answer+" 答錯，全隊凍結 5 秒，Combo 中斷！";garenaLog("🧊 "+q.lastResult);comicPop("答錯！COMBO 歸零","boom","#79d7ff",'[data-gfighter="'+f.sid+'"]');
    }
    garenaRenderField();garenaPushLive(true);
  });
  if(q.answeredTeams.red&&q.answeredTeams.blue&&!q.finished){q.finished=true;q.reveal=true;q.nextAtTick=tick+6;q.lastResult=(q.lastResult?q.lastResult+"　":"")+"兩隊完成，3 秒後自動下一題";garenaLog("📚 兩隊皆完成本題，準備自動抽下一題");garenaPushLive(true);}
}

function gaMobaKnowledgeNext(){
  const bank=GARENA.mobaKnowledgeBank;if(!bank||!bank.row||!bank.row.qs||!bank.row.qs.length)return;
  if(!bank.order.length){bank.order=bank.row.qs.map((_,i)=>i);for(let i=bank.order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bank.order[i],bank.order[j]]=[bank.order[j],bank.order[i]];}if(bank.order.length>1&&bank.order[0]===bank.last)[bank.order[0],bank.order[1]]=[bank.order[1],bank.order[0]];}
  const index=bank.order.shift();bank.last=index;bank.round=(bank.round||0)+1;const p=bankQuestionPayload(bank.row,index);if(!p)return;
  GARENA.mobaQuiz={active:true,id:"MQ"+Date.now(),round:bank.round,prompt:p.prompt,originalPrompt:p.originalPrompt||p.prompt,visualSvg:quizGeometrySvgSafe(p.visualSvg),options:p.options,questionImage:p.questionImage||"",optionImages:(p.optionImages||[]).slice(0,4),correct:p.correct,wrong:{red:[],blue:[]},answeredTeams:{red:false,blue:false},freezeUntil:{red:0,blue:0},lastResult:"",bankRef:p.bankRef,roundEndsTick:(GARENA.ticks||0)+(bank.seconds||45)*2,finished:false,reveal:false};
  Object.values(GARENA.fighters||{}).forEach(f=>{f.quizChargeT=0;f.quizChargeKey="";});garenaLog("📚 第 "+bank.round+" 題："+p.prompt);garenaPushLive(true);
  // 每題可能有不同高度的題目圖片；換題時重算可用空間，讓戰場永遠使用剩餘畫面的最大比例。
  GARENA._els={};render();requestAnimationFrame(garenaRenderField);
}

function gaMobaKnowledgeStartBank(row,seconds){GARENA.mobaKnowledgeBank={row,seconds:Math.max(20,Math.min(90,Number(seconds)||45)),order:[],last:-1,round:0};gaMobaKnowledgeNext();GARENA._els={};render();requestAnimationFrame(garenaRenderField);toast("📚 題庫已鎖定；每題結束後會自動隨機下一題");}

function openMobaKnowledgePicker(){
  const bank=lessonQuestionBank();if(!bank.length){toast("尚無可用題庫，請先到教師題庫匯入",true);return;}
  const opts=bank.map((r,i)=>'<option value="'+i+'">'+esc((r.custom?"【自訂】":"")+(r.unit||r.chap||"")+"｜"+(r.topic||""))+'</option>').join("");
  modalHost.innerHTML='<div class="overlay"><div class="modal" style="max-width:680px"><h3>📚 知識攻塔・選擇本場題庫</h3><label>單元／主題<select id="mobaQuizUnit">'+opts+'</select></label><label style="margin-top:10px">每題時間<select id="mobaQuizSeconds"><option value="30">30 秒</option><option value="45" selected>45 秒</option><option value="60">60 秒</option><option value="90">90 秒</option></select></label><div id="mobaQuizPreview" class="lesson-bank-status" style="margin-top:10px"></div><div class="mini" style="margin-top:8px">只需選擇一次：系統會隨機抽未出過的題目；本主題全部用完後自動重新洗牌。</div><div class="inline-form" style="justify-content:center;margin-top:12px"><button class="btn gold" id="mobaQuizGo">鎖定題庫並開始</button><button class="btn" id="mobaQuizCancel">取消</button></div></div></div>';
  const unit=document.getElementById("mobaQuizUnit"),preview=document.getElementById("mobaQuizPreview"),refresh=()=>{const row=bank[Number(unit.value)||0];preview.textContent=(row.unit||row.chap||"")+"｜"+(row.topic||"")+"・共 "+((row.qs||[]).length)+" 題";};unit.onchange=refresh;refresh();
  document.getElementById("mobaQuizGo").onclick=()=>{const row=bank[Number(unit.value)||0],seconds=Number(document.getElementById("mobaQuizSeconds").value)||45;modalHost.innerHTML="";gaMobaKnowledgeStartBank(row,seconds);};document.getElementById("mobaQuizCancel").onclick=()=>modalHost.innerHTML="";
}

function gaMobaCrystalPulse(team,actor){
  if(!gaIsMoba()) return 0;
  const q=gaMobaCrystal(team); if(!q) return 0;
  let total=0;
  const cols=Math.max(1,q.homeCols||3), inHome=f=>team==="red"?f.x<cols:f.x>=GARENA.W-cols;
  Object.values(GARENA.fighters).filter(f=>!f.ko&&f.team===team&&inHome(f)&&f.hp<f.max).forEach(f=>{
    const heal=Math.min(f.max-f.hp,Math.max(3,Math.ceil(f.max*(q.healPct||.30))));
    if(heal<=0) return;
    f.hp+=heal; total+=heal; dmgPop(heal,'[data-gfighter="'+f.sid+'"]',"heal"); skillFxPlay("crystal_barrier",'[data-gfighter="'+f.sid+'"]');
  });
  if(total>0&&actor) actor.healDone=(actor.healDone||0)+total;
  return total;
}

function gaMobaObjectiveDir(f,obj,range){
  if(!f||!obj) return null;
  const dirs=[[1,0,"right"],[-1,0,"left"],[0,1,"down"],[0,-1,"up"]], q=[[f.x,f.y,null]], seen=new Set([f.x+","+f.y]);
  const occupied=(x,y)=>Object.values(GARENA.fighters).some(o=>!o.ko&&o.sid!==f.sid&&o.x===x&&o.y===y);
  for(let head=0;head<q.length&&head<GARENA.W*GARENA.H;head++){
    const cur=q[head];
    if(cur[2]&&garenaDist({x:cur[0],y:cur[1]},obj)<=range&&(range<=1||!gaLineBlocked({x:cur[0],y:cur[1]},obj))) return cur[2];
    for(const d of dirs){
      const nx=cur[0]+d[0],ny=cur[1]+d[1],key=nx+","+ny;
      if(nx<0||nx>=GARENA.W||ny<0||ny>=GARENA.H||seen.has(key)||gaIsBlocked(nx,ny)||occupied(nx,ny)) continue;
      seen.add(key);q.push([nx,ny,cur[2]||d[2]]);
    }
  }
  return null;
}

function gaMobaLaneWaypoint(f){
  const top=GARENA.mobaTopY||2,bot=GARENA.mobaBotY||(GARENA.H-3),laneY=Math.abs(f.y-top)<=Math.abs(f.y-bot)?top:bot;
  return {x:f.team==="red"?Math.min(GARENA.W-3,5):Math.max(2,GARENA.W-6),y:laneY};
}

function gaMobaSpawnSpots(team){
  const mid=Math.floor(GARENA.H/2),xs=team==="red"?[2,3,1,4]:[GARENA.W-3,GARENA.W-4,GARENA.W-2,GARENA.W-5],off=[0];
  for(let d=1;d<Math.ceil(GARENA.H/2);d++)off.push(-d,d);
  const spots=[];
  off.forEach(d=>xs.forEach(x=>{const y=mid+d;if(y>=1&&y<GARENA.H-1&&!gaIsBlocked(x,y)&&!gaStructureAt(x,y))spots.push([x,y]);}));
  return spots.slice(0,MOBA_TEAM_MAX);
}

function gaMobaOpenSpawn(team,excludeSid){
  // 固定自家基地門口走廊：紅方只由左門、藍方只由右門復活，不跨線、不跳角落。
  const spots=gaMobaSpawnSpots(team);
  for(const p of spots)if(!gaIsBlocked(p[0],p[1])&&!Object.values(GARENA.fighters).some(o=>!o.ko&&o.sid!==excludeSid&&o.x===p[0]&&o.y===p[1]))return p;
  return null; // 門口全滿就排隊多等一拍，絕不硬塞到其他位置
}

function gaMobaRespawnTick(fs){
  for(const f of fs){
    if(!f.ko) continue;
    if(!(f.respawnT>0)) f.respawnT=12;
    if(--f.respawnT>0) continue;
    const p=gaMobaOpenSpawn(f.team,f.sid);if(!p){f.respawnT=1;continue;}
    f.x=p[0];f.y=p[1];f.spawnX=f.team==="red"?-2:GARENA.W+1;f.spawnY=p[1];f.entering=true;f.enterDelay=0;
    f.hp=Math.max(1,Math.round(f.max*.7));f.ko=false;f.frozenT=0;f.chillT=0;f.silenceT=0;f.stealth=0;f.atb=50;
    garenaLog("✨ "+((stu(f.sid)||{}).name||"英雄")+" 已在基地復活！");
    skillFxPlay("revive",'[data-gfighter="'+f.sid+'"]');
    garenaRenderField();
    const tm=setTimeout(()=>{if(!GARENA.active||GARENA.over)return;f.entering=false;garenaRenderField();},520);
    GARENA._entranceTimers=GARENA._entranceTimers||[];GARENA._entranceTimers.push(tm);
  }
}

function gaMobaHurtHero(tgt,dmg,label,pureDamage){
  if(!tgt||tgt.ko) return;
  if(!pureDamage){ const cover=gaSquireIntercept(tgt,dmg); dmg=cover.dmg; }
  tgt.hp=Math.max(0,tgt.hp-dmg);tgt.tankDmg=(tgt.tankDmg||0)+dmg;
  dmgPop(dmg,'[data-gfighter="'+tgt.sid+'"]','dmg');gaHurt(tgt.sid,0);
  if(tgt.hp<=0&&!tgt.ko){tgt.ko=true;tgt.respawnT=12;garenaLog("💀 "+((stu(tgt.sid)||{}).name||"英雄")+" 被"+label+"擊倒，6 秒後復活！");}
}

function gaMobaStructureTick(){
  if(!gaIsMoba()) return;
  const fs=Object.values(GARENA.fighters);
  for(const q of (GARENA.structures||[])){
    if(q.alive===false) continue;
    if(q.type==="crystal") continue;                         // 重生水晶永久無敵，不攻擊也不會成為戰鬥目標
    if(q.cd>0){q.cd--;continue;}
    const tgt=fs.filter(f=>!f.ko&&f.team!==q.team&&garenaDist(q,f)<=q.range).sort((a,b)=>garenaDist(q,a)-garenaDist(q,b)||(a.hp/a.max)-(b.hp/b.max))[0];
    if(!tgt) continue;
    q.cd=q.type==="core"?5:(q.type==="quizTower"?6:4);
    const towerShot=q.type==="tower"||q.type==="quizTower", coreShot=q.type==="core";
    const dmg=Math.max(1,Math.ceil(tgt.max*(q.hpPct||(towerShot ? 0.15 : 0.20))));
    gaMobaHurtHero(tgt,dmg,q.type==="quizTower"?"答案塔":(towerShot?"防禦塔":"核心城堡"),towerShot||coreShot); // 答案塔 8%、箭塔 15%、城堡 20% 最大生命真實傷害
    skillFxPlay(q.type==="core"?"smite":"spark",'[data-gfighter="'+tgt.sid+'"]');
  }
}

function gaMobaAttackStructure(f,att,forcedSkillId){
  const range=weaponRange(att), targets=(GARENA.structures||[]).filter(q=>q.alive!==false&&q.type!=="crystal"&&q.type!=="quizTower"&&q.team!==f.team&&weaponTargetAllowed(att,f,q,range)).sort((a,b)=>garenaDist(f,a)-garenaDist(f,b));
  if(!targets.length) return false;
  const q=targets[0];
  if(q.type==="core"&&gaMobaTowersAlive(q.team)){garenaLog("🛡️ 敵方核心仍受外塔結界保護！");garenaFx(f.sid,"miss");return true;}
  const sk=forcedSkillId&&skillDef(att.job,forcedSkillId), mult=sk&&sk.kind==="atk"?Math.max(1,Math.min(3.2,+skillVal(att,forcedSkillId)||1.35)):1;
  const rawDmg=Math.max(3,Math.round((7+totalStats(att).atk*.32+totalStats(att).int*.18)*mult));
  const dmg=q.type==="core"?1:rawDmg;                       // 核心城堡只看成功攻擊次數，每次固定扣 1 點耐久
  q.hp=Math.max(0,q.hp-dmg);f.dmgDealt=(f.dmgDealt||0)+dmg;f.cd=gaAtkCd(att)*(forcedSkillId?1.12:1);
  gaSwing(f.sid); skillFxPlay(forcedSkillId||"bash",'[data-gfighter="'+f.sid+'"]');
  garenaLog((sk?sk.icon+" ":"⚔️ ")+att.name+" "+(q.type==="core"?"命中【"+q.name+"】，城堡耐久 -1（剩 "+q.hp+"/"+q.max+" 擊）":"對【"+q.name+"】造成 "+dmg+" 傷害！"));
  if(q.hp<=0){q.alive=false;garenaLog("💥 "+q.name+" 已被摧毀！");comicPop(q.type==="core"?"核心崩解！":"防禦塔摧毀！","boom",q.team==="red"?"#e05252":"#5285e0",null);if(q.type==="core")garenaEnd(f.team);}
  return true;
}

function garenaCastEquippedSkill(f,id){
  const s=stu(f.sid), sk=s&&skillDef(s.job,id); if(!s||!sk||!normalizeSkillLoadout(s).includes(id)||activeSkillLv(s,id)<=0) return false;
  if((f.silenceT||0)>0){garenaFx(f.sid,"miss");return false;}
  if(skillCooldownActive('ga',f.sid,id)) return false;
  startSkillCooldown('ga',s,id,skillCooldownSeconds(s,id));
  const enemies=Object.values(GARENA.fighters).filter(o=>o.team!==f.team&&!o.ko&&o.stealth<=0).sort((a,b)=>garenaDist(f,a)-garenaDist(f,b));
  if(ADVANCE_SUMMON_RULES[id]){gaSummonUnit(f,s,id);return true;}
  if((id==="hunter_trap"||id==="void_trap")&&enemies[0]){gaPlaceGroundTrap(f,s,enemies[0],id==="void_trap"?"void":"hunter");return true;}
  const fieldId={king_banner:"king_banner",polar_domain:"polar_domain",life_domain:"life_domain",heaven_guard:"sky_guard",elemental_doom:"elemental_ruin",thousand_arrows:"arrow_barrage",miracle_sanctum:"miracle_field"}[id];
  if(fieldId) gaPlaceLegendField(f,fieldId,8);
  const support=sk.kind==="aura"||sk.kind==="def"||sk.effect==="heal"||/heal|renew|bless|shield|guard|wall|cleanse|aegis|faith|vigor|rally|fortress|prayer|sanct|salvation|resurrection|revive/.test(id);
  if(support){
    const allies=Object.values(GARENA.fighters).filter(o=>o.team===f.team&&!o.ko&&garenaDist(f,o)<=3), amount=Math.max(5,Math.round(f.max*(.06+.018*activeSkillLv(s,id))));
    if(/heal|renew|faith|vigor|prayer|sanct|salvation|regeneration|life/.test(id)) allies.forEach(o=>{const h=Math.min(amount,o.max-o.hp);o.hp+=h;if(h)dmgPop(h,'[data-gfighter="'+o.sid+'"]','heal');});
    else allies.forEach(o=>{o.bDefT=Math.max(o.bDefT||0,6);if(sk.kind==="aura")o.bAtkT=Math.max(o.bAtkT||0,5);});
    skillFxPlay(id,'[data-gfighter="'+f.sid+'"]');comicPop(sk.icon+" "+sk.name,"cloud","#ffe486",'[data-gfighter="'+f.sid+'"]');garenaLog(sk.icon+" "+s.name+" 主動施放【"+sk.name+"】，支援附近隊友！");return true;
  }
  const acted=garenaAttack(f,false,id);
  if(!acted) clearSkillCooldown('ga',f.sid,id);              // 沒有目標時不消耗行動條，也不啟動技能冷卻
  return !!acted;
}

function garenaRestartTimer(){
  if(GARENA.timer){ clearInterval(GARENA.timer); GARENA.timer=null; }
  if(GARENA.active && !GARENA.over) GARENA.timer=setInterval(garenaTick,Math.max(140,Math.round(500/(GARENA.speed||1))));
}

function garenaSetSpeed(speed){
  GARENA.speed=[1,2,3].includes(+speed)?+speed:1;
  garenaRestartTimer();
  const btn=document.getElementById("gaSpeed"); if(btn) btn.textContent="⏩ "+GARENA.speed+"倍";
  const field=document.getElementById("gaField");
  if(field) field.classList.toggle("ga-lite",Object.keys(GARENA.fighters||{}).length>12||GARENA.speed>1);
  GARENA._lastPush=0; garenaPushLive(true);
}

function isBow(s){ const it = s.weaponId ? itemById(s.weaponId) : null; return !!(it && /弓|銃/.test(it.name||"")); }

function legendWeaponPattern(s){
  const it=s&&s.weaponId?itemById(s.weaponId):null;
  return it&&it.type==="weapon"&&it.rarity==="Legendary"&&it.price===0?(it.weaponPattern||""):"";
}

function rangeDmgMult(att, dist){
  if(isBow(att)) return dist<=1 ? 0.8 : (dist>=3 ? 1.0 : 0.92);          // 弓:貼臉-20%、拉開滿傷
  if(att.job==="Mage" || att.job==="Cleric") return dist<=1 ? 1.12 : 1.0; // 法牧:貼臉+12%
  return 1;
}

function weaponRange(s){
  const it = s.weaponId ? itemById(s.weaponId) : null;
  let r = 1;
  const pattern=legendWeaponPattern(s);
  if(pattern==="line2") r=2;
  else if(pattern==="sweep") r=1;
  else if(pattern==="longbow4") r=4;
  else if(it){
    const n = it.name || "";
    if(/弓|銃|槍砲|法杖|杖|書|魔導|水晶/.test(n)) r = 3;      // 遠程
    else if(/長槍|矛|戟|鞭/.test(n)) r = 2;                   // 長柄
  }
  // 🌪 風谷:強風讓遠程武器射程 -1(近戰不受影響)
  const M = (typeof GARENA!=="undefined" && GARENA.active) ? gaMap() : null;
  if(M && M.rangedPenalty && r > 1) r = Math.max(1, r - M.rangedPenalty);
  return r;
}

function garenaDist(a,b){ return Math.abs(a.x-b.x)+Math.abs(a.y-b.y); }

function weaponTargetAllowed(s,from,to,range){
  if(!from||!to) return false;
  const d=garenaDist(from,to),pattern=legendWeaponPattern(s),dx=Math.abs(to.x-from.x),dy=Math.abs(to.y-from.y);
  if(pattern==="line2") return d>0&&d<=2&&(dx===0||dy===0)&&!gaLineBlocked(from,to);
  if(pattern==="sweep") return d>0&&Math.max(dx,dy)<=1;
  if(pattern==="longbow4") return d>0&&d<=4&&!gaLineBlocked(from,to);
  return d<=range&&(range<=1||!gaLineBlocked(from,to));
}

function gaLineBlocked(a,b){
  const blocked=(x,y)=>!(x===b.x&&y===b.y)&&gaIsBlocked(x,y);
  const path=(xFirst)=>{let x=a.x,y=a.y,guard=0;while((x!==b.x||y!==b.y)&&guard++<50){if(xFirst&&x!==b.x)x+=Math.sign(b.x-x);else if(y!==b.y)y+=Math.sign(b.y-y);else x+=Math.sign(b.x-x);if(blocked(x,y))return true;}return false;};
  return path(true)&&path(false);
}

function gaAtkCd(att){ const x=Math.max(0,Math.min(190,totalStats(att).agi-10));return 3-x/190*1.5; }

function gaActionGain(s,f){
  const agi=Math.max(0,(totalStats(s).agi||0)-10);
  let gain=14+Math.min(26,agi/190*26);
  if((f.bAgiT||0)>0) gain*=1.22;
  if((f.chillT||0)>0) gain*=.64;
  if((f.stuckT||0)>0) gain*=.76;
  return Math.max(7,Math.round(gain));
}

function gaEmptyCell(cells){
  return cells.find(([x,y])=>x>=0&&x<GARENA.W&&y>=0&&y<GARENA.H&&!gaIsBlocked(x,y)
    && !Object.values(GARENA.fighters).some(o=>!o.ko&&o.x===x&&o.y===y));
}

function gaPlaceGroundTrap(f,att,tgt,kind){
  const dx=Math.sign(tgt.x-f.x), dy=Math.sign(tgt.y-f.y);
  const cell=gaEmptyCell([[tgt.x-dx,tgt.y-dy],[tgt.x+dx,tgt.y+dy],[tgt.x,tgt.y-1],[tgt.x,tgt.y+1]]);
  if(!cell) return false;
  const isVoid=kind==='void', skillId=isVoid?'void_trap':'hunter_trap', lv=activeSkillLv(att,skillId), traps=GARENA.traps||(GARENA.traps=[]);
  // 同一位遊俠最多保留兩個，第三個會淘汰最早的，避免鋪滿地圖。
  const mine=traps.filter(t=>t.owner===f.sid); if(mine.length>=2) traps.splice(traps.indexOf(mine[0]),1);
  traps.push({x:cell[0],y:cell[1],team:f.team,owner:f.sid,turns:isVoid?22:18,armT:1,dmg:(isVoid?7:4)+lv,stuck:(isVoid?3:2)+Math.floor(lv/2),kind:isVoid?'void':'hunter',icon:isVoid?'🕳':'🪤',silence:isVoid?2:0});
  skillFxPlay(skillId,'[data-gfighter="'+f.sid+'"]');
  garenaLog((isVoid?'🕳 ':'🪤 ')+att.name+' 在地面放置'+(isVoid?'虛空陷阱！':'獵人陷阱！'));
  return true;
}

function gaTriggerGroundTrap(f){
  const traps=GARENA.traps||[], ix=traps.findIndex(t=>t.team!==f.team&&t.armT<=0&&t.x===f.x&&t.y===f.y);
  if(ix<0) return false;
  const trap=traps.splice(ix,1)[0], nm=(stu(f.sid)||{}).name||'?';
  f.hp=Math.max(0,f.hp-trap.dmg); f.tankDmg=(f.tankDmg||0)+trap.dmg; f.stuckT=Math.max(f.stuckT||0,trap.stuck); if(trap.silence) f.silenceT=Math.max(f.silenceT||0,trap.silence);
  dmgPop(trap.dmg,'[data-gfighter="'+f.sid+'"]','dmg'); skillFxPlay(trap.kind==='void'?'void_trap':'hunter_trap','[data-gfighter="'+f.sid+'"]');
  comicPop(trap.kind==='void'?'虛空禁錮!':'陷阱觸發!','boom',trap.kind==='void'?'#8f7aff':'#82c55b','[data-gfighter="'+f.sid+'"]');
  garenaLog((trap.kind==='void'?'🕳 ':'🪤 ')+nm+' 踩中'+(trap.kind==='void'?'虛空陷阱':'地面陷阱')+'！受 '+trap.dmg+' 傷害並困住 '+trap.stuck+' 拍'+(trap.silence?'、沉默 '+trap.silence+' 拍':'')+'。');
  if(f.hp<=0&&!f.ko){ f.ko=true; if(!gaTryRevive(f)) garenaLog('💀 '+nm+' 被陷阱擊倒！'); }
  return true;
}

function gaSummonUnit(f,att,id){
  const rule=ADVANCE_SUMMON_RULES[id]; if(!rule) return false;
  const SUMMON={shield_squire:['🛡️','盾衛侍從'],flame_familiar:['🔥','焰靈使魔'],shadow_wolf:['🐺','影獵狼'],holy_sprite:['🕊️','聖光精靈']}[id];
  const cell=gaEmptyCell([[f.x+1,f.y],[f.x-1,f.y],[f.x,f.y+1],[f.x,f.y-1]])||[f.x,f.y];
  const units=GARENA.summons||(GARENA.summons=[]), lv=activeSkillLv(att,id), power=rule.val[Math.max(0,lv-1)]||4;
  for(let i=units.length-1;i>=0;i--) if(units[i].owner===f.sid&&units[i].id===id) units.splice(i,1);
  const unit={id,icon:SUMMON[0],name:SUMMON[1],owner:f.sid,team:f.team,x:cell[0],y:cell[1],turns:power+8,power,cd:0};
  // 盾衛有獨立的盾值：它不是額外加血，而是站在隊友身前實際吸收部分傷害。
  if(id==='shield_squire'){ unit.guardMax=22+power*3; unit.guardHp=unit.guardMax; unit.guardFxCd=0; }
  units.push(unit);
  skillFxPlay(id,'[data-gfighter="'+f.sid+'"]'); comicPop(SUMMON[0]+' '+SUMMON[1],'cloud','#fff0a8','[data-gfighter="'+f.sid+'"]');
  garenaLog(SUMMON[0]+' '+att.name+' 召喚【'+SUMMON[1]+'】支援 '+(power+8)+' 拍！'+(id==='shield_squire'?'（護盾 '+unit.guardHp+'，守護 2 格內隊友）':''));
  return true;
}

function gaPlaceLegendField(f,id,turns){
  const meta={
    king_banner:['🚩','王者軍旗'],polar_domain:['❄️','極寒領域'],life_domain:['💚','生命領域'],
    sky_guard:['☀️','天穹守護'],elemental_ruin:['🌋','元素末日'],arrow_barrage:['🏹','萬箭領域'],miracle_field:['🌟','奇蹟聖域']
  }[id];
  if(!meta) return false;
  const fields=GARENA.fields||(GARENA.fields=[]);
  for(let i=fields.length-1;i>=0;i--) if(fields[i].team===f.team&&fields[i].id===id) fields.splice(i,1);
  fields.push({id,owner:f.sid,team:f.team,x:f.x,y:f.y,turns:Math.max(5,turns||6),pulse:0,icon:meta[0],name:meta[1]});
  skillFxPlay(id,'[data-gfighter="'+f.sid+'"]');
  return true;
}

function gaTickFields(){
  const fields=GARENA.fields||[];
  for(let i=fields.length-1;i>=0;i--){
    const q=fields[i]; if(--q.turns<0){fields.splice(i,1);continue;}
    if(++q.pulse%2) continue;                               // 每秒才結算一次，避免多人戰場過度運算
    const all=Object.values(GARENA.fighters), allies=all.filter(o=>o.team===q.team&&!o.ko&&garenaDist(q,o)<=2), enemies=all.filter(o=>o.team!==q.team&&!o.ko&&garenaDist(q,o)<=2);
    if(q.id==='king_banner') allies.forEach(o=>{o.bAtkT=Math.max(o.bAtkT||0,3);o.bDefT=Math.max(o.bDefT||0,3);});
    else if(q.id==='polar_domain') enemies.forEach(o=>o.chillT=Math.max(o.chillT||0,3));
    else if(q.id==='life_domain') allies.forEach(o=>{const h=Math.min(3,o.max-o.hp);if(h){o.hp+=h;dmgPop(h,'[data-gfighter="'+o.sid+'"]','heal');}});
    else if(q.id==='sky_guard') allies.forEach(o=>{o.bDefT=Math.max(o.bDefT||0,4);o.chillT=0;o.frozenT=0;o.silenceT=0;});
    else if(q.id==='elemental_ruin') enemies.forEach(o=>{const d=Math.min(o.hp,4);o.hp-=d;o.poisonT=Math.max(o.poisonT||0,3);o.poisonDmg=Math.max(o.poisonDmg||0,2);if(d){dmgPop(d,'[data-gfighter="'+o.sid+'"]','dmg');skillFxPlay('elemental_ruin','[data-gfighter="'+o.sid+'"]');}});
    else if(q.id==='arrow_barrage') enemies.forEach(o=>{o.hunterMarkT=Math.max(o.hunterMarkT||0,4);o.stuckT=Math.max(o.stuckT||0,1);});
    else if(q.id==='miracle_field') allies.forEach(o=>{const h=Math.min(5,o.max-o.hp);o.bDefT=Math.max(o.bDefT||0,4);if(h){o.hp+=h;dmgPop(h,'[data-gfighter="'+o.sid+'"]','heal');}});
  }
}

function gaSquireIntercept(tgt,dmg){
  if(dmg<=0) return {dmg,blocked:0};
  const squire=(GARENA.summons||[]).filter(u=>u.id==='shield_squire'&&u.team===tgt.team&&(u.guardHp||0)>0&&garenaDist(u,tgt)<=2)
    .sort((a,b)=>garenaDist(a,tgt)-garenaDist(b,tgt)||b.guardHp-a.guardHp)[0];
  if(!squire) return {dmg,blocked:0};
  const rate=Math.min(.55,.32+(squire.power||5)*.025);       // Lv.1 約 45%，Lv.5 約 55%
  const blocked=Math.min(squire.guardHp,Math.max(1,Math.ceil(dmg*rate)));
  squire.guardHp-=blocked;
  if((squire.guardFxCd||0)<=0){
    comicPop('🛡 盾衛格擋 '+blocked,'cloud','#8ce4ff','[data-gfighter="'+tgt.sid+'"]');
    skillFxPlay('shield','[data-gfighter="'+tgt.sid+'"]');
    squire.guardFxCd=2;
  }
  if(squire.guardHp<=0){
    squire.guardHp=0; squire.turns=0;
    comicPop('🛡 盾衛破盾!','boom','#d9efff','[data-gfighter="'+tgt.sid+'"]');
    garenaLog('🛡️ 盾衛侍從為 '+((stu(tgt.sid)||{}).name||'隊友')+' 擋下 '+blocked+' 傷害後破盾消散！');
  }
  return {dmg:Math.max(1,dmg-blocked),blocked};
}

function gaTickSummons(){
  const units=GARENA.summons||[];
  for(let i=units.length-1;i>=0;i--){
    const u=units[i], owner=GARENA.fighters[u.owner], att=owner&&stu(u.owner);
    if(!owner||owner.ko||!att||--u.turns<0){ units.splice(i,1); continue; }
    if(u.cd>0){u.cd--;continue;}
    if(u.guardFxCd>0) u.guardFxCd--;
    const allies=Object.values(GARENA.fighters).filter(o=>o.team===u.team&&!o.ko), enemies=Object.values(GARENA.fighters).filter(o=>o.team!==u.team&&!o.ko&&o.stealth<=0);
    if(u.id==='shield_squire'){
      const a=allies.filter(o=>garenaDist(u,o)<=2).sort((a,b)=>(a.hp/a.max)-(b.hp/b.max))[0];
      if(a){a.bDefT=Math.max(a.bDefT||0,3);skillFxPlay('shield','[data-gfighter="'+a.sid+'"]');} u.cd=3;
    }else if(u.id==='flame_familiar'){
      const e=enemies.filter(o=>garenaDist(u,o)<=3).sort((a,b)=>garenaDist(u,a)-garenaDist(u,b))[0];
      if(e){const d=2+u.power;e.hp=Math.max(0,e.hp-d);e.tankDmg=(e.tankDmg||0)+d;owner.dmgDealt=(owner.dmgDealt||0)+d;dmgPop(d,'[data-gfighter="'+e.sid+'"]','dmg');skillFxPlay('firebolt','[data-gfighter="'+e.sid+'"]');if(e.hp<=0&&!e.ko){e.ko=true;if(!gaTryRevive(e))owner.kills=(owner.kills||0)+1;}} u.cd=3;
    }else if(u.id==='shadow_wolf'){
      const e=enemies.filter(o=>garenaDist(u,o)<=2).sort((a,b)=>garenaDist(u,a)-garenaDist(u,b))[0];
      if(e){e.hunterMarkT=Math.max(e.hunterMarkT||0,4);e.stuckT=Math.max(e.stuckT||0,1);skillFxPlay('expose','[data-gfighter="'+e.sid+'"]');} u.cd=3;
    }else if(u.id==='holy_sprite'){
      const a=allies.filter(o=>garenaDist(u,o)<=3&&o.hp<o.max).sort((a,b)=>(a.hp/a.max)-(b.hp/b.max))[0];
      if(a){const h=Math.min(2+u.power,a.max-a.hp);a.hp+=h;owner.healDone=(owner.healDone||0)+h;dmgPop(h,'[data-gfighter="'+a.sid+'"]','heal');skillFxPlay('heal','[data-gfighter="'+a.sid+'"]');} u.cd=3;
    }
  }
}

function garenaStart(redIds, blueIds, aiMode, mode){
  resetSkillCooldowns('ga');
  GARENA.fighters = {}; GARENA.cmdQueue = {}; GARENA._lastTs = {}; GARENA.heldMoves={}; GARENA.heldMoveUntil={}; GARENA._els = {}; GARENA._fxTick = 0;
  GARENA.traps = []; GARENA.summons = []; GARENA.fields = []; // 地面陷阱、召喚物與三轉領域只存在當前戰場
  GARENA.mobaQuiz=null;GARENA.mobaKnowledgeScore={red:0,blue:0};GARENA.mobaKnowledgeStreak={red:0,blue:0};GARENA.mobaKnowledgeBestStreak={red:0,blue:0};
  GARENA.mode = mode==="mobaKnowledge" ? "mobaKnowledge" : (mode==="moba" ? "moba" : "battle");
  GARENA.structures = [];
  if(GARENA.mode==="moba"||GARENA.mode==="mobaKnowledge") GARENA.mapKey="moba";
  else if((BATTLE_MAPS[GARENA.mapKey]||{}).mode==="moba") GARENA.mapKey="plain";
  (GARENA._entranceTimers||[]).forEach(clearTimeout); GARENA._entranceTimers=[];
  GARENA.warnCells = null;                                   // 🧹 清除上一場殘留的落石預警
  GARENA.aiMode = !!aiMode;
  if(GARENA.siege !== true) GARENA.siege = false;            // 由公會戰入口設true;其餘場次重置                                  // 🤖 AI演練:所有角色自動作戰(單機可測)
  // 場地依人數動態調整:確保每隊塞得下(留移動空間),上限保護
  const perTeam = Math.max(redIds.length, blueIds.length);
  if(GARENA.mode==="moba"||GARENA.mode==="mobaKnowledge"){
    gaMobaConfigureMap(perTeam);gaMobaInitStructures();
  }else{
    GARENA.H = Math.min(12, Math.max(8, Math.ceil(perTeam / 2) + 1));   // 每欄最多放滿高度的人,兩欄起跳
    GARENA.W = Math.min(20, Math.max(14, 10 + Math.ceil(perTeam/GARENA.H)*2));
  }
  const place = (ids, team)=>{
    const H = GARENA.H;
    const mobaSpots=(GARENA.mode==="moba"||GARENA.mode==="mobaKnowledge")?gaMobaSpawnSpots(team):null;
    // 職業對稱站位:戰士第1排(最前)、遊俠第2、法師第3、牧師第4(最後)
    const TIER = { Warrior:0, Rogue:1, Mage:2, Cleric:3 };
    const byTier = [[],[],[],[]];
    ids.forEach(sid=>{ const st=stu(sid); if(st) byTier[TIER[st.job]!==undefined?TIER[st.job]:0].push(sid); });
    let enterIndex=0;
    byTier.forEach((list, t)=>{
      // 紅隊前排在右側(x大)、藍隊前排在左側(x小),兩軍面對面鏡像
      const x = team==="red" ? Math.max(1, 4 - t) : Math.min(GARENA.W-2, GARENA.W - 5 + t);
      list.forEach((sid,i)=>{
        const st = stu(sid); if(!st) return;
        const max = st.maxHp + skillMaxHpBonus(st);
        const mobaSpot=mobaSpots&&mobaSpots.length?mobaSpots[enterIndex%mobaSpots.length]:null;
        const y = mobaSpot ? mobaSpot[1] : Math.min(H-1, Math.floor((i + 0.5) * H / list.length));
        // 從左右城門入場：人多時每位間隔進來，不會再從左上角重疊跳出。
        const spawnY=mobaSpot?mobaSpot[1]:Math.min(H-1, Math.max(0, Math.floor((enterIndex+.5)*H/Math.max(1,ids.length))));
        const queueDelay=ids.length>8 ? enterIndex*95 : enterIndex*55;
        enterIndex++;
        const startX=mobaSpot?mobaSpot[0]:x;
        GARENA.fighters[sid] = { sid, team, x:startX, y, face:(team==="red"?"right":"left"),
          spawnX:team==="red"?-2:GARENA.W+1, spawnY, entering:true, enterDelay:queueDelay,
          hp:max, max, ko:false, ultUsed:false, cd:0, atb:0, // 隱藏行動條：100 才取得一次行動
          dmgDealt:0, kills:0, ultCount:0, healDone:0, tankDmg:0,   // 合作貢獻統計(輸出／治療／守護)
          stealth:0, tauntBy:null, tauntT:0, jobReadyAt:0, jobCdTotal:1, advUltReadyAt:0, advUltCdTotal:1 }; // 職業技／終極技改採實際秒數冷卻
      });
    });
  };
  place(redIds,"red"); place(blueIds,"blue");
  // 佈陣後保險:掃描並排開任何重疊或障礙物(同格往下或往內找空位)
  const occupied = {};
  for(const f of Object.values(GARENA.fighters)){
    let tries = 0;
    while((occupied[f.x+","+f.y] || gaIsBlocked(f.x,f.y)) && tries < GARENA.W*GARENA.H){
      f.y++;
      if(f.y >= GARENA.H){ f.y = 0; f.x += (f.team==="red" ? 1 : -1); }
      if(f.x < 0) f.x = 0; if(f.x >= GARENA.W) f.x = GARENA.W-1;
      tries++;
    }
    occupied[f.x+","+f.y] = f.sid;
  }
  GARENA.active = true; GARENA.over = false; GARENA.paused = false; GARENA.startTs = Date.now(); GARENA.ticks = 0; GARENA.elapsed=0; GARENA.speed=1;
  GARENA.DURATION = 180;                                    // Dota 最長 3 分鐘，避免一場攻城拖太久
  // 📼 錄影:名冊+初始幀;之後每 10 拍一幀 + 全部戰鬥訊息(精華式,每場約 10-20KB)
  GARENA.rec = { date: new Date().toLocaleString("sv").slice(0,16), W: GARENA.W, H: GARENA.H,
    mode: GARENA.mode==="mobaKnowledge" ? "mobaKnowledge" : (GARENA.mode==="moba" ? "moba" : (GARENA.peak ? "peak" : (GARENA.siege ? "siege" : "battle"))),
    roster: {}, frames: [], logs: [] };
  Object.values(GARENA.fighters).forEach(x=>{ const st0=stu(x.sid); GARENA.rec.roster[x.sid] = { n:(st0||{}).name||"?", j:(st0||{}).job||"", team:x.team }; });
  gaRecFrame();
  // ⚖️ 少方鬥志:兩隊人數不同時,人少方每差 1 人全體 +8% 傷害與最大HP(上限 +32%),補平結構性劣勢
  (function(){
    const nR = redIds.length, nB = blueIds.length;
    if(nR === nB) return;
    const lessTeam = nR < nB ? "red" : "blue";
    const diff = Math.min(4, Math.abs(nR - nB));
    const boost = 1 + diff * 0.08;
    Object.values(GARENA.fighters).forEach(f=>{
      if(f.team === lessTeam){
        f.underdogM = boost;
        f.max = Math.round(f.max * boost);
        f.hp = f.max;
      }
    });
    setTimeout(()=> garenaLog("⚖️ "+(lessTeam==="red"?"紅":"藍")+"隊人數少 "+Math.abs(nR-nB)+" 人 → 全體鬥志 +"+Math.round((boost-1)*100)+"%(傷害與血量)"), 100);
  })();
  // 監聽學生指令
  if(GARENA._cmdUnsub) GARENA._cmdUnsub();
  GARENA._cmdUnsub = CLOUD.garenaListenCmds(cmd=>{
    if(!cmd || !cmd.sid) return;
    const order=Number(cmd.seq||cmd.ts)||0;
    if(order<=Number(GARENA._lastTs[cmd.sid]||0)) return;    // 重送或延遲抵達的舊指令略過
    GARENA._lastTs[cmd.sid] = order;
    if(cmd.moveState==="stop"){
      delete GARENA.heldMoves[cmd.sid];
      delete GARENA.heldMoveUntil[cmd.sid];
      if(GARENA.cmdQueue[cmd.sid]&&GARENA.cmdQueue[cmd.sid].heldMove)delete GARENA.cmdQueue[cmd.sid];
      return;
    }
    if(cmd.moveState==="start"&&["up","down","left","right"].includes(cmd.move)){
      GARENA.heldMoves[cmd.sid]=cmd.move;
      GARENA.heldMoveUntil[cmd.sid]=Date.now()+3500;          // 心跳中斷 3.5 秒後自動放開，避免斷線角色持續走
      GARENA.cmdQueue[cmd.sid]=Object.assign({},cmd,{heldMove:true});
      return;
    }
    GARENA.cmdQueue[cmd.sid] = cmd;
  });
  garenaRestartTimer();
  garenaPushLive();
  render();
  // DOM 畫好後才依序開門入場；每次只更新要進場的角色，避免多人戰鬥時卡頓。
  Object.values(GARENA.fighters).forEach(f=>{
    const tm=setTimeout(()=>{ if(!GARENA.active || GARENA.over) return; f.entering=false; garenaRenderField(); }, 90+(f.enterDelay||0));
    GARENA._entranceTimers.push(tm);
  });
  garenaLog("⚔️ 團體戰開始!紅隊 "+redIds.length+" 人 vs 藍隊 "+blueIds.length+" 人");
  if(gaIsMoba()) garenaLog(gaIsKnowledgeMoba()?"📚 知識攻塔：核心與重生溫泉已移除；突破敵陣，在答案塔前領域站滿 3 秒作答。":"🏰 榮耀峽谷：箭塔射程 3 格造成 15%、核心城堡射程 3 格造成 20% 最大生命真實傷害；城堡耐久依受擊次數扣除；無敵水晶回復自家三列友軍 30% 生命。");
  { const M = gaMap();
    if(M.key !== "plain"){ garenaLog(M.icon+" 戰場:"+M.name+"——"+M.desc); comicPop(M.icon+" "+M.name,"boom","#f0b429",null); } }
}

function garenaLog(msg){
  const el = document.getElementById("gaLog");
  if(el){ el.innerHTML = '<div>'+esc(msg)+'</div>'+el.innerHTML; while(el.children.length>3) el.removeChild(el.lastChild); }
  if(GARENA.rec && GARENA.rec.logs.length < 400) GARENA.rec.logs.push({ t: GARENA.ticks||0, m: String(msg).slice(0,80) });   // 📼
}

function openReplay(idx){
  const r = (state.battleReplays||[])[idx];
  if(!r || !r.frames || !r.frames.length){ toast("回放資料不完整", true); return; }
  const W = r.W||16, H = r.H||6, cell = Math.min(34, Math.floor(520/W));
  let cur = 0, playing = null;
  const dotHtml = ()=>{
    const fr = r.frames[cur];
    return fr.f.map(d=>{
      const info = r.roster[d[0]]||{n:"?",team:"red"};
      const col = info.team==="red" ? "#e23b3b" : "#3a6fe0";
      const hpr = Math.max(0, d[3]/(d[4]||1));
      return '<div style="position:absolute;left:'+(d[1]*cell)+'px;top:'+(d[2]*cell)+'px;width:'+(cell-4)+'px;text-align:center;'+(d[5]?'opacity:.3;filter:grayscale(1);':'')+'">'
        + '<div style="height:3px;background:#ccc;border-radius:2px;overflow:hidden"><div style="height:100%;width:'+Math.round(hpr*100)+'%;background:'+(hpr>.5?'#3fae76':hpr>.25?'#f5a623':'#e23b3b')+'"></div></div>'
        + '<div style="width:'+(cell-8)+'px;height:'+(cell-8)+'px;margin:1px auto;border-radius:50%;background:'+col+';border:2px solid #141414;'+(d[5]?'':'box-shadow:0 0 4px '+col+';')+'"></div>'
        + '<div style="font-size:8px;font-weight:900;white-space:nowrap;overflow:hidden">'+esc(info.n.slice(0,4))+'</div></div>';
    }).join("");
  };
  const logHtml = ()=>{
    const t = r.frames[cur].t;
    return (r.logs||[]).filter(l=>l.t<=t).slice(-7).map(l=>'<div>'+esc(l.m)+'</div>').join("") || '<div class="mini">(開場)</div>';
  };
  const paint = ()=>{
    const bd = document.getElementById("rpBoard"); if(bd) bd.innerHTML = dotHtml();
    const lg = document.getElementById("rpLog"); if(lg){ lg.innerHTML = logHtml(); lg.scrollTop = lg.scrollHeight; }
    const sl = document.getElementById("rpSlide"); if(sl) sl.value = cur;
    const tm = document.getElementById("rpTime"); if(tm) tm.textContent = Math.round(r.frames[cur].t/2)+"s / "+Math.round(r.frames[r.frames.length-1].t/2)+"s";
  };
  const stop = ()=>{ if(playing){ clearInterval(playing); playing=null; const pb=document.getElementById("rpPlay"); if(pb) pb.textContent="▶ 播放"; } };
  modalHost.innerHTML = '<div class="overlay" id="ovlRp"><div class="modal" style="max-width:'+(W*cell+60)+'px">'
    + '<h3 style="margin-top:0">📼 戰鬥回放 <span class="mini">'+esc(r.date)+'</span></h3>'
    + '<div id="rpBoard" style="position:relative;width:'+(W*cell)+'px;height:'+(H*cell+14)+'px;background:#f0e2c0;border:3px solid #141414;border-radius:8px;margin:0 auto"></div>'
    + '<div class="inline-form" style="margin-top:8px;align-items:center">'
    + '<button class="btn gold" id="rpPlay">▶ 播放</button>'
    + '<input type="range" id="rpSlide" min="0" max="'+(r.frames.length-1)+'" value="0" style="flex:1">'
    + '<span class="mini num" id="rpTime"></span>'
    + '<button class="btn" id="rpClose">關閉</button></div>'
    + '<div id="rpLog" style="max-height:110px;overflow-y:auto;font-size:12px;background:#fff;border:2px solid #141414;border-radius:8px;padding:6px 10px;margin-top:8px"></div>'
    + '</div></div>';
  document.getElementById("rpClose").onclick = ()=>{ stop(); modalHost.innerHTML=""; };
  document.getElementById("ovlRp").onclick = (e)=>{ if(e.target.id==="ovlRp"){ stop(); modalHost.innerHTML=""; } };
  document.getElementById("rpSlide").oninput = (e)=>{ stop(); cur = +e.target.value; paint(); };
  document.getElementById("rpPlay").onclick = ()=>{
    if(playing){ stop(); return; }
    document.getElementById("rpPlay").textContent = "⏸ 暫停";
    playing = setInterval(()=>{ if(cur < r.frames.length-1){ cur++; paint(); } else stop(); }, 700);
  };
  paint();
}

function gaRecFrame(){                                        // 📼 錄一幀:全員位置/血量(壓縮陣列)
  if(!GARENA.rec) return;
  GARENA.rec.frames.push({ t: GARENA.ticks||0,
    f: Object.values(GARENA.fighters).map(x=>[x.sid, x.x, x.y, x.hp, x.max, x.ko?1:0]) });
}

function garenaStop(){
  GARENA.warnCells = null;                                   // 🧹 清除落石預警
  (GARENA._entranceTimers||[]).forEach(clearTimeout); GARENA._entranceTimers=[];
  if(GARENA.timer){ clearInterval(GARENA.timer); GARENA.timer=null; }
  if(GARENA._cmdUnsub){ GARENA._cmdUnsub(); GARENA._cmdUnsub=null; }
  GARENA.heldMoves={};GARENA.heldMoveUntil={};GARENA.cmdQueue={};
  GARENA.active=false;
  if(GARENA.mode==="moba"||GARENA.mode==="mobaKnowledge"){GARENA.mode="battle";GARENA.mapKey="plain";GARENA.structures=[];GARENA.mobaQuiz=null;GARENA.mobaKnowledgeBank=null;}
  CLOUD.garenaClear && CLOUD.garenaClear();
}

function garenaAiStep(fs){
  const allFs=Object.values(GARENA.fighters).filter(f=>!f.entering);
  for(const f of fs){
    // 模擬手機持續送出心跳時，該角色交由教師手動操作；視窗關閉約 1.6 秒後自動交回 AI。
    const simControlled=GARENA._simControlUntil&&GARENA._simControlUntil[f.sid]>Date.now();
    if(f.ko || GARENA.cmdQueue[f.sid] || (simControlled&&!f.autoPilot)) continue;
    const st = stu(f.sid); if(!st) continue;
    const range = weaponRange(st);
    const en = allFs.filter(o=>o.team!==f.team && !o.ko && (o.stealth||0)<=0);
    // 知識攻城 AI 示範：每隊只派一名答題手前往正確領域，其餘成員維持護送與戰鬥。
    const kq=GARENA.mobaQuiz;if(gaIsKnowledgeMoba()&&kq&&kq.active&&!kq.finished&&!kq.answeredTeams[f.team]&&(f.frozenT||0)<=0){const runner=allFs.filter(o=>o.team===f.team&&!o.ko).sort((a,b)=>String(a.sid).localeCompare(String(b.sid)))[0];if(runner&&runner.sid===f.sid){const goal=gaMobaQuizZones(f.team).find(z=>z.answer===kq.correct);if(goal&&f.x===goal.x&&f.y===goal.y)continue;const dir=goal&&gaMobaObjectiveDir(f,goal,0);if(dir){GARENA.cmdQueue[f.sid]={sid:f.sid,move:dir};continue;}}}
    // 知識攻塔的護送者也必須先離開出生區再交戰，避免遠程角色出生後看似站樁攻擊。
    if(gaIsKnowledgeMoba()&&((f.team==="red"&&f.x<4)||(f.team==="blue"&&f.x>GARENA.W-5))){const dir=gaMobaObjectiveDir(f,gaMobaLaneWaypoint(f),0);if(dir){GARENA.cmdQueue[f.sid]={sid:f.sid,move:dir};continue;}}
    /* 牧師先照顧隊伍再追敵：主動靠近血量最低的隊友，進入兩格後立刻使用已裝備的群療。
       這讓後排牧師不會獨自追塔或追敵，也讓近距離治療／光環真正覆蓋隊友。 */
    if(st.job==="Cleric"){
      const supportIds=["heal","groupheal","vigor","faith","renewal","healing_wave","miracle_sanctum","eternal_prayer"];
      const canSupport=supportIds.some(id=>activeSkillLv(st,id)>0);
      const hurtMate=allFs.filter(o=>o.team===f.team&&!o.ko&&o.sid!==f.sid&&o.hp<o.max*.85)
        .sort((a,b)=>(a.hp/a.max)-(b.hp/b.max)||garenaDist(f,a)-garenaDist(f,b))[0];
      if(canSupport&&hurtMate){
        const sd=garenaDist(f,hurtMate),danger=en.some(o=>garenaDist(f,o)<=1);
        if(jobSkillAvailable(st)&&fighterCooldownLeft(f,'job')<=0&&sd<=2){GARENA.cmdQueue[f.sid]={sid:f.sid,act:"jobskill"};continue;}
        if(sd>1&&!danger){
          let dir=gaIsMoba()?gaMobaObjectiveDir(f,hurtMate,1):null;
          if(!dir){
            if(Math.abs(hurtMate.x-f.x)>=Math.abs(hurtMate.y-f.y))dir=hurtMate.x>f.x?"right":"left";
            else dir=hurtMate.y>f.y?"down":"up";
          }
          if(dir){GARENA.cmdQueue[f.sid]={sid:f.sid,move:dir};continue;}
        }
      }
    }
    // MOBA AI：先拆最近外塔；兩塔全毀後立即切換核心推進，只處理貼身敵人，避免追人拖長戰局。
    const enemyStructures=gaIsMoba()?(GARENA.structures||[]).filter(q=>q.team!==f.team&&q.alive!==false):[];
    const enemyTowers=enemyStructures.filter(q=>q.type==="tower").sort((a,b)=>garenaDist(f,a)-garenaDist(f,b));
    const enemyCore=enemyStructures.find(q=>q.type==="core")||null;
    const corePush=gaIsMoba()&&!enemyTowers.length&&!!enemyCore;
    const heroThreats = gaIsMoba() ? en.filter(o=>garenaDist(f,o)<=(corePush?2:5)) : en;
    const objective=gaIsMoba()?(enemyTowers[0]||enemyCore):null;
    if(!heroThreats.length&&objective&&weaponTargetAllowed(st,f,objective,range)&&f.cd<=0){GARENA.cmdQueue[f.sid]={sid:f.sid,act:"attack"};continue;}
    if(!heroThreats.length&&objective){
      const dir=gaMobaObjectiveDir(f,objective,range);
      if(dir) GARENA.cmdQueue[f.sid]={sid:f.sid,move:dir};
      continue;
    }
    if(!en.length) continue;
    // 職業目標策略:戰士追遊俠(近身嘲諷)、遊俠追牧師(背襲)、法師挑敵人聚集處(偏好戰士)、牧師攻法師
    const PREF_JOB = { Warrior:"Rogue", Rogue:"Cleric", Mage:"Warrior", Cleric:"Mage" };
    const pj = PREF_JOB[st.job];
    let pool = heroThreats.length ? heroThreats : en;
    if(pj){ const pref = en.filter(o=>{ const q=stu(o.sid); return q && q.job===pj; }); if(pref.length) pool = pref; }
    if(st.job==="Mage"){
      // 法師:優先挑「周圍敵人最多」的聚集點施法,同聚集度時偏好戰士、再看距離
      pool = pool.slice().sort((a,b)=>{
        const ca = en.filter(o=>garenaDist(a,o)<=1).length, cb = en.filter(o=>garenaDist(b,o)<=1).length;
        if(cb!==ca) return cb-ca;
        return garenaDist(f,a)-garenaDist(f,b);
      });
    }else{
      pool = pool.slice().sort((a,b)=>garenaDist(f,a)-garenaDist(f,b));
    }
    let tgt = pool[0];
    // 被嘲諷:移動也朝嘲諷者(強拉效果)
    if(f.tauntBy){ const tr = GARENA.fighters[f.tauntBy]; if(tr && !tr.ko) tgt = tr; }
    const d = garenaDist(f,tgt);
    // 舊大招停用；高階效果已整合至二、三轉技能。
    if(ultReady(st) && f.hp < f.max*0.4 && !f.ultUsed && d<=Math.max(2,range)){
      GARENA.cmdQueue[f.sid] = {sid:f.sid, act:"ult"}; continue;
    }
    // 🩹 殘血保命:血<25%、非戰士、保命職業技也在冷卻 → 撤退(有牧師朝牧師靠攏吃群補,否則遠離最近敵人)
    if(f.hp < f.max*0.25 && st.job!=="Warrior" && fighterCooldownLeft(f,'job')>0 && !f.tauntBy){
      const healer = allFs.filter(o=>o.team===f.team && !o.ko && o.sid!==f.sid && (stu(o.sid)||{}).job==="Cleric")
                       .sort((a,b)=>garenaDist(f,a)-garenaDist(f,b))[0];
      const nearest = en.slice().sort((a,b)=>garenaDist(f,a)-garenaDist(f,b))[0];
      let dir = null;
      if(healer && st.job!=="Cleric" && garenaDist(f,healer)>1){          // 朝牧師靠攏
        if(Math.abs(healer.x-f.x) >= Math.abs(healer.y-f.y)) dir = healer.x>f.x ? "right" : "left";
        else dir = healer.y>f.y ? "down" : "up";
      }else if(nearest && garenaDist(f,nearest)<=range+1){                 // 遠離最近敵人
        if(Math.abs(nearest.x-f.x) >= Math.abs(nearest.y-f.y)) dir = nearest.x>f.x ? "left" : "right";
        else dir = nearest.y>f.y ? "up" : "down";
      }
      if(dir){ GARENA.cmdQueue[f.sid] = {sid:f.sid, move:dir}; continue; }
    }
    // 職業技:冷卻好+時機(法師2敵內/牧師有傷隊友/戰士敵貼身/遊俠血低遁)
    if(fighterCooldownLeft(f,'job')<=0 && jobSkillAvailable(st)){
      const job = st.job;
      const near2 = en.filter(o=>garenaDist(f,o)<=2).length;
      const hurtAlly = allFs.some(o=>o.team===f.team && !o.ko && garenaDist(f,o)<=2 && o.hp < o.max*0.7);
      if((job==="Mage" && en.filter(o=>garenaDist(f,o)<=range).length>=2)
       ||(job==="Cleric" && hurtAlly)
       ||(job==="Warrior" && near2>=1 && f.hp>f.max*0.3)
       ||(job==="Rogue" && (f.hp<f.max*0.5 || (f.stealth<=0 && (stu(tgt.sid)||{}).job==="Cleric" && d>range+1)))){
        GARENA.cmdQueue[f.sid] = {sid:f.sid, act:"jobskill"}; continue;
      }
    }
    const canWeaponHit=weaponTargetAllowed(st,f,tgt,range);
    if(canWeaponHit && f.cd<=0){ GARENA.cmdQueue[f.sid] = {sid:f.sid, act:"attack"}; continue; }
    // 🏹 遠程風箏:射程≥2、攻擊冷卻中、敵人已貼得比射程近 → 後撤拉開(打帶跑)
    if(range>=2 && f.cd>0 && !f.tauntBy){
      const nearest = en.slice().sort((a,b)=>garenaDist(f,a)-garenaDist(f,b))[0];
      const nd = garenaDist(f,nearest);
      if(nd < range){
        let dir;
        if(Math.abs(nearest.x-f.x) >= Math.abs(nearest.y-f.y)) dir = nearest.x>f.x ? "left" : "right";
        else dir = nearest.y>f.y ? "up" : "down";
        GARENA.cmdQueue[f.sid] = {sid:f.sid, move:dir}; continue;
      }
    }
    if(d>range || !canWeaponHit){                            // 接近；蛇矛 AI 也會主動走到同一直線
      let dir=gaIsMoba()?gaMobaObjectiveDir(f,tgt,Math.max(1,range)):null;
      // 🎯 包圍戰術:敵方人數少(≤3)且我方佔優時,不直衝,改繞到目標的空缺側(側翼/背後)夾擊
      const myAlive = allFs.filter(o=>o.team===f.team && !o.ko).length;
      const enAlive = en.length;
      const flank = (enAlive<=3 && myAlive>enAlive);
      if(flank && d>1){
        // 找目標四周哪一格沒有我方隊友包夾 → 往那個方向繞
        const around = [[0,-1,"up"],[0,1,"down"],[-1,0,"left"],[1,0,"right"]];
        const openSides = around.filter(a=>{
          const ax=tgt.x+a[0], ay=tgt.y+a[1];
          if(ax<0||ax>=GARENA.W||ay<0||ay>=GARENA.H) return false;
          return !allFs.some(o=>o.team===f.team && !o.ko && o.x===ax && o.y===ay);   // 尚無隊友佔的側
        });
        if(openSides.length){
          // 選離自己最近的空缺側當包抄目標點
          openSides.sort((a,b)=> (Math.abs(tgt.x+a[0]-f.x)+Math.abs(tgt.y+a[1]-f.y)) - (Math.abs(tgt.x+b[0]-f.x)+Math.abs(tgt.y+b[1]-f.y)));
          const gx = tgt.x+openSides[0][0], gy = tgt.y+openSides[0][1];
          if(Math.abs(gx-f.x) >= Math.abs(gy-f.y) && gx!==f.x) dir = gx>f.x ? "right" : "left";
          else if(gy!==f.y) dir = gy>f.y ? "down" : "up";
          else dir = gx>f.x ? "right" : (gx<f.x ? "left" : (gy>f.y ? "down" : "up"));
        }
      }
      if(!dir){                                              // 一般接近(帶一點隨機避免排隊)
        if(Math.random()<0.25) dir = ["up","down","left","right"][Math.floor(Math.random()*4)];
        else if(Math.abs(tgt.x-f.x) >= Math.abs(tgt.y-f.y)) dir = tgt.x>f.x ? "right" : "left";
        else dir = tgt.y>f.y ? "down" : "up";
      }
      GARENA.cmdQueue[f.sid] = {sid:f.sid, move:dir};
    }
  }
}

function gaHealFactor(){ const t = GARENA.active ? (GARENA.ticks||0) : 0; return t>=200 ? 0 : (t>=120 ? 0.5 : 1); }

function gaFrenzyDmg(){ return (GARENA.active && (GARENA.ticks||0)>=200) ? 1.5 : 1; }

function garenaTick(){
  if(!GARENA.active || GARENA.over || GARENA.paused) return;
  GARENA.ticks = (GARENA.ticks||0) + 1;
  GARENA.elapsed = (GARENA.elapsed||0) + 0.5;
  if(GARENA.ticks % 10 === 0) gaRecFrame();                   // 📼 每 5 秒一幀
  if(GARENA.ticks===120){ garenaLog("🔥 戰場狂熱!治療效果減半(60秒)"); comicPop("🔥 戰場狂熱!","boom","#f5731f",null); }
  if(GARENA.ticks===200){ garenaLog("⚔️ 死鬥時刻!治療無效、全體傷害+50%(100秒)"); comicPop("⚔️ 死鬥時刻!","boom","#e23b3b",null); }
  // 尚在門口排隊的角色尚未參戰，避免人還沒走進來就被鎖定或受到全場效果。
  const fs = Object.values(GARENA.fighters).filter(f=>!f.entering);
  if(gaIsMoba()) gaMobaRespawnTick(fs);
  gaMobaStructureTick();
  // 地面陷阱會等待一拍後武裝、逾時自動消失；召喚物則以低頻率支援，不增加角色碰撞計算。
  GARENA.traps=(GARENA.traps||[]).filter(t=>{ if((t.armT||0)>0)t.armT--; return --t.turns>=0; });
  gaTickSummons();
  gaTickFields();
  // ══ 🗺 戰場全場事件(暴風雪 / 火山噴發)══
  (function(){
    const M = gaMap();
    if(!M.event) return;
    if(GARENA.ticks % M.event.every !== 0) return;
    const alive = fs.filter(f=>!f.ko);
    if(!alive.length) return;
    if(M.event.kind === "blizzard"){                          // ❄️ 寒風:20%機率冰緩
      garenaLog(M.event.text+" 寒氣讓人動作遲緩");
      comicPop("❄️ 寒風呼嘯!","boom","#7ad0e8",null);
      alive.forEach(f=>{
        if(Math.random()<0.20){
          f.chillT = Math.max(f.chillT||0, 3);
          garenaFx(f.sid, "chill");
        }
      });
    }else if(M.event.kind === "gale"){                        // 🌬 狂風:全體被推向中央
      garenaLog(M.event.text+" 所有人被吹向戰場中央!");
      comicPop("🌬 狂風大作!","boom","#7fd3b8",null);
      const midX = Math.floor(GARENA.W/2);
      alive.forEach(f=>{
        const dir = f.x < midX ? 1 : (f.x > midX ? -1 : 0);
        const tx = f.x + dir;
        if(dir && tx>=0 && tx<GARENA.W && !gaIsBlocked(tx,f.y)
           && !Object.values(GARENA.fighters).some(o=>!o.ko && o.sid!==f.sid && o.x===tx && o.y===f.y)){
          f.x = tx;
        }
      });
    }else if(M.event.kind === "sandstorm"){                   // 🌫 沙塵暴:全體致盲
      garenaLog(M.event.text+" 飛沙走石,視線受阻!");
      comicPop("🌫 沙塵暴!","boom","#d8b878",null);
      alive.forEach(f=>{
        f.blindT = Math.max(f.blindT||0, 3);
        garenaFx(f.sid, "blind");
      });
    }else if(M.event.kind === "eruption"){                    // 🌋 噴發:隨機3格落石
      const spots = [];
      for(let i=0;i<3;i++) spots.push([Math.floor(Math.random()*GARENA.W), Math.floor(Math.random()*GARENA.H)]);
      GARENA.warnCells = spots;                               // 先預警(渲染時閃爍)
      garenaRenderField();                                    // ⚡ 立刻畫出預警框
      garenaLog(M.event.text+" 落石即將砸下!");
      comicPop("🌋 火山噴發!","boom","#e2593b",null);
      setTimeout(()=>{
        if(!GARENA.active || GARENA.over) return;
        alive.forEach(f=>{
          if(f.ko) return;
          if(spots.some(sp=> sp[0]===f.x && sp[1]===f.y)){
            f.hp = Math.max(0, f.hp - 15);
            dmgPop(15, '[data-gfighter="'+f.sid+'"]', "dmg");
            const nm = ((stu(f.sid)||{}).name)||"?";
            garenaLog("☄️ 落石砸中 "+nm+"!(-15)");
            if(f.hp<=0 && !f.ko){ f.ko=true; if(!gaTryRevive(f)) garenaLog("💀 "+nm+" 被落石壓垮!"); }
          }
        });
        GARENA.warnCells = null;
        garenaRenderField();
      }, 1400);                                               // 1.4秒預警時間可閃避
    }
  })();
  // ⏳ 先累積隱藏行動條，再讓 AI 只為「已取得行動權」的角色下指令。
  fs.forEach(f=>{ const st=stu(f.sid); if(!f.ko&&st) f.atb=Math.min(160,(f.atb||0)+gaActionGain(st,f)); });
  if(GARENA.aiMode) garenaAiStep(fs.filter(f=>(f.atb||0)>=100));
  else if(gaIsMoba()) garenaAiStep(fs.filter(f=>(f.atb||0)>=100&&(((stu(f.sid)||{}).isMobaAI)||f.autoPilot))); // 補位 AI 與學生主動託管角色自動推線
  // 手機只在按下、低頻心跳及放開時傳輸；教師端依 0.5 秒戰場節拍延續方向，降低全班同時操作的雲端寫入。
  if(gaIsMoba()){
    const now=Date.now();
    fs.forEach(f=>{
      const dir=GARENA.heldMoves[f.sid];
      if(!dir)return;
      if(now>Number(GARENA.heldMoveUntil[f.sid]||0)){
        delete GARENA.heldMoves[f.sid];delete GARENA.heldMoveUntil[f.sid];
        if(GARENA.cmdQueue[f.sid]&&GARENA.cmdQueue[f.sid].heldMove)delete GARENA.cmdQueue[f.sid];
        return;
      }
      if(!f.autoPilot&&!GARENA.cmdQueue[f.sid])GARENA.cmdQueue[f.sid]={sid:f.sid,move:dir,heldMove:true};
    });
  }
  // 1. 處理指令(每人每拍一動作)
  for(const f of fs){
    if(f.ko) continue;
    tickSkillCooldowns('ga',f.sid);
    if(f.cd>0) f.cd--;
    fighterCooldownInfo(f,'job');                           // ⌛ 實際秒數冷卻只清理到期狀態
    fighterCooldownInfo(f,'advUlt');                        // 👑 三轉終極同樣依時間到期
    if((f.arcaneLockCd||0)>0) f.arcaneLockCd--;             // 🔮 奧術鎖定觸發節流
    if((f.holyResolveCd||0)>0) f.holyResolveCd--;            // ✨ 聖光解厄內建冷卻
    if(f.stealth>0) f.stealth--;
    if(f.tauntT>0){ f.tauntT--; if(f.tauntT<=0) f.tauntBy=null; }
    if(f.chillT>0) f.chillT--;                             // ❄️ 冰緩:攻擊冷卻變長(在gaAtkCd計)
    if((f.healCutT||0)>0) f.healCutT--;                    // ⚔️ 戰士壓制：暫時降低牧師治療
    if((f.blizzardT||0)>0) f.blizzardT--;                  // 🌨 暴風雪雪雲視覺持續 1.5 秒
    if((f.executeT||0)>0) f.executeT--;                    // ☠️ 斬殺命中提示維持 1 秒
    if((f.bAtkT||0)>0) f.bAtkT--;                          // 光環增益遞減
    if((f.bDefT||0)>0) f.bDefT--;
    if((f.bAgiT||0)>0) f.bAgiT--;
    if((f.tauntingT||0)>0) f.tauntingT--;                  // 📢 嘲諷架勢遞減
    if((f.blindT||0)>0) f.blindT--;                        // 💨 致盲遞減
    if((f.silenceT||0)>0) f.silenceT--;                    // 🈲 沉默遞減
    if((f.hunterMarkT||0)>0) f.hunterMarkT--;              // 👁️ 獵人印記遞減
    if((f.poisonT||0)>0){                                  // 🐍 中毒:每拍扣血
      f.poisonT--;
      f.hp = Math.max(0, f.hp - (f.poisonDmg||3));
      f.tankDmg = (f.tankDmg||0) + (f.poisonDmg||3);
      dmgPop(f.poisonDmg||3, '[data-gfighter="'+f.sid+'"]', "dmg");
      if(f.hp<=0 && !f.ko){ f.ko=true; if(!gaTryRevive(f)) garenaLog("💀 "+((stu(f.sid)||{}).name||"?")+" 毒發身亡!"); }
    }
    if((f.stuckT||0)>0) f.stuckT--;                        // 🕳 流沙陷住遞減
    // ══ 🗺 地形效果結算 ══
    {
      const M_ = gaMap();
      const nm_ = ((stu(f.sid)||{}).name)||"?";
      const z_ = gaZoneAt(f.x, f.y);
      if(z_ && z_.kind==="lava"){                          // 🌋 熔岩:每拍灼燒
        const dl = z_.dmg||5;
        f.hp = Math.max(0, f.hp - dl);
        dmgPop(dl, '[data-gfighter="'+f.sid+'"]', "dmg");
        if(f.hp<=0 && !f.ko){ f.ko=true; if(!gaTryRevive(f)) garenaLog("🔥 "+nm_+" 被熔岩吞噬!"); }
      }
      if(z_ && z_.kind==="ember"){                         // 🟠 餘燼:輕微灼傷
        const de = z_.dmg||2;
        f.hp = Math.max(1, f.hp - de);
        dmgPop(de, '[data-gfighter="'+f.sid+'"]', "dmg");
      }
      if(z_ && z_.kind==="gravel"){                        // ⚱ 碎石:扎腳
        const dg = z_.dmg||2;
        f.hp = Math.max(1, f.hp - dg);
        dmgPop(dg, '[data-gfighter="'+f.sid+'"]', "dmg");
      }
      if(z_ && z_.kind==="crack" && (f.crackCd||0)<=0){    // 🕸 冰裂縫:摔傷+暈眩
        const dc = z_.dmg||8;
        f.hp = Math.max(1, f.hp - dc);
        f.stuckT = Math.max(f.stuckT||0, 2);
        f.crackCd = 6;                                     // 同一人短時間不重複觸發
        dmgPop(dc, '[data-gfighter="'+f.sid+'"]', "dmg");
        garenaLog("🕸 "+nm_+" 踩破冰面摔了一跤!(-"+dc+")");
      }
      if((f.crackCd||0)>0) f.crackCd--;
      if(z_ && z_.kind==="snow"){                          // ❄ 深雪:行動變慢
        f.chillT = Math.max(f.chillT||0, 2);
      }
      if(z_ && z_.kind==="steam" && !f.ko){                // 💨 蒸氣:遮蔽(短暫隱蔽,不易被鎖定)
        f.stealth = Math.max(f.stealth||0, 1);
      }
      if(z_ && z_.kind==="oasis" && f.hp < f.max){         // 🌴 綠洲:回血
        const hv = Math.min(z_.heal||6, f.max - f.hp);
        if(hv>0){ f.hp += hv; dmgPop(hv, '[data-gfighter="'+f.sid+'"]', "heal"); }
      }
      if(z_ && z_.kind==="updraft"){                       // ⬆ 上升氣流:攻擊冷卻加速
        f.bAgiT = Math.max(f.bAgiT||0, 2);
      }
      if(z_ && z_.kind==="river") f.chillT=Math.max(f.chillT||0,2);     // 榮耀峽谷河道：涉水會拖慢行動條與攻擊節奏
      if(z_ && z_.kind==="brush") f.stealth=Math.max(f.stealth||0,1);   // 草叢內保持短暫隱蔽，攻擊即現形
      if(z_ && z_.kind==="tornado" && (f.tornadoCd||0)<=0){ // 🌀 龍捲風:隨機拋飛
        f.tornadoCd = 8;
        let tries=0, nx2, ny2;
        do{
          nx2 = Math.floor(Math.random()*GARENA.W);
          ny2 = Math.floor(Math.random()*GARENA.H);
          tries++;
        }while(tries<20 && (gaIsBlocked(nx2,ny2)
              || Object.values(GARENA.fighters).some(o=>!o.ko && o.sid!==f.sid && o.x===nx2 && o.y===ny2)));
        if(tries<20){ f.x=nx2; f.y=ny2; garenaLog("🌀 "+nm_+" 被龍捲風捲走了!"); }
      }
      if((f.tornadoCd||0)>0) f.tornadoCd--;
      if(z_ && (z_.kind==="windR" || z_.kind==="windL")){   // 🌪 強風:吹向中央
        const dx_ = z_.kind==="windR" ? 1 : -1;
        const tx_ = f.x + dx_;
        if(tx_>=0 && tx_<GARENA.W && !gaIsBlocked(tx_,f.y)
           && !Object.values(GARENA.fighters).some(o=>!o.ko && o.sid!==f.sid && o.x===tx_ && o.y===f.y)){
          f.x = tx_;
        }
      }
      if(M_.heat && !f.ko && f.hp>0 && f.hp/f.max < 0.3){   // 🏜 烈日:殘血脫水
        f.hp = Math.max(1, f.hp - 2);
        dmgPop(2, '[data-gfighter="'+f.sid+'"]', "dmg");
      }
    }
    const controlCmd=GARENA.cmdQueue[f.sid];
    if(controlCmd&&controlCmd.act==="autopilot"){
      delete GARENA.cmdQueue[f.sid];
      if(controlCmd.enabled!==false){f.autoPilot=true;f.autoUnlockAt=Date.now()+10000;garenaLog("🤖 "+((stu(f.sid)||{}).name||"角色")+" 啟動 AI 自動戰鬥（10 秒後可解除）");}
      else if(f.autoPilot&&Date.now()>=(f.autoUnlockAt||0)){f.autoPilot=false;f.autoUnlockAt=0;garenaLog("🎮 "+((stu(f.sid)||{}).name||"角色")+" 返回手動操作");}
      garenaPushLive(true);
    }
    if(f.frozenT>0){                                       // 🧊 凍結:完全無法行動(移動/攻擊/技能)
      f.frozenT--;
      delete GARENA.cmdQueue[f.sid];
      continue;
    }
    if((f.atb||0)<100) continue;                           // 尚未累積足夠行動值：保持待命，不會和所有人同拍出手
    const cmd = GARENA.cmdQueue[f.sid];
    if(!cmd) continue;
    if(cmd.act==="attack" && f.cd>0){ continue; }          // 冷卻中的攻擊指令保留,下拍自動重試(不吃掉)
    delete GARENA.cmdQueue[f.sid];
    let acted=false;
    if(cmd.move) acted=garenaMove(f, cmd.move);
    else if(cmd.act==="attack") acted=garenaAttack(f, false);
    else if(cmd.act==="ult"){
      const st = stu(f.sid);
      if(st && ultReady(st) && !f.ultUsed){ f.ultUsed = true; acted=garenaAttack(f, true); }
      else if(f.ultUsed) garenaFx(f.sid, "miss");           // 已用過→提示
    }
    else if(cmd.act==="jobskill" && fighterCooldownLeft(f,'job')<=0){garenaJobSkill(f);acted=true;}
    else if(cmd.act==="skill" && cmd.skillId) acted=garenaCastEquippedSkill(f,String(cmd.skillId));
    // 行動條滿後保持待命；只有真正移動、命中／揮空、或成功施法才扣除 100，撞牆與空放不重置。
    if(acted){
      f.atb=Math.max(0,(f.atb||0)-(gaIsMoba()&&cmd.move?60:100)); // Dota 移動消耗較少，約提升 67% 推進速度
      if(gaIsMoba()) gaMobaCrystalPulse(f.team,f);              // 自家水晶存活時，每次完成動作治療周圍兩格守軍
    }
  }
  gaMobaKnowledgeTick(fs);                                  // 📚 答案塔前領域：站滿 3 秒判定，答錯全隊凍結
  // 2. 勝負判定
  const aliveR = fs.filter(f=>f.team==="red" && !f.ko).length;
  const aliveB = fs.filter(f=>f.team==="blue" && !f.ko).length;
  const elapsed = GARENA.elapsed||0;
  if(!gaIsMoba() && (aliveR===0 || aliveB===0)){ garenaEnd(aliveR>0?"red":"blue"); return; }
  if(elapsed >= GARENA.DURATION){
    if(gaIsKnowledgeMoba()){
      const ks=GARENA.mobaKnowledgeScore||{red:0,blue:0};garenaLog("📚 知識攻塔結算：紅 "+ks.red+"："+ks.blue+" 藍（只計答題分）");
      garenaEnd(ks.red===ks.blue?"draw":(ks.red>ks.blue?"red":"blue"),true);return;
    }
    const score = t=> fs.filter(f=>f.team===t && !f.ko).length*1000 + fs.filter(f=>f.team===t).reduce((sum,f)=>sum+f.hp/f.max,0)
      +(gaIsMoba()?(GARENA.structures||[]).filter(q=>q.team===t&&q.alive!==false).reduce((sum,q)=>sum+q.hp/q.max*500,0):0);
    const sr = score("red"), sb = score("blue");
    if(Math.abs(sr-sb) < 0.01){ garenaEnd("draw", true); return; }   // 完全平手
    garenaEnd(sr>sb?"red":"blue", true); return;
  }
  garenaPushLive();
  garenaRenderField();
}

function gaSetFacing(f, face){
  if(!f || !face) return;
  f.face = face;
  const el = document.querySelector('[data-gfighter="'+f.sid+'"]');
  if(!el) return;
  el.classList.remove("ga-face-up","ga-face-down","ga-face-left","ga-face-right");
  el.classList.add("ga-face-"+face);
}

function garenaMove(f, dir){
  const d = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir];
  if(!d) return false;
  gaSetFacing(f, dir);                                      // 即使被牆擋住，也會朝操作方向轉身
  if((f.stuckT||0)>0){ return false; }                      // 🕳 流沙陷住:本拍無法移動
  const nx=f.x+d[0], ny=f.y+d[1];
  if(nx<0||nx>=GARENA.W||ny<0||ny>=GARENA.H) return false;
  if(gaIsBlocked(nx,ny)) return false;                      // 🪨 障礙物擋路
  const occupied = Object.values(GARENA.fighters).some(o=>!o.ko && o.sid!==f.sid && o.x===nx && o.y===ny);
  if(occupied){
    // 🌫 隱身穿牆:若相鄰格被擋,嘗試從被擋者「穿過去」落到再下一格(繞過人牆偷襲後方)
    if(f.stealth>0){
      const fx=f.x+d[0]*2, fy=f.y+d[1]*2;
      if(fx>=0&&fx<GARENA.W&&fy>=0&&fy<GARENA.H
         && !Object.values(GARENA.fighters).some(o=>!o.ko && o.sid!==f.sid && o.x===fx && o.y===fy)){
        f.x=fx; f.y=fy; return true;                       // 穿過一格人牆
      }
    }
    return false;                                           // 非隱身或無處可落→擋住
  }
  f.x=nx; f.y=ny;
  // 🧊 冰原:滑行——會多滑一格(遇障礙/人/邊界則停)
  const m = gaMap();
  if(m.slide){
    const sx=f.x+d[0], sy=f.y+d[1];
    if(sx>=0 && sx<GARENA.W && sy>=0 && sy<GARENA.H && !gaIsBlocked(sx,sy)
       && !Object.values(GARENA.fighters).some(o=>!o.ko && o.sid!==f.sid && o.x===sx && o.y===sy)){
      f.x=sx; f.y=sy;
    }
  }
  // 🕳 旱地:踩到流沙→下一拍動不了
  const z = gaZoneAt(f.x, f.y);
  if(z && z.kind==="quicksand" && (f.stuckT||0)<=0){
    f.stuckT = 2;
    garenaLog("🕳 "+((stu(f.sid)||{}).name||"?")+" 踩進流沙,陷住了!");
  }
  gaTriggerGroundTrap(f);                                   // 🪤 只有實際走進格子才會觸發遊俠陷阱
  return true;
}

function jobSkillAvailable(s){ return !!(s && activeSkillLv(s,JOB_SKILL_REQUIRE[s.job]||'')>0); }

function garenaJobSkill(f){
  const att = stu(f.sid); if(!att) return;
  if(!jobSkillAvailable(att)){ garenaFx(f.sid,'miss'); return; }
  const JS = JOB_SKILL[att.job] || { name:"全力強擊", icon:"💥", cd:25, generic:true };   // 🔄 新職業預設職業技
  if((f.silenceT||0)>0){ garenaFx(f.sid,"miss"); return; }    // 🈲 沉默中無法施放職業技
  const all = Object.values(GARENA.fighters);
  if(att.job==="Mage"){                                     // 🌨️ 暴風雪:射程內所有敵人×0.7傷害 + 機率冰緩/凍結(最多3人)
    const range = weaponRange(att);
    const tgts = all.filter(o=>o.team!==f.team && !o.ko && o.stealth<=0 && garenaDist(f,o)<=range);
    if(!tgts.length){ garenaFx(f.sid,"miss"); return; }
    startFighterCooldown(f,'job',jobSkillCooldownSeconds(att));
    let total = 0, ccCount = 0;                             // ccCount:控場已套用人數(上限3)
    tgts.forEach(tgt=>{
      const dfd = stu(tgt.sid); if(!dfd) return;
      let mult = arenaDmgMult(att) * (ARENA_JOB_TUNE[att.job]||1) * 0.7;
      if(hasAdvantage(dfd.job, att.job) && f.hp < f.max*0.5) mult *= TRAIT_TUNE.underdog;
      const base = 10 + Math.floor(Math.random()*8);
      let dmg = Math.max(1, Math.round(base * mult * advancementDamageMult(att) * arenaDefMult(dfd) * advancementWardMult(dfd) * GA_PACE * gaFrenzyDmg() * (f.underdogM||1)));
      dmg=jobCounterDamage(att,dfd,'blizzard',dmg).dmg; // 只有已裝備的牧師聖盾系技能才會抗法
      tgt.hp = Math.max(0, tgt.hp - dmg);
      tgt.tankDmg = (tgt.tankDmg||0) + dmg;
      f.dmgDealt += dmg; total += dmg;
      if(tgt.hp<=0 && !tgt.ko){ tgt.ko=true; if(!gaTryRevive(tgt)){ f.kills++; garenaLog("💀 "+dfd.name+" 倒下!"); } }
      // ❄️ 暴風雪控場:每個命中者獨立判定,最多套用 3 名敵人
      if(ccCount < 3 && !tgt.ko){
        const r = Math.random()*100;
        if(r < 15 && (tgt.frozenT||0)<=0){                  // 15% 凍結 1.5 秒
          tgt.frozenT = 3; ccCount++;
          comicPop("凍結!","boom","#3a9fe0",'[data-gfighter="'+tgt.sid+'"]');
          garenaLog("🧊 "+dfd.name+" 被暴風雪凍結!(1.5秒無法行動)");
        }else if(r < 50){                                   // 再 35% 冰緩 2 秒
          tgt.chillT = 4; ccCount++;
          garenaLog("❄️ "+dfd.name+" 被暴風雪冰緩(行動變慢2秒)");
        }
      }
      tgt.blizzardT = Math.max(tgt.blizzardT||0, 3);
      skillFxPlay("blizzard", '[data-gfighter="'+tgt.sid+'"]');
      gaHurt(tgt.sid, 0);
      dmgPop(dmg, '[data-gfighter="'+tgt.sid+'"]', "dmg");
    });
    garenaLog("🌨️ "+att.name+" 施放【暴風雪】命中 "+tgts.length+" 人,共 "+total+" 傷害!");
  }
  else if(att.job==="Cleric"){                              // 💚 群補:2格內隊友+自己回15
    const allies = all.filter(o=>o.team===f.team && !o.ko && garenaDist(f,o)<=2);
    startFighterCooldown(f,'job',jobSkillCooldownSeconds(att));
    let healed = 0;
    allies.forEach(a2=>{
      const h = Math.min(Math.round(15 * gaHealFactor() * advancementHealMult(att)), a2.max - a2.hp);
      if(h>0){ a2.hp += h; healed++; f.healDone = (f.healDone||0) + h;
        skillFxPlay("groupheal", '[data-gfighter="'+a2.sid+'"]');
        dmgPop(h, '[data-gfighter="'+a2.sid+'"]', "heal"); }
    });
    garenaLog("💚 "+att.name+" 施放【聖光普照】治癒 "+healed+" 位隊友!");
  }
  else if(att.job==="Rogue"){                               // 🌫 隱身6拍(3秒)
    startFighterCooldown(f,'job',jobSkillCooldownSeconds(att)); f.stealth = 6;
    garenaLog("🌫 "+att.name+" 消失在煙霧中…(隱身3秒)");
  }
  else if(att.job==="Warrior"){                             // 📣 嘲諷:2格內敵人6拍強制打自己
    const tgts = all.filter(o=>o.team!==f.team && !o.ko && garenaDist(f,o)<=2);
    if(!tgts.length){ garenaFx(f.sid,"miss"); return; }
    startFighterCooldown(f,'job',jobSkillCooldownSeconds(att));
    tgts.forEach(t=>{ t.tauntBy = f.sid; t.tauntT = 6; skillFxPlay("taunt", '[data-gfighter="'+t.sid+'"]'); });
    f.tauntingT = 6;                                        // 📢 嘲諷架勢:期間有點「嘲諷」技能者受傷減免
    skillFxPlay("taunt", '[data-gfighter="'+f.sid+'"]');    // 嘲諷音波環
    comicPop("嘲諷!","boom","#f5731f",'[data-gfighter="'+f.sid+'"]');
    garenaLog("📣 "+att.name+" 震地嘲諷!"+tgts.length+" 名敵人被迫攻擊他(3秒)");
  }
  else if(JS.generic){                                      // 🔄 新職業預設職業技:1.5 倍強擊最近敵人
    const range = Math.max(1, weaponRange(att));
    const tgts = all.filter(o=>o.team!==f.team && !o.ko && o.stealth<=0 && garenaDist(f,o)<=range)
      .sort((x,y)=>garenaDist(f,x)-garenaDist(f,y));
    const tgt = tgts[0];
    if(!tgt){ garenaFx(f.sid,"miss"); return; }
    startFighterCooldown(f,'job',jobSkillCooldownSeconds(att));
    const dfd2 = stu(tgt.sid); if(!dfd2) return;
    const base = 15 + Math.floor(Math.random()*11);
    const dmg = Math.max(1, Math.round(base * arenaDmgMult(att) * (ARENA_JOB_TUNE[att.job]||1) * 1.5 * arenaDefMult(dfd2) * GA_PACE));
    tgt.hp = Math.max(0, tgt.hp - dmg);
    tgt.tankDmg = (tgt.tankDmg||0) + dmg;
    f.dmgDealt += dmg;
    dmgPop(dmg, '[data-gfighter="'+tgt.sid+'"]', "dmg");
    comicPop("💥 全力強擊!","boom","#f5a623",'[data-gfighter="'+tgt.sid+'"]');
    garenaLog("💥 "+att.name+" 施放【全力強擊】對 "+dfd2.name+" 造成 "+dmg+" 傷害!");
    if(tgt.hp<=0 && !tgt.ko){ tgt.ko=true; if(!gaTryRevive(tgt)){ f.kills++; garenaLog("💀 "+dfd2.name+" 倒下!"); } }
  }
}

function gaTryRevive(tgt){
  if(!skillsEnabled() || tgt.revivedOnce) return false;
  const dfd = stu(tgt.sid); if(!dfd) return false;
  const savers = Object.values(GARENA.fighters).filter(o=>o.team===tgt.team && !o.ko && o.sid!==tgt.sid)
    .map(o=>stu(o.sid)).filter(x=>x && activeSkillLv(x,"revive")>0)
    .sort((a,b)=>activeSkillLv(b,"revive")-activeSkillLv(a,"revive"));
  const sv = savers[0];
  if(sv && Math.random()*100 < skillChance(sv,"revive")){
    tgt.ko = false; tgt.hp = skillVal(sv,"revive")||20; tgt.revivedOnce = true;
    comicPop("復活!","boom","#e84393",'[data-gfighter="'+tgt.sid+'"]');
    garenaLog("💗 "+sv.name+" 的復活術把 "+dfd.name+" 拉了回來!(每場一次)");
    return true;
  }
  return false;
}

function gaProjectile(fromSid, toSid, icon){
  try{
    if(!GARENA.active || GARENA.over) return;
    const a = document.querySelector('[data-gfighter="'+fromSid+'"]');
    const t = document.querySelector('[data-gfighter="'+toSid+'"]');
    if(!a || !t) return;
    const ra = a.getBoundingClientRect(), rt = t.getBoundingClientRect();
    const p = document.createElement("div");
    p.className = "ga-proj";
    if(icon==="arrow"){                                      // 🏹 遊俠:單支箭矢(桿+箭頭+尾羽),不再整把弓飛出去
      p.innerHTML = '<svg width="30" height="10" viewBox="0 0 30 10" style="display:block">'
        + '<line x1="3" y1="5" x2="23" y2="5" stroke="#8a5a2a" stroke-width="2.2" stroke-linecap="round"/>'
        + '<polygon points="30,5 22,1.5 22,8.5" fill="#4a4a4a"/>'
        + '<path d="M3 5 L0 1 M3 5 L0 9 M7 5 L4 1 M7 5 L4 9" stroke="#d84a4a" stroke-width="1.6" stroke-linecap="round"/>'
        + '</svg>';
    } else {
      p.textContent = icon;
    }
    p.style.left = (ra.left + ra.width/2 - 9) + "px";
    p.style.top  = (ra.top + ra.height/2 - 9) + "px";
    const dx = (rt.left + rt.width/2) - (ra.left + ra.width/2);
    const dy = (rt.top + rt.height/2) - (ra.top + ra.height/2);
    p.style.transform = "rotate("+Math.atan2(dy,dx)*180/Math.PI+"deg)";
    document.body.appendChild(p);
    requestAnimationFrame(()=>{ p.style.transform = "translate("+dx+"px,"+dy+"px) rotate("+Math.atan2(dy,dx)*180/Math.PI+"deg)"; });
    setTimeout(()=>{ p.classList.add("hit"); p.style.transition="none"; }, 230);
    setTimeout(()=>{ p.remove(); }, 440);
  }catch(_){}
}

function gaSwing(sid){
  const el = document.querySelector('[data-gfighter="'+sid+'"]');
  if(!el) return;
  el.classList.remove("ga-swing"); void el.offsetWidth;   // 重觸發動畫
  el.classList.add("ga-swing");
  setTimeout(()=>{ el.classList.remove("ga-swing"); }, 360);
}

function gaLegendWeaponFx(kind,fromSid,toSid){
  const from=document.querySelector('[data-gfighter="'+fromSid+'"]'); if(!from) return;
  const fr=from.getBoundingClientRect();
  if(kind==="sweep"){
    const ring=document.createElement('div'); ring.className='weapon-sweep-fx';
    ring.style.left=(fr.left+fr.width/2)+'px';ring.style.top=(fr.top+fr.height/2)+'px';document.body.appendChild(ring);setTimeout(()=>ring.remove(),650);return;
  }
  const to=document.querySelector('[data-gfighter="'+toSid+'"]'); if(!to) return;
  const tr=to.getBoundingClientRect(),x1=fr.left+fr.width/2,y1=fr.top+fr.height/2,x2=tr.left+tr.width/2,y2=tr.top+tr.height/2;
  if(kind==="combo"){
    const combo=document.createElement('div');combo.className='weapon-combo-fx';combo.style.left=x2+'px';combo.style.top=y2+'px';document.body.appendChild(combo);setTimeout(()=>combo.remove(),680);return;
  }
  const line=document.createElement('div');line.className='weapon-thrust-fx'+(kind==='longbow4'?' weapon-sunshot-fx':'');line.style.left=x1+'px';line.style.top=(y1-4)+'px';line.style.width=Math.hypot(x2-x1,y2-y1)+'px';line.style.transform='rotate('+Math.atan2(y2-y1,x2-x1)*180/Math.PI+'deg)';document.body.appendChild(line);setTimeout(()=>line.remove(),520);
}

function gaHurt(sid, delay){
  setTimeout(()=>{
    const el = document.querySelector('[data-gfighter="'+sid+'"]');
    if(!el) return;
    el.classList.remove("ga-hurt"); void el.offsetWidth;
    el.classList.add("ga-hurt");
    setTimeout(()=>{ el.classList.remove("ga-hurt"); }, 300);
  }, delay||0);
}

function gaSplash(f, att, tgt, dmg, ratio, chill, icon){
  const around = Object.values(GARENA.fighters).filter(o=>o.team!==f.team && !o.ko && o.sid!==tgt.sid && garenaDist(tgt,o)<=1);
  if(!around.length) return;
  const sd = Math.max(1, Math.round(dmg*ratio));
  around.forEach(o=>{
    o.hp = Math.max(0, o.hp - sd);
    o.tankDmg = (o.tankDmg||0) + sd;
    if(chill) o.chillT = Math.max(o.chillT||0, 4);
    skillFxPlay(chill ? "frost" : "blast", '[data-gfighter="'+o.sid+'"]');   // 濺射特效:冰霜/爆炸
    gaHurt(o.sid, 0);
    dmgPop(sd, '[data-gfighter="'+o.sid+'"]', "dmg");
    f.dmgDealt += sd;
    if(o.hp<=0 && !o.ko){ o.ko=true; if(!gaTryRevive(o)){ f.kills++; garenaLog("💀 "+((stu(o.sid)||{}).name||"?")+" 被波及倒下!"); } }
  });
  garenaLog(icon+" 濺射波及 "+around.length+" 名敵人(各 -"+sd+(chill?",冰緩":"")+")");
}

function gaExtraStrike(f,tgt,amount,fxId,label){
  if(!tgt||tgt.ko) return 0;
  const hit=Math.max(1,Math.round(amount));
  tgt.hp=Math.max(0,tgt.hp-hit); tgt.tankDmg=(tgt.tankDmg||0)+hit; f.dmgDealt=(f.dmgDealt||0)+hit;
  skillFxPlay(fxId||'adv_power','[data-gfighter="'+tgt.sid+'"]'); gaHurt(tgt.sid,0); dmgPop(hit,'[data-gfighter="'+tgt.sid+'"]','dmg');
  if(tgt.hp<=0&&!tgt.ko){ tgt.ko=true; if(!gaTryRevive(tgt)){ f.kills=(f.kills||0)+1; garenaLog('💀 '+((stu(tgt.sid)||{}).name||'?')+' 被'+(label||'追擊')+'擊倒！'); } }
  return hit;
}

function gaLegendWeaponFollowThrough(f,att,tgt,dmg){
  const pattern=legendWeaponPattern(att); if(!pattern) return 0;
  const enemies=Object.values(GARENA.fighters).filter(o=>o.team!==f.team&&!o.ko&&o.sid!==tgt.sid);let hits=0,total=0;
  if(pattern==="line2"){
    const dx=Math.sign(tgt.x-f.x),dy=Math.sign(tgt.y-f.y);
    const line=enemies.filter(o=>{
      const ox=o.x-f.x,oy=o.y-f.y;
      return (dx!==0&&oy===0&&Math.sign(ox)===dx&&Math.abs(ox)<=2)||(dy!==0&&ox===0&&Math.sign(oy)===dy&&Math.abs(oy)<=2);
    }).sort((a,b)=>garenaDist(f,a)-garenaDist(f,b)).slice(0,1);
    line.forEach(o=>{total+=gaExtraStrike(f,o,dmg*.55,'lance_combo','蛇矛貫穿');hits++;});
    if(hits) garenaLog('🐍 '+att.name+' 的蛇矛貫穿同一直線 '+hits+' 名敵人，追加 '+total+' 傷害！');
  }else if(pattern==="sweep"){
    const around=enemies.filter(o=>Math.max(Math.abs(o.x-f.x),Math.abs(o.y-f.y))<=1);
    around.forEach(o=>{total+=gaExtraStrike(f,o,dmg*.45,'radiant_blade','方天橫掃');hits++;});
    if(hits) garenaLog('🔥 '+att.name+' 的方天畫戟橫掃周圍 '+hits+' 名敵人，追加 '+total+' 傷害！');
  }else if(pattern==="combo"&&!tgt.ko&&Math.random()<.30){
    const first=gaExtraStrike(f,tgt,dmg*.42,'lance_combo','雙截棍連打');
    const second=tgt.ko?0:gaExtraStrike(f,tgt,dmg*.28,'edge','雙截棍連打');total=first+second;hits=(first>0?1:0)+(second>0?1:0);
    gaLegendWeaponFx('combo',f.sid,tgt.sid);comicPop('連擊 ×'+(1+hits)+'!','boom','#ffb43b','[data-gfighter="'+tgt.sid+'"]');
    setTimeout(()=>gaSwing(f.sid),110);setTimeout(()=>gaSwing(f.sid),230);
    garenaLog('🥋 '+att.name+' 的玄鐵雙截棍觸發疾影連打，追加 '+hits+' 擊、共 '+total+' 傷害！');
  }
  return hits;
}

function gaTriggerForgeWeaponSkill(f,att,tgt,dmg){
  const ws=equippedForgeWeaponSkill(att);if(!ws||Math.random()>=.08)return false;
  const all=Object.values(GARENA.fighters),allies=all.filter(o=>o.team===f.team&&!o.ko),anchor='[data-gfighter="'+(tgt&&!tgt.ko?tgt.sid:f.sid)+'"]';
  if(ws.id==="renewal"){
    const low=allies.filter(o=>garenaDist(f,o)<=3).sort((a,b)=>(a.hp/a.max)-(b.hp/b.max))[0];if(low){const h=Math.max(0,Math.min(Math.max(5,Math.round(low.max*.14)),low.max-low.hp));low.hp+=h;f.healDone=(f.healDone||0)+h;if(h)dmgPop(h,'[data-gfighter="'+low.sid+'"]',"heal");}
  }else if(ws.id==="shield_wall")allies.filter(o=>garenaDist(f,o)<=2).forEach(o=>o.bDefT=Math.max(o.bDefT||0,5));
  else if(ws.id==="cleanse")allies.filter(o=>garenaDist(f,o)<=2).forEach(o=>{o.chillT=0;o.frozenT=0;o.silenceT=0;});
  else if(ws.id==="agi")allies.filter(o=>garenaDist(f,o)<=2).forEach(o=>o.bAgiT=Math.max(o.bAgiT||0,5));
  else if(ws.id==="blast"&&tgt&&!tgt.ko){gaExtraStrike(f,tgt,dmg*.35,'blast',ws.name);gaSplash(f,att,tgt,dmg,.25,false,'🔥');}
  else if(ws.id==="chain"&&tgt&&!tgt.ko){gaExtraStrike(f,tgt,dmg*.25,'chain',ws.name);gaChainLightning(f,att,tgt,dmg,2,.32);}
  else if(ws.id==="frost"&&tgt&&!tgt.ko)tgt.chillT=Math.max(tgt.chillT||0,4);
  else if(ws.id==="hunter_mark"&&tgt&&!tgt.ko){tgt.exposed=true;tgt.exposedM=Math.max(tgt.exposedM||0,1.35);tgt.hunterMarkT=Math.max(tgt.hunterMarkT||0,10);}
  skillFxPlay(ws.fx,anchor);comicPop(ws.icon+ws.name+" 8%！","boom","#ffd563",anchor);garenaLog('🌟 '+att.name+' 的傳說武器發動【'+ws.name+'】！');return true;
}

function gaChainLightning(f,att,start,dmg,maxJumps,ratio){
  const struck=[start.sid]; let from=start, jumps=0;
  while(jumps<maxJumps){
    const next=Object.values(GARENA.fighters).filter(o=>o.team!==f.team&&!o.ko&&!struck.includes(o.sid)&&garenaDist(from,o)<=2)
      .sort((a,b)=>garenaDist(from,a)-garenaDist(from,b)||(a.hp/a.max)-(b.hp/b.max))[0];
    if(!next) break;
    jumps++; struck.push(next.sid);
    const hit=Math.max(1,Math.round(dmg*ratio*Math.pow(.76,jumps-1)));
    next.hp=Math.max(0,next.hp-hit); next.tankDmg=(next.tankDmg||0)+hit; f.dmgDealt=(f.dmgDealt||0)+hit;
    const last=from; from=next;
    setTimeout(()=>{ gaProjectile(last.sid,next.sid,'⚡'); skillFxPlay('chain','[data-gfighter="'+next.sid+'"]'); gaHurt(next.sid,0); dmgPop(hit,'[data-gfighter="'+next.sid+'"]'); },jumps*120);
    if(next.hp<=0&&!next.ko){ next.ko=true; if(!gaTryRevive(next)){ f.kills=(f.kills||0)+1; garenaLog('💀 '+((stu(next.sid)||{}).name||'?')+' 被連鎖閃電擊倒！'); } }
  }
  if(jumps) garenaLog('⚡ '+att.name+' 的連鎖閃電跳躍 '+jumps+' 次，依序追擊附近敵人！');
}

function garenaAttack(f, isUlt, forcedSkillId){
  const att = stu(f.sid); if(!att) return false;
  if(!isUlt && (f.blindT||0)>0 && Math.random()*100 < 55){    // 💨 致盲:攻擊55%落空
    garenaLog("💨 "+att.name+" 在煙霧中揮空了!");
    garenaFx(f.sid, "miss");
    f.cd = gaAtkCd(att) * (f.chillT>0?1.5:1) * ((f.bAgiT||0)>0?0.85:1);
    return true;
  }
  if(f.stealth>0){ f.stealth = 0; }                          // 攻擊破隱
  const range = isUlt ? Math.max(2, weaponRange(att)) : weaponRange(att);
  const enemies = Object.values(GARENA.fighters).filter(o=>o.team!==f.team && !o.ko && o.stealth<=0);   // 隱身者不可被選中
  let inRange = enemies.filter(o=>weaponTargetAllowed(att,f,o,range)).sort((a,b)=>garenaDist(f,a)-garenaDist(f,b));
  // 📣 被嘲諷:嘲諷者在射程內→強制以他為目標
  if(f.tauntBy){
    const taunter = GARENA.fighters[f.tauntBy];
    if(taunter && !taunter.ko && weaponTargetAllowed(att,f,taunter,range)) inRange = [taunter];
  }else if(inRange.length>1){
    // 出手優先序:①殘血收割(hp<30%)②職業偏好(戰打俠/俠打牧/法打戰+聚集/牧打法)③距離
    const PREF_JOB = { Warrior:"Rogue", Rogue:"Cleric", Mage:"Warrior", Cleric:"Mage" };
    const pj = PREF_JOB[att.job];
    inRange = inRange.slice().sort((a,b)=>{
      const la = (a.hp/a.max<0.3)?0:1, lb = (b.hp/b.max<0.3)?0:1;     // 🎯 殘血優先集火收割
      if(la!==lb) return la-lb;
      if(att.job==="Mage"){                                  // 法師:先看目標周圍聚集的敵人數
        const ca = enemies.filter(o=>garenaDist(a,o)<=1).length, cb = enemies.filter(o=>garenaDist(b,o)<=1).length;
        if(cb!==ca) return cb-ca;
      }
      const aj = ((stu(a.sid)||{}).job===pj)?0:1, bj = ((stu(b.sid)||{}).job===pj)?0:1;
      if(aj!==bj) return aj-bj;
      return garenaDist(f,a)-garenaDist(f,b);
    });
  }
  if(!inRange.length){
    if(!isUlt && gaIsMoba() && gaMobaAttackStructure(f,att,forcedSkillId)) return true;
    if(isUlt) f.ultUsed=false;                              // 大招空放不算用掉
    garenaFx(f.sid, "miss"); return false;
  }
  const tgt = inRange[0];
  const dfd = stu(tgt.sid); if(!dfd) return false;
  const on = skillsEnabled();
  const advUlt = !isUlt ? shouldAdvanceUltimate(att,f) : null;
  if(advUlt) startFighterCooldown(f,'advUlt',skillCooldownSeconds(att,advUlt.id));
  const roll = (id)=> on && (f.silenceT||0)<=0 && rollCombatSkill(att,id,'ga');   // 🈲 沉默中無法施放職業技
  let mult = arenaDmgMult(att) * (ARENA_JOB_TUNE[att.job]||1);
  let skillName="", skillId=null;
  if(isUlt){
    const u = ULT_DEFS[att.job] || { name:"全力一擊", mult:2 };   // 🔄 新職業預設大招
    mult *= u.mult;
    if(att.job==="Mage" && dfd.job==="Cleric") mult *= TRAIT_TUNE.sanctuary;
    skillName = u.name; skillId = "__ult";
    if(u.selfHeal){ const uh=Math.min(u.selfHeal, f.max-f.hp); f.hp+=uh; }
  }else if(forcedSkillId){
    const forced=skillDef(att.job,forcedSkillId);
    const raw=skillVal(att,forcedSkillId);
    skillName=forced?forced.name:"戰技";skillId=forcedSkillId;
    mult*=Math.max(1.12,Math.min(3.2,(forced&&forced.kind==="atk"&&raw>1)?raw:(1.25+(forced?((forced.tier||1)-1)*.35:0))));
  }else{
    const atkSkills=[["bash",1.8,"重擊"],["blast",2,"爆裂"],["edge",2,"暴擊"],["lethal",2.5,"致命"],["smite",1.8,"制裁"],["judge",2.2,"審判"],["meteor",3,"隕石"],["shadow",2,"影襲"],["chain",1.5,"連鎖"],["spark",1.5,"電擊"],["wrath",2.8,"天罰"]];
    let best=1;
    for(const [id,m,nm] of atkSkills){ if(roll(id) && m>best){ best=m; skillName=nm; skillId=id; } }
    for(const id of advancedAttackIds(att.job)){ const m=skillVal(att,id), sk=skillDef(att.job,id); if(m>best && roll(id)){ best=m; skillName=sk.name; skillId=id; } }
    if(advUlt){
      skillName=advUlt.name; skillId=advUlt.id;
      if(att.job==='Mage') best=Math.max(best,skillVal(att,'elemental_doom')||2.2);
      if(att.job==='Rogue') best=Math.max(best,skillVal(att,'thousand_arrows')||2.1);
    }
    if(tgt.hp/tgt.max < 0.3 && roll("execute") && 2.5>best){ best=2.5; skillName="斬殺"; skillId="execute"; tgt.executeT=2; }   // ☠️ 斬殺:對殘血(<30%)角色生效
    mult *= best;
  }
  if((f.bAtkT||0)>0) mult *= 1.1;                            // 📣 戰吼/魔力共鳴光環:攻擊+10%
  // 逆境之魂
  if(hasAdvantage(dfd.job, att.job) && f.hp < f.max*0.5) mult *= TRAIT_TUNE.underdog;
  const base = 10 + Math.floor(Math.random()*8);
  // 🌀 AGI 只能閃物理攻擊；法師觸發的技能／終極法術皆為必中。
  const magicSpell=isMagicSpell(att,skillId);
  if(!isUlt && !magicSpell && Math.random()*100 < combatDodgeChance(att,dfd,skillId)){
    garenaLog(dfd.name+" 靈巧地閃過了 "+att.name+" 的攻擊!");
    comicPop("MISS!","cloud","#4a90d9", '[data-gfighter="'+tgt.sid+'"]');
    gaRogueCounterStep(att,dfd,f,tgt);
    f.cd = Math.min(2, gaAtkCd(att));                      // 撲空小冷卻(高敏更快恢復)
    return true;
  }
  let dmg = Math.max(1, Math.round(base * mult * advancementDamageMult(att) * arenaDefMult(dfd) * advancementWardMult(dfd) * GA_PACE * gaFrenzyDmg() * (f.underdogM||1) * rangeDmgMult(att, garenaDist(f, tgt))));
  if(advancementBonus(att,'power')>0) advancementFx(att,'power','[data-gfighter="'+tgt.sid+'"]');
  if(advancementBonus(dfd,'ward')>0) advancementFx(dfd,'ward','[data-gfighter="'+tgt.sid+'"]');
  // 特性相剋(同1v1)
  let tag = "";
  if(isBow(att) && garenaDist(f, tgt)<=1) tag += "🏹近";   // 弓貼臉減傷提示
  const pierce = att.job==="Mage" && dfd.job==="Warrior" && !!skillId;
  if(pierce) dmg = Math.round(dmg * TRAIT_TUNE.pierceBonus);
  if(!isUlt && !pierce && on && skillLv(dfd,"block") && Math.random()*100 < skillChance(dfd,"block")){
    if(dfd.job==="Warrior" && att.job==="Rogue"){ dmg=Math.round(dmg*TRAIT_TUNE.ironWall); tag="🛡"; }
    else{ dmg=Math.round(dmg*0.5); tag="🧱"; }
  }
  const counter=jobCounterDamage(att,dfd,skillId,dmg); dmg=counter.dmg;
  if(counter.label) tag+=(tag?" ":"")+counter.label;
  if(counter.label) counterSkillFx('cleric','[data-gfighter="'+tgt.sid+'"]');
  if(gaApplyArcaneLock(att,dfd,tgt,skillId)) tag+=(tag?" ":"")+"🔮鎖定";
  if(tgt.exposed){ dmg = Math.round(dmg*(tgt.exposedM||1.3)); tgt.exposed = false; tgt.exposedM = null; tag += "🌪"; }   // 破綻:下一擊加傷
  // 🛡 庇護(被動):受擊方隊上存活者最高「庇護」→ 全隊減傷
  if(on){
    const aeg = Object.values(GARENA.fighters).filter(o=>o.team===tgt.team && !o.ko)
      .map(o=>stu(o.sid)).filter(x=>x && activeSkillLv(x,"aegis")>0)
      .sort((a,b)=>skillVal(b,"aegis")-skillVal(a,"aegis"))[0];
    if(aeg){
      dmg = Math.max(1, Math.round(dmg*(1 - skillVal(aeg,"aegis")/100)));
      tag += "🛡";
      skillFxPlay("aegis", '[data-gfighter="'+tgt.sid+'"]');
    }
    // 📢 嘲諷架勢:戰士嘲諷發動期間,有點「嘲諷」技能者受傷減免
    if((tgt.tauntingT||0)>0 && activeSkillLv(dfd,"taunt")>0) dmg = Math.max(1, Math.round(dmg*(1 - skillVal(dfd,"taunt"))));
  }
  // 防禦／輔助技能也走同一套「已裝備、機率、冷卻」規則，避免多人戰鬥連續觸發。
  const rollFor = (who,id)=> on && rollCombatSkill(who,id,"ga");
  // 🐯🐢 受方寵物技能
  if(!isUlt && dfd.petId===3 && Math.random()*100 < 12){       // 白虎疾步:完全閃避
    comicPop("🐯 白虎疾步!","cloud","#e8e8e8",'[data-gfighter="'+tgt.sid+'"]');
    garenaLog("🐯 "+dfd.name+" 的白虎疾步閃避了攻擊!");
    garenaFx(tgt.sid, "miss");
    f.cd = gaAtkCd(att) * (f.chillT>0?1.5:1) * ((f.bAgiT||0)>0?0.85:1);
    return true;
  }
  if(!isUlt && dfd.petId===4 && Math.random()*100 < 12){       // 玄武堅甲:減傷50%
    dmg = Math.max(1, Math.round(dmg*0.5));
    comicPop("🐢 玄武堅甲!","cloud","#7ad0a8",'[data-gfighter="'+tgt.sid+'"]');
    garenaLog("🐢 "+dfd.name+" 的玄武堅甲擋下一半傷害!");
  }
  if((tgt.bDefT||0)>0) dmg = Math.round(dmg*0.9);            // 🛡 守護號令光環:受傷-10%
  // 🛡️ 盾衛侍從在附近時先替隊友承受部分傷害；終極範圍技仍能穿透，保留關鍵時刻的反制。
  if(!isUlt){
    const cover=gaSquireIntercept(tgt,dmg); dmg=cover.dmg;
    if(cover.blocked) tag+=(tag?" ":"")+"🛡盾衛";
  }
  // 🔰 聖盾:自己或2格內隊友持有聖盾 → 機率吸收 30% 傷害
  if(!isUlt){
    const guards = Object.values(GARENA.fighters).filter(o=>o.team===tgt.team && !o.ko && garenaDist(tgt,o)<=2 && activeSkillLv(stu(o.sid)||{skills:{}},"shield"));
    const bearer = guards.map(o=>stu(o.sid)).sort((a,b)=>activeSkillLv(b,"shield")-activeSkillLv(a,"shield"))[0];
    if(bearer && rollFor(bearer,"shield")){ dmg = Math.round(dmg*0.7); tag += "🔰"; }
  }
  const critical=resolveCriticalHit(att,skillId,dmg,{allow:!isUlt&&!advUlt&&!arenaSkillIsUltimate(att,skillId)});
  dmg=critical.dmg;
  if(critical.crit) tag+=(tag?" ":"")+(critical.embedded?(skillId==="lethal"?"☠️致命爆擊":"🗡️爆擊"):("💥爆擊×"+critical.mult.toFixed(2)));
  const gaAtkAffixes=triggeredAffixes(att,"atk"),gaDefAffixes=triggeredAffixes(dfd,"def");
  let gaReflect=0,gaPhoenix=0;const gaAffixMsgs=[];
  gaAtkAffixes.forEach(af=>{
    if(af.mult){let m=af.mult;if(af.execute&&tgt.hp/Math.max(1,tgt.max)<=af.execute)m+=.7;dmg=Math.max(1,Math.round(dmg*m));}
    if(af.expose){tgt.exposed=true;tgt.exposedM=Math.max(tgt.exposedM||0,1+af.expose);}
    if(af.key==="frost")tgt.chillT=Math.max(tgt.chillT||0,4);
    if(af.key==="venom"){tgt.poisonT=Math.max(tgt.poisonT||0,6);tgt.poisonDmg=Math.max(tgt.poisonDmg||0,af.dot);}
    if(af.heal){const h=Math.min(af.heal,f.max-f.hp);f.hp+=h;if(h){f.healDone=(f.healDone||0)+h;dmgPop(h,'[data-gfighter="'+f.sid+'"]',"heal");}}
    if(af.groupHeal){Object.values(GARENA.fighters).filter(o=>o.team===f.team&&!o.ko).forEach(o=>{const h=Math.min(Math.max(1,Math.round(o.max*af.groupHeal)),o.max-o.hp);o.hp+=h;if(h){f.healDone=(f.healDone||0)+h;dmgPop(h,'[data-gfighter="'+o.sid+'"]',"heal");}});}
    if(af.gauge)f.atb=Math.min(100,(f.atb||0)+af.gauge);
    gaAffixMsgs.push(af.icon+af.name);
  });
  gaDefAffixes.forEach(af=>{if(af.reduce)dmg=Math.max(1,Math.round(dmg*af.reduce));if(af.reflect)gaReflect=Math.max(gaReflect,af.reflect);if(af.revive)gaPhoenix=Math.max(gaPhoenix,af.revive);if(af.key==="aegis"){tgt.chillT=0;tgt.frozenT=0;tgt.silenceT=0;}gaAffixMsgs.push(af.icon+af.name);});
  // 🔥 不屈:致命傷機率保留 1 HP(每場一次)
  if(dmg >= tgt.hp && !tgt.endured && rollFor(dfd,"endure")){
    tgt.endured = true; dmg = tgt.hp - 1;
    comicPop("不屈!","boom","#e2593b",'[data-gfighter="'+tgt.sid+'"]');
    garenaLog("🔥 "+dfd.name+" 以不屈意志撐住了致命一擊!(保留 1 HP)");
  }
  tgt.hp = Math.max(0, tgt.hp - dmg);
  tgt.tankDmg = (tgt.tankDmg||0) + dmg;                      // 統計:承受傷害
  if(gaPhoenix>0&&tgt.hp<=0){tgt.hp=Math.max(1,Math.round(tgt.max*gaPhoenix));comicPop("鳳凰涅槃!","boom","#ff8a4c",'[data-gfighter="'+tgt.sid+'"]');dmgPop(tgt.hp,'[data-gfighter="'+tgt.sid+'"]',"heal");}
  if(gaReflect>0){const ref=Math.max(1,Math.round(dmg*gaReflect));f.hp=Math.max(0,f.hp-ref);dmgPop(ref,'[data-gfighter="'+f.sid+'"]',"dmg");}
  if(gaAffixMsgs.length){comicPop(gaAffixMsgs.join(" "),"cloud","#ffd563",'[data-gfighter="'+f.sid+'"]');garenaLog("✨ 裝備詞條觸發："+gaAffixMsgs.join("、"));}
  // 🌵 荊棘:受擊機率反彈 50% 傷害給攻擊者
  if(!isUlt && rollFor(dfd,"thorns")){
    const ref = Math.max(1, Math.round(dmg*0.5));
    f.hp = Math.max(0, f.hp - ref);
    dmgPop(ref, '[data-gfighter="'+f.sid+'"]', "dmg");
    garenaLog("🌵 "+dfd.name+" 的荊棘反彈 "+ref+" 傷害!");
    if(f.hp<=0 && !f.ko){ f.ko=true; garenaLog("💀 "+att.name+" 被荊棘反噬倒下!"); }
  }
  for(const id of ['counter_stance','sacred_counter']){
    if(!isUlt && rollFor(dfd,id)){
      const ref=Math.max(1,Math.round(dmg*skillVal(dfd,id)));
      f.hp=Math.max(0,f.hp-ref); dmgPop(ref,'[data-gfighter="'+f.sid+'"]',"dmg");
      skillFxPlay(id,'[data-gfighter="'+f.sid+'"]'); comicPop((skillDef(dfd.job,id)||{}).name+'!','boom','#f5c518','[data-gfighter="'+f.sid+'"]');
      garenaLog((id==='sacred_counter'?'⚡ ':'⚔️ ')+dfd.name+' 發動'+(skillDef(dfd.job,id)||{}).name+'，反擊 '+ref+' 傷害!');
      if(f.hp<=0 && !f.ko){ f.ko=true; if(!gaTryRevive(f)){ f.kills=(f.kills||0); garenaLog("💀 "+att.name+" 被反擊擊倒!"); } }
    }
  }
  // ✦ 二轉反應技：各職業的防禦分支在受擊後進行控制、援護或自我恢復。
  if(!tgt.ko){
    for(const id of ['shield_wall','intercept','thunder_prison','ice_armor','smoke_screen','swift_evade','cleanse','regeneration','rally','renewal','healing_wave','holy_link','blessing_light','iron_will','guardian_oath','cold_snap','crystal_barrier','holy_guard','king_banner','fortress','polar_domain','absolute_zero','world_freeze','life_domain','mass_restore','salvation','angel_wing','eternal_prayer','windwalk','resurrection_hymn','last_stand','wind_soul']){
      if(!rollFor(dfd,id)) continue;
      const v=skillVal(dfd,id); let text='';
      if(id==='shield_wall'){ const h=Math.min(Math.max(1,Math.round(dmg*v)),tgt.max-tgt.hp); tgt.hp+=h; if(h){dmgPop(h,'[data-gfighter="'+tgt.sid+'"]','heal');} text='盾牆吸收 '+h; }
      else if(id==='intercept'){ f.tauntBy=tgt.sid; f.tauntT=Math.max(f.tauntT||0,3); text='援護嘲諷'; }
      else if(id==='thunder_prison'){ f.silenceT=Math.max(f.silenceT||0,v); text='法力爆發沉默'; }
      else if(id==='ice_armor'){ f.chillT=Math.max(f.chillT||0,v); text='冰甲冰緩'; }
      else if(id==='smoke_screen'){ f.blindT=Math.max(f.blindT||0,v); text='煙幕致盲'; }
      else if(id==='swift_evade'){ const h=Math.min(Math.max(1,Math.round(dmg*v)),tgt.max-tgt.hp); tgt.hp+=h; if(h){dmgPop(h,'[data-gfighter="'+tgt.sid+'"]','heal');} text='疾閃回復 '+h; }
      else if(id==='cleanse'){ tgt.chillT=0; tgt.frozenT=0; tgt.silenceT=0; text='淨化異常'; }
      else if(id==='regeneration'){ const h=Math.min(v,tgt.max-tgt.hp); tgt.hp+=h; if(h){dmgPop(h,'[data-gfighter="'+tgt.sid+'"]','heal');} text='再生 +'+h; }
      else if(id==='rally'){ f.tauntBy=tgt.sid; f.tauntT=Math.max(f.tauntT||0,v); tgt.bDefT=Math.max(tgt.bDefT||0,v); text='挑戰旗幟吸引攻擊者並獲得防護'; }
      else if(id==='renewal'){ const h=Math.min(v,tgt.max-tgt.hp); tgt.hp+=h; if(h){dmgPop(h,'[data-gfighter="'+tgt.sid+'"]','heal');} text='回春 +'+h; }
      else if(id==='healing_wave'){
        const mates=Object.values(GARENA.fighters).filter(o=>o.team===tgt.team&&!o.ko); let healed=0;
        mates.forEach(o=>{const h=Math.min(v,o.max-o.hp);o.hp+=h;if(h){healed++;dmgPop(h,'[data-gfighter="'+o.sid+'"]','heal');}});
        text='治癒之波回復 '+healed+' 名隊友';
      }
      else if(id==='holy_link'){
        const mates=Object.values(GARENA.fighters).filter(o=>o.team===tgt.team&&!o.ko&&garenaDist(tgt,o)<=2);
        mates.forEach(o=>o.bDefT=Math.max(o.bDefT||0,v)); text='神聖鏈結守護 '+mates.length+' 名附近隊友';
      }
      else if(id==='blessing_light'){
        const mates=Object.values(GARENA.fighters).filter(o=>o.team===tgt.team&&!o.ko);
        mates.forEach(o=>o.bDefT=Math.max(o.bDefT||0,v)); text='祝福之光守護全隊 '+mates.length+' 人';
      }
      else if(id==='iron_will'){ tgt.bDefT=Math.max(tgt.bDefT||0,v); text='鋼鐵意志獲得 '+v+' 拍防護'; }
      else if(id==='guardian_oath'){
        const mates=Object.values(GARENA.fighters).filter(o=>o.team===tgt.team&&!o.ko&&garenaDist(tgt,o)<=2);
        mates.forEach(o=>o.bDefT=Math.max(o.bDefT||0,v)); text='守護誓約守護 '+mates.length+' 人';
      }
      else if(id==='cold_snap'){ f.frozenT=Math.max(f.frozenT||0,v); text='寒霜脈衝凍結攻擊者'; }
      else if(id==='crystal_barrier'){ const h=Math.min(v,tgt.max-tgt.hp); tgt.hp+=h;tgt.bDefT=Math.max(tgt.bDefT||0,3);if(h)dmgPop(h,'[data-gfighter="'+tgt.sid+'"]','heal');text='水晶結界修復 '+h+' HP'; }
      else if(id==='holy_guard'){
        const mates=Object.values(GARENA.fighters).filter(o=>o.team===tgt.team&&!o.ko&&garenaDist(tgt,o)<=2);
        mates.forEach(o=>o.bDefT=Math.max(o.bDefT||0,v)); text='聖盾領域保護 '+mates.length+' 人';
      }
      else if(id==='king_banner'){
        f.tauntBy=tgt.sid; f.tauntT=Math.max(f.tauntT||0,v);
        const mates=Object.values(GARENA.fighters).filter(o=>o.team===tgt.team&&!o.ko&&garenaDist(tgt,o)<=2); mates.forEach(o=>o.bAtkT=Math.max(o.bAtkT||0,v)); gaPlaceLegendField(tgt,'king_banner',v+4); text='王者軍旗鼓舞 '+mates.length+' 人';
      }
      else if(id==='fortress'){ const h=Math.min(v,tgt.max-tgt.hp);tgt.hp+=h;tgt.bDefT=Math.max(tgt.bDefT||0,5);if(h)dmgPop(h,'[data-gfighter="'+tgt.sid+'"]','heal');text='無畏堡壘修復 '+h+' HP'; }
      else if(id==='polar_domain'){
        const zone=Object.values(GARENA.fighters).filter(o=>o.team!==tgt.team&&!o.ko&&garenaDist(tgt,o)<=2);zone.forEach(o=>o.chillT=Math.max(o.chillT||0,v));gaPlaceLegendField(tgt,'polar_domain',v+4);text='極寒領域冰緩 '+zone.length+' 名敵人';
      }
      else if(id==='absolute_zero'){ f.frozenT=Math.max(f.frozenT||0,v);text='絕對零度凍結攻擊者'; }
      else if(id==='world_freeze'){
        const zone=Object.values(GARENA.fighters).filter(o=>o.team!==tgt.team&&!o.ko&&garenaDist(tgt,o)<=2);zone.forEach(o=>o.frozenT=Math.max(o.frozenT||0,v));text='永凍結界凍結 '+zone.length+' 名敵人';
      }
      else if(id==='life_domain'){
        const mates=Object.values(GARENA.fighters).filter(o=>o.team===tgt.team&&!o.ko&&garenaDist(tgt,o)<=2);mates.forEach(o=>{const h=Math.min(v,o.max-o.hp);o.hp+=h;if(h)dmgPop(h,'[data-gfighter="'+o.sid+'"]','heal');});gaPlaceLegendField(tgt,'life_domain',v+4);text='生命領域回復 '+mates.length+' 人';
      }
      else if(id==='mass_restore'){
        const mates=Object.values(GARENA.fighters).filter(o=>o.team===tgt.team&&!o.ko);mates.forEach(o=>{const h=Math.min(v,o.max-o.hp);o.hp+=h;if(h)dmgPop(h,'[data-gfighter="'+o.sid+'"]','heal');});text='聖靈降臨回復全隊';
      }
      else if(id==='salvation'){
        const mates=Object.values(GARENA.fighters).filter(o=>o.team===tgt.team&&!o.ko&&garenaDist(tgt,o)<=2);mates.forEach(o=>o.bDefT=Math.max(o.bDefT||0,v));text='守護救贖保護 '+mates.length+' 人';
      }
      else if(id==='angel_wing'){
        const mates=Object.values(GARENA.fighters).filter(o=>o.team===tgt.team&&!o.ko&&garenaDist(tgt,o)<=2);mates.forEach(o=>{o.chillT=0;o.frozenT=0;o.silenceT=0;o.bAgiT=Math.max(o.bAgiT||0,v);});text='天使之翼淨化並加速 '+mates.length+' 人';
      }
      else if(id==='eternal_prayer'){ const h=Math.min(v,tgt.max-tgt.hp);tgt.hp+=h;tgt.chillT=0;tgt.frozenT=0;tgt.silenceT=0;if(h)dmgPop(h,'[data-gfighter="'+tgt.sid+'"]','heal');text='永恆祈禱回復 '+h+' HP 並淨化'; }
      else if(id==='windwalk'){tgt.bAgiT=Math.max(tgt.bAgiT||0,v);tgt.stealth=Math.max(tgt.stealth||0,1);text='疾風步加速並隱身';}
      else if(id==='resurrection_hymn'){
        const fallen=Object.values(GARENA.fighters).filter(o=>o.team===tgt.team&&o.ko&&!o.revivedOnce&&garenaDist(tgt,o)<=3)[0];
        if(fallen){fallen.ko=false;fallen.revivedOnce=true;fallen.hp=Math.max(1,Math.min(v,fallen.max));fallen.chillT=0;fallen.frozenT=0;fallen.silenceT=0;dmgPop(fallen.hp,'[data-gfighter="'+fallen.sid+'"]','heal');text='救贖復活 '+((stu(fallen.sid)||{}).name||'?');}else text='救贖守候倒下隊友';
      }
      else if(id==='last_stand'){
        const low=tgt.hp/tgt.max<.5; const h=low?Math.min(v,tgt.max-tgt.hp):0; tgt.hp+=h;tgt.bDefT=Math.max(tgt.bDefT||0,low?7:3);if(h)dmgPop(h,'[data-gfighter="'+tgt.sid+'"]','heal');text=low?'最後防線修復 '+h+' HP 並展開堡壘':'最後防線準備就緒';
      }
      else if(id==='wind_soul'){
        const mates=Object.values(GARENA.fighters).filter(o=>o.team===tgt.team&&!o.ko&&garenaDist(tgt,o)<=2);mates.forEach(o=>{o.chillT=0;o.bAgiT=Math.max(o.bAgiT||0,v);});text='風之靈淨化並加速 '+mates.length+' 人';
      }
      advancedCombatFx(dfd,id,'[data-gfighter="'+tgt.sid+'"]');
      garenaLog((skillDef(dfd.job,id)||{}).icon+' '+dfd.name+' 發動【'+(skillDef(dfd.job,id)||{}).name+'】'+text+'!');
    }
  }
  if(!isUlt&&!f.ko)gaTriggerForgeWeaponSkill(f,att,tgt,dmg);
  // ❄️ 冰系/風暴控場:命中後獨立判定,對角色實際生效
  if(!isUlt && on){
    if(att.petId===1 && !tgt.ko && Math.random()*100 < 12){     // 🐉 青龍擺尾:追加60%傷害
      const ex = Math.max(1, Math.round(dmg*0.6));
      tgt.hp = Math.max(0, tgt.hp - ex);
      tgt.tankDmg = (tgt.tankDmg||0) + ex;
      f.dmgDealt += ex;
      comicPop("🐉 青龍擺尾!","boom","#3fae76",'[data-gfighter="'+tgt.sid+'"]');
      dmgPop(ex, '[data-gfighter="'+tgt.sid+'"]', "dmg");
      garenaLog("🐉 "+att.name+" 的青龍追擊 +"+ex+" 傷害!");
      if(tgt.hp<=0 && !tgt.ko){ tgt.ko=true; if(!gaTryRevive(tgt)){ f.kills++; garenaLog("💀 "+dfd.name+" 倒下!"); } }
    }
    if(att.petId===2 && Math.random()*100 < 10){                 // 🐦 朱雀燎原:火焰濺射
      gaSplash(f, att, tgt, dmg, 0.4, false, "🐦");
      comicPop("🐦 朱雀燎原!","boom","#f5731f",'[data-gfighter="'+tgt.sid+'"]');
    }
    if(skillId==="wrath" && !tgt.ko){ tgt.frozenT = Math.max(tgt.frozenT||0, 1); garenaLog("🔨 天罰使 "+dfd.name+" 暈眩!(0.5秒)"); }   // 天罰附帶暈眩
    if(skillId==="meteor"){ gaSplash(f, att, tgt, dmg, 0.5, false, "☄️"); }        // 隕石:周圍1格 50% 爆炸濺射
    if((skillId==="chain" || skillId==="chain_storm") && !tgt.ko){
      gaChainLightning(f,att,tgt,dmg,3,skillId==="chain_storm"?.62:.48);             // ⚡ 主目標外，依序跳三名附近敵人
    }
    // ══ Lv.30 二轉主動招式：每一招有不同戰術結果 ══
    if(skillId==='knight_charge' && !tgt.ko){ f.bDefT=Math.max(f.bDefT||0,4); tgt.tauntBy=f.sid; tgt.tauntT=Math.max(tgt.tauntT||0,3); garenaLog('🐎 守護衝鋒：'+att.name+' 擋到前線並吸引 '+dfd.name+'！'); }
    if(skillId==='lance_combo' && !tgt.ko){ const x=gaExtraStrike(f,tgt,dmg*.34,'lance_combo','騎士重擊'); garenaLog('🔱 騎士重擊追加 '+x+' 傷害！'); }
    if(skillId==='valor_strike'){ const h=Math.min(Math.max(2,Math.round(dmg*.2)),f.max-f.hp); f.hp+=h; if(h)dmgPop(h,'[data-gfighter="'+f.sid+'"]','heal'); garenaLog('💥 英勇斬擊鼓舞自身 +'+h+' HP！'); }
    if(skillId==='radiant_blade'){ gaSplash(f,att,tgt,dmg,.38,false,'✨'); garenaLog('✨ 神聖斬擊的聖光波及周圍敵人！'); }
    if(skillId==='skyward_slash' && !tgt.ko){ const x=gaExtraStrike(f,tgt,dmg*.42,'skyward_slash','王者號令'); tgt.silenceT=Math.max(tgt.silenceT||0,2); garenaLog('⚔️ 王者號令追加 '+x+' 傷害並壓制目標！'); }
    if(skillId==='vanguard'){
      const mates=Object.values(GARENA.fighters).filter(o=>o.team===f.team&&!o.ko&&garenaDist(f,o)<=2);mates.forEach(o=>{o.bAtkT=Math.max(o.bAtkT||0,4);o.bDefT=Math.max(o.bDefT||0,3);});
      garenaLog('🦁 先鋒意志鼓舞 '+mates.length+' 名前線隊友，攻防同步提升！');
    }
    if(skillId==='ember_path' && !tgt.ko){ tgt.poisonT=Math.max(tgt.poisonT||0,4); tgt.poisonDmg=Math.max(tgt.poisonDmg||0,Math.max(2,Math.round(dmg*.14))); garenaLog('🔥 烈焰路徑留下灼燒，'+dfd.name+' 持續受傷！'); }
    if(skillId==='flame_orbit'){ gaSplash(f,att,tgt,dmg,.3,false,'🟠'); garenaLog('🟠 熾焰環繞向周圍爆散！'); }
    if(skillId==='lava_burst'){ gaSplash(f,att,tgt,dmg,.58,false,'🌋'); garenaLog('🌋 熔岩爆發造成高範圍傷害！'); }
    if(skillId==='arcane_surge'){ f.bAtkT=Math.max(f.bAtkT||0,5); garenaLog('🔮 元素共鳴：'+att.name+' 的後續攻擊提升！'); }
    if(skillId==='rift' && !tgt.ko){ tgt.stuckT=Math.max(tgt.stuckT||0,3);gaSplash(f,att,tgt,dmg,.26,false,'🌀');garenaLog('🌀 時空裂縫撕裂地面，目標無法脫身！'); }
    if(skillId==='solar_flare' && !tgt.ko){ const zone=[tgt].concat(Object.values(GARENA.fighters).filter(o=>o.team!==f.team&&!o.ko&&o.sid!==tgt.sid&&garenaDist(tgt,o)<=1));zone.forEach(o=>{o.poisonT=Math.max(o.poisonT||0,4);o.poisonDmg=Math.max(o.poisonDmg||0,Math.max(3,Math.round(dmg*.16)));});gaSplash(f,att,tgt,dmg,.38,false,'☀️');garenaLog('☀️ 熔岩隕落燃燒 '+zone.length+' 名敵人！'); }
    if(skillId==='storm_core' && !tgt.ko){ gaChainLightning(f,att,tgt,dmg,4,.68);garenaLog('🌩️ 雷雲風暴延伸跳躍範圍！'); }
    if(skillId==='ice_comet'){ gaSplash(f,att,tgt,dmg,.5,true,'☄️');garenaLog('☄️ 冰晶彗星爆裂，附近敵人全數冰緩！'); }
    if(skillId==='mana_overflow'){f.bAtkT=Math.max(f.bAtkT||0,6);f.bAgiT=Math.max(f.bAgiT||0,4);gaSplash(f,att,tgt,dmg,.22,false,'💠');garenaLog('💠 元素洪流爆發，'+att.name+' 的施法速度與威力提升！');}
    if(skillId==='pierce_arrow'){ gaSplash(f,att,tgt,dmg,.32,false,'🏹'); garenaLog('🏹 穿透箭貫穿並波及後方敵人！'); }
    if(skillId==='rapid_fire' && !tgt.ko){ const x=gaExtraStrike(f,tgt,dmg*.38,'edge','多重射擊'); garenaLog('🎯 多重射擊追加 '+x+' 傷害！'); }
    if(skillId==='shadow_clone' && !tgt.ko){ const x=gaExtraStrike(f,tgt,dmg*.52,'shadow','影分身');garenaLog('👥 影分身同步追擊 '+x+' 傷害！'); }
    if(skillId==='phantom_combo' && !tgt.ko){ const x=gaExtraStrike(f,tgt,dmg*.25,'shadow','幻影連擊'); const y=gaExtraStrike(f,tgt,dmg*.20,'shadow','幻影連擊');garenaLog('🗡️ 幻影連擊追加 '+(x+y)+' 傷害！'); }
    if(skillId==='death_mark' && !tgt.ko){ tgt.hunterMarkT=Math.max(tgt.hunterMarkT||0,18);tgt.exposed=true;tgt.exposedM=Math.max(tgt.exposedM||0,1.55);garenaLog('💀 死亡印記鎖定 '+dfd.name+'，弱點完全暴露！'); }
    if(skillId==='silent_hunt'){ f.stealth=Math.max(f.stealth||0,3);const h=Math.min(Math.max(2,Math.round(dmg*.12)),f.max-f.hp);f.hp+=h;if(h)dmgPop(h,'[data-gfighter="'+f.sid+'"]','heal');garenaLog('🤫 無聲獵殺後隱入暗影並回復 '+h+' HP！'); }
    if(skillId==='eagle_eye' && !tgt.ko){tgt.exposed=true;tgt.exposedM=Math.max(tgt.exposedM||0,1.5);tgt.hunterMarkT=Math.max(tgt.hunterMarkT||0,14);garenaLog('🦅 鷹眼看穿 '+dfd.name+' 的防線，弱點與印記延長！');}
    if(skillId==='flash_step'){f.bAgiT=Math.max(f.bAgiT||0,5);f.stealth=Math.max(f.stealth||0,1);garenaLog('💫 瞬步突襲後，'+att.name+' 獲得加速並閃入殘影！');}
    if(skillId==='void_trap' && !tgt.ko){gaPlaceGroundTrap(f,att,tgt,'void');}
    if(skillId==='hunter_trap' && !tgt.ko){ gaPlaceGroundTrap(f,att,tgt); }
    if(skillId==='poison_mine' && !tgt.ko){
      const zone=[tgt].concat(Object.values(GARENA.fighters).filter(o=>o.team!==f.team&&!o.ko&&o.sid!==tgt.sid&&garenaDist(tgt,o)<=1));
      const dot=Math.max(2,Math.round(dmg*.18)); zone.forEach(o=>{o.poisonT=Math.max(o.poisonT||0,5);o.poisonDmg=Math.max(o.poisonDmg||0,dot);skillFxPlay('poison','[data-gfighter="'+o.sid+'"]');});
      garenaLog('☠️ 毒霧地雷爆開，'+zone.length+' 名敵人持續中毒！');
    }
    if(skillId==='arrow_rain'){ gaSplash(f,att,tgt,dmg,.48,false,'🌧️'); garenaLog('🌧️ 箭雨覆蓋目標周圍！'); }
    if(skillId==='sacred_bolt' || skillId==='purify_smite'){
      const mates=Object.values(GARENA.fighters).filter(o=>o.team===f.team&&!o.ko).sort((a,b)=>(a.hp/a.max)-(b.hp/b.max));
      const low=mates[0]; if(low){const h=Math.min(Math.max(2,Math.round(dmg*.22)),low.max-low.hp);low.hp+=h;if(h){f.healDone=(f.healDone||0)+h;dmgPop(h,'[data-gfighter="'+low.sid+'"]','heal');}}
      if(skillId==='purify_smite'){ f.chillT=0;f.frozenT=0;f.silenceT=0; }
    }
    if(skillId==='light_spear'){gaSplash(f,att,tgt,dmg,.34,false,'🔆');tgt.exposed=true;tgt.exposedM=Math.max(tgt.exposedM||0,1.25);garenaLog('🔆 光之長槍貫穿敵陣，並讓 '+dfd.name+' 的防線出現裂口！');}
    if(skillId==='divine_sentence' && !tgt.ko){tgt.silenceT=Math.max(tgt.silenceT||0,3);tgt.frozenT=Math.max(tgt.frozenT||0,1);garenaLog('🔨 神罰封鎖 '+dfd.name+' 的技能並短暫凍結！');}
    if(skillId==='holy_comet'){gaSplash(f,att,tgt,dmg,.42,false,'☄️');const low=Object.values(GARENA.fighters).filter(o=>o.team===f.team&&!o.ko).sort((a,b)=>(a.hp/a.max)-(b.hp/b.max))[0];if(low){const h=Math.min(Math.max(3,Math.round(dmg*.16)),low.max-low.hp);low.hp+=h;if(h){f.healDone=(f.healDone||0)+h;dmgPop(h,'[data-gfighter="'+low.sid+'"]','heal');}}garenaLog('☄️ 聖光彗星轟擊敵群並治療最虛弱的隊友！');}
    if(skillId==='renewal' || skillId==='healing_wave'){
      const mates=Object.values(GARENA.fighters).filter(o=>o.team===f.team&&!o.ko&&(skillId==='healing_wave'||garenaDist(f,o)<=2));
      const heal=Math.max(3,Math.round(dmg*(skillId==='healing_wave'?.22:.16)*advancementHealMult(att)));
      mates.forEach(o=>{const h=Math.min(heal,o.max-o.hp);o.hp+=h;if(h){f.healDone=(f.healDone||0)+h;dmgPop(h,'[data-gfighter="'+o.sid+'"]','heal');}});
      garenaLog((skillId==='healing_wave'?'🌊 治癒之波':'🌱 回春術')+' 回復 '+mates.length+' 名隊友！');
    }
    if(skillId==='holy_link' || skillId==='blessing_light'){
      Object.values(GARENA.fighters).filter(o=>o.team===f.team&&!o.ko&&(skillId==='blessing_light'||garenaDist(f,o)<=2)).forEach(o=>o.bDefT=Math.max(o.bDefT||0,skillId==='holy_link'?5:7));
      garenaLog((skillId==='holy_link'?'🔗 神聖鏈結':'💫 祝福之光')+' 為隊友展開防護！');
    }
    if(roll("blizzard")){ gaSplash(f, att, tgt, dmg, 0.5, true, "🌨"); comicPop("暴風雪!","boom","#7ad0e8",'[data-gfighter="'+tgt.sid+'"]'); }   // 暴風雪:周圍濺射+冰緩
    if(roll("poison") && !tgt.ko && (tgt.poisonT||0)<=0){    // 🐍 毒刃:掛毒 2 秒,每拍扣血
      tgt.poisonT = 4; tgt.poisonDmg = Math.max(2, Math.round(skillVal(att,"poison")*0.6));
      tag += "🐍"; garenaLog("🐍 "+dfd.name+" 中毒!(每 0.5 秒 -"+tgt.poisonDmg+")");
    }
    if(roll("frost") && !tgt.ko){
      tgt.chillT = 4; tag += "❄️";
      skillFxPlay("frost", '[data-gfighter="'+tgt.sid+'"]');
      comicPop("冰箭!","spike","#7ad0e8",'[data-gfighter="'+tgt.sid+'"]');
      garenaLog("❄️ "+dfd.name+" 被冰箭冰緩,行動變慢(2秒)");
    }
    if(roll("freeze") && !tgt.ko && (tgt.frozenT||0)<=0){
      tgt.frozenT = 3; tag += "🧊";
      skillFxPlay("freeze", '[data-gfighter="'+tgt.sid+'"]');
      comicPop("凍結!","boom","#3a9fe0",'[data-gfighter="'+tgt.sid+'"]');
      garenaLog("🧊 "+dfd.name+" 被凍結,無法行動(1.5秒)");
    }
    if(roll("storm") && !tgt.ko){
      tgt.exposed = true; tgt.exposedM = 1.3;
      skillFxPlay("storm", '[data-gfighter="'+tgt.sid+'"]');
      comicPop("風暴標記!","boom","#8e44c4",'[data-gfighter="'+tgt.sid+'"]');
      garenaLog("🌪 "+att.name+" 標記 "+dfd.name+" 的破綻(下一擊+30%)");
    }
    if(roll("expose") && !tgt.ko){ tgt.exposed = true; tgt.exposedM = 1.4; garenaLog("🎯 "+att.name+" 看破 "+dfd.name+" 的破綻!(下一擊+40%)"); }
    if(roll("pocket") && !tgt.ko && (tgt.blindT||0)<=0){       // 💨 煙霧彈:致盲2秒,攻擊55%落空
      tgt.blindT = 4;
      comicPop("💨 煙霧彈!","cloud","#9aa0a8",'[data-gfighter="'+tgt.sid+'"]');
      garenaLog("💨 "+att.name+" 丟出煙霧彈,"+dfd.name+" 被致盲!(2秒內攻擊常落空)");
    }
    if(roll("greed")){                                          // 🕳 重力井:目標+周圍1格全體中毒
      const pv = Math.max(2, Math.round(skillVal(att,"greed")));
      const zone = [tgt].concat(Object.values(GARENA.fighters).filter(o=>o.team!==f.team && !o.ko && o.sid!==tgt.sid && garenaDist(tgt,o)<=1));
      zone.forEach(o=>{ if(!o.ko){ o.poisonT = Math.max(o.poisonT||0, 4); o.poisonDmg = Math.max(o.poisonDmg||0, pv); } });
      comicPop("🕳 重力井!","boom","#8e44c4",'[data-gfighter="'+tgt.sid+'"]');
      garenaLog("🕳 "+att.name+" 佈下重力井,"+zone.length+" 名敵人陷入毒沼!(每 0.5 秒 -"+pv+")");
    }
    if(roll("treasure") && !tgt.ko && (tgt.silenceT||0)<=0){    // 🈲 禁咒符:沉默3秒
      tgt.silenceT = 6;
      comicPop("🈲 禁咒符!","boom","#c0392b",'[data-gfighter="'+tgt.sid+'"]');
      garenaLog("🈲 "+att.name+" 貼上禁咒符,"+dfd.name+" 被沉默!(3秒無法使用技能)");
    }
    if(skillId==='hunter_mark' && !tgt.ko){
      tgt.hunterMarkT=Math.max(tgt.hunterMarkT||0,12);
      comicPop('獵人印記!','boom','#a98cff','[data-gfighter="'+tgt.sid+'"]');
      garenaLog('👁️ '+att.name+' 鎖定 '+dfd.name+'，萬箭穿心可追擊此目標！');
    }
    // 每次攻擊至多召喚一隻；已在場時會刷新同類召喚物，不會越堆越多。
    for(const id of Object.keys(ADVANCE_SUMMON_RULES)){
      if(roll(id)){ gaSummonUnit(f,att,id); break; }
    }
  }
  /* 牧師的淨化克制必須在法師的冰緩／凍結／沉默都結算後判定，才能真正解除本次命中的控制。 */
  if(!tgt.ko) gaTryHolyResolve(att,dfd,tgt,skillId);
  // 👑 三轉終極：團戰局勢符合時自動發動，並以長冷卻限制頻率。
  if(advUlt){
    const all=Object.values(GARENA.fighters), allies=all.filter(o=>o.team===f.team), enemies=all.filter(o=>o.team!==f.team&&!o.ko);
    advanceUltimateFx(att,advUlt,'[data-gfighter="'+tgt.sid+'"]');
    if(att.job==='Warrior'){
      allies.filter(o=>!o.ko&&garenaDist(f,o)<=3).forEach(o=>{ o.bDefT=Math.max(o.bDefT||0,10); o.chillT=0; o.frozenT=0; o.silenceT=0; skillFxPlay('heaven_guard','[data-gfighter="'+o.sid+'"]'); });
      gaPlaceLegendField(f,'sky_guard',10);
      garenaLog('🌤️ 天穹守護：全隊淨化、強力減傷，並展開持續守護的天空領域！');
    }else if(att.job==='Mage'){
      const zone=enemies.filter(o=>garenaDist(tgt,o)<=2);
      zone.forEach(o=>{ const ex=Math.max(2,Math.round(dmg*.72)); o.hp=Math.max(0,o.hp-ex); o.chillT=Math.max(o.chillT||0,3); o.silenceT=Math.max(o.silenceT||0,2); dmgPop(ex,'[data-gfighter="'+o.sid+'"]'); gaHurt(o.sid,0); if(o.hp<=0&&!o.ko){o.ko=true; if(!gaTryRevive(o)) f.kills++;} });
      gaPlaceLegendField(tgt,'elemental_ruin',8);
      garenaLog('☄️ 元素末日席捲 '+zone.length+' 名敵人：爆燃、冰緩、沉默，並留下元素災變領域！');
    }else if(att.job==='Rogue'){
      const zone=enemies.filter(o=>(o.hunterMarkT||0)>0&&garenaDist(tgt,o)<=4);
      (zone.length?zone:[tgt]).forEach(o=>{ const ex=Math.max(2,Math.round(dmg*.8)); o.hp=Math.max(0,o.hp-ex); o.hunterMarkT=0; dmgPop(ex,'[data-gfighter="'+o.sid+'"]'); gaHurt(o.sid,0); if(o.hp<=0&&!o.ko){o.ko=true; if(!gaTryRevive(o)) f.kills++;} });
      gaPlaceLegendField(tgt,'arrow_barrage',7);
      garenaLog('🏹 萬箭穿心連射 '+(zone.length||1)+' 個標記目標，並以箭雨封鎖敵方陣形！');
    }else if(att.job==='Cleric'){
      let revived=0;
      allies.filter(o=>o.ko&&!o.revivedOnce&&garenaDist(f,o)<=3).forEach(o=>{ o.ko=false; o.revivedOnce=true; o.hp=Math.max(1,Math.round(o.max*.28)); o.chillT=0; o.frozenT=0; o.silenceT=0; revived++; f.healDone=(f.healDone||0)+o.hp; dmgPop(o.hp,'[data-gfighter="'+o.sid+'"]','heal'); });
      const heal=Math.max(8,Math.round((12+skillLv(att,'miracle_sanctum')*4)*advancementHealMult(att)*gaHealFactor()));
      allies.filter(o=>!o.ko&&garenaDist(f,o)<=3).forEach(o=>{ const got=Math.min(heal,o.max-o.hp); o.hp+=got; o.bDefT=Math.max(o.bDefT||0,8); if(got){f.healDone=(f.healDone||0)+got;dmgPop(got,'[data-gfighter="'+o.sid+'"]','heal');} });
      gaPlaceLegendField(f,'miracle_field',10);
      garenaLog('🌟 奇蹟聖域：復活 '+revived+' 人、全隊大量治療、護盾，並留下神蹟聖域！');
    }
  }
  /* 同職業的三條三轉終極，都在共通終極效果外再附加自己的戰場規則。 */
  if(advUlt){
    const _legendAll=Object.values(GARENA.fighters), allies=_legendAll.filter(o=>o.team===f.team), enemies=_legendAll.filter(o=>o.team!==f.team&&!o.ko);
    if(advUlt.id==='skyward_slash'){
    enemies.filter(o=>garenaDist(tgt,o)<=2).forEach(o=>o.silenceT=Math.max(o.silenceT||0,2));
    allies.filter(o=>!o.ko&&garenaDist(f,o)<=3).forEach(o=>o.bAtkT=Math.max(o.bAtkT||0,6)); gaPlaceLegendField(f,'king_banner',8); garenaLog('⚔️ 王者號令追加：軍旗鼓舞範圍隊友、壓制敵方施法！');
  }else if(advUlt && advUlt.id==='sacred_counter'){
    allies.filter(o=>!o.ko&&garenaDist(f,o)<=3).forEach(o=>o.bDefT=Math.max(o.bDefT||0,8)); enemies.filter(o=>garenaDist(f,o)<=2).forEach(o=>{o.tauntBy=f.sid;o.tauntT=Math.max(o.tauntT||0,4);}); gaPlaceLegendField(f,'sky_guard',8); garenaLog('⚡ 神聖反擊追加：反擊堡壘保護範圍隊友並拉住附近敵人！');
  }else if(advUlt && advUlt.id==='mana_overflow'){
    allies.filter(o=>!o.ko&&garenaDist(f,o)<=3).forEach(o=>{o.bAtkT=Math.max(o.bAtkT||0,7);o.bAgiT=Math.max(o.bAgiT||0,6);}); enemies.filter(o=>garenaDist(tgt,o)<=2).forEach(o=>o.silenceT=Math.max(o.silenceT||0,2)); gaPlaceLegendField(f,'king_banner',7); garenaLog('💠 元素洪流追加：範圍隊友加速增傷，雷雲壓制敵方技能！');
  }else if(advUlt && advUlt.id==='world_freeze'){
    enemies.filter(o=>garenaDist(tgt,o)<=2).forEach(o=>{o.frozenT=Math.max(o.frozenT||0,3);o.chillT=Math.max(o.chillT||0,6);skillFxPlay('blizzard','[data-gfighter="'+o.sid+'"]');}); gaPlaceLegendField(tgt,'polar_domain',9); garenaLog('🌨️ 永凍結界追加：大範圍凍結並留下極寒領域！');
  }else if(advUlt && advUlt.id==='death_mark'){
    enemies.filter(o=>garenaDist(tgt,o)<=3).forEach(o=>{o.hunterMarkT=Math.max(o.hunterMarkT||0,10);o.exposed=true;o.exposedM=Math.max(o.exposedM||0,1.45);}); gaPlaceLegendField(tgt,'arrow_barrage',7); garenaLog('💀 死亡印記追加：範圍敵人弱點暴露，獵殺者可集火收割！');
  }else if(advUlt && advUlt.id==='silent_hunt'){
    allies.filter(o=>!o.ko&&garenaDist(f,o)<=3).forEach(o=>{o.stealth=Math.max(o.stealth||0,2);o.bAgiT=Math.max(o.bAgiT||0,5);}); gaPlaceGroundTrap(f,att,tgt,'void'); garenaLog('🤫 無聲獵殺追加：範圍隊友踏入暗影，並在敵陣投下虛空陷阱！');
  }else if(advUlt && advUlt.id==='resurrection_hymn'){
    const fallen=allies.filter(o=>o.ko&&!o.revivedOnce&&garenaDist(f,o)<=3); fallen.slice(0,2).forEach(o=>{o.ko=false;o.revivedOnce=true;o.hp=Math.max(1,Math.round(o.max*.32));f.healDone=(f.healDone||0)+o.hp;dmgPop(o.hp,'[data-gfighter="'+o.sid+'"]','heal');}); gaPlaceLegendField(f,'miracle_field',8); garenaLog('🎵 救贖聖歌追加：喚回範圍內最多兩名倒下隊友，聖歌持續守護陣地！');
  }else if(advUlt && advUlt.id==='eternal_prayer'){
    allies.filter(o=>!o.ko&&garenaDist(f,o)<=3).forEach(o=>{const h=Math.min(9,o.max-o.hp);o.hp+=h;o.chillT=0;o.frozenT=0;o.silenceT=0;if(h){f.healDone=(f.healDone||0)+h;dmgPop(h,'[data-gfighter="'+o.sid+'"]','heal');}}); gaPlaceLegendField(f,'life_domain',9); garenaLog('🙏 永恆祈禱追加：範圍隊友淨化、回復，並留下不滅生命領域！');
  }
  }
  f.cd = gaAtkCd(att) * advancementTempoMult(att) * (f.chillT>0 ? 1.5 : 1) * ((f.bAgiT||0)>0 ? 0.85 : 1);   // 敏捷影響攻速;冰緩更慢;疾風令更快
  if(advancementBonus(att,'tempo')>0) advancementFx(att,'tempo','[data-gfighter="'+f.sid+'"]');
  // 💚 支援技能:攻擊動作後獨立觸發(治療/群療/光環)
  if(on && !f.ko){
    const mates = Object.values(GARENA.fighters).filter(o=>o.team===f.team && !o.ko);
    if(roll("heal")){                                        // 小治療:治療己隊血量比例最低者
      const low = mates.slice().sort((a,b)=>(a.hp/a.max)-(b.hp/b.max))[0];
      if(low && low.hp<low.max && gaHealFactor()>0){
        const v = Math.max(1, Math.round(Math.min(skillVal(att,"heal"), low.max - low.hp) * gaHealFactor() * advancementHealMult(att) * ((f.healCutT||0)>0?.55:1))); low.hp = Math.min(low.max, low.hp + v);
        if(advancementBonus(att,'heal')>0) advancementFx(att,'heal','[data-gfighter="'+low.sid+'"]');
        f.healDone = (f.healDone||0) + v;
        dmgPop(v, '[data-gfighter="'+low.sid+'"]', "heal");
        garenaLog("💚 "+att.name+" 治療了 "+(stu(low.sid)||{}).name+" +"+v);
      }
    }
    if(roll("groupheal")){                                   // 群療:全隊回血
      const v = Math.round(skillVal(att,"groupheal") * gaHealFactor() * advancementHealMult(att) * ((f.healCutT||0)>0?.55:1));
      if(v>0) mates.forEach(o=>{ if(o.hp<o.max){ const got=Math.min(o.max-o.hp,v); o.hp+=got; f.healDone=(f.healDone||0)+got; dmgPop(got,'[data-gfighter="'+o.sid+'"]',"heal"); } });
      garenaLog("🌿 "+att.name+" 群體治療全隊 +"+v);
    }
    for(const [aid,anm] of [["vigor","鼓舞"],["faith","聖歌"]]){        // 回血光環
      if(roll(aid)){
        const v = Math.round((skillVal(att,aid)||10) * gaHealFactor() * advancementHealMult(att) * ((f.healCutT||0)>0?.55:1));
        if(v<=0) continue;
        const near = mates.filter(o=>garenaDist(f,o)<=2);
        near.forEach(o=>{ if(o.hp<o.max){ const got=Math.min(o.max-o.hp,v); o.hp+=got; f.healDone=(f.healDone||0)+got; dmgPop(got,'[data-gfighter="'+o.sid+'"]',"heal"); } });
        garenaLog("💪 "+att.name+" 發動【"+anm+"】,周圍隊友 +"+v);
      }
    }
    for(const [aid,anm,fld] of [["slash","戰吼","bAtkT"],["firebolt","魔力共鳴","bAtkT"],["harden","守護號令","bDefT"],["agi","疾風令","bAgiT"]]){   // 屬性光環:2格內隊友(含自己)獲增益6拍
      if(roll(aid)){
        const near = mates.filter(o=>garenaDist(f,o)<=2);
        near.forEach(o=>{ o[fld] = 6; });
        garenaLog("📣 "+att.name+" 發動【"+anm+"】,周圍 "+near.length+" 名隊友獲得增益(3秒)");
        comicPop(anm+"!","cloud","#f5a623",'[data-gfighter="'+f.sid+'"]');
      }
    }
  }
  f.dmgDealt += dmg;                                         // 合作紀錄：累計前線輸出
  const suppress=warriorSuppressionProfile(att,dfd,skillId);
  if(suppress.active && !tgt.ko){
    tgt.healCutT=Math.max(tgt.healCutT||0,suppress.turns);
    tgt.bDefT=Math.max(0,(tgt.bDefT||0)-suppress.strip);
    counterSkillFx('warrior','[data-gfighter="'+tgt.sid+'"]');
    comicPop(suppress.tier>=3?'神聖防線崩解!':'治療壓制!','spike','#ff775f','[data-gfighter="'+tgt.sid+'"]');
    garenaLog('⚔️ '+att.name+' 的'+((skillDef(att.job,skillId)||{}).name||'壓制技')+'破壞 '+dfd.name+' 的守護，治療降低 '+(suppress.turns*.5).toFixed(1)+' 秒！');
  }
  if(isUlt) f.ultCount++;
  if(tgt.hp<=0 && !tgt.ko){ tgt.ko = true; if(!gaTryRevive(tgt)){ f.kills++; garenaLog("💀 "+dfd.name+" 倒下!"); } }
  if(!isUlt&&!magicSpell) gaLegendWeaponFollowThrough(f,att,tgt,dmg);
  // ⚔️🏹 武器攻擊動畫:近戰揮擊、遠程發射投射物;受擊反饋配合彈道時機
  const weaponPattern=legendWeaponPattern(att);
  if(weaponPattern==="line2"){
    gaLegendWeaponFx("line2",f.sid,tgt.sid);gaSwing(f.sid);gaHurt(tgt.sid,120);
  } else if(weaponPattern==="sweep"){
    gaLegendWeaponFx("sweep",f.sid,tgt.sid);gaSwing(f.sid);gaHurt(tgt.sid,80);
  } else if(weaponPattern==="longbow4"){
    gaLegendWeaponFx("longbow4",f.sid,tgt.sid);gaSwing(f.sid);gaHurt(tgt.sid,220);
  } else if(weaponPattern==="combo"){
    gaSwing(f.sid);gaHurt(tgt.sid,60);
  } else if(weaponRange(att) >= 2){
    const proj = att.job==="Mage" ? "🔮" : (att.job==="Cleric" ? "✨" : "arrow");
    gaProjectile(f.sid, tgt.sid, proj);
    gaSwing(f.sid);                                          // 遠程也帶出手動作
    gaHurt(tgt.sid, 220);                                    // 💢 彈道到達時閃白抖動
  } else {
    gaSwing(f.sid);                                          // 近戰揮砍
    gaHurt(tgt.sid, 60);                                     // 💢 揮中瞬間
  }
  if(skillId && skillId!=="__ult"){
    if(SKILL_POP[skillId]){                                                        // 一轉與戰士專屬技能
      const sp = SKILL_POP[skillId];
      comicPop(sp[0], sp[1], sp[2], '[data-gfighter="'+tgt.sid+'"]');
      skillFxPlay(skillId, '[data-gfighter="'+tgt.sid+'"]');
    }else advancedCombatFx(att,skillId,'[data-gfighter="'+tgt.sid+'"]');         // 其餘轉職技能依職業分支播放特效
  }
  garenaLog((isUlt?"💫 ":"")+att.name+" 對 "+dfd.name+" 使用【"+(skillName||"普通攻擊")+"】造成傷害 "+dmg+(tag?"("+tag+")":""));
  garenaFx(f.sid, "atk", tgt.sid, dmg, isUlt, att.job, tgt, skillId, critical.crit);
  return true;
}

function garenaFx(sid, kind, tgtSid, dmg, isUlt, job, tgt, skillId, didCrit){
  const cell = document.querySelector('[data-gfighter="'+sid+'"]');
  const tcell = tgtSid && document.querySelector('[data-gfighter="'+tgtSid+'"]');
  if(kind==="atk" && tcell){
    // 攻擊者朝目標撲擊(依相對方向選動畫)
    const f = GARENA.fighters[sid];
    if(f && tgt){
      const dx = tgt.x - f.x, dy = tgt.y - f.y;
      let cls = "ga-atk-r", face = "right";
      if(Math.abs(dx) >= Math.abs(dy)){ cls = dx>=0 ? "ga-atk-r" : "ga-atk-l"; face = dx>=0 ? "right" : "left"; }
      else { cls = dy>=0 ? "ga-atk-d" : "ga-atk-u"; face = dy>=0 ? "down" : "up"; }
      gaSetFacing(f, face);
      if(cell){ cell.classList.add(cls); setTimeout(()=>cell.classList.remove(cls), 420); }
    }
    // 大招:發動者頭上跳出小徽章(取代全屏橫幅)
    if(isUlt && cell){
      const u = ULT_DEFS[job] || { name:"全力一擊" };   // 🔄 新職業預設
      const r = cell.getBoundingClientRect();
      const tag = document.createElement("div");
      tag.className = "ga-ult-tag";
      tag.style.left = (r.left + r.width/2) + "px";
      tag.style.top = (r.top) + "px";
      tag.style.color = "#141414";
      tag.style.borderColor = u ? u.color : "#141414";
      tag.textContent = (u ? u.emoji+" "+u.name : "大招");
      document.body.appendChild(tag);
      setTimeout(()=>tag.remove(), 1100);
    }
    dmgPop(dmg, '[data-gfighter="'+tgtSid+'"]', didCrit?"crit":"dmg", {maxHp:tgt?tgt.max:0});
    tcell.classList.add("ar-hurt"); setTimeout(()=>tcell.classList.remove("ar-hurt"), 420);
  }
  if(kind==="miss" && cell){ comicPop("範圍內沒有敵人!","cloud","#888", '[data-gfighter="'+sid+'"]'); }
}

function garenaEnd(winTeam, byTime){
  GARENA.over = true;
  (GARENA._entranceTimers||[]).forEach(clearTimeout); GARENA._entranceTimers=[];
  _cpQueue.length = 0;                                       // 🧹 清空積壓的技能彈框佇列(戰後不再跳)
  document.querySelectorAll(".comic-pop, .ga-proj").forEach(e=>e.remove());
  if(GARENA.rec){                                            // 📼 收尾:結果+最終幀,入庫(上限 6 場)
    gaRecFrame();
    GARENA.rec.result = { win: winTeam, byTime: !!byTime };
    state.battleReplays = state.battleReplays || [];
    state.battleReplays.unshift(GARENA.rec);
    if(state.battleReplays.length > 6) state.battleReplays.length = 6;
    GARENA.rec = null;
  }
  GARENA.winTeam = winTeam;                                  // 記錄給學生端顯示
  if(GARENA.timer){ clearInterval(GARENA.timer); GARENA.timer=null; }
  const fs = Object.values(GARENA.fighters);
  const knowledgeResult=gaIsKnowledgeMoba(),knowledgeScore=GARENA.mobaKnowledgeScore||{red:0,blue:0};
  if(winTeam==="draw"){                                      // 平手:全員參與獎
    fs.forEach(f=>{ const st=stu(f.sid); if(st){ grantXp(st,15); addLog(st.id,knowledgeResult?"📚 知識攻塔答題平手(+15 XP)":"⚔️ 團體戰平手(+15 XP)"); } });
    if(GARENA.siegeTournament && GARENA.siegeTeams){         // 🏆 循環賽平手記分
      tourRecord(GARENA.siegeTeams.red, GARENA.siegeTeams.blue, "draw");
      GARENA.siege = false; GARENA.siegeTeams = null; GARENA.siegeTournament = false;
    }
    save();
    garenaLog(knowledgeResult?"📚 答題分 "+knowledgeScore.red+"："+knowledgeScore.blue+"，雙方平手！全員 +15 XP":"🤝 時間到,雙方平手!全員 +15 XP");
    const bnd = document.getElementById("gaWinner");
    if(bnd){ bnd.style.display=""; bnd.innerHTML=knowledgeResult?"📚 答題平手 "+knowledgeScore.red+"："+knowledgeScore.blue:"🤝 平手!"; }
    garenaComputeMvp();garenaPushLive(true);render();sfx("levelup"); return;
  }
  const winners = fs.filter(f=>f.team===winTeam), losers = fs.filter(f=>f.team!==winTeam);
  if(GARENA.siege){                                          // 🏰 公會戰加碼
    winners.forEach(f=>{ const st=stu(f.sid); if(st){ grantXp(st,30); const g=creditGold(st,30,"公會戰獲勝",true); addLog(st.id,"🏰 公會戰獲勝!(+30 XP +"+g+" 金)"); } });
    losers.forEach(f=>{ const st=stu(f.sid); if(st){ grantXp(st,15); addLog(st.id,"🏰 公會戰參戰(+15 XP)"); } });
    // 🎫 攻城卷已於「報名時」消耗；單場與循環賽結算都不再檢查或重複扣除。
    if(GARENA.siegeTournament && GARENA.siegeTeams){         // 🏆 循環賽場次:記分不佔城
      tourRecord(GARENA.siegeTeams.red, GARENA.siegeTeams.blue, winTeam);
      GARENA.siegeTeams = null; GARENA.siegeTournament = false;
    }
    const winGroup = GARENA.siegeTeams ? GARENA.siegeTeams[winTeam] : null;
    if(winGroup){                                            // 👑 佔領榮耀之城
      const prev = state.castle.owner;
      state.castle.owner = winGroup;
      state.castle.since = new Date().toLocaleDateString("sv");
      addLog("-", "👑 "+winGroup+" 組"+(prev===winGroup?"守住了":(prev?"從 "+prev+" 組手中奪下了":"佔領了")+"")+"榮耀之城!");
      setTimeout(()=>{ levelUpFx("👑 "+winGroup+" 組佔領榮耀之城!"); sfx("goal"); }, 2400);
    }
    GARENA.siege = false; GARENA.siegeTeams = null;
  }
  if(GARENA.peak){                                           // 🌏 巔峰之城結算
    GARENA.peak = false;
    const grp = GARENA.peakGroup; GARENA.peakGroup = null;
    const peakExpected = GARENA.peakExpected || null; GARENA.peakExpected = null;
    const won = winTeam === "red";                           // 攻方固定紅隊
    PEAK.cleanupTemp();
    if(won && grp){
      const prevName = (state.worldPeak.owner||{}).className || "守軍";
      const owner = { cid: CLOUD.on() ? CLOUD.cid : "", className: state.className || state.lbName || "我的班級",
        group: grp, leaderName: maskName((stu(state.groupLeaders[grp])||{}).name || ""),
        memberNames: state.students.filter(x=>x.group===grp).map(x=>maskName(x.name)).slice(0,8) };   // 🔒 跨班公開:遮罩名
      // 戰鬥開始時的霸主資料必須仍相同才可寫入，避免不同班同時攻城互相覆寫。
      (async()=>{
        const result = await PEAK.claim({ owner, since: new Date().toLocaleDateString("sv"), defenders: PEAK.snapshotGroup(grp) }, peakExpected);
        if(!result.ok){
          addLog("-", "🌏 "+grp+" 組雖贏得攻防戰，但王座已被其他班級先一步改寫；本次不發放佔領獎勵。");
          toast("巔峰之城已被其他班級先佔領，本次攻城結果不覆寫現任霸主。", true);
          save(); render(); return;
        }
        state.students.filter(x=>x.group===grp).forEach(m=>{ grantXp(m, 50); creditGold(m,100,"巔峰之城佔領",true); });
        addLog("-", "🌏 "+grp+" 組擊敗「"+prevName+"」征服巔峰之城,成為世界霸主!全組 +50 XP +100 金");
        setTimeout(()=>{ levelUpFx("🌏 "+grp+" 組稱霸世界!"); sfx("goal"); }, 2400);
        save(); render();
      })();
    }else if(grp){
      addLog("-", "🌏 "+grp+" 組挑戰巔峰之城失敗,守軍守住了王座。累積實力再來!");
    }
    save();
  }else{
    winners.forEach(f=>{ const st=stu(f.sid); if(st){ grantXp(st,20); addLog(st.id,knowledgeResult?"📚 知識攻塔答題獲勝(+20 XP)":"⚔️ 團體戰獲勝(+20 XP)"); } });
    losers.forEach(f=>{ const st=stu(f.sid); if(st){ grantXp(st,10); addLog(st.id,knowledgeResult?"📚 知識攻塔參與(+10 XP)":"⚔️ 團體戰參戰(+10 XP)"); } });
  }
  save();
  garenaLog(knowledgeResult?("📚 "+(winTeam==="red"?"紅隊":"藍隊")+"以答題分 "+knowledgeScore.red+"："+knowledgeScore.blue+" 獲勝！擊倒與傷害不列入計分"):("🏆 "+(winTeam==="red"?"紅隊":"藍隊")+"獲勝!"+(byTime?"(時間到判定)":"")+" 勝+20XP/敗+10XP"));
  const bn = document.getElementById("gaWinner");
  if(bn){ bn.style.display=""; bn.innerHTML=knowledgeResult?("📚 "+(winTeam==="red"?"🔴 紅隊":"🔵 藍隊")+"完成答題目標 "+knowledgeScore.red+"："+knowledgeScore.blue):("🏆 "+(winTeam==="red"?"🔴 紅隊":"🔵 藍隊")+"完成團隊目標"); }
  garenaComputeMvp();
  garenaPushLive(true);                                      // 學生端看到結束狀態(強制)
  render();                                                  // 重繪以顯示團隊合作結算
  sfx("levelup");
}

function garenaComputeMvp(){
  const fs = Object.values(GARENA.fighters);
  if(gaIsKnowledgeMoba()){
    const ranking=fs.map(f=>({sid:f.sid,team:f.team,correct:f.quizCorrect||0,points:f.quizPoints||0})).sort((a,b)=>b.points-a.points||b.correct-a.correct);
    GARENA.mvp={knowledge:true,topQuiz:ranking[0]&&ranking[0].correct>0?ranking[0]:null,ranking,score:Object.assign({red:0,blue:0},GARENA.mobaKnowledgeScore||{}),best:Object.assign({red:0,blue:0},GARENA.mobaKnowledgeBestStreak||{})};return;
  }
  const byDmg = [...fs].sort((a,b)=>b.dmgDealt-a.dmgDealt);
  const byKill = [...fs].sort((a,b)=>b.kills-a.kills || b.dmgDealt-a.dmgDealt);
  const byHeal = fs.slice().sort((x,y)=>(y.healDone||0)-(x.healDone||0));
  const byTank = fs.slice().sort((x,y)=>(y.tankDmg||0)-(x.tankDmg||0));
  GARENA.mvp = {
    topDmg: byDmg[0] && byDmg[0].dmgDealt>0 ? byDmg[0] : null,
    topKill: byKill[0] && byKill[0].kills>0 ? byKill[0] : null,
    topHeal: byHeal[0] && (byHeal[0].healDone||0)>0 ? byHeal[0] : null,
    topTank: byTank[0] && (byTank[0].tankDmg||0)>0 ? byTank[0] : null,
    survivors: fs.filter(f=>!f.ko).map(f=>f.sid),
    ranking: byDmg.map(f=>({sid:f.sid, team:f.team, dmg:f.dmgDealt, kills:f.kills, heal:f.healDone||0, tank:f.tankDmg||0, ko:f.ko}))
  };
}

function garenaMvpHtml(){
  const m = GARENA.mvp; if(!m) return "";
  const nm = sid=>{ const st=stu(sid); return st?esc(st.name):"?"; };
  const teamDot = t=> t==="red"?"🔴":"🔵";
  const popup=body=>'<div class="ga-result-overlay" id="gaResultOverlay" role="dialog" aria-modal="true" aria-label="戰後統計"><div class="ga-result-modal"><button class="btn ga-result-close" id="gaResultClose">✕ 關閉統計</button>'+body+'</div></div>';
  if(m.knowledge){
    const sum=team=>m.ranking.filter(r=>r.team===team).reduce((a,r)=>({correct:a.correct+r.correct,points:a.points+r.points,people:a.people+1}),{correct:0,points:0,people:0});
    const red=sum("red"),blue=sum("blue");
    return popup('<div class="panel"><h3 style="justify-content:center">📚 知識攻塔・團隊結算</h3><div style="font-size:26px;font-weight:1000;text-align:center;margin:8px">🔴 '+m.score.red+'　：　'+m.score.blue+' 🔵</div><div class="mini" style="text-align:center;margin-bottom:12px">只計答對得分；戰鬥傷害與角色休整不列入分數，也不公布個人落後排名。</div><div class="rank-grid"><div class="class-stage-card open"><b>🔴 紅隊共同成果</b><div class="mini">答對 '+red.correct+' 題・貢獻 '+red.points+' 分・最佳 Combo ×'+m.best.red+'</div></div><div class="class-stage-card open"><b>🔵 藍隊共同成果</b><div class="mini">答對 '+blue.correct+' 題・貢獻 '+blue.points+' 分・最佳 Combo ×'+m.best.blue+'</div></div></div></div>');
  }
  const card = (icon,title,f,detail)=> f ?
    '<div style="flex:1;min-width:130px;background:#fff;border:3px solid #141414;border-radius:10px;box-shadow:3px 3px 0 rgba(0,0,0,.7);padding:10px;text-align:center">'
    + '<div style="font-size:28px">'+icon+'</div><div class="mini" style="font-weight:900">'+title+'</div>'
    + '<div style="font-weight:900;font-size:15px;margin:2px 0">'+teamDot(f.team)+' '+nm(f.sid)+'</div>'
    + '<div class="mini num">'+detail+'</div></div>' : "";
  const participants=m.ranking.length,survivors=(m.survivors||[]).length;
  return popup('<div class="panel"><h3 style="justify-content:center">🤝 戰後合作紀錄</h3><div class="mini" style="text-align:center;margin-bottom:10px">不顯示死亡數、擊退數或個人落後排名；只呈現可學習的團隊貢獻。</div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:12px">'
    + card("⚔️","前線協作",m.topDmg, m.topDmg?m.topDmg.dmgDealt+" 團隊輸出":"")
    + card("💚","回復支援",m.topHeal, m.topHeal?(m.topHeal.healDone||0)+" 回復":"")
    + card("🛡","守護隊友",m.topTank, m.topTank?(m.topTank.tankDmg||0)+" 保護":"")
    + '</div>'
    + '<div class="goal-bar"><i style="width:'+(participants?Math.round(survivors/participants*100):0)+'%"></i><span>全場 '+participants+' 人共同參與・'+survivors+' 人堅持到結束</span></div></div>');
}

function garenaPushLive(force){
  if(!CLOUD.on()) return;
  const fs = Object.values(GARENA.fighters).map(f=>{const jc=fighterCooldownInfo(f,'job');return {sid:f.sid,x:f.x,y:f.y,team:f.team,hp:f.hp,max:f.max,ko:f.ko,respawnT:f.respawnT||0,ultUsed:f.ultUsed,cd:f.cd,st:f.stealth||0,jc:+jc.left.toFixed(2),jct:+jc.total.toFixed(2),jcp:+jc.pct.toFixed(1),tt:f.tauntT||0,qc:f.quizChargeT||0,qk:f.quizChargeKey||"",ap:!!f.autoPilot,au:Math.max(0,Math.ceil(((f.autoUnlockAt||0)-Date.now())/1000)),sc:runtimeCooldownSnapshot('ga',f.sid)};});
  const structures=(GARENA.structures||[]).map(q=>({id:q.id,team:q.team,type:q.type,x:q.x,y:q.y,hp:q.hp,max:q.max,alive:q.alive!==false}));
  const snap = JSON.stringify(fs) + "|" + JSON.stringify(structures) + "|" + JSON.stringify(GARENA.mobaQuiz||null) + "|" + (GARENA.over?1:0);
  const now = Date.now();
  const minPush=fs.length>12?1800:1200;
  if(!force && snap===GARENA._lastSnap) return;                                      // 完全無變化就不重傳
  if(!force && now-(GARENA._lastPush||0) < minPush) return;                           // 多人戰降低 Firestore 寫入壓力
  GARENA._lastSnap = snap; GARENA._lastPush = now;
  const remaining=Math.max(0,GARENA.DURATION-(GARENA.elapsed||0));
  const mq=gaIsKnowledgeMoba()&&GARENA.mobaQuiz?{active:true,round:GARENA.mobaQuiz.round,prompt:GARENA.mobaQuiz.prompt,visualSvg:quizGeometrySvgSafe(GARENA.mobaQuiz.visualSvg),options:GARENA.mobaQuiz.options,questionImage:GARENA.mobaQuiz.questionImage||"",optionImages:GARENA.mobaQuiz.optionImages||[],correct:GARENA.mobaQuiz.correct||"",reveal:!!GARENA.mobaQuiz.reveal,finished:!!GARENA.mobaQuiz.finished,lastResult:GARENA.mobaQuiz.lastResult||"",score:GARENA.mobaKnowledgeScore||{red:0,blue:0},streak:GARENA.mobaKnowledgeStreak||{red:0,blue:0},wrong:GARENA.mobaQuiz.wrong,answeredTeams:GARENA.mobaQuiz.answeredTeams,endsIn:Math.max(0,Math.ceil((((GARENA.mobaQuiz.finished?GARENA.mobaQuiz.nextAtTick:GARENA.mobaQuiz.roundEndsTick)||0)-(GARENA.ticks||0))*.5))}:null;
  const W = { active:GARENA.active && !GARENA.over, over:GARENA.over, winTeam:GARENA.winTeam||null,
    W:GARENA.W, H:GARENA.H, mode:GARENA.mode||"battle", mapKey:GARENA.mapKey||"plain", fighters:fs, structures,
    mobaQuiz:mq,
    aliveR: fs.filter(f=>f.team==="red"&&!f.ko).length, aliveB: fs.filter(f=>f.team==="blue"&&!f.ko).length,
    speed:GARENA.speed||1, remaining:remaining, endTs:now+remaining/(GARENA.speed||1)*1000, ts:now };
  CLOUD.garenaWrite(W).catch(e=>console.warn("garena", e));
}

function teacherArena(){
  /* 各高風險功能各自受 XP＋教師閘門控制；暫停競技場不會連帶關閉公會或 Dota。 */
  if(GARENA.active) return garenaBattleHtml();
  if(ARENA.active) return arenaBattleHtml();
  const arenaOpen=classFeatureUnlocked("arena");
  const opts = selectedIndex=>state.students.map((x,i)=>'<option value="'+x.id+'"'+(i===selectedIndex?' selected':'')+'>'+esc(x.name)+'(Lv.'+x.level+'・'+JOB_INFO[x.job].name+')</option>').join("");
  const duelBody=arenaOpen?'<div class="arena-compact-panel" style="text-align:center"><div class="arena-duel-toolbar">'
    + '<b style="font-size:18px;white-space:nowrap">⚔️ 1 對 1</b><select id="arA" aria-label="左方對戰角色">'+opts(0)+'</select>'
    + '<b style="font-size:18px">VS</b><select id="arB" aria-label="右方對戰角色">'+opts(state.students.length>1?1:0)+'</select>'
    + '<label class="mini" style="white-space:nowrap"><input type="checkbox" id="arFriendly"> 友誼賽</label>'
    + '<button class="btn gold" id="arStart" style="padding:9px 20px;font-size:15px">🏟 開始決鬥</button></div>'
    + '<details style="margin-top:8px"><summary class="mini" style="cursor:pointer">查看規則與職業克制</summary><div class="mini" style="margin-top:6px">表演賽不扣真實 HP；行動條依敏捷充能，只使用已裝備技能。⚔️戰士物攻壓牧師・✨牧師抗法師・🔮法師法術必中遊俠・💨遊俠閃戰士。非友誼賽：勝 +20XP 並奪 30～50 金，敗 +10XP。</div></details></div>':'<div class="unlock-note">'+classFeatureLockText("arena")+'。到「解鎖進度」個別開啟競技場。</div>';
  return classProgressHtml(true) + '<div class="arena-menu-row">'
    + '<details class="panel arena-menu-card" id="arenaDuelMenu"'+(view.arenaDuelOpen?' open':'')+'><summary>'+(arenaOpen?'⚔️':'🔒')+' 雙人決鬥 <span class="mini">1 對 1・行動條・五格技能</span></summary><div class="arena-menu-body">'+duelBody+'</div></details>'
    + garenaSetupHtml(arenaOpen)
    + '</div>';
}

function garenaSetupHtml(arenaOpen){
  const offline=!CLOUD.on();
  const teamBody='<div class="mini" style="margin-bottom:8px">'+(offline
      ? '單機模式可用 <b>AI 演練</b> 觀摩佈陣、移動、技能與團隊合作；雲端班級可讓學生用手機遙控。'
      : '勾選兩隊後開戰；學生手機可移動、攻擊與施放已裝備技能。180 秒或全滅分勝負。')+'</div>'
    + gaMapPicker()+garenaPickBoxes()
    + (offline?'<button class="btn gold" id="gaStartAi">🤖 AI 演練</button>'
      :'<button class="btn gold" id="gaStart">⚔️ 開始團體戰</button> <button class="btn" id="gaStartAi">🤖 AI 演練</button>');
  return '<details class="panel arena-menu-card" id="arenaTeamMenu"'+(view.arenaTeamOpen?' open':'')+'><summary>'+(arenaOpen?'👥':'🔒')+' 團體競技場 <span class="mini">選地圖・分隊・開戰</span></summary><div class="arena-menu-body">'+(arenaOpen?teamBody:'<div class="unlock-note">'+classFeatureLockText("arena")+'</div>')+'</div></details>'
    + '<details class="panel arena-menu-card" id="arenaMobaMenu"'+(view.arenaMobaOpen?' open':'')+'><summary>'+(classFeatureUnlocked("moba")?'🏰':'🔒')+' Dota 戰場・3v3～15v15 <span class="mini">動態地圖・自由移動・技能・推塔</span></summary><div class="arena-menu-body">'+(classFeatureUnlocked("moba")?mobaSetupHtml(offline):'<div class="unlock-note">'+classFeatureLockText("moba")+'</div>')+'</div></details>'
    + '<details class="panel arena-menu-card" id="arenaGuildMenu"'+(view.arenaGuildOpen?' open':'')+'><summary>'+(classFeatureUnlocked("guild")?'🏰':'🔒')+' 公會戰與城堡 <span class="mini">攻城・巔峰・回放</span></summary><div class="arena-menu-body">'+(classFeatureUnlocked("guild")?siegeSetupHtml()+castleAdminHtml():'<div class="unlock-note">'+classFeatureLockText("guild")+'</div>')+'</div></details>';
}

function mobaSignupList(){return Object.values(MOBA_SIGNUP.entries).sort((a,b)=>(a.ts||0)-(b.ts||0));}

function mobaSignupCounts(){
  const a=MOBA_SIGNUP.assign||{};let red=0,blue=0;
  Object.values(a).forEach(t=>{if(t==="red")red++;else if(t==="blue")blue++;});
  return {all:mobaSignupList().length,red,blue,wait:Math.max(0,mobaSignupList().length-red-blue)};
}

function mobaAutoBalance(redraw){
  const first=mobaSignupList().slice(0,MOBA_TEAM_MAX*2).sort((a,b)=>(b.level||1)-(a.level||1));
  const out={},n={red:0,blue:0},lv={red:0,blue:0};
  first.forEach(e=>{
    let t=n.red>=MOBA_TEAM_MAX?"blue":n.blue>=MOBA_TEAM_MAX?"red":(lv.red<lv.blue?"red":lv.blue<lv.red?"blue":(n.red<=n.blue?"red":"blue"));
    out[e.sid]=t;n[t]++;lv[t]+=e.level||1;
  });
  MOBA_SIGNUP.assign=out;MOBA_SIGNUP.manual=false;
  if(redraw)openMobaSignupManager(false);
}

function mobaSignupRefresh(){
  const n=mobaSignupCounts(),count=document.getElementById("mobaSignupCount"),qrCount=document.getElementById("mobaSignupQrCount");
  if(count)count.textContent=n.all+" 人已報名";
  if(qrCount)qrCount.textContent=n.all+" 人已報名（紅 "+n.red+"／藍 "+n.blue+"／候補 "+n.wait+"）";
  if(document.getElementById("mobaSignupManager"))openMobaSignupManager(false);
  if(n.all>5&&!MOBA_SIGNUP.thresholdShown){MOBA_SIGNUP.thresholdShown=true;openMobaSignupManager(true);}
}

function mobaSignupStopWatch(){
  if(MOBA_SIGNUP.cmdUnsub)MOBA_SIGNUP.cmdUnsub();if(MOBA_SIGNUP.stateUnsub)MOBA_SIGNUP.stateUnsub();
  MOBA_SIGNUP.cmdUnsub=null;MOBA_SIGNUP.stateUnsub=null;
}

function mobaSignupWatch(room){
  mobaSignupStopWatch();
  MOBA_SIGNUP.cmdUnsub=CLOUD.garenaListenCmds(cmd=>{
    if(!cmd||cmd.type!=="mobaSignup"||cmd.room!==room||!cmd.sid)return;
    const s=state.students.find(x=>x.id===cmd.sid);if(!s)return; // 只接受本班正式名冊角色
    const isNew=!MOBA_SIGNUP.entries[s.id];
    MOBA_SIGNUP.entries[s.id]={sid:s.id,name:s.name,level:s.level,job:s.job,ts:cmd.ts||Date.now()};
    if(isNew&&!MOBA_SIGNUP.manual)mobaAutoBalance(false);
    mobaSignupRefresh();
  });
  MOBA_SIGNUP.stateUnsub=CLOUD.mobaSignupListen(data=>{
    if(!data||data.room!==room||data.active===false){MOBA_SIGNUP.active=false;mobaSignupRefresh();}
  });
}

async function openMobaSignup(){
  if(GARENA.active){toast("請先結束目前戰場再開放下一場報名",true);return;}
  if(!CLOUD.on()){toast("即時報名需要先以教師 Google 帳號登入雲端班級",true);return;}
  const room="DOTA-"+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase();
  MOBA_SIGNUP.active=true;MOBA_SIGNUP.room=room;MOBA_SIGNUP.entries={};MOBA_SIGNUP.assign={};MOBA_SIGNUP.manual=false;MOBA_SIGNUP.thresholdShown=false;
  try{
    await CLOUD.mobaSignupClearCommands();
    await CLOUD.mobaSignupWrite({active:true,room,openedAt:Date.now(),teacher:(FB.user&&FB.user.email)||""});
    mobaSignupWatch(room);openMobaSignupQr();toast("📲 Dota 即時報名已開放");
  }catch(e){MOBA_SIGNUP.active=false;toast("開啟報名失敗："+(e.message||e),true);}
}

async function closeMobaSignup(){
  if(MOBA_SIGNUP.active&&CLOUD.on())await CLOUD.mobaSignupWrite({active:false,room:MOBA_SIGNUP.room,closedAt:Date.now()}).catch(()=>{});
  MOBA_SIGNUP.active=false;mobaSignupStopWatch();
  if(CLOUD.on())await CLOUD.mobaSignupClearCommands().catch(()=>{}); // 不把報名訊息帶進正式戰鬥指令佇列
}

function openMobaSignupQr(){
  if(!MOBA_SIGNUP.active){toast("請先開啟即時報名",true);return;}
  const base=mobaPublicBaseUrl();if(!base)return;
  const q=new URLSearchParams();q.set("class",CLOUD.cid);q.set("dota","signup");q.set("room",MOBA_SIGNUP.room);
  const link=base+"?"+q.toString(),n=mobaSignupCounts();
  modalHost.innerHTML='<div class="overlay" id="mobaSignupQrOv"><div class="modal" style="max-width:470px;text-align:center">'
    +'<h3 style="margin-top:0">📲 Dota 即時報名</h3><div class="mini">學生使用已註冊的 Google 帳號掃碼登入即可報名；候選名單不限制人數。</div>'
    +'<div id="mobaSignupQrBox" style="display:flex;justify-content:center;align-items:center;width:270px;min-height:270px;margin:12px auto;padding:5px;background:#fff;border:3px solid #141414;border-radius:12px">產生中…</div>'
    +'<div id="mobaSignupQrCount" style="font-weight:900;color:#315b43;margin:8px 0">'+n.all+' 人已報名（紅 '+n.red+'／藍 '+n.blue+'／候補 '+n.wait+'）</div>'
    +'<div class="inline-form" style="justify-content:center"><input id="mobaSignupLink" readonly value="'+esc(link)+'" style="flex:1;min-width:0;font-size:11px"><button class="btn" id="mobaSignupCopy">複製</button></div>'
    +'<div class="inline-form" style="justify-content:center;margin-top:8px"><button class="btn gold" id="mobaSignupManage">👥 分隊管理</button><button class="btn" id="mobaSignupQrClose">縮小 QR</button></div></div></div>';
  const close=()=>{modalHost.innerHTML="";};document.getElementById("mobaSignupQrOv").onclick=e=>{if(e.target.id==="mobaSignupQrOv")close();};document.getElementById("mobaSignupQrClose").onclick=close;
  document.getElementById("mobaSignupManage").onclick=()=>openMobaSignupManager(false);
  document.getElementById("mobaSignupCopy").onclick=()=>{const x=document.getElementById("mobaSignupLink");x.select();try{document.execCommand("copy");toast("報名連結已複製");}catch(_){toast("請手動複製連結",true);}};
  loadQrLib(ok=>{const box=document.getElementById("mobaSignupQrBox");if(!box)return;if(ok&&window.QRCode){box.innerHTML="";new QRCode(box,{text:link,width:260,height:260,correctLevel:QRCode.CorrectLevel.M});}else box.innerHTML='<div class="mini">QR 產生器載入失敗，請複製報名連結。</div>';});
}

function openMobaSignupManager(autoOpened){
  const list=mobaSignupList(),a=MOBA_SIGNUP.assign||{},n=mobaSignupCounts();
  const row=(e,team)=>'<div style="display:flex;align-items:center;gap:5px;background:#fff;border:2px solid '+(team==="red"?'#d94c4c':team==="blue"?'#4c79d9':'#aaa')+';border-radius:8px;padding:6px;margin:5px 0;color:#141414"><span style="flex:1"><b>'+esc(e.name)+'</b> <span class="mini">Lv.'+e.level+'・'+esc((JOB_INFO[e.job]||{}).name||e.job)+'</span></span>'+(team!=="red"?'<button class="btn" data-msmove="'+e.sid+'|red" style="padding:2px 6px">🔴</button>':'')+(team!=="blue"?'<button class="btn" data-msmove="'+e.sid+'|blue" style="padding:2px 6px">🔵</button>':'')+(team?'<button class="btn" data-msmove="'+e.sid+'|wait" style="padding:2px 6px">候補</button>':'')+'</div>';
  const col=(team,title,color)=>'<div class="panel" style="margin:0;border-color:'+color+'"><h3 style="color:'+color+'">'+title+'（'+(team==="red"?n.red:n.blue)+' / '+MOBA_TEAM_MAX+'）</h3>'+list.filter(e=>a[e.sid]===team).map(e=>row(e,team)).join('')+(list.some(e=>a[e.sid]===team)?'':'<div class="mini">尚未選入隊員</div>')+'</div>';
  const waiting=list.filter(e=>!a[e.sid]);
  modalHost.innerHTML='<div class="overlay" id="mobaSignupManager"><div class="modal" style="max-width:900px;width:min(94vw,900px)"><h3 style="margin-top:0">🏰 Dota 報名分隊 '+(autoOpened?'<span class="tag" style="background:#f0b429">報名已超過 5 人</span>':'')+'</h3>'
    +'<div class="mini" style="margin-bottom:9px">共 <b>'+n.all+'</b> 人報名；戰場會形成 3v3～15v15，超過 30 人時其餘保留候補。兩隊人數不同時，少的一方會補入接近全場平均等級的隨機職業 AI。</div>'
    +'<div class="moba-team-grid">'+col("red","🔴 紅隊","#b52d2d")+col("blue","🔵 藍隊","#315dad")+'</div>'
    +'<div class="panel" style="margin:10px 0 0"><h3>🪑 候補區（'+waiting.length+'）</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:4px">'+(waiting.map(e=>row(e,"")).join('')||'<div class="mini">目前沒有候補</div>')+'</div></div>'
    +'<div class="inline-form" style="justify-content:center;margin-top:10px"><button class="btn" id="mobaSignupAuto">⚖️ 自動均衡</button><button class="btn gold" id="mobaSignupStart">▶️ 開始 Dota</button>'+(CLOUD.on()?'<button class="btn" id="mobaSignupBackQr">📲 顯示 QR</button>':'')+'<button class="btn danger" id="mobaSignupEnd">停止報名</button><button class="btn" id="mobaSignupClose">關閉視窗</button></div></div></div>';
  modalHost.querySelectorAll('[data-msmove]').forEach(b=>b.onclick=()=>{const [sid,to]=b.dataset.msmove.split('|'),c=mobaSignupCounts();if((to==="red"&&c.red>=MOBA_TEAM_MAX)||(to==="blue"&&c.blue>=MOBA_TEAM_MAX)){toast("每隊最多 "+MOBA_TEAM_MAX+" 名學生；請先把一人移到候補區",true);return;}if(to==="wait")delete MOBA_SIGNUP.assign[sid];else MOBA_SIGNUP.assign[sid]=to;MOBA_SIGNUP.manual=true;openMobaSignupManager(false);});
  document.getElementById("mobaSignupAuto").onclick=()=>mobaAutoBalance(true);
  document.getElementById("mobaSignupStart").onclick=()=>mobaStartFromSignup();
  const backQr=document.getElementById("mobaSignupBackQr");if(backQr)backQr.onclick=openMobaSignupQr;
  document.getElementById("mobaSignupEnd").onclick=async()=>{await closeMobaSignup();modalHost.innerHTML="";toast("Dota 報名已停止");render();};
  document.getElementById("mobaSignupClose").onclick=()=>{modalHost.innerHTML="";};
  document.getElementById("mobaSignupManager").onclick=e=>{if(e.target.id==="mobaSignupManager")modalHost.innerHTML="";};
}

function mobaMakeAi(team,index,avgLevel){
  const jobs=["Warrior","Mage","Rogue","Cleric"],job=jobs[Math.floor(Math.random()*jobs.length)],id="MOBA_AI_"+team+"_"+index+"_"+Date.now();
  const s=newStudent(id,"AI・"+(JOB_INFO[job]||{}).name+(index+1),job,"AI");s.isMobaAI=true;s.level=Math.max(1,Math.min(90,Math.round(avgLevel||1)));s.spPoints=s.level;
  const gr=JOB_INFO[job].growth;for(let lv=2;lv<=s.level;lv++){s.baseAtk+=gr.atk;s.baseDef+=gr.def;s.baseAgi+=gr.agi;s.baseInt+=gr.int;s.maxHp+=10;}s.currentHp=s.maxHp;
  try{autoLevelSkills(s);}catch(_){}s.weaponId=({Warrior:25,Mage:28,Rogue:10,Cleric:26})[job]||null;
  window.__garenaGuests[id]=s;return id;
}

function mobaFillAi(red,blue){
  window.__garenaGuests={};const humans=red.concat(blue).map(stu).filter(Boolean),classAvg=state.students.length?state.students.reduce((a,s)=>a+(s.level||1),0)/state.students.length:1;
  const avg=humans.length?humans.reduce((a,s)=>a+(s.level||1),0)/humans.length:classAvg;
  const target=Math.min(MOBA_TEAM_MAX,Math.max(3,red.length,blue.length));
  while(red.length<target)red.push(mobaMakeAi("red",red.length,avg));while(blue.length<target)blue.push(mobaMakeAi("blue",blue.length,avg));return {red,blue,avg:Math.round(avg),size:target};
}

async function mobaStartFromSignup(){
  let red=mobaSignupList().filter(e=>MOBA_SIGNUP.assign[e.sid]==="red").map(e=>e.sid),blue=mobaSignupList().filter(e=>MOBA_SIGNUP.assign[e.sid]==="blue").map(e=>e.sid);
  if(!red.length&&!blue.length){toast("目前尚未選入任何學生",true);return;}
  await closeMobaSignup();const filled=mobaFillAi(red,blue);modalHost.innerHTML="";garenaStart(filled.red,filled.blue,false,"moba");toast("🏰 "+filled.size+"v"+filled.size+" Dota 開戰；不足隊員已補為 Lv."+filled.avg+" 隨機職業 AI");
}

async function mobaStudentEnrollFromLink(sid){
  const p=new URLSearchParams(location.search),room=p.get("room")||"";if(p.get("dota")!=="signup"||!room||!CLOUD.on())return;
  try{const open=await CLOUD.mobaSignupGet();if(!open||!open.active||open.room!==room){toast("這一場 Dota 報名已結束",true);return;}await CLOUD.garenaCmd(sid,{type:"mobaSignup",room});toast("✅ Dota 報名成功！請留在角色頁等待老師分隊");}
  catch(e){toast("Dota 報名失敗："+(e.message||e),true);}
}

function mobaSetupHtml(offline){
  const teamBox=(team,color)=>state.students.map(x=>'<label style="display:inline-flex;align-items:center;gap:3px;background:#fff;border:2px solid '+color+';border-radius:7px;padding:4px 7px;font-size:12px;font-weight:800;cursor:pointer"><input type="checkbox" class="mobaPick" data-team="'+team+'" value="'+x.id+'"> '+esc(x.name)+' <span class="mini">Lv'+x.level+'</span></label>').join('');
  return '<div style="background:linear-gradient(135deg,#183d2a,#315b43);color:#fff;border:3px solid #d9b84a;border-radius:12px;padding:11px">'
    + '<div style="font-weight:900;font-size:16px;color:#ffe486">🗺️ 榮耀峽谷</div>'
    + '<div class="mini" style="color:#d9eadc;line-height:1.6;margin:5px 0 9px">動態 3v3～15v15；左右完全鏡像的雙路、河道、中央山壁與基地會隨人數放大。12 人以上自動減少非必要粒子以維持流暢。箭塔射程 3 格，每擊造成最大生命 15% 真實傷害；核心城堡同樣射程 3 格，每擊造成最大生命 20% 真實傷害，城堡耐久依成功攻擊次數扣除。無敵重生水晶會在每次完成動作後治療自家陣地三列內友軍 30% 最大生命。陣亡 6 秒後從自家門口復活，一局最長 3 分鐘。</div>'
    + '<div class="moba-team-grid"><div><b style="color:#ff9898">🔴 紅方（最多 '+MOBA_TEAM_MAX+' 人）</b><div class="moba-pick-list" style="margin-top:5px">'+teamBox('red','#d94c4c')+'</div></div>'
    + '<div><b style="color:#9cbcff">🔵 藍方（最多 '+MOBA_TEAM_MAX+' 人）</b><div class="moba-pick-list" style="margin-top:5px">'+teamBox('blue','#4c79d9')+'</div></div></div>'
    + '<div class="moba-mode-menu">'
    + '<button class="btn gold moba-mode-btn" id="mobaStart">⚔️ 一般模式<small>'+(offline?'AI 自動演練':'使用勾選名單開戰')+'</small></button>'
    + '<button class="btn moba-mode-btn" id="mobaSignupOpen">📲 即時報名<small id="mobaSignupCount">'+(MOBA_SIGNUP.active?mobaSignupCounts().all+' 人已報名':'QR 報名與分隊')+'</small></button>'
    + '<button class="btn gold moba-mode-btn" id="mobaKnowledgeStart">📚 知識攻塔<small>四座答案塔・站位集氣作答</small></button></div>'
    + '<div class="mini" style="padding:7px 9px;border-radius:8px;background:rgba(255,255,255,.12);color:#e8f4e9">知識攻塔會移除核心城堡與重生溫泉；教師只選一次題庫，每題結束自動從該題庫隨機抽下一題。</div>'
    + '<div class="moba-utility-row">'+(MOBA_SIGNUP.active?'<button class="btn" id="mobaSignupManageInline">👥 報名分隊</button> ':'')+(!offline?'<button class="btn" id="mobaStartAi">🤖 AI 演練</button>':'')+'<button class="btn" id="mobaQr">📱 參戰 QR</button></div></div>';
}

function mobaSelectedRoster(){
  if(GARENA.active&&gaIsMoba()) return {red:Object.values(GARENA.fighters).filter(f=>f.team==="red").map(f=>f.sid),blue:Object.values(GARENA.fighters).filter(f=>f.team==="blue").map(f=>f.sid)};
  return {red:[...app.querySelectorAll('.mobaPick[data-team="red"]')].filter(c=>c.checked).map(c=>c.value),blue:[...app.querySelectorAll('.mobaPick[data-team="blue"]')].filter(c=>c.checked).map(c=>c.value)};
}

function mobaPublicBaseUrl(){
  let base=location.origin+location.pathname;
  const localFile=location.protocol==="file:",loopback=/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(location.hostname||"");
  if(localFile||loopback){
    const old=localStorage.getItem("rpg-mobile-base-url")||"";
    const typed=prompt("目前是本機網址，手機無法直接開啟。請貼上已部署的系統網址，或教師電腦的區網網址（例如 http://192.168.1.20:8765/班級RPG-公會大廳v126.html）：",old);
    if(!typed)return "";
    try{const u=new URL(typed.trim());if(!/^https?:$/.test(u.protocol))throw 0;base=u.origin+u.pathname;localStorage.setItem("rpg-mobile-base-url",base);}catch(_){toast("請輸入以 http:// 或 https:// 開頭的完整網址",true);return "";}
  }
  return base;
}

function openMobaJoinQr(){
  const roster=mobaSelectedRoster(),ids=roster.red.concat(roster.blue),dup=roster.red.filter(id=>roster.blue.includes(id));
  if(!ids.length||roster.red.length>MOBA_TEAM_MAX||roster.blue.length>MOBA_TEAM_MAX||dup.length){toast("請先完成 Dota 名單；每隊最多 "+MOBA_TEAM_MAX+" 人且不可重複",true);return;}
  if(!CLOUD.on()){toast("手機即時參戰需要使用已上線的雲端班級；離線模式只能在本機 AI 測試",true);return;}
  const base=mobaPublicBaseUrl();if(!base)return;
  const q=new URLSearchParams();q.set("class",CLOUD.cid);q.set("dota","1");
  const link=base+"?"+q.toString();
  const names=team=>roster[team].map(id=>esc((stu(id)||{}).name||"?")).join("、");
  modalHost.innerHTML='<div class="overlay" id="mobaQrOverlay"><div class="modal" style="max-width:470px;text-align:center">'
    +'<h3 style="margin-top:0">📱 Dota 戰場・手機參戰</h3><div class="mini" style="line-height:1.7">掃碼後按「學生登入」，使用本場名單內的學生 Google 帳號。老師開戰後，手機會自動顯示方向鍵、攻擊與五個裝備技能。</div>'
    +'<div id="mobaQrBox" style="display:flex;justify-content:center;align-items:center;width:270px;min-height:270px;margin:12px auto;padding:5px;background:#fff;border:3px solid #141414;border-radius:12px">產生中…</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;text-align:left;margin:8px 0"><div class="panel" style="margin:0;padding:7px;border-color:#d94c4c"><b style="color:#b52d2d">🔴 '+names("red")+'</b></div><div class="panel" style="margin:0;padding:7px;border-color:#4c79d9"><b style="color:#315dad">🔵 '+names("blue")+'</b></div></div>'
    +'<div class="panel" style="margin:7px 0;padding:8px"><span class="mini">班級代碼（無法掃碼時使用）</span><br><b class="num" style="font-size:18px;letter-spacing:1px">'+esc(CLOUD.cid)+'</b></div>'
    +'<div class="inline-form" style="justify-content:center"><input id="mobaQrLink" readonly value="'+esc(link)+'" style="flex:1;min-width:0;font-size:11px"><button class="btn" id="mobaQrCopy">複製連結</button><button class="btn" id="mobaQrClose">關閉</button></div></div></div>';
  const close=()=>{modalHost.innerHTML="";};
  document.getElementById("mobaQrOverlay").onclick=e=>{if(e.target.id==="mobaQrOverlay")close();};document.getElementById("mobaQrClose").onclick=close;
  document.getElementById("mobaQrCopy").onclick=()=>{const inp=document.getElementById("mobaQrLink");inp.select();try{document.execCommand("copy");toast("Dota 參戰連結已複製");}catch(_){toast("請手動複製連結",true);}};
  loadQrLib(ok=>{const box=document.getElementById("mobaQrBox");if(!box)return;if(ok&&window.QRCode){box.innerHTML="";new QRCode(box,{text:link,width:260,height:260,correctLevel:QRCode.CorrectLevel.M});}else box.innerHTML='<div class="mini">QR 產生器載入失敗，請使用下方參戰連結。</div>';});
}

function mobaSimRosterData(){
  const roster=mobaSelectedRoster(),out=[];
  ["red","blue"].forEach(team=>(roster[team]||[]).forEach(sid=>{
    const s=stu(sid);if(s)out.push({sid:s.id,name:s.name,job:s.job,jobName:(JOB_INFO[s.job]||{}).name||s.job,team});
  }));
  return out;
}

function mobaSimState(sid){
  const roster=mobaSimRosterData(),s=stu(sid),active=!!(GARENA.active&&gaIsMoba()),f=active?GARENA.fighters[sid]:null;
  const skills=s?normalizeSkillLoadout(s).map(id=>skillDef(s.job,id)).filter(Boolean).slice(0,5).map(sk=>{const ci=skillCooldownInfo('ga',sid,sk.id);return {id:sk.id,icon:sk.icon,name:sk.name,cd:ci.left,total:ci.total,pct:ci.pct};}):[];
  const js=s&&jobSkillAvailable(s)?(JOB_SKILL[s.job]||null):null;
  const jobCi=f?fighterCooldownInfo(f,'job'):{left:0,total:0,pct:0};
  return {
    roster,active,over:!!GARENA.over,paused:!!GARENA.paused,valid:!!f,
    W:GARENA.W||18,H:GARENA.H||9,mode:GARENA.mode||"moba",remaining:Math.max(0,Math.ceil((GARENA.DURATION||300)-(GARENA.elapsed||0))),
    me:f?{sid:f.sid,name:s?s.name:"?",team:f.team,hp:Math.max(0,Math.round(f.hp)),max:Math.max(1,Math.round(f.max)),ko:!!f.ko,respawnT:f.respawnT||0,x:f.x,y:f.y,atb:Math.max(0,Math.min(100,Math.round(f.atb||0))),atkCd:Math.max(0,f.cd||0),jobCd:jobCi.left,jobCdTotal:jobCi.total,jobCdPct:jobCi.pct,range:s?weaponRange(s):1,quizCharge:Math.min(100,Math.round((f.quizChargeT||0)/6*100)),autoPilot:!!f.autoPilot,autoUnlock:Math.max(0,Math.ceil(((f.autoUnlockAt||0)-Date.now())/1000))}:null,
    fighters:active?Object.values(GARENA.fighters).map(q=>({sid:q.sid,name:(stu(q.sid)||{}).name||"?",team:q.team,x:q.x,y:q.y,ko:!!q.ko})):[],
    structures:active?(GARENA.structures||[]).map(q=>({team:q.team,type:q.type,x:q.x,y:q.y,hp:q.hp,max:q.max,alive:q.alive!==false})):[],
    mobaQuiz:GARENA.mobaQuiz?{round:GARENA.mobaQuiz.round,prompt:GARENA.mobaQuiz.prompt,visualSvg:quizGeometrySvgSafe(GARENA.mobaQuiz.visualSvg),options:GARENA.mobaQuiz.options,questionImage:GARENA.mobaQuiz.questionImage||"",optionImages:GARENA.mobaQuiz.optionImages||[],wrong:GARENA.mobaQuiz.wrong,finished:!!GARENA.mobaQuiz.finished,score:GARENA.mobaKnowledgeScore||{red:0,blue:0},streak:GARENA.mobaKnowledgeStreak||{red:0,blue:0},endsIn:Math.max(0,Math.ceil(((((GARENA.mobaQuiz.finished?GARENA.mobaQuiz.nextAtTick:GARENA.mobaQuiz.roundEndsTick)||0)-(GARENA.ticks||0))*.5)))}:null,
    skills,jobSkill:js?{icon:js.icon,name:js.name,desc:js.desc||""}:null
  };
}

function mobaSimHeartbeat(sid){
  GARENA._simControlUntil=GARENA._simControlUntil||{};
  if(sid)GARENA._simControlUntil[sid]=Date.now()+1600;
}

function mobaSimRelease(sid){
  if(GARENA._simControlUntil&&sid)delete GARENA._simControlUntil[sid];
}

function mobaSimSend(sid,cmd){
  if(!GARENA.active||!gaIsMoba()||GARENA.over)return {ok:false,msg:"Dota 戰場尚未開始"};
  const f=GARENA.fighters[sid],s=stu(sid);if(!f||!s)return {ok:false,msg:"這個角色不在本場名單"};
  if(f.ko)return {ok:false,msg:"角色正在基地復活"};
  const safe={sid};
  if(cmd&&cmd.act==="autopilot"){safe.act="autopilot";safe.enabled=cmd.enabled!==false;}
  else if(cmd&&["up","down","left","right"].includes(cmd.move))safe.move=cmd.move;
  else if(cmd&&["attack","jobskill"].includes(cmd.act))safe.act=cmd.act;
  else if(cmd&&cmd.act==="skill"){
    const allowed=normalizeSkillLoadout(s).slice(0,5).map(String),id=String(cmd.skillId||"");
    if(!allowed.includes(id))return {ok:false,msg:"這項技能沒有裝備"};
    safe.act="skill";safe.skillId=id;
  }else return {ok:false,msg:"未知指令"};
  mobaSimHeartbeat(sid);GARENA.cmdQueue[sid]=safe;return {ok:true};
}

function mobaSimPhoneDocument(){
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>Dota 模擬學生手機</title><style>
*{box-sizing:border-box}body{margin:0;background:#0d1712;color:#fff;font-family:"Microsoft JhengHei",sans-serif;min-height:100vh}.phone{width:min(100%,430px);min-height:100vh;margin:auto;background:linear-gradient(#12261b,#07110c);padding:12px 12px 22px}.top{display:flex;gap:8px;align-items:center}.brand{flex:1;color:#ffe486;font-size:17px;font-weight:900}.pill{font-size:11px;padding:4px 8px;border:1px solid #80c99a;border-radius:999px;color:#aee9c1}.role{width:100%;margin:10px 0;padding:10px;border:2px solid #d9b84a;border-radius:9px;background:#fff;color:#141414;font-size:15px;font-weight:900}.card{border:2px solid #d9b84a;border-radius:12px;background:rgba(255,255,255,.08);padding:10px;margin-top:8px}.status{text-align:center;font-size:13px;color:#d9eadc}.hp,.atb{height:12px;background:#1a1a1a;border:2px solid #fff;border-radius:8px;overflow:hidden;margin-top:5px}.hp i,.atb i{display:block;height:100%}.hp i{background:linear-gradient(90deg,#e74c3c,#75d66e)}.atb i{background:linear-gradient(90deg,#3aa0ff,#ffe486)}.map{position:relative;width:100%;aspect-ratio:2/1;margin:9px 0;background:linear-gradient(135deg,#315b43,#173727);border:2px solid #d9b84a;border-radius:9px;overflow:hidden}.dot,.building{position:absolute;transform:translate(-50%,-50%)}.dot{border-radius:50%;border:1px solid #fff}.building{width:10px;height:10px;transform:translate(-50%,-50%) rotate(45deg);border:1px solid #fff}.you{box-shadow:0 0 0 3px #fff,0 0 12px #ffe486;z-index:3}.mobile-controls{display:grid;grid-template-columns:150px minmax(0,1fr);gap:9px;align-items:end;margin-top:8px}.pad{display:grid;grid-template-columns:repeat(3,46px);grid-template-rows:repeat(2,52px);gap:5px;justify-content:start;margin:0}.btn{border:3px solid #111;border-radius:11px;background:#f7f3e8;color:#111;font-size:17px;font-weight:900;box-shadow:0 4px 0 #111;touch-action:manipulation}.btn:active{transform:translateY(3px);box-shadow:0 1px 0 #111}.btn:disabled{cursor:not-allowed}.acts{display:grid;grid-template-columns:1fr;gap:6px}.acts .btn{min-height:45px;font-size:14px}.attack{background:#ffca43}.job{background:#9cd5ff}.skills{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:6px}.skill{min-height:48px;font-size:11px;background:#e9dcff;padding:3px}.skill,.job{position:relative;overflow:hidden;isolation:isolate;--cd-pct:0}.skill>*,.job>*{position:relative;z-index:2}.skill:after,.job:after{content:"";position:absolute;inset:-2px;z-index:1;background:conic-gradient(from -90deg,rgba(10,14,18,.84) calc(var(--cd-pct)*1%),transparent 0)}.skill.cooling,.job.cooling{filter:grayscale(.9);opacity:.8}.skill.ready,.job.ready{animation:readyGlow 1.35s ease-in-out infinite}.skill.ready:after,.job.ready:after{display:none}.cdtime{position:absolute!important;inset:0;z-index:3!important;display:grid;place-items:center;color:#fff;font-size:14px;text-shadow:0 2px 3px #000}@keyframes readyGlow{50%{filter:brightness(1.3);box-shadow:0 0 16px #ffe486,0 4px 0 #111}}.notice{text-align:center;padding:28px 12px;color:#ffe486;font-weight:900;line-height:1.8}.tiny{font-size:11px;color:#adc5b5;text-align:center;line-height:1.5}.foot{display:flex;gap:8px;margin-top:10px}.foot button{flex:1;padding:7px;border-radius:8px;border:1px solid #b9d5c2;background:#183d2a;color:#fff;font-weight:800}@media(max-width:360px){.mobile-controls{grid-template-columns:138px minmax(0,1fr)}.pad{grid-template-columns:repeat(3,42px)}}
</style></head><body><main class="phone"><div class="top"><div class="brand">🏰 Dota 模擬手機</div><span class="pill">教師本機測試</span></div><select class="role" id="role"></select><div id="app"><div class="notice">等待載入角色…</div></div><div class="foot"><button id="teacher">回教師視窗</button><button id="closeSim">關閉模擬手機</button></div></main><script>
(function(){var sid="",oldRoster="",hold=null;function e(v){return String(v==null?"":v).replace(/[&<>\"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]})}function p(){if(window.opener&&!window.opener.closed)return window.opener;if(window.parent!==window&&typeof window.parent.mobaSimState==="function")return window.parent;return null}function send(cmd){var o=p();if(!o)return;var r=o.mobaSimSend(sid,cmd);if(r&&!r.ok){var n=document.getElementById("msg");if(n)n.textContent=r.msg||"指令失敗"}}function roleOptions(list){var sig=list.map(function(x){return x.sid+":"+x.team}).join("|");if(sig===oldRoster)return;oldRoster=sig;var sel=document.getElementById("role"),keep=sid;sel.innerHTML=list.map(function(x){return '<option value="'+e(x.sid)+'">'+(x.team==="red"?"🔴":"🔵")+' '+e(x.name)+'・'+e(x.jobName)+'</option>'}).join("");sid=list.some(function(x){return x.sid===keep})?keep:(list[0]?list[0].sid:"");sel.value=sid}function mapHtml(s){var me=s.me||{};var bs=(s.structures||[]).filter(function(q){return q.alive}).map(function(q){return '<i class="building" style="left:'+((q.x+.5)/s.W*100)+'%;top:'+((q.y+.5)/s.H*100)+'%;background:'+(q.team==="red"?"#e05252":"#5285e0")+'" title="'+e(q.type)+'"></i>'}).join("");var ds=(s.fighters||[]).filter(function(q){return !q.ko}).map(function(q){var mine=q.sid===sid,ally=me.team&&q.team===me.team,col=mine?"#ffe486":(ally?(q.team==="red"?"#e05252":"#5285e0"):"#999"),z=mine?11:8;return '<i class="dot '+(mine?"you":"")+'" style="left:'+((q.x+.5)/s.W*100)+'%;top:'+((q.y+.5)/s.H*100)+'%;width:'+z+'px;height:'+z+'px;background:'+col+'" title="'+e(q.name)+'"></i>'}).join("");return '<div class="map">'+bs+ds+'</div>'}function paint(){var o=p(),box=document.getElementById("app");if(!o){box.innerHTML='<div class="notice">教師視窗已關閉</div>';return}var first=o.mobaSimState(sid);roleOptions(first.roster||[]);var s=o.mobaSimState(sid);if(!s.active){box.innerHTML='<div class="notice">已選擇測試角色<br>請回教師視窗按「AI 動態對戰測試」<div class="tiny">開戰後這裡會自動切換成操作介面</div></div>';return}if(!s.valid){box.innerHTML='<div class="notice">這個角色不在目前戰場</div>';return}o.mobaSimHeartbeat(sid);var m=s.me,hp=Math.max(0,Math.round(m.hp/m.max*100)),dead=m.ko,dis=(dead||s.paused||s.over)?" disabled":"";var skills=(s.skills||[]).map(function(k){var pct=Math.max(0,Math.min(100,Number(k.pct)||0));return '<button class="btn skill '+(k.cd>0?'cooling':'ready')+'" style="--cd-pct:'+pct+'" data-skill="'+e(k.id)+'"'+(k.cd>0||dead?' disabled':'')+'><span>'+e(k.icon)+' '+e(k.name)+'</span>'+(k.cd>0?'<span class="cdtime">'+Math.ceil(k.cd)+'s</span>':'')+'</button>'}).join("");box.innerHTML='<section class="card"><div class="status"><b>'+e(m.name)+'</b>・'+(m.team==="red"?"🔴紅隊":"🔵藍隊")+'・射程 '+m.range+' 格・剩 '+s.remaining+'s</div><div class="hp"><i style="width:'+hp+'%"></i></div><div class="tiny">HP '+m.hp+' / '+m.max+'</div><div class="atb"><i style="width:'+m.atb+'%"></i></div><div class="tiny">行動 '+m.atb+'%'+(m.atkCd>0?'・攻擊冷卻中':'')+'</div>'+mapHtml(s)+(dead?'<div class="notice">💀 基地復活中・約 '+Math.max(1,Math.ceil(m.respawnT/2))+' 秒</div>':'<div class="mobile-controls"><div class="pad"><span></span><button class="btn" data-move="up"'+dis+'>▲</button><span></span><button class="btn" data-move="left"'+dis+'>◀</button><button class="btn" data-move="down"'+dis+'>▼</button><button class="btn" data-move="right"'+dis+'>▶</button></div><div><div class="acts"><button class="btn attack" data-act="attack"'+dis+'>⚔️ 普攻</button>'+(s.jobSkill?'<button class="btn job '+(s.me.jobCd>0?'cooling':'ready')+'" style="--cd-pct:'+Math.max(0,Math.min(100,Number(s.me.jobCdPct)||0))+'" data-act="jobskill"'+(s.me.jobCd>0?' disabled':'')+'><span>'+e(s.jobSkill.icon)+' '+e(s.jobSkill.name)+'</span>'+(s.me.jobCd>0?'<span class="cdtime">'+Math.ceil(s.me.jobCd)+'s</span>':'')+'</button>':'')+'</div><div class="skills">'+skills+'</div></div></div>')+'<div class="tiny" id="msg">左下方向鍵可按住移動・右側為普攻與已裝備技能・其他角色由 AI 操作</div></section>'}document.getElementById("role").addEventListener("change",function(){var o=p();if(o)o.mobaSimRelease(sid);sid=this.value;paint()});document.getElementById("teacher").onclick=function(){var o=p();if(o)o.focus()};document.getElementById("closeSim").onclick=function(){var o=p();if(window.opener)window.close();else if(o&&o.closeMobaSimPanel)o.closeMobaSimPanel()};document.addEventListener("click",function(ev){var b=ev.target.closest("[data-act],[data-skill]");if(!b||b.disabled)return;if(b.dataset.act)send({act:b.dataset.act});else send({act:"skill",skillId:b.dataset.skill})});document.addEventListener("pointerdown",function(ev){var b=ev.target.closest("[data-move]");if(!b||b.disabled)return;send({move:b.dataset.move});clearInterval(hold);hold=setInterval(function(){send({move:b.dataset.move})},180);ev.preventDefault()});["pointerup","pointercancel","pointerleave"].forEach(function(n){document.addEventListener(n,function(){clearInterval(hold);hold=null})});window.addEventListener("beforeunload",function(){var o=p();if(o)o.mobaSimRelease(sid)});setInterval(paint,250);paint()})();
<\/script></body></html>`;
}

function openMobaSimPhone(){
  const roster=mobaSelectedRoster(),ids=roster.red.concat(roster.blue),dup=roster.red.filter(id=>roster.blue.includes(id));
  if(!ids.length||roster.red.length>MOBA_TEAM_MAX||roster.blue.length>MOBA_TEAM_MAX||dup.length){toast("請先完成 Dota 名單；每隊最多 "+MOBA_TEAM_MAX+" 人且不可重複",true);return false;}
  const u=new URL(location.href);u.searchParams.set("dotaPhone","1");u.hash="";
  const link=this&&this.tagName==="A"?this:null;
  if(link){link.href=u.toString();toast("正在另開模擬學生手機；選角色後回教師視窗開始 Dota");return true;}
  const win=window.open(u.toString(),"ClassRpgMobaPhone","popup=yes,width=430,height=820,resizable=yes,scrollbars=yes");
  if(!win){toast("瀏覽器阻擋了模擬手機視窗，請允許這個網站開啟彈出式視窗",true);return false;}
  MOBA_SIM_WIN=win;win.focus();return true;
}

function closeMobaSimPanel(){const p=document.getElementById("mobaSimPanel");if(p)p.remove();}

function openMobaSimPanel(){
  const roster=mobaSelectedRoster(),ids=roster.red.concat(roster.blue),dup=roster.red.filter(id=>roster.blue.includes(id));
  if(!ids.length||roster.red.length>MOBA_TEAM_MAX||roster.blue.length>MOBA_TEAM_MAX||dup.length){toast("請先完成 Dota 名單；每隊最多 "+MOBA_TEAM_MAX+" 人且不可重複",true);return;}
  let panel=document.getElementById("mobaSimPanel");if(panel){panel.style.display="flex";panel.style.zIndex=196;return;}
  panel=document.createElement("section");panel.id="mobaSimPanel";
  panel.style.cssText="position:fixed;right:14px;top:64px;width:410px;height:min(790px,calc(100vh - 76px));min-width:330px;min-height:520px;z-index:196;background:#101b15;border:4px solid #141414;border-radius:16px;box-shadow:9px 10px 0 rgba(0,0,0,.55);display:flex;flex-direction:column;resize:both;overflow:hidden";
  panel.innerHTML='<div id="mobaSimDrag" style="flex:0 0 auto;display:flex;align-items:center;gap:7px;padding:7px 9px;background:#d9b84a;color:#141414;font-weight:900;cursor:move;user-select:none">📱 學生手機模擬器 <span style="flex:1;font-size:11px">可拖曳・右下角可縮放</span><button id="mobaSimPop" title="另開獨立分頁" style="border:2px solid #141414;border-radius:6px;background:#fff;font-weight:900">↗</button><button id="mobaSimClose" title="關閉" style="border:2px solid #141414;border-radius:6px;background:#fff;font-weight:900">✕</button></div><iframe id="mobaSimFrame" title="Dota 學生手機操作介面" style="flex:1;width:100%;border:0;background:#0d1712"></iframe>';
  document.body.appendChild(panel);
  document.getElementById("mobaSimFrame").srcdoc=mobaSimPhoneDocument();
  document.getElementById("mobaSimClose").onclick=closeMobaSimPanel;
  document.getElementById("mobaSimPop").onclick=openMobaSimPhone;
  const bar=document.getElementById("mobaSimDrag");let drag=null;
  bar.onpointerdown=e=>{if(e.target.closest("button"))return;const r=panel.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,l:r.left,t:r.top};bar.setPointerCapture(e.pointerId);e.preventDefault();};
  bar.onpointermove=e=>{if(!drag)return;panel.style.left=Math.max(0,Math.min(innerWidth-panel.offsetWidth,drag.l+e.clientX-drag.x))+"px";panel.style.top=Math.max(0,Math.min(innerHeight-80,drag.t+e.clientY-drag.y))+"px";panel.style.right="auto";};
  bar.onpointerup=bar.onpointercancel=()=>{drag=null;};
  toast("模擬學生手機已開啟；可一邊看戰場一邊操作");
}
