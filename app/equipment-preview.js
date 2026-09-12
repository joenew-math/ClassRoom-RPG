/* Isolated art prototype. Does not load auth, class state, or write student data. */
"use strict";
(() => {
  const KEY='classroom.equipment-art-prototype.v1';
  const BODIES={male0:['original-base-male.png','生理男・原始素體'],male1:['base-male-1.png','生理男・側分短髮'],male2:['base-male-2.png','生理男・刺蝟短髮'],male3:['base-male-3.png','生理男・平瀏海'],female0:['original-base-female.png','生理女・原始素體'],female1:['base-female-1.png','生理女・齊瀏海短髮'],female2:['base-female-2.png','生理女・雙馬尾'],female3:['base-female-3.png','生理女・丸子頭']};
  const NAMES={hat:'星翼冠冕',clothes:'星曜銀鎧',pants:'鎏金護腿',shoes:'銀鋼戰靴',weapon:'星芒巨劍',back:'星夜披風'};
  const ORDER=['back','pants','shoes','clothes','hat','weapon'];
  const $=id=>document.getElementById(id), clone=x=>JSON.parse(JSON.stringify(x));
  const images={},pieces={},geometries=new WeakMap();let atlas,bodyId='male2',slot='clothes',records={},ready=false,drag=null,sequence=0;
  const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('美術圖片載入失敗，請重新整理。'));im.src=src;});
  function pixels(im){const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);return {data:ctx.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height};}
  function prepareAtlas(im){
    // Generated checker matte is not alpha. Decode edge-connected matte once;
    // dark pixel outlines protect opaque silver highlights inside the equipment.
    const p=pixels(im),d=p.data,n=p.w*p.h,seen=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
    const visit=q=>{if(q<0||q>=n||seen[q])return;seen[q]=1;const i=q*4,lo=Math.min(d[i],d[i+1],d[i+2]),hi=Math.max(d[i],d[i+1],d[i+2]);if(d[i+3]<20||(lo>130&&hi-lo<22)){queue[tail++]=q;d[i+3]=0;}};
    for(let x=0;x<p.w;x++){visit(x);visit((p.h-1)*p.w+x);}for(let y=0;y<p.h;y++){visit(y*p.w);visit(y*p.w+p.w-1);}
    while(head<tail){const q=queue[head++];if(q%p.w)visit(q-1);if(q%p.w<p.w-1)visit(q+1);visit(q-p.w);visit(q+p.w);}
    const c=document.createElement('canvas');c.width=p.w;c.height=p.h;c.getContext('2d').putImageData(new ImageData(d,p.w,p.h),0,0);return c;
  }
  function bounds(p,test,region={x:0,y:0,w:p.w,h:p.h}){let x0=p.w,y0=p.h,x1=-1,y1=-1;for(let y=region.y;y<region.y+region.h;y++)for(let x=region.x;x<region.x+region.w;x++){const i=(y*p.w+x)*4;if(test(p.data,i,x,y)){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}return x1<0?null:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};}
  function geometry(im){if(geometries.has(im))return geometries.get(im);const p=pixels(im),b=bounds(p,(d,i)=>d[i+3]>100);const s=86/b.h;const g={p,b,s,x:50-b.w*s/2,y:6,w:b.w*s,h:86};geometries.set(im,g);return g;}
  function defaults(im){const g=geometry(im),p=g.p;const shirt=bounds(p,(d,i,x,y)=>d[i+3]>220&&y>p.h*.52&&x>p.w*.25&&x<p.w*.75&&Math.min(d[i],d[i+1],d[i+2])>175&&Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])<42);const blue=bounds(p,(d,i,x,y)=>d[i+3]>220&&y>p.h*.68&&y<p.h*.91&&d[i+2]-d[i]>35&&d[i+1]-d[i]>20);
    const yy=y=>6+(y-g.b.y)*g.s;
    const chestY=shirt?yy(shirt.y):58,pantsY=blue?yy(blue.y):77,pantsBottom=blue?yy(blue.y+blue.h):85;
    return {base:{x:g.x,y:g.y,w:g.w,h:g.h,visible:true},back:{x:26,y:chestY-2,w:48,h:92-chestY,visible:true},hat:{x:19,y:4,w:62,h:49,visible:true},clothes:{x:31,y:chestY-1,w:38,h:pantsY-chestY+5,visible:true},pants:{x:35,y:pantsY-1,w:30,h:pantsBottom-pantsY+3,visible:true},shoes:{x:33,y:pantsBottom-1,w:34,h:94-pantsBottom,visible:true},weapon:{x:60,y:30,w:18,h:56,visible:true}};
  }
  function valid(record){return record&&['base',...ORDER].every(k=>record[k]&&['x','y','w','h'].every(n=>Number.isFinite(record[k][n]))&&record[k].w>=5&&record[k].h>=3&&record[k].w<=120&&record[k].h<=150&&Math.abs(record[k].x)<=150&&Math.abs(record[k].y)<=150);}
  function ctxFor(id){const c=$(id),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.setTransform(4,0,0,4,0,80);ctx.imageSmoothingEnabled=false;return ctx;}
  function imageAt(ctx,im,b,t){ctx.drawImage(im,b.x,b.y,b.w,b.h,t.x,t.y,t.w,t.h);}
  function render(){if(!ready)return;const rec=records[bodyId],im=images[bodyId],g=geometry(im);
    ['bare','doll'].forEach(id=>{const ctx=ctxFor(id);ctx.fillStyle='#06101b80';ctx.beginPath();ctx.ellipse(50,94,24,4,0,0,Math.PI*2);ctx.fill();
      if(id==='doll'&&$('gear').checked&&rec.back.visible)imageAt(ctx,atlas,pieces.back,rec.back);
      if(id==='bare'||rec.base.visible)imageAt(ctx,im,g.b,rec.base);
      if(id==='doll'&&$('gear').checked)ORDER.filter(k=>k!=='back').forEach(k=>{if(rec[k].visible){if(k==='pants'){const t=rec[k];ctx.fillStyle='#172744';ctx.fillRect(t.x+2,t.y+1,t.w-4,t.h*.68);}imageAt(ctx,atlas,pieces[k],rec[k]);}});
      if($('guides').checked){ctx.strokeStyle='#89dddfaa';ctx.lineWidth=.25;ctx.setLineDash([1,1]);ctx.beginPath();ctx.moveTo(50,-10);ctx.lineTo(50,98);ctx.moveTo(14,92);ctx.lineTo(90,92);ctx.stroke();if(id==='doll'){const t=rec[slot];ctx.strokeStyle='#ffd585';ctx.strokeRect(t.x,t.y,t.w,t.h);}ctx.setLineDash([]);}
    });
  }
  function controls(){const t=records[bodyId][slot];['x','y','w','h'].forEach(k=>$(k).value=t[k]);$('visible').checked=t.visible!==false;document.querySelectorAll('[data-slot]').forEach(b=>{b.classList.toggle('active',b.dataset.slot===slot);b.setAttribute('aria-pressed',String(b.dataset.slot===slot));});}
  async function switchBody(id){const request=++sequence;ready=false;bodyId=id;$('status').textContent='正在對齊素體…';try{images[id]||=await load('../assets/'+BODIES[id][0]);if(request!==sequence)return;if(!valid(records[id]))records[id]=defaults(images[id]);ready=true;controls();render();$('status').textContent='已依不透明邊界對齊中線與腳底，胸甲／護腿依素體衣褲範圍定位；可繼續微調。';}catch(e){$('status').textContent=e.message;}}
  function initUI(){Object.entries(BODIES).forEach(([k,v])=>$('bodySelect').add(new Option(v[1],k)));$('bodySelect').value=bodyId;$('bodySelect').onchange=e=>switchBody(e.target.value);
    $('previewCombo').onclick=()=>window.DungeonCombatArt?.playComboBurst('#7ce6ff');
    Object.entries({...NAMES,base:'素體'}).forEach(([k,label])=>{const b=document.createElement('button');b.textContent=k==='base'?label:label.slice(-2);b.dataset.slot=k;b.onclick=()=>{slot=k;controls();render();};$('slots').append(b);});
    ['x','y','w','h'].forEach(k=>$(k).oninput=()=>{if(!ready)return;records[bodyId][slot][k]=Number($(k).value);render();});$('visible').onchange=()=>{records[bodyId][slot].visible=$('visible').checked;render();};$('gear').onchange=$('guides').onchange=render;
    $('autoFit').onclick=()=>{if(!ready)return;records[bodyId]=defaults(images[bodyId]);controls();render();$('status').textContent='已還原此素體的自動定位。';};
    $('save').onclick=()=>{try{localStorage.setItem(KEY,JSON.stringify(records));$('status').textContent='已保存本機試作；正式角色與教師原有校正資料完全不變。';}catch{$('status').textContent='瀏覽器無法保存，請改用下載定位設定。';}};
    $('export').onclick=()=>{const blob=new Blob([JSON.stringify({schema:'equipment-art-preview-v1',coordinateSystem:'0 -20 100 122',atlas:'assets/equipment-preview/star-knight-atlas-v1.png',records},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='星曜騎士-定位試作-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    const c=$('doll'),point=e=>{const r=c.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*122-20};};
    c.onpointerdown=e=>{if(!ready)return;e.preventDefault();c.setPointerCapture(e.pointerId);const p=point(e),t=records[bodyId][slot];drag={id:e.pointerId,x:p.x,y:p.y,tx:t.x,ty:t.y};};c.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;const p=point(e),t=records[bodyId][slot];t.x=Math.max(-15,Math.min(105,drag.tx+p.x-drag.x));t.y=Math.max(-20,Math.min(100,drag.ty+p.y-drag.y));controls();render();};c.onpointerup=c.onpointercancel=c.onlostpointercapture=()=>drag=null;
  }
  async function start(){initUI();try{try{const parsed=JSON.parse(localStorage.getItem(KEY)||'{}');for(const id of Object.keys(BODIES))if(valid(parsed[id]))records[id]=parsed[id];}catch{}atlas=prepareAtlas(await load('../assets/equipment-preview/star-knight-atlas-v1.png'));const p=pixels(atlas),cw=Math.floor(p.w/3),ch=Math.floor(p.h/2);Object.keys(NAMES).forEach((k,i)=>{pieces[k]=bounds(p,(d,n)=>d[n+3]>100,{x:i%3*cw,y:Math.floor(i/3)*ch,w:cw,h:ch});if(!pieces[k])throw new Error('裝備圖層不完整。');const box=document.createElement('div');box.className='item';const c=document.createElement('canvas');c.width=c.height=200;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;const b=pieces[k],s=Math.min(164/b.w,164/b.h);ctx.drawImage(atlas,b.x,b.y,b.w,b.h,(200-b.w*s)/2,(200-b.h*s)/2,b.w*s,b.h*s);const name=document.createElement('p');name.textContent=NAMES[k];box.append(c,name);$('items').append(box);});await switchBody(bodyId);window.EquipmentPreview={get records(){return clone(records);},get pieces(){return clone(pieces);},get atlas(){return atlas;},switchBody,defaults,valid,get ready(){return ready;}};}catch(e){$('status').textContent=e.message;}}
  window.prepareEquipmentAtlas=prepareAtlas;
  start();
})();
