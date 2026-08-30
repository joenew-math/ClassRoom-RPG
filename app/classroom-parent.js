/*
 * classroom-parent：家長學習摘要、重大紀錄與隱私逾時介面控制器。
 * 本檔沿用 classic script 全域依賴，必須在共用規則與雲端層之後、主程式之前載入。
 */

function renderParent(){
  const s = stu(view.sid); if(!s){ view={page:"home"}; render(); return; }
  armParentPrivacyTimer();
  const today = new Date().toLocaleDateString("zh-TW");
  const activeTasks = state.tasks.filter(t=> t.active && (t.scope==="all" || t.scope===s.group || taskScopeHas(t, s.id)));
  const taskDone = activeTasks.filter(t=>{ const x=state.submissions.find(q=>q.taskId===t.id && q.sid===s.id); return x&&x.status==="approved"; }).length;
  const taskPending = activeTasks.filter(t=>{ const x=state.submissions.find(q=>q.taskId===t.id && q.sid===s.id); return x&&x.status==="pending"; }).length;
  const taskPct = activeTasks.length ? Math.round(taskDone/activeTasks.length*100) : 0;
  const myTasks = activeTasks.map(t=>{
    const sub = state.submissions.find(x=>x.taskId===t.id && x.sid===s.id);
    const st = sub ? (sub.status==="approved"?"✅ 完成":"⏳ 待批改") : "⬜ 未繳";
    const rw = taskReward(t, sub?sub.tier||0:0);
    return '<tr><td>'+esc(t.title)+(t.tiers&&sub?'('+TIER_NAMES[sub.tier||0]+')':'')+'</td><td>+'+rw.xp+' XP</td><td>'+st+'</td></tr>';
  }).join("") || '<tr><td colspan="3" class="mini">目前沒有任務</td></tr>';
  // 家長日誌採「學習白名單」：只納入能反映課堂投入、作業、評量與學習成果的重大紀錄。
  const maskMsg = (msg)=>{                                   // 🔒 日誌中出現的「其他學生」姓名一律遮罩
    let m = String(msg);
    state.students.forEach(x=>{ if(x.id!==s.id && x.name && x.name.length>1) m = m.split(x.name).join(maskName(x.name)); });
    return m;
  };
  const parentLearningLogs = (state.log||[]).filter(l=>l.sid===s.id && parentLearningMajor(l.msg));
  const groupedLearningLogs=groupParentLearningLogs(parentLearningLogs,maskMsg);
  const logs = groupedLearningLogs.slice(0,30).map(g=>
    '<li><span class="num">['+esc(g.latest)+']</span> '+esc(g.msg)+(g.count>1?' <b class="tag">累計 '+g.count+' 次</b>':'')+(g.times.length>1?'<div class="mini">近期紀錄：'+g.times.map(esc).join("、")+'</div>':'')+'</li>').join("") || '<li class="mini">尚無重大學習紀錄</li>';
  const learnRows = groupedLearningLogs.slice(0,8).map(g=>
    '<div class="parent-learning-row"><time>'+esc(g.latest)+'</time><div>'+esc(g.msg)+(g.count>1?'<div class="mini"><b>累計 '+g.count+' 次</b>・近期：'+g.times.map(esc).join("、")+'</div>':'')+'</div></div>').join("")
    || '<div class="mini">尚無重大學習紀錄；課堂回答、任務通過或老師記錄學習成果後會顯示於此。</div>';
  const streak=s.learningStreak||{}, responseCount=s.lessonAnswers||0;
  const termXp=Math.max(0,(s.totalXp||0)-(s.termStartXp||0));
  const sevenDaysAgo=Date.now()-7*86400000;
  const toMs=(v)=>{ const n=Date.parse(String(v||"")); return isNaN(n)?0:n; };
  const weeklyAwards=(state.awardLog||[]).filter(a=>a.sid===s.id&&toMs(a.t)>=sevenDaysAgo&&!a.reverted);
  const weeklyXp=weeklyAwards.reduce((a,x)=>a+(x.xp||0),0);
  const weeklyLessons=(state.log||[]).filter(l=>l.sid===s.id&&l.msg.indexOf("回答知識挑戰")>=0&&toMs(l.t)>=sevenDaysAgo).length;
  const weeklyTasks=state.submissions.filter(x=>x.sid===s.id&&x.status==="approved"&&toMs(x.t)>=sevenDaysAgo).length;
  const learningNote = taskDone===activeTasks.length && activeTasks.length
    ? '本期任務皆已完成，請繼續保持！'
    : (taskPending ? '有 '+taskPending+' 項任務正等待老師批改。' : (activeTasks.length ? '目前還有 '+Math.max(0,activeTasks.length-taskDone-taskPending)+' 項任務可挑戰。' : '目前沒有進行中的任務，請留意老師公告。'));
  // 💌 感謝牆:孩子收到同學的感謝(正向互動,家長最值得看的部分)
  const thanks = (s.thanksWall||[]).slice(0,10).map(t=>
    '<div style="background:#fff8e8;border:2px solid #f0b429;border-radius:10px;padding:8px 12px;margin-bottom:6px"><b>💌 '+esc(maskName(t.fromName))+'</b><span class="mini" style="float:right">'+esc(t.date)+'</span><div style="margin-top:2px">'+esc(t.msg)+'</div></div>').join("")
    || '<div class="mini">還沒有收到感謝卡。</div>';
  app.innerHTML = '<div class="parent-shell">'
    + '<div class="parent-hero">'+dollSVG(s, 106)
    + '<div class="parent-hero-copy"><h2>👪 '+esc(s.name)+' 的學習小站</h2>'
    + '<div><b>Lv.'+s.level+'</b>・'+esc(jobNameOf(s))+'・'+esc(s.group)+' 組</div>'
    + '<div class="mini" style="margin-top:5px">這裡只顯示孩子的課堂學習、任務與正向互動紀錄。查詢日期：'+today+'</div></div></div>'
    + '<div class="parent-metrics">'
    + '<div class="parent-metric"><b>'+taskDone+'/'+activeTasks.length+'</b><span>任務已完成</span></div>'
    + '<div class="parent-metric"><b>'+responseCount+'</b><span>課堂回答</span></div>'
    + '<div class="parent-metric"><b>'+((streak.date===todayStr()?streak.days:0)||0)+' 天</b><span>目前學習連勝</span></div>'
    + '<div class="parent-metric"><b>'+termXp+'</b><span>本期累積 XP</span></div></div>'
    + '<div class="panel"><h3>🗓 本週學習週報</h3><div class="stat-strip"><span class="stat-chip">✨ 本週獲得 <b class="num">'+weeklyXp+' XP</b></span><span class="stat-chip">💡 課堂回答 <b class="num">'+weeklyLessons+' 次</b></span><span class="stat-chip">📌 任務通過 <b class="num">'+weeklyTasks+' 項</b></span></div><div class="mini" style="margin-top:8px">'+(weeklyXp?'孩子本週持續累積學習成果；可和孩子聊聊最有成就感的一次課堂表現。':'本週尚未有可統計的獎勵紀錄；下次可從課堂回答或完成一項任務開始。')+'</div></div>'
    + '<div class="panel"><h3>🎯 目前學習進度</h3><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b>任務完成 '+taskPct+'%</b><span class="mini">'+esc(learningNote)+'</span></div><div class="parent-progress" style="margin-top:8px"><i style="width:'+taskPct+'%"></i></div></div>'
    + '<div class="panel"><h3>📚 最近重大學習紀錄</h3><div class="mini" style="margin-bottom:9px">只整理課堂回答、任務完成、評量進步與老師的重要學習回饋。</div><div class="parent-learning-list">'+learnRows+'</div></div>'
    + '<div class="panel"><h3>📋 進行中的任務</h3><table><thead><tr><th>任務</th><th>獎勵</th><th>狀態</th></tr></thead><tbody>'+myTasks+'</tbody></table></div>'
    + '<details class="stu-optional"><summary>📖 查看重大學習日誌（最近 30 筆）</summary><div><ul class="log-list">'+logs+'</ul></div></details>'
    + '<div class="panel" style="border-color:#4d79a8;background:#f2f8ff"><h3>🔒 隱私保護說明</h3><div class="mini" style="line-height:1.9">只顯示孩子的學習摘要；其他學生姓名會隱藏，不顯示信箱、生日、貨幣、背包、技能、購物、抽卡或戰鬥紀錄。生日只用於當次核對，不存在瀏覽器。本頁 15 分鐘後會自動登出。</div></div>'
    + '<button class="btn" id="pBack">🚪 登出</button></div>';
  /* 家長頁沒有分頁列，改把各學習區塊做成一致的收合選單；第一項預設展開。 */
  app.querySelectorAll('.parent-shell > .panel').forEach((panel,i)=>{
    const h=panel.querySelector(':scope > h3');if(!h)return;
    const details=document.createElement('details');details.className='stu-optional parent-section';details.open=i===0;
    const summary=document.createElement('summary');summary.textContent=h.textContent;h.remove();
    const content=document.createElement('div');while(panel.firstChild)content.appendChild(panel.firstChild);
    details.append(summary,content);panel.replaceWith(details);
  });
  document.getElementById("pBack").onclick = ()=>{ doLogout(); };
}
