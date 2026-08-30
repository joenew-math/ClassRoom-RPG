/*
 * classroom-teacher：教師主選單、課堂首頁與各管理分頁的畫面控制器。
 * 本檔沿用 classic script 全域依賴，必須在共用規則與雲端層之後、主程式之前載入。
 */

function renderTeacher(){
  const pn = pendingSubs().length;
  const _rvN = reviewCount();
  const tabDefs = [["classhome","🏫 課堂首頁"],["board","🖥️ 大屏模式"],["questionbank","📚 題庫"],["progress","🏫 解鎖進度"],["boss","🐉 Boss"+(state.boss?" ⚔":"")],["review","✅ 審核"+(_rvN?"("+_rvN+")":"")],["arena","⚔️ 競技場"],["tasks","📌 任務"+(pn?"("+pn+")":"")],["craft","🎨 工坊"+(pendingDesigns().length?"("+pendingDesigns().length+")":"")],["rewards","🎁 獎勵卡"],["announce","📣 公告"],["art","🖼 美術"],["roster","📋 名冊管理"],["log","📜 冒險日誌"],["rank","📘 學習進度"],["titles","🎖 稱號設計"],["guide","📈 配分指南"]];
  const isBoard=view.tview==="board";
  const isArenaBattle=view.tview==="arena"&&((typeof GARENA!=="undefined"&&GARENA.active)||(typeof ARENA!=="undefined"&&ARENA.active));
  const currentTeacherTab=tabDefs.find(([k])=>k===view.tview)||tabDefs[0],teacherMenuOpen=!!view.teacherMenu;
  const teacherTabs = '<div class="board-launcher feature-launcher"><button class="btn gold board-launcher-main" id="teacherMenuToggle">☰ '+currentTeacherTab[1]+(teacherMenuOpen?"　收合 ▲":"　功能選單 ▼")+'</button>'
    + (teacherMenuOpen?'<div class="board-launcher-panel">'+tabDefs.filter(([k])=>k!==view.tview).map(([k,n])=>'<button class="tab" data-tv="'+k+'">'+n+'</button>').join("")+'</div>':"")+'</div>';
  let body = "";
  if(view.tview==="classhome") body = teacherClassHome();
  else if(view.tview==="questionbank") body = teacherQuestionBank();
  else if(view.tview==="review") body = teacherReview();
  else if(view.tview==="board") body = teacherBoard();
  else if(view.tview==="progress") body = teacherClassProgress();
  else if(view.tview==="boss") body = teacherBoss();
  else if(view.tview==="craft") body = teacherCraft();
  else if(view.tview==="tasks") body = teacherTasks();
  else if(view.tview==="announce") body = teacherAnnounce();
  else if(view.tview==="rewards") body = teacherRewards();
  else if(view.tview==="art") body = teacherArt();
  else if(view.tview==="roster") body = teacherRoster();
  else if(view.tview==="rank") body = teacherRank();
  else if(view.tview==="titles") body = teacherTitles();
  else if(view.tview==="arena") body = teacherArena();
  else if(view.tview==="guide") body = teacherGuide();
  else body = teacherLog();
  const demoBar=view.demoTeacher
    ? '<div class="teacher-demo-bar"><div class="demo-title">🧪 教師介面測試・'+esc(state.className)+' <span class="mini">'+state.students.length+' 人・'+state.groups.length+' 組・'+_rvN+' 件待審</span></div>'
      + '<button class="btn gold" id="demoClassSwitch">🏫 切換班級</button><button class="btn" id="demoClassReset">🔄 重建本班</button><button class="btn" id="demoClassExit">← 返回測試入口</button></div>'
    : '';
  app.innerHTML = (isArenaBattle?"":demoBar+teacherTabs) + body;
  if(state.lesson&&state.lesson.active&&state.lesson.mode==="zone")requestAnimationFrame(bindZoneCountdown);
  if(isBoard) requestAnimationFrame(fitTeacherBoard);
  const demoSwitch=document.getElementById("demoClassSwitch");
  if(demoSwitch) demoSwitch.onclick=openTeacherDemoPicker;
  const demoReset=document.getElementById("demoClassReset");
  if(demoReset) demoReset.onclick=()=>modalConfirm("重建「"+state.className+"」的示範資料？這個測試班內剛才的修改會清除。",()=>enterTeacherDemoClass(view.demoClassKey,true),"確定重建");
  const demoExit=document.getElementById("demoClassExit");
  if(demoExit) demoExit.onclick=exitTeacherDemo;
  const teacherMenuToggle=document.getElementById("teacherMenuToggle");
  if(teacherMenuToggle) teacherMenuToggle.onclick=()=>{ view.teacherMenu=!view.teacherMenu; render(); };
  const arenaDuelMenu=document.getElementById("arenaDuelMenu");
  if(arenaDuelMenu) arenaDuelMenu.ontoggle=()=>{ view.arenaDuelOpen=arenaDuelMenu.open; };
  const arenaTeamMenu=document.getElementById("arenaTeamMenu");
  if(arenaTeamMenu) arenaTeamMenu.ontoggle=()=>{ view.arenaTeamOpen=arenaTeamMenu.open; };
  const arenaMobaMenu=document.getElementById("arenaMobaMenu");
  if(arenaMobaMenu) arenaMobaMenu.ontoggle=()=>{ view.arenaMobaOpen=arenaMobaMenu.open; };
  const arenaGuildMenu=document.getElementById("arenaGuildMenu");
  if(arenaGuildMenu) arenaGuildMenu.ontoggle=()=>{ view.arenaGuildOpen=arenaGuildMenu.open; };
  const taskCreateMenu=document.getElementById("taskCreateMenu");
  if(taskCreateMenu) taskCreateMenu.ontoggle=()=>{ view.taskCreateOpen=taskCreateMenu.open; };
  const taskReviewMenu=document.getElementById("taskReviewMenu");
  if(taskReviewMenu) taskReviewMenu.ontoggle=()=>{ view.taskReviewOpen=taskReviewMenu.open; };
  const taskListMenu=document.getElementById("taskListMenu");
  if(taskListMenu) taskListMenu.ontoggle=()=>{ view.taskListOpen=taskListMenu.open; };
  const taskAuditMenu=document.getElementById("taskAuditMenu");
  if(taskAuditMenu) taskAuditMenu.ontoggle=()=>{ view.taskAuditOpen=taskAuditMenu.open; };
  app.querySelectorAll("[data-tv]").forEach(b=> b.onclick = ()=>{
    if(b.dataset.tv==="arena"){
      view.arenaDuelOpen=false; view.arenaTeamOpen=false; view.arenaMobaOpen=false; view.arenaGuildOpen=false;
    }
    if(b.dataset.tv==="tasks"){
      view.taskCreateOpen=false; view.taskReviewOpen=false; view.taskListOpen=false; view.taskAuditOpen=false;
    }
    view.tview=b.dataset.tv; view.teacherMenu=false; view.boardMenu=false; render();
  });
  bindBackupBanner();
  bindTeacher();
}
