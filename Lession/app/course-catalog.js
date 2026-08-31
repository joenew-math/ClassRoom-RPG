/* course-catalog.js
 * 從 Lession/Lessionindex.html 拆出的傳統全域 runtime。
 * 請保留為一般 script，不要直接改成 type=module，避免破壞既有 inline handlers。
 */
const CH=window.CLASS_RPG_COURSE_CONTENT||{};
const COURSE_CONTENT_MANIFEST=window.CLASS_RPG_COURSE_CONTENT_MANIFEST||{};
const courseVolumeLoads={};
const META=[{"key": "c0", "grade": "七年級", "sem": 1, "vol": 1, "cn": "一", "title": "整數的運算", "topics": 17}, {"key": "c1", "grade": "七年級", "sem": 1, "vol": 1, "cn": "二", "title": "因數與倍數", "topics": 9}, {"key": "c2", "grade": "七年級", "sem": 1, "vol": 1, "cn": "三", "title": "分數的運算", "topics": 9}, {"key": "c3", "grade": "七年級", "sem": 1, "vol": 1, "cn": "四", "title": "一元一次方程式", "topics": 10}, {"key": "c4", "grade": "七年級", "sem": 2, "vol": 2, "cn": "一", "title": "二元一次聯立方程式", "topics": 9}, {"key": "c5", "grade": "七年級", "sem": 2, "vol": 2, "cn": "二", "title": "直角坐標與圖形", "topics": 9}, {"key": "c6", "grade": "七年級", "sem": 2, "vol": 2, "cn": "三", "title": "比與比例式", "topics": 9}, {"key": "c7", "grade": "七年級", "sem": 2, "vol": 2, "cn": "四", "title": "一元一次不等式", "topics": 9}, {"key": "c8", "grade": "七年級", "sem": 2, "vol": 2, "cn": "五", "title": "統計圖表與資料分析", "topics": 9}, {"key": "c9", "grade": "七年級", "sem": 2, "vol": 2, "cn": "六", "title": "三視圖與線對稱", "topics": 7}, {"key": "c10", "grade": "八年級", "sem": 1, "vol": 3, "cn": "一", "title": "乘法公式與多項式", "topics": 8}, {"key": "c11", "grade": "八年級", "sem": 1, "vol": 3, "cn": "二", "title": "平方根與畢氏定理", "topics": 9}, {"key": "c12", "grade": "八年級", "sem": 1, "vol": 3, "cn": "三", "title": "因式分解", "topics": 7}, {"key": "c13", "grade": "八年級", "sem": 1, "vol": 3, "cn": "四", "title": "一元二次方程式", "topics": 9}, {"key": "c14", "grade": "八年級", "sem": 1, "vol": 3, "cn": "五", "title": "統計資料處理", "topics": 8}, {"key": "c15", "grade": "八年級", "sem": 2, "vol": 4, "cn": "一", "title": "數列與級數", "topics": 10}, {"key": "c16", "grade": "八年級", "sem": 2, "vol": 4, "cn": "二", "title": "一次函數", "topics": 7}, {"key": "c17", "grade": "八年級", "sem": 2, "vol": 4, "cn": "三", "title": "三角形的基本性質", "topics": 7}, {"key": "c18", "grade": "八年級", "sem": 2, "vol": 4, "cn": "四", "title": "平行與四邊形", "topics": 7}, {"key": "c19", "grade": "九年級", "sem": 1, "vol": 5, "cn": "一", "title": "相似形", "topics": 7}, {"key": "c20", "grade": "九年級", "sem": 1, "vol": 5, "cn": "二", "title": "圓", "topics": 6}, {"key": "c21", "grade": "九年級", "sem": 1, "vol": 5, "cn": "三", "title": "二次函數", "topics": 7}, {"key": "c22", "grade": "九年級", "sem": 2, "vol": 6, "cn": "一", "title": "統計與機率", "topics": 7}, {"key": "c23", "grade": "九年級", "sem": 2, "vol": 6, "cn": "二", "title": "立體圖形", "topics": 6}];
const VOLS=[
  {n:1,short:'七上',full:'七年級上學期'},{n:2,short:'七下',full:'七年級下學期'},
  {n:3,short:'八上',full:'八年級上學期'},{n:4,short:'八下',full:'八年級下學期'},
  {n:5,short:'九上',full:'九年級上學期'},{n:6,short:'九下',full:'九年級下學期'}];
const volOf=m=>VOLS.find(v=>v.n===m.vol);
let cur='全部';

function courseVolumeReady(volume){
  return META.filter(m=>m.vol===Number(volume)).every(m=>typeof CH[m.key]==='string'&&CH[m.key].length>0);
}
function loadCourseVolume(volume){
  volume=Number(volume);
  if(courseVolumeReady(volume))return Promise.resolve();
  if(courseVolumeLoads[volume])return courseVolumeLoads[volume];
  const src=COURSE_CONTENT_MANIFEST[volume];
  if(!src)return Promise.reject(new Error('找不到第 '+volume+' 冊課程資料'));
  courseVolumeLoads[volume]=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=src;script.async=true;script.dataset.courseVolume=String(volume);
    script.onload=()=>courseVolumeReady(volume)?resolve():reject(new Error('第 '+volume+' 冊資料不完整'));
    script.onerror=()=>reject(new Error('第 '+volume+' 冊下載失敗，請檢查網路後重試'));
    document.head.appendChild(script);
  }).catch(error=>{delete courseVolumeLoads[volume];throw error;});
  return courseVolumeLoads[volume];
}

