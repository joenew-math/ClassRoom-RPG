/*
 * math-dungeon-learning：題庫、程序題、幾何圖示、錯題複習、NPC 教學與設施問答控制器。
 * 本檔沿用 classic script 全域依賴，必須在題庫／地下城資料之後、gameplay 與相容 runtime 之前載入。
 */

function courseScopeKey(chap,unit){
  const clean=v=>String(v||'').replace(/[\s　]+/g,'').replace(/[．。・·]/g,'').toLowerCase();
  return clean(chap)+'|'+clean(unit);
}

function dungeonBuiltinScope(q){
  const s=String(q.q||''),v=Number(q.v)||1,scope=(chap,unit)=>({chap,unit,scopeKey:courseScopeKey(chap,unit)});
  if(v===1){
    if(s.includes('絕對值')||s.includes('|−6|'))return scope('整數的運算','1-1 正數與負數');
    if(s.includes('質數'))return scope('因數與倍數','2-1 因數、倍數與質數');
    if(s.includes('最大公因數'))return scope('因數與倍數','2-2 最大公因數');
    if(s.includes('最小公倍數'))return scope('因數與倍數','2-3 最小公倍數');
    if(s.includes('/'))return scope('分數的運算',s.includes('÷')?'2-3 分數的乘除':'2-2 分數的加減');
    if(s.includes('×')||s.includes('÷')||s.includes('先乘除'))return scope('整數的運算','1-3 整數的乘除');
    return scope('整數的運算','1-2 整數的加減');
  }
  if(v===2){
    if(s.includes('x+y=')||s.includes('x−y='))return scope('二元一次聯立方程式','1-2 解聯立方程式');
    if(s.includes('點 ('))return scope('直角坐標與圖形','2-1 直角坐標平面');
    if(s.includes('y = 3'))return scope('直角坐標與圖形','2-2 二元一次方程式的圖形');
    if(s.includes('化成最簡整數比')||s.includes('6:8'))return scope('比與比例式','3-1 比與比值');
    if(s.includes('x:6'))return scope('比與比例式','3-2 比例式');
    if(s.includes('工作量固定'))return scope('比與比例式','3-3 正比與反比');
    if(s.includes('不超過'))return scope('一元一次不等式','4-1 不等式的意義');
    return scope('一元一次不等式','4-2 解一元一次不等式');
  }
  if(v===3){
    if(s.includes('展開')||/^\(x\+\d+\)\(x−\d+\)/.test(s))return scope('乘法公式與多項式','1-1 乘法公式');
    if(s.includes('√8'))return scope('平方根與畢氏定理','2-1 平方根與根號');
    if(s.includes('√12'))return scope('平方根與畢氏定理','2-2 根式的運算');
    if(s.includes('斜邊')||s.includes('兩股'))return scope('平方根與畢氏定理','2-3 畢氏定理');
    if(s.includes('因式分解')&&s.includes('x²+5x+6'))return scope('因式分解','3-3 十字交乘法');
    if(s.includes('因式分解'))return scope('因式分解','3-2 利用乘法公式分解');
    return scope('一元二次方程式','4-1 一元二次方程式與解');
  }
  if(v===4){
    if(s.includes('總和'))return scope('數列與級數','1-2 等差級數');
    if(s.includes('公比'))return scope('數列與級數','1-3 等比數列');
    if(s.includes('數列')||s.includes('首項'))return scope('數列與級數','1-1 數列與等差數列');
    if(s.includes('f(x)'))return scope('一次函數','2-1 函數的意義');
    if(s.includes('斜率'))return scope('一次函數','2-2 一次函數與其圖形');
    if(s.includes('第三邊'))return scope('三角形的基本性質','3-2 邊與角的關係');
    if(s.includes('三角形')||s.includes('外角'))return scope('三角形的基本性質','3-1 內角與外角');
    return scope('平行與四邊形','4-2 四邊形與平行四邊形');
  }
  if(v===5){
    if(s.includes('相似')||s.includes('影長'))return scope('相似形','1-3 相似的性質與應用');
    if(s.includes('弧長')||s.includes('扇形'))return scope('圓','2-3 弧長與扇形面積');
    if(s.includes('圓心角')||s.includes('圓周角')||s.includes('直徑'))return scope('圓','2-2 圓周角定理');
    if(s.includes('平移'))return scope('二次函數','3-2 拋物線的平移');
    return scope('二次函數','3-3 一般式與最大最小值');
  }
  if(s.includes('中位數')||s.includes('IQR'))return scope('統計與機率','1-1 資料的中心位置');
  if(s.includes('兩顆骰子'))return scope('統計與機率','1-3 兩階段事件');
  if(s.includes('機率'))return scope('統計與機率','1-2 機率的意義');
  if(s.includes('多面體'))return scope('立體圖形','2-1 認識立體圖形');
  return scope('立體圖形','2-2 表面積與體積');
}

function shuf4(correct,wrongs,filler){
  const seen=new Set([String(correct)]);
  const out=[String(correct)];
  for(const w of wrongs){
    const v=String(w);
    if(seen.has(v))continue;
    seen.add(v);out.push(v);
    if(out.length===4)break;
  }
  let guard=0;
  while(out.length<4&&guard++<50){
    const v=String(filler?filler(guard):(Number(correct)+guard+1));
    if(seen.has(v))continue;
    seen.add(v);out.push(v);
  }
  return {opts:shuffle(out),ans:String(correct)};
}

function genEquation(){
  const a=2+rand(4), x=2+rand(9), b=10*(1+rand(5));
  const c=a*x+b;
  const w=[String(x+1),String(x-1),String(c-b),String(x+2)];
  const m=shuf4(String(x),w,g=>x+1+g);
  return {q:`封印門的符文：　${a}x + ${b} = ${c}　　x = ?`,opts:m.opts,ans:m.ans,
    sol:`移項：${a}x = ${c}−${b} = ${c-b}，再除以 ${a} 得 x = ${x}。`,tag:'一元一次方程式'};
}

function genInequality(){
  const p=8+rand(20), n=3+rand(7), M=p*n+rand(p);
  const m=shuf4(String(n),[String(n+1),String(n-1),String(Math.round(M/p*10)/10)],g=>n+1+g);
  return {q:`商人：「你有 ${M} 金幣，每張卡 ${p} 金幣。最多能買幾張？」`,opts:m.opts,ans:m.ans,
    sol:`${p}x ≤ ${M} → x ≤ ${(M/p).toFixed(2)}，最多取整數 ${n} 張（無條件捨去）。`,tag:'一元一次不等式'};
}

function genChickenRabbit(){
  const ch=2+rand(6), rb=2+rand(6);
  const head=ch+rb, foot=2*ch+4*rb;
  const m=shuf4(String(rb),[String(ch),String(rb+1),String(head-rb),String(rb+2)],g=>rb+1+g);
  return {q:`寶箱刻著：「箱中共 ${head} 隻生物、${foot} 隻腳。兔子有幾隻？」`,opts:m.opts,ans:m.ans,
    sol:`設雞 x 兔 y：x+y=${head}、2x+4y=${foot} → y = (${foot}−2×${head})÷2 = ${rb}。`,tag:'二元一次聯立'};
}

function genHCF(){
  const g=4+rand(9), a=g*(2+rand(4)), b=g*(2+rand(5));
  if(gcd(a,b)!==g) return genHCF();
  const m=shuf4(String(g),[String(g*2),String(Math.floor(g/2)||1),String(g+1)],k=>g*(k+2));
  return {q:`藥草 ${a} 株與礦石 ${b} 塊要分成完全相同的補給包且不剩，最多幾包？`,opts:m.opts,ans:m.ans,
    sol:`即求 (${a}, ${b}) 的最大公因數 = ${g}。`,tag:'最大公因數'};
}

function genProbability(){
  const t=[
    ()=>{const n=2+rand(5);return{q:`寶箱有 ${n*2} 顆寶石，其中 ${n} 顆是稀有的。隨機拿一顆是稀有的機率？`,
      ...shuf4("1/2",["1/3","1/4","2/3"],g=>"1/"+(g+4)),sol:`${n}/${n*2} = 1/2。`};},
    ()=>({q:"擲一顆公正骰子，出現質數（2、3、5）的機率是多少？",
      ...shuf4("1/2",["1/3","1/6","2/3"],g=>"1/"+(g+4)),sol:"3 種有利、6 種可能 = 1/2。"}),
    ()=>({q:"連擲兩次硬幣，恰好一正一反的機率是多少？",
      ...shuf4("1/2",["1/4","3/4","1"],g=>"1/"+(g+4)),sol:"正反、反正共 2 種，2/4 = 1/2。"}),
  ][rand(3)]();
  return {...t,tag:'機率'};
}

function genFactor(){
  const a=1+rand(6), b=1+rand(6);
  const s=a+b, p=a*b;
  const correct=`(x+${a})(x+${b})`;
  const w=[`(x+${a+1})(x+${b})`,`(x+${s})(x+${p})`,`(x−${a})(x−${b})`,`(x+${a})(x+${b+1})`];
  const m=shuf4(correct,w,g=>`(x+${a+g})(x+${b+g+1})`);
  return {q:`寶石刻痕：　x² + ${s}x + ${p}　＝ ?`,opts:m.opts,ans:m.ans,
    sol:`找兩數積為 ${p}、和為 ${s} → ${a} 與 ${b}。`,tag:'因式分解'};
}

function splitQuestionVisual(raw,existingFig){
  const figures=[];
  const question=String(raw||'')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi,svg=>{figures.push(svg);return '';})
    .replace(/<img\b[^>]*>/gi,img=>{figures.push(img);return '';})
    .trim();
  return {
    q:question||'請觀察圖形並作答。',
    fig:[existingFig||'',...figures].filter(Boolean).join('')
  };
}

function flattenBank(arr){
  const out=[];
  for(const b of arr){
    if(b.qs&&Array.isArray(b.qs)){                    // 老師的 BANK 格式
      for(const q of b.qs){
        if(!q||!q.q||!q.opts||!q.ans)continue;
        const chap=String(b.chap||''),unit=String(b.unit||''),topic=String(b.topic||'');
        const visual=splitQuestionVisual(q.q,q.fig);
        out.push({v:Number(b.vol)||1,vol:Number(b.vol)||1,grade:String(b.grade||''),q:visual.q,fig:visual.fig,opts:q.opts.slice(),ans:q.ans,
          sol:q.sol||'',chap,unit,topic,scopeKey:courseScopeKey(chap,unit),source:'course',
          difficulty:q.difficulty||q.diff||q.tier||b.difficulty||b.diff||b.tier||'',
          tag:['課程目錄',unit,topic].filter(Boolean).join(' · ')});
      }
    }else if(b.q&&b.opts&&b.ans){                     // 已攤平格式
      const chap=String(b.chap||''),unit=String(b.unit||''),topic=String(b.topic||'');
      const visual=splitQuestionVisual(b.q,b.fig);
      out.push({v:Number(b.v||b.vol)||1,vol:Number(b.v||b.vol)||1,q:visual.q,fig:visual.fig,opts:b.opts.slice(),ans:b.ans,
        sol:b.sol||'',chap,unit,topic,scopeKey:b.scopeKey||courseScopeKey(chap,unit),source:b.source||'course',
        difficulty:b.difficulty||b.diff||b.tier||'',tag:b.tag||''});
    }
  }
  return out;
}

function parsePasted(txt){
  txt=txt.trim();
  if(!txt) throw new Error('沒有內容');
  // 從整份 HTML 抽出 BANK
  const m=txt.match(/const\s+BANK\s*=\s*(\[[\s\S]*?\])\s*;/);
  if(m) txt=m[1];
  // 只允許純資料，避免執行任意程式碼
  let data;
  try{ data=JSON.parse(txt); }
  catch(e){ throw new Error('格式無法解析，請確認貼上的是 BANK 陣列或整份題庫 HTML'); }
  if(!Array.isArray(data)) throw new Error('內容不是陣列');
  const flat=flattenBank(data);
  if(!flat.length) throw new Error('沒有讀到任何題目');
  return flat;
}

function importScreen(){
  overlay(`<div class="kicker">IMPORT</div><h1>匯入題庫</h1>
    <div class="rank">目前題庫：${QBANK.length} 題</div>
    <div class="desc">把你「題庫目錄」系統的<b>整份 HTML</b>、或其中的
      <b>const BANK = [...]</b> 陣列貼進來即可（也接受已產生的 JSON 出題檔）。<br>
      題目會依 <b>vol</b> 自動歸到第 1～6 冊。</div>
    <textarea id="impBox" placeholder="在這裡貼上題庫…"></textarea>
    <div id="impMsg"></div>
    <button class="go" id="impGo">讀取</button>
    <button class="go" id="impBack" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">返回</button>`,
    null,el=>{
      if(el.id==='impBack'){ setTimeout(introScreen,10); return true; }
      if(el.id!=='impGo') return false;
      try{
        const flat=parsePasted($('impBox').value);
        QBANK=flat;
        const by={};flat.forEach(q=>by[q.v]=(by[q.v]||0)+1);
        setTimeout(()=>overlay(`<div class="kicker">IMPORT OK</div><h1>匯入成功</h1>
          <div class="rank">共 ${flat.length} 題</div>
          <div class="desc">分冊：${Object.keys(by).sort().map(v=>'第'+v+'冊 <b>'+by[v]+'</b> 題').join('　')}<br>
            題目會加入陷阱、封印門、NPC、寶箱與製作互動；迷宮謎題仍為程序生成（無限不重複）。</div>
          <button class="go" id="ok">回到選單</button>`,introScreen),10);
        return true;
      }catch(err){
        $('impMsg').innerHTML='<span class="bad">✗ '+err.message+'</span>';
        return false;
      }
    });
}

function recordWrong(q){
  if(!q||!q.q)return;
  S.wrong=S.wrong||[];
  if(S.wrong.some(w=>w.q===q.q))return;          // 同一題只留一隻
  S.wrong.push({q:q.q,opts:q.opts,ans:q.ans,sol:q.sol,tag:q.tag||'',fails:1});
  if(S.wrong.length>12) S.wrong.shift();
  saveChar();
}

function clearWrong(qtext){
  if(!S.wrong)return;
  const i=S.wrong.findIndex(w=>w.q===qtext);
  if(i>=0) S.wrong.splice(i,1);
  saveChar();
}

