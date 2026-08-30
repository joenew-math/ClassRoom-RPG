/*
 * math-dungeon-pets：寵物圖鑑、收服、性格、戰鬥觸發、七階融合樹與怪物神殿控制器。
 * 本檔沿用 classic script 全域依賴，必須在怪物資料之後、gameplay 與相容 runtime 之前載入。
 */

function monsterSkillGroupByEffect(type){return EFFECT_SKILL_GROUP[type]||'assist';}

function monsterBattleSkillGroup(type){return BATTLE_SKILL_GROUP[type]||'attack';}

function monsterSkillGroupMeta(group){return MONSTER_SKILL_GROUPS[group]||MONSTER_SKILL_GROUPS.assist;}

function monsterSupportValue(a,zi){
  if(a.type==='heal'||a.type==='block')return a.base+zi;
  if(a.type==='strike')return a.base+Math.floor(zi/2);
  if(a.type==='burn'||a.type==='regen')return a.base+Math.floor(zi/2);
  if(a.type==='power'||a.type==='weaken')return +(a.base+zi*.005).toFixed(3);
  return a.base;
}

function monsterVividPalette(kind,fm){
  const id=monsterIdentity(kind),p=MONSTER_SPECIES_PALETTES[id.species.id]||['#697fd5','#3b477e'];
  return {col:p[0],shade:p[1],hi:MONSTER_THEME_ACCENTS[id.theme.id]||(fm&&fm.hi)||'#fff09a'};
}

