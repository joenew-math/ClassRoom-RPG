/*

 * classroom-auth：教師／學生 Google 登入、課堂 QR、首次註冊與失敗復原控制器。

 * 本檔不保存權威角色資料；所有雲端讀寫都經由 classroom-cloud.js。

 */

let _googleLoginBusy=false;

function normalizeClassCode(v){
  v=String(v||"").trim();
  return (/^rpg-/i.test(v)||/^[a-z2-9]{5}$/i.test(v)) ? v.toUpperCase() : v; // 新 5 碼與舊 RPG 代碼均相容
}

function eduOidcLogin(){
  if(!EDU_OIDC.enabled || !EDU_OIDC.clientId || !EDU_OIDC.redirectUri){
    modalHost.innerHTML='<div class="overlay" id="eduSetupOv"><div class="modal" style="max-width:520px"><h3>🎓 教育體系身分認證・待介接</h3>'
      +'<p>登入入口已加入，但不能借用其他網站的 client_id。需先向教育體系身分認證服務申請本系統專用的 <b>client_id</b> 與 HTTPS 回呼網址，並由後端安全交換授權碼。</p>'
      +'<div class="mini" style="line-height:1.8">申請完成後再設定伺服器端 OIDC；不要把 client_secret 放進這個 HTML。</div>'
      +'<div class="inline-form" style="margin-top:12px"><a class="btn gold" href="'+EDU_OIDC.applyUrl+'" target="_blank" rel="noopener">開啟官方介接申請</a><button class="btn" id="eduSetupClose">關閉</button></div></div></div>';
    const close=()=>{modalHost.innerHTML="";}; document.getElementById("eduSetupClose").onclick=close; document.getElementById("eduSetupOv").onclick=e=>{if(e.target.id==="eduSetupOv")close();};
    return;
  }
  const stateKey=crypto.getRandomValues(new Uint32Array(4)).join("-");
  const nonce=crypto.getRandomValues(new Uint32Array(4)).join("-");
  sessionStorage.setItem("rpg-edu-oidc",JSON.stringify({state:stateKey,nonce,ts:Date.now()}));
  const u=new URL(EDU_OIDC.authorize); u.searchParams.set("client_id",EDU_OIDC.clientId); u.searchParams.set("redirect_uri",EDU_OIDC.redirectUri);
  u.searchParams.set("response_type","code");u.searchParams.set("scope","openid profile email eduinfo");u.searchParams.set("state",stateKey);u.searchParams.set("nonce",nonce);location.href=u.toString();
}

function teacherPairCode(){
  const a=new Uint8Array(20);crypto.getRandomValues(a);return Array.from(a,b=>b.toString(16).padStart(2,"0")).join("");
}

async function teacherPairRequest(name,payload,user){
  if(!CLASS_RPG_API_URL)throw new Error("跨裝置登入服務尚未連線");
  const headers={"content-type":"application/json"};
  if(user)headers.authorization="Bearer "+await user.getIdToken(false);
  const requestId=(crypto&&crypto.randomUUID)?crypto.randomUUID():(Date.now()+"-"+Math.random().toString(36).slice(2));
  const res=await fetch(String(CLASS_RPG_API_URL).replace(/\/$/,"")+"/"+name,{method:"POST",headers,body:JSON.stringify(Object.assign({requestId},payload||{}))});
  let packet={};try{packet=await res.json();}catch(_){}
  if(!res.ok||!packet.ok)throw new Error((packet.error&&packet.error.message)||("配對服務暫時無法使用（"+res.status+"）"));
  return packet.data||{};
}

async function approveTeacherPair(user,pair){
  await teacherPairRequest("teacherPairApprove",{pair},user);
  // 手機只負責把教師身分安全交接給教室螢幕；完成後立即登出手機，
  // 避免同一支手機稍後掃學生 QR 時沿用教師帳號建立學生角色。
  try{await FB.auth.signOut();}catch(_){}
  FB.user=null;CLOUD.role=null;
  try{localStorage.removeItem("rpg-last-role");sessionStorage.removeItem("rpg-login-role");}catch(_){}
  app.innerHTML='<div class="home"><div class="crest">✅</div><h2>教室螢幕登入成功</h2><div class="panel" style="max-width:500px;margin:0 auto"><p>教師身分已安全交接給教室螢幕，這支手機也已登出教師帳號。</p><div class="mini">請回到教室螢幕選擇班級，再由教師按下「開始上課」；系統才會產生本節課學生登入 QR Code。</div></div><button class="btn" id="pairPhoneClose" style="margin-top:12px">關閉此頁</button></div>';
  const b=document.getElementById('pairPhoneClose');if(b)b.onclick=()=>{try{window.close();}catch(_){} b.textContent='可以直接關閉瀏覽器';};
}

