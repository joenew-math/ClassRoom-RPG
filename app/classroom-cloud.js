/*

 * classroom-cloud：Firebase／Firestore、免費交易 API 與同步佇列的存取邊界。

 * 本檔只處理資料傳輸與公開資料裁切；畫面與遊戲規則仍由主程式負責。

 */

const CLOUD = {
  cid: null,              // 目前班級 id(null=未連雲,純本機)
  role: null,             // teacher|student|parent
  _cmdSeq: 0,             // Dota 指令同毫秒序號，避免多台裝置指令被誤判為重複
  _timer: null,
  _lastSnap: {},          // 上次寫入的 JSON 快照(dirty-check 用)
  _unsubs: [],
  _applying: false,       // 正在套用遠端資料(避免回寫迴圈)
  _status: "offline",
  _statusMsg: "離線備份",
  _lastSyncAt: 0,
  _parentSyncAt:0,
  _enrollSyncAt:0,
  _rosterSyncAt:0,

  on(){ return FB.ready && FB.db && this.cid; },
  setStatus(status,msg){
    this._status=status||"offline";this._statusMsg=msg||"";
    if(status==="synced")this._lastSyncAt=Date.now();
    updateSyncStatus();
  },

  async callServer(name,payload){
    if(!this.on()||!FB.user)throw new Error("請先完成學生登入");
    if(!CLASS_RPG_API_URL)throw new Error("免費交易後端尚未完成部署");
    const token=await FB.user.getIdToken(false),base=String(CLASS_RPG_API_URL).replace(/\/$/,"");
    const requestId=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():(Date.now()+"-"+Math.random().toString(36).slice(2));
    const res=await fetch(base+"/"+encodeURIComponent(name),{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token},body:JSON.stringify(Object.assign({cid:String(this.cid||""),requestId},payload||{}))});
    let packet={};try{packet=await res.json();}catch(e){}
    if(!res.ok||!packet.ok){const err=new Error((packet.error&&packet.error.message)||("交易服務暫時無法使用（"+res.status+"）"));err.status=res.status;err.code=packet.error&&packet.error.code||"";throw err;}
    return packet.data;
  },

  /* 課堂 QR 狀態只寫必要欄位，避免第一次 pushDirty 同時同步商店／名冊時，
   * 任一附加資料權限或網路錯誤連帶阻止學生通行證上線。 */
  async syncClassSession(){
    if(!this.on()||this.role!=="teacher")return;
    const session=JSON.parse(JSON.stringify(state.classSession||{})),c=FB.db.collection("classes").doc(this.cid);
    await Promise.all([
      c.collection("data").doc("main").set({classSession:session},{merge:true}),
      c.collection("public").doc("main").set({classSession:session},{merge:true})
    ]);
    this._lastSnap.meta=JSON.stringify(this._meta());
    this._lastSnap.publicMeta=JSON.stringify(this._publicMeta());
    this.setStatus("synced",session.active?"課堂 QR 已同步":"下課狀態已同步");
  },

  /* 🎁 一次性獎勵碼：雲端用交易先鎖碼，避免兩位學生同時領到同一張。 */
  async createRewardCard(card){
    if(!this.on()) return;
    await FB.db.collection("classes").doc(this.cid).collection("rewardCards").doc(card.code)
      .set(JSON.parse(JSON.stringify(card)));
  },
  async claimRewardCard(code, sid){
    if(!this.on()) return null;
    return this.callServer("redeemRewardCard",{code:String(code||"").toUpperCase()});
  },
  async spinCard(){return this.callServer("spinCard",{});},
  async claimDungeonReward(report){return this.callServer("claimDungeonReward",{report:report||{}});},
  async approveTask(taskId,sid){return this.callServer("approveTask",{taskId:Number(taskId)||0,sid:String(sid||"")});},
  async inventoryAction(action,payload){return this.callServer("inventoryAction",Object.assign({action:String(action||"")},payload||{}));},
  async submitDesign(item){return this.callServer("submitDesign",{item:item});},
  async setRewardCardActive(code, active){
    if(!this.on()) return;
    await FB.db.collection("classes").doc(this.cid).collection("rewardCards").doc(code).update({active:!!active});
  },
  submissionDocId(taskId,sid){return String(taskId)+"__"+String(sid);},
  async writeSubmission(sub){
    if(!this.on()||!sub)return;
    const payload=JSON.parse(JSON.stringify(sub));payload.sid=String(payload.sid||"");payload.taskId=Number(payload.taskId)||0;
    await FB.db.collection("classes").doc(this.cid).collection("submissions").doc(this.submissionDocId(payload.taskId,payload.sid)).set(payload);
  },
  async parentViewKey(cid,sno,birth){return sha256Hex([String(cid||"").toUpperCase(),String(sno||"").trim(),String(birth||"").trim()].join("|"));},
  _parentViewPayload(s){
    /* 家長文件採最小化資料：不複製完整背包、貨幣、技能、信箱或生日到可查詢文件。 */
    const keep=["id","name","level","job","group","totalXp","termStartXp","learningStreak","lessonAnswers","gender","baseVariant","baseTune","hatId","bodyId","pantsId","shoesId","weaponId","backId","petEquipped"];
    const safe={};keep.forEach(k=>{if(s[k]!==undefined)safe[k]=JSON.parse(JSON.stringify(s[k]));});
    safe.thanksWall=(s.thanksWall||[]).slice(0,10).map(t=>({fromName:maskName(t.fromName||"同學"),msg:String(t.msg||"").slice(0,80),date:String(t.date||"").slice(0,20)}));
    const visibleTasks=(state.tasks||[]).filter(t=>t.active&&(t.scope==="all"||t.scope===s.group||taskScopeHas(t,s.id)));
    const maskLog=msg=>{let m=String(msg||"");state.students.forEach(x=>{if(x.id!==s.id&&x.name&&x.name.length>1)m=m.split(x.name).join(maskName(x.name));});return m;};
    return {version:2,className:state.className||state.lbName||"班級 RPG",generatedAt:Date.now(),student:safe,
      tasks:visibleTasks.map(t=>({id:t.id,title:String(t.title||"").slice(0,80),active:true,scope:"all",xp:Number(t.xp)||0,gold:Number(t.gold)||0,tiers:Array.isArray(t.tiers)?t.tiers.slice(0,3):null})),
      submissions:(state.submissions||[]).filter(x=>String(x.sid)===String(s.id)).map(x=>({taskId:x.taskId,sid:String(s.id),status:x.status,tier:Number(x.tier)||0,t:String(x.t||"").slice(0,30),submittedAt:Number(x.submittedAt)||0})),
      log:(state.log||[]).filter(x=>String(x.sid)===String(s.id)&&parentLearningMajor(x.msg)).slice(0,80).map(x=>({sid:String(s.id),t:String(x.t||"").slice(0,30),msg:maskLog(x.msg).slice(0,240)})),
      awardLog:(state.awardLog||[]).filter(x=>String(x.sid)===String(s.id)&&!x.reverted).slice(-80).map(x=>({sid:String(s.id),t:String(x.t||"").slice(0,30),xp:Number(x.xp)||0,gold:Number(x.gold)||0,reverted:false}))};
  },
  async syncParentViews(force){
    if(!this.on()||this.role!=="teacher")return;
    const now=Date.now();if(!force&&now-this._parentSyncAt<5*60*1000)return;this._parentSyncAt=now;
    const col=FB.db.collection("classes").doc(this.cid).collection("parentViews"),current=new Set(),ops=[];
    for(const s of state.students){
      if(!String(s.sno||"").trim()||!/^[0-9]{8}$/.test(String(s.birth||"")))continue;
      const key=await this.parentViewKey(this.cid,s.sno,s.birth),payload=this._parentViewPayload(s),json=JSON.stringify(payload);current.add(key);
      if(force||this._lastSnap["parent:"+key]!==json){ops.push(col.doc(key).set(payload));this._lastSnap["parent:"+key]=json;}
    }
    if(force){const old=await col.get();old.docs.forEach(d=>{if(!current.has(d.id))ops.push(d.ref.delete());});}
    for(let i=0;i<ops.length;i+=25)await Promise.all(ops.slice(i,i+25));
  },
  _publicStudent(s){
    const safe=JSON.parse(JSON.stringify(s||{}));
    ["birth","email","registrationEmail","sno","thanksWall","thanksToday","thanksRecent","diamondFlow","leaderReviewStats","liveAnswer","readDate","spinDate","spinCount","gachaPityRare","gachaPityLegend","gachaMonth","gachaMonthCount","gachaMonthLegends"].forEach(k=>delete safe[k]);
    return safe;
  },
  async enrollmentKey(cid,sno,seat){return sha256Hex([String(cid||"").toUpperCase(),String(sno||"").trim(),String(seat||"").trim()].join("|"));},
  _enrollmentStudent(s){
    const safe=this._publicStudent(s);
    /* 註冊憑證只帶建立角色所需資料；私密生日、信箱與完整課堂紀錄一律不放入。 */
    ["inventory","consumables","blueprints","skillLevels","equippedSkills","awardHistory"].forEach(k=>delete safe[k]);
    return safe;
  },
  async syncPublicRoster(force){
    if(!this.on()||this.role!=="teacher")return;
    const now=Date.now();if(!force&&now-this._rosterSyncAt<30000)return;this._rosterSyncAt=now;
    const col=FB.db.collection("classes").doc(this.cid).collection("publicRoster"),current=new Set(),ops=[];
    for(const s of state.students){
      const payload=this._publicStudent(s),j=JSON.stringify(payload);current.add(String(s.id));
      if(force||this._lastSnap["pub:"+s.id]!==j){ops.push(col.doc(String(s.id)).set(payload));this._lastSnap["pub:"+s.id]=j;}
    }
    if(force){const old=await col.get();old.docs.forEach(d=>{if(!current.has(d.id))ops.push(d.ref.delete());});}
    for(let i=0;i<ops.length;i+=25)await Promise.all(ops.slice(i,i+25));
  },
  async syncEnrollments(force){
    if(!this.on()||this.role!=="teacher")return;
    const now=Date.now();if(!force&&now-this._enrollSyncAt<30000)return;this._enrollSyncAt=now;
    const col=FB.db.collection("classes").doc(this.cid).collection("enrollments"),current=new Set(),ops=[];
    for(const s of state.students){
      const sno=String(s.sno||"").trim(),seat=String(s.seat||s.sno||"").trim();if(!sno||!seat)continue;
      const key=await this.enrollmentKey(this.cid,sno,seat),base={sid:String(s.id),className:state.className||"班級 RPG",student:this._enrollmentStudent(s)},j=JSON.stringify(base);
      current.add(key);if(force||this._lastSnap["enroll:"+key]!==j){ops.push(col.doc(key).set(Object.assign({updatedAt:Date.now()},base),{merge:true}));this._lastSnap["enroll:"+key]=j;}
    }
    if(force){const old=await col.get();old.docs.forEach(d=>{if(!current.has(d.id))ops.push(d.ref.delete());});}
    for(let i=0;i<ops.length;i+=25)await Promise.all(ops.slice(i,i+25));
  },
  async teacherCreateRosterStudent(student){
    if(!this.on()||this.role!=="teacher"||!FB.user)throw new Error("只有已登入並獲授權的班級教師可以建立名冊");
    const s=JSON.parse(JSON.stringify(student||{})),sno=String(s.sno||"").trim(),seat=String(s.seat||"").trim(),email=String(s.registrationEmail||s.email||"").trim().toLowerCase();
    if(!s.id||!s.name||!sno||!seat||!email)throw new Error("姓名、學號、座號與 Google 信箱都必須填寫");
    const key=await this.enrollmentKey(this.cid,sno,seat),c=FB.db.collection("classes").doc(this.cid),batch=FB.db.batch(),now=Date.now();
    batch.set(c.collection("students").doc(String(s.id)),s);
    batch.set(c.collection("publicRoster").doc(String(s.id)),this._publicStudent(s));
    /* merge 保留已由學生本人驗證完成的 claimedUid／claimedAt；教師同步名冊時不會誤解除既有帳號。 */
    /* 信箱只留在教師可讀的 students 文件，不放進任何已登入者都能核對的 enrollment。 */
    batch.set(c.collection("enrollments").doc(key),{sid:String(s.id),className:state.className||"班級 RPG",student:this._enrollmentStudent(s),updatedAt:now},{merge:true});
    await batch.commit();
    this._lastSnap["stu:"+s.id]=JSON.stringify(s);
    this._lastSnap["pub:"+s.id]=JSON.stringify(this._publicStudent(s));
    this._lastSnap["enroll:"+key]=JSON.stringify({sid:String(s.id),className:state.className||"班級 RPG",student:this._enrollmentStudent(s)});
    return {sid:String(s.id),enrollmentKey:key};
  },
  async lookupEnrollment(cid,sno,seat){
    if(!FB.user||!FB.user.uid)throw new Error("請先完成 Google 登入");
    const key=await this.enrollmentKey(cid,sno,seat),snap=await FB.db.collection("classes").doc(cid).collection("enrollments").doc(key).get();
    if(!snap.exists)throw new Error("名冊中找不到這組學號與座號");
    const data=snap.data()||{};
    if(data.claimedUid&&data.claimedUid!==FB.user.uid)throw new Error("此名冊資料已綁定其他帳號，請洽老師解綁");
    return Object.assign({enrollmentKey:key},data);
  },
  async beginEnrollment(user,cid,sno,seat,email,birth){
    if(!user||!user.uid)throw new Error("請先完成 Google 登入");
    this.cid=cid;
    const sessionToken=String(new URLSearchParams(location.search).get("session")||"");
    return this.callServer("claimStudent",{sno:String(sno||"").trim(),seat:String(seat||"").trim(),birth:String(birth||"").trim(),sessionToken});
  },
  async unbindStudent(s){
    if(!this.on()||this.role!=="teacher"||!s)return;
    const sno=String(s.sno||"").trim(),seat=String(s.seat||s.sno||"").trim();if(!sno||!seat)return;
    const key=await this.enrollmentKey(this.cid,sno,seat),ref=FB.db.collection("classes").doc(this.cid).collection("enrollments").doc(key),snap=await ref.get();
    if(!snap.exists)return;const d=snap.data()||{},del=window.firebase&&firebase.firestore?firebase.firestore.FieldValue.delete():null;
    if(d.claimedUid){
      const root=FB.db.collection("studentAccounts").doc(String(d.claimedUid));
      await root.collection("classes").doc(String(this.cid)).delete().catch(e=>console.warn("delete class account",e));
      /* 相容舊版單一班級索引：只有索引確實屬於目前班級才刪除。 */
      await root.get().then(x=>{if(x.exists&&String((x.data()||{}).cid)===String(this.cid))return root.delete();}).catch(e=>console.warn("delete legacy account",e));
    }
    if(del)await ref.update({claimedUid:del,claimedEmail:del,claimedAt:del});else await ref.set({claimedUid:"",claimedEmail:"",claimedAt:0},{merge:true});
  },
  async sendThanks(from,to,msg,date){
    if(!this.on()||this.role!=="student"||String(from)!==String(this.myId))throw new Error("目前無法送出感謝卡");
    return this.callServer("sendThanks",{to:String(to),msg:String(msg||""),date:String(date)});
  },
  async sendHelpRequest(sid,kind){
    if(!this.on()||this.role!=="student"||String(sid)!==String(this.myId))throw new Error("目前無法送出求助");
    const option=HELP_REQUEST_OPTIONS[kind];if(!option)throw new Error("請選擇求助類型");
    const id=String(sid)+"_"+Date.now(),me=state.students.find(x=>String(x.id)===String(sid));
    await FB.db.collection("classes").doc(this.cid).collection("helpRequests").doc(id).set({id,sid:String(sid),studentName:String((me&&me.name)||"學生"),group:String((me&&me.group)||""),kind,category:option.label,status:"pending",createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdAtMs:Date.now()});
    return id;
  },
  async cancelHelpRequest(id,sid){
    if(!this.on()||this.role!=="student"||String(sid)!==String(this.myId))throw new Error("目前無法取消求助");
    await FB.db.collection("classes").doc(this.cid).collection("helpRequests").doc(String(id)).set({status:"cancelled",cancelledAt:firebase.firestore.FieldValue.serverTimestamp(),cancelledAtMs:Date.now()},{merge:true});
  },
  async resolveHelpRequest(id){
    if(!this.on()||this.role!=="teacher")throw new Error("只有教師能處理求助");
    await FB.db.collection("classes").doc(this.cid).collection("helpRequests").doc(String(id)).set({status:"resolved",resolvedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  },
  _thanksTargetReward(target,card){
    const t=JSON.parse(JSON.stringify(target)),from=state.students.find(x=>String(x.id)===String(card.from));
    t.thanksWall=Array.isArray(t.thanksWall)?t.thanksWall:[];
    t.thanksWall.unshift({from:String(card.from),fromName:(from&&from.name)||"同學",msg:String(card.msg||""),date:String(card.date||todayStr())});
    if(t.thanksWall.length>30)t.thanksWall.length=30;t.thanksTotal=(Number(t.thanksTotal)||0)+1;t.thanksNew=(Number(t.thanksNew)||0)+1;
    this._plainXp(t,5);return t;
  },
  _plainXp(s,xp){
    s.xp=(Number(s.xp)||0)+xp;s.totalXp=(Number(s.totalXp)||0)+xp;
    while(s.level<LEVEL_CAP&&s.xp>=xpForNextLevel(s.level)){
      s.xp-=xpForNextLevel(s.level);s.level++;s.spPoints=(Number(s.spPoints)||0)+1;if([5,15,30,60].includes(s.level))s.spPoints+=2;
      s.statPoints=(Number(s.statPoints)||0)+([5,15,30,60].includes(s.level)?2:1);const g=JOB_INFO[s.job].growth;s.baseAtk+=g.atk;s.baseDef+=g.def;s.baseAgi+=g.agi;s.baseInt+=g.int;s.maxHp+=10;s.currentHp=s.maxHp;
    }
    return s;
  },
  async processThanks(ref,card){
    if(!this.on()||this.role!=="teacher"||!card||card.status!=="pending")return;
    const c=FB.db.collection("classes").doc(this.cid),targetRef=c.collection("students").doc(String(card.to)),sourceRef=c.collection("students").doc(String(card.from)),pubRef=c.collection("publicRoster").doc(String(card.to)),sourcePub=c.collection("publicRoster").doc(String(card.from));
    const updated=await FB.db.runTransaction(async tx=>{
      const [cs,ts,ss]=await Promise.all([tx.get(ref),tx.get(targetRef),tx.get(sourceRef)]);if(!cs.exists||cs.data().status!=="pending")return null;
      const sourceData=ss.data()||{},last=String((sourceData.thanksRecent||{})[String(card.to)]||""),tooSoon=last&&Date.now()-Date.parse(last)<7*86400000;
      if(!ts.exists||!ss.exists||String(card.from)===String(card.to)||String(card.date)!==todayStr()||Number(card.slot)!==1||tooSoon){tx.update(ref,{status:"rejected",processedAt:Date.now(),reason:tooSoon?"same peer within 7 days":"invalid or expired request"});return null;}
      const t=this._thanksTargetReward(ts.data(),card),source=this._plainXp(JSON.parse(JSON.stringify(sourceData)),3);source.thanksRecent=source.thanksRecent||{};source.thanksRecent[String(card.to)]=new Date().toISOString();source.thanksSentTotal=(Number(source.thanksSentTotal)||0)+1;
      tx.set(targetRef,t);tx.set(pubRef,this._publicStudent(t));tx.set(sourceRef,source);tx.set(sourcePub,this._publicStudent(source));tx.update(ref,{status:"processed",processedAt:Date.now()});return {target:t,source};
    });
    if(updated){recordClassCare(card.from,card.to);[updated.target,updated.source].forEach(x=>{const i=state.students.findIndex(s=>String(s.id)===String(x.id));if(i>=0)state.students[i]=x;this._lastSnap["stu:"+x.id]=JSON.stringify(x);this._lastSnap["pub:"+x.id]=JSON.stringify(this._publicStudent(x));});this._parentSyncAt=0;this.syncParentViews(false).catch(()=>{});save();scheduleRender();}
  },

  /* ── 團體競技場同步 ── */
  async garenaWrite(obj){
    if(!this.on()) return;
    const c=FB.db.collection("classes").doc(this.cid),safe=JSON.parse(JSON.stringify(obj||{}));
    if(safe.mobaQuiz&&safe.mobaQuiz.correct&&!safe.mobaQuiz.reveal){
      await c.collection("garenaPrivate").doc("liveAnswer").set({quizId:String(safe.mobaQuiz.id||""),correct:String(safe.mobaQuiz.correct),updatedAt:Date.now()});
      delete safe.mobaQuiz.correct;
    }
    await c.collection("garena").doc("live").set(safe);
  },
  garenaListenLive(cb){
    if(!this.on()) return ()=>{};
    const c=FB.db.collection("classes").doc(this.cid);
    return c.collection("garena").doc("live").onSnapshot(async d=>{
      const live=d.exists?d.data():null;
      if(live&&this.role==="teacher"&&live.mobaQuiz&&!live.mobaQuiz.correct){
        try{const a=await c.collection("garenaPrivate").doc("liveAnswer").get();if(a.exists&&a.data().quizId===String(live.mobaQuiz.id||""))live.mobaQuiz.correct=a.data().correct;}catch(_){}
      }
      cb(live);
    },e=>console.warn("garenaLive",e));
  },
  async garenaCmd(sid, cmd){
    if(!this.on()) return;
    const now=Date.now();
    this._cmdSeq=(this._cmdSeq+1)%1000;
    await FB.db.collection("classes").doc(this.cid).collection("garenaCmd").doc(sid)
      .set(Object.assign({sid, ts:now, seq:now*1000+this._cmdSeq}, cmd));
  },
  garenaListenCmds(cb){
    if(!this.on()) return ()=>{};
    return FB.db.collection("classes").doc(this.cid).collection("garenaCmd")
      .onSnapshot(snap=> snap.docChanges().forEach(ch=> cb(ch.doc.data())), e=>console.warn("garenaCmd", e));
  },
  async mobaSignupWrite(data){
    if(!this.on()) return;
    await FB.db.collection("classes").doc(this.cid).collection("garena").doc("signup")
      .set(Object.assign({ts:Date.now()}, data));
  },
  async mobaSignupGet(){
    if(!this.on()) return null;
    const d=await FB.db.collection("classes").doc(this.cid).collection("garena").doc("signup").get();
    return d.exists?d.data():null;
  },
  mobaSignupListen(cb){
    if(!this.on()) return ()=>{};
    return FB.db.collection("classes").doc(this.cid).collection("garena").doc("signup")
      .onSnapshot(d=>cb(d.exists?d.data():null),e=>console.warn("mobaSignup",e));
  },
  async mobaSignupClearCommands(){
    if(!this.on()) return;
    const snap=await FB.db.collection("classes").doc(this.cid).collection("garenaCmd").get();
    const dels=[];
    snap.docs.forEach(d=>{if((d.data()||{}).type==="mobaSignup")dels.push(d.ref.delete());});
    await Promise.all(dels);
  },
  async garenaClear(){
    if(!this.on()) return;
    try{
      const c = FB.db.collection("classes").doc(this.cid);
      await c.collection("garena").doc("live").set({active:false, over:true, fighters:[], ts:Date.now()});
      const cmds = await c.collection("garenaCmd").get();
      for(const d of cmds.docs) await d.ref.delete();
    }catch(e){ console.warn("garenaClear", e); }
  },

  /* 班級主體 = state 去掉 students/customItems */
  _meta(){
    const m = Object.assign({}, state);
    delete m.students; delete m.customItems; delete m.submissions;delete m.teacherQuestions;delete m.helpRequests;
    return m;
  },
  _publicMeta(){
    const m=JSON.parse(JSON.stringify(this._meta()));
    ["log","awardLog","taskReviewLog","rewardCards","parentAccess"].forEach(k=>delete m[k]);
    /* 已停用的地下城作業不再把題目傳給全班，避免公開班級文件持續膨脹。 */
    m.tasks=(m.tasks||[]).map(t=>{if(t&&t.dungeonHomework&&!t.active){const x=Object.assign({},t);delete x.dungeonBank;return x;}return t;});
    if(m.lesson&&m.lesson.correct&&!m.lesson.reveal){m.lesson.correct="";m.lesson.solution="";}
    return m;
  },
  _catalog(){
    return allShopItems().filter(it=>!it.creatorId||it.status==="approved").map(it=>({id:it.id,name:it.name,type:it.type,price:Number(it.price)||0,rarity:it.rarity||"Common",jobs:it.jobs||null,itemLevel:itemLevelOf(it),creatorId:it.creatorId||null,atk:Number(it.atk)||0,def:Number(it.def)||0,agi:Number(it.agi)||0,int:Number(it.int)||0,affix:it.affix||null,weaponSkill:it.weaponSkill||null,weaponPattern:it.weaponPattern||null,effect:it.effect||null,petCraft:!!it.petCraft,petLegend:!!it.petLegend,sourcePet:it.sourcePet||null}));
  },
  _affixCatalog(){
    return AFFIXES.map(a=>({key:a.key,name:a.name,icon:a.icon,grade:a.grade,kind:a.kind,chance:a.chance,short:a.short,desc:a.desc,price:a.price||80}));
  },
  scheduleSync(){
    if(!this.on() || this._applying) return;
    clearTimeout(this._timer);
    this.setStatus("queued","等待同步");
    this._timer = setTimeout(()=> this.pushDirty().catch(e=>console.warn("sync",e)), 1500);
  },
  async pushDirty(){
    if(!this.on()) return;
    const c = FB.db.collection("classes").doc(this.cid);
    const batchWrites = [];
    const pendingSnap = {};
    /* 家長完全唯讀；學生只可同步自己的角色文件。教師才可寫班級主資料、
     * 全班角色與工坊作品，避免學生端一次 save() 覆寫整班資料。 */
    if(this.role==="parent")return;
    const teacher=this.role==="teacher";
    if(teacher){
      const metaJson = JSON.stringify(this._meta());
      if(this._lastSnap.meta !== metaJson){
        batchWrites.push(c.collection("data").doc("main").set(JSON.parse(metaJson)));
        pendingSnap.meta = metaJson;
      }
      const publicJson=JSON.stringify(this._publicMeta());
      if(this._lastSnap.publicMeta!==publicJson){batchWrites.push(c.collection("public").doc("main").set(JSON.parse(publicJson)));pendingSnap.publicMeta=publicJson;}
      if(state.lesson&&state.lesson.questionId&&state.lesson.correct&&!state.lesson.reveal){
        const answer={questionId:String(state.lesson.questionId),correct:String(state.lesson.correct),solution:String(state.lesson.solution||""),updatedAt:Date.now()};
        batchWrites.push(c.collection("private").doc("lessonAnswer").set(answer));
      }
      const bankJson=JSON.stringify(state.teacherQuestions||[]);
      if(this._lastSnap.teacherQuestions!==bankJson){batchWrites.push(c.collection("private").doc("questionBank").set({questions:JSON.parse(bankJson),updatedAt:Date.now()}));pendingSnap.teacherQuestions=bankJson;}
      const catalogJson=JSON.stringify({items:this._catalog(),affixes:this._affixCatalog()});
      if(this._lastSnap.catalog!==catalogJson){batchWrites.push(c.collection("catalog").doc("main").set(Object.assign(JSON.parse(catalogJson),{updatedAt:Date.now()})));pendingSnap.catalog=catalogJson;}
    }
    const students=teacher?state.students:state.students.filter(s=>String(s.id)===String(this.myId||""));
    for(const s of students){
      const j = JSON.stringify(s);
      if(this._lastSnap["stu:"+s.id] !== j){
        batchWrites.push(c.collection("students").doc(s.id).set(JSON.parse(j)));
        pendingSnap["stu:"+s.id] = j;
      }
    }
    if(teacher){
      for(const it of state.customItems){
        const j = JSON.stringify(it);
        if(this._lastSnap["item:"+it.id] !== j){
          batchWrites.push(c.collection("items").doc(String(it.id)).set(JSON.parse(j)));
          pendingSnap["item:"+it.id] = j;
        }
      }
    }
    if(!batchWrites.length){this.setStatus("synced","資料已同步");return;}
    this.setStatus("syncing","同步中");
    try{
      await Promise.all(batchWrites);
      Object.assign(this._lastSnap,pendingSnap); // 只有寫入成功才更新快照，失敗仍可重試
      this.setStatus("synced","資料已同步");
      if(teacher)this.pushLeaderboard();         // 排行榜只由教師端推送
      if(teacher)this.syncParentViews(false).catch(e=>console.warn("parent views",e));
      if(teacher)this.syncPublicRoster(false).catch(e=>console.warn("public roster",e));
      if(teacher)this.syncEnrollments(false).catch(e=>console.warn("enrollments",e));
    }catch(e){
      this.setStatus("error","同步失敗，將自動重試");
      clearTimeout(this._timer);this._timer=setTimeout(()=>this.pushDirty().catch(()=>{}),5000);
      throw e;
    }
  },
  /* 匯入還原後:強制全量上傳(不依快照比對),並刪除雲端多餘的學生/道具文件 */
  async pushFull(){
    if(!this.on()) return;
    const c = FB.db.collection("classes").doc(this.cid);
    // 先讀雲端現有 id,找出本地已無、需刪除的
    const [stuSnap,itemSnap,subSnap,enrollSnap,lockSnap] = await Promise.all([c.collection("students").get(),c.collection("items").get(),c.collection("submissions").get(),c.collection("enrollments").get(),c.collection("rosterLocks").get()]);
    const localStuIds = new Set(state.students.map(s=>String(s.id)));
    const localItemIds = new Set(state.customItems.map(it=>String(it.id)));
    const localSubIds = new Set((state.submissions||[]).map(x=>this.submissionDocId(x.taskId,x.sid)));
    const ops = [];
    ops.push(()=>c.collection("data").doc("main").set(JSON.parse(JSON.stringify(this._meta()))));
    ops.push(()=>c.collection("public").doc("main").set(JSON.parse(JSON.stringify(this._publicMeta()))));
    ops.push(()=>c.collection("private").doc("questionBank").set({questions:JSON.parse(JSON.stringify(state.teacherQuestions||[])),updatedAt:Date.now()}));
    ops.push(()=>c.collection("catalog").doc("main").set({items:this._catalog(),affixes:this._affixCatalog(),updatedAt:Date.now()}));
    if(state.lesson&&state.lesson.questionId&&state.lesson.correct)ops.push(()=>c.collection("private").doc("lessonAnswer").set({questionId:String(state.lesson.questionId),correct:String(state.lesson.correct),solution:String(state.lesson.solution||""),updatedAt:Date.now()}));
    state.students.forEach(s=>ops.push(()=>c.collection("students").doc(s.id).set(JSON.parse(JSON.stringify(s)))));
    state.customItems.forEach(it=>ops.push(()=>c.collection("items").doc(String(it.id)).set(JSON.parse(JSON.stringify(it)))));
    (state.submissions||[]).forEach(x=>ops.push(()=>c.collection("submissions").doc(this.submissionDocId(x.taskId,x.sid)).set(JSON.parse(JSON.stringify(x)))));
    stuSnap.docs.forEach(d=>{if(!localStuIds.has(String(d.id)))ops.push(()=>c.collection("students").doc(d.id).delete());});
    itemSnap.docs.forEach(d=>{if(!localItemIds.has(String(d.id)))ops.push(()=>c.collection("items").doc(d.id).delete());});
    subSnap.docs.forEach(d=>{if(!localSubIds.has(String(d.id)))ops.push(()=>c.collection("submissions").doc(d.id).delete());});
    /* 移除備份中已不存在學生的登入索引與舊版根索引，避免該帳號登入後指向不存在的角色。 */
    const removedEnrollments=enrollSnap.docs.filter(d=>!localStuIds.has(String((d.data()||{}).sid||"")));
    for(const d of removedEnrollments){
      const uid=String((d.data()||{}).claimedUid||"");ops.push(()=>d.ref.delete());
      if(uid){
        ops.push(()=>FB.db.collection("studentAccounts").doc(uid).collection("classes").doc(String(this.cid)).delete());
        const legacy=await FB.db.collection("studentAccounts").doc(uid).get();if(legacy.exists&&String((legacy.data()||{}).cid||"")===String(this.cid))ops.push(()=>legacy.ref.delete());
      }
    }
    lockSnap.docs.forEach(d=>{if(!localStuIds.has(String((d.data()||{}).sid||"")))ops.push(()=>d.ref.delete());});
    for(const s of state.students){
      const sno=String(s.sno||"").trim(),seat=String(s.seat||s.sno||"").trim();if(!sno||!seat)continue;
      const snoKey="sno_"+await sha256Hex(sno),seatKey="seat_"+await sha256Hex(seat),restoredAt=Date.now();
      ops.push(()=>c.collection("rosterLocks").doc(snoKey).set({sid:String(s.id),value:sno,restoredAt}));
      ops.push(()=>c.collection("rosterLocks").doc(seatKey).set({sid:String(s.id),value:seat,restoredAt}));
    }
    for(let i=0;i<ops.length;i+=25)await Promise.all(ops.slice(i,i+25).map(run=>run()));
    this._snapAll();                            // 重建快照,避免匯入後又觸發整批 echo
    this.pushLeaderboard();
    if(this.role==="teacher")await Promise.all([this.syncParentViews(true),this.syncPublicRoster(true),this.syncEnrollments(true)]);
  },
  /* 還原完成後重新讀取雲端，逐筆比對本班角色與索引，避免只憑寫入呼叫成功就回報完成。 */
  async verifyFullRestore(){
    if(!this.on()||this.role!=="teacher")return {online:false,students:(state.students||[]).length};
    const c=FB.db.collection("classes").doc(this.cid),got=await Promise.all([
      c.collection("students").get(),c.collection("publicRoster").get(),c.collection("items").get(),c.collection("submissions").get()
    ]),remoteStudents=new Map(got[0].docs.map(d=>[String(d.id),d.data()])),remotePublic=new Set(got[1].docs.map(d=>String(d.id))),remoteItems=new Set(got[2].docs.map(d=>String(d.id))),remoteSubs=new Set(got[3].docs.map(d=>String(d.id)));
    const missing=[],different=[];
    for(const s of state.students||[]){const r=remoteStudents.get(String(s.id));if(!r)missing.push(String(s.id));else if(canonicalJson(r)!==canonicalJson(s))different.push(String(s.id));}
    const extra=[...remoteStudents.keys()].filter(id=>!(state.students||[]).some(s=>String(s.id)===id));
    const publicMissing=(state.students||[]).filter(s=>!remotePublic.has(String(s.id))).map(s=>String(s.id));
    const itemMissing=(state.customItems||[]).filter(it=>!remoteItems.has(String(it.id))).map(it=>String(it.id));
    const subMissing=(state.submissions||[]).filter(x=>!remoteSubs.has(this.submissionDocId(x.taskId,x.sid))).map(x=>this.submissionDocId(x.taskId,x.sid));
    if(missing.length||different.length||extra.length||publicMissing.length||itemMissing.length||subMissing.length)throw new Error("雲端核對不一致（缺少角色 "+missing.length+"、角色內容差異 "+different.length+"、多餘角色 "+extra.length+"、公開索引缺少 "+publicMissing.length+"、作品缺少 "+itemMissing.length+"、任務回報缺少 "+subMissing.length+"）");
    return {online:true,students:remoteStudents.size,items:remoteItems.size,submissions:remoteSubs.size,publicRoster:remotePublic.size};
  },
  /* 教師讀完整資料；學生只讀公開角色摘要、自己的完整角色與已上架作品。 */
  studentAccountRef(user,cid){return FB.db.collection("studentAccounts").doc(user.uid).collection("classes").doc(String(cid));},
  async getStudentAccount(user,cid){
    if(!user||!user.uid||!cid)return null;
    const scoped=await this.studentAccountRef(user,cid).get();if(scoped.exists)return scoped.data();
    /* 舊版索引只相容原班級；不會阻止同一 Google 帳號加入其他班級。 */
    const legacy=await FB.db.collection("studentAccounts").doc(user.uid).get();
    return legacy.exists&&String((legacy.data()||{}).cid)===String(cid)?legacy.data():null;
  },
  async listStudentClassSummaries(user){
    /* 課後大廳尚未選定班級，因此不能依賴 this.cid／this.on()。 */
    if(!FB.ready||!FB.db||!user||!user.uid)return [];
    const root=FB.db.collection("studentAccounts").doc(user.uid),scoped=await root.collection("classes").get();
    let accounts=scoped.docs.map(d=>Object.assign({cid:String(d.id)},d.data()||{}));
    if(!accounts.length){const legacy=await root.get();if(legacy.exists&&legacy.data().cid)accounts=[legacy.data()];}
    const rows=await Promise.all(accounts.map(async a=>{
      const cid=String(a.cid||"");if(!cid||!a.sid)return null;
      try{
        const c=FB.db.collection("classes").doc(cid),got=await Promise.all([c.collection("public").doc("main").get(),c.collection("students").doc(String(a.sid)).get()]);
        if(!got[0].exists||!got[1].exists)return null;
        const meta=got[0].data()||{},student=got[1].data()||{},grade=dungeonGradeOf(student);
        const assignments=(meta.tasks||[]).filter(t=>t&&t.active&&t.dungeonHomework&&Number(t.dungeonVolume||1)<=grade.maxVolume&&(t.scope==="all"||t.scope===student.group||taskScopeHas(t,String(student.id))));
        return {cid,sid:String(a.sid),className:String(meta.className||meta.lbName||cid),student,assignments,announcements:(meta.announcements||[]).slice(0,10),classSession:meta.classSession||{}};
      }catch(e){console.warn("waiting class summary",cid,e);return null;}
    }));
    return rows.filter(Boolean);
  },
  async loadClass(cid, myEmail, options){
    options=options||{};
    const c = FB.db.collection("classes").doc(cid);
    let account=null;
    if(this.role==="student"&&FB.user&&FB.user.uid){
      account=await this.getStudentAccount(FB.user,cid);
      if(!account)throw new Error("此帳號尚未加入這個班級，請先完成新生註冊");
    }
    let got,metaDoc;
    if(this.role==="teacher"){
      got=await Promise.all([c.collection("data").doc("main").get(),c.collection("students").get(),c.collection("items").get(),c.collection("submissions").get(),c.collection("private").doc("lessonAnswer").get(),c.collection("private").doc("questionBank").get(),c.collection("helpRequests").get()]);
      metaDoc=got[0];
    }else{
      /* 登入核心只依賴班級公開設定與自己的角色。商店／任務等附加查詢個別容錯，
       * 避免其中一個索引或網路請求失敗時，把已成功註冊的角色擋在登入頁外。 */
      const core=await Promise.all([c.collection("public").doc("main").get(),c.collection("students").doc(String(account.sid)).get()]);
      const extras=await Promise.allSettled([c.collection("publicRoster").get(),c.collection("items").where("status","==","approved").get(),c.collection("submissions").where("sid","==",String(account.sid)).get(),c.collection("items").where("creatorId","==",String(account.sid)).get()]);
      const empty={docs:[],empty:true},pick=i=>extras[i].status==="fulfilled"?extras[i].value:(console.warn("student class optional load",extras[i].reason),empty);
      got=[core[0],pick(0),pick(1),core[1],pick(2),pick(3)];metaDoc=got[0];
    }
    if(!metaDoc.exists) throw new Error("找不到班級資料");
    const meta = metaDoc.data();
    if(this.role==="teacher"){
      meta.students=got[1].docs.map(d=>d.data());meta.customItems=got[2].docs.map(d=>d.data());
      if(!got[3].empty)meta.submissions=got[3].docs.map(d=>d.data());
      if(meta.lesson&&got[4].exists&&got[4].data().questionId===String(meta.lesson.questionId||"")){meta.lesson.correct=got[4].data().correct||meta.lesson.correct;meta.lesson.solution=got[4].data().solution||meta.lesson.solution;}
      meta.teacherQuestions=got[5].exists&&Array.isArray(got[5].data().questions)?got[5].data().questions:[];
      meta.helpRequests=got[6].docs.map(d=>Object.assign({id:d.id},d.data()));
    }else{
      meta.students=got[1].docs.map(d=>d.data());
      if(got[3].exists){const own=got[3].data(),i=meta.students.findIndex(x=>String(x.id)===String(own.id));if(i>=0)meta.students[i]=own;else meta.students.push(own);}
      const byId=new Map();got[2].docs.concat(got[5].docs).forEach(d=>byId.set(String(d.id),d.data()));meta.customItems=Array.from(byId.values());
      if(!got[4].empty)meta.submissions=got[4].docs.map(d=>d.data());
    }
    state = backfill(meta);
    this.cid = cid;
    // 📊 記下「我是誰」:學生角色之後只即時監聽自己+同組,其餘用 refreshRoster() 按需刷新(省讀取量)
    this.myId = null; this.myGroup = null;
    if(account){
      this.myId=String(account.sid);const me=state.students.find(x=>String(x.id)===this.myId);if(me)this.myGroup=me.group;
    }else if(myEmail){
      const me = state.students.find(x=>(x.email||"").toLowerCase()===myEmail.toLowerCase());
      if(me){ this.myId = me.id; this.myGroup = me.group; }
    }
    localStorage.setItem("rpg-last-class", cid);
    this.setStatus("synced","雲端班級已載入");
    this._snapAll();
    this._lastRosterFetch = Date.now();                    // 剛拿過安全名冊摘要,節流計時器歸零
    localStorage.setItem(LS_KEY, JSON.stringify(state));   // 雲端資料也落一份本機
    if(options.listen!==false)this.listen();
    if(this.role==="teacher")await Promise.all([this.syncPublicRoster(true),this.syncEnrollments(true),this.syncParentViews(true)]);
    try{ PEAK.refresh(); if(this.role==="teacher")this.pushLeaderboard(); }catch(_){}   // 🌏 學生端不寫排行榜
  },
  _snapAll(){
    this._lastSnap = { meta: JSON.stringify(this._meta()),publicMeta:JSON.stringify(this._publicMeta()) };
    this._lastSnap.teacherQuestions=JSON.stringify(state.teacherQuestions||[]);
    this._lastSnap.catalog=JSON.stringify({items:this._catalog(),affixes:this._affixCatalog()});
    state.students.forEach(s=> this._lastSnap["stu:"+s.id] = JSON.stringify(s));
    state.customItems.forEach(it=> this._lastSnap["item:"+it.id] = JSON.stringify(it));
  },
  /* 即時監聽:別的裝置(老師/其他學生)改了資料,這裡自動更新畫面 */
  listen(){
    this.stopListen();
    const c = FB.db.collection("classes").doc(this.cid);
    const apply = (fn)=>{ this._applying = true; try{ fn(); scheduleRender(); }finally{ this._applying = false; } };
    const applyStuDoc = (d)=>{
      const j = JSON.stringify(d);
      if(this._lastSnap["stu:"+d.id] === j) return false;    // 自己寫的,略過
      apply(()=>{
        const i = state.students.findIndex(x=>x.id===d.id);
        if(i>=0) state.students[i]=d; else state.students.push(d);
        backfill(state);                                     // 遠端精簡學生文件先補齊欄位，避免學生頁渲染中斷
        this._lastSnap["stu:"+d.id]=j;
      });
      return true;
    };
    const applyItemDoc = (d, removed)=>{
      const j = JSON.stringify(d);
      if(this._lastSnap["item:"+d.id] === j) return;
      apply(()=>{
        const i = state.customItems.findIndex(x=>x.id===d.id);
        if(removed){ if(i>=0) state.customItems.splice(i,1); delete this._lastSnap["item:"+d.id]; }
        else{ if(i>=0) state.customItems[i]=d; else state.customItems.push(d); this._lastSnap["item:"+d.id]=j; }
      });
    };
    if(this.role === "teacher"){
      // 👩‍🏫 老師:需要即時看到全班,維持全量監聽
      this._unsubs.push(c.collection("students").onSnapshot(snap=>{
        let classXpChanged=false;
        snap.docChanges().forEach(ch=>{
          const d = ch.doc.data();
          if(ch.type==="removed"){
            const j = JSON.stringify(d);
            if(this._lastSnap["stu:"+d.id]===j) return;
            const i = state.students.findIndex(x=>x.id===d.id);
            if(i>=0) state.students.splice(i,1);
            delete this._lastSnap["stu:"+d.id];
            render();
          } else if(applyStuDoc(d))classXpChanged=true;
        });
        if(classXpChanged)setTimeout(()=>{const before=(state.classUnlocks.celebrated||[]).length;classUnlockSync(false);if((state.classUnlocks.celebrated||[]).length!==before)save();},0);
      }));
      this._unsubs.push(c.collection("items").onSnapshot(snap=>{
        snap.docChanges().forEach(ch=> applyItemDoc(ch.doc.data(), ch.type==="removed"));
      }));
      // 🎁 獎勵卡狀態以獨立文件即時回報，學生領走後教師不必手動重整。
      this._unsubs.push(c.collection("rewardCards").onSnapshot(snap=>{
        let changed=false;
        snap.docChanges().forEach(ch=>{
          const d=ch.doc.data(); const i=(state.rewardCards||[]).findIndex(x=>x.code===d.code);
          if(ch.type==="removed"){ if(i>=0){ state.rewardCards.splice(i,1); changed=true; } }
          else if(i>=0){ state.rewardCards[i]=Object.assign({},state.rewardCards[i],d); changed=true; }
          else{ state.rewardCards.push(d); changed=true; }
        });
        if(changed) scheduleRender();
      }));
      this._unsubs.push(c.collection("submissions").onSnapshot(snap=>{
        let changed=false;snap.docChanges().forEach(ch=>{const d=ch.doc.data(),i=(state.submissions||[]).findIndex(x=>+x.taskId===+d.taskId&&String(x.sid)===String(d.sid));if(ch.type==="removed"){if(i>=0){state.submissions.splice(i,1);changed=true;}}else if(i>=0){state.submissions[i]=d;changed=true;}else{state.submissions.push(d);changed=true;}});if(changed)scheduleRender();
      }));
      this._unsubs.push(c.collection("thanks").where("status","==","pending").onSnapshot(snap=>{
        snap.docChanges().forEach(ch=>{if(ch.type==="added"||ch.type==="modified")this.processThanks(ch.doc.ref,ch.doc.data()).catch(e=>console.warn("thanks",e));});
      }));
      this._unsubs.push(c.collection("helpRequests").onSnapshot(snap=>{
        let changed=false;snap.docChanges().forEach(ch=>{const d=Object.assign({id:ch.doc.id},ch.doc.data()),i=(state.helpRequests||[]).findIndex(x=>String(x.id)===String(d.id));if(ch.type==="removed"){if(i>=0){state.helpRequests.splice(i,1);changed=true;}}else if(i>=0){state.helpRequests[i]=d;changed=true;}else{state.helpRequests.push(d);changed=true;}});if(changed)scheduleRender();
      }));
    }else{
      // 🧑‍🎓 學生只監聽自己的完整檔案；同學只讀去識別化的公開角色摘要。
      if(this.myId){
        this._unsubs.push(c.collection("students").doc(this.myId).onSnapshot(doc=>{
          if(doc.exists) applyStuDoc(doc.data());
        }));
      }
      this._unsubs.push(c.collection("publicRoster").onSnapshot(snap=>{
        snap.docChanges().forEach(ch=>{const d=ch.doc.data();if(String(d.id)!==String(this.myId)&&ch.type!=="removed")applyStuDoc(d);});
      }));
      this._unsubs.push(c.collection("items").where("status","==","approved").onSnapshot(snap=>snap.docChanges().forEach(ch=>applyItemDoc(ch.doc.data(),ch.type==="removed"))));
      if(this.myId)this._unsubs.push(c.collection("items").where("creatorId","==",String(this.myId)).onSnapshot(snap=>snap.docChanges().forEach(ch=>applyItemDoc(ch.doc.data(),ch.type==="removed"))));
      if(this.myId){
        this._unsubs.push(c.collection("submissions").where("sid","==",String(this.myId)).onSnapshot(snap=>{
          snap.docChanges().forEach(ch=>{const d=ch.doc.data(),i=(state.submissions||[]).findIndex(x=>+x.taskId===+d.taskId&&String(x.sid)===String(d.sid));if(ch.type==="removed"){if(i>=0)state.submissions.splice(i,1);}else if(i>=0)state.submissions[i]=d;else state.submissions.push(d);});scheduleRender();
        }));
      }
    }
    this._unsubs.push(c.collection(this.role==="teacher"?"data":"public").doc("main").onSnapshot(doc=>{
      if(!doc.exists) return;
      const j = JSON.stringify(doc.data());
      if(this._lastSnap.meta === j) return;
      apply(()=>{
        const meta = doc.data();
        if(this.role==="teacher"&&meta.lesson&&state.lesson&&meta.lesson.questionId===state.lesson.questionId&&!meta.lesson.correct){meta.lesson.correct=state.lesson.correct;meta.lesson.solution=state.lesson.solution;}
        meta.students = state.students; meta.customItems = state.customItems;meta.submissions=state.submissions;meta.helpRequests=state.helpRequests;
        state = backfill(meta);
        this._lastSnap.meta = j;
        if(this.role==="student"){
          const entryToken=String(new URLSearchParams(location.search).get("session")||"");
          if(entryToken&&!classSessionIsLive(state.classSession,entryToken))setTimeout(()=>forceStudentClassExit("老師已結束本節課，這台裝置已安全登出。"),0);
        }
      });
    }));
  },
  /* 📊 按需刷新公開角色摘要+可見作品；不讀取其他學生的私密文件。 */
  async refreshRoster(force){
    if(!this.on() || this.role==="teacher") return;           // 老師已是全量即時監聽,不需要
    const now = Date.now();
    if(!force && this._lastRosterFetch && now-this._lastRosterFetch<30000) return;
    this._lastRosterFetch = now;
    try{
      const c = FB.db.collection("classes").doc(this.cid);
      const req=[c.collection("publicRoster").get(),c.collection("items").where("status","==","approved").get()];
      if(this.myId)req.push(c.collection("items").where("creatorId","==",String(this.myId)).get());
      const got=await Promise.all(req),stuSnap=got[0],itemDocs=got.slice(1).flatMap(x=>x.docs);
      let changed = false;
      stuSnap.docs.forEach(d=>{
        const data = d.data(); const j = JSON.stringify(data);
        if(String(data.id)===String(this.myId))return;
        if(this._lastSnap["stu:"+data.id]===j) return;
        const i = state.students.findIndex(x=>x.id===data.id);
        if(i>=0) state.students[i]=data; else state.students.push(data);
        this._lastSnap["stu:"+data.id]=j; changed = true;
      });
      itemDocs.forEach(d=>{
        const data = d.data(); const j = JSON.stringify(data);
        if(this._lastSnap["item:"+data.id]===j) return;
        const i = state.customItems.findIndex(x=>x.id===data.id);
        if(i>=0) state.customItems[i]=data; else state.customItems.push(data);
        this._lastSnap["item:"+data.id]=j; changed = true;
      });
      if(changed) render();
    }catch(e){ console.warn("refreshRoster", e); }
  },
  stopListen(){ this._unsubs.forEach(u=>{ try{u();}catch(e){} }); this._unsubs=[]; },

  /* ── 班級管理 ── */
  async listMyClasses(email){
    const q = await FB.db.collection("classes").where("teacherEmails","array-contains",email).get();
    return q.docs.map(d=>({ cid:d.id, name:(d.data().name||"未命名"), createdAt:d.data().createdAt }));
  },
  /* 學生帳號索引：同一 Google uid 可在不同班級各有一個獨立角色。 */
  async saveStudentAccount(user,cid,sid,email,enrollmentKey){
    if(!user||!user.uid||!cid) return;
    const payload={cid:String(cid),sid:String(sid||""),email:String(email||"").toLowerCase(),updatedAt:Date.now()};if(enrollmentKey)payload.enrollmentKey=String(enrollmentKey);
    try{ await this.studentAccountRef(user,cid).set(payload,{merge:true}); }
    catch(e){ console.warn("student account index",e); }      // 舊安全規則未開放時不阻斷註冊
  },
  async findStudentAccount(user,email,cid){
    if(user&&user.uid){
      try{ const d=await this.getStudentAccount(user,cid);if(d)return d; }catch(e){}
    }
    /* 舊帳號尚無索引：用已綁定 email 找一次並自動補建。 */
    try{
      const q=await FB.db.collectionGroup("students").where("email","==",String(email||"").toLowerCase()).limit(2).get();
      if(!q.empty){const wanted=cid?q.docs.find(d=>d.ref.path.split("/")[1]===String(cid)):q.docs[0],d=wanted||null;if(d){const parts=d.ref.path.split("/"),foundCid=parts[0]==="classes"?parts[1]:"";if(foundCid){const out={cid:foundCid,sid:d.id,email};await this.saveStudentAccount(user,foundCid,d.id,email);return out;}}}
    }catch(e){ console.warn("student account lookup",e); }
    return null;
  },
  async createClass(name, email, fromState){
    // 新生班級代碼固定 5 碼；排除 0/O、1/I，方便教室口頭告知。舊班級 ID 仍完全相容。
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let cid="";for(let i=0;i<5;i++)cid+=alphabet[Math.floor(Math.random()*alphabet.length)];
    const src = fromState ? backfill(JSON.parse(JSON.stringify(fromState))) : emptyClassState();
    src.className = name;
    await FB.db.collection("classes").doc(cid).set({
      name, teacherEmails:[email], ownerUid:(FB.user&&FB.user.uid)||"", createdAt: Date.now()
    });
    // 上傳資料
    const c = FB.db.collection("classes").doc(cid);
    const meta = Object.assign({}, src); delete meta.students; delete meta.customItems;delete meta.submissions;delete meta.teacherQuestions;
    if(meta.lesson&&meta.lesson.correct&&!meta.lesson.reveal)meta.lesson=Object.assign({},meta.lesson,{correct:"",solution:""});
    if(!meta.teacherEmails || !meta.teacherEmails.length) meta.teacherEmails=[email];
    await c.collection("data").doc("main").set(JSON.parse(JSON.stringify(meta)));
    const publicMeta=JSON.parse(JSON.stringify(meta));["log","awardLog","taskReviewLog","rewardCards","parentAccess"].forEach(k=>delete publicMeta[k]);if(publicMeta.lesson&&publicMeta.lesson.correct&&!publicMeta.lesson.reveal){publicMeta.lesson.correct="";publicMeta.lesson.solution="";}
    await c.collection("public").doc("main").set(publicMeta);
    await c.collection("private").doc("questionBank").set({questions:JSON.parse(JSON.stringify(src.teacherQuestions||[])),updatedAt:Date.now()});
    if(src.lesson&&src.lesson.questionId&&src.lesson.correct)await c.collection("private").doc("lessonAnswer").set({questionId:String(src.lesson.questionId),correct:String(src.lesson.correct),solution:String(src.lesson.solution||""),updatedAt:Date.now()});
    await Promise.all(src.students.map(s=> c.collection("students").doc(s.id).set(JSON.parse(JSON.stringify(s)))));
    await Promise.all((src.customItems||[]).map(it=> c.collection("items").doc(String(it.id)).set(JSON.parse(JSON.stringify(it)))));
    await Promise.all((src.submissions||[]).map(x=>c.collection("submissions").doc(this.submissionDocId(x.taskId,x.sid)).set(JSON.parse(JSON.stringify(x)))));
    await Promise.all(src.students.map(async s=>{
      await c.collection("publicRoster").doc(String(s.id)).set(this._publicStudent(s));
      const sno=String(s.sno||"").trim(),seat=String(s.seat||s.sno||"").trim();if(!sno||!seat)return;
      const key=await this.enrollmentKey(cid,sno,seat);
      await c.collection("enrollments").doc(key).set({sid:String(s.id),className:name,student:this._enrollmentStudent(s),updatedAt:Date.now()},{merge:true});
    }));
    return cid;
  },

  async deleteClass(cid){
    const c = FB.db.collection("classes").doc(cid);
    const names=["students","publicRoster","enrollments","rosterLocks","items","data","public","private","submissions","parentViews","thanks","helpRequests","rewardCards","garena","garenaPrivate","garenaCmd"];
    const snaps=await Promise.all(names.map(n=>c.collection(n).get()));
    const dels = [];
    snaps.forEach(s=>s.docs.forEach(d=>dels.push(d.ref.delete())));
    dels.push(FB.db.collection("leaderboard").doc(cid).delete().catch(()=>{}));
    await Promise.all(dels);
    await c.delete();
    if(this.cid===cid){ this.stopListen(); this.cid=null; }
    if(localStorage.getItem("rpg-last-class")===cid) localStorage.removeItem("rpg-last-class");
  },

  /* ── 世界排行榜 ── */
  _lbLast: 0,
  async pushLeaderboard(){
    if(!this.on() || !state.lbOptIn || !classFeatureUnlocked("world")) return;
    const now = Date.now();
    if(now - this._lbLast < 5*60*1000) return;             // 5 分鐘節流
    this._lbLast = now;
    const n = state.students.length || 1;
    const total = state.students.reduce((a,s)=>a+(s.totalXp||0),0);
    const weekKey = lbWeekKey();
    const weekXp = (state.xpWeek && state.xpWeek.key===weekKey) ? state.xpWeek.sum : 0;
    await FB.db.collection("leaderboard").doc(this.cid).set({
      name: state.lbName || state.className || "匿名班級",
      students: n, totalXp: total, avgXp: Math.round(total/n),
      weekKey, weekXp, weekAvg: Math.round(weekXp/n),        // 週人均(班級人數公平)
      bossKills: state.bossKills||0,                              // 只送班級摘要，不送任何個人英雄資料
      updatedAt: now
    });
  },
  async fetchLeaderboard(){
    const q = await FB.db.collection("leaderboard").orderBy("avgXp","desc").limit(50).get();
    return q.docs.map(d=>d.data());
  }
};
