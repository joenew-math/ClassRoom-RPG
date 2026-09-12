/* math-dungeon-combat-art.js
 * 戰鬥美術控制器：只負責角色／怪物的動畫狀態與視覺資產，不改傷害數值。
 */
"use strict";

(function(){
  const runeAssetUrl=new URL('../assets/vfx/math-rune-slash-v1.webp',document.currentScript.src).href;
  const PLAYER_ATTACKS=['striking','attack-slash','attack-volley','attack-lash','attack-beam','attack-ring','attack-fireball','attack-orbit','attack-cross','attack-shield','attack-ripple','attack-drain','attack-formula','attack-buff','attack-hex','hurt'];
  const OFFENSIVE=new Set(['slash','volley','lash','beam','ring','fireball','orbit','cross','drain','formula','hex']);
  const MONSTER_COLORS={
    ward:'#7fc9ff',hex:'#b783ff',venom:'#8ee55d',fury:'#ff7658',swift:'#72e7ff',
    leech:'#e56d9f',breaker:'#ffd05d',regen:'#74e8a0',chorus:'#f2a8ff',chaos:'#ff70dc'
  };

  function battleActor(){return document.getElementById('battleActor');}
  function attackClass(style){return 'attack-'+String(style||'slash').replace(/[^a-z-]/g,'');}
  function actorSource(){
    const launch=typeof classroomLaunch!=='undefined'&&classroomLaunch||null;
    const c=launch&&launch.character||{};
    return {avatar:String(c.avatarData||''),name:String(c.name||(typeof S!=='undefined'&&S.name)||'冒險者')};
  }

  function renderBattleActor(){
    const host=battleActor();
    if(!host)return;
    const info=actorSource(),img=host.querySelector('.battle-actor-avatar'),fallback=host.querySelector('.battle-actor-fallback');
    const job=typeof JOBS!=='undefined'&&typeof S!=='undefined'&&JOBS[S.job]||null;
    host.style.setProperty('--actor-col',job&&job.col||'#72d7ff');
    host.setAttribute('aria-label',info.name+'的戰鬥角色');
    if(info.avatar){
      if(img&&img.getAttribute('src')!==info.avatar)img.setAttribute('src',info.avatar);
      if(img){img.alt=info.name;img.classList.remove('hide');}
      if(fallback)fallback.classList.add('hide');
    }else{
      if(img){img.removeAttribute('src');img.classList.add('hide');}
      if(fallback){fallback.textContent=job&&job.ic||'⚔️';fallback.classList.remove('hide');}
    }
    host.classList.remove('hide');
  }

  function addRuneFx(host,color,rare){
    const policy=window.DungeonLoadPolicy;
    const source=policy&&policy.sceneImage&&policy.sceneImage('runeSlash');
    let fx;
    if(source&&document.documentElement.dataset.dungeonQuality==='cinematic'){
      fx=document.createElement('img');
      fx.className='battle-actor-rune';
      fx.src=source.currentSrc||source.src;
      fx.alt='';
    }else{
      fx=document.createElement('i');
      fx.className='battle-actor-rune-lite';
    }
    fx.style.setProperty('--actor-col',color||'#72d7ff');
    if(rare)fx.classList.add('rare');
    host.appendChild(fx);
    setTimeout(()=>fx.remove(),900);
  }

  const burstTimers=new Set();let burstHost=null,lastBurst=-Infinity;
  function clearComboBurst(){burstTimers.forEach(clearTimeout);burstTimers.clear();if(burstHost)burstHost.remove();burstHost=null;}
  function later(fn,ms){const t=setTimeout(()=>{burstTimers.delete(t);fn();},ms);burstTimers.add(t);}
  function playComboBurst(color){
    if(document.hidden||performance.now()-lastBurst<1450||burstHost)return false;
    const battle=document.getElementById('battle');
    if(!battle||battle.classList.contains('hide'))return false;
    lastBurst=performance.now();
    const host=document.createElement('div');host.className='combo-rune-screen';host.setAttribute('aria-hidden','true');host.style.setProperty('--combo-color',color||'#7ce6ff');document.body.appendChild(host);burstHost=host;
    const low=matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.dungeonQuality==='reduced';
    if(low){const tag=document.createElement('span');tag.className='combo-rune-caption';tag.textContent='5 連擊 · 數學連斬';host.appendChild(tag);later(clearComboBurst,1100);return true;}
    const source=window.DungeonLoadPolicy?.sceneImage?.('runeSlash');
    const runeUrl=source&&(source.currentSrc||source.src)||runeAssetUrl;
    // One shared cached texture, five timed strikes, at most three live sprites.
    const zones=[[25,28],[74,47],[27,65],[72,24],[50,48]];
    zones.slice(0,4).sort(()=>Math.random()-.5).concat([zones[4]]).forEach((p,i)=>later(()=>{
      if(!host.isConnected||document.hidden||battle.classList.contains('hide')){clearComboBurst();return;}
      const fx=document.createElement('img');fx.className='combo-rune-strike';fx.src=runeUrl;fx.alt='';
      fx.onerror=()=>{fx.style.visibility='hidden';};
      fx.style.left=(p[0]+(Math.random()-.5)*10)+'%';fx.style.top=(p[1]+(Math.random()-.5)*8)+'%';
      fx.style.setProperty('--angle',(-65+Math.random()*130)+'deg');fx.style.setProperty('--sweep',(i%2?'-':'')+'18vw');fx.style.setProperty('--strike-scale',i===4?'1.15':'.86');
      host.appendChild(fx);later(()=>fx.remove(),510);
    },i*185));
    later(clearComboBurst,1370);return true;
  }
  addEventListener('pagehide',clearComboBurst);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearComboBurst();});
  const battleRoot=document.getElementById('battle');
  if(battleRoot)new MutationObserver(()=>{if(battleRoot.classList.contains('hide'))clearComboBurst();}).observe(battleRoot,{attributes:true,attributeFilter:['class']});

  function playActorAttack(style,color,duration,rare,chain){
    const host=battleActor();
    if(!host)return;
    renderBattleActor();
    PLAYER_ATTACKS.forEach(c=>host.classList.remove(c));
    void host.offsetWidth;
    const kind=String(style||'slash');
    host.style.setProperty('--actor-col',color||'#72d7ff');
    host.style.setProperty('--actor-speed',Math.max(360,Math.min(820,Number(duration)||520))+'ms');
    host.classList.add('striking',attackClass(kind));
    // The math rune is a combo milestone, not a rigid effect attached to the left avatar.
    if(OFFENSIVE.has(kind)&&Number(chain)>=5&&Number(chain)%5===0)playComboBurst(color);
    clearTimeout(playActorAttack._timer);
    playActorAttack._timer=setTimeout(()=>PLAYER_ATTACKS.forEach(c=>host.classList.remove(c)),Math.max(760,Number(duration)||520)+180);
  }

  function beginMonsterAction(foe,el){
    if(!el)return;
    const color=MONSTER_COLORS[foe&&foe.battleType]||(foe&&foe.boss?'#ffcd63':'#ff7658');
    el.style.setProperty('--monster-accent',color);
    el.classList.remove('attack','windup');
    void el.offsetWidth;
    el.classList.add('acting','windup');
    setTimeout(()=>{
      if(!el.isConnected)return;
      el.classList.remove('windup');
      void el.offsetWidth;
      el.classList.add('attack');
    },130);
    setTimeout(()=>el.classList.remove('attack','windup'),780);
  }

  function playerHurt(strong){
    const host=battleActor();
    if(!host)return;
    host.classList.remove('hurt');void host.offsetWidth;host.classList.add('hurt');
    if(Number(strong)>=20)host.classList.add('hurt-heavy');
    setTimeout(()=>host.classList.remove('hurt','hurt-heavy'),520);
  }

  addEventListener('dungeonoptionalartready',()=>{
    if(typeof B!=='undefined'&&B&&!B.over&&typeof drawFieldBg==='function')drawFieldBg();
  });

  window.DungeonCombatArt=Object.freeze({renderBattleActor,playActorAttack,beginMonsterAction,playerHurt,playComboBurst,clearComboBurst});
})();
