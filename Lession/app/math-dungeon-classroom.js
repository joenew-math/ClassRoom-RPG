/* ═══════════════ 班級 RPG 自主複習橋接 ═══════════════
   與主系統同網域時，以 localStorage 傳入角色與作業；結算只回傳學習數據，
   XP／金幣由主系統的登入帳號與免費 Worker 計算，地城本身不能直接發獎。 */
const CLASSROOM_LAUNCH_KEY='classRpgDungeonLaunch';
const CLASSROOM_PENDING_KEY='classRpgDungeonPending';
let classroomLaunch=null,classroomSeq=0,classroomBase={q:0,ok:0},classroomPendingClear=null,classroomDeathReported=false;
const hesc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function classroomPendingList(){
  try{const a=JSON.parse(localStorage.getItem(CLASSROOM_PENDING_KEY)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}
}
function classroomWritePending(list){
  try{localStorage.setItem(CLASSROOM_PENDING_KEY,JSON.stringify((list||[]).slice(-12)));}catch(e){}
}
function classroomSyncText(text,kind){
  document.querySelectorAll('.classroom-sync').forEach(el=>{el.textContent=text;el.className='classroom-sync '+(kind||'');});
}
function classroomGradeMax(grade){return String(grade)==='七年級'?2:String(grade)==='八年級'?4:6;}
function classroomSigned(n){return n<0?'−'+Math.abs(n):'+'+n;}
function classroomNumberVariant(q,vol){
  if(q.fig)return q;
  const src=String(q.q||'').replace(/-/g,'−'),limit=Number(vol)<=2?15:Number(vol)<=4?30:60;
  let m=src.match(/^\s*\(([+−]?\d+)\)\s*([+−×÷])\s*\(([+−]?\d+)\)\s*=\s*\?/);
  if(m){
    const op=m[2],signed=()=>{let n=1+rand(limit);return Math.random()<.5?-n:n;};let a=signed(),b=signed(),ans=0;
    if(op==='÷'){b=(Math.random()<.5?-1:1)*(2+rand(Math.min(9,limit-1)));const quotient=(Math.random()<.5?-1:1)*(1+rand(Math.min(12,limit)));a=b*quotient;ans=quotient;}
    else if(op==='×')ans=a*b;else if(op==='+')ans=a+b;else ans=a-b;
    const correct=String(ans).replace('-', '−'),mix=shuf4(correct,[String(-ans).replace('-','−'),String(ans+1).replace('-','−'),String(ans-1).replace('-','−'),String(ans+(op==='×'?Math.abs(b):Math.abs(a))).replace('-','−')],g=>String(ans+g+2).replace('-','−'));
    return {...q,q:`(${classroomSigned(a)}) ${op} (${classroomSigned(b)}) = ?`,opts:mix.opts,ans:mix.ans,sol:`依 ${op==='×'||op==='÷'?'同號得正、異號得負':'整數運算'}規則計算，答案是 ${correct}。`,variant:true};
  }
  m=src.match(/\|\s*[−-]?\d+\s*\|/);
  if(m){const n=2+rand(limit),correct=String(n),mix=shuf4(correct,['−'+n,String(n*n),'0',String(n+1)],g=>String(n+g+1));return {...q,q:src.replace(m[0],`|−${n}|`),opts:mix.opts,ans:mix.ans,sol:`絕對值是到 0 的距離，所以 |−${n}| = ${n}。`,variant:true};}
  m=src.match(/(\d+)\/(\d+)\s*([+−])\s*(\d+)\/(\d+)/);
  if(m){const b=2+rand(7),d=2+rand(7),a=1+rand(b-1),c=1+rand(d-1),op=m[3],num=op==='+'?a*d+c*b:a*d-c*b,den=b*d,g=Math.abs(gcd(Math.abs(num),den))||1,cn=num/g,cd=den/g,correct=cd===1?String(cn):`${cn}/${cd}`,mix=shuf4(correct,[`${Math.abs(a+(op==='+'?c:-c))}/${b+d}`,`${Math.abs(num)}/${den}`,`${Math.abs(cn+1)}/${cd}`,`${Math.abs(cn)}/${cd+1}`],k=>`${Math.abs(cn)+k}/${cd}`);return {...q,q:`${a}/${b} ${op} ${c}/${d} = ?`,opts:mix.opts,ans:mix.ans,sol:`先通分成分母 ${den}，約分後得到 ${correct}。`,variant:true};}
  m=src.match(/x\s*[:：]\s*\d+\s*=\s*\d+\s*[:：]\s*\d+/i);
  if(m){const right=2+rand(7),left=1+rand(right-1),k=2+rand(7),base=right*k,ans=left*k,correct=String(ans),mix=shuf4(correct,[String(ans+left),String(ans-left),String(base),String(left+right)],n=>String(ans+n+1));return {...q,q:`解 x : ${base} = ${left} : ${right}，x 是多少？`,opts:mix.opts,ans:mix.ans,sol:`${right}x = ${base}×${left}，所以 x = ${ans}。`,variant:true};}
  if(/兩股為\s*\d+\s*和\s*\d+.*斜邊/.test(src)){const tri=[[3,4,5],[5,12,13],[6,8,10],[8,15,17],[7,24,25]][rand(5)],correct=String(tri[2]),mix=shuf4(correct,[String(tri[2]-1),String(tri[2]+1),String(tri[0]+tri[1]),String(Math.abs(tri[1]-tri[0]))],n=>String(tri[2]+n+1));return {...q,q:`直角三角形兩股為 ${tri[0]} 和 ${tri[1]}，斜邊是多少？`,opts:mix.opts,ans:mix.ans,sol:`√(${tri[0]}²+${tri[1]}²) = √${tri[2]*tri[2]} = ${tri[2]}。`,variant:true};}
  m=src.match(/\(x\s*\+\s*\d+\)\s*\(x\s*\+\s*\d+\)/i);
  if(m){const a=1+rand(8),b=1+rand(8),sum=a+b,product=a*b,correct=`x²+${sum}x+${product}`,mix=shuf4(correct,[`x²+${product}x+${sum}`,`x²+${sum}x+${sum}`,`x²+${product}`,`x²−${sum}x+${product}`],n=>`x²+${sum+n}x+${product+n}`);return {...q,q:`(x+${a})(x+${b}) 展開後是？`,opts:mix.opts,ans:mix.ans,sol:`中間項係數 ${a}+${b}=${sum}，常數項 ${a}×${b}=${product}。`,variant:true};}
  m=src.match(/^\s*(\d+)x\s*\+\s*(\d+)\s*=\s*(\d+).*?x\s*=\s*\?/i);
  if(m){const a=2+rand(6),x=1+rand(12),b=1+rand(20),c=a*x+b,correct=String(x),mix=shuf4(correct,[String(x-1),String(x+1),String(c-b),String(a+b)],n=>String(x+n+1));return {...q,q:`${a}x + ${b} = ${c}，x = ?`,opts:mix.opts,ans:mix.ans,sol:`${a}x=${c}−${b}=${c-b}，所以 x=${x}。`,variant:true};}
  m=src.match(/f\(x\)\s*=\s*([−-]?\d+)x\s*([+−-])\s*(\d+).*?f\(([−-]?\d+)\)/i);
  if(m){const a=2+rand(6),b=1+rand(12),x=1+rand(10),ans=a*x+b,correct=String(ans),mix=shuf4(correct,[String(ans-1),String(ans+1),String(a*x),String(a+b+x)],g=>String(ans+g+2));return {...q,q:`f(x) = ${a}x + ${b}，f(${x}) 是多少？`,opts:mix.opts,ans:mix.ans,sol:`代入 x=${x}：${a}×${x}+${b}=${ans}。`,variant:true};}
  return q;
}
const EQUIP_CARD_SLOT={hat:'頭部戰技',clothes:'鎧甲戰技',pants:'下裝戰技',weapon:'武器戰技',back:'背飾戰技',shoes:'鞋履戰技'};
/* 裝備卡只補足職業特色，不取代地城養成卡。詞條與多段攻擊算完後仍受總量上限約束。 */
const EQUIP_DAMAGE_TOTAL_CAP=[6,10,16,24,32],EQUIP_BLOCK_CAP=[6,9,13,18,24];
function clampEquipmentCard(c,cost,rarityBoost){
  const hits=Math.max(1,Math.round(c.hits)||1);
  const totalDmgCap=EQUIP_DAMAGE_TOTAL_CAP[cost]+rarityBoost*3;
  const blockCap=EQUIP_BLOCK_CAP[cost]+rarityBoost*3;
  if(c.dmg)c.dmg=Math.max(1,Math.min(Math.round(c.dmg),Math.floor(totalDmgCap/hits)));
  if(c.block)c.block=Math.max(1,Math.min(Math.round(c.block),blockCap));
  if(c.heal)c.heal=Math.max(1,Math.min(Math.round(c.heal),3+cost+rarityBoost));
  if(c.burn)c.burn=Math.max(1,Math.min(Math.round(c.burn),4+cost*2+rarityBoost));
  if(c.draw)c.draw=1;
  if(c.manaGain)c.manaGain=1;
  return c;
}
function registerClassEquipmentCards(list){
  Object.keys(CARDS).filter(id=>id.indexOf('classEq_')===0).forEach(id=>delete CARDS[id]);
  S.deck=(S.deck||[]).filter(o=>o&&String(o.id||'').indexOf('classEq_')!==0);
  const ids=[];
  (Array.isArray(list)?list:[]).slice(0,6).forEach((it,index)=>{
    const slot=String(it.slot||''),id='classEq_'+slot+'_'+String(it.id||index).replace(/[^A-Za-z0-9_-]/g,''),lv=Math.max(1,Math.min(90,Number(it.level)||1)),cost=Math.max(0,Math.min(4,Number(it.cost)||0));
    const atk=Math.max(0,Number(it.atk)||0),def=Math.max(0,Number(it.def)||0),agi=Math.max(0,Number(it.agi)||0),intel=Math.max(0,Number(it.int)||0),power=atk+def+agi+intel;
    const rarity=String(it.rarity||''),tier=String(it.tier||''),r=rarity==='Legendary'||tier==='legend'?'L':rarity==='Rare'||tier==='rare'?'R':tier==='advanced'?'E':'C';
    /* 裝備原始能力可能非常大；先轉成受控的費用、稀有度與能力階級，避免護盾／傷害無限膨脹。 */
    const rarityBoost={C:0,R:1,E:2,L:3}[r]||0,statBoost=Math.min(3,Math.floor(power/8)),boost=rarityBoost+statBoost;
    const dmgBase=[4,8,14,20,28][cost]+boost,blockBase=[5,8,12,17,23][cost]+boost;
    const c={n:String(it.name||EQUIP_CARD_SLOT[slot]||'裝備戰技'),c:cost,r,EQUIP:1,gearSlot:slot,gearLevel:lv,balanceVersion:2,iconData:/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(String(it.iconData||''))?String(it.iconData):''};
    if(slot==='weapon'){
      c.dmg=dmgBase;c.hits=1;
      if(it.weaponPattern==='combo'){c.hits=2;c.dmg=Math.max(3,Math.round(dmgBase*.62));}
      if(it.weaponPattern==='sweep'){c.all=1;c.dmg=Math.max(3,Math.round(dmgBase*.68));}
      if(/bow|longbow/i.test(String(it.weaponPattern)))c.draw=1;
    }
    else if(slot==='hat'){c.block=Math.max(4,Math.round(blockBase*.72));c.draw=intel+agi>=8?1:0;}
    else if(slot==='clothes'){c.block=blockBase;c.heal=def+intel>=12?2:0;}
    else if(slot==='pants'){c.block=Math.max(5,Math.round(blockBase*.82));c.manaGain=cost>=2&&agi>=8?1:0;}
    else if(slot==='back'){c.dmg=Math.max(3,Math.round(dmgBase*.68));c.all=atk+intel>=12?1:0;c.block=def>=8?Math.min(9,3+cost+rarityBoost):0;}
    else if(slot==='shoes'){c.draw=1;c.block=Math.max(3,Math.round(blockBase*.58));c.manaGain=cost>=3&&agi>=10?1:0;}
    const af=String(it.affix||'');
    if(/flame|venom/.test(af))c.burn=Math.max(c.burn||0,3+cost*2+boost);
    if(/vampire/.test(af))c.drain=1;
    if(/guardian|barrier|aegis|thorns/.test(af))c.block=(c.block||0)+4+cost*2+rarityBoost;
    if(/fortune|haste/.test(af))c.draw=Math.max(c.draw||0,1);
    if(/armorbreak|execution/.test(af))c.dmg=(c.dmg||0)+4+cost*2+rarityBoost;
    if(/celestial|tempest/.test(af)){c.dmg=(c.dmg||0)+3+cost+rarityBoost;c.hits=Math.max(c.hits||1,2);}
    if(/renewal|phoenix|sanctuary/.test(af))c.heal=Math.max(c.heal||0,3+cost+boost);
    if(/void/.test(af))c.mul=2;
    clampEquipmentCard(c,cost,rarityBoost);
    const effects=[];if(c.dmg)effects.push((c.all?'全體 ':'')+'傷害 '+c.dmg+(c.hits>1?' ×'+c.hits:''));if(c.block)effects.push('護盾 '+c.block);if(c.draw)effects.push('抽 '+c.draw);if(c.heal)effects.push('治療 '+c.heal);if(c.manaGain)effects.push('回魔 '+c.manaGain);if(c.burn)effects.push('灼燒 '+c.burn);if(c.mul)effects.push('下張 ×'+c.mul);
    c.t='<em>'+String(EQUIP_CARD_SLOT[slot]||'裝備戰技')+' · Lv.'+lv+' · '+cost+' 費</em><br>'+effects.join('，');CARDS[id]=c;ids.push(id);
  });
  ids.forEach(id=>S.deck.push({id,gem:null}));
  if(ids.length)S.deck=sanitizeDeck(S.deck,S.job);saveChar();return ids;
}
function classroomApplyLaunch(){
  let d=null;
  try{d=JSON.parse(localStorage.getItem(CLASSROOM_LAUNCH_KEY)||'null');}catch(e){}
  if(!d||d.type!=='class_rpg_launch'||!d.sessionId||Date.now()-Number(d.issuedAt||0)>7*86400000)return false;
  classroomLaunch=d;
  if(String(S.petCardCarrySession||'')!==String(d.sessionId)){
    S.petCardCarrySession=String(d.sessionId);S.petCardCarry=[];S.petCardSentSession='';saveChar();
  }
  try{classroomSeq=Number(localStorage.getItem('classRpgDungeonSeq:'+d.sessionId)||0)||0;}catch(e){}
  const c=d.character||{};
  if(c.name){
    applyExtChar({classroomOnly:true,name:String(c.name).slice(0,20),title:String(c.title||c.classJob||'班級冒險者').slice(0,30),classJob:String(c.classJob||''),dungeonJob:String(c.dungeonJob||''),classLevel:Number(c.classLevel)||1,weapon:c.weapon||null,stats:c.stats||{}});
  }
  const equipmentCardIds=registerClassEquipmentCards(c.equipmentCards);classroomLaunch.equipmentCardCount=equipmentCardIds.length;
  const grade=String(d.studentGrade||c.studentGrade||''),gradeMax=classroomGradeMax(grade);if(Number(d.volume)>=1&&Number(d.volume)<=gradeMax)volPick=Number(d.volume);else if(Number(d.volume)>gradeMax)volPick=gradeMax;
  if(Array.isArray(d.questionBank)&&d.questionBank.length){
    const safeImg=v=>/^(data:image\/(png|jpe?g|gif|webp);base64,|https?:\/\/|\.\.?\/|\/)/i.test(String(v||''))?String(v):'';
    const selectedBank=d.questionBank.filter(q=>(!q.grade||!grade||String(q.grade)===grade)&&(!Number(q.vol)||Number(q.vol)<=gradeMax)).slice(0,160).map((q,qIndex)=>{
      const opts=Array.isArray(q.opts)?q.opts.slice(0,4).map(String):[];while(opts.length<4)opts.push('');
      const qimg=safeImg(q.questionImage),oimgs=(Array.isArray(q.optionImages)?q.optionImages:[]).slice(0,4).map(safeImg),pics=[];
      if(qimg)pics.push(`<img src="${hesc(qimg)}" alt="題目圖片" style="max-width:100%;max-height:190px;object-fit:contain">`);
      if(oimgs.some(Boolean))pics.push(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">${oimgs.map((src,n)=>src?`<div><b>${String.fromCharCode(65+n)}</b><img src="${hesc(src)}" alt="選項 ${String.fromCharCode(65+n)}" style="display:block;width:100%;max-height:105px;object-fit:contain"></div>`:'<div></div>').join('')}</div>`);
      const v=Number(q.vol)||Number(d.volume)||1;
      const chap=String(q.chap||''),unit=String(q.unit||''),topic=String(q.topic||''),source=q.source==='teacher'?'教師追加':'課程目錄';
      const visual=splitQuestionVisual(String(q.q||'請看圖片選擇正確答案'),pics.join(''));
      return visualizeGeometryQuestion(classroomNumberVariant({q:visual.q,opts,ans:String(q.ans||opts[0]||''),sol:String(q.sol||''),tag:[source,unit,topic].filter(Boolean).join(' · '),chap,unit,topic,scopeKey:courseScopeKey(chap,unit),source:q.source==='teacher'?'teacher':'course',grade:String(q.grade||grade),v,vol:v,fig:visual.fig,difficulty:q.difficulty||q.diff||q.tier||'',adv:q.adv===true},v,qIndex));
    }).filter(q=>q.q&&q.opts.length===4&&q.ans);
    const selectedScopes=new Set(selectedBank.map(q=>q.scopeKey).filter(Boolean)),seen=new Set(selectedBank.map(q=>String(q.q).replace(/[\s　]+/g,'').toLowerCase()));
    const builtinBank=DUNGEON_BUILTIN_QUESTIONS.filter(q=>Number(q.v)===Number(d.volume)&&selectedScopes.has(q.scopeKey)&&!seen.has(String(q.q).replace(/[\s　]+/g,'').toLowerCase()));
    QBANK=selectedBank.concat(builtinBank);
    classroomLaunch.loadedQuestionCount=QBANK.length;classroomLaunch.courseQuestionCount=selectedBank.length;classroomLaunch.builtinQuestionCount=builtinBank.length;
    qQueue={};
  }
  const M=S.meta||{};classroomBase={q:Number(M.totalQ)||0,ok:Number(M.totalOk)||0};
  const hud=$('classAvatarHud');
  if(hud&&c.avatarData){hud.innerHTML='<img src="'+hesc(c.avatarData)+'" alt="'+hesc(c.name||'學生角色')+'">';hud.classList.remove('hide');}
  return true;
}
function classroomCardHtml(){
  if(!classroomLaunch)return '';
  const c=classroomLaunch.character||{},a=classroomLaunch.assignment||{};
  return `<div class="classroom-home">${c.avatarData?`<img src="${hesc(c.avatarData)}" alt="${hesc(c.name||'學生角色')}">`:'<div style="font-size:42px;text-align:center">🧑‍🎓</div>'}
    <div><b>🏫 ${hesc(c.name||S.name)}・${hesc(c.classJob||c.title||'班級冒險者')}</b>
    <span>${a.title?'本次作業：'+hesc(a.title):'自主複習模式'}${a.volume?'・第 '+hesc(a.volume)+' 冊':''}${classroomLaunch.studentGrade?'・'+hesc(classroomLaunch.studentGrade):''}<br>🎴 本次已重置為職業基本牌組，並追加 ${Number(classroomLaunch.equipmentCardCount||0)} 張目前裝備戰技卡（Lv.1／20／40／60／80 起為 0／1／2／3／4 費）。<br>◆ 魔力上限 6・隨機起手 5 張・通用卡最多 2 張。<br>${Number(classroomLaunch.loadedQuestionCount)>0?'✅ 課程目錄 '+Number(classroomLaunch.courseQuestionCount||0)+' 題＋地下城同單元 '+Number(classroomLaunch.builtinQuestionCount||0)+' 題（共 '+Number(classroomLaunch.loadedQuestionCount)+' 題）':'使用符合年級的地下城內建題庫'}・數字與答案位置會變化・通關即時回傳，正式任務獎勵由教師審核。${Number(classroomLaunch.loadedQuestionCount)>0?'<br>🔒 已鎖定教師勾選的冊別與單元，不會跨單元出題。<br>⚡ 陷阱只出基礎短題；🔺 圖形引導與高難題會安排在壁畫、封印門、NPC 與特殊設施。':''}</span></div></div>
    <div class="classroom-sync warn">${classroomPendingList().length?'有 '+classroomPendingList().length+' 筆成果等待班級頁接收':'成果會由班級系統安全結算'}</div>`;
}
function classroomCheckpoint(reason,extra){
  if(!classroomLaunch)return null;
  const M=S.meta||{},q=Math.max(0,(Number(M.totalQ)||0)-classroomBase.q),ok=Math.max(0,(Number(M.totalOk)||0)-classroomBase.ok);
  const clear=Object.assign({zoneClears:0,firstClear:false},classroomPendingClear||{},extra||{});classroomPendingClear=null;
  const canSendPets=String(S.petCardSentSession||'')!==String(classroomLaunch.sessionId)
    &&Array.isArray(S.petCardCarry)&&S.petCardCarry.length>0;
  if(q<=0&&!(clear.zoneClears>0)&&!canSendPets)return null;
  classroomBase={q:Number(M.totalQ)||0,ok:Number(M.totalOk)||0};
  classroomSeq++;
  try{localStorage.setItem('classRpgDungeonSeq:'+classroomLaunch.sessionId,String(classroomSeq));}catch(e){}
  const claimId=String(classroomLaunch.sessionId)+'_'+classroomSeq;
  const packet={type:'class_rpg_dungeon_result',v:2,cid:String(classroomLaunch.cid||''),sid:String(classroomLaunch.sid||''),claimId,
    report:{sessionId:String(classroomLaunch.sessionId),claimId,reason:String(reason||'checkpoint'),startedAt:Number(classroomLaunch.issuedAt)||Date.now(),finishedAt:Date.now(),
      durationSec:Math.max(0,Math.floor((Date.now()-Number(classroomLaunch.issuedAt||Date.now()))/1000)),questions:q,correct:Math.min(q,ok),
      accuracy:q?Math.round(Math.min(q,ok)/q*100):0,zoneClears:Math.max(0,Math.min(3,Number(clear.zoneClears)||0)),firstClear:!!clear.firstClear,
      zone:Math.max(0,Number(S.zone)||0),bestChain:Math.max(0,...(S.allChains||[0]),Number(window.B&&B.best)||0),volume:Number(volPick)>=1?Number(volPick):null,assignmentId:Number((classroomLaunch.assignment||{}).id)||0,assignmentTarget:Number((classroomLaunch.assignment||{}).target)||0,title:String(clear.title||(classroomLaunch.assignment||{}).title||'數學地下城').slice(0,80),level:Number(S.lv)||1,
      petTransferId:canSendPets?String(classroomLaunch.sessionId)+'_pets':'',petCards:canSendPets?S.petCardCarry.slice(0,5).map(k=>{const d=companionDef(k),p=monsterPersonality(k);return {kind:String(k),name:String(d.n||k).slice(0,30),icon:String(d.ic||'🐾').slice(0,4),art:petCardArtData(k),tier:monsterTier(k),group:String(d.group||'assist'),personalityId:String(p.id||'calm')};}):[]}};
  const queue=classroomPendingList().filter(x=>x&&x.claimId!==claimId);queue.push(packet);classroomWritePending(queue);
  if(canSendPets){S.petCardSentSession=String(classroomLaunch.sessionId);saveChar();}
  try{if(window.opener&&!window.opener.closed)window.opener.postMessage(packet,location.origin==='null'?'*':location.origin);}catch(e){}
  classroomSyncText(clear.zoneClears>0?'✓ 通關成果已即時回傳；指定作業將等待教師審核':'✓ 學習成果已送回班級頁，等待安全結算','ok');
  return packet;
}
function classroomReturn(){
  classroomCheckpoint('return');
  try{if(window.opener&&!window.opener.closed){
    window.opener.focus();
    /* 若瀏覽器阻止關閉彈出視窗，仍會在短暫等待後回到班級首頁。 */
    setTimeout(()=>{if(!window.closed)location.href='../index.html';},320);
    window.close();return;
  }}catch(e){}
  location.href='../index.html';
}

/* 課前地下城只在老師尚未開課時開放。班級頁會即時同步 Firestore，
   子視窗再以同網域狀態查詢；上課一開始就先回傳、再關閉遊戲。 */
let classroomScheduleTimer=null,classroomScheduleLocked=false;
function classroomScheduleStatus(){
  if(!classroomLaunch||!classroomLaunch.closeWhenClassStarts)return null;
  try{if(window.opener&&!window.opener.closed&&typeof window.opener.classRpgDungeonClassStatus==='function')return window.opener.classRpgDungeonClassStatus(classroomLaunch.cid);}catch(e){}
  try{if(window.parent&&window.parent!==window&&typeof window.parent.classRpgDungeonClassStatus==='function')return window.parent.classRpgDungeonClassStatus(classroomLaunch.cid);}catch(e){}
  return null;
}
function classroomCloseForClass(){
  if(classroomScheduleLocked)return;classroomScheduleLocked=true;running=false;saveChar();
  try{if(B){B.over=true;B.busy=true;clearInterval(rTimer);}}catch(e){}
  const packet=classroomCheckpoint('class_started',{title:'老師開始上課'});
  overlay(`<div class="kicker">CLASS STARTED</div><h1>🔔 老師開始上課</h1>
    <div class="desc">地下城複習已暫停。<br>${packet?'本次答題成果已先存入安全佇列並回傳。':'角色進度已保存。'}<br>請回班級頁參與當節課。</div>
    <button class="go" id="classNowBack">🏫 回到班級課堂</button>`,null,el=>{if(el.id==='classNowBack'){dungeonHealthBack();return true;}return false;});
  clearInterval(classroomScheduleTimer);classroomScheduleTimer=setTimeout(dungeonHealthBack,5200);
}
function startClassroomScheduleGuard(){
  if(!classroomLaunch||!classroomLaunch.closeWhenClassStarts)return;
  clearInterval(classroomScheduleTimer);classroomScheduleTimer=setInterval(()=>{const s=classroomScheduleStatus();if(s&&s.active)classroomCloseForClass();},2000);
  const s=classroomScheduleStatus();if(s&&s.active)classroomCloseForClass();
}

/* ═══════════════ 30 分鐘健康休息鎖 ═══════════════
   - 重新整理仍沿用原本計時，不能藉重新載入規避。
   - 離開地城滿 10 分鐘視為完成休息，下一次重新計算 30 分鐘。
   - 時間到先回傳學習成果，再用強風動畫強制送回班級系統。 */
const DUNGEON_PLAY_MS=30*60*1000;
const DUNGEON_REST_MS=10*60*1000;
const DUNGEON_HEALTH_PREFIX='mathDungeonHealthV1:';
let dungeonHealthTimer=null,dungeonHealthWarn=0,dungeonHealthLocked=false;
function dungeonHealthKey(){
  const who=(classroomLaunch&&classroomLaunch.sid)||S.name||'device';
  return DUNGEON_HEALTH_PREFIX+String(who).slice(0,80);
}
function dungeonHealthRead(){
  try{return JSON.parse(localStorage.getItem(dungeonHealthKey())||'{}')||{};}catch(e){return {};}
}
function dungeonHealthWrite(v){try{localStorage.setItem(dungeonHealthKey(),JSON.stringify(v));}catch(e){}}
function dungeonClock(ms){
  const sec=Math.max(0,Math.ceil(ms/1000));
  return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
}
function dungeonHealthHud(left){
  const el=$('restTag');if(!el)return;
  el.textContent='休息倒數 '+dungeonClock(left);
  el.classList.toggle('warn',left<=5*60*1000&&left>60*1000);
  el.classList.toggle('danger',left<=60*1000);
}
function dungeonHealthBack(){
  try{if(window.opener&&!window.opener.closed){window.opener.focus();window.close();return;}}catch(e){}
  location.href='../index.html';
}
function dungeonRestScreen(restUntil){
  dungeonHealthLocked=true;running=false;
  const paint=()=>{
    const left=Math.max(0,restUntil-Date.now());
    const n=$('healthRestCount');if(n)n.textContent=dungeonClock(left);
    if(left<=0){clearInterval(dungeonHealthTimer);dungeonHealthTimer=null;location.reload();}
  };
  overlay(`<div class="kicker">HEALTH BREAK</div><h1>休息時間</h1>
    <div class="health-wind"><span class="wind">🌬️ 〰 〰 〰</span><span class="student">🧑‍🎓</span></div>
    <div class="desc">你已探索 30 分鐘，大風把你安全送出了迷宮。<br>
      請休息眼睛、喝水並起身活動，倒數結束後才能再次進入。</div>
    <div class="health-count" id="healthRestCount">${dungeonClock(restUntil-Date.now())}</div>
    <button class="go" id="healthBack">🏫 回班級系統</button>`,null,el=>{
      if(el.id==='healthBack'){dungeonHealthBack();return true;}return false;
    });
  clearInterval(dungeonHealthTimer);dungeonHealthTimer=setInterval(paint,1000);paint();
}
function dungeonWindExit(){
  if(dungeonHealthLocked)return;
  dungeonHealthLocked=true;running=false;
  if(B){B.over=true;B.busy=true;clearInterval(rTimer);}
  const now=Date.now(),restUntil=now+DUNGEON_REST_MS;
  dungeonHealthWrite({startedAt:0,lastSeen:now,restUntil});
  /* 先落地保存角色，再把答題報告寫入待回傳佇列；即使關窗也能由班級頁補送。 */
  saveChar();
  const healthPacket=classroomCheckpoint('health_rest',{title:'地城健康休息'});
  try{if(healthPacket)localStorage.setItem('classRpgDungeonLastHealthReport',JSON.stringify(healthPacket));}catch(e){}
  overlay(`<div class="kicker">TIME UP</div><h1>大風來了！</h1>
    <div class="health-wind"><span class="wind">🌬️ 〰 〰 〰</span><span class="student">🧑‍🎓</span></div>
    <div class="desc"><b>已連續探索 30 分鐘</b><br>${healthPacket?'本次答題紀錄已存入安全佇列並回傳班級系統。':'本次角色進度已保存（這段時間沒有新增答題紀錄）。'}<br>強風正在把你送出地下迷宮……</div>
    <div class="health-count">休息 10:00</div>`,null);
  clearInterval(dungeonHealthTimer);dungeonHealthTimer=setTimeout(dungeonHealthBack,5200);
}
function dungeonHealthTick(){
  if(dungeonHealthLocked)return;
  const now=Date.now(),g=dungeonHealthRead();
  if(!g.startedAt){g.startedAt=now;dungeonHealthWarn=0;}
  g.lastSeen=now;dungeonHealthWrite(g);
  const left=g.startedAt+DUNGEON_PLAY_MS-now;dungeonHealthHud(left);
  if(left<=0){dungeonWindExit();return;}
  if(left<=60*1000&&dungeonHealthWarn<2){dungeonHealthWarn=2;toast('🌬️ 剩 1 分鐘！大風即將吹出迷宮，請完成目前動作。',4200);}
  else if(left<=5*60*1000&&dungeonHealthWarn<1){dungeonHealthWarn=1;toast('⏳ 已探索 25 分鐘，5 分鐘後強制休息。',3600);}
}
function startDungeonHealthGuard(){
  const now=Date.now(),g=dungeonHealthRead();
  if(Number(g.restUntil)>now){dungeonRestScreen(Number(g.restUntil));return true;}
  // 關閉頁面超過完整休息時間，就重新給 30 分鐘；快速重新整理則延續原時間。
  if(!Number(g.startedAt)||!Number(g.lastSeen)||now-Number(g.lastSeen)>=DUNGEON_REST_MS){
    g.startedAt=now;g.lastSeen=now;g.restUntil=0;dungeonHealthWrite(g);
  }
  if(Number(g.startedAt)+DUNGEON_PLAY_MS<=now){dungeonWindExit();return true;}
  clearInterval(dungeonHealthTimer);dungeonHealthTimer=setInterval(dungeonHealthTick,1000);
  dungeonHealthTick();return false;
}
window.addEventListener('message',e=>{
  const d=e.data||{};if(d.type!=='class_rpg_dungeon_ack'||!d.claimId)return;
  classroomWritePending(classroomPendingList().filter(x=>x&&x.claimId!==d.claimId));
  classroomSyncText(d.ok?(d.submitted?'✓ 成果已存入學習紀錄並送教師審核':'✓ 已存入班級學習紀錄：+'+(d.xp||0)+' XP、+'+(d.gold||0)+' 金'):'⚠ '+(d.message||'成果尚未結算'),d.ok?'ok':'warn');
});

/* ═══════════════ 班級系統橋接 ═══════════════
   班級經營是獨立的 HTML。這裡負責產生／接收雙方約定的資料格式，
   不直接耦合 —— 兩邊各自可以改版。 */
const BRIDGE_VERSION='1.0';
function buildReport(){
  const M=S.meta||{};
  const topics={};
  for(const t of allTopics()){
    const st=topicStat(t);
    topics[t]={ok:st.ok,total:st.total,mastery:mastery(t),last:st.last};
  }
  return {
    v:BRIDGE_VERSION, type:'student_report', ts:Date.now(),
    student:{name:S.name||'',job:S.job||'',lv:S.lv||1},
    progress:{cleared:(S.cleared===undefined?-1:S.cleared),
      zone:S.zone||0, runs:M.runs||0, souls:M.souls||0},
    learning:{totalQ:M.totalQ||0, totalOk:M.totalOk||0,
      accuracy:M.totalQ?Math.round(M.totalOk/M.totalQ*100):0, topics},
    wrong:(S.wrong||[]).map(w=>({q:w.q,tag:w.tag,fails:w.fails})),
    codex:Object.keys(M.codex||{}),
    cards:{seen:(M.seenCards||[]).length, legendary:(M.legendary||[]).length},
  };
}
function bridgeScreen(msg){
  const rep=buildReport();
  const code=JSON.stringify(rep);
  overlay(`<div class="kicker">CLASS BRIDGE</div><h1>🏫 班級系統對接</h1>
    <div class="rank">格式 v${BRIDGE_VERSION}　${S.name||'未命名'}</div>
    ${msg?`<div class="shmsg">${msg}</div>`:''}
    <div class="desc" style="margin-bottom:6px">
      班級經營是<b>另一個獨立的 HTML</b>。這裡負責產生它看得懂的資料。<br>
      複製下面的<b>學習報告</b>貼進班級系統即可。</div>
    <textarea id="repBox" readonly>${code}</textarea>
    <div class="mathbox"><div class="mh">報告內容</div>
      <div class="ml">作答 ${rep.learning.totalQ} 題　正確率 ${rep.learning.accuracy}%</div>
      <div class="ml">主題精熟度 ${Object.keys(rep.learning.topics).length} 項</div>
      <div class="ml">未解錯題 ${rep.wrong.length} 題　已學課程 ${rep.codex.length} 堂</div>
      <div class="ml">通關 ${rep.progress.cleared+1} 區　輪迴 ${rep.progress.runs} 次</div>
    </div>
    <div class="namebox"><label>接收班級系統的指派（作業／角色）</label>
      <textarea id="asgBox" placeholder='貼上班級系統產生的 JSON…'></textarea></div>
    <button class="go" id="asgGo">套用指派</button>
    <button class="go" id="ok" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>`,
    introScreen,el=>{
      if(el.id!=='asgGo')return false;
      let d;
      try{ d=JSON.parse(($('asgBox').value||'').trim()); }
      catch(e){ setTimeout(()=>bridgeScreen('JSON 格式錯誤：'+e.message),10); return true; }
      if(!d||typeof d!=='object'){ setTimeout(()=>bridgeScreen('資料必須是物件'),10); return true; }
      const notes=[];
      if(d.type==='character'||d.name){        // 學生設計的角色
        try{ applyExtChar(d.character||d); notes.push('已套用角色：'+(d.name||d.character.name)); }
        catch(e){ notes.push('角色套用失敗：'+e.message); }
      }
      if(d.assignment){                        // 作業指派
        S.assign=d.assignment;
        saveChar();
        notes.push('已接收作業：'+(d.assignment.title||'未命名')+
          '（'+(d.assignment.count||10)+' 題）');
      }
      if(d.volume){ volPick=d.volume; notes.push('出題範圍鎖定第 '+d.volume+' 冊'); }
      setTimeout(()=>bridgeScreen(notes.length?notes.join('　'):'沒有可套用的欄位'),10);
      return true;
    });
}