/* 原有七個數學遊戲保留為獨立頁面，並依新版課綱章節放入課程目錄。 */
const GAMES_BY_CHAPTER={
  c7:[
    {href:'../inequality-quest.html',title:'認識一元一次不等式'},
    {href:'../inequal.html',title:'數線挑戰：不等式大師'}
  ],
  c8:[{href:'../stats-quest.html',title:'認識統計圖表'}],
  c9:[
    {href:'../three-views-quest.html',title:'太空站建築師：三視圖'},
    {href:'../Symmetry.html',title:'對稱圖形大挑戰'}
  ],
  c14:[{href:'../detective_math_game.html',title:'數據偵探：真相只有一個'}],
  c18:[{href:'../parallel_lines_v11.html',title:'截角探險：平行線與截角'}]
};

function menuItem(m){
  const wrap=document.createElement('div');
  wrap.className='mi-block';
  const b=document.createElement('button');
  b.className='mi';
  b.innerHTML=`<span class="cn">第${m.cn}章</span><span>${m.title}</span><span class="arw">→</span>`;
  b.addEventListener('click',()=>open_(m));
  wrap.appendChild(b);
  const games=GAMES_BY_CHAPTER[m.key]||[];
  if(games.length){
    const row=document.createElement('div');
    row.className='chapter-games';
    row.setAttribute('aria-label',`${m.title}互動遊戲`);
    games.forEach(game=>{
      const a=document.createElement('a');
      a.className='chapter-game';
      a.href=game.href;
      a.target='_blank';
      a.rel='noopener';
      a.innerHTML=`<span class="game-tag">🎮 互動遊戲</span><span>${game.title}</span>`;
      row.appendChild(a);
    });
    wrap.appendChild(row);
  }
  return wrap;
}
let openVol=null;                       // 記住目前展開的冊
function renderList(){
  const box=document.getElementById('menu');
  box.innerHTML='';
  VOLS.forEach(v=>{
    const items=META.filter(m=>m.vol===v.n);
    if(!items.length)return;
    const g=document.createElement('div');
    g.className='vol'+(openVol===v.n?'':' closed');
    const h=document.createElement('button');
    h.className='vol-h';
    h.innerHTML=`<span class="vn">第 ${v.n} 冊</span><span>${v.full}</span>
      <span class="cnt">${items.length} 章</span><span class="tg">${openVol===v.n?'▾':'▸'}</span>`;
    h.addEventListener('click',()=>{
      openVol=(openVol===v.n)?null:v.n;   // 再點一次收合
      renderList();
      if(openVol===v.n){
        const el=document.querySelector('.vol:not(.closed)');
        if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'nearest'});
      }
    });
    const box2=document.createElement('div');
    box2.className='vol-items';
    items.forEach(m=>box2.appendChild(menuItem(m)));
    g.appendChild(h);g.appendChild(box2);
    box.appendChild(g);
  });
}
renderList();

async function open_(m){
  const box=document.getElementById('viewer');
  box.innerHTML='<div class="course-loading" role="status"><b>📚 正在載入第 '+m.vol+' 冊</b><span>只下載這次需要的課程內容…</span></div>';
  document.getElementById('home').style.display='none';
  box.style.display='block';
  document.body.classList.add('reading');
  document.getElementById('back').style.display='inline-block';
  document.getElementById('crumb').textContent=`第 ${m.vol} 冊 ${volOf(m).short} · 載入中`;
  window.scrollTo(0,0);
  try{
    await loadCourseVolume(m.vol);
    if(!CH[m.key])throw new Error('找不到「'+m.title+'」的課程內容');
    box.innerHTML='';                       // 每次都用全新的 iframe
    const fr=document.createElement('iframe');
    fr.title=m.title;
    box.appendChild(fr);
    const d=fr.contentDocument||fr.contentWindow.document;
    d.open(); d.write(CH[m.key]); d.close();
    document.getElementById('crumb').textContent=`第 ${m.vol} 冊 ${volOf(m).short} · ${m.title}`;
  }catch(error){
    box.innerHTML='';
    const fail=document.createElement('div');fail.className='course-loading error';
    const title=document.createElement('b');title.textContent='⚠️ 課程載入失敗';
    const note=document.createElement('span');note.textContent=error&&error.message?error.message:'請稍後再試';
    const retry=document.createElement('button');retry.type='button';retry.className='retry-course';retry.textContent='重新載入';retry.addEventListener('click',()=>open_(m));
    fail.append(title,note,retry);box.appendChild(fail);
    document.getElementById('crumb').textContent=`第 ${m.vol} 冊 · 載入失敗`;
  }
}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&document.body.classList.contains('reading'))
    document.getElementById('back').click();
});
document.getElementById('back').addEventListener('click',()=>{
  document.getElementById('viewer').innerHTML='';
  document.getElementById('viewer').style.display='none';
  document.body.classList.remove('reading');
  document.getElementById('home').style.display='block';
  document.getElementById('back').style.display='none';
  document.getElementById('crumb').textContent='總目錄';
});
