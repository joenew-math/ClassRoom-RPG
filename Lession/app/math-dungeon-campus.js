/* math-dungeon-campus.js
 * 校園地圖、配置保存／編輯、區域解鎖與檢查點進場。
 * 先載入 campus-data、state、classroom；由主 runtime 完成初始化後呼叫。
 * 依賴：S、CARDS/GEMS；overlay/$/hesc；saveChar/resetRun；
 * rebirthDepth/rebirthFloorLimit；classroomBankActive/dungeonActionQuestion/quizAsk；
 * loadFloor/backToDungeon/introScreen。載入本檔不讀取 DOM 或存檔。
 * 儲存格式：mathDungeonCampus = {v, edited, data}；學生存檔與題庫另行管理。
 */
"use strict";

let CAMPUS=null;
const CAMPUS_VER=3;                 // 每次更動預設配置就 +1
let campusEdited=false;
// 只接受班級教師視窗的即時授權；網址、學生啟動資料、離線角色都不能授權。
function canEditCampus(){
  try{
    const owner=window.opener;
    return !!(owner&&!owner.closed&&owner.location.origin===location.origin
      &&typeof owner.classRpgCanEditDungeonMap==='function'&&owner.classRpgCanEditDungeonMap(window));
  }catch(_){return false;}
}
function requireCampusEditor(){
  if(canEditCampus())return true;
  toast('只有教師可以編輯地圖；請由班級系統「任務 → 地下城地圖設定」開啟。',2600);
  return false;
}
function loadCampus(){
  try{
    const raw=localStorage.getItem('mathDungeonCampus');
    if(raw){
      const d=JSON.parse(raw);
      // 舊格式（純陣列）＝ 尚未加版本，視為過期直接換新
      if(Array.isArray(d)){ CAMPUS=CAMPUS_DEFAULT.map(b=>({...b})); campusEdited=false; return; }
      if(d&&Array.isArray(d.data)&&d.data.length===6){
        if(d.v===CAMPUS_VER || d.edited){    // 版本相符、或老師自己改過 → 沿用
          CAMPUS=d.data; campusEdited=!!d.edited; return;
        }
      }
    }
  }catch(e){}
  CAMPUS=CAMPUS_DEFAULT.map(b=>({...b}));   // 其餘情況一律使用最新預設
  campusEdited=false;
}
function saveCampus(userEdit){
  if(!requireCampusEditor())return false;
  if(userEdit) campusEdited=true;
  try{ localStorage.setItem('mathDungeonCampus',
    JSON.stringify({v:CAMPUS_VER,edited:campusEdited,data:CAMPUS})); }catch(e){}
}
/* 把校園設定套進區域資料（內容分配不變，只換名稱與樓層數）*/
function syncZones(){
  if(!CAMPUS) loadCampus();
  CAMPUS.forEach((b,i)=>{
    if(!ZONES[i])return;
    ZONES[i].n=b.n;
    ZONES[i].floors=12; // 校舍外觀樓層與課程地城進度分離；每冊固定 12 個冒險樓層
    ZONES[i].col=b.col||ZONES[i].col;
    ZONES[i].ic=b.ic||ZONES[i].ic;
    ZONES[i].rooms=b.rooms||[];
  });
}

