/*
 * classroom-quiz：課堂題庫選題、圖片與幾何題、區域移動、道具、搶答、倒數及結算控制器。
 * 本檔沿用 classic script 全域依賴，必須在資料與登入層之後、三種角色介面控制器之前載入。
 */

function learningStreakUp(s){
  const d=todayStr(), st=s.learningStreak||(s.learningStreak={date:"",days:0,total:0});
  if(st.date===d) return st;
  const yesterday=new Date(Date.now()-86400000).toLocaleDateString("sv");
  st.days=st.date===yesterday ? (st.days||0)+1 : 1;
  st.date=d; st.total=(st.total||0)+1;
  return st;
}

function lessonAnswer(sid, pt, xpOverride){
  const l=state.lesson, s=stu(sid);
  if(!l || !l.active || !s) return false;
  if(l.answered && l.answered[sid]){ toast(s.name+" 已完成這題", true); return false; }
  l.answered=l.answered||{}; l.answered[sid]=Date.now();
  s.lessonAnswers=(s.lessonAnswers||0)+1;
  const streak=learningStreakUp(s);
  const earnedXp=xpOverride==null?(+l.xp||0):Math.max(0,Math.round(Number(xpOverride)||0));
  reward(sid, earnedXp, +l.gold||0, "回答知識挑戰「"+(l.title||"課堂問題")+"」", pt, false);
  if(streak.days===3 || streak.days===7 || streak.days===14){
    const gem=creditDiamonds(s,1,"learning");
    addLog(sid,"🔥 學習連勝 "+streak.days+" 天"+(gem?"，獲得 1💎！":"；本週鑽石已達上限")); save();
    toast("🔥 "+s.name+" 學習連勝 "+streak.days+" 天！"+(gem?"+1💎":"本週鑽石已達上限"));
  }
  return true;
}

function zoneClamp(v){return Math.max(5,Math.min(95,Number(v)||50));}

function zoneLetterAt(x,y){
  x=Number(x)||50;y=Number(y)||50;
  // 必須讓角色中心點進入畫面上實際可見的答案框；中央水平／垂直走道不算作答。
  const left=x>=1&&x<=48,right=x>=52&&x<=99,top=y>=1&&y<=45,bottom=y>=55&&y<=99;
  if(left&&top)return "A";if(right&&top)return "B";if(left&&bottom)return "C";if(right&&bottom)return "D";return "";
}

function zoneSpawn(s){
  const seed=String(s&&s.id||"").split("").reduce((n,c)=>n+c.charCodeAt(0),0);
  return {x:48+(seed%5),y:47+((seed*3)%7),answer:"",confirmed:false};
}

function zoneSeeded(seed){let n=(Number(seed)||Date.now())>>>0;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}

function makeZoneObjects(seed){
  const rnd=zoneSeeded(seed),out=[],occupied=[];function pos(){for(let n=0;n<50;n++){const x=10+rnd()*80,y=13+rnd()*74;if(x>42&&x<58&&y>39&&y<61)continue;if(occupied.every(p=>zoneDist(x,y,p.x,p.y)>13)){occupied.push({x,y});return{x:Math.round(x),y:Math.round(y)};}}return{x:15+rnd()*70,y:15+rnd()*70};}
  for(let i=0;i<3;i++){const p=pos();out.push({id:"wall"+i,kind:"wall",tone:"neutral",x:p.x,y:p.y,w:8+Math.round(rnd()*6),h:9+Math.round(rnd()*7),icon:"🪨"});}
  [{kind:"bomb",tone:"bad",icon:"💣"},{kind:"slow",tone:"bad",icon:"🐌"},{kind:"reverse",tone:"bad",icon:"↔️"},{kind:"confuse",tone:"bad",icon:"🌀"},{kind:"med",tone:"good",icon:"➕"},{kind:"haste",tone:"good",icon:"⚡"},{kind:"shield",tone:"good",icon:"🛡️"},{kind:"bonus",tone:"good",icon:"⏱️"},{kind:"coin",tone:"good",icon:"🪙"}].forEach((o,i)=>{const p=pos();out.push({...o,id:o.kind+i,x:p.x,y:p.y,r:o.kind==="bomb"?7:5});});return out;
}

function zoneObjects(l){return l&&(l.quizMode==="item"||l.quizMode==="battle")&&Array.isArray(l.zoneObjects)?l.zoneObjects:[];}

function zoneDist(x1,y1,x2,y2){return Math.hypot(Number(x1)-Number(x2),Number(y1)-Number(y2));}

function zoneMaxHp(s){return Math.max(100,Number(s&&s.maxHp)||100);}

function zoneAnswerState(s,l){
  const qid=l&&l.questionId||"";let z=s.liveAnswer;
  if(!z||z.questionId!==qid){const p=zoneSpawn(s);z=s.liveAnswer={questionId:qid,x:p.x,y:p.y,answer:"",confirmed:false,quizHp:zoneMaxHp(s),quizMaxHp:zoneMaxHp(s),used:{},itemGold:0,event:"",updatedAt:Date.now()};}
  z.quizMaxHp=Math.max(1,Number(z.quizMaxHp)||zoneMaxHp(s));z.quizHp=Math.max(0,Math.min(z.quizMaxHp,Number(z.quizHp==null?z.quizMaxHp:z.quizHp)));z.used=z.used||{};z.x=zoneClamp(z.x);z.y=zoneClamp(z.y);z.answer=zoneLetterAt(z.x,z.y);return z;
}

function syncZoneStudent(s,force){
  const persist=()=>{try{localStorage.setItem(LS_KEY,JSON.stringify(state));}catch(_){}};clearTimeout(zoneStudentLocalTimer);if(force)persist();else zoneStudentLocalTimer=setTimeout(persist,180);
  if(!(CLOUD.on()&&CLOUD.role==="student"&&FB.db))return;
  clearTimeout(zoneStudentSyncTimer);
  const push=()=>{
    const payload=JSON.parse(JSON.stringify(s.liveAnswer||{}));
    FB.db.collection("classes").doc(CLOUD.cid).collection("students").doc(s.id).set({liveAnswer:payload},{merge:true}).then(()=>{
      CLOUD._lastSnap["stu:"+s.id]=JSON.stringify(s);
    }).catch(e=>console.warn("zone answer sync",e));
  };
  if(force)push();else zoneStudentSyncTimer=setTimeout(push,420);
}

function zoneMoveStudent(s,dx,dy){
  const l=state.lesson;if(!l||!l.active||l.mode!=="zone"||l.locked)return false;
  const z=zoneAnswerState(s,l);if(z.confirmed){toast("🔒 本題答案已送出，不能再移動",true);return false;}if(Date.now()<(l.readyUntil||0)){toast("準備倒數中，GO！之後才能移動",true);return false;}if(z.quizHp<=0){toast("💫 體力歸零，只能在原地確認目前區域",true);return false;}
  const now=Date.now();if(z.reverseUntil>now){dx=-dx;dy=-dy;}if(z.confuseUntil>now){const mag=Math.max(Math.abs(dx),Math.abs(dy)),pick=Math.floor(Math.random()*4);dx=[mag,-mag,0,0][pick];dy=[0,0,mag,-mag][pick];}const speed=(z.slowUntil>now ? 0.55 : 1)*(z.hasteUntil>now ? 1.55 : 1);dx*=speed;dy*=speed;
  const nx=zoneClamp(z.x+dx),ny=zoneClamp(z.y+dy),wall=zoneObjects(l).find(o=>o.kind==="wall"&&Math.abs(nx-o.x)<o.w/2+3&&Math.abs(ny-o.y)<o.h/2+4);
  if(wall){z.event="🪨 前方有障礙物";toast(z.event,true);return false;}
  if((z.eventUntil||0)<=now){z.event="";z.eventUntil=0;}z.x=nx;z.y=ny;z.answer=zoneLetterAt(z.x,z.y);
  zoneObjects(l).filter(o=>o.kind!=="wall"&&!z.used[o.id]&&zoneDist(z.x,z.y,o.x,o.y)<=o.r).forEach(o=>{z.used[o.id]=Date.now();const blocked=o.tone==="bad"&&z.shield;if(blocked){z.shield=false;z.event="🛡️ 護盾抵銷了負面道具";toast(z.event);return;}if(o.kind==="bomb"){let hit=0;state.students.forEach(v=>{const vz=zoneAnswerState(v,l);if(zoneDist(vz.x,vz.y,o.x,o.y)>13||vz.quizHp<=0)return;const dmg=Math.max(1,Math.round(vz.quizMaxHp*.3));vz.quizHp=Math.max(0,vz.quizHp-dmg);vz.event="💥 爆炸範圍傷害 -"+dmg+(vz.quizHp<=0?"，原地倒下":"");vz.updatedAt=Date.now();hit++;});z.event="💥 炸彈爆炸，波及 "+hit+" 人"+(z.quizHp<=0?"；你已原地倒下":"");toast(z.event,true);}else if(o.kind==="med"){const heal=Math.max(1,Math.round(z.quizMaxHp*.3)),got=Math.min(heal,z.quizMaxHp-z.quizHp);z.quizHp=Math.min(z.quizMaxHp,z.quizHp+heal);z.event="➕ 醫療包回復 "+got+" 體力";toast(z.event);}else if(o.kind==="haste"){z.hasteUntil=Date.now()+5000;z.event="⚡ 加速 5 秒";toast(z.event);}else if(o.kind==="shield"){z.shield=true;z.event="🛡️ 可抵銷一次負面道具";toast(z.event);}else if(o.kind==="bonus"){l.endsAt+=3000;z.event="⏱️ 全場答題時間 +3 秒";toast(z.event);}else if(o.kind==="coin"){const gain=3;z.itemGold=Math.min(12,(Number(z.itemGold)||0)+gain);z.event="🪙 發光金幣 +"+gain+"（結算後獲得）";toast(z.event);}else if(o.kind==="slow"){z.slowUntil=Date.now()+5000;z.event="🐌 緩速 5 秒";toast(z.event,true);}else if(o.kind==="reverse"){z.reverseUntil=Date.now()+5000;z.event="↔️ 方向反轉 5 秒";toast(z.event,true);}else if(o.kind==="confuse"){z.confuseUntil=Date.now()+5000;z.event="🌀 混亂移動 5 秒";toast(z.event,true);}});
  if(z.event)z.eventUntil=Math.max(Number(z.eventUntil)||0,Date.now()+2400);z.updatedAt=Date.now();syncZoneStudent(s,false);return true;
}