function openTeacherLoginQr(){
  if(!CLASS_RPG_API_URL){googleLogin("teacher");return;}
  const pair=teacherPairCode(),u=new URL(location.href);u.search="";u.hash="";u.searchParams.set("teacher","1");u.searchParams.set("pair",pair);
  const link=u.toString(),expiresAt=Date.now()+5*60*1000;
  modalHost.innerHTML='<div class="overlay qr-login-overlay" id="teacherLoginQrOverlay"><div class="modal qr-login-modal" style="max-width:440px;text-align:center">'
    +'<h4>📲 教師 Google 登入</h4><div class="msub">用教師手機掃描並登入 Google；完成後，這個教室螢幕會自動跳到「我的班級」。</div>'
    +'<div id="teacherLoginQrBox" class="qr-login-box" style="display:flex;justify-content:center;padding:14px;background:#fff;border:3px solid #141414;border-radius:12px;margin:12px auto;align-items:center">產生中…</div>'
    +'<div id="teacherPairStatus" class="mini" style="padding:8px;background:#fff8e0;border:2px solid #d8ad45;border-radius:8px;margin-bottom:7px">等待手機掃碼登入…</div>'
    +'<div id="teacherPairCountdown" class="mini" style="margin-bottom:10px">有效時間 05:00</div>'
    +'<div class="inline-form" style="justify-content:center"><button class="btn gold" id="teacherLoginHere">在這台裝置登入 Google</button><button class="btn gold" id="teacherPairRetry" style="display:none">重新產生 QR</button><button class="btn" id="teacherLoginQrClose">關閉</button></div>'
    +'<div class="mini" style="margin-top:8px">QR 只含 5 分鐘有效的一次性配對碼，不含帳號或密碼。</div></div></div>';
  let stopped=false,busy=false,tickTimer=0,pollFails=0;
  const close=()=>{stopped=true;if(tickTimer)clearInterval(tickTimer);modalHost.innerHTML="";};
  document.getElementById("teacherLoginQrOverlay").onclick=e=>{if(e.target.id==="teacherLoginQrOverlay")close();};
  document.getElementById("teacherLoginQrClose").onclick=close;
  document.getElementById("teacherLoginHere").onclick=()=>{close();googleLogin("teacher");};
  document.getElementById("teacherPairRetry").onclick=()=>{close();openTeacherLoginQr();};
  const refreshCountdown=()=>{
    const left=Math.max(0,expiresAt-Date.now()),el=document.getElementById("teacherPairCountdown");
    if(el){const sec=Math.ceil(left/1000);el.textContent="有效時間 "+String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0");}
    if(left<=0&&!stopped){
      stopped=true;if(tickTimer)clearInterval(tickTimer);
      const status=document.getElementById("teacherPairStatus"),retry=document.getElementById("teacherPairRetry"),box=document.getElementById("teacherLoginQrBox");
      if(status)status.textContent="⌛ 這組 QR 已失效，請重新產生。";
      if(retry)retry.style.display="";
      if(box)box.style.opacity=".28";
    }
  };
  refreshCountdown();tickTimer=setInterval(refreshCountdown,1000);
  loadQrLib(ok=>{const box=document.getElementById("teacherLoginQrBox");if(!box)return;if(ok&&window.QRCode){box.innerHTML="";new QRCode(box,{text:link,width:260,height:260,correctLevel:QRCode.CorrectLevel.M});}else box.innerHTML='<div class="mini">QR 產生器載入失敗。<br>請使用「在這台裝置登入 Google」。</div>';});
  const poll=async()=>{
    if(stopped||busy)return;busy=true;
    try{
      const data=await teacherPairRequest("teacherPairPoll",{pair});
      const status=document.getElementById("teacherPairStatus");
      if(data.customToken){
        if(status)status.textContent="✅ 手機驗證完成，正在登入教室螢幕…";
        stopped=true;if(tickTimer)clearInterval(tickTimer);
        const res=await FB.auth.signInWithCustomToken(data.customToken);
        modalHost.innerHTML="";
        await loginSuccess(res.user,"teacher");
        return;
      }
      pollFails=0;
      if(status)status.textContent="等待手機掃碼登入…";
    }catch(e){
      pollFails++;
      const status=document.getElementById("teacherPairStatus"),retry=document.getElementById("teacherPairRetry");
      if(status)status.textContent=pollFails>=3?"連線不穩，仍在自動重試；也可以重新產生 QR。":"配對等待中："+(e.message||e);
      if(retry&&pollFails>=3)retry.style.display="";
    }
    finally{busy=false;}
    if(!stopped)setTimeout(poll,1600);
  };
  setTimeout(poll,700);
}

async function studentRegistrationComplete(st){
  if(!st)return false;
  if(st.registrationComplete===true)return true;
  if(st.registrationComplete===false||!(st.email||"").trim())return false;
  /* 舊版沒有 registrationComplete：由 Worker 查詢完成選角的交易紀錄。
   * 這能區分「真正完成註冊」與「教師只手動填入信箱」的卡住資料。 */
  try{
    const packet=await CLOUD.callServer("registrationStatus",{});
    if(packet&&packet.student)Object.assign(st,packet.student);
    return !!(packet&&packet.complete);
  }catch(e){console.warn("registration status",e);return false;}
}

function loginLoading(title,detail,step){
  const old=document.getElementById("loginFlowLoading"),at=Math.max(1,Math.min(3,Number(step)||1));
  if(old){const h=old.querySelector("h3"),p=old.querySelector("p");if(h)h.textContent=title||"正在登入";if(p)p.textContent=detail||"請保持此頁開啟";old.querySelectorAll("[data-login-step]").forEach((x,i)=>x.classList.toggle("on",i<at));return;}
  modalHost.innerHTML='<div class="overlay" id="loginFlowLoading" style="z-index:9998"><div class="modal" style="width:min(90vw,430px);text-align:center"><div aria-hidden="true" style="width:54px;height:54px;margin:2px auto 12px;border:7px solid #e8dfc8;border-top-color:#efad19;border-radius:50%;animation:registrationSpin .85s linear infinite"></div><h3 style="margin:0 0 7px">'+esc(title||"正在登入")+'</h3><p class="mini" style="margin:0;line-height:1.7">'+esc(detail||"請保持此頁開啟")+'</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:13px"><span data-login-step class="tag on">1 Google</span><span data-login-step class="tag'+(at>=2?' on':'')+'">2 核對資料</span><span data-login-step class="tag'+(at>=3?' on':'')+'">3 進入班級</span></div></div></div>';
}

function loginLoadingDone(){const el=document.getElementById("loginFlowLoading");if(el)el.remove();}

function renderLoginRecovery(role,user,email,cid,error){
  prepareScrollableAuthPage();const isTeacher=role==="teacher",message=String(error&&error.message||error||"登入資料讀取失敗");
  app.innerHTML='<div class="home" style="min-height:100vh;padding-bottom:max(30px,env(safe-area-inset-bottom))"><div class="crest">🔄</div><h2>登入尚未完成</h2><div class="panel" style="max-width:560px;margin:0 auto;text-align:left"><p>Google 身分已確認，但'+(isTeacher?'班級清單':'班級角色')+'暫時無法載入。</p><div class="mini" style="padding:9px;background:#fff3d5;border:2px solid #d6a63c;border-radius:8px;word-break:break-word">'+esc(message)+'</div><div class="mini" style="margin-top:9px;line-height:1.7">帳號：<b>'+esc(email||"")+'</b>'+(cid?'<br>班級：<b>'+esc(cid)+'</b>':'')+'<br>可先重試，不會重複建立角色或清除既有資料。</div></div><div class="inline-form" style="justify-content:center;margin-top:14px"><button class="btn gold" id="loginRetry">↻ 重新讀取</button><button class="btn" id="loginOtherAccount">使用其他 Google 帳號</button><button class="btn" id="loginRecoveryHome">回首頁</button></div></div>';
  document.getElementById("loginRetry").onclick=()=>loginSuccess(user,role);
  document.getElementById("loginOtherAccount").onclick=async()=>{try{await FB.auth.signOut();}catch(_){}FB.user=null;googleLogin(role);};
  document.getElementById("loginRecoveryHome").onclick=async()=>{try{await FB.auth.signOut();}catch(_){}FB.user=null;CLOUD.role=null;view={page:"home"};render();};
}

async function loginSuccess(user,role){
  loginLoading("正在確認登入","Google 身分已確認，正在核對班級與角色資料…",2);
  try{return await completeLoginSuccess(user,role);}
  finally{loginLoadingDone();}
}

async function completeLoginSuccess(user, role){
  FB.user = user;
  const email = (user.email||"").toLowerCase();
  try{ localStorage.setItem("rpg-last-role", role); }catch(_){}
  if(role==="teacher"){
    CLOUD.role = "teacher";
    const pair=String(new URLSearchParams(location.search).get("pair")||"");
    if(pair){
      try{await approveTeacherPair(user,pair);}
      catch(e){toast("教室螢幕配對失敗："+(e.message||e),true);view={page:"classes",role:"teacher"};await renderClasses(email);}
      return;
    }
    view = {page:"classes", role:"teacher"};await renderClasses(email);
  }else{
    CLOUD.role = "student";
    let join=null; try{ join=JSON.parse(sessionStorage.getItem("rpg-student-join")||"null"); }catch(_){}
    const studentMode=sessionStorage.getItem("rpg-student-mode")||(join?"register":"login");
    const entryParams=new URLSearchParams(location.search);
    const dotaEntry=entryParams.get("dota"), wantsMoba=dotaEntry==="1"||dotaEntry==="signup", wantsReward=!!entryParams.get("reward");
    const sessionToken=String(entryParams.get("session")||"");
    let cid="";
    if(studentMode==="register") cid=normalizeClassCode((join||{}).cid||""); // 只有新生註冊使用手動班級代碼
    else{
      const urlCid=normalizeClassCode(entryParams.get("class")||"");
      cid=urlCid; // 已註冊學生由本節課 QR 帶入班級，不再靠舊班級記錄猜測
    }
    if(!cid&&studentMode==="waiting"){ renderStudentWaiting(email,user); return; }
    if(!cid){ renderStudentSessionMissing(email,"請掃描老師投影的本節課班級 QR Code，再使用 Google 帳號登入。"); return; }
    try{
      let enrollment=null;
      if(studentMode==="login"){
        const account=await CLOUD.getStudentAccount(user,cid);
        if(!account){CLOUD.cid=cid;renderStudentLoginMissing(email);return;}
      }
      if(studentMode==="register"){
        if(!join||normalizeClassCode(join.cid)!==normalizeClassCode(cid)||!rosterBirthValid(String(join.birth||""))){renderClaim(email,join);return;}
        enrollment=await CLOUD.beginEnrollment(user,cid,join.sno,join.seat,email,join.birth);
      }
      if(studentMode==="qr-register"){
        const account=await CLOUD.getStudentAccount(user,cid);
        if(!account){
          CLOUD.cid=cid;
          renderClaim(email,{cid});
          return;
        }
        sessionStorage.setItem("rpg-student-mode","login");
      }
      if(studentMode==="auto"){
        const account=await CLOUD.getStudentAccount(user,cid);
        if(!account){
          CLOUD.cid=cid;
          renderAutoEnroll(email,{cid});
          return;
        }
        sessionStorage.setItem("rpg-student-mode","login");
      }
      /* 登入判定與角色選擇完成前不啟動即時監聽，避免手機慢網路的
       * 首批 snapshot 把選角頁重新繪製成首頁。 */
      await CLOUD.loadClass(cid, email,{listen:false});
      if((studentMode==="login"||studentMode==="qr-register"||studentMode==="auto") && !wantsMoba && !wantsReward){
        const live=state.classSession||{};
        if(!sessionToken || !classSessionIsLive(live,sessionToken)){
          renderStudentSessionMissing(email,"這張課堂 QR 已失效，或老師尚未按下「開始上課」。請掃描大屏目前顯示的新 QR Code。"); return;
        }
      }
      if(enrollment){
        const matched=state.students.find(x=>String(x.id)===String(enrollment.sid));
        if(!matched){ renderClaim(email,join); toast("名冊中找不到這組學號與座號，請重新核對",true); return; }
        if((matched.email||"").trim() && (matched.email||"").toLowerCase()!==email){
          renderClaim(email,join); toast("此名冊資料已綁定其他帳號，請洽老師解綁",true); return;
        }
        sessionStorage.removeItem("rpg-student-join");
        if(!(await studentRegistrationComplete(matched))){
          renderJobPick(matched,email);
          return;
        }
      }
      const ownStudent=state.students.find(x=>String(x.id)===String(CLOUD.myId||""));
      if(ownStudent&&!(await studentRegistrationComplete(ownStudent))){
        renderJobPick(ownStudent,email);
        return;
      }
      if(ownStudent&&needsLegacyClaimReview(ownStudent)){
        renderJobPick(ownStudent,email,{selectedJob:ownStudent.job});
        toast("偵測到舊版素體代碼，請重新確認一次角色外型；不會重建名冊或清除進度。",true);
        return;
      }
      const s = ownStudent||state.students.find(x=>(x.email||"").toLowerCase()===email);
      if(s){
        CLOUD.saveStudentAccount(user,cid,s.id,email);          // 舊帳號登入成功後自動補建索引
        sessionStorage.removeItem("rpg-student-mode");
        sessionStorage.removeItem("rpg-student-join");
        try{localStorage.removeItem("rpg-student-waiting-email");}catch(_){}
        const hasReward=!!new URLSearchParams(location.search).get("reward");
        loginLoading("準備完成","角色資料核對完成，正在進入班級…",3);
        view={page:"student", sid:s.id, tab:hasReward?"redeem":"stats", shopFilter:"all", role:"student"};render();startStudentRealtimeSafely();
        if(dotaEntry==="signup")setTimeout(()=>mobaStudentEnrollFromLink(s.id),250);
        else if(wantsMoba) setTimeout(()=>toast("🏰 已進入 Dota 參戰模式；若你在本場名單內，開戰後控制器會自動出現"),250);
      }
      else if(studentMode==="register"){ renderClaim(email,join); }
      else{ renderAutoEnroll(email,{cid}); }                 // QR 登入找不到角色：直接建立名冊與角色
    }catch(e){renderLoginRecovery("student",user,email,cid,e);toast("載入班級失敗:"+e.message,true);}
  }
}

function renderStudentWaiting(email,user){
  prepareScrollableAuthPage();
  try{localStorage.setItem("rpg-student-waiting-email",String(email||"").toLowerCase());}catch(_){}
  app.innerHTML='<div class="home after-school-home" style="min-height:100vh;padding-bottom:max(28px,env(safe-area-inset-bottom))"><div class="crest">📚</div><h2>課後自主學習大廳</h2>'
    +'<div class="panel after-school-intro"><p><b>已登入：'+esc(email)+'</b></p><div class="mini">放學後可從這裡複習、查看自己的學習進度與傳送學習回饋。老師開始上課後，請掃大屏 QR Code 進入另一套「課堂介面」。</div>'
    +'<div class="after-school-boundary"><span>🏠 課後：課程、地下城、進度、公告與抽卡、學習回饋</span><span>🏫 課堂：即時答題、獎勵、商店、競技與團隊活動</span></div></div>'
    +'<div class="after-school-shortcuts"><a class="after-school-card" href="'+COURSE_CATALOG_URL+'" target="_blank" rel="noopener"><b>📚 課程目錄</b><span>依冊別與單元複習</span></a><a class="after-school-card" href="#studentWaitingDungeon"><b>🏰 地下城作業</b><span>完成教師指定任務</span></a><a class="after-school-card" href="#studentWaitingDungeon"><b>📈 我的進度</b><span>只看自己的答題成果</span></a><a class="after-school-card" href="#studentWaitingDungeon"><b>📣 公告與抽卡</b><span>看完公告即可使用每日抽卡</span></a><a class="after-school-card" href="#studentWaitingDungeon"><b>🫶 學習回饋</b><span>內容只有老師看得到</span></a></div>'
    +'<div class="panel after-school-classes" style="max-width:820px;margin:14px auto;text-align:left"><h3>🎒 我的班級與課後任務</h3><div id="studentWaitingDungeon"><div class="mini">正在讀取你的班級、公告與學習進度…</div></div></div>'
    +'<div class="inline-form" style="justify-content:center;margin-top:14px"><button class="btn gold" id="studentWaitingReady">📱 老師開課後掃大屏 QR</button><button class="btn" id="studentWaitingOther">使用其他 Google 帳號</button><button class="btn" id="studentWaitingHome">回首頁（保持登入）</button></div></div>';
  document.getElementById("studentWaitingReady").onclick=()=>toast("老師開始上課後，請掃描大屏顯示的本節課 QR Code");
  document.getElementById("studentWaitingOther").onclick=async()=>{try{localStorage.removeItem("rpg-student-waiting-email");await FB.auth.signOut();}catch(_){}FB.user=null;googleLogin("student");};
  document.getElementById("studentWaitingHome").onclick=()=>{view={page:"home"};render();};
  loadStudentWaitingDungeon(email,user);
}

async function loadStudentWaitingDungeon(email,user){
  const host=document.getElementById("studentWaitingDungeon");if(!host)return;
  try{
    const rows=await CLOUD.listStudentClassSummaries(user);if(!document.getElementById("studentWaitingDungeon"))return;
    const entries=[];
    const html=rows.map((row,ri)=>{
      const live=classSessionIsLive(row.classSession),grade=dungeonGradeOf(row.student),s=row.student||{},ds=dungeonStatsOf(s),accuracy=ds.totalQuestions?Math.round(ds.totalCorrect/ds.totalQuestions*100):0;
      const tasks=(row.assignments||[]).map((t,ti)=>{const key=ri+"_"+ti;entries.push({key,row,task:t});return '<article class="dungeon-task-quick"><div><b>📘 '+esc(t.title||"地下城複習")+'</b><div class="mini">'+esc(row.className)+'・第 '+esc(t.dungeonVolume||"自選")+' 冊・目標 '+Math.max(1,Number(t.autoTarget)||1)+' 題</div></div><button class="btn gold" data-waiting-dungeon="'+key+'"'+(live?' disabled':'')+'>'+(live?'🔒 上課中':'開始作業')+'</button></article>';}).join("");
      const announcements=(row.announcements||[]).slice(0,3).map(a=>'<div class="after-school-announcement"><b>📣 '+esc(a.title||"班級公告")+'</b><div>'+esc(a.content||"")+'</div><span class="mini num">'+esc(a.t||"")+'</span></div>').join('')||'<div class="mini">目前沒有新公告。</div>';
      const feedback=['learning','private'].map(kind=>{const o=HELP_REQUEST_OPTIONS[kind];return '<button class="btn" data-waiting-feedback="'+ri+'|'+kind+'">'+o.icon+' '+esc(o.label)+'</button>';}).join('');
      const progress='<div class="after-school-progress"><span><b>Lv.'+(Number(s.level)||1)+'</b>角色等級</span><span><b>'+(Number(ds.totalCorrect)||0)+'／'+(Number(ds.totalQuestions)||0)+'</b>地下城答題</span><span><b>'+accuracy+'%</b>正確率</span><span><b>'+(Number((s.learningStreak||{}).days)||0)+' 天</b>學習連續</span></div>';
      return '<section class="after-school-class '+(live?'live':'')+'"><div class="after-school-class-head"><div><b>'+esc(row.className)+'</b><span class="tag">'+esc(grade.name)+'</span></div><span class="tag">'+(live?'🏫 上課中':'🏠 課後模式')+'</span></div>'
        +(live?'<div class="after-school-live-note">🔒 老師已開始上課，課後工具已暫停。請掃描大屏顯示的本節課 QR Code 進入課堂。</div>':progress+'<details open><summary>🏰 教師指定地下城作業</summary><div class="after-school-section">'+(tasks||'<div class="mini">目前沒有發布地下城複習任務；可先使用上方課程目錄自由複習。</div>')+'</div></details><details><summary>📣 公告與抽卡</summary><div class="after-school-section">'+announcements+'<div class="mini after-school-lock-note">🃏 看完今日公告即可使用每日抽卡；抽卡會依規則消耗金幣與每日次數。</div><button class="btn gold" data-waiting-announce="'+ri+'">開啟公告與抽卡</button></div></details><details><summary>🫶 學習回饋</summary><div class="after-school-section"><div class="mini">內容只有老師可以查看，不公開、不排行，也不影響個人或全班 XP。</div><div class="inline-form">'+feedback+'</div></div></details>')
        +'</section>';
    }).join("")||'<div class="mini">這個 Google 帳號目前沒有可讀取的班級角色。請先掃描老師的 QR Code 完成第一次註冊。</div>';
    host.innerHTML=html;
    host.querySelectorAll("[data-waiting-dungeon]").forEach(b=>b.onclick=async()=>{
      const entry=entries.find(x=>x.key===b.dataset.waitingDungeon);if(!entry)return;b.disabled=true;b.textContent="正在載入角色…";
      try{
        CLOUD.role="student";await CLOUD.loadClass(entry.row.cid,email,{listen:true});
        if(classSessionIsLive(state.classSession))throw new Error("老師已開始上課，地下城已關閉");
        const s=stu(String(entry.row.sid));if(!s)throw new Error("找不到這個班級角色");
        const task=taskById(Number(entry.task.id));view={page:"student",sid:s.id,tab:"dungeon",role:"student",accessMode:"afterSchool"};render();startStudentRealtimeSafely();await launchDungeon(s,task);
      }catch(e){b.disabled=false;b.textContent="開始作業";toast("無法進入地下城："+(e.message||e),true);}
    });
    host.querySelectorAll("[data-waiting-announce]").forEach(b=>b.onclick=async()=>{
      const row=rows[Number(b.dataset.waitingAnnounce)];if(!row)return;b.disabled=true;b.textContent="正在載入公告…";
      try{
        CLOUD.role="student";await CLOUD.loadClass(row.cid,email,{listen:true});
        if(classSessionIsLive(state.classSession))throw new Error("老師已開始上課，請掃 QR 進入課堂");
        const s=stu(String(row.sid));if(!s)throw new Error("找不到這個班級角色");
        view={page:"student",sid:s.id,tab:"announce",role:"student",accessMode:"afterSchool"};render();startStudentRealtimeSafely();
      }catch(e){b.disabled=false;b.textContent="開啟公告與抽卡";toast("無法開啟公告與抽卡："+(e.message||e),true);}
    });
    host.querySelectorAll("[data-waiting-feedback]").forEach(b=>b.onclick=()=>{
      const [riText,kind]=String(b.dataset.waitingFeedback||"").split("|"),row=rows[Number(riText)],opt=HELP_REQUEST_OPTIONS[kind];if(!row||!opt)return;
      modalConfirm(opt.icon+' '+opt.label+'\n\n這則回饋只有老師看得到。真正需要協助時再送出；若誤點，進入課堂後仍可取消。',async()=>{
        b.disabled=true;b.textContent="正在私密送出…";
        try{
          CLOUD.role="student";await CLOUD.loadClass(row.cid,email,{listen:false});
          if(classSessionIsLive(state.classSession))throw new Error("老師已開始上課，請先掃 QR 進入課堂");
          await CLOUD.sendHelpRequest(String(row.sid),kind);b.textContent="✅ 老師已收到";toast("🫶 學習回饋已送給老師");
        }catch(e){b.disabled=false;b.textContent=opt.icon+' '+opt.label;toast("回饋未送出："+(e.message||e),true);}
      },"確認私密送出");
    });
  }catch(e){host.innerHTML='<div class="mini" style="color:#a33">任務讀取失敗：'+esc(e.message||e)+'<br>可先等待老師 QR Code，或重新整理頁面。</div>';}
}

function renderStudentSessionMissing(email,message){
  sessionStorage.removeItem("rpg-student-mode");
  sessionStorage.removeItem("rpg-student-join");
  app.innerHTML='<div class="home"><div class="crest">📱</div><h2>需要本節課 QR Code</h2>'
    +'<div class="panel" style="max-width:500px;margin:0 auto"><p>'+esc(message||"請掃描老師顯示的班級 QR Code。")+'</p>'
    +'<div class="mini">目前登入帳號：<b>'+esc(email)+'</b><br>QR Code 只在本節課有效，結束上課後會自動失效。</div></div>'
    +'<button class="btn" id="sessionMissingBack" style="margin-top:12px">回首頁</button></div>';
  document.getElementById("sessionMissingBack").onclick=()=>{ try{FB.auth.signOut();}catch(_){} FB.user=null; view={page:"home"}; render(); };
}

function renderStudentLoginMissing(email){
  sessionStorage.removeItem("rpg-student-mode");
  sessionStorage.removeItem("rpg-student-join");
  app.innerHTML='<div class="home"><div class="crest">🎒</div><h2>找不到已註冊角色</h2>'
    +'<div class="panel" style="max-width:480px;margin:0 auto"><p>Google 帳號 <b>'+esc(email)+'</b> 尚未綁定這個班級的學生角色。</p>'
    +'<div class="mini" style="line-height:1.8">若是第一次使用，系統會直接建立班級名冊角色；若已註冊，請確認是否使用當初綁定的 Google 帳號。</div></div>'
    +'<div class="inline-form" style="justify-content:center;margin-top:12px"><button class="btn gold" id="missingRegister">第一次註冊</button><button class="btn" id="missingBack">回首頁</button></div></div>';
  document.getElementById("missingRegister").onclick=()=>renderAutoEnroll(email,{cid:CLOUD.cid});
  document.getElementById("missingBack").onclick=()=>{try{FB.auth.signOut();}catch(_){}FB.user=null;view={page:"home"};render();};
}

function isEmbeddedAuthBrowser(){
  const ua=String(navigator&&navigator.userAgent||"");
  return /\bLine\b|FBAN|FBAV|Instagram|MicroMessenger/i.test(ua);
}

function showExternalBrowserHelp(){
  const link=location.href;
  modalHost.innerHTML='<div class="overlay" id="externalBrowserHelp"><div class="modal" style="max-width:470px;text-align:left"><h4>請改用系統瀏覽器登入</h4><p>Google 為保護帳號，常會阻擋 LINE、Facebook、Instagram 等應用程式內的登入視窗。</p><ol class="mini" style="line-height:1.9"><li>按右上角「⋯」或分享選單</li><li>選擇「以瀏覽器開啟」</li><li>使用 Chrome 或 Safari 完成登入</li></ol><div class="inline-form" style="justify-content:center"><button class="btn gold" id="copyExternalLoginLink">複製目前連結</button><button class="btn" id="closeExternalBrowserHelp">我知道了</button></div></div></div>';
  document.getElementById("closeExternalBrowserHelp").onclick=()=>{modalHost.innerHTML="";};
  document.getElementById("externalBrowserHelp").onclick=e=>{if(e.target.id==="externalBrowserHelp")modalHost.innerHTML="";};
  document.getElementById("copyExternalLoginLink").onclick=async()=>{try{await navigator.clipboard.writeText(link);toast("已複製登入連結");}catch(_){prompt("請長按複製登入連結",link);}};
}

async function googleLogin(role){
  if(!FB.ready){ toast("登入服務尚未連線，請確認網路後重新整理。", true); return; }
  if(isEmbeddedAuthBrowser()){showExternalBrowserHelp();return;}
  if(navigator.onLine===false){toast("目前沒有網路連線，請連上網路後再登入。",true);return;}
  if(_googleLoginBusy)return;
  _googleLoginBusy=true;loginLoading("開啟 Google 登入","請選擇自己的 Google 帳號；完成前不要重複點擊。",1);
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({prompt:"select_account"}); // 共用平板每次明確選帳號，避免沿用上一位學生
  try{
    const res=await FB.auth.signInWithPopup(provider);await loginSuccess(res.user,role);
  }catch(err){
    const code = (err && err.code) || "";
    // 📱 彈窗被擋(手機、LINE/FB 內建瀏覽器常見)→ 自動改用整頁跳轉登入
    if(code==="auth/popup-blocked" || code==="auth/operation-not-supported-in-this-environment" || code==="auth/cancelled-popup-request"){
      try{ sessionStorage.setItem("rpg-login-role", role); }catch(_){}
      loginLoading("切換登入方式","手機瀏覽器不支援彈出視窗，正在改用整頁 Google 登入…",1);
      await FB.auth.signInWithRedirect(provider);
      return;
    }
    if(code==="auth/popup-closed-by-user"){toast("已取消 Google 登入");return;}
    if(code==="auth/unauthorized-domain"){
      toast("此網站網址尚未加入 Firebase 授權網域；請由老師部署後，在 Firebase Authentication 的『授權網域』加入目前網址。", true);
      return;
    }
    if(code==="auth/operation-not-allowed"){
      toast("Firebase 尚未開啟 Google 登入方式；請在 Authentication → Sign-in method 啟用 Google。", true);
      return;
    }
    if(code==="auth/network-request-failed"){
      toast("網路連線中斷，請確認 Wi-Fi 後再按一次登入。",true);return;
    }
    if(code==="auth/too-many-requests"){
      toast("短時間登入次數過多，請等待幾分鐘後再試。",true);return;
    }
    if(code==="auth/user-disabled"){
      toast("這個 Google 帳號目前已停用，請洽系統管理教師。",true);return;
    }
    if(code==="auth/account-exists-with-different-credential"){
      toast("這個信箱已使用其他登入方式建立帳號，請使用原本的登入方式或洽教師協助。",true);return;
    }
    if(code==="auth/web-storage-unsupported"){
      toast("瀏覽器禁止登入所需的網站儲存空間；請關閉無痕模式或改用 Chrome／Safari。",true);return;
    }
    toast("登入失敗:"+(err&&err.message||err), true);
  }finally{_googleLoginBusy=false;loginLoadingDone();}
}

function offerStudentQuickLogin(user){
  if(!user||!document.getElementById("studentQrGoogle")||document.getElementById("studentQuickLogin"))return;
  const grid=document.getElementById("studentQrGoogle").parentElement;if(!grid)return;
  const email=String(user.email||""),parts=email.split("@"),masked=parts.length>1?(parts[0].slice(0,2)+"•••@"+parts[1]):"目前的 Google 帳號";
  const box=document.createElement("div");box.id="studentQuickLogin";
  box.innerHTML='<div class="mini student-quick-account">目前帳號：<b>'+esc(user.displayName||masked)+'</b>（'+esc(masked)+'）</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px"><button class="btn gold" id="studentQuickContinue">🔐 登入角色</button><button class="btn" id="studentQuickRegister">🪪 第一次註冊</button></div><div class="mini student-quick-hint">不是你的帳號？請改按下方使用其他 Google 帳號。</div>';
  grid.insertBefore(box,grid.firstChild);
  const other=document.getElementById("studentQrGoogle");if(other)other.textContent="使用其他 Google 帳號";
  // Firebase 登入狀態在首頁縮放完成後才回傳；插入快速登入卡後必須重算高度，避免手機底部按鈕被裁切。
  requestAnimationFrame(fitHomePane);setTimeout(fitHomePane,80);
  const continueWith=mode=>{
    const q=new URLSearchParams(location.search),cid=normalizeClassCode(q.get("class")||"");
    try{localStorage.setItem("rpg-last-class",cid);sessionStorage.setItem("rpg-student-mode",mode);sessionStorage.removeItem("rpg-student-join");}catch(_){}
    loginSuccess(user,"student");
  };
  document.getElementById("studentQuickContinue").onclick=()=>continueWith("login");
  document.getElementById("studentQuickRegister").onclick=()=>continueWith("auto");
}

function prepareScrollableAuthPage(){
  document.body.classList.remove("home-menu-mode");
  app.style.removeProperty("height");app.style.removeProperty("overflow");
  window.scrollTo(0,0);
}

function registrationLoading(title,detail){
  const old=document.getElementById("registrationLoading");
  if(old){const h=old.querySelector("h3"),p=old.querySelector("p");if(h)h.textContent=title||"正在處理註冊";if(p)p.textContent=detail||"請保持此頁開啟";return;}
  modalHost.innerHTML='<div class="overlay" id="registrationLoading" style="z-index:9999"><div class="modal" style="width:min(88vw,390px);text-align:center"><div aria-hidden="true" style="width:58px;height:58px;margin:2px auto 13px;border:8px solid #eadfbe;border-top-color:#efad19;border-radius:50%;animation:registrationSpin .85s linear infinite"></div><h3 style="margin:0 0 8px">'+esc(title||"正在處理註冊")+'</h3><p class="mini" style="line-height:1.8;margin:0">'+esc(detail||"請保持此頁開啟")+'</p><div class="mini" style="margin-top:10px;color:#826300">請勿返回或重複按下按鈕</div></div></div>';
}

function registrationLoadingDone(){const el=document.getElementById("registrationLoading");if(el)el.remove();}

async function registrationQueuedCall(name,payload,onStage){
  const wait=300+Math.floor(Math.random()*1200);if(onStage)onStage("正在排隊，準備安全寫入…");await new Promise(r=>setTimeout(r,wait));
  let last=null;
  for(let attempt=0;attempt<3;attempt++){
    try{if(onStage)onStage(attempt?"連線繁忙，正在重新嘗試…":"正在核對班級與名冊…");return await CLOUD.callServer(name,payload);}
    catch(e){last=e;const transient=[429,500,502,503,504].includes(Number(e&&e.status))||/暫時|繁忙|逾時|timeout|network|fetch/i.test(String(e&&e.message||e));if(!transient||attempt===2)throw e;await new Promise(r=>setTimeout(r,700*(attempt+1)+Math.floor(Math.random()*500)));}
  }
  throw last||new Error("註冊服務暫時無法使用");
}

function renderAutoEnroll(email,prefill){
  prepareScrollableAuthPage();
  prefill=prefill||{};
  const cid=normalizeClassCode(prefill.cid||CLOUD.cid||new URLSearchParams(location.search).get("class")||""),displayName=String(prefill.name||(FB.user&&FB.user.displayName)||"").trim();
  CLOUD.cid=cid;
  app.innerHTML='<div class="home" style="min-height:100vh;padding-bottom:max(36px,env(safe-area-inset-bottom))"><div class="crest">🆕</div><h2>第一次註冊・加入班級</h2>'
    +'<div class="panel" style="width:100%;max-width:460px;margin:0 auto;text-align:left">'
    +'<div style="padding:9px;background:#eef8ff;border:2px solid #79bddd;border-radius:10px;margin-bottom:12px"><b>🏫 班級 '+esc(cid)+'</b><div class="mini">掃碼驗證完成。填寫一次資料後，系統會自動加入名冊並平均編組。</div></div>'
    +'<div class="mini" style="padding:8px;margin-bottom:10px;background:#fff8df;border:1px dashed #9b6b12;border-radius:8px"><b>填寫範例：</b>姓名「王小明」・學號「1120345」・座號「15」・生日「20130215」</div>'
    +'<label class="mini" for="autoName">學生姓名</label><input id="autoName" maxlength="30" autocomplete="name" value="'+esc(displayName)+'" placeholder="例：王小明" style="width:100%;margin:3px 0 9px">'
    +'<label class="mini" for="autoSno">學生學號</label><input id="autoSno" maxlength="80" autocomplete="off" value="'+esc(prefill.sno||'')+'" placeholder="例：1120345" style="width:100%;margin:3px 0 9px">'
    +'<label class="mini" for="autoSeat">班級座號</label><input id="autoSeat" maxlength="80" inputmode="numeric" autocomplete="off" value="'+esc(prefill.seat||'')+'" placeholder="例：15" style="width:100%;margin:3px 0 9px">'
    +'<label class="mini" for="autoBirth">學生生日（西元 YYYYMMDD）</label><input id="autoBirth" maxlength="8" inputmode="numeric" autocomplete="bday" value="'+esc(prefill.birth||'')+'" placeholder="例：20130215" aria-describedby="autoBirthHelp" style="width:100%;margin:3px 0 4px"><div class="mini" id="autoBirthHelp" style="margin-bottom:10px;color:#6a5530">請連續輸入 8 碼：西元年 4 碼＋月份 2 碼＋日期 2 碼，不要輸入斜線。</div>'
    +'<div class="mini" style="line-height:1.7;margin-bottom:10px">登入帳號：<b>'+esc(email)+'</b><br>若老師已匯入相同學號與座號，會認領原名冊；否則自動建立新名冊角色。</div>'
    +'<button class="btn gold" id="autoEnrollGo" style="width:100%;font-size:18px">建立名冊並繼續</button><div id="autoEnrollResult" class="mini" style="margin-top:8px"></div></div>'
    +'<button class="btn" id="autoEnrollCancel" style="margin-top:12px">取消並登出</button></div>';
  document.getElementById('autoEnrollCancel').onclick=()=>{try{FB.auth.signOut();}catch(_){}FB.user=null;sessionStorage.removeItem('rpg-student-mode');view={page:'home'};render();};
  const submit=async()=>{
    const name=document.getElementById('autoName').value.trim(),sno=document.getElementById('autoSno').value.trim(),seat=document.getElementById('autoSeat').value.trim(),birth=document.getElementById('autoBirth').value.trim(),btn=document.getElementById('autoEnrollGo'),result=document.getElementById('autoEnrollResult');
    if(name.length<2){toast('請輸入學生姓名（至少 2 個字）',true);return;}
    if(!sno||!seat){toast('請輸入學號與座號',true);return;}
    if(!rosterBirthValid(birth)){toast('生日格式錯誤，請輸入西元 8 碼，例如 20130215',true);document.getElementById('autoBirth').focus();return;}
    btn.disabled=true;btn.textContent='正在安全建立名冊…';result.style.color='#6a5530';result.textContent='正在確認學號、座號與班級資料，請稍候…';
    try{
      registrationLoading('正在加入班級','正在排隊，請保持此頁開啟…');
      const sessionToken=String(new URLSearchParams(location.search).get('session')||''),stage=msg=>registrationLoading('正在加入班級',msg),packet=await registrationQueuedCall('autoEnrollStudent',{name,sno,seat,birth,sessionToken},stage);
      result.style.color='#16794b';result.textContent='✅ 已加入 '+String(packet.group||'A')+' 組，正在載入角色…';
      registrationLoading('正在載入角色','名冊已建立，正在檢查是否有可沿用的角色外型…');
      await CLOUD.loadClass(cid,email,{listen:false});
      const st=state.students.find(x=>String(x.id)===String(packet.sid));if(!st)throw new Error('角色已建立，但暫時讀取不到，請重新整理頁面');
      try{sessionStorage.removeItem('rpg-student-join');sessionStorage.removeItem('rpg-student-mode');}catch(_){}
      registrationLoadingDone();
      if(await studentRegistrationComplete(st)){
        CLOUD.myId=st.id;CLOUD.myGroup=st.group;
        view={page:'student',sid:st.id,tab:'stats',shopFilter:'all',role:'student'};render();startStudentRealtimeSafely();
        toast(packet.profileImported?'已沿用這個 Google 帳號的職業與角色外型；本班等級與獎勵重新開始。':'歡迎回到你的班級角色！');
        return;
      }
      renderJobPick(st,email);
    }catch(e){registrationLoadingDone();const msg=e.message||e;btn.disabled=false;btn.textContent='建立名冊並繼續';result.style.color='#b42318';result.textContent='❌ 註冊失敗：'+msg;toast('註冊失敗：'+msg,true);}
  };
  document.getElementById('autoEnrollGo').onclick=submit;['autoName','autoSno','autoSeat','autoBirth'].forEach(id=>document.getElementById(id).onkeydown=e=>{if(e.key==='Enter')submit();});
  setTimeout(()=>{const el=document.getElementById(displayName?'autoSno':'autoName');if(el)el.focus();},50);
}

function renderClaim(email,prefill){
  prepareScrollableAuthPage();
  prefill=prefill||{};
  const pendingCid=normalizeClassCode(prefill.cid||CLOUD.cid||"");
  const onlinePending=CLOUD.role==="student"&&!!FB.user&&!!pendingCid;
  const free = state.students.filter(x=>!(x.email||"").trim());
  if(!free.length&&!onlinePending){
    if(state.allowSelfEnroll&&!CLOUD.on()){ renderEnroll(email); return; } // 自助註冊僅限離線示範班
    app.innerHTML = '<div class="home"><div class="crest">🧑‍🎓</div><h2>找不到可認領的角色</h2>'
      + '<p>名冊中沒有你的信箱('+esc(email)+'),而且所有角色都已被認領。<br>請請老師在名冊確認你的資料。</p>'
      + '<button class="btn" id="cbk">← 回登入</button></div>';
    document.getElementById("cbk").onclick=()=>{ FB.auth.signOut(); FB.user=null; view={page:"home"}; render(); };
    return;
  }
  app.innerHTML = '<div class="home"><div class="crest">🧑‍🎓</div><h2>新生註冊・核對班級名冊</h2>'
    + '<p>登入信箱:<b>'+esc(email)+'</b><br>請輸入老師名冊中的學號與座號，系統只會顯示核對成功的本人資料。</p>'
    + '<div class="panel" style="width:100%;max-width:430px;margin:0 auto;text-align:left">'
    + '<div class="mini">🏫 班級代碼</div><div class="num" style="font-size:20px;font-weight:900;letter-spacing:2px;margin-bottom:10px">'+esc(CLOUD.cid||prefill.cid||"")+'</div>'
    + '<label class="mini">學生學號</label><input id="claimSno" value="'+esc(prefill.sno||"")+'" placeholder="例：1120345" style="width:100%;margin:3px 0 9px">'
    + '<label class="mini">班級座號</label><input id="claimSeat" value="'+esc(prefill.seat||"")+'" inputmode="numeric" placeholder="例：15" style="width:100%;margin:3px 0 9px">'
    + '<label class="mini">學生生日（西元 YYYYMMDD）</label><input id="claimBirth" value="'+esc(prefill.birth||"")+'" maxlength="8" inputmode="numeric" autocomplete="bday" placeholder="例：20130215" style="width:100%;margin:3px 0 4px"><div class="mini" style="margin-bottom:10px;color:#6a5530">請輸入西元年、月、日共 8 碼，不要輸入「／」或「-」。</div>'
    + '<button class="btn gold" id="claimGo" style="width:100%">核對名冊並加入班級</button><div id="claimResult" class="mini" style="margin-top:7px"></div></div>'
    + (state.allowSelfEnroll&&!CLOUD.on() ? '<div style="margin-top:14px"><button class="btn gold" id="goEnroll">🆕 名單上沒有我 → 自行加入</button></div>' : '')
    + '<div style="margin-top:12px"><button class="btn" id="cbk">← 取消</button></div></div>';
  document.getElementById("cbk").onclick=()=>{ FB.auth.signOut(); FB.user=null; view={page:"home"}; render(); };
  const ge = document.getElementById("goEnroll");
  if(ge) ge.onclick = ()=> renderEnroll(email);
  const claim=async()=>{
    const sno=document.getElementById("claimSno").value.trim(),seat=document.getElementById("claimSeat").value.trim(),birth=document.getElementById("claimBirth").value.trim();
    if(!sno||!seat){toast("請輸入學號與座號",true);return;}
    if(!rosterBirthValid(birth)){toast("生日格式錯誤，請輸入西元 8 碼，例如 20130215",true);document.getElementById("claimBirth").focus();return;}
    const btn=document.getElementById("claimGo"),result=document.getElementById("claimResult");btn.disabled=true;btn.textContent="正在核對名冊…";if(result){result.style.color="#6a5530";result.textContent="正在核對學號與座號，請稍候…";}
    try{
      let st=null;
      if(onlinePending){const preview=await CLOUD.lookupEnrollment(pendingCid,sno,seat);st=preview.student||null;}
      else st=state.students.find(x=>String(x.sno||"").trim()===sno && String(x.seat||x.sno||"").trim()===seat);
      if(!st)throw new Error("找不到資料，請檢查班級代碼、學號與座號");
      const authorizedEmail=String(st.email||st.registrationEmail||"").trim().toLowerCase();
      if(authorizedEmail&&authorizedEmail!==email)throw new Error("此學生資料已授權其他 Google 帳號，請老師先解綁");
      if(result){result.style.color="#16794b";result.innerHTML="✅ 名冊核對成功：<b>"+esc(seat)+" 號「"+esc(st.name)+"」</b>";}
      if(!confirm("名冊核對成功："+seat+" 號「"+st.name+"」\n確定綁定目前的登入帳號？")){btn.disabled=false;btn.textContent="核對名冊並加入班級";if(result)result.innerHTML="已取消綁定，可重新核對。";return;}
      btn.textContent="正在建立角色資料…";
      registrationLoading("正在認領名冊","正在排隊並驗證學號、座號、生日與 Google 帳號…");
      const enrollment=await registrationQueuedCall("claimStudent",{sno,seat,birth,sessionToken:String(new URLSearchParams(location.search).get("session")||"")},msg=>registrationLoading("正在認領名冊",msg));
      if(String(enrollment.sid)!==String(st.id))throw new Error("名冊核對資料不一致，請重新整理後再試");
      if(onlinePending){registrationLoading("正在載入角色","名冊核對完成，正在開啟素體與職業選擇…");await CLOUD.loadClass(pendingCid,email,{listen:false});st=state.students.find(x=>String(x.id)===String(enrollment.sid))||st;}
      try{sessionStorage.removeItem("rpg-student-join");sessionStorage.removeItem("rpg-student-mode");}catch(_){}
      // 正式名冊認領也必須先選擇已由教師校正的素體；即使班級鎖定職業，仍保留外型選擇。
      registrationLoadingDone();
      renderJobPick(st,email);
    }catch(e){registrationLoadingDone();const msg=e.message||e;btn.disabled=false;btn.textContent="核對名冊並加入班級";if(result){result.style.color="#b42318";result.textContent="❌ 註冊失敗："+msg;}toast("註冊失敗："+msg,true);}
  };
  document.getElementById("claimGo").onclick=claim;["claimSno","claimSeat","claimBirth"].forEach(id=>document.getElementById(id).onkeydown=e=>{if(e.key==="Enter")claim();});
}

function renderEnroll(email){
  // 學生註冊只選素體；位置與比例由教師在「美術→註冊素體校正」預先設定。
  let tune = Object.assign({x:0,y:0,s:1},(state.baseTunePresets||{})[BASE_TUNE_REFERENCE]||{});
  const tryOn = (variant)=>{
    const gender = String(variant).indexOf("female")===0 ? "female" : "male";
    return dollSVG({roStyle:true, gender, baseVariant:variant, job:"Warrior", level:1,
      hatId:1, clothesId:4, pantsId:40, shoesId:15, backId:17, weaponId:9,
      hairId:null, eyesId:null, browsId:null, noseId:null, blueprints:{}, baseTune:tune}, 158);
  };
  const gOpts = state.groups.map(g=>'<option value="'+esc(g)+'">'+esc(g)+' 組</option>').join("");
  app.innerHTML = '<div class="home"><div class="crest">🆕</div><h2>加入公會</h2>'
    + '<p>登入信箱:<b>'+esc(email)+'</b><br>填寫你的資料,加入這個班級的冒險!</p>'
    + '<div class="panel" style="width:100%;max-width:520px;margin:0 auto;text-align:left">'
    + '<div style="margin-bottom:8px"><label class="mini">你的姓名</label><br><input type="text" id="enName" placeholder="真實姓名" style="width:100%;padding:6px"></div>'
    + '<div style="margin-bottom:8px"><label class="mini">座號</label><br><input type="text" id="enSno" placeholder="例:15" style="width:100%;padding:6px"></div>'
    + '<div style="margin-bottom:8px"><label class="mini">生日 8 碼(家長查看用,例 20130215)</label><br><input type="text" id="enBirth" placeholder="20130215" maxlength="8" style="width:100%;padding:6px"></div>'
    + '<div style="margin-bottom:8px"><label class="mini">分組</label><br><select id="enGroup" style="width:100%;padding:6px">'+gOpts+'</select></div>'
    + '<div style="margin-bottom:10px"><label class="mini">選擇你的生理類型與素體角色</label><div id="enBaseChoices" class="enroll-base-grid">'
    + Object.entries(BASE_VARIANTS).map(([k,src])=>'<button type="button" class="base-choice'+(k===BASE_TUNE_REFERENCE?" on":"")+'" data-base="'+k+'" style="background:#fff;border:3px solid '+(k===BASE_TUNE_REFERENCE?"var(--gold)":"#141414")+';border-radius:9px;padding:3px;cursor:pointer"><img src="'+src+'" alt="'+k+'" style="width:100%;height:82px;object-fit:contain;image-rendering:pixelated"><span class="mini" style="display:block">'+BASE_VARIANT_SPEC[k].label+'</span></button>').join("")
    + '</div><input type="hidden" id="enBase" value="'+BASE_TUNE_REFERENCE+'"></div>'
    + '<div style="margin:4px 0 12px;padding:8px;background:#fff8e8;border:2px dashed var(--gold);border-radius:10px;text-align:center"><b class="mini">即時試穿預覽</b><div class="mini" style="margin:3px 0;color:#826300">角色比例已由老師校正；選擇喜歡的素體即可。</div><div id="enTryOn" style="height:168px;display:flex;align-items:flex-end;justify-content:center"></div><div class="mini">冒險者帽・旅行斗篷・布短褲・旅人之靴・鐵劍</div></div>'
    + '<button class="btn gold" id="enGo" style="width:100%">下一步</button>'
    + '</div>'
    + '<div style="margin-top:12px"><button class="btn" id="cbk">← 返回</button></div></div>';
  document.getElementById("cbk").onclick=()=>{ renderClaim(email); };
  document.getElementById("enGo").onclick = ()=>{
    const name = document.getElementById("enName").value.trim();
    const sno = document.getElementById("enSno").value.trim();
    const birth = document.getElementById("enBirth").value.trim();
    const group = document.getElementById("enGroup").value;
    const baseVariant = (document.getElementById("enBase")||{}).value || BASE_TUNE_REFERENCE;
    const gender = baseVariant.indexOf("female")===0 ? "female" : "male";
    if(!name){ toast("請輸入姓名", true); return; }
    if(!sno){ toast("請輸入座號", true); return; }
    if(birth && !/^\d{8}$/.test(birth)){ toast("生日請填 8 碼數字(例 20130215),或留空", true); return; }
    if(state.students.some(x=>String(x.sno||"")===sno)){ toast("座號 "+sno+" 已經有人使用,請確認你的座號", true); return; }
    const draft = { name, sno, birth, group, gender, baseVariant, email, baseTune:Object.assign({},tune) };
    renderEnrollJob(draft);
  };
  app.querySelectorAll("[data-base]").forEach(b=> b.onclick=()=>{
    tune=Object.assign({x:0,y:0,s:1},(state.baseTunePresets||{})[b.dataset.base]||{});
    document.getElementById("enBase").value=b.dataset.base;
    renderTunePreview();
    app.querySelectorAll("[data-base]").forEach(x=>{ x.classList.toggle("on",x===b); x.style.borderColor=x===b?"var(--gold)":"#141414"; });
  });
  const stage = document.getElementById("enTryOn");
  function renderTunePreview(){
    const variant = (document.getElementById("enBase")||{}).value || BASE_TUNE_REFERENCE;
    stage.innerHTML = '<div style="position:relative;width:158px;height:168px;user-select:none;display:flex;align-items:flex-end;justify-content:center">'+tryOn(variant)+'</div>';
  }
  renderTunePreview();
}

function renderEnrollJob(draft){
  // 借用 renderJobPick 的卡片樣式,但綁到 finishEnroll
  const jobs = JOB_LIST();
  let selectedJob="";
  const radar = (j)=>{ const S=JOB_INFO[j].stats, keys=[["atk","攻"],["def","防"],["agi","敏"],["int","智"]];
    return '<div style="display:flex;gap:8px;justify-content:center;margin:6px 0">'
      + keys.map(k=>'<span class="mini">'+k[1]+'<div style="width:10px;height:'+(S[k[0]]*7+6)+'px;background:'+JOB_INFO[j].color+';border:1.5px solid #141414;border-radius:2px;margin:2px auto 0"></div></span>').join("")+'</div>'; };
  const cards = jobs.map(j=>{ const J=JOB_INFO[j];
    return '<button class="job-card" type="button" data-job="'+j+'" aria-pressed="false" style="border-color:'+J.color+'">'
      + '<div style="font-weight:900;font-size:20px">'+J.name+'</div>'
      + '<div class="tag" style="background:'+J.color+';font-size:11px">'+J.role+'・'+J.diff+'</div>'+radar(j)
      + '<div class="mini" style="min-height:32px;margin:4px 0;text-align:left"><b>職業特色：</b>'+esc(J.tagline)+'</div>'
      + '<div class="mini" style="text-align:left;line-height:1.6"><b>戰鬥方式：</b>'+esc(J.skill)+'</div>'
      + '<div class="mini" style="background:#fff8e0;border-radius:6px;padding:4px;margin-top:6px;text-align:left"><b>適合：</b>'+esc(J.tip)+'</div></button>'; }).join("");
  app.innerHTML = '<div class="home"><div class="crest">⚔️</div><h2>'+esc(draft.name)+',選擇你的職業</h2>'
    + '<p>選好之後就是你這學期的冒險身分!(不確定?<b>戰士</b>最好上手)</p>'
    + '<div class="job-grid">'+cards+'</div><div class="mini" id="enrollJobHint" style="margin-top:10px">請先選擇一個職業。</div>'
    + '<div class="inline-form" style="margin-top:12px;justify-content:center"><button class="btn" id="cbk">← 返回</button><button class="btn gold" id="enrollJobConfirm" disabled>下一步：檢視角色資料</button></div></div>';
  document.getElementById("cbk").onclick=()=>{ renderEnroll(draft.email); };
  app.querySelectorAll("[data-job]").forEach(b=>b.onclick=()=>{selectedJob=b.dataset.job;app.querySelectorAll("[data-job]").forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on?"true":"false");});document.getElementById("enrollJobHint").textContent='已選擇「'+JOB_INFO[selectedJob].name+'」。';document.getElementById("enrollJobConfirm").disabled=false;});
  document.getElementById("enrollJobConfirm").onclick=()=>{if(!selectedJob)return;modalConfirm('角色資料確認\n姓名：'+draft.name+'\n職業：'+JOB_INFO[selectedJob].name+'\n職業特色：'+JOB_INFO[selectedJob].tagline+'\n\n確認後才會正式建立角色。',()=>finishEnroll(draft,selectedJob),'正式建立角色');};
}

