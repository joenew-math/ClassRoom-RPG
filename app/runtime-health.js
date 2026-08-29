"use strict";

/* 共用載入監測：外部 runtime 遺漏或被網路／快取阻擋時，顯示可理解的修復提示。 */
(function runtimeHealthMonitor(){
  let shown=false;
  function show(message){
    if(shown)return;shown=true;
    const box=document.createElement("div");
    box.id="classRpgRuntimeError";
    box.setAttribute("role","alert");
    box.style.cssText="position:fixed;z-index:2147483647;left:12px;right:12px;top:12px;padding:14px 16px;background:#fff4d6;color:#201a10;border:4px solid #171717;box-shadow:6px 6px 0 #171717;font:700 15px/1.55 'Microsoft JhengHei',sans-serif";
    box.innerHTML="⚠️ 系統程式尚未完整載入<br><span style='font-weight:500'>"+String(message||"請重新整理頁面；若仍失敗，請確認網路或離線快取已更新。")+"</span>";
    (document.body||document.documentElement).appendChild(box);
  }
  function valueAt(path){
    let value=window;
    for(const key of String(path||"").split(".")){if(!key)continue;if(value==null)return undefined;value=value[key];}
    return value;
  }
  window.addEventListener("error",event=>{
    const target=event&&event.target;
    if(target&&(target.tagName==="SCRIPT"||target.tagName==="LINK")){
      const label=target.dataset&&target.dataset.runtimeLabel||target.getAttribute("src")||target.getAttribute("href")||"必要檔案";
      show(`「${label}」讀取失敗。請重新整理；若在學校網路，請確認 GitHub Pages 未被阻擋。`);
    }
  },true);
  window.addEventListener("load",()=>setTimeout(()=>{
    for(const script of document.querySelectorAll("script[data-runtime-check]")){
      const expected=script.dataset.runtimeCheck;
      if(typeof valueAt(expected)==="undefined"){
        show(`「${script.dataset.runtimeLabel||expected}」沒有完成啟動。請重新整理並清除舊版網頁快取。`);
        break;
      }
    }
  },250));
  window.ClassRpgRuntimeHealth={show};
})();