function zoneObjectsHtml(s,l){const z=s?zoneAnswerState(s,l):null;return zoneObjects(l).filter(o=>!z||!z.used[o.id]||o.kind==="wall").map(o=>o.kind==="wall"?'<div class="zone-object wall" data-zone-object="'+esc(o.id)+'" style="left:'+o.x+'%;top:'+o.y+'%;width:'+o.w+'%;height:'+o.h+'%">'+o.icon+'</div>':'<div class="zone-object '+o.kind+' '+(o.tone||'neutral')+'" data-zone-object="'+esc(o.id)+'" style="left:'+o.x+'%;top:'+o.y+'%" title="'+esc(o.kind)+'">'+o.icon+'</div>').join("");}

function bindZoneCountdown(){
  clearInterval(zoneCountdownTimer);const l=state.lesson;if(!l||!l.active||l.mode!=="zone"||l.locked)return;
  const tick=()=>{const cur=state.lesson;if(!cur||!cur.active||cur.questionId!==l.questionId){clearInterval(zoneCountdownTimer);return;}const now=Date.now(),elapsed=now-(cur.startedAt||now),preparing=now<(cur.readyUntil||0);let countText="";if(elapsed<1000)countText="3";else if(elapsed<2000)countText="2";else if(elapsed<3000)countText="1";else if(elapsed<4000)countText="GO!";document.querySelectorAll(".zone-start-countdown").forEach(el=>{el.textContent=countText;el.classList.toggle("show",!!countText);el.classList.toggle("go",countText==="GO!");});const total=Math.max(1000,(cur.durationSec||10)*1000),left=preparing?total:Math.max(0,(cur.endsAt||0)-now),pct=preparing?100:Math.max(0,Math.min(100,left/total*100)),fill=pct>55?"#ffd234":pct>25?"#ff8b2d":"#ef3838";document.querySelectorAll(".zone-timer>i").forEach(el=>{el.style.width=pct+"%";el.style.backgroundColor=fill;});document.querySelectorAll(".zone-timer>span").forEach(el=>el.textContent=preparing?"準備！":(left/1000).toFixed(1)+" 秒");document.querySelectorAll(".zone-submit-progress").forEach(el=>{el.style.setProperty("--quiz-time",pct+"%");el.style.setProperty("--quiz-fill",fill);});if(!preparing&&left<=0){clearInterval(zoneCountdownTimer);cur.locked=true;save();render();toast("⏰ 時間到，答案已鎖定！");}};
  tick();zoneCountdownTimer=setInterval(tick,100);
}

function zoneBattleSkill(s){const id=(normalizeSkillLoadout(s)||[])[0],def=id&&skillDef(s.job,id);return def?{id,name:def.name,icon:def.icon||"✨"}:{id:"basic_skill",name:"職業技",icon:"✨"};}

function zoneBattleAction(s,kind){
  const l=state.lesson,z=zoneAnswerState(s,l),now=Date.now();if(!l||l.locked||l.quizMode!=="battle"||z.quizHp<=0)return false;
  if(now<(l.readyUntil||0)){toast("準備倒數中，GO！之後才能攻擊",true);return false;}
  const isSkill=kind==="skill",ready=Number(z[isSkill?"skillReadyAt":"attackReadyAt"]||0);if(now<ready){toast("技能冷卻中，還要 "+((ready-now)/1000).toFixed(1)+" 秒",true);return false;}
  const targets=state.students.filter(t=>t.id!==s.id).map(t=>({s:t,z:zoneAnswerState(t,l)})).filter(t=>t.z.quizHp>0).map(t=>({...t,d:zoneDist(z.x,z.y,t.z.x,t.z.y)})).sort((a,b)=>a.d-b.d),target=targets[0];
  if(!target||target.d>(isSkill?32:22)){toast("⚠️ 範圍內沒有對手，請先靠近",true);return false;}
  const st=totalStats(s),skill=zoneBattleSkill(s),dmg=Math.max(5,Math.round(isSkill?(st.atk+st.int)*.42:st.atk*.36));target.z.quizHp=Math.max(0,target.z.quizHp-dmg);target.z.event=(isSkill?skill.icon+skill.name:"⚔️ 普攻")+"受到 "+dmg+" 傷害"+(target.z.quizHp<=0?"，原地倒下":"");target.z.updatedAt=now;z[isSkill?"skillReadyAt":"attackReadyAt"]=now+(isSkill?5000:1800);z.event=(isSkill?skill.icon+" 施放 "+skill.name:"⚔️ 發動普攻")+" → "+target.s.name;z.updatedAt=now;syncZoneStudent(s,true);save();toast(z.event);return true;
}

function zoneBuzz(s){
  const l=state.lesson,z=zoneAnswerState(s,l),now=Date.now();
  if(!l||!l.active||l.mode!=="zone"||l.quizMode!=="buzzer"||l.locked||z.quizHp<=0)return false;
  if(now<(l.readyUntil||0)){toast("GO！之後才能搶答",true);return false;}
  if(!z.answer){toast("請先移動到答案區",true);return false;}
  if(l.buzzerWinner){toast("已由 "+l.buzzerWinner.name+" 搶到答題權",true);return false;}
  z.confirmed=true;z.updatedAt=now;l.buzzerWinner={sid:s.id,name:s.name,answer:z.answer,at:now};l.buzzerStoppedAt=now;l.buzzerRemainingMs=Math.max(0,(Number(l.endsAt)||now)-now);l.locked=true;clearInterval(zoneCountdownTimer);syncZoneStudent(s,true);save();render();toast("🚨 "+s.name+" 搶答成功，倒數已停止："+z.answer);return true;
}

function teacherQuestionRows(){
  const rows=Array.isArray(state.teacherQuestions)?state.teacherQuestions:[],groups=new Map();
  rows.forEach(q=>{const key=[q.grade,q.vol,q.chap,q.unit,q.topic].map(x=>String(x||"")).join("|");if(!groups.has(key))groups.set(key,{grade:q.grade||"自訂",vol:q.vol||"自訂",sem:q.sem||"",cn:q.cn||"",chap:q.chap||"教師題庫",unit:q.unit||"自訂單元",topic:q.topic||"自訂主題",custom:true,qs:[]});const ans=String(q.correct||"A").toUpperCase(),idx=Math.max(0,"ABCD".indexOf(ans));groups.get(key).qs.push({id:q.id,q:q.q,opts:(q.opts||[]).slice(0,4),ans:(q.opts||[])[idx]||"",sol:q.sol||"",questionImage:q.questionImage||"",optionImages:(q.optionImages||[]).slice(0,4)});});
  return [...groups.values()];
}

function lessonQuestionBank(){return (Array.isArray(window.CLASS_RPG_QUESTION_BANK)?window.CLASS_RPG_QUESTION_BANK:[]).concat(teacherQuestionRows());}

function quizImageSrc(v){v=String(v||"").trim();return /^(data:image\/(png|jpe?g|gif|webp);base64,|https?:\/\/|\.\.?\/|\/)/i.test(v)?v:"";}

