/*
 * math-dungeon-network：Realtime Database 房間、玩家位置與共享世界同步。
 * 本檔只建立連線狀態與全域相容函式；介面會在相容 runtime 完成載入後才呼叫。
 */

/* ═══════════════════ Firebase 連線多人 ═══════════════════
   設計重點：本遊戲是回合制，玩家「走一步」才寫入一次 →
   單人每分鐘約 10~30 次寫入，免費方案（Spark）完全撐得住。

   資料結構：
     rooms/{code}/meta            房間資訊（樓層、建立時間）
     rooms/{code}/players/{uid}   每位學生：位置、職業、血量、統計
     rooms/{code}/world/{floor}/  共享世界：已開寶箱、已消滅的隊伍、門是否解鎖
*/
let FB={app:null,db:null,ready:false,room:'',uid:'',cfg:null,
        others:{},unsub:[],lastPush:0,err:''};

/* 把貼上的 firebaseConfig（JS 物件字面值）轉成合法 JSON */
function parseFbConfig(txt){
  txt=(txt||'').trim();
  if(!txt) throw new Error('沒有內容');
  const m=txt.match(/\{[\s\S]*\}/);
  if(!m) throw new Error('找不到設定物件（應該是一組大括號 { … }）');
  // 注意：不能直接用正規表示式去行註解 —— databaseURL 裡的 https:// 會被誤殺。
  // 改成逐字元掃描，字串內的內容一律保留。
  let body='', inStr=false, q='';
  const src=m[0];
  for(let i=0;i<src.length;i++){
    const ch=src[i], nx=src[i+1];
    if(inStr){
      body+=ch;
      if(ch==='\\\\'){ body+=nx; i++; continue; }
      if(ch===q){ inStr=false; if(q==="'") body=body.slice(0,-1)+'"'; }
      continue;
    }
    if(ch==='"'||ch==="'"){ inStr=true; q=ch; body+='"'; continue; }  // 統一成雙引號
    if(ch==='/'&&nx==='/'){ while(i<src.length&&src[i]!=='\n')i++; continue; }
    if(ch==='/'&&nx==='*'){ i+=2; while(i<src.length&&!(src[i]==='*'&&src[i+1]==='/'))i++; i++; continue; }
    body+=ch;
  }
  body=body
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g,'$1"$2":')   // 幫沒引號的鍵加引號
    .replace(/,(\s*[}\]])/g,'$1');                        // 去掉尾逗號
  let cfg;
  try{ cfg=JSON.parse(body); }
  catch(e){ throw new Error('格式解析失敗，請直接從 Firebase 主控台複製整段 firebaseConfig'); }
  if(!cfg.apiKey) throw new Error('缺少 apiKey');
  if(!cfg.databaseURL) throw new Error('缺少 databaseURL — 請確認已建立「Realtime Database」而非 Firestore');
  return cfg;
}
function loadScript(src){
  return new Promise((res,rej)=>{
    const el=document.createElement('script');
    el.src=src; el.onload=()=>res(); el.onerror=()=>rej(new Error('無法載入 Firebase SDK（請檢查網路）'));
    document.head.appendChild(el);
  });
}
async function fbConnect(cfg){
  if(!window.firebase){
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js');
  }
  if(!FB.app) FB.app=firebase.initializeApp(cfg);
  FB.db=firebase.database();
  FB.cfg=cfg; FB.ready=true;
  try{ localStorage.setItem('mathDungeonFB',JSON.stringify(cfg)); }catch(e){}
}
const roomCode=()=>{
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:4},()=>A[rand(A.length)]).join('');
};
const myRef=()=>FB.db.ref('rooms/'+FB.room+'/players/'+FB.uid);
const worldRef=()=>FB.db.ref('rooms/'+FB.room+'/world/'+fl);

/* 加入房間並開始同步 */
function fbJoin(code,cb){
  FB.room=code.toUpperCase();
  FB.uid='u'+Math.random().toString(36).slice(2,9);
  const me=myRef();
  me.set({name:S.name||'匿名',job:S.job||'geo',x:P.x,y:P.y,dir:P.dir,
    hp:S.hp,maxhp:S.maxhp,lv:S.lv,floor:fl,inBattle:0,
    dmg:0,chain:0,quizOk:0,quizTotal:0,ts:Date.now()});
  me.onDisconnect().remove();
  // 監聽其他玩家
  const pRef=FB.db.ref('rooms/'+FB.room+'/players');
  const h=pRef.on('value',snap=>{
    const v=snap.val()||{};
    FB.others={};
    for(const k in v) if(k!==FB.uid) FB.others[k]=v[k];
  },err=>{ FB.err=err.message; toast('連線錯誤：'+err.message,2600); });
  FB.unsub.push(()=>pRef.off('value',h));
  fbWatchWorld();
  fbWatchLost();
  duelWatchIncoming();
  fbPushDeck();
  cb&&cb();
}
/* 監聽共享世界狀態：誰開了寶箱、誰清掉了哪支隊伍 */
function fbWatchWorld(){
  if(!FB.ready||!FB.room)return;
  const wr=worldRef();
  const h=wr.on('value',snap=>{
    const w=snap.val()||{};
    if(w.props) for(const key in w.props){
      const [px,py]=key.split('_').map(Number);
      const pr=props.find(o=>o.x===px&&o.y===py);
      if(pr&&pr.alive&&pr.t!=='npc'&&pr.t!=='shrine'){ pr.alive=0; }
    }
    if(w.mobs) for(const id in w.mobs){
      const m=mobs.find(o=>o.id===+id);
      if(m&&m.alive) m.alive=0;
    }
    if(w.door&&!S.key){ S.key=true; updBar(); }
  },err=>{ FB.err=err.message; });
  FB.unsub.push(()=>wr.off('value',h));
}
/* 推送自己的位置（回合制：只有實際行動才寫入）*/
function fbPush(extra){
  if(!FB.ready||!FB.room)return;
  const now=Date.now();
  if(now-FB.lastPush<250 && !extra) return;   // 節流，避免動畫期間連寫
  FB.lastPush=now;
  const L=lead();
  try{
    myRef().update(Object.assign({
      name:S.name||'匿名',job:S.job||'geo',x:P.x,y:P.y,dir:P.dir,
      hp:S.hp,maxhp:S.maxhp,lv:S.lv,floor:fl,ts:now},extra||{}));
  }catch(e){}
}
function fbMarkProp(pr){
  if(!FB.ready||!FB.room)return;
  try{ worldRef().child('props/'+pr.x+'_'+pr.y).set(true); }catch(e){}
}
function fbMarkMobs(ids){
  if(!FB.ready||!FB.room)return;
  try{ const u={}; ids.forEach(i=>u['mobs/'+i]=true); worldRef().update(u); }catch(e){}
}
function fbMarkDoor(){
  if(!FB.ready||!FB.room)return;
  try{ worldRef().child('door').set(true); }catch(e){}
}
function fbLeave(){
  try{ if(FB.ready&&FB.room) myRef().remove(); }catch(e){}
  FB.unsub.forEach(f=>{try{f();}catch(e){}});
  FB.unsub=[]; FB.room=''; FB.others={};
}
const otherList=()=>Object.values(FB.others).filter(o=>o&&o.floor===fl);



