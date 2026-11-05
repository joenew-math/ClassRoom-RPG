/* course-leaderboard.js
 * 從 Lession/Lessionindex.html 拆出的傳統全域 runtime。
 * 請保留為一般 script，不要直接改成 type=module，避免破壞既有 inline handlers。
 */
/* ===== 目錄頁：學習完成度排行榜 ===== */
(function(){
  const TOT_TOPICS=202, TOT_QS=3030, TOT_LEVELS=72;
  const btn=document.createElement('button');
  btn.id='lbBtn';btn.type='button';btn.innerHTML='🏆 排行榜';
  const meBtn=document.createElement('button');
  meBtn.id='meBtn';meBtn.type='button';meBtn.innerHTML='👤 我的名字';
  const bar=document.querySelector('.topbar .wrap');
  const back=document.getElementById('back');
  if(bar&&back){bar.insertBefore(meBtn,back);bar.insertBefore(btn,back);}

  const panel=document.createElement('div');
  panel.id='lbPanel';
  panel.innerHTML='<div class="ph"><h3>🏆 學習完成度排行</h3><button class="x" type="button">×</button></div>'+
    '<div id="lbScope"></div><div id="lbRows"></div><div id="lbFoot"></div>';
  document.body.appendChild(panel);
  panel.querySelector('.x').addEventListener('click',()=>panel.classList.remove('open'));
  btn.addEventListener('click',()=>{panel.classList.toggle('open');if(panel.classList.contains('open'))render();});
  document.addEventListener('click',e=>{
    if(!panel.contains(e.target)&&e.target!==btn&&!btn.contains(e.target))panel.classList.remove('open');
  });

  const gameOrigin = 'https://longgang-grade7-math.joenew74056.chatgpt.site';
  let linkedProfile = null, gameRows = [], gameBoard = false, pendingRequest = '', gameConnected = false;
  function requestGameAccount(includeBoard = false) {
    if (!window.opener) return;
    pendingRequest = crypto.randomUUID();
    window.opener.postMessage({ type: 'longgang-course-account', requestId: pendingRequest, includeBoard }, gameOrigin);
  }
  window.addEventListener('message', event => {
    const data = event.data;
    if (event.origin !== gameOrigin || event.source !== window.opener || data?.type !== 'longgang-course-account-result' || data.requestId !== pendingRequest) return;
    gameConnected = true;
    linkedProfile = data.profile ?? null;
    gameRows = Array.isArray(data.rows) ? data.rows : [];
    if (linkedProfile) meBtn.textContent = '👤 ' + linkedProfile.name + ' · ' + linkedProfile.className + '班' + linkedProfile.seat + '號';
    else meBtn.textContent = '👤 登入旅途帳號';
    if (panel.classList.contains('open')) void render();
  });
  window.addEventListener('focus', () => requestGameAccount(panel.classList.contains('open') && gameBoard));
  requestGameAccount();

  /* 設定姓名與班級 */
  meBtn.addEventListener('click',async()=>{
    if (linkedProfile) {
      requestGameAccount(gameBoard);
      return;
    }
    if (gameConnected && window.opener) {
      window.opener.postMessage({ type: 'longgang-course-login' }, gameOrigin);
      return;
    }
    let cur={name:'',cls:''};
    try{ if(window.storage){const r=await window.storage.get('me_id',false); if(r)cur=JSON.parse(r.value);} }catch(e){}
    const nm=prompt('請輸入你的姓名：',cur.name||'');
    if(nm===null)return;
    const cl=prompt('請輸入班級（例：七年一班）：',cur.cls||'');
    if(cl===null)return;
    try{ if(window.storage) await window.storage.set('me_id',
      JSON.stringify({name:nm.trim().slice(0,12),cls:(cl||'').trim().slice(0,12)}),false); }catch(e){}
    meBtn.innerHTML='👤 '+(nm.trim()||'我的名字');
    alert('已設定！之後練習與闖關的進度都會計入排行榜。');
  });
  (async()=>{
    try{ if(window.storage){const r=await window.storage.get('me_id',false);
      if(r&&!linkedProfile){const m=JSON.parse(r.value); if(m.name)meBtn.textContent='👤 '+m.name;} } }catch(e){}
  })();

  let scope='全校';
  async function render(){
    if (gameBoard) {
      const sc = panel.querySelector('#lbScope');
      sc.replaceChildren();
      const course = document.createElement('button');
      course.textContent = '課程完成度';
      course.onclick = () => { gameBoard = false; void render(); };
      sc.appendChild(course);
      const box = panel.querySelector('#lbRows');
      box.replaceChildren();
      for (const row of gameRows.slice(0, 20)) {
        const element = document.createElement('div');
        element.className = 'r';
        const rank = document.createElement('span');
        rank.className = 'rk';
        rank.textContent = row.rank;
        const name = document.createElement('span');
        name.textContent = row.displayName;
        if (linkedProfile && String(row.className) === String(linkedProfile.className) && Number(row.seat) === Number(linkedProfile.seat)) name.textContent += '（我）';
        const points = document.createElement('span');
        points.className = 'sc';
        points.textContent = row.points + ' 分';
        element.append(rank, name, points);
        box.appendChild(element);
      }
      if (!gameRows.length) box.textContent = '等待全校排行載入，請從旅途遊戲登入後開啟課程目錄。';
      panel.querySelector('#lbFoot').textContent = '旅途遊戲 · 全校積分';
      return;
    }
    let list=[];
    try{ if(window.storage){const r=await window.storage.get('prog_lb',true); if(r)list=JSON.parse(r.value)||[];} }catch(e){}
    const agg={};
    list.forEach(e=>{
      const k=e.n+'|'+(e.c||'');
      if(!agg[k])agg[k]={name:e.n,cls:e.c||'',topics:0,right:0,levels:0,score:0,chaps:0};
      const a=agg[k];
      a.topics+=e.t||0; a.right+=e.r||0; a.levels+=e.l||0; a.score+=e.s||0; a.chaps++;
    });
    const rows0=Object.values(agg).map(a=>{
      a.pct=Math.round((a.topics+a.levels)/(TOT_TOPICS+TOT_LEVELS)*1000)/10;
      return a;
    });
    const classes=[...new Set(rows0.map(e=>e.cls).filter(Boolean))].sort();
    const sc=panel.querySelector('#lbScope'); sc.innerHTML='';
    if (linkedProfile) {
      const game = document.createElement('button');
      game.textContent = '旅途全校排行';
      game.onclick = () => { gameBoard = true; requestGameAccount(true); void render(); };
      sc.appendChild(game);
    }
    ['全校',...classes].forEach(o=>{
      const b=document.createElement('button');
      b.textContent=o==='全校'?'🏫 全校':o;
      if(o===scope)b.classList.add('on');
      b.addEventListener('click',()=>{scope=o;render();});
      sc.appendChild(b);
    });
    const rows=(scope==='全校'?rows0:rows0.filter(e=>e.cls===scope))
      .sort((a,b)=>b.pct-a.pct||b.right-a.right||b.score-a.score);
    const box=panel.querySelector('#lbRows');
    box.innerHTML = rows.length ? rows.slice(0,20).map((e,i)=>
      '<div class="r"><span class="rk">'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1)+'</span>'+
      '<span><span class="nm">'+esc(e.name)+'</span><br><span class="cl">'+
      (e.cls?esc(e.cls)+'　':'')+'主題 '+e.topics+'/'+TOT_TOPICS+'　答對 '+e.right+'/'+TOT_QS+
      '　通關 '+e.levels+'/'+TOT_LEVELS+'</span></span>'+
      '<span class="sc">'+e.pct+'%</span></div>').join('')
      : '<div class="empty">還沒有紀錄<br>先按「👤 我的名字」設定，<br>再去做練習或闖關就會上榜</div>';
    panel.querySelector('#lbFoot').textContent=
      '完成度 =（練習完成主題數 + 通關數）÷（'+TOT_TOPICS+' + '+TOT_LEVELS+'）';
  }
  function esc(s){const d=document.createElement('div');d.textContent=s==null?'':s;return d.innerHTML;}
})();

