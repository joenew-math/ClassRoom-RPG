/* classroom-board.js
 * 教師大屏角色牆、BOSS 狀態、適屏排版與浮動控制台。
 * 傳統全域模組：由 classroom-rpg.js 提供 state、view、app 與戰鬥／獎勵函式。
 */
"use strict";

let boardFitFrame=0;
let boardConsolePosition=null;
let boardConsoleCollapsed=false;

function bestBoardMemberLayout(memberCount,cardWidth,cardHeight){
  const n=Math.max(1,memberCount||1),gap=4,innerW=Math.max(24,cardWidth-14),innerH=Math.max(20,cardHeight-38);
  let best={cols:1,rows:n,score:0};
  for(let cols=1;cols<=n;cols++){
    const rows=Math.ceil(n/cols),cellW=(innerW-gap*(cols-1))/cols,cellH=(innerH-gap*(rows-1))/rows;
    const score=Math.min(cellW,cellH/1.32);
    if(score>best.score)best={cols,rows,score};
  }
  return best;
}

function fitTeacherBoard(){
  if(view.page!=="teacher"||view.tview!=="board")return;
  const wall=app.querySelector(".board-focus"),quick=app.querySelector(".board-quickbar");
  if(!wall)return;
  const cards=[...wall.querySelectorAll(".group-card")],header=document.querySelector("body>header");
  const headerVisible=document.body.classList.contains("top-drawer-open");
  document.body.style.setProperty("--board-header-height",Math.ceil(header&&headerVisible?header.getBoundingClientRect().height:0)+"px");
  if(!cards.length)return;
  const top=wall.getBoundingClientRect().top;
  const bottom=quick?quick.getBoundingClientRect().top-5:window.innerHeight-7;
  const availableH=Math.max(72,Math.floor(bottom-top)),availableW=Math.max(180,Math.floor(wall.clientWidth));
  const groupGap=availableH<500?5:7,count=cards.length;
  let best=null;
  for(let cols=1;cols<=count;cols++){
    const rows=Math.ceil(count/cols),cardW=(availableW-groupGap*(cols-1))/cols,cardH=(availableH-groupGap*(rows-1))/rows;
    const layouts=cards.map(card=>bestBoardMemberLayout(+card.dataset.memberCount||0,cardW,cardH));
    const minScore=Math.min(...layouts.map(x=>x.score));
    const score=minScore-Math.abs((cardW/Math.max(1,cardH))-1.15)*.35;
    if(!best||score>best.score)best={cols,rows,cardW,cardH,layouts,score,minScore};
  }
  wall.style.setProperty("--board-cols",best.cols);
  wall.style.setProperty("--board-rows",best.rows);
  wall.style.setProperty("--board-wall-height",availableH+"px");
  wall.style.setProperty("--board-gap",groupGap+"px");
  wall.style.setProperty("--board-card-pad",(best.cardH<175?4:7)+"px");
  wall.style.setProperty("--board-member-gap",(best.minScore<42?2:4)+"px");
  wall.style.setProperty("--board-group-font",Math.max(9,Math.min(14,Math.round(best.minScore*.22)))+"px");
  wall.style.setProperty("--board-action-font",Math.max(8,Math.min(11,Math.round(best.minScore*.18)))+"px");
  wall.style.setProperty("--board-name-font",Math.max(8,Math.min(13,Math.round(best.minScore*.2)))+"px");
  wall.style.setProperty("--board-title-font",Math.max(7,Math.min(10,Math.round(best.minScore*.15)))+"px");
  cards.forEach((card,index)=>{
    card.style.setProperty("--member-cols",best.layouts[index].cols);
    card.style.setProperty("--member-rows",best.layouts[index].rows);
  });
}

function scheduleTeacherBoardFit(){
  cancelAnimationFrame(boardFitFrame);
  boardFitFrame=requestAnimationFrame(fitTeacherBoard);
}
window.addEventListener("resize",scheduleTeacherBoardFit,{passive:true});