function wrongEvent(w){
  running=false;
  overlay(`<div class="kicker">ERROR WRAITH</div><h1 style="color:#e26bd6">錯題幽靈</h1>
    <div class="rank" style="color:#e26bd6;border-color:#e26bd6">
      ${w.tag||'你答錯過的題目'}　已糾纏 ${w.fails} 次</div>
    <div class="desc">牠由你答錯的題目化成。<br>
      <b>答對就能永久驅散</b>；再答錯，牠會變得更強並繼續跟著你。</div>
    <button class="go" id="ok">面對它</button>`,()=>{
      quizAsk({q:w.q,opts:w.opts,ans:w.ans,sol:w.sol,tag:w.tag},ok=>{
        if(ok){
          clearWrong(w.q);
          // 錯題複習以學習回饋為主，金幣只保留少量鼓勵，避免刷題破壞經濟。
          const g=3+Math.min(2,Math.max(0,Number(w.fails)||0));
          S.gold+=g;
          const heal=Math.min(15,S.maxhp-S.hp); S.hp+=heal;
          overlay(`<div class="kicker">DISPELLED</div>
            <h1 style="color:#8fe86a">驅散成功！</h1>
            <div class="rank">金幣 +${g}${heal?'　生命 +'+heal:''}</div>
            <div class="desc">這題你弄懂了，牠不會再出現。<br>
              目前還有 <b>${(S.wrong||[]).length}</b> 隻錯題幽靈在迷宮裡。</div>
            <button class="go" id="ok">繼續</button>`,backToDungeon);
        }else{
          w.fails++;
          const dmg=10+w.fails*4;
          S.hp=Math.max(1,S.hp-dmg);
          saveChar();
          overlay(`<div class="kicker">STILL HAUNTED</div>
            <h1 style="color:#ff6a6a">牠還在</h1>
            <div class="rank" style="color:#ff6a6a;border-color:#ff6a6a">生命 −${dmg}</div>
            <div class="desc">${w.sol}<br><br>牠變強了，下次再遇到會更難纏。</div>
            <button class="go" id="ok">離開</button>`,backToDungeon);
        }
      },'錯題幽靈');
    });
}

function trapSignature(q){return String((q&&q.q)||'').replace(/<[^>]+>/g,'').replace(/\s+/g,'').slice(0,160);}

function rememberTrapQuestion(q){
  const sig=trapSignature(q);if(!sig)return;
  trapRecent=trapRecent.filter(x=>x!==sig);trapRecent.push(sig);
  if(trapRecent.length>15)trapRecent.shift();
}

function chooseTrapQuestion(T){
  const forceCourse=classroomBankActive();
  for(let i=0;i<8;i++){
    const useCourse=forceCourse||Math.random()<.6;
    const q=useCourse?dungeonActionQuestion(null):T.make();
    if(!q)continue;
    if(!trapRecent.includes(trapSignature(q))||i===7){rememberTrapQuestion(q);return {q,course:useCourse};}
  }
  const q=T.make();rememberTrapQuestion(q);return {q,course:false};
}

function trapEvent(key,tx,ty){
  running=false;
  const T=TRAPS[key],picked=chooseTrapQuestion(T),Q=picked.q;
  if(!picked.course)quizStats.total++;
  // 先給驚嚇：畫面猛烈晃動 + ⁉️，再出題
  const d=$('dungeon');
  if(d){ d.classList.remove('trapshake'); void d.offsetWidth; d.classList.add('trapshake');
    setTimeout(()=>d.classList.remove('trapshake'),700); }
  const bang=document.createElement('div');
  bang.className='trapBang';
  bang.textContent='⁉️';
  document.body.appendChild(bang);
  setTimeout(()=>bang.remove(),900);
  setTimeout(()=>picked.course?quizAsk(Q,ok=>trapResolve(tx,ty,Q,ok),dungeonActionLabel('陷阱解鎖')):trapQuiz(key,tx,ty,T,Q),720);
}

function trapResolve(tx,ty,Q,ok){
  delete traps[tx+','+ty];
  if(ok){
    const g=Math.min(4,1+questionKnowledgePoints(Q));S.gold+=g;
    setTimeout(()=>overlay(`<div class="kicker">SAFE</div><h1 style="color:#8fe86a">安全通過</h1><div class="rank">金幣 +${g}</div><div class="desc">${Q.sol||'觀念判斷正確，陷阱已解除。'}</div><button class="go" id="ok">繼續</button>`,backToDungeon),10);
  }else{
    const dmg=8+rand(10);S.hp=Math.max(1,S.hp-dmg);S.deck.push({id:'curse',gem:null});
    setTimeout(()=>overlay(`<div class="kicker">TRAPPED</div><h1 style="color:#ff6a6a">踩中了！</h1><div class="rank" style="color:#ff6a6a;border-color:#ff6a6a">生命 −${dmg}　牌組混入一張詛咒</div><div class="desc">${Q.sol||'陷阱沒有解除，請記住這個觀念。'}</div><button class="go" id="ok">繼續</button>`,backToDungeon),10);
  }
}

function trapQuiz(key,tx,ty,T,Q){
  overlay(`<div class="kicker">TRAP · ${T.n}</div>
    <h1 style="color:${T.col};font-size:20px">${T.ic} ${T.n}</h1>
    <div class="desc" style="font-size:15px;text-align:center">${Q.q}</div>
    <button class="go" id="tYes">${Q.yes}</button>
    <button class="go" id="tNo" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">${Q.no}</button>`,
    null,el=>{
      if(el.id!=='tYes'&&el.id!=='tNo')return false;
      const ans=el.id==='tYes';
      const ok=ans===Q.ok;
      if(ok)recordQuizCorrect(Q);
      creditQuiz(ok);
      trapResolve(tx,ty,Q,ok);
      return true;
    });
}

function figTriangle(A,B,C,askLabel){
  // 依角度大略擺出三角形（示意圖，不需精確比例）
  const P1=[30,110], P2=[170,110];
  const rad=d=>d*Math.PI/180;
  const L=140;
  const x=P1[0]+L*Math.cos(rad(A))*Math.sin(rad(B))/Math.sin(rad(180-A-B||1));
  const px=P1[0]+ (L*Math.sin(rad(B))/Math.max(0.2,Math.sin(rad(C))))*Math.cos(rad(A));
  const py=P1[1]-(L*Math.sin(rad(B))/Math.max(0.2,Math.sin(rad(C))))*Math.sin(rad(A));
  const P3=[Math.max(35,Math.min(165,px)),Math.max(18,Math.min(100,py))];
  const arc=(P,r,col)=>`<circle cx="${P[0]}" cy="${P[1]}" r="${r}" fill="none"
    stroke="${col}" stroke-width="2" stroke-dasharray="4 3"/>`;
  return `<svg viewBox="0 0 200 130" width="100%" height="130">
    <polygon points="${P1.join(',')} ${P2.join(',')} ${P3.join(',')}"
      fill="${FIGC.fill}" stroke="${FIGC.line}" stroke-width="2.5"/>
    ${arc(P1,15,FIGC.ang)}${arc(P2,15,FIGC.ang)}${arc(P3,13,FIGC.mark)}
    <text x="${P1[0]-4}" y="${P1[1]+20}" fill="${FIGC.txt}" font-size="12" font-weight="900">A</text>
    <text x="${P2[0]-4}" y="${P2[1]+20}" fill="${FIGC.txt}" font-size="12" font-weight="900">B</text>
    <text x="${P3[0]-4}" y="${P3[1]-8}" fill="${FIGC.txt}" font-size="12" font-weight="900">C</text>
    <text x="${P1[0]+16}" y="${P1[1]-6}" fill="${FIGC.ang}" font-size="11" font-weight="900">${A}°</text>
    <text x="${P2[0]-32}" y="${P2[1]-6}" fill="${FIGC.ang}" font-size="11" font-weight="900">${B}°</text>
    <text x="${P3[0]+10}" y="${P3[1]+14}" fill="${FIGC.mark}" font-size="11" font-weight="900">${askLabel||'?'}</text>
  </svg>`;
}

function figCircleAngle(deg,inscribed){
  const cx=100,cy=68,r=46;
  const a1=-90, a2=-90+deg;
  const pt=d=>[cx+r*Math.cos(d*Math.PI/180),cy+r*Math.sin(d*Math.PI/180)];
  const A=pt(a1),B=pt(a2),P=pt(-90+deg/2+180);
  const big=deg>180?1:0;
  return `<svg viewBox="0 0 200 136" width="100%" height="136">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${FIGC.fill}" stroke="${FIGC.line}" stroke-width="2.5"/>
    <path d="M ${cx} ${cy} L ${A[0]} ${A[1]} A ${r} ${r} 0 ${big} 1 ${B[0]} ${B[1]} Z"
      fill="rgba(255,154,90,.25)" stroke="${FIGC.ang}" stroke-width="2"/>
    <text x="${cx-12}" y="${cy-8}" fill="${FIGC.ang}" font-size="12" font-weight="900">${deg}°</text>
    ${inscribed?`<line x1="${P[0]}" y1="${P[1]}" x2="${A[0]}" y2="${A[1]}" stroke="${FIGC.mark}" stroke-width="2"/>
      <line x1="${P[0]}" y1="${P[1]}" x2="${B[0]}" y2="${B[1]}" stroke="${FIGC.mark}" stroke-width="2"/>
      <text x="${P[0]-6}" y="${P[1]+16}" fill="${FIGC.mark}" font-size="12" font-weight="900">?</text>`:''}
    <circle cx="${cx}" cy="${cy}" r="3" fill="${FIGC.line}"/>
  </svg>`;
}

function figSector(r,deg){
  const cx=100,cy=76,R=52;
  const pt=d=>[cx+R*Math.cos(d*Math.PI/180),cy+R*Math.sin(d*Math.PI/180)];
  const A=pt(-90),B=pt(-90+deg);
  const big=deg>180?1:0;
  return `<svg viewBox="0 0 200 140" width="100%" height="140">
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(226,232,255,.3)"
      stroke-width="2" stroke-dasharray="5 4"/>
    <path d="M ${cx} ${cy} L ${A[0]} ${A[1]} A ${R} ${R} 0 ${big} 1 ${B[0]} ${B[1]} Z"
      fill="rgba(143,208,255,.3)" stroke="${FIGC.dim}" stroke-width="2.5"/>
    <line x1="${cx}" y1="${cy}" x2="${A[0]}" y2="${A[1]}" stroke="${FIGC.mark}" stroke-width="2"/>
    <text x="${cx+6}" y="${cy-16}" fill="${FIGC.mark}" font-size="11" font-weight="900">r=${r}</text>
    <text x="${cx-10}" y="${cy+16}" fill="${FIGC.ang}" font-size="12" font-weight="900">${deg}°</text>
  </svg>`;
}

function figSimilar(k){
  const w=34,h=26;
  return `<svg viewBox="0 0 200 120" width="100%" height="120">
    <polygon points="20,90 ${20+w},90 20,${90-h}" fill="${FIGC.fill}" stroke="${FIGC.line}" stroke-width="2.5"/>
    <text x="22" y="104" fill="${FIGC.dim}" font-size="11" font-weight="900">1</text>
    <polygon points="90,90 ${90+w*1.9},90 90,${90-h*1.9}" fill="rgba(255,154,90,.2)"
      stroke="${FIGC.ang}" stroke-width="2.5"/>
    <text x="96" y="104" fill="${FIGC.ang}" font-size="11" font-weight="900">${k}</text>
    <text x="20" y="18" fill="${FIGC.txt}" font-size="11" font-weight="900">邊長比 1 : ${k}</text>
    <text x="20" y="34" fill="${FIGC.mark}" font-size="11" font-weight="900">面積比 = ?</text>
  </svg>`;
}

function figCylinder(r,h){
  return `<svg viewBox="0 0 200 140" width="100%" height="140">
    <ellipse cx="100" cy="34" rx="42" ry="14" fill="${FIGC.fill}" stroke="${FIGC.line}" stroke-width="2.5"/>
    <path d="M58 34 L58 104 A42 14 0 0 0 142 104 L142 34" fill="rgba(143,208,255,.15)"
      stroke="${FIGC.line}" stroke-width="2.5"/>
    <line x1="100" y1="34" x2="142" y2="34" stroke="${FIGC.mark}" stroke-width="2"/>
    <text x="112" y="30" fill="${FIGC.mark}" font-size="11" font-weight="900">r=${r}</text>
    <line x1="152" y1="34" x2="152" y2="104" stroke="${FIGC.ang}" stroke-width="2"/>
    <text x="157" y="74" fill="${FIGC.ang}" font-size="11" font-weight="900">h=${h}</text>
  </svg>`;
}

function figCone(r,h){
  return `<svg viewBox="0 0 200 140" width="100%" height="140">
    <path d="M100 20 L58 104 A42 14 0 0 0 142 104 Z" fill="rgba(143,208,255,.18)"
      stroke="${FIGC.line}" stroke-width="2.5"/>
    <ellipse cx="100" cy="104" rx="42" ry="14" fill="none" stroke="${FIGC.line}"
      stroke-width="2.5" stroke-dasharray="4 3"/>
    <line x1="100" y1="104" x2="142" y2="104" stroke="${FIGC.mark}" stroke-width="2"/>
    <text x="112" y="122" fill="${FIGC.mark}" font-size="11" font-weight="900">r=${r}</text>
    <line x1="100" y1="20" x2="100" y2="104" stroke="${FIGC.ang}" stroke-width="2" stroke-dasharray="4 3"/>
    <text x="104" y="66" fill="${FIGC.ang}" font-size="11" font-weight="900">h=${h}</text>
  </svg>`;
}

function figTriArea(b,h){
  const sc=Math.min(110/b,70/h,14);
  const W=b*sc, H=h*sc;
  const ox=(200-W)/2, oy=112;
  return `<svg viewBox="0 0 200 130" width="100%" height="130">
    <polygon points="${ox},${oy} ${ox+W},${oy} ${ox+W*0.32},${oy-H}"
      fill="${FIGC.fill}" stroke="${FIGC.line}" stroke-width="2.5"/>
    <line x1="${ox+W*0.32}" y1="${oy-H}" x2="${ox+W*0.32}" y2="${oy}"
      stroke="${FIGC.ang}" stroke-width="2" stroke-dasharray="4 3"/>
    <rect x="${ox+W*0.32}" y="${oy-12}" width="12" height="12" fill="none"
      stroke="${FIGC.ang}" stroke-width="1.5"/>
    <line x1="${ox}" y1="${oy+12}" x2="${ox+W}" y2="${oy+12}" stroke="${FIGC.dim}" stroke-width="2"/>
    <text x="${ox+W/2-14}" y="${oy+26}" fill="${FIGC.dim}" font-size="12" font-weight="900">底 ${b}</text>
    <text x="${ox+W*0.32+6}" y="${oy-H/2}" fill="${FIGC.ang}" font-size="12" font-weight="900">高 ${h}</text>
  </svg>`;
}

function figCircle(r){
  return `<svg viewBox="0 0 200 130" width="100%" height="130">
    <circle cx="100" cy="66" r="48" fill="${FIGC.fill}" stroke="${FIGC.line}" stroke-width="2.5"/>
    <line x1="100" y1="66" x2="148" y2="66" stroke="${FIGC.mark}" stroke-width="2.5"/>
    <circle cx="100" cy="66" r="3.5" fill="${FIGC.line}"/>
    <text x="116" y="60" fill="${FIGC.mark}" font-size="13" font-weight="900">r = ${r}</text>
  </svg>`;
}