function monsterNameHash(v){let h=2166136261;for(const ch of String(v||'')){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}

function monsterIdentity(kind){
  const f=FOES[kind]||{},name=String(f.n||kind),hash=monsterNameHash(kind+name);
  const species=MONSTER_SPECIES_SIGNATURES.find(s=>s.keys.some(k=>name.includes(k)))||
    [{id:'spirit',n:'靈體族',trait:'漂浮靈焰與柔光核心'},{id:'beast',n:'奇獸族',trait:'獸耳、尾部與利爪'},{id:'construct',n:'構裝族',trait:'護甲、核心與重足'}][hash%3];
  const theme=MONSTER_THEME_SIGNATURES.find(s=>s.keys.some(k=>name.includes(k)))||
    [{id:'rune',n:'符印',trait:'獨立編號符印'},{id:'crystal',n:'晶光',trait:'彩色晶核'},{id:'wind',n:'流風',trait:'環繞氣流'}][(hash>>>3)%3];
  const crest=['菱形額印','左旋肩紋','雙點星痕','三叉胸徽','環狀尾印','階梯翼紋','十字核心','波形腳印'][(hash>>>6)%8];
  const epithet=MONSTER_EPITHETS[(hash>>>9)%MONSTER_EPITHETS.length];
  return {species,theme,crest,hash,title:theme.n+'・'+species.n+' '+epithet,
    visual:species.trait+'，搭配'+theme.trait+'與'+crest+'。',
    lore:name+'會把「'+theme.n+'」力量刻進'+species.n+'的身體；牠以'+epithet+'的方式守護所屬樓層。'};
}

function fusionPairKey(a,b){return a&&b&&a!==b?[String(a),String(b)].sort().join('+'):'';}

function monsterTier(kind){return Math.max(1,Math.min(7,Number(FOES[kind]&&FOES[kind].fusionTier)||1));}

function mixMonsterColor(a,b){
  const pa=parseInt(String(a||'#777777').slice(1),16),pb=parseInt(String(b||'#999999').slice(1),16);
  const ch=s=>Math.round((((pa>>s)&255)+((pb>>s)&255))/2);
  return '#'+[ch(16),ch(8),ch(0)].map(v=>v.toString(16).padStart(2,'0')).join('');
}

function fusionEffectsOf(kind){
  const d=COMPANIONS[kind]||{type:'block',value:6};
  return (Array.isArray(d.effects)?d.effects:[{type:d.type,value:d.value}]).filter(e=>e&&e.type&&e.type!=='fusion');
}

function mergeFusionEffects(a,b,tier){
  const merged=new Map();
  fusionEffectsOf(a).concat(fusionEffectsOf(b)).forEach(e=>merged.set(e.type,(merged.get(e.type)||0)+(Number(e.value)||0)));
  const scored=[...merged].map(([type,value])=>{
    let v=value;
    if(['heal','block','strike','burn','regen'].includes(type))v=Math.max(1,Math.round(v*.68+tier));
    else if(['power','weaken'].includes(type))v=Math.min(.14,Math.max(.03,+(v*.72+tier*.004).toFixed(3)));
    else v=Math.max(1,Math.min(2,Math.round(v*.7)));
    const score=['power','weaken'].includes(type)?v*100:v;return {type,value:v,score};
  }).sort((x,y)=>y.score-x.score);
  return scored.slice(0,tier>=5?3:2).map(({type,value})=>({type,value}));
}

function registerFusionRecipe(a,b,result,n,region,index,tier=2,alternate=false){
  const key=fusionPairKey(a,b);if(!key||FUSION_BY_PAIR.has(key)||!FOES[a]||!FOES[b])return false;
  if(monsterTier(a)!==tier-1||monsterTier(b)!==tier-1)return false;
  const fa=FOES[a],fb=FOES[b],la=FLOOR_MONSTER_LOOK[a]||{},lb=FLOOR_MONSTER_LOOK[b]||{};
  if(!FOES[result]){
    const form=(Number(la.form)||0)+(Number(lb.form)||0)+index,bat=MONSTER_BATTLE_ARCHETYPES[(region*5+index+tier)%MONSTER_BATTLE_ARCHETYPES.length];
    const look={k:result,n,hp:Math.round((fa.hp+fb.hp)*(.66+tier*.015)),atk:Math.round((fa.atk+fb.atk)*(.56+tier*.012)),
      col:mixMonsterColor(la.col,lb.col),hi:mixMonsterColor(la.hi||'#eeeeee',lb.hi||'#ffffff'),form:form%6};
    FOES[result]={n,hp:look.hp,atk:look.atk,art:result,battleType:bat[0],abilityName:n+'・'+bat[1],fusionOnly:1,fusionTier:tier};
    FLOOR_MONSTER_LOOK[result]=look;
    COMPANIONS[result]={ic:tier===7?'🌟':tier>=5?'🔱':'🧬',skill:n+'・'+(tier===7?'終極共鳴':tier>=5?'神獸共鳴':'雙生共鳴'),type:'fusion',effects:mergeFusionEffects(a,b,tier)};
  }
  const rec={key,a,b,result,n,region:Math.max(0,region),index,tier,alternate:!!alternate};
  FUSION_RECIPES.push(rec);FUSION_BY_PAIR.set(key,rec);return true;
}

function uniqueStagePairs(keys,count,seed=0){
  const out=[],seen=new Set(),n=keys.length;
  for(let gap=1;gap<n&&out.length<count;gap++)for(let i=0;i<n&&out.length<count;i++){
    const a=keys[(i+seed)%n],b=keys[(i+gap+seed)%n],key=fusionPairKey(a,b);
    if(a!==b&&!seen.has(key)){seen.add(key);out.push([a,b]);}
  }
  return out;
}

function randomMonsterPersonality(){return MONSTER_PERSONALITIES[rand(MONSTER_PERSONALITIES.length)].id;}

function monsterPersonality(kind){return PERSONALITY_BY_ID[(S.monsterTraits||{})[kind]]||MONSTER_PERSONALITIES[0];}

function supportEffectLabel(type,value){
  const raw=Number(value)||0,cap={heal:24,block:32,mana:2,draw:2,power:.25,strike:18,burn:12,weaken:.20,luck:2,cleanse:2,regen:6}[type],v=cap===undefined?raw:Math.min(raw,cap),full=cap!==undefined&&raw>=cap?'（滿效）':'';
  return type==='heal'?'治療 '+v+full:type==='block'?'護盾 '+v+full:type==='mana'?'法力 +'+v+full:type==='draw'?'重抽 '+v+full:
    type==='power'?'傷害 +'+Math.round(v*100)+'%'+full:type==='strike'?'先制打擊 '+v+full:type==='burn'?'敵方燃燒 '+v+full:type==='weaken'?'敵方傷害 −'+Math.round(v*100)+'%'+full:
    type==='luck'?'幸運攻擊 '+v+full:type==='cleanse'?'淨化詛咒 '+v+full:type==='regen'?'每回合回復 '+v+full:'同行支援';
}

function companionSpecialTechnique(kind){return PET_SPECIAL_TECHNIQUES[kind]||null;}

function followerTriggerLabel(group){return (FOLLOWER_TRIGGER_META[group]||FOLLOWER_TRIGGER_META.assist).n;}

function companionDef(kind){
  const f=FOES[kind],d=COMPANIONS[kind]||{ic:'🐾',skill:'同行支援',type:'block',value:6};
  const effects=d.effects||[{type:d.type,value:d.value}],special=companionSpecialTechnique(kind),baseGroup=monsterSkillGroupByEffect((effects[0]||{}).type),baseGroupMeta=monsterSkillGroupMeta(baseGroup),group=d.group||(special&&special.trigger)||baseGroup,groupMeta=monsterSkillGroupMeta(group);
  const detail=effects.map(e=>supportEffectLabel(e.type,e.value)).join('＋');
  return {...d,kind,n:f?f.n:kind,boss:!!(f&&f.boss),fusion:!!(f&&f.fusionOnly),tier:monsterTier(kind),detail,group,groupMeta,baseGroup,baseGroupMeta,special};
}

function cleanCompanions(){
  S.monsterDex=[...new Set((Array.isArray(S.monsterDex)?S.monsterDex:[]).filter(k=>FOES[k]))];
  S.followers=[...new Set((Array.isArray(S.followers)?S.followers:[]).filter(k=>S.monsterDex.includes(k)))].slice(0,MAX_FOLLOWERS);
  S.monsterTraits=(S.monsterTraits&&typeof S.monsterTraits==='object')?S.monsterTraits:{};
  S.monsterDex.forEach(k=>{if(!PERSONALITY_BY_ID[S.monsterTraits[k]])S.monsterTraits[k]=randomMonsterPersonality();});
  Object.keys(S.monsterTraits).forEach(k=>{if(!S.monsterDex.includes(k))delete S.monsterTraits[k];});
  S.fusionBook=[...new Set((Array.isArray(S.fusionBook)?S.fusionBook:[]).filter(k=>FUSION_RECIPES.some(r=>r.key===k)))];
}

function isTestMonsterCharacter(){
  const launchName=classroomLaunch&&classroomLaunch.character&&classroomLaunch.character.name;
  return /^測試/.test(String(launchName||S.name||''));
}

function grantTestMonsterTeam(){
  if(!isTestMonsterCharacter()||S.followers.length>=MAX_FOLLOWERS)return false;
  const firstRecipes=FUSION_RECIPES.filter(r=>r.tier===2&&!r.alternate),pair=firstRecipes[rand(firstRecipes.length)];
  const chosen=[pair.a,pair.b],pool=shuffle(FUSION_TREE_KEYS[1].filter(k=>!chosen.includes(k)));
  while(chosen.length<MAX_FOLLOWERS&&pool.length)chosen.push(pool.pop());
  S.monsterDex=[...new Set((S.monsterDex||[]).concat(chosen))];S.followers=chosen.slice(0,MAX_FOLLOWERS);S.monsterTraits=S.monsterTraits||{};
  chosen.forEach(k=>{if(!PERSONALITY_BY_ID[S.monsterTraits[k]])S.monsterTraits[k]=randomMonsterPersonality();});
  cleanCompanions();return true;
}

function rollCaptureCandidate(){
  cleanCompanions();
  if(!B||!Array.isArray(B.foes))return null;
  /* 同種怪物一場只判定一次，避免大型怪群把實際機率疊得太高。 */
  const kinds=shuffle([...new Set(B.foes.map(f=>f.kind).filter(k=>FOES[k]&&!S.monsterDex.includes(k)))]);
  for(const kind of kinds){
    const d=companionDef(kind),rate=d.boss?COMPANION_RATE.boss:COMPANION_RATE.normal;
    if(Math.random()<rate)return {...d,personalityId:randomMonsterPersonality()};
  }
  return null;
}

function acceptCompanion(kind,released,personalityId){
  cleanCompanions();
  if(released){
    S.followers=S.followers.filter(k=>k!==released);
    S.monsterDex=S.monsterDex.filter(k=>k!==released);
    if(S.monsterTraits)delete S.monsterTraits[released];
  }
  if(!S.monsterDex.includes(kind))S.monsterDex.push(kind);
  S.monsterTraits=S.monsterTraits||{};S.monsterTraits[kind]=PERSONALITY_BY_ID[personalityId]?personalityId:randomMonsterPersonality();
  if(!S.followers.includes(kind)&&S.followers.length<MAX_FOLLOWERS)S.followers.push(kind);
  cleanCompanions();saveChar();updBar();
}

function capturePrompt(candidate,done){
  if(!candidate){done();return;}
  const d=candidate,rate=Math.round((d.boss?COMPANION_RATE.boss:COMPANION_RATE.normal)*100),per=PERSONALITY_BY_ID[d.personalityId]||MONSTER_PERSONALITIES[0];
  if(S.followers.length<MAX_FOLLOWERS){
    overlay(`<div class="kicker">MONSTER FRIEND</div><h1>${d.ic} ${hesc(d.n)}</h1>
      <div class="rank">${d.boss?'頭目':'一般怪物'}收服率 ${rate}%</div>
      <div class="desc">戰鬥後，<b>${hesc(d.n)}</b>願意成為夥伴。<br>${d.groupMeta.ic} <b style="color:${d.groupMeta.color}">${d.groupMeta.n}</b>：<b>${hesc(d.skill)}</b>（${hesc(d.detail)}）<br>個性：<b>${per.icon} ${hesc(per.n)}</b>・${hesc(per.desc)}<br><i>「${hesc(per.lines[0])}」</i><br><br>要同意牠加入隊伍嗎？</div>
      <button class="go" id="captureYes">同意加入</button>
      <button class="go" id="captureNo" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">婉拒</button>`,null,el=>{
        if(el.id==='captureYes'){acceptCompanion(d.kind,null,d.personalityId);toast(d.n+'加入隊伍！性格：'+per.n,1800);setTimeout(done,10);return true;}
        if(el.id==='captureNo'){setTimeout(done,10);return true;}return false;
      });
    return;
  }
  overlay(`<div class="kicker">PARTY FULL</div><h1>${d.ic} ${hesc(d.n)}</h1>
    <div class="desc">${hesc(d.n)}想加入，但隨從已滿 ${MAX_FOLLOWERS} 隻。<br>請選擇要和哪一位舊夥伴說再見；放生後未來仍有機會再次遇見。</div>
    <div class="comp-list">${S.followers.map(k=>{const o=companionDef(k);return `<div class="comp-row active" data-release="${hesc(k)}"><div class="ci">${o.ic}</div><div><b>和 ${hesc(o.n)} 說再見</b><span>${hesc(o.skill)}</span></div><em>更換</em></div>`;}).join('')}</div>
    <button class="go" id="captureNo" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">不更換</button>`,null,el=>{
      const row=el.closest('[data-release]');
      if(row){const old=row.dataset.release,oldName=companionDef(old).n;acceptCompanion(d.kind,old,d.personalityId);toast(oldName+'離隊，'+d.n+'（'+per.n+'）加入！',2200);setTimeout(done,10);return true;}
      if(el.id==='captureNo'){setTimeout(done,10);return true;}return false;
    });
}

function companionScreen(){
  cleanCompanions();
  const order=['preemptive','defense','attack','recovery','assist'],all=S.monsterDex.map(k=>companionDef(k)),counts={};
  all.forEach(d=>counts[d.group]=(counts[d.group]||0)+1);
  const rows=S.monsterDex.slice().filter(k=>companionSkillFilter==='all'||companionDef(k).group===companionSkillFilter)
    .sort((a,b)=>order.indexOf(companionDef(a).group)-order.indexOf(companionDef(b).group)||monsterTier(b)-monsterTier(a))
    .map(k=>{const d=companionDef(k),on=S.followers.includes(k),p=monsterPersonality(k);return `<div class="comp-row${on?' active':''}" data-comp="${hesc(k)}"><div class="ci">${d.ic}</div><div><b>${hesc(d.n)}　${p.icon}${hesc(p.n)}</b><span><i class="skill-kind" style="--sc:${d.groupMeta.color}">${d.groupMeta.ic} ${d.groupMeta.n}</i>${hesc(d.skill)}・${hesc(d.detail)}・${d.fusion?hesc(FUSION_TIER_LABEL[d.tier]):d.boss?'頭目 1%':'一階原生 3%'}</span></div><em data-comp-info="${hesc(k)}">ⓘ 能力</em></div>`;}).join('');
  const filters=[['all','全部','🐾','#ffe38a'],...order.map(k=>[k,MONSTER_SKILL_GROUPS[k].n,MONSTER_SKILL_GROUPS[k].ic,MONSTER_SKILL_GROUPS[k].color])]
    .map(([k,n,ic,col])=>`<button data-skill-filter="${k}" class="${companionSkillFilter===k?'on':''}" style="--sc:${col}">${ic} ${n}${k==='all'?'':` ${counts[k]||0}`}</button>`).join('');
  overlay(`<div class="kicker">COMPANIONS</div><h1>🐾 怪物夥伴</h1><div class="rank">同行 ${S.followers.length}/${MAX_FOLLOWERS}・圖鑑 ${S.monsterDex.length}/${Object.keys(FOES).length}</div>
    <div class="desc">技能分為<b>先制、防禦、攻擊、回復、輔助</b>五種觸發系。只在開場、被擊中、三連擊、低血量或負面狀態時進行機率判定；同一時機最多一隻發動。一般怪物收服率 <b>3%</b>，BOSS 為 <b>1%</b>。</div>
    <div class="skill-filter">${filters}</div>
    <div class="comp-list">${rows||'<div class="pempty">這個系別目前還沒有已收服怪物。</div>'}</div>
    ${classroomLaunch?`<button class="go" id="petCardCarry">🎴 選擇帶回班級的寵物卡（${(S.petCardCarry||[]).length}/5）</button>`:''}
    ${isTestMonsterCharacter()?'<button class="go" id="testBeastShrine">🧪 測試怪物神殿與七階合成樹</button>':''}
    <button class="go" id="compBack">返回地下城</button>`,null,el=>{
      if(el.id==='compBack'){backToDungeon();return true;}
      if(el.id==='petCardCarry'){setTimeout(()=>petCardCarryScreen(companionScreen),10);return true;}
      if(el.id==='testBeastShrine'){monsterFusionSel=[];setTimeout(()=>beastShrineScreen(null,'測試模式：不需要先抵達第 5 樓'),10);return true;}
      const filter=el.closest('[data-skill-filter]');if(filter){companionSkillFilter=filter.dataset.skillFilter;setTimeout(companionScreen,10);return true;}
      const info=el.closest('[data-comp-info]');if(info){setTimeout(()=>companionInfoScreen(info.dataset.compInfo),10);return true;}
      const row=el.closest('[data-comp]');if(!row)return false;
      const k=row.dataset.comp,on=S.followers.includes(k);
      if(on)S.followers=S.followers.filter(x=>x!==k);
      else if(S.followers.length<MAX_FOLLOWERS)S.followers.push(k);
      else{toast('最多只能帶 '+MAX_FOLLOWERS+' 隻夥伴；請先讓一隻待命',1800);return true;}
      cleanCompanions();saveChar();setTimeout(companionScreen,10);return true;
    });
}

function petCardCarryScreen(done){
  cleanCompanions();S.petCardCarry=Array.isArray(S.petCardCarry)?S.petCardCarry.filter(k=>S.monsterDex.includes(k)).slice(0,5):[];
  const rows=S.monsterDex.slice().sort((a,b)=>monsterTier(b)-monsterTier(a)||companionDef(a).n.localeCompare(companionDef(b).n,'zh-Hant'))
    .map(k=>{const d=companionDef(k),on=S.petCardCarry.includes(k),p=monsterPersonality(k);return `<div class="comp-row${on?' active':''}" data-pet-carry="${hesc(k)}"><div class="ci"><img src="${petCardArtData(k)}" alt="${hesc(d.n)}" style="width:44px;height:44px;image-rendering:pixelated;object-fit:contain"></div><div><b>${hesc(d.n)}　${p.icon}${hesc(p.n)}</b><span>${hesc(FUSION_TIER_LABEL[d.tier]||'Ⅰ 一階原生')}・${d.groupMeta.ic}${hesc(d.groupMeta.n)}</span></div><em>${on?'✓ 已選':'＋ 選擇'}</em></div>`;}).join('');
  overlay(`<div class="kicker">PET CARDS</div><h1>🎴 帶回寵物卡</h1><div class="rank">已選 ${(S.petCardCarry||[]).length}/5</div>
    <div class="desc">每次由班級系統進入地下城，最多選擇五種已收服夥伴成為寵物卡。回傳後可在學生介面的「寵物商店」展示、升階，或直接製作一般／稀有／唯一傳說裝備。</div>
    <div class="comp-list">${rows||'<div class="pempty">還沒有收服可選擇的寵物。</div>'}</div>
    <button class="go" id="petCarryDone">確認選擇</button>`,null,el=>{
      if(el.id==='petCarryDone'){saveChar();setTimeout(done||companionScreen,10);return true;}
      const row=el.closest('[data-pet-carry]');if(!row)return false;const k=row.dataset.petCarry,at=S.petCardCarry.indexOf(k);
      if(at>=0)S.petCardCarry.splice(at,1);else if(S.petCardCarry.length<5)S.petCardCarry.push(k);else{toast('每次最多帶回五張寵物卡',1600);return true;}
      saveChar();setTimeout(()=>petCardCarryScreen(done),10);return true;
    });
}

function companionInfoScreen(kind){
  cleanCompanions();const d=companionDef(kind),f=FOES[kind]||{},p=monsterPersonality(kind),on=S.followers.includes(kind);
  const base=(d.effects||[{type:d.type,value:d.value}]).map(e=>supportEffectLabel(e.type,e.value)).join('＋');
  overlay(`<div class="kicker">MONSTER PROFILE</div><h1>${d.ic} ${hesc(d.n)}</h1>
    <div class="rank" style="color:${d.groupMeta.color};border-color:${d.groupMeta.color}">${d.groupMeta.ic} ${d.groupMeta.n}・${d.fusion?hesc(FUSION_TIER_LABEL[d.tier]):d.boss?'頭目夥伴':'一階怪物夥伴'}・${on?'同行中':'待命中'}</div>
    <div class="mathbox"><div class="ml"><b>${d.baseGroupMeta.ic} ${d.baseGroupMeta.n}｜${hesc(d.skill)}</b><br>${hesc(d.baseGroupMeta.d)}<br>發動時機：<b>${hesc(followerTriggerLabel(d.baseGroup))}</b>・目前機率 <b>${Math.round(followerProcChance(kind,d.baseGroup,false)*100)}%</b><br>效果：${hesc(base)}</div>
      ${d.special?`<div class="ml"><b>🌟 專屬特技｜${hesc(d.special.n)}</b><br>${hesc(followerTriggerLabel(d.special.trigger))}時判定・目前機率 <b>${Math.round(followerProcChance(kind,d.special.trigger,true)*100)}%</b>・每場最多一次。<br>${hesc(d.special.effects.map(e=>supportEffectLabel(e.type,e.value)).join('＋'))}</div>`:''}
      <div class="ml"><b>${monsterSkillGroupMeta(monsterBattleSkillGroup(f.battleType)).ic} 野生${monsterSkillGroupMeta(monsterBattleSkillGroup(f.battleType)).n}｜${hesc(f.abilityName||'同行支援')}</b><br>${hesc(MONSTER_BATTLE_DESC[f.battleType]||'以自己的物種方式協助隊伍。')}</div>
      <div class="ml"><b>個體性格｜${p.icon} ${hesc(p.n)}</b><br>${hesc(p.desc)}<br>性格加成：${hesc(supportEffectLabel(p.extra.type,p.extra.value))}</div>
      <div class="ml"><b>SEL 心聲</b><br>「${hesc(p.lines[0])}」<br>「${hesc(p.lines[1])}」</div>
      <div class="ml">隊伍平衡：同一觸發時機最多一隻寵物成功發動；各寵物有每場次數限制，治療、護盾、法力與增傷仍受全隊上限約束。</div></div>
    <button class="go" id="compToggle">${on?'設為待命':'加入同行'}</button><button class="go" id="compInfoBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回夥伴列表</button>`,null,el=>{
      if(el.id==='compInfoBack'){setTimeout(companionScreen,10);return true;}
      if(el.id==='compToggle'){
        if(on)S.followers=S.followers.filter(k=>k!==kind);else if(S.followers.length<MAX_FOLLOWERS)S.followers.push(kind);else{toast('同行隊伍已滿 '+MAX_FOLLOWERS+' 隻',1500);return true;}
        cleanCompanions();saveChar();setTimeout(()=>companionInfoScreen(kind),10);return true;
      }return false;
    });
}

function currentFusionRecipe(){return monsterFusionSel.length===2?FUSION_BY_PAIR.get(fusionPairKey(monsterFusionSel[0],monsterFusionSel[1]))||null:null;}

function performMonsterFusion(rec){
  cleanCompanions();
  if(!rec||!S.monsterDex.includes(rec.a)||!S.monsterDex.includes(rec.b)||S.monsterDex.includes(rec.result))return false;
  S.monsterDex=S.monsterDex.filter(k=>k!==rec.a&&k!==rec.b);
  S.followers=S.followers.filter(k=>k!==rec.a&&k!==rec.b);
  S.monsterTraits=S.monsterTraits||{};delete S.monsterTraits[rec.a];delete S.monsterTraits[rec.b];
  S.monsterDex.push(rec.result);
  S.monsterTraits[rec.result]=randomMonsterPersonality();
  if(S.followers.length<MAX_FOLLOWERS)S.followers.push(rec.result);
  S.fusionBook=S.fusionBook||[];if(!S.fusionBook.includes(rec.key))S.fusionBook.push(rec.key);
  monsterFusionSel=[];cleanCompanions();saveChar();updBar();return true;
}

function fusionConfirm(rec,pr){
  const a=companionDef(rec.a),b=companionDef(rec.b),r=companionDef(rec.result);
  overlay(`<div class="kicker">MONSTER FUSION</div><h1>🧬 ${hesc(r.n)}</h1>
    <div class="rank">${hesc(FUSION_TIER_LABEL[rec.tier])}${rec.alternate?'・替代路線':''}</div>
    <div class="fusion-picks"><div class="fusion-pick"><div>${a.ic}<b>${hesc(a.n)}</b></div></div><div class="fusion-plus">＋</div><div class="fusion-pick"><div>${b.ic}<b>${hesc(b.n)}</b></div></div></div>
    <div class="fusion-preview">誕生：${r.ic} ${hesc(r.n)}<br>${hesc(r.detail)}</div>
    <div class="desc">融合後兩隻素材會從圖鑑與同行隊伍中<b>消失</b>，新物種會加入圖鑑；隊伍未滿時會自動同行。這個動作無法復原。</div>
    <button class="go" id="fusionYes">確認融合</button><button class="go" id="fusionNo" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回選擇</button>`,null,el=>{
      if(el.id==='fusionNo'){setTimeout(()=>beastShrineScreen(pr),10);return true;}
      if(el.id==='fusionYes'){
        const ok=performMonsterFusion(rec);toast(ok?'🧬 '+r.n+' 誕生！':'素材已變動，沒有進行融合',2200);
        setTimeout(()=>ok?fusionBirthScreen(rec,pr):beastShrineScreen(pr,'融合取消'),10);return true;
      }return false;
    });
}

function fusionBirthScreen(rec,pr){
  const r=companionDef(rec.result),identity=monsterIdentity(rec.result);
  overlay(`<div class="kicker">NEW SPECIES</div><h1>咦？好像有新的寵物誕生！</h1>
    <div class="pet-dex-hero"><img src="${petCardArtData(rec.result)}" alt="${hesc(r.n)}"></div>
    <div class="rank">${hesc(FUSION_TIER_LABEL[r.tier])}・${r.groupMeta.ic} ${hesc(r.groupMeta.n)}</div>
    <div class="pet-dex-title">${hesc(r.n)}<br><small>${hesc(identity.title)}</small></div>
    ${r.special?`<div class="fusion-preview">🌟 專屬特技：${hesc(r.special.n)}・${hesc(followerTriggerLabel(r.special.trigger))}發動</div>`:''}
    <button class="go" id="fusionBirthOk">把新寵物帶回神殿</button>`,null,el=>{if(el.id==='fusionBirthOk'){setTimeout(()=>beastShrineScreen(pr,'新物種已登錄：'+r.n),10);return true;}return false;});
}

function beastShrineScreen(pr,msg=''){
  cleanCompanions();
  const ingredients=new Set(FUSION_RECIPES.flatMap(r=>[r.a,r.b]));
  const owned=S.monsterDex.filter(k=>ingredients.has(k)).sort((a,b)=>monsterTier(b)-monsterTier(a));
  const rec=currentFusionRecipe(),already=rec&&S.monsterDex.includes(rec.result);
  const pick=k=>{const d=k?companionDef(k):null;return `<div class="fusion-pick">${d?`<div>${d.ic}<b>${hesc(d.n)}</b><small>${hesc(FUSION_TIER_LABEL[d.tier])}</small></div>`:'選擇怪物'}</div>`;};
  const rows=owned.map(k=>{const d=companionDef(k),on=monsterFusionSel.includes(k);return `<div class="comp-row${on?' fusion-selected':''}" data-fusion-kind="${hesc(k)}"><div class="ci">${d.ic}</div><div><b>${hesc(d.n)}</b><span>${hesc(FUSION_TIER_LABEL[d.tier])}・${hesc(d.detail)}</span></div><em>${on?'已選':'選擇'}</em></div>`;}).join('');
  const topTier=Math.max(1,...S.monsterDex.map(monsterTier));
  overlay(`<div class="kicker">BEAST SHRINE</div><h1>🧬 怪物神殿</h1><div class="rank">最高 ${hesc(FUSION_TIER_LABEL[topTier])}・已使用路線 ${S.fusionBook.length}/${FUSION_RECIPES.length}</div>
    ${msg?`<div class="fusion-preview">${hesc(msg)}</div>`:''}
    <div class="desc">選擇兩種<b>同一階、不同物種</b>的怪物逐階融合。低階物種可供多條高階路線利用；同一對素材的正反順序只登記一次。融合後素材消失。</div>
    <div class="fusion-picks">${pick(monsterFusionSel[0])}<div class="fusion-plus">＋</div>${pick(monsterFusionSel[1])}</div>
    ${rec?`<div class="fusion-preview"><b>咦？好像有新的寵物誕生！</b><br>${hesc(FUSION_TIER_LABEL[rec.tier])}${rec.alternate?'・替代路線':''}：🧬 ${hesc(FOES[rec.result].n)}${already?'（已擁有，不能重複融合）':''}</div>`:monsterFusionSel.length===2?'<div class="desc" style="color:#ff9a8a;text-align:center">必須選擇合成樹中同一階的指定配對。</div>':''}
    <div class="comp-list">${rows||'<div class="pempty">尚未收服可作為融合素材的怪物。</div>'}</div>
    <button class="go" id="fusionDo"${!rec||already?' disabled style="filter:grayscale(1);opacity:.45"':''}>開始融合</button>
    <button class="go" id="fusionBook">📜 查看完整合成表</button>
    <button class="go" id="beastLeave" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">離開神殿</button>`,null,el=>{
      if(el.id==='beastLeave'){monsterFusionSel=[];backToDungeon();return true;}
      if(el.id==='fusionBook'){setTimeout(()=>fusionBookScreen(pr),10);return true;}
      if(el.id==='fusionDo'&&rec&&!already){setTimeout(()=>fusionConfirm(rec,pr),10);return true;}
      const row=el.closest('[data-fusion-kind]');if(!row)return false;
      const k=row.dataset.fusionKind,at=monsterFusionSel.indexOf(k);
      if(at>=0)monsterFusionSel.splice(at,1);
      else if(monsterFusionSel.length<2)monsterFusionSel.push(k);
      else{toast('已選兩隻，請先取消其中一隻',1500);return true;}
      setTimeout(()=>beastShrineScreen(pr),10);return true;
    });
}

function fusionBookScreen(pr){
  cleanCompanions();
  const tierBlocks=[];
  tierBlocks.push(`<section class="fusion-tier-block tier-1"><div class="fusion-tier-head">${hesc(FUSION_TIER_LABEL[1])}<span>${FUSION_TREE_KEYS[1].length} 種融合素材</span></div><div class="desc">探索六區地城並收服原生怪物，從這一層開始向上融合。</div></section>`);
  for(let tier=2;tier<=7;tier++){
    const routes=FUSION_RECIPES.filter(r=>r.tier===tier),species=new Set(routes.map(r=>r.result));
    const rows=routes.map(rec=>{const done=S.fusionBook.includes(rec.key),a=companionDef(rec.a),b=companionDef(rec.b),r=companionDef(rec.result),art=tier>=4?`<img class="fusion-mon-art" src="${petCardArtData(rec.result)}" alt="${hesc(r.n)}">`:`<div class="fusion-mon-icon">${r.ic}</div>`;return `<div class="recipe-row${done?' done':''}${rec.alternate?' alt':''}">${art}<div><b>${a.ic} ${hesc(a.n)} ＋ ${b.ic} ${hesc(b.n)}</b><span>→ ${r.ic} ${hesc(r.n)}・${hesc(r.detail)}</span></div><em>${done?'已融合':rec.alternate?'替代路線':'未完成'}</em></div>`;}).join('');
    tierBlocks.push(`<section class="fusion-tier-block tier-${tier}"><div class="fusion-tier-head">${hesc(FUSION_TIER_LABEL[tier])}<span>${species.size} 種・${routes.length} 條路線</span></div><div class="fusion-tier-nodes">${rows}</div></section>`);
  }
  overlay(`<div class="kicker">FUSION CODEX</div><h1>🌳 七階怪物合成樹</h1><div class="rank">${Object.keys(FOES).length} 種圖鑑・${FUSION_RECIPES.length} 條去重路線・6 種終極怪物</div>
    <div class="desc">由下往上逐階合成。五階以上有替代路線，可重複利用曾收服的低階物種；素材消耗後可再次收服。同一對素材的反向順序不重複列出。</div><div class="fusion-tree">${tierBlocks.join('')}</div>
    <button class="go" id="fusionBack">返回怪物神殿</button>`,null,el=>{if(el.id==='fusionBack'){setTimeout(()=>beastShrineScreen(pr),10);return true;}return false;});
}

function petCodexScreen(filter='all'){
  cleanCompanions();filter=String(filter||'all');const owned=new Set(S.monsterDex||[]);
  const all=Object.keys(FOES).filter(k=>FOES[k]&&FOES[k].art).sort((a,b)=>monsterTier(b)-monsterTier(a)||String(FOES[a].n).localeCompare(String(FOES[b].n),'zh-Hant'));
  const shown=filter==='all'?all:all.filter(k=>monsterTier(k)===Number(filter));
  const counts=Array.from({length:7},(_,i)=>all.filter(k=>monsterTier(k)===i+1).length);
  const filters=[['all','全部 '+all.length],...[1,2,3,4,5,6,7].map(t=>[String(t),['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ'][t-1]+'階 '+counts[t-1]])];
  const cards=shown.map(k=>{const f=FOES[k],d=companionDef(k),tier=monsterTier(k),g=d.groupMeta||monsterSkillGroupMeta(d.group),has=owned.has(k),identity=monsterIdentity(k);return `<div class="pet-dex-card tier-${tier}${has?' owned':''}" data-pet-dex="${hesc(k)}"><em>${has?'✓ 已收服':'未收服'}</em><img loading="lazy" src="${petCardArtData(k)}" alt="${hesc(f.n)}"><b>${hesc(f.n)}</b><strong>${hesc(identity.theme.n)}・${hesc(identity.species.n)}</strong><small>${hesc(FUSION_TIER_LABEL[tier]||'Ⅰ 一階原生')}・${g.ic}${hesc(g.n)}${f.boss?'・👑BOSS':''}</small></div>`;}).join('');
  overlay(`<div class="kicker">PET CODEX</div><h1>🐾 完整寵物圖鑑</h1>
    <div class="pet-dex-summary"><span>物種 ${all.length}</span><span>已收服 ${owned.size}</span><span>六階 ${counts[5]}</span><span>七階終極 ${counts[6]}</span></div>
    <div class="desc">所有圖像皆為地城實際戰鬥與寵物卡使用的像素圖。點擊任一寵物可查看技能、能力與取得類型。</div>
    <div class="pet-dex-filter">${filters.map(x=>`<button data-pet-tier="${x[0]}" class="${filter===x[0]?'on':''}">${x[1]}</button>`).join('')}</div>
    <div class="pet-dex-grid">${cards||'<div class="pempty">此階目前沒有寵物。</div>'}</div>
    <button class="go" id="petDexBack">返回選單</button>`,null,el=>{
      const tierBtn=el.closest('[data-pet-tier]');if(tierBtn){setTimeout(()=>petCodexScreen(tierBtn.dataset.petTier),10);return true;}
      const card=el.closest('[data-pet-dex]');if(card){setTimeout(()=>petCodexDetail(card.dataset.petDex,filter),10);return true;}
      if(el.id==='petDexBack'){setTimeout(menuScreen,10);return true;}return false;
    });
}

function petCodexDetail(kind,filter='all'){
  const f=FOES[kind];if(!f){petCodexScreen(filter);return;}const d=companionDef(kind),tier=monsterTier(kind),g=d.groupMeta||monsterSkillGroupMeta(d.group),has=(S.monsterDex||[]).includes(kind),p=has?monsterPersonality(kind):null,identity=monsterIdentity(kind);
  const source=f.fusionOnly?FUSION_TIER_LABEL[tier]+'融合物種'+(f.boss?'・終極 BOSS':''):f.boss?'地城頭目（擊敗後 1% 邀請）':'地城原生物種（擊敗後 3% 邀請）';
  overlay(`<div class="kicker">PET PROFILE</div><h1>${hesc(f.n)}</h1><div class="pet-dex-title">${hesc(identity.title)}</div><div class="pet-dex-hero"><img src="${petCardArtData(kind)}" alt="${hesc(f.n)}"></div>
    <div class="rank">${hesc(FUSION_TIER_LABEL[tier]||'Ⅰ 一階原生')}・${g.ic} ${hesc(g.n)}${f.boss?'・👑 BOSS':''}・${has?'✓ 已收服':'尚未收服'}</div>
    <div class="pet-dex-identity"><div><b>外觀識別</b>${hesc(identity.visual)}</div><div><b>物種小傳</b>${hesc(identity.lore)}</div></div>
    <div class="mathbox"><div class="mh">${hesc(d.skill||f.abilityName||'同行支援')}</div><div class="ml">主技能時機：${hesc(followerTriggerLabel(d.baseGroup))}・效果：${hesc(d.detail||'同行時提供支援')}</div>${d.special?`<div class="ml">🌟 專屬特技：<b>${hesc(d.special.n)}</b>（${hesc(followerTriggerLabel(d.special.trigger))}・每場最多一次）</div>`:''}<div class="ml">野生能力：${hesc(f.abilityName||MONSTER_BATTLE_DESC[f.battleType]||'物種戰鬥特性')}</div><div class="ml">取得方式：${hesc(source)}</div>${p?`<div class="ml">性格：${p.icon}${hesc(p.n)}・${hesc(p.desc||'')}</div>`:''}</div>
    <button class="go" id="petDexDetailBack">返回完整圖鑑</button>`,null,el=>{if(el.id==='petDexDetailBack'){setTimeout(()=>petCodexScreen(filter),10);return true;}return false;});
}

function applyOneFollowerEffect(e){
  const t=e.type,v=Number(e.value)||0,T=B.followerTotals||(B.followerTotals={heal:0,block:0,mana:0,draw:0,power:0,strike:0,burn:0,weaken:0,luck:0,cleanse:0,regen:0});
  if(t==='heal'){const allow=Math.max(0,24-T.heal),before=S.hp,n=Math.min(allow,v);S.hp=Math.min(S.maxhp,S.hp+n);const got=S.hp-before;T.heal+=got;return got?'治療 +'+got:'治療已滿';}
  if(t==='block'){const got=gainPlayerBlock(Math.min(v,Math.max(0,32-T.block)));T.block+=got;return '護盾 +'+got;}
  if(t==='mana'){const before=B.mana,cap=(S.mana||6)+2+(B.manaBonus||0);B.followerMana=Math.min(2,(B.followerMana||0)+v);B.mana=Math.min(cap,B.mana+v);const got=B.mana-before;T.mana+=got;return '法力 +'+got;}
  if(t==='draw'){if(T.draw>=2)return '預視已滿';if(B.hand.length){B.disc.push(B.hand.pop());drawCards(1);T.draw++;return '重抽 1';}return '無牌可換';}
  if(t==='power'){const before=B.followerPower||0;B.followerPower=Math.min(.25,before+v);const got=B.followerPower-before;T.power+=got;return '傷害 +'+Math.round(got*100)+'%';}
  if(t==='strike'){const f=B.foes.find(x=>!x.dead&&!x.row)||B.foes.find(x=>!x.dead),allow=Math.max(0,18-T.strike),got=f?Math.min(allow,v,Math.max(0,f.hp-1)):0;if(f&&got){f.hp-=got;T.strike+=got;}return got?'先制打擊 '+got:'打擊無目標';}
  if(t==='burn'){const got=Math.min(v,Math.max(0,12-T.burn));B.foes.filter(f=>!f.dead).forEach(f=>f.burn=(f.burn||0)+got);T.burn+=got;return '全敵燃燒 +'+got;}
  if(t==='weaken'){const before=B.followerWeaken||0;B.followerWeaken=Math.min(.20,before+v);const got=B.followerWeaken-before;T.weaken+=got;B.foes.forEach(f=>{if(f.act==='atk')f.intent=Math.max(1,Math.round(f.intent*(1-got)));});return '敵傷 −'+Math.round(got*100)+'%';}
  if(t==='luck'){const before=B.luckHits||0;B.luckHits=Math.min(2,before+v);const got=B.luckHits-before;T.luck+=got;return '幸運攻擊 +'+got;}
  if(t==='cleanse'){let left=Math.min(v,2-T.cleanse),got=0;for(const pile of [B.hand,B.draw,B.disc])for(let i=pile.length-1;i>=0&&left>0;i--)if(pile[i].id==='curse'){pile.splice(i,1);left--;got++;}T.cleanse+=got;return '淨化 '+got;}
  if(t==='regen'){const before=B.followerRegen||0;B.followerRegen=Math.min(6,before+v);const got=B.followerRegen-before;T.regen+=got;return '每回合回復 +'+got;}
  return '支援';
}

function followerHasNegativeStatus(ctx={}){
  if(ctx.status)return true;
  const piles=B?[B.hand||[],B.draw||[],B.disc||[]]:[];
  return !!(B&&((B.dmgPenalty||0)>0||piles.some(p=>p.some(c=>c&&c.id==='curse'))));
}

function followerProcChance(kind,event,hasSpecial=false){
  const meta=FOLLOWER_TRIGGER_META[event]||FOLLOWER_TRIGGER_META.assist,tier=monsterTier(kind),f=FOES[kind]||{};
  return Math.min(meta.max,meta.base+tier*meta.tier+(f.boss ? .025 : 0)+(tier>=6 ? .035 : 0)+(hasSpecial ? .025 : 0));
}

function followerPayload(kind,event){
  const d=companionDef(kind),p=monsterPersonality(kind),base=(d.effects||[{type:d.type,value:d.value}]).filter(e=>monsterSkillGroupByEffect(e.type)===event);
  if(p.extra&&monsterSkillGroupByEffect(p.extra.type)===event)base.push(p.extra);
  const special=d.special&&d.special.trigger===event&&!(B.followerSpecialUsed||{})[kind]?d.special:null;
  return {d,p,special,effects:base.concat(special?special.effects:[])};
}

function triggerFollowerSkills(event,ctx={}){
  cleanCompanions();if(!B||B.over||!S.followers.length)return false;
  if(event==='attack'&&Number(ctx.chain||B.chain)<3)return false;
  if(event==='recovery'&&S.hp/Math.max(1,S.maxhp)>=.70)return false;
  if(event==='assist'&&!followerHasNegativeStatus(ctx))return false;
  const turn=Math.max(0,Number(B.turnNo)||0),meta=FOLLOWER_TRIGGER_META[event]||FOLLOWER_TRIGGER_META.assist;
  B.followerEventTurn=B.followerEventTurn||{};if(event!=='preemptive'&&B.followerEventTurn[event]===turn)return false;
  B.followerTriggerCount=B.followerTriggerCount||{};B.followerSpecialUsed=B.followerSpecialUsed||{};
  const pool=shuffle(S.followers.slice());
  for(const kind of pool){
    const key=kind+':'+event,count=B.followerTriggerCount[key]||0,payload=followerPayload(kind,event);
    if(count>=meta.limit||!payload.effects.length)continue;
    const chance=followerProcChance(kind,event,!!payload.special);if(Math.random()>=chance)continue;
    B.followerTriggerCount[key]=count+1;B.followerEventTurn[event]=turn;if(payload.special)B.followerSpecialUsed[kind]=1;
    const notes=payload.effects.map(applyOneFollowerEffect),index=Math.max(0,S.followers.indexOf(kind));
    setTimeout(()=>companionAbilityFx(kind,index,payload.effects[0],payload.special?payload.special.n:payload.d.skill),20);
    renderAll();toast(payload.d.ic+' '+payload.d.n+' 發動'+(payload.special?'特技「'+payload.special.n+'」':'「'+payload.d.skill+'」')+'！'+notes.join('＋')+'（'+Math.round(chance*100)+'%）',2400);
    return true;
  }
  return false;
}

function applyFollowerSupport(){
  cleanCompanions();if(!B||B.followersApplied)return;B.followersApplied=true;
  B.followerTriggerCount={};B.followerSpecialUsed={};B.followerEventTurn={};
  triggerFollowerSkills('preemptive',{opening:true});
  triggerFollowerSkills('assist',{});
  const leadKind=S.followers[0],leadP=leadKind&&monsterPersonality(leadKind);
  if(leadP)setTimeout(()=>toast(leadP.icon+' '+companionDef(leadKind).n+'：'+leadP.lines[rand(leadP.lines.length)],2200),1600);
}