function boardBossHeader(){
  const boss=state.boss;
  if(!boss)return "";
  if(!boss.standby)boss.standby={};
  const pct=Math.max(0,Math.round(boss.hp/Math.max(1,boss.maxHp)*100)),nextGroup=nextAttackGroup();
  const order=[...new Set(state.students.map(student=>student.group))]
    .filter(group=>state.students.some(student=>student.group===group))
    .sort((a,b)=>groupAvgAgi(b)-groupAvgAgi(a));
  const orderText=order.map(group=>{
    const done=!state.students.some(student=>student.group===group&&student.currentHp>0&&!boss.standby[student.id]);
    return(group===nextGroup?'▶ ':'')+group+(done?' ✓':'');
  }).join(' → ');
  return '<div class="board-boss-top" data-bossanchor="1"><div class="goal-wrap">'
    +'<span class="boss-name">🐉 '+esc(boss.name)+'</span>'
    +'<div class="goal-bar boss-bar"><i style="width:'+pct+'%"></i><span class="num">'+boss.hp+' / '+boss.maxHp+' HP</span></div>'
    +'<span class="boss-order">出手順序：'+esc(orderText||'—')+'</span></div></div>';
}

function boardMemberCard(student,lesson){
  const title=student.title?"【"+esc(student.title)+"】":"";
  const maxHp=student.maxHp+skillMaxHpBonus(student),hpPct=Math.max(0,Math.round(student.currentHp/maxHp*100));
  const down=student.currentHp<=0,hpColor=hpPct>50?"#5cc47a":hpPct>25?"#f0b429":"#e05252";
  const picked=view.multiSel&&view.multiSel.includes(student.id),answered=lesson.active&&lesson.answered&&lesson.answered[student.id];
  const boss=state.boss,buff=boss&&boss.groupBuffs&&boss.groupBuffs[student.group]||{},tags=[];
  if(boss){
    if(down)tags.push("💤 休整中");
    else if(boss.standby&&boss.standby[student.id])tags.push("✓ 已行動");
    else if(student.group===nextAttackGroup())tags.push("⚔️ 準備出手");
    else tags.push("⏳ 等待回合");
    if(buff.atk)tags.push("🔥 攻擊+"+Math.round(buff.atk*100)+"%");
    if(buff.def)tags.push("🛡 減傷+"+Math.round(buff.def*100)+"%");
  }
  return '<button class="member'+(down?' downed':'')+(picked?' msel':'')+(answered?' msel':'')+'" data-award="'+student.id+'" data-charwall="'+student.id+'">'
    +(picked?'<span class="msel-badge">✓</span>':'')
    +'<span class="member-doll"'+(down?' style="filter:grayscale(1) brightness(.6)"':'')+'>'+dollSVG(student,180)+'</span>'
    +'<span class="mname"><span class="mlv-in num">Lv.'+student.level+'</span> '+esc(student.name)+(down?' 💤':'')+'</span>'
    +'<div class="member-hp" style="width:76%;min-width:72px;height:9px;background:#2a3350;border:1px solid rgba(0,0,0,.45);border-radius:5px;overflow:hidden;margin:3px auto 1px"><i style="display:block;height:100%;width:'+hpPct+'%;background:'+hpColor+'"></i></div>'
    +(boss?'<span class="mtitle" style="display:block;font-weight:900;color:'+(down?'#b83232':'#24324a')+'">HP '+Math.max(0,student.currentHp)+' / '+maxHp+'</span><span class="mtitle" style="display:block;line-height:1.35">'+tags.join('・')+'</span>':answered?'<span class="mtitle" style="color:#b8860b">✓ 已回答</span>':lesson.active?'<span class="mtitle" style="color:#1f6fa8">💡 點此判定回答</span>':title?'<span class="mtitle">'+title+'</span>':'')
    +'</button>';
}