function figRightTriangle(a,b,c,unknown){
  const sc=Math.min(70/Math.max(a,b),70/Math.max(a,b));
  const A=[40,110], B=[40+b*sc,110], C=[40,110-a*sc];
  return `<svg viewBox="0 0 200 130" width="100%" height="130">
    <polygon points="${A.join(',')} ${B.join(',')} ${C.join(',')}"
      fill="${FIGC.fill}" stroke="${FIGC.line}" stroke-width="2.5"/>
    <rect x="${A[0]}" y="${A[1]-12}" width="12" height="12" fill="none"
      stroke="${FIGC.mark}" stroke-width="2"/>
    <text x="${(A[0]+B[0])/2-6}" y="126" fill="${FIGC.dim}" font-size="12" font-weight="900">
      ${unknown==='b'?'?':b}</text>
    <text x="${A[0]-24}" y="${(A[1]+C[1])/2+4}" fill="${FIGC.dim}" font-size="12" font-weight="900">
      ${unknown==='a'?'?':a}</text>
    <text x="${(B[0]+C[0])/2+2}" y="${(B[1]+C[1])/2-4}" fill="${FIGC.ang}" font-size="12" font-weight="900">
      ${unknown==='c'?'?':c}</text>
  </svg>`;
}

function figCoordinate(x,y){
  x=Number.isFinite(+x)?+x:3;y=Number.isFinite(+y)?+y:2;
  const sx=100+Math.max(-5,Math.min(5,x))*15,sy=70-Math.max(-4,Math.min(4,y))*14;
  const grid=[25,40,55,70,85,100,115,130,145,160,175].map(n=>`<line x1="${n}" y1="12" x2="${n}" y2="128"/><line x1="18" y1="${n-5}" x2="182" y2="${n-5}"/>`).join('');
  return `<svg viewBox="0 0 200 140" width="100%" height="140" role="img" aria-label="座標平面上的點 P">
    <g stroke="rgba(226,232,255,.12)" stroke-width="1">${grid}</g>
    <path d="M18 70H184 M100 130V10" stroke="${FIGC.line}" stroke-width="2"/>
    <path d="M184 70l-8-4v8z M100 10l-4 8h8z" fill="${FIGC.line}"/>
    <circle cx="${sx}" cy="${sy}" r="7" fill="${FIGC.mark}" stroke="#171022" stroke-width="2"/>
    <text x="${sx+9}" y="${sy-7}" fill="${FIGC.mark}" font-size="12" font-weight="900">P(${x}, ${y})</text>
    <text x="174" y="85" fill="${FIGC.txt}" font-size="11">x</text><text x="108" y="18" fill="${FIGC.txt}" font-size="11">y</text>
  </svg>`;
}

function figParallel(angle){
  angle=Number.isFinite(+angle)?+angle:65;
  return `<svg viewBox="0 0 200 138" width="100%" height="138" role="img" aria-label="兩平行線被一直線截過">
    <path d="M18 38H182 M18 103H182" stroke="${FIGC.line}" stroke-width="4"/>
    <path d="M55 128L142 10" stroke="${FIGC.ang}" stroke-width="4"/>
    <path d="M24 31l9 7-9 7 M42 31l9 7-9 7 M146 96l9 7-9 7 M164 96l9 7-9 7" fill="none" stroke="${FIGC.dim}" stroke-width="2"/>
    <path d="M121 38A22 22 0 0 0 133 56" fill="none" stroke="${FIGC.mark}" stroke-width="3"/>
    <path d="M74 85A22 22 0 0 0 86 103" fill="none" stroke="${FIGC.mark}" stroke-width="3" stroke-dasharray="4 3"/>
    <text x="137" y="58" fill="${FIGC.mark}" font-size="12" font-weight="900">${angle}°</text>
    <text x="54" y="86" fill="${FIGC.mark}" font-size="15" font-weight="900">?</text>
  </svg>`;
}

function figCongruence(){
  return `<svg viewBox="0 0 200 125" width="100%" height="125" role="img" aria-label="兩個全等三角形的對應邊與對應角">
    <polygon points="18,98 78,98 47,28" fill="${FIGC.fill}" stroke="${FIGC.line}" stroke-width="3"/>
    <polygon points="118,98 178,98 147,28" fill="rgba(255,154,90,.18)" stroke="${FIGC.ang}" stroke-width="3"/>
    <path d="M28 98v-7h7 M128 98v-7h7" fill="none" stroke="${FIGC.mark}" stroke-width="2"/>
    <path d="M30 70l8 4 M130 70l8 4 M58 72l8-4 M158 72l8-4" stroke="${FIGC.dim}" stroke-width="3"/>
    <text x="86" y="68" fill="${FIGC.mark}" font-size="19" font-weight="900">≅</text>
    <text x="13" y="116" fill="${FIGC.txt}" font-size="11">△ABC</text><text x="139" y="116" fill="${FIGC.txt}" font-size="11">△DEF</text>
  </svg>`;
}

function figQuadrilateral(kind){
  const name=kind||'平行四邊形';
  return `<svg viewBox="0 0 200 130" width="100%" height="130" role="img" aria-label="${name}性質示意圖">
    <polygon points="42,102 155,102 176,32 63,32" fill="${FIGC.fill}" stroke="${FIGC.line}" stroke-width="3"/>
    <path d="M42 102L176 32 M63 32L155 102" stroke="${FIGC.ang}" stroke-width="2" stroke-dasharray="5 4"/>
    <circle cx="109" cy="67" r="5" fill="${FIGC.mark}"/>
    <path d="M81 32l8 5-8 5 M121 97l8 5-8 5 M47 75l6 8 M165 52l6 8" fill="none" stroke="${FIGC.dim}" stroke-width="2"/>
    <text x="67" y="22" fill="${FIGC.mark}" font-size="12" font-weight="900">${name}</text>
  </svg>`;
}

function figSolid(kind){
  if(/圓柱.*圓錐|柱體.*錐體|三大類|最大.*差別/.test(kind))return `<svg viewBox="0 0 200 138" width="100%" height="138" role="img" aria-label="柱體錐體與球的外形比較"><path d="M15 45v56a27 9 0 0 0 54 0V45" fill="${FIGC.fill}" stroke="${FIGC.line}" stroke-width="2.5"/><ellipse cx="42" cy="45" rx="27" ry="9" fill="${FIGC.fill}" stroke="${FIGC.line}" stroke-width="2.5"/><path d="M100 30L76 102a27 9 0 0 0 54 0Z" fill="rgba(255,154,90,.2)" stroke="${FIGC.ang}" stroke-width="2.5"/><circle cx="165" cy="75" r="30" fill="${FIGC.fill}" stroke="${FIGC.mark}" stroke-width="2.5"/><text x="22" y="124" fill="${FIGC.txt}" font-size="11">柱體</text><text x="84" y="124" fill="${FIGC.txt}" font-size="11">錐體</text><text x="154" y="124" fill="${FIGC.txt}" font-size="11">球</text></svg>`;
  if(/只有一個底面|一個頂點|圓錐|錐體/.test(kind))return figCone('r','h');
  if(/兩底面|兩個底面|圓柱|柱體/.test(kind))return figCylinder('r','h');
  if(/到定點距離|球/.test(kind))return `<svg viewBox="0 0 200 138" width="100%" height="138" role="img" aria-label="球體與半徑"><defs><radialGradient id="sg" cx="35%" cy="28%"><stop offset="0" stop-color="#dff6ff"/><stop offset=".45" stop-color="#72bce8"/><stop offset="1" stop-color="#274d88"/></radialGradient></defs><circle cx="100" cy="67" r="51" fill="url(#sg)" stroke="${FIGC.line}" stroke-width="3"/><ellipse cx="100" cy="67" rx="51" ry="17" fill="none" stroke="${FIGC.mark}" stroke-width="2" stroke-dasharray="5 4"/><line x1="100" y1="67" x2="151" y2="67" stroke="${FIGC.ang}" stroke-width="3"/><text x="122" y="60" fill="${FIGC.txt}" font-size="12" font-weight="900">r</text></svg>`;
  return `<svg viewBox="0 0 200 138" width="100%" height="138" role="img" aria-label="正方體的頂點稜與面"><path d="M50 48l72-22 38 29-72 23z M50 48v60l38 24V78 M88 132l72-24V55" fill="${FIGC.fill}" stroke="${FIGC.line}" stroke-width="3"/><circle cx="50" cy="48" r="4" fill="${FIGC.mark}"/><circle cx="122" cy="26" r="4" fill="${FIGC.mark}"/><circle cx="160" cy="55" r="4" fill="${FIGC.mark}"/><text x="18" y="22" fill="${FIGC.txt}" font-size="12" font-weight="900">V 頂點・E 稜・F 面</text></svg>`;
}

function visualizeGeometryQuestion(q){
  if(!q||q.fig)return q;
  const qtext=String(q.q||'').replace(/<[^>]+>/g,''),key=(String(q.tag||'')+' '+qtext);
  const nums=(qtext.match(/[-−]?\d+(?:\.\d+)?/g)||[]).map(n=>Number(n.replace('−','-')));
  let fig='',short='';
  const coord=key.match(/[（(]\s*([-−]?\d+)\s*[,，]\s*([-−]?\d+)\s*[)）]/);
  if(/座標|象限|坐標/.test(key)){fig=figCoordinate(coord?Number(coord[1].replace('−','-')):3,coord?Number(coord[2].replace('−','-')):2);short='觀察點 P，選出正確判斷。';}
  else if(/畢氏|直角三角/.test(key)){const t=nums.length>=3?nums.slice(-3):[3,4,5];fig=figRightTriangle(Math.abs(t[0])||3,Math.abs(t[1])||4,Math.abs(t[2])||5,/斜邊|求.*邊/.test(key)?'c':'');short='觀察直角三角形，求圖中的 ?。';}
  else if(/平行|同位角|內錯角|同側內角|截角/.test(key)&&!/立體圖形|柱體|錐體|球|多面體|展開圖/.test(key)){fig=figParallel(nums.find(n=>n>0&&n<180)||65);short='觀察平行線標記，選出正確關係。';}
  else if(/全等|SSS|SAS|ASA|AAS|RHS/.test(key)&&!/立體圖形|柱體|錐體|球|多面體|展開圖/.test(key)){fig=figCongruence();short='比較兩個三角形，選出正確判斷。';}
  else if(/相似|比例線段|縮放/.test(key)){fig=figSimilar(nums.find(n=>n>1&&n<10)||2);short='比較兩個相似圖形，選出正確答案。';}
  else if(/圓周角|圓心角|弦|切線|圓內接/.test(key)){fig=figCircleAngle(nums.find(n=>n>0&&n<=360)||80,true);short='觀察圓上的標記，選出正確判斷。';}
  else if(/扇形|弧長/.test(key)){fig=figSector(nums.find(n=>n>0&&n<30)||5,nums.find(n=>n>=30&&n<=360)||90);short='觀察扇形，選出正確答案。';}
  else if(/圓柱|圓錐|柱體|錐體|球體|立體圖形|正方體|多面體|展開圖/.test(key)){fig=figSolid(qtext);short='觀察立體圖形，選出正確判斷。';}
  else if(/平行四邊形|菱形|梯形|箏形|四邊形/.test(key)){const kind=(key.match(/平行四邊形|菱形|梯形|箏形/)||['四邊形'])[0];fig=figQuadrilateral(kind);short='觀察四邊形標記，選出正確判斷。';}
  else if(/三角形|內角|外角|角平分線|中線|垂直平分線/.test(key)){let A=nums.find(n=>n>10&&n<150)||55,B=nums.find((n,i)=>i>0&&n>10&&n<150)||65;if(A+B>=170)B=55;fig=figTriangle(A,B,180-A-B,'?');short='觀察三角形標記，選出正確答案。';}
  return fig?{...q,q:qtext.length<=38?q.q:(short||q.q),fig,visualized:true}:q;
}

function geometryOptionBadge(value){
  const s=String(value||'').trim();let icon='';
  if(/^(正確|是|可以|成立)$/.test(s))icon='✓';else if(/^(錯誤|否|不可以|不成立)$/.test(s))icon='✕';
  else if(/平行/.test(s))icon='∥';else if(/垂直/.test(s))icon='⊥';else if(/全等/.test(s))icon='≅';else if(/相似/.test(s))icon='∼';
  else if(/銳角/.test(s))icon='△';else if(/直角/.test(s))icon='∟';else if(/鈍角/.test(s))icon='◢';
  else if(/圓柱|柱體/.test(s))icon='▣';else if(/圓錐|錐體/.test(s))icon='▲';else if(/球/.test(s))icon='●';
  return icon?`<span class="geo-opt-icon" aria-hidden="true">${icon}</span>`:'';
}

function tierFor(tag){
  if(forceTier) return forceTier;
  const m=tag?mastery(tag):0;
  const st=tag?topicStat(tag):null;
  if(!st||st.total<3) return 1;            // 還沒練過 → 從基礎開始
  if(m<=1) return 1;                       // 很不熟 → 退回基礎
  if(m<=3) return 2;
  return 3;                                // 已精熟 → 給挑戰
}

function tv(tier,a,b,c){ return tier<=1?a : tier===2?b : c; }

function topicStat(tag){
  S.meta=S.meta||{};
  S.meta.topics=S.meta.topics||{};
  return S.meta.topics[tag]=S.meta.topics[tag]||{ok:0,total:0,streak:0,last:0};
}

function recordTopic(tag,ok){
  if(!tag)return;
  const t=topicStat(tag);
  t.total++; if(ok){t.ok++;t.streak++;}else t.streak=0;
  t.last=Date.now();
  saveChar();
}

function mastery(tag){
  const t=(S.meta&&S.meta.topics&&S.meta.topics[tag]);
  if(!t||!t.total)return 0;
  const acc=t.ok/t.total;
  let m=acc*4 + Math.min(1,t.streak/5);
  const days=(Date.now()-(t.last||0))/86400000;
  if(days>7) m-=Math.min(2,(days-7)/7);        // 一週後開始衰退
  return Math.max(0,Math.min(5,Math.round(m)));
}

function weakTopics(n){
  return allTopics()
    .map(t=>({t,m:mastery(t),s:topicStat(t)}))
    .filter(x=>x.s.total>=2)
    .sort((a,b)=>a.m-b.m||b.s.total-a.s.total)
    .slice(0,n||6);
}