function quizImageHtml(v,cls,alt){const src=quizImageSrc(v);return src?'<img class="'+(cls||"quiz-media")+'" src="'+esc(src)+'" alt="'+esc(alt||"題目圖片")+'" loading="lazy">':"";}

function openQuizImage(src,alt){
  src=quizImageSrc(src);if(!src)return;
  const ov=document.createElement("div");ov.className="quiz-image-overlay";ov.setAttribute("role","dialog");ov.setAttribute("aria-label",alt||"放大圖片");
  ov.innerHTML='<img src="'+esc(src)+'" alt="'+esc(alt||"題目圖片")+'">';ov.onclick=()=>ov.remove();document.body.appendChild(ov);
}

function zipJoin(base,target){const p=(base.replace(/[^/]+$/,"")+target).split("/"),out=[];p.forEach(x=>{if(!x||x===".")return;if(x==="..")out.pop();else out.push(x);});return out.join("/");}

async function extractTeacherBankImages(buffer){
  const out=new Map();if(!window.JSZip)return out;
  try{const zip=await JSZip.loadAsync(buffer),sheetPath="xl/worksheets/sheet1.xml",relsPath="xl/worksheets/_rels/sheet1.xml.rels",relsFile=zip.file(relsPath);if(!relsFile)return out;const parse=s=>new DOMParser().parseFromString(s,"application/xml"),rels=parse(await relsFile.async("string")),drawingRel=[...rels.getElementsByTagName("Relationship")].find(x=>/\/drawing$/i.test(x.getAttribute("Type")||""));if(!drawingRel)return out;const drawingPath=zipJoin(sheetPath,drawingRel.getAttribute("Target")||""),drawingFile=zip.file(drawingPath);if(!drawingFile)return out;const drawing=parse(await drawingFile.async("string")),drawingRelsPath=drawingPath.replace(/([^/]+)$/,"_rels/$1.rels"),drawingRelsFile=zip.file(drawingRelsPath);if(!drawingRelsFile)return out;const drawingRels=parse(await drawingRelsFile.async("string")),targets={};[...drawingRels.getElementsByTagName("Relationship")].forEach(x=>targets[x.getAttribute("Id")]=zipJoin(drawingPath,x.getAttribute("Target")||""));for(const a of [...drawing.getElementsByTagNameNS("*","twoCellAnchor"),...drawing.getElementsByTagNameNS("*","oneCellAnchor")]){const from=a.getElementsByTagNameNS("*","from")[0],blip=a.getElementsByTagNameNS("*","blip")[0];if(!from||!blip)continue;const row=Number(from.getElementsByTagNameNS("*","row")[0]?.textContent),col=Number(from.getElementsByTagNameNS("*","col")[0]?.textContent),rid=blip.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","embed")||blip.getAttribute("r:embed"),media=zip.file(targets[rid]);if(!media)continue;const bytes=await media.async("uint8array");if(bytes.length>320000)continue;const ext=(targets[rid].split(".").pop()||"png").toLowerCase(),mime=ext==="jpg"||ext==="jpeg"?"image/jpeg":ext==="gif"?"image/gif":ext==="webp"?"image/webp":"image/png",b64=await media.async("base64");out.set(row+":"+col,"data:"+mime+";base64,"+b64);}}catch(e){console.warn("extract xlsx images",e);}return out;
}

function normalizeTeacherBankRow(row,index){
  const val=(...keys)=>{for(const k of keys)if(row[k]!=null&&String(row[k]).trim()!=="")return String(row[k]).trim();return "";},enabled=val("啟用","使用");
  if(/^(否|0|false|no)$/i.test(enabled))return null;
  const questionImage=quizImageSrc(val("題目圖片","題目圖片網址")),optionImages=["A","B","C","D"].map(k=>quizImageSrc(val(k+"圖片",k+"選項圖片",k+"圖片網址"))),rawOpts=[val("A選項","選項A","A"),val("B選項","選項B","B"),val("C選項","選項C","C"),val("D選項","選項D","D")],correct=val("正確答案","答案").toUpperCase().replace(/[^ABCD]/g,"").slice(0,1);
  let q=val("題目","問題");if(!q&&questionImage)q="請看圖片選擇正確答案";
  if(!q||rawOpts.some((x,i)=>!x&&!optionImages[i])||!correct)return null;
  const opts=rawOpts.map((x,i)=>x||(optionImages[i]?"圖片選項 "+String.fromCharCode(65+i):""));
  return {id:"TQ"+Date.now()+"_"+index,grade:val("年級")||"自訂",vol:val("冊別","冊")||"自訂",sem:val("學期"),cn:val("章次"),chap:val("章節","章")||"教師題庫",unit:val("單元")||"自訂單元",topic:val("主題")||"自訂主題",q,opts,correct,sol:val("解析","說明"),questionImage,optionImages};
}

async function importTeacherQuestionBank(file){
  if(!file)return;if(!window.XLSX){toast("Excel 讀取元件尚未載入，請確認網路後再試",true);return;}
  try{const buffer=await file.arrayBuffer(),wb=XLSX.read(buffer,{type:"array"}),ws=wb.Sheets[wb.SheetNames[0]],raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:""}),headerIndex=raw.findIndex(r=>r.some(v=>String(v).trim()==="題目")&&r.some(v=>String(v).trim()==="正確答案"));if(headerIndex<0)throw new Error("找不到『題目』與『正確答案』欄位");const headers=raw[headerIndex].map(v=>String(v).trim()),embedded=/\.xlsx$/i.test(file.name)?await extractTeacherBankImages(buffer):new Map(),objects=raw.slice(headerIndex+1).map((r,ri)=>({r,rowIndex:headerIndex+1+ri})).filter(x=>x.r.some(v=>String(v).trim()!=="")||[...embedded.keys()].some(k=>k.startsWith(x.rowIndex+":"))).map(x=>{const obj=Object.fromEntries(headers.map((h,i)=>[h,x.r[i]]));headers.forEach((h,i)=>{const pic=embedded.get(x.rowIndex+":"+i);if(pic)obj[h]=pic;});return obj;}),valid=objects.map(normalizeTeacherBankRow).filter(Boolean),invalid=objects.length-valid.length;if(!valid.length)throw new Error("沒有可匯入的有效題目");const existing=new Set((state.teacherQuestions||[]).map(q=>[q.grade,q.vol,q.chap,q.unit,q.topic,q.q].join("|")));let added=0;valid.forEach(q=>{const k=[q.grade,q.vol,q.chap,q.unit,q.topic,q.q].join("|");if(!existing.has(k)){state.teacherQuestions.push(q);existing.add(k);added++;}});addLog("-","📚 教師題庫匯入 "+added+" 題");save();render();toast("📚 匯入完成：新增 "+added+" 題"+(invalid?"，略過 "+invalid+" 列":"")+(embedded.size?"，已讀取 "+embedded.size+" 張儲存格圖片":""));}catch(err){console.error(err);toast("題庫匯入失敗："+(err&&err.message||err),true);}
}

function teacherQuestionBank(){
  const rows=state.teacherQuestions||[],topics=teacherQuestionRows(),preview=rows.slice(-30).reverse();
  return '<section class="panel"><h2>📚 教師題庫系統</h2><p class="mini">支援純文字、題目圖片與 A～D 圖片選項。圖片可填網址／網站相對路徑，或在 .xlsx 的圖片欄儲存格直接貼圖（單張上限約 320KB）。</p><div class="teacher-bank-tools"><div class="teacher-bank-card"><h3>1　下載 Excel 範本</h3><p class="mini">範本含圖片欄、欄位說明、下拉選單與範例題。</p><a class="btn gold" href="'+TEACHER_BANK_TEMPLATE_URL+'" download>⬇️ 下載題庫範本</a></div><div class="teacher-bank-card"><h3>2　匯入題庫</h3><label class="teacher-bank-drop">📥 點此選取 Excel／CSV<input id="teacherBankImport" type="file" accept=".xlsx,.xls,.csv" style="margin-top:8px"></label></div><div class="teacher-bank-card"><h3>3　題庫摘要</h3><div class="teacher-bank-summary"><span>'+rows.length+' 題</span><span>'+topics.length+' 個主題</span></div><button class="btn danger" id="teacherBankClear"'+(rows.length?'':' disabled')+'>清除自訂題庫</button></div></div>'
    +(preview.length?'<div style="overflow:auto;margin-top:14px"><table class="teacher-bank-table"><thead><tr><th>年級／冊別</th><th>單元主題</th><th>題目</th><th>答案</th><th></th></tr></thead><tbody>'+preview.map(q=>'<tr><td>'+esc(q.grade+'／'+q.vol)+'</td><td>'+esc(q.unit+'｜'+q.topic)+'</td><td>'+esc(q.q)+'</td><td><b>'+esc(q.correct)+'</b></td><td><button class="btn danger" data-bankdel="'+esc(q.id)+'">刪除</button></td></tr>').join("")+'</tbody></table></div>':'<div class="empty" style="margin-top:14px">尚未匯入自訂題庫；內建題庫仍可正常使用。</div>')+'</section>';
}