function teacherBoard(){
  const lesson=state.lesson||{};
  const courseButton='<a class="btn board-course-link" href="'+COURSE_CATALOG_URL+'" target="_blank" rel="noopener" title="開啟課後複習課程">📚 課程目錄</a>';
  if(lesson.active&&lesson.mode==="zone")return zoneBoardHtml()+'<button class="btn zone-back-floating" id="zoneBack">← 返回大屏</button>'+courseButton;
  const walls=state.groups.map(group=>{
    const members=state.students.filter(student=>student.group===group);
    const cards=members.map(student=>boardMemberCard(student,lesson)).join('')||'<div class="mini" style="grid-column:1/-1">尚無成員——到名冊管理加入學生</div>';
    return '<div class="group-card" data-member-count="'+members.length+'"><div class="group-head"><span class="gname">'+esc(group)+' 組</span>'
      +'<span class="gscore num">'+groupScore(group)+' XP</span><span class="hsp"></span><button class="gaward" data-gaward="'+esc(group)+'">整組 +10 XP</button></div>'
      +'<div class="member-grid">'+cards+'</div></div>';
  }).join('');
  return boardBossHeader()+'<div class="group-wall board-focus">'+walls+'</div>'+floatConsole()+courseButton;
}

function floatConsole(){
  const progress=progCheck(),pct=Math.min(100,Math.round(progress.exploreXp/Math.max(1,progress.exploreGoal)*100));
  const stageText=progress.stage===0?"🗺 探索":progress.stage===1?"⚔️ 魔王":"🏟 競技場";
  const boss=state.boss;
  let bossControls="";
  if(boss){
    if(!boss.standby)boss.standby={};
    const nextGroup=nextAttackGroup();
    const order=[...new Set(state.students.map(student=>student.group))].filter(group=>state.students.some(student=>student.group===group)).sort((a,b)=>groupAvgAgi(b)-groupAvgAgi(a));
    const orderText=order.map(group=>{const done=!state.students.some(student=>student.group===group&&student.currentHp>0&&!boss.standby[student.id]);return(group===nextGroup?'▶':'')+group+(done?'✓':'');}).join(' → ');
    const bossPct=Math.round(boss.hp/boss.maxHp*100);
    bossControls='<div class="fc-boss"><div class="fc-bossbar"><span>🐉 '+esc(boss.name)+'</span><span class="num">'+boss.hp+'/'+boss.maxHp+'</span></div>'
      +'<div class="goal-bar boss-bar" style="margin:4px 0"><i style="width:'+bossPct+'%"></i></div><div style="font-size:12px;font-weight:700;margin:4px 0">出手:'+esc(orderText||'—')+'</div>'
      +'<div class="fc-btns"><button class="btn gold" id="bsGroupAtk"'+(nextGroup?'':' disabled')+'>⚔️ '+(nextGroup?nextGroup+'組攻擊':'全部打完')+'</button>'
      +'<button class="btn" id="bsSkip"'+(nextGroup?'':' disabled')+'>⏭ 跳過</button><button class="btn danger" data-bscounter="1">🐉 反擊</button><button class="btn" id="bsRestBoard">💤 休息</button></div></div>';
  }
  return '<div id="float-console" class="fc-open"><div class="fc-bar" id="fcDrag"><span class="fc-title">🎮 老師控制台</span><button class="fc-min" id="fcMin" title="收合">—</button></div>'
    +'<div class="fc-body"><div class="fc-goal">'+stageText+' <b class="num">'+(progress.stage===0?progress.exploreXp+'/'+progress.exploreGoal+'('+pct+'%)':progress.stage===1?'討伐中':'已開放')+'</b>'
    +(progress.stage===0?'<button class="btn" id="goalEdit" style="margin-left:6px;padding:2px 10px">設定</button>':'')+'</div>'+bossControls
    +'<div class="fc-btns" style="margin-top:8px"><button class="btn'+(view.locked?' gold':'')+'" id="btnLock">'+(view.locked?'🔒 投影中':'🔓 投影模式')+'</button>'
    +'<button class="btn'+(view.multiSel?' gold':'')+'" id="btnMulti">'+(view.multiSel?'☑ 已選 '+view.multiSel.length+' 人(點角色勾選)':'☑ 批次加分')+'</button>'
    +'<button class="btn'+(state.lesson&&state.lesson.active?' gold':'')+'" id="btnLesson">'+(state.lesson&&state.lesson.active?'🏁 結束答題':'📣 發起答題')+'</button>'
    +(CLOUD.on()?'<button class="btn" id="btnQr">📱 登入 QR</button>':'')
    +(view.multiSel&&view.multiSel.length?'<button class="btn gold" id="btnMultiGo">💰 發獎勵給 '+view.multiSel.length+' 人</button>':'')
    +(pendingSubs().length?'<span class="stat-chip">📌 待審 '+pendingSubs().length+'</span>':'')
    +'</div></div><button id="fcBubble" class="fc-bubble" title="展開控制台">🎮</button></div>';
}