async function finishEnroll(draft, job){
  // 再次防重(可能多人同時註冊)
  if(state.students.some(x=>String(x.sno||"")===draft.sno)){ toast("座號剛被別人用了,請改一個", true); renderEnroll(draft.email); return; }
  const id = "S" + String(state.nextIdNum++).padStart(2,"0");
  const ns = newStudent(id, draft.name, job, draft.group);
  ns.registrationComplete=true;ns.jobPending=false;
  ns.sno = draft.sno; ns.email = draft.email; ns.birth = draft.birth || "";
  ns.gender = draft.gender || "male"; ns.baseVariant = draft.baseVariant || (ns.gender==="female"?"female1":"male1");
  ns.baseTune = draft.baseTune || {x:0,y:0,s:1};
  state.students.push(ns);
  addLog(id, "🆕 自行加入公會,成為"+JOB_INFO[job].name+"!冒險開始!");
  try{
    if(CLOUD.on()){
      await FB.db.collection("classes").doc(CLOUD.cid).collection("students").doc(id).set(JSON.parse(JSON.stringify(ns)));
      CLOUD.myId = id; CLOUD.myGroup = ns.group;                  // 📊 新生也只監聽自己+同組
    }
    save();
    toast("歡迎加入,"+draft.name+"("+JOB_INFO[job].name+")!");
    view={page:"student", sid:id, tab:"stats", shopFilter:"all", role:"student"}; render();startStudentRealtimeSafely();
  }catch(e){
    state.students = state.students.filter(x=>x.id!==id);   // 回滾
    state.nextIdNum--;
    toast("加入失敗:"+(e.message||e)+"(可能是安全規則未開放建立)", true);
  }
}

