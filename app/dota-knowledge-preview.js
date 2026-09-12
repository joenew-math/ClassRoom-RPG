/* Local QA only: real battle modules, synthetic roster, no remote services. */
(()=>{
  'use strict';
  const message=document.getElementById('message'),host=document.getElementById('host');
  if(location.hostname!=='127.0.0.1'||location.port!=='8766'){
    host.innerHTML='<p class="hint">此預覽只能由獨立本機測試服務開啟：http://127.0.0.1:8766/app/dota-knowledge-preview.html</p>';return;
  }
  const frame=document.createElement('iframe');frame.title='Dota 知識攻塔戰場';
  let ready=false,hold=0;
  function run(code){return frame.contentWindow.eval(code);}
  function bootstrap(){
    if(GARENA.timer)clearInterval(GARENA.timer);
    CLOUD.on=()=>false;CLOUD.garenaListenCmds=()=>()=>{};CLOUD.scheduleSync=()=>{};save=()=>{};
    state=emptyClassState();state.classUnlocks.enabled=false;
    state.classUnlocks.teacherGates.moba=true;state.classUnlocks.teacherGates.guild=true;
    state.students=Array.from({length:6},(_,i)=>{
      const job=['Warrior','Mage','Cleric','Rogue','Warrior','Mage'][i];
      const s=newStudent('DOTA_PREVIEW_'+i,i===0?'你操作的戰士':'演練夥伴 '+i,job,i<3?'A':'B');
      s.baseVariant=i%2?'female1':'male2';s.gender=i%2?'female':'male';
      s.registrationComplete=true;s.jobPending=false;s.level=30;s.maxHp=500;s.currentHp=500;s.baseAgi=60;s.isMobaAI=i!==0;
      const skill=JOB_SKILL_REQUIRE[job];if(skill){s.skills[skill]=1;s.skillLoadout=[skill];}
      const set=PIXEL_SETS.find(x=>x.job===job);
      PIXEL_SET_ITEMS.filter(x=>x.pixelSet===set.id).forEach(it=>s[it.type+'Id']=it.id);
      return s;
    });
    view.page='teacher';view.role='teacher';view.tview='arena';
    garenaStart(state.students.slice(0,3).map(s=>s.id),state.students.slice(3).map(s=>s.id),false,'mobaKnowledge');
    GARENA.DURATION=600;
    const bank=lessonQuestionBank();if(bank.length)gaMobaKnowledgeStartBank(bank[0],90);
    window._previewNoPersist=true;
  }
  function start(){
    if(!ready)return;
    run('('+bootstrap.toString()+')()');
    message.textContent='操作紅隊戰士；方向鍵移動，答案塔前停留 3 秒。';
  }
  async function load(){
    const response=await fetch('../班級RPG-公會大廳v126.html');
    if(!response.ok)throw new Error('正式入口 HTTP '+response.status);
    const doc=new DOMParser().parseFromString(await response.text(),'text/html');
    // Login, import libraries and service workers are unnecessary in this isolated fixture.
    doc.querySelectorAll('script').forEach(s=>{
      const src=s.getAttribute('src')||'';
      if(/^(https?:)?\/\//.test(src)||src.includes('vendor/firebase/')||s.textContent.includes('serviceWorker.register'))s.remove();
    });
    doc.querySelectorAll('link[href]').forEach(l=>{if(/^(https?:)?\/\//.test(l.getAttribute('href')))l.remove();});
    const base=doc.createElement('base');base.href=new URL('../',location.href).href;doc.head.prepend(base);
    const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';
    policy.content="connect-src 'none'; form-action 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:";
    doc.head.prepend(policy);
    frame.onload=()=>{try{ready=!!run("typeof garenaStart==='function'");start();}catch(e){message.textContent='載入失敗：'+e.message;}};
    frame.srcdoc='<!doctype html>'+doc.documentElement.outerHTML;host.appendChild(frame);
  }
  function send(cmd){
    if(!ready)return;
    try{const result=run('mobaSimSend("DOTA_PREVIEW_0",'+JSON.stringify(cmd)+')');if(!result.ok)message.textContent=result.msg;}catch(e){message.textContent=e.message;}
  }
  function paintActions(){
    if(!ready)return;
    const status=run("(()=>{const f=GARENA.fighters.DOTA_PREVIEW_0;return {active:GARENA.active&&!GARENA.over,paused:GARENA.paused,ko:!f||f.ko,attack:gaAttackCooldownInfo(f),jobskill:f?fighterCooldownInfo(f,'job'):{left:0,pct:0},queued:(GARENA.cmdQueue.DOTA_PREVIEW_0||{}).act};})()");
    document.querySelectorAll('[data-act]').forEach(b=>{
      const ci=status[b.dataset.act],pending=status.queued===b.dataset.act;
      b.disabled=!status.active||status.paused||status.ko||ci.left>0||pending;
      b.classList.toggle('cooling',ci.left>0);
      b.querySelector('.cd-fill').style.width=(100-ci.pct)+'%';
      b.querySelector('.cd-status').textContent=status.ko?'重生中':status.paused?'暫停':ci.left>0?ci.left.toFixed(1)+'s':pending?'等待行動':'就緒';
      b.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',String(Math.round(100-ci.pct)));
    });
  }
  document.getElementById('restart').onclick=start;
  document.getElementById('pick').onclick=()=>ready&&run('openMobaKnowledgePicker()');
  document.getElementById('near').onclick=()=>{
    if(!ready)return;
    run("(()=>{const f=GARENA.fighters.DOTA_PREVIEW_0;f.x=GARENA.W-4;f.y=gaMobaQuizZones('red')[0].y;f.hp=f.max;f.ko=false;f.entering=false;gaMobaQuizResetCharge(f);garenaRenderField();})()");
  };
  function stop(){clearInterval(hold);hold=0;}
  document.querySelectorAll('[data-move]').forEach(b=>b.onpointerdown=e=>{e.preventDefault();stop();send({move:b.dataset.move});hold=setInterval(()=>send({move:b.dataset.move}),180);b.setPointerCapture(e.pointerId);});
  ['pointerup','pointercancel','blur'].forEach(n=>window.addEventListener(n,stop));
  document.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{send({act:b.dataset.act});paintActions();});
  setInterval(paintActions,100);
  window.addEventListener('keydown',e=>{const dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right'}[e.key];if(dir){e.preventDefault();send({move:dir});}});
  load().catch(e=>{message.textContent='載入失敗：'+e.message;});
})();
