/* math-dungeon-load-policy.js
 * 地下城漸進式載入與視覺品質政策。
 * 目標：20 秒內可互動；精緻場景與動畫可在核心完成後背景載入。
 */
"use strict";

const DUNGEON_LOAD_POLICY=Object.freeze({
  interactiveDeadlineMs:20000,
  essentialBudgetBytes:3500000,
  optionalArtBudgetBytes:6000000,
  qualities:Object.freeze(['cinematic','smooth','reduced'])
});
const DUNGEON_BOOT_STARTED_AT=performance.now();
const DUNGEON_ESSENTIAL_RESOURCES=Object.freeze({
  'math-dungeon.html':135000,
  'runtime-health.js':2000,
  'math-dungeon-load-policy.js':7000,
  'question-bank-data.js':1970000,
  'math-dungeon-data.js':18000,
  'math-dungeon-monster-data.js':28000,
  'math-dungeon-core.js':1000,
  'math-dungeon-card-rules.js':5000,
  'math-dungeon-state.js':1000,
  'math-dungeon-combat-art.css':18000,
  'math-dungeon-combat-art.js':7000,
  'math-dungeon-network.js':7000,
  'math-dungeon-classroom.js':30000,
  'math-dungeon-learning.js':100000,
  'math-dungeon-pets.js':40000,
  'monster-atlas-foundation-v1.js':3000,
  'math-dungeon-gameplay.js':186000,
  'math-dungeon.js':269000
});
const DUNGEON_SCENE_ASSETS=Object.freeze([
  {id:'zone1',url:'./assets/scenes/zone1-academy-crypt-v1.webp',bytes:188596},
  {id:'runeSlash',url:'./assets/vfx/math-rune-slash-v1.webp',bytes:47604}
]);
const DungeonSceneImages=new Map();

function dungeonPreferredVisualQuality(){
  let saved='';
  try{saved=localStorage.getItem('mathDungeonVisualQuality')||'';}catch(e){}
  if(DUNGEON_LOAD_POLICY.qualities.includes(saved))return saved;
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return 'reduced';
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  if(connection&&(connection.saveData||/^(slow-)?2g$/.test(connection.effectiveType||'')))return 'smooth';
  if(Number(navigator.deviceMemory||4)<=2)return 'smooth';
  return 'cinematic';
}

function dungeonSetVisualQuality(mode,persist=false){
  const next=DUNGEON_LOAD_POLICY.qualities.includes(mode)?mode:dungeonPreferredVisualQuality();
  document.documentElement.dataset.dungeonQuality=next;
  if(persist){
    try{localStorage.setItem('mathDungeonVisualQuality',next);}catch(e){}
  }
  window.dispatchEvent(new CustomEvent('dungeonqualitychange',{detail:{quality:next}}));
  return next;
}

function dungeonInteractiveTimeLeft(){
  return Math.max(0,DUNGEON_LOAD_POLICY.interactiveDeadlineMs-(performance.now()-DUNGEON_BOOT_STARTED_AT));
}

function dungeonPreloadImage(url,timeoutMs){
  return new Promise(resolve=>{
    const img=new Image();
    let done=false;
    const finish=ok=>{if(done)return;done=true;clearTimeout(timer);resolve({url,ok,img:ok?img:null});};
    const timer=setTimeout(()=>finish(false),Math.max(250,timeoutMs||250));
    img.decoding='async';
    img.onload=()=>finish(true);
    img.onerror=()=>finish(false);
    img.src=url;
  });
}

/* 後續 HD-2D 風格原創素材一律從這個入口載入；逾時就保留程序像素備援。 */
async function dungeonLoadOptionalArt(items){
  if(document.documentElement.dataset.dungeonQuality!=='cinematic')return [];
  const list=(Array.isArray(items)?items:[]).filter(x=>x&&x.url);
  let declared=0;
  const accepted=[];
  for(const item of list){
    const bytes=Math.max(0,Number(item.bytes)||0);
    if(declared+bytes>DUNGEON_LOAD_POLICY.optionalArtBudgetBytes)break;
    declared+=bytes;
    accepted.push(item);
  }
  const results=[];
  for(const item of accepted){
    const left=dungeonInteractiveTimeLeft();
    if(left<300)break;
    const result=await dungeonPreloadImage(item.url,Math.min(left,5000));
    result.id=item.id||item.url;
    if(result.ok&&result.img)DungeonSceneImages.set(result.id,result.img);
    results.push(result);
  }
  window.dispatchEvent(new CustomEvent('dungeonoptionalartready',{detail:{results}}));
  return results;
}

function dungeonBootResourceName(url){
  try{return decodeURIComponent(new URL(url,location.href).pathname.split('/').pop()||'');}
  catch(e){return String(url||'').split(/[/?#]/).pop()||'';}
}

function dungeonBootProgress(){
  const host=document.getElementById('dungeonBoot');
  if(!host)return;
  const total=Object.values(DUNGEON_ESSENTIAL_RESOURCES).reduce((n,v)=>n+v,0);
  const seen=new Set(['math-dungeon.html','runtime-health.js','math-dungeon-load-policy.js']);
  for(const entry of performance.getEntriesByType('resource')){
    const name=dungeonBootResourceName(entry.name);
    if(DUNGEON_ESSENTIAL_RESOURCES[name])seen.add(name);
  }
  let loaded=0;
  for(const name of seen)loaded+=DUNGEON_ESSENTIAL_RESOURCES[name]||0;
  if(document.readyState==='complete')loaded=total;
  const pct=Math.max(3,Math.min(100,Math.round(loaded/total*100)));
  const bar=host.querySelector('.dungeon-boot-fill');
  const value=host.querySelector('.dungeon-boot-value');
  const detail=host.querySelector('.dungeon-boot-detail');
  if(bar)bar.style.width=pct+'%';
  if(value)value.textContent=pct+'%';
  if(detail)detail.textContent=`${(loaded/1048576).toFixed(1)} / ${(total/1048576).toFixed(1)} MB`;
}

function dungeonBootFinish(mode){
  const host=document.getElementById('dungeonBoot');
  if(!host||host.dataset.done)return;
  host.dataset.done='1';
  dungeonBootProgress();
  const label=host.querySelector('.dungeon-boot-label');
  if(label)label.textContent=mode==='fallback'?'已切換流暢模式，正在進入…':'核心下載完成，正在進入…';
  setTimeout(()=>host.classList.add('done'),280);
  setTimeout(()=>host.remove(),850);
}

function dungeonStartBootProgress(){
  dungeonBootProgress();
  const timer=setInterval(dungeonBootProgress,180);
  addEventListener('DOMContentLoaded',()=>{
    clearInterval(timer);
    dungeonBootFinish('ready');
    setTimeout(()=>dungeonLoadOptionalArt(DUNGEON_SCENE_ASSETS),50);
  },{once:true});
  setTimeout(()=>{
    if(document.readyState!=='loading')return;
    dungeonSetVisualQuality('smooth');
    clearInterval(timer);
    dungeonBootFinish('fallback');
  },DUNGEON_LOAD_POLICY.interactiveDeadlineMs);
}

window.DungeonLoadPolicy=Object.freeze({
  config:DUNGEON_LOAD_POLICY,
  setQuality:dungeonSetVisualQuality,
  preferredQuality:dungeonPreferredVisualQuality,
  timeLeft:dungeonInteractiveTimeLeft,
  loadOptionalArt:dungeonLoadOptionalArt,
  sceneImage:id=>DungeonSceneImages.get(id)||null
});
dungeonSetVisualQuality(dungeonPreferredVisualQuality());
dungeonStartBootProgress();