function needsLegacyClaimReview(s){
  const created=Number(s&&s.createdAt||0),recent=created>0&&Date.now()-created<30*86400000,base=String(s&&s.baseVariant||"");
  return !!(s&&s.registrationComplete===true&&Number(s.registrationClaimVersion||0)<2&&recent&&(base==="male1"||base==="female1"));
}

function registrationSetupEditable(s){
  if(!(s&&s.registrationComplete===true))return false;
  if(Number(s.level||1)>1||Number(s.totalXp||0)>0)return false;
  const completed=Number(s.registrationCompletedAt||s.createdAt||0);
  return Number(s.registrationClaimVersion||0)<2||!!(completed&&Date.now()-completed<24*3600000);
}

function renderJobPick(st, email, draft){
  prepareScrollableAuthPage();
  draft=draft||{};
  const repairMode=!!draft.repairMode||needsLegacyClaimReview(st);
  const canChooseJob=st.registrationComplete!==true&&!repairMode;
  const jobs = JOB_LIST();
  let selectedBase = (draft.selectedBase&&BASE_VARIANTS[draft.selectedBase])?draft.selectedBase:((st.baseVariant&&BASE_VARIANTS[st.baseVariant])
    ? st.baseVariant : ((st.gender||"male")==="female"?"female1":BASE_TUNE_REFERENCE));
  let selectedTune = Object.assign({x:0,y:0,s:1},draft.selectedTune||((state.baseTunePresets||{})[selectedBase]||{}));
  let selectedJob=canChooseJob?String(draft.selectedJob||""):String(st.job||"Warrior");
  const radar = (j)=>{
    const S = JOB_INFO[j].stats, keys=[["atk","攻"],["def","防"],["agi","敏"],["int","智"]];
    return '<div style="display:flex;gap:8px;justify-content:center;margin:6px 0">'
      + keys.map(k=>'<span class="mini">'+k[1]+'<div style="width:10px;height:'+(S[k[0]]*7+6)+'px;background:'+JOB_INFO[j].color+';border:1.5px solid #141414;border-radius:2px;margin:2px auto 0"></div></span>').join("")
      + '</div>';
  };
  const cards = (canChooseJob?jobs:[st.job||"Warrior"]).map(j=>{
    const J = JOB_INFO[j];
    return '<button class="job-card'+(selectedJob===j?' on':'')+'" type="button" data-job="'+j+'" aria-pressed="'+(selectedJob===j?'true':'false')+'"'+(canChooseJob?'':' disabled')+' style="border-color:'+J.color+'">'
      + '<div style="font-weight:900;font-size:20px;margin-bottom:6px">'+J.name+'</div>'
      + '<div class="tag" style="background:'+J.color+';font-size:11px">'+J.role+'・'+J.diff+'</div>'
      + radar(j)
      + '<div class="mini" style="min-height:38px;margin:5px 0;text-align:left"><b>職業特色：</b>'+esc(J.tagline)+'</div>'
      + '<div class="mini" style="text-align:left;line-height:1.65"><b>戰鬥方式：</b>'+esc(J.skill)+'</div>'
      + '<div class="mini" style="background:#fff8e0;border-radius:6px;padding:5px;margin-top:6px;text-align:left"><b>適合：</b>'+esc(J.tip)+'</div>'
      + '</button>';
  }).join("");
  const baseChoices=Object.entries(BASE_VARIANTS).map(([k,src])=>'<button type="button" class="base-choice'+(k===selectedBase?' on':'')+'" data-claimbase="'+k+'" style="background:#fff;border:3px solid '+(k===selectedBase?'var(--gold)':'#141414')+';border-radius:9px;padding:3px;cursor:pointer"><img src="'+src+'" alt="'+esc(BASE_VARIANT_SPEC[k].label)+'" style="width:100%;height:82px;object-fit:contain;image-rendering:pixelated"><span class="mini" style="display:block">'+esc(BASE_VARIANT_SPEC[k].label)+'</span></button>').join('');
  const birthFix=!rosterBirthValid(String(st.birth||""))?'<div class="panel" style="width:100%;max-width:520px;margin:0 auto 14px;text-align:left;background:#eef8ff"><label for="claimFinishBirth"><b>補填學生生日</b>（西元 YYYYMMDD）</label><input id="claimFinishBirth" value="'+esc(draft.birth||'')+'" maxlength="8" inputmode="numeric" autocomplete="bday" placeholder="例：20130215" style="width:100%;margin-top:6px"><div class="mini" style="margin-top:5px">舊版尚未保存生日；請輸入西元年 4 碼＋月 2 碼＋日 2 碼。</div></div>':'';
  app.innerHTML = '<div class="home"><div class="crest">⚔️</div><h2>'+esc(st.name)+','+(repairMode?'重新確認角色素體':'建立你的冒險角色')+'</h2>'
    + '<p>'+(repairMode?'舊版曾把原始素體代碼誤判為其他款式。請重新選擇、調整並確認；班級進度與名冊都會保留。':'先選擇素體並調整位置，再點選職業。點職業只會預選，不會立即建立角色。')+'</p>'
    + birthFix
    + '<div class="panel" style="width:100%;max-width:720px;margin:0 auto 16px;text-align:left"><h3 style="margin-top:0">🧍 選擇生理類型與素體</h3>'
    + '<div class="enroll-base-grid">'+baseChoices+'</div>'
    + '<div style="margin-top:10px;padding:8px;background:#fff8e8;border:2px dashed var(--gold);border-radius:10px;text-align:center"><b class="mini">裝備對位即時預覽</b><div class="mini" style="margin-top:3px">可拖曳人物移動；拖曳右上角 ↗ 或使用按鈕調整大小。</div><div id="claimBaseTryOn" style="height:210px;display:flex;align-items:flex-end;justify-content:center;position:relative;touch-action:none;user-select:none;overflow:visible"></div>'
    + '<div style="display:grid;grid-template-columns:repeat(5,minmax(48px,1fr));gap:6px;max-width:390px;margin:8px auto"><button class="btn" type="button" data-claimmove="left" aria-label="向左">←</button><button class="btn" type="button" data-claimmove="up" aria-label="向上">↑</button><button class="btn" type="button" data-claimmove="down" aria-label="向下">↓</button><button class="btn" type="button" data-claimmove="right" aria-label="向右">→</button><button class="btn" type="button" id="claimTuneReset">還原基準</button><button class="btn" type="button" data-claimscale="down" style="grid-column:2 / span 2">縮小</button><button class="btn gold" type="button" data-claimscale="up" style="grid-column:4 / span 2">放大</button></div>'
    + '<div class="mini">帽子、衣服、褲子、鞋子、背飾與武器固定在正式裝備座標</div></div></div>'
    + '<h3>'+(canChooseJob?'選擇你的初始職業':'已綁定職業')+'</h3>'
    + '<div class="job-grid">'+cards+'</div>'
    + '<div class="mini" id="jobPickHint" style="margin-top:12px;color:#765100">'+(canChooseJob?(selectedJob?'已選擇「'+esc(JOB_INFO[selectedJob].name)+'」，請按下方按鈕檢視資料。':'請先點選一個職業。'):'職業完成註冊後即鎖定；之後只能使用轉職卡更改。')+'</div>'
    + '<div class="inline-form" style="margin-top:12px;justify-content:center"><button class="btn" id="cbk">← 返回</button><button class="btn gold" id="jobPickConfirm"'+(selectedJob?'':' disabled')+'>下一步：檢視角色資料</button></div></div>';
  document.getElementById("cbk").onclick=()=>{
    if(draft.returnToStudent){view={page:"student",sid:st.id,tab:"stats",shopFilter:"all",role:"student"};render();}
    else renderAutoEnroll(email,{cid:CLOUD.cid,name:st.name,sno:st.sno,seat:st.seat,birth:st.birth});
  };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const drawBaseTryOn=()=>{
    const gender=selectedBase.indexOf('female')===0?'female':'male';
    const sample={roStyle:true,gender,baseVariant:selectedBase,job:selectedJob||'Warrior',level:1,
      hatId:1,clothesId:4,pantsId:40,shoesId:15,backId:17,weaponId:9,
      hairId:null,eyesId:null,browsId:null,noseId:null,blueprints:{},baseTune:Object.assign({},selectedTune)};
    const box=document.getElementById('claimBaseTryOn');if(box)box.innerHTML='<div style="width:190px;height:205px;position:relative;display:flex;align-items:flex-end;justify-content:center;cursor:move">'+dollSVG(sample,188)+'<button type="button" id="claimBaseGrip" aria-label="拖曳調整素體大小" style="position:absolute;right:0;top:0;width:34px;height:34px;padding:0;border:2px solid #141414;border-radius:8px;background:var(--gold);font-size:20px;font-weight:900;cursor:nwse-resize;z-index:4">↗</button></div>';
  };
  app.querySelectorAll('[data-claimbase]').forEach(b=>b.onclick=()=>{
    selectedBase=b.dataset.claimbase;
    selectedTune=Object.assign({x:0,y:0,s:1},(state.baseTunePresets||{})[selectedBase]||{});
    app.querySelectorAll('[data-claimbase]').forEach(x=>{x.classList.toggle('on',x===b);x.style.borderColor=x===b?'var(--gold)':'#141414';});
    drawBaseTryOn();
  });
  drawBaseTryOn();
  const stage=document.getElementById('claimBaseTryOn');let drag=null;
  stage.addEventListener('pointerdown',e=>{
    const grip=e.target.closest&&e.target.closest('#claimBaseGrip');
    drag={id:e.pointerId,mode:grip?'scale':'move',x:e.clientX,y:e.clientY,tune:Object.assign({},selectedTune)};
    stage.setPointerCapture(e.pointerId);e.preventDefault();
  });
  stage.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(drag.mode==='scale')selectedTune.s=clamp(drag.tune.s+(dx-dy)/180,.55,2.2);
    else{selectedTune.x=clamp(drag.tune.x+dx*.32,-40,40);selectedTune.y=clamp(drag.tune.y+dy*.32,-40,40);}
    drawBaseTryOn();
  });
  const stop=e=>{if(drag&&drag.id===e.pointerId){drag=null;try{stage.releasePointerCapture(e.pointerId);}catch(_){}}};stage.addEventListener('pointerup',stop);stage.addEventListener('pointercancel',stop);
  app.querySelectorAll('[data-claimmove]').forEach(b=>b.onclick=()=>{const d=b.dataset.claimmove;if(d==='left')selectedTune.x=clamp(selectedTune.x-1,-40,40);if(d==='right')selectedTune.x=clamp(selectedTune.x+1,-40,40);if(d==='up')selectedTune.y=clamp(selectedTune.y-1,-40,40);if(d==='down')selectedTune.y=clamp(selectedTune.y+1,-40,40);drawBaseTryOn();});
  app.querySelectorAll('[data-claimscale]').forEach(b=>b.onclick=()=>{selectedTune.s=clamp(selectedTune.s+(b.dataset.claimscale==='up'?.05:-.05),.55,2.2);drawBaseTryOn();});
  document.getElementById('claimTuneReset').onclick=()=>{selectedTune=Object.assign({x:0,y:0,s:1},(state.baseTunePresets||{})[selectedBase]||{});drawBaseTryOn();};
  if(canChooseJob)app.querySelectorAll("[data-job]").forEach(b=>b.onclick=()=>{
    selectedJob=b.dataset.job;app.querySelectorAll("[data-job]").forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on?"true":"false");});
    const confirm=document.getElementById("jobPickConfirm"),hint=document.getElementById("jobPickHint");confirm.disabled=false;hint.textContent='已選擇「'+JOB_INFO[selectedJob].name+'」，請按下方按鈕檢視資料。';drawBaseTryOn();
  });
  document.getElementById("jobPickConfirm").onclick=()=>{
    if(!selectedJob){toast("請先選擇職業",true);return;}
    const birthInput=document.getElementById("claimFinishBirth"),birth=birthInput?birthInput.value.trim():String(st.birth||"").trim();
    if(!rosterBirthValid(birth)){toast("生日格式錯誤，請輸入西元 8 碼，例如 20130215",true);if(birthInput)birthInput.focus();return;}
    renderClaimReview(st,email,{selectedJob,selectedBase,selectedTune:Object.assign({},selectedTune),birth,repairMode,returnToStudent:!!draft.returnToStudent});
  };
}