function reviewScreen(){
  const wrongN=(S.wrong||[]).length;
  const weak=weakTopics(5);
  overlay(`<div class="kicker">REVIEW</div><h1>📚 課後複習</h1>
    <div class="rank">沒有戰鬥 · 沒有時間壓力 · 答完就看解析</div>
    <div class="desc" style="margin-bottom:6px">
      練對一題得 <b>✦1 知識點</b>（地城依難度為 1～3 點）—— 複習是為了弄懂，不是刷分。</div>
    <div id="rvlist">
      <div class="rvrow" data-m="wrong">
        <div class="rvi" style="background:#e26bd622;color:#e26bd6">👻</div>
        <div class="rvinfo"><div class="rvn">錯題重練</div>
          <div class="rvd">${wrongN?`還有 <b>${wrongN}</b> 題沒弄懂`:'目前沒有錯題 — 很好！'}</div></div></div>
      <div class="rvrow" data-m="weak">
        <div class="rvi" style="background:#ff9a5a22;color:#ff9a5a">📉</div>
        <div class="rvinfo"><div class="rvn">弱點強化</div>
          <div class="rvd">${weak.length?'針對最不熟的 '+weak.length+' 個主題出題':'先多練幾題才能分析弱點'}</div></div></div>
      <div class="rvrow" data-m="pick">
        <div class="rvi" style="background:#8fd0ff22;color:#8fd0ff">🎯</div>
        <div class="rvinfo"><div class="rvn">自選單元</div>
          <div class="rvd">自己決定要練哪一冊 — 主動學習</div></div></div>
      <div class="rvrow" data-m="tier">
        <div class="rvi" style="background:#ffe38a22;color:#ffe38a">📶</div>
        <div class="rvinfo"><div class="rvn">難度：${forceTier?TIER_NAME[forceTier]:'自動（依精熟度）'}</div>
          <div class="rvd">自動模式會依你對各主題的熟練度調整</div></div></div>
      <div class="rvrow" data-m="daily">
        <div class="rvi" style="background:#8fe86a22;color:#8fe86a">📅</div>
        <div class="rvinfo"><div class="rvn">每日 10 題</div>
          <div class="rvd">混合各冊，快速暖身</div></div></div>
    </div>
    <button class="go" id="rvLog" style="background:linear-gradient(180deg,#8fd0ff,#3f7fd0);border-color:#1a3a6a;color:#0a1030">📊 學習日誌</button>
    <button class="go" id="ok">返回</button>`,introScreen,el=>{
      if(el.id==='rvLog'){ setTimeout(logScreen,10); return true; }
      const row=el.closest('.rvrow'); if(!row) return false;
      const m=row.dataset.m;
      if(m==='wrong'){
        if(!(S.wrong||[]).length){ toast('目前沒有錯題',1400); return false; }
        startReview('錯題重練',(S.wrong||[]).slice(0,10).map(w=>({...w})));
      }
      else if(m==='weak'){
        const w=weakTopics(4);
        if(!w.length){ toast('先多練幾題才能分析弱點',1600); return false; }
        startReview('弱點強化',genByTopics(w.map(x=>x.t),10));
      }
      else if(m==='tier'){ forceTier=(forceTier+1)%4; setTimeout(reviewScreen,10); return true; }
      else if(m==='pick'){ setTimeout(pickVolScreen,10); }
      else startReview('每日 10 題',genMixed(10));
      return true;
    });
}

function genByTopics(tags,n){
  const out=[];
  let guard=0;
  while(out.length<n&&guard++<600){
    const v=1+rand(6);
    const gens=QGEN[v]||[];
    if(!gens.length)continue;
    const q=gens[rand(gens.length)]();
    if(tags.includes(q.tag)) out.push(q);
  }
  while(out.length<n){                       // 湊不滿就補混合題
    const v=1+rand(6); const gens=QGEN[v]||[];
    if(gens.length) out.push(gens[rand(gens.length)]());
    else break;
  }
  return out;
}

function genMixed(n){
  const out=[];
  for(let i=0;i<n;i++){
    const v=1+rand(6); const gens=QGEN[v]||[];
    if(gens.length) out.push(gens[rand(gens.length)]());
  }
  return out;
}

function pickVolScreen(){
  const rows=[1,2,3,4,5,6].map(v=>{
    const gens=QGEN[v]||[];
    const tags=new Set();
    for(let i=0;i<200;i++) if(gens.length) tags.add(gens[rand(gens.length)]().tag);
    const ms=[...tags].map(t=>mastery(t)).filter(m=>m>0);
    const avg=ms.length?(ms.reduce((a,b)=>a+b,0)/ms.length):0;
    return `<div class="rvrow" data-v="${v}">
      <div class="rvi" style="background:#4a3b7333;color:#cbbde8">${v}</div>
      <div class="rvinfo"><div class="rvn">第 ${v} 冊</div>
        <div class="rvd">${[...tags].slice(0,4).join('、')}${tags.size>4?'…':''}</div>
        <div class="rvstars">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5-Math.round(avg))}</div>
      </div></div>`;
  }).join('');
  overlay(`<div class="kicker">SELF STUDY</div><h1>🎯 自選單元</h1>
    <div class="rank">你自己決定要練什麼</div>
    <div class="desc" style="margin-bottom:6px">星星是<b>精熟度</b>，會隨時間衰退 —— 久沒練的主題要回來複習。</div>
    <div id="rvlist">${rows}</div>
    <button class="go" id="ok">返回</button>`,()=>reviewScreen(),el=>{
      const row=el.closest('.rvrow'); if(!row) return false;
      const v=+row.dataset.v;
      const gens=QGEN[v]||[];
      const qs=[]; for(let i=0;i<10&&gens.length;i++) qs.push(gens[rand(gens.length)]());
      startReview('第 '+v+' 冊練習',qs);
      return true;
    });
}

function startReview(title,qs){
  if(!qs||!qs.length){ toast('沒有題目可以練',1400); return; }
  reviewSes={title,qs,i:0,ok:0,wrongTags:[]};
  nextReview();
}

function nextReview(){
  const R=reviewSes;
  if(!R)return;
  if(R.i>=R.qs.length){ endReview(); return; }
  const q=R.qs[R.i];
  const opts=shuffle(q.opts.slice());
  overlay(`<div class="kicker">${R.title} · ${R.i+1}/${R.qs.length}${q.tag?' · '+q.tag:''}</div>
    <h1 style="font-size:19px;line-height:1.5">${q.q}</h1>
    ${q.fig?`<div class="qfig">${q.fig}</div>`:''}
    <div class="rvbar"><i style="width:${R.i/R.qs.length*100}%"></i></div>
    <div id="optList">${opts.map(o=>`<div class="opt" data-v="${o}">${o}</div>`).join('')}</div>`,
    null,el=>{
      const row=el.closest('.opt'); if(!row) return false;
      const ok=row.dataset.v===q.ans;
      if(ok)R.ok++; else R.wrongTags.push(q.tag||'');
      recordTopic(q.tag,ok);
      quizStats.total++; if(ok)quizStats.ok++;
      if(ok){ S.meta=S.meta||{souls:0}; S.meta.souls=(S.meta.souls||0)+1; }
      else recordWrong(q);
      if(ok&&(S.wrong||[]).length) clearWrong(q.q);
      saveChar();
      setTimeout(()=>overlay(`<div class="kicker">${ok?'CORRECT':'INCORRECT'}</div>
        <h1 style="color:${ok?'#8fe86a':'#ff6a6a'};font-size:22px">${ok?'答對了':'再想一次'}</h1>
        ${q.fig?`<div class="qfig small">${q.fig}</div>`:''}
        <div class="rank">正解：${q.ans}</div>
        <div class="desc">${q.sol||''}</div>
        <button class="go" id="ok">${R.i+1>=R.qs.length?'看成績':'下一題'}</button>`,
        ()=>{ R.i++; nextReview(); }),10);
      return true;
    });
}

function endReview(){
  const R=reviewSes; reviewSes=null;
  const pct=Math.round(R.ok/R.qs.length*100);
  const weak=[...new Set(R.wrongTags.filter(Boolean))];
  classroomCheckpoint('review',{title:R.title});
  overlay(`<div class="kicker">REVIEW DONE</div><h1>${R.title} 完成</h1>
    <div class="rank">答對 ${R.ok} / ${R.qs.length}　正確率 ${pct}%</div>
    <div class="mathbox"><div class="mh">獲得</div>
      <div class="ml">✦ ${R.ok} 知識點（可在輪迴殿堂使用）</div>
      ${weak.length?`<div class="mh" style="margin-top:8px">還要加強</div>
        ${weak.map(t=>`<div class="ml">· ${t}　精熟度 ${'★'.repeat(mastery(t))}${'☆'.repeat(5-mastery(t))}</div>`).join('')}`
        :'<div class="ml" style="color:#8fe86a;margin-top:6px">這一輪沒有答錯 — 很扎實！</div>'}
    </div>
    <button class="go" id="again">再練一輪</button>
    <button class="go" id="ok" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">結束</button>`,
    reviewScreen,el=>{
      if(el.id!=='again')return false;
      setTimeout(reviewScreen,10); return true;
    });
}

function logScreen(){
  const ts=allTopics().map(t=>({t,m:mastery(t),s:topicStat(t)}))
    .sort((a,b)=>a.m-b.m||b.s.total-a.s.total);
  const M=S.meta||{};
  const rows=ts.length?ts.map(x=>{
    const acc=x.s.total?Math.round(x.s.ok/x.s.total*100):0;
    const days=x.s.last?Math.floor((Date.now()-x.s.last)/86400000):null;
    return `<div class="lgrow">
      <span class="lgn">${x.t}</span>
      <span class="lgstar" style="color:${x.m>=4?'#8fe86a':x.m>=2?'#ffe38a':'#ff9a5a'}">
        ${'★'.repeat(x.m)}${'☆'.repeat(5-x.m)}</span>
      <span class="lgd">${x.s.ok}/${x.s.total}（${acc}%）${days!==null&&days>7?'　⚠ '+days+' 天沒練':''}</span>
    </div>`;
  }).join('') : '<div class="pempty">還沒有作答紀錄</div>';
  overlay(`<div class="kicker">LEARNING LOG</div><h1>📊 學習日誌</h1>
    <div class="rank">累計 ${M.totalQ||0} 題　答對 ${M.totalOk||0} 題</div>
    <div class="desc" style="margin-bottom:6px;font-size:11px">
      精熟度 = 正確率 + 連續答對 − 時間衰退。<b>超過一週沒練會退步</b>。</div>
    <div id="lglist">${rows}</div>
    <button class="go" id="ok">返回</button>`,()=>reviewScreen());
}

function genNegFracCmp(){
  const mk=()=>{const d=2+rand(8); return {n:-(1+rand(d-1)),d};};
  let A=mk(),B=mk(),guard=0;
  while(A.n/A.d===B.n/B.d&&guard++<50) B=mk();
  const leftBig=(A.n/A.d)>(B.n/B.d);
  const m=shuf4(leftBig?'左邊大':'右邊大',[leftBig?'右邊大':'左邊大'],g=>'選項'+g);
  return {q:`哪一邊比較大？<br><b style="font-size:20px">${sgnS(A.n)}/${A.d}</b>
      　　vs　　<b style="font-size:20px">${sgnS(B.n)}/${B.d}</b>`,
    opts:m.opts,ans:m.ans,
    sol:`通分比較：${sgnS(A.n)}/${A.d} = ${(A.n/A.d).toFixed(3)}，${sgnS(B.n)}/${B.d} = ${(B.n/B.d).toFixed(3)}。
      <b>負數越靠近 0 越大</b> → ${leftBig?'左':'右'}邊大。`,
    tag:'負分數比大小'};
}

function genNegMul(){
  const mode=rand(3);
  let a,b;
  if(mode===0){ a=-(2+rand(11)); b=-(2+rand(11)); }        // 負×負
  else if(mode===1){ a=-(2+rand(11)); b=2+rand(11); }      // 負×正
  else { a=2+rand(11); b=-(2+rand(11)); }
  const r=a*b;
  const m=shuf4(sgnS(r),[sgnS(-r),sgnS(a+b),sgnS(r+a)],g=>sgnS(r+(g+1)*(r>0?1:-1)));
  return {q:`${parS(a)} × ${parS(b)} = ?`,opts:m.opts,ans:m.ans,
    sol:`同號得正、異號得負：${Math.abs(a)}×${Math.abs(b)} = ${Math.abs(r)}，符號為${r>0?'正':'負'} → ${sgnS(r)}`,
    tag:'負整數乘法'};
}

function genNegDiv(){
  const b=-(2+rand(9)), q=(rand(2)?1:-1)*(2+rand(9));
  const a=b*q;
  const m=shuf4(sgnS(q),[sgnS(-q),sgnS(a-b),sgnS(q+1)],g=>sgnS(q+g+1));
  return {q:`${parS(a)} ÷ ${parS(b)} = ?`,opts:m.opts,ans:m.ans,
    sol:`異號得負、同號得正：${Math.abs(a)}÷${Math.abs(b)} = ${Math.abs(q)} → ${sgnS(q)}`,
    tag:'負整數除法'};
}

function genExpMul(){
  const neg=rand(2)===1;
  const base=neg?-(2+rand(3)):(2+rand(4));
  const m1=2+rand(4), n1=2+rand(4);
  const bs=neg?`(${sgnS(base)})`:`${base}`;
  const ans=m1+n1;
  const mm=shuf4(''+ans,[''+(m1*n1),''+(ans+1),''+Math.abs(m1-n1)],g=>''+(ans+g+1));
  return {q:`寶石刻痕：<b>${bs}<sup>${m1}</sup> × ${bs}<sup>${n1}</sup> = ${bs}<sup>?</sup></b>`,
    opts:mm.opts,ans:mm.ans,
    sol:`同底數相乘，指數<b>相加</b>：${m1} + ${n1} = ${ans}`,
    tag:'指數乘法'};
}

function genMulFormula(){
  const a=(rand(2)?1:-1)*(1+rand(9));
  if(rand(2)){
    const ans=`x² ${a*2<0?'−':'+'} ${Math.abs(2*a)}x + ${a*a}`;
    const m=shuf4(ans,[`x² + ${a*a}`,`x² ${a*2<0?'+':'−'} ${Math.abs(2*a)}x + ${a*a}`,
      `x² ${a*2<0?'−':'+'} ${Math.abs(2*a)}x − ${a*a}`],g=>`x² + ${Math.abs(2*a)+g+1}x + ${a*a}`);
    return {q:`寶石刻痕：展開 <b>(x ${a<0?'−':'+'} ${Math.abs(a)})²</b>`,
      opts:m.opts,ans:m.ans,
      sol:`(a+b)² = a² + 2ab + b²：x² + 2(${sgnS(a)})x + (${sgnS(a)})² = ${ans}`,
      tag:'完全平方公式'};
  }
  const k=1+rand(9);
  const ans=`x² − ${k*k}`;
  const m=shuf4(ans,[`x² + ${k*k}`,`x² − ${2*k}x + ${k*k}`,`x² − ${k}`],g=>`x² − ${k*k+g+1}`);
  return {q:`寶石刻痕：展開 <b>(x + ${k})(x − ${k})</b>`,opts:m.opts,ans:m.ans,
    sol:`平方差公式 (a+b)(a−b) = a² − b² → x² − ${k}² = ${ans}`,tag:'平方差公式'};
}