/* ═══ 像素校園總覽圖 ═══ */
const CW=20, CH=14;
function drawCampus(cv){
  const g=cv.getContext('2d');
  const s=Math.floor(Math.min(cv.width/CW, cv.height/CH));
  const ox=Math.floor((cv.width-s*CW)/2), oy=Math.floor((cv.height-s*CH)/2);
  g.clearRect(0,0,cv.width,cv.height);
  // 地面：淡淡的柏油＋草地格紋
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){
    const alt=(x+y)&1;
    g.fillStyle=alt?'#1d2a1c':'#1a251a';
    g.fillRect(ox+x*s,oy+y*s,s,s);
  }
  // 裝飾
  for(const d of CAMPUS_DECO){
    const X=ox+d.x*s, Y=oy+d.y*s, W=d.w*s, H=d.h*s;
    if(d.t==='field'){
      g.fillStyle='#8a5a34'; g.fillRect(X,Y,W,H);
      g.strokeStyle='#e8d0a0'; g.lineWidth=2;
      g.strokeRect(X+s*0.3,Y+s*0.25,W-s*0.6,H-s*0.5);
      g.beginPath(); g.moveTo(X+W/2,Y+s*0.25); g.lineTo(X+W/2,Y+H-s*0.25); g.stroke();
    }
    if(d.t==='yard'){
      g.fillStyle='#2f4a2a'; g.fillRect(X,Y,W,H);
      for(let i=0;i<d.w;i++){ g.fillStyle='#3f6a35';
        g.fillRect(X+i*s+s*0.3,Y+s*0.25,s*0.4,s*0.4); }
    }
    if(d.t==='court'){                      // 網球場
      g.fillStyle='#2f6a4a'; g.fillRect(X,Y,W,H);
      g.strokeStyle='#dfe8ff'; g.lineWidth=2;
      g.strokeRect(X+s*0.2,Y+s*0.2,W-s*0.4,H-s*0.4);
      g.beginPath(); g.moveTo(X+s*0.2,Y+H/2); g.lineTo(X+W-s*0.2,Y+H/2); g.stroke();
    }
    if(d.t==='build'){                      // 非關卡建築（活動中心、幼兒園）
      g.fillStyle='#2a2438'; g.fillRect(X,Y,W,H);
      g.fillStyle='#5a5078'; g.fillRect(X,Y,W,Math.max(3,s*0.28));
      g.strokeStyle='#6f6490'; g.lineWidth=2; g.strokeRect(X,Y,W,H);
      for(let i=0;i<Math.max(2,d.w);i++){
        g.fillStyle='#8a7fb0';
        g.fillRect(X+s*0.25+i*(W-s*0.5)/Math.max(2,d.w), Y+s*0.5, s*0.25, s*0.3);
      }
    }
    if(d.t==='park'){                       // 停車場
      g.fillStyle='#232330'; g.fillRect(X,Y,W,H);
      g.strokeStyle='#5a5a70'; g.lineWidth=1.5;
      for(let i=1;i<d.w*2;i++){
        g.beginPath(); g.moveTo(X+i*(W/(d.w*2)),Y+s*0.15);
        g.lineTo(X+i*(W/(d.w*2)),Y+H-s*0.15); g.stroke();
      }
    }
    if(d.t==='pond'){                       // 水池
      g.fillStyle='#2a5a8a';
      g.beginPath(); g.ellipse(X+W/2,Y+H/2,W*0.45,H*0.4,0,0,Math.PI*2); g.fill();
      g.strokeStyle='#4a8aca'; g.lineWidth=2; g.stroke();
    }
    if(d.t==='gate'){
      g.fillStyle='#6a5aa0'; g.fillRect(X,Y+H*0.4,W,H*0.6);
      g.fillStyle='#a892e0'; g.fillRect(X,Y+H*0.25,W,H*0.2);
    }
    if(d.w>=2&&d.h>=1){
      g.fillStyle='#9fb8a0'; g.font='bold '+Math.max(7,s*0.36)+'px sans-serif';
      g.fillText(d.n, X+3, Y+H/2+4);
    }
  }
  // 建築物
  CAMPUS.forEach((b,i)=>{
    const open=zoneUnlocked(i), done=(S.cleared!==undefined&&S.cleared>=i);
    const X=ox+b.x*s, Y=oy+b.y*s, W=b.w*s, H=b.h*s;
    // 主體
    g.fillStyle=open?(done?'#2a3f22':'#2a2140'):'#181428';
    g.fillRect(X,Y,W,H);
    // 屋頂色帶
    g.fillStyle=open?b.col:'#3a3550';
    g.fillRect(X,Y,W,Math.max(3,s*0.3));
    // 窗戶：每層一排
    const fl=Math.max(1,b.floors|0);
    const rows=Math.min(fl,Math.floor((H-s*0.4)/(s*0.42)));
    for(let r2=0;r2<rows;r2++){
      const wy=Y+s*0.42+r2*((H-s*0.5)/rows);
      const cols=Math.max(2,Math.floor(b.w*1.6));
      for(let c2=0;c2<cols;c2++){
        const wx=X+s*0.22+c2*((W-s*0.44)/cols);
        g.fillStyle=open?'#ffe9a8':'#2a2438';
        g.fillRect(wx,wy,Math.max(2,s*0.2),Math.max(2,s*0.22));
      }
    }
    // 邊框
    g.strokeStyle=open?b.col:'#3a3550'; g.lineWidth=2;
    g.strokeRect(X,Y,W,H);
    // 標籤
    g.fillStyle=open?'#f3ecff':'#6f6490';
    g.font='bold '+Math.max(9,s*0.46)+'px sans-serif';
    g.fillText((open?'':'🔒')+b.short, X+4, Y+H-6);
    g.fillStyle=open?b.col:'#5a527a';
    g.font='bold '+Math.max(8,s*0.36)+'px sans-serif';
    g.fillText('12層', X+W-s*1.18, Y+H-6);
    if(done){ g.fillStyle='#8fe86a'; g.font='bold '+Math.max(9,s*0.5)+'px sans-serif';
      g.fillText('✓', X+W-s*0.85, Y+s*0.85); }
  });
  return {s,ox,oy};
}
function beginZoneRun(i,startFloor){
  // 金幣與「尚未花掉的」知識點都是單次冒險資源；永久強化本身仍保留。
  S.meta=S.meta||{souls:0,runs:0,totalQ:0,totalOk:0,perks:{}};
  S.zone=i;S.gold=0;S.meta.souls=0;saveChar();
  const maxStart=Math.max(0,rebirthFloorLimit(i)-1);
  const go=()=>{loadFloor(Math.max(0,Math.min(maxStart,startFloor|0)));backToDungeon();};
  if(classroomBankActive()){
    const q=dungeonActionQuestion(null);
    if(q){quizAsk(q,()=>go(),'地城入口 · 教師指定章節');return;}
  }
  go();
}
function zoneEntryScreen(i){
  const Z=ZONES[i],depth=rebirthDepth(i),limit=rebirthFloorLimit(i);
  const cp=Math.max(0,Math.min(limit-1,Number((S.zoneProgress||{})[Z.k])||0));
  overlay(`<div class="kicker">${hesc(Z.n)}</div><h1 style="color:${Z.col}">${Z.ic} 第 ${Z.vol} 冊冒險</h1>
    <div class="rank">輪迴深度 ${depth}・本輪開放至 ${limit}F / 共 ${Z.floors}F</div>
    <div class="desc">${hesc(Z.d)}<br><br><b>首次只能突破 1F；每成功完成一輪，下一輪才開放下一層。</b><br>本次進場金幣與未使用知識點會從 0 開始；輪迴神殿的永久強化會保留。<br>${classroomBankActive()?'<b>📚 進場第一題會優先使用教師指定章節。</b>':'目前使用同冊內建題庫；之後可匯入新的課程目錄題庫。'}</div>
    ${cp>0?`<button class="go" id="zoneContinue">從 ${cp+1}F 檢查點繼續</button>`:''}
    <button class="go" id="zoneStart">從 1F 開始</button>
    <button class="go" id="zoneBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回校園</button>`,null,el=>{
      if(el.id==='zoneContinue'){beginZoneRun(i,cp);return true;}
      if(el.id==='zoneStart'){beginZoneRun(i,0);return true;}
      if(el.id==='zoneBack'){setTimeout(()=>campusScreen(),10);return true;}
      return false;
    });
}
function campusScreen(msg){
  syncZones();
  overlay(`<div class="kicker">CAMPUS MAP</div><h1>校園地圖</h1>
    <div class="rank">已通關 ${(S.cleared===undefined?-1:S.cleared)+1} / ${ZONES.length} 棟</div>
    ${campusEdited?`<div class="shmsg" style="font-size:10px">目前使用<b>自訂配置</b>。
      ${canEditCampus()?'可到編輯器按「還原成範本」。':'地圖配置由教師管理。'}</div>`:''}
    ${msg?`<div class="shmsg">${msg}</div>`:''}
    <canvas id="campusCv" width="330" height="240"></canvas>
    <div class="desc" style="font-size:11px">點建築物進入。🔒 表示還沒開啟 —— 通關前一棟才會解鎖。<br>
      依<b>龍岡國中 115 學年度教室位置圖</b>建立。${canEditCampus()?'可用下方按鈕微調。':'配置由教師管理。'}</div>
    <div id="campusList"></div>
    ${canEditCampus()?'<button class="go" id="cpEdit" style="background:linear-gradient(180deg,#8fd0ff,#3f7fd0);border-color:#1a3a6a;color:#0a1030">✏ 編輯校園配置</button>':''}
    <button class="go" id="cpBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>`,
    null,el=>{
      if(el.id==='cpBack'){ setTimeout(introScreen,10); return true; }
      if(el.id==='cpEdit'){ setTimeout(()=>campusEdit(),10); return true; }
      const row=el.closest('.zrow');
      if(row){
        const i=+row.dataset.z;
        if(!zoneUnlocked(i)){ setTimeout(()=>campusScreen('這一棟還沒開啟 — 先通關前一棟。'),10); return true; }
        if(S.runOver){ delete S.runOver; resetRun(); }  // 輪迴後首次進場：重置＋補滿血
        setTimeout(()=>zoneEntryScreen(i),10);return true;
      }
      return false;
    });
  // 畫圖並綁定點擊
  const cv=$('campusCv');
  if(cv){
    const geo=drawCampus(cv);
    cv.onclick=e=>{
      const r=cv.getBoundingClientRect();
      const px=(e.clientX-r.left)*(cv.width/r.width);
      const py=(e.clientY-r.top)*(cv.height/r.height);
      const gx=Math.floor((px-geo.ox)/geo.s), gy=Math.floor((py-geo.oy)/geo.s);
      const i=CAMPUS.findIndex(b=>gx>=b.x&&gx<b.x+b.w&&gy>=b.y&&gy<b.y+b.h);
      if(i<0)return;
      if(!zoneUnlocked(i)){ campusScreen('「'+CAMPUS[i].n+'」還沒開啟 — 先通關前一棟。'); return; }
      zoneEntryScreen(i);
    };
  }
  // 文字清單（給不方便點小圖的情況）
  const list=$('campusList');
  if(list){
    list.innerHTML=CAMPUS.map((b,i)=>{
      const open=zoneUnlocked(i), done=(S.cleared!==undefined&&S.cleared>=i);
      const rec=(S.zoneBest||{})[ZONES[i].k];
      return `<div class="zrow${open?'':' locked'}${done?' done':''}" data-z="${i}"
        style="border-color:${open?b.col:'#3a2c60'}">
        <div class="zic" style="background:${b.col}22;color:${open?b.col:'#5a527a'}">${open?b.ic:'🔒'}</div>
        <div class="zinfo"><div class="zn" style="color:${open?b.col:'#6f6490'}">${b.n}
          <span class="zf">12 層地城 · 第 ${b.vol} 冊</span>
          ${done?'<span class="zdone">✓ 已通關</span>':''}</div>
          <div class="zd">${open?(b.rooms||[]).join('、'):'通關前一棟才會開啟'}</div>
          ${rec?`<div class="zrec">最佳：最長連擊 ${rec.chain}　${rec.turns} 回合</div>`:''}
        </div></div>`;
    }).join('');
  }
}
/* ═══ 校園配置編輯器 ═══ */
function campusEdit(sel){
  if(!requireCampusEditor())return;
  syncZones();
  const i=(sel===undefined?0:sel);
  const b=CAMPUS[i];
  overlay(`<div class="kicker">CAMPUS EDITOR</div><h1>✏ 編輯校園配置</h1>
    <div class="rank">第 ${i+1} / 6 棟　對應第 ${b.vol} 冊</div>
    <canvas id="editCv" width="330" height="240"></canvas>
    <div class="namebox"><label>棟名（例：忠孝樓、科學館）</label>
      <input id="edName" maxlength="10" value="${b.n}"></div>
    <div class="namebox"><label>地圖上的簡稱（2～3 字）</label>
      <input id="edShort" maxlength="4" value="${b.short}"></div>
    <div class="namebox"><label>校舍外觀樓層（1～9；不影響固定 12 層課程地城）</label>
      <input id="edFloors" type="number" min="1" max="9" value="${Math.max(1,Math.min(9,b.floors||3))}"></div>
    <div class="namebox"><label>主要教室（用、分隔）</label>
      <input id="edRooms" value="${(b.rooms||[]).join('、')}"></div>
    <div class="edgrid">
      <span class="edlbl">位置與大小</span>
      <span class="edbtn" data-mv="left">◀</span><span class="edbtn" data-mv="right">▶</span>
      <span class="edbtn" data-mv="up">▲</span><span class="edbtn" data-mv="down">▼</span>
      <span class="edbtn" data-mv="wider">寬 +</span><span class="edbtn" data-mv="narrow">寬 −</span>
      <span class="edbtn" data-mv="taller">高 +</span><span class="edbtn" data-mv="shorter">高 −</span>
    </div>
    <div class="desc" style="font-size:10px">目前：(${b.x}, ${b.y})　${b.w}×${b.h} 格</div>
    <button class="go" id="edSave">儲存這一棟</button>
    <div class="edtabs">${CAMPUS.map((x,j)=>
      `<span class="edtab${j===i?' on':''}" data-t="${j}">${x.short}</span>`).join('')}</div>
    <button class="go" id="edExport" style="background:linear-gradient(180deg,#8fd0ff,#3f7fd0);border-color:#1a3a6a;color:#0a1030">匯出／匯入配置</button>
    <button class="go" id="edDone" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">完成</button>`,
    null,el=>{
      if(!requireCampusEditor())return true;
      const save=()=>{
        b.n=($('edName').value||b.n).trim();
        b.short=($('edShort').value||b.short).trim();
        b.floors=Math.max(1,Math.min(9,parseInt($('edFloors').value)||b.floors));
        const rm=($('edRooms').value||'').split(/[、,，]/).map(x=>x.trim()).filter(Boolean);
        b.rooms=rm;
        saveCampus(true); syncZones();
      };
      if(el.id==='edDone'){ save(); setTimeout(()=>campusScreen('配置已儲存。'),10); return true; }
      if(el.id==='edSave'){ save(); setTimeout(()=>campusEdit(i),10); return true; }
      if(el.id==='edExport'){ save(); setTimeout(campusIO,10); return true; }
      const tab=el.closest('.edtab');
      if(tab){ save(); setTimeout(()=>campusEdit(+tab.dataset.t),10); return true; }
      const mv=el.closest('.edbtn');
      if(mv){
        const d=mv.dataset.mv;
        if(d==='left') b.x=Math.max(0,b.x-1);
        if(d==='right') b.x=Math.min(CW-b.w,b.x+1);
        if(d==='up') b.y=Math.max(0,b.y-1);
        if(d==='down') b.y=Math.min(CH-b.h,b.y+1);
        if(d==='wider') b.w=Math.min(CW-b.x,b.w+1);
        if(d==='narrow') b.w=Math.max(2,b.w-1);
        if(d==='taller') b.h=Math.min(CH-b.y,b.h+1);
        if(d==='shorter') b.h=Math.max(2,b.h-1);
        saveCampus(true);
        setTimeout(()=>campusEdit(i),10);
        return true;
      }
      return false;
    });
  const cv=$('editCv');
  if(cv){
    drawCampus(cv);
    // 標出正在編輯的那一棟
    const g=cv.getContext('2d');
    const s2=Math.floor(Math.min(cv.width/CW, cv.height/CH));
    const ox=Math.floor((cv.width-s2*CW)/2), oy=Math.floor((cv.height-s2*CH)/2);
    g.strokeStyle='#fff'; g.lineWidth=3; g.setLineDash([5,4]);
    g.strokeRect(ox+b.x*s2-2,oy+b.y*s2-2,b.w*s2+4,b.h*s2+4);
    g.setLineDash([]);
  }
}
function campusIO(){
  if(!requireCampusEditor())return;
  const code=JSON.stringify(CAMPUS);
  overlay(`<div class="kicker">CAMPUS I/O</div><h1>校園配置</h1>
    <div class="desc">複製這段可以在別台裝置還原相同的校園配置。</div>
    <textarea id="cpBox" readonly>${code}</textarea>
    <div class="namebox"><label>貼上配置以還原</label>
      <textarea id="cpIn" placeholder="貼上校園配置 JSON…"></textarea></div>
    <button class="go" id="cpLoad">套用</button>
    <button class="go" id="cpReset" style="background:linear-gradient(180deg,#e08a8a,#a03f3f);border-color:#5a1010">還原成範本</button>
    <button class="go" id="ok" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>`,
    ()=>campusEdit(0),el=>{
      if(!requireCampusEditor())return true;
      if(el.id==='cpReset'){
        CAMPUS=CAMPUS_DEFAULT.map(x=>({...x})); saveCampus(true); syncZones();
        setTimeout(()=>campusEdit(0),10); return true;
      }
      if(el.id!=='cpLoad')return false;
      try{
        const d=JSON.parse(($('cpIn').value||'').trim());
        if(!Array.isArray(d)||d.length!==6) throw new Error('必須是 6 棟的陣列');
        for(const b of d){ if(!b.n||!b.short) throw new Error('每一棟都需要 n 與 short'); }
        CAMPUS=d.map(x=>({...x})); saveCampus(true); syncZones();
        toast('校園配置已套用',1600);
        setTimeout(()=>campusEdit(0),10);
      }catch(e){ toast('格式錯誤：'+e.message,2200); }
      return true;
    });
}