function renderClaimReview(st,email,draft){
  prepareScrollableAuthPage();
  const repairMode=!!draft.repairMode||needsLegacyClaimReview(st),J=JOB_INFO[draft.selectedJob],appearance={baseVariant:draft.selectedBase,gender:draft.selectedBase.indexOf('female')===0?'female':'male',baseTune:Object.assign({},draft.selectedTune)},sample=Object.assign({},st,{job:draft.selectedJob,roStyle:true,baseVariant:draft.selectedBase,gender:appearance.gender,baseTune:appearance.baseTune});
  app.innerHTML='<div class="home" style="min-height:100vh;padding-bottom:max(36px,env(safe-area-inset-bottom))"><div class="crest">📋</div><h2>'+(repairMode?'修正角色前最後確認':'建立角色前最後確認')+'</h2><p>確認無誤後才會正式送出職業與角色外型。</p>'
    +'<div class="panel" style="width:100%;max-width:620px;margin:0 auto"><div style="display:grid;grid-template-columns:minmax(150px,210px) 1fr;gap:16px;align-items:center"><div>'+dollSVG(sample,190)+'</div><div style="text-align:left;line-height:1.85">'
    +'<h3 style="margin:0 0 8px">'+esc(st.name)+'｜'+esc(J.name)+'</h3><div><b>班級：</b>'+esc(CLOUD.cid||'')+'</div><div><b>學號／座號：</b>'+esc(st.sno||'')+'／'+esc(st.seat||st.sno||'')+'</div><div><b>登入信箱：</b>'+esc(email)+'</div><div><b>生日格式：</b>'+esc(String(draft.birth).slice(0,4)+'／'+String(draft.birth).slice(4,6)+'／'+String(draft.birth).slice(6,8))+'</div><hr style="margin:10px 0"><div><b>職業定位：</b>'+esc(J.role)+'</div><div><b>職業特色：</b>'+esc(J.tagline)+'</div><div><b>戰鬥方式：</b>'+esc(J.skill)+'</div></div></div></div>'
    +'<div class="inline-form" style="justify-content:center;margin-top:14px"><button class="btn" id="claimReviewBack">← 返回修改</button><button class="btn gold" id="claimReviewSubmit" style="font-size:18px">'+(repairMode?'確認並修正角色':'確認並正式建立角色')+'</button></div></div>';
  document.getElementById('claimReviewBack').onclick=()=>renderJobPick(st,email,draft);
  document.getElementById('claimReviewSubmit').onclick=()=>{const b=document.getElementById('claimReviewSubmit');b.disabled=true;b.textContent=repairMode?'正在修正角色…':'正在建立角色…';finishClaim(st,email,draft.selectedJob,appearance,draft.birth,{repair:repairMode});};
}