function genPrimeFactor(){
  const p1=[2,3][rand(2)], p2=[3,5,7][rand(3)];
  const e1=2+rand(2), e2=1+rand(2);
  const n=Math.pow(p1,e1)*Math.pow(p2,e2);
  if(p1===p2) return genPrimeFactor();
  const fmt=(a,x,b,y)=>`${a}${x>1?'^'+x:''} × ${b}${y>1?'^'+y:''}`;
  const ans=fmt(p1,e1,p2,e2);
  const m=shuf4(ans,[fmt(p1,e2,p2,e1),fmt(p1,e1+1,p2,e2),fmt(p1,e1,p2,e2+1)],
    g=>fmt(p1,e1,p2,e2+g+2));
  return {q:`拆解寶石：把 <b>${n}</b> 分解成質因數標準式`,opts:m.opts,ans:m.ans,
    sol:`${n} = ${ans}（標準式：底數由小到大，指數寫在右上）`,
    tag:'質因數分解'};
}

function genFactorSigned(){
  const a=(rand(2)?1:-1)*(1+rand(8));
  const b=(rand(2)?1:-1)*(1+rand(8));
  const sum=a+b, prod=a*b;
  const f=v=>`(x ${v<0?'−':'+'} ${Math.abs(v)})`;
  const ans=`${f(a)}${f(b)}`;
  const m=shuf4(ans,[`${f(-a)}${f(-b)}`,`${f(a)}${f(-b)}`,`${f(a+1)}${f(b)}`],
    g=>`${f(a+g+2)}${f(b)}`);
  const mid=sum===0?'':`${sum<0?'−':'+'} ${Math.abs(sum)}x `;
  return {q:`拆解寶石：因式分解 <b>x² ${mid}${prod<0?'−':'+'} ${Math.abs(prod)}</b>`,
    opts:m.opts,ans:m.ans,
    sol:`找兩數：相乘得 ${prod}、相加得 ${sum} → ${sgnS(a)} 與 ${sgnS(b)}`,
    tag:'因式分解'};
}

function genSocketQ(){
  return zVol()<=2 ? genExpMul() : genMulFormula();
}

function genExtractQ(){
  return zVol()<=2 ? genPrimeFactor() : genFactorSigned();
}

function genChestQ(){
  const v=zVol();
  if(v<=2) return genHCF();
  if(v<=4){
    const k=2+rand(7), m2=2+rand(11), n=k*k*m2;
    const mm=shuf4(`${k}√${m2}`,[`${m2}√${k}`,`${k*m2}`,`${k+1}√${m2}`],g=>`${k+g}√${m2}`);
    return {q:`化簡 √${n}`,opts:mm.opts,ans:mm.ans,
      sol:`${n} = ${k*k}×${m2}，√${k*k} = ${k} → ${k}√${m2}`,tag:'最簡根式'};
  }
  return genProbability();
}

function genRareQ(){
  if(zVol()<=1){
    const a=3+rand(12), b=1+rand(a-1);
    const m=shuf4(''+a,[''+b,''+(a+b),''+(a-b)],g=>''+(a+g));
    return {q:`兩數相加得 <b>${a+b}</b>、相減得 <b>${a-b}</b>。較大的數是多少？`,
      opts:m.opts,ans:m.ans,
      sol:`(和 + 差) ÷ 2 = (${a+b} + ${a-b}) ÷ 2 = ${a}`,tag:'和差問題'};
  }
  return genChickenRabbit();
}

function genDoorSteps(){
  if(zVol()<=1){
    const a=2+rand(4), x=2+rand(8), b=(1+rand(6))*2, c=a*x+b;
    return {title:`${a}x + ${b} = ${c}`,
      steps:[
        {t:`兩邊同減 ${b}：${a}x = ${c-b}`},
        {t:`兩邊同除以 ${a}：x = ${x}`},
        {t:`代回檢驗：${a}×${x} + ${b} = ${c} ✓`},
      ],
      traps:[
        {t:`兩邊同減 ${a}`,why:`要移走的是常數 ${b}，不是 x 的係數 ${a}。`},
        {t:`兩邊同乘 ${a}`,why:`x 已經被乘了 ${a}，要「除以」才能還原。`},
      ],
      ans:x};
  }
  return genStepPuzzle();
}

function genShopQ(){
  if(zVol()<=1){
    const p2=3+rand(18), n=2+rand(9);
    const m=shuf4(''+(p2*n),[''+(p2+n),''+(p2*n-p2),''+(p2*(n+1))],g=>''+(p2*n+g));
    return {q:`商人：「一張卡 ${p2} 金幣，買 ${n} 張要多少？」`,opts:m.opts,ans:m.ans,
      sol:`${p2} × ${n} = ${p2*n}`,tag:'乘法應用'};
  }
  return genInequality();
}

function genLineQ(){
  const v=zVol();
  const R=(a,b)=>a+rand(b-a+1);
  const nz=w=>w===0?(rand(2)?2:-2):w;
  /* 七年級版：一次方程式、絕對值、相反數 —— 答案不再是一眼可見 */
  const easy=[
    // 兩步一次方程式（係數與常數都不小）
    ()=>{const x=nz(R(-5,5)),a=R(2,4),b=R(-9,9),c=a*x+b;
      return {t:`${a}x ${b<0?'−':'+'} ${Math.abs(b)} = ${c}`,f:w=>a*w+b===c,ans:x,
        why:`移項：${a}x = ${c} ${b<0?'+':'−'} ${Math.abs(b)} = ${a*x}，再除以 ${a} → x = ${x}`};},
    // 絕對值方程式：|x − h| = k，兩解取符號條件
    ()=>{let h,k,x;
      do{ h=R(-3,3); k=R(1,4); x=(rand(2)?h+k:h-k); }while(x<-5||x>5);
      const pos=(x>h);
      return {t:`|x ${h<0?'+':'−'} ${Math.abs(h)}| = ${k}　且　x ${pos?'>':'<'} ${h}`,
        f:w=>Math.abs(w-h)===k&&(pos?w>h:w<h),ans:x,
        why:`|x−(${h})| = ${k} 有兩解 ${h+k} 與 ${h-k}；加上 x ${pos?'>':'<'} ${h} 後唯一解是 ${x}`};},
    // 相反數
    ()=>{const x=nz(R(-5,5));
      return {t:`x 的<b>相反數</b>是 ${-x}`,f:w=>w===x,ans:x,
        why:`相反數相加為 0：${x} + (${-x}) = 0，所以 x = ${x}`};},
    // 相反數 + 運算
    ()=>{const x=nz(R(-5,5)),k=R(2,6),res=-x+k;
      return {t:`x 的相反數加上 ${k} 等於 ${res}`,f:w=>(-w)+k===res,ans:x,
        why:`−x + ${k} = ${res} → −x = ${res-k} → x = ${x}`};},
    // 絕對值比較（唯一整數解）
    ()=>{const x=nz(R(-5,5));const a=Math.abs(x);
      return {t:`|x| = ${a}　且　x ${x<0?'< 0':'> 0'}`,
        f:w=>Math.abs(w)===a&&(x<0?w<0:w>0),ans:x,
        why:`|x| = ${a} 有 ${a} 與 −${a} 兩解；加上符號條件後只剩 x = ${x}`};},
    // 移項兩側都有 x
    ()=>{const x=nz(R(-4,4)),a=R(3,5),b=R(1,2);   // 保證 a≠b，否則兩側相同會變成全解
      const k=(a-b)*x;
      return {t:`${a}x = ${b}x ${k<0?'−':'+'} ${Math.abs(k)}`,f:w=>a*w===b*w+k,ans:x,
        why:`${a}x − ${b}x = ${k} → ${a-b}x = ${k} → x = ${x}`};},
  ];
  if(v<=2) return easy[rand(easy.length)]();
  return genUniqueLine();
}

function genGaussQuiz(){
  const a1=1+rand(4), d=1+rand(3), n=4+rand(5);
  const an=a1+(n-1)*d, sum=n*(a1+an)/2;
  const m=shuf4(String(sum),[String(n*(a1+an)),String((a1+an)/2*(n+1)),String(sum+n)],g=>sum+g*2);
  return {q:`等差數列 首項 ${a1}、公差 ${d}、共 ${n} 項，總和 Sₙ 是多少？`,
    opts:m.opts,ans:m.ans,
    sol:`末項 aₙ = ${a1}+(${n}−1)×${d} = ${an}；Sₙ = n(a₁+aₙ)/2 = ${n}×(${a1}+${an})/2 = ${sum}。`,
    tag:'等差級數'};
}

function genEquationAdv(){
  const a=2+rand(4), b=1+rand(6), x=2+rand(8);
  const c=a*(x+b);
  const m=shuf4(String(x),[String(x+1),String(c/a),String(x-1)],g=>x+g+1);
  return {q:`解方程式：　${a}(x + ${b}) = ${c}`,opts:m.opts,ans:m.ans,
    sol:`去括號：${a}x + ${a*b} = ${c} → ${a}x = ${c-a*b} → x = ${x}。`,tag:'含括號方程式'};
}

function genFactorAdv(){
  const a=2+rand(2), b=1+rand(4), d2=1+rand(4);
  // 若 a 與 b 有公因數，(ax+b) 還能再提出公因數 → 不是最完整的分解，重抽
  if(gcd(a,b)!==1 || gcd(gcd(a,a*d2+b),b*d2)!==1) return genFactorAdv();
  const mid=a*d2+b, cst=b*d2;
  const correct=`(${a}x + ${b})(x + ${d2})`;
  const m=shuf4(correct,[`(${a}x + ${d2})(x + ${b})`,`(${a}x + ${b*2})(x + ${d2})`,
    `(x + ${b})(${a}x + ${d2})`],g=>`(${a}x + ${b+g})(x + ${d2+g})`);
  return {q:`因式分解：　${a}x² + ${mid}x + ${cst}`,opts:m.opts,ans:m.ans,
    sol:`拆 ${a}=${a}×1、${cst}=${b}×${d2}，交叉相乘 ${a}×${d2}+1×${b} = ${mid} ✓`,tag:'十字交乘'};
}

function genCompare(){
  const base=100+rand(150), per=2+rand(4), flat=per+1+rand(3);
  const cross=Math.ceil(base/(flat-per));
  const m=shuf4(String(cross),[String(cross+5),String(Math.floor(base/flat)),String(cross-3)],g=>cross+g*3);
  return {q:`A 方案：月租 ${base} 元，每分鐘 ${per} 元。B 方案：無月租，每分鐘 ${flat} 元。<br>講幾分鐘以上時 A 才比較划算？`,
    opts:m.opts,ans:m.ans,
    sol:`${base}+${per}x < ${flat}x → ${base} < ${flat-per}x → x > ${(base/(flat-per)).toFixed(1)}，取 ${cross} 分鐘。`,
    tag:'方案比較'};
}

function genProbAdv(){
  const n=[2,3,4][rand(3)];
  const miss=`${(n-1)}/${n}`;
  const both=`${(n-1)*(n-1)}/${n*n}`;
  const atLeast=`${n*n-(n-1)*(n-1)}/${n*n}`;
  const m=shuf4(atLeast,[both,miss,`1/${n*n}`],g=>`${g}/${n*n}`);
  return {q:`每次中獎機率 1/${n}，連抽兩次，<b>至少中一次</b>的機率是多少？`,
    opts:m.opts,ans:m.ans,
    sol:`兩次都沒中 = ${miss}×${miss} = ${both}；至少一次 = 1 − ${both} = ${atLeast}。`,tag:'兩階段事件'};
}

function genIQR(){
  const arr=Array.from({length:8},()=>1+rand(20)).sort((a,b)=>a-b);
  const q1=(arr[1]+arr[2])/2, q3=(arr[5]+arr[6])/2, iqr=q3-q1;
  const m=shuf4(String(iqr),[String(q3),String(q1),String(arr[7]-arr[0])],g=>iqr+g);
  return {q:`資料（已排序）：${arr.join('、')}<br>四分位距 IQR 是多少？`,opts:m.opts,ans:m.ans,
    sol:`Q₁=(${arr[1]}+${arr[2]})/2=${q1}，Q₃=(${arr[5]}+${arr[6]})/2=${q3}，IQR = ${q3}−${q1} = ${iqr}。`,
    tag:'四分位距'};
}

function genGuideQuiz(){
  const T=[
   {q:'樓梯走不上去，畫面說「被封印了」。你該先做什麼？',
    ans:'找到這一層的鑰匙',
    w:['多打幾隻怪','回到上一層','等幾回合再試'],
    sol:'每層樓的樓梯都要先取得該層的鑰匙才會解除封印。'},
   {q:'你想觸發「先制攻擊」，應該從哪個方向撞向怪物？',
    ans:'牠的正後方',
    w:['正面直接衝','從上方','任何方向都可以'],
    sol:'只有從怪物面向的正後方撞上去才是背後突襲：敵人會少行動一回合，起手仍固定隨機 5 張。'},
   {q:'出牌時卡片標示「重算」，代表什麼？',
    ans:'可以打，但連擊會歸 1',
    w:['不能打出','打出後會扣血','會消耗兩倍法力'],
    sol:'費用不等於序列值的牌照樣生效，只是連擊重新計算。'},
   {q:'生命要怎麼回復？',
    ans:'打出長連擊，或使用稀有藥水',
    w:['過關就會回滿','每回合自動回復','升級時回滿'],
    sol:'戰後依最長連擊回血（連擊×1.5），另外就只有稀有藥水。'},
   {q:'通用卡（✦）最重要的功能是什麼？',
    ans:'無視目前費用需求並接續連擊',
    w:['造成大量傷害','回復法力上限','讓敵人跳過回合'],
    sol:'通用卡也要支付牌面費用，但能無視序列需要的數字接續連擊，部分卡還會額外回魔。'},
  ][rand(5)];
  const m=shuf4(T.ans,T.w,g=>'其他選項'+g);
  return {q:T.q,opts:m.opts,ans:m.ans,sol:T.sol,tag:'地城基礎'};
}

function genSeqQuiz(){
  const a1=rand(3), d=1+rand(4), n=3+rand(4);
  const an=a1+(n-1)*d;
  const m=shuf4(String(an),[String(a1+n*d),String(a1+(n-1)*(d+1)),String(an+d)],g=>an+g+1);
  return {q:`等差數列首項 a₁ = ${a1}、公差 d = ${d}，第 ${n} 項是多少？`,
    opts:m.opts,ans:m.ans,
    sol:`aₙ = a₁ + (n−1)d = ${a1} + (${n}−1)×${d} = ${a1} + ${(n-1)*d} = ${an}。`,tag:'等差數列'};
}