const zoneOf=()=>ZONES[Math.min(S.zone||0,ZONES.length-1)];
const zoneUnlocked=i=>i<=(S.cleared===undefined?-1:S.cleared)+1;
/* 依已通關進度決定可取得的卡牌與寶石 */
function unlockedCards(){
  const out=[];
  for(let i=0;i<=Math.min((S.cleared||0)+1,ZONES.length-1);i++) out.push(...ZONES[i].cards);
  return out.filter(id=>CARDS[id]&&!CARDS[id].EVO);
}
function unlockedGems(){
  const out=[];
  for(let i=0;i<=Math.min((S.cleared||0)+1,ZONES.length-1);i++) out.push(...ZONES[i].gems);
  return out.filter(g=>GEMS[g]);
}

/* ═══ 地圖：區域選擇 ═══ */
function zoneScreen(msg){
  const rows=ZONES.map((z,i)=>{
    const open=zoneUnlocked(i);
    const done=(S.cleared!==undefined&&S.cleared>=i);
    const rec=(S.zoneBest||{})[z.k];
    return `<div class="zrow${open?'':' locked'}${done?' done':''}" data-z="${i}"
      style="border-color:${open?z.col:'#3a2c60'}">
      <div class="zic" style="background:${z.col}22;color:${open?z.col:'#5a527a'}">${open?z.ic:'🔒'}</div>
      <div class="zinfo">
        <div class="zn" style="color:${open?z.col:'#6f6490'}">${z.n}
          <span class="zf">${z.floors} 層 · 第 ${z.vol} 冊</span>
          ${done?'<span class="zdone">✓ 已通關</span>':''}</div>
        <div class="zd">${open?z.d:'通關前一個區域才會開啟'}</div>
        ${rec?`<div class="zrec">最佳：第 ${rec.floor} 層　最長連擊 ${rec.chain}　${rec.turns} 回合</div>`:''}
      </div></div>`;
  }).join('');
  const nUC=unlockedCards().length, nUG=unlockedGems().length;
  overlay(`<div class="kicker">WORLD MAP</div><h1>地圖</h1>
    <div class="rank">已通關 ${(S.cleared===undefined?-1:S.cleared)+1} / ${ZONES.length} 區</div>
    ${msg?`<div class="shmsg">${msg}</div>`:''}
    <div class="desc" style="margin-bottom:6px">
      通關一個區域才會開啟下一個。<b>已通關的區域可以重複進入複習</b>。<br>
      目前可取得 <b>${nUC}</b> 種卡牌、<b>${nUG}</b> 種寶石 —— 越深入解鎖越多。</div>
    <div id="zonelist">${rows}</div>
    <button class="go" id="zBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>`,
    null,el=>{
      if(el.id==='zBack'){ setTimeout(introScreen,10); return true; }
      const row=el.closest('.zrow'); if(!row) return false;
      const i=+row.dataset.z;
      if(!zoneUnlocked(i)){ setTimeout(()=>zoneScreen('這個區域還沒開啟 — 先通關前一區。'),10); return true; }
      if(S.runOver){ delete S.runOver; resetRun(); }    // 輪迴後首次進場：重置＋補滿血
      setTimeout(()=>zoneEntryScreen(i),10);
      return true;
    });
}