function claimAppearanceMatches(student,job,appearance){
  const a=appearance||{},t=a.baseTune||{},s=student||{},st=s.baseTune||{},near=(x,y)=>Math.abs(Number(x||0)-Number(y||0))<.011;
  return String(s.job||"")===String(job||"")&&String(s.baseVariant||"")===String(a.baseVariant||"")&&near(st.x,t.x)&&near(st.y,t.y)&&near(st.s,t.s);
}

function startStudentRealtimeSafely(){
  if(!CLOUD.on())return;
  try{CLOUD.listen();}
  catch(e){
    /* 即時監聽屬於後續同步功能；初次載入的完整角色已經成功時，
     * 不應因監聽初始化失敗而把學生擋在註冊完成頁。 */
    console.warn("student realtime start",e);
    try{CLOUD.setStatus("offline","角色已載入；即時同步稍後重試");}catch(_){}
  }
}

function renderClaimedStudentRecovery(st,error){
  registrationLoadingDone();
  console.error("student entry render failed",error);
  app.innerHTML='<div class="home"><div class="crest">✅</div><h2>角色已安全建立</h2><div class="panel" style="max-width:560px;margin:auto"><p>雲端資料已保存，但學生介面需要重新載入一次。</p><div class="mini" style="word-break:break-word">診斷：'+esc(String(error&&error.message||error||"畫面初始化失敗"))+'</div><div class="inline-form" style="justify-content:center;margin-top:14px"><button class="btn gold" id="claimEntryRetry">重新從雲端載入我的角色</button><button class="btn" id="claimEntryHome">回登入頁</button></div></div></div>';
  const retry=document.getElementById("claimEntryRetry");if(retry)retry.onclick=()=>reloadClaimedStudentAfterClaim(st);
  const home=document.getElementById("claimEntryHome");if(home)home.onclick=()=>{view={page:"home"};render();};
}

