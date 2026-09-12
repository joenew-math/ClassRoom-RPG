/* math-dungeon-core.js
 * 地下城各控制器共用的最小瀏覽器工具。
 * 必須在所有 math-dungeon-* 控制器之前載入。
 */
"use strict";

const $=id=>document.getElementById(id);
const rand=n=>(Math.random()*n)|0;
const shuffle=a=>{
  for(let i=a.length-1;i>0;i--){
    const j=rand(i+1);
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