function quizGeometrySvgSafe(value){
  const s=String(value||"").trim();
  return /^<svg[\s>]/i.test(s)&&s.length<=14000&&!/<\/?(?:script|foreignObject)|on\w+\s*=|javascript:/i.test(s)?s:"";
}

function quizGeometryQuestionParts(value){
  const raw=String(value||"").trim(),match=raw.match(/<svg[\s\S]*?<\/svg>/i),svg=match?quizGeometrySvgSafe(match[0]):"";
  const text=raw.replace(/<svg[\s\S]*?<\/svg>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();return{text,svg};
}

function quizGeometryHtml(value,extra){
  const svg=quizGeometrySvgSafe(value);return svg?'<div class="quiz-geometry '+esc(extra||"")+'">'+svg+'</div>':"";
}

function quizGeometryOptionHtml(value){
  const s=String(value||"").trim();let icon="";
  if(/^(正確|是|可以|成立)$/.test(s))icon="✓";else if(/^(錯誤|否|不可以|不成立)$/.test(s))icon="✕";
  else if(/平行/.test(s))icon="∥";else if(/垂直/.test(s))icon="⊥";else if(/全等/.test(s))icon="≅";else if(/相似/.test(s))icon="∼";
  else if(/銳角/.test(s))icon="△";else if(/直角/.test(s))icon="∟";else if(/鈍角/.test(s))icon="◢";
  else if(/圓柱|柱體/.test(s))icon="▣";else if(/圓錐|錐體/.test(s))icon="▲";else if(/球/.test(s))icon="●";
  return icon?'<i class="geo-option-icon" aria-hidden="true">'+icon+'</i>':"";
}

function quizGeometryVisual(row,q){
  const parts=quizGeometryQuestionParts(q&&q.q),qtext=parts.text,key=[row&&row.chap,row&&row.unit,row&&row.topic,qtext].map(x=>String(x||"")).join(" ");
  const nums=(qtext.match(/[-−]?\d+(?:\.\d+)?/g)||[]).map(n=>Number(n.replace("−","-"))),line="#18243c",blue="#5bb9ef",gold="#ffc93c",red="#f06b63",fill="#dff4ff";
  const wrap=(body,label)=>'<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+esc(label)+'"><rect x="2" y="2" width="316" height="166" rx="16" fill="#fffdf5" stroke="#111" stroke-width="4"/>'+body+'</svg>';
  let svg=parts.svg,prompt=parts.svg?qtext:"";
  const coord=key.match(/[（(]\s*([-−]?\d+)\s*[,，]\s*([-−]?\d+)\s*[)）]/);
  if(svg){/* 題庫已提供安全 SVG：保留原圖，題幹只顯示 SVG 外的文字，避免原始標籤成為亂碼。 */}else if(/座標|象限|坐標/.test(key)){
    const x=coord?Number(coord[1].replace("−","-")):3,y=coord?Number(coord[2].replace("−","-")):2,px=160+Math.max(-5,Math.min(5,x))*24,py=85-Math.max(-3,Math.min(3,y))*22;
    const grid=Array.from({length:11},(_,i)=>{const gx=40+i*24;return '<path d="M'+gx+' 18V151 M40 '+(19+i*13.2)+'H282" stroke="#d9e2ef" stroke-width="1"/>';}).join("");
    svg=wrap('<g>'+grid+'</g><path d="M35 85H290 M160 155V12" stroke="'+line+'" stroke-width="3"/><path d="M290 85l-10-6v12zM160 12l-6 10h12z" fill="'+line+'"/><circle cx="'+px+'" cy="'+py+'" r="10" fill="'+gold+'" stroke="'+line+'" stroke-width="4"/><text x="'+(px+13)+'" y="'+(py-10)+'" font-size="18" font-weight="900" fill="'+line+'">P('+x+', '+y+')</text><text x="278" y="105" font-size="16" font-weight="900">x</text><text x="172" y="24" font-size="16" font-weight="900">y</text>','座標平面上的點 P');prompt="觀察點 P，選出正確判斷。";
  }else if(/畢氏|直角三角/.test(key)){
    const a=Math.abs(nums[0])||3,b=Math.abs(nums[1])||4,c=Math.abs(nums[2])||5;
    svg=wrap('<polygon points="62,137 245,137 62,34" fill="'+fill+'" stroke="'+line+'" stroke-width="5"/><path d="M62 117h20v20" fill="none" stroke="'+gold+'" stroke-width="4"/><text x="42" y="90" font-size="20" font-weight="900" fill="'+blue+'">'+a+'</text><text x="145" y="158" font-size="20" font-weight="900" fill="'+blue+'">'+b+'</text><text x="158" y="75" font-size="24" font-weight="1000" fill="'+red+'">'+(/斜邊|求.*邊/.test(key)?'?':c)+'</text>','直角三角形與三邊標示');prompt="觀察直角三角形，求圖中的 ?。";
  }else if(/平行|同位角|內錯角|同側內角|截角/.test(key)&&!/立體圖形|柱體|錐體|球|多面體|展開圖/.test(key)){
    const angle=nums.find(n=>n>0&&n<180)||65;
    svg=wrap('<path d="M28 48H292 M28 124H292" stroke="'+line+'" stroke-width="7"/><path d="M82 154L222 16" stroke="'+red+'" stroke-width="7"/><path d="M37 38l15 10-15 10M63 38l15 10-15 10M240 114l15 10-15 10M266 114l15 10-15 10" fill="none" stroke="'+blue+'" stroke-width="4"/><path d="M193 48a30 30 0 0 0 13 23M102 101a30 30 0 0 0 14 23" fill="none" stroke="'+gold+'" stroke-width="5"/><text x="212" y="76" font-size="19" font-weight="900">'+angle+'°</text><text x="83" y="103" font-size="27" font-weight="1000" fill="'+red+'">?</text>','兩條平行線與截線的角度關係');prompt="觀察標記，選出正確的角度關係。";
  }else if(/全等|SSS|SAS|ASA|AAS|RHS/.test(key)&&!/立體圖形|柱體|錐體|球|多面體|展開圖/.test(key)){
    svg=wrap('<polygon points="30,137 130,137 78,31" fill="'+fill+'" stroke="'+line+'" stroke-width="5"/><polygon points="190,137 290,137 238,31" fill="#fff0d2" stroke="'+red+'" stroke-width="5"/><path d="M48 95l13 7M208 95l13 7M97 91l13-7M257 91l13-7" stroke="'+blue+'" stroke-width="5"/><path d="M30 117h20v20M190 117h20v20" fill="none" stroke="'+gold+'" stroke-width="4"/><text x="144" y="96" font-size="34" font-weight="1000" fill="'+red+'">≅</text>','兩個三角形的全等對應標記');prompt="比較對應標記，選出正確判斷。";
  }else if(/相似|比例線段|縮放/.test(key)){
    const k=nums.find(n=>n>1&&n<10)||2;
    svg=wrap('<polygon points="35,132 112,132 35,72" fill="'+fill+'" stroke="'+line+'" stroke-width="5"/><polygon points="165,132 292,132 165,34" fill="#fff0d2" stroke="'+red+'" stroke-width="5"/><path d="M35 146H112M165 146H292" stroke="'+blue+'" stroke-width="3"/><text x="61" y="163" font-size="17" font-weight="900">1</text><text x="217" y="163" font-size="17" font-weight="900">'+k+'</text><text x="129" y="84" font-size="28" font-weight="1000" fill="'+gold+'">∼</text>','兩個相似三角形與邊長比');prompt="比較相似圖形，選出正確答案。";
  }else if(/圓周角|圓心角|弦|切線|圓內接/.test(key)){
    const d=nums.find(n=>n>0&&n<=360)||80;
    svg=wrap('<circle cx="160" cy="87" r="63" fill="'+fill+'" stroke="'+line+'" stroke-width="5"/><path d="M160 87L160 24M160 87L220 108M100 108L160 24M100 108L220 108" fill="none" stroke="'+red+'" stroke-width="4"/><circle cx="160" cy="87" r="6" fill="'+line+'"/><path d="M160 60a27 27 0 0 1 25 36" fill="none" stroke="'+gold+'" stroke-width="5"/><text x="184" y="81" font-size="19" font-weight="900">'+d+'°</text><text x="94" y="126" font-size="25" font-weight="1000" fill="'+red+'">?</text>','圓心角與圓周角示意圖');prompt="觀察圓上的標記，選出正確判斷。";
  }else if(/扇形|弧長/.test(key)){
    const r=nums.find(n=>n>0&&n<30)||5,d=nums.find(n=>n>=30&&n<=360)||90;
    svg=wrap('<circle cx="160" cy="88" r="65" fill="none" stroke="#d8dee9" stroke-width="4" stroke-dasharray="7 6"/><path d="M160 88L160 23A65 65 0 0 1 225 88Z" fill="'+fill+'" stroke="'+blue+'" stroke-width="5"/><path d="M160 88H225" stroke="'+gold+'" stroke-width="4"/><text x="185" y="80" font-size="18" font-weight="900">r='+r+'</text><text x="146" y="66" font-size="18" font-weight="900" fill="'+red+'">'+d+'°</text>','扇形的半徑與圓心角');prompt="觀察扇形，選出正確答案。";
  }else if(/圓柱.*圓錐|柱體.*錐體|三大類|最大.*差別/.test(qtext)){
    svg=wrap('<path d="M22 47v77a40 12 0 0 0 80 0V47" fill="'+fill+'" stroke="'+line+'" stroke-width="4"/><ellipse cx="62" cy="47" rx="40" ry="12" fill="'+fill+'" stroke="'+line+'" stroke-width="4"/><path d="M160 25l-35 101a40 12 0 0 0 80 0Z" fill="#fff0d2" stroke="'+red+'" stroke-width="4"/><circle cx="262" cy="82" r="43" fill="'+fill+'" stroke="'+gold+'" stroke-width="4"/><text x="39" y="153" font-size="16" font-weight="900">柱體</text><text x="145" y="153" font-size="16" font-weight="900">錐體</text><text x="252" y="140" font-size="16" font-weight="900">球</text>','柱體錐體與球的外形比較');prompt="比較三類立體圖形，選出正確判斷。";
  }else if(/兩底面|兩個底面|圓柱|柱體/.test(qtext)){
    svg=wrap('<ellipse cx="160" cy="40" rx="65" ry="20" fill="'+fill+'" stroke="'+line+'" stroke-width="5"/><path d="M95 40v86a65 20 0 0 0 130 0V40" fill="#dff4ff88" stroke="'+line+'" stroke-width="5"/><ellipse cx="160" cy="126" rx="65" ry="20" fill="none" stroke="'+line+'" stroke-width="4" stroke-dasharray="7 5"/><path d="M160 40h65M239 40v86" stroke="'+red+'" stroke-width="4"/><text x="188" y="34" font-size="18" font-weight="900">r</text><text x="246" y="90" font-size="18" font-weight="900">h</text>','圓柱的底面半徑與高度');prompt="觀察柱體，選出正確判斷。";
  }else if(/只有一個底面|一個頂點|圓錐|錐體/.test(qtext)){
    svg=wrap('<path d="M160 20L87 132a73 19 0 0 0 146 0Z" fill="'+fill+'" stroke="'+line+'" stroke-width="5"/><ellipse cx="160" cy="132" rx="73" ry="19" fill="none" stroke="'+line+'" stroke-width="4" stroke-dasharray="7 5"/><path d="M160 20v112M160 132h73" stroke="'+red+'" stroke-width="4" stroke-dasharray="6 4"/><text x="168" y="76" font-size="18" font-weight="900">h</text><text x="194" y="126" font-size="18" font-weight="900">r</text>','錐體的底面半徑與高度');prompt="觀察錐體，選出正確判斷。";
  }else if(/到定點距離|球體|球的|球只/.test(qtext)){
    svg=wrap('<defs><radialGradient id="quizBall" cx="35%" cy="28%"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#8ed8ff"/><stop offset="1" stop-color="#3269a7"/></radialGradient></defs><circle cx="160" cy="85" r="66" fill="url(#quizBall)" stroke="'+line+'" stroke-width="5"/><ellipse cx="160" cy="85" rx="66" ry="22" fill="none" stroke="'+gold+'" stroke-width="4" stroke-dasharray="7 5"/><path d="M160 85h66" stroke="'+red+'" stroke-width="4"/><text x="190" y="78" font-size="19" font-weight="900">r</text>','球體與半徑');prompt="觀察球體，選出正確答案。";
  }else if(/正方體|多面體|展開圖|立體圖形/.test(key)){
    svg=wrap('<path d="M72 54l112-32 65 42-112 36zM72 54v75l65 35V100M137 164l112-36V64" fill="'+fill+'" stroke="'+line+'" stroke-width="5"/><circle cx="72" cy="54" r="7" fill="'+gold+'"/><circle cx="184" cy="22" r="7" fill="'+gold+'"/><circle cx="249" cy="64" r="7" fill="'+gold+'"/><text x="16" y="24" font-size="17" font-weight="900" fill="'+red+'">V 頂點　E 稜　F 面</text>','正方體的頂點稜與面');prompt="觀察立體圖形，選出正確判斷。";
  }else if(/平行四邊形|菱形|梯形|箏形|四邊形/.test(key)){
    svg=wrap('<polygon points="61,135 238,135 270,35 93,35" fill="'+fill+'" stroke="'+line+'" stroke-width="5"/><path d="M61 135L270 35M93 35L238 135" stroke="'+red+'" stroke-width="4" stroke-dasharray="7 5"/><circle cx="166" cy="85" r="7" fill="'+gold+'"/><path d="M104 35l14 8-14 8M204 127l14 8-14 8" fill="none" stroke="'+blue+'" stroke-width="4"/>','四邊形的邊與對角線標記');prompt="觀察四邊形標記，選出正確判斷。";
  }else if(/三角形|內角|外角|角平分線|中線|垂直平分線/.test(key)){
    const A=nums.find(n=>n>10&&n<150)||55,B=nums.find((n,i)=>i>0&&n>10&&n<150)||65,C=Math.max(10,180-A-B);
    svg=wrap('<polygon points="42,139 278,139 178,28" fill="'+fill+'" stroke="'+line+'" stroke-width="5"/><path d="M68 139a27 27 0 0 0-9-20M250 139a27 27 0 0 1 8-21M163 45a24 24 0 0 1 30 4" fill="none" stroke="'+gold+'" stroke-width="5"/><text x="65" y="126" font-size="18" font-weight="900">'+A+'°</text><text x="229" y="126" font-size="18" font-weight="900">'+B+'°</text><text x="176" y="66" font-size="24" font-weight="1000" fill="'+red+'">'+(/求|多少|？|\?/.test(key)?'?':C+'°')+'</text>','三角形的角度標記');prompt="觀察三角形標記，選出正確答案。";
  }
  return {svg:quizGeometrySvgSafe(svg),prompt:svg?(qtext.length<=38?qtext:(prompt||qtext)):""};
}

function bankQuestionPayload(row,qIndex){
  if(!row||!Array.isArray(row.qs)||!row.qs.length)return null;
  const i=Math.max(0,Math.min(row.qs.length-1,Number(qIndex)||0)),q=row.qs[i]||{},opts=Array.isArray(q.opts)?q.opts.slice(0,4):[];
  while(opts.length<4)opts.push("");
  let answerIndex=opts.findIndex(x=>String(x)===String(q.ans));if(answerIndex<0)answerIndex=0;
  const visual=quizGeometryVisual(row,q);
  return {title:String(row.topic||row.chap||"題庫挑戰"),prompt:String(visual.prompt||q.q||""),originalPrompt:String(q.q||""),visualSvg:visual.svg||"",options:opts,questionImage:quizImageSrc(q.questionImage),optionImages:(q.optionImages||[]).slice(0,4).map(quizImageSrc),correct:String.fromCharCode(65+answerIndex),solution:String(q.sol||""),source:"question-bank",bankRef:{vol:row.vol,grade:row.grade,sem:row.sem,cn:row.cn,chap:row.chap,unit:row.unit,topic:row.topic,qIndex:i}};
}

function findBankRow(ref){
  return lessonQuestionBank().find(r=>String(r.vol)===String(ref&&ref.vol)&&String(r.chap)===String(ref&&ref.chap)&&String(r.unit)===String(ref&&ref.unit)&&String(r.topic)===String(ref&&ref.topic));
}

function startNextBankQuestion(){
  const l=state.lesson||{},row=findBankRow(l.bankRef);if(!row){toast("找不到下一題的題庫資料",true);return;}
  const next=((Number(l.bankRef.qIndex)||0)+1)%row.qs.length,p=bankQuestionPayload(row,next);p.xp=l.xp;p.gold=l.gold;p.quizMode=l.quizMode;p.durationSec=l.durationSec||10;startZoneLesson(p);render();toast("📚 已發布同主題第 "+(next+1)+" 題");
}

function openLessonChallengeModal(){
  const bank=lessonQuestionBank(),hasBank=bank.length>0;
  const groups=[];let lastGroup="",unitOptions="";
  bank.forEach((r,i)=>{const g="第 "+r.vol+" 冊・第"+r.cn+"章 "+r.chap;if(g!==lastGroup){if(lastGroup)unitOptions+="</optgroup>";unitOptions+='<optgroup label="'+esc(g)+'">';groups.push(g);lastGroup=g;}unitOptions+='<option value="'+i+'">'+esc(r.unit+"｜"+r.topic)+'</option>';});if(lastGroup)unitOptions+="</optgroup>";
  modalHost.innerHTML='<div class="overlay" id="ovl"><div class="modal" style="max-width:620px"><h4>📣 發起課堂知識挑戰</h4>'
    +(hasBank?'<div class="lesson-bank-picker"><h5>📚 選擇本次課堂單元</h5><div class="lesson-bank-grid"><label>單元／主題<select id="lsBankUnit" style="font-size:15px;padding:10px">'+unitOptions+'</select></label><label>答題時間<select id="lsDuration" style="font-size:15px;padding:10px"><option value="10">10 秒</option><option value="15">15 秒</option><option value="20">20 秒</option><option value="30" selected>30 秒</option><option value="45">45 秒</option><option value="60">60 秒</option><option value="90">90 秒</option><option value="120">120 秒</option><option value="180">180 秒</option></select></label></div><div class="zone-mode-picker"><label><input type="radio" name="lsMode" value="peace" checked><span>🕊️ 和平模式<small>單純滑動角色到答案區，不生成障礙物或道具</small></span></label><label><input type="radio" name="lsMode" value="item"><span>🎁 道具模式<small>場地會出現障礙與正負道具，觸發效果顯示在確定按鈕</small></span></label><label><input type="radio" name="lsMode" value="buzzer"><span>🚨 搶答模式<small>GO！後站好答案區並按搶答，第一位鎖定全場</small></span></label><label><input type="radio" name="lsMode" value="offline"><span>🙋 無裝置模式<small>學生舉牌、站位或口答，由教師在大屏快速登記 A～D</small></span></label></div><div class="lesson-bank-status">按下開始後會先播放 3、2、1、GO！；倒數結束會自動鎖定。</div><div class="mini" style="margin-top:7px">共 '+groups.length+' 章、'+bank.length+' 個主題；含教師自訂題庫。</div></div>':'<div class="lesson-bank-picker"><b>⚠️ 題庫資料尚未載入</b><div class="mini">請確認 Lession/question-bank-data.js 已與主程式一起上傳。</div></div>')
    +'<div class="inline-form" style="justify-content:center"><button class="btn gold" id="lsBegin"'+(hasBank?'':' disabled')+'>🧭 開始出題</button><button class="btn" id="lsOpenCourse">📖 課程目錄</button><button class="btn" id="lsClose">取消</button></div></div></div>';
  if(hasBank){const unit=document.getElementById("lsBankUnit");unit.selectedIndex=0;document.getElementById("lsBegin").onclick=()=>{const row=bank[Number(unit.value)||0],idx=Math.floor(Math.random()*row.qs.length),p=bankQuestionPayload(row,idx),mode=(document.querySelector('input[name="lsMode"]:checked')||{}).value||"peace",seconds=Math.max(10,Math.min(180,+document.getElementById("lsDuration").value||30));p.xp=15;p.gold=3;p.quizMode=mode;p.durationSec=seconds;startZoneLesson(p);modalHost.innerHTML="";render();const names={item:"🎁 道具",peace:"🕊️ 和平",buzzer:"🚨 搶答",offline:"🙋 無裝置"};toast((names[mode]||names.peace)+"模式開始，"+seconds+" 秒內完成作答！");};}
  document.getElementById("lsOpenCourse").onclick=()=>window.open(COURSE_CATALOG_URL,"_blank","noopener");
  document.getElementById("lsClose").onclick=()=>modalHost.innerHTML="";
}

function startZoneLesson(payload){
  payload=payload||{};const opts=Array.isArray(payload.options)?payload.options.slice(0,4):[payload.A,payload.B,payload.C,payload.D];
  while(opts.length<4)opts.push("");
  const durationSec=Math.max(10,Math.min(180,+payload.durationSec||30)),startedAt=Date.now();
  const requestedMode=payload.quizMode==="battle"?"item":payload.quizMode,quizMode=["peace","item","buzzer","offline"].includes(requestedMode)?requestedMode:"peace",readyUntil=startedAt+4000;
  state.lesson={active:true,mode:"zone",quizMode,durationSec,readyUntil,endsAt:readyUntil+durationSec*1000,zoneObjects:quizMode==="item"?makeZoneObjects(startedAt):[],buzzerWinner:null,questionId:"ZQ"+startedAt,title:String(payload.title||"角色站位答題"),prompt:String(payload.prompt||payload.question||"請選擇正確答案"),originalPrompt:String(payload.originalPrompt||payload.prompt||payload.question||""),visualSvg:quizGeometrySvgSafe(payload.visualSvg),options:opts.map((x,i)=>String(x||String.fromCharCode(65+i))),questionImage:quizImageSrc(payload.questionImage),optionImages:(payload.optionImages||[]).slice(0,4).map(quizImageSrc),correct:String(payload.correct||"A").toUpperCase(),solution:String(payload.solution||""),bankRef:payload.bankRef||null,xp:Math.max(1,+payload.xp||15),gold:Math.max(0,+payload.gold||0),answered:{},locked:false,reveal:false,settled:false,startedAt,source:String(payload.source||"manual")};
  state.students.forEach(s=>{delete s.liveAnswer;zoneAnswerState(s,state.lesson);});
  addLog("-","🧭 發起角色站位答題「"+state.lesson.title+"」");save();return state.lesson;
}

function zoneModeLabel(mode){return ({battle:"🎁 道具模式",item:"🎁 道具模式",peace:"🕊️ 和平模式",buzzer:"🚨 搶答模式",offline:"🙋 無裝置模式"})[mode]||"🕊️ 和平模式";}

function offlineAnswerBoardHtml(l){
  if(l.quizMode!=="offline")return "";
  return '<div class="offline-answer-board"><div class="offline-answer-head"><b>🙋 教師快速登記</b><span class="mini">學生舉牌／站位／口答後，點姓名旁的 A～D；可重複點選修改。</span><button class="btn" id="offlineClear">清除全部</button></div><div class="offline-answer-grid">'+state.students.map(s=>{const z=zoneAnswerState(s,l);return '<div class="offline-student"><b>'+esc(s.name)+'</b>'+["A","B","C","D"].map(k=>'<button class="btn offline-pick '+(z.confirmed&&z.answer===k?'on':'')+'" data-offline-answer="'+esc(s.id)+'|'+k+'">'+k+'</button>').join("")+'</div>';}).join("")+'</div></div>';
}

function settleZoneLesson(correctIds,manual){
  const l=state.lesson;if(!l||l.mode!=="zone"||l.settled)return false;
  const winners=new Set((correctIds||[]).map(String));l.locked=true;l.reveal=true;l.settled=true;if(manual)l.offlineCorrect=[...winners];
  let correct=0,confirmed=0;
  state.students.forEach(s=>{
    const z=s.liveAnswer||{},buzzerSid=l.quizMode==="buzzer"&&l.buzzerWinner?String(l.buzzerWinner.sid||""):"",didAnswer=manual?winners.has(String(s.id)):(buzzerSid?String(s.id)===buzzerSid:(z.questionId===l.questionId&&z.confirmed)),isCorrect=manual?winners.has(String(s.id)):(didAnswer&&z.answer===l.correct);
    if(didAnswer)confirmed++;
    const itemGold=didAnswer?Math.max(0,Math.min(12,Number(z.itemGold)||0)):0;if(itemGold)creditGold(s,itemGold,"知識挑戰道具金幣",true);
    if(isCorrect){correct++;s.quizFeverStreak=(Number(s.quizFeverStreak)||0)+1;const streak=s.quizFeverStreak,multiplier=1+Math.floor(streak/3)*.25+(streak>=10?.25:0),xp=Math.round((Number(l.xp)||15)*multiplier);lessonAnswer(s.id,null,xp);if([3,6,9,10].includes(streak))addLog(s.id,"🔥 Fever 連對 "+streak+" 題，獎勵提升至 ×"+multiplier.toFixed(2));}else{s.quizFeverStreak=0;}
  });
  addLog("-",(manual?"🙋 無裝置人工點名結算：":"🧭 站位答題結算：")+correct+" 人答對"+(manual?"":"、"+confirmed+" 人作答"));save();modalHost.innerHTML="";render();toast("✨ 已發放本題獎勵："+correct+" 人答對");return true;
}

function openOfflineRewardPicker(){
  const l=state.lesson;if(!l||l.quizMode!=="offline"||l.settled)return;
  l.locked=true;l.reveal=true;save();render();
  const preselected=new Set(state.students.filter(s=>{const z=s.liveAnswer||{};return z.questionId===l.questionId&&z.confirmed&&z.answer===l.correct;}).map(s=>String(s.id)));
  modalHost.innerHTML='<div class="offline-reward-overlay" id="offlineRewardOverlay"><div class="offline-reward-head"><h2>✨ 點選本題答對的同學</h2><button class="btn" id="offlineRewardCancel">返回題目</button><div class="question">📚 '+esc(l.prompt||l.title||"課堂知識挑戰")+'　<span style="color:#a32424">正解 '+esc(l.correct||"")+'</span></div></div><div class="offline-reward-tools"><span class="offline-reward-count">已選 <b id="offlineRewardCount">'+preselected.size+'</b> 人</span><button class="btn" id="offlineRewardFromAnswer">依登記答案選取</button><button class="btn" id="offlineRewardAll">全選</button><button class="btn" id="offlineRewardClear">清除</button></div><div class="offline-reward-grid">'+state.students.map(s=>{const z=s.liveAnswer||{},picked=preselected.has(String(s.id));return '<button type="button" class="offline-reward-student'+(picked?' selected':'')+'" data-offline-reward="'+esc(s.id)+'">'+dollSVG(s,82)+'<b>'+esc(s.name)+'</b><small>'+(z.questionId===l.questionId&&z.confirmed?'登記 '+esc(z.answer):'尚未登記')+'</small></button>';}).join("")+'</div><div class="offline-reward-actions"><button class="btn" id="offlineRewardCancelBottom">取消</button><button class="btn gold" id="offlineRewardConfirm">🎁 發放給已選學生</button></div></div>';
  const cards=()=>[...modalHost.querySelectorAll("[data-offline-reward]")],update=()=>{const n=cards().filter(x=>x.classList.contains("selected")).length,el=document.getElementById("offlineRewardCount");if(el)el.textContent=n;};
  cards().forEach(b=>b.onclick=()=>{b.classList.toggle("selected");update();});
  const cancel=()=>{modalHost.innerHTML="";};document.getElementById("offlineRewardCancel").onclick=cancel;document.getElementById("offlineRewardCancelBottom").onclick=cancel;
  document.getElementById("offlineRewardAll").onclick=()=>{cards().forEach(x=>x.classList.add("selected"));update();};
  document.getElementById("offlineRewardClear").onclick=()=>{cards().forEach(x=>x.classList.remove("selected"));update();};
  document.getElementById("offlineRewardFromAnswer").onclick=()=>{cards().forEach(x=>x.classList.toggle("selected",preselected.has(String(x.dataset.offlineReward))));update();};
  document.getElementById("offlineRewardConfirm").onclick=()=>{const ids=cards().filter(x=>x.classList.contains("selected")).map(x=>x.dataset.offlineReward);if(!ids.length&&!confirm("目前沒有選取學生，仍要以 0 人答對完成結算嗎？"))return;settleZoneLesson(ids,true);};
}

function zoneBoardHtml(){
  const l=state.lesson||{},letters=["A","B","C","D"],correct=l.reveal?String(l.correct||"").toUpperCase():"";
  const counts=letters.map(k=>state.students.filter(s=>{const z=s.liveAnswer||{};return z.questionId===l.questionId&&z.confirmed&&z.answer===k;}).length);
  const zones=letters.map((k,i)=>'<div class="zone-area '+k.toLowerCase()+(correct===k?' correct':'')+'"><b>'+k+'</b><span class="zone-option-bg">'+quizImageHtml((l.optionImages||[])[i],"zone-option-img",k+" 選項圖片")+'<span>'+(l.visualSvg?quizGeometryOptionHtml((l.options||[])[i]):'')+esc((l.options||[])[i]||"")+'</span></span></div>').join("");
  const avatars=state.students.map(s=>{const z=zoneAnswerState(s,l),hp=Math.round(z.quizHp/z.quizMaxHp*100),streak=Number(s.quizFeverStreak)||0,fever=streak>=3?' zone-fever':'',lightning=streak>=10?' zone-lightning':'';return '<div class="zone-avatar '+(z.confirmed?'confirmed ':'')+(z.quizHp<=0?'zone-ko':'')+fever+lightning+'" style="left:'+z.x+'%;top:'+z.y+'%;--fever-speed:'+Math.max(.24,1.1-Math.min(streak,12)*.07)+'s" title="'+esc(s.name)+'・'+(z.answer||"待命")+'・HP '+Math.round(z.quizHp)+'">'+dollSVG(s,76)+'<span class="zone-hp"><i style="width:'+hp+'%"></i></span><span class="name">'+esc(s.name)+(z.confirmed?' ✓':'')+(streak>=3?' 🔥'+streak:'')+'</span></div>';}).join("");
  const timerText=l.quizMode==="buzzer"&&l.buzzerWinner?(Math.max(0,Number(l.buzzerRemainingMs)||0)/1000).toFixed(1):Number(l.durationSec||30).toFixed(1);
  return '<div class="zone-quiz-shell"><div class="zone-question'+(l.visualSvg?' has-geometry':'')+'"><b>'+esc(l.prompt||l.title)+'</b>'+quizGeometryHtml(l.visualSvg,"zone-geometry")+quizImageHtml(l.questionImage,"zone-question-img","題目圖片")+'<div class="zone-timer"><span>'+timerText+' 秒</span></div></div>'
    +'<div class="zone-stage"><div class="zone-cross-v"></div><div class="zone-cross-h"></div>'+zones+(l.quizMode==="offline"?'':zoneObjectsHtml(null,l))+'<div class="zone-wait">中央待命區</div>'+avatars+'<div class="zone-start-countdown">3</div>'+(l.buzzerWinner?'<div class="zone-buzzer-winner">🚨 '+esc(l.buzzerWinner.name)+' 搶到 '+esc(l.buzzerWinner.answer)+'</div>':'')+'</div>'
    +offlineAnswerBoardHtml(l)+'<div class="zone-quiz-controls"><span class="mini">'+zoneModeLabel(l.quizMode)+'・'+(l.locked?'🔒 已鎖定':'🟢 作答中')+'・已確認 '+counts.reduce((a,b)=>a+b,0)+' / '+state.students.length+'</span>'
    +'<button class="btn" id="zoneLock">'+(l.locked?'🔓 重新開放':'🔒 鎖定答案')+'</button><button class="btn gold" id="zoneReveal">'+(l.reveal?'🙈 隱藏答案':'👁 公布答案')+'</button><button class="btn gold" id="zoneSettle"'+(l.settled?' disabled':'')+'>✨ 結算獎勵</button>'+(l.bankRef?'<button class="btn course-next" id="zoneNext"'+(!l.settled?' disabled':'')+'>下一題 ▶</button>':'')+'<button class="btn danger" id="zoneEnd">結束本題</button></div>'
    +(l.reveal&&l.solution?'<div class="zone-solution"><b>📖 解題解析：</b>'+esc(l.solution)+'</div>':'')+'</div>';
}

function zoneStudentHtml(s,l){
  const z=zoneAnswerState(s,l),letters=["A","B","C","D"],zones=letters.map((k,i)=>'<div class="zone-area '+k.toLowerCase()+'"><b>'+k+'</b><span class="zone-option-bg">'+quizImageHtml((l.optionImages||[])[i],"zone-option-img",k+" 選項圖片")+'<span>'+(l.visualSvg?quizGeometryOptionHtml((l.options||[])[i]):'')+esc((l.options||[])[i]||"")+'</span></span></div>').join(""),ko=z.quizHp<=0,hp=Math.round(z.quizHp/z.quizMaxHp*100),preparing=Date.now()<(l.readyUntil||0),streak=Number(s.quizFeverStreak)||0;
  const status=l.settled?(z.answer===l.correct?'🎉 答對了！':'📖 正解是 '+l.correct+'，一起訂正吧'):(ko?(z.answer?'💫 體力歸零，固定在 '+z.answer+' 區，可確認目前答案':'💫 倒在中央待命區，本題無法作答'):(z.confirmed?'✅ 已確認 '+z.answer+'，等待老師公布':z.answer?'目前位於 '+z.answer+' 區，請確認答案':'位於中央待命區，請移動到答案區'));
  if(l.quizMode==="offline")return '<div class="panel zone-student"><h3>🙋 無裝置答題進行中</h3><div class="zone-touch-guide">請看教室大屏，以舉牌、站位或口頭方式回答；老師會替你登記。</div><div class="zone-start-countdown">3</div></div>';
  return '<div class="panel zone-student"><h3>🧭 '+esc(l.title||"角色站位答題")+'・'+zoneModeLabel(l.quizMode)+'</h3><div class="zone-touch-guide">☝️ 請按住場地並滑動角色；單點不會移動。確認答案後即鎖定，不能再更改位置。</div>'
    +'<div class="zone-student-map'+(z.confirmed?' answer-locked':'')+'"><div class="zone-cross-v"></div><div class="zone-cross-h"></div>'+zones+zoneObjectsHtml(s,l)+'<div class="zone-wait">待命</div><div class="zone-avatar '+(z.confirmed?'confirmed ':'')+(ko?'zone-ko':'')+(streak>=3?' zone-fever':'')+(streak>=10?' zone-lightning':'')+'" style="left:'+z.x+'%;top:'+z.y+'%;--fever-speed:'+Math.max(.24,1.1-Math.min(streak,12)*.07)+'s">'+dollSVG(s,72)+'<span class="zone-hp"><i style="width:'+hp+'%"></i></span><span class="name">'+esc(s.name)+' HP '+Math.round(z.quizHp)+(streak>=3?' 🔥'+streak:'')+'</span></div><div class="zone-start-countdown">3</div>'+(l.buzzerWinner?'<div class="zone-buzzer-winner">🚨 '+esc(l.buzzerWinner.name)+' 搶答</div>':'')+'</div>'
    +'<div class="zone-status">'+status+'</div>'+(l.reveal&&l.solution?'<div class="zone-solution" style="margin-top:8px"><b>📖 解題解析：</b>'+esc(l.solution)+'</div>':'')
    +(l.quizMode==="buzzer"?'<div class="zone-confirm"><button class="btn zone-buzz-button zone-submit-progress" id="zoneBuzz" style="--quiz-time:100%"'+(!z.answer||l.locked||ko||preparing?' disabled':'')+'><span class="zone-submit-label">🚨 搶答！'+(z.answer?'（'+z.answer+'）':'')+'</span></button></div>':'<div class="zone-confirm"><button class="btn gold zone-submit-progress" id="zoneConfirm" style="--quiz-time:100%"'+(!z.answer||l.locked||preparing||z.confirmed?' disabled':'')+'>'+zoneConfirmButtonContent(z,l)+'</button></div>')+'<div class="mini" style="text-align:center;margin-top:8px">'+(l.quizMode==="buzzer"?'站好答案區後按搶答；第一位成功者會鎖定全場。':'送出前請確認位置；按下確定後，本題不能再移動或更改答案。')+'</div></div>';
}

function zoneConfirmButtonContent(z,l){const notice=(l.quizMode==="item"||l.quizMode==="battle")&&z.event&&Date.now()<(z.eventUntil||0)?'<span class="zone-item-notice">🎁 '+esc(z.event)+'</span>':'';return notice+'<span class="zone-submit-label">'+(z.confirmed?'🔒 已送出答案 '+esc(z.answer):'✅ 確定答案 '+esc(z.answer||''))+'</span>';}

function zoneStudentQuestionBarHtml(l){
  return '<div class="zone-question student-zone-questionbar'+(l.visualSvg?' has-geometry':'')+'"><b>'+esc(l.prompt||l.title||"課堂知識挑戰")+'</b>'+quizGeometryHtml(l.visualSvg,"zone-geometry")+quizImageHtml(l.questionImage,"zone-question-img","題目圖片")+'</div>';
}

function paintZonePointerState(s,map){
  const l=state.lesson,z=zoneAnswerState(s,l),avatar=map.querySelector(".zone-avatar");if(!avatar)return;
  avatar.style.left=z.x+"%";avatar.style.top=z.y+"%";avatar.classList.toggle("zone-ko",z.quizHp<=0);avatar.classList.toggle("confirmed",!!z.confirmed);
  const hp=avatar.querySelector(".zone-hp>i");if(hp)hp.style.width=Math.max(0,Math.min(100,z.quizHp/z.quizMaxHp*100))+"%";
  const name=avatar.querySelector(".name");if(name)name.textContent=s.name+" HP "+Math.round(z.quizHp)+((Number(s.quizFeverStreak)||0)>=3?" 🔥"+s.quizFeverStreak:"");
  const status=document.querySelector(".student-zone-screen .zone-status");if(status)status.textContent=z.quizHp<=0?(z.answer?"💫 體力歸零，固定在 "+z.answer+" 區，可確認目前答案":"💫 倒在中央待命區，本題無法作答"):(z.answer?"目前位於 "+z.answer+" 區，請確認答案":"位於中央待命區，請繼續移動到答案區");
  map.querySelectorAll("[data-zone-object]").forEach(el=>{if(z.used&&z.used[el.dataset.zoneObject]&&!el.classList.contains("wall"))el.remove();});
  const confirm=document.getElementById("zoneConfirm");if(confirm){confirm.disabled=!z.answer||l.locked||z.confirmed||Date.now()<(l.readyUntil||0);confirm.innerHTML=zoneConfirmButtonContent(z,l);if(z.eventUntil>Date.now()){clearTimeout(map._zoneNoticeTimer);map._zoneNoticeTimer=setTimeout(()=>{if(document.body.contains(map))paintZonePointerState(s,map);},Math.max(60,z.eventUntil-Date.now()+30));}}
  const buzz=document.getElementById("zoneBuzz");if(buzz){buzz.disabled=!z.answer||l.locked||z.quizHp<=0||Date.now()<(l.readyUntil||0);buzz.textContent="🚨 搶答！"+(z.answer?"（"+z.answer+"）":"");}
}

function bindZonePointerMovement(s){
  const map=document.querySelector(".student-zone-screen .zone-student-map");if(!map)return;
  let active=false,moved=false,lastX=0,lastY=0,pointerId=null;
  map.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&e.button!==0)return;e.preventDefault();const z=zoneAnswerState(s,state.lesson);if(z.confirmed){toast("🔒 本題答案已送出，不能再移動",true);return;}active=true;moved=false;pointerId=e.pointerId;lastX=e.clientX;lastY=e.clientY;map.classList.add("is-dragging");try{map.setPointerCapture(pointerId);}catch(_){}});
  map.addEventListener("pointermove",e=>{if(!active||e.pointerId!==pointerId)return;e.preventDefault();const r=map.getBoundingClientRect(),dx=(e.clientX-lastX)/Math.max(1,r.width)*100,dy=(e.clientY-lastY)/Math.max(1,r.height)*100;if(Math.hypot(dx,dy)<.7)return;lastX=e.clientX;lastY=e.clientY;if(zoneMoveStudent(s,dx,dy)){moved=true;paintZonePointerState(s,map);}});
  const finish=e=>{if(!active||e.pointerId!==pointerId)return;e.preventDefault();active=false;map.classList.remove("is-dragging");try{map.releasePointerCapture(pointerId);}catch(_){}pointerId=null;if(!moved)toast("請按住場地並滑動角色；單點不會移動");};
  map.addEventListener("pointerup",finish);map.addEventListener("pointercancel",()=>{active=false;pointerId=null;map.classList.remove("is-dragging");});map.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();});
}