async function reloadClaimedStudentAfterClaim(st){
  registrationLoading("正在重新載入角色","正在向雲端核對正式角色與班級資料，請保持此頁開啟…");
  try{
    const status=await CLOUD.callServer("registrationStatus",{});
    if(!status||status.complete!==true||!status.student)throw new Error("雲端尚未回傳完整角色，請稍後再試");
    const email=String((FB.user&&FB.user.email)||status.student.email||st&&st.email||"").toLowerCase();
    /* 先重讀權威班級文件，避免按鈕只拿舊的記憶體資料反覆重畫。
     * 若帳號索引剛建立尚未可讀，仍可使用 registrationStatus 的正式角色繼續進入。 */
    try{await CLOUD.loadClass(CLOUD.cid,email,{listen:false});}
    catch(loadError){console.warn("post-registration class reload",loadError);}
    return enterClaimedStudent(st,status,true,{skipLog:true});
  }catch(e){renderClaimedStudentRecovery(st,e);return false;}
}

function enterClaimedStudent(st,packet,recovered,options){
  const cloudStudent=packet&&packet.student&&typeof packet.student==="object"?packet.student:null;
  const sid=String(cloudStudent&&cloudStudent.id||st&&st.id||"");
  if(!sid||!cloudStudent||cloudStudent.registrationComplete!==true)throw new Error("伺服器尚未回傳完整的正式角色資料");
  const existingIndex=state.students.findIndex(x=>String(x.id)===sid);
  if(existingIndex>=0)state.students[existingIndex]=Object.assign({},state.students[existingIndex],cloudStudent);
  else state.students.push(Object.assign({},cloudStudent));
  if(cloudStudent.group&&!state.groups.includes(cloudStudent.group))state.groups.push(cloudStudent.group);
  /* 雲端學生文件只保存必要欄位時，也必須先補齊學生介面所需資料再渲染。 */
  backfill(state);
  const ready=stu(sid);
  if(!ready||ready.registrationComplete!==true||ready.jobPending===true)throw new Error("角色資料仍處於未完成註冊狀態");
  if(!(options&&options.skipLog))try{addLog(ready.id,"🎉 完成綁定,成為"+((JOB_INFO[ready.job]||{}).name||"冒險者")+"!冒險開始!");save();}catch(e){console.warn("local claim finish",e);}
  // 認領當下才知道「我是誰」：補上本人索引並改掛學生範圍監聽。
  CLOUD.myId=ready.id;CLOUD.myGroup=ready.group;
  try{sessionStorage.setItem("rpg-student-mode","login");sessionStorage.removeItem("rpg-student-join");}catch(_){}
  view={page:"student",sid:ready.id,tab:"stats",shopFilter:"all",role:"student"};
  registrationLoadingDone();
  try{
    render();
  }catch(e){
    renderClaimedStudentRecovery(st,e);
    return false;
  }
  startStudentRealtimeSafely();
  toast((recovered?"已確認雲端角色資料，":"歡迎加入，")+ready.name+"（"+((JOB_INFO[ready.job]||{}).name||"冒險者")+"）！");
  return true;
}

