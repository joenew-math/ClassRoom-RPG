/*
 * classroom-student：學生角色頁、課後白名單、公告抽卡、背包、商店與工坊介面控制器。
 * 本檔沿用 classic script 全域依賴，必須在固定資料、雲端與登入控制器之後、主程式之前載入。
 */

function renderStudent(){
  const s = stu(view.sid);
  if(!s){ view={page:"home"}; render(); return; }
  const afterSchoolMode=view.accessMode==="afterSchool";
  const afterSchoolTabs=["stats","help","dungeon","announce","wheel"];
  if(afterSchoolMode&&!afterSchoolTabs.includes(view.tab))view.tab="stats";
  const liveLesson=state.lesson||{};
  if(!afterSchoolMode&&liveLesson.active&&liveLesson.mode==="zone"){
    view.studentMenu=false;
    renderStudentZoneInterface(s,liveLesson);
    return;
  }
  if(!classFeatureUnlocked(view.tab||"stats")) view.tab="stats";
  if(view.tab==="wheel" && s.readDate!==todayStr()) view.tab="announce";
  garenaStudentInit(s.id);                                   // 掛團體戰監聽(進場自動彈遙控器)
  const e = equipStatSum(s);
  const nxt = xpForNextLevel(s.level);
  const xpPct = Math.min(100, Math.round(s.xp/nxt*100));
  const effMax = s.maxHp + skillMaxHpBonus(s);
  const hpPct = Math.round(s.currentHp/effMax*100);
  const landscapeHint=sessionStorage.getItem("rpgLandscapeHintDismissed")==="1"?"":'<div class="student-landscape-hint" id="studentLandscapeHint"><span>📱 建議將手機轉成橫向，角色、商店與答題區會更清楚。</span><button class="btn" id="studentLandscapeHintClose">知道了</button></div>';
  const slotHtml = (slot)=>{
    const it = itemById(s[slot+"Id"]);
    return '<div class="slot '+(it?"filled":"")+'" title="'+esc(it?it.name:"無"+TYPE_NAME[slot])+'">'
      + '<span>'+(it?TYPE_ICON[it.type]:"·")+'</span>'
      + '<span>'+(it?esc(it.name):"無"+TYPE_NAME[slot])+'</span>'
      + '</div>';
  };
  const bonus = (base, extra)=> extra ? base+extra+' <span class="mini">(+'+extra+')</span>' : String(base);
  const myPend = tasksForStudent(s).filter(t=>{ const x=subFor(t.id,s.id); return !x || x.status==="rejected"; }).length;
  const readOk_ = s.readDate===todayStr();
  const isLeader=isGroupLeader(s), leaderQueueN=isLeader?leaderReviewQueue(s).length:0;
  const isCastleLord = state.castle && state.castle.owner && state.castle.owner===s.group && state.groupLeaders[s.group]===s.id;
  // 抽卡編入公告內：學生必須先閱讀當日公告，再由公告頁進入卡包。
  const studentTabDefs = [["stats","🏠 我的角色"],["help","🫶 學習回饋"],["quests","📌 任務"+(myPend?"("+myPend+")":"")],["lesson","📣 課堂冒險"],["dungeon","🏰 地下城複習"], ["skills","🌳 技能樹"+(s.spPoints>0&&skillsEnabled()?"(+"+s.spPoints+")":"")],["bag","🎒 背包"],["shop","🛒 商店"],["craft","🎨 工坊"],["announce","📣 公告與抽卡"+(readOk_?"":"❗")],["redeem","🎁 兌獎"],["thanks","💌 感謝"+((s.thanksNew||0)>0?"("+s.thanksNew+")":"")],["board","🏆 小組進度"]]
    .concat(isLeader ? [["leaderReview","🛡️ 組長代審"+(leaderQueueN?"("+leaderQueueN+")":"")]] : [])
    .concat(isCastleLord ? [["castle","🏰 城堡商店"]] : [])
    .filter(([k])=>!afterSchoolMode||afterSchoolTabs.includes(k));
  const tabs = studentTabDefs.map(([k,n])=>{ const open=classFeatureUnlocked(k); return '<button class="tab '+(view.tab===k?"on ":"")+(open?'':'feature-locked')+'" '+(open?'data-tab="'+k+'"':'data-locked-feature="'+k+'"')+'>'+(open?'':'🔒 ')+n+'</button>'; }).join("");
  const currentStudentTab=studentTabDefs.find(([k])=>k===view.tab)||(view.tab==="wheel"?["announce","📣 公告與抽卡"]:studentTabDefs[0]);
  const currentEntryToken=String(new URLSearchParams(location.search).get("session")||"");
  const canShareClassQr=view.role==="student"&&!!CLOUD.cid&&classSessionIsLive(state.classSession,currentEntryToken);
  const studentMenu='<div class="board-launcher feature-launcher student-launcher"><button class="btn gold board-launcher-main" id="studentMenuToggle">☰ '+currentStudentTab[1]+(view.studentMenu?"　收合 ▲":"　功能選單 ▼")+'</button>'
    +(view.studentMenu?'<div class="board-launcher-panel">'+tabs+'</div>':'')+'</div>';

  let body = "";
  if(view.tab==="help"){
    const pending=(state.helpRequests||[]).find(x=>String(x.sid)===String(s.id)&&x.status==="pending");
    body='<div class="panel" style="max-width:680px;margin:auto;background:linear-gradient(135deg,#effff6,#eef6ff)"><h3>🫶 學習回饋</h3><div class="mini" style="line-height:1.8;margin-bottom:12px">內容只有老師可以查看，不會公開給同學、不會影響個人或全班經驗值。若現在有立即危險，請直接找附近老師或可信任的大人。</div>'
      +(pending?'<div class="unlock-note" style="border-color:#2b7a57">✅ 老師已收到你的求助，會找適當時間私下關心你。<br><button class="btn" data-help-cancel="'+esc(pending.id)+'" style="margin-top:9px">我誤點了，取消通知</button></div>':'<div class="shop-grid">'+Object.entries(HELP_REQUEST_OPTIONS).map(([key,o])=>'<button class="item-card" data-helprequest="'+key+'" style="cursor:pointer;text-align:left"><span class="iic">'+o.icon+'</span><span class="inm">'+esc(o.label)+'</span><span class="mini">點選後還會再確認一次</span></button>').join("")+'</div>')+'</div>';
  }
  else if(view.tab==="lesson"){
    const l=state.lesson||{}, st=s.learningStreak||{days:0,total:0};
    const answered=!!(l.answered&&l.answered[s.id]);
    const hist=(state.log||[]).filter(x=>x.sid===s.id&&x.msg.indexOf("回答知識挑戰")>=0).slice(0,5).map(x=>'<li><span class="num">['+esc(x.t)+']</span> '+esc(x.msg)+'</li>').join("")||'<li class="mini">勇敢舉手、說出你的想法，第一筆冒險紀錄正在等你！</li>';
    body=l.active&&l.mode==="zone"?zoneStudentHtml(s,l):'<div class="panel" style="background:linear-gradient(135deg,#edf7ff,#fff8df)"><h3>📣 我的課堂冒險</h3><div style="display:flex;gap:10px;flex-wrap:wrap;margin:10px 0"><span class="stat-chip">🔥 學習連勝 <b class="num">'+(st.days||0)+' 天</b></span><span class="stat-chip">💡 總回答 <b class="num">'+(s.lessonAnswers||0)+' 次</b></span><span class="stat-chip">🏅 今日狀態 <b>'+(st.date===todayStr()?"已累積連勝":"等待第一題")+'</b></span></div>'
      +(l.active?'<div class="panel" style="margin:10px 0;border-color:#e2a500"><h3 style="margin:0">⚡ 進行中：'+esc(l.title||"知識挑戰")+'</h3><div style="margin:8px 0;white-space:pre-wrap">'+esc(l.prompt||"請留意老師的題目！")+'</div><div class="mini">回答成功可獲得 +'+(l.xp||0)+' XP'+(l.gold?"、+"+l.gold+" 金":"")+'。'+(answered?'<b style="color:#398b59">你已完成本題，太棒了！</b>':'請舉手回答，由老師判定後發放獎勵。')+'</div></div>':'<div class="panel" style="margin:10px 0"><b>🗺 等待老師開啟下一個知識挑戰</b><div class="mini" style="margin-top:5px">課堂中勇敢回答、說明思考過程、協助同學，都有機會增加經驗與連勝。</div></div>')
      +'<h3>📖 我的知識戰績</h3><ul class="log-list">'+hist+'</ul></div>';
  }
  else if(view.tab==="dungeon"){
    if(classSessionIsLive(state.classSession)){
      body='<div class="panel" style="max-width:680px;margin:auto;text-align:center;border-color:#c55;background:linear-gradient(135deg,#fff4f0,#fff)"><div style="font-size:54px">🔒</div><h3>上課中・地下城已暫停</h3><div class="mini" style="line-height:1.9">老師已按下「開始上課」。為了專心參與課堂，地下城作業會在下課後再開放。<br>正在遊玩的紀錄也會先自動結算。</div><button class="btn gold" data-tab="lesson" style="margin-top:12px">📣 回到課堂冒險</button></div>';
    }else{
    const grade=dungeonGradeOf(s),ds=dungeonStatsOf(s),accuracy=ds.totalQuestions?Math.round(ds.totalCorrect/ds.totalQuestions*100):0,dx=Math.min(40,Number(ds.daily.xp)||0),dungeonGoldCap=Math.max(0,Number(economyCfg().dungeonDailyGoldCap)||0),dg=Math.min(dungeonGoldCap,Number(ds.daily.gold)||0);
    const assignments=tasksForStudent(s).filter(t=>t.active&&t.dungeonHomework&&Number(t.dungeonVolume||1)<=grade.maxVolume).map(t=>{const sub=subFor(t.id,s.id),st=taskAutoStatus(t,s),bankN=dungeonTaskBankForStudent(t,s).length,status=sub&&sub.status==="approved"?'・✅ 已審核發獎':sub&&sub.status==="pending"?'・⏳ 已回傳待教師審核':sub&&sub.status==="rejected"?'・↩ 請重新挑戰':'';return '<article class="dungeon-task-quick"><div><b>📘 '+esc(t.title)+'</b><div class="mini">第 '+esc(t.dungeonVolume||"自選")+' 冊・目標 '+st.value+'／'+st.target+' 題'+(bankN?'・課程目錄 '+bankN+' 題＋地下城同單元題型':'・地下城內建題庫')+status+'</div></div><button class="btn gold" data-dungeon-task="'+t.id+'">'+(st.passed?'再複習':'開始作業')+'</button></article>';}).join("")||'<div class="mini">老師目前沒有發布符合 '+grade.name+' 範圍的指定作業；你仍可自由選冊複習。</div>';
    body='<div class="panel dungeon-homework"><div class="dungeon-hero">'+dollSVG(s,120)+'<div><h3>🏰 數學地下城自主複習</h3><div class="mini">使用你的班級角色探索迷宮、答題與解鎖區域。結算會回到班級學習紀錄，不需另外建立角色。</div><div class="stat-strip"><span class="stat-chip">✅ 答對 '+ds.totalCorrect+'／'+ds.totalQuestions+'</span><span class="stat-chip">🎯 正確率 '+accuracy+'%</span><span class="stat-chip">⚡ 最高 '+ds.bestChain+' 連擊</span><span class="stat-chip">🏁 通關 '+ds.clears+' 次</span><span class="stat-chip">🔥 連續 '+ds.streakDays+' 天</span></div></div></div>'
      +'<div class="dungeon-progress"><b>今日自主獎勵</b><span>XP '+dx+'／40</span><div><i style="width:'+Math.round(dx/40*100)+'%"></i></div><span>金幣 '+dg+'／'+dungeonGoldCap+'</span><div><i style="width:'+(dungeonGoldCap?Math.round(dg/dungeonGoldCap*100):100)+'%"></i></div></div>'
      +'<div class="dungeon-reward-note">每次依答對題數、正確率與通關計算；單次最多 25 XP／12 金，每日最多 40 XP／20 金。指定作業達標會自動送審，教師通過後才發正式任務獎勵。</div>'
      +'<h3>📌 老師發布的地下城作業</h3><div class="dungeon-assignment-list">'+assignments+'</div>'
      +'<h3>🧭 自由複習 <span class="tag">'+grade.name+'・第 1～'+grade.maxVolume+' 冊</span></h3><div class="inline-form"><label>選擇課本冊別 <select id="dungeonVolume">'+Array.from({length:grade.maxVolume},(_,i)=>i+1).map(v=>'<option value="'+v+'">第 '+v+' 冊</option>').join("")+'</select></label><button class="btn gold" id="dungeonStart">🏰 帶角色進入地下城</button></div></div>';
    }
  }
  else if(view.tab==="redeem"){
    const urlCode=new URLSearchParams(location.search).get("reward")||"";
    body='<div class="panel" style="max-width:620px;margin:auto"><h3>🎁 兌換教師獎勵卡</h3><div class="inline-form"><button class="btn" id="redeemScanQr">📷 掃描 QR Code</button><input id="redeemCode" value="'+esc(urlCode)+'" placeholder="例如 RPG-ABCD-EFGH" style="font-size:18px;letter-spacing:1px;text-transform:uppercase;flex:1;min-width:180px"><button class="btn gold" id="redeemGo">🎉 兌換獎勵</button></div>'+(CLOUD.on()?"":"<div class=\"mini\" style=\"margin-top:10px;color:#b26a00\">目前為離線測試模式；一次性鎖定僅在同一份本機資料內有效。</div>")+"</div>";
  }
  else if(view.tab==="thanks"){
    /* 💌 感謝語白名單:固定選項,避免自由輸入被濫用 */
    const THANKS_MSGS = [
      "謝謝你教我不會的題目!","謝謝你借我文具!","謝謝你陪我一起練習!",
      "謝謝你在我難過時鼓勵我!","謝謝你幫忙打掃、整理環境!","謝謝你跟我分享筆記!",
      "謝謝你在小組合作時很給力!","謝謝你耐心聽我說話!","謝謝你提醒我重要的事!",
      "謝謝你幫我撿東西、搬東西!","謝謝你邀請我一起參加活動!","謝謝你相信我、替我加油!"
    ];
    window._THANKS_MSGS = THANKS_MSGS;
    const today = todayStr();
    if(!s.thanksToday) s.thanksToday = {date:"", count:0, to:{}};
    const tt = s.thanksToday.date===today ? s.thanksToday : {date:today, count:0, to:{}};
    const left = Math.max(0, 1 - tt.count),now=Date.now();
    const mates = state.students.filter(x=>x.id!==s.id&&(!s.thanksRecent[x.id]||now-Date.parse(s.thanksRecent[x.id])>=7*86400000));
    const opts = mates.map(x=>'<option value="'+x.id+'">'+esc(x.name)+(x.group?'('+esc(x.group)+'組)':'')+'</option>').join("");
    const wall = (s.thanksWall||[]).length
      ? (s.thanksWall||[]).map(t=>'<div style="background:#fff;border:2px solid #f0b429;border-radius:10px;padding:8px 12px;margin-bottom:6px"><b>💌 '+esc(t.fromName)+'</b><span class="mini" style="float:right">'+esc(t.date)+'</span><div style="margin-top:2px">'+esc(t.msg)+'</div></div>').join("")
      : '<div class="mini" style="text-align:center;padding:16px">還沒有收到感謝卡。幫助同學、認真合作,善意會被看見的!</div>';
    const care=classCareStatus(),carePct=Math.min(100,Math.round(care.points/Math.max(1,care.target)*100));
    body = '<div class="panel"><h3>💌 送出感謝卡 <span class="mini">(今日還可送 '+left+' / 1 張)</span></h3>'
      + '<div class="mini" style="margin-bottom:8px">從固定善意句庫選出最符合的一句。每週不能重複送給同一位同學；感謝會增加班級關懷值，不發個人鑽石、不作人氣排名。</div>'
      +'<div class="goal-bar" style="margin:8px 0"><i style="width:'+carePct+'%"></i><span>🤝 本週班級關懷值 '+care.points+'／'+care.target+'</span></div>'
      + '<div class="inline-form">'
      + '<select id="thToWho">'+opts+'</select>'
      + '<select id="thMsg" style="flex:1;min-width:220px">'+THANKS_MSGS.map(m=>'<option value="'+esc(m)+'">'+esc(m)+'</option>').join("")+'</select>'
      + '<button class="btn gold" id="thSend"'+(left<=0?' disabled':'')+'>💌 送出</button></div>'
      + (left<=0?'<div class="mini" style="color:#c0392b;margin-top:4px">今天的感謝卡已送出，明天再繼續傳遞善意。</div>':(!mates.length?'<div class="mini" style="margin-top:4px">本週可感謝的同學都已輪替過，請下週再送。</div>':''))
      + '</div>'
      + '<div class="panel"><h3>🧡 我的感謝牆</h3>'+wall+'</div>';
    if(s.thanksNew){ s.thanksNew = 0; save(); }               // 開頁即讀,清紅點
  }
  else if(view.tab==="stats"){
    const g = JOB_INFO[s.job].growth;
    const owned = ownedTitles(s);
    const badges = owned.map(t=>{
      const on = s.title===t;
      const d = titleDefOf(t);
      return '<button class="badge title-pick'+(on?" on":"")+'" data-picktitle="'+esc(t)+'">'+(on?"✓ ":"")+'【'+esc(t)+'】'+(d&&d.fx?' <span class="mini">'+esc(d.fx)+'</span>':'')+'</button>';
    }).join("") || '<span class="mini">還沒有稱號——用心表現,老師會頒發神秘稱號!</span>';
    // 👑 城主榮譽稱號(佔領期間自動生效,不可卸下)
    let lordBadges = "";
    if(isPeakLord(s)) lordBadges += '<span class="badge" style="background:linear-gradient(135deg,#7a2a2a,#c0392b);color:#fff;border-color:#ff6b6b">🌏【巔峰城主】</span> ';
    if(isGloryLord(s)) lordBadges += '<span class="badge" style="background:linear-gradient(135deg,#f5a623,#f0b429);border-color:#c07a10">👑【榮耀城主】</span> ';
    // 🐉 寵物欄
    const myPets = Object.keys(s.pets||{}).map(pid=>{
      const p = PETS[pid]; if(!p) return "";
      const on = !s.petCardId&&String(s.petId)===String(pid);
      return '<button class="badge title-pick'+(on?" on":"")+'" data-pickpet="'+pid+'">'+(on?"✓ ":"")+p.emoji+' '+p.name+' <span class="mini">'+p.skill+'</span></button>';
    }).join("");
    const cardPet=s.petCardId&&s.petCards&&s.petCards[s.petCardId],cardPetBadge=cardPet?'<span class="badge title-pick on">✓ '+esc((cardPet.icon||'🐾')+' '+(cardPet.name||'地城寵物'))+' <span class="mini">腳邊展示</span></span>':'';
    const petRow = (myPets||cardPetBadge) ? '<div class="mini" style="margin:8px 0 4px"><b>🐾 我的寵物</b>（可到寵物商店展示、升階或製作裝備）</div>'+cardPetBadge+myPets+((s.petId||s.petCardId)?' <button class="badge" data-pickpet="0">卸下</button>':'') : "";

    const al = s.alloc || {atk:0,agi:0,int:0,def:0};
    const pts = s.statPoints || 0;
    const approved=approvedCount(s.id), created=state.customItems.filter(c=>c.creatorId===s.id&&c.status==="approved").length;
    const resume='<div class="panel" style="background:linear-gradient(135deg,#eef8ff,#fff8dc)"><h3>📜 我的冒險履歷</h3><div class="stat-strip"><span class="stat-chip">✨ 累積 <b class="num">'+(s.totalXp||0)+' XP</b></span><span class="stat-chip">📌 完成任務 <b class="num">'+approved+' 項</b></span><span class="stat-chip">💡 課堂回答 <b class="num">'+(s.lessonAnswers||0)+' 次</b></span><span class="stat-chip">🎨 上架作品 <b class="num">'+created+' 件</b></span><span class="stat-chip">🏅 成就 <b class="num">'+(s.achievements||[]).length+' 個</b></span></div><div class="mini" style="margin-top:8px">這些是你的學期學習足跡；持續完成任務、勇敢回答與合作，就能累積成自己的英雄履歷。</div></div>';
    const chip = (icon,label,base,eq,alv,key)=>
      '<span class="stat-chip stat-info" data-statinfo="'+key+'" role="button" tabindex="0" title="點擊查看 '+label+' 說明">'+icon+' '+label+' <b class="num">'+totalStats(s)[key]+'</b>'
      + (alv?' <span class="mini" style="color:#b8860b">(自點+'+alv+')</span>':'')
      + (totalStats(s)[key]>=STAT_CAP?' <span class="mini" style="color:#b26a00">MAX</span>':(pts>0?' <button class="btn gold" data-alloc="'+key+'" style="padding:0 8px;font-size:14px;line-height:20px">＋</button>':''))
      + '</span>';
    body = resume+'<div class="panel"><h3>能力值'
      + (pts>0 ? ' <span class="tag" style="background:var(--gold)">可分配 '+pts+' 點</span>' : '')
      + '</h3>'
      + '<div class="stat-strip">'
      + chip("⚔️","ATK",s.baseAtk,e.atk,al.atk,"atk")
      + chip("🛡️","DEF",s.baseDef,e.def,al.def,"def")
      + chip("💨","AGI",s.baseAgi,e.agi,al.agi,"agi")
      + chip("🔮","INT",s.baseInt,e.int,al.int,"int")
      + '</div>'
      + '<div class="mini" style="margin-top:8px">SP 點數:<b class="num">'+s.spPoints+'</b>(到「🌳 技能樹」分頁分配)</div>'
      + '</div>'
      + (false && s.roStyle && RO_TIER[s.job] ? (function(){   // 🚫 隱藏轉職路線示範(素體制不需要)
          const line = RO_TIER[s.job];
          const cur = tierOf(s);
          const tierNames = ["初心者","一轉","二轉","三轉"];
          const cards = line.map((t,i)=>
            '<div style="padding:6px;border-radius:10px;'+(i===cur?'background:#2a3350;box-shadow:0 0 0 1px var(--gold);':'')+'">'
            + tierPreviewSVG(s.job, i, 108)
            + '<div style="font-size:13px;color:var(--parch);margin-top:2px">'+esc(t.name)+'</div>'
            + '<div class="mini num">'+tierNames[i]+'・Lv.'+RO_TIER_LV[i]+' 起'+(i===cur?"・目前":"")+'</div></div>').join("");
          return '<div class="panel"><h3>🎖 轉職路線(RO 風示範)</h3>'
            + '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;text-align:center">'+cards+'</div>'
            + '<div class="mini" style="margin-top:10px">升級自動換上職業服(展示為素體,商店裝備會穿在職業服外層)。'
            + '結構已預留:法師/遊俠/牧師各補一條轉職線即可全面推廣。</div></div>';
        })() : "")
      + '<div class="panel"><h3>🎖 我的稱號'+(s.title?'(配戴中:【'+esc(s.title)+'】)':'(未配戴)')+'</h3>'
      + '<div class="badge-row">'+lordBadges+badges+'</div>'+petRow
      + (s.title?'<div style="margin-top:8px"><button class="btn" id="titleOff">卸下稱號</button></div>':'')
      + '</div>';
  }else if(view.tab==="quests"){
    const list = tasksForStudent(s).map(t=>{
      const sub = subFor(t.id, s.id);
      const st = sub ? sub.status : null;
      const cat = taskCategoryInfo(t);
      const reviewMode=taskReviewMode(t), reviewInfo=taskReviewInfo(t);
      const scopeTxt = t.scope==="all" ? "全班任務" : (t.scope && t.scope.indexOf("stu:")===0 ? "🎯 你的專屬任務" : esc(t.scope)+" 組任務");
      let btn, priceTxt;
      if(st==="approved"){
        btn = '<button class="btn" disabled>已完成'+(t.tiers?"("+TIER_NAMES[sub.tier||0]+")":"")+' ✓</button>';
        priceTxt = '+'+taskReward(t, sub?sub.tier||0:0).xp+' XP・+'+taskReward(t, sub?sub.tier||0:0).gold+' 金';
      }else if(st==="pending"){
        let pendingTxt="等待教師審核";
        if(reviewMode==="leader"){
          const openAt=submissionTime(sub)+Math.max(0,Number(t.leaderDelayHours)||0)*3600000;
          pendingTxt=Date.now()>=openAt?"已開放組長代審":"等待教師／隔日組長";
        }
        btn = '<button class="btn" disabled>'+pendingTxt+(t.tiers?"("+TIER_NAMES[sub.tier||0]+")":"")+'…</button>';
        priceTxt = '+'+taskReward(t, sub?sub.tier||0:0).xp+' XP・+'+taskReward(t, sub?sub.tier||0:0).gold+' 金';
      }else if(t.dungeonHomework){
        const progress=taskAutoStatus(t,s);
        btn='<button class="btn gold" data-dungeon-task="'+t.id+'">🏰 '+(progress.passed?'繼續複習':'進入地下城作業')+'</button>'+(progress.passed?'<button class="btn" data-submit="'+t.id+'|0">⚙️ 驗證並領取</button>':'');
        priceTxt=progress.text+'・+'+t.xp+' XP・+'+t.gold+' 金';
      }else if(t.tiers){
        btn = t.tiers.map((r,i)=>'<button class="btn'+(i===2?" gold":"")+'" data-submit="'+t.id+'|'+i+'" style="margin:2px 0;width:100%">'+TIER_ICONS[i]+' '+TIER_NAMES[i]+(reviewMode==="auto"?'・驗證':'・回報')+'(+'+r.xp+'XP/+'+r.gold+'金)</button>').join("");
        priceTxt = reviewMode==="auto" ? taskAutoStatus(t,s).text : '自選難度回報';
      }else{
        btn = '<button class="btn gold" data-submit="'+t.id+'|0">'+(reviewMode==="auto"?'⚙️ 驗證並領取':'回報完成')+'</button>';
        priceTxt = reviewMode==="auto" ? taskAutoStatus(t,s).text+'・+'+t.xp+' XP・+'+t.gold+' 金' : '+'+t.xp+' XP・+'+t.gold+' 金';
      }
      return '<div class="item-card"><div class="iic">'+(t.scope&&t.scope.indexOf("stu:")===0?"🎯":"📌")+'</div>'
        + '<div class="inm">'+esc(t.title)+'</div>'
        + '<div class="istats">'+cat.icon+cat.name+'・'+scopeTxt+'・'+reviewInfo.icon+reviewInfo.name+(st==="rejected"?"・被退回,可再挑戰":"")+'</div>'
        + '<div class="price num">'+priceTxt+'</div>'+btn+'</div>';
    }).join("") || '<div class="mini">目前沒有可挑戰的任務,等老師發布。</div>';
    body = '<div class="panel"><h3>任務板</h3><div class="mini" style="margin-bottom:9px">任務會標示教師審核、系統驗證或組長代審；獎勵只會發放一次。</div><div class="shop-grid">'+list+'</div></div>';
  }else if(view.tab==="leaderReview"){
    const stats=leaderReviewStats(s), queue=leaderReviewQueue(s);
    const nextAt=Math.max(1,peerReviewDiamondEvery()-(stats.diamondProgress||0));
    const reviewCards=queue.map(sub=>{
      const author=stu(sub.sid), task=taskById(sub.taskId); if(!author||!task) return "";
      const rw=taskReward(task,sub.tier||0);
      return '<article class="leader-review-item">'+dollSVG(author,42)+'<div class="leader-review-main"><b>'+esc(author.name)+'・'+esc(task.title)+'</b>'
        +(task.tiers?' <span class="tag">'+TIER_ICONS[sub.tier||0]+TIER_NAMES[sub.tier||0]+'</span>':'')
        +'<div class="mini">回報：'+esc(sub.t)+'・通過獎勵 '+rw.xp+' XP／'+rw.gold+' 金</div>'
        +'<div class="leader-review-rubric"><label><input type="checkbox" data-reviewrubric="'+task.id+'|'+author.id+'|work"> 已看到可核對的完成成果</label><label><input type="checkbox" data-reviewrubric="'+task.id+'|'+author.id+'|rule"> 符合老師公告的任務條件</label><label><input type="checkbox" data-reviewrubric="'+task.id+'|'+author.id+'|fair"> 我願意接受教師抽查此判定</label></div></div>'
        +'<div class="leader-review-actions"><button class="btn gold" data-leaderreview="approve|'+task.id+'|'+author.id+'">✓ 確認完成</button><button class="btn danger" data-leaderreview="reject|'+task.id+'|'+author.id+'">↩ 退回補充</button></div></article>';
    }).join("") || '<div class="mini">目前沒有已到期、可由你代審的同組任務。</div>';
    body='<div class="panel"><h3>🛡️ '+esc(s.group)+' 組同儕代審</h3><div class="teacher-task-summary" style="margin-top:8px"><div><b>'+stats.count+'/'+TASK_LEADER_DAILY_REVIEW_MAX+'</b><span class="mini">今日已處理</span></div><div><b>'+stats.gold+' 金</b><span class="mini">今日互評所得</span></div><div><b>'+stats.gems+'/'+peerReviewWeeklyGemMax()+' 💎</b><span class="mini">本週鑽石</span></div><div><b>'+(stats.gems>=peerReviewWeeklyGemMax()?'本週已達上限':nextAt+' 件')+'</b><span class="mini">距離下次鑽石</span></div></div>'
      +'<div class="mini" style="margin:8px 0;line-height:1.7">每件有效代審 <b>+'+economyCfg().peerReviewGold+' 金</b>；累積 '+peerReviewDiamondEvery()+' 件可得 1💎（1💎＝1,000 金），每週最多 '+peerReviewWeeklyGemMax()+'💎。系統隨機排序、採固定量表，不能審自己；教師可追查並暫停代審。</div>'
      +'<div class="mini" style="margin:9px 0;line-height:1.7">只能審核同組員且不能審自己。三項量表都確認後才能通過；不確定時請退回補充或交由教師。每天最多 '+TASK_LEADER_DAILY_REVIEW_MAX+' 件，累積 '+peerReviewDiamondEvery()+' 件才可能取得鑽石，並受每週總上限保護。</div><div class="leader-review-list">'+reviewCards+'</div></div>';
  }else if(view.tab==="craft"){
    if(view.editor && !EQUIP_SLOTS.includes(view.editor.type)) view.editor=null;
    const mine = state.customItems.filter(c=>c.creatorId===s.id&&EQUIP_SLOTS.includes(c.type));
    const featured=state.customItems.find(c=>c.id===state.weeklyFeaturedDesignId&&c.status==="approved");
    const featuredHtml=featured?'<div class="panel" style="background:linear-gradient(135deg,#fff3bc,#fff)"><h3>⭐ 本週設計師精選</h3><div style="display:flex;gap:10px;align-items:center">'+customThumb(featured,54)+'<div><b>'+esc(featured.name)+'</b><div class="mini">創作：'+esc((stu(featured.creatorId)||{name:"?"}).name)+'・'+TYPE_NAME[featured.type]+'<br>看看同學怎麼把學習靈感變成裝備吧！</div></div></div></div>':'';
    const mineHtml = mine.map(c=>{
      const st = c.status==="approved" ? "✅ 已上架" : (c.status==="pending" ? "⏳ 審核中" : "❌ 被退回");
      const statTxt=[["ATK",c.atk],["DEF",c.def],["AGI",c.agi],["INT",c.int]].filter(q=>q[1]).map(q=>q[0]+"+"+q[1]).join("・");
      const af=c.affix?affixInfo(c.affix):null,ws=c.weaponSkill?forgeWeaponSkillInfo(c.weaponSkill):null;
      return '<div class="item-card"><div class="iic">'+customThumb(c,30)+'</div>'
        + '<div class="inm">'+esc(c.name)+'</div>'
        + '<div class="istats">Lv.'+itemLevelOf(c)+'・'+TYPE_NAME[c.type]+'・'+st+(statTxt?'・'+statTxt:'')+(af?'・'+af.icon+af.name:'')+(ws?'・'+ws.icon+ws.name+' 8%':'')+(c.status==="approved"?'・💰'+c.price:'')+'</div></div>';
    }).join("") || '<div class="mini">還沒有作品——設計一件屬於你的裝備吧!</div>';
    let editorHtml;
    if(view.editor){
      const ed = view.editor;
      editorBlueprintKey(s,ed);   // 詞條永遠跟著學生實際持有的圖紙，不由工坊生成
      const edTi=tierInfo(ed.bpTier||"common"),edRg=ITEM_LEVEL_RANGE[edTi.key]||[1,90];
      ed.itemLevel=Math.max(edRg[0],Math.min(edRg[1],Math.round(Number(ed.itemLevel)||ITEM_LEVEL_BY_TIER[edTi.key]||edRg[0])));
      ["atk","def","agi","int"].forEach(k=>{ed[k]=Math.max(0,Math.round(Number(ed[k])||0));});
      const GW = gridW(ed.type), GH = gridH(ed.type);
      const cells = [];
      for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){
        const c = ed.pixels[x+","+y];
        cells.push('<button class="px-cell" data-px="'+x+','+y+'" style="background:'+(c||"#232b42")+'"></button>');
      }
      const isPreset = PALETTE.includes(ed.color);
      const sw = PALETTE.map(c=>'<button class="swatch'+(ed.color===c?" on":"")+'" data-color="'+c+'" style="background:'+c+'"></button>').join("")
        + '<input type="color" id="edPick" class="swatch" value="'+(ed.color && /^#[0-9a-fA-F]{6}$/.test(ed.color) ? ed.color : "#e05252")+'" title="自訂顏色">'
        + '<button class="swatch'+(ed.color===null?" on":"")+'" data-color="" title="橡皮擦">⌫</button>'
        + '<button class="btn" id="edClear" title="全部清空">清空</button>'
        + '<span class="mini">目前:<span id="edCur" style="display:inline-block;width:20px;height:20px;border-radius:5px;vertical-align:middle;border:1px solid var(--line);background:'+(ed.color||"transparent")+'">'+(ed.color?"":"⌫")+'</span></span>';
      editorHtml = '<div class="panel"><h3>設計工坊</h3>'
        + '<div class="inline-form" style="margin-bottom:10px">'
        + '<input type="text" id="edName" placeholder="裝備名稱" value="'+esc(ed.name)+'" style="width:140px">'
        + '<select id="edType">'
        + BASIC_SLOTS.map(t=>{
            const cnt = BP_TIERS.reduce((a,ti)=>a+blueprintCount(s,t,ti.key), 0);
            return '<option value="'+t+'"'+(ed.type===t?" selected":"")+(cnt>0?"":" disabled")+'>'
              + TYPE_NAME[t]+'(圖紙×'+cnt+')</option>';
          }).join("")
        + '</select>'
        + '<select id="edTier" title="圖紙品級">'
        + BP_TIERS.map(ti=>{
            const cnt=blueprintCount(s,ed.type,ti.key);
            return '<option value="'+ti.key+'"'+(ed.bpTier===ti.key?" selected":"")+(cnt>0?"":" disabled")+'>'
              + ti.icon+ti.name+'×'+cnt+'(能力≤'+ti.statMax+')</option>';
          }).join("")
        + '</select>'
        + (function(){
            if(ed.bpTier!=="rare"&&ed.bpTier!=="legend") return "";
            const keys=blueprintVariantKeys(s,ed.type,ed.bpTier),chosen=bpKey(ed.type,ed.bpTier,ed.affix||null,ed.weaponSkill||null,ed.statCode||"");
            const opts=keys.map(k=>{const af=affixInfo(blueprintAffixKey(k)),ws=forgeWeaponSkillInfo(blueprintWeaponSkillKey(k)),range=blueprintStatText(blueprintStatCode(k)),cnt=s.blueprints[k]||0;
              return '<option value="'+k+'"'+(k===chosen?' selected':'')+'>'+(af?af.icon+af.name+'詞條':'無詞條')+(ws?'＋'+ws.icon+ws.name+'（8%）':'')+(range?'｜'+range:'')+'｜圖紙×'+cnt+'</option>';}).join('');
            if(keys.length<=1){const k=keys[0],af=affixInfo(blueprintAffixKey(k)),ws=forgeWeaponSkillInfo(blueprintWeaponSkillKey(k)),range=blueprintStatText(blueprintStatCode(k));return '<span class="stat-chip" title="詞條、武技與能力區間在掉落時已鎖定">📜 '+(af?af.icon+af.name+'詞條':'無詞條')+(ws?'＋'+ws.icon+ws.name+' 8%':'')+(range?'｜'+range:'')+'・已鎖定</span>';}
            return '<select id="edBlueprintVariant" title="選擇背包中要消耗的圖紙；詞條與能力區間已鎖定">'+opts+'</select>';
          })()
        + (function(){ const ti = tierInfo(ed.bpTier),rg=ITEM_LEVEL_RANGE[ti.key]||[1,90],lv=ed.itemLevel;
          const floor=equipmentPriceFloor({type:ed.type,tier:ti.key,itemLevel:lv,atk:ed.atk,def:ed.def,agi:ed.agi,int:ed.int,fx:ed.fx||"none",affix:ed.affix||null,weaponSkill:ed.weaponSkill||null});
          return '<label class="stat-chip">物品 Lv. <input type="number" id="edLevel" min="'+rg[0]+'" max="'+rg[1]+'" value="'+lv+'" style="width:66px"></label> <input type="number" id="edPrice" min="'+floor+'" value="'+Math.max(ed.price, floor)+'" style="width:90px" title="建議售價(公式底價 '+floor+')"> 金'
          + '<span class="mini" id="edPriceFloor">公式底價 '+floor+' 金</span>'
          + '<select id="edFx" title="特效(依圖紙品級解鎖)">'
          + ti.fx.map(k=>'<option value="'+k+'"'+(ed.fx===k?" selected":"")+'>'+(FX_NAME[k]||k)+'</option>').join("")
          + '</select>'; })()
        + '</div>'
        + (function(){
            if(!EQUIP_SLOTS.includes(ed.type)) return '<div class="forge-spec"><b>造型作品不附加戰鬥能力值</b><div class="mini">髮型只改變外觀；價格仍會依品級、等級與美術特效計算。</div></div>';
            const bounds=decodeBlueprintStats(ed.statCode),budget=levelStatBudget(ed.bpTier,ed.itemLevel,ed.type),used=ed.atk+ed.def+ed.agi+ed.int,over=used>budget;
            const fields=BP_STAT_KEYS.map(k=>{const label={atk:'⚔️ ATK',def:'🛡 DEF',agi:'💨 AGI',int:'🔮 INT'}[k],range=bounds?bounds[k]:null;return '<div class="forge-stat"><label for="edStat_'+k+'">'+label+'</label><input type="number" id="edStat_'+k+'" data-edstat="'+k+'" min="0" max="'+budget+'" value="'+ed[k]+'"'+(bounds?' disabled':'')+'>'+(range?'<span class="mini">鍛造 '+range[0]+'–'+range[1]+'</span>':'')+'</div>';}).join('');
            return '<div class="forge-spec"><div class="forge-spec-head"><b>⚒️ 裝備能力配置</b><span id="edBudget" class="forge-budget'+(over?' over':'')+'">已用 '+used+' / '+budget+' 點</span></div><div class="forge-stats">'+fields+'</div>'
              + '<div class="mini" style="margin-top:7px">'+(bounds?'稀有／傳說圖紙已鎖定能力區間；按下送審時由系統在各區間內完成鍛造，不能手動點滿。':'物品等級越高，可分配點數越多；四項總和不能超過上限。')+'</div>'
              + ((ed.bpTier==='rare'||ed.bpTier==='legend')?'<div class="forge-legend">'+(ed.bpTier==='legend'?'🌟 <b>傳說鍛造</b>':'📕 <b>稀有鍛造</b>')+'：詞條與能力區間在 Boss 掉落時已鎖定；傳說武器武技發動率固定 8%。</div>':'')+'</div>';
          })()
        // 🎨 常用工具留在外面(復原/重做/平滑),其餘摺疊
        + '<div class="inline-form" style="margin-bottom:8px">'
        + (ed.img ? '' :
          '<button class="btn" id="edUndo"'+((ed.undo&&ed.undo.length)?"":" disabled")+'>⟲ 上一步</button>'
          + '<button class="btn" id="edRedo"'+((ed.redo&&ed.redo.length)?"":" disabled")+'>⟳ 下一步</button>'
          + '<button class="btn'+(ed.smooth?" gold":"")+'" id="edSmooth">'+(ed.smooth?"🫧 平滑:開":"🔲 平滑:關")+'</button>')
        + (ed.img ? '<button class="btn danger" id="edImgDel">✖ 移除圖片(回像素模式)</button>' : "")
        + '</div>'
        + (ed.img ? '' : '<div style="margin:0 0 8px;padding:8px;background:rgba(240,180,41,.08);border:1px dashed var(--gold-dim);border-radius:8px">'
          + '<b class="mini" style="color:var(--gold)">✨ GPT 像素裝備草稿</b><span class="mini">　縮圖就是套用後的輪廓，可再自由改色</span>'
          + '<div class="seed-gallery">'
          + (function(){
              const seeds = {
                weapon:["blade|⚔ 劍型","wand|🪄 法杖","crest|🛡 重裝"],
                shoes:["runner|👟 跑鞋","boot|🥾 靴子","magicShoe|✨ 魔法鞋"],
                hat:["cap|🧢 鴨舌帽","crown|👑 王冠","wizardHat|🧙 魔法帽"],
                clothes:["tunic|👕 輕裝","armor|🛡 鎧甲","robe|🪄 法袍"],
                pants:["shorts|🩳 短褲","jeans|👖 長褲","legguard|⚔ 護腿"],
                back:["cape|🦸 斗篷","wings|🪽 翅膀","pack|🎒 背包"],
                hair:["crest|💇 對稱髮型","frame|✦ 髮飾"]
              };
              return (seeds[ed.type]||["crest|◆ 對稱徽記","frame|▣ 花紋邊框"])
                .map(v=>{ const q=v.split("|"); return '<button class="btn seed-card" data-edseed="'+q[0]+'"><span class="seed-pixel">'+starterThumb(ed.type,q[0],ed.color||"#d0483e")+'</span><span class="seed-label">'+q[1]+'</span></button>'; }).join("");
            })()
          + '</div><div class="mini" style="margin-top:5px">衣服、褲子與鞋子草稿已延伸到安全邊界，能覆蓋素體原本服裝；套用後仍可用「上一步」復原。</div></div>')
        + '<details class="ed-fold"><summary>🛠 更多工具(AI 生成・匯入匯出・放真實圖片)</summary>'
        + '<div class="ed-fold-body"><div class="inline-form">'
        + (ed.img ? '' :
          '<button class="btn" id="edAI">🤖 AI指令</button>'
          + '<button class="btn" id="edImport">📥 匯入</button>'
          + '<button class="btn" id="edExport">📤 匯出</button>')
        + '<button class="btn" id="edImgBtn">🖼 匯入圖片</button>'
        + '</div><div class="mini" style="margin-top:6px">不會畫?按「🤖 AI指令」把指令貼給 ChatGPT/Gemini,再用「📥 匯入」貼回結果。或直接「🖼 匯入圖片」放去背好的 PNG。</div>'
        + '</div></details>'
        + '<div class="craft-studio">'
        + '<section class="studio-canvas">'
        + '<div class="studio-canvas-head"><b>'+(ed.img?'🖼 圖片工作區':'🖌 像素畫布')+'</b><span class="mini">'+(ed.img?'先在右側調整位置，再看虛線框是否吻合':'點選顏色後直接在格子上繪畫')+'</span></div>'
        + (ed.img
          ? '<div style="text-align:center"><img src="'+ed.img+'" style="max-width:100%;max-height:310px;background:#172033;border:2px solid #141414;border-radius:8px;image-rendering:pixelated"></div><div class="studio-art-guide">💡 圖片模式已自動去背與裁切；請在右側用方向鍵、縮放與旋轉，讓作品與黃色虛線框吻合。</div>'
          : '<div class="mini" style="margin-bottom:6px;color:#8a5a00">📐 '+(function(){
              const rg = RO_REGION[ed.type];
              if(!rg) return "在人物身上的位置會即時顯示於右方預覽";
              const ctr = BASE_FIT[ed.type] && BASE_FIT[ed.type].center;
              return "此裝備在人物身上約佔 寬"+rg.w+"% 高"+rg.h+"%,位於 "+
                (rg.y<30?"上部":rg.y<60?"中部":"下部")+"(虛線框=實際比例)"
                + (ctr ? " ・🪽 此部位<b>左右對稱置中</b>,畫布中央虛線是中線,適合畫翅膀/斗篷" : "");
            })()+'</div>'
            + '<div class="px-zoomwrap" id="pxZoom"><div class="px-grid" id="pxGrid" style="grid-template-columns:repeat('+GW+',1fr);max-width:min(96vw,'+Math.min(512, GW*16+8)+'px)">'+cells.join("")+'</div></div>'
            + '<div class="studio-tools-row"><button class="btn" id="edZoom" style="padding:4px 10px">🔍 放大畫布</button><span class="mini">🖌 筆刷</span>'
            + [[1,"細 1×1"],[2,"中 2×2"],[3,"粗 3×3"]].map(bz=>'<button class="btn'+(((ed.brush||1)===bz[0])?" gold":"")+'" data-brush="'+bz[0]+'" style="padding:3px 12px">'+bz[1]+'</button>').join("")
            + '</div><div class="studio-tools-row"><div class="palette">'+sw+'</div></div><div class="studio-art-guide">黃虛線框是實際穿戴範圍。先畫主輪廓，再填顏色；如果位置不準，使用右側的「移動／縮放」。</div>')
        + '</section>'
        + '<aside class="studio-preview">'
        + '<div class="ed-preview-col" id="edPrevCol">'
          + '<span id="edPreview" style="position:relative;display:inline-block">'
          + dollSVG(edBareStudent(s, ed.type), 130, {type:ed.type, pixels:ed.pixels, gw:gridW(ed.type), gh:gridH(ed.type), fx:ed.fx, smooth:ed.smooth, img:ed.img, imgT:ed.imgT})
          + edFitBox(ed.type, s, ed)
          + '</span>'
        + '<div class="mini">即時試穿預覽<div style="font-size:10px;opacity:.75;margin-top:2px">只顯示這件作品<br>虛線框＝實際落點</div></div></div>'
        + (function(){                                        // 📐 位置與大小：固定在預覽旁，繪畫時不用找摺疊選單
            const mv = ed.img ? "data-imove" : "data-move";
            const stp = ed.img ? 2 : 1;
            return '<div class="studio-adjust"><div class="studio-adjust-title">🎯 位置與大小</div><div class="mini" style="margin-bottom:6px">'+(ed.img?'每次移動 2 格':'每次移動 1 格；空白邊緣可保留')+'</div>'
              + '<div class="studio-adjust-body">'
              + '<div class="adj-pad">'
              + '<i></i><button class="btn" '+mv+'="0,-'+stp+'" title="上移">▲</button><i></i>'
              + '<button class="btn" '+mv+'="-'+stp+',0" title="左移">◀</button><i></i><button class="btn" '+mv+'="'+stp+',0" title="右移">▶</button>'
              + '<i></i><button class="btn" '+mv+'="0,'+stp+'" title="下移">▼</button><i></i>'
              + '</div>'
              + '<div class="adj-group">'
              + (ed.img
                ? '<button class="btn" data-izoom="1.1">➕ 放大</button><button class="btn" data-izoom="0.9091">➖ 縮小</button>'
                : '<button class="btn" data-zoom="1.25">➕ 放大</button><button class="btn" data-zoom="0.8">➖ 縮小</button>')
              + '</div>'
              + (ed.img
                ? '<div class="adj-group"><button class="btn" data-irot="-15">↺ 左轉</button><button class="btn" data-irot="15">↻ 右轉</button><button class="btn" id="edImgReset">重設</button></div>'
                  + '<span class="mini num">縮放 '+Math.round(((ed.imgT&&ed.imgT.s)||1)*100)+'%・旋轉 '+(((ed.imgT&&ed.imgT.r)||0))+'°</span>'
                : '')
              + '</div></div>';
          })()
        + '</aside></div>'
        + '<div class="inline-form" style="margin-top:12px">'
        + '<button class="btn gold" id="edSubmit">送審上架</button>'
        + '<button class="btn" id="edCancel">取消</button></div>'
        + '<div class="mini" style="margin-top:6px">送審需支付 <b style="color:var(--gold)">'+SUBMIT_FEE+'💎</b>(你目前有 '+(s.diamonds||0)+'💎);被退回會退還圖紙與鑽石。你先依物品等級配置能力與詞條，老師審核時可做最後平衡；上架後每次有人購買，你抽 10% 版稅!</div>'
        + '<div class="panel" style="margin-top:10px;background:rgba(240,180,41,.08);border-color:var(--gold)">'
        + '<div style="font-weight:900;color:var(--gold);margin-bottom:6px">💡 畫得好看的四個訣竅</div>'
        + '<div class="mini" style="line-height:1.9">'
        + '<b>① 畫滿畫布</b>——畫布已對齊虛線框比例,畫滿就剛好,但四周留 1~2 格空白。<br>'
        + '<b>② 先描邊再填色</b>——深色勾輪廓,裡面再上色,立體感立現。<br>'
        + '<b>③ 同色用三階</b>——上方淺、下方深,別只用單一顏色。<br>'
        + '<b>④ 邊畫邊看右邊預覽</b>——不滿意就按「↩ 復原」。'
        + '</div></div></div>';
    }else{
      const bpTotal=Object.keys(s.blueprints).filter(k=>BP_TYPES.includes(k.split(":")[0])).reduce((n,k)=>n+(s.blueprints[k]||0),0);
      const bpByType=BP_TYPES.map(t=>({t,n:Object.keys(s.blueprints).filter(k=>k.split(":")[0]===t).reduce((n,k)=>n+(s.blueprints[k]||0),0)})).filter(x=>x.n>0);
      const bpSummary=bpTotal?'<div class="mini" style="margin-top:10px;padding:8px 10px;background:#f6f2e8;border:2px solid #141414;border-radius:8px"><b>🎟 可用圖紙 '+bpTotal+' 張</b>　'+bpByType.map(x=>TYPE_ICON[x.t]+x.n).join("　")+'<details style="margin-top:5px"><summary style="cursor:pointer">查看各部位圖紙</summary><div style="margin-top:4px">'+bpByType.map(x=>TYPE_ICON[x.t]+TYPE_NAME[x.t]+' ×'+x.n).join("　・　")+'</div></details></div>':'<div class="mini" style="margin-top:10px">還沒有設計圖紙——打倒魔王結算時，依貢獻度有機會獲得！</div>';
      editorHtml = '<div class="panel"><h3>設計工坊</h3>'
        + '<button class="btn gold" id="edNew"'+((s.diamonds||0)<SUBMIT_FEE?' style="opacity:.55"':'')+'>🎨 設計新裝備</button>'
        + '<div class="mini" style="margin-top:6px;color:'+((s.diamonds||0)>=SUBMIT_FEE?'var(--parch)':'#c0392b')+'">💎 設計送審需 '+SUBMIT_FEE+' 顆鑽石(你有 '+(s.diamonds||0)+' 顆)'+((s.diamonds||0)<SUBMIT_FEE?' — 不足,請先累積鑽石':'')+'</div>'
        + bpSummary
        + '<div class="mini" style="margin-top:8px;line-height:1.9">'
        + '每件作品消耗一張對應部位的圖紙(退回會退還)。可設計:帽子、衣服、褲子、武器、背飾、鞋子。<br>'
        + '<b style="color:var(--gold)">三種做法:</b> '
        + '<b>①自己畫</b>(點「🎨 設計新裝備」在像素畫布塗色)・'
        + '<b>②請AI畫</b>(進設計後按「🤖 AI指令」,把 AI 給的稿貼進「📥 匯入」)・'
        + '<b>③用圖片</b>(按「🖼 匯入圖片」放去背好的 PNG,細節最豐富)</div></div>';
    }
    body = featuredHtml + editorHtml + '<div class="panel"><h3>我的作品</h3><div class="shop-grid">'+mineHtml+'</div></div>';
  }else if(view.tab==="skills"){
    body = skillTreePanel(s);
  }else if(view.tab==="announce"){
    const list = state.announcements.map(a=>
      '<div class="panel" style="background:#1b2136"><b style="color:var(--parch)">📣 '+esc(a.title)+'</b>'
      + '<div style="margin-top:6px;font-size:13px;line-height:1.7;white-space:pre-wrap">'+esc(a.content)+'</div>'
      + '<div class="mini num" style="margin-top:6px">'+a.t+'</div></div>').join("")
      || '<div class="panel"><div class="mini">今天沒有新公告,也記得簽到喔。</div></div>';
    const readOk = s.readDate===todayStr();
    const wheelOpen=classFeatureUnlocked("wheel");
    body = list + '<div class="panel" style="text-align:center">'
      + (readOk
        ? (wheelOpen?'<div class="mini" style="margin-bottom:8px">✅ 今日公告已閱讀，抽卡已開啟</div><button class="btn gold" id="goWheel">前往 🃏 命運卡包</button>':'<div class="mini">✅ 今日公告已閱讀<br>🔒 抽卡會在班級經驗達標並由老師開啟後出現。</div>')
        : '<button class="btn gold" id="readDone" style="padding:12px 24px;font-size:15px">✅ 我看完了(解鎖今日抽卡)</button>')
      + '</div>';
  }else if(view.tab==="wheel"){
    const info = spinInfo(s);
    const costLabel = info.left<=0 ? "今日次數已用完"
      : (info.cost===0 ? "本次免費!" : "本次花費 "+info.cost+" 金");
    const canDraw = info.readOk && info.left>0 && (info.cost===0 || s.gold>=info.cost);
    const rareLeft=Math.max(1,50-Math.max(0,Math.floor(Number(s.gachaPityRare)||0)));
    const legendLeft=Math.max(1,100-Math.max(0,Math.floor(Number(s.gachaPityLegend)||0)));
    const monthCount=Math.max(0,Math.floor(Number(s.gachaMonthCount)||0)),monthLegends=Math.max(0,Math.floor(Number(s.gachaMonthLegends)||0));
    const monthNext=monthLegends<1?Math.max(1,50-monthCount):(monthLegends<2?Math.max(1,100-monthCount):0);
    const cards = [0,1,2,3,4].map(i=>
      '<button class="fcard" data-card="'+i+'" aria-label="選擇第 '+(i+1)+' 張命運卡" style="--i:'+i+'"'+(canDraw?'':' disabled')+'>'
      + '<div class="face back"></div>'
      + '<div class="face front"><div class="fic">?</div><div>???</div></div>'
      + '</button>').join("");
    const progress=[0,1,2,3,4].map(i=>'<i class="'+(i<info.count?'used':'')+'"></i>').join('');
    body = '<div class="gacha-shell" style="text-align:center">'
      + '<div class="gacha-head"><span style="font-size:28px">🃏</span><span class="gacha-title">冒險召喚卡包</span></div>'
      + '<div class="gacha-wallet">💰 持有 <b class="num">'+s.gold+'</b> 金 <span>・</span> 🎟 今日剩餘 <b class="num">'+info.left+'</b> 次</div>'
      + (info.readOk ? "" : '<div class="mini" style="margin:9px 0;color:#ffb3b3">先到「📣 公告」看完今天的公告,才能解鎖卡包!</div>')
      + '<div class="gacha-stage" id="gachaStage"><div class="gacha-call">'+(canDraw?'選擇一張命運卡・'+costLabel:costLabel)+'</div><div class="summon-circle"></div><div class="summon-rune">✦</div><div class="card-row" id="cardRow">'+cards+'</div></div>'
      + '<div class="gacha-progress">'+progress+'</div>'
      + '<div class="gacha-hint">本日召喚費用：<b>免費 → 30 → 60 → 100 → 160 金</b><br>'
      + '稀有度:<span style="color:#888">⬜一般</span>・<span style="color:#4a9de8">🟦進階</span>・<span style="color:#a55ae8">🟪稀有</span>・<span style="color:#ff9a1f">🟧傳說</span><br>'
      + '<b>保底進度：</b>距離稀有以上 <span style="color:#a55ae8">'+rareLeft+' 抽</span>・距離傳說 <span style="color:#ff9a1f">'+legendLeft+' 抽</span><br>'
      + '<b>本月傳說：</b><span style="color:#ff9a1f">'+monthLegends+' / 2 件</span>'+(monthNext?'・距離下一件保底 '+monthNext+' 抽':'・本月兩件目標已達成')+'<br>'
      + '今日第 3 抽至少進階；連續 50 抽未出稀有則必出稀有以上，連續 100 抽未出傳說則必出傳說。抽中對應品質後各自重新累積。<br>'
      + '每月累積 50 抽至少 1 件傳說、100 抽至少 2 件傳說；自然抽中的傳說會計入月度目標，次月重新計算。<br>'
      + '每次只能選一張；獎勵在選擇當下決定，五張卡的機率完全相同。</div></div>';
  }else if(view.tab==="shop"){
    const filterDefs = [["all","全部"],["hat","帽子"],["clothes","衣服"],["pants","褲子"],["weapon","武器"],["back","背飾"],["shoes","鞋子"],["consumable","道具"]];
    const items = allShopItems()
      .filter(i=> i.id!==13 && i.id!==14)                            // 💎 幸運草/智慧卷軸改到鑽石商店販售
      .filter(i=> !i.petCraft)                                      // 🐾 寵物卡製作品只在寵物商店顯示
      .filter(i=> i.rarity!=="Legendary" || s[i.type+"Id"]===i.id)   // 🔒 傳說裝備商店隱藏(神祕感);自己穿著的仍顯示
      .filter(i=> view.shopFilter==="all"
        || (view.shopFilter==="face" ? FACE_SLOTS.includes(i.type) : i.type===view.shopFilter))
      .map(i=>{
        const equipped = (i.type!=="consumable") && s[i.type+"Id"]===i.id;
        const stats = [i.atk&&("⚔"+i.atk), i.def&&("🛡"+i.def), i.agi&&("💨"+i.agi), i.int&&("🔮"+i.int)].filter(Boolean).join(" ");
        return '<div class="item-card '+(equipped?"equipped":"")+'">'
          + '<div class="iic" data-idetail="'+i.id+'" style="cursor:pointer">'+itemArtThumb(i,52)+'</div>'
          + '<div class="inm" data-idetail="'+i.id+'" style="cursor:pointer;text-decoration:underline dotted">'+esc(i.name)+'</div>'
          + '<div class="rar '+i.rarity+'">'+(i.rarity==="Custom"?"學生創作":i.rarity)+'</div>'
          + (i.creatorId ? '<div class="mini" style="text-align:center">創作:'+esc((stu(i.creatorId)||{name:"?"}).name)+'</div>' : "")
          + '<div class="istats">'+(stats||esc(i.effect||""))+'</div>'
          + (i.weaponPattern?'<div class="mini" style="color:#b86b00;text-align:center;font-weight:900">'+(i.weaponPattern==='line2'?'🐍 前方二格・直線貫穿':i.weaponPattern==='sweep'?'🔥 周圍八格・方天橫掃':i.weaponPattern==='longbow4'?'☀️ 四格射程・貫日箭軌':'🥋 30% 機率・疾影連打')+'</div>':'')
          + '<div class="price num">'+(i.price===0?"掉落限定":"💰 "+i.price)+'</div>'
          + (equipped
            ? '<button class="btn" disabled>已裝備</button>'
            : '<button class="btn gold" data-buy="'+i.id+'" '+(i.price===0?"disabled":"")+'>'+(i.type==="consumable"?"購買":"購買並裝備")+'</button>')
          + '</div>';
      }).join("");
    const recycleSlots = EQUIP_SLOTS.concat(FACE_SLOTS).filter(slot=>{
      const it = itemById(s[slot+"Id"]); return it && it.price>0;
    });
    const recycleHtml = recycleSlots.length
      ? recycleSlots.map(slot=>{
          const it = itemById(s[slot+"Id"]);
          return '<div class="item-card"><div class="iic">'+itemArtThumb(it,48)+'</div>'
            + '<div class="inm">'+esc(it.name)+'</div>'
            + '<div class="price num">回收 +'+Math.floor(it.price*0.2)+'</div>'
            + '<button class="btn danger" data-recycle="'+slot+'">♻ 回收</button></div>';
        }).join("")
      : '<div class="mini">目前沒有可回收的裝備。</div>';
    // 🏪 商店主分頁:冒險商店 / 鑽石商店 / 寵物商店
    const mainTab = view.shopMain || "gold";
    const shopMode=(mainTab==="gold"?(view.shopSub||"buy"):mainTab);
    const mainTabs = '<label style="display:flex;align-items:center;gap:8px;font-weight:900;margin-bottom:10px">商店選單 <select id="studentShopMenu" style="flex:1;max-width:320px;font-size:16px"><option value="buy"'+(shopMode==="buy"?' selected':'')+'>💰 冒險商店・購買</option><option value="sell"'+(shopMode==="sell"?' selected':'')+'>🎒 冒險商店・販售</option><option value="gem"'+(shopMode==="gem"?' selected':'')+'>💎 鑽石商店</option><option value="pet"'+(shopMode==="pet"?' selected':'')+'>🐾 寵物商店</option></select></label>';
    // 冒險商店下的子分頁:購買 / 販售
    const sub = view.shopSub || "buy";
    const filterMenu='<label style="display:flex;align-items:center;gap:8px;font-weight:900;margin-bottom:10px">裝備類別 <select id="studentShopFilter" style="flex:1;max-width:240px">'+filterDefs.map(([k,n])=>'<option value="'+k+'"'+(view.shopFilter===k?' selected':'')+'>'+n+'</option>').join('')+'</select></label>';
    // 販售頁:背包裝備 + 身上可回收裝備
    const bag = Array.isArray(s.bagItems) ? s.bagItems : [];
    const bagHtml = bag.length
      ? bag.map((id,idx)=>{
          const it = itemById(id); if(!it) return "";
          const stats = [it.atk&&("⚔"+it.atk), it.def&&("🛡"+it.def), it.agi&&("💨"+it.agi), it.int&&("🔮"+it.int)].filter(Boolean).join(" ");
          return '<div class="item-card"><div class="iic" data-idetail="'+it.id+'" style="cursor:pointer">'+itemArtThumb(it,48)+'</div>'
            + '<div class="inm" data-idetail="'+it.id+'" style="cursor:pointer;text-decoration:underline dotted">'+esc(it.name)+'</div>'
            + '<div class="istats">'+(stats||"")+'</div>'
            + '<div class="price num">賣出 +'+bagSellPrice(it)+'</div>'
            + '<button class="btn gold" data-bagequip="'+idx+'">裝備</button>'
            + '<button class="btn danger" data-bagsell="'+idx+'"'+(it.petLegend?' disabled':'')+'>'+(it.petLegend?'唯一收藏':'賣出')+'</button></div>';
        }).join("")
      : '<div class="mini">背包沒有裝備——購買新裝備時,換下的舊裝備會自動收進這裡。</div>';
    const sellBody = '<div class="panel"><h3>🎒 背包裝備 <span class="mini">('+bag.length+' / '+BAG_MAX+')</span></h3>'
      + '<div class="shop-grid">'+bagHtml+'</div></div>'
      + '<div class="panel"><h3>♻ 回收身上裝備(退回售價 20%)</h3><div class="shop-grid">'+recycleHtml+'</div></div>';
    // 鑽石商店內容：來源透明、每週有上限；感謝卡只累積班級關懷值。
    const dFlow=studentDiamondFlow(s),ownedCosmetics=s.diamondCosmetics||{};
    const cosmeticCards=DIAMOND_COSMETICS.map(c=>{const owned=!!ownedCosmetics[c.id],on=s.diamondCosmeticId===c.id;return '<div class="item-card '+(on?'equipped':'')+'"><div class="iic" style="font-size:40px">'+c.icon+'</div><div class="inm">'+esc(c.name)+'</div><div class="istats">'+esc(c.desc)+'<br><b>純外觀・不增加能力</b></div><div class="price num">💎 '+c.price+'</div>'+(owned?(on?'<button class="btn danger" data-cosmeticoff="1">卸下</button>':'<button class="btn gold" data-cosmeticwear="'+c.id+'">展示</button>'):'<button class="btn gold" data-cosmeticbuy="'+c.id+'"'+((s.diamonds||0)>=c.price?'':' disabled')+'>收藏</button>')+'</div>';}).join('');
    const gemBody = '<div class="panel" style="background:linear-gradient(135deg,#eef4ff,#dce8ff);border-color:#4a6fd0">'
      + '<h3 style="color:#2b4bb0">💎 鑽石商店</h3>'
      + '<div class="inline-form" style="margin-bottom:6px"><span style="font-weight:900">🍀 幸運草 15💎</span><span class="mini">金幣獲得 +20%</span><button class="btn gold" data-dbuy="13|15"'+((s.diamonds||0)>=15?"":" disabled")+'>購買</button></div>'
      + '<div class="inline-form"><span style="font-weight:900">📜 智慧卷軸 20💎</span><span class="mini">XP 獲得 +20%</span><button class="btn gold" data-dbuy="14|20"'+((s.diamonds||0)>=20?"":" disabled")+'>購買</button></div>'
      + '<h3 style="color:#2b4bb0;margin-top:14px">🎨 階段性榮譽外觀</h3><div class="shop-grid">'+cosmeticCards+'</div>'
      + '</div>';
    const petCards=petCardsOf(s).sort((a,b)=>b.tier-a.tier||a.name.localeCompare(b.name,"zh-Hant"));
    const petCardHtml=petCards.length?petCards.map(c=>{const g=PET_GROUPS[c.group]||PET_GROUPS.assist,rec=petCraftRecipe(c),it=rec&&itemById(rec.itemId),on=String(s.petCardId||"")===String(c.kind),made=!!(rec&&rec.unique&&(s.petLegendCrafted||{})[c.kind]);return '<div class="item-card '+(on?'equipped':'')+'"><div class="iic" style="min-height:92px">'+petCardArtHtml(c,88)+'</div><div class="inm">'+esc(c.name)+' ×'+c.count+'</div><div class="rar '+(c.tier>=7?'Legendary':c.tier>=3?'Rare':'Common')+'">'+esc(PET_TIER_NAMES[c.tier])+'</div><div class="istats">'+g.icon+' '+g.name+'・'+esc(c.personalityId||'calm')+'</div><button class="btn gold" data-petequip="'+esc(c.kind)+'"'+(on?' disabled':'')+'>'+(on?'展示中':'裝備展示')+'</button>'+(it?'<div class="mini" style="margin-top:6px"><b>製作 '+esc(it.name)+'</b><br>'+itemArtThumb(it,38)+(rec.unique?'　💎 '+rec.diamonds+'・每人唯一':'　消耗此卡 1 張')+'</div><button class="btn '+(rec.unique?'danger':'')+'" data-petcraft="'+esc(c.kind)+'"'+(made?' disabled':'')+'>'+(made?'唯一裝備已完成':'製作'+rec.label+'裝備')+'</button>':'<div class="mini">此卡可展示或參與升階合成</div>')+'</div>';}).join(''):'<div class="mini">尚無地下城寵物卡。從班級系統進入地下城，收服夥伴後可選擇最多五張帶回。</div>';
    const classicPets=Object.keys(s.pets||{}).filter(id=>s.pets[id]&&PETS[id]).map(id=>{const p=PETS[id],on=!s.petCardId&&String(s.petId)===String(id);return '<div class="item-card '+(on?'equipped':'')+'"><div class="iic" style="font-size:38px">'+p.emoji+'</div><div class="inm">'+p.name+'</div><div class="istats">'+esc(p.desc)+'</div><button class="btn gold" data-pickpet="'+id+'"'+(on?' disabled':'')+'>'+(on?'展示中':'裝備展示')+'</button></div>';}).join('');
    const fusionRows=[1,2,3,4,5,6].map(t=>{const count=petCards.filter(c=>c.tier===t).reduce((n,c)=>n+c.count,0);return '<div class="inline-form" style="margin-bottom:6px"><b>'+PET_TIER_NAMES[t]+' → '+PET_TIER_NAMES[t+1]+'</b><span class="mini">同階任意 3 張（目前 '+count+'）</span><button class="btn gold" data-petfuse="'+t+'"'+(count>=3?'':' disabled')+'>合成升階</button></div>';}).join('');
    const activePet=equippedPetInfo(s);
    const petBody='<div class="panel" style="background:linear-gradient(135deg,#f1fff0,#fff7d6);border-color:#31845b"><h3>🐾 寵物商店 '+(activePet?'<span class="tag">展示：'+esc(activePet.emoji+' '+activePet.name)+'</span>':'')+'</h3><button class="btn" data-petunequip="1"'+(activePet?'':' disabled')+'>卸下目前寵物</button><h3 style="margin-top:14px">🎴 我的寵物卡／裝備製作</h3><div class="shop-grid">'+petCardHtml+(classicPets||'')+'</div><h3 style="margin-top:14px">🧬 寵物卡升階合成</h3>'+fusionRows+'</div>';
    const walletBar = '<div class="stat-pill" style="display:inline-block;margin-bottom:10px">💰 持有 <b class="num">'+s.gold+'</b> 金'
      + ' <span style="margin-left:8px">💎 <b class="num">'+(s.diamonds||0)+'</b></span></div>';
    body = '<div class="panel">' + mainTabs + walletBar
      + (mainTab==="gem"
          ? gemBody
          : mainTab==="pet"?petBody
          : (sub==="sell"
              ? sellBody
              : (filterMenu+'<div class="shop-grid">'+items+'</div>')))
      + '</div>';
  }else if(view.tab==="castle"){
    const isLord = state.castle && state.castle.owner===s.group && state.groupLeaders[s.group]===s.id;
    if(!isLord){
      body = '<div class="panel"><div class="mini">只有榮耀之城城主組的組長能進入城堡商店。</div></div>';
    }else{
      const members = state.students.filter(x=>x.group===s.group);
      const shopRows = state.castleShopItems.map(it=>
        '<div class="shop-item"><div style="font-size:34px;text-align:center">'+it.icon+'</div>'
        + '<div style="text-align:center;font-weight:900">'+esc(it.name)+'</div>'
        + '<div class="istats" style="min-height:34px">'+esc(it.desc)+'</div>'
        + '<div class="price num">💎 '+it.price+'</div>'
        + '<button class="btn gold" data-cbuy="'+esc(it.key)+'"'+((s.diamonds||0)>=it.price?"":" disabled")+'>購買</button></div>').join("");
      s.realItems = s.realItems || {};
      const myCards = state.castleShopItems.filter(it=>(s.realItems[it.key]||0)>0).map(it=>
        '<div class="shop-item"><div style="font-size:30px;text-align:center">'+it.icon+'</div>'
        + '<div style="text-align:center;font-weight:900">'+esc(it.name)+' ×'+s.realItems[it.key]+'</div>'
        + '<div class="inline-form" style="justify-content:center">'
        + '<select data-cwho="'+esc(it.key)+'">'+members.map(m=>'<option value="'+m.id+'">'+esc(m.name)+'</option>').join("")+'</select>'
        + '<button class="btn" data-cuse="'+esc(it.key)+'">使用</button></div></div>').join("")
        || '<div class="mini">還沒有道具卡——用鑽石購買吧!</div>';
      body = '<div class="panel"><h3>🏰 城堡商店 <span class="tag" style="background:var(--gold)">💎 '+(s.diamonds||0)+'</span></h3>'
        + '<div class="mini" style="margin-bottom:10px">城主組組長專屬；鑽石來自教師獎勵、學習連續或受監督互評，可兌換<b>現實特權卡</b>。使用後老師會收到通知並執行。</div>'
        + '<div class="shop-grid">'+shopRows+'</div></div>'
        + '<div class="panel" style="background:linear-gradient(135deg,#2d1b4e,#4a2a7a);color:#fff;border-color:#f0b429"><h3 style="color:#f0b429">🌏 巔峰之城挑戰</h3>'
        + '<div class="mini" style="color:#d8c9f0;margin-bottom:8px">全世界只有一座巔峰之城,現任霸主:<b style="color:#e23b3b;font-size:1.08em;text-shadow:0 1px 0 #fff,0 0 3px rgba(255,255,255,.72)">'+esc((state.worldPeak.owner||{}).className||"?")+'・'+esc((state.worldPeak.owner||{}).group||"?")+' 組</b>。買下巔峰券,帶小組去競技場分頁發起挑戰,擊敗守軍即可稱霸世界(每日稅收 +30 金/人)!</div>'
        + '<div class="inline-form"><span style="font-weight:900;color:#f0b429">🌏 巔峰券 500 金</span><span class="mini" style="color:#d8c9f0">(持有 '+((s.consumables||{})[32]||0)+' 張・你的金幣 '+s.gold+')</span>'
        + '<button class="btn gold" id="buyPeakTicket"'+(s.gold>=500?"":" disabled")+'>購買</button></div></div>'
        + (PEAK.isOurs() && state.worldPeak.owner.group===s.group ?
          '<div class="panel" style="background:linear-gradient(135deg,#4a1a1a,#7a2a2a);color:#fff;border-color:#ff6b6b"><h3 style="color:#ffd0d0">🌏 世界城堡商店 <span class="tag" style="background:var(--gold)">💎 '+(s.diamonds||0)+'・💰 '+s.gold+'</span></h3>'
          + '<div class="mini" style="color:#f5d0d0;margin-bottom:8px">世界霸主專屬!全身傳說套裝每套 500💎，只改變角色外觀、不增加能力值；一般六格裝備會完整保留。</div>'
          + '<div class="legend-set-grid">'+LEGEND_SETS.map(set=>legendSetCardHtml(set,s,"shop")).join("")+'</div>'
          + '<div style="height:12px"></div><div class="mini" style="color:#f5d0d0;margin-bottom:6px">傳說卡片與便利卡片</div>'
          + '<div class="inline-form" style="margin-bottom:6px"><span style="font-weight:900">🎴 寵物卡 100💎</span><span class="mini" style="color:#f5d0d0">隨機四聖獸,戰場機率發動寵物技(追擊/濺射/閃避/減傷)</span><button class="btn gold" data-peakbuy="33|d|100"'+((s.diamonds||0)>=100?"":" disabled")+'>購買</button></div>'
          + '<div class="inline-form" style="margin-bottom:6px"><span style="font-weight:900">🌠 流星卡 300💎</span><span class="mini" style="color:#f5d0d0">傳說轉生:自訂專屬職業名號</span><button class="btn gold" data-peakbuy="34|d|300"'+((s.diamonds||0)>=300?"":" disabled")+'>購買</button></div>'
          + '<div class="inline-form" style="margin-bottom:6px"><span style="font-weight:900">📝 改名卡 300💰</span><span class="mini" style="color:#f5d0d0">更改角色名字</span><button class="btn gold" data-peakbuy="35|g|300"'+(s.gold>=300?"":" disabled")+'>購買</button></div>'
          + '<div class="inline-form"><span style="font-weight:900">🔄 轉職卡 800💰</span><span class="mini" style="color:#f5d0d0">轉換職業(等級保留、技能點退還)</span><button class="btn gold" data-peakbuy="36|g|800"'+(s.gold>=800?"":" disabled")+'>購買</button></div></div>'
          : "")
        + '<div class="panel"><h3>🎟 我的道具卡</h3><div class="shop-grid">'+myCards+'</div>'
        + '<div class="mini" style="margin-top:6px">使用時選擇受益的組員(自己也可以),老師端會看到使用紀錄。</div></div>';
    }
  }else if(view.tab==="bag"){
    const cons = Object.entries(s.consumables);
    const bpTotal=Object.keys(s.blueprints).filter(k=>BP_TYPES.includes(k.split(":")[0])).reduce((n,k)=>n+(s.blueprints[k]||0),0);
    const bpByType=BP_TYPES.map(t=>({t,n:Object.keys(s.blueprints).filter(k=>k.split(":")[0]===t).reduce((n,k)=>n+(s.blueprints[k]||0),0)})).filter(x=>x.n>0);
    const bpCompact=bpTotal
      ? '<div class="mini" style="padding:7px 9px;background:#f6f2e8;border:2px solid #141414;border-radius:8px"><b>🎟 圖紙 '+bpTotal+' 張</b>　'+bpByType.map(x=>TYPE_ICON[x.t]+'×'+x.n).join("　")+'<details style="margin-top:5px"><summary style="cursor:pointer">展開查看各部位</summary><div style="margin-top:4px">'+bpByType.map(x=>TYPE_ICON[x.t]+TYPE_NAME[x.t]+' ×'+x.n).join("　・　")+'</div></details></div>'
      : '<span class="mini">還沒有圖紙——打倒魔王結算時依貢獻度擲骰獲得</span>';
    const consHtml = cons.length ? cons.map(([id,n])=>{
      const it = itemById(+id);
      return '<div class="item-card"><div class="iic">🧪</div><div class="inm">'+esc(it.name)+' ×'+n+'</div>'
        + '<div class="istats">'+esc(it.effect||"")+'</div>'
        + '<button class="btn" data-use="'+id+'">使用</button></div>';
    }).join("") : '<div class="mini">背包是空的——去商店的「道具」分頁買點消耗品。</div>';
    const ownedLegendSets=LEGEND_SETS.filter(set=>(s.legendSets||{})[set.id]);
    const legendBagHtml=ownedLegendSets.length
      ? '<div class="legend-set-grid">'+ownedLegendSets.map(set=>legendSetCardHtml(set,s,"bag")).join("")+'</div>'
      : '<div class="mini">尚未收藏全身傳說套裝；成為世界霸主後可到「世界城堡商店」以 500💎 購買。</div>';
    body = '<div class="panel"><h3>裝備欄</h3>'
      + '<div class="equip-slots">' + EQUIP_SLOTS.map(slotHtml).join("") + '</div>'
      + '<div class="mini" style="margin:6px 0 0">想賣掉裝備換金幣?到「商店 → 販售」分頁。</div>'
      + '<div class="mini" style="margin:10px 0 4px">設計圖紙</div>'
      + bpCompact+'</div>'
      + '<div class="panel"><h3>🎒 背包裝備 <span class="mini">('+((s.bagItems||[]).length)+' / '+BAG_MAX+')</span></h3>'
      + '<div class="shop-grid">'
      + ((s.bagItems||[]).length
          ? s.bagItems.map((id,idx)=>{
              const it = itemById(id); if(!it) return "";
              const st = [it.atk&&("⚔"+it.atk), it.def&&("🛡"+it.def), it.agi&&("💨"+it.agi), it.int&&("🔮"+it.int)].filter(Boolean).join(" ");
              return '<div class="item-card"><div class="iic" data-idetail="'+it.id+'" style="cursor:pointer">'+itemArtThumb(it,42)+'</div>'
                + '<div class="inm" data-idetail="'+it.id+'" style="cursor:pointer;text-decoration:underline dotted">'+esc(it.name)+'</div><div class="istats">'+(st||"")+'</div>'
                + '<button class="btn gold" data-bagequip="'+idx+'">裝備</button>'
                + '<button class="btn danger" data-bagsell="'+idx+'"'+(it.petLegend?' disabled':'')+'>'+(it.petLegend?'唯一收藏':'賣 +'+bagSellPrice(it))+'</button></div>';
            }).join("")
          : '<div class="mini">還沒有收納的裝備——買新裝備時,換下的舊裝備會自動收進這裡(上限 '+BAG_MAX+' 件)。</div>')
      + '</div></div>'
      + '<div class="panel"><h3>🌏 全身傳說套裝</h3><div class="mini">套裝只改變外觀；卸下後會恢復原本六格裝備。</div>'+legendBagHtml+'</div>'
      + '<div class="panel"><h3>消耗品</h3><div class="shop-grid">'+consHtml+'</div></div>';
  }else{
    const bz = state.boss, bzEb = bz && bz.elem ? ELEM_BOSSES[bz.elem] : null;
    const bossInfo = bz ? '<div class="boss-stage elem-'+(bzEb?bzEb.key:'none')+'"><h3>🐉 '+esc(bz.name)+' 戰鬥中</h3>'
      + (bzEb ? '<div class="boss-showcase" style="--boss:'+bzEb.color+'">'+elemBossImg(bzEb.key,70)+'<div class="mini" style="flex:1">'+esc(bzEb.desc)+'<br><b>'+bzEb.icon+' '+esc(bzEb.mapName)+' 戰場</b>等待解鎖</div></div>' : '')
      + (bz.casting ? '<div class="boss-cast" style="color:#ffe08a;padding:8px;text-align:center;font-weight:700;margin-bottom:6px">⚠️ 烈焰隕石詠唱中!</div>' : "") + '<div class="goal-bar boss-bar"><i style="width:'+Math.round(bz.hp/bz.maxHp*100)+'%"></i><span class="num">'+bz.hp+' / '+bz.maxHp+' HP</span></div>'
      + '<div class="mini" style="margin-top:6px">我的傷害貢獻:<b class="num">'+(bz.damage[s.id]||0)+'</b>(答對老師的題目就能出手攻擊!)</div></div>' : "";
    const groups=state.groups.map(g=>({g,xp:groupScore(g),members:state.students.filter(x=>x.group===g).length}));
    const maxGroup=Math.max(1,...groups.map(x=>x.xp)),gRows=groups.map(r=>'<div class="class-stage-card '+(r.g===s.group?'current':'open')+'"><b>🤝 '+esc(r.g)+' 組</b><div class="mini">'+r.members+' 位夥伴・累積 '+r.xp.toLocaleString()+' XP</div><div class="class-progress-track" style="height:14px"><div class="class-progress-fill" style="width:'+Math.round(r.xp/maxGroup*100)+'%"></div></div></div>').join("");
    body = bossInfo + '<div class="panel"><h3>🤝 小組共同進度</h3><div class="mini" style="margin-bottom:10px">不顯示個人名次、財富或落後排名；每組只和自己的下一個目標比較。</div><div class="class-progress-stages">'+gRows+'</div></div>'
      + '<div class="panel"><h3>🏫 全班共同目標</h3>'+classProgressHtml(true)+'<div class="mini">每位同學的學習成果都會推動全班解鎖，不會因競賽結果扣除進度。</div></div>'
      + (CLOUD.on() && state.lbOptIn ? '<div class="panel"><h3>🌍 班級合作榜</h3><div class="mini" style="margin-bottom:8px">只顯示班級暱稱與全班摘要，不公開任何學生姓名。</div><button class="btn gold" id="stuLbView">查看班級合作榜</button></div>' : "");
  }

  const myLogs = (state.log||[]).filter(l=>l.sid===s.id).slice(0,15)
    .map(l=>'<li><span class="num">['+l.t+']</span> '+esc(l.msg)+'</li>').join("")
    || '<li>還沒有冒險紀錄。</li>';

  const LEFT_SLOTS = ["hat","clothes","weapon"];
  const RIGHT_SLOTS = ["back","shoes","pants"];
  /* 紙娃娃成長展示：角色旁直接看見穿戴戰力、五格技能與轉職目標，讓升級成果不只藏在數值分頁。 */
  const stageNames={Warrior:["戰士","騎士","聖殿騎士"],Mage:["法師","元素法師","大魔導師"],Rogue:["遊俠","追獵者","幻影遊俠"],Cleric:["牧師","神官","大主教"]};
  const stageTier=s.level>=60?3:(s.level>=30?2:1), stageList=stageNames[s.job]||[JOB_INFO[s.job].name,"二轉","三轉"];
  const nextStage=s.level<30?"距二轉「"+stageList[1]+"」等級門檻還有 "+(30-s.level)+" 級":(s.level<60?"距三轉「"+stageList[2]+"」等級門檻還有 "+(60-s.level)+" 級":"三轉「"+stageList[2]+"」已解鎖");
  const eqPower=equipStatSum(s);
  const shownSkills=normalizeSkillLoadout(s).map(id=>skillDef(s.job,id)).filter(Boolean);
  const skillRack=Array.from({length:SKILL_LOADOUT_MAX},(_,i)=>{
    const sk=shownSkills[i]; if(!sk) return '<div class="doll-skill-chip empty" title="尚未裝備技能">＋</div>';
    const lv=skillLv(s,sk.id), tier=sk.tier||1;
    return '<div class="doll-skill-chip tier'+tier+'" title="'+esc(sk.name)+' Lv.'+lv+'・冷卻 '+skillCooldownSeconds(s,sk.id)+' 秒"><span class="dsi">'+sk.icon+'</span><span class="dsn">'+esc(sk.name)+'</span><span class="dsl">'+lv+'</span></div>';
  }).join("");
  const growthShowcase='<div class="doll-growth"><div class="doll-growth-head"><span class="doll-growth-stage">✨ <b>'+esc(stageList[stageTier-1])+'</b><span>'+esc(nextStage)+'</span></span>'+(afterSchoolMode?'':'<button class="btn doll-skill-manage" data-stuquick="skills">⚙ 技能組</button>')+'</div>'
    + '<div class="doll-equip-power">裝備加成　⚔'+(eqPower.atk||0)+'　🛡'+(eqPower.def||0)+'　💨'+(eqPower.agi||0)+'　🔮'+(eqPower.int||0)+'</div>'
    + '<div class="doll-skill-rack">'+skillRack+'</div></div>';
  const afterSchoolBanner=afterSchoolMode?'<div class="panel after-school-mode-banner"><b>🏠 課後模式</b><span>可使用角色總覽、地下城、公告與抽卡及學習回饋。</span><button class="btn" id="afterSchoolBack">返回課後大廳</button></div>':'';
  app.innerHTML = landscapeHint+afterSchoolBanner+classProgressHtml(true)+'<div class="stu-layout"><div>'
    + '<div class="char-card" style="position:relative">'
    + (view.role==="student" ? '<div class="student-id-watermark">'+esc(s.name)+'<br>學生專屬</div>' : '')
    + (canShareClassQr?'<button class="btn" id="studentShareClassQr" title="讓同學掃描同一節課的登入 QR；不會分享你的帳號或角色資料" style="position:absolute;left:8px;top:8px;padding:3px 7px;font-size:12px;z-index:5">📱 分享 QR</button>':'')
    + '<button class="btn" id="baseTuneBtn" title="調整素體位置與大小" style="position:absolute;right:8px;top:8px;padding:3px 7px;font-size:12px;z-index:4">🎯 位置調整</button>'
    + '<div class="char-equip-row">'
    + '<div class="equip-col">' + LEFT_SLOTS.map(slotHtml).join("") + '</div>'
    + '<div class="char-center doll-tier-'+stageTier+'">'
    + dollSVG(s, 185)
    + '</div>'
    + '<div class="equip-col">' + RIGHT_SLOTS.map(slotHtml).join("") + '</div>'
    + '</div>'
    + growthShowcase
    + '<div class="stat-line-row">'
    + '<span class="stat-pill lvp"><b>Lv.'+s.level+'</b>'+(s.title?' <span class="ttl">【'+esc(s.title)+'】</span>':'')+' '+esc(s.name)+'</span>'
    + '<span class="stat-pill"><b>HP</b> <span class="num">'+s.currentHp+'/'+s.maxHp+'</span></span>'
    + '<span class="stat-pill"><b>XP</b> <span class="num">'+s.xp+'/'+nxt+'</span></span>'
    + (function(){                                            // 📈 三學年里程碑進度
        const m = gradeStageOf(s.level);
        if(s.level >= LEVEL_CAP) return '<span class="stat-pill" style="background:var(--gold)">👑 <b>滿級</b></span>';
        const cum = cumXpForLevel(s.level) + s.xp;
        const pct = Math.min(100, Math.round(cum / m.cumXp * 1000)/10);
        return '<span class="stat-pill" title="'+m.grade+'目標 Lv.'+m.level+'">'
          + '🎯 '+m.grade+' <span class="num">'+pct+'%</span></span>';
      })()
    + '<span class="stat-pill">💰 <span class="num">'+s.gold+'</span></span>'
    + '<span class="stat-pill">💎 <span class="num">'+(s.diamonds||0)+'</span></span>'
    + '</div>'
    + (s.currentHp<=0 ? '<div class="mini" style="color:#c0392b;margin-top:6px;text-align:center">已倒下——使用回復藥水,或等老師宣布全員休息</div>' : "")
    + '</div>'
    + (afterSchoolMode?'':'<details class="stu-optional"'+(s.autoPilot?' open':'')+'><summary>🤖 角色託管'+(s.autoPilot?'　<span class="tag" style="background:var(--gold);color:#141414">運作中</span>':'')+'</summary><div>'
      + '<div class="mini" style="line-height:1.8;margin-bottom:8px">'
      + '開啟後,系統會自動幫你:<br>'
      + autoPilotFeatureLine("stats",'① 依職業分配能力點（主屬性為主）')+'<br>'
      + autoPilotFeatureLine("skills",'② 依「'+autoBuildLabel(s)+'」流派升級並使用技能組')+'<br>'
      + autoPilotFeatureLine("shop",'③ 買得起就自動升級裝備')+'<br>'
      + autoPilotFeatureLine("guild",'④ 組長會自動補攻城券')+'<br>'
      + '<b style="color:var(--gold)">💎 鑽石永遠不會被動用</b>,金幣也會保留 '+Math.round(AUTO_KEEP_GOLD_RATIO*100)+'% 讓你自己買想要的東西。</div>'
      + '<button class="btn '+(s.autoPilot?'':'gold')+'" id="autoToggle">'
      + (s.autoPilot?'⏸ 關閉託管':'▶️ 開啟託管')+'</button>'
      + (s.autoPilot?' <button class="btn" id="autoRunNow">⚡ 立刻執行一次</button>':'')
      + '</div></details>')
    + '<details class="stu-optional"><summary>📖 我的紀錄</summary><div><ul class="log-list">'+myLogs+'</ul></div></details>'
    + '</div><div>'+studentMenu+body+'</div></div>';
  if(state.lesson&&state.lesson.active&&state.lesson.mode==="zone")requestAnimationFrame(bindZoneCountdown);

  // 🤖 角色託管開關
  const autoToggle = document.getElementById("autoToggle");
  const studentMenuToggle=document.getElementById("studentMenuToggle");
  if(studentMenuToggle) studentMenuToggle.onclick=()=>{view.studentMenu=!view.studentMenu;render();};
  const afterSchoolBack=document.getElementById("afterSchoolBack");
  if(afterSchoolBack)afterSchoolBack.onclick=()=>{try{CLOUD.stopListen&&CLOUD.stopListen();}catch(_){}renderStudentWaiting(String((FB.user||{}).email||s.email||""),FB.user);};
  const studentLandscapeHintClose=document.getElementById("studentLandscapeHintClose");
  if(studentLandscapeHintClose)studentLandscapeHintClose.onclick=()=>{sessionStorage.setItem("rpgLandscapeHintDismissed","1");const el=document.getElementById("studentLandscapeHint");if(el)el.remove();};
  const studentShareClassQr=document.getElementById("studentShareClassQr");
  if(studentShareClassQr)studentShareClassQr.onclick=()=>openClassQr(CLOUD.cid,state.className||state.lbName||"本班",currentEntryToken);
  const baseTuneBtn = document.getElementById("baseTuneBtn");
  if(baseTuneBtn) baseTuneBtn.onclick = ()=>openBaseTuneEditor(s);
  if(autoToggle) autoToggle.onclick = ()=>{
    s.autoPilot = !s.autoPilot;
    if(s.autoPilot){
      addLog(s.id, "🤖 開啟角色託管");
      const did = runAutoPilot(s.id, true);
      const locked=autoPilotLockedFeatures();toast(did && did.length ? "🤖 託管已開啟並代管:"+did.join("、") : "🤖 託管已開啟；只會運用已解鎖功能"+(locked.length?"（略過："+locked.join("、")+"）":""));
    }else{
      addLog(s.id, "⏸ 關閉角色託管");
      toast("已關閉託管,資源改由你自己分配");
    }
    save(); render();
  };
  const autoRunNow = document.getElementById("autoRunNow");
  if(autoRunNow) autoRunNow.onclick = ()=>{
    const did = runAutoPilot(s.id, true);
    const locked=autoPilotLockedFeatures();toast(did && did.length ? "🤖 已代管:"+did.join("、") : "目前沒有可運用的已解鎖資源"+(locked.length?"；尚未解鎖："+locked.join("、"):"（能力點／技能點／金幣不足）"));
    render();
  };

  // ⚔️ 點裝備名稱/圖示 → 顯示詳情卡
  app.querySelectorAll("[data-idetail]").forEach(el=> el.onclick = (e)=>{
    e.stopPropagation();
    showItemDetail(el.dataset.idetail, s.id);
  });

  app.querySelectorAll("[data-tab]").forEach(b=> b.onclick = ()=>{
    view.tab=b.dataset.tab; view.studentMenu=false; render();
    // 📊 學生切到需要看全班名冊的分頁時,按需刷新(30秒節流,不影響操作)
    if(CLOUD.role==="student" && ["thanks","shop","craft","board"].includes(view.tab)) CLOUD.refreshRoster();
  });
  app.querySelectorAll("[data-locked-feature]").forEach(b=>b.onclick=()=>toast("🔒 "+classFeatureLockText(b.dataset.lockedFeature),true));
  app.querySelectorAll("[data-stuquick]").forEach(b=>b.onclick=()=>{
    const target=b.dataset.stuquick;
    if(!classFeatureUnlocked(target)){ toast("🔒 "+classFeatureLockText(target),true); return; }
    view.tab=target; render();
  });
  const dungeonStart=document.getElementById("dungeonStart");
  if(dungeonStart)dungeonStart.onclick=()=>launchDungeon(s,null);
  app.querySelectorAll("[data-dungeon-task]").forEach(b=>b.onclick=()=>{const t=taskById(Number(b.dataset.dungeonTask));if(t)launchDungeon(s,t);});
  app.querySelectorAll("[data-zmove]").forEach(b=>b.onclick=()=>{
    if(b.disabled)return;const p=b.dataset.zmove.split(",").map(Number);
    if(zoneMoveStudent(s,p[0],p[1]))render();
  });
  app.querySelectorAll("[data-zbattle]").forEach(b=>b.onclick=()=>{if(b.disabled)return;if(zoneBattleAction(s,b.dataset.zbattle==="skill"?"skill":"attack"))render();});
  const zoneConfirm=document.getElementById("zoneConfirm");if(zoneConfirm)zoneConfirm.onclick=()=>{
    const l=state.lesson,z=zoneAnswerState(s,l);if(!l||l.locked||!z.answer)return;z.confirmed=true;z.updatedAt=Date.now();syncZoneStudent(s,true);render();toast("✅ 已確認選擇 "+z.answer);
  };
  const zoneBuzzBtn=document.getElementById("zoneBuzz");if(zoneBuzzBtn)zoneBuzzBtn.onclick=()=>zoneBuzz(s);
  const redeemGo=document.getElementById("redeemGo");
  if(redeemGo) redeemGo.onclick=()=>redeemRewardCard(document.getElementById("redeemCode").value, s.id);
  const redeemScanQr=document.getElementById("redeemScanQr");
  if(redeemScanQr) redeemScanQr.onclick=()=>openRewardScanner(s.id);
  // 🐉 寵物裝備/切換("0"=卸下)
  app.querySelectorAll("[data-pickpet]").forEach(b=> b.onclick = ()=>{
    const pid = b.dataset.pickpet;
    if(pid==="0"){ s.petId = null;s.petCardId=null;toast("已卸下寵物"); }
    else if((s.pets||{})[pid]){ s.petId = +pid;s.petCardId=null;toast(PETS[pid].emoji+" "+PETS[pid].name+" 已裝備!("+PETS[pid].desc+")"); }
    save(); render();
  });
  // 🌏 巔峰商店購買(itemId|幣別|價格)
  app.querySelectorAll("[data-dbuy]").forEach(b=> b.onclick = async()=>{        // 💎 鑽石商店:全員增益道具
    const [iid, price] = b.dataset.dbuy.split("|");
    const cost = +price;
    if((s.diamonds||0) < cost){ toast("鑽石不足；可由教師獎勵、學習連續或受監督互評取得", true); return; }
    if(CLOUD.on()&&CLOUD.role==="student"){
      const sku=+iid===13?"diamond_luck":(+iid===14?"diamond_wisdom":"");try{const r=await runInventoryAction(s.id,"specialBuy",{sku});toast(r.message||"已購入道具");render();}catch(e){toast("購買失敗："+(e.message||e),true);}return;
    }
    s.diamonds -= cost;
    s.consumables = s.consumables||{};
    s.consumables[+iid] = (s.consumables[+iid]||0)+1;
    const it = itemById(+iid);
    addLog(s.id, "💎 鑽石商店購買「"+it.name+"」(-"+cost+"💎)");
    save(); toast("已購入「"+it.name+"」!到背包使用"); render();
  });
  app.querySelectorAll("[data-cosmeticbuy]").forEach(b=>b.onclick=async()=>{
    const c=diamondCosmeticInfo(b.dataset.cosmeticbuy);if(!c)return;
    if((s.diamonds||0)<c.price){toast("鑽石不足，需要 "+c.price+"💎",true);return;}
    if(CLOUD.on()&&CLOUD.role==="student"){
      try{const r=await runInventoryAction(s.id,"cosmeticBuy",{cosmeticId:c.id});toast(r.message||"已收藏外觀");render();}catch(e){toast("收藏失敗："+(e.message||e),true);}return;
    }
    s.diamondCosmetics=s.diamondCosmetics||{};if(s.diamondCosmetics[c.id])return;
    s.diamonds-=c.price;s.diamondCosmetics[c.id]=true;s.diamondCosmeticId=c.id;addLog(s.id,"💎 收藏並展示「"+c.name+"」(-"+c.price+"💎)");save();toast("✨ 已展示「"+c.name+"」");render();
  });
  app.querySelectorAll("[data-cosmeticwear]").forEach(b=>b.onclick=async()=>{
    const c=diamondCosmeticInfo(b.dataset.cosmeticwear);if(!c||!(s.diamondCosmetics||{})[c.id])return;
    if(CLOUD.on()&&CLOUD.role==="student"){
      try{const r=await runInventoryAction(s.id,"cosmeticWear",{cosmeticId:c.id});toast(r.message||"已展示外觀");render();}catch(e){toast("展示失敗："+(e.message||e),true);}return;
    }
    s.diamondCosmeticId=c.id;save();toast("✨ 已展示「"+c.name+"」");render();
  });
  app.querySelectorAll("[data-cosmeticoff]").forEach(b=>b.onclick=async()=>{
    if(CLOUD.on()&&CLOUD.role==="student"){
      try{const r=await runInventoryAction(s.id,"cosmeticOff",{});toast(r.message||"已卸下榮譽外觀");render();}catch(e){toast("卸下失敗："+(e.message||e),true);}return;
    }
    s.diamondCosmeticId=null;save();toast("已卸下榮譽外觀");render();
  });
  app.querySelectorAll("[data-peakbuy]").forEach(b=> b.onclick = async()=>{
    const [iid, cur, price] = b.dataset.peakbuy.split("|");
    const cost = +price;
    if(CLOUD.on()&&CLOUD.role==="student"){
      const sku={33:"peak_pet",34:"peak_meteor",35:"peak_rename",36:"peak_job"}[+iid];try{const r=await runInventoryAction(s.id,"specialBuy",{sku});toast(r.message||"已購入道具");render();}catch(e){toast("購買失敗："+(e.message||e),true);}return;
    }
    if(cur==="d"){ if((s.diamonds||0)<cost){ toast("鑽石不足", true); return; } s.diamonds -= cost; }
    else{ if(s.gold<cost){ toast("金幣不足", true); return; } debitGold(s,cost,"巔峰商店"); }
    s.consumables = s.consumables||{};
    s.consumables[+iid] = (s.consumables[+iid]||0)+1;
    const it = itemById(+iid);
    addLog(s.id, "🌏 巔峰商店購買「"+it.name+"」(-"+cost+(cur==="d"?"💎":"金")+")");
    save(); toast("已購入「"+it.name+"」!到背包分頁使用"); render();
  });
  // 🌏 世界城堡全身傳說套裝：職業限定、每套 500 鑽石；購買後自動穿戴。
  app.querySelectorAll("[data-legendbuy]").forEach(b=>b.onclick=async()=>{
    const set=legendSetInfo(b.dataset.legendbuy);if(!set)return;
    if(!(set.jobs||[]).includes(s.job)){toast("這套限定「"+legendSetJobText(set)+"」穿戴",true);return;}
    s.legendSets=s.legendSets||{};
    if(s.legendSets[set.id]){toast("已收藏「"+set.name+"」");return;}
    if((s.diamonds||0)<set.price){toast("鑽石不足，需要 "+set.price+"💎",true);return;}
    if(CLOUD.on()&&CLOUD.role==="student"){
      try{const r=await runInventoryAction(s.id,"legendBuy",{setId:set.id});sfx("chest");toast(r.message||("已穿戴「"+set.name+"」"));render();}catch(e){toast("購買失敗："+(e.message||e),true);}return;
    }
    s.diamonds-=set.price;s.legendSets[set.id]=true;s.legendSetId=set.id;
    addLog(s.id,"🌏 世界城堡商店購買並穿戴「"+set.name+"」(-"+set.price+"💎)");
    save();sfx("chest");toast("✨ 已穿戴全身傳說套裝「"+set.name+"」");render();
  });
  app.querySelectorAll("[data-legendwear]").forEach(b=>b.onclick=async()=>{
    const set=legendSetInfo(b.dataset.legendwear);if(!set||!(s.legendSets||{})[set.id])return;
    if(!(set.jobs||[]).includes(s.job)){toast("目前職業不能穿戴這套外觀",true);return;}
    if(CLOUD.on()&&CLOUD.role==="student"){
      try{const r=await runInventoryAction(s.id,"legendWear",{setId:set.id});toast(r.message||("已穿戴「"+set.name+"」"));render();}catch(e){toast("穿戴失敗："+(e.message||e),true);}return;
    }
    s.legendSetId=set.id;save();toast("✨ 已穿戴「"+set.name+"」");render();
  });
  app.querySelectorAll("[data-legendoff]").forEach(b=>b.onclick=async()=>{
    if(CLOUD.on()&&CLOUD.role==="student"){
      try{const r=await runInventoryAction(s.id,"legendOff",{});toast(r.message||"已卸下傳說套裝");render();}catch(e){toast("卸下失敗："+(e.message||e),true);}return;
    }
    const old=legendSetInfo(s.legendSetId);s.legendSetId=null;save();toast("已卸下「"+(old?old.name:"傳說套裝")+"」，恢復原本裝備外觀");render();
  });
  // 🌏 巔峰券購買(城堡商店)
  const bpt = document.getElementById("buyPeakTicket");
  if(bpt) bpt.onclick = async()=>{
    if(s.gold < 500){ toast("金幣不足(需 500)", true); return; }
    if(CLOUD.on()&&CLOUD.role==="student"){
      try{const r=await runInventoryAction(s.id,"specialBuy",{sku:"peak_ticket"});toast(r.message||"已購入巔峰券");render();}catch(e){toast("購買失敗："+(e.message||e),true);}return;
    }
    if(!debitGold(s,500,"購買巔峰券")){toast("金幣不足(需 500)",true);return;}
    s.consumables = s.consumables || {};
    s.consumables[32] = (s.consumables[32]||0) + 1;
    addLog(s.id, "🌏 購買巔峰券(-500 金)");
    save(); toast("🌏 已購入巔峰券!到競技場分頁發起巔峰之城挑戰"); render();
  };
  // 💌 感謝卡送出
  const thS = document.getElementById("thSend");
  if(thS) thS.onclick = async()=>{
    const toId = document.getElementById("thToWho").value;
    const msg = (document.getElementById("thMsg").value||"").trim();
    if(!(window._THANKS_MSGS||[]).includes(msg)){ toast("請從清單選擇感謝內容", true); return; }
    const today = todayStr();
    if(!s.thanksToday || s.thanksToday.date!==today){ s.thanksToday = {date:today, count:0, to:{}}; }
    if(s.thanksToday.count>=1){ toast("今天的感謝卡已送出，明天再繼續！", true); return; }
    if(!toId || toId===s.id){ toast("請選擇一位同學", true); return; }
    if(s.thanksRecent&&s.thanksRecent[toId]&&Date.now()-Date.parse(s.thanksRecent[toId])<7*86400000){toast("一週內不能重複感謝同一位同學，請把善意分享給其他人",true);return;}
    if(s.thanksToday.to[toId]===today){ toast("今天已經感謝過這位同學囉,把感謝分享給其他人吧!", true); return; }
    if(msg.length<2){ toast("寫下具體的感謝內容(至少 2 個字)", true); return; }
    const target = stu(toId); if(!target){ toast("找不到這位同學", true); return; }
    if(CLOUD.on()&&CLOUD.role==="student"){
      thS.disabled=true;
      try{
        const result=await CLOUD.sendThanks(s.id,toId,msg,today);
        if(result&&result.student){const i=state.students.findIndex(x=>String(x.id)===String(s.id));if(i>=0)state.students[i]=result.student;CLOUD._lastSnap["stu:"+s.id]=JSON.stringify(result.student);}
        if(result&&result.target){const i=state.students.findIndex(x=>String(x.id)===String(toId));if(i>=0)state.students[i]=result.target;}
        if(result&&result.care)state.care=result.care;
        toast("💌 感謝卡已安全送出！班級關懷值 +1");sfx&&sfx("coin");render();return;
      }catch(e){thS.disabled=false;toast("感謝卡送出失敗："+(e.message||e),true);return;}
    }
    // 上牆+獎勵
    target.thanksWall = target.thanksWall||[];
    target.thanksWall.unshift({ from:s.id, fromName:s.name, msg:msg, date:today });
    if(target.thanksWall.length>30) target.thanksWall.length = 30;
    target.thanksTotal = (target.thanksTotal||0)+1;
    target.thanksNew = (target.thanksNew||0)+1;
    s.thanksToday.count++; s.thanksToday.to[toId] = today;
    s.thanksRecent=s.thanksRecent||{};s.thanksRecent[toId]=new Date().toISOString();s.thanksSentTotal=(Number(s.thanksSentTotal)||0)+1;recordClassCare(s.id,toId);
    grantXp(s, 3); grantXp(target, 5);
    save();
    toast("💌 感謝卡已送給 "+target.name+"！你 +3 XP、對方 +5 XP，班級關懷值 +1");
    sfx && sfx("coin");
    render();
  };
  const stuLb = document.getElementById("stuLbView");
  if(stuLb) stuLb.onclick = showLeaderboard;
  app.querySelectorAll("[data-picktitle]").forEach(b=>{
    b.onclick = ()=>{
      const t = b.dataset.picktitle;
      s.title = (s.title===t) ? "" : t;    // 點配戴中的=卸下
      save(); render();
    };
  });
  const tOff = document.getElementById("titleOff");
  if(tOff) tOff.onclick = ()=>{ s.title=""; save(); render(); };
  // 能力值維持精簡：點擊數字才開啟說明，分配「＋」鈕則不觸發說明。
  app.querySelectorAll("[data-statinfo]").forEach(el=>{
    el.onclick=e=>{ if(e.target.closest("[data-alloc]")) return; openStatInfo(s,el.dataset.statinfo); };
    el.onkeydown=e=>{ if((e.key==="Enter"||e.key===" ")&&!e.target.closest("[data-alloc]")){ e.preventDefault(); openStatInfo(s,el.dataset.statinfo); } };
  });
  app.querySelectorAll("[data-filter]").forEach(b=> b.onclick = ()=>{ view.shopFilter=b.dataset.filter; render(); });
  const studentShopFilter=document.getElementById("studentShopFilter");
  if(studentShopFilter)studentShopFilter.onchange=()=>{view.shopFilter=studentShopFilter.value;render();};
  app.querySelectorAll("[data-buy]").forEach(b=> b.onclick = ()=> buyItem(s.id, +b.dataset.buy));
  app.querySelectorAll("[data-shopmain]").forEach(b=> b.onclick = ()=>{ view.shopMain = b.dataset.shopmain; render(); });
  const studentShopMenu=document.getElementById("studentShopMenu");
  if(studentShopMenu)studentShopMenu.onchange=()=>{const v=studentShopMenu.value;if(v==="buy"||v==="sell"){view.shopMain="gold";view.shopSub=v;}else view.shopMain=v;render();};
  app.querySelectorAll("[data-petequip]").forEach(b=>b.onclick=async()=>{try{const r=await petStoreAction(s,"petEquip",{kind:b.dataset.petequip});toast(r.message||"已裝備寵物");sfx("goal");render();}catch(e){toast(e.message||"寵物裝備失敗",true);}});
  app.querySelectorAll("[data-petunequip]").forEach(b=>b.onclick=async()=>{try{const r=await petStoreAction(s,"petUnequip",{});toast(r.message||"已卸下寵物");render();}catch(e){toast(e.message||"卸下失敗",true);}});
  app.querySelectorAll("[data-petcraft]").forEach(b=>b.onclick=async()=>{const c=s.petCards&&s.petCards[b.dataset.petcraft],rec=c&&petCraftRecipe(c),it=rec&&itemById(rec.itemId);if(!c||!it)return;const ask="確定消耗 1 張「"+c.name+"」製作「"+it.name+"」？"+(rec.unique?"\n另需 "+rec.diamonds+" 鑽石，且每位學生只能製作一次。":"");if(!confirm(ask))return;try{const r=await petStoreAction(s,"petCraft",{kind:b.dataset.petcraft});toast(r.message||"製作完成");sfx(rec.unique?"chest":"buy");render();}catch(e){toast(e.message||"製作失敗",true);}});
  app.querySelectorAll("[data-petfuse]").forEach(b=>b.onclick=async()=>{const tier=Number(b.dataset.petfuse);if(!confirm("確定消耗三張"+PET_TIER_NAMES[tier]+"寵物卡，合成一張"+PET_TIER_NAMES[tier+1]+"寵物卡？"))return;try{const r=await petStoreAction(s,"petFuse",{tier});toast(r.message||"合成完成");sfx("level");render();}catch(e){toast(e.message||"合成失敗",true);}});
  app.querySelectorAll("[data-shopsub]").forEach(b=> b.onclick = ()=>{ view.shopSub = b.dataset.shopsub; render(); });
  app.querySelectorAll("[data-bagequip]").forEach(b=> b.onclick = ()=> bagEquip(s.id, +b.dataset.bagequip));
  app.querySelectorAll("[data-bagsell]").forEach(b=> b.onclick = ()=> bagSell(s.id, +b.dataset.bagsell));
  app.querySelectorAll("[data-cbuy]").forEach(b=> b.onclick = ()=>{
    const it = state.castleShopItems.find(x=>x.key===b.dataset.cbuy); if(!it) return;
    if((s.diamonds||0) < it.price){ toast("鑽石不足", true); return; }
    s.diamonds -= it.price;
    s.realItems[it.key] = (s.realItems[it.key]||0) + 1;
    addLog(s.id, "🏰 在城堡商店購買「"+it.name+"」(-"+it.price+" 💎)");
    sfx("chest"); save(); render();
  });
  app.querySelectorAll("[data-cuse]").forEach(b=> b.onclick = ()=>{
    const it = state.castleShopItems.find(x=>x.key===b.dataset.cuse); if(!it) return;
    if(!(s.realItems[it.key]>0)) return;
    const sel = app.querySelector('[data-cwho="'+b.dataset.cuse+'"]');
    const who = stu(sel ? sel.value : s.id) || s;
    s.realItems[it.key]--;
    state.realItemLog.push({ id: Date.now()+"-"+Math.floor(Math.random()*1e4),
      itemKey: it.key, itemName: it.icon+" "+it.name, byId: s.id, byName: s.name,
      forId: who.id, forName: who.name, t: new Date().toLocaleString("zh-TW",{hour12:false}), done:false });
    if(state.realItemLog.length > 200) state.realItemLog = state.realItemLog.slice(-200);
    addLog(s.id, "🎟 為 "+who.name+" 使用「"+it.name+"」,等待老師執行");
    sfx("goal"); save(); render();
    toast("已使用!請向老師出示("+who.name+")");
  });
  app.querySelectorAll("[data-alloc]").forEach(b=> b.onclick = ()=>{
    if((s.statPoints||0) <= 0) return;
    if(!s.alloc) s.alloc = {atk:0,agi:0,int:0,def:0};
    if(totalStats(s)[b.dataset.alloc]>=STAT_CAP){toast('此能力已達 '+STAT_CAP+' 上限',true);return;}
    s.alloc[b.dataset.alloc]++;
    s.statPoints--;
    sfx("coin"); save(); render();
    toast("＋1 "+({atk:"⚔️ ATK",def:"🛡️ DEF",agi:"💨 AGI",int:"🔮 INT"}[b.dataset.alloc])+"(剩 "+s.statPoints+" 點)");
  });
  app.querySelectorAll("[data-use]").forEach(b=> b.onclick = ()=> useConsumable(s.id, +b.dataset.use));
  app.querySelectorAll("[data-recycle]").forEach(b=> b.onclick = ()=> openRecycleModal(s.id, b.dataset.recycle));
  app.querySelectorAll("[data-submit]").forEach(b=> b.onclick = ()=>{ const [tid,ti]=b.dataset.submit.split("|"); submitTask(s.id, +tid, +ti||0); });
  app.querySelectorAll("[data-leaderreview]").forEach(b=> b.onclick=()=>{
    const [act,tid,sid]=b.dataset.leaderreview.split("|");
    if(act==="approve"){
      const checks=[...app.querySelectorAll('[data-reviewrubric^="'+tid+'|'+sid+'|"]')];
      if(checks.length<3||checks.some(x=>!x.checked)){toast("請先逐項確認三項審核量表；不確定時可退回補充",true);return;}
    }
    leaderReviewSubmission(s.id,+tid,sid,act);
  });
  app.querySelectorAll("[data-helprequest]").forEach(b=>b.onclick=async()=>{
    const kind=b.dataset.helprequest,opt=HELP_REQUEST_OPTIONS[kind];if(!opt)return;
    if((state.helpRequests||[]).some(x=>String(x.sid)===String(s.id)&&x.status==="pending")){toast("老師已收到你的求助",true);return;}
    modalConfirm("請確認你現在真的需要老師協助：\n\n「"+opt.label+"」\n\n這個通知會請老師抽空私下關心你。若只是誤點，請選擇取消。",async()=>{
      b.disabled=true;
      try{
        const id=CLOUD.on()&&CLOUD.role==="student"?await CLOUD.sendHelpRequest(s.id,kind):(String(s.id)+"_"+Date.now());
        state.helpRequests.push({id,sid:String(s.id),studentName:s.name,group:s.group,kind,category:opt.label,status:"pending",createdAtMs:Date.now()});save();toast("🫶 老師已收到，會私下關心你");render();
      }catch(e){b.disabled=false;toast("求助訊息未送出："+(e.message||e),true);}
    },"確認送出求助");
  });
  app.querySelectorAll("[data-help-cancel]").forEach(b=>b.onclick=()=>{
    const id=String(b.dataset.helpCancel||""),req=(state.helpRequests||[]).find(x=>String(x.id)===id&&String(x.sid)===String(s.id)&&x.status==="pending");if(!req)return;
    modalConfirm("確定這是誤點，要取消給老師的通知嗎？\n\n如果你仍需要協助，請保留通知或直接找老師。",async()=>{
      b.disabled=true;
      try{if(CLOUD.on()&&CLOUD.role==="student")await CLOUD.cancelHelpRequest(id,s.id);req.status="cancelled";req.cancelledAtMs=Date.now();save();toast("已取消誤點的通知");render();}
      catch(e){b.disabled=false;toast("無法取消通知："+(e.message||e),true);}
    },"取消通知");
  });
  const syncEd = ()=>{
    const ed = view.editor; if(!ed) return;
    const oldType=ed.type,oldTier=ed.bpTier;
    const n = document.getElementById("edName"); if(n) ed.name = n.value;
    const t = document.getElementById("edType"); if(t) ed.type = t.value;
    const p = document.getElementById("edPrice"); if(p) ed.price = Math.max(10, +p.value||60);
    const f = document.getElementById("edFx"); if(f) ed.fx = f.value;
    const tr = document.getElementById("edTier");
    if(tr && tr.value !== ed.bpTier){
      ed.bpTier = tr.value;
      ed.itemLevel=ITEM_LEVEL_BY_TIER[ed.bpTier]||1;
      if(!tierInfo(ed.bpTier).fx.includes(ed.fx)) ed.fx = "none";   /* 換品級後特效降級檢查 */
    }else if(tr){ ed.bpTier = tr.value; }
    const bpv=document.getElementById("edBlueprintVariant");
    if(bpv&&bpv.value){ed.affix=blueprintAffixKey(bpv.value);ed.weaponSkill=blueprintWeaponSkillKey(bpv.value);ed.statCode=blueprintStatCode(bpv.value);}
    if(ed.bpTier!=="rare"&&ed.bpTier!=="legend"){ed.affix=null;ed.weaponSkill=null;ed.statCode="";}
    if(oldType!==ed.type||oldTier!==ed.bpTier||!bpv) editorBlueprintKey(s,ed);
    const ti=tierInfo(ed.bpTier),rg=ITEM_LEVEL_RANGE[ti.key]||[1,90],lvEl=document.getElementById("edLevel");
    ed.itemLevel=Math.max(rg[0],Math.min(rg[1],Math.round(lvEl?Number(lvEl.value):Number(ed.itemLevel)||ITEM_LEVEL_BY_TIER[ti.key]||rg[0])));
    if(lvEl) lvEl.value=ed.itemLevel;
    ["atk","def","agi","int"].forEach(k=>{const el=document.getElementById("edStat_"+k);ed[k]=EQUIP_SLOTS.includes(ed.type)?Math.max(0,Math.round(el?Number(el.value):Number(ed[k])||0)):0;if(el)el.value=ed[k];});
    const budget=levelStatBudget(ti.key,ed.itemLevel,ed.type),used=ed.atk+ed.def+ed.agi+ed.int;
    const floor=equipmentPriceFloor({type:ed.type,tier:ti.key,itemLevel:ed.itemLevel,atk:ed.atk,def:ed.def,agi:ed.agi,int:ed.int,fx:ed.fx||"none",affix:ed.affix||null,weaponSkill:ed.weaponSkill||null});
    ed.price=Math.max(ed.price||0,floor);
    if(p){ p.min=floor; p.value=ed.price; }
    const floorEl=document.getElementById("edPriceFloor"); if(floorEl) floorEl.textContent="公式底價 "+floor+" 金";
    const budgetEl=document.getElementById("edBudget"); if(budgetEl){budgetEl.textContent="已用 "+used+" / "+budget+" 點";budgetEl.classList.toggle("over",used>budget);}
  };
  const edNew = document.getElementById("edNew");
  if(edNew) edNew.onclick = ()=>{
    if((s.diamonds||0) < SUBMIT_FEE){   // 💎 進設計前先檢查鑽石,避免畫完才發現不夠、白費工
      toast("設計作品送審需要 "+SUBMIT_FEE+" 顆鑽石，你目前只有 "+(s.diamonds||0)+" 顆。可由教師獎勵、學習連續或受監督互評累積。", true);
      return;
    }
    const first = EQUIP_SLOTS.find(t=> BP_TIERS.some(ti=>blueprintCount(s,t,ti.key)>0)) || "hat";
    const firstTier = (BP_TIERS.find(ti=>blueprintCount(s,first,ti.key)>0)||BP_TIERS[0]).key;
    const firstKey=blueprintVariantKeys(s,first,firstTier)[0]||bpKey(first,firstTier);
    view.editor = {type:first, bpTier:firstTier, itemLevel:ITEM_LEVEL_BY_TIER[firstTier]||1, name:"", price:tierInfo(firstTier).minPrice,
      atk:0,def:0,agi:0,int:0,affix:blueprintAffixKey(firstKey),weaponSkill:blueprintWeaponSkillKey(firstKey),statCode:blueprintStatCode(firstKey),
      pixels:{}, color:PALETTE[6], fx:"none", smooth:false, img:null, imgBox:null, imgT:{x:0,y:0,s:1,r:0}, undo:[], redo:[]};
    render();
  };

  // 🔍 畫布放大切換(手機:格子變22px,可橫向捲動)
  const edZoom = document.getElementById("edZoom");
  if(edZoom) edZoom.onclick = ()=>{
    const z = document.getElementById("pxZoom"); if(!z) return;
    z.classList.toggle("on");
    const on = z.classList.contains("on");
    edZoom.textContent = on ? "🔍 縮小畫布（看全圖）" : "🔍 放大畫布";
    edZoom.classList.toggle("gold", on);
  };
  // 🎨 預覽收合(手機省空間;收合後右下角出現小按鈕可叫回)
  const edPrevHide = document.getElementById("edPrevHide");
  if(edPrevHide) edPrevHide.onclick = ()=>{
    const col = document.getElementById("edPrevCol"); if(!col) return;
    col.style.display = "none";
    if(!document.getElementById("edPrevShow")){
      const btn = document.createElement("button");
      btn.className = "btn gold ed-preview-toggle"; btn.id = "edPrevShow"; btn.textContent = "👁 預覽";
      btn.onclick = ()=>{ col.style.display = ""; btn.remove(); };
      document.body.appendChild(btn);
    }
  };
  const pxGrid = document.getElementById("pxGrid");
  if(pxGrid){
    let painting = false;
    const paint = (t)=>{
      if(!t || !t.classList || !t.classList.contains("px-cell")) return;
      const ed = view.editor; if(!ed) return;
      const GW = gridW(ed.type), GH = gridH(ed.type);
      const parts = (t.dataset.px||"").split(",");
      const cx = +parts[0], cy = +parts[1];
      const bsz = ed.brush || 1;
      const off = Math.floor((bsz-1)/2);
      for(let dy=0; dy<bsz; dy++) for(let dx=0; dx<bsz; dx++){       // 依筆刷塗 bsz×bsz
        const px = cx - off + dx, py = cy - off + dy;
        if(px<0 || py<0 || px>=GW || py>=GH) continue;
        const key = px+","+py;
        if(ed.color) ed.pixels[key] = ed.color;
        else delete ed.pixels[key];
        const cell = pxGrid.querySelector('[data-px="'+key+'"]');
        if(cell) cell.style.background = ed.color || "#232b42";
      }
      const pv = document.getElementById("edPreview");
      if(pv) pv.innerHTML = dollSVG(edBareStudent(s, ed.type), 130, {type:ed.type, pixels:ed.pixels, gw:GW, gh:GH, fx:ed.fx, smooth:ed.smooth, img:ed.img, imgT:ed.imgT}) + edFitBox(ed.type, s, ed);
    };
    pxGrid.addEventListener("pointerdown", (e)=>{
      painting = true; syncEd(); edSnapshot(view.editor); paint(e.target); e.preventDefault();
    });
    pxGrid.addEventListener("pointermove", (e)=>{
      if(!painting) return;
      paint(document.elementFromPoint(e.clientX, e.clientY));
      e.preventDefault();
    });
    window.addEventListener("pointerup", ()=>{ painting = false; });
  }
  app.querySelectorAll(".swatch:not(input)").forEach(b=> b.onclick = ()=>{
    syncEd(); view.editor.color = b.dataset.color || null; render();
  });
  app.querySelectorAll("[data-brush]").forEach(b=> b.onclick = ()=>{
    syncEd(); view.editor.brush = +b.dataset.brush || 1; render();
  });
  const edPick = document.getElementById("edPick");
  if(edPick) edPick.oninput = ()=>{
    syncEd();
    view.editor.color = edPick.value;
    app.querySelectorAll(".swatch").forEach(x=>x.classList.remove("on"));
    const cur = document.getElementById("edCur");
    if(cur){ cur.style.background = edPick.value; cur.textContent = ""; }
  };
  const edU = document.getElementById("edUndo");
  if(edU) edU.onclick = ()=>{ syncEd(); if(edUndo(view.editor)) render(); };
  const edR = document.getElementById("edRedo");
  if(edR) edR.onclick = ()=>{ syncEd(); if(edRedo(view.editor)) render(); };
  const edFxSel = document.getElementById("edFx");
  if(edFxSel) edFxSel.onchange = ()=>{ syncEd(); render(); };
  const edTierSel = document.getElementById("edTier");
  if(edTierSel) edTierSel.onchange = ()=>{ syncEd(); render(); };
  const edBpVariantSel = document.getElementById("edBlueprintVariant");
  if(edBpVariantSel) edBpVariantSel.onchange = ()=>{ syncEd(); render(); };
  const edLevelInput=document.getElementById("edLevel");
  if(edLevelInput) edLevelInput.oninput=syncEd;
  app.querySelectorAll("[data-edstat]").forEach(el=>{el.oninput=syncEd;});
  const edSm = document.getElementById("edSmooth");
  if(edSm) edSm.onclick = ()=>{ syncEd(); view.editor.smooth = !view.editor.smooth; render(); };
  app.querySelectorAll("[data-move]").forEach(btn=> btn.onclick = ()=>{
    const ed = view.editor; if(!ed) return;
    if(!Object.keys(ed.pixels).length){ toast("畫布是空的", true); return; }
    syncEd();
    const q = btn.dataset.move.split(",");
    edSnapshot(ed);
    const r = shiftPixels(ed.pixels, +q[0], +q[1], gridW(ed.type), gridH(ed.type));
    ed.pixels = r.pixels;
    if(r.dropped) toast("有 "+r.dropped+" 格移出畫布被裁掉,可用「⟲ 上一步」反悔", true);
    render();
  });
  app.querySelectorAll("[data-zoom]").forEach(btn=> btn.onclick = ()=>{
    const ed = view.editor; if(!ed) return;
    if(!Object.keys(ed.pixels).length){ toast("畫布是空的", true); return; }
    syncEd();
    edSnapshot(ed);
    ed.pixels = scalePixels(ed.pixels, +btn.dataset.zoom, gridW(ed.type), gridH(ed.type));
    toast(+btn.dataset.zoom>1 ? "已放大 125%" : "已縮小 80%");
    render();
  });
  const copyText = (txt)=>{
    const ta = document.getElementById("fmtTa");
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(()=>toast("已複製!"), ()=>{ if(ta){ ta.select(); document.execCommand("copy"); toast("已複製!"); } });
    }else if(ta){ ta.select(); document.execCommand("copy"); toast("已複製!"); }
  };
  const openFmtModal = (title, content, mode)=>{
    modalHost.innerHTML = '<div class="overlay" id="ovl"><div class="modal" style="max-width:560px;text-align:left">'
      + '<h4 style="text-align:center">'+esc(title)+'</h4>'
      + '<textarea id="fmtTa" style="width:100%;height:240px;background:#181e30;color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:10px;font-family:Consolas,monospace;font-size:12px;white-space:pre" '
      + (mode==="import" ? 'placeholder="把 GPT/Gemini 的回覆(或匯出的格式)整段貼進來"' : "")
      + '>'+esc(content||"")+'</textarea>'
      + '<div class="inline-form" style="margin-top:10px;justify-content:center">'
      + (mode==="import"
        ? '<button class="btn gold" id="fmtGo">📥 匯入到畫布</button>'
        : '<button class="btn gold" id="fmtCopy">📋 複製</button>')
      + '<button class="btn" id="fmtClose">關閉</button></div></div></div>';
    document.getElementById("ovl").onclick = (e)=>{ if(e.target.id==="ovl") modalHost.innerHTML=""; };
    document.getElementById("fmtClose").onclick = ()=>{ modalHost.innerHTML=""; };
    const cp = document.getElementById("fmtCopy");
    if(cp) cp.onclick = ()=> copyText(document.getElementById("fmtTa").value);
    const go = document.getElementById("fmtGo");
    if(go) go.onclick = ()=>{
      const r = textToDesign(document.getElementById("fmtTa").value, view.editor.type);
      if(!r.ok){ toast(r.msg, true); return; }
      syncEd();
      edSnapshot(view.editor);
      view.editor.pixels = r.pixels;
      modalHost.innerHTML = "";
      toast("匯入成功:"+r.filled+" 格"+(r.unknown ? "(略過 "+r.unknown+" 個未知字元)" : "")+";可用「上一步」反悔");
      render();
    };
  };
  const edAI = document.getElementById("edAI");
  if(edAI) edAI.onclick = ()=>{ syncEd(); openFmtModal("🤖 AI 設計指令(複製後貼給 ChatGPT / Gemini)", aiPromptFor(view.editor.type), "copy"); };
  const edExp = document.getElementById("edExport");
  if(edExp) edExp.onclick = ()=>{ syncEd(); openFmtModal("📤 匯出設計格式(可分享、可備份、可請 AI 修改)", designToText(view.editor.type, view.editor.pixels), "copy"); };
  const edImp = document.getElementById("edImport");
  if(edImp) edImp.onclick = ()=>{ syncEd(); openFmtModal("📥 匯入設計格式", "", "import"); };
  const edImgBtn = document.getElementById("edImgBtn");
  if(edImgBtn) edImgBtn.onclick = ()=>{
    syncEd();
    const t = view.editor.type;
    const prompt = "我找到一張圖想做成遊戲裝備(部位:"+TYPE_NAME[t]+")。請幫我處理成遊戲素材:\n"
      + "1. 去除背景,輸出【透明背景 PNG】\n"
      + "2. 只保留裝備本體,裁切到貼齊邊緣、圖案置中\n"
      + (t==="weapon" ? "3. 武器請轉成直立方向(刀尖/槍尖朝上)\n" : "3. 方向擺正\n")
      + "4. 尺寸 512×512 以內,處理好給我可下載的 PNG 檔\n"
      + "(素材提醒:請用可自由使用的圖片或 AI 生成圖,避免直接使用他人版權作品)";
    modalHost.innerHTML = '<div class="overlay" id="ovl"><div class="modal" style="max-width:560px;text-align:left">'
      + '<h4 style="text-align:center">🖼 匯入圖片(部位:'+TYPE_NAME[t]+')</h4>'
      + '<div class="mini" style="line-height:1.8">步驟:① 複製下方指令+你的圖片一起丟給 ChatGPT/Gemini ② 下載處理好的透明 PNG ③ 按「選擇圖片」匯入。圖片會自動壓縮(約 20–80KB),穿戴時自動貼合部位。</div>'
      + '<textarea id="fmtTa" readonly style="width:100%;height:150px;background:#181e30;color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:10px;font-size:12px;margin-top:8px">'+esc(prompt)+'</textarea>'
      + '<div class="inline-form" style="margin-top:10px;justify-content:center">'
      + '<button class="btn" id="fmtCopy">📋 複製指令</button>'
      + '<label class="btn gold">📁 選擇圖片<input type="file" accept="image/*" id="imgFile" style="display:none"></label>'
      + '<button class="btn" id="fmtClose">關閉</button></div></div></div>';
    document.getElementById("ovl").onclick = (e)=>{ if(e.target.id==="ovl") modalHost.innerHTML=""; };
    document.getElementById("fmtClose").onclick = ()=>{ modalHost.innerHTML=""; };
    document.getElementById("fmtCopy").onclick = ()=> copyText(document.getElementById("fmtTa").value);
    document.getElementById("imgFile").onchange = function(){
      if(!this.files || !this.files[0]) return;
      const rd = new FileReader();
      rd.onload = ()=>{
        const im = new Image();
        im.onload = ()=>{
          const c = document.createElement("canvas"); c.width = 192; c.height = 192;   // 紙娃娃顯示區小,192px 已綽綽有餘
          const g = c.getContext("2d");
          const sc = Math.min(192/im.width, 192/im.height);
          const w = im.width*sc, h = im.height*sc;
          g.drawImage(im, (192-w)/2, (192-h)/2, w, h);
          let url = c.toDataURL("image/webp", 0.8);
          if(!url.startsWith("data:image/webp") ) url = c.toDataURL("image/png");   // 不支援webp時退回png
          if(url.length > 150000) url = c.toDataURL("image/webp", 0.55);
          if(url.length > 150000){ toast("圖片壓不下來(過於複雜),請先縮小或簡化", true); return; }
          const b = alphaBBox(c), pad = 2;
          const bx = Math.max(0,b.x-pad), by = Math.max(0,b.y-pad);
          const br = Math.min(c.width,b.x+b.w+pad), bb = Math.min(c.height,b.y+b.h+pad);
          view.editor.img = url;
          view.editor.imgBox = {x:bx/c.width, y:by/c.height, w:(br-bx)/c.width, h:(bb-by)/c.height};
          view.editor.imgT = {x:0, y:0, s:1, r:0};
          modalHost.innerHTML = "";
          toast("圖片已匯入("+Math.round(url.length*3/4/1024)+" KB),進入圖片模式");
          render();
        };
        im.onerror = ()=> toast("讀不懂這張圖,請用 PNG/JPG/WebP", true);
        im.src = rd.result;
      };
      rd.readAsDataURL(this.files[0]);
    };
  };
  const edImgDel = document.getElementById("edImgDel");
  if(edImgDel) edImgDel.onclick = ()=>{ syncEd(); view.editor.img = null; view.editor.imgBox = null; toast("已移除圖片,回到像素模式"); render(); };
  const bumpT = (mut)=>{
    syncEd();
    const ed = view.editor; if(!ed || !ed.img) return;
    ed.imgT = clampImgT(ed.imgT || {x:0,y:0,s:1,r:0});
    mut(ed.imgT);
    ed.imgT = clampImgT(ed.imgT);
    render();
  };
  app.querySelectorAll("[data-imove]").forEach(b=> b.onclick = ()=>{
    const q = b.dataset.imove.split(",");
    bumpT(t=>{ t.x += +q[0]; t.y += +q[1]; });
  });
  app.querySelectorAll("[data-izoom]").forEach(b=> b.onclick = ()=> bumpT(t=>{ t.s = Math.round(t.s * +b.dataset.izoom * 100)/100; }));
  app.querySelectorAll("[data-irot]").forEach(b=> b.onclick = ()=> bumpT(t=>{ t.r += +b.dataset.irot; }));
  const edImgReset = document.getElementById("edImgReset");
  if(edImgReset) edImgReset.onclick = ()=> bumpT(t=>{ t.x=0; t.y=0; t.s=1; t.r=0; });
  const edClear = document.getElementById("edClear");
  if(edClear) edClear.onclick = ()=>{
    syncEd();
    if(confirm("清空整張畫布?")){ edSnapshot(view.editor); view.editor.pixels = {}; render(); }
  };
  app.querySelectorAll("[data-edseed]").forEach(b=> b.onclick = ()=>{
    syncEd();
    const ed = view.editor; if(!ed || ed.img) return;
    edSnapshot(ed);
    ed.pixels = starterPixels(ed.type, gridW(ed.type), gridH(ed.type), b.dataset.edseed, ed.color||"#d0483e");
    toast("已套用快速草稿；可再改色、補細節，或按「上一步」復原");
    render();
  });
  const edType = document.getElementById("edType");
  if(edType) edType.onchange = ()=>{
    syncEd();
    const ed = view.editor;
    const r = clipPixels(ed.pixels, gridW(ed.type), gridH(ed.type));
    if(r.dropped){ edSnapshot(ed); ed.pixels = r.pixels; toast("切換部位:"+r.dropped+" 格超出新畫布已裁剪,可上一步反悔", true); }
    render();
  };
  const edSubmit = document.getElementById("edSubmit");
  if(edSubmit) edSubmit.onclick = async ()=>{
    syncEd();
    const ed = view.editor;
    if(!ed.name.trim()){ toast("幫作品取個名字", true); return; }
    if(!ed.img && Object.keys(ed.pixels).length < 5){ toast("多畫幾格吧(至少 5 格),或用「🖼 匯入圖片」", true); return; }
    const used=(ed.atk||0)+(ed.def||0)+(ed.agi||0)+(ed.int||0),budget=levelStatBudget(ed.bpTier,ed.itemLevel,ed.type);
    if(used>budget){toast("能力值已用 "+used+" 點，但物品 Lv."+ed.itemLevel+" 只能分配 "+budget+" 點",true);return;}
    edSubmit.disabled=true;let made=null;
    try{made=await submitDesign(s.id,ed.name.trim(),ed.type,ed.bpTier,ed.price,ed.pixels,ed.fx,ed.smooth,ed.img,ed.imgT,ed.affix,ed.weaponSkill,ed.imgBox,ed.itemLevel,{atk:ed.atk,def:ed.def,agi:ed.agi,int:ed.int},ed.statCode||"");}
    catch(e){edSubmit.disabled=false;toast("送審失敗："+(e.message||e),true);return;}
    if(!made){edSubmit.disabled=false;return;}
    view.editor = null;
    toast("已送審!等老師審核上架"); render();
  };
  const edCancel = document.getElementById("edCancel");
  if(edCancel) edCancel.onclick = ()=>{ view.editor = null; render(); };
  app.querySelectorAll("[data-skilltier]").forEach(b=> b.onclick = ()=>{ view.skillTier = +b.dataset.skilltier; render(); });
  app.querySelectorAll("[data-skup]").forEach(b=> b.onclick = ()=> levelSkill(s.id, b.dataset.skup));
  app.querySelectorAll("[data-skequip]").forEach(b=> b.onclick = ()=> toggleSkillEquip(s.id, b.dataset.skequip));
  const readDone = document.getElementById("readDone");
  if(readDone) readDone.onclick = ()=>{
    s.readDate = todayStr();
    addLog(s.id, "看完今日公告,解鎖命運卡包");
    save(); toast("已簽到!抽卡解鎖 🃏");
    view.tab = "wheel"; render();
  };
  const goWheel = document.getElementById("goWheel");
  if(goWheel) goWheel.onclick = ()=>{
    if(s.readDate!==todayStr()){toast("請先看完今天的公告",true);return;}
    if(!classFeatureUnlocked("wheel")){toast("抽卡功能尚未由班級經驗解鎖",true);return;}
    view.tab = "wheel"; render();
  };
  const cardRow = document.getElementById("cardRow");
  if(cardRow) cardRow.querySelectorAll("[data-card]").forEach(cardBtn=> cardBtn.onclick = async()=>{
    const info = spinInfo(s);
    if(!info.readOk){ toast("先到「📣 公告」看完今天的公告!", true); return; }
    if(info.left<=0){ toast("今天的 "+SPIN_MAX+" 次機會用完了,明天再來!", true); return; }
    if(info.cost>0 && s.gold<info.cost){ toast("金幣不足:這一抽要 "+info.cost+" 金,你只有 "+s.gold, true); return; }
    cardRow.querySelectorAll("[data-card]").forEach(b=>b.disabled=true);
    let r;
    try{r=(CLOUD.on()&&CLOUD.role==="student")?await doSpinOnline(s.id):doSpin(s.id);}
    catch(e){cardRow.querySelectorAll("[data-card]").forEach(b=>b.disabled=false);toast("抽卡失敗："+(e.message||e),true);return;}
    if(!r){cardRow.querySelectorAll("[data-card]").forEach(b=>b.disabled=false);return;}
    const prize = WHEEL_PRIZES[r.i];
    const rar = prize.rar || "common";
    const rarInfo=CARD_RAR[rar];
    const stage=document.getElementById("gachaStage");
    if(stage) stage.classList.add("summoning");
    cardBtn.classList.add("chosen");
    cardRow.querySelectorAll("[data-card]").forEach(b=>{
      b.disabled=true;b.onclick=null;
      if(b!==cardBtn)b.classList.add("dead");
    });
    sfx("buy");
    // 先讓卡片升空吸收魔法陣，再翻面進入全畫面獎勵揭曉。
    setTimeout(()=>{
      const front = cardBtn.querySelector(".front");
      if(front) front.innerHTML = '<div class="fic">'+prize.icon+'</div><div>'+esc(prize.label)+'</div>'
        + '<div style="font-size:9px;color:'+rarInfo.color+'">'+rarInfo.name+'</div>';
      cardBtn.classList.remove("chosen");
      cardBtn.classList.add("flipped", "r-"+rar);
      const coords=[[-150,-130],[145,-118],[-185,15],[182,28],[-115,135],[120,142],[0,-185],[12,185],[-210,-75],[212,92],[-72,-160],[78,165]];
      const particleCount={common:4,adv:7,rare:10,legend:12}[rar]||4;
      const particles=coords.slice(0,particleCount).map((p,i)=>'<i class="gacha-particle" style="--x:'+p[0]+'px;--y:'+p[1]+'px;--dur:'+(1.25+(i%4)*.18)+'s;--delay:'+(i*.06)+'s">✦</i>').join('');
      const reveal=document.createElement("div");
      reveal.className="gacha-reveal r-"+rar;
      reveal.style.setProperty("--rc",rarInfo.color);
      reveal.style.setProperty("--rg",rarInfo.glow);
      reveal.setAttribute("role","dialog");
      reveal.setAttribute("aria-label",rarInfo.name+"獎勵："+prize.label);
      reveal.innerHTML=particles+'<div class="gacha-result"><div class="gacha-result-icon">'+prize.icon+'</div>'
        +'<div class="gacha-result-rarity">'+rarInfo.name+'</div><div class="gacha-result-name">'+esc(prize.label)+'</div>'
        +'<div class="gacha-result-msg">'+esc(r.msg)+'</div><div class="gacha-skip">點擊畫面繼續</div></div>';
      document.body.appendChild(reveal);
      if(rar==="legend"){
        const burst = document.createElement("div");
        burst.className = "legend-burst";
        burst.innerHTML = '<div class="flash"></div>'
          + '<div class="bolt" style="left:20%;top:18%">⚡</div>'
          + '<div class="bolt" style="right:22%;top:30%;animation-delay:.12s">⚡</div>'
          + '<div class="bolt" style="left:38%;bottom:24%;animation-delay:.24s">⚡</div>';
        document.body.appendChild(burst);
        sfx("levelup");
        setTimeout(()=> burst.remove(), 1600);
      }else sfx(rar==="rare" ? "chest" : "award");
      let finished=false;
      const finish=()=>{
        if(finished)return;finished=true;
        reveal.remove();toast("🃏 "+r.msg);render();
      };
      reveal.onclick=finish;
      setTimeout(finish,{common:1800,adv:2200,rare:2800,legend:3600}[rar]||1800);
    },650);
  });
}