function genMedian(){
  const arr=Array.from({length:5},()=>2+rand(12));
  const st=arr.slice().sort((x,y)=>x-y);
  const med=st[2];
  const avg=(arr.reduce((a,b)=>a+b,0)/5);
  const m=shuf4(String(med),[String(Math.round(avg)),String(st[0]),String(st[4])],g=>med+g);
  return {q:`資料 ${arr.join('、')}　中位數是多少？`,opts:m.opts,ans:m.ans,
    sol:`排序後為 ${st.join('、')}，正中間（第 3 個）是 ${med}。`,tag:'中位數'};
}

function npcArt(kind){
  const c=document.createElement('canvas');c.width=c.height=32;
  const g=c.getContext('2d');
  const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
  const face=()=>{R(11,6,10,9,'#f0d0a8');R(13,9,2,2,'#2a1a10');R(18,9,2,2,'#2a1a10');};
  if(kind==='sage'){ R(9,2,14,5,'#4a7ab8');face();R(11,13,10,6,'#e8e8f0');
    R(8,15,16,15,'#3f5a8a');R(8,15,16,3,'#5a7ab8');R(25,8,2,22,'#8a6f2a');R(24,5,4,4,'#8fd0ff'); }
  else if(kind==='gate'){ R(9,3,14,4,'#8a6f2a');face();R(7,15,18,15,'#6b5320');
    R(7,15,18,3,'#a8801f');R(12,19,8,8,'#ecc24e');R(3,12,4,18,'#5a4512'); }
  else if(kind==='smith'){ R(10,4,12,4,'#7a3a1a');face();R(11,13,10,5,'#8a5a2a');
    R(7,16,18,14,'#a0522d');R(7,16,18,3,'#c06a3a');R(2,18,6,4,'#5a5a6a');R(1,14,4,6,'#8a8a9a'); }
  else if(kind==='merchant'){ R(8,3,16,5,'#3f7a3a');face();
    R(8,15,16,15,'#4a8a45');R(8,15,16,3,'#6aaa60');R(24,17,6,8,'#8a5a2a');R(24,17,6,2,'#b5772f'); }
  else if(kind==='teller'){ R(9,2,14,6,'#6a3a8a');face();
    R(8,15,16,15,'#7a4a9a');R(8,15,16,3,'#9a6aba');R(13,19,6,6,'#e26bd6');R(14,20,4,4,'#f0a8e8'); }
  else if(kind==='guide'){ R(9,2,14,5,'#3f7a3a');face();
    R(8,15,16,15,'#4a9a55');R(8,15,16,3,'#7ac48a');
    R(24,10,3,20,'#8a6f2a');R(23,7,5,4,'#8fe86a');R(6,29,20,2,'#2a3a2a'); }
  else { R(9,3,14,5,'#5a7a9a');face();R(11,13,10,5,'#dfe8ff');
    R(8,15,16,15,'#6a8aaa');R(8,15,16,3,'#8aaaca');R(11,19,10,8,'#eef4ff');
    R(12,21,3,4,'#3f7fd0');R(16,20,3,5,'#3f7fd0'); }
  return c;
}

function coursePortalGroups(vol){
  const source=classroomLaunch&&Array.isArray(classroomLaunch.questionBank)&&classroomLaunch.questionBank.length
    ? classroomLaunch.questionBank
    : (Array.isArray(window.CLASS_RPG_QUESTION_BANK)?window.CLASS_RPG_QUESTION_BANK:[]);
  const map=new Map();
  source.forEach((entry,entryIndex)=>{
    const qs=Array.isArray(entry.qs)?entry.qs:[entry];
    const v=Number(entry.vol||entry.v)||Number(vol)||1;
    if(v!==Number(vol))return;
    const chap=String(entry.chap||''),unit=String(entry.unit||''),topic=String(entry.topic||'');
    if(!chap||!unit)return;
    const scopeKey=courseScopeKey(chap,unit),key=scopeKey+'|'+topic;
    if(!map.has(key))map.set(key,{vol:v,grade:String(entry.grade||''),chap,unit,topic,scopeKey,qs:[],order:entryIndex});
    const group=map.get(key);
    qs.forEach(q=>{
      if(!q||!q.q||!Array.isArray(q.opts)||!q.ans)return;
      group.qs.push({v,vol:v,grade:String(q.grade||entry.grade||''),chap,unit,topic,
        scopeKey,source:q.source||entry.source||'course',q:String(q.q),opts:q.opts.slice(0,4).map(String),
        ans:String(q.ans),sol:String(q.sol||''),fig:String(q.fig||'')});
    });
  });
  return [...map.values()].filter(g=>g.qs.length).sort((a,b)=>a.order-b.order);
}

function currentCoursePortalRef(vol){
  const groups=coursePortalGroups(vol);
  if(!groups.length)return null;
  const i=(Math.max(0,Number(S.zone)||0)*11+Math.max(0,Number(fl)||0))%groups.length;
  return groups[i];
}

function appendCoursePortalQuestions(ref){
  if(!ref)return {added:0,total:0};
  const seen=new Set(QBANK.map(q=>String(q.q||'').replace(/[\s　]+/g,'').toLowerCase()));
  let added=0;
  ref.qs.forEach((q,n)=>{
    const sig=String(q.q||'').replace(/[\s　]+/g,'').toLowerCase();
    if(!sig||seen.has(sig))return;
    const item=visualizeGeometryQuestion(classroomNumberVariant(Object.assign({},q,{tag:['課程目錄',q.unit,q.topic].filter(Boolean).join(' · ')}),q.v,n));
    QBANK.push(item);seen.add(sig);added++;
  });
  /* 同單元的地下城程序題也可追加，但絕不跨到別章或別單元。 */
  DUNGEON_BUILTIN_QUESTIONS.filter(q=>Number(q.v)===Number(ref.vol)&&q.scopeKey===ref.scopeKey).forEach(q=>{
    const sig=String(q.q||'').replace(/[\s　]+/g,'').toLowerCase();
    if(seen.has(sig))return;QBANK.push(Object.assign({},q));seen.add(sig);added++;
  });
  qQueue={};
  return {added,total:QBANK.filter(q=>q.scopeKey===ref.scopeKey).length};
}

function coursePortalUrl(ref){
  const u=new URL('Lessionindex.html',location.href);
  u.searchParams.set('vol',String(ref.vol));u.searchParams.set('chap',ref.chap);u.searchParams.set('unit',ref.unit);
  if(ref.topic)u.searchParams.set('topic',ref.topic);
  u.searchParams.set('from','dungeon');
  return u.href;
}

function coursePortalQuestion(ref){
  const pool=QBANK.filter(q=>q.scopeKey===ref.scopeKey&&(q.topic===ref.topic||!ref.topic));
  const fallback=QBANK.filter(q=>q.scopeKey===ref.scopeKey);
  const list=pool.length?pool:fallback;
  return list.length?list[rand(list.length)]:null;
}

function coursePortalLesson(key,pr,ref){
  overlay(`<div class="course-viewer">
    <div class="course-viewer-head"><div><b>📖 ${hesc(ref.chap)} · ${hesc(ref.unit)}</b><span>${hesc(ref.topic||ref.unit)}・教學會保留在地下城內</span></div>
      <button class="go course-close" id="courseLessonBack">返回 NPC</button></div>
    <iframe class="course-viewer-frame" title="${hesc(ref.topic||ref.unit)}課程教學" src="${hesc(coursePortalUrl(ref))}" loading="eager"></iframe>
  </div>`,null,el=>{
    if(el.id==='courseLessonBack'){setTimeout(()=>coursePortalEnter(key,pr),10);return true;}
    return false;
  });
  $('veilCard').classList.add('course-wide');
}

function coursePortalEnter(key,pr){
  const base=NPCS[key],ref=currentCoursePortalRef(base.vol),loaded=appendCoursePortalQuestions(ref);
  if(!ref){
    overlay(`<div class="kicker">COURSE LINK</div><h1>找不到相符課程</h1><div class="desc">第 ${base.vol} 冊的課程目錄題庫尚未載入。請確認 <b>question-bank-data.js</b> 與地下城放在同一個資料夾。</div><button class="go" id="ok">返回地下城</button>`,backToDungeon);return;
  }
  overlay(`<div class="npcbox"><div class="nhead"><canvas class="nport" id="nport"></canvas><div>
      <div class="nname" style="color:${base.col}">${hesc(base.name)}</div>
      <div class="ntopic">${hesc(ref.chap)} · ${hesc(ref.unit)}</div></div></div>
      <div class="nintro">這裡不重複製作教學。你可以直接開啟<b>課程目錄原教學</b>，或用同一單元題目練習。</div>
      <div class="dstep now"><span class="dn">↗</span><div class="dtx"><b>${hesc(ref.topic||ref.unit)}</b><div class="dformula">已載入同單元 ${loaded.total} 題${loaded.added?'（本次追加 '+loaded.added+' 題）':''}</div></div></div>
    </div>
    <button class="go" id="courseOpen">📖 開啟這個單元的課程教學</button>
    <button class="go" id="courseQuiz" style="background:linear-gradient(180deg,#64c78c,#37865c);border-color:#1d5639">📝 練習這個單元</button>
    <button class="go" id="courseLeave" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">先繼續探索</button>`,
    null,el=>{
      if(el.id==='courseOpen'){if(pr)pr.talked=1;setTimeout(()=>coursePortalLesson(key,pr,ref),10);return true;}
      if(el.id==='courseQuiz'){
        const q=coursePortalQuestion(ref);if(!q){toast('這個單元目前沒有可用題目',1600);return true;}
        if(pr)pr.talked=1;setTimeout(()=>quizAsk(q,()=>coursePortalEnter(key,pr),ref.unit),10);return true;
      }
      if(el.id==='courseLeave'){backToDungeon();return true;}
      return false;
    });
  const cv=$('nport');if(cv){cv.width=cv.height=32;cv.getContext('2d').drawImage(npcArt(base.art),0,0);}
}

function npcTalk(key,idx,pr,adv){
  const base=NPCS[key];
  const N = adv ? {...base,...NPC_ADV[key]} : base;
  if(classroomBankActive()&&!npcStudyQuestion)npcStudyQuestion=dungeonActionQuestion(null);
  const study=classroomBankActive()&&npcStudyQuestion?npcStudyQuestion:null;
  const steps=study?[
    {t:`本次複習單元`,f:hesc(String(study.tag||'教師指定題庫').replace(/^第\d+冊\s*·?\s*/,''))},
    {t:`先辨認題型`,f:hesc(String(study.q||'').replace(/<[^>]+>/g,'').slice(0,110))},
    {t:`解題關鍵`,f:hesc(String(study.sol||'觀察條件、找出關係，再逐步判斷。').replace(/<[^>]+>/g,'').slice(0,150))},
  ]:N.steps;
  const topic=study?String(study.tag||'教師指定單元').replace(/^第\d+冊\s*·?\s*/,''):N.topic;
  const intro=study?'我會先帶你複習老師指定的單元，再用同單元題目確認是否理解。':N.intro;
  if(idx>=steps.length){ npcQuiz(key,pr,0,adv); return; }
  // 最新一句放最上面，舊的往下推 —— 不必捲動就能看到剛講的內容
  const shown=steps.slice(0,idx+1).map((st,i)=>
    `<div class="dstep${i===idx?' now fresh':' old'}">
       <span class="dn">${i+1}</span>
       <div class="dtx">${st.t}${st.f?`<div class="dformula">${st.f}</div>`:''}</div>
     </div>`).reverse().join('');
  overlay(`<div class="npcbox">
      <div class="nhead"><canvas class="nport" id="nport"></canvas>
        <div><div class="nname" style="color:${base.col}">${base.name}${adv?' <span class="advtag">進階</span>':''}</div>
        <div class="ntopic">${hesc(topic)}</div></div>
        <div class="nprog">${idx+1} / ${steps.length}</div></div>
      ${idx===0?`<div class="nintro">「${hesc(intro)}」</div>`:''}
      <div class="dsteps">${shown}</div>
    </div>
    <button class="go" id="nNext">${idx===steps.length-1?'我懂了，出題吧':'繼續 ▼'}</button>`,
    null,el=>{
      if(el.id!=='nNext')return false;
      setTimeout(()=>npcTalk(key,idx+1,pr,adv),10);
      return true;
    });
  const cv=$('nport');
  if(cv){ cv.width=cv.height=32; cv.getContext('2d').drawImage(npcArt(base.art),0,0); }
}

function npcQuiz(key,pr,tries,adv){
  const base=NPCS[key];
  const N = adv ? {...base,...NPC_ADV[key]} : base;
  const q=npcStudyQuestion||dungeonActionQuestion(()=>N.quiz());npcStudyQuestion=null;
  quizAsk(q,ok=>{
    if(ok){
      const slot = adv ? key+'_adv' : key;
      const firstTime = !codexHas(key,adv);
      codexMark(key,adv);
      if(!npcSeen[slot]){
        npcSeen[slot]=1;
        const r=N.reward;
        if(r.k==='step')S.step+=r.v;
        else if(r.k==='mana')S.mana+=r.v;
        else if(r.k==='dmg')S.dmgMul+=r.v;
        else if(r.k==='gold')S.gold+=r.v;
        else if(r.k==='armor')S.armor+=r.v;
        else if(r.k==='maxhp'){S.maxhp+=r.v;S.hp+=r.v;}
        else if(r.k==='potion'){S.pot.heal=(S.pot.heal||0)+r.v;}
        overlay(`<div class="kicker">LESSON COMPLETE</div><h1>學會了！</h1>
          <div class="rank" style="color:${base.col};border-color:${base.col}">${base.name} 的${adv?'深奧':''}祝福</div>
          <div class="desc">「${N.topic.split('→')[0].trim()}」已掌握。<br>
            獲得永久強化：<i>${r.d}</i></div>
          <button class="go" id="ok">收下</button>`,()=>{ if(pr)pr.talked=1; backToDungeon(); });
      }else{ toast('答對了！',1200); backToDungeon(); }
    }else{
      if(tries<1){
        overlay(`<div class="kicker">HINT</div><h1 style="font-size:20px">再想一次</h1>
          <div class="rank" style="color:${N.col};border-color:${N.col}">${N.name}</div>
          <div class="desc">「別急。回去看剛才的第 ${N.steps.length-1} 步 —— 
            關鍵就在那裡。」<br><br>${q.sol}</div>
          <button class="go" id="ok">再試一題</button>`,()=>npcQuiz(key,pr,tries+1,adv));
      }else{
        overlay(`<div class="kicker">KEEP TRYING</div><h1 style="font-size:20px">下次再來吧</h1>
          <div class="rank" style="color:${base.col};border-color:${base.col}">${base.name}</div>
          <div class="desc">「這個觀念需要多練幾次。隨時回來找我，我會從頭再講一遍。」</div>
          <button class="go" id="ok">離開</button>`,backToDungeon);
      }
    }
  },N.name);
}