function bindZoneGestureLock(){
  const screen=document.querySelector(".student-zone-screen");if(!screen)return;const block=e=>{if(e.cancelable)e.preventDefault();};
  screen.addEventListener("contextmenu",block);screen.addEventListener("dragstart",block);screen.addEventListener("gesturestart",block,{passive:false});screen.addEventListener("gesturechange",block,{passive:false});screen.addEventListener("gestureend",block,{passive:false});screen.addEventListener("touchmove",e=>{if(!e.target.closest(".student-zone-questionbar"))block(e);},{passive:false});
}

function renderStudentZoneInterface(s,l){
  app.innerHTML='<section class="student-zone-screen" role="dialog" aria-modal="true" aria-label="課堂知識挑戰作答介面">'+zoneStudentQuestionBarHtml(l)+zoneStudentHtml(s,l)+'</section>';
  bindZoneCountdown();bindZoneGestureLock();bindZonePointerMovement(s);
  app.querySelectorAll("[data-zbattle]").forEach(b=>b.onclick=()=>{if(b.disabled)return;if(zoneBattleAction(s,b.dataset.zbattle==="skill"?"skill":"attack"))render();});
  const confirmBtn=document.getElementById("zoneConfirm");if(confirmBtn)confirmBtn.onclick=()=>{const current=state.lesson,z=zoneAnswerState(s,current);if(!current||current.locked||z.confirmed||!z.answer)return;z.confirmed=true;z.updatedAt=Date.now();syncZoneStudent(s,true);render();toast("🔒 已送出答案 "+z.answer+"，本題不能再移動");};
  const buzzBtn=document.getElementById("zoneBuzz");if(buzzBtn)buzzBtn.onclick=()=>zoneBuzz(s);
}