function bindFloatConsole(){
  const consoleElement=document.getElementById("float-console");
  if(!consoleElement)return;
  if(boardConsolePosition){
    consoleElement.style.left=boardConsolePosition.left+"px";consoleElement.style.top=boardConsolePosition.top+"px";
    consoleElement.style.right="auto";consoleElement.style.bottom="auto";
  }
  if(boardConsoleCollapsed){consoleElement.classList.remove("fc-open");consoleElement.classList.add("fc-collapsed");}
  const clampPosition=(left,top,element)=>({left:Math.max(4,Math.min(window.innerWidth-element.offsetWidth-4,left)),top:Math.max(4,Math.min(window.innerHeight-element.offsetHeight-4,top))});
  const enableDrag=handle=>{
    let dragging=false,moved=false,startX=0,startY=0,originX=0,originY=0;
    const down=event=>{dragging=true;moved=false;const point=event.touches?event.touches[0]:event,rect=consoleElement.getBoundingClientRect();startX=point.clientX;startY=point.clientY;originX=rect.left;originY=rect.top;consoleElement.style.right="auto";consoleElement.style.bottom="auto";consoleElement.style.left=rect.left+"px";consoleElement.style.top=rect.top+"px";event.preventDefault();};
    const move=event=>{if(!dragging)return;const point=event.touches?event.touches[0]:event,dx=point.clientX-startX,dy=point.clientY-startY;if(Math.abs(dx)>3||Math.abs(dy)>3)moved=true;const position=clampPosition(originX+dx,originY+dy,consoleElement);consoleElement.style.left=position.left+"px";consoleElement.style.top=position.top+"px";boardConsolePosition=position;event.preventDefault();};
    const up=()=>{dragging=false;};
    handle.addEventListener("mousedown",down);handle.addEventListener("touchstart",down,{passive:false});
    window.addEventListener("mousemove",move);window.addEventListener("touchmove",move,{passive:false});window.addEventListener("mouseup",up);window.addEventListener("touchend",up);
    return()=>moved;
  };
  const dragBar=document.getElementById("fcDrag"),bubble=document.getElementById("fcBubble");
  if(dragBar)enableDrag(dragBar);
  const bubbleMoved=bubble?enableDrag(bubble):null,minimize=document.getElementById("fcMin");
  if(minimize)minimize.onclick=event=>{event.stopPropagation();consoleElement.classList.remove("fc-open");consoleElement.classList.add("fc-collapsed");boardConsoleCollapsed=true;};
  if(bubble)bubble.addEventListener("click",()=>{if(bubbleMoved&&bubbleMoved())return;consoleElement.classList.remove("fc-collapsed");consoleElement.classList.add("fc-open");boardConsoleCollapsed=false;});
}