function npcEnter(pr){
  running=false;
  const key=pr.k, base=NPCS[key];
  if(base&&base.coursePortal){coursePortalEnter(key,pr);return;}
  if(classroomBankActive()){npcStudyQuestion=null;npcTalk(key,0,pr,false);return;}
  // 已經學過並領過獎勵 → 不再佔用地城時間，直接告知去圖鑑複習
  if(codexHas(key,false) && (!NPC_ADV[key] || codexHas(key,true))){
    pr.alive=0;
    overlay(`<div class="kicker">CODEX</div><h1 style="color:${base.col}">${base.name}</h1>
      <div class="rank">這堂課你已經學完了</div>
      <div class="desc">「該教的我都教了 —— 想複習的話，<b>學習圖鑑</b>隨時翻得到。」<br><br>
        他向你點了點頭，身影淡去。</div>
      <button class="go" id="ok">離開</button>`,backToDungeon);
    return;
  }
  // 圖鑑裡已經有這堂課 → 輪迴後不必再聽，直接給選擇
  if(codexHas(key,false)&&!npcSeen[key]){
    overlay(`<div class="npcbox">
        <div class="nhead"><canvas class="nport" id="nport2"></canvas>
          <div><div class="nname" style="color:${base.col}">${base.name}</div>
          <div class="ntopic">${base.topic}</div></div></div>
        <div class="nintro">「這堂課你上輪已經學會了 —— 要再聽一次，還是直接走？」</div>
      </div>
      <button class="go" id="npcReview">複習這堂課</button>
      <button class="go" id="npcSkip" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">已經懂了，走吧</button>`,
      null,el=>{
        if(el.id==='npcSkip'){ toast('（圖鑑中隨時可複習）',1400); backToDungeon(); return true; }
        if(el.id!=='npcReview') return false;
        setTimeout(()=>reviewLesson(key,false),10); return true;
      });
    const cv2=$('nport2');
    if(cv2){ cv2.width=cv2.height=32; cv2.getContext('2d').drawImage(npcArt(base.art),0,0); }
    return;
  }
  if(!npcSeen[key]){ npcTalk(key,0,pr,false); return; }   // 還沒學會基礎 → 直接上基礎課
  if(!NPC_ADV[key]){                       // 嚮導只有基礎課
    npcTalk(key,0,pr,false); return;
  }
  const advDone=npcSeen[key+'_adv'];
  overlay(`<div class="npcbox">
      <div class="nhead"><canvas class="nport" id="nport"></canvas>
        <div><div class="nname" style="color:${base.col}">${base.name}</div>
        <div class="ntopic">${base.topic}</div></div></div>
      <div class="nintro">「又見面了。想複習基礎，還是聽點更深的？」</div>
      <div class="lesspick">
        <div class="lp" data-a="0"><div class="lt">基礎課程 ✓</div>
          <div class="ld">${base.topic}</div></div>
        <div class="lp adv" data-a="1"><div class="lt">進階課程 ${advDone?'✓':'★'}</div>
          <div class="ld">${NPC_ADV[key].topic}</div></div>
        <div class="lp geo" data-a="2"><div class="lt">🔺 互動實驗</div>
          <div class="ld">親手操作，不用選答案</div></div>
      </div>
    </div>
    <button class="go" id="npcLeave" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">先不用</button>`,
    null,el=>{
      if(el.id==='npcLeave'){ backToDungeon(); return true; }
      const lp=el.closest('.lp'); if(!lp)return false;
      if(lp.dataset.a==='2'){
        const G=GEO_PUZZLES[rand(GEO_PUZZLES.length)];
        setTimeout(()=>G(()=>{ toast('實驗完成！',1400); backToDungeon(); }),10);
        return true;
      }
      const adv=lp.dataset.a==='1';
      setTimeout(()=>npcTalk(key,0,pr,adv),10);
      return true;
    });
  const cv=$('nport');
  if(cv){ cv.width=cv.height=32; cv.getContext('2d').drawImage(npcArt(base.art),0,0); }
}

function muralEvent(key,pos){
  running=false;
  const M=MURALS[key];
  if(muralSeen[key]){
    if(pos)delete murals[pos];backToDungeon();
    return;
  }
  overlay(`<div class="kicker">HIDDEN MURAL</div><h1 style="color:${M.col}">${M.n}</h1>
    <div class="rank" style="color:${M.col};border-color:${M.col}">${M.who}</div>
    <div class="desc">${M.tale}</div>
    <button class="go" id="ok">接受試煉</button>`,()=>{
      quizAsk(dungeonActionQuestion(()=>M.q()),ok=>{
        if(ok){
          muralSeen[key]=1;
          if(pos)delete murals[pos];
          gainCard(M.card,true);
          saveChar();
          const c=CARDS[M.card];
          overlay(`<div class="kicker">LEGENDARY</div><h1 style="color:#ffb347">獲得傳說卡</h1>
            <div class="rank" style="color:#ffb347;border-color:#ffb347">${c.n}</div>
            <div class="desc">${c.t.replace(/<\/?[a-z]+>/g,'')}<br>已加入牌組。牆上的圖騰化為光點並永久消失。</div>
            <button class="go" id="ok">收下</button>`,backToDungeon);
        }else{
          overlay(`<div class="kicker">MURAL</div><h1 style="font-size:20px">殘影搖了搖頭</h1>
            <div class="desc">「再想想。我會等你。」<br><br>壁畫仍在，隨時可以再來挑戰。</div>
            <button class="go" id="ok">離開</button>`,backToDungeon);
        }
      },dungeonActionLabel(M.who));
    });
}

function doorPuzzle(){
  running=false;
  if(classroomBankActive()){
    const q=dungeonActionQuestion(null);
    quizAsk(q,ok=>{
      if(ok){S.key=true;fbMarkDoor();updBar();toast('答對！封印解除，門開了',2000);}
      else toast('答錯了，封印門仍然關閉',1800);
      backToDungeon();
    },dungeonActionLabel('封印門複習'));
    return;
  }
  stepPuzzleAsk(ok=>{
    if(ok){ S.key=true; fbMarkDoor(); updBar(); toast('封印解除！門開了',2000); }
    else toast('符文沒有反應…再試一次',1600);
    backToDungeon();
  },'封印門');
}

function shopPuzzle(pr){
  running=false;
  quizAsk(dungeonActionQuestion(genShopQ),ok=>{
    if(ok){
      const pool=unlockedCards();
      const sp=wildFull()?pool.filter(x=>!isWild(x)):pool;
      const id=(sp.length?sp:pool)[rand((sp.length?sp:pool).length)];
      const got=gainCard(id,true);
      pr.alive=0;
      overlay(`<div class="kicker">SHOP</div><h1>交易成功</h1>
        <div class="rank">獲得卡牌：${CARDS[id].n}</div>
        <div class="desc">${CARDS[id].t.replace(/<\/?[a-z]+>/g,'')}<br>已加入牌組。</div>
        <button class="go" id="ok">收下</button>`,backToDungeon);
    }else{ toast('商人搖搖頭：「算錯了。」',1600); backToDungeon(); }
  },dungeonActionLabel('商人的考驗'));
}

function genErrorSpot(){
  const T=[
   ()=>{ const a=2+rand(6), b=3+rand(9);
     return {title:`解不等式　−${a}x > ${a*b}`,
       lines:[`兩邊同除以 −${a}`,`x > −${b}`,`所以 x > −${b}`],
       bad:1, why:`除以<b>負數</b>時不等號要<b>變號</b>，應該是 x < −${b}。`,tag:'不等式變號'};},
   ()=>{ const a=2+rand(7), b=2+rand(7);
     return {title:`展開　(x + ${a})²`,
       lines:[`= x² + ${a}²`,`= x² + ${a*a}`,`所以答案是 x² + ${a*a}`],
       bad:0, why:`漏了中間項！正確是 x² + ${2*a}x + ${a*a}，(a+b)² 有 <b>2ab</b>。`,tag:'完全平方'};},
   ()=>{ const a=1+rand(5), b=2+rand(5);
     return {title:`計算　1/${a+1} + 1/${b+1}`,
       lines:[`分子相加、分母相加`,`= 2/${a+b+2}`,`約分得最簡`],
       bad:0, why:`分數加法要<b>先通分</b>，不能分子分母各自相加。正確為 ${b+1}/${(a+1)*(b+1)} + ${a+1}/${(a+1)*(b+1)}。`,tag:'分數加法'};},
   ()=>{ const a=3+rand(8), b=2+rand(6);
     return {title:`計算　${a} − (−${b})`,
       lines:[`減負號視為減法`,`= ${a} − ${b}`,`= ${a-b}`],
       bad:1, why:`<b>減去一個負數等於加上它</b>：${a} − (−${b}) = ${a} + ${b} = ${a+b}。`,tag:'負數減法'};},
   ()=>{ const a=2+rand(5), c=(2+rand(5))*a;
     return {title:`解方程式　${a}x = ${c}`,
       lines:[`兩邊同減 ${a}`,`x = ${c-a}`,`檢驗完成`],
       bad:0, why:`x 是<b>被乘</b>了 ${a}，要<b>除以</b> ${a} 而不是減。正確為 x = ${c/a}。`,tag:'等量公理'};},
  ][rand(5)]();
  return T;
}

function errorSpotAsk(cb,label){
  const E=genErrorSpot();
  quizStats.total++;
  overlay(`<div class="kicker">${label||'FIND THE ERROR'} · ${E.tag}</div>
    <h1 style="font-size:19px">找出錯誤的那一步</h1>
    <div class="rank">${E.title}</div>
    <div class="desc" style="margin-bottom:4px">下面的推導有<b>一行</b>是錯的，點它。</div>
    <div id="errlines">${E.lines.map((l,i)=>
      `<div class="errline" data-i="${i}"><span class="eln">${i+1}</span>${l}</div>`).join('')}</div>`,
    null,el=>{
      const row=el.closest('.errline'); if(!row)return false;
      const ok=+row.dataset.i===E.bad;
      if(ok)recordQuizCorrect({tag:E.tag,tier:2});
      setTimeout(()=>overlay(`<div class="kicker">${ok?'CORRECT':'INCORRECT'}</div>
        <h1 style="color:${ok?'#8fe86a':'#ff6a6a'};text-shadow:0 3px 0 ${ok?'#14400a':'#4a0808'}">
          ${ok?'找到了！':'不是那一行'}</h1>
        <div class="rank">錯誤在第 ${E.bad+1} 行：${E.lines[E.bad]}</div>
        <div class="desc">${E.why}</div>
        <button class="go" id="ok">繼續</button>`,()=>cb(ok)),10);
      return true;
    });
}

function genStepPuzzle(){
  const a=2+rand(4), b=1+rand(6), x=2+rand(8), c=a*(x+b);
  return {
    title:`${a}(x + ${b}) = ${c}`,
    steps:[
      {t:`去括號：${a}x + ${a*b} = ${c}`},
      {t:`兩邊同減 ${a*b}：${a}x = ${c-a*b}`},
      {t:`兩邊同除以 ${a}：x = ${x}`},
      {t:`代回檢驗：${a}(${x}+${b}) = ${c} ✓`},
    ],
    traps:[
      {t:`兩邊同減 ${b}`,why:`括號還沒去，不能直接減 ${b} —— 括號裡的 ${b} 有被乘 ${a}。`},
      {t:`兩邊同除以 ${b}`,why:`x 沒有被乘 ${b}，除以 ${b} 沒有意義。`},
    ],
    ans:x};
}

function stepPuzzleAsk(cb,label){
  const P0=genDoorSteps();
  quizStats.total++;
  const cards=shuffle(P0.steps.map((s,i)=>({...s,idx:i}))
    .concat(P0.traps.map(t=>({...t,idx:-1}))));
  let need=0, chain=0, dead=false;
  const draw=(msg,msgCls)=>{
    overlay(`<div class="kicker">${label||'STEP CHAIN'} · 解題連擊</div>
      <h1 style="font-size:20px">${P0.title}</h1>
      <div class="rank">照正確順序點出每一步</div>
      <div class="stepbar">${P0.steps.map((s,i)=>
        `<span class="sdot${i<need?' done':''}">${i+1}</span>`).join('<span class="sarr">→</span>')}
        <span class="schain">${chain} 連</span></div>
      ${msg?`<div class="stepmsg ${msgCls||''}">${msg}</div>`:''}
      <div id="stepcards">${cards.map((c,i)=>
        `<div class="stepcard${c.used?' used':''}" data-i="${i}">${c.t}</div>`).join('')}</div>`,
      null,el=>{
        const row=el.closest('.stepcard'); if(!row||dead)return false;
        const c=cards[+row.dataset.i];
        if(c.used)return false;
        if(c.idx===need){                       // 接對了
          c.used=true; need++; chain++;
          if(need>=P0.steps.length){
            recordQuizCorrect({tag:'方程式解題步驟',tier:2});
            setTimeout(()=>overlay(`<div class="kicker">SOLVED</div>
              <h1 style="color:#8fe86a;text-shadow:0 3px 0 #14400a">解題連擊 ${chain} ！</h1>
              <div class="rank">x = ${P0.ans}</div>
              <div class="desc">你把整條解題流程<b>照順序</b>走完了。<br>
                注意這跟戰鬥的連擊是同一件事 —— <b>順序錯就不成立</b>。</div>
              <button class="go" id="ok">完成</button>`,()=>cb(true)),10);
            return true;
          }
          setTimeout(()=>draw('✓ 接上了！下一步','good'),10);
        }else{                                   // 斷鏈
          dead=true;
          const why=c.idx===-1?c.why:`順序不對 —— 這是第 ${c.idx+1} 步，現在該做第 ${need+1} 步。`;
          setTimeout(()=>overlay(`<div class="kicker">CHAIN BROKEN</div>
            <h1 style="color:#ff6a6a;text-shadow:0 3px 0 #4a0808">斷鏈了</h1>
            <div class="rank" style="color:#ff6a6a;border-color:#ff6a6a">${c.t}</div>
            <div class="desc">${why}</div>
            <button class="go" id="ok">再試一次</button>`,()=>stepPuzzleAsk(cb,label)),10);
        }
        return true;
      });
  };
  draw('');
}