async function finishClaim(st,email,job,appearance,birth,options){
  registrationLoading("正在完成角色註冊","正在儲存素體、位置與職業，請勿關閉頁面…");
  try{
    const repair=!!(options&&options.repair),packet=await registrationQueuedCall("finishStudentClaim",{job,appearance,birth,repair},msg=>registrationLoading(repair?"正在修正角色外型":"正在完成角色註冊",msg));
    enterClaimedStudent(st,packet,false);return;
  }catch(originalError){
    /* 回應中斷不等於交易失敗：重新讀取完成狀態，避免學生重複建立角色。
     * 2026-08 素體代碼修正前的完成紀錄可執行一次 repair，救回 male0/female0 與調整座標。 */
    try{
      registrationLoading("正在確認建立結果","網路回應中斷，正在核對角色是否已安全建立…");
      let status=await CLOUD.callServer("registrationStatus",{}),packet=status;
      if(status&&status.complete){
        if(!claimAppearanceMatches(status.student,job,appearance)&&(repair||Number(status.student&&status.student.registrationClaimVersion||0)<2)){
          registrationLoading("正在修正角色外型","已找到角色，正在套用剛才確認的素體與位置…");
          packet=await CLOUD.callServer("finishStudentClaim",{job,appearance,birth,repair:true});
        }
        enterClaimedStudent(st,packet,true);return;
      }
    }catch(verifyError){console.warn("claim result verification",verifyError);}
    const msg=String(originalError&&originalError.message||originalError||"未知錯誤");
    /* 最後確認沒有成功才解除暫時帳號索引。伺服器會再次檢查 registrationComplete，
     * 若其實已成功便拒絕刪除，避免慢網路造成誤清正式角色。 */
    try{
      registrationLoading("正在清理未完成註冊","最後確認未成功，正在解除暫時認領，讓你可以重新註冊…");
      const reset=await CLOUD.callServer("cancelStudentClaim",{}),prefill={cid:CLOUD.cid,name:st.name,sno:st.sno,seat:st.seat,birth:birth};
      if(reset&&reset.removed)state.students=state.students.filter(x=>String(x.id)!==String(st.id));
      CLOUD.myId=null;CLOUD.myGroup=null;registrationLoadingDone();renderAutoEnroll(email,prefill);
      toast("本次註冊未完成，暫時綁定已清除。請重新確認資料後再註冊一次。原因："+msg,true);return;
    }catch(resetError){console.warn("claim cleanup",resetError);}
    registrationLoadingDone();
    const b=document.getElementById("claimReviewSubmit");if(b){b.disabled=false;b.textContent="重新確認並建立角色";}
    toast("角色尚未完成建立："+msg+"。暫時綁定清理失敗，請重新整理後再試。",true);
  }
}

async function renderClasses(email){
  app.innerHTML = '<div class="home"><div class="crest">🏫</div><h2>我的班級</h2><p>載入中…</p></div>';
  let list = [];
  try{ list = await CLOUD.listMyClasses(email); }
  catch(e){
    const msg=(e&&e.message)||String(e||"未知錯誤");
    app.innerHTML = '<div class="home"><div class="crest">🔐</div><h2>教師資料讀取失敗</h2><div class="panel" style="max-width:560px;margin:0 auto">'
      +'<p>可能是先前登入快取、權限更新或網路中斷造成。可以先重試；若仍失敗，請清除登入快取後重新登入 Google 帳號。</p>'
      +'<div class="mini" style="padding:8px;background:#fff3d5;border-radius:8px;word-break:break-word">'+esc(msg)+'</div>'
      +'<div class="mini" style="margin-top:8px">此操作不會刪除雲端班級、學生資料或這台裝置的離線備份。</div>'
      +'<div class="inline-form" style="justify-content:center;margin-top:14px"><button class="btn" id="teacherReadRetry">↻ 重新讀取</button><button class="btn gold" id="teacherLoginReset">🔐 清除登入快取並重新登入</button></div></div></div>';
    document.getElementById("teacherReadRetry").onclick=()=>renderClasses(email);
    document.getElementById("teacherLoginReset").onclick=()=>resetOnlineLoginCache("教師登入快取已清除，請重新選擇教師登入");
    return;
  }
  if(document.getElementById("loginFlowLoading"))loginLoading("準備完成","教師身分與班級權限核對完成。",3);
  const cards = list.map(c=>
    '<article class="teacher-class-card">'
    + '<button class="teacher-class-enter" data-cid="'+esc(c.cid)+'"><span class="teacher-class-icon" aria-hidden="true">🏫</span><span class="teacher-class-copy"><span class="teacher-class-name">'+esc(c.name)+'</span><span class="teacher-class-code num">班級代碼 '+esc(c.cid)+'</span><span class="teacher-class-hint">點擊進入班級管理</span></span></button>'
    + '<div class="teacher-class-actions"><button class="btn" data-ccopy="'+esc(c.cid)+'" title="複製班級代碼">📋 複製代碼</button><button class="btn danger teacher-class-delete" data-cdel="'+esc(c.cid)+'" data-cname="'+esc(c.name)+'" title="刪除班級">🗑 刪除</button></div>'
    + '</article>').join("");
  const hasLocal = !!localStorage.getItem(LS_KEY);
  app.innerHTML =
    '<div class="home teacher-class-picker"><div class="teacher-class-picker-head"><div class="crest">🏫</div><div><h2>我的班級</h2><div class="mini">請選擇今天要管理的班級</div></div></div>'
    + '<div class="teacher-class-grid">'+(cards||'<div class="empty">目前還沒有班級，請先在下方建立第一個班級。</div>')+'</div>'
    + '<div class="panel teacher-new-class"><h3>➕ 新增班級</h3>'
    + '<div class="inline-form"><input type="text" id="ncName" placeholder="班級名稱(例:七年三班)" style="flex:1">'
    + '<button class="btn gold" id="ncCreate">建立空白班級</button></div>'
    + (hasLocal ? '<div style="margin-top:8px"><button class="btn" id="ncMigrate">📦 把這台裝置的現有資料上傳成新班級</button><div class="mini" style="margin-top:4px">會把本機 localStorage 的班級搬上雲端(本機資料保留)。</div></div>' : "")
    + '</div></div>';
  app.querySelectorAll("[data-cid]").forEach(b=>{
    b.onclick = async ()=>{
      b.disabled = true; const hint=b.querySelector(".teacher-class-hint");if(hint)hint.textContent = "正在載入班級…";
      try{
        await CLOUD.loadClass(b.dataset.cid);
        view={page:"teacher",tview:"classhome",role:"teacher"};
        // 選班只進入教師課堂首頁；必須由教師親自按「開始上課」才建立通行證與學生 QR。
        render();
      }
      catch(e){ toast("載入失敗:"+e.message, true); b.disabled=false; }
    };
  });
  app.querySelectorAll("[data-ccopy]").forEach(b=>{
    b.onclick=async(e)=>{e.stopPropagation();try{await navigator.clipboard.writeText(b.dataset.ccopy);toast("班級代碼已複製："+b.dataset.ccopy);}catch(_){prompt("請複製班級代碼",b.dataset.ccopy);}};
  });
  app.querySelectorAll("[data-cdel]").forEach(b=>{
    b.onclick = async (e)=>{
      e.stopPropagation();
      const nm = b.dataset.cname, cid = b.dataset.cdel;
      if(!confirm("刪除班級「"+nm+"」?\n所有學生資料、紀錄、工坊作品將永久消失。")) return;
      if(!confirm("⚠️ 再次確認:真的要永久刪除「"+nm+"」?\n此動作無法復原!")) return;
      b.disabled = true; b.textContent = "…";
      try{ await CLOUD.deleteClass(cid); toast("班級「"+nm+"」已刪除"); renderClasses(email); }
      catch(err){ toast("刪除失敗:"+err.message, true); b.disabled=false; b.textContent="✕"; }
    };
  });
  document.getElementById("ncCreate").onclick = async ()=>{
    const nm = (document.getElementById("ncName").value||"").trim();
    if(!nm){ toast("請輸入班級名稱", true); return; }
    const btn = document.getElementById("ncCreate");
    if(btn.disabled) return;
    btn.disabled = true; btn.textContent = "建立中…";   // 防連點(先前重複建班的原因)
    try{
      const cid = await CLOUD.createClass(nm, email, null);
      await CLOUD.loadClass(cid);
      if(!state.teacherEmails.includes(email)) state.teacherEmails.push(email);
      view={page:"teacher", tview:"roster", role:"teacher"}; render();
      toast("班級「"+nm+"」已建立！班級代碼："+cid);
    }catch(e){ toast("建立失敗:"+e.message, true); btn.disabled=false; btn.textContent="建立空白班級"; }
  };
  const mig = document.getElementById("ncMigrate");
  if(mig) mig.onclick = async ()=>{
    const nm = prompt("為這個班級取名(例:七年三班)");
    if(!nm) return;
    if(mig.disabled) return;
    mig.disabled = true; mig.textContent = "上傳中…";
    try{
      const local = backfill(JSON.parse(localStorage.getItem(LS_KEY)));
      if(!local.teacherEmails.includes(email)) local.teacherEmails.push(email);
      const cid = await CLOUD.createClass(nm, email, local);
      await CLOUD.loadClass(cid);
      view={page:"teacher", tview:"classhome", role:"teacher"}; render();
      toast("✅ 本機資料已上雲！請從課堂首頁開始上課");
    }catch(e){ toast("遷移失敗:"+e.message, true); mig.disabled=false; mig.textContent="📦 把這台裝置的現有資料上傳成新班級"; }
  };
}

async function resetOnlineLoginCache(message){
  try{ CLOUD.stopListen && CLOUD.stopListen(); }catch(_){}
  try{ clearTimeout(CLOUD._timer); CLOUD._timer=null; }catch(_){}
  CLOUD.cid=null; CLOUD.role=null; CLOUD.myId=null; CLOUD.myGroup=null;
  CLOUD._lastSnap={}; CLOUD._lastRosterFetch=0; FB.user=null;
  try{
    ["rpg-last-role","rpg-last-class"].forEach(k=>localStorage.removeItem(k));
    ["rpg-login-role","rpg-student-mode","rpg-student-join"].forEach(k=>sessionStorage.removeItem(k));
  }catch(_){}
  try{ if(FB.ready&&FB.auth) await FB.auth.signOut(); }catch(_){}
  view={page:"home",homeTab:"login"}; render();
  toast(message||"登入快取已清除，請重新登入");
}