function geoPythagoras(cb){
  quizStats.total++;
  const T=[[3,4,5],[6,8,10]][rand(2)];
  const [a,b,c]=T;
  let moved=0;                    // 0=原狀 1=搬入a² 2=搬入b²
  const draw=()=>{
    overlay(`<div class="kicker">INTERACTIVE · 畢氏定理</div>
      <h1 style="font-size:19px">邊長上的正方形</h1>
      <div class="rank">直角三角形　${a} — ${b} — ${c}</div>
      <canvas id="geoc" width="320" height="300"></canvas>
      <div class="desc" style="text-align:center">
        ${moved===0?`三邊各長出一個正方形：<br>
          <b style="color:#8fd0ff">${a}² = ${a*a}</b>　
          <b style="color:#ff9a5a">${b}² = ${b*b}</b>　
          <b style="color:#ffe38a">${c}² = ${c*c}</b><br>
          兩個小的加起來，會剛好等於大的嗎？`:''}
        ${moved===1?`藍色的 <b>${a*a}</b> 格已經搬進大正方形，<br>
          還剩 <b>${c*c-a*a}</b> 格空著。`:''}
        ${moved===2?`<b style="color:#8fd0ff">${a*a}</b> ＋
          <b style="color:#ff9a5a">${b*b}</b> ＝
          <b style="color:#ffe38a">${c*c}</b><br>
          剛好填滿，一格不多一格不少。<br>
          <b>a² + b² = c²</b>`:''}</div>
      ${moved<2?`<button class="go" id="geoGo">把 ${moved===0?'藍色 '+a+'²':'橘色 '+b+'²'} 搬進大正方形</button>`
        :`<button class="go" id="geoDone">我看懂了</button>`}`,
      null,el=>{
        if(el.id==='geoGo'){ moved++; setTimeout(draw,10); return true; }
        if(el.id==='geoDone'){ recordQuizCorrect({tag:'畢氏定理',tier:2}); setTimeout(()=>cb(true),10); return true; }
        return false;
      });
    paint();
  };
  const paint=()=>{
    const cv=$('geoc'); if(!cv)return;
    const g=cv.getContext('2d');
    g.clearRect(0,0,320,300);
    const u=13;                               // 每格像素
    // 直角三角形：直角在左下 P0，水平股 b、垂直股 a
    const ox=104, oy=176;                     // 直角頂點
    const P0=[ox,oy], P1=[ox+b*u,oy], P2=[ox,oy-a*u];
    const grid=(x,y,n,w,h,fill,line,fillCount)=>{
      // 從左上角 (x,y) 畫 w×h 格
      let k=0;
      for(let j=0;j<h;j++)for(let i=0;i<w;i++){
        const on = fillCount===undefined || k<fillCount;
        g.fillStyle = on?fill:'#161029';
        g.fillRect(x+i*u,y+j*u,u-1,u-1);
        k++;
      }
      g.strokeStyle=line; g.lineWidth=2;
      g.strokeRect(x,y,w*u,h*u);
    };
    // c² 正方形：貼在斜邊外側
    // 斜邊向量 P1→P2，法線朝右上
    const vx=P2[0]-P1[0], vy=P2[1]-P1[1];
    const len=Math.hypot(vx,vy);
    const nx=-vy/len, ny=vx/len;              // 單位法線
    g.save();
    g.translate(P1[0],P1[1]);
    g.rotate(Math.atan2(vy,vx));
    // 在旋轉座標中，斜邊沿 +x，正方形往 -y（外側）
    let k=0;
    const filledC = moved===0?0 : moved===1? a*a : a*a+b*b;
    for(let j=0;j<c;j++)for(let i=0;i<c;i++){
      let col='#161029';
      if(k<filledC) col = (k<a*a)?'#3f7fd0':'#c98a3c';
      g.fillStyle=col;
      g.fillRect(i*u, -(j+1)*u, u-1, u-1);
      k++;
    }
    g.strokeStyle='#ecc24e'; g.lineWidth=2.5;
    g.strokeRect(0,-c*u,c*u,c*u);
    g.fillStyle='#ffe38a'; g.font='bold 13px sans-serif';
    g.fillText('c² = '+c*c, c*u/2-22, -c*u-6);
    g.restore();
    // a² 正方形：垂直股左側
    if(moved<1){
      grid(P0[0]-a*u, P2[1], a, a, a, '#3f7fd0', '#8fd0ff');
      g.fillStyle='#8fd0ff'; g.font='bold 13px sans-serif';
      g.fillText('a² = '+a*a, P0[0]-a*u+4, P2[1]-6);
    }
    // b² 正方形：水平股下方
    if(moved<2){
      grid(P0[0], P0[1], b, b, b, '#c98a3c', '#f0cf78');
      g.fillStyle='#f0cf78'; g.font='bold 13px sans-serif';
      g.fillText('b² = '+b*b, P0[0]+4, P0[1]+b*u+14);
    }
    // 三角形本體（畫在最上層）
    g.beginPath();
    g.moveTo(...P0); g.lineTo(...P1); g.lineTo(...P2); g.closePath();
    g.fillStyle='rgba(226,232,255,.22)'; g.fill();
    g.strokeStyle='#e2e8ff'; g.lineWidth=3; g.stroke();
    // 直角記號
    g.strokeStyle='#ffe38a'; g.lineWidth=2;
    g.strokeRect(P0[0],P0[1]-14,14,14);
    // 邊長標示
    g.fillStyle='#8fd0ff'; g.font='bold 12px sans-serif';
    g.fillText('a='+a, P0[0]-30, (P0[1]+P2[1])/2);
    g.fillStyle='#f0cf78';
    g.fillText('b='+b, (P0[0]+P1[0])/2-12, P0[1]+16);
    g.fillStyle='#ffe38a';
    g.fillText('c='+c, (P1[0]+P2[0])/2+6, (P1[1]+P2[1])/2-6);
  };
  draw();
}

function geoTriangleSum(cb){
  quizStats.total++;
  let torn=0;
  const A=[50+rand(40),40+rand(40)];
  const angs=[A[0],A[1],180-A[0]-A[1]];
  const draw=()=>{
    overlay(`<div class="kicker">INTERACTIVE · 三角形內角和</div>
      <h1 style="font-size:19px">把三個角撕下來拼拼看</h1>
      <div class="rank">${angs[0]}° ／ ${angs[1]}° ／ ${angs[2]}°</div>
      <canvas id="geoc" width="300" height="220"></canvas>
      <div class="desc" style="text-align:center">
        ${torn<3?`已撕下 <b>${torn}</b> 個角。點按鈕繼續。`
          :`三個角拼在一起，剛好排成一條<b>直線</b> — 平角 <b>180°</b>。<br>
            ${angs[0]} + ${angs[1]} + ${angs[2]} = <b>180</b>`}</div>
      ${torn<3?`<button class="go" id="geoGo">撕下第 ${torn+1} 個角</button>`
        :`<button class="go" id="geoDone">我看懂了</button>`}`,
      null,el=>{
        if(el.id==='geoGo'){ torn++; setTimeout(draw,10); return true; }
        if(el.id==='geoDone'){ recordQuizCorrect({tag:'三角形內角和',tier:2}); setTimeout(()=>cb(true),10); return true; }
        return false;
      });
    const cv=$('geoc'); if(!cv)return;
    const g=cv.getContext('2d'); g.clearRect(0,0,300,220);
    const P=[[60,30],[20,130],[170,130]];
    const cols=['#ff6a6a','#8fd0ff','#8fe86a'];
    // 三角形
    g.strokeStyle='#ecc24e'; g.lineWidth=2;
    g.beginPath(); g.moveTo(...P[0]); g.lineTo(...P[1]); g.lineTo(...P[2]); g.closePath(); g.stroke();
    // 未撕下的角用扇形標示
    for(let i=0;i<3;i++){
      if(i<torn) continue;
      g.fillStyle=cols[i]+'99';
      g.beginPath(); g.moveTo(...P[i]);
      const o1=P[(i+1)%3], o2=P[(i+2)%3];
      const ang1=Math.atan2(o1[1]-P[i][1],o1[0]-P[i][0]);
      const ang2=Math.atan2(o2[1]-P[i][1],o2[0]-P[i][0]);
      g.arc(P[i][0],P[i][1],22,Math.min(ang1,ang2),Math.max(ang1,ang2));
      g.closePath(); g.fill();
    }
    // 底部拼合區：畫成連續的扇形
    g.strokeStyle='#6f6490'; g.lineWidth=2;
    g.beginPath(); g.moveTo(30,195); g.lineTo(270,195); g.stroke();
    let acc=180;
    for(let i=0;i<torn;i++){
      g.fillStyle=cols[i]+'cc';
      g.beginPath(); g.moveTo(150,195);
      const st=(acc-angs[i])*Math.PI/180, en=acc*Math.PI/180;
      g.arc(150,195,46,Math.PI+st-Math.PI,Math.PI+en-Math.PI,false);
      g.closePath(); g.fill();
      acc-=angs[i];
    }
    if(torn>=3){ g.fillStyle='#ffe38a'; g.font='bold 12px sans-serif';
      g.fillText('180° 平角',110,215); }
  };
  draw();
}

function nextFromBank(vol){
  const src=QBANK.filter(x=>Number(x.v)===Number(vol));
  if(!src.length)return null;
  if(!qQueue[vol]||!qQueue[vol].length) qQueue[vol]=shuffle(src.map((_,i)=>i));
  const q=src[qQueue[vol].pop()];
  return q?visualizeGeometryQuestion({q:q.q,opts:q.opts,ans:q.ans,sol:q.sol,fig:q.fig||'',
    difficulty:q.difficulty||q.diff||'',tier:q.tier||0,
    tag:'第'+q.v+'冊'+(q.tag?' · '+q.tag:'')}):null;
}

function classroomBankActive(){
  return !!(classroomLaunch&&Array.isArray(classroomLaunch.questionBank)&&classroomLaunch.questionBank.length&&Array.isArray(QBANK)&&QBANK.length);
}

function dungeonActionQuestion(fallback){
  if(classroomBankActive()){
    const picked=Number(volPick),want=Number.isFinite(picked)&&picked>=1?picked:Number((zoneOf()||{}).vol)||Number(classroomLaunch.volume)||1;
    const q=nextFromBank(want)||nextFromBank(Number(classroomLaunch.volume)||1);
    if(q)return q;
  }
  const q=typeof fallback==='function'?fallback():fallback;
  return q?visualizeGeometryQuestion(q):null;
}

function dungeonActionLabel(name){return name+(classroomBankActive()?' · 教師指定單元':'');}

function mediumFacilityQuestion(){
  /* 教師指定章節永遠優先；自由探索才暫時鎖定標準（中）難度。 */
  if(classroomBankActive())return dungeonActionQuestion(null);
  const old=forceTier;forceTier=2;
  let q=null;try{q=pickQ(Number((zoneOf()||{}).vol)||1);if(q)q.tier=2;}finally{forceTier=old;}
  return q;
}

function facilityGate(pr,label,open){
  if(pr&&pr.gatePassed){open();return;}
  const q=mediumFacilityQuestion();
  if(!q){open();return;}
  quizAsk(q,ok=>{
    if(ok){if(pr)pr.gatePassed=1;toast(label+'的封印已解除',1500);open();}
    else{toast('答錯了，複習後可再挑戰',1700);backToDungeon();}
  },dungeonActionLabel(label+' · 標準難度'));
}

function enterShrineFacility(pr){facilityGate(pr,'升級神殿',()=>shrineScreen('',pr));}

function enterForgeFacility(pr){facilityGate(pr,'融合工坊',()=>{fuseSel=[];fuseQuizPassed=false;forgeProp=pr;if(pr.used)forgeSpent();else fuseScreen();});}

function enterBeastShrine(pr){facilityGate(pr,'怪物神殿',()=>{monsterFusionSel=[];beastShrineScreen(pr);});}

function questionKnowledgePoints(q){
  q=q||{};
  const raw=q.difficulty!==undefined&&q.difficulty!==''?q.difficulty:
    (q.diff!==undefined&&q.diff!==''?q.diff:q.tier);
  const n=Number(raw);
  if(Number.isFinite(n)&&n>0)return Math.max(1,Math.min(3,Math.round(n)));
  const s=String(raw||'').toLowerCase();
  if(/挑戰|困難|進階|高階|hard|advanced|expert|3/.test(s))return 3;
  if(/標準|中等|普通|medium|normal|2/.test(s))return 2;
  if(/基礎|簡單|入門|easy|basic|1/.test(s))return 1;
  return Math.max(1,Math.min(3,tierFor(String(q.tag||'').replace(/^第\d+冊\s*·?\s*/,''))||1));
}

function recordQuizCorrect(q){
  const points=questionKnowledgePoints(q);
  quizStats.ok++;
  quizStats.points=(Number(quizStats.points)||0)+points;
  return points;
}

function quizAsk(q,cb,label){
  quizStats.total++;
  let opts=q.opts.slice();for(let i=0;i<8;i++){opts=shuffle(opts.slice());const slot=opts.indexOf(q.ans);if(slot>=0&&(slot!==quizLastAnswerSlot||i===7)){quizLastAnswerSlot=slot;break;}}
  overlay(`<div class="kicker">${label||'MATH'}${q.tag?' · '+q.tag:''}${
      q.tier?' · '+TIER_NAME[q.tier]:''}</div>
    <h1 style="font-size:19px;line-height:1.5">${q.q}</h1>
    ${q.fig?`<div class="qfig">${q.fig}</div>`:''}
    <div id="qopts">${opts.map(o=>
      `<div class="qopt" data-v="${o}">${q.fig?geometryOptionBadge(o):''}${o}</div>`).join('')}</div>`,null,el=>{
      const row=el.closest('.qopt'); if(!row)return false;
      const ok=row.dataset.v===q.ans;
      recordTopic(q.tag,ok);
      const points=ok?recordQuizCorrect(q):0;
      if(ok)questAdd(volPick==='auto'?Number((zoneOf()||{}).vol)||1:volPick);
      creditQuiz(ok);
      setTimeout(()=>quizResult(q,ok,cb,points),10);
      return true;
    });
  $('veilCard').classList.add('quiz-card');
}

function quizResult(q,ok,cb,points){
  if(!ok) recordWrong(q);
  const figHtml=q.fig?`<div class="qfig small">${q.fig}</div>`:'';
  overlay(`<div class="kicker">${ok?'CORRECT':'INCORRECT'}</div>
    <h1 style="color:${ok?'#8fe86a':'#ff6a6a'};text-shadow:0 3px 0 ${ok?'#14400a':'#4a0808'}">
      ${ok?'答對了！':'答錯了'}</h1>
    <div class="rank" style="${ok?'':'color:#ff6a6a;border-color:#ff6a6a;background:rgba(255,90,90,.1)'}">
      正解：${q.ans}${ok?`　✦ 知識點 +${points||questionKnowledgePoints(q)}`:''}</div>
    <div class="desc">${q.sol}</div>
    <button class="go" id="ok">繼續</button>`,()=>cb(ok));
}
